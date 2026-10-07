import { describe, expect, it } from 'vitest';
import { INVENTORY, resolve } from '../../src/nexus/inventory';
import { KINDS } from '../../src/nexus/kinds';
import { linesOf } from '../../src/nexus/kinds/core';
import { lookOf, planOf, sized, wayDown, finishOf, SHAPES, MOST, MATTER_TO_INVENTORY } from '../../src/nexus/pieces';
import { MATERIALS as MATTERS } from '../../src/data/materials';
import { LOOKS, lookRow } from '../../src/nexus/looks';
import type { Item } from '../../src/nexus/inventory';

const get = (w: string) => { const r = resolve(w); if (!r || typeof r === 'string') throw new Error(`${w}: ${r}`); return r as Item; };

describe('everything in 3D: its look, and how it comes apart', () => {
  it('each kind of thing has the shape of its kind', () => {
    expect(lookOf(get('screw M4x20')).kind).toBe('screw');
    expect(lookOf(get('bearing 6201')).kind).toBe('bearing');
    expect(lookOf(get('gear m1 z30 b8')).teeth).toBe(30);
    expect(lookOf(get('spring d1 D10 L30 n8'))).toMatchObject({ kind: 'spring', coils: 8 });
    expect(lookOf(get('nut M5')).kind).toBe('hex');
    expect(lookOf(get('multicore c4 0.5mm² plain 10m')).kind).toBe('coil');
    expect(lookOf(get('chip NE555 DIP-8')).kind).toBe('chip');
    expect(lookOf(INVENTORY.get('wheel-bike')!).kind).toBe('wheel');
    expect(lookOf(INVENTORY.get('bicycle')!)).toMatchObject({ kind: 'vehicle', mark: 'two' });
    expect(lookOf(INVENTORY.get('steel-chrome')!).kind).toBe('swatch');
    expect(lookOf(INVENTORY.get('el-fe')!)).toMatchObject({ kind: 'atom', mark: 'Fe' });
    for (const [w, k] of [['acmotor 90L 1.5kW 4P B5', 'motor'], ['taperbearing 30204', 'bearing'], ['sensormodule HC-SR04', 'board'], ['biketyre w28 622mm folding', 'torus'], ['mcb B 6A 2P', 'case'], ['pexpipe 16x2 3m', 'tube'], ['drywallscrew 3.5x35 coarse black', 'screw'], ['antenna 868MHz whip', 'rod']] as const) expect(lookOf(get(w)).kind, w).toBe(k);
    expect(lookOf(get('taperbearing 30204')).mark).toBe('taper'); // rollers, not balls
    // a kind says its own shape as data
    for (const [w, k] of [['transformer toroidal 50VA 12V', 'ring'], ['devboard RP2040', 'board'], ['cartyre w205 ar55 R16 V', 'torus'], ['shieldgas argon 20L', 'can'], ['wirerope 6x36-IWRC d12 20m', 'coil']] as const) expect(lookOf(get(w)).kind, w).toBe(k);
    expect(lookOf(get('sparkplug M14x1.25 reach19 nickel'))).toMatchObject({ kind: 'screw', mark: 'hex' });
    expect(lookOf(get('wirerope 6x36-IWRC d12 20m')).wire).toBe(0.012); // its rope, not its reel, is the wire drawn
    const first = (id: string) => get(linesOf(KINDS.find((k) => k.id === id)!)[0]!);
    expect(lookOf(first('sawblade'))).toMatchObject({ kind: 'gear', teeth: 24 }); // a toothed disc, as many teeth as it has
    expect(lookOf(first('castor')).kind).toBe('wheel');
    expect(lookOf(first('drillbit'))).toMatchObject({ kind: 'rod', mark: 'thread' });
  });
  it('its finish is what it is mostly made of', () => {
    expect(finishOf('brass').color).toBe(0xd4af5a);
    expect(finishOf('nbr').rough).toBeGreaterThan(0.8);
    expect(finishOf('glass').clear).toBe(true);
    expect(lookOf(get('countersunk M5 L20 A2')).finish.metal).toBeGreaterThan(0.8);
  });
  it('every entry has a size: its own, its kind\'s typical one, or one from its mass; none is guessed', () => {
    for (const i of INVENTORY.values()) {
      const s = sized(i);
      expect(s.box.every((x) => x > 0 && x < 5), i.id).toBe(true);
      if (i.kind !== 'material' && i.kind !== 'element') expect(s.from, `${i.id} has no size`).not.toBe('guess');
    }
    for (const [id] of Object.entries(LOOKS)) { const r = lookRow(id)!; expect(SHAPES, id).toContain(r.kind); expect(r.size.every((x) => x > 0), id).toBe(true); expect(INVENTORY.has(id), `${id} is not in the inventory`).toBe(true); }
  });
  it('anything comes apart: a product into its parts, a material into its elements, an element into what it is in', () => {
    for (const i of INVENTORY.values()) {
      const p = planOf(i.id)!; expect(p, i.id).toBeTruthy();
      expect(p.pieces.length, i.id).toBeLessThanOrEqual(MOST);
      for (const pc of p.pieces) { expect(INVENTORY.has(pc.id), `${i.id} → ${pc.id}`).toBe(true); expect(pc.look.size.every((x) => x > 0 && x < 1), `${i.id} → ${pc.id}`).toBe(true); }
    }
    const bike = planOf('bicycle')!;
    expect(bike.pieces.map((p) => p.id)).toContain('wheel-bike');
    expect(bike.pieces.find((p) => p.id === 'wheel-bike')!.note).toMatch(/^2 × bicycle wheel · about 700 × 700 × 28 mm/);
    expect(planOf('steel-chrome')!.pieces.map((p) => p.id)).toEqual(['el-fe', 'el-cr', 'el-c', 'el-mn', 'el-si']);
    expect(planOf('el-fe')!.pieces.map((p) => p.id)).toContain('steel-low');
  });
  it('parts keep their sizes true to each other, and say so when shown larger or smaller', () => {
    const p = planOf('wheel-bike')!, tyre = p.pieces.find((x) => x.id === 'tyre-bike')!, hub = p.pieces.find((x) => x.id === 'hub-bike')!;
    expect(Math.max(...tyre.look.size) / Math.max(...hub.look.size)).toBeGreaterThan(3); // a 700 mm tyre beside a 100 mm hub
    const tiny = p.pieces.find((x) => x.id === 'nipple-spoke')!; expect(tiny.shown).toBeGreaterThan(1); expect(tiny.note).toMatch(/shown larger/);
  });
  it('pointing at the first part each time always ends at an element', () => {
    for (const id of ['bicycle', 'printer-fdm', 'kettle', 'quadcopter', get('aircylinder bore32 double 100mm').id, get('lens d25.4 f100 uncoated').id]) {
      const way = wayDown(id);
      expect(way.at(-1)!.startsWith('el-'), `${id}: ${way.join(' › ')}`).toBe(true);
    }
  });
  it('a shape made in the room opens into its matter: every matter the generator builds with has its material here, but cloth, leather and soil', () => {
    for (const m of MATTERS) {
      const id = MATTER_TO_INVENTORY[m.id];
      if (!id) { expect(['textile.baize', 'leather.veg-tan', 'cork.agglomerated', 'ground.soil'], m.id).toContain(m.id); continue; }
      expect(INVENTORY.get(id)?.kind, `${m.id} → ${id}`).toBe('material');
      expect(wayDown(id).at(-1)!.startsWith('el-'), m.id).toBe(true);
    }
  });
});

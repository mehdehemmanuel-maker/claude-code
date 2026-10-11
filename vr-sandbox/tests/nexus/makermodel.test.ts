import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { modelPart, use } from '../../src/nexus/parts/components';
import { layout } from '../../src/nexus/parts/space';
import { baseName, billOf, frameOf, libraryWords } from '../../src/nexus/machines/makermodel';
import { ENDER3 } from '../../src/nexus/models/ender3';
import { VORON24 } from '../../src/nexus/models/voron24';
import { KINDS } from '../../src/nexus/kinds';
import type { Part } from '../../src/nexus/parts/kits';

const boxOf = (p: Part) => { const b = new THREE.Box3(); for (const x of layout(p)) if (x.box && !x.box.isEmpty()) b.union(x.box); return b; };

describe('a maker\'s own assembly drawn from the library', () => {
  it('reads every part the library makes into words it can draw', () => {
    for (const m of [ENDER3, VORON24]) for (const w of Object.keys(billOf(m).words)) expect(() => use(w), `${m.id}: ${w}`).not.toThrow();
  });
  it('turns a Fusion export (its up +z) to stand on the floor facing +x', () => {
    const R = frameOf('voron24');
    expect(R).toEqual([[0, -1, 0], [0, 0, 1], [-1, 0, 0]]);
    const r = modelPart(VORON24), b = boxOf(r.part), s = b.getSize(new THREE.Vector3());
    expect(b.min.y).toBeCloseTo(0, 6);
    // (its size the kind's: wide, high, deep)
    const k = KINDS.find((d) => d.id === 'printer3d')!.box({ model: 'Voron-2.4' });
    expect(Math.abs(s.z * 1000 - k[0]) / k[0]).toBeLessThan(0.02); expect(Math.abs(s.y * 1000 - k[1]) / k[1]).toBeLessThan(0.02); expect(Math.abs(s.x * 1000 - k[2]) / k[2]).toBeLessThan(0.02);
    // (its doors at its front, +x)
    const door = r.part.parts!.find((p) => /^Front Door Left/.test(p.name))!;
    expect(boxOf(door).min.x).toBeGreaterThan(0.2);
    expect(r.drawn).toBeGreaterThan(900);
  });
  it('builds one of the Voron\'s options where its CAD holds several, its carriages slid onto their rails', () => {
    const names = VORON24.parts.map((p) => baseName(p[0]));
    expect(names).not.toContain('300'); expect(names).not.toContain('Spider'); expect(names).not.toContain('Panasonic GX-H15A'); expect(names).toContain('Octopus');
    // (every MGN carriage the model has is drawn on a rail, none as its own box)
    expect(billOf(VORON24).boxed['MGN9H'] ?? 0).toBe(0); expect(billOf(VORON24).boxed['MGN12H'] ?? 0).toBe(0);
    const rails = modelPart(VORON24).part.parts!.filter((p) => /^MGN(9|12)/.test(p.name) && p.parts?.some((q) => /carriage$/.test(q.link ?? '')));
    expect(rails.length).toBe(7);
    // (each carriage moved off its rail's middle, where the library draws it, to where the model has it)
    const off = rails.map((p) => Math.abs(p.parts!.find((q) => /carriage$/.test(q.link ?? '') && /carriage$/.test(q.name))!.at?.[2] ?? 0));
    expect(off.filter((z) => z > 0.005).length).toBeGreaterThan(3);
  });
  it('draws a panel\'s foam tape as a frame round its edge, not a sheet over it', () => {
    const tape = modelPart(VORON24).part.parts!.find((p) => /^Foam Tape \(3mm\)/.test(p.name))!;
    expect(tape.parts?.length).toBe(4);
    expect(libraryWords(VORON24.parts.find((p) => /^Foam Tape/.test(p[0]))!)).toBeNull();
  });
});

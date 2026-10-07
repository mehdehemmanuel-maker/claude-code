import { describe, expect, it } from 'vitest';
import { KINDS } from '../../src/nexus/kinds';
import { linesOf, readKind, wordsOf } from '../../src/nexus/kinds/core';
import { FAMILIES, HAND_FAMILIES, callFamily } from '../../src/nexus/families';
import { INVENTORY, fundamentals, resolve } from '../../src/nexus/inventory';
import { catalogue } from '../../src/nexus/catalogue';
import { numberOf, partAt, randomPart, spaceSize } from '../../src/nexus/partspace';
import { ELEMENTS, MATERIALS, elementsOf } from '../../src/nexus/elements';
import type { Item } from '../../src/nexus/inventory';

const make = (w: string): Item => { const r = callFamily(w); if (!r || typeof r === 'string') throw new Error(`${w}: ${r}`); return r; };

describe('kinds of bought part, as data', () => {
  it('spans the trades: every top category, and well over a hundred kinds', () => {
    expect(KINDS.length).toBeGreaterThan(150);
    const tops = new Set(KINDS.map((k) => k.path.split('/')[0]));
    for (const t of ['Hardware', 'Mechanical', 'Electrical', 'Fluid', 'Optics', 'Tools', 'Materials']) expect(tops.has(t), t).toBe(true);
    const subs = new Set(KINDS.map((k) => k.path.split('/').slice(0, 3).join('/')));
    expect(subs.size).toBeGreaterThan(100);
  });
  it('ids never clash: with each other, with the hand-written families, and are not taken by an earlier family\'s words', () => {
    const ids = KINDS.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(HAND_FAMILIES.some((f) => f.id === id), id).toBe(false);
    for (const k of KINDS) expect(FAMILIES.find((f) => new RegExp(`^${f.id}s?\\b`, 'i').test(`${k.id} x`))?.id, k.id).toBe(k.id);
  });
  it('every size it is sold in is made: a real item, a mass, a box, and children the inventory holds', () => {
    const seen = new Map<string, string>();
    for (const k of KINDS) for (const l of linesOf(k)) {
      const i = make(l);
      expect(seen.get(i.id) ?? l, `${i.id} twice`).toBe(l); seen.set(i.id, l);
      expect((i.g ?? 0) > 0 && Number.isFinite(i.g), `${l} mass ${i.g}`).toBe(true);
      expect((i.size ?? []).length === 3 && i.size!.every((x) => x > 0 && Number.isFinite(x)), `${l} box`).toBe(true);
      for (const c of i.of) expect(INVENTORY.has(c.id) || !!i.inner?.some((x) => x.id === c.id), `${l}: ${c.id}`).toBe(true);
      for (const x of i.inner ?? []) for (const c of x.of) expect(INVENTORY.has(c.id), `${l} › ${x.id}: ${c.id}`).toBe(true);
    }
    expect(seen.size).toBeGreaterThan(30000);
  });
  it('words and sizes are one: a line read back gives its sizes, and its sizes write the line', () => {
    for (const k of KINDS) for (const l of linesOf(k).filter((_, i) => i % 7 === 0)) {
      const p = readKind(k, l); expect(typeof p, `${l}: ${p}`).toBe('object');
      expect(wordsOf(k, p as Record<string, string | number>)).toBe(l);
    }
  });
  it('refuses a size it is not sold in, saying what it is sold in; takes any made-to-order size in range', () => {
    expect(callFamily('fuse 5x20 T 7A')).toMatch(/rated current comes in .*6\.3/);
    expect(callFamily('fuse 5x20 T 6.3A')).toMatchObject({ name: 'fuse 5 × 20 mm, time-lag, 6.3 A' });
    expect(callFamily('fuse')).toBeNull(); // a kind is called with its sizes; the bare word finds the inventory's own
    expect(make('angle 40x4 steel 1234mm').size![2]).toBe(1234);
    expect(callFamily('angle 40x4 steel 7000mm')).toMatch(/made to order 10–6000/);
    expect(make('chipresistor 0603 4.99kohm').name).toBe('4.99kΩ chip resistor, 0603, 1 %');
  });
  it('every kind reaches the same fundamentals: its tree ends in elements', () => {
    for (const k of KINDS) for (const l of [linesOf(k)[0]!, linesOf(k).at(-1)!]) {
      const r = resolve(l); expect(typeof r === 'object' && r, l).toBeTruthy();
      const els = fundamentals((r as Item).id);
      expect(els.length, l).toBeGreaterThan(0);
      for (const e of els) expect(e.id.startsWith('el-'), `${l}: ${e.id}`).toBe(true);
    }
  });
  it('the new materials are made of elements that add to 100 %', () => {
    for (const id of ['stainless-316', 'al-7075', 'ti-6al4v', 'tungsten-carbide', 'peek', 'epdm', 'fkm', 'bk7', 'constantan', 'pt-rh10', 'yag-phosphor', 'algainp', 'koh-electrolyte']) {
      expect(MATERIALS[id], id).toBeTruthy(); expect(INVENTORY.get(id)?.kind, id).toBe('material');
      const e = elementsOf(id), sum = Object.values(e).reduce((a, b) => a + b, 0);
      expect(sum, id).toBeCloseTo(100, 1); for (const el of Object.keys(e)) expect(ELEMENTS[el], `${id}: ${el}`).toBeTruthy();
    }
  });
  it('their numbers follow their standards and laws', () => {
    expect(make('aircylinder bore32 double 100mm').spec).toMatch(/483 N out .* 415 N back; rod 12 mm/); // 0.6 MPa × π 32² / 4; minus a 12 mm rod
    expect(make('tap M6 plug HSS').spec).toMatch(/drill 5\.00 mm/); // d − p
    expect(make('htdpulley 5M z20 w15 aluminium').spec).toMatch(/pitch diameter 31\.83 mm, outside 30\.69/); // 20 × 5 / π; − 2 × 0.572
    expect(make('lens d25.4 f100 uncoated').spec).toMatch(/R = \(n − 1\) f = 51\.68 mm/);
    expect(make('rtd Pt100 A film').spec).toMatch(/138\.51 Ω at 100 °C/); // IEC 60751
    expect(make('laserdiode 650nm 5mW').spec).toMatch(/1\.91 eV .* class 3R/);
    expect(make('springpin d4 L20 steel').spec).toMatch(/11\.24 kN/);
    expect(make('outrunner 2207 kv1750').spec).toMatch(/5\.46 mN·m an amp/); // 60 / 2π KV
    expect(make('multicore c2 1.5mm² plain 10m').spec).toMatch(/0\.115 Ω/);
  });
  it('assembled parts carry their own parts, each made to its size by its own family, down to the elements', () => {
    const c = make('aircylinder bore32 double 100mm');
    expect(c.inner!.map((x) => x.id)).toEqual(['tube-round-37x2.5-152-aluminium', 'rod-12-162-steel', 'oring-27x2.5-nbr', 'oring-12x2.5-nbr']);
    expect(c.of.find((x) => x.id === 'oring-27x2.5-nbr')!.n).toBe(2);
    const r = resolve('aircylinder bore32 double 100mm') as Item; expect(INVENTORY.has('rod-12-162-steel')).toBe(true);
    const els = fundamentals(r.id).map((e) => e.id); expect(els).toContain('el-al'); expect(els).toContain('el-fe');
    expect(make('pillowblock 205').inner!.map((x) => x.id)).toContain('bearing-62052rs');
    expect(make('pillowblock 210').of.map((x) => x.id)).toContain('bearing-ball'); // no 6210 in the table: its fallback
  });
  it('springs are made to order: any wire, coil, coils, legs and angle; one that cannot be wound is refused', () => {
    const t = make('torsionspring d1.35 D12.7 n7.75 a135 right l142 l218'); // legs: l1 42, l2 18
    expect(t.name).toBe('torsion spring 1.35 × 12.7, 7.75 coils, legs at 135°, right-hand, legs 42 and 18 mm');
    expect(callFamily('torsionspring d1 D30 n5 a90 left')).toMatch(/30\.0 wires across: makers wind 4 to 16/);
    expect(callFamily('extspring d2 D20 L20 machine')).toMatch(/at least 42 mm/);
    const sz = spaceSize(), ts = sz.families.find((f) => f.family === 'torsionspring')!.n;
    expect(ts).toBeGreaterThan(1e13); // wire × coil × coils × angle × hand × leg × leg, every one a spring a maker would wind
    expect(sz.total).toBeGreaterThan(1e12);
    // a part at random comes from any family alike, not almost always the one with the most sizes
    let seed = 7; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const fams = new Set(Array.from({ length: 300 }, () => partAt(randomPart(r))!.family));
    expect(fams.size).toBeGreaterThan(80);
  });
  it('the catalogue lists every size sold, and the part space every size each can be made in', () => {
    expect(catalogue().length).toBeGreaterThan(45000);
    const sz = spaceSize();
    for (const k of KINDS) {
      const last = k.axes.reduce((at, a, i) => (typeof a.values === 'function' ? i : at), -1);
      if (!k.space) k.axes.slice(0, Math.max(0, last)).forEach((a) => expect(a.cut, `${k.id}.${a.key}: a made-to-order axis before a dependent one`).toBeUndefined());
      expect(sz.families.find((f) => f.family === k.id)?.n, k.id).toBeGreaterThanOrEqual(linesOf(k).length);
    }
    let checked = 0;
    for (let n = 0; n < sz.total; n += Math.floor(sz.total / 4001)) {
      const p = partAt(n)!; if (!KINDS.some((k) => k.id === p.family)) continue;
      expect(numberOf(p.family, p.params), p.words).toBe(n);
      const i = callFamily(p.words); expect(typeof i === 'object' && i, `${n}: ${p.words}: ${i}`).toBeTruthy(); checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });
});

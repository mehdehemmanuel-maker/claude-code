// Wheeled machines made one way, from their figures: tyres by their codes, published masses kept, real lengths and
// wheelbases, every interface checked, every axle hung from its frame, and nothing in a wheel's way.
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { KITS, makeKit, massOf, type Part } from '../../src/nexus/parts/kits';
import { MACHINES, makeMachine, tyreOf } from '../../src/nexus/machines/machines';
import { perfect } from '../../src/nexus/make/pipeline';
import { layout } from '../../src/nexus/parts/space';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
const kit = (id: string, words: string) => makeKit(KITS.find((k) => k.id === id)!, words, 1).part;

describe('tyres from their size codes', () => {
  test('every system on a sidewall', () => {
    const t = (c: string) => tyreOf(c)!;
    expect(t('205/55R16').D).toBeCloseTo(16 * 0.0254 + 2 * 0.205 * 0.55, 6); // 632 mm
    expect(t('80/100-21').D).toBeCloseTo(21 * 0.0254 + 2 * 0.08, 6);
    expect(t('24x8-12')).toMatchObject({ D: 24 * 0.0254, W: 8 * 0.0254, rim: 12 * 0.0254 });
    expect(t('21x7x15')).toMatchObject({ D: 21 * 0.0254, W: 7 * 0.0254, rim: 15 * 0.0254 });
    expect(t('11R22.5').D).toBeCloseTo(22.5 * 0.0254 + 2 * 11 * 0.0254 * 0.875, 6);
    expect(t('6.50-10').W).toBeCloseTo(6.5 * 0.0254, 6);
    expect(tyreOf('a big tyre')).toBeNull();
  });
});

describe('machines by their published figures', () => {
  test('each keeps its published mass through the whole pipeline, what is not drawn said as such', () => {
    for (const m of MACHINES.filter((x) => x.mass)) {
      const r = perfect(makeMachine(m), m.name), kg = massOf(r.part);
      expect(kg / m.mass!, m.name).toBeGreaterThan(0.995); expect(kg / m.mass!, m.name).toBeLessThan(1.005);
      const rest = all(r.part).find((p) => p.name === 'the rest of it');
      if (rest) expect(rest.says).toMatch(/published/);
    }
  });
  test('its length and wheelbase are its maker\'s', () => {
    for (const m of MACHINES) {
      const n = layout(makeMachine(m)), box = new THREE.Box3(); for (const x of n) if (x.box) box.union(x.box);
      const fork = m.extras.includes('mast') ? 1.067 + 0.05 : 0, len = box.max.x - box.min.x;
      expect(len / (m.L + fork), m.name).toBeGreaterThan(0.93); expect(len / (m.L + fork), m.name).toBeLessThan(1.07);
      const xs = m.axles.map((a) => a.x), wb = Math.max(...xs) - Math.min(...xs);
      const wheels = n.filter((x) => / wheel$/.test(x.p.name) && x.depth === 1).map((x) => new THREE.Vector3().setFromMatrixPosition(x.m).x);
      expect(Math.max(...wheels) - Math.min(...wheels), m.name).toBeCloseTo(wb, 6);
    }
    const corolla = MACHINES.find((m) => m.short === 'corolla')!; expect(corolla.L).toBeCloseTo(182.3 * 0.0254, 6);
  });
  test('every interface meets: hubs on their axles, nuts on their studs, a kart\'s drive within what its axle carries', () => {
    for (const m of MACHINES) {
      const r = perfect(makeMachine(m), m.name);
      expect(r.contracts.length, m.name).toBeGreaterThan(0);
      for (const c of r.contracts) expect(c.ok, `${m.name}: ${c.requirer} on the ${c.provider}: ${JSON.stringify(c.rows)}`).toBe(true);
    }
    const kart = perfect(makeMachine(MACHINES.find((m) => m.kind === 'kart')!), 'kart'), drive = kart.contracts.find((c) => c.kind === 'drive')!;
    expect(drive.provider).toMatch(/engine/); expect(drive.rows[0]!.provided).toMatch(/^115 N·m/); // 19.1 N·m through about 6 to 1
  });
  test('every axle hangs from its frame, and nothing stands in a wheel\'s way', () => {
    for (const m of MACHINES) {
      const r = perfect(makeMachine(m), m.name);
      expect(r.findings.filter((f) => f.check === 'room to move' && !f.fixed && / wheel$/.test(f.part)), m.name).toHaveLength(0);
      expect(all(r.part).some((p) => /hanger|strut|arm|leaf|pivot|swingarm|fork leg|air spring/.test(p.name)), m.name).toBe(true);
    }
  });
});

describe('as kits', () => {
  test('a model named in the words is made, its skin trimmed into an arch over each of its wheels by its maker', () => {
    const car = kit('car', 'a corolla'); expect(car.name).toMatch(/Corolla/);
    const r = perfect(car, 'a corolla'), panels = all(r.part).filter((p) => p.shape && 'surf' in p.shape && p.shape.surf.above);
    // each of the front fender and the rear quarter rises over its wheel (each a panel of pieces between the openings cut
    // in it for its lamps and grille), and the critic cut nothing
    expect([...new Set(panels.map((p) => p.name))].sort()).toEqual(['front fender', 'rear quarter panel']);
    for (const nm of ['front fender', 'rear quarter panel']) expect(Math.max(...panels.filter((p) => p.name === nm).flatMap((p) => (p.shape as { surf: { above: [number, number][] } }).surf.above.map(([, v]) => v)))).toBeGreaterThan(0.2);
    expect(all(r.part).some((p) => /^opening for/.test(p.name))).toBe(false);
  });
  test('road kit only on what goes on public roads', () => {
    const plates = (p: Part) => all(p).filter((x) => x.name === 'number plate').length;
    expect(plates(perfect(kit('car', 'a corolla'), 'car').part)).toBe(2);
    expect(plates(perfect(kit('forklift', 'a forklift'), 'forklift').part)).toBe(0);
    expect(plates(perfect(kit('dirt bike', 'a dirt bike'), 'dirt bike').part)).toBe(0);
  });
  test('words reach their kit: go-karts, four-wheelers, motocross bikes, forklifts, semis, ride-on mowers', () => {
    const id = (w: string) => KITS.find((k) => k.words.test(w.toLowerCase()) && ['go kart', 'atv', 'dirt bike', 'forklift', 'semi truck', 'lawn tractor', 'car'].includes(k.id))?.id;
    expect(id('a go kart')).toBe('go kart'); expect(id('a four wheeler')).toBe('atv'); expect(id('a motocross bike')).toBe('dirt bike');
    expect(id('a fork truck')).toBe('forklift'); expect(id('an 18 wheeler')).toBe('semi truck'); expect(id('a ride-on mower')).toBe('lawn tractor');
  });
});

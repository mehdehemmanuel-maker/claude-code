// Wheeled machines made one way, from their figures: tyres by their codes, published masses kept, real lengths and
// wheelbases, every interface checked, every axle hung from its frame, and nothing in a wheel's way.
import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { KITS, makeKit, massOf, type Part } from '../../src/nexus/kits';
import { bodyPlanOf, MACHINES, makeMachine, styledCar, tyreOf } from '../../src/nexus/machines';
import { perfect } from '../../src/nexus/make/pipeline';
import { layout } from '../../src/nexus/make/space';
import { bodyPanels } from '../../src/nexus/panels';
import { patchPoints } from '../../src/nexus/surface';

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
  test('each spelling on a sidewall gives the diameter its system\'s formula does', () => {
    const D = (c: string) => tyreOf(c)!.D * 1000;
    // ISO metric W/ARrD: D in × 25.4 + 2 × W × AR/100, mm
    expect(D('205/55R16')).toBeCloseTo(406.4 + 225.5, 6); // 631.9 mm
    expect(D('315/80R22.5')).toBeCloseTo(571.5 + 504, 6); // 1,075.5 mm
    // conventional truck NRdd: the file takes its sidewall as 0.875 of its width (typical of the family, machines.ts tyreOf)
    expect(D('11R22.5')).toBeCloseTo(571.5 + 2 * 279.4 * 0.875, 6); // 1,060.45 mm
    // flotation NxW-D: the first figure is its overall diameter in inches
    expect(tyreOf('15x6.00-6')).toMatchObject({ D: 15 * 0.0254, W: 6 * 0.0254, rim: 6 * 0.0254 }); // 381 mm across
    // bias-ply S-D: S inches wide on a D-inch rim, its sidewall 0.96 of its width (the file's assumption, typical of
    // bias-ply sizes: machines.ts tyreOf); a farm tyre spells its width with one decimal, a truck's with none
    expect(D('13.6-28')).toBeCloseTo(711.2 + 2 * 345.44 * 0.96, 6); // 1,374.44 mm
    expect(D('13.60-28')).toBeCloseTo(D('13.6-28'), 9); // the same tyre, spelt with two
    expect(D('11-22.5')).toBeCloseTo(571.5 + 2 * 279.4 * 0.96, 6); // 1,107.95 mm
    expect(tyreOf('6.50-10')!.D * 1000).toBeCloseTo(254 + 2 * 165.1 * 0.96, 6); // 571.0 mm
    for (const bad of ['a big tyre', '13.6', '28-', '205/55', 'R16']) expect(tyreOf(bad), bad).toBeNull();
  });
});

describe('body styles by their typical figures', () => {
  test('a pickup\'s bed is about half a metre deep inside, its rail about 1.45 m up, as a crew cab\'s is (typical)', () => {
    for (const rim of [15, 17]) {
      const m = styledCar('pickup', { color: 0x888888, rim, rims: 'alloy', power: 'petrol', tint: 'dark' }), xDeck = m.L / 2 - m.lines!.deck * m.L, xT = -m.L / 2;
      // its floor, laid over its rear tyres at full bump; its rail, the highest its skin stands over the bed between its
      // tail and its cab's back
      const floor = all(makeMachine(m)).find((p) => p.name === 'bed floor')!, floorTop = floor.at![1] + (floor.shape as { box: [number, number, number] }).box[1] / 2;
      let rail = -Infinity;
      for (const p of bodyPanels(bodyPlanOf(m))) if (p.shape && 'surf' in p.shape && p.finish === 'paint') for (const q of patchPoints(p.shape.surf, 40, 16)) if (q[0] > xT + 0.3 && q[0] < xDeck - 0.2) rail = Math.max(rail, q[1]);
      expect(floorTop, `rim ${rim}: floor over the tyres`).toBeGreaterThan(0.85); expect(floorTop, `rim ${rim}`).toBeLessThan(1.0);
      expect(rail, `rim ${rim}: rail`).toBeGreaterThan(1.4); expect(rail, `rim ${rim}: rail`).toBeLessThan(1.5);
      expect(rail - floorTop, `rim ${rim}: bed depth`).toBeGreaterThan(0.45); expect(rail - floorTop, `rim ${rim}: bed depth`).toBeLessThan(0.55);
    }
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

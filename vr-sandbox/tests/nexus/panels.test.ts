// A panelled body made as its designers draw it (src/nexus/panels.ts): its arches from how its wheels move, its skin
// closing smoothly across its middle, its hood over what is under it, its lines without ripples.
import { describe, expect, test } from 'vitest';
import { bodyPlanOf, MACHINES, makeMachine, styledCar, travelOf, tyreOf } from '../../src/nexus/machines';
import { BODY_RULES, bodyScore, bodyPanels, inSweep, lineBy, practise } from '../../src/nexus/panels';
import { closestOn, comb, patchAt, patchPoints, type Patch } from '../../src/nexus/surface';
import type { Part } from '../../src/nexus/kits';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
const corolla = MACHINES.find((m) => m.short === 'corolla')!, car = makeMachine(corolla), part = (n: string) => all(car).find((p) => p.name === n)!;
const surf = (n: string) => (part(n).shape as { surf: Patch }).surf;

describe('arches from how the wheels move', () => {
  test('no point of any panel is where a tyre goes, steered to full lock either way and risen through its bump', () => {
    for (const a of corolla.axles) {
      const t = tyreOf(a.tyre)!, w = { name: 'wheel', x: a.x, y: t.D / 2, z: a.track / 2, R: t.D / 2, w: t.W, ...travelOf(a) };
      for (const p of all(car).filter((q) => q.shape && 'surf' in q.shape && !/liner/.test(q.name))) expect(patchPoints((p.shape as { surf: Patch }).surf, 40, 16).filter((q) => inSweep(q, w)), `${p.name} over the wheel at ${a.x.toFixed(2)}`).toHaveLength(0);
    }
  });
  test('a steered wheel sweeps more than it fills: a point beside its tread at full lock is in its way only when it steers', () => {
    const w = { name: 'w', x: 0, y: 0.3, z: 0.75, R: 0.3, w: 0.2, steer: 0.61, bump: 0 }, P: [number, number, number] = [0.25, 0.3, 0.95];
    expect(inSweep(P, { ...w, steer: 0 })).toBe(false); expect(inSweep(P, w)).toBe(true);
  });
});

describe('a skin that closes smoothly', () => {
  test('the side skin closes at its nose and tail onto the middle, crossing it in one tangent plane (no crease down the face)', () => {
    const s = surf('front fender').s;
    for (const v of [0.2, 0.5, 0.8]) for (const u of [0, 1]) { const q = patchAt({ s }, u, v); expect(Math.abs(q.at[2])).toBeLessThan(1e-6); expect(Math.abs(q.n[2])).toBeLessThan(0.02); }
  });
  test('the hood crosses its middle in one tangent plane', () => {
    for (const u of [0.2, 0.5, 0.8]) { const q = patchAt(surf('hood'), u, 1); expect(Math.abs(q.at[2])).toBeLessThan(1e-6); expect(Math.abs(q.n[2])).toBeLessThan(0.02); }
  });
  test('the hood clears the engine under it by the room asked', () => {
    const eng = all(car).find((p) => /engine \(/.test(p.name))!, ex = eng.at![0], ey = eng.at![1];
    const top = Math.max(...all(eng).filter((p) => p.shape && 'box' in p.shape).map((p) => ey + p.at![1] + (p.shape as { box: number[] }).box[1]! / 2));
    const over = patchPoints(surf('hood'), 40, 12, false).filter((q) => Math.abs(q[0] - ex) < 0.2 && Math.abs(q[2]) < 0.2);
    expect(over.length).toBeGreaterThan(0); for (const q of over) expect(q[1]).toBeGreaterThan(top + 0.03);
  });
});

describe('lines without ripples', () => {
  test('a line drawn by a polygon of points never wavers more than its polygon: a convex polygon makes a line that bends one way', () => {
    const f = lineBy([[0, 0], [1, 0.6], [2, 0.9], [3, 1], [4, 0.95], [5, 0.7], [6, 0]]);
    const ys = Array.from({ length: 61 }, (_, i) => f(i / 10)), d2 = ys.slice(2).map((y, i) => y - 2 * ys[i + 1]! + ys[i]!);
    expect(d2.every((d) => d <= 1e-9)).toBe(true);
  });
  test('the arch of a wheel is round about it: its lip the same distance from the axle all the way over', () => {
    const line = surf('front fender').above!, a = corolla.axles[0]!, t = tyreOf(a.tyre)!;
    const rs = line.filter(([, v]) => v > 0.25).map((uv) => { const q = patchAt({ s: surf('front fender').s }, uv[0], uv[1]).at; return Math.hypot(q[0] - a.x, q[1] - t.D / 2); });
    expect(rs.length).toBeGreaterThan(5); expect(Math.max(...rs) - Math.min(...rs)).toBeLessThan(0.012);
    expect(comb({ P: line.map(([u, v]) => [u, v, 0] as [number, number, number]) }).inflections).toBeLessThanOrEqual(2);
  });
});

describe('the critic changes the rules, never a body', () => {
  const plan = (st: string) => bodyPlanOf(st === 'corolla' ? corolla : styledCar(st, { color: 0xb8bcc2, rim: 17, rims: 'alloy', power: 'petrol', tint: 'clear' }));
  test('every door and roof of every body style is fair: no line on it turns the other way', () => {
    for (const st of ['corolla', 'sedan', 'hatchback', 'SUV', 'coupe', 'van', 'sports car']) {
      const pl = plan(st), sc = bodyScore(bodyPanels(pl), pl);
      expect(sc.blocked, st).toBe(0);
      for (const r of sc.rows.filter((x) => /door|^roof$/.test(x.panel))) expect(r.worstLine, `${st}: ${r.panel}`).toBe(0);
    }
  });
  test('a rule that helps only the bodies it was tried on is not kept; one that helps the bodies held out too is', () => {
    const on = [plan('corolla')], held = [plan('sports car')], base = { ...BODY_RULES, fit: { step: 0.25, lambda: 0.02 } };
    expect(practise('fit', [{ step: 0.35, lambda: 0.2 }], on, held, base).update).toBeNull();
    const r = practise('fit', [{ step: 0.25, lambda: 0.2 }], on, held, base); expect(r.kept).toEqual({ step: 0.25, lambda: 0.2 }); expect(r.update?.was).toMatch(/0\.02/);
  });
});

describe('panels that meet by construction', () => {
  test('the hood and the deck lid stand off the side\'s top edge by their shut line\'s gap all along it, not only where sections were drawn', () => {
    for (const [lid, side] of [['hood', 'front fender'], ['deck lid', 'rear quarter panel']] as const) {
      const pt = surf(lid), other = surf(side);
      for (let k = 0; k <= 30; k++) { const at = patchAt(pt, 0.03 + (0.94 * k) / 30, 0).at; expect(closestOn(other, at).d, `${lid} at ${k}`).toBeLessThan(BODY_RULES.gap + 0.001); }
    }
  });
  test('every point of every wheelhouse liner is clear of its tyre, steered and risen, on every style', () => {
    for (const st of ['sedan', 'hatchback', 'SUV', 'coupe', 'van', 'sports car']) {
      const plan = bodyPlanOf(styledCar(st, { color: 0x888888, rim: 17, rims: 'alloy', power: 'petrol', tint: 'dark' }));
      for (const p of bodyPanels(plan).filter((q) => /liner/.test(q.name))) {
        const w = plan.wheels.find((x) => x.z > 0 && p.name.startsWith(x.name.split(' ')[0]!))!;
        expect(patchPoints((p.shape as { surf: Patch }).surf, 60, 30, false).filter((q) => inSweep(q, w)), `${st} ${p.name}`).toHaveLength(0);
      }
    }
  });
});

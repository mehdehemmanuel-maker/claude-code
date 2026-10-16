// WHICH LAWS ARE ON (`Setting` in src/nexus/substrate/place.ts): the room derived from the setting rather than drawn.
// The user: "it should just be in the air unless time and gravity apply then it when those are on it would start
// being g active or effected by environment". These tests are the arithmetic that has to hold for that to be true,
// and the decisive one is the last pair: ONE thing, ONE runtime, the setting the only difference, and it floats or
// it falls. Nothing is special-cased for the blank room — gravity off is a measured zero and every law reads it.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { evolve } from '../../src/nexus/substrate/evolve';
import { MemorySink } from '../../src/nexus/substrate/journal';
import { advances, BLANK, borne, domainLeaves, EARTH, impliedRoom, placeAt, switched, type Setting } from '../../src/nexus/substrate/place';
import { Runtime } from '../../src/nexus/substrate/runtime';
import { leaf, type Leaf } from '../../src/nexus/lang/term';

const given = (name: string, v: number, unit: string): Leaf => leaf(name, v, unit, { class: 'given', by: 'the person', grounds: 'placed in the air' });
/** One steel block, nothing else: no floor, no table, no bench. Only the setting differs between the runs. */
function inTheAir(s: Setting) {
  const rt = Runtime.open(new MemorySink());
  for (const c of domainLeaves(s)) rt.admit(c);
  rt.admit({ kind: 'place', id: 'a block', centre: [0, 1.2, 0].map((x, j) => given(`centre ${'xyz'[j]}`, x, 'm')) as [Leaf, Leaf, Leaf],
    turn: [0, 0, 0, 1].map((x, j) => given(`turn ${'xyzw'[j]}`, x, '1')) as [Leaf, Leaf, Leaf, Leaf],
    half: [0.05, 0.05, 0.05].map((x, i) => given(`half-extent ${i + 1}`, x, 'm')) as [Leaf, Leaf, Leaf] });
  rt.admit({ kind: 'leaf', at: placeAt.density('a block'), leaf: leaf('density of steel', 7850, 'kg/m^3', { class: 'measured', source: 'src/data/materials.ts', window: 'one reading' }) });
  return rt;
}
const height = (rt: Runtime) => rt.binding(placeAt.centre('a block', 1))!.value!;

describe('which laws are on: the room is what the setting implies, never what was drawn', () => {
  it('the default setting has nothing switched on', () => {
    expect(BLANK.gravity).toBe(0);
    expect(BLANK.time).toBe(false);
    expect(advances(BLANK)).toBe(false);
    expect(advances(EARTH)).toBe(true);
  });

  it('gravity off is a MEASURED ZERO, not an absence: every law reads it and answers 0', () => {
    // The distinction the whole design rests on. An unknown gravity is refused outright (see the last test here);
    // a zero one runs every law and makes every weight it feeds exactly 0 N, so the room goes inert by arithmetic.
    const g = domainLeaves(BLANK).find((c) => c.kind === 'leaf' && c.leaf.name === 'gravity')!;
    expect(g.kind === 'leaf' && g.leaf.value).toBe(0);
    expect(g.kind === 'leaf' && g.leaf.origin.class).toBe('measured');
    const rt = inTheAir(BLANK);
    expect(rt.binding(placeAt.mass('a block'))!.value).toBeCloseTo(7850 * 0.1 ** 3, 9); // it still has a mass
    expect(rt.binding(placeAt.weight('a block'))!.value).toBe(0); // and no weight at all
  });

  it('nothing need bear a weight of nothing, so no surface is implied by any law', () => {
    const off = borne(BLANK, 7.85), on = borne(EARTH, 7.85);
    expect(off.newtons).toBe(0);
    expect(off.needsBearing).toBe(false);
    expect(off.says).toContain('no floor, table or bench is implied');
    expect(on.newtons).toBeCloseTo(7.85 * 9.80665, 9);
    expect(on.needsBearing).toBe(true);
    expect(on.says).toContain('implied by the law');
  });

  it('the implied room is derived from the setting, one implication per law', () => {
    const blank = impliedRoom(BLANK);
    expect(blank.every((r) => r.on)).toBe(false);
    expect(blank.find((r) => r.law === 'gravity')!.room).toContain('stands in the air where it is put');
    expect(blank.find((r) => r.law === 'time')!.room).toContain('not one of them is computed');
    const earth = impliedRoom(EARTH);
    expect(earth.every((r) => r.on)).toBe(true);
    expect(earth.find((r) => r.law === 'gravity')!.room).toContain('a surface under it is implied');
  });

  it('a law is switched without mutating the setting it came from, so both can be held and compared', () => {
    const on = switched(BLANK, 'gravity', true);
    expect(on.gravity).toBe(EARTH.gravity);
    expect(BLANK.gravity).toBe(0); // the blank one is untouched
    expect(switched(on, 'gravity', false).gravity).toBe(0);
    expect(switched(BLANK, 'time', true).time).toBe(true);
    expect(BLANK.time).toBe(false);
  });

  it('IN THE AIR: with nothing switched on the block does not move, and the kernel is not run at all', async () => {
    const rt = inTheAir(BLANK);
    expect(advances(BLANK)).toBe(false); // so nothing steps it: time off is no clock, not a slow one
    // and even if it were stepped, the arithmetic alone holds it: zero gravity, zero weight, nowhere to fall
    const e = evolve(await jolt(), rt);
    expect(e.refused).toEqual([]); // the setting is known, so nothing is refused
    expect(e.moved).toEqual([]);
    expect(height(rt)).toBe(1.2); // exactly where it was put, with no floor under it anywhere
  });

  it('SWITCH GRAVITY ON and the same block in the same room falls: the environment begins acting on it', async () => {
    const rt = inTheAir(switched(BLANK, 'gravity', true));
    expect(rt.binding(placeAt.weight('a block'))!.value).toBeCloseTo(7850 * 0.1 ** 3 * 9.80665, 6);
    const e = evolve(await jolt(), rt);
    expect(e.refused).toEqual([]);
    expect(e.moved.map((m) => m.place)).toEqual(['a block']); // it is not where it was put any more
    expect(e.moved[0]!.distance).toBeGreaterThan(0.5); // it fell, because nothing was drawn to catch it
  });

  it('gravity UNKNOWN is not gravity off: a setting that was never given is refused, never assumed', async () => {
    const rt = Runtime.open(new MemorySink()); // no domainLeaves at all
    rt.admit({ kind: 'place', id: 'a block', centre: [0, 1.2, 0].map((x, j) => given(`centre ${'xyz'[j]}`, x, 'm')) as [Leaf, Leaf, Leaf],
      turn: [0, 0, 0, 1].map((x, j) => given(`turn ${'xyzw'[j]}`, x, '1')) as [Leaf, Leaf, Leaf, Leaf],
      half: [0.05, 0.05, 0.05].map((x, i) => given(`half-extent ${i + 1}`, x, 'm')) as [Leaf, Leaf, Leaf] });
    const e = evolve(await jolt(), rt);
    expect(e.refused).toEqual([{ place: 'the domain', because: 'its gravity is not known' }]);
  });
});

// The evolver (src/nexus/evolve.ts): the state's places realized in the rigid-body kernel, stepped until still, and
// where each came to rest returned as a measured place. Statics says what cannot stay; the kernel says where it goes.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { contactAt } from '../../src/nexus/contact';
import { evolve, evolverContract, notAtRest } from '../../src/nexus/evolve';
import { MemorySink } from '../../src/nexus/journal';
import { GRAVITY, gravityAxis, placeAt } from '../../src/nexus/place';
import { Runtime } from '../../src/nexus/runtime';
import { leaf, type Leaf } from '../../src/nexus/term';

const person = 'the person';
const given = (name: string, v: number, unit: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds: 'placed' });
const measured = (name: string, v: number, unit: string, source: string): Leaf => leaf(name, v, unit, { class: 'measured', source, window: 'one reading' });
const box = (id: string, c: [number, number, number], h: [number, number, number]) => ({
  kind: 'place' as const, id,
  centre: c.map((x, j) => given(`centre ${'xyz'[j]}`, x, 'm')) as [Leaf, Leaf, Leaf],
  turn: [0, 0, 0, 1].map((x, j) => given(`turn ${'xyzw'[j]}`, x, '1')) as [Leaf, Leaf, Leaf, Leaf],
  half: h.map((x, i) => given(`half-extent ${i + 1}`, x, 'm')) as [Leaf, Leaf, Leaf],
});
const fir = (id: string) => ({ kind: 'leaf' as const, at: placeAt.density(id), leaf: measured('density of Douglas-fir', 530, 'kg/m^3', 'src/data/materials.ts (USDA Wood Handbook)') });
function room(supportB = 0.4) {
  const rt = Runtime.open(new MemorySink());
  rt.admit({ kind: 'leaf', at: GRAVITY, leaf: measured('gravity', 9.80665, 'm/s^2', 'standard gravity') });
  [0, -1, 0].forEach((x, j) => rt.admit({ kind: 'leaf', at: gravityAxis(j), leaf: measured(`direction of gravity ${'xyz'[j]}`, x, '1', "the headset's floor estimate") }));
  rt.admit(box('the floor', [0, -0.05, 0], [5, 0.05, 5]));
  rt.admit({ kind: 'held', place: 'the floor', by: 'the headset: what it measured as the floor is the ground' });
  rt.admit(box('block A', [-0.4, 0.2, 0], [0.05, 0.2, 0.2]));
  rt.admit(box('block B', [supportB, 0.2, 0], [0.05, 0.2, 0.2]));
  rt.admit(box('a board', [0, 0.4 + 0.092, 0], [0.5, 0.092, 0.019]));
  for (const p of ['block A', 'block B', 'a board']) rt.admit(fir(p));
  return rt;
}

const potential = (rt: Runtime) => ['block A', 'block B', 'a board'].reduce((e, p) => e + rt.binding(placeAt.weight(p))!.value! * rt.binding(placeAt.centre(p, 1))!.value!, 0);

describe('the evolver: statics says what cannot stay, the kernel says where it goes', () => {
  it('a room at rest stays where the state has it, within what the kernel resolves: nothing is returned', async () => {
    const e = evolve(await jolt(), room());
    expect(e.still).toBe(true);
    expect(e.refused).toEqual([]);
    expect(e.moved).toEqual([]);
    expect(e.contributions).toEqual([]);
  });

  it('a board that tips comes to rest lower, as a released body must; returned as a measured place, it is no longer on the block it pulled on', async () => {
    const rt = room();
    rt.admit(box('block B', [-0.2, 0.2, 0], [0.05, 0.2, 0.2]));
    expect(notAtRest(rt)).toEqual(['a board']);
    const before = potential(rt);
    const e = evolve(await jolt(), rt);
    expect(e.still).toBe(true);
    expect(e.moved.map((m) => m.place)).toEqual(['a board']);
    for (const c of e.contributions) rt.admit(c);
    // released from rest it comes to rest with less potential energy: the kernel dissipated the rest
    expect(potential(rt)).toBeLessThan(before);
    const centre = rt.why(placeAt.centre('a board', 1))!;
    expect(centre.origin!.class).toBe('measured');
    expect(centre.origin!.source).toMatch(/rigid-body kernel.*where it came to rest/);
    // a rigid body keeps its extents: the same leaves, the same volume
    expect(rt.why(placeAt.half('a board', 0))!.origin!.class).toBe('given');
    expect(rt.binding(contactAt.force('a board', 'block A'))).toBeUndefined();
    // it leans on an edge of block B and an edge on the floor: borne by both, one of them on a slope
    expect(rt.binding(contactAt.normal('a board', 'block B', 1))!.value!).toBeLessThan(0.9);
    expect(rt.binding(contactAt.normal('a board', 'the floor', 1))!.value!).toBeCloseTo(1, 9);
    // whether it can stay there waits on what the state does not hold: the friction at each contact
    const stays = () => rt.gaps().find((g) => (g.kind === 'unmet' || g.kind === 'undecided') && g.says === 'a board can stay on its two contacts');
    expect(stays()?.kind).toBe('undecided');
    const mu = (v: number) => { for (const l of ['the floor', 'block B']) rt.admit({ kind: 'leaf', at: contactAt.coefficient('a board', l), leaf: given('coefficient of friction', v, '1') }); };
    // the kernel held it with the surface its contract assumes; statics with that same friction agrees that it can stay
    mu(evolverContract().surface.friction.value!);
    expect(stays()).toBeUndefined();
    // on a surface a tenth as rough, no sharing of its load holds it
    mu(evolverContract().surface.friction.value! / 10);
    expect(stays()?.kind).toBe('unmet');
  });

  it('a place whose matter is unknown is not realized: the evolution is refused, and says why', async () => {
    const rt = room();
    rt.admit(box('block C', [0, 0.634, 0], [0.05, 0.05, 0.1]));
    const e = evolve(await jolt(), rt);
    expect(e.refused).toEqual([{ place: 'block C', because: 'the density of its matter is not known, so neither is its mass' }]);
    expect(e.contributions).toEqual([]);
  });

  it('what the kernel returned is in the journal: read back, the state is the same without the kernel', async () => {
    const sink = new MemorySink();
    const rt = Runtime.open(sink);
    for (const c of room().journal.contributions()) rt.admit(c);
    rt.admit(box('block B', [-0.2, 0.2, 0], [0.05, 0.2, 0.2]));
    for (const c of evolve(await jolt(), rt).contributions) rt.admit(c);
    const back = Runtime.open(sink);
    for (const k of rt.addresses()) expect(back.binding(k)!.hash).toBe(rt.binding(k)!.hash);
  });
});

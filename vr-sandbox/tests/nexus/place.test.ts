// Places in the domain (src/nexus/substrate/place.ts): a box with its centre, its turn and its half-extents, every number a
// leaf, in a domain whose gravity is measured. The runtime generates what the geometry implies for every place alike.
// The kept section laws are the evidence the generated integrals are checked against; nothing names a breadth or a depth.

import { describe, expect, it } from 'vitest';
import { apply } from '../../src/nexus/lang/law';
import { RECT_I, RECT_MODULUS } from '../../src/nexus/book/slice';
import { lawById } from '../../src/nexus/book';
import { MemorySink } from '../../src/nexus/substrate/journal';
import { GRAVITY, gravityAxis, placeAt } from '../../src/nexus/substrate/place';
import { Runtime } from '../../src/nexus/substrate/runtime';
import { ofLeaf } from '../../src/nexus/lang/evaluate';
import { leaf, type Leaf } from '../../src/nexus/lang/term';

const person = 'the person';
const given = (name: string, v: number, unit: string): Leaf => leaf(name, v, unit, { class: 'given', by: person, grounds: 'what the person said' });
const measured = (name: string, v: number, unit: string, source: string): Leaf => leaf(name, v, unit, { class: 'measured', source, window: 'one reading' });
const S45 = Math.SQRT1_2;

/** A board a metre long, 184 mm and 38 mm across its other two axes, turned by a quaternion. */
const board = (turn: [number, number, number, number]) => ({
  kind: 'place' as const, id: 'a board',
  centre: [given('centre x', 0, 'm'), given('centre y', 1, 'm'), given('centre z', 0, 'm')] as [Leaf, Leaf, Leaf],
  turn: turn.map((x, j) => given(`turn ${'xyzw'[j]}`, x, '1')) as [Leaf, Leaf, Leaf, Leaf],
  half: [given('half-length', 0.5, 'm'), given('half of 184 mm', 0.092, 'm'), given('half of 38 mm', 0.019, 'm')] as [Leaf, Leaf, Leaf],
});
const ON_EDGE: [number, number, number, number] = [0, 0, 0, 1]; // its second axis along the domain's y, which gravity points against
const FLAT: [number, number, number, number] = [S45, 0, 0, S45]; // turned a quarter about its length: its third axis along gravity

function room(rt: Runtime) {
  rt.admit({ kind: 'leaf', at: GRAVITY, leaf: measured('gravity', 9.80665, 'm/s^2', 'standard gravity') });
  [0, -1, 0].forEach((x, j) => rt.admit({ kind: 'leaf', at: gravityAxis(j), leaf: measured(`direction of gravity ${'xyz'[j]}`, x, '1', "the headset's floor estimate") }));
}

describe('a place\'s geometry generates what it implies, for every place alike', () => {
  it('on edge, the section across its length has the second moment and modulus the kept laws give for 38 by 184: no breadth or depth was named', () => {
    const rt = Runtime.open();
    room(rt);
    rt.admit(board(ON_EDGE));
    const b = ofLeaf(given('b', 0.038, 'm')), h = ofLeaf(given('h', 0.184, 'm'));
    expect(rt.binding(placeAt.sectionI('a board', 0))!.value).toBeCloseTo(apply(RECT_I, { b, h }).value!, 15);
    expect(rt.binding(placeAt.sectionS('a board', 0))!.value).toBeCloseTo(apply(RECT_MODULUS, { b, h }).value!, 15);
    expect(rt.binding(placeAt.alongGravity('a board'))!.value).toBeCloseTo(0.184, 12);
  });

  it('turned flat, the same board bends about the other line: its modulus falls by 184 over 38; only what reads the turn is evaluated again', () => {
    const rt = Runtime.open();
    room(rt);
    rt.admit(board(ON_EDGE));
    const edge = rt.binding(placeAt.sectionS('a board', 0))!.value!;
    const volume = rt.binding(placeAt.volume('a board'))!.hash;
    const c = rt.admit(board(FLAT));
    expect(rt.binding(placeAt.sectionS('a board', 0))!.value).toBeCloseTo(apply(RECT_MODULUS, { b: ofLeaf(given('b', 0.184, 'm')), h: ofLeaf(given('h', 0.038, 'm')) }).value!, 15);
    expect(edge / rt.binding(placeAt.sectionS('a board', 0))!.value!).toBeCloseTo(0.184 / 0.038, 9);
    expect(rt.binding(placeAt.alongGravity('a board'))!.value).toBeCloseTo(0.038, 12);
    // what reads the turn: its extent along gravity and the section across its length; the turn puts gravity along
    // its third axis, so the section across its second is generated and the one across its third taken out, never
    // evaluated through the turn that removed it
    expect(c.evaluated).toBe(5);
    // the new section is a metre wide and 38 mm along gravity
    expect(rt.binding(placeAt.sectionS('a board', 1))!.value).toBeCloseTo(apply(RECT_MODULUS, { b: ofLeaf(given('b', 1, 'm')), h: ofLeaf(given('h', 0.038, 'm')) }).value!, 15);
    expect(rt.binding(placeAt.sectionS('a board', 2))).toBeUndefined();
    expect(rt.binding(placeAt.volume('a board'))!.hash).toBe(volume);
  });

  it('its matter gives it a mass and, by the kept law, a weight; a board standing along gravity is not bent across its length: no such section is generated, so there is nothing to refuse', () => {
    const rt = Runtime.open();
    room(rt);
    rt.admit(board([0, 0, S45, S45]));
    rt.admit({ kind: 'leaf', at: placeAt.density('a board'), leaf: measured('density of Douglas-fir', 530, 'kg/m^3', 'src/data/materials.ts (USDA Wood Handbook)') });
    const m = 530 * 1 * 0.184 * 0.038;
    expect(rt.binding(placeAt.mass('a board'))!.value).toBeCloseTo(m, 12);
    expect(rt.binding(placeAt.weight('a board'))!.value).toBeCloseTo(m * 9.80665, 9);
    expect(rt.binding(placeAt.weight('a board'))!.law).toBe(lawById('weight').hash);
    // turned a quarter about z, its length points along gravity
    expect(rt.binding(placeAt.alongGravity('a board'))!.value).toBeCloseTo(1, 12);
    expect(rt.binding(placeAt.sectionI('a board', 0))).toBeUndefined();
    // across its breadth it is still a section gravity crosses: 38 mm wide and a metre along gravity
    expect(rt.binding(placeAt.sectionS('a board', 1))!.value).toBeCloseTo(apply(RECT_MODULUS, { b: ofLeaf(given('b', 0.038, 'm')), h: ofLeaf(given('h', 1, 'm')) }).value!, 15);
    // nothing refused; what the state lacks is only what is true of a board in the air: nothing bears it
    expect(rt.gaps().map((g) => [g.kind, (g as { says?: string }).says])).toEqual([['undecided', 'a board is borne']]);
  });

  it('with no gravity measured, what depends on it waits on the domain\'s gravity; the rest is generated', () => {
    const rt = Runtime.open();
    const c = rt.admit(board(ON_EDGE));
    expect(rt.binding(placeAt.volume('a board'))!.value).toBeCloseTo(0.184 * 0.038, 12);
    const waits = c.gaps.filter((g) => g.kind === 'unbound').flatMap((g) => (g as { waitingOn: string[] }).waitingOn);
    // the weight waits on gravity's magnitude and on the mass, which waits on the density
    expect(new Set(waits)).toEqual(new Set([gravityAxis(0), gravityAxis(1), gravityAxis(2), GRAVITY, placeAt.density('a board'), placeAt.mass('a board')]));
  });

  it('a place read back from the journal is the same place, with the same generated geometry', () => {
    const sink = new MemorySink();
    const a = Runtime.open(sink);
    room(a);
    a.admit(board(FLAT));
    const b = Runtime.open(sink);
    for (const k of a.addresses()) expect(b.binding(k)!.hash).toBe(a.binding(k)!.hash);
  });
});

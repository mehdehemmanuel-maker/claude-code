// Couplings between places (src/nexus/contact.ts), generated from geometry in the running state: contacts where faces
// touch, weight down them to what is held at rest, shares by the laws, bending and stress by the kept law. The places
// are boxes with numbers; nothing names a floor, a support, a beam or a shelf. The kept beam law is the evidence.

import { describe, expect, it } from 'vitest';
import { apply } from '../../src/nexus/law';
import { PATCH_MOMENT, SELF_MOMENT } from '../../src/nexus/book/slice';
import { ofLeaf } from '../../src/nexus/evaluate';
import { MemorySink } from '../../src/nexus/journal';
import { contactAt } from '../../src/nexus/contact';
import { GRAVITY, gravityAxis, placeAt } from '../../src/nexus/place';
import { bound, Runtime } from '../../src/nexus/runtime';
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

/** A room: gravity measured, the floor held by the ground; two blocks on it; a board across them, on edge. */
function room(supportB = 0.4, matter = ['block A', 'block B', 'a board']) {
  const rt = Runtime.open(new MemorySink());
  rt.admit({ kind: 'leaf', at: GRAVITY, leaf: measured('gravity', 9.80665, 'm/s^2', 'standard gravity') });
  [0, -1, 0].forEach((x, j) => rt.admit({ kind: 'leaf', at: gravityAxis(j), leaf: measured(`direction of gravity ${'xyz'[j]}`, x, '1', "the headset's floor estimate") }));
  rt.admit(box('the floor', [0, -0.05, 0], [5, 0.05, 5]));
  rt.admit({ kind: 'held', place: 'the floor', by: 'the headset: what it measured as the floor is the ground' });
  rt.admit(box('block A', [-0.4, 0.2, 0], [0.05, 0.2, 0.2]));
  rt.admit(box('block B', [supportB, 0.2, 0], [0.05, 0.2, 0.2]));
  rt.admit(box('a board', [0, 0.4 + 0.092, 0], [0.5, 0.092, 0.019]));
  for (const p of matter) rt.admit(fir(p));
  return rt;
}
const W = (rt: Runtime, p: string) => rt.binding(placeAt.weight(p))!.value!;
const F = (rt: Runtime, u: string, l: string) => rt.binding(contactAt.force(u, l))?.value;

describe('contacts form where faces touch, and the weight goes down them to what is held', () => {
  it('four contacts form, each with the area its overlap has: the board on each block is 100 by 38 mm', () => {
    const rt = room();
    expect(rt.binding(contactAt.area('a board', 'block A'))!.value).toBeCloseTo(0.1 * 0.038, 12);
    expect(rt.binding(contactAt.area('block A', 'the floor'))!.value).toBeCloseTo(0.1 * 0.4, 12);
    expect(rt.binding(contactAt.area('the floor', 'block A'))).toBeUndefined();
  });

  it('on two contacts set evenly, each bears half the board; each block bears its own weight and that half down to the floor', () => {
    const rt = room();
    expect(F(rt, 'a board', 'block A')).toBeCloseTo(W(rt, 'a board') / 2, 9);
    expect(F(rt, 'a board', 'block B')).toBeCloseTo(W(rt, 'a board') / 2, 9);
    expect(F(rt, 'block A', 'the floor')).toBeCloseTo(W(rt, 'block A') + W(rt, 'a board') / 2, 9);
  });

  it('the board bends under its own weight by what the kept law gives for a span of 0.8 m with 0.1 m over each end; its stress is that over the modulus of the section across its length', () => {
    const rt = room();
    const q = W(rt, 'a board') / 1.0;
    const lit = (name: string, v: number, unit: string) => ofLeaf(given(name, v, unit));
    const kept = apply(SELF_MOMENT, { q: lit('q', q, 'N/m'), L: lit('L', 0.8, 'm'), Lt: lit('Lt', 1.0, 'm'), a: lit('a', 0, 'm') }).value!;
    expect(rt.binding(contactAt.moment('a board'))!.value).toBeCloseTo(kept, 9);
    expect(rt.binding(contactAt.stress('a board'))!.value).toBeCloseTo(kept / (0.038 * 0.184 ** 2 / 6), 6);
  });

  it('a block resting on the middle of the board bends it by the kept patch law and its own weight together: one rule for every force on it, nothing added for loads from above', () => {
    const rt = room();
    rt.admit(box('block C', [0, 0.584 + 0.05, 0], [0.05, 0.05, 0.1])); rt.admit(fir('block C'));
    const P = W(rt, 'block C'), q = W(rt, 'a board') / 1.0;
    expect(F(rt, 'block C', 'a board')).toBeCloseTo(P, 9);
    expect(F(rt, 'a board', 'block A')).toBeCloseTo((W(rt, 'a board') + P) / 2, 9);
    const lit = (name: string, v: number, unit: string) => ofLeaf(given(name, v, unit));
    // the block's weight spreads over the 100 mm it rests on; both moments are largest at the middle, so they add there
    const patch = apply(PATCH_MOMENT, { P: lit('P', P, 'N'), L: lit('L', 0.8, 'm'), w: lit('w', 0.1, 'm'), a: lit('a', 0, 'm') }).value!;
    const own = apply(SELF_MOMENT, { q: lit('q', q, 'N/m'), L: lit('L', 0.8, 'm'), Lt: lit('Lt', 1.0, 'm'), a: lit('a', 0, 'm') }).value!;
    expect(rt.binding(contactAt.moment('a board'))!.value).toBeCloseTo(patch + own, 9);
    // moved off the middle, the shares follow moments and the moment is no longer the sum of the two largest
    rt.admit(box('block C', [0.2, 0.584 + 0.05, 0], [0.05, 0.05, 0.1]));
    expect(F(rt, 'a board', 'block B')).toBeCloseTo(W(rt, 'a board') / 2 + P * 0.6 / 0.8, 9);
    expect(rt.binding(contactAt.moment('a board'))!.value).toBeLessThan(patch + own);
    expect(rt.gaps().some((g) => g.kind === 'refused' || g.kind === 'unmet')).toBe(false);
  });

  it('moving a block re-derives the shares by moments; moved past the board\'s middle, the board would pull up on a block, which a contact cannot: it tips, and the gap is at that contact', () => {
    const rt = room(0.1);
    expect(F(rt, 'a board', 'block B')! / W(rt, 'a board')).toBeCloseTo(0.4 / 0.5, 9);
    rt.admit(box('block B', [-0.2, 0.2, 0], [0.05, 0.2, 0.2]));
    const unmet = rt.gaps().filter((g) => g.kind === 'unmet').map((g) => (g as { says: string }).says);
    expect(unmet).toContain('a board presses on block A, never pulls');
  });

  it('what is derived of a place at rest holds only while it is at rest: tipped, its bending and the load it passes down are refused, and a want on its stress is undecided, never met', () => {
    const rt = room();
    const want = bound(contactAt.stress('a board'), 'at most', leaf('half the fir\'s modulus of rupture', 42.5e6, 'Pa', { class: 'given', by: person, grounds: 'a factor of two on 85 MPa (USDA Wood Handbook, clear wood)' }), person, 'the board is stressed within half its strength');
    rt.admit(want);
    rt.admit(box('block B', [-0.2, 0.2, 0], [0.05, 0.2, 0.2]));
    const refused = rt.gaps().filter((g) => g.kind === 'refused').map((g) => [(g as { at: string }).at, (g as { domain: string }).domain]);
    expect(refused).toContainEqual([contactAt.moment('a board'), 'a board is at rest on what bears it']);
    expect(rt.binding(contactAt.rests('a board'))!.value).toBe(0);
    expect(refused).toContainEqual([contactAt.load('block A'), 'a board presses on block A']);
    const mine = rt.gaps().find((g) => (g.kind === 'unmet' || g.kind === 'undecided') && g.says === 'the board is stressed within half its strength');
    expect(mine?.kind).toBe('undecided');
    // set back between them, it rests again, and the same want is met
    rt.admit(box('block B', [0.4, 0.2, 0], [0.05, 0.2, 0.2]));
    expect(rt.gaps().some((g) => g.kind === 'refused' || ((g.kind === 'unmet' || g.kind === 'undecided') && g.says === 'the board is stressed within half its strength'))).toBe(false);
  });

  it('a place is at rest only while what bears it is: on a board that tips, a block resting on it is not at rest either, and what it derives as at rest is refused; the floor\'s rest is the headset\'s given', () => {
    const rt = room();
    rt.admit(box('block C', [0, 0.584 + 0.05, 0], [0.05, 0.05, 0.1])); rt.admit(fir('block C'));
    expect(['the floor', 'block A', 'a board', 'block C'].map((p) => rt.binding(contactAt.rests(p))!.value)).toEqual([1, 1, 1, 1]);
    expect(rt.binding(contactAt.momentAlong('block C', 0))!.value).not.toBeNull();
    rt.admit(box('block B', [-0.2, 0.2, 0], [0.05, 0.2, 0.2]));
    expect(rt.binding(contactAt.rests('a board'))!.value).toBe(0);
    expect(rt.binding(contactAt.rests('block C'))!.value).toBe(0);
    const refused = rt.gaps().filter((g) => g.kind === 'refused').map((g) => [(g as { at: string }).at, (g as { domain: string }).domain]);
    expect(refused).toContainEqual([contactAt.momentAlong('block C', 0), 'block C is at rest on what bears it']);
    expect(rt.why(contactAt.rests('the floor'))!.origin).toEqual({ class: 'given', by: 'the headset: what it measured as the floor is the ground', grounds: 'held at rest by what lies outside the domain' });
  });

  it('what one known part decides is decided without the unknown parts: a board that pulls on one block is not at rest, whatever the other block weighs', () => {
    const rt = room(0.4, ['block A', 'a board']);
    rt.admit(box('block B', [-0.2, 0.2, 0], [0.05, 0.2, 0.2]));
    // block B's matter is unknown, so whether block B is at rest is undecided; the board's own pull decides the board
    expect(rt.binding(contactAt.rests('block B'))).toBeUndefined();
    const rest = rt.binding(contactAt.rests('a board'))!;
    expect(rest.value).toBe(0);
    expect(Object.values(rest.inputs).map((d) => d.name)).not.toContain(contactAt.rests('block B'));
    // and so what block B lacks bears on what block B's own rest decides, not on the board
    const mass = rt.gaps().find((g) => g.kind === 'unbound' && g.at === placeAt.mass('block B'))!;
    expect(rt.bearing(mass).map((b) => b.says)).toEqual(['the load on block B falls within what bears it']);
    // once block B's matter is known, nothing about the board's rest changes
    rt.admit(fir('block B'));
    expect(rt.binding(contactAt.rests('a board'))!.value).toBe(0);
  });

  it('a gap is told apart by what waits on it: the floor\'s unknown matter bears on no constraint; a block\'s bears on whether it stays on what bears it', () => {
    const rt = room();
    const floor = rt.gaps().filter((g) => 'at' in g && String(g.at).startsWith('the floor/'));
    expect(floor.length).toBeGreaterThan(0);
    for (const g of floor) expect(rt.bearing(g)).toEqual([]);
    const unknown = room(0.4, ['block B', 'a board']);
    const mass = unknown.gaps().find((g) => g.kind === 'unbound' && g.at === placeAt.mass('block A'))!;
    expect(unknown.bearing(mass).map((b) => b.says)).toEqual(['the load on block A falls within what bears it']);
    expect(unknown.derives(placeAt.density('block A'))).toBe(false);
  });

  it('a block taken out from under one end leaves the board on one contact, and its weight falls outside it: it tips; nothing at all beneath, it is not borne', () => {
    const rt = room();
    rt.admit(box('block B', [3, 0.2, 0], [0.05, 0.2, 0.2]));
    expect(F(rt, 'a board', 'block A')).toBeCloseTo(W(rt, 'a board'), 9);
    expect(rt.gaps().some((g) => g.kind === 'unmet' && g.says === 'the load on a board falls within what bears it')).toBe(true);
    rt.admit(box('a board', [0, 2, 0], [0.5, 0.092, 0.019]));
    expect(rt.gaps().some((g) => g.kind === 'undecided' && g.says === 'a board is borne')).toBe(true);
  });

  it('a want on the stress is a person\'s constraint on generated structure: within half the fir\'s strength it is met', () => {
    const rt = room();
    const strength = 85e6;
    const c = rt.admit(bound(contactAt.stress('a board'), 'at most', leaf('half the fir\'s modulus of rupture', strength / 2, 'Pa', { class: 'given', by: person, grounds: 'a factor of two on 85 MPa (USDA Wood Handbook, clear wood)' }), person, 'the board is stressed within half its strength'));
    expect(c.gaps.some((g) => g.kind === 'unmet' || (g.kind === 'undecided' && g.says.startsWith('the board is stressed')))).toBe(false);
  });

  it('read back from the journal, the same couplings form and every binding is the same', () => {
    const sink = new MemorySink();
    const a = Runtime.open(sink);
    const src = room();
    for (const c of src.journal.contributions()) a.admit(c);
    const b = Runtime.open(sink);
    for (const k of a.addresses()) expect(b.binding(k)!.hash).toBe(a.binding(k)!.hash);
    expect(b.binding(contactAt.moment('a board'))).toBeDefined();
  });
});

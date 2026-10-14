// The motion graph, and the one thing it must never do: give a confident degrees-of-freedom number over axes it made
// up. `mobility()` was a tested solver with no caller for four rounds; the first wire into it guessed a joint's axis
// from the part's name (`/slide|rod|damper/` → up, else sideways) and printed "43 degrees of freedom" for a hatchback.
// That number is worse than none, so these pin the derivation and the REFUSAL, and ratchet the share of a real car's
// joints the graph can actually use (docs/ROUNDS.md Run 7r).
import { describe, expect, it } from 'vitest';
import { LEAVES, TURNS_FREE, axisOf, mechanismOf, moving, howItMoves } from '../../src/nexus/make/moves';
import { KITS, makeKit, type Part } from '../../src/nexus/parts/kits';

const P = (name: string, extra: Partial<Part> = {}): Part => ({ name, ...extra });

describe('a joint says what it leaves free', () => {
  it('every joint kind in kits.ts has an answer here, and only `cover` has none', () => {
    const KINDS = ['bearing', 'ball', 'bush', 'slide', 'spring', 'cv', 'hinge', 'mount', 'universal', 'cover'] as const;
    for (const k of KINDS) expect(k in LEAVES, `${k} is a joint kits.ts declares and LEAVES has no row for it`).toBe(true);
    expect(LEAVES.cover, 'a bellows carries nothing across itself, so it is not a joint').toBe(null);
    for (const k of KINDS) if (k !== 'cover') expect(LEAVES[k], `${k} must leave something free`).toBeTruthy();
  });
  it('a slide and a spring do not turn, which is what the first draft got wrong', () => {
    expect(TURNS_FREE.has('prismatic')).toBe(false);
    expect([...TURNS_FREE].sort()).toEqual(['cylindrical', 'revolute', 'spherical']);
  });
});

describe('an axis is derived or refused, never guessed', () => {
  it('a declared slide direction is the axis', () => {
    expect(axisOf(P('rod', { travel: { slide: { dir: [0, 1, 0], from: 0, to: 0.1 } } }), 'prismatic')).toEqual([0, 1, 0]);
  });
  it("a solid of revolution's axis is its own y, carried round by its rot", () => {
    const flat = axisOf(P('race', { shape: { lathe: [[0.01, 0], [0.02, 0], [0.02, 0.01], [0.01, 0.01]] } as never }), 'revolute')!;
    expect(flat.map((v) => +v.toFixed(3))).toEqual([0, 1, 0]);
    // rot [π/2, 0, 0] turns local +y onto +z: a wheel bearing lying across the car
    const turned = axisOf(P('race', { rot: [Math.PI / 2, 0, 0], shape: { lathe: [[0.01, 0], [0.02, 0]] } as never }), 'revolute')!;
    expect(turned.map((v) => +v.toFixed(3))).toEqual([0, 1, 0].map((_, i) => [0, 0, 1][i]));
  });
  it('a shape with no axis of its own is REFUSED, not guessed from the name', () => {
    expect(axisOf(P('damper rod', { shape: { box: [0.01, 0.2, 0.01] } }), 'prismatic'), 'a box has three axes and the name is not evidence').toBe(null);
    expect(axisOf(P('slide block', {}), 'prismatic'), 'no shape at all cannot say which way it acts').toBe(null);
  });
  it('a joint whose axis cannot be derived is left OUT of the mechanism and counted', () => {
    const root: Part = { name: 'thing', parts: [P('block', { link: 'carriage', joint: 'slide', joins: ['rail'], shape: { box: [0.1, 0.1, 0.1] } }), P('rail', { link: 'bed' })] };
    const { joints, dropped } = mechanismOf(root);
    expect(joints, 'nothing may enter the solver on a made-up axis').toHaveLength(0);
    expect(dropped.map((d) => d.part)).toEqual(['block']);
    expect(dropped[0]!.why).toMatch(/nothing says which way/);
  });
});

describe('what moves, and what it needs', () => {
  it('a part that declares travel and whose link holds no joint is the finding; a wheel beside its bearing is not', () => {
    const lone: Part = { name: 'thing', parts: [P('wheel', { link: 'w', travel: { bump: 0.08 } })] };
    expect(moving(lone).find((m) => m.part === 'wheel')?.unsaid).toMatch(/nothing in its link/);
    const held: Part = { name: 'thing', parts: [P('wheel', { link: 'w', travel: { bump: 0.08 } }), P('hub bearing', { link: 'w', joint: 'bearing', shape: { cyl: [0.03, 0.02] } })] };
    expect(moving(held).find((m) => m.part === 'wheel')?.unsaid, 'its bearing is a sibling of one link, which is where a real wheel bearing lives').toBeUndefined();
  });
  it('a steered, rising wheel needs more room than it occupies, and the envelope says how much', () => {
    const r: Part = { name: 'thing', parts: [P('wheel', { link: 'w', shape: { cyl: [0.3, 0.2] }, travel: { steer: 0.6, bump: 0.08 }, joint: 'bearing' })] };
    const m = moving(r).find((x) => x.part === 'wheel')!;
    expect(m.range.join(' ')).toMatch(/steered ±34\.4°.*risen ±80 mm/);
    expect(m.clearance, 'a sweep wider than the part is the whole point of asking').toBeTruthy();
    expect(m.clearance!.half[1]).toBeCloseTo(0.1 + 0.08, 6);
  });
  it('a bellows is not a joint and does not enter the graph', () => {
    expect(moving({ name: 'thing', parts: [P('boot', { joint: 'cover', link: 'a' })] })).toHaveLength(0);
  });
  it('the edges name parts at their other end, derived from declarations', () => {
    const root: Part = { name: 'thing', parts: [
      P('shaft', { link: 'drive', joint: 'bearing', shape: { cyl: [0.01, 0.2] }, joins: ['housing'], iface: [{ kind: 'shaft', role: 'provides', d: 0.02, says: 'its output' }] }),
      P('housing', { link: '', passes: ['shaft'] }),
      P('pulley', { link: 'p', iface: [{ kind: 'shaft', role: 'requires', d: 0.02, says: 'its bore' }] }),
    ] };
    const m = moving(root).find((x) => x.part === 'shaft')!;
    expect(m.connectedTo).toContain('housing');
    expect(m.movesWithin, 'the part whose `passes` names it says so from the other side').toContain('housing');
    expect(m.transfersForceTo, 'a provided shaft met by a required one of the same kind').toContain('pulley');
    expect(m.constrainedBy.join(' ')).toMatch(/bearing, which leaves it revolute/);
  });
});

describe("a real car's mechanism, pinned exactly", () => {
  const car = KITS.find((k) => k.id === 'car')!;
  const { m, joints, dropped, from, floating, why } = howItMoves(makeKit(car, 'a small hatchback', 1).part);
  it('every number is pinned exactly, because a floor here hid a fabricated answer for a whole round', () => {
    // First written as `joints >= 23` with `dropped <= 15`. Both passed, and both were measuring a lie: the graph was
    // keyed by part NAME, so 348 of the car's 605 parts were never looked at (hence "38 declared" for a car that
    // declares 56), and every joint whose other end was undeclared was silently attached to the car's own frame —
    // **56 of 56** — which is where the "46 degrees of freedom" came from. A floor cannot catch a number that is
    // wrong in the admissible direction. So these are exact: each one must be re-pinned by hand, with the ledger
    // entry that says why it moved (docs/MANNY.md #106–#108).
    expect(joints + dropped.length, 'the car declares this many joints').toBe(56);
    expect(joints, 'NONE is usable yet: no part names a link across its joint. Raising this is the next real step').toBe(0);
    expect(floating.length, 'rigid bodies no joint touches — absent joints, not motion').toBe(21);
    expect(from.length, 'moving parts').toBe(66);
  });
  it('with no usable joint it reports no mobility at all, and says why', () => {
    expect(m, 'a mechanism with no joint has no freedoms to count; printing a number anyway is the fault this guards').toBe(null);
    expect(why).toMatch(/not one usable joint/);
  });
  it('every dropped joint says what is missing, and none is silently grounded', () => {
    expect(dropped.length).toBe(56);
    for (const d of dropped) expect(d.why, `${d.part} was dropped with no reason`).toMatch(/nothing (says which way|it joins names)|both ends are the same link/);
  });
});

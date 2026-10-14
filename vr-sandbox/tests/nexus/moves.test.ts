// The motion graph, and the one thing it must never do: give a confident degrees-of-freedom number over axes it made
// up. `mobility()` was a tested solver with no caller for four rounds; the first wire into it guessed a joint's axis
// from the part's name (`/slide|rod|damper/` → up, else sideways) and printed "43 degrees of freedom" for a hatchback.
// That number is worse than none, so these pin the derivation and the REFUSAL, and ratchet the share of a real car's
// joints the graph can actually use (docs/ROUNDS.md Run 7r).
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LEAVES, TURNS_FREE, jointAxis, mechanismOf, moving, howItMoves } from '../../src/nexus/make/moves';
import { layout } from '../../src/nexus/parts/space';
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
  // the axis is asked of a PLACED node, so every case here goes through `space.ts:layout()` — the same composition
  // the renderer uses. The three faults these pin were all invisible while this file composed frames by hand.
  const node = (p: Part, under?: Partial<Part>) => {
    const root: Part = under ? { name: 'holder', ...under, parts: [p] } : { name: 'holder', parts: [p] };
    return layout(root).find((n) => n.p.name === p.name)!;
  };
  const r3 = (v: readonly number[]) => v.map((x) => +x.toFixed(3));

  it('a declared slide direction is the axis, carried out of the part own frame', () => {
    expect(r3(jointAxis(node(P('rod', { travel: { slide: { dir: [0, 1, 0], from: 0, to: 0.1 } } })), 'prismatic')!)).toEqual([0, 1, 0]);
  });
  it("a solid of revolution's axis is its own y, carried round by its rot", () => {
    expect(r3(jointAxis(node(P('race', { shape: { lathe: [[0.01, 0], [0.02, 0], [0.02, 0.01]] } as never })), 'revolute')!)).toEqual([0, 1, 0]);
    // rot [π/2, 0, 0] turns local +y onto +z: a wheel bearing lying across the car
    expect(r3(jointAxis(node(P('race', { rot: [Math.PI / 2, 0, 0], shape: { cyl: [0.02, 0.01] } })), 'revolute')!)).toEqual([0, 1, 0].map((_, i) => [0, 0, 1][i]));
  });
  it("AN ANCESTOR'S ROTATION COUNTS: a carriage under a quarter-turned gantry slides along the world axis, not its own", () => {
    // The hand-written walk ignored every ancestor `rot`, so this said [0,0,1] for an axis that moves along x — and
    // it misplaced 5 of a car's 46 movers by up to 199 mm, which are the joints' moment arms (docs/MANNY.md #110).
    const a = jointAxis(node(P('carriage', { travel: { slide: { dir: [0, 0, 1], from: 0, to: 0.3 } } }), { rot: [0, Math.PI / 2, 0] }), 'prismatic')!;
    expect(r3(a), 'turned a quarter about y, its own +z points along world +x').toEqual([1, 0, 0]);
  });
  it('the Euler order is the one three.js and space.ts use, so a part turned about two axes agrees with its drawing', () => {
    // `rot3` here composed Rz·Ry·Rx (three.js `ZYX`) while the renderer and `space.ts` use the default `XYZ`: 40°
    // apart on rot [0.6, 1.1, 0.3]. No car joint had two non-zero components, so it was a trap, not yet a wound.
    const rot: [number, number, number] = [0.6, 1.1, 0.3];
    const mine = jointAxis(node(P('shaft', { rot, shape: { cyl: [0.01, 0.1] } })), 'revolute')!;
    const theirs = new THREE.Vector3(0, 1, 0).applyEuler(new THREE.Euler(...rot));
    expect(r3(mine), 'the axis must be what the renderer draws, in the renderer\'s own order').toEqual(r3([theirs.x, theirs.y, theirs.z]));
  });
  it('a shape with no axis of its own is REFUSED, not guessed from the name', () => {
    expect(jointAxis(node(P('damper rod', { shape: { box: [0.01, 0.2, 0.01] } })), 'prismatic'), 'a box has three axes and the name is not evidence').toBe(null);
    expect(jointAxis(node(P('slide block', {})), 'prismatic'), 'no shape at all cannot say which way it acts').toBe(null);
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
  it('ONE JOINTED PART CANNOT VOUCH FOR ANOTHER THROUGH THE UNDECLARED-LINK BUCKET', () => {
    // Every part that declares no link shared the name `''`, so an unrelated jointed idler pulley silenced the rule
    // for a carriage with nothing holding it at all. Only a declared link can vouch for a part (docs/MANNY.md #112).
    const r: Part = { name: 'thing', parts: [
      P('carriage', { travel: { slide: { dir: [1, 0, 0], from: 0, to: 0.3 } }, shape: { box: [0.1, 0.05, 0.1] } }),
      P('idler pulley', { joint: 'bearing', shape: { cyl: [0.01, 0.01] } }),
    ] };
    const c = moving(r).find((x) => x.part === 'carriage')!;
    expect(c.unsaid, 'it declares travel, no link and no joint: nothing in this says what holds it').toBeTruthy();
    expect(c.unsaid).toMatch(/declares no link either/);
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

describe('a far end the part does not name is read off what it touches', () => {
  it('the NEAREST contact in another link wins, not the first', () => {
    // Taking the first touching part in another link married a right-hand CV spider to the LEFT-hand drive shaft:
    // "first" over a car is an accident of iteration order. A joint acts against what it meets where it is, so the
    // contact whose middle is closest to the part's own centre is the one taken (docs/ROUNDS.md Run 7w).
    const root: Part = { name: 'rig', parts: [
      P('near plate', { link: 'near', shape: { box: [0.04, 0.04, 0.04] }, at: [0.03, 0, 0] }),
      P('pin', { link: 'shaft', joint: 'bearing', shape: { cyl: [0.01, 0.04] }, rot: [0, 0, Math.PI / 2] }),
      P('far plate', { link: 'far', shape: { box: [0.04, 0.04, 0.04] }, at: [-0.03, 0, 0] }),
    ] };
    const { joints, bodies, from } = mechanismOf(root);
    const pin = from.find((x) => x.part === 'pin')!;
    expect(pin.farFrom, 'it names nothing it joins, so the far end comes from the drawing').toBe('touching');
    expect(joints, 'one usable joint').toHaveLength(1);
    // both plates touch the pin; the joint must land on one of them and not on the frame
    const other = bodies[joints[0]!.a === bodies.findIndex((b) => b.name === 'shaft') ? joints[0]!.b : joints[0]!.a]!;
    expect(['near', 'far'], 'the far end must be a plate, not the thing own frame').toContain(other.name);
  });
  it('a part that names its far end is still labelled as having named it', () => {
    const root: Part = { name: 'rig', parts: [
      P('block', { link: 'carriage', joint: 'bearing', joins: ['rail'], shape: { cyl: [0.02, 0.05] } }),
      P('rail', { link: 'bed' }),
    ] };
    expect(mechanismOf(root).from.find((x) => x.part === 'block')?.farFrom).toBe('declared');
  });
  it('a jointed part touching nothing in another link is still dropped, with the reason', () => {
    const root: Part = { name: 'rig', parts: [P('lonely', { link: 'a', joint: 'bearing', shape: { cyl: [0.01, 0.02] }, at: [5, 5, 5] })] };
    const { joints, dropped } = mechanismOf(root);
    expect(joints).toHaveLength(0);
    expect(dropped[0]!.why).toMatch(/drawn touching nothing in another link/);
  });
});

describe("a real car's mechanism, pinned exactly", () => {
  const car = KITS.find((k) => k.id === 'car')!;
  const { m, joints, dropped, from, floating, said, touched } = howItMoves(makeKit(car, 'a small hatchback', 1).part);
  it('every number is pinned exactly, because a floor here hid a fabricated answer for a whole round', () => {
    // A floor cannot catch a number wrong in the admissible direction: `joints >= 23` passed while the real answer
    // was 0 and the 23 were my own fallback grounding every joint to the shell (docs/MANNY.md #106-#108). Exact, and
    // moved by hand with a ledger line saying why.
    expect(joints + dropped.length, 'the car declares this many joints').toBe(56);
    expect(joints, 'usable: 0 before the far end was read off the drawing, 43 after').toBe(43);
    expect(said, 'not one of the 56 names a link across its joint — the whole reason the geometry is read').toBe(0);
    expect(touched, 'far ends the drawing supplied').toBe(53);
    expect(floating.length, 'rigid bodies no joint touches: 21 before, 3 after').toBe(3);
    expect(from.length, 'moving parts').toBe(66);
  });
  it('it reports a real mobility now, and says it in words', () => {
    expect(m, 'with 43 usable joints there is a mechanism to count').not.toBe(null);
    expect(m!.dof).toBeGreaterThan(0);
    expect(m!.says).toMatch(/degree/);
  });
  it('every dropped joint says what is missing, and none is silently grounded', () => {
    expect(dropped.length).toBe(13);
    for (const d of dropped) expect(d.why, `${d.part} was dropped with no reason`).toMatch(/nothing says which way|cannot be found|both ends are the same link/);
  });
});

// An evolver over the state's generated structure (docs/NEXUS-FROM-REALITY.md, structure 5; section 19). The state
// derives which places are not at rest and why; statics cannot say where they go. The rigid-body kernel can: it is
// given the state's places as they stand (each box where the state has it, with the mass its matter's density gives,
// and what is held at rest as the kernel's environment), steps them until they are still within the observer's
// patience, and where each comes to rest is returned to the state as a measured place, with the run's window and the
// kernel's resolution. What the kernel needs that the state does not hold (the surface between two places: how they
// slide and bounce) is the contract's declared assumption, never a default the state takes on.

import { getMaterial, type Material } from '../data/materials';
import { makePart, newDoc } from '../doc/commands';
import { seededIds } from '../doc/ids';
import { PhysicsWorld } from '../physics/world';
import { observer, type Observer } from './field';
import type { Contribution } from './journal';
import { GRAVITY, gravityAxis, placeAt } from './place';
import { rigidContract, watchStill, type Jolt, type RigidContract } from './realize';
import type { Runtime } from './runtime';
import { leaf, type Leaf } from './term';
import { contactAt } from './contact';

/** What the evolver promises beyond the kernel's own contract: the surface it assumes, since the state holds none. */
export interface EvolverContract {
  kernel: RigidContract;
  /** The kernel material whose surface (friction, restitution) every place is given; its density is never used. */
  surface: { word: string; friction: Leaf; restitution: Leaf };
}

export function evolverContract(): EvolverContract {
  const word = 'wood.douglas-fir', m = getMaterial(word);
  const assumed = (name: string, v: number) => leaf(name, v, '1', { class: 'assumed', by: 'the evolver', grounds: `the state holds no surface between places; the kernel's ${word} surface is assumed for every pair` });
  return { kernel: rigidContract(), surface: { word, friction: assumed('friction between places', m.friction), restitution: assumed('restitution between places', m.restitution) } };
}

export interface Evolution {
  /** Where each place that moved came to rest, as place contributions measured by the kernel. */
  contributions: Contribution[];
  /** The places that moved, how far and through what angle. */
  moved: { place: string; distance: number; angle: number }[];
  /** Seconds the kernel ran, and whether it was still for the observer's quiet time within its patience. */
  seconds: number;
  still: boolean;
  events: string[];
  /** What kept a place from being realized: nothing is realized from an unknown. */
  refused: { place: string; because: string }[];
}

type V3 = [number, number, number];
type Q = [number, number, number, number];

/**
 * Evolve the state's places in the rigid-body kernel until still. Every place not held is given to the kernel, at
 * rest or not, since what moves can strike what stands; what is held is the kernel's environment. A place whose
 * numbers or matter the state does not hold refuses the evolution: it cannot be realized from an unknown.
 */
export function evolve(J: Jolt, rt: Runtime, obs: Observer = observer('the evolver'), contract = evolverContract()): Evolution {
  const c = contract.kernel;
  const num = (a: string) => rt.binding(a)?.value ?? null;
  const refused: Evolution['refused'] = [];
  const g = num(GRAVITY), d = [0, 1, 2].map((j) => num(gravityAxis(j)));
  if (g === null || d.some((x) => x === null)) return { contributions: [], moved: [], seconds: 0, still: false, events: [], refused: [{ place: 'the domain', because: 'its gravity is not known' }] };
  const box = (p: string) => {
    const centre = [0, 1, 2].map((j) => num(placeAt.centre(p, j))), turn = [0, 1, 2, 3].map((j) => num(placeAt.turn(p, j))), half = [0, 1, 2].map((i) => num(placeAt.half(p, i)));
    return [...centre, ...turn, ...half].some((x) => x === null) ? null : { centre: centre as V3, turn: turn as Q, half: half as V3 };
  };
  const doc = newDoc('nexus evolution', '2026-10-04T00:00:00Z');
  const world = new PhysicsWorld(J, { ...doc.sim, gravity: d.map((x) => x! * g) as V3, airDrag: false });
  const ids = seededIds(1);
  const base = getMaterial(contract.surface.word);
  const surfaceOf = (density: number): Material => ({ ...base, density, friction: contract.surface.friction.value!, restitution: contract.surface.restitution.value! });
  // what is held is the kernel's environment
  const held = rt.placeIds().filter((p) => rt.isHeld(p));
  const envBoxes = held.map((p) => box(p)).filter((b): b is NonNullable<ReturnType<typeof box>> => !!b).map((b) => ({ half: b.half, pose: { p: b.centre, q: b.turn }, material: contract.surface.word }));
  world.apply({ op: 'environment', boxes: envBoxes, materials: { [contract.surface.word]: surfaceOf(base.density) } });
  const bodies: { place: string; id: string; from: NonNullable<ReturnType<typeof box>> }[] = [];
  for (const p of rt.placeIds().filter((x) => !rt.isHeld(x))) {
    const b = box(p), rho = num(placeAt.density(p));
    if (!b) { refused.push({ place: p, because: 'its centre, turn or extents are not all known' }); continue; }
    if (rho === null) { refused.push({ place: p, because: 'the density of its matter is not known, so neither is its mass' }); continue; }
    const part = makePart({ kind: c.words.blockKind, material: contract.surface.word, name: p, params: { x: 2 * b.half[0], y: 2 * b.half[1], z: 2 * b.half[2] }, pose: { p: b.centre, q: b.turn } }, ids);
    const r = world.apply({ op: 'upsertPart', part, material: surfaceOf(rho), keepLivePose: false });
    if (r) { refused.push({ place: p, because: `the kernel refused it: ${r.reason}` }); continue; }
    bodies.push({ place: p, id: part.id, from: b });
  }
  if (refused.length) { world.destroy(); return { contributions: [], moved: [], seconds: 0, still: false, events: [], refused }; }
  const w = watchStill(world, c, obs, bodies.map((b) => b.id));
  const res = c.positionResolution.value!;
  const window = `${(w.ran * w.tick).toFixed(3)} s of the kernel at ${w.tick.toFixed(5)} s ticks, ${w.wasStill ? 'still' : 'not still'} for ${w.quietSeconds.toFixed(3)} s`;
  const contributions: Contribution[] = [], moved: Evolution['moved'] = [];
  for (const b of bodies) {
    const pose = world.livePose(b.id)!;
    const p = pose.p as V3, q = pose.q as Q;
    const distance = Math.hypot(...p.map((x, j) => x - b.from.centre[j]!));
    // the angle between the turns, and the arc it sweeps at the place's farthest corner
    const dotQ = Math.min(1, Math.abs(q.reduce((s, x, j) => s + x * b.from.turn[j]!, 0))), angle = 2 * Math.acos(dotQ);
    const reach = Math.hypot(...b.from.half);
    if (distance <= res && angle * reach <= res) continue; // still where the state has it, within what the kernel resolves
    moved.push({ place: b.place, distance, angle });
    const o = { class: 'measured' as const, source: `${c.name}: where it came to rest`, window };
    contributions.push({
      kind: 'place', id: b.place,
      centre: p.map((x, j) => leaf(`centre ${'xyz'[j]}`, x, 'm', o, res)) as [Leaf, Leaf, Leaf],
      turn: q.map((x, j) => leaf(`turn ${'xyzw'[j]}`, x, '1', o)) as [Leaf, Leaf, Leaf, Leaf],
      // a rigid body keeps its extents: the same leaves, so nothing that reads only them is evaluated again
      half: [0, 1, 2].map((i) => rt.leafAt(placeAt.half(b.place, i))!) as [Leaf, Leaf, Leaf],
    });
  }
  world.destroy();
  return { contributions, moved, seconds: w.ran * w.tick, still: w.wasStill, events: w.events, refused };
}

/** The places the state derives as not at rest: what an evolution is for. */
export const notAtRest = (rt: Runtime) => rt.placeIds().filter((p) => rt.binding(contactAt.rests(p))?.value === 0);

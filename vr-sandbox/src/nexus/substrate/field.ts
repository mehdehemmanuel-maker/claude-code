// Domains, fields and the observer. A frame is a declaration, never a fact: every coordinate is derived from its
// origin leaf. Gravity is a sourced leaf. The ground is a field query. The observer's window is what makes a body
// rigid or not: a body is rigid at the window when sound crosses it well within one tick, and that bound is a
// named assumption.

import { TICK } from '../../physics/protocol';
import { STANDARD_GRAVITY } from '../../data/materials';
import { BAR_WAVE_SPEED } from '../book';
import { evaluate, ofLeaf, type Derivation, type Window } from './evaluate';
import { apply } from './law';
import { div, le, leaf, variable, type Term, type Var } from './term';
import { domain, field, sample, type Field } from './domain';

export interface Frame {
  /** Who declared it and how its axes are laid. */
  declaration: string;
  by: string;
  /** The origin, as a leaf on each axis: every coordinate in the frame is derived from these. */
  origin: { x: Derivation; y: Derivation; z: Derivation };
  hash: string;
}

/** A frame: x along the span, y opposite gravity, z across; origin on the ground midway between the supports. */
export function declareFrame(by: string, declaration: string): Frame {
  const o = (axis: string) => ofLeaf(leaf(`origin ${axis} of the frame: ${declaration}`, 0, 'm', { class: 'configuration', source: `declared frame by ${by}`, by }));
  const origin = { x: o('x'), y: o('y'), z: o('z') };
  return { declaration, by, origin, hash: origin.x.hash };
}

/** Standard gravity: a fixed conventional constant, along −y of a frame declared with y opposite gravity. */
export const gravity = (): Derivation => ofLeaf(leaf('standard gravity', STANDARD_GRAVITY, 'm/s^2', { class: 'fundamental', source: 'ISO 80000-3: standard acceleration of free fall, 9.80665 m/s² (a defined conventional value)' }));

export interface Ground {
  /** The ground as a field over x and z in the frame. */
  field: Field;
  /** The ground's height at (x, z): a field query, each answer a record citing the field. */
  height(x: Derivation, z: Derivation): Derivation;
}

/** A ground declared as a term over the frame's x and z (its leaves given by whoever declares it), with who says so. */
export function groundField(frame: Frame, by: string, grounds: string, make: (x: Var, z: Var, y0: Var) => Term, env: Record<string, Derivation> = {}): Ground {
  const x = variable('x', 'm', 'coordinate x'), z = variable('z', 'm', 'coordinate z'), y0 = variable('y0', 'm', 'frame origin y');
  const term = make(x, z, y0);
  const f = field(`ground height (${grounds}, by ${by})`, 'm', domain(frame, { x, z }), { ...env, y0: frame.origin.y }, [], () => term);
  return { field: f, height: (xx, zz) => sample(f, { x: xx, z: zz }, 'ground height') };
}

/** A flat ground at the frame's y origin. */
export const flatGround = (frame: Frame, by: string, grounds: string): Ground => groundField(frame, by, grounds, (_x, _z, y0) => y0);

export interface Observer {
  window: Window;
  tick: Derivation;
  /** How long a world must be still before it is read: the stand's rule. */
  quiet: Derivation;
  /** The longest the observer waits for stillness. */
  patience: Derivation;
}

export function observer(instrument: string): Observer {
  const tick = ofLeaf(leaf('tick of the rigid-body kernel', TICK, 's', { class: 'configuration', source: 'physics/protocol.ts TICK: the kernel steps at 90 Hz' }));
  const quiet = ofLeaf(leaf('still for', 0.3, 's', { class: 'configuration', source: 'the stand\'s rule (kept physics/stand.ts): a world at rest stays at rest; still is under 1 mm/s and 0.01 rad/s for 0.3 s', grounds: 'what a world at rest can change in the seconds left is nothing but the time it takes' }));
  const patience = ofLeaf(leaf('longest watch', 4, 's', { class: 'configuration', source: 'the observer: four seconds covers settling of a resting load with margin on the stand\'s runs' }));
  return { window: { tick: TICK, seconds: 0, instrument }, tick, quiet, patience };
}

/** The bound on sound crossing over tick for a body the observer may treat as rigid: an assumption with grounds. */
export const RIGID_BOUND = leaf('rigid bound', 0.1, '1', { class: 'assumed', by: 'the restart', grounds: 'a body whose longest sound crossing is under a tenth of a tick has no internal wave the window can resolve: it is rigid to this observer; the tenth is a judgment, named here so it can be challenged' });

export interface RigidDomain { crossing: Derivation; ratio: Derivation; holds: Derivation; rigid: boolean | null }

/** Whether a body of modulus E, density ρ and longest extent L is rigid at the observer's window. */
export function rigidDomain(E: Derivation, rho: Derivation, L: Derivation, obs: Observer): RigidDomain {
  const c = apply(BAR_WAVE_SPEED, { E, rho }, 'wave speed in the body');
  const Lv = variable('L', 'm', 'longest extent'), cv = variable('c', 'm/s', 'wave speed'), tv = variable('tick', 's', 'tick'), xv = variable('x', 's', 'crossing');
  const crossing = evaluate('sound crossing of the body', div(Lv, cv), { L, c }, { unit: 's', law: 'definition: crossing time = extent / wave speed' });
  const ratio = evaluate('crossing over tick', div(xv, tv), { x: crossing, tick: obs.tick }, { unit: '1', law: 'definition: the window ratio' });
  const rv = variable('r', '1', 'ratio');
  const holds = evaluate('rigid at this window', le(rv, RIGID_BOUND), { r: ratio }, { unit: '1', law: RIGID_BOUND.hash });
  return { crossing, ratio, holds, rigid: holds.value === null ? null : holds.value !== 0 };
}

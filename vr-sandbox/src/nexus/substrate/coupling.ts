// Couplings: shared boundary variables between two bodies, with conservation. A resting contact shares a reaction
// force and a boundary height; its placement equation is the coupling's solution, so a coordinate is a derivation
// and never a number written by hand. The ledger is the conservation check across the couplings.

import { evaluate, type Derivation } from '../lang/evaluate';
import type { Frame } from './field';
import { add, div, k, min, sub, variable, type Term } from '../lang/term';

/** A rectangular body in the semantics: its extents and its material leaves; its centre once placed. */
export interface Prism {
  name: string;
  extents: { x: Derivation; y: Derivation; z: Derivation };
  material: string;
  density: Derivation;
  centre?: { x: Derivation; y: Derivation; z: Derivation };
}

export interface RestCoupling {
  kind: 'rest';
  above: string;
  below: string;
  /** The gap the realization asks for between faces placed in contact (its contract). */
  clearance: Derivation;
  /** The height of the shared boundary (the lower body's top face) and the upper body's centre from it. */
  boundary: Derivation;
  centreY: Derivation;
  /** The force the boundary carries, when the statics bind it. */
  reaction?: Derivation;
}

const Y = variable('y', 'm'), H = variable('h', 'm', 'extent'), C = variable('c', 'm', 'clearance'), O = variable('o', 'm', 'origin');

/** The top face of a placed body: centre + half its height. */
export const topOf = (p: Prism): Derivation => {
  if (!p.centre) throw new Error(`${p.name} is not placed`);
  return evaluate(`top of ${p.name}`, add(Y, div(H, k(2))), { y: p.centre.y, h: p.extents.y }, { unit: 'm', law: 'definition: top = centre + extent / 2' });
};

/** Place `above` resting on a boundary at `boundary` height: its centre is the boundary, the clearance and half its height. */
export function restOn(above: Prism, below: Prism, boundary: Derivation, clearance: Derivation, x: Derivation, z: Derivation): RestCoupling {
  const centreY = evaluate(`height of ${above.name} resting on ${below.name}`, add(add(Y, C), div(H, k(2))), { y: boundary, c: clearance, h: above.extents.y }, { unit: 'm', law: 'coupling: rest = boundary + clearance + half the height' });
  above.centre = { x, y: centreY, z };
  return { kind: 'rest', above: above.name, below: below.name, clearance, boundary, centreY };
}

/** The quantities a rest coupling carries for its stability: the resting body's centre of mass above the boundary and the half-extents of the contact. */
export interface RestStability { hcm: Derivation; halfX: Derivation; halfZ: Derivation }

/** A uniform prism's centre of mass is at half its height; the contact is the lesser of the two bodies' extents on each axis. */
export function restStability(above: Prism, below: Prism): RestStability {
  const hcm = evaluate(`centre of mass of ${above.name} above its base`, div(H, k(2)), { h: above.extents.y }, { unit: 'm', law: 'a uniform prism\'s centre of mass lies at half its height' });
  const A = variable('a', 'm', 'extent above'), B = variable('b', 'm', 'extent below');
  const half = (axis: 'x' | 'z') => evaluate(`half the contact of ${above.name} on ${below.name} along ${axis}`, div(min(A, B), k(2)), { a: above.extents[axis], b: below.extents[axis] }, { unit: 'm', law: 'the contact is the lesser of the two extents on the axis' });
  return { hcm, halfX: half('x'), halfZ: half('z') };
}

/**
 * A post cut to its own ground: standing at (x, z), it reaches from the ground there up to `top`, so its height is
 * a coupling solution of the ground field and the height it must reach.
 */
export function postTo(post: Prism, groundAt: Derivation, top: Derivation, x: Derivation, z: Derivation): { extent: Derivation; centreY: Derivation } {
  const extent = evaluate(`height of ${post.name}: from its ground to the top it reaches`, sub(variable('top', 'm'), variable('g', 'm', 'ground')), { top, g: groundAt }, { unit: 'm', law: 'coupling: a post reaches from the ground under it to the boundary it carries' });
  post.extents = { ...post.extents, y: extent };
  const centreY = standOn(post, groundAt, x, z);
  return { extent, centreY };
}

/** Place a body standing on the ground at (x, z). */
export function standOn(body: Prism, ground: Derivation, x: Derivation, z: Derivation): Derivation {
  const centreY = evaluate(`height of ${body.name} standing on the ground`, add(Y, div(H, k(2))), { y: ground, h: body.extents.y }, { unit: 'm', law: 'coupling: stand = ground + half the height' });
  body.centre = { x, y: centreY, z };
  return centreY;
}

/** A coordinate in the frame: the origin plus an offset term over named records. */
export function coordinate(name: string, frame: Frame, axis: 'x' | 'y' | 'z', offset: Term, env: Record<string, Derivation>): Derivation {
  return evaluate(name, add(O, offset), { ...env, o: frame.origin[axis] }, { unit: 'm', law: `coordinate in the declared frame (${frame.declaration})` });
}

/** The ledger: what the couplings carry against what they must: the residual, which conservation says is zero. */
export function ledger(name: string, carried: Derivation[], must: Derivation): { residual: Derivation; balanced: boolean | null } {
  let sum: Term = variable('r0', 'N');
  const env: Record<string, Derivation> = { r0: carried[0]! };
  carried.slice(1).forEach((r, i) => { sum = add(sum, variable(`r${i + 1}`, 'N')); env[`r${i + 1}`] = r; });
  const residual = evaluate(name, sub(sum, variable('w', 'N')), { ...env, w: must }, { unit: 'N', law: 'conservation: the boundaries carry exactly the weight' });
  const tol = Math.max(1e-9 * Math.abs(must.value ?? 1), residual.uncertainty ?? 0);
  return { residual, balanced: residual.value === null ? null : Math.abs(residual.value) <= tol };
}

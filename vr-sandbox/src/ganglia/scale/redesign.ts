// Re-engineering a contract at another scale. A contract is a set of quantities with dimensions (joules stored, watts
// released, a mass limit, a temperature window) and an environment (a height, a radius, a speed); under a similarity
// each scales by its own exponent, and the scaled contract is engineered again through the manifold language. What
// comes back is compared with what was engineered before: whether the same mechanism wins, by how much the mass moved
// against λ³, which members the smaller or larger world refuses and why. Nothing is scaled by assumption: the
// exponents are the transform's, and the answer is the engineer's.
import { engineer, type Engineered, type Candidate } from '../manifold/engineer';
import type { Contract, Environment } from '../manifold/language';
import { exponentOf, type ScaleTransform } from './transform';

export interface Redesign {
  transform: ScaleTransform;
  lambda: number;
  before: Engineered;
  after: Engineered;
  contract: Contract;
  env: Environment;
  /** Each contract quantity: its exponent and how it moved. */
  moved: { name: string; unit: string; exponent: number; from: number; to: number }[];
  /** The mechanism that won before and after. */
  chosen: { before: string | null; after: string | null; same: boolean };
  /** The mass of the chosen member before and after, against what λ³ would give. */
  mass: { before: number | null; after: number | null; ratio: number | null; cube: number };
  /** Mechanisms that were candidates before and are refused after, with the refusal. */
  lost: { mechanism: string; why: string }[];
  /** Mechanisms refused before and candidates after. */
  gained: string[];
  says: string;
}

const mid = (m: [number, number]) => Math.sqrt(Math.max(m[0], 1e-9) * Math.max(m[1], 1e-9));
const nameOf = (c: Candidate | null) => (c ? c.store.name : null);

/** The contract and the environment at λ under a similarity: each quantity by its own exponent. */
export function scaleContract(contract: Contract, env: Environment, t: ScaleTransform, lambda: number): { contract: Contract; env: Environment; moved: Redesign['moved'] } {
  const moved: Redesign['moved'] = [];
  const scale = (name: string, unit: string, v: number | undefined) => {
    if (v === undefined) return undefined;
    const e = exponentOf(t, { unit, name });
    const to = v * Math.pow(lambda, e);
    moved.push({ name, unit, exponent: e, from: v, to });
    return to;
  };
  const c: Contract = { ...contract };
  c.stores = scale('energy stored', 'J', contract.stores);
  c.releases = scale('power released', 'W', contract.releases);
  c.absorbs = scale('power absorbed', 'W', contract.absorbs);
  c.massMax = scale('mass limit', 'kg', contract.massMax);
  // a temperature window is the environment's: it does not scale with the thing
  const e: Environment = { ...env, height: scale('height', 'm', env.height)!, radiusMax: scale('radius', 'm', env.radiusMax)! };
  if (env.speedMax !== undefined) e.speedMax = scale('speed', 'm/s', env.speedMax);
  return { contract: c, env: e, moved };
}

/** The same want, λ times larger or smaller, engineered again and compared. */
export function redesign(before: Engineered, t: ScaleTransform, lambda: number): Redesign {
  const { contract, env, moved } = scaleContract(before.contract, before.env, t, lambda);
  const after = engineer(contract, env);
  const chosen = { before: nameOf(before.chosen), after: nameOf(after.chosen), same: before.chosen?.store.id === after.chosen?.store.id };
  const mb = before.chosen ? mid(before.chosen.mass) : null, ma = after.chosen ? mid(after.chosen.mass) : null;
  const cube = Math.pow(lambda, 3);
  const mass = { before: mb, after: ma, ratio: mb && ma ? ma / mb : null, cube };
  const beforeIds = new Set(before.candidates.map((c) => c.store.id)), afterIds = new Set(after.candidates.map((c) => c.store.id));
  const lost = before.candidates.filter((c) => !afterIds.has(c.store.id)).map((c) => ({ mechanism: c.store.name, why: after.refused.find((r) => r.store.id === c.store.id)?.step.why ?? 'no member of its family meets the scaled contract' }));
  const gained = after.candidates.filter((c) => !beforeIds.has(c.store.id)).map((c) => c.store.name);
  const fmt = (x: number) => (Math.abs(x) >= 1000 || Math.abs(x) < 0.01 ? x.toExponential(2) : +x.toPrecision(3)).toString();
  const movedSays = moved.map((m) => `${m.name} ${fmt(m.from)} → ${fmt(m.to)} ${m.unit} (λ^${+m.exponent.toFixed(2)})`).join(', ');
  const massSays = mass.ratio !== null ? `the chosen member's mass goes ×${fmt(mass.ratio)} where λ³ is ×${fmt(cube)}${mass.ratio > cube * 1.5 ? ': it does not shrink as a scaled copy would, because its parts are stocked at their own sizes' : mass.ratio < cube / 1.5 ? ': it shrinks more than a scaled copy, the stocked part being lighter than the want' : ': as a scaled copy would'}` : 'no member was chosen on both sides';
  const says = `${lambda > 1 ? `${fmt(lambda)} times bigger` : `${fmt(1 / lambda)} times smaller`} under ${t.name}: ${movedSays}. ${chosen.same ? `${chosen.after ?? 'nothing'} still wins` : `${chosen.before ?? 'nothing'} won before; now ${chosen.after ?? 'nothing survives'}`}; ${massSays}. ${lost.length ? `Lost: ${lost.map((l) => `${l.mechanism} (${l.why})`).join('; ')}. ` : ''}${gained.length ? `Gained: ${gained.join(', ')}. ` : ''}${after.candidates.length} of ${after.candidates.length + after.refused.length} mechanisms meet the scaled want.`;
  return { transform: t, lambda, before, after, contract, env, moved, chosen, mass, lost, gained, says };
}

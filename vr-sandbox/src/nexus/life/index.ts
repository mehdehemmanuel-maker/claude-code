// Life, settled: every molecule, part, cell, tissue, organ and organism of ./molecules.ts, ./cells.ts, ./human.ts,
// ./brain.ts and ./organisms.ts, with every mass worked out. A molecule weighs its formula's weight (or its measured
// one, for a protein); an entry weighs what its table says, or the sum of what is in it ("="); what is said as a count
// of a thing that weighs something is that many times its weight, and the rest of an entry ("id:*") is what its other
// parts leave of its weight. What does not add up (a rest below nothing, a part that weighs nothing) is a fault, listed.

import { ELEMENTS } from '../elements';
import { BRAIN_ENTRIES } from './brain';
import { CELLS, MUSCLE, PARTS } from './cells';
import type { LifeEntry, Molecule } from './core';
import { GLAND_CELLS, GLANDS } from './glands';
import { HUMAN } from './human';
import { MOLECULES } from './molecules';
import { ORGANISMS } from './organisms';

/** grams a dalton. */
export const AMU = 1.66053907e-24;
export const LIFE: LifeEntry[] = [...PARTS, ...CELLS, ...MUSCLE, ...HUMAN, ...GLANDS, ...GLAND_CELLS, ...BRAIN_ENTRIES, ...ORGANISMS];
const byId = new Map<string, LifeEntry>(LIFE.map((e) => [e.id, e]));
const mols = new Map<string, Molecule>(MOLECULES.map((m) => [m.id, m]));
/** A formula's weight, daltons. */
export function weightOf(f: string): number { let w = 0; for (const m of f.matchAll(/([A-Z][a-z]?)(\d*\.?\d*)/g)) { if (!m[1]) continue; const el = ELEMENTS[m[1]]; if (!el) throw new Error(`no element ${m[1]} in ${f}`); w += el.w * (m[2] ? Number(m[2]) : 1); } return w; }
/** A molecule's weight, daltons: measured, else its formula's; a blend with neither has none (it is said by mass). */
export const daltonsOf = (m: Molecule): number | null => m.da ?? ('formula' in m.spec ? weightOf(m.spec.formula) : null);
/** What does not add up. */
export const LIFE_FAULTS: string[] = [];
const grams = new Map<string, number>();
/** What one of a thing weighs, g: an entry, a molecule, or nothing known (a material said only by mass). */
export function gramsOf(id: string, seen = new Set<string>()): number | null {
  const kept = grams.get(id); if (kept !== undefined) return kept;
  const m = mols.get(id); if (m) { const d = daltonsOf(m); return d === null ? null : d * AMU; }
  const e = byId.get(id); if (!e) return null;
  if (seen.has(id)) { LIFE_FAULTS.push(`${id} is inside itself`); return null; }
  const s2 = new Set(seen).add(id);
  let sum = 0;
  for (const c of e.of) {
    if (c.id === e.rest) continue;
    if (e.mass[c.id] !== undefined) { sum += e.mass[c.id]!; continue; }
    const g = gramsOf(c.id, s2); if (g === null) { LIFE_FAULTS.push(`${id}: ${c.id} weighs nothing known`); continue; }
    sum += c.n * g;
  }
  let g = e.g;
  if (Number.isNaN(g)) g = sum;
  else if (e.rest) { const r = g - sum; if (r < 0) LIFE_FAULTS.push(`${id}: its parts weigh ${sum.toPrecision(3)} g, more than its ${g.toPrecision(3)} g`); e.mass[e.rest] = Math.max(0, r); }
  else if (Math.abs(sum - g) > 0.02 * g) LIFE_FAULTS.push(`${id}: its parts weigh ${sum.toPrecision(3)} g, not its ${g.toPrecision(3)} g`);
  grams.set(id, g);
  return g;
}
for (const e of LIFE) { e.g = gramsOf(e.id) ?? e.g; }
// a part said by mass whose one weighs something is that many of it
for (const e of LIFE) for (const c of e.of) { const m = e.mass[c.id]; if (m === undefined) continue; const one = gramsOf(c.id); if (one && one > 0 && byId.has(c.id)) c.n = +(m / one).toPrecision(4); }
for (const e of LIFE) for (const c of e.of) if (!byId.has(c.id) && !mols.has(c.id) && e.mass[c.id] === undefined && !['water'].includes(c.id)) { /* a material of the inventory by count: checked there */ }
export { MOLECULES };

// OWNS: what this world does NOT account for — its holes, its dead ends, and the laws it could apply and does not.
//
// Named `unaccounted`, not `ledger`: substrate/coupling.ts has owned the word `ledger` since it was written, where it
// means the conservation residual across a set of couplings. The tidy ratchet caught the clash, which is the system
// working — two owners of one word is how a reader ends up reading the wrong one.
//
// WHY. `Runtime.gaps()` says what went wrong in an evaluation — a relation waiting, a law refused, a constraint
// unmet. Every one of those is about a computation that started. None of them can say the thing that actually
// bites, which is that a phenomenon was never represented at all. A world with no thermal law in it does not
// report a thermal gap: it reports nothing, runs clean, and looks finished.
//
// That is not a hypothetical. `parts/drive.ts` computes a gear mesh's friction loss as watts and then DROPS the
// number: nothing reads it, no temperature rises, and the drive reports "it will cook" as a string rather than a
// kelvin. The gate passes 2,225 tests over it. The fault was found by hand, written into CLAUDE.md, and CLAUDE.md
// is where findings go to be forgotten — so it becomes a command instead.
//
// Three findings, in rising order of how hard they are to see by reading the code:
//
//   HOLE       an address something reads that nothing produces. The world needs a number it has no way to get.
//   DEAD END   an address something produces that nothing reads. The world computes a number and drops it.
//   UNAPPLIED  a law in the book whose every input is bindable here, which nothing instances. The world HAS what
//              it takes to account for a phenomenon and does not. This is the one no amount of reading finds,
//              and the one the essay behind this round could only state as a caveat.
//
// A dead end is not always a fault — an answer somebody asked for is produced and read by nobody, and that is what
// an answer is. So a dead end can be `asked`, and the ledger says which.

import { BOOK } from '../book';
import type { Law } from '../lang/law';
import { dimOf, dimText, sameDim } from '../lang/dimension';
import type { Address } from './journal';
import type { Runtime } from './runtime';

export type Finding =
  /** Something reads this and nothing produces it: the world needs a number it cannot get. */
  | { kind: 'hole'; at: Address; unit?: string; wantedBy: { id: string; name: string }[]; says: string }
  /** Something produces this and nothing reads it: the world computes a number and drops it. */
  | { kind: 'dead end'; at: Address; unit?: string; from: { id: string; name: string }[]; asked: boolean; says: string }
  /** Every input of this law is bindable here and nothing instances it: a phenomenon the world could account
   *  for and does not. `binds` names the address each of its ports would take.
   *
   *  THIS FINDING IS A SUGGESTION, NOT A VERDICT, and the difference matters. Binding is decided by dimension and
   *  by a shared word in the names, which is enough to be useful and not enough to be right: "specific gravity"
   *  and "the direction of gravity" share a word and nothing else, so a lead-acid cell's voltage law can still be
   *  offered over a steel cube. Read a finding here as "look at this", never as "this is missing". The two
   *  findings above it are facts about the wiring; this one is a prompt. */
  | { kind: 'unapplied'; law: string; name: string; statement: string; binds: Record<string, Address>; out: string; says: string };

export interface Unaccounted {
  findings: Finding[];
  /** How many addresses the world mentions at all, so a count of holes can be read against something. */
  addresses: number;
  relations: number;
  says: string;
}

/** Addresses the ledger should not call dead ends because someone asked for them: a want, a reported answer. */
export interface Asked { addresses?: Iterable<Address>; matches?: RegExp }

/** What a law's ports would bind to here, if every one of them can bind. A port binds to an address whose unit
 *  has the SAME DIMENSION — not the same spelling, because N·m and J are the same dimension and a law written in
 *  one must still find an address written in the other. Null where any port has nowhere to come from, which is
 *  the common case and the reason this is cheap enough to run over 252 laws. */
export function wouldBind(rt: Runtime, l: Law, at: Address[]): Record<string, Address> | null {
  const byDim = new Map<string, Address[]>();
  for (const a of at) {
    const u = rt.unitAt(a);
    if (!u) continue;
    let d: string;
    try { d = dimText(dimOf(u)); } catch { continue; }
    (byDim.get(d) ?? byDim.set(d, []).get(d)!).push(a);
  }
  const binds: Record<string, Address> = {};
  for (const p of l.inputs) {
    let want: string;
    try { want = dimText(dimOf(p.unit)); } catch { return null; }
    const hits = byDim.get(want);
    if (!hits?.length) return null;
    // THE DIMENSION IS NOT ENOUGH, and the first run proved it: over a steel cube this named Coulomb friction as
    // applicable with `mu ← the domain/direction of gravity x`, because a friction coefficient and a direction
    // cosine are both dimensionless, and `r ← block/centre x`, because a radius and a coordinate are both lengths.
    // Dimensionally valid, semantically nonsense, and a census full of nonsense is worse than none — it trains the
    // reader to skim. So a port must ALSO share a word with the address's own name. That keeps `A ← area of its
    // section`, `m ← mass` and `a ← gravity`, and drops the two above.
    const key = `${p.name} ${p.sym}`.toLowerCase();
    // DISTINCT PORTS WANT DISTINCT ADDRESSES. Without this, "mass of a rectangular prism" bound x, y and z all to
    // half-extent along axis 1, and "moles in a mass" bound both a mass and a MOLAR mass to the same kilogram —
    // each a law reported as applicable on the strength of reading one number three times.
    const taken = new Set(Object.values(binds));
    const free = hits.filter((h) => !taken.has(h));
    const pool = free.length ? free : hits;
    const best = pool.slice().sort((x, y) => score(y, key) - score(x, key))[0]!;
    if (score(best, key) === 0 || (!free.length && l.inputs.length > 1)) return null;
    binds[p.sym] = best;
  }
  return binds;
}
/** How well an address's own name answers to a port's. Words of three letters and up must appear in it; a short
 *  word or a bare symbol (`m`, `A`, `rho`) counts only as a whole word, so `m` matches "mass" by its name rather
 *  than by being a letter inside it. */
const score = (a: Address, key: string): number => {
  const q = a.slice(a.indexOf('/') + 1).toLowerCase(), words = new Set(q.split(/[^a-z]+/));
  let n = 0;
  for (const w of key.split(/[^a-z]+/).filter(Boolean)) {
    if (w.length > 2 ? q.includes(w) : words.has(w)) n += Math.max(w.length, 1);
  }
  return n;
};

/** WHAT THIS WORLD DOES NOT ACCOUNT FOR. What it reads and cannot get, what it works out and drops, and which of the book's laws it
 *  has the inputs for and never applies. */
export function unaccounted(rt: Runtime, o: { asked?: Asked; laws?: readonly Law[]; unapplied?: boolean } = {}): Unaccounted {
  const findings: Finding[] = [];
  const at = rt.mentioned();
  const askedSet = new Set(o.asked?.addresses ?? []);
  const isAsked = (a: Address) => askedSet.has(a) || (o.asked?.matches?.test(a) ?? false);
  const named = (ids: string[]) => ids.map((id) => ({ id, name: rt.relationAt(id)?.name ?? id }));

  for (const a of at) {
    const reads = rt.readersOf(a), writes = rt.producersOf(a), isLeaf = rt.leafAt(a) !== undefined;
    if (reads.length && !writes.length && !isLeaf) {
      findings.push({ kind: 'hole', at: a, unit: rt.unitAt(a), wantedBy: named(reads),
        says: `nothing produces ${a}, and ${reads.length === 1 ? 'one relation reads it' : `${reads.length} relations read it`}: the world needs a number it has no way to get` });
    }
    if (writes.length && !reads.length) {
      const asked = isAsked(a);
      findings.push({ kind: 'dead end', at: a, unit: rt.unitAt(a), from: named(writes), asked,
        says: asked
          ? `${a} is worked out and read by nothing, which is what an answer is — somebody asked for this one`
          : `${a} is worked out and nothing reads it: the world computes this and drops it. Either something should consume it, or it should not be computed` });
    }
  }

  // THE EXPENSIVE, VALUABLE ONE. Which of the book's laws could already run here?
  if (o.unapplied !== false) {
    const applied = new Set(rt.relationIds().map((id) => rt.relationAt(id)?.law).filter(Boolean) as string[]);
    for (const l of o.laws ?? BOOK) {
      if (applied.has(l.hash) || applied.has(l.id)) continue;
      const binds = wouldBind(rt, l, at);
      if (!binds) continue;
      findings.push({ kind: 'unapplied', law: l.id, name: l.name, statement: l.statement, binds, out: l.output.unit,
        says: `${l.name} would run here: every input it needs is in this world (${Object.entries(binds).map(([s, a]) => `${s} ← ${a}`).join(', ')}) and nothing applies it. ${l.statement}` });
    }
  }

  const n = (k: Finding['kind']) => findings.filter((f) => f.kind === k).length;
  const live = findings.filter((f) => f.kind === 'dead end' && !f.asked).length;
  return { findings, addresses: at.length, relations: rt.relationIds().length,
    says: `${at.length} addresses over ${rt.relationIds().length} relations: ${n('hole')} ${n('hole') === 1 ? 'hole' : 'holes'}, ${live} dead ${live === 1 ? 'end' : 'ends'}, ${n('unapplied')} unapplied ${n('unapplied') === 1 ? 'law' : 'laws'}` };
}

/** The findings as lines to read, worst first: a hole stops the world, a dead end loses what it worked out, an
 *  unapplied law is a phenomenon it could have accounted for. */
export function unaccountedLines(l: Unaccounted): string[] {
  const out = [l.says, ''];
  const order: Finding['kind'][] = ['hole', 'dead end', 'unapplied'];
  for (const k of order) {
    const of = l.findings.filter((f) => f.kind === k && !(f.kind === 'dead end' && f.asked));
    if (!of.length) continue;
    out.push(`${k.toUpperCase()} (${of.length})`);
    for (const f of of) out.push(`  ${f.says}`);
    out.push('');
  }
  const asked = l.findings.filter((f) => f.kind === 'dead end' && f.asked);
  if (asked.length) out.push(`(${asked.length} more worked out and read by nothing, each one something was asked for.)`, '');
  if (l.findings.every((f) => f.kind === 'dead end' && f.asked)) out.push('Nothing is read that cannot be got, nothing worked out is dropped, and every law whose inputs are here is applied.');
  return out;
}

/** Whether the dimension of a unit is one this world has an address for at all — the crudest form of "is this
 *  phenomenon represented": no address anywhere carries a temperature, so no law about temperature can bind. */
export function represents(rt: Runtime, unit: string): boolean {
  const want = dimOf(unit);
  return rt.mentioned().some((a) => { const u = rt.unitAt(a); if (!u) return false; try { return sameDim(dimOf(u), want); } catch { return false; } });
}

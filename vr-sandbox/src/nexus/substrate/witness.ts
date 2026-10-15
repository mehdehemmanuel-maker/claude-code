// THE UNIVERSAL LAW OBSERVATION TABLE: for every law, the physical thing you can watch it on.
//
// The user's demand (2026-10-15): "all of these things need to be observably connected to physical things in the
// environment — create a universal law observation table where every law is represented by something physical or
// maybe just two things — also keep upgrading it and branching".
//
// NOT ASSERTED, DERIVED. Nothing here says "Newton's second law is about a hammer" because someone typed that. A law
// is observably connected to a thing when the thing HAS the quantities the law reads — and `know` in
// `substrate/derive.ts` already answers that, resolving a quantity of a part down through its sub-parts to its
// materials. So the table is computed from the inventory and the book, and it UPGRADES ITSELF: a part added to the
// inventory or a law added to the book changes the table with nothing rewritten.
//
// WHAT A WITNESS ACTUALLY IS, which the first attempt got wrong. Measured over the book: a law whose every port is
// answered by a thing sitting there is RARE — 31 of 252. Newton's second law needs an acceleration, and a gear on a
// bench has not got one. So a physical witness is never just an object; it is AN OBJECT AND WHAT YOU DO TO IT:
//
//   GIVES         the ports the thing itself answers, out of its own stated size, mass and material — and the
//                 chain is kept, so you can see whether it is really a property of the thing or a counterfactual.
//                 A bobbin's "speed" comes out of `free-fall.speed` reading its own height as a drop height: true
//                 arithmetic about a question nobody asked, and visible here rather than hidden.
//   YOU SUPPLY    the ports nothing about the thing can answer: the current you pass, the temperature you hold, the
//                 push you give. These are the instruments the observation needs, and naming them IS the recipe.
//   READS         what the law then tells you, and where that lands on time's tree.
//
// A law with no witness at all is the honest finding: it is in the book and nothing in the environment shows it.

import { BOOK, lawById } from '../book';
import { plain, QUANTITY_KINDS } from '../book/quantities';
import { dimOf, dimText } from '../lang/dimension';
import { inTime, placeOf } from './time';
import { readable } from './record';
import { know, pointable } from './derive';
import type { Law } from '../lang/law';

export { pointable };

/** One law, one physical thing, and what it takes to watch the law on that thing. */
export interface Witness {
  law: string; lawName: string;
  thing: string; thingName: string;
  /** ports the thing answers out of its own data, each with the route that got there */
  /** ports the thing answers; `itsOwn` is true where that is a property of the thing rather than what some law
   *  says it WOULD be under a condition you would have to create */
  gives: { port: string; unit: string; value: number; how: string; itsOwn: boolean }[];
  /** ports nothing about the thing answers: the readings or settings the observation needs */
  youSupply: { port: string; unit: string; kind: string }[];
  /** what the law then tells you */
  reads: { quantity: string; unit: string; power: number };
  /** the path from time down to the reading */ onTimesTree: string[];
  /** 0..1: the share of the law's ports the thing answers by itself */ completeness: number;
  says: string;
}

export interface Table {
  rows: Witness[];
  /** laws nothing in the environment witnesses, with what they would need */
  unwitnessed: { law: string; name: string; needs: string[]; says: string }[];
  summary: string[];
}

// What each thing can answer, worked out once and kept: asking `know` for 411 kinds across every thing is the whole
// cost of the table, and it is the same answer every time.
const answerable = new Map<string, Map<string, { value: number; unit: string; how: string }>>();
const inputKinds = (() => { const s = new Set<string>(); for (const l of BOOK) for (const p of l.inputs) s.add(plain(p.name)); return [...s]; })();

function answersOf(thing: string): Map<string, { value: number; unit: string; how: string }> {
  const had = answerable.get(thing);
  if (had) return had;
  const m = new Map<string, { value: number; unit: string; how: string }>();
  for (const k of inputKinds) {
    const f = know(thing, k, undefined, 2);
    if (f) m.set(k, { value: f.value, unit: f.unit, how: f.how });
  }
  answerable.set(thing, m);
  return m;
}

/** THE WITNESSES OF ONE LAW, best first: the things that answer most of its ports out of their own data. */
export function witnessesFor(law: Law, things = pointable(), most = 2): Witness[] {
  const scored = things.map((t) => {
    const a = answersOf(t.id);
    const gives = law.inputs.filter((p) => a.has(plain(p.name)))
      .map((p) => { const g = a.get(plain(p.name))!;
        // ITS OWN, OR WHAT A LAW SAYS IT WOULD BE. A bobbin's mass comes out of its size and its material: it HAS
        // that. A bobbin's "speed" comes out of `free-fall.speed` reading its own height as a drop height — true
        // arithmetic about a question nobody asked, and the table must not print that as a property it has.
        const its = /^the inventory|^the mixing law|^its stated size|^its overall size/.test(g.how);
        return { port: p.name, unit: p.unit, value: g.value, how: g.how, itsOwn: its }; });
    const youSupply = law.inputs.filter((p) => !a.has(plain(p.name)))
      .map((p) => ({ port: p.name, unit: p.unit,
        kind: QUANTITY_KINDS.get(plain(p.name)) ? dimText(dimOf(p.unit)) : `${dimText(dimOf(p.unit))} (not a kind the book names elsewhere)` }));
    return { t, gives, youSupply };
  }).filter((x) => x.gives.length > 0)
    .sort((a, b) => b.gives.length - a.gives.length || a.t.id.localeCompare(b.t.id))
    .slice(0, most);

  return scored.map(({ t, gives, youSupply }) => {
    const power = inTime(dimOf(law.output.unit));
    const completeness = gives.length / Math.max(1, law.inputs.length);
    return {
      law: law.id, lawName: law.name, thing: t.id, thingName: t.name, gives, youSupply,
      reads: { quantity: law.output.name, unit: law.output.unit, power },
      onTimesTree: placeOf(law).path, completeness,
      says: youSupply.length === 0
        ? `${law.name} is wholly observable on ${t.name}${gives.every((g) => g.itsOwn) ? '' : ' — but only by taking what a law says it WOULD be for a property it has'}: it reads out ${law.output.name} in ${law.output.unit}.`
        : `${law.name} on ${t.name}: it gives ${gives.map((g) => g.port).join(', ')}; you supply ${youSupply.map((s) => `${s.port} (${s.unit})`).join(', ')}; then read ${law.output.name} in ${law.output.unit}.`,
    };
  });
}

/** THE WHOLE TABLE. Every law with up to `most` physical witnesses, and every law with none named as such. */
export function observationTable(laws: readonly Law[] = BOOK, things = pointable(), most = 2): Table {
  const rows: Witness[] = [];
  const unwitnessed: Table['unwitnessed'] = [];
  for (const l of laws) {
    const w = witnessesFor(l, things, most);
    if (w.length) rows.push(...w);
    else unwitnessed.push({ law: l.id, name: l.name, needs: l.inputs.map((p) => `${p.name} (${p.unit})`),
      says: `${l.name} has no physical witness here: nothing in the environment answers even one of its ports — it reads ${l.inputs.map((p) => p.name).join(', ')}.` });
  }
  const whole = rows.filter((r) => r.completeness === 1);
  const byThing = new Map<string, number>();
  for (const r of rows) byThing.set(r.thing, (byThing.get(r.thing) ?? 0) + 1);
  const witnessed = new Set(rows.map((r) => r.law));
  return { rows, unwitnessed,
    summary: [
      `${witnessed.size} of ${laws.length} laws have a physical witness in the environment; ${unwitnessed.length} have none.`,
      `${whole.length} are WHOLLY observable on one thing — every port answered by it, nothing to set up.`,
      `the rest need something supplied: a current passed, a temperature held, a push given. That list IS the recipe.`,
      `the busiest witnesses: ${[...byThing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => `${things.find((t) => t.id === id)?.name ?? id} (${n})`).join(', ')}.`,
      `${things.length} things were offered. Add a part to the inventory or a law to the book and this table changes with nothing rewritten.`,
    ] };
}

/** The table as lines, branching: the law, its place on time's tree, then each witness under it. */
export function tableLines(t: Table, mostRows = 24): string[] {
  const out = ['THE UNIVERSAL LAW OBSERVATION TABLE', ...t.summary.map((s) => `  ${s}`), ''];
  const byLaw = new Map<string, Witness[]>();
  for (const r of t.rows) byLaw.set(r.law, [...(byLaw.get(r.law) ?? []), r]);
  const ordered = [...byLaw.entries()].sort((a, b) => (b[1][0]!.completeness - a[1][0]!.completeness) || a[0].localeCompare(b[0]));
  for (const [law, ws] of ordered.slice(0, mostRows)) {
    const w = ws[0]!;
    out.push(`${law}  ${w.lawName}`);
    out.push(`   on time's tree: ${w.onTimesTree.join(' → ')}`);
    for (const x of ws) {
      out.push(`   ◆ ${x.thingName}  (${Math.round(x.completeness * 100)}% of its ports)`);
      for (const g of x.gives) out.push(`       ${g.itsOwn ? 'has ' : 'WOULD'} ${g.port} = ${readable(g.value)} ${g.unit}  — ${g.how}${g.itsOwn ? '' : ' (not a property of it: what this law says it would be)'}`);
      for (const s of x.youSupply) out.push(`       you  ${s.port} (${s.unit}) — nothing about it answers this`);
      out.push(`       read ${x.reads.quantity} in ${x.reads.unit}  (time^${x.reads.power})`);
    }
  }
  if (t.unwitnessed.length) {
    out.push('', `NO PHYSICAL WITNESS — ${t.unwitnessed.length} laws nothing in the environment shows:`);
    for (const u of t.unwitnessed.slice(0, 10)) out.push(`   ${u.law}: reads ${u.needs.join(', ')}`);
    if (t.unwitnessed.length > 10) out.push(`   … and ${t.unwitnessed.length - 10} more`);
  }
  return out;
}

/** One law, asked directly: what shows it, in words. */
export const showsIt = (id: string, things = pointable()): string[] =>
  witnessesFor(lawById(id), things).map((w) => w.says);

// A challenge's attempt in Nex (docs/EGO-NATIVE-LANGUAGE.md section Y.14). The challenge engine (challenges.ts) says
// each need in words and ends it at a level: unsayable, no way, unbuildable, fails, partial, works. Each level is a
// mode of a structure, and the structures differ in what they are of: "unsayable" is a word with no flow behind it,
// "no way" a transformation with no mechanism, "unbuildable" a transformation outside the domain of what is here
// (R11), "fails" a transformation held false by a check, "partial" one with insufficient parts, "works" one held
// true. Every one that grew is known by simulation (grown and checked in her own machinery), never by measurement:
// the English report says "works" and the structure says how it is known, which the report now says too.

import type { Attempt, Level, NeedResult } from '../challenges';
import { lawById } from '../laws';
import { d, e, hash, q, r, t, type Coords, type Evidence, type Mode, type R, type Structure, type T } from './core';
import { evidenceOfSource, fromLaw } from './nexus';
import { render } from './translate';

export const MODE_OF_LEVEL: Record<Level, Mode> = { unsayable: 'unmodelled', 'no way': 'unmodelled', unbuildable: 'outside-domain', fails: 'false', partial: 'insufficient', works: 'true' };
/** How each level is known: a word's absence is not evidence; a missing way or block is derived from what she knows; what grew was simulated. */
export const EVIDENCE_OF_LEVEL: Record<Level, Evidence | null> = { unsayable: null, 'no way': 'derived', unbuildable: 'derived', fails: 'simulated', partial: 'simulated', works: 'simulated' };

/** One need's result as a structure. */
export function fromNeed(x: NeedResult): Structure {
  const mode = MODE_OF_LEVEL[x.level];
  const how = EVIDENCE_OF_LEVEL[x.level];
  const c: Coords = { mode, ...(how ? { ev: { how, src: [how === 'simulated' ? 'grown and checked in my own machinery' : 'what I know of ways and blocks'] } } : {}), ...(x.way ? { mech: x.way } : {}) };
  if ('form' in x.need) return t(d(`words:${x.need.form}`, { en: `"${x.need.form}"` }), d('form', { en: 'a form' }), c);
  if (!x.flows) {
    // the word her language has no flow for: a distinction with no transformation behind it
    const word = /no flow for "([^"]+)"/.exec(x.says)?.[1] ?? x.need.from;
    return r('kind', [d(`word:${word}`, { en: `"${word}"` }), d('flow', { en: 'a flow' })], { mode: 'unmodelled' });
  }
  const [f, to] = x.flows;
  if (x.need.against) c.dom = [d(`medium.${x.need.against}`, { en: `the ${x.need.against}` })];
  if (x.level === 'unbuildable' && x.missing?.length) c.under = x.missing;
  if (x.level === 'fails' && x.fix) c.against = [x.fix];
  // what the need is, as the challenge says it: a store keeps a flow over time (an invariant under time), a sense is
  // a measurement (a morphism from the flow to a signal), an act and a convert are transformations
  const from = d(`flow.${f}`, { en: f }), into = d(`flow.${to}`, { en: to });
  switch (x.need.as) {
    case 'store': return r('invariant', [from, d('time', { en: 'time' })], c);
    case 'sense': return r('morphism', [from, into], c);
    default: return t(from, into, c);
  }
}

/** A challenge's bounds as structures: each a quantity of the challenge by a law of the book, with the law's own evidence; a note with no law behind it is a want held as unmodelled. */
export function fromNotes(a: Attempt): Structure[] {
  const self = d(a.challenge.id, { en: a.challenge.name.charAt(0).toLowerCase() + a.challenge.name.slice(1) });
  const out: Structure[] = [];
  for (const n of a.notes) {
    const law = n.law ? lawById(n.law) : undefined;
    if (law && n.value !== undefined) {
      out.push(r('quantity', [self, d(`${law.id}:${law.output.sym}`, { en: law.output.name }), q(n.value, law.output.unit)], { mech: law.id, mode: 'true', ev: { how: evidenceOfSource(law.source), src: [law.source.cite] } }));
      out.push(r('constrain', [self, fromLaw(law)], { mode: 'true', ev: { how: evidenceOfSource(law.source) } }));
    } else if (n.fix) out.push(r('constrain', [self, d(`want:${n.fix.slice(0, 48)}`, { en: n.fix })], { mode: 'unmodelled' })); // a want with nothing behind it yet
    else out.push(e(self, 'simulated', n.says)); // a claim checked in her own machinery
  }
  return out;
}

export interface AttemptInNex { needs: Structure[]; bounds: Structure[]; whole: R; modes: Partial<Record<Mode, number>>; evidence: Evidence[]; carried: number; present: number }

/** The whole attempt as one structure (a state of its needs and bounds, in the mode of its worst need), with what English carried of it. */
export function fromAttempt(a: Attempt): AttemptInNex {
  const needs = a.results.map(fromNeed), bounds = fromNotes(a);
  const whole = r('state', [...needs, ...bounds], { mode: MODE_OF_LEVEL[a.worst] });
  const modes: Partial<Record<Mode, number>> = {};
  for (const s of needs) { const m = (s.k === 'T' || s.k === 'R') && s.c.mode ? s.c.mode : 'true'; modes[m] = (modes[m] ?? 0) + 1; }
  const evidence = [...new Set(needs.map((s) => ((s.k === 'T' || s.k === 'R') ? s.c.ev?.how : undefined)).filter((x): x is Evidence => !!x))];
  let carried = 0, present = 0;
  for (const s of [...needs, ...bounds]) { const out = render(s, 'en', 'engineer'); present += out.present.length; carried += out.present.length - out.dropped.length; }
  return { needs, bounds, whole, modes, evidence, carried, present };
}

/** The attempt's Nex, said after the English report: what the levels are as modes, how it is known, what English carried. */
export function sayAttemptInNex(a: Attempt): string {
  const x = fromAttempt(a);
  const modes = Object.entries(x.modes).map(([m, n]) => `${m} ×${n}`).join(', ');
  const known = x.evidence.includes('simulated') ? '"works", "partial" and "fails" are known by simulation (grown and checked in my own machinery, not measured in a world); "unbuildable" and "no way" are derived from what I know of ways and blocks' : 'nothing here grew, so nothing is known by simulation';
  const n = x.needs.length;
  return `In Nex ${n === 0 ? 'there is no need, only bounds' : `the ${n === 1 ? 'need is a transformation' : `${n} needs are transformations`} between flows in the mode${n === 1 ? '' : 's'} ${modes}`}; ${known}; the whole is #${hash(x.whole).slice(0, 8)}, and this English carried ${x.carried} of ${x.present} pieces of it.`;
}

export type { T as NeedStructure };

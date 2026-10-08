// The make pipeline: one way everything made is made, whatever made it first (a kit's choices, a design sized by its
// laws, the inventory's product, a part the families make to size). Its stages, in order, each said and counted:
//
//   conditions   read from the words and applied: age, where it stands, what it is made of, its size, who it is for
//   detail       the attention to detail (src/nexus/make/detail.ts): joints, finishes, supports, access, lights,
//                the road, machines, wear
//   critic       what is wrong with it (src/nexus/make/critic.ts), put right where a rule can
//   again        if the critic changed it, its details are taken off and added again to what it is now, and it is
//                criticised again: until nothing more is put right, or three rounds
//
// Nothing here is about one thing: every stage reads parts by their materials, sizes, contacts and kinds.

import { countParts, massOf, type Part } from '../kits';
import { applyConditions, readConditions, type Conditions } from './conditions';
import { addDetails, RULES, stripDetails } from './detail';
import { contracts, critique, type Contract, type Finding } from './critic';
import { layout } from './space';

export interface Made { part: Part; conditions: Conditions; stages: { stage: string; did: string[] }[]; findings: Finding[]; rounds: number; details: Record<string, number>; /** kg each rule added */ detailKg: Record<string, number>; /** its interfaces, each checked */ contracts: Contract[]; parts: [before: number, after: number]; kg: [before: number, after: number] }

/** A thing taken through the whole pipeline (the thing given is not changed). */
export function perfect(made: Part, words: string | Conditions = '', o: { rules?: (id: string) => boolean; rounds?: number } = {}): Made {
  const cond = typeof words === 'string' ? readConditions(words) : words, stages: Made['stages'] = [], before = [countParts(made), massOf(made)] as [number, number];
  // (a copy of what was made to work on, its skins shared: a skin is never changed in place, and what is worked out
  // about one, its fairness, its draft, its pieces, is kept by it, so a car park of one model works it out once)
  const clone = (p: Part): Part => { const { shape, parts, ...rest } = p; return { ...structuredClone(rest), ...(shape ? { shape: 'surf' in shape ? shape : structuredClone(shape) } : {}), ...(parts ? { parts: parts.map(clone) } : {}) } as Part; };
  const applied = applyConditions(clone(made), cond); let part = applied.part;
  stages.push({ stage: 'conditions', did: [...cond.said, ...applied.did] });
  let findings: Finding[] = [], counts: Record<string, number> = {}, kg: Record<string, number> = {}, rounds = 0;
  for (; rounds < (o.rounds ?? 3); rounds++) {
    part = stripDetails(part);
    ({ counts, kg } = addDetails(part, cond, (r) => (o.rules ? o.rules(r.id) : r.on)));
    const f = critique(part); findings = rounds === 0 ? f : [...findings.filter((x) => x.fixed), ...f];
    if (!f.some((x) => x.fixed)) break; // nothing more put right: done
  }
  stages.push({ stage: 'detail', did: Object.entries(counts).filter(([, n]) => n > 0).map(([id, n]) => `${RULES.find((r) => r.id === id)!.family}: ${n} from "${id}" (${(kg[id] ?? 0) >= 0.5 ? `${(kg[id] ?? 0).toFixed(0)} kg` : 'no mass to speak of'})`) });
  stages.push({ stage: 'critic', did: findings.map((f) => `${f.fixed ? 'put right' : 'said'} — ${f.check}: ${f.part}: ${f.says}`) });
  // a published mass kept: what the pipeline added or the critic cut changes what is drawn, so what is not drawn is
  // reckoned again against it (each thing that has one: a street's cars each keep theirs)
  const settle = (p: Part): void => { const rest = p.published !== undefined ? p.parts?.find((q) => q.name === 'the rest of it') : undefined; if (rest) { rest.kg = 0; rest.kg = Math.max(0, p.published! - massOf(p)); } for (const q of p.parts ?? []) settle(q); };
  settle(part);
  const ct = contracts(layout(part).filter((n) => !n.p.detail));
  stages.push({ stage: 'interfaces', did: ct.map((c) => `${c.ok ? 'meets' : 'FAILS'} — ${c.requirer} on the ${c.provider}: ${c.rows.map((r) => `${r.what}: needs ${r.required}, has ${r.provided}${r.ok ? '' : ' ✗'}`).join('; ')}`) });
  return { part, conditions: cond, stages, findings, rounds: Math.min(rounds + 1, o.rounds ?? 3), details: counts, detailKg: kg, contracts: ct, parts: [before[0], countParts(part)], kg: [before[1], massOf(part)] };
}

/** What the pipeline did, said in a line or two. */
export function sayMade(m: Made): string {
  const d = Object.values(m.details).reduce((a, b) => a + b, 0), fixed = m.findings.filter((f) => f.fixed), open = m.findings.filter((f) => !f.fixed);
  const what = Object.entries(m.details).filter(([, n]) => n > 0).map(([id, n]) => `${n} ${id}`).join(', ');
  const ok = m.contracts.filter((c) => c.ok).length, bad = m.contracts.filter((c) => !c.ok);
  const ifs = m.contracts.length ? ` ${m.contracts.length} interfaces checked: ${ok} meet${bad.length ? `, ${bad.length} fail (${bad.slice(0, 2).map((c) => `${c.requirer} on the ${c.provider}: ${c.rows.filter((r) => !r.ok).map((r) => `${r.what} needs ${r.required}, has ${r.provided}`).join('; ')}`).join('; ')})` : ''}.` : '';
  return `Attention to detail: ${d} added (${what}); ${m.parts[0]} parts became ${m.parts[1]}.${ifs}${fixed.length ? ` The critic put ${fixed.length} right: ${[...new Set(fixed.map((f) => f.says))].slice(0, 3).join('; ')}.` : ' The critic found nothing to put right.'}${open.length ? ` Still to say: ${[...new Set(open.map((f) => `${f.part}: ${f.says}`))].slice(0, 3).join('; ')}.` : ''}`;
}

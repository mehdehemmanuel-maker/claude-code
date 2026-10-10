// The census: hundreds of builds at once, to find where Nexus stops. Each ask is read, generated and embodied as it
// would be in the forge, and what came of it is kept: built, built with flaws, read but not embodied, or not read at all,
// with every flaw's check and law, every gap the generator found, the decisions it took (each a call, with its law), and
// which terms of the build domain manifold (src/nexus/substrate/atlas.ts) its parts are. The asks are of two kinds: a sweep over
// everything the reader understands (what moves through every medium on every source at many masses and speeds, people
// on the road, places to live, printers), and every term of the manifold asked for by name, so the census says, term by
// term, which fields Nexus reaches and which it does not yet. Ranked by how many asks each blocker stops, the summary is
// the list of laws to write next. Nothing is judged by eye: a build counts as built only when its own checks hold.

import { readAsk } from '../ask/words';
import { generate } from './manifold';
import { embodyAny } from '../embody/any';
import { DOMAINS, atlasOf, termId, type Call } from './atlas';

export interface CensusAsk { words: string; family: 'term' | 'carried' | 'people' | 'place' | 'parts'; term?: string }
export interface CensusResult {
  words: string; family: CensusAsk['family']; term?: string;
  status: 'built' | 'flawed' | 'unbuilt' | 'unread' | 'timeout';
  /** Read as the same ask as another, and built once: the words of that one. */
  same?: string;
  /** What the reader took it to be, and the name it gave. */
  readAs?: string; name?: string;
  problems?: string[];
  designer?: string; parts?: number; mass?: number; rounds?: number;
  flaws?: { check: string; where: string; says: string; law: string }[];
  gaps?: string[];
  /** Terms of the manifold its parts are. */
  partTerms?: string[];
  /** The decisions it took, each a call from the build to what it decided, by its law. */
  calls?: Call[];
  ms: number;
}

/** Every ask of the census: the sweep of what the reader understands, and every term of the manifold by name. */
export function censusAsks(): CensusAsk[] {
  const out: CensusAsk[] = [];
  const MEDIA: [string, string[]][] = [['a cart', ['8 km/h', '30 km/h']], ['a train on rails', ['60 km/h', '160 km/h']], ['a sled on ice', ['15 km/h', '40 km/h']], ['a boat', ['3 m/s', '12 m/s']], ['a submarine', ['1 m/s', '4 m/s']], ['a drone', ['10 m/s', '30 m/s']], ['a craft in a vacuum', ['100 m/s', '2000 m/s']]];
  const SOURCES = ['', ' on petrol', ' that runs on solar', ' that is pedal powered', ' driven by the wind'];
  for (const [what, speeds] of MEDIA) for (const src of SOURCES) for (const kg of [5, 50, 500]) for (const v of speeds) out.push({ words: `${what}${src} that carries ${kg} kg at ${v}`, family: 'carried' });
  for (const kg of [20, 200]) for (const v of ['5 km/h', '20 km/h']) out.push({ words: `a rover on the moon that carries ${kg} kg at ${v}`, family: 'carried' });
  for (const n of [1, 2, 4, 7]) for (const v of ['60 km/h', '130 km/h']) for (const r of ['50 km', '400 km']) for (const src of ['', ' on petrol']) out.push({ words: `a car for ${n} people${src} that goes ${r} at ${v}`, family: 'people' });
  for (const n of [1, 2, 4, 8]) for (const a of [20, 60, 150]) for (const c of [5, -10, -30]) out.push({ words: `a house of ${a} m² for ${n} people where winter gets to ${c} °C`, family: 'place' });
  for (const size of [100, 250, 500]) for (const tol of [0.1, 0.3]) for (const h of [2, 8, 24]) out.push({ words: `a 3D printer for parts up to ${size} mm, tolerance ${tol} mm, ${h} hours a part`, family: 'parts' });
  const seen = new Set<string>();
  for (const d of DOMAINS) for (const name of d.terms) { const id = termId(name); if (seen.has(id)) continue; seen.add(id); out.push({ words: `build a ${id}`, family: 'term', term: id }); }
  return out;
}

/** One ask of each kind the sweep holds (each medium on each source, people, a place, a printer), and every term: for the inner loop, in seconds. */
export function quickAsks(): CensusAsk[] {
  const all = censusAsks(), seen = new Set<string>();
  return all.filter((a) => { if (a.family === 'term') return true; const k = a.family === 'carried' ? a.words.replace(/ that carries .*$/, '') : a.family; if (seen.has(k)) return false; seen.add(k); return true; });
}

const TERM_RES = (() => { const seen = new Set<string>(); const out: [string, RegExp][] = []; for (const d of DOMAINS) for (const n of d.terms) { const id = termId(n); if (seen.has(id) || id.length < 3) continue; seen.add(id); out.push([id, new RegExp(`\\b${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(s|es)?\\b`, 'i')]); } return out; })();
/** The terms of the manifold some words name. */
export const termsIn = (words: string): string[] => TERM_RES.filter(([, re]) => re.test(words)).map(([id]) => id);

export function runAsk(a: CensusAsk): CensusResult {
  const t0 = performance.now(), base = { words: a.words, family: a.family, ...(a.term ? { term: a.term } : {}) };
  const r = readAsk(a.words);
  if ('problems' in r) return { ...base, status: 'unread', problems: r.problems, ms: performance.now() - t0 };
  let m: ReturnType<typeof embodyAny>, s: ReturnType<typeof generate>;
  try { s = generate(r.intent); m = embodyAny(r.intent, s); } catch (e) { return { ...base, status: 'unbuilt', readAs: r.shape, name: r.intent.name, problems: [`it threw: ${(e as Error).message}`], ms: performance.now() - t0 }; }
  const gaps = s.gaps.map((g) => g.lacks);
  if (!m || !m.parts.length) return { ...base, status: 'unbuilt', readAs: r.shape, name: r.intent.name, gaps, flaws: (m?.flaws ?? []).map((f) => ({ check: f.check, where: f.where, says: f.says, law: f.law })), ms: performance.now() - t0 };
  const flaws = m.flaws.map((f) => ({ check: f.check, where: f.where, says: f.says, law: f.law }));
  const partTerms = [...new Set(m.parts.flatMap((p) => termsIn(`${p.name} ${p.category.replace(/[/-]/g, ' ')}`)))];
  const calls: Call[] = (m.gates ?? []).flatMap((g) => termsIn(`${g.question} ${g.outcome}`).map((to) => ({ to, law: g.law, via: g.id })));
  return { ...base, status: flaws.length ? 'flawed' : 'built', readAs: r.shape, name: r.intent.name, designer: m.gates?.find((g) => g.id === 'designer')?.outcome ?? (m.hotEnd ? 'printer' : undefined), parts: m.parts.length, mass: m.parts.reduce((x, p) => x + p.mass, 0), rounds: m.rounds.length, flaws, gaps, partTerms, calls, ms: performance.now() - t0 };
}

export interface Blocker { what: string; kind: 'unread' | 'flaw' | 'gap' | 'unbuilt' | 'timeout'; count: number; examples: string[] }
export interface CensusSummary {
  asks: number; ms: number;
  byFamily: Record<string, Record<CensusResult['status'], number>>;
  blockers: Blocker[];
  domains: { id: string; name: string; terms: number; built: number; part: number; gap: number }[];
  /** The manifold with what the census found folded in. */
  atlas: ReturnType<typeof atlasOf>;
}

/** What the census found: how each family fared, every blocker ranked by how many asks it stops, and how far each domain is reached. */
export function summarize(rs: CensusResult[]): CensusSummary {
  const byFamily: CensusSummary['byFamily'] = {};
  for (const r of rs) { const f = (byFamily[r.family] ??= { built: 0, flawed: 0, unbuilt: 0, unread: 0, timeout: 0 }); f[r.status]++; }
  const block = new Map<string, Blocker>();
  const bump = (kind: Blocker['kind'], what: string, ex: string) => { const k = `${kind}|${what}`, b = block.get(k) ?? { what, kind, count: 0, examples: [] }; b.count++; if (b.examples.length < 4) b.examples.push(ex); block.set(k, b); };
  for (const r of rs) {
    if (r.status === 'unread') bump('unread', r.family === 'term' ? 'no reading of a build of this kind: the words name nothing the reader turns into an ask' : r.problems?.[0] ?? 'unread', r.words);
    if (r.status === 'timeout') bump('timeout', 'a build that ran past its budget: it runs away or never ends', r.words);
    if (r.status === 'unbuilt') bump('unbuilt', r.problems?.[0] ?? (r.flaws?.[0]?.says ?? 'read, generated, and nothing embodied'), r.words);
    for (const f of r.flaws ?? []) bump('flaw', `${f.check}: ${f.law}`, `${r.words} → ${f.says.slice(0, 120)}`);
    if (r.status !== 'built') for (const g of new Set(r.gaps ?? [])) bump('gap', g, r.words);
  }
  // what the census grounds of the manifold: a term built from its own ask, or made as a part of another build
  const ground: { term: string; how: 'built' | 'part'; by: string; calls?: Call[] }[] = [];
  for (const r of rs) {
    if (r.term && (r.status === 'built' || r.status === 'flawed')) ground.push({ term: r.term, how: 'built', by: `"${r.words}" built ${r.name} (${r.designer ?? r.readAs}, ${r.parts} parts${r.status === 'flawed' ? `, ${r.flaws!.length} flaw${r.flaws!.length === 1 ? '' : 's'}` : ''})`, calls: r.calls });
    for (const t of r.partTerms ?? []) ground.push({ term: t, how: 'part', by: `a part of ${r.name} ("${r.words}")` });
  }
  const atlas = atlasOf(ground);
  const domains = DOMAINS.map((d) => { const ts = d.terms.map((n) => atlas.terms.find((t) => t.id === termId(n))!); return { id: d.id, name: d.name, terms: ts.length, built: ts.filter((t) => t.grounded.how === 'built').length, part: ts.filter((t) => t.grounded.how === 'part').length, gap: ts.filter((t) => t.grounded.how === 'gap').length }; });
  return { asks: rs.length, ms: rs.reduce((x, r) => x + r.ms, 0), byFamily, blockers: [...block.values()].sort((a, b) => b.count - a.count), domains, atlas };
}

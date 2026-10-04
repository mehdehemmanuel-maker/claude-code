// What failure teaches, as language. A belief of the Mind that confirmed or rejected a construction law's hypothesis on
// a class of design is a lesson: it enters the substrate under the law it tested, with the stand as its source, hashed
// and citing the law's hash (so a change to the law, or to a book law under it, makes the lesson stale), and it goes
// back into design: a confirmed remedy is applied to the next design of that class before it is built, and said. A
// failure no law has a word for is a gap: a facet named in the family, not yet derived, so the missing law persists as
// a name in Ego's knowledge, never as a patch in a generator. Nothing here is kept as a line; everything is read off
// the journal (mind/journal.ts), so it survives a reload and a crash the way the journal does.

import type { Commit } from '../mind/journal';
import type { Change, TestSpec } from '../mind/investigate';
import type { DesignSpec } from '../assistant/designer';
import type { Discovery, Entity, Relation } from '../ganglia/substrate/model';
import { coverageFrom } from '../ganglia/substrate/substrate';
import { hash, type R, type Structure } from '../ganglia/native/core';
import { constructionHash, lawOf, type Family } from './laws';

export interface Lesson {
  /** The construction law tested (its id without the `construction.` prefix). */
  law: string;
  /** The failure it explained: racking, members, joints, tipping. */
  what: string;
  /** The class of design it was learned on (the spec's kind). */
  of: string;
  /** The remedy tested. */
  change: Change;
  verdict: 'confirmed' | 'rejected' | 'retained';
  /** How far the evidence sat from the prediction, in tolerances. */
  margin?: number;
  physics: string;
  seq: number;
  at: string;
  /** The belief, in Nex: the law's claim with its mode settled. */
  claim: Structure;
}

export interface Gap {
  /** The investigation the failure belongs to. */
  inv: string;
  /** The failure, in words, as the anomaly recorded it. */
  what: string;
  /** The family the missing law would belong to. */
  family: Family;
  seq: number;
  at: string;
  physics: string;
  structure: Structure;
}

const distinction = (s: Structure, prefix: string): string | undefined => {
  if (s.k !== 'R') return undefined;
  for (const a of (s as R).args) { if (a.k === 'D' && (a as { id: string }).id.startsWith(prefix)) return (a as { id: string }).id.slice(prefix.length); }
  return undefined;
};

/** Every lesson in a journal: a belief that settled a hypothesis a construction law offered. */
export function lessonsOf(commits: Commit[]): Lesson[] {
  const by = new Map(commits.map((c) => [c.seq, c]));
  const out: Lesson[] = [];
  for (const b of commits) {
    if (b.kind !== 'belief' || typeof b.data['hypothesis'] !== 'number') continue;
    const h = by.get(b.data['hypothesis'] as number);
    if (!h || h.kind !== 'hypothesis') continue;
    const law = distinction(h.item, 'law:construction.'), what = distinction(h.item, 'failure:');
    if (!law || !what) continue;
    const test = h.data['test'] as TestSpec | undefined, change = h.data['change'] as Change | undefined;
    if (!test || !change) continue;
    const status = b.data['hypothesisStatus'] as Lesson['verdict'] | undefined;
    if (!status) continue;
    out.push({ law, what, of: test.spec.what, change, verdict: status, margin: b.validation.margin, physics: b.physics, seq: b.seq, at: b.at, claim: b.item });
  }
  return out;
}

const familyOfAnomaly = (kind: string): Family => (['fell', 'sunk', 'flung', 'escaped', 'lost'].includes(kind) ? 'existence' : ['jitter', 'restless', 'spin', 'drift'].includes(kind) ? 'scale' : 'mechanical');

/** Every gap in a journal: an anomaly for which no law offered a hypothesis, the failure the family has no word for. */
export function gapsOf(commits: Commit[]): Gap[] {
  const out: Gap[] = [];
  for (const a of commits) {
    if (a.kind !== 'anomaly') continue;
    const cands = a.data['candidates'] as string[] | undefined;
    if (!cands || cands.length) continue;
    // the finding itself is on the observation the anomaly was raised from
    const obs = commits.find((c) => c.seq === a.parents[0]);
    if (a.data['of'] === 'watchdog') {
      const an = (obs?.data['anomaly'] ?? { kind: 'unknown', value: 0, limit: 0 }) as { kind: string; value: number; limit: number }, part = (obs?.data['part'] ?? null) as { name: string; material: string } | null, obligation = String(obs?.data['obligation'] ?? '');
      out.push({ inv: a.inv, what: `${part ? `${part.name} (${part.material})` : 'the scene'} ${an.kind}: ${obligation} broken (${an.value} against ${an.limit})`, family: familyOfAnomaly(an.kind), seq: a.seq, at: a.at, physics: a.physics, structure: a.item });
    } else {
      const sig = (obs?.data['signature'] ?? {}) as Record<string, unknown>;
      const words = Object.entries(sig).filter(([, v]) => v && v !== false).map(([k, v]) => (typeof v === 'object' && v ? `${k} ${JSON.stringify(v)}` : k));
      out.push({ inv: a.inv, what: `a design failed in a way no law explains: ${words.join(', ') || 'no signature'}`, family: 'mechanical', seq: a.seq, at: a.at, physics: a.physics, structure: a.item });
    }
  }
  return out;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const lessonId = (l: Lesson) => `construction.lesson.${l.law}.${slug(l.of)}.${l.seq}`;
export const gapId = (g: Gap) => `construction.gap.${slug(g.inv)}.${g.seq}`;

/**
 * A design of a class a confirmed lesson was learned on takes the remedy before it is built: aprons on a table that
 * racked, members sized for more where they broke. What cannot be designed in (anchoring) is only reported.
 */
export function withLessons(spec: DesignSpec, lessons: Lesson[]): { spec: DesignSpec; applied: Lesson[] } {
  const out: DesignSpec = { ...spec };
  const applied: Lesson[] = [];
  for (const l of lessons) {
    if (l.verdict !== 'confirmed' || l.of !== spec.what) continue;
    if ('aprons' in l.change && !out.aprons) { out.aprons = true; applied.push(l); }
    else if ('margin' in l.change && (out.margin ?? 1) < l.change.margin) { out.margin = l.change.margin; applied.push(l); }
  }
  return { spec: out, applied };
}

/** Lessons and gaps as the substrate holds them: each lesson under the law it tested, each gap a named facet of its family. */
export function lessonDiscovery(commits: Commit[]): Discovery {
  const entities: Entity[] = [], relations: Relation[] = [];
  for (const l of lessonsOf(commits)) {
    const law = lawOf(l.law);
    const src = { derived: `test stand (${l.physics}), journal commit ${l.seq} at ${l.at}` };
    const id = lessonId(l);
    entities.push({ id, name: `${l.of}: ${l.what}, ${l.verdict}`, names: [`${l.of} ${l.what} lesson`], kinds: ['law'], domains: ['construction', 'lesson', law?.family ?? 'mechanical'], says: `on a ${l.of}, ${l.what} was ${l.verdict === 'confirmed' ? 'explained' : l.verdict === 'rejected' ? 'not explained' : 'only partly explained'} by ${l.law}: ${describe(l.change)} ${l.verdict === 'confirmed' ? 'held' : 'did not hold'} on the stand${l.margin !== undefined ? ` (${l.margin.toFixed(1)} tolerances from the prediction)` : ''}`, source: src, coverage: coverageFrom(src, 1) });
    relations.push({ from: id, kind: 'governed-by', to: `construction.${l.law}`, says: 'the law it tested', source: src, confidence: 0.7 });
  }
  for (const g of gapsOf(commits)) {
    const src = { stub: `named by a failure on ${g.at} (journal commit ${g.seq}, ${g.physics}); no law of the family explains it yet` };
    const id = gapId(g);
    entities.push({ id, name: `gap: ${g.what.slice(0, 60)}`, names: [], kinds: ['law'], domains: ['construction', 'gap', g.family], says: `a failure the construction laws have no word for yet: ${g.what}`, source: src, coverage: coverageFrom(src, 0) });
    relations.push({ from: id, kind: 'is-a', to: `construction.${g.family}-family`, says: 'the family the missing law would belong to', source: src, confidence: 0.3 });
  }
  return { entities, relations, unknowns: [] };
}

/** What a lesson cites, by hash: the construction law it tested; a change to that law, or to a book law under it, makes the lesson stale (ganglia/dependencies.ts). */
export function lessonCitations(commits: Commit[]): { id: string; hash: string; cites: string[] }[] {
  return lessonsOf(commits).map((l) => { const law = lawOf(l.law); return { id: `lesson:${l.seq}`, hash: hash(l.claim), cites: law ? [constructionHash(law)] : [] }; });
}

const describe = (c: Change): string => ('aprons' in c ? 'aprons (rails between the legs under the top)' : 'margin' in c ? `members sized for ${c.margin}x the load` : `${c.upgrade.kind} joints upgraded for ${c.upgrade.mode}`);

/** The lesson, said to you when it is applied to a design. */
export function sayLesson(l: Lesson): string {
  const failed = l.what === 'racking' ? 'racked' : l.what === 'members' ? 'broke a member' : l.what === 'joints' ? 'broke a joint' : 'tipped';
  return `A ${l.of} like this ${failed} on my stand before, and ${describe(l.change)} held it; this one has ${'aprons' in l.change ? 'them' : 'that'} from the start.`;
}

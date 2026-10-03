// The substrate assembled: the bridge reads every structured source, the seed packs are ingested through the same
// pipeline as any discovery, the queue is seeded, and the first round of population runs the rules over everything.
// `substrate()` is built once and kept; `census()` says what is there and how deep; `populateMore()` runs the queue
// further with a budget.
import { Substrate } from './substrate';
import { bridge } from './bridge';
import { mechanical } from './seeds/mechanical';
import { electrical } from './seeds/electrical';
import { circuits } from './seeds/circuits';
import { computing } from './seeds/computing';
import { materials } from './seeds/materials';
import { manufacturing } from './seeds/manufacturing';
import { biology } from './seeds/biology';
import { chemistry } from './seeds/chemistry';
import { earth } from './seeds/earth';
import { robotics } from './seeds/robotics';
import { scale, scaleCovariance } from './seeds/scale';
import { views } from './seeds/views';
import { failures } from './seeds/failures';
import { common } from './seeds/common';
import { parameters } from './seeds/parameters';
import { standards } from './seeds/standards';
import { making } from './seeds/making';
import { quantities } from './seeds/quantities';
import type { Pack } from './dsl';
import { Queue, buildGenerators, ingest, populate, promoteManifolds, ruleExpander, seedExpander, seedQueue, type Expander, type Generator, type Report } from './population';
import { externalExpander } from './external';
import { population } from './service';

export * from './model';
export { Substrate, coverageFrom } from './substrate';
export { Pack, est, param } from './dsl';
export { Queue, populate, seedQueue, priority, ingest, ask, promoteManifolds, buildGenerators, missingConstructors, ruleExpander, seedExpander, type Expander, type Report, type WorkItem, type Generator } from './population';
export { spokenName, articled, capitalised, findByWords, SPOKEN } from './names';
export { externalExpander, recordToDiscovery, provenanceOf, type Connector, type ExternalRecord, type ExternalLink, type ExternalQuantity } from './external';
export { Population, startPopulation, population, stopPopulation, type PopulationOptions, type JournalEntry, type Totals } from './service';
export { wikidata, parseItem, referencedIds, PROPERTIES as WIKIDATA_PROPERTIES, WIKIDATA_API, type WikidataOptions } from './connectors/wikidata';
export { implementations, waysToStore, materialsForRole, variants, decompose, leavesOf, producers, analogues, dualRole, lineage, mechanismsFor, constructionPath, index, family, type Found, type Tree, type MaterialRow, type ProducerStep, type PathStep } from './queries';

/** The seed packs, in build order; a factory may give several packs, each then its own step. */
export const PACKS: (() => Pack | Pack[])[] = [views, common, quantities, parameters, standards, mechanical, electrical, circuits, computing, materials, manufacturing, making, failures, biology, chemistry, earth, robotics, scale, scaleCovariance];

export interface Built { substrate: Substrate; queue: Queue; packs: Pack[]; expanders: Expander[]; generators: Map<string, Generator>; seedReport: Report }

let built: Built | null = null;

/**
 * The build as steps, each a few milliseconds of this thread: the bridge, each pack made and ingested, the repair, the
 * queue, the manifolds, the generators. A frame never pays for the whole: the background service advances it a slice
 * at a time (advanceBuild), and a caller that needs the substrate now (build) runs the rest at once.
 */
export function* buildSteps(): Iterator<string, Built, undefined> {
  const s = new Substrate();
  bridge(s);
  yield 'bridge';
  const packs: Pack[] = [];
  const seedReport: Report = { processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} };
  for (const f of PACKS) {
    const made = f();
    for (const p of Array.isArray(made) ? made : [made]) {
      yield `pack:${p.domain}`;
      ingest(s, { entities: p.entities, relations: p.relations, unknowns: [] }, seedReport);
      packs.push(p);
      yield `ingest:${p.domain}`;
    }
  }
  // what the bridge named and nothing described: stubs, each a question
  s.repair();
  yield 'repair';
  const expanders = [seedExpander(packs), ruleExpander(), externalExpander(null)];
  const queue = new Queue();
  const all = [...s.entities.values()];
  for (let i = 0; i < all.length; i += 500) { seedQueue(s, queue, 'both', all.slice(i, i + 500)); yield 'queue'; }
  promoteManifolds(s);
  yield 'manifolds';
  const generators = buildGenerators(s);
  built = { substrate: s, queue, packs, expanders, generators, seedReport };
  return built;
}

/** Build the substrate from the bridge and the packs, seed the queue, and run the first round of derivations, at once. */
export function build(opts: { budget?: number } = {}): Built {
  void opts;
  const g = buildSteps();
  let r = g.next();
  while (!r.done) r = g.next();
  return r.value;
}

/** Advance a stepped build for at most `budgetMs` of this thread, checked between steps: the Built once done, else null. */
export function advanceBuild(g: Iterator<string, Built, undefined>, budgetMs: number, now: () => number = () => performance.now()): Built | null {
  const t0 = now();
  for (;;) {
    const r = g.next();
    if (r.done) return r.value;
    if (now() - t0 >= budgetMs) return null;
  }
}

export function isBuilt(): boolean { return built !== null; }

/** The one substrate, built on first use. */
export function substrate(): Substrate { return (built ?? build()).substrate; }
export function builtState(): Built { return built ?? build(); }

/** Run the population queue further: `budget` questions, across `workers` lanes by domain. */
export async function populateMore(budget = 200, workers = 4): Promise<Report> {
  const b = builtState();
  const r = await populate(b.substrate, b.queue, { expanders: b.expanders, budget, workers });
  for (const [k, g] of buildGenerators(b.substrate)) b.generators.set(k, g);
  return r;
}

/** What is there and how deep, with the frontier: the next questions the queue would ask. */
export function census() {
  const b = builtState();
  const c = b.substrate.census();
  const p = population();
  return { ...c, queued: b.queue.size, next: b.queue.peek(8).map((w) => `${w.id} (${w.facet}, ${w.mode}, ${w.priority.toFixed(1)}: ${w.reason})`), generators: b.generators.size, packs: b.packs.map((p) => p.domain), outside: p ? p.status() : null };
}
export { VIEW_OF_DOMAIN, viewOfDomain } from './seeds/views';
export { FAMILY_OF_CATEGORY, FAMILY_NUMBERS, familyOfWord } from './seeds/materials';

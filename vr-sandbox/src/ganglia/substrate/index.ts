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
import { scale } from './seeds/scale';
import { views } from './seeds/views';
import { failures } from './seeds/failures';
import { common } from './seeds/common';
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

export const PACKS: (() => Pack)[] = [views, common, mechanical, electrical, circuits, computing, materials, manufacturing, failures, biology, chemistry, earth, robotics, scale];

export interface Built { substrate: Substrate; queue: Queue; packs: Pack[]; expanders: Expander[]; generators: Map<string, Generator>; seedReport: Report }

let built: Built | null = null;

/** Build the substrate from the bridge and the packs, seed the queue, and run the first round of derivations. */
export function build(opts: { budget?: number } = {}): Built {
  const s = new Substrate();
  bridge(s);
  const packs = PACKS.map((f) => f());
  const seedReport: Report = { processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} };
  for (const p of packs) ingest(s, { entities: p.entities, relations: p.relations, unknowns: [] }, seedReport);
  // what the bridge named and nothing described: stubs, each a question
  s.repair();
  const expanders = [seedExpander(packs), ruleExpander(), externalExpander(null)];
  const queue = new Queue();
  seedQueue(s, queue, 'both');
  promoteManifolds(s);
  const generators = buildGenerators(s);
  built = { substrate: s, queue, packs, expanders, generators, seedReport };
  void opts;
  return built;
}

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

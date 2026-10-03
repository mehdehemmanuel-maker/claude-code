// Population as a service: the queue worked in the background in time slices, an outside connector asked when the
// rules run out, and what was learned kept between sessions. What is persisted is small and sufficient: the questions
// already asked (the queue is a function of the substrate and of those), the journal of what the outside said (the
// rules re-derive the rest), and the totals. A session restores by replaying the journal through `ingest` and
// re-seeding the queue without the questions already asked.
import { type Discovery, type Entity, type Facet, normalizeId } from './model';
import { Queue, ingest, populate, promoteManifolds, buildGenerators, ruleExpander, seedExpander, seedQueue, type Expander, type Report, type WorkItem } from './population';
import { externalExpander, type Connector } from './external';
import { builtState, type Built } from './index';

export interface PopulationOptions {
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  connector?: Connector | null;
  /** The storage key. */
  key?: string;
  /** Milliseconds of work per slice on the main thread (fetches wait off it). */
  sliceMs?: number;
  /** Milliseconds between slices. */
  everyMs?: number;
  /** Questions per slice at most. */
  budget?: number;
  saveEveryMs?: number;
  /** Journal size cap in characters of JSON: the browser allows about five million per site, shared with builds. */
  journalCap?: number;
  schedule?: (fn: () => void, ms: number) => unknown;
  now?: () => number;
}

export interface JournalEntry { at: string; by: string; id: string; facet: Facet; discovery: Discovery }
export interface Totals { sessions: number; slices: number; processed: number; discoveredEntities: number; discoveredRelations: number; unknowns: number; rejected: number; journalDropped: number }
interface Saved { v: 1; saved: string; done: string[]; journal: JournalEntry[]; totals: Totals }

export class Population {
  readonly key: string;
  readonly journal: JournalEntry[] = [];
  readonly totals: Totals = { sessions: 0, slices: 0, processed: 0, discoveredEntities: 0, discoveredRelations: 0, unknowns: 0, rejected: 0, journalDropped: 0 };
  readonly connector: Connector | null;
  readonly expanders: Expander[];
  private readonly external: ReturnType<typeof externalExpander>;
  private b: Built | null = null;
  private running = false;
  private busy = false;
  private lastSave = 0;
  private lastPromote = 0;
  private readonly storage: PopulationOptions['storage'];
  private readonly sliceMs: number;
  private readonly everyMs: number;
  private readonly budget: number;
  private readonly saveEveryMs: number;
  private readonly journalCap: number;
  private readonly schedule: NonNullable<PopulationOptions['schedule']>;
  private readonly now: () => number;
  lastReport: Report | null = null;
  lastError: string | null = null;

  constructor(opts: PopulationOptions = {}) {
    this.key = opts.key ?? 'ganglia.substrate';
    this.connector = opts.connector ?? null;
    this.storage = opts.storage ?? null;
    this.sliceMs = opts.sliceMs ?? 2;
    this.everyMs = opts.everyMs ?? 500;
    this.budget = opts.budget ?? 40;
    this.saveEveryMs = opts.saveEveryMs ?? 15000;
    this.journalCap = opts.journalCap ?? 1_500_000;
    this.schedule = opts.schedule ?? ((fn, ms) => setTimeout(fn, ms));
    this.now = opts.now ?? (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this.external = externalExpander(this.connector);
    this.expanders = [];
  }

  get connected(): boolean { return this.connector !== null; }
  get built(): Built { return this.b ?? this.build(); }
  get substrate() { return this.built.substrate; }
  get queue(): Queue { return this.built.queue; }
  get isRunning(): boolean { return this.running; }

  /** Build (or take the built) substrate, replay the journal, re-seed the queue without the questions already asked. */
  private build(): Built {
    const b = builtState();
    this.b = b;
    this.expanders.splice(0, this.expanders.length, seedExpander(b.packs), ruleExpander(), this.external);
    const saved = this.load();
    if (saved) {
      const report: Report = { processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} };
      for (const j of saved.journal) { ingest(b.substrate, j.discovery, report); this.journal.push(j); this.external.looked.set(j.id, null); }
      Object.assign(this.totals, saved.totals);
      // the queue: everything the substrate asks, minus what was asked already
      const q = Queue.restore(JSON.stringify({ items: [], done: saved.done }));
      b.queue = q;
      this.reseed();
      promoteManifolds(b.substrate);
      for (const [k, g] of buildGenerators(b.substrate)) b.generators.set(k, g);
    }
    this.totals.sessions++;
    return b;
  }

  private reseed(): number { return seedQueue(this.b!.substrate, this.b!.queue, 'both'); }

  private load(): Saved | null {
    if (!this.storage) return null;
    try {
      const text = this.storage.getItem(this.key);
      if (!text) return null;
      const saved = JSON.parse(text) as Saved;
      return saved.v === 1 && Array.isArray(saved.done) && Array.isArray(saved.journal) ? saved : null;
    } catch (err) { this.lastError = `could not read what was saved: ${err instanceof Error ? err.message : String(err)}`; return null; }
  }

  /** Persist: the questions asked, the journal (capped, oldest dropped), the totals. True when the browser kept it. */
  save(): boolean {
    if (!this.storage || !this.b) return false;
    this.capJournal();
    const saved: Saved = { v: 1, saved: new Date().toISOString(), done: [...this.queue.done], journal: this.journal, totals: this.totals };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const json = JSON.stringify(saved);
        this.storage.setItem(this.key, json);
        if (this.storage.getItem(this.key) !== json) throw new Error('read back different');
        this.lastSave = this.now();
        return true;
      } catch (err) {
        this.lastError = `could not save: ${err instanceof Error ? err.message : String(err)}`;
        // out of room: keep the newest half of the journal and try again
        const drop = Math.ceil(this.journal.length / 2);
        if (!drop) return false;
        this.journal.splice(0, drop);
        this.totals.journalDropped += drop;
      }
    }
    return false;
  }

  private capJournal() {
    let size = JSON.stringify(this.journal).length;
    while (size > this.journalCap && this.journal.length) { const [gone] = this.journal.splice(0, 1); size -= JSON.stringify(gone).length; this.totals.journalDropped++; }
  }

  /** Begin working the queue in the background. */
  start(): this {
    if (this.running) return this;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      void this.slice().finally(() => { if (this.running) this.schedule(tick, this.everyMs); });
    };
    this.schedule(tick, this.everyMs);
    return this;
  }

  stop(): this { this.running = false; return this; }

  /** One slice: at most `budget` questions, at most `sliceMs` of this thread; the outside is awaited off it. */
  async slice(): Promise<Report | null> {
    if (this.busy) return null;
    this.busy = true;
    try {
      const b = this.built;
      const t0 = this.now();
      const r = await populate(b.substrate, b.queue, {
        expanders: this.expanders, budget: this.budget, workers: 1, finish: false,
        until: () => this.now() - t0 > this.sliceMs,
        onDiscovery: (x, w, d) => { if (x === this.external) this.journal.push({ at: new Date().toISOString().slice(0, 10), by: x.name, id: w.id, facet: w.facet, discovery: d }); },
      });
      this.lastReport = r;
      this.totals.slices++;
      this.totals.processed += r.processed;
      this.totals.discoveredEntities += r.discoveredEntities;
      this.totals.discoveredRelations += r.discoveredRelations;
      this.totals.unknowns += r.unknowns;
      this.totals.rejected += r.rejected.length;
      // what varies and generalises is promoted now and then, not every slice
      if (this.totals.slices - this.lastPromote >= 20) { promoteManifolds(b.substrate); for (const [k, g] of buildGenerators(b.substrate)) b.generators.set(k, g); this.lastPromote = this.totals.slices; }
      if (this.now() - this.lastSave > this.saveEveryMs) this.save();
      return r;
    } finally { this.busy = false; }
  }

  /**
   * A question by name, to the front of the queue: a thing that is here gets its next facets asked first; a thing that
   * is not becomes a stub asked for by name, which the outside is asked about on the next slice. Returns the id.
   */
  ask(name: string): string {
    const s = this.substrate;
    const have = s.byWord(name);
    const e: Entity = have ?? s.add({ id: normalizeId(name), name, names: [name], kinds: [], domains: ['unplaced'], says: `Asked for by name ("${name}"); not yet described.`, source: { stub: 'asked for by name' }, coverage: { depth: 0, confidence: 0.2, sourceKind: 'stub', expanded: [], unknowns: ['not yet described'] } });
    const facets: Facet[] = have ? ['components', 'materials', 'functions'] : ['functions'];
    for (const facet of facets) {
      const w: WorkItem = { id: e.id, facet, mode: have ? 'deep' : 'fast', priority: 1e6, reason: 'asked for', domain: e.domains[0] ?? 'unplaced' };
      const key = `${w.id}|${w.facet}|${w.mode}`;
      // asked before: it is asked again, outside too
      if (this.queue.done.has(key)) { this.queue.done.delete(key); this.external.looked.delete(e.id); }
      this.queue.push(w); // raises it when it is already queued
    }
    return e.id;
  }

  /** What the service is doing: for Ego and the census. */
  status() {
    const b = this.b;
    return {
      running: this.running, built: !!b, queued: b?.queue.size ?? 0, done: b?.queue.done.size ?? 0,
      connector: this.connector ? { name: this.connector.name, ...this.connector.stats() } : null,
      learnedOutside: { entities: this.journal.reduce((n, j) => n + j.discovery.entities.length, 0), relations: this.journal.reduce((n, j) => n + j.discovery.relations.length, 0), records: this.journal.filter((j) => j.discovery.entities.length || j.discovery.relations.length).length, misses: this.journal.filter((j) => !j.discovery.entities.length && !j.discovery.relations.length).length },
      totals: { ...this.totals }, lastError: this.lastError,
    };
  }
}

let service: Population | null = null;

/** Start (once) the background population of the one substrate. */
export function startPopulation(opts: PopulationOptions = {}): Population {
  if (service) return service;
  service = new Population(opts).start();
  return service;
}

export function population(): Population | null { return service; }
export function stopPopulation(): void { service?.stop(); service = null; }

// The outside: a connector's record enters only through ingest, with the source, its key and the date on every arrow
// and number; what the source lacks is an unknown; the background works in slices and keeps what it learned between
// sessions. The Wikidata parser is held on the API's documented JSON shape; the live lookup runs when the host is
// reachable from where the tests run, and is skipped (and says so) when the network policy denies it.
import { describe, expect, it } from 'vitest';
import {
  Population, Queue, RELATIONS, RELATION_KINDS, Substrate, WIKIDATA_API, WIKIDATA_PROPERTIES, externalExpander, ingest, parseItem, populate, recordToDiscovery, referencedIds, ruleExpander, seedExpander, seedQueue, substrate, builtState, wikidata,
  type Connector, type Entity, type ExternalRecord, type Report,
} from '../../src/ganglia/substrate';

// Live, when the host is reachable from where the tests run: a sandbox's network policy may deny it, and then the live
// lookup is skipped and a test says so.
const reachable = await (async () => {
  if (typeof fetch !== 'function') return false;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const res = await fetch(`${WIKIDATA_API}?action=wbsearchentities&search=ball%20bearing&language=en&format=json&origin=*&limit=1`, { signal: ctl.signal });
    clearTimeout(t);
    return res.ok;
  } catch { return false; }
})();

const freshReport = (): Report => ({ processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} });
const described = (id: string, name: string, kinds: Entity['kinds'], names: string[] = []): Entity => ({ id, name, names, kinds, domains: ['mechanical'], says: `A ${name}, described enough for the test.`, source: { cite: 'the test', kind: 'textbook' }, coverage: { depth: 2, confidence: 0.8, sourceKind: 'textbook', expanded: [], unknowns: [] } });

/** An in-memory connector: the same record shape the network connector returns, held in memory so the pipeline is tested without a network. */
function memory(records: Record<string, ExternalRecord>, opts: { fail?: boolean } = {}): Connector & { asked: string[] } {
  const stats = { lookups: 0, hits: 0, misses: 0, failures: 0, lastError: undefined as string | undefined };
  const c = {
    name: 'Memory', asked: [] as string[], stats: () => ({ ...stats }),
    async lookup(e: Entity) {
      c.asked.push(e.id); stats.lookups++;
      if (opts.fail) { stats.failures++; stats.lastError = 'unreachable'; throw new Error('unreachable'); }
      const r = [e.name, ...e.names].map((n) => records[n.toLowerCase()]).find(Boolean) ?? null;
      if (r) stats.hits++; else stats.misses++;
      return r;
    },
  };
  return c;
}

const BEARING: ExternalRecord = {
  key: 'M1', label: 'ball bearing', aliases: ['ball-bearing'], description: 'rolling-element bearing using balls to maintain the separation between the bearing races', url: 'memory://M1', retrieved: '2026-10-03',
  links: [
    { kind: 'is-a', key: 'M2', label: 'rolling-element bearing', via: 'subclass of' },
    { kind: 'has-part', key: 'M3', label: 'bearing ball', description: 'the rolling element of a ball bearing', via: 'has part' },
    { kind: 'made-of', key: 'M4', label: 'bearing steel', description: 'high-carbon chromium steel for bearings', via: 'made from material' },
    { kind: 'part-of', key: 'M5', label: 'wheel hub', via: 'part of' },
    { kind: 'produced-by', key: 'M6', label: 'grinding', via: 'fabrication method' },
  ],
  quantities: [{ property: 'P2054', label: 'density', amount: 7850, unit: 'kilogram per cubic metre' }],
};

describe('what comes from outside says where it came from', () => {
  it('reads a record as relations and numbers, each with the source, its key and the date', () => {
    const s = new Substrate();
    s.add(described('bearing.ball', 'ball bearing', ['component', 'mechanism'], ['ball bearing']));
    s.add(described('grinding', 'grinding', ['process', 'constructor']));
    const c = memory({ 'ball bearing': BEARING });
    const d = recordToDiscovery(c, s.get('bearing.ball')!, BEARING, s);
    // the thing itself: the source's key, the aliases, the number with its unit and its provenance
    const own = d.entities[0]!;
    expect(own.id).toBe('bearing.ball');
    expect(own.keys).toEqual({ memory: 'M1' });
    expect(own.names).toContain('ball-bearing');
    expect(own.params?.[0]).toMatchObject({ sym: 'rho', name: 'density', unit: 'kg/m^3', of: { derived: '7850 kilogram per cubic metre converted to kg/m^3; Memory M1 "ball bearing", retrieved 2026-10-03' } });
    expect(own.params?.[0]?.low).toBeCloseTo(7850, 6);
    expect(own.says).toBe('A ball bearing, described enough for the test.'); // a described thing keeps its own sentence
    // every arrow carries the source, its key and the date; a backwards statement is the forward arrow with its ends swapped
    for (const r of d.relations) expect(r.source).toEqual({ cite: 'Memory M1 "ball bearing", retrieved 2026-10-03', url: 'memory://M1', kind: 'database' });
    expect(d.relations.map((r) => `${r.from} ${r.kind} ${r.to}`)).toEqual(['bearing.ball is-a rolling-element-bearing', 'bearing.ball has-part bearing-ball', 'bearing.ball made-of bearing-steel', 'wheel-hub has-part bearing.ball', 'bearing.ball produced-by grinding']);
    // what the source names and nothing here describes is a stub of the kind the statement names, with the source's description when it gave one
    const steel = d.entities.find((e) => e.id === 'bearing-steel')!;
    expect(steel.kinds).toEqual(['material']);
    expect(steel.says).toBe('High-carbon chromium steel for bearings. (Memory)');
    expect(steel.keys).toEqual({ memory: 'M4' });
    expect(steel.coverage.depth).toBe(1);
    const hub = d.entities.find((e) => e.id === 'wheel-hub')!;
    expect('stub' in hub.source).toBe(true);
    expect(hub.coverage.unknowns).toContain('not yet described');
    // the existing constructor is reused, not duplicated, and gains the source's key
    expect(d.entities.find((e) => e.id === 'grinding')!.keys).toEqual({ memory: 'M6' });
    // and it all enters through ingest, validated like anything else: nothing refused, nothing dangling
    const report = freshReport();
    ingest(s, d, report);
    expect(report.rejected).toEqual([]);
    expect(s.dangling()).toEqual([]);
    expect(s.reach('bearing.ball', 'made-of').map((e) => e.id)).toEqual(['bearing-steel']);
    expect(s.reach('bearing.ball', 'part-of').map((e) => e.id)).toEqual(['wheel-hub']);
  });

  it('a known property in a known unit lands in the substrate\'s own symbol and SI unit, with the conversion in its provenance; the rest stays as the source gave it', () => {
    const s = new Substrate();
    s.add(described('material.x', 'x', ['material'], ['x']));
    const c = memory({});
    const rec: ExternalRecord = { ...BEARING, key: 'M20', label: 'x', links: [], quantities: [
      { property: 'P2054', label: 'density', amount: 7.85, unit: 'gram per cubic centimetre' },
      { property: 'P2101', label: 'melting point', amount: 1500, unit: 'degree Celsius' },
      { property: 'P2068', label: 'thermal conductivity', amount: 50, unit: 'watt per metre-kelvin' },
      { property: 'P9999', label: 'something else', amount: 3, unit: 'furlong' },
      { property: 'P2054', label: 'density', amount: 1, unit: 'slug per cubic furlong' },
    ] };
    const d = recordToDiscovery(c, s.get('material.x')!, rec, s);
    const ps = d.entities[0]!.params!;
    expect(ps.find((p) => p.sym === 'rho')).toMatchObject({ unit: 'kg/m^3', of: { derived: expect.stringContaining('7.85 gram per cubic centimetre converted to kg/m^3') } });
    expect(ps.find((p) => p.sym === 'rho')!.low).toBeCloseTo(7850, 6);
    expect(ps.find((p) => p.sym === 'T_melt')!.unit).toBe('K');
    expect(ps.find((p) => p.sym === 'T_melt')!.low).toBeCloseTo(1773.15, 6);
    expect(ps.find((p) => p.sym === 'k')).toMatchObject({ unit: 'W/m K', low: 50 });
    expect(ps.find((p) => p.sym === 'P9999')).toMatchObject({ unit: 'furlong', low: 3 });
    expect(ps.filter((p) => p.sym === 'rho').length).toBe(1); // the unconvertible density is kept under its property id, not as a second rho
    expect(ps.find((p) => p.sym === 'P2054')).toMatchObject({ unit: 'slug per cubic furlong' });
  });

  it('refuses from outside what it refuses from anywhere: a thing governed by a non-law, a thing made of a non-substance', () => {
    const s = new Substrate();
    s.add(described('thing.a', 'thing a', ['component']));
    s.add(described('thing.b', 'thing b', ['component']));
    const c = memory({});
    const bad: ExternalRecord = { ...BEARING, key: 'M7', label: 'thing a', links: [{ kind: 'made-of', key: 'M8', label: 'thing b', via: 'made from material' }, { kind: 'has-part', key: 'M9', label: 'thing a', via: 'has part' }], quantities: [] };
    const d = recordToDiscovery(c, s.get('thing.a')!, bad, s);
    const report = freshReport();
    ingest(s, d, report);
    expect(report.rejected.map((r) => r.why)).toEqual(['thing.b is not a substance']);
    expect(s.relations.filter((r) => r.from === r.to)).toEqual([]);
  });

  it('what the source lacks or cannot be reached for is an unknown, never silence', async () => {
    const s = new Substrate();
    const e = s.add(described('bearing.ball', 'ball bearing', ['component'], ['ball bearing']));
    const none = externalExpander(memory({}));
    expect((await none.expand(e, 'components', s))?.unknowns.map((u) => u.why)).toEqual(['Memory has no record matching ball bearing']);
    const down = externalExpander(memory({ 'ball bearing': BEARING }, { fail: true }));
    expect((await down.expand(e, 'components', s))?.unknowns.map((u) => u.why)).toEqual(['Memory could not be reached: unreachable']);
    expect(down.looked.has(e.id)).toBe(false); // it may be asked again when the source is back
    const off = externalExpander(null);
    expect((await off.expand(e, 'components', s))?.unknowns[0]!.why).toMatch(/no external source is connected/);
    // one record answers every facet: the second facet fetches nothing
    const c = memory({ 'ball bearing': BEARING });
    const on = externalExpander(c);
    const first = await on.expand(e, 'components', s);
    expect(first?.relations.length).toBe(5);
    expect(await on.expand(e, 'materials', s)).toBeNull();
    expect(c.asked).toEqual(['bearing.ball']);
  });

  it('a slice keeps to its time and its budget, journals what the outside said, and the next session restores it', async () => {
    // a clock that advances one unit per look: t0 = 0, the deadline check sees 1, 2, 3, 4; with sliceMs 3 exactly three questions are processed
    let clock = 0;
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) };
    const scheduled: (() => void)[] = [];
    const c = memory({ 'ball bearing': BEARING, 'bearing ball': BEARING });
    const p = new Population({ storage, connector: c, key: 'test.substrate', sliceMs: 3, budget: 40, saveEveryMs: 1e9, now: () => clock++, schedule: (fn) => scheduled.push(fn) });
    expect(p.connected).toBe(true);
    p.ask('bearing.ball'); // to the front: the outside is asked about it in the first slice
    const r = (await p.slice())!;
    expect(r.processed).toBe(3);
    expect(c.asked[0]).toBe('bearing.ball');
    expect(p.journal.length).toBeGreaterThanOrEqual(1);
    expect(p.journal[0]).toMatchObject({ by: 'external:Memory', id: 'bearing.ball' });
    expect(p.substrate.get('bearing.ball')!.keys).toEqual({ memory: 'M1' });
    expect(p.substrate.get('bearing.ball')!.params?.some((q) => q.sym === 'rho')).toBe(true);
    // the budget binds when the clock does not
    clock = 0;
    const p2 = new Population({ storage: null, connector: null, sliceMs: 1e9, budget: 5, now: () => clock, schedule: () => undefined });
    expect((await p2.slice())!.processed).toBe(5);
    // persisted: small (the questions asked, the journal, the totals), and read back
    expect(p.save()).toBe(true);
    const saved = JSON.parse(store.get('test.substrate')!) as { done: string[]; journal: unknown[]; totals: { sessions: number } };
    expect(saved.done.length).toBe(p.queue.done.size);
    expect(saved.journal.length).toBe(p.journal.length);
    expect(store.get('test.substrate')!.length).toBeLessThan(200_000);
    p.stop();
    // the next session: the journal replayed through ingest, the queue re-seeded without what was asked, the totals carried
    const next = new Population({ storage, connector: memory({}), key: 'test.substrate', schedule: () => undefined });
    expect(next.status().built).toBe(false);
    const q = next.queue;
    expect(next.totals.sessions).toBe(saved.totals.sessions + 1);
    expect(next.journal.length).toBe(p.journal.length);
    expect(q.done.size).toBe(saved.done.length);
    for (const w of q.peek(5000)) expect(q.done.has(`${w.id}|${w.facet}|${w.mode}`), w.id).toBe(false);
    expect(next.substrate.get('bearing-steel')?.keys).toEqual({ memory: 'M4' });
    // started, it schedules itself and keeps going; stopped, it does not
    p.start();
    expect(scheduled.length).toBe(1);
    p.stop();
    scheduled.pop()!();
    expect(scheduled.length).toBe(0);
  });

  it('a question by name goes to the front and is asked outside', async () => {
    const c = memory({ 'warp drive': { key: 'M9', label: 'warp drive', aliases: [], description: 'hypothetical faster-than-light propulsion', url: 'memory://M9', retrieved: '2026-10-03', links: [{ kind: 'is-a', key: 'M10', label: 'spacecraft propulsion', via: 'subclass of' }], quantities: [] } });
    const p = new Population({ storage: null, connector: c, sliceMs: 1e9, budget: 2, schedule: () => undefined });
    const id = p.ask('warp drive');
    expect(id).toBe('warp-drive');
    expect(p.queue.peek(1)[0]!.id).toBe('warp-drive');
    expect('stub' in p.substrate.get(id)!.source).toBe(true);
    await p.slice();
    expect(c.asked[0]).toBe('warp-drive');
    const e = p.substrate.get(id)!;
    expect('stub' in e.source).toBe(false);
    expect(e.says).toBe('Hypothetical faster-than-light propulsion. (Memory)');
    expect(e.source).toMatchObject({ cite: 'Memory M9 "warp drive", retrieved 2026-10-03', kind: 'database' });
    expect(p.substrate.reach(id, 'is-a').map((x) => x.id)).toEqual(['spacecraft-propulsion']);
    expect(p.status().learnedOutside.records).toBe(1);
    // and what the source does not have stays a stub, with the unknown said
    p.ask('unobtainium');
    await p.slice();
    expect(p.substrate.get('unobtainium')!.coverage.unknowns).toContain('Memory has no record matching unobtainium');
  });

  it('populate awaits an outside answer in its lanes and reports it like any discovery', async () => {
    const s = builtState().substrate;
    const q = new Queue();
    seedQueue(s, q, 'fast');
    const c = memory({ 'ball bearing': BEARING, 'bearing ball': BEARING });
    const x = externalExpander(c);
    q.push({ id: 'bearing.ball', facet: 'functions', mode: 'fast', priority: 1e9, reason: 'test', domain: 'mechanical' });
    const journal: string[] = [];
    const r = await populate(s, q, { expanders: [seedExpander(builtState().packs), ruleExpander(), x], budget: 1, workers: 1, onDiscovery: (ex, w) => journal.push(`${ex.name}:${w.id}`) });
    expect(r.processed).toBe(1);
    expect(journal).toContain('external:Memory:bearing.ball');
    expect(r.rejected).toEqual([]);
    expect(substrate().get('bearing.ball')!.keys).toEqual({ memory: 'M1' });
  });
});

describe('Wikidata as a connector', () => {
  it('reads every property in its table as a relation of the index, forwards or backwards', () => {
    const inverses = RELATION_KINDS.map((k) => RELATIONS[k].inverse);
    for (const [prop, { kind, via }] of Object.entries(WIKIDATA_PROPERTIES)) {
      expect(/^P\d+$/.test(prop), prop).toBe(true);
      expect((RELATION_KINDS as string[]).includes(kind) || (inverses as string[]).includes(kind), `${prop} ${kind}`).toBe(true);
      expect(via.length).toBeGreaterThan(2);
    }
  });

  it('parses an item in the API\'s documented JSON shape: entity claims by the table, quantities with their units, deprecated and valueless claims skipped', () => {
    const item = {
      id: 'Q0', labels: { en: { value: 'ball bearing' } }, descriptions: { en: { value: 'a rolling-element bearing with balls' } }, aliases: { en: [{ value: 'ball-bearing' }] },
      claims: {
        P279: [{ mainsnak: { snaktype: 'value', property: 'P279', datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: 'Q1' } } }, rank: 'normal' }],
        P527: [{ mainsnak: { snaktype: 'value', property: 'P527', datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: 'Q2' } } }, rank: 'normal' },
          { mainsnak: { snaktype: 'value', property: 'P527', datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: 'Q6' } } }, rank: 'deprecated' }],
        P186: [{ mainsnak: { snaktype: 'value', property: 'P186', datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: 'Q3' } } }, rank: 'preferred' }],
        P361: [{ mainsnak: { snaktype: 'somevalue', property: 'P361' } }],
        P2054: [{ mainsnak: { snaktype: 'value', property: 'P2054', datavalue: { type: 'quantity', value: { amount: '+7850', unit: 'http://www.wikidata.org/entity/Q4', upperBound: '+7900', lowerBound: '+7800' } } }, rank: 'normal' }],
        P9999: [{ mainsnak: { snaktype: 'value', property: 'P9999', datavalue: { type: 'wikibase-entityid', value: { 'entity-type': 'item', id: 'Q5' } } }, rank: 'normal' }],
      },
    };
    expect(referencedIds(item).sort()).toEqual(['P2054', 'Q1', 'Q2', 'Q3', 'Q4', 'Q6']);
    const labels = { Q1: { id: 'Q1', labels: { en: { value: 'rolling-element bearing' } } }, Q2: { id: 'Q2', labels: { en: { value: 'ball' } }, descriptions: { en: { value: 'sphere' } } }, Q3: { id: 'Q3', labels: { en: { value: 'bearing steel' } } }, Q4: { id: 'Q4', labels: { en: { value: 'kilogram per cubic metre' } } }, P2054: { id: 'P2054', labels: { en: { value: 'density' } } } };
    const r = parseItem(item, labels, '2026-10-03');
    expect(r).toMatchObject({ key: 'Q0', label: 'ball bearing', aliases: ['ball-bearing'], description: 'a rolling-element bearing with balls', url: 'https://www.wikidata.org/wiki/Q0', retrieved: '2026-10-03' });
    expect(r.links).toEqual([
      { kind: 'is-a', key: 'Q1', label: 'rolling-element bearing', description: undefined, via: 'subclass of' },
      { kind: 'has-part', key: 'Q2', label: 'ball', description: 'sphere', via: 'has part' },
      { kind: 'made-of', key: 'Q3', label: 'bearing steel', description: undefined, via: 'made from material' },
    ]);
    expect(r.quantities).toEqual([{ property: 'P2054', label: 'density', amount: 7850, high: 7900, unit: 'kilogram per cubic metre' }]);
    // and as a discovery about a bearing here, the number lands on it with Wikidata as its provenance
    const s = new Substrate();
    const e = s.add(described('bearing.ball', 'ball bearing', ['component'], ['ball bearing']));
    const d = recordToDiscovery(wikidata({ fetch: undefined }), e, r, s);
    expect(d.entities[0]!.keys).toEqual({ wikidata: 'Q0' });
    expect(d.entities[0]!.params?.[0]).toMatchObject({ sym: 'rho', unit: 'kg/m^3', low: 7850, high: 7900, of: { derived: '7850 kilogram per cubic metre converted to kg/m^3; Wikidata Q0 "ball bearing", retrieved 2026-10-03' } });
  });

  it('asks the API one request at a time with CORS allowed, finds by exact label or alias only, and counts what happened', async () => {
    const calls: string[] = [];
    const answers: Record<string, unknown> = {
      wbsearchentities: { search: [{ id: 'Q77', label: 'Ball Bearing Co.', description: 'a company' }, { id: 'Q0', label: 'ball bearing', aliases: ['ball-bearing'] }] },
      wbgetentities: { entities: { Q0: { id: 'Q0', labels: { en: { value: 'ball bearing' } }, claims: { P279: [{ mainsnak: { snaktype: 'value', property: 'P279', datavalue: { type: 'wikibase-entityid', value: { id: 'Q1' } } } }] } }, Q1: { id: 'Q1', labels: { en: { value: 'rolling-element bearing' } } } } },
    };
    const fetchFn = (async (url: string | URL | Request) => {
      const u = new URL(String(url));
      calls.push(u.searchParams.get('action')!);
      expect(u.origin + u.pathname).toBe(WIKIDATA_API);
      expect(u.searchParams.get('origin')).toBe('*');
      expect(u.searchParams.get('format')).toBe('json');
      return { ok: true, status: 200, json: async () => answers[u.searchParams.get('action')!] } as Response;
    }) as unknown as typeof fetch;
    const c = wikidata({ fetch: fetchFn, gapMs: 0, now: () => new Date('2026-10-03T12:00:00Z') });
    const r = await c.lookup(described('bearing.ball', 'ball bearing', ['component'], ['ball bearing']));
    expect(r?.key).toBe('Q0'); // not the company: an exact label match only
    expect(r?.links).toEqual([{ kind: 'is-a', key: 'Q1', label: 'rolling-element bearing', description: undefined, via: 'subclass of' }]);
    expect(r?.retrieved).toBe('2026-10-03');
    expect(calls).toEqual(['wbsearchentities', 'wbgetentities', 'wbgetentities']);
    expect(c.stats()).toMatchObject({ lookups: 1, hits: 1, misses: 0, failures: 0 });
    // a thing with a key already is fetched by it, with no search
    calls.length = 0;
    await c.lookup({ ...described('bearing.ball', 'ball bearing', ['component']), keys: { wikidata: 'Q0' } });
    expect(calls).toEqual(['wbgetentities', 'wbgetentities']);
    // a name that matches nothing exactly is a miss, not a guess
    const miss = await c.lookup(described('x', 'ball bearing company', ['component']));
    expect(miss).toBeNull();
    expect(c.stats().misses).toBe(1);
    // the server refusing is a failure the expander will record
    let tried = 0;
    const refusing = wikidata({ fetch: (async () => { tried++; return { ok: false, status: 403, json: async () => ({}) } as Response; }) as unknown as typeof fetch, gapMs: 0, backoffMs: 60_000 });
    await expect(refusing.lookup(described('x', 'ball bearing', ['component']))).rejects.toThrow('HTTP 403');
    expect(refusing.stats()).toMatchObject({ failures: 1, lastError: 'HTTP 403' });
    // and then it is left alone: the next lookup fails at once without a request, saying so
    await expect(refusing.lookup(described('y', 'ball bearing', ['component']))).rejects.toThrow(/backing off until/);
    expect(tried).toBe(1);
    expect(refusing.stats().failures).toBe(2);
  });

  it.skipIf(!reachable)('looks up a ball bearing on Wikidata itself and reads real statements with their ids', async () => {
    const c = wikidata();
    const r = await c.lookup(described('bearing.ball', 'ball bearing', ['component'], ['ball bearing']));
    expect(r).not.toBeNull();
    expect(r!.key).toMatch(/^Q\d+$/);
    expect(r!.label.toLowerCase()).toBe('ball bearing');
    expect(r!.links.length).toBeGreaterThan(0);
    for (const l of r!.links) expect(l.key).toMatch(/^Q\d+$/);
    expect(r!.url).toBe(`https://www.wikidata.org/wiki/${r!.key}`);
  });

  it(`says whether the live lookup ran here (${reachable ? 'it did' : 'the host was not reachable from this run'})`, () => {
    expect(typeof reachable).toBe('boolean');
  });
});

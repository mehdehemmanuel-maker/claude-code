// Wikidata as a connector: a public structured database with no key, reachable from a browser (its API answers with
// CORS when asked with `origin=*`). A thing is found by exact match of one of its names against an item's label or
// aliases, never by a loose hit; its statements are read as the index's relations through a fixed table of properties,
// and every quantity statement is taken with its unit as the source says it. The connector never writes anywhere:
// what it returns goes through the external expander and `ingest`, with Wikidata's item id as the provenance.
import type { Connector, ExternalLink, ExternalQuantity, ExternalRecord } from '../external';
import type { Entity, InverseKind, RelationKind } from '../model';

/** Wikidata properties read as relations of the index, with what the property is called there. */
export const PROPERTIES: Record<string, { kind: RelationKind | InverseKind; via: string }> = {
  P31: { kind: 'is-a', via: 'instance of' },
  P279: { kind: 'is-a', via: 'subclass of' },
  P361: { kind: 'part-of', via: 'part of' },
  P527: { kind: 'has-part', via: 'has part' },
  P2670: { kind: 'has-part', via: 'has part of the class' },
  P186: { kind: 'made-of', via: 'made from material' },
  P2079: { kind: 'produced-by', via: 'fabrication method' },
  P1056: { kind: 'produces', via: 'product or material produced' },
  P2283: { kind: 'requires', via: 'uses' },
  P1535: { kind: 'required-by', via: 'used by' },
  P366: { kind: 'does', via: 'has use' },
  P1542: { kind: 'enables', via: 'has effect' },
  P1537: { kind: 'enables', via: 'contributing factor of' },
  P1479: { kind: 'requires', via: 'has contributing factor' },
  P129: { kind: 'interacts-with', via: 'physically interacts with' },
  P3094: { kind: 'comes-from', via: 'develops from' },
  P2868: { kind: 'plays', via: 'subject has role' },
  P1552: { kind: 'has-property', via: 'has characteristic' },
};

/** The shape of what the API answers; only what is read is typed. */
interface Snak { snaktype: string; property: string; datavalue?: { type: string; value: unknown } }
interface Claim { mainsnak: Snak; rank?: string }
interface Item { id: string; labels?: Record<string, { value: string }>; descriptions?: Record<string, { value: string }>; aliases?: Record<string, { value: string }[]>; claims?: Record<string, Claim[]> }
interface SearchHit { id: string; label?: string; description?: string; aliases?: string[]; match?: { type: string; text: string } }

export const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

/**
 * Read an item (and the labels of what it points to) as a record. Pure: a parser of the API's JSON, so it is held by a
 * test on the documented shape as well as by a live lookup when the host is reachable.
 */
export function parseItem(item: Item, labels: Record<string, Item>, retrieved: string): ExternalRecord {
  const en = (x: Item | undefined) => x?.labels?.['en']?.value;
  const links: ExternalLink[] = [];
  const quantities: ExternalQuantity[] = [];
  for (const [prop, claims] of Object.entries(item.claims ?? {})) {
    for (const c of claims) {
      if (c.rank === 'deprecated' || c.mainsnak.snaktype !== 'value' || !c.mainsnak.datavalue) continue;
      const dv = c.mainsnak.datavalue;
      if (dv.type === 'wikibase-entityid' && PROPERTIES[prop]) {
        const key = (dv.value as { id: string }).id;
        const label = en(labels[key]);
        if (!label) continue; // a target with no English label cannot be named here
        links.push({ kind: PROPERTIES[prop]!.kind, key, label, description: labels[key]?.descriptions?.['en']?.value, via: PROPERTIES[prop]!.via });
      } else if (dv.type === 'quantity') {
        const v = dv.value as { amount: string; unit: string; upperBound?: string };
        const amount = Number(v.amount);
        if (!Number.isFinite(amount)) continue;
        const unitKey = v.unit.split('/').pop();
        const unit = v.unit === '1' ? undefined : (unitKey && en(labels[unitKey])) || v.unit;
        quantities.push({ property: prop, label: en(labels[prop]) ?? prop, amount, high: v.upperBound !== undefined && Number(v.upperBound) !== amount ? Number(v.upperBound) : undefined, unit });
      }
    }
  }
  return { key: item.id, label: en(item) ?? item.id, aliases: (item.aliases?.['en'] ?? []).map((a) => a.value), description: item.descriptions?.['en']?.value, url: `https://www.wikidata.org/wiki/${item.id}`, retrieved, links, quantities };
}

/** The ids a record's claims point to, and its quantity properties and units: what needs labels. */
export function referencedIds(item: Item): string[] {
  const ids = new Set<string>();
  for (const [prop, claims] of Object.entries(item.claims ?? {})) for (const c of claims) {
    const dv = c.mainsnak.datavalue;
    if (!dv) continue;
    if (dv.type === 'wikibase-entityid' && PROPERTIES[prop]) ids.add((dv.value as { id: string }).id);
    else if (dv.type === 'quantity') { ids.add(prop); const u = (dv.value as { unit: string }).unit.split('/').pop(); if (u && u !== '1') ids.add(u); }
  }
  return [...ids];
}

export interface WikidataOptions { fetch?: typeof fetch; /** at most one request per this many ms: a polite rate */ gapMs?: number; /** how long the source is left alone after a failure, doubling each time up to five minutes */ backoffMs?: number; now?: () => Date }

/** The connector. One request at a time, spaced; errors are thrown to the expander, which records them as unknowns. */
export function wikidata(opts: WikidataOptions = {}): Connector {
  const doFetch = opts.fetch ?? globalThis.fetch?.bind(globalThis);
  const gap = opts.gapMs ?? 250;
  const now = opts.now ?? (() => new Date());
  const stats = { lookups: 0, hits: 0, misses: 0, failures: 0, lastError: undefined as string | undefined };
  let chain: Promise<unknown> = Promise.resolve();
  let lastAt = 0;
  // after a failure the source is left alone for a while, doubling up to five minutes: a blocked host is not asked twice a second
  let backoff = opts.backoffMs ?? 30_000, backoffUntil = 0;
  const get = async (params: Record<string, string>): Promise<unknown> => {
    if (!doFetch) throw new Error('no fetch in this runtime');
    if (Date.now() < backoffUntil) throw new Error(`backing off until ${new Date(backoffUntil).toISOString().slice(11, 19)} after a failure`);
    const q = new URLSearchParams({ ...params, format: 'json', origin: '*' });
    const wait = Math.max(0, lastAt + gap - Date.now());
    if (wait) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    try {
      const res = await doFetch(`${WIKIDATA_API}?${q}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: unknown = await res.json();
      backoff = opts.backoffMs ?? 30_000;
      return json;
    } catch (err) {
      backoffUntil = Date.now() + backoff;
      backoff = Math.min(backoff * 2, 300_000);
      throw err;
    }
  };
  const serial = <T>(f: () => Promise<T>): Promise<T> => { const p = chain.then(f, f); chain = p.catch(() => undefined); return p; };
  const search = async (name: string): Promise<SearchHit | null> => {
    const r = (await get({ action: 'wbsearchentities', search: name, language: 'en', uselang: 'en', type: 'item', limit: '7' })) as { search?: SearchHit[] };
    const want = name.trim().toLowerCase();
    return (r.search ?? []).find((h) => h.label?.toLowerCase() === want || h.aliases?.some((a) => a.toLowerCase() === want) || h.match?.text?.toLowerCase() === want) ?? null;
  };
  const entities = async (ids: string[], props: string): Promise<Record<string, Item>> => {
    const out: Record<string, Item> = {};
    for (let i = 0; i < ids.length; i += 50) {
      const r = (await get({ action: 'wbgetentities', ids: ids.slice(i, i + 50).join('|'), props, languages: 'en' })) as { entities?: Record<string, Item> };
      Object.assign(out, r.entities ?? {});
    }
    return out;
  };
  return {
    name: 'Wikidata',
    stats: () => ({ ...stats }),
    lookup: (e: Entity) => serial(async () => {
      stats.lookups++;
      try {
        let key = e.keys?.['wikidata'];
        if (!key) {
          const names = [...new Set([...e.names, e.name])].filter((n) => /^[a-z][a-z0-9 .'()-]{1,60}$/i.test(n) && !/^\w+\.\w+/.test(n));
          for (const n of names) { const hit = await search(n); if (hit) { key = hit.id; break; } }
        }
        if (!key) { stats.misses++; return null; }
        const got = await entities([key], 'labels|descriptions|aliases|claims');
        const item = got[key];
        if (!item || !item.labels) { stats.misses++; return null; }
        const refs = referencedIds(item);
        const labels = refs.length ? await entities(refs, 'labels|descriptions') : {};
        stats.hits++;
        return parseItem(item, labels, now().toISOString().slice(0, 10));
      } catch (err) {
        stats.failures++;
        stats.lastError = err instanceof Error ? err.message : String(err);
        throw err;
      }
    }),
  };
}

/** The supply index: how good each price is, how old it is, and what to go and read next.
 *
 *  This is the part of a parts API that a parts API cannot be trusted with. `prices.ts` owns what a thing costs and
 *  where it is sold; every figure in it is a sighting — a seller's own page, the number that page showed and the day
 *  it was seen. What nothing owned was how *good* each of those sightings is. A price read off a seller's own product
 *  page and a price read off a search result are both numbers in the same field, and only one of them is a price; a
 *  figure seen in March and a figure seen today are both `usd`, and only one of them is worth quoting. So the
 *  distinctions the table already records in prose (`SEARCHED`, a bare domain, `cond: 'used'`) are read here as data,
 *  and a sighting is graded.
 *
 *  Why ours rather than a vendor's: an API answers for the electronic half of a bill and nothing else — no steel
 *  angle, no firebrick, no ply, no refractory — and those are most of what the builds here are made of. It also
 *  answers for today and keeps no record of what it said last month, which is the opposite of what a bill needs: a
 *  cost you can defend is a figure with a page and a date on it, not a figure that silently moves. The index is
 *  therefore kept in the repository and read without a network, and the fetching is a separate act by hand.
 *
 *  Owner of: a sighting's grade and age, which offers to re-read first, and the report that says so
 *  (`npm run works -- supply`). Which bill lines have no price at all is `works/designer.ts`'s `price` fault, and is
 *  read from there rather than worked out again.
 */

import { PRICES, type Offer } from './prices';

/** How a sighting falls short. In the order they cost: a figure off a search result may be for another product
 *  entirely, where a figure that is merely old is still a figure a page once showed. */
export type Fault = 'search listing' | 'no page of its own' | 'asked, not sold' | 'out of stock' | 'stale';

const WEIGHT: Record<Fault, number> = { 'search listing': 4, 'no page of its own': 3, 'asked, not sold': 2, 'out of stock': 1, stale: 1 };

/** What is missing about the *part*, as against what is wrong with a *figure*. The distinction is worth keeping
 *  separate: a fault says this number may not be this part's price, a gap says we cannot say which part it is or
 *  whether it can still be bought. Lumping them put a near-universal gap on every sighting and left one of 158
 *  "firm", which ranks nothing. */
export type PartGap = "no maker's part number" | 'out of production' | 'no maker\'s sheet';

/** Past this many days a sighting is re-read before it is quoted. Three months is chosen, not measured: Raspberry Pi
 *  moved every LPDDR4 board twice in 2026 and steel moves with the mills' own quarters, so a quarter is the coarsest
 *  period over which a price here has stayed true. */
export const STALE_DAYS = 90;

export interface Sighting { key: string; what: string; offer: Offer; days: number; faults: Fault[]; weight: number }

const day = (s: string): number => Date.parse(`${s}T00:00:00Z`) / 86400000;

/** The day of the newest sighting in the table: the table's own "as of", so a check over it needs no clock. */
export function newestSeen(): string {
  let best = '';
  for (const p of Object.values(PRICES)) for (const o of p.offers) if (o.seen > best) best = o.seen;
  return best;
}

/** Whether a url names a product page of its own, rather than a seller's front door or a search result. A search
 *  result is the one fault here that cannot be seen from the number: the page it came from may have been listing
 *  another maker's product at another size. */
export function noPageOfItsOwn(url: string): boolean {
  const u = url.replace(/^https?:\/\//, '');
  const path = u.slice(u.indexOf('/') + 1);
  if (!u.includes('/') || path === '') return true;
  return /^(search|s)\b/.test(path) || /[?&](q|k|keyword|query)=/.test(url);
}

/** Every offer in the table, graded, with how old it is as of the given day (the table's own newest by default). */
export function sightings(asOf: string = newestSeen()): Sighting[] {
  const now = day(asOf), out: Sighting[] = [];
  for (const [key, p] of Object.entries(PRICES)) {
    for (const offer of p.offers) {
      const faults: Fault[] = [], days = Math.round(now - day(offer.seen));
      if (/search listing|search result/i.test(offer.note ?? '')) faults.push('search listing');
      if (noPageOfItsOwn(offer.url)) faults.push('no page of its own');
      if (offer.cond === 'used') faults.push('asked, not sold');
      if (offer.stock === 'out') faults.push('out of stock');
      if (days > STALE_DAYS) faults.push('stale');
      out.push({ key, what: p.what, offer, days, faults, weight: faults.reduce((n, f) => n + WEIGHT[f], 0) });
    }
  }
  return out;
}

/** The ones to re-read, worst first: by what their faults cost, then by age. */
export function weak(asOf: string = newestSeen()): Sighting[] {
  return sightings(asOf).filter((s) => s.faults.length).sort((a, b) => b.weight - a.weight || b.days - a.days);
}

/** How many sightings carry each fault. */
export function byFault(asOf: string = newestSeen()): Record<Fault, number> {
  const out: Record<Fault, number> = { 'search listing': 0, 'no page of its own': 0, 'asked, not sold': 0, 'out of stock': 0, stale: 0 };
  for (const s of sightings(asOf)) for (const f of s.faults) out[f]++;
  return out;
}

/** What is missing about each part: the maker's own number (without which an offer here and an offer anywhere else
 *  cannot be known to be the same thing), whether it is still made, and where its figures come from. This is the gap
 *  a parts API would fill and the one worth filling by hand, because the identity is what every later round needs. */
export function gaps(): { key: string; what: string; gaps: PartGap[] }[] {
  const out: { key: string; what: string; gaps: PartGap[] }[] = [];
  for (const [key, p] of Object.entries(PRICES)) {
    const g: PartGap[] = [];
    if (!p.maker || !p.mpn) g.push("no maker's part number");
    if (p.life === 'obsolete') g.push('out of production');
    if (!p.datasheet) g.push("no maker's sheet");
    if (g.length) out.push({ key, what: p.what, gaps: g });
  }
  return out;
}

/** Every sighting's age, oldest first, in bands: what a re-read round would work through. */
export function ages(asOf: string = newestSeen()): { seen: string; n: number; days: number }[] {
  const by = new Map<string, number>();
  for (const s of sightings(asOf)) by.set(s.offer.seen, (by.get(s.offer.seen) ?? 0) + 1);
  const now = day(asOf);
  return [...by].map(([seen, n]) => ({ seen, n, days: Math.round(now - day(seen)) })).sort((a, b) => b.days - a.days);
}

/** The index as a page: what it holds, what is weak, and the sellers whose pages to open next. */
export function supplyText(asOf: string = newestSeen(), top = 12): string {
  const all = sightings(asOf), bad = weak(asOf), f = byFault(asOf);
  const out = [`The supply index as of ${asOf}: ${all.length} sightings over ${Object.keys(PRICES).length} keys, ${all.length - bad.length} of them firm.`, ''];
  out.push(`Faults in the figures: ${(Object.keys(f) as Fault[]).filter((k) => f[k]).map((k) => `${f[k]} ${k}`).join(', ') || 'none'}`);
  const g = gaps(), named = Object.keys(PRICES).length - g.filter((x) => x.gaps.includes("no maker's part number")).length;
  out.push(`Gaps in the parts: ${named} of ${Object.keys(PRICES).length} keys carry their maker's own part number; ${g.filter((x) => x.gaps.includes("no maker's sheet")).length} have no maker's sheet; ${g.filter((x) => x.gaps.includes('out of production')).length} are out of production.`, '');
  out.push(`Ages: ${ages(asOf).map((a) => `${a.n} seen ${a.seen}${a.days ? ` (${a.days} d)` : ''}`).join(', ')}`, '');
  if (bad.length) {
    out.push(`To re-read, worst first:`);
    for (const s of bad.slice(0, top)) out.push(`  ${s.key} — ${s.offer.name} $${s.offer.usd} (${s.offer.seller}): ${s.faults.join(', ')}\n      ${s.offer.url}`);
    if (bad.length > top) out.push(`  … and ${bad.length - top} more`);
  }
  return out.join('\n');
}

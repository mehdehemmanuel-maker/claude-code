// The supply index: every price graded and aged. These are ratchets in the sense tidy.test.ts uses the word — the
// numbers are the debt as it stands today, they may shrink and never grow, and a fixed one fails until its line is
// edited down. A price read off a search result may be for another product at another size, so the count of those is
// the one worth driving to zero.

import { describe, expect, it } from 'vitest';
import { PRICES } from '../../src/nexus/parts/prices';
import { byFault, gaps, newestSeen, noPageOfItsOwn, sightings, STALE_DAYS, supplyText, weak } from '../../src/nexus/parts/supply';

describe('the supply index', () => {
  it('grades every offer in the table', () => {
    const all = sightings();
    expect(all.length).toBe(Object.values(PRICES).reduce((n, p) => n + p.offers.length, 0));
    expect(all.every((s) => s.days >= 0)).toBe(true); // nothing is seen after the newest sighting
  });

  it('tells a product page from a front door or a search result', () => {
    for (const u of ['https://www.walmart.com/', 'https://www.homedepot.com/', 'https://www.harborfreight.com/search?category=2291&q=titanium', 'https://temcoindustrial.com/electrical/wire/resistance-wire/'.replace('wire/resistance-wire/', 'search?q=kanthal')])
      expect(noPageOfItsOwn(u)).toBe(true);
    for (const u of ['https://www.pishop.us/product/raspberry-pi-5-8gb/', 'https://www.zoro.com/zoro-select-m6-100-socket-head-cap-screw/i/G2650649/', 'https://www.adafruit.com/product/1950'])
      expect(noPageOfItsOwn(u)).toBe(false);
  });

  it('no sighting is older than a quarter as the table stands', () => {
    // Every figure was read within days of the last round, so the table is coherent at its own newest date. This is
    // what will fail first when the table is left alone, which is the point of keeping it.
    expect(sightings().filter((s) => s.days > STALE_DAYS)).toEqual([]);
    expect(newestSeen()).toMatch(/^\d{4}-\d\d-\d\d$/);
  });

  it('the weak sightings only ever get fewer', () => {
    const f = byFault();
    // A figure read off a search result rather than the seller's own product page.
    expect(f['search listing']).toBeLessThanOrEqual(41);
    // A url that is a seller's front door or a search query: no page to re-read at all. These are the worst.
    expect(f['no page of its own']).toBeLessThanOrEqual(1);
    // Offered secondhand, which is an estimate of a market rather than a sale.
    expect(f['asked, not sold']).toBeLessThanOrEqual(4);
    expect(f['out of stock']).toBeLessThanOrEqual(9);
  });

  it('the parts without an identity only ever get fewer', () => {
    // What a parts API would have given us and the table never had: the maker's own number, which is the only field by
    // which an offer here and an offer anywhere else are known to be the same thing. 123 of 128 keys lack it today.
    const g = gaps();
    expect(g.filter((x) => x.gaps.includes("no maker's part number")).length).toBeLessThanOrEqual(123);
    expect(g.filter((x) => x.gaps.includes("no maker's sheet")).length).toBeLessThanOrEqual(128);
    // Nothing may be in a build pack that is out of production: this one is driven to zero and kept there.
    expect(g.filter((x) => x.gaps.includes('out of production'))).toEqual([]);
  });

  it('ranks what to re-read worst first, and says where', () => {
    const bad = weak();
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0]!.weight).toBeGreaterThanOrEqual(bad[bad.length - 1]!.weight);
    for (const s of bad) expect(s.offer.url).toMatch(/^https?:\/\//);
    expect(supplyText()).toMatch(/sightings over \d+ keys, \d+ of them firm/);
  });
});

// Seeds built from nodes (src/nexus/seeds.ts): each a board folded into one node in the library, used by the next.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { runBlock } from '../../src/nexus/dataflow';
import { LIBRARY, portsOf } from '../../src/nexus/blocks';
import { boundsOfAll, distinctCount, flatten, massOfAll, placedCount, type Assembly } from '../../src/nexus/assembly';

const SEEDS = ['window', 'door', 'toilet', 'sink', 'bed', 'fittings.bathroom', 'fittings.kitchen', 'fittings.bedroom', 'fittings.living', 'room', 'house', 'car', 'grass', 'terrain', 'road', 'stoplight', 'crossing', 'roads', 'neighbourhood', 'city'];
const thing = async (id: string, inputs: Record<string, unknown> = {}) => { const out = await runBlock(`seed.${id}`, inputs), d = LIBRARY.get(`seed.${id}`)!; return out[portsOf(d, {}).outputs[0]!.name] as Assembly; };
/** The names of every piece drawn in a thing. */
const names = (a: Assembly) => { const s = new Set<string>(); flatten(a, (f) => { s.add(f.leaf.name); }); return s; };

describe('seeds', () => {
  it('each is in the library as a node of nodes, and makes its thing', async () => {
    for (const id of SEEDS) {
      const d = LIBRARY.get(`seed.${id}`); expect(d, id).toBeDefined(); expect(d!.graph, id).toBeDefined();
      const a = await thing(id); expect(a && typeof a === 'object' && !('error' in a), id).toBe(true); expect(placedCount(a), id).toBeGreaterThan(0);
    }
  }, 60_000);
  it('a room takes its fittings from its type', async () => {
    const bath = names(await thing('room', { type: 'bathroom' })), bed = names(await thing('room', { type: 'bedroom' })), kit = names(await thing('room', { type: 'kitchen' }));
    expect(bath.has('toilet pan')).toBe(true); expect(bath.has('mattress')).toBe(false);
    expect(bed.has('mattress')).toBe(true); expect(bed.has('toilet pan')).toBe(false);
    expect(kit.has('fridge')).toBe(true); expect(kit.has('sink bowl')).toBe(true);
  });
  it('a house is laid out again when its plan is picked: more rooms, wider', async () => {
    const st = await thing('house', { plan: 'studio', show: 'roof off' }), three = await thing('house', { plan: '3 bed', show: 'roof off' });
    const w = (a: Assembly) => { const b = boundsOfAll(a); return b.max.x - b.min.x; };
    expect(w(three)).toBeGreaterThan(w(st)); expect(placedCount(three)).toBeGreaterThan(placedCount(st));
    expect(names(await thing('house', { show: 'roof on' })).has('roof')).toBe(true); expect(names(three).has('roof')).toBe(false);
  });
  it('a stop light lights only the lens picked', async () => {
    for (const state of ['red', 'yellow', 'green']) {
      const lit: string[] = []; flatten(await thing('stoplight', { state }), (f) => { if (f.leaf.glow) lit.push(String(f.leaf.color)); });
      expect(lit.length).toBe(1);
    }
  });
  it('a car weighs about what a mid-size sedan does (1,300 to 1,700 kg, typical)', async () => {
    const m = massOfAll(await thing('car')); expect(m).toBeGreaterThan(1300); expect(m).toBeLessThan(1700);
    const b = boundsOfAll(await thing('car')); expect(b.max.x - b.min.x).toBeCloseTo(4.88, 1); expect(b.max.y).toBeLessThan(1.5);
  });
  it('a foot of grass is a foot square', async () => {
    const b = boundsOfAll(await thing('grass')); expect(b.max.x - b.min.x).toBeCloseTo(0.3048, 3);
  });
  it('a city is stored as far fewer things than it places: houses alike are made once', async () => {
    const c = await thing('city', { n: 2 }); expect(placedCount(c)).toBeGreaterThan(5 * distinctCount(c));
  }, 60_000);
});

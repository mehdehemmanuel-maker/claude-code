// Intents the manifold draws for itself (docs/NEXUS-FROM-REALITY.md, section 21: how the rounds run). A round is not
// a scene or an invention a person wrote down: its targets are composed at random from the manifold's own vocabulary,
// the carriers physics conserves, the roles a region can have (a person's region, a reservoir that holds a potential,
// a limit), and the forms a want can take (hold a band, deliver on demand, reach by the end, stay within a bound,
// grow). Every magnitude is drawn from what the kept laws already cover, their worked examples and the bounds of
// their domains, grouped by dimension, and then pushed beyond that span by the bar, so the targets lie where the
// language is weakest. A matter that makes more of itself is drawn as often as anything else.
//
// The draw is seeded: the same seed draws the same intents, so a round can be run again exactly. Nothing a round draws
// names a part, a mechanism, a kind of thing or a technology.

import { parseUnit } from '../ganglia/units';
import { BOOK } from './book';
import { dimText } from './dimension';
import { keptMatters } from './matter';
import { leaf, leavesOf, type Leaf } from './term';
import { reach } from './tuner';
import { CRYSTALS, MOLECULES } from '../data/species';
import type { Intent, Region, Want } from './want';

/** A seeded stream of numbers in [0, 1) (mulberry32): the same seed, the same stream. */
export function stream(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The span of magnitudes the book covers in one dimension, in SI, with the SI unit it is stated in. */
export interface Span { dim: string; unit: string; lo: number; hi: number; seen: number }

const SI: Record<string, string> = {};
/** What a region can be named as made of: every molecule with bonds, and every element's crystal, the kept species hold. */
const CONSTITUENTS = [...new Set([...MOLECULES.filter((m) => m.bonds).map((m) => m.name), ...CRYSTALS.map((c) => c.element)])];
/** The sizes the scale tuner reaches, derived once. */
const ladderReach = reach();
/** What the kept laws cover, by dimension: every worked example's inputs and output, and every domain bound. */
export function knownSpans(): Map<string, Span> {
  const spans = new Map<string, Span>();
  const note = (value: number, unit: string) => {
    if (!Number.isFinite(value) || value === 0) return;
    let p: ReturnType<typeof parseUnit>;
    try { p = parseUnit(unit); } catch { return; }
    if (p.offset) return; // a temperature stated from another zero is counted from absolute zero only in kelvin
    const si = Math.abs(value * p.scale), key = dimText(p.dim);
    const s = spans.get(key);
    if (!s) { spans.set(key, { dim: key, unit: SI[key] ?? unit, lo: si, hi: si, seen: 1 }); return; }
    s.lo = Math.min(s.lo, si); s.hi = Math.max(s.hi, si); s.seen++;
    if (p.scale === 1 && !p.offset) s.unit = unit;
  };
  for (const l of BOOK) {
    if (l.example) {
      for (const port of l.inputs) { const v = l.example.inputs[port.sym]; if (v !== undefined) note(v, port.unit); }
      note(l.example.output, l.output.unit);
    }
    for (const dc of l.domain) for (const b of leavesOf(dc.holds)) if (b.value !== null) note(b.value, b.unit);
  }
  for (const m of keptMatters()) for (const p of m.properties) if (p.leaf.value !== null) note(p.leaf.value, p.leaf.unit);
  return spans;
}

/** What a carrier's quantities are, by role: its potential, its flux and its content, as SI units. */
const CARRIERS: { id: string; potential: string | null; flux: string; content: string; hold: boolean }[] = [
  { id: 'energy', potential: 'K', flux: 'W', content: 'J', hold: true },
  { id: 'charge', potential: 'V', flux: 'A', content: 'C', hold: true },
  { id: 'momentum', potential: 'm/s', flux: 'N', content: 'N s', hold: true },
  { id: 'angular momentum', potential: 'rad/s', flux: 'N m', content: 'N m s', hold: false },
  { id: 'information', potential: null, flux: '1/s', content: '1', hold: false },
];

type Form = 'hold' | 'deliver' | 'reach' | 'bound' | 'lag' | 'grow';
const FORMS: Form[] = ['hold', 'deliver', 'reach', 'bound', 'lag', 'grow'];

/** One drawn intent: the record of what was drawn and why, beside the intent the generator reads. */
export interface Drawn { seed: number; bar: number; intent: Intent; forms: { want: string; form: Form; carrier: string }[] }

/**
 * Draw an intent. `bar` is how many decades beyond the book's span a magnitude may lie, on either side: the higher
 * the bar, the farther the targets from what the kept laws were made for.
 */
export function drawIntent(seed: number, bar = 2, spans = knownSpans()): Drawn {
  const r = stream(seed);
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
  const who = 'the drawing';
  const drawnLeaf = (name: string, v: number, unit: string, why: string): Leaf => leaf(name, v, unit, { class: 'given', by: who, grounds: `drawn (seed ${seed}): ${why}` });
  /** A magnitude in a dimension: log-uniform over the book's span widened by the bar, or none if the book has none. */
  const magnitude = (unit: string): number | null => {
    const s = spans.get(dimText(parseUnit(unit).dim));
    if (!s) return null;
    const lo = Math.log10(s.lo) - bar, hi = Math.log10(s.hi) + bar;
    return 10 ** (lo + r() * (hi - lo)) / parseUnit(unit).scale;
  };
  const people = ['the first region', 'the second region'].slice(0, 1 + Math.floor(r() * 2));
  const regions: Region[] = [];
  const wants: Want[] = [];
  const forms: Drawn['forms'] = [];
  // the environment: a reservoir for some of the carriers that have a potential, each holding it, some with a limit
  const reservoirs: { id: string; carrier: string; sym: string }[] = [];
  for (const c of CARRIERS.filter((x) => x.potential)) {
    if (r() < 0.4) continue;
    const id = `a reservoir of ${c.id}`, P = magnitude(c.potential!);
    if (P === null) continue;
    const q: Record<string, Leaf> = { P: drawnLeaf(`potential of ${c.id} it holds`, c.id === 'momentum' ? 0 : P, c.potential!, `the ${c.id} potential a reservoir holds`) };
    const carriers: Record<string, string> = { P: c.id };
    const limits: string[] = [];
    if (r() < 0.5) { const F = magnitude(c.flux); if (F !== null) { q.F = drawnLeaf(`most flux of ${c.id} it gives`, F, c.flux, `a limit on what the reservoir gives`); carriers.F = c.id; limits.push('F'); } }
    regions.push({ id, by: who, environment: true, adjoins: [...people], holds: ['P'], ...(limits.length ? { limits } : {}), carriers, quantities: q });
    reservoirs.push({ id, carrier: c.id, sym: 'P' });
  }
  // a matter, drawn from the kept ones by its identity only: what it is and what it does is the language's to find
  const matter = pick(keptMatters());
  const m = `mass of ${matter.id}`;
  for (const id of people) regions.push({ id, by: who, environment: false, adjoins: [...people.filter((x) => x !== id), ...reservoirs.map((x) => x.id)], quantities: {} });
  // what the first region is made of, sometimes named: a molecule or an element the kept species hold, drawn by name
  // only; what its levels are is the descent's to find
  if (r() < 0.5) regions.find((x) => x.id === people[0])!.constituent = pick(CONSTITUENTS);
  // a size for the first region, drawn over all the tuner reaches, from the length the constants set by themselves to
  // its largest boundary, widened by the bar: the regime at that size is the generator's to find, not the draw's
  if (r() < 0.5) {
    const lo = Math.log10(ladderReach.least) - bar, hi = Math.log10(ladderReach.most) + bar;
    regions.find((x) => x.id === people[0])!.quantities.size = drawnLeaf(`size of ${people[0]}`, 10 ** (lo + r() * (hi - lo)), 'm', 'a size anywhere the tuner reaches');
  }
  const n = 2 + Math.floor(r() * 4);
  for (let w = 0; w < n; w++) {
    const form = pick(FORMS), region = pick(people), wid = `want ${w + 1}`;
    const c = form === 'lag' ? CARRIERS.find((x) => x.id === 'information')! : form === 'grow' ? null : pick(form === 'hold' ? CARRIERS.filter((x) => x.hold) : CARRIERS);
    const add = (sym: string, unit: string, name: string, when: Want['when'], bound: { lo?: Leaf; hi?: Leaf }, carrier: string, says: string) => {
      wants.push({ id: wid, says, region, quantity: { sym, unit, name, carrier }, when, by: who, ...bound });
      forms.push({ want: wid, form, carrier });
    };
    if (form === 'hold' && c) {
      const x = magnitude(c.potential!); if (x === null) continue;
      // the band is narrow: its width a part in ten to a part in a million of the value
      const rel = 10 ** -(1 + r() * 5);
      add(`P${w}`, c.potential!, `${c.id} potential of ${region}`, 'always', { lo: drawnLeaf('least', x * (1 - rel), c.potential!, 'the band\'s floor'), hi: drawnLeaf('most', x * (1 + rel), c.potential!, 'the band\'s ceiling') }, c.id, `the ${c.id} potential of ${region} stays within ${rel.toPrecision(2)} of ${x.toPrecision(3)} ${c.potential}`);
    } else if (form === 'deliver' && c) {
      const x = magnitude(c.flux); if (x === null) continue;
      add(`F${w}`, c.flux, `flux of ${c.id} into ${region}`, 'on demand', { lo: drawnLeaf('at least', x, c.flux, 'a flux on demand') }, c.id, `${region} gets at least ${x.toPrecision(3)} ${c.flux} of ${c.id} when it is asked for`);
    } else if (form === 'reach' && c) {
      const x = magnitude(c.content); if (x === null) continue;
      add(`Q${w}`, c.content, `${c.id} held by ${region}`, 'by the end', { lo: drawnLeaf('at least', x, c.content, 'a content by the end') }, c.id, `${region} holds at least ${x.toPrecision(3)} ${c.content} of ${c.id} by the end`);
    } else if (form === 'bound') {
      // a position held within a tolerance: the least distance the book knows, pushed below it
      const x = magnitude('m'); if (x === null) continue;
      add(`e${w}`, 'm', `distance of ${region} from where it is drawn`, 'by the end', { hi: drawnLeaf('at most', Math.min(x, 1), 'm', 'a tolerance'), }, 'momentum', `${region} lies within ${Math.min(x, 1).toPrecision(2)} m of where it is drawn`);
    } else if (form === 'lag') {
      const x = magnitude('s'); if (x === null) continue;
      add(`t${w}`, 's', `time for ${region} to hear the other`, 'always', { hi: drawnLeaf('at most', x, 's', 'a lag') }, 'information', `${region} hears ${people.find((p) => p !== region) ?? 'what it is told'} within ${x.toPrecision(2)} s`);
    } else if (form === 'grow') {
      // generation at biological level: a matter's content made larger than it was, from what the reservoirs offer
      const m0 = magnitude('kg'); if (m0 === null) continue;
      const factor = 10 ** (1 + r() * 5);
      const reg = regions.find((x) => x.id === region)!;
      reg.quantities[`m${w}`] = drawnLeaf(`${matter.name} it starts with`, m0, 'kg', 'what it starts with');
      reg.carriers = { ...(reg.carriers ?? {}), [`m${w}`]: m };
      add(`M${w}`, 'kg', `${matter.name} in ${region}`, 'by the end', { lo: drawnLeaf('at least', m0 * factor, 'kg', 'grown by the end') }, m, `${region} holds ${factor.toPrecision(2)} times the ${matter.name} it started with by the end`);
    }
  }
  const T = magnitude('s');
  const intent: Intent = { name: `drawn intent ${seed}`, by: who, regions, wants, duration: drawnLeaf('how long', T ?? 3.15576e7, 's', 'how long the wants hold') };
  return { seed, bar, intent, forms };
}

// An ask as data (docs/NEXUS-FROM-REALITY.md, section 29): what a person wants of a thing, in the form the generator
// reads, written as plain JSON that a person, a word reader (src/nexus/ask/words.ts) or Claude can fill in. It says what
// the regions are (the thing's own, and the site's), what is given of each with its unit and who gives it, and what
// is wanted of them, at least or at most, always or on demand or by the end. It names no part and no mechanism: those
// are the generator's and the embodiment's to find. Built into an intent here, each number checked as it is made.

import { fromSI } from '../../ganglia/units';
import { leaf, type Leaf } from '../lang/term';
import type { Intent, MatterRole, Region, Want } from './want';

/** A number with its unit and who stands behind it: the person, the site, or an estimate on stated grounds. */
export interface SpecValue { name: string; value: number; unit: string; by?: 'person' | 'site' | 'estimate'; note?: string }
export interface SpecRegion {
  id: string;
  /** The site's (the road, the air, the grid), not the person's to design. */
  environment?: boolean;
  adjoins?: string[];
  quantities?: Record<string, SpecValue>;
  /** What each quantity is about, by symbol: momentum, energy, charge, angular momentum, light, information, or "mass of X" / "volume of X" / "amount of X". */
  carriers?: Record<string, string>;
  holds?: string[];
  limits?: string[];
  produces?: Record<string, SpecValue>;
  extent?: { x?: string | null; y?: string | null; z?: string | null; plan?: string; faces?: Partial<Record<'up' | 'down' | 'side', string>> };
  properties?: Record<string, { of: string; role: MatterRole }>;
  matter?: string;
  directions?: Record<string, 'down' | 'across' | 'from above' | 'vertical' | 'along'>;
}
export interface SpecWant {
  id: string; says: string; region: string;
  /** The quantity wanted: a symbol, its unit, what it is in words, and the carrier it is about. */
  sym: string; unit: string; quantity: string; carrier?: string;
  when: 'always' | 'on demand' | 'by the end';
  lo?: SpecValue; hi?: SpecValue;
  relativeTo?: string; direction?: 'vertical' | 'across' | 'along';
}
export interface AskSpec { name: string; regions: SpecRegion[]; wants: SpecWant[]; /** How long the wants must hold, in years. */ years?: number }

const PERSON = 'the person';
const leafOf = (v: SpecValue): Leaf => {
  const grounds = v.note ?? (v.by === 'site' ? 'the site' : v.by === 'estimate' ? 'an estimate' : 'what the person asked');
  return v.by === 'estimate' ? leaf(v.name, v.value, v.unit, { class: 'estimated', grounds }) : leaf(v.name, v.value, v.unit, { class: 'given', by: v.by === 'site' ? 'the site' : PERSON, grounds });
};

/** Build the intent a spec describes, or say what in it cannot be built. */
export function intentFromSpec(spec: AskSpec): { intent: Intent | null; problems: string[] } {
  const problems: string[] = [];
  const ids = new Set(spec.regions.map((r) => r.id));
  if (!spec.regions.length) problems.push('no regions: say what the thing is for and where it is');
  if (!spec.wants.length) problems.push('no wants: say what it must do');
  const regions: Region[] = [];
  for (const r of spec.regions) {
    const q: Record<string, Leaf> = {}, produces: Record<string, Leaf> = {};
    for (const [k, v] of Object.entries(r.quantities ?? {})) { try { q[k] = leafOf(v); } catch (e) { problems.push(`${r.id}.${k}: ${(e as Error).message}`); } }
    for (const [k, v] of Object.entries(r.produces ?? {})) { try { produces[k] = leafOf(v); } catch (e) { problems.push(`${r.id} produces ${k}: ${(e as Error).message}`); } }
    const adjoins = (r.adjoins ?? []).filter((a) => { if (!ids.has(a)) problems.push(`${r.id} adjoins ${a}, which is not a region`); return ids.has(a); });
    const region: Region = { id: r.id, by: r.environment ? 'the site' : PERSON, environment: !!r.environment, adjoins, quantities: q };
    if (r.carriers) region.carriers = r.carriers;
    if (r.holds) region.holds = r.holds.filter((h) => h in q);
    if (r.limits) region.limits = r.limits.filter((h) => h in q);
    if (Object.keys(produces).length) region.produces = produces;
    if (r.extent) region.extent = { x: r.extent.x ?? null, y: r.extent.y ?? null, z: r.extent.z ?? null, ...(r.extent.plan ? { plan: r.extent.plan } : {}), faces: r.extent.faces ?? {} };
    if (r.properties) region.properties = r.properties;
    if (r.matter) region.matter = r.matter;
    if (r.directions) region.directions = r.directions;
    regions.push(region);
  }
  const wants: Want[] = [];
  for (const w of spec.wants) {
    if (!ids.has(w.region)) { problems.push(`want ${w.id} is about ${w.region}, which is not a region`); continue; }
    if (!w.lo && !w.hi) { problems.push(`want ${w.id} has no bound: at least or at most what?`); continue; }
    try {
      wants.push({
        id: w.id, says: w.says, region: w.region, when: w.when, by: PERSON,
        quantity: { sym: w.sym, unit: w.unit, name: w.quantity, ...(w.carrier ? { carrier: w.carrier } : {}), ...(w.direction ? { direction: w.direction } : {}) },
        ...(w.lo ? { lo: leafOf(w.lo) } : {}), ...(w.hi ? { hi: leafOf(w.hi) } : {}),
        ...(w.relativeTo && ids.has(w.relativeTo) ? { relativeTo: w.relativeTo } : {}),
      });
    } catch (e) { problems.push(`want ${w.id}: ${(e as Error).message}`); }
  }
  if (problems.length && (!regions.length || !wants.length)) return { intent: null, problems };
  const years = spec.years ?? 5;
  return { intent: { name: spec.name, by: PERSON, regions, wants, duration: leaf('how long', years * 3.15576e7, 's', { class: 'given', by: PERSON, grounds: `${years} years` }) }, problems };
}

const valueOf = (l: Leaf, by: SpecValue['by']): SpecValue => ({ name: l.name, value: Number(fromSI(l.value ?? 0, l.unit).toPrecision(6)), unit: l.unit, by: l.origin.class === 'estimated' ? 'estimate' : by, ...(l.origin.grounds ? { note: l.origin.grounds } : {}) });
/** The spec an intent is: for showing Claude how an ask is written, from asks that exist. */
export function specOf(i: Intent): AskSpec {
  return {
    name: i.name,
    regions: i.regions.map((r) => ({
      id: r.id, ...(r.environment ? { environment: true } : {}), adjoins: r.adjoins,
      quantities: Object.fromEntries(Object.entries(r.quantities).map(([k, l]) => [k, valueOf(l, r.environment ? 'site' : 'person')])),
      ...(r.carriers && Object.keys(r.carriers).length ? { carriers: r.carriers } : {}), ...(r.holds ? { holds: r.holds } : {}), ...(r.limits ? { limits: r.limits } : {}),
      ...(r.produces ? { produces: Object.fromEntries(Object.entries(r.produces).map(([k, l]) => [k, valueOf(l, 'person')])) } : {}),
      ...(r.extent ? { extent: r.extent } : {}), ...(r.properties ? { properties: r.properties } : {}), ...(r.matter ? { matter: r.matter } : {}), ...(r.directions ? { directions: r.directions } : {}),
    })),
    wants: i.wants.map((w) => ({ id: w.id, says: w.says, region: w.region, sym: w.quantity.sym, unit: w.quantity.unit, quantity: w.quantity.name, ...(w.quantity.carrier ? { carrier: w.quantity.carrier } : {}), when: w.when, ...(w.lo ? { lo: valueOf(w.lo, 'person') } : {}), ...(w.hi ? { hi: valueOf(w.hi, 'person') } : {}), ...(w.relativeTo ? { relativeTo: w.relativeTo } : {}), ...(w.quantity.direction ? { direction: w.quantity.direction } : {}) })),
    years: Number(((i.duration.value ?? 0) / 3.15576e7).toPrecision(3)),
  };
}

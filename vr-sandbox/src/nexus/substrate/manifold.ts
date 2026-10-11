// The generator of structure: from what a person wants of regions to the regions, boundaries, paths, stores,
// conversions, observers and modulations that the wants' balances require. Every rule is about carriers, never
// about a kind of thing:
//
//   - one region has one potential at a time: two values held by one region are its range over time;
//   - a held potential exchanges its carrier with every neighbour at another potential, so its balance needs a
//     supply when a neighbour can pull it below the band and a removal when one can push it above, or what is made
//     inside it must leave;
//   - a supply comes from a reservoir that is always at a driving potential, or else from a conversion of a carrier
//     the environment offers power in (a moving region's power is the store it carries); a removal goes to a
//     reservoir always below, or is pumped up to one by a conversion;
//   - a flux delivered on demand arrives at a point of use from a source above it, through a path the person
//     modulates, or is pumped there; a delivered charge returns; delivered matter leaves when a want bounds what the
//     region may keep, and is kept otherwise;
//   - a bounded content intercepts whatever brings the carrier in and sends it to a sink below;
//   - a region held in place sends every momentum it receives to a region at rest, through a path whose stiffness
//     bounds the displacement, meeting it over an area its flux-density limit allows;
//   - a region that moves carries its store, converts it to momentum at a contact that rolls, and loses momentum to
//     the fluid it moves through; what is held against a varying neighbour is observed and modulated, or smoothed
//     by a store;
//   - a path that must carry a flux within a potential drop has a least conductance and dissipates, so it has a
//     heat balance of its own and is opened when its flux exceeds what that balance allows;
//   - every loss is heat that its region must shed.
//
// Each element carries the lineage of every want that needs it. What a rule cannot do is a gap, with what it
// lacks; and every quantity the intent states that no rule used is reported, because it is information the
// language cannot read.

import { carrierById, coupling, family, reaction, roleOf, type Carrier, type Role } from './carrier';
import { gravity } from './field';
import { CONST } from '../book/constants';
import { phaseAt, vapourPressure } from './phase';
import { dimOf, sameDim } from '../lang/dimension';
import { regimeAt, type Regime } from './tuner';
import { descend, heat, hottestOf, motion, potential, DEFAULT_TOLERANCE, type Descent, type GapKind, type Process } from './depth';
import { toSI } from '../../ganglia/units';
import { facesCrossed, shapeOf, type Face, type Shape } from './shape';
import { chooseMatter, keptMatters, propertyOf, statedOf } from './matter';
import { EULER, runNetwork, sizeMembers } from './size';
import { barForces, carries, count, loadOn } from './network';
import { solveFrame } from './frame';
import { leastHeatedLength } from './transport';
import { dressedMatters, lumberCatalogue } from '../parts/stock';
import { ofLeaf } from '../lang/evaluate';
import { leaf, type Leaf } from '../lang/term';
import { regionOf, touches, type Intent, type Region, type Want } from '../ask/want';

export type Kind = 'boundary' | 'path' | 'store' | 'conversion' | 'region' | 'observer' | 'modulation' | 'contact' | 'bound';

export interface Lineage {
  want: string | null;
  rule: string;
  /** The generated laws the element rests on, by id. */
  laws: string[];
  /** The element that required this one. */
  parent: string | null;
}

export interface Element {
  id: string;
  kind: Kind;
  carrier: string;
  says: string;
  /** For a boundary or contact: the two regions; for a path: from, through, to. */
  regions: string[];
  /** What is fixed about it, as numbers with their unit and how they were reached. */
  values: { name: string; value: number; unit: string; from: string }[];
  why: Lineage;
  /** Every other want or element that needs it. */
  also: Lineage[];
  /** When set, one of the elements with this group suffices: alternatives the language cannot yet choose between. */
  oneOf?: string;
}

export interface Gap {
  want: string | null; element: string | null; lacks: string; carrier: string | null;
  /** What the gap is a gap in, where the rule that found it can say (a datum, a relation, a state variable, a law, ...). */
  kind?: GapKind;
  /** The distinction it ranks under, where the rule that found it states one rather than leaving it to be read from its words. */
  distinction?: string;
}
type GapFn = (want: string | null, element: string | null, carrier: string | null, lacks: string, meta?: { kind: GapKind; distinction: string }) => void;

/** The regime the intent's sizes lie in, as the tuner derives it: what the rules may assume there, and what they may not. */
export interface IntentRegime { L: number; T: number | null; from: string; state: Regime['state']; near: string[] }
/** How deep a potential the intent holds or wants must be followed: the levels it takes apart, and the one it leaves whole. */
export interface IntentDepth { from: string; want: string | null; descent: Descent }
export interface Structure { intent: string; elements: Element[]; gaps: Gap[]; unused: { region: string; sym: string; name: string }[]; regimes: IntentRegime[]; depths: IntentDepth[] }

/** A region's potential of one carrier over time: one value, or the range of the values it holds. */
interface State { region: string; lo: number; hi: number; leaves: Leaf[] }

export function generate(intent: Intent): Structure {
  const elements: Element[] = [];
  const gaps: Gap[] = [];
  const used = new Set<string>();
  const siteGravity = intent.regions.find((r) => r.gravity);
  if (siteGravity) used.add(`${siteGravity.id}.${siteGravity.gravity}`);
  const g = siteGravity ? siteGravity.quantities[siteGravity.gravity!]!.value! : gravity().value!;
  const gravityName = siteGravity ? siteGravity.quantities[siteGravity.gravity!]!.name : 'standard gravity (the site does not state its own)';

  /** A region the language generates is immersed in a region of the intent: what touches it is what touches that. */
  const hosts = new Map<string, string>();
  const placeOf = (id: string) => hosts.get(id) ?? id;
  const add = (e: Omit<Element, 'also'> & { oneOf?: string }): Element => {
    const found = elements.find((x) => x.id === e.id);
    if (found) {
      if (!found.also.some((l) => l.want === e.why.want && l.rule === e.why.rule) && !(found.why.want === e.why.want && found.why.rule === e.why.rule)) found.also.push(e.why);
      for (const v of e.values) if (!found.values.some((x) => x.name === v.name)) found.values.push(v);
      return found;
    }
    const el: Element = { ...e, also: [] };
    elements.push(el);
    return el;
  };
  const cite = (e: Element, ...ids: string[]) => { e.why.laws = [...new Set([...e.why.laws, ...ids])]; };
  const put = (e: Element | undefined | null, v: Element['values'][number]) => { if (e && !e.values.some((x) => x.name === v.name)) e.values.push(v); };
  const gap: GapFn = (want, element, carrier, lacks, meta) => { if (!gaps.some((x) => x.want === want && x.element === element && x.lacks === lacks)) gaps.push({ want, element, carrier, lacks, ...(meta ?? {}) }); };
  const lawIds = (c: Carrier, ...names: string[]) => family(c).filter((l) => names.some((n) => l.id.endsWith(`.${n}`))).map((l) => l.id);
  const use = (r: Region, sym: string) => used.add(`${r.id}.${sym}`);

  /** Quantities of a region by carrier and role: what it brings or is, not its limits. */
  const said = (r: Region, c: string, role: Role, limits = false): { sym: string; leaf: Leaf }[] => {
    const out: { sym: string; leaf: Leaf }[] = [];
    for (const [sym, l] of [...Object.entries(r.quantities), ...Object.entries(r.produces ?? {})]) {
      if (r.carriers?.[sym] !== c || (r.limits ?? []).includes(sym) !== limits) continue;
      if ((r.holds ?? []).includes(sym) && role !== 'potential') continue;
      if (roleOf(carrierById(c), l.unit) === role) { out.push({ sym, leaf: l }); use(r, sym); }
    }
    return out;
  };
  const stateOf = (r: Region, c: string): State | null => {
    const syms = (r.holds ?? []).filter((sym) => r.carriers?.[sym] === c && roleOf(carrierById(c), r.quantities[sym]!.unit) === 'potential');
    if (!syms.length) return null;
    for (const sym of syms) use(r, sym);
    const leaves = syms.map((sym) => r.quantities[sym]!);
    const vals = leaves.map((l) => l.value!);
    return { region: r.id, lo: Math.min(...vals), hi: Math.max(...vals), leaves };
  };
  const reservoirs = (c: string): State[] => intent.regions.map((r) => stateOf(r, c)).filter((x): x is State => !!x);
  const madeInto = (c: string, into: string): { region: string; leaf: Leaf }[] => intent.regions.filter((r) => r.id === into || touches(intent, r.id, into)).flatMap((r) => Object.entries(r.produces ?? {}).filter(([sym]) => r.carriers?.[sym] === c).map(([sym, leaf]) => { use(r, sym); return { region: r.id, leaf }; }));
  const route = (from: string, to: string): string[] | null => {
    const prev = new Map<string, string | null>([[from, null]]);
    const queue = [from];
    while (queue.length) {
      const at = queue.shift()!;
      if (at === to) { const out = [at]; let p = prev.get(at); while (p) { out.unshift(p); p = prev.get(p); } return out; }
      for (const r of intent.regions) if (!prev.has(r.id) && touches(intent, at, r.id)) { prev.set(r.id, at); queue.push(r.id); }
    }
    return null;
  };
  const movingOf = (region: string) => elements.find((e) => e.id === `moving:${region}`) ?? null;
  /** What a region states of itself, when the intent states it: a region the language generates states nothing of its own. */
  const stated = (id: string): Region | null => intent.regions.find((r) => r.id === id) ?? null;
  const saidOf = (id: string, c: string, role: Role, limit = false) => { const r = stated(id); return r ? said(r, c, role, limit) : []; };
  /** Where power comes from for a region: the stores its moving region carries, or environment reservoirs of a conjugate carrier above a sink of it. */
  /**
   * Power is a difference of potential, never a potential alone. A held potential offers power toward the lowest the
   * carrier always is anywhere else, or, where nothing else holds it, toward the zero it is stated against when the
   * carrier reaches that zero after use (a voltage's return, a fuel's products, the surrounding pressure). Temperature's
   * zero is never reached (the third law), so heat offers work only toward a colder reservoir.
   */
  const offers = (r: Region, cid: string): boolean => {
    const st = stateOf(r, cid);
    if (!st) return false;
    const others = reservoirs(cid).filter((x) => x.region !== r.id);
    const sink = others.length ? Math.min(...others.map((x) => x.hi)) : carrierById(cid).zero.reached ? 0 : null;
    return sink !== null && st.lo > sink;
  };
  const powerSources = (target: string): { region: string; carrier: Carrier; store: boolean }[] => {
    const m = movingOf(target);
    if (m) return elements.filter((e) => e.kind === 'store' && e.regions[0] === m.id && carrierById(e.carrier).conjugate).map((e) => ({ region: m.id, carrier: carrierById(e.carrier), store: true }));
    return intent.regions.filter((r) => r.environment).flatMap((r) => {
      const out: { region: string; carrier: Carrier; store: boolean }[] = [];
      for (const sym of r.holds ?? []) {
        const cid = r.carriers?.[sym];
        if (!cid || cid === 'momentum') continue;
        const c = carrierById(cid);
        if (!c.conjugate) continue;
        if (offers(r, cid) && !out.some((x) => x.carrier.id === cid)) out.push({ region: r.id, carrier: c, store: false });
      }
      return out;
    });
  };
  const path = (c: Carrier, from: string, to: string, want: string | null, rule: string, parent: string | null, id?: string): Element | null => {
    const known = (x: string) => intent.regions.some((r) => r.id === x);
    const through = known(from) && known(to) ? route(from, to) : [from, to];
    if (!through) { gap(want, parent, c.id, `no chain of touching regions from ${from} to ${to}`); return null; }
    return add({ id: id ?? `path:${c.id}:${from}->${to}`, kind: 'path', carrier: c.id, says: `a path for ${c.id} from ${from} to ${to}`, regions: through, values: [], why: { want, rule, laws: lawIds(c, 'conductance', 'path-conductance'), parent } });
  };
  /** The heat a conversion or a dissipating path makes leaves to the coldest energy reservoir touching where it is. */
  const holdsEnergy = (region: string) => intent.wants.some((w) => w.region === region && w.quantity.carrier === 'energy' && roleOf(carrierById('energy'), w.quantity.unit) === 'potential');
  /**
   * Where the heat of an element goes. A conversion whose product enters a region's air (light, or heat itself) is in
   * that region, and a region whose temperature a want holds takes its heat into its own balance; a conversion that
   * moves matter or momentum is on its path, and sheds to the coldest reservoir near the region it serves.
   */
  const shed = (element: Element, near: string, want: string | null, inRegion = false) => {
    if (inRegion && holdsEnergy(near)) {
      // the heat stays in a region whose temperature a want holds: its own balance carries it out
      add({ id: `shed:${element.id}`, kind: 'boundary', carrier: 'energy', says: `the heat ${element.says.split(':')[0]} makes goes into ${near}, whose balance carries it`, regions: [element.id, near], values: [], why: { want, rule: 'what is lost is heat; in a region whose temperature is held, that region\'s balance takes it', laws: lawIds(carrierById('energy'), 'conductance'), parent: element.id } });
      gap(want, element.id, 'energy', 'the hottest it may run is a property of what it is made of: no material is chosen');
      return;
    }
    const place = placeOf(near);
    const sink = reservoirs('energy').filter((s) => s.region === place || (s.region !== place && intent.regions.some((r) => r.id === place) && touches(intent, s.region, place))).sort((a, b) => a.hi - b.hi)[0];
    const at = intent.regions.some((r) => r.id === place) ? place : null;
    if (sink && at) add({ id: `shed:${element.id}`, kind: 'boundary', carrier: 'energy', says: `the heat ${element.says.split(':')[0]} makes leaves to ${sink.region}`, regions: [element.id, sink.region], values: [], why: { want, rule: 'what is lost is heat, which its region must shed', laws: lawIds(carrierById('energy'), 'conductance'), parent: element.id } });
    else {
      // heat leaves by touch, by matter that moves, or as light: with nothing touching to take it, only as light, from its surface to whatever that surface sees
      const out = add({ id: `radiate:${element.id}`, kind: 'boundary', carrier: 'light', says: `nothing touching takes the heat ${element.says.split(':')[0]} makes: it leaves as light from its surface to whatever that surface sees`, regions: [element.id], values: [{ name: 'the most a surface radiates per area, over the fourth power of its temperature (a black body)', value: CONST.sigmaSB.value!, unit: 'W/m^2 K^4', from: CONST.sigmaSB.name }], why: { want, rule: 'heat leaves a region by touch, by matter that moves, or as light; with nothing to touch and nothing moving, only as light', laws: ['radiation'], parent: element.id } });
      // what the surface sees is not said, but nothing it can see is colder than the cosmic background: the least area,
      // at whatever temperature the surface may run, is sized against that, and a warmer sink only needs more
      put(out, { name: 'the coldest anything the surface can see is', value: CONST.Tcmb.value!, unit: 'K', from: CONST.Tcmb.name });
    }
    gap(want, element.id, 'energy', 'the hottest it may run is a property of what it is made of: no material is chosen');
  };

  /** A supply into a region from a reservoir always above `above`, or a removal to one always below `below`; else a conversion. */
  const supply = (c: Carrier, into: string, cond: { above?: number; below?: number }, want: string | null, parent: string | null) => {
    const removing = cond.below !== undefined;
    const res = reservoirs(c.id).filter((s) => s.region !== into && (removing ? s.hi < cond.below! : s.lo > cond.above!));
    const moving = movingOf(into);
    if (res.length && !moving) {
      for (const r of res) path(c, removing ? into : r.region, removing ? r.region : into, want, `${removing ? 'a removal to a reservoir always below' : 'a supply from a reservoir always above'} the band (${r.leaves.map((l) => l.name).join(', ')})`, parent);
      return;
    }
    const sources = powerSources(into);
    if (!sources.length) { gap(want, parent, c.id, `no reservoir of ${c.id} is always ${removing ? 'below' : 'above'} the band, and nothing offers power to convert`); return; }
    const conserved = c.id !== 'energy' && c.id !== 'light';
    const from = conserved && !removing ? reservoirs(c.id).filter((s) => s.region !== into).sort((a, b) => b.lo - a.lo)[0] : undefined;
    if (conserved && !removing && !from) { gap(want, parent, c.id, `${c.id} is conserved and no reservoir of it exists: nothing can be converted into it`); return; }
    const conv = add({ id: `conversion:${c.id}:${into}:${removing ? 'removal' : 'supply'}`, kind: 'conversion', carrier: c.id, says: removing ? `a conversion that moves ${c.id} out of ${into} up its potential, to a reservoir, with power from another carrier` : from ? `a conversion that raises ${c.id} from ${from.region} into ${into} up its potential, with power from another carrier` : `a conversion that makes ${c.id} in ${into} from another carrier`, regions: [into], values: [], why: { want, rule: `${removing ? 'a removal' : 'a supply'} no reservoir drives: a conversion, bounded by the second law${from ? '; a conserved carrier is raised from a reservoir, never made' : ''}`, laws: [], parent } });
    if (from) {
      const src = path(c, from.region, into, want, `what is raised comes from ${from.region}`, conv.id);
      // the reservoir is a store: what it holds bounds how much can be raised from it
      for (const q of saidOf(from.region, c.id, 'content')) src?.values.push({ name: `what ${from.region} holds`, value: q.leaf.value!, unit: q.leaf.unit, from: q.leaf.name });
    }
    for (const s of sources) {
      conv.why.laws = [...new Set([...conv.why.laws, ...(s.carrier.conjugate && c.conjugate ? coupling(s.carrier, c).map((l) => l.id) : lawIds(s.carrier, 'power', 'dissipation'))])];
      const alt = sources.length > 1 ? `power for ${conv.id}` : undefined;
      if (s.store) add({ id: `path:${s.carrier.id}:store->${conv.id}`, kind: 'path', carrier: s.carrier.id, says: `a path for ${s.carrier.id} from the store the moving region carries to the conversion for ${into}`, regions: [s.region, conv.id], values: [], ...(alt ? { oneOf: alt } : {}), why: { want, rule: 'a moving region draws its power from its store', laws: lawIds(s.carrier, 'conductance'), parent: conv.id } });
      else { const pp = path(s.carrier, s.region, into, want, `the conversion draws ${s.carrier.id} from ${s.region}`, conv.id); if (pp && alt && pp.oneOf === undefined && pp.also.length === 0) pp.oneOf = alt; }
      if (s.carrier.id === 'charge' && !s.store) add({ id: `return:charge:${into}->${s.region}`, kind: 'path', carrier: 'charge', says: `the charge returns from ${into} to ${s.region}: charge is neither made nor destroyed`, regions: [into, s.region], values: [], why: { want, rule: 'charge drawn returns: its balance where it is used is zero', laws: lawIds(s.carrier, 'conductance'), parent: conv.id } });
    }
    if (removing) {
      const up = reservoirs(c.id).filter((s) => s.region !== into && (s.region === placeOf(into) || touches(intent, s.region, placeOf(into)))).sort((a, b) => b.hi - a.hi)[0];
      if (up) path(c, into, up.region, want, `what the conversion takes out is delivered up its potential to ${up.region}`, conv.id);
    }
    // a conversion whose product is heat in the region loses nothing to shed; its own limit remains
    if (c.id === 'energy' && !removing) gap(want, conv.id, 'energy', 'the hottest it may run is a property of what it is made of: no material is chosen');
    else shed(conv, into, want, c.id === 'light');
  };

  const observeAndModulate = (c: Carrier, region: string, want: string | null, parent: string | null, band: number | null) => {
    const obs = add({ id: `observer:${c.id}:${region}`, kind: 'observer', carrier: c.id, says: `an observer of the ${c.id === 'momentum' ? 'motion' : `potential of ${c.id}`} of ${region}`, regions: [region], values: band !== null ? [{ name: 'resolution needed', value: band / 2, unit: c.potential ?? '1', from: 'half the band the want holds' }] : [], why: { want, rule: 'a state held against a varying neighbour is observed', laws: [], parent } });
    add({ id: `modulation:${c.id}:${region}:observed`, kind: 'modulation', carrier: c.id, says: `what is supplied to ${region} follows the observation`, regions: [region], values: [], why: { want, rule: 'a state held against a varying neighbour: the flux follows what is observed', laws: [], parent: obs.id } });
    add({ id: `store:${c.id}:${region}:smoothing`, kind: 'store', carrier: c.id, says: `or a store of ${c.id} in ${region} whose time constant with its boundary is longer than the variation`, regions: [region], values: [], why: { want, rule: 'the alternative to observing: a capacitance that smooths', laws: lawIds(c, 'storage', 'time-constant'), parent } });
  };

  const contentBound = (region: string, c: string) => intent.wants.some((w) => w.region === region && w.quantity.carrier === c && roleOf(carrierById(c), w.quantity.unit) === 'content' && w.hi);
  /** The density of the matter a carrier is a volume of, from a region that holds that matter and states it. */
  const densityOf = (c: Carrier): Leaf | null => {
    if (!c.id.startsWith('volume of ')) return null;
    const name = c.id.slice('volume of '.length);
    for (const r of intent.regions.filter((x) => x.matter === name)) for (const [sym, p] of Object.entries(r.properties ?? {})) if (p.role === 'density') { use(r, sym); return r.quantities[sym]!; }
    return null;
  };
  const heightOf = (region: string): number | null => { const r = intent.regions.find((x) => x.id === region); if (!r) return null; if (!r.at) return r.environment ? null : 0; use(r, r.at); return r.quantities[r.at]!.value!; };
  /**
   * Matter that must leave goes to the lowest reservoir of it. A liquid's potential is its pressure and its height in
   * gravity together (its mechanical energy per volume), so it is driven when the pressure where it is, plus its
   * density times gravity times its height, is above the sink's.
   */
  const drain = (c: Carrier, from: string, at: number, want: string | null, parent: string | null, zFrom: number | null = null) => {
    const sinks = reservoirs(c.id).filter((s) => s.region !== from).sort((a, b) => a.hi - b.hi);
    if (!sinks.length) { gap(want, parent, c.id, `nothing in the site receives ${c.id}`); return; }
    const s = sinks[0]!;
    const out = path(c, from, s.region, want, `${c.id} leaves to the lowest reservoir of it, ${s.region}`, parent);
    if (!out) return;
    const rho = densityOf(c), zs = heightOf(s.region), zf = zFrom ?? heightOf(from) ?? 0;
    if (s.hi < at) return;
    if (!rho || zs === null) { gap(want, out.id, c.id, `nothing drives ${c.id} from ${from} to ${s.region}: both are at ${at} ${c.potential}, and ${!rho ? `what the matter weighs (its density)` : `the height of ${s.region}`} is not said`); return; }
    const drive = (at + rho.value! * g * zf) - (s.hi + rho.value! * g * zs);
    put(out, { name: 'what drives it: its density times gravity times the fall', value: drive, unit: c.potential ?? 'Pa', from: `${rho.name}, the heights ${zf} m and ${zs} m` });
    if (drive <= 0) gap(want, out.id, c.id, `${s.region} is not below ${from}: nothing drives ${c.id} there, and it must be raised`);
  };

  const flux: { region: string; carrier: string; J: number; from: string }[] = [];
  const shapes = new Map<string, Shape | null>();
  const shape = (id: string): Shape | null => {
    if (!shapes.has(id)) { const r = intent.regions.find((x) => x.id === id); shapes.set(id, r ? shapeOf(r) : null); if (r?.extent) for (const sym of [r.extent.x, r.extent.y, r.extent.z, r.extent.plan]) if (sym) use(r, sym); }
    return shapes.get(id)!;
  };
  /** The faces of a region that touch another, each a boundary element under the aggregate one, with its area. */
  const faceElements = (parent: Element, c: string, R: string, N: string, only?: Face[]): Element[] => {
    const sh = shape(R);
    if (!sh) return [];
    const out: Element[] = [];
    for (const f of (['up', 'side', 'down'] as Face[]).filter((f) => sh.touches[f] === N && (!only || only.includes(f)))) {
      out.push(add({ id: `${parent.id}:${f}`, kind: 'boundary', carrier: c, says: `the ${f === 'side' ? 'sides' : `${f}-facing face`} of ${R}, where it meets ${N}`, regions: [R, N], values: [{ name: 'area', value: sh.area[f].value!, unit: 'm^2', from: sh.area[f].name }, ...parent.values.filter((v) => v.name === 'conductance')], why: { want: parent.why.want, rule: `the boundary to ${N} is the faces of ${R} that touch it`, laws: parent.why.laws, parent: parent.id } }));
    }
    return out;
  };

  /** What a region's matter does at its temperature: holds its shape (bears contact), flows (bears by its pressure, can be pushed), or the language cannot say. */
  const phaseOf = (r: Region): 'solid' | 'fluid' | null => {
    const T = stateOf(r, 'energy');
    const flows = Object.entries(r.properties ?? {}).find(([, p]) => p.role === 'flows above');
    const holds = Object.entries(r.properties ?? {}).find(([, p]) => p.role === 'holds its shape below');
    if (flows && T) { use(r, flows[0]); if (T.lo > r.quantities[flows[0]]!.value!) return 'fluid'; }
    if (holds && T) { use(r, holds[0]); if (T.hi < r.quantities[holds[0]]!.value!) return 'solid'; }
    if ((r.limits ?? []).some((sym) => r.carriers?.[sym] === 'momentum')) return 'solid';
    return null;
  };
  /**
   * Whether what flows is a liquid or a gas: the phase of least Gibbs energy of its matter, at its temperature and its
   * absolute pressure, where its matter's phases are known (src/nexus/substrate/phase.ts); otherwise the language cannot say.
   */
  const fluidState = (r: Region): 'liquid' | 'gas' | null => {
    const T = stateOf(r, 'energy'), pabs = Object.entries(r.properties ?? {}).find(([, p]) => p.role === 'absolute pressure');
    if (!r.matter || !T || !pabs) return null;
    use(r, pabs[0]);
    const ph = phaseAt(r.matter, T.lo, r.quantities[pabs[0]]!.value!);
    return ph === 'liquid' || ph === 'gas' ? ph : null;
  };
  const momentumProperty = (r: Region, role: string): Leaf | null => { const d = Object.entries(r.properties ?? {}).find(([, p]) => p.role === role && p.of === 'momentum'); if (!d) return null; use(r, d[0]); return r.quantities[d[0]]!; };
  /** How much a region's matter weighs per volume: said as a property of its momentum, or as the content density of the matter it holds. One fact, either saying. */
  const densityIn = (r: Region): Leaf | null => momentumProperty(r, 'density') ?? (() => { const sym = Object.keys(r.quantities).find((x) => (r.carriers?.[x] ?? '').startsWith('mass of') && roleOf(carrierById(r.carriers![x]!), r.quantities[x]!.unit) === 'content density'); if (!sym) return null; use(r, sym); return r.quantities[sym]!; })();
  const reactionLaws = (...names: string[]) => reaction().filter((l) => names.some((n) => l.id === `reaction.${n}`)).map((l) => l.id);
  /** A store whose matter can be ejected: a mass of a matter that carries energy, and the fastest it can leave, all its energy turned to motion. */
  const ejectable = () => intent.regions.filter((r) => r.environment).flatMap((r) => (r.holds ?? []).filter((sym) => (r.carriers?.[sym] ?? '').startsWith('mass of')).map((sym) => { use(r, sym); return { region: r.id, carrier: carrierById(r.carriers![sym]!), ve: Math.sqrt(2 * r.quantities[sym]!.value!), e: r.quantities[sym]! }; }));
  const c0 = CONST.c.value!;
  const dimOfSpeed = dimOf('m/s').join();

  const momentumWant = (w: Want, c: Carrier, role: Role | null, R: Region) => {
    const lo = w.lo?.value ?? null, hi = w.hi?.value ?? null;
    const atRest = (r: Region) => { const st = stateOf(r, 'momentum'); return !!st && st.lo === 0 && st.hi === 0; };
    const speedWanted = intent.wants.find((x) => x.region === R.id && x.quantity.carrier === 'momentum' && roleOf(c, x.quantity.unit) === 'potential' && x.lo)?.lo ?? null;
    const far = intent.wants.find((x) => x.region === R.id && x.quantity.carrier === 'momentum' && roleOf(c, x.quantity.unit) === 'position' && x.when === 'by the end' && x.lo)?.lo ?? null;
    /** How long the trip lasts: the distance over the speed. What holds the region up over it is paid for over it. */
    const trip = far && speedWanted ? { t: far.value! / speedWanted.value!, from: `${far.name} over ${speedWanted.name}` } : null;
    const sh = shape(R.id);
    /**
     * How momentum crosses into a fluid at the wanted motion: carried by the fluid's matter or conducted by its
     * viscosity, their ratio the Reynolds number. Each law of pushing a fluid holds in one regime: turning a stream
     * (lift, hover, thrust) where momentum is carried; the conductance of a body (Stokes) where it is conducted.
     */
    const regimeOf = (f: Region) => {
      const rho = densityIn(f), mu = momentumProperty(f, 'conductivity');
      if (!rho || !mu || !speedWanted || !sh) return null;
      const L = Math.max(sh.x.value!, sh.z.value!);
      const Re = rho.value! * speedWanted.value! * L / mu.value!;
      // the boundaries are conventions, about one and about a thousand
      return { Re, L, rho, mu, r: Math.min(sh.x.value!, sh.y.value!, sh.z.value!) / 2, conducted: Re < 1, carried: Re > 1000 };
    };
    /** What offers the power to move: a store filled from a source with a potential above its zero, what the region itself makes, a flux it intercepts. */
    const near = (r: Region, ref: Region | null) => r.environment && (touches(intent, r.id, R.id) || (!!ref && touches(intent, r.id, ref.id)));
    const offered = (ref: Region | null) => ({
      stores: intent.regions.filter((r) => r.environment).flatMap((r) => (r.holds ?? []).map((sym) => ({ r, sym, cid: r.carriers?.[sym] })).filter((x) => x.cid && x.cid !== 'momentum' && carrierById(x.cid).conjugate && offers(x.r, x.cid))).map((x) => ({ region: x.r.id, carrier: carrierById(x.cid!) })).filter((x, i, a) => a.findIndex((y) => y.carrier.id === x.carrier.id) === i),
      aboard: [...said(R, 'momentum', 'power')],
      light: intent.regions.filter((r) => near(r, ref)).flatMap((r) => said(r, 'light', 'flux density').map((q) => ({ region: r.id, q }))),
      wind: intent.regions.filter((r) => near(r, ref)).flatMap((r) => said(r, 'momentum', 'potential').filter((q) => !(r.holds ?? []).includes(q.sym)).map((q) => ({ region: r.id, q }))),
    });
    if (!w.relativeTo && (role === 'position' || role === null) && w.when === 'always') {
      const loads = intent.regions.filter((r) => r.id !== R.id).flatMap((r) => said(r, 'momentum', 'flux density').map((q) => ({ region: r.id, q, dir: r.directions?.[q.sym] ?? null }))).filter((x) => route(x.region, R.id));
      let down = 0, across = 0;
      for (const l of loads) {
        const faces = l.dir ? facesCrossed(l.dir) : null;
        const area = sh && faces ? (l.dir === 'across' ? sh.largestSide.value! : faces.reduce((a, f) => a + sh.area[f].value!, 0)) : null;
        const F = area !== null ? l.q.leaf.value! * area : null;
        if (F !== null) { if (l.dir === 'across') across += F; else down += F; }
        const ld = add({ id: `load:${l.region}->${R.id}`, kind: 'path', carrier: 'momentum', says: `the momentum ${l.region} brings (${l.q.leaf.name}) reaches ${R.id}${faces ? ` on its ${faces.join(' and ')} face${faces.length > 1 ? 's' : ''}` : ''}`, regions: route(l.region, R.id)!, values: [{ name: l.q.leaf.name, value: l.q.leaf.value!, unit: 'Pa', from: l.region }, ...(F !== null ? [{ name: 'force', value: F, unit: 'N', from: `${l.q.leaf.name} times the area it acts on` }] : [])], why: { want: w.id, rule: 'what the environment brings per area is a momentum flux into the faces it crosses', laws: [], parent: null } });
        if (sh && faces) for (const f of faces) {
          const span = f === 'side' ? sh.y.value! : Math.min(sh.x.value!, sh.z.value!);
          const me = add({ id: `members:${R.id}:${f}`, kind: 'path', carrier: 'momentum', says: `members spanning the ${f === 'side' ? 'sides' : `${f}-facing face`} of ${R.id} carry what reaches it to the face that meets the ground`, regions: [R.id], values: [{ name: 'span', value: span, unit: 'm', from: f === 'side' ? `${sh.y.name}` : 'the shorter extent of the plan' }], why: { want: w.id, rule: 'a face that receives momentum passes it on through members that span it', laws: lawIds(c, 'flux-stored-energy'), parent: ld.id } });
          const carried = me.values.find((v) => v.name === 'load per area it carries');
          if (!carried) me.values.push({ name: 'load per area it carries', value: l.q.leaf.value!, unit: 'Pa', from: l.q.leaf.name });
          else if (!carried.from.includes(l.q.leaf.name)) { carried.value += l.q.leaf.value!; carried.from += ` and ${l.q.leaf.name}`; }
        }
      }
      const masses = intent.regions.filter((r) => r.id === R.id || (touches(intent, r.id, R.id) && !r.environment)).flatMap((r) => said(r, 'momentum', 'capacitance').map((q) => ({ region: r.id, q })));
      const weight = masses.reduce((s_, m) => s_ + m.q.leaf.value! * g, 0);
      down += weight;
      if (g === 0) { add({ id: `free:${R.id}`, kind: 'bound', carrier: 'momentum', says: `the site's gravity is zero: what ${R.id} holds has no weight to carry`, regions: [R.id], values: [{ name: 'gravity', value: 0, unit: 'm/s^2', from: gravityName }], why: { want: w.id, rule: 'gravity is a production of momentum in every mass: none, where the site has none', laws: [], parent: null } }); if (!loads.length) return; }
      if (sh && masses.length) {
        // a face that touches a solid at rest may rest on it, borne by contact wherever it touches, or be held off it by members
        const under = sh.touches.down ? intent.regions.find((r) => r.id === sh.touches.down && atRest(r) && phaseOf(r) === 'solid') : undefined;
        const alt = under ? { oneOf: `carrying the down face of ${R.id}` } : {};
        add({ ...alt, id: `members:${R.id}:down`, kind: 'path', carrier: 'momentum', says: `members spanning the down-facing face of ${R.id} carry what rests on it`, regions: [R.id], values: [{ name: 'span', value: Math.min(sh.x.value!, sh.z.value!), unit: 'm', from: 'the shorter extent of the plan' }, { name: 'weight resting on it at a place not stated', value: weight, unit: 'N', from: masses.map((m_) => m_.q.leaf.name).join(' and ') }], why: { want: w.id, rule: 'a face that receives momentum passes it on through members that span it', laws: lawIds(c, 'flux-stored-energy'), parent: null } });
        if (under) add({ ...alt, id: `rests:${R.id}|${under.id}`, kind: 'bound', carrier: 'momentum', says: `or the down face of ${R.id} rests on ${under.id}, which bears what rests on it by contact wherever it touches: no member spans it`, regions: [R.id, under.id], values: [{ name: 'weight per area where it rests', value: weight / sh.area.down.value!, unit: 'Pa', from: 'the weights over the down face' }, ...said(under, 'momentum', 'flux density', true).map((q) => ({ name: q.leaf.name, value: q.leaf.value!, unit: 'Pa', from: under.id }))], why: { want: w.id, rule: 'a region held in place sends all the momentum it receives to a solid at rest, which bears it by contact', laws: lawIds(c, 'flux-stored-energy'), parent: null } });
      }
      for (const m of masses) if (g > 0) add({ id: `weight:${m.region}`, kind: 'path', carrier: 'momentum', says: `gravity makes momentum in ${m.q.leaf.name}: ${(m.q.leaf.value! * g).toFixed(0)} N reaches ${R.id}`, regions: [m.region, R.id], values: [{ name: 'weight', value: m.q.leaf.value! * g, unit: 'N', from: `${m.q.leaf.name} times ${gravityName}` }], why: { want: w.id, rule: 'gravity is a production of momentum in every mass', laws: [], parent: null } });
      // what can take the weight depends on what the touched matter does: a solid bears it by contact, a fluid by its pressure, and nothing bears it in a vacuum
      const solids = intent.regions.filter((r) => r.id !== R.id && atRest(r) && phaseOf(r) === 'solid');
      const fluids = intent.regions.filter((r) => r.id !== R.id && touches(intent, r.id, R.id) && atRest(r) && phaseOf(r) === 'fluid');
      for (const gr of solids) {
        const p = path(c, R.id, gr.id, w.id, 'a region held in place sends all the momentum it receives to a solid at rest, which bears it by contact', null);
        if (!p) continue;
        p.why.laws = [...new Set([...p.why.laws, ...lawIds(c, 'flux-stored-energy')])];
        if (hi !== null) put(p, { name: role === null ? 'most displacement over span' : 'most displacement', value: hi, unit: role === null ? '1' : 'm', from: w.hi!.name });
        if (down > 0) put(p, { name: 'force down, without the structure\'s own weight', value: down, unit: 'N', from: 'the loads on the faces and the weights' });
        if (across > 0) put(p, { name: 'force across', value: across, unit: 'N', from: 'what pushes on the largest side' });
        for (const lim of said(gr, 'momentum', 'flux density', true)) add({ id: `bound:momentum:${R.id}|${gr.id}`, kind: 'bound', carrier: 'momentum', says: `where the path meets ${gr.id}, the momentum per area stays below ${lim.leaf.name}: the meeting area is at least the flux over it`, regions: [R.id, gr.id], values: [{ name: lim.leaf.name, value: lim.leaf.value!, unit: 'Pa', from: gr.id }, ...(down > 0 ? [{ name: 'least meeting area, without the structure\'s own weight', value: down / lim.leaf.value!, unit: 'm^2', from: 'the force down over the bearing it allows' }] : [])], why: { want: w.id, rule: 'a boundary carries flux up to the flux density its weaker side allows', laws: [], parent: p.id } });
      }
      if (!solids.length && weight > 0) {
        const mass = weight / g;
        const own = sh ? sh.x.value! * sh.y.value! * sh.z.value! : null;
        const over = (P: number) => (trip ? [{ name: 'energy over the trip: the power times its duration', value: P * trip.t, unit: 'J', from: trip.from }] : []);
        for (const f of fluids) {
          const rho = densityIn(f);
          if (!rho) { gap(w.id, null, 'momentum', `what ${f.id} weighs per volume is not said: whether it can bear ${R.id} cannot be read`); continue; }
          add({ id: `buoyancy:${R.id}|${f.id}`, kind: 'bound', carrier: 'momentum', says: `${f.id}, at rest, pushes up on ${R.id} by its pressure, which grows with depth: by the weight of ${f.id} it displaces, so it is held if what displaces, with all it encloses, is on the whole lighter than ${f.id}`, regions: [R.id, f.id], oneOf: `support of ${R.id}`,
            values: [{ name: 'least volume displaced: the mass over the fluid\'s density', value: mass / rho.value!, unit: 'm^3', from: `${rho.name}` }, ...(own !== null ? [{ name: `volume ${R.id} itself takes`, value: own, unit: 'm^3', from: 'its extent' }, { name: `its mean density as it is, against ${f.id}'s ${rho.value} kg/m³`, value: mass / own, unit: 'kg/m^3', from: 'its mass over its extent' }] : [])],
            why: { want: w.id, rule: 'a fluid at rest bears what is in it by the pressure its weight makes: the weight of the fluid displaced', laws: reactionLaws('buoyancy'), parent: null } });
          const reg = regimeOf(f);
          if (reg?.conducted) {
            // where momentum is conducted, nothing is held up by turning a stream: what is heavier sinks slowly, at the speed its weight drives through the fluid's conductance, and holds its place by swimming up as fast
            const vs = weight / (6 * Math.PI * reg.mu.value! * reg.r);
            add({ id: `hover:${R.id}|${f.id}`, kind: 'conversion', carrier: 'momentum', says: `or ${R.id} swims up as fast as it sinks: in ${f.id} its momentum is conducted, not carried, so it sinks at its weight over its momentum conductance and holds its place by a stroke that pushes ${f.id} down`, regions: [R.id, f.id], oneOf: `support of ${R.id}`,
              values: [{ name: 'speed it sinks at: its weight over six pi times the viscosity and its radius', value: vs, unit: 'm/s', from: 'reaction.conducted' }, { name: 'least power to hold its place: its weight times that speed', value: weight * vs, unit: 'W', from: 'the work against the conducted resistance' }, ...over(weight * vs)],
              why: { want: w.id, rule: 'where a fluid conducts momentum, a body\'s resistance is its conductance times its speed', laws: reactionLaws('conducted'), parent: null } });
            continue;
          }
          const plan = sh ? sh.area.up.value! : null;
          if (plan) { const P = weight ** 1.5 / Math.sqrt(2 * rho.value! * plan); add({ id: `hover:${R.id}|${f.id}`, kind: 'conversion', carrier: 'momentum', says: `or ${R.id} pushes ${f.id} down through an area at least its plan, and is held up by the push back`, regions: [R.id, f.id], oneOf: `support of ${R.id}`, values: [{ name: 'least power over its plan: the weight to the three halves over the root of twice the density times the area', value: P, unit: 'W', from: 'reaction.hover' }, ...over(P)], why: { want: w.id, rule: 'a region gains momentum by giving it to the fluid\'s matter it pushes, where that momentum is carried', laws: reactionLaws('hover', 'push', 'power'), parent: null } }); }
          if (speedWanted && sh) { const P = weight ** 2 / (2 * rho.value! * speedWanted.value! * Math.PI * sh.x.value! ** 2 / 4); add({ id: `lift:${R.id}|${f.id}`, kind: 'conversion', carrier: 'momentum', says: `or, moving through ${f.id}, ${R.id} turns a stream of it down across a width at least its own, and is held up by the push back`, regions: [R.id, f.id], oneOf: `support of ${R.id}`, values: [{ name: 'least power at the wanted speed over a stream as wide as it: the weight squared over twice the density, the speed and the area', value: P, unit: 'W', from: 'reaction.turning' }, ...over(P)], why: { want: w.id, rule: 'moving through a fluid, a stream turned across the motion pushes back across it, where momentum is carried', laws: reactionLaws('turning', 'push'), parent: null } }); }
        }
        if (!fluids.length) {
          // nothing to bear the weight: what leaves the region must carry the momentum away, matter it ejects or light it emits
          const ej = ejectable();
          const power = offered(null);
          for (const e of ej) add({ id: `hover:${R.id}|ejected`, kind: 'conversion', carrier: 'momentum', says: `nothing touches ${R.id}: it is held up only by ejecting the ${e.carrier.id.slice('mass of '.length)} it carries downward`, regions: [R.id], oneOf: `support of ${R.id}`, values: [{ name: 'fastest the ejected matter leaves: the root of twice its energy per mass', value: e.ve, unit: 'm/s', from: e.e.name }, { name: 'least mass ejected per second: the weight over that speed', value: weight / e.ve, unit: 'kg/s', from: 'reaction.push' }, ...(trip ? [{ name: 'mass it must start with over the mass it ends with, to stay up over the trip: e to the gravity times the duration over the speed of what leaves', value: Math.exp(g * trip.t / e.ve), unit: '1', from: `reaction.ejection over ${trip.from}` }] : [])], why: { want: w.id, rule: 'with nothing to push against, a region pushes against the matter it ejects', laws: reactionLaws('push', 'ejection'), parent: null } });
          if (power.stores.length || power.aboard.length || power.light.length) add({ id: `hover:${R.id}|light`, kind: 'conversion', carrier: 'momentum', says: `or ${R.id} emits light downward and is pushed up by its momentum: no matter is spent, but the power is the weight times the speed of light`, regions: [R.id], oneOf: `support of ${R.id}`, values: [{ name: 'least power of light emitted: the weight times the speed of light', value: weight * c0, unit: 'W', from: 'reaction.light' }, ...over(weight * c0)], why: { want: w.id, rule: 'light carries momentum: what emits it is pushed back', laws: reactionLaws('light'), parent: null } });
          if (!ej.length && !(power.stores.length || power.aboard.length || power.light.length)) gap(w.id, null, 'momentum', `nothing ${R.id} touches can bear its weight, and nothing it carries or makes can leave it to push against`);
          gap(w.id, null, 'momentum', `the site's gravity is uniform, with no mass it comes from: whether moving across fast enough to fall around that mass would hold ${R.id} up cannot be read`);
        }
      }
      if (loads.length && !sh) gap(w.id, null, 'momentum', 'the loads per area need the areas they act on: no geometry');
      if (loads.length || solids.length && masses.length && sh) gap(w.id, null, 'momentum', 'the structure\'s own weight is what it is made of times its size: no material is chosen');
      return;
    }
    // moved: relative to a reference
    const ref = w.relativeTo ? regionOf(intent, w.relativeTo) : intent.regions.find((r) => r.environment && touches(intent, r.id, R.id) && atRest(r)) ?? null;
    if (ref && !atRest(ref)) {
      // content placed relative to a shape: it arrives at a point that moves over it
      const dep = add({ id: `deposit:${R.id}`, kind: 'region', carrier: 'momentum', says: `a point where content enters ${R.id}, moving over ${ref.id}`, regions: [R.id], values: hi !== null ? [{ name: 'most position error', value: hi, unit: 'm', from: w.hi!.name }] : [], why: { want: w.id, rule: `content placed relative to ${ref.id} arrives at a point that moves over it`, laws: [], parent: null } });
      const rest = intent.regions.find((r) => r.environment && atRest(r));
      if (!rest) { gap(w.id, dep.id, 'momentum', 'nothing at rest to hold the point against'); return; }
      const frame = path(c, R.id, rest.id, w.id, `the point and ${R.id} are held to each other through ${rest.id}, stiff enough that the motion's forces displace them less than the tolerance`, dep.id);
      if (frame) { frame.why.laws = [...new Set([...frame.why.laws, ...lawIds(c, 'flux-stored-energy')])]; if (hi !== null) put(frame, { name: 'most displacement', value: hi, unit: 'm', from: w.hi!.name }); }
      const axes: ('x' | 'y' | 'z' | null)[] = sh ? ['x', 'y', 'z'] : [null];
      if (sh && frame) put(frame, { name: 'span it holds the point over, along each axis', value: Math.max(sh.x.value!, sh.y.value!, sh.z.value!), unit: 'm', from: `the extent of ${R.id}` });
      for (const s_ of powerSources(R.id)) {
        let conv: Element | null = null;
        for (const a_ of axes) {
          conv = add({ id: `conversion:${s_.carrier.id}->momentum:${dep.id}${a_ ? `:${a_}` : ''}`, kind: 'conversion', carrier: 'momentum', says: `${s_.carrier.id} becomes the momentum that moves the point${a_ ? ` along ${a_}, over ${sh![a_].value} m` : ''}`, regions: [dep.id], values: a_ ? [{ name: 'travel', value: sh![a_].value!, unit: 'm', from: `the extent of ${R.id} along ${a_}` }] : [], why: { want: w.id, rule: a_ ? 'a point moved over an extent moves along each of its axes: momentum has a direction' : 'a point moved over a shape: power converted to momentum', laws: coupling(s_.carrier, carrierById('angular momentum')).map((l) => l.id), parent: dep.id } });
          if (a_) shed(conv, R.id, w.id);
          if (a_) add({ id: `observer:position:${dep.id}:${a_}`, kind: 'observer', carrier: 'momentum', says: `an observer of where the point is along ${a_}, resolving finer than the tolerance`, regions: [dep.id], values: hi !== null ? [{ name: 'resolution needed', value: hi / 2, unit: 'm', from: 'half the tolerance' }] : [], why: { want: w.id, rule: 'a position held to a tolerance is observed finer than it, along each axis it moves', laws: [], parent: conv.id } });
        }
        path(s_.carrier, s_.region, R.id, w.id, `the motion draws ${s_.carrier.id} from ${s_.region}`, conv!.id);
        if (s_.carrier.id === 'charge') add({ id: `return:charge:${R.id}->${s_.region}`, kind: 'path', carrier: 'charge', says: `the charge returns from ${R.id} to ${s_.region}: charge is neither made nor destroyed`, regions: [R.id, s_.region], values: [], why: { want: w.id, rule: 'charge drawn returns', laws: lawIds(s_.carrier, 'conductance'), parent: conv!.id } });
        if (!sh) shed(conv!, R.id, w.id);
      }
      add({ id: `observer:position:${dep.id}`, kind: 'observer', carrier: 'momentum', says: `an observer of where the point is against ${ref.id}, resolving finer than the tolerance`, regions: [dep.id], values: hi !== null ? [{ name: 'resolution needed', value: hi / 2, unit: 'm', from: 'half the tolerance' }] : [], why: { want: w.id, rule: 'a position held to a tolerance is observed finer than the tolerance', laws: [], parent: dep.id } });
      add({ id: `modulation:momentum:${dep.id}:observed`, kind: 'modulation', carrier: 'momentum', says: 'the motion follows the observation of the point against the shape', regions: [dep.id], values: [], why: { want: w.id, rule: 'a position held to a tolerance: the motion follows what is observed', laws: [], parent: `observer:position:${dep.id}` } });
      return;
    }
    const masses = said(R, 'momentum', 'capacitance');
    const moving = add({ id: `moving:${R.id}`, kind: 'region', carrier: 'momentum', says: `a region moving with ${R.id}: what must move together shares momentum through paths`, regions: [R.id], values: masses.map((m) => ({ name: `mass it moves, at least (${m.leaf.name})`, value: m.leaf.value!, unit: 'kg', from: R.id })), why: { want: w.id, rule: `${R.id} moves${ref ? ` relative to ${ref.id}` : ''}`, laws: lawIds(c, 'storage'), parent: null } });
    const phase = ref ? phaseOf(ref) : null;
    const power = offered(ref);
    const reg = ref && phase === 'fluid' ? regimeOf(ref) : null;
    // how momentum crosses to what is touched: a solid by a contact that rolls; a fluid by pushing its matter, or by a stroke where its momentum is conducted; nothing, by what the region ejects or emits
    let pusher: Element | null = null;
    let mu: { sym: string; leaf: Leaf } | undefined;
    if (ref && phase === 'solid') {
      mu = said(ref, 'momentum', 'content', true).concat(Object.entries(ref.quantities).filter(([sym, l]) => (ref.limits ?? []).includes(sym) && ref.carriers?.[sym] === 'momentum' && l.dim.every((x) => x === 0)).map(([sym, leaf]) => { use(ref, sym); return { sym, leaf }; }))[0];
      pusher = add({ id: `contact:${R.id}|${ref.id}`, kind: 'contact', carrier: 'momentum', says: `the moving region meets ${ref.id}, a solid: momentum crosses there up to the most tangential flux over normal flux${mu ? ` (${mu.leaf.name})` : ''}; a contact that rolls has no relative speed and makes no heat, one that slides dissipates the flux times the speed`, regions: [moving.id, ref.id], values: mu ? [{ name: 'most acceleration the contact carries', value: mu.leaf.value! * g, unit: 'm/s^2', from: `${mu.leaf.name} times ${gravityName}` }] : [], why: { want: w.id, rule: 'a moving region\'s momentum crosses where it meets a solid at rest', laws: [...lawIds(c, 'dissipation'), ...coupling(carrierById('angular momentum'), c).map((l) => l.id)], parent: moving.id } });
      if (g === 0) {
        // the contact's tangential flux is bounded by the normal flux: with no weight, something else must press it
        const grip = add({ id: `grip:${R.id}|${ref.id}`, kind: 'contact', carrier: 'momentum', says: `with no weight to press it, the contact carries momentum only where something else presses it to ${ref.id}: a grip from both sides, its push then bounded by the friction times the press`, regions: [moving.id, ref.id], values: [], why: { want: w.id, rule: 'a contact carries tangential momentum up to the friction times the normal flux: with no weight, the normal flux is made', laws: lawIds(c, 'dissipation'), parent: pusher.id } });
        gap(w.id, grip.id, 'momentum', 'how hard the grip presses is a choice the language does not yet make: the push of the contact cannot be bounded');
      }
    } else if (ref && phase === 'fluid') {
      pusher = reg?.conducted
        ? add({ id: `thrust:${R.id}|${ref.id}`, kind: 'conversion', carrier: 'momentum', says: `in ${ref.id} the moving region's momentum is conducted, not carried: it is pushed by the resistance of a stroke against ${ref.id}, and a stroke that retraces itself pushes it back as far as forward, so the stroke must not be its own reverse (it turns, or travels along it as a wave); when it stops pushing, it stops at once`, regions: [moving.id, ref.id], values: [{ name: 'momentum it carries over momentum it conducts (the Reynolds number)', value: reg.Re, unit: '1', from: `${ref.id}'s density and viscosity` }], why: { want: w.id, rule: 'where a fluid conducts momentum, the resistance follows the motion\'s shape and not its rate: only a stroke that is not its own reverse moves (Purcell, Life at low Reynolds number, Am. J. Phys. 45, 1977)', laws: reactionLaws('conducted'), parent: moving.id } })
        : add({ id: `thrust:${R.id}|${ref.id}`, kind: 'conversion', carrier: 'momentum', says: `the moving region pushes ${ref.id}'s matter back and is pushed forward: a fluid bears no contact, so momentum crosses only by the matter pushed; much of it changed little costs less power than little changed much`, regions: [moving.id, ref.id], values: [], why: { want: w.id, rule: 'a region gains momentum by giving it to the fluid\'s matter it pushes, where that momentum is carried', laws: reactionLaws('push', 'power'), parent: moving.id } });
    } else if (!ref || phase === null) {
      const ej = ejectable();
      for (const e of ej) {
        pusher = add({ id: `thrust:${R.id}|ejected`, kind: 'conversion', carrier: 'momentum', says: `nothing touches the moving region: it pushes against the ${e.carrier.id.slice('mass of '.length)} it carries and ejects`, regions: [moving.id], values: [{ name: 'fastest the ejected matter leaves: the root of twice its energy per mass', value: e.ve, unit: 'm/s', from: e.e.name }, ...(speedWanted ? [{ name: 'mass it must start with over the mass it ends with, to reach the speed and stop: e to the twice the speed over that', value: Math.exp(2 * speedWanted.value! / e.ve), unit: '1', from: 'reaction.ejection' }] : [])], why: { want: w.id, rule: 'with nothing to push against, a region pushes against the matter it ejects', laws: reactionLaws('push', 'ejection'), parent: moving.id } });
      }
      if (power.stores.length || power.aboard.length || power.light.length) {
        const e = add({ ...(ej.length ? { oneOf: `push of ${moving.id}` } : {}), id: `thrust:${R.id}|light`, kind: 'conversion', carrier: 'momentum', says: 'or the moving region emits light behind it and is pushed by its momentum: nothing is spent but power, and each watt pushes by one over the speed of light', regions: [moving.id], values: [{ name: 'push for each watt of light emitted', value: 1 / c0, unit: 'N/W', from: 'reaction.light' }, ...(speedWanted && masses[0] ? [{ name: 'light energy to reach the speed and stop: twice the momentum times the speed of light', value: 2 * masses[0].leaf.value! * speedWanted.value! * c0, unit: 'J', from: 'reaction.light' }] : [])], why: { want: w.id, rule: 'light carries momentum: what emits it is pushed back', laws: reactionLaws('light'), parent: moving.id } });
        pusher = pusher ?? e;
      }
      if (!pusher && !power.light.length) gap(w.id, moving.id, 'momentum', `nothing ${R.id} touches can be pushed, and nothing it carries or makes can leave it`);
    }
    if (role === 'acceleration' && w.when === 'on demand' && lo !== null && mu && mu.leaf.value! * g < lo) gap(w.id, pusher?.id ?? moving.id, 'momentum', `the want asks ${lo} m/s² and the contact carries at most ${(mu.leaf.value! * g).toFixed(2)} m/s² with the site's friction`);
    if (role === 'acceleration' && w.when === 'on demand' && /decel/.test(w.quantity.name)) {
      const brake = add({ id: `conversion:momentum:${R.id}:removal`, kind: 'conversion', carrier: 'momentum', says: phase === 'solid' ? 'on demand the moving region\'s momentum is taken out at the contact: its energy becomes heat, or returns to the store' : 'on demand the moving region\'s momentum is taken out by pushing the other way, or left to what resists it', regions: [moving.id], values: [], why: { want: w.id, rule: 'momentum removed from a moving region: its stored energy goes to heat or back to the store', laws: lawIds(c, 'dissipation', 'stored-energy'), parent: pusher?.id ?? moving.id } });
      add({ id: `modulation:momentum:${R.id}:removal`, kind: 'modulation', carrier: 'momentum', says: 'the person asks for the momentum to be taken out', regions: [moving.id], values: [], why: { want: w.id, rule: 'on demand: the person modulates', laws: [], parent: brake.id } });
      shed(brake, R.id, w.id);
    }
    if (role === 'acceleration' && w.when === 'always' && hi !== null && ref) {
      const dir = w.quantity.direction;
      const varies = Object.keys(ref.quantities).filter((sym) => ref.carriers?.[sym] === 'momentum' && !(ref.holds ?? []).includes(sym) && !(ref.limits ?? []).includes(sym) && (!dir || ref.directions?.[sym] === dir));
      for (const sym of varies) use(ref, sym);
      if (!varies.length) gap(w.id, pusher?.id ?? null, 'momentum', 'nothing the language sees varies at the contact');
      else {
        add({ id: `filter:momentum:${R.id}`, kind: 'path', carrier: 'momentum', says: `between the contact and ${R.id}, a path that stores and dissipates momentum, so what varies at the contact (${varies.map((s_) => ref.quantities[s_]!.name).join(', ')}) reaches ${R.id} below the bound`, regions: [pusher?.id ?? moving.id, R.id], values: [{ name: 'most acceleration', value: hi, unit: 'm/s^2', from: w.hi!.name }], why: { want: w.id, rule: 'a bounded rate under a varying neighbour: a store and a dissipation between them', laws: lawIds(c, 'storage', 'dissipation', 'flux-stored-energy'), parent: pusher?.id ?? moving.id } });
        observeAndModulate(c, R.id, w.id, pusher?.id ?? null, null);
      }
    }
    if (role === 'acceleration' && w.when === 'on demand' && hi !== null) {
      const v = w.condition && Object.values(w.condition).find((x) => x.carrier === 'momentum' && x.leaf.unit === 'm/s');
      const stroke = add({ id: `stroke:momentum:${R.id}`, kind: 'path', carrier: 'momentum', says: `in the event the momentum of ${R.id} leaves through a path that stores and dissipates it over a stroke long enough to keep the flux below ${hi} m/s² times the mass`, regions: [R.id, moving.id], values: [{ name: 'most acceleration', value: hi, unit: 'm/s^2', from: w.hi!.name }, ...(v ? [{ name: 'least stroke: v² / 2a', value: (v.leaf.value! ** 2) / (2 * hi), unit: 'm', from: `${v.leaf.name} and the bound` }] : [])], why: { want: w.id, rule: 'a bounded flux in an event: the content leaves over a stroke', laws: lawIds(c, 'stored-energy', 'dissipation'), parent: moving.id } });
      if (!v) gap(w.id, stroke.id, 'momentum', 'the event\'s speed is not a quantity: the stroke cannot be derived');
    }
    if (role === 'position' && w.when === 'always' && ref) {
      const r = said(ref, 'momentum', 'position')[0];
      add({ id: `modulation:momentum:${R.id}:direction`, kind: 'modulation', carrier: 'momentum', says: 'the person modulates which way the moving region is pushed, across the travel', regions: [moving.id], values: [], why: { want: w.id, rule: 'a position kept relative to a path: the push across the travel is modulated by who observes the path', laws: [], parent: pusher?.id ?? moving.id } });
      if (r && mu && pusher) put(pusher, { name: 'most speed on the tightest curve: the root of friction times gravity times its radius', value: Math.sqrt(mu.leaf.value! * g * r.leaf.value!), unit: 'm/s', from: `${mu.leaf.name} and ${r.leaf.name}` });
      else if (!r) gap(w.id, moving.id, 'momentum', 'how sharply the path turns is not said');
    }
    if ((role === 'position' && w.when === 'by the end') || role === 'potential') {
      // the power to move: a store carried from a source whose potential stands above its zero, what the moving region itself makes, or a flux it meets on the way (light it converts, light or a moving medium whose momentum it takes)
      const { stores, aboard, light, wind } = power;
      if (!stores.length && !aboard.length && !light.length && !wind.length) { gap(w.id, moving.id, 'momentum', 'nothing offers the power to move'); return; }
      const n = stores.length + aboard.length + 2 * light.length + wind.length;
      const alt = n > 1 ? { oneOf: `power of ${moving.id}` } : {};
      for (const f of stores) {
        const store = add({ ...alt, id: `store:${f.carrier.id}:${moving.id}`, kind: 'store', carrier: f.carrier.id, says: `a store of ${f.carrier.id} the moving region carries: it moves away from ${f.region}, so no path to it lasts`, regions: [moving.id], values: role === 'position' && lo !== null ? [{ name: 'distance the store must last', value: lo, unit: 'm', from: w.lo!.name }] : [], why: { want: w.id, rule: 'a moving region carries its store: a path to a fixed source would have to stretch', laws: lawIds(f.carrier, 'storage', 'stored-energy'), parent: moving.id } });
        add({ id: `refill:${f.carrier.id}:${moving.id}`, kind: 'path', carrier: f.carrier.id, says: `the store is filled from ${f.region} when the moving region is there`, regions: [f.region, moving.id], values: [], why: { want: w.id, rule: 'a store is replenished from its source', laws: lawIds(f.carrier, 'conductance'), parent: store.id } });
        const into = phase === 'solid' ? 'angular momentum, which the rolling contact couples to momentum' : phase === 'fluid' ? `the push on ${ref!.id}'s matter` : 'the push of what leaves it';
        const conv = add({ ...(n > 1 ? { oneOf: `conversion of ${moving.id}` } : {}), id: `conversion:${f.carrier.id}->momentum:${moving.id}`, kind: 'conversion', carrier: 'momentum', says: f.carrier.id === 'charge' ? `charge from the store becomes ${into}` : `${f.carrier.id} from the store becomes heat, then work bounded by Carnot, then ${into}`, regions: [moving.id], values: [], why: { want: w.id, rule: 'the store\'s carrier is converted to the momentum the moving region gives what it pushes', laws: [...coupling(f.carrier, carrierById('angular momentum')).map((l) => l.id), ...(phase === 'solid' ? coupling(carrierById('angular momentum'), c).map((l) => l.id) : reactionLaws('push', 'power'))], parent: store.id } });
        add({ id: `modulation:${f.carrier.id}:${moving.id}:person`, kind: 'modulation', carrier: 'momentum', says: 'the person chooses how much of the store is converted', regions: [moving.id], values: [], why: { want: w.id, rule: 'on demand: the person modulates the conversion', laws: [], parent: conv.id } });
        shed(conv, R.id, w.id);
      }
      for (const a_ of aboard) add({ ...alt, id: `aboard:${R.id}`, kind: 'conversion', carrier: 'momentum', says: `${a_.leaf.name} becomes the momentum the moving region gives what it pushes: what is carried makes its own power, and no store is carried for it`, regions: [moving.id], values: [{ name: a_.leaf.name, value: a_.leaf.value!, unit: 'W', from: R.id }], why: { want: w.id, rule: 'a region that makes power in a carrier is its own source', laws: lawIds(c, 'power'), parent: moving.id } });
      for (const l of light) add({ ...alt, id: `intercept:${R.id}|${l.region}`, kind: 'conversion', carrier: 'light', says: `the moving region intercepts ${l.region}'s light on the way and converts it: no store need last the trip, the area must give the power`, regions: [moving.id, l.region], values: [{ name: 'least area for each watt, if all the light were converted', value: 1 / l.q.leaf.value!, unit: 'm^2/W', from: l.q.leaf.name }], why: { want: w.id, rule: 'a moving region can take power from a flux it passes through', laws: [], parent: moving.id } });
      // a flux that carries momentum pushes the face it crosses: light by its energy flux over the speed of light, a moving medium by its matter's momentum flux; twice that if the face turns it back
      const fluidNear = intent.regions.find((r) => near(r, ref) && phaseOf(r) === 'fluid' && densityIn(r));
      const intercepted = [
        ...light.map((l) => ({ region: l.region, q: l.q, pressure: l.q.leaf.value! / c0, from: `${l.q.leaf.name} over the speed of light`, laws: reactionLaws('light') })),
        ...wind.map((x) => { const rho = fluidNear ? densityIn(fluidNear) : null; return { region: x.region, q: x.q, pressure: rho ? rho.value! * x.q.leaf.value! ** 2 : null, from: rho ? `${rho.name} times ${x.q.leaf.name} squared` : '', laws: reactionLaws('push') }; }),
      ];
      for (const x of intercepted) {
        const sail = add({ ...alt, id: `thrust:${R.id}|${x.region}`, kind: 'conversion', carrier: 'momentum', says: `a face across ${x.region}'s flux takes its momentum and is pushed: no store is needed`, regions: [moving.id, x.region], values: x.pressure !== null ? [{ name: 'push per area of a face that stops the flux, twice it if the face turns it back', value: x.pressure, unit: 'Pa', from: x.from }, { name: 'least area for each newton', value: 1 / (2 * x.pressure), unit: 'm^2/N', from: 'turning the flux back' }] : [], why: { want: w.id, rule: 'a flux that carries momentum gives it to what it meets', laws: x.laws, parent: moving.id } });
        if (x.q.leaf.dim.join() === dimOfSpeed && ref) gap(w.id, sail.id, 'momentum', 'moving across a moving medium needs a push across from a second medium (a keel in water, a contact on ice): the language does not yet pair two media');
      }
      // what the moving region pushes through resists it, by the regime the motion makes in each fluid it touches
      // a region the moving region passes through, with matter in it, flows: where its state is not said, that is taken and said
      const touched = intent.regions.filter((r) => r.environment && touches(intent, r.id, R.id) && phaseOf(r) !== 'solid' && densityIn(r));
      let unsized = false;
      for (const d of touched) {
        const drag = add({ id: `drag:${moving.id}|${d.id}`, kind: 'boundary', carrier: 'momentum', says: `the moving region gives momentum to ${d.id}, a fluid at rest it pushes through`, regions: [moving.id, d.id], values: [], why: { want: w.id, rule: 'a region moving through a fluid at rest loses momentum to it', laws: lawIds(c, 'conductance', 'dissipation'), parent: moving.id } });
        if (phaseOf(d) === null) gap(w.id, drag.id, 'momentum', `whether ${d.id} flows is not said (its temperature against what its matter flows above): it is taken to, as the moving region passes through it`);
        const rg = regimeOf(d);
        if (rg) {
          put(drag, { name: 'momentum it carries over momentum it conducts: density times speed times length over viscosity (the Reynolds number)', value: rg.Re, unit: '1', from: `${d.id}'s density and viscosity` });
          cite(drag, 'reynolds');
          if (rg.conducted) {
            const F = 6 * Math.PI * rg.mu.value! * rg.r * speedWanted!.value!;
            put(drag, { name: 'the resistance is conducted momentum, its conductance times the speed', value: F, unit: 'N', from: 'reaction.conducted' });
            put(drag, { name: 'power to keep the speed: the resistance times the speed', value: F * speedWanted!.value!, unit: 'W', from: 'reaction.conducted' });
            if (trip) put(drag, { name: 'energy over the trip', value: F * speedWanted!.value! * trip.t, unit: 'J', from: trip.from });
            cite(drag, ...reactionLaws('conducted'));
          } else { put(drag, { name: rg.carried ? 'the resistance is carried momentum: it grows with the square of the speed' : 'between conducted and carried momentum', value: rg.carried ? 2 : 1.5, unit: '1', from: 'the exponent of the speed' }); unsized = true; }
        } else unsized = true;
        // whether the speed nears how fast a push travels through the fluid: past it, the fluid ahead cannot know to move aside
        const K = momentumProperty(d, 'stiffness');
        if (K && speedWanted) { const a = Math.sqrt(K.value! / densityIn(d)!.value!); const Ma = speedWanted.value! / a; put(drag, { name: `how fast a push travels through ${d.id}: the root of its stiffness over its density`, value: a, unit: 'm/s', from: 'reaction.sound' }); put(drag, { name: `the speed over that (the Mach number): ${Ma < 0.3 ? 'below about 0.3 its density barely changes' : Ma < 0.8 ? 'its density changes as it moves aside' : Ma < 1.2 ? 'near one, the fluid ahead cannot move aside in time and a shock forms' : 'past one, a shock stands ahead of it'}`, value: Ma, unit: '1', from: `${speedWanted.name}` }); cite(drag, ...reactionLaws('sound')); }
        else if (speedWanted) gap(w.id, drag.id, 'momentum', `how stiff ${d.id} is under quick compression is not said: how near the speed is to the speed a push travels through it cannot be read`);
        // in a liquid the pressure falls where it flows fast around the moving region: by up to about half its density times the speed squared (its least pressure coefficient is of order one, and of the shape); where that falls below the vapour pressure, the liquid boils there
        if (fluidState(d) === 'liquid' && speedWanted) {
          const pabs = Object.entries(d.properties ?? {}).find(([, p]) => p.role === 'absolute pressure')!;
          const pv = vapourPressure(d.matter!, stateOf(d, 'energy')!.lo);
          const sigma = (d.quantities[pabs[0]]!.value! - pv) / (0.5 * densityIn(d)!.value! * speedWanted.value! ** 2);
          put(drag, { name: `vapour pressure of ${d.matter} at its temperature, from its phases' Gibbs energies`, value: pv, unit: 'Pa', from: 'src/nexus/substrate/phase.ts' });
          put(drag, { name: `the pressure above boiling over half the density times the speed squared (the cavitation number): ${sigma < 0.1 ? 'far below one, it boils around any shape' : sigma > 10 ? 'far above one, nowhere around it can boil' : 'near one, whether it boils is its shape\'s'}`, value: sigma, unit: '1', from: `${pabs[1].of}'s absolute pressure and ${speedWanted.name}` });
          if (sigma >= 0.1 && sigma <= 10) gap(w.id, drag.id, 'momentum', `whether ${d.id} boils around the moving region is its shape's least pressure coefficient: not generated`);
        }
        // on the boundary between a liquid and a lighter fluid, under gravity, the moving region makes waves its own length
        const lighter = touched.find((x) => x.id !== d.id && densityIn(x)!.value! < densityIn(d)!.value!);
        if (lighter && g > 0 && sh && speedWanted) { const L = Math.max(sh.x.value!, sh.z.value!); const cw = Math.sqrt(g * L / (2 * Math.PI)); put(drag, { name: `speed of a wave on ${d.id} as long as the moving region: the root of gravity times its length over two pi`, value: cw, unit: 'm/s', from: 'reaction.surface-wave' }); put(drag, { name: `the speed over that: ${speedWanted.value! / cw < 1 ? 'below one it parts the liquid it displaces' : 'past one it climbs the wave it makes, and is held up only by turning the stream down'}`, value: speedWanted.value! / cw, unit: '1', from: speedWanted.name }); cite(drag, ...reactionLaws('surface-wave')); }
      }
      if (sh) put(elements.find((e) => e.id.startsWith(`drag:${moving.id}`)), { name: 'area facing the travel, at least: what the moving region must hold across and up', value: sh.x.value! * sh.y.value!, unit: 'm^2', from: `${sh.x.name} times ${sh.y.name}` });
      const grade = ref ? Object.entries(ref.quantities).find(([sym, l]) => ref.carriers?.[sym] === 'momentum' && !(ref.limits ?? []).includes(sym) && l.dim.every((x) => x === 0)) : undefined;
      if (grade && ref) { use(ref, grade[0]); put(moving, { name: 'steepest grade it climbs: gravity along the path is that fraction of the weight', value: grade[1].value!, unit: '1', from: grade[1].name }); }
      if (touched.length && unsized) gap(w.id, moving.id, 'momentum', sh ? 'how hard the fluid pushes back on a shape where its momentum is carried (its drag coefficient) is not generated: the store and the power cannot be sized' : 'how much the store holds needs the resistance to motion, which needs the moving region\'s size and shape: no geometry');
    }
  };

  /**
   * How long a change takes: the content change over the flux that makes it (the balance integrated over time). A
   * want that bounds the time bounds the flux from below; for a region that must cross out of another, the content
   * is the distance and the flux its speed; for a modulation, the time is how fast it responds.
   */
  const duration = (w: Want, c: Carrier): boolean => {
    if (w.quantity.unit !== 's' || w.hi === undefined) return false;
    const R = regionOf(intent, w.region);
    const t = w.hi.value!;
    if (c.id === 'momentum' && w.relativeTo) {
      const X = shape(w.relativeTo);
      const speed = said(R, 'momentum', 'potential')[0];
      if (!X) { gap(w.id, null, 'momentum', `how far ${R.id} must go to leave ${w.relativeTo} needs its shape: no geometry`); return true; }
      const out = X.touches.side;
      const d = Math.hypot(X.x.value!, X.z.value!) / 2;
      const pass = add({ id: `passage:${R.id}|${w.relativeTo}`, kind: 'boundary', carrier: 'momentum', says: `${R.id} cross the sides of ${w.relativeTo} to ${out ?? 'outside it'}: a part of the boundary they can pass`, regions: [w.relativeTo, out ?? w.relativeTo], values: [{ name: 'farthest distance to the sides', value: d, unit: 'm', from: 'half the diagonal of the plan' }, ...(speed ? [{ name: 'time to leave at the speed they move', value: d / speed.leaf.value!, unit: 's', from: `the distance over ${speed.leaf.name}` }] : [])], why: { want: w.id, rule: 'a region that must leave another crosses its boundary: the time is the distance over the speed', laws: [], parent: null } });
      if (speed && d / speed.leaf.value! > t) gap(w.id, pass.id, 'momentum', `the people need ${(d / speed.leaf.value!).toFixed(0)} s and the want allows ${t} s`);
      if (!speed) gap(w.id, pass.id, 'momentum', `how fast ${R.id} move is not said`);
      // what passes there opens the boundary to every other carrier it keeps: so the passage opens only when crossed
      add({ id: `modulation:passage:${R.id}|${w.relativeTo}`, kind: 'modulation', carrier: 'momentum', says: `${R.id} open the passage to cross and close it after, so the other carriers the boundary keeps stay kept`, regions: [w.relativeTo], values: [], why: { want: w.id, rule: 'an opening in a boundary that keeps carriers is modulated by who passes', laws: [], parent: pass.id } });
      return true;
    }
    if (c.id === 'momentum' || (c.id === 'charge' && !shape(R.id))) {
      // how fast a modulation responds: every modulation the person makes of this carrier, or of the region's motion
      const mods = elements.filter((e) => e.kind === 'modulation' && /person/.test(e.says) && (e.carrier === c.id || e.regions.some((r) => r.startsWith('moving:'))));
      if (!mods.length) {
        const src = elements.find((e) => e.kind === 'path' && e.carrier === c.id && intent.regions.some((r) => r.id === e.regions[0] && r.environment));
        if (!src) { gap(w.id, null, c.id, `nothing the person modulates in ${c.id}`); return true; }
        mods.push(add({ id: `modulation:${c.id}:${src.id}:person`, kind: 'modulation', carrier: c.id, says: `the person opens and closes ${src.says.replace(/^a path/, 'the path')}`, regions: src.regions, values: [], why: { want: w.id, rule: 'what the person starts and stops is a modulation of what it draws', laws: [], parent: src.id } }));
      }
      for (const m of mods) put(m, { name: 'most response time', value: t, unit: 's', from: w.hi.name });
      return true;
    }
    // the region's content of the carrier must reach what it can hold within the time: a least flux
    const sh = shape(R.id);
    if (!sh) { gap(w.id, null, c.id, `how much ${R.id} must take in needs its size: no geometry`); return true; }
    const V = sh.x.value! * sh.y.value! * sh.z.value!;
    const u = add({ id: `use:${c.id}:${R.id}`, kind: 'region', carrier: c.id, says: `a point of use of ${c.id} in ${R.id}`, regions: [R.id], values: [], why: { want: w.id, rule: 'a flux delivered into a region arrives at a point of use', laws: lawIds(c, 'conductance'), parent: null } });
    put(u, { name: 'least flux to fill it in time: its volume over the time', value: V / t, unit: c.flux, from: `the volume of ${R.id} and ${w.hi.name}` });
    return true;
  };

  /**
   * A held potential: the region exchanges its carrier with every neighbour at another potential (a generated region
   * with the region it is immersed in); its balance needs a supply when a neighbour can pull it below the band and a
   * removal when one can push it above or what is made inside must leave; a band against a varying neighbour is
   * observed and modulated.
   */
  const holdPotential = (Rid: string, c: Carrier, lo: number | null, hi: number | null, want: string | null, parent: string | null) => {
    const host = hosts.get(Rid);
    const nbrs = (host ? [stateOf(regionOf(intent, host), c.id)] : intent.regions.filter((n) => n.id !== Rid && touches(intent, n.id, Rid)).map((n) => stateOf(n, c.id))).filter((x): x is State => !!x);
    for (const n of nbrs) {
      const b = add({ id: `boundary:${c.id}:${Rid}|${n.region}`, kind: 'boundary', carrier: c.id, says: `${Rid} exchanges ${c.id} with ${n.region} through a boundary whose conductance is free`, regions: [Rid, n.region], values: [], why: { want, rule: 'a held potential exchanges its carrier with every neighbour at another potential', laws: lawIds(c, 'conductance'), parent } });
      if (!host) faceElements(b, c.id, Rid, n.region);
    }
    const made = host ? 0 : madeInto(c.id, Rid).reduce((s, m) => s + m.leaf.value!, 0);
    if (!nbrs.length && !made) gap(want, parent, c.id, `nothing touching ${Rid} holds ${c.id} or makes it: the balance has no terms`);
    if (lo !== null && nbrs.some((n) => n.lo < lo)) supply(c, Rid, { above: lo }, want, parent);
    if (hi !== null && (nbrs.some((n) => n.hi > hi) || made > 0)) {
      const steady = nbrs.filter((n) => n.hi < hi);
      if (made > 0 && steady.length && !nbrs.some((n) => n.hi > hi)) {
        const s = steady.sort((a, b) => a.hi - b.hi)[0]!;
        const b = add({ id: `boundary:${c.id}:${Rid}|${s.region}`, kind: 'boundary', carrier: c.id, says: `${Rid} exchanges ${c.id} with ${s.region} through a boundary whose conductance is free`, regions: [Rid, s.region], values: [], why: { want, rule: 'a held potential exchanges its carrier with every neighbour at another potential', laws: lawIds(c, 'conductance'), parent } });
        put(b, { name: 'least conductance: what is made inside over the difference the band allows', value: made / (hi - s.hi), unit: `${c.flux} per ${c.potential}`, from: madeInto(c.id, Rid).map((m) => m.leaf.name).join(' + ') });
      } else supply(c, Rid, { below: hi }, want, parent);
    }
    if (lo !== null && hi !== null && nbrs.some((n) => n.lo < lo || n.hi > hi || n.lo !== n.hi)) observeAndModulate(c, Rid, want, parent, hi - lo);
  };
  const boundsOn: { want: Want; carrier: Carrier; around: string }[] = [];

  /**
   * A want on information: what is told apart, held, or heard. Its ties to the rest are the second law (each bit erased
   * sends at least k T ln 2 of heat out), the rate a barrier is crossed at (a bit held for a time sits behind a barrier
   * that is crossed less than once in that time), and the speed of light (what is heard is no nearer than its speed
   * times the lag).
   */
  const informationWant = (w: Want, R: Region) => {
    const kB = CONST.kB.value!, h = CONST.h.value!, c0 = CONST.c.value!;
    const lo = w.lo?.value ?? null, hi = w.hi?.value ?? null;
    const sinks = reservoirs('energy').filter((x) => x.region !== R.id);
    const coldest = sinks.length ? sinks.reduce((a, b) => (b.hi < a.hi ? b : a)) : null;
    if (w.quantity.unit === '1/s' && lo !== null) {
      if (!coldest) { gap(w.id, null, 'information', `nothing ${R.id} can send its heat to holds a temperature: the least power to erase cannot be read`); return; }
      const P = lo * kB * coldest.hi * Math.LN2;
      const conv = add({ id: `conversion:information:${R.id}`, kind: 'conversion', carrier: 'information', says: `${R.id} tells states apart and erases them: each bit erased sends at least k T ln 2 of heat out, at the coldest it can go`, regions: [R.id], values: [
        { name: 'bits erased per second', value: lo, unit: '1/s', from: w.lo!.name },
        { name: 'least power: the bits erased per second times k T ln 2, at the coldest the heat can go', value: P, unit: 'W', from: `the second law (Landauer); ${coldest.leaves[0]!.name}` },
      ], why: { want: w.id, rule: 'erasing information is the second law\'s: what is told apart and forgotten leaves as heat', laws: [], parent: null } });
      for (const sct of powerSources(R.id)) {
        const pp = path(sct.carrier, sct.region, R.id, w.id, `${R.id} draws ${sct.carrier.id} from ${sct.region} to erase`, conv.id);
        for (const lim of saidOf(sct.region, sct.carrier.id, 'power', true)) put(pp, { name: `within what ${sct.region} gives: ${lim.leaf.name}`, value: lim.leaf.value!, unit: lim.leaf.unit, from: lim.leaf.name });
      }
      shed(conv, R.id, w.id, true);
      gap(w.id, conv.id, 'information', 'what a realization spends per bit it erases is not derived: the least is k T ln 2, and nothing generated says how near to it a realization comes');
      return;
    }
    if (w.quantity.unit === '1' && lo !== null) {
      const held = intent.wants.find((x) => x.region === R.id && x.quantity.carrier === 'energy' && x.hi);
      const T = held ? held.hi!.value! : coldest?.hi ?? null;
      const t = intent.duration?.value ?? null;
      if (T === null || t === null) { gap(w.id, null, 'information', 'how hot it is held, or for how long, is not said: the barrier each bit needs cannot be read'); return; }
      const Eb = kB * T * Math.log(t * kB * T / h);
      add({ id: `bound:information:${R.id}:held`, kind: 'bound', carrier: 'information', says: `each bit ${R.id} holds sits behind a barrier crossed less than once over the time it is held: at least k T times the log of that time times the rate a barrier is tried at, k T / h`, regions: [R.id], values: [
        { name: 'bits held', value: lo, unit: '1', from: w.lo!.name },
        { name: 'least barrier per bit', value: Eb, unit: 'J', from: `the rate a barrier is crossed at (src/nexus/substrate/rate.ts); ${held ? held.hi!.name : coldest!.leaves[0]!.name}; ${intent.duration!.name}` },
        { name: 'least barrier per bit, over k T', value: Eb / (kB * T), unit: '1', from: 'the same' },
      ], why: { want: w.id, rule: 'a state held is a state whose barrier is crossed less than once in the time it is held', laws: [], parent: null } });
      return;
    }
    if (w.quantity.unit === 's' && hi !== null) {
      const most = c0 * hi;
      const host = intent.regions.find((x) => x.id !== R.id && touches(intent, x.id, R.id) && x.extent);
      const sh = host ? shape(host.id) : null;
      const across = sh ? Math.hypot(sh.x.value!, sh.y.value!, sh.z.value!) : null;
      const b = add({ id: `bound:information:${R.id}:lag`, kind: 'bound', carrier: 'information', says: `what ${R.id} hears is no nearer in time than its distance over the speed of light: its parts lie within the speed of light times the lag of each other`, regions: [R.id, ...(host ? [host.id] : [])], values: [
        { name: 'most distance between its parts: the speed of light times the lag', value: most, unit: 'm', from: `${CONST.c.name}; ${w.hi!.name}` },
        ...(across !== null ? [{ name: `largest distance within ${host!.id}`, value: across, unit: 'm', from: 'the diagonal of its extent' }] : []),
      ], why: { want: w.id, rule: 'nothing told travels faster than light: a lag bounds the size of what must act as one', laws: [], parent: null } });
      if (across !== null && across > most) gap(w.id, b.id, 'information', `${host!.id} is larger across than the lag lets ${R.id}'s parts be apart`);
      // where nothing says how large it is, its size is the design's to choose: the bound is what the choice must meet
      return;
    }
    gap(w.id, null, 'information', `${w.quantity.name} (${w.quantity.unit}) is about information, and no rule reads it`);
  };

  for (const w of intent.wants) {
    const cid = w.quantity.carrier;
    if (cid === 'information') { informationWant(w, regionOf(intent, w.region)); continue; }
    if (cid && duration(w, carrierById(cid))) continue;
    if (!cid) { gap(w.id, null, null, `${w.quantity.name} (${w.quantity.unit}) is about no carrier: ${w.quantity.unit === 's' ? 'a want on how long a process takes, and the language has no process' : 'the language has no rule for it'}`); continue; }
    const c = carrierById(cid);
    const role = roleOf(c, w.quantity.unit);
    const R = regionOf(intent, w.region);
    const lo = w.lo?.value ?? null, hi = w.hi?.value ?? null;

    if (c.id === 'momentum') { momentumWant(w, c, role, R); continue; }

    if (role === 'potential' && w.relativeTo) { boundsOn.push({ want: w, carrier: c, around: w.relativeTo }); continue; }
    if (role === 'potential' && (w.when === 'always' || w.when === 'by the end')) {
      holdPotential(R.id, c, lo, hi, w.id, null);
      continue;
    }

    if (role === 'potential' && w.when === 'on demand') {
      const src = reservoirs(c.id).filter((s) => s.region !== R.id && (lo === null || s.lo > lo)).sort((a, b) => b.lo - a.lo);
      if (!src.length) { supply(c, R.id, { above: lo ?? -Infinity }, w.id, null); continue; }
      const p = path(c, src[0]!.region, R.id, w.id, 'a potential delivered on demand: a path from a source always above it', null);
      if (p && lo !== null) p.values.push({ name: 'largest drop the path may have', value: src[0]!.lo - lo, unit: c.potential ?? '1', from: `${src[0]!.leaves[0]!.name} less ${w.lo!.name}` });
      continue;
    }

    if (role === 'flux' || role === 'flux density' || role === 'power') {
      const use_ = add({ id: `use:${c.id}:${R.id}`, kind: 'region', carrier: c.id, says: `a point of use of ${c.id} in ${R.id}`, regions: [R.id], values: lo !== null ? [{ name: `least ${role}`, value: lo, unit: w.quantity.unit, from: w.lo!.name }] : [], why: { want: w.id, rule: 'a flux delivered into a region arrives at a point of use', laws: lawIds(c, 'conductance'), parent: null } });
      const bringers = intent.regions.filter((r) => r.environment && (said(r, c.id, 'flux density').length || said(r, c.id, 'flux').length));
      if (bringers.length && !reservoirs(c.id).length) {
        for (const b of bringers) { const via = route(R.id, b.id); add({ id: `boundary:${c.id}:${R.id}|${via?.[1] ?? b.id}:open`, kind: 'boundary', carrier: c.id, says: `${c.id} from ${b.id} crosses into ${R.id} through a boundary transparent to it`, regions: [R.id, via?.[1] ?? b.id], values: [], why: { want: w.id, rule: `a flux the environment brings (${b.id}) is let through`, laws: [], parent: use_.id } }); }
        const least = Math.min(...bringers.flatMap((b) => [...said(b, c.id, 'flux density'), ...said(b, c.id, 'flux')].map((q) => q.leaf.value!)));
        if (lo !== null && least < lo) {
          const conv = add({ id: `conversion:${c.id}:${R.id}:supply`, kind: 'conversion', carrier: c.id, says: `a conversion that makes ${c.id} in ${R.id} when the environment's falls below the want`, regions: [R.id], values: [], why: { want: w.id, rule: 'what the environment brings falls below the want: a conversion makes the rest', laws: [], parent: use_.id } });
          for (const s of powerSources(R.id)) {
            conv.why.laws = [...new Set([...conv.why.laws, ...lawIds(s.carrier, 'power')])];
            path(s.carrier, s.region, R.id, w.id, `the conversion draws ${s.carrier.id} from ${s.region}`, conv.id);
            if (s.carrier.id === 'charge') add({ id: `return:charge:${R.id}->${s.region}`, kind: 'path', carrier: 'charge', says: `the charge returns from ${R.id} to ${s.region}: charge is neither made nor destroyed`, regions: [R.id, s.region], values: [], why: { want: w.id, rule: 'charge drawn returns', laws: lawIds(s.carrier, 'conductance'), parent: conv.id } });
          }
          add({ id: `modulation:${c.id}:${R.id}:person`, kind: 'modulation', carrier: c.id, says: `the person switches the conversion into ${c.id} on and off`, regions: [R.id], values: [], why: { want: w.id, rule: 'on demand: the person modulates', laws: [], parent: conv.id } });
          shed(conv, R.id, w.id, true);
        }
        continue;
      }
      const usePotential = c.id === 'charge' ? 0 : Math.min(...reservoirs(c.id).map((s) => s.lo));
      const above = reservoirs(c.id).filter((s) => s.region !== R.id && s.lo > usePotential).sort((a, b) => b.lo - a.lo)[0];
      const via = above ? path(c, above.region, R.id, w.id, `a flux on demand from a source above the point of use (${above.leaves[0]!.name})`, use_.id) : null;
      if (!above) supply(c, R.id, { above: Infinity }, w.id, use_.id);
      add({ id: `modulation:${c.id}:${R.id}:person`, kind: 'modulation', carrier: c.id, says: `the person opens and closes the flow of ${c.id} into ${R.id}`, regions: [R.id], values: [], why: { want: w.id, rule: 'on demand: the person modulates the path', laws: [], parent: via?.id ?? use_.id } });
      if (above && lo !== null) {
        flux.push({ region: R.id, carrier: c.id, J: role === 'power' ? lo / above.lo : lo, from: role === 'power' ? `${w.lo!.name} over ${above.leaves[0]!.name}` : w.lo!.name });
        for (const lim of saidOf(above.region, c.id, role, true)) {
          if (lim.leaf.value! < lo) gap(w.id, use_.id, c.id, `the want asks ${lo} ${w.quantity.unit} and ${above.region} gives at most ${lim.leaf.value} (${lim.leaf.name})`);
          else use_.values.push({ name: `within what ${above.region} gives`, value: lim.leaf.value!, unit: lim.leaf.unit, from: lim.leaf.name });
        }
      }
      if (c.id === 'charge') add({ id: `return:charge:${R.id}->${above?.region ?? 'its source'}`, kind: 'path', carrier: 'charge', says: `the charge returns from ${R.id} to ${above?.region ?? 'its source'}: charge is neither made nor destroyed`, regions: [R.id, above?.region ?? R.id], values: [], why: { want: w.id, rule: 'a delivered charge returns', laws: lawIds(c, 'conductance'), parent: use_.id } });
      else if (contentBound(R.id, c.id)) drain(c, R.id, usePotential, w.id, use_.id);
      continue;
    }

    // a content reached by the end. A region's content changes only by what crosses its boundary and what is made in
    // it, so there are two ways and no third: it is brought in, at least what is added over how long; or, for a matter,
    // it is made inside. A matter is conserved only where it does not react: to grow, it is made, and what is conserved
    // then is what it is made of. Made in proportion to what is already there (a matter that makes more of itself), it
    // grows as Q0 2^(t/tau), so it doubles at least every tau = T / log2(Q / Q0).
    if (role === 'content' && lo !== null && w.when === 'by the end') {
      const T = intent.duration.value!;
      const start = said(R, c.id, 'content');
      for (const q of start) use(R, q.sym);
      const Q0 = start.reduce((a, q) => a + q.leaf.value!, 0), dQ = lo - Q0;
      const store = add({ id: `store:${c.id}:${R.id}:reached`, kind: 'store', carrier: c.id, says: `${R.id} holds ${c.id}: by the end, at least ${lo} ${w.quantity.unit}`, regions: [R.id], values: [{ name: 'content held by the end', value: lo, unit: w.quantity.unit, from: w.lo!.name }, ...(start.length ? [{ name: 'content it starts with', value: Q0, unit: w.quantity.unit, from: start.map((q) => q.leaf.name).join(' + ') }] : [])], why: { want: w.id, rule: 'a content reached by the end is held: a store of the carrier', laws: lawIds(c, 'storage'), parent: null } });
      if (dQ <= 0) continue;
      const from = reservoirs(c.id).filter((x) => x.region !== R.id);
      if (from.length) {
        const src = from[0]!;
        const pth = path(c, src.region, R.id, w.id, `what is reached by the end is brought from ${src.region}`, store.id);
        put(pth, { name: 'least mean flux: what is added over how long', value: dQ / T, unit: c.flux, from: `${w.lo!.name}${start.length ? ' less what it starts with' : ''}, over ${intent.duration.name}` });
        for (const lim of saidOf(src.region, c.id, 'flux', true)) {
          if (lim.leaf.value! < dQ / T) gap(w.id, pth?.id ?? store.id, c.id, `the want needs ${dQ / T} ${c.flux} on average and ${src.region} gives at most ${lim.leaf.value} (${lim.leaf.name})`);
          else put(pth, { name: `within what ${src.region} gives`, value: lim.leaf.value!, unit: lim.leaf.unit, from: lim.leaf.name });
        }
        continue;
      }
      const isMatter = c.content === 'kg' || c.content === 'mol' || c.content === 'm^3';
      if (!isMatter) { gap(w.id, store.id, c.id, `${c.id} is conserved and nothing ${R.id} touches holds it: what is reached cannot be brought`); continue; }
      if (Q0 > 0) {
        const doublings = Math.log2(lo / Q0), tau = T / doublings;
        const make = add({ id: `conversion:${c.id}:${R.id}:itself`, kind: 'conversion', carrier: c.id, says: `${c.id} in ${R.id} is made in proportion to what is already there: it makes more of itself, doubling at least every ${Number(tau.toPrecision(3))} s`, regions: [R.id], values: [
          { name: 'doublings by the end', value: doublings, unit: '1', from: `log2 of ${w.lo!.name} over what it starts with` },
          { name: 'longest doubling time', value: tau, unit: 's', from: `${intent.duration.name} over the doublings` },
          { name: 'least rate of making at the end: the content times ln 2 over the doubling time', value: (lo * Math.LN2) / tau, unit: c.flux, from: 'the growth law Q0 2^(t/tau) differentiated at the end' },
        ], why: { want: w.id, rule: 'a matter that grows without being brought is made inside; made in proportion to itself it doubles every tau', laws: [], parent: store.id } });
        gap(w.id, make.id, c.id, `a matter that makes more of itself: what ${c.id} is made of is not stated, so nothing says what supply its making draws on, what its making takes in energy, or what makes it in proportion to itself`);
      } else gap(w.id, store.id, c.id, `${R.id} starts with no ${c.id} and nothing brings it: what would make it is not stated`);
      continue;
    }

    if (role === 'content' && hi !== null) {
      const bringers = intent.regions.filter((r) => r.id !== R.id && r.environment && (said(r, c.id, 'flux density').length || said(r, c.id, 'flux').length));
      const ambient = reservoirs(c.id).length ? Math.min(...reservoirs(c.id).map((s) => s.lo)) : 0;
      for (const b of bringers) {
        const via = route(b.id, R.id);
        const next = via && via.length > 1 ? via[via.length - 2]! : b.id;
        const bnd = add({ id: `boundary:${c.id}:${R.id}|${next}:closed`, kind: 'boundary', carrier: c.id, says: `no ${c.id} crosses from ${next} into ${R.id}: a boundary that does not conduct it`, regions: [R.id, next], values: [{ name: 'conductance', value: 0, unit: `${c.flux} per ${c.potential}`, from: w.hi!.name }], why: { want: w.id, rule: `a bounded content: the ${c.id} ${b.id} brings is kept out`, laws: lawIds(c, 'conductance'), parent: null } });
        const brought = [...said(b, c.id, 'flux density')];
        const dirs = brought.map((q) => b.directions?.[q.sym]).filter((d): d is NonNullable<typeof d> => !!d);
        const windy = via ? via.some((x) => { const vr = intent.regions.find((y) => y.id === x); return !!vr && Object.entries(vr.directions ?? {}).some(([sym, d]) => d === 'across' && vr.carriers?.[sym] === 'momentum'); }) : false;
        const crossed = dirs.length ? [...new Set([...dirs.flatMap(facesCrossed), ...(windy ? ['side' as Face] : [])])] : undefined;
        const faces = faceElements(bnd, c.id, R.id, next, crossed);
        const sh = shape(R.id);
        let carried: number | null = null;
        if (sh && crossed && brought.length) carried = brought.reduce((s, q) => s + q.leaf.value! * crossed.reduce((a, f) => a + sh.area[f].value!, 0), 0);
        if (faces.length && carried !== null) put(bnd, { name: `what the ${crossed!.join(' and ')} face${crossed!.length > 1 ? 's' : ''} intercept`, value: carried, unit: c.flux, from: `${brought.map((q) => q.leaf.name).join(' + ')} times the area` });
        if (windy) put(bnd, { name: 'the sides take what the wind carries across', value: 1, unit: '1', from: 'the region it falls through is pushed across' });
        drain(c, next, ambient, w.id, bnd.id, sh ? sh.y.value! : null);
        if (carried !== null) { const d = elements.find((e) => e.why.parent === bnd.id && e.kind === 'path'); put(d, { name: 'what it carries', value: carried, unit: c.flux, from: 'what the faces intercept' }); }
      }
      for (const m of madeInto(c.id, R.id).filter((x) => x.region !== R.id)) {
        const at = add({ id: `collect:${c.id}:${m.region}`, kind: 'region', carrier: c.id, says: `where ${m.leaf.name} is made, it is collected before it reaches ${R.id}`, regions: [m.region, R.id], values: [{ name: m.leaf.name, value: m.leaf.value!, unit: m.leaf.unit, from: m.region }], why: { want: w.id, rule: 'a bounded content: what is made into it is collected where it is made', laws: [], parent: null } });
        drain(c, R.id, ambient, w.id, at.id);
      }
      if (!bringers.length && !madeInto(c.id, R.id).length) gap(w.id, null, c.id, `nothing brings ${c.id} into ${R.id} that the language can see`);
      continue;
    }

    gap(w.id, null, c.id, `${w.quantity.name} (${w.quantity.unit}) has the role ${role ?? 'none'} in ${c.id}${w.when === 'on demand' ? ' on demand' : ''}: no rule reads it`);
  }

  // a matter that flows only above a potential of another carrier: the place it must flow is a region held above it, protected at what the matter bears
  for (const r of intent.regions) for (const [sym, p] of Object.entries(r.properties ?? {}).filter(([, p]) => p.role === 'flows above')) {
    use(r, sym);
    const threshold = r.quantities[sym]!;
    const along = elements.filter((e) => e.kind === 'path' && e.carrier === p.of && e.regions[0] === r.id);
    const tc = carrierById(r.carriers?.[sym] ?? 'energy');
    const most = Object.entries(r.properties ?? {}).find(([, q]) => q.of === tc.id && q.role === 'most potential');
    if (most) use(r, most[0]);
    // only a matter that starts below the threshold must be brought above it: one already above it flows as it is
    const startsAt = stateOf(r, tc.id) ?? intent.regions.filter((x) => x.id !== r.id && touches(intent, x.id, r.id)).map((x) => stateOf(x, tc.id)).find((x) => x) ?? null;
    if (startsAt && startsAt.lo >= threshold.value!) continue;
    for (const pth of along) {
      const end = pth.regions[pth.regions.length - 1]!;
      if (!intent.regions.some((x) => x.id === end)) continue;
      const host = intent.regions.filter((x) => x.environment && touches(intent, x.id, end) && stateOf(x, tc.id)).map((x) => x.id)[0];
      if (!host) { gap(pth.why.want, pth.id, tc.id, `nothing around ${end} holds ${tc.id}`); continue; }
      const id = `flows:${p.of}:${end}`;
      hosts.set(id, host);
      add({ id, kind: 'region', carrier: tc.id, says: `where ${p.of} must flow on its way into ${end}: held above ${threshold.name}`, regions: [end], values: [{ name: threshold.name, value: threshold.value!, unit: 'K', from: r.id }, ...(most ? [{ name: r.quantities[most[0]]!.name, value: r.quantities[most[0]]!.value!, unit: 'K', from: r.id }] : [])], why: { want: pth.why.want, rule: `${p.of} flows only above ${threshold.name}: the place it must flow is a region held above it`, laws: lawIds(tc, 'conductance'), parent: pth.id } });
      holdPotential(id, tc, threshold.value!, most ? r.quantities[most[0]]!.value! : null, pth.why.want, id);
      // what flows in arrives at the potential it had, and must be brought to the threshold: density times specific heat times flow times the difference
      const rho = Object.entries(r.properties ?? {}).find(([, q]) => q.role === 'density'), cp = Object.entries(r.properties ?? {}).find(([, q]) => q.role === 'capacity per mass' && q.of === tc.id);
      const use_ = elements.find((e) => e.id === `use:${p.of}:${end}`);
      const Q = use_ ? Math.max(...use_.values.filter((v) => v.unit === carrierById(p.of).flux).map((v) => v.value)) : null;
      const before = intent.regions.filter((x) => touches(intent, x.id, r.id)).map((x) => stateOf(x, tc.id)).find((x) => x);
      if (rho && cp && Q && before) {
        use(r, rho[0]); use(r, cp[0]);
        put(elements.find((e) => e.id === `conversion:${tc.id}:${id}:supply`), { name: 'least power to bring what flows to the threshold: density times specific heat times flow times the difference', value: r.quantities[rho[0]]!.value! * r.quantities[cp[0]]!.value! * Q * (threshold.value! - before.hi), unit: 'W', from: `${r.quantities[rho[0]]!.name}, ${r.quantities[cp[0]]!.name}, the largest flow wanted` });
      }
      // the change is carried through the matter itself, from its surface: it takes the matter's own time, and the matter
      // moves while it changes, so the place it changes in is at least as long as the speed times that time
      const kk = Object.entries(r.properties ?? {}).find(([, q]) => q.role === 'conductivity' && q.of === tc.id);
      if (rho && cp && Q && before && most) {
        if (!kk) gap(pth.why.want, id, tc.id, `how fast ${tc.id} crosses what flows is not said: how long it must stay in ${id} cannot be read`);
        else {
          use(r, kk[0]);
          const hl = leastHeatedLength(Q, r.quantities[rho[0]]!.value!, r.quantities[cp[0]]!.value!, r.quantities[kk[0]]!.value!, before.hi, threshold.value!, r.quantities[most[0]]!.value!);
          const region = elements.find((e) => e.id === id)!;
          put(region, { name: 'least length a round stream is held in it, whatever its diameter: the Fourier number its centre needs times the flow, density and heat capacity, over π times the conductivity', value: hl.length, unit: 'm', from: `${r.quantities[kk[0]]!.name}; the heat equation in a cylinder, its surface at ${r.quantities[most[0]]!.name}` });
          put(region, { name: 'Fourier number the stream\'s centre needs to reach the threshold', value: hl.Fo, unit: '1', from: `the share of the step left at the centre, ${hl.share.toFixed(3)}` });
          gap(pth.why.want, id, tc.id, 'shortening it means splitting the flow into streams side by side, or bringing the change into the matter otherwise than through its surface (mixing it, heating it within): neither is generated');
        }
      }
      if (most) add({ id: `protection:${id}`, kind: 'modulation', carrier: tc.id, says: `what supplies the region ${id} is cut when the observation passes ${r.quantities[most[0]]!.name}`, regions: [id], values: [], why: { want: pth.why.want, rule: 'a supply that can pass what the held matter bears is cut there', laws: [], parent: id } });
    }
  }

  // a bound on the potential of whatever touches a region: every generated region there held above the bound keeps its outer face below it
  for (const b of boundsOn) {
    const hot = [...hosts.entries()].filter(([, h]) => h === b.around).map(([id]) => id).filter((id) => elements.some((e) => e.id === id) && (elements.find((e) => e.id === id)!.values[0]?.value ?? -Infinity) > b.want.hi!.value!);
    for (const id of hot) add({ id: `guard:${id}`, kind: 'boundary', carrier: b.carrier.id, says: `the outer face of the region ${id} where it meets ${b.around} is kept below ${b.want.hi!.name}: a boundary between them that lets out less than the difference over the bound`, regions: [id, b.around], values: [{ name: b.want.hi!.name, value: b.want.hi!.value!, unit: 'K', from: b.want.id }], why: { want: b.want.id, rule: `a bound on whatever touches ${b.around}: what is hotter keeps its outer face below it`, laws: lawIds(b.carrier, 'conductance'), parent: id } });
    if (!hot.length) gap(b.want.id, null, b.carrier.id, `nothing the language generated in ${b.around} is above the bound`);
  }

  // matter placed against a shape sets at one potential and ends at another: it grows or shrinks by its expansion over the difference
  for (const dep of elements.filter((e) => e.id.startsWith('deposit:'))) {
    const R = dep.regions[0]!;
    const tol = dep.values.find((v) => v.name === 'most position error')?.value;
    const feed = elements.find((e) => e.kind === 'path' && e.carrier.startsWith('volume of') && e.regions[e.regions.length - 1] === R);
    const src = feed ? intent.regions.find((x) => x.id === feed.regions[0]) : undefined;
    if (!src || tol === undefined) continue;
    const sets = Object.entries(src.properties ?? {}).find(([, p]) => p.role === 'holds its shape below');
    const grows = Object.entries(src.properties ?? {}).find(([, p]) => p.role === 'expansion');
    const ends = intent.regions.filter((x) => x.environment && touches(intent, x.id, R)).map((x) => stateOf(x, 'energy')).find((s) => s);
    const sh = shape(R);
    if (!sets || !grows || !ends || !sh) { gap(dep.why.want, dep.id, 'momentum', 'how the placed matter changes size between where it sets and where it ends is not said'); continue; }
    use(src, sets[0]); use(src, grows[0]);
    const strain = src.quantities[grows[0]]!.value! * (src.quantities[sets[0]]!.value! - ends.hi);
    const size = Math.max(sh.x.value!, sh.y.value!, sh.z.value!);
    const change = strain * size;
    const comp = add({ id: `compensation:${R}`, kind: 'modulation', carrier: 'momentum', says: `the point follows the drawn shape scaled by one over one less the shrink: what is placed sets at ${src.quantities[sets[0]]!.name} and shrinks to ${ends.region}'s temperature`, regions: [dep.id], values: [{ name: 'shrink between setting and the end', value: strain, unit: '1', from: `${src.quantities[grows[0]]!.name} times the difference` }, { name: 'change over the largest extent', value: change, unit: 'm', from: 'the shrink times the extent' }, { name: 'scale the shape is drawn at', value: 1 / (1 - strain), unit: '1', from: 'one over one less the shrink' }], why: { want: dep.why.want, rule: 'matter placed against a shape changes size by its expansion between where it sets and where it ends', laws: [], parent: dep.id } });
    if (change > tol) add({ id: `calibration:${R}`, kind: 'observer', carrier: 'momentum', says: `the observation of the point is referred to the scaled shape: uncompensated, the part would miss the tolerance by ${(change / tol).toFixed(1)} times`, regions: [dep.id], values: [{ name: 'change over the tolerance', value: change / tol, unit: '1', from: 'the change over the most position error' }], why: { want: dep.why.want, rule: 'what the observer refers the point to must carry the shrink when it exceeds the tolerance', laws: [], parent: comp.id } });
  }

  // a path that must carry a flux within a potential drop: its least conductance, what it dissipates, its own heat balance and its protection
  for (const p of elements.filter((e) => e.kind === 'path' && e.values.some((v) => v.name === 'largest drop the path may have'))) {
    const to = p.regions[p.regions.length - 1]!;
    const f = flux.find((x) => x.region === to && x.carrier === p.carrier);
    if (!f) continue;
    const drop = p.values.find((v) => v.name === 'largest drop the path may have')!.value;
    p.values.push({ name: 'least conductance: the flux over the drop', value: f.J / drop, unit: `${carrierById(p.carrier).flux} per ${carrierById(p.carrier).potential}`, from: `${f.from} and the drop` }, { name: 'heat it makes at that conductance: flux times drop', value: f.J * drop, unit: 'W', from: `${p.carrier}.dissipation` });
    p.why.laws = [...new Set([...p.why.laws, ...lawIds(carrierById(p.carrier), 'dissipation')])];
    shed(p, to, p.why.want, true);
    add({ id: `protection:${p.id}`, kind: 'modulation', carrier: p.carrier, says: `the path is opened when its flux exceeds what its heat balance allows`, regions: p.regions, values: [], why: { want: p.why.want, rule: 'a path whose dissipation has a limit is opened above the flux that reaches it', laws: lawIds(carrierById(p.carrier), 'dissipation'), parent: p.id } });
  }

  // what each generated element is made of, from what is available: a missing value is a gap in the knowledge, not in the language
  const kept = keptMatters();
  for (const p of elements.filter((e) => e.kind === 'path' && e.carrier === 'charge' && e.values.some((v) => v.name.startsWith('least conductance')))) {
    const m = chooseMatter(kept, 'charge', 'conductivity', 'most');
    if (!m.pick) { gap(p.why.want, p.id, 'charge', m.lacks!); continue; }
    const G = p.values.find((v) => v.name.startsWith('least conductance'))!.value;
    put(p, { name: `made of ${m.pick.name}: the available matter that conducts charge best`, value: m.value!.value!, unit: 'S/m', from: m.value!.name });
    put(p, { name: 'least section over length: the conductance over the conductivity', value: G / m.value!.value!, unit: 'm', from: `${p.carrier}.path-conductance` });
  }
  const energyBoundaries = elements.filter((e) => e.kind === 'boundary' && e.carrier === 'energy' && !e.id.startsWith('shed:') && intent.regions.some((r) => r.id === e.regions[0]));
  if (energyBoundaries.length) { const m = chooseMatter([...kept, ...intent.regions.map((r) => ({ id: r.id, name: r.id, properties: statedOf(r) }))], 'energy', 'conductivity', 'least'); if (!m.pick) for (const b of energyBoundaries.slice(0, 1)) gap(b.why.want, b.id, 'energy', `what the boundary is made of: ${m.lacks}`); }
  for (const b of elements.filter((e) => e.kind === 'boundary' && e.carrier.startsWith('volume of') && e.id.endsWith(':closed'))) { const m = chooseMatter(kept, b.carrier, 'conductivity', 'least'); if (!m.pick) gap(b.why.want, b.id, b.carrier, `what the boundary is made of: ${m.lacks}`); }
  const members = elements.filter((e) => e.id.startsWith('members:'));
  const ownWeight = new Map<string, number>(); // what the sized members of each region weigh, alternatives aside
  if (members.length) {
    const m = chooseMatter(kept, 'momentum', 'stiffness', 'most');
    for (const e of members) put(e, { name: 'matters available that state a stiffness and a strength', value: m.candidates.filter((x) => propertyOf(x.properties, 'momentum', 'most flux density')).length, unit: '1', from: 'src/data/materials.ts' });
    // each member element is a system the space sizes, over the kept sections and the matters dressed to them
    const stock = dressedMatters();
    const gD = siteGravity ? ofLeaf(siteGravity.quantities[siteGravity.gravity!]!) : gravity();
    const bearsOnSides = new Map<string, number>(); // what the up face bears on the top of the sides, per length
    /** Size one element's members and put the configuration on it: its pick, or null with the gap said. */
    const sizeOn = (e: Element, R: Region, sh: Shape, face: string, span: number, runs: number[], loads: { q?: { value: number; from: string }; P?: { value: number; from: string }; along?: { value: number; from: string } }) => {
      const conf = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'configuration', source: `the generator: ${e.id}` }));
      const sag = intent.wants.find((x) => x.region === R.id && x.quantity.carrier === 'momentum' && x.hi && x.hi.unit === '1');
      const r = sizeMembers(conf(`span of ${face}`, span, 'm'), conf(`width of ${face}`, runs.reduce((x, y) => x + y, 0), 'm'), conf(loads.q ? loads.q.from : 'no load per area on it', loads.q?.value ?? 0, 'Pa'), stock.matters[0]!.leaves, gD, lumberCatalogue(), {
        loads: { ...(loads.P && loads.P.value > 0 ? { P: conf(`${loads.P.from}, at the worst place`, loads.P.value, 'N') } : {}), ...(sag ? { sag: ofLeaf(sag.hi!) } : {}), ...(loads.along ? { along: conf(loads.along.from, loads.along.value, 'N/m') } : {}) },
        runs, matters: stock.matters,
      });
      const pick = r.choice.pick;
      if (!pick) { gap(e.why.want, e.id, 'momentum', `no kept section of a matter dressed to it carries ${face} with up to four support lines: ${[...new Set(r.choice.candidates.flatMap((c) => c.unsatisfied))].join('; ')}`); return null; }
      const bd = pick.solution.bound, at = (sym: string) => bd[sym]!.value!;
      put(e, { name: `sized: ${pick.option.label}, the fewest support lines and then the least mass of the kept sections and the matters dressed to them`, value: at('m'), unit: 'kg', from: `the members across a face; ${stock.source}` });
      for (const [name, sym, unit] of [['members', 'n', '1'], ['spacing', 's', 'm'], ['support lines across the span', 'k', '1'], ['bay', 'a', 'm'], ['breadth', 'b', 'm'], ['depth', 'h', 'm'], ['density of what they are made of', 'rho', 'kg/m^3'], ['modulus of what they are made of', 'E', 'Pa'], ...(loads.along ? [['rows of blocking', 'j', '1'], ['force along each member', 'N', 'N']] as const : [])] as const) put(e, { name, value: at(sym), unit, from: 'the members across a face' });
      put(e, { name: 'deflection over what is allowed', value: at('del') / Math.min(at('lim'), bd['limw']?.value ?? Infinity), unit: '1', from: 'the members across a face' });
      put(e, { name: 'bending stress over what is allowed', value: at('sig') / at('f'), unit: '1', from: 'the members across a face' });
      if (loads.along) put(e, { name: 'force along each member, with the declared factor, over its least buckling load', value: at('N') * at('phi') / Math.min(at('Pw'), at('Pb')), unit: '1', from: EULER });
      if (!e.oneOf) ownWeight.set(R.id, (ownWeight.get(R.id) ?? 0) + at('m') * g);
      return { at, sh };
    };
    /**
     * How the sides carry the force across them along their own plane: counted on the network their members make. The
     * joints are nailed and hold no turning, so the members' bars are all that resist by stretching; a mechanism the force
     * meets is carried only by bending, or not at all.
     */
    const rackingOf = (e: Element, R: Region, sh: Shape, at: (sym: string) => number) => {
      const across = elements.find((x) => x.kind === 'path' && x.carrier === 'momentum' && x.regions[0] === R.id && x.values.some((v) => v.name === 'force across'))?.values.find((v) => v.name === 'force across');
      if (!across) return;
      const length = Math.max(sh.x.value!, sh.z.value!), height = at('a'), V = across.value / 2;
      const bare = runNetwork(length, height, at('s'), at('j'));
      const along = (r: typeof bare) => loadOn(r.net, (i, d) => (r.top.includes(i) && d === 0 ? V / r.top.length : 0));
      const c0 = count(bare.net);
      if (carries(bare.net, along(bare))) return;
      // the least bars that leave no mechanism the force meets: one across each tier, counted again with them
      const braced = runNetwork(length, height, at('s'), at('j'), c0.mechanisms);
      const forces = barForces(braced.net, along(braced));
      // what bending alone would do, were every joint to hold its turning: the members bend about their thin axis in the side's plane
      const fr = { nodes: bare.net.nodes.map((q) => [q[0]!, q[1]!] as [number, number]), members: bare.net.bars.map(([a, b]) => ({ a, b, E: at('E'), A: at('b') * at('h'), I: at('h') * at('b') ** 3 / 12 })) };
      const drift = solveFrame(fr, bare.net.held.flatMap((node) => [0, 1, 2].map((dof) => ({ node, dof: dof as 0 | 1 | 2 }))), bare.top.map((node) => ({ node, dof: 0 as const, value: V / bare.top.length }))).u[bare.top[0]! * 3]!;
      const br = add({ id: `bracing:${R.id}:side`, kind: 'path', carrier: 'momentum', says: `the members of each side, joined where they meet by joints that hold no turning, are a mechanism under the force across: they carry it by stretching only once a bar crosses each tier that sways`, regions: [R.id], values: [
        { name: 'force across each side carries', value: V, unit: 'N', from: `${across.from}, shared by the two sides along it` },
        { name: 'mechanisms of each side the force meets', value: c0.mechanisms, unit: '1', from: 'counted: the freedoms of its joints less the rank of what its bars resist' },
        { name: 'least bars across it that leave none', value: c0.mechanisms, unit: '1', from: forces ? 'counted again with them: no mechanism, and the force carried by stretching' : 'counted' },
        ...(forces ? [{ name: 'largest force in a bar, braced', value: Math.max(...forces.map(Math.abs)), unit: 'N', from: 'the bars\' forces under the force across, braced' }] : []),
        { name: 'drift of its top were every joint to hold its turning, the members bending', value: Math.abs(drift), unit: 'm', from: 'a frame of its members, joints held rigid' },
      ], why: { want: e.why.want, rule: 'an arrangement carries a load by stretching only where the load lies in the span of what its bars resist', laws: [], parent: e.id } });
      gap(e.why.want, br.id, 'momentum', 'the bars across the tiers are not yet sized, and a sheet fastened to the members, which would carry the force across by its shear and brace them, is not in the language');
    };
    // the up face first: what it bears on the sides is read when the sides are sized
    const order = (e: Element) => ['up', 'down', 'side'].indexOf(e.id.slice(e.id.lastIndexOf(':') + 1));
    for (const e of [...members].sort((x, y) => order(x) - order(y))) {
      const R = intent.regions.find((r) => r.id === e.regions[0]);
      const sh = R ? shapeOf(R) : null;
      if (!R || !sh) continue;
      const face = e.id.slice(e.id.lastIndexOf(':') + 1) as Face;
      const q = e.values.find((v) => v.name === 'load per area it carries');
      const P = e.values.find((v) => v.name === 'weight resting on it at a place not stated');
      const along = face === 'side' && bearsOnSides.has(R.id) ? { value: bearsOnSides.get(R.id)!, from: `what the up face of ${R.id} bears on the top of the sides, per length` } : undefined;
      if (along) put(e, { name: 'load per length along the top of the walls the up face bears on', value: along.value, unit: 'N/m', from: 'each up member\'s half-bay over its spacing' });
      const runs = face === 'side' ? [sh.x.value!, sh.z.value!, sh.x.value!, sh.z.value!] : [Math.max(sh.x.value!, sh.z.value!)];
      const done = sizeOn(e, R, sh, `the ${face} face`, e.values.find((v) => v.name === 'span')!.value, runs, { ...(q ? { q } : {}), ...(P ? { P } : {}), ...(along ? { along } : {}) });
      if (!done) continue;
      const at = done.at;
      if (face === 'up') bearsOnSides.set(R.id, at('w') * at('a') / (2 * at('s')));
      if (face === 'side') rackingOf(e, R, sh, at);
      if (at('k') > 0) {
        const line = { value: at('w') * at('a') / at('s'), from: 'each member\'s two half-bays over the spacing' };
        const sp = add({ ...(e.oneOf ? { oneOf: e.oneOf } : {}), id: `supports:${R.id}:${face}`, kind: 'path', carrier: 'momentum', says: `${at('k')} line${at('k') === 1 ? '' : 's'} across the ${face === 'side' ? 'sides' : `${face}-facing face`} of ${R.id} carry its members' bays to the ground`, regions: [R.id], values: [{ name: 'support lines', value: at('k'), unit: '1', from: e.id }, { name: 'load per length each line carries', value: line.value, unit: 'N/m', from: line.from }, { name: 'length of each line', value: Math.max(sh.x.value!, sh.z.value!), unit: 'm', from: 'the longer extent of the plan' }], why: { want: e.why.want, rule: 'a span no member carries is divided by lines that carry its bays', laws: [], parent: e.id } });
        if (face === 'up') {
          // a line under the up face stands on the down face, held up along its length by members as the sides are
          const done2 = sizeOn(sp, R, sh, `the lines under the up face`, sh.y.value!, Array.from({ length: at('k') }, () => Math.max(sh.x.value!, sh.z.value!)), { along: { value: line.value, from: 'what each line under the up face carries, per length' } });
          if (done2) {
            const dn = elements.find((x) => x.id === `members:${R.id}:down`);
            if (dn) gap(dn.why.want, dn.id, 'momentum', 'the lines under the up face stand on the down face: the members spanning it were not sized for what they bring');
          }
        } else gap(e.why.want, sp.id, 'momentum', `a support line is a member of its own, carrying its bays' load along its length to the ground: it is not yet sized, since how far the ${face} face is held above what bears it is not stated`);
      }
    }
  }
  // what reaches the ground now includes what the sized members weigh
  for (const [Rid, W] of ownWeight) {
    for (const p of elements.filter((e) => e.kind === 'path' && e.carrier === 'momentum' && e.regions[0] === Rid && e.values.some((v) => v.name === 'force down, without the structure\'s own weight'))) {
      const down = p.values.find((v) => v.name === 'force down, without the structure\'s own weight')!.value;
      put(p, { name: 'force down, with the sized members\' own weight', value: down + W, unit: 'N', from: 'the loads, the weights and the sized members' });
      const gr = p.regions[p.regions.length - 1]!;
      const bd = elements.find((e) => e.id === `bound:momentum:${Rid}|${gr}`);
      if (bd && bd.values[0]) put(bd, { name: 'least meeting area, with the sized members\' own weight', value: (down + W) / bd.values[0].value, unit: 'm^2', from: 'the force down with the members over the bearing it allows' });
    }
  }
  // what bears the heat: no available matter states the highest temperature it bears, unless the intent does
  for (const g of gaps.filter((x) => /the hottest it may run/.test(x.lacks))) {
    // where what it runs in is named, the hottest follows from its constitution (src/nexus/substrate/depth.ts): the heat at
    // which the level that makes it that matter comes apart
    const el = elements.find((e) => e.id === g.element);
    const named = el?.regions.map((rid) => intent.regions.find((r) => r.id === rid)?.constituent).find((c) => !!c);
    const hot = named ? hottestOf(named) : null;
    if (el && named && hot) {
      put(el, { name: `the hottest ${named} bears: where ${hot.level.what} comes apart`, value: hot.T, unit: 'K', from: `${hot.level.what} (${hot.level.record.map((r) => r.name).join('; ')})` });
      gaps.splice(gaps.indexOf(g), 1);
      continue;
    }
    const m = chooseMatter(kept, 'energy', 'most potential', 'most');
    if (!m.pick) g.lacks = `the hottest it may run is a property of what it is made of: ${named ? `the kept species hold no level of ${named}` : m.lacks}`;
  }
  for (const g_ of gaps.filter((x) => /structure's own weight/.test(x.lacks))) g_.lacks = 'the structure\'s own weight is its members\' matter times their size: no system is generated from an element';
  if (ownWeight.size) for (let i = gaps.length - 1; i >= 0; i--) if (/structure's own weight is its members/.test(gaps[i]!.lacks)) gaps.splice(i, 1);

  // a flow of a medium carries what the medium holds: a species' boundary conducts a volume of the medium per time
  const aggregate = (e: Element) => e.kind === 'boundary' && !elements.some((p) => p.id === e.why.parent && p.kind === 'boundary');
  const species = elements.filter((e) => aggregate(e) && e.carrier.startsWith('amount of'));
  for (const [R, N] of [...new Set(species.map((b) => `${b.regions[0]}|${b.regions[1]}`))].map((k) => k.split('|') as [string, string])) {
    const here = species.filter((b) => b.regions[0] === R && b.regions[1] === N);
    const medium = intent.regions.find((x) => x.id === N);
    if (!medium?.matter) { for (const b of here) gap(b.why.want, b.id, b.carrier, `its conductance is a volume of ${N} per time, and the same flow carries what ${N} holds: the matter ${N} is made of is not said`); continue; }
    // the species' conductances are volumes of the medium per time: one flow, at least the largest of them, carries all of it
    const Q = Math.max(...here.map((b) => b.values.find((v) => v.name.startsWith('least conductance'))?.value ?? 0));
    const air = carrierById(`volume of ${medium.matter}`);
    const others = [...new Set(elements.filter((e) => aggregate(e) && e.carrier !== air.id && !e.carrier.startsWith('amount of') && e.regions[0] === R && e.regions[1] === N).map((o) => o.carrier))];
    const ex = add({ id: `exchange:${R}|${N}`, kind: 'path', carrier: air.id, says: `one flow of ${medium.matter} between ${R} and ${N} carries ${[...here.map((b) => b.carrier), ...others.filter((o) => o === 'energy')].join(', ')} together: a flow of matter carries what the matter holds`, regions: [R, N], values: [{ name: 'least flow: the largest the species need', value: Q, unit: air.flux, from: here.map((b) => b.why.want).join(', ') }], why: { want: here[0]!.why.want, rule: 'advection: a flow of matter carries the content of every carrier the matter holds', laws: [...lawIds(air, 'conductance'), ...here.flatMap((b) => b.why.laws)], parent: null } });
    for (const b of here.slice(1)) ex.also.push(b.why);
    // the heat it carries at the coldest, which the supply of heat must also give
    const rho = Object.entries(medium.properties ?? {}).find(([, p]) => p.role === 'density'), cp = Object.entries(medium.properties ?? {}).find(([, p]) => p.role === 'capacity per mass' && p.of === 'energy');
    const hold = intent.wants.find((w) => w.region === R && w.quantity.carrier === 'energy' && w.lo);
    const outside = stateOf(medium, 'energy');
    if (rho && cp && hold && outside) {
      use(medium, rho[0]); use(medium, cp[0]);
      const P = medium.quantities[rho[0]]!.value! * medium.quantities[cp[0]]!.value! * Q * (hold.lo!.value! - outside.lo);
      put(ex, { name: 'heat it carries out at the coldest: density times specific heat times flow times the difference', value: P, unit: 'W', from: `${medium.quantities[rho[0]]!.name}, ${medium.quantities[cp[0]]!.name}` });
      put(elements.find((e) => e.id === `conversion:energy:${R}:supply`), { name: 'least it supplies for the exchanged air at the coldest', value: P, unit: 'W', from: ex.id });
      add({ id: `recovery:${R}|${N}`, kind: 'boundary', carrier: 'energy', says: `or the heat the outgoing ${medium.matter} carries crosses to the incoming ${medium.matter} through a boundary between the two flows, so less must be supplied`, regions: [ex.id], values: [], oneOf: `heat of ${ex.id}`, why: { want: hold.id, rule: 'two flows at different potentials can exchange across a boundary between them', laws: lawIds(carrierById('energy'), 'conductance'), parent: ex.id } });
    }
    // what drives the flow: the medium's potential is the same on both sides, so it is raised by a conversion, or pushed by the wind when it blows
    const p0 = stateOf(medium, air.id);
    if (p0) {
      const conv = add({ id: `conversion:${air.id}:${R}|${N}`, kind: 'conversion', carrier: air.id, says: `a conversion that raises ${air.id} from ${N} through ${R} up its potential, with power from another carrier: nothing else drives the flow`, regions: [R], values: [], oneOf: `drive of ${ex.id}`, why: { want: here[0]!.why.want, rule: `${R} and ${N} hold ${medium.matter} at one potential: a flow between them needs a conversion, never made, always raised`, laws: [], parent: ex.id } });
      for (const s of powerSources(R)) { conv.why.laws = [...new Set([...conv.why.laws, ...(s.carrier.conjugate ? coupling(s.carrier, air).map((l) => l.id) : [])])]; path(s.carrier, s.region, R, here[0]!.why.want, `the conversion draws ${s.carrier.id} from ${s.region}`, conv.id); }
      shed(conv, R, here[0]!.why.want, true);
      const wind = Object.entries(medium.directions ?? {}).find(([sym, d]) => d === 'across' && medium.carriers?.[sym] === 'momentum');
      if (wind) add({ id: `wind:${ex.id}`, kind: 'modulation', carrier: air.id, says: `or the wind's push on the sides drives the flow when it blows: it varies, so the openings are modulated to the flow the species need`, regions: [R, N], values: [], oneOf: `drive of ${ex.id}`, why: { want: here[0]!.why.want, rule: 'a varying potential difference drives a flow that is modulated to what is needed', laws: lawIds(air, 'conductance'), parent: ex.id } });
    }
  }

  // a want that is not about a carrier's balance reads nothing; what the intent says and no rule read is information the language cannot use
  for (const w of intent.wants) { const R = intent.regions.find((r) => r.id === w.region); if (R && w.quantity.sym in R.quantities) use(R, w.quantity.sym); }
  // every path that draws a carrier from a region stating a limit on it is checked against that limit: within it, the
  // limit is recorded on the path; beyond it, the want is refused lawfully; where nothing derives what the path
  // carries, that is the gap, never a limit left unread. A limit nothing draws on stays unread: no rule needed it
  for (const r of intent.regions) for (const sym of r.limits ?? []) {
    const cid = r.carriers?.[sym], lim = r.quantities[sym];
    if (!cid || !lim || lim.value === null) continue;
    const paths = elements.filter((e) => e.kind === 'path' && e.carrier === cid && e.regions[0] === r.id);
    if (!paths.length) continue;
    use(r, sym);
    // a value whose unit cannot be read cannot be compared with the limit, so it is not counted as carried
    const dimOrNull = (u: string) => { try { return dimOf(u); } catch { return null; } };
    const dim = dimOrNull(lim.unit);
    if (!dim) continue;
    const most = toSI(lim.value, lim.unit);
    for (const pe of paths) {
      const carried = pe.values.filter((v) => { const vd = dimOrNull(v.unit); return !!vd && sameDim(vd, dim) && !v.name.startsWith('within what'); });
      if (!carried.length) { gap(pe.why.want, pe.id, cid, `what ${pe.id} carries from ${r.id} is not derived, so what ${r.id} gives at most (${lim.name}) cannot be checked`); continue; }
      const needs = Math.max(...carried.map((v) => toSI(v.value, v.unit)));
      if (needs > most) gap(pe.why.want, pe.id, cid, `the path needs ${needs} ${lim.unit} and ${r.id} gives at most ${lim.value} (${lim.name})`);
      else put(pe, { name: `within what ${r.id} gives`, value: lim.value, unit: lim.unit, from: lim.name });
    }
  }
  const unused = intent.regions.flatMap((r) => [...Object.entries(r.quantities), ...Object.entries(r.produces ?? {})].filter(([sym]) => !used.has(`${r.id}.${sym}`)).map(([sym, l]) => ({ region: r.id, sym, name: l.name })));
  const regimes = regimesOf(intent, gap, (r, sym) => used.add(`${r}.${sym}`));
  const depths = depthsOf(intent, gap, (r, sym) => used.add(`${r}.${sym}`));
  const unread = unused.filter((u) => !used.has(`${u.region}.${u.sym}`));
  return { intent: intent.name, elements, gaps, unused: unread, regimes, depths };
}

/** The structure as it reads: each element with its rule and the wants it serves, then the gaps and what went unread. */
/**
 * The regime of an intent, derived by the tuner at the smallest and the largest size the intent states, at the
 * temperature its site holds (the coldest energy reservoir; none stated, the universe's floor). The rules read matter
 * by its averaged properties and move it by classical balances; where the derived state says those do not hold, the
 * lack is a regime gap: the relations must be generated at that regime, not read from the kept ones.
 */
function regimesOf(intent: Intent, gap: GapFn, read: (region: string, sym: string) => void): IntentRegime[] {
  const sizes: { L: number; from: string }[] = [];
  const length = (unit: string) => { try { const d = dimOf(unit); return d[1] === 1 && d.every((x, i) => i === 1 || x === 0); } catch { return false; } };
  for (const r of intent.regions) for (const [sym, l] of Object.entries(r.quantities)) if (l.value && length(l.unit)) { sizes.push({ L: Math.abs(toSI(l.value, l.unit)), from: `${l.name} [${r.id}]` }); read(r.id, sym); }
  for (const w of intent.wants) for (const b of [w.lo, w.hi]) if (b?.value && length(b.unit)) sizes.push({ L: Math.abs(toSI(b.value, b.unit)), from: `${w.id}: ${b.name}` });
  if (!sizes.length) return [];
  const temps = intent.regions.filter((r) => r.environment).flatMap((r) => (r.holds ?? []).filter((sym) => r.carriers?.[sym] === 'energy').map((sym) => r.quantities[sym]!)).filter((l) => l.value !== null).map((l) => toSI(l.value!, l.unit));
  const T = temps.length ? Math.min(...temps) : null;
  const ends = [sizes.reduce((a, b) => (b.L < a.L ? b : a)), sizes.reduce((a, b) => (b.L > a.L ? b : a))].filter((x, i, a) => a.findIndex((y) => y.L === x.L) === i);
  const out: IntentRegime[] = [];
  for (const { L, from } of ends) {
    const r = regimeAt(L, T);
    out.push({ L, T, from, state: r.state, near: r.near.map((c) => `${c.boundary} at ${Number(c.L.value!.toPrecision(3))} m`) });
    const at = `at ${Number(L.toPrecision(3))} m (${from})`;
    // below the length the constants set by themselves, no kept law holds, so nothing else said about the regime does
    if (r.state.lawless) { gap(null, null, null, `the regime ${at}: below the length the constants set by themselves, where a confined energy's own gravity is as large as it; no kept law describes that, so nothing derived there holds`, { kind: 'law', distinction: 'scale (law): below the length the constants set by themselves' }); continue; }
    if (!r.structures.length) gap(null, null, null, `the regime ${at}: at ${T ?? 'the universe\'s floor of'} K nothing settles, so there is no matter that holds together, and the kept matters the rules read are matter that does`, { kind: 'data', distinction: 'scale (data): the kept matters are of matter that holds together, and nothing does here' });
    if (r.state.relativistic) gap(null, null, null, `the regime ${at}: confining a particle costs more than its rest energy, so particles are made and unmade; no rule generates that regime`, { kind: 'law', distinction: 'scale (law): particles are made and unmade at this size' });
    else if (r.state.quantum) gap(null, null, null, `the regime ${at}: the lightest particle's confinement exceeds the heat, so its states are discrete; the averaged properties the rules read are not what holds there`, { kind: 'variable', distinction: 'scale (variable): discrete states, where the rules read averages' });
    if (r.state.crushed) gap(null, null, null, `the regime ${at}: a unit's gravity in a body this large exceeds the unit's own binding, so its matter does not bear it, and the rules read its strength as if it did`, { kind: 'relationship', distinction: 'scale (relationship): gravity crushes the matter the rules read as bearing' });
    if (r.state.collapses) gap(null, null, null, `the regime ${at}: a body this large of the matter found is within its own gravitational radius`, { kind: 'law', distinction: 'scale (law): a body within its own gravitational radius' });
  }
  return out;
}

/**
 * The depth each potential of an intent needs (src/nexus/substrate/depth.ts): every temperature, potential and speed a
 * reservoir holds or a want asks for is a process on whatever is there, lasting the intent's duration, at the
 * smallest size the intent states. Where it takes apart a level the rules read as whole, the state needs a variable
 * the rules do not carry; where it reaches past every level, the gap is in the laws. A want's own band is the
 * tolerance; elsewhere, the tuner's.
 */
function depthsOf(intent: Intent, gap: GapFn, read: (region: string, sym: string) => void): IntentDepth[] {
  const isDim = (unit: string, of: string) => { try { return dimOf(unit).join() === dimOf(of).join(); } catch { return false; } };
  const length = (unit: string) => isDim(unit, 'm');
  const sizes = intent.regions.flatMap((r) => Object.values(r.quantities)).filter((l) => l.value && length(l.unit)).map((l) => Math.abs(toSI(l.value!, l.unit)));
  const L = sizes.length ? Math.min(...sizes) : null;
  const processOf = (v: number, unit: string, D: number | null): Process | null => {
    const x = toSI(v, unit);
    return isDim(unit, 'K') ? (x > 0 ? heat(x, D) : null) : isDim(unit, 'V') ? (x !== 0 ? potential(x, D, L) : null) : isDim(unit, 'm/s') ? (x !== 0 ? motion(Math.abs(x), D) : null) : null;
  };

  const temps = intent.regions.filter((r) => r.environment).flatMap((r) => (r.holds ?? []).filter((sym) => r.carriers?.[sym] === 'energy').map((sym) => r.quantities[sym]!)).filter((l) => l.value !== null).map((l) => toSI(l.value!, l.unit));
  const T = temps.length ? Math.min(...temps) : null;
  const D = intent.duration.value !== null ? toSI(intent.duration.value, intent.duration.unit) : null;
  const probes: { p: Process; from: string; want: string | null; carrier: string | null; tolerance: number }[] = [];
  for (const r of intent.regions.filter((x) => x.environment)) for (const sym of r.holds ?? []) {
    const l = r.quantities[sym];
    const p = l?.value != null ? processOf(l.value, l.unit, D) : null;
    if (p) { probes.push({ p, from: `${l!.name} [${r.id}]`, want: null, carrier: r.carriers?.[sym] ?? null, tolerance: DEFAULT_TOLERANCE }); read(r.id, sym); }
  }
  for (const w of intent.wants) {
    const v = w.hi?.value ?? w.lo?.value, unit = w.hi?.unit ?? w.lo?.unit;
    if (v == null || !unit) continue;
    const p = processOf(v, unit, D);
    if (!p) continue;
    const band = w.lo?.value != null && w.hi?.value != null ? Math.abs(w.hi.value - w.lo.value) / Math.abs(w.hi.value + w.lo.value) : null;
    probes.push({ p, from: `${w.id}: ${w.quantity.name}`, want: w.id, carrier: w.quantity.carrier ?? null, tolerance: band && band > 0 ? band : DEFAULT_TOLERANCE });
  }
  const out: IntentDepth[] = [];
  const named = intent.regions.find((r) => r.constituent)?.constituent;
  for (const { p, from, want, carrier, tolerance } of probes) {
    const d = descend(p, { L, T, tolerance, ...(named ? { of: { matter: named } } : {}) });
    out.push({ from, want, descent: d });
    const said = `the depth of ${from}`;
    if (d.stop === 'refused') { gap(want, null, carrier, `${said}: ${p.says} is at or past light's speed, which no unit reaches`, { kind: 'law', distinction: 'a lawful refusal: nothing moves at light\'s speed' }); continue; }
    if (d.gap) { gap(want, null, carrier, `${said}: ${d.gap.says}`, { kind: d.gap.kind, distinction: `depth (${d.gap.kind}): ${({ law: 'a process reaches past every level the ladder holds', primitive: 'inside the particles the ladder starts from', data: 'how far a charge moves freely before it strikes something' } as Record<string, string>)[d.gap.kind] ?? d.gap.kind}` }); continue; }
    const apart = d.steps.filter((s) => s.verdict === 'changes'), inside = d.steps.filter((s) => s.verdict === 'resolved');
    if (apart.length) gap(want, null, carrier, `${said}: ${p.says} over ${D === null ? 'its course' : `${Number(D.toPrecision(3))} s`} takes apart ${apart.map((s) => `${s.level.what} (${s.changed >= 0.999 ? 'all of it' : `a share ${s.changed.toPrecision(2)}`})`).join(', ')}, beyond the tolerance ${Number(tolerance.toPrecision(2))}; the rules read matter as whole units, so the state needs what they do not carry, the share of each taken apart, followed down to ${d.at!.what}, which stays whole`, { kind: 'variable', distinction: 'depth (variable): a process takes apart a level the rules read as whole' });
    if (inside.length) gap(want, null, carrier, `${said}: lasting ${Number(D!.toPrecision(3))} s, it is faster than the own clock of ${inside.map((s) => `${s.level.what} (${s.level.clock.toExponential(2)} s)`).join(', ')}, so it resolves the inside the rules average over`, { kind: 'resolution', distinction: 'depth (resolution): an intent faster than a level\'s own clock' });
  }
  return out;
}

export function describe(s: Structure): string {
  const lines = [`${s.intent}: ${s.elements.length} elements, ${s.gaps.length} gaps, ${s.unused.length} quantities unread`];
  for (const e of s.elements) lines.push(`  [${e.kind}] ${e.says}${e.values.length ? ` {${e.values.map((v) => `${v.name} = ${Number(v.value.toPrecision(4))} ${v.unit}`).join('; ')}}` : ''}  <- ${e.why.rule} (${[e.why, ...e.also].map((l) => l.want ?? '-').filter((x, i, a) => a.indexOf(x) === i).join(', ')})`);
  for (const g of s.gaps) lines.push(`  GAP (${g.want ?? '-'}${g.element ? `, ${g.element}` : ''}): ${g.lacks}`);
  if (s.unused.length) lines.push(`  UNREAD: ${s.unused.map((u) => `${u.name} [${u.region}]`).join('; ')}`);
  return lines.join('\n');
}

/** A missing distinction, with the inventions and the failures it explains: the ranking that picks the next upgrade. */
export interface Lack { distinction: string; inventions: string[]; gaps: number; unread: number }

const SIGNATURES: [RegExp, string][] = [
  [/no available matter states/, 'knowledge: the kept data does not state it'],
  [/no system is generated from an element/, 'a system from an element: sizing what is generated'],
  [/is about information|per bit it erases/, 'information: what a realization spends to tell apart and erase'],
  [/splitting the flow|otherwise than through its surface/, 'a change carried through matter: its own time against the time it is there'],
  [/not yet sized/, 'a system from an element: sizing what is generated'],
  [/buckling/, 'pressing along a length: a member\'s buckling'],
  [/no material is chosen/, 'what a region is made of'],
  [/no geometry/, 'geometry: the sizes, areas and shapes of regions'],
  [/no process/, 'a process: how long a change takes'],
  [/height of a liquid in gravity/, 'gravity in a matter\'s potential'],
  [/momentum has a direction/, 'direction: momentum is a vector'],
  [/no advection/, 'advection: a flow of matter carries what the matter holds'],
  [/about no carrier: the language has no rule/, 'a want about no carrier'],
  [/with the site's friction|gives at most/, 'a lawful refusal: the want exceeds what the site allows'],
  [/nothing in the site receives/, 'the site does not say where it goes'],
  [/^the regime /, 'scale: the regime the rules assume does not hold at the intent\'s sizes'],
];

/** What an unread quantity is: classified by its dimension and the carrier it is about. */
/** What an unread quantity no rule needed is classed as: not a lack, and kept out of the ranking. */
export const UNNEEDED = 'not needed: nothing generated draws on it';
function unreadClass(i: Intent, u: { region: string; sym: string }, s: Structure): string {
  const r = regionOf(i, u.region);
  const l = r.quantities[u.sym] ?? r.produces?.[u.sym];
  if (!l) return 'unclassified';
  const d = l.dim;
  const carrier = r.carriers?.[u.sym];
  // a reservoir's limit or potential that no generated path draws from: no want needed it, so nothing is missing
  if (r.environment && carrier && !s.elements.some((e) => e.kind === 'path' && e.carrier === carrier && e.regions[0] === r.id)) return UNNEEDED;
  if ((r.limits ?? []).includes(u.sym)) return 'a limit no rule checked';
  if (!carrier && d[0] === 0 && d[2] === 0 && d[3] === 0 && d[4] === 0 && d[1] > 0) return 'geometry: the sizes, areas and shapes of regions';
  if (r.produces?.[u.sym]) return 'a production no want balances';
  if (!carrier && d.every((x) => x === 0)) return 'a count or ratio no rule reads';
  if (!r.environment) return 'what a region is made of';
  return 'unclassified';
}

/** The missing distinctions across inventions, most inventions first, then most failures. */
export function lacking(intents: Intent[], structures: Structure[]): Lack[] {
  const by = new Map<string, Lack>();
  const get = (d: string) => { if (!by.has(d)) by.set(d, { distinction: d, inventions: [], gaps: 0, unread: 0 }); return by.get(d)!; };
  structures.forEach((s, k) => {
    for (const g of s.gaps) {
      const d = g.distinction ?? SIGNATURES.find(([re]) => re.test(g.lacks))?.[1] ?? `other: ${g.lacks}`;
      const l = get(d); l.gaps++; if (!l.inventions.includes(s.intent)) l.inventions.push(s.intent);
    }
    for (const u of s.unused) {
      const d = unreadClass(intents[k]!, u, s);
      if (d === UNNEEDED) continue;
      const l = get(d); l.unread++; if (!l.inventions.includes(s.intent)) l.inventions.push(s.intent);
    }
  });
  return [...by.values()].sort((a, b) => b.inventions.length - a.inventions.length || (b.gaps + b.unread) - (a.gaps + a.unread));
}

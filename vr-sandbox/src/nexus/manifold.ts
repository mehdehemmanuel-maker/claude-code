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

import { carrierById, coupling, family, roleOf, type Carrier, type Role } from './carrier';
import { gravity } from './field';
import { facesCrossed, shapeOf, type Face, type Shape } from './shape';
import { chooseMatter, keptMatters, propertyOf, statedOf } from './matter';
import type { Leaf } from './term';
import { regionOf, touches, type Intent, type Region, type Want } from './want';

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

export interface Gap { want: string | null; element: string | null; lacks: string; carrier: string | null }

export interface Structure { intent: string; elements: Element[]; gaps: Gap[]; unused: { region: string; sym: string; name: string }[] }

/** A region's potential of one carrier over time: one value, or the range of the values it holds. */
interface State { region: string; lo: number; hi: number; leaves: Leaf[] }

export function generate(intent: Intent): Structure {
  const elements: Element[] = [];
  const gaps: Gap[] = [];
  const used = new Set<string>();
  const g = gravity().value!;

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
  const put = (e: Element | undefined | null, v: Element['values'][number]) => { if (e && !e.values.some((x) => x.name === v.name)) e.values.push(v); };
  const gap = (want: string | null, element: string | null, carrier: string | null, lacks: string) => { if (!gaps.some((x) => x.want === want && x.element === element && x.lacks === lacks)) gaps.push({ want, element, carrier, lacks }); };
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
  /** Where power comes from for a region: the stores its moving region carries, or environment reservoirs of a conjugate carrier above a sink of it. */
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
        const st = stateOf(r, cid)!;
        const below = cid === 'charge' || cid.startsWith('mass of') || reservoirs(cid).some((x) => x.region !== r.id && x.hi < st.lo);
        if (below && !out.some((x) => x.carrier.id === cid)) out.push({ region: r.id, carrier: c, store: false });
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
    else gap(want, element.id, 'energy', 'its heat has nowhere the language can see to go');
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
      for (const q of said(regionOf(intent, from.region), c.id, 'content')) src?.values.push({ name: `what ${from.region} holds`, value: q.leaf.value!, unit: q.leaf.unit, from: q.leaf.name });
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
  /** Matter that must leave: to the lowest reservoir of it, if it is below where the matter is. */
  const drain = (c: Carrier, from: string, at: number, want: string | null, parent: string | null) => {
    const sinks = reservoirs(c.id).filter((s) => s.region !== from).sort((a, b) => a.hi - b.hi);
    if (!sinks.length) { gap(want, parent, c.id, `nothing in the site receives ${c.id}`); return; }
    const s = sinks[0]!;
    const out = path(c, from, s.region, want, `${c.id} leaves to the lowest reservoir of it, ${s.region}`, parent);
    if (out && !(s.hi < at)) gap(want, out.id, c.id, `nothing drives ${c.id} from ${from} to ${s.region}: both are at ${at} ${c.potential}, and the height of a liquid in gravity is not part of its potential`);
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

  const momentumWant = (w: Want, c: Carrier, role: Role | null, R: Region) => {
    const lo = w.lo?.value ?? null, hi = w.hi?.value ?? null;
    const atRest = (r: Region) => { const st = stateOf(r, 'momentum'); return !!st && st.lo === 0 && st.hi === 0; };
    if (!w.relativeTo && (role === 'position' || role === null) && w.when === 'always') {
      const loads = intent.regions.filter((r) => r.id !== R.id).flatMap((r) => said(r, 'momentum', 'flux density').map((q) => ({ region: r.id, q, dir: r.directions?.[q.sym] ?? null }))).filter((x) => route(x.region, R.id));
      const sh = shape(R.id);
      let down = 0, across = 0;
      for (const l of loads) {
        const faces = l.dir ? facesCrossed(l.dir) : null;
        const area = sh && faces ? (l.dir === 'across' ? sh.largestSide.value! : faces.reduce((a, f) => a + sh.area[f].value!, 0)) : null;
        const F = area !== null ? l.q.leaf.value! * area : null;
        if (F !== null) { if (l.dir === 'across') across += F; else down += F; }
        const ld = add({ id: `load:${l.region}->${R.id}`, kind: 'path', carrier: 'momentum', says: `the momentum ${l.region} brings (${l.q.leaf.name}) reaches ${R.id}${faces ? ` on its ${faces.join(' and ')} face${faces.length > 1 ? 's' : ''}` : ''}`, regions: route(l.region, R.id)!, values: [{ name: l.q.leaf.name, value: l.q.leaf.value!, unit: 'Pa', from: l.region }, ...(F !== null ? [{ name: 'force', value: F, unit: 'N', from: `${l.q.leaf.name} times the area it acts on` }] : [])], why: { want: w.id, rule: 'what the environment brings per area is a momentum flux into the faces it crosses', laws: [], parent: null } });
        // what reaches a face is carried across it by members spanning it, to the face that meets the region at rest
        if (sh && faces) for (const f of faces) {
          const span = f === 'side' ? sh.y.value! : Math.min(sh.x.value!, sh.z.value!);
          add({ id: `members:${R.id}:${f}`, kind: 'path', carrier: 'momentum', says: `members spanning the ${f === 'side' ? 'sides' : `${f}-facing face`} of ${R.id} carry what reaches it to the face that meets the ground`, regions: [R.id], values: [{ name: 'span', value: span, unit: 'm', from: f === 'side' ? `${sh.y.name}` : 'the shorter extent of the plan' }], why: { want: w.id, rule: 'a face that receives momentum passes it on through members that span it', laws: lawIds(c, 'flux-stored-energy'), parent: ld.id } });
        }
      }
      const masses = intent.regions.filter((r) => r.id === R.id || touches(intent, r.id, R.id)).flatMap((r) => said(r, 'momentum', 'capacitance').map((q) => ({ region: r.id, q })));
      for (const m of masses) down += m.q.leaf.value! * g;
      if (sh && masses.length) add({ id: `members:${R.id}:down`, kind: 'path', carrier: 'momentum', says: `members spanning the down-facing face of ${R.id} carry what rests on it`, regions: [R.id], values: [{ name: 'span', value: Math.min(sh.x.value!, sh.z.value!), unit: 'm', from: 'the shorter extent of the plan' }], why: { want: w.id, rule: 'a face that receives momentum passes it on through members that span it', laws: lawIds(c, 'flux-stored-energy'), parent: null } });
      for (const m of masses) add({ id: `weight:${m.region}`, kind: 'path', carrier: 'momentum', says: `gravity makes momentum in ${m.q.leaf.name}: ${(m.q.leaf.value! * g).toFixed(0)} N reaches ${R.id}`, regions: [m.region, R.id], values: [{ name: 'weight', value: m.q.leaf.value! * g, unit: 'N', from: `${m.q.leaf.name} times standard gravity` }], why: { want: w.id, rule: 'gravity is a production of momentum in every mass', laws: [], parent: null } });
      const rest = intent.regions.filter((r) => r.id !== R.id && atRest(r));
      if (!rest.length) { gap(w.id, null, 'momentum', 'nothing at rest receives the momentum'); return; }
      for (const gr of rest) {
        const p = path(c, R.id, gr.id, w.id, 'a region held in place sends all the momentum it receives to a region at rest', null);
        if (!p) continue;
        p.why.laws = [...new Set([...p.why.laws, ...lawIds(c, 'flux-stored-energy')])];
        if (hi !== null) p.values.push({ name: role === null ? 'most displacement over span' : 'most displacement', value: hi, unit: role === null ? '1' : 'm', from: w.hi!.name });
        if (down > 0) p.values.push({ name: 'force down, without the structure\'s own weight', value: down, unit: 'N', from: 'the loads on the faces and the weights' });
        if (across > 0) p.values.push({ name: 'force across', value: across, unit: 'N', from: 'what pushes on the largest side' });
        for (const lim of said(gr, 'momentum', 'flux density', true)) add({ id: `bound:momentum:${R.id}|${gr.id}`, kind: 'bound', carrier: 'momentum', says: `where the path meets ${gr.id}, the momentum per area stays below ${lim.leaf.name}: the meeting area is at least the flux over it`, regions: [R.id, gr.id], values: [{ name: lim.leaf.name, value: lim.leaf.value!, unit: 'Pa', from: gr.id }, ...(down > 0 ? [{ name: 'least meeting area, without the structure\'s own weight', value: down / lim.leaf.value!, unit: 'm^2', from: 'the force down over the bearing it allows' }] : [])], why: { want: w.id, rule: 'a boundary carries flux up to the flux density its weaker side allows', laws: [], parent: p.id } });
      }
      if (loads.length && !sh) gap(w.id, null, 'momentum', 'the loads per area need the areas they act on: no geometry');
      if (loads.length) gap(w.id, null, 'momentum', 'the structure\'s own weight is what it is made of times its size: no material is chosen');
      return;
    }
    // moved: relative to a reference
    const ref = w.relativeTo ? regionOf(intent, w.relativeTo) : intent.regions.find((r) => r.environment && touches(intent, r.id, R.id) && atRest(r)) ?? null;
    if (!ref) { gap(w.id, null, 'momentum', `nothing at rest touches ${R.id} to push against`); return; }
    if (!atRest(ref)) {
      // content placed relative to a shape: it arrives at a point that moves over it
      const dep = add({ id: `deposit:${R.id}`, kind: 'region', carrier: 'momentum', says: `a point where content enters ${R.id}, moving over ${ref.id}`, regions: [R.id], values: hi !== null ? [{ name: 'most position error', value: hi, unit: 'm', from: w.hi!.name }] : [], why: { want: w.id, rule: `content placed relative to ${ref.id} arrives at a point that moves over it`, laws: [], parent: null } });
      const rest = intent.regions.find((r) => r.environment && atRest(r));
      if (!rest) { gap(w.id, dep.id, 'momentum', 'nothing at rest to hold the point against'); return; }
      const frame = path(c, R.id, rest.id, w.id, `the point and ${R.id} are held to each other through ${rest.id}, stiff enough that the motion's forces displace them less than the tolerance`, dep.id);
      if (frame) { frame.why.laws = [...new Set([...frame.why.laws, ...lawIds(c, 'flux-stored-energy')])]; if (hi !== null) frame.values.push({ name: 'most displacement', value: hi, unit: 'm', from: w.hi!.name }); }
      const sh = shape(R.id);
      const axes: ('x' | 'y' | 'z' | null)[] = sh ? ['x', 'y', 'z'] : [null];
      if (sh && frame) put(frame, { name: 'span it holds the point over, along each axis', value: Math.max(sh.x.value!, sh.y.value!, sh.z.value!), unit: 'm', from: `the extent of ${R.id}` });
      for (const s of powerSources(R.id)) {
        let conv: Element | null = null;
        for (const a of axes) {
          conv = add({ id: `conversion:${s.carrier.id}->momentum:${dep.id}${a ? `:${a}` : ''}`, kind: 'conversion', carrier: 'momentum', says: `${s.carrier.id} becomes the momentum that moves the point${a ? ` along ${a}, over ${sh![a].value} m` : ''}`, regions: [dep.id], values: a ? [{ name: 'travel', value: sh![a].value!, unit: 'm', from: `the extent of ${R.id} along ${a}` }] : [], why: { want: w.id, rule: a ? 'a point moved over an extent moves along each of its axes: momentum has a direction' : 'a point moved over a shape: power converted to momentum', laws: coupling(s.carrier, carrierById('angular momentum')).map((l) => l.id), parent: dep.id } });
          if (a) shed(conv, R.id, w.id);
          if (a) add({ id: `observer:position:${dep.id}:${a}`, kind: 'observer', carrier: 'momentum', says: `an observer of where the point is along ${a}, resolving finer than the tolerance`, regions: [dep.id], values: hi !== null ? [{ name: 'resolution needed', value: hi / 2, unit: 'm', from: 'half the tolerance' }] : [], why: { want: w.id, rule: 'a position held to a tolerance is observed finer than it, along each axis it moves', laws: [], parent: conv.id } });
        }
        path(s.carrier, s.region, R.id, w.id, `the motion draws ${s.carrier.id} from ${s.region}`, conv!.id);
        if (s.carrier.id === 'charge') add({ id: `return:charge:${R.id}->${s.region}`, kind: 'path', carrier: 'charge', says: `the charge returns from ${R.id} to ${s.region}: charge is neither made nor destroyed`, regions: [R.id, s.region], values: [], why: { want: w.id, rule: 'charge drawn returns', laws: lawIds(s.carrier, 'conductance'), parent: conv!.id } });
        if (!sh) shed(conv!, R.id, w.id);
      }
      add({ id: `observer:position:${dep.id}`, kind: 'observer', carrier: 'momentum', says: `an observer of where the point is against ${ref.id}, resolving finer than the tolerance`, regions: [dep.id], values: hi !== null ? [{ name: 'resolution needed', value: hi / 2, unit: 'm', from: 'half the tolerance' }] : [], why: { want: w.id, rule: 'a position held to a tolerance is observed finer than the tolerance', laws: [], parent: dep.id } });
      add({ id: `modulation:momentum:${dep.id}:observed`, kind: 'modulation', carrier: 'momentum', says: 'the motion follows the observation of the point against the shape', regions: [dep.id], values: [], why: { want: w.id, rule: 'a position held to a tolerance: the motion follows what is observed', laws: [], parent: `observer:position:${dep.id}` } });
      return;
    }
    const masses = said(R, 'momentum', 'capacitance');
    const moving = add({ id: `moving:${R.id}`, kind: 'region', carrier: 'momentum', says: `a region moving with ${R.id}: what must move together shares momentum through paths`, regions: [R.id], values: masses.map((m) => ({ name: `mass it moves, at least (${m.leaf.name})`, value: m.leaf.value!, unit: 'kg', from: R.id })), why: { want: w.id, rule: `${R.id} moves relative to ${ref.id}`, laws: lawIds(c, 'storage'), parent: null } });
    const mu = said(ref, 'momentum', 'content', true).concat(Object.entries(ref.quantities).filter(([sym, l]) => (ref.limits ?? []).includes(sym) && ref.carriers?.[sym] === 'momentum' && l.dim.every((x) => x === 0)).map(([sym, leaf]) => { use(ref, sym); return { sym, leaf }; }))[0];
    const contact = add({ id: `contact:${R.id}|${ref.id}`, kind: 'contact', carrier: 'momentum', says: `the moving region meets ${ref.id}: momentum crosses there up to the most tangential flux over normal flux${mu ? ` (${mu.leaf.name})` : ''}; a contact that rolls has no relative speed and makes no heat, one that slides dissipates the flux times the speed`, regions: [moving.id, ref.id], values: mu ? [{ name: 'most acceleration the contact carries', value: mu.leaf.value! * g, unit: 'm/s^2', from: `${mu.leaf.name} times standard gravity` }] : [], why: { want: w.id, rule: 'a moving region\'s momentum crosses where it meets a region at rest', laws: [...lawIds(c, 'dissipation'), ...coupling(carrierById('angular momentum'), c).map((l) => l.id)], parent: moving.id } });
    if (role === 'acceleration' && w.when === 'on demand' && lo !== null) {
      if (mu && mu.leaf.value! * g < lo) gap(w.id, contact.id, 'momentum', `the want asks ${lo} m/s² and the contact carries at most ${(mu.leaf.value! * g).toFixed(2)} m/s² with the site's friction`);
    }
    if (role === 'acceleration' && w.when === 'on demand' && /decel/.test(w.quantity.name)) {
      const brake = add({ id: `conversion:momentum:${R.id}:removal`, kind: 'conversion', carrier: 'momentum', says: 'on demand the moving region\'s momentum is taken out at the contact: its energy becomes heat, or returns to the store', regions: [moving.id], values: [], why: { want: w.id, rule: 'momentum removed from a moving region: its stored energy goes to heat or back to the store', laws: lawIds(c, 'dissipation', 'stored-energy'), parent: contact.id } });
      add({ id: `modulation:momentum:${R.id}:removal`, kind: 'modulation', carrier: 'momentum', says: 'the person asks for the momentum to be taken out', regions: [moving.id], values: [], why: { want: w.id, rule: 'on demand: the person modulates', laws: [], parent: brake.id } });
      shed(brake, R.id, w.id);
    }
    if (role === 'acceleration' && w.when === 'always' && hi !== null) {
      const dir = w.quantity.direction;
      const varies = Object.keys(ref.quantities).filter((sym) => ref.carriers?.[sym] === 'momentum' && !(ref.holds ?? []).includes(sym) && !(ref.limits ?? []).includes(sym) && (!dir || ref.directions?.[sym] === dir));
      for (const sym of varies) use(ref, sym);
      if (!varies.length) gap(w.id, contact.id, 'momentum', 'nothing the language sees varies at the contact');
      else {
        add({ id: `filter:momentum:${R.id}`, kind: 'path', carrier: 'momentum', says: `between the contact and ${R.id}, a path that stores and dissipates momentum, so what varies at the contact (${varies.map((s) => ref.quantities[s]!.name).join(', ')}) reaches ${R.id} below the bound`, regions: [contact.id, R.id], values: [{ name: 'most acceleration', value: hi, unit: 'm/s^2', from: w.hi!.name }], why: { want: w.id, rule: 'a bounded rate under a varying neighbour: a store and a dissipation between them', laws: lawIds(c, 'storage', 'dissipation', 'flux-stored-energy'), parent: contact.id } });
        observeAndModulate(c, R.id, w.id, contact.id, null);
      }
    }
    if (role === 'acceleration' && w.when === 'on demand' && hi !== null) {
      const v = w.condition && Object.values(w.condition).find((x) => x.carrier === 'momentum' && x.leaf.unit === 'm/s');
      const stroke = add({ id: `stroke:momentum:${R.id}`, kind: 'path', carrier: 'momentum', says: `in the event the momentum of ${R.id} leaves through a path that stores and dissipates it over a stroke long enough to keep the flux below ${hi} m/s² times the mass`, regions: [R.id, moving.id], values: [{ name: 'most acceleration', value: hi, unit: 'm/s^2', from: w.hi!.name }, ...(v ? [{ name: 'least stroke: v² / 2a', value: (v.leaf.value! ** 2) / (2 * hi), unit: 'm', from: `${v.leaf.name} and the bound` }] : [])], why: { want: w.id, rule: 'a bounded flux in an event: the content leaves over a stroke', laws: lawIds(c, 'stored-energy', 'dissipation'), parent: moving.id } });
      if (!v) gap(w.id, stroke.id, 'momentum', 'the event\'s speed is not a quantity: the stroke cannot be derived');
    }
    if (role === 'position' && w.when === 'always') {
      // following a path is momentum across the travel: its curvature asks v² / r of the contact, which carries at most the friction times gravity
      const r = said(ref, 'momentum', 'position')[0];
      add({ id: `modulation:momentum:${R.id}:direction`, kind: 'modulation', carrier: 'momentum', says: 'the person modulates which way the contact pushes, across the travel', regions: [moving.id], values: [], why: { want: w.id, rule: 'a position kept relative to a path: the push across the travel is modulated by who observes the path', laws: [], parent: contact.id } });
      if (r && mu) put(contact, { name: 'most speed on the tightest curve: the root of friction times gravity times its radius', value: Math.sqrt(mu.leaf.value! * g * r.leaf.value!), unit: 'm/s', from: `${mu.leaf.name} and ${r.leaf.name}` });
      else gap(w.id, moving.id, 'momentum', 'how sharply the path turns is not said');
    }
    if ((role === 'position' && w.when === 'by the end') || role === 'potential') {
      const sources = intent.regions.filter((r) => r.environment).flatMap((r) => (r.holds ?? []).map((sym) => ({ r, sym, cid: r.carriers?.[sym] })).filter((x) => x.cid && x.cid !== 'momentum' && carrierById(x.cid).conjugate)).map((x) => { use(x.r, x.sym); return { region: x.r.id, carrier: carrierById(x.cid!) }; }).filter((x, i, a) => a.findIndex((y) => y.carrier.id === x.carrier.id) === i);
      if (!sources.length) { gap(w.id, moving.id, 'momentum', 'nothing offers the power to move'); return; }
      for (const f of sources) {
        const alt = sources.length > 1 ? `store of ${moving.id}` : undefined;
        const store = add({ ...(alt ? { oneOf: alt } : {}), id: `store:${f.carrier.id}:${moving.id}`, kind: 'store', carrier: f.carrier.id, says: `a store of ${f.carrier.id} the moving region carries: it moves away from ${f.region}, so no path to it lasts`, regions: [moving.id], values: role === 'position' && lo !== null ? [{ name: 'distance the store must last', value: lo, unit: 'm', from: w.lo!.name }] : [], why: { want: w.id, rule: 'a moving region carries its store: a path to a fixed source would have to stretch', laws: lawIds(f.carrier, 'storage', 'stored-energy'), parent: moving.id } });
        add({ id: `refill:${f.carrier.id}:${moving.id}`, kind: 'path', carrier: f.carrier.id, says: `the store is filled from ${f.region} when the moving region is there`, regions: [f.region, moving.id], values: [], why: { want: w.id, rule: 'a store is replenished from its source', laws: lawIds(f.carrier, 'conductance'), parent: store.id } });
        const conv = add({ ...(alt ? { oneOf: `conversion of ${moving.id}` } : {}), id: `conversion:${f.carrier.id}->momentum:${moving.id}`, kind: 'conversion', carrier: 'momentum', says: f.carrier.id === 'charge' ? 'charge from the store becomes angular momentum, which the rolling contact couples to momentum' : `${f.carrier.id} from the store becomes heat, then work bounded by Carnot, then angular momentum at the rolling contact`, regions: [moving.id], values: [], why: { want: w.id, rule: 'the store\'s carrier is converted to momentum at the contact', laws: [...coupling(f.carrier, carrierById('angular momentum')).map((l) => l.id), ...coupling(carrierById('angular momentum'), c).map((l) => l.id)], parent: store.id } });
        add({ id: `modulation:${f.carrier.id}:${moving.id}:person`, kind: 'modulation', carrier: 'momentum', says: 'the person chooses how much of the store is converted', regions: [moving.id], values: [], why: { want: w.id, rule: 'on demand: the person modulates the conversion', laws: [], parent: conv.id } });
        shed(conv, R.id, w.id);
      }
      for (const d of intent.regions.filter((r) => r.environment && touches(intent, r.id, R.id) && Object.keys(r.quantities).some((sym) => (r.carriers?.[sym] ?? '').startsWith('mass of') && roleOf(carrierById(r.carriers![sym]!), r.quantities[sym]!.unit) === 'content density'))) {
        for (const sym of Object.keys(d.quantities).filter((s) => (d.carriers?.[s] ?? '').startsWith('mass of'))) use(d, sym);
        add({ id: `drag:${moving.id}|${d.id}`, kind: 'boundary', carrier: 'momentum', says: `the moving region gives momentum to ${d.id}, a fluid at rest it pushes through`, regions: [moving.id, d.id], values: [], why: { want: w.id, rule: 'a region moving through a fluid at rest loses momentum to it', laws: lawIds(c, 'conductance', 'dissipation'), parent: moving.id } });
      }
      const grade = Object.entries(ref.quantities).find(([sym, l]) => ref.carriers?.[sym] === 'momentum' && !(ref.limits ?? []).includes(sym) && l.dim.every((x) => x === 0));
      if (grade) { use(ref, grade[0]); put(moving, { name: 'steepest grade it climbs: gravity along the path is that fraction of the weight', value: grade[1].value!, unit: '1', from: grade[1].name }); }
      const sh = shape(R.id);
      if (sh) { const drag = elements.find((e) => e.id.startsWith(`drag:${moving.id}`)); put(drag, { name: 'area facing the travel, at least: what the moving region must hold across and up', value: sh.x.value! * sh.y.value!, unit: 'm^2', from: `${sh.x.name} times ${sh.y.name}` }); }
      gap(w.id, moving.id, 'momentum', sh ? 'how hard the fluid pushes back on a shape (its drag coefficient) is not generated: the store and the power cannot be sized' : 'how much the store holds needs the resistance to motion, which needs the moving region\'s size and shape: no geometry');
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

  for (const w of intent.wants) {
    const cid = w.quantity.carrier;
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
        const srcRegion = regionOf(intent, above.region);
        for (const lim of said(srcRegion, c.id, role, true)) {
          if (lim.leaf.value! < lo) gap(w.id, use_.id, c.id, `the want asks ${lo} ${w.quantity.unit} and ${above.region} gives at most ${lim.leaf.value} (${lim.leaf.name})`);
          else use_.values.push({ name: `within what ${above.region} gives`, value: lim.leaf.value!, unit: lim.leaf.unit, from: lim.leaf.name });
        }
      }
      if (c.id === 'charge') add({ id: `return:charge:${R.id}->${above?.region ?? 'its source'}`, kind: 'path', carrier: 'charge', says: `the charge returns from ${R.id} to ${above?.region ?? 'its source'}: charge is neither made nor destroyed`, regions: [R.id, above?.region ?? R.id], values: [], why: { want: w.id, rule: 'a delivered charge returns', laws: lawIds(c, 'conductance'), parent: use_.id } });
      else if (contentBound(R.id, c.id)) drain(c, R.id, usePotential, w.id, use_.id);
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
        const crossed = dirs.length ? [...new Set(dirs.flatMap(facesCrossed))] : undefined;
        const faces = faceElements(bnd, c.id, R.id, next, crossed);
        const sh = shape(R.id);
        let carried: number | null = null;
        if (sh && crossed && brought.length) carried = brought.reduce((s, q) => s + q.leaf.value! * crossed.reduce((a, f) => a + sh.area[f].value!, 0), 0);
        if (faces.length && carried !== null) put(bnd, { name: `what the ${crossed!.join(' and ')} face${crossed!.length > 1 ? 's' : ''} intercept`, value: carried, unit: c.flux, from: `${brought.map((q) => q.leaf.name).join(' + ')} times the area` });
        drain(c, next, ambient, w.id, bnd.id);
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
    for (const pth of along) {
      const end = pth.regions[pth.regions.length - 1]!;
      const host = intent.regions.filter((x) => x.environment && touches(intent, x.id, end) && stateOf(x, tc.id)).map((x) => x.id)[0];
      if (!host) { gap(pth.why.want, pth.id, tc.id, `nothing around ${end} holds ${tc.id}`); continue; }
      const id = `flows:${p.of}:${end}`;
      hosts.set(id, host);
      add({ id, kind: 'region', carrier: tc.id, says: `where ${p.of} must flow on its way into ${end}: held above ${threshold.name}`, regions: [end], values: [{ name: threshold.name, value: threshold.value!, unit: 'K', from: r.id }, ...(most ? [{ name: r.quantities[most[0]]!.name, value: r.quantities[most[0]]!.value!, unit: 'K', from: r.id }] : [])], why: { want: pth.why.want, rule: `${p.of} flows only above ${threshold.name}: the place it must flow is a region held above it`, laws: lawIds(tc, 'conductance'), parent: pth.id } });
      holdPotential(id, tc, threshold.value!, most ? r.quantities[most[0]]!.value! : null, pth.why.want, id);
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
  if (members.length) {
    const m = chooseMatter(kept, 'momentum', 'stiffness', 'most');
    for (const e of members) put(e, { name: 'matters available that state a stiffness and a strength', value: m.candidates.filter((x) => propertyOf(x.properties, 'momentum', 'most flux density')).length, unit: '1', from: 'src/data/materials.ts' });
    gap(members[0]!.why.want, members[0]!.id, 'momentum', 'a member\'s section is a configuration of the space its span, its load and its bounds make: no system is generated from an element');
  }
  // what bears the heat: no available matter states the highest temperature it bears, unless the intent does
  for (const g of gaps.filter((x) => /the hottest it may run/.test(x.lacks))) {
    const m = chooseMatter(kept, 'energy', 'most potential', 'most');
    if (!m.pick) g.lacks = `the hottest it may run is a property of what it is made of: ${m.lacks}`;
  }
  for (const g of gaps.filter((x) => /structure's own weight/.test(x.lacks))) g.lacks = 'the structure\'s own weight is its members\' matter times their size: no system is generated from an element';

  // a flow of a medium carries what the medium holds: a species' boundary conducts a volume of the medium per time
  const aggregate = (e: Element) => e.kind === 'boundary' && !elements.some((p) => p.id === e.why.parent && p.kind === 'boundary');
  for (const b of elements.filter((e) => aggregate(e) && e.carrier.startsWith('amount of'))) {
    const others = [...new Set(elements.filter((e) => aggregate(e) && e.id !== b.id && e.carrier !== b.carrier && e.regions[0] === b.regions[0] && e.regions[1] === b.regions[1]).map((o) => o.carrier))];
    if (others.length) gap(b.why.want, b.id, b.carrier, `its conductance is a volume of ${b.regions[1]} per time, and the same flow carries ${others.join(' and ')} across the same boundary: the language counts them as separate boundaries, it has no advection`);
  }

  // a want that is not about a carrier's balance reads nothing; what the intent says and no rule read is information the language cannot use
  for (const w of intent.wants) { const R = intent.regions.find((r) => r.id === w.region); if (R && w.quantity.sym in R.quantities) use(R, w.quantity.sym); }
  const unused = intent.regions.flatMap((r) => [...Object.entries(r.quantities), ...Object.entries(r.produces ?? {})].filter(([sym]) => !used.has(`${r.id}.${sym}`)).map(([sym, l]) => ({ region: r.id, sym, name: l.name })));
  return { intent: intent.name, elements, gaps, unused };
}

/** The structure as it reads: each element with its rule and the wants it serves, then the gaps and what went unread. */
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
  [/no material is chosen/, 'what a region is made of'],
  [/no geometry/, 'geometry: the sizes, areas and shapes of regions'],
  [/no process/, 'a process: how long a change takes'],
  [/height of a liquid in gravity/, 'gravity in a matter\'s potential'],
  [/momentum has a direction/, 'direction: momentum is a vector'],
  [/no advection/, 'advection: a flow of matter carries what the matter holds'],
  [/about no carrier: the language has no rule/, 'a want about no carrier'],
  [/with the site's friction|gives at most/, 'a lawful refusal: the want exceeds what the site allows'],
  [/nothing in the site receives/, 'the site does not say where it goes'],
];

/** What an unread quantity is: classified by its dimension and the carrier it is about. */
function unreadClass(i: Intent, u: { region: string; sym: string }): string {
  const r = regionOf(i, u.region);
  const l = r.quantities[u.sym] ?? r.produces?.[u.sym];
  if (!l) return 'unclassified';
  const d = l.dim;
  const carrier = r.carriers?.[u.sym];
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
      const d = SIGNATURES.find(([re]) => re.test(g.lacks))?.[1] ?? `other: ${g.lacks}`;
      const l = get(d); l.gaps++; if (!l.inventions.includes(s.intent)) l.inventions.push(s.intent);
    }
    for (const u of s.unused) {
      const d = unreadClass(intents[k]!, u);
      const l = get(d); l.unread++; if (!l.inventions.includes(s.intent)) l.inventions.push(s.intent);
    }
  });
  return [...by.values()].sort((a, b) => b.inventions.length - a.inventions.length || (b.gaps + b.unread) - (a.gaps + a.unread));
}

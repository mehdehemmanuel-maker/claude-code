// Polysemy (docs/EGO-NATIVE-LANGUAGE.md section S): one human word, several things. "Current" is the electric current
// (a quantity, amperes) and the ocean current (a phenomenon); "turn" is a rotation and the lathe's process; "power" is
// a quantity that any flow carries, not the electric one alone. A word is not a thing: it reaches readings, each a
// distinction with its kind (and its dimension when it is a quantity), and the readings are a structure each, so
// which is meant is settled by structure (the dimension the question carries, the kind of thing it is about) or
// asked, never chosen in silence. The census this module runs over the substrate is the measurement in section Y.13.

import { dimensionOf, sameDim, type Dim } from '../units';
import type { Entity, Kind } from '../substrate/model';
import type { Substrate } from '../substrate/substrate';
import { singular, spokenName } from '../substrate/names';
import { facesOfOne } from '../substrate/faces';
import { FLOW_WORDS, flowOfWord } from '../words';
import type { Flow } from '../blocks';
import { d, q, r, type Structure } from './core';
import { QUANTITY_ROWS } from '../substrate/seeds/quantities';

/** The SI unit of a quantity a word names ("power": W), from the quantities pack's rows, without the substrate built. */
export const unitOfQuantityWord = (word: string): string | undefined => { const w = word.trim().toLowerCase(); return QUANTITY_ROWS.find((x) => x.name === w || x.id === `qty.${w}` || x.id === w)?.unit; };

/** How a word reaches a thing, strongest first: its name, one of its names, an id in a namespace, a material family, a material family head, the flow table, a search token shared by a catalogue, the tail of an id. */
export type Reach = 'name' | 'alias' | 'prefixed' | 'family' | 'head' | 'flow' | 'token' | 'tail';
export const REACH_ORDER: Reach[] = ['name', 'alias', 'prefixed', 'family', 'head', 'flow', 'token', 'tail'];

export interface Reading { id: string; entity?: Entity; kind: Kind | 'flow'; reach: Reach; dim?: Dim; unit?: string; structure: Structure; says: string }

/** Layers that borrow a thing's name (its kind, its block, its views, its parameters): not readings of the word. */
const LAYER = /^(?:kind|block|view|cross|param|scale)\./;
const PREFIXES = ['qty.', 'flow.', 'role.', 'fn.', 'bio.', 'material.', 'process.', 'machine.', 'vehicle.', 'robot.', 'chem.', 'circuit.', 'earth.', 'sensor.', 'failure.', 'phys.', 'tool.', 'std.', 'element.', 'energy.', 'way.'];

/** The dimensions each flow carries: what a quantity of that dimension may ride on. A quantity carried by more than one flow does not name a flow by itself. */
export const FLOW_DIMS: Record<Flow, string[]> = {
  electric: ['V', 'A', 'W', 'J'], rotation: ['N m', 'rad/s', 'W', 'J'], translation: ['N', 'm/s', 'W', 'J', 'm'], travel: ['m/s', 'W', 'J', 'm'], load: ['N', 'Pa', 'N m'],
  signal: [], heat: ['J', 'W', 'K'], stock: ['kg', 'm'], chemical: ['J', 'kg'], light: ['W', 'J'], sound: ['W', 'Pa', 'Hz'],
};

const safeDim = (unit: string): Dim | undefined => { try { return dimensionOf(unit); } catch { return undefined; } };
const unitOf = (e: Entity): string | undefined => (e.kinds.includes('quantity') || e.kinds.includes('property') ? e.params?.find((p) => p.sym === 'unit')?.values?.[0] : undefined);

const reading = (e: Entity, reach: Reach): Reading => {
  const unit = unitOf(e);
  const kind = e.kinds[0] ?? 'thing';
  // a unit the book cannot read (a hardness scale) leaves the dimension unmodelled, not the reading
  const dim = unit ? safeDim(unit) : undefined;
  const structure: Structure = unit && dim ? r('quantity', [d(e.id, { en: spokenName(e) }), q(0, unit)], {}) : r('kind', [d(e.id, { en: spokenName(e) }), d(kind)], {});
  return { id: e.id, entity: e, kind, reach, ...(dim ? { dim } : {}), ...(unit ? { unit } : {}), structure, says: spokenName(e) };
};

/** Every thing a word reaches, strongest reach first, one reading per thing. */
export function readings(s: Substrate, word: string): Reading[] {
  const w = word.trim().toLowerCase().replace(/\s+/g, ' ').replace(/^(an? |the )/, '');
  if (!w) return [];
  const one = singular(w), dashed = w.replace(/\s+/g, '-'), dotted = w.replace(/\s+/g, '.');
  const out = new Map<string, Reading>();
  const add = (e: Entity | undefined, reach: Reach) => { if (e && !LAYER.test(e.id) && !out.has(e.id)) out.set(e.id, reading(e, reach)); };
  const all = [...s.entities.values()].filter((e) => !LAYER.test(e.id));
  // the word as said, its singular, and as a name is written with dashes or dots ("coarse graining" is the alias
  // "coarse-graining"): the forms the lookup (substrate/names.ts) reads, so the census and the lookup see one word
  const forms = [w, one, dashed, dotted];
  const named = (e: Entity) => forms.includes(e.name.toLowerCase());
  const aliased = (e: Entity) => !named(e) && e.names.some((n) => forms.includes(n.toLowerCase()));
  for (const e of all) if (named(e)) add(e, 'name');
  add(s.get(w) ?? s.get(dotted) ?? s.get(one), 'name');
  // a one-word alias shared by a whole catalogue is a search token, not a name ("drive" on every motor and chain)
  const byAlias = all.filter((e) => aliased(e));
  const token = byAlias.length > 1 && !byAlias.some((e) => e.names.length <= 2);
  for (const e of byAlias) add(e, token ? 'token' : 'alias');
  for (const p of PREFIXES) add(s.get(p + dashed) ?? s.get(p + dotted), 'prefixed');
  add(s.get(`material.${dashed}-alloy`) ?? s.get(`material.${singular(dashed)}-alloy`), 'family');
  for (const e of all) if (e.kinds.includes('material') && (e.id === `material.${dashed}` || e.id.startsWith(`material.${dashed}-`) || e.id.startsWith(`material.${dashed}.`))) add(e, 'head');
  const flow = flowOfWord(w);
  if (flow) { const e = s.get(`flow.${flow}`); if (e) { if (!out.has(e.id)) out.set(e.id, { ...reading(e, 'flow'), kind: 'flow' }); } else out.set(`flow.${flow}`, { id: `flow.${flow}`, kind: 'flow', reach: 'flow', structure: r('kind', [d(`flow.${flow}`), d('flow')], {}), says: `the ${flow} flow` }); }
  for (const e of all) if (e.id.endsWith(`.${one}`) || e.id.endsWith(`.${dashed}`)) add(e, 'tail');
  return [...out.values()].sort((a, b) => REACH_ORDER.indexOf(a.reach) - REACH_ORDER.indexOf(b.reach));
}

const face = (a: Reading, b: Reading): boolean => (a.kind === b.kind ? !a.dim || !b.dim || sameDim(a.dim, b.dim) : facesOfOne(a.kind, b.kind));

/** The senses of a word: its readings grouped by kind (and by dimension among quantities), the faces of one thing kept together. One sense is a word with one meaning here. */
export function senses(rs: Reading[]): Reading[][] {
  const groups: Reading[][] = [];
  for (const x of rs) {
    const g = groups.find((gg) => gg.some((y) => face(x, y)));
    if (g) g.push(x); else groups.push([x]);
  }
  return groups;
}

/** A word is polysemous here when its strongest readings are of more than one sense: nothing in the word itself says which. */
export function polysemous(rs: Reading[]): boolean {
  if (!rs.length) return false;
  const top = rs[0]!.reach;
  return senses(rs.filter((x) => x.reach === top)).length > 1;
}

export interface SettleContext { dim?: Dim; kinds?: (Kind | 'flow')[]; flow?: boolean }

/** Settle a word by structure: the dimension the question carries, or the kinds of thing it is about. Chosen only when one sense survives; otherwise the open senses are returned to be asked. */
export function settle(rs: Reading[], ctx: SettleContext): { chosen?: Reading; open: Reading[][]; why: string } {
  // a catalogue's search token or the tail of an id is too weak to be chosen by context: only what a name, a namespace or the flow table reaches
  let keep = rs.filter((x) => REACH_ORDER.indexOf(x.reach) <= REACH_ORDER.indexOf('flow'));
  if (ctx.dim) keep = keep.filter((x) => x.dim && sameDim(x.dim, ctx.dim!));
  if (ctx.kinds?.length) keep = keep.filter((x) => ctx.kinds!.includes(x.kind) || (x.entity?.kinds ?? []).some((k) => ctx.kinds!.includes(k)));
  if (ctx.flow) keep = keep.filter((x) => x.kind === 'flow');
  const open = senses(keep);
  if (open.length === 1) return { chosen: open[0]![0], open, why: ctx.dim ? 'by its dimension' : ctx.kinds?.length ? `as ${/^[aeiou]/.test(ctx.kinds[0]!) ? 'an' : 'a'} ${ctx.kinds[0]}` : ctx.flow ? 'as a flow' : 'the one sense' };
  return { open, why: open.length ? 'more than one sense fits' : 'no sense fits' };
}

/** The flows a quantity word rides on: a word whose dimension more than one flow carries is a quantity, not a flow, and the flow table's choice for it is a convention to be said. */
export function flowsCarrying(dim: Dim): Flow[] {
  return (Object.entries(FLOW_DIMS) as [Flow, string[]][]).filter(([, units]) => units.some((u) => sameDim(dimensionOf(u), dim))).map(([f]) => f);
}

/** The census (section Y.13): over every word of the substrate, how many reach things of more than one sense; and over the flow table's words, how many name a quantity that more than one flow carries. */
export function census(s: Substrate): { words: number; polysemous: string[]; flowWordsThatAreQuantities: { word: string; flow: Flow; carriedBy: Flow[] }[] } {
  // every name, every last word of an id ("current" of qty.current and earth.current), and every word of the flow table
  const words = new Set<string>();
  for (const e of s.entities.values()) if (!LAYER.test(e.id)) { for (const n of [e.name, ...e.names]) words.add(n.toLowerCase()); const tail = e.id.split('.').pop()!; if (/^[a-z][a-z-]+$/.test(tail)) words.add(tail.replace(/-/g, ' ')); }
  for (const ws of Object.values(FLOW_WORDS)) for (const w of ws) words.add(w);
  const poly: string[] = [];
  for (const w of words) if (polysemous(readings(s, w))) poly.push(w);
  const fw: { word: string; flow: Flow; carriedBy: Flow[] }[] = [];
  for (const [flow, ws] of Object.entries(FLOW_WORDS) as [Flow, string[]][]) for (const w of ws) {
    const qty = readings(s, w).find((x) => x.dim && x.reach !== 'flow');
    if (!qty?.dim) continue;
    const carriedBy = flowsCarrying(qty.dim);
    if (carriedBy.length > 1) fw.push({ word: w, flow, carriedBy });
  }
  return { words: words.size, polysemous: poly.sort(), flowWordsThatAreQuantities: fw };
}

/** The senses worth asking about: those a name, an alias, a namespace, a family or the flow table reaches; a catalogue's search token or the tail of an id is too weak to offer. */
export const askable = (groups: Reading[][]): Reading[][] => groups.filter((g) => g.some((x) => REACH_ORDER.indexOf(x.reach) <= REACH_ORDER.indexOf('flow')));

/** The senses of a word, said: "electric current (a quantity, in A); current, of earth (a phenomenon)". A thing said by the bare word is placed by its domain. */
export const saySenses = (groups: Reading[][]): string => groups.map((g) => { const x = g.find((y) => REACH_ORDER.indexOf(y.reach) <= REACH_ORDER.indexOf('flow')) ?? g[0]!; const where = x.entity && x.says.toLowerCase() === x.entity.id.split('.').pop()!.replace(/-/g, ' ') && x.entity.domains[0] ? `, of ${x.entity.domains[0]}` : ''; return `${x.says}${where} (${x.kind === 'flow' ? 'a flow' : `${/^[aeiou]/.test(x.kind) ? 'an' : 'a'} ${x.kind}`}${x.unit ? `, in ${x.unit}` : ''})`; }).join('; ');

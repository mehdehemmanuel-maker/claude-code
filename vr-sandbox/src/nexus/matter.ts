// One material system (docs/REALITY.md, step 6). A part carries a material id ("steel-low", "oak", "concrete"); this
// says what that id is, exactly as far as it is known, and every property of it with its value, unit, source and how
// it is known: a handbook value of that very grade, a standard's, a typical value, an estimate, worked out by a rule
// that holds, or a stand-in (the nearest grade the handbook holds, said as such). A material known only by its family
// ("wood", "concrete") is said to be unspecified, with the span its family's members here cover; it is never passed off
// as a species or a grade.
//
// The data stays where it is kept: densities (`mass.ts`), compositions down to elements (`elements.ts`), the handbook's
// mechanical and surface properties (`data/materials.ts`), heat (`engineering/thermal.ts`), melting and expansion
// (`engineering/fusion.ts`), service limits (`make/rules.ts`), the elements (`data/periodic.ts`). What joins them is the
// one table below, from a part's id to its family, its identity and its handbook grade: it replaces the strength map
// and the friction map's spelling matches (which gave tissue and tile titanium's friction, and platinum PMMA's).

import { DENSITY } from './mass';
import { MATERIALS as COMPOSITION, elementsOf, makeup, makeupSays, pureElement } from './elements';
import { MATERIALS as HANDBOOK, type Material } from '../data/materials';
import { thermalOf, woodThermal } from '../engineering/thermal';
import { FUSION } from '../engineering/fusion';
import { PERIODIC, PERIODIC_SOURCE } from '../data/periodic';
import { WOODS, woodDensity } from '../data/woods';
import { MIXES, mixDensity } from '../data/mixes';

export type Evidence = 'handbook' | 'specified' | 'typical' | 'estimated' | 'derived' | 'stand-in' | 'secondary';
export interface Prop { key: string; name: string; value: number; unit: string; source: string; evidence: Evidence; note?: string }
export type Family = 'steel' | 'stainless steel' | 'cast iron' | 'aluminium' | 'copper alloy' | 'other metal' | 'wood' | 'wood product' | 'polymer' | 'elastomer' | 'glass' | 'ceramic' | 'stone' | 'concrete and mortar' | 'composite' | 'textile and paper' | 'foam' | 'fluid' | 'soil' | 'battery' | 'living tissue' | 'food';
interface Row { family: Family; is: string; specified: boolean; handbook?: string; same?: boolean }
const r = (family: Family, is: string, specified: boolean, handbook?: string, same = false): Row => ({ family, is, specified, ...(handbook ? { handbook, same } : {}) });

/**
 * Every material id a part carries: its family; what it is, as precisely as it is known; whether that is specified (a
 * grade, a species, a type) or only a family; its handbook grade, and whether that grade is this material (`same`) or
 * only the nearest the handbook holds (a stand-in, whose numbers are said as the stand-in's).
 */
export const MATTER: Record<string, Row> = {
  'steel-low': r('steel', 'AISI 1018 low-carbon steel (cold drawn)', true, 'steel.1018-cd', true),
  'steel-alloy': r('steel', 'AISI 4140 chromium-molybdenum steel, quenched and tempered', true, 'steel.4140-qt', true),
  'steel-spring': r('steel', 'music wire, ASTM A228', true, 'steel.music-wire', true),
  'steel-chrome': r('steel', 'AISI 52100 bearing steel', true, 'steel.52100', true),
  'steel-tool': r('steel', 'AISI O1 oil-hardening tool steel', true, 'steel.1018-cd'),
  'steel-electrical': r('steel', 'non-oriented electrical steel (silicon steel)', false, 'steel.1018-cd'),
  'mls-steel': r('steel', 'multi-layer steel gasket sheet (spring steel, coated)', false, 'steel.1018-cd'),
  'stainless-304': r('stainless steel', 'AISI 304 austenitic stainless', true, 'stainless.304', true),
  'stainless-316': r('stainless steel', 'AISI 316 austenitic stainless', true, 'stainless.316', true),
  'stainless-440c': r('stainless steel', 'AISI 440C martensitic stainless', true, 'stainless.304'),
  'cast-iron': r('cast iron', 'grey cast iron, class 30', true, 'cast-iron.gray-30', true),
  'al-6061': r('aluminium', 'aluminium 6061-T6', true, 'aluminum.6061-t6', true),
  'al-6063': r('aluminium', 'aluminium 6063 (extrusion alloy)', true, 'aluminum.6061-t6'),
  'al-7075': r('aluminium', 'aluminium 7075-T6', true, 'aluminum.7075-t6', true),
  'al-5052': r('aluminium', 'aluminium 5052-H32', true, 'aluminum.5052-h32', true),
  'al-2024': r('aluminium', 'aluminium 2024-T3', true, 'aluminum.2024-t3', true),
  'al-3003': r('aluminium', 'aluminium 3003', true, 'aluminum.5052-h32'),
  'al-a380': r('aluminium', 'aluminium A380 die-casting alloy', true, 'aluminum.6061-t6'),
  copper: r('copper alloy', 'copper C11000 (electrolytic tough pitch)', true, 'copper.c110', true),
  'magnet-wire': r('copper alloy', 'enamelled copper winding wire', true, 'copper.c110'),
  brass: r('copper alloy', 'free-cutting brass C36000', true, 'brass.c360', true),
  bronze: r('copper alloy', 'tin bronze', false, 'brass.c360'),
  titanium: r('other metal', 'titanium Ti-6Al-4V (grade 5)', true, 'titanium.ti6al4v', true),
  lead: r('other metal', 'commercially pure lead', true),
  zamak: r('other metal', 'zinc die-casting alloy (Zamak)', false),
  'nickel-alloy': r('other metal', 'a nickel alloy, grade unsaid', false),
  'nickel-plate': r('other metal', 'electroplated nickel', true),
  gold: r('other metal', 'fine gold', true),
  silver: r('other metal', 'fine silver', true),
  tungsten: r('other metal', 'tungsten', true),
  solder: r('other metal', 'tin-lead or lead-free solder, alloy unsaid', false),
  ndfeb: r('other metal', 'sintered neodymium-iron-boron magnet', true),
  wood: r('wood', 'wood, species unsaid', false, 'wood.birch-plywood'),
  'douglas-fir': r('wood', 'Douglas-fir (coast), Pseudotsuga menziesii, at 12 % moisture', true, 'wood.birch-plywood'),
  'red-oak': r('wood', 'northern red oak, Quercus rubra, at 12 % moisture', true, 'wood.birch-plywood'),
  mdf: r('wood product', 'medium-density fibreboard (EN 622-5)', true, 'wood.mdf', true),
  'concrete-c25': r('concrete and mortar', 'normal-weight concrete, about 25 MPa, plain (no reinforcing): a typical mix', true, 'concrete.c30'),
  oak: r('wood', 'oak (Quercus), red or white unsaid', false, 'wood.birch-plywood'),
  'wood-veneer': r('wood product', 'wood veneer, species unsaid', false, 'wood.birch-plywood'),
  bamboo: r('wood', 'bamboo culm, species unsaid', false, 'wood.birch-plywood'),
  cardboard: r('wood product', 'corrugated board', false),
  paper: r('textile and paper', 'paper, grade unsaid', false),
  abs: r('polymer', 'acrylonitrile butadiene styrene (ABS)', true, 'polymer.pmma'),
  pp: r('polymer', 'polypropylene', true, 'polymer.pmma'),
  pc: r('polymer', 'polycarbonate', true, 'polymer.pmma'),
  pmma: r('polymer', 'polymethyl methacrylate (acrylic)', true, 'polymer.pmma', true),
  nylon: r('polymer', 'polyamide, PA6 or PA66 unsaid', false, 'polymer.nylon-microcarbon'),
  'pa66-gf30': r('composite', 'polyamide 66, 30 % glass filled', true, 'polymer.nylon-microcarbon'),
  pe: r('polymer', 'polyethylene, density grade unsaid', false, 'polymer.pmma'),
  xlpe: r('polymer', 'cross-linked polyethylene', true, 'polymer.pmma'),
  pvc: r('polymer', 'polyvinyl chloride, rigid or flexible unsaid', false, 'polymer.pmma'),
  pom: r('polymer', 'polyoxymethylene (acetal)', true, 'polymer.pmma'),
  ptfe: r('polymer', 'polytetrafluoroethylene', true, 'polymer.pmma'),
  pet: r('polymer', 'polyethylene terephthalate', true, 'polymer.pmma'),
  pbt: r('polymer', 'polybutylene terephthalate', true, 'polymer.pmma'),
  pla: r('polymer', 'polylactic acid', true, 'polymer.pmma'),
  pu: r('polymer', 'polyurethane, solid or elastomeric unsaid', false, 'polymer.pmma'),
  // (no stand-in: the handbook's only thermoset is a filled phenolic billiard ball, whose friction says nothing of this)
  epoxy: r('polymer', 'bisphenol-A epoxy, amine cured', true),
  phenolic: r('polymer', 'phenolic resin (Bakelite type)', true, 'polymer.phenolic', true),
  rubber: r('elastomer', 'rubber, natural or synthetic unsaid', false, 'rubber.natural'),
  nbr: r('elastomer', 'nitrile rubber (NBR)', true, 'rubber.natural'),
  epdm: r('elastomer', 'EPDM rubber', true, 'rubber.natural'),
  silicone: r('elastomer', 'silicone rubber', true, 'rubber.natural'),
  fkm: r('elastomer', 'fluoroelastomer (FKM)', true, 'rubber.natural'),
  foam: r('foam', 'foam, polymer and density unsaid', false, 'foam.eva'),
  glass: r('glass', 'soda-lime glass', true, 'glass.soda-lime', true),
  'glass-wool': r('glass', 'glass wool insulation (E-glass fibre)', true),
  fibreglass: r('composite', 'glass fibre reinforced polymer', false, 'composite.gfrp'),
  'carbon-fibre': r('composite', 'carbon fibre reinforced polymer, layup unsaid', false, 'composite.cfrp'),
  fr4: r('composite', 'FR-4 glass-epoxy laminate', true, 'composite.gfrp'),
  'friction-composite': r('composite', 'semi-metallic brake pad friction material', false),
  brick: r('ceramic', 'fired clay brick', true, 'ceramic.clay-brick', true),
  tile: r('ceramic', 'ceramic tile, body unsaid', false, 'ceramic.clay-brick'),
  ceramic: r('ceramic', 'a technical ceramic, unsaid', false),
  alumina: r('ceramic', 'alumina (Al₂O₃)', true),
  zirconia: r('ceramic', 'yttria-stabilised zirconia', true),
  pzt: r('ceramic', 'lead zirconate titanate (PZT)', true),
  'ntc-ceramic': r('ceramic', 'nickel-manganese spinel thermistor ceramic', true),
  hfo2: r('ceramic', 'hafnium dioxide', true),
  sio2: r('glass', 'silicon dioxide (thermal oxide)', true),
  silicon: r('other metal', 'crystalline silicon', true),
  graphite: r('ceramic', 'graphite', true),
  concrete: r('concrete and mortar', 'concrete, mix and strength class unsaid, plain (no reinforcing said)', false, 'concrete.c30'),
  render: r('concrete and mortar', 'cement render, mix unsaid', false, 'concrete.c30'),
  asphalt: r('concrete and mortar', 'asphalt concrete, mix unsaid', false, 'concrete.c30'),
  granite: r('stone', 'granite', true, 'concrete.c30'),
  marble: r('stone', 'marble', true, 'concrete.c30'),
  cotton: r('textile and paper', 'cotton fibre (loose)', true, 'textile.canvas'),
  silk: r('textile and paper', 'silk', true, 'textile.nylon-ripstop'),
  leather: r('textile and paper', 'leather, tannage unsaid', false, 'leather.veg-tan'),
  water: r('fluid', 'water', true), oil: r('fluid', 'oil, grade unsaid', false), petrol: r('fluid', 'petrol', false), diesel: r('fluid', 'diesel', false),
  acid: r('fluid', 'battery acid (dilute sulfuric acid)', false), 'glycol-50': r('fluid', 'ethylene glycol and water, 50:50', true), ice: r('fluid', 'ice', true),
  soil: r('soil', 'soil, type unsaid', false),
  battery: r('battery', 'a battery, chemistry unsaid', false),
  tissue: r('living tissue', 'soft tissue', false), stingray: r('living tissue', 'a stingray\'s body', false), leaf: r('living tissue', 'leaf', false), foliage: r('living tissue', 'foliage (a crown, mostly air)', false),
  bread: r('food', 'bread', false), cheese: r('food', 'cheese', false), ham: r('food', 'ham', false), tomato: r('food', 'tomato', false), lettuce: r('food', 'lettuce', false), butter: r('food', 'butter', false), chicken: r('food', 'chicken', false), egg: r('food', 'egg', false), avocado: r('food', 'avocado', false), bacon: r('food', 'bacon', false), chocolate: r('food', 'chocolate', false),
};

const handbookById = new Map(HANDBOOK.map((m) => [m.id, m]));
/** The handbook grade a material's numbers come from, and whether it is that material or a stand-in for it. */
export function handbookOf(id: string | undefined): { m: Material; same: boolean } | null {
  const row = id ? MATTER[id] : undefined, m = row?.handbook ? handbookById.get(row.handbook) : undefined;
  return m ? { m, same: !!row!.same } : null;
}
/** A material's density, kg/m³: the table's, else a pure element's from the periodic data. Null where neither knows. */
export function densityOf(id: string): Prop | null {
  const w = WOODS[id], x = MIXES[id];
  if (w) return { key: 'density', name: 'density', value: woodDensity(w), unit: 'kg/m^3', source: `${w.source}: specific gravity ${w.G12}, ρ = 1000 G (1 + 0.12)`, evidence: 'derived' };
  if (x) return { key: 'density', name: 'density', value: mixDensity(x), unit: 'kg/m^3', source: `the mix's parts in its cubic metre, summed (${x.source})`, evidence: 'derived' };
  if (DENSITY[id] !== undefined) return { key: 'density', name: 'density', value: DENSITY[id]!, unit: 'kg/m^3', source: 'mass.ts (typical values)', evidence: 'typical' };
  const el = pureElement(id), d = el ? PERIODIC[el]?.density ?? null : null;
  return el && d ? { key: 'density', name: 'density', value: d, unit: 'kg/m^3', source: `${PERIODIC[el]!.name}: ${PERIODIC_SOURCE}`, evidence: 'secondary' } : null;
}

export interface Matter {
  id: string; is: string; family: Family | 'unknown'; specified: boolean;
  /** Its handbook grade, and whether that is this material or a stand-in. */
  handbook?: { id: string; name: string; same: boolean };
  /** What it is made of: its grade, formula or blend, and down to elements by mass. */
  makeup: { says: string; parts: [string, number][]; elements: Record<string, number> };
  props: Prop[];
  /** Where two of the tables disagree on one property: both kept. */
  disagreements: string[];
  /** For an unspecified material: the span of each property over the specified members of its family here. */
  span?: Record<string, [number, number]>;
}

/** Everything known of a material, with how it is known. */
export function matterOf(id: string): Matter {
  const row = MATTER[id], hb = handbookOf(id), props: Prop[] = [], disagreements: string[] = [];
  const d = densityOf(id); if (d) props.push(d);
  if (hb) {
    const m = hb.m, ev: Evidence = hb.same ? (m.confidence === 'spec' ? 'specified' : m.confidence === 'estimated' ? 'estimated' : 'handbook') : 'stand-in';
    const note = hb.same ? undefined : `as ${m.name}, the nearest grade the handbook holds: not this material's own`;
    const add = (key: string, name: string, value: number, unit: string) => props.push({ key, name, value, unit, source: m.source, evidence: ev, ...(note ? { note } : {}) });
    if (hb.same) { add('E', 'elastic modulus', m.E, 'Pa'); add('nu', 'Poisson\'s ratio', m.nu, '1'); add('yield', 'yield strength', m.yield, 'Pa'); add('ultimate', 'ultimate strength', m.ultimate, 'Pa'); add('elongation', 'elongation at break', m.elongation, '1'); add('conductivity', 'electrical conductivity', m.conductivity, 'S/m'); }
    add('friction', 'friction coefficient', m.friction, '1'); add('restitution', 'restitution', m.restitution, '1');
    if (hb.same) {
      const t = thermalOf(m); props.push({ key: 'c', name: 'specific heat', value: t.c, unit: 'J/kg K', source: t.source, evidence: 'handbook' }, { key: 'k', name: 'thermal conductivity', value: t.k, unit: 'W/m K', source: t.source, evidence: 'handbook' }, { key: 'emissivity', name: 'emissivity', value: t.emissivity, unit: '1', source: t.source, evidence: 'handbook' });
      const f = FUSION[m.id]; if (f) { if (f.melts !== null) props.push({ key: 'melts', name: 'solidus', value: f.melts + 273.15, unit: 'K', source: f.source, evidence: 'handbook' }); props.push({ key: 'alpha', name: 'thermal expansion', value: f.alpha, unit: '1/K', source: f.source, evidence: 'handbook' }); }
      if (d && Math.abs(m.density - d.value) > 0.02 * m.density) disagreements.push(`density: ${d.value} kg/m³ typical (mass.ts), ${m.density} kg/m³ in the handbook (${m.name})`);
    }
  }
  const w = WOODS[id];
  // (a species' heat from its specific gravity by the Wood Handbook's own relations: across the grain, at 12 % moisture)
  if (w) { const t = woodThermal(w.G12); props.push({ key: 'c', name: 'specific heat', value: t.c, unit: 'J/kg K', source: `${t.source}; from its specific gravity ${w.G12}`, evidence: 'derived' }, { key: 'k', name: 'thermal conductivity (across the grain)', value: t.k, unit: 'W/m K', source: `${t.source}; from its specific gravity ${w.G12}`, evidence: 'derived', note: 'across the grain; along it 1.5 to 2.8 times as much (Wood Handbook ch. 4)' }); }
  if (w) props.push({ key: 'E', name: 'modulus of elasticity (bending, along the grain)', value: w.MOE, unit: 'Pa', source: w.source, evidence: 'handbook', note: 'small clear specimens: lumber of a grade is less' }, { key: 'ultimate', name: 'modulus of rupture (bending, along the grain)', value: w.MOR, unit: 'Pa', source: w.source, evidence: 'handbook', note: 'small clear specimens: lumber of a grade is less' });
  const el = pureElement(id);
  if (el && PERIODIC[el]?.melt) props.push({ key: 'melts', name: 'melting point', value: PERIODIC[el]!.melt!, unit: 'K', source: `${PERIODIC[el]!.name}: ${PERIODIC_SOURCE}`, evidence: 'secondary' });
  const out: Matter = {
    id, is: row?.is ?? (COMPOSITION[id] ? makeupSays(id) : id), family: row?.family ?? 'unknown', specified: row?.specified ?? false,
    ...(hb ? { handbook: { id: hb.m.id, name: hb.m.name, same: hb.same } } : {}),
    makeup: { says: COMPOSITION[id] ? makeupSays(id) : '', parts: makeup(id), elements: elementsOf(id) }, props, disagreements,
  };
  if (!out.specified && row) {
    const members = Object.keys(MATTER).filter((k) => MATTER[k]!.family === row.family && MATTER[k]!.specified && k !== id), span: Record<string, [number, number]> = {};
    for (const k of members) for (const p of matterOf(k).props) { if (p.evidence === 'stand-in') continue; const s = span[p.key]; span[p.key] = s ? [Math.min(s[0], p.value), Math.max(s[1], p.value)] : [p.value, p.value]; }
    if (Object.keys(span).length) out.span = span;
  }
  return out;
}

/** What a material is, in a line: specified or not, and how its numbers are known. */
export function matterSays(id: string): string {
  const m = matterOf(id);
  return `${m.is}${m.specified ? '' : ' (unspecified: only its family is known)'}${m.handbook ? `; its numbers ${m.handbook.same ? 'from the handbook' : `stand in from ${m.handbook.name}`}` : ''}`;
}

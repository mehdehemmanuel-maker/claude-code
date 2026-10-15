// Every part through the same laws. What a thing is made of by mass gives its density (volumes add: the mixing law over
// each part's partial specific volume), its mass and density give its volume, its size gives the ellipsoid it fills, and
// so how full of matter its box is; what it burns gives the oxygen it takes a second and so, by Hill's diffusion limit,
// whether it could live without vessels. Nothing here is said of one tissue: the same laws run for a cell, an organ, a
// body, a steel bracket or a tree, and each number comes with the tree of laws and measurements it rests on.

import { INVENTORY, gramsOfItem, type Item } from '../parts/inventory';
import { MOLECULES } from '../life/molecules';
import { wattsOf } from '../life/time';
import { breakdown, estimate, fixed, measured, readable, says, solve, step, valueIn } from './record';
import { inTime, answersToPort } from './time';
import { BOOK } from '../book';
import { dimOf, dimText } from '../lang/dimension';
import { fromSI } from '../../ganglia/units';
import { leaf } from '../lang/term';
import { boxShape } from './boxfill';
import { ofLeaf, type Derivation } from '../lang/evaluate';

/** A density, kg/m³, with where it is from: for what is dissolved or packed in a cell, its partial specific volume's
 *  inverse (the volume a gram of it adds to water), which is what adds. */
interface Dens { kg: number; label: string; why: string; est?: boolean }
const D = (kg: number, label: string, why: string, est = false): Dens => ({ kg, label, why, est });
const COHN = 'its partial specific volume in water (Cohn & Edsall, Proteins, Amino Acids and Peptides, Reinhold 1943)';
const MILLERO = 'from its partial molar volume at infinite dilution in water (Millero 1971, Chem Rev 71:147)';
const HANDBOOK = 'typical handbook density (CRC Handbook of Chemistry and Physics, 97th ed.; MatWeb for alloys and polymers)';
const BY_ID: Record<string, Dens> = {
  water: D(993.3, 'water', 'water at 37 °C (IAPWS-95)'),
  triglyceride: D(900.7, 'fat', 'human fat at 36 °C: 0.9007 g/ml (Fidanza, Keys & Anderson 1953, the two-compartment model\'s fat density)'),
  cholesterol: D(1067, 'cholesterol', 'crystalline cholesterol (CRC Handbook)'), 'wax-ester': D(960, 'wax', 'beeswax and wax esters about 0.96 g/ml (CRC Handbook)'),
  keratin: D(1310, 'keratin', 'human hair at its regain about 1.31 g/ml (Robbins, Chemical and Physical Behavior of Human Hair, 5th ed., Springer 2012)'),
  collagen: D(1410, 'collagen', 'dry collagen fibrils about 1.41 g/ml (estimate from tendon and dentin measurements)', true),
  hydroxyapatite: D(3160, 'bone mineral', 'hydroxyapatite crystal 3.16 g/ml (Elliott, Structure and Chemistry of the Apatites, Elsevier 1994)'),
  magnetite: D(5175, 'magnetite', 'magnetite crystal 5.17 g/ml (CRC Handbook)'), aragonite: D(2930, 'aragonite', 'aragonite crystal 2.93 g/ml (CRC Handbook)'), biosilica: D(2050, 'biogenic silica', 'diatom opal about 2.0–2.1 g/ml (an estimate)', true),
  nacl: D(3520, 'NaCl in solution', `NaCl ${MILLERO}: 16.6 ml/mol`), kcl: D(2780, 'KCl in solution', `KCl ${MILLERO}: 26.8 ml/mol`), 'hydrochloric-acid': D(2050, 'HCl in solution', `HCl ${MILLERO}: 17.8 ml/mol`),
  'sodium-bicarbonate': D(3620, 'bicarbonate in solution', `NaHCO₃ ${MILLERO}: 23.2 ml/mol`), 'calcium-chloride': D(6200, 'CaCl₂ in solution', `CaCl₂ ${MILLERO}: 17.9 ml/mol`), 'magnesium-chloride': D(6570, 'MgCl₂ in solution', `MgCl₂ ${MILLERO}: 14.5 ml/mol`),
  cellulose: D(1500, 'cellulose', 'cellulose fibre 1.50–1.55 g/ml (CRC Handbook)'), chitin: D(1425, 'chitin', 'chitin about 1.42 g/ml (an estimate from insect cuticle)', true), lignin: D(1350, 'lignin', 'lignin about 1.35 g/ml (an estimate)', true), starch: D(1500, 'starch', 'starch granules 1.5 g/ml (CRC Handbook)'),
  polyisoprene: D(920, 'natural rubber', 'natural rubber 0.92 g/ml (CRC Handbook)'), melanin: D(1600, 'melanin', 'eumelanin granules about 1.6 g/ml (an estimate)', true), dna: D(1818, 'nucleic acid', `DNA ${COHN}: 0.55 ml/g`), rna: D(1887, 'nucleic acid (RNA)', `RNA ${COHN}: 0.53 ml/g`),
  'oxygen-gas': D(1000, 'dissolved gas', 'dissolved O₂ adds about as much volume as its mass of water (an estimate)', true), methane: D(1000, 'dissolved gas', 'an estimate', true),
};
const BY_GROUP: [RegExp, Dens][] = [
  [/Proteins/, D(1370, 'protein', `protein ${COHN}: 0.73 ml/g`)],
  [/Lipids/, D(1020, 'membrane lipid', 'phospholipids in bilayers about 0.98 ml/g (an estimate)', true)],
  [/Sugars|Walls/, D(1600, 'sugar', 'sugars and polysaccharides in solution about 0.62 ml/g (Cohn & Edsall 1943)')],
  [/Nucleic/, D(1818, 'nucleic acid', `DNA ${COHN}: 0.55 ml/g`)],
  [/Salts/, D(3000, 'salt in solution', 'salts in solution about 0.33 ml/g (an estimate from Millero 1971)', true)],
  [/Biominerals/, D(2900, 'mineral', 'biominerals 2.0–5.2 g/ml (an estimate)', true)],
  [/Small molecules|Neurotransmitters|Hormones|Pigments|Antibiotics|Resins/, D(1330, 'small organic', 'a typical organic solute adds about 0.75 ml/g (urea 0.745, Cohn & Edsall 1943)')],
];
const ENGINEERED: Record<string, number> = {
  'steel-low': 7850, 'steel-alloy': 7850, 'steel-spring': 7850, 'steel-chrome': 7830, 'steel-tool': 7800, 'steel-hss': 8100, 'steel-electrical': 7650, 'stainless-304': 8000, kovar: 8360, 'stainless-316': 8000, 'cast-iron': 7200, iron: 7874,
  'al-6061': 2700, 'al-6063': 2690, 'al-7075': 2810, 'al-2024': 2780, 'al-5052': 2680, 'al-a380': 2710, 'al-foil': 2700, 'al-4043': 2690, 'al-5356': 2640, copper: 8960, 'copper-foil': 8960, brass: 8500, bronze: 8800, 'phosphor-bronze': 8860,
  nickel: 8908, tin: 7265, zinc: 7140, gold: 19320, silver: 10490, lead: 11340, tungsten: 19250, 'ti-6al4v': 4430, platinum: 21450, chromium: 7190, lithium: 534, zamak: 6600, 'tungsten-carbide': 15600,
  pla: 1240, abs: 1050, nylon: 1140, pom: 1410, pc: 1200, pbt: 1310, pp: 905, pe: 950, pvc: 1380, pmma: 1180, ptfe: 2200, peek: 1300, ps: 1050, pet: 1380, asa: 1070, silicone: 1100, rubber: 920, nbr: 1000, neoprene: 1230, epdm: 860, fkm: 1800, epoxy: 1200, phenolic: 1300, pu: 1200, eva: 940,
  fr4: 1850, cfrp: 1600, fibreglass: 1900, glass: 2500, borosilicate: 2230, bk7: 2510, quartz: 2650, silicon: 2329, alumina: 3950, zirconia: 6000, sic: 3210, si3n4: 3200, mica: 2800, graphite: 2200, ndfeb: 7500, 'ferrite-hard': 4900, 'ferrite-soft': 4800,
  concrete: 2400, granite: 2700, marble: 2710, slate: 2800, brick: 1900, gypsum: 2320, wood: 600, 'wood-veneer': 650, paper: 800, oil: 870, grease: 900,
};
/** The density a material adds where it is, or nothing known. */
export function densityOfMaterial(id: string): Dens | null {
  const b = BY_ID[id]; if (b) return b;
  const e = ENGINEERED[id]; if (e) return D(e, INVENTORY.get(id)?.name ?? id, HANDBOOK);
  const mo = MOLECULES.find((m) => m.id === id);
  if (mo && 'formula' in mo.spec) { if ((mo.da ?? 0) > 2000 && /Hormones/.test(mo.group)) return BY_GROUP[0]![1]; for (const [re, d] of BY_GROUP) if (re.test(mo.group)) return d; }
  return null;
}
/** A raw formula in a blend (a wax's alkane), by what it is made of. */
const formulaDens = (f: string): Dens => (/^C\d*H\d*$/.test(f) || /^C\d+H\d+O2$/.test(f) ? D(900, 'lipid', 'hydrocarbons and fatty acids about 0.9 g/ml (an estimate)', true) : D(1330, 'small organic', 'a typical organic solute adds about 0.75 ml/g (an estimate)', true));

const shareMemo = new Map<string, Map<Dens, number> | null>();
/** What a thing is, by mass, down to materials whose density is known (into blends where they are not): each density
 *  with its share of the thing's mass. */
export function densityShares(id: string, seen = new Set<string>()): Map<Dens, number> | null {
  if (shareMemo.has(id)) return shareMemo.get(id)!;
  if (seen.has(id)) return null;
  const s2 = new Set(seen).add(id), out = new Map<Dens, number>();
  const add = (m: Map<Dens, number>, w: number) => { for (const [d, f] of m) out.set(d, (out.get(d) ?? 0) + w * f); };
  const own = densityOfMaterial(id);
  if (own) out.set(own, 1);
  else {
    const mo = MOLECULES.find((m) => m.id === id), i = INVENTORY.get(id);
    if (mo && 'blend' in mo.spec) { const t = mo.spec.blend.reduce((a, [, p]) => a + p, 0); for (const [part, p] of mo.spec.blend) { const sub = densityShares(part, s2) ?? (/^[A-Z]/.test(part) ? new Map([[formulaDens(part), 1]]) : null); if (sub) add(sub, p / t); } }
    else if (i && i.kind !== 'material' && i.kind !== 'element') {
      const parts: [string, number][] = [];
      for (const c of i.of) { const ci = INVENTORY.get(c.id); if (!ci) continue; const g = i.mass?.[c.id] ?? (gramsOfItem(ci) ?? NaN) * c.n; if (g > 0) parts.push([c.id, g]); }
      const all = parts.reduce((a, [, g]) => a + g, 0);
      if (all > 0) for (const [cid, g] of parts) { const sub = densityShares(cid, s2); if (sub) add(sub, g / all); }
      else {
        // NO MASSES KNOWN, and that used to end the matter: the shares came out NaN and the whole density went
        // null — so a brass gear reported no density at all while brass sat right there at 8500 kg/m^3. Two cases
        // need no masses to be exact, and both are taken rather than refused:
        //   ONE CONSTITUENT      its density IS the thing's density; there is nothing to weight.
        //   ALL THE SAME DENSITY  the mixing law returns that density whatever the shares are.
        // Anything else — several materials, unknown proportions — stays unknown, because a guess at the shares
        // would be a guess at the answer, and `know` reporting "must be measured" is the honest result.
        const subs = i.of.map((c) => densityShares(c.id, s2)).filter(Boolean) as Map<Dens, number>[];
        if (subs.length === 1 && i.of.length === 1) add(subs[0]!, 1);
        else if (subs.length === i.of.length && subs.length > 1) {
          const kgs = new Set(subs.flatMap((m) => [...m.keys()].map((d) => d.kg)));
          if (kgs.size === 1) add(subs[0]!, 1);
        }
      }
    }
  }
  const total = [...out.values()].reduce((a, b) => a + b, 0);
  const res = total > 0.5 ? new Map([...out].map(([d, f]) => [d, f / total] as [Dens, number])) : null;
  shareMemo.set(id, res);
  return res;
}

/** A thing's density by the mixing law, folded over its parts' densities from the heaviest share down. */
export function densityOf(id: string): Derivation | null {
  const sh = densityShares(id); if (!sh) return null;
  const by = new Map<string, { d: Dens; f: number }>();
  for (const [d, f] of sh) { const k = `${d.label}|${d.kg}`; const h = by.get(k); if (h) h.f += f; else by.set(k, { d, f }); }
  const parts = [...by.values()].filter((p) => p.f > 1e-6).sort((a, b) => b.f - a.f);
  const rec = (p: { d: Dens }) => (p.d.est ? estimate(`density of its ${p.d.label}`, p.d.kg, 'kg/m^3', p.d.why) : measured(`density of its ${p.d.label}`, p.d.kg, 'kg/m^3', p.d.why));
  let acc = rec(parts[0]!), w = parts[0]!.f;
  for (const p of parts.slice(1)) {
    const total = w + p.f;
    acc = step('mixing.density', { w: estimateShare(w / total, `its ${parts.slice(0, parts.indexOf(p)).map((x) => x.d.label).join(', ')} over that and its ${p.d.label}`), rho1: acc, rho2: rec(p) }, parts.indexOf(p) === parts.length - 1 ? `density of ${INVENTORY.get(id)?.name ?? id}` : 'density so far');
    w = total;
  }
  return acc;
}
const estimateShare = (x: number, of: string) => ofLeaf(leaf(`mass share: ${of}`, x, '-', { class: 'configuration', source: 'its make-up by mass (the life tables, each part from its source)' }));

/** What one weighs, as a record. */
export function massOf(id: string): Derivation | null {
  const i = INVENTORY.get(id); const g = i ? gramsOfItem(i) : null; if (!i || !g) return null;
  return ofLeaf(leaf(`mass of ${i.name}`, g, 'g', { class: 'configuration', source: i.path[0] === 'Life' ? 'the sum of its parts (the life tables, each part from its source)' : 'the inventory (its parts or its maker)' }));
}

export interface Profile {
  id: string; name: string; mass: Derivation; density: Derivation | null; volume: Derivation | null; box: Derivation | null;
  /** its volume over its shape's (what its size and kind of shape hold) */ fill: number | null;
  power: Derivation | null; oxygen: { demand: Derivation; reach: Derivation; halfThickness: number; needsVessels: boolean } | null;
}
/** The shape a look draws and the share of its box it fills (src/nexus/substrate/boxfill.ts). */
export const shapeOf = boxShape;
/** Every part, through the same laws. */
export function profile(id: string): Profile | null {
  const i = INVENTORY.get(id), mass = massOf(id); if (!i || !mass) return null;
  const density = densityOf(id);
  const volume = density ? solve('mass.volume', 'V', { m: mass, rho: density }, `volume of ${i.name}`) : null;
  const sz = i.size, shape = shapeOf(i.look, sz), one = sz ? step('volume.of-box', { phi: fixed(`a ${shape.name}'s share of its box`, shape.phi, '-', `geometry: a ${shape.name} fills ${shape.says} of the box round it`), a: measured('length', sz[0], 'mm', `its size (${i.path.join('/')})`), b: measured('width', sz[1], 'mm', 'its size'), c: measured('height', sz[2], 'mm', 'its size') }, `the ${shape.name} its size makes`) : null;
  const box = one && i.members ? step('total.volume', { n: fixed('its members', i.members, '-', `a set of ${i.members} like members, each its size`), V1: one }, `the ${i.members} ${shape.name}s its size makes`) : one;
  const fill = volume?.value && box?.value ? volume.value / box.value : null;
  const w = i.path[0] === 'Life' ? wattsOf(id) : 0;
  const power = w > 0 ? ofLeaf(leaf(`resting power of ${i.name}`, w, 'W', { class: 'configuration', source: 'its tissues\' masses times their resting rates (Elia 1992: liver 200, brain 240, heart and kidney 440, muscle 13, fat 4.5, the rest 12 kcal/kg/day)' })) : null;
  let oxygen: Profile['oxygen'] = null;
  if (power && volume?.value && sz) {
    const demand = step('reaction.rate-from-power', { P: power, V: volume, dH: measured('energy a mole of O₂ burnt', 4.5e5, 'J/mol', 'mixed fuel 440–470 kJ a mole of O₂ (Brouwer 1957: 20.1 kJ a litre)') }, 'oxygen it burns a volume');
    const C = step('henry.solubility', { p: estimate('O₂ pressure in tissue', 5, 'kPa', 'tissue pO₂ typically 3–6 kPa (an estimate)'), kH: measured('Henry constant of O₂ in plasma at 37 °C', 96280, 'Pa m^3/mol', 'from O₂\'s solubility in plasma, 0.0031 ml a decilitre a mmHg (Nunn\'s Applied Respiratory Physiology)') }, 'O₂ dissolved in tissue');
    const reach = step('diffusion.sphere-limit', { D: estimate('diffusivity of O₂ in tissue', 2e-9, 'm^2/s', 'O₂ in tissue at 37 °C 1.5–2.5 × 10⁻⁹ m²/s (an estimate)'), C, q: demand }, 'the largest it could be fed by diffusion alone');
    const half = Math.min(...sz) / 2000;
    oxygen = { demand, reach, halfThickness: half, needsVessels: reach.value !== null && half > reach.value };
  }
  return { id, name: i.name, mass, density, volume, box, fill, power, oxygen };
}
/** A profile to read, with each number's breakdown. */
export function profileLines(id: string, deep = false): string[] {
  const p = profile(id); if (!p) return [];
  const out = [`${p.name}:`, `  ${says(p.mass)}`];
  const tree = (d: Derivation | null) => { if (!d) return; if (deep) out.push(...breakdown(d, 2)); else out.push(`  ${says(d)}`); };
  tree(p.density); tree(p.volume);
  if (p.fill !== null) out.push(`  it fills ${(p.fill * 100).toFixed(0)} % of the ${shapeOf(INVENTORY.get(id)?.look, INVENTORY.get(id)?.size).name} its size makes${p.fill > 1.1 ? ' — more than can fit: its size or its mass is wrong' : p.fill < 0.05 ? ' — its box is far bigger than it (a sheet, a branching tree, or a loose size)' : ''}`);
  if (p.power) out.push(`  ${says(p.power)}`);
  if (p.oxygen) { const r = valueIn(p.oxygen.reach, 'mm')!; out.push(`  fed by diffusion alone it could be ${+r.toPrecision(3)} mm in radius; it is ${+(p.oxygen.halfThickness * 1000).toPrecision(3)} mm at its thinnest — ${p.oxygen.needsVessels ? 'so it needs vessels' : 'so diffusion is enough'}`); if (deep) out.push(...breakdown(p.oxygen.reach, 2)); }
  return out;
}
/** What the same laws find wrong across the inventory: things fuller than their size can hold, or whose make-up gives
 *  no density. */
export function profileFaults(ids: Iterable<string> = INVENTORY.keys()): { id: string; says: string }[] {
  const out: { id: string; says: string }[] = [];
  for (const id of ids) {
    const i = INVENTORY.get(id); if (!i || i.kind === 'material' || i.kind === 'element' || i.path[0] !== 'Life') continue;
    const p = profile(id); if (!p || p.fill === null) continue;
    if (p.fill > 1.15) out.push({ id, says: `${i.name}: ${(p.fill * 100).toFixed(0)} % of its ${shapeOf(i.look, i.size).name} (${says(p.volume!, 'mL')} in ${i.members ? `${i.members} boxes of` : 'a'} ${i.size!.join('×')} mm)` });
  }
  return out;
}
export type { Item };

/* ───────────────── the one hierarchy: a part, its quantities, the laws that give them, and time ───────────────── */
//
// THE USER'S STRUCTURE, in their words (2026-10-15): "the law system should follow the same system as parts the sub
// system all system all the way down to the core and then look they both would meet at time", and: "everything
// exists on the graph all possibilities exist just like a calculator all the laws are there but it only gets
// calculated when typed".
//
// Both halves of this project are the same shape, and until now they were two:
//
//   A PART decomposes into sub-parts, down and down, until it bottoms out at a material.
//   A QUANTITY decomposes into the quantities its law needs, down and down, until it bottoms out at a measurement.
//
// They are one tree, and they MEET AT TIME: a part's property is a quantity, a quantity is given by a law, and every
// law reduces to a power of time (`substrate/time.ts`). So `know` below is one recursive resolver over one tree, and
// `placeOf` says where on time's own tree any answer it gives sits.
//
// NOTHING IS COMPUTED UNTIL IT IS ASKED FOR. There is no sweep and no pass that fills anything in: every quantity of
// every part is already a node here by virtue of the laws and the inventory existing, and asking is what evaluates
// one — memoised, so asking twice costs nothing, and cycle-guarded, so a quantity that would need itself is refused
// rather than recursed into.
//
// AND A QUANTITY REACHED TWO WAYS MUST AGREE. This is the part that makes the structure load-bearing instead of
// decorative. A bearing's density can be had from the mixing law over what it is made of, and again from its mass
// over its volume. Physics does not permit those to differ. Where they do, the DATA is wrong — and `clashes` says so
// with both routes and both numbers, rather than quietly taking whichever was computed first.

/** What is known about one quantity of one thing, and how. */
export interface Fact {
  thing: string; quantity: string;
  value: number; unit: string;
  /** where this answer sits on time's tree */ power: number;
  /** the route: a law, the inventory, or a decomposition over its parts */ how: string;
  /** the full tree down to every measurement; `breakdown` reads it */ d: Derivation;
  /** other routes that reached the same answer, and agreed */ alsoBy: { how: string; value: number }[];
  says: string;
}

/** Two routes to one quantity that do NOT agree: a fact about the data, not about the world. */
export interface Clash {
  thing: string; quantity: string; unit: string;
  routes: { how: string; value: number }[];
  /** the spread as a fraction of the larger */ spread: number;
  says: string;
}

const AGREE = 0.02;                                  // two routes agree inside 2%: tighter than the data deserves
const knowMemo = new Map<string, Fact | null>();
const clashLog = new Map<string, Clash>();

/** Does this law's output answer to the quantity being asked for? One name test, owned by `time.ts`. */
const answersTo = (quantity: string, port: { name: string; sym: string }) =>
  answersToPort({ name: quantity, d: { name: quantity } }, port);

/** The leaves: what the inventory itself states about a thing, with no law involved. */
function stated(id: string, quantity: string): { value: number; unit: string; how: string; d: Derivation } | null {
  const i = INVENTORY.get(id); if (!i) return null;
  const q = quantity.toLowerCase();
  if (/^mass$|^weight$/.test(q)) {
    const m = massOf(id);
    return m ? { value: m.value!, unit: m.unit, how: 'the inventory (its own mass, or the sum of its parts)', d: m } : null;
  }
  if (/densit/.test(q)) {
    const dd = densityOf(id);
    return dd ? { value: dd.value!, unit: dd.unit, how: 'the mixing law over what it is made of, down to materials', d: dd } : null;
  }
  if (/^volume$/.test(q) && i.size) {
    // A BOUNDING BOX IS NOT A VOLUME, and saying so is the point. This is an upper bound on a solid part and a wild
    // one on a bracket, which is exactly why it is recorded as an estimate with its grounds — and why the density
    // it implies will disagree with the density from its materials, and `clashes` will say so.
    const [x, y, z] = i.size;
    return { value: (x / 1000) * (y / 1000) * (z / 1000), unit: 'm^3',
      how: 'its overall size, as a box: an UPPER BOUND, not the solid volume',
      d: estimate(`volume of ${i.name}`, (x / 1000) * (y / 1000) * (z / 1000), 'm^3',
        `its stated size ${x}×${y}×${z} mm taken as a box, so a solid part is over-stated and an open one wildly so`) };
  }
  if (/extent|length|breadth|width|depth|height|diameter/.test(q) && i.size) {
    // WHICH extent. `extent y` and `extent z` both used to fall through to the first one, so `mass.prism` was fed
    // 10×10×10 for a 10×10×3 gear and came out 8.5 g against the true 2.55 g — a 3.3× error that looked like a
    // working answer. An axis answersToPort in the quantity wins; failing that, breadth/width is the second and
    // depth/height the third, which is how the book's own prism laws name them.
    const k = /\bx\b/.test(q) ? 0 : /\by\b/.test(q) ? 1 : /\bz\b/.test(q) ? 2
      : /breadth|width/.test(q) ? 1 : /depth|height|thick/.test(q) ? 2 : 0;
    return { value: i.size[k]! / 1000, unit: 'm', how: `its stated size (${['first', 'second', 'third'][k]} extent)`,
      d: measured(`${quantity} of ${i.name}`, i.size[k]! / 1000, 'm', 'the inventory (its stated size, mm)') };
  }
  return null;
}

/** EVERY ROUTE to one quantity of one thing: what the inventory states, and every law whose output is that quantity
 *  and whose every input is itself knowable about the same thing. Recursion is depth-capped and cycle-guarded. */
function routesTo(id: string, quantity: string, seen: ReadonlySet<string>, depth: number): { how: string; value: number; unit: string; d: Derivation }[] {
  const out: { how: string; value: number; unit: string; d: Derivation }[] = [];
  const own = stated(id, quantity);
  if (own) out.push(own);
  if (depth <= 0) return out;
  for (const l of BOOK) {
    if (!answersTo(quantity, l.output)) continue;
    const env: Record<string, Derivation> = {};
    let ok = true;
    for (const p of l.inputs) {
      const sub = know(id, p.name, seen, depth - 1);          // the law's input is itself a quantity OF THIS THING
      if (!sub) { ok = false; break; }
      env[p.sym] = sub.d;
      }
    if (!ok) continue;
    let d: Derivation;
    try { d = step(l.id, env); } catch { continue; }
    if (d.value === null) continue;
    out.push({ how: `${l.id} (${l.name})`, value: d.value, unit: l.output.unit, d });
  }
  return out;
}

/** WHAT IS KNOWN about one quantity of one thing — resolved on demand, never before. Returns null where the book
 *  and the inventory together cannot reach it, which is an answer: it says the quantity must be measured. */
export function know(thing: string, quantity: string, seen: ReadonlySet<string> = new Set(), depth = 3): Fact | null {
  const key = `${thing}|${quantity.toLowerCase()}|${depth}`;
  if (knowMemo.has(key)) return knowMemo.get(key)!;
  const guard = `${thing}|${quantity.toLowerCase()}`;
  if (seen.has(guard)) return null;                            // it would need itself: refuse, do not recurse
  knowMemo.set(key, null);                                     // claim it first, so a cycle through another name stops
  const routes = routesTo(thing, quantity, new Set(seen).add(guard), depth);
  if (!routes.length) { knowMemo.set(key, null); return null; }

  // every route is in the same unit by construction (the laws' output units), so compare in SI
  const best = routes[0]!;
  const others = routes.slice(1);
  const spread = routes.length < 2 ? 0
    : (Math.max(...routes.map((r) => Math.abs(r.value))) - Math.min(...routes.map((r) => Math.abs(r.value))))
      / Math.max(...routes.map((r) => Math.abs(r.value)) ) || 0;
  if (routes.length > 1 && spread > AGREE) {
    const clash: Clash = { thing, quantity, unit: best.unit, spread,
      routes: routes.map((r) => ({ how: r.how, value: r.value })),
      says: `${thing}'s ${quantity} comes out ${(spread * 100).toFixed(0)}% apart by different routes — ${routes.map((r) => `${readable(fromSI(r.value, best.unit))} ${best.unit} by ${r.how}`).join(' · ')}. Physics does not allow that, so one of the inputs is wrong.` };
    clashLog.set(`${thing}|${quantity}`, clash);
  }
  const fact: Fact = { thing, quantity, value: best.value, unit: best.unit,
    power: inTime(dimOf(best.unit)), how: best.how, d: best.d,
    alsoBy: others.filter((o) => Math.abs(o.value - best.value) <= AGREE * Math.max(Math.abs(o.value), Math.abs(best.value))).map((o) => ({ how: o.how, value: o.value })),
    says: `${quantity} of ${thing} = ${readable(fromSI(best.value, best.unit))} ${best.unit}  [time^${inTime(dimOf(best.unit))}, by ${best.how}]` };
  knowMemo.set(key, fact);
  return fact;
}

/** Every disagreement found while resolving: ask for things first, then read this. A clash is a flaw in the DATA. */
export const clashes = (): Clash[] => [...clashLog.values()].sort((a, b) => b.spread - a.spread);

/** Where an answer sits on time's own tree, for any quantity this resolver returned. */
export const onTimesTree = (f: Fact): string[] => ['time', `time^${f.power}`, dimText(dimOf(f.unit)), f.quantity];

// Every part through the same laws. What a thing is made of by mass gives its density (volumes add: the mixing law over
// each part's partial specific volume), its mass and density give its volume, its size gives the ellipsoid it fills, and
// so how full of matter its box is; what it burns gives the oxygen it takes a second and so, by Hill's diffusion limit,
// whether it could live without vessels. Nothing here is said of one tissue: the same laws run for a cell, an organ, a
// body, a steel bracket or a tree, and each number comes with the tree of laws and measurements it rests on.

import { INVENTORY, gramsOfItem, sizeOf, type Item } from '../parts/inventory';
import { MOLECULES } from '../life/molecules';
import { wattsOf } from '../life/time';
import { breakdown, estimate, fixed, measured, readable, setting as settingOf, says, solve, step, valueIn } from './record';
import { inTime } from './time';
import { QUANTITY_KINDS, plain, portFit } from '../book/quantities';
import { BOOK } from '../book';
import { dimOf, dimText, type Dim } from '../lang/dimension';
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
/** WHAT A MATERIAL IS MEASURED FOR, BEYOND ITS DENSITY. The form `packet` derives asks for these: a thermal
 *  conductivity unlocks 2 laws and a specific heat 2 more, and until a material carries them those laws cannot run
 *  for anything made of it. One row per material, `[thermal conductivity W/m K, specific heat J/kg K]`, at room
 *  temperature. TYPICAL HANDBOOK VALUES, not measurements of a particular batch: a grade's conductivity moves with
 *  its temper and its temperature, and the figure here is the one a handbook quotes for the grade (CRC Handbook of
 *  Chemistry and Physics, 97th ed.; MatWeb for alloys and polymers; ASHRAE for the building materials). Good to
 *  about a tenth, which is enough to size a heat path and not enough to certify one.
 *  A part made of the material inherits both, which is what a material property MEANS and is why `holdsAsMaterial`
 *  finds them invariant under geometry: for an inherited quantity that invariance is by construction, so the test
 *  with teeth there is the other one — whether the numbers actually differ from material to material. They do. */
const PROPS: Record<string, [number, number]> = {
  'steel-low': [50, 490], 'steel-alloy': [42, 475], 'steel-spring': [46, 480], 'steel-chrome': [46, 475],
  'steel-tool': [24, 460], 'steel-hss': [19, 420], 'steel-electrical': [25, 490], 'stainless-304': [16.2, 500],
  'stainless-316': [16.3, 500], kovar: [17, 440], 'cast-iron': [53, 460], iron: [80.4, 449],
  'al-6061': [167, 896], 'al-6063': [201, 900], 'al-7075': [130, 960], 'al-2024': [121, 875], 'al-5052': [138, 880],
  'al-a380': [96, 963], 'al-foil': [237, 897], 'al-4043': [165, 900], 'al-5356': [116, 900],
  copper: [401, 385], 'copper-foil': [401, 385], brass: [120, 380], bronze: [60, 380], 'phosphor-bronze': [69, 380],
  nickel: [90.7, 445], tin: [66.6, 228], zinc: [116, 390], gold: [318, 129], silver: [429, 235], lead: [35.3, 128],
  tungsten: [173, 134], 'ti-6al4v': [6.7, 526], platinum: [71.6, 133], chromium: [93.9, 449], lithium: [84.8, 3582],
  zamak: [113, 419], 'tungsten-carbide': [85, 240],
  pla: [0.13, 1800], abs: [0.17, 1400], nylon: [0.25, 1700], pom: [0.31, 1500], pc: [0.20, 1200], pbt: [0.29, 1300],
  pp: [0.17, 1920], pe: [0.40, 2300], pvc: [0.17, 900], pmma: [0.19, 1470], ptfe: [0.25, 1000], peek: [0.25, 1340],
  ps: [0.14, 1300], pet: [0.24, 1000], asa: [0.17, 1400], silicone: [0.20, 1300], rubber: [0.15, 1900],
  nbr: [0.25, 1500], neoprene: [0.19, 1700], epdm: [0.25, 1900], fkm: [0.21, 1500], epoxy: [0.20, 1000],
  phenolic: [0.25, 1400], pu: [0.20, 1800], eva: [0.34, 2300],
  fr4: [0.30, 1100], cfrp: [7.0, 800], fibreglass: [0.30, 1000], glass: [1.0, 840], borosilicate: [1.14, 830],
  bk7: [1.11, 858], quartz: [1.38, 740], silicon: [149, 705], alumina: [30, 880], zirconia: [2.0, 400],
  sic: [120, 690], si3n4: [30, 700], mica: [0.71, 880], graphite: [120, 710], ndfeb: [9, 460],
  'ferrite-hard': [4.0, 800], 'ferrite-soft': [4.0, 750],
  concrete: [1.7, 880], granite: [2.8, 790], marble: [2.8, 880], slate: [2.0, 760], brick: [0.72, 840],
  gypsum: [0.17, 1090], wood: [0.15, 1600], 'wood-veneer': [0.15, 1600], paper: [0.05, 1340], oil: [0.145, 1900],
  grease: [0.16, 1900], water: [0.606, 4182],
};
/** these conduct differently along the fibre than across it, so one number cannot be read as isotropic */
const ANISOTROPIC = new Set(['cfrp', 'graphite', 'wood', 'wood-veneer', 'fibreglass', 'fr4', 'paper', 'mica']);
const COLUMNS: { match: RegExp; i: 0 | 1; unit: string; name: string }[] = [
  { match: /^thermal conductivity$/, i: 0, unit: 'W/m K', name: 'thermal conductivity' },
  { match: /^specific heat$/, i: 1, unit: 'J/kg K', name: 'specific heat' },
];

/** WHAT THE SETTING GIVES EVERY THING IN IT, the same number whatever the thing is made of.
 *  This is NOT a human category asserted over a derivation. The sameness IS the measurement, and it is the
 *  strongest one in physics: every material falls at the same rate, held to about one part in 10^15 by the Eötvös
 *  torsion-balance experiments and their successors. So when `holdsAsMaterial` asks every material for its gravity
 *  and all 22 answer 9.80665 m/s², test one returns `same for every material` — a quantity that cannot tell brass
 *  from nylon tells you nothing about either, and on that ground, and only that ground, gravity is not a property
 *  of the stuff here.
 *  IT IS FALSIFIABLE, which is the point: let one material ever answer differently and gravity becomes a material
 *  property in this system with not a line of code changed. (That would also be a Nobel Prize.) A quantity in this
 *  table still sits on the form, because the form asks what laws read and no law produces, and gravity is read by
 *  three and produced by none. Being of the setting rather than of the stuff does not take it off the form; it is
 *  a separate fact about it, derived separately. */
const SETTING: Record<string, { value: number; unit: string; why: string }> = {
  gravity: { value: 9.80665, unit: 'm/s^2',
    why: 'standard gravity at the Earth\'s surface (CGPM 1901, 3rd conference) — the setting\'s, not the stuff\'s: every material here is given the same, which is what the Eötvös experiments measure' },
};
/** What the setting gives this thing. Every thing in it gets the same, which is exactly what makes it testable. */
function ofTheSetting(id: string, quantity: string): { value: number; unit: string; how: string; d: Derivation } | null {
  const g = SETTING[plain(quantity)]; if (!g || !INVENTORY.has(id)) return null;
  return { value: g.value, unit: g.unit, how: `the setting (${g.why})`,
    d: settingOf(quantity, g.value, g.unit, g.why) };
}

/** A measured property of the stuff, for a material or for anything made of it. Intensive, so it does not add: one
 *  constituent passes its value on, several of equal value likewise, and several that disagree answer nothing rather
 *  than averaging a number nobody measured — the same rule the fixed density follows. */
function measuredProperty(id: string, quantity: string): { value: number; unit: string; how: string; d: Derivation } | null {
  const col = COLUMNS.find((c) => c.match.test(plain(quantity))); if (!col) return null;
  const i = INVENTORY.get(id); if (!i) return null;
  const direction = ANISOTROPIC.has(id) ? ', quoted along the fibre or in plane — it conducts differently across' : '';
  const own = PROPS[id];
  if (own) {
    return { value: own[col.i], unit: col.unit, how: `the material tables (a typical handbook value for ${i.name}${direction})`,
      d: measured(`${col.name} of ${i.name}`, own[col.i], col.unit, `a typical handbook value for ${i.name}${direction}`) };
  }
  if (!i.of.length) return null;
  const from = i.of.map((c) => measuredProperty(c.id, quantity)).filter((x): x is NonNullable<typeof x> => !!x);
  if (!from.length || from.length !== i.of.length) return null;
  if (from.some((f) => !alike(f.value, from[0].value))) return null;
  return { value: from[0].value, unit: col.unit,
    how: `the material it is made of: ${col.name} is a property of the stuff, so the part has its material's`,
    d: measured(`${col.name} of ${i.name}`, from[0].value, col.unit,
      `${i.of.map((c) => c.id).join(' and ')}: a ${col.name} belongs to the stuff, so it passes to the part unchanged`) };
}

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

/** Does this law's output answer to the quantity asked for? By KIND — `book/quantities.ts` owns the judgement.
 *  `exact` or `kin` is the same quantity under a qualifier; a bare dimensional match is NOT the same quantity, so a
 *  law giving a torque cannot answer a question about kinetic energy.
 *
 *  THE ASKED QUANTITY CARRIES NO DIMENSION — it is a name — and passing the port's own dimension for both sides,
 *  which this did, makes the dimensional half of the test vacuously true. The consequence was not subtle: asked for
 *  a bobbin's `angular speed` (a 1/s) it answered `0.54 m/s`, and asked for its `modulus` (a Pa) it answered a
 *  SECTION modulus (an m^3), because the names are kin and nothing checked the dimensions. The vocabulary derived
 *  from the book knows what dimension each kind is written in, so that is what the asked name is held to. */
const answersTo = (quantity: string, port: { name: string; sym: string }, dim: Dim) => {
  const kind = QUANTITY_KINDS.get(plain(quantity));
  if (kind && !kind.dims.includes(dimText(dim))) return false;   // the book says this kind is not that dimension
  const g = portFit(quantity, port, dim, dim);
  return g === 'exact' || g === 'kin';
};

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
  const sz = sizeOf(id, i, (x) => densityOf(x)?.value ?? null);
  if (/^volume$/.test(q) && sz) {
    // A BOUNDING BOX IS NOT A VOLUME, and saying so is the point. This is an upper bound on a solid part and a wild
    // one on a bracket, which is exactly why it is recorded as an estimate with its grounds — and why the density
    // it implies will disagree with the density from its materials, and `clashes` will say so.
    const [x, y, z] = sz.mm;
    return { value: (x / 1000) * (y / 1000) * (z / 1000), unit: 'm^3',
      how: 'its overall size, as a box: an UPPER BOUND, not the solid volume',
      d: estimate(`volume of ${i.name}`, (x / 1000) * (y / 1000) * (z / 1000), 'm^3',
        `its stated size ${x}×${y}×${z} mm taken as a box, so a solid part is over-stated and an open one wildly so`) };
  }
  const mp = measuredProperty(id, quantity);
  if (mp) return mp;
  const sv = ofTheSetting(id, quantity);
  if (sv) return sv;
  // THICKNESS IS AN EXTENT and was not reachable: the axis picker below has read `thick` as the third extent since
  // it was written, but the branch test never admitted the word, so a 10×10×3 gear answered nothing when a law
  // asked for its thickness — and `conduction` and `thermal.resistance.conduction` sat unreachable for want of a
  // figure the inventory states. A WALL thickness is refused on purpose: it is a feature of the section, not the
  // overall size, so answering it with the third extent would call a tube's outer size its wall.
  if (/extent|length|breadth|width|depth|height|diameter|thick/.test(q) && !/wall/.test(q) && sz) {
    // WHICH extent. `extent y` and `extent z` both used to fall through to the first one, so `mass.prism` was fed
    // 10×10×10 for a 10×10×3 gear and came out 8.5 g against the true 2.55 g — a 3.3× error that looked like a
    // working answer. An axis answersToPort in the quantity wins; failing that, breadth/width is the second and
    // depth/height the third, which is how the book's own prism laws name them.
    const k = /\bx\b/.test(q) ? 0 : /\by\b/.test(q) ? 1 : /\bz\b/.test(q) ? 2
      : /breadth|width/.test(q) ? 1 : /depth|height|thick/.test(q) ? 2 : 0;
    const mm = sz.mm[k]!;
    return { value: mm / 1000, unit: 'm', how: `${sz.how} (${['first', 'second', 'third'][k]} extent)`,
      d: sz.typical
        ? estimate(`${quantity} of ${i.name}`, mm / 1000, 'm', `${sz.how}: ${sz.mm.join(' \u00d7 ')} mm`)
        : measured(`${quantity} of ${i.name}`, mm / 1000, 'm', 'the inventory (its stated size, mm)') };
  }
  return null;
}

/** EVERY ROUTE to one quantity of one thing: what the inventory states, and every law whose output is that quantity
 *  and whose every input is itself knowable about the same thing. Recursion is depth-capped and cycle-guarded. */
function routesTo(id: string, quantity: string, seen: ReadonlySet<string>, depth: number): { how: string; value: number; unit: string; d: Derivation }[] {
  const out: { how: string; value: number; unit: string; d: Derivation }[] = [];
  // EVERY ROUTE IS HELD TO THE ASKED KIND'S OWN DIMENSION, and this is the one place to do it. Without it,
  // `stated` matched the word "length" inside "leak resistance of a unit length" and answered a cable's leakage
  // (an ohm m) with a bobbin's 20 mm — a name matched and nothing checked what it was a name FOR. The vocabulary
  // derived from the book knows what dimension each kind is written in; a route in any other dimension is not an
  // answer to the question asked.
  const asked = QUANTITY_KINDS.get(plain(quantity));
  const rightDim = (unit: string) => !asked || asked.dims.includes(dimText(dimOf(unit)));
  const own = stated(id, quantity);
  if (own && rightDim(own.unit)) out.push(own);
  if (depth <= 0) return out;
  for (const l of BOOK) {
    if (!answersTo(quantity, l.output, dimOf(l.output.unit))) continue;
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
    if (d.value === null || !rightDim(l.output.unit)) continue;
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

/** THE THINGS WORTH POINTING AT: something with a size or a mass, made of something, that you could pick up and
 *  hold. This lives here, with the rest of the parts↔laws boundary, so `witness.ts` can build the observation table
 *  without reaching into `parts/` itself — a knot `tidy` already counts as debt and will not have tied tighter. */
export function pointable(most = 24): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const i of INVENTORY.values()) {
    if (!(i.kind === 'part' || i.kind === 'product' || i.kind === 'assembly' || i.kind === 'material')) continue;
    if (!i.size && !i.g) continue;
    out.push({ id: i.id, name: i.name });
    if (out.length >= most) break;
  }
  return out;
}

/* ──────────────────────── the packet: every quantity a thing has, none of them computed ──────────────────────── */
//
// The user's words (2026-10-15): "when something is made it needs to be like a packet on every part or thing that
// gets filled out of all its geometry material and whatever and these should all have math and however that math
// interact with the time tree is what derives how it acts and interacts like it litterly cant break physics and
// automatically has infinite calculations attached to it but none being computed just like a calculator".
//
// A PACKET IS WHAT A THING IS, LAWFULLY. Three things are true of it at once, and the third is the hard one:
//
//   EVERYTHING IS ATTACHED.  `could` lists every kind of quantity the book can speak of — 585 of them — because any
//                            of them might be askable of this thing. Listing names costs nothing.
//   NOTHING IS COMPUTED.     Not one of them is evaluated until `at` is called for it, and then it is memoised. A
//                            packet is not a record with the fields filled in; it is the calculator with the keys
//                            already on it.
//   IT CANNOT CONTRADICT ITSELF. Every quantity reached two ways must agree, or `clashes` reports both routes and
//                            both numbers. A packet whose mass over its volume disagrees with its material's
//                            density is not an unlucky packet, it is a wrong one, and it says so.
//
// AND IT MEETS TIME. Every answer carries the power of time its unit reduces to, so `byTime` arranges a thing's
// whole lawful self on the one tree: what it is at time^-4, at time^-1, at time^3. That is the join the user keeps
// asking for, from the side of the thing rather than the side of the law.

/** A field of a packet that no law can fill: it is measured, or set, or the packet stays incomplete. */
export interface Blank {
  quantity: string; unit: string;
  /** do we have it for this thing? */ filled: boolean;
  value?: number; from?: string;
  /** how many laws READ it, so how many are blocked on it. Not how many start working the moment it is filled:
   *  a law needs every one of its ports, and the others may still be missing. */ unlocks: number;
  laws: string[];
  /** what the two tests make of it: whether it holds as a property of the stuff. Derived, never named. */ holds: Holds;
  says: string;
}

export interface Packet {
  /** A MATERIAL is a form to fill in; a PART is calculated from the material it is made of and its geometry. */
  kind: 'material' | 'part';
  thing: string; name: string;
  /** what it is made of, as the inventory states it */ of: string[];
  /** the facts it was MADE with — geometry and material — and nothing derived from them */
  given: { quantity: string; value: number; unit: string; from: string }[];
  /** every kind of quantity that could be asked of it. NAMES ONLY: nothing here has been computed. */
  could: string[];
  /** THE FORM. The quantities no law can derive — the ones a material is measured for and a condition is set for —
   *  each saying whether this thing has it and how many laws filling it would unlock. For a MATERIAL this is its
   *  datasheet: fill it in. For a PART most of it arrives through the material it is made of. */
  requires: Blank[];
  /** a part only: what it was calculated FROM, which is all a part ever needs to be given */
  from: { material: string[]; geometry: { quantity: string; value: number; unit: string }[] } | null;
  /** ask for one. Computed on access, memoised, with its chain and its place on time's tree. */
  at(quantity: string): Fact | null;
  /** does that quantity hold as a property of the stuff? The two tests, with every number they rest on. */
  holds(quantity: string): MaterialTest;
  /** what it is at each power of time, for the quantities asked for so far */
  byTime(): { power: number; facts: Fact[] }[];
  /** two routes to one of its quantities that disagree: it cannot break physics and this is the proof */
  clashes(): Clash[];
  says: string[];
}

/** THE MATHEMATICAL TEST OF A MATERIAL PROPERTY. Nothing is a property of the stuff because of what it is called.
 *  Two properties decide it, and both are read off the data:
 *  ONE — it DISCRIMINATES. Asked of two different materials it answers differently. A quantity with one value for
 *  every material tells you nothing about the material, whatever its name.
 *  TWO — it is INVARIANT UNDER GEOMETRY. Asked of two things of the SAME material at different sizes it answers the
 *  same. A quantity that moves with the size is a property of the THING, not of the stuff.
 *  Density passes both. Mass discriminates and scales, so it fails. A quantity too few things answer is reported as
 *  untested, which is not a failure. Whatever these two say stands, including where they admit as a material property
 *  something nobody would name one: the verdict is the arithmetic, and the arithmetic does not consult the vocabulary. */
export type Holds = 'holds' | 'scales with the thing' | 'same for every material' | 'not enough measured';
export interface MaterialTest {
  quantity: string;
  /** what the two tests make of it */ holds: Holds;
  /** test one: different materials, and what each answered */ across: { thing: string; value: number }[];
  /** test two: one material at two sizes, and what each answered */ atSizes: { thing: string; value: number }[];
  says: string;
}

const alike = (a: number, b: number): boolean => Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b), 1e-30);
const spread = (vs: number[]): number => vs.filter((v, i) => vs.findIndex((w) => alike(v, w)) === i).length;

/** who to ask: materials for test one, and one material's two most differently sized parts for test two. */
let bench: { materials: string[]; sized: string[] } | null = null;
function benchmark(): { materials: string[]; sized: string[] } {
  if (bench) return bench;
  const materials: string[] = [];
  const byMaterial = new Map<string, { id: string; vol: number }[]>();
  for (const [id, i] of INVENTORY) {
    if (i.kind === 'material' || i.kind === 'element') { materials.push(id); continue; }
    if (i.of.length !== 1 || !i.size || i.size.length < 3) continue;
    const vol = i.size[0] * i.size[1] * i.size[2];
    if (!(vol > 0)) continue;
    byMaterial.set(i.of[0].id, [...(byMaterial.get(i.of[0].id) ?? []), { id, vol }]);
  }
  let sized: string[] = [], widest = 1;
  for (const parts of byMaterial.values()) {
    if (parts.length < 2) continue;
    const s = [...parts].sort((a, b) => a.vol - b.vol);
    const ratio = s[s.length - 1].vol / s[0].vol;
    if (ratio > widest) { widest = ratio; sized = [s[0].id, s[s.length - 1].id]; }
  }
  bench = { materials: materials.slice(0, 24), sized };
  return bench;
}

const tested = new Map<string, MaterialTest>();
/** Does this quantity hold as a property of the stuff? Asked of the data, never of the name. */
export function holdsAsMaterial(quantity: string): MaterialTest {
  const key = plain(quantity);
  const got = tested.get(key); if (got) return got;
  const { materials, sized } = benchmark();
  const ask = (thing: string): number | null => { const f = know(thing, quantity, undefined, 1); return f ? f.value : null; };

  const across: { thing: string; value: number }[] = [];
  for (const m of materials) { const v = ask(m); if (v !== null) across.push({ thing: m, value: v }); }
  const atSizes: { thing: string; value: number }[] = [];
  for (const p of sized) { const v = ask(p); if (v !== null) atSizes.push({ thing: p, value: v }); }

  const discriminates = across.length < 2 ? null : spread(across.map((a) => a.value)) > 1;
  const invariant = atSizes.length < 2 ? null : spread(atSizes.map((a) => a.value)) === 1;

  // the geometry failure is decisive: a quantity that moves with the size belongs to the thing however well it also
  // tells one material from another, which is exactly the case of a mass.
  const holds: Holds = invariant === false ? 'scales with the thing'
    : discriminates === true ? 'holds'
    : discriminates === false ? 'same for every material'
    : 'not enough measured';
  const both = (xs: { thing: string; value: number }[]) => xs.map((a) => `${a.thing} ${readable(a.value)}`).join(', ');
  const says = holds === 'holds'
    ? `${key} HOLDS as a material property: ${spread(across.map((a) => a.value))} different values over ${across.length} materials asked`
      + (invariant === true ? `, and the same for ${both(atSizes)}, which differ in size. Both tests pass.`
        : `. The geometry test did not run — nothing of one material answered it at two sizes — so test one alone carries this.`)
    : holds === 'scales with the thing'
    ? `${key} FAILS as a material property: it moves with the size (${both(atSizes)}), so it is a property of the thing, not of the stuff`
    : holds === 'same for every material'
    ? `${key} FAILS test one: all ${across.length} materials asked answer ${readable(across[0].value)}, so it does not tell one material from another`
    : `${key} is UNTESTED: ${across.length} material${across.length === 1 ? '' : 's'} and ${atSizes.length} size${atSizes.length === 1 ? '' : 's'} answered, and each test needs two. Not a failure — nothing here has measured it`;
  const t: MaterialTest = { quantity: key, holds, across, atSizes, says };
  tested.set(key, t);
  return t;
}

/** THE PACKET OF A THING: every quantity attached, none computed. */
export function packet(thing: string): Packet | null {
  const i = INVENTORY.get(thing);
  if (!i) return null;
  const asked = new Map<string, Fact | null>();

  // what it was MADE with: its stated geometry and what its material gives it. Not derived — given.
  const given: Packet['given'] = [];
  for (const q of ['extent x', 'extent y', 'extent z', 'density', 'mass']) {
    const f = know(thing, q, undefined, 1);
    if (f && /inventory|mixing law|stated size|overall size/.test(f.how)) {
      given.push({ quantity: q, value: f.value, unit: f.unit, from: f.how });
    }
  }

  const at = (quantity: string): Fact | null => {
    const k = plain(quantity);
    if (asked.has(k)) return asked.get(k)!;
    const f = know(thing, quantity);
    asked.set(k, f);
    return f;
  };

  // THE PRIMITIVES: quantities some law READS and no law PRODUCES. These are exactly the things that cannot be
  // derived however much maths is attached — they are measured, or they are set, and until one is there every law
  // that reads it is out of reach. Derived from the book, so a law added changes the form with nothing rewritten.
  const produced = new Set<string>();
  for (const l of BOOK) produced.add(dimText(dimOf(l.output.unit)));
  const prim = new Map<string, { unit: string; laws: Set<string> }>();
  for (const l of BOOK) for (const p of l.inputs) {
    if (produced.has(dimText(dimOf(p.unit)))) continue;
    const k = plain(p.name);
    (prim.get(k) ?? prim.set(k, { unit: p.unit, laws: new Set() }).get(k)!).laws.add(l.id);
  }
  const requires: Blank[] = [...prim.entries()].map(([quantity, v]) => {
    const f = know(thing, quantity, undefined, 1);
    const h = holdsAsMaterial(quantity).holds;
    return { quantity, unit: v.unit, filled: !!f, ...(f ? { value: f.value, from: f.how } : {}),
      unlocks: v.laws.size, laws: [...v.laws], holds: h,
      says: (f
        ? `${quantity} = ${readable(f.value)} ${v.unit} — already known, from ${f.how}`
        // WAITING ON, not "can run": a law needs EVERY port, so filling one field removes one blocker and may
        // leave others. Filling brass's specific heat left `heat.capacity` wanting only a temperature rise, which
        // is the setting's to give. Saying "2 laws can run" would have claimed a result this does not produce.
        : `${quantity} (${v.unit}) — NOT KNOWN. ${v.laws.size} law${v.laws.size === 1 ? ' is' : 's are'} waiting on it: ${[...v.laws].slice(0, 3).join(', ')}${v.laws.size > 3 ? ', …' : ''}`)
        + ` [as a material property: ${h}]` };
  }).sort((a, b) => Number(a.filled) - Number(b.filled) || b.unlocks - a.unlocks);

  const kind: 'material' | 'part' = i.kind === 'material' || i.kind === 'element' ? 'material' : 'part';
  const geometry = given.filter((g) => /extent|height|breadth|depth|diameter/.test(g.quantity))
    .map((g) => ({ quantity: g.quantity, value: g.value, unit: g.unit }));

  return {
    kind, thing, name: i.name, of: i.of.map((c) => c.id), given, requires,
    from: kind === 'part' ? { material: i.of.map((c) => c.id), geometry } : null,
    could: [...QUANTITY_KINDS.keys()].sort(),
    at, holds: holdsAsMaterial,
    byTime: () => {
      const by = new Map<number, Fact[]>();
      for (const f of asked.values()) if (f) by.set(f.power, [...(by.get(f.power) ?? []), f]);
      return [...by.entries()].sort((a, b) => b[0] - a[0]).map(([power, facts]) => ({ power, facts }));
    },
    clashes: () => clashes().filter((c) => c.thing === thing),
    says: [
      kind === 'material'
        ? `${i.name} is a MATERIAL, so its packet is a form: ${requires.filter((f) => f.filled).length} of its ${requires.length} measured properties are known, and the rest are blank until someone measures them.`
        : `${i.name} is a PART: choose its material (${i.of.map((c) => c.id).join(', ') || 'none stated'}) and its geometry (${i.size ? i.size.join(' × ') + ' mm' : 'none stated'}), and everything else is calculated.`,
      `${given.length} facts it was made with; ${QUANTITY_KINDS.size} kinds of quantity attached to it, and none of them computed until asked.`,
      // WHAT IS ON THE FORM IS DERIVED, AND SO IS THE SORT OF THING EACH FIELD IS. The form is every quantity some
      // law READS and no law PRODUCES — that is the whole criterion, and a quantity satisfying it belongs on the
      // form however it is named. Whether each field holds AS A PROPERTY OF THE STUFF is then its own question, and
      // `holdsAsMaterial` answers it with two tests on the data rather than with a human category: does it tell one
      // material from another, and does it stay put when the geometry changes. A field that passes both is of the
      // stuff whatever we would call it; one that moves with the size is of the thing whatever we would call it.
      `${requires.filter((h) => h.holds === 'holds').length} of the ${requires.length} fields HOLD as properties of the stuff under the two tests (they tell one material from another and do not move with the geometry); ${requires.filter((h) => h.holds === 'scales with the thing').length} move with the size, so they are of the thing; ${requires.filter((h) => h.holds === 'same for every material').length} answer the same for every material asked; ${requires.filter((h) => h.holds === 'not enough measured').length} are untested here, for want of two measurements. The verdicts are arithmetic, not vocabulary.`,
      // THE CONTROL, so "untested" cannot be read as "the test cannot tell". Run on two quantities the tables DO
      // carry, the two tests separate them: a density holds and a mass fails by moving with the size. An untested
      // field is therefore a gap in the measurements, not a blunt instrument — and the gap is named, not excused.
      `the tests are not blunt: ${holdsAsMaterial('density').holds === 'holds' && holdsAsMaterial('mass').holds === 'scales with the thing' ? 'run on what the tables do carry they separate a density (HOLDS) from a mass (SCALES WITH THE THING)' : 'CHECK — the control pair no longer separates'}. So a field reading untested is a measurement this inventory lacks, and the ${requires.filter((h) => h.holds === 'not enough measured').length} of them are exactly what filling the material tables would settle.`,
      `${[...asked.values()].filter(Boolean).length} asked for so far. Every one carries the chain it rests on and the power of time it reduces to.`,
    ],
  };
}

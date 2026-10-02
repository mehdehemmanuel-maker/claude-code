// Things you can buy, as their makers publish them, in SI, with where each figure came from. The motors, gearheads,
// batteries and wire the world runs on (data/motors.ts, data/batteries.ts) are listed here alongside the rest, so Ego
// chooses among everything from one place; the families new here (bearings, pillow blocks, roller chain, couplings,
// rod ends, motor controllers) are what her workflows pick from next.
//
// Every entry is linted (lintCatalog): its own figures must agree with each other by the laws that relate them. A
// motor's no-load speed with its constants, a wire's resistance with copper's resistivity and its area, a bearing's
// bore inside its outside. That is how a typed-in error, or a datasheet for the wrong variant, is caught before
// anything is built on it.

import { MOTORS, GEARHEADS, type MotorData } from '../data/motors';
import { BATTERIES, WIRE_GAUGES, type BatteryData } from '../data/batteries';
import { motorModel } from '../engineering/dcmotor';
import { COPPER_RHO } from './laws';
import { PRINTING_MATERIALS } from './machines';
import type { CatalogItem } from './types';

const inch = 0.0254, lbf = 4.448222, inlb = 0.1129848;

const SKF = (n: string) => ({ cite: `deep groove ball bearing ${n}, ratings from SKF product data`, url: `https://www.skf.com/group/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-${n}` });

const bearing = (n: string, d: number, D: number, B: number, C: number, C0: number): CatalogItem => ({
  id: `bearing.dgbb.${n}`, family: 'bearing', label: `Deep groove ball bearing ${n}, ${d} × ${D} × ${B} mm (ISO 15 boundary dimensions)`,
  specs: { bore: d / 1000, od: D / 1000, width: B / 1000, C: C * 1000, C0: C0 * 1000, type: 'ball' },
  source: SKF(n), tags: ['bearing', 'ball', 'shaft', 'wheel', 'axle'],
});

export const BEARINGS: CatalogItem[] = [
  bearing('608', 8, 22, 7, 3.45, 1.37),
  bearing('6004', 20, 42, 12, 9.95, 5.0),
  bearing('6005', 25, 47, 12, 11.9, 6.55),
  bearing('6202', 15, 35, 11, 8.06, 3.75),
  bearing('6203', 17, 40, 12, 9.95, 4.75),
  bearing('6204', 20, 47, 14, 13.5, 6.55),
  bearing('6205', 25, 52, 15, 14.8, 7.8),
  bearing('6206', 30, 62, 16, 20.3, 11.2),
];

export const PILLOW_BLOCKS: CatalogItem[] = [
  {
    id: 'bearing.unit.ucp205', family: 'pillow block', label: 'Pillow block bearing unit UCP205, 25 mm bore (cast iron P205 housing, UC205 set-screw insert)',
    specs: { bore: 0.025, shaftHeight: 0.0365, length: 0.14, width: 0.038, height: 0.071, boltCentres: 0.105, bolt: 'M10', C: 14022, C0: 7843, mass: 0.816, type: 'ball' },
    source: { cite: 'AST Bearings, UCP205 metric two-bolt pillow block', url: 'https://www.astbearings.com/catalog/pillow_2_bolt_metric/UCP205' },
    tags: ['bearing', 'pillow block', 'axle', 'hanger', 'shaft'],
  },
];

/** ANSI B29.1 standard roller chain: pitch, roller diameter, the standard's minimum ultimate tensile strength. */
export const CHAINS: CatalogItem[] = [
  { id: 'chain.roller.ansi-35', family: 'roller chain', label: 'Roller chain ANSI 35, 3/8 in pitch', specs: { pitch: 0.375 * inch, roller: 0.2 * inch, tensileMin: 1760 * lbf }, source: { cite: 'ANSI/ASME B29.1 standard roller chain (via Ametric and USA Roller Chain charts)', url: 'https://www.ametric.com/images/document/Chain-RollerANSI.pdf' }, tags: ['chain', 'sprocket', 'drive'] },
  { id: 'chain.roller.ansi-40', family: 'roller chain', label: 'Roller chain ANSI 40, 1/2 in pitch', specs: { pitch: 0.5 * inch, roller: 0.312 * inch, tensileMin: 3125 * lbf }, source: { cite: 'ANSI/ASME B29.1 standard roller chain', url: 'https://www.ametric.com/images/document/Chain-RollerANSI.pdf' }, tags: ['chain', 'sprocket', 'drive', 'kart'] },
  { id: 'chain.roller.ansi-41', family: 'roller chain', label: 'Roller chain ANSI 41 (lightweight), 1/2 in pitch, narrow: not interchangeable with 40', specs: { pitch: 0.5 * inch, roller: 0.306 * inch, tensileMin: 1500 * lbf }, source: { cite: 'ANSI/ASME B29.1 standard roller chain', url: 'https://www.ametric.com/images/document/Chain-RollerANSI.pdf' }, tags: ['chain', 'sprocket', 'drive'] },
];

/** Lovejoy L-type jaw couplings with an NBR (SOX) spider: nominal torque and largest bore. */
const JAW_SOURCE = { cite: 'jaw-type couplings, L-type sizes 050 to 100 with SOX (NBR) spiders: ratings from the Lovejoy (Timken) catalogue', url: 'https://www.lovejoy-inc.com/products/jaw-type-couplings/l-type-standard-jaw-coupling/' };
export const COUPLINGS: CatalogItem[] = [
  { id: 'coupling.jaw.3nm-16mm', family: 'coupling', label: 'Jaw coupling, 3 N·m, 16 mm bore max (NBR spider)', specs: { torque: 26.3 * inlb, maxBore: 0.625 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
  { id: 'coupling.jaw.5nm-19mm', family: 'coupling', label: 'Jaw coupling, 4.9 N·m, 19 mm bore max (NBR spider)', specs: { torque: 43.2 * inlb, maxBore: 0.75 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
  { id: 'coupling.jaw.10nm-22mm', family: 'coupling', label: 'Jaw coupling, 10.2 N·m, 22 mm bore max, Ø44 mm (NBR spider)', specs: { torque: 90 * inlb, maxBore: 0.875 * inch, od: 1.75 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor', 'kart'] },
  { id: 'coupling.jaw.16nm-25mm', family: 'coupling', label: 'Jaw coupling, 16.3 N·m, 25 mm bore max (NBR spider)', specs: { torque: 144 * inlb, maxBore: 1 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
  { id: 'coupling.jaw.47nm-35mm', family: 'coupling', label: 'Jaw coupling, 47 N·m, 35 mm bore max (NBR spider)', specs: { torque: 417 * inlb, maxBore: 1.375 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
];

export const ROD_ENDS: CatalogItem[] = [
  {
    id: 'rod-end.m8-female', family: 'rod end', label: 'Rod end, M8 female thread, 8 mm bore (ISO 12240-4 dimension series E)',
    specs: { bore: 0.008, thread: 'M8', C: 5500, C0: 12900, tilt: (15 * Math.PI) / 180 },
    source: { cite: 'rod end ISO 12240-4 series E, size 8: ratings from SKF SI 8 E product data', url: 'https://www.skf.com/us/products/plain-bearings/spherical-plain-bearings-rod-ends/rod-ends/productid-SI%208%20E' },
    tags: ['rod end', 'tie rod', 'link', 'torque arm', 'steering'],
  },
];

export const CONTROLLERS: CatalogItem[] = [
  {
    id: 'controller.dc.1ch-30a-30v', family: 'motor controller', label: 'Brushed DC motor driver, 1 channel, 30 A continuous, 5 to 30 V, no current limit',
    specs: { channels: 1, vMin: 5, vMax: 30, continuous: 30, peak: 80, peakSeconds: 1, pwm: 20000, currentLimit: 'no', regen: 'no' },
    source: { cite: 'Cytron MD30C R2 product page and user\'s manual', url: 'http://www.cytron.com.my/p-md30c' }, tags: ['controller', 'motor', 'pwm', 'kart'],
  },
  {
    id: 'controller.dc.2ch-30a-34v-limit', family: 'motor controller', label: 'Brushed DC motor controller, 2 channels, 30 A each, 6 to 34 V, settable current limit, regenerative',
    specs: { channels: 2, vMin: 6, vMax: 34, continuous: 30, peak: 60, currentLimit: 'yes', regen: 'yes' },
    source: { cite: 'Basicmicro RoboClaw 2x30A (via Pololu product 3684)', url: 'https://www.pololu.com/product/3684' }, tags: ['controller', 'motor', 'current limit', 'kart'],
  },
];

/**
 * Blade fuses of the ISO 8820-3 "ATO" size (the common automotive blade, 1 to 40 A): 32 V DC, 1000 A interrupting
 * rating, -40 to +105 °C, by the maker's datasheet for the size.
 */
const ATO = { cite: 'Littelfuse ATO Blade Fuse Rated 32V datasheet (ISO 8820-3)', url: 'https://www.mouser.com/datasheet/2/240/Littelfuse_BladeFuse_ATO32V-46883.pdf', kind: 'maker' as const };
export const FUSES: CatalogItem[] = [10, 15, 20, 25, 30, 35, 40].map((a) => ({
  id: `fuse.blade-ato.${a}a`, family: 'fuse', label: `Blade fuse, ISO 8820-3 ATO size, ${a} A, 32 V DC, 1000 A interrupting`, source: ATO,
  specs: { rating: a, voltage: 32, interrupt: 1000, tMin: 233.15, tMax: 378.15 },
  tags: ['fuse', 'protection', 'blade fuse', 'overcurrent', 'short circuit'],
}));

/** The world's motors, gearheads, batteries and wire, as catalog items (their data stays where the world reads it). */
export function worldItems(): CatalogItem[] {
  const out: CatalogItem[] = [];
  for (const m of Object.values(MOTORS)) {
    const mm = motorModel(m);
    out.push({
      id: m.id, family: 'dc motor', label: m.label, source: { cite: m.source }, price: m.price, tags: ['motor', 'dc', 'drive'],
      specs: { V: m.V, Kt: mm.Kt, R: mm.R25, I0: mm.I0, noLoadSpeed: mm.noLoadSpeed, stallTorque: mm.stallTorque, continuous: m.maxContinuousCurrent, mass: m.mass, shaft: m.shaft, rotorInertia: mm.rotorInertia },
    });
  }
  for (const g of Object.values(GEARHEADS)) {
    out.push({
      id: g.id, family: 'gearhead', label: g.label, source: { cite: g.source }, price: g.price, tags: ['gearhead', 'gear', 'ratio'],
      specs: { ratio: g.ratio, efficiency: g.efficiency, continuousTorque: g.maxContinuousTorque, radial: g.maxRadial, axial: g.maxAxial, shaft: g.shaft, mass: g.mass, fits: g.fits.join(',') },
    });
  }
  for (const b of Object.values(BATTERIES)) {
    out.push({
      id: b.id, family: 'battery', label: b.label, source: { cite: b.source }, price: b.price, tags: ['battery', 'lead-acid', 'power'],
      specs: { V: b.V, cells: b.cells, Ah20: b.capacity.find((c) => c.hours === 20)?.Ah ?? 0, internalR: b.internalR, mass: b.mass },
    });
  }
  for (const [g, w] of Object.entries(WIRE_GAUGES)) {
    out.push({ id: `awg.${g}`, family: 'wire', label: `${g} AWG copper`, source: { cite: 'ASTM B258 (AWG sizes); chassis-wiring ampacity tables' }, tags: ['wire', 'cable', 'copper'], specs: { gauge: Number(g), area: w.area, ohmPerM: w.ohmPerM, ampacity: w.ampacity } });
  }
  return out;
}

export const CATALOG: CatalogItem[] = [...BEARINGS, ...PILLOW_BLOCKS, ...CHAINS, ...COUPLINGS, ...ROD_ENDS, ...CONTROLLERS, ...FUSES, ...PRINTING_MATERIALS, ...worldItems()];

export const itemById = (id: string) => CATALOG.find((c) => c.id === id);
export const family = (f: string) => CATALOG.filter((c) => c.family === f);
const num = (c: CatalogItem, k: string) => (typeof c.specs[k] === 'number' ? (c.specs[k] as number) : NaN);

/**
 * What is wrong with an entry, by its own figures: each check is a law relating them, or a fact of the kind of thing it
 * is. An empty list means it agrees with itself (not that it is the maker's: that is its source's job).
 */
export function lintItem(c: CatalogItem): string[] {
  const bad: string[] = [];
  if (!c.source.cite) bad.push('no source');
  for (const [k, v] of Object.entries(c.specs)) if (typeof v === 'number' && !Number.isFinite(v)) bad.push(`${k} is not a number`);
  switch (c.family) {
    case 'bearing': case 'pillow block': {
      if (c.family === 'bearing' && !(num(c, 'bore') < num(c, 'od'))) bad.push('bore not inside the outside diameter');
      // a deep groove ball bearing's dynamic rating sits above its static one (ISO 76 / ISO 281 for this type)
      if (!(num(c, 'C') > num(c, 'C0'))) bad.push('dynamic rating not above static, which a deep groove ball bearing\'s always is');
      break;
    }
    case 'roller chain':
      if (!(num(c, 'roller') < num(c, 'pitch'))) bad.push('roller larger than its pitch');
      break;
    case 'coupling':
      if (!(num(c, 'torque') > 0 && num(c, 'maxBore') > 0)) bad.push('no torque or bore');
      break;
    case 'dc motor':
      bad.push(...lintMotor(MOTORS[c.id]!));
      break;
    case 'gearhead':
      if (!(num(c, 'efficiency') > 0.3 && num(c, 'efficiency') <= 1)) bad.push('efficiency out of range');
      if (!(num(c, 'ratio') >= 1)) bad.push('ratio below 1');
      break;
    case 'battery':
      bad.push(...lintBattery(BATTERIES[c.id]!));
      break;
    case 'wire': {
      // R' A = rho for copper: a typo in either shows here
      const rho = num(c, 'ohmPerM') * num(c, 'area');
      if (Math.abs(rho - COPPER_RHO) / COPPER_RHO > 0.03) bad.push(`its resistance and area give ρ = ${rho.toExponential(3)} ohm m, copper's is ${COPPER_RHO.toExponential(3)}`);
      break;
    }
    case 'printing material': {
      // a continuous carbon fibre stays linear to failure: its strength is about its modulus times its strain at break
      const E = num(c, 'tensileModulus'), S = num(c, 'tensileStrength'), e = num(c, 'strainAtBreak');
      if (Number.isFinite(E) && Number.isFinite(S) && Number.isFinite(e) && Math.abs(S - E * e) / S > 0.25) bad.push(`its strength ${S / 1e6} MPa is far from modulus × strain ${((E * e) / 1e6).toFixed(0)} MPa`);
      const yieldS = num(c, 'tensileYield'), brk = num(c, 'tensileBreak');
      if (Number.isFinite(yieldS) && Number.isFinite(brk) && brk > yieldS * 1.5) bad.push('breaking far above its yield, which a filled nylon does not');
      const d = num(c, 'density');
      if (Number.isFinite(d) && (d < 900 || d > 2200)) bad.push(`${d} kg/m³ is not a polymer composite's`);
      break;
    }
    case 'fuse':
      if (!(num(c, 'interrupt') > num(c, 'rating'))) bad.push('it can\'t interrupt even its own rating');
      if (c.id.includes('ato') && !(num(c, 'rating') >= 1 && num(c, 'rating') <= 40)) bad.push('the ATO size runs 1 to 40 A');
      break;
    case 'motor controller':
      if (!(num(c, 'peak') >= num(c, 'continuous'))) bad.push('peak below continuous');
      if (!(num(c, 'vMax') > num(c, 'vMin'))) bad.push('voltage range upside down');
      break;
  }
  return bad;
}

/** A motor's datasheet against itself: its label's voltage, and its constants against its no-load speed and stall. */
export function lintMotor(m: MotorData): string[] {
  const bad: string[] = [];
  // the label's voltage is the winding's: the 12 V and 24 V windings of one motor are different order numbers
  const lv = /(\d+(?:\.\d+)?)\s*V\b/.exec(m.label);
  if (lv && Number(lv[1]) !== m.V) bad.push(`its label says ${lv[1]} V, its data ${m.V} V`);
  const mm = motorModel(m), p = m.published;
  const rpm = (mm.noLoadSpeed * 60) / (2 * Math.PI);
  if (p.noLoadSpeed && Math.abs(rpm - p.noLoadSpeed) / p.noLoadSpeed > 0.01) bad.push(`its constants give ${rpm.toFixed(0)} rpm no-load, its sheet ${p.noLoadSpeed}`);
  if (p.stallCurrent && Math.abs(mm.stallCurrent - p.stallCurrent) / p.stallCurrent > 0.01) bad.push(`V/R gives ${mm.stallCurrent.toFixed(1)} A stall, its sheet ${p.stallCurrent} A`);
  if (p.stallTorque && Math.abs(mm.stallTorque - p.stallTorque) / p.stallTorque > 0.1) bad.push(`its constants give ${mm.stallTorque.toFixed(2)} N·m stall, its sheet ${p.stallTorque}`);
  if (!(m.maxContinuousCurrent < mm.stallCurrent)) bad.push('continuous current not below stall');
  return bad;
}

/** A lead-acid battery's datasheet against itself: cells and voltage, capacity with rate, energy per kilogram. */
export function lintBattery(b: BatteryData): string[] {
  const bad: string[] = [];
  if (Math.abs(b.V - 2 * b.cells) > 0.5) bad.push(`${b.cells} lead-acid cells make ${2 * b.cells} V, not ${b.V}`);
  const caps = [...b.capacity].sort((x, y) => x.hours - y.hours);
  for (let i = 1; i < caps.length; i++) if (!(caps[i]!.Ah >= caps[i - 1]!.Ah)) bad.push('capacity rising as it is drawn faster');
  // lead-acid holds 25 to 45 Wh/kg (Linden & Reddy)
  const whkg = (b.V * (caps[caps.length - 1]?.Ah ?? 0)) / b.mass;
  if (whkg < 20 || whkg > 50) bad.push(`${whkg.toFixed(0)} Wh/kg is not lead-acid's 25 to 45`);
  return bad;
}

export function lintCatalog(items = CATALOG): { id: string; problems: string[] }[] {
  return items.map((c) => ({ id: c.id, problems: lintItem(c) })).filter((x) => x.problems.length);
}

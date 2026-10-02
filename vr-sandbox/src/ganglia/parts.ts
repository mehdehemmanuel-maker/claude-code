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
import type { CatalogItem } from './types';

const inch = 0.0254, lbf = 4.448222, inlb = 0.1129848;

const SKF = (n: string) => ({ cite: `SKF, deep groove ball bearing ${n}, product data`, url: `https://www.skf.com/group/products/rolling-bearings/ball-bearings/deep-groove-ball-bearings/productid-${n}` });

const bearing = (n: string, d: number, D: number, B: number, C: number, C0: number): CatalogItem => ({
  id: `skf.${n}`, family: 'bearing', label: `SKF ${n} deep groove ball bearing, ${d} × ${D} × ${B} mm`,
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
    id: 'ucp205', family: 'pillow block', label: 'UCP205 pillow block, 25 mm bore (cast iron P205 housing, UC205 insert)',
    specs: { bore: 0.025, shaftHeight: 0.0365, length: 0.14, width: 0.038, height: 0.071, boltCentres: 0.105, bolt: 'M10', C: 14022, C0: 7843, mass: 0.816, type: 'ball' },
    source: { cite: 'AST Bearings, UCP205 metric two-bolt pillow block', url: 'https://www.astbearings.com/catalog/pillow_2_bolt_metric/UCP205' },
    tags: ['bearing', 'pillow block', 'axle', 'hanger', 'shaft'],
  },
];

/** ANSI B29.1 standard roller chain: pitch, roller diameter, the standard's minimum ultimate tensile strength. */
export const CHAINS: CatalogItem[] = [
  { id: 'ansi.35', family: 'roller chain', label: 'ANSI 35 roller chain, 3/8 in pitch', specs: { pitch: 0.375 * inch, roller: 0.2 * inch, tensileMin: 1760 * lbf }, source: { cite: 'ANSI/ASME B29.1 standard roller chain (via Ametric and USA Roller Chain charts)', url: 'https://www.ametric.com/images/document/Chain-RollerANSI.pdf' }, tags: ['chain', 'sprocket', 'drive'] },
  { id: 'ansi.40', family: 'roller chain', label: 'ANSI 40 roller chain, 1/2 in pitch', specs: { pitch: 0.5 * inch, roller: 0.312 * inch, tensileMin: 3125 * lbf }, source: { cite: 'ANSI/ASME B29.1 standard roller chain', url: 'https://www.ametric.com/images/document/Chain-RollerANSI.pdf' }, tags: ['chain', 'sprocket', 'drive', 'kart'] },
  { id: 'ansi.41', family: 'roller chain', label: 'ANSI 41 lightweight roller chain, 1/2 in pitch (narrow, not interchangeable with 40)', specs: { pitch: 0.5 * inch, roller: 0.306 * inch, tensileMin: 1500 * lbf }, source: { cite: 'ANSI/ASME B29.1 standard roller chain', url: 'https://www.ametric.com/images/document/Chain-RollerANSI.pdf' }, tags: ['chain', 'sprocket', 'drive'] },
];

/** Lovejoy L-type jaw couplings with an NBR (SOX) spider: nominal torque and largest bore. */
const JAW_SOURCE = { cite: 'Lovejoy (Timken) jaw-type couplings catalogue, L-type, SOX (NBR) spider ratings', url: 'https://www.lovejoy-inc.com/products/jaw-type-couplings/l-type-standard-jaw-coupling/' };
export const COUPLINGS: CatalogItem[] = [
  { id: 'lovejoy.l050', family: 'coupling', label: 'Lovejoy L050 jaw coupling (NBR spider)', specs: { torque: 26.3 * inlb, maxBore: 0.625 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
  { id: 'lovejoy.l070', family: 'coupling', label: 'Lovejoy L070 jaw coupling (NBR spider)', specs: { torque: 43.2 * inlb, maxBore: 0.75 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
  { id: 'lovejoy.l075', family: 'coupling', label: 'Lovejoy L075 jaw coupling (NBR spider)', specs: { torque: 90 * inlb, maxBore: 0.875 * inch, od: 1.75 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor', 'kart'] },
  { id: 'lovejoy.l090', family: 'coupling', label: 'Lovejoy L090 jaw coupling (NBR spider)', specs: { torque: 144 * inlb, maxBore: 1 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
  { id: 'lovejoy.l100', family: 'coupling', label: 'Lovejoy L100 jaw coupling (NBR spider)', specs: { torque: 417 * inlb, maxBore: 1.375 * inch, type: 'jaw' }, source: JAW_SOURCE, tags: ['coupling', 'shaft', 'motor'] },
];

export const ROD_ENDS: CatalogItem[] = [
  {
    id: 'skf.si8e', family: 'rod end', label: 'SKF SI 8 E rod end, M8 female, 8 mm bore (ISO 12240-4 series E)',
    specs: { bore: 0.008, thread: 'M8', C: 5500, C0: 12900, tilt: (15 * Math.PI) / 180 },
    source: { cite: 'SKF SI 8 E rod end, product data', url: 'https://www.skf.com/us/products/plain-bearings/spherical-plain-bearings-rod-ends/rod-ends/productid-SI%208%20E' },
    tags: ['rod end', 'tie rod', 'link', 'torque arm', 'steering'],
  },
];

export const CONTROLLERS: CatalogItem[] = [
  {
    id: 'cytron.md30c', family: 'motor controller', label: 'Cytron MD30C brushed DC motor driver (1 channel)',
    specs: { channels: 1, vMin: 5, vMax: 30, continuous: 30, peak: 80, peakSeconds: 1, pwm: 20000, currentLimit: 'no', regen: 'no' },
    source: { cite: 'Cytron MD30C R2 product page and user\'s manual', url: 'http://www.cytron.com.my/p-md30c' }, tags: ['controller', 'motor', 'pwm', 'kart'],
  },
  {
    id: 'basicmicro.roboclaw-2x30a', family: 'motor controller', label: 'Basicmicro RoboClaw 2x30A brushed DC motor controller (2 channels)',
    specs: { channels: 2, vMin: 6, vMax: 34, continuous: 30, peak: 60, currentLimit: 'yes', regen: 'yes' },
    source: { cite: 'Basicmicro RoboClaw 2x30A (via Pololu product 3684)', url: 'https://www.pololu.com/product/3684' }, tags: ['controller', 'motor', 'current limit', 'kart'],
  },
];

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

export const CATALOG: CatalogItem[] = [...BEARINGS, ...PILLOW_BLOCKS, ...CHAINS, ...COUPLINGS, ...ROD_ENDS, ...CONTROLLERS, ...worldItems()];

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

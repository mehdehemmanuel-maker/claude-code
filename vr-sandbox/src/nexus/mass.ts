// A part's mass: its own (its shape's volume, or its skin's area times its wall where it is hollow, times its material's
// density and the share of it that is solid) and its parts'. Apart from the kits (src/nexus/kits.ts re-exports it), so
// whatever makes parts (the component library, the wheeled machines) can weigh them without loading every kit.

import { latheArea, latheVolume, loftArea, loftVolume, prismArea, prismVolume, tubeLength, tubeVolume } from './form';
import { surfaceArea } from './surface';
import type { Part, Shape } from './kits';
import { PKG_DENSITY } from './packages';

/** Densities, kg/m³ (typical values). */
export const DENSITY: Record<string, number> = {
  'steel-low': 7850, 'steel-tool': 7850, 'steel-spring': 7850, 'steel-alloy': 7850, 'stainless-304': 8000, 'cast-iron': 7200, 'al-6061': 2700, 'al-6063': 2700, copper: 8960,
  wood: 500, oak: 750, glass: 2500, brick: 1900, concrete: 2400, granite: 2700, rubber: 1150, abs: 1050, pp: 905, pc: 1200, pmma: 1190, nylon: 1140,
  cotton: 80, foam: 35, leather: 860, asphalt: 2300, water: 1000, soil: 1500, leaf: 600, render: 1800, tile: 2000, silk: 1300, stingray: 1100,
  pe: 950, mno2: 3200 /* a cell's pressed MnO2 and graphite cathode (typical) */, 'zinc-gel': 2800 /* zinc powder in KOH gel, a cell's anode (typical) */, pu: 1200, fibreglass: 1850, 'al-a380': 2710, 'al-5052': 2680, 'stainless-316': 8000, 'stainless-440c': 7800, brass: 8500, bronze: 8800, 'phosphor-bronze': 8800, 'steel-chrome': 7830, pvc: 1400, pom: 1410, ptfe: 2200, 'al-7075': 2810, 'wood-veneer': 680, fr4: 1850,
  'steel-electrical': 7650, 'magnet-wire': 8900, ndfeb: 7500, nbr: 1200, pet: 1380,
  // (die-cast zinc, Zamak 3: 6.6 g/cm³; tin-lead 63/37: 8.4; paper and cellulose: 0.8, typical)
  zamak: 6600, 'solder-snpb': 8400, paper: 800,
  // (magnesium oxide 3.58 g/cm³ solid, a heater packs it to about 85 %: its parts say so; nichrome 80/20 8.4; sintered
  // barium or strontium ferrite 4.9; an NTC thermistor's Mn–Ni–Co oxide 5.0, typical)
  mgo: 3580, nichrome: 8400, 'ferrite-hard': 4900, 'ntc-ceramic': 5000,
  // (what electronic packages are made of: src/nexus/packages.ts, each with its source)
  ...Object.fromEntries(Object.entries(PKG_DENSITY).map(([k, [v]]) => [k, v])),
  tissue: 1050, foliage: 1.5, battery: 1500, petrol: 740, diesel: 840, bread: 250, cheese: 1100, ham: 1050, tomato: 1000, lettuce: 400, butter: 911, chicken: 1050, egg: 1030, avocado: 1000, bacon: 1000,
};
const vol = (s: Shape): number => {
  if ('box' in s) return s.box[0] * s.box[1] * s.box[2];
  if ('cyl' in s) { const [r, h, r2 = r] = s.cyl; return (Math.PI * h * (r * r + r * r2 + r2 * r2)) / 3; }
  if ('sphere' in s) return (4 / 3) * Math.PI * s.sphere ** 3;
  if ('cone' in s) return (Math.PI * s.cone[0] ** 2 * s.cone[1]) / 3;
  if ('torus' in s) return 2 * Math.PI ** 2 * s.torus[0] * s.torus[1] ** 2;
  if ('capsule' in s) return Math.PI * s.capsule[0] ** 2 * (s.capsule[1] + (4 / 3) * s.capsule[0]);
  if ('loft' in s) return loftVolume(s.loft);
  if ('tube' in s) return tubeVolume(s.tube);
  if ('lathe' in s) return latheVolume(s.lathe);
  if ('prism' in s) return prismVolume(s.prism);
  // a heap: each brick's solid plastic, 0.386 of its box (a 2×4 brick's 2.3 g of ABS at 1,050 kg/m³ in its 31.8 × 11.3 × 15.8 mm)
  if ('heap' in s) return s.heap.n * s.heap.size[0] * s.heap.size[1] * s.heap.size[2] * 0.386;
  return 0;
};
const area = (s: Shape): number => {
  if ('box' in s) { const [a, b, c] = s.box; return 2 * (a * b + a * c + b * c); }
  if ('cyl' in s) { const [r, h] = s.cyl; return 2 * Math.PI * r * (r + h); }
  if ('sphere' in s) return 4 * Math.PI * s.sphere ** 2;
  if ('torus' in s) return 4 * Math.PI ** 2 * s.torus[0] * s.torus[1];
  if ('loft' in s) return loftArea(s.loft);
  if ('tube' in s) return tubeLength(s.tube) * 2 * Math.PI * s.tube.r;
  if ('lathe' in s) return latheArea(s.lathe);
  if ('prism' in s) return prismArea(s.prism);
  if ('surf' in s) return surfaceArea(s.surf);
  return 0;
};
/** A part's mass, kg: its own (shape and material's density, or its wall where it is hollow) and its parts'. */
export function massOf(p: Part): number {
  // (a round shape drawn with flat sides, a nut's six, is that polygon round its axis, not the circle through its corners)
  const flats = p.facets && p.shape && ('cyl' in p.shape || 'lathe' in p.shape) ? (p.facets * Math.sin((2 * Math.PI) / p.facets)) / (2 * Math.PI) : 1;
  // (less what is drilled out of it: each hole its own cylinder, or its n-sided prism)
  const holes = (p.cuts ?? []).reduce((v, c) => v + (c.n ? (c.n / 2) * Math.sin((2 * Math.PI) / c.n) : Math.PI) * c.r * c.r * c.depth, 0);
  const own = p.kg !== undefined ? p.kg : p.shape && p.mat && DENSITY[p.mat] ? (p.shell ? area(p.shape) * p.shell : Math.max(0, vol(p.shape) * flats - holes)) * DENSITY[p.mat]! * (p.fill ?? 1) : 0;
  return own + (p.parts ?? []).reduce((a, q) => a + massOf(q), 0);
}
/** A mass to read, from grams: "1,240 g", "12 g", "0.50 g", "2.17 mg", "0.42 mg" (a chip's parts weigh milligrams). */
export const grams = (g: number): string => (g >= 100 ? `${Math.round(g).toLocaleString('en')} g` : g >= 10 ? `${g.toFixed(0)} g` : g >= 0.1 ? `${g.toFixed(2)} g` : `${+(g * 1000).toPrecision(3)} mg`);

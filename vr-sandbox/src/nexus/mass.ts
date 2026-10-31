// A part's mass: its own (its shape's volume, or its skin's area times its wall where it is hollow, times its material's
// density and the share of it that is solid) and its parts'. Apart from the kits (src/nexus/kits.ts re-exports it), so
// whatever makes parts (the component library, the wheeled machines) can weigh them without loading every kit.

import { latheArea, latheVolume, loftArea, loftVolume, prismArea, prismVolume, tubeLength, tubeVolume } from './form';
import { surfaceArea } from './surface';
import type { Part, Shape } from './kits';
import { pureElement } from './elements';
import { PERIODIC } from '../data/periodic';
import { WOODS, woodDensity } from '../data/woods';
import { MIXES, MIXTURES, mixDensity } from '../data/mixes';
import { CONSTITUENTS } from '../data/constituents';
import { mix } from './mixture';

/** Densities, kg/m³ (typical values). */
export const DENSITY: Record<string, number> = {
  'steel-low': 7850, 'steel-tool': 7850, 'steel-spring': 7850, 'steel-alloy': 7850, 'stainless-304': 8000, 'cast-iron': 7200, 'al-6061': 2700, 'al-6063': 2700, copper: 8960,
  wood: 500, oak: 750, glass: 2500, brick: 1900, concrete: 2400, granite: 2700, rubber: 1150, nr: 930, abs: 1050, pp: 905, pc: 1200, pmma: 1190, nylon: 1140,
  cotton: 80, foam: 35, leather: 860, asphalt: 2300, water: 1000, soil: 1500, leaf: 600, render: 1800, tile: 2000, silk: 1300, stingray: 1100,
  pe: 950, xlpe: 930, pu: 1200, fibreglass: 1850, 'glass-wool': 2550, 'al-a380': 2710, 'al-5052': 2680, 'stainless-316': 8000, 'stainless-440c': 7800, brass: 8500, bronze: 8800, 'steel-chrome': 7830, pvc: 1400, pom: 1410, ptfe: 2200, 'al-7075': 2810, 'wood-veneer': 680, fr4: 1850,
  'steel-electrical': 7650, 'magnet-wire': 8900, ndfeb: 7500, nbr: 1200,
  lead: 11340, acid: 1280, 'glycol-50': 1070, 'al-3003': 2730, pet: 1380, oil: 870, zamak: 6700, alumina: 3900, 'nickel-alloy': 8400, pbt: 1310, epdm: 1150, neoprene: 1230, 'al-2024': 2780, graphite: 1800, pla: 1240, silicone: 1150, fkm: 1800, 'pa66-gf30': 1350, 'mls-steel': 7900, paper: 800, epoxy: 1200, silicon: 2329, sio2: 2200, tungsten: 19300, hfo2: 9680, gold: 19300, solder: 7400, ceramic: 3900, 'nickel-plate': 8900,
  // (the sensing ceramics, typical: yttria-stabilised zirconia about 6,050 kg/m³; PZT about 7,600 (its datasheets give
  // 7,500 to 7,800); a nickel-manganese spinel thermistor about 5,000, an estimate)
  zirconia: 6050, pzt: 7600, 'ntc-ceramic': 5000,
  // (a phenolic resin about 1,300 kg/m³ (Bakelite's); a semi-metallic pad's friction material about 2,400, an estimate)
  phenolic: 1300, 'friction-composite': 2400,
  // MDF: EN 622-5 typical (the handbook's wood.mdf, an estimate)
  mdf: 750,
  tissue: 1050, foliage: 1.5, battery: 1500, petrol: 740, diesel: 840, bread: 250, cheese: 1100, ham: 1050, tomato: 1000, lettuce: 400, butter: 911, chicken: 1050, egg: 1030, avocado: 1000, bacon: 1000,
};
/** A material's density, kg/m³: the table's; else, for a material that is one element (silver, tin, nickel), the
 *  element's (src/data/periodic.ts), so a part of it is not weightless. Undefined where neither knows. */
export function densityKg(mat: string): number | undefined {
  if (DENSITY[mat] !== undefined) return DENSITY[mat];
  const el = pureElement(mat), d = el ? PERIODIC[el]?.density : undefined;
  return d ?? undefined;
}
// the species and the mixes: worked out, from a species' specific gravity, from what goes into a mix's cubic metre
for (const [id, w] of Object.entries(WOODS)) DENSITY[id] = woodDensity(w);
for (const [id, m] of Object.entries(MIXES)) DENSITY[id] = mixDensity(m);
// the phases mixtures are made of, where the table above has none; and each mixture's, worked from its phases'
for (const [id, c] of Object.entries(CONSTITUENTS)) if (DENSITY[id] === undefined && c.figures.density) DENSITY[id] = c.figures.density.value;
for (const [id, x] of Object.entries(MIXTURES)) {
  if (MIXES[id]) continue; // (a mix given by what goes into its cubic metre keeps that)
  const ph = x.phases.map(([p, f]) => ({ p: { name: p, density: DENSITY[p] }, frac: f })), d = mix(ph, x.by, x.arrangement, { porosity: x.porosity, gas: x.gas ? { name: x.gas, density: DENSITY[x.gas] } : undefined }).props.density;
  if (d) DENSITY[id] = d.value;
}
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
  if ('ground' in s) { const g = s.ground, lo = Math.min(...g.h); return g.w * g.d * (g.base + g.h.reduce((a, x) => a + x - lo, 0) / g.h.length); }
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
  if ('ground' in s) return s.ground.w * s.ground.d;
  if ('surf' in s) return surfaceArea(s.surf);
  return 0;
};
/** How much of a hole's run (from its `at`, along its `dir`, `depth` long) lies inside the box round a shape (in the
 *  part's frame): a box's own, a turned part's round its axis; any other, the hole's whole depth. */
function inside(s: Shape | undefined, c: { at: [number, number, number]; dir: [number, number, number]; depth: number }): number {
  let lo: number[], hi: number[];
  if (s && 'box' in s) { lo = s.box.map((x) => -x / 2); hi = s.box.map((x) => x / 2); }
  else if (s && 'lathe' in s) { const R = Math.max(...s.lathe.map((q) => q[0])), ys = s.lathe.map((q) => q[1]); lo = [-R, Math.min(...ys), -R]; hi = [R, Math.max(...ys), R]; }
  else return c.depth;
  const L = Math.hypot(...c.dir) || 1; let t0 = 0, t1 = c.depth;
  for (let k = 0; k < 3; k++) { const d = c.dir[k]! / L, a = c.at[k]!;
    if (Math.abs(d) < 1e-12) { if (a < lo[k]! || a > hi[k]!) return 0; continue; }
    let ta = (lo[k]! - a) / d, tb = (hi[k]! - a) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
  return Math.max(0, t1 - t0);
}
/** How much of a hole's round section lies inside the shape across its run, m²: for a box and a hole along one of its
 *  axes, the circle clipped to the box's section (by 256 strips); for anything else, the whole circle. */
function acrossInside(s: Shape | undefined, c: { r: number; at: [number, number, number]; dir: [number, number, number] }): number {
  const L = Math.hypot(...c.dir) || 1, k = c.dir.findIndex((x) => Math.abs(x / L) > 1 - 1e-9);
  if (!s || !('box' in s) || k < 0) return Math.PI * c.r * c.r;
  const [u, v] = [0, 1, 2].filter((i) => i !== k) as [number, number], hu = s.box[u]! / 2, hv = s.box[v]! / 2, au = c.at[u]!, av = c.at[v]!;
  if (Math.abs(au) + c.r <= hu && Math.abs(av) + c.r <= hv) return Math.PI * c.r * c.r;
  const u0 = Math.max(-hu, au - c.r), u1 = Math.min(hu, au + c.r), n = 256; if (u1 <= u0) return 0;
  let A = 0; for (let i = 0; i < n; i++) { const x = u0 + ((i + 0.5) * (u1 - u0)) / n, h = Math.sqrt(Math.max(0, c.r * c.r - (x - au) ** 2)); A += Math.max(0, Math.min(hv, av + h) - Math.max(-hv, av - h)); }
  return (A * (u1 - u0)) / n;
}
/** A part's mass, kg: its own (shape and material's density, or its wall where it is hollow) and its parts'. */
/** The volume a shape encloses, m³ (before what is drilled out of it, and its fill). */
export const volumeOf = (s: Shape): number => vol(s);
export function massOf(p: Part): number {
  // (a round shape drawn with flat sides, a nut's six, is that polygon round its axis, not the circle through its corners)
  const flats = p.facets && p.shape && ('cyl' in p.shape || 'lathe' in p.shape) ? (p.facets * Math.sin((2 * Math.PI) / p.facets)) / (2 * Math.PI) : 1;
  // (less what is drilled out of it: each hole its own cylinder, or its n-sided prism)
  // (only as deep as it runs inside the shape: a bore along a pushrod drilled through a gasket takes the gasket's thickness)
  // (and only as much of its round as lies inside: a saddle bored along a box's face takes half its circle, not all of it)
  const holes = (p.cuts ?? []).reduce((v, c) => v + (c.n ? ((c.n / 2) * Math.sin((2 * Math.PI) / c.n)) / Math.PI : 1) * acrossInside(p.shape, c) * inside(p.shape, c), 0);
  const rho = p.mat ? densityKg(p.mat) : undefined;
  const own = p.kg !== undefined ? p.kg : p.shape && rho ? (p.shell ? area(p.shape) * p.shell : Math.max(0, vol(p.shape) * flats - holes)) * rho * (p.fill ?? 1) : 0;
  return own + (p.parts ?? []).reduce((a, q) => a + massOf(q), 0);
}

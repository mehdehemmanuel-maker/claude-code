// Heat: where the energy that leaves motion goes. Friction, impacts and bending past yield turn motion into heat in
// the parts that did the work; a part warms by what it absorbs over its heat capacity, and cools to the room by
// natural convection and radiation. Hot enough, metal glows; hot enough, wood chars. Values are typical handbook
// properties near room temperature; each names its source.

import type { Material } from '../data/materials';

export interface ThermalProps {
  /** Specific heat, J/(kg K). */
  c: number;
  /** Thermal conductivity, W/(m K). */
  k: number;
  /** Total hemispherical emissivity of the surface as it comes (0-1). */
  emissivity: number;
  source: string;
}

/** Room temperature, deg C. */
export const AMBIENT = 20;
const SIGMA = 5.670374419e-8;
const K0 = 273.15;

const T = (c: number, k: number, emissivity: number, source: string): ThermalProps => ({ c, k, emissivity, source });

const BY_ID: Record<string, ThermalProps> = {
  'steel.a36': T(486, 51.9, 0.8, 'MatWeb ASTM A36: c 0.486 J/g K, k 51.9 W/m K; emissivity of mill-scale steel 0.7-0.85'),
  'steel.1018-cd': T(486, 51.9, 0.6, 'MatWeb AISI 1018: c 0.486 J/g K, k 51.9 W/m K; cold-drawn surface 0.5-0.7'),
  'steel.4140-ann': T(473, 42.6, 0.7, 'MatWeb AISI 4140 annealed: c 0.473 J/g K, k 42.6 W/m K'),
  'steel.52100': T(475, 46.6, 0.3, 'MatWeb AISI 52100: c 0.475 J/g K, k 46.6 W/m K; polished 0.1-0.3'),
  'steel.music-wire': T(486, 50, 0.4, 'MatWeb high-carbon spring steel (typical)'),
  'stainless.304': T(500, 16.2, 0.4, 'MatWeb 304 annealed: c 0.500 J/g K, k 16.2 W/m K; 2B finish 0.3-0.45'),
  'stainless.316': T(500, 16.3, 0.4, 'MatWeb 316 annealed: c 0.500 J/g K, k 16.3 W/m K'),
  'cast-iron.gray-30': T(490, 47, 0.8, 'ASM Handbook vol. 1, gray iron class 30: k 46-54 W/m K; c 0.49 J/g K'),
  'aluminum.6061-t6': T(896, 167, 0.1, 'ASM / MatWeb 6061-T6: c 0.896 J/g K, k 167 W/m K; as-rolled 0.05-0.2'),
  'aluminum.7075-t6': T(960, 130, 0.1, 'ASM / MatWeb 7075-T6: c 0.960 J/g K, k 130 W/m K'),
  'aluminum.5052-h32': T(880, 138, 0.1, 'ASM / MatWeb 5052-H32: c 0.880 J/g K, k 138 W/m K'),
  'aluminum.2024-t3': T(875, 121, 0.1, 'ASM / MatWeb 2024-T3: c 0.875 J/g K, k 121 W/m K'),
  'copper.c110': T(385, 388, 0.1, 'CDA C11000: c 0.385 J/g K, k 388 W/m K'),
  'brass.c360': T(380, 115, 0.2, 'CDA C36000: c 0.380 J/g K, k 115 W/m K'),
  'titanium.ti6al4v': T(526, 6.7, 0.3, 'ASM / MatWeb Ti-6Al-4V annealed: c 0.526 J/g K, k 6.7 W/m K'),
  'wood.birch-plywood': T(1600, 0.15, 0.9, 'EN ISO 10456 plywood 600-700 kg/m3: k 0.15-0.17 W/m K, c 1600 J/kg K'),
  'wood.mdf': T(1700, 0.14, 0.9, 'EN ISO 10456 MDF 750 kg/m3: k 0.14 W/m K, c 1700 J/kg K'),
  'polymer.abs': T(1400, 0.17, 0.9, 'MatWeb ABS typical: c 1.3-1.5 J/g K, k 0.13-0.20 W/m K'),
  'polymer.pla': T(1800, 0.13, 0.9, 'NatureWorks / MatWeb PLA: c 1.6-2.0 J/g K, k 0.13 W/m K'),
  'polymer.nylon66': T(1670, 0.25, 0.9, 'MatWeb nylon 6/6 dry: c 1.67 J/g K, k 0.25 W/m K'),
  'polymer.pom': T(1470, 0.31, 0.9, 'MatWeb acetal homopolymer: c 1.47 J/g K, k 0.31 W/m K'),
  'polymer.pc': T(1200, 0.2, 0.9, 'MatWeb polycarbonate: c 1.2 J/g K, k 0.20 W/m K'),
  'polymer.hdpe': T(1900, 0.48, 0.9, 'MatWeb HDPE: c 1.9 J/g K, k 0.45-0.52 W/m K'),
  'polymer.ptfe': T(1000, 0.25, 0.9, 'MatWeb PTFE: c 1.0 J/g K, k 0.25 W/m K'),
  'polymer.pmma': T(1470, 0.19, 0.9, 'MatWeb PMMA: c 1.47 J/g K, k 0.19 W/m K'),
  'polymer.phenolic': T(1400, 0.25, 0.9, 'MatWeb cast phenolic: c 1.4-1.7 J/g K, k 0.2-0.3 W/m K'),
  'rubber.natural': T(1880, 0.13, 0.9, 'Engineering Toolbox, natural rubber: c 1.88 J/g K, k 0.13 W/m K'),
  'glass.soda-lime': T(840, 1.0, 0.92, 'CRC Handbook, soda-lime glass: c 0.84 J/g K, k 0.96-1.05 W/m K; emissivity 0.92'),
  'concrete.c30': T(900, 1.8, 0.9, 'EN 1992-1-2 3.3: c 900 J/kg K at 20 C; k 1.33-1.95 W/m K'),
  'ceramic.clay-brick': T(840, 0.8, 0.9, 'EN ISO 10456 / CIBSE Guide A, solid clay brick: k 0.6-1.0 W/m K, c 840 J/kg K'),
  'stone.slate': T(760, 2.0, 0.9, 'Engineering Toolbox, slate: c 0.76 J/g K, k 1.7-2.1 W/m K'),
  'stone.granite': T(790, 2.8, 0.45, 'Engineering Toolbox, granite: c 0.79 J/g K, k 1.7-4.0 W/m K; polished 0.45'),
  'stone.marble': T(880, 2.8, 0.9, 'Engineering Toolbox, marble: c 0.88 J/g K, k 2.1-2.9 W/m K'),
  'textile.baize': T(1360, 0.04, 0.9, 'Engineering Toolbox, wool: c 1.36 J/g K; felt k 0.04 W/m K'),
  'textile.canvas': T(1300, 0.06, 0.9, 'Engineering Toolbox, cotton: c 1.3 J/g K; cloth k 0.04-0.08 W/m K'),
  'leather.veg-tan': T(1500, 0.16, 0.9, 'Engineering Toolbox, leather: c 1.5 J/g K, k 0.14-0.17 W/m K (estimated)'),
  'foam.eva': T(2000, 0.04, 0.9, 'Closed-cell EVA foam 100 kg/m3: k 0.035-0.045 W/m K, c 2.0 J/g K (estimated)'),
  'cork.agglomerated': T(1900, 0.045, 0.9, 'EN ISO 10456 expanded cork: k 0.04-0.05 W/m K; c 1.5-2.0 J/g K'),
  'composite.cfrp': T(1000, 5, 0.85, 'Quasi-isotropic carbon/epoxy: c 0.8-1.1 J/g K, in-plane k 3-7 W/m K (estimated)'),
  'composite.gfrp': T(950, 0.35, 0.9, 'E-glass/epoxy: c 0.9-1.0 J/g K, k 0.3-0.4 W/m K (estimated)'),
};

/** Wood at 12% moisture: Wood Handbook ch. 4 (FPL-GTR-282), from the wood's specific gravity. */
function woodThermal(G: number): ThermalProps {
  const mc = 12;
  // conductivity across the grain, eq. 4-7: k = G (B + C MC) + A
  const k = G * (0.1941 + 0.004064 * mc) + 0.01864;
  // specific heat: dry wood at 20 C (eq. 4-11), plus water and the bound-water adjustment (eq. 4-12, 4-13)
  const Tk = AMBIENT + K0;
  const c0 = 0.1031 + 0.003867 * Tk; // kJ/(kg K)
  const u = mc / 100;
  const Ac = u * (-0.06191 + 2.36e-4 * Tk - 1.33e-4 * u);
  const c = ((c0 + 4.185 * u) / (1 + u) + Ac) * 1000;
  return { c, k, emissivity: 0.9, source: 'USDA Wood Handbook FPL-GTR-282 ch. 4, eqs. 4-7, 4-11 to 4-13, at 12% MC' };
}

/** The thermal properties of a material. */
export function thermalOf(m: Material): ThermalProps {
  const t = BY_ID[m.id];
  if (t) return t;
  if (m.category === 'wood' && m.specificGravity) return woodThermal(m.specificGravity);
  if (m.category === 'magnet') return m.id.includes('ferrite')
    ? T(800, 4, 0.9, 'Ferrite magnet vendor data: c 0.8 J/g K, k 4 W/m K')
    : T(440, 7.6, 0.4, 'NdFeB vendor data (e.g. Arnold): c 0.44 J/g K, k 7.6-9 W/m K; nickel plated');
  throw new Error(`no thermal data for ${m.id}`);
}

/**
 * Of heat made at a contact, the share that goes into side A: Blok's partition by thermal effusivity sqrt(k rho c).
 * The surface that soaks heat away faster takes more of it (steel on wood: the steel takes about 95%).
 */
export function heatShare(a: Material, b: Material | null): number {
  if (!b) return 0.5;
  const ea = Math.sqrt(thermalOf(a).k * a.density * thermalOf(a).c), eb = Math.sqrt(thermalOf(b).k * b.density * thermalOf(b).c);
  return ea / (ea + eb);
}

/** Of plastic work, the share that becomes heat (the rest is stored in the metal's dislocations): Taylor-Quinney. */
export const TAYLOR_QUINNEY = 0.9;

/**
 * Heat a part loses to still room air, W: natural convection (the simplified laminar air correlation for a surface
 * of size L, h = 1.42 (dT / L)^0.25, Holman, Heat Transfer, table 7-2) plus radiation to the room (eps sigma (T^4 -
 * Ta^4)). `area` in m^2, `L` in m.
 */
export function heatLoss(t: number, area: number, L: number, emissivity: number, ambient = AMBIENT): number {
  const dT = t - ambient;
  if (dT === 0) return 0;
  const h = 1.42 * Math.pow(Math.abs(dT) / Math.max(L, 0.01), 0.25);
  const conv = h * area * dT;
  const rad = emissivity * SIGMA * area * ((t + K0) ** 4 - (ambient + K0) ** 4);
  return conv + rad;
}

/**
 * The temperature of a part after `dt` seconds absorbing `power` W and cooling to the room, lumped (one temperature
 * for the part: fair while its Biot number is small, as for anything metal; for wood the surface runs hotter than
 * this). Steps in sub-intervals short against the cooling time, so it never overshoots the room.
 */
export function warm(t: number, heat: number, mass: number, c: number, area: number, L: number, emissivity: number, dt: number): number {
  const C = mass * c;
  if (!(C > 0)) return t;
  let T = t + heat / C;
  // cooling, stable at any dt: never more than the gap to the room in one sub-step
  let left = dt;
  while (left > 0) {
    const q = heatLoss(T, area, L, emissivity);
    if (q === 0) break;
    const rate = Math.abs(q) / C;
    const step = Math.min(left, (0.1 * Math.abs(T - AMBIENT)) / Math.max(rate, 1e-12));
    const next = T - (q / C) * step;
    T = (next - AMBIENT) * (T - AMBIENT) <= 0 ? AMBIENT : next;
    left -= step;
    if (Math.abs(T - AMBIENT) < 1e-4) { T = AMBIENT; break; }
  }
  return T;
}

/** The Draper point: below it nothing visibly glows in daylight-dim light. */
export const DRAPER = 525;

/**
 * What a hot surface looks like: the colour of a black body at t (deg C), with how bright it is against its own
 * colour (0 below the Draper point, 1 at white heat). Colour from Planck's law integrated against the CIE 1931
 * colour matching functions, tabulated (Mitchell Charity, blackbody colour datafile, 2 deg observer).
 */
export function glow(t: number): { color: number; intensity: number } {
  if (t < DRAPER) return { color: 0x000000, intensity: 0 };
  // [deg C, sRGB]: 1000 K (dimmer below it, the same hue), 1200 K, 1400 K ... 3500 K
  const table: [number, number][] = [
    [DRAPER, 0xff3800], [727, 0xff3800], [927, 0xff5300], [1127, 0xff6500], [1327, 0xff7300], [1527, 0xff7e00],
    [1727, 0xff8912], [2127, 0xff9d3f], [2727, 0xffb46b], [3227, 0xffc489],
  ];
  let color = table[table.length - 1]![1];
  for (let i = 0; i < table.length - 1; i++) {
    const [ta, ca] = table[i]!, [tb, cb] = table[i + 1]!;
    if (t <= tb) {
      const f = Math.max(0, (t - ta) / (tb - ta));
      const ch = (c: number, s: number) => (c >> s) & 255;
      const mix = (s: number) => Math.round(ch(ca, s) + (ch(cb, s) - ch(ca, s)) * f);
      color = (mix(16) << 16) | (mix(8) << 8) | mix(0);
      break;
    }
  }
  // radiance grows as T^4 (Stefan-Boltzmann); the eye sees about its log, from dull red at the Draper point
  const intensity = Math.min(1, Math.log((t + K0) ** 4 / (DRAPER + K0) ** 4) / Math.log((1500 + K0) ** 4 / (DRAPER + K0) ** 4));
  return { color, intensity: Math.max(0.05, intensity) };
}

/** Wood darkens and chars from about 300 deg C (pyrolysis; Wood Handbook ch. 18). */
export const CHAR = 300;

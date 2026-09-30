// Welds, rivets, solder and adhesives: capacities from real specs.

export type WeldClass = 'steel' | 'stainless' | 'aluminum' | 'copper' | 'titanium' | 'none';

/** Which base-metal families can be fusion welded to each other. */
export function weldable(a: WeldClass, b: WeldClass) {
  if (a === 'none' || b === 'none') return false;
  if (a === b) return true;
  // Carbon steel to austenitic stainless is routine with 309 filler; everything else dissimilar is not fusion-weldable.
  const pair = [a, b].sort().join('+');
  return pair === 'stainless+steel';
}

export interface Filler {
  id: string;
  label: string;
  /** Weld metal tensile strength (classification) F_EXX, Pa. */
  Fexx: number;
  source: string;
}

export const FILLERS: Record<string, Filler> = {
  E60: { id: 'E60', label: 'E60xx (stick)', Fexx: 414e6, source: 'AWS A5.1 classification' },
  E70: { id: 'E70', label: 'E70xx / ER70S-6 (MIG)', Fexx: 483e6, source: 'AWS A5.1 / A5.18 classification' },
  E80: { id: 'E80', label: 'E80xx', Fexx: 552e6, source: 'AWS A5.5 classification' },
  ER308L: { id: 'ER308L', label: 'ER308L stainless', Fexx: 520e6, source: 'AWS A5.9 typical as-deposited' },
  ER309L: { id: 'ER309L', label: 'ER309L (steel to stainless)', Fexx: 520e6, source: 'AWS A5.9 minimum tensile, 309L' },
  ER4043: { id: 'ER4043', label: 'ER4043 aluminium', Fexx: 165e6, source: 'AWS D1.2 min. as-welded 6061 w/ 4043' },
  ER5356: { id: 'ER5356', label: 'ER5356 aluminium', Fexx: 207e6, source: 'AWS D1.2 typical' },
  ERCu: { id: 'ERCu', label: 'ERCu deoxidised copper', Fexx: 170e6, source: 'AWS A5.7 ERCu, typical as-welded (estimated)' },
  'ERTi-5': { id: 'ERTi-5', label: 'ERTi-5 (Ti-6Al-4V)', Fexx: 895e6, source: 'AWS A5.16 ERTi-5, matching Ti-6Al-4V (estimated)' },
};

/**
 * Fillers that make a sound weld between two base-metal families, the usual choice first. Carbon-steel wire on
 * stainless dilutes into brittle martensite; steel to stainless takes over-alloyed 309L (Schaeffler diagram).
 */
export function fillersFor(a: WeldClass, b: WeldClass): string[] {
  const has = (c: WeldClass) => a === c || b === c;
  if (!weldable(a, b)) return [];
  if (has('aluminum')) return ['ER4043', 'ER5356'];
  if (has('copper')) return ['ERCu'];
  if (has('titanium')) return ['ERTi-5'];
  if (a === 'stainless' && b === 'stainless') return ['ER308L', 'ER309L'];
  if (has('stainless')) return ['ER309L'];
  return ['E70', 'E60', 'E80'];
}

/**
 * Nominal shear capacity of a fillet weld: R = 0.707 a L (0.6 F_EXX) (AWS D1.1 / AISC J2.4, without phi).
 * The weaker of weld metal and heat-affected base metal governs.
 */
export function filletWeldCapacity(leg: number, length: number, Fexx: number, baseUltimateHaz: number) {
  const throat = 0.7071 * leg;
  return throat * length * 0.6 * Math.min(Fexx, baseUltimateHaz);
}

/** Heat input Q = eta V I / v, J/m (process efficiency eta: GMAW 0.8, GTAW 0.6, SMAW 0.8). */
export function heatInput(eta: number, volts: number, amps: number, travelSpeed: number) {
  return (eta * volts * amps) / Math.max(travelSpeed, 1e-4);
}

/**
 * Weld quality factor from heat input vs the band suitable for the plate thickness.
 * The band (about 0.1-0.3 kJ/mm per mm of plate for steel) is a shop rule of thumb: estimated.
 * Too cold -> lack of fusion (q < 1). Too hot on thin plate -> burn-through (reported separately).
 */
export function weldQuality(Q: number, plateThickness: number) {
  const tmm = plateThickness * 1000;
  const lo = 100 * tmm; // J/mm per mm
  const hi = 300 * tmm;
  const qJmm = Q / 1000;
  if (qJmm < lo) return { quality: Math.max(0.05, qJmm / lo), burnThrough: false };
  if (qJmm > hi * 2.5 && tmm < 3) return { quality: 0.3, burnThrough: true };
  return { quality: 1, burnThrough: false };
}

/** Shear capacity of n solid rivets: n tau_u pi d^2 / 4, with tau_u ~ 0.6 sigma_u unless given. */
export function rivetShear(n: number, d: number, rivetUltimate: number, shearUltimate?: number) {
  const tau = shearUltimate ?? 0.6 * rivetUltimate;
  return n * tau * (Math.PI / 4) * d * d;
}

/** Blind (pop) rivets have a hollow shank; tension is limited by head pull-off (estimated factors). */
export function blindRivet(n: number, d: number, rivetUltimate: number) {
  const shear = 0.8 * rivetShear(n, d, rivetUltimate);
  return { shear, tension: 0.65 * shear };
}

export interface Adhesive {
  id: string;
  label: string;
  /** Lap shear strength on a suitable substrate, Pa. */
  lapShear: number;
  /** Peel strength, N per metre of bond width. */
  peel: number;
  /** Cure time constant: strength fraction = 1 - exp(-t / tau), seconds. */
  cureTau: number;
  /** Maximum gap it can fill, m. */
  gapFill: number;
  /** Cured film modulus, Pa, and a typical bond-line thickness, m: how stiffly the layer holds the adherends. */
  modulus: number;
  bondline: number;
  /** Substrate families with poor adhesion (strength x 0.05). */
  poorOn: string[];
  /** Substrate families it is specifically suited to (full strength); empty = general purpose. */
  onlyOn: string[];
  source: string;
}

export const ADHESIVES: Record<string, Adhesive> = {
  'epoxy-structural': {
    id: 'epoxy-structural', label: 'Structural epoxy (24 h)', lapShear: 25e6, peel: 4000, cureTau: 6 * 3600,
    modulus: 2.5e9, bondline: 0.0002, gapFill: 0.003, poorOn: ['polyolefin', 'ptfe'], onlyOn: [], source: 'typical 2K epoxy TDS range 20-30 MPa (estimated midpoint)',
  },
  'epoxy-5min': {
    id: 'epoxy-5min', label: '5-minute epoxy', lapShear: 12e6, peel: 2000, cureTau: 20 * 60,
    modulus: 2e9, bondline: 0.0002, gapFill: 0.002, poorOn: ['polyolefin', 'ptfe'], onlyOn: [], source: 'typical fast epoxy TDS range 8-15 MPa (estimated)',
  },
  cyanoacrylate: {
    id: 'cyanoacrylate', label: 'Cyanoacrylate (super glue)', lapShear: 18e6, peel: 500, cureTau: 30,
    modulus: 1.5e9, bondline: 0.00005, gapFill: 0.0002, poorOn: ['polyolefin', 'ptfe'], onlyOn: [], source: 'typical ethyl-CA TDS 15-25 MPa on steel (estimated)',
  },
  'pva-wood': {
    id: 'pva-wood', label: 'PVA wood glue', lapShear: 8e6, peel: 2000, cureTau: 2 * 3600,
    modulus: 1e9, bondline: 0.0001, gapFill: 0.0005, poorOn: [], onlyOn: ['wood', 'engineered-wood'], source: 'typical PVA TDS, often exceeds wood shear (estimated)',
  },
  'pu-construction': {
    id: 'pu-construction', label: 'PU construction adhesive', lapShear: 3e6, peel: 3000, cureTau: 12 * 3600,
    modulus: 50e6, bondline: 0.001, gapFill: 0.006, poorOn: ['ptfe'], onlyOn: [], source: 'typical PU construction adhesive TDS (estimated)',
  },
  'hot-melt': {
    id: 'hot-melt', label: 'Hot-melt EVA', lapShear: 2e6, peel: 2000, cureTau: 20,
    modulus: 30e6, bondline: 0.0005, gapFill: 0.003, poorOn: ['ptfe'], onlyOn: [], source: 'typical EVA hot melt (estimated)',
  },
  'silicone-rtv': {
    id: 'silicone-rtv', label: 'Silicone RTV', lapShear: 1.5e6, peel: 3000, cureTau: 12 * 3600,
    modulus: 2e6, bondline: 0.001, gapFill: 0.006, poorOn: ['ptfe'], onlyOn: [], source: 'typical RTV TDS (estimated)',
  },
  mortar: {
    id: 'mortar', label: 'Masonry mortar (Type N)', lapShear: 0.4e6, peel: 150, cureTau: 24 * 3600,
    modulus: 5e9, bondline: 0.01, gapFill: 0.02, poorOn: ['ptfe', 'polyolefin', 'metal'], onlyOn: ['ceramic', 'stone'], source: 'ASTM C270 Type N; bond shear 0.3-0.5 MPa typical (estimated)',
  },
  'foam-tape': {
    id: 'foam-tape', label: 'Acrylic foam tape', lapShear: 0.5e6, peel: 3000, cureTau: 60,
    modulus: 1e6, bondline: 0.001, gapFill: 0.001, poorOn: ['ptfe', 'polyolefin'], onlyOn: [], source: 'typical acrylic foam tape TDS ~0.5 MPa (estimated)',
  },
};

/** Strength fraction reached after t seconds (clock-scaled by the caller). */
export const cureFraction = (a: Adhesive, t: number) => (t <= 0 ? 0 : 1 - Math.exp(-t / a.cureTau));

/** Substrate multiplier for an adhesive on a given material category. */
export function substrateFactor(a: Adhesive, category: string) {
  if (a.poorOn.includes(category)) return 0.05;
  if (a.onlyOn.length > 0 && !a.onlyOn.includes(category)) return 0.1;
  return 1;
}

/**
 * How far into a bond line a load applied at its edge reaches, m: 1/beta of an adherend (modulus E, thickness t) on
 * the adhesive layer as an elastic foundation, beta^4 = (Ea / ta) / (4 E I), I = t^3 / 12 per unit width
 * (Hetenyi; Goland-Reissner). A stiff, thick part spreads the load over the whole face; a thin sheet concentrates it
 * at the edge, where the bond peels.
 */
export function bondEdgeLength(E: number, t: number, a: Adhesive) {
  const beta = Math.pow(a.modulus / a.bondline / ((E * t ** 3) / 3), 0.25);
  return 1 / beta;
}

/**
 * Capacities of a rectangular bond b x d with lap shear tau and peel p (N/m): shear = tau A; tension ~ 0.7 tau A.
 * Bending: rigid parts load the face linearly, M = sigma long short^2 / 6 with sigma = 0.7 tau. A flexible part
 * (edge length `edge` shorter than the face) loads only an edge strip, M = long short sigma edge / 2, never below
 * the measured peel line load p (thin-sheet peel test). The blend between the two is estimated.
 */
export function bondCapacities(b: number, d: number, tau: number, peel: number, edge = Infinity) {
  const A = b * d;
  const shear = tau * A;
  const tension = 0.7 * shear;
  const long = Math.max(b, d), short = Math.min(b, d);
  const sigma = 0.7 * tau;
  const lineLoad = Math.min((sigma * short) / 6, Math.max(peel / 2, (sigma * edge) / 2));
  const r = Math.hypot(b, d) / 2;
  const torsion = tau * A * r * 0.5;
  return { shear, tension, bending: long * short * lineLoad + 1e-9, torsion };
}

export interface Solder {
  id: string;
  label: string;
  shear: number;
  liquidus: number;
  source: string;
}

export const SOLDERS: Record<string, Solder> = {
  'sn63pb37': { id: 'sn63pb37', label: 'Sn63/Pb37', shear: 37e6, liquidus: 456, source: 'typical bulk shear, NIST solder data (estimated)' },
  sac305: { id: 'sac305', label: 'SAC305 (lead-free)', shear: 40e6, liquidus: 493, source: 'typical bulk shear (estimated)' },
};

/** Base metals that solder wets with ordinary rosin flux. */
export const SOLDERABLE = new Set(['copper-alloy', 'steel', 'stainless']);

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


export interface Solder {
  id: string;
  label: string;
  shear: number;
  liquidus: number;
  source: string;
}

/** Base metals that solder wets with ordinary rosin flux. */

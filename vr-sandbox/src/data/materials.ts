// Material catalog. Values are typical handbook properties; every entry names its source and confidence.
// SI units: density kg/m^3, moduli and strengths Pa, conductivity S/m, elongation as a fraction.
// `friction` is the same-material coefficient. Cross-material pairs use the geometric mean (Jolt's default
// combine), and the per-material values are chosen so common cross pairs land in their published ranges.

import type { WeldClass } from '../engineering/joining';

export type MaterialCategory =
  | 'steel' | 'stainless' | 'cast-iron' | 'aluminum' | 'copper-alloy' | 'titanium'
  | 'wood' | 'engineered-wood' | 'polymer' | 'polyolefin' | 'ptfe' | 'elastomer'
  | 'glass' | 'ceramic' | 'stone' | 'textile' | 'leather' | 'foam' | 'cork' | 'composite' | 'magnet';

export type SoundClass = 'steel' | 'aluminum' | 'copper' | 'wood' | 'plastic' | 'rubber' | 'glass' | 'stone';
export type SparkClass = 'low-carbon' | 'high-carbon' | 'stainless' | 'cast-iron' | 'titanium' | 'none';

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  density: number;
  E: number;
  nu: number;
  /** Yield strength (0.2% proof). Brittle materials: equal to ultimate. */
  yield: number;
  /** Ultimate tensile strength. Wood: modulus of rupture (bending) parallel to grain. */
  ultimate: number;
  /** Elongation at break (fraction). */
  elongation: number;
  ductile: boolean;
  ferromagnetic: boolean;
  /** Electrical conductivity, S/m (eddy currents). */
  conductivity: number;
  weld: WeldClass;
  friction: number;
  restitution: number;
  sound: SoundClass;
  /** Structural loss factor (modal damping) for impact audio. */
  loss: number;
  sparks: SparkClass;
  /** Wood only: specific gravity (oven-dry weight, volume at 12% MC). */
  specificGravity?: number;
  /** Wood only: strength perpendicular to grain as a fraction of `ultimate`. */
  crossGrainFactor?: number;
  /** Magnet materials: remanence, T. */
  remanence?: number;
  color: number;
  metalness: number;
  roughness: number;
  source: string;
  confidence: 'spec' | 'handbook' | 'estimated';
}

const MPa = 1e6;
const GPa = 1e9;

const metal = {
  ductile: true,
  loss: 0.0005,
  restitution: 0.55,
};

export const MATERIALS: Material[] = [
  // ---- Steels -------------------------------------------------------------------------------------
  {
    ...metal, id: 'steel.a36', name: 'Structural steel ASTM A36', category: 'steel', density: 7850, E: 200 * GPa, nu: 0.26,
    yield: 250 * MPa, ultimate: 400 * MPa, elongation: 0.2, ferromagnetic: true, conductivity: 6.0e6, weld: 'steel',
    friction: 0.62, sound: 'steel', sparks: 'low-carbon', color: 0x6d7278, metalness: 0.85, roughness: 0.45,
    source: 'ASTM A36/A36M minimums; MatWeb typical', confidence: 'spec',
  },
  {
    ...metal, id: 'steel.1018-cd', name: 'Steel AISI 1018 cold drawn', category: 'steel', density: 7870, E: 205 * GPa, nu: 0.29,
    yield: 370 * MPa, ultimate: 440 * MPa, elongation: 0.15, ferromagnetic: true, conductivity: 5.8e6, weld: 'steel',
    friction: 0.62, sound: 'steel', sparks: 'low-carbon', color: 0x8a9096, metalness: 0.9, roughness: 0.35,
    source: 'ASM Handbook vol. 1; MatWeb AISI 1018 CD typical', confidence: 'handbook',
  },
  {
    ...metal, id: 'steel.4140-ann', name: 'Steel AISI 4140 annealed', category: 'steel', density: 7850, E: 205 * GPa, nu: 0.29,
    yield: 415 * MPa, ultimate: 655 * MPa, elongation: 0.257, ferromagnetic: true, conductivity: 4.5e6, weld: 'steel',
    friction: 0.62, sound: 'steel', sparks: 'high-carbon', color: 0x7b8087, metalness: 0.9, roughness: 0.3,
    source: 'ASM Handbook vol. 1; MatWeb AISI 4140 annealed', confidence: 'handbook',
  },
  {
    ...metal, id: 'steel.52100', name: 'Chrome steel 52100 (bearing balls)', category: 'steel', density: 7810, E: 210 * GPa, nu: 0.3,
    yield: 2000 * MPa, ultimate: 2240 * MPa, elongation: 0.01, ductile: false, ferromagnetic: true, conductivity: 4.0e6, weld: 'none',
    friction: 0.5, restitution: 0.92, loss: 0.0002, sound: 'steel', sparks: 'high-carbon', color: 0xc8ccd0, metalness: 1, roughness: 0.08,
    source: 'MatWeb AISI 52100 hardened; restitution of hardened steel balls (estimated)', confidence: 'handbook',
  },
  {
    ...metal, id: 'steel.music-wire', name: 'Music wire ASTM A228', category: 'steel', density: 7850, E: 203.4 * GPa, nu: 0.29,
    yield: 1600 * MPa, ultimate: 2000 * MPa, elongation: 0.05, ferromagnetic: true, conductivity: 5.0e6, weld: 'none',
    friction: 0.55, sound: 'steel', sparks: 'high-carbon', color: 0xa9adb2, metalness: 1, roughness: 0.2,
    source: 'Shigley Table 10-4 (S_ut = 2211/d^0.145 MPa; value shown for ~2 mm)', confidence: 'handbook',
  },
  {
    ...metal, id: 'stainless.304', name: 'Stainless 304 annealed', category: 'stainless', density: 8000, E: 193 * GPa, nu: 0.29,
    yield: 215 * MPa, ultimate: 505 * MPa, elongation: 0.7, ferromagnetic: false, conductivity: 1.4e6, weld: 'stainless',
    friction: 0.6, sound: 'steel', sparks: 'stainless', color: 0xb4b8bc, metalness: 1, roughness: 0.25,
    source: 'ASTM A240 minimums; MatWeb 304 annealed', confidence: 'spec',
  },
  {
    ...metal, id: 'stainless.316', name: 'Stainless 316 annealed', category: 'stainless', density: 8000, E: 193 * GPa, nu: 0.3,
    yield: 205 * MPa, ultimate: 515 * MPa, elongation: 0.6, ferromagnetic: false, conductivity: 1.35e6, weld: 'stainless',
    friction: 0.6, sound: 'steel', sparks: 'stainless', color: 0xb0b5ba, metalness: 1, roughness: 0.25,
    source: 'ASTM A240 minimums; MatWeb 316 annealed', confidence: 'spec',
  },
  {
    ...metal, id: 'cast-iron.gray-30', name: 'Grey cast iron, class 30', category: 'cast-iron', density: 7200, E: 100 * GPa, nu: 0.26,
    yield: 214 * MPa, ultimate: 214 * MPa, elongation: 0.005, ductile: false, ferromagnetic: true, conductivity: 1.5e6, weld: 'none',
    friction: 0.4, restitution: 0.4, loss: 0.005, sound: 'stone', sparks: 'cast-iron', color: 0x4d5054, metalness: 0.6, roughness: 0.7,
    source: 'ASTM A48 class 30; ASM Handbook vol. 1 (brittle)', confidence: 'handbook',
  },
  // ---- Aluminium ----------------------------------------------------------------------------------
  {
    ...metal, id: 'aluminum.6061-t6', name: 'Aluminium 6061-T6', category: 'aluminum', density: 2700, E: 68.9 * GPa, nu: 0.33,
    yield: 276 * MPa, ultimate: 310 * MPa, elongation: 0.12, ferromagnetic: false, conductivity: 2.5e7, weld: 'aluminum',
    friction: 0.8, sound: 'aluminum', sparks: 'none', color: 0xc0c4c8, metalness: 0.9, roughness: 0.35,
    source: 'ASM Aluminum Standards and Data; MatWeb 6061-T6', confidence: 'handbook',
  },
  {
    ...metal, id: 'aluminum.7075-t6', name: 'Aluminium 7075-T6', category: 'aluminum', density: 2810, E: 71.7 * GPa, nu: 0.33,
    yield: 503 * MPa, ultimate: 572 * MPa, elongation: 0.11, ferromagnetic: false, conductivity: 1.9e7, weld: 'none',
    friction: 0.8, sound: 'aluminum', sparks: 'none', color: 0xb8bcc2, metalness: 0.9, roughness: 0.3,
    source: 'ASM Aluminum Standards and Data; MatWeb 7075-T6 (not fusion weldable)', confidence: 'handbook',
  },
  {
    ...metal, id: 'aluminum.5052-h32', name: 'Aluminium 5052-H32', category: 'aluminum', density: 2680, E: 70.3 * GPa, nu: 0.33,
    yield: 193 * MPa, ultimate: 228 * MPa, elongation: 0.12, ferromagnetic: false, conductivity: 2.0e7, weld: 'aluminum',
    friction: 0.8, sound: 'aluminum', sparks: 'none', color: 0xc6c9cc, metalness: 0.85, roughness: 0.4,
    source: 'ASM Aluminum Standards and Data; MatWeb 5052-H32', confidence: 'handbook',
  },
  {
    ...metal, id: 'aluminum.2024-t3', name: 'Aluminium 2024-T3', category: 'aluminum', density: 2780, E: 73.1 * GPa, nu: 0.33,
    yield: 345 * MPa, ultimate: 483 * MPa, elongation: 0.18, ferromagnetic: false, conductivity: 1.7e7, weld: 'none',
    friction: 0.8, sound: 'aluminum', sparks: 'none', color: 0xbcc0c5, metalness: 0.9, roughness: 0.3,
    source: 'ASM Aluminum Standards and Data; MatWeb 2024-T3', confidence: 'handbook',
  },
  // ---- Copper alloys, titanium --------------------------------------------------------------------
  {
    ...metal, id: 'copper.c110', name: 'Copper C110 annealed', category: 'copper-alloy', density: 8890, E: 115 * GPa, nu: 0.31,
    yield: 69 * MPa, ultimate: 220 * MPa, elongation: 0.5, ferromagnetic: false, conductivity: 5.8e7, weld: 'copper',
    friction: 0.75, sound: 'copper', sparks: 'none', color: 0xb87333, metalness: 1, roughness: 0.3,
    source: 'CDA / MatWeb C11000 annealed (100% IACS)', confidence: 'handbook',
  },
  {
    ...metal, id: 'brass.c360', name: 'Brass C360 half hard', category: 'copper-alloy', density: 8500, E: 97 * GPa, nu: 0.31,
    yield: 310 * MPa, ultimate: 385 * MPa, elongation: 0.25, ferromagnetic: false, conductivity: 1.5e7, weld: 'none',
    friction: 0.55, sound: 'copper', sparks: 'none', color: 0xc9a44a, metalness: 1, roughness: 0.3,
    source: 'CDA / MatWeb C36000 H02 (temper-dependent range)', confidence: 'handbook',
  },
  {
    ...metal, id: 'titanium.ti6al4v', name: 'Titanium Ti-6Al-4V annealed', category: 'titanium', density: 4430, E: 113.8 * GPa, nu: 0.34,
    yield: 880 * MPa, ultimate: 950 * MPa, elongation: 0.14, ferromagnetic: false, conductivity: 5.8e5, weld: 'titanium',
    friction: 0.5, sound: 'steel', sparks: 'titanium', color: 0x8e9196, metalness: 0.9, roughness: 0.35,
    source: 'ASM Materials Properties Handbook: Titanium Alloys; MatWeb', confidence: 'handbook',
  },
  // ---- Wood (USDA Wood Handbook FPL-GTR-282, ch. 5, clear wood at 12% MC) ---------------------------
  wood('wood.douglas-fir', 'Douglas-fir (coast)', 0.48, 530, 13.4, 85, 0xc89a62),
  wood('wood.southern-pine', 'Southern pine (loblolly)', 0.51, 570, 12.3, 88, 0xd8b074),
  wood('wood.white-pine', 'Eastern white pine', 0.35, 400, 8.5, 59, 0xe2c48e),
  wood('wood.red-oak', 'Northern red oak', 0.63, 700, 12.5, 99, 0xb07a4f),
  wood('wood.white-oak', 'White oak', 0.68, 750, 12.3, 105, 0xa98a5f),
  wood('wood.hard-maple', 'Hard (sugar) maple', 0.63, 700, 12.6, 109, 0xe0c9a0),
  wood('wood.balsa', 'Balsa', 0.16, 160, 3.4, 21, 0xefe0b9, 'estimated'),
  {
    id: 'wood.birch-plywood', name: 'Birch plywood', category: 'engineered-wood', density: 680, E: 9 * GPa, nu: 0.3,
    yield: 40 * MPa, ultimate: 40 * MPa, elongation: 0.01, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.45, restitution: 0.35, sound: 'wood', loss: 0.012, sparks: 'none', specificGravity: 0.62, crossGrainFactor: 0.6,
    color: 0xd9b98a, metalness: 0, roughness: 0.75, source: 'Typical birch plywood panel data (estimated)', confidence: 'estimated',
  },
  {
    id: 'wood.mdf', name: 'MDF', category: 'engineered-wood', density: 750, E: 3.5 * GPa, nu: 0.25,
    yield: 30 * MPa, ultimate: 30 * MPa, elongation: 0.01, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.45, restitution: 0.3, sound: 'wood', loss: 0.02, sparks: 'none', specificGravity: 0.72, crossGrainFactor: 1,
    color: 0xb59a78, metalness: 0, roughness: 0.85, source: 'EN 622-5 MDF typical (estimated)', confidence: 'estimated',
  },
  // ---- Polymers -----------------------------------------------------------------------------------
  polymer('polymer.abs', 'ABS', 'polymer', 1050, 2.2, 40, 40, 0.1, 0.5, 0xe8e2d0),
  polymer('polymer.pla', 'PLA', 'polymer', 1240, 3.5, 55, 55, 0.05, 0.45, 0xf0f0f0),
  polymer('polymer.nylon66', 'Nylon 6/6 (dry)', 'polymer', 1140, 2.8, 80, 80, 0.3, 0.3, 0xf2eee0),
  polymer('polymer.pom', 'Acetal (POM)', 'polymer', 1410, 3.0, 70, 70, 0.3, 0.2, 0xfaf8f2),
  polymer('polymer.pc', 'Polycarbonate', 'polymer', 1200, 2.4, 62, 65, 0.8, 0.45, 0xdde6ee),
  polymer('polymer.hdpe', 'HDPE', 'polyolefin', 950, 1.0, 26, 30, 1.5, 0.2, 0xf4f4f4),
  polymer('polymer.ptfe', 'PTFE', 'ptfe', 2200, 0.5, 20, 25, 2.0, 0.012, 0xffffff),
  {
    // printed by continuous-fibre fabrication: in-plane values; weaker between layers (print-loads-in-plane)
    id: 'polymer.nylon-microcarbon', name: 'Printed micro carbon fibre filled nylon', category: 'polymer', density: 1200, E: 2.4 * GPa, nu: 0.38,
    yield: 40 * MPa, ultimate: 40 * MPa, elongation: 0.25, ductile: true, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.45, restitution: 0.4, sound: 'plastic', loss: 0.03, sparks: 'none', color: 0x2e3033, metalness: 0, roughness: 0.7,
    source: 'Markforged Composites Material Datasheet: tensile modulus 2.4 GPa, stress at yield 40 MPa, at break 37 MPa, 1.2 g/cm³ (printed, in-plane)', confidence: 'spec',
  },
  {
    id: 'polymer.pmma', name: 'Acrylic (PMMA)', category: 'polymer', density: 1180, E: 3.2 * GPa, nu: 0.37,
    yield: 70 * MPa, ultimate: 70 * MPa, elongation: 0.04, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.5, restitution: 0.5, sound: 'glass', loss: 0.02, sparks: 'none', color: 0xcfe8f5, metalness: 0, roughness: 0.05,
    source: 'MatWeb PMMA typical (brittle)', confidence: 'handbook',
  },
  {
    id: 'rubber.natural', name: 'Natural rubber / latex', category: 'elastomer', density: 930, E: 1.5 * MPa, nu: 0.49,
    yield: 20 * MPa, ultimate: 20 * MPa, elongation: 6, ductile: true, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 1.0, restitution: 0.7, sound: 'rubber', loss: 0.1, sparks: 'none', color: 0x2b2b2b, metalness: 0, roughness: 0.9,
    source: 'Typical NR gum vulcanisate: G 0.4-0.6 MPa, stretch at break 6-8', confidence: 'handbook',
  },
  // ---- Glass, ceramics, magnets -------------------------------------------------------------------
  {
    id: 'glass.soda-lime', name: 'Soda-lime glass', category: 'glass', density: 2500, E: 72 * GPa, nu: 0.22,
    yield: 40 * MPa, ultimate: 40 * MPa, elongation: 0.0005, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.9, restitution: 0.6, sound: 'glass', loss: 0.001, sparks: 'none', color: 0xd6ecf0, metalness: 0, roughness: 0.03,
    source: 'Typical annealed glass (tensile strength flaw-dependent, 30-90 MPa)', confidence: 'estimated',
  },
  {
    id: 'concrete.c30', name: 'Concrete C30', category: 'ceramic', density: 2400, E: 30 * GPa, nu: 0.2,
    yield: 3 * MPa, ultimate: 3 * MPa, elongation: 0.0001, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.6, restitution: 0.25, sound: 'stone', loss: 0.01, sparks: 'none', color: 0x9a9a96, metalness: 0, roughness: 0.95,
    source: 'EN 1992-1-1 C30/37: f_ctm 2.9 MPa, E_cm 33 GPa', confidence: 'spec',
  },
  {
    id: 'ceramic.clay-brick', name: 'Fired clay brick', category: 'ceramic', density: 1900, E: 14 * GPa, nu: 0.2,
    // brittle: yield = ultimate = modulus of rupture
    yield: 3.5 * MPa, ultimate: 3.5 * MPa, elongation: 0.0002, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.7, restitution: 0.2, sound: 'stone', loss: 0.01, sparks: 'none', color: 0xa0482f, metalness: 0, roughness: 0.9,
    source: 'ASTM C62/C216 solid clay brick 1800-2000 kg/m3; modulus of rupture 2-10 MPa by ASTM C67 (typical 3.5); E 10-20 GPa', confidence: 'estimated',
  },
  // ---- Stone -----------------------------------------------------------------------------------
  // brittle: yield = ultimate = modulus of rupture (flexural strength), which is what a slab fails by
  stone('stone.slate', 'Slate (billiard grade)', 2750, 80, 0.25, 55, 0x3b4046, 0.8, 'ASTM C629: slate MOR 62 MPa min. across grain (typical 50-70); E 70-90 GPa'),
  stone('stone.granite', 'Granite', 2650, 50, 0.25, 12, 0x8a8580, 0.55, 'ASTM C615: flexural strength 8.3 MPa min. (typical 10-20); E 40-60 GPa'),
  stone('stone.marble', 'Marble', 2700, 55, 0.27, 10, 0xe6e3dc, 0.3, 'ASTM C503: flexural strength 7 MPa min. (typical 7-15); E 50-70 GPa'),
  // ---- Textiles and leather (sheet goods: E is the in-plane tensile modulus of the sheet) --------------
  {
    id: 'textile.baize', name: 'Wool baize (billiard cloth)', category: 'textile', density: 400, E: 50 * MPa, nu: 0.3,
    yield: 15 * MPa, ultimate: 20 * MPa, elongation: 0.3, ductile: true, ferromagnetic: false, conductivity: 0, weld: 'none',
    // chosen so a phenolic ball (0.06) slides on it at 0.2 under the geometric-mean combine
    friction: 0.65, restitution: 0.3, sound: 'rubber', loss: 0.2, sparks: 'none', color: 0x0f6b3a, metalness: 0, roughness: 1,
    source: 'Marlow, The Physics of Pocket Billiards (1995): ball-cloth sliding friction about 0.2; worsted baize 0.5-0.7 mm, 350-450 kg/m3', confidence: 'estimated',
  },
  {
    id: 'textile.canvas', name: 'Cotton duck canvas', category: 'textile', density: 700, E: 300 * MPa, nu: 0.3,
    yield: 20 * MPa, ultimate: 30 * MPa, elongation: 0.15, ductile: true, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.6, restitution: 0.2, sound: 'rubber', loss: 0.2, sparks: 'none', color: 0xcdbf9a, metalness: 0, roughness: 1,
    source: 'Typical No. 10 cotton duck: about 0.6 mm, 400 g/m2; breaking strength 25-35 MPa of section', confidence: 'estimated',
  },
  {
    id: 'leather.veg-tan', name: 'Leather (vegetable-tanned cowhide)', category: 'leather', density: 860, E: 150 * MPa, nu: 0.35,
    yield: 15 * MPa, ultimate: 25 * MPa, elongation: 0.4, ductile: true, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.6, restitution: 0.3, sound: 'rubber', loss: 0.15, sparks: 'none', color: 0x7a4b2a, metalness: 0, roughness: 0.7,
    source: 'Leather science literature (e.g. Covington, Tanning Chemistry): tensile 20-30 MPa, elongation 30-50 %, 0.8-0.9 g/cm3', confidence: 'estimated',
  },
  // ---- Foam, cork, composites ---------------------------------------------------------------------
  {
    id: 'foam.eva', name: 'EVA foam (closed cell, 100 kg/m³)', category: 'foam', density: 100, E: 5 * MPa, nu: 0.3,
    yield: 1 * MPa, ultimate: 1.5 * MPa, elongation: 2, ductile: true, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.8, restitution: 0.35, sound: 'rubber', loss: 0.25, sparks: 'none', color: 0x2f3a45, metalness: 0, roughness: 0.95,
    source: 'Closed-cell EVA sheet datasheets, 100 kg/m3: tensile 1-2 MPa, elongation 150-250 %', confidence: 'estimated',
  },
  {
    id: 'cork.agglomerated', name: 'Cork (agglomerated)', category: 'cork', density: 240, E: 20 * MPa, nu: 0.05,
    yield: 0.8 * MPa, ultimate: 1 * MPa, elongation: 0.1, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.6, restitution: 0.4, sound: 'wood', loss: 0.1, sparks: 'none', color: 0xb08a5a, metalness: 0, roughness: 0.95,
    source: 'Gibson and Ashby, Cellular Solids: cork E 13-50 MPa, density 120-240 kg/m3, Poisson ratio near 0', confidence: 'handbook',
  },
  {
    id: 'composite.cfrp', name: 'Carbon fibre laminate (quasi-isotropic)', category: 'composite', density: 1550, E: 50 * GPa, nu: 0.3,
    yield: 550 * MPa, ultimate: 550 * MPa, elongation: 0.012, ductile: false, ferromagnetic: false, conductivity: 1e4, weld: 'none',
    friction: 0.3, restitution: 0.5, sound: 'plastic', loss: 0.005, sparks: 'none', color: 0x1d1f22, metalness: 0.2, roughness: 0.3,
    source: 'CMH-17 / typical T300-epoxy quasi-isotropic laminate: E 45-55 GPa, UTS 500-600 MPa; in-plane conductivity about 1e4 S/m', confidence: 'handbook',
  },
  {
    id: 'composite.gfrp', name: 'Glass fibre laminate (E-glass)', category: 'composite', density: 1800, E: 18 * GPa, nu: 0.3,
    yield: 200 * MPa, ultimate: 200 * MPa, elongation: 0.02, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.35, restitution: 0.45, sound: 'plastic', loss: 0.01, sparks: 'none', color: 0xd8d5c4, metalness: 0, roughness: 0.5,
    source: 'Typical woven-roving E-glass/polyester laminate: E 15-20 GPa, UTS 150-250 MPa', confidence: 'handbook',
  },
  {
    id: 'polymer.phenolic', name: 'Cast phenolic resin (billiard balls)', category: 'polymer', density: 1735, E: 7 * GPa, nu: 0.35,
    yield: 50 * MPa, ultimate: 50 * MPa, elongation: 0.01, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none',
    friction: 0.06, restitution: 0.93, sound: 'glass', loss: 0.002, sparks: 'none', color: 0xf2efe6, metalness: 0, roughness: 0.08,
    source: 'Aramith ball: 170 g, 57.2 mm (1735 kg/m3); Marlow: ball-ball restitution 0.92-0.98, friction 0.03-0.08', confidence: 'handbook',
  },
  // conductivity: sintered NdFeB 1.5 uOhm m (manufacturer data sheets); sintered hard ferrite is a ceramic, above
  // 1e4 Ohm m, so effectively an insulator
  magnet('magnet.n35', 'Neodymium NdFeB N35', 1.19, 7500, 6.7e5, 0xb3b8be, 'IEC 60404-8-1 / grade tables 1.17-1.21 T'),
  magnet('magnet.n42', 'Neodymium NdFeB N42', 1.3, 7500, 6.7e5, 0xb9bec4, 'IEC 60404-8-1 / grade tables 1.28-1.32 T'),
  magnet('magnet.n52', 'Neodymium NdFeB N52', 1.455, 7500, 6.7e5, 0xc2c7cc, 'grade tables 1.43-1.48 T'),
  magnet('magnet.ferrite-c8', 'Ferrite C8', 0.39, 4900, 1e-4, 0x3a3a3c, 'MMPA 0100 ceramic 8, 0.38-0.40 T'),
];

function wood(id: string, name: string, G: number, density: number, EGPa: number, MOR: number, color: number,
  confidence: Material['confidence'] = 'handbook'): Material {
  return {
    id, name, category: 'wood', density, E: EGPa * GPa, nu: 0.37, yield: MOR * MPa * 0.7, ultimate: MOR * MPa,
    elongation: 0.01, ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none', friction: 0.45,
    restitution: 0.35, sound: 'wood', loss: 0.012, sparks: 'none', specificGravity: G, crossGrainFactor: 1 / 30,
    color, metalness: 0, roughness: 0.8,
    source: 'USDA Wood Handbook FPL-GTR-282 ch. 5 (clear wood, 12% MC): SG, MOE, MOR', confidence,
  };
}

function stone(id: string, name: string, density: number, EGPa: number, nu: number, MOR: number, color: number, roughness: number, source: string): Material {
  return {
    id, name, category: 'stone', density, E: EGPa * GPa, nu, yield: MOR * MPa, ultimate: MOR * MPa, elongation: 0.0007,
    ductile: false, ferromagnetic: false, conductivity: 0, weld: 'none', friction: 0.6, restitution: 0.3, sound: 'stone',
    loss: 0.005, sparks: 'none', color, metalness: 0, roughness, source, confidence: 'handbook',
  };
}

function polymer(id: string, name: string, category: MaterialCategory, density: number, EGPa: number, yieldMPa: number,
  ultMPa: number, elongation: number, friction: number, color: number): Material {
  return {
    id, name, category, density, E: EGPa * GPa, nu: 0.38, yield: yieldMPa * MPa, ultimate: ultMPa * MPa, elongation,
    ductile: elongation > 0.1, ferromagnetic: false, conductivity: 0, weld: 'none', friction, restitution: 0.45,
    sound: 'plastic', loss: 0.02, sparks: 'none', color, metalness: 0, roughness: 0.55,
    source: 'MatWeb typical unfilled grade', confidence: 'handbook',
  };
}

function magnet(id: string, name: string, Br: number, density: number, conductivity: number, color: number, source: string): Material {
  return {
    id, name, category: 'magnet', density, E: 160 * GPa, nu: 0.24, yield: 80 * MPa, ultimate: 80 * MPa, elongation: 0.001,
    ductile: false, ferromagnetic: true, conductivity, weld: 'none', friction: 0.5, restitution: 0.4, sound: 'steel',
    loss: 0.002, sparks: 'none', remanence: Br, color, metalness: 0.95, roughness: 0.2, source, confidence: 'handbook',
  };
}

const byId = new Map(MATERIALS.map((m) => [m.id, m]));

export function getMaterial(id: string): Material {
  const m = byId.get(id);
  if (!m) throw new Error(`Unknown material ${id}`);
  return m;
}

export const hasMaterial = (id: string) => byId.has(id);

export const MATERIAL_GROUPS: { label: string; ids: string[] }[] = [
  { label: 'Steel & iron', ids: MATERIALS.filter((m) => ['steel', 'stainless', 'cast-iron'].includes(m.category)).map((m) => m.id) },
  { label: 'Aluminium', ids: MATERIALS.filter((m) => m.category === 'aluminum').map((m) => m.id) },
  { label: 'Copper, brass, titanium', ids: MATERIALS.filter((m) => ['copper-alloy', 'titanium'].includes(m.category)).map((m) => m.id) },
  { label: 'Wood', ids: MATERIALS.filter((m) => ['wood', 'engineered-wood'].includes(m.category)).map((m) => m.id) },
  { label: 'Plastics & rubber', ids: MATERIALS.filter((m) => ['polymer', 'polyolefin', 'ptfe', 'elastomer'].includes(m.category)).map((m) => m.id) },
  { label: 'Glass, stone & concrete', ids: MATERIALS.filter((m) => ['glass', 'ceramic', 'stone'].includes(m.category)).map((m) => m.id) },
  { label: 'Cloth, leather, foam & cork', ids: MATERIALS.filter((m) => ['textile', 'leather', 'foam', 'cork'].includes(m.category)).map((m) => m.id) },
  { label: 'Composites', ids: MATERIALS.filter((m) => m.category === 'composite').map((m) => m.id) },
  { label: 'Magnets', ids: MATERIALS.filter((m) => m.category === 'magnet').map((m) => m.id) },
];

/** Water and air at 20 C. */
export const FLUIDS = {
  freshWater: { density: 998.2, source: 'CRC Handbook, water at 20 C' },
  seaWater: { density: 1025, source: 'UNESCO seawater at 35 PSU, 15 C' },
  air: { density: 1.204, source: 'ISA / CRC, dry air at 20 C, 101.325 kPa' },
};

export const STANDARD_GRAVITY = 9.80665;

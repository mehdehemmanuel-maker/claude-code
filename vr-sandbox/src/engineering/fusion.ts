// Whether two materials can be fused into one solid: one law for every material, from properties every material
// has, not a table of which pairs weld. Two things fuse where, and only where, all of these hold:
//
//  1. Each melts before it breaks down. Wood chars, thermosets and rubber decompose, concrete dehydrates: none of
//     them ever is a liquid to fuse.
//  2. Both hold together by the same kind of bond (metallic, thermoplastic chains, glass network, ionic-covalent
//     ceramic). Liquids of different kinds of bond do not become one solid.
//  3. Molten, they mix. Metals by the Hume-Rothery rules on their base elements: atomic radii within 15 %, the same
//     crystal structure, electronegativities within 0.4, the same valence; otherwise brittle intermetallic phases
//     form where they meet (Hume-Rothery, 1934; Callister & Rethwisch, Materials Science and Engineering, 9th ed.,
//     section 4.3). Thermoplastics by their Hildebrand solubility parameters: within 2 MPa^1/2 (a welding rule of
//     thumb; blends need less). Glasses and ceramics only with their own composition.
//  4. Neither boils or breaks down while the other melts: the higher melting point is below the lower of the two
//     temperatures at which either loses itself (its most volatile part boiling, or it decomposing).
//  5. A brittle one survives the heat of a local melt: the temperature step it takes, melt less where it starts, is
//     within its thermal-shock limit dT = sigma_f (1 - nu) / (E alpha) (Kingery, J. Am. Ceram. Soc. 38, 1955). A
//     thermoplastic softens before it cracks, and a ductile metal yields: this is for the brittle.
//  6. Cooling together from the lower melting point, the strain their different expansions force on the joint,
//     |alpha_a - alpha_b| dT, is within the elongation at break of the less ductile one.
//
// What this law does not see, said plainly: filler metals and brazing (which join what cannot fuse), solidification
// cracking of particular alloys (2024 and 7075 aluminium crack hot though they pass), and slow, preheated practice
// beyond the preheat said. Every number below says where it is from; "estimated" says it is not a published value.

import type { Material } from '../data/materials';

export type Bond = 'metallic' | 'thermoplastic' | 'glass' | 'ceramic' | 'intermetallic' | 'none';
export interface FusionProps {
  bond: Bond;
  /** Where it melts (its solidus), deg C; null where it breaks down first. */
  melts: number | null;
  /** Where it loses itself: its most volatile part boils, or it decomposes, deg C; null where nothing does below its melt. */
  lost: number | null;
  /** What is lost there, in words. */
  lostWhat: string;
  /** Linear thermal expansion, 1/K. */
  alpha: number;
  /** Metals: the base element. Glass and ceramics: the composition. */
  base?: string;
  /** Thermoplastics: Hildebrand solubility parameter, MPa^1/2. */
  delta?: number;
  source: string;
}

/** The base elements of the metals: metallic radius (nm), crystal structure at room temperature, Pauling
 *  electronegativity and valence, as Callister & Rethwisch give them (Table 3.1 and Figure 2.9, 9th ed.). */
export const ELEMENTS: Record<string, { name: string; r: number; structure: 'BCC' | 'FCC' | 'HCP'; en: number; valence: number }> = {
  Fe: { name: 'iron', r: 0.124, structure: 'BCC', en: 1.8, valence: 2 },
  Al: { name: 'aluminium', r: 0.143, structure: 'FCC', en: 1.5, valence: 3 },
  Cu: { name: 'copper', r: 0.128, structure: 'FCC', en: 1.9, valence: 1 },
  Ti: { name: 'titanium', r: 0.145, structure: 'HCP', en: 1.5, valence: 4 },
};

const F = (bond: Bond, melts: number | null, lost: number | null, lostWhat: string, alpha: number, more: { base?: string; delta?: number }, source: string): FusionProps => ({ bond, melts, lost, lostWhat, alpha, ...more, source });
const MN = 'its manganese boils at 2061 °C (CRC Handbook)';
const MG = 'its magnesium boils at 1091 °C (CRC Handbook)';
const ZN = 'its zinc boils at 907 °C (CRC Handbook)';

export const FUSION: Record<string, FusionProps> = {
  'steel.a36': F('metallic', 1425, 2061, MN, 11.7e-6, { base: 'Fe' }, 'MatWeb ASTM A36: alpha 11.7 µm/m·K; solidus typical of low-carbon steel, 1425-1540 °C (ASM Handbook vol. 1)'),
  'steel.1018-cd': F('metallic', 1425, 2061, MN, 11.5e-6, { base: 'Fe' }, 'MatWeb AISI 1018: alpha 11.5 µm/m·K (0-100 °C); solidus typical of low-carbon steel (ASM vol. 1)'),
  'steel.4140-ann': F('metallic', 1416, 2061, MN, 12.2e-6, { base: 'Fe' }, 'MatWeb AISI 4140: solidus 1416 °C, alpha 12.2 µm/m·K'),
  'steel.52100': F('metallic', 1424, 2061, MN, 11.9e-6, { base: 'Fe' }, 'MatWeb AISI 52100: melting 1424 °C, alpha 11.9 µm/m·K'),
  'steel.music-wire': F('metallic', 1400, 2061, MN, 11.7e-6, { base: 'Fe' }, 'estimated: 0.7-1.0 % carbon lowers the solidus to about 1400 °C (Fe-C diagram); alpha as carbon steel'),
  'stainless.304': F('metallic', 1400, 2061, MN, 17.3e-6, { base: 'Fe' }, 'MatWeb 304: melting 1400-1455 °C, alpha 17.3 µm/m·K (0-100 °C)'),
  'stainless.316': F('metallic', 1370, 2061, MN, 16.0e-6, { base: 'Fe' }, 'MatWeb 316: melting 1370-1400 °C, alpha 16.0 µm/m·K'),
  'cast-iron.gray-30': F('metallic', 1150, 2061, MN, 10.5e-6, { base: 'Fe' }, 'Fe-C eutectic 1147 °C; ASM vol. 1 gray iron alpha 10.5-11 µm/m·K'),
  'aluminum.6061-t6': F('metallic', 582, 1091, MG, 23.6e-6, { base: 'Al' }, 'MatWeb 6061-T6: solidus 582 °C, liquidus 652 °C, alpha 23.6 µm/m·K'),
  'aluminum.7075-t6': F('metallic', 477, 907, ZN, 23.6e-6, { base: 'Al' }, 'MatWeb 7075-T6: solidus 477 °C, liquidus 635 °C, alpha 23.6 µm/m·K'),
  'aluminum.5052-h32': F('metallic', 607, 1091, MG, 23.8e-6, { base: 'Al' }, 'MatWeb 5052-H32: solidus 607 °C, alpha 23.8 µm/m·K'),
  'aluminum.2024-t3': F('metallic', 502, 1091, MG, 23.2e-6, { base: 'Al' }, 'MatWeb 2024-T3: solidus 502 °C, alpha 23.2 µm/m·K'),
  'copper.c110': F('metallic', 1065, 2562, 'it boils at 2562 °C (CRC Handbook)', 17.0e-6, { base: 'Cu' }, 'CDA C11000: melting 1065-1083 °C; MatWeb alpha 17.0 µm/m·K'),
  'brass.c360': F('metallic', 885, 907, ZN, 20.5e-6, { base: 'Cu' }, 'CDA C36000: solidus 885 °C, liquidus 900 °C, alpha 20.5 µm/m·K'),
  'titanium.ti6al4v': F('metallic', 1604, 2470, 'its aluminium boils at 2470 °C (CRC Handbook)', 8.6e-6, { base: 'Ti' }, 'MatWeb Ti-6Al-4V: solidus 1604 °C, alpha 8.6 µm/m·K'),
  'polymer.abs': F('thermoplastic', 200, 340, 'it decomposes from about 340 °C', 90e-6, { delta: 19.4 }, 'estimated: amorphous, flows from about 200 °C (processing 210-260 °C); MatWeb alpha 72-108 µm/m·K; delta of its SAN phase, 19-20 MPa^1/2 (Polymer Handbook)'),
  'polymer.pla': F('thermoplastic', 175, 300, 'it decomposes from about 300 °C', 68e-6, { delta: 20.2 }, 'NatureWorks PLA: melting 150-180 °C, alpha about 68 µm/m·K; delta 19.5-20.5 MPa^1/2 (estimated)'),
  'polymer.nylon66': F('thermoplastic', 262, 350, 'it decomposes from about 350 °C', 80e-6, { delta: 27.8 }, 'MatWeb nylon 6/6: melting 262 °C, alpha about 80 µm/m·K; delta 27.8 MPa^1/2 (Polymer Handbook)'),
  'polymer.pom': F('thermoplastic', 175, 230, 'it gives off formaldehyde above about 230 °C', 110e-6, { delta: 20.9 }, 'MatWeb acetal: melting 175 °C; processing limit about 230 °C; alpha about 110 µm/m·K; delta about 20.9 MPa^1/2 (estimated)'),
  'polymer.pc': F('thermoplastic', 260, 400, 'it decomposes from about 400 °C', 68e-6, { delta: 20.0 }, 'MatWeb polycarbonate: Tg 147 °C, flows from about 260 °C (processing 280-320 °C), alpha 68 µm/m·K; delta 19.4-20.3 MPa^1/2'),
  'polymer.hdpe': F('thermoplastic', 130, 350, 'it decomposes from about 350 °C', 120e-6, { delta: 16.4 }, 'MatWeb HDPE: melting 130 °C, alpha 100-200 µm/m·K; delta 16.2-16.6 MPa^1/2 (Polymer Handbook)'),
  'polymer.ptfe': F('thermoplastic', 327, 400, 'it decomposes from about 400 °C', 120e-6, { delta: 12.7 }, 'MatWeb PTFE: melting 327 °C, alpha about 120 µm/m·K; delta 12.7 MPa^1/2 (Polymer Handbook)'),
  'polymer.nylon-microcarbon': F('thermoplastic', 220, 350, 'it decomposes from about 350 °C', 50e-6, { delta: 26.0 }, 'estimated from its nylon 6 matrix: melting 220 °C; carbon fill lowers alpha to about 50 µm/m·K; delta 21-26 MPa^1/2 in the literature'),
  'polymer.pmma': F('thermoplastic', 160, 280, 'it unzips to its monomer from about 280 °C', 70e-6, { delta: 19.0 }, 'MatWeb PMMA: Tg 105 °C, flows from about 160 °C, alpha 50-90 µm/m·K; delta 18.6-19.4 MPa^1/2 (Polymer Handbook)'),
  'foam.eva': F('thermoplastic', 85, 330, 'it loses acetic acid from about 330 °C', 180e-6, { delta: 17.4 }, 'estimated: EVA melts 70-95 °C, deacetylates from about 330 °C; alpha and delta near polyethylene'),
  'polymer.phenolic': F('none', null, 300, 'it chars from about 300 °C: a thermoset, it never melts', 30e-6, {}, 'thermoset: cross-linked, decomposes without melting (estimated onset)'),
  'rubber.natural': F('none', null, 200, 'it degrades from about 200 °C: vulcanised, it never melts', 220e-6, {}, 'cross-linked by vulcanisation; alpha about 220 µm/m·K (estimated)'),
  'composite.cfrp': F('none', null, 300, 'its epoxy decomposes from about 300 °C: a thermoset, it never melts', 2e-6, {}, 'estimated: epoxy matrix, quasi-isotropic carbon laminate'),
  'composite.gfrp': F('none', null, 300, 'its epoxy decomposes from about 300 °C: a thermoset, it never melts', 12e-6, {}, 'estimated: epoxy matrix, quasi-isotropic E-glass laminate'),
  'glass.soda-lime': F('glass', 726, null, '', 9.0e-6, { base: 'soda-lime silicate' }, 'Shelby, Introduction to Glass Science: soda-lime softening point about 726 °C, alpha about 9 µm/m·K'),
  'ceramic.clay-brick': F('ceramic', 1600, null, '', 6.0e-6, { base: 'fired clay' }, 'estimated: fired clay vitrifies from about 1100 °C and melts near 1600 °C; EN 1996-1-1 alpha 5-8 µm/m·K'),
  'concrete.c30': F('none', null, 450, 'its cement dehydrates and its portlandite breaks down by about 450 °C: it never melts as one', 10e-6, {}, 'EN 1992-1-2 strength loss with temperature; EN 1992-1-1 alpha 10 µm/m·K'),
  'stone.slate': F('ceramic', 1100, null, '', 8e-6, { base: 'slate' }, 'estimated: slate begins to melt near 1100 °C; alpha about 8 µm/m·K'),
  'stone.granite': F('ceramic', 1215, null, '', 8e-6, { base: 'granite' }, 'granite melts about 1215-1260 °C; alpha about 8 µm/m·K (estimated)'),
  'stone.marble': F('none', null, 825, 'its calcite gives off CO₂ from about 825 °C: it never melts', 7e-6, {}, 'CaCO₃ calcines from about 825 °C (CRC Handbook)'),
  'textile.baize': F('none', null, 230, 'its wool chars from about 230 °C', 0, {}, 'wool decomposes without melting (estimated onset)'),
  'textile.nylon-ripstop': F('thermoplastic', 220, 350, 'it decomposes from about 350 °C', 80e-6, { delta: 27.8 }, 'nylon 6 fibre: melting about 220 °C (MatWeb); alpha about 80 µm/m·K, delta as nylon (Polymer Handbook), estimate'),
  'textile.canvas': F('none', null, 250, 'its cotton chars from about 250 °C', 0, {}, 'cellulose decomposes without melting (estimated onset)'),
  'leather.veg-tan': F('none', null, 80, 'its collagen shrinks from about 80 °C and chars after', 0, {}, 'veg-tan leather shrink temperature about 70-85 °C (estimated)'),
  'cork.agglomerated': F('none', null, 200, 'it chars from about 200 °C', 0, {}, 'cork decomposes without melting (estimated onset)'),
  'magnet.n35': F('intermetallic', 1200, null, '', 5e-6, { base: 'Nd2Fe14B' }, 'estimated: sintered NdFeB melts near 1200 °C and loses its magnetism far below (Curie point about 310 °C)'),
  'magnet.n42': F('intermetallic', 1200, null, '', 5e-6, { base: 'Nd2Fe14B' }, 'estimated, as N35'),
  'magnet.n52': F('intermetallic', 1200, null, '', 5e-6, { base: 'Nd2Fe14B' }, 'estimated, as N35'),
  'magnet.ferrite-c8': F('ceramic', 1500, null, '', 10e-6, { base: 'strontium ferrite' }, 'estimated: strontium ferrite melts near 1500 °C'),
};
/** Woods, by their family: they char from about 250-300 °C and never melt. */
const fusionOf = (m: Material): FusionProps | null => FUSION[m.id] ?? (m.category === 'wood' || m.category === 'engineered-wood' ? F('none', null, 270, 'it chars from about 270 °C: wood never melts', 4e-6, {}, 'wood pyrolyses from about 250-300 °C (estimated onset)') : null);

export interface FusionCheck { law: string; holds: boolean; says: string }
export interface FusionVerdict { fuses: boolean; checks: FusionCheck[]; why: string }

const C = (t: number) => `${Math.round(t)} °C`;
/** Whether a and b fuse, preheated to t0 (deg C): each of the six conditions, worked with its numbers. */
export function fusible(a: Material, b: Material, t0 = 20): FusionVerdict {
  const A = fusionOf(a), B = fusionOf(b), out: FusionCheck[] = [];
  const done = (): FusionVerdict => { const bad = out.find((c) => !c.holds); return { fuses: !bad, checks: out, why: bad ? bad.says : `${a.name} and ${b.name} fuse: ${out.map((c) => c.says).join('; ')}` }; };
  if (!A || !B) { out.push({ law: 'what is known', holds: false, says: `no melting data is kept for ${!A ? a.name : b.name}, so it is not fused` }); return done(); }
  // 1: a liquid to fuse
  for (const [m, P] of [[a, A], [b, B]] as const) if (P.melts === null) { out.push({ law: 'it melts', holds: false, says: `${m.name} cannot fuse: ${P.lostWhat}` }); return done(); }
  out.push({ law: 'it melts', holds: true, says: a.id === b.id ? `${a.name} melts at ${C(A.melts!)}` : `${a.name} melts at ${C(A.melts!)}, ${b.name} at ${C(B.melts!)}` });
  // 2: the same kind of bond
  out.push({ law: 'the same bond', holds: A.bond === B.bond, says: A.bond === B.bond ? `both ${A.bond}` : `${a.name} is held by ${A.bond} bonds and ${b.name} by ${B.bond}: their liquids do not become one solid` });
  if (A.bond !== B.bond) return done();
  // 3: molten, they mix
  if (A.bond === 'metallic') {
    const ea = ELEMENTS[A.base!]!, eb = ELEMENTS[B.base!]!;
    if (A.base === B.base) out.push({ law: 'they mix', holds: true, says: `both are ${ea.name} at base` });
    else {
      const dr = Math.abs(ea.r - eb.r) / Math.max(ea.r, eb.r), den = Math.abs(ea.en - eb.en), bad: string[] = [];
      if (dr > 0.15) bad.push(`their atoms differ ${(dr * 100).toFixed(1)} % in size (over 15 %)`);
      if (ea.structure !== eb.structure) bad.push(`${ea.name} is ${ea.structure} and ${eb.name} ${eb.structure}`);
      if (den > 0.4 + 1e-9) bad.push(`their electronegativities differ ${den.toFixed(1)} (over 0.4)`);
      if (ea.valence !== eb.valence) bad.push(`${ea.name} has valence ${ea.valence} and ${eb.name} ${eb.valence}`);
      out.push({ law: 'they mix', holds: !bad.length, says: bad.length ? `molten ${ea.name} and ${eb.name} do not dissolve in each other (Hume-Rothery): ${bad.join(', ')}; where they meet, brittle intermetallics form` : `${ea.name} and ${eb.name} dissolve in each other (Hume-Rothery: sizes within ${(dr * 100).toFixed(1)} %, both ${ea.structure}, electronegativity ${den.toFixed(1)} apart, valence ${ea.valence})` });
    }
  } else if (A.bond === 'thermoplastic') {
    const d = Math.abs(A.delta! - B.delta!);
    out.push({ law: 'they mix', holds: d <= 2 + 1e-9, says: d <= 2 + 1e-9 ? `their solubility parameters are ${d.toFixed(1)} MPa^½ apart (within 2)` : `their solubility parameters are ${d.toFixed(1)} MPa^½ apart (over 2): molten, they stay apart like oil and water` });
  } else out.push({ law: 'they mix', holds: A.base === B.base, says: A.base === B.base ? `both ${A.base}` : `${A.base} and ${B.base} are not one composition` });
  if (!out.at(-1)!.holds) return done();
  // 4: neither lost while the other melts
  const hot = Math.max(A.melts!, B.melts!), lost = [[a, A], [b, B]].filter(([, P]) => (P as FusionProps).lost !== null).sort((x, y) => (x[1] as FusionProps).lost! - (y[1] as FusionProps).lost!)[0] as [Material, FusionProps] | undefined;
  const lostOk = !lost || hot < lost[1].lost!;
  out.push({ law: 'nothing is lost', holds: lostOk, says: lostOk ? `nothing boils or breaks down below ${C(hot)}` : `to melt the one that melts at ${C(hot)}, ${lost![0].name} is lost first: ${lost![1].lostWhat}` });
  if (!lostOk) return done();
  // 5: a brittle one survives the heat of a local melt
  for (const [m, P] of [[a, A], [b, B]] as const) {
    if (m.ductile || P.bond === 'thermoplastic') continue;
    const limit = (m.ultimate * (1 - m.nu)) / (m.E * P.alpha), step = P.melts! - t0, ok = step <= limit;
    out.push({ law: 'it survives the heat', holds: ok, says: ok ? `${m.name}, brittle, takes the ${Math.round(step)} K step from ${C(t0)} to its melt within its thermal-shock limit of ${Math.round(limit)} K` : `${m.name} is brittle: a local melt is a ${Math.round(step)} K step from ${C(t0)}, past its thermal-shock limit σ(1−ν)/(Eα) = ${Math.round(limit)} K, so it cracks; preheated to ${C(P.melts! - limit)} or more it would not` });
    if (!ok) return done();
  }
  // 6: cooling together
  const cool = Math.min(A.melts!, B.melts!) - t0, strain = Math.abs(A.alpha - B.alpha) * cool, give = Math.min(a.elongation, b.elongation), ok6 = strain <= give;
  out.push({ law: 'it survives cooling', holds: ok6, says: ok6 ? `cooling ${Math.round(cool)} K together forces ${(strain * 100).toFixed(2)} % strain on the joint, within the ${(give * 100).toFixed(1)} % it can stretch` : `cooling ${Math.round(cool)} K together, their expansions (${(A.alpha * 1e6).toFixed(1)} and ${(B.alpha * 1e6).toFixed(1)} µm/m·K) force ${(strain * 100).toFixed(2)} % strain on the joint, past the ${(give * 100).toFixed(2)} % the less ductile can stretch: it cracks` });
  return done();
}

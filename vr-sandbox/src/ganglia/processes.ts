// How things are made, and the limits of making them. A part placed in the world is made by one of these from stock,
// or bought (rule R11): each process says what feature it makes, from what, with what tools, and the rules a design
// must keep for it to be made at all. The numeric rules that the build sheet and the joints already apply live where
// they run (engineering/threads.ts, spacing.ts, joining.ts, welding.ts); the checks here are the ones a design is
// tested against before anything is placed.

import { GASES } from '../engineering/welding';
import { END_GRAIN_FACTOR } from '../engineering/wood';
import { METRIC_COARSE } from '../engineering/threads';
import type { Process } from './types';

const MACHINERY = { cite: 'Oberg et al., Machinery\'s Handbook, 31st ed., Industrial Press 2020', kind: 'handbook' as const };

export const PROCESSES: Process[] = [
  {
    id: 'saw', name: 'Sawing to length', makes: 'a straight cut across stock', materials: ['wood', 'steel', 'aluminum', 'polymer', 'copper-alloy'],
    tools: ['band saw', 'mitre saw', 'hacksaw', 'circular saw (wood)'],
    limits: [
      'Every cut loses its kerf (the build sheet allows 3 mm a cut) from the bar or board.',
      'Bar and tube come in 6 m lengths, lumber 8 to 16 ft, sheet 2440 × 1220 mm: a part longer than its stock is spliced or welded up.',
    ],
    source: MACHINERY, tags: ['cut', 'length', 'stock', 'cut list'], uses: { laws: [] },
  },
  {
    id: 'drill', name: 'Drilling', makes: 'a round hole', materials: ['wood', 'steel', 'aluminum', 'polymer', 'copper-alloy', 'cast-iron'],
    tools: ['twist drill in a drill press or hand drill', 'brad-point bit (wood)'],
    limits: [
      'A bolt passes a clearance hole: ISO 273 medium fit (M5 5.5 mm, M6 6.6 mm, M8 9 mm, M10 11 mm, M12 13.5 mm).',
      'Holes keep their edge distance and spacing from each other (EN 1993-1-8: edge 1.2 d0, spacing 2.2 d0).',
      'A hole deeper than about 3 to 5 diameters is drilled in pecks to clear the chips.',
      'A sealed bought item (a battery, a motor) is never drilled (R11).',
    ],
    source: { cite: 'ISO 273:1979 Fasteners — Clearance holes for bolts and screws; EN 1993-1-8:2005 Table 3.3; Machinery\'s Handbook (drilling)' },
    tags: ['hole', 'bolt', 'clearance'], uses: { laws: [] },
  },
  {
    id: 'tap', name: 'Tapping a thread', makes: 'an internal ISO metric thread', materials: ['steel', 'aluminum', 'cast-iron', 'copper-alloy', 'polymer'],
    tools: ['tap drill', 'taper and plug taps', 'tap wrench'],
    limits: [
      'Drill first to the tap drill: the thread\'s size less its pitch (M5 4.2 mm, M6 5.0 mm, M8 6.8 mm, M10 8.5 mm), about 75% thread depth.',
      'Engage at least 1 d of thread in steel, 1.5 d in cast iron, 2 d in aluminium, so the bolt breaks before the thread strips.',
      'Leave wall round the hole: a tapped hole near an edge splits the part.',
      'Wood takes a threaded insert, not a tapped thread.',
    ],
    source: MACHINERY, tags: ['thread', 'tapped hole', 'bolt', 'screw'], uses: { laws: [] },
  },
  {
    id: 'bore', name: 'Boring to size', makes: 'an accurate round bore', materials: ['steel', 'aluminum', 'cast-iron', 'copper-alloy', 'polymer'],
    tools: ['lathe (boring bar)', 'mill (boring head)'],
    limits: [
      'Bored to fit what it grips or holds: a clamp to the body\'s diameter, a bearing seat to H7 in its housing.',
      'The block must be bigger than the bore by enough wall to carry its clamp or press-fit load.',
    ],
    source: MACHINERY, tags: ['bore', 'clamp', 'bearing seat', 'fit'], uses: { laws: [] },
  },
  {
    id: 'split-clamp', name: 'Making a split clamp', makes: 'a bored block sawn across its bore and drawn together by bolts', materials: ['aluminum', 'steel'],
    tools: ['lathe or mill (bore)', 'band saw or slitting saw', 'drill and tap'],
    limits: [
      'Bore to the body it grips, then saw through across the bore so the halves close on it.',
      'Drill clearance holes in one half and tap the other (or through-bolt with nuts) for the clamp screws.',
      'It holds by friction: (4/π) μ n F d against turning, from the screws\' preload F (VDI 2230) and the bore d.',
      'Tighten gently on a thin housing (a motor\'s, a gearhead\'s): above about 5 MPa on the bore it can distort.',
    ],
    source: { cite: 'VDI 2230 Part 1 (preload); Roloff/Matek Maschinenelemente (clamp connections)' }, tags: ['clamp', 'motor mount', 'grip'], uses: { laws: ['friction.coulomb'] },
  },
  {
    id: 'turn', name: 'Turning', makes: 'round features on a bar: diameters, shoulders, grooves, threads', materials: ['steel', 'aluminum', 'copper-alloy', 'polymer', 'cast-iron'],
    tools: ['lathe'],
    limits: [
      'A diameter is turned down from round bar at least as big.',
      'A long slender part sticking out more than about 3 to 4 diameters from the chuck needs the tailstock\'s support, or it chatters and bends.',
    ],
    source: MACHINERY, tags: ['shaft', 'axle', 'round'], uses: { laws: [] },
  },
  {
    id: 'mill', name: 'Milling', makes: 'flats, pockets, slots and square shoulders', materials: ['steel', 'aluminum', 'copper-alloy', 'polymer', 'cast-iron'],
    tools: ['milling machine', 'end mills'],
    limits: ['An inside corner keeps the cutter\'s radius.', 'A keyway is milled to the key\'s width for the shaft size.'],
    source: MACHINERY, tags: ['flat', 'slot', 'keyway', 'pocket'], uses: { laws: [] },
  },
  {
    id: 'bend', name: 'Bending sheet and plate', makes: 'a bend in sheet or plate', materials: ['steel', 'aluminum', 'stainless', 'copper-alloy'],
    tools: ['press brake', 'bending brake', 'vice and hammer (thin, soft sheet)'],
    limits: [
      'Inside radius at least: mild steel 1 t up to 3 mm; 5052-H32 aluminium 1 t to 1/8 in, 1.5 t at 3/16 in, about 2 t at 1/4 in; 6061-T6 1.5 to 2.5 t at 1/16 in rising to 3.5 to 4 t at 1/4 in (bent across the grain).',
      'Tighter than about 0.5 t needs bottoming or coining, not air bending.',
      'A hole too near a bend distorts: keep holes at least about 2 t plus the radius from it.',
    ],
    source: { cite: 'Sheet metal bend radius charts (Rivcut; MechCodex; Aluminum Association guidance)', url: 'https://www.rivcut.com/resources/bend-radius-chart' },
    tags: ['sheet', 'bracket', 'angle', 'bend'], uses: { laws: [] },
  },
  {
    id: 'weld.mig', name: 'MIG (GMAW) welding', makes: 'a fused bead joining metals', materials: ['steel', 'stainless', 'aluminum'],
    tools: ['MIG welder', ...Object.values(GASES).map((g) => `shielding gas ${g.label} (for ${Object.keys(g.shields).filter((k) => g.shields[k as keyof typeof g.shields]! >= 0.95).join(' and ')})`), 'a spool gun for aluminium'],
    limits: [
      'Only weldable pairs: steel to steel, stainless to stainless, aluminium to aluminium, each with its filler (engineering/joining.ts).',
      'A fillet\'s leg is no bigger than the thinner part; its throat is 0.707 of its leg.',
      'Current and wire speed follow the thickness (engineering/welding.ts); too little does not fuse, too much burns through thin sheet.',
      'Never on a bought item\'s case (a motor, a battery: R11).',
    ],
    source: { cite: 'AWS D1.1 Structural Welding Code — Steel; Lincoln Electric, The Procedure Handbook of Arc Welding' }, tags: ['weld', 'steel', 'frame', 'fillet'], uses: { laws: [] },
  },
  {
    id: 'solder', name: 'Soft soldering', makes: 'a soldered joint (electrical or light mechanical)', materials: ['copper-alloy', 'steel', 'stainless'],
    tools: ['soldering iron or torch', 'flux', 'solder (Sn63Pb37, SAC305)'],
    limits: ['Joins solderable metals only (not aluminium without special flux).', 'Weak mechanically: shear strength tens of MPa; for wires and light fittings.'],
    source: { cite: 'IPC J-STD-001; engineering/joining.ts SOLDERS' }, tags: ['solder', 'wire', 'electrical'], uses: { laws: [] },
  },
  {
    id: 'glue', name: 'Adhesive bonding', makes: 'a glued joint', materials: ['wood', 'steel', 'aluminum', 'polymer', 'ceramic'],
    tools: ['adhesive (PVA for wood, epoxy, cyanoacrylate)', 'clamps'],
    limits: ['Full strength only after its cure time; clamp until handling strength.', 'Strong in shear over an area, weak in peel and cleavage: design the load as shear.'],
    source: { cite: 'Adhesive makers\' data sheets; engineering/joining.ts ADHESIVES' }, tags: ['glue', 'wood', 'bond'], uses: { laws: [] },
  },
  {
    id: 'screw.wood', name: 'Driving wood screws', makes: 'a screwed joint in wood', materials: ['wood'],
    tools: ['drill (pilot and clearance holes)', 'driver'],
    limits: [
      'Through the part that is thinner along the screw\'s path, into the other (R2); penetration into the holding part sets its withdrawal strength.',
      `Pilot holes in hardwood stop it splitting; into end grain a screw holds about ${END_GRAIN_FACTOR['wood-screw'] * 100}% as well as into side grain, a nail about ${END_GRAIN_FACTOR.nail * 100}%.`,
      'Screws come in stocked lengths only (R3).',
    ],
    source: { cite: 'USDA Forest Products Laboratory, Wood Handbook FPL-GTR-190 (2010), ch. 8' }, tags: ['screw', 'wood', 'furniture'], uses: { laws: [] },
  },
  {
    id: 'crimp', name: 'Crimping wire terminals', makes: 'a ring, spade or butt terminal on a wire', materials: ['copper-alloy'],
    tools: ['ratcheting crimp tool', 'wire stripper'],
    limits: ['Insulated terminals by colour: red for 22 to 18 AWG, blue for 16 to 14 AWG, yellow for 12 to 10 AWG.', 'Strip to the barrel length; a crimp that pulls off by hand is remade.'],
    source: { cite: 'SAE AS7928 / UL 486A-486B (wire connectors)' }, tags: ['wire', 'terminal', 'battery', 'motor'], uses: { laws: [] },
  },
  {
    id: 'bearing.fit', name: 'Fitting a rolling bearing', makes: 'a bearing seated on its shaft and in its housing', materials: ['steel', 'aluminum', 'cast-iron'],
    tools: ['bearing fitting tool or press', 'induction heater (large bearings)'],
    limits: [
      'The ring that turns with the load gets the interference fit: a rotating shaft about j6 to k6, its housing about H7 (light to normal loads).',
      'Press only on the ring being fitted, never through the balls.',
      'Insert bearings (UC) lock on the shaft with their two set screws instead of a press fit.',
    ],
    source: { cite: 'SKF, Rolling bearings catalogue (bearing fits)' }, tags: ['bearing', 'shaft', 'fit', 'axle'], uses: { laws: ['bearing.life.l10'] },
  },
  {
    id: 'cff', name: 'Continuous fibre fabrication (CFF) printing', makes: 'a printed nylon composite part with continuous fibre laid inside chosen layers', materials: ['polymer'],
    tools: ['continuous-fibre composite printer (two nozzles: matrix and fibre)', 'chopped-fibre filled nylon filament', 'continuous carbon (or aramid, glass) fibre', 'a slicer that routes fibre'],
    limits: [
      'Fibre lies only in the plane of each layer: in-plane it is strong as aluminium, across the layers it is only as strong as the plastic between them. Orient the part so its loads run along its layers.',
      'Fibre goes in whole layers of a part, wrapped round its walls (concentric) or filling them (isotropic); it needs a plastic floor, roof and walls round it.',
      'Layer height 125 to 250 µm on an industrial machine of this kind; the part must fit its build volume (375 × 300 × 300 mm on the one catalogued).',
      'Stiffness follows the rule of mixtures: along the fibre about V_f E_f + (1 − V_f) E_m, across it far less.',
    ],
    source: { cite: 'Markforged FX10 specifications and Composites Material Datasheet', url: 'https://markforged.com/3d-printers/fx10', kind: 'maker' },
    tags: ['3d printing', 'composite', 'carbon fiber', 'onyx', 'additive'], uses: { laws: ['composite.rule-of-mixtures', 'composite.transverse'] },
  },
  {
    id: 'metal.fff', name: 'Metal FFF: print, wash, sinter', makes: 'a steel part printed from metal powder bound in plastic, then debound and sintered dense', materials: ['steel', 'stainless'],
    tools: ['a bound-metal FFF printer (or composite printer with a metal print head)', 'solvent debinding station', 'sintering furnace', '17-4 PH or 316L stainless bound-metal filament'],
    limits: [
      'Printed "green" with binder, washed to remove most of it, then sintered: the part shrinks about a sixth in every direction, so the slicer prints it scaled up about 20% (1/(1 − s)).',
      'Layers after sintering about 127 µm.',
      'Thick solid sections take long to wash and can distort in the furnace; supports and a ceramic release layer are printed where needed.',
    ],
    source: { cite: 'Markforged FX10 Metal Kit announcement; Markforged FX10 specifications', url: 'https://www.metal-am.com/markforgeds-fx10-metal-kit-add-on-enables-both-metal-and-composite-additive-manufacturing/', kind: 'distributor' },
    tags: ['3d printing', 'metal', 'sinter', 'stainless', 'additive'], uses: { laws: ['sinter.scale'] },
  },
];

export const processById = (id: string) => PROCESSES.find((p) => p.id === id);

// ------------------------------------------------------------------------------------------------
// numeric checks a design is held to

/** The tap drill for an ISO metric coarse thread: its size less its pitch, m. */
export function tapDrill(size: string): number | null {
  const t = METRIC_COARSE[size];
  return t ? t.d - t.P : null;
}


/** Least thread engagement for a tapped hole in a material category, in bolt diameters (Machinery's Handbook practice). */
export function threadEngagement(category: string): number | null {
  if (category === 'steel' || category === 'stainless') return 1;
  if (category === 'cast-iron') return 1.5;
  if (category === 'aluminum') return 2;
  return null;
}

/**
 * The least inside bend radius over thickness for a 90° air bend across the grain, by alloy and thickness (m), from
 * the bend-radius charts cited on `bend`; null where the charts don't cover it.
 */
export function minBendRatio(material: string, t: number): number | null {
  const inch = 0.0254;
  if (/^steel\.(a36|1018|1020|mild)/.test(material) || material === 'steel.a36' || material === 'steel.1018-cd') return t <= 0.003 ? 1 : null;
  if (/5052/.test(material)) return t <= inch / 8 ? 1 : t <= (3 * inch) / 16 ? 1.5 : t <= inch / 4 ? 2 : null;
  if (/6061-t6/.test(material)) {
    if (t <= inch / 16) return 2.5;
    if (t <= inch / 4) return 2.5 + ((t - inch / 16) / (inch / 4 - inch / 16)) * (4 - 2.5);
    return null;
  }
  return null;
}

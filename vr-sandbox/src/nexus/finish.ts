// Edges as things are made: hardly anything has a truly sharp corner. A machined edge is broken (deburred), a moulded
// one is as round as the mould's radius, a cast one has its fillet, a bent sheet bends round a radius at least its
// thickness, a wooden edge is eased, a concrete corner is chamfered, glass is arrissed, a cushion is as round as it is
// soft. Each rule is the radius an edge of that make gets (mm), and where it comes from; a part's edges get its
// material's rule, never more than a third of its thinnest side. Every rule can be seen and changed on its board.

export interface EdgeRule { id: string; says: string; mm: number | ((thinMm: number) => number); source: string; mats: string[] }

export const EDGE_RULES: EdgeRule[] = [
  { id: 'machined metal', says: 'edges broken after machining', mm: 0.5, source: 'the common drawing note "break all sharp edges 0.5 mm max" (typical)', mats: ['steel-low', 'steel-alloy', 'steel-tool', 'stainless-304', 'al-6061', 'al-6063', 'copper', 'steel-spring'] },
  { id: 'cast metal', says: 'cast with fillets on its edges', mm: 3, source: 'sand-casting design practice: fillets of 3 mm or more (typical)', mats: ['cast-iron'] },
  { id: 'moulded plastic', says: 'moulded round: its outside radius its inside radius (half its wall) plus its wall', mm: (t) => Math.min(3, 1.5 * Math.min(t, 2.5)), source: 'injection-moulding design guides: inside radius ≥ 0.5 × wall, outside = inside + wall (typical)', mats: ['abs', 'pp', 'pc', 'pmma', 'nylon'] },
  { id: 'wood', says: 'its edges eased by sanding or a round-over', mm: 2, source: 'furniture practice: edges eased 1–3 mm (typical)', mats: ['wood', 'oak'] },
  { id: 'concrete', says: 'its exposed corners chamfered', mm: 20, source: 'formwork practice: a 20 mm (3/4 in) chamfer strip on exposed corners (typical)', mats: ['concrete', 'render'] },
  { id: 'stone and brick', says: 'its arrises worn round', mm: 3, source: 'typical of fired brick and dressed stone', mats: ['brick', 'granite', 'tile'] },
  { id: 'glass', says: 'its edges arrissed (ground)', mm: 1, source: 'glazing practice: arrissed edges about 1 mm (typical)', mats: ['glass'] },
  { id: 'soft things', says: 'as round as it is soft: a quarter of its thickness', mm: (t) => t * 0.25, source: 'an estimate for foam, fabric and leather', mats: ['foam', 'cotton', 'leather', 'silk'] },
  { id: 'rubber', says: 'moulded round', mm: (t) => Math.min(6, t * 0.2), source: 'an estimate', mats: ['rubber'] },
  { id: 'paving', says: 'its kerbs and edges rounded', mm: 10, source: 'kerb units have a 10–15 mm radius on their arris (typical)', mats: ['asphalt', 'soil'] },
  { id: 'anything else', says: 'no edge is quite sharp', mm: 0.3, source: 'an estimate', mats: [] },
];

/** The rule a material's edges follow. */
export const ruleFor = (mat: string | undefined): EdgeRule => EDGE_RULES.find((r) => mat && r.mats.includes(mat)) ?? EDGE_RULES[EDGE_RULES.length - 1]!;
/** The radius, m, of a part's edges: its material's rule, never more than a third of its thinnest side. */
export function edgeRadius(mat: string | undefined, thinnest: number, make?: 'pressed'): number {
  // a pressed panel is as round as it was styled: about a quarter of its thinnest side, up to 150 mm (an estimate)
  if (make === 'pressed') return Math.min(0.15, thinnest * 0.25);
  const r = ruleFor(mat), mm = typeof r.mm === 'number' ? r.mm : r.mm(thinnest * 1000);
  return Math.max(0, Math.min(mm / 1000, thinnest / 3));
}
/** The edge rule's material for a build's material (src/data/materials.ts ids): metals machined, cast iron cast, plastics
 *  moulded, wood eased, glass arrissed, concrete chamfered, brick worn, cloth and foam soft. */

// ---- the surface a process leaves: its roughness, its lay, and how it looks (docs/REALITY.md phase 3, step 3) ----------
// A surface looks as its micro-geometry slopes: light falling on it leaves along each facet's normal, so a surface whose
// facets tilt little shows a sharp highlight and one whose facets tilt much a broad sheen. Where the process sets the
// geometry it is worked out: a turned or face-milled surface is a row of arcs of the tool's nose radius r, spaced by the
// feed f, so its roughness is Ra = f² / (18√3 r) (the parabola's own; Shaw, Metal Cutting Principles) and its facets
// tilt evenly between ± f / 2r across the lay (rms f / 2√3 r), little along it; a printed surface is the same with its
// layer height as the feed and half of it as the radius. Where a process leaves a random surface (grinding, blasting,
// casting) its slopes are typical of it, said so. How much light stays in the mirror direction at all is the surface's
// height against the light's wavelength (Davies: exp(−(4π Rq cos θ / λ)²), at 550 nm, square on); how it looks, its
// facets' rms slope as a microfacet roughness (GGX α ≈ the rms slope; Walter et al., EGSR 2007).

export interface SurfaceMake { id: string; says: string; lay: boolean; source: string;
  /** a kinematic surface: the feed (or layer) f, mm, and the radius it is cut or laid with, mm */ cusp?: { f: number; r: number; slopeAlong: number };
  /** a random surface: its Ra, µm, and its facets' rms slope across and along its lay */ random?: { Ra: number; across: number; along: number } }
export const SURFACE_MAKES: SurfaceMake[] = [
  { id: 'turned', says: 'turned on a lathe: the tool\'s nose arcs, one feed apart, round the part', lay: true, cusp: { f: 0.15, r: 0.8, slopeAlong: 0.01 }, source: 'Ra = f² / 18√3 r (Shaw, Metal Cutting Principles); a finishing feed 0.15 mm/rev and a 0.8 mm nose (typical); along the lay, an estimate' },
  { id: 'face-milled', says: 'face milled: an insert\'s nose arcs, one feed per tooth apart', lay: true, cusp: { f: 0.1, r: 0.8, slopeAlong: 0.015 }, source: 'Ra = f_z² / 18√3 r (the same geometry); 0.1 mm per tooth, a 0.8 mm nose (typical); along the lay, an estimate' },
  { id: 'printed', says: '3D printed in layers (material extrusion): each layer a rounded bead one layer high', lay: true, cusp: { f: 0.2, r: 0.1, slopeAlong: 0.05 }, source: 'the layer as the feed and half of it as the bead\'s radius; 0.2 mm layers (typical); the bead\'s own skin, an estimate' },
  { id: 'ground', says: 'ground: an abrasive wheel\'s grits ploughing fine scratches along it', lay: true, random: { Ra: 0.4, across: 0.08, along: 0.02 }, source: 'Ra 0.1 to 1.6 µm (the common roughness charts: ASME B46.1, Machinery\'s Handbook; typical); slopes typical of ground steel' },
  { id: 'brushed', says: 'brushed with an abrasive belt or pad: long scratches one way', lay: true, random: { Ra: 0.5, across: 0.15, along: 0.02 }, source: 'a No. 4 brushed finish, Ra about 0.4 to 0.8 µm (typical); slopes an estimate' },
  { id: 'polished', says: 'polished to a mirror', lay: false, random: { Ra: 0.02, across: 0.01, along: 0.01 }, source: 'a mirror polish (No. 8), Ra about 0.01 to 0.05 µm (typical); slopes an estimate' },
  { id: 'lapped', says: 'lapped: loose abrasive under a flat plate, every way', lay: false, random: { Ra: 0.1, across: 0.03, along: 0.03 }, source: 'Ra 0.05 to 0.4 µm (the roughness charts; typical); slopes an estimate' },
  { id: 'bead blasted', says: 'bead blasted: dimpled every way by glass beads', lay: false, random: { Ra: 2, across: 0.35, along: 0.35 }, source: 'Ra 1 to 3 µm (typical); a matte, its slopes an estimate' },
  { id: 'sand cast', says: 'sand cast: the sand\'s grains printed in its skin', lay: false, random: { Ra: 12.5, across: 0.5, along: 0.5 }, source: 'Ra 12.5 to 25 µm (the roughness charts; typical); slopes an estimate' },
  { id: 'die cast', says: 'die cast: the steel die\'s finish', lay: false, random: { Ra: 1.2, across: 0.15, along: 0.15 }, source: 'Ra 0.8 to 1.6 µm (the roughness charts; typical); slopes an estimate' },
  { id: 'forged', says: 'forged, its scale cleaned off', lay: false, random: { Ra: 6, across: 0.3, along: 0.3 }, source: 'Ra 3.2 to 12.5 µm (the roughness charts; typical); slopes an estimate' },
  { id: 'spark eroded', says: 'spark eroded (EDM): a field of tiny craters', lay: false, random: { Ra: 3, across: 0.35, along: 0.35 }, source: 'Ra 0.8 to 6.3 µm (the roughness charts; typical); slopes an estimate' },
];

export interface Surface { id: string; says: string; Ra: number; Rq: number; across: number; along: number; alphaAcross: number; alphaAlong: number; specular: number; lay: boolean; how: string; source: string }
/** The surface a process leaves, with its own feed and radius where it is cut (mm), and how it looks. */
export function surfaceOf(id: string, o: { f?: number; r?: number } = {}): Surface {
  const m = SURFACE_MAKES.find((x) => x.id === id); if (!m) throw new Error(`"${id}" is not a process kept here (${SURFACE_MAKES.map((x) => x.id).join(', ')})`);
  let Ra: number, Rq: number, across: number, along: number, how: string;
  if (m.cusp) {
    const f = o.f ?? m.cusp.f, r = o.r ?? m.cusp.r; if (!(f > 0 && r > 0)) throw new Error('a feed and a radius above nothing');
    // (the arcs as parabolas y = x² / 2r over a feed: Ra f²/18√3r, Rq f²/4√45 r, slopes even across ± f/2r)
    Ra = (f * f) / (18 * Math.sqrt(3) * r) * 1000; Rq = (f * f) / (4 * Math.sqrt(45) * r) * 1000; across = Math.min(1, f / (2 * Math.sqrt(3) * r)); along = m.cusp.slopeAlong;
    how = `worked out from its feed ${f} mm and radius ${r} mm`;
  } else { Ra = m.random!.Ra; Rq = 1.25 * Ra; across = m.random!.across; along = m.random!.along; how = 'typical of the process'; }
  // (how much of the light stays in the mirror direction: Davies, at 550 nm, square on)
  const specular = Math.exp(-(((4 * Math.PI * Rq) / 0.55) ** 2));
  return { id: m.id, says: m.says, Ra, Rq, across, along, alphaAcross: across, alphaAlong: along, specular, lay: m.lay, how, source: m.source };
}
/** A finish word the parts here carry, as the process that leaves it. */
export const FINISH_MAKE: Record<string, string> = { ...Object.fromEntries(SURFACE_MAKES.map((m) => [m.id, m.id])), machined: 'turned', chrome: 'polished', cast: 'sand cast', satin: 'bead blasted', thread: 'turned' };

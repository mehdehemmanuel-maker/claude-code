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
  { id: 'stamped contacts', says: 'stamped, or cut from square wire: its edges only as round as the die rolls them, about a tenth of its thickness', mm: (t) => 0.1 * t, source: 'stamping practice: die roll 5–10 % of the stock\'s thickness (typical)', mats: ['brass', 'phosphor-bronze', 'beryllium-copper'] },
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
/** The rules as lines a board can show and a person can change: "edges <rule> <mm> mm". */
export const edgeLines = (): string[] => EDGE_RULES.map((r) => `edges ${r.id} ${typeof r.mm === 'number' ? `${r.mm} mm` : 'by thickness'}: ${r.says} (${r.source})`);
/** A rule changed by its line: "edges wood 4 mm", "edges machined metal 0.2". */
export function setEdge(line: string): string {
  const m = /^edges\s+(.+?)\s+(\d+(?:\.\d+)?)\s*(?:mm)?\b/i.exec(line.trim()); if (!m) return 'Say it as "edges <kind> <mm>": "edges wood 4 mm".';
  const r = EDGE_RULES.find((x) => x.id === m[1]!.toLowerCase() || x.mats.includes(m[1]!.toLowerCase())); if (!r) return `No edge rule for "${m[1]}": there are ${EDGE_RULES.map((x) => x.id).join(', ')}.`;
  r.mm = Number(m[2]); r.source = 'set by you'; return `Edges of ${r.id} now ${r.mm} mm (${r.says}).`;
}
/** The edge rule's material for a build's material (src/data/materials.ts ids): metals machined, cast iron cast, plastics
 *  moulded, wood eased, glass arrissed, concrete chamfered, brick worn, cloth and foam soft. */
export function edgeMatOf(id: string | undefined): string | undefined {
  if (!id) return undefined; const k = id.split('.')[0]!;
  return ({ steel: 'steel-low', stainless: 'steel-low', aluminum: 'al-6061', copper: 'copper', brass: 'copper', titanium: 'steel-low', composite: 'steel-low', 'cast-iron': 'cast-iron', wood: 'wood', cork: 'wood', polymer: 'abs', rubber: 'rubber', glass: 'glass', concrete: 'concrete', ceramic: 'brick', textile: 'cotton', leather: 'leather', foam: 'foam' } as Record<string, string>)[k];
}

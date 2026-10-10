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
  { id: 'chip moulding', says: 'a chip\'s moulding: sawn from a moulded panel (a QFN, a DFN: its edges as sawn) or cast in a cavity of its own (as round as the cavity, about 0.1 mm); never a cushion', mm: (t) => Math.min(0.1, t * 0.1), source: 'JEDEC outline drawings (MO-220, MO-229) draw them sharp; 0.1 mm an estimate', mats: ['emc'] },
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

// ---- the burr a cut leaves, and what takes it off ---------------------------------------------------------------
// The rules above say how round an edge is once a part is finished. This says what is there before anyone finishes
// it, which is the part a plan forgets: every cut leaves a burr, the burr is always on the side the tool came out,
// and a burr left on a mating face is a 0.2 mm shim under a part that was made to 0.02. Deburring is not optional
// tidying — it is the difference between an assembly that measures right and one that does not.

export interface Burr {
  /** which side of the cut it stands on */ side: 'exit' | 'both' | 'none';
  /** how tall it stands, mm (an estimate of the class) */ mm: number;
  /** what takes it off, and how long for the whole part */ by: string; minutes: number;
  /** why it matters here rather than in general */ says: string;
}
/** The burr a process leaves on a material, and what takes it off. A drill leaves its burr where it breaks through
 *  and a crown round the entry; a mill leaves it on the exit side of each pass; a laser leaves dross underneath; a
 *  saw leaves it on the far face; a punch leaves a rollover one side and a burr the other, which is why a punched
 *  part has a right way up. */
export function burrOf(process: string, mat: string | undefined, o: { thickMm?: number; holes?: number; edges?: number } = {}): Burr {
  const t = o.thickMm ?? 3, n = (o.holes ?? 0) + (o.edges ?? 1);
  const hard = /steel|stainless|iron|titanium/.test(mat ?? ''), soft = /al-|brass|copper|zinc/.test(mat ?? '');
  const plastic = /abs|pla|petg|pc|pmma|nylon|pp|pe/.test(mat ?? '');
  if (process === 'drill') return { side: 'both', mm: hard ? 0.15 : 0.25, by: 'a countersink turned by hand in each hole, both sides', minutes: +(0.25 * Math.max(1, o.holes ?? 1)).toFixed(1),
    says: 'a drill leaves a crown where it enters and a ring where it breaks through; the breakout side is the taller, and on a part held in a vice that is the side you cannot see' };
  if (process === 'mill') return { side: 'exit', mm: soft ? 0.2 : hard ? 0.1 : 0.3, by: 'a file along each edge, or a 0.5 mm chamfer cut with the same cutter before it comes off the machine', minutes: +(0.3 * n).toFixed(1),
    says: `${soft ? 'aluminium throws a long ragged burr that comes off in one piece and takes a fingertip with it' : plastic ? 'plastic leaves a whisker that melts back onto the part if the cutter is dull' : 'steel leaves a short hard burr that files off and blunts the file'}; chamfering it on the machine costs a minute and saves filing six edges by hand` };
  if (process === 'laser-co2' || process === 'laser-fibre') return { side: 'exit', mm: 0.1, by: 'dross broken off the underside and the edge wiped', minutes: +(0.2 * n).toFixed(1),
    says: 'a laser leaves its dross on the underside where the melt was blown out, and a heat-affected edge that is harder than the parent metal: tap it before you harden anything, not after' };
  if (process === 'saw') return { side: 'both', mm: 0.3, by: 'a file across both faces of each cut', minutes: +(0.2 * n).toFixed(1),
    says: 'a sawn end has a burr on the face the blade left and a lip on the one it entered; both sit under whatever is clamped to it' };
  if (process === 'press' || process === 'bend') return { side: 'exit', mm: +(0.1 * t).toFixed(2), by: 'the part kept the right way up: its rollover face outward, its burr face inward', minutes: 0,
    says: 'a punched edge has a rolled-over side where the punch pushed in and a burr side where it broke through, so a punched part has a right way up and a wrong one, and fitting it upside down puts the burr on the show face' };
  if (process === 'turn') return { side: 'exit', mm: 0.1, by: 'a chamfer or a radius turned on each shoulder before it comes out of the chuck', minutes: 0.5,
    says: 'a turned shoulder leaves a wire edge that will not let a bearing seat square; take it off while the part is still running' };
  return { side: 'none', mm: 0, by: 'nothing: this process leaves no burr', minutes: 0,
    says: `${process} adds or forms material rather than shearing it, so there is no burr — but a print has its own first layer's elephant foot and a casting its flash, which are the same problem by another name` };
}

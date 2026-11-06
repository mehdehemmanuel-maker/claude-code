// How a build the AI made is scored, with no model (decision 0026, step 4; decision 0027): its board runs with every node
// ok, uses a block of each kind it names (read inside a folded block on it too, down to the bottom: a seed's or a saved
// block's own board, and a group's board folded in place), and gives one thing (its pieces joined by the faces the
// operations wrote, one group) of at least so many pieces. Shared by the forty builds (builds.eval.ts) and the compound
// requests built from their parts (compose.eval.ts).
// A kind is read by what a part is, not by one id (decision 0028): a block whose id the kind names, or a family on an
// aisle of the kind (its trade / category, aisles.ts) whose own name says the kind (an aisle can hold more than the kind:
// a gasket sits with the flanges), so a new family of the same kind counts; and, only for a kind that says so, a piece of
// the build by its name (a hull, a boom: things no family makes). Never looser than what is asked: the same kinds.
import { Engine } from '../../src/nexus/dataflow';
import { block } from '../../src/nexus/blocks';
import { aisleOf } from '../../src/nexus/parts/aisles';
import { nodesOf, type Board } from '../../src/nexus/boards';

/** A kind of part asked for: `ids` a pattern on block ids; `aisle` a pattern on a used block's aisle and `named` one on
 *  that block's own name (both must hold); `pieces` a pattern on the build's pieces' names (only where a kind is read by
 *  name); `any` other kinds, any of which will do ("a shaft or a plate"). */
export interface Kind { says: string; ids?: RegExp; aisle?: RegExp; named?: RegExp; pieces?: RegExp; any?: Kind[] }
/** A kind as the sets write it: a pattern alone is read on block ids and on pieces' names, as before decision 0028. */
export type Asked = RegExp | Kind;
/** What a request asks for: the kinds its board must use, and its least pieces. */
export interface Want { uses: Asked[]; pieces: number }
export const W = (pieces: number, ...uses: Asked[]): Want => ({ uses, pieces });
/** A kind read by its ids, and by the aisle and the name of a family of it. */
export const kind = (says: string, ids: RegExp | undefined, aisle?: RegExp, named?: RegExp): Kind => ({ says, ...(ids ? { ids } : {}), ...(aisle ? { aisle } : {}), ...(named ? { named } : {}) });
/** Any of several kinds. */
export const either = (says: string, ...any: Kind[]): Kind => ({ says, any });
const kindOf = (k: Asked): Kind => (k instanceof RegExp ? { says: String(k), ids: k, pieces: k } : k);
/** Whether a board that uses these block ids (and these at the sizes chosen on them: a bar of a section at "steel IPE
 *  100" is an I-beam) and makes pieces of these names holds a part of the kind. */
export function holds(k: Asked, ids: readonly string[], names: readonly string[], sized: readonly (readonly [string, string])[] = []): boolean {
  const q = kindOf(k);
  if (q.any?.some((x) => holds(x, ids, names, sized))) return true;
  if (q.pieces && names.some((n) => q.pieces!.test(n))) return true;
  const family = (id: string, size = '') => { const d = block(id), a = aisleOf(d); return !!d && !!a && !!q.aisle?.test(a) && (!q.named || q.named.test(`${d.name}${size ? ` ${size}` : ''}`)); };
  return ids.some((id) => q.ids?.test(id) || family(id)) || sized.some(([id, size]) => family(id, size));
}
/** Every block id on a board with the size chosen on its node, down to the bottom as usedIn reads it. */
export function sizedIn(b: Board | undefined, seen = new Set<Board>()): [string, string][] {
  if (!b || seen.has(b)) return []; seen.add(b);
  return Object.values(b.nodes ?? {}).flatMap((n): [string, string][] => { if (n.deleted) return [];
    const here: [string, string][] = n.block && n.set?.size !== undefined ? [[n.block, String(n.set.size)]] : [];
    return [...here, ...sizedIn(n.inner ?? (n.block ? block(n.block)?.graph : undefined), seen)]; });
}
/** What a kind is called in a reason. */
export const saysOf = (k: Asked): string => (k instanceof RegExp ? String(k) : k.says);

// The kinds the forty single builds ask for (builds.eval.ts), each by its families' ids, then by any family on its aisle
// whose name says it. The aisles are as aisles.ts and the families' own `aisle` give them on 23d5d13.
const MOTORS = /^Motion \/ Motors$/, SECTIONS = /^Structure \/ (Sections|Steel sections|Steel tube)$/;
const BOLTS = /^Fasteners \/ (Bolts|Screws|Wood and masonry|Inch bolts and screws|Tapping screws|Thumb and wing screws|Studs)$/;
export const KINDS = {
  led: kind('an LED', /^piece\.led$/, /^Electronics \/ (Lights|Optoelectronics)$/, /^(SMD )?LED\b(?! display)/),
  plate: kind('a plate', /^piece\.plate$/, /^Structure \/ Plates and sheet$/, /\bplate\b/i),
  sheetOrPlate: kind('a sheet or a plate', /^piece\.sheet$|^piece\.plate$/, /^Structure \/ Plates and sheet$/),
  fastener: kind('a bolt, screw or nail (or a joint of them)', /^piece\.(bolt|csk|buttonhead|panhead|woodscrew|shoulderscrew|carriagebolt|threadedrod|setscrew|deckscrew|nail)$|^mate\.(bolted|plate|lid)$/, BOLTS, /bolt|screw|nail|stud|threaded rod/i),
  lidBolted: kind('a lid joint or its bolts', /^mate\.(lid|bolted)$|^piece\.(bolt|csk)$/, BOLTS, /bolt|screw/i),
  box: kind('a hollow box', /^piece\.case$/, /^(Structure \/ Boxes|Enclosures \/ .+|Electrical installation \/ Wall boxes)$/, /box|case/i),
  tankOrBox: kind('a tank or a box', /^piece\.(tank|case)$/, /^(Fluid \/ Tanks|Structure \/ Boxes)$/, /tank|box/i),
  stepper: kind('a stepper motor', /^piece\.stepper$/, MOTORS, /stepper/i),
  dcMotor: kind('a DC or gear motor', /^piece\.(gearmotor|dcmotor)$/, MOTORS, /\bDC\b|gear ?motor/i),
  servo: kind('a servo', /^piece\.servo$/, MOTORS, /servo/i),
  extrusion: kind('an aluminium extrusion', /^piece\.extrusion$/, /^Structure \/ (Sections|Aluminium profiles)$/, /extrusion|t-slot|v-slot/i),
  devboard: kind('a development board', /^piece\.devboard$/, /^Electronics \/ (Boards and displays|Modules)$/, /development board|dev board|microcontroller/i),
  standoff: kind('a standoff', /^piece\.(standoff|hexstandoff)$/, /\/ Standoffs/, /standoff/i),
  fan: kind('a fan', /^piece\.fan$/, /\/ Fans$/, /fan/i),
  cornerBracket: kind('a corner bracket', /^piece\.cornerbracket$/, /^Structure \/ Brackets$/, /corner/i),
  shaft: kind('a shaft', /^piece\.shaft$/, /Shafts and couplers$/, /shaft( \(|$)/i),
  pillowBlock: kind('a pillow block', /^piece\.pillowblock$/, /^(Motion \/ Bearings|Bearings \/ .+)$/, /pillow/i),
  pulley: kind('a pulley', /^piece\.pulley$/, /(Gears, pulleys and belts|Belts and pulleys)$/, /pulley/i),
  ballBearing: kind('a ball bearing', /^piece\.bearing$/, /^(Motion \/ Bearings|Bearings \/ .+)$/, /^(?!thrust).*ball bearing/i),
  wheel: kind('a wheel', /^piece\.wheel$/, /Wheels and castors$/, /wheel/i),
  castor: kind('a castor', /^piece\.castor$/, /Wheels and castors$/, /castor|caster/i),
  ballValve: kind('a ball valve', /^piece\.ballvalve$/, /\/ Valves$/, /ball valve/i),
  valve: kind('a valve', /^piece\.(ballvalve|checkvalve|needlevalve)$/, /\/ Valves$/, /valve/i),
  steelPost: kind('a steel post', /^piece\.(hollowsection|steelbeam|bar)$/, SECTIONS, /^steel (hollow|beam|h column|i beam|tube)|^bar\b/i),
  block: kind('a brick or concrete block', /^piece\.brick$/, /^Structure \/ (Masonry|Lintels and padstones)$/, /brick|block|padstone/i),
  wallOrBrick: kind('a wall or a brick', /^piece\.(wall|brick)$/, /^Structure \/ Masonry$/, /brick|block/i),
  timber: kind('sawn timber', /^piece\.lumber$/, /^Structure \/ Timber$/, /timber|lumber/i),
  woodFixing: kind('a nail or wood screw', /^piece\.(nail|woodscrew|deckscrew)$/, /^Fasteners \/ (Wood and masonry|Tapping screws)$/, /nail|screw/i),
  handle: kind('a pull handle', /^piece\.handle$/, /Handles and knobs$/, /handle|pull/i),
  hinge: kind('a hinge', /^piece\.(hinge|pianohinge)$/, /^Hardware \/ Hinges/, /hinge/i),
  lBracket: kind('an L bracket', /^piece\.bracket$/, /^Structure \/ Brackets$/, /\bL bracket|angle bracket/i),
  bracket: kind('a bracket', /^piece\.(anglebracket|bracket)$/, /^Structure \/ Brackets$/, /bracket/i),
  breadboard: kind('a breadboard', /^piece\.breadboard$/, /Boards and displays$/, /breadboard/i),
  resistor: kind('a resistor', /^piece\.resistor$/, /\/ Passives$/, /resistor/i),
  pvcPipe: kind('a PVC pipe', /^piece\.pvcpipe$/, /^(Fluid \/ Pipe and tube|Building \/ Drainage|Plumbing \/ Pressure pipe)$/, /^(?!.*(bend|junction|coupler|fitting)).*PVC/i),
  pvcFitting: kind('a PVC fitting', /^piece\.pvcfitting$/, /^(Fluid \/ Fittings|Building \/ Drainage)$/, /PVC.*fitting|(bend|junction|coupler).*PVC/i),
  flange: kind('a flange', /^piece\.(flange|asmeflange)$/, /\/ Flanges/, /flange(?!\s*gasket)/i),
  gasket: kind('a flange gasket', /^piece\.flangegasket$/, /\/ (Flanges|Seals)/, /gasket/i),
  coupler: kind('a shaft coupler', /^piece\.coupler$/, /(Shafts and couplers|Power transmission \/ Couplings)$/, /coupl/i),
  leadScrew: kind('a lead screw', /^piece\.leadscrew$/, /Linear motion$/, /^lead screw$/i),
  leadNut: kind('a lead screw nut', /^piece\.leadnut$/, /Linear motion$/, /lead screw nut/i),
  rail: kind('a linear rail', /^piece\.mgn$/, /Linear motion$/, /rail/i),
  cell: kind('a cell', /^piece\.cell$/, /^Electronics \/ (Power|Batteries)$/, /cell|battery/i),
  switchOrFuse: kind('a switch or a fuse', /^piece\.(switch|toggle|fuse)$/, /^(Electronics \/ (Switches and relays|Controls|Fuses|Power)|Electrical installation \/ (Fuses|DIN rail and breakers))$/, /switch|fuse|breaker/i),
  wallPlug: kind('a wall plug', /^piece\.wallplug$/, /Wood and masonry$/, /plug/i),
  gear: kind('a gear', /^piece\.gear$/, /(Gears, pulleys and belts|Power transmission \/ Gears)$/, /gear(?! rack)/i),
  collar: kind('a shaft collar', /^piece\.collar$/, /Shafts and couplers$/, /collar/i),
  gasStrut: kind('a gas strut', /^piece\.gasstrut$/, /Springs and struts$/, /strut/i),
  heatSet: kind('a heat-set insert', /^piece\.heatset$/, /Rivets and inserts$/, /heat-set/i),
  tNut: kind('a T-slot nut', /^piece\.tnut$/, /\/ Nuts$/, /T-slot|T-nut/i),
  display: kind('a display', /^piece\.display$/, /Boards and displays$/, /display/i),
  threadedRod: kind('a threaded rod', /^piece\.threadedrod$/, /^Fasteners \/ (Bolts|Studs)$/, /threaded rod/i),
  nut: kind('a nut', /^piece\.(nut|nyloc)$/, /\/ (Nuts|Inch nuts)$/, /nut/i),
  washer: kind('a washer', /^piece\.washer$/, /\/ (Washers|Inch washers)$/, /washer/i),
  magnet: kind('a magnet', /^piece\.magnet$/, /Magnets$/, /magnet/i),
  iBeam: kind('a steel I-beam', /^piece\.steelbeam$/, /^Structure \/ (Sections|Steel sections)$/, /\bI beam|steel beam|\bsteel (IPE|IPN|HE[AB])\b/i),
  steelAngle: kind('a steel angle', /^piece\.steelangle$/, /^Structure \/ Sections$/, /steel angle/i),
};

type RoomLike = { pieces: readonly { name: string }[]; faces: readonly { a: number; b: number }[] };
/** How many groups a block's pieces fall in, joined by the faces the operations wrote. */
const groups = (b: RoomLike) => { const up = b.pieces.map((_, i) => i), find = (i: number): number => (up[i] === i ? i : (up[i] = find(up[i]!)));
  for (const f of b.faces) up[find(f.a)] = find(f.b); return new Set(b.pieces.map((_, i) => find(i))).size; };
/** Every block id a board uses, down to the bottom: a node's block and the board inside it (a seed's, a saved block's, a
 *  group's folded in place), each block's board read once. */
export function usedIn(b: Board | undefined, seen = new Set<string>()): string[] {
  return Object.values(b?.nodes ?? {}).flatMap((n) => { if (n.deleted) return []; const id = n.block ?? '';
    // (a group folded in place has no block id: its own board is read)
    if (!id) return n.inner ? usedIn(n.inner, seen) : [];
    if (seen.has(id)) return [id]; seen.add(id); return [id, ...usedIn(n.inner ?? block(id)?.graph, seen)]; });
}
/** Why a board is not what was asked (null: it is). Its biggest block: the build. */
export function score(board: Board, e: Engine, w: Want): string | null {
  const ns = nodesOf(board); if (!ns.length) return 'the board is empty';
  const bad = ns.filter((n) => e.state.get(n.id)?.status !== 'ok'); if (bad.length) return `${bad.length} nodes not ok: ${bad[0]!.id} ${e.state.get(bad[0]!.id)?.status ?? 'not run'} ${e.state.get(bad[0]!.id)?.error?.slice(0, 90) ?? ''}`;
  const blocks = ns.map((n) => e.state.get(n.id)?.out?.block as RoomLike | undefined).filter((b): b is RoomLike => !!b?.pieces);
  if (!blocks.length) return 'no block made';
  const big = blocks.reduce((a, b) => (b.pieces.length > a.pieces.length ? b : a)), g = groups(big);
  const ids = usedIn(board), names = big.pieces.map((p) => p.name), sized = sizedIn(board), miss = w.uses.filter((u) => !holds(u, ids, names, sized));
  if (miss.length) return `no ${miss.map(saysOf).join(', ')} on the board (it used ${[...new Set([...ids, ...names])].join(', ').slice(0, 160)})`;
  if (big.pieces.length < w.pieces) return `its build has ${big.pieces.length} pieces, fewer than ${w.pieces}`;
  return g === 1 ? null : `its build falls in ${g} groups, not one thing`;
}

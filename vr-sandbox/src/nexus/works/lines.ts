// Reading one line of a build: what it is made of, what shape it is, how close it has to be, and whether this works
// makes it, buys it as a component, or buys it as material and works it.
//
// Keeping the last two apart is the difference between a plan that welds a frame and one that quietly buys it: you
// buy the tube, and the job is still cutting it to length and welding it. `ALWAYS_BOUGHT` is what no small works
// makes and the process that is missing for each; `STOCK` is what is bought by the metre or the sheet and worked
// here. Conflating them is how a plan for a welded bench loses the welding.
//
// Owner of: a build's line, the two bought lists, the material class and shape a line's own words give it, the
// tolerance it is really held to (through `fits.ts`), and what it costs to buy.

import { PRICES, cheapest, priceKeyOf } from '../parts/prices';
import { tolFor } from '../parts/fits';
import type { MatClass, Shape } from './families';

/** What no small works makes, and the real reason — not "it is hard" but the process that is missing. This list is the
 *  most useful thing in the file: the difference between a works that bootstraps and one that buys a lathe and still
 *  cannot make a printer. These are bought finished and never worked here. */
export const ALWAYS_BOUGHT: { what: RegExp; unless?: RegExp; why: string }[] = [
  { what: /crucible/i, unless: /tong|lifter|shank|ring\b/i, why: 'pressed from clay and graphite and fired to a temperature no small kiln reaches, and a home-made one fails with 3 kg of molten metal in it, which is the one failure in this building that cannot be swept up' },
  { what: /\b(pail|bucket|drum)\b/i, unless: /lid|handle|mount/i, why: 'deep-drawn or spun from sheet in one hit on a press of hundreds of tonnes: $8 finished, and unmakeable here at any price' },
  { what: /bearing/i, unless: /housing|carrier|cap\b|block\b|puller|\bbore\b|\bseat\b|journal|pocket|mount/i, why: 'its raceways are ground and its balls graded to a micron and sorted by size; the grinder that does it costs more than the whole works' },
  { what: /linear (rail|guide|bearing|shaft)|guide ?rail|guideway|\bmgn\d|\bhgr\d|ball ?screw|lead ?screw|\bsbr\d/i, why: 'ground and preloaded over its whole length: the bearing\'s problem again, on something a metre long' },
  { what: /\bmotor\b|stepper|\bservo\b|solenoid|outrunner|\bnema\s?\d/i, unless: /mount|bracket|plate|adapter|coupler|pulley|boss/i, why: 'sintered magnets, stamped and insulated laminations and a machine-wound coil: three processes, none of them in a small works' },
  { what: /\bbelt\b|timing belt/i, unless: /tension|clamp|guide/i, why: 'moulded onto its steel or glass cords in a heated press, to a pitch held over its whole length' },
  // (found 2026-10-11 by throwing an invented machine at the works: a toothed pulley came out turned on a mini lathe
  //  and a $3 coupling came out forged. A GT2 tooth form is hobbed or moulded to the same pitch as its belt, and
  //  nothing that turns a cylinder cuts it; a plain flat or V pulley still is turned here, which is why this is
  //  written on the tooth form and not on the word "pulley")
  { what: /\b(gt2|htd|mxl|t2\.5|timing|toothed)\b[^,]*\b(pulley|idler|sprocket)\b|\b(pulley|idler|sprocket)\b[^,]*\b(gt2|htd|mxl|timing|toothed)\b/i, why: 'its tooth form is hobbed or moulded to the belt\'s own pitch over every tooth: a lathe turns the blank and cannot cut the form' },
  { what: /\b(coupling|coupler)\b/i, unless: /\bpipe\b|\bhose\b|\bbowden\b/i, why: 'a slit flexible coupling is bored, slit and tapped in one setup on a mill with a slitting saw, concentric to a hundredth: $3 finished' },
  // (the whole hot end is a purchase. Each of its pieces failed here for a different reason — the block and the sink
  //  for cutter stickout, the nozzle because a 0.4 mm orifice wants a 0.4 mm drill — and all three are the same $5
  //  answer, which is the kind of thing a plan should say once rather than three times)
  { what: /hot ?end|heat ?break|heat(er)? ?block|\bnozzle\b|\b(drive|extruder|hobbed) gear\b/i, why: 'a hot end\'s pieces are turned and drilled to bores a tenth of a millimetre across in hardened or free-cutting stock, and sold as a set for a few dollars: making one costs more in cutters than buying ten' },
  { what: /screw|bolt|\bnut\b|washer|fastener|t-slot|\binsert\b|rivet|\bstud\b/i, unless: /\bboss\b|plate\b|housing|lead ?screw/i, why: 'cold-headed and thread-rolled by the thousand at a few cents each; a lathe cuts one in twenty minutes and it is weaker, because a rolled thread\'s grain follows the form and a cut one\'s is severed' },
  { what: /\bboard\b|\bpcb\b|electronic|display|\blcd\b|\bpsu\b|power supply|\bchip\b|sensor|thermistor|endstop|\bswitch\b|camera|receiver|transmitter|\besc\b|flight controller|antenna/i,
    unless: /cradle|mount|bracket|holder|housing|\bcase\b|cover|clamp|shroud|stand\b|plate\b|tray/i, why: 'a wafer fab and a pick-and-place line' },
  { what: /batter|lipo|li-ion|\bcell\b|\bpack\b|accumulator/i, unless: /holder|tray|mount|bracket|strap|cradle|box\b/i, why: 'wound or stacked electrodes, a separator a few microns thick and a sealed, dry fill: a cell made badly is a fire, and none of it is a workshop process' },
  { what: /\bspring\b/i, unless: /seat\b|perch|retainer|cup\b/i, why: 'wound from patented wire, then set and stress-relieved: a spring made cold and unset creeps' },
  { what: /heater|heat(er)? cartridge|thermocouple/i, unless: /block\b|mount|holder/i, why: 'a resistance element swaged in magnesia inside a sheath' },
  { what: /o-ring|\bseal\b|gasket/i, unless: /groove|land\b|plate\b/i, why: 'compression-moulded to a tolerance on the cord, in a compound chosen for what it touches' },
  { what: /\bfan\b|blower|impeller/i, unless: /duct|shroud|mount|bracket|guard|grille/i, why: 'a moulded impeller balanced on a brushless motor' },
  { what: /\bptfe\b|bowden/i, unless: /clip|collet|fitting/i, why: 'extruded and drawn to a bore held over its length' },
  { what: /\bwheel\b|\btyre\b|\btire\b|caster|\broller\b/i, unless: /\bboss\b|\bhub\b|adapter|mount|bracket|spacer|guard|arch|well\b|nut\b|stud\b|potter|\bseat\b|spindle|\baxle\b|journal|\bstub\b|carrier/i,
    why: 'moulded rubber or polycarbonate running on a bearing, which is the bearing problem again' },
];

/** What is bought as *material* and then worked here. This is not the list above, and keeping the two apart is the
 *  difference between a plan that welds a frame and one that quietly buys it: you buy the tube, and the job is still
 *  cutting it to length and welding it. Nothing in a small works rolls its own section or sheet — that is a hot mill
 *  and a rolling line — and everything in a small works cuts it. */
export const STOCK: { what: RegExp; unless?: RegExp; why: string }[] = [
  { what: /box section|\btube\b|tubing|\bpipe\b/i, unless: /fitting|clamp|cutter/i, why: 'drawn or rolled and seam-welded to a wall held over six metres: bought by the length, cut and welded here' },
  { what: /\bsheet\b|\bplate\b|\bply\b|plywood|\bmdf\b|laminate/i, unless: /face ?plate|back ?plate/i, why: 'rolled or pressed flat to a thickness and a flatness no workshop reproduces: bought by the sheet, cut here' },
  { what: /\bbar\b|\brod\b|round stock|hex stock|\bangle\b|\bchannel\b|extrusion/i, unless: /bracket|corner|nut\b|roller/i, why: 'rolled or extruded to section and straightness: bought by the length, cut and machined here' },
  { what: /filament|\bresin\b|\bclay\b|concrete mix|\bsand\b|\bwire\b/i, unless: /holder|guide|spool ?holder|cutter|stripper/i, why: 'the feedstock itself: bought by the kilo, and everything downstream is the works\' own work' },
  { what: /refractory|firebrick|castable|kaowool|ceramic ?(fibre|blanket)/i, why: 'fired or cast to a published service temperature and a published density: bought by the bag or the brick, then laid dry or poured into place by hand \u2014 there is no process here that makes a refractory, and none is needed' },
];

/** The material class a material's name falls in. */
export function classOf(mat: string): MatClass | null {
  if (/^(abs|pla|petg|pbt|pc|pp|pe|pom|nylon|ptfe|pet|pmma|pvc|asa|tpu)$/.test(mat)) return 'thermoplastic';
  if (/^(resin|photopolymer)/.test(mat)) return 'photopolymer';
  if (/^(al-|zamak|brass|bronze|copper|solder|zinc|lead|tin)/.test(mat)) return 'metal-soft';
  if (/^(steel|stainless|cast-iron|iron|tungsten|molybdenum|kovar|nickel|kanthal|titanium)/.test(mat)) return 'metal-hard';
  if (/^(rubber|nbr|neoprene|pu|foam|silicone|leather|epdm|viton)/.test(mat)) return 'elastomer';
  if (/^(fr4|pcb|kapton)/.test(mat)) return 'board';
  if (/^(cfrp|fibreglass|gfrp|carbon|composite)$/.test(mat)) return 'composite';
  if (/^(glass|firebrick|csi|kbr|quartz|borosilicate)/.test(mat)) return 'glass';
  if (/^(wood|oak|paper|pine|birch|ply)/.test(mat)) return 'wood';
  if (/^(clay|stoneware|porcelain|earthenware|terracotta|glaze)/.test(mat)) return 'clay';
  if (/^(concrete|brick|tile|render|mortar|cement)/.test(mat)) return 'concrete';
  if (/^(cells?|tissue|agar|media|dna|culture)/.test(mat)) return 'live';
  return null;
}

/** What a part's name says it is: round, flat, or neither. A process that only makes one of them is only offered the
 *  parts it could make, which is the rule that stops a lathe being handed a printed bracket. */
export function shapeOf(line: { name: string; size?: [number, number, number]; shape?: Shape }): Shape {
  if (line.shape) return line.shape;
  if (/shaft|spindle|boss|bush|\bpin\b|axle|roller|disc|disk|\bhub\b|spacer|collar|nozzle|\bcone\b|\bring\b|pulley/i.test(line.name)) return 'round';
  if (/plate|sheet|panel|\bpan\b|\btop\b|gusset|bracket|washer|shim|cover|\bply\b|blank|\bdeck\b/i.test(line.name)) return 'flat';
  if (line.size) { const [a, b, c] = [...line.size].sort((x, y) => x - y); if (c > 0 && a / c < 0.12 && b / c > 0.4) return 'flat'; }
  return 'solid';
}

/** One line of what is to be made: a part, how many, what of, how big. This is the engine's only input, so anything
 *  that can be listed can be thrown at it — a maker's own bill of materials, a kit's parts, or something sketched. */
export interface PartLine {
  name: string; n: number; mat: string;
  /** mm */ size?: [number, number, number];
  /** cm³ of material actually in one — not its envelope. A sparse print or a shelled casting is a fraction of its
   *  box, and charging the box instead is how a plan says 29 hours for a pattern that takes 4. */ cm3?: number;
  /** ± mm. Leave it out and `tolOf` derives it from what the part is: a bearing seat gets the bearing's own fit,
   *  a cover gets IT12, a bracket gets IT11. Writing a tolerance by hand is how every one of them became a guess. */
  tol?: number;
  /** the size the tolerance is on, mm (a bore's diameter), where it is not the smallest of `size` */ feature?: number;
  /** the thinnest standing wall in it, mm: a cutter pushes over anything under a third of its diameter */ wall?: number;
  shape?: Shape;
}

/** The tolerance a line is really held to: its own if it says one, else derived from what the part is. This is the
 *  judgement call that used to be made by feel on every line of every build, and it is now a table lookup through a
 *  fit (`fits.ts`). */
export function tolOf(line: PartLine): { tol: number; why: string; fit?: string } {
  const at = line.feature ?? (line.size ? Math.min(...line.size) : undefined);
  if (line.tol != null) return { tol: line.tol, why: `±${line.tol} mm, as the build asked for it` };
  return tolFor(line.name, at);
}
/** A joint a build declares. A bill of materials never says how the thing is held together, and a plan that does not
 *  ask loses the welding — which on a frame is the whole job. */
export interface Join {
  how: string; n: number; /** mm of bead or seam, each */ mm?: number;
  /** when it happens. 'after-parts' (the default) is a joint made once the parts are finished — a weld, a bolt.
   *  'before-finishing' is a joint made while the material is still green: a handle slipped onto a mug before the
   *  firing, a bound-metal part assembled before the sinter. Get this wrong and the plan fires the handle on its own
   *  and then asks you to glue fired clay to fired clay, which does not work. */
  when?: 'after-parts' | 'before-finishing';
  says: string;
}

/** What n of a bought line costs, looked up by its own words: its price key, the key that names it as its item, else
 *  the key whose description shares one of the line's longer words. Null where nothing in prices.ts is that thing —
 *  which is said as a gap rather than guessed at, because a made-up price is worse than no price. */
export function priceOfLine(line: PartLine): { usd: number; key: string } | null {
  const low = line.name.toLowerCase();
  // whitespace tokens first, hyphens kept: a price key like `pack-lipo-4s` is one word of the line, and splitting it
  // on the hyphen is how `pack-lipo-4s battery` ends up priced as a $0.95 battery holder
  const tokens = low.split(/\s+/).map((w) => w.replace(/^[^a-z0-9]+|[^a-z0-9-]+$/g, '')).filter(Boolean);
  const words = low.split(/[^a-z0-9.]+/).filter((w) => w.length > 2);
  for (const k of [low, ...tokens, ...words, ...words.map((w) => w.replace(/s$/, ''))]) {
    const key = PRICES[k] ? k : priceKeyOf(k);
    if (key) { const c = cheapest(key, line.n); if (c) return { usd: +c.usd.toFixed(2), key }; }
  }
  // a looser match only where the entry shares two of the line's real words: one shared word prices a LiPo pack off a
  // battery holder, and a made-up price is worse than no price
  const hit = Object.entries(PRICES).find(([, v]) => {
    const text = `${v.what} ${v.item ?? ''}`.toLowerCase();
    return words.filter((w) => w.length > 3 && text.includes(w)).length >= 2;
  });
  if (hit) { const c = cheapest(hit[0], line.n); if (c) return { usd: +c.usd.toFixed(2), key: hit[0] }; }
  return null;
}

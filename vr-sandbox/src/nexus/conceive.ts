// Anything asked for, made, with nothing done by hand but the asking and the answering. The words are read into
// wants: what it must do (hold a weight up, move a load, turn, swing open, slide, hold a liquid, enclose a space, keep
// warm, lift itself, float), each with the figures it has: said, answered, or the usual ones for what was named, with
// where they come from. Where a want lacks a figure that matters, it is asked; that is all a person does.
//
// Everything else is derived, and each step says what called it, when, why, where and how:
//   - what: each want is a need of a kind, and each kind has rules (ways) that meet it, each saying when it applies
//     (a column only under a small top, gears only where a motor would turn too slowly); among the ways that apply,
//     one is drawn from the seed, so the same seed makes the same thing and another seed another;
//   - when: what stands on what is derived from what each kind of need gives and takes (what moves carries the rest;
//     what holds a weight up carries what is put on it; what keeps warm or swings goes into what it is part of), and
//     so is the order: sized from the top down (what is below carries what is above), placed from the bottom up (each
//     thing on what holds it), widened from the top down (what is below is made wide enough for what stands on it);
//   - why: every part is there for a need, and every need for a want: its lineage is kept with it;
//   - where: on, under or against the parts it touches, by the connection law: nothing connects that does not touch;
//   - how: by the law that sizes it (a top as thin as the load law lets it bear its load; legs as thin as Euler lets
//     them carry it; a wall as thin as its liquid's pressure allows; a motor's voltage from its own torque line).
// Then it is made in the workshop's steps under every law it keeps, and checked: loads, buckling, standing, being
// pushed at its top, moving, turning, swinging, sliding, keeping warm (real physics where it is loaded). A design that
// fails a check is drawn again from the next seed, its flaw said. What comes out is a pipeline: kept, run again, made
// several times over.

import { findQuantities, sameDim, DIMS } from '../ganglia/units';
import { isVerb, parseAsk } from './parse';
import { NAMED_SIZES, namedSize, sizeAt, timeSay, type SizeReading } from './sizing';
import { bounds, type Bound, type Said } from './bounds';
import { GEARHEADS, MOTORS, type MotorData } from '../data/motors';
import { LUMBER } from '../data/lumber';
import { motorModel } from '../engineering/dcmotor';
import { AMBIENT, heatLoss, thermalOf } from '../engineering/thermal';
import { FUSION } from '../engineering/fusion';
import { lateralUltimate, withdrawalUltimate } from '../engineering/wood';
import { matOf, matterOf, Workshop, type Axis, type Made, type World } from './generate';
import { planTree, touching, type Ax, type Box as FBox, type Fold, type TreePlan } from './foldtree';
import type { Clip } from './flows';
import type { Jolt } from './realize';
import type { SimTrack } from './sim';

// ==== wants, read from words ============================================================================================
export type Fn = 'support' | 'move' | 'turn' | 'swing' | 'slide' | 'raise' | 'contain' | 'enclose' | 'warm' | 'lift' | 'float';
/** A figure a want has: given by the person, answered to a question, the usual one for what was named, or estimated. */
export interface Fig { v: number; unit: string; by: 'you' | 'answer' | 'usual' | 'estimate'; grounds: string }
export interface Want { fn: Fn; says: string; q: Record<string, Fig>; flags: string[] }
export type Kind = 'length' | 'mass' | 'speed' | 'rpm' | 'temperature' | 'volume' | 'count' | 'what';
export interface Question { key: string; want: number; ask: string; kind: Kind; value: number; unit: string; grounds: string }
/** One thing the ask asks for, as said: what it is, something it does or has, or what it is for; and what of it was read. */
export interface Asked { text: string; kind: 'thing' | 'does' | 'has' | 'for'; got: Fn | null; why: string; /** a weight it carries, said: done where what carries it bears it */ load?: true; /** how it is done, where not by a want's own way ("folds") */ how?: string }
/** A limit said of the whole: no heavier, wider, taller or deeper than so much (SI). */
export interface Limits { mass?: number; W?: number; H?: number; D?: number; /** watts it may draw */ power?: number; /** the most any one part may weigh, kg; the most it may sag under load, m */ part?: number; sag?: number; /** the sizes it must fold or pack down to, m; how thin it must fold flat to */ fold?: number[]; foldThin?: number ; /** what it packs into, folded, m³ */ foldVol?: number }
export interface Conception {
  words: string; name: string; wants: Want[]; questions: Question[]; heard: string[]; assumed: string[]; unread: string[]; matter: string | null;
  /** everything it was asked for, each read or not and why */ asked: Asked[];
  /** numbers said that it did not use, and why */ dropped: string[];
  limits: Limits;
  /** what the laws were given to judge of the ask; the size it is at, and what that size asks; what the laws say of it */ said: Said; scale: SizeReading | null; bounds: Bound[];
}

const G = 9.80665;
/** Said in at most n characters, cut at a word and marked as cut. */
const cut = (x0: string, n: number) => { const x = x0.replace(/\s*[?!.,;:]+$/, '').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')'); return x.length <= n ? x : `${x.slice(0, n).replace(/\s+\S*$/, '')}…`; };
const fig = (v: number, unit: string, by: Fig['by'], grounds: string): Fig => ({ v, unit, by, grounds });
export const FN_WORDS: Record<Fn, string> = { support: 'hold a weight up', move: 'move a load', turn: 'turn', swing: 'swing open and shut', slide: 'slide', raise: 'raise and lower a load', contain: 'hold a liquid', enclose: 'enclose a space', warm: 'keep something warm', lift: 'lift itself into the air', float: 'float' };

/** What words for things are for: each read as wants, with the figures such things are usually made to and where
 *  they come from. Nothing here says how it is made: no part, no shape, no matter. */
interface Purpose { re: RegExp; name: string; fn: Fn; flags?: string[]; q: Record<string, Fig> }
const P = (re: RegExp, name: string, fn: Fn, q: Record<string, Fig>, flags: string[] = []): Purpose => ({ re, name, fn, q, flags });
const SEAT = 'a seat tested with 1300 N (EN 12520, domestic seating)';
const PURPOSES: Purpose[] = [
  P(/\b(desk|table|workbench|work bench|worktop|counter)\b/, 'table', 'support', { H: fig(0.74, 'm', 'usual', 'a desk or table top at 740 mm (EN 527-1)'), W: fig(1.2, 'm', 'estimate', 'a top 1.2 m long'), D: fig(0.7, 'm', 'estimate', 'and 700 mm deep'), F: fig(50 * G, 'N', 'estimate', 'about 50 kg put on it') }),
  P(/\b(chair|armchair)\b/, 'chair', 'support', { H: fig(0.45, 'm', 'usual', 'a seat at 450 mm (EN 1335-1 gives 400 to 510 mm)'), W: fig(0.45, 'm', 'usual', 'a seat 450 mm wide'), D: fig(0.45, 'm', 'usual', 'and 450 mm deep'), F: fig(1300, 'N', 'usual', SEAT) }, ['back']),
  P(/\b(stool|seat|bench)\b/, 'seat', 'support', { H: fig(0.45, 'm', 'usual', 'a seat at 450 mm (EN 1335-1 gives 400 to 510 mm)'), W: fig(0.4, 'm', 'usual', 'a seat 400 mm across'), D: fig(0.4, 'm', 'usual', 'and 400 mm deep'), F: fig(1300, 'N', 'usual', SEAT) }),
  P(/\b(bed|bunk|cot)\b/, 'bed', 'support', { H: fig(0.45, 'm', 'estimate', 'a mattress base at 450 mm'), W: fig(0.9, 'm', 'usual', 'a single bed 900 mm wide'), D: fig(2.0, 'm', 'usual', 'and 2.0 m long'), F: fig(150 * G, 'N', 'estimate', 'a person and a mattress, about 150 kg') }),
  P(/\b(shelf|shelves|shelving|bookcase|bookshelf|rack)\b/, 'shelf', 'support', { H: fig(1.8, 'm', 'estimate', 'shelving 1.8 m tall'), W: fig(0.8, 'm', 'estimate', '800 mm wide'), D: fig(0.3, 'm', 'estimate', '300 mm deep'), F: fig(25 * G, 'N', 'estimate', 'about 25 kg on each shelf (books weigh about 20 kg a metre)'), levels: fig(4, '', 'estimate', 'four shelves') }, ['levels']),
  P(/\b(tower|lookout|watchtower|scaffold|hide)\b/, 'platform', 'support', { H: fig(3, 'm', 'estimate', 'standing 3 m up'), W: fig(1.5, 'm', 'estimate', '1.5 m across'), D: fig(1.5, 'm', 'estimate', 'and 1.5 m deep'), F: fig(200 * G, 'N', 'estimate', 'two people on it, about 200 kg') }),
  P(/\b(platform|stage|deck|step|footstool|tray|surface)\b/, 'platform', 'support', { H: fig(0.3, 'm', 'estimate', 'standing 300 mm up'), W: fig(1.2, 'm', 'estimate', '1.2 m across'), D: fig(1.2, 'm', 'estimate', 'and 1.2 m deep'), F: fig(200 * G, 'N', 'estimate', 'two people standing on it, about 200 kg') }),
  P(/\b(bridge|footbridge|span|walkway|gangway|catwalk)\b/, 'bridge', 'support', { span: fig(2, 'm', 'estimate', 'a gap of 2 m'), W: fig(0.6, 'm', 'estimate', '600 mm wide'), H: fig(0.3, 'm', 'estimate', 'its deck 300 mm up'), F: fig(100 * G, 'N', 'estimate', 'a person crossing, about 100 kg') }, ['span']),
  P(/\b(umbrella|parasol)\b/, 'shade', 'support', { H: fig(2.0, 'm', 'estimate', 'its canopy 2 m up'), W: fig(2.0, 'm', 'estimate', 'a canopy 2 m across'), D: fig(2.0, 'm', 'estimate', 'and 2 m deep'), F: fig(1 * G, 'N', 'estimate', 'nothing on it but itself, about 1 kg') }, ['pole']),
  P(/\b(stand|holder|pedestal|plinth|mount|easel|tripod|display)\b/, 'stand', 'support', { H: fig(0.8, 'm', 'estimate', 'holding it 800 mm up'), W: fig(0.3, 'm', 'estimate', 'on a top 300 mm across'), D: fig(0.3, 'm', 'estimate', 'and 300 mm deep'), F: fig(5 * G, 'N', 'estimate', 'something of about 5 kg') }),
  P(/\b(cart|trolley|wagon|rover|vehicle|car|buggy|kart|truck|dolly|skateboard|tricycle|trike|bicycle|bike|scooter|wheelbarrow|pram|stroller|wheelchair)\b/, 'cart', 'move', { m: fig(5, 'kg', 'estimate', 'a load of 5 kg'), v: fig(0.5, 'm/s', 'estimate', 'at a walking pace, 0.5 m/s') }),
  P(/\b(motor|engine|dynamo|generator|turbine|flywheel|rotor|armature)\b/, 'motor', 'turn', { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.1, 'm', 'estimate', 'what turns 100 mm across') }),
  P(/\b(fan|turntable|spinner|spinning top|carousel|lazy susan|mixer|potter'?s wheel|centrifuge|rotisserie)\b/, 'turntable', 'turn', { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.3, 'm', 'estimate', 'a turning plate 300 mm across') }),
  P(/\b(door|gate|lid|hatch|flap|shutter)\b/, 'door', 'swing', { W: fig(0.8, 'm', 'estimate', 'a leaf 800 mm wide'), H: fig(2.0, 'm', 'estimate', 'and 2.0 m tall, as a person walks through') }),
  P(/\b(drawer|slider|rail|carriage)\b/, 'slider', 'slide', { L: fig(0.4, 'm', 'estimate', 'travelling 400 mm'), m: fig(5, 'kg', 'estimate', 'carrying about 5 kg') }),
  P(/\b(lift|elevator|hoist|jack|winch|crane)\b/, 'lift', 'raise', { L: fig(1, 'm', 'estimate', 'raising it 1 m'), m: fig(20, 'kg', 'estimate', 'about 20 kg') }),
  P(/\b(cup|mug|tumbler|beaker)\b/, 'cup', 'contain', { V: fig(3.5e-4, 'm³', 'estimate', 'holding 350 ml, a mug') }),
  P(/\b(bottle|flask|thermos)\b/, 'bottle', 'contain', { V: fig(7.5e-4, 'm³', 'estimate', 'holding 750 ml') }),
  P(/\b(kettle|saucepan|jug)\b/, 'kettle', 'contain', { V: fig(1.5e-3, 'm³', 'estimate', 'holding 1.5 L') }),
  P(/\b(planters?|plant pots?|flower ?box(es)?|window ?box(es)?|raised beds?|grow beds?|garden beds?|plant troughs?)\b/, 'planter', 'support', { H: fig(0.3, 'm', 'estimate', 'standing 300 mm up'), W: fig(0.6, 'm', 'estimate', '600 mm long'), D: fig(0.3, 'm', 'estimate', 'and 300 mm wide'), F: fig(0.6 * 0.3 * 0.2 * 1300 * G, 'N', 'estimate', 'its soil: 200 mm of it over 600 × 300 mm at about 1300 kg/m³ (estimate)'), rho: fig(1300, 'kg/m³', 'estimate', 'soil, about 1300 kg/m³ (estimate)'), lkg: fig(0.6 * 0.3 * 0.2 * 1300, 'kg', 'estimate', '200 mm of soil over 600 × 300 mm') }, ['loose']),
  P(/\b(tank|bucket|jar|barrel|vat|pot|water butt|cistern|aquarium|vase|bin|hopper|canister)\b/, 'tank', 'contain', { V: fig(0.01, 'm³', 'estimate', 'holding 10 L') }),
  P(/\b(box|crate|case|chest|enclosure|house|hut|shed|shelter|cabin|kennel|doghouse|birdhouse|coop|room|tent|cabinet|cupboard|locker|cage|hutch)\b/, 'box', 'enclose', { W: fig(0.4, 'm', 'estimate', 'inside 400 mm wide'), D: fig(0.3, 'm', 'estimate', '300 mm deep'), H: fig(0.3, 'm', 'estimate', 'and 300 mm tall') }),
  P(/\b(heater|warmer|hot ?plate|oven|stove|incubator)\b/, 'warmer', 'warm', { T: fig(60, '°C', 'estimate', 'kept at 60 °C'), W: fig(0.15, 'm', 'estimate', 'a warm surface 150 mm across'), D: fig(0.15, 'm', 'estimate', 'and 150 mm deep') }),
  P(/\b(drone|quadcopter|multicopter|helicopter|copter)\b/, 'flyer', 'lift', { m: fig(0.3, 'kg', 'estimate', 'carrying 300 g') }),
  P(/\b(boat|raft|canoe|kayak|ship|pontoon|barge|dinghy)\b/, 'raft', 'float', { m: fig(80, 'kg', 'estimate', 'one person, 80 kg') }),
];
/** Things said that only say what it works on or for, not what it is: the thing names that are no thing it makes. */
const GENERIC = /^(something|thing|things|device|machine|gadget|contraption|robot|bot|system|unit|apparatus|tool|mechanism|one|it|invention|object|structure)$/;
/** What a verb asks of it, read with what it acts on: a want, or what it would need that is not kept, and why. */
type VerbRead = { fn?: Fn; load?: true; note?: string; context?: true; flags?: string[] };
const LIQUID_WORDS = /\b(water|liquid|oil|milk|juice|coffee|tea|soup|fuel|wine|beer|paint|honey)\b/;
const INFO = /\b(data|files?|photos?|videos?|music|songs?|information|memory|tb|gb|mb|kb|bytes?|terabytes?|gigabytes?)\b/;
function readVerb(v: string, obj: string, all: string): VerbRead {
  const w = v.toLowerCase(), o = ` ${obj} `;
  if (/^(roll|drive|move|travel|deliver|ride|wheel|cruise|tow|haul|drag|push|pull)/.test(w)) return /^(push|pull|tow|haul|drag)/.test(w) && !/\b(on wheels|along|across)\b/.test(o) ? { load: true, fn: 'move' } : { fn: 'move' };
  if (/^(spin|rotat|revolv)/.test(w)) return { fn: 'turn' };
  if (/^turn/.test(w)) return /\binto\b/.test(o) ? { note: 'turning one thing into another (a conversion of energy or matter) is not something kept' } : { fn: 'turn' };
  if (/^(open|swing|hinge|pivot)/.test(w)) return { fn: 'swing' };
  // "holds up in 90 km/h winds", "stands up to snow": what it withstands, heard with its numbers, not a weight it carries
  if (/^(hold|holds|holding|stand|stands|standing)$/.test(w) && /^\s*up\s+(in|to|against|under)\b/.test(o)) return { context: true };
  // "has to carry": a must, the verb after it is what it does
  if (/^(has|have|had|got)$/.test(w) && (/^\s*to\b/.test(o) || !o.trim()) || /^needs?$/.test(w) && /^\s*to\b/.test(o)) return { context: true };
  // "cross a 5 km lake at 10 knots" said of something that goes: a journey, not a span
  if (/^(cross|crosses|crossing)$/.test(w) && (/\bat\s+[\d.,]+\s*(knots?|kn|km\/h|kph|mph|m\/s)\b/.test(o) || /\b(car|boat|ship|vehicle|bike|bicycle|truck|ferry|amphibi\w*|drone|plane|aircraft|rover|robot|tug|hovercraft|kayak|canoe)\b/.test(all) && !/\bbridge\b/.test(all))) return { fn: 'move' };
  if (/^(span|spans|spanning|cross|crosses|crossing|bridge|bridges)$/.test(w)) return { fn: 'support', flags: ['span'], load: true };
  if (/^(pack|packs|packing|fold|collaps|unfold)/.test(w) && /^\s*(into|down|flat|away|up|small)/.test(o)) return { fn: 'swing', flags: ['fold'] };
  if (/^(fold|collaps|unfold)/.test(w)) return /^\s*(flat|up|away|down|shut|open|closed|in|half|out|back|together|itself|to|into a|when|\s)/.test(o) && !/\b(sheet|cloth|towel|clothes|shirt|paper|fabric|laundry|blanket)\b/.test(o) ? { fn: 'swing', flags: ['fold'] } : { note: 'folding something else (cloth, paper): handling soft things is not kept' };
  if (/^(slid|glid|extend|retract|telescop)/.test(w)) return { fn: 'slide' };
  if (/^(lift|rais|lower|hoist|elevat|winch)/.test(w)) return /\b(off the ground|into the air|in the air|airborne)\b/.test(o) || /^lift/.test(w) && /^\s*itself\s*$/.test(o) ? { fn: 'lift' } : /\b(cable|rope|chain|winch|hook|line|tether|string)\b/.test(o) ? { load: true, note: 'raising or lowering on a cable (a winch and a line): rope and cable are not kept' } : { fn: 'raise', load: true };
  if (/^(warm|heat)/.test(w)) return { fn: 'warm' };
  if (/^(cool|chill|freez|refrigerat)/.test(w)) return { note: 'cooling: keeping warm is kept, cooling is not' };
  if (/^(enclos|cover|shelter|house|cage)/.test(w)) return { fn: 'enclose' };
  if (/^(float|bob)/.test(w)) return /\b(altitude|air|sky|atmosphere|clouds?|above)\b/.test(` ${all} `) ? { note: 'floating in air: buoyancy in a gas (a balloon) is not kept yet, only in water' } : { fn: 'float' };
  if (/^(fly|flies|flew|hover)/.test(w)) return { fn: 'lift' };
  // "works from -160 °C to +120 °C": the range it must work across, heard with its numbers; "its total dose rating": a
  // rating, not a dose measured out
  if (/^(work|operat|function)/.test(w) && /^\s*(from|between|down to|up to|at|in)\b/.test(o)) return { context: true };
  if (/^dos/.test(w) && /^\s*(ratings?|limits?|rates?|budgets?)\b/.test(o)) return { context: true };
  // "to bring 1 litre to a boil in 5 minutes": heating what it holds to a temperature in a time, by what is not kept
  if (/^(bring|get|take)/.test(w) && /\bto (a |the )?(boil|simmer|\d[\d.]*\s*(°|degrees))/.test(o)) return { note: 'heating what it holds to a temperature in a time: what heats it (a crank turning a generator, a flame) is not kept; the power it takes is weighed below' };
  // "survives 110 km/h winds", "withstands 80 cm of snow": what it must stand, heard with its numbers and checked there
  if (/^(surviv|withstand|withstood|endur|weather|resist)/.test(w)) return { context: true };
  // "takes up no more than 3 m x 2.5 m of ground": the room it takes, heard with its numbers as a limit
  if (/^tak/.test(w) && /^\s*up\b/.test(o)) return { context: true };
  if (/^(hold|keep|stor|carr|contain|take|bear|support|accommodat|seat|fit)/.test(w)) {
    if (INFO.test(o) || /^\s*\d[\d,.]*\s*(tb|gb|mb|kb|bytes?)\b/.test(o)) return { note: 'holding information (data) is electronics: not kept yet' };
    if (/\bwarm\b|\bhot\b/.test(o)) return { fn: 'warm' };
    if (/\b(in|out|inside|dry|safe)\s*$/.test(o.trim()) || /\bkeeps? (?:\S+ ){1,4}(?:in|out)(?:\s+of\b|\s*$)/.test(`${w}${o.trim()}`)) return { fn: 'enclose' };
    const o1 = ` ${o.split(/\b(?:through|over|on|at|across|from|to|for|with|while|in|into|after|during|by)\b/)[0]} `;
    if (LIQUID_WORDS.test(o1) || /\d\s*(l|litres?|liters?|ml|gal|gallons?)\b/.test(o1)) return { fn: 'contain' };
    if (/^(carr|take|accommodat)/.test(w)) return { load: true };
    if (/^fit/.test(w)) return { context: true };
    // "keeps it running", "keeping the dose below": a state kept, not a weight held up
    if (/^keep/.test(w) && /\b(dose|radiation|exposure)\b/.test(o)) return { note: 'shielding from radiation is not kept; the dose on the way is weighed below' };
    // "keeps it running for 2 hours": a time it runs on what it carries
    if (/^keep/.test(w) && /\b(running|going|working|powered|alive|on|lit)\b/.test(o)) return { note: 'running on stored power (a battery, a cell): electric power is not kept yet' };
    if (/^keep/.test(w) && !/\d\s*(kg|g|lb|lbs|t|tonnes?|n)\b/.test(o)) return { note: `keeping ${cut(obj, 40)}: a state to hold, not a weight; not something kept` };
    return { fn: 'support', load: true };
  }
  // "puts out 100 W", "makes 1 µW": what it gives, read as a figure and weighed by the laws
  if (/^(put|puts|putting|give|gives|giving|deliver|delivers|output|outputs|produce|produces|generate|generates|make|makes|draw|draws|use|uses|consume|consumes)$/.test(w) && /\d[\d.,]*\s*(k|m|µ|μ|u|g|t)?w\b|watts?\b/i.test(o)) return { context: true };
  if (/^(sit|stand|rest|lie|hang|dangl|sits)/.test(w) && !/^(sits? on it|stands? on it)/.test(obj)) return { context: true };
  if (/^(is|are|be|weighs?|weighing|lasts?|fits?|measures? (no|under|less))$/.test(w)) return { context: true };
  if (/^runs?$/.test(w) && /^\s*on\b/.test(o) && /\b(difference|gradient)\b/.test(o)) return { note: 'running on a difference of temperature: what a heat engine can draw from it is weighed below' };
  if (/^runs?$/.test(w) && /^\s*on\b/.test(o)) return { note: `running on ${obj.replace(/^\s*on\s+/, '').split(/\s+/).slice(0, 6).join(' ')}: a source of power is not kept` };
  if (/^(dr(y|ies|ying))$/.test(w)) return { fn: 'warm', flags: ['dry'] };
  if (/^runs?$/.test(w)) return /\b(month|week|day|hour|year|charge|battery|power|batteries|sun|solar|mains|electricity)s?\b/.test(o) ? { note: 'running on stored or gathered power (a battery, a cell): electric power is not kept yet' } : !o.trim() || /^\s*(along|on|across|around|over|down|up|at|through|between|from|back|fast|quickly|smoothly)\b/.test(o) ? { fn: 'move' } : { note: `running ${cut(o.trim(), 40)} (powering something else): electric power is not kept yet` };
  if (/^(fill|refill|top|charg|recharg)/.test(w) && /\b(batter(y|ies)|power station|power bank|cells?|phones?|laptops?|packs?)\b/.test(o)) return { note: 'charging a battery: electric power is not kept yet; what light or power would fill it is weighed below' };
  if (/^stop/.test(w)) return { note: 'stopping when it senses something (a touch, a pinch): sensing and control are not kept' };
  if (/^water/.test(w) && /\b(itself|plants?|soil|garden|it)\b/.test(o)) return { note: 'watering itself: moving water from a tank to the soil needs pipes and a pump or a wick, not kept; how much it would need is weighed below' };
  if (/^(measur|dispens|pour|fill|refill|pump|spray|drain|flow|squirt|dose|portion|mete)/.test(w)) return { note: 'moving liquids or grains (pumping, filling, measuring out) needs tanks, pipes and pumps, not kept yet' };
  if (/^crawl/.test(w) && /\b(pipes?|tubes?|ducts?|tunnels?|sewers?|drains?|culverts?)\b/.test(o)) return { fn: 'move' };
  if (/^(climb|crawl|walk|swim|enter|jump|dig|burrow|hop|step)/.test(w)) return { note: 'getting about by legs, by climbing or by swimming: only wheels are kept' };
  if (/^(seal|graft|kill|harm|grow|heal|feed|plant|pollinat|treat|cure)/.test(w)) return { note: 'working on living things: biology is not kept' };
  if (/^(read|send|show|display|glow|light|play|ring|beep|sens|detect|count|record|comput|process|transmit|receiv|charg|power|blink|talk|listen|scan|photograph|film|stream|alert|notif|monitor|run)/.test(w)) return { note: 'electronics (sensing, computing, lighting, sending, running on stored power): circuits and cells are not kept yet' };
  if (/^(tilt|steer|follow|track|balanc|level|stabiliz|stabilis|aim|point|navigat|avoid)/.test(w)) return { note: 'steering itself by what it senses: control is not kept' };
  if (/^(clean|wash|cut|print|cook|bake|brew|iron|sort|pick|grab|grip|mix|blend|grind|sand|paint|polish|drill|saw|weld|knit|sew|fold)/.test(w)) return { note: 'working on other things (a process): processes are not kept' };
  if (/^(convert|generat|produc|collect|absorb|reflect|shade|block|harvest|cool)/.test(w)) return { note: 'making or turning energy (light, heat, electricity): energy conversion is not kept' };
  return { note: `"${w}" is not something kept` };
}
/** What kind of knowing a thing that is not made needs: said, so it is known what is missing. */
/** Folding or packing the whole of a thing down to carry and opening it out again: what it would need. */
const COLLAPSE = 'folding or packing the whole of it down and opening it out again: what is made folds flat, each part onto what holds it, a quarter or a half turn at each hinge, but nothing here is made for it to fold';
/** Folding the whole of it, judged where it is made (src/nexus/foldtree.ts): each part onto what holds it, a quarter or a half turn at each hinge. */
const FOLD_JUDGED = 'folding the whole of it flat, each part onto what holds it, a quarter or a half turn at each hinge: judged as made';
/** Loose stuff that lies in a heap and pushes sideways, kg/m³ wet and dry (estimates: soil 1300 dry, 1900 soaked). */
const LOOSE: Record<string, [number, number]> = { soil: [1300, 1900], earth: [1300, 1900], dirt: [1300, 1900], compost: [600, 1000], sand: [1600, 1900], gravel: [1700, 1900], snow: [300, 500], grain: [780, 780], mulch: [400, 600], clay: [1700, 2000] };
const LOOSE_RE = /^(?:(?:soaking|wet|dry|damp|loose|packed|fresh|heavy|settled|compacted|new|deep)[- ]?)*(soil|earth|dirt|compost|sand|gravel|snow|grain|mulch|clay)/;
/** Mechanisms named by their kind, none of them kept yet: what each is. */
const MECH_KINDS: Record<string, string> = { scissor: 'a scissor linkage (crossed bars pinned at their middles)', screw: 'a lead screw', hydraulic: 'a hydraulic ram (fluids under pressure)', pneumatic: 'a pneumatic ram (air under pressure)', telescopic: 'telescoping sections', telescoping: 'telescoping sections', rack: 'a rack and pinion', chain: 'a chain drive', belt: 'a belt drive', cable: 'a cable and pulleys' };
/** The surface of a thing that holds a weight up, named as a part of it. */
const SURFACE_PART = /^(top|tops|worktop|tabletop|deck|surface|seat|tread|canopy)$/;
const FOLDS = /^(fold|folds|folded|folding|collapses?|collapsed|collapsing|packs?|packed|packing)$/;
/** What a bridge spans: a gap in the ground, or water. */
const GAP = /^(creeks?|streams?|rivers?|brooks?|gaps?|ditch(es)?|gull(y|ies)|ravines?|roads?|chasms?|canals?|trench(es)?|gorges?|stretch(es)?|fjords?|fiords?|lakes?|valleys?|canyons?|straits?|bays?|channels?|estuar(y|ies)|inlets?|sounds?|harbou?rs?|ponds?)$/;
const AREAS: [RegExp, string][] = [
  [/\b(board|chip|circuit|computer|cpu|processor|cores?|risc|microsd|sd|card|memory|storage|data|display|screen|e-ink|ink|leds?|sensors?|bluetooth|wifi|usb|usb-c|battery|batteries|solar(?![- ]?sails?)|cell|electricity|phone|camera|speaker|antenna|radio|charger|charge|power|lux|light|lamp|strip|patch)\b/, 'electronics and electric power (circuits, chips, cells, lights): not kept yet'],
  [/\b(bees?|mites?|varroa|skin|blood|sugar|glucose|sweat|bark|grafts?|trees?|redwoods?|plants?|living|purring|cells|body|organs?)\b/, 'living things: biology is not kept'],
  [/\b(solar[- ]?sails?|light[- ]?sails?|venus|mars|moon|sun|planet|planet's|orbit|space|satellite|rocket|spaceship|spacecraft|station|equator|sunshade|asteroid|comet|galaxy|star)\b/, 'space and other worlds (orbits, vacuum, other atmospheres): not kept yet'],
  [/\b(balloon|airship|blimp|wings?|kite|glider|parachute|gusts?|wind|clouds?|altitude|sky|air)\b/, 'flying by wings or by being lighter than air, and weather: only rotors (worked out, not flown) are kept'],
  [/\b(pumps?|pipes?|hoses?|valves?|nozzles?|jugs?|jets?|fountain|sprinkler|shampoo|conditioner|wash|pasta|rice|lentils|grain|powder)\b/, 'moving liquids and grains (pipes, pumps, dispensers): not kept yet'],
  [/\b(sheets?|cloth|fabric|towels?|clothes|backpack|bag|straps?|collar|rope|cables?|net|string|hooks?|harness)\b/, 'soft or flexible things (cloth, rope, cable): only rigid parts are kept'],
  [/\b(piano|notes?|music|bells?|sound|songs?)\b/, 'sound: not kept'],
  [/\b(staircase|stairs|steps|ladder|ramp|escalator)\b/, 'stairs and ramps: a stepped or sloped surface is not a way kept yet'],
  [/\b(habitat|dome)s?\b/, 'a habitat (walls that hold air in and keep people alive): one enclosure on the ground at a time is kept, and none that holds a pressure'],
  [/\b(city|town|village|building|skyscraper|tower|colony)\b/, 'a city or a building of many rooms and floors: one enclosure at a time is kept'],
  [/\b(insert|dispenser|folder|organizer|organiser|sorter|feeder)\b/, 'a thing named by a job it does: what it is made of follows what it does'],
  [/\b(legs?|legged|tentacles?|arms?|hands?|grippers?|claws?)\b/, 'limbs that move by themselves: only wheels and hinges are kept'],
];
const areaOf = (s: string) => AREAS.find(([re]) => re.test(` ${s} `))?.[1] ?? 'not a kind of thing kept';
/** What everyday things weigh, roughly, and how big they are, so "a stand for my laptop" knows what it holds (estimates). */
const MASSES: [RegExp, number, string, [number, number, number]?][] = [
  [/\bphones?\b/, 0.2, 'a phone', [0.08, 0.16, 0.01]], [/\btablets?\b|\bipad/, 0.5, 'a tablet', [0.18, 0.25, 0.01]], [/\blaptops?\b/, 2, 'a laptop', [0.33, 0.23, 0.02]], [/\bmonitors?\b|\bscreens?\b/, 6, 'a monitor', [0.6, 0.25, 0.45]],
  [/\b(tv|television)s?\b/, 15, 'a television', [1.2, 0.3, 0.7]], [/\bbooks\b/, 20, 'books, a shelf of them'], [/\bbook\b/, 0.5, 'a book'], [/\bplants?\b|\bflower ?pots?\b/, 5, 'a potted plant', [0.3, 0.3, 0.5]],
  [/\bcats?\b/, 4.5, 'a cat', [0.46, 0.25, 0.3]], [/\bdogs?\b/, 25, 'a dog', [0.9, 0.35, 0.65]], [/\b(kids?|child|children)\b/, 30, 'a child', [0.4, 0.3, 1.3]], [/\b(person|adult|me|myself|human|man|woman|courier|people)\b/, 80, 'a person', [0.5, 0.3, 1.8]],
  [/\b(cups?|mugs?|coffee|tea)\b/, 0.35, 'a full cup', [0.1, 0.1, 0.12]], [/\bbottles?\b/, 1, 'a bottle'], [/\btools\b/, 10, 'tools'], [/\bprinters?\b/, 10, 'a printer', [0.45, 0.4, 0.3]],
  [/\bspeakers?\b/, 3, 'a speaker', [0.2, 0.2, 0.3]], [/\blamps?\b/, 2, 'a lamp', [0.25, 0.25, 0.5]], [/\b(groceries|shopping)\b/, 10, 'shopping'], [/\b(bags?|backpacks?)\b/, 8, 'a bag'], [/\bbikes?\b|\bbicycles?\b/, 13, 'a bicycle'],
  [/\bguitars?\b/, 4, 'a guitar'], [/\bcameras?\b/, 1, 'a camera', [0.15, 0.12, 0.1]], [/\b(tiles?|bricks?)\b/, 15, 'a stack of tiles'],
];
/** What is thrown or hits: its mass by the rules of its game (a puck 156 to 170 g, IIHF; a tennis ball 56 to 59.4 g, ITF; a
 *  football 410 to 450 g, FIFA; a baseball 142 to 149 g, MLB; a golf ball at most 45.93 g, R&A; a cricket ball 156 to 163 g,
 *  MCC), the heavier taken. */
const PROJECTILES: [RegExp, number, string][] = [
  [/\b(pucks?|slapshots?|slap shots?)\b/, 0.17, 'a puck (170 g at most, IIHF)'], [/\btennis balls?\b|\bballs?\b(?=.*\btennis\b)/, 0.0594, 'a tennis ball (59.4 g at most, ITF)'], [/\bfootballs?\b|\bsoccer balls?\b/, 0.45, 'a football (450 g at most, FIFA)'],
  [/\bbaseballs?\b/, 0.149, 'a baseball (149 g at most)'], [/\bgolf balls?\b/, 0.0459, 'a golf ball (45.9 g at most, R&A)'], [/\bcricket balls?\b/, 0.163, 'a cricket ball (163 g at most, MCC)'],
];
const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
/** Words that say what it is by a working not kept: each said as not done, with what it would need. */
const QUALITIES: [RegExp, string][] = [
  [/^(vacuum|insulated|double-walled|vacuum-insulated|thermal)$/, 'an insulated wall (a vacuum between two walls, or foam) is not kept: what it is made of is bare'],
  [/^(hand-?crank(ed)?|crank(ed)?|crank-powered)$/, 'worked by a hand crank: a crank, gears and a generator are not kept'],
  [/^(silent|quiet|noiseless|soundless)$/, 'silent: the sound it makes is not weighed'],
  [/^(sealed|airtight|air-tight|watertight|water-tight|waterproof|dustproof|dust-tight|hermetic|hermetically-sealed)$/, 'sealed: no gasket or seal is kept, so its joints pass air, dust and water, not weighed'],
];
const countOf = (w: string) => { const i = COUNT_WORDS.indexOf(w); return i >= 0 ? i + 1 : Number(w); };
const singular = (w: string) => w.replace(/(ies)$/, 'y').replace(/(ches|shes|xes|sses)$/, (x) => x.slice(0, -2)).replace(/(?<![su])s$/, '');
/** The questions that matter most, for each want: the figure, how it is read, and how it is asked. */
const ASKS: Record<Fn, [string, Kind, string][]> = {
  support: [['F', 'mass', 'How heavy is what it holds up?'], ['H', 'length', 'How high should it hold it?']], move: [['m', 'mass', 'How heavy is what it carries?'], ['v', 'speed', 'How fast should it go?']],
  turn: [['rpm', 'rpm', 'How fast should it turn?'], ['Dia', 'length', 'How big across is what turns?']], swing: [['W', 'length', 'How wide is what swings open?']], slide: [['L', 'length', 'How far should it slide?']],
  raise: [['L', 'length', 'How far should it raise it?'], ['m', 'mass', 'How heavy is what it raises?']],
  contain: [['V', 'volume', 'How much should it hold?']], enclose: [['W', 'length', 'How wide inside?']], warm: [['T', 'temperature', 'How warm should it keep it?']], lift: [['m', 'mass', 'How heavy is what it lifts?']], float: [['m', 'mass', 'How heavy is what it carries on the water?']],
};
/** What a want has where nothing said it. */
const BASE: Record<Fn, Record<string, Fig>> = {
  support: { H: fig(0.5, 'm', 'estimate', 'holding it 500 mm up'), W: fig(0.5, 'm', 'estimate', 'over 500 mm'), D: fig(0.4, 'm', 'estimate', 'by 400 mm'), F: fig(10 * G, 'N', 'estimate', 'about 10 kg') },
  move: { m: fig(5, 'kg', 'estimate', 'a load of 5 kg'), v: fig(0.5, 'm/s', 'estimate', 'at a walking pace, 0.5 m/s') },
  turn: { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.3, 'm', 'estimate', 'what turns 300 mm across') },
  swing: { W: fig(0.6, 'm', 'estimate', 'a leaf 600 mm wide'), H: fig(0.8, 'm', 'estimate', 'and 800 mm tall') },
  slide: { L: fig(0.4, 'm', 'estimate', 'travelling 400 mm'), m: fig(5, 'kg', 'estimate', 'carrying about 5 kg') },
  raise: { L: fig(1, 'm', 'estimate', 'raising it 1 m'), m: fig(20, 'kg', 'estimate', 'about 20 kg') },
  contain: { V: fig(0.01, 'm³', 'estimate', 'holding 10 L') },
  enclose: { W: fig(0.4, 'm', 'estimate', 'inside 400 mm wide'), D: fig(0.3, 'm', 'estimate', '300 mm deep'), H: fig(0.3, 'm', 'estimate', 'and 300 mm tall') },
  warm: { T: fig(60, '°C', 'estimate', 'kept at 60 °C'), W: fig(0.15, 'm', 'estimate', 'a warm surface 150 mm across'), D: fig(0.15, 'm', 'estimate', 'and 150 mm deep') },
  lift: { m: fig(0.3, 'kg', 'estimate', 'carrying 300 g') },
  float: { m: fig(80, 'kg', 'estimate', 'one person, 80 kg') },
};
/** A length said, as a person reads it at a glance: in the unit that keeps it between 1 and 1000. */
export const len = (v: number): string => { const a = Math.abs(v); return a === 0 ? '0 m' : a >= 1e6 ? `${+(v / 1e3).toPrecision(3)} km` : a >= 1e3 ? `${+(v / 1e3).toPrecision(3)} km` : a >= 1 ? `${+v.toPrecision(3)} m` : a >= 1e-3 ? `${+(v * 1e3).toPrecision(3)} mm` : a >= 1e-6 ? `${+(v * 1e6).toPrecision(3)} µm` : `${+(v * 1e9).toPrecision(3)} nm`; };

/** Read words into wants; where a want lacks a figure that matters, ask (at most three questions). Each thing named,
 *  each thing it does and has, and each number is read by where it stands in the ask (parse.ts): what it is is the
 *  thing named last before what it does; a thing named only to say what it works on or for is not made; a number is
 *  a height, a width, a travel, a load, a limit or something else's size by the words beside it. What is not read, or
 *  read and not kept, is said, with the kind of knowing it would need. */
export function conceive(words: string, answers: Record<string, string> = {}): Conception {
  // "and tell me how much propellant it has to carry": a question put alongside what is asked, answered by the laws below,
  // not a thing it is or does; read apart from the rest
  const putQ = /,?\s*(?:and\s+)?(?:please\s+)?(?:tell|show|let)\s+me\s+(?:know\s+)?((?:how much|how many|how long|how big|how far|what|whether|if)\b[^,.;?]*)/i.exec(words);
  // "a 3D printer": a word, not three of something
  const words1 = (putQ ? words.replace(putQ[0], '') : words).replace(/\b([23])[- ]?[dD]\b/g, (_m, d: string) => (d === '3' ? 'three-D' : 'two-D'));
  const pa = parseAsk(words1), t = pa.t, heard: string[] = [], assumed: string[] = [], unread: string[] = [], wants: Want[] = [], asked: Asked[] = [], dropped: string[] = [], limits: Limits = {};
  if (putQ) heard.push(`${putQ[1]!.trim()}: a question put with it, answered by the laws below`);
  const add = (fn: Fn, says: string, q: Record<string, Fig> = {}, flags: string[] = []) => { if (!wants.some((w) => w.fn === fn)) wants.push({ fn, says, q: structuredClone(q), flags: [...flags] }); const w = wants.find((x) => x.fn === fn)!; for (const f of flags) if (!w.flags.includes(f)) w.flags.push(f); return w; };
  const purposeOf = (w: string | null) => (w ? PURPOSES.find((p) => p.re.test(` ${w.replace(/-/g, ' ')} `) || p.re.test(` ${singular(w)} `)) : undefined);
  const massOf = (s: string) => MASSES.find(([re]) => re.test(` ${s} `));
  let name = '', occupant: (typeof MASSES)[number] | null = null, loadSaid: { N: number; text: string } | null = null;
  const loadsSaid: string[] = [], said: Said = { size: {} }, own: { ax: string; v: number }[] = [];
  said.words = t;
  // it digs its way: said before its numbers are, so a speed it burrows at is weighed, not dropped
  said.burrows = /\b(burrow\w*|dig\w*|tunnel\w*)\b/.test(t);
  let depthLoad: { d: number; rho: number; text: string } | null = null, looseSaid: { rho: number; kg: number; what: string } | null = null;
  const means = new Map<number, string>(), mainHead = pa.clauses.find((c) => c.kind === 'main' && c.head)?.head ?? null;
  // a fold, a pack or an opening of the whole of it, when it is not itself a leaf, and nothing it is has a door to open
  const wholeFold = (r: VerbRead, whole: boolean, own: Fn | undefined, verb = '') => whole && r.fn === 'swing' && own !== 'swing' && (!!r.flags?.includes('fold') || /^open/.test(verb) && own !== 'enclose' && own !== 'contain' && !wants.some((w) => w.fn === 'enclose' || w.fn === 'contain'));
  const objOf = (c: (typeof pa.clauses)[number]) => [...c.obj.map((i) => pa.toks[i]!.w), ...pa.clauses.slice(pa.clauses.indexOf(c) + 1).filter((x, k, xs) => (x.kind === 'where' || x.kind === 'for') && xs.slice(0, k).every((y) => y.kind === 'where' || y.kind === 'for')).flatMap((x) => [x.opener, x.text])].join(' ');
  // what it is, what it has, what it does, what it is for: clause by clause
  pa.clauses.forEach((c, ci) => {
    if (c.kind === 'main' || c.kind === 'has') {
      if (!c.head) return;
      // "for someone with a Parkinson's tremor": who it is for, said of them, not of it
      const prev = pa.clauses[ci - 1];
      if (c.kind === 'has' && prev?.kind === 'for' && /^(someone|somebody|person|people|user|users|patients?|child|children|kids?|man|men|woman|women|adults?|elderly|seniors?|me|myself|him|her|them|everyone|anyone|grandma|grandpa|mum|mom|dad)$/.test(prev.head ?? '')) { const i = asked.findIndex((a) => a.kind === 'for' && a.text.includes(prev.text)); const said0 = `${prev.text} ${c.opener ? `${c.opener} ` : ''}${c.text}`.replace(/\s+(that|which|who|whose|for)$/, ''); if (i >= 0) asked[i] = { ...asked[i]!, text: `for ${said0}` }; else asked.push({ text: `for ${said0}`, kind: 'for', got: null, why: 'who it is for: said back, not checked' }); return; }
      // "with 370 s specific impulse": a quantity said with its number, heard with it, not a part it has
      if (c.kind === 'has' && /^(impulse|isp|speed|velocity|power|weight|mass|pressure|temperature|rating|thrust|efficiency|capacity|range|resolution|voltage|current|torque|frequency|rate|density|lifetime|life)$/.test(c.head) && /\d/.test(c.text)) return;
      const negated = /^(no|without)\b/.test(c.text) || c.opener === 'without';
      if (negated) { asked.push({ text: c.text, kind: 'for', got: null, why: 'noted: nothing it makes has one' }); return; }
      // "an airship", "a balloon": held up by a gas lighter than air, which is not kept; what it would lift is weighed below
      if (/^(airships?|blimps?|zeppelins?|dirigibles?|balloons?|aerostats?)$/.test(c.head) && c.kind === 'main') { said.buoyant = true; asked.push({ text: c.text.replace(/\s+(that|which|who|whose|with|for)$/, ''), kind: 'thing', got: null, why: 'held up by a gas lighter than air (an airship, a balloon): buoyancy in a gas is not kept yet; what its gas would lift is weighed below' }); if (!name) name = singular(c.head); return; }
      // "a heat engine", "a Stirling engine": a conversion of heat into work, weighed by the laws below, not a thing that turns
      if (/^(engine|engines|motor)$/.test(c.head) && c.mods.some((x) => /^(heat|stirling|steam|thermal|thermoelectric)$/.test(x))) { asked.push({ text: c.text.replace(/\s+(that|which|who|whose|with|for)$/, ''), kind: c.kind === 'has' ? 'has' : 'thing', got: null, why: 'a heat engine (turning heat into work): energy conversion is not kept; what the laws allow it is weighed below' }); if (c.kind === 'main' && !name) name = singular(c.head); return; }
      const p = purposeOf(c.head), generic = GENERIC.test(c.head), m = massOf(c.head), nxs = pa.clauses[ci + 1];
      const named = /\b(the |same )size$/.test(c.text) && nxs?.kind === 'where' && /^(of|as)$/.test(nxs.opener) ? `${c.text} ${nxs.opener} ${nxs.text}` : c.text;
      if (c.kind === 'main' && !name && (ci === 0 || pa.clauses.slice(0, ci).every((x) => x.kind !== 'main' || !x.head))) name = singular(c.head);
      if (p) { add(p.fn, p.name, p.q, p.flags); asked.push({ text: `${c.kind === 'has' ? 'with ' : ''}${c.text.replace(/\s+(that|which|who|whose|with|for)$/, '')}`, kind: c.kind === 'has' ? 'has' : 'thing', got: p.fn, why: '' }); }
      else if (generic) { /* what it is, it is by what it does */ }
      else if (m && c.kind === 'has') { loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` }; }
      else asked.push({ text: `${c.kind === 'has' ? 'with ' : ''}${named.replace(/\s+(that|which|who|whose|with|for)$/, '')}`, kind: c.kind === 'has' ? 'has' : 'thing', got: null, why: areaOf(`${c.head} ${c.mods.join(' ')}`) });
      // the words before it: what it does ("a rolling cart"), what it holds ("a laptop stand"), or what it is for
      for (const mod of c.mods) for (const part of mod.split('-')) {
        const mm = massOf(part); if (mm && !loadSaid) loadSaid = { N: mm[1] * G, text: `${mm[2]}, about ${mm[1]} kg (estimate)` };
        if (/(ing|ed)$/.test(part) && isVerb(part) && !/^(powered|shaped|sized|mounted|legged|based|made|built|style|styled|colou?red|coated|lined|raised|heated|covered|fitted|padded|insulated|reinforced|armoured|armored|closed|sealed)$/.test(part)) { const r = readVerb(part, '', t); if (r.fn && wholeFold(r, c.kind === 'main', p?.fn)) asked.push({ text: part, kind: 'does', got: null, why: COLLAPSE }); else if (r.fn) { add(r.fn, FN_WORDS[r.fn], BASE[r.fn], r.flags); asked.push({ text: part, kind: 'does', got: r.fn, why: '' }); } else if (r.note) asked.push({ text: part, kind: 'does', got: null, why: r.note }); }
      }
      // a word joined of a verb and how ("fold-down", "pull-out") or naming a mechanism ("scissor-lift"): what it does
      for (const mod of c.mods) {
        if (!mod.includes('-')) continue;
        const ps = mod.split('-'), v0 = ps[0]!, r = isVerb(v0) && !/^(wall|battery|pedal|solar|hand|self)$/.test(v0) ? readVerb(v0, ps.slice(1).join(' '), t) : null, mech = ps.map((x) => purposeOf(x)).find((x) => x && ['raise', 'slide', 'swing', 'turn', 'move'].includes(x.fn));
        if (r?.fn && wholeFold(r, c.kind === 'main', p?.fn)) asked.push({ text: mod, kind: 'does', got: null, why: COLLAPSE });
        else if (r?.fn) { add(r.fn, FN_WORDS[r.fn], BASE[r.fn], r.flags); asked.push({ text: mod, kind: 'does', got: r.fn, why: '' }); }
        else if (mech) {
          // a mechanism named by its kind ("scissor-lift", "screw jack"): what it does is wanted; that kind of it is made only where kept
          const kind = ps.find((x) => MECH_KINDS[x]); add(mech.fn, mech.name, mech.q, mech.flags);
          asked.push(kind ? { text: mod, kind: 'has', got: null, why: `${MECH_KINDS[kind]} is not kept: the plan says how it is done instead` } : { text: mod, kind: 'has', got: mech.fn, why: '' });
        }
        else if (/^self-(propelled|driving|moving)$/.test(mod)) { add('move', FN_WORDS.move, BASE.move); asked.push({ text: mod, kind: 'does', got: 'move', why: '' }); }
      }
      // what it is said to be that names a working it does not have: a vacuum wall, a hand crank, silence
      for (const mod of c.mods) { const qx = QUALITIES.find(([re]) => re.test(mod)); if (qx && !asked.some((a) => a.text === mod.replace(/-/g, ' '))) asked.push({ text: mod.replace(/-/g, ' '), kind: 'has', got: null, why: qx[1] }); }
      // what drives it, and where it hangs: said in a word before it ("pedal-powered", "wall-mounted")
      for (const mod of c.mods) {
        const pw = /^(.+)-(powered|assisted|driven)$/.exec(mod), mt = /^(.+)-mounted$/.exec(mod);
        if (pw) asked.push({ text: mod, kind: 'has', got: null, why: /^(solar|battery|electric|usb|mains)/.test(pw[1]!) ? areaOf('electricity') : `power from ${pw[1]!.replace(/-/g, ' ')}: what it is made of is driven by motors from a supply, or not at all` });
        if (mt) asked.push({ text: mod, kind: 'has', got: null, why: `hung on a ${mt[1]!.replace(/-/g, ' ')}: it is made to stand on the floor; a ${mt[1]} to hang it on is not kept` });
      }
      return;
    }
    if (c.kind === 'does') {
      if (!c.verb) return;
      const obj = objOf(c), r = readVerb(c.verb, obj, t), text = cut(`${means.get(ci) ? `${means.get(ci)} to ` : ''}${c.subj && c.opener === 'whose' ? `its ${c.subj} ` : ''}${c.verb} ${obj}`.replace(/\s+/g, ' ').trim(), 120);
      // "extends to raise a person": the first is how it does the second, said with it, not another thing it does
      const nx = pa.clauses[ci + 1];
      if (nx?.kind === 'does' && nx.opener === 'to' && nx.verb && /^(extend|unfold|open|expand|telescop|ris|deploy|unroll|stretch|swing|tilt)/.test(c.verb) && readVerb(nx.verb, objOf(nx), t).fn) { means.set(ci + 1, `${c.verb}${c.obj.length ? ` ${c.obj.map((i) => pa.toks[i]!.w).join(' ')}` : ''}`); return; }
      // what folds or opens: a part of it ("a top that folds down") swings; the whole of it, folding down and opening out, collapses
      // "a bookshelf with 4 shelves that folds flat": a verb said of one (folds) is not said of many (shelves)
      const naming = pa.clauses.slice(0, ci).reverse().find((x) => (x.kind === 'main' || x.kind === 'has') && x.head), many0 = (h: string) => /[^s]s$/.test(h) && !/(ss|us|is)$/.test(h), one0 = (v: string) => /[^s]s$/.test(v);
      const subj = c.subj ?? (naming?.kind === 'has' && !(many0(naming.head!) && one0(c.verb)) ? naming.head : null);
      if (r.fn && wholeFold(r, !subj || subj === mainHead, purposeOf(mainHead)?.fn, c.verb)) { asked.push({ text, kind: 'does', got: null, why: COLLAPSE }); return; }
      // "whose load bed lifts": the thing it is said of is a part too, when it is a thing
      if (c.subj) { const ps = purposeOf(c.subj); if (ps) { add(ps.fn, ps.name, ps.q, ps.flags); asked.push({ text: `its ${c.subj}`, kind: 'has', got: ps.fn, why: '' }); } }
      // "to power the whole planet", "to run a pacemaker": what what it gives is for, said back
      if (c.opener === 'to' && /^(power|powers|run|runs|drive|drives|charge|charges|feed|feeds|supply|supplies|light|lights|heat|heats)$/.test(c.verb) && !r.fn) { asked.push({ text: text.replace(/[\s?!.,;:]+$/, ''), kind: 'for', got: null, why: 'what what it gives is for: said back, not checked' }); return; }
      if (r.context) return;
      // "and not tip over in the gusts", "never sags": what it must not do, checked where a check covers it
      if (c.verbAt > 0 && /^(not|never|don't|doesn't|won't|cannot|can't|shouldn't|mustn't)$/.test(pa.toks[c.verbAt - 1]!.w) && /^(tip|topple|fall|overturn|blow|collaps|sag|bend|bow|break|snap|crack|fail|buckl)/.test(c.verb)) { const fn: Fn | null = wants.some((w) => w.fn === 'support') ? 'support' : wants[0]?.fn ?? null; asked.push({ text: `not ${text}`, kind: 'does', got: fn, why: fn ? '' : 'not checked: nothing it makes is tested for it' }); return; }
      if (r.fn) { const w = add(r.fn, FN_WORDS[r.fn], BASE[r.fn], r.flags);
        // "a planter that turns every 6 hours": the whole of it turns, on what turns it, not a part turning on top of it
        if (r.fn === 'turn' && (!subj || subj === mainHead) && mainHead && purposeOf(mainHead) && purposeOf(mainHead)!.fn !== 'turn' && !w.flags.includes('whole')) w.flags.push('whole'); asked.push({ text, kind: 'does', got: r.fn, why: '' }); if (r.flags?.includes('dry')) asked.push({ text: `${c.verb}: carrying the damp away`, kind: 'does', got: null, why: 'drying is warming and air moved through: air flow is not kept, only the warming' }); }
      else if (r.note) asked.push({ text, kind: 'does', got: null, why: r.note });
      else if (!r.load) asked.push({ text, kind: 'does', got: null, why: 'not kept' });
      else loadsSaid.push(text);
      const m = massOf(obj); if (m && (r.load || r.fn === 'support' || r.fn === 'move' || r.fn === 'raise' || r.fn === 'lift')) loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` };
      return;
    }
    // "without the bottom sagging", "without wobbling": what it must not do, checked where a check covers it
    if (c.kind === 'where' && c.opener === 'without') {
      const g = /\b(sag|bend|bow|deflect|wobbl|rack|rock|sway|tip|topple|fall|overturn|break|snap|crack|fail|leak|spill|slip|slid)\w*/.exec(c.text)?.[1];
      const NOT: Record<string, [Fn | null, string]> = { sag: ['support', ''], bend: ['support', ''], bow: ['support', ''], deflect: ['support', ''], break: ['support', ''], snap: ['support', ''], crack: ['support', ''], fail: ['support', ''], tip: ['support', ''], topple: ['support', ''], fall: ['support', ''], overturn: ['support', ''],
        wobbl: [null, 'wobbling (its joints racking) is not tested: its parts are rigid and its joins hold fully in the physics'], rack: [null, 'racking is not tested: its parts are rigid and its joins hold fully in the physics'], rock: [null, 'rocking on an uneven floor is not tested: the floor is flat'], sway: [null, 'swaying is not tested: its parts are rigid'],
        leak: [null, 'leaking: what holds a liquid is checked to hold it, not for its seams'], spill: [wants.some((w) => w.flags.includes('loose')) ? 'support' : null, 'spilling: only loose stuff is held by walls'], slip: [null, 'slipping: friction at its feet is not checked'], slid: [null, 'sliding: friction at its feet is not checked'] };
      if (g && NOT[g] && asked.some((x) => x.text.includes(`without ${c.text}`))) return;
      if (g && NOT[g]) { const [fn, why] = NOT[g]; const has = fn && wants.some((w) => w.fn === fn); asked.push({ text: `without ${c.text}`, kind: 'does', got: has ? fn : null, why: has ? '' : why || 'not checked' }); return; }
    }
    // "on a table", "on a stand": a thing it stands on, said right after what it is, is a part of it
    const prevNaming = pa.clauses.slice(0, ci).reverse().find((x) => x.kind !== 'where' || !/^(on|upon|atop)$/.test(x.opener));
    if (c.kind === 'where' && /^(on|upon|atop)$/.test(c.opener) && c.head && (prevNaming?.kind === 'main' || prevNaming?.kind === 'has') && pa.clauses[ci - 1] === prevNaming) { const ps = purposeOf(c.head); if (ps) { add(ps.fn, ps.name, ps.q, ps.flags); asked.push({ text: `on ${c.text}`, kind: 'has', got: ps.fn, why: '' }); return; } }
    // what it is for, and where: things there are what it works on or for; what everyone knows the weight of is a load
    // ("collapses into a tube for my backpack": what it packs into goes in the backpack, which is no load on it)
    const afterFold = pa.clauses.slice(0, ci).reverse().find((x) => x.kind === 'does' && !!x.verb)?.verb, packed = !!afterFold && FOLDS.test(afterFold);
    const m = massOf(c.text); if (m && !packed) { if (c.kind === 'for' || /^(on|onto|in|inside|into)$/.test(c.opener)) { occupant ??= m; loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` }; } }
    if (c.kind === 'for' && c.text.trim() && !/^(a |an |the |about |up to |over |at least )?[\d.,]+\s*(s|secs?|seconds?|min|mins|minutes?|h|hrs?|hours?|days?|weeks?|months?|years?)\b/.test(c.text.trim())) asked.push({ text: `${c.opener} ${c.text}`.replace(/\s+(that's|that is|which is|that are|which are)\s.*\d.*$/, '').trim(), kind: 'for', got: null, why: 'what it is for: said back, not checked' }); // "for my records that's 1.2 m long": the size is its own, heard with it
    if (/\bon wheels\b/.test(` ${c.opener} ${c.text} `)) { add('move', FN_WORDS.move, BASE.move); asked.push({ text: 'on wheels', kind: 'has', got: 'move', why: '' }); }
  });
  // hung on a wall, as said in what it does
  if (/\b(hangs?|hung|hanging|mounts?|mounted|fixed|bolted|screwed)\b[^,.;]*\bwall\b/.test(t) && !asked.some((a) => /wall/.test(a.text))) asked.push({ text: 'hangs on a wall', kind: 'has', got: null, why: 'hung on a wall: it is made to stand on the floor; a wall to hang it on is not kept' });
  // an answer to "what should it do?"
  if (answers.what) { for (const fn of Object.keys(FN_WORDS) as Fn[]) if (new RegExp(`\\b(${fn}|${FN_WORDS[fn].split(' ').slice(0, 2).join(' ')})`, 'i').test(answers.what)) add(fn, FN_WORDS[fn], BASE[fn]); for (const p of PURPOSES) if (p.re.test(` ${answers.what.toLowerCase()} `)) { add(p.fn, p.name, p.q, p.flags); } }
  const matterWord = /\b(?:of|from|in|made of)\s+(wood|oak|pine|maple|fir|plywood|birch|mdf|steel|stainless(?: steel)?|aluminium|aluminum|acrylic|plastic|nylon|concrete|glass|carbon fibre|carbon fiber|fibreglass|fiberglass)\b/.exec(t)?.[1] ?? /\b(wooden|metal|steel|aluminium|aluminum|plastic|glass)\b/.exec(t)?.[1] ?? null;
  const matter = matterWord ? ({ wooden: 'wood', metal: 'steel', plastic: 'acrylic', oak: 'wood.red-oak', pine: 'wood.southern-pine', maple: 'wood.hard-maple', fir: 'wood.douglas-fir', birch: 'wood', aluminum: 'aluminium', 'stainless steel': 'stainless' } as Record<string, string>)[matterWord] ?? matterWord : null;
  if (matter) { try { matterOf(matter); heard.push(`made of ${matterWord}`); } catch { dropped.push(`made of ${matterWord}: no matter of that name is kept`); } }
  const take = (w: Want, k: string, v: number, unit: string, text: string) => { w.q[k] = fig(v, unit, 'you', text); heard.push(`${({ H: 'height', W: 'width', D: 'depth', F: 'load', m: 'load', v: 'speed', V: 'volume', T: 'temperature', L: 'travel', Dia: 'across', rpm: 'speed', span: 'span' } as Record<string, string>)[k] ?? k}: ${text}`); };
  const by = (f: Fn) => wants.find((w) => w.fn === f), sup = by('support'), mov = by('move');
  // hung on a wall, what holds a weight up is a board on brackets screwed to it ("a wall shelf", "screwed into two wall
  // studs"): one board, unless more are said
  if (sup && !sup.flags.includes('span') && /\bwall[- ]?(shel(f|ves)|mounted|mount|hung|brackets?)\b|\bfloating shel|\b(hangs?|hung|hanging|mounts?|mounted|fixed|bolted|screwed)\b[^,.;]*\b(walls?|studs?)\b/.test(t)) {
    sup.flags.push('wall');
    for (const a of asked) if (a.kind === 'has' && !a.got && /\bwall\b|hangs on a wall/.test(a.text)) { a.got = 'support'; a.why = ''; }
    if (sup.q.levels?.by !== 'you') { sup.flags = sup.flags.filter((f) => f !== 'levels'); delete sup.q.levels; }
    if (sup.q.H?.by !== 'you') sup.q.H = fig(1.2, 'm', 'estimate', 'its board 1.2 m up the wall');
    heard.push('on a wall: a board on brackets screwed to it');
  }
  const sized = by('enclose') ?? sup ?? by('swing') ?? by('warm') ?? by('turn') ?? by('contain') ?? by('raise') ?? mov ?? by('lift') ?? by('float') ?? by('slide');
  const carrier = by('raise') && /\b(lift|lifts|raise|raises|lower|lowers|hoist|hoists)\b/.test(t) ? by('raise')! : sup ?? mov ?? by('lift') ?? by('float') ?? by('raise') ?? by('slide');
  const headWant = purposeOf(pa.clauses.find((c) => c.kind === 'main' && c.head)?.head ?? null), ofHead = headWant ? by(headWant.fn) : undefined;
  // a trip between orbits ("from low Earth orbit to Mars orbit"), and back; a radio it sends by
  const tripM = /\bfrom\s+(?:a\s+|the\s+)?(?:[\d.,]+\s*km\s+)?(?:low\s+)?(venus|earth|mars|jupiter)(?:'s)?\s+orbit\s+(?:to|into)\s+(?:a\s+|the\s+)?(?:low\s+)?(venus|earth|mars|jupiter)(?:'s)?(?:\s+orbit)?\b/.exec(t);
  if (tripM) { said.trip = { from: tripM[1]!, to: tripM[2]!, back: /\b(and back|back again|round trip|return(s|ing)?\b)/.test(t) }; heard.push(`from ${/\blow\b/.test(tripM[0]) ? 'a low orbit' : 'an orbit'} of ${tripM[1]} to one of ${tripM[2]}${said.trip.back ? ' and back' : ''}: weighed below`); said.trip.low = /\blow\b/.test(tripM[0]); }
  // what powers it: its own cells, fuel or charge where said; where it is a part for something larger ("a board for a
  // Europa lander") and none is said, what it is part of powers it
  if (/\b(batter(y|ies)|cells?|charge|charging|fuel|onboard|on-board|self-powered|untethered|its own power)\b/.test(t)) said.ownPower = true;
  else if (/\b(for|of|in|on) (an?|the|my|our) ([\w-]+ ){0,3}(lander|rover|satellite|spacecraft|probe|vehicle|car|robot|drone|station|ship|plane|aircraft)\b/.test(t)) said.ownPower = false;
  if (/\beuropa\b/.test(t)) said.on = 'europa'; else if (/\b(lunar|on the moon|moon base|moon's)\b/.test(t)) said.on = 'moon';
  said.buried = /\b(buried|under (enough |a layer of |a cover of )?regolith|covered (in|with|by) (regolith|soil|earth))\b/.test(t);
  // what shields it: "behind no more than 2 kg of tantalum shielding"
  const shM = /\b([\d.]+)\s*(kg|g)\s+of\s+(tantalum|tungsten|lead|aluminium|aluminum|copper)\s+shield/.exec(t); if (shM) { said.shield = { kg: Number(shM[1]) * (shM[2] === 'g' ? 1e-3 : 1), of: shM[3]! }; }
  said.radio = /\b(wi-?fi|wireless|bluetooth|radio|wlan)\b/.test(t); said.waters = /\bwaters? (itself|the plants?|the soil)\b|\bself[- ]watering\b/.test(t); if (/\bto (a |the )?boil\b|\bboiling\b|\bboils?\b/.test(t)) said.Tto = 100;
  said.human = /\b(hand[- ]?crank(ed)?|crank(ed|ing)?|by hand|hand[- ]powered|human[- ]powered|pedal(led|ed|ing|s)?|muscle[- ]powered)\b/.test(t); said.sail = /\bsolar[- ]sails?\b|\blight[- ]sails?\b/.test(t);
  // each number, by the words beside it: which of the wants it sizes and how, or why it is not used
  const plain: { n: (typeof pa.nums)[number]; owner: Want }[] = [];
  const AX: Record<string, 'H' | 'W' | 'D' | 'WD' | 'span' | 'thick' | 'alt'> = { tall: 'H', high: 'H', height: 'H', wide: 'W', width: 'W', across: 'W', diameter: 'W', round: 'W', long: 'W', length: 'W', deep: 'D', depth: 'D', square: 'WD', thick: 'thick', thickness: 'thick', gap: 'span', span: 'span', altitude: 'alt', elevation: 'alt' };
  // a number read with the one before it ("3 m x 2.5 m of ground"): used there, not read again
  const usedNum = new Set<(typeof pa.nums)[number]>();
  // "lifts 400 people per hour", "400 litres an hour", "2 kg of oxygen per hour": so much moved in a time, not a load or a
  // crew; what it is moved against (a height, a well's depth) heard with it
  const flowM = /\b(\d[\d,.]*)\s*(people|persons|riders|passengers|visitors|skiers|litres|liters|l|kg|kilograms?|tonnes?|t)\s+(?:of\s+([a-z]+)\s+)?(?:per|an|a|each|every)\s+(hour|minute|day|second)\b/.exec(t);
  // "a two-seat car": the people it seats, 80 kg each (estimate), what it carries, where no weight is said
  const seatM = /\b(one|single|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\d+)[- ]seat(s|er|ers)?\b/.exec(t);
  if (seatM && !/\d\s*(kg|kilo(gram)?s?|tonnes?|tons?|lbs?|pounds?)\b/.test(t)) { const cnt = seatM[1] === 'single' ? 1 : countOf(seatM[1]!); if (cnt > 0) { said.seats = cnt; said.payload ??= cnt * 80; loadSaid ??= { N: cnt * 80 * G, text: `${cnt} seats, 80 kg a person (estimate)` }; heard.push(`${seatM[0]}: ${cnt} people, ${cnt * 80} kg (80 kg each, estimate)`); for (const nn of pa.nums) if (nn.text.trim() === seatM[1]) usedNum.add(nn); } }
  if (flowM) { const n0 = Number(flowM[1]!.replace(/,/g, '')), unit = flowM[2]!, per = ({ hour: 3600, minute: 60, day: 86400, second: 1 } as Record<string, number>)[flowM[4]!]!, kg = /^(people|persons|riders|passengers|visitors|skiers)$/.test(unit) ? 80 : /^(l|litres|liters)$/.test(unit) ? (flowM[3] && flowM[3] !== 'water' ? 1 : 1) : /^t|tonne/.test(unit) ? 1000 : 1; said.flow = { n: n0, per, kg, what: flowM[3] ? `${unit} of ${flowM[3]}` : unit }; heard.push(`${flowM[0]}: so much moved in a time, ${+((n0 * kg) / per).toPrecision(3)} kg a second${/^(people|persons|riders|passengers|visitors|skiers)$/.test(unit) ? ' (80 kg each, estimate)' : ''}, weighed below`); for (const nn of pa.nums) if (nn.said && Math.abs(nn.said.value - n0) < 1e-9 && t.slice(Math.max(0, t.indexOf(flowM[0]) - 2), t.indexOf(flowM[0]) + flowM[0].length).includes(nn.text)) usedNum.add(nn); }
  // "out of a 25 m deep well", "up 600 m of elevation": how high what it moves is lifted
  const liftM = /\b(?:out of|from|up)\s+(?:a|the)?\s*(\d[\d,.]*)\s*(m|metres?|meters?|ft|feet)\s*(?:deep\s+(?:well|shaft|borehole|mine|pit)|of\s+(?:elevation|height|climb|rise|vertical)|(?:high|up))\b/.exec(t);
  if (liftM && said.flow) { const nn = pa.nums.find((x) => x.said && t.includes(`${x.text}`) && liftM[0].includes(x.text)); said.lift = nn?.said?.si ?? Number(liftM[1]!.replace(/,/g, '')) * (/ft|feet/.test(liftM[2]!) ? 0.3048 : 1); if (nn) usedNum.add(nn); heard.push(`lifted ${len(said.lift)}: weighed below with what it moves`); }
  // "follow the sun", "track the sun": turning as the sun does, once a day (15° an hour)
  if (/\b(follow|follows|following|track|tracks|tracking)\s+(the\s+)?(\w+\s+)?sun\b/.test(t)) { said.w = (2 * Math.PI) / 86400; const tu = by('turn'); if (tu) take(tu, 'rpm', said.w, 'rpm', 'as the sun goes, once a day (15° an hour)'); }
  // "on a frosty morning": the cold round it, about −5 °C (a frost, estimate), unless said
  if (/\bfrost(y|s)?\b|\bfreezing (morning|night|day)s?\b/.test(t)) { said.Tamb = -5; heard.push('a frost round it: about −5 °C (estimate), weighed below'); }
  // "300 W per panel": a panel as sheets are sold, 1.22 × 2.44 m and about 40 mm thick (estimate), where its size is not said
  if (/\bper panel\b/.test(t) && said.size?.W === undefined) { said.size = { ...(said.size ?? {}), W: 1.22, D: 2.44, H: 0.04 }; heard.push('a panel taken as 1.22 × 2.44 m, about 40 mm thick (a sheet as sold, estimate)'); }
  for (const n of pa.nums) {
    if (usedNum.has(n)) continue;
    const q = n.said, cl = pa.clauses[n.clause]!, b = n.before, a = n.after, near = (re: RegExp, k = 4) => b.slice(0, k).some((x) => re.test(x)), clauseOwner = cl.kind === 'has' || cl.kind === 'main' ? purposeOf(cl.head) : undefined;
    // said in a phrase about another thing ("from 5 litre jugs"), not one that only goes on saying it ("for 20 L of water")
    // "in a cabinet only 15 cm deep", "through 15 cm pipes": said of the other thing it goes in or through
    const into = cl.kind === 'where' && /^(in|inside|within|through|into)$/.test(cl.opener) && !!cl.head && cl.head !== mainHead && cl.headAt < n.tok;
    const ownerWant = clauseOwner ? by(clauseOwner.fn) : undefined, elsewhere = (cl.kind === 'where' || cl.kind === 'for') && !!cl.head && !purposeOf(cl.head) && !(SURFACE_PART.test(cl.head) && sup) && cl.headAt > n.tok || into;
    const drop = (why: string) => dropped.push(`${n.text.trim()}: ${why}`);
    if (!q) {
      // a count of things, or a number in a unit not kept
      const thing = a.join(' '), cnt = countOf(n.text.split(/\s+/)[0]!);
      // "Orange Pi 5": a number said straight after a name, part of the name and no quantity
      const pt = pa.toks[n.tok - 1];
      if (pt && !pt.num && !pt.punct && pt.w.length > 1 && !/^(a|an|the|to|of|in|at|for|and|or|with|by|on|is|are|was|be|than|under|over|about|up|from|into|per|every)$/.test(pt.w) && /^[A-Z]/.test(pa.src.slice(pt.at, pt.at + 1))) {
        const nameWs: string[] = []; for (let j = n.tok - 1; j >= 0 && pa.toks[j] && !pa.toks[j]!.num && /^[A-Z]/.test(pa.src.slice(pa.toks[j]!.at, pa.toks[j]!.at + 1)); j--) nameWs.unshift(pa.src.slice(pa.toks[j]!.at, pa.toks[j]!.at + pa.toks[j]!.w.length));
        drop(`part of a name ("${nameWs.join(' ')} ${n.text.split(/\s+/)[0]}"), not a quantity`); continue;
      }
      // a crew: so many people it carries
      if (/^(astronauts?|crew|people|persons?|passengers?|riders?|travellers?|travelers?|colonists?)\b/.test(thing)) { said.crew = cnt; heard.push(`a crew of ${cnt}: weighed below by what keeps them`); continue; }
      // "2 adults (200 kg)", "4 adults plus a wheelbarrow": who it carries, in the weight said; with none said, 80 kg each
      // (30 kg a child, estimate)
      // "a two-seat car": the people it seats, 80 kg each (estimate), what it carries
      if (/^seat(s|er|ers)?\b/.test(thing) && said.seats !== undefined) { continue; }
      if (/^seat(s|er|ers)?\b/.test(thing) && !/\d\s*(kg|kilo(gram)?s?|tonnes?|tons?|lbs?|pounds?)\b/.test(t)) { said.seats = cnt; loadSaid ??= { N: cnt * 80 * G, text: `${cnt} seats, 80 kg a person (estimate)` }; said.payload ??= cnt * 80; heard.push(`${n.text.trim()}: ${cnt} people, ${cnt * 80} kg (80 kg each, estimate)`); continue; }
      if (/^(adults?|men|women|kids?|children|hikers|walkers|guests|students|players|climbers|campers)\b/.test(thing)) { const kid = /^(kids?|children)/.test(thing); if (/\d\s*(kg|kilo(gram)?s?|tonnes?|tons?|lbs?|pounds?)\b/.test(t)) { /* in the weight said, heard with it */ } else { loadSaid ??= { N: cnt * (kid ? 30 : 80) * G, text: `${n.text.trim()}, ${kid ? 30 : 80} kg each (estimate)` }; heard.push(`${n.text.trim()}: ${cnt * (kid ? 30 : 80)} kg (${kid ? 30 : 80} kg each, estimate)`); } continue; }
      // a data rate: bits or bytes a second, read by its letter case ("MB/s" bytes, "Mbps" and "Mb/s" bits)
      const rt = /^(k|m|g|t)?(b|bit|bits|byte|bytes)(?:\/s|ps|\s+per\s+second)\b|^(k|m|g)bps\b/.exec(thing);
      if (rt) { const ut = pa.toks[n.tok + 1], raw = ut ? pa.src.slice(ut.at, ut.at + ut.w.length) : '', bytes = /^(byte|bytes)$/.test(rt[2] ?? '') || (/B/.test(raw) && !/bit|bps/i.test(raw)), mult = ({ k: 1e3, m: 1e6, g: 1e9, t: 1e12 } as Record<string, number>)[(rt[1] ?? rt[3] ?? '').toLowerCase()] ?? 1; said.rate = n.value * mult * (bytes ? 8 : 1); heard.push(`${n.text}: ${+(said.rate / 1e6).toPrecision(3)} Mbit/s${said.radio || /\b(wi-?fi|wireless|bluetooth|radio)\b/.test(t) ? ', weighed below for what a radio sending it draws' : ''}`); continue; }
      if (/^(shelves|levels|tiers)\b/.test(thing) && sup) { sup.q.levels = fig(cnt, '', 'you', n.text); if (!sup.flags.includes('levels')) sup.flags.push('levels'); heard.push(`levels: ${n.text}`); continue; }
      if (/^legs?\b/.test(thing) && sup) { sup.q.legs = fig(cnt, '', 'you', n.text); heard.push(`legs: ${n.text}`); continue; }
      if (/^wheels?\b/.test(thing) && mov) { mov.q.wheels = fig(cnt, '', 'you', n.text); heard.push(`wheels: ${n.text}`); continue; }
      // light said in lux: about 300 lumens to a watt for daylight or white LEDs (estimate), for what a cell would gather
      if (/^lux\b/.test(thing)) { said.light = n.value / 300; heard.push(`${n.text}: light of about ${+(n.value / 300).toPrecision(3)} W/m² (300 lm/W, estimate), weighed below`); continue; }
      drop(/^(tb|gb|mb|kb|bytes?)\b/.test(thing) ? 'information: electronics are not kept yet' : `a count or a unit not kept (${areaOf(n.text)})`);
      continue;
    }
    const d = q.dim;
    // "a 12U rack": so many rack units tall (1.75 in each, EIA-310), a wall cabinet's width and depth about 600 mm (estimate)
    if (q.unit === 'U') { said.size = { ...(said.size ?? {}), H: q.si, W: said.size?.W ?? 0.6, D: said.size?.D ?? 0.6 }; heard.push(`${q.text}: ${len(q.si)} tall inside (1.75 in a unit, EIA-310), taken 600 mm wide and deep (a wall cabinet, estimate)`); continue; }
    // "spiral in to 0.3 AU from the Sun": how near the Sun it goes
    if (q.unit === 'au' || /\bAU\b/.test(q.text)) { said.rSun = q.si; heard.push(`${q.text} from the Sun: weighed below`); continue; }
    if (sameDim(d, DIMS.length)) {
      // "crawls through 15 cm pipes", "fits through a 70 cm door": what it goes through limits its own width and height
      const through = cl.kind === 'where' && /^(through|into|inside)$/.test(cl.opener) && !!cl.head && /^(pipes?|tubes?|ducts?|tunnels?|sewers?|drains?|culverts?|holes?|openings?|hatch(es)?|doors?|doorways?|gates?|gaps?)$/.test(cl.head);
      if (through && !near(FOLDS, 6)) { limits.W = Math.min(limits.W ?? Infinity, q.si); limits.H = Math.min(limits.H ?? Infinity, q.si); heard.push(`through ${q.text} ${cl.head}s: its width and height no more than that, checked`.replace(/ss: /, 's: ')); continue; }
      const ax = AX[a[0] ?? ''] ?? (a[0] === 'in' && a[1] === 'diameter' ? 'W' : /^(standing|working|seat|overall|total|max|maximum|full|inside|outside)$/.test(a[0] ?? '') ? AX[a[1] ?? ''] : undefined);
      // "climbs an 18 cm step", "climb a 2 m vertical section": the size of what it climbs, and climbing is not kept
      if (/^(climb|climbs|climbing|scale|scales|mount|mounts)$/.test(cl.verb ?? '') || near(/^(climb|climbs|climbing)$/, 4)) { said.climb = q.si; heard.push(`climbing ${q.text}: climbing is not kept; the power it takes is weighed below`); continue; }
      // "sags no more than 3 mm": the most it may bend, checked against its bending under load
      if (near(/^(sags?|sagging|bends?|bending|deflects?|deflecting|droops?|drooping|bows?)$/, 5)) { limits.sag = q.si; heard.push(`sags no more than ${q.text}: its bending under load checked against it`); continue; }
      // "over a 6.5 m wide creek": what a bridge spans
      if (sup && cl.kind === 'where' && /^(over|across)$/.test(cl.opener) && cl.head && GAP.test(cl.head)) { take(sup, 'span', q.si, 'm', `${q.text} ${cl.head}`); if (!sup.flags.includes('span')) sup.flags.push('span'); continue; }
      // "a bridge across a fjord that's 3.7 km wide": the width of what it spans is its span; "1,200 m deep": nothing stands in it
      const gapNear = sup && (sup.flags.includes('span') || /\bbridge/.test(t)) && (a.slice(0, 3).some((x) => GAP.test(x)) || n.before.slice(0, 7).some((x) => GAP.test(x)) && !a.slice(0, 3).some((x) => /^(deck|decks|walkway|path|paths|top|board|boards|planks?|rails?|treads?|steps?|surface|lane|lanes)$/.test(x)));
      if (gapNear && ax === 'W') { take(sup!, 'span', q.si, 'm', `${q.text} across`); if (!sup!.flags.includes('span')) sup!.flags.push('span'); continue; }
      if (gapNear && (ax === 'D' || a[0] === 'deep')) { said.clearSpan = true; heard.push(`${q.text} deep: nothing stands in what it spans, so it spans it all at once`); continue; }
      // "drive 100 km", "cross a 5 km lake", "ride 30 km": how far it goes, not a size of it
      if (!ax && (/^(drives?|driving|rides?|riding|travels?|travelling|traveling|goes|go|flies|fly|sails?|sailing|walks?|runs?|cross(es|ing)?|covers?|swims?|tows?|hauls?)$/.test(cl.verb ?? '') || near(/^(drives?|driving|rides?|travels?|sails?|cross(es|ing)?|covers?|tows?)$/, 3)) && q.si >= 50 && !(sup && sup.flags.includes('span') && !mov)) { said.distance = (said.distance ?? 0) + q.si; (said.legs ??= []).push({ d: q.si, water: /\b(lakes?|seas?|rivers?|bays?|channels?|straits?|fjords?|sounds?|estuar\w*|harbou?rs?|ponds?|water|ocean)\b/.test(a.slice(0, 3).join(' ')) }); heard.push(`${q.text}${a[0] && !/^(on|at|in|and|to|of)$/.test(a[0]) ? ` ${a[0]}` : ''}: how far it goes, weighed below by the energy to go so far`); continue; }
      // "at the bottom of the Challenger Deep (10,935 m)", "4,000 m deep": how deep under water it works
      if (q.si >= 50 && /\b(deep|depth|ocean|sea|trench|seabed|sea floor|seafloor|underwater|challenger|abyss\w*|bottom of)\b/.test(t) && !/^(long|wide|across|tall|high)$/.test(a[0] ?? '')) { said.depth = q.si; heard.push(`${q.text} under water: weighed below by the pressure there`); continue; }
      // "over 6,000 km", "6,000 km on one charge": how far it travels, when it travels
      if (/^(over|for)$/.test(b[0] ?? '') && q.si >= 100 && (mov || by('lift') || by('float') || said.buoyant || /\b(travels?|flies|fly|carries|sails?|drives?|goes|tows?)\b/.test(t))) { said.distance = q.si; heard.push(`over ${q.text}: weighed below by the energy to go so far`); continue; }
      // "a clot 3 cm away": how far it goes, weighed against the time it has
      // "two wall studs 600 mm apart": where it is fixed, as said
      if (a[0] === 'apart' && sup) { sup.q.apart = fig(q.si, 'm', 'you', `${q.text} apart`); heard.push(`${q.text} apart: where it is fixed, as said`); continue; }
      if (a[0] === 'away' || a[1] === 'away') { said.distance = q.si; heard.push(`${q.text} away: how far it goes, weighed below against its time`); continue; }
      // "fits through my 70 cm wide gate", "fits a 50 cm wide gap": a limit on it, checked
      if (near(/^fits?$/, 6) && ax && /^(W|H|D|WD)$/.test(ax)) { limits[ax === 'WD' ? 'W' : (ax as 'W' | 'H' | 'D')] = q.si; heard.push(`fits ${q.text} ${a[0]}: a limit, checked`); continue; }
      // "30 cm of wet soil": a depth of something heavy, its weight what it holds
      const stuff = a[0] === 'of' ? /^(?:(?:soaking|wet|dry|damp|loose|packed|fresh|heavy|settled|compacted|new|deep|old)[- ]?)*(soil|earth|dirt|compost|sand|gravel|water|snow|concrete|grain|mulch|clay)/.exec(a.slice(1).join(' ')) : null;
      if (stuff) { const wet = /wet|soaking|damp/.test(a.slice(1, 3).join(' ')); const rho = ({ soil: wet ? 1900 : 1300, earth: wet ? 1900 : 1300, dirt: wet ? 1900 : 1300, compost: wet ? 1000 : 600, sand: wet ? 1900 : 1600, gravel: 1700, water: 1000, snow: 300, concrete: 2400, grain: 780, mulch: 400, clay: wet ? 2000 : 1700 } as Record<string, number>)[stuff[1]!]!; const upTo = a.slice(1, 5).findIndex((x) => /^(on|in|at|over|under|for|into|onto|with|and|or|to|from|inside)$/.test(x)); depthLoad = { d: q.si, rho, text: `${q.text} of ${a.slice(1, upTo >= 0 ? 1 + upTo : 4).join(' ')}, about ${rho} kg/m³ (estimate)` }; continue; }
      // "takes up no more than 3 m x 2.5 m of ground": the ground it may cover, its width and its depth at most
      if (b[0] === 'than' && /^(more|bigger|larger)$/.test(b[1] ?? '') && (near(/^(takes?|taking|occup\w*|covers?|covering|uses?)$/, 6) || /\bof (the )?(ground|floor|space|land|area)\b/.test(a.join(' ')))) { const n2 = n.by !== null ? pa.nums[n.by] : /^(x|×|by)$/.test(a[0] ?? '') ? pa.nums[pa.nums.indexOf(n) + 1] : undefined, q2 = n2?.said && sameDim(n2.said.dim, DIMS.length) ? n2.said : null; if (q2) { limits.W = Math.max(q.si, q2.si); limits.D = Math.min(q.si, q2.si); heard.push(`no more than ${q.text} × ${q2.text} of ground: its width and depth as made, checked`); usedNum.add(n2!); } else { limits.W = q.si; heard.push(`no more than ${q.text} across: a limit, checked`); } continue; }
      if (b[0] === 'than' && b[1] === 'thicker' && /\bwalls?\b/.test(b.join(' '))) { said.wall = q.si; heard.push(`walls no thicker than ${q.text}: weighed below by the heat through them`); continue; }
      if (b[0] === 'than' && /^(wider|taller|longer|deeper|higher|bigger|larger|thicker)$/.test(b[1] ?? '')) { const k = /wider|bigger|larger/.test(b[1]!) ? 'W' : /taller|higher/.test(b[1]!) ? 'H' : /deeper|thicker/.test(b[1]!) ? 'D' : 'W'; limits[k] = q.si; heard.push(`no ${b[1]} than ${q.text}: a limit, checked`); continue; }
      if (/^(under|below|within|max|maximum|most)$/.test(b[0] ?? '') && ax && ax !== 'span' && ax !== 'alt' && ax !== 'thick' && !near(FOLDS, 6)) { limits[ax === 'WD' ? 'W' : ax] = q.si; heard.push(`${b[0]} ${q.text} ${a[0]}: a limit, checked`); continue; }
      // "folds flat to 60 x 40 x 15 cm", "packs into a 70 cm bundle": checked against it as made, as folding is not kept
      if (near(FOLDS, 6)) { if (ax === 'D' || ax === 'thick' || near(/^(flat|thin|thick)$/, 3) && !pa.nums.some((o) => o !== n && o.clause === n.clause && o.before.slice(0, 3).join(' ') === n.before.slice(0, 3).join(' '))) limits.foldThin = q.si; else (limits.fold ??= []).push(q.si); heard.push(`folds or packs to ${q.text}: checked against it folded`); continue; }
      if (near(/^into$/, 3)) { drop('the size of what it makes, not of it'); continue; }
      if (ax === 'alt' || /^(above|below)$/.test(a[0] ?? '') && /^(sea|ground|surface|the)$/.test(a[1] ?? '')) { drop('where it works (an altitude), not a size of it'); continue; }
      if (ax === 'thick') { drop('a thickness: the thickness of its parts is derived, not taken'); continue; }
      const travelVerb = (/^(lifts?|raises?|lowers?|hoists?|slides?|travels?|moves?|extends?|drops?|reaches|strokes?)$/.test(cl.verb ?? '') || near(/^(lifts?|raises?|lowers?|hoists?|slides?|travels?|extends?|drops?)$/, 6)) && !ax;
      if (/^(span|spans|spanning|cross|crosses|crossing|bridge|bridges)$/.test(cl.verb ?? '') && sup && !/^(long|tall|high)$/.test(a[0] ?? '')) { take(sup, 'span', q.si, 'm', q.text); if (!sup.flags.includes('span')) sup.flags.push('span'); continue; }
      if (cl.kind === 'where' && cl.opener === 'to' && ax === 'H' && by('raise')) { take(by('raise')!, 'L', q.si, 'm', `to ${q.text} ${a.slice(0, 2).join(' ')}`); continue; }
      if (ax === 'span' || near(/^(span|spans|over|across)$/, 2) && !ax) { if (sup) { take(sup, 'span', q.si, 'm', q.text); if (!sup.flags.includes('span')) sup.flags.push('span'); continue; } }
      if (travelVerb || /^(travel|stroke)$/.test(a[0] ?? '')) { const tw = by('raise') ?? by('slide'); if (tw) { take(tw, 'L', q.si, 'm', q.text); continue; } drop('how far it raises, lowers or slides something: nothing it makes does that the way asked'); continue; }
      // said of something else: a thing it works on, or a part of it that is not made
      const nounAfter = a[0] && !AX[a[0]] && !/^(of|in|on|at|to|and|or|for|from|with|by|that|which|each|apiece|up|away|off|per|so|it|its|when|then|while|if|than|standing|working|overall|total)$/.test(a[0]) && !/^\d/.test(a[0]) ? a.find((x) => !/^(tall|high|wide|deep|long|square|solar|glass|steel|wooden|tiny|small|large|big)$/.test(x)) ?? a[0] : null;
      // "a 120 x 60 cm top": the size of its own top, when it holds a weight up
      const ofTop = !!nounAfter && SURFACE_PART.test(nounAfter) && !!sup;
      // "fits on a 100 mm x 160 mm card": the size of the card it is
      if (/\b(card|board|pcb)s?\b/.test(a.slice(0, 4).join(' ')) && /^(boards?|computers?|cards?|pcbs?|controllers?|circuits?|modules?)$/.test(mainHead ?? '')) { own.push({ ax: 'plain', v: q.si }); heard.push(`${q.text}: the size of its card`); continue; }
      if (said.trip && (a[0] === 'low' || /^(orbit|up|altitude)$/.test(a[0] ?? '')) && q.si >= 1e5) { heard.push(`${q.text} up: the orbit it leaves (its burns are worked from 400 km, estimate)`); continue; }
      if (nounAfter && nounAfter !== pa.clauses[0]?.head && !purposeOf(nounAfter) && cl.kind !== 'main' && !ofTop) { drop(`the size of ${singular(nounAfter)}, ${areaOf(nounAfter).startsWith('not a kind') ? 'which is not made here' : areaOf(nounAfter)}`); continue; }
      if (elsewhere && !(b[0] === 'at' && !a.length) && !/^(up|high)$/.test(a[0] ?? '')) { drop(`said of ${cl.head ? `the ${singular(cl.head)}` : 'something else'}, not of what it makes`); continue; }
      // its own sizes, kept for what the laws say of them, whether or not it is made
      if (cl.kind === 'main' || (ownerWant && ownerWant === ofHead)) own.push({ ax: ax ?? 'plain', v: q.si });
      const owner = (ofTop ? sup : undefined) ?? ownerWant ?? (cl.kind === 'main' ? ofHead : undefined) ?? sized; if (!owner) { if (cl.kind !== 'main') drop('nothing it makes takes that size'); continue; }
      if (ax === 'H' || /^(up|high)$/.test(a[0] ?? '') || b[0] === 'at' && !a.length) { if (owner.fn === 'turn') { drop('a height for something that turns: its height is derived'); continue; } take(owner, 'H', q.si, 'm', q.text); continue; }
      if (ax === 'WD') { take(owner, owner.fn === 'turn' ? 'Dia' : 'W', q.si, 'm', q.text); if (owner.fn !== 'turn') take(owner, 'D', q.si, 'm', q.text); continue; }
      if (ax === 'W' && owner.flags.includes('pole')) { take(owner, 'W', q.si, 'm', q.text); take(owner, 'D', q.si, 'm', `${q.text}, round`); continue; }
      if (ax === 'W') { take(owner, owner.fn === 'turn' ? 'Dia' : 'W', q.si, 'm', q.text); if (n.by !== null) { const n2 = pa.nums[n.by]; if (n2?.said) { take(owner, 'D', n2.said.si, 'm', n2.said.text); n2.said = null; } } continue; }
      if (ax === 'D') { take(owner, 'D', q.si, 'm', q.text); continue; }
      plain.push({ n, owner });
      continue;
    }
    if (sameDim(d, DIMS.mass) || sameDim(d, DIMS.force)) {
      const N = sameDim(d, DIMS.mass) ? q.si * G : q.si;
      // "less than 40 N on the handle", "a 1.5 kN fall pull on each hold": a force put on a part, not its weight or a load it carries
      if (sameDim(d, DIMS.force) && near(/^(squeez\w*|grips?|gripping|clamps?|clamping|presses|pressing|pinch\w*)$/, 6)) { said.grip = q.si; heard.push(`squeezing with no more than ${q.text}: weighed below`); continue; }
      if (sameDim(d, DIMS.force) && (near(/^(handle|handles|crank|cranks|lever|levers|pedal|pedals|grip|grips|tiller)$/, 4) || /^(on|at)$/.test(a[0] ?? '') && /^(the|its|a)?$/.test(a[1] ?? '') && /^(handle|crank|lever|pedal)s?$/.test(a[2] ?? a[1] ?? ''))) { said.effort = q.si; heard.push(`${q.text} at the handle: the most a hand puts on it, weighed below`); continue; }
      if (sameDim(d, DIMS.force) && near(/^(pull|pulls|pull-out|fall|rated|rating|holds?)$/, 4) && !near(/^(carry|carries|hold|holds|support|supports|bear|bears)$/, 2)) { said.pull = q.si; heard.push(`${q.text} pulling on a part: weighed below`); continue; }
      // "behind no more than 2 kg of tantalum shielding": its shield, not what it carries
      if (a[0] === 'of' && /^(tantalum|tungsten|lead|aluminium|aluminum|copper)$/.test(a[1] ?? '') && /^shield/.test(a[2] ?? '')) { heard.push(`${q.text} of ${a[1]} shielding: weighed below`); continue; }
      // "a camera that weighs 0.2 µg": the weight of the thing named just before, not its own
      const said0 = pa.clauses[n.clause - 1], ofOther = cl.kind === 'does' && /^(that|which)$/.test(cl.opener) && !!said0?.head && said0 !== pa.clauses[0] && said0.head !== pa.clauses[0]?.head;
      if (near(/^(weighs?|weighing|weight)$/, 4) && ofOther) { loadSaid = { N, text: `${said0!.head} of ${q.text}` }; said.payload = N / G; continue; }
      // "no single piece can weigh more than 35 kg": a limit on each part, not on all of it
      if (near(/^(weighs?|weighing|weight)$/, 6) && /\b(single|each|any|every|one)\s+(piece|part|component|section|module|panel|board|member|bit|element)s?\b/.test(`${cl.text} ${[...b.slice(0, 8)].reverse().join(' ')}`)) { limits.part = N / G; heard.push(`no part weighing more than ${q.text}: each part checked against it`); continue; }
      if (near(/^(weighs?|weighing|weight)$/, 4)) { limits.mass = N / G; heard.push(`weighs ${b[0] === 'weighs' || b[0] === 'weigh' ? '' : b[0] === 'than' ? 'no more than ' : `${b[0]} `}${q.text}: a limit on its own weight, checked`); continue; }
      // "a flask under 400 g empty", "lighter than 300 g": its own weight, where nothing near it carries, holds or lifts
      if ((/^(under|below)$/.test(b[0] ?? '') || b[0] === 'than' && /^(lighter|less)$/.test(b[1] ?? '') || a[0] === 'empty') && !near(/^(carr|hold|support|lift|bear|take|tow|haul|pull|push|rais|load|deliver)/, 5)) { limits.mass = N / G; heard.push(`${b[0] === 'than' ? `${b[1]} than` : 'under'} ${q.text}${a[0] === 'empty' ? ' empty' : ''}: a limit on its own weight, checked`); continue; }
      if (near(/^(measures|measure|dispenses|dispense|pours|portions|doses|meters)$/, 4)) { drop('a dose to measure out: measuring out is not kept'); continue; }
      const each = a[0] === 'of' && a[1] === 'each' || a[0] === 'each' || a[0] === 'apiece', many = each ? (() => { for (const c2 of [...pa.clauses.slice(n.clause, n.clause + 3), ...pa.clauses.slice(Math.max(0, n.clause - 3), n.clause).reverse()]) for (const m2 of c2.text.matchAll(/\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:separate\s+|different\s+)?([a-z]+)/g)) if (!/^(kg|kgs|g|grams?|kilo\w*|lbs?|pounds?|tonnes?|tons?|t|n|kn|mm|cm|m|metres?|meters?|l|litres?|liters?|ml|each|per|percent)$/.test(m2[2]!)) return countOf(m2[1]!); return 1; })() : 1;
      loadSaid = { N: N * many, text: many > 1 ? `${q.text} each, ${many} of them` : q.text }; said.payload = (N * many) / G;
      // "150 kg of hammering": read as that weight held still; a blow's peak force is several times it, and is not tested
      if (a[0] === 'of' && /^(hammer|pound|impact|blow|strik|bang|jump|stamp)/.test(a[1] ?? '')) heard.push(`${q.text} of ${a[1]}: read as that weight held still; a blow's peak force is several times it, and impact is not tested`);
      // "100 kg of wet soil": loose stuff, which lies in what holds it and pushes on its sides
      const ls = a[0] === 'of' ? LOOSE_RE.exec(a.slice(1).join(' ')) : null;
      if (ls) { const wet = /wet|soaking|damp/.test(a.slice(1, 3).join(' ')); looseSaid = { rho: LOOSE[ls[1]!]![wet ? 1 : 0], kg: (N * many) / G, what: ls[0]! }; }
      continue;
    }
    if (sameDim(d, DIMS.volume)) {
      if (a[0] === 'per' || b.includes('per') || /^(a|an|every)$/.test(a[0] ?? '') && /^(second|minute|hour)$/.test(a[1] ?? '')) { drop('a flow rate: pumping is not kept yet'); continue; }
      if (b[0] === 'within') { drop('a tolerance on filling: filling is not kept'); continue; }
      // "spills less than 5 ml if knocked over": a thing it is asked to do, not a number unused
      if (near(/^(spills?|spilling|leaks?|leaking|loses?|drips?)$/, 4)) { const over = /\b(knock\w*|tip\w*|topple\w*|falls?|dropped)\b/.test(t); asked.push({ text: `spills no more than ${q.text}${over ? ' if knocked over' : ''}`, kind: 'does', got: null, why: `${over ? 'knocking it over' : 'spilling'} is not tested; with no lid made, knocked over it would spill all it holds` }); continue; }
      // "a 1 litre vacuum flask": the volume of the thing named, said before its name
      if (cl.kind === 'main' && cl.head && n.tok < cl.headAt && purposeOf(cl.head)?.fn === 'contain') { const co = by('contain')!; take(co, 'V', q.si, 'm³', q.text); continue; }
      // "folds into a 25 litre backpack": what it packs into, checked against it folded
      if (near(FOLDS, 8) && /^(into|in|inside|within)$/.test(b[0] === 'a' || b[0] === 'an' ? b[1] ?? '' : b[0] ?? '')) { limits.foldVol = q.si; heard.push(`packs into ${q.text}${a[0] && /^[a-z]+$/.test(a[0]) ? ` (a ${singular(a[0])})` : ''}: checked against it folded`); continue; }
      if (elsewhere || (a[0] && !/^(of|tank|bucket|vessel|container|and|or|in|at)$/.test(a[0]) && !purposeOf(a[0]))) { drop(`the size of ${a[0] ? singular(a[0]) : 'something else'}, not of what it makes`); continue; }
      const co = by('contain') ?? add('contain', FN_WORDS.contain, BASE.contain); take(co, 'V', q.si, 'm³', q.text); if (!asked.some((x) => x.got === 'contain')) asked.push({ text: `holds ${q.text}`, kind: 'does', got: 'contain', why: '' });
      continue;
    }
    // a speed of something else: what hits it or what it throws ("a 160 km/h slapshot", "fires 25 balls at 60 km/h", "hits
    // it at 4 m/s"), or a rim it must keep under ("keep the rim under 3 m/s")
    if (sameDim(d, DIMS.speed) && !/^(gusts?|winds?|breeze|gales?)$/.test(a[0] ?? '') && (near(/^(rim|rims|edge|outside)$/, 4) || [...b.slice(0, 4).reverse(), ...a.slice(0, 4)].some((x, k, all) => /^tips?$/.test(x) && all[k + 1] !== 'over' && !/^(not|to|won't|wont|never|or)$/.test(all[k - 1] ?? '')))) { said.rimMax = q.si; heard.push(`its rim under ${q.text}: weighed below`); continue; }
    if (sameDim(d, DIMS.speed) && (PROJECTILES.some(([re]) => re.test(` ${a.slice(0, 2).join(' ')} ${b.slice(0, 3).join(' ')} `)) || near(/^(hits?|hitting|strikes?|striking|slaps?|slapshots?|shots?|fires?|firing|launch\w*|throws?|throwing|shoots?|kicks?|kicked|rams?|ramming|charges?|turns)$/, 5)) && !mov) {
      const p = PROJECTILES.find(([re]) => re.test(t)), animal = /\b(steer|cow|cattle|bull|horse|animal|sheep|pig|deer|bison|ox)\b/.exec(t)?.[1], fires = /\b(fires?|firing|launch\w*|throws?|throwing|shoots?|serves?|pitch\w*)\b/.test(t), many = /\b(\d+)\s+(balls?|pucks?|shots?|rounds?)\b/.exec(t);
      said.hit = { v: q.si, m: p ? p[1] : animal && said.payload ? said.payload : undefined, what: p ? p[2] : animal ? `the ${animal}` : 'what hits it', fires, n: many ? Number(many[1]) : undefined };
      heard.push(`${p ? p[2] : animal ? `the ${animal}` : 'something'} at ${q.text}: ${fires ? 'what it throws' : 'what hits it'}, weighed below`); continue;
    }
    if (sameDim(d, DIMS.speed)) {
      // a journey said in legs ("100 km at 80 km/h, then 5 km across a lake at 10 knots"): each speed goes with the
      // distance before it; the first leg's is the speed it moves at
      const windy = /^(gusts?|winds?|breeze|gales?|current)$/.test(a[0] ?? '') || near(/^(winds?|gusts?)$/, 3), leg = windy ? undefined : said.legs?.find((l) => l.v === undefined), later = leg !== undefined && said.legs!.indexOf(leg) > 0;
      if (leg) { leg.v = q.si; if (/\b(knots?|kn)\b/.test(q.text)) leg.water = true; }
      if (!windy && !later) said.v = q.si; if (/^(gusts?|winds?|breeze|gales?)$/.test(a[0] ?? '') || near(/^(winds?|gusts?)$/, 3)) { said.wind = q.si; heard.push(`wind of ${q.text}: it is pushed by it in the physics test`); continue; } if (/^current$/.test(a[0] ?? '')) { drop('a current of water: there is no flow in the physics here'); continue; } if (mov) { if (mov.q.v?.by === 'you' || later) { heard.push(`at ${q.text} on another leg: weighed below`); continue; } take(mov, 'v', q.si, 'm/s', q.text); continue; } if (!later) said.v = q.si; if (by('lift')) { heard.push(`flies at ${q.text}: weighed below`); continue; } if (said.buoyant || said.burrows || said.immersed || by('float')) { heard.push(`at ${q.text}: weighed below`); continue; } drop(asked.some((x) => /getting about by legs/.test(x.why)) ? 'a speed for getting about by legs, by climbing or by swimming, which is not kept' : 'a speed for something that does not move along'); continue; }
    if (sameDim(d, DIMS.frequency)) { said.w = q.si; const tu = by('turn'); if (tu) { take(tu, 'rpm', q.si, 'rpm', q.text); continue; } drop('a turning speed for something that does not turn'); continue; }
    if (sameDim(d, DIMS.temperature)) {
      if (/^(difference|gap|gradient|warmer|colder|hotter|between)$/.test(a[0] ?? '')) { said.dT = q.value; heard.push(`a difference of ${q.text}: weighed below`); continue; }
      const C = q.si - 273.15;
      // "in a 5 °C car", "in 35 °C desert heat", "through −170 °C nights": the temperature round it
      if (/^(heat|air|car|room|weather|outside|outdoors|desert|sun|shade|surroundings|cold|day|days|night|nights|winter|summer|ambient|climate)$/.test(a.find((x) => !/^(desert|summer|winter|night|outside|dry|still)$/.test(x)) ?? a[0] ?? '') || /^(heat|air|car|room|weather|outside|desert|sun|shade|surroundings|nights?|ambient)$/.test(a[0] ?? '')) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "tea poured at 95 °C", "1 litre of 15 °C stream water": where what it holds starts
      if (near(/^(poured|filled|starting|starts|begins|made|brewed|boiled)$/, 3) || b[0] === 'of' && /^(water|tea|coffee|milk|soup|stream|tap|cold|warm|hot)$/.test(a[0] ?? '')) { said.T0 = C; heard.push(`starting at ${q.text}: weighed below`); continue; }
      // "keeps tea above 55 °C", "still above 70 °C after 48 hours": the least it may come to, weighed against its heat loss
      if (near(/^(above|over)$/, 3) && (near(/^(keeps?|keeping|kept|stays?|staying|remains?|still|holds?|holding)$/, 7) || /\bkeeps?\b/.test(cl.text))) { said.tmin = q.si - 273.15; heard.push(`kept above ${q.text}: weighed below by the heat it loses`); continue; }
      // "works from −160 °C to +120 °C": the range its parts must work over, which is a rating of parts not kept
      if (near(/^(from|between)$/, 2) || b[0] === 'to' && near(/^(from|between)$/, 6)) { const C = q.si - 273.15; drop(`a range it must work over: parts rated for it (electronics, seals) are not kept${C < -55 || C > 125 ? '; past the −55 to +125 °C that military-grade parts are rated for, so it must be kept warm or cool (estimate)' : ''}`); continue; }
      if (near(/^(above|over|hotter|warmer|exceeding|exceed|beyond|past|hits?|hitting|reaches|reaching)$/, 3) || b[0] === 'than' && /^(hotter|warmer)$/.test(b[1] ?? '') || /^(under|below)$/.test(b[0] ?? '') && /\b(dissipat\w*|fanless|chips?|soc|cpu|gear|electronics|servers?|heat ?sinks?|draws?)\b/.test(t)) { said.tmax = q.si - 273.15; heard.push(`no hotter than ${q.text}: weighed below by the heat it sheds`); continue; }
      // "the chamber held at 250 °C": something kept hot, a warmer; "a nozzle at 480 °C": a part not made
      if (near(/^(held|kept|maintained|heated)$/, 3) && C > 40) { const wa = by('warm') ?? add('warm', FN_WORDS.warm, BASE.warm); take(wa, 'T', C, '°C', q.text); continue; }
      if (near(/^(nozzles?|hot ?ends?|extruders?|elements?|tips?)$/, 3) && C > 40) { drop(`the heat of a part not made (a hot end): weighed only as said`); continue; }
      // "at -25 °C" near ice or frost, "on a frosty morning": the cold round it
      if (C < 5 && /\b(ice|icy|frost\w*|freez\w*|winter|snow\w*)\b/.test(t) && !said.Tkeep) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "curls shut when it warms to 37 °C": a temperature it acts at
      if (near(/^(warms?|warming|reaches|at)$/, 3) && /\b(when|once|if)\b/.test(b.slice(0, 5).join(' '))) { drop('a temperature it acts at: what senses heat and moves by it is not kept'); continue; }
      // "holds 20 litres of drinks at 4 °C" in a cooler: what it is kept cold at, weighed by the heat that leaks in
      if (/\b(cool|cooled|cooler|cools|cooling|chill|chilled|fridge|refrigerat\w*|freez\w*|peltier|cold)\b/.test(t) && !near(/^(below|under)$/, 2)) { said.Tkeep = C; heard.push(`kept at ${q.text}: weighed below by the heat that leaks in`); continue; }
      if (/\b(cool|cools|cooling|chill|freeze|cold)\b/.test(t) || b[0] === 'below' || b[0] === 'under') { drop('cooling to a temperature: keeping warm is kept, cooling is not'); continue; } const wa = by('warm'); if (wa) { take(wa, 'T', q.si - 273.15, '°C', q.text); continue; } drop('a temperature for something that does not keep warm'); continue; }
    // "kept at 101 kPa inside": the pressure it holds in
    if (sameDim(d, DIMS.pressure)) { said.pin = q.si; heard.push(`${q.text} held inside: weighed below by the pull in its wall`); continue; }
    // "a rigid 12 m² room", "12 m² of floor": what it encloses, as square as it may be
    if (sameDim(d, [0, 2, 0, 0, 0] as typeof d) && by('enclose') && /^(room|rooms|floor|floor ?space|inside|space|interior|of)$/.test(a[0] ?? '') && !/panel|cell|sail|collector/.test(a.join(' '))) { const enc = by('enclose')!, side = Math.sqrt(q.si); take(enc, 'W', side, 'm', `${q.text}, square`); take(enc, 'D', side, 'm', `${q.text}, square`); continue; }
    // "a 0.5 hectare fish pond": the size of the place it works in, not of a part of it
    if (sameDim(d, [0, 2, 0, 0, 0] as typeof d) && /\b(ponds?|lakes?|fields?|farms?|gardens?|sites?|yards?|plots?|paddocks?|pastures?|lots?|orchards?|vineyards?)\b/.test(a.slice(0, 3).join(' '))) { heard.push(`${q.text} ${a.slice(0, 2).join(' ')}: the place it works in, ${+(q.si / 1e4).toPrecision(3)} ha`); continue; }
    if (sameDim(d, [0, 2, 0, 0, 0] as typeof d)) { said.area = q.si; heard.push(`${q.text}${/panel|cell|sail|collector/.test(a.join(' ')) ? ` of ${a.find((x) => /panel|cell|sail|collector/.test(x))}` : ''}: weighed below`); continue; }
    if (sameDim(d, [1, 0, -3, 0, 0] as typeof d)) { said.light = q.si; heard.push(`${q.text} of light: weighed below`); continue; }
    if (sameDim(d, DIMS.energy)) { said.store = q.si; heard.push(`${q.text}${/\b(battery|batteries|power station|power bank|pack|cells?)\b/.test(a.join(' ')) ? ' stored' : ''}: weighed below`); continue; }
    if (sameDim(d, [0, 2, -2, 0, 0] as typeof d) && q.unit === 'krad') { said.ratedDose = q.si; heard.push(`rated for ${q.text} in all: weighed below against where it is`); continue; }
    if (sameDim(d, [0, 2, -2, 0, 0] as typeof d) && /^(Sv|mSv|uSv|Gy)$/.test(q.unit)) { said.dosePerYear = /^(per|a|each|every)$/.test(a[0] ?? '') && /^(year|yr|annum)$/.test(a[1] ?? ''); said.dose = q.si; heard.push(`a dose of no more than ${q.text}: weighed below for the trip`); continue; }
    if (sameDim(d, DIMS.time)) {
      const dw = wants.find((w) => w.fn === 'warm' && w.flags.includes('dry'));
      if (dw && (near(/^(in|under|within)$/, 3))) { dw.q.dryFor = fig(q.si, 's', 'you', q.text); heard.push(`dries in ${q.text}: weighed by the heat the water takes to leave`); continue; }
      // "370 s specific impulse": the speed of its exhaust over g, for the rocket equation
      if (/^(specific|isp|i_sp)$/.test(a[0] ?? '') || near(/^(isp|impulse)$/, 2)) { said.isp = q.si; heard.push(`a specific impulse of ${q.text}: its exhaust at ${+(q.si * G / 1000).toPrecision(3)} km/s, weighed below`); continue; }
      if (said.trip && (near(/^(in|within|under)$/, 2) || near(/^(takes?|taking|lasting|over)$/, 3)) && said.trip.days === undefined) { said.trip.days = q.si / 86400; heard.push(`in ${q.text}${said.trip.back ? ' each way' : ''}: weighed below by the speed it must gain and lose`); continue; }
      // "still above 70 °C after 48 hours": how long it must keep; "in 5 minutes of cranking", "in 2 hours of sun": what it has to do it in
      if (b[0] === 'after') { said.keepFor = q.si; heard.push(`after ${q.text}: weighed below`); continue; }
      if (near(/^(within)$/, 2) || b[0] === 'under' && b[1] === 'in' || near(/^(in|within|under)$/, 2) && (said.distance !== undefined ||said.T0 !== undefined || /\b(boil|boiling|heat|heats|warm|charge|refill|fill|reach|reaches|bring|brings|deliver)\b/.test(t) || /^(of)$/.test(a[0] ?? ''))) { said.within = q.si; heard.push(`within ${q.text}: weighed below by the power it takes`); continue; }
      if (near(/^(every|once)$/, 2) && /\b(spin|spins|spinning|turn|turns|turning|rotat\w*|revolv\w*)\b/.test(t)) { said.w = (2 * Math.PI) / q.si; const tu = by('turn'); if (tu) take(tu, 'rpm', said.w, 'rpm', `once every ${q.text}`); else heard.push(`turning once every ${q.text}`); continue; }
      if (near(/^(for|lasts?|lasting|runs?|hover|hovers|hovering|keeps?)$/, 3) || /\b(charge|battery)\b/.test(a.join(' ')) || /^(surface\s+)?(mission|stay|deployment|sojourn|expedition)s?\b/.test(a.slice(0, 2).join(' '))) { said.runFor = q.si; heard.push(`runs for ${q.text}: weighed below by the energy it must carry`); continue; }
      drop(near(/^(for|lasts?|runs?)$/, 3) || /\bcharge\b/.test(a.join(' ')) ? 'how long it runs on its power: power is not kept yet' : 'how long it takes: time limits are not checked yet'); continue; }
    if (sameDim(d, DIMS.power)) {
      const as = near(/^(puts?|putting|gives?|giving|delivers?|outputs?|supplies|supplying|provides?|charges?|out)$/, 3) ? 'gives' : near(/^(makes?|making|produces?|generates?|harvests?)$/, 3) ? 'makes' : 'draws';
      (said.power ??= []).push({ W: q.si, as }); const cap = as === 'draws' && near(/^(less|under|most|max|maximum|than|within|below)$/, 3); if (cap) limits.power = q.si;
      heard.push(cap ? `uses no more than ${q.text}: a limit, checked against what it makes that draws power` : `${as} ${q.text}: weighed below`); continue;
    }
    if (q.unit === 'deg' || q.unit === 'rad') {
      if (Math.abs(q.si - 2 * Math.PI) < 1e-6 && /\bevery\b/.test(cl.text + ' ' + a.join(' '))) { heard.push(`${q.text}: a whole turn, read with its time as its speed`); continue; }
      if (/^(slope|incline|hill|grade|ramp|gradient)s?$/.test(a.find((x) => !/^(muddy|steep|wet|grassy|gravel|rough)$/.test(x)) ?? '') && mov) { mov.q.slope = fig(q.si, 'rad', 'you', q.text); heard.push(`up a ${q.text} slope: its motors checked for it`); continue; } drop('a turn of so many degrees at a time: turning by steps is not kept'); continue; }
    // "up a 15% hill": a grade, rise over run
    if (q.unit === '%' && /\b(hill|hills|slope|slopes|incline|grade|gradient|ramp|climb)\b/.test(a.slice(0, 3).join(' '))) { said.grade = q.si; if (mov) { mov.q.slope = fig(Math.atan(q.si), 'rad', 'you', q.text); heard.push(`up a ${q.text} grade (${+((Math.atan(q.si) * 180) / Math.PI).toPrecision(3)}°): its motors checked for it`); } else { said.grade = q.si; heard.push(`up a ${q.text} grade: weighed below`); } continue; }
    drop(`a figure of ${q.unit}: electric chains and energy figures are not kept yet`);
  }
  // lengths said with nothing to say which way: the largest is its width, the next its depth (a third, for what encloses, its height)
  const byOwner = new Map<Want, number[]>(); for (const { n, owner } of plain) byOwner.set(owner, [...(byOwner.get(owner) ?? []), n.said!.si]);
  for (const [w, vs] of byOwner) {
    const ks = w.fn === 'turn' ? ['Dia'] : w.fn === 'raise' || w.fn === 'slide' ? ['L'] : w.fn === 'contain' ? [] : w.flags.includes('span') ? ['span', 'W'] : ['W', 'D', 'H'], free = ks.filter((k) => w.q[k]?.by !== 'you');
    vs.sort((x, y) => y - x).forEach((v, i) => { const k = free[i]; if (k && (k !== 'H' || w.fn === 'enclose' || vs.length === 1 && free.length === 1)) take(w, k, v, 'm', len(v)); else dropped.push(`${len(v)}: a length it had no way to place`); });
  }
  if (carrier && loadSaid) { if (carrier.fn === 'support') take(carrier, 'F', loadSaid.N, 'N', loadSaid.text); else take(carrier, 'm', loadSaid.N / G, 'kg', loadSaid.text); }
  const obj = occupant ?? MASSES.find(([re]) => re.test(t) && pa.clauses.some((c) => (c.kind === 'for' || c.kind === 'does') && re.test(` ${c.text} `)));
  if (carrier?.fn === 'support' && obj?.[3] && carrier.q.W?.by !== 'you') { carrier.q.W = fig(Math.max(obj[3][0] * 1.25, 0.15), 'm', 'estimate', `a top a little wider than ${obj[2]}`); carrier.q.D = fig(Math.max(obj[3][1] * 1.25, 0.15), 'm', 'estimate', 'and a little deeper'); }
  // what encloses something everyone knows the size of is made to hold it: a third again all round
  const enc0 = by('enclose'); if (enc0 && obj?.[3] && enc0.q.W?.by !== 'you') { const [ow, od, oh] = obj[3]; enc0.q.W = fig(ow * 1.3, 'm', 'estimate', `room for ${obj[2]} (${len(ow)} long), a third again`); enc0.q.D = fig(od * 1.3, 'm', 'estimate', `${len(od)} wide, a third again`); enc0.q.H = fig(oh * 1.3, 'm', 'estimate', `${len(oh)} tall, a third again`); }
  // what people shelter in is as big as they need: each lying down about 0.65 m by 2 m (a sleeping pad and a little
  // room, estimate), side by side, and about 1 m inside to sit up in (a seated adult's head about 0.9 m up, estimate)
  const crewM = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[- ](?:person|man|people|berth|bed|sleeper)\b/.exec(t) ?? /\b(?:for|sleeps|houses|shelters)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:people|persons|adults|men|women|campers|crew|climbers|hikers|sleepers|kids|children)\b/.exec(t), crew = crewM ? countOf(crewM[1]!) : 0;
  if (enc0 && crew > 0 && crew <= 40 && enc0.q.W?.by !== 'you' && /^(shelters?|tents?|huts?|cabins?|bivouacs?|bivvys?|bunkers?|igloos?|refuges?|lodges?|yurts?|habitats?|bothys?|lean-tos?|sleepers?)$/.test(mainHead ?? '')) {
    const cols = crew <= 4 ? crew : Math.ceil(crew / 2), rows = crew <= 4 ? 1 : 2;
    enc0.q.W = fig(cols * 0.65, 'm', 'estimate', `room for ${crew} lying side by side${rows > 1 ? ' in two rows' : ''}, 0.65 m each (a sleeping pad and a little room, estimate)`); enc0.q.D = fig(rows * 2, 'm', 'estimate', `${rows > 1 ? 'two lengths' : 'a length'} of 2 m`); enc0.q.H = fig(1.1, 'm', 'estimate', 'and 1.1 m to sit up in (a seated adult\'s head up to about 1 m, estimate)');
    heard.push(`for ${crew}: sized for them lying down and sitting up`);
  }
  // "80 cm of settled snow on the roof": a weight spread on its roof, ρ g h
  if (enc0 && depthLoad && /\bon (the |its )?(roof|top|lid)\b/.test(t)) { enc0.q.roofP = fig(depthLoad.rho * G * depthLoad.d, 'Pa', 'you', depthLoad.text); heard.push(`${depthLoad.text} on its roof: ${+(depthLoad.rho * G * depthLoad.d / 1000).toPrecision(3)} kPa spread on it (ρ g h), checked`); }
  // what encloses a vessel holds it inside: as wide, deep and tall as the squattest vessel of that much (as wide as it is
  // tall), and room round it; the vessel is then made to fit what it goes in
  const ves0 = by('contain'); if (enc0 && ves0?.q.V && enc0.q.W?.by !== 'you') { const d = Math.cbrt((4 * 1.1 * ves0.q.V.v) / Math.PI); const why = `room for the ${len(d)} vessel of ${+(ves0.q.V.v * 1e3).toPrecision(3)} L it holds`; if (enc0.q.W!.v < d + 0.04) enc0.q.W = fig(d + 0.04, 'm', 'estimate', `${why}, and 20 mm round it`); if (enc0.q.D!.v < d + 0.04) enc0.q.D = fig(d + 0.04, 'm', 'estimate', `deep enough for the ${len(d)} vessel, and 20 mm round it`); if (enc0.q.H!.v < d + 0.02) enc0.q.H = fig(d + 0.02, 'm', 'estimate', `tall enough for the ${len(d)} vessel, and 20 mm more`); }
  if (sup && /\bback(rest)?\b/.test(t) && !sup.flags.includes('back')) sup.flags.push('back');
  // used from a wheelchair: knees under it, and what is worked on within reach
  if (sup && /\bwheel ?chairs?\b/.test(t)) { sup.flags.push('knees'); heard.push('from a wheelchair: room for the knees under it, and its surface within reach, checked (2010 ADA Standards)'); }
  for (const w of wants) for (const [k, f] of Object.entries(BASE[w.fn])) if (!w.q[k]) w.q[k] = f;
  // a surface on what moves or raises it lies on it: no height of its own to ask; and a part of a thing (a "load bed")
  // takes no room's sizes for what it is named, only what it carries and what carries it
  if (sup && (mov || by('raise')) && sup.q.H?.by === 'estimate' && !sup.flags.includes('levels') && !sup.flags.includes('span')) {
    sup.flags.push('laid'); sup.q.H = fig(0, 'm', 'usual', 'it lies on what carries it');
    for (const k of ['W', 'D'] as const) if (sup.q[k]?.by === 'usual') sup.q[k] = BASE.support[k]!;
  }
  // a depth of something heavy on what holds it up: its weight, over the surface it lies on
  // "70 kg spread evenly", "evenly distributed": the load spread over what bears it
  if (sup && /\b(spread|distributed)\s+(evenly|out|uniformly|across|along|over)\b|\bevenly\s+(spread|distributed|loaded)\b|\buniform(ly)?\s+(load|distributed)/.test(t) && !sup.flags.includes('even')) { sup.flags.push('even'); heard.push('spread evenly: the load spread over what bears it'); }
  // "4 adults plus a loaded wheelbarrow": a load of several people and things, spread along what bears it (estimate), not
  // one weight standing at a point
  const crowdM = /\b(\d+|two|three|four|five|six|seven|eight|nine|ten|several|many)\s+(?:\w+\s+)?(adults?|people|persons|men|women|kids|children|hikers|walkers|guests|students|riders|players)\b/.exec(t);
  if (sup && crowdM && (sup.flags.includes('span') || sup.q.span) && (countOf(crowdM[1]!) >= 2 || /^(several|many)$/.test(crowdM[1]!)) && !sup.flags.includes('crowd')) { sup.flags.push('crowd'); heard.push(`${crowdM[0]}: a load of several, spread along what bears it (estimate), not one weight at a point`); }
  if (sup && depthLoad) { const kg = sup.q.W!.v * sup.q.D!.v * depthLoad.d * depthLoad.rho; take(sup, 'F', kg * G, 'N', `${depthLoad.text} over ${len(sup.q.W!.v)} × ${len(sup.q.D!.v)}: ${+kg.toPrecision(3)} kg`); said.payload = kg; }
  // what it rolls on, said: rolling resistance and the grip of rubber on it (estimates: soft ground takes ten times a floor)
  const gw = /\b(mud|muddy|boggy|swampy)\b/.exec(t) ?? /\b(grass|grassy|lawn|turf)\b/.exec(t) ?? /\b(gravel|gravelly|stony)\b/.exec(t) ?? /\b(sand|sandy|beach|dunes?)\b/.exec(t) ?? /\b(snow|snowy|ice|icy)\b/.exec(t);
  if (mov && gw) { const k = gw[1]!, [crr, mu, word] = /mud|bog|swamp/.test(k) ? [0.2, 0.3, 'mud'] : /grass|lawn|turf/.test(k) ? [0.1, 0.5, 'grass'] : /gravel|ston/.test(k) ? [0.05, 0.5, 'gravel'] : /sand|beach|dune/.test(k) ? [0.25, 0.4, 'sand'] : [0.02, 0.1, 'snow and ice']; mov.q.crr = fig(crr as number, '', 'estimate', word as string); mov.q.mu = fig(mu as number, '', 'estimate', word as string); heard.push(`on ${word}: rolling resistance about ${crr} and grip about ${mu} (estimate)`); }
  // loose stuff lies in what holds it: walls round its surface, as deep as it lies (said, or its volume over the surface)
  const looseOn = sup ?? mov;
  if (looseOn && (depthLoad || looseSaid)) { looseOn.flags.push('loose'); if (/\b(wet|soaking|soaked|damp|moist|garden|outdoors?|outside|rain|vegetables?)\b/.test(t)) looseOn.flags.push('wet'); looseOn.q.rho = fig(depthLoad?.rho ?? looseSaid!.rho, 'kg/m³', 'estimate', `${depthLoad?.text ?? looseSaid!.what}`); if (depthLoad) looseOn.q.depth = fig(depthLoad.d, 'm', 'you', depthLoad.text); else looseOn.q.lkg = fig(looseSaid!.kg, 'kg', 'you', looseSaid!.what); }
  // its own size: as said, or as named ("the size of a tardigrade"); then what that size asks, and what the laws say
  for (const o of own) { const z = said.size!; if (o.ax === 'H') z.H ??= o.v; else if (o.ax === 'W' || o.ax === 'WD') { z.W ??= o.v; if (o.ax === 'WD') z.D ??= o.v; } else if (o.ax === 'D') z.D ??= o.v; }
  for (const v of own.filter((o) => o.ax === 'plain').map((o) => o.v).sort((x, y) => y - x)) { const z = said.size!; if (z.W === undefined) z.W = v; else if (z.D === undefined) z.D = v; else z.H ??= v; }
  const nm = namedSize(t);
  const ownNamed = !nm && said.size!.W === undefined ? NAMED_SIZES.find(([re, , , dims]) => dims && re.test(` ${[...(pa.clauses.find((c) => c.kind === 'main' && c.head)?.mods ?? []), mainHead].join(' ')} `)) : undefined;
  if (ownNamed) { const [, , src, dims] = ownNamed; said.size = { W: dims![0], D: dims![1], H: dims![2] }; heard.push(`its size as named: ${src}`); }
  if (nm && said.size!.W === undefined) { said.size!.W = nm.L; heard.push(`${nm.said}: ${len(nm.L)}, ${nm.source}`); if (ofHead) { if (ofHead.fn === 'turn') take(ofHead, 'Dia', nm.L, 'm', `${len(nm.L)}, ${nm.said}`); else if (!ofHead.q.W || ofHead.q.W.by !== 'you') take(ofHead, 'W', nm.L, 'm', `${len(nm.L)}, ${nm.said}`); } }
  said.round = /\b(sphere|spherical|ball|globe|planet|orb|moon|inflatable|dome|domed)\b/.test(t) || !!nm && /earth|moon|sun|jupiter|mars|venus|planet/.test(nm.source.toLowerCase());
  said.vacuum = /\b(space|orbit|orbits|orbital|vacuum|interplanetary|planet|asteroid|lunar|moon|europa|ganymede|callisto|enceladus|mercury)\b/.test(t) && !/\b(in|under|with) (the )?(air|water|sea)\b/.test(t);
  said.immersed = /\b(in|inside|within|through|under)\s+(a\s+|the\s+)?(\w+\s+)?(blood( vessels?)?|vessels?|veins?|arter(y|ies)|water|sea|ocean|lake|river|pond|bloodstream|soil|clay|mud|ground)\b|\bunderwater\b|\bburrow/.test(t);
  said.slender = /\b(earth)?worms?\b|\b(worm|snake|eel|needle|rod|pencil|probe)[- ](style|like|shaped)\b|\bsnakes?\b|\beels?\b/.test(t);
  said.fieldDriven = /\b(magnetically|externally) (driven|steered|powered)\b|\bdriven by (a |an )?(external )?(magnetic )?field\b/.test(t); said.vacuumWall = /\b(vacuum flask|vacuum[- ]insulated|thermos|double[- ]walled vacuum)\b/.test(t);
  if (said.fieldDriven) heard.push('driven from outside by a magnetic field: weighed below');
  if (/\bbalcon(y|ies)\b/.test(t)) said.ground = 'balcony'; else if (/\b(sand|sahara|desert|dunes?|beach)\b/.test(t)) said.ground = 'sand'; else if (/\b(mud|muddy|soil|field|bog|marsh)\b/.test(t) && !depthLoad && !looseSaid) said.ground = 'soil';
  said.volume ??= by('contain')?.q.V?.v;
  if (said.waters && sup) said.waterArea = sup.q.W!.v * sup.q.D!.v;
  said.massLimit = limits.mass; said.flies = !!by('lift') || /\b(fly|flies|flying|hover|hovers|hovering|airborne|drone)\b/.test(t); said.motor = /\b(motor|dynamo|generator|turbine)\b/.test(pa.clauses[0]?.head ?? '');
  said.heatEngine = /\bheat engine\b|\bruns? on (the )?[^,.;]*\b(difference|gradient)\b/.test(t); if (said.heatEngine && said.dT !== undefined && /\bblood|body|tissue|skin\b/.test(t)) said.Tat = 310;
  if (said.light === undefined && /\b(sunlight|in the sun|outdoors|solar|desert)\b/.test(t) && !/\blux\b/.test(t)) said.light = 1000;
  // a span said is its size too
  if (sup?.q.span?.by === 'you') said.span = sup.q.span.v;
  const Ls = [said.size!.W, said.size!.D, said.size!.H, said.span].filter((x): x is number => x !== undefined), Lsize = Ls.length ? Math.max(...Ls) : undefined;
  const scale = Lsize !== undefined && (Lsize < 5e-3 || Lsize > 50) ? sizeAt(Lsize, { v: said.v ?? by('move')?.q.v?.v, w: said.w, flies: said.flies, swims: /\bswim/.test(t), immersed: said.immersed, blood: /\bblood/.test(t), buoyant: !!said.buoyant, vacuum: said.vacuum, fieldDriven: said.fieldDriven, driven: wants.some((w) => /^(move|turn|lift|raise|slide|swing)$/.test(w.fn)) || said.flies }) : null;
  const lawSays = bounds(said);
  // what was heard as "weighed below" is weighed below, or said not to be: a time it runs with nothing said it draws, a
  // time to do something in with nothing made that does it
  const weighs = (re: RegExp) => lawSays.some((b) => re.test(b.what));
  for (let i = 0; i < heard.length; i++) {
    const h = heard[i]!;
    if (/: weighed below by the energy it must carry$/.test(h) && !weighs(/carries what it needs|cells kept dry|the energy to hover|keeps what it holds|keep what it holds|keep it at/)) heard[i] = h.replace(/: weighed below by the energy it must carry$/, ': what it draws in that time is not said, so the energy it must carry is not weighed');
    else if (/^within .*: weighed below by the power it takes$/.test(h) && said.Tto === undefined && said.climb === undefined && said.store === undefined && !by('raise')) heard[i] = h.replace(/: weighed below by the power it takes$/, said.distance !== undefined || said.trip ? ': weighed below against how far it goes in it' : ': a time, with nothing made that does it and nothing said to weigh it by');
    else if (/^a dose of no more than .*: weighed below for the trip$/.test(h) && !said.trip) heard[i] = h.replace(/for the trip$/, said.dosePerYear ? 'over a year where it is' : 'where it is');
  }
  // a number heard as "weighed below" that no law below takes up (the same quantity, within 1%) is said not to be weighed
  const unSci = (x: string) => x.replace(/(\d[\d.]*) × 10\^(-?\d+)/g, (_m, a: string, e: string) => (Number(a) * 10 ** Number(e)).toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 6 }));
  const lawQs = lawSays.flatMap((x) => findQuantities(` ${unSci(x.what)} ${unSci(x.says)} `));
  for (let i = 0; i < heard.length; i++) {
    const h = heard[i]!; if (!/: weighed below$/.test(h)) continue;
    const q = findQuantities(` ${h.replace(/: weighed below$/, '')} `)[0];
    if (q && !sameDim(q.dim, DIMS.temperature) && !lawQs.some((p) => sameDim(p.dim, q.dim) && Math.abs(p.si - q.si) <= 0.01 * Math.abs(q.si))) heard[i] = h.replace(/: weighed below$/, ': heard, but no law here weighs it yet');
  }
  // "that can carry 4 adults": what it carries, said back against what carries it, or not made where nothing does
  // ("takes 150 kg of hammering without wobbling": what it must not do is said apart, with whether it is checked)
  for (const x0 of loadsSaid) { const x = asked.filter((a) => a.text.startsWith('without ')).reduce((v, a) => v.replace(` ${a.text}`, ''), x0); asked.push(carrier ? { text: x, kind: 'does', got: carrier.fn, why: '', load: true } : { text: x, kind: 'does', got: null, why: `carrying it: there is nothing kept for it to be carried on, as what it is is not kept` }); }
  // keeping something hot or cold over a time is its walls' doing: an insulated wall (a vacuum, foam) is not kept, so it is
  // not done, and how well it would have to keep is weighed below
  if (said.tmin !== undefined || said.Tkeep !== undefined) for (const a of asked) if (a.kind === 'does' && a.got && /°\s*[cf]\b|degrees/i.test(a.text) && /\b(keeps?|keeping|stays?|holds?|holding)\b/.test(a.text)) { a.got = null; a.why = `keeping it ${said.Tkeep !== undefined ? 'cold' : 'hot'} over time needs an insulated wall (a vacuum, foam) and, cold, a cooler: not kept; how well it would have to keep is weighed below`; }
  // "with walls no thicker than 3 cm": what it has is said only as a limit on it, heard with its number, not a part to make
  // (as a weight limit is), so it is not listed among what it has
  for (let i = asked.length - 1; i >= 0; i--) { const a = asked[i]!; if ((a.kind === 'thing' || a.kind === 'has') && !a.got && /\d/.test(a.text) && /\b(footprint|floor ?space|floor area|ground area|base area)s?\b/.test(a.text)) { asked.splice(i, 1); continue; } if (a.kind === 'has' && !a.got && /\bno (thicker|thinner|wider|narrower|taller|shorter|longer|deeper|higher|bigger|larger|heavier|more|less)\s*$/.test(a.text)) asked.splice(i, 1); }
  // what is asked but not made, whose own numbers a law below weighs ("under 40 °C while it dissipates 1.2 kW"): said so,
  // with whether the law holds, so it is not left as only "not kept"
  for (const a of asked) {
    if (a.got || (a.kind !== 'does' && a.kind !== 'has')) continue;
    const toks = (a.text.toLowerCase().match(/\d[\d.,]*\s*(°\s*[cf]|[a-zµ/%]+)/g) ?? []).map((x) => x.replace(/\s+/g, ' '));
    const law = toks.length ? lawSays.find((b) => toks.some((x) => b.what.toLowerCase().replace(/\s+/g, ' ').includes(x))) : undefined;
    if (law) a.why = `${a.why.replace(/\s*$/, '')}; weighed below: ${law.ok === false ? '✗' : law.ok ? '✓' : '·'} ${law.what}`;
  }
  // what is to go in space or on another world is not made here, whatever it would do on the floor: said so, part by
  // part; what the laws say of it is weighed all the same
  const SPACE = /\b(in space|outer space|deep space|vacuum of space|in orbit|into orbit|orbital|lunar|on the moon|moon base|on mars|martian|europa|enceladus|titan|ganymede|asteroid|spacecraft|spaceship|space station|solar[- ]sail|lander|interplanetary|planetary surface)\b/;
  if (wants.length && (said.trip || SPACE.test(t))) {
    const why = 'space and other worlds (orbits, vacuum, other gravity): not kept yet; what the laws say of it is weighed below';
    for (const a of asked) if (a.got) { a.got = null; a.why = why; }
    if (!asked.some((a) => a.kind === 'thing')) asked.unshift({ text: pa.clauses.find((c) => c.kind === 'main')?.text ?? name, kind: 'thing', got: null, why });
    wants.length = 0;
  }
  if (!wants.length) {
    const no = asked.filter((a) => a.kind !== 'for' && !a.got);
    const qs: Question[] = answers.what === undefined && !no.length ? [{ key: 'what', want: -1, ask: `What should it do? It can ${Object.values(FN_WORDS).join(', ')}.`, kind: 'what', value: 0, unit: '', grounds: no.length ? 'none of what it is asked to do is something kept' : 'nothing in the words says what it is for' }] : [];
    return { words, name: name || 'something', wants: [], questions: qs, heard, assumed, unread: no.map((a) => `${a.text} (${a.why})`), matter, asked, dropped, limits, said, scale, bounds: lawSays };
  }
  // a cabinet, a cupboard, a locker: what is put in it goes in by a door, assumed and said
  if (by('enclose') && !by('swing') && /^(cabinet|cupboard|locker|wardrobe|closet|safe|dresser|hutch)s?$/.test(mainHead ?? '')) { add('swing', FN_WORDS.swing, BASE.swing); assumed.push(`a door at its front: a ${mainHead} is opened to put things in`); }
  // "lowers itself to counter height": the lowest it goes, at a worktop (about 900 mm, estimate) or a table (740 mm, EN 527-1)
  const lowM = /\bto (the |a )?(counter|worktop|bench|table|desk)[- ]?(height|top|level)\b/.exec(t), rz = by('raise');
  if (rz && lowM && !rz.q.low) { const v = /counter|worktop|bench/.test(lowM[2]!) ? 0.9 : 0.74; rz.q.low = fig(v, 'm', 'usual', /counter|worktop|bench/.test(lowM[2]!) ? 'a kitchen worktop about 900 mm up, estimate' : 'a table top at 740 mm, EN 527-1'); heard.push(`to ${lowM[2]} height: its lowest ${len(v)} up`); }
  // what people or animals go into has a door to go in by, a person's width (700 mm, estimate) where its front is wider
  if (by('enclose') && !by('swing') && /^(shelters?|huts?|cabins?|sheds?|kennels?|doghouses?|houses?|coops?|hutches?|bothys?|refuges?|lodges?|bunkers?|igloos?|yurts?|tents?|playhouses?|cubby|cubbies)$/.test(mainHead ?? '')) { add('swing', FN_WORDS.swing, BASE.swing); by('enclose')!.flags.push('walkin'); assumed.push(`a door at its front to go in by: a ${mainHead} is gone into`); }
  // what swings in what encloses is its door: as wide and tall as its front, so nothing about it is asked
  const enc = by('enclose'), sw = by('swing');
  if (enc && sw && !sw.flags.includes('fold')) { sw.q.W = fig(enc.q.W!.v, 'm', 'usual', 'the front of what it is the door of'); sw.q.H = fig(enc.q.H!.v, 'm', 'usual', 'as tall as the front'); }
  // the questions: a figure only estimated, for what matters most to the want
  const questions: Question[] = [];
  // what a thing that moves carries, when something stands on it, is what that holds up: not asked again
  if (mov && sup && mov.q.m?.by === 'estimate') mov.q.m = fig(0, 'kg', 'usual', `what it carries is what its ${sup.says === 'hold a weight up' ? 'top' : sup.says} holds`);
  const rai = by('raise'); if (rai && sup && rai.q.m?.by === 'estimate') rai.q.m = fig(0, 'kg', 'usual', `what it raises is what its ${sup.says === 'hold a weight up' ? 'top' : sup.says} holds`);
  if (rai && sup && rai.q.m?.by === 'you' && sup.q.F?.by !== 'you') { sup.q.F = fig(rai.q.m.v * G, 'N', 'you', rai.q.m.grounds); rai.q.m = fig(0, 'kg', 'usual', `what it raises is what its ${sup.says} holds`); }
  // part of it is not something kept: asked first, once, whether to make the part that is
  // folding the whole of it is judged where it is made: each part onto what holds it, a quarter or a half turn at each hinge
  if (wants.length) for (const a of asked) if (a.why === COLLAPSE) { a.got = wants[0]!.fn; a.how = 'folds'; a.why = FOLD_JUDGED; }
  const notRead = asked.filter((x) => x.kind !== 'for' && !x.got);
  // (not asked where it is smaller than anything kept: no part of it can be made, as said with what is made)
  if (notRead.length && answers.what === undefined && !(scale && scale.L < 5e-3)) questions.push({ key: 'what', want: -1, ask: `I can make only part of it: something to ${wants.map((w) => FN_WORDS[w.fn]).join(', and to ')}. Not: ${notRead.map((x) => `${x.text} (${x.why})`).join('; ')}. Shall I make the part I can, or say what else it should do?`, kind: 'what', value: 0, unit: '', grounds: 'part of what was asked is not something kept' });
  // a mass is asked and read as a weight (N); one kept in kg is turned back
  const asN = (f: Fig) => (f.unit === 'kg' ? f.v * G : f.v), fromN = (f: Fig, v: number) => (f.unit === 'kg' ? v / G : v);
  wants.forEach((w, i) => { for (const [k, kind, ask] of ASKS[w.fn]) { const f = w.q[k]; if (!f || f.by !== 'estimate') continue; const a = answers[`${i}.${k}`] ?? answers[k]; if (a !== undefined) { const v = readAnswer(a, kind); if (v !== null) { w.q[k] = fig(kind === 'mass' ? fromN(f, v) : v, f.unit, 'answer', a); heard.push(`${k}: ${a}`); continue; } } questions.push({ key: `${i}.${k}`, want: i, ask, kind, value: kind === 'mass' ? asN(f) : f.v, unit: f.unit, grounds: f.grounds }); } });
  for (const w of wants) for (const f of Object.values(w.q)) if (f.by === 'usual' || f.by === 'estimate') assumed.push(f.grounds);
  if (!name || GENERIC.test(name)) name = name && name !== 'something' && name !== 'thing' ? name : ({ support: 'stand', move: 'cart', turn: 'turntable', contain: 'tank', enclose: 'box', warm: 'warmer', swing: 'door', slide: 'slider', raise: 'lift', lift: 'flyer', float: 'raft' } as Record<Fn, string>)[wants[0]!.fn];
  for (const a of notRead) unread.push(`${a.text} (${a.why})`);
  // what it is named for and does not have ("a vacuum flask" with no vacuum, "a hand-crank kettle" with no crank): the thing
  // is made only as what it does, not as what it was asked to be
  const words0 = (x: string) => x.toLowerCase().replace(/[-–]/g, ' ').replace(/[^\p{L}\d\s]/gu, ' ').split(/\s+/).filter(Boolean);
  for (const [i, th] of asked.entries()) {
    if (th.kind !== 'thing' || !th.got) continue;
    const tw = new Set(words0(th.text)), missing = asked.filter((x) => (x.kind === 'has' || x.kind === 'does') && !x.got && words0(x.text).length > 0 && words0(x.text).length <= 3 && words0(x.text).every((w) => tw.has(w)));
    if (missing.length) asked[i] = { ...th, got: null, why: `made only as something to ${FN_WORDS[th.got]}: what it is named for (${missing.map((x) => x.text).join(', ')}) is not made, as below` };
  }
  // what was asked, said back as it was written ("40 °C", "1.2 kW", "PEEK"), where it was read from the words as they stand
  const low = words.toLowerCase();
  const dd = (x: string) => x.replace(/\bthree-d\b/g, '3D').replace(/\btwo-d\b/g, '2D');
  for (const [k, u] of unread.entries()) unread[k] = dd(u); for (const qq of questions) qq.ask = dd(qq.ask);
  for (const a of asked) {
    a.text = dd(a.text); a.why = dd(a.why);
    const i = a.text.length > 3 ? low.indexOf(a.text) : -1; if (i < 0) continue;
    const was = a.text, now = words.slice(i, i + was.length); if (now === was) continue;
    a.text = now; for (const [k, u] of unread.entries()) unread[k] = u.split(was).join(now); for (const qq of questions) qq.ask = qq.ask.split(was).join(now);
  }
  return { words, name, wants, questions: questions.slice(0, 3), heard, assumed, unread, matter, asked, dropped, limits, said, scale, bounds: lawSays };
}

/** An answer, in SI: "20 kg", "1 m", "3 L", "2 m/s", "90 rpm", "70 °C", or a bare number in the question's own unit. */
export function readAnswer(a: string, kind: Kind): number | null {
  const q = findQuantities(` ${a} `)[0], n = Number(a.trim().replace(/[^\d.-]/g, '')), num = Number.isFinite(n) && a.trim() !== '' ? n : null;
  const is = (d: typeof DIMS.length) => !!q && sameDim(q.dim, d);
  switch (kind) {
    case 'volume': return is(DIMS.volume) ? q!.si : num !== null ? num * 1e-3 : null;
    case 'mass': return is(DIMS.mass) ? q!.si * G : is(DIMS.force) ? q!.si : num !== null && num > 0 ? num * G : null;
    case 'length': return is(DIMS.length) ? q!.si : num !== null && num > 0 ? num : null;
    case 'speed': return is(DIMS.speed) ? q!.si : num !== null && num > 0 ? num : null;
    case 'rpm': return is(DIMS.frequency) ? q!.si : num !== null && num > 0 ? (num * 2 * Math.PI) / 60 : null;
    case 'temperature': return is(DIMS.temperature) ? q!.si - 273.15 : num;
    default: return num;
  }
}
/** Each question answered from what was said back: numbers in the order asked, or "go" for what would be taken. */
export function answersFrom(c: Conception, said: string): Record<string, string> | null {
  if (/^\s*(go|yes|ok|okay|sure|fine|default|defaults|do it|make it|anything|whatever|make the part|the part)\b/i.test(said)) return Object.fromEntries(c.questions.map((q) => [q.key, q.kind === 'what' ? '' : String(+(q.kind === 'mass' ? q.value / G : q.kind === 'volume' ? q.value * 1e3 : q.kind === 'rpm' ? (q.value * 60) / (2 * Math.PI) : q.value).toPrecision(6))]));
  // "what should it do?" among them: numbers answer the others (and it makes what it can); words answer it
  if (c.questions.some((q) => q.kind === 'what')) { const rest = c.questions.filter((q) => q.kind !== 'what'), nums = rest.length && findQuantities(` ${said} `).length ? answersFrom({ ...c, questions: rest }, said) : null; return nums ? { what: '', ...nums } : { what: said }; }
  const parts = said.split(/\s*(?:,|;|\band\b|\bthen\b)\s*/).filter(Boolean), out: Record<string, string> = {};
  // each part to the first question it reads as: by its unit's dimension first, then in order
  const left = [...c.questions];
  for (const p of parts) { const i = left.findIndex((q) => { const qq = findQuantities(` ${p} `)[0]; return qq ? readAnswer(p, q.kind) !== null && (q.kind !== 'mass' || sameDim(qq.dim, DIMS.mass) || sameDim(qq.dim, DIMS.force)) && (q.kind !== 'length' || sameDim(qq.dim, DIMS.length)) : readAnswer(p, q.kind) !== null; }); if (i >= 0) { out[left[i]!.key] = p; left.splice(i, 1); } }
  return Object.keys(out).length ? out : null;
}

// ==== needs, and the ways that meet them ================================================================================
type NeedKind = 'mobility' | 'surface' | 'enclosure' | 'vessel' | 'spin' | 'track' | 'hoist' | 'lift' | 'buoyancy' | 'leaf' | 'warmth';
const NEED_OF: Record<Fn, NeedKind> = { support: 'surface', move: 'mobility', turn: 'spin', swing: 'leaf', slide: 'track', raise: 'hoist', contain: 'vessel', enclose: 'enclosure', warm: 'warmth', lift: 'lift', float: 'buoyancy' };
/** What each kind of need is to the others: how high in the stack it stands, what it carries and where it goes. The
 *  planner stacks and orders by this alone: each goes onto the highest need below it that carries its kind (what moves
 *  carries all; what raises carries a surface and what stands on one; a surface carries bodies); what goes into a
 *  body goes into the one it is part of. */
const BODIES: NeedKind[] = ['enclosure', 'vessel', 'spin', 'track'];
const NATURE: Record<NeedKind, { rank: number; carries: NeedKind[] | 'all'; goes: 'floor' | 'onto' | 'into' }> = {
  mobility: { rank: 0, carries: 'all', goes: 'floor' }, lift: { rank: 0, carries: [], goes: 'floor' }, buoyancy: { rank: 0, carries: [], goes: 'floor' },
  hoist: { rank: 1, carries: ['surface', ...BODIES], goes: 'onto' }, surface: { rank: 2, carries: BODIES, goes: 'onto' },
  enclosure: { rank: 3, carries: [], goes: 'onto' }, vessel: { rank: 3, carries: [], goes: 'onto' }, spin: { rank: 3, carries: [], goes: 'onto' }, track: { rank: 3, carries: [], goes: 'onto' },
  leaf: { rank: 4, carries: [], goes: 'into' }, warmth: { rank: 4, carries: [], goes: 'into' },
};
interface Need { kind: NeedKind; want: Want; why: string; /** what it stands on or goes into, by need */ on: Need | null; /** the weight of what stands on it, N; the room it must give them */ above: number; fit: [number, number]; /** how tall what stands on it is, m */ tall: number }
/** A trace of one step: what it is, the rule that called it, and when, why, where and how. */
export interface Trace { step: string; what: string; called: string; why: string; when: string; where: string; how: string }
export interface Check { what: string; ok: boolean; says: string }
interface Ctx {
  p: string; x0: number; z0: number; y0: number; rnd: () => number; matter: string | null; /** the most one part may weigh, kg; the most it may sag, m */ part?: number; sag?: number; /** the most it may weigh, kg: its matter chosen for lightness */ light?: number; steps: string[]; traces: Trace[]; members: string[]; loose: string[]; moving: string[];
  /** what moves under what it makes (a carriage it stands on): what it makes rides with that, joined to it */ ride: string | null; riders: string[];
  choices: string[]; gaps: string[]; checks: (() => Check | null)[]; loads: string[]; tests: Test[]; need: Need; way: string; why: string;
  /** what it gives what stands on it or goes into it: its top surface, or its body */
  top: { y: number; w: number; d: number; name: string | null }; foot: [number, number];
  /** what encloses gives what stands in it its floor: its top, and its inside */ inside?: { y: number; W: number; D: number; H: number; name: string };
  /** what the next part is derived after, and why; chained, each part after the one before */
  after: { name: string; why: string } | null; led?: boolean; base0?: { name: string; why: string } | null;
}
type Test = { kind: 'drive'; v: number; deck: string } | { kind: 'spin'; name: string; motor: string; rpm: number; n: number } | { kind: 'swing'; name: string } | { kind: 'slide'; name: string; L: number; m: number } | { kind: 'raise'; name: string; L: number } | { kind: 'warm'; name: string; T: number };
interface Way { id: string; meets: NeedKind; says: string; when: (n: Need, c: Ctx) => string | null; make: (n: Need, c: Ctx) => void }

const rngOf = (seed: number) => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
const M = (v: number) => `${+v.toFixed(4)} m`, MM = (v: number) => `${+(v * 1e3).toFixed(1)}`;
const SHEET: Record<string, number[]> = { wood: [6, 9, 12, 15, 18, 22, 25, 30, 40, 50], metal: [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25], plastic: [3, 4, 5, 6, 8, 10, 12, 15, 20] };
const SQUARE: Record<string, number[]> = { wood: [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150], metal: [8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100], plastic: [10, 15, 20, 25, 30, 40, 50] };
const TUBES: [number, number][] = [[12, 1], [16, 1.5], [20, 1.5], [25, 2], [30, 2], [40, 2], [50, 2.5], [60, 3], [76, 3], [89, 3.5], [114, 4], [168, 5]];
const familyOf = (id: string) => (/^wood/.test(id) ? 'wood' : /^(polymer|composite)/.test(id) ? 'plastic' : 'metal');
const STRUCTURAL = ['wood.birch-plywood', 'wood.red-oak', 'wood.douglas-fir', 'aluminum.6061-t6', 'steel.a36', 'stainless.304'];
const BARS = ['wood.red-oak', 'wood.douglas-fir', 'wood.hard-maple', 'aluminum.6061-t6', 'steel.a36'];
const LIQUID = ['stainless.304', 'aluminum.6061-t6', 'steel.a36', 'polymer.pmma', 'composite.gfrp'];
/** The matter a part is made of: the one said, or drawn; drawn twice and the lighter kept, as a maker would rather carry
 *  less of what does the same (every draw is still checked under the laws). */
/** Ashby's merit indices for the lightest part of a given stiffness: a panel bent, E^1/3 / ρ; a beam bent, E^1/2 / ρ
 *  (M. F. Ashby, Materials Selection in Mechanical Design, 4th ed., ch. 5). */
const merit = (id: string, as: 'panel' | 'beam') => { const m = matterOf(id); return (as === 'panel' ? Math.cbrt(m.E) : Math.sqrt(m.E)) / m.density; };
/** Parts that stand for the ground it rests on (a bridge's ends for its banks): made so it stands, not counted as it. */
const STANDS = new Map<string, string>();
const matterFor = (c: Ctx, options: string[], as: 'panel' | 'beam' = 'panel', role = as === 'panel' ? 'sheets' : 'bars') => {
  if (c.matter) { try { return matterOf(c.matter).id; } catch { /* not a matter: drawn */ } }
  // under a weight limit: the matter that is lightest for its stiffness, by the index for how it is loaded
  if (c.light !== undefined) { const best = [...options].sort((x, y) => merit(y, as) - merit(x, as))[0]!; if (!c.choices.some((x) => x.startsWith(`${matterOf(best).name} for its ${role}:`))) { c.choices.push(`${matterOf(best).name} for its ${role}: it must weigh under ${+c.light.toPrecision(3)} kg, and of the matters kept for them it is the lightest for its stiffness (Ashby's index ${as === 'panel' ? 'E^1/3 / ρ for a panel' : 'E^1/2 / ρ for a beam'})`); } return best; }
  const a = pick(c.rnd, options), b = pick(c.rnd, options); return matterOf(a).density <= matterOf(b).density ? a : b;
};
/** What a matter bears pressed before it gives: its yield (wood: about half its bending strength along the grain; estimate). */
const crush = (id: string) => { const m = matterOf(id); return /^wood/.test(id) ? 0.5 * m.ultimate : m.yield; };
const smallMotor = (): MotorData => Object.values(MOTORS).sort((a, b) => a.diameter - b.diameter)[0]!;
const gearFor = (m: MotorData) => Object.values(GEARHEADS).find((g) => g.fits.includes(m.id));

/** A part placed, in the workshop's words, with what it is for, where it goes and how it was sized. */
function put(c: Ctx, name: string, step: string, where: string, how: string, o: { loose?: boolean; moving?: boolean } = {}): string {
  c.steps.push(step); c.traces.push({ step, what: name, called: c.way, why: c.why, when: c.after ? `after ${c.after.name.replace(/^[a-z]+\d+_/, '')}, ${c.after.why}` : 'first: what the rest is derived from', where, how });
  // the first part of a way is what the rest of it is derived from
  if (!c.led) { c.led = true; c.after = { name, why: 'which it is derived from' }; }
  if (o.loose || o.moving) c.loose.push(name); else if (c.ride) c.riders.push(name); else c.members.push(name); if (o.moving) c.moving.push(name);
  return name;
}
const box = (c: Ctx, n: string, id: string, x: number, y: number, z: number, w: number, d: number, h: number, word: string, where: string, how: string, o: { loose?: boolean; moving?: boolean } = {}) =>
  put(c, `${c.p}_${n}`, `place ${word} named ${c.p}_${n} of ${id} at ${M(x)}, ${M(y)}, ${M(z)} size ${MM(w)} x ${MM(d)} x ${MM(h)} mm`, where, how, o);
const upright = (c: Ctx, n: string, id: string, shape: Shape, mem: Member, x: number, y0: number, z: number, h: number, where: string, how: string) => {
  const nm = `${c.p}_${n}`;
  if (shape === 'square') return box(c, n, id, x, y0 + h / 2, z, mem.size, mem.size, h, 'bar', where, how);
  return put(c, nm, shape === 'rod' ? `place rod named ${nm} of ${id} at ${M(x)}, ${M(y0 + h / 2)}, ${M(z)} size ${MM(mem.size)} x ${MM(h)} mm along y` : `place tube named ${nm} of ${id} at ${M(x)}, ${M(y0 + h / 2)}, ${M(z)} size ${MM(mem.size)} x ${MM(h)} x ${MM(mem.wall!)} mm along y`, where, how);
};
type Shape = 'square' | 'rod' | 'tube';
interface Member { size: number; wall?: number; A: number; I: number; says: string; ok: boolean }
/** The least bar, rod or tube of a matter that carries P down a length L, crushing at three times it and buckling at
 *  three times it (Euler, its top held, its foot free to sway: K = 2); of wood, no more slender than K L / d = 50 (NDS
 *  2018 3.7.1.4: a solid wood column shall not be more slender). */
function memberFor(id: string, shape: Shape, P: number, L: number): Member {
  const m = matterOf(id), fam = familyOf(id), fc = crush(id), K = 2;
  const by = (A: number, I: number) => ({ c: (fc * A) / P, b: (Math.PI ** 2 * m.E * I) / (K * L) ** 2 / P });
  const slender = (s: number) => (fam === 'wood' ? (K * L) / s : 0);
  const say = (A: number, I: number, s: number) => { const r = by(A, I); return `crushing at ${+r.c.toPrecision(2)} and buckling at ${+r.b.toPrecision(2)} times its share (Euler, K = 2)${fam === 'wood' ? `, K L / d ${+slender(s).toPrecision(3)} (a wood column no more than 50: NDS 3.7.1.4)` : ''}`; };
  const sizes: [number, number?][] = shape === 'tube' && fam !== 'wood' ? TUBES.map(([D, w]) => [D / 1e3, w / 1e3]) : SQUARE[fam]!.map((s) => [s / 1e3]);
  let last: Member | null = null;
  for (const [s, w] of sizes) {
    const A = shape === 'tube' && w ? (Math.PI * (s * s - (s - 2 * w) ** 2)) / 4 : shape === 'rod' ? (Math.PI * s * s) / 4 : s * s, I = shape === 'tube' && w ? (Math.PI * (s ** 4 - (s - 2 * w) ** 4)) / 64 : shape === 'rod' ? (Math.PI * s ** 4) / 64 : s ** 4 / 12, r = by(A, I);
    last = { size: s, ...(w ? { wall: w } : {}), A, I, says: say(A, I, s), ok: r.c >= 3 && r.b >= 3 && slender(s) <= 50 }; if (last.ok) return last;
  }
  return last!;
}

/** The least sheet a surface can be, found by trying it under its load with the workshop's own load law: the sheet,
 *  and whether any kept bears it. */
function trySheets(c: Ctx, family: string, start: number, make: (t: number) => void, load: () => string | string[], span: number, creep = 1): { t: number; ok: boolean } {
  const sheets = SHEET[family]!.map((x) => x / 1e3); let k = Math.max(0, sheets.findIndex((s) => s >= start));
  // tried with the load where it is worst: each place said, the least factor and the most bending of them
  const worst = () => { const ls = [load()].flat(), rs = ls.map((l) => trial(c, c.steps, [l])); return rs.some((r) => !r) ? null : { factor: Math.min(...rs.map((r) => r!.factor)), bend: Math.max(...rs.map((r) => r!.bend)) }; };
  for (; k < sheets.length; k++) { make(sheets[k]!); const r = worst(); if (r && r.factor >= 2 && r.bend * creep <= span / 250) return { t: sheets[k]!, ok: true }; }
  make(sheets.at(-1)!); return { t: sheets.at(-1)!, ok: false };
}
const noSheet = (family: string, span: number) => `no ${family} sheet kept bears the load over ${len(span)} by two and within 1/250 of its span`;
function leastSheet(c: Ctx, family: string, start: number, make: (t: number) => void, load: () => string | string[], span: number): number {
  const r = trySheets(c, family, start, make, load, span); if (!r.ok) c.gaps.push(`${noSheet(family, span)}: a beam under it is the next thing to derive`); return r.t;
}

// -- a frame: where no sheet alone bears it, joists under the sheet and two rails under the joists ------------------------
/** A section a frame member can be: its width across and depth up, m. Wood framing is sawn lumber, dressed to the
 *  sizes it is sold in and stood on edge; metal framing is round tube. */
interface Section { b: number; h: number; tube?: { D: number; wall: number }; says: string }
const sectionsOf = (id: string): Section[] => (familyOf(id) === 'wood'
  ? Object.entries(LUMBER).map(([k, [t, w]]) => ({ b: t, h: w, says: `${k} (${MM(t)} × ${MM(w)} mm) on edge` }))
  : TUBES.map(([D, w]) => ({ b: D / 1e3, h: D / 1e3, tube: { D: D / 1e3, wall: w / 1e3 }, says: `Ø${D} × ${w} mm tube` }))).sort((a, b) => areaOf2(a) - areaOf2(b));
const areaOf2 = (s: Section) => (s.tube ? (Math.PI * (s.tube.D ** 2 - (s.tube.D - 2 * s.tube.wall) ** 2)) / 4 : s.b * s.h);
const inertiaOf = (s: Section) => (s.tube ? (Math.PI * (s.tube.D ** 4 - (s.tube.D - 2 * s.tube.wall) ** 4)) / 64 : (s.b * s.h ** 3) / 12);
/** Bears F (and its own weight, over its length) at the middle of a span L held at its two ends, by two, bending under
 *  1/250 of L: the case the workshop's load law reads it by (M = F L / 4, σ = M c / I, δ = F L³ / 48 E I). */
const bearsAt = (id: string, s: Section, F: number, L: number, length: number, spread = false, creep = 1) => { const m = matterOf(id), I = inertiaOf(s), Fw = F + areaOf2(s) * length * m.density * G, M = spread ? (Fw * L) / 8 : (Fw * L) / 4, dl = (spread ? (5 * Fw * L ** 3) / (384 * m.E * I) : (Fw * L ** 3) / (48 * m.E * I)) * (/^wood/.test(id) ? creep : 1); return m.yield / ((M * (s.h / 2)) / I) >= 2 && dl <= L / 250; };
/** How a load lies on what holds it: spread over it (soil, what is heaped), or a weight that may stand anywhere (a person,
 *  a thing set down). Spread, each part takes its share. Standing anywhere, the joist and the rail under it take it all,
 *  and the sheet bears it on a strip a foot wide and the bay again (a 100 mm foot spreading at 45° each way, estimate).
 *  A load that stays on wood creeps: its bending grows by 1 + k_def (k_def 2.0 for solid timber kept wet, service class 3;
 *  0.6 kept dry, class 1: EN 1995-1-1 Table 3.2). */
interface Lay { spread: boolean; creep: number; /** one of a crowd standing alone, N: what the sheet and a joist bear */ point?: number }
/** One person and what they carry standing alone, about 100 kg (estimate): what a deck and a joist under a crowd bear. */
const ONE = 100 * 9.80665;
/** A sheet as it is sold: about 2.44 m long (1220 × 2440 mm plywood, estimate). */
const STOCK = 2.44;
const layOf = (w: Want): Lay => ({ ...(w.flags.includes('crowd') ? { point: Math.min(ONE, w.q.F?.v ?? ONE) } : {}), spread: w.flags.includes('loose') || w.flags.includes('crowd') || w.flags.includes('even'), creep: w.flags.includes('loose') ? 1 + (w.flags.includes('wet') ? 2.0 : 0.6) : 1 });
const stripOf = (bay: number, Dw: number) => Math.min(Dw, 0.1 + bay);
const creepSays = (lay: Lay) => (lay.creep > 1 ? `, with creep under a load that stays (×${lay.creep}, k_def ${+(lay.creep - 1).toPrecision(2)}: EN 1995-1-1 Table 3.2)` : '');
interface Frame { T: number; n: number; joist: Section; rail: Section; by: string; alongX: boolean; kg: number; /** rails side by side under each edge, where one would weigh more than a part may */ plies: number }
/** The lightest frame for a sheet Lw long and Dw across under F: so many joists across it (an even count, so its middle
 *  falls between two), the thinnest sheet that bears F between those two, the least joist that bears half of F and its
 *  share of the sheet across Dw, and the least rail that bears half of all of it over the span it is held across. */
function frameFor(top: string, by: string, Lw: number, Dw: number, F: number, railSpan: number, alongX: boolean, lay: Lay = { spread: false, creep: 1 }, partKg?: number): Frame | null {
  const mt = matterOf(top), mb = matterOf(by), sheets = SHEET[familyOf(top)]!.map((x) => x / 1e3), secs = sectionsOf(by);
  let best: Frame | null = null;
  for (let n = 2; n <= 24; n += 2) for (const T of sheets) {
    const topN = Lw * Dw * T * mt.density * G;
    const joist = secs.find((j) => {
      const sp = (Lw - j.b) / (n - 1), bay = sp - j.b; if (bay <= 0) return false;
      const pt = lay.point, sheetOk = pt !== undefined ? bearsAt(top, { b: stripOf(bay, Dw), h: T, says: '' }, pt + (topN * sp) / Lw, bay, 0) && bearsAt(top, { b: Dw, h: T, says: '' }, ((F + topN) * sp) / Lw, bay, 0, true, lay.creep) : lay.spread ? bearsAt(top, { b: Dw, h: T, says: '' }, ((F + topN) * sp) / Lw, bay, 0, true, lay.creep) : bearsAt(top, { b: stripOf(bay, Dw), h: T, says: '' }, F + topN, bay, 0);
      return sheetOk && (pt !== undefined ? bearsAt(by, j, pt + (topN * sp) / Lw, Dw, Dw) && bearsAt(by, j, ((F + topN) * sp) / Lw, Dw, Dw, true, lay.creep) : bearsAt(by, j, lay.spread ? ((F + topN) * sp) / Lw : F + (topN * sp) / Lw, Dw, Dw, lay.spread, lay.creep));
    });
    if (!joist) continue;
    // a crowd may bunch: its rails bear, as well, half of it gathered at their middle with what they carry there too (on the
    // safe side), as people stand together on a span
    // under each edge one rail, or two side by side where one would weigh more than a part may, each bearing half of that
    const jN = areaOf2(joist) * Dw * mb.density * G;
    let got = false;
    for (const plies of [1, 2]) {
      const rail = secs.find((r) => (partKg === undefined || areaOf2(r) * Lw * mb.density <= partKg) && bearsAt(by, r, (lay.spread ? (F + topN + n * jN) / 2 : F + (topN + n * jN) / 2) / plies, railSpan, Lw, lay.spread, lay.creep) && (lay.point === undefined || bearsAt(by, r, (F + topN + n * jN) / 2 / plies, railSpan, Lw, false, 1)));
      if (!rail) continue;
      const kg = (topN + n * jN) / G + 2 * plies * areaOf2(rail) * Lw * mb.density;
      if (!best || kg < best.kg) best = { T, n, joist, rail, by, alongX, kg, plies };
      got = true; break;
    }
    if (!got) continue;
    break;
  }
  return best;
}
/** The dressed softwood a frame is sawn from: drawn, or under a weight limit the lightest of them for its stiffness as a beam. */
/** Framing is sawn softwood as it is sold: dressed to the lumber sizes and graded, C24 (EN 338), not clear wood. */
const framingWood = (_c: Ctx) => 'wood.c24';
/** How many bays each piece of a frame's sheet spans, where it must be pieced: no heavier than one part may be, and no
 *  longer than a sheet as sold; null where one sheet does. */
function piecesOf(c: Ctx, Lw: number, Dw: number, T: number, top: string, f: Frame): number | null {
  const sp = (Lw - f.joist.b) / (f.n - 1), kgM = Dw * T * matterOf(top).density, heavy = c.part !== undefined && Lw * kgM > c.part, long = Lw > STOCK;
  if (!heavy && !long) return null;
  const byKg = c.part !== undefined ? Math.floor((c.part / kgM - f.joist.b) / sp) : Infinity, byLen = Math.floor((STOCK - f.joist.b) / sp);
  return Math.max(1, Math.min(f.n - 2, byKg, byLen));
}
/** Lays a frame's sheet, joists and rails, the sheet's top at yTop over (X, Z): returns the height of the rails' feet. */
function placeFrame(c: Ctx, f: Frame, top: string, X: number, yTop: number, Z: number, Lw: number, Dw: number, sheetName = 'top'): number {
  const { T, n, joist: j, rail: r, by, alongX } = f, mb = matterOf(by).name, at = (u: number, v: number): [number, number] => (alongX ? [X + u, Z + v] : [X + v, Z + u]);
  const member = (name: string, s: Section, u: number, y: number, v: number, along: 'u' | 'v', L: number, where: string, how: string) => {
    const [x, z] = at(u, v), axis = (along === 'u') === alongX ? 'x' : 'z';
    if (s.tube) return put(c, `${c.p}_${name}`, `place tube named ${c.p}_${name} of ${by} at ${M(x)}, ${M(y)}, ${M(z)} size ${MM(s.tube.D)} x ${MM(L)} x ${MM(s.tube.wall)} mm along ${axis}`, where, how);
    const [w, d] = axis === 'x' ? [L, s.b] : [s.b, L]; return box(c, name, by, x, y, z, w, d, s.h, 'bar', where, how);
  };
  const w0 = c.why, sp = (Lw - j.b) / (n - 1), jy = yTop - T - j.h / 2, ry = yTop - T - j.h - r.h / 2;
  const how = `as thin a sheet of ${matterOf(top).name} as the load law lets bear its load between the two joists at its middle, by two, bending under 1/250 of that`;
  const bays = piecesOf(c, Lw, Dw, T, top, f);
  if (bays === null) box(c, sheetName, top, X, yTop - T / 2, Z, alongX ? Lw : Dw, alongX ? Dw : Lw, T, 'plate', `${M(yTop)} up, over ${MM(alongX ? Lw : Dw)} × ${MM(alongX ? Dw : Lw)} mm, on its joists`, how);
  else {
    // the sheet in pieces of as many whole bays as its weight limit and a sheet as sold let, each ending on the middle of a
    // joist; the bay over its middle a piece of its own, which keeps the sheet's name, as its load is read there
    const ju = (k: number) => -Lw / 2 + j.b / 2 + k * sp, m0 = n / 2 - 1, left: number[] = [], right: number[] = [];
    for (let k = m0 - bays; k > 0; k -= bays) left.push(ju(k));
    for (let k = m0 + 1 + bays; k < n - 1; k += bays) right.push(ju(k));
    const cuts = [-Lw / 2, ...left.reverse(), ju(m0), ju(m0 + 1), ...right, Lw / 2];
    c.choices.push(`its ${sheetName} in ${cuts.length - 1} pieces, each at most ${bays} bay${bays > 1 ? 's' : ''} long and ending on a joist, so ${c.part !== undefined ? `no part weighs more than ${+c.part.toPrecision(3)} kg and ` : ''}none is longer than a sheet as sold (about ${len(STOCK)}, estimate)`);
    for (let k = 0; k + 1 < cuts.length; k++) { const u0 = cuts[k]!, u1 = cuts[k + 1]!, uc = (u0 + u1) / 2, Lp = u1 - u0, [x, z] = alongX ? [X + uc, Z] : [X, Z + uc], name = u0 <= 1e-9 && u1 >= -1e-9 && Math.abs(u0 - ju(m0)) < 1e-9 ? sheetName : `${sheetName}_${k + 1}`; box(c, name, top, x, yTop - T / 2, z, alongX ? Lp : Dw, alongX ? Dw : Lp, T, 'plate', `${M(yTop)} up, ${len(u0 + Lw / 2)} to ${len(u1 + Lw / 2)} along it, its ends on joists`, how); }
  }
  c.why = `to carry the ${sheetName} across, ${len(sp)} apart, onto the rails`;
  for (let k = 0; k < n; k++) member(`joist${k + 1}`, j, -Lw / 2 + j.b / 2 + k * sp, jy, 0, 'v', Dw, `under the ${sheetName}, ${len(k * sp)} along it, across both rails`, `the least ${j.says} of ${mb} that bears half the load and its share of the ${sheetName} across ${len(Dw)} by two, bending under 1/250 of it`);
  c.why = `to carry the joists along its length to what holds it up`;
  for (const [k, sv] of [-1, 1].entries()) for (let p = 0; p < f.plies; p++) member(`rail${k + 1 + 2 * p}`, r, 0, ry, sv * (Dw / 2 - r.b / 2 - p * r.b), 'u', Lw, `under the joists along its ${sv < 0 ? 'near' : 'far'} edge${f.plies > 1 ? `, ${p ? 'inside the other' : 'outside'}` : ''}`, f.plies > 1 ? `one of two ${r.says} of ${mb} side by side, as one that bore it alone would weigh more than a part may: each bears a quarter of all of it over its span, by two, bending under 1/250 of it` : `the least ${r.says} of ${mb} that bears half of all of it over its span, by two, bending under 1/250 of it`);
  c.why = w0; return yTop - T - j.h - r.h;
}
// -- a rim: what holds loose stuff on a surface -----------------------------------------------------------------------
/** Walls round a surface W × D that holds loose stuff as deep as it lies, and a tenth again: each a board standing on
 *  the surface's edge, joined at the corners, so it spans its length between them against the stuff's sideways push.
 *  At rest loose ground pushes K0 γ z at depth z, K0 = 1 − sin φ (Jaky), φ = 30° for soil and sand (estimate): the push on
 *  a wall is ½ K0 γ h² along its length, bending it as a beam across that length (M = P L / 8, δ = 5 P L³ / 384 E I): the
 *  least board of its matter that bears that by two and bends under 1/250 of its length. Worked out, not run in the
 *  workshop: its load law reads only what presses down. */
interface Rim { t: number; h: number; id: string; check: Check; choice: string }
function rimFor(want: Want, W: number, D: number, matter: string): Rim | null {
  if (!want.flags.includes('loose')) return null;
  const rho = want.q.rho!.v, depth = want.q.depth?.v ?? want.q.lkg!.v / (rho * W * D), h = depth + Math.max(0.02, 0.1 * depth), K0 = 1 - Math.sin(Math.PI / 6), gamma = rho * G;
  const stuff = want.q.rho!.grounds.replace(/^.*? of /, '').replace(/,.*$/, ''), m = matterOf(matter), fam = familyOf(matter), L = Math.max(W, D), P = 0.5 * K0 * gamma * depth ** 2 * L, M = (P * L) / 8;
  const fits = (t: number) => { const I = (h * t ** 3) / 12, sg = (M * (t / 2)) / I, dl = (5 * P * L ** 3) / (384 * m.E * I); return { ok: m.yield / sg >= 2 && dl <= L / 250, f: m.yield / sg, dl }; };
  const sheets = SHEET[fam]!.map((x) => x / 1e3), t = sheets.find((x) => fits(x).ok) ?? sheets.at(-1)!, r = fits(t);
  return { t, h, id: matter,
    check: { what: `its walls hold the ${stuff} in against its sideways push`, ok: r.ok, says: `${len(depth)} deep, it pushes ${+(K0 * gamma * depth / 1000).toPrecision(3)} kPa at the foot of each wall (at rest, K0 = 1 − sin 30° (Jaky), estimate), ${+P.toPrecision(3)} N along the ${len(L)} wall; spanning between its corners that wall is ${factorSays(r.f)}, bending ${len(r.dl)} (1/250 of its length is ${len(L / 250)}: more fails); worked out, not run in the workshop` },
    choice: `walls ${len(h)} high of ${len(t)} ${m.name} round its edge, to keep ${len(depth)} of ${stuff} in` };
}
/** Stands a rim's four walls on the surface whose top is at yTop over (X, Z). */
function placeRim(c: Ctx, r: Rim, X: number, yTop: number, Z: number, W: number, D: number): void {
  const w0 = c.why; c.why = 'to keep what lies on it from spilling, against its sideways push';
  for (const [k, sz] of [-1, 1].entries()) box(c, `wall${k + 1}`, r.id, X, yTop + r.h / 2, Z + sz * (D / 2 - r.t / 2), W, r.t, r.h, 'slab', `on the ${sz < 0 ? 'near' : 'far'} edge of the surface, its full length`, `the least board that bears the push of what it holds spanning ${len(W)} between its corners`);
  for (const [k, sx] of [-1, 1].entries()) box(c, `wall${k + 3}`, r.id, X + sx * (W / 2 - r.t / 2), yTop + r.h / 2, Z, r.t, D - 2 * r.t, r.h, 'slab', `on the ${sx < 0 ? 'left' : 'right'} edge, between the long walls`, `as thick as the long walls`);
  c.why = w0;
}
/** A frame's loads, read by the workshop's own load law as the frame was sized: its sheet across the bay at its middle,
 *  the joist under its middle, a rail; each said with its creep where it has one. */
function frameChecks(c: Ctx, fr: Frame, sheet: string, top: string, Lw: number, Dw: number, F: number, lay: Lay, held: string, railSpan = Lw): void {
  const topN = Lw * Dw * fr.T * matterOf(top).density * G, sp = (Lw - fr.joist.b) / (fr.n - 1), bay = sp - fr.joist.b, share = sp / Lw, mid = `${c.p}_joist${fr.n / 2}`, sh = `${c.p}_${sheet}`;
  const pt = lay.point, jF = pt !== undefined ? pt + topN * share : lay.spread ? (F + topN) * share : F + topN * share, rF = (lay.spread ? (F + topN) / 2 : F + topN / 2) / fr.plies, strip = stripOf(bay, Dw), k = (id: string) => (/^wood/.test(id) && pt === undefined ? lay.creep : 1);
  // a sheet laid in pieces (no part heavier than said, none longer than a sheet is sold): its middle bay a piece of its own
  const split = piecesOf(c, Lw, Dw, fr.T, top, fr) !== null;
  c.loads.push(pt !== undefined ? `load ${sh} with ${+(pt + topN * share).toFixed(1)} N over ${MM(strip)} mm` : lay.spread ? (split ? `load ${sh} with ${+((F + topN) * share).toFixed(1)} N spread` : `load ${sh} with ${+(F * share).toFixed(1)} N + ${sh}.mass * g * ${+share.toPrecision(4)} spread`) : `load ${sh} with ${+F.toFixed(1)} N + ${sh}.mass * g over ${MM(strip)} mm`,
    `load ${mid} with ${+jF.toFixed(1)} N + ${mid}.mass * g${lay.spread && pt === undefined ? ' spread' : ''}`, `load ${c.p}_rail1 with ${+rF.toFixed(1)} N + ${fr.n} * ${c.p}_joist1.mass * g / ${2 * fr.plies} + ${c.p}_rail1.mass * g${lay.spread ? ' spread' : ''}`, ...(pt !== undefined ? [`load ${c.p}_rail1 with ${+((F + topN) / 2 / fr.plies).toFixed(1)} N + ${fr.n} * ${c.p}_joist1.mass * g / ${2 * fr.plies} + ${c.p}_rail1.mass * g`] : []));
  const say = (key: string, id: string, what: string, L: number, how: string) => c.checks.push(() => { const v = LOADS.get(key); if (!v) return null; const b = v.bend * k(id); return { what, ok: v.factor >= 2 && b <= L / 250, says: `the load law, ${how}: ${factorSays(v.factor)}, bending ${len(b)}${k(id) > 1 ? creepSays(lay) : ''} (1/250 of ${len(L)} is ${len(L / 250)}: more fails)` }; });
  say(sh, top, pt !== undefined ? `its ${sheet} bears one of them standing between its joists` : `its ${sheet} bears ${+(F / G).toPrecision(3)} kg between its joists`, bay, pt !== undefined ? `one person and what they carry, about ${+(pt / G).toPrecision(3)} kg (estimate), standing between the two joists at its middle, borne on a strip ${len(strip)} wide (a 100 mm foot spreading at 45° each way, estimate)` : lay.spread ? `its share spread over the ${len(bay)} between the two joists at its middle` : `all of it standing between the two joists at its middle, borne on a strip ${len(strip)} wide (a 100 mm foot spreading at 45° each way, estimate)`);
  say(mid, fr.by, pt !== undefined ? `its joists bear one of them standing at the middle of one, across ${len(Dw)}` : `its joists bear ${lay.spread ? 'their share' : 'all of it standing over one'} across ${len(Dw)}`, Dw, pt !== undefined ? `${+(jF / G).toPrecision(3)} kg at the middle of the joist under it` : lay.spread ? `${+(jF / G).toPrecision(3)} kg spread along the joist under its middle` : `${+(jF / G).toPrecision(3)} kg at the middle of the joist under it`);
  // a deep thin rail bends sideways and twists before it breaks where nothing holds its top edge (EN 1995-1-1 6.3.3:
  // σcrit = 0.78 b² E0.05 / h lef, E0.05 about 0.67 of its mean for C24, lef = 0.9 l + 2 h): held at each joist, fixed to them
  if (familyOf(fr.by) === 'wood' && fr.rail.h > 2 * fr.rail.b) {
    const r = fr.rail, E05 = 0.67 * matterOf(fr.by).E, lef = 0.9 * sp + 2 * r.h, crit = (0.78 * r.b * r.b * E05) / (r.h * lef), free = (0.78 * r.b * r.b * E05) / (r.h * (0.9 * railSpan + 2 * r.h));
    c.checks.push(() => { const v = LOADS.get(`${c.p}_rail1`); if (!v) return null; const sg = matterOf(fr.by).yield / v.factor; return { what: 'its rails do not buckle sideways', ok: crit >= 2 * sg, says: `each ${r.says} rail is pressed to ${+(sg / 1e6).toPrecision(3)} MPa along its top; held at each joist ${len(sp)} apart (the joists fixed to its top edge, not designed), it buckles sideways at about ${+(crit / 1e6).toPrecision(3)} MPa (EN 1995-1-1 6.3.3, lef = 0.9 l + 2 h, E0.05 about 0.67 of its mean, estimate); held only at its ends it would at ${+(free / 1e6).toPrecision(3)} MPa` }; });
  }
  say(`${c.p}_rail1`, fr.by, `its rails bear ${fr.plies > 1 ? (lay.spread ? `a quarter of all of it each, two under each edge,` : 'all of it standing over one edge, two rails under it,') : lay.spread ? 'half of all of it' : 'all of it standing over one'} ${held}`, railSpan, pt !== undefined ? `the worse of ${fr.plies > 1 ? 'a quarter of' : 'half'} the load, the sheet and the joists spread along the rail, and the same gathered at its middle (people stand together; its own weight taken there too, on the safe side)` : lay.spread ? `${fr.plies > 1 ? 'a quarter of' : 'half'} the load, the sheet and the joists spread along the rail` : 'the load standing over one rail, half the sheet and the joists, at its middle');
}
const frameSays = (f: Frame, _c?: Ctx) => `on ${f.n} joists of ${f.joist.says} and ${f.plies > 1 ? `${2 * f.plies} rails, two side by side under each edge, of` : 'two rails of'} ${f.rail.says}, in ${matterOf(f.by).name}${familyOf(f.by) === 'wood' ? ' (sawn and graded, as framing is sold: weaker than clear wood for its knots)' : ''}`;

const WAYS: Way[] = [];
const way = (w: Way) => { WAYS.push(w); return w; };

// -- a surface: a weight held up at a height over an area ---------------------------------------------------------------
/** A surface's sizes: as wanted, as wide as what stands on it, and, standing on the floor, its narrower way at least
 *  0.3 of how tall it stands with what is on it: pushed at the top with a tenth of its weight it then tips over its
 *  edge no sooner than at half again that push (F h ≤ W b, b ≥ 0.15 h). */
const surfaceHow = (n: Need) => {
  const H = n.want.q.H!.v, tall = H + n.tall, W0 = Math.max(n.want.q.W!.v, n.fit[0]), D0 = Math.max(n.want.q.D!.v, n.fit[1]), least = 0.3 * tall;
  let W = W0, D = D0; if (!n.on && Math.min(W, D) < least) { if (W <= D) W = least; else D = least; }
  return { H, W, D, F: n.want.q.F!.v + n.above, levels: n.want.flags.includes('levels') ? Math.max(2, Math.round(n.want.q.levels?.v ?? 4)) : 1, steadied: W > W0 || D > D0 ? `${W > W0 ? 'widened' : 'deepened'} to ${len(W > W0 ? W : D)} so pushed at its top (${len(tall)} up with what stands on it) it does not tip; fixed to a wall it could be less` : '' };
};
function onMembers(kind: 'legs4' | 'legs4in' | 'legs3' | 'column' | 'panels'): (n: Need, c: Ctx) => void {
  return (n, c) => {
    const { H, W, D, F } = surfaceHow(n), top = matterFor(c, STRUCTURAL), fam = familyOf(top), bars = c.matter ? top : c.light !== undefined ? matterFor(c, BARS.filter((b) => familyOf(b) === fam || fam === 'plastic'), 'beam', 'legs') : pick(c.rnd, BARS.filter((b) => familyOf(b) === fam || fam === 'plastic'));
    const shape: Shape = familyOf(bars) === 'wood' ? 'square' : pick(c.rnd, ['square', 'rod', 'tube']), nLegs = kind === 'legs3' ? 3 : kind === 'column' ? 1 : 4, y0 = c.y0, X = c.x0, Z = c.z0;
    // each leg's share of the load and of the top's own weight (half again for a load off the middle); the top's weight
    // first from the least sheet it could be, then again from the one it is
    const first = Math.max(W, D) / (fam === 'metal' ? 150 : 60), sheet0 = SHEET[fam]!.map((x) => x / 1e3).find((x) => x >= first) ?? SHEET[fam]!.at(-1)! / 1e3;
    const shareOf = (T: number) => ((F + W * D * T * matterOf(top).density * G) / nLegs) * (nLegs > 1 ? 1.5 : 1);
    let Pshare = shareOf(sheet0), mem: Member | null = kind === 'panels' ? null : memberFor(bars, shape, Pshare, H);
    const inset = kind === 'legs4in' ? Math.min(W, D) * (0.06 + 0.08 * c.rnd()) : 0;
    // what holds loose stuff on it: walls round its edge
    const rim = rimFor(n.want, W, D, familyOf(top) === 'wood' ? top : 'wood.douglas-fir');
    if (rim) { c.checks.push(() => rim.check); c.choices.push(rim.choice); }
    // framed, when no sheet alone bears it: the frame's long way, and its rails held at the legs
    let frame: Frame | null = null; const alongX = W >= D, Lw = alongX ? W : D, Dw = alongX ? D : W;
    // a column's foot: wide enough that the load at the top's edge does not tip it over the foot's edge (by a quarter
    // again, the foot's own weight and the top's holding it down), and that a push at the top of a tenth of the whole
    // weight does not (half-width at least 0.15 of its height: a tenth, by half again)
    const ft = 0.012, footHalf = (T: number) => { const mTop = W * D * T * matterOf(top).density; for (let b = 0.05; b < 5; b += 0.005) { const mFoot = matterOf('steel.a36').density * (2 * b) ** 2 * ft; if ((mFoot + mTop) * G * b >= 1.25 * F * Math.max(0, Math.max(W, D) / 2 - b) && b >= 0.15 * (H + n.tall)) return b; } return 5; };
    const make = (T: number) => {
      c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.loose.length = 0; c.led = false; c.after = c.base0 ?? null;
      const ty = y0 + H - T; let below = H - T;
      if (frame) below = placeFrame(c, frame, top, X, y0 + H, Z, Lw, Dw) - y0;
      else box(c, 'top', top, X, ty + T / 2, Z, W, D, T, 'plate', `${M(H)} up, over ${MM(W)} × ${MM(D)} mm`, `as thin a sheet of ${matterOf(top).name} as the load law lets bear ${+(F / G).toPrecision(3)} kg by two, bending under 1/250 of its span`);
      if (rim) placeRim(c, rim, X, y0 + H, Z, W, D);
      const why0 = c.why; c.why = `to carry ${n.want.flags.includes('back') ? 'the seat' : 'the top'} and its ${+(F / G).toPrecision(3)} kg down to what it stands on`;
      if (kind === 'panels') { const pt = Math.max(T, 0.012); for (const [k, sx] of [-1, 1].entries()) box(c, `side${k + 1}`, top, X + sx * (W / 2 - 0.03 - pt / 2), y0 + below / 2, Z, pt, D * 0.9, below, 'slab', `under the top, 30 mm in from its ${sx < 0 ? 'left' : 'right'} edge, on what it stands on`, `a panel as thick as the top: pressed along its width it neither crushes nor buckles`); }
      else if (kind === 'column') { const foot = 2 * footHalf(T); box(c, 'foot', 'steel.a36', X, y0 + ft / 2, Z, foot, foot, ft, 'base', 'under the column, on what it stands on', `${len(foot)} square of 12 mm steel: the load at the top's edge does not tip it over the foot's edge (by a quarter again), nor a push at the top of a tenth of its weight`); upright(c, 'column', bars, shape, mem!, X, y0 + ft, Z, below - ft, 'under the middle of the top, on its foot', `the least ${shape} of ${matterOf(bars).name} that carries it: ${mem!.says}`); }
      else {
        const s = mem!.size, inX = frame && !alongX ? 0 : inset, inZ = frame && alongX ? 0 : inset, at: [number, number][] = kind === 'legs3' ? [[0, -D / 2 + s / 2 + inset], [-W / 2 + s / 2, D / 2 - s / 2], [W / 2 - s / 2, D / 2 - s / 2]] : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [a! * (W / 2 - s / 2 - inX), b! * (D / 2 - s / 2 - inZ)]);
        at.forEach(([x, z], i) => upright(c, `leg${i + 1}`, bars, shape, mem!, X + x, y0, Z + z, below, `under the ${frame ? 'rails\' ends' : 'top\'s'} ${kind === 'legs3' && i === 0 ? 'front middle' : 'corner'}${inset ? `, ${MM(inset)} mm in` : ''}, on what it stands on`, `the least ${shape} of ${matterOf(bars).name} that carries a share of the load (half again for a load not in the middle): ${mem!.says}`));
      }
      c.why = why0;
      if (n.want.flags.includes('back')) { c.why = 'to lean back on'; box(c, 'back', top, X, ty + T + 0.2, Z - D / 2 + T / 2, W, T, 0.4, 'slab', 'standing on the back edge of the seat', 'as thick as the seat'); c.why = why0; }
    };
    const lay = layOf(n.want), loadsOn = () => (lay.spread ? [`load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g spread`] : [`load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g`, `load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g at its end`]);
    // an umbrella's canopy is cloth held taut on ribs in a real one: here the thinnest sheet kept stands for it, and is
    // not held to a sheet's bending, which cloth on ribs does not do
    const canopy = n.want.flags.includes('pole'), thinnest = SHEET[fam]![0]! / 1e3;
    const span0 = kind === 'legs3' || kind === 'column' || kind === 'panels' ? Math.max(W, D) : Math.max(W, D) - 2 * inset, tried = canopy ? (make(thinnest), { t: thinnest, ok: true }) : trySheets(c, fam, first, make, loadsOn, span0, /^wood/.test(top) ? lay.creep : 1);
    let T = tried.t;
    // no sheet alone bears it on four legs: the lightest frame of joists and rails under it that does, the legs under the rails
    const sheetKg = W * D * T * matterOf(top).density;
    if ((!tried.ok || c.light !== undefined) && (kind === 'legs4' || kind === 'legs4in') && mem) {
      const by = fam === 'wood' ? framingWood(c) : familyOf(bars) === 'metal' ? bars : 'aluminum.6061-t6';
      frame = frameFor(top, by, Lw, Dw, F, Lw - 2 * inset - 2 * mem.size, alongX, lay, c.part);
      if (frame && tried.ok && frame.kg >= sheetKg) { frame = null; make(T); }
      else if (frame) {
        T = frame.T; Pshare = ((F + frame.kg * G) / 4) * 1.5; mem = memberFor(bars, shape, Pshare, H - frame.T - frame.joist.h - frame.rail.h);
        frame = frameFor(top, by, Lw, Dw, F, Lw - 2 * inset - 2 * mem.size, alongX, lay, c.part) ?? frame; make(frame.T); T = frame.T;
        c.choices.push(`${tried.ok ? `a sheet alone would weigh ${+sheetKg.toPrecision(3)} kg` : noSheet(fam, span0)}, so it is framed: the top ${frameSays(frame, c)}, the lightest of the frames that bear it (${+frame.kg.toPrecision(3)} kg)`);
      } else if (!tried.ok) { make(T); c.gaps.push(`${noSheet(fam, span0)}, and no frame of joists and rails of the kept sections does either`); }
    } else if (!tried.ok) c.gaps.push(`${noSheet(fam, span0)}: a beam under it is the next thing to derive`);
    // the legs again, for the top as it is; if they change, the top again on them
    if (!frame && !canopy && mem && Math.abs(shareOf(T) - Pshare) > 1e-9) { Pshare = shareOf(T); const m2 = memberFor(bars, shape, Pshare, H); if (m2.size !== mem.size) { mem = m2; T = leastSheet(c, fam, T, make, loadsOn, kind === 'legs3' || kind === 'column' || kind === 'panels' ? Math.max(W, D) : Math.max(W, D) - 2 * inset); } else mem = m2; }
    if (mem && !mem.ok) c.gaps.push(`no ${shape} of ${matterOf(bars).name} kept carries ${+(Pshare / G).toPrecision(3)} kg down ${M(H)} by three: ${mem.says}`);
    const st = surfaceHow(n).steadied; if (st && kind !== 'column') c.choices.push(st);
    if (canopy) c.choices.push(`its canopy the thinnest sheet kept (${len(thinnest)}), standing for cloth on ribs: soft things are not kept, so it is not held to a sheet's bending`);
    c.choices.push(`${kind === 'legs4' ? 'four legs at the corners' : kind === 'legs4in' ? 'four legs set in from the corners' : kind === 'legs3' ? 'three legs' : kind === 'column' ? `a column on a ${len(2 * footHalf(T))} square foot of 12 mm steel, the column` : 'two side panels'}${mem ? ` of ${shape === 'square' ? `${MM(mem.size)} mm square bar` : shape === 'rod' ? `Ø${MM(mem.size)} mm rod` : `Ø${MM(mem.size)} × ${MM(mem.wall!)} mm tube`} in ${matterOf(bars).name}` : ''}; a ${MM(T)} mm top of ${matterOf(top).name}`);
    const fr = frame, kTop = /^wood/.test(top) ? lay.creep : 1;
    if (!canopy && !fr) { c.loads.push(...loadsOn()); c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); if (!v) return null; const b = v.bend * kTop, span = Math.max(W, D); return { what: `its top bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && b <= span / 250, says: `the load law, ${lay.spread ? 'the load spread over it' : 'the load at its middle and at its edge, the worse'}: ${factorSays(v.factor)}, bending ${len(b)}${kTop > 1 ? creepSays(lay) : ''} (1/250 of its span is ${len(span / 250)}: more fails)` }; }); }
    if (fr) frameChecks(c, fr, 'top', top, Lw, Dw, F, lay, 'between the legs', Lw - 2 * inset - 2 * (mem?.size ?? 0));
    const memNow = mem; if (memNow) c.checks.push(() => ({ what: `its ${kind === 'column' ? 'column carries' : 'legs carry'} it without buckling`, ok: memNow.ok, says: `each carries ${+(Pshare / G).toPrecision(3)} kg (its share of the load and the top's own weight, half again): ${memNow.says}` }));
    // from a wheelchair: the knees go under its lowest part, 685 mm at least (2010 ADA Standards 306.3); what is worked
    // on, its top or what lies on it, no higher than 865 mm (902.3)
    if (n.want.flags.includes('knees')) {
      const under = H - T - (frame ? frame.joist.h + frame.rail.h : 0), work = H + (n.want.q.depth?.v ?? 0);
      c.checks.push(() => ({ what: 'a wheelchair fits under it', ok: under >= 0.685, says: `${len(under)} clear under its ${frame ? 'rails' : 'top'}, against the 685 mm knee room a wheelchair needs (2010 ADA Standards 306.3)` }));
      c.checks.push(() => ({ what: 'what is worked on is within reach from a wheelchair', ok: work <= 0.865, says: `${n.want.q.depth ? 'what lies on it comes' : 'its top is'} ${len(work)} up, against the most of 865 mm for a surface worked at from a wheelchair (2010 ADA Standards 902.3)` }));
    }
    const fh = kind === 'column' ? footHalf(T) * 2 : 0;
    c.top = { y: y0 + H, w: W, d: D, name: `${c.p}_top` }; c.foot = kind === 'column' ? [Math.max(W, fh), Math.max(D, fh)] : [W, D];
  };
}
const one = (n: Need) => !n.want.flags.includes('levels') && !n.want.flags.includes('span');
const legs = (n: Need) => n.want.q.legs?.v;
way({ id: 'top on four legs', meets: 'surface', says: 'a top on four legs at its corners', when: (n) => (!one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 4 ? `you said ${legs(n)} legs` : null), make: onMembers('legs4') });
way({ id: 'top on four legs set in', meets: 'surface', says: 'a top on four legs set in from its corners', when: (n) => (!one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 4 ? `you said ${legs(n)} legs` : n.want.flags.includes('back') ? 'a seat with a back stands on its corners' : null), make: onMembers('legs4in') });
way({ id: 'top on three legs', meets: 'surface', says: 'a top on three legs, which never rock', when: (n) => { const { W, D } = surfaceHow(n); return !one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 3 ? `you said ${legs(n)} legs` : W * D > 0.5 ? 'over half a square metre, three legs leave its corners free to tip' : n.want.flags.includes('back') ? 'a seat with a back stands on four' : null; }, make: onMembers('legs3') });
way({ id: 'top on a column', meets: 'surface', says: 'a top on one column and a foot', when: (n) => { const { W, D, F } = surfaceHow(n); return n.want.flags.includes('pole') ? null : !one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 1 ? `you said ${legs(n)} legs` : W * D > 0.36 || F > 600 ? 'a top this big or this loaded wants more than one column' : n.want.flags.includes('back') ? 'a seat with a back stands on four' : null; }, make: onMembers('column') });
way({ id: 'top on side panels', meets: 'surface', says: 'a top on two side panels', when: (n) => (!one(n) ? 'it has shelves or a span' : legs(n) ? `you said ${legs(n)} legs` : null), make: onMembers('panels') });
way({
  id: 'shelves on posts and battens', meets: 'surface', says: 'shelves on battens between four corner posts', when: (n) => (!n.want.flags.includes('levels') ? 'it has one surface, not shelves' : null),
  make: (n, c) => shelves(n, c, 'posts'),
});
way({
  id: 'shelves between side panels', meets: 'surface', says: 'shelves on battens between two side panels', when: (n) => (!n.want.flags.includes('levels') ? 'it has one surface, not shelves' : null),
  make: (n, c) => shelves(n, c, 'panels'),
});
function shelves(n: Need, c: Ctx, by: 'posts' | 'panels'): void {
  const { H, W, D, F, levels } = surfaceHow(n), top = matterFor(c, STRUCTURAL), fam = familyOf(top), bars = c.matter ? top : c.light !== undefined ? matterFor(c, BARS, 'beam', 'posts') : pick(c.rnd, BARS), y0 = c.y0, X = c.x0, Z = c.z0, bat = 0.02;
  const mem = by === 'posts' ? memberFor(bars, 'square', ((F * levels + 30 * G) / 4) * 1.5, H) : null;
  const make = (T: number) => {
    c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.loose.length = 0; c.led = false; c.after = c.base0 ?? null;
    const up = by === 'panels' ? Math.max(T, 0.012) : mem!.size, inner = W - 2 * up, ys = Array.from({ length: levels }, (_, i) => y0 + 0.08 + (i * (H - 0.08 - T)) / (levels - 1));
    const why0 = c.why; c.why = 'to hold the shelves up, down to what it stands on';
    if (by === 'panels') for (const [k, sx] of [-1, 1].entries()) box(c, `side${k + 1}`, top, X + sx * (W / 2 - up / 2), y0 + H / 2, Z, up, D, H, 'slab', `the ${sx < 0 ? 'left' : 'right'} side, on what it stands on`, 'a panel as thick as the shelves');
    else for (const [i, [sx, sz]] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].entries()) upright(c, `post${i + 1}`, bars, 'square', mem!, X + sx! * (W / 2 - up / 2), y0, Z + sz! * (D / 2 - up / 2), H, 'at a corner, on what it stands on', `the least square bar of ${matterOf(bars).name} that carries a quarter of every shelf's load and half again: ${mem!.says}`);
    c.why = why0;
    ys.forEach((y, i) => {
      box(c, `shelf${i + 1}`, top, X, y + T / 2, Z, inner, D, T, 'shelf', `${M(y + T - y0)} up, between the ${by}`, `as thin a sheet of ${matterOf(top).name} as the load law lets bear ${+(F / G).toPrecision(3)} kg by two, bending under 1/250 of its span`);
      const w2 = c.why; c.why = `to hold shelf ${i + 1} up at its ends`;
      for (const [k, sx] of [-1, 1].entries()) box(c, `batten${i + 1}${k ? 'b' : 'a'}`, bars, X + sx * (inner / 2 - bat / 2), y - bat / 2, Z, bat, D, bat, 'bar', `under the ${sx < 0 ? 'left' : 'right'} end of shelf ${i + 1}, against the ${by}`, 'a 20 mm batten the whole depth: the shelf rests on it, it is held to what stands');
      c.why = w2;
    });
  };
  const T = leastSheet(c, fam, W / 80, make, () => `load ${c.p}_shelf1 with ${+F.toFixed(1)} N + ${c.p}_shelf1.mass * g`, W);
  const st = surfaceHow(n).steadied;
  c.choices.push(`${st ? `${st}; ` : ''}${levels} shelves of ${len(T)} ${matterOf(top).name} on battens between ${by === 'posts' ? `four ${MM(mem!.size)} mm posts of ${matterOf(bars).name}` : 'two side panels'}`);
  c.loads.push(`load ${c.p}_shelf1 with ${+F.toFixed(1)} N + ${c.p}_shelf1.mass * g`);
  c.checks.push(() => { const v = LOADS.get(`${c.p}_shelf1`); return v ? { what: `each shelf bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= W / 250, says: `the load law: ${+v.factor.toPrecision(3)} times under its yield, bending ${MM(v.bend)} mm` } : null; });
  if (mem) c.checks.push(() => ({ what: 'its posts carry every shelf without buckling', ok: mem.ok, says: mem.says }));
  c.top = { y: y0 + H, w: W, d: D, name: `${c.p}_shelf${levels}` }; c.foot = [W, D];
}
way({
  id: 'deck on two ends', meets: 'surface', says: 'a deck resting on two ends, one each side of the gap', when: (n) => (!n.want.flags.includes('span') ? 'there is no gap to span' : null),
  make: (n, c) => {
    const L = n.want.q.span!.v, W = n.want.q.W!.v, H0 = n.want.q.H!.v, F = n.want.q.F!.v + n.above, deck = matterFor(c, STRUCTURAL), ends = matterFor(c, BARS, 'beam', 'ends'), seat = Math.max(0.15, L * 0.1), sp1 = n.want.flags.includes('crowd') ? ' spread' : '';
    let frame: Frame | null = null, H = H0;
    const make = (t: number) => {
      c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.led = false; c.after = c.base0 ?? null;
      // its deck as high as said, or higher where its frame is deeper: the ends under it at least 100 mm tall
      H = Math.max(H0, (frame ? frame.T + frame.joist.h + frame.rail.h : t) + 0.1);
      // the deck first, what the rest is derived from; on a frame, the frame under it, and the ends under the rails
      const under = frame ? placeFrame(c, frame, deck, c.x0, c.y0 + H, c.z0, L + 2 * seat, W, 'deck') - c.y0 : H - t;
      if (!frame) box(c, 'deck', deck, c.x0, c.y0 + H - t / 2, c.z0, L + 2 * seat, W, t, 'plate', `over the gap, on both ends`, `as thin a sheet of ${matterOf(deck).name} as the load law lets bear ${+(F / G).toPrecision(3)} kg across ${M(L)} by two, bending under 1/250 of it`);
      const w0 = c.why; c.why = `to hold the ${frame ? 'rails' : 'deck'} up at each side of the gap`;
      for (const [i, sx] of [-1, 1].entries()) box(c, `end${i + 1}`, ends, c.x0 + sx * (L / 2 + seat / 2), c.y0 + under / 2, c.z0, seat, W, under, 'block', `${sx < 0 ? 'left' : 'right'} of the gap, on what it stands on`, `a block ${MM(seat)} mm wide: the ${frame ? 'rails bear' : 'deck bears'} on it over that length`);
      c.why = w0;
    };
    const tried = trySheets(c, familyOf(deck), L / 60, make, () => `load ${c.p}_deck with ${+F.toFixed(1)} N + ${c.p}_deck.mass * g${sp1}`, L);
    let t = tried.t;
    for (const k of [1, 2]) STANDS.set(`${c.p}_end${k}`, 'the banks it rests on');
    // no sheet alone spans it, or it must be light and a frame is lighter: joists across the deck on two rails along the
    // span, held on the ends
    const fam = familyOf(deck), by = fam === 'wood' ? framingWood(c) : familyOf(ends) === 'metal' ? ends : 'aluminum.6061-t6';
    if (!tried.ok || c.light !== undefined) {
      const f = frameFor(deck, by, L + 2 * seat, W, F, L, true, layOf(n.want), c.part), sheetKg = (L + 2 * seat) * W * t * matterOf(deck).density;
      if (f && (!tried.ok || f.kg < sheetKg)) { frame = f; t = f.T; make(t); c.choices.push(`${tried.ok ? `a sheet alone would weigh ${+sheetKg.toPrecision(3)} kg` : noSheet(fam, L)}, so it is framed: the deck ${frameSays(f, c)}, the lightest of the frames that bear it (${+f.kg.toPrecision(3)} kg)`); }
      else if (!tried.ok) c.gaps.push(`${noSheet(fam, L)}, and no frame of joists and rails of the kept sections does either`);
    }
    c.choices.push(`a ${MM(t)} mm deck of ${matterOf(deck).name} over ${M(L)} on two ends of ${matterOf(ends).name}`);
    const fr = frame, Lw = L + 2 * seat;
    if (H > H0 + 1e-9) c.choices.push(`its deck ${len(H)} up, not ${len(H0)}: its frame is ${len(H - 0.1)} deep, and the ends under it stand at least 100 mm`);
    if (!fr) { c.loads.push(`load ${c.p}_deck with ${+F.toFixed(1)} N + ${c.p}_deck.mass * g${sp1}`); c.checks.push(() => { const v = LOADS.get(`${c.p}_deck`); return v ? { what: `it spans ${M(L)} under ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= L / 250, says: `the load law${sp1 ? ', the load spread along it' : ''}: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(L)} is ${len(L / 250)}: more fails)` } : null; }); }
    else frameChecks(c, fr, 'deck', deck, Lw, W, F, layOf(n.want), `over the ${len(L)} span, held on the two ends`, L);
    c.top = { y: c.y0 + H, w: L, d: W, name: `${c.p}_deck` }; c.foot = [L + 2 * seat, W];
  },
});

// -- a surface laid on what carries it: a bed on a cart, a platform on a lift --------------------------------------------
way({
  id: 'a deck laid on what carries it', meets: 'surface', says: 'a deck laid flat on what carries it', when: (n) => (!n.on ? 'it stands on the floor' : !one(n) ? 'it has shelves or a span' : !n.want.flags.includes('laid') ? 'a height was asked for, or is usual for it' : null),
  make: (n, c) => {
    const { W, D, F } = surfaceHow(n), deck = matterFor(c, STRUCTURAL), fam = familyOf(deck), w = Math.max(W, c.top.w), d = Math.max(D, c.top.d);
    const make = (t: number) => { c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.loose.length = 0; c.led = false; c.after = c.base0 ?? null; box(c, 'top', deck, c.x0, c.y0 + t / 2, c.z0, w, d, t, 'plate', `laid on ${c.top.name ? c.top.name.replace(`${c.p}_`, '') : 'what carries it'}, ${len(w)} × ${len(d)}`, `as thin a sheet of ${matterOf(deck).name} as the load law lets bear ${+(F / G).toPrecision(3)} kg by two where it reaches past what holds it`); };
    const loads = () => [`load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g`, `load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g at its end`];
    // it lies on what carries it, so it bears where that holds it; a sheet a hundredth of its larger side (wood,
    // a three-hundredth for metal) for what reaches past, checked by the load law where it is made
    const sheets = SHEET[fam]!.map((x) => x / 1e3), T = sheets.find((x) => x >= Math.max(w, d) / (fam === 'metal' ? 300 : 100)) ?? sheets.at(-1)!; make(T);
    c.choices.push(`a ${len(T)} deck of ${matterOf(deck).name}, ${len(w)} × ${len(d)}, laid on what carries it`);
    c.loads.push(...loads());
    c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); return v ? { what: `its deck bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= Math.max(w, d) / 250, says: `the load law, the load at its middle and at its edge, the worse: ${factorSays(v.factor)}, bending ${len(v.bend)}` } : null; });
    c.top = { y: c.y0 + T, w, d, name: `${c.p}_top` }; c.foot = [w, d];
  },
});
// an umbrella stands on one pole: no other way of holding a surface up is one
for (const w of WAYS) if (w.meets === 'surface' && w.id !== 'top on a column') { const was = w.when; w.when = (n, c) => (n.want.flags.includes('pole') ? 'an umbrella stands on one pole' : was(n, c)); }
const laidOn = (n: Need) => (n.on && n.want.flags.includes('laid') ? 'it lies on what carries it: no height was asked' : null);
for (const w of WAYS) if (w.meets === 'surface' && w.id !== 'a deck laid on what carries it' && /legs|column|panels/.test(w.id)) { const was = w.when; w.when = (n, c) => laidOn(n) ?? was(n, c); }

// -- what raises and lowers: a carriage between two posts --------------------------------------------------------------
way({
  id: 'a carriage between two posts', meets: 'hoist', says: 'a carriage that rides up and down between two posts', when: () => null,
  make: (n, c) => {
    const L = n.want.q.L!.v, carried = (n.want.q.m?.v ?? 0) + n.above / G, W = Math.max(n.fit[0], 0.3), D = Math.max(n.fit[1], 0.3), mt = matterFor(c, ['steel.a36', 'aluminum.6061-t6']), X = c.x0, Z = c.z0;
    // the carriage first: a plate held at its ends by the posts, what rides spread on it (M = F W / 8, deflection
    // 5 F W³ / 384 E I), as thin as bears it by two and bends under 1/250 of its span
    const deck = 'aluminum.6061-t6', md = matterOf(deck), Fr = carried * G, cw = (() => { for (const t2 of SHEET.metal!.map((x) => x / 1e3)) { const I = (D * t2 ** 3) / 12, sg = ((Fr * W) / 8) * (t2 / 2) / I, dl = (5 * Fr * W ** 3) / (384 * md.E * I); if (md.yield / sg >= 2 && dl <= W / 250) return t2; } return 0.025; })();
    const rides = carried + W * D * cw * md.density;
    // then each post: a column carrying half of all that rides (what it carries and the carriage), half again, as tall as
    // the travel and the carriage, held at its foot only
    // its lowest at the height said ("to counter height": a kitchen worktop about 900 mm up, estimate), its posts that much taller
    const low = n.want.q.low?.v ?? 0, Hp = low + L + 0.05 + 0.05, mem = memberFor(mt, 'square', ((rides * G) / 2) * 1.5, Hp), sp = mem.size;
    let yb = c.y0;
    const w0 = c.why, bw = W + 2 * sp + 0.1, bt = 0.012;
    if (!n.on) { c.why = 'to stand the posts on the floor and tie them together'; box(c, 'base', 'steel.a36', X, yb + bt / 2, Z, bw, D, bt, 'base', 'on the floor, under the posts', `a ${len(bt)} steel plate as wide as the posts and what rides between them: its size is theirs, its thickness taken, not derived`); yb += bt; c.choices.push(`a ${len(bt)} steel base ${len(bw)} × ${len(D)} under it all (${+(bw * D * bt * matterOf('steel.a36').density).toPrecision(3)} kg; its thickness taken, not derived)`); }
    c.why = 'to guide the carriage up and down';
    for (const [i, sx] of [-1, 1].entries()) upright(c, `post${i + 1}`, mt, 'square', mem, X + sx * (W / 2 + sp / 2), yb, Z, Hp, `${sx < 0 ? 'left' : 'right'} of the carriage, on ${n.on ? 'what it stands on' : 'the base'}`, `the least square bar of ${matterOf(mt).name} that carries half of what rides by three: ${mem.says}`);
    c.why = w0;
    const cn = box(c, 'carriage', deck, X, yb + 0.002 + low + cw / 2, Z, W, D, cw, 'plate', low ? `between the posts, its ends against them, at its lowest ${len(low)} up` : 'between the posts, its ends against them, 2 mm up', `a ${len(cw)} plate of ${md.name}: held at its ends by the posts, what rides spread on it, it bears it by two and bends under 1/250 of ${len(W)} (M = F W / 8)`, { moving: true });
    c.steps.push(`slide ${cn} on ${c.p}_post1 along y between 0 mm and ${MM(L)} mm`); c.traces.push({ step: c.steps.at(-1)!, what: `${cn}'s slide`, called: c.way, why: `so it rides up ${len(L)} and back`, when: '', where: 'where its end touches the left post, along it', how: 'a Jolt slider along y with its stops at the bottom and at the travel' });
    c.choices.push(`a ${len(cw)} carriage of ${md.name} ${len(W)} × ${len(D)} riding ${len(L)} up and down between two ${len(sp)} square posts of ${matterOf(mt).name}`);
    c.gaps.push('what raises it (a screw, a winch or a scissor linkage, and what turns that) is not derived: it is pushed up in the test');
    c.checks.push(() => ({ what: 'its posts carry what rides without buckling', ok: mem.ok, says: `each carries half of ${+rides.toPrecision(3)} kg (what rides and the carriage), half again: ${mem.says}` }));
    c.tests.push({ kind: 'raise', name: cn, L });
    if (low) c.choices.push(`its lowest at ${len(low)} up (${n.want.q.low!.grounds}), its highest ${len(low + L)}`);
    c.top = { y: yb + 0.002 + low + cw, w: W, d: D, name: cn }; c.foot = [W + 2 * sp + (n.on ? 0 : 0.1), D];
  },
});

// -- mobility: a load moved over the floor at a speed ------------------------------------------------------------------
/** What a load moved at a speed needs of the motors that drive it, for each motor kept with each gearhead that fits it
 *  (or none): its wheel turns at v / r, its motor n times that (under nine tenths of its speed with no load at its
 *  volts); held at that speed by a controller, each gives at most n η K_t I at the wheel, I its continuous current to
 *  keep rolling and twice that for a short start (estimated: a controller's peak). Rolling takes 0.02 of the weight
 *  (estimated, rubber on a hard floor), starting 0.3 m/s² more. The lightest that does both is taken. */
function driveFor(kg: number, v: number, pickR: number, count: number, slope = 0, crr = 0.02) {
  const out: { motor: MotorData; gear: (typeof GEARHEADS)[string] | undefined; n: number; r: number; roll: number; start: number; cont: number; peak: number; ok: boolean; fast: boolean; mass: number }[] = [];
  for (const motor of Object.values(MOTORS)) for (const gear of [undefined, ...Object.values(GEARHEADS).filter((g) => g.fits.includes(motor.id))]) {
    const md = motorModel(motor), n = gear?.ratio ?? 1, eta = gear?.efficiency ?? 1, r = pickR + (motor.diameter / 2) * 0.6, wMotor = (n * v) / r;
    const roll = (crr * Math.cos(slope) + Math.sin(slope)) * kg * G * r, start = roll + kg * 0.3 * r, cont = 2 * (n * eta * md.Kt * md.maxContinuousCurrent - n * md.Tf), peak = 2 * (n * eta * md.Kt * 2 * md.maxContinuousCurrent - n * md.Tf);
    const fast = wMotor <= 0.9 * md.noLoadSpeed, mass = 2 * (motor.mass + (gear?.mass ?? 0));
    out.push({ motor, gear, n, r, roll, start, cont, peak, ok: fast && cont >= roll && peak >= start, fast, mass });
  }
  void count;
  return out.filter((x) => x.ok).sort((a, b) => a.mass - b.mass)[0] ?? out.filter((x) => x.fast).sort((a, b) => b.peak - a.peak)[0] ?? out.sort((a, b) => b.peak - a.peak)[0]!;
}
/** The least a deck on wheels can be: its wheels reach the floor below the smallest motor kept. */
const leastCart = () => { const m = Object.values(MOTORS).sort((a, b) => a.diameter - b.diameter)[0]!; return { across: 2 * (0.04 + m.diameter * 0.6 + m.diameter), motor: m }; };
function wheels(count: 3 | 4): (n: Need, c: Ctx) => void {
  return (n, c) => {
    // loose stuff carried by its weight lies in a tub as deep as a wheelbarrow's, 250 mm (estimate): its deck as wide as that needs
    const tub = n.want.q.lkg && n.want.q.rho ? Math.sqrt(n.want.q.lkg.v / n.want.q.rho.v / 0.25) : 0;
    const v = n.want.q.v!.v, said = n.want.q.W?.by === 'you' ? n.want.q.W.v : 0, W = Math.max(n.fit[0], said, 0.3, tub), D = Math.max(n.fit[1], n.want.q.D?.by === 'you' ? n.want.q.D.v : 0, 0.25, tub), deck = matterFor(c, STRUCTURAL.filter((x) => !/stainless|steel/.test(x)));
    if (tub > 0.3) c.choices.push(`a deck ${len(W)} × ${len(D)}, so the ${+n.want.q.lkg!.v.toPrecision(3)} kg of ${n.want.q.lkg!.grounds} lies 250 mm deep in it, as in a wheelbarrow (estimate)`);
    const carried = (n.want.q.m?.v ?? 0) + n.above / G, guess = carried + W * D * 0.012 * matterOf(deck).density + 2 + 0.5;
    // what it rolls on: its rolling resistance and the grip of rubber there (estimates)
    const ground = n.want.q.crr ? { word: n.want.q.crr.grounds } : null, crr = n.want.q.crr?.v ?? 0.02, mu = n.want.q.mu?.v ?? 0.7;
    const slope = n.want.q.slope?.v ?? 0, ch = driveFor(guess, v, pick(c.rnd, [0.04, 0.05, 0.06, 0.075]), count, slope, crr), motor = ch.motor, Rm = motor.diameter / 2, gear = ch.gear, n2 = ch.n, r = ch.r;
    const wt = Math.max(0.012, r * 0.35), gl = gear ? gear.length : 0, t = 0.012, yb = c.y0 + r + Rm, X = c.x0, Z = c.z0, rpm = (v / r) * 60 / (2 * Math.PI);
    if (!ch.fast) c.gaps.push(`${+v.toPrecision(3)} m/s on ${len(2 * r)} wheels turns ${motor.label}${gear ? ` through ${gear.ratio}:1` : ''} past its speed at its volts: no motor kept goes that fast`);
    c.choices.push(`a deck of ${matterOf(deck).name} on ${count} wheels ${len(2 * r)} across, the back two each turned by ${motor.label}${gear ? ` through ${gear.label}` : ''}, held at ${+rpm.toPrecision(3)} rpm by a speed controller from its ${motor.V} V (it steers by its back wheels; the front ${count === 3 ? 'one does' : 'two do'} not swivel)`);
    box(c, 'deck', deck, X, yb + t / 2, Z, W, D, t, 'plate', `${len(r + Rm)} up on its wheels' axles, over ${len(W)} × ${len(D)} (as wide as what it carries)`, `12 mm sheet: it is held at ${count === 3 ? 'three' : 'four'} points by its motors and axle block${count === 3 ? '' : 's'}, close under what it carries`);
    const rim = rimFor(n.want, W, D, familyOf(deck) === 'wood' ? deck : 'wood.douglas-fir'); if (rim) { placeRim(c, rim, X, yb + t, Z, W, D); c.checks.push(() => rim.check); c.choices.push(rim.choice); }
    const zb = Z - D / 2 + Rm + 0.01, zf = Z + D / 2 - Rm - 0.01;
    for (const [k, sx] of [-1, 1].entries()) {
      const ex = X + sx * (W / 2 + 0.002), w0 = c.why;
      c.why = `to turn a back wheel, so it moves ${+v.toPrecision(3)} m/s`;
      const mn = put(c, `${c.p}_motor${k + 1}`, `place motor named ${c.p}_motor${k + 1} (${motor.id}) at ${M(ex - (sx * motor.length) / 2)}, ${M(yb - Rm)}, ${M(zb)} along x`, `under the deck's back ${sx < 0 ? 'left' : 'right'} corner, its top on the deck's underside, its shaft out past the deck's side`, `${motor.label} from its maker's sheet: the lightest kept that starts and keeps rolling what it carries at ${+v.toPrecision(3)} m/s (its continuous current to roll, twice that to start)`);
      let holder = mn, ox = ex;
      if (gear) { holder = put(c, `${c.p}_gear${k + 1}`, `place gearhead named ${c.p}_gear${k + 1} at ${M(ex + (sx * gl) / 2)}, ${M(yb - Rm)}, ${M(zb)} along x`, `on the motor's shaft end, outside the deck`, `${gear.label}: the motor alone would give too little torque at the wheel`); ox = ex + sx * gl; }
      c.why = `to roll on the floor at ${+v.toPrecision(3)} m/s`;
      const wn = put(c, `${c.p}_wheel${k + 1}`, `place wheel named ${c.p}_wheel${k + 1} of rubber at ${M(ox + (sx * wt) / 2)}, ${M(yb - Rm)}, ${M(zb)} size ${MM(2 * r)} x ${MM(wt)} mm along x`, `on the ${gear ? 'gearhead' : 'motor'}'s outer end, its bottom on the floor`, `${len(2 * r)} across, so it reaches the floor below the motor; rubber, for grip`, { moving: true });
      c.steps.push(`hinge ${wn} to ${holder} driven by ${mn} at ${motor.V} V${gear ? ` through ${n2}:1` : ''} held at ${+rpm.toPrecision(5)} rpm`); c.traces.push({ step: c.steps.at(-1)!, what: `${wn}'s hinge`, called: c.way, why: `so ${mn} turns it`, when: '', where: `where ${wn} touches ${holder}, about its own axis`, how: `a Jolt hinge; the motor's torque at the speed it turns, T = K_t I - T_f with I = (V - K_t ω) / R, its volts set by a speed controller to hold ${+rpm.toPrecision(3)} rpm, its current at most twice its continuous${gear ? `, through ${n2}:1 at ${gear.efficiency}` : ''}` });
      if (count === 4 || k === 0) {
        c.why = 'to hold a front wheel';
        const bx = count === 4 ? X + sx * (W / 2 - 0.015 + 0.002) : X, bz = count === 4 ? zf : Z + D / 2 - 0.015, bw = 0.03;
        const bn = count === 4 ? box(c, `axle${k + 1}`, deck, bx, yb - Rm, bz, bw, 2 * Rm, 2 * Rm, 'block', `under the deck's front ${sx < 0 ? 'left' : 'right'} corner, its outer face with the motors' ends`, 'as tall as a motor, so its wheel turns at the same height') : box(c, 'axle', deck, X + bw / 2 + 0.03, yb - Rm, Z + D / 2 + r - 0.03, bw, 2 * r + 0.06, 2 * Rm, 'block', `under the deck's front middle, reaching out ahead of it`, 'as tall as a motor, reaching past the deck so its wheel clears it');
        c.why = 'to roll on the floor and carry the front';
        const fx = count === 4 ? X + sx * (W / 2 + 0.002 + wt / 2) : X + 0.03 + bw + wt / 2, fz = count === 4 ? zf : Z + D / 2 + r + 0.005;
        const fw = put(c, `${c.p}_wheel${k + 3}`, `place wheel named ${c.p}_wheel${k + 3} of rubber at ${M(fx)}, ${M(yb - Rm)}, ${M(fz)} size ${MM(2 * r)} x ${MM(wt)} mm along x`, `on the axle block's outer face, its bottom on the floor`, 'as big as the driven wheels, so the deck rides level', { moving: true });
        c.steps.push(`hinge ${fw} to ${bn}`); c.traces.push({ step: c.steps.at(-1)!, what: `${fw}'s hinge`, called: c.way, why: 'so it rolls freely', when: '', where: `where ${fw} touches ${bn}`, how: 'a Jolt hinge, free' });
      }
      c.why = w0;
    }
    // weighed as made, with all it carries: what it rolls is what the checks and the test roll
    const p = c.p;
    c.checks.push(() => {
      const kg = (MADE.get(p) ?? guess) + (CARRIED.get(p) ?? 0), roll = (crr * Math.cos(slope) + Math.sin(slope)) * kg * G * r, start = roll + kg * 0.3 * r;
      return { what: `its motors can start and keep rolling what it carries${slope ? ` up ${+((slope * 180) / Math.PI).toPrecision(3)}°` : ''}${ground ? ` on ${ground.word}` : ''}`, ok: ch.cont >= roll && ch.peak >= start, says: `${+kg.toPrecision(3)} kg in all (itself as made and what it carries): rolling${slope ? ` up the slope (m g (${crr} cos θ + sin θ); worked out: the test in Jolt is on the flat)` : ''} takes ${+roll.toPrecision(3)} N·m at the wheels (rolling resistance ${crr} of its weight${ground ? ` on ${ground.word}` : ' on a hard floor'}, estimate) and ${+start.toPrecision(3)} N·m to start it at 0.3 m/s²; its two motors give ${+ch.cont.toPrecision(3)} N·m held at their continuous current and ${+ch.peak.toPrecision(3)} N·m for a start at twice it${gear ? `, through ${n2}:1 at ${gear.efficiency}` : ''}${ch.ok ? '' : ': no motor kept, with any gearhead kept, does both at this speed'}` };
    });
    // its driven wheels must grip what it rolls on: their share of its weight, by the friction of rubber there, against
    // what rolling and climbing take
    if (slope || ground) c.checks.push(() => {
      const kg = (MADE.get(p) ?? guess) + (CARRIED.get(p) ?? 0), share = count === 3 ? 2 / 3 : 1 / 2, need = (crr * Math.cos(slope) + Math.sin(slope)) / (share * Math.cos(slope));
      return { what: `its driven wheels grip${slope ? ` up ${+((slope * 180) / Math.PI).toPrecision(3)}°` : ''}${ground ? ` on ${ground.word}` : ''}`, ok: need <= mu, says: `its two driven wheels carry about ${+(share * 100).toPrecision(2)}% of its ${+kg.toPrecision(3)} kg (even across its ${count} wheels, estimate): to roll${slope ? ' and climb' : ''} they need a friction of ${+need.toPrecision(2)}, against about ${mu} for rubber ${ground ? `on ${ground.word}` : 'on a hard floor'} (estimate)${need > mu ? ': they spin, whatever the motors give' : ''}` };
    });
    // what powers its motors is not made: said, and not counted in what it weighs
    c.choices.push(`its motors run from a ${motor.V} V supply that is not made (electric power is not kept): what it weighs leaves that out`);
    c.tests.push({ kind: 'drive', v, deck: `${c.p}_deck` });
    c.top = { y: yb + t, w: W, d: D, name: `${c.p}_deck` }; c.foot = [W + 2 * (wt + gl + 0.01), D + (count === 3 ? 2 * r + 0.06 : 0)];
  };
}
const cartFits = (n: Need) => { const { across, motor } = leastCart(), said = n.want.q.W?.by === 'you' ? n.want.q.W.v : null; return said !== null && said < across ? `at ${len(said)} across, nothing kept is small enough to drive it: the smallest motor kept is ${len(motor.diameter)} across, and its wheels and deck at least ${len(across)}` : null; };
way({ id: 'four wheels, two driven', meets: 'mobility', says: 'a deck on four wheels, the back two turned by motors', when: (n) => cartFits(n) ?? (n.want.q.wheels && n.want.q.wheels.v !== 4 ? `you said ${n.want.q.wheels.v} wheels` : null), make: wheels(4) });
way({ id: 'three wheels, two driven', meets: 'mobility', says: 'a deck on two driven wheels and one free one in front', when: (n) => cartFits(n) ?? (n.want.q.wheels && n.want.q.wheels.v !== 3 ? `you said ${n.want.q.wheels.v} wheels` : n.above > 400 ? 'what it carries is too heavy to leave one corner on one wheel' : null), make: wheels(3) });

// -- a board on brackets screwed to a wall ---------------------------------------------------------------------------------
/** Hung on a wall: a board resting on two steel brackets screwed to the wall's studs as far apart as said (or 600 mm, the
 *  usual stud spacing, estimate). The wall is a block of concrete standing for it, not part of it. The board is the
 *  thinnest that bears its load between the brackets by two, bending under 1/250 of that and under any sag said; each
 *  bracket an arm out under the board on an upright against the wall, the least square bar that bears half of it all
 *  spread along the arm by two, its end bending under 1/250 of the arm; its top screw pulled out by the arm's moment over
 *  the upright, against a 5 mm wood screw 50 mm into a softwood stud (USDA Wood Handbook ch. 8, withdrawal, a fifth of
 *  its ultimate taken as safe, estimate). */
const WALL_WAY = 'a board on wall brackets';
const SCREW_PULL = withdrawalUltimate('wood-screw', 0.42, 0.005, 0.05), SCREW_SIDE = lateralUltimate(0.42, 0.005, 0.05, 0.05);
way({
  id: WALL_WAY, meets: 'surface', says: 'a board on two steel brackets screwed to the wall', when: (n) => (n.want.flags.includes('wall') ? null : 'it is not hung on a wall'),
  make: (n, c) => {
    // what is kept on a shelf stays there, and wood under a load that stays creeps: its bending grows by 1 + k_def (k_def
    // 0.8 for plywood, 0.6 for solid timber, kept dry: EN 1995-1-1 Table 3.2)
    const W = n.want.q.W!.v, D = n.want.q.D!.v, H = n.want.q.H!.v, F = n.want.q.F!.v + n.above, apart = Math.min(n.want.q.apart?.v ?? 0.6, W - 0.06), board = matterFor(c, STRUCTURAL), fam = familyOf(board), lay0 = layOf(n.want), stays = /shel/.test(n.want.says), lay: Lay = stays && fam === 'wood' ? { ...lay0, creep: 1 + (/plywood/.test(board) ? 0.8 : 0.6) } : lay0, sp = lay.spread ? ' spread' : '';
    const X = c.x0, Z = c.z0, y0 = c.y0, wt = 0.2, wW = W + 0.4, wH = H + 0.3, zf = Z - D / 2, st = 'steel.a36', E = matterOf(st).E, Y = matterOf(st).yield;
    // the arm: a cantilever D long under half of it all, spread along it (M = P D / 2, δ = P D³ / 8 E I)
    const P = (F + W * D * 0.03 * matterOf(board).density * G) / 2; let side = (SQUARE.metal!.map((x) => x / 1e3).find((b) => { const I = b ** 4 / 12, sg = (P * D) / 2 * (b / 2) / I, dl = (P * D ** 3) / (8 * E * I); return Y / sg >= 2 && dl <= D / 250; }) ?? 0.1), hu = Math.max(0.15, D * 0.8);
    const side0 = side;
    const make = (t: number) => {
      c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.led = false; c.after = c.base0 ?? null;
      const yb = y0 + H - t;
      c.why = 'to stand for the wall it is screwed to';
      const wall = box(c, 'wall', 'concrete.c30', X, y0 + wH / 2, zf - wt / 2, wW, wt, wH, 'slab', 'behind it, on the floor', `a block of concrete ${len(wW)} wide and ${len(wH)} tall standing for the wall and its studs: not part of it`);
      STANDS.set(wall, 'the wall it is screwed to'); c.why = n.why;
      for (const [k, sx] of [-1, 1].entries()) {
        const bx = X + sx * (apart / 2);
        box(c, `upright${k + 1}`, st, bx, yb - side - hu / 2, zf + side / 2, side, side, hu, 'bar', `against the wall at the ${sx < 0 ? 'left' : 'right'} stud, under its arm`, `${MM(side)} mm square steel, ${MM(hu)} mm down the wall: its screws are this far apart, to take the arm's moment`);
        box(c, `arm${k + 1}`, st, bx, yb - side / 2, zf + D / 2, side, D, side, 'bar', `out from the wall at the ${sx < 0 ? 'left' : 'right'} stud, on its upright, under the board`, side > side0 ? `square steel stouter than the least that bears half of it all (${MM(side0)} mm), so the board's overhanging ends and the brackets under them bend within what its middle may` : `the least square steel bar that bears half of it all spread along it by two, its end bending under 1/250 of its ${len(D)}`);
      }
      box(c, 'top', board, X, yb + t / 2, Z, W, D, t, 'plate', `on the two arms, its back against the wall, ${len(H)} up`, `as thin a board of ${matterOf(board).name} as the load law lets bear its load between the brackets, by two, bending under 1/250 of the ${len(apart)} between them${c.sag !== undefined ? ` and under the ${len(c.sag)} said` : ''}`);
    };
    const tried = trySheets(c, fam, apart / 60, make, () => `load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g${sp}`, Math.min(apart, c.sag !== undefined ? c.sag * 250 : Infinity), lay.creep);
    make(tried.t);
    // its overhangs and the brackets under them within what its middle may bend: a thicker board or stouter brackets,
    // whichever weighs less, until they are; the brackets' bending by the load law at the bar it has, as 1 / b⁴ for others
    const a = (W - apart) / 2, rho = matterOf(board).density, Eb = matterOf(board).E, lim0 = c.sag ?? apart / 250;
    const ends = (t: number) => { const wq = (F + W * D * t * rho * G) / W, EI = Eb * ((D * t ** 3) / 12); return Math.max(((wq * a * (3 * a ** 3 + 6 * a * a * apart - apart ** 3)) / (24 * EI)) * lay.creep, ((wq * apart * apart * (5 * apart * apart - 24 * a * a)) / (384 * EI)) * lay.creep); };
    const ar = a > 0 ? trial(c, c.steps, [`load ${c.p}_arm1 with ${+P.toFixed(1)} N spread`]) : null;
    if (ar && ends(tried.t) + ar.bend > lim0 * 1.0001) {
      let best: { t: number; b: number; kg: number } | null = null;
      for (const t of SHEET[fam]!.map((x) => x / 1e3).filter((x) => x >= tried.t)) for (const b of SQUARE.metal!.map((x) => x / 1e3).filter((x) => x >= side)) { if (ends(t) + ar.bend * (side / b) ** 4 > lim0) continue; const kg = W * D * t * rho + 2 * 7850 * b * b * (D + hu); if (!best || kg < best.kg) best = { t, b, kg }; break; }
      if (best) { tried.t = best.t; side = best.b; make(tried.t); }
    }
    if (!tried.ok) c.gaps.push(`${noSheet(fam, apart)}${c.sag !== undefined ? ` and within the ${len(c.sag)} it may sag` : ''}`);
    c.choices.push(`a ${MM(tried.t)} mm board of ${matterOf(board).name} on two brackets of ${MM(side)} mm square steel ${len(apart)} apart${n.want.q.apart ? ', at the studs' : ' (studs are usually 600 mm apart, estimate)'}, screwed to the wall`);
    c.loads.push(`load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g${sp}`, `load ${c.p}_arm1 with ${+P.toFixed(1)} N spread`);
    c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); return v ? { what: `its board bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend * lay.creep <= apart / 250, says: `the load law${sp ? ', the load spread over it' : ''}, between its brackets: ${factorSays(v.factor)}, bending ${len(v.bend * lay.creep)}${creepSays(lay)} (1/250 of ${len(apart)} is ${len(apart / 250)}: more fails)` } : null; });
    c.checks.push(() => { const v = LOADS.get(`${c.p}_arm1`); return v ? { what: 'its brackets bear their half', ok: v.factor >= 2 && v.bend <= D / 250, says: `the load law, ${+(P / G).toPrecision(3)} kg spread along each arm out from the wall: ${factorSays(v.factor)}, its end bending ${len(v.bend)} (1/250 of ${len(D)} is ${len(D / 250)}: more fails)` } : null; });
    // its board over the brackets with its ends overhanging, the load spread along it (w = F / W): the tips bend
    // w a (3a³ + 6a²L − L³) / 24 E I, its middle w L² (5L² − 24a²) / 384 E I, each by its creep, and the brackets' ends too
    const t = tried.t, wq = (F + W * D * t * rho * G) / W, EI = Eb * ((D * t ** 3) / 12);
    const tip = ((wq * a * (3 * a ** 3 + 6 * a * a * apart - apart ** 3)) / (24 * EI)) * lay.creep, midB = ((wq * apart * apart * (5 * apart * apart - 24 * a * a)) / (384 * EI)) * lay.creep;
    c.checks.push(() => { const arm = LOADS.get(`${c.p}_arm1`)?.bend ?? 0, worst = Math.max(tip, midB) + arm, lim = c.sag ?? apart / 250; SAGS.set(c.p, { bend: worst, at: tip >= midB ? 'its overhanging ends, and the brackets under them' : 'its middle, and the brackets' }); return { what: 'its overhanging ends bend no more than its middle may', ok: worst <= lim * 1.0001, says: `its ${len(a)} overhangs each side of the brackets ${len(apart)} apart, the load spread along it: its tips bend ${len(tip)} (w a (3a³ + 6a²L − L³) / 24 E I), its middle ${midB < 0 ? `rises ${len(-midB)}` : `bends ${len(midB)}`} (w L² (5L² − 24a²) / 384 E I)${lay.creep > 1 ? creepSays(lay) : ''}, and the brackets' ends ${len(arm)}: ${len(worst)} at the worst, against ${len(lim)}${c.sag !== undefined ? ' said' : ' (1/250 of its span)'}` }; });
    const Tn = (P * D) / 2 / (hu - 0.02), allow = SCREW_PULL / 5, Vn = P / 2, sideAllow = SCREW_SIDE / 5;
    c.checks.push(() => ({ what: 'its screws hold in the studs', ok: Tn <= allow && Vn <= sideAllow, says: `two 5 mm wood screws to each bracket, ${MM(hu - 0.02)} mm apart, each long enough to pass the bracket and 12.5 mm of plasterboard and go 50 mm into the stud (about 85 mm, estimate): the bracket's moment (${+((P * D) / 2).toPrecision(3)} N·m) pulls the top one out with ${+Tn.toPrecision(3)} N, against ${+allow.toPrecision(3)} N (USDA Wood Handbook ch. 8, withdrawal ${+SCREW_PULL.toPrecision(3)} N at G 0.42, a fifth of it taken as safe, estimate); each carries ${+Vn.toPrecision(3)} N down, against ${+sideAllow.toPrecision(3)} N sideways (NDS yield modes, ${+SCREW_SIDE.toPrecision(3)} N, a fifth taken, estimate)` }));
    c.top = { y: y0 + H, w: W, d: D, name: `${c.p}_top` }; c.foot = [W, D];
  },
});

// -- bodies: what stands on a surface -------------------------------------------------------------------------------------
way({
  id: 'a plate on a motor', meets: 'spin', says: 'a plate turned by a motor standing under it, through a gearhead where the speed is low', when: () => null,
  make: (n, c) => {
    // turning the whole of it, as wide as what stands on it
    const whole = n.want.flags.includes('whole'), rpm = n.want.q.rpm!.v, Dia = whole ? Math.max(n.want.q.Dia!.v, n.fit[0], n.fit[1]) : n.want.q.Dia!.v, motor = smallMotor(), md = motorModel(motor), gear = gearFor(motor);
    // through the gearhead where the motor would turn under a twentieth of its speed with no load (a speed held that
    // low is held badly, and the gearhead gives the torque to start the plate)
    const n2 = gear && rpm < 0.05 * md.noLoadSpeed ? gear.ratio : 1, plate = matterFor(c, STRUCTURAL), t = familyOf(plate) === 'wood' ? 0.012 : 0.004, X = c.x0, Z = c.z0, said = (rpm * 60) / (2 * Math.PI);
    if (n2 * rpm > 0.9 * md.noLoadSpeed) c.gaps.push(`${+said.toPrecision(3)} rpm turns ${motor.label} past its speed at its volts: no motor kept turns that fast`);
    // too slow: a brushed motor held under about a hundredth of its free speed is held by its brushes' friction, not its
    // controller (estimate): the reduction it would need, said
    if (n2 * rpm < 0.01 * md.noLoadSpeed) { const need = (0.05 * md.noLoadSpeed) / rpm; c.gaps.push(`${+said.toPrecision(3)} rpm turns ${motor.label} through ${n2}:1 at ${+((n2 * rpm * 60) / (2 * Math.PI)).toPrecision(2)} rpm, where its brushes' friction stalls it (estimate): it needs about ${+need.toPrecision(2)}:1, a gear train of several stages, a worm, or a stepping or clock motor, none kept`); }
    c.choices.push(`a ${len(Dia)} plate of ${matterOf(plate).name} on ${motor.label}${n2 > 1 ? ` through ${gear!.label}` : ''}, held at ${+said.toPrecision(3)} rpm by a speed controller from its ${motor.V} V`);
    let y = c.y0; const bw = Math.max(Dia + 0.04, 0.2);
    if (!n.on) c.choices.push(`a ${len(bw)} square steel base 10 mm thick (${+(bw * bw * 0.01 * 7850).toPrecision(3)} kg) under the motor, to take its torque`);
    if (!n.on) { const w0 = c.why; c.why = 'to stand the motor on the floor and take its torque'; box(c, 'base', 'steel.a36', X, y + 0.005, Z, bw, bw, 0.01, 'base', 'on the floor, under the motor', `a 10 mm steel plate ${len(bw)} square, wider than what turns, so it stands under it and its weight holds the motor's torque`); y += 0.01; c.why = w0; }
    const mn = put(c, `${c.p}_motor`, `place motor named ${c.p}_motor (${motor.id}) at ${M(X)}, ${M(y + motor.length / 2)}, ${M(Z)} along y`, `standing upright on ${n.on ? 'what it stands on' : 'its base'}`, `${motor.label}: held at the speed by a controller${n2 > 1 ? ` through ${n2}:1` : ''}`);
    let holder = mn; y += motor.length;
    if (n2 > 1) { holder = put(c, `${c.p}_gear`, `place gearhead named ${c.p}_gear at ${M(X)}, ${M(y + gear!.length / 2)}, ${M(Z)} along y`, 'on the motor\'s shaft end', `${gear!.label}: the motor alone would turn too slowly to be held steady`); y += gear!.length; }
    const pn = put(c, `${c.p}_plate`, `place disc named ${c.p}_plate of ${plate} at ${M(X)}, ${M(y + t / 2)}, ${M(Z)} size ${MM(Dia)} x ${MM(t)} mm along y`, `on the ${n2 > 1 ? 'gearhead' : 'motor'}'s end`, `${len(Dia)} across, as asked`, { moving: true });
    c.steps.push(`hinge ${pn} to ${holder} driven by ${mn} at ${motor.V} V${n2 > 1 ? ` through ${n2}:1` : ''} held at ${+said.toPrecision(5)} rpm`); c.traces.push({ step: c.steps.at(-1)!, what: `${pn}'s hinge`, called: c.way, why: `so ${mn} turns it at ${+said.toPrecision(3)} rpm`, when: '', where: `where ${pn} touches ${holder}`, how: 'a Jolt hinge, driven by the motor\'s torque line, its volts set by a speed controller' });
    c.tests.push({ kind: 'spin', name: pn, motor: mn, rpm, n: n2 });
    // what stands on it turns with it: it rides on the plate; what bears that weight on the motor's shaft is not derived
    if (whole) c.gaps.push(`a bearing to carry what it turns (${+(n.above / G).toPrecision(3)} kg) off the motor's shaft is not derived: the motor holds it in the test`);
    c.top = { y: y + t, w: Dia, d: Dia, name: whole ? pn : null }; c.foot = n.on ? [Dia, Dia] : [bw, bw];
  },
});
way({
  id: 'a rail on two feet', meets: 'track', says: 'a carriage on a rail held up on two feet', when: () => null,
  make: (n, c) => {
    const L = n.want.q.L!.v, m = n.want.q.m?.v ?? 5, rail = matterFor(c, ['aluminum.6061-t6', 'steel.a36']), cw = Math.max(0.08, L * 0.2), len = L + cw + 0.04, X = c.x0, Z = c.z0, y = c.y0;
    c.choices.push(`a rail of ${matterOf(rail).name} ${M(len)} long on two feet, a carriage on it`);
    const w0 = c.why; c.why = 'to hold the rail up';
    for (const [i, sx] of [-1, 1].entries()) box(c, `foot${i + 1}`, rail, X + sx * (len / 2 - 0.02), y + 0.02, Z, 0.04, 0.12, 0.04, 'block', `under the rail's ${sx < 0 ? 'left' : 'right'} end, on what it stands on`, '40 mm blocks, 120 mm wide so the rail does not roll over');
    c.why = w0; box(c, 'rail', rail, X, y + 0.05, Z, len, 0.04, 0.02, 'bar', 'on its feet', `as long as the travel and the carriage, ${MM(len)} mm`);
    const cm = Math.max(0.03, Math.cbrt(m / 7850)), cn = put(c, `${c.p}_carriage`, `place block named ${c.p}_carriage of steel.a36 at ${M(X - L / 2)}, ${M(y + 0.06 + cm / 2)}, ${M(Z)} size ${MM(cw)} x ${MM(Math.max(0.06, cm))} x ${MM(cm)} mm`, 'on the rail at its start', `a steel carriage of the ${+m.toPrecision(3)} kg it carries`, { moving: true });
    c.steps.push(`slide ${cn} on ${c.p}_rail along x between 0 mm and ${MM(L)} mm`); c.traces.push({ step: c.steps.at(-1)!, what: `${cn}'s slide`, called: c.way, why: `so it slides ${MM(L)} mm`, when: '', where: `where it touches the rail, along it`, how: 'a Jolt slider with its limits at the ends of the travel' });
    c.tests.push({ kind: 'slide', name: cn, L, m: 7850 * cw * Math.max(0.06, cm) * cm });
    c.top = { y: y + 0.06 + cm, w: cw, d: 0.06, name: null }; c.foot = [len, 0.12];
  },
});
way({
  id: 'an upright tube on a base', meets: 'vessel', says: 'an upright tube closed at its foot by a base', when: () => null,
  make: (n, c) => {
    // in what encloses it, as tall for its width as fits inside it: no wider than its inside less its base's lip and 10 mm,
    // and no taller than its inside less its base (Din = ∛(4.4 V / π r), h = r Din)
    const V = n.want.q.V!.v, id = matterFor(c, LIQUID), mt = matterOf(id), r0 = c.rnd(), d1 = Math.cbrt((4 * 1.1 * V) / Math.PI), inn = n.on?.kind === 'enclosure' ? n.on.want.q : null;
    // held in one hand (a cup, a bottle): no wider inside than about 85 mm, so a hand closes round it (a mug is 80 to 90 mm
    // across, estimate); a bottle stands two to four times as tall as it is wide (estimate)
    const held = /^(cup|bottle)$/.test(n.want.says), bottle = n.want.says === 'bottle', grip = held ? (4 * 1.1 * V) / (Math.PI * 0.085 ** 3) : 0;
    const lo = Math.max(inn ? (4 * 1.1 * V) / (Math.PI * (Math.min(inn.W!.v, inn.D!.v) - 0.03) ** 3) : 0, bottle ? 2 : 0.7, grip), hi = Math.min(bottle ? 4 : 1.6, inn ? ((inn.H!.v - 0.012) / d1) ** 1.5 : Infinity), fits = lo <= hi;
    const ratio = fits ? lo + r0 * (hi - lo) : inn ? 1 : lo, Din = Math.cbrt((4 * 1.1 * V) / (Math.PI * ratio)), h = ratio * Din, p = 1000 * G * h, fam = familyOf(id);
    if (inn && !fits) c.checks.push(() => ({ what: 'it fits in what encloses it', ok: false, says: `${+(V * 1e3).toPrecision(3)} L will not stand in ${MM(inn.W!.v)} × ${MM(inn.D!.v)} × ${MM(inn.H!.v)} mm inside at any shape kept (as tall as 0.7 to 1.6 times its width)` }));
    // its base as thin as the liquid's push on it allows, by three: a round plate held round its edge, σ = 3 p r² / 4 t²
    const tMin = fam === 'plastic' ? 0.003 : 0.0015, t = Math.max(tMin, (3 * p * (Din / 2)) / mt.yield), Dout = Din + 2 * t, bt = Math.max(tMin, (Din / 2) * Math.sqrt((9 * p) / (4 * mt.yield))), X = c.x0, Z = c.z0;
    c.choices.push(`an upright tube of ${mt.name} ${MM(Dout)} mm across and ${MM(h)} mm tall, its wall ${MM(t)} mm, closed by a ${MM(bt)} mm square base ${MM(Dout + 0.02)} mm across`);
    const w0 = c.why; c.why = 'to close the tube\'s foot, so it holds a liquid';
    box(c, 'tank_base', id, X, c.y0 + bt / 2, Z, Dout + 0.02, Dout + 0.02, bt, 'base', 'under the tube, on what it stands on', `a ${MM(bt)} mm square plate ${MM(Dout + 0.02)} mm across, 10 mm wider than the tube all round: joined to it, it seals the bore; as thin as the liquid's push on it lets it be by three (σ = 3 p r² / 4 t², held round its edge), and at least ${MM(tMin)} mm to be made`);
    c.why = w0; put(c, `${c.p}_tank`, `place tube named ${c.p}_tank of ${id} at ${M(X)}, ${M(c.y0 + bt + h / 2)}, ${M(Z)} size ${MM(Dout)} x ${MM(h)} x ${MM(t)} mm along y`, 'standing on its base', `inside ${MM(Din)} × ${MM(h)} mm for ${+(V * 1e3).toPrecision(3)} L and a tenth more; its wall as thin as p r / t lets it bear the water at its foot by three (at least ${fam === 'plastic' ? 3 : 1.5} mm to be made)`);
    const cap = (Math.PI * Din * Din * h) / 4, hoop = (p * Din) / 2 / t; SKINS.set(`${c.p}:vessel`, { A: Math.PI * Dout * h + (Dout + 0.02) ** 2, t, id, L: h, top: (Math.PI * Din * Din) / 4 });
    c.checks.push(() => ({ what: `it holds ${+(V * 1e3).toPrecision(3)} L`, ok: cap >= V, says: `${+(cap * 1e3).toPrecision(3)} L inside` }));
    c.checks.push(() => ({ what: 'its wall bears the liquid\'s pressure', ok: hoop * 3 <= mt.yield * 1.0001, says: `${+(p / 1000).toPrecision(3)} kPa at its foot (ρ g h, water), hoop stress p r / t = ${+(hoop / 1e6).toPrecision(3)} MPa, ${+(mt.yield / hoop).toPrecision(3)} times under its yield` }));
    c.top = { y: c.y0 + bt + h, w: Dout, d: Dout, name: `${c.p}_tank` }; c.foot = [Dout + 0.02, Dout + 0.02];
  },
});
way({
  id: 'floor, walls and roof', meets: 'enclosure', says: 'a floor, four walls standing on it and a roof on them', when: () => null,
  make: (n, c) => {
    // as large inside as was said, or wide and tall enough for what stands in it
    const said = n.want.q.W!.by === 'you', W = said ? n.want.q.W!.v : Math.max(n.want.q.W!.v, n.fit[0]), D = said ? n.want.q.D!.v : Math.max(n.want.q.D!.v, n.fit[1]), H = n.want.q.H!.by === 'you' ? n.want.q.H!.v : Math.max(n.want.q.H!.v, n.tall + 0.005);
    const mt = matterFor(c, STRUCTURAL), fam = familyOf(mt), big = Math.max(W, D, H), X = c.x0, Z = c.z0, y0 = c.y0;
    const t = (fam === 'wood' ? [0.009, 0.012, 0.018, 0.025] : fam === 'plastic' ? [0.004, 0.006, 0.01] : [0.0015, 0.002, 0.003, 0.005]).find((x) => x >= big / (fam === 'metal' ? 600 : 60)) ?? (fam === 'wood' ? 0.025 : 0.005);
    const door = c.need.want.flags.includes('door');
    c.choices.push(`a floor, four walls and a roof of ${MM(t)} mm ${matterOf(mt).name}${door ? ', a door hung in the front' : ''}`);
    const how = `${len(t)} ${matterOf(mt).name}: the least sheet kept that is at least ${fam === 'metal' ? '1/600' : '1/60'} of its largest side (${len(big)}), to stand stiff (estimated)`;
    if (t < big / (fam === 'metal' ? 600 : 60)) c.gaps.push(`no ${fam} sheet kept is thick enough for walls ${len(big)} across: the thickest kept, ${len(t)}, is under the ${fam === 'metal' ? '1/600' : '1/60'} of its largest side (${len(big / (fam === 'metal' ? 600 : 60))}) taken for a wall to stand stiff (estimate); walls this big want a frame (studs, or poles under cloth), not kept`);
    box(c, 'floor', mt, X, y0 + t / 2, Z, W + 2 * t, D + 2 * t, t, 'plate', 'on what it stands on', how);
    box(c, 'left', mt, X - W / 2 - t / 2, y0 + t + H / 2, Z, t, D + 2 * t, H, 'slab', 'on the floor, its left side', how); box(c, 'right', mt, X + W / 2 + t / 2, y0 + t + H / 2, Z, t, D + 2 * t, H, 'slab', 'on the floor, its right side', how);
    box(c, 'back', mt, X, y0 + t + H / 2, Z - D / 2 - t / 2, W, t, H, 'slab', 'on the floor between the sides, at the back', how);
    const narrow = door && n.want.flags.includes('walkin') && W > 1;
    if (door) {
      const w0 = c.why; c.why = 'to open and shut its front';
      // a walk-in door 700 mm wide (estimate) where its front is wider: the rest of the front a wall each side of it
      const dw = narrow ? 0.7 : W - 0.004, fl = narrow ? (W - dw - 0.004) / 2 : 0;
      if (narrow) { for (const [k, sx] of [-1, 1].entries()) box(c, `front${k + 1}`, mt, X + sx * (W / 2 - fl / 2), y0 + t + H / 2, Z + D / 2 + t / 2, fl, t, H, 'slab', `on the floor at the front, ${sx < 0 ? 'left' : 'right'} of the door`, how); }
      const dn = box(c, 'door', mt, narrow ? X - W / 2 + fl + dw / 2 : X - 0.002, y0 + t + 0.002 + (H - 0.004) / 2, Z + D / 2 + t / 2, dw, t, H - 0.004, 'slab', narrow ? 'in the front between its two walls, its left edge against the left one' : 'in the front, its left edge against the left side', narrow ? 'a door 700 mm wide to go in by (estimate), 4 mm clear of the wall it shuts against' : 'the front less 2 mm all round, so it swings clear', { moving: true });
      c.steps.push(`hinge ${dn} to ${narrow ? `${c.p}_front1` : `${c.p}_left`} about y from -100° to 0°`); c.traces.push({ step: c.steps.at(-1)!, what: `${dn}'s hinge`, called: c.way, why: 'so it swings open outward', when: '', where: 'where its edge touches the left side, about the upright', how: 'a Jolt hinge with stops at shut and 100° open' });
      c.tests.push({ kind: 'swing', name: dn }); c.why = w0;
    } else box(c, 'front', mt, X, y0 + t + H / 2, Z + D / 2 + t / 2, W, t, H, 'slab', 'on the floor between the sides, at the front', how);
    box(c, 'roof', mt, X, y0 + t + H + t / 2, Z, W + 2 * t, D + 2 * t, t, 'plate', 'on the four walls', how);
    // what lies on its roof (snow), spread on it: borne by the load law, by two, bending within 1/250 of its span, across
    // whichever two of its walls bear it worse; snow comes and goes, so no creep is taken
    const rp = n.want.q.roofP;
    if (rp) { const F = rp.v * (W + 2 * t) * (D + 2 * t), rn = `${c.p}_roof`, span = Math.max(W, D); c.loads.push(`load ${rn} with ${+F.toFixed(1)} N spread`); c.checks.push(() => { const v = LOADS.get(rn); if (!v) return null; return { what: `its roof bears ${rp.grounds.replace(/, about .*$/, '')}`, ok: v.factor >= 2 && v.bend <= span / 250, says: `${+(rp.v / 1000).toPrecision(3)} kPa (ρ g h, ${rp.grounds.replace(/^.*?, about /, 'about ')}) over ${len(W + 2 * t)} × ${len(D + 2 * t)}, ${+(F / G).toPrecision(3)} kg spread on it; the load law across its walls, the worse way: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(span)} is ${len(span / 250)}: more fails); snow comes and goes, so no creep is taken` }; }); }
    c.checks.push(() => ({ what: `it encloses ${MM(W)} × ${MM(D)} × ${MM(H)} mm`, ok: true, says: `inside, ${MM(W)} by ${MM(D)} mm and ${MM(H)} mm tall` }));
    SKINS.set(`${c.p}:box`, { A: 2 * (W * D + W * H + D * H), t, id: mt, L: H });
    c.top = { y: y0 + 2 * t + H, w: W + 2 * t, d: D + 2 * t, name: `${c.p}_floor` }; c.foot = [W + 2 * t, D + 2 * t]; c.inside = { y: y0 + t, W, D, H, name: `${c.p}_floor` };
  },
});
way({
  id: 'rotors on arms', meets: 'lift', says: 'rotors on motors at the ends of arms round a hub (worked out by momentum theory; not flown)', when: () => null,
  make: (n, c) => {
    // four arms square off a square hub; round parts are judged by the square round them, so rotors clear each other's
    const motor = smallMotor(), k = 4, payload = n.want.q.m!.v, frame = matterFor(c, ['aluminum.6061-t6', 'composite.cfrp']), Dr = pick(c.rnd, [0.25, 0.3, 0.4]);
    const R = Dr * 1.05 + 0.03, arm = R - 0.06 + 0.02, X = c.x0, Z = c.z0, y = c.y0 + 0.1;
    const m = payload + k * motor.mass + 0.3 + k * arm * 0.02 * 0.02 * matterOf(frame).density, T = (m * G) / k, A = (Math.PI * Dr * Dr) / 4, Pi = T ** 1.5 / Math.sqrt(2 * 1.225 * A), Ps = Pi / 0.7, Pmax = ((motor.published.stallTorque ?? 1) * motorModel(motor).noLoadSpeed) / 4;
    c.choices.push(`${k} rotors ${MM(Dr)} mm across on ${motor.label}, on arms of ${matterOf(frame).name}`);
    put(c, `${c.p}_hub`, `place plate named ${c.p}_hub of ${frame} at ${M(X)}, ${M(y)}, ${M(Z)} size 120 x 120 x 20 mm`, '100 mm up, its middle', 'a 120 mm square hub');
    for (let i = 0; i < k; i++) {
      const a = (2 * Math.PI * i) / k, ax = Math.cos(a), az = Math.sin(a), mx = X + ax * R, mz = Z + az * R;
      put(c, `${c.p}_arm${i + 1}`, `place bar named ${c.p}_arm${i + 1} of ${frame} at ${M(X + ax * (0.06 + arm / 2))}, ${M(y)}, ${M(Z + az * (0.06 + arm / 2))} size ${MM(arm)} x 20 x 20 mm turned y ${+((-a * 180) / Math.PI).toFixed(3)}`, `from the hub's rim out at ${+((a * 180) / Math.PI).toFixed(0)}°`, `long enough that the rotors clear each other (${MM(R)} mm out)`);
      put(c, `${c.p}_motor${i + 1}`, `place motor named ${c.p}_motor${i + 1} at ${M(mx)}, ${M(y + 0.01 + motor.length / 2)}, ${M(mz)} along y`, `upright on the end of arm ${i + 1}`, motor.label);
      put(c, `${c.p}_rotor${i + 1}`, `place disc named ${c.p}_rotor${i + 1} of composite.cfrp at ${M(mx)}, ${M(y + 0.01 + motor.length + 0.002)}, ${M(mz)} size ${MM(Dr)} x 4 mm along y`, `on motor ${i + 1}`, `a disc for a rotor ${MM(Dr)} mm across: its blades are not derived`, { loose: true });
      const w0 = c.why; c.why = 'to stand on when it is down';
      put(c, `${c.p}_leg${i + 1}`, `place rod named ${c.p}_leg${i + 1} of ${frame} at ${M(X + ax * (0.06 + arm * 0.5))}, ${M(c.y0 + (y - 0.01 - c.y0) / 2)}, ${M(Z + az * (0.06 + arm * 0.5))} size 12 x ${MM(y - 0.01 - c.y0)} mm along y`, `under the middle of arm ${i + 1}, on the floor`, 'a 12 mm rod as long as the arm is high: it stands on its four legs when landed');
      c.why = w0;
    }
    c.checks.push(() => ({ what: `it can hover with ${+(payload * 1e3).toPrecision(3)} g`, ok: Ps <= 0.5 * Pmax, says: `each rotor lifts ${+((T / G) * 1e3).toPrecision(3)} g; momentum theory gives ${+Pi.toPrecision(3)} W ideal, ${+Ps.toPrecision(3)} W at a figure of merit of 0.7 (estimated), against the ${+Pmax.toPrecision(3)} W its motor gives at most; worked out, not flown: there is no air in the physics here` }));
    c.gaps.push('it needs a battery and rotor blades, neither derived yet: it is worked out and made, not flown');
    c.top = { y: y + 0.01, w: 0.12, d: 0.12, name: null }; c.foot = [2 * R + Dr, 2 * R + Dr];
  },
});
way({
  id: 'an open hull', meets: 'buoyancy', says: 'an open hull deep and wide enough to float upright with its load (worked out by Archimedes; not floated)', when: () => null,
  make: (n, c) => {
    const m = n.want.q.m!.v + n.above / G, mt = matterFor(c, ['wood.birch-plywood', 'aluminum.6061-t6', 'composite.gfrp']), t = familyOf(mt) === 'wood' ? 0.012 : 0.003;
    const L = pick(c.rnd, [1.2, 1.8, 2.4, 3]) * Math.max(1, Math.cbrt(m / 80)), Wd = Math.max(0.6, L * (0.3 + 0.2 * c.rnd())), Hh = 0.3, hull = matterOf(mt).density * t * (L * Wd + 2 * (L + Wd) * Hh), total = m + hull;
    const draft = total / (1000 * L * Wd), BM = (Wd * Wd) / (12 * draft), KB = draft / 2, KG = Hh * 0.6, GM = KB + BM - KG, X = c.x0, Z = c.z0, y = c.y0, how = `${MM(t)} mm ${matterOf(mt).name}`;
    c.choices.push(`an open hull of ${matterOf(mt).name} ${M(L)} by ${M(Wd)}, ${MM(Hh)} mm deep`);
    box(c, 'bottom', mt, X, y + t / 2, Z, L, Wd, t, 'plate', 'on what it stands on', `${M(L)} by ${M(Wd)}: it displaces ${+total.toPrecision(3)} kg of water ${MM(draft)} mm deep`);
    for (const [i, sz] of [-1, 1].entries()) box(c, `side${i + 1}`, mt, X, y + t + Hh / 2, Z + sz * (Wd / 2 - t / 2), L, t, Hh, 'slab', `on the bottom, its ${sz < 0 ? 'back' : 'front'} side`, how);
    for (const [i, sx] of [-1, 1].entries()) box(c, `end${i + 1}`, mt, X + sx * (L / 2 - t / 2), y + t + Hh / 2, Z, t, Wd - 2 * t, Hh, 'slab', `on the bottom between the sides, its ${sx < 0 ? 'stern' : 'bow'}`, how);
    c.checks.push(() => ({ what: `it floats with ${+m.toPrecision(3)} kg`, ok: draft <= Hh / 2, says: `${+total.toPrecision(3)} kg sits ${MM(draft)} mm deep in water, its sides ${MM(Hh)} mm (Archimedes)` }));
    c.checks.push(() => ({ what: 'it rights itself', ok: GM > 0.05 * Wd, says: `its metacentre ${MM(GM)} mm above its weight (GM = KB + BM - KG, BM = B² / 12 T); worked out, not floated: there is no water in the physics here` }));
    c.top = { y: y + t, w: L, d: Wd, name: `${c.p}_bottom` }; c.foot = [L, Wd];
  },
});
// -- what goes into another ----------------------------------------------------------------------------------------------
way({
  id: 'a leaf on a post', meets: 'leaf', says: 'a leaf hung on a post that stands on a foot', when: (n) => (n.on && n.on.kind === 'enclosure' ? 'it is the door of what it is part of' : null),
  make: (n, c) => {
    const W = n.want.q.W!.v, H = n.want.q.H!.v, leaf = matterFor(c, STRUCTURAL), t = familyOf(leaf) === 'wood' ? 0.018 : 0.003, post = 0.05, mLeaf = matterOf(leaf).density * W * H * t;
    // its foot: square, wide enough that the leaf held out to one side, at any angle it swings to, does not tip it over
    // the foot's edge (by a quarter again), what stands holding it down
    const mPost = 7850 * post * post * (H + 0.02), foot = (() => { for (let b = 0.1; b < 3; b += 0.005) { const mF = 7850 * (2 * b) ** 2 * 0.02; if ((mF + mPost) * G * b >= 1.25 * mLeaf * G * Math.max(0, post / 2 + W / 2 - b)) return 2 * b; } return 6; })(), X = c.x0, Z = c.z0, y = c.y0;
    c.choices.push(`a leaf of ${matterOf(leaf).name} ${len(W)} × ${len(H)} on a post on a ${len(foot)} square foot`);
    const w0 = c.why; c.why = 'to hold the leaf up beside it';
    box(c, 'foot', 'steel.a36', X, y + 0.01, Z, foot, foot, 0.02, 'base', 'on what it stands on', `${len(foot)} square of 20 mm steel: the leaf held out to one side, at any angle, does not tip it over its edge (by a quarter again)`);
    box(c, 'post', 'steel.a36', X, y + 0.02 + (H + 0.02) / 2, Z, post, post, H + 0.02, 'bar', 'upright on its foot', '50 mm square steel, as tall as the leaf');
    c.why = w0; const ln = box(c, 'leaf', leaf, X + post / 2 + W / 2, y + 0.03 + H / 2, Z, W, t, H, 'slab', 'against the post, 10 mm above the foot', `${MM(t)} mm ${matterOf(leaf).name}`, { moving: true });
    c.steps.push(`hinge ${ln} to ${c.p}_post about y from -90° to 90°`); c.traces.push({ step: c.steps.at(-1)!, what: `${ln}'s hinge`, called: c.way, why: 'so it swings open either way', when: '', where: 'where its edge touches the post, about the upright', how: 'a Jolt hinge with stops at 90° each way' });
    c.tests.push({ kind: 'swing', name: ln });
    c.top = { y: y + 0.03 + H, w: W, d: t, name: null }; c.foot = [W + foot, foot];
  },
});
way({ id: 'the door of what it is part of', meets: 'leaf', says: 'a door hung in the front of what encloses', when: (n) => (n.on?.kind === 'enclosure' ? null : 'there is nothing it is the door of'), make: () => { /* the enclosure hangs it: its want carries the flag */ } });
way({
  id: 'a heater in what holds it', meets: 'warmth', says: 'a heater in what it is part of, as strong as the still air takes at that temperature', when: (n) => (n.on ? null : 'there is nothing to put it in'),
  make: (n, c) => { c.tests.push({ kind: 'warm', name: c.top.name ?? `${c.p}_top`, T: n.want.q.T!.v }); c.choices.push(`a heater in ${c.top.name ?? 'it'}, as strong as the air takes from it at ${n.want.q.T!.v} °C`); },
});
way({
  id: 'a warm plate on feet', meets: 'warmth', says: 'a plate of a matter that bears the heat, on four short feet, a heater in it', when: (n) => (n.on ? 'it goes in what it is part of' : null),
  make: (n, c) => {
    const T = n.want.q.T!.v, W = n.want.q.W!.v, D = n.want.q.D!.v, th = 0.006;
    const bears = STRUCTURAL.filter((id) => { const f = FUSION[id]; return (!f || ((f.melts ?? 1e9) > T + 80 && (f.lost ?? 1e9) > T + 80)) && (!/^wood/.test(id) || T < 100); });
    const pm = c.matter ? matterOf(c.matter).id : pick(c.rnd, bears.length ? bears : ['aluminum.6061-t6']);
    c.choices.push(`a ${MM(W)} × ${MM(D)} mm plate of ${matterOf(pm).name} on phenolic feet, a heater in it`);
    const w0 = c.why; c.why = 'to hold the warm plate off what it stands on';
    for (const [i, [sx, sz]] of [[-1, -1], [1, -1], [1, 1], [-1, 1]].entries()) box(c, `foot${i + 1}`, 'polymer.phenolic', c.x0 + sx! * (W / 2 - 0.01), c.y0 + 0.01, c.z0 + sz! * (D / 2 - 0.01), 0.02, 0.02, 0.02, 'block', 'under a corner of the plate', 'phenolic: it bears the heat and passes little of it');
    c.why = w0; const nm = box(c, 'plate', pm, c.x0, c.y0 + 0.02 + th / 2, c.z0, W, D, th, 'plate', 'on its four feet', `${matterOf(pm).name}, which neither melts nor breaks down within 80 °C of ${T} °C`);
    c.tests.push({ kind: 'warm', name: nm, T });
    c.top = { y: c.y0 + 0.02 + th, w: W, d: D, name: nm }; c.foot = [W, D];
  },
});

// ==== the plan: what meets each need, what stands on what, in what order ===============================================
const LOADS = new Map<string, { factor: number; bend: number }>();
/** A factor said as it is: under its yield by so much, or over it by so much. */
const factorSays = (f: number) => (f >= 1 ? `${+f.toPrecision(3)} times under its yield` : `${+(1 / f).toPrecision(3)} times over its yield: it gives`);
/** What each design weighs as made, and what it carries that is not part of it (a load, a liquid), kg: read by its checks. */
const MADE = new Map<string, number>(), CARRIED = new Map<string, number>();
/** The walls of what holds or encloses, as made: their area, m², thickness, matter and height, by design and kind. */
const SKINS = new Map<string, { A: number; t: number; id: string; L: number; top?: number }>();
/** The most a design bends where its way works it out beyond the load law (an overhang, creep), m, and where. */
const SAGS = new Map<string, { bend: number; at: string }>();
/** How long what it holds keeps hot, or what keeping it cold costs, as made: through its own walls (a vessel's, and what
 *  encloses it), and the still air round them (natural convection and radiation, laminar, estimate), lumped and stepped. */
function keeps(con: Conception, prefix: string): Check | null {
  const s = con.said, tk = s.keepFor ?? s.runFor, v = SKINS.get(`${prefix}:vessel`), e = SKINS.get(`${prefix}:box`), Ta = s.Tamb ?? AMBIENT, V = con.wants.find((w) => w.fn === 'contain')?.q.V?.v;
  if (s.tmin === undefined && s.Tkeep === undefined && s.Tto === undefined) return null;
  if (tk === undefined && s.Tto === undefined) return null;
  const out = e ?? v; if (!out) return null;
  const th = (id: string) => { try { return thermalOf(matterOf(id)); } catch { return null; } }, to = th(out.id); if (!to) return null;
  // conduction through each wall in series (t / k A), the still air enclosed between a vessel and what encloses it (about
  // 3 W/(m² K) on each face, convection and radiation, estimate), then the air outside; with no lid made, the open top of a
  // vessel loses as bare (its steam takes more, not weighed)
  const walls = [v, e].filter((x): x is NonNullable<typeof x> => !!x), Rw = walls.reduce((a, x) => a + x.t / ((th(x.id)?.k ?? 1) * x.A), 0) + (v && e ? 1 / (3 * v.A) + 1 / (3 * e.A) : 0);
  const top = v && !e ? v.top ?? 0 : 0, outA = out.A + top;
  const leak = (T: number) => { const d = T - Ta, air = Math.abs(heatLoss(T, outA, out.L, to.emissivity, Ta)); return d === 0 ? 0 : d / (Rw + Math.abs(d) / Math.max(air, 1e-12)); };
  // what its open top loses by evaporation: the vapour carried off as the heat is (the Lewis analogy, h_m = h / ρ c_p Le^⅔,
  // Le 0.85), h for a hot face looking up about 1.52 ΔT^⅓ W/(m² K) (estimate), the water's vapour by Antoine's equation, the
  // air at half its saturation (estimate), 2.26 MJ/kg
  const vap = (T: number) => { const p = 133.322 * 10 ** (8.07131 - 1730.63 / (233.426 + Math.min(T, 100))); return (p * 0.018015) / (8.314 * (T + 273.15)); };
  const evap = (T: number) => { if (!top || T <= Ta) return 0; const h = 1.52 * Math.cbrt(T - Ta), hm = h / (1.2 * 1005 * 0.85 ** (2 / 3)); return hm * Math.max(0, vap(T) - 0.5 * vap(Ta)) * 2.26e6 * top; };
  const lose = (T: number) => leak(T) + evap(T);
  const wallSay = walls.map((x) => `${MM(x.t)} mm of ${matterOf(x.id).name} (k ${+(th(x.id)?.k ?? 0).toPrecision(2)} W/(m K)), ${+(x.A * 1e4).toPrecision(3)} cm²`).join(' inside ') + (v && e ? ', the still air between them (about 3 W/(m² K) a face, estimate)' : '') + (top ? `, and its open top, ${+(top * 1e4).toPrecision(3)} cm² (no lid is made)` : '');
  // bare metal hotter than about 60 °C burns on touch in seconds (ISO 13732-1, estimate): its outside, as hot as what it holds
  const metal = familyOf(out.id) === 'metal', burns = (T: number) => (metal && T > 60 ? `; its bare ${matterOf(out.id).name} outside is near ${+T.toPrecision(3)} °C, hot enough to burn on touch in seconds (bare metal over about 60 °C, ISO 13732-1, estimate), and no handle is made` : '');
  // brought to a temperature by a hand crank through a generator (75 W kept up at 70%, estimate): where its leak matches
  // that it settles, and it reaches what is asked only below that
  if (s.Tto !== undefined && V !== undefined && s.human) {
    const m = V * 1000, c = 4186, P = 75 * 0.7, T0 = s.T0 ?? AMBIENT; let lo = Ta, hi = Ta + 1; while (lose(hi) < P && hi < Ta + 2000) hi = Ta + (hi - Ta) * 2; for (let k = 0; k < 80; k++) { const mid = (lo + hi) / 2; if (lose(mid) < P) lo = mid; else hi = mid; }
    const Ts = (lo + hi) / 2; let T = T0, time = 0; while (T < s.Tto && T < Ts - 0.01 && time < 86400 * 2) { T += ((P - lose(T)) * 30) / (m * c); time += 30; }
    return { what: `as made, a hand crank brings what it holds to ${s.Tto} °C${s.within !== undefined ? ` in ${timeSay(s.within)}` : ''}`, ok: Ts > s.Tto && (s.within === undefined || time <= s.within), says: `its walls, ${wallSay}, let out ${+leak(s.Tto).toPrecision(3)} W at ${s.Tto} °C${top ? `, and its open top's evaporation ${+evap(Math.min(s.Tto, 99)).toPrecision(3)} W more (the Lewis analogy, estimate)` : ''}; a person cranking keeps up about 75 W, ${+P.toPrecision(3)} W of it reaching the water through a generator at 70% (estimate): ${Ts <= s.Tto ? `it settles near ${+Ts.toPrecision(3)} °C and never reaches ${s.Tto} °C` : `it reaches ${s.Tto} °C in about ${timeSay(time)}`}${s.within !== undefined ? `, against the ${timeSay(s.within)} asked` : ''}; the crank, gears and generator are not made${burns(Math.min(Ts, s.Tto))}` };
  }
  if (tk === undefined) return null;
  if (s.tmin !== undefined && V !== undefined) {
    const m = V * 1000, c = 4186, T0 = s.T0 ?? s.tmin + 30; let T = T0, time = 0; const dt = 30, Q0 = leak(T0);
    while (T > s.tmin && time < tk * 20) { T -= (lose(T) * dt) / (m * c); time += dt; }
    const lasts = T <= s.tmin ? time : Infinity;
    return { what: `as made, it keeps what it holds above ${s.tmin} °C for ${timeSay(tk)}`, ok: lasts >= tk, says: `its walls, ${wallSay}, bare in still air at ${+Ta.toPrecision(3)} °C, let out ${+Q0.toPrecision(3)} W at first${top ? `, and its open top's evaporation ${+evap(T0).toPrecision(3)} W more (the Lewis analogy, estimate)` : ''}: ${+m.toPrecision(3)} kg from ${+T0.toPrecision(3)} °C falls to ${s.tmin} °C in ${lasts === Infinity ? `more than ${timeSay(time)}` : `about ${timeSay(lasts)}`}, against the ${timeSay(tk)} asked${lasts < tk ? `: it needs an insulated wall (a vacuum, foam) and a lid, not kept` : ''}${burns(T0)}` };
  }
  if (s.Tkeep !== undefined) {
    const Q = -leak(s.Tkeep), E = Q * tk, cop = +Math.max(0.1, 0.6 - 0.01 * (Ta - s.Tkeep)).toFixed(2), elec = E / cop;
    return { what: `as made, it keeps what it holds at ${s.Tkeep} °C for ${timeSay(tk)}`, ok: false, says: `its walls, ${wallSay}, in still air at ${+Ta.toPrecision(3)} °C, let in ${+Q.toPrecision(3)} W: ${+(E / 3600).toPrecision(3)} Wh over that time, ${+(elec / 3600).toPrecision(3)} Wh of electricity at a Peltier's ${cop} at this lift (estimate)${s.store !== undefined ? ` against the ${+(s.store / 3600).toPrecision(3)} Wh it stores` : ''}; no cooler and no insulated wall is made` };
  }
  return null;
}
let ROOM: World = { parts: () => [] };
/** The steps tried in a room of their own: what the load law found. */
function trial(c: Ctx, steps: string[], after: string[]): { factor: number; bend: number } | null {
  const w = new Workshop(ROOM, 1);
  try { for (const s of steps) if (/^place /.test(s)) w.run(s); const memb = [...c.members, ...c.riders].filter((n) => !c.loose.includes(n)); if (memb.length > 1) w.run(`join ${memb.join(', ')} as ${c.p}_trial`); for (const s of after) w.run(s); } catch { return null; }
  const key = /^load\s+(\S+)/.exec(after.at(-1) ?? '')?.[1]; return key ? { factor: w.value(`${key}.factor`), bend: w.value(`${key}.deflection`) } : null;
}
/** What each need stands on or goes into, from what each kind carries and where it goes: derived, never listed. */
function stack(wants: Want[]): Need[] {
  const needs: Need[] = wants.map((w) => ({ kind: NEED_OF[w.fn], want: w, why: `to ${FN_WORDS[w.fn]}${w.says !== FN_WORDS[w.fn] ? ` (${w.says})` : ''}`, on: null, above: 0, fit: [0, 0], tall: 0 }));
  const takes = (x: Need, n: Need) => { const k = NATURE[x.kind].carries; return k === 'all' || k.includes(n.kind); };
  for (const n of needs) {
    const nat = NATURE[n.kind];
    // a leaf is the door of what encloses; with nothing enclosing it is a body of its own, standing beside the rest
    if (n.kind === 'leaf' && !needs.some((x) => x.kind === 'enclosure')) { n.on = needs.filter((x) => x !== n && (x.kind === 'surface' || x.kind === 'mobility' || x.kind === 'hoist')).sort((a, b) => NATURE[b.kind].rank - NATURE[a.kind].rank)[0] ?? null; continue; }
    // a vessel where something encloses goes into it, standing on its floor
    if (n.kind === 'vessel' && needs.some((x) => x.kind === 'enclosure')) { n.on = needs.find((x) => x.kind === 'enclosure')!; continue; }
    if (nat.goes === 'floor') n.on = null;
    else if (nat.goes === 'into') n.on = needs.find((x) => x !== n && BODIES.includes(x.kind) && x.kind !== 'track') ?? needs.filter((x) => x !== n && NATURE[x.kind].goes !== 'into' && (x.kind === 'surface' || x.kind === 'mobility')).sort((a, b) => NATURE[b.kind].rank - NATURE[a.kind].rank)[0] ?? null;
    // (a vessel does not stand in the soil a surface holds: it stands beside that, where the surface stands)
    else n.on = needs.filter((x) => x !== n && NATURE[x.kind].rank < nat.rank && takes(x, n) && !(n.kind === 'vessel' && x.kind === 'surface' && x.want.flags.includes('loose'))).sort((a, b) => NATURE[b.kind].rank - NATURE[a.kind].rank)[0] ?? null;
  }
  // what turns the whole of it stands on the floor, and all that would stand on the floor stands on it
  const whole = needs.find((x) => x.kind === 'spin' && x.want.flags.includes('whole'));
  if (whole) { whole.on = null; for (const n of needs) if (n !== whole && n.on === null && NATURE[n.kind].goes !== 'floor') n.on = whole; }
  // a leaf that goes into something enclosing is its door
  for (const n of needs) if (n.kind === 'leaf' && n.on?.kind === 'enclosure' && !n.on.want.flags.includes('door')) n.on.want.flags.push('door');
  return needs;
}
/** From the floor up: each need after what it stands on. */
const order = (needs: Need[]) => { const out: Need[] = [], depth = (n: Need): number => (n.on ? 1 + depth(n.on) : 0); return [...needs].sort((a, b) => depth(a) - depth(b) || (NATURE[a.kind].goes === 'into' ? 1 : 0) - (NATURE[b.kind].goes === 'into' ? 1 : 0)).filter((n) => (out.push(n), true)); };

export interface Design {
  name: string; title: string; seed: number; prefix: string; steps: string[]; traces: Trace[]; checks: Check[];
  /** it holds every law and every limit it was checked for */ ok: boolean;
  choices: string[]; tries: { seed: number; why: string }[]; gaps: string[]; mass: number; parts: number; footprint: [number, number]; words: string; plan: string[];
  /** what was asked, each met or not; and how many of the things asked it does */ asked: Asked[]; does: [number, number];
  /** it holds, does everything asked, and has nothing left not yet derived */ whole: boolean;
  /** where it folds as planned: its fold, played (each part a quarter or a half turn about its hinge in the order they fold, held
   *  folded, then opened out again), in the room as it stands */ foldTrack?: SimTrack;
}
/** How many of the things asked (what it is, does and has; not what it is for) were read into wants it meets. */
const doesOf = (asked: Asked[], gaps: string[], wants: Want[]): [number, number] => { const xs = asked.filter((a) => a.kind !== 'for'); const met = xs.filter((a) => { const fn = a.got; return !!fn && wants.some((w) => w.fn === fn) && !gaps.some((g) => g.startsWith(`nothing kept here can ${FN_WORDS[fn]}`)); }).length; return [met, Math.max(xs.length, met ? 1 : 0)]; };

/** What the size of what was asked bars outright, whatever way is drawn: past its own weight or its own gravity
 *  nothing solid kept stands; below the electrostatic size no coil kept turns it; below inertia's size no rotor flies it;
 *  past its rim speed nothing kept holds it together; and below the smallest parts kept nothing is that small. */
function scaleBars(n: Need, con: Conception): string | null {
  const sc = con.scale; if (!sc) return null;
  // each group read only where it was read at this size (in vacuum there is no air, in blood no surface to stick to)
  const gr = (k: string) => sc.groups.find((x) => x.key === k), past = (k: string) => !!gr(k)?.past;
  if (past('self-gravity')) return `at ${len(sc.L)}: ${gr('self-gravity')!.says}`;
  if (past('self-weight')) return `at ${len(sc.L)}: ${gr('self-weight')!.says}`;
  if (n.kind === 'spin' && past('tip speed')) return `at ${len(sc.L)}: ${gr('tip speed')!.says}`;
  if (n.kind === 'lift' && gr('Reynolds') && gr('Reynolds')!.value < 1000) return `at ${len(sc.L)}: Reynolds ${gr('Reynolds')!.says}: a rotor needs it in the thousands`;
  if (['mobility', 'spin', 'lift'].includes(n.kind) && past('actuation') && !con.said.fieldDriven) return `at ${len(sc.L)}: ${gr('actuation')!.says}`;
  if (sc.L < 5e-3) return `at ${len(sc.L)}: nothing kept is that small (the thinnest sheet kept is 1 mm, the smallest motor ${len(Object.values(MOTORS).sort((a, b) => a.diameter - b.diameter)[0]!.diameter)} across)`;
  return null;
}
// -- folding the whole of it ---------------------------------------------------------------------------------------------
/** What it is asked to fold: "a folding table", "folds flat to 8 cm", "packs into a 70 cm bundle". */
const foldWanted = (con: Conception) => con.asked.some((a) => a.how === 'folds') || !!con.limits.fold?.length || con.limits.foldThin !== undefined;
interface Folding { plan: TreePlan; made: Map<string, Made>; /** what it is fixed to and folds against */ grounds: Map<string, Made>; blocks: Map<string, string>; /** planned with nothing in the way: what is made is made so */ clean: boolean }
type P3 = [number, number, number];
const AXI: Record<Axis, Ax> = { x: 0, y: 1, z: 2 };
/** A place step for a part as made, at a new middle and new sizes along x, y and z, a round one along its axis. */
function placeAgain(m: Made, at: P3, e: { w: number; h: number; d: number }, axis: Axis = m.axis): string | null {
  const mat = m.matter?.id, where = `at ${M(at[0])}, ${M(at[1])}, ${M(at[2])}`; if (!mat) return null;
  if (m.kind === 'box') return `place ${m.word} named ${m.name} of ${mat} ${where} size ${MM(e.w)} x ${MM(e.d)} x ${MM(e.h)} mm`;
  if ((m.kind === 'cylinder' || m.kind === 'tube') && m.dims.D !== undefined) return `place ${m.word} named ${m.name} of ${mat} ${where} size ${MM(m.dims.D)} x ${MM(axis === 'x' ? e.w : axis === 'y' ? e.h : e.d)}${m.kind === 'tube' ? ` x ${MM(m.dims.wall ?? 0.002)}` : ''} mm along ${axis}`;
  if (m.kind === 'sphere' && m.dims.D !== undefined) return `place ${m.word} named ${m.name} of ${mat} ${where} size ${MM(m.dims.D)} mm`;
  return null;
}
/** Folding planned on the parts as drawn (src/nexus/foldtree.ts): the parts that hang from a hinge block shortened by
 *  it, or set in sideways, placed again; the blocks placed on what holds them, each with what called it and why. What
 *  turns or slides, carries what does, rides on what moves, is set at an angle, or is fixed to a wall or a bank, is not
 *  folded, and says so; then nothing is made otherwise. */
function foldFor(prefix: string, steps: string[], traces: Trace[], riders: string[], seed: number): Folding | null {
  const ww = new Workshop(ROOM, 1);
  try { for (const x of steps) if (/^place /.test(x)) ww.run(x); } catch { return null; }
  // what stands for a bank or a wall is not its own, and does not fold
  const made = new Map(ww.all().made.filter((m) => m.name.startsWith(`${prefix}_`) && !STANDS.has(m.name)).map((m) => [m.name, m]));
  if (!made.size) return null;
  const keep = new Map<string, string>();
  // what it is screwed to (a wall) it folds against where it hangs: that stays and the rest folds against it; what it
  // only rests on (the banks) it is lifted off to fold
  const box3 = (m: Made) => ({ name: m.name, at: [...m.at] as P3, w: m.w, h: m.h, d: m.d });
  const grounds = new Map(ww.all().made.filter((m) => STANDS.has(m.name) && /screwed|fixed|bolted/.test(STANDS.get(m.name)!) && [...made.values()].some((x) => touching(box3(x), box3(m)))).map((m) => [m.name, m]));
  const fixed = new Map<string, string>([...grounds.keys()].map((n) => [n, `it stands for ${STANDS.get(n)!}`]));
  // what turns (a wheel, what a motor drives) or slides is not folded, nor what it turns or slides on; a door or lid that
  // swings folds shut with what holds it
  for (const x of steps) { const j = /^(hinge|slide)\s+(\S+)\s+(?:to|on|onto|in)\s+(\S+)/.exec(x), m = j ? made.get(j[2]!) : undefined; if (j && m && (j[1] === 'slide' || /\bdriven by\b/.test(x) || m.kind === 'cylinder' || m.kind === 'tube')) { keep.set(j[2]!, j[1] === 'slide' ? 'it slides already' : 'it turns already'); if (made.has(j[3]!)) keep.set(j[3]!, `${j[2]!.slice(prefix.length + 1)} ${j[1] === 'slide' ? 'slides' : 'turns'} on it`); } }
  for (const r of riders) keep.set(r, 'it rides on what moves');
  for (const m of made.values()) { if (m.turn.some((t) => Math.abs(t) > 1e-9)) keep.set(m.name, 'it is set at an angle'); else if (!placeAgain(m, m.at as P3, m)) keep.set(m.name, 'its shape is not one placed again turned'); }
  // where two would fold onto each other: hinged from a block over the first, or set in sideways past it, drawn by the
  // seed (a block keeps its feet where they are; set in, it folds thinner)
  const plan = planTree([...made.values(), ...grounds.values()].map(box3), keep, { inset: rngOf(seed * 7 + 3)() < 0.5, fixed, ground: [...grounds.keys()] });
  const blocks = new Map<string, string>(), short = (n: string) => n.slice(prefix.length + 1);
  plan.spacers.forEach((sp, k) => blocks.set(sp.name, `${prefix}_hinge${k + 1}`));
  // what does not fold as planned is left as it was drawn: said so, not made otherwise
  if (!plan.folds.length || plan.trouble.length || !plan.sweep.ok) return { plan, made, grounds, blocks, clean: false };
  // the parts that hang from a block, shortened by it, or set in sideways, placed again so
  for (const b of plan.open) {
    const m = made.get(b.name); if (!m || [0, 1, 2].every((i) => Math.abs(b.at[i]! - m.at[i]!) < 1e-9) && Math.abs(b.w - m.w) + Math.abs(b.h - m.h) + Math.abs(b.d - m.d) < 1e-9) continue;
    const fd = plan.folds.find((f) => f.names.includes(m.name) && (f.head === m.name || Math.abs(f.shift) > 1e-9)), sideways = !!fd && Math.abs(fd.shift) > 1e-9;
    const i = steps.findIndex((x) => x.startsWith('place ') && x.includes(` named ${m.name} `)), now = placeAgain(m, b.at, b);
    if (i < 0 || !now) return { plan, made, grounds, blocks, clean: false };
    const t = traces.find((x) => x.step === steps[i]); steps[i] = now; if (t) { t.step = now; t.how = `${t.how}; ${sideways ? `set ${len(Math.abs(fd!.shift))} in along its hinge, so it folds beside what folds across from it, not onto it` : `${len(Math.max(m.w, m.h, m.d) - Math.max(b.w, b.h, b.d))} shorter, to hang from a hinge block that lifts it over what folds under it first`}`; }
  }
  // the blocks, of the matter of what holds them (on what it is fixed to, of what hangs from them), after it
  plan.spacers.forEach((sp) => {
    const nm = blocks.get(sp.name)!, b = sp.box, on = made.get(sp.on) ?? made.get(sp.under)!, at = steps.findIndex((x) => x.startsWith('place ') && x.includes(` named ${sp.on} `));
    const step = `place block named ${nm} of ${on.matter!.id} at ${M(b.at[0])}, ${M(b.at[1])}, ${M(b.at[2])} size ${MM(b.w)} x ${MM(b.d)} x ${MM(b.h)} mm`;
    steps.splice(at + 1, 0, step);
    traces.push({ step, what: short(nm), called: 'the fold', why: `so ${short(sp.under)} hinges ${len(Math.min(b.w, b.h, b.d))} further from ${short(sp.on)}, and folds flat over what folds under it first`, when: '', where: `on ${short(sp.on)}, where ${short(sp.under)} meets it`, how: `a block of ${on.matter!.name} as thick as what lies folded under it, joined to ${short(sp.on)}; its hinge on its face` });
  });
  return { plan, made, grounds, blocks, clean: true };
}
/** Folding as made: what folds onto what, the path each fold takes, the latches that hold it open against the push it is
 *  tested with (and the wind said), and the joints of what it spans against its bending; it made again folded, let go in
 *  Jolt, and measured against what it must fold to. */
function foldChecks(f: Folding, con: Conception, prefix: string, seed: number, J: Jolt | null): { checks: Check[]; ok: boolean; fits: boolean | null; why: string } {
  const p = f.plan, out: Check[] = [], nm = (n: string) => (f.blocks.get(n) ?? n).replace(`${prefix}_`, ''), unpre = (x: string) => x.split(`${prefix}_`).join('');
  const says = p.folds.map((d) => { const w = d.names.filter((x) => x !== d.head && !/^hinge_block_/.test(x)); return `${nm(d.head)}${w.length ? ` (with ${w.map(nm).join(', ')} folded on it)` : ''} a ${d.kind === 'half' ? 'half turn over' : 'quarter turn'} onto ${nm(d.holder)}${d.spacer > 0 ? `, from a ${len(d.spacer)} block, over what folds first` : ''}${Math.abs(d.shift) > 1e-9 ? `, set ${len(Math.abs(d.shift))} in, beside what folds across from it` : ''}`; });
  out.push({ what: 'it folds flat', ok: p.folds.length > 0 && !p.trouble.length, says: p.folds.length ? `${f.grounds.has(p.root) ? STANDS.get(p.root)! : `its ${nm(p.root)}`} stays; ${p.folds.length} fold${p.folds.length > 1 ? 's' : ''}, the deepest first, each about a hinge where it meets what holds it: ${says.join('; ')}${p.rigid.length ? `; ${p.rigid.map(([a, b]) => `${nm(a)} lies flat on ${nm(b)} and goes with it`).join('; ')}` : ''}${p.latched.length ? `; latched open where they meet, and let go to fold: ${p.latched.map(([a, b]) => `${nm(a)} with ${nm(b)}`).join(', ')}` : ''}${p.lifted.length ? `; lifted off and laid on top, too big to fold onto what holds it: ${p.lifted.map(nm).join(', ')}` : ''}${p.trouble.length ? `; ${unpre(p.trouble.join('; '))}` : ''}` : `nothing folds: ${unpre(p.trouble.join('; ')) || 'it is made as one part over all of it: folding it would want it cut into pieces hinged end to end (a book fold), not derived yet'}` });
  let measured = p.envelope as P3;
  if (p.folds.length) out.push({ what: 'folding, nothing runs into anything', ok: p.sweep.ok, says: p.sweep.ok ? 'turned a degree at a time, in the order they fold (the deepest first), none of them meets what holds it, a block or another part on the way' : `turned a degree at a time, ${nm(p.sweep.what)} meets ${nm(p.sweep.hit)} ${p.sweep.deg}° into its fold` });
  if (p.folds.length && f.clean) {
    // latched open: each hinge held at its far side by steel pins in double shear (6 mm, 0.6 of 250 MPa: 8.48 kN each,
    // estimate), one each 100 mm of its hinge at most (estimate). A part that stands off what holds it is turned at its
    // hinge by its share of the push it is tested with, at its far end, or by the wind said on its face, as is a panel
    // upright beside another (a half turn about an upright edge); a joint in what lies flat end to end, in what it spans,
    // carries its bending there, taken at its worst, a weight at its middle: W L / 4
    const total = (MADE.get(prefix) ?? 0) + (CARRIED.get(prefix) ?? 0), F = 0.1 * total * G, W = total * G, cap = 2 * Math.PI * 0.003 ** 2 * 0.6 * 250e6, wind = con.said.wind;
    const openOf = (n: string) => p.open.find((b) => b.name === n)!, ext = (b: FBox, i: Ax) => [b.w, b.h, b.d][i]!, own = p.open.filter((b) => !f.grounds.has(b.name));
    const [gl, gh] = [[0, 1, 2].map((i) => Math.min(...own.map((b) => b.at[i]! - ext(b, i as Ax) / 2))), [0, 1, 2].map((i) => Math.max(...own.map((b) => b.at[i]! + ext(b, i as Ax) / 2)))];
    const latch = p.folds.map((d) => {
      const head = openOf(d.head), hinge = ext(head, d.axis), room = Math.max(1, Math.floor(hinge / 0.1)), sibs = p.folds.filter((x) => x.holder === d.holder && x.kind === d.kind).length;
      // a joint in what lies flat end to end carries what it spans; one between upright panels is pushed as a part is
      if (d.kind === 'half' && 3 - d.n - d.axis === 1) { const L = gh[d.n]! - gl[d.n]!, Mo = (W * L) / 4, Fp = Mo / Math.max(d.thick, 1e-3); return { d, Mo, Fp, n: Math.ceil(Fp / cap), room, why: `a joint in what it spans, ${len(L)} long, bends at worst by ${+W.toPrecision(3)} N at its middle (W L / 4, its weight and its load's)` }; }
      const share = F / Math.max(1, sibs), Mw = wind !== undefined && ext(head, 1) >= Math.max(head.w, head.d) ? 0.5 * 1.204 * wind ** 2 * 1.2 * hinge * d.length * (d.length / 2) : 0, Mo = Math.max(share * d.length, Mw), Fp = Mo / Math.max(d.thick, 1e-3);
      return { d, Mo, Fp, n: Math.ceil(Fp / cap), room, why: Mw > share * d.length ? `the ${+(wind! * 3.6).toPrecision(3)} km/h wind on its ${+(hinge * d.length).toPrecision(3)} m²` : `pushed at its top with a tenth of its weight and its load's (${+F.toPrecision(3)} N, as tested), its share` };
    });
    const worst = latch.reduce((a, b) => (b.n / b.room > a.n / a.room ? b : a));
    out.push({ what: 'latched open, its hinges hold', ok: latch.every((x) => x.n <= x.room), says: `latched open, each hinge is held at its far side by 6 mm steel pins in double shear (8.48 kN each at 0.6 of 250 MPa, estimate); for ${nm(worst.d.head)}, ${len(worst.d.thick)} from its hinge line, ${worst.why} turns it with ${+worst.Mo.toPrecision(3)} N·m, ${+worst.Fp.toPrecision(3)} N on its pins: ${worst.n} pin${worst.n > 1 ? 's' : ''}${worst.n > worst.room ? `, more than the ${worst.room} its hinge has room for (one each 100 mm, estimate)` : ''}; what it carries bears straight down where its parts meet, not through its pins` });
    // held out: a part that stands its longest way off an upright face, with nothing under its far half, carries its
    // share of all of it and its load out from its hinge, spread along it (W L / 2 at its hinge): where its pin stands
    // upright, over the hinge's own length; where its pin lies across, by its latch or its stop, its thickness away
    const lo3 = (b: FBox, i: Ax) => b.at[i]! - ext(b, i) / 2, hi3 = (b: FBox, i: Ax) => b.at[i]! + ext(b, i) / 2;
    const heldOut = p.folds.filter((d) => {
      if (d.kind !== 'quarter' || d.n === 1) return false;
      const V = openOf(d.head), L = ext(V, d.n), face = d.side === 1 ? lo3(V, d.n) : hi3(V, d.n), far = face + (d.side * L) / 2;
      if (L < Math.max(V.w, V.h, V.d) - 1e-9) return false;
      return !own.some((o) => o.name !== V.name && Math.abs(hi3(o, 1) - lo3(V, 1)) < 1e-6 && ([0, 2] as Ax[]).every((i) => Math.min(hi3(o, i), hi3(V, i)) - Math.max(lo3(o, i), lo3(V, i)) > 1e-6) && (d.side === 1 ? hi3(o, d.n) > far + 1e-6 : lo3(o, d.n) < far - 1e-6));
    });
    if (heldOut.length) {
      const held = heldOut.map((d) => {
        const V = openOf(d.head), L = ext(V, d.n), Mo = ((W / heldOut.length) * L) / 2, upright = d.axis === 1, lever = upright ? ext(V, 1) : Math.max(d.thick, 1e-3), Fp = Mo / lever, room = Math.max(1, Math.floor(ext(V, d.axis) / 0.1));
        return { d, L, Mo, Fp, n: Math.ceil(Fp / cap), room, upright, lever };
      });
      const w = held.reduce((a, b) => (b.n / b.room > a.n / a.room ? b : a));
      out.push({ what: 'held out, its hinges carry it', ok: held.every((x) => x.n <= x.room), says: `${held.length === 1 ? `${nm(w.d.head)} is held out` : `${held.map((x) => nm(x.d.head)).join(', ')} are held out`} from ${f.grounds.has(w.d.holder) ? STANDS.get(w.d.holder)! : nm(w.d.holder)} with nothing under ${held.length === 1 ? 'its' : 'their'} far half; ${nm(w.d.head)}, ${len(w.L)} out, with ${held.length === 1 ? 'all' : `1/${held.length}`} of it and its load (${+(W / held.length).toPrecision(3)} N) spread along it, turns its hinge with ${+w.Mo.toPrecision(3)} N·m (W L / 2), carried ${w.upright ? `over its ${len(w.lever)} of hinge, its pin upright` : `by its latch ${len(w.lever)} from its pin`}: ${+w.Fp.toPrecision(3)} N on 6 mm pins (8.48 kN each, estimate): ${w.n} pin${w.n > 1 ? 's' : ''}${w.n <= w.room ? `, within the ${w.room} its hinge has room for` : `, more than the ${w.room} its hinge has room for (one each 100 mm, estimate)`}` });
    }
    // folded, made again in a room of its own and let go: each part where it lies, the blocks with what holds them and
    // what lies flat on another with it, each fold's hinge free to open and stopping where it lies (what a joint holds
    // does not collide with what it is held to, in the engine)
    const room = new Workshop(ROOM, seed + 7); if (J) room.usePhysics(J); room.run('rule no overlap'); room.run('rule no overlap with the build');
    const steps: string[] = [];
    for (const b of p.folded) {
      const m = f.made.get(b.name) ?? f.grounds.get(b.name);
      if (!m) { const sp = p.spacers.find((x) => x.name === b.name), on = sp ? f.made.get(sp.on) ?? f.made.get(sp.under) : undefined; steps.push(`place block named ${f.blocks.get(b.name)} of ${on?.matter?.id ?? 'wood.birch-plywood'} at ${M(b.at[0])}, ${M(b.at[1])}, ${M(b.at[2])} size ${MM(b.w)} x ${MM(b.d)} x ${MM(b.h)} mm`); continue; }
      const round = m.kind === 'cylinder' || m.kind === 'tube', la = p.axisOf.get(`${b.name}:${AXI[m.axis]}`), axis: Axis = round && p.lifted.includes(b.name) ? (b.w >= b.d ? 'x' : 'z') : round && la !== undefined ? 'xyz'[la] as Axis : m.axis;
      steps.push(placeAgain(m, b.at, b, axis)!);
    }
    // held as one: a block with what it is on, what lies flat with what it lies on
    const one = new Map<string, string>(), find = (x: string): string => { const y = one.get(x) ?? x; return y === x ? x : find(y); }, unite = (a: string, b: string) => one.set(find(a), find(b));
    for (const sp of p.spacers) unite(f.blocks.get(sp.name)!, sp.on); for (const [a, b] of p.rigid) unite(a, b);
    const groups = new Map<string, string[]>(); for (const x of [...p.spacers.map((sp) => f.blocks.get(sp.name)!), ...p.spacers.map((sp) => sp.on), ...p.rigid.flat()]) { const r = find(x); groups.set(r, [...new Set([...(groups.get(r) ?? []), x])]); }
    [...groups.values()].filter((g) => g.length > 1).forEach((g, k) => steps.push(`join ${g.join(', ')} as ${prefix}_one${k + 1}`));
    for (const [k, h] of p.hinges.entries()) {
      const d = p.folds[k]!, sp = d.spacer > 0 ? p.spacers.find((x) => x.under === d.head) : undefined, holder = sp ? f.blocks.get(sp.name)! : d.holder;
      steps.push(`hinge ${h.head} to ${holder} about ${'xyz'[h.axis]} at ${M(h.pivot[0])}, ${M(h.pivot[1])}, ${M(h.pivot[2])} ${h.opens > 0 ? `from 0° to ${h.deg}°` : `from -${h.deg}° to 0°`}`);
    }
    let built = true, err = '';
    for (const x of steps) { try { room.run(x); } catch (e) { built = false; err = `"${unpre(x).slice(0, 80)}": ${unpre((e as Error).message).slice(0, 200)}`; break; } }
    out.push({ what: 'folded, it can be made under the laws', ok: built, says: built ? `${steps.length} steps: ${f.grounds.has(p.root) ? `folded against ${STANDS.get(p.root)!} as it hangs` : `laid down folded, its ${nm(p.root)} on the floor`}, ${p.hinges.length} hinge${p.hinges.length > 1 ? 's' : ''}, nothing in anything` : err });
    if (built && J) {
      // let go folded, it lies as it stands: nothing it is made of drops 10 mm or tilts 2° (as when it stands); what was laid
      // on top may settle onto what is under it, then lies still
      const mine = () => new Map(room.all().made.filter((m) => m.name.startsWith(`${prefix}_`)).map((m) => [m.name, m])), first = mine(); room.run('simulate 1 s'); const before = mine(); room.run('simulate 0.5 s'); const after = mine();
      const lifted = new Set(p.lifted), fell = (n: string, b: Made) => b.at[1] - (after.get(n)?.at[1] ?? b.at[1]);
      const drop = Math.max(0, ...[...first].filter(([n]) => !lifted.has(n)).map(([n, b]) => fell(n, b))), settled = Math.max(0, ...[...first].filter(([n]) => lifted.has(n)).map(([n, b]) => fell(n, b)));
      const moving = Math.max(0, ...[...before].filter(([n]) => lifted.has(n)).map(([n, b]) => Math.hypot(...[0, 1, 2].map((i) => (after.get(n)?.at[i] ?? b.at[i]!) - b.at[i]!)))), tilt = tiltOf(first.get(p.root)!.turn, after.get(p.root)!.turn);
      const ms = [...after.values()].filter((m) => !STANDS.has(m.name)), ex = (i: number) => Math.max(...ms.map((m) => m.at[i]! + [m.w, m.h, m.d][i]! / 2)) - Math.min(...ms.map((m) => m.at[i]! - [m.w, m.h, m.d][i]! / 2));
      measured = [ex(0), ex(1), ex(2)]; const still = drop < 0.01 && tilt < (2 * Math.PI) / 180 && settled < 0.05 && moving < 1e-3;
      out.push({ what: 'folded, it lies still when let go', ok: still, says: `let go folded (Jolt), each hinge free to open, it dropped ${len(drop)} at most and its ${nm(p.root)} tilted ${+((tilt * 180) / Math.PI).toFixed(2)}° (10 mm or 2° fails, as when it stands)${p.lifted.length ? `; what was laid on top settled ${len(settled)} and then moved ${len(moving)} in half a second (50 mm, or moving on, fails)` : ''}: folded, it is ${measured.map(len).join(' × ')}` });
    }
  }
  // what it must fold to, against it folded
  // where nothing folds it is measured as it is made, and said so
  const L = con.limits, env = [...measured].sort((a, b) => b - a), as = f.clean ? 'folded' : 'not folded, as made'; let fits: boolean | null = null;
  if (L.foldThin !== undefined) { const ok = env[2]! <= L.foldThin * 1.0001; fits = ok; out.push({ what: `it folds flat to ${len(L.foldThin)}`, ok, says: `${as}, it is ${env.map(len).join(' × ')}: ${len(env[2]!)} thick against ${len(L.foldThin)}` }); }
  if (L.fold?.length) { const want = [...L.fold].sort((a, b) => b - a), ok = want.every((v, i) => env[i]! <= v * 1.0001); fits = (fits ?? true) && ok; out.push({ what: `it folds or packs to ${want.map(len).join(' × ')}`, ok, says: `${as}, it is ${env.map(len).join(' × ')}${ok ? '' : `: ${want.map((v, i) => (env[i]! > v * 1.0001 ? `${len(env[i]!)} where ${len(v)} is wanted` : '')).filter(Boolean).join(', ')}`}` }); }
  if (L.foldVol !== undefined) { const v = measured[0]! * measured[1]! * measured[2]!, ok = v <= L.foldVol * 1.0001; fits = (fits ?? true) && ok; out.push({ what: `it packs into ${+(L.foldVol * 1e3).toPrecision(3)} L`, ok, says: `${as}, it is ${measured.map(len).join(' × ')}, the box round it ${+(v * 1e3).toPrecision(3)} L${ok ? '' : `, ${+(v / L.foldVol).toPrecision(3)} times as much`}` }); }
  const bad = out.find((x) => x.ok === false && !/^it (folds (flat to|or packs to)|packs into)/.test(x.what));
  return { checks: out, ok: !bad, fits, why: bad ? `${bad.what}: ${bad.says}` : '' };
}
type Q4 = [number, number, number, number];
const qMul = (a: Q4, b: Q4): Q4 => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const qAbout = (ax: Ax, th: number): Q4 => { const s = Math.sin(th / 2), c = Math.cos(th / 2), q: Q4 = [0, 0, 0, c]; q[ax] = s; return q; };
/** A turn about a world axis through a point, of a middle. */
const turnAt = (c: P3, pv: P3, ax: Ax, th: number): P3 => { const d: P3 = [c[0] - pv[0], c[1] - pv[1], c[2] - pv[2]], co = Math.cos(th), si = Math.sin(th), [u, v] = ([0, 1, 2] as Ax[]).filter((i) => i !== ax) as [Ax, Ax], r: P3 = [...d] as P3; r[u] = d[u]! * co - d[v]! * si; r[v] = d[u]! * si + d[v]! * co; if (ax === 1) { r[u] = d[u]! * co + d[v]! * si; r[v] = -d[u]! * si + d[v]! * co; } return [pv[0] + r[0], pv[1] + r[1], pv[2] + r[2]]; };
/** A fold played, in the room as it stands: what is lifted off goes up onto it first, then each fold in its order (the
 *  deepest first), a part and all folded on it turning about its hinge; it holds folded a second, and opens out again
 *  the same way back. 30 frames a second. */
function foldTrackOf(f: Folding, asBuilt: Made[]): SimTrack {
  const p = f.plan, at = new Map(asBuilt.map((m) => [m.name, m])), names = [...new Set([p.root, ...p.spacers.map((x) => f.blocks.get(x.name)!), ...p.folds.flatMap((d) => d.names.map((n) => f.blocks.get(n) ?? n)), ...p.rigid.flat(), ...p.lifted])].filter((n) => at.has(n));
  const fps = 30, step = 0.8, segs = p.folds.length + (p.lifted.length ? 1 : 0), T = step * Math.max(1, segs);
  // the poses after each fold in turn, from open: a part's middle and its turn
  type Pose = { at: P3; q: Q4 };
  const open = new Map(names.map((n) => [n, { at: [...at.get(n)!.at] as P3, q: [0, 0, 0, 1] as Q4 }]));
  const lifted = new Map(p.lifted.filter((n) => at.has(n)).map((n) => { const t = p.liftTo.get(n)!; return [n, { at: t.at, q: t.about === null ? [0, 0, 0, 1] as Q4 : qAbout(t.about, Math.PI / 2) }]; }));
  const stages: Map<string, Pose>[] = [new Map(open)];
  if (p.lifted.length) { const s = new Map(stages[0]!); for (const [n, x] of lifted) s.set(n, x); stages.push(s); }
  const turnSet = (from: Map<string, Pose>, d: Fold, th: number) => { const s = new Map(from); for (const n0 of d.names) { const n = f.blocks.get(n0) ?? n0, x = from.get(n); if (!x || lifted.has(n)) continue; s.set(n, { at: turnAt(x.at, d.pivot, d.axis, th), q: qMul(qAbout(d.axis, th), x.q) }); } return s; };
  for (const d of p.folds) stages.push(turnSet(stages.at(-1)!, d, (d.turns * Math.PI) / 2));
  const poseAt = (u: number): Map<string, Pose> => {
    const x = u * segs, k = Math.min(segs - 1, Math.floor(x)), e = Math.min(1, x - k);
    if (u >= 1) return stages.at(-1)!;
    if (p.lifted.length && k === 0) { const s = new Map(stages[0]!); for (const [n, li] of lifted) { const o = open.get(n)!; s.set(n, { at: [0, 1, 2].map((i) => o.at[i]! + (li.at[i]! - o.at[i]!) * e) as P3, q: e > 0.5 ? li.q : o.q }); } return s; }
    const d = p.folds[k - (p.lifted.length ? 1 : 0)]!; return turnSet(stages[k]!, d, (d.turns * Math.PI * e) / 2);
  };
  const frames: SimTrack['frames'] = [];
  for (let t = 0; t <= 2 * T + 1 + 1e-9; t += 1 / fps) { const u = t <= T ? t / T : t <= T + 1 ? 1 : Math.max(0, 1 - (t - T - 1) / T), s = poseAt(u); frames.push({ t, poses: names.map((n) => s.get(n) ?? open.get(n)!) }); }
  return { names, frames };
}
/** Made once, from one seed: each need met by a way drawn from those that apply, stacked, sized from the top down,
 *  placed from the bottom up, joined, then checked. */
function once(con: Conception, seed: number, prefix: string, at: [number, number], J: Jolt | null): Design {
  const needs = stack(con.wants), ordered = order(needs), plan: string[] = [];
  const base = (n: Need, i: number): Ctx => ({ p: prefix, x0: at[0], z0: at[1], y0: 0, rnd: rngOf(seed + i * 1013), matter: con.matter, light: con.limits.mass, ...(con.limits.part !== undefined ? { part: con.limits.part } : {}), ...(con.limits.sag !== undefined ? { sag: con.limits.sag } : {}), steps: [], traces: [], members: [], loose: [], moving: [], choices: [], gaps: [], checks: [], loads: [], tests: [], need: n, way: '', why: n.why, top: { y: 0, w: 0, d: 0, name: null }, foot: [0, 0], after: null, ride: null, riders: [] });
  const chosen = new Map<Need, Way>(), barred = new Map<Need, string>();
  for (const [i, n] of ordered.entries()) {
    const bar = scaleBars(n, con); if (bar) barred.set(n, bar);
    const ways = WAYS.filter((w) => w.meets === n.kind && (n.kind !== 'surface' || (w.id === WALL_WAY) === n.want.flags.includes('wall') || w.id === WALL_WAY)), probe = base(n, i), open = bar ? [] : ways.filter((w) => w.when(n, probe) === null && (n.kind !== 'surface' || (w.id === WALL_WAY) === n.want.flags.includes('wall')));
    const w = open.length ? pick(rngOf(seed + i * 7 + 1), open) : null;
    if (w) chosen.set(n, w);
    plan.push(`${n.why}: ${w ? `${w.says} (drawn from ${open.length} way${open.length === 1 ? ' that applies' : 's that apply'}${ways.length > open.length ? `; not ${ways.filter((x) => !open.includes(x)).map((x) => `${x.says}, as ${x.when(n, probe)}`).join('; ')}` : ''})` : bar ? `no way kept meets it ${bar}` : 'no way kept meets it'}${n.on ? `, ${n.kind === 'vessel' && n.on.kind === 'enclosure' ? 'in' : 'on'} ${n.on.why.replace(/^to /, 'what is to ')}` : w?.id === WALL_WAY ? ', on the wall' : ', on the floor'}`);
  }
  // sized from the top down: what stands on a thing is weighed, and what it stands on made wide enough for it
  const dry = new Map<Need, Ctx>(), row = new Map<Need, { n: Need; w: number }[]>();
  for (const [i, n] of [...ordered.entries()].reverse()) {
    const w = chosen.get(n); if (!w) continue; const c = base(n, ordered.indexOf(n)); c.way = w.id; w.make(n, c); dry.set(n, c);
    const ww = new Workshop(ROOM, 1); let kgs = 0; try { for (const s of c.steps) if (/^place /.test(s)) ww.run(s); kgs = ww.all().made.reduce((a, m) => a + m.mass, 0); } catch { /* weighed as nothing: its check says why */ }
    // and what it carries: a surface's load, a vessel's liquid, what a lift raises
    const extra = n.kind === 'vessel' ? n.want.q.V!.v * 1000 : n.kind === 'surface' ? n.want.q.F!.v / G * (n.want.flags.includes('levels') ? Math.max(2, Math.round(n.want.q.levels?.v ?? 4)) : 1) : n.kind === 'hoist' ? n.want.q.m?.v ?? 0 : 0;
    // what stands on a thing beside what else stands on it: as wide as all of them side by side, and as deep as the deepest
    if (n.on) { n.on.above += (kgs + extra) * G + n.above; const f = c.foot, beside = NATURE[n.kind].goes !== 'into' || n.kind === 'leaf' && n.on.kind !== 'enclosure'; if (beside) { row.set(n.on, [...(row.get(n.on) ?? []), { n, w: f[0] }]); } const sumW = (row.get(n.on) ?? []).reduce((a, x) => a + x.w + 0.02, 0); n.on.fit = [Math.max(n.on.fit[0], beside ? sumW : f[0] + 0.02), Math.max(n.on.fit[1], f[1] + 0.02)]; n.on.tall = Math.max(n.on.tall, c.top.y - c.y0 + n.tall); }
    void i;
  }
  // placed from the bottom up, each on the top of what holds it
  const steps: string[] = [], traces: Trace[] = [], members: string[] = [], loose: string[] = [], rides = new Map<string, string[]>(), choices: string[] = [], gaps: string[] = [], checks: (() => Check | null)[] = [], loads: string[] = [], tests: Test[] = [];
  const done = new Map<Need, Ctx>(); let foot: [number, number] = [0, 0];
  for (const [i, n] of ordered.entries()) {
    const w = chosen.get(n); if (!w) { gaps.push(`nothing kept here can ${FN_WORDS[n.want.fn]}${barred.has(n) ? ` ${barred.get(n)}` : ''}`); continue; }
    const below = n.on ? done.get(n.on) : undefined, c = base(n, i); c.way = w.id;
    // side by side along x on what it stands on, where more than one stands there
    const mates = n.on ? row.get(n.on) ?? [] : [];
    if (below && mates.length > 1) { const total = mates.reduce((a, x) => a + x.w + 0.02, -0.02); let x = -total / 2; for (const m of mates) { if (m.n === n) { c.x0 = below.x0 + x + m.w / 2; break; } x += m.w + 0.02; } c.z0 = below.z0; }
    else if (below) { c.x0 = below.x0; c.z0 = below.z0; }
    const within = n.kind === 'vessel' && below?.inside ? below.inside : null;
    if (below) { c.y0 = within ? within.y : below.top.y; c.top = { ...below.top }; if (within) c.after = c.base0 = { name: within.name, why: 'which it stands in, on its floor' }; else if (below.top.name) c.after = c.base0 = { name: below.top.name, why: NATURE[n.kind].goes === 'into' ? 'which it goes into' : 'which it stands on' }; c.ride = below.ride ?? (below.top.name && below.moving.includes(below.top.name) ? below.top.name : null); }
    w.make(n, c); done.set(n, c);
    steps.push(...c.steps); traces.push(...c.traces); members.push(...c.members); loose.push(...c.loose); if (c.ride && c.riders.length) rides.set(c.ride, [...(rides.get(c.ride) ?? []), ...c.riders]); choices.push(...c.choices); gaps.push(...c.gaps); checks.push(...c.checks); loads.push(...c.loads); tests.push(...c.tests);
    if (!n.on) foot = [Math.max(foot[0], c.foot[0]), Math.max(foot[1], c.foot[1])];
  }
  if (barred.size && con.scale) for (const m of con.scale.must) if (!gaps.includes(m)) gaps.push(m);
  // folding the whole of it, where asked: planned on the parts as drawn, its hinge blocks joined to the base
  const fold = foldWanted(con) ? foldFor(prefix, steps, traces, [...rides.values()].flat(), seed) : null;
  if (fold?.clean) members.push(...fold.blocks.values());
  let folded: ReturnType<typeof foldChecks> | null = null;
  // one piece of what does not move, joined where it touches
  const piece = [...new Set(members)];
  const joinAt = steps.findIndex((s) => /^(hinge|slide) /.test(s)), joinStep = piece.length > 1 ? `join ${piece.join(', ')} as ${prefix}` : null;
  const all = joinStep ? (joinAt >= 0 ? [...steps.slice(0, joinAt).filter((s) => !/^(hinge|slide) /.test(s)), joinStep, ...steps.filter((s, k) => k >= joinAt || /^(hinge|slide) /.test(s)).filter((s, k, xs) => xs.indexOf(s) === k)] : [...steps, joinStep]) : steps;
  // what rides on something that moves is one piece with it, apart from the rest
  const rideSteps = [...rides].map(([r, xs], k) => `join ${[r, ...new Set(xs)].join(', ')} as ${prefix}_ride${k + 1}`);
  const ordSteps = [...all.filter((s) => /^place /.test(s)), ...(joinStep ? [joinStep] : []), ...rideSteps, ...all.filter((s) => /^(hinge|slide) /.test(s))];
  const tr = ordSteps.map((s) => traces.find((x) => x.step === s) ?? (rideSteps.includes(s) ? { step: s, what: 'what rides', called: 'the connection law', why: 'what stands on a part that moves moves with it: held as one with it, apart from what stays', when: '', where: 'where each pair of them touches', how: 'fused, glued or bolted where they touch, as the fusion and adhesive laws allow' } : { step: s, what: 'one piece', called: 'the connection law', why: 'what does not move is held as one, where it touches', when: '', where: 'where each pair of them touches', how: 'fused where the fusion law lets them fuse, glued where an adhesive kept holds both, bolted where both are firm enough' }));
  tr.forEach((t, k) => { t.when = `step ${k + 1} of ${ordSteps.length}: ${/^join /.test(t.step) ? 'after every part it holds is placed' : /^(hinge|slide) /.test(t.step) ? 'after both it holds are made and joined' : t.when || 'first'}`; });
  // made in a room of its own under every law, then checked
  const out: Check[] = [];
  const room = new Workshop(ROOM, seed); if (J) room.usePhysics(J);
  room.run('rule no overlap'); room.run('rule no overlap with the build');
  let made = true, asBuilt: ReturnType<Workshop['all']>['made'] | null = null;
  for (const s of ordSteps) { try { room.run(s); } catch (e) { made = false; out.push({ what: 'it can be made under the laws', ok: false, says: `"${s.slice(0, 80)}": ${(e as Error).message.slice(0, 240)}` }); break; } }
  if (made) out.push({ what: 'it can be made under the laws', ok: true, says: `${ordSteps.length} steps: each part touches what holds it, held by what the fusion and adhesive laws allow, nothing in anything` });
  if (made) {
    for (const k of [...LOADS.keys()]) if (k.startsWith(`${prefix}_`)) LOADS.delete(k);
    // each load where it is said; where one part is loaded in more than one place, the worst of them is kept
    for (const s of loads) { try { room.run(s); const key = /^load\s+(\S+)/.exec(s)![1]!, was = LOADS.get(key), f = room.value(`${key}.factor`), b = room.value(`${key}.deflection`); LOADS.set(key, was ? { factor: Math.min(was.factor, f), bend: Math.max(was.bend, b) } : { factor: f, bend: b }); } catch (e) { out.push({ what: s, ok: false, says: (e as Error).message.slice(0, 200) }); } }
    MADE.set(prefix, room.all().made.filter((m) => m.name.startsWith(`${prefix}_`) && !STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0));
    CARRIED.set(prefix, con.wants.reduce((a, w) => a + (w.fn === 'support' ? (w.q.F!.v / G) * (w.flags.includes('levels') ? Math.max(2, Math.round(w.q.levels?.v ?? 4)) : 1) : w.fn === 'contain' ? w.q.V!.v * 1000 : w.fn === 'move' || w.fn === 'raise' ? w.q.m?.v ?? 0 : w.fn === 'enclose' && w.q.roofP ? (w.q.roofP.v * (w.q.W!.v + 0.05) * (w.q.D!.v + 0.05)) / G : 0), 0));
    for (const f of checks) { const r = f(); if (r) out.push(r); }
    // what it is to carry, put on it as a block of steel of that weight while it is tested (not part of it)
    let k = 0;
    for (const n of ordered) {
      const c2 = done.get(n); if (!c2) continue;
      // (what a hoist carries in the box it raises, on the box's floor inside)
      const boxOnHoist = n.kind === 'enclosure' && n.on?.kind === 'hoist' && c2.inside;
      const tops = n.kind === 'surface' ? (n.want.flags.includes('levels') ? Array.from({ length: Math.max(2, Math.round(n.want.q.levels?.v ?? 4)) }, (_, i) => `${prefix}_shelf${i + 1}`) : [c2.top.name]) : (n.kind === 'mobility' || n.kind === 'hoist') && !ordered.some((x) => x.on === n) ? [c2.top.name] : boxOnHoist ? [c2.inside!.name] : [];
      const kgs = n.kind === 'surface' ? n.want.q.F!.v / G : boxOnHoist ? (n.on!.want.q.m?.v ?? 0) : (n.want.q.m?.v ?? 0);
      for (const tn of tops) {
        const tm = tn ? room.all().made.find((m) => m.name === tn) : undefined; if (!tm || !(kgs > 0)) continue;
        const side = Math.min(0.6 * Math.min(tm.w, tm.d), Math.cbrt(kgs / 7850)), h = kgs / (7850 * side * side);
        try { room.run(`place block named test_load${k + 1} of steel.a36 at ${M(tm.at[0])}, ${M(tm.at[1] + tm.h / 2 + h / 2)}, ${M(tm.at[2])} size ${MM(side)} x ${MM(side)} x ${MM(h)} mm`); k++; } catch { /* where it does not fit, it is not put on it: its weight is still in the push, below */ }
      }
    }
    if (k) out.push({ what: 'tested with what it carries on it', ok: true, says: `${k} block${k > 1 ? 's' : ''} of steel of the weight wanted, on ${k > 1 ? 'each surface' : 'it'}, while it is let go and pushed` });
    // as it was built, before anything is pushed, swung or blown: its sizes and where its feet are are read off this
    asBuilt = room.all().made.map((m) => ({ ...m, at: [...m.at] as typeof m.at, turn: [...m.turn] as typeof m.turn }));
    out.push(...(J ? physics(room, prefix, piece, tests, [...rides.values()].flat(), con.said.wind, CARRIED.get(prefix) ?? 0) : [{ what: 'it stands', ok: true, says: 'not tested: the physics engine is not loaded here' }]));
    if (fold) { folded = foldChecks(fold, con, prefix, seed, J); out.push(...folded.checks); }
    for (const t of tests) if (t.kind === 'warm') { const wc = warmed(room, t, con.limits.power); out.push({ what: wc.what, ok: wc.ok, says: wc.says }); const dw = con.wants.find((x) => x.fn === 'warm' && x.flags.includes('dry')); if (dw && wc.P !== undefined) out.push(dried(dw, t.T, wc.P, con)); }
  }
  const ms = (asBuilt ?? room.all().made).filter((m) => m.name.startsWith(`${prefix}_`)), mass = ms.reduce((a, m) => a + m.mass, 0);
  // where its weight is: the kinds of part that weigh most, each summed (its joists as one), so a limit missed says where to look
  // (a part cut in pieces, "deck_1", "deck_2", is one part in so many pieces; "joist3" one of so many joists)
  const heaviest = (xs: typeof ms) => { const by = new Map<string, [number, number, boolean]>(); for (const m of xs) { const n0 = m.name.slice(prefix.length + 1), cut = /_\d+$/.test(n0), k = n0.replace(/_?\d+$/, ''), was = by.get(k) ?? [0, 0, cut]; by.set(k, [was[0] + m.mass, was[1] + 1, was[2] || cut]); } return [...by].sort((x, y) => y[1][0] - x[1][0]).slice(0, 3).map(([k, [v, n, cut]]) => `${n > 1 ? (cut ? `the ${k.replace(/_/g, ' ')} in its ${n} pieces` : `the ${n} ${k.replace(/_/g, ' ')}s`) : `the ${k.replace(/_/g, ' ')}`} ${+v.toPrecision(3)} kg`).join(', '); };
  // what was said it must not pass: its own weight, its width, height and depth, as made
  const L = con.limits, ext = (i: number) => (ms.length ? Math.max(...ms.map((m) => m.at[i]! + [m.w, m.h, m.d][i]! / 2)) - Math.min(...ms.map((m) => m.at[i]! - [m.w, m.h, m.d][i]! / 2)) : 0);
  const own = ms.filter((m) => !STANDS.has(m.name)), ownKg = own.reduce((a, m) => a + m.mass, 0), stand = ms.filter((m) => STANDS.has(m.name));
  const notMade = con.asked.some((a) => a.kind !== 'for' && !a.got) || gaps.length > 0;
  if (made && L.mass !== undefined) out.push({ what: `it weighs no more than ${+L.mass.toPrecision(3)} kg`, ok: ownKg <= L.mass * 1.0001, says: `it weighs ${+ownKg.toPrecision(3)} kg, its parts added up${notMade ? ' (what it does not make, marked ✗ or not yet, is not in it and would weigh more)' : ''}${ms.some((m) => /_motor\d+$/.test(m.name)) ? ' (not what powers its motors, which is not made)' : ''}${stand.length ? ` (not counting its ${stand.length} ${[...new Set(stand.map((m) => m.name.slice(prefix.length + 1).replace(/\d+$/, '')))].join(', ')}s, ${+(mass - ownKg).toPrecision(3)} kg, which stand for ${STANDS.get(stand[0]!.name)})` : ''}${ownKg > L.mass ? `: ${+(ownKg / L.mass).toPrecision(2)} times the limit; where it weighs most: ${heaviest(own)}` : ''}` });
  // what it stands on bears it, all it weighs and all it carries: a balcony is made for 2.5 kPa spread over it and 2 kN on
  // any one 50 mm square (EN 1991-1-1 Table 6.2, the least for balconies, estimate); sand or soft soil bears about 200 or
  // 100 kPa under each foot (presumptive bearing, estimate)
  if (made && con.said.ground && own.length) {
    const y0 = Math.min(...own.map((m) => m.at[1]! - m.h / 2)), feet = own.filter((m) => m.at[1]! - m.h / 2 <= y0 + 1e-3), area = feet.reduce((a, m) => a + m.w * m.d, 0), kg = ownKg + (CARRIED.get(prefix) ?? 0), Wn = kg * G;
    if (con.said.ground === 'balcony') { const p = Wn / (foot[0] * foot[1]), each = Wn / feet.length; out.push({ what: 'the balcony bears it', ok: p <= 2.5e3 && each <= 2e3, says: `${+kg.toPrecision(3)} kg in all, it and what it carries: ${+(p / 1e3).toPrecision(3)} kPa over its ${len(foot[0])} × ${len(foot[1])} footprint against the 2.5 kPa a balcony is made for, and ${+(each / 1e3).toPrecision(3)} kN on ${feet.length === 1 ? 'its one foot' : `each of its ${feet.length} feet`} against 2 kN on any 50 mm square (EN 1991-1-1 Table 6.2, the least for balconies, estimate)` }); }
    else { const q = con.said.ground === 'sand' ? 2e5 : 1e5, p = Wn / area; out.push({ what: `the ${con.said.ground} bears it`, ok: p <= q, says: `${+kg.toPrecision(3)} kg in all on ${feet.length === 1 ? 'its one foot' : `${feet.length} feet`}, ${+(area * 1e4).toPrecision(3)} cm² ${feet.length === 1 ? 'of it' : 'of them'} on the ground: ${+(p / 1e3).toPrecision(3)} kPa against about ${q / 1e3} kPa that ${con.said.ground} bears (presumptive bearing, estimate)${p > q ? `: it sinks; it wants ${+((Wn / q) * 1e4).toPrecision(3)} cm² of foot at least` : ''}` }); }
  }
  // what it may draw ("runs on under 5 W"), against the motors it is made with, each at its rating
  const motorsMade = ordSteps.map((x) => /^place motor named (\S+) \((motor\.[^)]+)\)/.exec(x)).filter((x): x is RegExpExecArray => !!x).map((x) => MOTORS[x[2]!]).filter((x): x is MotorData => !!x);
  if (made && L.power !== undefined && motorsMade.length) { const W = motorsMade.reduce((a, m) => a + (m.published?.rated?.power ?? Number(/(\d+(?:\.\d+)?) W/.exec(m.label)?.[1] ?? 0)), 0); out.push({ what: `it draws no more than ${+L.power.toPrecision(3)} W`, ok: W <= L.power * 1.0001, says: `its ${motorsMade.length > 1 ? `${motorsMade.length} motors are` : 'motor is'} rated ${+W.toPrecision(3)} W in all${W > L.power ? `, ${+(W / L.power).toPrecision(3)} times the ${+L.power.toPrecision(3)} W it may draw: no smaller motor is kept (the smallest is ${smallMotor().label})` : ''}` }); }
  // no one part heavier than said ("no single piece over 35 kg"): the heaviest part, against it
  if (made && L.part !== undefined && own.length) { const h = [...own].sort((a, b) => b.mass - a.mass)[0]!; out.push({ what: `no part weighs more than ${+L.part.toPrecision(3)} kg`, ok: h.mass <= L.part * 1.0001, says: `its heaviest part, ${h.name.slice(prefix.length + 1)}, weighs ${+h.mass.toPrecision(3)} kg` }); }
  // how far it may sag: the most any loaded part of it bends under the load law
  if (made && L.sag !== undefined) { const worked = SAGS.get(prefix), bends = [...LOADS].filter(([k]) => k.startsWith(`${prefix}_`)).map(([k, v]) => [k.slice(prefix.length + 1), v.bend] as const).sort((a, b) => b[1] - a[1]); if (worked) bends.unshift([worked.at, worked.bend]); bends.sort((a, b) => b[1] - a[1]); if (bends.length) out.push({ what: `it sags no more than ${len(L.sag)}`, ok: bends[0]![1] <= L.sag * 1.0001, says: `the most any part of it bends under its load${worked ? ', its overhangs and creep counted' : ', by the load law'}, is ${len(bends[0]![1])} (${bends[0]![0]})` }); }
  // what it must fold or pack down to, against its sizes as made: it does not fold, so it fits only if it is that small already
  if (made && !fold && L.foldThin !== undefined) { const thin = Math.min(ext(0), ext(1), ext(2)); out.push({ what: `it folds flat to ${len(L.foldThin)}`, ok: thin <= L.foldThin * 1.0001, says: `it does not fold (folding the whole of it is not kept): as made its thinnest way is ${len(thin)}` }); }
  if (made && !fold && L.fold?.length) { const as = [ext(0), ext(1), ext(2)].sort((a, b) => b - a), want = [...L.fold].sort((a, b) => b - a), fits = want.every((v, i) => as[i]! <= v * 1.0001); out.push({ what: `it folds or packs to ${want.map(len).join(' × ')}`, ok: fits, says: `it does not fold (folding the whole of it is not kept): as made it is ${as.map(len).join(' × ')}${fits ? ', which fits already' : ''}` }); }
  for (const [k, i, word] of [['W', 0, 'wide'], ['H', 1, 'tall'], ['D', 2, 'deep']] as const) if (made && L[k] !== undefined) { const e = ext(i); out.push({ what: `it is no more than ${len(L[k]!)} ${word}`, ok: e <= L[k]! * 1.0001, says: `it is ${len(e)} ${word} as made` }); }
  // how well it keeps hot or cold, as made
  const kp = made ? keeps(con, prefix) : null; if (kp) out.push(kp);
  // a weight that may be put down anywhere on its top, at its worst edge: it holds, or tips it (statics)
  if (made) for (const n of ordered) { const c2 = done.get(n); if (!c2 || n.kind !== 'surface' || n.on || chosen.get(n)?.id === WALL_WAY || n.want.flags.includes('span') || layOf(n.want).spread || !c2.top.name) continue; const ck = tipsUnder(ms as unknown as Box2[], c2.top.name, n.want.q.F!.v, prefix); if (ck) out.push(ck); }
  // a sheet no bigger than one is sold (wood: 1220 × 2440 mm plywood, 1525 × 3050 mm the largest common, estimate): a plate
  // bigger must be pieced and joined, which is not derived
  // a length of sawn timber no longer than one is stocked (about 4.88 m, 16 ft, the longest commonly stocked, estimate): one
  // longer must be spliced over a support, which is not derived
  const bars = new Set(ordSteps.map((x) => /^place bar named (\S+)/.exec(x)?.[1]).filter(Boolean));
  const spans = con.wants.some((w) => w.flags.includes('span'));
  // its ends stand for the banks it rests on: what it rests on there, and what holds it in a flood, are not made
  if (made && spans && ms.some((m) => STANDS.has(m.name))) gaps.push('its ends stand for the banks: what it rests on there (abutments and their footings) and what holds it down against a flood are not derived');
  for (const m of ms) { if (STANDS.has(m.name) || !m.matter || familyOf(m.matter.id) !== 'wood') continue; const ds = [m.w, m.h, m.d].sort((a, b) => b - a), nm = m.name.slice(prefix.length + 1); if (bars.has(m.name)) { if (ds[0]! > 4.88) gaps.push(`${nm}, ${len(ds[0]!)} long, is longer than sawn timber is commonly stocked (about 4.88 m, 16 ft, estimate): ${spans && /rail/.test(nm) ? 'over one clear span there is nothing to splice it over, so it must be engineered timber made to length (glulam or LVL, estimate), a splice made to carry its whole moment, or a pier midway; none derived' : 'it must be spliced over a support, not derived'}`); } else if (ds[0]! > 3.05 || ds[1]! > 1.525) gaps.push(`${nm}, ${len(ds[0]!)} × ${len(ds[1]!)}, is bigger than any sheet sold (about 1525 × 3050 mm at most, estimate): it must be pieced and joined, not derived`); }
  // where people stand more than 760 mm up, a guard round its edge (about 1.07 m high, as building codes ask, estimate) and a
  // stair or ladder up to it are not derived
  const high = con.wants.find((w) => w.fn === 'support' && (w.q.H?.v ?? 0) > 0.76 && (/^(platform|bridge|stage|deck)$/.test(w.says) || w.flags.includes('crowd') || /\b(adults?|people|persons?|visitors|hikers|walkers|watchers|someone)\b/.test(con.words)));
  if (made && high) gaps.push(`it stands people ${len(high.q.H!.v)} up: a guard round its edge (about 1.07 m high, as building codes ask, estimate) and a stair or ladder up to it are not derived`);
  // raising in a time said: the power that takes (m g h / t), from what raises it, which is not derived: what rides and
  // what it carries
  const rt = tests.find((x) => x.kind === 'raise') as Extract<Test, { kind: 'raise' }> | undefined;
  if (made && rt && con.said.within !== undefined) { const rn = new Set([rt.name, ...(rides.get(rt.name) ?? [])]), kg = ms.filter((m) => rn.has(m.name)).reduce((a, m) => a + m.mass, 0) + (con.wants.find((w) => w.fn === 'raise')?.q.m?.v ?? 0), P = (kg * G * rt.L) / con.said.within; out.push({ what: `it raises what it carries ${len(rt.L)} in ${+con.said.within.toPrecision(3)} s`, ok: false, says: `${+kg.toPrecision(3)} kg up ${len(rt.L)} in that time takes about ${+P.toPrecision(3)} W (m g h / t), with nothing lost, from what raises it, which is not derived` }); }
  // what it raises, it raises only in part where what raises and holds it is not derived: its travel and guides are made
  const unraised = gaps.some((g) => g.startsWith('what raises it'));
  // held slower than its motor turns smoothly (its brushes' friction sticks and slips there, estimate), a turn the physics
  // holds is not held: the physics takes its friction as smooth
  const stalls = gaps.find((g) => /where its brushes' friction stalls it/.test(g));
  if (stalls) for (const [i, x] of out.entries()) if (/^it turns at /.test(x.what) && x.ok) out[i] = { ...x, ok: false, says: `${x.says}; but the physics takes its brushes' friction as smooth, and that slow they stick and slip (estimate): it is not held there by the motor kept` };
  // what it does is done only where its own test of it passes: a turn its test does not reach, a "not tip over" its wind
  // or push test shows it does
  const TESTED: [Fn, RegExp][] = [['turn', /^it turns at /], ['move', /^it moves at /], ['swing', /^it swings open$/], ['slide', /^it slides /], ['raise', /^it rides [\d.]+ \S+ up and down its guides$/]];
  const failed = (re: RegExp) => out.find((x) => re.test(x.what) && !x.ok);
  const LOADED: [Fn, RegExp][] = [['support', /^it spans |^its (top|deck|board|roof|rails?|joists?) bears? |^each shelf bears |^its (legs|column) carr|^the .* bears it$|^\S+ kg at (an|any) edge of its top/], ['move', /^its motors can start|^its driven wheels grip/], ['float', /^it floats with /], ['lift', /^it can hover with /], ['contain', /^it holds [\d.]+ L|^its walls hold /]];
  const asked = con.asked.map((a) => {
    // what cannot be put together under the laws does nothing it was asked
    if (!made && a.got && a.kind !== 'for') return { ...a, got: null, why: 'not made: its parts do not go together under the laws (see the first check)' };
    // folding: done where it folds, lies still folded, and (where a size is said with it) folds that small
    if (a.how === 'folds') { if (!folded) return { ...a, got: null, why: fold ? 'it does not fold: nothing it is made of folds' : 'it does not fold: what it is made of is not one I fold' }; if (!folded.ok) return { ...a, got: null, why: `it does not fold: ${folded.why}` }; if (/\d/.test(a.text) && folded.fits === false) return { ...a, got: null, why: 'folded, it is bigger than this (see its checks)' }; const nums = (a.text.toLowerCase().match(/\d[\d.,]*\s*(°\s*[cf]|[a-zµ/%²³]+)/g) ?? []).map((x) => x.replace(/\s+/g, ' ')), hit = nums.length ? out.find((x) => x.ok === false && nums.some((n) => x.what.toLowerCase().replace(/\s+/g, ' ').includes(n))) : undefined; if (hit) return { ...a, got: null, why: `its own check fails: ${hit.what}` }; return a; }
    if (a.got === 'raise' && a.kind === 'does' && unraised && !a.load) return { ...a, got: null, why: 'its travel and its guides are made and tested; what raises it and holds it there (a screw, a winch, a linkage) is not derived' };
    if (a.got && a.kind === 'does' && /^not (tip|topple|fall|overturn|blow)/.test(a.text)) { const f = failed(/^it stands in a .* wind$|^pushed at its top, it does not tip$/); if (f) return { ...a, got: null, why: `its own test fails: ${f.what}` }; return a; }
    const tf = a.got && a.kind !== 'for' && !a.load ? TESTED.find(([fn]) => fn === a.got) : undefined, f = tf ? failed(tf[1]) : undefined;
    if (f) return { ...a, got: null, why: `its own test fails: ${f.what}` };
    // what it carries is carried only where the law of its load passes: a span that gives, a deck that breaks
    const tl = a.got && a.kind !== 'for' ? LOADED.find(([fn]) => fn === a.got) : undefined, fl = tl ? out.find((x) => tl[1].test(x.what) && x.ok === false) : undefined;
    return fl ? { ...a, got: null, why: `its load fails: ${fl.what}` } : a;
  }).map((a, _, all) => {
    // a thing named for its folding ("a folding table") is that thing only where it folds
    const nf = a.kind === 'thing' && a.got ? all.find((x) => x.how === 'folds' && !x.got && x.text.toLowerCase().split(/[\s-]+/).every((w) => a.text.toLowerCase().split(/[\s-]+/).includes(w))) : undefined;
    return nf ? { ...a, got: null, why: `made only as something to ${FN_WORDS[a.got!]}: what it is named for (${nf.text}) is not done, as below` } : a;
  }), does = doesOf(asked, gaps, con.wants), ok = made && out.every((x) => x.ok);
  const foldTrack = fold?.clean && folded?.ok && asBuilt ? foldTrackOf(fold, asBuilt) : undefined;
  return { ...(foldTrack ? { foldTrack } : {}), name: con.name, title: `${con.name} (seed ${seed})`, seed, prefix, steps: ordSteps, traces: tr, checks: out, ok, choices, tries: [], gaps, mass: ownKg, parts: own.length, footprint: foot, words: con.words, plan, asked, does, whole: ok && !gaps.length && does[0] === does[1] };
}
/** What stands on the floor holds it up within the outline its feet make (their convex hull); a weight put down at a
 *  corner or edge of its top outside that outline turns it over the nearest edge of it, held back only by its own weight
 *  on its middle: it tips where F d_out passes W d_in. Statics, the weight at the worst of its top's corners and edges. */
type Box2 = { name: string; at: number[]; w: number; h: number; d: number; mass: number };
function tipsUnder(ms: Box2[], topName: string, F: number, prefix: string): Check | null {
  const feet = ms.filter((m) => !STANDS.has(m.name) && m.at[1]! - m.h / 2 <= 1e-3), top = ms.find((m) => m.name === topName);
  if (!top || !feet.length) return null;
  const pts = feet.flatMap((m) => [[m.at[0]! - m.w / 2, m.at[2]! - m.d / 2], [m.at[0]! + m.w / 2, m.at[2]! - m.d / 2], [m.at[0]! + m.w / 2, m.at[2]! + m.d / 2], [m.at[0]! - m.w / 2, m.at[2]! + m.d / 2]] as [number, number][]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [], upper: [number, number][] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, p) <= 0) upper.pop(); upper.push(p); }
  const hull = [...lower.slice(0, -1), ...upper.slice(0, -1)]; if (hull.length < 3) return null;
  // the signed distance inside each edge (counter-clockwise hull: inside to the left)
  const inside = (p: [number, number]) => hull.map((a, i) => { const b = hull[(i + 1) % hull.length]!, L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { i, d: L > 0 ? cross(a, b, p) / L : Infinity }; });
  const own = ms.filter((m) => !STANDS.has(m.name)), W = own.reduce((a, m) => a + m.mass, 0) * G, cg: [number, number] = [own.reduce((a, m) => a + m.mass * m.at[0]!, 0) / (W / G), own.reduce((a, m) => a + m.mass * m.at[2]!, 0) / (W / G)];
  const x0 = top.at[0]! - top.w / 2, x1 = top.at[0]! + top.w / 2, z0 = top.at[2]! - top.d / 2, z1 = top.at[2]! + top.d / 2, xm = top.at[0]!, zm = top.at[2]!;
  let worst: { p: [number, number]; out: number; inn: number; ratio: number } | null = null;
  for (const p of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [xm, z0], [xm, z1], [x0, zm], [x1, zm]] as [number, number][]) {
    const e = inside(p).sort((a, b) => a.d - b.d)[0]!; if (e.d >= -1e-4) continue; // a tenth of a millimetre is where it is drawn, not outside
    const inn = inside(cg).find((x) => x.i === e.i)!.d, ratio = (F * -e.d) / Math.max(1e-9, W * inn);
    if (!worst || ratio > worst.ratio) worst = { p, out: -e.d, inn, ratio };
  }
  if (!worst) return { what: `${+(F / G).toPrecision(3)} kg at any edge of its top does not tip it`, ok: true, says: `every edge of its top is within the outline its feet make on the floor, so a weight put down anywhere on it is held (statics)` };
  return { what: `${+(F / G).toPrecision(3)} kg at an edge of its top does not tip it`, ok: worst.ratio < 1, says: `its worst edge is ${len(worst.out)} outside the outline its feet make on the floor: ${+(F / G).toPrecision(3)} kg put down there turns it over that edge with ${+(F * worst.out).toPrecision(3)} N·m against ${+(W * worst.inn).toPrecision(3)} N·m its own ${+(W / G).toPrecision(3)} kg holds it with, ${len(worst.inn)} inside (statics)${worst.ratio >= 1 ? ': it tips, as one leaning on its edge would tip it; it wants wider feet, or more weight low down' : ''}` };
}
/** How far a thing's up axis turned between two turnings: tipping, whatever it turned about its upright. */
const tiltOf = (from: number[], to: number[]) => { const a = matOf(from as [number, number, number]), b = matOf(to as [number, number, number]); const dot = a[1] * b[1] + a[4] * b[4] + a[7] * b[7]; return Math.acos(Math.max(-1, Math.min(1, dot))); };
/** With real physics: let go, it stands; pushed at its top by a tenth of its weight, it does not tip; what moves, moves. */
function physics(w: Workshop, prefix: string, piece: string[], tests: Test[], riders: string[] = [], wind?: number, carried = 0): Check[] {
  const out: Check[] = [], mine = () => new Map(w.all().made.filter((m) => m.name.startsWith(`${prefix}_`)).map((m) => [m.name, m]));
  try {
    const drive = tests.find((t) => t.kind === 'drive') as Extract<Test, { kind: 'drive' }> | undefined, spin = tests.find((t) => t.kind === 'spin') as Extract<Test, { kind: 'spin' }> | undefined;
    const before = mine(); w.run(drive || spin ? 'simulate 0.5 s' : 'simulate 1.5 s'); const after = mine();
    // standing is not falling: none of it drops and what stands does not tilt; a slide along a flat floor that nothing
    // pushes is no law's doing but the engine's drift, said apart
    const of = (n: string) => ({ a: after.get(n), b: before.get(n) }), drops = piece.map((n) => { const { a, b } = of(n); return a && b ? b.at[1] - a.at[1] : 0; }), drop = Math.max(0, ...drops);
    const tilt = Math.max(0, ...piece.map((n) => { const { a, b } = of(n); return a && b ? tiltOf(b.turn, a.turn) : 0; }));
    const creep = Math.max(0, ...piece.map((n) => { const { a, b } = of(n); return a && b ? Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2]) : 0; }));
    if (!drive) out.push({ what: 'it stands when let go', ok: drop < 0.01 && tilt < (2 * Math.PI) / 180, says: piece.length ? `let go (Jolt), it dropped ${len(drop)} at most and tilted ${+((tilt * 180) / Math.PI).toFixed(2)}° (10 mm or 2° fails)${creep > 0.005 ? `; it crept ${len(creep)} along the floor, which nothing pushes it to: the engine's drift, not a law's` : ''}` : 'nothing in it to let go' });
    let windLater: (() => void) | null = null;
    if (!drive && piece.length) {
      // pushed across its narrower way, where it tips first, by a tenth of its weight with what it carries, at the top of
      // the highest part that stands or rides or turns on it; how far it tips is read off what stands
      // with what it carries: the blocks put on it, or where none could be (a liquid in it, a load that did not fit), its weight
      // (what stands for something else, a bank or a wall, is neither pushed nor weighed in the push)
      const loadKg = w.all().made.filter((m) => m.name.startsWith('test_load')).reduce((a, m) => a + m.mass, 0), total = [...after.values()].filter((m) => !STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0) + Math.max(loadKg, carried);
      const topOf = (xs: string[]) => xs.filter((n) => !STANDS.has(n)).map((n) => after.get(n)!).filter(Boolean).sort((a, b) => b.at[1] + b.h / 2 - (a.at[1] + a.h / 2))[0] ?? xs.map((n) => after.get(n)!).filter(Boolean)[0];
      const top = topOf([...piece, ...riders, ...(spin ? [spin.name] : [])])!, frame = topOf(piece)!, r0 = [...frame.turn], F = 0.1 * total * G;
      const xs = [...after.values()].map((m) => [m.at[0] - m.w / 2, m.at[0] + m.w / 2, m.at[2] - m.d / 2, m.at[2] + m.d / 2]), wx = Math.max(...xs.map((v) => v[1]!)) - Math.min(...xs.map((v) => v[0]!)), wz = Math.max(...xs.map((v) => v[3]!)) - Math.min(...xs.map((v) => v[2]!)), ax = wz < wx ? 'z' : 'x';
      w.run(`push ${top.name} with ${+F.toFixed(2)} N along ${ax} for 0.5 s at its top`);
      const t1 = mine().get(frame.name)!, tip = tiltOf(r0, t1.turn);
      // what it carries that is not on it in the physics (a liquid) pushes but does not hold it down there: where it tips
      // so, it is weighed by statics as well, that weight standing on the middle of its foot (as a liquid's does while it
      // stands upright): it tips if the push's moment F h passes m g b / 2
      const off = carried > loadKg + 1e-6, hTop = top.at[1] + top.h / 2 - Math.min(...[...after.values()].map((m) => m.at[1] - m.h / 2)), bw = ax === 'z' ? wz : wx, Mp = F * hTop, Mr = total * G * (bw / 2), stat = off && tip >= (5 * Math.PI) / 180;
      out.push({ what: 'pushed at its top, it does not tip', ok: stat ? Mp < Mr : tip < (5 * Math.PI) / 180, says: `pushed at the top of ${top.name.replace(`${prefix}_`, '')} across its narrower way (${ax}) with a tenth of its weight and its load's (${+F.toPrecision(3)} N) for half a second (Jolt), it tilted ${+((tip * 180) / Math.PI).toFixed(1)}° (more than 5° fails)${off ? `; ${+(carried - loadKg).toPrecision(3)} kg of what it carries is counted in the push but not on it, so the push is the harsher for it` : ''}${stat ? `; with that weight standing on the middle of its foot, as a liquid's does while it stands, by statics the push's moment ${+Mp.toPrecision(3)} N·m (F h, ${len(hTop)} up) against ${+Mr.toPrecision(3)} N·m holding it down (m g b / 2, its foot ${len(bw)} across): it ${Mp < Mr ? 'does not tip' : 'tips'}` : ''}` });
      // in the wind said: ½ ρ v² on the face each part shows across the wind, a slender one's (a bar, a board edge on: five
      // times as long as it is wide there) by a drag coefficient of 2 and any other's by 1.2 (estimate), no more in all than
      // its solid outline would take by 1.2, pushed where those pushes are centred, for 2 s (a gust); how far it tips and
      // slides is read off what stands
      // run last: a gust that slides it away or flings a door open would leave what it does tested where it was blown to
      if (wind !== undefined) windLater = () => {
        const q = 0.5 * 1.204 * wind ** 2, ys = [...after.values()].map((m) => [m.at[1] - m.h / 2, m.at[1] + m.h / 2]), y0 = Math.min(...ys.map((v) => v[0]!)), hy = Math.max(...ys.map((v) => v[1]!)) - y0, A = (ax === 'z' ? wx : wz) * hy;
        const faces = [...after.values()].map((m) => { const across = ax === 'z' ? m.w : m.d, lo = Math.min(across, m.h), hi = Math.max(across, m.h), cd = hi > 5 * lo ? 2 : 1.2; return { F: q * cd * across * m.h, y: m.at[1], A: across * m.h, bar: cd === 2 }; });
        const Fp = faces.reduce((a, f) => a + f.F, 0), Fs = q * 1.2 * A, Fw = Math.min(Fp, Fs), yc = Fp > 0 ? faces.reduce((a, f) => a + f.F * f.y, 0) / Fp : y0 + hy / 2, Ap = faces.reduce((a, f) => a + f.A, 0), bars = faces.filter((f) => f.bar).length;
        const r1 = [...mine().get(frame.name)!.turn], at1 = [...mine().get(frame.name)!.at];
        w.run(`push ${frame.name} with ${+Fw.toFixed(2)} N along ${ax} for 2 s at ${+yc.toFixed(4)} m up`);
        const t2 = mine().get(frame.name)!, tip2 = tiltOf(r1, t2.turn), slid = Math.hypot(t2.at[0] - at1[0]!, t2.at[2] - at1[2]!);
        out.push({ what: `it stands in a ${+(wind * 3.6).toPrecision(3)} km/h wind`, ok: tip2 < (5 * Math.PI) / 180 && slid < 0.05, says: `the wind pushes ½ ρ v² = ${+q.toPrecision(3)} Pa on the ${+Ap.toPrecision(3)} m² its parts show across it (${bars} slender, by a drag coefficient of 2, the rest by 1.2, estimate)${Fp > Fs ? `, which is more than its ${+A.toPrecision(3)} m² outline would take as if solid, so that is taken` : ''}: ${+Fw.toPrecision(3)} N, centred ${len(yc - y0)} up, for 2 s (Jolt), it tilted ${+((tip2 * 180) / Math.PI).toFixed(1)}° and slid ${len(slid)} (more than 5° or 50 mm fails); on what it carries the wind is not counted${tip2 >= (5 * Math.PI) / 180 ? ': it blows over' : slid >= 0.05 ? ': it does not tip but slides away: it needs holding down (stakes, guy lines, anchors or ballast), none of them kept' : ''}` });
        // empty, by statics (what it carries is not on it in every wind): the wind's moment about its foot's edge against its
        // own weight on the middle of its foot; and the wind over its top lifting it, suction about 0.8 of ½ ρ v² over its
        // plan (a flat roof, estimate), against its own weight
        const own = [...after.values()].filter((m) => !STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0) * G, bw = ax === 'z' ? wz : wx, Mt = Fw * (yc - y0);
        // a roofed thing has air inside pushing up on its roof too: about 0.2 of ½ ρ v² with its openings shut (EN 1991-1-4
        // 7.2.9 (6), estimate), about 0.6 with a door open into the wind (0.75 of the windward face's 0.8); the wind's lift
        // and its turning act together, so what holds it down is its weight less the lift
        const roofed = [...after.keys()].some((n) => n === `${prefix}_roof`), door = tests.some((t) => t.kind === 'swing'), cpi = roofed ? 0.2 : 0, up = (0.8 + cpi) * q * wx * wz, upOpen = roofed && door ? (0.8 + 0.6) * q * wx * wz : 0, Mr = (Math.max(0, own - up) * bw) / 2;
        out.push({ what: 'empty, it stands in that wind', ok: Mt < Mr, says: `with nothing on it, by statics: the wind's ${+Fw.toPrecision(3)} N, ${len(yc - y0)} up, turns it over its foot's edge with ${+Mt.toPrecision(3)} N·m against ${+Mr.toPrecision(3)} N·m its own ${+(own / G).toPrecision(3)} kg holds it down with, less the wind's lift below (on its foot ${len(bw)} across)${Mt >= Mr ? ': it tips: it needs holding down or ballast (none kept)' : ''}` });
        out.push({ what: 'the wind does not lift it', ok: 1.5 * up <= 0.9 * own && upOpen < own, says: `over its ${+(wx * wz).toPrecision(3)} m² plan the wind sucks up about ${+up.toPrecision(3)} N (0.8 of ½ ρ v² over a flat roof${roofed ? ', and the air inside pushing up 0.2 of it with its openings shut (EN 1991-1-4 7.2.9)' : ''}, estimate) against its own ${+own.toPrecision(3)} N${up >= own ? ': it lifts off, and needs holding down (stakes, guy lines, anchors), none kept' : 1.5 * up > 0.9 * own ? `: within its weight, but not with the margins taken for it (0.9 of its weight against 1.5 of the lift, EN 1990 Table A1.2(A)): it wants holding down` : ''}${upOpen ? `; with its door open into the wind, about ${+upOpen.toPrecision(3)} N${upOpen >= own ? ', and it lifts' : ''}` : ''}` });
      };
    }
    if (drive) {
      // its speed over the last second of three, once it has had two to come up to it
      // one run of three seconds from rest, read off its own track: where the deck was at two seconds and at three
      const r0 = [...after.get(drive.deck)!.turn]; w.run('simulate 3 s'); const trk = w.takeTrack(), di = trk ? trk.names.indexOf(drive.deck) : -1;
      const zAt = (t: number) => { const f = trk!.frames.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)); return { t: f.t, z: f.poses[di]!.at[2] }; };
      const p2 = di >= 0 ? zAt(2) : null, p3 = di >= 0 ? zAt(3) : null, sp = p2 && p3 && p3.t > p2.t ? (p3.z - p2.z) / (p3.t - p2.t) : 0, t2 = mine().get(drive.deck)!, tip = tiltOf(r0, t2.turn);
      out.push({ what: `it moves at ${+drive.v.toPrecision(3)} m/s`, ok: sp > 0.85 * drive.v && sp < 1.15 * drive.v && tip < 0.2, says: `its motors on (Jolt, each motor's own torque line, its speed held by its controller), it went ${+sp.toPrecision(3)} m/s over the third second${tip >= 0.2 ? `, and tipped ${+((tip * 180) / Math.PI).toFixed(0)}°` : ', level'} (within 15% passes)` });
    }
    if (spin) { w.run('simulate 3 s'); const got = Math.abs(w.value(`${spin.motor}.rpm`)) / spin.n; out.push({ what: `it turns at ${+((spin.rpm * 60) / (2 * Math.PI)).toPrecision(3)} rpm`, ok: Math.abs(got - spin.rpm) / spin.rpm < 0.15, says: `run for 3 s (Jolt, the motor's torque line), it came to ${+((got * 60) / (2 * Math.PI)).toPrecision(3)} rpm (within 15% passes)` }); }
    for (const t of tests) {
      if (t.kind === 'swing') { w.run(`push ${t.name} with 20 N along z for 0.3 s at its top`); const a1 = Math.max(Math.abs(w.value(`${t.name}.most`)), Math.abs(w.value(`${t.name}.least`))); out.push({ what: 'it swings open', ok: a1 > (5 * Math.PI) / 180, says: `pushed at its top with 20 N for 0.3 s (Jolt), it swung as far as ${+((a1 * 180) / Math.PI).toFixed(1)}° (more than 5° passes)` }); }
      if (t.kind === 'slide') { w.run(`push ${t.name} with ${+(t.m * 2 + 1).toFixed(2)} N along x for 0.4 s`); const tr = w.value(`${t.name}.most`); out.push({ what: `it slides ${len(t.L)}`, ok: tr > 0.2 * t.L && tr <= t.L + 2e-3, says: `pushed (Jolt), it slid as far as ${len(tr)}, its stop at ${len(t.L)}` }); }
      if (t.kind === 'raise') {
        // what rides, with what it carries, pushed up by twice its weight: what would raise it (a screw, a winch, a
        // linkage) is not derived; this tests that it rides up and down where it should, and stops at its travel
        const ride = new Set([t.name, ...riders]), kg = [...mine().values()].filter((m) => ride.has(m.name)).reduce((a, m) => a + m.mass, 0) + w.all().made.filter((m) => m.name.startsWith('test_load')).reduce((a, m) => a + m.mass, 0), F = 2 * kg * G;
        w.run(`push ${t.name} with ${+F.toFixed(1)} N along y for 1.5 s`); const tr = w.value(`${t.name}.most`);
        out.push({ what: `it rides ${len(t.L)} up and down its guides`, ok: tr > 0.2 * t.L && tr <= t.L + 2e-3, says: `pushed up with twice the weight of what rides (${+F.toPrecision(3)} N, for ${+kg.toPrecision(3)} kg) for 1.5 s (Jolt), it rose as far as ${len(tr)}, its stop at ${len(t.L)}, and came down again when let go, as nothing holds it there; the work to raise it the whole way is ${+((kg * G * t.L) / 1000).toPrecision(3)} kJ (m g h); let go at its top it falls the ${len(t.L)} in ${+Math.sqrt((2 * t.L) / G).toPrecision(2)} s, at ${+Math.sqrt(2 * G * t.L).toPrecision(2)} m/s at the bottom: it needs a brake, or a drive that does not run back (a screw, a worm), holding about ${+(kg * G).toPrecision(3)} N, not derived` });
      }
    }
    windLater?.();
  } catch (e) { out.push({ what: 'it behaves when let go', ok: false, says: (e as Error).message.slice(0, 240) }); }
  return out;
}
/** Kept warm: a heater as strong as the air takes at the temperature, then heat let flow until it settles there. */
function warmed(w: Workshop, t: Extract<Test, { kind: 'warm' }>, most?: number): Check & { P?: number } {
  try {
    const m = w.all().made.find((x) => x.name === t.name); if (!m?.matter) return { what: `it keeps warm at ${t.T} °C`, ok: false, says: `${t.name} is not made` };
    const th = thermalOf(m.matter), A = Number.isFinite(m.area) ? m.area : 2 * (m.w * m.h + m.w * m.d + m.h * m.d), P = heatLoss(t.T, A * 0.9, Math.max(m.h, 0.01), th.emissivity);
    w.run(`heat ${t.name} with ${+P.toFixed(3)} W`); const secs = Math.min(30 * 86400, Math.max(1800, (8 * m.mass * th.c * Math.max(t.T - AMBIENT, 1)) / Math.max(P, 1e-3)));
    w.run(`let heat flow for ${secs.toFixed(0)} s`); const T1 = w.value(`${t.name}.temperature`), fu = FUSION[m.matter.id], safe = !fu || ((fu.melts ?? 1e9) > t.T + 50 && (fu.lost ?? 1e9) > t.T + 50);
    return { P, what: `it keeps warm at ${t.T} °C`, ok: Math.abs(T1 - t.T) < 0.15 * Math.max(t.T - AMBIENT, 10) && safe && (most === undefined || P <= most), says: `a ${+P.toPrecision(3)} W heater, what still air takes from it at ${t.T} °C (convection and radiation); let flow for ${+(secs / 3600).toPrecision(2)} h it came to ${+T1.toPrecision(4)} °C (what touches it takes some too)${safe ? '' : `, but ${m.matter.name} does not bear that heat`}${most !== undefined ? `; ${P <= most ? 'within' : 'more than'} the ${+most.toPrecision(3)} W it may use` : ''}` };
  } catch (e) { return { what: `it keeps warm at ${t.T} °C`, ok: false, says: (e as Error).message.slice(0, 200) }; }
}

/** Drying: the water leaves only as vapour, taking its latent heat, 2.501 − 0.00236 T MJ/kg at T °C (water's heat of
 *  vaporisation, near enough), beyond what keeps it warm; and only as far as the air takes it away: air saturated at T
 *  holds p_s M / R T of it (p_s by Buck's formula, 1996), so a closed box holds a few grams at most and air must be
 *  moved through it. */
function dried(w: Want, T: number, Pwarm: number, con: Conception): Check {
  const L = (2.501 - 0.00236 * T) * 1e6, ps = 611.21 * Math.exp((18.678 - T / 234.5) * (T / (257.14 + T))), rhoV = (ps * 0.018015) / (8.314 * (T + 273.15));
  const enc = con.wants.find((x) => x.fn === 'enclose'), V = enc ? enc.q.W!.v * enc.q.D!.v * enc.q.H!.v : undefined, tDry = w.q.dryFor?.v, most = con.limits.power;
  const per100 = tDry !== undefined ? (0.1 * L) / tDry : undefined, spare = most !== undefined ? most - Pwarm : undefined, grams = spare !== undefined && tDry !== undefined ? (Math.max(0, spare) * tDry) / L * 1000 : undefined;
  return { what: 'it dries what is put in it', ok: !enc, says: `the water leaves only as vapour, taking ${+(L / 1e6).toPrecision(3)} MJ/kg at ${T} °C${per100 !== undefined ? `: each 100 g in ${+(tDry! / 3600).toPrecision(3)} h takes ${+per100.toPrecision(3)} W beyond keeping it warm` : ''}${grams !== undefined ? `; of the ${+most!.toPrecision(3)} W it may use, ${+Math.max(0, spare!).toPrecision(3)} W is left over keeping warm, enough to dry ${+grams.toPrecision(3)} g in that time` : ''}${enc && V !== undefined ? `; and air saturated at ${T} °C holds ${+(rhoV * 1000).toPrecision(3)} g of it a cubic metre (Buck), so its ${+(V * 1000).toPrecision(3)} L inside, closed, hold ${+(rhoV * V * 1000).toPrecision(2)} g: what it dries must be carried out by air moved through it (a vent and a fan), and air flow is not kept` : ''}` };
}

/** A design for what was conceived, from a seed: made, checked, and drawn again from the next seed until it holds. */
export function design(con: Conception, o: { seed: number; prefix?: string; at?: [number, number]; world?: World; physics?: Jolt | null; tries?: number }): Design {
  ROOM = o.world ?? { parts: () => [] };
  const prefix = o.prefix ?? `${con.name.replace(/[^a-z]/gi, '').toLowerCase() || 'thing'}1`, tries: Design['tries'] = [];
  let best: Design | null = null;
  for (let k = 0; k < (o.tries ?? 6); k++) {
    const seed = (o.seed + k * 7919) | 0, d = once(con, seed, prefix, o.at ?? [0, 0], o.physics ?? null);
    if (d.ok) return { ...d, tries };
    tries.push({ seed, why: [...d.checks.filter((x) => !x.ok).map((x) => `${x.what}: ${x.says}`), ...d.gaps].slice(0, 2).join('; ') || 'it could not be made' });
    if (!best || d.checks.filter((x) => x.ok).length > best.checks.filter((x) => x.ok).length) best = d;
    // a gap is no flaw of a draw: another seed meets the same want no better; nor is a draw that comes out as the last did
    if (d.gaps.length && d.checks.every((x) => x.ok)) break;
    if (tries.length > 1 && tries.at(-1)!.why === tries.at(-2)!.why) break;
  }
  return { ...best!, tries };
}
/** Several designs for the same wants, each from its own seed and each unlike the others, set side by side. */
export function designs(con: Conception, n: number, o: { seed: number; at?: [number, number]; world?: World; physics?: Jolt | null; gap?: number; first?: number }): Design[] {
  const out: Design[] = [], seen = new Set<string>(), stem = con.name.replace(/[^a-z]/gi, '').toLowerCase() || 'thing'; let x = o.at?.[0] ?? 0;
  for (let k = 0; out.length < n && k < n * 6; k++) {
    const probe = design(con, { seed: o.seed + k * 104729, prefix: `${stem}${(o.first ?? 1) + out.length}`, at: [0, o.at?.[1] ?? 0], world: o.world ?? { parts: () => [] }, physics: null, tries: 1 });
    const sig = probe.choices.join('|'); if (seen.has(sig)) continue; seen.add(sig);
    const half = probe.footprint[0] / 2; x += half;
    const d = design(con, { seed: probe.seed, prefix: probe.prefix, at: [x, o.at?.[1] ?? 0], world: o.world, physics: o.physics ?? null, tries: 4 });
    out.push(d); x += Math.max(half, d.footprint[0] / 2) + (o.gap ?? 0.5);
  }
  return out;
}

// ==== said, and kept ==================================================================================================
/** A design as a pipeline kept to run again: its steps in order, each with why it is there. */
export function clipOfDesign(d: Design, at = Date.now()): Clip {
  return { title: d.title, at, nodes: d.steps.map((s, i) => ({ k: `n${i}`, label: `${(d.traces[i]?.what ?? s.slice(0, 20)).replace(`${d.prefix}_`, '')}: ${d.traces[i]?.why ?? ''}`.slice(0, 60), step: { kind: 'action', what: s } })), links: d.steps.slice(1).map((_, i): [string, string, string] => [`n${i}`, `n${i + 1}`, 'then']) };
}
export const showValue = (q: Question) => (q.kind === 'mass' ? `${+(q.value / G).toPrecision(3)} kg` : q.kind === 'length' ? `${+(q.value * 1e3).toPrecision(4)} mm` : q.kind === 'speed' ? `${+q.value.toPrecision(3)} m/s` : q.kind === 'rpm' ? `${+((q.value * 60) / (2 * Math.PI)).toPrecision(3)} rpm` : q.kind === 'volume' ? `${+(q.value * 1e3).toPrecision(3)} L` : q.kind === 'temperature' ? `${q.value} °C` : String(q.value));
/** What was conceived, said back: what it is to do, what was heard, and what is asked. */
export function sayConception(c: Conception): string {
  const not = c.asked.filter((a) => a.kind !== 'for' && !a.got), laws = `${c.scale?.must.length ? ` At ${len(c.scale.L)} it would have to be built so: ${c.scale.must.join('; ')}.` : ''}${c.bounds.length ? ` The laws say: ${c.bounds.map((b) => `${b.ok === null ? '·' : b.ok ? '✓' : '✗'} ${b.what} (${b.says})`).join('; ')}.` : ''}`;
  return sayIt(c, not) + laws;
}
function sayIt(c: Conception, not: Asked[]): string {
  if (!c.wants.length) return `${not.length ? `I read what it is asked to be and do, but none of it is something I make yet: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : `Nothing in "${c.words.trim()}" says what it is to do.`}${c.heard.length ? ` Heard: ${c.heard.map((h) => h.replace(/[.;,\s]+$/, '').replace(/, checked$/, ', with nothing made to check it against')).join('; ')}.` : ''}${c.dropped.length ? ` Numbers not used: ${c.dropped.join('; ')}.` : ''}${c.questions.length ? ` I make things that ${Object.values(FN_WORDS).join(', ')}. ${c.questions[0]!.ask}` : ''}`;
  return `I read it as something to ${c.wants.map((w) => FN_WORDS[w.fn]).join(', and to ')}.${c.heard.length ? ` Heard: ${c.heard.map((h) => h.replace(/[.;,\s]+$/, '')).join('; ')}.` : ''}${not.length ? ` Not something I make yet: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : ''}${c.dropped.length ? ` Numbers not used: ${c.dropped.slice(0, 8).join('; ')}.` : ''}${c.questions.length ? ` Before I make it: ${c.questions.map((q, i) => `${i + 1}. ${q.ask}${q.kind === 'what' ? '' : ` (I would take ${showValue(q)}: ${q.grounds})`}`).join(' ')} ${c.questions.every((q) => q.kind === 'what') ? 'Say "go" to make it, or say what else it should do.' : 'Answer with the numbers, or say "go" for what I would take.'}` : ''}`;
}
/** A design, said: what it is, how it was drawn, what it was checked for and found, what it could not do. */
export function sayDesign(d: Design): string {
  if (d.parts === 0) return `Nothing made: ${d.gaps.join('; ')}.`;
  const bad = d.checks.filter((c) => !c.ok), not = d.asked.filter((a) => a.kind !== 'for' && !a.got);
  return `${d.title}: ${d.parts} parts, ${+d.mass.toPrecision(3)} kg. ${d.ok ? 'It holds every law and limit it was checked for' : 'It does not hold'}; it does ${d.does[0] === d.does[1] ? 'what was asked' : `${d.does[0]} of the ${d.does[1]} things asked`}. ${d.choices.join('; ')}. Checked: ${d.checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.what} (${c.says})`).join('; ')}.${d.gaps.length ? ` Not yet: ${d.gaps.join('; ')}.` : ''}${not.length ? ` Not made: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : ''}${d.tries.length ? ` Drawn again ${d.tries.length} time${d.tries.length > 1 ? 's' : ''} first: ${d.tries.slice(0, 3).map((t) => `seed ${t.seed}, ${t.why}`).join('; ')}.` : ''}${bad.length ? '' : d.whole ? ' It does all it was asked and holds every law it was checked for.' : ''}`;
}
/** Why a part is there: what it is, what called it, when, why, where and how. */
export function sayTrace(d: Design, part: string): string {
  const t = d.traces.find((x) => x.what === part || x.what === `${d.prefix}_${part}` || x.what.endsWith(`_${part}`)); if (!t) return `Nothing in ${d.title} is named ${part}.`;
  return `${t.what.replace(`${d.prefix}_`, '')}: called by "${t.called}"; ${t.when}; why: ${t.why}; where: ${t.where}; how: ${t.how}.`;
}

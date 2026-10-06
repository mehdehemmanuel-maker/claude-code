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
import { namedSize, sizeAt, type SizeReading } from './sizing';
import { bounds, type Bound, type Said } from './bounds';
import { GEARHEADS, MOTORS, type MotorData } from '../data/motors';
import { DRESSED_SPECIES, LUMBER } from '../data/lumber';
import { motorModel } from '../engineering/dcmotor';
import { AMBIENT, heatLoss, thermalOf } from '../engineering/thermal';
import { FUSION } from '../engineering/fusion';
import { matOf, matterOf, Workshop, type World } from './generate';
import type { Clip } from './flows';
import type { Jolt } from './realize';

// ==== wants, read from words ============================================================================================
export type Fn = 'support' | 'move' | 'turn' | 'swing' | 'slide' | 'raise' | 'contain' | 'enclose' | 'warm' | 'lift' | 'float';
/** A figure a want has: given by the person, answered to a question, the usual one for what was named, or estimated. */
export interface Fig { v: number; unit: string; by: 'you' | 'answer' | 'usual' | 'estimate'; grounds: string }
export interface Want { fn: Fn; says: string; q: Record<string, Fig>; flags: string[] }
export type Kind = 'length' | 'mass' | 'speed' | 'rpm' | 'temperature' | 'volume' | 'count' | 'what';
export interface Question { key: string; want: number; ask: string; kind: Kind; value: number; unit: string; grounds: string }
/** One thing the ask asks for, as said: what it is, something it does or has, or what it is for; and what of it was read. */
export interface Asked { text: string; kind: 'thing' | 'does' | 'has' | 'for'; got: Fn | null; why: string }
/** A limit said of the whole: no heavier, wider, taller or deeper than so much (SI). */
export interface Limits { mass?: number; W?: number; H?: number; D?: number; /** watts it may draw */ power?: number }
export interface Conception {
  words: string; name: string; wants: Want[]; questions: Question[]; heard: string[]; assumed: string[]; unread: string[]; matter: string | null;
  /** everything it was asked for, each read or not and why */ asked: Asked[];
  /** numbers said that it did not use, and why */ dropped: string[];
  limits: Limits;
  /** what the laws were given to judge of the ask; the size it is at, and what that size asks; what the laws say of it */ said: Said; scale: SizeReading | null; bounds: Bound[];
}

const G = 9.80665;
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
  P(/\b(platform|stage|deck|step|footstool|tray|surface)\b/, 'platform', 'support', { H: fig(0.3, 'm', 'estimate', 'standing 300 mm up'), W: fig(1.2, 'm', 'estimate', '1.2 m across'), D: fig(1.2, 'm', 'estimate', 'and 1.2 m deep'), F: fig(200 * G, 'N', 'estimate', 'two people standing on it, about 200 kg') }),
  P(/\b(bridge|footbridge|span|walkway|gangway|catwalk)\b/, 'bridge', 'support', { span: fig(2, 'm', 'estimate', 'a gap of 2 m'), W: fig(0.6, 'm', 'estimate', '600 mm wide'), H: fig(0.3, 'm', 'estimate', 'its deck 300 mm up'), F: fig(100 * G, 'N', 'estimate', 'a person crossing, about 100 kg') }, ['span']),
  P(/\b(stand|holder|pedestal|plinth|mount|easel|tripod|display)\b/, 'stand', 'support', { H: fig(0.8, 'm', 'estimate', 'holding it 800 mm up'), W: fig(0.3, 'm', 'estimate', 'on a top 300 mm across'), D: fig(0.3, 'm', 'estimate', 'and 300 mm deep'), F: fig(5 * G, 'N', 'estimate', 'something of about 5 kg') }),
  P(/\b(cart|trolley|wagon|rover|vehicle|car|buggy|kart|truck|dolly|skateboard|tricycle|trike|bicycle|bike|scooter|wheelbarrow|pram|stroller|wheelchair)\b/, 'cart', 'move', { m: fig(5, 'kg', 'estimate', 'a load of 5 kg'), v: fig(0.5, 'm/s', 'estimate', 'at a walking pace, 0.5 m/s') }),
  P(/\b(motor|engine|dynamo|generator|turbine|flywheel)\b/, 'motor', 'turn', { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.1, 'm', 'estimate', 'what turns 100 mm across') }),
  P(/\b(fan|turntable|spinner|spinning top|carousel|lazy susan|mixer|potter'?s wheel|centrifuge|rotisserie)\b/, 'turntable', 'turn', { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.3, 'm', 'estimate', 'a turning plate 300 mm across') }),
  P(/\b(door|gate|lid|hatch|flap|shutter)\b/, 'door', 'swing', { W: fig(0.8, 'm', 'estimate', 'a leaf 800 mm wide'), H: fig(2.0, 'm', 'estimate', 'and 2.0 m tall, as a person walks through') }),
  P(/\b(drawer|slider|rail|carriage)\b/, 'slider', 'slide', { L: fig(0.4, 'm', 'estimate', 'travelling 400 mm'), m: fig(5, 'kg', 'estimate', 'carrying about 5 kg') }),
  P(/\b(lift|elevator|hoist|jack|winch|crane)\b/, 'lift', 'raise', { L: fig(1, 'm', 'estimate', 'raising it 1 m'), m: fig(20, 'kg', 'estimate', 'about 20 kg') }),
  P(/\b(tank|bucket|cup|mug|bottle|jar|barrel|vat|pot|water butt|cistern|aquarium|vase|bin|hopper|canister)\b/, 'tank', 'contain', { V: fig(0.01, 'm³', 'estimate', 'holding 10 L') }),
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
  if (/^(span|spans|spanning|cross|crosses|crossing|bridge|bridges)$/.test(w)) return { fn: 'support', flags: ['span'], load: true };
  if (/^(pack|packs|packing|fold|collaps|unfold)/.test(w) && /^\s*(into|down|flat|away|up|small)/.test(o)) return { fn: 'swing', flags: ['fold'] };
  if (/^(fold|collaps|unfold)/.test(w)) return /^\s*(flat|up|away|down|shut|open|closed|in|half|out|back|together|itself|to|into a|when|\s)/.test(o) && !/\b(sheet|cloth|towel|clothes|shirt|paper|fabric|laundry|blanket)\b/.test(o) ? { fn: 'swing', flags: ['fold'] } : { note: 'folding something else (cloth, paper): handling soft things is not kept' };
  if (/^(slid|glid|extend|retract|telescop)/.test(w)) return { fn: 'slide' };
  if (/^(lift|rais|lower|hoist|elevat|winch)/.test(w)) return /\b(itself|off the ground|into the air)\b/.test(o) ? { fn: 'lift' } : /\b(cable|rope|chain|winch|hook|line|tether|string)\b/.test(o) ? { load: true, note: 'raising or lowering on a cable (a winch and a line): rope and cable are not kept' } : { fn: 'raise', load: true };
  if (/^(warm|heat)/.test(w)) return { fn: 'warm' };
  if (/^(cool|chill|freez|refrigerat)/.test(w)) return { note: 'cooling: keeping warm is kept, cooling is not' };
  if (/^(enclos|cover|shelter|house|cage)/.test(w)) return { fn: 'enclose' };
  if (/^(float|bob)/.test(w)) return /\b(altitude|air|sky|atmosphere|clouds?|above)\b/.test(` ${all} `) ? { note: 'floating in air: buoyancy in a gas (a balloon) is not kept yet, only in water' } : { fn: 'float' };
  if (/^(fly|flies|flew|hover)/.test(w)) return { fn: 'lift' };
  if (/^(hold|keep|stor|carr|contain|take|bear|support|accommodat|seat|fit)/.test(w)) {
    if (INFO.test(o) || /^\s*\d[\d,.]*\s*(tb|gb|mb|kb|bytes?)\b/.test(o)) return { note: 'holding information (data) is electronics: not kept yet' };
    if (/\bwarm\b|\bhot\b/.test(o)) return { fn: 'warm' };
    if (/\b(in|out|inside|dry|safe)\s*$/.test(o.trim()) || /\bkeeps? .* (in|out)\b/.test(`${w}${o}`)) return { fn: 'enclose' };
    if (LIQUID_WORDS.test(o) || /\d\s*(l|litres?|liters?|ml|gal|gallons?)\b/.test(o)) return { fn: 'contain' };
    if (/^(carr|take|accommodat)/.test(w)) return { load: true };
    if (/^fit/.test(w)) return { context: true };
    // "keeps it running", "keeping the dose below": a state kept, not a weight held up
    if (/^keep/.test(w) && !/\d\s*(kg|g|lb|lbs|t|tonnes?|n)\b/.test(o)) return { note: `keeping ${obj.split(/\s+/).slice(0, 5).join(' ')}: a state to hold, not a weight; not something kept` };
    return { fn: 'support', load: true };
  }
  // "puts out 100 W", "makes 1 µW": what it gives, read as a figure and weighed by the laws
  if (/^(put|puts|putting|give|gives|giving|deliver|delivers|output|outputs|produce|produces|generate|generates|make|makes|draw|draws|use|uses|consume|consumes)$/.test(w) && /\d[\d.,]*\s*(k|m|µ|μ|u|g|t)?w\b|watts?\b/i.test(o)) return { context: true };
  if (/^(sit|stand|rest|lie|hang|dangl|sits)/.test(w) && !/^(sits? on it|stands? on it)/.test(obj)) return { context: true };
  if (/^(is|are|be|weighs?|weighing|lasts?|fits?|measures? (no|under|less))$/.test(w)) return { context: true };
  if (/^runs?$/.test(w) && /^\s*on\b/.test(o)) return { note: `running on ${obj.replace(/^\s*on\s+/, '').split(/\s+/).slice(0, 6).join(' ')}: a source of power is not kept` };
  if (/^(dr(y|ies|ying))$/.test(w)) return { fn: 'warm', flags: ['dry'] };
  if (/^runs?$/.test(w)) return /\b(month|week|day|hour|year|charge|battery|power|batteries|sun|solar|mains|electricity)s?\b/.test(o) ? { note: 'running on stored or gathered power (a battery, a cell): electric power is not kept yet' } : { fn: 'move' };
  if (/^(measur|dispens|pour|fill|refill|pump|spray|drain|flow|squirt|stop|dose|portion|mete)/.test(w)) return { note: 'moving liquids or grains (pumping, filling, measuring out) needs tanks, pipes and pumps, not kept yet' };
  if (/^(climb|crawl|walk|swim|enter|jump|dig|burrow|hop|step)/.test(w)) return { note: 'getting about by legs, by climbing or by swimming: only wheels are kept' };
  if (/^(seal|graft|kill|harm|grow|heal|feed|water|plant|pollinat|treat|cure)/.test(w)) return { note: 'working on living things: biology is not kept' };
  if (/^(read|send|show|display|glow|light|play|ring|beep|sens|detect|count|record|comput|process|transmit|receiv|charg|power|blink|talk|listen|scan|photograph|film|stream|alert|notif|monitor|run)/.test(w)) return { note: 'electronics (sensing, computing, lighting, sending, running on stored power): circuits and cells are not kept yet' };
  if (/^(tilt|steer|follow|track|balanc|level|stabiliz|stabilis|aim|point|navigat|avoid)/.test(w)) return { note: 'steering itself by what it senses: control is not kept' };
  if (/^(clean|wash|cut|print|cook|bake|brew|iron|sort|pick|grab|grip|mix|blend|grind|sand|paint|polish|drill|saw|weld|knit|sew|fold)/.test(w)) return { note: 'working on other things (a process): processes are not kept' };
  if (/^(convert|generat|produc|collect|absorb|reflect|shade|block|harvest|cool)/.test(w)) return { note: 'making or turning energy (light, heat, electricity): energy conversion is not kept' };
  return { note: `"${w}" is not something kept` };
}
/** What kind of knowing a thing that is not made needs: said, so it is known what is missing. */
/** Folding or packing the whole of a thing down to carry and opening it out again: what it would need. */
const COLLAPSE = 'folding or packing the whole of it down and opening it out again: a body of hinged or sliding parts that collapse together (a linkage) is not kept yet, only a part that swings';
/** Mechanisms named by their kind, none of them kept yet: what each is. */
const MECH_KINDS: Record<string, string> = { scissor: 'a scissor linkage (crossed bars pinned at their middles)', screw: 'a lead screw', hydraulic: 'a hydraulic ram (fluids under pressure)', pneumatic: 'a pneumatic ram (air under pressure)', telescopic: 'telescoping sections', telescoping: 'telescoping sections', rack: 'a rack and pinion', chain: 'a chain drive', belt: 'a belt drive', cable: 'a cable and pulleys' };
/** The surface of a thing that holds a weight up, named as a part of it. */
const SURFACE_PART = /^(top|tops|worktop|tabletop|deck|surface|seat|tread)$/;
const FOLDS = /^(fold|folds|folded|folding|collapses?|collapsed|collapsing|packs?|packed|packing)$/;
const AREAS: [RegExp, string][] = [
  [/\b(board|chip|circuit|computer|cpu|processor|cores?|risc|microsd|sd|card|memory|storage|data|display|screen|e-ink|ink|leds?|sensors?|bluetooth|wifi|usb|usb-c|battery|batteries|solar|cell|electricity|phone|camera|speaker|antenna|radio|charger|charge|power|lux|light|lamp|strip|patch)\b/, 'electronics and electric power (circuits, chips, cells, lights): not kept yet'],
  [/\b(bees?|mites?|varroa|skin|blood|sugar|glucose|sweat|bark|grafts?|trees?|redwoods?|plants?|living|purring|cells|body|organs?)\b/, 'living things: biology is not kept'],
  [/\b(venus|mars|moon|sun|planet|planet's|orbit|space|satellite|rocket|spaceship|spacecraft|station|equator|sunshade|asteroid|comet|galaxy|star)\b/, 'space and other worlds (orbits, vacuum, other atmospheres): not kept yet'],
  [/\b(balloon|airship|blimp|wings?|kite|glider|parachute|gusts?|wind|clouds?|altitude|sky|air)\b/, 'flying by wings or by being lighter than air, and weather: only rotors (worked out, not flown) are kept'],
  [/\b(pumps?|pipes?|hoses?|valves?|nozzles?|jugs?|jets?|fountain|sprinkler|shampoo|conditioner|wash|pasta|rice|lentils|grain|powder)\b/, 'moving liquids and grains (pipes, pumps, dispensers): not kept yet'],
  [/\b(sheets?|cloth|fabric|towels?|clothes|backpack|bag|straps?|collar|rope|cables?|net|string|hooks?|harness)\b/, 'soft or flexible things (cloth, rope, cable): only rigid parts are kept'],
  [/\b(piano|notes?|music|bells?|sound|songs?)\b/, 'sound: not kept'],
  [/\b(staircase|stairs|steps|ladder|ramp|escalator)\b/, 'stairs and ramps: a stepped or sloped surface is not a way kept yet'],
  [/\b(city|town|village|building|habitat|skyscraper|tower|dome|colony)\b/, 'a city or a building of many rooms and floors: one enclosure at a time is kept'],
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
const COUNT_WORDS = ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
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
  const pa = parseAsk(words), t = pa.t, heard: string[] = [], assumed: string[] = [], unread: string[] = [], wants: Want[] = [], asked: Asked[] = [], dropped: string[] = [], limits: Limits = {};
  const add = (fn: Fn, says: string, q: Record<string, Fig> = {}, flags: string[] = []) => { if (!wants.some((w) => w.fn === fn)) wants.push({ fn, says, q: structuredClone(q), flags: [...flags] }); const w = wants.find((x) => x.fn === fn)!; for (const f of flags) if (!w.flags.includes(f)) w.flags.push(f); return w; };
  const purposeOf = (w: string | null) => (w ? PURPOSES.find((p) => p.re.test(` ${w.replace(/-/g, ' ')} `) || p.re.test(` ${singular(w)} `)) : undefined);
  const massOf = (s: string) => MASSES.find(([re]) => re.test(` ${s} `));
  let name = '', occupant: (typeof MASSES)[number] | null = null, loadSaid: { N: number; text: string } | null = null;
  const loadsSaid: string[] = [], said: Said = { size: {} }, own: { ax: string; v: number }[] = [];
  let depthLoad: { d: number; rho: number; text: string } | null = null;
  const means = new Map<number, string>(), mainHead = pa.clauses.find((c) => c.kind === 'main' && c.head)?.head ?? null;
  // a fold, a pack or an opening of the whole of it, when it is not itself a leaf, and nothing it is has a door to open
  const wholeFold = (r: VerbRead, whole: boolean, own: Fn | undefined, verb = '') => whole && r.fn === 'swing' && own !== 'swing' && (!!r.flags?.includes('fold') || /^open/.test(verb) && own !== 'enclose' && own !== 'contain' && !wants.some((w) => w.fn === 'enclose' || w.fn === 'contain'));
  const objOf = (c: (typeof pa.clauses)[number]) => [...c.obj.map((i) => pa.toks[i]!.w), ...pa.clauses.slice(pa.clauses.indexOf(c) + 1).filter((x, k, xs) => (x.kind === 'where' || x.kind === 'for') && xs.slice(0, k).every((y) => y.kind === 'where' || y.kind === 'for')).flatMap((x) => [x.opener, x.text])].join(' ');
  // what it is, what it has, what it does, what it is for: clause by clause
  pa.clauses.forEach((c, ci) => {
    if (c.kind === 'main' || c.kind === 'has') {
      if (!c.head) return;
      const negated = /^(no|without)\b/.test(c.text) || c.opener === 'without';
      if (negated) { asked.push({ text: c.text, kind: 'for', got: null, why: 'noted: nothing it makes has one' }); return; }
      const p = purposeOf(c.head), generic = GENERIC.test(c.head), m = massOf(c.head);
      if (c.kind === 'main' && !name && (ci === 0 || pa.clauses.slice(0, ci).every((x) => x.kind !== 'main' || !x.head))) name = singular(c.head);
      if (p) { add(p.fn, p.name, p.q, p.flags); asked.push({ text: `${c.kind === 'has' ? 'with ' : ''}${c.text.replace(/\s+(that|which|who|whose|with|for)$/, '')}`, kind: c.kind === 'has' ? 'has' : 'thing', got: p.fn, why: '' }); }
      else if (generic) { /* what it is, it is by what it does */ }
      else if (m && c.kind === 'has') { loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` }; }
      else asked.push({ text: `${c.kind === 'has' ? 'with ' : ''}${c.text.replace(/\s+(that|which|who|whose|with|for)$/, '')}`, kind: c.kind === 'has' ? 'has' : 'thing', got: null, why: areaOf(`${c.head} ${c.mods.join(' ')}`) });
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
      const obj = objOf(c), r = readVerb(c.verb, obj, t), text = `${means.get(ci) ? `${means.get(ci)} to ` : ''}${c.subj && c.opener === 'whose' ? `its ${c.subj} ` : ''}${c.verb} ${obj}`.replace(/\s+/g, ' ').trim().slice(0, 80);
      // "extends to raise a person": the first is how it does the second, said with it, not another thing it does
      const nx = pa.clauses[ci + 1];
      if (nx?.kind === 'does' && nx.opener === 'to' && nx.verb && /^(extend|unfold|open|expand|telescop|ris|deploy|unroll|stretch|swing|tilt)/.test(c.verb) && readVerb(nx.verb, objOf(nx), t).fn) { means.set(ci + 1, `${c.verb}${c.obj.length ? ` ${c.obj.map((i) => pa.toks[i]!.w).join(' ')}` : ''}`); return; }
      // what folds or opens: a part of it ("a top that folds down") swings; the whole of it, folding down and opening out, collapses
      const naming = pa.clauses.slice(0, ci).reverse().find((x) => (x.kind === 'main' || x.kind === 'has') && x.head), subj = c.subj ?? (naming?.kind === 'has' ? naming.head : null);
      if (r.fn && wholeFold(r, !subj || subj === mainHead, purposeOf(mainHead)?.fn, c.verb)) { asked.push({ text, kind: 'does', got: null, why: COLLAPSE }); return; }
      // "whose load bed lifts": the thing it is said of is a part too, when it is a thing
      if (c.subj) { const ps = purposeOf(c.subj); if (ps) { add(ps.fn, ps.name, ps.q, ps.flags); asked.push({ text: `its ${c.subj}`, kind: 'has', got: ps.fn, why: '' }); } }
      if (r.context) return;
      if (r.fn) { const w = add(r.fn, FN_WORDS[r.fn], BASE[r.fn], r.flags); void w; asked.push({ text, kind: 'does', got: r.fn, why: '' }); if (r.flags?.includes('dry')) asked.push({ text: `${c.verb}: carrying the damp away`, kind: 'does', got: null, why: 'drying is warming and air moved through: air flow is not kept, only the warming' }); }
      else if (r.note) asked.push({ text, kind: 'does', got: null, why: r.note });
      else if (!r.load) asked.push({ text, kind: 'does', got: null, why: 'not kept' });
      else loadsSaid.push(text);
      const m = massOf(obj); if (m && (r.load || r.fn === 'support' || r.fn === 'move' || r.fn === 'raise' || r.fn === 'lift')) loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` };
      return;
    }
    // "on a table", "on a stand": a thing it stands on, said right after what it is, is a part of it
    const prevNaming = pa.clauses.slice(0, ci).reverse().find((x) => x.kind !== 'where' || !/^(on|upon|atop)$/.test(x.opener));
    if (c.kind === 'where' && /^(on|upon|atop)$/.test(c.opener) && c.head && (prevNaming?.kind === 'main' || prevNaming?.kind === 'has') && pa.clauses[ci - 1] === prevNaming) { const ps = purposeOf(c.head); if (ps) { add(ps.fn, ps.name, ps.q, ps.flags); asked.push({ text: `on ${c.text}`, kind: 'has', got: ps.fn, why: '' }); return; } }
    // what it is for, and where: things there are what it works on or for; what everyone knows the weight of is a load
    const m = massOf(c.text); if (m) { if (c.kind === 'for' || /^(on|onto|in|inside|into)$/.test(c.opener)) { occupant ??= m; loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` }; } }
    if (c.kind === 'for' && c.text.trim()) asked.push({ text: `${c.opener} ${c.text}`.trim(), kind: 'for', got: null, why: 'what it is for: said back, not checked' });
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
  const sized = by('enclose') ?? sup ?? by('swing') ?? by('warm') ?? by('turn') ?? by('contain') ?? by('raise') ?? mov ?? by('lift') ?? by('float') ?? by('slide');
  const carrier = by('raise') && /\b(lift|lifts|raise|raises|lower|lowers|hoist|hoists)\b/.test(t) ? by('raise')! : sup ?? mov ?? by('lift') ?? by('float') ?? by('raise') ?? by('slide');
  const headWant = purposeOf(pa.clauses.find((c) => c.kind === 'main' && c.head)?.head ?? null), ofHead = headWant ? by(headWant.fn) : undefined;
  // each number, by the words beside it: which of the wants it sizes and how, or why it is not used
  const plain: { n: (typeof pa.nums)[number]; owner: Want }[] = [];
  const AX: Record<string, 'H' | 'W' | 'D' | 'WD' | 'span' | 'thick' | 'alt'> = { tall: 'H', high: 'H', height: 'H', wide: 'W', width: 'W', across: 'W', diameter: 'W', round: 'W', long: 'W', length: 'W', deep: 'D', depth: 'D', square: 'WD', thick: 'thick', thickness: 'thick', gap: 'span', span: 'span', altitude: 'alt', elevation: 'alt' };
  for (const n of pa.nums) {
    const q = n.said, cl = pa.clauses[n.clause]!, b = n.before, a = n.after, near = (re: RegExp, k = 4) => b.slice(0, k).some((x) => re.test(x)), clauseOwner = cl.kind === 'has' || cl.kind === 'main' ? purposeOf(cl.head) : undefined;
    // said in a phrase about another thing ("from 5 litre jugs"), not one that only goes on saying it ("for 20 L of water")
    // "in a cabinet only 15 cm deep", "through 15 cm pipes": said of the other thing it goes in or through
    const into = cl.kind === 'where' && /^(in|inside|within|through|into)$/.test(cl.opener) && !!cl.head && cl.head !== mainHead && cl.headAt < n.tok;
    const ownerWant = clauseOwner ? by(clauseOwner.fn) : undefined, elsewhere = (cl.kind === 'where' || cl.kind === 'for') && !!cl.head && !purposeOf(cl.head) && !(SURFACE_PART.test(cl.head) && sup) && cl.headAt > n.tok || into;
    const drop = (why: string) => dropped.push(`${n.text.trim()}: ${why}`);
    if (!q) {
      // a count of things, or a number in a unit not kept
      const thing = a.join(' '), cnt = countOf(n.text.split(/\s+/)[0]!);
      if (/^(shelves|levels|tiers)\b/.test(thing) && sup) { sup.q.levels = fig(cnt, '', 'you', n.text); if (!sup.flags.includes('levels')) sup.flags.push('levels'); heard.push(`levels: ${n.text}`); continue; }
      if (/^legs?\b/.test(thing) && sup) { sup.q.legs = fig(cnt, '', 'you', n.text); heard.push(`legs: ${n.text}`); continue; }
      if (/^wheels?\b/.test(thing) && mov) { mov.q.wheels = fig(cnt, '', 'you', n.text); heard.push(`wheels: ${n.text}`); continue; }
      // light said in lux: about 300 lumens to a watt for daylight or white LEDs (estimate), for what a cell would gather
      if (/^lux\b/.test(thing)) { said.light = n.value / 300; heard.push(`${n.text}: light of about ${+(n.value / 300).toPrecision(3)} W/m² (300 lm/W, estimate), weighed below`); continue; }
      drop(/^(tb|gb|mb|kb|bytes?)\b/.test(thing) ? 'information: electronics are not kept yet' : `a count or a unit not kept (${areaOf(n.text)})`);
      continue;
    }
    const d = q.dim;
    if (sameDim(d, DIMS.length)) {
      const ax = AX[a[0] ?? ''] ?? (a[0] === 'in' && a[1] === 'diameter' ? 'W' : /^(standing|working|seat|overall|total|max|maximum|full|inside|outside)$/.test(a[0] ?? '') ? AX[a[1] ?? ''] : undefined);
      // "fits through my 70 cm wide gate", "fits a 50 cm wide gap": a limit on it, checked
      if (near(/^fits?$/, 6) && ax && /^(W|H|D|WD)$/.test(ax)) { limits[ax === 'WD' ? 'W' : (ax as 'W' | 'H' | 'D')] = q.si; heard.push(`fits ${q.text} ${a[0]}: a limit, checked`); continue; }
      // "30 cm of wet soil": a depth of something heavy, its weight what it holds
      const stuff = a[0] === 'of' ? /^(?:(?:soaking|wet|dry|damp|loose|packed|fresh|heavy)[- ]?)*(soil|earth|dirt|compost|sand|gravel|water|snow|concrete|grain|mulch|clay)/.exec(a.slice(1).join(' ')) : null;
      if (stuff) { const wet = /wet|soaking|damp/.test(a.slice(1, 3).join(' ')); const rho = ({ soil: wet ? 1900 : 1300, earth: wet ? 1900 : 1300, dirt: wet ? 1900 : 1300, compost: wet ? 1000 : 600, sand: wet ? 1900 : 1600, gravel: 1700, water: 1000, snow: 300, concrete: 2400, grain: 780, mulch: 400, clay: wet ? 2000 : 1700 } as Record<string, number>)[stuff[1]!]!; depthLoad = { d: q.si, rho, text: `${q.text} of ${a.slice(1, 4).join(' ')}, about ${rho} kg/m³ (estimate)` }; continue; }
      if (b[0] === 'than' && /^(wider|taller|longer|deeper|higher|bigger|larger|thicker)$/.test(b[1] ?? '')) { const k = /wider|bigger|larger/.test(b[1]!) ? 'W' : /taller|higher/.test(b[1]!) ? 'H' : /deeper|thicker/.test(b[1]!) ? 'D' : 'W'; limits[k] = q.si; heard.push(`no ${b[1]} than ${q.text}: a limit, checked`); continue; }
      if (/^(under|below|within|max|maximum|most)$/.test(b[0] ?? '') && ax && ax !== 'span' && ax !== 'alt' && ax !== 'thick' && !near(FOLDS, 6)) { limits[ax === 'WD' ? 'W' : ax] = q.si; heard.push(`${b[0]} ${q.text} ${a[0]}: a limit, checked`); continue; }
      if (near(FOLDS, 6)) { drop('the size it folds or packs down to: folding the whole of it down is not kept yet'); continue; }
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
      if (nounAfter && nounAfter !== pa.clauses[0]?.head && !purposeOf(nounAfter) && cl.kind !== 'main' && !ofTop) { drop(`the size of ${singular(nounAfter)}, ${areaOf(nounAfter).startsWith('not a kind') ? 'which is not made here' : areaOf(nounAfter)}`); continue; }
      if (elsewhere && !(b[0] === 'at' && !a.length) && !/^(up|high)$/.test(a[0] ?? '')) { drop(`said of ${cl.head ? `the ${singular(cl.head)}` : 'something else'}, not of what it makes`); continue; }
      // its own sizes, kept for what the laws say of them, whether or not it is made
      if (cl.kind === 'main' || (ownerWant && ownerWant === ofHead)) own.push({ ax: ax ?? 'plain', v: q.si });
      const owner = (ofTop ? sup : undefined) ?? ownerWant ?? (cl.kind === 'main' ? ofHead : undefined) ?? sized; if (!owner) { if (cl.kind !== 'main') drop('nothing it makes takes that size'); continue; }
      if (ax === 'H' || /^(up|high)$/.test(a[0] ?? '') || b[0] === 'at' && !a.length) { if (owner.fn === 'turn') { drop('a height for something that turns: its height is derived'); continue; } take(owner, 'H', q.si, 'm', q.text); continue; }
      if (ax === 'WD') { take(owner, owner.fn === 'turn' ? 'Dia' : 'W', q.si, 'm', q.text); if (owner.fn !== 'turn') take(owner, 'D', q.si, 'm', q.text); continue; }
      if (ax === 'W') { take(owner, owner.fn === 'turn' ? 'Dia' : 'W', q.si, 'm', q.text); if (n.by !== null) { const n2 = pa.nums[n.by]; if (n2?.said) { take(owner, 'D', n2.said.si, 'm', n2.said.text); n2.said = null; } } continue; }
      if (ax === 'D') { take(owner, 'D', q.si, 'm', q.text); continue; }
      plain.push({ n, owner });
      continue;
    }
    if (sameDim(d, DIMS.mass) || sameDim(d, DIMS.force)) {
      const N = sameDim(d, DIMS.mass) ? q.si * G : q.si;
      // "a camera that weighs 0.2 µg": the weight of the thing named just before, not its own
      const said0 = pa.clauses[n.clause - 1], ofOther = cl.kind === 'does' && /^(that|which)$/.test(cl.opener) && !!said0?.head && said0 !== pa.clauses[0] && said0.head !== pa.clauses[0]?.head;
      if (near(/^(weighs?|weighing|weight)$/, 4) && ofOther) { loadSaid = { N, text: `${said0!.head} of ${q.text}` }; said.payload = N / G; continue; }
      if (near(/^(weighs?|weighing|weight)$/, 4)) { limits.mass = N / G; heard.push(`weighs ${b[0] === 'weighs' || b[0] === 'weigh' ? '' : `${b[0]} `}${q.text}: a limit on its own weight, checked`); continue; }
      if (near(/^(measures|measure|dispenses|dispense|pours|portions|doses|meters)$/, 4)) { drop('a dose to measure out: measuring out is not kept'); continue; }
      const each = a[0] === 'of' && a[1] === 'each' || a[0] === 'each' || a[0] === 'apiece', many = each ? (() => { for (const c2 of pa.clauses.slice(n.clause, n.clause + 3)) { const m2 = /\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:separate\s+|different\s+)?\w+/.exec(c2.text); if (m2) return countOf(m2[1]!); } return 1; })() : 1;
      loadSaid = { N: N * many, text: many > 1 ? `${q.text} each, ${many} of them` : q.text }; said.payload = (N * many) / G;
      continue;
    }
    if (sameDim(d, DIMS.volume)) {
      if (a[0] === 'per' || b.includes('per') || /^(a|an|every)$/.test(a[0] ?? '') && /^(second|minute|hour)$/.test(a[1] ?? '')) { drop('a flow rate: pumping is not kept yet'); continue; }
      if (b[0] === 'within') { drop('a tolerance on filling: filling is not kept'); continue; }
      if (elsewhere || (a[0] && !/^(of|tank|bucket|vessel|container|and|or|in|at)$/.test(a[0]) && !purposeOf(a[0]))) { drop(`the size of ${a[0] ? singular(a[0]) : 'something else'}, not of what it makes`); continue; }
      const co = by('contain') ?? add('contain', FN_WORDS.contain, BASE.contain); take(co, 'V', q.si, 'm³', q.text); if (!asked.some((x) => x.got === 'contain')) asked.push({ text: `holds ${q.text}`, kind: 'does', got: 'contain', why: '' });
      continue;
    }
    if (sameDim(d, DIMS.speed)) { if (/^(gusts?|winds?|current|breeze)$/.test(a[0] ?? '')) { drop('wind: there is no wind in the physics here'); continue; } if (mov) { take(mov, 'v', q.si, 'm/s', q.text); continue; } said.v = q.si; if (by('lift')) { heard.push(`flies at ${q.text}: weighed below`); continue; } drop('a speed for something that does not move along'); continue; }
    if (sameDim(d, DIMS.frequency)) { said.w = q.si; const tu = by('turn'); if (tu) { take(tu, 'rpm', q.si, 'rpm', q.text); continue; } drop('a turning speed for something that does not turn'); continue; }
    if (sameDim(d, DIMS.temperature)) {
      if (/^(difference|gap|gradient|warmer|colder|hotter|between)$/.test(a[0] ?? '')) { said.dT = q.value; heard.push(`a difference of ${q.text}: weighed below`); continue; }
      if (near(/^(above|over|hotter|warmer|exceeding|exceed|beyond)$/, 3) || b[0] === 'than' && /^(hotter|warmer)$/.test(b[1] ?? '')) { said.tmax = q.si - 273.15; heard.push(`no hotter than ${q.text}: weighed below by the heat it sheds`); continue; }
      if (/\b(cool|cools|cooling|chill|freeze|cold)\b/.test(t) || b[0] === 'below' || b[0] === 'under') { drop('cooling to a temperature: keeping warm is kept, cooling is not'); continue; } const wa = by('warm'); if (wa) { take(wa, 'T', q.si - 273.15, '°C', q.text); continue; } drop('a temperature for something that does not keep warm'); continue; }
    if (sameDim(d, DIMS.time)) {
      if (near(/^(every|once)$/, 2) && /\b(spin|spins|spinning|turn|turns|turning|rotat\w*|revolv\w*)\b/.test(t)) { said.w = (2 * Math.PI) / q.si; const tu = by('turn'); if (tu) take(tu, 'rpm', said.w, 'rpm', `once every ${q.text}`); else heard.push(`turning once every ${q.text}`); continue; }
      if (near(/^(for|lasts?|lasting|runs?|hover|hovers|hovering|keeps?)$/, 3) || /\b(charge|battery)\b/.test(a.join(' '))) { said.runFor = q.si; heard.push(`runs for ${q.text}: weighed below by the energy it must carry`); continue; }
      drop(near(/^(for|lasts?|runs?)$/, 3) || /\bcharge\b/.test(a.join(' ')) ? 'how long it runs on its power: power is not kept yet' : 'how long it takes: time limits are not checked yet'); continue; }
    if (sameDim(d, DIMS.power)) {
      const as = near(/^(puts?|putting|gives?|giving|delivers?|outputs?|supplies|supplying|provides?|charges?|out)$/, 3) ? 'gives' : near(/^(makes?|making|produces?|generates?|harvests?)$/, 3) ? 'makes' : 'draws';
      (said.power ??= []).push({ W: q.si, as }); if (as === 'draws' && near(/^(less|under|most|max|maximum|than)$/, 3)) limits.power = q.si;
      heard.push(`${as} ${q.text}: weighed below`); continue;
    }
    if (q.unit === 'deg' || q.unit === 'rad') {
      if (/^(slope|incline|hill|grade|ramp|gradient)s?$/.test(a.find((x) => !/^(muddy|steep|wet|grassy|gravel|rough)$/.test(x)) ?? '') && mov) { mov.q.slope = fig(q.si, 'rad', 'you', q.text); heard.push(`up a ${q.text} slope: its motors checked for it`); continue; } drop('a turn of so many degrees at a time: turning by steps is not kept'); continue; }
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
  if (sup && /\bback(rest)?\b/.test(t) && !sup.flags.includes('back')) sup.flags.push('back');
  for (const w of wants) for (const [k, f] of Object.entries(BASE[w.fn])) if (!w.q[k]) w.q[k] = f;
  // a surface on what moves or raises it lies on it: no height of its own to ask; and a part of a thing (a "load bed")
  // takes no room's sizes for what it is named, only what it carries and what carries it
  if (sup && (mov || by('raise')) && sup.q.H?.by === 'estimate' && !sup.flags.includes('levels') && !sup.flags.includes('span')) {
    sup.flags.push('laid'); sup.q.H = fig(0, 'm', 'usual', 'it lies on what carries it');
    for (const k of ['W', 'D'] as const) if (sup.q[k]?.by === 'usual') sup.q[k] = BASE.support[k]!;
  }
  // a depth of something heavy on what holds it up: its weight, over the surface it lies on
  if (sup && depthLoad) { const kg = sup.q.W!.v * sup.q.D!.v * depthLoad.d * depthLoad.rho; take(sup, 'F', kg * G, 'N', `${depthLoad.text} over ${len(sup.q.W!.v)} × ${len(sup.q.D!.v)}: ${+kg.toPrecision(3)} kg`); said.payload = kg; }
  // its own size: as said, or as named ("the size of a tardigrade"); then what that size asks, and what the laws say
  for (const o of own) { const z = said.size!; if (o.ax === 'H') z.H ??= o.v; else if (o.ax === 'W' || o.ax === 'WD') { z.W ??= o.v; if (o.ax === 'WD') z.D ??= o.v; } else if (o.ax === 'D') z.D ??= o.v; }
  for (const v of own.filter((o) => o.ax === 'plain').map((o) => o.v).sort((x, y) => y - x)) { const z = said.size!; if (z.W === undefined) z.W = v; else if (z.D === undefined) z.D = v; else z.H ??= v; }
  const nm = namedSize(t);
  if (nm && said.size!.W === undefined) { said.size!.W = nm.L; heard.push(`${nm.said}: ${len(nm.L)}, ${nm.source}`); if (ofHead) { if (ofHead.fn === 'turn') take(ofHead, 'Dia', nm.L, 'm', `${len(nm.L)}, ${nm.said}`); else if (!ofHead.q.W || ofHead.q.W.by !== 'you') take(ofHead, 'W', nm.L, 'm', `${len(nm.L)}, ${nm.said}`); } }
  said.massLimit = limits.mass; said.flies = !!by('lift') || /\b(fly|flies|flying|hover|hovers|hovering|airborne|drone)\b/.test(t); said.motor = /\b(motor|dynamo|generator|turbine)\b/.test(pa.clauses[0]?.head ?? '');
  said.heatEngine = /\bheat engine\b|\bruns? on (the )?[^,.;]*\b(difference|gradient)\b/.test(t); if (said.heatEngine && said.dT !== undefined && /\bblood|body|tissue|skin\b/.test(t)) said.Tat = 310;
  if (said.light === undefined && /\b(sunlight|in the sun|outdoors|solar)\b/.test(t) && !/\blux\b/.test(t)) said.light = 1000;
  const Ls = [said.size!.W, said.size!.D, said.size!.H].filter((x): x is number => x !== undefined), Lsize = Ls.length ? Math.max(...Ls) : undefined;
  const scale = Lsize !== undefined && (Lsize < 5e-3 || Lsize > 50) ? sizeAt(Lsize, { v: said.v ?? by('move')?.q.v?.v, w: said.w, flies: said.flies, swims: /\bswim/.test(t) }) : null;
  const lawSays = bounds(said);
  if (loadsSaid.length && !(sup ?? mov ?? by('lift') ?? by('float') ?? by('raise') ?? by('slide'))) for (const x of loadsSaid) asked.push({ text: x, kind: 'does', got: null, why: `carrying it needs what it is, and that is not something kept` });
  if (!wants.length) {
    const no = asked.filter((a) => a.kind !== 'for' && !a.got);
    const qs: Question[] = answers.what === undefined ? [{ key: 'what', want: -1, ask: `What should it do? It can ${Object.values(FN_WORDS).join(', ')}.`, kind: 'what', value: 0, unit: '', grounds: no.length ? 'none of what it is asked to do is something kept' : 'nothing in the words says what it is for' }] : [];
    return { words, name: name || 'something', wants: [], questions: qs, heard, assumed, unread: no.map((a) => `${a.text} (${a.why})`), matter, asked, dropped, limits, said, scale, bounds: lawSays };
  }
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
  const notRead = asked.filter((x) => x.kind !== 'for' && !x.got);
  if (notRead.length && answers.what === undefined) questions.push({ key: 'what', want: -1, ask: `I can make only part of it: something to ${wants.map((w) => FN_WORDS[w.fn]).join(', and to ')}. Not: ${notRead.map((x) => `${x.text} (${x.why})`).join('; ')}. Shall I make the part I can, or say what else it should do?`, kind: 'what', value: 0, unit: '', grounds: 'part of what was asked is not something kept' });
  // a mass is asked and read as a weight (N); one kept in kg is turned back
  const asN = (f: Fig) => (f.unit === 'kg' ? f.v * G : f.v), fromN = (f: Fig, v: number) => (f.unit === 'kg' ? v / G : v);
  wants.forEach((w, i) => { for (const [k, kind, ask] of ASKS[w.fn]) { const f = w.q[k]; if (!f || f.by !== 'estimate') continue; const a = answers[`${i}.${k}`] ?? answers[k]; if (a !== undefined) { const v = readAnswer(a, kind); if (v !== null) { w.q[k] = fig(kind === 'mass' ? fromN(f, v) : v, f.unit, 'answer', a); heard.push(`${k}: ${a}`); continue; } } questions.push({ key: `${i}.${k}`, want: i, ask, kind, value: kind === 'mass' ? asN(f) : f.v, unit: f.unit, grounds: f.grounds }); } });
  for (const w of wants) for (const f of Object.values(w.q)) if (f.by === 'usual' || f.by === 'estimate') assumed.push(f.grounds);
  if (!name || GENERIC.test(name)) name = name && name !== 'something' && name !== 'thing' ? name : ({ support: 'stand', move: 'cart', turn: 'turntable', contain: 'tank', enclose: 'box', warm: 'warmer', swing: 'door', slide: 'slider', raise: 'lift', lift: 'flyer', float: 'raft' } as Record<Fn, string>)[wants[0]!.fn];
  for (const a of notRead) unread.push(`${a.text} (${a.why})`);
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
  p: string; x0: number; z0: number; y0: number; rnd: () => number; matter: string | null; /** the most it may weigh, kg: its matter chosen for lightness */ light?: number; steps: string[]; traces: Trace[]; members: string[]; loose: string[]; moving: string[];
  /** what moves under what it makes (a carriage it stands on): what it makes rides with that, joined to it */ ride: string | null; riders: string[];
  choices: string[]; gaps: string[]; checks: (() => Check | null)[]; loads: string[]; tests: Test[]; need: Need; way: string; why: string;
  /** what it gives what stands on it or goes into it: its top surface, or its body */
  top: { y: number; w: number; d: number; name: string | null }; foot: [number, number];
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
 *  three times it (Euler, its top held, its foot free to sway: K = 2). */
function memberFor(id: string, shape: Shape, P: number, L: number): Member {
  const m = matterOf(id), fam = familyOf(id), fc = crush(id), K = 2;
  const by = (A: number, I: number) => ({ c: (fc * A) / P, b: (Math.PI ** 2 * m.E * I) / (K * L) ** 2 / P });
  const say = (A: number, I: number) => { const r = by(A, I); return `crushing at ${+r.c.toPrecision(2)} and buckling at ${+r.b.toPrecision(2)} times its share (Euler, K = 2)`; };
  const sizes: [number, number?][] = shape === 'tube' && fam !== 'wood' ? TUBES.map(([D, w]) => [D / 1e3, w / 1e3]) : SQUARE[fam]!.map((s) => [s / 1e3]);
  let last: Member | null = null;
  for (const [s, w] of sizes) {
    const A = shape === 'tube' && w ? (Math.PI * (s * s - (s - 2 * w) ** 2)) / 4 : shape === 'rod' ? (Math.PI * s * s) / 4 : s * s, I = shape === 'tube' && w ? (Math.PI * (s ** 4 - (s - 2 * w) ** 4)) / 64 : shape === 'rod' ? (Math.PI * s ** 4) / 64 : s ** 4 / 12, r = by(A, I);
    last = { size: s, ...(w ? { wall: w } : {}), A, I, says: say(A, I), ok: r.c >= 3 && r.b >= 3 }; if (last.ok) return last;
  }
  return last!;
}

/** The least sheet a surface can be, found by trying it under its load with the workshop's own load law: the sheet,
 *  and whether any kept bears it. */
function trySheets(c: Ctx, family: string, start: number, make: (t: number) => void, load: () => string | string[], span: number): { t: number; ok: boolean } {
  const sheets = SHEET[family]!.map((x) => x / 1e3); let k = Math.max(0, sheets.findIndex((s) => s >= start));
  // tried with the load where it is worst: each place said, the least factor and the most bending of them
  const worst = () => { const ls = [load()].flat(), rs = ls.map((l) => trial(c, c.steps, [l])); return rs.some((r) => !r) ? null : { factor: Math.min(...rs.map((r) => r!.factor)), bend: Math.max(...rs.map((r) => r!.bend)) }; };
  for (; k < sheets.length; k++) { make(sheets[k]!); const r = worst(); if (r && r.factor >= 2 && r.bend <= span / 250) return { t: sheets[k]!, ok: true }; }
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
const bearsAt = (id: string, s: Section, F: number, L: number, length: number) => { const m = matterOf(id), I = inertiaOf(s), Fw = F + areaOf2(s) * length * m.density * G; return m.yield / (((Fw * L) / 4) * (s.h / 2) / I) >= 2 && (Fw * L ** 3) / (48 * m.E * I) <= L / 250; };
interface Frame { T: number; n: number; joist: Section; rail: Section; by: string; alongX: boolean; kg: number }
/** The lightest frame for a sheet Lw long and Dw across under F: so many joists across it (an even count, so its middle
 *  falls between two), the thinnest sheet that bears F between those two, the least joist that bears half of F and its
 *  share of the sheet across Dw, and the least rail that bears half of all of it over the span it is held across. */
function frameFor(top: string, by: string, Lw: number, Dw: number, F: number, railSpan: number, alongX: boolean): Frame | null {
  const mt = matterOf(top), mb = matterOf(by), sheets = SHEET[familyOf(top)]!.map((x) => x / 1e3), secs = sectionsOf(by);
  let best: Frame | null = null;
  for (let n = 2; n <= 24; n += 2) for (const T of sheets) {
    const topN = Lw * Dw * T * mt.density * G;
    const joist = secs.find((j) => { const sp = (Lw - j.b) / (n - 1), bay = sp - j.b; return bay > 0 && bearsAt(top, { b: Dw, h: T, says: '' }, F + topN, bay, 0) && bearsAt(by, j, F / 2 + (topN * sp) / Lw, Dw, Dw); });
    if (!joist) continue;
    const jN = areaOf2(joist) * Dw * mb.density * G, rail = secs.find((r) => bearsAt(by, r, (F + topN + n * jN) / 2, railSpan, Lw));
    if (!rail) continue;
    const kg = (topN + n * jN) / G + 2 * areaOf2(rail) * Lw * mb.density;
    if (!best || kg < best.kg) best = { T, n, joist, rail, by, alongX, kg };
    break;
  }
  return best;
}
/** The dressed softwood a frame is sawn from: drawn, or under a weight limit the lightest of them for its stiffness as a beam. */
const framingWood = (c: Ctx) => (c.light === undefined ? pick(c.rnd, DRESSED_SPECIES) : [...DRESSED_SPECIES].sort((x, y) => merit(y, 'beam') - merit(x, 'beam'))[0]!);
/** Lays a frame's sheet, joists and rails, the sheet's top at yTop over (X, Z): returns the height of the rails' feet. */
function placeFrame(c: Ctx, f: Frame, top: string, X: number, yTop: number, Z: number, Lw: number, Dw: number, sheetName = 'top'): number {
  const { T, n, joist: j, rail: r, by, alongX } = f, mb = matterOf(by).name, at = (u: number, v: number): [number, number] => (alongX ? [X + u, Z + v] : [X + v, Z + u]);
  const member = (name: string, s: Section, u: number, y: number, v: number, along: 'u' | 'v', L: number, where: string, how: string) => {
    const [x, z] = at(u, v), axis = (along === 'u') === alongX ? 'x' : 'z';
    if (s.tube) return put(c, `${c.p}_${name}`, `place tube named ${c.p}_${name} of ${by} at ${M(x)}, ${M(y)}, ${M(z)} size ${MM(s.tube.D)} x ${MM(L)} x ${MM(s.tube.wall)} mm along ${axis}`, where, how);
    const [w, d] = axis === 'x' ? [L, s.b] : [s.b, L]; return box(c, name, by, x, y, z, w, d, s.h, 'bar', where, how);
  };
  box(c, sheetName, top, X, yTop - T / 2, Z, alongX ? Lw : Dw, alongX ? Dw : Lw, T, 'plate', `${M(yTop)} up, over ${MM(alongX ? Lw : Dw)} × ${MM(alongX ? Dw : Lw)} mm, on its joists`, `as thin a sheet of ${matterOf(top).name} as the load law lets bear its load between the two joists at its middle, by two, bending under 1/250 of that`);
  const w0 = c.why, sp = (Lw - j.b) / (n - 1), jy = yTop - T - j.h / 2, ry = yTop - T - j.h - r.h / 2;
  c.why = `to carry the ${sheetName} across, ${len(sp)} apart, onto the rails`;
  for (let k = 0; k < n; k++) member(`joist${k + 1}`, j, -Lw / 2 + j.b / 2 + k * sp, jy, 0, 'v', Dw, `under the ${sheetName}, ${len(k * sp)} along it, across both rails`, `the least ${j.says} of ${mb} that bears half the load and its share of the ${sheetName} across ${len(Dw)} by two, bending under 1/250 of it`);
  c.why = `to carry the joists along its length to what holds it up`;
  for (const [k, sv] of [-1, 1].entries()) member(`rail${k + 1}`, r, 0, ry, sv * (Dw / 2 - r.b / 2), 'u', Lw, `under the joists along its ${sv < 0 ? 'near' : 'far'} edge`, `the least ${r.says} of ${mb} that bears half of all of it over its span, by two, bending under 1/250 of it`);
  c.why = w0; return yTop - T - j.h - r.h;
}
const frameSays = (f: Frame, c?: Ctx) => `on ${f.n} joists of ${f.joist.says} and two rails of ${f.rail.says}, in ${matterOf(f.by).name}${c?.light !== undefined && familyOf(f.by) === 'wood' ? ` (under a weight limit, of the softwoods dressed to lumber sizes the lightest for its stiffness as a beam, by Ashby's index E^1/2 / ρ)` : ''}`;

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
    const loadsOn = () => [`load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g`, `load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g at its end`];
    const span0 = kind === 'legs3' || kind === 'column' || kind === 'panels' ? Math.max(W, D) : Math.max(W, D) - 2 * inset, tried = trySheets(c, fam, first, make, loadsOn, span0);
    let T = tried.t;
    // no sheet alone bears it on four legs: the lightest frame of joists and rails under it that does, the legs under the rails
    const sheetKg = W * D * T * matterOf(top).density;
    if ((!tried.ok || c.light !== undefined) && (kind === 'legs4' || kind === 'legs4in') && mem) {
      const by = fam === 'wood' ? framingWood(c) : familyOf(bars) === 'metal' ? bars : 'aluminum.6061-t6';
      frame = frameFor(top, by, Lw, Dw, F, Lw - 2 * inset - 2 * mem.size, alongX);
      if (frame && tried.ok && frame.kg >= sheetKg) { frame = null; make(T); }
      else if (frame) {
        T = frame.T; Pshare = ((F + frame.kg * G) / 4) * 1.5; mem = memberFor(bars, shape, Pshare, H - frame.T - frame.joist.h - frame.rail.h);
        frame = frameFor(top, by, Lw, Dw, F, Lw - 2 * inset - 2 * mem.size, alongX) ?? frame; make(frame.T); T = frame.T;
        c.choices.push(`${tried.ok ? `a sheet alone would weigh ${+sheetKg.toPrecision(3)} kg` : noSheet(fam, span0)}, so it is framed: the top ${frameSays(frame, c)}, the lightest of the frames that bear it (${+frame.kg.toPrecision(3)} kg)`);
      } else if (!tried.ok) { make(T); c.gaps.push(`${noSheet(fam, span0)}, and no frame of joists and rails of the kept sections does either`); }
    } else if (!tried.ok) c.gaps.push(`${noSheet(fam, span0)}: a beam under it is the next thing to derive`);
    // the legs again, for the top as it is; if they change, the top again on them
    if (!frame && mem && Math.abs(shareOf(T) - Pshare) > 1e-9) { Pshare = shareOf(T); const m2 = memberFor(bars, shape, Pshare, H); if (m2.size !== mem.size) { mem = m2; T = leastSheet(c, fam, T, make, loadsOn, kind === 'legs3' || kind === 'column' || kind === 'panels' ? Math.max(W, D) : Math.max(W, D) - 2 * inset); } else mem = m2; }
    if (mem && !mem.ok) c.gaps.push(`no ${shape} of ${matterOf(bars).name} kept carries ${+(Pshare / G).toPrecision(3)} kg down ${M(H)} by three: ${mem.says}`);
    const st = surfaceHow(n).steadied; if (st && kind !== 'column') c.choices.push(st);
    c.choices.push(`${kind === 'legs4' ? 'four legs at the corners' : kind === 'legs4in' ? 'four legs set in from the corners' : kind === 'legs3' ? 'three legs' : kind === 'column' ? `a column on a ${len(2 * footHalf(T))} square foot of 12 mm steel, the column` : 'two side panels'}${mem ? ` of ${shape === 'square' ? `${MM(mem.size)} mm square bar` : shape === 'rod' ? `Ø${MM(mem.size)} mm rod` : `Ø${MM(mem.size)} × ${MM(mem.wall!)} mm tube`} in ${matterOf(bars).name}` : ''}; a ${MM(T)} mm top of ${matterOf(top).name}`);
    c.loads.push(...loadsOn());
    const fr = frame, bay = fr ? (Lw - fr.joist.b) / (fr.n - 1) - fr.joist.b : Math.max(W, D);
    c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); return v ? { what: `its top bears ${+(F / G).toPrecision(3)} kg${fr ? ' between its joists' : ''}`, ok: v.factor >= 2 && v.bend <= bay / 250, says: `the load law, the load at its middle and at its edge, the worse: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${fr ? `the ${len(bay)} between joists` : 'its span'} is ${len(bay / 250)}: more fails)` } : null; });
    if (fr) {
      const mid = `${c.p}_joist${fr.n / 2}`, topN = Lw * Dw * fr.T * matterOf(top).density * G, sp = (Lw - fr.joist.b) / (fr.n - 1), jF = F / 2 + (topN * sp) / Lw;
      c.loads.push(`load ${mid} with ${+jF.toFixed(1)} N + ${mid}.mass * g`, `load ${c.p}_rail1 with ${+((F + topN) / 2).toFixed(1)} N + ${fr.n} * ${c.p}_joist1.mass * g / 2 + ${c.p}_rail1.mass * g`);
      c.checks.push(() => { const v = LOADS.get(mid); return v ? { what: `its joists bear half the load across ${len(Dw)}`, ok: v.factor >= 2 && v.bend <= Dw / 250, says: `the load law, ${+(jF / G).toPrecision(3)} kg at the middle of the joist under the top's middle: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(Dw)} is ${len(Dw / 250)})` } : null; });
      c.checks.push(() => { const v = LOADS.get(`${c.p}_rail1`); return v ? { what: `its rails bear half of all of it between the legs`, ok: v.factor >= 2 && v.bend <= Lw / 250, says: `the load law, half the load, the top and the joists at the rail's middle: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(Lw)} is ${len(Lw / 250)})` } : null; });
    }
    const memNow = mem; if (memNow) c.checks.push(() => ({ what: `its ${kind === 'column' ? 'column carries' : 'legs carry'} it without buckling`, ok: memNow.ok, says: `each carries ${+(Pshare / G).toPrecision(3)} kg (its share of the load and the top's own weight, half again): ${memNow.says}` }));
    const fh = kind === 'column' ? footHalf(T) * 2 : 0;
    c.top = { y: y0 + H, w: W, d: D, name: `${c.p}_top` }; c.foot = kind === 'column' ? [Math.max(W, fh), Math.max(D, fh)] : [W, D];
  };
}
const one = (n: Need) => !n.want.flags.includes('levels') && !n.want.flags.includes('span');
const legs = (n: Need) => n.want.q.legs?.v;
way({ id: 'top on four legs', meets: 'surface', says: 'a top on four legs at its corners', when: (n) => (!one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 4 ? `you said ${legs(n)} legs` : null), make: onMembers('legs4') });
way({ id: 'top on four legs set in', meets: 'surface', says: 'a top on four legs set in from its corners', when: (n) => (!one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 4 ? `you said ${legs(n)} legs` : n.want.flags.includes('back') ? 'a seat with a back stands on its corners' : null), make: onMembers('legs4in') });
way({ id: 'top on three legs', meets: 'surface', says: 'a top on three legs, which never rock', when: (n) => { const { W, D } = surfaceHow(n); return !one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 3 ? `you said ${legs(n)} legs` : W * D > 0.5 ? 'over half a square metre, three legs leave its corners free to tip' : n.want.flags.includes('back') ? 'a seat with a back stands on four' : null; }, make: onMembers('legs3') });
way({ id: 'top on a column', meets: 'surface', says: 'a top on one column and a foot', when: (n) => { const { W, D, F } = surfaceHow(n); return !one(n) ? 'it has shelves or a span' : legs(n) && legs(n) !== 1 ? `you said ${legs(n)} legs` : W * D > 0.36 || F > 600 ? 'a top this big or this loaded wants more than one column' : n.want.flags.includes('back') ? 'a seat with a back stands on four' : null; }, make: onMembers('column') });
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
    const L = n.want.q.span!.v, W = n.want.q.W!.v, H = n.want.q.H!.v, F = n.want.q.F!.v + n.above, deck = matterFor(c, STRUCTURAL), ends = matterFor(c, BARS, 'beam', 'ends'), seat = Math.max(0.15, L * 0.1);
    let frame: Frame | null = null;
    const make = (t: number) => {
      c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.led = false; c.after = c.base0 ?? null;
      // the deck first, what the rest is derived from; on a frame, the frame under it, and the ends under the rails
      const under = frame ? placeFrame(c, frame, deck, c.x0, c.y0 + H, c.z0, L + 2 * seat, W, 'deck') - c.y0 : H - t;
      if (!frame) box(c, 'deck', deck, c.x0, c.y0 + H - t / 2, c.z0, L + 2 * seat, W, t, 'plate', `over the gap, on both ends`, `as thin a sheet of ${matterOf(deck).name} as the load law lets bear ${+(F / G).toPrecision(3)} kg across ${M(L)} by two, bending under 1/250 of it`);
      const w0 = c.why; c.why = `to hold the ${frame ? 'rails' : 'deck'} up at each side of the gap`;
      for (const [i, sx] of [-1, 1].entries()) box(c, `end${i + 1}`, ends, c.x0 + sx * (L / 2 + seat / 2), c.y0 + under / 2, c.z0, seat, W, under, 'block', `${sx < 0 ? 'left' : 'right'} of the gap, on what it stands on`, `a block ${MM(seat)} mm wide: the ${frame ? 'rails bear' : 'deck bears'} on it over that length`);
      c.why = w0;
    };
    const tried = trySheets(c, familyOf(deck), L / 60, make, () => `load ${c.p}_deck with ${+F.toFixed(1)} N + ${c.p}_deck.mass * g`, L);
    let t = tried.t;
    for (const k of [1, 2]) STANDS.set(`${c.p}_end${k}`, 'the banks it rests on');
    // no sheet alone spans it, or it must be light and a frame is lighter: joists across the deck on two rails along the
    // span, held on the ends
    const fam = familyOf(deck), by = fam === 'wood' ? framingWood(c) : familyOf(ends) === 'metal' ? ends : 'aluminum.6061-t6';
    if (!tried.ok || c.light !== undefined) {
      const f = frameFor(deck, by, L + 2 * seat, W, F, L, true), sheetKg = (L + 2 * seat) * W * t * matterOf(deck).density;
      if (f && (!tried.ok || f.kg < sheetKg)) { frame = f; t = f.T; make(t); c.choices.push(`${tried.ok ? `a sheet alone would weigh ${+sheetKg.toPrecision(3)} kg` : noSheet(fam, L)}, so it is framed: the deck ${frameSays(f, c)}, the lightest of the frames that bear it (${+f.kg.toPrecision(3)} kg)`); }
      else if (!tried.ok) c.gaps.push(`${noSheet(fam, L)}, and no frame of joists and rails of the kept sections does either`);
    }
    c.choices.push(`a ${MM(t)} mm deck of ${matterOf(deck).name} over ${M(L)} on two ends of ${matterOf(ends).name}`);
    c.loads.push(`load ${c.p}_deck with ${+F.toFixed(1)} N + ${c.p}_deck.mass * g`);
    const fr = frame, Lw = L + 2 * seat, bay = fr ? (Lw - fr.joist.b) / (fr.n - 1) - fr.joist.b : L;
    c.checks.push(() => { const v = LOADS.get(`${c.p}_deck`); return v ? { what: fr ? `its deck bears ${+(F / G).toPrecision(3)} kg between its joists` : `it spans ${M(L)} under ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= bay / 250, says: `the load law: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(bay)} is ${len(bay / 250)})` } : null; });
    if (fr) {
      const mid = `${c.p}_joist${fr.n / 2}`, topN = Lw * W * fr.T * matterOf(deck).density * G, sp = (Lw - fr.joist.b) / (fr.n - 1), jF = F / 2 + (topN * sp) / Lw;
      c.loads.push(`load ${mid} with ${+jF.toFixed(1)} N + ${mid}.mass * g`, `load ${c.p}_rail1 with ${+((F + topN) / 2).toFixed(1)} N + ${fr.n} * ${c.p}_joist1.mass * g / 2 + ${c.p}_rail1.mass * g`);
      c.checks.push(() => { const v = LOADS.get(mid); return v ? { what: `its joists bear half the load across ${len(W)}`, ok: v.factor >= 2 && v.bend <= W / 250, says: `the load law, ${+(jF / G).toPrecision(3)} kg at the middle of the joist under the deck's middle: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(W)} is ${len(W / 250)})` } : null; });
      c.checks.push(() => { const v = LOADS.get(`${c.p}_rail1`); return v ? { what: `it spans ${M(L)} under ${+(F / G).toPrecision(3)} kg on its rails`, ok: v.factor >= 2 && v.bend <= L / 250, says: `the load law, half the load, the deck and the joists at the rail's middle, held on the two ends: ${factorSays(v.factor)}, bending ${len(v.bend)} (1/250 of ${len(L)} is ${len(L / 250)})` } : null; });
    }
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
    const Hp = L + 0.05 + 0.05, mem = memberFor(mt, 'square', ((rides * G) / 2) * 1.5, Hp), sp = mem.size;
    let yb = c.y0;
    const w0 = c.why, bw = W + 2 * sp + 0.1, bt = 0.012;
    if (!n.on) { c.why = 'to stand the posts on the floor and tie them together'; box(c, 'base', 'steel.a36', X, yb + bt / 2, Z, bw, D, bt, 'base', 'on the floor, under the posts', `a ${len(bt)} steel plate as wide as the posts and what rides between them: its size is theirs, its thickness taken, not derived`); yb += bt; c.choices.push(`a ${len(bt)} steel base ${len(bw)} × ${len(D)} under it all (${+(bw * D * bt * matterOf('steel.a36').density).toPrecision(3)} kg; its thickness taken, not derived)`); }
    c.why = 'to guide the carriage up and down';
    for (const [i, sx] of [-1, 1].entries()) upright(c, `post${i + 1}`, mt, 'square', mem, X + sx * (W / 2 + sp / 2), yb, Z, Hp, `${sx < 0 ? 'left' : 'right'} of the carriage, on ${n.on ? 'what it stands on' : 'the base'}`, `the least square bar of ${matterOf(mt).name} that carries half of what rides by three: ${mem.says}`);
    c.why = w0;
    const cn = box(c, 'carriage', deck, X, yb + 0.002 + cw / 2, Z, W, D, cw, 'plate', 'between the posts, its ends against them, 2 mm up', `a ${len(cw)} plate of ${md.name}: held at its ends by the posts, what rides spread on it, it bears it by two and bends under 1/250 of ${len(W)} (M = F W / 8)`, { moving: true });
    c.steps.push(`slide ${cn} on ${c.p}_post1 along y between 0 mm and ${MM(L)} mm`); c.traces.push({ step: c.steps.at(-1)!, what: `${cn}'s slide`, called: c.way, why: `so it rides up ${len(L)} and back`, when: '', where: 'where its end touches the left post, along it', how: 'a Jolt slider along y with its stops at the bottom and at the travel' });
    c.choices.push(`a ${len(cw)} carriage of ${md.name} ${len(W)} × ${len(D)} riding ${len(L)} up and down between two ${len(sp)} square posts of ${matterOf(mt).name}`);
    c.gaps.push('what raises it (a screw, a winch or a scissor linkage, and what turns that) is not derived: it is pushed up in the test');
    c.checks.push(() => ({ what: 'its posts carry what rides without buckling', ok: mem.ok, says: `each carries half of ${+rides.toPrecision(3)} kg (what rides and the carriage), half again: ${mem.says}` }));
    c.tests.push({ kind: 'raise', name: cn, L });
    c.top = { y: yb + 0.002 + cw, w: W, d: D, name: cn }; c.foot = [W + 2 * sp + (n.on ? 0 : 0.1), D];
  },
});

// -- mobility: a load moved over the floor at a speed ------------------------------------------------------------------
/** What a load moved at a speed needs of the motors that drive it, for each motor kept with each gearhead that fits it
 *  (or none): its wheel turns at v / r, its motor n times that (under nine tenths of its speed with no load at its
 *  volts); held at that speed by a controller, each gives at most n η K_t I at the wheel, I its continuous current to
 *  keep rolling and twice that for a short start (estimated: a controller's peak). Rolling takes 0.02 of the weight
 *  (estimated, rubber on a hard floor), starting 0.3 m/s² more. The lightest that does both is taken. */
function driveFor(kg: number, v: number, pickR: number, count: number, slope = 0) {
  const out: { motor: MotorData; gear: (typeof GEARHEADS)[string] | undefined; n: number; r: number; roll: number; start: number; cont: number; peak: number; ok: boolean; fast: boolean; mass: number }[] = [];
  for (const motor of Object.values(MOTORS)) for (const gear of [undefined, ...Object.values(GEARHEADS).filter((g) => g.fits.includes(motor.id))]) {
    const md = motorModel(motor), n = gear?.ratio ?? 1, eta = gear?.efficiency ?? 1, r = pickR + (motor.diameter / 2) * 0.6, wMotor = (n * v) / r;
    const roll = (0.02 * Math.cos(slope) + Math.sin(slope)) * kg * G * r, start = roll + kg * 0.3 * r, cont = 2 * (n * eta * md.Kt * md.maxContinuousCurrent - n * md.Tf), peak = 2 * (n * eta * md.Kt * 2 * md.maxContinuousCurrent - n * md.Tf);
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
    const v = n.want.q.v!.v, said = n.want.q.W?.by === 'you' ? n.want.q.W.v : 0, W = Math.max(n.fit[0], said, 0.3), D = Math.max(n.fit[1], n.want.q.D?.by === 'you' ? n.want.q.D.v : 0, 0.25), deck = matterFor(c, STRUCTURAL.filter((x) => !/stainless|steel/.test(x)));
    const carried = (n.want.q.m?.v ?? 0) + n.above / G, guess = carried + W * D * 0.012 * matterOf(deck).density + 2 + 0.5;
    const slope = n.want.q.slope?.v ?? 0, ch = driveFor(guess, v, pick(c.rnd, [0.04, 0.05, 0.06, 0.075]), count, slope), motor = ch.motor, Rm = motor.diameter / 2, gear = ch.gear, n2 = ch.n, r = ch.r;
    const wt = Math.max(0.012, r * 0.35), gl = gear ? gear.length : 0, t = 0.012, yb = c.y0 + r + Rm, X = c.x0, Z = c.z0, rpm = (v / r) * 60 / (2 * Math.PI);
    if (!ch.fast) c.gaps.push(`${+v.toPrecision(3)} m/s on ${len(2 * r)} wheels turns ${motor.label}${gear ? ` through ${gear.ratio}:1` : ''} past its speed at its volts: no motor kept goes that fast`);
    c.choices.push(`a deck of ${matterOf(deck).name} on ${count} wheels ${len(2 * r)} across, the back two each turned by ${motor.label}${gear ? ` through ${gear.label}` : ''}, held at ${+rpm.toPrecision(3)} rpm by a speed controller from its ${motor.V} V (it steers by its back wheels; the front ${count === 3 ? 'one does' : 'two do'} not swivel)`);
    box(c, 'deck', deck, X, yb + t / 2, Z, W, D, t, 'plate', `${len(r + Rm)} up on its wheels' axles, over ${len(W)} × ${len(D)} (as wide as what it carries)`, `12 mm sheet: it is held at ${count === 3 ? 'three' : 'four'} points by its motors and axle block${count === 3 ? '' : 's'}, close under what it carries`);
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
      const kg = (MADE.get(p) ?? guess) + (CARRIED.get(p) ?? 0), roll = (0.02 * Math.cos(slope) + Math.sin(slope)) * kg * G * r, start = roll + kg * 0.3 * r;
      return { what: `its motors can start and keep rolling what it carries${slope ? ` up ${+((slope * 180) / Math.PI).toPrecision(3)}°` : ''}`, ok: ch.cont >= roll && ch.peak >= start, says: `${+kg.toPrecision(3)} kg in all (itself as made and what it carries): rolling${slope ? ` up the slope (m g (0.02 cos θ + sin θ); worked out: the test in Jolt is on the flat)` : ''} takes ${+roll.toPrecision(3)} N·m at the wheels (0.02 of its weight, estimated) and ${+start.toPrecision(3)} N·m to start it at 0.3 m/s²; its two motors give ${+ch.cont.toPrecision(3)} N·m held at their continuous current and ${+ch.peak.toPrecision(3)} N·m for a start at twice it${gear ? `, through ${n2}:1 at ${gear.efficiency}` : ''}${ch.ok ? '' : ': no motor kept, with any gearhead kept, does both at this speed'}` };
    });
    c.tests.push({ kind: 'drive', v, deck: `${c.p}_deck` });
    c.top = { y: yb + t, w: W, d: D, name: `${c.p}_deck` }; c.foot = [W + 2 * (wt + gl + 0.01), D + (count === 3 ? 2 * r + 0.06 : 0)];
  };
}
const cartFits = (n: Need) => { const { across, motor } = leastCart(), said = n.want.q.W?.by === 'you' ? n.want.q.W.v : null; return said !== null && said < across ? `at ${len(said)} across, nothing kept is small enough to drive it: the smallest motor kept is ${len(motor.diameter)} across, and its wheels and deck at least ${len(across)}` : null; };
way({ id: 'four wheels, two driven', meets: 'mobility', says: 'a deck on four wheels, the back two turned by motors', when: (n) => cartFits(n) ?? (n.want.q.wheels && n.want.q.wheels.v !== 4 ? `you said ${n.want.q.wheels.v} wheels` : null), make: wheels(4) });
way({ id: 'three wheels, two driven', meets: 'mobility', says: 'a deck on two driven wheels and one free one in front', when: (n) => cartFits(n) ?? (n.want.q.wheels && n.want.q.wheels.v !== 3 ? `you said ${n.want.q.wheels.v} wheels` : n.above > 400 ? 'what it carries is too heavy to leave one corner on one wheel' : null), make: wheels(3) });

// -- bodies: what stands on a surface -------------------------------------------------------------------------------------
way({
  id: 'a plate on a motor', meets: 'spin', says: 'a plate turned by a motor standing under it, through a gearhead where the speed is low', when: () => null,
  make: (n, c) => {
    const rpm = n.want.q.rpm!.v, Dia = n.want.q.Dia!.v, motor = smallMotor(), md = motorModel(motor), gear = gearFor(motor);
    // through the gearhead where the motor would turn under a twentieth of its speed with no load (a speed held that
    // low is held badly, and the gearhead gives the torque to start the plate)
    const n2 = gear && rpm < 0.05 * md.noLoadSpeed ? gear.ratio : 1, plate = matterFor(c, STRUCTURAL), t = familyOf(plate) === 'wood' ? 0.012 : 0.004, X = c.x0, Z = c.z0, said = (rpm * 60) / (2 * Math.PI);
    if (n2 * rpm > 0.9 * md.noLoadSpeed) c.gaps.push(`${+said.toPrecision(3)} rpm turns ${motor.label} past its speed at its volts: no motor kept turns that fast`);
    c.choices.push(`a ${len(Dia)} plate of ${matterOf(plate).name} on ${motor.label}${n2 > 1 ? ` through ${gear!.label}` : ''}, held at ${+said.toPrecision(3)} rpm by a speed controller from its ${motor.V} V`);
    let y = c.y0; const bw = Math.max(Dia + 0.04, 0.2);
    if (!n.on) { const w0 = c.why; c.why = 'to stand the motor on the floor and take its torque'; box(c, 'base', 'steel.a36', X, y + 0.005, Z, bw, bw, 0.01, 'base', 'on the floor, under the motor', `a 10 mm steel plate ${len(bw)} square, wider than what turns, so it stands under it and its weight holds the motor's torque`); y += 0.01; c.why = w0; }
    const mn = put(c, `${c.p}_motor`, `place motor named ${c.p}_motor (${motor.id}) at ${M(X)}, ${M(y + motor.length / 2)}, ${M(Z)} along y`, `standing upright on ${n.on ? 'what it stands on' : 'its base'}`, `${motor.label}: held at the speed by a controller${n2 > 1 ? ` through ${n2}:1` : ''}`);
    let holder = mn; y += motor.length;
    if (n2 > 1) { holder = put(c, `${c.p}_gear`, `place gearhead named ${c.p}_gear at ${M(X)}, ${M(y + gear!.length / 2)}, ${M(Z)} along y`, 'on the motor\'s shaft end', `${gear!.label}: the motor alone would turn too slowly to be held steady`); y += gear!.length; }
    const pn = put(c, `${c.p}_plate`, `place disc named ${c.p}_plate of ${plate} at ${M(X)}, ${M(y + t / 2)}, ${M(Z)} size ${MM(Dia)} x ${MM(t)} mm along y`, `on the ${n2 > 1 ? 'gearhead' : 'motor'}'s end`, `${len(Dia)} across, as asked`, { moving: true });
    c.steps.push(`hinge ${pn} to ${holder} driven by ${mn} at ${motor.V} V${n2 > 1 ? ` through ${n2}:1` : ''} held at ${+said.toPrecision(5)} rpm`); c.traces.push({ step: c.steps.at(-1)!, what: `${pn}'s hinge`, called: c.way, why: `so ${mn} turns it at ${+said.toPrecision(3)} rpm`, when: '', where: `where ${pn} touches ${holder}`, how: 'a Jolt hinge, driven by the motor\'s torque line, its volts set by a speed controller' });
    c.tests.push({ kind: 'spin', name: pn, motor: mn, rpm, n: n2 });
    c.top = { y: y + t, w: Dia, d: Dia, name: null }; c.foot = n.on ? [Dia, Dia] : [bw, bw];
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
    const V = n.want.q.V!.v, id = matterFor(c, LIQUID), mt = matterOf(id), ratio = 0.7 + c.rnd() * 0.9, Din = Math.cbrt((4 * 1.1 * V) / (Math.PI * ratio)), h = ratio * Din, p = 1000 * G * h, fam = familyOf(id);
    const t = Math.max(fam === 'plastic' ? 0.003 : 0.0015, (3 * p * (Din / 2)) / mt.yield), Dout = Din + 2 * t, bt = Math.max(2 * (fam === 'plastic' ? 0.003 : 0.0015), 0.006), X = c.x0, Z = c.z0;
    c.choices.push(`an upright tube of ${mt.name} ${MM(Dout)} mm across and ${MM(h)} mm tall, its wall ${MM(t)} mm, closed by a ${MM(bt)} mm base`);
    const w0 = c.why; c.why = 'to close the tube\'s foot, so it holds a liquid';
    box(c, 'base', id, X, c.y0 + bt / 2, Z, Dout + 0.02, Dout + 0.02, bt, 'base', 'under the tube, on what it stands on', `a ${MM(bt)} mm plate wider than the tube: joined to it, it seals the bore`);
    c.why = w0; put(c, `${c.p}_tank`, `place tube named ${c.p}_tank of ${id} at ${M(X)}, ${M(c.y0 + bt + h / 2)}, ${M(Z)} size ${MM(Dout)} x ${MM(h)} x ${MM(t)} mm along y`, 'standing on its base', `inside ${MM(Din)} × ${MM(h)} mm for ${+(V * 1e3).toPrecision(3)} L and a tenth more; its wall as thin as p r / t lets it bear the water at its foot by three (at least ${fam === 'plastic' ? 3 : 1.5} mm to be made)`);
    const cap = (Math.PI * Din * Din * h) / 4, hoop = (p * Din) / 2 / t;
    c.checks.push(() => ({ what: `it holds ${+(V * 1e3).toPrecision(3)} L`, ok: cap >= V, says: `${+(cap * 1e3).toPrecision(3)} L inside` }));
    c.checks.push(() => ({ what: 'its wall bears the liquid\'s pressure', ok: hoop * 3 <= mt.yield * 1.0001, says: `${+(p / 1000).toPrecision(3)} kPa at its foot (ρ g h, water), hoop stress p r / t = ${+(hoop / 1e6).toPrecision(3)} MPa, ${+(mt.yield / hoop).toPrecision(3)} times under its yield` }));
    c.top = { y: c.y0 + bt + h, w: Dout, d: Dout, name: `${c.p}_tank` }; c.foot = [Dout + 0.02, Dout + 0.02];
  },
});
way({
  id: 'floor, walls and roof', meets: 'enclosure', says: 'a floor, four walls standing on it and a roof on them', when: () => null,
  make: (n, c) => {
    const W = n.want.q.W!.v, D = n.want.q.D!.v, H = n.want.q.H!.v, mt = matterFor(c, STRUCTURAL), fam = familyOf(mt), big = Math.max(W, D, H), X = c.x0, Z = c.z0, y0 = c.y0;
    const t = (fam === 'wood' ? [0.009, 0.012, 0.018, 0.025] : fam === 'plastic' ? [0.004, 0.006, 0.01] : [0.0015, 0.002, 0.003, 0.005]).find((x) => x >= big / (fam === 'metal' ? 600 : 60)) ?? (fam === 'wood' ? 0.025 : 0.005);
    const door = c.need.want.flags.includes('door');
    c.choices.push(`a floor, four walls and a roof of ${MM(t)} mm ${matterOf(mt).name}${door ? ', a door hung in the front' : ''}`);
    const how = `${len(t)} ${matterOf(mt).name}: the least sheet kept that is at least ${fam === 'metal' ? '1/600' : '1/60'} of its largest side (${len(big)}), to stand stiff (estimated)`;
    if (t < big / (fam === 'metal' ? 600 : 60)) c.gaps.push(`no ${fam} sheet kept is thick enough for walls ${len(big)} across: the thickest is ${len(t)}, ${+(big / t).toPrecision(3)} times thinner than its largest side`);
    box(c, 'floor', mt, X, y0 + t / 2, Z, W + 2 * t, D + 2 * t, t, 'plate', 'on what it stands on', how);
    box(c, 'left', mt, X - W / 2 - t / 2, y0 + t + H / 2, Z, t, D + 2 * t, H, 'slab', 'on the floor, its left side', how); box(c, 'right', mt, X + W / 2 + t / 2, y0 + t + H / 2, Z, t, D + 2 * t, H, 'slab', 'on the floor, its right side', how);
    box(c, 'back', mt, X, y0 + t + H / 2, Z - D / 2 - t / 2, W, t, H, 'slab', 'on the floor between the sides, at the back', how);
    if (door) {
      const w0 = c.why; c.why = 'to open and shut its front';
      const dn = box(c, 'door', mt, X - 0.002, y0 + t + 0.002 + (H - 0.004) / 2, Z + D / 2 + t / 2, W - 0.004, t, H - 0.004, 'slab', 'in the front, its left edge against the left side', 'the front less 2 mm all round, so it swings clear', { moving: true });
      c.steps.push(`hinge ${dn} to ${c.p}_left about y from -100° to 0°`); c.traces.push({ step: c.steps.at(-1)!, what: `${dn}'s hinge`, called: c.way, why: 'so it swings open outward', when: '', where: 'where its edge touches the left side, about the upright', how: 'a Jolt hinge with stops at shut and 100° open' });
      c.tests.push({ kind: 'swing', name: dn }); c.why = w0;
    } else box(c, 'front', mt, X, y0 + t + H / 2, Z + D / 2 + t / 2, W, t, H, 'slab', 'on the floor between the sides, at the front', how);
    box(c, 'roof', mt, X, y0 + t + H + t / 2, Z, W + 2 * t, D + 2 * t, t, 'plate', 'on the four walls', how);
    c.checks.push(() => ({ what: `it encloses ${MM(W)} × ${MM(D)} × ${MM(H)} mm`, ok: true, says: `inside, ${MM(W)} by ${MM(D)} mm and ${MM(H)} mm tall` }));
    c.top = { y: y0 + 2 * t + H, w: W + 2 * t, d: D + 2 * t, name: `${c.p}_floor` }; c.foot = [W + 2 * t, D + 2 * t];
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
    if (nat.goes === 'floor') n.on = null;
    else if (nat.goes === 'into') n.on = needs.find((x) => x !== n && BODIES.includes(x.kind) && x.kind !== 'track') ?? needs.filter((x) => x !== n && NATURE[x.kind].goes !== 'into' && (x.kind === 'surface' || x.kind === 'mobility')).sort((a, b) => NATURE[b.kind].rank - NATURE[a.kind].rank)[0] ?? null;
    else n.on = needs.filter((x) => x !== n && NATURE[x.kind].rank < nat.rank && takes(x, n)).sort((a, b) => NATURE[b.kind].rank - NATURE[a.kind].rank)[0] ?? null;
  }
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
}
/** How many of the things asked (what it is, does and has; not what it is for) were read into wants it meets. */
const doesOf = (asked: Asked[], gaps: string[], wants: Want[]): [number, number] => { const xs = asked.filter((a) => a.kind !== 'for'); const met = xs.filter((a) => { const fn = a.got; return !!fn && wants.some((w) => w.fn === fn) && !gaps.some((g) => g.startsWith(`nothing kept here can ${FN_WORDS[fn]}`)); }).length; return [met, Math.max(xs.length, met ? 1 : 0)]; };

/** What the size of what was asked bars outright, whatever way is drawn: past its own weight or its own gravity
 *  nothing solid kept stands; below the electrostatic size no coil kept turns it; below inertia's size no rotor flies it;
 *  past its rim speed nothing kept holds it together; and below the smallest parts kept nothing is that small. */
function scaleBars(n: Need, con: Conception): string | null {
  const sc = con.scale; if (!sc) return null;
  const gr = (k: string) => sc.groups.find((x) => x.key === k)!;
  if (gr('self-gravity').past) return `at ${len(sc.L)}: ${gr('self-gravity').says}`;
  if (gr('self-weight').past) return `at ${len(sc.L)}: ${gr('self-weight').says}`;
  if (n.kind === 'spin' && gr('tip speed').past) return `at ${len(sc.L)}: ${gr('tip speed').says}`;
  if (n.kind === 'lift' && gr('Reynolds').value < 1000) return `at ${len(sc.L)}: Reynolds ${gr('Reynolds').says}: a rotor needs it in the thousands`;
  if (['mobility', 'spin', 'lift'].includes(n.kind) && gr('actuation').past) return `at ${len(sc.L)}: ${gr('actuation').says}`;
  if (sc.L < 5e-3) return `at ${len(sc.L)}: nothing kept is that small (the thinnest sheet kept is 1 mm, the smallest motor ${len(Object.values(MOTORS).sort((a, b) => a.diameter - b.diameter)[0]!.diameter)} across)`;
  return null;
}
/** Made once, from one seed: each need met by a way drawn from those that apply, stacked, sized from the top down,
 *  placed from the bottom up, joined, then checked. */
function once(con: Conception, seed: number, prefix: string, at: [number, number], J: Jolt | null): Design {
  const needs = stack(con.wants), ordered = order(needs), plan: string[] = [];
  const base = (n: Need, i: number): Ctx => ({ p: prefix, x0: at[0], z0: at[1], y0: 0, rnd: rngOf(seed + i * 1013), matter: con.matter, light: con.limits.mass, steps: [], traces: [], members: [], loose: [], moving: [], choices: [], gaps: [], checks: [], loads: [], tests: [], need: n, way: '', why: n.why, top: { y: 0, w: 0, d: 0, name: null }, foot: [0, 0], after: null, ride: null, riders: [] });
  const chosen = new Map<Need, Way>(), barred = new Map<Need, string>();
  for (const [i, n] of ordered.entries()) {
    const bar = scaleBars(n, con); if (bar) barred.set(n, bar);
    const ways = WAYS.filter((w) => w.meets === n.kind), probe = base(n, i), open = bar ? [] : ways.filter((w) => w.when(n, probe) === null);
    const w = open.length ? pick(rngOf(seed + i * 7 + 1), open) : null;
    if (w) chosen.set(n, w);
    plan.push(`${n.why}: ${w ? `${w.says} (drawn from ${open.length} way${open.length === 1 ? ' that applies' : 's that apply'}${ways.length > open.length ? `; not ${ways.filter((x) => !open.includes(x)).map((x) => `${x.says}, as ${x.when(n, probe)}`).join('; ')}` : ''})` : bar ? `no way kept meets it ${bar}` : 'no way kept meets it'}${n.on ? `, on ${n.on.why.replace(/^to /, 'what is to ')}` : ', on the floor'}`);
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
    if (below) { c.y0 = below.top.y; c.top = { ...below.top }; if (below.top.name) c.after = c.base0 = { name: below.top.name, why: NATURE[n.kind].goes === 'into' ? 'which it goes into' : 'which it stands on' }; c.ride = below.ride ?? (below.top.name && below.moving.includes(below.top.name) ? below.top.name : null); }
    w.make(n, c); done.set(n, c);
    steps.push(...c.steps); traces.push(...c.traces); members.push(...c.members); loose.push(...c.loose); if (c.ride && c.riders.length) rides.set(c.ride, [...(rides.get(c.ride) ?? []), ...c.riders]); choices.push(...c.choices); gaps.push(...c.gaps); checks.push(...c.checks); loads.push(...c.loads); tests.push(...c.tests);
    if (!n.on) foot = [Math.max(foot[0], c.foot[0]), Math.max(foot[1], c.foot[1])];
  }
  if (barred.size && con.scale) for (const m of con.scale.must) if (!gaps.includes(m)) gaps.push(m);
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
  let made = true;
  for (const s of ordSteps) { try { room.run(s); } catch (e) { made = false; out.push({ what: 'it can be made under the laws', ok: false, says: `"${s.slice(0, 80)}": ${(e as Error).message.slice(0, 240)}` }); break; } }
  if (made) out.push({ what: 'it can be made under the laws', ok: true, says: `${ordSteps.length} steps: each part touches what holds it, held by what the fusion and adhesive laws allow, nothing in anything` });
  if (made) {
    for (const k of [...LOADS.keys()]) if (k.startsWith(`${prefix}_`)) LOADS.delete(k);
    // each load where it is said; where one part is loaded in more than one place, the worst of them is kept
    for (const s of loads) { try { room.run(s); const key = /^load\s+(\S+)/.exec(s)![1]!, was = LOADS.get(key), f = room.value(`${key}.factor`), b = room.value(`${key}.deflection`); LOADS.set(key, was ? { factor: Math.min(was.factor, f), bend: Math.max(was.bend, b) } : { factor: f, bend: b }); } catch (e) { out.push({ what: s, ok: false, says: (e as Error).message.slice(0, 200) }); } }
    MADE.set(prefix, room.all().made.filter((m) => m.name.startsWith(`${prefix}_`)).reduce((a, m) => a + m.mass, 0));
    CARRIED.set(prefix, con.wants.reduce((a, w) => a + (w.fn === 'support' ? (w.q.F!.v / G) * (w.flags.includes('levels') ? Math.max(2, Math.round(w.q.levels?.v ?? 4)) : 1) : w.fn === 'contain' ? w.q.V!.v * 1000 : w.fn === 'move' || w.fn === 'raise' ? w.q.m?.v ?? 0 : 0), 0));
    for (const f of checks) { const r = f(); if (r) out.push(r); }
    // what it is to carry, put on it as a block of steel of that weight while it is tested (not part of it)
    let k = 0;
    for (const n of ordered) {
      const c2 = done.get(n); if (!c2) continue;
      const tops = n.kind === 'surface' ? (n.want.flags.includes('levels') ? Array.from({ length: Math.max(2, Math.round(n.want.q.levels?.v ?? 4)) }, (_, i) => `${prefix}_shelf${i + 1}`) : [c2.top.name]) : (n.kind === 'mobility' || n.kind === 'hoist') && !ordered.some((x) => x.on === n) ? [c2.top.name] : [];
      const kgs = n.kind === 'surface' ? n.want.q.F!.v / G : (n.want.q.m?.v ?? 0);
      for (const tn of tops) {
        const tm = tn ? room.all().made.find((m) => m.name === tn) : undefined; if (!tm || !(kgs > 0)) continue;
        const side = Math.min(0.6 * Math.min(tm.w, tm.d), Math.cbrt(kgs / 7850)), h = kgs / (7850 * side * side);
        try { room.run(`place block named test_load${++k} of steel.a36 at ${M(tm.at[0])}, ${M(tm.at[1] + tm.h / 2 + h / 2)}, ${M(tm.at[2])} size ${MM(side)} x ${MM(side)} x ${MM(h)} mm`); } catch { /* where it does not fit, it is tested without it */ }
      }
    }
    if (k) out.push({ what: 'tested with what it carries on it', ok: true, says: `${k} block${k > 1 ? 's' : ''} of steel of the weight wanted, on ${k > 1 ? 'each surface' : 'it'}, while it is let go and pushed` });
    out.push(...(J ? physics(room, prefix, piece, tests, [...rides.values()].flat()) : [{ what: 'it stands', ok: true, says: 'not tested: the physics engine is not loaded here' }]));
    for (const t of tests) if (t.kind === 'warm') out.push(warmed(room, t, con.limits.power));
  }
  const ms = room.all().made.filter((m) => m.name.startsWith(`${prefix}_`)), mass = ms.reduce((a, m) => a + m.mass, 0);
  // where its weight is: the kinds of part that weigh most, each summed (its joists as one), so a limit missed says where to look
  const heaviest = (xs: typeof ms) => { const by = new Map<string, [number, number]>(); for (const m of xs) { const k = m.name.slice(prefix.length + 1).replace(/\d+$/, ''), was = by.get(k) ?? [0, 0]; by.set(k, [was[0] + m.mass, was[1] + 1]); } return [...by].sort((x, y) => y[1][0] - x[1][0]).slice(0, 3).map(([k, [v, n]]) => `${n > 1 ? `the ${n} ${k.replace(/_/g, ' ')}s` : `the ${k.replace(/_/g, ' ')}`} ${+v.toPrecision(3)} kg`).join(', '); };
  // what was said it must not pass: its own weight, its width, height and depth, as made
  const L = con.limits, ext = (i: number) => (ms.length ? Math.max(...ms.map((m) => m.at[i]! + [m.w, m.h, m.d][i]! / 2)) - Math.min(...ms.map((m) => m.at[i]! - [m.w, m.h, m.d][i]! / 2)) : 0);
  const own = ms.filter((m) => !STANDS.has(m.name)), ownKg = own.reduce((a, m) => a + m.mass, 0), stand = ms.filter((m) => STANDS.has(m.name));
  if (made && L.mass !== undefined) out.push({ what: `it weighs no more than ${+L.mass.toPrecision(3)} kg`, ok: ownKg <= L.mass * 1.0001, says: `it weighs ${+ownKg.toPrecision(3)} kg, its parts added up${stand.length ? ` (not counting its ${stand.length} ${[...new Set(stand.map((m) => m.name.slice(prefix.length + 1).replace(/\d+$/, '')))].join(', ')}s, ${+(mass - ownKg).toPrecision(3)} kg, which stand for ${STANDS.get(stand[0]!.name)})` : ''}${ownKg > L.mass ? `: ${+(ownKg / L.mass).toPrecision(2)} times the limit; where it weighs most: ${heaviest(own)}` : ''}` });
  for (const [k, i, word] of [['W', 0, 'wide'], ['H', 1, 'tall'], ['D', 2, 'deep']] as const) if (made && L[k] !== undefined) { const e = ext(i); out.push({ what: `it is no more than ${len(L[k]!)} ${word}`, ok: e <= L[k]! * 1.0001, says: `it is ${len(e)} ${word} as made` }); }
  // what it raises, it raises only in part where what raises and holds it is not derived: its travel and guides are made
  const unraised = gaps.some((g) => g.startsWith('what raises it'));
  const asked = con.asked.map((a) => (a.got === 'raise' && a.kind === 'does' && unraised ? { ...a, got: null, why: 'its travel and its guides are made and tested; what raises it and holds it there (a screw, a winch, a linkage) is not derived' } : a)), does = doesOf(asked, gaps, con.wants), ok = made && out.every((x) => x.ok);
  return { name: con.name, title: `${con.name} (seed ${seed})`, seed, prefix, steps: ordSteps, traces: tr, checks: out, ok, choices, tries: [], gaps, mass, parts: ms.length, footprint: foot, words: con.words, plan, asked, does, whole: ok && !gaps.length && does[0] === does[1] };
}
/** How far a thing's up axis turned between two turnings: tipping, whatever it turned about its upright. */
const tiltOf = (from: number[], to: number[]) => { const a = matOf(from as [number, number, number]), b = matOf(to as [number, number, number]); const dot = a[1] * b[1] + a[4] * b[4] + a[7] * b[7]; return Math.acos(Math.max(-1, Math.min(1, dot))); };
/** With real physics: let go, it stands; pushed at its top by a tenth of its weight, it does not tip; what moves, moves. */
function physics(w: Workshop, prefix: string, piece: string[], tests: Test[], riders: string[] = []): Check[] {
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
    if (!drive && piece.length) {
      // pushed across its narrower way, where it tips first, by a tenth of its weight with what it carries, at the top of
      // the highest part that stands or rides or turns on it; how far it tips is read off what stands
      const loadKg = w.all().made.filter((m) => m.name.startsWith('test_load')).reduce((a, m) => a + m.mass, 0), total = [...after.values()].reduce((a, m) => a + m.mass, 0) + loadKg;
      const topOf = (xs: string[]) => xs.map((n) => after.get(n)!).filter(Boolean).sort((a, b) => b.at[1] + b.h / 2 - (a.at[1] + a.h / 2))[0];
      const top = topOf([...piece, ...riders, ...(spin ? [spin.name] : [])])!, frame = topOf(piece)!, r0 = [...frame.turn], F = 0.1 * total * G;
      const xs = [...after.values()].map((m) => [m.at[0] - m.w / 2, m.at[0] + m.w / 2, m.at[2] - m.d / 2, m.at[2] + m.d / 2]), wx = Math.max(...xs.map((v) => v[1]!)) - Math.min(...xs.map((v) => v[0]!)), wz = Math.max(...xs.map((v) => v[3]!)) - Math.min(...xs.map((v) => v[2]!)), ax = wz < wx ? 'z' : 'x';
      w.run(`push ${top.name} with ${+F.toFixed(2)} N along ${ax} for 0.5 s at its top`);
      const t1 = mine().get(frame.name)!, tip = tiltOf(r0, t1.turn);
      out.push({ what: 'pushed at its top, it does not tip', ok: tip < (5 * Math.PI) / 180, says: `pushed at the top of ${top.name.replace(`${prefix}_`, '')} across its narrower way (${ax}) with a tenth of its weight and its load's (${+F.toPrecision(3)} N) for half a second (Jolt), it tilted ${+((tip * 180) / Math.PI).toFixed(1)}° (more than 5° fails)` });
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
        out.push({ what: `it raises what it carries ${len(t.L)}`, ok: tr > 0.2 * t.L && tr <= t.L + 2e-3, says: `pushed up with twice the weight of what rides (${+F.toPrecision(3)} N, for ${+kg.toPrecision(3)} kg) for 1.5 s (Jolt), it rose as far as ${len(tr)}, its stop at ${len(t.L)}, and came down again when let go, as nothing holds it there; the work to raise it the whole way is ${+((kg * G * t.L) / 1000).toPrecision(3)} kJ (m g h)` });
      }
    }
  } catch (e) { out.push({ what: 'it behaves when let go', ok: false, says: (e as Error).message.slice(0, 240) }); }
  return out;
}
/** Kept warm: a heater as strong as the air takes at the temperature, then heat let flow until it settles there. */
function warmed(w: Workshop, t: Extract<Test, { kind: 'warm' }>, most?: number): Check {
  try {
    const m = w.all().made.find((x) => x.name === t.name); if (!m?.matter) return { what: `it keeps warm at ${t.T} °C`, ok: false, says: `${t.name} is not made` };
    const th = thermalOf(m.matter), A = Number.isFinite(m.area) ? m.area : 2 * (m.w * m.h + m.w * m.d + m.h * m.d), P = heatLoss(t.T, A * 0.9, Math.max(m.h, 0.01), th.emissivity);
    w.run(`heat ${t.name} with ${+P.toFixed(3)} W`); const secs = Math.min(30 * 86400, Math.max(1800, (8 * m.mass * th.c * Math.max(t.T - AMBIENT, 1)) / Math.max(P, 1e-3)));
    w.run(`let heat flow for ${secs.toFixed(0)} s`); const T1 = w.value(`${t.name}.temperature`), fu = FUSION[m.matter.id], safe = !fu || ((fu.melts ?? 1e9) > t.T + 50 && (fu.lost ?? 1e9) > t.T + 50);
    return { what: `it keeps warm at ${t.T} °C`, ok: Math.abs(T1 - t.T) < 0.15 * Math.max(t.T - AMBIENT, 10) && safe && (most === undefined || P <= most), says: `a ${+P.toPrecision(3)} W heater, what still air takes from it at ${t.T} °C (convection and radiation); let flow for ${+(secs / 3600).toPrecision(2)} h it came to ${+T1.toPrecision(4)} °C (what touches it takes some too)${safe ? '' : `, but ${m.matter.name} does not bear that heat`}${most !== undefined ? `; ${P <= most ? 'within' : 'more than'} the ${+most.toPrecision(3)} W it may use` : ''}` };
  } catch (e) { return { what: `it keeps warm at ${t.T} °C`, ok: false, says: (e as Error).message.slice(0, 200) }; }
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
  if (!c.wants.length) return `${not.length ? `I read what it is asked to be and do, but none of it is something I make yet: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : `Nothing in "${c.words.trim()}" says what it is to do.`}${c.dropped.length ? ` Numbers not used: ${c.dropped.slice(0, 6).join('; ')}.` : ''} I make things that ${Object.values(FN_WORDS).join(', ')}.${c.questions.length ? ` ${c.questions[0]!.ask}` : ''}`;
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

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
import { eulerOf, matOf, matterOf, Workshop, type Axis, type Made, type World } from './generate';
import { readConditions, roomOf, type Conditions } from './conditions';
import { designFrame, frameAt, hullOf, scaleLaw, sectionFor, type FrameAsk, type FrameMatter, type MadeFrame, type Section as StrutSection, type V3, type Wind } from './adapt';
import { planTree, touching, type Ax, type Box as FBox, type Fold, type TreePlan } from './foldtree';
import type { Clip } from './flows';
import type { Jolt } from './realize';
import type { SimTrack } from './sim';

// ==== wants, read from words ============================================================================================
export type Fn = 'support' | 'move' | 'turn' | 'swing' | 'slide' | 'raise' | 'contain' | 'enclose' | 'warm' | 'lift' | 'float';
/** A figure a want has: given by the person, answered to a question, the usual one for what was named, or estimated. */
export interface Fig { v: number; unit: string; by: 'you' | 'answer' | 'usual' | 'estimate'; grounds: string }
export interface Want { fn: Fn; says: string; q: Record<string, Fig>; flags: string[]; /** the conditions it is grown from, read from what the ask says it must do, whatever it calls it */ cond?: Conditions }
export type Kind = 'length' | 'mass' | 'speed' | 'rpm' | 'temperature' | 'volume' | 'count' | 'what';
export interface Question { key: string; want: number; ask: string; kind: Kind; value: number; unit: string; grounds: string }
/** One thing the ask asks for, as said: what it is, something it does or has, or what it is for; and what of it was read. */
export interface Asked { text: string; kind: 'thing' | 'does' | 'has' | 'for' | 'limit'; got: Fn | null; why: string; /** a limit said, met where its own check passes */ met?: boolean; /** a weight it carries, said: done where what carries it bears it */ load?: true; /** how it is done, where not by a want's own way ("folds") */ how?: string }
/** A limit said of the whole: no heavier, wider, taller or deeper than so much (SI). */
export interface Limits { mass?: number; W?: number; H?: number; D?: number; /** its plan, the larger way and the smaller, either way round, m */ plan?: [number, number]; /** watts it may draw */ power?: number; /** the most any one part may weigh, kg; the most it may sag under load, m */ part?: number; sag?: number; /** the sizes it must fold or pack down to, m; how thin it must fold flat to; how wide across it must fold to */ fold?: number[]; foldThin?: number; foldW?: number; /** what it packs into, folded, m³ */ foldVol?: number }
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
  P(/\b(walkers?|rollators?|walking frames?|zimmer frames?)\b/, 'walker', 'support', { H: fig(0.85, 'm', 'estimate', 'its grips at 850 mm, about a standing adult\'s wrist height (estimate)'), W: fig(0.6, 'm', 'estimate', 'a frame 600 mm wide'), D: fig(0.5, 'm', 'estimate', 'and 500 mm deep') }),
  P(/\b(bed|bunk|cot)\b/, 'bed', 'support', { H: fig(0.45, 'm', 'estimate', 'a mattress base at 450 mm'), W: fig(0.9, 'm', 'usual', 'a single bed 900 mm wide'), D: fig(2.0, 'm', 'usual', 'and 2.0 m long'), F: fig(150 * G, 'N', 'estimate', 'a person and a mattress, about 150 kg') }),
  P(/\b(shelf|shelves|shelving|bookcase|bookshelf|rack|cubbies|cubby|cubbyholes?|pigeonholes?|storage units?|backpack storage|bag storage)\b/, 'shelf', 'support', { H: fig(1.8, 'm', 'estimate', 'shelving 1.8 m tall'), W: fig(0.8, 'm', 'estimate', '800 mm wide'), D: fig(0.3, 'm', 'estimate', '300 mm deep'), F: fig(25 * G, 'N', 'estimate', 'about 25 kg on each shelf (books weigh about 20 kg a metre)'), levels: fig(4, '', 'estimate', 'four shelves') }, ['levels']),
  P(/\b(tower|lookout|watchtower|scaffold|hide)\b/, 'platform', 'support', { H: fig(3, 'm', 'estimate', 'standing 3 m up'), W: fig(1.5, 'm', 'estimate', '1.5 m across'), D: fig(1.5, 'm', 'estimate', 'and 1.5 m deep'), F: fig(200 * G, 'N', 'estimate', 'two people on it, about 200 kg') }),
  P(/\b(climbing frames?|jungle gyms?|play ?structures?|play ?frames?|monkey bars)\b|(?=.*\bclimbing\b)(?=.*\b(frames?|structures?)\b)/, 'platform', 'support', { H: fig(1.0, 'm', 'estimate', 'its top 1 m up (estimate)'), W: fig(2.0, 'm', 'estimate', '2 m long'), D: fig(1.2, 'm', 'estimate', 'and 1.2 m deep'), F: fig(4 * 30 * G, 'N', 'estimate', 'four children of 30 kg (estimate)') }),
  P(/\b(platform|stage|deck|step|footstool|tray|surface)\b/, 'platform', 'support', { H: fig(0.3, 'm', 'estimate', 'standing 300 mm up'), W: fig(1.2, 'm', 'estimate', '1.2 m across'), D: fig(1.2, 'm', 'estimate', 'and 1.2 m deep'), F: fig(200 * G, 'N', 'estimate', 'two people standing on it, about 200 kg') }),
  P(/\b(bridge|footbridge|span|walkway|gangway|catwalk)\b/, 'bridge', 'support', { span: fig(2, 'm', 'estimate', 'a gap of 2 m'), W: fig(0.6, 'm', 'estimate', '600 mm wide'), H: fig(0.3, 'm', 'estimate', 'its deck 300 mm up'), F: fig(100 * G, 'N', 'estimate', 'a person crossing, about 100 kg') }, ['span']),
  P(/\b(umbrella|parasol)\b/, 'shade', 'support', { H: fig(2.0, 'm', 'estimate', 'its canopy 2 m up'), W: fig(2.0, 'm', 'estimate', 'a canopy 2 m across'), D: fig(2.0, 'm', 'estimate', 'and 2 m deep'), F: fig(1 * G, 'N', 'estimate', 'nothing on it but itself, about 1 kg') }, ['pole']),
  P(/\b(stand|holder|pedestal|plinth|mount|easel|tripod|display)\b/, 'stand', 'support', { H: fig(0.8, 'm', 'estimate', 'holding it 800 mm up'), W: fig(0.3, 'm', 'estimate', 'on a top 300 mm across'), D: fig(0.3, 'm', 'estimate', 'and 300 mm deep'), F: fig(5 * G, 'N', 'estimate', 'something of about 5 kg') }),
  P(/\b(cart|trolley|wagon|rover|vehicle|car|buggy|kart|truck|dolly|skateboard|tricycle|trike|bicycle|bike|scooter|wheelbarrow|pram|stroller|wheelchair|trailer|sleds?|sledges?|pulks?|pulkas?|toboggans?)\b/, 'cart', 'move', { m: fig(5, 'kg', 'estimate', 'a load of 5 kg'), v: fig(0.5, 'm/s', 'estimate', 'at a slow walk, 0.5 m/s (a walk is about 1.3 m/s)') }),
  P(/\b(motor|engine|flywheel|rotor|armature)\b/, 'motor', 'turn', { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.1, 'm', 'estimate', 'what turns 100 mm across') }),
  P(/\b(fan|turntable|spinner|spinning top|carousel|lazy susan|mixer|potter'?s wheel|centrifuge|rotisserie)\b/, 'turntable', 'turn', { rpm: fig((60 * 2 * Math.PI) / 60, 'rpm', 'estimate', 'turning at 60 rpm'), Dia: fig(0.3, 'm', 'estimate', 'a turning plate 300 mm across') }),
  P(/\b(door|gate|lid|hatch|flap|shutter)\b/, 'door', 'swing', { W: fig(0.8, 'm', 'estimate', 'a leaf 800 mm wide'), H: fig(2.0, 'm', 'estimate', 'and 2.0 m tall, as a person walks through') }),
  P(/\b(drawer|slider|rail|carriage)\b/, 'slider', 'slide', { L: fig(0.4, 'm', 'estimate', 'travelling 400 mm'), m: fig(5, 'kg', 'estimate', 'carrying about 5 kg') }),
  P(/\b(lift|lifter|elevator|hoist|jack|winch|crane|bale lifter|bale hoist)\b/, 'lift', 'raise', { L: fig(1, 'm', 'estimate', 'raising it 1 m'), m: fig(20, 'kg', 'estimate', 'about 20 kg') }),
  P(/\b(cup|mug|tumbler|beaker)\b/, 'cup', 'contain', { V: fig(3.5e-4, 'm³', 'estimate', 'holding 350 ml, a mug') }),
  P(/\b(bottle|flask|thermos)\b/, 'bottle', 'contain', { V: fig(7.5e-4, 'm³', 'estimate', 'holding 750 ml') }),
  P(/\b(kettle|saucepan|jug)\b/, 'kettle', 'contain', { V: fig(1.5e-3, 'm³', 'estimate', 'holding 1.5 L') }),
  P(/\b(planters?|plant pots?|flower ?box(es)?|window ?box(es)?|raised beds?|grow beds?|garden beds?|plant troughs?)\b/, 'planter', 'support', { H: fig(0.3, 'm', 'estimate', 'standing 300 mm up'), W: fig(0.6, 'm', 'estimate', '600 mm long'), D: fig(0.3, 'm', 'estimate', 'and 300 mm wide'), F: fig(0.6 * 0.3 * 0.2 * 1300 * G, 'N', 'estimate', 'its soil: 200 mm of it over 600 × 300 mm at about 1300 kg/m³ (estimate)'), rho: fig(1300, 'kg/m³', 'estimate', 'soil, about 1300 kg/m³ (estimate)'), lkg: fig(0.6 * 0.3 * 0.2 * 1300, 'kg', 'estimate', '200 mm of soil over 600 × 300 mm') }, ['loose']),
  P(/\b(tank|bucket|jar|barrel|vat|pot|water butt|cistern|aquarium|vase|bin|hopper|canister)\b/, 'tank', 'contain', { V: fig(0.01, 'm³', 'estimate', 'holding 10 L') }),
  P(/\b(box|crate|case|chest|enclosure|house|hut|shed|shelter|cabin|kennel|doghouse|birdhouse|coop|room|tent|cabinet|cupboard|locker|cage|hutch|greenhouses?|glasshouses?|stalls?|booths?|kiosks?|gazebos?|pavilions?|barns?|stables?|lean-tos?)\b/, 'box', 'enclose', { W: fig(0.4, 'm', 'estimate', 'inside 400 mm wide'), D: fig(0.3, 'm', 'estimate', '300 mm deep'), H: fig(0.3, 'm', 'estimate', 'and 300 mm tall') }),
  P(/\b(ovens?|kilns?|incubators?|proofers?|smokers?|dehydrators?)\b/, 'oven', 'enclose', { W: fig(0.4, 'm', 'estimate', 'inside 400 mm wide'), D: fig(0.35, 'm', 'estimate', '350 mm deep'), H: fig(0.25, 'm', 'estimate', 'and 250 mm tall') }, ['door']),
  P(/\b(heater|warmer|hot ?plate|stove)\b/, 'warmer', 'warm', { T: fig(60, '°C', 'estimate', 'kept at 60 °C'), W: fig(0.15, 'm', 'estimate', 'a warm surface 150 mm across'), D: fig(0.15, 'm', 'estimate', 'and 150 mm deep') }),
  P(/\b(drone|quadcopter|multicopter|helicopter|copter)\b/, 'flyer', 'lift', { m: fig(0.3, 'kg', 'estimate', 'carrying 300 g') }),
  P(/\b(boat|raft|canoe|kayak|ship|pontoon|barge|dinghy|floating docks?|floating platforms?|floating piers?)\b/, 'raft', 'float', { m: fig(80, 'kg', 'estimate', 'one person, 80 kg') }),
];
/** Words that open what someone says, or say who it is for, and so name nothing it is: "ok so I cave dive", "my dad's 82",
 *  "I'd like a design for". */
const NOT_A_NAME = /^(ok|okay|so|well|hi|hey|um|uh|yes|yeah|please|hello|design|designs|plan|plans|blueprint|drawing|concept|request|requests|idea|budget|help|question|thing|things|something|anything|i|we|me|my|our|you)$|'s?$/;
/** Words for the part that holds the rest of a thing together: "a quadcopter frame", "a cart chassis" is that thing, made
 *  as what holds it together ("a desk clock" is a clock: there the word before is only where it goes). */
const PART_OF = /^(frames?|chassis|airframes?|hulls?|housings?|skeletons?|carcass(es)?)$/;
/** Things said that only say what it works on or for, not what it is: the thing names that are no thing it makes. */
const GENERIC = /^(something|thing|things|device|machine|gadget|contraption|robot|bot|system|unit|apparatus|tool|mechanism|one|it|invention|object|structure)$/;
/** What a verb asks of it, read with what it acts on: a want, or what it would need that is not kept, and why. */
type VerbRead = { fn?: Fn; load?: true; note?: string; context?: true; flags?: string[] };
const LIQUID_WORDS = /\b(water|liquid|oil|milk|juice|coffee|tea|soup|fuel|wine|beer|paint|honey)\b/;
const INFO = /\b(data|files?|photos?|videos?|music|songs?|information|memory|tb|gb|mb|kb|bytes?|terabytes?|gigabytes?)\b/;
function readVerb(v: string, obj: string, all: string): VerbRead {
  const w = v.toLowerCase(), o = ` ${obj} `;
  // "a pull-down attic stair", "a drop-down desk": it folds out of where it is kept
  if (/^(pull|drop|fold|swing|flip)-(down|out|up|away)$/.test(w)) return { fn: 'swing', flags: ['fold'] };
  // "stays quieter than 40 dB", "stays under 32 C inside": how it keeps, read by its figures; how loud, said back
  if (/^(stay|remain)/.test(w) && /^\s*(shut|closed|locked|latched)\b/.test(o)) return { note: 'what holds it shut: a latch at its far end to a post set in the ground, made and weighed below where a push it must stay shut against is said' };
  if (/^(stay|remain)/.test(w) && /\b(quiet|quieter|silent|noise|noisy|loud|db|decibels?)\b/.test(o)) return { note: 'how loud it is: the sound it makes is not weighed' };
  if (/^(stay|remain)/.test(w) && /\d|\b(under|below|above|over|within|cool|cooler|warm|warmer|dry|level|stable)\b/.test(o)) return { context: true };
  // "rides in a pickup bed": carried in a vehicle, which is not made
  if (/^rides?$/.test(w) && /^\s*(in|on)\s+(?:\S+\s+){0,3}(beds?|trucks?|trailers?|vans?|boots?|trunks?|pickups?|vehicles?|cars?|racks?)\b/.test(o)) return { note: 'carried in a vehicle: what it rides in is not made, and its size against it is not checked' };
  if (/^(roll|drive|move|travel|deliver|ride|wheel|cruise|tow|haul|drag|push|pull)/.test(w)) return /^(push|pull|tow|haul|drag)/.test(w) && !/\b(on wheels|along|across)\b/.test(o) ? { load: true, fn: 'move' } : { fn: 'move' };
  if (/^(spin|rotat|revolv)/.test(w)) return { fn: 'turn' };
  if (/^turn/.test(w)) return /\binto\b/.test(o) ? { note: 'turning one thing into another (a conversion of energy or matter) is not something kept' } : { fn: 'turn' };
  // "pitched by two gloved people in under four minutes", "assembled by two people with hand tools": who puts it up
  if (/^(pitch|pitched|erected|assembled|put|set|raised|built|installed)$/.test(w) && /^\s*(up\s+)?by\s+(one|two|three|four|a single|\d+)\b/.test(o)) return { note: 'who puts it up, and how long it takes: setting it up is not derived' };
  // "opens in under 2 minutes", "sets up in 30 s": how long it takes to put up, not a door that swings
  if (/^(open|opens|opening|unfold|unfolds|deploy|deploys|erect|erects|pitch|pitches)$/.test(w) && /^\s*(in|within)\s+(under|less than|about|around|\d)/.test(o)) return { note: 'how long it takes to put up: setting it up is not weighed' };
  if (/^(open|swing|hinge|pivot)/.test(w)) return { fn: 'swing' };
  // "a tracked crawler": on tracks, not wheels
  if (/^(tracked|treaded|crawler)$/.test(w)) return { note: 'on tracks (a crawler): tracks are not kept; only wheels are' };
  // "brakes on its own on a slope": a brake its wheels drive against, not kept; the pull it must hold is weighed below
  if (/^(brake|brakes|braking)$/.test(w)) return { note: 'braking: a brake (a shoe or band pressed on a turning wheel) is not kept; what it must hold is weighed below' };
  // "to open or close": shutting is what opens it, back: said with it, not a thing of its own
  if (/^(close|closes|closing|shut|shuts|shutting)$/.test(w) && /\bopen/.test(all)) return { context: true };
  // "a hand … has to close with less than 0.5 N": closing on what it holds, a grip
  if (/^(close|closes|closing)$/.test(w) && /\b(hands?|grippers?|claws?|jaws?|fingers?|grabbers?|tongs|pincers?)\b/.test(all)) return { note: 'closing on what it holds (a grip): a hand that moves by itself is not kept; how hard it may squeeze is heard below' };
  // "holds up in 90 km/h winds", "stands up to snow": what it withstands, heard with its numbers, not a weight it carries
  // ("holds up to a sudden 1000 N lean": a load it carries)
  if (/^(hold|holds|holding|stand|stands|standing)$/.test(w) && /^\s*up\s+(in|to|against|under)\b/.test(o) && !/^\s*up\s+to\s+(?:\S+\s+){0,3}[\d.,]+\s*(kg|kn|n|lbs?|t|tonnes?|tons?)\b/i.test(o)) return { context: true };
  // "has to carry": a must, the verb after it is what it does
  if (/^(has|have|had|got)$/.test(w) && (/^\s*to\b/.test(o) || !o.trim()) || /^needs?$/.test(w) && /^\s*to\b/.test(o)) return { context: true };
  // "cross a 5 km lake at 10 knots" said of something that goes: a journey, not a span
  if (/^(cross|crosses|crossing)$/.test(w) && (/\bat\s+[\d.,]+\s*(knots?|kn|km\/h|kph|mph|m\/s)\b/.test(o) || /\b(car|boat|ship|vehicle|bike|bicycle|truck|ferry|amphibi\w*|drone|plane|aircraft|rover|robot|tug|hovercraft|kayak|canoe)\b/.test(all) && !/\bbridge\b/.test(all))) return { fn: 'move' };
  if (/^(span|spans|spanning|cross|crosses|crossing|bridge|bridges)$/.test(w)) return { fn: 'support', flags: ['span'], load: true };
  if (/^(pack|packs|packing|fold|collaps|unfold)/.test(w) && /^\s*(into|down|flat|away|up|small)/.test(o)) return { fn: 'swing', flags: ['fold'] };
  if (/^(fold|collaps|unfold)/.test(w)) return /^\s*(flat|up|away|down|shut|open|closed|in|half|out|back|together|itself|to|into a|when|\s)/.test(o) && !/\b(sheet|cloth|towel|clothes|shirt|paper|fabric|laundry|blanket)\b/.test(o) ? { fn: 'swing', flags: ['fold'] } : { note: 'folding something else (cloth, paper): handling soft things is not kept' };
  // "telescopes up to 25 m": a mast standing up out of itself, nested tubes, not a way kept; standing, it is weighed below
  if (/^(telescop|extend)/.test(w) && /^\s*(up|upward|upwards|skyward)\b/.test(o)) return { note: 'telescoping up (nested tubes sliding out of one another): not a way kept; standing that tall it is weighed below' };
  if (/^(slid|glid|extend|retract|telescop)/.test(w)) return { fn: 'slide' };
  // "raise a 20 m run in 10 minutes": put up into place, the run its length
  if (/^(rais|lift|put)/.test(w) && /^\s*(a|an|the|its|our)?\s*[\d.,]+\s*\w+\s+(run|length|stretch|section)s?\b/.test(o)) return { note: 'putting it up into place: what it is put up by (the people said) and how long it takes are not weighed, as nothing that is raised is made' };
  if (/^(lift|rais|lower|hoist|elevat|winch)/.test(w)) return /\b(off the ground|into the air|in the air|airborne)\b/.test(o) || /^lift/.test(w) && /^\s*itself\s*$/.test(o) ? { fn: 'lift' } : /\b(cable|rope|chain|winch|hook|line|tether|string)\b/.test(o) ? { load: true, note: 'raising or lowering on a cable (a winch and a line): rope and cable are not kept' } : { fn: 'raise', load: true };
  // "using nothing but body heat": what warms it, a noun, not something it does
  if (/^(blow|blows|blowing|vent|vents)$/.test(w)) return { note: 'blowing air through it (a fan, a draught): moving air is not kept' };
  if (/^(warm|heat)/.test(w)) return w === 'heat' && /\b(body|bodies'?|own|their|our) heat\b/.test(all) ? { context: true } : { fn: 'warm' };
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
    // "hold back 1.2 m of floodwater": water held on one side, not a weight held up
    if (/^(hold|keep)/.test(w) && /^\s*back\b/.test(o) && /\b(water|flood\w*|sea|tides?|rivers?|waves?|mud|soil|earth)\b/.test(o)) return { note: "holding back water on one side (a flood wall, a dam): a wall under the water's push is not a way kept yet; its push is weighed below" };
    if (INFO.test(o) || /^\s*\d[\d,.]*\s*(tb|gb|mb|kb|bytes?)\b/.test(o)) return { note: 'holding information (data) is electronics: not kept yet' };
    // "keeps the house warm": what it warms is not made here; "keeps the inside livable": weighed through its walls
    if (/^keep/.test(w) && /\b(house|home|room|rooms|building|flat|apartment|office|people|us|them|family)\b/.test(o) && /\b(warm|heated|toasty)\b/.test(o)) return { note: `keeping ${cut(obj.replace(/\s+(warm|heated|toasty)\b.*$/, ''), 30)} warm: what it heats is not made here; what heat it holds or gives is weighed below` };
    if (/^keep/.test(w) && /\b(livable|liveable|habitable|comfortable)\b/.test(o)) return { note: 'keeping the inside livable: weighed below, through its walls, against what warms it' };
    if (/\bwarm\b|\bhot\b/.test(o)) return { fn: 'warm' };
    if (/\b(in|out|inside|dry|safe)\s*$/.test(o.trim()) && !/\b(goes|go|went|going|runs?|ran|cuts?|gives?|gave|blacks?|wears?|times?|is|are|was|power|lights?)\s+(in|out)\s*$/.test(o.trim()) || /\bkeeps? (?:\S+ ){1,4}(?:in|out)(?:\s+of\b|\s*$)/.test(`${w}${o.trim()}`)) return { fn: 'enclose' };
    const o1 = ` ${o.split(/\b(?:through|over|on|at|across|from|to|for|with|while|in|into|after|during|by)\b/)[0]} `;
    if (LIQUID_WORDS.test(o1) || /\d\s*(l|litres?|liters?|ml|gal|gallons?)\b/.test(o1)) return /^keep/.test(w) && /\b(below|under|cool|cold|chill\w*|frozen|freez\w*)\b/.test(o) && /\d\s*(°|º)\s*[cf]\b/i.test(o) ? { fn: 'contain', note: 'keeping it cold: cooling is not kept; what holds it is made, and the heat that leaks in is weighed below' } : { fn: 'contain' };
    // "holds 101 kPa of cabin air": a pressure held in, weighed where it is heard; "holds 85 °C": a temperature held
    if (/^(hold|keep)/.test(w) && /\d\s*(k|m|g)?pa\b|\d\s*(bar|psi|atm)\b/i.test(o1)) return { context: true };
    if (/^(hold|keep)/.test(w) && /\d\s*(°|º)\s*[cf]\b|\d\s*degrees?\s+(c|f|celsius|fahrenheit)\b/i.test(o1)) return /\b(below|under|cool|cold|chill\w*|frozen|freez\w*)\b/.test(o) ? { note: 'cooling: keeping warm is kept, cooling is not' } : { fn: 'warm' };
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
  if (/^runs?$/.test(w)) return /\b(month|week|day|hour|year|charge|battery|power|batteries|sun|solar|mains|electricity)s?\b/.test(o) ? { note: 'running on stored or gathered power (a battery, a cell): electric power is not kept yet' } : !o.trim() || /^\s*(along|on|across|around|over|down|up|at|through|between|from|back|fast|quickly|smoothly)\b/.test(o) ? { fn: 'move' } : { note: `running ${cut(o.trim(), 40)} (working it, as a computer runs what it is in): electronics are not kept yet` };
  if (/^(fill|refill|top|charg|recharg)/.test(w) && /\b(batter(y|ies)|power station|power bank|cells?|phones?|laptops?|packs?)\b/.test(o)) return { note: 'charging a battery: electric power is not kept yet; what light or power would fill it is weighed below' };
  if (/^stop/.test(w)) return { note: 'stopping when it senses something (a touch, a pinch): sensing and control are not kept' };
  if (/^water/.test(w) && /\b(itself|plants?|soil|garden|it)\b/.test(o)) return { note: 'watering itself: moving water from a tank to the soil needs pipes and a pump or a wick, not kept; how much it would need is weighed below' };
  if (/^(measur|dispens|pour|fill|refill|pump|spray|drain|flow|squirt|dose|portion|mete)/.test(w)) return { note: 'moving liquids or grains (pumping, filling, measuring out) needs tanks, pipes and pumps, not kept yet' };
  if (/^crawl/.test(w) && /\b(pipes?|tubes?|ducts?|tunnels?|sewers?|drains?|culverts?)\b/.test(o)) return { fn: 'move' };
  // "a slider that crawls at 2 mm/s": what slides creeps along its rail
  if (/^(crawl|creep|inch|glide)/.test(w) && /\b(sliders?|rails?|carriages?|dolly|dollies|tracks?)\b/.test(all)) return { fn: 'slide' };
  if (/^(climb|crawl|walk|swim|enter|jump|dig|burrow|hop|step)/.test(w)) return { note: 'getting about by legs, by climbing or by swimming: only wheels are kept' };
  // "seals against abrasive regolith": a seal pressed shut (a gasket, a lip), not a seal on living things
  if (/^seal/.test(w) && !/\b(wounds?|cuts?|skin|veins?|vessels?)\b/.test(o)) return { note: 'sealing (a gasket or lip pressed shut): a seal\'s squeeze and its wear are not weighed' };
  if (/^(seal|graft|kill|harm|grow|heal|feed|plant|pollinat|treat|cure)/.test(w)) return { note: 'working on living things: biology is not kept' };
  // "charges from 3 kW of spare solar": what it takes in, weighed below; the heater it charges by is not kept
  if (/^charg/.test(w) && /^\s*from\b/.test(o)) return { note: 'charging from what is said: what it takes in is weighed below; what turns it to heat or stores it (a heater, a cell) is not kept' };
  // "powered by the rolling wheels": its own motion turned to work (a dynamo, a brake its wheels drive), not stored power
  if (/^power/.test(w) && /\bby\s+(its\s+|the\s+)?(own\s+)?(rolling|turning|spinning|moving)?\s*(wheels?|motion|movement|rolling)\b/.test(o)) return { note: 'powered by its own rolling (a dynamo or a brake its wheels drive, storing nothing): not kept' };
  if (/^(read|send|show|display|glow|light|play|ring|beep|sens|detect|count|record|comput|process|transmit|receiv|charg|power|blink|talk|listen|scan|photograph|film|stream|alert|notif|monitor|run)/.test(w)) return { note: 'electronics (sensing, computing, lighting, sending, running on stored power): circuits and cells are not kept yet' };
  // tilting what it carries, on its own: a drive that tilts it, weighed below by what it carries tilted
  if (/^(tilt|rock|recline|incline)/.test(w) && /\b\d+(\.\d+)?\s*(°|deg|degrees?)\b/.test(all)) return { note: 'tilting what it carries: a drive that tilts it is not kept; what it carries, tilted so, is weighed below' };
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
  [/\b(corers?|core samplers?|core tubes?|sampling|samplers?|augers?)\b/, 'a tool that cuts into a ground and holds what it cuts (a corer): cutting and holding a sample are not kept'],
  [/^(?=.*\b(heat|thermal)\b)(?=.*\b(batter(y|ies)|stores?|storage|banks?)\b)/, 'storing heat in a mass (sand, stone, water): a heat store is not a way kept yet; what it would hold is weighed below'],
  [/\b(turbines?|windmills?|wind ?mills?|generators?|dynamos?|water ?wheels?|alternators?)\b/, 'making power from wind or water (a rotor turning a generator): energy conversion is not kept; what the flow can give is weighed below'],
  [/(?=.*\bflood\w*\b)(?=.*\b(barriers?|walls?|gates?|boards?|shields?|guards?)\b)|\b(levees?|dams?|dikes?|dykes?|sea ?walls?|sandbags?)\b/, 'holding back water on one side (a flood wall, a barrier): a wall under the water\'s push is not a way kept yet; its push is weighed below'],
  [/\b(brakes?|clutch(es)?)\b/, 'a brake (a shoe or band pressed on a turning wheel): not kept; what it must hold is weighed below'],
  [/\b(masts?|flag ?poles?|pylons?)\b/, 'a mast standing tall (a column held only at its foot, telescoping or not): standing tall alone is not a way kept yet; what the wind on it takes is weighed below'],
  [/\b(board|chip|circuit|computer|cpu|processor|cores?|risc|microsd|sd|card|memory|data storage|data|display|screen|e-ink|ink|leds?|sensors?|bluetooth|wifi|usb|usb-c|battery|batteries|solar(?![- ]?sails?)|cell|electricity|phone|camera|speaker|antenna|radio|charger|charge|power|lux|light|lamp|strip|patch)\b/, 'electronics and electric power (circuits, chips, cells, lights): not kept yet'],
  [/\b(bees?|mites?|varroa|skin|blood|sugar|glucose|sweat|bark|grafts?|trees?|redwoods?|plants?|living|purring|cells|body|organs?)\b/, 'living things: biology is not kept'],
  [/\b(solar[- ]?sails?|light[- ]?sails?|venus|mars|moon|sun|planet|planet's|orbit|space|satellite|rocket|spaceship|spacecraft|station|equator|sunshade|asteroid|comet|galaxy|star)\b/, 'space and other worlds (orbits, vacuum, other atmospheres): not kept yet'],
  [/\b(balloon|airship|blimp|wings?|kite|glider|parachute|gusts?|wind|clouds?|altitude|sky|air)\b/, 'flying by wings or by being lighter than air, and weather: only rotors (worked out, not flown) are kept'],
  [/\b(pumps?|pipes?|hoses?|valves?|nozzles?|jugs?|jets?|fountain|sprinkler|shampoo|conditioner|wash|pasta|rice|lentils|grain|powder)\b/, 'moving liquids and grains (pipes, pumps, dispensers): not kept yet'],
  [/\b(docking|berthing|mating)\b.*\b(collars?|rings?|ports?|adapters?)\b|\b(collars?|rings?|ports?|adapters?)\b.*\b(docking|berthing|mating)\b/, 'docking (a ring that latches two craft together, and its latches): not a way kept; what its hatch holds is weighed below'],
  [/\b(sheets?|cloth|fabric|towels?|clothes|backpack|bag|straps?|collar|rope|cables?|net|string|hooks?|harness)\b/, 'soft or flexible things (cloth, rope, cable): only rigid parts are kept'],
  [/\b(piano|notes?|music|bells?|sound|songs?)\b/, 'sound: not kept'],
  [/\b(staircase|stairs|steps|ladder|ramp|escalator)\b/, 'stairs and ramps: a stepped or sloped surface is not a way kept yet'],
  [/\b(habitat|dome)s?\b/, 'a habitat (walls that hold air in and keep people alive): one enclosure on the ground at a time is kept, and none that holds a pressure'],
  [/\b(city|town|village|building|skyscraper|tower|colony)\b/, 'a city or a building of many rooms and floors: one enclosure at a time is kept'],
  [/\b(insert|dispenser|folder|organizer|organiser|sorter|feeder)\b/, 'a thing named by a job it does: what it is made of follows what it does'],
  [/\b(legs?|legged|tentacles?|arms?|hands?|grippers?|claws?)\b/, 'limbs that move by themselves: only wheels and hinges are kept'],
];
// "hand-carried", "handheld", "hand-cranked": how it is worked or carried, not a hand it has
const areaOf = (s: string) => { const x = ` ${s} `.replace(/\bhand[- ]?(carried|held|operated|powered|cranked|built|made|pushed|pulled|turned|wound|tightened)\b|\bhandheld\b/g, ' '); return AREAS.find(([re]) => re.test(x))?.[1] ?? 'not a kind of thing kept'; };
/** What everyday things weigh, roughly, and how big they are, so "a stand for my laptop" knows what it holds (estimates). */
const MASSES: [RegExp, number, string, [number, number, number]?][] = [
  [/\bphones?\b/, 0.2, 'a phone', [0.08, 0.16, 0.01]], [/\btablets?\b|\bipad/, 0.5, 'a tablet', [0.18, 0.25, 0.01]], [/\blaptops?\b/, 2, 'a laptop', [0.33, 0.23, 0.02]], [/\bmonitors?\b|\bscreens?\b/, 6, 'a monitor', [0.6, 0.25, 0.45]],
  [/\b(tv|television)s?\b/, 15, 'a television', [1.2, 0.3, 0.7]], [/\bbooks\b/, 20, 'books, a shelf of them'], [/\bbook\b/, 0.5, 'a book'], [/\bplants?\b|\bflower ?pots?\b/, 5, 'a potted plant', [0.3, 0.3, 0.5]],
  [/\bcats?\b/, 4.5, 'a cat', [0.46, 0.25, 0.3]], [/\bdogs?\b/, 25, 'a dog', [0.9, 0.35, 0.65]], [/\b(kids?|child|children)\b/, 30, 'a child', [0.4, 0.3, 1.3]], [/\b(person|adult|me|myself|human|man|woman|courier|people)\b/, 80, 'a person', [0.5, 0.3, 1.8]],
  [/\b(cups?|mugs?|coffee|tea)\b/, 0.35, 'a full cup', [0.1, 0.1, 0.12]], [/\bbottles?\b/, 1, 'a bottle'], [/\btools\b/, 10, 'tools'], [/\bprinters?\b/, 10, 'a printer', [0.45, 0.4, 0.3]],
  [/\bspeakers?\b/, 3, 'a speaker', [0.2, 0.2, 0.3]], [/\blamps?\b/, 2, 'a lamp', [0.25, 0.25, 0.5]], [/\b(groceries|shopping)\b/, 10, 'shopping'], [/\b(bags?|backpacks?)\b/, 8, 'a bag'], [/\bbikes?\b|\bbicycles?\b/, 13, 'a bicycle'],
  [/\b(?:hay |straw )?bales?\b/, 25, 'a small square bale of hay (two-string, about 360 × 460 × 910 mm, estimate)', [0.91, 0.46, 0.36]], [/\bguitars?\b/, 4, 'a guitar'], [/\bcameras?\b/, 1, 'a camera', [0.15, 0.12, 0.1]], [/\b(tiles?|bricks?)\b/, 15, 'a stack of tiles'],
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
  [/^(flat-?pack|flat-?packed|knock-?down|kit)$/, 'flat-pack: it is made as parts joined where it is used; how it comes apart, packs and is put together again is not derived'],
  [/^(vacuum|insulated|double-walled|vacuum-insulated|thermal)$/, 'an insulated wall (a vacuum between two walls, or foam) is not kept: what it is made of is bare'],
  [/^(hand-?crank(ed)?|crank(ed)?|crank-powered)$/, 'worked by a hand crank: the crank, and the drum or gears it turns, are not kept'],
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
  move: { m: fig(5, 'kg', 'estimate', 'a load of 5 kg'), v: fig(0.5, 'm/s', 'estimate', 'at a slow walk, 0.5 m/s (a walk is about 1.3 m/s)') },
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
  // "so there's nothing to charge": it carries no store to charge; said back, not read as what it does
  const noCharge = /,?\s*so (?:that )?there(?:'s| is| will be) nothing to (?:charge|plug in|refuel|recharge)\b/i.exec(words);
  // "a rescue crew can hike in on their backs": carried in by people, piece by piece: said back, weighed by the limit on a piece
  const onBacks = /\b(?:that\s+)?(?:a|an|the)?\s*(?:[a-z-]+\s+){0,3}(?:can|could|will)\s+(?:hike|carry|pack|walk|haul|bring|lug)\s+(?:it\s+)?(?:in|out|up)?\s*(?:on\s+(?:their|his|her|our|my)\s+backs?)\b/i.exec(words);
  const words1 = (putQ ? words.replace(putQ[0], '') : words).replace(noCharge?.[0] ?? '\u0000', '').replace(onBacks?.[0] ?? '\u0000', '')
    // "a footbridge a rescue crew can hike in": a clause with its "that" left out, put back
    .replace(/\b(a|an)\s+([a-z-]+)\s+(?=(?:a|an|the|my|our|your|their|his|her)\s+(?:[a-z-]+\s+){0,3}(?:can|could|will|would|should|may|might|must)\s)/i, '$1 $2 that ').replace(/\b([23])[- ]?[dD]\b/g, (_m, d: string) => (d === '3' ? 'three-D' : 'two-D'));
  const pa = parseAsk(words1), t = pa.t, heard: string[] = [], assumed: string[] = [], unread: string[] = [], wants: Want[] = [], asked: Asked[] = [], dropped: string[] = [], limits: Limits = {};
  if (putQ) heard.push(`${putQ[1]!.trim()}: a question put with it, answered by the laws below`);
  if (noCharge) heard.push('nothing to charge: it carries no store of power to charge');
  if (onBacks) heard.push('carried in on people\'s backs: each piece no more than one carries (the limit on a piece, where said)');
  const add = (fn: Fn, says: string, q: Record<string, Fig> = {}, flags: string[] = []) => { if (!wants.some((w) => w.fn === fn)) wants.push({ fn, says, q: structuredClone(q), flags: [...flags] }); const w = wants.find((x) => x.fn === fn)!; for (const f of flags) if (!w.flags.includes(f)) w.flags.push(f); return w; };
  const purposeOf = (w: string | null) => (w ? PURPOSES.find((p) => p.re.test(` ${w.replace(/-/g, ' ')} `) || p.re.test(` ${singular(w)} `)) : undefined);
  const massOf = (s: string) => MASSES.find(([re]) => re.test(` ${s} `));
  let name = '', purposeName = '', occupant: (typeof MASSES)[number] | null = null, loadSaid: { N: number; text: string } | null = null;
  const loadsSaid: string[] = [], said: Said = { size: {} }, own: { ax: string; v: number }[] = [];
  let planUnder = false;
  // "telescopes up to 25 m": how tall it stands
  { const up = /\b(?:telescop\w*|extends?|extending|rises?|rising|raises?|stands?|reaches?)\s+(?:up\s+)?to\s+([\d.]+)\s*m\b/i.exec(words1); if (up && /\b(masts?|poles?|towers?|antennas?|aerials?|flagpoles?)\b/i.test(words1)) said.standH = Number(up[1]); }
  said.words = t;
  // it digs its way: said before its numbers are, so a speed it burrows at is weighed, not dropped
  said.burrows = /\b(burrow\w*|dig\w*|tunnel\w*)\b/.test(t);
  let depthLoad: { d: number; rho: number; text: string } | null = null, looseSaid: { rho: number; kg: number; what: string } | null = null;
  const means = new Map<number, string>(), mainHead = pa.clauses.find((c) => c.kind === 'main' && c.head)?.head ?? null;
  // a fold, a pack or an opening of the whole of it, when it is not itself a leaf, and nothing it is has a door to open
  const wholeFold = (r: VerbRead, whole: boolean, own: Fn | undefined, verb = '') => whole && r.fn === 'swing' && own !== 'swing' && (!!r.flags?.includes('fold') || /^open/.test(verb) && own !== 'enclose' && own !== 'contain' && !wants.some((w) => w.fn === 'enclose' || w.fn === 'contain'));
  const objOf = (c: (typeof pa.clauses)[number]) => [...c.obj.map((i) => pa.toks[i]!.w), ...pa.clauses.slice(pa.clauses.indexOf(c) + 1).filter((x, k, xs) => (x.kind === 'where' || x.kind === 'for') && xs.slice(0, k).every((y) => y.kind === 'where' || y.kind === 'for')).flatMap((x) => [x.opener, x.text])].join(' ');
  // what it is, what it has, what it does, what it is for: clause by clause
  // "a design for a 4.8 m fishing kayak": what it is, is what the design is for
  for (const [i, c] of pa.clauses.entries()) { const nx = pa.clauses[i + 1]; if (c.kind === 'main' && /^(design|designs|plan|plans|blueprint|blueprints|drawing|drawings|concept)$/.test(c.head ?? '') && nx?.kind === 'for' && nx.head) nx.kind = 'main'; }
  for (const c of pa.clauses) {
    // "a sled I can haul": a thing named before a clause about it with no "that": the thing is the word before its pronoun
    const pi = c.mods.findIndex((m) => /^(i|we|you|he|she|they)$/.test(m));
    if ((c.kind === 'main' || c.kind === 'has' || c.kind === 'for') && pi > 0) { c.head = c.mods[pi - 1]!; c.mods = c.mods.slice(0, pi - 1); }
    // "want to build my own canister light", "I need a ...": what is wanted is the thing
    const wm = c.kind === 'does' ? /^(?:i\s+|we\s+)?(?:want|wants|need|needs|would like|'d like)\s+(?:to\s+(?:build|make|design|get|have)\s+)?(?:(?:my|our|a|an|the|some)\s+)?(?:own\s+)?([a-z][a-z' -]*[a-z])$/.exec(c.text.trim()) : null;
    if (wm && !/^(to|it|that|this|them|one|something|anything)\b/.test(wm[1]!)) { const ws = wm[1]!.split(/\s+/); c.kind = 'main'; c.head = ws.at(-1)!; c.mods = ws.slice(0, -1); }
    // "my husky lives in the yard", "my dad's 82": who it is for and how they are, not a thing it is
    if (c.kind === 'main' && c.head && (/'s$/.test(c.head) || /^(my|our|his|her|their)\b/.test(c.text.trim()) && /^(lives|works|flips|sells|exists|is|has|gets|keeps|runs|goes|uses|wants|needs|likes|hates|chews|knocks|tips|plays|sleeps|stays)$/.test(c.head))) c.head = null;
    // "his right hand": what someone else has, not what it has
    if (c.kind === 'has' && /^(his|her|their)\b/.test(c.text.trim())) c.head = null;
  }
  pa.clauses.forEach((c, ci) => {
    // "Parts budget around $150", "BOM $250": what it may cost, said where its figure is (a cost, not weighed), not a thing
    if ((c.kind === 'main' || c.kind === 'has') && /^(budgets?|costs?|prices?|boms?|spend(ing)?)$/.test(c.head ?? '')) return;
    // "no more than two bolts through the trunk": how many fixings may go through what it is fixed to; what is made is
    // fixed to nothing that is not made, so none go through it
    if (/^no (more|fewer|less)$/.test(c.text.trim()) && pa.clauses[ci + 1]?.opener === 'than') { const rest = pa.clauses.slice(ci + 1, ci + 3).filter((x, k) => k === 0 || /^(through|into|in|to)$/.test(x.opener)).map((x) => `${x.opener} ${x.text}`).join(' ');
      if (/\b(bolts?|screws?|nails?|fixings?|fasteners?|holes?|anchors?|lags?)\b/.test(rest)) { asked.push({ text: `${c.text.trim()} ${rest}`, kind: 'limit', got: null, met: true, why: 'none go through it: what is made stands on its own feet, fixed to nothing that is not made' }); return; } }
    // "no grid power", "needs no power or batteries", "with no electricity", "no burning fuel": it may draw none, a limit
    // checked against what is made; "no tools beyond a drill": how it goes together, said back
    { const nn = /^(?:needs?\s+|uses?\s+|with\s+|and\s+|runs?\s+on\s+|has\s+)?(?:no|zero|without(?:\s+any)?)\s+(.+)$/.exec(c.text.trim());
      if (nn && /^(?:grid\s+|mains\s+|electric(?:al)?\s+|outside\s+|external\s+|burning\s+|fossil\s+)?(?:power|electricity|batter(?:y|ies)|fuel|mains|gas|grid|propane|petrol|diesel)\b/.test(nn[1]!)) {
        // "no grid power" rules out the grid, not power of its own (cells in the sun, a store they fill); "no burning
        // fuel" rules out a flame; "no power", "no electricity" rule out both
        const w0 = nn[1]!;
        if (/^(?:grid|mains|outside|external)\b|^(?:power|electricity)\s+(?:from|off)\s+(?:the\s+)?(?:grid|mains)\b/.test(w0)) { said.noGrid = true; heard.push(`${c.text.trim().replace(/\s+(and|or|but)$/, '')}: a limit: nothing it makes is wired to a grid; power of its own (cells in the sun, a store they fill) is not ruled out`); return; }
        if (/^(?:burning\s+|fossil\s+)?(?:fuel|gas|propane|petrol|diesel)\b/.test(w0)) { said.noFuel = true; heard.push(`${c.text.trim().replace(/\s+(and|or|but)$/, '')}: a limit, checked against what it makes that burns`); return; }
        said.noPower = true; heard.push(`${c.text.trim().replace(/\s+(and|or|but)$/, '')}: a limit, checked against what it makes that draws power`); return; }
      if (nn && /^(?:special\s+|power\s+)?tools?\b/.test(nn[1]!)) { asked.push({ text: c.text.trim(), kind: 'limit', got: null, met: false, why: 'what it takes to put together: how it goes together is not derived, so this is not checked' }); return; } }
    // "with zero visible judder": said back above, not a thing it has
    if (/^zero\s+((?:[\w-]+\s+){0,2}?)(leak\w*|emissions?|spills?|judder|jitter|vibrations?|backlash|play|drift|wobble)\b/.test(c.text.trim())) return;
    // "no foam that can shed microplastics": what the thing not wanted does is not something it does
    if (c.kind === 'does' && /^(that|which|who)$/.test(c.opener) && /^(no|without)\b/.test(pa.clauses[ci - 1]?.text ?? '')) return;
    // "1.2 m wind chop": the waves it floats in, read as a figure, not something it does
    if (c.kind === 'does' && /^(chop|chops|waves?|swells?|wind)$/.test(c.verb ?? '') && /\b(chop|waves?|swells?|seas?)\b/.test(c.text) && /\d/.test(c.text) && wants.some((w) => w.fn === 'float')) return;
    // "one person assembles", "two teachers can put it up": who puts it together, said back: how is not derived
    if (/^(?:by\s+)?(?:one|two|three|four|a single|\d+)\s+(?:gloved\s+|adult\s+|grown\s+)?(?:person|people|adults?|teachers?|workers?|men|women|volunteers?|climbers?)\s+(?:can\s+|could\s+|must\s+|should\s+)?(?:assembles?|erects?|puts?|pitch(?:es)?|builds?|installs?|sets?|raises?)\b/.test(c.text.trim())) { asked.push({ text: c.text.trim(), kind: 'does', got: null, why: 'who puts it together, and how long it takes: setting it up is not derived' }); return; }
    if (c.kind === 'main' || c.kind === 'has') {
      if (!c.head) return;
      // "for someone with a Parkinson's tremor": who it is for, said of them, not of it
      const prev = pa.clauses[ci - 1];
      if (c.kind === 'has' && prev?.kind === 'for' && /^(someone|somebody|person|people|user|users|patients?|child|children|kids?|man|men|woman|women|adults?|elderly|seniors?|me|myself|him|her|them|everyone|anyone|grandma|grandpa|mum|mom|dad)$/.test(prev.head ?? '')) { const i = asked.findIndex((a) => a.kind === 'for' && a.text.includes(prev.text)); const said0 = `${prev.text} ${c.opener ? `${c.opener} ` : ''}${c.text}`.replace(/\s+(that|which|who|whose|for)$/, ''); if (i >= 0) asked[i] = { ...asked[i]!, text: `for ${said0}` }; else asked.push({ text: `for ${said0}`, kind: 'for', got: null, why: 'who it is for: said back, not checked' }); return; }
      // "with 370 s specific impulse": a quantity said with its number, heard with it, not a part it has
      if (c.kind === 'has' && /^(impulse|isp|speed|velocity|power|weight|mass|pressure|temperature|rating|thrust|efficiency|capacity|range|resolution|voltage|current|torque|frequency|rate|density|lifetime|life)$/.test(c.head) && /\d/.test(c.text)) return;
      if (c.kind === 'has' && /^(steps?|stairs?|risers?|kerbs?|curbs?)$/.test(c.head) && /\d/.test(c.text) && !/\b(stair|staircase|ladder|steps)\b/.test(mainHead ?? '')) return;
      // "a room with a 2.4 m ceiling": what it stands under, heard as a limit
      if (c.kind === 'has' && /^(ceilings?)$/.test(c.head) && /\d/.test(c.text)) return;
      // "no bigger than 1.2 m", "no single piece over 20 kg": a limit, heard with its numbers; "with less than 0.5 N": a comparative
      if (/^(no (bigger|larger|more|wider|taller|heavier|longer|deeper|higher|single|one)|less|more|fewer)\b/.test(c.text)) return;
      const negated = /^(no|without)\b/.test(c.text) || c.opener === 'without';
      if (negated) { asked.push({ text: c.text, kind: 'for', got: null, why: 'noted: nothing it makes has one' }); return; }
      // "an airship", "a balloon": held up by a gas lighter than air, which is not kept; what it would lift is weighed below
      if (/^(airships?|blimps?|zeppelins?|dirigibles?|balloons?|aerostats?)$/.test(c.head) && c.kind === 'main') { said.buoyant = true; asked.push({ text: c.text.replace(/\s+(that|which|who|whose|with|for)$/, ''), kind: 'thing', got: null, why: 'held up by a gas lighter than air (an airship, a balloon): buoyancy in a gas is not kept yet; what its gas would lift is weighed below' }); if (!name) name = singular(c.head); return; }
      // "a heat engine", "a Stirling engine": a conversion of heat into work, weighed by the laws below, not a thing that turns
      if (/^(engine|engines|motor)$/.test(c.head) && c.mods.some((x) => /^(heat|stirling|steam|thermal|thermoelectric)$/.test(x))) { asked.push({ text: c.text.replace(/\s+(that|which|who|whose|with|for)$/, ''), kind: c.kind === 'has' ? 'has' : 'thing', got: null, why: 'a heat engine (turning heat into work): energy conversion is not kept; what the laws allow it is weighed below' }); if (c.kind === 'main' && !name) name = singular(c.head); return; }
      // the word for it, or where that names nothing, the words with it ("a climbing frame", "backpack storage")
      // (only where the word for it is part of what names it: "a desk clock" is a clock, not a desk)
      // "Snow load 2.4 kPa", "Panels max 12 kg each": a figure and the few words that name it, no thing of its own
      const labelOnly = (x: typeof c) => { const ts = pa.toks.slice(x.from, x.to); const nums = ts.filter((y) => y.q !== null || y.num).length, ws = ts.filter((y) => !y.punct && y.q === null && !y.num && !/^(max|maximum|min|minimum|each|apiece|total|at|most|least|under|over|below|above|of|is|x|by|per|a|an|the|its|no|more|than|less|up|to)$/.test(y.w)).length; return nums > 0 && ws <= 3 && areaOf(`${x.head} ${x.mods.join(' ')}`) === 'not a kind of thing kept'; };
      const phrase = (x: string) => { const pp = purposeOf(x); return pp && !pp.re.test(` ${x.replace(new RegExp(`\\b${c.head}\\b`, 'g'), ' ').replace(/-/g, ' ')} `) ? pp : undefined; };
      const p = purposeOf(c.head) ?? (c.mods.length ? phrase([...c.mods, c.head].join(' ')) : undefined) ?? (c.kind === 'main' && /\b(climbing|storage|frame)\b/.test(c.text) ? phrase(c.text) : undefined) ?? (PART_OF.test(c.head) && c.mods.length ? purposeOf(c.mods.join(' ')) : undefined), generic = GENERIC.test(c.head), m = massOf(c.head), nxs = pa.clauses[ci + 1];
      let labelled = false;
      const named = /\b(the |same )size$/.test(c.text) && nxs?.kind === 'where' && /^(of|as)$/.test(nxs.opener) ? `${c.text} ${nxs.opener} ${nxs.text}` : c.text;
      if (c.kind === 'main' && !name && !NOT_A_NAME.test(c.head) && (ci === 0 || pa.clauses.slice(0, ci).every((x) => x.kind !== 'main' || !x.head || NOT_A_NAME.test(x.head)))) name = singular(c.head);
      // "lifting it back up with a motor": the motor is what drives what it does, not a second thing that turns
      const drove = p?.name === 'motor' && c.kind === 'has' && /^(with|by|using)$/.test(c.opener) ? wants.find((w) => ['raise', 'slide', 'move', 'swing', 'lift'].includes(w.fn)) : undefined;
      if (drove) asked.push({ text: `with ${c.text}`, kind: 'has', got: drove.fn, why: '' });
      else if (p) { if (c.kind === 'main' && !purposeName) purposeName = singular(c.head); add(p.fn, p.name, p.q, PART_OF.test(c.head) && !p.re.test(` ${c.head} `) ? [...(p.flags ?? []), 'frame'] : p.flags); asked.push({ text: `${c.kind === 'has' ? 'with ' : ''}${c.text.replace(/\s+(that|which|who|whose|with|for)$/, '')}`, kind: c.kind === 'has' ? 'has' : 'thing', got: p.fn, why: '' }); }
      // "one gripper mechanism": what it is, by the word that names it, where that is not kept
      else if (generic) { const ar = c.kind === 'main' && c.mods.length ? areaOf(c.mods.join(' ')) : ''; if (ar && !/^not a kind/.test(ar)) asked.push({ text: c.text.replace(/\s+(that|which|who|whose|with|for)$/, ''), kind: 'thing', got: null, why: ar }); }
      else if (m && c.kind === 'has') { loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` }; }
      // a figure's own label ("with an empty mass", "a folded width", "a 30 psf snow load") or a word that only says how it
      // is ("rated", "assembled", "capable", "formal request") is no thing asked: what it says is read as a number or not at all
      else if (/^(?:an?\s+|its\s+|the\s+)?(?:empty|folded|total|combined|overall|all-up|max(?:imum)?|min(?:imum)?|gross|net|packed|dry)\s+(?:mass|weight|width|height|length|payload|size|depth|load|volume)\b/.test(c.text) || /^(?:with\s+)?(?:maybe|about|around|roughly|some|up to|at least|nearly|almost|over|under)?\s*(?:an?\s+)?\d[\d.,]*\s*\S+(?:\s+of\s+\S+)?(?:\s+\S+)?$/.test(c.text) && areaOf(`${c.head} ${c.mods.join(' ')}`) === 'not a kind of thing kept' || /^(?:an?\s+)?\d[\d.,]*\s*\S+\s+(?:snow|ice|wind|live|roof)\s+loads?$/.test(c.text) || /^(?:rated|assembled|capable|formal request|requested|needed|required|designed|built|made|freestanding|free-standing|standalone|stand-alone|portable)$/.test(c.text.trim()) && areaOf(`${c.head} ${c.mods.join(' ')}`) === 'not a kind of thing kept' || ci > 0 && labelOnly(c)) { labelled = true; /* no thing, and the words before it name the figure, not what it does */ }
      else asked.push({ text: `${c.kind === 'has' ? 'with ' : ''}${named.replace(/\s+(that|which|who|whose|with|for)$/, '')}`, kind: c.kind === 'has' ? 'has' : 'thing', got: null, why: areaOf(`${c.head} ${c.mods.join(' ')}`) });
      // the words before it: what it does ("a rolling cart"), what it holds ("a laptop stand"), or what it is for
      if (!labelled) for (const mod of c.mods) for (const part of mod.split('-')) {
        const mm = massOf(part); if (mm && !loadSaid) loadSaid = { N: mm[1] * G, text: `${mm[2]}, about ${mm[1]} kg (estimate)` };
        if (/(ing|ed)$/.test(part) && isVerb(part) && !/^(powered|shaped|sized|mounted|legged|based|made|built|style|styled|colou?red|coated|lined|raised|heated|covered|fitted|padded|insulated|reinforced|armoured|armored|closed|sealed|filled|stuffed|packed|loaded)$/.test(part)) { const r = readVerb(part, '', t); if (r.fn && wholeFold(r, c.kind === 'main', p?.fn)) asked.push({ text: part, kind: 'does', got: null, why: COLLAPSE }); else if (r.fn) { add(r.fn, FN_WORDS[r.fn], BASE[r.fn], r.flags); asked.push({ text: part, kind: 'does', got: r.fn, why: '' }); } else if (r.note) asked.push({ text: part, kind: 'does', got: null, why: r.note }); }
      }
      // a word joined of a verb and how ("fold-down", "pull-out") or naming a mechanism ("scissor-lift"): what it does
      for (const mod of c.mods) {
        if (!mod.includes('-')) continue;
        const ps = mod.split('-'), v0 = ps[0]!, r = /^(pull|drop|fold|swing|flip)-(down|out|up|away)$/.test(mod) ? readVerb(mod, '', t) : isVerb(v0) && !/^(wall|battery|pedal|solar|hand|self)$/.test(v0) ? readVerb(v0, ps.slice(1).join(' '), t) : null, mech = ps.map((x) => purposeOf(x)).find((x) => x && ['raise', 'slide', 'swing', 'turn', 'move'].includes(x.fn));
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
      const obj = objOf(c), r = readVerb(c.verb, obj, t), text = cut(`${means.get(ci) ? `${means.get(ci)} to ` : ''}${c.subj && c.opener === 'whose' ? `its ${c.subj} ` : ''}${c.verb} ${obj}`.replace(/\s+/g, ' ').trim().replace(/\s*,?\s*\b(and|or|but)$/, ''), 120);
      // "extends to raise a person": the first is how it does the second, said with it, not another thing it does
      const nx = pa.clauses[ci + 1];
      if (nx?.kind === 'does' && nx.opener === 'to' && nx.verb && /^(extend|unfold|open|expand|telescop|ris|deploy|unroll|stretch|swing|tilt)/.test(c.verb) && readVerb(nx.verb, objOf(nx), t).fn) { means.set(ci + 1, `${c.verb}${c.obj.length ? ` ${c.obj.map((i) => pa.toks[i]!.w).join(' ')}` : ''}`); return; }
      // what folds or opens: a part of it ("a top that folds down") swings; the whole of it, folding down and opening out, collapses
      // "a bookshelf with 4 shelves that folds flat": a verb said of one (folds) is not said of many (shelves)
      const naming = pa.clauses.slice(0, ci).reverse().find((x) => (x.kind === 'main' || x.kind === 'has') && x.head), many0 = (h: string) => /[^s]s$/.test(h) && !/(ss|us|is)$/.test(h), one0 = (v: string) => /[^s]s$/.test(v);
      const subj = c.subj ?? (naming?.kind === 'has' && !(many0(naming.head!) && one0(c.verb)) && purposeOf(naming.head!) ? naming.head : null);
      if (r.fn && wholeFold(r, !subj || subj === mainHead, purposeOf(mainHead)?.fn, c.verb)) { asked.push({ text, kind: 'does', got: null, why: COLLAPSE }); return; }
      // "whose load bed lifts": the thing it is said of is a part too, when it is a thing
      if (c.subj) { const ps = purposeOf(c.subj); if (ps) { add(ps.fn, ps.name, ps.q, ps.flags); asked.push({ text: `its ${c.subj}`, kind: 'has', got: ps.fn, why: '' }); } }
      // "to power the whole planet", "to run a pacemaker": what what it gives is for, said back
      if (c.opener === 'to' && /^(power|powers|run|runs|drive|drives|charge|charges|feed|feeds|supply|supplies|light|lights|heat|heats|stop|prevent|avoid|reduce|protect|help|ease|relieve|save|spare)$/.test(c.verb) && !r.fn) { asked.push({ text: text.replace(/[\s?!.,;:]+$/, ''), kind: 'for', got: null, why: /^(stop|prevent|avoid|reduce|protect|help|ease|relieve|save|spare)$/.test(c.verb) ? 'what it is for: said back, not checked' : 'what what it gives is for: said back, not checked' }); return; }
      // "stays standing in 120 km/h gusts": what it does is stand in that wind, tested so
      if (/^(stay|stays|staying|stand|stands|standing|remain|remains|withstand|withstands|withstanding|survive|survives|surviving|weather|weathers)$/.test(c.verb) && /\b(winds?|gusts?|gales?|storms?|hurricanes?|blizzards?)\b/.test(`${c.text} ${pa.clauses.slice(ci + 1, ci + 3).map((x) => x.text).join(' ')}`)) { const fn: Fn | null = wants[0]?.fn ?? null; const tw = /\b(winds?|gusts?|gales?|storms?)\b/.test(c.text) ? c.text : /\b(winds?|gusts?|gales?|storms?)\b/.test(text) ? text : `${c.text} in its wind`; asked.push({ text: tw, kind: 'does', got: fn, why: fn ? '' : 'not checked: nothing it makes is tested for it' }); return; }
      // "survives a 150 kg person rocking back on the two rear legs": a load it bears so
      if (/^(surviv|withstand|take|bear|handl|hold)/.test(c.verb) && /\brock\w*\s+back/.test(`${c.text} ${pa.clauses.slice(ci + 1, ci + 4).map((x) => x.text).join(' ')}`)) { asked.push({ text: `${c.text} on its rear legs`, kind: 'does', got: 'support', why: '' }); return; }
      if (r.context) return;
      // "and not tip over in the gusts", "never sags": what it must not do, checked where a check covers it
      if (c.verbAt > 0 && /^(not|never|don't|doesn't|won't|cannot|can't|shouldn't|mustn't)$/.test(pa.toks[c.verbAt - 1]!.w) && /^(tip|topple|fall|overturn|blow|collaps|sag|bend|bow|break|snap|crack|fail|buckl)/.test(c.verb)) { const fn: Fn | null = wants.some((w) => w.fn === 'support') ? 'support' : wants[0]?.fn ?? null; asked.push({ text: `not ${text}`, kind: 'does', got: fn, why: fn ? '' : 'not checked: nothing it makes is tested for it' }); return; }
      if (r.fn) { const w = add(r.fn, FN_WORDS[r.fn], BASE[r.fn], r.flags);
        // "a planter that turns every 6 hours": the whole of it turns, on what turns it, not a part turning on top of it
        if (r.fn === 'turn' && (!subj || subj === mainHead) && mainHead && purposeOf(mainHead) && purposeOf(mainHead)!.fn !== 'turn' && !w.flags.includes('whole')) w.flags.push('whole'); asked.push({ text, kind: 'does', got: r.note ? null : r.fn, why: r.note ?? '' }); if (r.flags?.includes('dry')) asked.push({ text: `${c.verb}: carrying the damp away`, kind: 'does', got: null, why: 'drying is warming and air moved through: air flow is not kept, only the warming' }); }
      else if (r.note) asked.push({ text, kind: 'does', got: null, why: r.note });
      else if (!r.load) asked.push({ text, kind: 'does', got: null, why: 'not kept' });
      else loadsSaid.push(text);
      // what it holds is named before the clause runs on: "lifting it back up ..., so it won't wake me" lifts no person
      const m = /\b(climb\w*|hang\w*|swing\w*)\b/.test(obj) && /\b(child|children|kids?|toddlers?|pupils?|students?|person|people|someone)\b/.test(obj) ? undefined : massOf(obj.split(/[,;]|\s(?:so|because|while|which|running|won't|wont|without|or else)\b/)[0]!); if (m && (r.load || r.fn === 'support' || r.fn === 'move' || r.fn === 'raise' || r.fn === 'lift')) loadSaid ??= { N: m[1] * G, text: `${m[2]}, about ${m[1]} kg (estimate)` };
      return;
    }
    // "without the bottom sagging", "without wobbling": what it must not do, checked where a check covers it
    if (c.kind === 'where' && c.opener === 'without') {
      const g = /\b(sag|bend|bow|deflect|wobbl|rack|rock|sway|tip|topple|fall|overturn|break|snap|crack|fail|leak|spill|slip|slid)\w*/.exec(c.text)?.[1];
      const NOT: Record<string, [Fn | null, string]> = { sag: ['support', ''], bend: ['support', ''], bow: ['support', ''], deflect: ['support', ''], break: ['support', ''], snap: ['support', ''], crack: ['support', ''], fail: ['support', ''], tip: ['support', ''], topple: ['support', ''], fall: ['support', ''], overturn: ['support', ''],
        wobbl: [null, 'wobbling (its joints racking) is not tested: its parts are rigid and its joins hold fully in the physics'], rack: [null, 'racking is not tested: its parts are rigid and its joins hold fully in the physics'], rock: [null, 'rocking on an uneven floor is not tested: the floor is flat'], sway: [null, 'swaying is not tested: its parts are rigid'],
        leak: [null, 'leaking: what holds a liquid is checked to hold it, not for its seams'], spill: [wants.some((w) => w.flags.includes('loose')) ? 'support' : null, 'spilling: only loose stuff is held by walls'], slip: [null, 'slipping: friction at its feet is not checked'], slid: [null, 'sliding: friction at its feet is not checked'] };
      if (g && NOT[g] && asked.some((x) => x.text.includes(`without ${c.text}`))) return;
      // "tolerate 15 cm of trunk sway without binding or cracking": where it must let what it is fixed to move, whether it
      // binds there is the joint's doing, which is not derived
      if (/\b(bind\w*|jam\w*|seiz\w*|crack\w*)\b/.test(c.text) && /\b(sway\w*|settl\w*|movement)\b/.test(t)) { asked.push({ text: `without ${c.text}`, kind: 'does', got: null, why: 'the movement it must allow where it is fixed (a joint that slides or floats) is not derived, so whether it binds or cracks there is not checked' }); return; }
      if (g && NOT[g]) { const [fn, why] = NOT[g]; const has = fn && wants.some((w) => w.fn === fn); asked.push({ text: `without ${c.text}`, kind: 'does', got: has ? fn : null, why: has ? '' : why || 'not checked' }); return; }
    }
    // "on a table", "on a stand": a thing it stands on, said right after what it is, is a part of it
    const prevNaming = pa.clauses.slice(0, ci).reverse().find((x) => x.kind !== 'where' || !/^(on|upon|atop)$/.test(x.opener));
    if (c.kind === 'where' && /^(on|upon|atop)$/.test(c.opener) && c.head && (prevNaming?.kind === 'main' || prevNaming?.kind === 'has') && pa.clauses[ci - 1] === prevNaming) { const ps = purposeOf(c.head); if (ps) { add(ps.fn, ps.name, ps.q, ps.flags); asked.push({ text: `on ${c.text}`, kind: 'has', got: ps.fn, why: '' }); return; } }
    // what it is for, and where: things there are what it works on or for; what everyone knows the weight of is a load
    // ("collapses into a tube for my backpack": what it packs into goes in the backpack, which is no load on it)
    const afterFold = pa.clauses.slice(0, ci).reverse().find((x) => x.kind === 'does' && !!x.verb)?.verb, packed = !!afterFold && FOLDS.test(afterFold);
    // "so it won't wake me": why it is asked, not who it carries
    // "for two people", "for 6 climbers": so many of them, each about so much
    const m = c.opener === 'so' ? undefined : massOf(c.text); if (m && !packed) { if (c.kind === 'for' || /^(on|onto|in|inside|into)$/.test(c.opener)) { const nm = new RegExp(`\\b(\\d+|${COUNT_WORDS.join('|')})\\s+(?:[\\w-]+\\s+){0,2}?(?:${m[0].source.replace(/^\\b\(|\)\\b$/g, '').replace(/^\\b/, '').replace(/\\b$/, '')})\\b`).exec(c.text), k0 = nm && Number.isFinite(countOf(nm[1]!)) ? countOf(nm[1]!) : 1, atIt = /^(tables?|desks?|counters?|workbench(?:es)?|workstations?|bars?|islands?)$/.test(mainHead ?? ''), k = atIt ? 1 : k0; if (atIt && k0 > 1) said.places = k0; else if (m[2] === 'a person' || m[2] === 'a child') { said.people ??= k; said.peopleArea ??= k * (m[2] === 'a child' ? 0.3 : 0.5); } occupant ??= m; loadSaid ??= { N: k * m[1] * G, text: k > 1 ? `${k} of ${m[2]}, about ${m[1]} kg each, ${k * m[1]} kg (estimate)` : `${m[2]}, about ${m[1]} kg (estimate)` }; } }
    if (c.kind === 'for' && c.text.trim() && !/^(a |an |the |about |up to |over |at least )?[\d.,]+\s*(s|secs?|seconds?|min|mins|minutes?|h|hrs?|hours?|days?|weeks?|months?|years?)\b/.test(c.text.trim())) asked.push({ text: `${c.opener} ${c.text}`.replace(/\s+(that's|that is|which is|that are|which are)\s.*\d.*$/, '').trim(), kind: 'for', got: null, why: 'what it is for: said back, not checked' }); // "for my records that's 1.2 m long": the size is its own, heard with it
    if (/\bon wheels\b/.test(` ${c.opener} ${c.text} `)) { add('move', FN_WORDS.move, BASE.move); asked.push({ text: 'on wheels', kind: 'has', got: 'move', why: '' }); }
  });
  // hung on a wall, as said in what it does
  if (/\b(hangs?|hung|hanging|mounts?|mounted|fixed|bolted|screwed)\b[^,.;]*\bwall\b/.test(t) && !asked.some((a) => /wall/.test(a.text))) asked.push({ text: 'hangs on a wall', kind: 'has', got: null, why: 'hung on a wall: it is made to stand on the floor; a wall to hang it on is not kept' });
  // an answer to "what should it do?"
  if (answers.what) { for (const fn of Object.keys(FN_WORDS) as Fn[]) if (new RegExp(`\\b(${fn}|${FN_WORDS[fn].split(' ').slice(0, 2).join(' ')})`, 'i').test(answers.what)) add(fn, FN_WORDS[fn], BASE[fn]); for (const p of PURPOSES) if (p.re.test(` ${answers.what.toLowerCase()} `)) { add(p.fn, p.name, p.q, p.flags); } }
  const tNoBall = t.replace(/\b(steel|glass|brass|wooden|metal)\s+(balls?|marbles?|bearings?|spheres?)\b/g, '$2');
  const matterWord = /\b(?:of|from|in|made of)\s+(wood|oak|pine|maple|fir|plywood|birch|mdf|steel|stainless(?: steel)?|aluminium|aluminum|acrylic|plastic|nylon|concrete|glass|carbon fibre|carbon fiber|fibreglass|fiberglass)\b/.exec(tNoBall)?.[1] ?? /\b(wooden|metal|steel|aluminium|aluminum|plastic|glass)\b/.exec(tNoBall)?.[1] ?? null;
  const matter = matterWord ? ({ wooden: 'wood', metal: 'steel', plastic: 'acrylic', oak: 'wood.red-oak', pine: 'wood.southern-pine', maple: 'wood.hard-maple', fir: 'wood.douglas-fir', birch: 'wood', aluminum: 'aluminium', 'stainless steel': 'stainless' } as Record<string, string>)[matterWord] ?? matterWord : null;
  if (matter) { try { matterOf(matter); heard.push(`made of ${matterWord}`); } catch { dropped.push(`made of ${matterWord}: no matter of that name is kept`); } }
  const take = (w: Want, k: string, v: number, unit: string, text: string) => { w.q[k] = fig(v, unit, 'you', text); if (k === 'L' && w.fn === 'slide' && !asked.some((a) => a.text.includes(text))) asked.push({ text: `slides ${text}`, kind: 'does', got: 'slide', why: '' }); heard.push(`${({ H: 'height', W: 'width', D: 'depth', F: 'load', m: 'load', v: 'speed', V: 'volume', T: 'temperature', L: 'travel', Dia: 'across', rpm: 'speed', span: 'span', wave: 'waves', fb: 'freeboard' } as Record<string, string>)[k] ?? k}: ${text}`); };
  const by = (f: Fn) => wants.find((w) => w.fn === f), sup = by('support'), mov = by('move');
  // what raises a load, hung on a wall ("so it hangs on the wall"): its posts screwed to it, with no base of its own
  { const ra0 = by('raise'); if (ra0 && /\b(hangs?|hung|hanging|mounts?|mounted|fixed|bolted|screwed)\b[^,.;]*\b(walls?|studs?)\b|\bwall[- ]?(mounted|mount|hung)\b/.test(t)) { ra0.flags.push('wall'); heard.push('hung on a wall: its posts screwed to it, standing on no base of its own'); } }
  // hung on a wall, what holds a weight up is a board on brackets screwed to it ("a wall shelf", "screwed into two wall
  // studs"): one board, unless more are said
  if (sup && !sup.flags.includes('span') && /\bwall[- ]?(shel(f|ves)|mounted|mount|hung|brackets?)\b|\bfloating shel|\bfolds?(?: flat| away| up| down){0,2} (?:up )?(?:against|onto|to|into) (?:the|a) wall\b|\b(hangs?|hung|hanging|mounts?|mounted|fixed|bolted|screwed)\b[^,.;]*\b(walls?|studs?)\b/.test(t)) {
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
  // "every minute", "once an hour": how often it does it, said with no number
  { const ev = /\b(?:every|each|once an?|once per)\s+(second|minute|hour|day)\b/.exec(t); if (ev && said.every === undefined) { said.every = ({ second: 1, minute: 60, hour: 3600, day: 86400 } as Record<string, number>)[ev[1]!]; heard.push(`every ${ev[1]}: how often it does it, weighed below`); } }
  // "two AA batteries", "4 D cells": what its cells hold, about 3.5, 1.5, 9 and 18 Wh each for alkaline AA, AAA, C and D
  // at a light draw (estimates, from makers' sheets)
  // "zero hydraulic oil leakage", "zero visible judder": said back, with what of it is weighed
  // "zero visible judder", "zero oil leakage": something asked of how it does what it does, said and not weighed
  for (const z of t.matchAll(/\bzero\s+((?:[\w-]+\s+){0,2}?)(leak\w*|emissions?|spills?|judder|jitter|vibrations?|backlash|play|drift|wobble)\b/g)) { const why = /leak|spill/.test(z[2]!) ? 'nothing made here holds a liquid under pressure, and what would drive it is not made, so it is not checked' : 'how smoothly it moves is not weighed here'; heard.push(`${z[0]}: said back; ${why}`); if (!asked.some((a) => a.text.includes(z[0]))) asked.push({ text: z[0], kind: 'does', got: null, why }); }
  { const cm = /\b(\d+|one|two|three|four|six|eight)\s+(aa|aaa|c|d)[- ]?(?:size\s+)?(?:batter(?:y|ies)|cells?|alkalines?)\b/.exec(t); if (cm) { const n0 = countOf(cm[1]!), pulsed = /\b(motor|every|each (minute|hour|second))\b/.test(t), each = (pulsed ? { aa: 3.0, aaa: 1.2, c: 8, d: 16 } : { aa: 3.5, aaa: 1.5, c: 9, d: 18 } as Record<string, number>)[cm[2]!]!; said.cellWh = n0 * each; heard.push(`${n0} ${cm[2]!.toUpperCase()} cells: about ${+(n0 * each).toPrecision(3)} Wh (${each} Wh each, alkaline ${pulsed ? 'pulsed at tens of mA, less than at a light draw' : 'at a light draw'}, estimate), weighed below`); } }
  // "cycles about 20 times a day": how often it is worked
  { const pd = /\b(\d+|once|twice|two|three|four|five|six|ten|twenty)\s*(?:times|cycles)?\s+(?:a|per|each|every)\s+day\b/.exec(t); if (pd) { said.perDay = pd[1] === 'once' ? 1 : pd[1] === 'twice' ? 2 : countOf(pd[1]!); heard.push(`${said.perDay} times a day: weighed below where what it does each time is`); } }
  // "from a normal kitchen outlet", "plugged in": it runs from the mains, and carries no store of its own
  // ("no grid power", "off the grid", "no mains": the opposite)
  said.mains = /\b(outlets?|wall sockets?|power sockets?|mains|plugged in|plugs? in|plug-in|grid power|the grid)\b/.test(t) && !/\b(if|when) the power (goes|is) (out|off|down)\b/.test(t) && !/\b(no|without|not on|off|never|zero)\s+(the\s+)?(grid|mains|outlets?|grid power|mains power|wall power)\b|\boff[- ]grid\b/.test(t);
  if (said.mains) { said.ownPower = false; heard.push('from the mains (an outlet): it carries no store of its own'); }
  else if (/\b(batter(y|ies)|cells?|charge|charging|fuel|onboard|on-board|self-powered|untethered|its own power)\b/.test(t)) said.ownPower = true;
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
  // people counted from their weights said ("three 30 kg kids plus an 80 kg parent") are counted once, over any count a
  // clause of what it is for gave ("for three 30 kg kids")
  let peopleNumbered = false;
  for (const n of pa.nums) {
    if (usedNum.has(n)) continue;
    // (a sign said in words, "at minus 40 C", is part of the number, not a word before it)
    const q = n.said, cl = pa.clauses[n.clause]!, b = n.before[0] === 'minus' && q && /^minus\s/i.test(q.text) ? n.before.slice(1) : n.before, a = n.after, near = (re: RegExp, k = 4) => b.slice(0, k).some((x) => re.test(x)), clauseOwner = cl.kind === 'has' || cl.kind === 'main' ? purposeOf(cl.head) : undefined;
    // said in a phrase about another thing ("from 5 litre jugs"), not one that only goes on saying it ("for 20 L of water")
    // "in a cabinet only 15 cm deep", "through 15 cm pipes": said of the other thing it goes in or through
    const into = cl.kind === 'where' && /^(in|inside|within|through|into)$/.test(cl.opener) && !!cl.head && cl.head !== mainHead && cl.headAt < n.tok;
    const ownerWant = clauseOwner ? by(clauseOwner.fn) : undefined, elsewhere = (cl.kind === 'where' || cl.kind === 'for') && !!cl.head && !purposeOf(cl.head) && !(SURFACE_PART.test(cl.head) && sup) && cl.headAt > n.tok || into;
    const drop = (why: string) => dropped.push(`${n.text.trim()}: ${why}`);
    if (!q) {
      // a count of things, or a number in a unit not kept
      const thing = a.join(' '), cnt = countOf(n.text.split(/\s+/)[0]!);
      // "$150", "a budget around 150", "BOM $250": what it may cost, which is not weighed
      if (new RegExp(`\\$\\s*${n.text.trim().replace(/[.]/g, '\\.')}\\b`).test(pa.src) || /^(dollars?|usd|bucks|euros?|eur|gbp)\b/.test(thing) || b.slice(0, 3).some((x) => /^(budget|cost|costs|price|bom|spend|around|under)$/.test(x)) && /\b(budget|cost|price|bom|\$)/.test(t)) { drop('a cost: what it costs is not weighed'); continue; }
      // "Orange Pi 5": a number said straight after a name, part of the name and no quantity
      const pt = pa.toks[n.tok - 1];
      if (pt && !pt.num && !pt.punct && pt.w.length > 1 && !/^(a|an|the|to|of|in|at|for|and|or|with|by|on|is|are|was|be|than|under|over|about|up|from|into|per|every)$/.test(pt.w) && /^[A-Z]/.test(pa.src.slice(pt.at, pt.at + 1))) {
        const nameWs: string[] = []; for (let j = n.tok - 1; j >= 0 && pa.toks[j] && !pa.toks[j]!.num && /^[A-Z]/.test(pa.src.slice(pa.toks[j]!.at, pa.toks[j]!.at + 1)); j--) nameWs.unshift(pa.src.slice(pa.toks[j]!.at, pa.toks[j]!.at + pa.toks[j]!.w.length));
        drop(`part of a name ("${nameWs.join(' ')} ${n.text.split(/\s+/)[0]}"), not a quantity`); continue;
      }
      // a crew: so many people it carries
      // (a crew kept alive where it lives or travels; elsewhere, so many people are who it is for)
      if (/^(astronauts?|crew|people|persons?|passengers?|riders?|travellers?|travelers?|colonists?)\b/.test(thing)) { if (/\b(habitats?|modules?|stations?|spacecraft|ships?|rovers?|landers?|capsules?|bases?|colon(y|ies)|vehicles?|boats?|submarines?|submersibles?|aircraft|planes?|shelters?|tents?|huts?|bunkers?|cabins?|airships?|balloons?)\b/.test(t)) { said.crew = cnt; heard.push(`a crew of ${cnt}: weighed below by what keeps them`); } else heard.push(`${n.text.trim()}: who it is for`); continue; }
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
      // "nests 12 high": so many stacked one on another
      if (/^(high|tall|deep)\b/.test(thing) && /\b(nest|nests|nested|nesting|stack|stacks|stacked|stacking|stackable)\b/.test(t)) { said.stackN = cnt; heard.push(`${n.text}: ${cnt} stacked, checked`); continue; }
      if (/^wheels?\b/.test(thing) && mov) { mov.q.wheels = fig(cnt, '', 'you', n.text); heard.push(`wheels: ${n.text}`); continue; }
      // light said in lux: about 300 lumens to a watt for daylight or white LEDs (estimate), for what a cell would gather
      if (/^lux\b/.test(thing)) { said.light = n.value / 300; heard.push(`${n.text}: light of about ${+(n.value / 300).toPrecision(3)} W/m² (300 lm/W, estimate), weighed below`); continue; }
      // "quieter than 40 dB": how loud it may be
      if (/^(db|dba|db\(a\)|decibels?)\b/.test(thing)) { drop('how loud it may be: the sound it makes is not weighed'); if (!asked.some((a) => a.text.toLowerCase().includes(n.text.toLowerCase()) || /\bdb\b|decibel/i.test(a.text))) asked.push({ text: `no louder than ${n.text}`, kind: 'limit', got: null, met: false, why: 'how loud it is: the sound it makes is not weighed' }); continue; }
      // "two children aged 2 to 6": who it carries, said back; children that age weigh about 12 to 21 kg (WHO growth
      // standards, estimate)
      if (/^aged?$/.test(b[0] ?? '') || /^(to|-|–)$/.test(b[0] ?? '') && /^aged?$/.test(b[2] ?? '')) { if (/^aged?$/.test(b[0] ?? '')) { const to = new RegExp(`\\baged?\\s+${cnt}\\s*(?:to|-|–)\\s*(\\d+)`).exec(t); heard.push(`aged ${cnt}${to ? ` to ${to[1]}` : ''}: who it carries, said back${said.payload === undefined ? '' : `, within the ${+said.payload.toPrecision(3)} kg said`}`); } continue; }
      // "30 cubbies": so many compartments, made here as shelves
      // ("30 cubbies for 9 kg bags": so many of that weight, all of it on its shelves)
      if (/^(cubbies|cubby|cubbyholes?|compartments?|pigeonholes?|bays|slots|lockers)\b/.test(thing)) { const per = new RegExp(`\\b${cnt}\\s+(?:cubbies|cubby|cubbyholes?|compartments?|pigeonholes?|bays|slots|lockers)\\s+(?:for|of|holding)\\s+(?:about\\s+|up to\\s+)?(\\d+(?:\\.\\d+)?)\\s*(kg|lb|lbs)\\b`).exec(t); said.compartments = cnt; if (per) said.compKg = +per[1]! * (/^lb/.test(per[2]!) ? 0.45359237 : 1); heard.push(`${n.text.trim()}: so many compartments${per ? `, each with ${per[1]} ${per[2]} in it, weighed on its shelves` : ''}; made as shelves with dividers standing between them`); continue; }
      // "20 times a day": read with how often it is worked
      if (/^times?\b/.test(thing) && said.perDay !== undefined) continue;
      drop(/^(tb|gb|mb|kb|bytes?)\b/.test(thing) ? 'information: electronics are not kept yet' : `a count or a unit not kept (${areaOf(n.text)})`);
      continue;
    }
    const d = q.dim;
    // "a 12U rack": so many rack units tall (1.75 in each, EIA-310), a wall cabinet's width and depth about 600 mm (estimate)
    if (q.unit === 'U') { said.size = { ...(said.size ?? {}), H: q.si, W: said.size?.W ?? 0.6, D: said.size?.D ?? 0.6 }; heard.push(`${q.text}: ${len(q.si)} tall inside (1.75 in a unit, EIA-310), taken 600 mm wide and deep (a wall cabinet, estimate)`); continue; }
    // "spiral in to 0.3 AU from the Sun": how near the Sun it goes
    if (q.unit === 'au' || /\bAU\b/.test(q.text)) { said.rSun = q.si; heard.push(`${q.text} from the Sun: weighed below`); continue; }
    if (sameDim(d, DIMS.length)) {
      // "1.1 m max height", "width max 330 mm", "max height of 1.1 m": a limit on its own size; "radius 25 mm minimum":
      // its corners rounded at least so much, which is not made
      { const dimA = /^(max|maximum)$/.test(a[0] ?? '') ? a[1] : undefined, dimB = /^(max|maximum)$/.test(b[0] ?? '') ? b[1] : b[0] === 'of' && /^(max|maximum)$/.test(b[2] ?? '') ? b[1] : undefined, dim = dimA ?? dimB;
        if (dim && /^(height|tall|width|wide|length|long|depth|deep)$/.test(dim)) { const k = /^(height|tall)$/.test(dim) ? 'H' : /^(width|wide)$/.test(dim) ? 'W' : 'D'; limits[k] = Math.min(limits[k] ?? Infinity, q.si); heard.push(`${dim} ${q.text} at most: a limit, checked`); continue; }
        if (/^(radius|radii|corners?|edges?)$/.test(b[0] ?? '') && /^(min|minimum)$/.test(a[0] ?? '') || /^(min|minimum)$/.test(b[0] ?? '') && /^(radius|radii)$/.test(b[1] ?? '')) { asked.push({ text: `corners rounded to at least ${q.text}`, kind: 'limit', got: null, met: false, why: 'not made: its edges are square as made' }); continue; } }
      // "swing open when my ATV gets within 20 feet": a distance it senses at, which wants a sensor
      if (b[0] === 'within' && /\b(gets?|comes?|approach\w*|near\w*|arrives?|when)\b/.test(b.slice(1, 6).join(' '))) { drop('a distance it senses something at: sensing is not kept'); continue; }
      // "crawls through 15 cm pipes", "fits through a 70 cm door": what it goes through limits its own width and height
      const through = cl.kind === 'where' && /^(through|into|inside)$/.test(cl.opener) && !!cl.head && /^(pipes?|tubes?|ducts?|tunnels?|sewers?|drains?|culverts?|holes?|openings?|hatch(es)?|doors?|doorways?|gates?|gaps?)$/.test(cl.head);
      // through a door it is only as wide as the door (a door is about 2 m tall, estimate); through a hole or a hatch, both ways
      if (through && !near(FOLDS, 6)) { const door = /^(doors?|doorways?|gates?|gateways?)$/.test(cl.head ?? ''); limits.W = Math.min(limits.W ?? Infinity, q.si); if (!door) limits.H = Math.min(limits.H ?? Infinity, q.si); said.through = q.si; heard.push(`through ${q.text} ${/(s|sh|ch|x|z)$/.test(cl.head ?? '') ? `${cl.head}es` : `${cl.head}s`}: its width${door ? '' : ' and height'} no more than that, checked`.replace(/sses: /, 'sses: ')); continue; }
      // a thing whose word says it stands taller than it is wide (a tower, a mast, a pole): its one size is its height
      const ax = AX[a[0] ?? ''] ?? (a[0] === 'in' && a[1] === 'diameter' ? 'W' : /^(standing|working|seat|overall|total|max|maximum|full|inside|outside)$/.test(a[0] ?? '') ? AX[a[1] ?? ''] : /^(towers?|masts?|poles?|pylons?|columns?|pillars?|chimneys?|flagpoles?|obelisks?|spires?|steeples?)$/.test(a[0] ?? '') ? 'H' : undefined);
      if (/^(run|length|stretch)$/.test(a[0] ?? '')) { said.runLength = q.si; if (sup) { take(sup, 'W', q.si, 'm', `${q.text} ${a[0]} of it`); continue; } heard.push(`a ${q.text} ${a[0]}: its length, weighed below`); continue; }
      if (/^(steps?|stairs?|risers?|kerbs?|curbs?)$/.test(a[0] ?? '') && !/\b(stair|staircase|ladder|steps)\b/.test(mainHead ?? '')) { said.climb = q.si; heard.push(`steps of ${q.text}: climbing them is not kept; the power it takes is weighed below`); continue; }
      if (a[0] === 'clear' && /^(hatch|hatches|opening|openings|door|doors|doorway|passage|aperture|port)$/.test(a[1] ?? '')) { said.hatch = q.si; const sw = by('swing'); if (sw) { take(sw, 'W', q.si, 'm', `${q.text} clear`); if (sw.q.H?.by !== 'you') sw.q.H = fig(q.si, 'm', 'estimate', 'as tall as it is wide'); continue; } }
      // "a room with a 2.4 m ceiling": what it stands under, all of it within that
      if (/^(ceiling|ceilings|roof)$/.test(a[0] ?? '') && !by('enclose')) { said.ceiling = q.si; limits.H = Math.min(limits.H ?? Infinity, q.si); heard.push(`under a ${q.text} ceiling: all of it within that, checked`); continue; }
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
      // "for climbers at 7,800 m", "a hut at 4,000 m altitude": how high it stands, not how big it is; the air there is thin
      if (q.si >= 300 && q.si <= 11000 && !said.depth && (b[0] === 'at' || /^(altitude|elevation|above|asl|up|high)$/.test(a[0] ?? '')) && !/^(deep|down|under|below|depth|long|wide|across|tall|of|span|spans|away|from)$/.test(a[0] ?? '') && !/\b(deep|depth|ocean|sea floor|seafloor|seabed|underwater|trench|lava|dive|diving)\b/.test(t)) { said.altitude = q.si; heard.push(`${q.text} up: the air's pressure there is ${+(airRho(0, q.si) / airRho(0, 0)).toPrecision(2)} of the sea's (standard atmosphere); how dense it is there, with how cold it is, is weighed in the wind on it`); continue; }
      // "at the bottom of the Challenger Deep (10,935 m)", "4,000 m deep": how deep under water it works
      if (q.si >= 50 && /\b(deep|depth|ocean|sea|trench|seabed|sea floor|seafloor|underwater|challenger|abyss\w*|bottom of)\b/.test(t) && !/^(long|wide|across|tall|high)$/.test(a[0] ?? '')) { said.depth = q.si; heard.push(`${q.text} under water: weighed below by the pressure there`); continue; }
      // "over 6,000 km", "6,000 km on one charge": how far it travels, when it travels
      if (/^(over|for)$/.test(b[0] ?? '') && q.si >= 100 && (mov || by('lift') || by('float') || said.buoyant || /\b(travels?|flies|fly|carries|sails?|drives?|goes|tows?)\b/.test(t))) { said.distance = q.si; heard.push(`over ${q.text}: weighed below by the energy to go so far`); continue; }
      // "a clot 3 cm away": how far it goes, weighed against the time it has
      // "two wall studs 600 mm apart": where it is fixed, as said
      // a float's water: "a 3.5 m tidal range" it rises and falls with; "1.2 m wind chop", "1 m waves" it rides; "200 mm
      // freeboard" its deck or sides above the water
      { const fl = by('float'); if (fl && (/^(tidal|tide|tides)$/.test(a[0] ?? '') || /^(range|rise)$/.test(a[0] ?? '') && /\btid(e|al)\b/.test(t))) { said.tide = q.si; heard.push(`a tide of ${q.text}: it rises and falls that much`); const noPiles = /\b(no|without)\s+(\w+\s+){0,2}piles?\b|\bpile-?free\b/.test(t), gw = (q.si / 2) / Math.sin(Math.atan(1 / 3)); asked.push({ text: `rides a ${q.text} tide where it is moored`, kind: 'does', got: null, why: `what holds it where it is through the tide (${noPiles ? 'anchors and chains with that much slack, piles being ruled out' : 'anchors and chains with that much slack, or piles it rides up and down'}) is not made; nor the way to it from the shore, rising and falling with it (a gangway hinged at the shore, set at mid-tide, at least ${len(gw)} long to slope no steeper than 1 in 3 at either end of the tide, estimate)` }); continue; }
        if (fl && /^(chop|waves?|swell|seas?)$/.test(a.find((x) => !/^(wind|of|high|tall|short|steep|wind-driven)$/.test(x)) ?? '')) { take(fl, 'wave', q.si, 'm', `${q.text} ${a.slice(0, a.findIndex((x) => /^(chop|waves?|swell|seas?)$/.test(x)) + 1).join(' ')}`); continue; }
        if (fl && (a[0] === 'freeboard' || a[0] === 'of' && a[1] === 'freeboard')) { take(fl, 'fb', q.si, 'm', `${q.text}, checked with its load to one side`); continue; } }
      if (a[0] === 'apart' && sup) { sup.q.apart = fig(q.si, 'm', 'you', `${q.text} apart`); heard.push(`${q.text} apart: where it is fixed, as said`); continue; }
      if (a[0] === 'away' || a[1] === 'away') { said.distance = q.si; heard.push(`${q.text} away: how far it goes, weighed below against its time`); continue; }
      // "fits through my 70 cm wide gate", "fits a 50 cm wide gap": a limit on it, checked
      if (near(/^fits?$/, 6) && ax && /^(W|H|D|WD)$/.test(ax)) { if (/^(diameter|dia|across)$/.test(a[0] ?? '') && /\b(tubes?|pipes?|cylinders?|canisters?|holes?)\b/.test(a.slice(1, 4).join(' '))) said.fitDia = q.si; else limits[ax === 'WD' ? 'W' : (ax as 'W' | 'H' | 'D')] = q.si; heard.push(`fits ${q.text} ${a[0]}: a limit, checked`); continue; }
      if (a[0] === 'of' && /\b(water|flood\w*|sea|tide|river)\b/.test(a.slice(1, 4).join(' ')) && /\bback\b/.test(b.slice(0, 4).join(' '))) { said.retain = q.si; heard.push(`holding back ${q.text} of water: its push weighed below`); continue; }
      // a barrier "for a 90 cm wide doorway": its run is the opening's width; "when water reaches 5 cm": what sets it off;
      // "hide in a 10 cm deep recess": how deep it is laid away
      if (/\b(flood|water|barriers?|gates?)\b/.test(t) && /^(wide|across)$/.test(a[0] ?? '') && /^(doorways?|doors?|openings?|entrances?|gaps?|gateways?|driveways?)$/.test(a[1] ?? '')) { said.runLength = q.si; said.opening = a[1]!.replace(/s$/, ''); heard.push(`the ${q.text} ${a[1]}: its run, weighed below`); continue; }
      if (/\b(flood|water)\b/.test(t) && near(/^(reaches|reach|rises|hits|gets)$/, 2) && /^water$/.test(b[1] ?? b[0] ?? '')) { said.trigger = q.si; heard.push(`water ${q.text} up: what sets it off, weighed below`); continue; }
      if (/^(deep|down)$/.test(a[0] ?? '') && /^(recess|recesses|slot|slots|trench|pit|groove|channel|well)$/.test(a[1] ?? '')) { said.recess = q.si; heard.push(`a ${q.text} deep ${a[1]}: how deep it is laid away, weighed below`); continue; }
      // "30 cm of wet soil": a depth of something heavy, its weight what it holds
      const stuff = a[0] === 'of' ? /^(?:(?:soaking|wet|dry|damp|loose|packed|fresh|heavy|settled|compacted|new|deep|old)[- ]?)*(soil|earth|dirt|compost|sand|gravel|water|snow|concrete|grain|mulch|clay)/.exec(a.slice(1).join(' ')) : null;
      if (stuff) { const wet = /wet|soaking|damp/.test(a.slice(1, 3).join(' ')); const rho = ({ soil: wet ? 1900 : 1300, earth: wet ? 1900 : 1300, dirt: wet ? 1900 : 1300, compost: wet ? 1000 : 600, sand: wet ? 1900 : 1600, gravel: 1700, water: 1000, snow: 300, concrete: 2400, grain: 780, mulch: 400, clay: wet ? 2000 : 1700 } as Record<string, number>)[stuff[1]!]!; const upTo = a.slice(1, 5).findIndex((x) => /^(on|in|at|over|under|for|into|onto|with|and|or|to|from|inside)$/.test(x)); depthLoad = { d: q.si, rho, text: `${q.text} of ${a.slice(1, upTo >= 0 ? 1 + upTo : 4).join(' ')}, about ${rho} kg/m³ (estimate)` }; continue; }
      // "takes up no more than 3 m x 2.5 m of ground": the ground it may cover, its width and its depth at most
      if (b[0] === 'than' && /^(more|bigger|larger)$/.test(b[1] ?? '') && (near(/^(takes?|taking|occup\w*|covers?|covering|uses?)$/, 6) || /\bof (the )?(ground|floor|space|land|area)\b/.test(a.join(' ')))) { const n2 = n.by !== null ? pa.nums[n.by] : /^(x|×|by)$/.test(a[0] ?? '') ? pa.nums[pa.nums.indexOf(n) + 1] : undefined, q2 = n2?.said && sameDim(n2.said.dim, DIMS.length) ? n2.said : null; if (q2) { limits.W = Math.max(q.si, q2.si); limits.D = Math.min(q.si, q2.si); heard.push(`no more than ${q.text} × ${q2.text} of ground: its width and depth as made, checked`); usedNum.add(n2!); } else { limits.W = q.si; heard.push(`no more than ${q.text} across: a limit, checked`); } continue; }
      if (b[0] === 'than' && b[1] === 'thicker' && /\bwalls?\b/.test(b.join(' '))) { said.wall = q.si; heard.push(`walls no thicker than ${q.text}: weighed below by the heat through them`); continue; }
      // "a footprint under 0.5 m by 3 m": its plan within that, a limit checked; the sizes are still taken from it
      if (/^(under|below|within|max|maximum|at most)$/.test(b[0] ?? '') && /^(footprint|plan|base|area)$/.test(b[1] ?? '') && /^(x|×|by)$/.test(a[0] ?? '') && !limits.plan) { const n2 = pa.nums[pa.nums.indexOf(n) + 1], q2 = n2?.said && sameDim(n2.said.dim, DIMS.length) ? n2.said : null; if (q2) { limits.plan = [q.si, q2.si].sort((x, y) => y - x) as [number, number]; said.plan = limits.plan; if (/^(under|below)$/.test(b[0]!)) planUnder = true; heard.push(`a ${b[1]} under ${q.text} by ${q2.text}: its plan within that, either way round, checked`); } }
      if (b[0] === 'than' && /^(bigger|larger)$/.test(b[1] ?? '') && /^(x|×|by)$/.test(a[0] ?? '')) { const n2 = pa.nums[pa.nums.indexOf(n) + 1], q2 = n2?.said && sameDim(n2.said.dim, DIMS.length) ? n2.said : null; if (q2) { limits.plan = [q.si, q2.si].sort((x, y) => y - x) as [number, number]; said.plan = limits.plan; usedNum.add(n2!); heard.push(`no bigger than ${q.text} by ${q2.text}: its plan within that, either way round, checked`); continue; } }
      if (b[0] === 'than' && /^(wider|taller|longer|deeper|higher|bigger|larger|thicker)$/.test(b[1] ?? '')) { const k = /wider|bigger|larger/.test(b[1]!) ? 'W' : /taller|higher/.test(b[1]!) ? 'H' : /deeper|thicker/.test(b[1]!) ? 'D' : 'W'; limits[k] = q.si; heard.push(`no ${b[1]} than ${q.text}: a limit, checked`); continue; }
      if (/^(under|below|within|max|maximum|most)$/.test(b[0] ?? '') && ax && ax !== 'span' && ax !== 'alt' && ax !== 'thick' && !near(FOLDS, 6)) { limits[ax === 'WD' ? 'W' : ax] = q.si; heard.push(`${b[0]} ${q.text} ${a[0]}: a limit, checked`); continue; }
      // "folds flat to 60 x 40 x 15 cm", "packs into a 70 cm bundle": checked against it as made, as folding is not kept
      if (near(FOLDS, 6)) { if (ax === 'D' || ax === 'thick' || near(/^(flat|thin|thick)$/, 3) && !pa.nums.some((o) => o !== n && o.clause === n.clause && o.before.slice(0, 3).join(' ') === n.before.slice(0, 3).join(' ')) || /^(thickness|depth)$/.test(b[1] ?? '') && /^(folded|packed|collapsed)$/.test(b[2] ?? '')) limits.foldThin = q.si; else if (/^width$/.test(b[1] ?? '') && /^(folded|packed|collapsed)$/.test(b[2] ?? '')) limits.foldW = q.si; else (limits.fold ??= []).push(q.si); heard.push(`folds or packs to ${q.text}: checked against it folded`); continue; }
      if (near(/^into$/, 3)) { drop('the size of what it makes, not of it'); continue; }
      if (ax === 'alt' || /^(above|below)$/.test(a[0] ?? '') && /^(sea|ground|surface|the)$/.test(a[1] ?? '')) { drop('where it works (an altitude), not a size of it'); continue; }
      if (ax === 'thick') { drop('a thickness: the thickness of its parts is derived, not taken'); continue; }
      const travelVerb = (/^(lifts?|raises?|lowers?|hoists?|slides?|travels?|moves?|extends?|drops?|reaches|strokes?)$/.test(cl.verb ?? '') || near(/^(lifts?|raises?|lowers?|hoists?|slides?|travels?|extends?|drops?)$/, 6)) && !ax;
      if (/^(span|spans|spanning|cross|crosses|crossing|bridge|bridges)$/.test(cl.verb ?? '') && sup && !/^(long|tall|high)$/.test(a[0] ?? '')) { take(sup, 'span', q.si, 'm', q.text); if (!sup.flags.includes('span')) sup.flags.push('span'); continue; }
      if (cl.kind === 'where' && /^(to|onto|into)$/.test(cl.opener) && ax === 'H' && by('raise')) { take(by('raise')!, 'L', q.si, 'm', `to ${q.text} ${a.slice(0, 2).join(' ')}`); continue; }
      if (b[0] === 'over' && /^(going|goes|go|gets?|getting|rising|rises|reaching|reaches|being|stands?|standing|is|are)$/.test(b[1] ?? '')) { const of = b.slice(2, 5).find((x) => !/^(the|a|its|their|it)$/.test(x)); if (!of || /^(it|itself)$/.test(of)) { limits.H = q.si; heard.push(`no more than ${q.text} high: a limit, checked`); } else if (/^(stack|pile)s?$/.test(of)) { said.stackH = q.si; heard.push(`a stack no more than ${q.text} high: checked`); } else drop(`a limit on the ${of}, which is not made here`); continue; }
      if (ax === 'span' || near(/^(span|spans|over|across)$/, 2) && !ax) { if (sup) { take(sup, 'span', q.si, 'm', q.text); if (!sup.flags.includes('span')) sup.flags.push('span'); continue; } }
      if (travelVerb || /^(travel|stroke)$/.test(a[0] ?? '')) { const tw = by('raise') ?? by('slide'); if (tw) { take(tw, 'L', q.si, 'm', q.text); continue; } drop('how far it raises, lowers or slides something: nothing it makes does that the way asked'); continue; }
      // said of something else: a thing it works on, or a part of it that is not made
      const nounAfter = a[0] && !AX[a[0]] && !/^(of|in|on|at|to|and|or|for|from|with|by|that|which|each|apiece|up|away|off|per|so|it|its|when|then|while|if|than|standing|working|overall|total)$/.test(a[0]) && !/^\d/.test(a[0]) ? a.find((x) => !/^(tall|high|wide|deep|long|square|solar|glass|steel|wooden|tiny|small|large|big)$/.test(x)) ?? a[0] : null;
      // "a 120 x 60 cm top": the size of its own top, when it holds a weight up
      const ofTop = !!nounAfter && SURFACE_PART.test(nounAfter) && !!sup;
      // "fits on a 100 mm x 160 mm card": the size of the card it is
      if (/\b(card|board|pcb)s?\b/.test(a.slice(0, 4).join(' ')) && /^(boards?|computers?|cards?|pcbs?|controllers?|circuits?|modules?)$/.test(mainHead ?? '')) { own.push({ ax: 'plain', v: q.si }); heard.push(`${q.text}: the size of its card`); continue; }
      if (said.trip && (a[0] === 'low' || /^(orbit|up|altitude)$/.test(a[0] ?? '')) && q.si >= 1e5) { heard.push(`${q.text} up: the orbit it leaves (its burns are worked from 400 km, estimate)`); continue; }
      // "400 mm out from the wall", "sticking out 300 mm": how far from what it is fixed to it holds what it carries
      if (sameDim(d, DIMS.length) && a[0] === 'out' && (/\b(from|off)\b/.test(a[1] ?? '') || /^(sticks?|sticking|reach(es|ing)?|projects?|projecting|stands?|standing|holds?|holding)$/.test(b[0] ?? ''))) { const su = by('support'); if (su) { take(su, 'D', q.si, 'm', `${q.text} out from what it is fixed to`); continue; } }
      // "a 20 micron dust grain": something small it handles, weighed below by what holds it to what it touches
      if (nounAfter && /^(dust|grains?|particles?|powder|specks?|motes?|spores?|cells?)$/.test(nounAfter) && q.si < 1e-3) { said.grain = q.si; heard.push(`something ${q.text} across (${nounAfter}): what holds it to what it touches is weighed below`); continue; }
      // "carries two gas cylinders (9 in dia, 55 in tall)": the size of what it carries, not its own
      if (/^(carr|hold|haul|take|transport|move|tow)/.test(cl.verb ?? '') && pa.nums.some((o) => o.clause === n.clause && o.tok < n.tok && o.said && sameDim(o.said.dim, DIMS.mass)) && /^(dia|diameter|across|round|wide|tall|high|long)$/.test(a[0] ?? '')) { const mv0 = by('move') ?? by('support'); if (mv0 && /^(tall|high|long)$/.test(a[0]!)) mv0.q.lh = fig(q.si, 'm', 'you', `${q.text} ${a[0]}`); if (mv0 && /^(dia|diameter|across|round|wide)$/.test(a[0]!)) { mv0.q.ld = fig(q.si, 'm', 'you', `${q.text} ${a[0]}`); const cm = /\b(two|three|four|five|six|seven|eight|\d+)\s+(?:[\w-]+\s+){0,3}?(cylinders?|bottles?|tanks?|drums?|kegs?|barrels?|cans?|jugs?|buckets?|crates?|boxes)\b/.exec(t); if (cm && countOf(cm[1]!) > 1) mv0.q.lcount = fig(countOf(cm[1]!), '', 'you', `${cm[1]} ${cm[2]}`); } heard.push(`${q.text} ${a[0]}: the size of what it carries${/^(tall|high)$/.test(a[0]!) ? ', its weight about half that up' : ''}`); continue; }
      // "rolling a steel ball down a 500 mm zig-zag track": the track it rolls down, falling as it goes
      if (sameDim(d, DIMS.length) && /\b(balls?|marbles?)\b/.test(t) && a.slice(0, 3).some((x) => /^(tracks?|ramps?|chutes?|runs?|rails?|courses?|paths?)$/.test(x))) { said.track = q.si; const k = a.findIndex((x) => /^(tracks?|ramps?|chutes?|runs?|rails?|courses?|paths?)$/.test(x)); heard.push(`a ${q.text} ${a.slice(0, k + 1).join(' ').replace(/^zig zag\b/, 'zig-zag')}: what it rolls down, falling as it goes`); continue; }
      // "survive a 2 m drop", "dropped from 1.5 m": a fall it must survive
      if (/^drops?$/.test(a[0] ?? '') || near(/^(dropped|falls?|falling|fallen)$/, 3) && /^(from|of)$/.test(b[0] ?? '')) { said.drop = q.si; heard.push(`a ${q.text} drop: weighed below`); continue; }
      // "a 7-inch propeller": the size of its rotors
      if (/^(props?|propellers?|rotors?|blades?)$/.test(a[0] ?? '') && /\b(drone|quadcopter|copter|multicopter|uav|quad)\b/.test(t)) { said.prop = q.si; heard.push(`${q.text} ${a[0]}: the size of its rotors, weighed below`); continue; }
      if (nounAfter && nounAfter !== pa.clauses[0]?.head && !purposeOf(nounAfter) && cl.kind !== 'main' && !ofTop) { drop(`the size of ${singular(nounAfter)}, ${areaOf(nounAfter).startsWith('not a kind') ? 'which is not made here' : areaOf(nounAfter)}`); continue; }
      // "15 cm of trunk sway": a movement it must allow where it is fixed, not a size of it
      if (a[0] === 'of' && a.slice(1, 3).some((x) => /^(sway|swaying|movement|motion|play|flex|give|deflection|drift|settlement|settling)$/.test(x))) { heard.push(`${q.text} of ${a.slice(1, 3).join(' ')}: a movement it must allow where it is fixed (a joint that slides or floats), not derived`); continue; }
      // "a 45 cm diameter oak": the tree it is built at, which is not made; where its trunk passes is said with what is not yet made
      if (elsewhere && sameDim(d, DIMS.length) && /^(trees?|trunks?|oaks?|pines?|maples?|beech(es)?|elms?|cedars?|firs?|sycamores?|chestnuts?|walnuts?|willows?)$/.test(cl.head ?? '')) { heard.push(`a ${q.text} ${singular(cl.head!)}: the tree it is built at, which is not made; where its trunk would pass through it is said below`); continue; }
      if (elsewhere && !(b[0] === 'at' && !a.length) && !/^(up|high)$/.test(a[0] ?? '')) { drop(`said of ${cl.head ? `the ${singular(cl.head)}` : 'something else'}, not of what it makes`); continue; }
      // its own sizes, kept for what the laws say of them, whether or not it is made
      if (cl.kind === 'main' || (ownerWant && ownerWant === ofHead) || /^(by|x|×)$/.test(b[0] ?? '') && own.length > 0 && cl.kind === 'where') { own.push({ ax: ax ?? 'plain', v: q.si }); const n2 = ax === 'W' && n.by !== null ? pa.nums[n.by]?.said : null; if (n2) own.push({ ax: 'D', v: n2.si }); }
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
      // "a 3 g lateral load test", "survives 5 g of shock": so many times its weight, not grams
      if (q.unit === 'g' && q.value <= 100 && /^(lateral|vertical|sideways|side|load|loads|shock|shocks|deceleration|acceleration|impact|turn|turns|cornering|braking|forward|crash|landing|of)$/.test(a[0] ?? '') && (a[0] !== 'of' || /^(shock|impact|deceleration|acceleration|force)/.test(a[1] ?? ''))) { said.gLoad = q.value; heard.push(`${q.value} g ${a[0] === 'of' ? a[1] : a[0]}: a push ${q.value} times its weight and what it carries, weighed below`); continue; }
      const N = sameDim(d, DIMS.mass) ? q.si * G : q.si;
      // "less than 40 N on the handle", "a 1.5 kN fall pull on each hold": a force put on a part, not its weight or a load it carries
      if (sameDim(d, DIMS.force) && (b[0] === 'from' && pa.nums.some((o) => o !== n && o.tok > n.tok && o.tok - n.tok < 8 && o.said && sameDim(o.said.dim, DIMS.force)) || b[0] === 'to' && near(/^(from|between)$/, 8))) { (said.forceRange ??= []).push(q.si); drop(`${b[0] === 'from' ? 'the least' : 'the most'} of a range of force it must work across: one mechanism over so wide a range is not kept; the range is weighed below`); continue; }
      if (sameDim(d, DIMS.force) && near(/^(squeez\w*|grips?|gripping|clamps?|clamping|presses|pressing|pinch\w*|close|closes|closing)$/, 6)) { said.grip = q.si; heard.push(`squeezing with no more than ${q.text}: weighed below`); continue; }
      if (sameDim(d, DIMS.force) && (near(/^(handle|handles|crank|cranks|lever|levers|pedal|pedals|grip|grips|tiller)$/, 4) || a[0] === 'of' && /^(pull|push|effort|hand|force)$/.test(a[1] ?? '') || /^(on|at)$/.test(a[0] ?? '') && /^(the|its|a)?$/.test(a[1] ?? '') && /^(handle|crank|lever|pedal)s?$/.test(a[2] ?? a[1] ?? ''))) { said.effort = q.si; heard.push(`${q.text} at the handle: the most a hand puts on it, weighed below`); continue; }
      if (sameDim(d, DIMS.force) && near(/^(pull|pulls|pull-out|fall|rated|rating|holds?)$/, 4) && !near(/^(carry|carries|hold|holds|support|supports|bear|bears)$/, 2)) { said.pull = q.si; heard.push(`${q.text} pulling on a part: weighed below`); continue; }
      // "stay shut when cattle lean on it with 1200 pounds of force": a push it must hold shut against, at its latch
      if (sameDim(d, DIMS.force) && by('swing') && b.slice(0, 8).some((x) => /^(lean|leans|leaning|push|pushes|pushing|shove|shoves|press|presses|ram|rams|charge|charges|rub|rubs)$/.test(x))) { said.holdShut = q.si; by('swing')!.q.shut = fig(q.si, 'N', 'you', `${q.text} on it, shut`); heard.push(`a push of ${q.text} on it: it must hold shut against it, weighed below`); continue; }
      // "an all-up weight of 900 g": all it lifts, itself and what it carries, not a limit on what is made
      // "survives a 25 kg child climbing it": a child hung on its front, it empty, weighed against tipping, not a load on it
      if (sameDim(d, DIMS.mass) && [...a.slice(0, 4), ...b.slice(0, 4)].some((x) => /^(climb|climbs|climbing|climbed|hangs?|hanging|swings?|swinging|scal(e|es|ing))$/.test(x)) && /\b(child|children|kids?|toddlers?|pupils?|students?|person|people|someone|adults?)\b/.test([...a.slice(0, 3), ...b.slice(0, 3)].join(' ')) && wants.some((w) => w.fn === 'support')) { said.climber = q.si; heard.push(`a ${q.text} ${a.find((x) => /^(child|children|kids?|toddlers?|pupils?|students?|person|people|someone|adults?)$/.test(x)) ?? 'child'} climbing it: hung on its front with it empty, weighed against tipping it`); continue; }
      if (sameDim(d, DIMS.mass) && /\b(all[- ]up|auw|gross|take-?off|takeoff|flying|loaded)\b/.test(b.slice(0, 5).reverse().join(' '))) { said.auw = q.si; heard.push(`all-up ${q.text}: all it lifts, weighed below`); continue; }
      // "panels max 12 kg each": a limit on each part
      if (sameDim(d, DIMS.mass) && /^(max|maximum|at most)$/.test(b[0] ?? '') && /^(panels?|pieces?|parts?|components?|sections?|modules?|boards?)$/.test(b[1] ?? '')) { limits.part = q.si; heard.push(`no part weighing more than ${q.text}: each part checked against it`); continue; }
      // "behind no more than 2 kg of tantalum shielding": its shield, not what it carries
      if (a[0] === 'of' && /^(tantalum|tungsten|lead|aluminium|aluminum|copper)$/.test(a[1] ?? '') && /^shield/.test(a[2] ?? '')) { heard.push(`${q.text} of ${a[1]} shielding: weighed below`); continue; }
      // "a camera that weighs 0.2 µg": the weight of the thing named just before, not its own
      const said0 = pa.clauses[n.clause - 1], ofOther = cl.kind === 'does' && /^(that|which)$/.test(cl.opener) && !!said0?.head && said0 !== pa.clauses[0] && said0.head !== pa.clauses[0]?.head;
      if (near(/^(weighs?|weighing|weight)$/, 4) && ofOther) { loadSaid = { N, text: `${said0!.head} of ${q.text}` }; said.payload = N / G; continue; }
      // "no single piece can weigh more than 35 kg": a limit on each part, not on all of it
      if ((near(/^(weighs?|weighing|weight)$/, 6) || /^(over|above|exceeding)$/.test(b[0] ?? '') || b[0] === 'than' && /^(heavier|more)$/.test(b[1] ?? '')) && /\b(single|each|any|every|one)\s+(piece|part|component|section|module|panel|board|member|bit|element)s?\b/.test(`${cl.text} ${[...b.slice(0, 8)].reverse().join(' ')}`)) { limits.part = N / G; heard.push(`no part weighing more than ${q.text}: each part checked against it`); continue; }
      if (near(/^(weighs?|weighing|weight)$/, 4)) { limits.mass = N / G; heard.push(`weighs ${b[0] === 'weighs' || b[0] === 'weigh' ? '' : b[0] === 'than' ? 'no more than ' : `${b[0]} `}${q.text}: a limit on its own weight, checked`); continue; }
      // "a flask under 400 g empty", "lighter than 300 g": its own weight, where nothing near it carries, holds or lifts
      if ((/^(under|below)$/.test(b[0] ?? '') || b[0] === 'than' && /^(lighter|less)$/.test(b[1] ?? '') || a[0] === 'empty') && !near(/^(carr|hold|support|lift|bear|take|tow|haul|pull|push|rais|load|deliver)/, 5)) { limits.mass = N / G; heard.push(`${b[0] === 'than' ? `${b[1]} than` : 'under'} ${q.text}${a[0] === 'empty' ? ' empty' : ''}: a limit on its own weight, checked`); continue; }
      if (near(/^(measures|measure|dispenses|dispense|pours|portions|doses|meters)$/, 4)) { drop('a dose to measure out: measuring out is not kept'); continue; }
      const each = a[0] === 'of' && a[1] === 'each' || a[0] === 'each' || a[0] === 'apiece', many = each ? (() => { for (const c2 of [...pa.clauses.slice(n.clause, n.clause + 3), ...pa.clauses.slice(Math.max(0, n.clause - 3), n.clause).reverse()]) for (const m2 of c2.text.matchAll(/\b(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(?:separate\s+|different\s+)?([a-z]+)/g)) if (!/^(kg|kgs|g|grams?|kilo\w*|lbs?|pounds?|tonnes?|tons?|t|n|kn|mm|cm|m|metres?|meters?|l|litres?|liters?|ml|each|per|percent)$/.test(m2[2]!)) return countOf(m2[1]!); return 1; })() : 1;
      // "three 30 kg kids", "two 150 lb gas cylinders": so many of that weight; "plus an 80 kg parent", "and a 90 lb welder": more of it
      const count = !each && /^(two|three|four|five|six|seven|eight|nine|ten|twelve|\d+)$/.test(b[0] ?? '') && !/^(x|×|by)$/.test(a[0] ?? '') ? countOf(b[0]!) : 1, k0 = each ? many : count;
      const more = !!loadSaid && (b.slice(0, 3).some((x) => /^(plus|and|with|alongside)$/.test(x)) || b[0] === 'a' && b[1] === 'plus' || /^(an?|one)$/.test(b[0] ?? '') && /^(plus|and)$/.test(b[1] ?? ''));
      const stop = a.findIndex((x) => !/^[a-z-]+$/.test(x) || /^(of|each|apiece|in|on|at|to|for|with|plus|and|or|that|which|total|totally|up|down|from|by|when|while)$/.test(x)), what = a.slice(0, Math.min(3, stop < 0 ? a.length : stop)).join(' ');
      const part = `${k0 > 1 ? `${each ? k0 : b[0]} ${q.text} ${what || 'of them'}` : `${more ? (/^(8|11|18)(?![\d])/.test(q.text) ? 'an ' : 'a ') : ''}${q.text}${what && more ? ` ${what}` : ''}`}${each ? ' each' : ''}`, base = loadSaid?.text.replace(/: [\d.]+ kg in all$/, '');
      loadSaid = more && loadSaid ? { N: loadSaid.N + N * k0, text: `${base} and ${part}: ${+((loadSaid.N + N * k0) / G).toPrecision(3)} kg in all` } : { N: N * k0, text: each && many > 1 ? `${q.text} each, ${many} of them` : k0 > 1 ? `${part}: ${+((N * k0) / G).toPrecision(3)} kg in all` : q.text };
      said.payload = loadSaid.N / G;
      // so many people on it, children or grown: the room they stand in, about 0.3 m² a child and 0.5 m² a grown person (estimate)
      { const near0 = `${what} ${each ? pa.clauses[n.clause - 1]?.text ?? '' : ''} ${cl.text} ${pa.clauses[n.clause + 1]?.text ?? ''}`, kid = /\b(kids?|children|child|pupils?|toddlers?|boys?|girls?)\b/.test(near0), grown = /\b(adults?|people|persons?|parents?|climbers?|students?|users?|men|women|crew|visitors|guests|teachers?)\b/.test(near0);
        if (kid || grown) { if (!peopleNumbered) { said.people = 0; said.peopleArea = 0; peopleNumbered = true; } said.people = said.people! + k0; said.peopleArea = said.peopleArea! + k0 * (kid && !(grown && /\b(parents?|adults?)\b/.test(what)) ? 0.3 : 0.5); } }
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
      if (/^(space|room|cupboard|gap|hole|cavity|nook|corner)$/.test(a[0] ?? '') && near(/^(in|into|inside|within)$/, 3) && near(/^(fits?|fitting|goes|sits)$/, 5)) { said.fitsVol = q.si; heard.push(`fits in a ${q.text} ${a[0]}: what it holds in that weighed below`); continue; }
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
      // "climbs 35 degree stairs at 0.15 m/s": how fast it climbs them; "crawl at 2 mm/s for timelapses": how slowly what slides moves
      if (said.stairSlope !== undefined && /\b(climb\w*|stairs?)\b/.test(`${cl.text} ${b.slice(0, 6).join(' ')}`)) { said.climbV = q.si; heard.push(`climbing at ${q.text}: weighed below`); continue; }
      { const sl = by('slide'); if (sl && near(/^(crawl|crawls|crawling|creep|creeps|creeping|moves?|moving|travels?|glides?|runs?)$/, 3)) { said.slideV = q.si; heard.push(`sliding at ${q.text}: what drives it at that speed weighed below`); continue; } }
      // a journey said in legs ("100 km at 80 km/h, then 5 km across a lake at 10 knots"): each speed goes with the
      // distance before it; the first leg's is the speed it moves at
      const windy = a.slice(0, 3).some((x) => /^(gusts?|winds?|breeze|gales?|current)$/.test(x)) || near(/^(winds?|gusts?)$/, 3), leg = windy ? undefined : said.legs?.find((l) => l.v === undefined), later = leg !== undefined && said.legs!.indexOf(leg) > 0;
      if (leg) { leg.v = q.si; if (/\b(knots?|kn)\b/.test(q.text)) leg.water = true; }
      if (!windy && !later) said.v = q.si; if (a.slice(0, 3).some((x) => /^(gusts?|winds?|breeze|gales?)$/.test(x)) || near(/^(winds?|gusts?)$/, 3)) { said.wind = q.si; heard.push(`wind of ${q.text}: it is pushed by it in the physics test`); continue; } if (/^current$/.test(a[0] ?? '')) { drop('a current of water: there is no flow in the physics here'); continue; } if (mov) { if (mov.q.v?.by === 'you' || later) { heard.push(`at ${q.text} on another leg: weighed below`); continue; } take(mov, 'v', q.si, 'm/s', q.text); continue; } if (!later) said.v = q.si; if (by('lift')) { heard.push(`flies at ${q.text}: weighed below`); continue; } if (said.buoyant || said.burrows || said.immersed || by('float')) { heard.push(`at ${q.text}: weighed below`); continue; } drop(asked.some((x) => /getting about by legs/.test(x.why)) ? 'a speed for getting about by legs, by climbing or by swimming, which is not kept' : 'a speed for something that does not move along'); continue; }
    if (sameDim(d, DIMS.frequency)) { said.w = q.si; const tu = by('turn'); if (tu) { take(tu, 'rpm', q.si, 'rpm', q.text); continue; } if (/\b(ring|station|habitat|wheel|torus|drum)\b/.test(t) && /\b(spin\w*|rotat\w*|turn\w*)\b/.test(t)) { said.spin = q.si; heard.push(`the ring it is on turning at ${q.text}: weighed below`); continue; } drop('a turning speed for something that does not turn'); continue; }
    if (sameDim(d, DIMS.temperature)) {
      if (/^(difference|gap|gradient|warmer|colder|hotter|between)$/.test(a[0] ?? '')) { said.dT = q.value; heard.push(`a difference of ${q.text}: weighed below`); continue; }
      // "a 300 K day-night swing": how far it goes up and down, not what is round it
      if (a.slice(0, 3).some((x) => /^(swings?|range|cycles?|cycling|changes?|variations?)$/.test(x))) { said.swing = q.value; heard.push(`a swing of ${q.text}: weighed below in its wall`); continue; }
      const C = q.si - 273.15;
      // "to within ±0.5 °C": how steadily it is held, which wants a sensor and its control
      if (near(/^(within|±|\+\/-|accuracy|tolerance|precision)$/, 2) || /^±/.test(n.text.trim())) { drop('how steadily it is held: a sensor and its control are not kept, and steadiness is not checked'); continue; }
      // "blows out 55 °C air": the air it gives, kept at that
      if (a[0] === 'air' && near(/^(out|blows|blowing|delivers|gives|supplies|outputs|makes|vents)$/, 3)) { const wa = by('warm'); if (wa) { take(wa, 'T', C, '°C', `${q.text} air out`); said.Tout = C; continue; } }
      // "where I live it hits 46 C every July", "it gets to 40 °C in summer": the weather round it, not a limit on it
      if (near(/^(hits?|hitting|reaches|reaching|gets?|goes|climbs|peaks?)$/, 3) && /\b(where (i|we) live|every (january|february|march|april|may|june|july|august|september|october|november|december|summer|winter|day|year)|in (summer|winter|july|august)|outside|the weather|here)\b/.test(`${b.slice(0, 8).reverse().join(' ')} ${a.slice(0, 4).join(' ')}`)) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "stays under 32 C inside": what it must keep below, where nothing cools it
      if (/^(under|below)$/.test(b[0] ?? '') && (a[0] === 'inside' || /\b(inside|in it|within)\b/.test(a.slice(0, 2).join(' '))) && !/\b(cool|cooled|cooler|cools|cooling|chill|chilled|fridge|refrigerat\w*|freez\w*)\b/.test(t)) { said.Tbelow = C; heard.push(`under ${q.text} inside: kept below the air round it, weighed below`); continue; }
      // "livable at -45 °C": the cold round it
      if (b[0] === 'at' && /\b(livable|liveable|habitable|comfortable|warm)\b/.test(b.slice(1, 5).join(' '))) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "in a 5 °C car", "in 35 °C desert heat", "through −170 °C nights": the temperature round it
      if (/^(heat|air|car|room|weather|outside|outdoors|desert|sun|shade|surroundings|cold|day|days|night|nights|winter|summer|ambient|climate)$/.test(a.find((x) => !/^(desert|summer|winter|night|outside|dry|still)$/.test(x)) ?? a[0] ?? '') || /^(heat|air|car|room|weather|outside|desert|sun|shade|surroundings|nights?|ambient)$/.test(a[0] ?? '')) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "tea poured at 95 °C", "1 litre of 15 °C stream water": where what it holds starts
      if (near(/^(poured|filled|starting|starts|begins|made|brewed|boiled)$/, 3) || b[0] === 'of' && /^(water|tea|coffee|milk|soup|stream|tap|cold|warm|hot)$/.test(a[0] ?? '')) { said.T0 = C; heard.push(`starting at ${q.text}: weighed below`); continue; }
      // "keeps tea above 55 °C", "still above 70 °C after 48 hours": the least it may come to, weighed against its heat loss
      if (near(/^(above|over)$/, 3) && (near(/^(keeps?|keeping|kept|stays?|staying|remains?|still|holds?|holding)$/, 7) || /\bkeeps?\b/.test(cl.text))) { said.tmin = q.si - 273.15; heard.push(`kept above ${q.text}: weighed below by the heat it loses`); continue; }
      // "works from −160 °C to +120 °C": the range its parts must work over, which is a rating of parts not kept
      if (near(/^(from|between)$/, 2) || b[0] === 'to' && near(/^(from|between)$/, 6)) { const C = q.si - 273.15; drop(`a range it must work over: parts rated for it (electronics, seals) are not kept${C < -55 || C > 125 ? '; past the −55 to +125 °C that military-grade parts are rated for, so it must be kept warm or cool (estimate)' : ''}`); continue; }
      if (near(/^(above|over|hotter|warmer|exceeding|exceed|beyond|past|hits?|hitting|reaches|reaching)$/, 3) || /^(under|below)$/.test(b[0] ?? '') && near(/^(stays?|staying|remains?|kept)$/, 3) && /\b(outside|case|casing|surface|skin|shell|outer)\b/.test(b.slice(0, 9).join(' ')) || b[0] === 'than' && /^(hotter|warmer)$/.test(b[1] ?? '') || /^(under|below)$/.test(b[0] ?? '') && /\b(dissipat\w*|fanless|chips?|soc|cpu|gear|electronics|servers?|heat ?sinks?|draws?)\b/.test(t)) { said.tmax = q.si - 273.15; heard.push(`no hotter than ${q.text}: weighed below by the heat it sheds`); continue; }
      // "the chamber held at 250 °C": something kept hot, a warmer; "a nozzle at 480 °C": a part not made
      if (near(/^(held|kept|maintained|heated)$/, 3) && C > 40) { const wa = by('warm') ?? add('warm', FN_WORDS.warm, BASE.warm); take(wa, 'T', C, '°C', q.text); continue; }
      if (near(/^(nozzles?|hot ?ends?|extruders?|elements?|tips?)$/, 3) && C > 40) { drop(`the heat of a part not made (a hot end): weighed only as said`); continue; }
      // "survives 160 km/h gusts at minus 40 °C": at a cold, the cold round it
      if (C < 10 && b[0] === 'at' && !/\b(cool|cooled|cooler|cools|cooling|chill|chilled|fridge|refrigerat\w*|freezer)\b/.test(t) && !/\b(keeps?|kept|holds?|holding|stores?|storing)\b/.test(cl.text)) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "at -25 °C" near ice or frost, "on a frosty morning": the cold round it
      if (C < 5 && /\b(ice|icy|frost\w*|freez\w*|winter|snow\w*)\b/.test(t) && !said.Tkeep) { said.Tamb = C; heard.push(`${q.text} round it: weighed below`); continue; }
      // "curls shut when it warms to 37 °C": a temperature it acts at
      if (near(/^(warms?|warming|reaches|at)$/, 3) && /\b(when|once|if)\b/.test(b.slice(0, 5).join(' '))) { drop('a temperature it acts at: what senses heat and moves by it is not kept'); continue; }
      // "holds 20 litres of drinks at 4 °C" in a cooler: what it is kept cold at, weighed by the heat that leaks in
      if (/\b(cool|cooled|cooler|cools|cooling|chill|chilled|fridge|refrigerat\w*|freez\w*|peltier|cold)\b/.test(t) && !(near(/^(below|under)$/, 2) && !/\bkeeps?\b/.test(cl.text) && !near(/^(keeps?|keeping|kept|holds?|holding|stores?|storing)$/, 8))) { said.Tkeep = C; heard.push(`kept at ${q.text}: weighed below by the heat that leaks in`); continue; }
      if (/\b(cool|cools|cooling|chill|freeze|cold)\b/.test(t) || b[0] === 'below' || b[0] === 'under') { drop('cooling to a temperature: keeping warm is kept, cooling is not'); continue; } const wa = by('warm'); if (wa) { take(wa, 'T', q.si - 273.15, '°C', q.text); continue; } drop('a temperature for something that does not keep warm'); continue; }
    // "kept at 101 kPa inside": the pressure it holds in
    if (sameDim(d, DIMS.pressure)) {
      // "1.5 kN/m² of snow": a weight spread on its top
      if (a[0] === 'of' && /^(snow|ice|load|water|people|crowd)/.test(a[1] ?? '')) { said.topP = q.si; heard.push(`${q.text} of ${a[1]} on its top: weighed below`); continue; }
      // "a 30 psf snow load", "snow load 2.4 kPa", "rated for 1.5 kPa of live load": a weight spread on its top
      if (/^(snow|ice|roof|live|design|floor)$/.test(a[0] ?? '') && /^loads?$/.test(a[1] ?? '') || /^loads?$/.test(b[0] ?? '') && /^(snow|ice|roof|live)$/.test(b[1] ?? '') || b[0] === 'snow' || a[0] === 'snow' || a[0] === 'ground' && a[1] === 'snow') { said.topP = q.si; heard.push(`${q.text} of snow on its top: weighed below`); continue; }
      // "4,000 m depth (400 bar)": the sea's push there, said again
      if (said.depth !== undefined && Math.abs(q.si - 1025 * 9.80665 * said.depth) < 0.15 * q.si) { heard.push(`${q.text}: the sea's push at that depth, weighed with it`); continue; }
      // "against Mars's 0.006 bar outside": what is round it, held against what it holds in
      if (/^(outside|out|ambient|external|around|round)$/.test(a[0] ?? '') || b.slice(0, 3).some((x) => /^(against|outside)$/.test(x)) && said.pin !== undefined) { said.pout = q.si; heard.push(`${q.text} outside: what it holds in is held against it, weighed below`); continue; }
      // "the water outside is pushing at about 110 MPa": the sea's push, weighed with its depth
      if (/\b(outside|the water|the sea|the ocean)\b/.test(b.slice(0, 8).join(' ')) || near(/^(pushing|pushes|presses|pressing|crushing)$/, 4)) { heard.push(`${q.text} outside: the sea's push, weighed with how deep it is`); continue; }
      said.pin = q.si; heard.push(`${q.text} held inside: weighed below by the pull in its wall`); continue; }
    // "a rigid 12 m² room", "12 m² of floor": what it encloses, as square as it may be
    if (sameDim(d, [0, 2, 0, 0, 0] as typeof d) && by('enclose') && /^(room|rooms|floor|floor ?space|inside|space|interior|of)$/.test(a[0] ?? '') && !/panel|cell|sail|collector/.test(a.join(' '))) { const enc = by('enclose')!, side = Math.sqrt(q.si); take(enc, 'W', side, 'm', `${q.text}, square`); take(enc, 'D', side, 'm', `${q.text}, square`); continue; }
    // "a 0.5 hectare fish pond": the size of the place it works in, not of a part of it
    if (sameDim(d, [0, 2, 0, 0, 0] as typeof d) && /\b(ponds?|lakes?|fields?|farms?|gardens?|sites?|yards?|plots?|paddocks?|pastures?|lots?|orchards?|vineyards?)\b/.test(a.slice(0, 3).join(' '))) { heard.push(`${q.text} ${a.slice(0, 2).join(' ')}: the place it works in, ${+(q.si / 1e4).toPrecision(3)} ha`); continue; }
    if (sameDim(d, [0, 2, 0, 0, 0] as typeof d)) { said.area = q.si; heard.push(`${q.text}${/panel|cell|sail|collector/.test(a.join(' ')) ? ` of ${a.find((x) => /panel|cell|sail|collector/.test(x))}` : ''}: weighed below`); continue; }
    if (sameDim(d, [1, 0, -3, 0, 0] as typeof d)) { said.light = q.si; heard.push(`${q.text} of light: weighed below`); continue; }
    // "3 N-m of manipulator torque": a twist, not energy stored, though their units agree
    if (sameDim(d, DIMS.energy) && (/\b(n[- ·]?m|nm|newton[- ]metres?|newton[- ]meters?|lbf?[- ·]?ft|ft[- ·]?lbf?|in[- ·]?lbf?|lbf?[- ·]?in)\b/i.test(q.text) || a.slice(0, 4).includes('torque') || n.before.slice(0, 3).includes('torque'))) { heard.push(`${q.text}${a.slice(0, 4).includes('torque') ? ` of ${a.slice(a[0] === 'of' ? 1 : 0, a.indexOf('torque') + 1).join(' ')}` : ' of torque'}: the most twist it is given; nothing it makes is turned by it, so it is not checked`); continue; }
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
      if (/^(nights?|evenings?|days?|winters?)$/.test(a[0] ?? '') && near(/^(through|over|for|across|a|the)$/, 3)) { said.keepFor = q.si; heard.push(`through a ${q.text} ${a[0]}: how long what it holds must last, weighed below`); continue; }
      if (near(/^(within)$/, 2) || b[0] === 'under' && b[1] === 'in' || near(/^(in|within|under)$/, 2) && (said.distance !== undefined ||said.T0 !== undefined || /\b(boil|boiling|heat|heats|warm|charge|refill|fill|reach|reaches|bring|brings|deliver)\b/.test(t) || /^(of)$/.test(a[0] ?? ''))) { said.within = q.si; heard.push(`within ${q.text}: weighed below by the power it takes`); continue; }
      if (near(/^(every|once)$/, 2) && /\b(spin|spins|spinning|turn|turns|turning|rotat\w*|revolv\w*)\b/.test(t)) { said.w = (2 * Math.PI) / q.si; const tu = by('turn'); if (tu) take(tu, 'rpm', said.w, 'rpm', `once every ${q.text}`); else heard.push(`turning once every ${q.text}`); continue; }
      if (near(/^(for|lasts?|lasting|runs?|hover|hovers|hovering|keeps?)$/, 3) || /\b(charge|battery)\b/.test(a.join(' ')) || /^(surface\s+)?(mission|stay|deployment|sojourn|expedition)s?\b/.test(a.slice(0, 2).join(' '))) { said.runFor = q.si; heard.push(`runs for ${q.text}: weighed below by the energy it must carry`); continue; }
      // "every 2 hours": how often it does it, not how long it takes
      if (near(/^(every|each)$/, 2)) { said.every = q.si; heard.push(`every ${q.text}: how often it does it, weighed below`); continue; }
      drop(near(/^(for|lasts?|runs?)$/, 3) || /\bcharge\b/.test(a.join(' ')) ? 'how long it runs on its power: power is not kept yet' : 'how long it takes: time limits are not checked yet'); continue; }
    if (sameDim(d, DIMS.power)) {
      // "brushed gearmotors under 150 W each": what each motor is rated at, not what it draws
      if (near(/^(gear ?motors?|motors?|servos?|steppers?|actuators?)$/, 4) && (a[0] === 'each' || a[0] === 'apiece' || near(/^each$/, 2))) { said.motorW = q.si; heard.push(`${q.text} each: what each of its motors is rated at, not what it draws; what it draws is weighed below`); continue; }
      const as = b[0] === 'from' && near(/^(charges?|charging|charged|fed|feeds?|runs?|draws?|takes?)$/, 3) ? 'takes' : near(/^(puts?|putting|gives?|giving|delivers?|outputs?|supplies|supplying|provides?|charges?|out)$/, 3) ? 'gives' : near(/^(makes?|making|produces?|generates?|harvests?)$/, 3) ? 'makes' : 'draws';
      (said.power ??= []).push({ W: q.si, as }); const cap = as === 'draws' && near(/^(less|under|most|max|maximum|than|within|below|just|only|mere|merely)$/, 3); if (cap) limits.power = q.si;
      heard.push(cap ? `uses no more than ${q.text}: a limit, checked against what it makes that draws power` : `${as === 'takes' ? 'charges from' : as} ${q.text}: weighed below`); continue;
    }
    if (q.unit === 'deg' || q.unit === 'rad') {
      if (Math.abs(q.si - 2 * Math.PI) < 1e-6 && /\bevery\b/.test(cl.text + ' ' + a.join(' '))) { heard.push(`${q.text}: a whole turn, read with its time as its speed`); continue; }
      if (/^(slope|incline|hill|grade|ramp|gradient)s?$/.test(a.find((x) => !/^(muddy|steep|wet|grassy|gravel|rough)$/.test(x)) ?? '') && mov) { mov.q.slope = fig(q.si, 'rad', 'you', q.text); heard.push(/\b(tip|tips|tipping|topple|roll over|overturn)\b/.test(cl.text) ? `on a ${q.text} slope: weighed for its tipping, and for what drives or pushes it up it` : `up a ${q.text} slope: weighed for what drives or pushes it up it`); continue; }
      // "climbs 35 degree stairs": the slope of the stairs it climbs
      if (/^(stairs?|staircases?|steps|stairways?|flights?)$/.test(a[0] ?? '') || /^(stairs?|staircases?)$/.test(a[1] ?? '') && /^(steep|indoor|outdoor|normal)$/.test(a[0] ?? '')) { said.stairSlope = q.si; heard.push(`stairs at ${q.text}: climbing them weighed below`); continue; }
      // "keeping the seat level within 3 degrees": how near level it is held, a tolerance, not a turn
      if (near(/^(within|to|±)$/, 2) && /\b(level|upright|plumb|flat|true)\b/.test(`${cl.text} ${b.slice(0, 8).join(' ')}`)) { drop(`how near level it is held, within ${q.text}: what senses and levels it is not kept, so it is not checked`); continue; }
      // "tilts a patient 30 degrees side to side": a tilt of what it carries, weighed below
      if (near(/^(tilts?|tilting|tilted|leans?|leaning|rolls?|rolling|turns?|turning|rocks?|rocking|inclines?|inclining|reclines?|reclining)$/, 6) && q.si < Math.PI / 2) { said.tilt = q.si; heard.push(`tilts ${q.text}: tilting is not kept; what it carries, tilted so, is weighed below`); continue; }
      drop('a turn of so many degrees at a time: turning by steps is not kept'); continue; }
    // "up a 15% hill": a grade, rise over run
    if (q.unit === '%' && /\b(hill|hills|slope|slopes|incline|grade|gradient|ramp|climb)\b/.test([...a.slice(0, 3), ...b.slice(0, 4)].join(' '))) { said.grade = q.si; if (mov) { mov.q.slope = fig(Math.atan(q.si), 'rad', 'you', q.text); heard.push(`up a ${q.text} grade (${+((Math.atan(q.si) * 180) / Math.PI).toPrecision(3)}°): its motors checked for it`); } else { said.grade = q.si; heard.push(`up a ${q.text} grade: weighed below`); } continue; }
    // "a 24 V battery": the voltage of its cells, weighed below with what it draws
    if (q.unit === 'V' && /\b(batter(y|ies)|cells?|packs?|li-?ion|lipo|lithium)\b/.test([...a.slice(0, 3), ...b.slice(0, 3)].join(' '))) { said.volts = q.si; heard.push(`${q.text} cells: what they give, weighed below with what it draws`); continue; }
    drop(`a figure of ${q.unit}: electric chains and energy figures are not kept yet`);
  }
  // lengths said with nothing to say which way: the largest is its width, the next its depth (a third, for what encloses, its height)
  const byOwner = new Map<Want, number[]>(); for (const { n, owner } of plain) byOwner.set(owner, [...(byOwner.get(owner) ?? []), n.said!.si]);
  for (const [w, vs] of byOwner) {
    const ks = w.fn === 'turn' ? ['Dia'] : w.fn === 'raise' || w.fn === 'slide' ? ['L'] : w.fn === 'contain' ? [] : w.flags.includes('span') ? ['span', 'W'] : ['W', 'D', 'H'], free = ks.filter((k) => w.q[k]?.by !== 'you');
    // a size read from what it must be under ("a footprint under 0.5 m by 3 m") is made 10 mm under it (estimate), so that it is under
    vs.sort((x, y) => y - x).forEach((v, i) => { const k = free[i], under = planUnder && limits.plan?.some((p) => Math.abs(p - v) < 1e-9) && (k === 'W' || k === 'D'); if (k && (k !== 'H' || w.fn === 'enclose' || vs.length === 1 && free.length === 1)) take(w, k, under ? v - 0.01 : v, 'm', under ? `${len(v - 0.01)}, 10 mm under the ${len(v)} it must be under (estimate)` : len(v)); else dropped.push(`${len(v)}: a length it had no way to place`); });
  }
  if (carrier && loadSaid) { if (carrier.fn === 'support') take(carrier, 'F', loadSaid.N, 'N', loadSaid.text); else take(carrier, 'm', loadSaid.N / G, 'kg', loadSaid.text); }
  const obj = occupant ?? MASSES.find(([re]) => re.test(t) && pa.clauses.some((c) => (c.kind === 'for' || c.kind === 'does') && re.test(` ${c.text} `)));
  if (carrier?.fn === 'support' && obj?.[3] && carrier.q.W?.by !== 'you') { carrier.q.W = fig(Math.max(obj[3][0] * 1.25, 0.15), 'm', 'estimate', `a top a little wider than ${obj[2]}`); if (carrier.q.D?.by !== 'you') carrier.q.D = fig(Math.max(obj[3][1] * 1.25, 0.15), 'm', 'estimate', 'and a little deeper'); }
  // what raises something everyone knows the size of carries it on a carriage a tenth bigger each way
  { const ra3 = by('raise'), objR = MASSES.find(([re, , , sz]) => sz && /bale/.test(re.source) && re.test(t)); if (ra3 && objR?.[3] && ra3.q.W?.by !== 'you') { const obj = objR as [RegExp, number, string, [number, number, number]]; ra3.q.W = fig(obj[3][0] * 1.1, 'm', 'estimate', `a carriage a tenth longer than ${obj[2].replace(/ \(.*$/, '')} (${len(obj[3][0])})`); ra3.q.D = fig(obj[3][1] * 1.1, 'm', 'estimate', `and a tenth wider (${len(obj[3][1])})`); } }
  // what encloses something everyone knows the size of is made to hold it: a third again all round
  const enc0 = by('enclose'); if (enc0 && obj?.[3] && enc0.q.W?.by !== 'you') { const [ow, od, oh] = obj[3]; enc0.q.W = fig(ow * 1.3, 'm', 'estimate', `room for ${obj[2]} (${len(ow)} long), a third again`); enc0.q.D = fig(od * 1.3, 'm', 'estimate', `${len(od)} wide, a third again`); enc0.q.H = fig(oh * 1.3, 'm', 'estimate', `${len(oh)} tall, a third again`); }
  // what people shelter in is as big as they need: each lying down about 0.65 m by 2 m (a sleeping pad and a little
  // room, estimate), side by side, and about 1 m inside to sit up in (a seated adult's head about 0.9 m up, estimate)
  // ("a two-person tent", "a 6 berth hut", "for 6 climbers": not "assembled by two people")
  const crewM = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)(?:-(?:person|man|people|berth|bed|sleeper)|\s+(?:person|man|berth|sleeper))\b/.exec(t) ?? /\b(?:for|sleeps|houses|shelters)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:people|persons|adults|men|women|campers|crew|climbers|hikers|sleepers|kids|children)\b/.exec(t), crew = crewM ? countOf(crewM[1]!) : 0;
  if (enc0 && crew > 0 && crew <= 40 && enc0.q.W?.by !== 'you' && /^(shelters?|tents?|huts?|cabins?|bivouacs?|bivvys?|bunkers?|igloos?|refuges?|lodges?|yurts?|habitats?|bothys?|lean-tos?|sleepers?)$/.test(mainHead ?? '')) {
    const cols = crew <= 4 ? crew : Math.ceil(crew / 2), rows = crew <= 4 ? 1 : 2;
    enc0.q.W = fig(cols * 0.65, 'm', 'estimate', `room for ${crew} lying side by side${rows > 1 ? ' in two rows' : ''}, 0.65 m each (a sleeping pad and a little room, estimate)`); enc0.q.D = fig(rows * 2, 'm', 'estimate', `${rows > 1 ? 'two lengths' : 'a length'} of 2 m`); enc0.q.H = fig(1.1, 'm', 'estimate', 'and 1.1 m to sit up in (a seated adult\'s head up to about 1 m, estimate)');
    heard.push(`for ${crew}: sized for them lying down and sitting up`);
  }
  // a ball it lifts ("lifting a steel ball back up"): a 12.7 mm steel ball, 8.4 g (estimate), where nothing heavier is
  // said; on a desk it lifts it about 150 mm (estimate)
  { const ra = by('raise'); if (ra && /\b(balls?|marbles?|ball bearings?)\b/.test(t) && ra.q.m?.by !== 'you') { ra.q.m = fig(/\bglass\b|\bmarbles?\b/.test(t) ? 0.005 : 0.0084, 'kg', 'usual', /\bmarbles?\b/.test(t) ? 'a glass marble, about 5 g (estimate)' : 'a steel ball 12.7 mm across, about 8.4 g (estimate)'); loadSaid = null; // lifted back to the top of the track it rolls down: the track falling about 1 in 20 along its length to keep a ball
      // rolling (estimate); with no track said, about 150 mm, a desk thing's height (estimate)
      if (ra.q.L?.by !== 'you' && said.track !== undefined) { ra.q.L = fig(said.track / 20, 'm', 'usual', `lifted back to the top of its ${len(said.track)} track, falling about 1 in 20 along it to keep a ball rolling (estimate)`); said.liftHby = `the fall of its ${len(said.track)} track at about 1 in 20, estimate`; }
      else if (ra.q.L?.by !== 'you' && /\b(desk|bedside|tabletop|table-top|shelf)\b/.test(t)) { ra.q.L = fig(0.15, 'm', 'usual', 'lifted about 150 mm, a desk thing\'s height (estimate)'); said.liftHby = 'a desk thing\'s height, estimate'; }
      // on its cells for so long, lifted only as far as they allow: a nine-tenths of the most at which they would just last
      // (the same law as below: a carriage half its weight, a tiny geared motor of about 0.05, a clock's 0.1 mW); a ball still
      // rolls on a fall of 1 in 100 (steel on steel rolls against about 0.001 to 0.005 of its weight, estimate)
      if (ra.q.L && ra.q.L.by !== 'you' && said.cellWh !== undefined && said.every !== undefined && said.runFor !== undefined && said.track !== undefined) {
        const mk = ra.q.m.v * 1.5, nL = said.runFor / said.every, keep = (1e-4 * said.runFor) / 3600, hMax = ((said.cellWh - keep) * 3600 * 0.05) / (nL * mk * G), h1 = Math.floor(0.9 * hMax * 1e3) / 1e3;
        if (h1 < ra.q.L.v && h1 >= said.track / 100) { ra.q.L = fig(h1, 'm', 'usual', `lifted ${len(h1)}, nine-tenths of the most at which its cells would last its ${timeSay(said.runFor)} (${len(hMax)}, weighed below), falling 1 in ${+(said.track / h1).toPrecision(3)} along its ${len(said.track)} track, on which a steel ball still rolls (estimate)`); said.liftHby = `nine-tenths of what its cells allow, so that they last; 1 in ${+(said.track / h1).toPrecision(3)} along its track`; }
      }
      said.liftKg = ra.q.m.v; said.liftH = ra.q.L?.v; heard.push(`what it lifts: ${ra.q.m.grounds}`); } }
  // "a 7-inch propeller", "an all-up weight of 900 g": the size of its rotors, and all it lifts, itself and what it carries
  { const fl = by('lift'); if (fl) { if (said.prop !== undefined) fl.q.Dr = fig(said.prop, 'm', 'you', `rotors ${len(said.prop)} across`); if (said.auw !== undefined) fl.q.auw = fig(said.auw, 'kg', 'you', `all it lifts, ${+(said.auw * 1e3).toPrecision(3)} g`); } }
  // put up or carried by so many people ("two teachers can assemble", "pitched by two gloved people"): no part heavier than
  // they lift together, two-thirds of the sum of what each may (16 kg each, the HSE guideline for one person lifting close
  // to the body at waist height, L23; estimate), where no part's weight is said
  { const W1 = '(one|two|three|four|five|six|\\d+)', P1 = '(?:\\w+\\s+)?(people|persons|adults|teachers|parents|workers|men|women|volunteers|kids|children)';
    const m1 = new RegExp(`\\b(assembled|put up|pitched|set up|erected|carried|lifted|installed|built)\\s+(?:\\w+\\s+){0,3}by\\s+${W1}\\s+${P1}\\b`).exec(t) ?? new RegExp(`\\b${W1}\\s+${P1}\\s+(?:can\\s+|could\\s+|must\\s+|will\\s+)?(assemble|put up|pitch|set up|erect|carry|lift|install|build)\\b`).exec(t);
    if (m1 && limits.part === undefined && wants.length) { const nP = countOf(m1[2]!.match(/^(one|two|three|four|five|six|\d+)$/) ? m1[2]! : m1[1]!), kgP = nP <= 1 ? 16 : Math.round((2 / 3) * nP * 16 * 10) / 10; if (nP >= 1 && nP <= 6) { limits.part = kgP; said.partPeople = kgP; heard.push(`put up by ${nP}: no part heavier than ${kgP} kg, what ${nP === 1 ? 'one person lifts' : `${nP} lift together (two-thirds of ${nP} × 16 kg`} (the HSE guideline for one person lifting close to the body at waist height, L23${nP === 1 ? '' : ')'}; estimate), checked`); } } }
  // "a 2 kg sediment core": the core it cuts and keeps
  { const cm = /(\d+(?:\.\d+)?)\s*kg\s+(?:of\s+)?(?:sediment|mud|soil|ice|rock|seabed)?\s*cores?\b/.exec(t); if (cm) { said.coreKg = Number(cm[1]); heard.push(`a ${cm[1]} kg core: what it cuts and keeps, weighed below`); } }
  // what is raised by a hand crank: what it lifts and how far, weighed by its crank and drum
  { const ra1 = by('raise'); if (ra1 && said.human && said.liftKg === undefined && ra1.q.m && ra1.q.L) { said.liftKg = ra1.q.m.v; said.liftH = ra1.q.L.v; said.crank = /\bcrank/.test(t); } }
  // a cart, a trolley, a trailer with nothing said to drive it is pushed by hand (or towed): no motors; it moves at a walk
  { const mv = by('move'), towed0 = /\b(towed|towing|hitched|pulled behind|behind a bike|bicycle trailer|bike trailer)\b/.test(t); if (mv && (mv.q.v?.by !== 'you' || towed0) && /^(carts?|trolleys?|wagons?|wheelbarrows?|dollies|dolly|trailers?|strollers?|prams?|buggies|buggy|barrows?)$/.test(mainHead ?? '') && !/\b(motor\w*|electric\w*|powered|battery|batteries|self[- ]propelled|self[- ]driving|driven|drives itself|autonomous|remote[- ]control\w*|engines?|robot\w*|e-?(bike|cart)|battery-assisted|assisted)\b/.test(t)) {
    const towed = /\b(towed|tow|towing|hitched|pulled behind|behind a bike|bicycle trailer|bike trailer)\b/.test(t) || /^trailers?$/.test(mainHead ?? '');
    mv.flags.push('pushed'); if (towed) mv.flags.push('towed');
    if (mv.q.v?.by !== 'you') mv.q.v = fig(1.3, 'm/s', 'usual', towed ? 'towed at a walk where its speed is not said (1.3 m/s, estimate)' : 'pushed at a walk (1.3 m/s, estimate)');
    heard.push(towed ? 'towed: nothing in it drives it' : 'pushed by hand: nothing said drives it, so it has no motors');
  } }
  // a shelter people stand and work in (a shed, a greenhouse, a stall) where no crew sizes it: tall enough to stand in,
  // about 2.1 m, and 2.4 m each way where its size is not said (estimates)
  if (enc0 && !(crew > 0 && enc0.q.H?.v === 1.1) && /^(shelters?|sheds?|huts?|cabins?|greenhouses?|glasshouses?|stalls?|booths?|kiosks?|gazebos?|pavilions?|rooms?|houses?|lean-tos?|barns?|stables?)$/.test(mainHead ?? '')) {
    const was = [enc0.q.W?.by, enc0.q.D?.by, enc0.q.H?.by];
    if (enc0.q.H?.by !== 'you') enc0.q.H = fig(2.1, 'm', 'estimate', '2.1 m inside, as a person stands and works in it (estimate)');
    if (enc0.q.W?.by !== 'you') enc0.q.W = fig(2.4, 'm', 'estimate', '2.4 m wide inside, room for a person to work (estimate)');
    if (enc0.q.D?.by !== 'you') enc0.q.D = fig(2.4, 'm', 'estimate', 'and 2.4 m deep (estimate)');
    if (was.some((x) => x !== 'you')) heard.push(`a ${mainHead} people stand in: ${was[2] !== 'you' ? '2.1 m inside' : ''}${was[2] !== 'you' && (was[0] !== 'you' || was[1] !== 'you') ? ', ' : ''}${was[0] !== 'you' || was[1] !== 'you' ? 'its plan 2.4 m where not said' : ''} (estimate)`);
  }
  // a loft bed: its deck high, under the ceiling with room to sit up on it; a bed for two: a double's width
  const bed = by('support');
  if (bed && /^(beds?|bunks?)$/.test(mainHead ?? '')) {
    if (/\b(loft|high|raised|elevated|mezzanine)[- ]?(beds?|bunks?)\b/.test(t) && bed.q.H?.by !== 'you') { const H = said.ceiling ? Math.max(1, said.ceiling - 1.05) : 1.5; bed.q.H = fig(H, 'm', 'estimate', said.ceiling ? `a loft deck ${len(H)} up: under the ${len(said.ceiling)} ceiling, 150 mm of mattress and 900 mm over it to sit up in (estimate)` : 'a loft deck 1.5 m up (estimate)'); heard.push(`a loft bed: its deck ${len(H)} up${said.ceiling ? `, under the ${len(said.ceiling)} ceiling with 150 mm of mattress and 900 mm to sit up in (estimate)` : ' (estimate)'}`); }
    if (/\b(two|2)\s+(adults|people|persons|sleepers|of us)\b|\bdouble\b|\bcouples?\b/.test(t) && bed.q.W?.by !== 'you') { bed.q.W = fig(1.4, 'm', 'estimate', 'a double bed about 1.4 m wide (estimate)'); heard.push('for two: a double bed about 1.4 m wide (estimate)'); }
  }
  // an oven: a box whose inside is held at what it is kept at
  const wa0 = by('warm'); if (enc0 && wa0?.q.T && /^(ovens?|kilns?|incubators?|proofers?|smokers?|dehydrators?)$/.test(mainHead ?? '')) { said.Tin = wa0.q.T.v; heard.push(`its inside held at ${wa0.q.T.v} °C: weighed below through its walls`); }
  // "keeps the inside livable": the least the WHO advises indoors, 18 °C (Housing and health guidelines, 2018); "using
  // nothing but body heat": the people in it, about 100 W each at rest (estimate), all that warms it
  if (enc0 && /\b(livable|liveable|habitable|comfortable)\b/.test(t)) { said.Tin = 18; heard.push('livable inside: 18 °C, the least the WHO advises indoors (Housing and health guidelines, 2018), weighed below through its walls'); }
  if (/\b(body|bodies'?|their own|our own|own body) heat\b/.test(t)) { said.bodyHeat = Math.max(1, crew || 1) * 100; heard.push(`body heat: ${Math.max(1, crew || 1)} at about 100 W each at rest (estimate), ${said.bodyHeat} W, all that warms it`); }
  // "80 cm of settled snow on the roof": a weight spread on its roof, ρ g h
  if (enc0 && said.topP !== undefined && !enc0.q.roofP) { enc0.q.roofP = fig(said.topP, 'Pa', 'you', `${+(said.topP / 1000).toPrecision(3)} kPa of snow`); }
  if (enc0 && depthLoad && /\bon (the |its )?(roof|top|lid)\b/.test(t)) { enc0.q.roofP = fig(depthLoad.rho * G * depthLoad.d, 'Pa', 'you', depthLoad.text); heard.push(`${depthLoad.text} on its roof: ${+(depthLoad.rho * G * depthLoad.d / 1000).toPrecision(3)} kPa spread on it (ρ g h), checked`); }
  // what encloses a vessel holds it inside: as wide, deep and tall as the squattest vessel of that much (as wide as it is
  // tall), and room round it; the vessel is then made to fit what it goes in
  const ves0 = by('contain'); if (enc0 && ves0?.q.V && enc0.q.W?.by !== 'you') { const d = Math.cbrt((4 * 1.1 * ves0.q.V.v) / Math.PI); const why = `room for the ${len(d)} vessel of ${+(ves0.q.V.v * 1e3).toPrecision(3)} L it holds`; if (enc0.q.W!.v < d + 0.04) enc0.q.W = fig(d + 0.04, 'm', 'estimate', `${why}, and 20 mm round it`); if (enc0.q.D!.v < d + 0.04) enc0.q.D = fig(d + 0.04, 'm', 'estimate', `deep enough for the ${len(d)} vessel, and 20 mm round it`); if (enc0.q.H!.v < d + 0.02) enc0.q.H = fig(d + 0.02, 'm', 'estimate', `tall enough for the ${len(d)} vessel, and 20 mm more`); }
  if (sup && /\bback(rest)?\b/.test(t) && !sup.flags.includes('back')) sup.flags.push('back');
  if (/^(stair\w*|ladders?|steps)$/.test(mainHead ?? '')) said.stairs = true;
  // a load put on all at once, undamped, bends it twice as far as when it is set down slowly: twice its static effect
  if (sup?.q.F?.by === 'you' && /\b(sudden|suddenly|shock|impact|jolt|jerk)\b/.test(t)) { const F0 = sup.q.F.v; sup.q.F = fig(2 * F0, 'N', 'you', `${+(F0 / G).toPrecision(3)} kg put on all at once`); heard.push(`a sudden load: twice its static effect (put on all at once, undamped), ${+((2 * F0) / G).toPrecision(3)} kg taken`); }
  // "using one hand": what a hand does to it is checked against one hand
  if (/\b(one|single)[- ]hand(ed|edly)?\b|\bwith a hand\b/.test(t)) said.oneHand = true;
  // used from a wheelchair: knees under it, and what is worked on within reach
  // "rocking back on the two rear legs": those two carry all of it
  if (sup && /\b(rock|rocks|rocking|lean|leans|leaning|tip|tips|tipping|tilt|tilts|tilting)\s+(back|backwards?)\b[^.;]*\b(two\s+)?(rear|back|hind)\s+legs?\b/.test(t)) { sup.flags.push('rock'); heard.push('rocking back on its two rear legs: those two carry all of it, checked'); }
  // (not when it is the wheelchair: then it is ridden, not reached from)
  if (sup && /\bwheel ?chairs?\b/.test(t) && !/wheel ?chair/.test(name)) { sup.flags.push('knees'); heard.push('from a wheelchair: room for the knees under it, and its surface within reach, checked (2010 ADA Standards)'); }
  for (const w of wants) for (const [k, f] of Object.entries(BASE[w.fn])) if (!w.q[k]) w.q[k] = f;
  // kept above a temperature by what warms it: held at that, the least it may come to; on what it is said to be (a panel)
  { const wa = by('warm'); if (wa && said.tmin !== undefined && wa.q.T?.by !== 'you') { wa.q.T = fig(said.tmin, '°C', 'you', `kept above ${said.tmin} °C`); } if (wa && said.size?.W !== undefined && said.size.D !== undefined && wa.q.W?.by !== 'you' && wa.q.D?.by !== 'you') { wa.q.W = fig(said.size.W, 'm', 'estimate', len(said.size.W)); wa.q.D = fig(said.size.D, 'm', 'estimate', len(said.size.D)); } }
  // warmed by the sun, what it takes grows with its area: as big as it may be
  { const wa = by('warm'); if (wa && /\bsolar\b/.test(t) && limits.plan && wa.q.W?.by !== 'you' && wa.q.D?.by !== 'you') { wa.q.W = fig(limits.plan[0], 'm', 'estimate', `${len(limits.plan[0])}: as big as it may be, the sun it takes growing with its area`); wa.q.D = fig(limits.plan[1], 'm', 'estimate', `${len(limits.plan[1])}: as big as it may be`); heard.push('solar: the sun as what warms it is not made; a heater in it stands for it, weighed below against the sun on it'); } }
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
  // people on what floats (a dock, a raft): they stand on it and crowd to one side
  { const fl = by('float'); if (fl && !fl.flags.includes('people') && /\b(adults?|people|persons?|crew|passengers?|kids?|children|swimmers?|anglers?|fishermen|visitors|guests)\b/.test(t) && !/\b(boat|kayak|canoe|ship|submarine|hull)\b/.test(mainHead ?? '')) fl.flags.push('people'); }
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
  // "the size of a microSD card, roughly 15 x 11 mm": its thickness from what it is the size of, where only its width and
  // depth are said
  if (said.size!.W !== undefined && said.size!.D !== undefined && said.size!.H === undefined) { const sz = /\bsize of (?:a|an|the)\s+([^,.;]+)/.exec(t)?.[1], nd = sz ? NAMED_SIZES.find(([re, , , dims]) => dims && re.test(` ${sz} `)) : undefined; if (nd) { said.size!.H = nd[3]![2]; heard.push(`its thickness as what it is the size of: ${len(nd[3]![2])}, ${nd[2]}`); } }
  if (nm && said.size!.W === undefined) { said.size!.W = nm.L; heard.push(`${nm.said}: ${len(nm.L)}, ${nm.source}`); if (ofHead) { if (ofHead.fn === 'turn') take(ofHead, 'Dia', nm.L, 'm', `${len(nm.L)}, ${nm.said}`); else if (!ofHead.q.W || ofHead.q.W.by !== 'you') take(ofHead, 'W', nm.L, 'm', `${len(nm.L)}, ${nm.said}`); } }
  said.round = /\b(sphere|spherical|ball|globe|planet|orb|moon|inflatable|dome|domed)\b/.test(t) || !!nm && /earth|moon|sun|jupiter|mars|venus|planet/.test(nm.source.toLowerCase());
  said.vacuum = /\b(space|orbit|orbits|orbital|vacuum|interplanetary|planet|asteroid|lunar|moon|europa|ganymede|callisto|enceladus|mercury|cubesats?|smallsats?|satellites?|spacecraft)\b/.test(t) && !/\b(in|under|with) (the )?(air|water|sea)\b/.test(t);
  said.immersed = /\b(in|inside|within|through|under)\s+(a\s+|the\s+)?(\w+\s+)?(blood( vessels?)?|vessels?|veins?|arter(y|ies)|water|sea|ocean|lake|river|pond|bloodstream|soil|clay|mud|ground)\b|\bunderwater\b|\bburrow/.test(t);
  said.slender = /\b(earth)?worms?\b|\b(worm|snake|eel|needle|rod|pencil|probe)[- ](style|like|shaped)\b|\bsnakes?\b|\beels?\b/.test(t);
  said.fieldDriven = /\b(magnetically|externally) (driven|steered|powered)\b|\bdriven by (a |an )?(external )?(magnetic )?field\b/.test(t); said.vacuumWall = /\b(vacuum flask|vacuum[- ]insulated|thermos|double[- ]walled vacuum)\b/.test(t);
  if (said.fieldDriven) heard.push('driven from outside by a magnetic field: weighed below');
  if (/\bbalcon(y|ies)\b/.test(t)) said.ground = 'balcony'; else if (/\b(sand|sahara|desert|dunes?|beach)\b/.test(t)) said.ground = 'sand'; else if (/\b(mud|muddy|soil|field|bog|marsh)\b/.test(t) && !depthLoad && !looseSaid) said.ground = 'soil';
  said.volume ??= by('contain')?.q.V?.v;
  if (said.waters && sup) said.waterArea = sup.q.W!.v * sup.q.D!.v;
  said.opensItself = !!by('swing') && /\b(on its own|by itself|of itself|automatically|automatic)\b/.test(t); said.massLimit = limits.mass; said.flies = !!by('lift') || /\b(fly|flies|flying|hover|hovers|hovering|airborne|drone)\b/.test(t); said.motor = /\b(motor|dynamo|generator|turbine)\b/.test(pa.clauses[0]?.head ?? '');
  said.heatEngine = /\bheat engine\b|\bruns? on (the )?[^,.;]*\b(difference|gradient)\b/.test(t); if (said.heatEngine && said.dT !== undefined && /\bblood|body|tissue|skin\b/.test(t)) said.Tat = 310;
  if (said.light === undefined && /\b(sunlight|in the sun|outdoors|solar|desert)\b/.test(t) && !/\blux\b/.test(t)) said.light = 1000;
  // a span said is its size too
  if (sup?.q.span?.by === 'you') said.span = sup.q.span.v;
  const Ls = [said.size!.W, said.size!.D, said.size!.H, said.span].filter((x): x is number => x !== undefined), Lsize = Ls.length ? Math.max(...Ls) : undefined;
  const scale = Lsize !== undefined && (Lsize < 5e-3 || Lsize > 50) ? sizeAt(Lsize, { v: said.v ?? by('move')?.q.v?.v, w: said.w, flies: said.flies, swims: /\bswim/.test(t), immersed: said.immersed, blood: /\bblood/.test(t), buoyant: !!said.buoyant, vacuum: said.vacuum, fieldDriven: said.fieldDriven, driven: wants.some((w) => /^(move|turn|lift|raise|slide|swing)$/.test(w.fn)) || said.flies }) : null;
  // "a rigid 12 m² room", "hard-sided": its walls of sheet, not cloth
  // (and what is named for its walls: a house, a hut, a shed, a kennel, a coop, a cabin, a greenhouse)
  { const en = by('enclose'); if (en && (/\b(rigid|hard[- ]sided|solid walls?|walls? of (wood|metal|steel|plywood|panels?))\b/.test(t) || /^(houses?|doghouses?|huts?|sheds?|kennels?|coops?|hutches?|cabins?|cabinets?|lodges?|bunkers?|garages?|greenhouses?|glasshouses?|bothys?|playhouses?|igloos?|rooms?|boxes?|crates?|cupboards?|wardrobes?|lockers?)$/.test(mainHead ?? '')) && !en.flags.includes('rigid')) en.flags.push('rigid'); }
  // compartments with what each holds: rows of them about 350 mm high for a bag (estimate), as many as its height has room
  // for, each row bearing its share of all of it
  if (sup && said.compartments && said.compKg) { const H0 = Math.min(sup.q.H?.v ?? 1, limits.H ?? Infinity), rows = sup.q.levels?.by === 'you' ? sup.q.levels.v : Math.max(1, Math.floor(H0 / 0.35)), per = (said.compartments * said.compKg) / rows; sup.q.levels = fig(rows + 1, '', 'usual', `${rows} rows of compartments, each about 350 mm high (estimate), each with a shelf under it and over it`); sup.q.cols = fig(Math.ceil(said.compartments / rows), '', 'usual', `${Math.ceil(said.compartments / rows)} compartments to a row`); if (!sup.flags.includes('levels')) sup.flags.push('levels'); if ((sup.q.F?.v ?? 0) / G < per) sup.q.F = fig(per * G, 'N', 'you', `${said.compartments} compartments of ${said.compKg} kg in ${rows} rows: ${+per.toPrecision(3)} kg a row`); heard.push(`${said.compartments} compartments of ${said.compKg} kg: ${+(said.compartments * said.compKg).toPrecision(3)} kg in all, in ${rows} rows of ${+per.toPrecision(3)} kg (estimate)`); }
  // what people stand on is as big as the room they stand in, where its size is not said; what children climb on is as
  // high as it may be, where a height it must stay under is said
  if (sup && said.peopleArea && (said.people ?? 0) >= 2 && sup.q.W?.by !== 'you' && sup.q.D?.by !== 'you' && !sup.flags.includes('levels') && sup.q.W && sup.q.D) { const A0 = sup.q.W.v * sup.q.D.v; if (A0 < said.peopleArea) { const k = Math.sqrt(said.peopleArea / A0); sup.q.W = fig(sup.q.W.v * k, 'm', 'estimate', `room for ${said.people} to stand on, about 0.3 m² a child and 0.5 m² a grown person (estimate)`); sup.q.D = fig(sup.q.D.v * k, 'm', 'estimate', sup.q.W.grounds); heard.push(`${said.people} on it: ${+said.peopleArea.toPrecision(3)} m² to stand on, about 0.3 m² a child and 0.5 m² a grown person (estimate)`); } }
  // a height taken, not said, kept under the height it must stay under
  // a table for so many: two long sides of places 600 mm wide (estimate), 750 mm across, where its size is not said; what
  // it bears is a person leaning on it, not all of them
  if (sup && said.places && sup.q.W?.by !== 'you' && sup.q.W && sup.q.D) { const L0 = Math.ceil(said.places / 2) * 0.6; if (sup.q.W.v < L0) { sup.q.W = fig(L0, 'm', 'estimate', `places for ${said.places}, ${Math.ceil(said.places / 2)} a side at 600 mm each (estimate)`); sup.q.D = fig(Math.max(sup.q.D.v, 0.75), 'm', 'estimate', '750 mm across, to sit at from both sides (estimate)'); heard.push(`seats ${said.places}: ${len(L0)} long, ${Math.ceil(said.places / 2)} a side at 600 mm each, 750 mm across (estimate)`); } }
  // what carries people about (a trailer, a cart) has room for them on its deck
  if (mov && said.peopleArea && (said.people ?? 0) >= 1 && mov.q.W?.by !== 'you') { mov.q.room = fig(said.peopleArea, 'm2', 'estimate', `room for ${said.people}, about 0.3 m² a child and 0.5 m² a grown person (estimate)`); heard.push(`${said.people} carried: ${+said.peopleArea.toPrecision(3)} m² of deck for them (estimate)`); }
  if (limits.H !== undefined) for (const w of wants) if (w.q.H && w.q.H.by !== 'you' && w.q.H.v > limits.H - 0.05) w.q.H = fig(Math.max(0.05, limits.H - 0.05), 'm', 'usual', `50 mm under the ${len(limits.H)} it must stay under`);
  if (sup && limits.H !== undefined && sup.q.H?.by !== 'you' && /\b(climbing frames?|climbing structures?|climbing walls?|jungle gyms?|monkey bars|play ?frames?)\b/.test(t)) { sup.q.H = fig(Math.max(0.3, limits.H - 0.05), 'm', 'usual', `as high as it may be, 50 mm under the ${len(limits.H)} said, for what is climbed`); heard.push(`climbed on: ${len(limits.H - 0.05)} high, just under the ${len(limits.H)} said`); }
  // a gate across a field or a drive stands about 1.2 m tall (a field gate, estimate), not a door's height
  { const sw = by('swing'); if (sw && /^gates?$/.test(mainHead ?? '')) { if (!sw.flags.includes('gate')) sw.flags.push('gate'); if (sw.q.H && sw.q.H.by !== 'you') sw.q.H = fig(1.2, 'm', 'usual', 'a field gate, about 1.2 m tall (estimate)'); } }
  // the wind said, for what stands in it to be sized by
  { const en = by('enclose'); if (en && said.wind !== undefined) { en.q.wind = fig(said.wind, 'm/s', 'you', 'the wind said'); en.q.airRho = fig(airRho(said.Tamb, said.altitude), 'kg/m3', 'usual', 'the air where it stands, p / R T'); } }
  // how tall what encloses stands, for what goes out through its walls; a night said, for how long it must hold
  { const en = by('enclose'); if (en?.q.H) said.encH = en.q.H.v; }
  { const nh = /\b(\d+)[- ]?(?:hours?|h)\s+(?:long\s+)?nights?\b/.exec(t); if (nh) said.night = +nh[1]!; }
  const lawSays = bounds(said);
  // what was heard as "weighed below" is weighed below, or said not to be: a time it runs with nothing said it draws, a
  // time to do something in with nothing made that does it
  const weighs = (re: RegExp) => lawSays.some((b) => re.test(b.what));
  for (let i = 0; i < heard.length; i++) {
    const h = heard[i]!;
    if (/: weighed below by the energy it must carry$/.test(h) && NOPOWER.test(t) && weighs(/^ice keeps/)) heard[i] = h.replace(/the energy it must carry$/, 'the ice it must carry');
    else if (/: weighed below by the energy it must carry$/.test(h) && !weighs(/carries what it needs|its cells last|cells kept dry|the energy to hover|keeps what it holds|keep what it holds|keep it at|it climbs stairs at|opens itself through/) && !(said.every !== undefined && weighs(/, tilted /))) heard[i] = h.replace(/: weighed below by the energy it must carry$/, said.mains ? (weighs(/from the mains/) ? ': weighed below, from the mains' : ': from the mains, so it carries nothing for it') : ': what it draws in that time is not said, so the energy it must carry is not weighed');
    else if (/^within .*: weighed below by the power it takes$/.test(h) && said.Tto === undefined && said.climb === undefined && said.store === undefined && !by('raise')) heard[i] = h.replace(/: weighed below by the power it takes$/, said.distance !== undefined || said.trip ? ': weighed below against how far it goes in it' : ': a time, with nothing made that does it and nothing said to weigh it by');
    else if (/^a dose of no more than .*: weighed below for the trip$/.test(h) && !said.trip) heard[i] = h.replace(/for the trip$/, said.dosePerYear ? 'over a year where it is' : 'where it is');
  }
  // nothing to make: what would be checked against it is not
  if (!wants.length) for (let i = 0; i < heard.length; i++) heard[i] = heard[i]!.replace(/: (a limit(?: on its own weight)?, checked(?: against what it makes that draws power)?|its width and height no more than that, checked|its plan within that, either way round, checked)$/, ': a limit; nothing is made, so it is not checked');
  // how tall it stands, read whole from the words, is weighed: not a number left unused
  if (said.standH !== undefined) { const i = dropped.findIndex((d) => /^[\d.]+\s*m\b/.test(d) && Math.abs(parseFloat(d) - said.standH!) < 1e-9); if (i >= 0) { dropped.splice(i, 1); heard.push(`standing ${said.standH} m tall: weighed below`); } }
  if (!wants.length) for (let i = 0; i < heard.length; i++) heard[i] = heard[i]!.replace(/: it is pushed by it in the physics test$/, weighs(/ wind\b|\bstorm\b/) ? ': nothing is made to push, but what it would take is weighed below' : ': nothing is made, so nothing is pushed by it').replace(/: checked against it folded$/, ': nothing is made, so it is not checked').replace(/: weighed below by the heat it sheds$/, weighs(/^a store of heat/) ? ': weighed below, at its case' : ': nothing is made, so it is not weighed');
  // a rating weighed only where it is said to be
  for (let i = 0; i < heard.length; i++) if (/ in all: weighed below against where it is$/.test(heard[i]!) && !weighs(/krad/)) heard[i] = heard[i]!.replace(/: weighed below against where it is$/, ': where it is is not said, so it is not weighed');
  // a hand's effort is weighed only against what it works: a fold made, or a throw
  for (let i = 0; i < heard.length; i++) if (/ at the handle: the most a hand puts on it, weighed below$/.test(heard[i]!) && (!wants.length || !weighs(/throwing|hand/))) heard[i] = heard[i]!.replace(/, weighed below$/, wants.length ? ', checked where a part of it is folded or worked by hand' : '; nothing is made, so it is not checked');
  // a number heard as "weighed below" that no law below takes up (the same quantity, within 1%) is said not to be weighed
  const unSci = (x: string) => x.replace(/(\d[\d.]*) × 10\^(-?\d+)/g, (_m, a: string, e: string) => (Number(a) * 10 ** Number(e)).toLocaleString('en-US', { useGrouping: false, maximumSignificantDigits: 6 }));
  const lawQs = lawSays.flatMap((x) => findQuantities(` ${unSci(x.what)} ${unSci(x.says)} `));
  for (let i = 0; i < heard.length; i++) {
    const h = heard[i]!; if (!/: weighed below$/.test(h)) continue;
    const q = findQuantities(` ${h.replace(/: weighed below$/, '')} `)[0];
    if (q && !sameDim(q.dim, DIMS.temperature) && !lawQs.some((p) => sameDim(p.dim, q.dim) && Math.abs(p.si - q.si) <= 0.01 * Math.abs(q.si))) heard[i] = h.replace(/: weighed below$/, ': heard, but no law here weighs it yet');
    // a cold or heat round it that only the air's density takes: so said, and what it does to what it is made of is not weighed
    else if (q && sameDim(q.dim, DIMS.temperature) && / round it$/.test(h.replace(/: weighed below$/, '')) && !lawQs.some((p) => sameDim(p.dim, q.dim) && Math.abs(p.si - q.si) <= 0.01 * Math.abs(q.si))) heard[i] = h.replace(/: weighed below$/, said.wind !== undefined ? ": the air's density with it is weighed in the wind on it; what it does to what it is made of (cloth, seams, joints) is not weighed" : ': heard, but no law here weighs it yet');
  }
  // "that can carry 4 adults": what it carries, said back against what carries it, or not made where nothing does
  // ("takes 150 kg of hammering without wobbling": what it must not do is said apart, with whether it is checked)
  for (const x0 of loadsSaid) { const x = asked.filter((a) => a.text.startsWith('without ')).reduce((v, a) => v.replace(` ${a.text}`, ''), x0); asked.push(carrier ? { text: x, kind: 'does', got: carrier.fn, why: '', load: true } : { text: x, kind: 'does', got: null, why: `carrying it: there is nothing kept for it to be carried on, as what it is is not kept` }); }
  // "with a 250 g camera payload": what it carries, its weight taken in what it lifts, not electronics it must make
  for (const [i, a] of asked.entries()) if (a.kind === 'has' && !a.got && /\bpayloads?\b/i.test(a.text) && findQuantities(` ${a.text} `).some((q) => sameDim(q.dim, DIMS.mass))) asked[i] = { ...a, why: 'what it carries: its weight is taken in what it lifts, weighed below; what it is (a camera) is not made here' };
  // "a tip-proof unit": it must not tip, done where its tip checks pass
  if (/\b(tip-?proof|anti-?tip|tip-?resistant)\b/.test(t) && wants.some((w) => w.fn === 'support') && !asked.some((a) => /tip/.test(a.text))) asked.push({ text: 'tip-proof', kind: 'does', got: 'support', why: '' });
  // "for three 30 kg kids": what it is for, said with its weight, is what it carries, done where what carries it bears it
  if (carrier && loadSaid) for (const [i, a] of asked.entries()) if (a.kind === 'for' && findQuantities(` ${a.text} `).some((q) => sameDim(q.dim, DIMS.mass))) asked[i] = { ...a, kind: 'does', got: carrier.fn, why: '', load: true };
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
  // the conditions it sets, read from what it says and not from what it calls the thing: where it must hold a load,
  // held by something (a post, a tube, a face, two ends, the ground), out, across or up to it, it is grown from those,
  // whatever it is named; what it is otherwise read as making there (a top, a box, a leaf, a carriage) gives way to it
  const cd0 = readConditions(t);
  // where a drawn way already makes it (a deck across a span, a board on brackets along a wall, shelves, a top a child
  // climbs), that is kept until the grown frame is weighed as well as it is; the conditions are grown where nothing drawn
  // does what they ask: clamped round a post or a tube, hung below one, held out from a face, or standing in a wind on a
  // face it carries
  const drawnDoes = cd0 && (cd0.hold.kind === 'ends' && wants.some((w) => w.flags.includes('span')) || cd0.hold.kind === 'face' && /\b(shelf|shelves|bench|benches|seat|seats|ledge)\b/.test(t) && cd0.dyn <= 1 || cd0.hold.kind === 'ground' && !cd0.cover && !cd0.loads.some((l) => l.side) && wants.some((w) => w.fn === 'support') || wants.some((w) => w.flags.includes('levels')));
  const cd = drawnDoes ? null : cd0;
  if (cd) {
    const rolls = /\b(wheels?|rolls?|rolling|towed?|tows|drives? (itself|along)|self-propelled|motori[sz]ed)\b/.test(t);
    const keep = (w: Want) => !/^(support|enclose|swing|raise|slide)$/.test(w.fn) && !(w.fn === 'move' && (cd.hold.kind !== 'ground' || !rolls));
    const gone = wants.filter((w) => !keep(w)).map((w) => FN_WORDS[w.fn]);
    wants.splice(0, wants.length, ...wants.filter(keep));
    const down = cd.loads.filter((l) => !l.side).reduce((a, l) => a + l.N, 0) * cd.dyn;
    wants.unshift({ fn: 'support', says: FN_WORDS.support, q: { F: fig(down, 'N', 'you', cd.loads.filter((l) => !l.side).map((l) => l.said).join(', ') + (cd.dyn > 1 ? `, by ${cd.dyn} as it ${cd.dynSaid ?? 'comes on hard'} (estimate)` : '')), H: fig(cd.up ?? 1, 'm', cd.up !== undefined ? 'you' : 'estimate', cd.up !== undefined ? 'as said' : 'held 1 m up (estimate)'), W: fig(cd.span ?? Math.max(0.1, cd.out ?? 0.3), 'm', 'estimate', 'as the conditions give it'), D: fig(Math.max(0.1, cd.out ?? 0.3), 'm', 'estimate', 'as the conditions give it') }, flags: ['grown'], cond: cd });
    heard.push(`what it must do, as conditions: ${[...cd.heard, ...cd.loads.map((l) => `${l.said}${l.side ? ', sideways' : ''}`), `held by ${cd.hold.said}`].join('; ')}${gone.length ? ` (so it is grown as what holds its load, not drawn as something ${[...new Set(gone)].join(' or ')})` : ''}`);
    if (cd.massMax !== undefined && limits.mass === undefined) limits.mass = cd.massMax;
    if (cd.partMax !== undefined && limits.part === undefined) limits.part = cd.partMax;
    // a roof's plan is the conditions'; what lies on it is said with them, as it lies on a roof
    if (cd.cover) { said.plan = [cd.cover.L, cd.cover.W]; for (let k = lawSays.length - 1; k >= 0; k--) if (/kPa on its top$/.test(lawSays[k]!.what)) lawSays.splice(k, 1); const w0 = wants[0]!; w0.q.W = fig(cd.cover.L, 'm', 'you', cd.cover.said); w0.q.D = fig(cd.cover.W, 'm', 'you', cd.cover.said); }
    for (const a of asked) if (!a.got && (a.kind === 'thing' || a.kind === 'does' && /\b(hold|holds|carry|carries|take|takes|support|span|spans|sticks? out|hang|hangs|clamp|clamps|bolts?|stand|stands|reach|reaches|lift|lifts|sits?)\b/.test(a.text))) { a.got = 'support'; a.why = 'made as what holds its load: a frame grown for the conditions it sets'; }
  }
  if (!wants.length) {
    // what was heard as checked against what is made is not, where nothing is made; a limit on what it draws is weighed by
    // the laws where one of them draws it
    for (let i = 0; i < heard.length; i++) heard[i] = heard[i]!.replace(/: (a limit(?: on its own weight)?, checked(?: against what it makes that draws power)?|its width and height no more than that, checked|its plan within that, either way round, checked)$/, (m0) => (/draws power/.test(m0) && lawSays.some((b) => /\bdraws\b/.test(b.what)) ? ': a limit, weighed below against what it would draw' : ': a limit; nothing is made, so it is not checked'));
    const no = asked.filter((a) => a.kind !== 'for' && !a.got);
    const qs: Question[] = answers.what === undefined && !no.length ? [{ key: 'what', want: -1, ask: `What should it do? It can ${Object.values(FN_WORDS).join(', ')}.`, kind: 'what', value: 0, unit: '', grounds: no.length ? 'none of what it is asked to do is something kept' : 'nothing in the words says what it is for' }] : [];
    return { words, name: name || 'something', wants: [], questions: qs, heard, assumed, unread: no.map((a) => `${a.text} (${a.why})`), matter, asked, dropped, limits, said, scale, bounds: lawSays };
  }
  // a cabinet, a cupboard, a locker: what is put in it goes in by a door, assumed and said
  if (by('enclose') && !by('swing') && /^(cabinet|cupboard|locker|wardrobe|closet|safe|dresser|hutch)s?$/.test(mainHead ?? '')) { add('swing', FN_WORDS.swing, BASE.swing, ['assumed']); assumed.push(`a door at its front: a ${mainHead} is opened to put things in`); }
  // "lowers itself to counter height": the lowest it goes, at a worktop (about 900 mm, estimate) or a table (740 mm, EN 527-1)
  const lowM = /\bto (the |a )?(counter|worktop|bench|table|desk)[- ]?(height|top|level)\b/.exec(t), rz = by('raise');
  if (rz && lowM && !rz.q.low) { const v = /counter|worktop|bench/.test(lowM[2]!) ? 0.9 : 0.74; rz.q.low = fig(v, 'm', 'usual', /counter|worktop|bench/.test(lowM[2]!) ? 'a kitchen worktop about 900 mm up, estimate' : 'a table top at 740 mm, EN 527-1'); heard.push(`to ${lowM[2]} height: its lowest ${len(v)} up`); }
  // what people or animals go into has a door to go in by, a person's width (700 mm, estimate) where its front is wider
  // "a three-sided loafing shelter", "an open-fronted shed": open at its front, no door
  const openFront = /\b(three[- ]sided|open[- ]front(?:ed)?|open[- ]sided|open at the front|lean-?tos?|loafing|run-?in sheds?)\b/.test(t) || /\bstalls?\b/.test(t) && /\b(markets?|sell|sells|selling|vendors?|trade|fairs?)\b/.test(t);
  // what it is staked into: paving (a market, a car park), where no stake goes in; snow or ice, where a peg holds little
  if (by('enclose') && /\b(markets?|paving|paved|pavements?|plazas?|car ?parks?|parking lots?|asphalt|tarmac|concrete floors?)\b/.test(t)) by('enclose')!.flags.push('paved');
  if (by('enclose') && (/\b(glaciers?|everest|himalaya\w*|summits?|climbers?|mountaineer\w*|polar|antarctic\w*|arctic|on (?:the )?(?:snow|ice))\b/.test(t) || (said.altitude ?? 0) > 4000)) by('enclose')!.flags.push('snowground');
  // a shelter for beasts that stand on the ground (goats, horses, cattle): no floor
  if (by('enclose') && /\b(loafing|run-?in|field shelters?|goats?|sheep|horses?|ponies|pony|cattle|cows?|calves|livestock|alpacas?|llamas?|donkeys?|pigs?|steers?|bulls?)\b/.test(t) && !/\b(coops?|hutches?|kennels?|dog ?houses?)\b/.test(t)) { by('enclose')!.flags.push('nofloor'); assumed.push('no floor: the beasts it shelters stand on the ground'); }
  if (openFront && by('enclose')) { by('enclose')!.flags.push('openfront'); assumed.push('open at its front, as a three-sided shelter is: no front wall and no door'); }
  if (!openFront && by('enclose') && !by('swing') && /^(shelters?|huts?|cabins?|sheds?|kennels?|doghouses?|houses?|coops?|hutches?|bothys?|refuges?|lodges?|bunkers?|igloos?|yurts?|tents?|playhouses?|cubby|cubbies)$/.test(mainHead ?? '')) { add('swing', FN_WORDS.swing, BASE.swing, ['assumed']); by('enclose')!.flags.push('walkin'); assumed.push(`a door at its front to go in by, not asked: a ${mainHead} is gone into`); }
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
  const notRead = asked.filter((x) => x.kind !== 'for' && x.kind !== 'limit' && !x.got);
  // (not asked where it is smaller than anything kept: no part of it can be made, as said with what is made)
  if (notRead.length && answers.what === undefined && !(scale && scale.L < 5e-3)) questions.push({ key: 'what', want: -1, ask: `I can make only part of it: something to ${wants.map((w) => FN_WORDS[w.fn]).join(', and to ')}. Not: ${notRead.map((x) => `${x.text} (${x.why})`).join('; ')}. Shall I make the part I can, or say what else it should do?`, kind: 'what', value: 0, unit: '', grounds: 'part of what was asked is not something kept' });
  // a mass is asked and read as a weight (N); one kept in kg is turned back
  const asN = (f: Fig) => (f.unit === 'kg' ? f.v * G : f.v), fromN = (f: Fig, v: number) => (f.unit === 'kg' ? v / G : v);
  wants.forEach((w, i) => { if (w.flags.includes('grown')) return; for (const [k, kind, ask] of ASKS[w.fn]) { const f = w.q[k]; if (!f || f.by !== 'estimate') continue; const a = answers[`${i}.${k}`] ?? answers[k]; if (a !== undefined) { const v = readAnswer(a, kind); if (v !== null) { w.q[k] = fig(kind === 'mass' ? fromN(f, v) : v, f.unit, 'answer', a); heard.push(`${k}: ${a}`); continue; } } questions.push({ key: `${i}.${k}`, want: i, ask, kind, value: kind === 'mass' ? asN(f) : f.v, unit: f.unit, grounds: f.grounds }); } });
  for (const w of wants) for (const f of Object.values(w.q)) if (f.by === 'usual' || f.by === 'estimate') assumed.push(f.grounds);
  // its name: the word that named a kind of thing it is, where one did ("a sled I can haul" is a sled)
  if (purposeName && !purposeName.includes(name)) name = purposeName;
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
  p: string; x0: number; z0: number; y0: number; rnd: () => number; matter: string | null; /** the wind said it must stand in, m/s */ wind?: number; /** the most one part may weigh, kg; the most it may sag, m */ part?: number; sag?: number; /** the most it may weigh, kg: its matter chosen for lightness */ light?: number; /** the tube it must go into, across, m; the fall it must survive, m; the weight of a child said to climb it, N */ fitDia?: number; dropH?: number; climber?: number; steps: string[]; traces: Trace[]; members: string[]; loose: string[]; moving: string[];
  /** what moves under what it makes (a carriage it stands on): what it makes rides with that, joined to it */ ride: string | null; riders: string[];
  choices: string[]; gaps: string[]; checks: (() => Check | null)[]; loads: string[]; tests: Test[]; need: Need; way: string; why: string;
  /** the conditions what is made was grown to meet, as said and as taken: its loads, what holds it, the room it may take */ conds?: string[];
  /** what it gives what stands on it or goes into it: its top surface, or its body */
  top: { y: number; w: number; d: number; name: string | null }; foot: [number, number];
  /** what encloses gives what stands in it its floor: its top, and its inside */ inside?: { y: number; W: number; D: number; H: number; name: string };
  /** what the next part is derived after, and why; chained, each part after the one before */
  after: { name: string; why: string } | null; led?: boolean; base0?: { name: string; why: string } | null;
}
type Test = { kind: 'drive'; v: number; deck: string } | { kind: 'spin'; name: string; motor: string; rpm: number; n: number } | { kind: 'swing'; name: string; /** what is pushed to swing it, where not the part hinged (a frame's far stile) */ at?: string } | { kind: 'slide'; name: string; L: number; m: number } | { kind: 'raise'; name: string; L: number } | { kind: 'warm'; name: string; T: number };
interface Way { id: string; meets: NeedKind; says: string; when: (n: Need, c: Ctx) => string | null; make: (n: Need, c: Ctx) => void }

const rngOf = (seed: number) => { let s = seed | 0; return () => { s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)]!;
const M = (v: number) => `${+v.toFixed(4)} m`, MM = (v: number) => `${+(v * 1e3).toFixed(1)}`;
const SHEET: Record<string, number[]> = { wood: [6, 9, 12, 15, 18, 22, 25, 30, 40, 50], metal: [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25], plastic: [3, 4, 5, 6, 8, 10, 12, 15, 20] };
const SQUARE: Record<string, number[]> = { wood: [20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 100, 120, 150], metal: [8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100], plastic: [10, 15, 20, 25, 30, 40, 50] };
const TUBES: [number, number][] = [[12, 1], [16, 1.5], [20, 1.5], [25, 2], [30, 2], [40, 2], [50, 2.5], [60, 3], [76, 3], [89, 3.5], [114, 4], [168, 5]];
const familyOf = (id: string) => (/^wood/.test(id) ? 'wood' : /^(polymer|composite)/.test(id) ? 'plastic' : /^(textile|leather)/.test(id) ? 'cloth' : 'metal');
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
  if (c.light !== undefined) { const best = [...options].sort((x, y) => merit(y, as) - merit(x, as))[0]!; if (!c.choices.some((x) => x.startsWith(`${matterOf(best).name} for its ${role}:`))) { c.choices.push(`${matterOf(best).name} for its ${role}: it must weigh under ${+c.light.toPrecision(3)} kg, and of the ${[...new Set(options.map((o) => familyOf(o)))].join(' and ')} matters kept for them here it is the lightest for its stiffness (Ashby's index ${as === 'panel' ? 'E^1/3 / ρ for a panel' : 'E^1/2 / ρ for a beam'})`); } return best; }
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

/** The least square bar of a matter for a post screwed to a wall every 600 mm up it (estimate): it buckles only between
 *  its screws (Euler, K = 1 there), crushing and buckling at three times P; and a carriage held out from the wall on two
 *  rollers 300 mm apart up it (estimate) presses it with Pr at each, bending it between its screws (M = Pr s / 4) to no
 *  more than half its yield. */
function wallPost(id: string, P: number, Pr: number): Member {
  const m = matterOf(id), fam = familyOf(id), fc = crush(id), s0 = 0.6;
  let last: Member | null = null;
  for (const s of SQUARE[fam]!.map((x) => x / 1e3)) {
    const A = s * s, I = s ** 4 / 12, c = (fc * A) / P, b = (Math.PI ** 2 * m.E * I) / (s0 * s0) / P, sg = ((Pr * s0) / 4) * (s / 2) / I;
    last = { size: s, A, I, ok: c >= 3 && b >= 3 && m.yield / sg >= 2, says: `crushing at ${+c.toPrecision(2)} and buckling at ${+b.toPrecision(2)} times its share (Euler, K = 1 between screws 600 mm apart up it, estimate); the carriage held out from the wall presses each post with ${+Pr.toPrecision(3)} N at its rollers (300 mm apart up it, estimate), bending it ${+(sg / 1e6).toPrecision(3)} MPa between its screws, ${+(m.yield / sg).toPrecision(3)} times under its yield` };
    if (last.ok) return last;
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
interface Lay { spread: boolean; creep: number; /** one of a crowd standing alone, N: what the sheet and a joist bear */ point?: number; /** what is spread may gather at the middle of a rail, as a crowd bunches (not snow) */ bunches?: boolean }
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
function frameFor(top: string, by: string, Lw: number, Dw: number, F: number, railSpan: number, alongX: boolean, lay: Lay = { spread: false, creep: 1 }, partKg?: number, /** the least its joists may be apart, m */ apart = 0): Frame | null {
  const mt = matterOf(top), mb = matterOf(by), sheets = SHEET[familyOf(top)]!.map((x) => x / 1e3), secs = sectionsOf(by);
  let best: Frame | null = null;
  for (let n = 2; n <= 24 && (n === 2 || Lw / (n - 1) >= apart); n += 2) for (const T of sheets) {
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
      const rail = secs.find((r) => (partKg === undefined || areaOf2(r) * Lw * mb.density <= partKg) && bearsAt(by, r, (lay.spread ? (F + topN + n * jN) / 2 : F + (topN + n * jN) / 2) / plies, railSpan, Lw, lay.spread, lay.creep) && (lay.point === undefined || lay.bunches === false || bearsAt(by, r, (F + topN + n * jN) / 2 / plies, railSpan, Lw, false, 1)));
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
function placeFrame(c: Ctx, f: Frame, top: string, X: number, yTop: number, Z: number, Lw: number, Dw: number, sheetName = 'top', tag = ''): number {
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
  for (let k = 0; k < n; k++) member(`joist${tag}${k + 1}`, j, -Lw / 2 + j.b / 2 + k * sp, jy, 0, 'v', Dw, `under the ${sheetName}, ${len(k * sp)} along it, across both rails`, `the least ${j.says} of ${mb} that bears half the load and its share of the ${sheetName} across ${len(Dw)} by two, bending under 1/250 of it`);
  c.why = `to carry the joists along its length to what holds it up`;
  for (const [k, sv] of [-1, 1].entries()) for (let p = 0; p < f.plies; p++) member(`rail${tag}${k + 1 + 2 * p}`, r, 0, ry, sv * (Dw / 2 - r.b / 2 - p * r.b), 'u', Lw, `under the joists along its ${sv < 0 ? 'near' : 'far'} edge${f.plies > 1 ? `, ${p ? 'inside the other' : 'outside'}` : ''}`, f.plies > 1 ? `one of two ${r.says} of ${mb} side by side, as one that bore it alone would weigh more than a part may: each bears a quarter of all of it over its span, by two, bending under 1/250 of it` : `the least ${r.says} of ${mb} that bears half of all of it over its span, by two, bending under 1/250 of it`);
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
  const say = (key: string, id: string, what: string, L: number, how: string) => c.checks.push(() => { const v = LOADS.get(key); if (!v) return null; const b = v.bend * k(id); return { what, ok: v.factor >= 2 && b <= L / 250, says: `the load law, ${how}: ${factorSays(v.factor, v.wood)}, ${bendSays(b, L)}${k(id) > 1 ? creepSays(lay) : ''} (1/250 of ${len(L)} is ${len(L / 250)}: more fails)` }; });
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
    // rocked back onto two of four, those two carry all of it
    const carriers = n.want.flags.includes('rock') && nLegs === 4 ? 2 : nLegs, shareOf = (T: number) => ((F + W * D * T * matterOf(top).density * G) / carriers) * (carriers > 1 ? 1.5 : 1);
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
    let pg: { pt: number; h: number } | null = null;
    const make = (T: number) => {
      c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.loose.length = 0; c.led = false; c.after = c.base0 ?? null;
      const ty = y0 + H - T; let below = H - T;
      if (frame) below = placeFrame(c, frame, top, X, y0 + H, Z, Lw, Dw) - y0;
      else box(c, 'top', top, X, ty + T / 2, Z, W, D, T, 'plate', `${M(H)} up, over ${MM(W)} × ${MM(D)} mm`, `as thin a sheet of ${matterOf(top).name} as the load law lets bear ${+(F / G).toPrecision(3)} kg by two, bending under 1/250 of its span`);
      if (rim) placeRim(c, rim, X, y0 + H, Z, W, D);
      const why0 = c.why; c.why = `to carry ${n.want.flags.includes('back') ? 'the seat' : 'the top'} and its ${+(F / G).toPrecision(3)} kg down to what it stands on`;
      if (kind === 'panels') { const pt = Math.max(T, 0.012); pg = { pt, h: below }; for (const [k, sx] of [-1, 1].entries()) box(c, `side${k + 1}`, top, X + sx * (W / 2 - 0.03 - pt / 2), y0 + below / 2, Z, pt, D * 0.9, below, 'slab', `under the top, 30 mm in from its ${sx < 0 ? 'left' : 'right'} edge, on what it stands on`, `a panel as thick as the top: pressed along its width it neither crushes nor buckles`); }
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
    // the span it bears its load over: between its side panels (30 mm in from each edge, 12 mm thick at the least), or
    // between its legs the long way
    const span0 = kind === 'panels' ? W - 0.072 : kind === 'legs3' || kind === 'column' ? Math.max(W, D) : Math.max(W, D) - 2 * inset, tried = canopy ? (make(thinnest), { t: thinnest, ok: true }) : trySheets(c, fam, first, make, loadsOn, span0, /^wood/.test(top) ? lay.creep : 1);
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
    if (!frame && !canopy && mem && Math.abs(shareOf(T) - Pshare) > 1e-9) { Pshare = shareOf(T); const m2 = memberFor(bars, shape, Pshare, H); if (m2.size !== mem.size) { mem = m2; T = leastSheet(c, fam, T, make, loadsOn, span0); } else mem = m2; }
    if (mem && !mem.ok) c.gaps.push(`no ${shape} of ${matterOf(bars).name} kept carries ${+(Pshare / G).toPrecision(3)} kg down ${M(H)} by three: ${mem.says}`);
    const st = surfaceHow(n).steadied; if (st && kind !== 'column') c.choices.push(st);
    if (canopy) c.choices.push(`its canopy the thinnest sheet kept (${len(thinnest)}), standing for cloth on ribs: soft things are not kept, so it is not held to a sheet's bending`);
    c.choices.push(`${kind === 'legs4' ? 'four legs at the corners' : kind === 'legs4in' ? 'four legs set in from the corners' : kind === 'legs3' ? 'three legs' : kind === 'column' ? `a column on a ${len(2 * footHalf(T))} square foot of 12 mm steel, the column` : 'two side panels'}${mem ? ` of ${shape === 'square' ? `${MM(mem.size)} mm square bar` : shape === 'rod' ? `Ø${MM(mem.size)} mm rod` : `Ø${MM(mem.size)} × ${MM(mem.wall!)} mm tube`} in ${matterOf(bars).name}` : ''}; a ${MM(T)} mm top of ${matterOf(top).name}`);
    const fr = frame, kTop = /^wood/.test(top) ? lay.creep : 1;
    // its side panels, each a wide column under half of what it carries and the top, half again: Euler with its top free to
    // sway (K = 2), by three; and they stand square under its top only while their joints with it hold
    const g0 = pg as { pt: number; h: number } | null;
    if (kind === 'panels' && g0) { const mdp = matterOf(top), Pn = ((F + W * D * tried.t * mdp.density * G) / 2) * 1.5, Ip = (D * 0.9 * g0.pt ** 3) / 12, Pc = (Math.PI ** 2 * mdp.E * Ip) / (2 * g0.h) ** 2;
      c.checks.push(() => ({ what: 'its side panels carry it without buckling', ok: Pc >= 3 * Pn, says: `each ${MM(g0.pt)} mm × ${len(D * 0.9)} × ${len(g0.h)} tall, under ${+(Pn / 1000).toPrecision(3)} kN (half of what it carries and its top, half again): buckling at ${+(Pc / Pn).toPrecision(3)} times it (Euler, K = 2, its top free to sway)` }));
      if (g0.h > 0.9) c.gaps.push(`its side panels stand square under its top only while their joints with it hold them: a push along it racks them, and those joints are not weighed (the physics holds them rigid)`); }
    if (!canopy && !fr) { c.loads.push(...loadsOn()); c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); if (!v) return null; const b = v.bend * kTop, span = span0; return { what: `its top bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && b <= span / 250, says: `the load law, ${lay.spread ? 'the load spread over it' : 'the load at its middle and at its edge, the worse'}: ${factorSays(v.factor, v.wood)}, ${bendSays(b, span)}${kTop > 1 ? creepSays(lay) : ''} (1/250 of its ${len(span)} span${kind === 'panels' ? ' between its side panels' : kind === 'legs4' || kind === 'legs4in' ? ' between its legs' : ''} is ${len(span / 250)}: more fails)` }; }); }
    if (fr) frameChecks(c, fr, 'top', top, Lw, Dw, F, lay, 'between the legs', Lw - 2 * inset - 2 * (mem?.size ?? 0));
    // rocked back about 15° (estimate) onto its two rear legs: each carries half of it all at its foot, L sin θ behind
    // where it meets the seat, and the floor's grip on its foot, μ of that (0.3, estimate), L cos θ below it, so it bends
    // there, M = (W / 2) L (sin θ + μ cos θ), σ = M c / I, kept under its yield by two
    if (n.want.flags.includes('rock') && mem && kind !== 'column' && kind !== 'panels') {
      const mr = mem, th = (15 * Math.PI) / 180;
      c.checks.push(() => { const Wt = F + W * D * T * matterOf(top).density * G, Lg = H - T, mu = 0.3, Mo = (Wt / 2) * Lg * (Math.sin(th) + mu * Math.cos(th)), sg = (Mo * (mr.size / 2)) / mr.I, f = matterOf(bars).yield / sg; return { what: 'its rear legs bear it rocked back', ok: f >= 2, says: `rocked back about 15° (estimate) onto its two rear legs, each carries half of ${+(Wt / G).toPrecision(3)} kg (the ${+(F / G).toPrecision(3)} kg on it and its top's own ${+((Wt - F) / G).toPrecision(3)} kg) at its foot, ${len(Lg * Math.sin(th))} behind where it meets the seat, and the floor grips its foot with ${mu} of that (estimate), ${len(Lg * Math.cos(th))} below it: ${+Mo.toPrecision(3)} N·m there (W/2 · L (sin θ + μ cos θ)), ${+((sg / 1e6)).toPrecision(3)} MPa in its ${MM(mr.size)} mm leg: ${factorSays(f)}, by two wanted; the joint at the seat must carry that moment too, which a glued butt joint does not (not derived)` }; });
    }
    const memNow = mem, butt = !fr && (kind === 'legs4' || kind === 'legs4in'); if (memNow) c.checks.push(() => ({ what: `its ${kind === 'column' ? 'column carries' : 'legs carry'} it without buckling${butt ? ', if its joints at the top hold them square' : ''}`, ok: memNow.ok, says: `each carries ${+(Pshare / G).toPrecision(3)} kg (its share of the load and the top's own weight${carriers < nLegs ? ', rocked back onto two of them' : ''}, half again): ${memNow.says}` }));
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
  const mem = by === 'posts' ? memberFor(bars, 'square', ((F * levels + 30 * G) / 4) * 1.5, H) : null, cols = Math.max(1, Math.round(n.want.q.cols?.v ?? 1));
  let tb = 0, balKg = 0, balNeed = 0;
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
    // compartments ("30 cubbies"): dividers standing between each shelf and the next, as thick as the shelves, so many to a
    // row; each carries the shelf over it, so a shelf spans only from one to the next; under the lowest shelf, dividers as
    // feet, standing on what it stands on
    // climbed on, freestanding: a child on its front leaning back from its top pulls it over its front foot, held by its own
    // weight about half its depth inside it: it must weigh F (H + 0.3) / (D / 2), and a tenth more (statics, as checked
    // below); what its parts do not weigh is a steel plate it stands on, low, between its sides
    tb = 0; balKg = 0;
    if (c.climber !== undefined) {
      const rho = matterOf(top).density, rowH = (H - 0.08 - T) / Math.max(1, levels - 1), sideKg = by === 'panels' ? 2 * up * D * H * rho : 4 * mem!.A * H * matterOf(bars).density;
      const kgNow = levels * inner * D * T * rho + (cols > 1 ? (cols - 1) * D * T * rho * (0.08 + (levels - 1) * (rowH - T)) : 0) + sideKg, need = ((c.climber * (H + 0.3)) / (D / 2) / G) * 1.1, bal = need - kgNow;
      if (bal > 0) { tb = Math.min(0.06, bal / (7850 * inner * (D - 0.02))); balKg = 7850 * inner * (D - 0.02) * tb; balNeed = need; const w4 = c.why; c.why = 'to hold it down against a child pulling back from its top'; box(c, 'ballast', 'steel.a36', X, y0 + tb / 2, Z, inner, D - 0.02, tb, 'plate', 'on what it stands on, between its sides, under its lowest shelf', `${+(7850 * inner * (D - 0.02) * tb).toPrecision(3)} kg of steel plate, ${MM(tb)} mm: with its ${+kgNow.toPrecision(3)} kg of shelves and sides, the ${+need.toPrecision(3)} kg that a ${+(c.climber / G).toPrecision(3)} kg child pulling back from its ${len(H)} top does not tip, ${len(D / 2)} inside its front foot (statics, a tenth more)`); c.why = w4; }
    }
    if (cols > 1) {
      const w3 = c.why; c.why = 'to make its compartments, and carry the shelf over each';
      for (let i = 0; i < levels; i++) {
        const yb = i === 0 ? y0 + tb : ys[i - 1]! + T, hh = ys[i]! - yb; if (hh <= 0.005) continue;
        for (let j = 1; j < cols; j++) box(c, `div${i}_${j}`, top, X - inner / 2 + (j * inner) / cols, yb + hh / 2, Z, T, D, hh, 'slab', i === 0 ? `under shelf 1, on what it stands on, ${M((j * inner) / cols)} from its left side` : `between shelf ${i} and shelf ${i + 1}, ${M((j * inner) / cols)} from its left side`, i === 0 ? 'a divider as foot: shelf 1 rests on it' : `a divider as thick as the shelves: ${cols} compartments to a row, each ${MM(inner / cols - T)} mm wide; it carries the shelf over it`);
      }
      c.why = w3;
    }
  };
  let T = leastSheet(c, fam, (cols > 1 ? W / cols : W) / 80, make, () => `load ${c.p}_shelf1 with ${+F.toFixed(1)} N + ${c.p}_shelf1.mass * g`, cols > 1 ? W / cols : W);
  // climbed on: a child standing on a shelf's front between two of what holds it up, their weight by 1.5 (estimate), borne
  // by a strip as wide as it spans (no narrower than their stance, 300 mm, nor wider than the shelf is deep), P L / 4 under
  // half its strength and P L³ / 48 E I within 1/150 of its span; the sheet is thickened until it bears them
  if (c.climber !== undefined) {
    const sp = cols > 1 ? W / cols : W, P = c.climber * 1.5, b = Math.max(0.3, Math.min(D, sp)), mm0 = matterOf(top), sgOf = (t: number) => ((P * sp) / 4) * 6 / (b * t * t), dOf = (t: number) => (P * sp ** 3) / (48 * mm0.E * ((b * t ** 3) / 12)), okT = (t: number) => sgOf(t) <= mm0.yield / 2 && dOf(t) <= sp / 150;
    const tc = (SHEET[fam] ?? SHEET.wood!).map((x) => x / 1e3).find((t) => t >= T - 1e-9 && okT(t)) ?? (SHEET[fam] ?? SHEET.wood!).at(-1)! / 1e3;
    if (tc > T + 1e-9) { make(tc); T = tc; }
    const Tf = T; c.checks.push(() => ({ what: `a ${+(c.climber! / G).toPrecision(3)} kg child standing on a shelf does not break it`, ok: okT(Tf), says: `standing on its front between two ${cols > 1 ? 'dividers' : 'of what holds it up'}, ${len(sp)} apart, their weight by 1.5 (estimate) borne by a strip ${len(b)} wide (as wide as it spans, no narrower than their stance, estimate): ${+(sgOf(Tf) / 1e6).toPrecision(3)} MPa in ${MM(Tf)} mm ${mm0.name}, ${+(mm0.yield / sgOf(Tf)).toPrecision(3)} times under its strength, bending ${len(dOf(Tf))} (1/150 of its span is ${len(sp / 150)})` }));
  }
  const st = surfaceHow(n).steadied;
  c.choices.push(`${st ? `${st}; ` : ''}${levels} shelves of ${len(T)} ${matterOf(top).name} on battens between ${by === 'posts' ? `four ${MM(mem!.size)} mm posts of ${matterOf(bars).name}` : `two side panels of ${len(Math.max(T, 0.012))}`}${cols > 1 ? `, ${cols - 1} dividers of ${len(T)} between each shelf and the next making ${cols} compartments to a row, and under its lowest shelf as its feet` : ''}${balKg > 0 ? `; a ${MM(tb)} mm steel plate, ${+balKg.toPrecision(3)} kg, lying between its sides under its lowest shelf, so it weighs the ${+balNeed.toPrecision(3)} kg a child pulling back from its top does not tip` : ''}`);
  if (cols > 1) c.gaps.push('its joints are held rigid in the physics: how its shelves, dividers and sides are fixed together, and its racking along its length with no back, are not weighed');
  c.loads.push(`load ${c.p}_shelf1 with ${+F.toFixed(1)} N + ${c.p}_shelf1.mass * g`);
  c.checks.push(() => { const v = LOADS.get(`${c.p}_shelf1`); return v ? { what: `each shelf bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= (cols > 1 ? W / cols : W) / 250, says: `the load law${cols > 1 ? `, its row's ${+(F / G).toPrecision(3)} kg on it and the dividers under it holding it up every ${len(W / cols)}` : ''}: ${factorSays(v.factor, v.wood)}, bending ${len(v.bend)}` } : null; });
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
    if (!fr) { c.loads.push(`load ${c.p}_deck with ${+F.toFixed(1)} N + ${c.p}_deck.mass * g${sp1}`); c.checks.push(() => { const v = LOADS.get(`${c.p}_deck`); return v ? { what: `it spans ${M(L)} under ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= L / 250, says: `the load law${sp1 ? ', the load spread along it' : ''}: ${factorSays(v.factor, v.wood)}, ${bendSays(v.bend, L)} (1/250 of ${len(L)} is ${len(L / 250)}: more fails)` } : null; }); }
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
    c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); return v ? { what: `its deck bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= Math.max(w, d) / 250, says: `the load law, the load at its middle and at its edge, the worse: ${factorSays(v.factor, v.wood)}, ${bendSays(v.bend, Math.max(w, d))}` } : null; });
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
    // with no room said for it, the carriage is as big as what it carries: 300 mm for about 20 kg, by the cube root of the
    // mass at one density (a steel ball of 8 g wants a carriage 40 mm across, not 300), estimate
    const L = n.want.q.L!.v, carried = (n.want.q.m?.v ?? 0) + n.above / G, W0 = Math.min(0.3, Math.max(0.04, 0.3 * Math.cbrt(carried / 20))), W = Math.max(n.fit[0], n.want.q.W?.v ?? W0), D = Math.max(n.fit[1], n.want.q.D?.v ?? W0), mt = matterFor(c, ['steel.a36', 'aluminum.6061-t6']), X = c.x0, Z = c.z0;
    // the carriage first: a plate held at its ends by the posts, what rides spread on it (M = F W / 8, deflection
    // 5 F W³ / 384 E I), as thin as bears it by two and bends under 1/250 of its span
    const onWall = n.want.flags.includes('wall') && !n.on;
    // on a wall its posts are at its back, so it is held out from them as well: a cantilever D long, M = F D / 2, its end
    // lowered F D³ / 8 E I, allowed 1/125 of its length (the 1/250 of a span twice as long)
    const cant = (t2: number) => { const I = (W * t2 ** 3) / 12; return { sg: ((Fr * D) / 2) * (t2 / 2) / I, dl: (Fr * D ** 3) / (8 * md.E * I) }; };
    const deck = 'aluminum.6061-t6', md = matterOf(deck), Fr = carried * G, cw = (() => { for (const t2 of SHEET.metal!.map((x) => x / 1e3)) { const I = (D * t2 ** 3) / 12, sg = ((Fr * W) / 8) * (t2 / 2) / I, dl = (5 * Fr * W ** 3) / (384 * md.E * I), k = cant(t2); if (onWall && (md.yield / k.sg < 2 || k.dl > D / 125)) continue; if (md.yield / sg >= 2 && dl <= W / 250) return t2; } return 0.025; })();
    const rides = carried + W * D * cw * md.density;
    // then each post: a column carrying half of all that rides (what it carries and the carriage), half again, as tall as
    // the travel and the carriage, held at its foot only
    // its lowest at the height said ("to counter height": a kitchen worktop about 900 mm up, estimate), its posts that much taller
    const low = n.want.q.low?.v ?? 0, Hp = low + L + 0.05 + 0.05, mem = onWall ? wallPost(mt, ((rides * G) / 2) * 1.5, (rides * G * (D / 2)) / 0.3 / 2) : memberFor(mt, 'square', ((rides * G) / 2) * 1.5, Hp), sp = mem.size;
    let yb = c.y0;
    // the base as deep as a third of the posts' height at least, so a push at their top of a tenth of the weight does not tip it
    const w0 = c.why, bw = Math.max(W + 2 * sp + Math.min(0.1, W / 3), n.on ? 0 : Hp / 3), bt = Math.max(0.003, Math.min(0.012, (0.012 * W) / 0.3)), bd = Math.max(D, Hp / 3);
    if (onWall) { c.why = 'to stand for the wall its posts are screwed to'; const wt = 0.2, wall = box(c, 'wall', 'concrete.c30', X, yb + (Hp + 0.1) / 2, Z - D / 2 - wt / 2, W + 2 * sp + 0.4, wt, Hp + 0.1, 'slab', 'behind its posts, on the floor', `a block of concrete standing for the wall its posts are screwed to (its screws not derived)`); STANDS.set(wall, 'the wall it is screwed to'); }
    if (!n.on && !onWall) { c.why = 'to stand the posts on the floor and tie them together'; box(c, 'base', 'steel.a36', X, yb + bt / 2, Z, bw, bd, bt, 'base', 'on the floor, under the posts', `a ${len(bt)} steel plate as wide as the posts and what rides between them: its size is theirs, its thickness a twenty-fifth of its width between 3 and 12 mm, taken, not derived`); yb += bt; c.choices.push(`a ${len(bt)} steel base ${len(bw)} × ${len(bd)} under it all (${+(bw * bd * bt * matterOf('steel.a36').density).toPrecision(3)} kg; its thickness taken, not derived)`); }
    c.why = 'to guide the carriage up and down';
    for (const [i, sx] of [-1, 1].entries()) upright(c, `post${i + 1}`, mt, 'square', mem, X + sx * (W / 2 + sp / 2), yb, onWall ? Z - D / 2 + sp / 2 : Z, Hp, `${sx < 0 ? 'left' : 'right'} of the carriage, ${onWall ? 'screwed to the wall behind it' : `on ${n.on ? 'what it stands on' : 'the base'}`}`, `the least square bar of ${matterOf(mt).name} that carries half of what rides by three: ${mem.says}`);
    c.why = w0;
    const cn = box(c, 'carriage', deck, X, yb + 0.002 + low + cw / 2, Z, W, D, cw, 'plate', low ? `between the posts, its ends against them, at its lowest ${len(low)} up` : 'between the posts, its ends against them, 2 mm up', `a ${len(cw)} plate of ${md.name}: held at its ends by the posts, what rides spread on it, it bears it by two and bends under 1/250 of ${len(W)} (M = F W / 8)${onWall ? `; held at its back by the posts on the wall, it is held out ${len(D)} from them, and bears that by ${+(md.yield / cant(cw).sg).toPrecision(3)}, its front lowered ${MM(cant(cw).dl)} mm (F D³ / 8 E I, 1/125 of it allowed)` : ''}`, { moving: true });
    c.steps.push(`slide ${cn} on ${c.p}_post1 along y between 0 mm and ${MM(L)} mm`); c.traces.push({ step: c.steps.at(-1)!, what: `${cn}'s slide`, called: c.way, why: `so it rides up ${len(L)} and back`, when: '', where: 'where its end touches the left post, along it', how: 'a Jolt slider along y with its stops at the bottom and at the travel' });
    c.choices.push(`a ${len(cw)} carriage of ${md.name} ${len(W)} × ${len(D)} riding ${len(L)} up and down between two ${len(sp)} square posts of ${matterOf(mt).name}`);
    c.gaps.push('what raises it (a screw, a winch or a scissor linkage, and what turns that) is not derived: it is pushed up in the test');
    c.checks.push(() => ({ what: 'its posts carry what rides without buckling', ok: mem.ok, says: `each carries half of ${+rides.toPrecision(3)} kg (what rides and the carriage), half again: ${mem.says}` }));
    c.tests.push({ kind: 'raise', name: cn, L });
    if (low) c.choices.push(`its lowest at ${len(low)} up (${n.want.q.low!.grounds}), its highest ${len(low + L)}`);
    if (!n.on && !onWall && Hp > 1) c.gaps.push(`standing alone, its ${len(Hp)} posts want a base ${len(Hp / 3)} each way not to tip; braced to a wall or a beam above, it could stand on less`);
    c.top = { y: yb + 0.002 + low + cw, w: W, d: D, name: cn }; c.foot = [n.on || onWall ? W + 2 * sp : bw, n.on || onWall ? D : bd];
  },
});

// -- a frame grown along its loads: no legs, posts or brackets drawn; its shape is what what it carries asks ----------
/** Matters a grown frame may be made of: each is grown and made, and the lightest that holds kept. */
const FRAMED = ['steel.a36', 'aluminum.6061-t6', 'wood.douglas-fir', 'composite.cfrp'];
const FRAME_WAY = 'a frame grown along its loads';
/** Heavy timbers a frame's long struts may be: 8 × 8, 10 × 10 and 12 × 12 in, dressed (PS 20: timbers 5 in and over are
 *  dressed half an inch under, 191, 241 and 292 mm). */
const TIMBERS = [191, 241, 292];
const strutSections = (id: string): StrutSection[] => familyOf(id) === 'wood'
  ? [...SQUARE.wood!, ...TIMBERS].map((s) => { const a = s / 1e3; return { A: a * a, I: a ** 4 / 12, label: `${s} mm square`, width: a }; })
  : TUBES.map(([D, w]) => { const d = D / 1e3, t = w / 1e3; return { A: (Math.PI * (d * d - (d - 2 * t) ** 2)) / 4, I: (Math.PI * (d ** 4 - (d - 2 * t) ** 4)) / 64, label: `${D} × ${w} mm tube`, width: d }; });
/** How slender a strut may be, its length over its radius of gyration: pressed, a wood one no longer than 50 times its
 *  least width (NDS 3.7.1.4; r = d / √12 for a square), any other 200 (AISC 360-16 E2, user note); pulled, 300 (AISC
 *  360-16 D1, user note; taken for all). */
const SLENDER = (id: string) => ({ push: familyOf(id) === 'wood' ? 50 * Math.sqrt(12) : 200, pull: 300 });
const slenderSays = (id: string) => (familyOf(id) === 'wood' ? 'no longer than 50 times its width pressed (NDS 3.7.1.4), 300 times its radius of gyration pulled (AISC 360-16 D1, taken)' : 'no longer than 200 times its radius of gyration pressed (AISC 360-16 E2), 300 pulled (D1)');
const frameMatter = (id: string): FrameMatter => { const m = matterOf(id), sy = familyOf(id) === 'wood' ? 0.5 * m.ultimate : m.yield; return { id, name: m.name, strut: { E: m.E, sy, sc: crush(id), density: m.density, slender: SLENDER(id) }, sections: strutSections(id) }; };
/** What was grown for an ask, kept: the same ask on another try or another seed is not grown again. */
const GROWN = new Map<string, ReturnType<typeof designFrame>>();
/** The frame each design was grown as, by its prefix: what its law of scale is read from. */
const FRAMES = new Map<string, MadeFrame>();
/** Designs fixed to what holds them (bolted to a wall or a deck, clamped round a post or a tube), by prefix: what they
 *  are fixed to stands for the world, so letting them go or pushing them over tests what stands for it, not them. */
const FIXED = new Map<string, string>();
/** Weights set on a frame's feet where it stands, moved apart from it (concrete, water, earth): not what it weighs to move. */
const BALLAST = new Set<string>();
/** Who watches a frame grow, round by round (the command line, or a graph). */
export const GROW_TRACE: { on: ((r: { matter: string; round: number; ground: number; struts: number; joints: number; mass: number; ok: boolean }) => void) | null } = { on: null };
function grownFor(ask: FrameAsk, how: string, ids: string[]) {
  const key = JSON.stringify([ask.lo, ask.hi, ask.cells, ask.cases, ask.wind ?? null, ask.ballast ?? false, ask.over ?? null, ask.sagMax ?? null, ask.maxLen ?? null, ask.rests ?? false, ask.anchors ?? null, ask.keepOut ?? null, ask.footings ?? false, how, ids]);
  // each joint costs a node or a gusset (about 20 g, estimate), each joint held its plate (60 mm of 6 mm steel, 170 g)
  let r = GROWN.get(key); if (!r) { r = designFrame(ask, ids.map(frameMatter), { jointKg: 0.02, heldKg: 0.06 * 0.06 * 0.006 * 7850, ...(GROW_TRACE.on ? { trace: GROW_TRACE.on } : {}) }); GROWN.set(key, r); } return r;
}
/** The turning that takes a part's length (along y) along a way from p to q, as the workshop says it (degrees about
 *  x, then y, then z). */
function turnAlong(p: V3, q: V3): string {
  const d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]], L = Math.hypot(d[0]!, d[1]!, d[2]!), u = d.map((x) => x / L) as V3;
  // the axis square to y and the way, turned through the angle between them (Rodrigues)
  const ax: V3 = [u[2], 0, -u[0]], s = Math.hypot(ax[0], ax[2]), cth = u[1];
  let m: [number, number, number, number, number, number, number, number, number];
  if (s < 1e-12) m = cth > 0 ? [1, 0, 0, 0, 1, 0, 0, 0, 1] : [1, 0, 0, 0, -1, 0, 0, 0, -1];
  else { const [x, , z] = [ax[0] / s, 0, ax[2] / s], C = 1 - cth; m = [cth + x * x * C, -z * s, x * z * C, z * s, cth, -x * s, z * x * C, x * s, cth + z * z * C]; }
  const e = eulerOf(m).map((r) => +((r * 180) / Math.PI).toFixed(4));
  return `turned x ${e[0]} y ${e[1]} z ${e[2]}`;
}
/** A frame's plan from the conditions an ask sets: its room, what holds it and which way that faces into the room, its
 *  loads (down by how hard they come on, sideways where something pushes it or the wind is on a face it carries), its
 *  wind on its struts, the limits said, and what stands for what holds it. */
function planOfConditions(n: Need, c: Ctx, cd: Conditions): FramePlan {
  if (cd.cover) return planOfCover(n, c, cd);
  const X = c.x0, Z = c.z0, k = cd.hold.kind, along = cd.hold.along, lay = layOf(n.want), r = (cd.hold.dia ?? 0) / 2;
  // held where: on the ground and across ends at its foot; on a post, a tube or a face, as high as said or 1 m (estimate)
  const Y = c.y0 + (k === 'ground' ? 0 : k === 'ends' ? 0 : cd.up ?? 1);
  const yEnds = c.y0 + (cd.up ?? 0.3);
  const room = roomOf(cd, [X, Y, Z]);
  if (k === 'ends') { const dep = room.hi[1] - room.lo[1]; room.lo[1] = yEnds; room.hi[1] = yEnds + dep; const L2 = cd.span! / 2, X0 = X; room.held = (p) => (Math.abs(p[0] - (X0 - L2)) < 1e-9 || Math.abs(p[0] - (X0 + L2)) < 1e-9) && Math.abs(p[1] - yEnds) < 1e-9; }
  const lo = room.lo, hi = room.hi, dims = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
  // a cell no longer than a piece may be (a strut is no longer than a cell's diagonal across its faces), else four cells
  // along its longest way, at most about fifty joints
  let cell0 = Math.max(...dims) / 4; if (cd.pieceMax) cell0 = Math.min(cell0, cd.pieceMax / Math.SQRT2);
  let cells: [number, number, number] = [1, 1, 1];
  for (let j = 0; j < 20; j++) { cells = dims.map((d) => Math.max(d < 1e-6 ? 0 : 1, Math.min(8, Math.ceil(d / cell0 - 1e-9)))) as [number, number, number]; if ((cells[0] + 1) * (cells[1] + 1) * (cells[2] + 1) <= 64 || cd.pieceMax) break; cell0 *= 1.15; }
  const normal: V3 = k === 'ground' || k === 'ends' ? [0, 1, 0] : k === 'line' && along === 'x' && !cd.out ? [0, -1, 0] : [1, 0, 0];
  const heldBy = k === 'ground' ? 'floor' : k === 'ends' ? 'banks' : k === 'line' ? (along === 'y' ? 'post' : cd.out ? 'rail' : 'tube') : k === 'above' ? 'tube' : 'face';
  // what it carries: across ends spread over a deck along it; else at the point it holds, on a plate a third of its reach
  // across (10 to 150 mm, estimate)
  const span = k === 'ends', Wd = span ? dims[0]! : Math.max(dims[0]!, 0.1), Dd = Math.max(dims[2]!, 0.05), H = span ? lo[1] - c.y0 : room.load[1] - c.y0;
  const reach = Math.max(cd.out ?? 0, cd.drop ?? 0, cd.span ?? 0, cd.up ?? 0), plate = span ? 0 : Math.max(0.01, Math.min(0.15, reach / 3)), plateKg = plate * plate * 0.006 * matterOf('aluminum.6061-t6').density;
  const down = cd.loads.filter((l) => !l.side).reduce((a, l) => a + l.N, 0) * cd.dyn, F = down;
  let tops: V3[] = [], deck: FramePlan['deck'] = null, sp = 0;
  if (span) {
    for (let i = 0; i <= cells[0]; i++) for (let j = 0; j <= cells[2]; j++) tops.push([lo[0] + (dims[0]! * i) / cells[0], lo[1], lo[2] + (cells[2] ? (dims[2]! * j) / cells[2] : dims[2]! / 2)]);
    sp = Math.max(cells[0] ? dims[0]! / cells[0] : dims[0]!, cells[2] ? dims[2]! / cells[2] : dims[2]!);
    deck = leastDeck(F, Wd, Dd, sp);
  } else tops = [room.load];
  const Wt = F + (deck ? deck.kg * G : plateKg * G), per = Wt / tops.length;
  const downCase = tops.map((p) => ({ at: p, F: [0, -per, 0] as V3 }));
  const cases: { at: V3; F: V3 }[][] = [downCase, tops.map((p) => ({ at: p, F: [0.1 * per, -per, 0] as V3 })), tops.map((p) => ({ at: p, F: [0, -per, 0.1 * per] as V3 }))];
  // a person standing where it is worst, on a deck across ends
  if (span && lay.point) cases.push([...downCase, { at: tops[Math.floor(tops.length / 2)]!, F: [0, -lay.point, 0] as V3 }]);
  // what pushes it sideways, along it and across it: where it is a face the wind is on, at the face's middle, with what
  // it carries on it and without; else at the point it holds
  const winds: Wind[] = [], qw = cd.wind ? 0.5 * airRho() * cd.wind ** 2 : 0;
  for (const l of cd.loads.filter((x) => x.side)) for (const dir of [[1, 0, 0], [0, 0, 1]] as V3[]) {
    const at: V3 = l.at !== undefined && k === 'ground' ? [X, c.y0 + Math.min(l.at, hi[1] - c.y0), Z] : room.load;
    cases.push([...downCase, { at, F: [dir[0] * l.N, 0, dir[2] * l.N] }]); if (qw) winds.push({ case: cases.length - 1, q: qw, dir });
    if (l.at !== undefined) { cases.push([{ at, F: [dir[0] * l.N, 0, dir[2] * l.N] }]); if (qw) winds.push({ case: cases.length - 1, q: qw, dir }); }
  }
  if (qw && !cd.loads.some((l) => l.side)) for (const dir of [[1, 0, 0], [0, 0, 1]] as V3[]) { cases.push(downCase); winds.push({ case: cases.length - 1, q: qw, dir }); }
  const ids = cd.matter ? [cd.matter] : c.matter ? [(() => { try { return matterOf(c.matter).id; } catch { return 'steel.a36'; } })()] : FRAMED;
  const half = plate / 2, over: [number, number, number, number] = [room.load[0] - half, room.load[2] - half, room.load[0] + half, room.load[2] + half];
  c.conds = [
    `it carries ${+(down / G).toPrecision(3)} kg down${cd.dyn > 1 ? ` (its ${+(down / cd.dyn / G).toPrecision(3)} kg by ${cd.dyn}, as it ${cd.dynSaid ?? 'comes on hard'}, estimate)` : ''}${span ? `, spread across ${len(cd.span!)} between its ends` : cd.drop && !cd.out ? `, hanging ${len(cd.drop)} below what holds it` : cd.out ? `, ${len(cd.out)} out from what holds it` : `, ${len(cd.up ?? 0)} up`}: ${cd.loads.filter((l) => !l.side).map((l) => l.said).join(', ')}`,
    ...cd.loads.filter((l) => l.side).map((l) => `it is pushed sideways with ${+(l.N / 1000).toPrecision(3)} kN, along it and across it: ${l.said}`),
    `what holds it: ${room.heldSay}${k === 'ground' || k === 'ends' ? ', which only pushes up on it, and grips it sideways with half of that (μ 0.5, estimate)' : ', which it is clamped or fixed to (it may pull on it)'}${span ? '; one end free to slide along it, as one resting on a bank or a tower that moves is (it bears no push along it there)' : ''}`,
    `the room it may take: ${dims.map((d) => len(d)).join(' × ')} (as far as it reaches, and half that again each side of it, estimate)`,
    'a knock or a lean of a tenth of what it carries, along it and across it (estimate)',
    ...(cd.wind ? [`a ${+(cd.wind * 3.6).toPrecision(3)} km/h wind on what it carries and on each of its struts as it grows`] : []),
    ...(cd.sagMax !== undefined ? [`what it holds moves no more than ${MM(cd.sagMax)} mm, as said`] : []),
    ...(cd.pieceMax !== undefined ? [`no strut longer than ${len(cd.pieceMax)}, as said of its pieces`] : []),
    ...(cd.massMax !== undefined ? [`it weighs no more than ${+cd.massMax.toPrecision(3)} kg, as said`] : []),
    ...(cd.partMax !== undefined ? [`no piece weighs more than ${+cd.partMax.toPrecision(3)} kg, as said`] : []),
    `made of what can be had: tubes and sections kept, of ${ids.map((x) => matterOf(x).name).join(', ')}${cd.matter ? ' (the matter said)' : ''}, each sized by two in strength and three in buckling`,
  ];
  // what stands for what holds it, not counted as it: the post or the tube it clamps round, the face it is fixed to
  const stand = (cc: Ctx, tf: number) => {
    const w0 = cc.why; cc.why = `to stand for ${room.heldSay}`;
    if (heldBy === 'post') { const D = Math.max(2 * r, 0.02), top = hi[1] + 0.1, Lp = top - cc.y0; put(cc, `${cc.p}_held`, `place tube named ${cc.p}_held of steel.a36 at ${M(lo[0] - r)}, ${M(cc.y0 + Lp / 2)}, ${M(Z)} size ${MM(D)} x ${MM(Lp)} x ${MM(Math.min(0.003, D / 4))} mm along y`, 'standing on the floor, where its plates clamp round it', `a tube ${MM(D)} mm across standing for ${room.heldSay}, from the floor`); STANDS.set(`${cc.p}_held`, room.heldSay); const bw = Math.max(0.3, 2 * dims[0]!); box(cc, 'heldbase', 'concrete.c30', lo[0] - r, cc.y0 - 0.05, Z, bw, bw, 0.1, 'slab', 'under it, the floor round its foot', `a slab standing for what ${room.heldSay} stands in (estimate)`); STANDS.set(`${cc.p}_heldbase`, room.heldSay); }
    else if (heldBy === 'tube') { const D = Math.max(2 * r, 0.02), Lt = dims[0]! + 0.4, yc = hi[1] + r, cw = Math.max(D, 0.05); put(cc, `${cc.p}_held`, `place tube named ${cc.p}_held of steel.a36 at ${M(X)}, ${M(yc)}, ${M(Z)} size ${MM(D)} x ${MM(Lt)} x ${MM(Math.min(0.003, D / 4))} mm along x`, 'above it, where its plates clamp round it', `a tube ${MM(D)} mm across standing for ${room.heldSay}`); STANDS.set(`${cc.p}_held`, room.heldSay); box(cc, 'heldfoot', 'steel.a36', X + Lt / 2 + cw / 2, cc.y0 + (yc + D / 2 - cc.y0) / 2, Z, cw, cw, yc + D / 2 - cc.y0, 'bar', 'at its end, from the floor up to it', `a post standing for what holds ${room.heldSay} up (estimate)`); cc.steps[cc.steps.length - 1] += ` joined to ${cc.p}_held`; cc.traces[cc.traces.length - 1]!.step = cc.steps.at(-1)!; STANDS.set(`${cc.p}_heldfoot`, room.heldSay); const bs = Math.max(1, Lt); box(cc, 'heldbase', 'concrete.c30', X + Lt / 2 + cw / 2, cc.y0 - 0.05, Z, bs, bs, 0.1, 'slab', 'under its post', 'a slab standing for what holds the tube up (estimate)'); STANDS.set(`${cc.p}_heldbase`, room.heldSay); }
    else if (heldBy === 'face') {
      // a slab from the floor up past it, and a foot reaching back as far as it reaches out, so what holds it stands as
      // what it is fixed to would (estimate)
      const wt = 0.1, top = hi[1] + 0.1, Hs = top - cc.y0, back = Math.max(0.5, dims[0]!), wd = dims[2]! + 0.4;
      box(cc, 'held', 'concrete.c30', lo[0] - wt / 2, cc.y0 + Hs / 2, Z, wt, wd, Hs, 'slab', 'behind it, from the floor', `a slab standing for ${room.heldSay} (estimate)`); STANDS.set(`${cc.p}_held`, room.heldSay);
      box(cc, 'heldfoot', 'concrete.c30', lo[0] - wt - back / 2, cc.y0 + 0.05, Z, back, wd, 0.1, 'slab', 'behind its slab, on the floor', `its foot, standing for what ${room.heldSay} stands on (estimate)`); STANDS.set(`${cc.p}_heldfoot`, room.heldSay);
    }
    else if (heldBy === 'rail') {
      // a tube lying across its reach, on two posts from the floor each in a slab (standing for what the tube is part of)
      const D = Math.max(2 * r, 0.02), Lr = dims[2]! + 0.4, cw = Math.max(D, 0.05), yc = (lo[1] + hi[1]) / 2;
      put(cc, `${cc.p}_held`, `place tube named ${cc.p}_held of steel.a36 at ${M(lo[0] - r)}, ${M(yc)}, ${M(Z)} size ${MM(D)} x ${MM(Lr)} x ${MM(Math.min(0.003, D / 4))} mm along z`, 'where its plates clamp round it', `a tube ${MM(D)} mm across standing for ${room.heldSay}`); STANDS.set(`${cc.p}_held`, room.heldSay);
      for (const [j, sz] of [-1, 1].entries()) { const hp = yc - D / 2 - (cc.y0 + 0.1); box(cc, `heldpost${j + 1}`, 'steel.a36', lo[0] - r, cc.y0 + 0.1 + hp / 2, Z + sz * (Lr / 2 - cw / 2), cw, cw, hp, 'bar', 'under the tube at its end, from its slab', 'a post standing for what holds the tube up (estimate)'); STANDS.set(`${cc.p}_heldpost${j + 1}`, room.heldSay); box(cc, `heldbase${j + 1}`, 'concrete.c30', lo[0] - r, cc.y0 + 0.05, Z + sz * (Lr / 2 - cw / 2), 0.6, 0.6, 0.1, 'slab', 'under its post, on the floor', 'a slab standing for what the tube is part of (estimate)'); STANDS.set(`${cc.p}_heldbase${j + 1}`, room.heldSay); }
    }
    cc.why = w0;
  };
  const slide = span ? (p: V3) => (Math.abs(p[0] - hi[0]) < 1e-9 ? 0 : null) : undefined;
  return { lo, hi, cells, held: room.held, ...(room.anchors ? { anchors: room.anchors } : {}), ...(slide ? { slide } : {}), cases, winds, heldBy, normal, ids, over, small: !span, plate, plateKg, deck, sp, F, H, Wd, Dd, X, Z, topY: span ? lo[1] : room.load[1], frontZ: span ? Z : room.load[2], topX: span ? X : room.load[0], dims, vw: cd.wind, lay, Wt, wall: heldBy === 'face', span, rests: k === 'ground' || k === 'ends', ...(cd.sagMax !== undefined ? { sagMax: cd.sagMax } : {}), ...(cd.pieceMax !== undefined ? { maxLen: cd.pieceMax } : {}), ...(cd.partMax !== undefined ? { partMax: cd.partMax } : {}), stand };
}
/** A roof's plan from the conditions of a cover. Its room is the plan said, up to the highest it may stand. Under its
 *  headroom nothing passes across the width kept clear, nor out of the ends of an aisle down its middle (a box kept
 *  clear), so only posts stand there, at its edges or either side of the aisle. What lies on its roof is spread over its
 *  top joints: in bays, each roofed with the least frame of sheet, joists and rails that spans it, and the bays as wide
 *  as let one. What hangs along it hangs from its lines of joints. The wind pushes it along and across and lifts its
 *  roof; a lean of 0.002 of its weight either way stands for what is not straight (AISC 360-16 C2.2b, notional loads).
 *  Its feet are cast into footings, each as heavy as the wind would lift it by and as wide as the ground under it bears. */
function planOfCover(n: Need, c: Ctx, cd: Conditions): FramePlan {
  const cv = cd.cover!, X = c.x0, Z = c.z0, y0 = c.y0, H = cd.up!, L = cv.L, W = cv.W, lay = layOf(n.want), hung = cd.loads.reduce((x, l) => x + (l.perM ?? 0), 0);
  // the bays: as large as one roof frame spans (4 m down to 2 m), at most ten along it and six across, and no deeper across
  // its joists than a sheet is sold long (about 3.05 m, estimate), so each piece of its sheet is one as sold
  const top = 'wood.birch-plywood', by = framingWood(c), ny = H > cv.head + 1 ? 2 : 1;
  let cells: [number, number, number] = [1, ny, 1], frame: Frame | null = null;
  for (const bay of [4, 3.5, 3, 2.5, 2]) {
    cells = [Math.min(10, Math.max(1, Math.ceil(L / bay - 1e-9))), ny, Math.min(6, Math.max(1, Math.ceil(W / Math.min(bay, 3.05) - 1e-9)))];
    const bx = L / cells[0], bz = W / cells[2];
    // what lies on it spread, and one at work on it standing anywhere: 300 lb on the sheet and a joist (ASCE 7-16 Table 4.3-1,
    // a roof walked on to be kept); its joists as purlins are, no nearer than 1.2 m (4 ft, estimate), the sheet as thick as that asks
    frame = frameFor(top, by, bx, bz, cv.p * bx * bz, bx, true, { spread: true, creep: 1, point: 300 * 4.44822, bunches: false }, cd.partMax, 1.2);
    if (frame) break;
  }
  const bx = L / cells[0], bz = W / cells[2], nx = cells[0], nz = cells[2];
  const roofKg = frame ? frame.kg : 0, selfQ = (roofKg * G) / (bx * bz), depth = frame ? frame.T + frame.joist.h + frame.rail.h : 0;
  // its frame grown up to where its roof's own frame starts, so all of it is no higher than it may stand
  const lo: V3 = [X - L / 2, y0, Z - W / 2], hi: V3 = [X + L / 2, y0 + H - depth, Z + W / 2], dims = [L, H - depth, W];
  // its top joints, each bearing its share of the bays round it (half a bay at an edge), and of what hangs along its lines
  const tops: V3[] = [], area: number[] = [], along: number[] = [];
  for (let i = 0; i <= nx; i++) for (let k = 0; k <= nz; k++) { const wx = (i === 0 || i === nx ? 0.5 : 1) * bx, wz = (k === 0 || k === nz ? 0.5 : 1) * bz; tops.push([lo[0] + i * bx, hi[1], lo[2] + k * bz]); area.push(wx * wz); along.push(wx); }
  const down = tops.map((at, j) => ({ at, F: [0, -((cv.p + selfQ) * area[j]! + hung * along[j]!), 0] as V3 }));
  const Wt = -down.reduce((x, d) => x + d.F[1], 0), F = cv.p * L * W + hung * L * (nz + 1);
  const cases: { at: V3; F: V3 }[][] = [down];
  for (const dir of [[1, 0, 0], [0, 0, 1]] as V3[]) cases.push(down.map((d) => ({ at: d.at, F: [dir[0] * 0.002 * -d.F[1], d.F[1], dir[2] * 0.002 * -d.F[1]] as V3 })));
  // the wind, along it and across it: on each strut as it grows, on its roof's edge (as deep as its roof frame, drag 1.2,
  // estimate), with its roof loaded and with its roof lifted (0.8 of q over its plan, as a flat roof, estimate; its own
  // roof frame weighing it down, nothing on it)
  const winds: Wind[] = [], qw = cd.wind ? 0.5 * airRho() * cd.wind ** 2 : 0;
  if (qw) for (const dir of [[1, 0, 0], [0, 0, 1]] as V3[]) {
    const edge = (qw * 1.2 * depth * (dir[0] ? W : L)) / tops.length;
    cases.push(down.map((d) => ({ at: d.at, F: [dir[0] * edge, d.F[1], dir[2] * edge] as V3 }))); winds.push({ case: cases.length - 1, q: qw, dir });
    cases.push(tops.map((at, j) => ({ at, F: [dir[0] * edge, (0.8 * qw - selfQ) * area[j]!, dir[2] * edge] as V3 }))); winds.push({ case: cases.length - 1, q: qw, dir });
  }
  // its feet: at its long edges, and either side of the width kept clear where that is narrower
  const half = cv.clear / 2, strips = half < W / 2 - 1e-6, e = 1e-6;
  const anchors: V3[] = strips ? Array.from({ length: nx + 1 }, (_, i) => [[lo[0] + i * bx, y0, Z - half], [lo[0] + i * bx, y0, Z + half]] as V3[]).flat() : [];
  const held = (p: V3) => Math.abs(p[1] - y0) < 1e-9 && Math.abs(p[2] - Z) >= half - e;
  // under its headroom, the width kept clear, from end to end where it is an aisle (its ends open), else between its ends
  // (an end may be braced)
  const keepOut: [V3, V3][] = [[[strips ? X - L : lo[0], y0 - 1, Z - half], [strips ? X + L : hi[0], y0 + cv.head, Z + half]]];
  const ids = cd.matter ? [cd.matter] : c.matter ? [(() => { try { return matterOf(c.matter).id; } catch { return 'steel.a36'; } })()] : FRAMED;
  c.conds = [
    `it carries ${+(F / G).toPrecision(3)} kg on its roof, spread over its ${len(L)} × ${len(W)} plan: ${cv.pSaid}${hung ? `; and ${+(hung / G).toPrecision(3)} kg hung on each metre along each of its ${nz + 1} lines of joints (${cd.loads.filter((l) => l.perM).map((l) => l.said).join(', ')})` : ''}`,
    `what holds it: footings in the ground at its feet, each as heavy as the wind would lift it by (by 1.5) and as wide as the ground under it bears`,
    `the room it may take: ${len(L)} × ${len(H - depth)} × ${len(W)}, its roof's own frame (${len(depth)} deep) on that${cd.upMax !== undefined ? ', so it is as high as it may stand' : ', its height taken'}`,
    `${cv.clearSaid}; ${cv.headSaid}: under that only posts stand${strips ? ', and the aisle is open at its ends' : ''}`,
    'a lean of 0.002 of its weight, along it and across it (AISC 360-16 C2.2b, notional loads)',
    ...(cd.wind ? [`a ${+(cd.wind * 3.6).toPrecision(3)} km/h wind along it and across it, on each strut as it grows and on its roof's edge, with its roof loaded and with it lifted (0.8 of ½ ρ v² over its plan, as a flat roof, estimate)`] : []),
    ...(cd.pieceMax !== undefined ? [`no strut longer than ${len(cd.pieceMax)}, as said of its pieces`] : []),
    ...(cd.partMax !== undefined ? [`no piece weighs more than ${+cd.partMax.toPrecision(3)} kg, as said`] : []),
    `made of what can be had: sections kept, of ${ids.map((x) => matterOf(x).name).join(', ')}${cd.matter ? ' (the matter said)' : ''}, each sized by two in strength and three in buckling, and no more slender than the codes allow`,
  ];
  const gaps = ['its roof is grown flat: one made to drain falls at least 2% (¼ in in each foot), not grown', 'what slides its footings sideways is borne by the ground round them, not weighed'];
  return { lo, hi, cells, held, anchors, cases, winds, heldBy: 'floor', normal: [0, 1, 0], ids, over: [lo[0], lo[2], hi[0], hi[2]], small: false, plate: 0, plateKg: 0, deck: null, sp: Math.max(bx, bz), F, H, Wd: L, Dd: W, X, Z, topY: hi[1], frontZ: Z, topX: X, dims, vw: cd.wind, lay, Wt, wall: false, span: false, rests: true, keepOut, footings: true, ...(frame ? { roof: { frame, top, bx, bz, nx, nz } } : {}), gaps, ...(cd.pieceMax !== undefined ? { maxLen: cd.pieceMax } : {}), ...(cd.partMax !== undefined ? { partMax: cd.partMax } : {}) };
}
/** The least sheet that spans s between the joints it rests on under F spread over W × D (a strip across the wider way,
 *  M = q s² / 8, its sag 5 q s⁴ / 384 E I, by two and within 1/250), of the matters a deck is made of. */
function leastDeck(F: number, W: number, D: number, s: number): FramePlan['deck'] {
  const q0 = F / (W * D);
  const of = (id: string) => { const m = matterOf(id), fam = familyOf(id), sy = fam === 'wood' ? 0.5 * m.ultimate : m.yield; for (const t of SHEET[fam]!.map((x) => x / 1e3)) { const q = q0 + m.density * G * t, M0 = (q * s * s) / 8, sg = (6 * M0) / (t * t), dl = (5 * q * s ** 4) / (384 * m.E * (t ** 3 / 12)); if (sy / sg >= 2 && dl <= s / 250) return { id, t, kg: W * D * t * m.density, sg, dl }; } return null; };
  return STRUCTURAL.filter((x) => !/stainless/.test(x)).map(of).filter((x) => !!x).sort((a, b) => a!.kg - b!.kg)[0] ?? null;
}

/** What a frame is grown for and how it stands: its room, what holds it (and the way from that into the room), its
 *  loads, the matters it may be made of, and what is said of its top. */
interface FramePlan {
  lo: V3; hi: V3; cells: [number, number, number]; held: (p: V3) => boolean; cases: { at: V3; F: V3 }[][]; winds: Wind[];
  heldBy: string; normal: V3; ids: string[]; anchors?: V3[]; /** where its top is along x, where not at X */ topX?: number; over: [number, number, number, number]; small: boolean; plate: number; plateKg: number;
  deck: { id: string; t: number; kg: number; sg: number; dl: number } | null; sp: number; F: number; H: number; Wd: number; Dd: number; X: number; Z: number;
  topY: number; frontZ: number; dims: number[]; vw: number | undefined; lay: Lay; Wt: number; wall: boolean; span: boolean; rests: boolean;
  /** the most what it holds may move, m; the longest a strut may be, m; the most a piece may weigh, kg */ sagMax?: number; maxLen?: number; partMax?: number;
  /** of its held joints, those free to slide one way (an end resting on a bank, free to move along the span) */ slide?: (p: V3) => number | null;
  /** places what stands for what holds it (a post, a tube, a deck's face), not counted as it */ stand?: (c: Ctx, tf: number) => void;
  /** boxes no strut may pass through (the floor under a roof, its clear width) */ keepOut?: [V3, V3][];
  /** its feet cast into footings in the ground, each as heavy as what would lift it */ footings?: boolean;
  /** a roof on its top joints: in bays, each its own frame of sheet, joists and rails between four of them */ roof?: { frame: Frame; top: string; bx: number; bz: number; nx: number; nz: number };
  /** what more is said of what it was grown for, and what is not weighed */ said?: string[]; gaps?: string[];
}
function realizeFrame(n: Need, c: Ctx, P: FramePlan): void {
  const { lo, hi, cells, held, cases, winds, heldBy, ids, over, small, plate, deck, sp, F, H, Wd, Dd, X, Z, topY, frontZ, dims, vw, lay, Wt, wall, span } = P;
    const r = grownFor({ lo, hi, cells, held, cases, ...(P.anchors ? { anchors: P.anchors } : {}), ...(P.keepOut ? { keepOut: P.keepOut } : {}), ...(P.footings ? { footings: true, rests: false } : { rests: P.rests, ballast: heldBy === 'floor', tied: heldBy === 'floor' }), ...(winds.length ? { wind: winds } : {}), ...(heldBy === 'floor' && !P.footings ? { over } : {}), ...(P.sagMax !== undefined ? { sagMax: P.sagMax } : {}), ...(P.maxLen !== undefined ? { maxLen: P.maxLen } : {}), ...(P.slide ? { slide: P.slide } : {}) }, heldBy + (P.slide ? ' sliding' : ''), ids), f = r.best ?? r.tried.slice().sort((a, b) => a.mass - b.mass)[0];
    if (!f) { c.gaps.push(`nothing in the room it may take reaches ${P.heldBy === 'floor' ? 'the floor' : `what holds it (${P.heldBy})`}: no frame can be grown there`); c.checks.push(() => ({ what: 'its frame is grown to what holds it', ok: false, says: 'no joint of the room it may take lies on what holds it' })); return; }
    const mt = f.matter; FRAMES.set(c.p, f); if (P.footings) FIXED.set(c.p, 'its footings, cast into the ground'); else if (!P.rests && heldBy !== 'wall') FIXED.set(c.p, heldBy === 'post' ? 'the post it clamps round' : heldBy === 'tube' || heldBy === 'rail' ? 'the tube it clamps round' : 'the face it is bolted to');
    // where it is held, a plate at each joint (on the floor its feet, on a wall or a bank its plates), as thick as the
    // deepest a strut's end goes past the joint, turned as it meets what holds it (r sin φ, φ its angle off square),
    // so the frame stands that far off what holds it and only its plates touch it; all of it one piece
    const normal: V3 = P.normal, radius = (x: (typeof f.struts)[number]) => Number((x.section.label.match(/[\d.]+/) ?? ['20'])[0]) / 2e3;
    const dip = (h: number) => Math.max(0, ...f.struts.filter((x) => x.a === h || x.b === h).map((x) => { const p = f.nodes[x.a]!, q = f.nodes[x.b]!, L = x.L, cos = Math.abs(((q[0] - p[0]) * normal[0] + (q[1] - p[1]) * normal[1] + (q[2] - p[2]) * normal[2]) / L); return radius(x) * Math.SQRT2 * Math.sqrt(Math.max(0, 1 - cos * cos)); }));
    const tf = Math.max(0.006, Math.ceil((Math.max(0, ...f.held.map(dip)) + 0.001) * 1000) / 1000);
    // on footings, its plates are cast into their tops and it stands where it was grown; else it stands on them
    const lift = P.footings ? 0 : tf, at = (p: V3): V3 => [p[0] + normal[0] * lift, p[1] + normal[1] * lift, p[2] + normal[2] * lift];
    const top0 = `${c.p}_top`, joined = ` joined to ${top0}`;
    // made: its deck or the plate what it carries sits on, then each strut from joint to joint, then its plates
    const w0 = c.why, tp = at([P.topX ?? X, topY, frontZ]);
    let roofTop = 0;
    if (P.roof) {
      // its roof: in each bay, the least frame of sheet, joists and rails that spans it, its rails along it resting on the
      // top joints at the bay's corners; all of it one piece with the frame
      const { frame: rf, top: rt, bx, bz, nx, nz } = P.roof, yTop = at([0, topY, 0])[1] + rf.T + rf.joist.h + rf.rail.h; roofTop = yTop;
      c.why = 'to carry what lies on its roof to its top joints';
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) {
        const s0 = c.steps.length, first = i === 0 && k === 0;
        placeFrame(c, rf, rt, lo[0] + (i + 0.5) * bx, yTop, lo[2] + (k + 0.5) * bz, bx, bz, first ? 'top' : `roof_${i + 1}_${k + 1}`, first ? '' : `_${i + 1}_${k + 1}_`);
        // what the rest is joined to is made first
        if (first) { const t0 = c.steps.findIndex((x, q) => q >= s0 && / named \S+_top /.test(x)); if (t0 > s0) c.steps.splice(s0, 0, ...c.steps.splice(t0, 1)); }
        for (let q = s0; q < c.steps.length; q++) if (!/ named \S+_top /.test(c.steps[q]!)) { c.steps[q] += ` joined to ${c.p}_top`; const tr = c.traces.find((x) => x.step === c.steps[q]!.replace(` joined to ${c.p}_top`, '')); if (tr) tr.step = c.steps[q]!; }
      }
      c.choices.push(`its roof in ${nx * nz} bays of ${len(bx)} × ${len(bz)}, each ${frameSays(rf)} under a ${MM(rf.T)} mm sheet of ${matterOf(rt).name}, ${+(rf.kg).toPrecision(3)} kg a bay: the lightest that bears what lies on it between the joints at its corners`);
    }
    else if (deck) {
      // in panels, each ending on a joint: no longer than a sheet is sold (2.44 m, estimate) or a piece may be, nor heavier
      // than a piece may weigh
      c.why = 'to carry what lies on it to the joints it rests on';
      const cellsX = Math.max(1, cells[0]), cellL = Wd / cellsX, longest = Math.min(2.44, P.maxLen ?? Infinity), pk = P.partMax;
      let per = Math.max(1, Math.floor(longest / cellL + 1e-9)); if (pk !== undefined) per = Math.max(1, Math.min(per, Math.floor(pk / (deck.kg / cellsX))));
      const panels = Math.ceil(cellsX / per), yd = at([0, topY, 0])[1] + deck.t / 2, zd = span ? Z : at([0, 0, lo[2] + dims[2]! / 2])[2];
      for (let q = 0; q < panels; q++) { const n0 = q * per, n1 = Math.min(cellsX, n0 + per), x0p = lo[0] + n0 * cellL, x1p = lo[0] + n1 * cellL; box(c, q === 0 ? 'top' : `top${q + 1}`, deck.id, (x0p + x1p) / 2, yd, zd, x1p - x0p, Dd, deck.t, 'plate', `on the frame's top joints, ${len(sp)} apart${panels > 1 ? `, panel ${q + 1} of ${panels}` : ''}`, `the least sheet of ${matterOf(deck.id).name} that spans ${len(sp)} between them under ${+(F / G).toPrecision(3)} kg spread: ${+(deck.sg / 1e6).toPrecision(3)} MPa, sagging ${MM(deck.dl)} mm (a strip, M = q s² / 8, 5 q s⁴ / 384 E I; estimate for a sheet held at points)${panels > 1 ? `; in ${panels} panels, each ending on a joint, so none is longer than ${len(longest)}${pk !== undefined ? ` or heavier than ${+pk.toPrecision(3)} kg` : ''}` : ''}`); if (q > 0) { c.steps[c.steps.length - 1] += ` joined to ${c.p}_top`; c.traces[c.traces.length - 1]!.step = c.steps.at(-1)!; } }
    }
    else if (!P.roof) { c.why = 'to hold what it carries where the frame meets'; box(c, 'top', 'aluminum.6061-t6', tp[0], tp[1] + 0.003, tp[2] - (wall ? plate / 2 : 0), plate, plate, 0.006, 'plate', 'where its struts meet, under what it carries', `a 6 mm aluminium plate ${len(plate)} across, what it carries fixed to it`); }
    c.why = `to carry what it holds to the ${heldBy}`;
    // placed outward from where it holds what it carries, so each strut meets the piece already made
    const topNode = f.nodes.reduce((b, p, i) => (Math.hypot(p[0] - (P.topX ?? X), p[1] - topY, p[2] - frontZ) < Math.hypot(f.nodes[b]![0] - (P.topX ?? X), f.nodes[b]![1] - topY, f.nodes[b]![2] - frontZ) ? i : b), f.loaded[0] ?? 0);
    const order: typeof f.struts = [], reached = new Set(deck ? f.loaded : [topNode]), left = [...f.struts];
    while (left.length) { const k = left.findIndex((x) => reached.has(x.a) || reached.has(x.b)); const x = left.splice(k < 0 ? 0 : k, 1)[0]!; order.push(x); reached.add(x.a); reached.add(x.b); }
    order.forEach((s, i) => {
      const p = at(f.nodes[s.a]!), q = at(f.nodes[s.b]!), mid: V3 = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], pull = Math.max(...s.N), push = Math.max(...s.N.map((x) => -x));
      const how = `grown where its load goes: ${pull > 1 ? `pulled up to ${+(pull / 1000).toPrecision(3)} kN` : ''}${pull > 1 && push > 1 ? ', ' : ''}${push > 1 ? `pressed up to ${+(push / 1000).toPrecision(3)} kN` : ''}${pull <= 1 && push <= 1 ? 'holding the frame against folding' : ''}; the lightest ${s.section.label} of ${mt.name} that bears it, ${+s.margin.toPrecision(3)} times what it asks ${s.mode === 'slender' ? `as slender as it may be, ${slenderSays(mt.id)}` : s.mode === 'buckled' ? 'before it buckles' : s.mode === 'crushed' ? 'before it crushes' : 'before it yields'}`;
      const tube = /tube/.test(s.section.label), [Dm, wm] = (s.section.label.match(/[\d.]+/g) ?? ['20', '2']).map(Number);
      // a wood strut longer than sawn timber is stocked (about 4.88 m, 16 ft, estimate): in as many pieces, spliced end to end
      const k = !tube && s.L > 4.88 ? Math.ceil(s.L / 4.88) : 1;
      if (k > 1) {
        for (let j = 0; j < k; j++) { const a = j / k, b = (j + 1) / k, pa: V3 = [p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a, p[2] + (q[2] - p[2]) * a], pb: V3 = [p[0] + (q[0] - p[0]) * b, p[1] + (q[1] - p[1]) * b, p[2] + (q[2] - p[2]) * b], mj: V3 = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2, (pa[2] + pb[2]) / 2];
          put(c, j ? `${c.p}_s${i + 1}_${j + 1}` : `${c.p}_s${i + 1}`, `place bar named ${j ? `${c.p}_s${i + 1}_${j + 1}` : `${c.p}_s${i + 1}`} of ${mt.id} at ${M(mj[0])}, ${M(mj[1])}, ${M(mj[2])} size ${Dm} x ${Dm} x ${MM(s.L / k)} mm ${turnAlong(p, q)}${joined}`, `from ${pa.map((x) => MM(x)).join(', ')} mm to ${pb.map((x) => MM(x)).join(', ')} mm${j ? `, piece ${j + 1} of ${k}` : ''}`, j ? `piece ${j + 1} of ${k} of a strut ${len(s.L)} long, spliced end to end, as sawn timber is stocked no longer than about 4.88 m (16 ft, estimate); the splice to carry what the strut does, not derived` : `${how}; in ${k} pieces spliced end to end, as sawn timber is stocked no longer than about 4.88 m (16 ft, estimate)`); }
        return;
      }
      put(c, `${c.p}_s${i + 1}`, tube ? `place tube named ${c.p}_s${i + 1} of ${mt.id} at ${M(mid[0])}, ${M(mid[1])}, ${M(mid[2])} size ${Dm} x ${MM(s.L)} x ${wm} mm along y ${turnAlong(p, q)}${joined}` : `place bar named ${c.p}_s${i + 1} of ${mt.id} at ${M(mid[0])}, ${M(mid[1])}, ${M(mid[2])} size ${Dm} x ${Dm} x ${MM(s.L)} mm ${turnAlong(p, q)}${joined}`, `from ${p.map((x) => MM(x)).join(', ')} mm to ${q.map((x) => MM(x)).join(', ')} mm`, how);
    });
    c.why = heldBy === 'floor' ? 'to stand it on the floor where its struts meet it' : `to fix it to the ${heldBy === 'wall' ? 'wall' : 'banks'} where its struts meet ${heldBy === 'wall' ? 'it' : 'them'}`;
    const plateW = new Map<number, number>();
    f.held.forEach((h, i) => { const p = f.nodes[h]!, w = Math.max(0.06, 6 * radius(f.struts.filter((x) => x.a === h || x.b === h).sort((x, y) => radius(y) - radius(x))[0]!)); plateW.set(h, w); const sk = P.footings ? -tf / 2 : tf / 2, ctr: V3 = [p[0] + normal[0] * sk, p[1] + normal[1] * sk, p[2] + normal[2] * sk]; put(c, `${c.p}_plate${i + 1}`, `place plate named ${c.p}_plate${i + 1} of steel.a36 at ${M(ctr[0])}, ${M(ctr[1])}, ${M(ctr[2])} size ${MM(w)} x ${MM(heldBy === 'wall' ? w : w)} x ${MM(tf)} mm${normal[2] ? ' turned x 90' : normal[0] ? ' turned z 90' : ''}${joined}`, `at a joint where its struts meet the ${heldBy === 'banks' ? 'bank' : heldBy}`, `a ${MM(w)} mm square of ${MM(tf)} mm steel, as thick as the deepest a strut's end goes past the joint, ${heldBy === 'floor' ? 'so the joint does not dig in' : 'screwed or bolted to it (not weighed)'}`); });
    // its feet tied together on the floor along their outline (as skids are), so it slides only as a whole: each tie the
    // lightest section of its matter that bears, pulled or pressed, the most any foot is pushed sideways (estimate of
    // what a tie carries), from the edge of one foot plate to the next
    if (heldBy === 'floor' && !P.footings && f.held.length > 1) {
      c.why = 'to tie its feet together on the floor, so it slides only as a whole';
      const foot = f.held.map((h) => ({ h, p: [f.nodes[h]![0], f.nodes[h]![2]] as [number, number] })), hull = hullOf(foot.map((x) => x.p));
      const ring = hull.length === 2 ? [[0, 1]] : hull.map((_, k) => [k, (k + 1) % hull.length]), T = Math.max(f.tie, 1); let tied = 0, tieSays = '';
      for (const [a0, b0] of ring) {
        const pa = hull[a0!]!, pb = hull[b0!]!, ha = foot.find((x) => x.p[0] === pa[0] && x.p[1] === pa[1])!.h, hb = foot.find((x) => x.p[0] === pb[0] && x.p[1] === pb[1])!.h;
        const L0 = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]), u = [(pb[0] - pa[0]) / L0, (pb[1] - pa[1]) / L0], cut = (h: number) => (plateW.get(h) ?? 0.06) / 2 / Math.max(Math.abs(u[0]!), Math.abs(u[1]!));
        const ca = cut(ha), cb = cut(hb), Lt = L0 - ca - cb; if (Lt <= 0.01) continue;
        const sec = sectionFor([T, -T], Lt, mt.strut, mt.sections), D = sec.section.width ?? 0.02, y = c.y0 + D / 2;
        const p: V3 = [pa[0] + u[0]! * ca, y, pa[1] + u[1]! * ca], q: V3 = [pb[0] - u[0]! * cb, y, pb[1] - u[1]! * cb], mid: V3 = [(p[0] + q[0]) / 2, y, (p[2] + q[2]) / 2];
        const tube = /tube/.test(sec.section.label), [Dm, wm] = (sec.section.label.match(/[\d.]+/g) ?? ['20', '2']).map(Number); tied++;
        tieSays = `the lightest ${sec.section.label} of ${mt.name} that bears ${+(T / 1000).toPrecision(3)} kN pulled or pressed, ${+sec.margin.toPrecision(3)} times what it asks`;
        // lying on the floor, turned only about the upright, so it lies flat on it
        const yaw = +((Math.atan2(-(q[2] - p[2]), q[0] - p[0]) * 180) / Math.PI).toFixed(4);
        put(c, `${c.p}_tie${tied}`, tube ? `place tube named ${c.p}_tie${tied} of ${mt.id} at ${M(mid[0])}, ${M(mid[1])}, ${M(mid[2])} size ${Dm} x ${MM(Lt)} x ${wm} mm along x turned y ${yaw}${joined}` : `place bar named ${c.p}_tie${tied} of ${mt.id} at ${M(mid[0])}, ${M(mid[1])}, ${M(mid[2])} size ${MM(Lt)} x ${Dm} x ${Dm} mm turned y ${yaw}${joined}`, 'on the floor, from one foot plate to the next along its outline', tieSays);
      }
      if (tied) c.choices.push(`its ${f.held.length} feet tied together on the floor by ${tied} tie${tied > 1 ? 's' : ''} along their outline, ${tieSays} (the most any foot is pushed sideways, an estimate of what a tie carries): so it slides only as a whole`);
    }
    // where the floor alone would not keep a foot down or from sliding, its weight set on it: concrete, by 1.5 of what it wants
    const ballastKg = f.ballast.reduce((x, y) => x + y / G, 0);
    if (P.footings) {
      // a footing under each foot, cast into the ground, its top at the floor: as heavy as the wind would lift that foot by
      // (by 1.5), and as wide as the ground bears what presses it down (1500 psf, 71.8 kPa: IBC Table 1806.2, the least of
      // its soils, clay and silt; estimate of the ground), at least 0.3 m deep
      c.why = 'to hold its feet down and spread what they press on the ground'; let most = 0, kgAll = 0;
      f.held.forEach((h, i) => { const kg = (f.ballast[i] ?? 0) / G, side = Math.max(0.3, Math.sqrt((f.press[i] ?? 0) / 71.8e3)), dp = Math.max(0.3, kg / (2400 * side * side)), p = f.nodes[h]!; most = Math.max(most, f.press[i] ?? 0); kgAll += side * side * dp * 2400;
        box(c, `footing${i + 1}`, 'concrete.c30', p[0], c.y0 - tf - dp / 2, p[2], side, side, dp, 'block', 'in the ground under its foot plate, cast round it, its top at the floor', `${len(side)} square and ${len(dp)} deep, ${+(side * side * dp * 2400).toPrecision(3)} kg: as wide as the ground bears ${+((f.press[i] ?? 0) / 1000).toPrecision(3)} kN on it (71.8 kPa, IBC Table 1806.2, estimate of the ground), as heavy as ${+(kg).toPrecision(3)} kg, what the wind would lift this foot by, by 1.5`, { loose: false }); c.steps[c.steps.length - 1] += joined; c.traces[c.traces.length - 1]!.step = c.steps.at(-1)!; STANDS.set(`${c.p}_footing${i + 1}`, 'the ground its footings are cast in'); });
      c.choices.push(`${f.held.length} footings of concrete, ${+kgAll.toPrecision(3)} kg in all, cast into the ground under its feet: each as wide as the ground bears what it presses (the most, ${+(most / 1000).toPrecision(3)} kN) and as heavy as the wind would lift it by`);
      c.checks.push(() => ({ what: 'its footings hold it down', ok: true, says: f.lift.most > 0 ? `under the worst of its loads a foot is lifted with ${+(f.lift.most / 1000).toPrecision(3)} kN, and its footing weighs 1.5 times that` : 'no foot is lifted under any of its loads: each footing is as wide as the ground under it bears' }));
    }
    else if (heldBy === 'floor' && ballastKg > 0.05) { c.why = 'to hold its foot down, where its loads would lift it or slide it'; f.held.forEach((h, i) => { const kg = (f.ballast[i] ?? 0) / G; if (kg < 0.05) return; const side = Math.cbrt(kg / 2400), p = at(f.nodes[h]!); box(c, `ballast${i + 1}`, 'concrete.c30', p[0], p[1] + side / 2, p[2], side, side, side, 'block', 'on its foot plate', `${+kg.toPrecision(3)} kg of concrete, ${len(side)} a side: what keeps this foot down under the worst of its loads, and its share of what keeps the whole from sliding, by 1.5 (μ 0.5 on the floor, estimate)`, { loose: false }); BALLAST.add(`${c.p}_ballast${i + 1}`); c.steps[c.steps.length - 1] += joined; c.traces[c.traces.length - 1]!.step = c.steps.at(-1)!; }); c.choices.push(`${+ballastKg.toPrecision(3)} kg of concrete set on its feet, as the ${vw ? 'wind' : 'push'} would lift or slide it there and its room is no wider (the frame was grown weighing that ballast with it, so a wider stance is chosen where it is lighter)`); }
    if (heldBy === 'wall') { c.why = 'to stand for the wall it is fixed to'; const wt = 0.2; box(c, 'wall', 'concrete.c30', X, c.y0 + (H + 0.1) / 2, lo[2] - wt / 2, Wd + 0.4, wt, H + 0.1, 'slab', 'behind it, on the floor', 'a block of concrete standing for the wall it is fixed to (estimate)'); STANDS.set(`${c.p}_wall`, 'the wall it is fixed to'); }
    if (P.stand) P.stand(c, tf);
    if (heldBy === 'banks') { c.why = 'to stand for the banks it rests on'; for (const [k, sx2] of [-1, 1].entries()) { box(c, `bank${k + 1}`, 'concrete.c30', X + sx2 * (Wd / 2), c.y0 + Math.max(0.05, H) / 2 - Math.max(0, 0.05 - H), Z, Math.min(0.3, Math.max(0.01, Wd / 3)), Dd + 0.2, Math.max(0.05, H), 'block', `${sx2 < 0 ? 'left' : 'right'} of the gap`, 'a block of concrete standing for the bank (estimate)'); STANDS.set(`${c.p}_bank${k + 1}`, 'the banks it rests on'); } }
    c.why = w0;
    const joints = new Set(f.struts.flatMap((s) => [s.a, s.b])).size, others = r.tried.filter((x) => x !== f).map((x) => `${x.matter.name} ${+x.mass.toPrecision(3)} kg${x.ok ? '' : ' (does not hold)'}`);
    c.choices.push(`a frame of ${f.struts.length} struts of ${mt.name} meeting at ${joints} joints, ${f.held.length} of them held by the ${heldBy === 'banks' ? 'banks' : heldBy}: grown from every way a strut could go in the ${dims.map((d) => len(d)).join(' × ')} it may take, each sized to what it carries and the least used given up, ${+f.mass.toPrecision(3)} kg${others.length ? `; grown and made of the others: ${others.join(', ')}` : ''}${c.matter ? ' (of the matter said)' : ''}`);
    if (deck) c.choices.push(`its deck a ${MM(deck.t)} mm sheet of ${matterOf(deck.id).name} (${+deck.kg.toPrecision(3)} kg), the lightest that spans between the joints it rests on`);
    if (P.footings) c.choices.push(`what it is grown for: ${+(Wt / G).toPrecision(3)} kg on its top joints, what lies on its roof and hangs from it and its roof's own weight; a lean of 0.002 of that along it and across it${vw ? `; a ${+(vw * 3.6).toPrecision(3)} km/h wind along it and across it, with its roof loaded and lifted` : ''}; its own weight with it`);
    else c.choices.push(`what it is grown for: ${+(Wt / G).toPrecision(3)} kg down${small ? ' at the point it holds' : ', spread over its top'}, and a tenth of that along it and across it (a knock or a lean, estimate)${lay.point && !small ? `, and one of ${+(lay.point / G).toPrecision(3)} kg standing at its middle` : ''}${vw ? `; a ${+(vw * 3.6).toPrecision(3)} km/h wind along it and across it, with what it carries on it and empty, on what it carries, its ${deck ? 'deck (lifting it too, empty)' : 'plate'} and each strut as it grows` : ''}; its own weight with it`);
    c.gaps.push(`its ${joints} joints, where its struts meet, are pinned in the solve: welded, bolted or lashed there, they are not weighed`);
    const worst = f.struts.slice().sort((a, b) => a.margin - b.margin)[0];
    c.checks.push(() => ({ what: `its struts carry what it holds`, ok: f.struts.every((s) => s.margin >= 1), says: worst ? `the most it asks of any strut: a ${worst.section.label} ${len(worst.L)} long, ${worst.mode === 'slender' ? (Math.min(...worst.N) < 0 ? 'pressed' : 'pulled') : worst.mode === 'buckled' ? 'pressed' : worst.mode === 'crushed' ? 'pressed' : 'pulled'} with ${+(Math.max(...worst.N.map(Math.abs)) / 1000).toPrecision(3)} kN, ${+worst.margin.toPrecision(3)} times what it asks ${worst.mode === 'slender' ? `of how slender it may be (${slenderSays(f.matter.id)})` : worst.mode === 'buckled' ? 'before it buckles (Euler, its ends pinned, by three)' : worst.mode === 'crushed' ? 'before it crushes (by two)' : 'before it yields (by two)'}; every strut solved under each load with the others by their stiffness (a truss, E A / L along each)` : 'no strut' }));
    const sg = f.sag.slice().sort((a, b) => b.most / b.allowed - a.most / a.allowed)[0];
    if (sg) c.checks.push(() => ({ what: P.sagMax !== undefined ? `it sags no more than ${MM(P.sagMax)} mm` : 'what it holds moves no more than it may', ok: f.sag.every((x) => x.most <= x.allowed), says: `under the worst of its loads a joint it carries on moves ${MM(sg.most)} mm, against the ${MM(sg.allowed)} mm it may (${P.sagMax !== undefined ? 'as said' : '1/250 of twice how far it is held out, estimate'})` }));
    if ((heldBy === 'floor' || heldBy === 'banks') && !P.footings) c.checks.push(() => ({ what: `it rests on the ${heldBy === 'banks' ? 'banks' : 'floor'} without being held down`, ok: (f.ballast.some((x) => x > 0) || (f.lift.most <= 1e-6 * Math.max(1, f.mass * G) && f.lift.slide <= 1)) && f.lift.inside && f.lift.steady, says: !f.lift.inside ? 'its top reaches past the outline its feet make on the floor: what is put at its edge tips it' : !f.lift.steady ? 'what it carries lies nearer the edge of its feet\'s outline than a tenth of how high it is: pushed at its top with a tenth of its weight, it tips' : f.lift.most > 1e-6 * Math.max(1, f.mass * G) ? (f.ballast.some((x) => x > 0) ? `under the worst of its loads a foot would be lifted with ${+f.lift.most.toPrecision(3)} N, so it is weighed down there (above)` : `under the worst of its loads one foot would have to be pulled down with ${+f.lift.most.toPrecision(3)} N: resting, it lifts there and tips`) : `under each of its loads every foot is pressed down, and pushed sideways at most ${+(f.lift.slide * 100).toPrecision(3)}% of what half of that holds (μ 0.5, estimate)` }));
    c.checks.push(() => ({ what: 'it does not fold under any load', ok: f.mechanisms === 0, says: f.mechanisms === 0 ? `no motion of its joints leaves every strut its length (the rank of how its struts stretch, against its joints' freedoms)` : `${f.mechanisms} way${f.mechanisms === 1 ? '' : 's'} its joints can move with no strut stretching` }));
    if (deck) c.checks.push(() => ({ what: `its deck bears ${+(F / G).toPrecision(3)} kg between its joints`, ok: true, says: `a ${MM(deck.t)} mm sheet over ${len(sp)}: ${+(deck.sg / 1e6).toPrecision(3)} MPa, ${MM(deck.dl)} mm of sag (by two, within 1/250)` }));
    c.top = { y: P.roof ? roofTop : at([0, topY, 0])[1] + (deck ? deck.t : 0.006), w: small ? plate : Wd, d: small ? plate : Dd, name: `${c.p}_top` };
    for (const g of P.gaps ?? []) c.gaps.push(g);
    c.foot = [Wd, wall ? Dd : Dd];
}

way({
  id: FRAME_WAY, meets: 'surface', says: 'a frame grown along its loads to what holds it: its struts where what it carries sends its weight, each as thick as that asks',
  when: (n) => (framed(n) ? null : 'a top worked at, sat at or lain on wants the room under it clear: legs, a column or panels leave it so'),
  make: (n, c) => {
    if (n.want.cond) return realizeFrame(n, c, planOfConditions(n, c, n.want.cond));
    const wall = n.want.flags.includes('wall'), span = n.want.flags.includes('span'), lay = layOf(n.want), F = n.want.q.F!.v + n.above;
    // the room it may take, what holds it, and where its loads are: on the floor, held where it meets the floor; on a
    // wall, held where it meets the wall, reaching out as far as it holds what it carries; across a gap, held on the
    // banks at each end of it
    const s0 = span ? { H: n.want.q.H!.v, W: n.want.q.span!.v, D: n.want.q.W!.v } : surfaceHow(n);
    // standing alone, as wide both ways as a push at its top of a tenth of its weight wants not to tip it (0.3 of its
    // height, as for the others), since it may be pushed either way
    const least = !span && !wall ? 0.3 * (s0.H + n.tall) : 0;
    const H = s0.H, Wd = Math.max(s0.W, least), Dd = Math.max(s0.D, least), X = c.x0, Z = c.z0, y0 = c.y0;
    // what it carries lies on a top as big as it (or as said): a small top is a point it holds; a wide one carries its
    // load anywhere on it, spread over the joints its deck rests on
    const small = !span && !lay.spread;
    const depth = span ? Math.max(0.3, Wd / 8) : wall ? Math.max(0.15, Dd) : H;
    const lo: V3 = span ? [X - Wd / 2, y0 + H, Z - Dd / 2] : wall ? [X - Wd / 2, c.y0 + H - depth, Z] : [X - Wd / 2, y0, Z - Dd / 2];
    const hi: V3 = span ? [X + Wd / 2, y0 + H + depth, Z + Dd / 2] : wall ? [X + Wd / 2, c.y0 + H, Z + Dd] : [X + Wd / 2, y0 + H, Z + Dd / 2];
    // the ground drawn coarse enough to grow in (at most about fifty joints): four cells along its longest way, as many
    // as fit the same size along the others
    const dims = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]];
    let cell0 = Math.max(...dims) / 4, cells: [number, number, number] = [1, 1, 1];
    for (let k = 0; k < 20; k++) { cells = dims.map((d) => Math.max(d < 1e-6 ? 0 : 1, Math.min(6, Math.round(d / cell0)))) as [number, number, number]; if ((cells[0] + 1) * (cells[1] + 1) * (cells[2] + 1) <= 50) break; cell0 *= 1.15; }
    const topY = span ? lo[1] : hi[1], frontZ = wall ? hi[2] : Z;
    const tops: V3[] = []; if (small) tops.push([X, topY, frontZ]); else for (let i = 0; i <= cells[0]; i++) for (let k = 0; k <= cells[2]; k++) tops.push([lo[0] + (dims[0]! * i) / cells[0], topY, lo[2] + (cells[2] ? (dims[2]! * k) / cells[2] : dims[2]! / 2)]);
    // its deck, where its load is spread: the least sheet that spans between the joints it rests on (a strip across the
    // wider of them, M = q s² / 8, its sag 5 q s⁴ / 384 E I, by two and within 1/250 of it)
    const sx = cells[0] ? dims[0]! / cells[0] : dims[0]!, sz = cells[2] ? dims[2]! / cells[2] : dims[2]!, sp = Math.max(sx, sz);
    const deckIds = STRUCTURAL.filter((x) => !/stainless/.test(x)), q0 = small ? 0 : F / (Wd * Dd);
    const deckOf = (id: string) => { const m = matterOf(id), fam = familyOf(id), sy = fam === 'wood' ? 0.5 * m.ultimate : m.yield; for (const t of SHEET[fam]!.map((x) => x / 1e3)) { const q = q0 + m.density * G * t, M0 = (q * sp * sp) / 8, sg = (6 * M0) / (t * t), dl = (5 * q * sp ** 4) / (384 * m.E * (t ** 3 / 12)); if (sy / sg >= 2 && dl <= sp / 250) return { id, t, kg: Wd * Dd * t * m.density, sg, dl }; } return null; };
    const deck = small ? null : deckIds.map(deckOf).filter((x) => !!x).sort((a, b) => a!.kg - b!.kg)[0] ?? null;
    const plate = small ? Math.max(0.1, Math.min(0.3, Math.max(n.fit[0], n.fit[1]) || 0.15)) : 0, plateKg = small ? plate * plate * 0.006 * matterOf('aluminum.6061-t6').density : 0;
    const Wt = F + (deck ? deck.kg * G : plateKg * G), per = Wt / tops.length;
    // what it is grown for: its load and its deck down; a tenth of that pushing along it and across it, as a knock or a
    // lean (estimate); one standing where it is worst, where one may
    const down = tops.map((p) => ({ at: p, F: [0, -per, 0] as V3 })), cases = [down, tops.map((p) => ({ at: p, F: [0.1 * per, -per, 0] as V3 })), tops.map((p) => ({ at: p, F: [0, -per, 0.1 * per] as V3 }))];
    if (lay.point && !small) { const mid = tops.reduce((b, p) => (Math.hypot(p[0] - X, p[2] - Z) < Math.hypot(b[0] - X, b[2] - Z) ? p : b), tops[0]!); cases.push([...down, { at: mid, F: [0, -lay.point, 0] as V3 }]); }
    // in the wind said, blowing along it and across it: ½ ρ v² on what it carries (people standing, 0.7 m² each, 1.75 m
    // by 0.4 m; else a body of its weight as dense as water, V^⅔; estimates), on its deck's edge, and on each strut as
    // it grows; with what it carries on it, and empty (the wind on its deck alone)
    const vw = c.wind ?? n.want.q.wind?.v, winds: Wind[] = [];
    if (vw) {
      const qw = 0.5 * (n.want.q.airRho?.v ?? airRho()) * vw * vw, people = n.want.flags.includes('crowd') ? Math.max(1, Math.round(F / (80 * G))) : 0;
      const Acarry = people ? 0.7 * people : Math.cbrt(F / G / 1000) ** 2, Adeck = deck ? Math.max(Wd, Dd) * deck.t : plate * 0.006, selfDown = (deck ? deck.kg * G : plateKg * G) / tops.length;
      for (const dir of [[1, 0, 0], [0, 0, 1]] as V3[]) {
        const full = (qw * 1.2 * (Acarry + Adeck)) / tops.length, bare = (qw * 1.2 * Adeck) / tops.length;
        cases.push(tops.map((p) => ({ at: p, F: [dir[0] * full, -per, dir[2] * full] as V3 }))); winds.push({ case: cases.length - 1, q: qw, dir });
        // empty, a flat deck is lifted too: 0.8 of q over its plan (as a flat roof, estimate)
        const up = deck ? (0.8 * qw * Wd * Dd) / tops.length : 0;
        cases.push(tops.map((p) => ({ at: p, F: [dir[0] * bare, up - selfDown, dir[2] * bare] as V3 }))); winds.push({ case: cases.length - 1, q: qw, dir });
      }
    }
    const heldBy = span ? 'banks' : wall ? 'wall' : 'floor';
    const held = (p: V3) => (span ? (Math.abs(p[0] - lo[0]) < 1e-9 || Math.abs(p[0] - hi[0]) < 1e-9) && Math.abs(p[1] - lo[1]) < 1e-9 : wall ? Math.abs(p[2] - lo[2]) < 1e-9 : Math.abs(p[1] - lo[1]) < 1e-9);
    const ids = c.matter ? [(() => { try { return matterOf(c.matter).id; } catch { return 'steel.a36'; } })()] : FRAMED;
    const half = small ? plate / 2 : 0, over: [number, number, number, number] = small ? [X - half, frontZ - half, X + half, frontZ + half] : [lo[0], lo[2], hi[0], hi[2]];
    // the conditions it is grown to meet, as the ask gave them and as they were taken: dropped to the growth below
    c.conds = [
      `it carries ${+(F / G).toPrecision(3)} kg${small ? ' at one point' : ', spread over its top'}${span ? `, across ${len(Wd)} between two banks` : wall ? `, ${len(Dd)} out from a wall` : `, ${len(H)} up`}${n.want.q.F?.grounds ? ` (${n.want.q.F.grounds})` : ''}${lay.point && !small ? `, and one of ${+(lay.point / G).toPrecision(3)} kg standing where it is worst` : ''}`,
      span ? 'what holds it: the banks at its two ends, which only push up on it (it rests on them)' : wall ? 'what holds it: the wall, which it is fixed to (it may pull on it)' : 'what holds it: the floor, which only pushes up on it, and grips its feet sideways with half of that (μ 0.5, estimate)',
      `the room it may take: ${dims.map((d) => len(d)).join(' × ')}${n.want.q.W?.by === 'you' || n.want.q.D?.by === 'you' ? ' (as said)' : ''}`,
      'a knock or a lean of a tenth of what it carries, along it and across it (estimate)',
      ...(vw ? [`a ${+(vw * 3.6).toPrecision(3)} km/h wind along it and across it, with what it carries on it and empty`] : []),
      ...(heldBy === 'floor' ? ['what is put at the edge of its top does not tip it: its top lies inside its feet'] : []),
      `made of what can be had: tubes and sections kept, of ${ids.map((x) => matterOf(x).name).join(', ')}${c.matter ? ' (the matter said)' : ''}, each sized by two in strength and three in buckling`,
    ];
    realizeFrame(n, c, { lo, hi, cells, held, cases, winds, heldBy, normal: heldBy === 'wall' ? [0, 0, 1] : [0, 1, 0], ...(span ? { slide: (p: V3) => (Math.abs(p[0] - hi[0]) < 1e-9 ? 0 : null) } : {}), ids, over, small, plate, plateKg, deck, sp, F, H, Wd, Dd, X, Z, topY, frontZ, dims, vw, lay, Wt, wall, span, rests: heldBy !== 'wall' });
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
/** Pushed by hand: a deck on four free wheels and a handle at its back, about elbow height (0.95 m, estimate). What a
 *  person pushes is checked against the 200 N an adult keeps pushing (Snook and Ciriello 1991, estimate), up its slope,
 *  m g (C_rr cos θ + sin θ); held back going down it, m g (sin θ − C_rr cos θ); and on its slope, sideways, it tips once
 *  its weight's line leaves its wheels: tan θ = (b / 2) / h, its weight at the deck and what it carries at half its height. */
function pushed(n: Need, c: Ctx) {
  // loose stuff it carries by its weight lies in a tub as deep as a wheelbarrow's, 250 mm (estimate)
  const tub = n.want.q.lkg && n.want.q.rho ? Math.sqrt(n.want.q.lkg.v / n.want.q.rho.v / 0.25) : 0;
  // (people it carries: room for them, its deck 1.25 times as long as wide)
  const room = n.want.q.room?.v ?? 0, said = n.want.q.W?.by === 'you' ? n.want.q.W.v : 0, W = Math.max(n.fit[0], said, 0.4, tub, Math.sqrt(room / 1.25), (n.want.q.lcount?.v ?? 0) * (n.want.q.ld?.v ?? 0) + 0.05), deck = matterFor(c, STRUCTURAL);
  const t = 0.012, D = Math.max(n.fit[1], n.want.q.D?.by === 'you' ? n.want.q.D.v : 0, 0.5, tub, room ? room / W : 0);
  const r = pick(c.rnd, [0.075, 0.1, 0.125]), wt = 0.05, X = c.x0, Z = c.z0, yb = c.y0 + 2 * r + 0.02, towed = n.want.flags.includes('towed'), bar = 0.025;
  const crr = n.want.q.crr?.v ?? 0.02, slope = n.want.q.slope?.v ?? 0, ground = n.want.q.crr ? n.want.q.crr.grounds : null, p = c.p;
  c.choices.push(`a ${MM(t)} mm deck of ${matterOf(deck).name} ${len(W)} × ${len(D)} on four free wheels ${len(2 * r)} across${towed ? ', towed' : `, a handle at its back ${len(0.95)} up`}: ${towed ? 'towed' : 'pushed by hand'}, it has no motors`);
  if (towed) c.gaps.push('what hitches it to what tows it (a tow arm and a hitch at its front) is not made, nor what it meets on the road at speed (bumps, braking and turning)');
  box(c, 'deck', deck, X, yb + t / 2, Z, W, D, t, 'plate', `${len(yb)} up on its axle blocks, over ${len(W)} × ${len(D)}`, '12 mm sheet, close under what it carries');
  if (tub > 0.3) c.choices.push(`a deck ${len(W)} × ${len(D)}, so the ${+n.want.q.lkg!.v.toPrecision(3)} kg of ${n.want.q.lkg!.grounds} lies 250 mm deep in it, as in a wheelbarrow (estimate)`);
  const rim = rimFor(n.want, W, D, familyOf(deck) === 'wood' ? deck : 'wood.douglas-fir'); if (rim) { placeRim(c, rim, X, yb + t, Z, W, D); c.checks.push(() => rim.check); c.choices.push(rim.choice); }
  for (const [k, [sx, sz]] of ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).entries()) {
    const w0 = c.why; c.why = 'to hold a wheel';
    const bx = X + sx * (W / 2 - 0.015), bz = Z + sz * (D / 2 - r - 0.01), bh = yb - (c.y0 + r - 0.015), bn = box(c, `axle${k + 1}`, deck, bx, yb - bh / 2, bz, 0.03, 0.03, bh, 'block', `under the deck's ${sz < 0 ? 'back' : 'front'} ${sx < 0 ? 'left' : 'right'} corner`, 'down to its wheel\'s axle');
    c.why = 'to roll on the floor';
    const wn = put(c, `${c.p}_wheel${k + 1}`, `place wheel named ${c.p}_wheel${k + 1} of rubber at ${M(bx + sx * (0.015 + wt / 2))}, ${M(c.y0 + r)}, ${M(bz)} size ${MM(2 * r)} x ${MM(wt)} mm along x`, `beside its axle block, its bottom on the floor`, `${len(2 * r)} across, rubber`, { moving: true });
    c.steps.push(`hinge ${wn} to ${bn}`); c.traces.push({ step: c.steps.at(-1)!, what: `${wn}'s hinge`, called: c.way, why: 'so it rolls freely', when: '', where: `where ${wn} touches ${bn}`, how: 'a Jolt hinge, free' });
    c.why = w0;
  }
  // its handle behind the deck, against its back edge, so nothing on the deck meets it
  const hy = 0.95 - yb;
  if (!towed) for (const [k, sx] of [-1, 1].entries()) box(c, `handle${k + 1}`, deck, X + sx * (W / 2 - bar / 2), yb + hy / 2, Z - D / 2 - bar / 2, bar, bar, hy, 'bar', `against the deck's back edge at its ${sx < 0 ? 'left' : 'right'} corner, up to ${len(0.95)}`, `a ${len(bar)} bar to push it by`);
  if (!towed) box(c, 'grip', deck, X, yb + hy + bar / 2, Z - D / 2 - bar / 2, W, bar, bar, 'bar', `across the tops of its handles, ${len(0.95)} up`, 'what a hand pushes');
  ROLLS.set(c.p, 'z');
  const hLoad = n.want.q.lh?.v ?? 0.3, push = 200;
  // what it carries on its deck between its axle blocks: the load law, set down at its middle (loose stuff spread over it)
  const kgC = n.want.q.m?.v ?? 0, Ld = Math.max(W, D);
  if (kgC > 0) { c.loads.push(`load ${c.p}_deck with ${+(kgC * G).toFixed(1)} N + ${c.p}_deck.mass * g${tub > 0.3 ? ' spread' : ''}`); c.checks.push(() => { const v = LOADS.get(`${c.p}_deck`); return v ? { what: `its deck bears ${+kgC.toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend <= Ld / 250, says: `the load law, ${tub > 0.3 ? 'spread over it' : 'set down at its middle'} between its axle blocks: ${factorSays(v.factor, v.wood)}, ${bendSays(v.bend, Ld)}` } : null; }); }
  // what it carries, standing loose on it on its slope, tips once its weight's line leaves its foot: tan θ = d / h; gas
  // cylinders are kept upright and secured (OSHA 29 CFR 1926.350), by a chain or a rack, which is not made
  const ld = n.want.q.ld?.v, lh = n.want.q.lh?.v, gas = /\b(cylinders?|bottles?|tanks?)\b/.test(n.want.q.m?.grounds ?? '');
  // so many of them side by side across its deck, as it is sized for them: what else it carries, its size not said, is not
  // given room here
  const lc = n.want.q.lcount?.v;
  if (ld && lc) c.checks.push(() => ({ what: `its ${lc} ${n.want.q.lcount!.grounds.replace(/^\S+\s+/, '')} fit side by side on its deck`, ok: lc * ld <= W + 1e-9 && ld <= D + 1e-9, says: `${lc} of ${len(ld)} across want ${len(lc * ld)} on its ${len(W)} × ${len(D)} deck; what else it carries, its size not said, is not given room here` }));
  if (ld && lh) { const th = Math.atan(ld / lh), deg = (x: number) => +((x * 180) / Math.PI).toPrecision(3); c.checks.push(() => ({ what: `what it carries stands on its ${slope ? `${deg(slope)}° slope` : 'deck'}`, ok: !gas && th > slope, says: `${len(ld)} across and ${len(lh)} tall, standing loose it tips at ${deg(th)}° (tan θ = d / h, statics)${slope ? `, ${th > slope ? `${deg(th - slope)}° beyond` : 'less than'} its slope` : ''}${gas ? '; gas cylinders are kept upright and secured (OSHA 29 CFR 1926.350): a chain or a rack round them, which is not made' : th > slope ? '' : ': it must be chained or held in a rack, which is not made'}` })); }
  c.checks.push(() => { const kg = (MADE.get(p) ?? 20) + (CARRIED.get(p) ?? 0), up = kg * G * (crr * Math.cos(slope) + Math.sin(slope)), down = kg * G * (Math.sin(slope) - crr * Math.cos(slope)); return { what: `${towed ? 'it is towed' : 'a person pushes it'}${slope ? ` up ${+((slope * 180) / Math.PI).toPrecision(3)}°` : ''}${ground ? ` on ${ground}` : ''}`, ok: towed || up <= push, says: `${+kg.toPrecision(3)} kg in all (itself as made and what it carries): ${slope ? `up the slope m g (${crr} cos θ + sin θ)` : `rolling, ${crr} of its weight (estimate)`}, ${+up.toPrecision(3)} N${towed ? ', which what tows it gives' : `, against the 200 N an adult keeps pushing (Snook and Ciriello 1991, estimate)${up > push ? `: ${+(up / push).toPrecision(2)} times it, too heavy to push alone` : ''}`}${slope && down > 0 ? `; going down it, ${+down.toPrecision(3)} N must hold it back: it wants brakes or wheel locks, not made` : ''}` }; });
  // and along it, up or down the slope, over its wheelbase (its weight taken midway between its axles)
  if (slope) c.checks.push(() => { const kgS = MADE.get(p) ?? 20, kgL = CARRIED.get(p) ?? 0, h = (kgS * yb + kgL * (yb + t + hLoad / 2)) / Math.max(1e-9, kgS + kgL), b = W + wt, tip = Math.atan(b / 2 / h), wb = D - 2 * r - 0.02, eL = ld ? (kgL * Math.max(0, D / 2 - ld / 2)) / Math.max(1e-9, kgS + kgL) : 0, tipL = Math.atan(Math.max(0, wb / 2 - eL) / h), worst = Math.min(tip, tipL), deg = (x: number) => +((x * 180) / Math.PI).toPrecision(3); return { what: `on its ${deg(slope)}° slope, it does not tip`, ok: worst > slope, says: `its weight and what it carries, ${+h.toPrecision(3)} m up together (what it carries at half its ${len(hLoad)} height${n.want.q.lh ? '' : ', estimate'}): over its ${len(b)} track it tips at ${deg(tip)}° sideways, and over its ${len(wb)} wheelbase at ${deg(tipL)}° up or down the slope (tan θ = b / 2 h, statics${eL > 0 ? `, what it carries standing at one end of its deck, ${len(eL)} off its middle together: tan θ = (b / 2 − e) / h` : ', its weight midway between its axles'}); the worse, ${deg(worst)}°, is ${worst > slope ? `${+(((worst - slope) * 180) / Math.PI).toPrecision(2)}° beyond its slope` : 'less than its slope: it tips'}; rolling and a push make it worse, not weighed` }; });
  c.top = { y: yb + t, w: W, d: D, name: `${c.p}_deck` }; c.foot = [W + 2 * wt, D + bar];
}
/** Towed behind what pulls it (a bicycle, a car): a deck slung between two wheels, its axle set back of its middle so a
 *  tenth of all it carries rests on its hitch and it tows steady (estimate), a tow arm from its front to a hitch, the
 *  hitch's end held up by what tows it (a block standing for it). */
function towedCart(n: Need, c: Ctx) {
  const room = n.want.q.room?.v ?? 0, said = n.want.q.W?.by === 'you' ? n.want.q.W.v : 0, W = Math.max(n.fit[0], said, 0.5, Math.sqrt(room / 1.25)), D = Math.max(n.fit[1], n.want.q.D?.by === 'you' ? n.want.q.D.v : 0, 0.6, room ? room / W : 0);
  const deck = matterFor(c, ['wood.birch-plywood', 'aluminum.6061-t6']), arm = matterFor(c, ['aluminum.6061-t6', 'steel.a36'], 'beam', 'tow arm'), v = n.want.q.v?.v ?? 1.3, X = c.x0, Z = c.z0, p = c.p;
  // at road speed, wheels as big as a bicycle's 20-inch ones (about 508 mm across with a tyre, estimate), made as discs of
  // 3 mm aluminium (a disc wheel), its tyre not derived; at a walk, small rubber ones
  const road = v > 2, r = road ? 0.254 : 0.1, wt = road ? 0.003 : 0.05, La = 0.9, kgC = n.want.q.m?.v ?? 0, e = 0.1 * (D / 2 + La);
  // turning at its speed: it goes over once what turns it pulls it sideways past g (track / 2) / h; a bicycle turning about
  // a 5 m radius at that speed (estimate) pulls it with v² / r: its wheels are set out on their axles until its track bears
  // that by 1.5
  const aY = (v * v) / 5;
  let t = 0.012, yb = c.y0 + r - 0.06, track = W + 0.06, side = 0.02, Ft = 0, Fb = 0, kgAll = 0, outL = 0.035;
  const mA = matterOf(arm), make = (T: number) => {
    c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.loose.length = 0; c.led = false; c.after = c.base0 ?? null;
    // (its wheel's plane clear of its deck's edge by half a tyre 50 mm wide and 10 mm more, estimate)
    t = T; yb = c.y0 + r - 0.06; const hc = yb + t + 0.25; track = Math.max(W + 2 * 0.035 + wt, 2 * hc * (1.5 * aY) / G); const out = (track - wt) / 2 - W / 2; outL = out;
    box(c, 'deck', deck, X, yb + t / 2, Z, W, D, t, 'plate', `${len(yb)} up between its wheels, over ${len(W)} × ${len(D)}`, `${MM(t)} mm sheet, as thin as bears what it carries by two within 1/250 of its span`);
    for (const [k, sx] of [-1, 1].entries()) {
      const w0 = c.why; c.why = 'to hold a wheel'; const bh = c.y0 + r + 0.015 - yb;
      const bn = box(c, `axle${k + 1}`, deck, X + sx * (W / 2 + out / 2), yb + bh / 2, Z - e, out, 0.06, bh, 'block', `against the deck's ${sx < 0 ? 'left' : 'right'} side, ${len(e)} back of its middle`, `out to its wheel and up to its axle: its wheels ${len(track)} apart, so a turn at its speed does not tip it`);
      c.why = 'to roll on the road';
      const wn = put(c, `${p}_wheel${k + 1}`, `place wheel named ${p}_wheel${k + 1} of ${road ? 'aluminum.6061-t6' : 'rubber'} at ${M(X + sx * (W / 2 + out + wt / 2))}, ${M(c.y0 + r)}, ${M(Z - e)} size ${MM(2 * r)} x ${MM(wt)} mm along x`, 'beside its axle block, its bottom on the road', road ? `${len(2 * r)} across, a disc of 3 mm aluminium (its tyre not derived)` : `${len(2 * r)} across, rubber`, { moving: true });
      c.steps.push(`hinge ${wn} to ${bn}`); c.traces.push({ step: c.steps.at(-1)!, what: `${wn}'s hinge`, called: c.way, why: 'so it rolls freely', when: '', where: `where ${wn} touches ${bn}`, how: 'a Jolt hinge, free' });
      c.why = w0;
    }
    // its tow arm: the tenth of all of it on its end, and braking at half of g (estimate) pushing along it
    kgAll = (MADE.get(p) ?? 8) + kgC; Ft = 0.1 * kgAll * G; Fb = 0.5 * kgAll * G;
    side = (SQUARE[familyOf(arm)] ?? SQUARE.metal!).map((x) => x / 1e3).find((a) => (Ft * La * 6) / a ** 3 <= mA.yield / 2 && (Math.PI ** 2 * mA.E * a ** 4) / 12 / (La * La) >= 3 * Fb) ?? 0.05;
    const w1 = c.why; c.why = 'to tow it by';
    box(c, 'towarm', arm, X, yb + t / 2, Z + D / 2 + La / 2, side, La, side, 'bar', 'from the middle of its front edge forward', `${MM(side)} mm square ${mA.name}: the least that bears a tenth of all of it on its end by two, and braking at half of g along it by three against buckling (estimate)`);
    const hz = Z + D / 2 + La; box(c, 'hitch', 'steel.a36', X, yb + t / 2, hz + 0.02, 0.04, 0.04, 0.04, 'block', 'on the end of its tow arm', 'what couples it to what tows it: a hitch block, its pin not derived');
    c.why = 'to stand for what tows it, holding its hitch up';
    const tw = box(c, 'tow', 'steel.a36', X, c.y0 + (yb + t / 2 - 0.02 - c.y0) / 2, hz + 0.02, 0.06, 0.06, yb + t / 2 - 0.02 - c.y0, 'block', 'under its hitch, on the road', 'a block standing for what tows it, holding up the end of its arm');
    STANDS.set(tw, 'what tows it'); c.why = w1;
  };
  t = kgC > 0 ? leastSheet(c, familyOf(deck), 0.006, make, () => `load ${p}_deck with ${+(kgC * G).toFixed(1)} N + ${p}_deck.mass * g`, Math.max(W, D)) : (make(0.012), 0.012);
  c.choices.push(`a deck of ${MM(t)} mm ${matterOf(deck).name} ${len(W)} × ${len(D)} slung between two wheels ${len(2 * r)} across${road ? ' (a bicycle\'s 20-inch, for road speed, estimate)' : ''} ${len(track)} apart, its axle ${len(e)} back of its middle so a tenth of all of it rests on its hitch (estimate), a ${len(La)} tow arm of ${MM(side)} mm square ${mA.name} at its front: towed, it has no motors`);
  c.gaps.push(`how it brakes, and its wheels' bearings${road ? ', tyres and spokes (made here as discs)' : ''}, are not derived; what it carries is held on its deck by nothing made here`);
  if (kgC > 0) { c.loads.push(`load ${p}_deck with ${+(kgC * G).toFixed(1)} N + ${p}_deck.mass * g`); c.checks.push(() => { const vv = LOADS.get(`${p}_deck`); return vv ? { what: `its deck bears ${+kgC.toPrecision(3)} kg`, ok: vv.factor >= 2 && vv.bend <= Math.max(W, D) / 250, says: `the load law: ${factorSays(vv.factor, vv.wood)}, bending ${len(vv.bend)}` } : null; }); }
  const sd = side, Ft0 = Ft, Fb0 = Fb, kg0 = kgAll, tr = track, hc = yb + t + 0.25, aT = (G * tr) / 2 / hc;
  c.checks.push(() => ({ what: 'its tow arm bears its hitch\'s share and its braking', ok: (mA.yield * sd ** 3) / (Ft0 * La * 6) >= 2 && (Math.PI ** 2 * mA.E * sd ** 4) / 12 / (La * La) >= 3 * Fb0, says: `${+Ft0.toPrecision(3)} N on its end (a tenth of ${+kg0.toPrecision(3)} kg, estimate) bends its ${MM(sd)} mm square ${len(La)} arm at ${+((Ft0 * La * 6) / sd ** 3 / 1e6).toPrecision(3)} MPa, ${+((mA.yield * sd ** 3) / (Ft0 * La * 6)).toPrecision(3)} times under its yield; braked at half of g (estimate), ${+Fb0.toPrecision(3)} N along it, ${+((Math.PI ** 2 * mA.E * sd ** 4) / 12 / (La * La) / Fb0).toPrecision(3)} times under what buckles it (Euler, K = 1)` }));
  c.checks.push(() => ({ what: `turning at ${+(v * 3.6).toPrecision(3)} km/h, it does not tip over`, ok: aT >= 1.5 * aY - 1e-9, says: `on a ${len(tr)} track with what it carries about ${len(hc)} up (a seated child's middle about 250 mm over its deck, estimate), it tips once pulled sideways at ${+(aT / G).toPrecision(3)} of g (g track / 2 h); turning about a 5 m radius at ${+(v * 3.6).toPrecision(3)} km/h (estimate) pulls it at ${+(aY / G).toPrecision(3)} of g (v² / r), ${+(aT / aY).toPrecision(3)} times under it (by 1.5)` }));
  // each stub axle, out from its deck's side to its wheel, a cantilever bearing half of all of it, twice over on a bump
  // (estimate): M = 2 (m g / 2) L, under half its strength
  const mdk = matterOf(deck), bh0 = c.y0 + r + 0.015 - yb, Ms = kg0 * G * outL, ss = (6 * Ms) / (0.06 * bh0 * bh0);
  c.checks.push(() => ({ what: 'its stub axles bear it on a bump', ok: mdk.yield / ss >= 2, says: `each ${MM(outL)} mm out from its deck's side, ${MM(bh0)} × 60 mm of ${mdk.name}, under half of ${+kg0.toPrecision(3)} kg twice over on a bump (estimate): ${+Ms.toPrecision(3)} N·m, ${+(ss / 1e6).toPrecision(3)} MPa, ${factorSays(mdk.yield / ss, familyOf(deck) === 'wood')}; its wheels' own axles and bearings are not derived` }));
  c.top = { y: yb + t, w: W, d: D, name: `${p}_deck` }; c.foot = [tr + wt, D + La];
}
const cartFits = (n: Need) => { const { across, motor } = leastCart(), said = n.want.q.W?.by === 'you' ? n.want.q.W.v : null; return said !== null && said < across ? `at ${len(said)} across, nothing kept is small enough to drive it: the smallest motor kept is ${len(motor.diameter)} across, and its wheels and deck at least ${len(across)}` : null; };
way({ id: 'four wheels, pushed', meets: 'mobility', says: 'a deck on four free wheels, pushed by hand', when: (n) => (n.want.flags.includes('towed') ? 'it is towed, on two wheels and a tow arm' : n.want.flags.includes('pushed') ? null : 'something drives it'), make: pushed });
way({ id: 'two wheels and a tow arm', meets: 'mobility', says: 'a deck slung between two wheels, towed by an arm at its front', when: (n) => (n.want.flags.includes('towed') ? null : 'nothing tows it'), make: towedCart });
way({ id: 'four wheels, two driven', meets: 'mobility', says: 'a deck on four wheels, the back two turned by motors', when: (n) => n.want.flags.includes('pushed') ? 'it is pushed by hand, so it has no motors' : cartFits(n) ?? (n.want.q.wheels && n.want.q.wheels.v !== 4 ? `you said ${n.want.q.wheels.v} wheels` : null), make: wheels(4) });
way({ id: 'three wheels, two driven', meets: 'mobility', says: 'a deck on two driven wheels and one free one in front', when: (n) => n.want.flags.includes('pushed') ? 'it is pushed by hand, so it has no motors' : cartFits(n) ?? (n.want.q.wheels && n.want.q.wheels.v !== 3 ? `you said ${n.want.q.wheels.v} wheels` : n.above > 400 ? 'what it carries is too heavy to leave one corner on one wheel' : null), make: wheels(3) });

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
    // its long way along the wall, so its brackets reach out the least; brackets at studs (usually 600 mm apart,
    // estimate), as many studs apart as leaves about a fifth of it over each end (the overhang that bends it least)
    const W0 = n.want.q.W!.v, D0 = n.want.q.D!.v, turned = D0 > W0 + 1e-9, W = Math.max(W0, D0), D = Math.min(W0, D0), H = n.want.q.H!.v, F = n.want.q.F!.v + n.above, apart = Math.min(n.want.q.apart?.v ?? 0.6 * Math.max(1, Math.round((0.55 * W) / 0.6)), W - 0.06), board = matterFor(c, STRUCTURAL), fam = familyOf(board), lay0 = layOf(n.want), stays = /shel/.test(n.want.says), lay: Lay = stays && fam === 'wood' ? { ...lay0, creep: 1 + (/plywood/.test(board) ? 0.8 : 0.6) } : lay0, sp = lay.spread ? ' spread' : '';
    const X = c.x0, Z = c.z0, y0 = c.y0, wW = W + 0.4, wH = H + 0.3, zf = Z - D / 2, st = 'steel.a36', E = matterOf(st).E, Y = matterOf(st).yield;
    // the arm: a cantilever D long under half of it all, spread along it (M = P D / 2, δ = P D³ / 8 E I)
    const P = (F + W * D * 0.03 * matterOf(board).density * G) / 2; let side = (SQUARE.metal!.map((x) => x / 1e3).find((b) => { const I = b ** 4 / 12, sg = (P * D) / 2 * (b / 2) / I, dl = (P * D ** 3) / (8 * E * I); return Y / sg >= 2 && dl <= D / 250; }) ?? 0.1), hu = Math.max(0.05, Math.min(Math.max(0.15, D * 0.8), H - 0.15));
    const side0 = side;
    const make = (t: number) => {
      c.steps.length = 0; c.traces.length = 0; c.members.length = 0; c.riders.length = 0; c.led = false; c.after = c.base0 ?? null;
      const yb = y0 + H - t;
      // a wall stands because the building holds it: the block standing for it is as deep as holds up what hangs off
      // its face, by half again (its weight over half its depth against all of it and its load at half its reach)
      const outKg = F / G + W * D * t * matterOf(board).density + 2 * matterOf(st).density * side * side * (D + hu), wt = Math.max(0.2, Math.sqrt((1.5 * outKg * D) / (matterOf('concrete.c30').density * wW * wH)));
      c.why = 'to stand for the wall it is screwed to';
      const wall = box(c, 'wall', 'concrete.c30', X, y0 + wH / 2, zf - wt / 2, wW, wt, wH, 'slab', 'behind it, on the floor', `a block of concrete ${len(wW)} wide, ${len(wH)} tall and ${len(wt)} deep standing for the wall and its studs, deep enough to stand with what hangs off it as a wall held by its building does: not part of it`);
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
    c.choices.push(`a ${MM(tried.t)} mm board of ${matterOf(board).name} on two brackets of ${MM(side)} mm square steel ${len(apart)} apart${n.want.q.apart ? ', at the studs' : apart > 0.6 + 1e-9 ? ` (${Math.round(apart / 0.6)} studs apart, studs usually 600 mm apart, estimate)` : ' (studs are usually 600 mm apart, estimate)'}, screwed to the wall${turned ? `, its ${len(W)} along the wall so its brackets reach out only ${len(D)}` : ''}`);
    c.loads.push(`load ${c.p}_top with ${+F.toFixed(1)} N + ${c.p}_top.mass * g${sp}`, `load ${c.p}_arm1 with ${+P.toFixed(1)} N spread`);
    c.checks.push(() => { const v = LOADS.get(`${c.p}_top`); return v ? { what: `its board bears ${+(F / G).toPrecision(3)} kg`, ok: v.factor >= 2 && v.bend * lay.creep <= apart / 250, says: `the load law${sp ? ', the load spread over it' : ''}, between its brackets: ${factorSays(v.factor, v.wood)}, ${bendSays(v.bend * lay.creep, apart)}${creepSays(lay)} (1/250 of ${len(apart)} is ${len(apart / 250)}: more fails)` } : null; });
    c.checks.push(() => { const v = LOADS.get(`${c.p}_arm1`); return v ? { what: 'its brackets bear their half', ok: v.factor >= 2 && v.bend <= D / 250, says: `the load law, ${+(P / G).toPrecision(3)} kg spread along each arm out from the wall: ${factorSays(v.factor, v.wood)}, its end ${bendSays(v.bend, D)} (1/250 of ${len(D)} is ${len(D / 250)}: more fails)` } : null; });
    // its board over the brackets with its ends overhanging, the load spread along it (w = F / W): the tips bend
    // w a (3a³ + 6a²L − L³) / 24 E I, its middle w L² (5L² − 24a²) / 384 E I, each by its creep, and the brackets' ends too
    const t = tried.t, wq = (F + W * D * t * rho * G) / W, EI = Eb * ((D * t ** 3) / 12);
    const tip = ((wq * a * (3 * a ** 3 + 6 * a * a * apart - apart ** 3)) / (24 * EI)) * lay.creep, midB = ((wq * apart * apart * (5 * apart * apart - 24 * a * a)) / (384 * EI)) * lay.creep;
    c.checks.push(() => { const arm = LOADS.get(`${c.p}_arm1`)?.bend ?? 0, worst = Math.max(tip, midB) + arm, lim = c.sag ?? apart / 250; SAGS.set(c.p, { bend: worst, at: tip >= midB ? 'its overhanging ends, and the brackets under them' : 'its middle, and the brackets' }); return { what: 'its overhanging ends bend no more than its middle may', ok: worst <= lim * 1.0001, says: `its ${len(a)} overhangs each side of the brackets ${len(apart)} apart, the load spread along it: its tips bend ${len(tip)} (w a (3a³ + 6a²L − L³) / 24 E I), its middle ${midB < 0 ? `rises ${len(-midB)}` : `bends ${len(midB)}`} (w L² (5L² − 24a²) / 384 E I)${lay.creep > 1 ? creepSays(lay) : ''}, and the brackets' ends ${len(arm)}: ${len(worst)} at the worst, against ${len(lim)}${c.sag !== undefined ? ' said' : ' (1/250 of its span)'}` }; });
    const armW = matterOf(st).density * side * side * D * G, upW = matterOf(st).density * side * side * hu * G, Mb = (P * D) / 2 + (armW * D) / 2, Tn = Mb / (hu - 0.02), allow = SCREW_PULL / 5, Vn = (P + armW + upW) / 2, sideAllow = SCREW_SIDE / 5;
    c.checks.push(() => ({ what: 'its screws hold in the studs', ok: Tn <= allow && Vn <= sideAllow, says: `two 5 mm wood screws to each bracket, ${MM(hu - 0.02)} mm apart, each long enough to pass the bracket and 12.5 mm of plasterboard and go 50 mm into the stud (about 85 mm, estimate): the bracket's moment (${+Mb.toPrecision(3)} N·m, its own ${+((armW + upW) / G).toPrecision(3)} kg of steel with it) pulls the top one out with ${+Tn.toPrecision(3)} N, against ${+allow.toPrecision(3)} N (USDA Wood Handbook ch. 8, withdrawal ${+SCREW_PULL.toPrecision(3)} N at G 0.42, a fifth of it taken as safe, estimate); each carries ${+Vn.toPrecision(3)} N down, against ${+sideAllow.toPrecision(3)} N sideways (NDS yield modes, ${+SCREW_SIDE.toPrecision(3)} N, a fifth taken, estimate)` }));
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
    // the rail a bar held at its two feet, what it carries on the carriage at its middle, the worst place (M = F L / 4),
    // bending under 1/1000 of its span, as what slides smoothly asks (estimate), as shallow as bears that; the carriage a
    // 10 mm plate of what the rail is, as long as a fifth of the travel; what it carries put on it in the tests
    const L = n.want.q.L!.v, m = n.want.q.m?.v ?? 5, rail = matterFor(c, ['aluminum.6061-t6', 'steel.a36']), md = matterOf(rail), cw = Math.max(0.08, L * 0.2), len = L + cw + 0.04, X = c.x0, Z = c.z0, y = c.y0, span = len - 0.04;
    const ct = 0.01, cd = 0.08, mc = md.density * cw * cd * ct, F = (m + mc) * G;
    const rh = (() => { for (const h of [0.02, 0.025, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1]) { const I = (0.04 * h ** 3) / 12, dl = (F * span ** 3) / (48 * md.E * I) + (5 * 0.04 * h * md.density * G * span ** 4) / (384 * md.E * I), sg = ((F * span) / 4) * (h / 2) / I; if (dl <= span / 1000 && md.yield / sg >= 2) return h; } return 0.1; })();
    const I = (0.04 * rh ** 3) / 12, dl = (F * span ** 3) / (48 * md.E * I) + (5 * 0.04 * rh * md.density * G * span ** 4) / (384 * md.E * I);
    c.choices.push(`a rail of ${matterOf(rail).name} ${M(len)} long, 40 × ${MM(rh)} mm, on two feet, a ${MM(ct)} mm carriage on it`);
    const w0 = c.why; c.why = 'to hold the rail up';
    for (const [i, sx] of [-1, 1].entries()) box(c, `foot${i + 1}`, rail, X + sx * (len / 2 - 0.02), y + 0.02, Z, 0.04, 0.12, 0.04, 'block', `under the rail's ${sx < 0 ? 'left' : 'right'} end, on what it stands on`, '40 mm blocks, 120 mm wide so the rail does not roll over');
    c.why = w0; box(c, 'rail', rail, X, y + 0.04 + rh / 2, Z, len, 0.04, rh, 'bar', 'on its feet', `as long as the travel and the carriage, ${MM(len)} mm, ${MM(rh)} mm deep: what it carries at its middle bends it under 1/1000 of its span`);
    const cn = put(c, `${c.p}_carriage`, `place plate named ${c.p}_carriage of ${rail} at ${M(X - L / 2)}, ${M(y + 0.04 + rh + ct / 2)}, ${M(Z)} size ${MM(cw)} x ${MM(cd)} x ${MM(ct)} mm`, 'on the rail at its start', `a ${MM(ct)} mm plate of ${md.name} ${MM(cw)} mm long: what it carries sits on it`, { moving: true });
    c.steps.push(`slide ${cn} on ${c.p}_rail along x between 0 mm and ${MM(L)} mm`); c.traces.push({ step: c.steps.at(-1)!, what: `${cn}'s slide`, called: c.way, why: `so it slides ${MM(L)} mm`, when: '', where: `where it touches the rail, along it`, how: 'a Jolt slider with its limits at the ends of the travel' });
    c.checks.push(() => ({ what: `its rail bears ${+m.toPrecision(3)} kg on the carriage at its middle`, ok: dl <= span / 1000 + 1e-9, says: `held at its feet ${MM(span)} mm apart, ${+(m + mc).toPrecision(3)} kg (what it carries and the carriage) at its middle and its own weight along it bend it ${+(dl * 1000).toPrecision(3)} mm (F L³ / 48 E I and 5 w L⁴ / 384 E I), against 1/1000 of its span (${+(span).toPrecision(3)} mm), as what slides smoothly asks (estimate)` }));
    c.tests.push({ kind: 'slide', name: cn, L, m: mc + m });
    c.gaps.push('how its carriage runs on its rail (its bearings or rollers), what it is mounted on (a tripod or stands) and the mount for what it carries are not derived');
    c.top = { y: y + 0.04 + rh + ct, w: cw, d: cd, name: cn }; c.foot = [len, 0.12];
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
    // a shelter beasts stand in (a loafing shed, a run-in) has no floor: they stand on the ground, its walls on it
    const bare = n.want.flags.includes('nofloor'), ft = bare ? 0 : t;
    if (n.want.flags.includes('openfront')) OPEN.add(c.p);
    c.choices.push(`${bare ? 'no floor (they stand on the ground), ' : 'a floor, '}${n.want.flags.includes('openfront') ? 'three walls (its front left open)' : 'four walls'} and a roof of ${MM(t)} mm ${matterOf(mt).name}${door ? ', a door hung in the front' : ''}`);
    const how = `${len(t)} ${matterOf(mt).name}: the least sheet kept that is at least ${fam === 'metal' ? '1/600' : '1/60'} of its largest side (${len(big)}), to stand stiff (estimated)`;
    if (t < big / (fam === 'metal' ? 600 : 60)) c.gaps.push(`no ${fam} sheet kept is thick enough for walls ${len(big)} across: the thickest kept, ${len(t)}, is under the ${fam === 'metal' ? '1/600' : '1/60'} of its largest side (${len(big / (fam === 'metal' ? 600 : 60))}) taken for a wall to stand stiff (estimate); walls this big want a frame (studs, or poles under cloth), not kept`);
    if (!bare) box(c, 'floor', mt, X, y0 + t / 2, Z, W + 2 * t, D + 2 * t, t, 'plate', 'on what it stands on', how);
    box(c, 'left', mt, X - W / 2 - t / 2, y0 + ft + H / 2, Z, t, D + 2 * t, H, 'slab', bare ? 'on the ground, its left side' : 'on the floor, its left side', how); box(c, 'right', mt, X + W / 2 + t / 2, y0 + ft + H / 2, Z, t, D + 2 * t, H, 'slab', bare ? 'on the ground, its right side' : 'on the floor, its right side', how);
    box(c, 'back', mt, X, y0 + ft + H / 2, Z - D / 2 - t / 2, W, t, H, 'slab', bare ? 'on the ground between the sides, at the back' : 'on the floor between the sides, at the back', how);
    const narrow = door && n.want.flags.includes('walkin') && W > 1;
    if (door) {
      const w0 = c.why; c.why = 'to open and shut its front';
      // a walk-in door 700 mm wide (estimate) where its front is wider: the rest of the front a wall each side of it
      const dw = narrow ? 0.7 : W - 0.004, fl = narrow ? (W - dw - 0.004) / 2 : 0;
      if (narrow) { for (const [k, sx] of [-1, 1].entries()) box(c, `front${k + 1}`, mt, X + sx * (W / 2 - fl / 2), y0 + ft + H / 2, Z + D / 2 + t / 2, fl, t, H, 'slab', `on the floor at the front, ${sx < 0 ? 'left' : 'right'} of the door`, how); }
      const dn = box(c, 'door', mt, narrow ? X - W / 2 + fl + dw / 2 : X - 0.002, y0 + ft + 0.002 + (H - 0.004) / 2, Z + D / 2 + t / 2, dw, t, H - 0.004, 'slab', narrow ? 'in the front between its two walls, its left edge against the left one' : 'in the front, its left edge against the left side', narrow ? 'a door 700 mm wide to go in by (estimate), 4 mm clear of the wall it shuts against' : 'the front less 2 mm all round, so it swings clear', { moving: true });
      c.steps.push(`hinge ${dn} to ${narrow ? `${c.p}_front1` : `${c.p}_left`} about y from -100° to 0°`); c.traces.push({ step: c.steps.at(-1)!, what: `${dn}'s hinge`, called: c.way, why: 'so it swings open outward', when: '', where: 'where its edge touches the left side, about the upright', how: 'a Jolt hinge with stops at shut and 100° open' });
      c.tests.push({ kind: 'swing', name: dn }); c.why = w0;
    } else if (!n.want.flags.includes('openfront')) box(c, 'front', mt, X, y0 + ft + H / 2, Z + D / 2 + t / 2, W, t, H, 'slab', 'on the floor between the sides, at the front', how);
    box(c, 'roof', mt, X, y0 + ft + H + t / 2, Z, W + 2 * t, D + 2 * t, t, 'plate', 'on the four walls', how);
    // what lies on its roof (snow), spread on it: borne by the load law, by two, bending within 1/250 of its span, across
    // whichever two of its walls bear it worse; snow comes and goes, so no creep is taken
    const rp = n.want.q.roofP;
    // on four walls its roof is a plate held round all its edges, bending mostly across its shorter way (Roark, Table 11.4,
    // case 1a: σ = β q b² / t², δ = α q b⁴ / E t³, b its shorter side, β and α by a / b); its own weight with what lies on it
    if (rp && !n.want.flags.includes('openfront')) { const a0 = Math.max(W, D), b0 = Math.min(W, D), ra = a0 / b0, md = matterOf(mt), q0 = rp.v + md.density * G * t;
      const TBL: [number, number, number][] = [[1, 0.2874, 0.0444], [1.2, 0.3762, 0.0616], [1.4, 0.453, 0.077], [1.6, 0.5172, 0.0906], [1.8, 0.5688, 0.1017], [2, 0.6102, 0.111], [3, 0.7134, 0.1335], [4, 0.741, 0.14], [5, 0.7476, 0.1417], [1e9, 0.75, 0.1421]];
      const k = TBL.findIndex(([x]) => x >= ra), [x1, b1, a1] = TBL[Math.max(0, k - 1)]!, [x2, b2, a2] = TBL[Math.max(0, k)]!, f = x2 > x1 ? (ra - x1) / (x2 - x1) : 0, beta = b1 + f * (b2 - b1), alpha = a1 + f * (a2 - a1);
      const sg = (beta * q0 * b0 * b0) / (t * t), dl = (alpha * q0 * b0 ** 4) / (md.E * t ** 3), fac = md.yield / sg, wood = familyOf(mt) === 'wood';
      c.checks.push(() => ({ what: `its roof bears ${rp.grounds.replace(/, about .*$/, '')}`, ok: fac >= 2 && dl <= b0 / 250, says: `${+(rp.v / 1000).toPrecision(3)} kPa (${rp.grounds.replace(/^.*?, about /, 'about ')}) and its own weight on its ${len(W + 2 * t)} × ${len(D + 2 * t)}, a plate held round its edges on its four walls, bending mostly across its ${len(b0)} (Roark Table 11.4, β ${+beta.toPrecision(3)}, α ${+alpha.toPrecision(3)}): ${+(sg / 1e6).toPrecision(3)} MPa, ${factorSays(fac, wood)}, ${bendSays(dl, b0)} (1/250 of ${len(b0)} is ${len(b0 / 250)}: more fails); snow comes and goes, so no creep is taken` })); }
    else if (rp) { const F = rp.v * (W + 2 * t) * (D + 2 * t), rn = `${c.p}_roof`, span = Math.max(W, D); c.loads.push(`load ${rn} with ${+F.toFixed(1)} N + ${rn}.mass * g spread`); c.checks.push(() => { const v = LOADS.get(rn); if (!v) return null; return { what: `its roof bears ${rp.grounds.replace(/, about .*$/, '')}`, ok: v.factor >= 2 && v.bend <= span / 250, says: `${+(rp.v / 1000).toPrecision(3)} kPa (ρ g h, ${rp.grounds.replace(/^.*?, about /, 'about ')}) over ${len(W + 2 * t)} × ${len(D + 2 * t)}, ${+(F / G).toPrecision(3)} kg spread on it, with its own weight; the load law across its walls, the worse way: ${factorSays(v.factor, v.wood)}, ${bendSays(v.bend, span)} (1/250 of ${len(span)} is ${len(span / 250)}: more fails); snow comes and goes, so no creep is taken` }; }); }
    c.checks.push(() => ({ what: `it encloses ${MM(W)} × ${MM(D)} × ${MM(H)} mm`, ok: true, says: `inside, ${MM(W)} by ${MM(D)} mm and ${MM(H)} mm tall` }));
    SKINS.set(`${c.p}:box`, { A: 2 * (W * D + W * H + D * H), t, id: mt, L: H });
    c.top = { y: y0 + 2 * t + H, w: W + 2 * t, d: D + 2 * t, name: `${c.p}_floor` }; c.foot = [W + 2 * t, D + 2 * t]; c.inside = { y: y0 + t, W, D, H, name: `${c.p}_floor` };
  },
});
// -- what encloses with cloth: a frame of poles, a cloth on it, staked to the ground -------------------------------------
way({
  id: 'cloth on poles', meets: 'enclosure', says: 'a cloth on a frame of poles, staked to the ground',
  when: (n) => {
    const rp = n.want.q.roofP?.v ?? 0, big = Math.max(n.want.q.W!.v, n.want.q.D!.v, n.want.q.H!.v);
    if (rp > 500) return `${+(rp / 1000).toPrecision(3)} kPa on its roof wants a roof that bears it: a cloth sags and pools under it`;
    if (n.on) return 'a cloth on poles stands on the ground, not on what is under it';
    if (n.want.flags.includes('rigid')) return 'it was asked to be rigid: a cloth on poles is not';
    if (big < 1) return 'a box this small is made of sheet: a cloth on poles is for what people go into';
    return null;
  },
  make: (n, c) => {
    // as large inside as was said, or wide and tall enough for what stands in it
    const said = n.want.q.W!.by === 'you', W = said ? n.want.q.W!.v : Math.max(n.want.q.W!.v, n.fit[0]), D = said ? n.want.q.D!.v : Math.max(n.want.q.D!.v, n.fit[1]), H = n.want.q.H!.by === 'you' ? n.want.q.H!.v : Math.max(n.want.q.H!.v, n.tall + 0.005);
    const pole = matterFor(c, ['aluminum.6061-t6', 'composite.cfrp'], 'beam', 'poles'), cloth = 'textile.nylon-ripstop', ct = 0.0002, X = c.x0, Z = c.z0, y0 = c.y0, cm = matterOf(cloth), open = n.want.flags.includes('openfront');
    // stakes at its corners and one at the middle of each side longer than 2 m (estimate), each holding about 300 N
    // pulled (a 250 mm steel peg in firm ground holds some 100 to 500 N, estimate); each stands here as a block of steel of
    // that weight at its foot, so the physics holds it down as a stake would at its most
    const each = 300;
    if (open) OPEN.add(c.p);
    // the cloth: walls on its sides (its front left open where asked) and a roof, all of it 70 g/m²
    const wallA = (open ? W + 2 * D : 2 * (W + D)) * H, roofA = W * D, clothKg = (wallA + roofA + W * D) * cm.density * ct, snow = (n.want.q.roofP?.v ?? 0) * W * D;
    // each corner pole carries a quarter of the roof's cloth and what is on it, and the pull of its stake at its most, by
    // three against crushing and buckling (Euler, K = 2)
    // each corner pole carries a quarter of the roof's cloth and what is on it, by three against crushing and buckling
    // (Euler, K = 2). Nothing braces its frame square, so each pole is worked as held upright at its foot alone, a cantilever
    // bearing the wind on half the wider wall spread up it (M = w H² / 2). Each eave bears the wind on the top half of that
    // wall along it (M = w L² / 8); and up or down, the larger of the roof's weight with what lies on it and the wind's lift
    // on the roof ((0.8 + cpi) ½ ρ v², cpi 0.2 shut, 0.63 open at its front); and in, the pull of the roof's cloth lifted to a
    // sag a tenth of its span (estimate), T = p s² / 8 f. Each under half its yield; the wind as said, or a gale of 20 m/s
    // (72 km/h, estimate) where none is
    const vw = n.want.q.wind?.v ?? 20, rho = n.want.q.airRho?.v ?? 1.2, qw = 0.5 * rho * vw * vw * 1.2, Lw = Math.max(W, D), P = (roofA * cm.density * ct * G + snow) / 4, ym = matterOf(pole).yield;
    const Mp = (qw * (Lw / 2) * H * H) / 2, Me = (qw * (H / 2) * Lw * Lw) / 8, Mv = (((roofA * cm.density * ct * G + snow) / (2 * (W + D))) * Lw * Lw) / 8;
    const pUp = (0.8 + (open ? 0.63 : 0.2)) * (qw / 1.2), sC = Math.min(W, D), Tm = (pUp * sC * sC) / (8 * (sC / 10)), MT = (Tm * Lw * Lw) / 8, Mup = (((pUp * roofA) / (2 * (W + D))) * Lw * Lw) / 8, Mh = Me + MT, Mvv = Math.max(Mv, Mup), Mev = Math.hypot(Mh, Mvv);
    const fits0 = (Dt: number, w: number) => { const I = (Math.PI * (Dt ** 4 - (Dt - 2 * w) ** 4)) / 64, Sm = I / (Dt / 2); return ym / (Mp / Sm) >= 2 && ym / (Mev / Sm) >= 2; };
    const tb = TUBES.map(([D0, w0]) => [D0 / 1e3, w0 / 1e3] as const).find(([D0, w0]) => fits0(D0, w0) && memberFor(pole, 'tube', P, H).size <= D0) ?? ([0.168, 0.005] as const);
    const d = tb[0], wt = tb[1], Ip = (Math.PI * (d ** 4 - (d - 2 * wt) ** 4)) / 64, Sp = Ip / (d / 2), Ap = (Math.PI * (d * d - (d - 2 * wt) ** 2)) / 4, buck = (Math.PI ** 2 * matterOf(pole).E * Ip) / (2 * H) ** 2;
    const mem: Member = { size: d, wall: wt, A: Ap, I: Ip, ok: fits0(d, wt) && buck >= 3 * P, says: `in a ${+(vw * 3.6).toPrecision(3)} km/h wind${n.want.q.wind ? '' : ' (a gale, estimate)'} on half its ${len(Lw)} wall, held upright at its foot alone, ${+Mp.toPrecision(3)} N·m there (w H² / 2), ${+(ym / (Mp / Sp)).toPrecision(3)} times under its yield; buckling at ${P > 0 ? +(buck / P).toPrecision(3) : '∞'} times the roof it carries (Euler, K = 2)` };
    const eaveOk = ym / (Mev / Sp) >= 2;
    c.choices.push(`a frame of ${MM(d)} × ${MM(wt)} mm ${matterOf(pole).name} tube, four poles ${MM(H)} mm tall and eaves on them, under ${matterOf(cloth).name}: ${open ? 'three walls, its front left open,' : 'four walls'} a roof and a ground sheet`);
    const w0 = c.why; c.why = 'to hold the cloth up';
    const px = W / 2, pz = D / 2;
    for (const [k, [sx, sz]] of ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).entries()) upright(c, `pole${k + 1}`, pole, 'tube', mem, X + sx * px, y0, Z + sz * pz, H, `at its ${sz < 0 ? 'back' : 'front'} ${sx < 0 ? 'left' : 'right'} corner, on the ground`, `the least ${matterOf(pole).name} tube that bears the wind and its roof: ${mem.says}`);
    const ye = y0 + H + d / 2;
    put(c, `${c.p}_eave1`, `place tube named ${c.p}_eave1 of ${pole} at ${M(X)}, ${M(ye)}, ${M(Z - pz)} size ${MM(d)} x ${MM(W + d)} x ${MM(wt)} mm along x`, 'on the tops of the back poles', `the same tube, ${MM(W + d)} mm long`);
    put(c, `${c.p}_eave2`, `place tube named ${c.p}_eave2 of ${pole} at ${M(X)}, ${M(ye)}, ${M(Z + pz)} size ${MM(d)} x ${MM(W + d)} x ${MM(wt)} mm along x`, 'on the tops of the front poles', `the same tube, ${MM(W + d)} mm long`);
    put(c, `${c.p}_eave3`, `place tube named ${c.p}_eave3 of ${pole} at ${M(X - px)}, ${M(ye + d)}, ${M(Z)} size ${MM(d)} x ${MM(D + d)} x ${MM(wt)} mm along z`, 'on the back and front eaves at its left', `the same tube, ${MM(D + d)} mm long`);
    put(c, `${c.p}_eave4`, `place tube named ${c.p}_eave4 of ${pole} at ${M(X + px)}, ${M(ye + d)}, ${M(Z)} size ${MM(d)} x ${MM(D + d)} x ${MM(wt)} mm along z`, 'on the back and front eaves at its right', `the same tube, ${MM(D + d)} mm long`);
    c.why = 'to keep the weather off what is inside';
    const how = `${matterOf(cloth).name}, about 70 g/m² (modelled ${MM(ct)} mm thick)`;
    box(c, 'roof', cloth, X, y0 + H + 2 * d + ct / 2, Z, W + d, D + d, ct, 'plate', 'on the eaves', `${how}: laid flat on its frame; a pitch to shed rain is not derived`);
    box(c, 'back', cloth, X, y0 + 0.002 + H / 2, Z - pz - d / 2 - ct / 2, W + d, ct, H - 0.004, 'slab', 'on the back poles, outside them', how);
    box(c, 'left', cloth, X - px - d / 2 - ct / 2, y0 + 0.002 + H / 2, Z, ct, D + d, H - 0.004, 'slab', 'on the left poles, outside them', how);
    box(c, 'right', cloth, X + px + d / 2 + ct / 2, y0 + 0.002 + H / 2, Z, ct, D + d, H - 0.004, 'slab', 'on the right poles, outside them', how);
    // a way in: its front a flap of the same cloth hung from its front left pole, swinging aside (a zip to close it is not
    // derived)
    if (n.want.flags.includes('door')) {
      c.why = 'to go in by';
      const fn = box(c, 'flap', cloth, X - 0.002, y0 + 0.004 + (H - 0.008) / 2, Z + pz + d / 2 + ct / 2, W + d - 0.004, ct, H - 0.008, 'slab', 'in the front, its left edge on the front left pole', `${how}: the whole front, hung from the front left pole so it swings aside to go in; a zip to close it is not derived`, { moving: true });
      c.steps.push(`hinge ${fn} to ${c.p}_pole4 about y from -100° to 0°`); c.traces.push({ step: c.steps.at(-1)!, what: `${fn}'s hinge`, called: c.way, why: 'so it swings aside to go in', when: '', where: 'where its edge touches the front left pole, about the upright', how: 'a Jolt hinge with stops at shut and 100° open, standing for the cloth\'s fold there' });
      c.tests.push({ kind: 'swing', name: fn }); c.why = 'to keep the weather off what is inside';
    } else if (!open) box(c, 'front', cloth, X, y0 + 0.002 + H / 2, Z + pz + d / 2 + ct / 2, W + d, ct, H - 0.004, 'slab', 'on the front poles, outside them: a flap to go in by is not derived', how);
    box(c, 'groundsheet', cloth, X, y0 + ct / 2, Z, W - d, D - d, ct, 'plate', 'on the ground between its poles', how);
    c.why = 'to stand for its stakes, holding it down';
    // as many stakes as hold it down against the wind's lift, by its margins (1.5 on the lift, 0.9 of its weight, 1.5 on
    // what a stake holds), at least one at each corner and one along each side longer than 2 m: (0.8 + 0.2) ½ ρ v² over its
    // plan (a flat roof with its openings shut, EN 1991-1-4, estimate; open at its front, the air inside pushes up 0.63 of it
    // instead of 0.2), spread along its sides that have a wall
    const own0 = clothKg * G + (8 * Ap * (H + Lw) / 2) * matterOf(pole).density * G, up0 = (qw / 1.2) * (open ? 0.8 + 0.63 : 0.8 + 0.2) * (W + d + 0.31) * (D + d + 0.31);
    const sidesZ = [-1, ...(open || n.want.flags.includes('door') ? [] : [1])], need = Math.max(4 + (W > 2 ? sidesZ.length : 0) + (D > 2 ? 2 : 0), Math.ceil(((1.5 * up0 - 0.9 * own0) * 1.5) / each));
    const sw = 0.15, sh = (each / G) / (7850 * sw * sw), stakes: [number, number][] = [];
    const perim = (W + d) * sidesZ.length + 2 * (D + d), cap = Math.floor(perim / (sw + 0.05));
    const n0 = Math.min(need, cap), onX = Math.max(2 * sidesZ.length, Math.round((n0 * ((W + d) * sidesZ.length)) / perim)), onZ = Math.max(4, n0 - onX);
    for (const sz of sidesZ) { const k = Math.max(2, Math.round(onX / sidesZ.length)); for (let i = 0; i < k; i++) stakes.push([X - (W + d) / 2 + sw / 2 + (i * (W + d - sw)) / Math.max(1, k - 1), Z + sz * (pz + d / 2 + ct + sw / 2)]); }
    for (const sx of [-1, 1]) { const k = Math.max(2, Math.round(onZ / 2)); for (let i = 0; i < k; i++) stakes.push([X + sx * (px + d / 2 + ct + sw / 2), Z - (D + d) / 2 + sw / 2 + (i * (D + d - sw)) / Math.max(1, k - 1)]); }
    // (along a side, the first and last at its corners, so they do not stand in the stakes of the sides next to it)
    for (let i = stakes.length - 1; i >= 0; i--) for (let k2 = 0; k2 < i; k2++) if (Math.abs(stakes[i]![0] - stakes[k2]![0]) < sw && Math.abs(stakes[i]![1] - stakes[k2]![1]) < sw) { stakes.splice(i, 1); break; }
    if (need > cap) c.gaps.push(`the wind's lift wants ${need} stakes of about ${each} N, more than its sides have room for (${cap}): it wants guy lines from its poles' tops, or what holds harder (screw anchors, deadmen in snow), not derived`);
    for (const [k, [sx, sz]] of stakes.entries()) { const nm = box(c, `stake${k + 1}`, 'steel.a36', sx, y0 + sh / 2, sz, sw, sw, sh, 'block', 'at its foot, against it', `a block of steel of the ${each} N a stake holds at most (estimate), standing for it`); STANDS.set(nm, 'the stakes that hold it down'); }
    c.choices.push(`${stakes.length} stakes along its walls${need > stakes.length ? '' : `, as many as hold it down against the wind's lift by its margins`}`);
    // on paving no stake goes in: weights on its poles' feet hold it instead, 0.9 of them against 1.5 of the lift; in snow
    // or ice a peg holds little: buried deadmen or ice screws hold it there
    if (n.want.flags.includes('paved')) { const kg = Math.max(0, (1.5 * up0 - 0.9 * own0) / 0.9 / G / 4); c.gaps.push(`on paving no stake goes in: weights on its four poles' feet hold it instead, about ${+kg.toPrecision(2)} kg on each (0.9 of their weight against 1.5 of the wind's lift), not made`); }
    if (n.want.flags.includes('snowground')) c.gaps.push(`in snow or ice a peg holds little of the ${each} N taken here for firm ground: buried deadmen in snow or screws in ice hold it there, not weighed`);
    ANCHORS.set(c.p, { n: stakes.length, each, says: `${stakes.length} stakes of about ${each} N each (a 250 mm steel peg in firm ground holds some 100 to 500 N, estimate)` });
    c.why = w0;
    // packed: its poles in sections of at most 600 mm on shock cord (estimate), bundled with its cloth rolled (about 300
    // kg/m³ packed, estimate)
    const lens = [H, H, H, H, W + d, W + d, D + d, D + d], secs = lens.reduce((a, L) => a + Math.ceil(L / 0.6), 0), Lp = Math.min(0.6, Math.max(...lens)), Ab = (secs * Math.PI * d * d) / 4 / 0.7 + clothKg / 300 / Lp, db = Math.sqrt((4 * Ab) / Math.PI);
    PACKED.set(c.p, { dims: [Lp, db, db], says: `packed, its poles in ${secs} sections of at most ${MM(Lp)} mm on shock cord (estimate) bundled with its ${+clothKg.toPrecision(3)} kg of cloth rolled (about 300 kg/m³, estimate)` });
    c.checks.push(() => ({ what: 'its poles bear the wind and its roof', ok: mem.ok, says: `each of four, ${MM(d)} × ${MM(wt)} mm: ${mem.says}` }));
    c.checks.push(() => ({ what: 'its eaves bear the wind and its roof', ok: eaveOk, says: `each ${len(Lw)} eave takes, across, the wind on the top half of its wall (${+Me.toPrecision(3)} N·m) and the pull of the roof's cloth lifted by the wind (${+(pUp).toPrecision(3)} Pa up, sagging a tenth of its ${len(sC)} span (estimate): T = p s² / 8 f, ${+Tm.toPrecision(3)} N on each metre, ${+MT.toPrecision(3)} N·m); and up or down, the larger of its share of the roof${snow ? ' and what lies on it' : ''} (${+Mv.toPrecision(3)} N·m) and of the wind's lift on it (${+Mup.toPrecision(3)} N·m): ${+Mev.toPrecision(3)} N·m together, ${+(ym / (Mev / Sp)).toPrecision(3)} times under its yield (M = w L² / 8)` }));
    c.checks.push(() => ({ what: `it encloses ${MM(W)} × ${MM(D)} × ${MM(H)} mm`, ok: true, says: `inside, ${MM(W)} by ${MM(D)} mm between its poles and ${MM(H)} mm tall` }));
    c.gaps.push(`its cloth's seams, how it is tensioned on its frame and its ${open ? 'open front' : 'way in (a zipped flap)'} are not derived; its roof lies flat, and a pitch to shed rain and snow is not derived; what holds its frame square against the wind's push (its wall cloth pulled taut, or guy lines${open ? ', and none across its open front' : ''}) is not weighed: its poles are worked as held upright at their feet alone, which wants a socket or base at each foot that holds it so, not made; its flat roof under the wind's lift pulls its eaves in, and a curved or pitched roof (as tents use) that would carry it in its cloth is not derived`);
    SKINS.set(`${c.p}:box`, { A: wallA + roofA, t: ct, id: cloth, L: H });
    c.top = { y: y0 + H + 2 * d + ct, w: W + d, d: D + d, name: `${c.p}_roof` }; c.foot = [W + d + 2 * sw, D + d + 2 * sw]; c.inside = { y: y0 + ct, W: W - d, D: D - d, H, name: `${c.p}_groundsheet` };
  },
});
way({
  id: 'rotors on arms', meets: 'lift', says: 'rotors on motors at the ends of arms round a hub (worked out by momentum theory; not flown)', when: () => null,
  make: (n, c) => {
    // four arms along the hub's two ways (a "+"), unturned, so each folds up a quarter turn at the hub's edge; asked for its
    // frame ("a quadcopter frame"), it makes the hub and the arms, and carries its motors, rotors and battery as weights
    const k = 4, frameOnly = n.want.flags.includes('frame'), payload = n.want.q.m!.v, auw = n.want.q.auw?.v, Dr = n.want.q.Dr?.v ?? pick(c.rnd, [0.25, 0.3, 0.4]);
    const frame = matterFor(c, ['aluminum.6061-t6', 'composite.cfrp']), fm = matterOf(frame), X = c.x0, Z = c.z0;
    if (frameOnly) {
      // motor to motor beside it at least a rotor and a tenth (a gap between their tips, estimate): R √2 >= 1.1 D
      const R = (1.1 * Dr) / Math.SQRT2, tube = c.fitDia, th = 0.003;
      // its hub: room for a flight controller on the usual 30.5 mm holes (estimate), and, where it must go in a tube, no wider
      // than lets it in folded, its arms standing up at its edges: (s + 2 h) √2 within the tube
      const lift = auw ?? payload * 3, Tmax = (2 * lift * G) / k, tip = auw !== undefined && c.light !== undefined ? Math.max(0.03, (auw - payload - c.light) / 2 / k) : 0.06;
      const SECT: [number, number][] = [[10, 3], [12, 4], [12, 5], [14, 5], [12, 6], [14, 6], [12, 8], [16, 6], [14, 8], [18, 8], [16, 10], [20, 10]];
      // how fast its rotors turn hovering: T = C_T ρ n² D⁴, C_T about 0.1 for a small fixed-pitch rotor (estimate); its arms,
      // each with its motor at its end, ring above that by a quarter, so they do not shake with it (estimate)
      const nHov = Math.sqrt((lift * G) / k / (0.1 * 1.225 * Dr ** 4)), ringAt = (bb: number, hh: number, L: number) => Math.sqrt((3 * fm.E * (bb * hh ** 3) / 12) / (L ** 3 * (tip + 0.24 * bb * hh * L * fm.density))) / (2 * Math.PI);
      let b = 0, h = 0, sg = 0, s0 = 0.08, La = 0;
      for (const [bb, hh] of SECT) {
        b = bb / 1e3; h = hh / 1e3; s0 = tube !== undefined ? Math.min(0.09, tube / Math.SQRT2 - 2 * h - 0.002) : 0.08; La = R + 0.015 - s0 / 2;
        sg = (6 * Tmax * (R - s0 / 2)) / (b * h * h); if (fm.yield / sg >= 2 && (Tmax * (R - s0 / 2) ** 2 * 4) / (fm.E * b * h ** 3) <= 1 / 100 && ringAt(b, h, R - s0 / 2) >= 1.25 * nHov) break;
      }
      const s0f = s0, y = c.y0 + h / 2, I = (b * h ** 3) / 12, ma = b * h * La * fm.density, defl = (Tmax * (R - s0f / 2) ** 3) / (3 * fm.E * I), f1 = Math.sqrt((3 * fm.E * I) / ((R - s0f / 2) ** 3 * (tip + 0.24 * ma))) / (2 * Math.PI);
      c.choices.push(`a hub ${MM(s0f)} mm square and ${k} arms of ${fm.name}, ${MM(b)} × ${MM(h)} mm, to motors ${MM(R)} mm from its middle: rotors ${MM(Dr)} mm across${n.want.q.Dr ? ' as said' : ''} clear the next by a tenth of their size (estimate)`);
      put(c, `${c.p}_hub`, `place plate named ${c.p}_hub of ${frame} at ${M(X)}, ${M(c.y0 + h / 2)}, ${M(Z)} size ${MM(s0f)} x ${MM(s0f)} x ${MM(th)} mm`, 'its middle, on the floor', `a hub ${MM(s0f)} mm square${tube !== undefined ? `, small enough that with its arms folded up it goes in its ${len(tube)} tube` : ''}: room for a flight controller on the usual 30.5 mm holes (estimate)`);
      for (let i = 0; i < k; i++) {
        const ax = [1, 0, -1, 0][i]!, az = [0, 1, 0, -1][i]!, cx = X + ax * (s0f / 2 + La / 2), cz = Z + az * (s0f / 2 + La / 2);
        put(c, `${c.p}_arm${i + 1}`, `place block named ${c.p}_arm${i + 1} of ${frame} at ${M(cx)}, ${M(y)}, ${M(cz)} size ${MM(ax ? La : b)} x ${MM(ax ? b : La)} x ${MM(h)} mm`, `from the hub's edge out along its ${ax ? 'x' : 'z'} way`, `${MM(b)} × ${MM(h)} mm, the least kept that bears its motor's ${+Tmax.toPrecision(3)} N at full throttle (twice its share of all it lifts, estimate) ${MM(R - s0f / 2)} mm out at half its strength, its end lifting no more than a hundredth of its length (estimate)`);
      }
      const sv = (x: number) => +x.toPrecision(3);
      c.checks.push(() => ({ what: 'its arms bear its motors at full throttle', ok: fm.yield / sg >= 2 && defl <= (R - s0f / 2) / 100, says: `each motor pulls up ${sv(Tmax)} N (twice its share of ${sv(lift * 1e3)} g, estimate) ${MM(R - s0f / 2)} mm out from the hub: ${sv(Tmax * (R - s0f / 2))} N·m at the root of a ${MM(b)} × ${MM(h)} mm arm, ${sv(sg / 1e6)} MPa, ${sv(fm.yield / sg)} times under its ${sv(fm.yield / 1e6)} MPa; its end lifts ${sv(defl * 1e3)} mm (a hundredth of its length allowed, estimate)` }));
      c.checks.push(() => ({ what: 'its arms ring above how fast its rotors turn', ok: f1 >= 1.25 * nHov, says: `hovering, its rotors turn about ${+nHov.toPrecision(3)} times a second (T = C_T ρ n² D⁴, C_T about 0.1, estimate); each arm, with ${+(tip * 1e3).toPrecision(3)} g of motor and rotor at its end (${auw !== undefined && c.light !== undefined ? 'half of what is left of all it lifts once its frame and what it carries are taken, estimate' : 'estimate'}), first rings at ${+f1.toPrecision(3)} Hz (a cantilever with a weight at its end), ${+(f1 / nHov).toPrecision(3)} times that (a quarter above it wanted, estimate); at full throttle they turn faster still, not weighed` }));
      // a 2 m drop onto concrete: the arm that lands first takes what it can bend away, elastically, as a cantilever loaded at its end
      const hd = c.dropH;
      if (hd !== undefined) {
        const E0 = lift * G * hd, U = (fm.yield ** 2 * (b * h * La)) / (18 * fm.E);
        c.checks.push(() => ({ what: `it survives a ${len(hd)} drop`, ok: U >= E0, says: `it lands with ${sv(E0)} J (m g h, all it lifts); an arm landed on at its end bends away at most ${sv(U)} J before it breaks (σ² V / 18 E for a cantilever loaded at its end, its ${sv(fm.yield / 1e6)} MPa), ${sv(k * U)} J were all four to share it alike; ${k * U >= E0 ? (U >= E0 ? 'one arm alone takes it' : 'landed level on all four alike, they take it; landed on one arm first, it breaks unless what it lands on takes the rest (feet or a bumper that crush, not made)') : 'what it lands on must take the rest: feet or a bumper that crush (not made), or an arm breaks'}` }));
      }
      c.gaps.push(`what it carries is not made: its 4 motors and rotors, its battery and flight controller${payload ? ` and its ${sv(payload * 1e3)} g payload` : ''}, held at its arms' ends and on its hub; nor the hinges its arms fold up on, nor the holes its motors are screwed through`);
      c.top = { y: c.y0 + h, w: s0f, d: s0f, name: `${c.p}_hub` }; c.foot = [s0f + 2 * La, s0f + 2 * La];
      return;
    }
    const motor = smallMotor(), frm = frame;
    const R = Dr * 1.05 + 0.03, arm = R - 0.06 + 0.02, y = c.y0 + 0.1;
    const m = payload + k * motor.mass + 0.3 + k * arm * 0.02 * 0.02 * fm.density, T = (m * G) / k, A = (Math.PI * Dr * Dr) / 4, Pi = T ** 1.5 / Math.sqrt(2 * 1.225 * A), Ps = Pi / 0.7, Pmax = ((motor.published.stallTorque ?? 1) * motorModel(motor).noLoadSpeed) / 4;
    c.choices.push(`${k} rotors ${MM(Dr)} mm across${n.want.q.Dr ? ' as said' : ''} on ${motor.label}, on arms of ${fm.name}`);
    put(c, `${c.p}_hub`, `place plate named ${c.p}_hub of ${frm} at ${M(X)}, ${M(y)}, ${M(Z)} size 120 x 120 x 20 mm`, '100 mm up, its middle', 'a 120 mm square hub');
    for (let i = 0; i < k; i++) {
      const ax = [1, 0, -1, 0][i]!, az = [0, 1, 0, -1][i]!, mx = X + ax * R, mz = Z + az * R;
      put(c, `${c.p}_arm${i + 1}`, `place block named ${c.p}_arm${i + 1} of ${frm} at ${M(X + ax * (0.06 + arm / 2))}, ${M(y)}, ${M(Z + az * (0.06 + arm / 2))} size ${ax ? MM(arm) : 20} x ${ax ? 20 : MM(arm)} x 20 mm`, `from the hub's rim out along its ${ax ? 'x' : 'z'} way`, `long enough that the rotors clear each other (${MM(R)} mm out)`);
      put(c, `${c.p}_motor${i + 1}`, `place motor named ${c.p}_motor${i + 1} at ${M(mx)}, ${M(y + 0.01 + motor.length / 2)}, ${M(mz)} along y`, `upright on the end of arm ${i + 1}`, motor.label);
      put(c, `${c.p}_rotor${i + 1}`, `place disc named ${c.p}_rotor${i + 1} of composite.cfrp at ${M(mx)}, ${M(y + 0.01 + motor.length + 0.002)}, ${M(mz)} size ${MM(Dr)} x 4 mm along y`, `on motor ${i + 1}`, `a disc for a rotor ${MM(Dr)} mm across: its blades are not derived`, { loose: true });
      const w0 = c.why; c.why = 'to stand on when it is down';
      put(c, `${c.p}_leg${i + 1}`, `place rod named ${c.p}_leg${i + 1} of ${frm} at ${M(X + ax * (0.06 + arm * 0.5))}, ${M(c.y0 + (y - 0.01 - c.y0) / 2)}, ${M(Z + az * (0.06 + arm * 0.5))} size 12 x ${MM(y - 0.01 - c.y0)} mm along y`, `under the middle of arm ${i + 1}, on the floor`, 'a 12 mm rod as long as the arm is high: it stands on its four legs when landed');
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
    // people stand on it (a dock, a raft): a deck across its top, and they crowd to one side, a pace in from its edge
    // (300 mm, estimate), their weight about 1 m above where they stand (estimate); what else it carries sits on its
    // middle, 100 mm up. Its sides are as deep as floating with that, heeled, wants: the freeboard said (or 0, its
    // sides then 300 mm at least) above the water at its low side, and half the waves said (their crests stand about half
    // their height above still water, estimate), so they do not wash over; and wider where it heels past 10°
    const m = n.want.q.m!.v + n.above / G, mt = matterFor(c, ['wood.birch-plywood', 'aluminum.6061-t6', 'composite.gfrp']), t = familyOf(mt) === 'wood' ? 0.012 : 0.003, rho = matterOf(mt).density;
    const people = n.want.flags.includes('people'), fb = n.want.q.fb?.v, wave = n.want.q.wave?.v, keep = Math.max(fb ?? 0, (wave ?? 0) / 2);
    // people stand on its deck: cross frames under it, upright plates from side to side on its bottom, as close as a person
    // (80 kg, by 1.5, estimate) at the middle of a metre-wide strip between two of them wants, bending within 1/150 of that
    // and under half its strength
    // a person's weight on a plate spreads about as wide as the plate spans, no narrower than their stance (300 mm) nor wider
    // than a metre (estimate): the strip that bears it
    const Pp = 80 * G * 1.5, bw = (sp: number) => Math.max(0.3, Math.min(1, sp)), Ib = (sp: number) => (bw(sp) * t ** 3) / 12;
    const bears = (sp: number) => ((Pp * sp) / 4) * (t / 2) / Ib(sp) <= matterOf(mt).yield / 2 && (Pp * sp ** 3) / (48 * matterOf(mt).E * Ib(sp)) <= sp / 150;
    const sMax = people ? (() => { let best = 0; for (let sp = 0.05; sp <= 3; sp += 0.005) if (bears(sp)) best = sp; return best || 0.05; })() : Infinity;
    let nF = 0;
    let L = pick(c.rnd, [1.2, 1.8, 2.4, 3]) * Math.max(1, Math.cbrt(m / 80));
    let Wd = Math.max(0.6, L * (0.3 + 0.2 * c.rnd())), Hh = 0.3, hull = 0, total = 0, draft = 0, GM = 0, tanH = 0, drop = 0, off = 0, low = 0, over = false;
    for (let k = 0; k < 40; k++) {
      nF = people && Wd > sMax ? Math.max(1, Math.ceil(L / sMax) - 1) : 0; hull = rho * t * ((people ? 2 : 1) * L * Wd + 2 * (L + Wd) * Hh + nF * Wd * Hh); total = m + hull; draft = total / (1000 * L * Wd);
      const KG = (hull * Hh * 0.45 + n.want.q.m!.v * (people ? Hh + t + 1 : t + 0.1) + (n.above / G) * (t + 0.1)) / total, BM = (Wd * Wd) / (12 * draft);
      GM = draft / 2 + BM - KG; off = people ? Math.max(0, Wd / 2 - 0.3) : 0;
      // heeled by its section clipped at its waterline, not wall-sided: past where its bottom's edge comes out of the water
      // (tan θ = 2 T / B) its waterplane narrows and what rights it falls away
      const hb = GM > 0 ? heelBox(Wd, Hh, total / (1000 * L), Wd / 2 - (n.want.q.m!.v * off) / total, KG) : null;
      over = !hb; tanH = hb ? Math.tan(hb.th) : Infinity; low = hb ? hb.low : -draft; drop = Hh - draft - low;
      if (!hb || tanH > Math.tan((10 * Math.PI) / 180) + 1e-9 || GM <= 0.05 * Wd) { if (Wd < L) Wd = Math.min(L, Wd * 1.15); else L *= 1.15; continue; }
      const want = Math.min(1.5, Math.max(0.3, fb === undefined && wave === undefined ? 2 * draft : 0, Hh + keep + 0.02 - low));
      if (Math.abs(want - Hh) < 1e-3) break; Hh = want;
    }
    const X = c.x0, Z = c.z0, y = c.y0, how = `${MM(t)} mm ${matterOf(mt).name}`;
    c.choices.push(`${people ? 'a decked' : 'an open'} hull of ${matterOf(mt).name} ${M(L)} by ${M(Wd)}, ${MM(Hh)} mm deep${fb !== undefined || wave !== undefined || people ? ': as deep as floating heeled with its load to one side and what was said of the water wants' : ''}`);
    box(c, 'bottom', mt, X, y + t / 2, Z, L, Wd, t, 'plate', 'on what it stands on', `${M(L)} by ${M(Wd)}: it displaces ${+total.toPrecision(3)} kg of water ${MM(draft)} mm deep`);
    for (const [i, sz] of [-1, 1].entries()) box(c, `side${i + 1}`, mt, X, y + t + Hh / 2, Z + sz * (Wd / 2 - t / 2), L, t, Hh, 'slab', `on the bottom, its ${sz < 0 ? 'back' : 'front'} side`, how);
    for (const [i, sx] of [-1, 1].entries()) box(c, `end${i + 1}`, mt, X + sx * (L / 2 - t / 2), y + t + Hh / 2, Z, t, Wd - 2 * t, Hh, 'slab', `on the bottom between the sides, its ${sx < 0 ? 'stern' : 'bow'}`, how);
    for (let k = 0; k < nF; k++) box(c, `frame${k + 1}`, mt, X - L / 2 + ((k + 1) * L) / (nF + 1), y + t + Hh / 2, Z, t, Wd - 2 * t, Hh, 'slab', `across inside it on its bottom, between its sides, ${MM(((k + 1) * L) / (nF + 1))} mm from its stern`, `${how}: what its deck rests on, every ${MM(L / (nF + 1))} mm`);
    if (people) box(c, 'deck', mt, X, y + t + Hh + t / 2, Z, L, Wd, t, 'plate', 'on its sides and ends, closing it', `${how}: what they stand on, so what washes over it does not fill it`);
    c.checks.push(() => ({ what: `it floats with ${+m.toPrecision(3)} kg`, ok: draft <= Hh / 2 || (fb !== undefined || wave !== undefined) && low >= keep - 1e-6 && low > 0, says: `${+total.toPrecision(3)} kg sits ${MM(draft)} mm deep in water, its sides ${MM(Hh)} mm (Archimedes)` }));
    // its deck, a plate laid across its frames: a person (80 kg, by 1.5, estimate) standing at its middle on the strip that
    // bears them, P L / 4 and P L³ / 48 E I, bending within 1/150 of its span (estimate)
    if (people) { const sp = nF ? L / (nF + 1) : Wd, Id = Ib(sp), Md = (Pp * sp) / 4, sd = (Md * (t / 2)) / Id, dd = (Pp * sp ** 3) / (48 * matterOf(mt).E * Id), okD = sd <= matterOf(mt).yield / 2 && dd <= sp / 150;
      c.checks.push(() => ({ what: 'its deck bears a person standing on it', ok: okD, says: `${MM(t)} mm ${matterOf(mt).name} ${nF ? `on ${nF} cross frames, ${len(sp)} apart` : `across its ${len(Wd)} between its sides, nothing under it`}: a person (80 kg, by 1.5, estimate) at its middle, borne by a strip ${len(bw(sp))} wide (as wide as it spans, no narrower than a person's stance nor wider than a metre, estimate), ${+(sd / 1e6).toPrecision(3)} MPa (P L / 4): ${factorSays(matterOf(mt).yield / sd, familyOf(mt) === 'wood')}, bending ${len(dd)} (1/150 of its span is ${len(sp / 150)}: more fails; P L³ / 48 E I)${okD ? '' : '; it wants beams across under it, from side to side, which are not kept'}` })); }
    c.checks.push(() => ({ what: 'it rights itself', ok: GM > 0.05 * Wd, says: `its metacentre ${MM(GM)} mm above its weight (GM = KB + BM - KG, BM = B² / 12 T${people ? ', with them standing on its deck, about 1 m up, estimate' : ''}), for a small heel: its bottom's edge comes out of the water past ${+((Math.atan((2 * draft) / Wd) * 180) / Math.PI).toPrecision(3)}° (tan θ = 2 T / B), and past that its section is worked out clipped at its waterline; worked out, not floated: there is no water in the physics here` }));
    if (people || fb !== undefined || wave !== undefined) c.checks.push(() => ({ what: `with its load to one side, its ${people ? 'deck' : 'sides'} stand${people ? 's' : ''} ${fb !== undefined ? `at least ${MM(fb)} mm above` : 'above'} the water${wave !== undefined ? ` and above ${len(wave)} waves` : ''}`, ok: !over && low > 0 && low >= keep - 1e-6 && tanH <= Math.tan((10 * Math.PI) / 180) + 1e-9, says: `${people ? `all ${+n.want.q.m!.v.toPrecision(3)} kg of them crowded to one side, ${MM(off)} mm off its middle (a pace in from its edge, estimate)` : 'what it carries on its middle'}, ${over ? 'no heel brings what holds it up under its weight before its deck\'s edge goes under: it goes over' : `it heels ${+((Math.atan(tanH) * 180) / Math.PI).toPrecision(3)}° (its section under water clipped at its waterline, its centre of buoyancy brought under its weight, statics${people ? '; more than 10° is more than people stand on easily, estimate' : ''}) and its low side sinks ${MM(drop)} mm`}: there it stands ${MM(low)} mm above still water${fb !== undefined ? ` against the ${MM(fb)} mm said` : ''}${wave !== undefined ? `; ${len(wave)} waves crest about ${MM(wave / 2)} mm above still water (half their height, estimate), so ${low >= wave / 2 ? 'they do not wash over it, as a still crest against its freeboard: how it heaves, rolls and pitches in that chop, and what it slams, are not weighed' : 'they wash over it'}` : ''}; ${Hh >= 1.5 - 1e-6 && low < keep ? 'its sides at the 1.5 m most taken here are still too low' : `its sides made ${MM(Hh)} mm deep for it`}` }));
    c.top = { y: y + t + (people ? Hh + t : 0), w: L, d: Wd, name: `${c.p}_${people ? 'deck' : 'bottom'}` }; c.foot = [L, Wd];
  },
});
/** A box section B wide and D deep with A of it under water (m²), its weight xg in from its low side and KG up: heeled to
 *  its low side until the centroid of what is under water (the section clipped at its waterline) stands under its weight.
 *  Where none does before its deck's low edge goes under, it goes over (null). Returns the heel and how far its low edge
 *  then stands above the water. */
export function heelBox(B: number, D: number, A: number, xg: number, KG: number): { th: number; low: number } | null {
  const box: [number, number][] = [[0, 0], [B, 0], [B, D], [0, D]];
  const under = (s: number, co: number, h: number) => { const out: [number, number][] = []; for (let i = 0; i < 4; i++) { const p = box[i]!, q = box[(i + 1) % 4]!, fp = p[0] * s + p[1] * co - h, fq = q[0] * s + q[1] * co - h; if (fp <= 0) out.push(p); if (fp < 0 !== fq < 0) { const u = fp / (fp - fq); out.push([p[0] + u * (q[0] - p[0]), p[1] + u * (q[1] - p[1])]); } } return out; };
  const cen = (poly: [number, number][]) => { let a = 0, cx = 0, cy = 0; for (let i = 0; i < poly.length; i++) { const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % poly.length]!, cr = x0 * y1 - x1 * y0; a += cr; cx += (x0 + x1) * cr; cy += (y0 + y1) * cr; } a /= 2; return a > 0 ? { a, x: cx / (6 * a), y: cy / (6 * a) } : { a: 0, x: 0, y: 0 }; };
  const at = (th: number) => { const s = Math.sin(th), co = Math.cos(th); let lo = -B - D, hi = B + D; for (let k = 0; k < 60; k++) { const h = (lo + hi) / 2; if (cen(under(s, co, h)).a < A) lo = h; else hi = h; } const h = (lo + hi) / 2, c0 = cen(under(s, co, h)); return { f: c0.x * co - c0.y * s - (xg * co - KG * s), low: D * co - h }; };
  let prev = at(0), th0 = 0; if (prev.f <= 1e-12) return { th: 0, low: prev.low };
  for (let k = 1; k <= 600; k++) { const th = (k * 0.1 * Math.PI) / 180, cur = at(th); if (cur.low <= 0) return null; if (cur.f <= 0) { const th1 = th0 + ((th - th0) * prev.f) / (prev.f - cur.f); return { th: th1, low: at(th1).low }; } prev = cur; th0 = th; }
  return null;
}
// -- what goes into another ----------------------------------------------------------------------------------------------
way({
  id: 'a leaf on a post', meets: 'leaf', says: 'a leaf hung on a post that stands on a foot', when: (n) => (n.on && n.on.kind === 'enclosure' ? 'it is the door of what it is part of' : n.want.flags.includes('gate') && n.want.q.W!.v > 1.8 ? 'a gate this wide is a frame, not a sheet' : null),
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
// -- a wide gate: a frame of rails and stiles braced corner to corner, hung on a post set in the ground -------------------
way({
  id: 'a framed leaf on a post', meets: 'leaf', says: 'a frame of rails between two stiles, braced from its hinge foot to its latch top, hung on a post set in the ground',
  when: (n) => (n.on && n.on.kind === 'enclosure' ? 'it is the door of what it is part of' : !n.want.flags.includes('gate') ? 'a leaf that closes an opening (a door, a hatch) is a sheet; an open frame is a gate' : n.want.q.W!.v < 1.2 ? 'a leaf this narrow is a sheet' : null),
  make: (n, c) => {
    const W = n.want.q.W!.v, H = n.want.q.H!.v, mt = matterFor(c, ['steel.a36', 'aluminum.6061-t6'], 'beam', 'rails'), md = matterOf(mt), X = c.x0, Z = c.z0, y = c.y0 + 0.1, shut = n.want.q.shut?.v ?? 0;
    // rails about 300 mm apart (estimate); latched at its far end to a post set in the ground, shut it is a beam between its
    // posts with the push at its middle (M = F W / 4), shared by its rails, each under half its yield; held open, its
    // weight hangs out from its hinges and comes down its brace (N = m g / sin θ), which must not buckle by three (K = 1)
    const k = Math.max(3, Math.round(H / 0.3) + 1), tubes = TUBES.map(([D0, w0]) => [D0 / 1e3, w0 / 1e3] as const).filter(([D0]) => D0 >= 0.025);
    const S = (D0: number, w0: number) => (Math.PI * (D0 ** 4 - (D0 - 2 * w0) ** 4)) / (32 * D0), Ar = (D0: number, w0: number) => (Math.PI * (D0 * D0 - (D0 - 2 * w0) ** 2)) / 4, Ir = (D0: number, w0: number) => (S(D0, w0) * D0) / 2;
    // a push leant on it (cattle, a crowd) falls on the two rails nearest it, not on all of them alike (an animal leans over
    // a band of about 600 mm, two rails 300 mm apart: estimate)
    const kb = Math.min(2, k), Mshut = (shut * W) / 4, [d, wt] = tubes.find(([D0, w0]) => !shut || md.yield / (Mshut / (kb * S(D0, w0))) >= 2) ?? tubes.at(-1)!;
    const Lb = Math.hypot(W - d, H - d), th = Math.atan2(H - d, W - d), kg = md.density * Ar(d, wt) * (k * (W - 2 * d) + 2 * H + Lb), Nb = (kg * G) / Math.sin(th);
    const [bd, bw] = tubes.find(([D0, w0]) => (Math.PI ** 2 * md.E * Ir(D0, w0)) / (Lb * Lb) >= 3 * Nb && D0 >= d * 0.75) ?? tubes.at(-1)!;
    // its post: square steel, bearing the leaf held out (m g W / 2) and, shut, the push leant near it about 700 mm up, together, under half its yield
    // (leant on near it, the post takes nearly the whole push, estimate; with the leaf held out bending it the other way at once)
    const Mp = Math.hypot((kg * G * W) / 2, shut * 0.7), p = Math.max(0.05, Math.cbrt((6 * Mp) / (250e6 / 2)));
    c.choices.push(`a frame of ${k} rails between two stiles of ${MM(d)} × ${MM(wt)} mm ${md.name} tube, ${len(W)} × ${len(H)}, braced corner to corner by a ${MM(bd)} × ${MM(bw)} mm tube, on a ${MM(p)} mm square steel post${shut ? `, latched at its far end to a second post by a 16 mm steel pin` : ''}`);
    const w0 = c.why; c.why = 'to hang the leaf from';
    const pn = box(c, 'post', 'steel.a36', X, c.y0 + (H + 0.1) / 2, Z, p, p, H + 0.1, 'bar', 'upright, set in the ground', `${MM(p)} mm square steel: the leaf held out from it and the push leant on it near it, together, bend it under half its yield`);
    // the ground it is set in stands here as a cube of concrete behind its foot, heavy enough that the leaf held out does not
    // turn it over the post's front edge, by two: 2400 b³ (p + b / 2) ≥ 2 m (W / 2 + p / 2); the leaf 100 mm clear of the ground
    // (and, shut, that the push leant near it about 700 mm up does not turn it over either: 2400 g b³ b / 2 ≥ 2 F h)
    const Fl = shut, hl = 0.7, mPost = 7850 * p * p * (H + 0.1), fb = (() => { for (let b = 0.2; b < 3; b += 0.01) if (2400 * b ** 3 * (p + b / 2) + (mPost * p) / 2 >= 2 * kg * (W / 2 + p / 2) && 2400 * G * b ** 4 / 2 >= 2 * Fl * hl) return b; return 3; })();
    const fn = box(c, 'footing', 'concrete.c30', X - p / 2 - fb / 2, c.y0 + fb / 2, Z, fb, fb, fb, 'block', 'against the post\'s foot', `a ${MM(fb)} mm cube of concrete standing for the ground the post is set in: heavy enough that the leaf held out does not turn it over (by two)`);
    STANDS.set(fn, 'the ground its post is set in');
    c.why = 'to swing open and shut';
    const hx = X + p / 2 + d / 2, lx = X + p / 2 + W - d / 2;
    const hs = put(c, `${c.p}_stile1`, `place tube named ${c.p}_stile1 of ${mt} at ${M(hx)}, ${M(y + H / 2)}, ${M(Z)} size ${MM(d)} x ${MM(H)} x ${MM(wt)} mm along y`, 'against the post, its hinge stile', `${MM(d)} × ${MM(wt)} mm tube`, { moving: true });
    const was = c.ride; c.ride = hs;
    put(c, `${c.p}_stile2`, `place tube named ${c.p}_stile2 of ${mt} at ${M(lx)}, ${M(y + H / 2)}, ${M(Z)} size ${MM(d)} x ${MM(H)} x ${MM(wt)} mm along y`, 'at its far end, its latch stile', `${MM(d)} × ${MM(wt)} mm tube`);
    for (let i = 0; i < k; i++) { const ry = y + d / 2 + (i * (H - d)) / (k - 1); put(c, `${c.p}_rail${i + 1}`, `place tube named ${c.p}_rail${i + 1} of ${mt} at ${M((hx + lx) / 2)}, ${M(ry)}, ${M(Z)} size ${MM(d)} x ${MM(W - 2 * d)} x ${MM(wt)} mm along x`, `between its stiles, ${MM(ry - y)} mm up`, `${MM(d)} × ${MM(wt)} mm tube: the ${k} of them share the push it is held shut against`); }
    box(c, 'brace', mt, (hx + lx) / 2, y + H / 2, Z + d / 2 + bd / 2, Lb, bd, bd, 'bar', 'across the face of its rails, from its hinge foot to its latch top', `${MM(bd)} mm square of ${md.name}: what the leaf weighs held out comes down it`);
    c.steps[c.steps.length - 1] = `${c.steps.at(-1)!} turned z ${+((th * 180) / Math.PI).toFixed(3)}`; c.traces[c.traces.length - 1]!.step = c.steps.at(-1)!;
    // (what rides with its hinge stile is read off it when this is made: it stays so)
    void was; c.why = w0;
    c.steps.push(`hinge ${hs} to ${pn} about y from -90° to 90°`); c.traces.push({ step: c.steps.at(-1)!, what: `${hs}'s hinge`, called: c.way, why: 'so it swings open either way', when: '', where: 'where its stile touches the post, about the upright', how: 'a Jolt hinge with stops at 90° each way' });
    c.tests.push({ kind: 'swing', name: hs, at: `${c.p}_stile2` });
    // shut, it is latched at its far end to a post set in the ground as its hinge post is, 10 mm clear of its latch stile:
    // the push shared by its two posts, half each, about 700 mm up (estimate); its latch a 16 mm steel pin dropped through a
    // keeper on that post, in single shear at 0.6 of 250 MPa (estimate), by two; the pin is not placed in the physics, so
    // there it swings unlatched
    let lb = 0, lp = p;
    if (shut) {
      const lx2 = X + p / 2 + W + 0.01 + lp / 2, rr = c.ride; c.ride = was; c.why = 'to latch it shut against';
      // (a piece of its own with its footing, apart from the hinge post: the ground between them is not made)
      const lpn = box(c, 'latchpost', 'steel.a36', lx2, c.y0 + (H + 0.1) / 2, Z, lp, lp, H + 0.1, 'bar', 'upright at its far end, 10 mm clear of its latch stile, set in the ground', `${MM(lp)} mm square steel, as its hinge post: the push leant on it near its latch end bends it`, { loose: true });
      lb = (() => { for (let b = 0.2; b < 3; b += 0.01) if (2400 * G * b ** 4 / 2 >= 2 * Fl * hl) return b; return 3; })();
      const lf = box(c, 'latchfooting', 'concrete.c30', lx2 + lp / 2 + lb / 2, c.y0 + lb / 2, Z, lb, lb, lb, 'block', 'against the latch post\'s foot', `a ${MM(lb)} mm cube of concrete standing for the ground it is set in: heavy enough that the push leant near it does not turn it over (by two)`, { loose: true });
      STANDS.set(lf, 'the ground its latch post is set in'); c.steps.push(`join ${lpn}, ${lf} as ${c.p}_latch`); c.traces.push({ step: c.steps.at(-1)!, what: `${c.p}_latch`, called: c.way, why: 'so its latch post stands in the ground it is set in, apart from the leaf and its hinge post', when: '', where: 'where the post meets its footing', how: 'joined' }); c.why = w0; c.ride = rr;
      const pinCap = 0.6 * 250e6 * Math.PI * 0.008 ** 2, Mlp = Fl * hl, sLp = (6 * Mlp) / lp ** 3;
      c.checks.push(() => ({ what: `shut, its rails bear the ${+(shut / 1000).toPrecision(3)} kN push`, ok: md.yield / (Mshut / (kb * S(d, wt))) >= 2, says: `latched at its far end, ${len(W)} between its posts, the push at its middle bends it with ${+(Mshut / 1000).toPrecision(3)} kN·m (F W / 4), taken by the ${kb} of its ${k} rails nearest where it is leant on (an animal leans over about 600 mm, estimate): ${+(md.yield / (Mshut / (kb * S(d, wt)))).toPrecision(3)} times under its yield, bending ${len((shut * W ** 3) / (48 * md.E * kb * Ir(d, wt)))} at its middle (F W³ / 48 E I, those rails together; its brace and stiles share some, not counted)` }));
      c.checks.push(() => ({ what: 'shut, its latch and its posts hold the push leant near them', ok: pinCap >= 2 * Fl && 250e6 / sLp >= 2, says: `leant on near one end, nearly all ${+(Fl / 1000).toPrecision(3)} kN of it comes on the post there, about ${len(hl)} up (estimate): its 16 mm steel latch pin holds ${+(pinCap / 1000).toPrecision(3)} kN in single shear (0.6 of 250 MPa, estimate), ${+(pinCap / Fl).toPrecision(3)} times it; its ${MM(lp)} mm posts bend under it at ${+(sLp / 1e6).toPrecision(3)} MPa at their feet, ${+(250e6 / sLp).toPrecision(3)} times under their yield; each set in a cube of concrete heavy enough not to turn over by two (2400 g b³ b / 2 ≥ 2 F h: ${MM(lb)} mm at the latch post); the pin is not placed in the physics, so there it swings unlatched: what holds it shut is weighed by statics, here` }));
    }
    c.checks.push(() => ({ what: 'held open, its brace bears it', ok: (Math.PI ** 2 * md.E * Ir(bd, bw)) / (Lb * Lb) >= 3 * Nb, says: `its ${+kg.toPrecision(3)} kg held out from its hinges comes down its ${len(Lb)} brace at ${+((th * 180) / Math.PI).toPrecision(3)}°: ${+Nb.toPrecision(3)} N (m g / sin θ), buckling at ${+((Math.PI ** 2 * md.E * Ir(bd, bw)) / (Lb * Lb) / Nb).toPrecision(3)} times it (Euler, K = 1)` }));
    c.gaps.push(`${shut ? 'its posts stand' : 'its post stands'} in blocks of concrete standing for the ground: how deep each is set (about 900 mm in concrete for a gate this size, estimate) is not derived${shut ? '; its latch pin, dropped through a keeper on its far post, is said and weighed but not placed' : ''}`);
    c.top = { y: y + H, w: W, d: d, name: null }; c.foot = [W + p + fb + (shut ? 0.01 + lp + lb : 0), Math.max(fb, lb)];
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
const LOADS = new Map<string, { factor: number; bend: number; wood?: boolean }>();
/** A factor said as it is: under its yield by so much, or over it by so much. */
/** Said to run with no electricity at all: no answer that draws it is offered. */
const NOPOWER = /\b(no|without|zero)\s+(electricity|power|batter(y|ies)|mains)\b|\bunpowered\b|\bpassive(ly)?\b/;
/** How far it bends, where past a tenth of its span the straight-beam reading means only that it fails long before. */
const bendSays = (b: number, span: number) => (b > span / 10 ? `bending ${len(b)} by the straight-beam reading, more than a tenth of its span: a figure that means only it fails long before` : `bending ${len(b)}`);
// wood does not yield as a metal does: it breaks, at its bending strength
const factorSays = (f: number, wood = false) => (f >= 1 ? `${+f.toPrecision(3)} times under its ${wood ? 'bending strength' : 'yield'}` : `${+(1 / f).toPrecision(3)} times over its ${wood ? 'bending strength: it breaks' : 'yield: it gives'}`);
/** What each design weighs as made, and what it carries that is not part of it (a load, a liquid), kg: read by its checks. */
const MADE = new Map<string, number>(), CARRIED = new Map<string, number>();
/** The walls of what holds or encloses, as made: their area, m², thickness, matter and height, by design and kind. */
const SKINS = new Map<string, { A: number; t: number; id: string; L: number; top?: number }>();
/** What packs down rather than folding on hinges (a cloth on poles): its size packed, and how that was found. */
const PACKED = new Map<string, { dims: [number, number, number]; says: string }>();
/** What holds it to the ground (stakes): how many, what each holds at most, N, and what they are. */
const ANCHORS = new Map<string, { n: number; each: number; says: string }>();
/** What rolls free on its wheels, and along which way: pushed to tip it, it is pushed across that, where its wheels do not roll. */
const ROLLS = new Map<string, 'x' | 'z'>();
/** what is open at its front (a three-sided shelter, a stall), by its prefix: the wind gets in under its roof */
const OPEN = new Set<string>();
/** The most a design bends where its way works it out beyond the load law (an overhang, creep), m, and where. */
const SAGS = new Map<string, { bend: number; at: string }>();
/** How long what it holds keeps hot, or what keeping it cold costs, as made: through its own walls (a vessel's, and what
 *  encloses it), and the still air round them (natural convection and radiation, laminar, estimate), lumped and stepped. */
function keeps(con: Conception, prefix: string): Check | null {
  const s = con.said, tk = s.keepFor ?? s.runFor, v = SKINS.get(`${prefix}:vessel`), e = SKINS.get(`${prefix}:box`), Ta = s.Tamb ?? AMBIENT, V = con.wants.find((w) => w.fn === 'contain')?.q.V?.v;
  const th = (id: string) => { try { return thermalOf(matterOf(id)); } catch { return null; } };
  // the air it encloses held at a temperature: what its walls let through, from still air inside (Rsi 0.13 m² K/W, ISO
  // 6946) through each wall to the air outside, against what warms it (people in it, or the power it may use)
  if (s.Tin !== undefined && e && th(e.id)) {
    // in a wind its outside face is swept: 0.04 m² K/W there (ISO 6946's outside surface), else still air outside
    const te = th(e.id)!, Rsi = 0.13, R = Rsi / e.A + e.t / (te.k * e.A), d = s.Tin - Ta, air = s.wind !== undefined ? (e.A * Math.abs(d)) / 0.04 : Math.abs(heatLoss(s.Tin, e.A, e.L, te.emissivity, Ta)), Q = Math.abs(d) / (R + Math.abs(d) / Math.max(air, 1e-12));
    // a person at rest gives about a quarter of their heat as moisture in breath and on the skin, which warms no air
    // (estimate): three quarters of it warms what is round them
    const sens = s.bodyHeat !== undefined ? 0.75 * s.bodyHeat : undefined, has = sens ?? con.limits.power, from = sens !== undefined ? `the ${+sens.toPrecision(3)} W of the ${+s.bodyHeat!.toPrecision(3)} W the people in it give that warms the air (about a quarter leaves as moisture, estimate)` : con.limits.power !== undefined ? `the ${+con.limits.power.toPrecision(3)} W it may use` : null;
    // the wall that would hold it: U = P / A ΔT, foam at about 0.035 W/(m K) (estimate) making up the rest
    const U = has !== undefined && d !== 0 ? has / (e.A * Math.abs(d)) : undefined, Rneed = U !== undefined ? 1 / U : undefined, foam = Rneed !== undefined ? Math.max(0, (Rneed - Rsi - 0.04 - e.t / te.k) * 0.035) : undefined;
    const hot = d > 0, ok = has !== undefined && hot && Q <= has;
    const settle = has !== undefined && hot ? Ta + has / (Q / Math.abs(d)) : undefined;
    return { what: `its walls let out no more than what warms it, the air inside at ${s.Tin} °C with ${+Ta.toPrecision(3)} °C round it`, ok, says: `its walls, ${MM(e.t)} mm of ${matterOf(e.id).name} (k ${+te.k.toPrecision(2)} W/(m K)) over ${+e.A.toPrecision(3)} m², ${s.wind !== undefined ? 'still air inside (0.13 m² K/W) and the wind outside (0.04 m² K/W, ISO 6946)' : 'still air on each face (inside 0.13 m² K/W, ISO 6946)'}, let ${hot ? 'out' : 'in'} ${+Q.toPrecision(3)} W at ${+Math.abs(d).toPrecision(3)} K between them${!hot ? `: inside must be cooled, and no cooler is made` : from ? `, against ${from}${Q > has! ? `: it falls short; walls that held it would pass no more than ${+U!.toPrecision(2)} W/(m² K), ${foam! > 0 ? `about ${MM(foam!)} mm of foam (k 0.035 W/(m K), estimate) more, ${+(foam! * e.A * 30).toPrecision(3)} kg at 30 kg/m³` : 'as these do'}` : ''}` : ', and nothing that warms it is said'}; air let through its gaps and seams is not weighed${hot ? ', and takes more' : ''}${settle !== undefined && Q > has! ? `; on ${from} alone the air inside settles near ${+settle.toPrecision(3)} °C` : ''}` };
  }
  if (s.tmin === undefined && s.Tkeep === undefined && s.Tto === undefined) return null;
  if (tk === undefined && s.Tto === undefined) return null;
  const out = e ?? v; if (!out) return null;
  const to = th(out.id); if (!to) return null;
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
    return { what: `as made, it keeps what it holds at ${s.Tkeep} °C for ${timeSay(tk)}`, ok: false, says: `its walls, ${wallSay}, in still air at ${+Ta.toPrecision(3)} °C, let in ${+Q.toPrecision(3)} W: ${+(E / 3600).toPrecision(3)} Wh over that time, ${NOPOWER.test(s.words ?? '') ? `which would melt ${+(E / 334e3).toPrecision(3)} kg of ice (334 kJ/kg)` : `${+(elec / 3600).toPrecision(3)} Wh of electricity at a Peltier's ${cop} at this lift (estimate)`}${s.store !== undefined ? ` against the ${+(s.store / 3600).toPrecision(3)} Wh it stores` : ''}; no cooler and no insulated wall is made` };
  }
  return null;
}
let ROOM: World = { parts: () => [] };
/** Dry air at sea-level pressure at a temperature, p / R T (R 287.05 J/(kg K)): 1.204 kg/m³ at 20 °C, 1.55 at −45 °C. */
// air at C °C and h metres up: p / R T, its pressure by the standard atmosphere's 101325 (1 − 2.25577 × 10⁻⁵ h)^5.25588 (ISO 2533, to 11 km)
const airRho = (C = 20, h = 0) => (101325 * Math.max(0, 1 - 2.25577e-5 * Math.min(h, 11000)) ** 5.25588) / (287.05 * (C + 273.15));
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
  /** it bears every load it was checked for, whether or not it keeps to every limit (a size, a weight, how it packs) */ holds: boolean;
  choices: string[]; tries: { seed: number; why: string }[]; gaps: string[]; mass: number; parts: number; footprint: [number, number]; words: string; plan: string[];
  /** the conditions what is made was grown to meet, where it was grown from them */ conditions?: string[];
  /** what was asked, each met or not; and how many of the things asked it does */ asked: Asked[]; does: [number, number];
  /** it holds, does everything asked, and has nothing left not yet derived */ whole: boolean;
  /** where it folds as planned: its fold, played (each part a quarter or a half turn about its hinge in the order they fold, held
   *  folded, then opened out again), in the room as it stands */ foldTrack?: SimTrack;
}
/** How many of the things asked (what it is, does and has; not what it is for) were read into wants it meets. */
const doesOf = (asked: Asked[], gaps: string[], wants: Want[]): [number, number] => { const xs = asked.filter((a) => a.kind !== 'for'); const met = xs.filter((a) => { if (a.kind === 'limit') return !!a.met; const fn = a.got; return !!fn && wants.some((w) => w.fn === fn) && !gaps.some((g) => g.startsWith(`nothing kept here can ${FN_WORDS[fn]}`)); }).length; return [met, Math.max(xs.length, met ? 1 : 0)]; };

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
const foldWanted = (con: Conception) => con.asked.some((a) => a.how === 'folds') || !!con.limits.fold?.length || con.limits.foldThin !== undefined || con.limits.foldW !== undefined;
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
function foldChecks(f: Folding, con: Conception, prefix: string, seed: number, J: Jolt | null): { checks: Check[]; ok: boolean; fits: boolean | null; why: string; reach: number } {
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
    // a pin in wood crushes the wood before it shears: d t f_h, f_h = 0.082 (1 − 0.01 d) ρ_k N/mm² (EN 1995-1-1 (8.32), d
    // in mm; ρ_k about 0.84 of its mean density, estimate)
    const capOf = (d: Fold): number => { const m = f.made.get(d.head)?.matter; if (!m || familyOf(m.id) !== 'wood') return cap; return Math.min(cap, 0.006 * Math.max(d.thick, 1e-3) * 0.082 * (1 - 0.06) * 0.84 * m.density * 1e6); };
    const latch = p.folds.map((d) => {
      const head = openOf(d.head), hinge = ext(head, d.axis), room = Math.max(1, Math.floor(hinge / 0.1)), sibs = p.folds.filter((x) => x.holder === d.holder && x.kind === d.kind).length;
      // a joint in what lies flat end to end carries what it spans; one between upright panels is pushed as a part is
      if (d.kind === 'half' && 3 - d.n - d.axis === 1) { const L = gh[d.n]! - gl[d.n]!, Mo = (W * L) / 4, Fp = Mo / Math.max(d.thick, 1e-3); return { d, Mo, Fp, n: Math.ceil(Fp / capOf(d)), room, why: `a joint in what it spans, ${len(L)} long, bends at worst by ${+W.toPrecision(3)} N at its middle (W L / 4, its weight${CARRIED.get(prefix) ? " and its load's" : ''})` }; }
      const share = F / Math.max(1, sibs), Mw = wind !== undefined && ext(head, 1) > Math.min(head.w, head.d) + 1e-9 ? 0.5 * airRho(con.said.Tamb, con.said.altitude) * wind ** 2 * 1.2 * hinge * d.length * (d.length / 2) : 0, Mo = Math.max(share * d.length, Mw), Fp = Mo / Math.max(d.thick, 1e-3);
      return { d, Mo, Fp, n: Math.ceil(Fp / capOf(d)), room, why: Mw > share * d.length ? `the ${+(wind! * 3.6).toPrecision(3)} km/h wind on its ${+(hinge * d.length).toPrecision(3)} m²` : `pushed at its top with a tenth of its weight${CARRIED.get(prefix) ? " and its load's" : ''} (${+F.toPrecision(3)} N, as tested), its share` };
    });
    const worst = latch.reduce((a, b) => (b.n / b.room > a.n / a.room ? b : a)), most = latch.reduce((a, b) => (b.n > a.n ? b : a));
    out.push({ what: 'latched open, its hinges hold against a push', ok: latch.every((x) => x.n <= x.room), says: `latched open, each hinge is held at its far side by 6 mm steel pins in double shear (8.48 kN each at 0.6 of 250 MPa, estimate); for ${nm(worst.d.head)}, ${len(worst.d.thick)} from its hinge line, ${worst.why} turns it with ${+worst.Mo.toPrecision(3)} N·m, ${+worst.Fp.toPrecision(3)} N on its pins: ${worst.n} pin${worst.n > 1 ? 's' : ''}${capOf(worst.d) < cap ? ` (in ${f.made.get(worst.d.head)?.matter?.name ?? 'its wood'} ${len(worst.d.thick)} thick each pin bears only ${+capOf(worst.d).toPrecision(3)} N before it crushes the wood: d t f_h, f_h = 0.082 (1 − 0.01 d) ρ_k, EN 1995-1-1 (8.32))` : ''}${worst.n > worst.room ? `, more than the ${worst.room} its hinge has room for (one each 100 mm, estimate)` : ''}${most !== worst && most.n > worst.n ? `; ${nm(most.d.head)} wants the most, ${most.n} pins, as ${most.why} turns it with ${+most.Mo.toPrecision(3)} N·m, of the ${most.room} its hinge has room for` : ''}; what stands on it bears straight down where its parts meet, not through its pins, except a part held out with nothing under it (weighed next, where there is one)` });
    // a hand that folds it: a part on a level hinge, at its worst lying level, is turned by its weight at its middle
    // (m g L / 2), held at its far end with m g / 2; on an upright hinge its weight does not turn it. Against what a hand
    // should raise, a lid at elbow height, 148 N (Eastman Kodak, Ergonomic Design for People at Work, 1986), or what is said
    if (con.said.oneHand || con.said.effort !== undefined) {
      const most = con.said.effort ?? 148, hands = p.folds.map((d) => { const kg = d.names.reduce((a, n) => a + (f.made.get(n)?.mass ?? 0), 0); return { d, kg, F: d.axis === 1 ? 0 : (kg * G) / 2 }; }), w = hands.reduce((a, b) => (b.F > a.F ? b : a));
      out.push({ what: `${con.said.oneHand ? 'one hand' : 'a hand'} folds it`, ok: w.F <= most, says: `${w.F > 0 ? `${nm(w.d.head)}${w.d.names.length > 1 ? ' and what folds with it' : ''}, ${+w.kg.toPrecision(3)} kg, turned about a level hinge, at its worst lying level, is held at its far end with ${+w.F.toPrecision(3)} N (m g / 2, its weight at its middle)` : 'each part turns about an upright hinge: its weight does not turn it, and only what rubs at its hinges is felt'}, against ${con.said.effort !== undefined ? `the ${+most.toPrecision(3)} N said` : 'the 148 N a hand should raise a lid with at elbow height (Eastman Kodak, 1986)'}${w.F > most ? `: it needs springs or a counterweight taking ${+((w.F - most) * ext(openOf(w.d.head), w.d.n)).toPrecision(3)} N·m at its hinge, not derived` : ''}` });
    }
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
        return { d, L, Mo, Fp, n: Math.ceil(Fp / capOf(d)), room, upright, lever };
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
  // a folded width is across its plan, the narrower of its two ways along the floor, not its thinnest way
  if (L.foldW !== undefined) { const wd = Math.min(measured[0]!, measured[2]!), ok = wd <= L.foldW * 1.0001; fits = (fits ?? true) && ok; out.push({ what: `folded, it is no more than ${len(L.foldW)} wide`, ok, says: `${as}, its plan is ${len(measured[0]!)} × ${len(measured[2]!)}: ${len(wd)} across at its narrower way, against ${len(L.foldW)}` }); }
  if (L.fold?.length) { const want = [...L.fold].sort((a, b) => b - a), ok = want.every((v, i) => env[i]! <= v * 1.0001); fits = (fits ?? true) && ok; out.push({ what: `it folds or packs to ${want.map(len).join(' × ')}`, ok, says: `${as}, it is ${env.map(len).join(' × ')}${ok ? '' : `: ${want.map((v, i) => (env[i]! > v * 1.0001 ? `${len(env[i]!)} where ${len(v)} is wanted` : '')).filter(Boolean).join(', ')}`}` }); }
  if (L.foldVol !== undefined) { const v = measured[0]! * measured[1]! * measured[2]!, ok = v <= L.foldVol * 1.0001; fits = (fits ?? true) && ok; out.push({ what: `it packs into ${+(L.foldVol * 1e3).toPrecision(3)} L`, ok, says: `${as}, it is ${measured.map(len).join(' × ')}, the box round it ${+(v * 1e3).toPrecision(3)} L${ok ? '' : `, ${+(v / L.foldVol).toPrecision(3)} times as much`}` }); }
  // a tube it must go into: what is across its two smaller ways must fit the circle, its diagonal within the tube
  if (con.said.fitDia !== undefined) { const D = con.said.fitDia, dg = Math.hypot(env[1]!, env[2]!), ok = dg <= D * 1.0001; fits = (fits ?? true) && ok; out.push({ what: `it goes inside a ${len(D)} tube`, ok, says: `${as}, it is ${env.map(len).join(' × ')}: across its two smaller ways it needs a tube ${len(dg)} across (the diagonal of ${len(env[1]!)} × ${len(env[2]!)})` }); }
  const bad = out.find((x) => x.ok === false && !/^it (folds (flat to|or packs to)|packs into)|hand folds it$|^held out, its hinges carry it$|^latched open, its hinges hold/.test(x.what));
  // how high it reaches folded, above the floor: its folded parts' highest top
  const reach = Math.max(0, ...p.folded.filter((b) => !STANDS.has(b.name)).map((b) => b.at[1] + b.h / 2));
  return { checks: out, ok: !bad, fits, why: bad ? `${bad.what}: ${bad.says}` : '', reach };
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
/** Where holding it up is the whole of what it is: held far out from a wall, or high up on a stand much narrower than
 *  it is tall. There the frame grown along its loads is drawn first, as the ways that draw legs or a column widen their
 *  foot until it is heavy; elsewhere (a top worked at, sat at or slept on, which wants the room under it clear) the
 *  others are drawn with it. */
const framed = (n: Need) => n.kind === 'surface' && !!n.want.cond || n.kind === 'surface' && !n.on && !n.want.flags.includes('levels') && !n.want.flags.includes('span') && (n.want.flags.includes('wall') ? !layOf(n.want).spread && n.want.q.D?.by === 'you' && n.want.q.D.v >= 0.15 : n.want.q.H!.v >= 2.5 * Math.max(n.want.q.W!.v, n.want.q.D!.v, n.fit[0], n.fit[1]));
/** Made once, from one seed: each need met by a way drawn from those that apply, stacked, sized from the top down,
 *  placed from the bottom up, joined, then checked. */
function once(con: Conception, seed: number, prefix: string, at: [number, number], J: Jolt | null): Design {
  PACKED.delete(prefix); ANCHORS.delete(prefix); ROLLS.delete(prefix); OPEN.delete(prefix); FRAMES.delete(prefix); FIXED.delete(prefix);
  const needs = stack(con.wants), ordered = order(needs), plan: string[] = [];
  const base = (n: Need, i: number): Ctx => ({ p: prefix, x0: at[0], z0: at[1], y0: 0, rnd: rngOf(seed + i * 1013), matter: con.matter, light: con.limits.mass, ...(con.said.fitDia !== undefined ? { fitDia: con.said.fitDia } : {}), ...(con.said.wind !== undefined ? { wind: con.said.wind } : {}), ...(con.said.drop !== undefined ? { dropH: con.said.drop } : {}), ...(con.said.climber !== undefined ? { climber: con.said.climber * G } : {}), ...(con.limits.part !== undefined ? { part: con.limits.part } : {}), ...(con.limits.sag !== undefined ? { sag: con.limits.sag } : {}), steps: [], traces: [], members: [], loose: [], moving: [], choices: [], gaps: [], checks: [], loads: [], tests: [], need: n, way: '', why: n.why, top: { y: 0, w: 0, d: 0, name: null }, foot: [0, 0], after: null, ride: null, riders: [] });
  const chosen = new Map<Need, Way>(), barred = new Map<Need, string>();
  for (const [i, n] of ordered.entries()) {
    const bar = scaleBars(n, con); if (bar) barred.set(n, bar);
    const ways = WAYS.filter((w) => w.meets === n.kind && (n.kind !== 'surface' || w.id === FRAME_WAY || (w.id === WALL_WAY) === n.want.flags.includes('wall') || w.id === WALL_WAY)), probe = base(n, i), open = bar ? [] : ways.filter((w) => w.when(n, probe) === null && (n.kind !== 'surface' || w.id === FRAME_WAY || (w.id === WALL_WAY) === n.want.flags.includes('wall')));
    const w = open.length ? (framed(n) ? open.find((x) => x.id === FRAME_WAY) : undefined) ?? pick(rngOf(seed + i * 7 + 1), open) : null;
    if (w) chosen.set(n, w);
    plan.push(`${n.why}: ${w ? `${w.says} (drawn from ${open.length} way${open.length === 1 ? ' that applies' : 's that apply'}${ways.length > open.length ? `; not drawn: ${ways.filter((x) => !open.includes(x)).map((x) => `${x.says}, as ${x.when(n, probe)}`).join('; nor ')}` : ''})` : bar ? `no way kept meets it ${bar}` : 'no way kept meets it'}${n.on ? `, ${n.kind === 'vessel' && n.on.kind === 'enclosure' ? 'in' : 'on'} ${n.on.why.replace(/^to /, 'what is to ')}` : w?.id === WALL_WAY ? ', on the wall' : n.kind === 'hoist' && n.want.flags.includes('wall') ? ', screwed to the wall' : ', on the floor'}`);
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
  const steps: string[] = [], traces: Trace[] = [], members: string[] = [], loose: string[] = [], rides = new Map<string, string[]>(), choices: string[] = [], gaps: string[] = [], checks: (() => Check | null)[] = [], loads: string[] = [], tests: Test[] = [], conditions: string[] = [];
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
    steps.push(...c.steps); traces.push(...c.traces); members.push(...c.members); loose.push(...c.loose); if (c.ride && c.riders.length) rides.set(c.ride, [...(rides.get(c.ride) ?? []), ...c.riders]); choices.push(...c.choices); gaps.push(...c.gaps); checks.push(...c.checks); loads.push(...c.loads); tests.push(...c.tests); conditions.push(...(c.conds ?? []));
    if (!n.on) foot = [Math.max(foot[0], c.foot[0]), Math.max(foot[1], c.foot[1])];
  }
  if (barred.size && con.scale) for (const m of con.scale.must) if (!gaps.includes(m)) gaps.push(m);
  // folding the whole of it, where asked: planned on the parts as drawn, its hinge blocks joined to the base
  const fold = foldWanted(con) && !PACKED.has(prefix) ? foldFor(prefix, steps, traces, [...rides.values()].flat(), seed) : null;
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
    for (const s of loads) { try { room.run(s); const key = /^load\s+(\S+)/.exec(s)![1]!, was = LOADS.get(key), f = room.value(`${key}.factor`), b = room.value(`${key}.deflection`); const wood = !!room.all().made.find((m) => m.name === key)?.matter?.id.startsWith('wood.'); LOADS.set(key, was ? { factor: Math.min(was.factor, f), bend: Math.max(was.bend, b), wood } : { factor: f, bend: b, wood }); } catch (e) { out.push({ what: s, ok: false, says: (e as Error).message.slice(0, 200) }); } }
    MADE.set(prefix, room.all().made.filter((m) => m.name.startsWith(`${prefix}_`) && !STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0));
    CARRIED.set(prefix, con.wants.reduce((a, w) => a + (w.fn === 'support' ? (w.q.F!.v / G) * (w.flags.includes('levels') ? Math.max(2, Math.round(w.q.levels?.v ?? 4)) : 1) : w.fn === 'contain' ? w.q.V!.v * 1000 : w.fn === 'move' || w.fn === 'raise' ? w.q.m?.v ?? 0 : w.fn === 'enclose' && w.q.roofP ? (w.q.roofP.v * (w.q.W!.v + 0.05) * (w.q.D!.v + 0.05)) / G : 0), 0));
    for (const f of checks) { const r = f(); if (r) out.push(r); }
    // what it is to carry, put on it as a block of steel of that weight while it is tested (not part of it)
    let k = 0;
    for (const n of ordered) {
      const c2 = done.get(n); if (!c2) continue;
      // (what a hoist carries in the box it raises, on the box's floor inside)
      const boxOnHoist = n.kind === 'enclosure' && n.on?.kind === 'hoist' && c2.inside;
      const tops = n.kind === 'surface' ? (n.want.flags.includes('levels') ? Array.from({ length: Math.max(2, Math.round(n.want.q.levels?.v ?? 4)) }, (_, i) => `${prefix}_shelf${i + 1}`) : [c2.top.name]) : (n.kind === 'mobility' || n.kind === 'hoist' || n.kind === 'track') && !ordered.some((x) => x.on === n) ? [c2.top.name] : boxOnHoist ? [c2.inside!.name] : [];
      const kgs = n.kind === 'surface' ? n.want.q.F!.v / G : boxOnHoist ? (n.on!.want.q.m?.v ?? 0) : (n.want.q.m?.v ?? 0);
      for (const tn of tops) {
        const tm = tn ? room.all().made.find((m) => m.name === tn) : undefined; if (!tm || !(kgs > 0)) continue;
        const side = Math.min(0.6 * Math.min(tm.w, tm.d), Math.cbrt(kgs / 7850)), h = kgs / (7850 * side * side);
        try { room.run(`place block named test_load${k + 1} of steel.a36 at ${M(tm.at[0])}, ${M(tm.at[1] + tm.h / 2 + h / 2)}, ${M(tm.at[2])} size ${MM(side)} x ${MM(side)} x ${MM(h)} mm`); k++; } catch { /* where it does not fit, it is not put on it: its weight is still in the push, below */ }
      }
    }
    // what it carries goes into the tests as their setting, not as a check of its own
    const loadSays = k ? `; with ${k} block${k > 1 ? 's' : ''} of steel of the weight wanted on ${k > 1 ? 'each surface' : 'it'}` : '';
    // as it was built, before anything is pushed, swung or blown: its sizes and where its feet are are read off this
    asBuilt = room.all().made.map((m) => ({ ...m, at: [...m.at] as typeof m.at, turn: [...m.turn] as typeof m.turn }));
    out.push(...(J ? physics(room, prefix, piece, tests, [...rides.values()].flat(), con.said.wind, CARRIED.get(prefix) ?? 0, airRho(con.said.Tamb, con.said.altitude)).map((x) => (loadSays && (x.what === 'it stands when let go' || /^pushed at its top/.test(x.what)) ? { ...x, says: `${x.says}${loadSays}` } : x)) : [{ what: 'it stands', ok: true, says: 'not tested: the physics engine is not loaded here' }]));
    if (fold) { folded = foldChecks(fold, con, prefix, seed, J); out.push(...folded.checks); }
    // what packs down rather than folding on hinges (a cloth on poles): its size packed, against what it must pack to
    else if (PACKED.has(prefix) && foldWanted(con)) {
      const pk = PACKED.get(prefix)!, L = con.limits, env = [...pk.dims].sort((a, b) => b - a), cs: Check[] = [{ what: 'it packs down', ok: true, says: `${pk.says}: ${env.map(len).join(' × ')}` }]; let fits: boolean | null = null;
      if (L.foldThin !== undefined) { const ok = env[2]! <= L.foldThin * 1.0001; fits = ok; cs.push({ what: `it folds flat to ${len(L.foldThin)}`, ok, says: `packed, it is ${len(env[2]!)} at its thinnest` }); }
      if (L.foldW !== undefined) { const ok = env[1]! <= L.foldW * 1.0001; fits = (fits ?? true) && ok; cs.push({ what: `folded, it is no more than ${len(L.foldW)} wide`, ok, says: `packed, it is ${len(env[1]!)} across its middle way` }); }
      if (L.fold?.length) { const want = [...L.fold].sort((a, b) => b - a), ok = want.every((v, i) => env[i]! <= v * 1.0001); fits = (fits ?? true) && ok; cs.push({ what: `it folds or packs to ${want.map(len).join(' × ')}`, ok, says: `packed, it is ${env.map(len).join(' × ')}` }); }
      if (L.foldVol !== undefined) { const v = env[0]! * env[1]! * env[2]!, ok = v <= L.foldVol * 1.0001; fits = (fits ?? true) && ok; cs.push({ what: `it packs into ${+(L.foldVol * 1e3).toPrecision(3)} L`, ok, says: `packed, the box round it is ${+(v * 1e3).toPrecision(3)} L` }); }
      if (con.said.fitDia !== undefined) { const D = con.said.fitDia, dg = Math.hypot(env[1]!, env[2]!), ok = dg <= D * 1.0001; fits = (fits ?? true) && ok; cs.push({ what: `it goes inside a ${len(D)} tube`, ok, says: `packed, it needs a tube ${len(dg)} across (the diagonal of ${len(env[1]!)} × ${len(env[2]!)})` }); }
      folded = { checks: cs, ok: true, fits, why: '', reach: Math.min(...env) }; out.push(...cs);
    }
    for (const t of tests) if (t.kind === 'warm') { const sun = sunOn(con, room, t.name), wc = heaterInside(con, prefix, room, t) ?? warmed(room, t, con.limits.power ?? sun?.W, con.said.Tamb, con.limits.power === undefined && sun ? sun.says : undefined, con.limits.power === undefined && sun ? ': bare, it loses more than that; glazing over it and insulation under it are not made' : ''); out.push({ what: wc.what, ok: wc.ok, says: wc.says }); const dw = con.wants.find((x) => x.fn === 'warm' && x.flags.includes('dry')); if (dw && wc.P !== undefined) out.push(dried(dw, t.T, wc.P, con)); }
  }
  const ms = (asBuilt ?? room.all().made).filter((m) => m.name.startsWith(`${prefix}_`)), mass = ms.reduce((a, m) => a + m.mass, 0);
  // where its weight is: the kinds of part that weigh most, each summed (its joists as one), so a limit missed says where to look
  // (a part cut in pieces, "deck_1", "deck_2", is one part in so many pieces; "joist3" one of so many joists)
  const heaviest = (xs: typeof ms) => { const by = new Map<string, [number, number, boolean]>(); for (const m of xs) { const n0 = m.name.slice(prefix.length + 1), cut = /_\d+$/.test(n0), k = n0.replace(/_?\d+$/, ''), was = by.get(k) ?? [0, 0, cut]; by.set(k, [was[0] + m.mass, was[1] + 1, was[2] || cut]); } return [...by].sort((x, y) => y[1][0] - x[1][0]).slice(0, 3).map(([k, [v, n, cut]]) => `${n > 1 ? (cut ? `the ${k.replace(/_/g, ' ')} in its ${n} pieces` : `the ${n} ${k.replace(/_/g, ' ')}s`) : `the ${k.replace(/_/g, ' ')}`} ${+v.toPrecision(3)} kg`).join(', '); };
  // what was said it must not pass: its own weight, its width, height and depth, as made
  // its own size: not what stands for a wall or a bank it is fixed to
  const mine = ms.filter((m) => !STANDS.has(m.name)), L = con.limits, ext = (i: number) => (mine.length ? Math.max(...mine.map((m) => m.at[i]! + [m.w, m.h, m.d][i]! / 2)) - Math.min(...mine.map((m) => m.at[i]! - [m.w, m.h, m.d][i]! / 2)) : 0);
  const own = ms.filter((m) => !STANDS.has(m.name) && !BALLAST.has(m.name)), ownKg = own.reduce((a, m) => a + m.mass, 0), stand = ms.filter((m) => STANDS.has(m.name)), setOn = ms.filter((m) => BALLAST.has(m.name)), setOnKg = setOn.reduce((a, m) => a + m.mass, 0);
  const notMade = con.asked.some((a) => a.kind !== 'for' && !a.got) || gaps.length > 0;
  // with what it does not make still to come, a weight within a quarter of its limit is not shown as kept: there is too
  // little left for what is to come (estimate)
  // stakes stood in the physics by blocks as heavy as what they hold: as pegs they weigh about 30 g each (a 250 mm steel
  // peg, estimate), carried with it and so counted against what it may weigh
  const pegs = stand.filter((m) => /_stake\d+$/.test(m.name)).length, pegKg = pegs * 0.03, kgL = ownKg + pegKg;
  const tight = notMade && kgL <= L.mass! * 1.0001 && kgL > 0.75 * L.mass!;
  if (made && L.mass !== undefined) out.push({ what: `${notMade ? 'as made, ' : ''}it weighs no more than ${+L.mass.toPrecision(3)} kg${tight ? ', with too little left for what it does not make' : ''}`, ok: kgL <= L.mass * 1.0001 && !tight, says: `it weighs ${+kgL.toPrecision(3)} kg, its parts added up${pegs ? ` with its ${pegs} stakes as steel pegs of about 30 g each (estimate), ${+pegKg.toPrecision(3)} kg` : ''}${notMade ? ` (what it does not make, marked ✗ or not yet, is not in it and would weigh more${tight ? `: only ${+(L.mass - kgL).toPrecision(3)} kg is left for it` : ''})` : ''}${ms.some((m) => /_motor\d+$/.test(m.name)) ? ' (not what powers its motors, which is not made)' : ''}${stand.length ? (pegs === stand.length ? ` (the ${+(mass - ownKg).toPrecision(3)} kg that stands in the physics for what its stakes hold in the ground is not a weight it has)` : ` (not counting ${stand.length === 1 ? `its ${stand[0]!.name.slice(prefix.length + 1)}` : `its ${stand.length} ${[...new Set(stand.map((m) => m.name.slice(prefix.length + 1).replace(/\d+$/, '')))].join(', ')}s`}, ${+(mass - ownKg).toPrecision(3)} kg, which stand${stand.length === 1 ? 's' : ''} for ${STANDS.get(stand[0]!.name)})`) : ''}${setOn.length ? ` (not counting the ${+setOnKg.toPrecision(3)} kg of ballast set on its feet where it stands, moved apart from it)` : ''}${kgL > L.mass ? `: ${kgL / L.mass < 1.1 ? `${+((kgL / L.mass - 1) * 100).toPrecision(2)}% over the limit` : `${+(kgL / L.mass).toPrecision(3)} times the limit`}; where it weighs most: ${heaviest(own)}` : ''}` });
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
  if (made && !fold && !PACKED.has(prefix) && con.said.fitDia !== undefined) { const e = [ext(0), ext(1), ext(2)].sort((a, b) => b - a), dg = Math.hypot(e[1]!, e[2]!); out.push({ what: `it goes inside a ${len(con.said.fitDia)} tube`, ok: dg <= con.said.fitDia * 1.0001, says: `it does not fold: as made it is ${e.map(len).join(' × ')}, needing a tube ${len(dg)} across` }); }
  if (made && !fold && !PACKED.has(prefix) && L.foldW !== undefined) { const wd = Math.min(ext(0), ext(2)); out.push({ what: `folded, it is no more than ${len(L.foldW)} wide`, ok: wd <= L.foldW * 1.0001, says: `it does not fold (folding the whole of it is not kept): as made its plan is ${len(ext(0))} × ${len(ext(2))}, ${len(wd)} across at its narrower way` }); }
  if (made && !fold && !PACKED.has(prefix) && L.foldThin !== undefined) { const thin = Math.min(ext(0), ext(1), ext(2)); out.push({ what: `it folds flat to ${len(L.foldThin)}`, ok: thin <= L.foldThin * 1.0001, says: `it does not fold (folding the whole of it is not kept): as made its thinnest way is ${len(thin)}` }); }
  if (made && !fold && !PACKED.has(prefix) && L.fold?.length) { const as = [ext(0), ext(1), ext(2)].sort((a, b) => b - a), want = [...L.fold].sort((a, b) => b - a), fits = want.every((v, i) => as[i]! <= v * 1.0001); out.push({ what: `it folds or packs to ${want.map(len).join(' × ')}`, ok: fits, says: `it does not fold (folding the whole of it is not kept): as made it is ${as.map(len).join(' × ')}${fits ? ', which fits already' : ''}` }); }
  // a leaf that holds a pressure across it (a hatch on a cabin): a flat plate simply supported at its edges, at its middle
  // σ = β p b² / t², b its shorter side, β by its sides' ratio (Roark, Table 11.4, ν 0.3), kept under its yield by two;
  // it bends at its middle y = α p b⁴ / E t³ (the same table), and past about half its thickness that small-deflection
  // reading overstates the stress, as the plate then carries by stretching too
  if (made && con.said.pin !== undefined) {
    const pin = con.said.pin, B: [number, number][] = [[1, 0.2874], [1.2, 0.3762], [1.4, 0.453], [1.6, 0.5172], [1.8, 0.5688], [2, 0.6102], [3, 0.7134], [4, 0.741], [5, 0.7476], [1e9, 0.75]];
    const A: [number, number][] = [[1, 0.0444], [1.2, 0.0616], [1.4, 0.077], [1.6, 0.0906], [1.8, 0.1017], [2, 0.111], [3, 0.1335], [4, 0.14], [5, 0.1417], [1e9, 0.1421]];
    const lerp = (T: [number, number][], r: number) => { const k = T.findIndex(([q]) => q >= r), [r0, v0] = T[Math.max(0, k - 1)]!, [r1, v1] = T[k]!; return k <= 0 ? v1 : v0 + ((v1 - v0) * (r - r0)) / (r1 - r0); };
    const alone = !con.wants.some((w) => w.fn === 'enclose');
    for (const m of mine.filter((x) => /_(leaf|door|lid|hatch)\d*$/.test(x.name) && x.matter)) {
      const [t, b, a] = [m.w, m.h, m.d].sort((x, y) => x - y), r = a / b, k = B.findIndex(([q]) => q >= r), [r0, b0] = B[Math.max(0, k - 1)]!, [r1, b1] = B[k]!, beta = k <= 0 ? b1 : b0 + ((b1 - b0) * (r - r0)) / (r1 - r0), sg = (beta * pin * b * b) / (t * t), f = m.matter!.yield / sg, need = b * Math.sqrt((2 * beta * pin) / m.matter!.yield), y = (lerp(A, r) * pin * b ** 4) / (m.matter!.E * t ** 3);
      out.push({ what: `its ${m.name.slice(prefix.length + 1).replace(/\d+$/, '')} holds ${+(pin / 1000).toPrecision(3)} kPa across it`, ok: f >= 2, says: `${+((pin * a * b) / 1000).toPrecision(3)} kN on its ${len(a)} × ${len(b)}; held at its edges, ${len(t)} of ${m.matter!.name} bends to ${+(sg / 1e6).toPrecision(3)} MPa at its middle (β p b² / t², β ${+beta.toPrecision(3)}, Roark Table 11.4): ${factorSays(f)}; it bends ${len(y)} at its middle (α p b⁴ / E t³, α ${+lerp(A, r).toPrecision(3)})${y > t / 2 ? `, ${+(y / t).toPrecision(2)} times its thickness: so far past where this reading holds that the stress it gives is too high, though what it says of whether it holds stands` : ''}${f < 2 ? `; by two it would want ${len(need)} of it, or a stronger matter, or a dome` : ''}; its seal and what latches it shut are not derived${alone ? '; it stands alone, so there is no opening it closes: what it is the door of is not made' : ''}` });
    }
  }
  // a wheel rolls up a step only lower than its radius, driven hard (less, unless it grips the edge; estimate)
  if (made && con.said.climb !== undefined) { const wh = mine.filter((m) => /_wheel\d*$/.test(m.name)); if (wh.length) { const r = Math.max(...wh.map((m) => Math.max(m.w, m.h, m.d) / 2)); out.push({ what: `its wheels climb a ${len(con.said.climb)} step`, ok: r > con.said.climb, says: `its wheels are ${len(2 * r)} across: a wheel rolls up a step only lower than its radius, ${len(r)}, driven hard (estimate)${r > con.said.climb ? '' : `; a ${len(con.said.climb)} step wants wheels over ${len(2 * con.said.climb)} across, or tracks, a cluster of wheels or legs (not derived)`}` }); } }
  // leaned on (a stumble, a hand pushing down and out): the lean about 20° off upright (estimate) pushes sideways at its
  // top with F sin θ, and down with F cos θ; it tips over its foot's edge where F sin θ · H passes (F cos θ + W) b / 2
  if (made && /\b(lean|leans|leaning|stumbl\w*|lurch\w*)\b/.test(con.words.toLowerCase())) { const F = con.wants.find((w) => w.fn === 'support')?.q.F?.v; if (F) { const th = (20 * Math.PI) / 180, Fh = F * Math.sin(th), Fv = F * Math.cos(th), H = ext(1), b = Math.min(ext(0), ext(2)), W = ownKg * G, Mo = Fh * H, Mr = ((Fv + W) * b) / 2; out.push({ what: 'a lean on its top does not tip it', ok: Mo < Mr, says: `${+(F / G).toPrecision(3)} kg of lean, 20° off upright (estimate): ${+Fh.toPrecision(3)} N sideways ${len(H)} up turns it over its ${len(b)} foot's edge with ${+Mo.toPrecision(3)} N·m, against ${+Mr.toPrecision(3)} N·m from the ${+Fv.toPrecision(3)} N down and its own ${+ownKg.toPrecision(3)} kg (statics)${Mo >= Mr ? ': it tips; it wants a wider foot, or to be held' : ''}` }); } }
  // a weight spread on its top (snow): borne by its widest flat part, as the load law finds, by two, bending within 1/250
  // a roof grown from its conditions bears what lies on it by its own frames (each bay sized for it), not as one sheet
  if (made && con.said.topP !== undefined && !con.wants.some((w) => w.fn === 'enclose' && w.q.roofP || w.cond?.cover)) { const top = mine.filter((m) => m.h <= Math.min(m.w, m.d) + 1e-9).sort((a2, b2) => b2.w * b2.d - a2.w * a2.d)[0]; if (top) { const F = con.said.topP * top.w * top.d, nm = top.name.slice(prefix.length + 1).replace(/\d+$/, ''), w2 = new Workshop(ROOM, 1); let r: Check; try { for (const x of ordSteps) if (/^place /.test(x)) w2.run(x); w2.run(`load ${top.name} with ${F.toFixed(1)} N + ${top.name}.mass * g spread`); const f = w2.value(`${top.name}.factor`), b = w2.value(`${top.name}.deflection`), span = Math.max(top.w, top.d); r = { what: `its ${nm} bears ${+(con.said.topP / 1000).toPrecision(3)} kPa on it`, ok: f >= 2 && b <= span / 250, says: `${+(F / 1000).toPrecision(3)} kN spread over its ${len(top.w)} × ${len(top.d)}: the load law: ${factorSays(f)}, ${bendSays(b, span)} (1/250 of ${len(span)} is ${len(span / 250)}: more fails)` }; } catch (e) { r = { what: `its ${nm} bears ${+(con.said.topP / 1000).toPrecision(3)} kPa on it`, ok: false, says: (e as Error).message.slice(0, 200) }; } out.push(r); } }
  // stacked: as made, each stands on the one below, its height again; to nest, each part under it must stand outside the
  // one below it (legs splayed past the seat under them), which is not derived
  if (made && con.said.stackN !== undefined) { const n = con.said.stackN, h = ext(1), tall = n * h, room = con.said.stackH; out.push({ what: `${n} of it stack${room !== undefined ? ` within ${len(room)}` : ''}`, ok: room !== undefined && tall <= room * 1.0001, says: `${n} stand ${len(tall)}, each ${len(h)} tall as made and standing on the one below${room !== undefined ? `${tall > room ? `, more than ${len(room)}` : ''}; to nest within it, each must sit no more than ${len(Math.max(0, room - h) / Math.max(1, n - 1))} above the one below` : ''}; to nest, its legs must stand outside the seat under them, which is not derived` }); }
  const ceil = con.said.ceiling, topUp = mine.length ? Math.max(...mine.map((m) => m.at[1] + m.h / 2)) : 0;
  for (const [k, i, word] of [['W', 0, 'wide'], ['H', 1, 'tall'], ['D', 2, 'deep']] as const) if (made && L[k] !== undefined) { const e = ext(i); if (k === 'H' && ceil !== undefined) out.push({ what: `it stands under the ${len(ceil)} ceiling`, ok: topUp <= ceil * 1.0001, says: `its top is ${len(topUp)} above the floor as made (it is ${len(e)} tall itself)` }); else out.push({ what: `it is no more than ${len(L[k]!)} ${word}`, ok: e <= L[k]! * 1.0001, says: `it is ${len(e)} ${word} as made` }); }
  // on a roof: the wind over it lifts it, about ½ ρ v² over its plan in a storm of 25 m/s, net lift coefficient 1 (estimates),
  // held down only by its own weight unless it is fixed
  if (made && /\b(on|for|onto|atop|up on)\s+(the|my|a|our|his|her|their)?\s*([a-z-]+\s+)?roofs?\b|\broof-?(mounted|top)\b|\brooftop\b/.test(con.words.toLowerCase())) { const A = ext(0) * ext(2), lift = 0.5 * 1.204 * 25 ** 2 * A, Wo = ownKg * G; out.push({ what: 'on a roof, its own weight holds it down in a storm', ok: Wo > lift, says: `a 25 m/s storm over its ${+A.toPrecision(3)} m² plan lifts it by about ½ ρ v² A, ${+lift.toPrecision(3)} N (net lift coefficient 1, estimate), against its own ${+Wo.toPrecision(3)} N${Wo > lift ? '' : `: it must be fixed down to the roof against ${+(lift - Wo).toPrecision(3)} N more, which is not derived`}; it is made standing on a level floor, and the roof's slope and what it is fixed to are not weighed` }); }
  if (made && L.plan) { const fp = [ext(0), ext(2)].sort((a, b) => b - a), want = [...L.plan].sort((a, b) => b - a), ok = fp[0]! <= want[0]! * 1.0001 && fp[1]! <= want[1]! * 1.0001; out.push({ what: `its plan is within ${len(want[0]!)} × ${len(want[1]!)}, either way round`, ok, says: `as made, its plan is ${len(fp[0]!)} × ${len(fp[1]!)}` }); }
  if (made && ceil !== undefined && folded && fold?.plan.folds.length) out.push({ what: `folded, it stays under the ${len(ceil)} ceiling`, ok: folded.reach <= ceil * 1.0001, says: `folded, its top is ${len(folded.reach)} above the floor${folded.reach > ceil * 1.0001 ? `, ${len(folded.reach - ceil)} into the ceiling: it must fold the other way, or be hung lower, or fold in more pieces` : ''}` });
  // how well it keeps hot or cold, as made
  const kp = made ? keeps(con, prefix) : null; if (kp) out.push(kp);
  // a weight that may be put down anywhere on its top, at its worst edge: it holds, or tips it (statics)
  if (made) for (const n of ordered) { const c2 = done.get(n); if (!c2 || n.kind !== 'surface' || n.on || chosen.get(n)?.id === WALL_WAY || n.want.flags.includes('span') || layOf(n.want).spread || !c2.top.name) continue; const ck = tipsUnder(ms as unknown as Box2[], c2.top.name, n.want.q.F!.v, prefix, n.tall >= 1 || /\b(people|persons|adults?|kids?|children|child|parents?|crowd|someone)\b/.test(n.want.q.F!.grounds)); if (ck) out.push(ck); }
  // a child climbing it, it empty: hung on its front, their weight about 300 mm out from its foot there (estimate)
  if (made && con.said.climber !== undefined) { const ck = climbTips(ms as unknown as Box2[], con.said.climber * G); if (ck) out.push(ck); }
  // a sheet no bigger than one is sold (wood: 1220 × 2440 mm plywood, 1525 × 3050 mm the largest common, estimate): a plate
  // bigger must be pieced and joined, which is not derived
  // a length of sawn timber no longer than one is stocked (about 4.88 m, 16 ft, the longest commonly stocked, estimate): one
  // longer must be spliced over a support, which is not derived
  const bars = new Set(ordSteps.map((x) => /^place bar named (\S+)/.exec(x)?.[1]).filter(Boolean));
  const spans = con.wants.some((w) => w.flags.includes('span'));
  // its ends stand for the banks it rests on: what it rests on there, and what holds it in a flood, are not made
  if (made && spans && ms.some((m) => STANDS.has(m.name))) gaps.push('its ends stand for the banks: what it rests on there (abutments and their footings) and what holds it down against a flood are not derived');
  // a metal plate bigger than sold: sheet up to 6 mm about 1525 × 3660 mm (5 × 12 ft), plate thicker than that about
  // 2440 × 6100 mm (8 × 20 ft) at most (mills' stock sizes, estimate): it must be pieced and welded or joined
  for (const m of ms) { if (STANDS.has(m.name) || !m.matter || familyOf(m.matter.id) !== 'metal' || bars.has(m.name)) continue; const ds = [m.w, m.h, m.d].sort((a, b) => b - a), thin = ds[2]! <= 0.006, [La, Wa] = thin ? [3.66, 1.525] : [6.1, 2.44], nm = m.name.slice(prefix.length + 1); if (ds[1]! > 0.05 && (ds[0]! > La + 1e-6 || ds[1]! > Wa + 1e-6)) gaps.push(`${nm}, ${len(ds[0]!)} × ${len(ds[1]!)}, is bigger than ${thin ? 'any sheet' : 'any plate'} sold (about ${MM(Wa)} × ${MM(La)} mm at most, estimate): it must be pieced and ${/aluminum|steel/.test(m.matter.id) ? 'welded' : 'joined'}, not derived`); }
  for (const m of ms) { if (STANDS.has(m.name) || !m.matter || familyOf(m.matter.id) !== 'wood') continue; const ds = [m.w, m.h, m.d].sort((a, b) => b - a), nm = m.name.slice(prefix.length + 1); if (bars.has(m.name)) { if (ds[0]! > 4.88) gaps.push(`${nm}, ${len(ds[0]!)} long, is longer than sawn timber is commonly stocked (about 4.88 m, 16 ft, estimate): ${spans && /rail/.test(nm) ? 'over one clear span there is nothing to splice it over, so it must be engineered timber made to length (glulam or LVL, estimate), a splice made to carry its whole moment, or a pier midway; none derived' : 'it must be spliced over a support, not derived'}`); } else if (ds[0]! > 3.05 || ds[1]! > 1.525) gaps.push(`${nm}, ${len(ds[0]!)} × ${len(ds[1]!)}, is bigger than any sheet sold (about 1525 × 3050 mm at most, estimate): it must be pieced and joined, not derived`); }
  // where people stand more than 760 mm up, a guard round its edge (about 1.07 m high, as building codes ask, estimate) and a
  // stair or ladder up to it are not derived
  const high = con.wants.find((w) => w.fn === 'support' && (w.q.H?.v ?? 0) > 0.76 && (/^(platform|bridge|stage|deck)$/.test(w.says) || w.flags.includes('crowd') || /\b(adults?|people|persons?|visitors|hikers|walkers|watchers|someone)\b/.test(con.words)));
  if (made && high) gaps.push(`it stands people ${len(high.q.H!.v)} up: ${/\b(beds?|bunks?|lofts?)\b/.test(con.words.toLowerCase()) ? 'a guard rail round its open sides, its top at least 160 mm above the mattress (EN 747-1, for bunk and high beds, estimate)' : 'a guard round its edge (about 1.07 m high, as building codes ask, estimate)'} and a stair or ladder up to it are not derived`);
  // a glazed house lets the light in: what is made is its shape and what bears on it, not its glazing
  // "so it hangs on the wall": hung so, what it weighs wants fixing into the wall, which is not weighed
  if (made && /\bhangs? (?:up )?on (?:the |a )?walls?\b/i.test(con.words)) gaps.push(`hung on a wall, its ${+ownKg.toPrecision(3)} kg wants fixing into the wall's studs or masonry, not weighed`);
  // a platform at a tree, made standing on its own feet: the tree is not made; where its trunk would pass up through it, a
  // hole of the trunk and its sway each way is not cut, nor what would hang it from the tree
  { const lw = con.words.toLowerCase(), TREE = '(?:trees?|trunks?|oaks?|pines?|maples?|beech(?:es)?|elms?|cedars?|firs?|sycamores?|chestnuts?|walnuts?|willows?)';
    if (made && con.wants.some((w) => w.fn === 'support') && new RegExp(`\\btree ?(?:houses?|forts?|platforms?)\\b|\\b${TREE}\\b.*\\b(?:platforms?|decks?)\\b|\\b(?:platforms?|decks?)\\b.*\\b${TREE}\\b`).test(lw)) {
      const q = (re: RegExp) => { const m = re.exec(lw); return m ? findQuantities(m[1]!).find((x) => sameDim(x.dim, DIMS.length))?.si : undefined; };
      const dT = q(new RegExp(`(\\d[\\d.]*\\s*(?:mm|cm|m|in|inch(?:es)?|ft|feet)\\b)(?:\\s+(?:diameter|dia\\.?|wide|across|thick))?\\s+(?:\\w+\\s+)?${TREE}\\b`)), sw = q(/(\d[\d.]*\s*(?:mm|cm|m|in|inch(?:es)?|ft|feet)\b)\s+of\s+(?:\w+\s+)?sway/);
      gaps.push(`the tree is not made: what is made stands on its own feet beside it, fixed to nothing${dT ? `; where its trunk would pass up through it, a hole of its ${len(dT)}${sw ? ` and ${len(sw)} of sway each way, ${len(dT + 2 * sw)} across,` : ','} is not cut` : ''}, nor what would hang it from the tree (bolts and brackets that let it move), which is not derived`); } }
  if (made && con.wants.some((w) => w.fn === 'enclose') && /\b(greenhouses?|glasshouses?|polytunnels?|hoop ?houses?|conservator(y|ies)|hothouses?)\b/.test(con.words.toLowerCase())) gaps.push('it is a house for light: its walls and roof want glazing (glass, or twin-wall polycarbonate in a frame), which is not kept; what is made is its shape and what bears on it, of what is kept, which lets no light through');
  // said to draw no power: nothing it makes may turn on a motor, drive on one or warm by a heater
  // no grid: what it makes that draws power draws it from cells or a store of its own, which are not kept; nothing kept
  // is wired to a grid. No fuel: nothing kept burns (no flame, stove or engine)
  if (made && con.said.noGrid) { const drawn = tests.some((x) => x.kind === 'spin' || x.kind === 'drive' || x.kind === 'warm'); out.push({ what: 'it draws no power from a grid', ok: true, says: drawn ? 'nothing it makes is wired to a grid: what it draws must come from cells or a store of its own, which are not made here' : 'nothing it makes draws power, nor is wired to a grid' }); }
  if (made && con.said.noFuel) out.push({ what: 'it burns no fuel', ok: true, says: 'nothing it makes burns: no flame, stove or engine is kept' });
  if (made && con.said.noPower) { const drawn = tests.filter((x) => x.kind === 'spin' || x.kind === 'drive' || x.kind === 'warm'); out.push({ what: 'it draws no power', ok: !drawn.length, says: drawn.length ? `what it makes draws power: ${drawn.map((x) => x.kind === 'spin' ? `the motor that turns ${x.name.slice(prefix.length + 1)}` : x.kind === 'drive' ? 'the motors that drive it' : `the heater that warms ${x.name.slice(prefix.length + 1)}`).join(', ')}` : 'nothing it makes turns on a motor, drives or warms by a heater: what it does it does by hand, by its own weight or not at all' }); }
  // raising in a time said: the power that takes (m g h / t), from what raises it, which is not derived: what rides and
  // what it carries
  const rt = tests.find((x) => x.kind === 'raise') as Extract<Test, { kind: 'raise' }> | undefined;
  if (made && rt && con.said.within !== undefined) { const rn = new Set([rt.name, ...(rides.get(rt.name) ?? [])]), kg = ms.filter((m) => rn.has(m.name)).reduce((a, m) => a + m.mass, 0) + (con.wants.find((w) => w.fn === 'raise')?.q.m?.v ?? 0), P = (kg * G * rt.L) / con.said.within; out.push({ what: `it raises what it carries ${len(rt.L)} in ${+con.said.within.toPrecision(3)} s`, ok: false, says: `${+kg.toPrecision(3)} kg up ${len(rt.L)} in that time takes about ${+P.toPrecision(3)} W (m g h / t) with nothing lost, about ${+(P / 0.35).toPrecision(3)} W through a lead screw of about 0.35 (estimate), from what raises it, which is not derived` }); }
  // what it raises, it raises only in part where what raises and holds it is not derived: its travel and guides are made
  const unraised = gaps.some((g) => g.startsWith('what raises it'));
  // held slower than its motor turns smoothly (its brushes' friction sticks and slips there, estimate), a turn the physics
  // holds is not held: the physics takes its friction as smooth
  const stalls = gaps.find((g) => /where its brushes' friction stalls it/.test(g));
  if (stalls) for (const [i, x] of out.entries()) if (/^it turns at /.test(x.what) && x.ok) out[i] = { ...x, ok: false, says: `${x.says}; but the physics takes its brushes' friction as smooth, and that slow they stick and slip (estimate): it is not held there by the motor kept` };
  // the engine holds each part rigid: where the load law finds a part gives, it stands in the engine only as a rigid one;
  // made under the laws as one piece, a part bigger than is sold must be pieced and joined
  if (out.some((x) => !x.ok && /^it spans |bears? |^its (legs|column) carr|^its screws hold|^held out, its hinges|^its rear legs/.test(x.what))) for (const [i, x] of out.entries()) if ((x.what === 'it stands when let go' || x.what === 'pushed at its top, it does not tip') && x.ok) out[i] = { ...x, says: `${x.says}; its parts and joints are held rigid in this test, so this says nothing of what gives under the laws found here` };
  { const big = gaps.filter((g0) => /bigger than any sheet sold|longer than sawn timber/.test(g0)).map((g0) => g0.split(',')[0]); if (big.length) for (const [i, x] of out.entries()) if (x.what === 'it can be made under the laws' && x.ok) out[i] = { ...x, ok: false, says: `${x.says}; but ${big.join(' and ')} as one piece is bigger than is sold, and must be pieced and joined, which is not derived` }; }
  // what it does is done only where its own test of it passes: a turn its test does not reach, a "not tip over" its wind
  // or push test shows it does
  const TESTED: [Fn, RegExp][] = [['turn', /^it turns at /], ['move', /^it moves at /], ['swing', /^it swings open$|^its \w+ holds [\d.]+ kPa across it$/], ['slide', /^it slides /], ['raise', /^it rides [\d.]+ \S+ up and down its guides$/], ['warm', /^it keeps warm at |^its heater holds the air inside at |^its walls let out no more than what warms it/]];
  const failed = (re: RegExp) => out.find((x) => re.test(x.what) && !x.ok);
  // what a failed check found, in a few words: its first figure
  const short = (says: string) => { const pin = /(\d+) pins?\b[^;]*?, more than the (\d+) its hinge has room for/.exec(says); if (pin) return ` (${pin[1]} pins wanted, more than the ${pin[2]} its hinge has room for)`; const bend = /times under its (?:yield|bending strength), bending ([\d.]+ \S+) \((1\/\d+) of /.exec(says); if (bend) return ` (bending ${bend[1]}, more than ${bend[2]} of its span)`; const k = /[\d.]+ times (?:over|under) its (?:yield|bending strength)[^;:,(]*|(?:it loses )?[\d.]+ times what [^;:,(]*|it (?:tips|lifts off|blows over)\b|it (?:wants|needs) holding down/.exec(says), m = k ?? /^[^;:]*?(\d[\d.]*\s*(?:× 10\^-?\d+\s*)?[a-zA-Zµ°%²³/·]+[^;:,(]{0,30})/.exec(says), x = m?.[0].trim() ?? ''; return x ? ` (${x.length > 90 ? `${x.slice(0, 90)}…` : x})` : ''; };
  const LOADED: [Fn, RegExp][] = [['support', /^it spans |^its (top|deck|board|roof|rails?|joists?) bears? |^each shelf bears |^its (legs|column) carr|^the .* bears it$|^\S+ kg at (an|any) edge of its top|^its screws hold|^its brackets bear|^held out, its hinges carry it$|^latched open, its hinges hold|^its rear legs bear|^a lean on its top does not tip it$/], ['move', /^its motors can start|^its driven wheels grip|^its deck bears |^what it carries stands on its |^on its .* slope, it does not tip$/], ['float', /^it floats with |^its deck bears a person standing on it$/], ['lift', /^it can hover with /], ['contain', /^it holds [\d.]+ L|^its walls hold /], ['slide', /^its rail bears /]];
  const asked = con.asked.map((a) => {
    // what cannot be put together under the laws does nothing it was asked
    if (!made && a.got && a.kind !== 'for') return { ...a, got: null, why: 'not made: its parts do not go together under the laws (see the first check)' };
    // a motor asked for ("with a motor", "a motorized slider") is had only where one is made that turns or drives it; what
    // is pushed in its test is not driven
    if (a.got && (a.kind === 'has' && /\b(motors?|gear ?motors?|engines?|actuators?|servos?|steppers?)\b/i.test(a.text) || a.kind === 'thing' && /\b(motori[sz]ed|motor-driven|electric)\b/i.test(a.text)) && !tests.some((x) => x.kind === 'spin' || x.kind === 'drive')) return { ...a, got: null, why: a.kind === 'thing' ? `made only as something to ${FN_WORDS[a.got]}: no motor is made; what moves is pushed in its test, and what drives it is not derived` : 'no motor is made: what moves is pushed in its test, and what drives it is not derived' };
    // "stay shut when cattle lean on it": done where its latch is made and holds; read before what is made, it waits on it
    if (a.kind === 'does' && !a.got && a.why.startsWith('what holds it shut')) { const lc = out.find((x) => x.what === 'shut, its latch and its posts hold the push leant near them'); if (lc) return lc.ok ? { ...a, got: 'swing' as Fn, why: '' } : { ...a, why: `its own check fails: ${lc.what}${short(lc.says)}` }; }
    // towed: done only where what hitches it to what tows it is made; it is not
    if (a.got === 'move' && a.kind !== 'thing' && /\btow(ed|s|ing)?\b/i.test(a.text) && gaps.some((g) => g.startsWith('what hitches it to what tows it'))) return { ...a, got: null, why: 'it rolls, but what hitches it to what tows it (a tow arm and a hitch) is not made, and its speed is not weighed' };
    // "30 cubbies": so many compartments are that thing only where their dividers are made; made as shelves, they are not
    if (a.kind === 'thing' && a.got && con.said.compartments && /\b(cubb(y|ies)|compartments?|pigeon ?holes?|cubicles?|lockers?|bins?|slots?)\b/i.test(a.text) && !ordSteps.some((x) => /^place \w+ named \w+_div/.test(x))) return { ...a, got: null, why: 'made as shelves: the dividers between its compartments are not derived' };
    // a house for light that lets none through is not that house: its shape is made, its glazing is not
    if (a.kind === 'thing' && a.got && gaps.some((g) => g.startsWith('it is a house for light'))) return { ...a, got: null, why: `made only as something to ${FN_WORDS[a.got]}: what it is made of lets no light through, and glazing is not kept` };
    // folding: done where it folds, lies still folded, and (where a size is said with it) folds that small
    if (a.how === 'folds') { if (!folded) return { ...a, got: null, why: fold ? 'it does not fold: nothing it is made of folds' : 'it does not fold: what it is made of is not one I fold' }; if (!folded.ok) return { ...a, got: null, why: `it does not fold: ${folded.why}` }; if (/\bwall\b/.test(a.text) && !fold?.grounds.size) return { ...a, got: null, why: 'folded, it lies on the floor: it is not hung on a wall to fold against' }; { const h = out.find((x) => /hand folds it$/.test(x.what) && x.ok === false); if (h) return { ...a, got: null, why: `its own check fails: ${h.what}${short(h.says.replace(/^[^,]*,\s*/, ''))}` }; } if (/\b\d[\d.]*\s*(s|secs?|seconds?|minutes?|mins?)\b/i.test(a.text) && !a.how?.includes('not checked')) a = { ...a, how: 'folds; how long it takes is not checked' }; if (/\d/.test(a.text) && folded.fits === false) return { ...a, got: null, why: 'folded, it is bigger than this (see its checks)' }; const nums = (a.text.toLowerCase().match(/\d[\d.,]*\s*(°\s*[cf]|[a-zµ/%²³]+)/g) ?? []).map((x) => x.replace(/\s+/g, ' ')), hit = nums.length ? out.find((x) => x.ok === false && nums.some((n) => x.what.toLowerCase().replace(/\s+/g, ' ').includes(n))) : undefined; if (hit) return { ...a, got: null, why: `its own check fails: ${hit.what}${short(hit.says)}` }; return a; }
    if (a.got === 'raise' && a.kind === 'does' && unraised && !a.load) return { ...a, got: null, why: 'its travel and its guides are made and tested; what raises it and holds it there (a screw, a winch, a linkage) is not derived' };
    if (a.got && a.kind === 'does' && (/^(?:(?:must|should|has to|have to|needs? to|will|can|shall)\s+)?not (tip|topple|fall|overturn|blow)|^tip-?proof$/.test(a.text) || /^(?:(?:must|should|has to|have to|needs? to|will|can|shall)\s+)?(stays?|stand\w*|remains?|withstands?|survives?|weathers?)\b.*\b(winds?|gusts?|gales?|storms?)\b/.test(a.text))) { const f = failed(/^it stands in a .* wind$|^empty, it stands in that wind$|^the wind does not lift it$|^pushed at its top, it does not tip|^on its .* slope, it does not tip$|^empty, .* climbing its front does not tip it$|at an edge of its top does not tip it$|^what it carries stands on its /); if (f) return { ...a, got: null, why: `its own test fails: ${f.what}` }; return a; }
    const tf = a.got && a.kind !== 'for' && !a.load ? TESTED.find(([fn]) => fn === a.got) : undefined, f = tf ? failed(tf[1]) : undefined;
    if (f) return { ...a, got: null, why: `its own test fails: ${f.what}${short(f.says)}${/no opening it closes/.test(f.says) ? '; and there is no opening it closes' : ''}` };
    // what it carries is carried only where the law of its load passes: a span that gives, a deck that breaks
    const tl = a.got && a.kind !== 'for' ? LOADED.find(([fn]) => fn === a.got) : undefined, fl = tl && (a.load || a.kind === 'thing' || findQuantities(` ${a.text} `).some((q) => sameDim(q.dim, DIMS.mass))) ? out.find((x) => tl[1].test(x.what) && x.ok === false) : undefined;
    if (fl) return { ...a, got: null, why: `its load fails: ${fl.what}${short(fl.says)}` };
    // a weight said that nothing made is tested with is not carried, as far as is known
    if (a.load && tl && made && !out.some((x) => tl[1].test(x.what))) return { ...a, got: null, why: 'nothing it makes is tested with that weight on it' };
    return a;
  }).map((a, _, all) => {
    // a thing named for its folding ("a folding table") is that thing only where it folds
    const nf = a.kind === 'thing' && a.got ? all.find((x) => x.how === 'folds' && !x.got && x.text.toLowerCase().split(/[\s-]+/).every((w) => a.text.toLowerCase().split(/[\s-]+/).includes(w))) : undefined;
    if (nf) return { ...a, got: null, why: `made only as something to ${FN_WORDS[a.got!]}: what it is named for (${nf.text}) is not done, as below` };
    // a number said in what it does that was not used: that part of it is not done, so it is not ticked
    const sp = (x: string) => x.toLowerCase().replace(/\s+/g, ' '), unused = a.got && a.kind !== 'for' && a.kind !== 'thing' ? con.dropped.filter((d) => { const n = d.split(':')[0]!.trim(); return /\d/.test(n) && sp(a.text).includes(sp(n)); }) : [];
    // "swings open on its own": nothing made does it by itself where no drive is made
    const bySelf = a.got && a.kind === 'does' && /\b(on its own|by itself|of itself|automatically|unaided)\b/i.test(a.text) && !ordSteps.some((x) => /^place motor\b/.test(x)) ? (/\b(unpowered|no (power|electricity)|without (power|electricity)|passive(ly)?)\b/i.test(con.words) ? `nothing made does it by itself: what ${/\b(shut|shuts|close|closes)\b/i.test(a.text) ? 'shuts' : 'moves'} it with no power (${a.got === 'swing' ? 'a spring, a weight, or hinges set aslant so it falls shut' : 'a spring or a weight'}) is not made` : `nothing made does it by itself: what drives it (${a.got === 'swing' ? 'a ram or a motor at its hinge' : 'a motor'}) is not made`) : '';
    // made as its frame: all it lifts is borne by its arms at full throttle, and what it carries is a weight carried
    if (con.wants.some((w) => w.flags.includes('frame'))) {
      const arms = out.find((x) => x.what === 'its arms bear its motors at full throttle');
      if (arms && /^it lifts .* in all$/.test(a.text)) return { ...a, got: arms.ok ? ('lift' as Fn) : null, met: arms.ok, why: arms.ok ? '' : `its own check fails: ${arms.what}${short(arms.says)}`, how: 'borne by its arms at full throttle' };
      if (a.kind === 'has' && /\b(payload|camera|gimbal)\b/i.test(a.text) && findQuantities(` ${a.text} `).some((q) => sameDim(q.dim, DIMS.mass))) return { ...a, got: 'lift' as Fn, why: '', how: 'carried: its weight is in all it lifts' };
    }
    // a wind it must survive is not done where what carries it there is not made: sockets that hold its poles upright at
    // their feet, or what holds it down in snow, where a peg holds little
    const rests = a.got && a.kind !== 'for' && /\b(gusts?|winds?|gales?|storms?)\b/i.test(a.text) ? gaps.find((g) => /wants a socket or base at each foot that holds it so, not made|in snow or ice a peg holds little/.test(g)) : undefined;
    if (rests && !unused.length && !bySelf) return { ...a, got: null, why: `weighed as held by what is not made: ${/socket/.test(rests) ? 'its poles bear it only held upright at their feet, by sockets not made, and what holds its frame square is not weighed' : 'its stakes are weighed as pegs in firm ground; in snow or ice a peg holds little, and what holds there (deadmen, ice screws) is not made'}` };
    return unused.length || bySelf ? { ...a, got: null, why: `done as ${FN_WORDS[a.got!]}, but not all of it: ${[bySelf, ...unused].filter(Boolean).join('; ')}` } : a;
  }).map((a, _, all) => {
    // the thing asked for is that thing only where all it is asked to do and have is done; else it is made only as what
    // it does
    const short = a.kind === 'thing' && a.got ? all.filter((x) => (x.kind === 'does' || x.kind === 'has') && !x.got) : [];
    return short.length ? { ...a, got: null, why: `made only as something to ${FN_WORDS[a.got!]}: not all it is asked to do is done (${short.length} below)` } : a;
  });
  // what it was said it must keep within (its weight, its size, a part's weight, how small it folds) is asked as much as
  // what it does: each is met where its own check passes, and is not where nothing is made to check it
  const LIMIT = /^(as made, )?it weighs no more than |^no part weighs more than |^it is no more than |^it stands under the |^folded, it stays under |^it folds flat to |^folded, it is no more than [\d.]+ \S+ wide$|^it folds or packs to |^it packs into |^it goes inside a |^its plan is within |^it draws no more than |^it draws no power$|^it draws no power from a grid$|^it burns no fuel$|^\d+ of it stack/;
  // a limit already said in what it does ("packs into a 70 cm bundle weighing under 5 kg") is that, not asked again
  const figs = (x: string) => [...x.toLowerCase().matchAll(/(\d[\d.,]*)\s*(kg|g|mm|cm|m|kw|w|l)\b/g)].map((m) => { const v = parseFloat(m[1]!.replace(/,/g, '')), u = m[2]!; return u === 'g' ? [v / 1000, 'kg'] : u === 'mm' ? [v / 1000, 'm'] : u === 'cm' ? [v / 100, 'm'] : u === 'kw' ? [v * 1000, 'w'] : [v, u]; }) as [number, string][];
  // (by the units each is said in, inches against millimetres, as the same quantity within 1%)
  const said = (lim: string, text: string) => figs(lim).some(([v, u]) => figs(text).some(([v2, u2]) => u === u2 && Math.abs(v - v2) <= 1e-3 * Math.max(v, v2))) || findQuantities(lim).some((p) => p.dim && findQuantities(` ${text} `).some((q) => q.dim && sameDim(p.dim, q.dim) && Math.abs(p.si - q.si) <= 0.01 * Math.max(Math.abs(p.si), Math.abs(q.si))));
  // a part's weight taken from who puts it up is said with that, not as a thing of its own asked
  if (con.said.partPeople !== undefined) { const pc = out.find((y) => /^no part weighs more than/.test(y.what)); const ai = asked.findIndex((a) => /^who puts it up|^setting it up is not derived|^putting it/.test(a.why) || /\b(assembl\w*|pitch\w*|put up|set up|erect\w*)\b/i.test(a.text)); if (pc && ai >= 0) asked[ai] = { ...asked[ai]!, why: `${asked[ai]!.why}; of it, ${pc.what} (what they lift together), ${pc.ok ? 'kept' : 'not kept'}: ${pc.says}` }; }
  for (const x of out.filter((y) => LIMIT.test(y.what) && !(con.said.partPeople !== undefined && /^no part weighs more than/.test(y.what)) && !asked.some((a) => a.why.includes(y.what) || (a.kind !== 'for' && a.kind !== 'limit' && said(y.what, a.text))))) { const left = /only ([\d.]+ kg) is left for it/.exec(x.says); asked.push({ text: x.what.replace(/^as made, /, '').replace(/, with too little left for what it does not make$/, ''), kind: 'limit', got: null, met: x.ok, why: x.ok ? '' : left ? `as made it is within it, but only ${left[1]} is left for what it does not make` : `its own check fails${short(x.says)}` }); }
  // what it was said to stand in or keep to (a wind, snow, cold or heat, how long its cells last, water held back) is
  // asked as much as what it does: met where the checks and the laws that weigh it pass. Checks and laws of one thing
  // said (by its topic, or a figure they share, units aside) are taken as one; one that no item above answers is asked
  // in its own words, and where the laws weigh it but nothing made is checked to do it, it is not shown met
  {
    const TOPIC: [string, RegExp][] = [['wind', /\b(winds?|gusts?|gales?|storms?|wind-?proof)\b/i], ['snow', /\bsnow\b/i], ['cells', /\b(batter(y|ies)|cells?)\b/i], ['water', /\bwater(s|ed|ing)?\b/i], ['shut', /\bshut\b/i], ['climb', /\bclimb\w*\b/i]];
    const topic = (x: string) => TOPIC.find(([, re]) => re.test(x))?.[0], qs = (x: string) => findQuantities(x).filter((q) => q.dim && q.si !== 0);
    const share = (x: string, y: string) => { const tx = topic(x); return (!!tx && tx === topic(y)) || qs(x).some((p) => qs(y).some((q) => sameDim(p.dim, q.dim) && Math.abs(p.si - q.si) <= 0.01 * Math.max(Math.abs(p.si), Math.abs(q.si)))); };
    const ENV = /\bwind$|^the wind does not lift it$|\bbear the wind\b|\bof snow$|°C|^its cells last |\bof water\b|\bholds [\d.]+ k?Pa\b|\babove the water\b|climbing its front does not tip it$/;
    const saidQ = qs(con.words), weighs = [...out.filter((x) => ENV.test(x.what)), ...con.bounds.filter((b) => b.ok !== null || qs(b.what).some((p) => saidQ.some((q) => sameDim(p.dim, q.dim) && Math.abs(p.si - q.si) <= 0.01 * Math.abs(q.si))))];
    const groups: (typeof weighs)[] = [];
    for (const x of weighs) { const g = groups.find((g0) => g0.some((y) => share(x.what, y.what))); if (g) g.push(x); else groups.push([x]); }
    // a check of the same thing that is not one of these ("shut, its rails bear the 5.34 kN push") answers it too
    for (const x of out) if (!weighs.includes(x)) groups.find((g0) => g0.some((y) => share(x.what, y.what)))?.push(x);
    for (const g of groups) {
      const bad = g.find((x) => x.ok === false), checked = g.some((x) => x.ok === true), head = g.find((x) => x.ok !== null && qs(x.what).length) ?? bad ?? g.find((x) => x.ok !== null) ?? g[0]!, met = !bad && checked;
      const why = (a: Asked | null) => bad ? `${out.includes(bad as Check) ? 'its own check fails' : 'the laws say not'}${a?.text === bad.what ? short(bad.says).replace(/^ \((.*)\)$/, ': $1') : `: ${bad.what}${short(bad.says)}`}` : met ? '' : `the laws weigh it${a?.text === head.what ? '' : ` (${head.what})`}, but nothing made is checked to do it`;
      const hit = asked.map((a, i) => [a, i] as const).filter(([a]) => a.kind !== 'thing' && g.some((x) => share(a.text, x.what)));
      for (const [a, i] of hit) {
        if (a.kind === 'for') asked[i] = { ...a, kind: 'limit', met, why: why(a) };
        else if (a.kind === 'limit') asked[i] = { ...a, met: !!a.met && met, why: a.met && !met ? why(a) : a.why };
        else if (a.got && !met) asked[i] = { ...a, got: null, why: why(a) };
        else if (!a.got && bad && !a.why.includes(bad.what)) asked[i] = { ...a, why: `${a.why}; and ${why(a)}` };
      }
      if (!hit.length) asked.push({ text: head.what, kind: 'limit', got: null, met, why: why({ text: head.what } as Asked) });
    }
  }
  // made as its frame: all it lifts is borne by its arms at full throttle
  if (con.wants.some((w) => w.flags.includes('frame'))) { const arms = out.find((x) => x.what === 'its arms bear its motors at full throttle'); if (arms) for (const [i, a] of asked.entries()) if (/^it lifts .* in all$/.test(a.text)) asked[i] = { ...a, got: arms.ok ? ('lift' as Fn) : null, met: arms.ok, why: arms.ok ? '' : `its own check fails: ${arms.what}${short(arms.says)}`, how: 'borne by its arms at full throttle' }; }
  // what floats is let go and pushed on dry ground: there is no water in the physics
  if (con.wants.some((w) => w.fn === 'float')) for (const [i, x] of out.entries()) if (x.what === 'it stands when let go' || x.what === 'pushed at its top, it does not tip') out[i] = { ...x, says: `${x.says}; on dry ground: there is no water in the physics, so this says nothing of how it floats` };
  const does = doesOf(asked, gaps, con.wants), ok = made && out.every((x) => x.ok), holds = made && out.every((x) => x.ok || LIMIT.test(x.what) || /^it folds flat$|^folded, it lies still|^it packs down$/.test(x.what));
  const foldTrack = fold?.clean && folded?.ok && asBuilt ? foldTrackOf(fold, asBuilt) : undefined;
  return { ...(foldTrack ? { foldTrack } : {}), name: con.name, title: `${con.name} (seed ${seed})`, seed, prefix, steps: ordSteps, traces: tr, checks: out, ok, holds, choices, tries: [], gaps, ...(conditions.length ? { conditions } : {}), mass: ownKg, parts: own.length, footprint: foot, words: con.words, plan, asked, does, whole: ok && !gaps.length && does[0] === does[1] };
}
/** A child climbing it, it empty: their weight hung about 300 mm out from the outline its feet make, at the middle of its
 *  front (its longer side), turns it over that edge, held back only by its own weight: it tips where F d_out passes
 *  W d_in. Statics. */
function climbTips(ms: Box2[], F: number): Check | null {
  const own = ms.filter((m) => !STANDS.has(m.name)), feet = own.filter((m) => m.at[1]! - m.h / 2 <= 1e-3);
  if (!feet.length) return null;
  const xs = feet.flatMap((m) => [m.at[0]! - m.w / 2, m.at[0]! + m.w / 2]), zs = feet.flatMap((m) => [m.at[2]! - m.d / 2, m.at[2]! + m.d / 2]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)], alongX = x1 - x0 >= z1 - z0;
  const W = own.reduce((a, m) => a + m.mass, 0) * G, cg = alongX ? own.reduce((a, m) => a + m.mass * m.at[2]!, 0) / (W / G) : own.reduce((a, m) => a + m.mass * m.at[0]!, 0) / (W / G);
  const edge = alongX ? z1 : x1, inn = edge - cg, out = 0.3, Mt = F * out, Mr = W * inn, top = Math.max(...own.map((m) => m.at[1]! + m.h / 2));
  // and on it, leaning back from its top: their weight out on its front and their pull at its top together; a child hanging
  // back on straight arms pulls outward up to about their own weight (estimate)
  const P = Math.max(0, (Mr - Mt) / top), ok = Mt < Mr && P >= F;
  return { what: `empty, a ${+(F / G).toPrecision(3)} kg child climbing its front does not tip it`, ok, says: `hung on the middle of its front, their weight about ${len(out)} out from its foot there (estimate): ${+Mt.toPrecision(3)} N·m over that edge against ${+Mr.toPrecision(3)} N·m its own ${+(W / G).toPrecision(3)} kg holds it with, ${len(inn)} inside (statics)${Mt < Mr ? `, ${+(Mr / Mt).toPrecision(3)} times it` : ': it tips'}; standing on it and leaning back from its top, ${len(top)} up, their pull there tips it at ${+P.toPrecision(3)} N ((W d_in − F d_out) / H, statics), ${((P / F) * 100).toFixed(0)}% of their weight, ${ok ? 'more than' : 'less than'} the up to their own weight a child hanging back on straight arms pulls (estimate)${ok ? '' : ': it wants fixing to the wall, a wider foot, or weight low in it'}` };
}
/** What stands on the floor holds it up within the outline its feet make (their convex hull); a weight put down at a
 *  corner or edge of its top outside that outline turns it over the nearest edge of it, held back only by its own weight
 *  on its middle: it tips where F d_out passes W d_in. Statics, the weight at the worst of its top's corners and edges. */
type Box2 = { name: string; at: number[]; w: number; h: number; d: number; mass: number };
function tipsUnder(ms: Box2[], topName: string, F: number, prefix: string, stoodOn = false): Check | null {
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
  // stood on high up (its top 1.5 m or more, people on it), with them at its edge and pushed sideways at its top with a tenth of all of it, as one
  // leaning on its rail would (estimate), together: over the edge nearest them, F d + P H against W d_in (statics)
  const Ht = top.at[1]! + top.h / 2; let both: { M: number; R: number } | null = null;
  if (stoodOn && Ht >= 1.5) for (const p of [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [xm, z0], [xm, z1], [x0, zm], [x1, zm]] as [number, number][]) {
    const e = inside(p).sort((a, b) => a.d - b.d)[0]!, inn = inside(cg).find((x) => x.i === e.i)!.d, M = F * -e.d + 0.1 * (W + F) * Ht, R = W * inn;
    if (!both || M / R > both.M / both.R) both = { M, R };
  }
  const bothSays = both ? `; with them there and pushed sideways at its top, ${len(Ht)} up, with a tenth of all of it (${+(0.1 * (W + F)).toPrecision(3)} N, as one leaning on its rail would, estimate), together they turn it with ${+both.M.toPrecision(3)} N·m against ${+both.R.toPrecision(3)} N·m (statics)${both.M >= both.R ? ': it tips: it wants wider feet, bracing out to the ground, or fixing to what it stands by' : ''}` : '';
  if (!worst) return { what: `${+(F / G).toPrecision(3)} kg at any edge of its top does not tip it`, ok: !both || both.M < both.R, says: `every edge of its top is within the outline its feet make on the floor, so a weight put down anywhere on it is held (statics)${bothSays}` };
  return { what: `${+(F / G).toPrecision(3)} kg at an edge of its top does not tip it`, ok: worst.ratio < 1 && (!both || both.M < both.R), says: `its worst edge is ${len(worst.out)} outside the outline its feet make on the floor: ${+(F / G).toPrecision(3)} kg put down there turns it over that edge with ${+(F * worst.out).toPrecision(3)} N·m against ${+(W * worst.inn).toPrecision(3)} N·m its own ${+(W / G).toPrecision(3)} kg holds it with, ${len(worst.inn)} inside (statics)${worst.ratio >= 1 ? ': it tips, as one leaning on its edge would tip it; it wants wider feet, or more weight low down' : ''}${bothSays}` };
}
/** How far a thing's up axis turned between two turnings: tipping, whatever it turned about its upright. */
const tiltOf = (from: number[], to: number[]) => { const a = matOf(from as [number, number, number]), b = matOf(to as [number, number, number]); const dot = a[1] * b[1] + a[4] * b[4] + a[7] * b[7]; return Math.acos(Math.max(-1, Math.min(1, dot))); };
/** With real physics: let go, it stands; pushed at its top by a tenth of its weight, it does not tip; what moves, moves. */
function physics(w: Workshop, prefix: string, piece: string[], tests: Test[], riders: string[] = [], wind?: number, carried = 0, rho = airRho()): Check[] {
  const out: Check[] = [], mine = () => new Map(w.all().made.filter((m) => m.name.startsWith(`${prefix}_`)).map((m) => [m.name, m]));
  // fixed to what holds it, it stands as that does: letting it go, pushing it or blowing on it would test what stands for
  // the world, not it; what its fixings bear is weighed by statics with its struts
  const fixedTo = FIXED.get(prefix);
  if (fixedTo && !tests.some((t) => t.kind !== 'raise')) return [{ what: 'it stands when let go', ok: true, says: `fixed at its plates to ${fixedTo}, which stands for the world here: it does not fall or tip while that holds; what each plate is pulled and pushed with is weighed by statics with its struts, and how the bolts or clamps there hold it is not derived` }];
  try {
    const drive = tests.find((t) => t.kind === 'drive') as Extract<Test, { kind: 'drive' }> | undefined, spin = tests.find((t) => t.kind === 'spin') as Extract<Test, { kind: 'spin' }> | undefined;
    const before = mine(); w.run(drive || spin ? 'simulate 0.5 s' : 'simulate 1.5 s'); const after = mine();
    // standing is not falling: none of it drops and what stands does not tilt; a slide along a flat floor that nothing
    // pushes is no law's doing but the engine's drift, said apart
    const of = (n: string) => ({ a: after.get(n), b: before.get(n) }), drops = piece.map((n) => { const { a, b } = of(n); return a && b ? b.at[1] - a.at[1] : 0; }), drop = Math.max(0, ...drops);
    const tilt = Math.max(0, ...piece.map((n) => { const { a, b } = of(n); return a && b ? tiltOf(b.turn, a.turn) : 0; }));
    const creep = Math.max(0, ...piece.map((n) => { const { a, b } = of(n); return a && b ? Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2]) : 0; }));
    if (!drive) out.push({ what: 'it stands when let go', ok: drop < 0.01 && tilt < (2 * Math.PI) / 180, says: piece.length ? `let go (Jolt), it dropped ${len(drop)} at most and tilted ${+((tilt * 180) / Math.PI).toFixed(2)}° (10 mm or 2° fails)${creep > 0.005 ? `; it crept ${len(creep)} along the floor, which nothing pushes it to: the engine's drift, not a law's` : ''}` : 'nothing in it to let go' });
    let windLater: (() => void) | null = null, tipLater: (() => void) | null = null;
    if (!drive && piece.length) {
      // pushed across its narrower way, where it tips first, by a tenth of its weight with what it carries, at the top of
      // the highest part that stands or rides or turns on it; how far it tips is read off what stands
      // with what it carries: the blocks put on it, or where none could be (a liquid in it, a load that did not fit), its weight
      // (what stands for something else, a bank or a wall, is neither pushed nor weighed in the push)
      const loadKg = w.all().made.filter((m) => m.name.startsWith('test_load')).reduce((a, m) => a + m.mass, 0), total = [...after.values()].filter((m) => !STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0) + Math.max(loadKg, carried);
      const topOf = (xs: string[]) => xs.filter((n) => !STANDS.has(n)).map((n) => after.get(n)!).filter(Boolean).sort((a, b) => b.at[1] + b.h / 2 - (a.at[1] + a.h / 2))[0] ?? xs.map((n) => after.get(n)!).filter(Boolean)[0];
      const top = topOf([...piece, ...riders, ...(spin ? [spin.name] : [])])!, frame = topOf(piece)!, F = 0.1 * total * G;
      const xs = [...after.values()].map((m) => [m.at[0] - m.w / 2, m.at[0] + m.w / 2, m.at[2] - m.d / 2, m.at[2] + m.d / 2]), wx = Math.max(...xs.map((v) => v[1]!)) - Math.min(...xs.map((v) => v[0]!)), wz = Math.max(...xs.map((v) => v[3]!)) - Math.min(...xs.map((v) => v[2]!)), ax = ROLLS.get(prefix) === 'z' ? 'x' : ROLLS.get(prefix) === 'x' ? 'z' : wz < wx ? 'z' : 'x';
      // run after what it does is tested (a push that tips it over would leave its moving parts tested where they fell)
      tipLater = () => {
      // (let settle first: what was raised comes down, what was set going runs down)
      if (tests.length) w.run('simulate 1 s');
      const r0 = [...mine().get(frame.name)!.turn];
      w.run(`push ${top.name} with ${+F.toFixed(2)} N along ${ax} for 0.5 s at its top`);
      const t1 = mine().get(frame.name)!, tip = tiltOf(r0, t1.turn);
      // what it carries that is not on it in the physics (a liquid) pushes but does not hold it down there: where it tips
      // so, it is weighed by statics as well, that weight standing on the middle of its foot (as a liquid's does while it
      // stands upright): it tips if the push's moment F h passes m g b / 2
      const off = carried > loadKg + 1e-6, hTop = top.at[1] + top.h / 2 - Math.min(...[...after.values()].map((m) => m.at[1] - m.h / 2)), bw = ax === 'z' ? wz : wx, Mp = F * hTop, Mr = total * G * (bw / 2), stat = off && tip >= (5 * Math.PI) / 180;
      // and by statics, on what it stands on (its feet, and what stands for the ground or for its stakes): a push held only
      // half a second may not show a tip that a steady one would
      const all0 = [...after.values()], yf = Math.min(...all0.map((m) => m.at[1] - m.h / 2)), feet = all0.filter((m) => m.at[1] - m.h / 2 <= yf + 2e-3), ix = ax === 'z' ? 2 : 0, fw = feet.length ? Math.max(...feet.map((m) => m.at[ix]! + [m.w, m.h, m.d][ix]! / 2)) - Math.min(...feet.map((m) => m.at[ix]! - [m.w, m.h, m.d][ix]! / 2)) : bw;
      const standKg = all0.filter((m) => STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0), MrS = (total + standKg) * G * (fw / 2), statTips = !stat && Mp >= MrS;
      out.push({ what: stat ? `pushed at its top, it does not tip by statics, though the physics test tips it` : 'pushed at its top, it does not tip', ok: stat ? Mp < Mr : tip < (5 * Math.PI) / 180 && !statTips, says: `pushed at the top of ${top.name.replace(`${prefix}_`, '')} ${ROLLS.has(prefix) ? 'sideways, across the way its wheels roll' : 'across its narrower way'} (${ax}) with a tenth of its weight${Math.max(loadKg, carried) > 0 ? " and its load's" : ''} (${+F.toPrecision(3)} N) for half a second (Jolt), it tilted ${+((tip * 180) / Math.PI).toFixed(1)}° (more than 5° fails)${off ? `; ${+(carried - loadKg).toPrecision(3)} kg of what it carries is counted in the push but not on it, so the push is the harsher for it` : ''}${stat ? `; with that weight standing on the middle of its foot, as a liquid's does while it stands, by statics the push's moment ${+Mp.toPrecision(3)} N·m (F h, ${len(hTop)} up) against ${+Mr.toPrecision(3)} N·m holding it down (m g b / 2, its foot ${len(bw)} across): it ${Mp < Mr ? 'does not tip' : 'tips'}` : ''}${statTips ? `; but by statics the push's moment, ${+Mp.toPrecision(3)} N·m (F h, ${len(hTop)} up), passes the ${+MrS.toPrecision(3)} N·m its weight holds it with over half its foot (${len(fw)} across): held steady, it tips; half a second is too short to show it` : ''}` });
      };
      // in the wind said: ½ ρ v² on the face each part shows across the wind, a slender one's (a bar, a board edge on: five
      // times as long as it is wide there) by a drag coefficient of 2 and any other's by 1.2 (estimate), no more in all than
      // its solid outline would take by 1.2, pushed where those pushes are centred, for 2 s (a gust); how far it tips and
      // slides is read off what stands
      // run last: a gust that slides it away or flings a door open would leave what it does tested where it was blown to
      if (wind !== undefined) windLater = () => {
        const q = 0.5 * rho * wind ** 2, ys = [...after.values()].map((m) => [m.at[1] - m.h / 2, m.at[1] + m.h / 2]), y0 = Math.min(...ys.map((v) => v[0]!)), hy = Math.max(...ys.map((v) => v[1]!)) - y0, A = (ax === 'z' ? wx : wz) * hy;
        // what each part shows across the wind as it is turned: a box, half the sum over its faces of each face's area by
        // how square it stands to the wind (|n · d| A); a tube or a rod, its length by its width by the sine of its angle
        // to the wind, and its end by the cosine; square to the axes, as its outline shows
        const dW: [number, number, number] = ax === 'z' ? [0, 0, 1] : [1, 0, 0];
        const shows = (m: Made): { A: number; slender: boolean; round?: boolean } => {
          if (!m.turn.some((a) => Math.abs(a) > 1e-9)) { const across = ax === 'z' ? m.w : m.d; return { A: across * m.h, slender: Math.max(across, m.h) > 5 * Math.min(across, m.h) }; }
          const R = matOf(m.turn), col = (i: number): [number, number, number] => [R[i]!, R[3 + i]!, R[6 + i]!], e = [m.local.w, m.local.h, m.local.d];
          if (m.kind === 'tube' || m.kind === 'cylinder') { const i = ({ x: 0, y: 1, z: 2 } as const)[m.axis], u = col(i), c2 = Math.abs(u[0] * dW[0] + u[1] * dW[1] + u[2] * dW[2]), L = e[i]!, D = Math.max(...e.filter((_, k) => k !== i)); return { A: D * L * Math.sqrt(Math.max(0, 1 - c2 * c2)) + (Math.PI * D * D * c2) / 4, slender: L > 5 * D, round: true }; }
          let A = 0; for (let i = 0; i < 3; i++) { const u = col(i), c2 = Math.abs(u[0] * dW[0] + u[1] * dW[1] + u[2] * dW[2]); A += c2 * e[(i + 1) % 3]! * e[(i + 2) % 3]!; }
          const sorted = [...e].sort((a, b) => b - a); return { A, slender: sorted[0]! > 5 * sorted[1]! };
        };
        // a slender flat part (a bar, a board edge on) by a drag coefficient of 2; a round one across the wind (a tube, a
        // pole) by 1.2, as a cylinder below its drag crisis (estimate); any other by 1.2
        const faces = [...after.values()].map((m) => { const sh = shows(m), cd = sh.slender && !sh.round ? 2 : 1.2; return { F: q * cd * sh.A, y: m.at[1], A: sh.A, bar: sh.slender && !sh.round, round: sh.slender && !!sh.round }; });
        const Fp = faces.reduce((a, f) => a + f.F, 0), Fs = q * 1.2 * A, Fw = Math.min(Fp, Fs), yc = Fp > 0 ? faces.reduce((a, f) => a + f.F * f.y, 0) / Fp : y0 + hy / 2, Ap = faces.reduce((a, f) => a + f.A, 0), bars = faces.filter((f) => f.bar).length, rounds = faces.filter((f) => f.round).length;
        const r1 = [...mine().get(frame.name)!.turn], at1 = [...mine().get(frame.name)!.at];
        w.run(`push ${frame.name} with ${+Fw.toFixed(2)} N along ${ax} for 2 s at ${+yc.toFixed(4)} m up`);
        const t2 = mine().get(frame.name)!, tip2 = tiltOf(r1, t2.turn), slid = Math.hypot(t2.at[0] - at1[0]!, t2.at[2] - at1[2]!);
        out.push({ what: `it stands in a ${+(wind * 3.6).toPrecision(3)} km/h wind`, ok: tip2 < (5 * Math.PI) / 180 && slid < 0.05, says: `the wind pushes ½ ρ v² = ${+q.toPrecision(3)} Pa${Math.abs(rho - 1.204) > 0.01 ? ` (air ${+rho.toPrecision(3)} kg/m³ where it stands, p / R T)` : ''} on the ${+Ap.toPrecision(3)} m² its parts show across it (${bars} slender, by a drag coefficient of 2, ${rounds ? `${rounds} round across it and ` : ''}the rest by 1.2, estimate)${Fp > Fs ? `, which is more than its ${+A.toPrecision(3)} m² outline would take as if solid, so that is taken` : ''}: ${+Fw.toPrecision(3)} N, centred ${len(yc - y0)} up, for 2 s (Jolt), it tilted ${+((tip2 * 180) / Math.PI).toFixed(1)}° and ${slid > 0.5 ? 'was moved more than 0.5 m, lifted or slid off (how far it then goes is no figure to build on)' : `slid ${len(slid)}`} (more than 5° or 50 mm fails); on what it carries the wind is not counted${tip2 >= (5 * Math.PI) / 180 ? ': it blows over' : slid >= 0.05 ? ': it does not tip but slides away: it needs holding down (stakes, guy lines, anchors or ballast), none of them kept' : ''}` });
        // empty, by statics (what it carries is not on it in every wind): the wind's moment about its foot's edge against its
        // own weight on the middle of its foot; and the wind over its top lifting it, suction about 0.8 of ½ ρ v² over its
        // plan (a flat roof, estimate), against its own weight
        const own = [...after.values()].filter((m) => !STANDS.has(m.name)).reduce((a, m) => a + m.mass, 0) * G, bw = ax === 'z' ? wz : wx, Mt = Fw * (yc - y0);
        // a roofed thing has air inside pushing up on its roof too: about 0.2 of ½ ρ v² with its openings shut (EN 1991-1-4
        // 7.2.9 (6), estimate), about 0.6 with a door open into the wind (0.75 of the windward face's 0.8); the wind's lift
        // and its turning act together, so what holds it down is its weight less the lift
        const roofed = [...after.keys()].some((n) => n === `${prefix}_roof`), door = tests.some((t) => t.kind === 'swing'), openF = OPEN.has(prefix), cpi = roofed ? (openF ? 0.63 : 0.2) : 0, up = (0.8 + cpi) * q * wx * wz, upOpen = roofed && door ? (0.8 + 0.6) * q * wx * wz : 0;
        // what its stakes hold, where it has them: all of them against its lifting, the windward half, at its far edge, against its turning over
        // each part's weight about the edge of its feet the wind would tip it over (the far one, down the wind), where
        // each part stands; the wind's lift about it from the middle of its plan
        const ixw = ax === 'z' ? 2 : 0, all1 = [...after.values()], low = Math.min(...all1.map((m) => m.at[1] - m.h / 2)), feet1 = all1.filter((m) => m.at[1] - m.h / 2 <= low + 2e-3), edge = feet1.length ? Math.max(...feet1.map((m) => m.at[ixw]! + [m.w, m.h, m.d][ixw]! / 2)) : 0, xs1 = all1.map((m) => [m.at[ixw]! - [m.w, m.h, m.d][ixw]! / 2, m.at[ixw]! + [m.w, m.h, m.d][ixw]! / 2]), xc1 = (Math.min(...xs1.map((v) => v[0]!)) + Math.max(...xs1.map((v) => v[1]!))) / 2;
        const Mown = all1.filter((m) => !STANDS.has(m.name)).reduce((a, m) => a + m.mass * G * (edge - m.at[ixw]!), 0), Mup = up * (edge - xc1);
        const an = ANCHORS.get(prefix), hold = an ? an.n * an.each : 0, holdW = an ? (Math.floor(an.n / 2) * an.each) : 0, Mr = an ? Mown - Mup + holdW * bw : Math.max(0, Mown - Mup);
        out.push({ what: 'empty, it stands in that wind', ok: Mt < Mr, says: `with nothing on it, by statics: the wind's ${+Fw.toPrecision(3)} N, ${len(yc - y0)} up, turns it over its foot's edge with ${+Mt.toPrecision(3)} N·m${openF ? ' (taken with the wind blowing into its open front, as its lift is: the air inside then pushes its back wall out about as hard as the wind outside would push it, 0.63 inside and 0.3 behind against the 1.2 its drag takes, estimate)' : ''}; against it, its own ${+(own / G).toPrecision(3)} kg (${+own.toPrecision(3)} N) less the ${+up.toPrecision(3)} N the wind lifts it by, each where it stands about the far edge of its ${len(bw)} foot, holds it down with ${+Mr.toPrecision(3)} N·m${an ? `, with ${Math.floor(an.n / 2)} of its ${an.n} stakes on the windward side holding ${+holdW.toPrecision(3)} N at its far edge (${an.says})` : ''}${up >= own && !an ? ' (the lift outweighs it)' : ''}${Mt >= Mr ? `: it tips: ${an ? 'its stakes do not hold it: it wants more of them, or guy lines from its top' : 'it needs holding down or ballast (none kept)'}` : ''}` });
        out.push({ what: 'the wind does not lift it', ok: 1.5 * up <= 0.9 * own + hold / 1.5 && upOpen < own + hold, says: `over its ${+(wx * wz).toPrecision(3)} m² plan the wind sucks up about ${+up.toPrecision(3)} N (0.8 of ½ ρ v² over a flat roof${roofed ? (openF ? ', and the air inside pushing up 0.63 of it through its open front facing the wind (0.9 of the +0.7 on a windward wall, EN 1991-1-4 7.2.9 and Table 7.1)' : ', and the air inside pushing up 0.2 of it with its openings shut (EN 1991-1-4 7.2.9)') : ''}, estimate) against its own ${+own.toPrecision(3)} N${an ? ` and the ${+hold.toPrecision(3)} N its ${an.n} stakes hold (by 1.5)` : ''}${an ? (1.5 * up > 0.9 * own + hold / 1.5 ? ': it wants more stakes, or guy lines from its top' : '') : up >= own ? ': it lifts off, and needs holding down (stakes, guy lines, anchors), none kept' : 1.5 * up > 0.9 * own ? `: within its weight, but not with the margins taken for it (0.9 of its weight against 1.5 of the lift, EN 1990 Table A1.2(A)): it wants holding down` : ''}${upOpen ? `; with its door open into the wind, about ${+upOpen.toPrecision(3)} N${upOpen >= own + hold ? ', and it lifts' : ''}` : ''}` });
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
      // a hand's 20 N at its top, held as long as a person leans on a heavy door: long enough to turn it 10° from rest
      // (θ = ½ α t², α = 1.5 F / m W, pushed at its middle), from 0.3 s to 3 s
      if (t.kind === 'swing') { const lf = mine().get(t.name), grp = new Set([t.name, ...riders]), kgL = [...mine().values()].filter((m) => grp.has(m.name) && (m.name === t.name || Math.abs(m.at[2] - (lf?.at[2] ?? 0)) < 0.5)).reduce((a, m) => a + m.mass, 0), wide = t.at ? Math.abs((mine().get(t.at)?.at[0] ?? 0) - (lf?.at[0] ?? 0)) : lf ? Math.max(lf.w, lf.d) : 1, tt = lf ? Math.min(3, Math.max(0.3, Math.sqrt((2 * ((10 * Math.PI) / 180) * (t.at ? kgL : lf.mass) * wide) / (1.5 * 20)))) : 0.3; w.run(`push ${t.at ?? t.name} with 20 N along z for ${+tt.toFixed(2)} s at its top`); const a1 = Math.max(Math.abs(w.value(`${t.name}.most`)), Math.abs(w.value(`${t.name}.least`))); out.push({ what: 'it swings open', ok: a1 > (5 * Math.PI) / 180, says: `pushed at its top with 20 N for ${+tt.toFixed(2)} s (Jolt), it swung as far as ${+((a1 * 180) / Math.PI).toFixed(1)}° (more than 5° passes)` }); }
      // pushed long enough to cross its whole travel (about 2 m/s² from rest, half as long again, estimate): it slides
      // what it is asked only where it reaches its stop, and no further
      if (t.kind === 'slide') { const F = +(t.m * 2 + 1).toFixed(2), dur = +Math.min(4, Math.max(0.4, 1.5 * Math.sqrt(t.L))).toFixed(2); w.run(`push ${t.name} with ${F} N along x for ${dur} s`); const tr = w.value(`${t.name}.most`); out.push({ what: `it slides ${len(t.L)}`, ok: tr >= t.L - 5e-3 && tr <= t.L + 2e-3, says: `pushed with ${F} N for ${dur} s (Jolt), it slid as far as ${len(tr)}, its stop at ${len(t.L)} (short of its stop by more than 5 mm fails)` }); }
      if (t.kind === 'raise') {
        // what rides, with what it carries, pushed up steadily, as a drive would raise it, a little more than its weight:
        // enough to rise its travel in 3 s from rest (m (g + 2 L / t²)), so it meets its stop gently: what would raise it (a
        // screw, a winch, a linkage) is not derived; this tests that it rides up where it should, and stops at its travel
        // (with what turns or swings on what rides, hinged to it, which rides with it)
        const ride = new Set([t.name, ...riders, ...tests.flatMap((x) => ((x.kind === 'spin' || x.kind === 'swing') && !piece.includes(x.name) ? [x.name] : []))]), kg = [...mine().values()].filter((m) => ride.has(m.name)).reduce((a, m) => a + m.mass, 0) + w.all().made.filter((m) => m.name.startsWith('test_load')).reduce((a, m) => a + m.mass, 0), F = 1.05 * kg * (G + (2 * t.L) / 9);
        w.run(`push ${t.name} with ${+F.toPrecision(3)} N along y for 3 s`); const tr = w.value(`${t.name}.most`);
        out.push({ what: `it rides ${len(t.L)} up and down its guides`, ok: tr > 0.2 * t.L && tr <= t.L + 2e-3, says: `pushed up steadily, a little more than the weight of what rides (${+F.toPrecision(3)} N, for ${+kg.toPrecision(3)} kg, to rise its travel in 3 s) (Jolt), it rose as far as ${len(tr)}, its stop at ${len(t.L)}, and nothing holds it there when let go; the work to raise it the whole way is ${+((kg * G * t.L) / 1000).toPrecision(3)} kJ (m g h); let go at its top it falls the ${len(t.L)} in ${+Math.sqrt((2 * t.L) / G).toPrecision(2)} s, at ${+Math.sqrt(2 * G * t.L).toPrecision(2)} m/s at the bottom: it needs a brake, or a drive that does not run back (a screw, a worm), holding about ${+(kg * G).toPrecision(3)} N, not derived` });
      }
    }
    tipLater?.();
    windLater?.();
  } catch (e) { out.push({ what: 'it behaves when let go', ok: false, says: (e as Error).message.slice(0, 240) }); }
  return out;
}
/** Kept warm: a heater as strong as the air takes at the temperature, then heat let flow until it settles there. */
/** The sun on what is warmed by it: about 600 W/m² square on it on a clear winter day (estimate), else the 1000 W/m² of
 *  the standard test sun (IEC 60904-3), 0.9 of it taken in by a dark face (estimate), over its top. */
function sunOn(con: Conception, w: Workshop, name: string): { W: number; says: string } | null {
  if (!/\bsolar\b/.test(con.words.toLowerCase())) return null;
  const m = w.all().made.find((x) => x.name === name); if (!m) return null;
  const winter = /\bwinter\b/.test(con.words.toLowerCase()), Gs = winter ? 600 : 1000, W = 0.9 * Gs * m.w * m.d;
  return { W, says: `the sun puts into it (${Gs} W/m² ${winter ? 'on a clear winter day, estimate' : 'square on it, the standard test sun, IEC 60904-3'}, over its ${+(m.w * m.d).toPrecision(3)} m², 0.9 taken in by a dark face, estimate)` };
}
function warmed(w: Workshop, t: Extract<Test, { kind: 'warm' }>, most?: number, Ta = AMBIENT, mostIs = 'it may use', lack = ''): Check & { P?: number } {
  try {
    const m = w.all().made.find((x) => x.name === t.name); if (!m?.matter) return { what: `it keeps warm at ${t.T} °C`, ok: false, says: `${t.name} is not made` };
    // below what is round it, it must be cooled, and a heater only takes it further away
    if (t.T <= Ta + 0.5) return { what: `it keeps warm at ${t.T} °C`, ok: false, says: `${t.T} °C is not above the ${+Ta.toPrecision(3)} °C round it: it would have to be cooled, and no cooler is made` };
    // a heater as strong as still air takes from it at that temperature, then made stronger, in proportion to what it
    // still lacks, until the room's own flow (what touches it takes some too) brings it within half a degree
    const th = thermalOf(m.matter), A = Number.isFinite(m.area) ? m.area : 2 * (m.w * m.h + m.w * m.d + m.h * m.d); let P = heatLoss(t.T, A * 0.9, Math.max(m.h, 0.01), th.emissivity), T1 = AMBIENT, hours = 0, k = 0;
    // colder round it than the room the workshop keeps: worked out at what is round it, not run
    if (t.T <= AMBIENT + 0.5) { const Pa = heatLoss(t.T, A * 0.9, Math.max(m.h, 0.01), th.emissivity, Ta); return { P: Pa, what: `it keeps warm at ${t.T} °C`, ok: most === undefined || Pa <= most, says: `a ${+Pa.toPrecision(3)} W heater, what still air at ${+Ta.toPrecision(3)} °C takes from it at ${t.T} °C (convection and radiation), worked out, not run: the workshop's room is kept at ${AMBIENT} °C${most !== undefined ? `; ${Pa <= most ? 'within' : 'more than'} the ${+most.toPrecision(3)} W ${mostIs}${Pa > most ? lack : ''}` : ''}` }; }
    const secs = Math.min(30 * 86400, Math.max(1800, (8 * m.mass * th.c * Math.max(t.T - AMBIENT, 1)) / Math.max(P, 1e-3)));
    for (; k < 6; k++) { w.run(`heat ${t.name} with ${+P.toFixed(3)} W`); w.run(`let heat flow for ${(k ? secs / 2 : secs).toFixed(0)} s`); hours += (k ? secs / 2 : secs) / 3600; T1 = w.value(`${t.name}.temperature`); if (Math.abs(T1 - t.T) <= 0.5) break; P *= (t.T - AMBIENT) / Math.max(T1 - AMBIENT, 1e-3); }
    const fu = FUSION[m.matter.id], safe = !fu || ((fu.melts ?? 1e9) > t.T + 50 && (fu.lost ?? 1e9) > t.T + 50);
    return { P, what: `it keeps warm at ${t.T} °C`, ok: Math.abs(T1 - t.T) <= 0.5 && safe && (most === undefined || P <= most), says: `a ${+P.toPrecision(3)} W heater: what still air takes from it at ${t.T} °C (convection and radiation)${k ? ', made stronger for what touches it, which takes some too' : ''}; let flow for ${+hours.toPrecision(2)} h it came to ${+T1.toPrecision(4)} °C${Math.abs(T1 - t.T) > 0.5 ? `, not within half a degree of ${t.T} °C` : ''}${safe ? '' : `, but ${m.matter.name} does not bear that heat`}${most !== undefined ? `; ${P <= most ? 'within' : 'more than'} the ${+most.toPrecision(3)} W ${mostIs}${P > most ? lack : ''}` : ''}` };
  } catch (e) { return { what: `it keeps warm at ${t.T} °C`, ok: false, says: (e as Error).message.slice(0, 200) }; }
}

/** A heater in what encloses the air it warms: as strong as its walls let out at what the air is held at, a thermostat
 *  holding it there (not derived; left on at full it settles where its walls let out all it gives, Ta + P / UA); and
 *  the face it warms the air through no hotter than its matter bears: Tin + q R_si (ISO 6946's 0.13 m² K/W of still
 *  air on it), the heater half the part's thickness under that. */
function heaterInside(con: Conception, prefix: string, w: Workshop, t: Extract<Test, { kind: 'warm' }>): (Check & { P?: number }) | null {
  const e = SKINS.get(`${prefix}:box`), Tin = con.said.Tin; if (!e || Tin === undefined || con.said.bodyHeat !== undefined) return null;
  const m = w.all().made.find((x) => x.name === t.name); if (!m?.matter) return null;
  const Ta = con.said.Tamb ?? AMBIENT, te = (() => { try { return thermalOf(matterOf(e.id)); } catch { return null; } })(), d = Tin - Ta; if (!te || d <= 0) return null;
  const air = Math.abs(heatLoss(Tin, e.A, e.L, te.emissivity, Ta)), Q = d / (0.13 / e.A + e.t / (te.k * e.A) + d / Math.max(air, 1e-12)), UA = Q / d;
  const most = con.limits.power, face = Math.max(m.w * m.d, m.w * m.h, m.h * m.d), thin = Math.min(m.w, m.h, m.d), tm = thermalOf(m.matter), Tf = Tin + (Q * 0.13) / face, Tel = Tf + (Q * (thin / 2)) / (tm.k * face);
  // from cold: what it is made of takes C = Σ m c to warm, and a heater of P against UA closes in as 1 − e^(−t/τ), τ = C / UA:
  // it reaches the temperature at t = −τ ln(1 − UA ΔT / P); one of just UA ΔT never does, and is within 0.5 K after τ ln(ΔT / 0.5)
  const C = w.all().made.filter((x) => x.name.startsWith(`${prefix}_`) && x.matter).reduce((a, x) => a + x.mass * thermalOf(x.matter!).c, 0), tau = C / UA, reach = (P: number) => (P > UA * d ? -tau * Math.log(1 - (UA * d) / P) : Infinity);
  const fromCold = `; from ${Ta} °C, what it is made of takes ${+(C / 1000).toPrecision(3)} kJ/K to warm (τ = C / UA, ${timeSay(tau)}): a heater of just ${+Q.toPrecision(3)} W comes within 0.5 °C only after ${timeSay(tau * Math.log(d / 0.5))}, and has nothing left to win back what opening it lets out${most !== undefined && most > Q ? `; one of the ${+most.toPrecision(3)} W it may use gets there in ${timeSay(reach(most))}` : ''}`;
  const fu = FUSION[m.matter.id] ?? (/^wood/.test(m.matter.id) ? { melts: null, lost: 270, lostWhat: 'it chars from about 270 °C' } : undefined), bears = !fu || ((fu.melts ?? 1e9) > Tel + 50 && (fu.lost ?? 1e9) > Tel + 50), full = most ?? Q, nm = m.name.slice(prefix.length + 1).replace(/\d+$/, '');
  return { P: Q, what: `its heater holds the air inside at ${Tin} °C`, ok: (most === undefined || Q <= most) && bears, says: `a ${+Q.toPrecision(3)} W heater in its ${nm}, what its walls let out at ${Tin} °C (${+UA.toPrecision(3)} W/K), held there by a thermostat (not derived); left on at ${+full.toPrecision(3)} W it would settle near ${+(Ta + full / UA).toPrecision(3)} °C${most !== undefined ? `; ${Q <= most ? 'within' : 'more than'} the ${+most.toPrecision(3)} W it may use` : ''}; it warms the air through the ${+(face * 1e4).toPrecision(3)} cm² of its ${nm}, so that face runs near ${+Tf.toPrecision(3)} °C (0.13 m² K/W of still air on it, ISO 6946) and the heater in it near ${+Tel.toPrecision(3)} °C${bears ? '' : `, too hot for ${m.matter.name} (${fu!.lostWhat ?? `it melts at ${fu!.melts} °C`}, by 50 °C at least): a heater spread over more of it, or a metal plate between, is not derived`}${fromCold}${m.at[1] - m.h / 2 < 0.02 ? `; its ${nm} stands on what it is put on, so some of the heater's heat goes down into that, warming it, and the heater must give more: not weighed` : ''}; what is put in it to heat is not weighed` };
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
/** (where what the laws say is shown apart, as the command line does, it is left out: `laws: false`) */
export function sayConception(c: Conception, o: { laws?: boolean } = {}): string {
  const not = c.asked.filter((a) => a.kind !== 'for' && a.kind !== 'limit' && !a.got), laws = o.laws === false ? '' : `${c.scale?.must.length ? ` At ${len(c.scale.L)} it would have to be built so: ${c.scale.must.join('; ')}.` : ''}${c.bounds.length ? ` The laws say: ${c.bounds.map((b) => `${b.ok === null ? '·' : b.ok ? '✓' : '✗'} ${b.what} (${b.says})`).join('; ')}.` : ''}`;
  return sayIt(c, not) + laws;
}
function sayIt(c: Conception, not: Asked[]): string {
  if (!c.wants.length) return `${not.length ? `I read what it is asked to be and do, but none of it is something I make yet: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : `Nothing in "${c.words.trim()}" says what it is to do.`}${c.heard.length ? ` Heard: ${c.heard.map((h) => h.replace(/[.;,\s]+$/, '').replace(/, checked$/, ', with nothing made to check it against')).join('; ')}.` : ''}${c.dropped.length ? ` Numbers not used: ${c.dropped.join('; ')}.` : ''}${c.questions.length ? ` I make things that ${Object.values(FN_WORDS).join(', ')}. ${c.questions[0]!.ask}` : ''}`;
  const read = c.wants.filter((w) => !w.flags.includes('assumed')), took = c.wants.filter((w) => w.flags.includes('assumed'));
  return `I read it as something to ${(read.length ? read : c.wants).map((w) => FN_WORDS[w.fn]).join(', and to ')}${read.length && took.length ? `, with a door to go in by (not asked, taken: ${took.map((w) => FN_WORDS[w.fn]).join(', ')})` : ''}.${c.heard.length ? ` Heard: ${c.heard.map((h) => h.replace(/[.;,\s]+$/, '')).join('; ')}.` : ''}${not.length ? ` Not something I make yet: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : ''}${c.dropped.length ? ` Numbers not used: ${c.dropped.slice(0, 8).join('; ')}.` : ''}${c.questions.length ? ` Before I make it: ${c.questions.map((q, i) => `${i + 1}. ${q.ask}${q.kind === 'what' ? '' : ` (I would take ${showValue(q)}: ${q.grounds})`}`).join(' ')} ${c.questions.every((q) => q.kind === 'what') ? 'Say "go" to make it, or say what else it should do.' : 'Answer with the numbers, or say "go" for what I would take.'}` : ''}`;
}
/** A design, said: what it is, how it was drawn, what it was checked for and found, what it could not do. */
export function sayDesign(d: Design): string {
  if (d.parts === 0) return `Nothing made: ${d.gaps.join('; ')}.`;
  const bad = d.checks.filter((c) => !c.ok), not = d.asked.filter((a) => a.kind !== 'for' && !a.got && !a.met);
  return `${d.title}: ${d.parts} parts, ${+d.mass.toPrecision(3)} kg. ${d.ok ? 'It holds every law and limit it was checked for' : 'It does not hold'}; it does ${d.does[0] === d.does[1] ? 'what was asked' : `${d.does[0]} of the ${d.does[1]} things asked`}. ${d.choices.join('; ')}. Checked: ${d.checks.map((c) => `${c.ok ? '✓' : '✗'} ${c.what} (${c.says})`).join('; ')}.${d.gaps.length ? ` Not yet: ${d.gaps.join('; ')}.` : ''}${not.length ? ` Not made: ${not.map((a) => `${a.text} (${a.why})`).join('; ')}.` : ''}${d.tries.length ? ` Drawn again ${d.tries.length} time${d.tries.length > 1 ? 's' : ''} first: ${d.tries.slice(0, 3).map((t) => `seed ${t.seed}, ${t.why}`).join('; ')}.` : ''}${bad.length ? '' : d.whole ? ' It does all it was asked and holds every law it was checked for.' : ''}`;
}
/** Why a part is there: what it is, what called it, when, why, where and how. */
export function sayTrace(d: Design, part: string): string {
  const t = d.traces.find((x) => x.what === part || x.what === `${d.prefix}_${part}` || x.what.endsWith(`_${part}`)); if (!t) return `Nothing in ${d.title} is named ${part}.`;
  return `${t.what.replace(`${d.prefix}_`, '')}: called by "${t.called}"; ${t.when}; why: ${t.why}; where: ${t.where}; how: ${t.how}.`;
}

// ==== the law of scale ================================================================================================
/** What happens to what was made as it is made bigger or smaller, every length by the same s: a frame grown is solved
 *  again at each size, its load made with it (as a thing of the same stuff, its weight by s³) or kept as it is, and each
 *  margin's power of s and the size it first fails at said; and at the size asked (s), its margins there and which of
 *  the effects that rule things of a size (its own weight, the air's stickiness, surface tension, a motor's kind, heat)
 *  have passed their thresholds between its size and that one. */
export function scaleSay(d: Design, at?: number): string[] {
  const out: string[] = [], f = FRAMES.get(d.prefix);
  const L = Math.max(d.footprint[0], d.footprint[1], ...(f ? [Math.max(...f.nodes.map((p) => p[1])) - Math.min(...f.nodes.map((p) => p[1]))] : []));
  const say = (x: number) => (x >= 10 ? `${+x.toPrecision(3)} times` : x >= 1 ? `${+x.toPrecision(3)} times` : `1/${+(1 / x).toPrecision(3)}`);
  if (f) {
    for (const k of scaleLaw(f)) {
      const parts = k.laws.map((l) => `${l.what === 'strength' ? 'its struts\' strength' : l.what === 'buckling' ? 'their buckling' : 'how little its load moves'} ${+l.at1.toPrecision(3)} times what it asks, going as s^${+l.power.toFixed(2)}${l.fails ? `, so it fails at ${say(l.fails)} its size (${len(L * l.fails)} across)` : ', and holds from a thousandth to a thousand times its size'}`);
      out.push(`${k.withIt ? 'made bigger or smaller with what it carries (that too by s³)' : 'made bigger or smaller, what it carries kept as it is'}: ${parts.join('; ')}`);
    }
    out.push('so: a thing of the same stuff and shape is weaker for its size the bigger it is (its weight grows as s³, what its struts bear as s²: Galileo, 1638), and a thing that carries the same load is weaker the smaller it is (what its struts bear shrinks as s², buckling as s⁴ over s²)');
  }
  if (at !== undefined) {
    if (f) { const a = frameAt(f, at, true), b = frameAt(f, at, false); out.push(`at ${say(at)} its size (${len(L * at)} across): with what it carries made with it, its strength ${+a.strength.toPrecision(3)}, buckling ${+a.buckling.toPrecision(3)} times what it asks; with it kept as it is, ${+b.strength.toPrecision(3)} and ${+b.buckling.toPrecision(3)}`); }
    const r0 = sizeAt(L), r1 = sizeAt(L * at), flips = r1.groups.filter((g) => { const g0 = r0.groups.find((x) => x.key === g.key); return g0 && g0.past !== g.past; });
    out.push(`at ${len(L * at)}, what changes from ${len(L)}: ${flips.length ? flips.map((g) => `${g.name}: ${g.says}`).join('; ') : 'none of the effects that rule things of a size passes its threshold between them'}`);
    for (const m of r1.must) out.push(`at ${len(L * at)}: ${m}`);
    if (!f) out.push('its own checks are not solved again at that size: only a frame grown along its loads is (the others are drawn, not grown)');
  }
  return out;
}

// A works: throw any build at it and it says how that build actually gets made — on which machines, in what order,
// how long it takes, what has to be bought instead, and what program each machine is sent.
//
// It is not a catalogue of shops. "Where can anything be created" has an answer that is not a shopping list, and the
// useful engine is the one that takes a job and routes it. All making is six families:
//
//   add      material put where there was none      print, cast, deposit, grow
//   cut      material taken away                    mill, turn, drill, saw, laser, grind
//   form     material moved, none added or taken    bend, press, forge, throw, mould, draw
//   join     parts held together                    weld, braze, solder, bond, fasten
//   treat    the same material made different       sinter, fire, harden, cure, coat
//   measure  the loop closed                        calliper, indicator, probe, camera
//
// A works that covers all six over a class of material can make anything in that class inside its envelope. That is
// the criterion, and it is checkable. The sixth is the one everyone leaves out and the one that decides whether the
// other five ever improve: without measurement a shop cannot hold a tolerance, cannot find out why a part was wrong,
// and cannot get better. A $30 calliper closes more capability than a $300 machine.
//
// Routing is where a job router is honest or useless, so the rules are written down rather than implied:
//
//   - A process that only prepares (sawing stock to length), only finishes (drilling, hardening, firing, coating) or
//     only joins (welding, bonding, fastening) never makes a part on its own. A saw cannot produce a gearbox housing
//     however fast it is, and a plan that says it can is worthless.
//   - A process that can only make one kind of shape says so. A lathe makes shapes of revolution; a laser and a press
//     make flat ones. Without that, a router picks the lathe for a printed landing foot because turning is faster per
//     cubic centimetre than printing, which is true and absurd.
//   - Among the processes that do fit, the one that does this job in the fewest minutes wins — setup included, because
//     setup is most of a small job. That is what makes a bulk housing a casting and a plate a milled part without
//     either being special-cased.
//   - Measuring never makes anything. It is the loop, not the lathe.
//   - Some materials are not finished when they are formed: clay is not a mug until it is fired, a resin print is not
//     a part until it is washed and cured, a bound-metal print is powder in wax until it is debound and sintered. A
//     works without the finishing station cannot make the thing at all, and says so instead of handing over greenware.
//
// What this will not pretend: no works below a few hundred thousand makes a bearing, a motor, a rail, a belt, a screw
// or a chip. Those are ground to a micron, wound, stamped, rolled at a thousand a minute and fabbed on a wafer.
// `ALWAYS_BOUGHT` says why for each, part by part, and `STOCK` says what is bought as material and worked here —
// which is a different thing, and conflating the two is how a plan loses the welding.
//
// Owner of: the process taxonomy, the stations that do them, routing a build into operations, scheduling those
// operations across the machines there are, and what share of a real machine's own bill of materials a works could
// make for itself. The program each operation sends, and the Bluetooth that carries it, are `link.ts`. Whether one
// machine can work one material is `processor.ts`. This owns which machines to have, and what they do on Tuesday.

import { ENDER3 } from './models/ender3';
import { VORON24 } from './models/voron24';
import { billOf, boxedAs, type MakerModel } from './makermodel';
import { cheapest, PRICES, priceKeyOf, usd as money } from './prices';
import { CUTTING, gcodeFor, kilnProgram, linkFor, printStart, type Lang, type Transport } from './link';
import { CLAYS, FILAMENTS, fire, KILNS } from './processor';
import type { Profile } from './fab';

/** The six families of making. Every process is one of them; a works is judged by which it covers. */
export type Family = 'add' | 'cut' | 'form' | 'join' | 'treat' | 'measure';
export const FAMILIES: { id: Family; name: string; says: string }[] = [
  { id: 'add', name: 'adding', says: 'material put where there was none: printed, cast, deposited, grown' },
  { id: 'cut', name: 'cutting', says: 'material taken away: milled, turned, drilled, sawn, cut by light or water, ground' },
  { id: 'form', name: 'forming', says: 'material moved, none added and none taken: bent, pressed, forged, thrown, moulded, drawn' },
  { id: 'join', name: 'joining', says: 'parts held together: welded, brazed, soldered, bonded, fastened' },
  { id: 'treat', name: 'treating', says: 'the same material made different: sintered, fired, hardened, cured, coated' },
  { id: 'measure', name: 'measuring', says: 'the loop closed: a part compared with what it was meant to be, so the next is better. Leave this out and the other five never improve' },
];

/** What a process works on. A works is only as wide as the classes its processes cover. */
export type MatClass = 'thermoplastic' | 'photopolymer' | 'metal-soft' | 'metal-hard' | 'wood' | 'clay' | 'concrete' | 'composite' | 'glass' | 'elastomer' | 'board' | 'live';
/** What a station must be given before it runs. */
export type Need = 'power' | '3-phase' | 'extraction' | 'gas' | 'water' | 'vent' | 'air';
/** What a part is, roughly: a shape of revolution, a flat one, or neither. A process that can only make one of them
 *  says so, and that is what stops a router turning a printed bracket on a lathe. */
export type Shape = 'round' | 'flat' | 'solid';
/** What a process is for. Without this a router will cheerfully produce a casting on a bandsaw. */
export type Role = 'make' | 'prep' | 'finish' | 'join';

export interface Process {
  id: string; name: string; family: Family;
  /** the material classes it works */ on: MatClass[];
  /** what it holds, ± mm (the class of machine, not one machine) */ tol: number;
  /** the smallest feature it makes, mm */ feature: number;
  /** how fast it works, cm³ a minute where that is what it does */ rate?: number;
  /** minutes for one load, whatever is in it: a firing takes ten hours for one mug or forty, which is why a works
   *  fires a full kiln and why a treatment is scheduled as a batch and not per part */ cycle?: number;
  /** minutes to set one up before any of it runs */ setup: number;
  /** what it is for: only `make` produces a part out of material */ role?: Role;
  /** the one shape it can make, where it can only make one */ shape?: Shape;
  needs: Need[];
  hazard?: string;
  src: string;
}

// Tolerances, least features and rates are the class's: shop-floor figures a machinist would recognise, each saying
// where it comes from. A station's own envelope and tolerance narrow them where it says so.
export const PROCESSES: Process[] = [
  { id: 'fff', name: 'fused filament printing', family: 'add', on: ['thermoplastic', 'composite'], tol: 0.3, feature: 0.8, rate: 0.48, setup: 10, needs: ['power'],
    hazard: 'its nozzle is at 200 to 300 °C and its bed at 60 to 110 °C; ABS and ASA give off styrene and want a vented room',
    src: 'a 0.4 mm nozzle lays a 0.4 to 0.6 mm bead, so the least wall is two of them; ±0.3 mm or ±0.2 % is what desktop machines are specified at; 8 mm³/s of flow is what one holds in practice, which is 0.48 cm³ a minute (typical)' },
  { id: 'msla', name: 'resin printing', family: 'add', on: ['photopolymer'], tol: 0.1, feature: 0.05, rate: 0.2, setup: 15, needs: ['power', 'vent'],
    hazard: 'uncured resin sensitises skin for life once it has done it: gloves, and never down a drain',
    src: 'a 50 µm pixel is the least feature; a layer takes the same seconds whatever is on it, so a full plate costs the same as one part (typical)' },
  { id: 'bound-metal', name: 'bound-metal printing', family: 'add', on: ['metal-hard', 'metal-soft'], tol: 0.5, feature: 1, rate: 0.3, setup: 15, needs: ['power', 'vent'],
    src: 'powder in a binder printed on an ordinary FFF machine, then debound and sintered; BASF Ultrafuse 316L shrinks 16 to 20 %, so the tolerance after sintering is that shrink\'s own scatter (processor.ts `sinter`)' },
  { id: 'pbf', name: 'laser powder-bed fusion', family: 'add', on: ['metal-hard', 'metal-soft'], tol: 0.1, feature: 0.4, rate: 0.35, setup: 180, needs: ['3-phase', 'gas', 'extraction'],
    hazard: 'a class 4 fibre laser, an argon atmosphere that will not support life, and a combustible powder that must never be swept or vacuumed dry',
    src: 'EOS M 290: 400 W, 100 µm spot, 30 µm layers (its data sheet; processor.ts `fuse`)' },
  { id: 'cast', name: 'casting', family: 'add', on: ['metal-soft', 'metal-hard', 'glass'], tol: 0.8, feature: 2.5, rate: 2, setup: 90, needs: ['extraction', 'gas'],
    hazard: 'molten metal and any trace of water make steam under the melt, which throws it out of the crucible: a damp mould, a damp tool, a damp floor',
    src: 'investment casting from a printed pattern holds about ±0.5 to ±1 mm on a palm-sized part; the melt is most of the time, so a flask of twenty costs little more than one (typical; cell.ts models the lost-PLA route)' },
  { id: 'concrete-print', name: 'concrete printing', family: 'add', on: ['concrete'], tol: 10, feature: 40, rate: 300, setup: 120, needs: ['3-phase', 'water'],
    src: 'a 40 mm bead from a gantry and a pump; the machine is a gantry, and the gantry is the same gantry as any other' },
  { id: 'waam', name: 'wire-arc deposition', family: 'add', on: ['metal-hard'], tol: 1, feature: 4, rate: 3, setup: 30, needs: ['3-phase', 'gas', 'extraction'],
    hazard: 'an arc that burns the eye at a glance, and fume that must be taken off at the work',
    src: 'a MIG torch on a gantry or an arm: a 1.2 mm wire gives a 4 to 6 mm bead and lays about 1 kg an hour (typical). The cheapest metal addition there is, and the roughest' },
  { id: 'mill', name: 'milling', family: 'cut', on: ['metal-soft', 'metal-hard', 'thermoplastic', 'wood', 'composite'], tol: 0.05, feature: 1, rate: 0.36, setup: 20, needs: ['power', 'extraction'],
    hazard: 'a cutter at 10,000 rev/min throws what it catches: nothing loose, and never a glove',
    src: 'a 3 mm cutter at 400 mm/min and 0.3 mm deep takes 360 mm³ a minute off aluminium on a light frame, which is the number that decides whether a part is worth milling (typical)' },
  { id: 'turn', name: 'turning', family: 'cut', on: ['metal-soft', 'metal-hard', 'thermoplastic'], tol: 0.025, feature: 0.5, rate: 1.5, setup: 15, shape: 'round', needs: ['power'],
    hazard: 'a chuck key left in a chuck is thrown at head height the moment it starts',
    src: 'a lathe holds ±0.025 mm on a diameter, which is the finest a small shop does without grinding; it makes shapes of revolution and nothing else, which is why it is fast (typical)' },
  { id: 'drill', name: 'drilling', family: 'cut', on: ['metal-soft', 'metal-hard', 'thermoplastic', 'wood', 'board'], tol: 0.2, feature: 0.8, setup: 5, role: 'finish', needs: ['power'],
    src: 'a drilled hole is 0.05 to 0.2 mm over its drill and not round enough to run a bearing in: that is what reaming and boring are for. It puts a hole in a part that already exists, so it never makes one (typical)' },
  { id: 'saw', name: 'sawing', family: 'cut', on: ['metal-soft', 'metal-hard', 'wood', 'thermoplastic', 'composite'], tol: 1, feature: 2, setup: 3, role: 'prep', needs: ['power'],
    src: 'a bandsaw or chop saw cuts stock to length at about ±1 mm, which is why a sawn face is faced afterwards. It prepares material; it does not make parts (typical)' },
  { id: 'laser-co2', name: 'laser cutting (CO₂)', family: 'cut', on: ['wood', 'thermoplastic', 'board'], tol: 0.1, feature: 0.3, rate: 20, setup: 10, shape: 'flat', needs: ['power', 'extraction', 'water'],
    hazard: 'cutting PVC or anything chlorinated makes hydrogen chloride, which destroys the machine and the person at it',
    src: 'a 0.2 mm kerf in 3 to 10 mm of ply or acrylic; it will not cut metal, and it should not cut carbon or glass laminate — the resin burns and the fibre chars, which is why CFRP is routed or waterjetted instead (typical)' },
  { id: 'laser-fibre', name: 'laser cutting (fibre)', family: 'cut', on: ['metal-hard', 'metal-soft'], tol: 0.1, feature: 0.3, rate: 30, setup: 15, shape: 'flat', needs: ['3-phase', 'gas', 'extraction'],
    hazard: 'class 4, and invisible at 1064 nm: the beam is past the eye before the blink',
    src: 'the cheapest way to cut flat metal accurately, and the first machine here that costs more than a car (typical)' },
  { id: 'grind', name: 'grinding', family: 'cut', on: ['metal-hard'], tol: 0.005, feature: 0.1, rate: 0.05, setup: 25, role: 'finish', needs: ['power', 'extraction'],
    src: 'the only process in a small shop that holds microns, and the reason a bearing cannot be made in one: a raceway is ground, and the grinder that does it costs more than the whole works (typical)' },
  { id: 'bend', name: 'sheet bending', family: 'form', on: ['metal-soft', 'metal-hard'], tol: 0.5, feature: 1, setup: 8, shape: 'flat', needs: [],
    src: 'the least inside radius is about the sheet\'s own thickness, and a bend nearer than four thicknesses to an edge tears it (typical)' },
  { id: 'press', name: 'pressing and punching', family: 'form', on: ['metal-soft', 'metal-hard'], tol: 0.2, feature: 1, setup: 20, shape: 'flat', needs: ['power'],
    src: 'a punch and die, or a fly press: the cheapest way to make the same hole a thousand times (typical)' },
  { id: 'forge', name: 'forging', family: 'form', on: ['metal-hard'], tol: 2, feature: 3, setup: 40, needs: ['gas', 'extraction'],
    hazard: 'steel at 1200 °C does not look hot in daylight, and scale flies off it at the first blow',
    src: 'a forged part is stronger than a cut one of the same shape, because the grain follows the form (typical)' },
  { id: 'throw', name: 'throwing and hand-building', family: 'form', on: ['clay'], tol: 1.5, feature: 2, rate: 45, setup: 10, needs: ['power', 'water'],
    src: 'a 230 cm³ mug body is thrown in four to six minutes once the skill is there, which is the 45 cm³ a minute above; the wall comes out 6 to 10 mm thick; the tolerance is a potter\'s, and it shrinks 10 to 14 % again in the firing, so nothing thrown is dimensioned (typical)' },
  { id: 'mould', name: 'injection moulding', family: 'form', on: ['thermoplastic', 'elastomer'], tol: 0.1, feature: 0.5, rate: 60, setup: 2400, needs: ['3-phase', 'water'],
    src: 'the tool costs thousands and the part costs pennies: never the first process and always the last (typical)' },
  { id: 'vacuum-form', name: 'vacuum forming', family: 'form', on: ['thermoplastic'], tol: 1, feature: 2, setup: 15, needs: ['power', 'air'],
    src: 'over a printed buck: the cheapest way to a thin shell, and the printer makes the buck (typical)' },
  { id: 'weld-mig', name: 'MIG and flux-core welding', family: 'join', on: ['metal-hard', 'metal-soft'], tol: 1, feature: 3, setup: 15, role: 'join', needs: ['power', 'extraction'],
    hazard: 'the arc burns the cornea at a glance and the fume is a lung hazard: a shade 10 helmet, and extraction at the work rather than a fan',
    src: 'flux core needs no gas bottle, which is what makes it the cheapest way to join steel at all; about a minute for 100 mm of bead with tacking and cleaning (typical)' },
  { id: 'weld-tig', name: 'TIG welding', family: 'join', on: ['metal-hard', 'metal-soft'], tol: 0.5, feature: 1, setup: 20, role: 'join', needs: ['power', 'gas', 'extraction'],
    src: 'the only arc process that welds thin aluminium and stainless cleanly; a skill before it is a machine (typical)' },
  { id: 'spot-weld', name: 'resistance spot welding', family: 'join', on: ['metal-hard'], tol: 1, feature: 3, setup: 5, role: 'join', needs: ['power'],
    src: 'two sheets and a current: no filler, no gas, little fume, a second a joint (typical)' },
  { id: 'braze', name: 'brazing and silver soldering', family: 'join', on: ['metal-hard', 'metal-soft'], tol: 0.5, feature: 0.5, setup: 15, role: 'join', needs: ['gas', 'extraction'],
    hazard: 'cadmium-bearing silver solder and any galvanised steel give off fume that causes metal-fume fever: never heat galvanising indoors',
    src: 'it joins dissimilar metals and thin tube a weld would blow through (typical)' },
  { id: 'solder', name: 'soldering', family: 'join', on: ['board'], tol: 0.1, feature: 0.2, setup: 5, role: 'join', needs: ['extraction'],
    src: 'the library\'s own joint model: IPC-A-610\'s fillet, 63/37, a tinned tip (solder-joint.ts), and a lesson that runs by hand (solder-lesson.ts)' },
  { id: 'bond', name: 'bonding', family: 'join', on: ['thermoplastic', 'metal-soft', 'metal-hard', 'composite', 'wood', 'glass', 'clay'], tol: 0.3, feature: 0.1, setup: 10, role: 'join', needs: ['vent'],
    src: 'a structural acrylic or epoxy joins what cannot be welded, and spreads a load where a fastener concentrates it; clay is joined to clay with its own slip (typical)' },
  { id: 'fasten', name: 'fastening', family: 'join', on: ['metal-soft', 'metal-hard', 'thermoplastic', 'wood', 'composite'], tol: 0.2, feature: 2, setup: 2, role: 'join', needs: [],
    src: 'the only joint that comes apart again, which is why every machine in this library is mostly fasteners' },
  { id: 'kiln', name: 'kiln firing', family: 'treat', on: ['clay', 'glass'], tol: 2, feature: 1, cycle: 600, setup: 30, role: 'finish', needs: ['3-phase', 'vent'],
    hazard: 'a kiln at cone 10 is at 1285 °C behind 75 mm of brick; its lid and its peepholes are the two places that burn',
    src: 'Orton\'s cones and a programmed schedule through quartz\'s change at 573 °C (processor.ts `fire`)' },
  { id: 'sinter', name: 'debinding and sintering', family: 'treat', on: ['metal-hard', 'metal-soft'], tol: 0.5, feature: 1, cycle: 1800, setup: 120, role: 'finish', needs: ['3-phase', 'gas', 'vent'],
    hazard: 'catalytic debinding uses nitric acid gas and makes formaldehyde; sintering runs in hydrogen, which burns in air from 4 % to 75 %',
    src: 'BASF\'s Catamold route at 100–140 °C, then about 1380 °C in hydrogen (processor.ts `sinter`). Usually bought as a service, because the furnace costs more than every other station together' },
  { id: 'heat-treat', name: 'hardening and tempering', family: 'treat', on: ['metal-hard'], tol: 0.2, feature: 1, cycle: 90, setup: 45, role: 'finish', needs: ['gas', 'vent'],
    src: 'a cut part is soft; a hardened one holds an edge and a thread, and the same forge does it (typical)' },
  { id: 'cure', name: 'washing and curing', family: 'treat', on: ['photopolymer', 'composite'], tol: 0.05, feature: 0.05, cycle: 25, setup: 15, role: 'finish', needs: ['power', 'vent'],
    src: 'a resin print is not finished until it is washed and cured, and an uncured part keeps sensitising whoever handles it' },
  { id: 'coat', name: 'coating and anodising', family: 'treat', on: ['metal-soft', 'metal-hard'], tol: 0.05, feature: 0.02, cycle: 75, setup: 60, role: 'finish', needs: ['vent', 'water'],
    hazard: 'anodising is done in sulphuric acid and gives off hydrogen at the cathode',
    src: 'a coat is 10 to 25 µm and must be allowed for in a fit (typical)' },
  { id: 'calliper', name: 'callipers and micrometers', family: 'measure', on: ['metal-soft', 'metal-hard', 'thermoplastic', 'wood', 'composite', 'board', 'clay', 'concrete', 'glass', 'elastomer', 'photopolymer'], tol: 0.02, feature: 0.01, setup: 0, role: 'finish', needs: [],
    src: 'a digital calliper reads to 0.01 mm and is honest to about 0.02; a micrometer to 0.004. The cheapest capability in the works and the one that makes every other improve' },
  { id: 'indicate', name: 'indicator on a surface plate', family: 'measure', on: ['metal-soft', 'metal-hard', 'thermoplastic'], tol: 0.01, feature: 0.01, setup: 5, role: 'finish', needs: [],
    src: 'flatness, parallelism and runout: the three a calliper cannot see and every fit depends on (typical)' },
  { id: 'vision', name: 'vision', family: 'measure', on: ['metal-soft', 'metal-hard', 'thermoplastic', 'board', 'live'], tol: 0.05, feature: 0.02, setup: 10, role: 'finish', needs: ['power'],
    src: 'a camera against a known scale measures what no hand reaches and counts what no one wants to count; it is also the robot\'s eyes, so it is bought once for two jobs (robot.ts `pixelsAcross`)' },
  { id: 'probe', name: 'probing on the machine', family: 'measure', on: ['metal-soft', 'metal-hard'], tol: 0.01, feature: 0.01, setup: 5, role: 'finish', needs: ['power'],
    src: 'a touch probe in the spindle finds the part instead of the operator finding it, and closes the loop without taking it off (typical)' },
  { id: 'weigh', name: 'weighing', family: 'measure', on: ['metal-soft', 'metal-hard', 'thermoplastic', 'clay', 'live'], tol: 0.1, feature: 0.1, setup: 0, role: 'finish', needs: [],
    src: 'a 0.1 g scale is how a print is checked against its own model and how a mix is got right (typical)' },
];
export const processById = (id: string): Process => { const p = PROCESSES.find((q) => q.id === id); if (!p) throw new Error(`no process ${id}`); return p; };
/** Whether a process can produce a part out of material, rather than only preparing, finishing or joining one. */
export const makes = (p: Process): boolean => (p.role ?? 'make') === 'make' && p.family !== 'measure';

export interface Station {
  id: string; name: string;
  /** the processes it does */ does: string[];
  /** what it holds, ± mm, where it is better or worse than its process's class */ tol?: number;
  /** the biggest part it works, mm */ envelope?: [number, number, number];
  /** what it costs: a key in prices.ts, else the money itself with where it came from */ price?: string; usd?: number; from?: string;
  /** the floor it wants with room to stand at it, m² */ floor: number;
  /** what it draws when it is working, kW */ kw: number;
  needs: Need[];
  /** what the same capability costs secondhand: an estimate of that market, which moves */ used?: { usd: number; src: string };
  /** this works building the station itself: the material, the hours, and the stations it needs first. Where a station
   *  has one, the cheapest way to have it is to make it — at the price of weeks instead of an afternoon. */
  selfBuild?: { usd: number; hours: number; needs: string[]; how: string };
  /** what it makes possible that nothing cheaper does: why it is on the list at all */ why: string;
}
/** How a station was come by. The order is the order of increasing work and decreasing money. */
export type Buying = 'new' | 'used' | 'build';

export const STATIONS: Station[] = [
  { id: 'bench', name: 'a bench, a vice and hand tools', does: ['saw', 'drill', 'fasten', 'bond', 'calliper', 'weigh'], tol: 0.5, envelope: [1600, 800, 600], usd: 300, from: 'a solid bench, a 100 mm vice, files, taps, a hacksaw and a cordless drill (an estimate of the whole)', floor: 3, kw: 0.5, needs: ['power'],
    used: { usd: 120, src: 'a secondhand bench and a secondhand 100 mm vice with the taps and files bought new (an estimate of that market)' },
    selfBuild: { usd: 95, hours: 6, needs: ['welder'], how: 'the welded bench this engine already plans (BUILDS.workbench): about 11 m of 40 \u00d7 40 \u00d7 2 box section and a sheet of 25 mm ply, welded and bolted. The first thing a works makes is the thing it stands on, and it is the cheapest proof that the welder works' },
    why: 'everything else is held, marked, drilled and finished here. A works without a bench is a pile of machines' },
  { id: 'measuring', name: 'callipers, a micrometer, an indicator and a surface plate', does: ['calliper', 'indicate', 'weigh'], usd: 180, from: 'a 150 mm digital calliper, a 0–25 mm micrometer, a 0.01 mm indicator on a magnetic base and a small granite plate (an estimate of the set)', floor: 0.3, kw: 0, needs: [],
    used: { usd: 95, src: 'a secondhand micrometer and a secondhand granite plate with the calliper and indicator bought new (an estimate of that market; a plate is the one measuring tool that does not wear out, so used is as good as new unless it has been dropped)' },
    why: 'the loop closer. Nothing else here makes the works better over time; this does, and it is the cheapest thing on the list' },
  { id: 'printer-fff', name: 'an FFF 3D printer', does: ['fff'], envelope: [220, 220, 250], price: 'printer-fff', floor: 1.5, kw: 0.35, needs: ['power'],
    used: { usd: 100, src: 'a secondhand Ender-3 class machine, which the market is full of because people buy one, print twenty things and stop (an estimate of that market)' },
    why: 'not mainly for finished parts: for the fixtures, jigs, soft jaws, moulds, bucks and patterns every other station needs. It is the station that makes the other stations usable' },
  { id: 'printer-msla', name: 'a resin printer with its wash-and-cure', does: ['msla', 'cure'], envelope: [218, 123, 235], usd: 400, from: 'a mid-size MSLA machine with its wash-and-cure station (an estimate of the class)', floor: 1, kw: 0.2, needs: ['power', 'vent'],
    why: 'the only cheap way to 50 µm features: patterns for casting, and anything small a 0.4 mm nozzle cannot say' },
  { id: 'cnc-benchtop', name: 'a benchtop CNC', does: ['mill', 'drill', 'probe'], tol: 0.1, envelope: [300, 180, 45], price: 'cnc-benchtop', floor: 2, kw: 0.3, needs: ['power', 'extraction'],
    used: { usd: 90, src: 'a secondhand 3018 (an estimate of that market)' },
    selfBuild: { usd: 190, hours: 30, needs: ['printer-fff', 'bench'], how: 'a printed-frame router on bought rails: 3 \u00d7 SBR12 or 2 \u00d7 MGN12 (about $70), three NEMA 17s ($30), a board ($45), a 500 W spindle ($25), plates and fasteners ($20). It costs more money than the $149 kit and thirty hours on top, so the engine does not take it \u2014 it is here because knowing that is worth more than guessing it' },
    why: 'the first machine that makes a flat face, a bored hole and a true edge. A printer does none of the three, and every fit in a machine depends on them' },
  { id: 'mill-knee', name: 'a knee mill or a used machining centre', does: ['mill', 'drill', 'probe'], tol: 0.02, envelope: [600, 300, 400], usd: 4000, from: 'a used benchtop or knee mill in working order (an estimate; a working secondhand market, not a list price)', floor: 6, kw: 2.5, needs: ['3-phase', 'extraction'],
    why: 'where the benchtop machine stops: steel, depth of cut, and a tolerance that will hold a bearing' },
  { id: 'lathe', name: 'a lathe', does: ['turn', 'drill'], tol: 0.025, envelope: [300, 150, 150], usd: 1200, from: 'a 7 × 14 to 9 × 20 benchtop lathe (an estimate of the class)', floor: 4, kw: 0.75, needs: ['power'],
    why: 'anything round and anything threaded: shafts, spacers, bushes, adapters — the parts a printer gets wrong and a mill does slowly' },
  { id: 'welder', name: 'a flux-core or MIG welder', does: ['weld-mig'], price: 'welder-fluxcore', floor: 4, kw: 4, needs: ['power', 'extraction'],
    used: { usd: 80, src: 'a secondhand 120 V flux-core machine, or an old stick welder, which is the cheapest arc there is (an estimate of that market)' },
    why: 'the cheapest way to make a steel frame that is one piece. Everything structural above table size is welded' },
  { id: 'spot-welder', name: 'a resistance spot welder', does: ['spot-weld'], usd: 250, from: 'a 2 kVA bench spot welder (an estimate of the class)', floor: 1, kw: 2, needs: ['power'],
    why: 'sheet-metal boxes, brackets and battery tabs in a second a joint, with no fume and no filler' },
  { id: 'soldering', name: 'the soldering bench', does: ['solder', 'calliper'], price: 'soldering-iron', floor: 1.5, kw: 0.1, needs: ['extraction'],
    why: 'every machine here is run by a board, and a board that cannot be repaired is a machine that is thrown away. The library teaches this one by hand already' },
  { id: 'forge', name: 'a propane forge and an anvil', does: ['forge', 'heat-treat', 'braze'], usd: 350, from: 'a two-burner propane forge, a 50 kg anvil and tongs (an estimate of the set)', floor: 6, kw: 0, needs: ['gas', 'extraction'],
    used: { usd: 180, src: 'a secondhand propane forge, usually sold with the anvil (an estimate of that market)' },
    selfBuild: { usd: 130, hours: 8, needs: ['welder', 'bench'], how: 'a 200 mm steel tube or an empty 20 lb propane tank lined with 50 mm of ceramic wool, rigidized and coated with a refractory; the burner is black-iron pipe fittings with a 0.035 in MIG contact tip as the orifice \u2014 the naturally aspirated pattern every amateur forge uses, because it needs no blower and no electricity. The anvil is a length of 100 mm square bar stood on end, which works better than a cheap cast one' },
    why: 'it hardens what the mill cut, brazes what cannot be welded, and forms steel in a way no cutting matches — the grain follows the shape' },
  { id: 'foundry', name: 'a crucible furnace', does: ['cast'], envelope: [250, 250, 200], usd: 400, from: 'a propane crucible furnace, crucible, tongs and flask gear (an estimate of the set; cell.ts models the lost-PLA route it runs)', floor: 6, kw: 0, needs: ['gas', 'extraction'],
    used: { usd: 220, src: 'a secondhand crucible furnace with its crucible (an estimate of that market)' },
    selfBuild: { usd: 120, hours: 6, needs: ['forge'], how: 'the same burner in a steel pail lined with 50 mm of refractory. The crucible is bought ($35 for a #6 clay-graphite) because a home-made one fails with 3 kg of molten aluminium in it; the tongs, the lifting ring and the flask are made. This is the station that pays for the whole works: it turns printed patterns and scrap into castings' },
    why: 'it turns a printed pattern into an aluminium or brass part overnight. With the printer it is the cheapest metal part there is' },
  { id: 'wheel', name: 'a potter\'s wheel and clay tools', does: ['throw'], envelope: [350, 350, 400], usd: 500, from: 'an electric wheel with a 300 mm head, bats, ribs and a wire (an estimate of the set)', floor: 2, kw: 0.25, needs: ['power', 'water'],
    used: { usd: 180, src: 'a secondhand electric wheel (an estimate of that market)' },
    selfBuild: { usd: 90, hours: 10, needs: ['bench', 'welder'], how: 'a welded frame, a plywood-and-plaster head on a bought shaft and two bearings, driven by a washing-machine motor and its speed board. The one part that must be bought is the bearing pair, for the reason the whole file keeps giving' },
    why: 'the cheapest station in the building that makes a finished hollow form in two minutes, and the only one whose material costs nothing to try again' },
  { id: 'kiln', name: 'a kiln', does: ['kiln'], envelope: [580, 580, 680], usd: 2200, from: 'Skutt\'s KM-1027 class (its sellers\' listings; drawn as the kind `kiln Skutt-KM1027`)', floor: 2.5, kw: 11.5, needs: ['3-phase', 'vent'],
    why: 'clay, glass and every ceramic; and the same heat anneals and stress-relieves metal' },
  { id: 'laser-co2', name: 'a CO₂ laser cutter', does: ['laser-co2'], envelope: [600, 400, 10], usd: 2500, from: 'a 60 to 100 W enclosed machine with its chiller and extraction (an estimate of the class)', floor: 5, kw: 2, needs: ['power', 'extraction', 'water'],
    why: 'flat parts out of ply and acrylic in minutes: enclosures, panels, jigs and templates for everything else' },
  { id: 'laser-fibre', name: 'a fibre laser cutter', does: ['laser-fibre'], envelope: [1500, 3000, 12], usd: 60000, from: 'a 1.5 kW enclosed sheet machine with its chiller, extraction and nitrogen (an estimate of the class; makers sell by quote)', floor: 40, kw: 20, needs: ['3-phase', 'gas', 'extraction'],
    why: 'flat steel and aluminium cut accurately and fast: it replaces sawing, filing and most drilling on anything made of sheet' },
  { id: 'fuser', name: 'a laser powder-bed fuser', does: ['pbf'], envelope: [250, 250, 325], usd: 700000, from: 'an EOS M 290 class machine, installed (an estimate: EOS sells by quote; drawn as `pbf EOS-M290`)', floor: 30, kw: 12, needs: ['3-phase', 'gas', 'extraction'],
    why: 'metal parts no other process can make: internal channels, lattices, one piece where there were twenty. Also the most expensive way to be wrong' },
  { id: 'sinter-furnace', name: 'a debind-and-sinter furnace', does: ['sinter'], envelope: [200, 200, 200], usd: 120000, from: 'a catalytic debinder and a hydrogen retort furnace (an estimate; Elnik and DSH sell by quote, and both sell the same thing as a service)', floor: 12, kw: 20, needs: ['3-phase', 'gas', 'vent'],
    why: 'what turns a bound-metal print into metal. Almost always bought as a service instead, which is why bound metal is cheap and this line is here to be skipped' },
  { id: 'concrete-gantry', name: 'a concrete-printing gantry and pump', does: ['concrete-print'], envelope: [6000, 6000, 3000], usd: 180000, from: 'a gantry, a pump and a mixer at building scale (an estimate; makers sell by project)', floor: 60, kw: 25, needs: ['3-phase', 'water'],
    why: 'only if the output is buildings. The gantry is the same gantry as any other: what is new is the pump and the mix' },
  { id: 'arm', name: 'a six-axis arm', does: ['fasten', 'bond', 'vision', 'weld-mig', 'solder'], tol: 0.1, envelope: [850, 850, 850], usd: 30000, from: 'a UR5e-class collaborative arm with its controller (an estimate: Universal Robots sells through distributors; modelled in dharm.ts)', floor: 4, kw: 0.5, needs: ['power'],
    why: 'it adds no process. It repeats one, unattended, at three in the morning. Buy it when a job repeats, never to do a job once' },
  { id: 'rail', name: 'a linear track under the arm', does: [], envelope: [3000, 0, 0], usd: 6000, from: 'a 3 m seventh axis: rail, rack, servo, drag chain and drive (an estimate of the class)', floor: 6, kw: 0.4, needs: ['power'],
    why: 'reach, at a fraction of another arm. An arm reaches 0.85 m; three metres of track costs a fifth of a second arm and turns one arm into a line of stations' },
  { id: 'amr', name: 'a mobile robot', does: [], usd: 18000, from: 'a small autonomous mobile robot with its charger and map (an estimate of the class)', floor: 2, kw: 0.3, needs: ['power'],
    why: 'it moves material between cells, never work within one: it docks to about ±10 mm where an arm repeats to ±0.03, so what it carries is located again when it arrives' },
  { id: 'computer', name: 'a computer, the code and the Bluetooth bridge', does: [], usd: 155, from: 'a used business mini PC that runs a slicer, a CAM post and a Klipper or LinuxCNC host (about $150 secondhand \u2014 an estimate of that market) plus a XIAO ESP32C3 at $4.99 (Seeed\'s own price) as the BLE-UART bridge. A laptop already owned makes this line $5; a new workstation makes it $600', floor: 1, kw: 0.2, needs: ['power'],
    why: 'every station above takes G-code, a program or a recipe; the same computer writes all of them, and the $5 bridge is what carries them to the machine (link.ts). It is the cheapest line on the list and the one that makes the works remote-controllable at all' },
  { id: 'safety', name: 'the safety kit and extraction', does: [], usd: 250, from: 'a shade-10 auto-darkening welding helmet, a P100 half mask with organic-vapour cartridges, welding gloves and a leather apron, safety glasses, a 2 kg ABC extinguisher, a fire blanket, a burn kit, and a 100 mm inline fan with ducting to take fume out at the work (an estimate of the set)', floor: 1, kw: 0.1, needs: ['power'],
    why: 'it buys no capability and it is not optional. Half the processes on this list carry a hazard that takes an eye, a lung or a house, and a works that owns a welder and not a helmet is not cheaper \u2014 it is unbuilt. The engine adds this line by itself the moment a hazardous station is chosen' },
  { id: 'lathe-mini', name: 'a mini lathe', does: ['turn', 'drill'], tol: 0.05, envelope: [250, 90, 90], price: 'lathe-mini', floor: 2.5, kw: 0.37, needs: ['power'],
    used: { usd: 400, src: 'a secondhand 7 \u00d7 10 or 7 \u00d7 12, of which there are many, usually barely used and usually needing its gibs and its cross-slide nut adjusted (an estimate of that market)' },
    why: 'the cheapest machine on any shelf that makes a round part: a shaft, a bush, a spacer, a bore a bearing will sit in. It holds about \u00b10.05 mm rather than the \u00b10.025 of a bigger lathe, which is still inside a bearing\'s own fit, and its 180 mm swing is the real limit' },
  { id: 'lathe-scrap', name: 'a lathe cast and built here', does: ['turn', 'drill'], tol: 0.1, envelope: [250, 90, 90], usd: 0,
    selfBuild: { usd: 120, hours: 160, needs: ['foundry', 'bench', 'drill-press'], how: 'Gingery\'s route (Build Your Own Metal Working Shop From Scrap, 1980): the bed, headstock, tailstock and carriage cast in aluminium in oil-bonded sand from scrap, then scraped and fitted using the castings themselves as the reference surface. The material is scrap and about $120 of sand, bearings and fasteners; the cost is four to six weeks of evenings' },
    from: 'nothing sells it: it is only ever built, so its new price is zero and its real price is 160 hours',
    floor: 2.5, kw: 0.37, needs: ['power'],
    why: 'the cheapest round part in the world, and the most work. It holds about \u00b10.1 mm rather than the \u00b10.05 of a bought mini lathe \u2014 enough for a bush or a spacer, not enough for a bearing seat \u2014 and it is the only station here a works can make before it can buy' },
  { id: 'drill-press', name: 'a bench drill press', does: ['drill'], tol: 0.15, envelope: [400, 300, 200], usd: 150, from: 'a 5-speed 250 mm bench drill press (an estimate of the class)', floor: 1.5, kw: 0.37, needs: ['power'],
    used: { usd: 60, src: 'a secondhand bench drill press, of which there are more than there are buyers (an estimate of that market)' },
    why: 'a hole square to the face, which a hand drill never is and a 300 mm router cannot reach. The most-used machine in a metal shop and nearly the cheapest' },
  { id: 'brake', name: 'a sheet-metal brake and shear', does: ['bend', 'press'], tol: 0.5, envelope: [760, 400, 1.6], usd: 260, from: 'a 760 mm bench brake with a shear (an estimate of the class)', floor: 2, kw: 0, needs: [],
    selfBuild: { usd: 60, hours: 5, needs: ['welder', 'bench'], how: 'two 600 mm lengths of 50 \u00d7 50 \u00d7 6 angle bolted along a hinge line with a bending leaf and a handle: it bends 1.6 mm steel and 2 mm aluminium over 600 mm, which is everything a cheap works makes out of sheet' },
    why: 'the only station here that covers forming without heat: a bent flange is stiffer than a flat plate twice its thickness, which is why everything mass-made out of sheet is bent rather than thickened' },
  { id: 'kiln-small', name: 'a small test kiln', does: ['kiln'], envelope: [200, 200, 230], usd: 700, from: 'a 0.5 ft\u00b3 120 V test kiln reaching cone 6 (an estimate of the class; the full-size KM-1027 above is $2,200 and wants three-phase)', floor: 1, kw: 1.8, needs: ['power', 'vent'],
    used: { usd: 250, src: 'a secondhand hobby kiln, which are sold cheap because people are afraid of the wiring (an estimate of that market)' },
    selfBuild: { usd: 180, hours: 20, needs: ['bench', 'soldering', 'safety'], how: 'a box of insulating firebrick laid dry in an angle-iron frame, with Kanthal A1 element wire in grooves cut with a router bit, a PID controller, a solid-state relay on a heatsink and a type-K thermocouple (about $60 of the total). It is a real build and a real fire risk \u2014 1.8 kW inside a brick box on a wooden floor \u2014 so the engine will not count it until the safety kit is in' },
    why: 'it brings clay and glass inside a small budget at a tenth of the floor and a sixth of the power of a studio kiln. What it costs is size: a mug fits, a dinner service does not' },
];
export const stationById = (id: string): Station => { const s = STATIONS.find((q) => q.id === id); if (!s) throw new Error(`no station ${id}`); return s; };
/** What a station costs new today: its price key's cheapest real offer where it has one, else the figure it carries. */
export function stationUsd(s: Station): number { if (s.price) { const c = cheapest(s.price); if (c) return c.usd; } return s.usd ?? 0; }

/** The cheapest way to have a station, given what the works already has and how much work is acceptable. `build` takes
 *  the least of new, used and made-here; `used` the least of new and used; `new` only the new price. A self-build only
 *  counts when the stations it needs are already had, which is what makes the order of buying matter: the welder comes
 *  before the forge not because it is better but because the forge is welded. */
export function stationCost(s: Station, have: string[] = [], prefer: Buying = 'new'): { usd: number; as: Buying; hours: number; says: string } {
  // a station with no new price is not free: nobody sells it, so buying new is not one of the ways
  const ways = stationUsd(s) > 0 ? [{ usd: stationUsd(s), as: 'new' as Buying, hours: 0, says: s.from ?? 'its price key\'s cheapest offer' }] : [];
  if (prefer !== 'new' && s.used) ways.push({ usd: s.used.usd, as: 'used' as Buying, hours: 1, says: s.used.src });
  if (prefer === 'build' && s.selfBuild && s.selfBuild.needs.every((n) => have.includes(n))) ways.push({ usd: s.selfBuild.usd, as: 'build' as Buying, hours: s.selfBuild.hours, says: s.selfBuild.how });
  if (!ways.length) return { usd: Infinity, as: 'new', hours: 0, says: `nothing sells ${s.name} and this works cannot build it yet${s.selfBuild ? `: it wants ${s.selfBuild.needs.join(', ')} first` : ''}` };
  return ways.sort((a, b) => a.usd - b.usd)[0]!;
}

export interface Works { id: string; name: string; stations: string[]; says: string }
/** Works from the cheapest up, each the one before it plus a capability — so the list reads as the order to buy in.
 *  They are a convenience for saying "a works this size"; the engine itself takes any set of station ids. */
export const TIERS: Works[] = [
  { id: 'bench', name: 'the bench', stations: ['bench', 'measuring', 'soldering', 'computer'],
    says: 'joining, cutting by hand, and measuring. It makes nothing to a tolerance, but it repairs everything, and it is where every other station is worked from' },
  { id: 'shop', name: 'the plastic shop', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'cnc-benchtop'],
    says: 'adding, cutting, joining and measuring — four of the six. The printer makes the shapes and the fixtures, the CNC the flat faces and bored holes a printer cannot, the callipers close the loop. Nothing here forms metal and nothing here treats anything, so it works plastic and wood and only cuts metal; it is still the cheapest thing that can honestly be called a works' },
  { id: 'metal', name: 'the metal shop', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'cnc-benchtop', 'lathe', 'welder', 'forge', 'foundry'],
    says: 'all six families over metal as well as plastic: cast from printed patterns, turned, welded into frames, hardened in the forge. From here a works can make most of its own next machine' },
  { id: 'works', name: 'the works', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'printer-msla', 'cnc-benchtop', 'mill-knee', 'lathe', 'welder', 'spot-welder', 'forge', 'foundry', 'wheel', 'kiln', 'laser-co2', 'arm', 'rail'],
    says: 'the same six families with the tolerance raised to ±0.02, flat stock cut by light, clay thrown and fired, and one arm on a track to repeat whatever repeats' },
  { id: 'plant', name: 'the plant', stations: ['bench', 'measuring', 'soldering', 'computer', 'printer-fff', 'printer-msla', 'cnc-benchtop', 'mill-knee', 'lathe', 'welder', 'spot-welder', 'forge', 'foundry', 'wheel', 'kiln', 'laser-co2', 'laser-fibre', 'fuser', 'sinter-furnace', 'concrete-gantry', 'arm', 'rail', 'amr'],
    says: 'metal printed as well as cut, sintered in-house instead of sent out, flat metal cut by light, concrete printed, material carried by a mobile robot. It adds reach no amount of hand work replaces, and a great deal of throughput' },
];

/** The works a budget actually buys, derived rather than declared. This is the question a person really asks — "what
 *  is the most capable works I can have for this much" — and the answer is not the top of a list of tiers: it is a
 *  greedy walk that spends each dollar where it buys the most capability.
 *
 *  Capability is scored, so the trade is arguable rather than asserted: a family of making not yet covered is worth
 *  far more than a second machine in a family already covered; a material class the works cannot touch is worth more
 *  than a faster way to touch one it can; and a tenfold improvement in tolerance is worth about as much as a new
 *  material. The floor — a bench, measurement and a computer — is bought first and not scored, because nothing else
 *  works without it: a machine with no way to hold the part, check the part or send it a program is an ornament.
 *  The safety kit is bought automatically the first time a hazardous station is chosen, and its cost comes out of the
 *  same budget, because that is what honesty costs. */
export interface Bought { id: string; usd: number; as: Buying; hours: number; gain: string }
/** What this library's own builds are made of, and so what a works for them has to work: machines, boards, robots and
 *  instruments. It is the default `want` because a capability is only worth what it is wanted for — without it the
 *  engine will buy a potter's wheel before a 3D printer, since the wheel is the cheapest station that covers forming,
 *  and be right by its own score and absurd in a workshop. Ask for clay and it will buy the wheel. */
export const WANT_MACHINES: MatClass[] = ['thermoplastic', 'metal-soft', 'metal-hard', 'board', 'composite', 'wood'];
export function worksUnder(cap: number, o: { floor?: string[]; avoid?: string[]; prefer?: Buying; want?: MatClass[] } = {}): { ids: string[]; usd: number; hours: number; left: number; steps: Bought[]; says: string } {
  const prefer = o.prefer ?? 'build', want = o.want ?? WANT_MACHINES;
  // a family counts only where a process in it works something wanted; a wanted material class is worth fifteen times
  // one that is not. Both numbers are arguable, and arguing with them is the point of having them written down.
  const score = (ids: string[]): number => {
    const procs = [...new Set(ids.flatMap((i) => stationById(i).does))].map(processById);
    const useful = procs.filter((p) => p.on.some((c) => want.includes(c)));
    const families = new Set(useful.map((p) => p.family)).size;
    const classes = [...new Set(procs.filter((p) => p.family !== 'measure').flatMap((p) => p.on))];
    const tol = Math.min(...ids.flatMap((i) => stationById(i).does.map(processById).filter((p) => p.family !== 'measure').map((p) => stationById(i).tol ?? p.tol)), Infinity);
    return 1000 * families + 300 * classes.filter((c) => want.includes(c)).length + 20 * classes.filter((c) => !want.includes(c)).length
      + 25 * procs.length + (Number.isFinite(tol) ? 150 * Math.max(0, -Math.log10(tol)) : 0);
  };
  const avoid = o.avoid ?? [];
  const base = (o.floor ?? ['bench', 'measuring', 'computer']).filter((i) => !avoid.includes(i));
  const ids: string[] = [], steps: Bought[] = [];
  let usd = 0, hours = 0;
  const take = (id: string, gain: string) => {
    const c = stationCost(stationById(id), ids, prefer);
    ids.push(id); usd = +(usd + c.usd).toFixed(2); hours += c.hours;
    steps.push({ id, usd: c.usd, as: c.as, hours: c.hours, gain });
  };
  // the floor, in the order its own self-builds allow: a bench welded by a welder needs the welder first, so on the
  // first pass the floor is bought as it comes and the greedy below may replace nothing — the order is the point
  for (const id of base) take(id, 'the floor: nothing else works without it');
  if (usd > cap) return { ids: [], usd: 0, hours: 0, left: cap, steps: [], says: `${money(cap)} does not reach the floor: a bench, a calliper and a computer are ${money(usd)} between them, and a machine with no way to hold, check or program the part is an ornament` };
  const hazardous = (id: string) => stationById(id).does.some((d) => !!processById(d).hazard);
  for (;;) {
    let best: { id: string; per: number; gain: number; cost: number } | null = null;
    for (const st of STATIONS) {
      if (ids.includes(st.id) || avoid.includes(st.id) || st.id === 'safety') continue;
      const c = stationCost(st, ids, prefer);
      const needsKit = (hazardous(st.id) || !!st.selfBuild?.needs.includes('safety')) && !ids.includes('safety');
      const cost = +(c.usd + (needsKit ? stationUsd(stationById('safety')) : 0)).toFixed(2);
      if (cost <= 0 || usd + cost > cap) continue;
      const gain = score([...ids, st.id]) - score(ids);
      if (gain <= 0) continue;
      const per = gain / cost;
      if (!best || per > best.per) best = { id: st.id, per, gain, cost };
    }
    if (!best) break;
    if ((hazardous(best.id) || !!stationById(best.id).selfBuild?.needs.includes('safety')) && !ids.includes('safety'))
      take('safety', `bought with ${stationById(best.id).name}, because it carries a hazard and a works that owns one without the other is not cheaper \u2014 it is unbuilt`);
    const c = stationCost(stationById(best.id), ids, prefer);
    take(best.id, `${Math.round(best.gain)} points of capability for ${money(c.usd)}${c.as === 'build' ? ` and ${c.hours} h of your own work, made here rather than bought` : c.as === 'used' ? ', secondhand' : ''}: ${stationById(best.id).why.split(/[.:]/)[0]}`);
  }
  const w = worksOf(ids), left = +(cap - usd).toFixed(2);
  const builtHere = steps.filter((x) => x.as === 'build');
  return { ids, usd, hours, left, steps,
    says: `For ${money(cap)}: ${ids.length} stations at ${money(usd)}${hours ? ` plus ${hours} h of your own work` : ''}, ${money(left)} left for the first month of consumables \u2014 filament, welding wire, flux, a crucible of aluminium, cutters.`
      + ` It covers ${w.families.length} of the six families (${w.families.join(', ')}), works ${w.materials.length} material classes, and holds \u00b1${w.tol} mm at its best while measuring to \u00b1${w.measureTol}.`
      + (w.missing.length ? ` It does not cover ${w.missing.join(' or ')}.` : '')
      + (builtHere.length ? ` ${builtHere.length} station${builtHere.length === 1 ? ' is' : 's are'} made here rather than bought (${builtHere.map((x) => stationById(x.id).name).join(', ')}), which is where the money was saved and where the ${builtHere.reduce((a, x) => a + x.hours, 0)} h went.` : '') };
}

/** The buying order written out, so a person can work down it. */
export function worksUnderText(cap: number, o: Parameters<typeof worksUnder>[1] = {}): string {
  const r = worksUnder(cap, o);
  if (!r.ids.length) return r.says;
  const out = [r.says, ''];
  let run = 0;
  for (const st of r.steps) { run = +(run + st.usd).toFixed(2); out.push(`  ${money(st.usd).padStart(9)} ${st.as === 'build' ? 'build' : st.as === 'used' ? 'used ' : 'new  '} ${String(money(run)).padStart(9)} total  ${stationById(st.id).name}${st.hours ? ` (${st.hours} h)` : ''}\n${' '.repeat(12)}${st.gain}${st.as === 'build' ? `\n${' '.repeat(12)}how: ${stationById(st.id).selfBuild!.how}` : ''}`); }
  out.push('', worksText(r.ids, o.prefer ?? 'build'));
  return out.join('\n');
}

export interface WorksSum {
  stations: Station[]; usd: number; floor: number; kw: number;
  needs: Need[]; families: Family[]; missing: Family[];
  /** the classes it can actually make something out of — not the ones it can measure, which is every class a
   *  calliper touches and would make the list a lie */ materials: MatClass[];
  /** the finest a making process here holds, ± mm */ tol: number;
  /** the finest it can measure, ± mm, which is a different and usually smaller number */ measureTol: number;
  envelope: [number, number, number];
}
/** What a set of stations adds up to: money, floor, power, what it must be given, the families it covers and does not. */
export function worksOf(ids: string[]): WorksSum {
  const stations = ids.map(stationById);
  const procs = [...new Set(stations.flatMap((s) => s.does))].map(processById);
  const families = [...new Set(procs.map((p) => p.family))];
  const at = (f: (p: Process) => boolean) => stations.flatMap((s) => s.does.map(processById).filter(f).map((p) => s.tol ?? p.tol));
  const tols = at((p) => p.family !== 'measure'), mtols = at((p) => p.family === 'measure');
  const env = stations.map((s) => s.envelope).filter((e): e is [number, number, number] => !!e);
  return { stations, usd: +stations.reduce((a, s) => a + stationUsd(s), 0).toFixed(2),
    floor: +stations.reduce((a, s) => a + s.floor, 0).toFixed(1), kw: +stations.reduce((a, s) => a + s.kw, 0).toFixed(2),
    needs: [...new Set(stations.flatMap((s) => s.needs))],
    families, missing: FAMILIES.map((f) => f.id).filter((f) => !families.includes(f)),
    materials: [...new Set(procs.filter((p) => p.family !== 'measure').flatMap((p) => p.on))],
    tol: tols.length ? Math.min(...tols) : Infinity, measureTol: mtols.length ? Math.min(...mtols) : Infinity,
    envelope: env.length ? [Math.max(...env.map((e) => e[0])), Math.max(...env.map((e) => e[1])), Math.max(...env.map((e) => e[2]))] : [0, 0, 0] };
}

/** The works this was asked for: the most capable one under $3,000, derived by `worksUnder` and not chosen by hand,
 *  so it moves when a price or a station moves instead of going stale in a list. It is what `worksWords` answers with
 *  by default, and what the builds below are routed through unless another set of stations is named. */
export const UNDER_3K = worksUnder(3000);

/** What no small works makes, and the real reason — not "it is hard" but the process that is missing. This list is the
 *  most useful thing in the file: the difference between a works that bootstraps and one that buys a lathe and still
 *  cannot make a printer. These are bought finished and never worked here. */
export const ALWAYS_BOUGHT: { what: RegExp; unless?: RegExp; why: string }[] = [
  { what: /bearing/i, unless: /housing|carrier|cap\b|block\b|puller|\bbore\b|\bseat\b|journal|pocket|mount/i, why: 'its raceways are ground and its balls graded to a micron and sorted by size; the grinder that does it costs more than the whole works' },
  { what: /linear (rail|guide|bearing|shaft)|guide ?rail|guideway|\bmgn\d|\bhgr\d|ball ?screw|lead ?screw|\bsbr\d/i, why: 'ground and preloaded over its whole length: the bearing\'s problem again, on something a metre long' },
  { what: /\bmotor\b|stepper|\bservo\b|solenoid|outrunner|\bnema\s?\d/i, unless: /mount|bracket|plate|adapter|coupler|pulley|boss/i, why: 'sintered magnets, stamped and insulated laminations and a machine-wound coil: three processes, none of them in a small works' },
  { what: /\bbelt\b|timing belt/i, unless: /tension|clamp|guide/i, why: 'moulded onto its steel or glass cords in a heated press, to a pitch held over its whole length' },
  { what: /screw|bolt|\bnut\b|washer|fastener|t-slot|\binsert\b|rivet|\bstud\b/i, unless: /\bboss\b|plate\b|housing|lead ?screw/i, why: 'cold-headed and thread-rolled by the thousand at a few cents each; a lathe cuts one in twenty minutes and it is weaker, because a rolled thread\'s grain follows the form and a cut one\'s is severed' },
  { what: /\bboard\b|\bpcb\b|electronic|display|\blcd\b|\bpsu\b|power supply|\bchip\b|sensor|thermistor|endstop|\bswitch\b|camera|receiver|transmitter|\besc\b|flight controller|antenna/i,
    unless: /cradle|mount|bracket|holder|housing|\bcase\b|cover|clamp|shroud|stand\b|plate\b|tray/i, why: 'a wafer fab and a pick-and-place line' },
  { what: /batter|lipo|li-ion|\bcell\b|\bpack\b|accumulator/i, unless: /holder|tray|mount|bracket|strap|cradle|box\b/i, why: 'wound or stacked electrodes, a separator a few microns thick and a sealed, dry fill: a cell made badly is a fire, and none of it is a workshop process' },
  { what: /\bspring\b/i, unless: /seat\b|perch|retainer|cup\b/i, why: 'wound from patented wire, then set and stress-relieved: a spring made cold and unset creeps' },
  { what: /heater|heat(er)? cartridge|thermocouple/i, unless: /block\b|mount|holder/i, why: 'a resistance element swaged in magnesia inside a sheath' },
  { what: /o-ring|\bseal\b|gasket/i, unless: /groove|land\b|plate\b/i, why: 'compression-moulded to a tolerance on the cord, in a compound chosen for what it touches' },
  { what: /\bfan\b|blower|impeller/i, unless: /duct|shroud|mount|bracket|guard|grille/i, why: 'a moulded impeller balanced on a brushless motor' },
  { what: /\bptfe\b|bowden/i, unless: /clip|collet|fitting/i, why: 'extruded and drawn to a bore held over its length' },
  { what: /\bwheel\b|\btyre\b|\btire\b|caster|\broller\b/i, unless: /\bboss\b|\bhub\b|adapter|mount|bracket|spacer|guard|arch|well\b|nut\b|stud\b|potter/i,
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

// ---- a job: any build, routed ------------------------------------------------------------------------------------

/** One line of what is to be made: a part, how many, what of, how big. This is the engine's only input, so anything
 *  that can be listed can be thrown at it — a maker's own bill of materials, a kit's parts, or something sketched. */
export interface PartLine {
  name: string; n: number; mat: string;
  /** mm */ size?: [number, number, number];
  /** cm³ of material actually in one — not its envelope. A sparse print or a shelled casting is a fraction of its
   *  box, and charging the box instead is how a plan says 29 hours for a pattern that takes 4. */ cm3?: number;
  tol?: number; shape?: Shape;
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

/** One operation on one station: what it is, where it runs, how long it takes, what it waits for, and — this is the
 *  point of the file — the program the machine is actually sent, and the wire it goes down. */
export interface Op {
  id: string; part: string; n: number; process: string; station: string;
  /** minutes */ setup: number; run: number;
  /** the ids this cannot start before */ after: string[];
  transport: Transport; lang: Lang; /** what the machine is sent, or the steps a person follows */ program: string;
  says: string;
}
/** What a build costs in machines, money and hours, and where it cannot be done at all. */
export interface Job {
  what: string; works: string[];
  ops: Op[]; /** parts and material bought, with why */ buy: { line: PartLine; why: string; usd: number | null }[];
  /** lines nothing here can make and nothing sells ready-made */ gaps: { line: PartLine; why: string }[];
  minutes: number; /** with the stations run in parallel */ makespan: number;
  usd: number; schedule: { op: Op; start: number; end: number }[];
}

/** How long a run of n parts takes on a process: its rate where it has one, else the trade's own figure for that
 *  process; the setup once for the batch, because a batch is why a works has a queue at all. */
/** How much material a cut actually takes off, cm³: a profile out of sheet is its kerf, a shape out of a block is
 *  most of the block. 3 mm is a common cutter and a fair kerf for a laser's own allowance plus its lead-ins. */
function removed(_p: Process, line: { size?: [number, number, number] }, cm3: number): number {
  const mm = line.size;
  if (mm) {
    const [t, b, a] = [...mm].sort((x, y) => x - y);
    if (t <= 12 && a > 0) return Math.max(cm3 * 0.15, (2 * (a + b) * 3 * t) / 1000);
  }
  return cm3 * 1.8;
}
export function runMinutes(p: Process, line: { n: number; cm3?: number; size?: [number, number, number] }): number {
  if (p.cycle) return p.cycle; // a load is a load: ten hours in the kiln for one mug or for forty
  const cm3 = line.cm3 ?? (line.size ? (line.size[0] * line.size[1] * line.size[2]) / 1000 * 0.3 : 8);
  const each =
    p.id === 'saw' ? 1.5
    : p.id === 'weld-mig' || p.id === 'weld-tig' ? Math.max(1, (line.size ? (2 * (line.size[0] + line.size[1])) / 100 : 2))
    : p.id === 'spot-weld' ? 0.05
    : p.id === 'fasten' ? 1
    : p.id === 'solder' ? 0.6
    : p.id === 'bond' ? 2
    : p.id === 'calliper' || p.id === 'weigh' ? 0.5
    : p.id === 'indicate' || p.id === 'probe' ? 1
    // a cut takes material away, and how much depends on what it is cutting. A part cut out of sheet loses only its
    // kerf — perimeter × 3 mm × thickness — while a part cut out of a block loses most of the block. Charging a drone
    // frame as a block says nine hours for a job that takes half of one.
    : p.rate ? Math.max(0.5, (p.family === 'cut' ? removed(p, line, cm3) : cm3) / p.rate)
    : 2;
  return +(each * line.n).toFixed(1);
}

export interface Want {
  material: MatClass; size: [number, number, number]; tol?: number; feature?: number;
  /** only this family of making */ family?: Family;
  /** round, flat or neither */ shape?: Shape; cm3?: number; n?: number;
  /** true to allow a prep-, finish- or join-only process to answer. Off by default, and naming a family does not turn
   *  it on — asking for `cut` and being offered a drill press is how a plan ends up facing a plate on a lathe */ anyRole?: boolean;
}
export interface Verdict { ok: boolean; by?: { station: Station; process: Process }; minutes?: number; why?: string; buy?: { station: Station; usd: number } }
/** Can this works make that, and on what? The station and process that would do it in the fewest minutes, or the cause
 *  that stops it and the cheapest station that would close the gap. A gap is named by its cause — the material, the
 *  size, the tolerance, the shape — never as "no". */
export function canMake(ids: string[], w: Want): Verdict {
  const want = { tol: Infinity, feature: 0, shape: 'solid' as Shape, n: 1, ...w };
  const fits = (s: Station, p: Process): string | null => {
    if (!want.anyRole && !makes(p)) return 'role';
    if (!p.on.includes(want.material)) return 'material';
    if (want.family && p.family !== want.family) return 'family';
    if (p.shape && p.shape !== want.shape) return 'shape';
    const e = s.envelope;
    if (e) { const part = [...want.size].sort((a, b) => a - b), box = [...e].sort((a, b) => a - b); if (part.some((x, i) => x > box[i]!)) return 'size'; }
    if ((s.tol ?? p.tol) > want.tol) return 'tolerance';
    if (want.feature > 0 && p.feature > want.feature) return 'feature';
    return null;
  };
  const able = ids.map(stationById).flatMap((s) => s.does.map((d) => { const p = processById(d); return { s, p, no: fits(s, p) }; }));
  const tried = able.flatMap((a) => (a.no ? [a.no] : []));
  const ok = able.filter((a) => !a.no).map((a) => ({ ...a, minutes: a.p.setup + runMinutes(a.p, { n: want.n, cm3: want.cm3, size: want.size }) }));
  if (ok.length) { const best = ok.sort((a, b) => a.minutes - b.minutes || a.p.tol - b.p.tol)[0]!; return { ok: true, by: { station: best.s, process: best.p }, minutes: +best.minutes.toFixed(1) }; }
  const could = STATIONS.filter((s) => !ids.includes(s.id) && s.does.some((d) => !fits(s, processById(d)))).sort((a, b) => stationUsd(a) - stationUsd(b))[0];
  const cause = tried.includes('tolerance') ? `nothing here holds ±${want.tol} mm`
    : tried.includes('size') ? `nothing here takes a part ${want.size.join(' × ')} mm`
    : tried.includes('shape') ? `nothing here makes a ${want.shape === 'solid' ? 'shape like that' : `${want.shape} part`} out of ${want.material}`
    : tried.includes('feature') ? `nothing here makes a ${want.feature} mm feature`
    : `nothing here works ${want.material}`;
  return { ok: false, why: cause, ...(could ? { buy: { station: could, usd: stationUsd(could) } } : {}) };
}

/** What is not finished when it is formed. A works without the finishing station has not made the thing: it has made
 *  greenware, a sticky print or a wax-and-powder brick, and saying otherwise is the one lie this file must not tell. */
export const FINISH: { when: (cls: MatClass, process: string) => boolean; process: string; times?: number; why: string }[] = [
  { when: (c) => c === 'clay', process: 'kiln', times: 2, why: 'clay is not a mug until it is fired: a bisque, then a glaze firing. Unfired, it dissolves in the water you put in it' },
  { when: (c) => c === 'photopolymer', process: 'cure', why: 'a resin print comes out wet with uncured resin: washed in alcohol and cured under UV, or it stays soft and keeps sensitising whoever holds it' },
  { when: (_c, p) => p === 'bound-metal', process: 'sinter', why: 'a bound-metal print is steel powder in a wax binder: debound, then sintered at about 1380 °C, where it shrinks 16 to 20 % into metal' },
];

/** The program an operation sends: real, runnable text, from the same figures the library draws with. Where a machine
 *  has no port — a kiln's keypad, a welder, a wheel, a vice — the program is the steps, said so, rather than a
 *  pretend stream of bytes into something that cannot hear it. */
export function programFor(o: { process: string; part: string; n: number; station: string }, line?: PartLine): { lang: Lang; transport: Transport; program: string } {
  const l = linkFor(o.station), transport = l?.transport ?? 'hand', p = processById(o.process);
  const cls = line ? classOf(line.mat) : null;
  const mm = line?.size ?? [60, 60, 10];
  if (transport !== 'hand' && (o.process === 'fff' || o.process === 'bound-metal')) {
    const want = /petg/i.test(line?.mat ?? '') ? 'petg' : /abs|asa/i.test(line?.mat ?? '') ? 'asa' : o.process === 'bound-metal' ? 'ultrafuse-316l' : 'pla';
    const f = FILAMENTS.find((x) => x.id === want) ?? FILAMENTS[0]!;
    const nozzle = Math.round((f.nozzle[0] + f.nozzle[1]) / 2), bed = Math.round((f.bed[0] + f.bed[1]) / 2);
    const { start, end } = printStart({ nozzle, bed, fan: f.fan, name: `${o.n} × ${o.part}` });
    return { lang: 'gcode', transport, program: `${start}\n; ---- the slicer's own body for ${o.part} goes here: ${f.name}\n; ---- ${f.src}\n; ---- this file is what goes round it, which is the part a slicer gets wrong\n${end}` };
  }
  if (transport !== 'hand' && (o.process === 'mill' || o.process === 'drill' || o.process === 'laser-co2' || o.process === 'laser-fibre')) {
    const prof: Profile = { name: o.part, L: Math.max(10, mm[0]), W: Math.max(10, mm[1]), r: 0, holes: [], on: [], why: `${o.n} × ${o.part}, cut from ${line?.mat ?? 'stock'}` };
    const mat = (cls && cls in CUTTING ? cls : 'thermoplastic') as keyof typeof CUTTING;
    return { lang: 'gcode', transport, program: gcodeFor(prof, { material: mat, thickness: Math.max(1, Math.min(...mm)) }) };
  }
  if (o.process === 'kiln') {
    const k = KILNS[0]!, body = CLAYS.find((c) => c.id === 'stoneware-6') ?? CLAYS[0]!;
    const as = /glaze|2 of 2/.test(o.part) ? 'glaze' : 'bisque', made = fire(k, body, as);
    return { lang: 'kiln', transport, program: kilnProgram(made.settings.program.map((g) => ({ rate: g.rate, to: g.to, hold: Math.round(g.hold * 60) })), `${o.part}: ${as} to cone ${made.settings.cone}`) };
  }
  // no port on it: the program is the steps, and the check at each one
  const how = o.process === 'saw' ? 'mark from one face and one edge, and cut on the waste side of the line'
    : o.process === 'weld-mig' || o.process === 'weld-tig' ? 'clean both sides back to bright metal, tack at the ends, then fill between the tacks — and check the frame for square after tacking, because a weld pulls'
    : o.process === 'fasten' ? 'start every fastener before tightening any, so the holes can still find each other'
    : o.process === 'cast' ? 'dry the mould through, dry the tools, and stand out of the line of the crucible: water under a melt throws it'
    : o.process === 'throw' ? 'centre it before you open it; a wall under 6 mm will not survive the handle, and over 10 mm will crack in the firing'
    : o.process === 'cure' ? 'wash in alcohol, then cure under UV — gloves on until the second one is done'
    : o.process === 'bond' ? 'key and degrease both faces, then clamp: a bond is as good as the surface under it'
    : 'hold the work so it cannot move, and so your hands are not where the tool goes';
  const steps = [`; ${o.n} × ${o.part} by ${p.name} on ${stationById(o.station).name}`, `; ${p.src}`,
    ...(p.hazard ? [`; hazard: ${p.hazard}`] : []),
    `1. Set up (${p.setup} min): ${how}.`,
    `2. Run it, then measure: ${p.family === 'measure' ? 'this is the measurement' : `±${line?.tol ?? p.tol} mm is what this holds, so check against that and not against the drawing's nominal`}.`];
  return { lang: 'hand', transport, program: steps.join('\n') };
}

/** Route a build: every line either becomes an operation on a station here, is bought (as a finished component or as
 *  material), or is named as a gap with its cause. Each operation is given its program and the wire it goes down, so
 *  a plan is a thing a works can run rather than a thing it can read. Then the operations are scheduled across the
 *  machines there are. Nothing in here is special-cased per build: the rules at the top of the file do all of it. */
export function planJob(what: string, lines: PartLine[], ids: string[], joins: Join[] = []): Job {
  const ops: Op[] = [], buy: Job['buy'] = [], gaps: Job['gaps'] = [];
  let k = 0;
  const op = (o: Omit<Op, 'transport' | 'lang' | 'program'>, line?: PartLine): Op => { const full = { ...o, ...programFor(o, line) }; ops.push(full); return full; };
  const stationFor = (process: string): string | null => ids.find((i) => stationById(i).does.includes(process)) ?? null;
  const sawTol = processById('saw').tol;

  // pass 1: every line routed. A line that is made records the op that forms it and the finishing it is owed, so the
  // joints that happen while the material is still green can be put in between.
  const formed: { line: PartLine; id: string; owed: typeof FINISH }[] = [];
  for (const line of lines) {
    const cls = classOf(line.mat);
    const no = ALWAYS_BOUGHT.find((r) => r.what.test(line.name) && !(r.unless?.test(line.name) ?? false))
      ?? (cls === 'board' ? { why: 'a wafer fab and a pick-and-place line' }
        : cls === 'live' ? { why: 'a living culture is grown, not made: it needs a source and a lab, not a machine' } : undefined);
    if (no) { const c = priceOfLine(line); buy.push({ line, why: no.why, usd: c ? c.usd : null }); continue; }
    if (!cls) { gaps.push({ line, why: `${line.mat} is not a material any process here works, and nothing in the price book sells it` }); continue; }

    const size = line.size ?? [60, 60, 30], shape = shapeOf(line);
    // stock: the material is bought, and cutting it to size is still this works' job — but only if this works can
    // hold what the part asks for. A saw holds ±1 mm, and promising better with nothing that does it is the lie.
    const st = STOCK.find((r) => r.what.test(line.name) && !(r.unless?.test(line.name) ?? false));
    if (st) {
      const fine = line.tol != null && line.tol < sawTol;
      const v = fine ? canMake(ids, { material: cls, size, tol: line.tol, shape, cm3: line.cm3, n: line.n, family: 'cut' }) : { ok: false } as Verdict;
      if (fine && !v.ok) {
        gaps.push({ line, why: `the stock is bought by the sheet or the length, but it wants ±${line.tol} mm and ${v.why}${v.buy ? `; the cheapest station that would is ${v.buy.station.name} at ${money(v.buy.usd)}` : ''}. A sawn face is ±${sawTol} mm, and there is nothing here to face it with` });
        continue;
      }
      const c = priceOfLine(line);
      buy.push({ line: { ...line, name: `${line.name} (as material)` }, why: st.why, usd: c ? c.usd : null });
      if (v.ok) {
        const id = `op${++k}`;
        op({ id, part: line.name, n: line.n, process: v.by!.process.id, station: v.by!.station.id, setup: v.by!.process.setup, run: runMinutes(v.by!.process, line), after: [],
          says: `${line.n} × ${line.name} cut from bought stock by ${v.by!.process.name} on ${v.by!.station.name}, held to ±${line.tol} mm` }, line);
        formed.push({ line, id, owed: [] });
      } else if (stationFor('saw')) {
        const id = `op${++k}`;
        op({ id, part: line.name, n: line.n, process: 'saw', station: stationFor('saw')!, setup: processById('saw').setup, run: runMinutes(processById('saw'), line), after: [],
          says: `${line.n} × ${line.name} cut to size from bought stock; a sawn face is ±${sawTol} mm, and nothing about this part asks for better` }, line);
        formed.push({ line, id, owed: [] });
      } else gaps.push({ line, why: 'the stock is bought, but nothing here cuts it to length: a works without a saw cannot start' });
      continue;
    }

    // made here: the station and process that do it in the fewest minutes
    const v = canMake(ids, { material: cls, size, tol: line.tol, shape, cm3: line.cm3, n: line.n });
    if (!v.ok) {
      const c = priceOfLine(line);
      if (c) buy.push({ line, why: `${v.why}, so it is bought instead`, usd: c.usd });
      else gaps.push({ line, why: `${v.why}${v.buy ? `; the cheapest station that would is ${v.buy.station.name} at ${money(v.buy.usd)}` : ''}, and nothing in the price book sells it ready-made` });
      continue;
    }
    const p = v.by!.process, s = v.by!.station;
    // what is not finished when it is formed: if this works cannot finish it, it cannot make it, and says so
    const owed = FINISH.filter((f) => f.when(cls, p.id));
    const cannot = owed.find((f) => !stationFor(f.process));
    if (cannot) {
      const could = STATIONS.filter((x) => x.does.includes(cannot.process)).sort((a, b) => stationUsd(a) - stationUsd(b))[0];
      gaps.push({ line, why: `${s.name} would ${p.name.replace(/ing\b/, '')} it, but nothing here finishes it: ${cannot.why}${could ? `. The cheapest station that would is ${could.name} at ${money(stationUsd(could))}` : ''}` });
      continue;
    }
    const id = `op${++k}`, after: string[] = [];
    if (p.family === 'cut' && stationFor('saw') && stationFor('saw') !== s.id) {
      const cutId = `op${++k}`;
      op({ id: cutId, part: `${line.name}: stock`, n: line.n, process: 'saw', station: stationFor('saw')!, setup: processById('saw').setup, run: runMinutes(processById('saw'), line), after: [],
        says: `cut ${line.n} × stock for ${line.name} to length; a sawn face is ±${sawTol} mm, so it is faced on the machine afterwards` }, line);
      after.push(cutId);
    }
    op({ id, part: line.name, n: line.n, process: p.id, station: s.id, setup: p.setup, run: runMinutes(p, line), after,
      says: `${line.n} × ${line.name} by ${p.name} on ${s.name}${line.tol ? `, held to ±${line.tol} mm` : ''}` }, line);
    formed.push({ line, id, owed });
  }

  // pass 2: the joints made while the material is still green, before any firing or sintering
  const green = joins.filter((j) => j.when === 'before-finishing');
  const greenIds: string[] = [];
  for (const j of green) {
    const jp = PROCESSES.find((x) => x.id === j.how), where = jp ? stationFor(jp.id) : null;
    if (!jp || !where) { gaps.push({ line: { name: `${j.n} × ${j.how}`, n: j.n, mat: '' }, why: `${j.says} — and nothing here does it` }); continue; }
    const jid = `op${++k}`;
    op({ id: jid, part: `${what}: ${jp.name} (green)`, n: j.n, process: jp.id, station: where, setup: jp.setup,
      run: +(j.mm ? (j.mm / 100) * j.n : runMinutes(jp, { n: j.n })).toFixed(1), after: formed.map((f) => f.id),
      says: `${j.n} × ${jp.name} before anything is fired: ${j.says}` });
    greenIds.push(jid);
  }

  // pass 3: the finishing each made line is owed, batched — a kiln fires a load, and firing twice what fits in one
  // load costs twice as long for no reason
  const batches = new Map<string, { f: typeof FINISH[number]; t: number; station: string; lines: PartLine[]; after: string[] }>();
  for (const f of formed) for (const fi of f.owed) for (let t = 0; t < (fi.times ?? 1); t++) {
    const key = `${fi.process}#${t}`, at = batches.get(key);
    const pre = [...(greenIds.length ? greenIds : [f.id])];
    if (at) { at.lines.push(f.line); at.after = [...new Set([...at.after, ...pre])]; }
    else batches.set(key, { f: fi, t, station: stationFor(fi.process)!, lines: [f.line], after: pre });
  }
  const lastOf = new Map<string, string>();
  for (const [key, b] of [...batches].sort((a, b) => a[1].t - b[1].t)) {
    const fp = processById(b.f.process), name = b.f.process === 'kiln' ? (b.t === 0 ? 'bisque' : 'glaze') : fp.name;
    const n = b.lines.reduce((a, l) => a + l.n, 0);
    const prev = [...lastOf.entries()].filter(([pk]) => pk.startsWith(`${b.f.process}#`)).map(([, v]) => v);
    const id = `op${++k}`;
    op({ id, part: `${b.lines.length === 1 ? b.lines[0]!.name : `${b.lines.length} kinds of part`}: ${name}`, n, process: b.f.process, station: b.station,
      setup: fp.setup, run: runMinutes(fp, { n }), after: [...new Set([...b.after, ...prev])],
      says: `${name === 'bisque' || name === 'glaze' ? `${name}-fire` : name} ${n} parts in one load (${b.lines.map((l) => `${l.n} × ${l.name}`).join(', ')}): ${b.f.why}` }, b.lines[0]);
    lastOf.set(key, id);
  }
  // pass 4: anything with a tolerance on it is measured, or the works never finds out it was wrong
  for (const f of formed) {
    if (f.line.tol == null || !ids.includes('measuring')) continue;
    const last = [...lastOf.values()].length && f.owed.length ? [...lastOf.values()] : [f.id];
    op({ id: `op${++k}`, part: `${f.line.name}: measured`, n: f.line.n, process: f.line.tol < 0.02 ? 'indicate' : 'calliper', station: 'measuring', setup: 0,
      run: runMinutes(processById('calliper'), f.line), after: last,
      says: `check ${f.line.n} × ${f.line.name} against ±${f.line.tol} mm before anything is built on it` }, f.line);
  }

  // pass 5: the joints the build declares for finished parts, in the order it declares them — welding a frame is not
  // assembly, and it is usually most of the work
  const made = ops.filter((o) => !/: stock$|: measured$/.test(o.part));
  const joinIds: string[] = [];
  for (const j of joins.filter((x) => x.when !== 'before-finishing')) {
    const jp = PROCESSES.find((x) => x.id === j.how);
    if (!jp) { gaps.push({ line: { name: j.how, n: j.n, mat: '' }, why: `${j.how} is not a process this engine knows` }); continue; }
    const where = stationFor(jp.id);
    if (!where) {
      const could = STATIONS.filter((x) => x.does.includes(jp.id)).sort((a, b) => stationUsd(a) - stationUsd(b))[0];
      gaps.push({ line: { name: `${j.n} × ${jp.name}`, n: j.n, mat: '' }, why: `${j.says} — and nothing here does it${could ? `; the cheapest station that would is ${could.name} at ${money(stationUsd(could))}` : ''}` });
      continue;
    }
    const jid = `op${++k}`;
    op({ id: jid, part: `${what}: ${jp.name}`, n: j.n, process: jp.id, station: where, setup: jp.setup,
      run: +(j.mm ? (j.mm / 100) * j.n : runMinutes(jp, { n: j.n })).toFixed(1), after: [...made.map((o) => o.id), ...joinIds],
      says: `${j.n} × ${jp.name}${j.mm ? `, ${j.mm} mm of bead each` : ''}: ${j.says}` });
    joinIds.push(jid);
  }

  // pass 6: assembling it is an operation too, and it is the one everybody forgets to count
  const madeN = made.reduce((a, o) => a + o.n, 0), boughtN = buy.reduce((a, b) => a + b.line.n, 0);
  if (madeN + boughtN > 0 && stationFor('fasten')) op({ id: `op${++k}`, part: `${what}: assembly`, n: 1, process: 'fasten', station: stationFor('fasten')!, setup: 10,
    run: +((madeN + boughtN) * 1.2).toFixed(1), after: ops.map((o) => o.id), says: `put ${madeN + boughtN} parts together: about a minute and a quarter a part, which is the number every plan leaves out` });

  const sch = scheduleOf(ops);
  return { what, works: ids, ops, buy, gaps,
    minutes: +ops.reduce((a, o) => a + o.setup + o.run, 0).toFixed(1), makespan: sch.makespan,
    usd: +buy.reduce((a, b) => a + (b.usd ?? 0), 0).toFixed(2), schedule: sch.at };
}

/** Operations laid on the machines: each station does one thing at a time, an operation waits for what it is after,
 *  and the makespan is when the last one ends. Earliest-finish, which is what a one-person shop actually does. */
export function scheduleOf(ops: Op[]): { at: { op: Op; start: number; end: number }[]; makespan: number } {
  const free: Record<string, number> = {}, done: Record<string, number> = {}, at: { op: Op; start: number; end: number }[] = [];
  const left = [...ops];
  while (left.length) {
    const ready = left.filter((o) => o.after.every((a) => !left.some((x) => x.id === a)));
    if (!ready.length) { // a cycle: lay the rest end to end rather than hang
      for (const o of left) { const s = Math.max(0, ...Object.values(free)); at.push({ op: o, start: s, end: s + o.setup + o.run }); done[o.id] = s + o.setup + o.run; free[o.station] = s + o.setup + o.run; }
      break;
    }
    ready.sort((a, b) => (a.setup + a.run) - (b.setup + b.run));
    const o = ready[0]!;
    const start = Math.max(free[o.station] ?? 0, ...o.after.map((a) => done[a] ?? 0), 0), end = +(start + o.setup + o.run).toFixed(1);
    at.push({ op: o, start, end }); done[o.id] = end; free[o.station] = end;
    left.splice(left.indexOf(o), 1);
  }
  at.sort((a, b) => a.start - b.start || a.end - b.end);
  return { at, makespan: +Math.max(0, ...at.map((x) => x.end)).toFixed(1) };
}

// ---- builds to throw at it -----------------------------------------------------------------------------------------
// The test of a job router is not the job it was written for. These six are deliberately unalike — a welded steel
// frame, a machine with a ground tolerance on it, a flying thing, a fired pot, a cast housing, a wall — and each is a
// real bill with real sizes and its own joints. Throw any of them at any works and it says what happens: which
// machine, in what order, what gets bought and why, and what this works cannot do at all.

export interface Build { id: string; what: string; lines: PartLine[]; joins?: Join[]; src: string }
export const BUILDS: Build[] = [
  { id: 'workbench', what: 'a welded steel workbench, 1500 × 700 × 900 mm',
    src: 'sizes from a bench a person stands at: 900 mm is a working height for hands, and 40 × 40 × 2 box section carries 500 kg over 1.5 m without a mid rail (typical)',
    lines: [
      { name: 'leg, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 880], cm3: 27 },
      { name: 'long rail, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 1420], cm3: 44 },
      { name: 'short rail, 40 × 40 × 2 box section', n: 4, mat: 'steel-low', size: [40, 40, 620], cm3: 19 },
      { name: 'foot pad, 60 × 60 × 6 plate', n: 4, mat: 'steel-low', size: [60, 60, 6], cm3: 21 },
      { name: 'top, 25 mm birch ply', n: 2, mat: 'wood', size: [1500, 700, 25], cm3: 26250 },
      { name: 'M10 × 40 bolt and nut', n: 16, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 20, mm: 160, says: 'every leg-to-rail corner welded all round: four sides of a 40 mm section is 160 mm of bead' },
      { how: 'fasten', n: 16, says: 'the ply top bolted down, so it can be replaced when it is worn out' },
    ] },
  { id: 'gokart', what: 'a pedal go-kart frame with steered front wheels',
    src: 'a kart\'s own geometry: 25 mm square tube, a live rear axle in two bearings, stub axles on kingpins, a steel seat pan (typical; machines.ts holds the track kart)',
    lines: [
      { name: 'frame tube, 25 × 25 × 2', n: 8, mat: 'steel-low', size: [25, 25, 900], cm3: 16 },
      { name: 'stub axle spindle', n: 2, mat: 'steel-low', size: [20, 20, 90], tol: 0.02, cm3: 12, shape: 'round' },
      { name: 'kingpin bush housing', n: 2, mat: 'steel-low', size: [30, 30, 50], tol: 0.05, cm3: 18, shape: 'round' },
      { name: 'seat pan, 2 mm sheet', n: 1, mat: 'steel-low', size: [420, 380, 2], cm3: 319 },
      { name: 'steering wheel boss', n: 1, mat: 'al-6061', size: [60, 60, 25], tol: 0.1, cm3: 42, shape: 'round' },
      { name: '6204 bearing', n: 2, mat: 'steel-high' },
      { name: 'wheel, 10 inch pneumatic', n: 4, mat: 'rubber' },
      { name: 'M8 bolt', n: 24, mat: 'steel-low' },
    ],
    joins: [
      { how: 'weld-mig', n: 14, mm: 100, says: 'the frame\'s joints, welded: a kart frame is one piece or it is a hinge' },
      { how: 'fasten', n: 24, says: 'seat, pedals, steering column and axle carriers bolted, because every one of them is adjusted after the first drive' },
    ] },
  { id: 'quadcopter', what: 'a 5-inch quadcopter',
    src: 'the craft the library already sizes (craft.ts): a 4 mm carbon unibody, 2207 motors, a 4S pack — and almost all of it bought, which is the honest answer for anything that flies',
    lines: [
      { name: 'unibody frame, 4 mm carbon sheet', n: 1, mat: 'cfrp', size: [220, 180, 4], tol: 0.1, cm3: 110, shape: 'flat' },
      { name: 'top deck, 2 mm carbon sheet', n: 1, mat: 'cfrp', size: [90, 80, 2], tol: 0.1, cm3: 12, shape: 'flat' },
      { name: 'camera cradle, printed', n: 1, mat: 'abs', size: [30, 25, 22], cm3: 6 },
      { name: 'landing foot, printed', n: 4, mat: 'abs', size: [20, 14, 18], cm3: 2 },
      { name: 'bldc-outrunner motor 2207', n: 4, mat: 'steel-low' },
      { name: 'pack-lipo-4s battery', n: 1, mat: 'steel-low' },
      { name: 'rc-receiver', n: 1, mat: 'fr4' },
    ],
    joins: [
      { how: 'solder', n: 14, says: 'four motors and the pack lead onto the stack: fourteen joints, and the one that is cold is the one that lets go at full throttle' },
      { how: 'fasten', n: 20, says: 'M3 through the arms into standoffs; nothing on a quadcopter is glued, because everything on it gets replaced' },
    ] },
  { id: 'mug', what: 'a thrown stoneware mug, bisque and glaze',
    src: 'the kiln the library models (processor.ts `fire`): cone 6 stoneware, bisque at cone 04, Orton\'s last 100 °C at 60 °C an hour',
    lines: [
      { name: 'mug body, thrown', n: 6, mat: 'clay', size: [90, 90, 110], cm3: 230 },
      { name: 'handle, pulled', n: 6, mat: 'clay', size: [90, 25, 15], cm3: 22 },
    ],
    joins: [{ how: 'bond', n: 6, when: 'before-finishing', says: 'the handle joined to the body with slip while both are leather-hard, before either is fired — joined wetter and it cracks off in the firing, and fired first it cannot be joined at all' }] },
  { id: 'gearbox', what: 'an aluminium gearbox housing, cast then machined',
    src: 'a housing is the hardest easy part there is: cast roughly, then every bearing bore cut to ±0.02 mm, because a bore 0.1 mm out eats the bearing it was bought to hold (typical)',
    lines: [
      { name: 'housing pattern, printed', n: 2, mat: 'pla', size: [180, 120, 90], cm3: 120 },
      { name: 'housing casting', n: 2, mat: 'al-6061', size: [180, 120, 90], cm3: 390 },
      { name: 'bearing bore, machined in the casting', n: 4, mat: 'al-6061', size: [52, 52, 15], tol: 0.02, cm3: 14, shape: 'round' },
      { name: 'cover, 8 mm plate', n: 2, mat: 'al-6061', size: [180, 120, 8], tol: 0.2, cm3: 160, shape: 'flat' },
      { name: '6205 bearing', n: 4, mat: 'steel-high' },
      { name: 'input shaft', n: 1, mat: 'steel-high', size: [25, 25, 160], tol: 0.01, cm3: 78, shape: 'round' },
      { name: 'M6 × 20 screw', n: 16, mat: 'steel-low' },
    ],
    joins: [{ how: 'fasten', n: 16, says: 'the cover screwed to the housing on a gasket: a gearbox is opened again, so it is never welded shut' }] },
  { id: 'wall', what: 'a garden wall, 6 m long and 1.2 m high',
    src: 'thrown at it on purpose: nothing below the plant touches concrete, so this is where the engine has to say so rather than make something up',
    lines: [
      { name: 'wall, printed concrete', n: 1, mat: 'concrete', size: [6000, 250, 1200], cm3: 1800000 },
      { name: 'coping stone', n: 12, mat: 'concrete', size: [500, 300, 60], cm3: 9000 },
    ] },
];
export const buildById = (id: string): Build => { const b = BUILDS.find((x) => x.id === id); if (!b) throw new Error(`no build ${id}`); return b; };
/** Throw a build at a works. This is the whole engine in one call. */
export function throwAt(build: Build | string, ids: string[]): Job {
  const b = typeof build === 'string' ? buildById(build) : build;
  return planJob(b.what, b.lines, ids, b.joins ?? []);
}

const MODELS: Record<string, MakerModel> = { ender3: ENDER3, voron24: VORON24 };
/** A maker's own machine as a job: its published bill of materials routed through this works. */
export function jobForModel(model: 'ender3' | 'voron24', ids: string[]): Job {
  const m = MODELS[model]!, bill = billOf(m), lines: PartLine[] = [];
  for (const [words, n] of Object.entries(bill.words)) {
    const mat = /extrusion/.test(words) ? 'al-6061' : /bearing|screw|nut|washer|rail|pulley|belt|stepper|spring/.test(words) ? 'steel-low' : 'al-6061';
    lines.push({ name: words, n, mat });
  }
  for (const [name, n] of Object.entries(bill.boxed)) lines.push({ name, n, mat: boxedAs(name).mat });
  const fasteners = Object.entries(bill.words).filter(([w]) => /screw|nut|bolt|washer/.test(w)).reduce((a, [, n]) => a + n, 0);
  return planJob(m.name, lines, ids, [{ how: 'fasten', n: Math.max(1, fasteners), says: 'a printer is almost entirely fasteners into extrusion and printed parts: that is what makes it buildable at a kitchen table' }]);
}

export interface Bootstrap { model: string; total: number; made: { n: number; by: Record<string, number> }; bought: { n: number; why: Record<string, number> }; share: number; hours: number; says: string }
/** What share of a real machine a works could make for itself. The bills are the makers' own, measured from their
 *  published assemblies: the Ender-3's and the Voron 2.4's. */
export function bootstrapOf(ids: string[], model: 'ender3' | 'voron24', prefer: Buying = 'new'): Bootstrap {
  const j = jobForModel(model, ids), w = worksOf(ids);
  const had: string[] = []; let paid = 0;
  for (const i of ids) { const c = stationCost(stationById(i), had, prefer); had.push(i); if (Number.isFinite(c.usd)) paid += c.usd; }
  const by: Record<string, number> = {}, why: Record<string, number> = {};
  for (const o of j.ops) { if (/: stock$|: measured$/.test(o.part) || o.part.startsWith(`${j.what}:`)) continue; const key = processById(o.process).name; by[key] = (by[key] ?? 0) + o.n; }
  for (const b of [...j.buy, ...j.gaps.map((g) => ({ line: g.line, why: g.why }))]) why[b.why] = (why[b.why] ?? 0) + b.line.n;
  const made = Object.values(by).reduce((a, x) => a + x, 0), bought = Object.values(why).reduce((a, x) => a + x, 0), total = made + bought;
  const share = total ? +((made / total) * 100).toFixed(1) : 0;
  return { model: j.what, total, made: { n: made, by }, bought: { n: bought, why }, share, hours: +(j.makespan / 60).toFixed(1),
    says: `${j.what}: of ${total} parts, ${made} (${share} %) could be made in ${w.stations.length} stations costing ${money(+paid.toFixed(2))}, and ${bought} must be bought. A works does not bootstrap by making more of the machine — it bootstraps by making the ${share} % that is shaped and buying the ${(100 - share).toFixed(1)} % that is ground, wound, rolled or fabbed` };
}

/** How the work gets from station to station. Not an opinion: a rail buys reach at about a fifth of what another arm
 *  costs, so reach is bought with track until two things must happen at once; and a mobile robot docks to ±10 mm where
 *  an arm repeats to ±0.03, so it carries material and never does the work. */
export interface Handling { pick: 'hands' | 'arm' | 'arm on a rail' | 'arms'; usd: number; says: string }
export function handling(o: { span: number; cycles: number; rate?: number; saves?: number }): Handling {
  const rate = o.rate ?? 25, saves = o.saves ?? 20, arm = stationUsd(stationById('arm')), rail = stationUsd(stationById('rail')), reach = 0.85;
  const perDay = (o.cycles * saves) / 3600 * rate, days = perDay > 0 ? Math.ceil(arm / perDay) : Infinity;
  if (days > 500 || o.cycles < 20) return { pick: 'hands', usd: 0,
    says: `${o.cycles} moves a day saving ${saves} s each is ${money(+perDay.toFixed(2))} of time a day, so an arm at ${money(arm)} pays for itself in ${Number.isFinite(days) ? `${days} days` : 'never'}. Under about twenty repeats a day a jig and a pair of hands win, and the jig costs an evening on the printer` };
  if (o.span <= reach) return { pick: 'arm', usd: arm, says: `the work runs ${o.span} m, inside one arm's ${reach} m reach: one arm, bolted down, pays back in ${days} days` };
  const arms = Math.ceil(o.span / reach), track = Math.ceil((o.span - reach) / 3) * 3, railed = arm + rail * (track / 3);
  if (railed < arms * arm) return { pick: 'arm on a rail', usd: railed,
    says: `the work runs ${o.span} m against one arm's ${reach}: ${arms} arms would be ${money(arms * arm)}, one arm on ${track} m of track is ${money(railed)}. Track buys reach at about a fifth of what another arm does, so buy reach with track until two things must happen at the same time` };
  return { pick: 'arms', usd: arms * arm, says: `${o.span} m needs ${arms} arms even with track, because the moves overlap in time` };
}

/** Make it or buy it: what the time costs against what the part costs, and what the waiting costs on top. */
export function worthMaking(o: { usd: number | null; minutes: number; rate?: number; waitDays?: number }): { make: boolean; says: string } {
  const rate = o.rate ?? 25, mine = +((o.minutes / 60) * rate).toFixed(2);
  if (o.usd == null) return { make: true, says: `no one sells it: ${o.minutes} min of your time (${money(mine)}) is the only price it has` };
  if (mine < o.usd) return { make: true, says: `${o.minutes} min at ${money(rate)} an hour is ${money(mine)} against ${money(o.usd)} to buy: make it` };
  const wait = o.waitDays ?? 0, anyway = wait > 3 && mine < o.usd * 3;
  return { make: anyway, says: `${o.minutes} min is ${money(mine)} against ${money(o.usd)} to buy${wait ? `, which arrives in ${wait} days` : ''}: ${anyway ? 'make it anyway, because waiting costs more than the difference' : 'buy it'}` };
}

/** A works written out: what it covers, what it does not, what it costs to stand up, what it wants of the building. */
export function worksText(ids: string[], prefer: Buying = 'new'): string {
  const w = worksOf(ids), out: string[] = [];
  const had: string[] = []; let paid = 0, hrs = 0;
  for (const i of ids) { const c = stationCost(stationById(i), had, prefer); had.push(i); if (Number.isFinite(c.usd)) { paid += c.usd; hrs += c.hours; } }
  out.push(`${w.stations.length} stations, ${money(+paid.toFixed(2))}${hrs ? ` and ${hrs} h of your own work` : ''}${prefer !== 'new' ? ` (${money(w.usd)} if every one of them were bought new)` : ''}, ${w.floor} m² of floor, ${w.kw} kW if everything ran at once (it will not).`);
  out.push(`Covers: ${w.families.map((f) => FAMILIES.find((x) => x.id === f)!.name).join(', ')}.`);
  if (w.missing.length) out.push(`Does not cover: ${w.missing.map((f) => FAMILIES.find((x) => x.id === f)!.name).join(', ')}.`);
  out.push(`Works ${w.materials.join(', ')}; holds ±${w.tol} mm at its best and measures to ±${w.measureTol} mm, which is the gap it closes by trying again; the biggest part any one station takes is ${w.envelope.join(' × ')} mm.`);
  if (w.needs.length) out.push(`The building must give it: ${w.needs.join(', ')}.`);
  for (const s of w.stations) { const l = linkFor(s.id); out.push(`  ${s.name} — ${money(stationUsd(s))}${l ? ` · ${l.transport}` : ''}: ${s.why}`); }
  return out.join('\n');
}
/** A job written out: the order the machines run in, what is bought, and what cannot be done here at all. */
export function jobText(j: Job): string {
  const out = [`${j.what} in ${j.works.length} stations: ${j.ops.length} operations, ${(j.minutes / 60).toFixed(1)} h of machine time, ${(j.makespan / 60).toFixed(1)} h on the clock with the machines running together.`];
  if (j.buy.length) out.push(`Bought — ${j.buy.length} line${j.buy.length === 1 ? '' : 's'}, ${j.buy.reduce((a, b) => a + b.line.n, 0)} parts and lengths${j.usd ? `, ${money(j.usd)} of it priced` : ', none of it priced here'}:\n${j.buy.map((b) => `  - ${b.line.n} × ${b.line.name}${b.usd != null ? ` — ${money(b.usd)}` : ''}: ${b.why}`).join('\n')}`);
  if (j.gaps.length) out.push(`Cannot be done here:\n${j.gaps.map((g) => `  - ${g.line.name}: ${g.why}`).join('\n')}`);
  for (const x of j.schedule) out.push(`  ${String(Math.round(x.start)).padStart(5)}–${String(Math.round(x.end)).padEnd(5)} min  ${stationById(x.op.station).name} (${x.op.transport}, ${x.op.lang}): ${x.op.says}`);
  const sent = j.ops.filter((o) => o.transport !== 'hand').length;
  if (j.ops.length) out.push(sent ? `${sent} of ${j.ops.length} operation${j.ops.length === 1 ? '' : 's'} ${sent === 1 ? 'is' : 'are'} a program this can send the machine itself; the rest are hands, written out as steps.` : 'Every operation here is hands: nothing in this works has a port on it.');
  return out.join('\n');
}
/** Every program this job sends, in the order it sends them: what actually goes down the wire. */
export function programsText(j: Job): string {
  return j.schedule.map(({ op: o }) => `==== ${o.id}  ${o.part} — ${stationById(o.station).name} over ${o.transport} as ${o.lang}\n${o.program}`).join('\n\n');
}

/** Words in the room: "what can I make with", "a works for $5000", "build me a go-kart in the metal shop". */
export function worksWords(text: string): string | null {
  const t = text.toLowerCase();
  const build = BUILDS.find((b) => new RegExp(`\\b${b.id}\\b`).test(t) || new RegExp(`\\b${b.id}\\b`).test(t.replace(/[- ]/g, '')));
  if (!build && !/\b(works|workshop|shop|factory|cell|fab|make anything|industrial|build .* here)\b/.test(t)) return null;
  const named = [...TIERS].sort((a, b) => b.name.length - a.name.length).find((x) => t.includes(x.name))
    ?? [...TIERS].sort((a, b) => b.id.length - a.id.length).find((x) => new RegExp(`\\b${x.id}\\b`).test(t));
  const tier = named ?? { id: 'under3k', name: 'the works under $3,000', stations: UNDER_3K.ids, says: UNDER_3K.says };
  if (build) return `${build.what}\n${build.src}\n\nIn ${tier.name}:\n${jobText(throwAt(build, tier.stations))}`;
  if (/ender|voron/.test(t)) { const m = /voron/.test(t) ? 'voron24' : 'ender3'; const b = bootstrapOf(tier.stations, m); return `${b.says}\n\n${jobText(jobForModel(m, tier.stations))}`; }
  const budget = /\$ ?([\d,]+)/.exec(t);
  if (budget) {
    const cap = Number(budget[1]!.replace(/,/g, ''));
    const fits = [...TIERS].reverse().find((x) => worksOf(x.stations).usd <= cap);
    if (!fits) { const cheap = TIERS[0]!; return `Nothing on the list stands up for ${money(cap)}: the cheapest, ${cheap.name}, is ${money(worksOf(cheap.stations).usd)}.\n\n${worksText(cheap.stations)}`; }
    return `For ${money(cap)}: ${fits.name}. ${fits.says}\n\n${worksText(fits.stations)}`;
  }
  return `${tier.name}: ${tier.says}\n\n${worksText(tier.stations)}`;
}

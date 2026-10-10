// The six families of making, and the processes in them.
//
// All making is six families: add, cut, form, join, treat, measure. A works that covers all six over a class of
// material can make anything in that class inside its envelope, which is the criterion the whole package rests on
// and the reason it is checkable. The sixth is the one everyone leaves out and the one that decides whether the
// other five ever improve: without measurement a shop cannot hold a tolerance, cannot find out why a part was
// wrong, and cannot get better. A $30 calliper closes more capability than a $300 machine.
//
// A process also says what it is *for* — only `make` produces a part out of material; prep, finish and join do
// not — and the one shape it can make where it can only make one. Both exist because without them a router picks
// a bandsaw to produce a gearbox housing and a lathe to turn a printed landing foot, and is right by its own
// arithmetic each time.
//
// Owner of: the families, the material classes, what a station must be given, the shapes, the roles, and the
// process table. Who does them is `stations.ts`.

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

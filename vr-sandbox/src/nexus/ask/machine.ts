// Machines invented from the library, the way a program is written from a language rather than copied from a blueprint.
//
// Owner of: what a unit of machine affords, the units themselves, and composing an ask into a machine that is a real
// bill of materials — what it can reach, what it can carry, what it costs, and what it cannot do and why.
//
// src/nexus/ask/invent.ts chains *flows*: a port carries power in one domain and meets a port of the same kind, and
// conservation sizes the chain. This is that same rule one level up, over *motion and structure*: a unit has a base it
// is bolted to and a moving end that carries the next unit, and a stack is sound when every stage carries the mass of
// everything above it. Nothing here is a named machine. A screw axis, a belt axis, a turn axis, a hot end, a spindle,
// a gripper, an eye and a brain are the words; three slides under a hot end spell a 3D printer, three under a spindle
// spell a router, two under a gripper and an eye spell a pick-and-place, and one long slide under a hand spells a
// robot that moves along a wall. The machine is not stored anywhere: it is what the words compose to, and a
// combination nobody has built composes exactly as well as one everybody has, or is refused with the number that
// refuses it.
//
// Every unit is made of parts the component library really draws, named by the words that draw them, so a machine
// invented here is a list you can order and a thing that can be stood in the room. What is bought whole rather than
// composed (a spindle motor, a servo) says so, because pretending to compose a part that is really a purchase is the
// way a bill of materials quietly becomes fiction.

import { component, use } from '../parts/components';
import { massOf } from '../parts/mass';
import { addKit, type Part } from '../parts/kits';
import { cheapest } from '../parts/prices';
import { GT2_PULL_6, GT2_WIDTHS, beltFor, beltPull, gt2Pitch } from '../kinds/motion';
// the reader lives in its own file now (ask/machine-read.ts); re-exported here so every existing door goes on
// meaning what it meant, which is the same reason index.ts and works.ts sit at the root
import { readMachine } from './machine-read';
import { machinePart } from './machine-draw';
export { readMachine, type MachineWant } from './machine-read';

/** What a unit affords: the one thing it adds to whatever is bolted on top of it. */
export type Does = 'slide' | 'turn' | 'grip' | 'deposit' | 'cut' | 'solder' | 'see' | 'think' | 'hold';

/** A unit of machine: an assembly of library parts that gives one affordance, carries what is bolted to its moving end,
 *  and costs what its parts cost. Its figures are worked out from its own parts, never asserted. */
export interface Unit {
  id: string; name: string; does: Does;
  /** the parts it is made of, by the words the component library draws them from, each with the key of the seller's
   *  page that priced it (src/nexus/parts/prices.ts) where one has been found: a part with no key is said to have no
   *  price here rather than given one */
  of: { words: string; n: number; price?: string }[];
  /** parts bought whole rather than drawn, with why: a bill of materials that hides a purchase is fiction */
  bought?: { what: string; n: number; why: string; usd?: number; /** a seller's page that priced it, where one was found */ price?: string; /** what its own listing weighs it at, kg: a bought line with no mass makes a machine that weighs a gram */ kg?: number }[];
  /** how far its moving end goes: mm for a slide or a grip, degrees for a turn, 0 for a unit that does not move */
  range: number;
  /** how much it can hold up on its moving end, kg — what the rail or bearing takes, not what the motor can raise */
  carries: number;
  /** how much it can *raise*, kg — what the drive makes against gravity. A horizontal axis never asks this, which is
   *  why a Z axis and an X axis of the same parts are not the same machine */
  lifts: number;
  /** why no part in the library can be this unit, where that is so: a unit that cannot be built says it HERE, with
   *  the number that refuses it, rather than composing anyway and publishing a figure its parts would not survive */
  cannot?: string;
  /** how fast its moving end goes, mm/s or °/s */ speed: number;
  /** what limits `carries`, named, so a refusal can say what to change */ limit: string;
  /** its own box, mm, and how far its base must be from what it moves over */ box: [number, number, number];
  says: string; src: string;
}

const NEMA17 = 'stepper nema17 40';
/** A NEMA 17 of that length holds about this, N·m (its own catalogue figure, the 40 mm 1.5 A body). */
const NEMA17_NM = 0.42;
/** What a lead screw keeps: a bronze or brass nut on a T8 at its usual lead runs about 0.35–0.45 (an estimate of the
 *  class; it is friction, and it is why a screw axis is slow and strong and a belt axis is fast and weak). */
const SCREW_KEEPS = 0.4;
/** A GT2 20-tooth pulley's pitch radius, m: 20 teeth at 2 mm pitch over 2π. */
const GT2_20_R = (20 * 0.002) / (2 * Math.PI);

/** A length of 2040 extrusion as the beam of an axis of this travel: the travel plus what the carriage, the nut block
 *  and the motor's end take. */
const beamFor = (travel: number): number => Math.round((travel + 170) / 50) * 50;
/** The MGN12 rail under it: its own length, 40 mm inside each end of the beam. */
const railFor = (travel: number): number => Math.round((travel + 90) / 50) * 50;

/** A screw axis of any travel: a rail and its carriage along an extrusion, driven by a T8 lead screw off a NEMA 17.
 *  It is slow and strong, so it is what a Z axis and anything that lifts is made of. */
export function screwAxis(travel: number, lead = 8): Unit {
  // what the drive makes at the nut: a screw turns torque into force as 2π T η / lead
  const newtons = (2 * Math.PI * NEMA17_NM * SCREW_KEEPS) / (lead / 1000);
  return {
    id: `screw-axis-${travel}`, name: `a ${travel} mm screw axis`, does: 'slide', range: travel,
    of: [{ words: `extrusion 2040 ${beamFor(travel)}`, n: 1 }, { words: `rail MGN12H ${railFor(travel)}`, n: 1, price: 'rail-mgn12h-400' },
      { words: NEMA17, n: 1, price: 'nema17' }, { words: 'motorplate nema17 t4 aluminium', n: 1 }, { words: 'bearing 625', n: 2, price: 'bearing-625' },
      { words: 'slotnut slot6 M5 hammer', n: 8 }, { words: 'bolt M5x12', n: 8 }],
    bought: [{ what: `a T8 × ${lead} mm lead screw, ${beamFor(travel)} mm, with its brass nut`, n: 1, why: 'a rolled thread: no station here rolls one, and a cut one would be slower and worse', usd: 12, kg: 0.21 },
      { what: 'a flexible shaft coupling, 5 to 8 mm', n: 1, why: 'a slit aluminium coupling is machined from one piece on a mill with a slitting saw — buy it', price: 'coupling-flex', kg: 0.02 }],
    carries: 25, lifts: +(newtons / 9.80665).toFixed(1), speed: +((300 / 60) * lead).toFixed(0),
    limit: 'the MGN12 carriage\'s moment rating with the load held out from the rail, taken as 25 kg at 100 mm (an estimate; HIWIN rate the carriage, not the bracket you bolt to it)',
    box: [beamFor(travel), 90, 60],
    says: `a carriage on a MGN12 rail along a 2040 beam, driven by a T8 × ${lead} lead screw off a NEMA 17: ${(newtons).toFixed(0)} N at the nut, so it raises ${(newtons / 9.80665).toFixed(1)} kg and runs at ${((300 / 60) * lead).toFixed(0)} mm/s`,
    src: 'the screw\'s force from 2π T η / lead with the NEMA 17\'s own 0.42 N·m and a screw efficiency of 0.4 (an estimate of a brass nut on a T8); its speed at 300 rpm, which a cheap driver holds without losing steps',
  };
}

/** A belt axis of any travel: the same rail and beam, driven by a GT2 belt off a 20-tooth pulley. It is fast and weak,
 *  so it is what the axes that only carry a tool sideways are made of. */
export function beltAxis(travel: number): Unit {
  const newtons = NEMA17_NM / GT2_20_R;
  return {
    id: `belt-axis-${travel}`, name: `a ${travel} mm belt axis`, does: 'slide', range: travel,
    of: [{ words: `extrusion 2040 ${beamFor(travel)}`, n: 1 }, { words: `rail MGN12H ${railFor(travel)}`, n: 1, price: 'rail-mgn12h-400' },
      { words: NEMA17, n: 1, price: 'nema17' }, { words: 'motorplate nema17 t4 aluminium', n: 1 }, { words: 'pulley GT2 20 5', n: 1, price: 'pulley-gt2-20t-5' },
      { words: 'idler bore5 smooth w6', n: 2 }, { words: `belt GT2 6 ${2 * travel + 400}`, n: 1, price: 'gt2-belt' },
      { words: 'slotnut slot6 M5 hammer', n: 8 }, { words: 'bolt M5x12', n: 8 }],
    carries: 25, lifts: +(newtons / 9.80665).toFixed(1), speed: 300,
    limit: 'the MGN12 carriage\'s moment rating, as the screw axis (an estimate at 100 mm out)',
    box: [beamFor(travel), 90, 60],
    says: `a carriage on a MGN12 rail along a 2040 beam, pulled by a GT2 belt off a 20-tooth pulley: ${newtons.toFixed(0)} N at the belt, so it raises only ${(newtons / 9.80665).toFixed(1)} kg but runs at 300 mm/s`,
    src: 'the belt\'s force from the NEMA 17\'s 0.42 N·m over a 20-tooth GT2 pulley\'s 6.37 mm pitch radius; 300 mm/s is what a 2 mm pitch belt runs at on a cheap driver',
  };
}

/** A turn axis: a NEMA 17 geared down 3:1 by GT2, turning in two bearings. What a wrist, a turntable, a spindle of a
 *  potter's wheel and the shoulder of a light arm are all made of. */
/** One GT2 belt stage cannot reduce more than the pulley family makes. Its smallest sensible driver is 20 teeth and
 *  its largest wheel is 80, so **4:1 is a real ceiling**, not a table's opinion. This unit used to order a wheel of
 *  `20 × ratio` teeth - 1000 of them at 50:1 - and the family drew every one of those as its 20-tooth default, so a
 *  50:1 shoulder was a 1:1 shoulder and every torque figure resting on it was fiction. (The pulley's own silent
 *  default is fixed in `parts/families.ts`; this is the fault that was hiding behind it, and the two had to be
 *  fixed together or the arm would now order a part that is refused.) A ratio is staged now, each stage a real pair,
 *  and what the stages actually deliver is reported rather than what was asked for. */
const BELT_DRIVER_T = 20, BELT_MAX_T = 80, BELT_STAGE_MAX = BELT_MAX_T / BELT_DRIVER_T, BELT_STAGES_MAX = 3;

/** The belt stages a ratio really needs, or null where a belt is simply the wrong machine for it. */
export function beltStages(ratio: number): { driver: number; driven: number }[] | null {
  if (!(ratio > 1)) return [];
  const n = Math.ceil(Math.log(ratio) / Math.log(BELT_STAGE_MAX));
  if (n > BELT_STAGES_MAX) return null;
  const per = ratio ** (1 / n), driven = Math.min(BELT_MAX_T, Math.max(BELT_DRIVER_T + 1, Math.round(BELT_DRIVER_T * per)));
  return Array.from({ length: n }, () => ({ driver: BELT_DRIVER_T, driven }));
}

export function turnAxis(ratio = 3): Unit {
  const stages = beltStages(ratio) ?? [];
  const real = stages.reduce((a, s) => a * (s.driven / s.driver), 1);      // what the pulleys on it actually give
  const nm = NEMA17_NM * real * 0.95 ** Math.max(1, stages.length);       // 5 % a stage, not 5 % whatever the ratio
  const degS = +((360 / (real || 1)) * (300 / 60)).toFixed(0);
  const said = stages.length > 1 ? `${real.toFixed(2)}:1 in ${stages.length} belt stages` : `${real.toFixed(2)}:1`;

  // THE BELT IS THE CEILING, NOT THE TOOTH COUNT. Staging capped the ratio a pair of pulleys can give and moved the
  // fiction into the belt: a 50:1 axis published 18.24 N·m on a 74-tooth output, which is 774 N in a belt that BREAKS
  // near 550 N and is rated to work at 27. Nothing could notice, because the belt family carried no force at all.
  // The tension in a stage is set by the SMALL pulley it drives off — the same belt force acts on both wheels, and the
  // driver's radius is the short lever — so each stage is sized by the torque going INTO it, not by the torque coming
  // out of the whole train. That is why a second stage is far harsher than the first, and why the answer to "not
  // enough" is a wider belt before it is another stage.
  const rDriver = gt2Pitch(BELT_DRIVER_T) / 2 / 1000;                      // m
  const perStage = stages.map((st, i) => {
    const into = NEMA17_NM * stages.slice(0, i).reduce((a, x) => a * (x.driven / x.driver), 1) * 0.95 ** i;
    const pull = into / rDriver;                                           // N in this stage's belt
    return { st, into, pull, width: beltFor(pull) };
  });
  const top = GT2_WIDTHS[GT2_WIDTHS.length - 1]!;
  const widest = perStage.reduce((a, x) => Math.max(a, x.width ?? top), 6);
  const beaten = perStage.filter((x) => x.width === null);
  const cannot = beaten.length
    ? `this reduction cannot be made of GT2 belt: stage${beaten.length === 1 ? '' : 's'} ${beaten.map((x) => perStage.indexOf(x) + 1).join(', ')} want${beaten.length === 1 ? 's' : ''} ${beaten.map((x) => `${x.pull.toFixed(0)} N`).join(', ')} in the belt, and the widest GT2 this library makes (${top} mm) may work at ${beltPull(top)} N. A belt drive is the wrong part here: a worm set does this in ONE pair and is already in the library (kinds/motion.ts, the wormset family - "wormset m2 50:1 bronze" is a real line), so the honest answer is to order that instead of stacking belts. It is not composed in here yet, and that is the next round rather than a reason to publish a torque anyway`
    : undefined;

  // The bearings and the shafts follow the STAGE COUNT. Two bearings were ordered whatever the stage count, so a
  // three-stage reduction — which has two intermediate shafts, each wanting a pair — was ordered one pair and no
  // shafts at all: 0.578 kg and $23.39 for a 50:1 gearbox, a figure made by leaving parts out.
  const inter = Math.max(0, stages.length - 1);
  // The box follows the real centre distance, not a constant. A 400 mm loop over a 20T and a 74T pulley puts the shaft
  // centres about 155 mm apart, and the box said 120 mm whatever the stage count — and that box is what `machineParts`
  // places by and what the works routes against, so it is not cosmetic. C = (L − π(d₁+d₂)/2)/2, the usual
  // approximation for two wheels of a similar size.
  const beltMm = 400;
  const centre = stages.length ? Math.max(40, (beltMm - (Math.PI * (gt2Pitch(BELT_DRIVER_T) + gt2Pitch(stages[0]!.driven))) / 2) / 2) : 0;
  const span = Math.round(centre * stages.length + gt2Pitch(stages[0]?.driven ?? BELT_DRIVER_T) + 40);
  const across = Math.round(gt2Pitch(stages[0]?.driven ?? BELT_DRIVER_T) + 46);

  return {
    id: `turn-axis-${ratio}`, name: `a turn axis geared ${said}`, does: 'turn', range: 360,
    of: [{ words: NEMA17, n: 1, price: 'nema17' }, { words: 'motorplate nema17 t4 aluminium', n: 1 },
      { words: 'bearing 6805', n: 2 + 2 * inter },
      { words: `pulley GT2 ${BELT_DRIVER_T} 5`, n: stages.length || 1, price: 'pulley-gt2-20t-5' },
      ...(stages.length ? [{ words: `pulley GT2 ${stages[0]!.driven} 8`, n: stages.length }] : []),
      { words: `belt GT2 ${beltMm} ${widest}mm`, n: stages.length || 1, price: 'gt2-belt' },
      { words: 'bolt M5x12', n: 8 }],
    carries: 40, lifts: 0, speed: degS,
    limit: cannot ? 'the belt, pulled past what any GT2 width in this library may take' : `the ${widest} mm GT2 belt, pulled ${Math.max(...perStage.map((x) => x.pull), 0).toFixed(0)} N at its hardest stage against the ${beltPull(widest)} N it may work at`,
    box: [across, 90, span],
    ...(cannot ? { cannot } : {}),
    says: `a NEMA 17 geared ${said} by ${widest} mm GT2 into ${1 + inter} pair${inter ? 's' : ''} of 6805 bearings: ${cannot ? 'NO TORQUE IS PUBLISHED, because it cannot be built of these parts' : `${nm.toFixed(2)} N·m at the output`}, turning at ${degS}°/s`,
    src: `the output torque from the NEMA 17's 0.42 N·m times what the pulley pairs really give (${stages.map((x) => `${x.driven}/${x.driver}`).join(' × ') || '1'}), less 5 % a stage (an estimate). Each stage's belt is sized by the force at its DRIVER pulley, T/r with r = ${(rDriver * 1000).toFixed(2)} mm: ${perStage.map((x, i) => `stage ${i + 1} ${x.pull.toFixed(0)} N`).join(', ') || 'none'}, against a GT2's ${GT2_PULL_6} N a 6 mm (a seller's own figure, 2026-10-13) scaled by width (an estimate). Shaft centres about ${centre.toFixed(0)} mm apart, from the ${beltMm} mm loop`,
  };
}

/** A hot end on its extruder: what makes a slide stack deposit plastic. Every part of it is in the library, because the
 *  Ender-3's own hot end is drawn there. */
export const HOT_END: Unit = {
  id: 'hot-end', name: 'a hot end and its extruder', does: 'deposit', range: 0,
  of: [{ words: 'heatblock mk8', n: 1, price: 'hotend' }, { words: 'heatbreak L26 ptfe', n: 1 }, { words: 'hotendsink ender3', n: 1 },
    { words: 'printnozzle MK8 d0.4 brass', n: 1 }, { words: 'heater 6x20 24V 40W', n: 1, price: 'heater-cartridge' }, { words: 'thermistor ntc100k glass', n: 1, price: 'thermistor-ntc' },
    { words: 'fan 40x10 24V', n: 1 }, { words: 'bowden od4 id2 L500', n: 1 }, { words: 'drivegear mk8', n: 1, price: 'extruder' }, { words: NEMA17, n: 1, price: 'nema17' }],
  carries: 0, lifts: 0, speed: 0, limit: 'nothing stands on it: it is the tool at the top of the stack',
  box: [60, 110, 50],
  says: 'an MK8 block with a 0.4 mm brass nozzle, a PTFE-lined break into a finned sink with its fan, a 40 W cartridge and a 100 k thermistor, fed down a Bowden tube by an MK8 gear on a NEMA 17',
  src: 'the Ender-3\'s own hot end, part for part, as the library draws it from Creality\'s published assembly',
};

/** A spindle: what makes a slide stack cut. Bought whole, and it says so — a brushless spindle with its collet and
 *  bearings is not something a cheap works makes, and a bill of materials that pretends otherwise is fiction. */
export const SPINDLE: Unit = {
  id: 'spindle', name: 'a 500 W spindle', does: 'cut', range: 0,
  of: [{ words: 'bolt M5x12', n: 4 }],
  bought: [{ what: 'a 500 W 52 mm brushless spindle with an ER11 collet and its speed controller', n: 1, why: 'a ground spindle shaft running in matched angular-contact bearings in a bored housing: the works holds ±0.05 mm and this wants ±0.005', usd: 90, kg: 1.0 },
    { what: 'a 52 mm spindle clamp', n: 1, why: 'bored and split in one setup on a mill: buy it with the spindle', usd: 12, kg: 0.2 }],
  carries: 0, lifts: 0, speed: 12000, limit: 'nothing stands on it: it is the tool at the top of the stack',
  box: [70, 210, 70],
  says: 'a 500 W brushless spindle in a 52 mm clamp with an ER11 collet, 12,000 rpm',
  src: 'the common 500 W 52 mm air-cooled spindle sold for benchtop routers (an estimate of the class; sellers\' listings vary)',
};

/** A gripper: two printed fingers off one servo. What makes a stack pick things up — and what makes a long slide and a
 *  turn axis into the thing the user named: a hand that moves along a rail. */
export const GRIPPER: Unit = {
  id: 'gripper', name: 'a printed two-finger gripper', does: 'grip', range: 60,
  of: [{ words: 'bearing 625', n: 2, price: 'bearing-625' }, { words: 'dowel 3x20', n: 4 }, { words: 'screw M3x16', n: 6 }],
  bought: [{ what: 'an MG996R metal-gear servo, 11 kg·cm at 6 V', n: 1, why: 'a wound motor, a moulded gear train and a potentiometer in one case: four processes this works does not have', usd: 6, kg: 0.055 },
    { what: 'its fingers and body, printed here', n: 1, why: 'printed on the works\' own FFF printer: this is the line that makes the gripper cheap', usd: 2, kg: 0.04 }],
  carries: 0, lifts: 1.5, speed: 60, limit: 'the servo\'s 11 kg·cm over a 35 mm finger, less the grip it must keep: about 1.5 kg of a hard, square thing',
  box: [90, 120, 60],
  says: 'two printed fingers on 3 mm dowels in 625 bearings, closed by an MG996R servo: 60 mm open, about 1.5 kg held',
  src: 'the servo\'s 11 kg·cm is its own listing; the grip is that torque over a 35 mm finger with half of it kept against slip (an estimate)',
};

/** A soldering head: the Pinecil the library already draws, held on the moving end, with the reel fed by its own
 *  stepper. This is the unit that exists because the works' own robot asked for it — `works/tend.ts` costed the
 *  soldering it could not do, and the answer was not to buy a hand but to compose one out of what is already drawn. */
export const SOLDER_HEAD: Unit = {
  id: 'solder-head', name: 'a soldering head', does: 'solder', range: 0,
  of: [{ words: 'solderiron pinecil-v2', n: 1, price: 'soldering-iron' }, { words: 'solderreel ts-635050', n: 1, price: 'solder-leaded' },
    { words: NEMA17, n: 1, price: 'nema17' }, { words: 'drivegear mk8', n: 1, price: 'extruder' },
    { words: 'bowden od4 id2 L500', n: 1 }, { words: 'motorplate nema17 t4 aluminium', n: 1 }, { words: 'bolt M5x12', n: 4 }],
  bought: [{ what: 'a 20 V USB-C PD supply for the iron', n: 1, why: 'a potted switcher with a USB-C PD controller in it', price: 'usbc-pd-65w', kg: 0.12 },
    { what: 'a printed cradle that holds the iron at 50° to the work', n: 1, why: 'printed on the works\' own FFF printer, which is the line that makes this head cost $50 instead of $500', usd: 2, kg: 0.03 }],
  carries: 0, lifts: 0, speed: 0,
  limit: 'nothing stands on it: it is a tool at the top of the stack. What limits it is the iron — 400 °C and 64 W at 20 V, which is a through-hole joint in about a second and nothing like a ground plane',
  box: [60, 180, 50],
  says: 'a Pinecil V2 in a printed cradle on the moving end, its 0.5 mm 63/37 fed from its own reel by an MK8 gear on a NEMA 17 down a PTFE tube — the same drive an extruder is, because feeding solder wire and feeding filament are the same problem',
  src: 'the iron, the reel, the gear and the tube are the library\'s own (src/nexus/machines/kit-solder.ts); that solder feeds like filament is this file\'s own reading, and the joint model it would work to is src/nexus/teach/solder-joint.ts',
};

/** An eye: the Camera Module 3, which the library already draws, on whatever moves. */
export const EYE: Unit = {
  id: 'eye', name: 'a camera on the moving end', does: 'see', range: 0,
  of: [{ words: 'screw M2x6', n: 4 }],
  bought: [{ what: 'a Raspberry Pi Camera Module 3 and its ribbon', n: 1, why: 'a wafer-fabbed sensor behind a moulded lens stack: nothing here makes either', usd: 25, kg: 0.004 }],
  carries: 0, lifts: 0, speed: 0, limit: 'nothing stands on it',
  box: [25, 12, 24], says: 'a Camera Module 3 looking down from the moving end, as the library draws it',
  src: 'Raspberry Pi\'s own figures for the Camera Module 3 (src/nexus/machines/robot.ts has what it can resolve at a distance)',
};

/** A brain: the board that runs it and the bridge that carries a program to it over Bluetooth, which is the wire out
 *  the user asked for (src/nexus/machines/link.ts). */
export const BRAIN: Unit = {
  id: 'brain', name: 'the board, its drivers and the Bluetooth bridge', does: 'think', range: 0,
  of: [{ words: 'xiao esp32c3', n: 1, price: 'xiao-esp32c3' }],
  bought: [{ what: 'a 32-bit control board with four stepper drivers', n: 1, why: 'a populated board: the works solders but does not fab', price: 'printer-board', kg: 0.08 },
    { what: 'a 24 V 350 W supply', n: 1, why: 'a wound transformer and a potted switcher', price: 'psu-24v', kg: 0.6 }],
  carries: 0, lifts: 0, speed: 0, limit: 'it sits on the frame, not on the stack',
  box: [110, 40, 85], says: 'a 32-bit board with its drivers on a 24 V supply, and a XIAO ESP32C3 bridging UART to the Nordic UART service so a browser can drive it',
  src: 'the bridge is src/nexus/machines/link.ts\'s own: $4.99, Seeed\'s price, with its sketch and its wiring steps',
};

/** The frame everything is bolted to: 2040 extrusion cut to the machine's own envelope, with its corner brackets. */
export function baseFrame(w: number, d: number, h: number): Unit {
  const len = 2 * (w + d + h);
  return {
    id: 'frame', name: `a ${w} × ${d} × ${h} mm frame`, does: 'hold', range: 0,
    of: [{ words: `extrusion 2040 ${Math.round(w / 50) * 50}`, n: 4 }, { words: `extrusion 2040 ${Math.round(d / 50) * 50}`, n: 4 },
      { words: `extrusion 2040 ${Math.round(h / 50) * 50}`, n: 4 }, { words: 'slotnut slot6 M5 hammer', n: 48 }, { words: 'bolt M5x12', n: 48 }],
    carries: 200, lifts: 0, speed: 0, limit: 'a 2040 cube of this size on its corner brackets, taken at 200 kg (an estimate: it is far stiffer than anything stacked on it here)',
    box: [w, h, d], says: `${(len / 1000).toFixed(1)} m of 2040 extrusion in twelve lengths on corner brackets`,
    src: 'the extrusion\'s own section from the library; its stiffness not worked out, because nothing composed here comes near it',
  };
}

// ---- composing ----------------------------------------------------------------------------------------------------

/** One unit in a stack, with what it has to carry because of what is above it. */
export interface Mounted {
  unit: Unit; /** kg standing on its moving end, or — on an arm's joint — the N·m it has to hold */ carrying: number;
  /** what `carrying` is in: a stack is checked in kg and a joint in N·m, and printing one as the other is a lie */
  inUnit?: 'kg' | 'N·m';
  /** what is above it, by name */ above: string[];
  ok: boolean; why?: string;
}
/** A machine composed from units: what it is, what it reaches, what it costs, and what it cannot do. */
export interface Machine {
  asked: string; name: string; stages: Mounted[];
  /** how it is put together, which the words also say */ arrange: Arrangement;
  /** for an arm: the moment each joint has to hold straight out, against what it can be geared to */
  joints?: { at: string; needs: number; holds: number; ratio: number }[];
  /** its envelope: how far it moves in each of the three ways it slides, mm */ reach: number[];
  /** its mass, kg — or **null** where a part is not drawn, exactly as `usd` is null when a part is not priced: a
   *  machine whose bill is short has no mass to report, and 0 is not that (docs/MANNY.md #57) */ kg: number | null; holding: number; usd: number | null;
  /** lines with no price here, said rather than guessed */ unpriced: string[];
  /** what it affords, in the order the stack gives them */ does: Does[];
  /** what it will not do, each with the number that refuses it */ refusals: string[];
  /** parts the library does not draw by those words: a gap, never a stand-in */ gaps: string[];
  /** what the words said that nothing here consumed - the computed difference between the quantities in the ask and
   *  the quantities a part was sized by. Never a remembered list: a number dropped in silence puts itself here. */
  notDone: string[];
}

/** What a unit weighs: the sum of its drawn parts, kg. Parts bought whole are weighed where a price page gives one and
 *  otherwise left out of the sum and said — a mass that quietly invents the heavy half of a machine is worse than none. */
/** Every unit the library affords, at one representative size each, so that one list is the only list. `npm run
 *  machine -- units` printed its own copy of this and the gate had no way to check any of them; a unit added to one
 *  and not the other is the two-owners fault with nothing to catch it. */
export function everyUnit(): Unit[] {
  return [baseFrame(500, 500, 650), screwAxis(300), beltAxis(300), ...RATIOS.map((r) => turnAxis(r)), HOT_END, SPINDLE, GRIPPER, EYE, BRAIN];
}

export function unitKg(u: Unit): { kg: number; gaps: string[] } {
  let kg = 0; const gaps: string[] = [];
  for (const { words, n } of u.of) {
    const c = component(words);
    if (typeof c === 'string') { gaps.push(`${words}: ${c}`); continue; }
    kg += massOf(c.part) * n;
  }
  for (const b of u.bought ?? []) {
    if (b.kg == null) { gaps.push(`${b.what}: bought whole and its listing gives no weight, so it is not in this unit's ${kg.toFixed(2)} kg`); continue; }
    kg += b.kg * b.n;
  }
  return { kg: +kg.toFixed(3), gaps };
}

/** What a unit costs: each drawn part at its cheapest real offer, each bought line at what its listing said. */
export function unitUsd(u: Unit): { usd: number; unpriced: string[] } {
  let usd = 0; const unpriced: string[] = [];
  for (const { words, n, price } of u.of) {
    const got = price ? cheapest(price, n) : null;
    if (got) usd += got.usd; else unpriced.push(`${n} × ${words}`);
  }
  for (const b of u.bought ?? []) {
    const got = b.price ? cheapest(b.price, b.n) : null;
    if (got) usd += got.usd; else if (b.usd != null) usd += b.usd * b.n; else unpriced.push(`${b.n} × ${b.what}`);
  }
  return { usd: +usd.toFixed(2), unpriced };
}

/** Stack a machine: the frame at the bottom, the axes one on the next, and the tools bolted *side by side* to the
 *  moving end of the topmost axis. Two things here were faults in the first run of this file, and both are the kind a
 *  bill of materials hides: tools were stacked on each other, so a camera beside a gripper was asked to hold the
 *  gripper's load; and a payload was added to every stage alike, so the camera was carrying the 2 kg the gripper was
 *  holding. A payload hangs from whatever grips it, is checked against that grip, and is then carried by everything
 *  below it and by nothing above. */
/** Why a unit cannot be built at the size it was given, or null. Below the shortest length of stock the library will
 *  cut, so nothing orderable is refused. There are two stacking paths in this file — a frame with axes, and an arm of
 *  joints and links — and this is one rule called by both, because the fault it catches was that only one of them
 *  asked anything at all and the other pushed its links with `ok: true` unconditionally. */
const LEAST_MM = 10;
export function tooSmall(unit: Unit): string | null {
  const thin = unit.box.findIndex((d) => !(d >= LEAST_MM));
  return thin < 0 ? null
    : `it is ${unit.box[thin]} mm across its ${'xyz'[thin]} axis, and nothing is made at no size: the ask gave it no span to be built at, so this is a refusal and not a small machine`;
}

export function stack(frameUnit: Unit, axes: Unit[], tools: Unit[], payloadKg = 0): { stages: Mounted[]; kg: number; holding: number; refusals: string[]; gaps: string[] } {
  const refusals: string[] = [], gaps: string[] = [];
  const weigh = (u: Unit) => { const r = unitKg(u); gaps.push(...r.gaps); return r.kg; };
  const frameKg = weigh(frameUnit), axisKg = axes.map(weigh), toolKg = tools.map(weigh);
  const toolsKg = toolKg.reduce((a, b) => a + b, 0);
  const stages: Mounted[] = [];
  // A machine's mass is the machine. What it is holding is a *load*, not a part of it, and adding the two gave a
  // 1.39 kg arm holding a 3 kg brick a stated mass of 4.39 kg - which the forge then attributed to its 55 g servo.
  // Every stage still carries the payload, because that is what a stage has to hold up; only the total differs.
  const own = frameKg + axisKg.reduce((a, b) => a + b, 0) + toolsKg;
  const all = own + payloadKg;                 // the frame: everything stands on it, the load included
  // NOTHING MAY BE BUILT AT NO SIZE. A six-axis arm asked with "0.1 mm repeatability, 700 mm reach" read the
  // repeatability as the reach and composed two joints with two 0 mm links between them, ordered `extrusion 2020 0`,
  // reported "holds" at every stage because a zero load is held by anything, and priced the result $117.83. Every
  // check in this file asks whether a unit holds what is above it; not one asked whether the unit EXISTS. A span of
  // zero is not a small machine, it is a refusal, and it is caught here rather than in whatever read the words,
  // because the reading can be wrong in ways nobody has thought of yet and a part of no length is wrong always
  // (docs/MANNY.md #59).
  const push = (unit: Unit, carrying: number, above: string[]) => {
    const no = tooSmall(unit);
    if (no) { refusals.push(`${unit.name}: ${no}`); stages.push({ unit: { ...unit, cannot: no }, carrying: +carrying.toFixed(3), above, ok: false, why: no }); return; }
    const holds = unit.does === 'hold' || unit.carries >= carrying;
    const s: Mounted = { unit, carrying: +carrying.toFixed(3), above, ok: holds };
    if (!holds) { s.why = `it holds ${unit.carries} kg and ${carrying.toFixed(2)} kg stands on it (${unit.limit})`; refusals.push(`${unit.name}: ${s.why}`); }
    stages.push(s);
  };
  push(frameUnit, all - frameKg, [...axes, ...tools].map((u) => u.name));
  // each axis carries the axes above it, every tool, and whatever is being held
  for (let i = 0; i < axes.length; i++) {
    const aboveKg = axisKg.slice(i + 1).reduce((a, b) => a + b, 0) + toolsKg + payloadKg;
    push(axes[i]!, aboveKg, [...axes.slice(i + 1), ...tools].map((u) => u.name));
  }
  // a tool holds only what it is for: a gripper its grip, everything else nothing
  for (let i = 0; i < tools.length; i++) {
    const u = tools[i]!;
    if (u.does === 'grip' && payloadKg > 0) {
      const ok = u.lifts >= payloadKg;
      const s: Mounted = { unit: u, carrying: payloadKg, above: ['what it is holding'], ok };
      if (!ok) { s.why = `it grips ${u.lifts} kg and was asked to hold ${payloadKg} kg (${u.limit})`; refusals.push(`${u.name}: ${s.why}`); }
      stages.push(s);
    } else push(u, 0, []);
  }
  return { stages, kg: +own.toFixed(2), holding: +payloadKg.toFixed(2), refusals, gaps };
}

/** Which way a slide in a stack of this many runs: the last slide is up, the rest across. A stack's vertical axis is
 *  the one that has to *raise* what is above it, which is a different number from holding it. */
function liftCheck(stages: Mounted[]): string[] {
  const slides = stages.filter((s) => s.unit.does === 'slide');
  const up = slides[slides.length - 1]; if (!up) return [];
  return up.unit.lifts >= up.carrying ? []
    : [`${up.unit.name} raises ${up.unit.lifts} kg and would have to raise ${up.carrying.toFixed(2)} kg: give it a finer lead (a T8 × 2 raises four times as much at a quarter the speed) or a second motor`];
}

/** Compose an ask into a machine: the tool its words call for, the slides that carry it over the size asked, the frame
 *  under them and the brain beside them — then every stage checked against what stands on it. */
export function composeMachine(words: string): Machine {
  const want = readMachine(words);
  const [x, y, z] = want.mm;
  const tools: Unit[] = [];
  if (want.does.includes('deposit')) tools.push(HOT_END);
  if (want.does.includes('cut')) tools.push(SPINDLE);
  if (want.does.includes('solder')) tools.push(SOLDER_HEAD);
  if (want.does.includes('grip')) tools.push(GRIPPER);
  if (want.does.includes('see')) tools.push(EYE);
  if (want.does.includes('turn') && want.arrange !== 'arm' && want.arrange !== 'table') tools.push(turnAxis(3));
  // a cut takes force sideways, so its across axes are screws too; a tool that only has to be put somewhere gets
  // belts, which are five times as fast for the same motor
  const fast = !want.does.includes('cut');
  const slide = (mm: number) => (fast ? beltAxis(mm) : screwAxis(mm));

  let st: { stages: Mounted[]; kg: number; holding: number; refusals: string[]; gaps: string[] };
  let units: Unit[];
  let joints: Machine['joints'];
  if (want.arrange === 'arm') {
    // reach is the first number, and an arm's check is the moment at each joint, not the mass on a rail
    const a = armStack(x, tools, want.payload);
    st = a; joints = a.joints;
    units = [...a.stages.map((s) => s.unit), BRAIN];
  } else if (want.arrange === 'rail') {
    // one long slide bracketed to the wall, with a turn axis and the tool riding it: the rail *is* the mobility
    const mount = railMount(x), travel = slide(x), wrist = turnAxis(5);
    st = stack(mount, [travel], [wrist, ...tools], want.payload);
    units = [mount, travel, wrist, ...tools, BRAIN];
  } else if (want.arrange === 'table') {
    // the work turns under a tool brought in on one slide: a lathe, a wheel, a turntable
    const table = turnAxis(10), inFeed = screwAxis(y);
    st = stack(baseFrame(x + 200, y + 200, z + 200), [inFeed], tools, want.payload);
    st.stages.unshift({ unit: table, carrying: want.payload, above: ['the work on it'], ok: table.carries >= want.payload });
    units = [table, inFeed, ...tools, BRAIN];
  } else {
    const fr = baseFrame(x + 200, y + 200, z + 350);
    const axes = [slide(x), slide(y), screwAxis(z)];
    st = stack(fr, axes, tools, want.payload);
    units = [fr, ...axes, ...tools, BRAIN];
  }
  const money = units.map((u) => unitUsd(u));
  const usd = +money.reduce((a, b) => a + b.usd, 0).toFixed(2);
  const refusals = [...st.refusals, ...(want.arrange === 'gantry' ? liftCheck(st.stages) : [])];
  if (want.payload > 0 && !tools.some((u) => u.does === 'grip')) refusals.push(`it was asked to hold ${want.payload} kg and nothing on it grips: say "picks up" and a gripper is composed in`);
  if (!want.does.length) refusals.push('nothing in those words says what the machine must *do*: name a tool (print, cut, solder, pick up, see, turn) and it is composed round it');
  // A GAP IS FATAL TO THE FIGURES THAT REST ON IT. A machine whose beam or rail the library refuses to draw used to
  // report a mass, a price and a bill of materials anyway, as confidently as one it had drawn - the refusal printed a
  // line and the numbers printed beside it, and nothing said the numbers were short by the very part that was missing.
  // That is a made-up figure wearing a sourced one's clothes, which theme 9 forbids outright. So where a part is not
  // drawn, the mass and the price it would have contributed are not known, and `kg`/`usd` say they are not known
  // rather than reporting the sum of what happened to be drawable.
  // a unit that says it cannot be built says so where the refusals are read, not only in its own sentence
  for (const m of st.stages) if (m.unit.cannot) refusals.push(`${m.unit.name}: ${m.unit.cannot}`);
  const short = st.gaps.length > 0;
  if (short) refusals.push(`its mass and price are WITHHELD, not computed: ${st.gaps.length} part${st.gaps.length === 1 ? ' is' : 's are'} not drawn by the library (above), so any total here would be the weight of what was drawable and not of the machine. Size those parts within what the library makes, or take the refusal as the answer`);
  return {
    asked: words, name: want.name, arrange: want.arrange, stages: st.stages, reach: want.mm,
    kg: short ? null : st.kg, holding: st.holding,
    usd: short ? null : (usd || null), unpriced: money.flatMap((m) => m.unpriced), does: [...new Set(units.map((u) => u.does))],
    refusals, gaps: st.gaps, notDone: want.notDone, ...(joints ? { joints } : {}),
  };
}

/** A machine written out: what it is made of, stage by stage, with what each carries and what it costs. */
export function machineText(m: Machine): string {
  const span = m.arrange === 'arm' ? `${m.reach[0]} mm of reach` : m.arrange === 'rail' ? `${m.reach[0]} mm of travel along it` : `${m.reach.join(' × ')} mm of travel`;
  const out = [`${m.name}, ${span}: ${m.stages.length + 1} units, ${m.kg == null ? 'nothing weighed here' : `${m.kg} kg`}${m.holding ? ` (holding ${m.holding} kg, which is a load and not part of it)` : ''}, ${m.usd == null ? 'nothing priced here' : `$${m.usd.toFixed(2)}`}.`];
  out.push(`It was composed, not copied: ${m.does.join(', ')} are the words, arranged as ${{ gantry: 'a gantry in a frame, because the tool has to get anywhere in a box', rail: 'one long rail, because what was asked for is travel along something', arm: 'a jointed arm, because what was asked for is reach', table: 'a turning table under a fixed tool' }[m.arrange]}.`);
  if (m.joints) for (const j of m.joints) out.push(`  ${j.at} holds ${j.holds} N·m geared ${j.ratio}:1 and has to hold ${j.needs} N·m straight out: ${j.holds >= j.needs ? 'holds' : 'NO'}`);
  for (const s of m.stages) {
    out.push(`  ${s.unit.name} — ${s.unit.says}`);
    out.push(`      carries ${s.carrying.toFixed(2)} ${s.inUnit ?? 'kg'}${s.above.length ? ` (${s.above.join(', ')})` : ' (nothing above it)'}: ${s.ok ? 'holds' : `NO — ${s.why}`}`);
    const parts = [...s.unit.of.map((p) => `${p.n} × ${p.words}`), ...(s.unit.bought ?? []).map((b) => `${b.n} × ${b.what} (bought: ${b.why})`)];
    out.push(`      ${parts.join('; ')}`);
  }
  if (m.unpriced.length) out.push(`No price here for: ${[...new Set(m.unpriced)].join(', ')}.`);
  if (m.gaps.length) out.push(`The library does not draw: ${[...new Set(m.gaps)].join('; ')}.`);
  if (m.refusals.length) out.push(`It will not:\n${m.refusals.map((r) => `  - ${r}`).join('\n')}`);
  // what the words said and nothing here used. Printed beside the refusals rather than under them, because a number
  // that was read and then dropped is a different fault from a number that refuses the machine, and the two were
  // indistinguishable while one of them was silent.
  if (m.notDone.length) out.push(`Said in the ask and NOT done here:\n${m.notDone.map((r) => `  - ${r}`).join('\n')}`);
  return out.join('\n');
}

/** Words in the room: "invent me a machine that prints 300 x 300", "an arm that reaches 600 mm and picks up 1 kg".
 *
 *  `stand` is how it gets drawn without this file knowing anything about the viewer: the room passes a way to put a
 *  part in front of you and a way to draw one from the library, and both are plain functions. A machine that is only
 *  a list of parts is the fault the user named — "why does everything look bogus" — so where the room can stand it,
 *  it stands. */
export function machineWords(text: string, o: { stand?: (p: Part, m: Machine) => string; use?: (words: string) => Part } = {}): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
  const asked = /^(invent|compose|design|make|build|stand|show) (me )?(a |an )?(machine|rig|thing|arm|hand|gantry|robotic hand)\b/.test(t)
    || /^(a|an) (machine|arm|rig|robotic hand) that /.test(t) || /^what would a machine that /.test(t);
  if (!asked) return null;
  const m = composeMachine(t);
  const said = machineText(m);
  if (!o.stand || !o.use) return said;
  try {
    const part = machinePart(m, o.use), drawn = massOf(part);
    // what is drawn is not what it weighs: a line bought whole (the spindle, the servo, the supply, the lead screw)
    // has a listing's mass and no drawing, so the room's own figure is always the lighter one. Say which is which
    // rather than let two numbers disagree on the same screen.
    const short = (m.kg ?? drawn) - drawn;
    return `${o.stand(part, m)}${short > 0.05 ? ` Standing: ${drawn.toFixed(2)} kg of it is drawn and ${short.toFixed(2)} kg is bought whole and has no drawing here (${m.stages.flatMap((s) => s.unit.bought ?? []).map((b) => b.what).join(', ') || 'its bought lines'}).` : ''}\n\n${said}`;
  } catch (e) { return `${said}\n\n(It is not standing in the room: ${(e as Error).message})`; }
}

// ---- how it is arranged, which is also the words' to say ------------------------------------------------------------
// The first run of this file always built the same thing: a frame with three slides stacked in it. That is a template
// wearing a composer's clothes — every ask came out a gantry, whatever it asked for. The arrangement is as much a part
// of what the words say as the tool is, and it changes which check even applies: a gantry is checked by *mass*, because
// what fails is a rail carrying what stands on it; an arm is checked by *torque*, because what fails is a joint holding
// a load out at the end of a link, and a joint that holds 1.2 N·m does not care that the load is only half a kilogram
// if it is half a kilogram 400 mm away.

/** How a machine is put together. Not a list of machines — a list of the shapes a stack can take. */
export type Arrangement =
  /** a frame with slides stacked in it: the tool goes anywhere in a box */ | 'gantry'
  /** one long slide, bracketed to a wall or a floor, with the tool riding it: the rail is the mobility */ | 'rail'
  /** a chain of turn axes with links between them: reach by angles, checked by torque */ | 'arm'
  /** the work turns under a fixed tool: a lathe, a wheel, a turntable */ | 'table';

/** A link between two joints of an arm: a length of 2020 extrusion with a plate at each end. */
export function armLink(mm: number): Unit {
  return {
    id: `arm-link-${mm}`, name: `a ${mm} mm link`, does: 'hold', range: 0,
    of: [{ words: `extrusion 2020 ${Math.round(mm / 50) * 50}`, n: 1 }, { words: 'motorplate nema17 t4 aluminium', n: 2 },
      { words: 'slotnut slot6 M5 hammer', n: 8 }, { words: 'bolt M5x12', n: 8 }],
    carries: 20, lifts: 0, speed: 0, limit: 'a 2020 section in bending over its own length, which is far more than any joint here can hold out at its end',
    box: [mm, 40, 40], says: `${mm} mm of 2020 extrusion with a motor plate bolted at each end`,
    src: 'the extrusion\'s own section from the library; it is never what fails on an arm this size, the joint is',
  };
}

/** The bracket that holds a rail to a wall or a floor, every 400 mm along it. */
export function railMount(mm: number): Unit {
  const n = Math.max(2, Math.round(mm / 400) + 1);
  return {
    id: `rail-mount-${mm}`, name: `${n} brackets along ${mm} mm`, does: 'hold', range: 0,
    of: [{ words: 'angle 40x4 steel 500mm', n }, { words: 'bolt M8x30', n: n * 2 }, { words: 'slotnut slot6 M5 hammer', n: n * 2 }, { words: 'bolt M5x12', n: n * 2 }],
    carries: 150, lifts: 0, speed: 0,
    limit: `${n} steel angle brackets at 400 mm centres into a wall: what holds is the wall and its fixings, which is not something this can know`,
    box: [mm, 60, 80], says: `${n} lengths of 40 × 4 steel angle at 400 mm centres, bolted through the wall and into the beam's slots`,
    src: 'the angle\'s own section from the library; its spacing is the usual 400 mm stud pitch, and what the wall itself holds is said rather than claimed',
  };
}

/** The ratios a turn axis is geared at, cheapest first: a GT2 pair does 3:1 easily, 5:1 and 10:1 with a bigger wheel,
 *  and past that it wants a second stage. The composer takes the first that holds, which is why nothing here asserts a
 *  joint's torque — it is chosen against the moment it actually has to hold. */
// Only ratios a belt can really give, in stages: 4:1 one stage, 16:1 two, 64:1 three. The old ladder went to 50:1
// on a single pair, which is a 1000-tooth pulley nobody makes.
const RATIOS = [3, 5, 10, 20, 50].filter((r) => beltStages(r) !== null);

/** An arm checked the way an arm fails: the moment at each joint with the arm straight out, against what that joint can
 *  be geared to hold. Fully extended and horizontal is the worst case and the one people build and then discover. */
export function armStack(reach: number, tools: Unit[], payloadKg = 0): { stages: Mounted[]; kg: number; holding: number; refusals: string[]; gaps: string[]; joints: { at: string; needs: number; holds: number; ratio: number }[] } {
  const refusals: string[] = [], gaps: string[] = [], joints: { at: string; needs: number; holds: number; ratio: number }[] = [];
  const weigh = (u: Unit) => { const r = unitKg(u); gaps.push(...r.gaps); return r.kg; };
  // upper arm and forearm: the usual split, longer nearer the base where the moment is worst
  const L = [Math.round(reach * 0.55), Math.round(reach * 0.45)] as const;
  const links = L.map((mm) => armLink(mm)), linkKg = links.map(weigh);
  const toolKg = tools.reduce((a, t) => a + weigh(t), 0);
  const endKg = toolKg + payloadKg;
  const stages: Mounted[] = [];
  // the moment at each joint, in metres, with everything beyond it held straight out
  const need = (i: number): number => {
    let nm = 0;
    for (let j = i; j < L.length; j++) {
      const toMid = L.slice(i, j).reduce((a, b) => a + b, 0) + L[j]! / 2;
      nm += linkKg[j]! * 9.80665 * (toMid / 1000);
    }
    return nm + endKg * 9.80665 * (L.slice(i).reduce((a, b) => a + b, 0) / 1000);
  };
  const NAMES = ['the shoulder', 'the elbow'];
  for (let i = 0; i < L.length; i++) {
    const nm = need(i);
    const delivers = (r: number) => { const st = beltStages(r); if (!st) return 0; return NEMA17_NM * st.reduce((a, x) => a * (x.driven / x.driver), 1) * 0.95 ** Math.max(1, st.length); };
    const ratio = RATIOS.find((r) => delivers(r) >= nm);
    const got = delivers(ratio ?? RATIOS[RATIOS.length - 1]!);
    const j = turnAxis(ratio ?? RATIOS[RATIOS.length - 1]!);
    joints.push({ at: NAMES[i] ?? `joint ${i + 1}`, needs: +nm.toFixed(2), holds: +got.toFixed(2), ratio: ratio ?? RATIOS[RATIOS.length - 1]! });
    const s: Mounted = { unit: { ...j, name: `${NAMES[i] ?? `joint ${i + 1}`}, geared ${ratio ?? RATIOS[RATIOS.length - 1]}:1` }, carrying: +nm.toFixed(2), inUnit: 'N·m', above: [...links.slice(i).map((l) => l.name), ...tools.map((t) => t.name)], ok: !!ratio };
    if (!ratio) {
      s.why = `${NAMES[i] ?? `joint ${i + 1}`} has to hold ${nm.toFixed(2)} N·m with the arm straight out and a NEMA 17 geared 50:1 by belt holds ${got.toFixed(2)}: shorten the link, take the load off with a counterbalance spring, or put a worm or cycloidal reducer there instead of a belt (which is where a cheap arm stops being cheap)`;
      refusals.push(s.why);
    }
    const noLink = tooSmall(links[i]!);
    if (noLink) refusals.push(`${links[i]!.name}: ${noLink}`);
    stages.push(s, { unit: noLink ? { ...links[i]!, cannot: noLink } : links[i]!, carrying: 0, above: [], ok: !noLink, ...(noLink ? { why: noLink } : {}) });
  }
  for (const u of tools) {
    const held = u.does === 'grip' ? payloadKg : 0, ok = u.does !== 'grip' || u.lifts >= payloadKg;
    const s: Mounted = { unit: u, carrying: held, above: held ? ['what it is holding'] : [], ok };
    if (!ok) { s.why = `it grips ${u.lifts} kg and was asked to hold ${payloadKg} kg (${u.limit})`; refusals.push(`${u.name}: ${s.why}`); }
    stages.push(s);
  }
  // the arm's own mass; what it holds is `holding` and is never added in (see the note in `stack`). Each joint's
  // moment above still includes the payload, which is the number that decides its gearing.
  const kg = linkKg.reduce((a, b) => a + b, 0) + toolKg + joints.reduce((a, j) => a + unitKg(turnAxis(j.ratio)).kg, 0);
  return { stages, kg: +kg.toFixed(2), holding: +payloadKg.toFixed(2), refusals, gaps, joints };
}

// `layUnit`, `machineParts` and `machinePart` moved to `./machine-draw` (drawing is not composing); re-exported
// here so every caller that had them from this file still does.
export { layUnit, machineParts } from './machine-draw';
export { machinePart };

// ---- the machine as a kit, so a composed machine can be LOOKED AT ------------------------------------------------
// This is one array entry, and its absence is why six rounds of review judged a picture of a 400 mm rail. Everything
// else was already here: `machinePart` turns a composed machine into placed parts and `view/works-room.ts` calls it.
// But `view/look.ts` picks its kit by id out of `KITS`, there was no `machine` id, so every ask fell through to the
// `part` kit - whose words-to-part lookup answers a sentence with its family's example. The numbers half of
// `manny-see` was reading `composeMachine` and the picture half was drawing an end cap, and nothing said so.
// Registered from here rather than from `parts/kits.ts` because a kit that composes a machine has to import `ask/`,
// and `parts/` importing `ask/` is the up-layer import the tidy lint forbids - the same reason `world/creatures.ts`
// registers its own. `view/look.ts` imports this module for the side effect, as it already does for creatures.
addKit({
  id: 'machine', name: 'machine', words: /\b(machine|gantry|arm|rail|robot|printer|router|mill|lathe|press|winder|feeder|conveyor|plotter|pick and place)\b/i,
  choices: [], saidWhole: true,
  says: 'a machine composed from the component library by what each unit affords, as `npm run machine` composes it: the same units, the same bill, the same refusals - drawn',
  build(c) {
    const words = String(c.said ?? '').trim();
    const m = composeMachine(words || 'a machine that picks things up');
    const p = machinePart(m, use);
    // What the composer REFUSED travels with the drawing, so a picture of a machine that cannot be built says so in
    // the same place `manny-see` and the look page already read (`lookReady.says`, and the stamp burnt into the PNG).
    const bad = [...m.refusals, ...m.gaps.map((g) => `not drawn: ${g}`)];
    return { ...p, says: `${bad.length ? `THIS MACHINE DOES NOT HOLD: ${bad[0]}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''}. ` : ''}${p.says}` };
  },
});

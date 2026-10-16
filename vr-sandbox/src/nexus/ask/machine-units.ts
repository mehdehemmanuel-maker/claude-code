// The units a machine is composed FROM: what each one affords, what it is made of by the words the component library
// draws them from, how far it moves, what it carries and what it can raise.
//
// Owner of: a unit of machine — the thing, not the composing. `machine.ts` stacks these, checks each stage against
// what stands on it and prices the result; `machine-draw.ts` lays each one out in space. The three were one file, and
// the lint said so at 735 lines: a catalogue of real assemblies and the arithmetic that chooses between them are two
// concerns, and the catalogue is the one that grows every time the library draws something new.
//
// Nothing here is a named machine. A screw axis, a belt axis, a turn axis, a hot end, a spindle, a gripper, an eye, a
// brain, a frame and a bed are the words; which of them a stack spells is `machine.ts`'s business.

import { GT2_PULL_6, GT2_WIDTHS, beltFor, beltPull, gt2Pitch } from '../kinds/motion';

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
export const NEMA17_NM = 0.42;
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

/** How high the top face of a frame's bottom rail is, mm: a 2040 laid flat is 40 across, and everything that stands
 *  on the floor of a frame stands on that face. Both the composer and the drawing measure from it. */
export const RAIL = 40;

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

/** What a gantry works OVER: a plywood spoil board bolted to the frame's base, cut to the travel plus the room a
 *  clamp needs at each edge. A machine that cuts, prints or solders in a box does it onto something, and a gantry
 *  composed with nothing under its tool is a gantry whose tool cuts air — which is exactly how the works room drew
 *  it, the spindle on top of the pile and the floor three hundred millimetres below. Plywood because that is what a
 *  spoil board is: cheap, flat and meant to be cut into, replaced when it is used up. */
export function bedPlate(x: number, y: number): Unit {
  const w = Math.round((x + 120) / 10) * 10, d = Math.round((y + 120) / 10) * 10;
  return {
    id: 'bed', name: `a ${w} \u00d7 ${d} mm bed`, does: 'hold', range: 0,
    of: [{ words: `sheet plywood 18mm ${w}x${d}`, n: 1 }, { words: 'slotnut slot6 M5 hammer', n: 8 }, { words: 'bolt M5x12', n: 8 }],
    carries: 50, lifts: 0, speed: 0,
    limit: '18 mm plywood bolted down on all four edges, taken at 50 kg spread over it (an estimate: nothing composed here is set on it, and what is clamped to a spoil board is the work)',
    box: [w, 18, d], says: `an 18 mm plywood spoil board ${w} \u00d7 ${d} mm bolted to the frame's base, the work clamped to it`,
    src: 'a spoil board is ordinary practice under a gantry; 18 mm is the usual sheet, and the 60 mm margin each side is clamp room',
  };
}

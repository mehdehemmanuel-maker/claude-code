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

import { component } from '../parts/components';
import { massOf } from '../parts/mass';
import type { Part } from '../parts/kits';
import { cheapest } from '../parts/prices';

/** What a unit affords: the one thing it adds to whatever is bolted on top of it. */
export type Does = 'slide' | 'turn' | 'grip' | 'deposit' | 'cut' | 'see' | 'think' | 'hold';

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
export function turnAxis(ratio = 3): Unit {
  const nm = NEMA17_NM * ratio * 0.95;
  return {
    id: `turn-axis-${ratio}`, name: `a turn axis geared ${ratio}:1`, does: 'turn', range: 360,
    of: [{ words: NEMA17, n: 1, price: 'nema17' }, { words: 'motorplate nema17 t4 aluminium', n: 1 }, { words: 'bearing 6805', n: 2 },
      { words: 'pulley GT2 20 5', n: 1, price: 'pulley-gt2-20t-5' }, { words: `pulley GT2 ${20 * ratio} 8`, n: 1 }, { words: 'belt GT2 6 400', n: 1, price: 'gt2-belt' },
      { words: 'bolt M5x12', n: 8 }],
    carries: 40, lifts: 0, speed: +((360 / ratio) * (300 / 60)).toFixed(0),
    limit: 'the 6805 thin-section bearing pair, which takes the moment of whatever stands on it',
    box: [120, 90, 120],
    says: `a NEMA 17 geared ${ratio}:1 by GT2 into a pair of 6805 bearings: ${nm.toFixed(2)} N·m at the output, turning at ${((360 / ratio) * (300 / 60)).toFixed(0)}°/s`,
    src: 'the output torque from the NEMA 17\'s 0.42 N·m times the ratio, less 5 % for the belt (an estimate); the bearing pair chosen for its moment, not its load',
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
  unit: Unit; /** kg standing on its moving end */ carrying: number;
  /** what is above it, by name */ above: string[];
  ok: boolean; why?: string;
}
/** A machine composed from units: what it is, what it reaches, what it costs, and what it cannot do. */
export interface Machine {
  asked: string; name: string; stages: Mounted[];
  /** its envelope: how far it moves in each of the three ways it slides, mm */ reach: number[];
  kg: number; usd: number | null;
  /** lines with no price here, said rather than guessed */ unpriced: string[];
  /** what it affords, in the order the stack gives them */ does: Does[];
  /** what it will not do, each with the number that refuses it */ refusals: string[];
  /** parts the library does not draw by those words: a gap, never a stand-in */ gaps: string[];
}

/** What a unit weighs: the sum of its drawn parts, kg. Parts bought whole are weighed where a price page gives one and
 *  otherwise left out of the sum and said — a mass that quietly invents the heavy half of a machine is worse than none. */
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
export function stack(frameUnit: Unit, axes: Unit[], tools: Unit[], payloadKg = 0): { stages: Mounted[]; kg: number; refusals: string[]; gaps: string[] } {
  const refusals: string[] = [], gaps: string[] = [];
  const weigh = (u: Unit) => { const r = unitKg(u); gaps.push(...r.gaps); return r.kg; };
  const frameKg = weigh(frameUnit), axisKg = axes.map(weigh), toolKg = tools.map(weigh);
  const toolsKg = toolKg.reduce((a, b) => a + b, 0);
  const stages: Mounted[] = [];
  // the frame: everything stands on it
  const all = frameKg + axisKg.reduce((a, b) => a + b, 0) + toolsKg + payloadKg;
  const push = (unit: Unit, carrying: number, above: string[]) => {
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
  return { stages, kg: +all.toFixed(2), refusals, gaps };
}

/** Which way a slide in a stack of this many runs: the last slide is up, the rest across. A stack's vertical axis is
 *  the one that has to *raise* what is above it, which is a different number from holding it. */
function liftCheck(stages: Mounted[]): string[] {
  const slides = stages.filter((s) => s.unit.does === 'slide');
  const up = slides[slides.length - 1]; if (!up) return [];
  return up.unit.lifts >= up.carrying ? []
    : [`${up.unit.name} raises ${up.unit.lifts} kg and would have to raise ${up.carrying.toFixed(2)} kg: give it a finer lead (a T8 × 2 raises four times as much at a quarter the speed) or a second motor`];
}

/** What words ask for, as the affordances a machine must have and how big it must be. Nothing here is a machine's
 *  name: "a printer", "a router" and "a thing that picks parts off a belt and puts them in a box" all arrive as the
 *  same kind of answer — what it must do, over what, carrying what. */
export function readMachine(words: string): { does: Does[]; mm: [number, number, number]; payload: number; name: string } {
  const t = words.toLowerCase();
  const does: Does[] = [];
  if (/print|extrude|deposit|fdm|fff|filament/.test(t)) does.push('deposit');
  if (/mill|rout|cut|carve|engrave|spindle/.test(t)) does.push('cut');
  if (/pick|place|grab|grip|hand|hold.*part|sort/.test(t)) does.push('grip');
  if (/camera|see|scan|inspect|look|vision|photo/.test(t)) does.push('see');
  if (/turn|rotate|spin|wrist|turntable|lathe|wheel/.test(t)) does.push('turn');
  const size = /(\d{2,4})\s*(?:mm)?\s*[x×by]\s*(\d{2,4})\s*(?:mm)?(?:\s*[x×by]\s*(\d{2,4}))?/.exec(t);
  const mm: [number, number, number] = size ? [Number(size[1]), Number(size[2]), Number(size[3] ?? size[2])] : [300, 300, 300];
  const kg = /(\d+(?:\.\d+)?)\s*kg/.exec(t);
  const name = does.length ? `a machine that ${does.map((d) => ({ deposit: 'prints', cut: 'cuts', grip: 'picks things up', see: 'sees', turn: 'turns', slide: 'moves', think: 'is programmed', hold: 'holds' })[d]).join(', ')}` : 'a machine';
  return { does, mm, payload: kg ? Number(kg[1]) : 0, name };
}

/** Compose an ask into a machine: the tool its words call for, the slides that carry it over the size asked, the frame
 *  under them and the brain beside them — then every stage checked against what stands on it. */
export function composeMachine(words: string): Machine {
  const want = readMachine(words);
  const [x, y, z] = want.mm;
  const tools: Unit[] = [];
  if (want.does.includes('deposit')) tools.push(HOT_END);
  if (want.does.includes('cut')) tools.push(SPINDLE);
  if (want.does.includes('grip')) tools.push(GRIPPER);
  if (want.does.includes('see')) tools.push(EYE);
  if (want.does.includes('turn')) tools.push(turnAxis(3));
  // the axes under the tool: across, in and up. A cut takes force sideways, so its across axes are screws too; a
  // tool that only has to be put somewhere gets belts, which are five times as fast for the same motor.
  const fast = !want.does.includes('cut');
  const axes: Unit[] = [fast ? beltAxis(x) : screwAxis(x), fast ? beltAxis(y) : screwAxis(y), screwAxis(z)];
  const fr = baseFrame(x + 200, y + 200, z + 350);
  const st = stack(fr, axes, tools, want.payload);
  const units = [fr, ...axes, ...tools, BRAIN];
  const money = units.map((u) => unitUsd(u));
  const usd = +money.reduce((a, b) => a + b.usd, 0).toFixed(2);
  const refusals = [...st.refusals, ...liftCheck(st.stages)];
  if (want.payload > 0 && !tools.some((u) => u.does === 'grip')) refusals.push(`it was asked to hold ${want.payload} kg and nothing on it grips: say "picks up" and a gripper is composed in`);
  if (!want.does.length) refusals.push('nothing in those words says what the machine must *do*: name a tool (print, cut, pick up, see, turn) and it is composed round it');
  return {
    asked: words, name: want.name, stages: st.stages, reach: [x, y, z], kg: st.kg,
    usd: usd || null, unpriced: money.flatMap((m) => m.unpriced), does: [...new Set(units.map((u) => u.does))],
    refusals, gaps: st.gaps,
  };
}

/** A machine written out: what it is made of, stage by stage, with what each carries and what it costs. */
export function machineText(m: Machine): string {
  const out = [`${m.name}, ${m.reach.join(' × ')} mm of travel: ${m.stages.length + 1} units, ${m.kg} kg, ${m.usd == null ? 'nothing priced here' : `$${m.usd.toFixed(2)}`}.`];
  out.push(`It was composed, not copied: ${m.does.join(', ')} are the words, and this is what they spell at that size.`);
  for (const s of m.stages) {
    out.push(`  ${s.unit.name} — ${s.unit.says}`);
    out.push(`      carries ${s.carrying.toFixed(2)} kg${s.above.length ? ` (${s.above.join(', ')})` : ' (nothing above it)'}: ${s.ok ? 'holds' : `NO — ${s.why}`}`);
    const parts = [...s.unit.of.map((p) => `${p.n} × ${p.words}`), ...(s.unit.bought ?? []).map((b) => `${b.n} × ${b.what} (bought: ${b.why})`)];
    out.push(`      ${parts.join('; ')}`);
  }
  if (m.unpriced.length) out.push(`No price here for: ${[...new Set(m.unpriced)].join(', ')}.`);
  if (m.gaps.length) out.push(`The library does not draw: ${[...new Set(m.gaps)].join('; ')}.`);
  if (m.refusals.length) out.push(`It will not:\n${m.refusals.map((r) => `  - ${r}`).join('\n')}`);
  return out.join('\n');
}

/** Words in the room: "invent me a machine that prints 300 x 300", "a machine that picks up 2 kg and sees". */
export function machineWords(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
  if (!/^(invent|compose|design|make|build) (me )?(a |an )?(machine|rig|thing)\b/.test(t) && !/^what would a machine that /.test(t)) return null;
  return machineText(composeMachine(t));
}

/** The machine drawn from the library: every unit's parts where the stack puts them, so what is composed can be stood
 *  in the room and taken apart like anything else. */
export function machineParts(m: Machine, use: (words: string) => Part): Part[] {
  const out: Part[] = []; let up = 0;
  for (const s of m.stages) {
    const parts: Part[] = [];
    for (const { words, n } of s.unit.of) for (let i = 0; i < n; i++) {
      try { parts.push({ ...use(words), at: [((i % 4) - 1.5) * 0.06, up * 0.001, Math.floor(i / 4) * 0.06] }); } catch { /* the gap is already said in m.gaps */ }
    }
    out.push({ name: s.unit.name, at: [0, up * 0.001, 0], says: s.unit.says, parts });
    up += s.unit.box[1];
  }
  return out;
}

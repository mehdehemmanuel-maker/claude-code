// Molecular-biology bench instruments by their makers' published figures, and what each one does as numbers: how long a
// thermal cycler takes to run a program (its holds, and its ramps at its own rate) and what it refuses; the force a
// centrifuge puts on a tube at a speed and a radius, and the speed a wanted force needs; the field a gel runs at and
// whether its supply can give it; a primer's melting point; what a pipette's error is at a volume. Each instrument is
// drawn whole from the library's parts.
//
// Where a figure is the maker's it says so; where it is typical of such an instrument it says that instead. The
// instruments are drawn and reasoned about as equipment: this file holds no laboratory procedure.
// Owner of: the bench instruments (their figures, their arithmetic and their drawings).

import type { Part } from '../parts/kits';

/** How a drawing asks the library for a part by its words (passed in: src/nexus/parts/components.ts owns it). */
type Use = (words: string) => Part;

type V3 = [number, number, number];
const PI = Math.PI, mm = 0.001;

// ---- the instruments, by their makers' figures ---------------------------------------------------------------------

/** Bio-Rad's T100 thermal cycler. Its size is given wide × high × deep, mm. */
export const T100 = {
  id: 'T100', name: 'Bio-Rad T100 thermal cycler', wells: 96, tubeMl: 0.2,
  range: [4, 100] as [number, number], ramp: { max: 4, avg: 2.5 }, gradient: { range: [30, 100] as [number, number], span: [1, 25] as [number, number] },
  accuracy: 0.5, uniformity: 0.5, watts: 700, size: [260, 230, 470] as V3, kg: 9,
  src: 'Bio-Rad\'s T100 specification bulletin, as copies of it give it: 96 × 0.2 ml tubes or one 96-well plate; 4–100 °C; 4 °C/s at most and 2.5 °C/s on average; a gradient of 1–25 °C across 30–100 °C; ±0.5 °C of its target and ±0.5 °C well to well; 100–240 V, 700 W at most; 26 × 47 × 23 cm, 9 kg',
};
/** Eppendorf's Centrifuge 5425, the 24-place microcentrifuge. */
export const C5425 = {
  id: '5425', name: 'Eppendorf Centrifuge 5425', places: 24, tubeMl: [1.5, 2] as [number, number], rpm: 15060, g: 21300, watts: 280,
  size: [240, 240, 390] as V3, kg: 15.6,
  src: 'Eppendorf\'s figures as Fisher Scientific and Marshall Scientific list them: 24 × 1.5/2.0 ml in its FA-24x2 rotor, 15,060 rpm, 21,300 × g; 24 × 39 × 24 cm, 15.6 kg; 120 V, 280 W',
};
/** Bio-Rad's Mini-Sub Cell GT horizontal gel tank. */
export const MINISUB = {
  id: 'Mini-Sub-GT', name: 'Bio-Rad Mini-Sub Cell GT', tray: [70, 100] as [number, number], bufferMl: 270, size: [120, 65, 260] as V3, kg: 1.15,
  src: 'Bio-Rad\'s figures as sellers list them: a 7 × 7 or 7 × 10 cm UV-transparent tray, about 270 ml of buffer, 12 × 26 × 6.5 cm; its 1.15 kg what its drawing weighs, filled: its moulding, its tray and comb, and the 270 ml of buffer in it (Bio-Rad give no mass: an estimate)',
};
/** Bio-Rad's PowerPac Basic electrophoresis supply. */
export const POWERPAC = {
  id: 'PowerPac-Basic', name: 'Bio-Rad PowerPac Basic', volts: [10, 300] as [number, number], mA: [4, 400] as [number, number], watts: 75,
  size: [210, 65, 245] as V3, kg: 1.1,
  src: 'Bio-Rad\'s figures as sellers list them: 10–300 V in 1 V steps, 4–400 mA in 1 mA steps, 75 W at most, constant voltage or constant current with automatic crossover; 21 × 24.5 × 6.5 cm, 1.1 kg',
};
/** Invitrogen's Safe Imager 2.0 blue-light transilluminator. */
export const SAFE_IMAGER = {
  id: 'Safe-Imager-2', name: 'Invitrogen Safe Imager 2.0', nm: 470, view: [190, 190] as [number, number], hours: 50000, size: [195, 65, 325] as V3, kg: 7.7,
  src: 'Thermo Fisher\'s own figures: LEDs peaking near 470 nm (no ultraviolet), a 19 × 19 cm viewing surface, 195 × 325 × 65 mm, 50,000 h of LED life, with an amber filter and viewing glasses; its 7.7 kg a reseller\'s listing',
};
/** Eppendorf's Research plus pipette, 100–1000 µl: its error by EN ISO 8655 with Eppendorf's own tips. */
export const RESEARCH_PLUS = {
  id: 'Research-plus-1000', name: 'Eppendorf Research plus, 100–1000 µl', ul: [100, 1000] as [number, number], length: 245, kg: 0.09,
  /** at this volume (µl): its systematic error (±%) and its random error (±%) */
  error: [[100, 3, 0.6], [500, 1, 0.2], [1000, 0.6, 0.2]] as [number, number, number][],
  src: 'Eppendorf\'s calibration figures (EN ISO 8655, with Eppendorf\'s own tips): ±3.0 % and ±0.6 % at 100 µl, ±1.0 % and ±0.2 % at 500 µl, ±0.6 % and ±0.2 % at 1000 µl, systematic and random; over 80 g (its length typical of the size: an estimate)',
};
/** A 4 ft Class II, Type A2 microbiological safety cabinet (Labconco's Purifier Logic+ as Fisher Scientific lists it;
 *  NSF/ANSI 49 sets what its airflow must be). */
export const BSC_A2 = {
  id: 'Logic-plus-4ft', name: 'Labconco Purifier Logic+ Class II A2, 4 ft', inner: [1232, 584, 762] as V3, height: 1567, sash: 254,
  recirculated: 0.7, inflow: 0.51, downflow: 0.32, kg: 180,
  src: 'Fisher Scientific\'s listing of Labconco\'s Purifier Logic+ 4 ft: 123.2 cm wide inside, 156.7 cm high without its stand, a 10 in (254 mm) sash opening, under 63 dBA, its ECM blower held at constant airflow as its filters load; about 70 % of its air recirculated and 30 % exhausted (Labconco\'s Logic listing); NSF/ANSI 49 asks at least 0.51 m/s (100 ft/min) in through the opening and about 0.32 m/s down through the work zone. Its depth, its work height and its 180 kg typical of a 4 ft cabinet (estimates)',
  hazard: 'a Class II A2 cabinet keeps particles in and off the work: it is not a fume hood, and the volatile or radioactive work it is not rated for must not go in it; its HEPA filters hold 99.97 % of 0.3 µm particles only while its airflow is in its certified range, so it is certified in place and after every move',
};

// ---- what each one does, as numbers ---------------------------------------------------------------------------------

/** A step of a cycling program: its temperature (°C) and how long it is held there (s). */
export interface CycleStep { name: string; c: number; s: number }
/** A cycling program: the steps before its cycles, the cycle's own steps and how many times it repeats, the steps
 *  after, and the temperature it holds at to finish. */
export interface CycleProgram { start: CycleStep[]; cycle: CycleStep[]; n: number; end: CycleStep[]; hold: number }
/** How long a program takes on a cycler: its holds, and its ramps between them at the cycler's average rate from room
 *  temperature (25 °C); and what the cycler refuses (a step outside the temperatures it reaches). */
export function cycleTime(p: CycleProgram, cycler = T100): { s: number; ramps: number; holds: number; refused: string[] } {
  const seq = [...p.start, ...Array.from({ length: p.n }, () => p.cycle).flat(), ...p.end, { name: 'the hold at the end', c: p.hold, s: 0 }];
  let t = 25, ramps = 0, holds = 0; const refused: string[] = [];
  for (const st of seq) {
    if (st.c < cycler.range[0] || st.c > cycler.range[1]) refused.push(`${st.name} at ${st.c} °C is outside the ${cycler.name}'s ${cycler.range[0]}–${cycler.range[1]} °C`);
    ramps += Math.abs(st.c - t) / cycler.ramp.avg; holds += st.s; t = st.c;
  }
  return { s: Math.round(ramps + holds), ramps: Math.round(ramps), holds, refused: [...new Set(refused)] };
}
/** A short DNA strand's melting point (°C): 64.9 + 41 (G + C − 16.4) / N for 14 bases or more, else 2 (A + T) +
 *  4 (G + C) (Wallace). Both are rules of thumb, good to a few degrees: salt and strand concentration move the real
 *  one, which is why an annealing temperature is set a little under it and then tried. */
export function meltingPoint(seq: string): number {
  const s = seq.toUpperCase().replace(/[^ACGT]/g, ''), gc = (s.match(/[GC]/g) ?? []).length, at = s.length - gc;
  if (!s.length) return NaN;
  return s.length < 14 ? 2 * at + 4 * gc : 64.9 + (41 * (gc - 16.4)) / s.length;
}
/** The force on a tube (× g) at so many rpm, so far out from the axis (mm): 1.118 × 10⁻⁵ · r(cm) · rpm². */
export const rcf = (rpm: number, rMm: number): number => 1.118e-5 * (rMm / 10) * rpm * rpm;
/** The speed (rpm) that puts so many × g on a tube so far out from the axis (mm). */
export const rpmFor = (g: number, rMm: number): number => Math.sqrt(g / (1.118e-5 * (rMm / 10)));
/** How far out the 5425's tubes sit (mm), found from its own top speed and its own top force. */
export const C5425_RADIUS = (C5425.g / (1.118e-5 * C5425.rpm * C5425.rpm)) * 10;
/** A spin on a centrifuge: the speed its wanted force needs, and what it refuses (a force past the rotor's rating). */
export function spin(g: number, machine = C5425, rMm = C5425_RADIUS): { rpm: number; refused: string[] } {
  const rpm = rpmFor(g, rMm), refused: string[] = [];
  if (g > machine.g) refused.push(`${g.toLocaleString('en')} × g is past the ${machine.name}'s ${machine.g.toLocaleString('en')} × g`);
  if (rpm > machine.rpm) refused.push(`${Math.round(rpm).toLocaleString('en')} rpm is past its ${machine.rpm.toLocaleString('en')} rpm`);
  return { rpm: Math.round(rpm), refused };
}
/** A gel run: the field it puts across the gel (V/cm: the volts over the gap between the electrodes, taken as the
 *  tank's length less 30 mm of end walls), the current the buffer draws at those volts and the power that dissipates,
 *  and what the supply refuses. The buffer's resistance is measured on the day; 1,500 Ω stands for a mini tank of
 *  1 × TAE as a typical figure where none is given. */
export function gelRun(volts: number, ohms = 1500, tank = MINISUB, supply = POWERPAC): { vPerCm: number; mA: number; watts: number; refused: string[] } {
  const gapCm = (tank.size[2] - 30) / 10, mA = (volts / ohms) * 1000, watts = (volts * mA) / 1000, refused: string[] = [];
  if (volts < supply.volts[0] || volts > supply.volts[1]) refused.push(`${volts} V is outside the ${supply.name}'s ${supply.volts[0]}–${supply.volts[1]} V`);
  if (mA > supply.mA[1]) refused.push(`${mA.toFixed(0)} mA is past its ${supply.mA[1]} mA`);
  if (watts > supply.watts) refused.push(`${watts.toFixed(0)} W is past its ${supply.watts} W`);
  return { vPerCm: volts / gapCm, mA, watts, refused };
}
/** What a pipette's maker allows at a volume (µl): its systematic error and its random one, as ± µl, read off its
 *  calibration table (between its rows, straight-line; outside them, the nearest row's). */
export function pipetteError(ul: number, p = RESEARCH_PLUS): { systematic: number; random: number; outside: boolean } {
  const rows = p.error, lo = rows.filter((r) => r[0] <= ul).at(-1) ?? rows[0]!, hi = rows.find((r) => r[0] >= ul) ?? rows.at(-1)!;
  const f = hi[0] === lo[0] ? 0 : (ul - lo[0]) / (hi[0] - lo[0]), pct = (a: number, b: number) => a + (b - a) * f;
  return { systematic: (ul * pct(lo[1], hi[1])) / 100, random: (ul * pct(lo[2], hi[2])) / 100, outside: ul < p.ul[0] || ul > p.ul[1] };
}
/** The air a cabinet moves (m³/h): what comes in through its opening at the inflow velocity, and what its blower pushes
 *  down through the work zone; and what it throws out, the share of the inflow it does not recirculate. */
export function cabinetAir(c = BSC_A2): { inflow: number; downflow: number; exhaust: number } {
  const opening = ((c.inner[0] / 1000) * (c.sash / 1000)), floor = (c.inner[0] / 1000) * (c.inner[2] / 1000);
  const inflow = opening * c.inflow * 3600;
  return { inflow, downflow: floor * c.downflow * 3600, exhaust: inflow * (1 - c.recirculated) };
}

// ---- the instruments drawn --------------------------------------------------------------------------------------

const P = (name: string, shape: Part['shape'], o: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...o } as Part);
const B = (name: string, s: V3, at: V3, o: Partial<Part> = {}): Part => P(name, { box: [s[0] * mm, s[1] * mm, s[2] * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });
const CYL = (name: string, r: number, h: number, at: V3, o: Partial<Part> = {}): Part => P(name, { cyl: [r * mm, h * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });
const grp = (name: string, item: string, parts: Part[], o: Partial<Part> = {}): Part => ({ name, item, at: [0, 0, 0], parts, ...o } as Part);
/** Its mass set so the whole weighs what its maker says: the share of its shell that is solid. */
const toWeigh = (shell: Part, kg: number, rest: Part[], massOf: (p: Part) => number): Part => {
  const solid = massOf({ ...shell, fill: 1 }), left = kg - rest.reduce((a, b) => a + massOf(b), 0);
  // (where its walls alone cannot weigh what its maker says, the rest is its chassis, its fasteners and its wiring,
  // which are not drawn apart: said as the part's own mass)
  if (left > solid) return { ...shell, shell: undefined, fill: undefined, kg: left, says: `${(left - solid).toFixed(2)} kg of it its chassis, fasteners and wiring, not drawn apart` };
  return { ...shell, fill: Math.max(0.03, Math.min(1, left / solid)) };
};
const CASE = { mat: 'abs', finish: 'moulded' } as const, STEEL = { mat: 'steel-low', color: 0xb9bcc0, finish: 'paint' } as const;
/** The fan the cycler pulls air through its sink with: the library's own 60 mm one. */
const FAN = 'fan 60x25 24V';

/** The T100 thermal cycler: its moulded case, the 96-well aluminium block under its heated lid, the Peltier stack and
 *  finned sink below it with its fan, its board and its supply, its screen and its feet. */
export function cyclerParts(nm = T100.name, massOf: (p: Part) => number = () => 0, use: Use = (w) => ({ name: w })): Part[] {
  const [W, , D] = T100.size, wall = 3;
  // (its block: 96 wells in 8 × 12 at 9 mm, the plate standard, in an aluminium block; its wells drawn as the holes
  // drilled in it)
  const wells: { r: number; depth: number; at: V3; dir: V3 }[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) wells.push({ r: 2.7 * mm, depth: 15 * mm, at: [(c - 5.5) * 9 * mm, 9 * mm, (r - 3.5) * 9 * mm], dir: [0, -1, 0] });
  const block = B(`${nm} sample block`, [122, 20, 92], [0, 108, 10], { mat: 'al-6061', color: 0xd8dade, finish: 'anodised', item: 'cycler-block', cuts: wells, fixed: 'clamped onto its Peltier stack' });
  const lid = grp(`${nm} heated lid`, 'cycler-lid', [
    B(`${nm} heated lid`, [164, 30, 128], [0, 136, 6], { ...CASE, color: 0x2b2e33 }),
    B(`${nm} heated lid platen`, [122, 6, 92], [0, 119, 10], { mat: 'al-6061', color: 0xd8dade, finish: 'anodised', fixed: 'screwed under its lid, its film heater on its back' }),
    B(`${nm} heated lid film heater`, [110, 0.3, 80], [0, 122.3, 10], { mat: 'polyimide', color: 0xbb8833, finish: 'moulded', fixed: 'bonded to the platen', parts: [B(`${nm} heated lid heater track`, [100, 0.1, 70], [0, 0.2, 0], { mat: 'resistance-wire', color: 0x8a6a3a, finish: 'etch', item: 'resistance-wire', fill: 0.3, says: 'its track back and forth across the carrier' })] })], { joint: 'hinge', fixed: 'hinged at the back of its case, screwed down onto the plate' });
  const peltiers = [-1, 0, 1].map((k) => B(`${nm} Peltier module`, [40, 3.8, 40], [k * 42, 96, 10], { mat: 'alumina', color: 0xe6e3dc, finish: 'texture', fixed: 'between the block and its heat sink, in thermal paste' }));
  const sink = B(`${nm} heat sink`, [140, 45, 100], [0, 71, 10], { mat: 'al-a380', color: 0xa9adb2, finish: 'cast', item: 'heatsink-cast', fill: 0.35, fixed: 'clamped under its Peltiers' });
  const fan = { ...use(FAN), at: [0, 76 * mm, (-D / 2 + 40) * mm] as V3, rot: [PI / 2, 0, 0] as V3, fixed: 'screwed to the back of its sink\'s duct' };
  const board = B(`${nm} control board`, [180, 1.6, 150], [0, 40, 20], { mat: 'fr4', color: 0x2f6b3a, item: 'pcb-bare', fixed: 'on standoffs in the floor of its case' });
  const psu = B(`${nm} power supply`, [130, 40, 85], [-50, 42, -D / 2 + 70], { mat: 'steel-low', color: 0x9a9da1, finish: 'paint', fill: 0.25, fixed: 'screwed to the floor of its case' });
  // (its front stands up as a fascia the screen is set into, sloped back the way an instrument's is; its lid stands
  // proud of the case behind it, as its hinge and its handle need)
  const fascia = B(`${nm} front fascia`, [W, 86, 24], [0, 150, D / 2 - 26], { ...CASE, color: 0xe9eaec, rot: [-0.3, 0, 0], fixed: 'screwed to the front of its case' });
  const screen = [B(`${nm} screen`, [150, 62, 5], [0, 152, D / 2 - 14], { mat: 'glass', color: 0x121a16, finish: 'polished', rot: [-0.3, 0, 0], fixed: 'in its fascia' })];
  const feet = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => CYL(`${nm} foot`, 11, 8, [x! * (W / 2 - 25), 4, z! * (D / 2 - 30)], { mat: 'rubber', color: 0x1c1c1e, finish: 'moulded', item: 'stand-foot' }));
  const vents = [-1, 1].map((sg) => B(`${nm} vent`, [4, 60, 150], [sg * (W / 2 - 2), 70, -40], { mat: 'abs', color: 0x9fa3a8, finish: 'moulded', fill: 0.3, fixed: 'louvres moulded into its case\'s side' }));
  const inner = [block, lid, ...peltiers, sink, fan, board, psu, fascia, ...screen, ...vents, ...feet];
  const shell = B(`${nm} case`, [W, 112, D], [0, 64, 0], { ...CASE, color: 0xe9eaec, shell: wall * mm, fixed: 'its halves screwed together' });
  return [{ name: nm, at: [0, 0, 0], parts: [toWeigh(shell, T100.kg, inner, massOf), ...inner] } as Part];
}

/** The 5425 centrifuge: its steel bowl in a moulded case, the 24-place angled rotor on its brushless motor, its lid
 *  with the latch that holds it shut while it spins, its board, supply and feet. */
export function centrifugeParts(nm = C5425.name, massOf: (p: Part) => number = () => 0): Part[] {
  const [W, , D] = C5425.size, rBowl = 92, yBowl = 100;
  const bowl = P(`${nm} bowl`, { cyl: [rBowl * mm, 90 * mm] }, { mat: 'stainless-304', color: 0xc8ccd0, finish: 'brushed', item: 'centrifuge-bowl', shell: 1.2 * mm, at: [0, yBowl * mm, 0], rot: [0, 0, 0], fixed: 'bolted to the case, its motor hung under it' });
  // (its rotor: a turned aluminium cone with 24 bores at 45°, each a tube's place; its force comes from how far out
  // they sit, which its own top speed and top force give)
  const bores = Array.from({ length: 24 }, (_, k) => { const a = (2 * PI * k) / 24; return { r: 5.5 * mm, depth: 42 * mm, at: [Math.cos(a) * 55 * mm, 26 * mm, Math.sin(a) * 55 * mm] as V3, dir: [Math.cos(a) * Math.SQRT1_2, -Math.SQRT1_2, Math.sin(a) * Math.SQRT1_2] as V3 }; });
  const rotor = P(`${nm} rotor`, { cyl: [78 * mm, 52 * mm, 44 * mm] }, { mat: 'al-7075', color: 0xb6babf, finish: 'anodised', item: 'centrifuge-rotor', cuts: bores, at: [0, (yBowl - 14) * mm, 0], fixed: 'on its motor\'s taper, its nut done up' });
  const motor = CYL(`${nm} motor`, 34, 90, [0, 34, 0], { mat: 'steel-electrical', color: 0x55585c, finish: 'cast', fill: 0.55, fixed: 'hung under the bowl on its damping mounts' });
  const lid = grp(`${nm} lid`, 'centrifuge-lid', [
    B(`${nm} lid`, [W - 8, 20, D - 24], [0, yBowl + 58, -6], { ...CASE, color: 0xe9eaec }),
    B(`${nm} lid window`, [112, 5, 112], [0, yBowl + 66, -6], { mat: 'pc', color: 0x9fb6c4, finish: 'polished', item: 'cover-glass' }),
    B(`${nm} lid latch`, [52, 22, 20], [0, yBowl + 50, D / 2 - 26], { mat: 'pom', color: 0x2b2e33, finish: 'moulded', fixed: 'its hook into the case, held shut while the rotor turns' })], { joint: 'hinge', fixed: 'hinged at the back; it cannot open while the rotor turns' });
  const hinge = [-1, 1].map((sg) => CYL(`${nm} lid hinge`, 7, 44, [sg * 60, yBowl + 50, -D / 2 + 16], { mat: 'steel-low', color: 0x6b6e72, finish: 'machined', rot: [0, 0, PI / 2], fixed: 'its pin through the case and the lid' }));
  const handle = B(`${nm} lid handle`, [70, 10, 22], [0, yBowl + 52, D / 2 - 14], { mat: 'abs', color: 0x2b2e33, finish: 'moulded', fixed: 'moulded into the lid\'s front edge' });
  const board = B(`${nm} control board`, [150, 1.6, 120], [0, 16, -20], { mat: 'fr4', color: 0x2f6b3a, item: 'pcb-bare', fixed: 'on standoffs in the floor of its case' });
  const psu = B(`${nm} power supply`, [120, 38, 80], [55, 28, -60], { mat: 'steel-low', color: 0x9a9da1, finish: 'paint', fill: 0.25, fixed: 'screwed to the floor of its case' });
  const fascia = B(`${nm} front fascia`, [W - 20, 64, 16], [0, yBowl - 4, D / 2 - 6], { ...CASE, color: 0xe9eaec, rot: [-0.25, 0, 0], fixed: 'in the front of its case' });
  const panel = B(`${nm} screen`, [120, 44, 5], [0, yBowl - 2, D / 2 + 1], { mat: 'glass', color: 0x121a16, finish: 'polished', rot: [-0.25, 0, 0], fixed: 'in its fascia' });
  const feet = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => CYL(`${nm} foot`, 13, 14, [x! * (W / 2 - 30), 7, z! * (D / 2 - 36)], { mat: 'rubber', color: 0x1c1c1e, finish: 'moulded', item: 'stand-foot' }));
  const inner = [bowl, rotor, motor, lid, ...hinge, handle, board, psu, fascia, panel, ...feet];
  const shell = { ...B(`${nm} case`, [W, 142, D], [0, 77, 0], { ...CASE, color: 0xe9eaec, shell: 3 * mm, fixed: 'its halves screwed together' }),
    cuts: [{ r: (rBowl + 4) * mm, depth: 30 * mm, at: [0, 71 * mm, 0] as V3, dir: [0, 1, 0] as V3 }] };
  return [{ name: nm, at: [0, 0, 0], parts: [toWeigh(shell, C5425.kg, inner, massOf), ...inner] } as Part];
}

/** The Mini-Sub Cell GT gel tank: its moulded base and lid, the platinum electrodes down each end, the clear casting
 *  tray with its gates, the comb standing in it, and the gel and buffer in it. */
export function gelTankParts(nm = MINISUB.name): Part[] {
  const [W, H, D] = MINISUB.size, wall = 4, gap = D - 30;
  const base = P(`${nm} tank`, { box: [W * mm, H * mm, D * mm] }, { mat: 'pmma', color: 0x9aa7b0, finish: 'polished', item: 'gel-tank', shell: wall * mm, at: [0, (H / 2) * mm, 0], fixed: 'one moulding' });
  // (a platinum wire down each end wall, 0.25 mm: the gap between them sets the field the supply's volts give)
  const wires = [-1, 1].map((s) => P(`${nm} ${s > 0 ? 'anode' : 'cathode'}`, { cyl: [0.125 * mm, (W - 2 * wall) * mm] }, { mat: 'platinum', color: 0xd8d8dc, finish: 'polished', item: 'gel-electrode', rot: [0, 0, PI / 2], at: [0, 10 * mm, (s * gap) / 2 * mm], fixed: 'threaded through the posts in its end wall' }));
  const tray = B(`${nm} casting tray`, [MINISUB.tray[0], 10, MINISUB.tray[1]], [0, 11, 0], { mat: 'pmma', color: 0xdde6ea, finish: 'polished', item: 'gel-tray', shell: 2.5 * mm, fixed: 'set in the tank, its gates against the walls' });
  // (its gel is the agarose set in the tray, nearly all water; the buffer stands a few mm over it)
  const gel = B(`${nm} gel`, [MINISUB.tray[0] - 5, 6, MINISUB.tray[1] - 5], [0, 12, 0], { mat: 'water', color: 0xe8f1f2, finish: 'diffused', item: 'gel-agarose' });
  const comb = grp(`${nm} comb`, 'gel-comb', [B(`${nm} comb back`, [MINISUB.tray[0], 3, 10], [0, 26, -MINISUB.tray[1] / 2 + 18], { mat: 'pmma', color: 0xdde6ea, finish: 'polished' }),
    ...Array.from({ length: 8 }, (_, k) => B(`${nm} comb tooth`, [5.5, 12, 1.5], [(k - 3.5) * 8, 18, -MINISUB.tray[1] / 2 + 18], { mat: 'pmma', color: 0xdde6ea, finish: 'polished' }))], { fixed: 'stood in the tray\'s slots while the gel sets, then lifted out' });
  const buffer = B(`${nm} buffer`, [W - 2 * wall, 9, D - 2 * wall], [0, 14.5, 0], { mat: 'water', color: 0xcfe3ea, finish: 'diffused', item: 'gel-buffer', says: `${MINISUB.bufferMl} ml` });
  const lid = grp(`${nm} lid`, 'gel-lid', [B(`${nm} lid`, [W, 14, D], [0, H + 7, 0], { mat: 'pmma', color: 0x9aa7b0, finish: 'polished', shell: 3 * mm }),
    ...[-1, 1].map((s) => CYL(`${nm} lid ${s > 0 ? 'red' : 'black'} lead`, 4, 30, [0, H + 24, (s * gap) / 2], { mat: 'pvc', color: s > 0 ? 0xcc2222 : 0x15161a, finish: 'moulded', fixed: 'moulded into the lid, its plug onto the electrode post', parts: [CYL(`${nm} lid ${s > 0 ? 'red' : 'black'} plug`, 2, 16, [0, -22, 0], { mat: 'brass', color: 0xc8a63a, finish: 'polished', item: 'banana-plug', fixed: 'on the electrode post' })] }))],
  { fixed: 'it sits on the tank, and the supply cannot be plugged in until it does' });
  return [{ name: nm, at: [0, 0, 0], parts: [base, ...wires, tray, gel, comb, buffer, lid] } as Part];
}

/** The PowerPac Basic supply: its case, its board and transformer, its display and keypad, and its four jacks. */
export function supplyParts(nm = POWERPAC.name, massOf: (p: Part) => number = () => 0): Part[] {
  const [W, H, D] = POWERPAC.size;
  const inner = [
    B(`${nm} board`, [W - 30, 1.6, D - 40], [0, 12, 0], { mat: 'fr4', color: 0x2f6b3a, item: 'pcb-bare', fixed: 'on standoffs in its case' }),
    { ...B(`${nm} transformer`, [70, 36, 60], [-40, 32, -30], { mat: 'steel-electrical', color: 0x3a3d42, finish: 'cast', item: 'transformer-ferrite', fill: 0.6, fixed: 'bolted to its board' }),
      parts: [B(`${nm} transformer bobbin`, [34, 30, 34], [0, 0, 0], { mat: 'pbt', color: 0x24262a, finish: 'moulded', item: 'bobbin' }),
        ...[0, 1, 2].map((k) => P(`${nm} transformer winding`, { cyl: [17 * mm, 7 * mm] }, { mat: 'magnet-wire', color: 0xb87333, finish: 'wound', item: 'winding', at: [0, (k - 1) * 9 * mm, 0], fill: 0.7 }))] },
    // (its face: a panel sloped up from the top deck, its display in it and its keys on the deck below, where a hand
    // reaches them; a supply like this is stacked under the next one, so nothing stands higher than its fascia)
    B(`${nm} fascia`, [W - 20, 52, 14], [0, H + 20, D / 2 - 44], { ...CASE, color: 0xdcdee1, rot: [-0.55, 0, 0], fixed: 'moulded into the top of its case' }),
    B(`${nm} display`, [104, 34, 4], [-30, H + 22, D / 2 - 37], { mat: 'glass', color: 0x121a16, finish: 'polished', rot: [-0.55, 0, 0], fixed: 'in its fascia' }),
    ...Array.from({ length: 6 }, (_, k) => B(`${nm} key`, [18, 8, 12], [-46 + (k % 3) * 24, H + 5, D / 2 - 18 - Math.floor(k / 3) * 16], { mat: 'silicone', color: 0x2b2e33, finish: 'moulded', fixed: 'through the top deck' })),
    // (its four output jacks on the deck behind the fascia: a red and a black for each of its two outputs)
    ...[-1, 1].flatMap((sg) => [0, 1].map((j) => ({ ...CYL(`${nm} ${sg > 0 ? 'red' : 'black'} jack`, 8, 16, [sg * (34 + j * 26), H + 8, -D / 2 + 46], { mat: 'abs', color: sg > 0 ? 0xcc2222 : 0x15161a, finish: 'moulded', fixed: 'in its top deck' }),
      parts: [CYL(`${nm} ${sg > 0 ? 'red' : 'black'} jack socket`, 4.5, 14, [0, 2, 0], { mat: 'brass', color: 0xc8a63a, finish: 'polished', fixed: 'the lead\'s plug pushes into it' })] }))),
    B(`${nm} mains inlet`, [30, 26, 12], [-72, 20, -D / 2 + 2], { mat: 'pbt', color: 0x15161a, finish: 'moulded', fixed: 'in its back panel' }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => CYL(`${nm} foot`, 9, 5, [x! * (W / 2 - 22), 2.5, z! * (D / 2 - 26)], { mat: 'rubber', color: 0x1c1c1e, finish: 'moulded', item: 'stand-foot' })),
  ];
  const shell = B(`${nm} case`, [W, H, D], [0, H / 2 + 3, 0], { ...CASE, color: 0xdcdee1, shell: 2.5 * mm, fixed: 'its halves screwed together' });
  return [{ name: nm, at: [0, 0, 0], parts: [toWeigh(shell, POWERPAC.kg, inner, massOf), ...inner] } as Part];
}

/** The Safe Imager 2.0: its case, the blue LED array under its diffuser, the viewing surface, and its amber filter
 *  standing over it. */
export function transilluminatorParts(nm = SAFE_IMAGER.name, massOf: (p: Part) => number = () => 0): Part[] {
  const [W, H, D] = SAFE_IMAGER.size, [vw, vd] = SAFE_IMAGER.view;
  const leds = Array.from({ length: 8 * 8 }, (_, k) => B(`${nm} LED`, [5, 2, 5], [((k % 8) - 3.5) * 24, 18, (Math.floor(k / 8) - 3.5) * 24], { mat: 'epoxy-clear', color: 0x2f6bff, finish: 'moulded', light: { lm: 12, color: 0x2f6bff } }));
  const inner = [
    B(`${nm} LED board`, [vw, 1.6, vd], [0, 15, 0], { mat: 'fr4', color: 0x16305a, item: 'pcb-bare', fixed: 'screwed to the floor of its case' }), ...leds,
    B(`${nm} diffuser`, [vw, 2, vd], [0, 26, 0], { mat: 'pmma', color: 0xdfe6ee, finish: 'diffused', fixed: 'over the LEDs' }),
    B(`${nm} viewing surface`, [vw, 4, vd], [0, H - 2, 0], { mat: 'glass', color: 0xdfe9f2, finish: 'polished', item: 'cover-glass', glow: true, fixed: 'bonded into the top of its case' }),
    // (the rim its surface is set into, and the switch at its front corner)
    ...[[0, 1], [0, -1], [1, 0], [-1, 0]].map(([ax, az], k) => B(`${nm} rim`, [ax ? 14 : W, 10, az ? 14 : D], [(ax ?? 0) * (W / 2 - 7), H - 5, (az ?? 0) * (D / 2 - 7)], { ...CASE, color: 0xcfd2d6, says: k === 0 ? 'the lip its glass sits in' : undefined })),
    B(`${nm} switch`, [20, 10, 14], [W / 2 - 30, H - 5, D / 2 - 16], { mat: 'abs', color: 0x2b2e33, finish: 'moulded', fixed: 'in its rim' }),
    B(`${nm} power inlet`, [24, 20, 10], [-W / 2 + 26, 16, -D / 2 + 5], { mat: 'pbt', color: 0x15161a, finish: 'moulded', fixed: 'in its back panel' }),
    ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => CYL(`${nm} foot`, 9, 6, [x! * (W / 2 - 20), 3, z! * (D / 2 - 24)], { mat: 'rubber', color: 0x1c1c1e, finish: 'moulded', item: 'stand-foot' })),
  ];
  // (its amber screen on two uprights at the back, leaning forward over the surface: a gel is looked at through it)
  const filter = grp(`${nm} amber filter`, 'amber-filter', [
    B(`${nm} amber filter screen`, [vw + 30, 150, 6], [0, H + 80, -vd / 2 + 30], { mat: 'pmma', color: 0xd79b2a, finish: 'polished', rot: [0.5, 0, 0] }),
    ...[-1, 1].map((sg) => B(`${nm} amber filter upright`, [10, 70, 10], [sg * (vw / 2 + 10), H + 35, -vd / 2 + 6], { mat: 'abs', color: 0x2b2e33, finish: 'moulded' })),
    ...[-1, 1].map((sg) => B(`${nm} amber filter foot`, [26, 8, 40], [sg * (vw / 2 + 10), H + 4, -vd / 2 + 6], { mat: 'abs', color: 0x2b2e33, finish: 'moulded' }))], { fixed: 'stood on the case, its screen leaning over the viewing surface' });
  const shell = B(`${nm} case`, [W, H, D], [0, H / 2, 0], { ...CASE, color: 0xdcdee1, shell: 3 * mm, fixed: 'its halves screwed together' });
  return [{ name: nm, at: [0, 0, 0], parts: [toWeigh(shell, SAFE_IMAGER.kg, [...inner, ...(filter.parts ?? [])], massOf), ...inner, filter] } as Part];
}

/** The Research plus pipette: its moulded body, the plunger and its spring, the piston down its barrel, the volume it
 *  is set to in its window, the tip ejector beside it, and the cone a tip pushes onto. */
export function pipetteParts(nm = RESEARCH_PLUS.name, massOf: (p: Part) => number = () => 0): Part[] {
  const L = RESEARCH_PLUS.length;
  const inner = [
    grp(`${nm} plunger`, 'pipette-plunger', [CYL(`${nm} plunger button`, 11, 14, [0, L + 4, 0], { mat: 'pp', color: 0x2f6bff, finish: 'moulded' }),
      CYL(`${nm} plunger rod`, 3.5, 60, [0, L - 32, 0], { mat: 'stainless-304', color: 0xc8ccd0, finish: 'polished' })], { joint: 'slide', fixed: 'pressed down to its first stop to draw, past it to blow out' }),
    P(`${nm} plunger spring`, { cyl: [6 * mm, 36 * mm] }, { mat: 'steel-spring', color: 0x8d9196, finish: 'polished', item: 'spring-compression', fill: 0.25, at: [0, (L - 60) * mm, 0], fixed: 'round the plunger rod, in the body' }),
    CYL(`${nm} piston`, 3, 40, [0, L - 110, 0], { mat: 'stainless-304', color: 0xc8ccd0, finish: 'polished', item: 'pipette-piston', fixed: 'on the plunger, sealed in the barrel' }),
    CYL(`${nm} piston seal`, 3.6, 5, [0, L - 130, 0], { mat: 'ptfe', color: 0xf2f2ef, finish: 'moulded', item: 'piston-seal', fixed: 'in the barrel round the piston' }),
    B(`${nm} volume window`, [12, 22, 3], [0, L - 58, 13], { mat: 'pmma', color: 0xe8edf2, finish: 'polished', item: 'pipette-dial', fixed: 'in the body, the counter behind it' }),
    grp(`${nm} tip ejector`, 'pipette-ejector', [CYL(`${nm} tip ejector button`, 8, 12, [0, L - 14, 13], { mat: 'pp', color: 0x9aa0a6, finish: 'moulded' }),
      B(`${nm} tip ejector arm`, [9, 150, 5], [0, L - 100, 12.5], { mat: 'pp', color: 0x9aa0a6, finish: 'moulded' }),
      CYL(`${nm} tip ejector collar`, 6.5, 12, [0, 40, 0], { mat: 'pp', color: 0x9aa0a6, finish: 'moulded' })], { joint: 'slide', fixed: 'pressed to push the used tip off the cone' }),
    P(`${nm} tip cone`, { cyl: [4 * mm, 36 * mm, 2.6 * mm] }, { mat: 'pp', color: 0xdfe3e7, finish: 'moulded', item: 'pipette-cone', at: [0, 20 * mm, 0], fixed: 'the tip pushed onto it' }),
  ];
  const shell = P(`${nm} body`, { cyl: [13 * mm, (L - 60) * mm, 9 * mm] }, { mat: 'pp', color: 0xdfe3e7, finish: 'moulded', item: 'pipette-body', at: [0, ((L - 60) / 2 + 38) * mm, 0], shell: 1.6 * mm, fixed: 'its halves clipped together' });
  return [{ name: nm, at: [0, 0, 0], parts: [toWeigh(shell, RESEARCH_PLUS.kg, inner, massOf), ...inner] } as Part];
}

/** A 4 ft Class II A2 cabinet: its stainless work zone, its sloping sash glass that stops at its certified opening, the
 *  two HEPA filters (one down over the work, one out through the top) with the blower between them, its plenum and
 *  its stand. */
export function cabinetParts(nm = BSC_A2.name, massOf: (p: Part) => number = () => 0): Part[] {
  const [W, Dp, Hin] = [BSC_A2.inner[0], BSC_A2.inner[1], BSC_A2.inner[2]], stand = 760, wall = 20;
  const y0 = stand, back = -Dp / 2;
  const tray = B(`${nm} work tray`, [W, 12, Dp], [0, y0 + 6, 0], { mat: 'stainless-304', color: 0xc8ccd0, finish: 'brushed', item: 'bsc-tray', fixed: 'lifted out of the work zone to be cleaned' });
  const grilles = [-1, 1].map((s) => B(`${nm} ${s > 0 ? 'front' : 'back'} air grille`, [W, 24, 60], [0, y0 + 12, (s * (Dp / 2 - 40))], { mat: 'stainless-304', color: 0xa6abb0, finish: 'brushed', item: 'bsc-grille', fill: 0.4, fixed: 'the air drawn down through it into the plenum' }));
  const downflow = B(`${nm} downflow HEPA filter`, [W - 60, 70, Dp - 100], [0, y0 + Hin - 40, 0], { mat: 'glass', color: 0xf0ece0, finish: 'texture', fill: 0.2, fixed: 'clamped in its frame over the work zone' });
  const exhaust = B(`${nm} exhaust HEPA filter`, [W - 300, 70, 260], [0, y0 + Hin + 130, back + 120], { mat: 'glass', color: 0xf0ece0, finish: 'texture', fill: 0.2, fixed: 'clamped in its frame under the exhaust collar' });
  const blower = grp(`${nm} blower`, 'bsc-blower', [CYL(`${nm} blower scroll`, 130, 150, [0, y0 + Hin + 50, back + 240], { mat: 'steel-low', color: 0x9a9da1, finish: 'paint', shell: 1 * mm, rot: [PI / 2, 0, 0] }),
    CYL(`${nm} blower motor`, 48, 90, [0, y0 + Hin + 50, back + 330], { mat: 'steel-electrical', color: 0x55585c, finish: 'cast', fill: 0.55, rot: [PI / 2, 0, 0] })], { fixed: 'hung in the plenum between the filters; it holds its airflow as the filters load' });
  // (its sash: toughened glass on a counterweight, its opening the 254 mm its certification is for)
  const sash = grp(`${nm} sash`, 'bsc-sash', [B(`${nm} sash glass`, [W + 2 * wall, 620, 8], [0, y0 + BSC_A2.sash + 310, Dp / 2 + 30], { mat: 'glass', color: 0xd8e6ea, finish: 'polished', rot: [0.18, 0, 0] })],
    { joint: 'slide', fixed: `slid up and down; its certified opening is ${BSC_A2.sash} mm, and it alarms away from it` });
  const sides = [-1, 1].map((s) => B(`${nm} side wall`, [wall, Hin + 240, Dp + 60], [s * (W / 2 + wall / 2), y0 + (Hin + 240) / 2, 0], { mat: 'steel-low', color: 0xe4e6e9, finish: 'paint', item: 'bsc-panel' }));
  const shellParts = [
    B(`${nm} back wall`, [W + 2 * wall, Hin + 240, wall], [0, y0 + (Hin + 240) / 2, back - 30], { mat: 'steel-low', color: 0xe4e6e9, finish: 'paint', item: 'bsc-panel' }),
    B(`${nm} top`, [W + 2 * wall, wall, Dp + 60], [0, y0 + Hin + 240, 0], { mat: 'steel-low', color: 0xe4e6e9, finish: 'paint', item: 'bsc-panel' }),
    B(`${nm} exhaust collar`, [260, 90, 260], [0, y0 + Hin + 285, back + 120], { ...STEEL, item: 'bsc-panel', shell: 1.5 * mm, fixed: 'the duct to the room or the roof clamped onto it' }),
  ];
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z]) => B(`${nm} stand leg`, [50, stand, 50], [x! * (W / 2 - 40), stand / 2, z! * (Dp / 2 - 40)], { ...STEEL, color: 0x3a3d42, item: 'bsc-stand', shell: 2 * mm }));
  const panel = B(`${nm} control panel`, [300, 60, 10], [W / 2 - 200, y0 + Hin + 70, Dp / 2 + 26], { mat: 'abs', color: 0x2b2e33, finish: 'moulded', fixed: 'in its front fascia, its airflow alarm in it' });
  const inner = [tray, ...grilles, downflow, exhaust, blower, sash, ...sides, ...shellParts, ...legs, panel];
  // (its own weight spread over its steel: what is left of its 180 kg once what is in it is counted)
  const steel = inner.filter((p) => p.item === 'bsc-panel' || p.item === 'bsc-stand');
  const rest = inner.filter((p) => !steel.includes(p)).reduce((a, b) => a + massOf(b), 0);
  const solid = steel.reduce((a, b) => a + massOf({ ...b, fill: 1, shell: undefined }), 0), fill = Math.max(0.03, Math.min(1, (BSC_A2.kg - rest) / solid));
  return [{ name: nm, at: [0, 0, 0], parts: inner.map((p) => (steel.includes(p) ? { ...p, shell: undefined, fill } : p)) } as Part];
}

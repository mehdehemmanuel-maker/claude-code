// A maker's own 3D assembly (its CAD exported: tools/measure/xml3d.py reads a 3DXML into a data file under models/) and
// what of it the library makes: each part's name, as makers name parts ("2040 profile", "42-34 motor", "625pillow",
// "M4X8 Socket Head Screw"), read into the library's words for it ("extrusion 2040 400", "stepper nema17 34",
// "bearing 625", "screw M4x8"), its size from its own measured box; the rest said as what it is and what it is made of,
// to be drawn as its measured box until the library draws it. Pure: the drawing is components.ts's (`modelPart`).
// Owner of: reading a maker's model's parts into library words, and its bill of materials.

/** One part of a maker's model: its reference's name, its instance's name, its place (the model's 3×4 matrix, rows:
 *  rotation then translation, mm), its box in its own frame (min x y z, max x y z, mm), its surface's middle (mm) and
 *  how much of each of its box's faces its surface covers (x-, x+, y-, y+, z-, z+; 0 open to 1 whole). */
export type ModelPart = [name: string, inst: string, m: number[], box: number[], mid: number[], faces?: number[]];
export interface MakerModel { id: string; name: string; src: string; parts: ModelPart[] }
/** Which way each maker's model faces, in its own frame: the Ender-3's front is its -z (its screen and its bed's front
 *  there, its Y motor at +z, its Z screw and extruder at +x, its left as one faces it: measured from its parts). The
 *  library's things face +x. */
export const FRONT: Record<string, [number, number, number]> = { ender3: [0, 0, -1] };

/** A part's size along its own axes, mm, largest first. */
export const extents = (p: ModelPart): number[] => [p[3][3]! - p[3][0]!, p[3][4]! - p[3][1]!, p[3][5]! - p[3][2]!];
const longest = (p: ModelPart) => Math.round(Math.max(...extents(p)));
/** How far the two extents other than k are from a hexagon's corners over its flats (2/√3). */
const hexness = (e: number[], k: number) => { const [a, b] = [e[(k + 1) % 3]!, e[(k + 2) % 3]!]; return Math.abs(Math.max(a, b) / Math.min(a, b) - 2 / Math.sqrt(3)); };
/** A round part's diameter (its two like extents) and length (the third), mm, to a tenth. */
const round2 = (p: ModelPart): [number, number] => { const e = extents(p), k = [0, 1, 2].sort((a, b) => Math.abs(e[(a + 1) % 3]! - e[(a + 2) % 3]!) - Math.abs(e[(b + 1) % 3]! - e[(b + 2) % 3]!))[0]!; return [+((e[(k + 1) % 3]! + e[(k + 2) % 3]!) / 2).toFixed(1), +e[k]!.toFixed(1)]; };

/** How makers name the parts the library makes: the library's words for each, from its name and its measured size; null
 *  where the library does not make it. */
export function libraryWords(p: ModelPart): string | null {
  const n = p[0].trim(), M = /\bM(\d+(?:\.\d+)?)\s*[X×x*]\s*(\d+(?:\.\d+)?)/.exec(n);
  let m: RegExpExecArray | null;
  if ((m = /^(2020|2040|3030|4040)\s*profile$/i.exec(n))) return `extrusion ${m[1]} ${longest(p)}`;
  // (a NEMA 17 named by its frame and body length either way round: "42-34 motor", "40-42 motor"; socketed, a 6-way PH
  // socket taking its cable, as the Ender-3's are: its cable's motor end, sellers of its spares list it so)
  if ((m = /^(\d{2})-(\d{2})\s*motor$/i.exec(n))) { const [a, b] = [Number(m[1]), Number(m[2])], len = a === 42 ? b : a; return `stepper nema17 ${len} socket`; }
  if ((m = /^F?(6\d\d|68\d)\s*(?:zz|2rs|u)?\s*pillow$/i.exec(n))) return `bearing ${m[1]}`;
  if (/2GT-pulley|GT2 pulley/i.test(n)) return 'pulley 20 5';
  if (M && /socket head|杯头/i.test(n)) return `screw M${M[1]}x${M[2]}`;
  if (M && /pan\s*head/i.test(n)) return `panhead M${M[1]}x${M[2]}`;
  if (M && /^M\d+\s*[X×]\s*\d+\s*screw$/i.test(n)) return `screw M${M[1]}x${M[2]}`;
  if ((m = /^M(\d+)\s*self-locking nut/i.exec(n))) return `nut M${m[1]} lock`;
  if ((m = /^M(\d+)\s*nut$/i.exec(n))) return `nut M${m[1]}`;
  if ((m = /^M(\d+)\s*split washer/i.exec(n))) return `springwasher M${m[1]}`;
  if ((m = /^M(\d+)\s*washer\d*$/i.exec(n))) return `washer M${m[1]}`;
  if (M && /flush head|countersunk/i.test(n)) return `countersunk M${M[1]}x${M[2]}`;
  // (a lead screw's lead is not in its model: 8 mm a turn, the Ender-3's (Marlin's Ender-3 configuration, 400 steps a mm
  // on a 1.8° stepper at 16 microsteps: 3200 / 400), a T8's 2 mm pitch in four starts)
  if (/^z threaded rod$|lead ?screw/i.test(n)) return `leadscrew T${Math.round(Math.min(...extents(p)))} p2 s4 ${longest(p)}`;
  // (the hot end's: an MK8 nozzle, 0.4 mm, brass, as the Ender-3 ships; its heater 24 V 40 W, 6 × 20 mm, and its NTC 100 kΩ,
  // β 3950, as sellers of its spares list them; its hot end's 40 × 10 mm fan; the coupler from its stepper's 5 mm shaft
  // to its 8 mm screw)
  if (/^nozzle$/i.test(n)) return 'printnozzle MK8 d0.4 brass';
  if (/^heater$/i.test(n)) return 'heater 6x20 40W 24V';
  if (/thermistor/i.test(n)) return 'thermistor 100k 3950';
  if (/^cold section fan$/i.test(n)) { const [a, , c] = [...extents(p)].sort((x, y) => y - x); return `fan ${Math.round(a!)}x${Math.round(c! / 5) * 5} 24V`; }
  if (/^z coupler$/i.test(n)) return 'coupling 5x8';
  // (its hot end's block, heat break, heat sink, PTFE tube and couplers: kinds/plant.ts sizes them from this model)
  if (/^heat block$/i.test(n)) return 'heatblock mk8';
  // (its profiles' end caps, its bed's levelling wheels, its extruder's drive gear; its belts, each a loop across its
  // box's height, its length the oval's: two runs and two turns)
  if ((m = /^(2020|2040|4040|3030)\s*endcap$/i.exec(n))) return `endcap ${m[1]}`;
  if (/^hand twisted nut$/i.test(n)) { const [D, T] = round2(p); return `thumbwheel M4 D${D} t${T}`; }
  if (/^e gear$/i.test(n)) return 'drivegear mk8';
  if (/^limit switch$/i.test(n)) return 'endstop creality';
  if (/^[xy] belt$/i.test(n)) { const e = [...extents(p)].sort((a, b) => b - a), d = +(e[1]! - 1.4).toFixed(1), L = Math.round(2 * (e[0]! - e[1]!) + Math.PI * d); return `belt GT2 ${L} ${Math.round(e[2]!)}mm loop d${d}`; }
  if (/^catheter$|heat ?break|throat/i.test(n)) return `heatbreak L${longest(p)} ptfe`;
  if (/^radiator$/i.test(n)) return 'hotendsink ender3';
  if (/teflon tube|ptfe tube/i.test(n)) return `bowden od4 id2 L${longest(p)}`;
  if ((m = /^M(\d+)\s*pneumatic joint$/i.exec(n))) return `tubefit M${m[1]}`;
  if (/^pneumatic joint$/i.test(n)) return 'tubefit M10';
  // (its V-slot wheels and what they ride on: a round part's two like extents its diameter, the third its length)
  if (/^rollers?$|v ?wheel/i.test(n)) return 'vwheel solid pom';
  // (its T-slot nuts, in its profiles' 6 mm slots; its bed's and extruder's springs, as measured (8.9 mm across, 17.1 long),
  // their wire 0.8 mm and five active coils typical; a bare "M3 Screw" as long as it is wide, a set screw)
  if ((m = /^M(\d+)\s*T-?slot nut$/i.exec(n))) return `slotnut slot6 M${m[1]} hammer`;
  // (its bed's springs yellow, as the Ender-3's are in its photos; its extruder's plain)
  if (/^(bed level|extrusion) springs?$/i.test(n)) { const [od, L] = round2(p); return `spring d0.8 D${+(od - 0.8).toFixed(1)} L${L} n5${/bed/i.test(n) ? ' yellow' : ''}`; }
  if ((m = /^M(\d+)\s*screw$/i.exec(n)) && Math.max(...extents(p)) < 2 * Number(m[1])) return `setscrew M${m[1]}x${Math.round(Math.max(...extents(p)))}`;
  if (/spacers? for rollers?|^spacer/i.test(n)) { const [d, L] = round2(p); return `spacer M5 d${d} L${L} aluminium`; }
  // (a hex part's length: the extent left when its corners and flats, 2/√3 apart, are taken out)
  if (/eccentric/i.test(n)) { const e = extents(p), k = [0, 1, 2].sort((a, b) => hexness(e, a) - hexness(e, b))[0]!; return `eccentric h6 r${+(e[k]! - 6).toFixed(1)} stainless`; }
  return null;
}

/** Parts a maker's model lists apart that the library draws inside another: a lead screw's nut, which its model has
 *  where its carriage holds it. Each: the model's part, the part it is drawn in, and its item there. */
export const DRAWN_IN: { name: RegExp; in: RegExp; item: string }[] = [{ name: /^z nut$/i, in: /^z threaded rod$|lead ?screw/i, item: 'lead-nut' }];

/** What a part the library does not make yet is, by its name: what it is made of, its colour and how much of its box it
 *  fills (a power supply's case is mostly air), as typical of such parts (estimates), so its measured box is drawn as
 *  what it is. */
export function boxedAs(name: string): { mat: string; color: number; finish: string; says: string; fill: number; sheet?: number } {
  const R: [RegExp, string, number, string, string, number?][] = [
    [/flush head screw|countersunk/i, 'steel-alloy', 0x2a2b2e, 'plate', 'a countersunk screw'],
    [/t-slot nut/i, 'steel-low', 0x8e9398, 'plate', 'a T-slot nut'],
    [/threaded rod|lead ?screw/i, 'stainless-304', 0xb9bdc2, 'ground', 'a lead screw'],
    [/rollers?|v ?wheel/i, 'pom', 0x1d1e21, 'moulded', 'a V-slot wheel', 0.8],
    [/spacer/i, 'al-6061', 0xb9bdc2, 'cast', 'a spacer'],
    [/eccentric/i, 'steel-low', 0xc9cdd1, 'plate', 'an eccentric spacer'],
    [/hot ?bed/i, 'al-6061', 0xc9cdd1, 'cast', 'the heated bed\'s aluminium plate'],
    [/power supply/i, 'al-5052', 0xb9bdc2, 'cast', 'the power supply', 0.12],
    [/enclosure|control panel/i, 'steel-low', 0x26282b, 'paint', 'a sheet-steel case', -1],
    [/lcd(?! support)|display/i, 'fr4', 0x1d1e21, 'moulded', 'the display', 0.35],
    [/fan(?! cover| duct)/i, 'pbt', 0x1a1b1d, 'moulded', 'a fan', 0.25],
    [/belt/i, 'rubber', 0x1a1b1d, 'moulded', 'a GT2 belt'],
    [/nozzle$/i, 'brass', 0xc9a24a, 'cast', 'the nozzle'],
    [/heat block/i, 'al-6061', 0xc9cdd1, 'cast', 'the heat block'],
    [/heater/i, 'stainless-304', 0xb9bdc2, 'cast', 'the heater cartridge'],
    [/thermistor/i, 'glass', 0x3a2a1a, 'moulded', 'the thermistor'],
    [/radiator|heat ?sink/i, 'al-6061', 0xc9cdd1, 'cast', 'the hot end\'s heat sink', 0.6],
    [/catheter|heat ?break|throat/i, 'stainless-304', 0xb9bdc2, 'cast', 'the heat break'],
    [/teflon|ptfe/i, 'ptfe', 0xf2f2ee, 'moulded', 'the PTFE tube'],
    [/pneumatic|joint/i, 'brass', 0xc9a24a, 'cast', 'a push-fit coupler', 0.5],
    [/spring/i, 'steel-spring', 0xc9cdd1, 'cast', 'a spring', 0.15],
    [/switch/i, 'pbt', 0x1d1e21, 'moulded', 'a switch', 0.4],
    [/knob/i, 'abs', 0x1d1e21, 'moulded', 'a knob'],
    [/gear/i, 'brass', 0xc9a24a, 'cast', 'the drive gear'],
    [/copper cover|clamp/i, 'brass', 0xc9a24a, 'cast', 'a belt clamp'],
    [/plate|bracket|holder|stent|block|mount|frame|support|tensioner/i, 'al-6061', 0x2a2c30, 'anodised', 'a bracket', -2],
    [/housing|cover|duct|cap/i, 'abs', 0x1d1e21, 'moulded', 'a moulded part', 0.3],
  ];
  // (a fill below zero: folded from sheet that thick, mm: a case 1 mm steel, a bracket 2 mm aluminium, estimates)
  const r = R.find(([re]) => re.test(name)); return r ? { mat: r[1], color: r[2], finish: r[3], says: r[4], fill: (r[5] ?? 1) < 0 ? 1 : r[5] ?? 1, ...((r[5] ?? 1) < 0 ? { sheet: -r[5]! } : {}) } : { mat: 'abs', color: 0x3a3c40, finish: 'moulded', says: 'a part', fill: 0.5 };
}

/** The model's bill of materials as the library has it: how many of each library part, and what is drawn as its box. */
export function billOf(model: MakerModel): { words: Record<string, number>; boxed: Record<string, number> } {
  const words: Record<string, number> = {}, boxed: Record<string, number> = {};
  // (a part drawn inside another, the screw's nut, counted in it)
  const within = (p: ModelPart) => DRAWN_IN.some((d) => d.name.test(p[0]) && model.parts.some((q) => d.in.test(q[0]) && libraryWords(q)));
  for (const p of model.parts) { if (within(p)) continue; const w = libraryWords(p); if (w) words[w] = (words[w] ?? 0) + 1; else boxed[p[0]] = (boxed[p[0]] ?? 0) + 1; }
  return { words, boxed };
}

// The materials processor: what a material becomes by what process on what machine, as edges between them (a
// process joining what a machine can do to what a material needs), the way the lessons are made (./edges.ts): every
// figure from a maker's data sheet, a standard or the machine's own model, every step's words from those figures, and
// what cannot be done refused with why. First its three heats: a filament printed (a printer's nozzle, bed, enclosure,
// nozzle hardness and size against the filament maker's ranges), clay fired (a kiln's reach against Orton's cone for
// the body, as a program the workshop's kiln runs), metal melted and poured (./cell.ts's furnace and metals). Then metal
// printed two ways: a bound-metal filament printed oversize, its binder taken out and its powder sintered to steel
// (BASF's Ultrafuse 316L on the Voron), and a powder bed melted by a laser layer on layer (EOS's M 290); every hazard
// said plainly.
// Owner of: the process edges between materials and machines, their settings, schedules, steps and refusals.

import { Kiln, Furnace, METALS, type Metal, type Segment } from './cell';

export interface Step { do: string; check?: string }
/** A process done on a machine: its settings, its steps, what to watch for, and what stops it. */
export interface Made<S> { ok: boolean; refused: string[]; warn: string[]; settings: S; steps: Step[]; src: string }

// ---- printing --------------------------------------------------------------------------------------------------------
/** A filament as its maker gives it: the nozzle and bed it prints at (°C), the part fan (%), and what else it needs. */
export interface Filament { id: string; name: string; nozzle: [number, number]; bed: [number, number]; fan?: number; enclose?: 'helps'; abrasive?: boolean; metal?: BoundMetal; src: string }
/** A bound-metal filament: its metal powder held in a binder, printed oversize, the binder taken out (debound) and the
 *  powder sintered to a dense part that shrinks to size. Its alloy, how much larger it is printed (x and y, z), how fast
 *  (mm/s), what it prints on, the sintered part's density (kg/m³) and strength (MPa), and the filament's own: its
 *  diameter, and the spool's length and mass, from which its density as printed follows. */
export interface BoundMetal { alloy: string; scale: [number, number]; speed: [number, number]; sheet: string; sintered: number; tensile: number; spool: { d: number; m: number; kg: number } }
export const FILAMENTS: Filament[] = [
  { id: 'pla', name: 'PLA', nozzle: [200, 220], bed: [40, 60], fan: 100, src: 'Prusament PLA\'s technical data sheet (v1.1, 2022): nozzle 210 ± 10 °C, bed 40–60 °C, fan 100 %' },
  { id: 'petg', name: 'PETG', nozzle: [240, 260], bed: [70, 90], fan: 50, src: 'Prusament PETG\'s technical data sheet (v1.1, 2022): nozzle 250 ± 10 °C, bed 80 ± 10 °C, fan 50 %' },
  { id: 'asa', name: 'ASA', nozzle: [250, 270], bed: [105, 115], fan: 30, enclose: 'helps', src: 'Prusament ASA\'s technical data sheet (v1.1, 2022): nozzle 260 ± 10 °C, bed 110 ± 5 °C, fan 30 % (0–50); an enclosure against warping on large parts (typical)' },
  { id: 'ultrafuse-316l', name: 'Ultrafuse 316L', nozzle: [230, 250], bed: [90, 120],
    metal: { alloy: '316L stainless steel', scale: [1.2, 1.26], speed: [15, 50], sheet: 'glass with an approved glue, or polyimide tape (Dimafix suggested)', sintered: 7850, tensile: 561, spool: { d: 1.75, m: 250, kg: 3 } },
    src: 'BASF Forward AM\'s Ultrafuse 316L technical data sheet (v1.1, 2021): nozzle 230–250 °C, bed 90–120 °C on glass with approved glues or polyimide tape, a nozzle of 0.4 mm or more, 15–50 mm/s; 250 m of 1.75 mm on a 3 kg spool; sintered 7850 kg/m³ (ISO 1183-1), 561 MPa in XY; printed 1.20 times larger in X and Y and 1.26 in Z (its scaling, as sellers of it give BASF\'s figures)' },
  { id: 'pc', name: 'PC Blend', nozzle: [265, 285], bed: [100, 120], enclose: 'helps', src: 'Prusa\'s knowledge base: Prusament PC Blend at 275 ± 10 °C, bed 110 ± 10 °C (115 after the first layer; small parts at 100); an enclosure helps large parts (typical)' },
];
/** A printer as its maker gives it: the hottest nozzle and bed it reaches (°C), what it prints in (mm), and whether it is
 *  enclosed and its nozzle hardened (for abrasive, fibre-filled filaments). */
export interface Printer { id: string; name: string; nozzle: number; bed: number; volume: [number, number, number]; enclosed: boolean; hardened: boolean; src: string }
export const PRINTERS: Printer[] = [
  { id: 'prusa-mini-plus', name: 'the Original Prusa MINI+', nozzle: 280, bed: 100, volume: [180, 180, 180], enclosed: false, hardened: false, src: 'Prusa\'s specifications: nozzle to 280 °C, bed to 100 °C, 180 × 180 × 180 mm, Bowden extruder, open frame' },
  { id: 'prusa-mk4', name: 'the Original Prusa MK4', nozzle: 290, bed: 120, volume: [250, 210, 220], enclosed: false, hardened: false, src: 'Prusa\'s comparison table: hotend 290 °C, bed 120 °C, 250 × 210 × 220 mm, open frame' },
  { id: 'bambu-x1c', name: 'the Bambu Lab X1 Carbon', nozzle: 300, bed: 110, volume: [256, 256, 256], enclosed: true, hardened: true, src: 'Bambu Lab\'s specifications: all-metal hotend to 300 °C, hardened-steel nozzle, bed 110 °C at 220 V (120 at 110 V), enclosed, 256 mm a side' },
  { id: 'voron-24', name: 'the Voron 2.4 (250 mm)', nozzle: 270, bed: 120, volume: [250, 250, 210], enclosed: true, hardened: false, src: 'VoronDesign\'s own Klipper configuration for it on an Octopus (Voron2_Octopus_Config.cfg): its extruder\'s max_temp 270 °C (its Revo Voron hot end is rated 300 °C, E3D\'s listing), its bed\'s 120 °C, X and Y to 250 mm and Z to 210 mm for the 250 build; enclosed by its panels (its own CAD); its Revo\'s nozzle brass' },
];
const mid = (r: [number, number]) => Math.round((r[0] + r[1]) / 2);
/** A filament printed on a printer: the nozzle and bed at the middle of the maker's range where the printer reaches it,
 *  its low end where only that is in reach, refused where not even that is; an abrasive filament only through a
 *  hardened nozzle; a part only as big as the printer prints. */
export function printWith(p: Printer, f: Filament, part?: [number, number, number]): Made<{ nozzle: number; bed: number; fan?: number }> {
  const refused: string[] = [], warn: string[] = [];
  if (f.nozzle[0] > p.nozzle) refused.push(`${p.name}'s nozzle reaches ${p.nozzle} °C; ${f.name} needs ${f.nozzle[0]} at least`);
  if (f.bed[0] > p.bed) refused.push(`${p.name}'s bed reaches ${p.bed} °C; ${f.name} needs ${f.bed[0]} at least`);
  if (f.abrasive && !p.hardened) refused.push(`${f.name} wears a brass nozzle out: ${p.name} needs a hardened one first`);
  if (part) { const fits = [...part].sort((a, b) => b - a), room = [...p.volume].sort((a, b) => b - a); if (fits.some((v, i) => v > room[i]!)) refused.push(`the part (${part.join(' × ')} mm) is bigger than ${p.name} prints (${p.volume.join(' × ')} mm)`); }
  const nozzle = Math.min(mid(f.nozzle), p.nozzle), bed = Math.min(mid(f.bed), p.bed);
  if (nozzle < mid(f.nozzle)) warn.push(`at ${nozzle} °C, the low end of ${f.name}'s range: print slower so it melts through`);
  if (bed < mid(f.bed)) warn.push(`its bed at ${bed} °C, the low end of ${f.name}'s: keep parts small (Prusa prints PC Blend's small parts at 100)`);
  if (f.enclose && !p.enclosed) warn.push(`${p.name} is open: large ${f.name} parts may warp and lift; an enclosure helps`);
  const settings = { nozzle, bed, ...(f.fan !== undefined ? { fan: f.fan } : {}) };
  if (f.metal) warn.push(`${f.name} prints on ${f.metal.sheet}: lay that on ${p.name}'s sheet`);
  const mt = f.metal, steps: Step[] = refused.length ? [] : mt ? [
    { do: `Scale the part ${mt.scale[0].toFixed(2)} times in X and Y and ${mt.scale[1].toFixed(2)} in Z: it shrinks back to its size when it is sintered.`, check: `a 20 mm cube is ${(20 * mt.scale[0]).toFixed(1)} × ${(20 * mt.scale[0]).toFixed(1)} × ${(20 * mt.scale[1]).toFixed(1)} mm in the slicer` },
    { do: `Lay ${mt.sheet} on the bed; set the bed to ${bed} °C and the nozzle to ${nozzle} °C (${f.name}: ${f.nozzle[0]}–${f.nozzle[1]} °C, ${f.bed[0]}–${f.bed[1]} °C).`, check: 'both read their set temperatures and hold them' },
    { do: `Slice it solid, every wall and infill line full (a hollow green part sinters hollow), at ${mt.speed[0]}–${mt.speed[1]} mm/s with a nozzle of 0.4 mm or more, and send it to ${p.name}.`, check: 'the slicer shows no gaps inside it' },
    { do: 'Watch the first layer, and take the part off when the bed has cooled: it is a green part, metal powder held in plastic, and breaks if it is bent.', check: 'it comes away whole, its layers fused; it is heavy for its size' },
  ] : [
    { do: `Wipe the print sheet with isopropyl alcohol and let it dry; set the bed to ${bed} °C and the nozzle to ${nozzle} °C (${f.name}: ${f.nozzle[0]}–${f.nozzle[1]} °C nozzle, ${f.bed[0]}–${f.bed[1]} °C bed).`, check: 'both read their set temperature and hold it' },
    { do: `Slice the part for ${f.name} at 0.2 mm layers${f.fan !== undefined ? `, the part fan at ${f.fan} %` : ''}, and send it to ${p.name}.`, check: 'the slicer shows it inside the bed, nothing hanging in the air without support' },
    { do: 'Watch the first layer go down.', check: 'its lines pressed flat and joined to each other; if they curl or lift, stop, clean the sheet and level again' },
    { do: 'Let the bed cool before you take the part off.', check: 'it comes away by flexing the sheet, nothing left on it' },
  ];
  return { ok: !refused.length, refused, warn, settings, steps, src: `${f.src}; ${p.src}` };
}

// ---- bound metal debound and sintered -------------------------------------------------------------------------------
/** A bound-metal filament's density as printed (kg/m³), from its spool: its mass over its length's volume. */
export const greenDensity = (b: BoundMetal) => (b.spool.kg / (b.spool.m * Math.PI * (b.spool.d / 2000) ** 2));
/** What a green part becomes: the part (mm) it is printed for, how big it is printed, how much of what is printed is
 *  binder (by mass, from the green and sintered densities and the shrink), and the steps after the print. Debinding is
 *  catalytic, in a gas-tight oven at 100–140 °C in nitrogen with a few per cent of nitric acid gas, which breaks its
 *  polyacetal binder down to formaldehyde (BASF's Catamold brochure; Nabertherm); then sintered in pure hydrogen (BASF)
 *  in a cold-wall retort furnace (Nabertherm), at about 1380 °C for 316L (typical of 316L's sintering, an estimate: BASF
 *  publishes no profile). Neither is done at home: Forward AM's partners (Elnik, DSH Technologies) do both as a
 *  service. */
export function sinter(f: Filament, part?: [number, number, number], cm3?: number): Made<{ printed?: [number, number, number]; binder: number; green: number; grams?: number; greenGrams?: number }> {
  const b = f.metal; if (!b) return { ok: false, refused: [`${f.name} is a plastic: there is no metal in it to sinter`], warn: [], settings: { binder: 0, green: 0 }, steps: [], src: f.src };
  const green = greenDensity(b), grow = b.scale[0] ** 2 * b.scale[1], binder = 1 - b.sintered / (green * grow);
  const printed = part ? [part[0] * b.scale[0], part[1] * b.scale[0], part[2] * b.scale[1]].map((v) => +v.toFixed(1)) as [number, number, number] : undefined;
  const grams = cm3 !== undefined ? +(cm3 * b.sintered / 1000).toFixed(1) : undefined, greenGrams = cm3 !== undefined ? +(cm3 * grow * green / 1000).toFixed(1) : undefined;
  const steps: Step[] = [
    { do: `Print it oversize${printed ? ` (${printed.join(' × ')} mm for a ${part!.join(' × ')} mm part)` : ''}, solid: a green part, ${b.alloy} powder in a polyacetal binder, ${(green / 1000).toFixed(2)} g/cm³ (its spool's ${b.spool.kg} kg on ${b.spool.m} m of ${b.spool.d} mm).`, check: 'whole, no cracks, no gaps between its lines' },
    { do: 'Send it to be debound: in a gas-tight oven at 100–140 °C in nitrogen with a few per cent of nitric acid gas, which breaks its binder down to formaldehyde and carries it out; the part keeps its shape, now brown: powder held by what binder is left.', check: `it weighs about ${(binder * 100).toFixed(0)} % less than it did printed (its binder out)` },
    { do: `Then sintered: in pure hydrogen, in a cold-wall retort furnace, at about 1380 °C, so its powder's grains grow into one another and the part shrinks by ${((1 - 1 / b.scale[0]) * 100).toFixed(1)} % in X and Y and ${((1 - 1 / b.scale[1]) * 100).toFixed(1)} % in Z, back to its size.`, check: `it measures what it was drawn${grams !== undefined ? `, about ${grams} g` : ''}, ${(b.sintered / 1000).toFixed(2)} g/cm³` },
    { do: `Finish it as any ${b.alloy} part: it machines, welds and polishes as the wrought alloy does; ${b.tensile} MPa in tension across its layers' plane.`, check: 'its faces as printed: matte, its layers\' lines on them' },
  ];
  const warn = [
    'Debinding uses nitric acid of 98 % or more as a gas: it burns skin, eyes and lungs, its fumes (nitrogen oxides) poison, and it gives off formaldehyde (a carcinogen); it is done only in an oven built for it, its exhaust burned off.',
    'Sintering uses hydrogen, which burns and explodes in air from 4 % to 75 %: the furnace is purged with nitrogen or argon before and after, and its exhaust flared.',
    'So both are a service: Forward AM\'s partners (Elnik and DSH Technologies) debind and sinter Ultrafuse parts sent to them.',
  ];
  return { ok: true, refused: [], warn, settings: { ...(printed ? { printed } : {}), binder: +binder.toFixed(3), green: Math.round(green), ...(grams !== undefined ? { grams, greenGrams } : {}) }, steps, src: `${f.src}; BASF's Catamold brochure (catalytic debinding at 100–140 °C in nitrogen with a few per cent of gaseous nitric acid); Nabertherm's MIM furnace brochure (the binder to formaldehyde; sintering in a cold-wall retort); Forward AM's Ultrafuse 316L page (sintered in pure hydrogen; Elnik and DSH Technologies its partners); 1380 °C an estimate` };
}

// ---- laser powder-bed fusion -----------------------------------------------------------------------------------------
/** A laser powder-bed fusion machine as its maker gives it: its laser (W), its spot (µm), how fast it scans (m/s), what
 *  it builds in (mm, its height with its plate), the layer it typically lays (µm), its gas, its power, size and mass. */
export interface Fuser { id: string; name: string; laser: number; spot: number; scan: number; volume: [number, number, number]; layer: number; gas: string; kw: [number, number]; size: [number, number, number]; kg: number; src: string }
export const FUSERS: Fuser[] = [
  { id: 'eos-m290', name: 'the EOS M 290', laser: 400, spot: 100, scan: 7, volume: [250, 250, 325], layer: 30, gas: 'argon or nitrogen', kw: [2.4, 8.5], size: [2500, 1300, 2190], kg: 1250, src: 'EOS\'s M 290 system data sheet: 250 × 250 × 325 mm (height with its plate), one 400 W Yb fibre laser, a 100 µm focus, scanning to 7.0 m/s, 32 A, 2.4 kW typical and 8.5 kW at most, inert gas at 7 bar and 20 m³/h, 2500 × 1300 × 2190 mm, about 1250 kg; layers typically 30 µm (TU Darmstadt\'s M 290)' },
];
/** A metal powder for it, by its alloy: the solid's density (kg/m³, its handbook's), and what makes it dangerous. */
export interface Powder { id: string; name: string; dense: number; hazard: string; burns: boolean }
export const POWDERS: Powder[] = [
  { id: '316l-powder', name: '316L stainless steel powder', dense: 7990, burns: false, hazard: 'fine enough to breathe deep into the lungs; its nickel and chromium sensitise the skin, and nickel dust is a carcinogen: a respirator (P3) and gloves to handle it' },
  { id: 'ti64-powder', name: 'Ti-6Al-4V titanium powder', dense: 4430, burns: true, hazard: 'a titanium dust cloud ignites and explodes, and burning titanium cannot be put out with water or CO₂ (only dry sand or a class D powder): handled under argon, in grounded metal containers, its filter\'s residue kept wet and passivated; a respirator too' },
  { id: 'alsi10mg-powder', name: 'AlSi10Mg aluminium powder', dense: 2670, burns: true, hazard: 'an aluminium dust cloud ignites and explodes, and wet aluminium powder gives off hydrogen: handled under argon, grounded, kept dry, its filter\'s residue passivated; a respirator too' },
];
/** A part built from a powder on a fuser: refused where it does not fit (with its plate); its layers counted; its
 *  steps from loading the powder to cutting it off its plate; and the hazards of the laser, the gas and the powder. */
export function fuse(m: Fuser, w: Powder, part: [number, number, number]): Made<{ layers: number; layer: number; laser: number; scan: number }> {
  const refused: string[] = [], fits = [...part].sort((a, b) => b - a), room = [...m.volume].sort((a, b) => b - a);
  if (fits.some((v, i) => v > room[i]!)) refused.push(`the part (${part.join(' × ')} mm) is bigger than ${m.name} builds (${m.volume.join(' × ')} mm, its height with its plate)`);
  const layers = Math.ceil((part[2] * 1000) / m.layer);
  const steps: Step[] = refused.length ? [] : [
    { do: `Orient the part and give it supports wherever it overhangs (each layer can only be melted onto something solid), and slice it into ${layers} layers of ${m.layer} µm.`, check: 'every overhang supported to the plate; the part clear of the plate\'s edges' },
    { do: `Fill the dispenser with ${w.name}, fit and level the build plate, and close the chamber.`, check: 'the plate level with the recoater\'s blade across its width' },
    { do: `Flood the chamber with ${m.gas} until its oxygen is down to the level the alloy needs (its maker\'s figure).`, check: 'the oxygen reading steady below it' },
    { do: `Build: each layer the recoater spreads ${m.layer} µm of powder and the ${m.laser} W laser, focused to ${m.spot} µm and scanned at up to ${m.scan} m/s, melts the part\'s slice of it into the one beneath.`, check: 'each layer even, no ridges where the blade struck the part' },
    { do: 'Let it cool under gas; dig the part out of the loose powder in the chamber and sieve the powder for use again.', check: 'no powder left in its holes' },
    { do: 'Stress-relieve it still on its plate (the alloy\'s heat treatment), then cut it off the plate (wire EDM or a band saw) and take its supports off.', check: 'it does not spring when it comes off' },
  ];
  const warn = [`${m.name}'s ${m.laser} W laser is class 4: it burns skin and blinds instantly, in the chamber only; never defeat the door's interlock.`, `${m.gas[0]!.toUpperCase()}${m.gas.slice(1)} displaces air: an oxygen monitor in the room.`, `${w.name}: ${w.hazard}.`];
  return { ok: !refused.length, refused, warn, settings: { layers, layer: m.layer, laser: m.laser, scan: m.scan }, steps, src: m.src };
}

// ---- firing clay ---------------------------------------------------------------------------------------------------
/** Orton's self-supporting cones, the temperature each bends at when the last 100 °C are climbed at 60 °C an hour
 *  (its temperature-equivalent chart). */
export const CONES: Record<string, number> = { '022': 586, '06': 998, '04': 1063, '6': 1222, '8': 1249, '10': 1285 };
const ORTON = 'the Edward Orton Jr. Ceramic Foundation\'s chart (self-supporting cones, 60 °C an hour for the last 100 °C)';
/** A clay body and the cone it matures at (each bag says its own: these typical of the kinds). */
export interface ClayBody { id: string; name: string; cone: string }
export const CLAYS: ClayBody[] = [{ id: 'earthenware', name: 'earthenware', cone: '04' }, { id: 'stoneware-6', name: 'mid-fire stoneware', cone: '6' }, { id: 'stoneware-10', name: 'high-fire stoneware', cone: '10' }, { id: 'porcelain', name: 'high-fire porcelain', cone: '10' }];
/** A kiln by the hottest it reaches: two by their makers' ratings, and the workshop's, which stands for a small burnout
 *  kiln like Paragon's SC-2 (its own model in ./cell.ts would climb past that rating: its losses are estimates). */
export interface KilnSpec { id: string; name: string; max: number; volts?: number; watts?: number; src: string }
const workshop = new Kiln(), SC2_MAX = 1093;
export const KILNS: KilnSpec[] = [
  { id: 'paragon-sc2', name: 'Paragon\'s SC-2', max: SC2_MAX, volts: 120, watts: 1680, src: 'Paragon\'s SC-2 as The Ceramic Shop lists it: 2000 °F (1093 °C) inside, 120 V, 14 A, 1680 W; a jewellery, enamel and glass kiln' },
  { id: 'skutt-km818', name: 'Skutt\'s KM-818', max: 1288, volts: 240, watts: 6400, src: 'Skutt\'s KM-818 page (cone 10, 2350 °F: 1288 °C) and its KilnMaster manual (240 V, 26.7 A, 6400 W)' },
  { id: 'skutt-km1027', name: 'Skutt\'s KM-1027', max: 1288, volts: 240, watts: 11520, src: 'sellers\' listings of Skutt\'s KM-1027: cone 10, 2350 °F (1288 °C); 240 V single-phase, 48 A, 11,520 W; 23 × 23 × 27 in inside, ten-sided, 3 in of firebrick' },
  { id: 'workshop', name: 'the workshop\'s kiln', max: Math.min(SC2_MAX, Math.round(20 + workshop.P / workshop.h)), volts: 120, watts: workshop.P, src: `its model in ./cell.ts (${workshop.P} W, estimates), held to the rating of the kiln it stands for, Paragon's SC-2: 2000 °F (1093 °C)` },
];
/** Quartz turns from its α form to its β at 573 °C, growing by about 1 % as it does: ware is taken through it slowly. */
export const QUARTZ = 573;
/** Clay fired in a kiln: a bisque (dried slowly, through quartz's change slowly, to cone 04, as is usual for every body:
 *  earthenware's glaze is often cooler, at 06) or a glaze firing to the body's cone; the last 100 °C at Orton's 60 °C
 *  an hour so the cone's figure holds; refused where the kiln cannot reach it, warned where it reaches it with under 3 %
 *  in hand (a kiln run at its limit wears its elements out). */
export function fire(k: KilnSpec, c: ClayBody, as: 'bisque' | 'glaze'): Made<{ cone: string; peak: number; program: Segment[] }> {
  const cone = as === 'bisque' ? '04' : c.cone, peak = CONES[cone]!, refused: string[] = [], warn: string[] = [];
  if (peak > k.max) refused.push(`${k.name} reaches ${k.max} °C; cone ${cone} needs ${peak}`);
  else if (peak > k.max * 0.97) warn.push(`cone ${cone} (${peak} °C) is within 3 % of all ${k.name} can do: it will be slow at the top, and wear its elements`);
  const program: Segment[] = as === 'bisque'
    ? [{ to: 93, rate: 50, hold: 2 }, { to: 600, rate: 80, hold: 0 }, { to: peak - 100, rate: 150, hold: 0 }, { to: peak, rate: 60, hold: 0 }]
    : [{ to: peak - 100, rate: 150, hold: 0 }, { to: peak, rate: 60, hold: 0.15 }];
  const hours = program.reduce((h, s, i) => h + Math.abs(s.to - (i ? program[i - 1]!.to : 20)) / s.rate + s.hold, 0);
  const steps: Step[] = refused.length ? [] : [
    ...(as === 'bisque' ? [{ do: 'Load the dry greenware; pieces may touch and stack, as nothing will melt.', check: 'nothing cold or damp to the cheek (wet clay bursts in the kiln)' }] : [{ do: 'Load the glazed ware a finger apart, nothing touching, every foot wiped bare of glaze.', check: 'no glaze on any foot or shelf' }]),
    { do: `Run the program: ${program.map((s) => `${s.rate} °C/h to ${s.to} °C${s.hold ? `, hold ${s.hold >= 1 ? `${s.hold} h` : `${Math.round(s.hold * 60)} min`}` : ''}`).join('; ')} (about ${Math.round(hours)} h)${as === 'bisque' ? `, slowly through ${QUARTZ} °C where quartz changes` : ''}.`, check: `a cone ${cone} set where you can see it bends to touch its shelf` },
    { do: `Let it cool shut, as slowly as it will, through ${QUARTZ} °C again; open it only below 65 °C.`, check: 'the ware lifts out cool, unmarked; it rings when tapped' },
  ];
  return { ok: !refused.length, refused, warn, settings: { cone, peak, program }, steps, src: `${ORTON}; ${k.src}; quartz's α–β change at 573 °C` };
}

// ---- melting and pouring metal ---------------------------------------------------------------------------------------
const furnace = new Furnace();
/** The hottest the workshop's furnace reaches, from its model: what of its burner it keeps against its losses, or its
 *  controller's ceiling if that is lower. */
export const FURNACE_MAX = Math.round(Math.min(furnace.top, 20 + (furnace.P * furnace.kept) / furnace.h));
/** A metal poured from the workshop's furnace: at its pour range, refused where the furnace cannot reach it. */
export function pour(m: Metal): Made<{ melt: number; pour: [number, number]; shrink: number }> {
  const refused = m.pour[0] > FURNACE_MAX ? [`the furnace reaches ${FURNACE_MAX} °C; ${m.name} pours at ${m.pour[0]}`] : [], warn = m.pour[1] > FURNACE_MAX * 0.9 ? [`${m.name} pours near all the furnace can do: preheat the crucible and keep the lid on`] : [];
  const steps: Step[] = refused.length ? [] : [
    { do: `Melt the ${m.name} in the crucible, the lid on, to ${m.pour[0]}–${m.pour[1]} °C (it melts at ${m.melt} °C).`, check: 'all of it liquid, a skin of dross skimmed off the top' },
    { do: 'Pour it in one steady stream into the hot flask\'s sprue until the sprue stays full.', check: 'metal standing in the sprue\'s cup' },
    { do: `Let it freeze; it shrinks by ${(m.shrink * 100).toFixed(1)} % as it does, which the sprue feeds.`, check: 'the sprue\'s top sunk a little, the part full' },
  ];
  return { ok: !refused.length, refused, warn, settings: { melt: m.melt, pour: m.pour, shrink: m.shrink }, steps, src: `./cell.ts's metals (their handbook figures) and furnace model (estimates)` };
}

/** What can be done to a material, by every machine here: each one's verdict and why. */
export function processorFor(id: string): { machine: string; ok: boolean; why: string }[] {
  const f = FILAMENTS.find((x) => x.id === id); if (f) return PRINTERS.map((p) => { const r = printWith(p, f); return { machine: p.name, ok: r.ok, why: r.ok ? `nozzle ${r.settings.nozzle} °C, bed ${r.settings.bed} °C${r.warn.length ? `; ${r.warn.join('; ')}` : ''}` : r.refused.join('; ') }; });
  const c = CLAYS.find((x) => x.id === id); if (c) return KILNS.map((k) => { const r = fire(k, c, 'glaze'); return { machine: k.name, ok: r.ok, why: r.ok ? `cone ${r.settings.cone}, ${r.settings.peak} °C${r.warn.length ? `; ${r.warn.join('; ')}` : ''}` : r.refused.join('; ') }; });
  const m = METALS.find((x) => x.id === id); if (m) { const r = pour(m); return [{ machine: 'the workshop\'s furnace', ok: r.ok, why: r.ok ? `pour at ${m.pour[0]}–${m.pour[1]} °C` : r.refused.join('; ') }]; }
  const w = POWDERS.find((x) => x.id === id); if (w) return FUSERS.map((u) => ({ machine: u.name, ok: true, why: `${u.layer} µm layers melted by its ${u.laser} W laser under ${u.gas}` }));
  return [];
}

// ---- words -----------------------------------------------------------------------------------------------------------
const MATERIAL_WORDS: [RegExp, string][] = [[/\b(ultrafuse|316l (filament|metal)|bound[- ]metal|metal filament)\b/, 'ultrafuse-316l'],
  [/\b(titanium|ti-?6al-?4v|ti64)\b/, 'ti64-powder'], [/\balsi10mg\b|\balumin(i)?um powder\b/, 'alsi10mg-powder'], [/\b316l( powder)?\b|\bstainless( steel)? powder\b/, '316l-powder'], [/\bpla\b/, 'pla'], [/\bpetg\b/, 'petg'], [/\basa\b/, 'asa'], [/\b(pc( blend)?|polycarbonate)\b/, 'pc'],
  [/\bearthenware\b/, 'earthenware'], [/\b(high[- ]fire )?porcelain\b/, 'porcelain'], [/\bhigh[- ]fire stoneware|stoneware (at |to )?cone 10\b/, 'stoneware-10'], [/\bstoneware\b/, 'stoneware-6'],
  [/\balumin(i)?um\b/, 'aluminium'], [/\bzinc\b/, 'zinc'], [/\b(tin|pewter)\b/, 'tin'], [/\bbronze\b/, 'bronze']];
const MACHINE_WORDS: [RegExp, string][] = [[/\bvoron\b/, 'voron-24'], [/\b(eos|m ?290)\b/, 'eos-m290'],[/\bmini\+?|mini plus\b/, 'prusa-mini-plus'], [/\bmk4\b/, 'prusa-mk4'], [/\b(x1c|x1 carbon|bambu)\b/, 'bambu-x1c'],
  [/\b(sc-?2|paragon)\b/, 'paragon-sc2'], [/\b(km-?1027|1027)\b/, 'skutt-km1027'], [/\b(km-?818|skutt)\b/, 'skutt-km818'], [/\b(workshop'?s? kiln|my kiln|the kiln)\b/, 'workshop']];
const said = (r: Made<unknown>, what: string): string => r.ok
  ? `${what}: ${r.steps.map((s, i) => `${i + 1}. ${s.do}${s.check ? ` (check: ${s.check})` : ''}`).join(' ')}${r.warn.length ? ` Mind: ${r.warn.map((w) => w.replace(/\.$/, '')).join('; ')}.` : ''}`
  : `${what} cannot be done: ${r.refused.join('; ')}.`;
/** Words about making something of a material, said back from the processor: "what can I print ASA on", "print PETG on
 *  the MK4", "fire porcelain", "bisque stoneware in the Skutt", "pour bronze"; null when they are not about that. */
export function processWords(text: string): string | null {
  const t = text.toLowerCase().replace(/^nexus[,:]?\s*/, '').replace(/[?.!]+$/, '').trim();
  // (printing metal, its material not named: the two ways)
  if (/^(?:how (?:do|would|can) i |can i |could i )?(?:3d )?print (?:in |with )?metal\b|^(?:a )?(?:3d )?printer that prints metal|^metal (?:3d )?printing/.test(t)) {
    const v = PRINTERS.find((x) => x.id === 'voron-24')!, u = FUSERS[0]!, f = FILAMENTS.find((x) => x.metal)!;
    return `Two ways. One: print ${f.name} on ${v.name} (${f.nozzle[0]}–${f.nozzle[1]} °C, its bed ${f.bed[0]}–${f.bed[1]} °C, ${f.metal!.scale[0].toFixed(2)} times larger in X and Y and ${f.metal!.scale[1].toFixed(2)} in Z), then have it debound in nitric acid gas and sintered in hydrogen (a service: both are hazardous), and it shrinks to a ${f.metal!.alloy} part of ${(f.metal!.sintered / 1000).toFixed(2)} g/cm³. Two: melt a bed of powder layer on layer with a laser, as ${u.name} does (${u.laser} W, ${u.layer} µm layers, under ${u.gas}). Say "print Ultrafuse on the Voron" or "fuse titanium on the EOS" for the steps.`;
  }
  const verb = /^(?:what (?:can|could) i (print|fire|cast|pour|melt|make|do|fuse|sinter)\b|how (?:do|would|can) i (print|fire|bisque|glaze|cast|pour|melt|fuse|sinter)\b|(print|fire|bisque|glaze|cast|pour|fuse|sinter|laser[- ]melt)\b|(?:what|which) (?:machines?|printers?|kilns?) (?:can )?(?:print|fire|take|melt|process)\b|process\b)/.exec(t);
  if (!verb) return null;
  const mat = MATERIAL_WORDS.find(([re]) => re.test(t))?.[1]; if (!mat) return null;
  const mach = MACHINE_WORDS.find(([re]) => re.test(t))?.[1], how = verb[1] ?? verb[2] ?? verb[3] ?? '';
  const f = FILAMENTS.find((x) => x.id === mat), c = CLAYS.find((x) => x.id === mat), m = METALS.find((x) => x.id === mat), w = POWDERS.find((x) => x.id === mat);
  if (w) {
    const u = FUSERS.find((x) => x.id === mach) ?? FUSERS[0]!, d = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/.exec(t), part: [number, number, number] = d ? [+d[1]!, +d[2]!, +d[3]!] : [50, 50, 50];
    return said(fuse(u, w, part), `${w.name} fused on ${u.name}${d ? '' : ' (a 50 mm cube)'}`);
  }
  if (/^what|^which|^process/.test(t) || (!mach && f)) return `${(f ?? c ?? m)!.name}: ${processorFor(mat).map((v) => `${v.machine} ${v.ok ? `can (${v.why})` : `cannot (${v.why})`}`).join('; ')}.`;
  if (f) { const p = PRINTERS.find((x) => x.id === mach); if (!p) return null; const r = printWith(p, f); return f.metal && r.ok ? `${said(r, `${f.name} on ${p.name}`)} Then: ${said(sinter(f), 'its green part made metal')}` : said(r, `${f.name} on ${p.name}`); }
  if (c) {
    const as = how === 'bisque' ? 'bisque' : 'glaze', k = KILNS.find((x) => x.id === mach) ?? KILNS.find((x) => fire(x, c, as).ok);
    if (!k) return `${c.name} cannot be fired ${as === 'bisque' ? 'to bisque' : `to cone ${c.cone}`} in any kiln here: ${KILNS.map((x) => fire(x, c, as).refused.join('; ')).join('; ')}.`;
    return said(fire(k, c, as), `${c.name} ${as === 'bisque' ? 'bisqued' : `fired to cone ${c.cone}`} in ${k.name}`);
  }
  return said(pour(m!), `${m!.name} poured from the workshop's furnace`);
}

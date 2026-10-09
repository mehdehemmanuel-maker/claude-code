// The materials processor: what a material becomes by what process on what machine, as edges between them (a
// process joining what a machine can do to what a material needs), the way the lessons are made (./edges.ts): every
// figure from a maker's data sheet, a standard or the machine's own model, every step's words from those figures, and
// what cannot be done refused with why. First its three heats: a filament printed (a printer's nozzle, bed, enclosure,
// nozzle hardness and size against the filament maker's ranges), clay fired (a kiln's reach against Orton's cone for
// the body, as a program the workshop's kiln runs), metal melted and poured (./cell.ts's furnace and metals).
// Owner of: the process edges between materials and machines, their settings, schedules, steps and refusals.

import { Kiln, Furnace, METALS, type Metal, type Segment } from './cell';

export interface Step { do: string; check?: string }
/** A process done on a machine: its settings, its steps, what to watch for, and what stops it. */
export interface Made<S> { ok: boolean; refused: string[]; warn: string[]; settings: S; steps: Step[]; src: string }

// ---- printing --------------------------------------------------------------------------------------------------------
/** A filament as its maker gives it: the nozzle and bed it prints at (°C), the part fan (%), and what else it needs. */
export interface Filament { id: string; name: string; nozzle: [number, number]; bed: [number, number]; fan?: number; enclose?: 'helps'; abrasive?: boolean; src: string }
export const FILAMENTS: Filament[] = [
  { id: 'pla', name: 'PLA', nozzle: [200, 220], bed: [40, 60], fan: 100, src: 'Prusament PLA\'s technical data sheet (v1.1, 2022): nozzle 210 ± 10 °C, bed 40–60 °C, fan 100 %' },
  { id: 'petg', name: 'PETG', nozzle: [240, 260], bed: [70, 90], fan: 50, src: 'Prusament PETG\'s technical data sheet (v1.1, 2022): nozzle 250 ± 10 °C, bed 80 ± 10 °C, fan 50 %' },
  { id: 'asa', name: 'ASA', nozzle: [250, 270], bed: [105, 115], fan: 30, enclose: 'helps', src: 'Prusament ASA\'s technical data sheet (v1.1, 2022): nozzle 260 ± 10 °C, bed 110 ± 5 °C, fan 30 % (0–50); an enclosure against warping on large parts (typical)' },
  { id: 'pc', name: 'PC Blend', nozzle: [265, 285], bed: [100, 120], enclose: 'helps', src: 'Prusa\'s knowledge base: Prusament PC Blend at 275 ± 10 °C, bed 110 ± 10 °C (115 after the first layer; small parts at 100); an enclosure helps large parts (typical)' },
];
/** A printer as its maker gives it: the hottest nozzle and bed it reaches (°C), what it prints in (mm), and whether it is
 *  enclosed and its nozzle hardened (for abrasive, fibre-filled filaments). */
export interface Printer { id: string; name: string; nozzle: number; bed: number; volume: [number, number, number]; enclosed: boolean; hardened: boolean; src: string }
export const PRINTERS: Printer[] = [
  { id: 'prusa-mini-plus', name: 'the Original Prusa MINI+', nozzle: 280, bed: 100, volume: [180, 180, 180], enclosed: false, hardened: false, src: 'Prusa\'s specifications: nozzle to 280 °C, bed to 100 °C, 180 × 180 × 180 mm, Bowden extruder, open frame' },
  { id: 'prusa-mk4', name: 'the Original Prusa MK4', nozzle: 290, bed: 120, volume: [250, 210, 220], enclosed: false, hardened: false, src: 'Prusa\'s comparison table: hotend 290 °C, bed 120 °C, 250 × 210 × 220 mm, open frame' },
  { id: 'bambu-x1c', name: 'the Bambu Lab X1 Carbon', nozzle: 300, bed: 110, volume: [256, 256, 256], enclosed: true, hardened: true, src: 'Bambu Lab\'s specifications: all-metal hotend to 300 °C, hardened-steel nozzle, bed 110 °C at 220 V (120 at 110 V), enclosed, 256 mm a side' },
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
  const steps: Step[] = refused.length ? [] : [
    { do: `Wipe the print sheet with isopropyl alcohol and let it dry; set the bed to ${bed} °C and the nozzle to ${nozzle} °C (${f.name}: ${f.nozzle[0]}–${f.nozzle[1]} °C nozzle, ${f.bed[0]}–${f.bed[1]} °C bed).`, check: 'both read their set temperature and hold it' },
    { do: `Slice the part for ${f.name} at 0.2 mm layers${f.fan !== undefined ? `, the part fan at ${f.fan} %` : ''}, and send it to ${p.name}.`, check: 'the slicer shows it inside the bed, nothing hanging in the air without support' },
    { do: 'Watch the first layer go down.', check: 'its lines pressed flat and joined to each other; if they curl or lift, stop, clean the sheet and level again' },
    { do: 'Let the bed cool before you take the part off.', check: 'it comes away by flexing the sheet, nothing left on it' },
  ];
  return { ok: !refused.length, refused, warn, settings, steps, src: `${f.src}; ${p.src}` };
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
  return [];
}

// ---- words -----------------------------------------------------------------------------------------------------------
const MATERIAL_WORDS: [RegExp, string][] = [[/\bpla\b/, 'pla'], [/\bpetg\b/, 'petg'], [/\basa\b/, 'asa'], [/\b(pc( blend)?|polycarbonate)\b/, 'pc'],
  [/\bearthenware\b/, 'earthenware'], [/\b(high[- ]fire )?porcelain\b/, 'porcelain'], [/\bhigh[- ]fire stoneware|stoneware (at |to )?cone 10\b/, 'stoneware-10'], [/\bstoneware\b/, 'stoneware-6'],
  [/\balumin(i)?um\b/, 'aluminium'], [/\bzinc\b/, 'zinc'], [/\b(tin|pewter)\b/, 'tin'], [/\bbronze\b/, 'bronze']];
const MACHINE_WORDS: [RegExp, string][] = [[/\bmini\+?|mini plus\b/, 'prusa-mini-plus'], [/\bmk4\b/, 'prusa-mk4'], [/\b(x1c|x1 carbon|bambu)\b/, 'bambu-x1c'],
  [/\b(sc-?2|paragon)\b/, 'paragon-sc2'], [/\b(km-?818|skutt)\b/, 'skutt-km818'], [/\b(workshop'?s? kiln|my kiln|the kiln)\b/, 'workshop']];
const said = (r: Made<unknown>, what: string): string => r.ok
  ? `${what}: ${r.steps.map((s, i) => `${i + 1}. ${s.do}${s.check ? ` (check: ${s.check})` : ''}`).join(' ')}${r.warn.length ? ` Mind: ${r.warn.join('; ')}.` : ''}`
  : `${what} cannot be done: ${r.refused.join('; ')}.`;
/** Words about making something of a material, said back from the processor: "what can I print ASA on", "print PETG on
 *  the MK4", "fire porcelain", "bisque stoneware in the Skutt", "pour bronze"; null when they are not about that. */
export function processWords(text: string): string | null {
  const t = text.toLowerCase().replace(/^nexus[,:]?\s*/, '').replace(/[?.!]+$/, '').trim();
  const verb = /^(?:what (?:can|could) i (print|fire|cast|pour|melt|make|do)\b|how (?:do|would|can) i (print|fire|bisque|glaze|cast|pour|melt)\b|(print|fire|bisque|glaze|cast|pour)\b|(?:what|which) (?:machines?|printers?|kilns?) (?:can )?(?:print|fire|take|melt|process)\b|process\b)/.exec(t);
  if (!verb) return null;
  const mat = MATERIAL_WORDS.find(([re]) => re.test(t))?.[1]; if (!mat) return null;
  const mach = MACHINE_WORDS.find(([re]) => re.test(t))?.[1], how = verb[1] ?? verb[2] ?? verb[3] ?? '';
  const f = FILAMENTS.find((x) => x.id === mat), c = CLAYS.find((x) => x.id === mat), m = METALS.find((x) => x.id === mat);
  if (/^what|^which|^process/.test(t) || (!mach && f)) return `${(f ?? c ?? m)!.name}: ${processorFor(mat).map((v) => `${v.machine} ${v.ok ? `can (${v.why})` : `cannot (${v.why})`}`).join('; ')}.`;
  if (f) { const p = PRINTERS.find((x) => x.id === mach); return p ? said(printWith(p, f), `${f.name} on ${p.name}`) : null; }
  if (c) {
    const as = how === 'bisque' ? 'bisque' : 'glaze', k = KILNS.find((x) => x.id === mach) ?? KILNS.find((x) => fire(x, c, as).ok);
    if (!k) return `${c.name} cannot be fired ${as === 'bisque' ? 'to bisque' : `to cone ${c.cone}`} in any kiln here: ${KILNS.map((x) => fire(x, c, as).refused.join('; ')).join('; ')}.`;
    return said(fire(k, c, as), `${c.name} ${as === 'bisque' ? 'bisqued' : `fired to cone ${c.cone}`} in ${k.name}`);
  }
  return said(pour(m!), `${m!.name} poured from the workshop's furnace`);
}

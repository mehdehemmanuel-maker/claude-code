// The program an operation sends, and the wire it goes down.
//
// This is the binding layer: `link.ts` owns the transports and the languages (Marlin's line protocol, a kiln's
// segments, the G-code a flat part becomes), `works/` owns the operations, and this joins them. It is its own file
// because it is the only place that knows both, and because a cycle between the two would be the alternative.
//
// Owner of: which program an operation is given. Nothing else here decides what a machine is sent.

import type { Profile } from '../fab';
import { CUTTING, gcodeFor, kilnProgram, linkFor, printStart, type Lang, type Transport } from '../link';
import { CLAYS, FILAMENTS, fire, KILNS } from '../processor';
import { processById } from './families';
import { stationById } from './stations';
import { classOf, type PartLine } from './lines';

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

// Where matter is melted to flow (docs/NEXUS-FROM-REALITY.md, section 28): a heated block that holds a stream at its
// flowing temperature over the length the generator derived, a nozzle that gives the stream its width, and a break
// that keeps the heat from climbing the feed. Each from a law:
//
//   power      what the generator derived to bring the flow to its threshold, and the block's own loss at its
//              hottest, h A ΔT, a quarter more, as the next cartridge that exists
//   coil       R = V²/P; a nichrome wire thick enough that its surface load stays within what compacted MgO carries,
//              wound on the core no tighter than two of its own diameters
//   block      the melt length and walls around the stream, the heater and the thermistor
//   nozzle     an orifice as wide as the stream the tolerance allows
//   break      a thin stainless neck: Q = k A ΔT / L is all the heat that climbs it
//   heatsink   fins with area A = Q / (h ΔT) so the cold side stays below the matter's glass transition, cooled by a fan
//
// Designed in its own frame, the stream along −y, the nozzle at the bottom.

import { MATERIALS } from '../../data/materials';
import { thermalOf } from '../../engineering/thermal';
import { part, type Assembly, type Flaw, type Part, type Value } from './part';
import { CARTRIDGE_WATT_DENSITY, NICHROME } from './stock';

const mm = 1e-3, sigma = 5.670374419e-8;
const mat = (id: string) => MATERIALS.find((m) => m.id === id)!;
/** Cartridge heaters as stocked at a supply voltage: 6 mm × 20 mm, by rated power. */
export const CARTRIDGES = [30, 40, 50, 60, 80];
/** Streams side by side in one block, a nozzle's flats and a wall between each: their pitch. */
export const STREAM_PITCH = 8e-3;
/** Nichrome resistance wire as drawn, diameters. */
export const NICHROME_WIRE = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5].map((x) => x * mm);
/** The most power a coil buried in compacted MgO sheds per area of its own wire. */
export const COIL_SURFACE_LOAD = { value: 45e4, source: 'about 30 to 50 W/cm² of wire surface for coils in compacted MgO (cartridge heater design practice)', confidence: 'estimate' as const };

export interface HeaterAsk { id: string; power: number; Tlo: number; Thi: number; melt: number; stream: number; width: number; V: number; ambient: number; Tg: number; fan: boolean; streams?: number; cartridges?: number; /** The most streams side by side that the part is wide enough to take. */ maxStreams?: number }
export interface HotEnd extends Assembly { ask: HeaterAsk; electrical: { P: number; R: number; I: number }; fan: { P: number } | null; flaws: Flaw[]; mass: number; height: number; streams: number; cartridges: number }

export function designHotEnd(ask: HeaterAsk): HotEnd {
  const vals: Value[] = [];
  const v = (name: string, value: number, unit: string, law: string) => { vals.push({ name, value, unit, law }); return value; };
  const flaws: Flaw[] = [];
  const al = mat('aluminum.6061-t6'), brass = mat('brass.c360'), ss = mat('stainless.304');
  const Thot = ask.Thi - 273.15;
  // the block, round the streams, the heaters and the thermistor. The melt length a stream needs grows with its flow,
  // so n streams side by side each need 1/n of it: the generator's own remedy for a length too long to hold
  const n = ask.streams ?? 1, nc = ask.cartridges ?? 1, pitch = STREAM_PITCH;
  if (n > 1) v('streams', n, '1', `the flow split into ${n} streams side by side, each held over 1/${n} of the melt length (the generator: "shortening it means splitting the flow into streams side by side")`);
  const bx = Math.max(20 * mm, (n - 1) * pitch + 14 * mm + nc * 8 * mm), bz = 12 * mm, by = v('block height', Math.max(10 * mm, ask.melt / n + 4 * mm), 'm', `the melt length the generator derived (${(ask.melt * 1e3).toFixed(1)} mm) over ${n} stream${n > 1 ? 's' : ''}, and 2 mm walls`);
  const area = 2 * (bx * by + by * bz + bx * bz), hBlock = ask.fan ? 25 : 10;
  const loss = v('block loss at its hottest', (hBlock * area + 0.3 * sigma * area * ((Thot + 273.15) ** 3 * 4)) * (Thot - ask.ambient), 'W', `h A ΔT with h ≈ ${hBlock} W/m²K${ask.fan ? ' near the fan\'s draught' : ''}, and radiation from oxidised aluminium (ε ≈ 0.3), linearised`);
  const Pneed = 1.25 * (ask.power + loss);
  const each = CARTRIDGES.find((x) => x * nc >= Pneed) ?? CARTRIDGES.at(-1)!;
  const P = v('heater power', each * nc, 'W', `${nc > 1 ? `${nc} × ` : ''}the next stocked cartridge past 1.25 (${ask.power.toFixed(1)} W the flow takes + ${loss.toFixed(1)} W the block loses) = ${Pneed.toFixed(1)} W`);
  if (Pneed > CARTRIDGES.at(-1)! * nc) flaws.push({ check: 'heater-power', where: ask.id, says: `the flow and the block need ${Pneed.toFixed(0)} W, past ${nc} stocked cartridge${nc > 1 ? 's' : ''}`, law: 'P ≥ 1.25 (P_flow + h A ΔT)', value: Pneed, limit: CARTRIDGES.at(-1)! * nc, remedy: by > 40 * mm ? 'split the stream' : nc < Math.max(2, n) ? 'another cartridge' : 'split the stream' });
  const dc = 6 * mm, lc = 20 * mm;
  const wd = v('sheath watt density', each / (Math.PI * dc * lc), 'W/m^2', 'P / (π d L) over each sheath');
  if (wd > CARTRIDGE_WATT_DENSITY.value) flaws.push({ check: 'watt-density', where: ask.id, says: `the sheath gives ${(wd / 1e4).toFixed(0)} W/cm², past what a block fit carries`, law: 'P/(πdL)', value: wd, limit: CARTRIDGE_WATT_DENSITY.value, remedy: null });
  // its coil: R = V²/P; the thinnest wire whose surface load holds and whose turns fit two diameters apart
  const R = v('coil resistance', ask.V ** 2 / each, 'Ω', `R = V²/P at ${ask.V} V, each cartridge`);
  const core = 3.6 * mm, active = lc - 4 * mm;
  const fits = NICHROME_WIRE.map((d) => { const Lw = (R * Math.PI * d * d) / 4 / NICHROME.rho; const turns = Lw / (Math.PI * core); return { d, Lw, turns, pitch: active / turns, load: each / (Math.PI * d * Lw) }; });
  const coil = fits.find((f) => f.load <= COIL_SURFACE_LOAD.value && f.pitch >= 2 * f.d) ?? fits.find((f) => f.pitch >= 2 * f.d) ?? fits[0]!;
  v('coil wire', coil.d, 'm', `nichrome 80/20 (${NICHROME.source}): ${(coil.Lw * 1e3).toFixed(0)} mm, ${coil.turns.toFixed(0)} turns on a ${core * 1e3} mm core, pitch ${(coil.pitch * 1e3).toFixed(2)} mm, ${(coil.load / 1e4).toFixed(1)} W/cm² of its surface`);
  if (coil.load > COIL_SURFACE_LOAD.value) flaws.push({ check: 'coil-load', where: ask.id, says: `the coil sheds ${(coil.load / 1e4).toFixed(0)} W/cm² of its wire`, law: 'P / (π d L_w)', value: coil.load, limit: COIL_SURFACE_LOAD.value, remedy: null });
  // the break and the sink
  const neckL = 2 * mm, neckO = 2.8 * mm, neckI = 2.0 * mm, kss = thermalOf(ss).k;
  const Q = v('heat climbing the break', (n * kss * Math.PI * ((neckO / 2) ** 2 - (neckI / 2) ** 2) * (Thot - ask.Tg)) / neckL, 'W', `Q = k A ΔT / L through ${n > 1 ? `${n} ` : 'a '}${neckO * 1e3} mm stainless neck${n > 1 ? 's' : ''} ${neckL * 1e3} mm long, k = ${kss} W/m K`);
  const dT = ask.Tg - 10 - ask.ambient, hSink = ask.fan ? 50 : 8;
  const Afins = v('heatsink fin area', Q / (hSink * dT), 'm^2', `A = Q / (h ΔT): the cold side held 10 K below the glass transition (${ask.Tg.toFixed(0)} °C), h ≈ ${hSink} W/m²K ${ask.fan ? 'under a fan' : 'in still air'}`);
  const fins = Math.max(4, Math.ceil(Afins / (2 * Math.PI * ((11 * mm) ** 2 - (5 * mm) ** 2))));
  v('fins', fins, '1', 'annular fins of 22 mm outer diameter on a 10 mm core, two faces each, enough for that area');
  // ---- parts: the stream along −y, the nozzle's tip at y = 0 -----------------------------------------------------
  const Pts: Part[] = [];
  // the melt zone brings the stream to its flowing temperature, the break keeps that heat from climbing, the sink sheds what does
  const systemOf = (id: string) => (/\/break/.test(id) ? 'heat break' : /\/(heatsink|fin-|fan)/.test(id) ? 'cooling' : 'melt zone');
  const add = (p: Omit<Part, 'mass'> & { mass?: number }, density: number) => Pts.push(part({ system: systemOf(p.id), ...p }, density));
  const nozzleL = 12.5 * mm, yBlock = nozzleL - 5 * mm + by / 2;
  const xs = Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * pitch - (nc - 1) * 4 * mm);
  xs.forEach((x, i) => add({ id: `${ask.id}/nozzle${n > 1 ? `-${i + 1}` : ''}`, name: `brass nozzle M6×1, ${(ask.width * 1e3).toFixed(2)} mm orifice${n > 1 ? `, stream ${i + 1} of ${n}` : ''}`, category: 'thermal/heating/block', material: 'brass.c360', shape: { kind: 'round', r: 3.5 * mm, length: nozzleL, axis: 'y', bore: 2 * mm }, at: [x, nozzleL / 2, 0], colour: 0xd4af37, values: [{ name: 'orifice', value: ask.width, unit: 'm', law: 'as wide as the stream the tolerance allows' }] }, brass.density));
  add({ id: `${ask.id}/block`, name: `heater block ${(bx * 1e3).toFixed(0)} × ${(by * 1e3).toFixed(1)} × ${(bz * 1e3).toFixed(0)} mm, ${n} M6 bore${n > 1 ? 's' : ''} through, ${nc} 6 mm heater and a 3 mm thermistor bore`, category: 'thermal/heating/block', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [bx, by, bz] }, at: [(nc - 1) * 2 * mm, yBlock, 0], colour: 0xb0bec5, values: vals.filter((x) => ['block height', 'block loss at its hottest'].includes(x.name)) }, al.density);
  for (let c = 0; c < nc; c++) add({ id: `${ask.id}/cartridge${nc > 1 ? `-${c + 1}` : ''}`, name: `${each} W ${ask.V} V cartridge heater 6 × 20 mm`, category: 'thermal/heating/cartridge', material: 'stainless.304 sheath, MgO, NiCr 80/20', shape: { kind: 'round', r: dc / 2, length: lc, axis: 'z' }, at: [xs.at(-1)! + 7 * mm + c * 8 * mm, yBlock, 0], colour: 0x8d6e63, values: vals.filter((x) => ['heater power', 'coil resistance', 'coil wire', 'sheath watt density'].includes(x.name)) }, 7000);
  add({ id: `${ask.id}/thermistor`, name: '100 kΩ NTC thermistor (B 3950), glass bead in a 3 mm cartridge', category: 'sensing/temperature', material: 'glass, NTC ceramic', shape: { kind: 'round', r: 1.5 * mm, length: 10 * mm, axis: 'z' }, at: [-4 * mm, yBlock + 3 * mm, 0], colour: 0x26c6da, values: [] }, 2500);
  for (const [what, x, y] of [['heater', 9 * mm, yBlock + by / 2 - 1 * mm], ['thermistor', -4 * mm, yBlock + by / 2 - 1 * mm]] as const) add({ id: `${ask.id}/set-screw-${what}`, name: `M3×4 set screw (ISO 4026), clamps the ${what}`, category: 'structure/fasteners/screws', material: 'steel 45H', shape: { kind: 'screw', size: 'M3', length: 4 * mm, axis: 'y', head: 1 }, at: [x, y, bz / 2 - 2 * mm], colour: 0x2b2b2b, values: [] }, 7850);
  const yBreak = yBlock + by / 2 + neckL / 2 + 3 * mm;
  xs.forEach((x, i) => add({ id: `${ask.id}/break${n > 1 ? `-${i + 1}` : ''}`, name: 'heat break M6, stainless, 2.0 mm bore, thin neck', category: 'thermal/heating/block', material: 'stainless.304', shape: { kind: 'round', r: 3 * mm, length: neckL + 12 * mm, axis: 'y', bore: neckI }, at: [x, yBreak, 0], colour: 0xcfd8dc, values: vals.filter((x2) => x2.name === 'heat climbing the break') }, ss.density));
  const sinkL = fins * 2.5 * mm + 4 * mm, ySink = yBreak + 6 * mm + sinkL / 2;
  add({ id: `${ask.id}/heatsink-core`, name: `heatsink core Ø10 × ${(sinkL * 1e3).toFixed(0)} mm`, category: 'thermal/cooling', material: 'aluminum.6061-t6', shape: { kind: 'round', r: 5 * mm, length: sinkL, axis: 'y', bore: 4 * mm }, at: [0, ySink, 0], colour: 0x9e9e9e, values: vals.filter((x) => x.name === 'heatsink fin area' || x.name === 'fins') }, al.density);
  for (let i = 0; i < fins; i++) add({ id: `${ask.id}/fin-${i + 1}`, name: `fin ${i + 1}, Ø22 × 1 mm`, category: 'thermal/cooling', material: 'aluminum.6061-t6', shape: { kind: 'round', r: 11 * mm, length: 1 * mm, axis: 'y', bore: 10 * mm }, at: [0, yBreak + 6 * mm + 2 * mm + i * 2.5 * mm + 0.5 * mm, 0], colour: 0xbdbdbd, values: [] }, al.density);
  const fanP = ask.fan ? 1.0 : 0;
  if (ask.fan) add({ id: `${ask.id}/fan`, name: `30 × 30 × 10 mm ${ask.V} V axial fan, about 1 W`, category: 'thermal/cooling', material: 'PBT housing', shape: { kind: 'block', size: [30 * mm, 30 * mm, 10 * mm] }, at: [0, ySink, 11 * mm + 6 * mm], colour: 0x37474f, values: [], mass: 0.012 }, 0);
  const height = ySink + sinkL / 2;
  const mass = Pts.reduce((s, p) => s + p.mass, 0);
  return { id: ask.id, name: n > 1 ? `hot end, ${n} streams` : 'hot end', category: 'thermal', from: ask.id, parts: Pts, values: vals, ask, electrical: { P, R, I: P / ask.V }, fan: ask.fan ? { P: fanP } : null, flaws, mass, height, streams: n, cartridges: nc };
}

/** Design, find the flaws, apply the remedies (another cartridge, up to one a stream; the stream split side by side), design again. */
export function hotEndFor(ask: HeaterAsk, rounds = 24): { hotEnd: HotEnd; history: { streams: number; cartridges: number; flaws: Flaw[] }[] } {
  let streams = ask.streams ?? 1, cartridges = ask.cartridges ?? 1;
  const history: { streams: number; cartridges: number; flaws: Flaw[] }[] = [];
  for (let r = 0; r < rounds; r++) {
    const h = designHotEnd({ ...ask, streams, cartridges });
    history.push({ streams, cartridges, flaws: h.flaws });
    const remedy = h.flaws.find((f) => f.remedy)?.remedy;
    if (!remedy) return { hotEnd: h, history };
    // another cartridge alongside, as many as the streams the block holds
    if (remedy === 'another cartridge') cartridges += 1;
    else if (remedy === 'split the stream') {
      // no more streams than the part is wide enough to take: past that, the flaw stays, located
      if (streams >= (ask.maxStreams ?? Infinity)) return { hotEnd: { ...h, flaws: h.flaws.map((f) => (f.remedy === 'split the stream' ? { ...f, remedy: null, says: `${f.says}, and ${streams} streams already span the part` } : f)) }, history };
      streams += 1;
    }
  }
  return { hotEnd: designHotEnd({ ...ask, streams, cartridges }), history };
}

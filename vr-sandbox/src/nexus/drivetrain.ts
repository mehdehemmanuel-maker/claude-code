// A gearbox built as it is made, from its first parts up: its case and bell housing cast round their bearings' bores; its
// shafts turned; its gears cut (the general makers' toothed, each pair at its ratio's sizes on its centre distance); its
// bearings and seals from the library; its final drive's pinion and ring gear; its differential, a case round its pinion
// shaft, two pinions and two side gears; a manual's synchro rings, shift forks and selector rods, or a CVT's two pulleys
// of two sheaves each and the steel push belt between them, a torque converter in its bell housing. Every piece sized
// from the room it is given and the torque it takes, and weighed from its own shape: no mass is said for it.
//
// Its frame: its shafts along z (a transverse transaxle's, the drive shafts' line), its middle at its origin, the engine
// on its +z side; its differential where it is told (the drive shafts' line, relative to its middle).

import type { Part, V3 } from './kits';
import { chainPath, chainRun, housing, toothed, turned } from './makers';
import { partOf } from './assembly';
import { use } from './components';
import { massOf } from './mass';

const PI = Math.PI;
const P = (name: string, shape: Part['shape'], at: V3, more: Partial<Part> = {}): Part => ({ name, shape, at, ...more });
const group = (name: string, parts: Part[], more: Partial<Part> = {}): Part => ({ name, at: [0, 0, 0], parts, ...more });
/** A ring turned about z: inside ri, outside ro, w long, its middle at `at`. */
const ringZ = (name: string, ri: number, ro: number, w: number, at: V3, more: Partial<Part> = {}): Part => P(name, { lathe: [[ri, -w / 2], [ro, -w / 2], [ro, w / 2], [ri, w / 2], [ri, -w / 2]] }, at, { rot: [PI / 2, 0, 0], ...more });
/** A gear cut on a shaft along z, its middle at `at`. */
const gearZ = (name: string, m: number, z: number, b: number, bore: number, at: V3, item = 'transmission-gear'): Part => ({ ...toothed({ name, m, z, b, bore, mat: 'steel-alloy', item }), at });
/** A shaft turned along z through `at`, `L` long. */
const shaftZ = (name: string, r: number, L: number, at: V3, item: string): Part => turned({ name, steps: [[r * 0.8, L * 0.1], [r, L * 0.8], [r * 0.8, L * 0.1]], mat: 'steel-alloy', item, at: [at[0], at[1], at[2] - L / 2], rot: [PI / 2, 0, 0], finish: 'ground' });

export interface GearboxSpec { kind: 'manual' | 'cvt' | 'automatic'; /** its room: fore-aft (x), up (y), across (z), m */ room: V3; /** its differential's axis, relative to its middle (x, y); none for a gearbox behind an engine in line (a truck's), its output to a driveshaft */ diff: [number, number] | null; /** the most torque it takes, N·m */ torque: number; /** a manual's ratios, first to top */ ratios?: number[]; final?: number; says?: string }
/** A torque converter on an input's axis in its bell housing: its impeller (on the engine's drive plate), its turbine
 *  (on the input shaft) and its stator between them; their sizes from the room. */
function torqueConverter(at: [number, number], H: number, W: number): Part {
  const tcR = Math.min(H / 2 - 0.02, 0.13);
  return group('torque converter', [ringZ('impeller', 0.03, tcR, 0.04, [at[0], at[1], W / 2 - 0.05], { item: 'tc-impeller', mat: 'steel-low', color: 0x8a8c90, fill: 0.35 }), ringZ('turbine', 0.03, tcR * 0.95, 0.035, [at[0], at[1], W / 2 - 0.09], { item: 'tc-turbine', mat: 'steel-low', color: 0x9a9ca0, fill: 0.35 }), ringZ('stator', 0.03, tcR * 0.6, 0.02, [at[0], at[1], W / 2 - 0.07], { item: 'tc-stator', mat: 'al-a380', color: 0xa8aaae, fill: 0.4 })], { item: 'torque-converter' });
}
export interface GearboxBuilt { gearbox: Part; kg: number; pieces: number }
const made = new Map<string, GearboxBuilt>();
/** A transaxle: case, shafts, gears, bearings, seals, final drive and differential; a manual's gear train and shift, or a
 *  CVT's pulleys, belt and torque converter. */
export function transaxle(s: GearboxSpec): GearboxBuilt {
  const key = JSON.stringify(s), was = made.get(key); if (was) return was;
  // (its case's walls 5 mm on a 200 N·m car's, thicker as the cube root of its torque (typical: a truck's about 12 mm))
  const [L, H, W] = s.room, wall = 0.005 * Math.max(1, Math.cbrt(s.torque / 200)), out: Part[] = [];
  // (its gears' module from its torque: about 2.25 mm for a 200 N·m car's, as the cube root of the torque, typical)
  const m = Math.max(0.0015, 0.00225 * Math.cbrt(s.torque / 200)), fw = 6 * m;
  // (its case in two castings split across its shafts: the bell housing on the engine's side, the case beyond; each open
  // on the face where they bolt together, and the bell open to the engine too, bolted to its block round the flywheel or
  // drive plate; walls 5 mm, typical of die-cast transaxle cases)
  const bell = { ...housing({ name: 'bell housing', L, H, W: W * 0.45, wall, open: ['left', 'right'], mat: 'al-a380', item: 'bell-housing' }), at: [0, 0, W * 0.275] as V3 };
  const kase = { ...housing({ name: 'transaxle case', L, H, W: W * 0.55, wall, open: ['right'], mat: 'al-a380', item: 'gearbox-case' }), at: [0, 0, -W * 0.225] as V3 };
  out.push(bell, kase);
  // (its shafts: its input from the engine high at its front, its output under it, its differential where it is told)
  const dx = s.diff ? s.diff[0] : -L / 2 + 0.08, dy = s.diff ? s.diff[1] : -H / 2 + 0.1, inAt: [number, number] = [Math.min(L / 2 - 0.06, dx + 0.17), Math.min(H / 2 - 0.06, dy + 0.1)], outAt: [number, number] = [inAt[0] - 0.02, inAt[1] - 0.085];
  const span = W - 2 * wall - 0.01, z0 = -span / 2;
  out.push(shaftZ('input shaft', 0.012, span, [inAt[0], inAt[1], 0], 'input-shaft'), shaftZ('output shaft', 0.014, span * 0.85, [outAt[0], outAt[1], -span * 0.05], 'output-shaft'));
  for (const [x, y, zz] of [[inAt[0], inAt[1], z0 + 0.01], [inAt[0], inAt[1], -z0 - 0.01], [outAt[0], outAt[1], z0 + 0.01], [outAt[0], outAt[1], -z0 - 0.06]] as V3[]) out.push(use('bearing 6205', [x, y, zz], { rot: [PI / 2, 0, 0], name: 'shaft bearing' }));
  if (s.kind === 'manual') {
    // (a gear pair for each ratio on the two shafts' centre distance, a synchro ring beside each driven gear, a fork in
    // each pair's sleeve on its selector rod)
    const cd = Math.hypot(inAt[0] - outAt[0], inAt[1] - outAt[1]), ratios = s.ratios ?? [3.5, 1.9, 1.3, 1.0, 0.82, 0.68], pitch = (span * 0.7) / ratios.length;
    ratios.forEach((r, i) => {
      const zSum = Math.round((2 * cd) / m), z1 = Math.max(12, Math.round(zSum / (1 + r))), z2 = zSum - z1, zz = z0 + 0.03 + (i + 0.5) * pitch;
      out.push(gearZ(`gear ${i + 1} (input)`, m, z1, fw, 0.024, [inAt[0], inAt[1], zz]), gearZ(`gear ${i + 1} (output)`, m, z2, fw, 0.028, [outAt[0], outAt[1], zz]));
      out.push(ringZ('synchro ring', 0.02, 0.03, 0.006, [outAt[0], outAt[1], zz + fw / 2 + 0.004], { item: 'synchro-ring', mat: 'brass', color: 0xc8a050, finish: 'machined' }));
    });
    const rodY = Math.min(H / 2 - 0.02, inAt[1] + 0.05);
    for (let k = 0; k < Math.ceil(ratios.length / 2); k++) {
      const zz = z0 + 0.03 + (2 * k + 1) * pitch;
      out.push(turned({ name: 'selector rod', steps: [[0.006, span * 0.9]], mat: 'steel-alloy', item: 'selector-rod', at: [outAt[0] + 0.05 + k * 0.015, rodY, -span * 0.45], rot: [PI / 2, 0, 0] }));
      out.push(P('shift fork', { box: [0.05, rodY - outAt[1], 0.006] }, [outAt[0] + 0.03 + k * 0.015, (rodY + outAt[1]) / 2, zz], { item: 'shift-fork', mat: 'steel-low', color: 0x6a6c70, finish: 'cast', fill: 0.6 }));
    }
  } else if (s.kind === 'cvt') {
    // (a CVT: a pulley of two conical sheaves on each shaft, one sliding, the push belt between them at its middle ratio,
    // about 30 mm wide (typical of a car's); a torque converter in its bell housing on the input)
    const sheave = (name: string, r: number, at: V3, sd: number): Part => P(name, { lathe: [[0.015, 0], [r, 0], [r, 0.004], [0.03, 0.02 + r * 0.15], [0.015, 0.02 + r * 0.15], [0.015, 0]] }, at, { rot: [sd * PI / 2, 0, 0], item: 'cvt-sheave', mat: 'steel-alloy', color: 0x9a9ca0, finish: 'ground' });
    const pr = Math.min(0.08, H * 0.3), zc = -span * 0.15, cd2 = Math.max(0.16, pr * 2.3);
    const inP: [number, number] = [inAt[0], inAt[1]], outP: [number, number] = [inAt[0] - cd2 * 0.6, inAt[1] - cd2 * 0.8];
    out.push(group('primary pulley', [sheave('fixed sheave', pr, [inP[0], inP[1], zc - 0.016], 1), sheave('sliding sheave', pr, [inP[0], inP[1], zc + 0.016], -1)], { item: 'cvt-pulley' }));
    out.push(group('secondary pulley', [sheave('fixed sheave', pr, [outP[0], outP[1], zc + 0.016], -1), sheave('sliding sheave', pr, [outP[0], outP[1], zc - 0.016], 1)], { item: 'cvt-pulley' }));
    // (its belt: some 400 steel elements, each 1.8 mm thick, pushed round on two packs of thin steel rings, typical)
    const path = chainPath([[inP[0], inP[1], pr * 0.62], [outP[0], outP[1], pr * 0.62]]), pts = [...path, path[0]!], segs = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i]![0], q[1] - pts[i]![1])), total = segs.reduce((a, b) => a + b, 0);
    const elems: Part[] = []; const n = Math.round(total / 0.0018);
    for (let k = 0; k < n; k++) { let d = (k * total) / n, i = 0; while (d > segs[i]! && i < segs.length - 1) { d -= segs[i]!; i++; } const a = pts[i]!, b = pts[i + 1]!, f = d / segs[i]!, ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      elems.push(P('belt element', { box: [0.0018, 0.012, 0.03] }, [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, zc], { rot: [0, 0, ang + PI / 2], item: 'push-belt-element', mat: 'steel-alloy', color: 0x8a8c90, finish: 'ground', fill: 0.7 })); }
    for (const sd of [-1, 1]) elems.push(P('belt ring pack', { tube: { r: 0.0012, pts: pts.map(([x, y]) => [x, y, zc + sd * 0.011] as V3) } }, [0, 0, 0], { item: 'push-belt-ring', mat: 'steel-spring', color: 0xb0b2b6, finish: 'ground', fill: 0.8, says: 'twelve thin maraging steel rings nested, drawn as one band' }));
    out.push(group('push belt', elems, { item: 'push-belt', says: `${n} steel elements on two ring packs` }));
    out.push(torqueConverter(inP, H, W));
  } else if (s.kind === 'automatic') {
    // (a planetary automatic laid across: its torque converter in the bell on the engine's axis; its input turning a
    // drive sprocket, a link chain across to a driven sprocket on its gear train's axis below (as the 4T65-E's drive
    // chain does); on that axis two simple planetary sets (a sun, three planets on a carrier, an internal ring), and a
    // clutch pack beside each, which its valve body applies for each gear; their sizes from its torque)
    const inP: [number, number] = [inAt[0], inAt[1]], gP: [number, number] = [outAt[0] - 0.02, outAt[1] - 0.06], zc = W / 2 - 0.14;
    out.push(torqueConverter(inP, H, W));
    const zs = 25, cd = Math.hypot(inP[0] - gP[0], inP[1] - gP[1]), pitch = 0.0095, rs = (pitch * zs) / (2 * Math.PI);
    const sprocket = (name: string, at: [number, number]) => ({ ...toothed({ name, m: pitch / Math.PI, z: zs, b: 0.03, bore: 0.03, mat: 'steel-alloy', item: 'chain-sprocket' }), at: [at[0], at[1], zc] as V3 });
    out.push(sprocket('drive sprocket', inP), sprocket('driven sprocket', gP));
    const path = chainPath([[inP[0], inP[1], rs], [gP[0], gP[1], rs]]).map(([u, v]) => [u, v, zc] as V3);
    out.push({ ...partOf(chainRun({ name: 'drive chain', p: pitch, roller: 0.006, width: 0.03, path, closed: true })), item: 'drive-chain', says: `a link chain on two ${zs}-tooth sprockets ${(cd * 1000).toFixed(0)} mm apart (its pitch and width typical of a transverse automatic's)` });
    const mp = Math.max(0.0015, m * 0.8), Zs = 30, Zr = 72, Zp = (Zr - Zs) / 2, rp = (mp * (Zs + Zp)) / 2;
    for (const [k, zz] of [[1, z0 + 0.06], [2, z0 + 0.06 + 0.075]] as [number, number][]) {
      const set: Part[] = [{ ...toothed({ name: 'sun gear', m: mp, z: Zs, b: fw, bore: 0.022, mat: 'steel-alloy', item: 'sun-gear' }), at: [0, 0, 0] as V3 }];
      for (let j = 0; j < 3; j++) { const a = (2 * Math.PI * j) / 3; set.push({ ...toothed({ name: 'planet gear', m: mp, z: Zp, b: fw, bore: 0.012, mat: 'steel-alloy', item: 'planet-gear' }), at: [rp * Math.cos(a), rp * Math.sin(a), 0] as V3 }); }
      const rr = (mp * Zr) / 2;
      set.push(ringZ('ring gear', rr + 1.25 * mp, rr + 1.25 * mp + 0.006, fw, [0, 0, 0], { item: 'ring-gear', mat: 'steel-alloy', color: 0x8a8c90, finish: 'ground', says: `${Zr} teeth cut inside it (its teeth not drawn)` }));
      set.push(ringZ('planet carrier', 0.012, rp + 0.01, 0.004, [0, 0, fw / 2 + 0.004], { item: 'planet-carrier', mat: 'steel-low', color: 0x6a6c70, finish: 'machined' }));
      // (its clutch pack: friction plates and steel plates in turn, about 2 mm each, typical)
      const pack: Part[] = Array.from({ length: 8 }, (_, q) => ringZ(q % 2 ? 'steel clutch plate' : 'friction clutch plate', rr * 0.55, rr * 0.95, 0.0018, [0, 0, fw / 2 + 0.012 + q * 0.0022], { item: q % 2 ? 'clutch-plate' : 'clutch-friction-plate', mat: q % 2 ? 'steel-low' : 'paper', color: q % 2 ? 0x9a9ca0 : 0x6a4a2a }));
      out.push(group(`planetary set ${k}`, [...set, group('clutch pack', pack, { item: 'clutch-pack' })], { item: 'planetary-gearset', at: [gP[0], gP[1], zz], says: `a sun of ${Zs}, three planets of ${Zp}, a ring of ${Zr}: alone, ${(1 + Zr / Zs).toFixed(2)} to 1 with its ring held` }));
    }
    out.push(P('valve body', { box: [L * 0.6, 0.05, W * 0.5] }, [0, -H / 2 + 0.035, 0], { item: 'valve-body', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', fill: 0.55, says: 'its passages and spool valves, which its solenoids switch to apply each clutch (about 0.55 metal, an estimate)' }));
  }
  // (its final drive: a pinion on the output shaft, a ring gear on the differential's case; their sizes from its final
  // ratio (about 4 to 1, typical) on their centre distance)
  if (s.diff) {
  const cdF = Math.hypot(outAt[0] - dx, outAt[1] - dy), mF = m * 1.1, zSum = Math.round((2 * cdF) / mF), fin = s.final ?? 4, zp = Math.max(13, Math.round(zSum / (1 + fin))), zr = zSum - zp, zF = z0 + 0.05;
  out.push(gearZ('final drive pinion', mF, zp, fw * 1.3, 0.026, [outAt[0], outAt[1], zF], 'final-drive-pinion'));
  const ringR = (mF * zr) / 2;
  const diff: Part[] = [{ ...toothed({ name: 'final drive ring gear', m: mF, z: zr, b: fw * 1.3, bore: ringR * 0.9, mat: 'steel-alloy', item: 'final-drive-gear' }), at: [0, 0, zF] },
    P('differential case', { lathe: [[0.02, -0.06], [0.06, -0.06], [0.07, 0], [0.06, 0.06], [0.02, 0.06], [0.02, -0.06]] }, [0, 0, zF + 0.03], { rot: [PI / 2, 0, 0], item: 'diff-case', mat: 'cast-iron', color: 0x5a5c60, finish: 'cast', fill: 0.55 }),
    turned({ name: 'pinion shaft', steps: [[0.008, 0.1]], mat: 'steel-alloy', item: 'pinion-shaft', at: [0, 0.05, zF + 0.03], rot: [PI, 0, 0] }),
    ...[-1, 1].map((sd) => ({ ...toothed({ name: 'differential pinion', m: 0.003, z: 10, b: 0.012, bore: 0.016, mat: 'steel-alloy', item: 'diff-pinion' }), at: [0, sd * 0.032, zF + 0.03] as V3, rot: [PI / 2, 0, 0] as V3 })),
    ...[-1, 1].map((sd) => ({ ...toothed({ name: 'side gear', m: 0.003, z: 16, b: 0.014, bore: 0.025, mat: 'steel-alloy', item: 'diff-side-gear' }), at: [0, 0, zF + 0.03 + sd * 0.03] as V3 })),
    ...[-1, 1].map((sd) => use('bearing 6207', [0, 0, zF + 0.03 + sd * 0.07], { rot: [PI / 2, 0, 0], name: 'differential bearing' }))];
  out.push(group('differential', diff, { item: 'differential', at: [dx, dy, 0], says: 'its case turned by the ring gear, two pinions on its shaft driving the two side gears, the drive shafts in them' }));
  // (a seal where each drive shaft leaves it; its drain and fill plugs; its case's bolts round the joint)
  for (const sd of [-1, 1]) out.push(ringZ('drive shaft seal', 0.017, 0.031, 0.01, [dx, dy, sd * (W / 2 - 0.005)], { item: 'shaft-seal', mat: 'nbr', color: 0x1a1a1a }));
  } else {
    // (in line: its output shaft out through its rear seal to a yoke for the driveshaft)
    out.push(ringZ('output seal', 0.03, 0.05, 0.012, [outAt[0], outAt[1], -W / 2 + 0.006], { item: 'shaft-seal', mat: 'nbr', color: 0x1a1a1a }), ringZ('output yoke', 0.03, 0.06, 0.06, [outAt[0], outAt[1], -W / 2 - 0.03], { item: 'uj-yoke', mat: 'steel-alloy', color: 0x6a6c70, finish: 'forged', fill: 0.6 }));
  }
  out.push(use('bolt M14x20', [dx - 0.05, -H / 2, -W * 0.2], { rot: [PI, 0, 0], name: 'drain plug' }), use('bolt M14x20', [0, H * 0.1, -W / 2], { rot: [-PI / 2, 0, 0], name: 'fill plug' }));
  const nb = Math.max(8, Math.round((2 * (L + H)) / 0.09));
  for (let k = 0; k < nb; k++) { const f = k / nb, per = 2 * (L + H); let d = f * per, x: number, y: number; if (d < L) { x = -L / 2 + d; y = H / 2 + 0.006; } else if ((d -= L) < H) { x = L / 2 + 0.006; y = H / 2 - d; } else if ((d -= H) < L) { x = L / 2 - d; y = -H / 2 - 0.006; } else { d -= L; x = -L / 2 - 0.006; y = -H / 2 + d; }
    out.push(use('bolt M8x30', [x, y, W * 0.05 + 0.012], { rot: [PI / 2, 0, 0], name: 'case bolt' })); }
  const gearbox = group('gearbox', out, { item: s.kind === 'cvt' ? 'cvt-transaxle' : s.kind === 'automatic' ? 'automatic-transaxle' : s.diff ? 'manual-transaxle' : 'manual-gearbox', says: s.says ?? '' });
  const count = (q: Part): number => (q.shape ? 1 : 0) + (q.parts ?? []).reduce((a, r) => a + count(r), 0);
  const res = { gearbox, kg: massOf(gearbox), pieces: count(gearbox) };
  made.set(key, res); return res;
}

/** A heavy rigid axle as it is made, across z at (x, y) in its machine's frame, its wheels' hubs at ±track/2: a drive
 *  axle's banjo housing (two square arms welded to its bowl, a spindle at each end), its carrier bolted in the bowl (a
 *  hypoid pinion and ring gear, the differential's case round its spider and side gears, its bearings), its two axle
 *  shafts out to the hubs; or a steer axle's forged I-beam, a kingpin boss and kingpin at each end. Sizes typical of a
 *  highway tractor's (a 40,000 lb tandem's), said where used. `carry` is what its whole is said to be (its link). */
export function heavyAxle(o: { name: string; x: number; y: number; track: number; drive: boolean; carry?: Partial<Part>; /** the shaft its hubs turn on, as they ask it */ shaft?: number }): Part {
  const fits: Partial<Part> = o.shaft ? { iface: [{ kind: 'shaft', role: 'provides', d: o.shaft }] } : {};
  const half = o.track / 2, hubIn = half - 0.22, c = o.carry ?? {}, steel = { mat: 'steel-low', color: 0x2a2a2a, finish: 'paint', ...c } as Partial<Part>, out: Part[] = [];
  if (o.drive) {
    // (its arms: 150 mm square tube, 12 mm wall (typical), from the bowl out to the spindles; its spindles 130 mm across)
    const arms: Part[] = [-1, 1].flatMap((sd) => [
      P('housing arm', { box: [0.15, 0.15, hubIn - 0.25] }, [o.x, o.y, sd * (0.25 + (hubIn - 0.25) / 2)], { ...steel, shell: 0.012, one: true }),
      P('spindle', { cyl: [0.065, 0.2] }, [o.x, o.y, sd * (hubIn + 0.1)], { ...steel, ...fits, rot: [PI / 2, 0, 0], one: true, finish: 'machined' })]);
    out.push(group('axle housing', [...arms, P('housing bowl', { cyl: [0.24, 0.5] }, [o.x, o.y, 0], { ...steel, rot: [PI / 2, 0, 0], shell: 0.012, one: true })], { item: 'axle-housing', says: 'pressed and welded steel: two arms into its bowl, a spindle on each end' }));
    // (its carrier bolted into the front of the bowl: a hypoid pinion at about 3.4 to 1 (a highway ratio, typical) driving
    // the ring gear; the differential's case on two taper bearings, four spider pinions and two side gears in it)
    const ring = { ...toothed({ name: 'ring gear', m: 0.009, z: 41, b: 0.06, bore: 0.3, mat: 'steel-alloy', item: 'final-drive-gear' }), at: [o.x, o.y, 0.09] as V3 };
    const carrier: Part[] = [P('carrier housing', { lathe: [[0.06, 0], [0.2, 0], [0.2, 0.08], [0.09, 0.32], [0.06, 0.32], [0.06, 0]] }, [o.x, o.y, 0], { rot: [0, 0, -PI / 2], item: 'carrier-housing', mat: 'cast-iron', color: 0x3a3c40, finish: 'cast', fill: 0.6, ...c }),
      { ...ring, ...c }, { ...toothed({ name: 'drive pinion', m: 0.009, z: 12, b: 0.07, bore: 0.03, mat: 'steel-alloy', item: 'final-drive-pinion' }), at: [o.x + 0.2, o.y, 0] as V3, rot: [0, PI / 2, 0] as V3, ...c },
      P('differential case', { lathe: [[0.04, -0.12], [0.14, -0.12], [0.16, 0], [0.14, 0.12], [0.04, 0.12], [0.04, -0.12]] }, [o.x, o.y, 0], { rot: [PI / 2, 0, 0], item: 'diff-case', mat: 'cast-iron', color: 0x5a5c60, finish: 'cast', fill: 0.5, ...c }),
      ...[-1, 1].map((sd) => ({ ...toothed({ name: 'side gear', m: 0.006, z: 18, b: 0.04, bore: 0.05, mat: 'steel-alloy', item: 'diff-side-gear' }), at: [o.x, o.y, sd * 0.07] as V3, ...c })),
      ...[0, 1, 2, 3].map((k) => ({ ...toothed({ name: 'spider pinion', m: 0.006, z: 11, b: 0.03, bore: 0.025, mat: 'steel-alloy', item: 'diff-pinion' }), at: [o.x + 0.06 * Math.cos((k * PI) / 2), o.y + 0.06 * Math.sin((k * PI) / 2), 0] as V3, rot: [0, PI / 2, (k * PI) / 2] as V3, ...c })),
      turned({ name: 'spider', steps: [[0.018, 0.14]], mat: 'steel-alloy', item: 'pinion-shaft', at: [o.x - 0.07, o.y, 0], rot: [0, 0, -PI / 2] }),
      ...[-1, 1].map((sd) => use('bearing 6207', [o.x, o.y, sd * 0.15], { rot: [PI / 2, 0, 0], name: 'carrier bearing', ...c }))];
    out.push(group('differential carrier', carrier, { item: 'differential', says: 'a hypoid pinion driving the ring gear on the differential\'s case (typical of a tandem\'s)' }));
    // (its axle shafts: from the side gears out through the arms to the hubs, 2.1 in. splined bars (typical))
    for (const sd of [-1, 1]) out.push(turned({ name: 'axle shaft', steps: [[0.027, hubIn + 0.18 - 0.07]], mat: 'steel-alloy', item: 'axle-shaft', at: [o.x, o.y, sd * 0.07], rot: [sd * PI / 2, 0, 0], finish: 'forged' }));
  } else {
    // (a steer axle: a forged I-beam (about 45 % of the box round it, its web and flanges), a kingpin boss at each end
    // and the kingpin through it, its knuckles turning on them)
    out.push(group('axle beam', [P('I-beam', { box: [0.1, 0.13, 2 * hubIn - 0.12] }, [o.x, o.y - 0.05, 0], { ...steel, fill: 0.45, one: true }), ...[-1, 1].map((sd) => P('kingpin boss', { cyl: [0.055, 0.2] }, [o.x, o.y, sd * (hubIn - 0.03)], { ...steel, ...fits, one: true }))], { item: 'axle-beam', says: 'forged steel I-section, its kingpin bosses at its ends' }));
    for (const sd of [-1, 1]) out.push(turned({ name: 'kingpin', steps: [[0.025, 0.26]], mat: 'steel-alloy', item: 'kingpin', at: [o.x, o.y - 0.13, sd * (hubIn - 0.03)], finish: 'ground' }));
  }
  return group(o.name, out, { item: o.drive ? 'drive-axle' : 'steer-axle', ...c });
}

/** A driveshaft from one point to another: a steel tube, a slip yoke at its front end so it can lengthen as the axle
 *  rises, a universal joint at each end (two yokes, a spider, four bearing caps). Its tube about 4.5 in. across on a
 *  truck, 3 in. on a car (typical). */
export function driveshaft(name: string, a: V3, b: V3, heavy: boolean): Part {
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(d[0]!, d[1]!, d[2]!), r = heavy ? 0.057 : 0.038, rot: V3 = [0, -Math.atan2(d[2]!, d[0]!), Math.asin(d[1]! / L) - PI / 2];
  const uj = (y: number): Part => group('universal joint', [P('yoke', { box: [r * 1.6, r * 0.8, r * 1.6] }, [0, y - r * 0.4, 0], { item: 'uj-yoke', mat: 'steel-alloy', color: 0x6a6c70, finish: 'forged', fill: 0.5 }), P('yoke', { box: [r * 1.6, r * 0.8, r * 1.6] }, [0, y + r * 0.4, 0], { item: 'uj-yoke', mat: 'steel-alloy', color: 0x6a6c70, finish: 'forged', fill: 0.5, rot: [0, PI / 2, 0] }), P('spider', { cyl: [r * 0.2, r * 1.8] }, [0, y, 0], { item: 'uj-spider', mat: 'steel-alloy', color: 0x8a8c90, rot: [PI / 2, 0, 0] }), P('spider', { cyl: [r * 0.2, r * 1.8] }, [0, y, 0], { item: 'uj-spider', mat: 'steel-alloy', color: 0x8a8c90, rot: [0, 0, PI / 2] }), ...[[r * 0.9, 0], [-r * 0.9, 0], [0, r * 0.9], [0, -r * 0.9]].map(([x, z]) => P('bearing cap', { cyl: [r * 0.3, r * 0.3] }, [x!, y, z!], { joins: ['yoke'], fixed: 'pressed into the ear of its yoke', item: 'uj-cap', mat: 'steel-alloy', color: 0x8a8c90, rot: x ? [0, 0, PI / 2] as V3 : [PI / 2, 0, 0] as V3 }))], { item: 'universal-joint' });
  return group(name, [P('driveshaft tube', { cyl: [r, L - 4 * r] }, [0, L / 2, 0], { item: 'driveshaft-tube', mat: 'steel-low', color: 0x2a2a2a, finish: 'paint', shell: heavy ? 0.003 : 0.0018 }), P('slip yoke', { cyl: [r * 0.9, r * 2.2] }, [0, r * 2.6, 0], { item: 'slip-yoke', mat: 'steel-alloy', color: 0x6a6c70, finish: 'forged', fill: 0.7 }), uj(r * 0.8), uj(L - r * 0.8)], { item: 'driveshaft', at: a, rot });
}

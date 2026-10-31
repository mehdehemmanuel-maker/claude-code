// A piston engine built as it is made, from its first parts up: each piston, ring, pin and clip; each rod, its cap, its
// shells and its bolts; the crank forged in one; the block cast round its cores, its liners, its main caps, shells and
// bolts; the head cast round its ports, its valves, springs, retainers, keepers, guides, seals and tappets, its cams and
// their caps; the timing drive; the oiling (pan, pump, pickup, filter); the intake, the exhaust, the plugs and coils or
// the injectors; and what hangs on it (alternator, water pump, starter, belt, tensioner, damper, flywheel). Every piece is
// sized from the engine's bore and stroke by the proportions engines are drawn to (each said where it is used, typical
// unless a maker's figure is given), and every piece is weighed from its own shape and material: no mass is said for the
// engine or any piece of it. What it weighs and how big it is are what its parts come to, so a car's bay and a truck's
// frame are laid out round the engine its parts make (machines.ts asks engineBuilt for its size), not round a box.
//
// Its frame: the crank's axis along x, its front (the timing drive) toward +x, its flywheel toward -x; its cylinders up
// +y from the crank's axis at y = 0; its intake side +z, its exhaust side -z.

import type { Part, V3 } from './kits';
import { chainPath, chainRun, coil, housing, mouldedChip, ringClip, toothed, turned, wound } from './makers';
import { boundsOfAll, frame, partOf } from './assembly';
import { prismVolume } from './form';
import { use } from './components';
import { massOf } from './mass';
import { CHAINS } from './families';
import { SPRING_WIRES, allowableShear, shearStress, solidLength, springRate } from '../engineering/springs';
import * as THREE from 'three';

const PI = Math.PI;
export interface EngineSpec {
  name?: string; cyl: number; /** m */ bore: number; /** m */ stroke: number; layout?: 'inline' | 'vee'; /** degrees between its banks */ vee?: number;
  fuel: 'petrol' | 'diesel'; block: 'al' | 'iron'; cooling?: 'liquid' | 'air'; cams?: 'dohc' | 'sohc' | 'ohv'; valves?: 2 | 4; turbo?: boolean;
  /** its compression ratio (typical if not said: 10.5 petrol, 17 diesel) */ cr?: number;
  starter?: 'electric' | 'recoil'; /** how its fuel is metered (injection, unless it is a single or air-cooled) */ induction?: 'injection' | 'carburettor'; /** its rod's length, centre to centre, m (1.6 strokes if not said, typical) */ rod?: number; /** the speed its parts are sized to carry, rpm (typical if not said: 6,500 a car's petrol engine, 2,100 a heavy diesel, 3,600 a governed small engine) */ redline?: number; /** its peak cylinder pressure, Pa (typical if not said: 8 MPa petrol, 18 MPa diesel) */ pmax?: number; says?: string;
  /** what its maker chose where engines differ (its pump, its drive to the gearbox, its cam phasing, its injection, its
   *  EGR): one of FITS by name, or said outright; each choice sourced where it is set */ fit?: EngineFit | string;
}
export interface EngineFit {
  /** its water pump driven off the belt, or by its own motor */ waterPump?: 'belt' | 'electric';
  /** a flywheel (a manual's clutch on it), or a thin drive plate to a torque converter (an automatic's, a CVT's) */ drive?: 'flywheel' | 'drive-plate';
  /** its intake cam phased by an electric motor (and its exhaust cam by oil) */ vvt?: 'none' | 'electric-intake';
  /** its port injectors only, or a high-pressure pump (off its own lobe on the exhaust cam) for direct injectors too */ injection?: 'port' | 'port+direct';
  /** exhaust led back to the intake through a liquid cooler and a valve */ egr?: 'none' | 'cooled';
  says?: string;
}
/** The fits researched (src/data/references.ts, where each is sourced). */
export const FITS: Record<string, EngineFit> = {
  // (Toyota's TNGA page: a motor-driven water pump, D-4S; Wikipedia's on the series: VVT-iE on the intake cam, the
  // pump off the exhaust cam (of the A25A, its sister); mymotorlist: EGR with its liquid cooler; AustralianCar.Reviews:
  // the Corolla's CVT, which an engine drives through a drive plate)
  // (the GM 3800 Series II (L36) as fitted to the 2004 Monte Carlo: it drives a four-speed automatic, so a drive plate to
  // its torque converter; its other choices not researched here, so left as an engine of its kind has them)
  'gm-3800-l36': { drive: 'drive-plate', says: 'GM 3800 Series II (L36) as fitted to the 2004 Monte Carlo SS, driving a 4T65-E automatic' },
  'm20a-fks': { waterPump: 'electric', drive: 'drive-plate', vvt: 'electric-intake', injection: 'port+direct', egr: 'cooled', says: 'Toyota M20A-FKS as fitted to the 2025 Corolla LE (src/data/references.ts)' },
};
export const fitOf = (s: EngineSpec): EngineFit => (typeof s.fit === 'string' ? FITS[s.fit] ?? {} : s.fit ?? {});
const P = (name: string, shape: Part['shape'], at: V3, more: Partial<Part> = {}): Part => ({ name, shape, at, ...more });
const box = (name: string, s: V3, at: V3, more: Partial<Part> = {}): Part => P(name, { box: s }, at, more);
const group = (name: string, parts: Part[], more: Partial<Part> = {}): Part => ({ name, at: [0, 0, 0], parts, ...more });
// (ALONG_X turns a part's +y onto +x: a turned part, which runs from its origin up its y, then runs from its place along +x)
const ALONG_X: V3 = [0, 0, -PI / 2], CYL_X: V3 = [0, 0, PI / 2];
/** A half ring along x (a bearing shell, a big end's half, a main cap's saddle): inside radius ri, outside ro, w long,
 *  its upper half (y ≥ 0) or its lower. */
function halfRing(name: string, ri: number, ro: number, w: number, at: V3, up: boolean, more: Partial<Part> = {}): Part {
  const n = 16, s = up ? 1 : -1, pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = (PI * i) / n; pts.push([ro * Math.cos(a), s * ro * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = (PI * i) / n; pts.push([ri * Math.cos(a), s * ri * Math.sin(a)]); }
  return P(name, { prism: { pts, L: w } }, at, { rot: [0, PI / 2, 0], ...more });
}
/** A ring turned about x: inside ri, outside ro, w long, its middle at `at`. */
const ringX = (name: string, ri: number, ro: number, w: number, at: V3, more: Partial<Part> = {}): Part => P(name, { lathe: [[ri, -w / 2], [ro, -w / 2], [ro, w / 2], [ri, w / 2], [ri, -w / 2]] }, at, { rot: CYL_X, ...more });
/** A bolt from the library, its head at `at`, its shank down -y turned by `rot`; its length to the nearest 5 mm. */
const bolt = (thread: string, L: number, at: V3, rot: V3 = [0, 0, 0], name?: string, cls?: string): Part => use(`bolt ${thread}x${Math.max(10, Math.min(300, Math.round((L * 1000) / 5) * 5))}${cls ? ` ${cls}` : ''}`, at, { rot, ...(name ? { name } : {}) });
export const threadFor = (B: number): string => (B < 0.06 ? 'M6' : B < 0.085 ? 'M8' : B < 0.11 ? 'M10' : B < 0.13 ? 'M12' : 'M16');
const around = (wheels: [number, number, number][]): [number, number][] => chainPath(wheels).map(([u, v]) => [u, v] as [number, number]);

/** Its sizes, all from its bore and stroke (each proportion typical of engines of its kind, not one maker's). */
export function engineDims(s: EngineSpec) {
  const B = s.bore, S = s.stroke, r = S / 2, n = s.cyl, diesel = s.fuel === 'diesel', air = s.cooling === 'air', vee = s.layout === 'vee';
  // (a vee of two (a twin: its rods side by side on one pin) or of more (banked: two rows, each pair of rods on a pin)
  const twin = vee && n <= 2, banked = vee && n > 2;
  if (banked && n % 2) throw new Error(`a vee of ${n} cylinders: a banked vee has an even number, half in each bank`);
  const L = s.rod ?? 1.6 * S, CH = diesel ? 0.62 * B : 0.33 * B, skirt0 = diesel ? 0.55 * B : 0.42 * B;
  const pinD = diesel ? 0.4 * B : 0.25 * B, rp = diesel ? 0.32 * B : 0.27 * B, rm = diesel ? 0.38 * B : 0.3 * B;
  // (its piston's skirt no longer than clears its crank's webs as they come round under it at the bottom of its stroke: a
  // short-stroke engine's piston a short (slipper) skirt, as theirs are)
  const skirt = Math.min(skirt0, L - r - Math.hypot(rm, 1.05 * Math.max(rp, rm)) - 0.004);
  // (sized by what it carries: its big end at least as wide as keeps its shells under about 60 MPa (typical of tri-metal
  // shells) at its peak firing force; its rod's beam grows with it)
  const pmax = s.pmax ?? (diesel ? 18e6 : 8e6), redline = s.redline ?? (diesel ? 2100 : n <= 2 ? 3600 : 6500), Fg = (pmax * PI * B * B) / 4;
  const rodW = Math.max(diesel ? 0.3 * B : 0.26 * B, Fg / (2 * rp * 0.86 * 60e6));
  const shellT = Math.max(0.0015, 0.022 * B), wm = diesel ? 0.3 * B : 0.24 * B;
  const pitch = twin ? 0 : (air ? 1.4 : diesel ? 1.18 : 1.12) * B + 0.005;
  const wallB = (air ? 0.05 : 0.06) * B, jacket = air ? 0 : 0.08 * B, outer = (s.block === 'iron' ? 0.04 : 0.045) * B, Wb = B + 2 * (wallB + jacket + outer);
  const wc = (s.block === 'iron' ? 0.06 : 0.05) * B, swing = r + (diesel ? 0.62 : 0.55) * B, Wc = 2 * (swing + 0.01) + 2 * wc;
  // (its counterweights no taller than lets them pass under the piston's skirt at the bottom of its stroke; its bores'
  // feet (and the crankcase's top under them) over the reach of its webs' and counterweights' corners as they turn)
  // (its counterweights' corners, as they come round, clear of its piston's skirt at the bottom of its stroke)
  const cwH = Math.max(0.05 * B, Math.min(0.42 * B, Math.sqrt(Math.max(0, (L - r - skirt - 0.003) ** 2 - (1.3 * rm) ** 2)) - rm + 0.02 * B)), reach = Math.max(Math.hypot(r + rp, 1.05 * Math.max(rp, rm)), Math.hypot(rm + cwH - 0.02 * B, 1.3 * rm));
  const deck = r + L + CH, yb0 = Math.max(L - r - skirt, reach + wc + 0.003);
  // (a vee twin's two rods side by side on one pin, a main journal each side of the pin's webs, out past its barrels'
  // fins; its ends flush with its end mains)
  const linerT = s.block === 'iron' && !diesel ? 0 : (diesel ? 0.05 : 0.025) * B, roFin = B / 2 + linerT + wallB + outer + (air ? 0.28 * B : 0);
  const we = wm / 2, veeMain = Math.max(rodW + 0.002 + 0.12 * B + wm / 2, (rodW + 0.004) / 2 + roFin + wm / 2 + 0.005), len = twin ? 2 * (veeMain + wm / 2) + 2 * we : banked ? (n / 2) * pitch + 2 * we + (rodW + 0.004) : n * pitch + 2 * we, ysk = -(diesel ? 0.45 : 0.15) * B;
  const cams = s.cams ?? (diesel ? 'dohc' : 'dohc'), valves = s.valves ?? 4, Hh0 = (cams === 'dohc' ? (diesel ? 1.1 : 1.45) : cams === 'sohc' ? 1.2 : 0.95) * B, td = (diesel ? 0.16 : 0.11) * B, gasket = 0.0012;
  // (where its cams turn: over its buckets (dohc) or over its rockers (sohc), from its valve train's heights below)
  // (its springs seated on a floor over its ports (a port about 0.3 bore across, its roof about 0.32 bore over the deck))
  const seatH = 0.36 * B, tip = deck + gasket + td + seatH + 0.46 * B + 0.06 * B + 0.006, camY = cams === 'dohc' ? tip + 0.004 + 0.17 * B : tip + 0.12 * B + 0.1 * B + 0.17 * B;
  const HhIn = Math.max(Hh0, (cams === 'ohv' ? tip + 0.25 * B : camY + 0.2 * B) - (deck + gasket)), Hh = HhIn;
  const noseL = n <= 2 && !diesel ? 0.7 * B : 0.125;
  return { tip, camY, seatH, noseL, cwH, veeMain, pmax, redline, B, S, r, n, L, CH, skirt, pinD, rp, rm, rodW, shellT, wm, pitch, wallB, jacket, outer, Wb, deck, yb0, swing, wc, Wc, we, len, ysk, cams, valves, Hh, td, gasket, diesel, air, vee, twin, banked };
}
type Dims = ReturnType<typeof engineDims>;
/** Where each cylinder is: along the crank (x), its bank's lean about x (radians), its crank pin's angle. */
function cylinders(s: EngineSpec, d: Dims): { x: number; lean: number; phase: number }[] {
  const n = d.n;
  if (d.twin) { const h = ((s.vee ?? 90) * PI) / 360; return Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * (d.rodW + 0.004), lean: i % 2 ? -h : h, phase: h })); }
  if (d.banked) {
    // (two banks, a pair of rods side by side on each pin, one from each bank; its pins' angles for an even firing:
    // three pins 120° apart in a V6, two 180° in a V4, four at 90° (a cross-plane crank) in a V8. A V6 of 90°, as the
    // 3800, splits each pin by 30° for an even 120° firing interval: drawn here as one pin to each pair, a simplification)
    const h = ((s.vee ?? 90) * PI) / 360, m = n / 2, off = (d.rodW + 0.004) / 2;
    const pins: Record<number, number[]> = { 2: [0, 180], 3: [0, 120, 240], 4: [0, 90, 270, 180] }, deg = pins[m] ?? Array.from({ length: m }, (_, k) => (k * 360) / m);
    return Array.from({ length: n }, (_, i) => { const k = i >> 1, a = i % 2 ? 1 : -1; return { x: (k - (m - 1) / 2) * d.pitch + a * off, lean: a < 0 ? h : -h, phase: (deg[k]! * PI) / 180 + h }; });
  }
  // (its firing order's crank: a four's pins at 0, 180, 180, 0°; a six's at 0, 240, 120, 120, 240, 0°; a three's 120° apart)
  const ph: Record<number, number[]> = { 1: [0], 2: [0, 180], 3: [0, 240, 120], 4: [0, 180, 180, 0], 5: [0, 144, 288, 72, 216], 6: [0, 240, 120, 120, 240, 0] };
  const deg = ph[n] ?? Array.from({ length: n }, (_, i) => (i * 720) / n);
  return Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * d.pitch, lean: 0, phase: (deg[i]! * PI) / 180 }));
}
/** The heads it carries, each over its cylinders: one along an inline engine; one on each cylinder of a vee twin; one
 *  along each bank of a banked vee. Each with the cylinders under it (and their indices), its middle along the crank and
 *  its length. */
function headsOf(d: Dims, cyl: { x: number; lean: number; phase: number }[], len: number): { x: number; lean: number; L: number; cyl: typeof cyl; idx: number[] }[] {
  if (!d.vee) return [{ x: 0, lean: 0, L: len - 0.4 * d.we, cyl, idx: cyl.map((_, i) => i) }];
  if (d.twin) return cyl.map((c, i) => ({ x: c.x, lean: c.lean, L: 1.5 * d.B, cyl: [c], idx: [i] }));
  return [...new Set(cyl.map((c) => c.lean))].map((lean) => { const idx = cyl.flatMap((c, i) => (c.lean === lean ? [i] : [])), cs = idx.map((i) => cyl[i]!), x = cs.reduce((t, c) => t + c.x, 0) / cs.length;
    return { x, lean, L: cs.length * d.pitch - 0.004, cyl: cs, idx }; });
}
/** Where its main journals are along the crank: one each side of a vee twin's pin; between each throw and at each end. */
function mainsOf(d: Dims): number[] {
  if (d.twin) return [-d.veeMain, d.veeMain];
  const throws = d.banked ? d.n / 2 : d.n; return Array.from({ length: throws + 1 }, (_, k) => (k - throws / 2) * d.pitch);
}
/** Which side of its head a bank's exhausts leave by (+1 or -1 along its head's z): an inline engine's on its -z side, a
 *  vee's on the outside of each bank, its intakes in the vee between them. */
const exSide = (d: Dims, lean: number): number => (d.vee && lean > 0 ? 1 : -1);
/** Where a cylinder's plug or injector stands in its head (its bank's frame): in the middle of four valves; beside two in
 *  a row, on its exhaust side clear of their springs (a wedge chamber's, typical). */
/** The x of a cylinder's intake (or exhaust) valves along it: two each across four, one each in a row of two. */
const valveXs = (d: Dims, c: { x: number }, ex: boolean): number[] => (d.valves === 4 ? [c.x - 0.22 * d.B, c.x + 0.22 * d.B] : [c.x + (ex ? 0.22 : -0.22) * d.B]);
const plugAt = (d: Dims, c: { x: number; lean: number }): { x: number; z: number } => (d.valves === 4 ? { x: c.x, z: 0 } : { x: c.x - 0.05 * d.B, z: exSide(d, c.lean) * 0.28 * d.B });
/** A point in a bank's frame (its lean about x) in the engine's. */
const fromBank = (p: V3, lean: number): V3 => [p[0], p[1] * Math.cos(lean) - p[2] * Math.sin(lean), p[1] * Math.sin(lean) + p[2] * Math.cos(lean)];
/** A hole bored from a to b (in its host's frame, `at` its host's origin), r across. */
const boreAlong = (a: V3, b: V3, r: number, at: V3 = [0, 0, 0]): { r: number; depth: number; at: V3; dir: V3 } => {
  const d: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], L = Math.hypot(...d) || 1;
  return { r, depth: L, at: [a[0] - at[0], a[1] - at[1], a[2] - at[2]], dir: [d[0] / L, d[1] / L, d[2] / L] };
};
/** An ohv engine's valve train: its cam beside its crank in the block (where its timing gears put it: beside the crank
 *  inline, over it in a vee), a lifter on each lobe, a pushrod from each lifter up beside its bore to the outer end of
 *  its valve's rocker; each piece in its bank's frame. */
function ohvTrain(d: Dims, cyl: { x: number; lean: number }[]) {
  // (a vee's cam over its crank, high enough that its big ends sweep under its lobes: its gears' module from that distance)
  const { B } = d, sweep = d.r + d.rp + d.shellT + 0.11 * B + 0.12 * B + 0.16 * B + 0.006, m0 = Math.max(0.0015, Math.round(0.025 * B * 2000) / 2000), m = d.vee ? Math.max(m0, sweep / 36) : m0, dist = (m * (24 + 48)) / 2, a = d.vee ? PI / 2 : (40 * PI) / 180;
  const camY = dist * Math.sin(a), camZ = dist * Math.cos(a), ys = d.tip + 0.12 * B;
  const rods = cyl.flatMap((c, i) => {
    const yl = camY * Math.cos(c.lean) + camZ * Math.sin(c.lean), zl = -camY * Math.sin(c.lean) + camZ * Math.cos(c.lean), xs = exSide(d, c.lean);
    return [-1, 1].map((sg) => { const x = c.x + sg * 0.4 * B; return { bank: i, lean: c.lean, x, vx: c.x + sg * 0.22 * B, lifter: [x, yl + 0.31 * B, zl] as V3, lo: [x, yl + 0.46 * B, zl] as V3, hi: [x, ys - 0.08 * B, -xs * 0.3 * B] as V3 }; });
  });
  return { m, dist, a, camY, camZ, ys, rods, rodR: 0.03 * B, liftR: 0.09 * B };
}

// ---- the moving parts ---------------------------------------------------------------------------------------------------
/** A piston with its rings, pin and the pin's clips; its pin's middle at its origin, along x; its crown up +y. */
export function pistonAssembly(s: EngineSpec, d = engineDims(s)): Part {
  const { B, CH, skirt, pinD } = d, ro = B / 2 - 0.0002, wt = (d.diesel ? 0.075 : 0.06) * B, crown = (d.diesel ? 0.2 : 0.1) * B, ri = ro - wt, mat = d.diesel ? 'steel-alloy' : 'al-a380';
  // (each boss round its pin from the rod's side out to where it meets the skirt's inside: wholly within the piston)
  const bR = Math.min(pinD * 0.95, pinD / 2 + 0.1 * B), bx0 = d.rodW * 0.45, bx1 = Math.max(bx0 + 0.002, Math.sqrt(Math.max(0, (ri - 0.001) ** 2 - bR * bR)));
  const boss = (sd: number) => ringX('pin boss', pinD / 2, bR, bx1 - bx0, [sd * (bx0 + (bx1 - bx0) / 2), 0, 0], { mat, color: 0xb8bcc0, finish: 'cast', one: true });
  const piston = group('piston', [
    P('piston crown and skirt', { lathe: [[ri, -skirt], [ro, -skirt], [ro, CH], [0, CH], [0, CH - crown], [ri, CH - crown], [ri, -skirt]] }, [0, 0, 0], { mat, color: 0xb8bcc0, finish: 'cast', one: true, says: `${(B * 1000).toFixed(1)} mm across, ${((CH + skirt) * 1000).toFixed(0)} mm tall, its crown ${(crown * 1000).toFixed(0)} mm thick` }),
    boss(-1), boss(1)], { item: 'piston', mat, says: d.diesel ? 'a forged steel piston, its bowl in its crown (typical of a heavy diesel\'s)' : 'a cast aluminium piston' });
  const rings = [[0.06, 0.012, 'top ring'], [0.11, 0.013, 'second ring'], [0.16, 0.025, 'oil ring']].map(([y, h, nm]) => P(nm as string, { lathe: [[ro - 0.045 * B, -(h as number) * B / 2], [ro + 0.0001, -(h as number) * B / 2], [ro + 0.0001, (h as number) * B / 2], [ro - 0.045 * B, (h as number) * B / 2], [ro - 0.045 * B, -(h as number) * B / 2]] }, [0, CH - (y as number) * B, 0], { item: 'piston-ring', mat: 'cast-iron', color: 0x4a4c50, finish: 'machined' }));
  const pinL = 2 * ri - 0.002;
  const pin = turned({ name: 'wrist pin', steps: [[pinD / 2, pinL]], bore: pinD * 0.28, mat: 'steel-alloy', color: 0xc8ccd2, item: 'wrist-pin', at: [-pinL / 2, 0, 0], rot: ALONG_X, finish: 'ground' });
  const clips = [-1, 1].map((sd) => ({ ...ringClip({ name: 'wrist pin clip', ri: pinD / 2 - 0.0005, w: 0.0012 + 0.01 * B, t: 0.001 + 0.004 * B, item: 'wrist-pin-clip' }), at: [sd * (pinL / 2 + 0.001), 0, 0] as V3, rot: [0, PI / 2, 0] as V3 }));
  return group('piston and rings', [piston, ...rings, pin, ...clips], { item: 'piston-assembly' });
}
/** A connecting rod with its cap, its big end's shells and its two bolts; its big end's middle at its origin (its pin
 *  along x), its small end up +y at its length. */
export function conRod(s: EngineSpec, d = engineDims(s)): Part {
  const { B, L, pinD, rp, rodW, shellT } = d, bigI = rp + shellT, bigO = bigI + 0.11 * B, eyeO = pinD / 2 + 0.1 * B, beamW = 0.13 * B, iron = { mat: 'steel-alloy', color: 0x6a6c70, finish: 'forged', one: true };
  const rod = group('connecting rod', [
    ringX('small end', pinD / 2, eyeO, rodW * 0.8, [0, L, 0], iron),
    box('rod beam', [rodW * 0.7, L - eyeO - bigO + 0.004, beamW * 1.6], [0, (bigO + L - eyeO) / 2, 0], { ...iron, fill: 0.62, says: 'its I-section (about 0.6 of the box round it, typical)' }),
    halfRing('big end', bigI, bigO, rodW, [0, 0, 0], true, iron),
    ...[-1, 1].map((sd) => box('bolt boss', [rodW, 0.09 * B, 0.12 * B], [0, 0.045 * B, sd * (bigO + 0.03 * B)], iron))], { item: 'con-rod', says: `forged, ${(L * 1000).toFixed(0)} mm between its centres` });
  const cap = group('rod cap', [halfRing('rod cap', bigI, bigO, rodW, [0, 0, 0], false, iron), ...[-1, 1].map((sd) => box('cap boss', [rodW, 0.09 * B, 0.12 * B], [0, -0.045 * B, sd * (bigO + 0.03 * B)], iron))], { item: 'rod-cap' });
  const shell = (up: boolean) => halfRing(`rod bearing shell (${up ? 'upper' : 'lower'})`, rp, bigI, rodW * 0.86, [0, 0, 0], up, { item: 'rod-bearing-shell', mat: 'steel-low', color: 0xb89a6a, finish: 'machined', says: 'a steel back lined with bearing alloy' });
  const t = threadFor(B * 0.85), bL = 0.09 * B + 0.12 * B + 0.004;
  // (rod bolts are class 10.9 or 12.9, typical: they carry the cap against the piston's inertia every turn)
  const bolts = [-1, 1].map((sd) => bolt(t, bL, [0, -0.09 * B, sd * (bigO + 0.03 * B)], [PI, 0, 0], 'rod bolt', '10.9'));
  return group('connecting rod and cap', [rod, cap, shell(true), shell(false), ...bolts], { item: 'con-rod-assembly' });
}
/** Its crankshaft, forged in one: a main journal between each pair of cylinders and at each end, a pin for each throw
 *  at its angle with a web each side and a counterweight opposite, its nose at the front and its flange at the back. */
export function crankshaft(s: EngineSpec, d = engineDims(s)): Part {
  const { B, r, rp, rm, wm, rodW } = d, cyl = cylinders(s, d), forged = { mat: 'steel-alloy', color: 0x8a8c90, finish: 'forged', one: true }, parts: Part[] = [];
  const throws = d.twin ? [{ x: 0, phase: cyl[0]!.phase, w: 2 * rodW + 0.004 }] : d.banked ? cyl.filter((_, i) => i % 2 === 0).map((c) => ({ x: c.x + (rodW + 0.004) / 2, phase: c.phase, w: 2 * rodW + 0.004 })) : cyl.map((c) => ({ x: c.x, phase: c.phase, w: rodW + 0.003 }));
  const mains = mainsOf(d);
  for (const x of mains) parts.push(P('main journal', { cyl: [rm, wm] }, [x, 0, 0], { ...forged, rot: CYL_X, finish: 'ground' }));
  for (const t of throws) {
    const c = Math.cos(t.phase), sn = Math.sin(t.phase), webT = d.twin ? d.veeMain - wm / 2 - t.w / 2 - 0.001 : Math.max(0.08 * B, (d.pitch - wm - t.w) / 2 - 0.001);
    parts.push(P('crank pin', { cyl: [rp, t.w] }, [t.x, r * c, r * sn], { ...forged, rot: CYL_X, finish: 'ground' }));
    for (const sd of [-1, 1]) {
      const xw = t.x + sd * (t.w / 2 + webT / 2), span = r + rp + rm, mid = (r + rp - rm) / 2, cwH = d.cwH, cwAt = -(rm + cwH / 2 - 0.02 * B);
      parts.push(box('web', [webT, span, 2.1 * Math.max(rp, rm)], [xw, mid * c, mid * sn], { ...forged, rot: [t.phase, 0, 0] }));
      parts.push(box('counterweight', [webT, cwH, 2.6 * rm], [xw, cwAt * c, cwAt * sn], { ...forged, rot: [t.phase, 0, 0], fill: 0.8, says: 'its sector (about 0.8 of the box round it)' }));
    }
  }
  const front = Math.max(...mains) + wm / 2, back = Math.min(...mains) - wm / 2;
  parts.push(P('crank nose', { cyl: [0.2 * B, d.noseL] }, [front + d.noseL / 2, 0, 0], { ...forged, rot: CYL_X }));
  parts.push(P('crank flange', { cyl: [0.5 * B, 0.12 * B] }, [back - 0.06 * B, 0, 0], { ...forged, rot: CYL_X }));
  return group('crankshaft', parts, { item: 'crankshaft', mat: 'steel-alloy', says: `forged in one, ${throws.length} throw${throws.length > 1 ? 's' : ''} of ${(r * 1000).toFixed(1)} mm` });
}

// ---- the castings and what is fitted in them ----------------------------------------------------------------------------
/** Its block: the casting (its barrel round its bores and their water jacket, its crankcase's walls, its bulkheads with
 *  their main saddles), its liners, its main caps with their bolts, and its main bearing shells. */
export function cylinderBlock(s: EngineSpec, d = engineDims(s)): Part {
  const { B, n, deck, yb0, Wb, Wc, wc, we, len, ysk, rm, shellT, wm } = d, cyl = cylinders(s, d), iron = s.block === 'iron';
  // (a liquid-cooled casting held at its coolant's temperature by its jacket: about 105 °C at full load, typical (a
  // thermostat opens at 82 to 95 °C and the coolant runs a little over it); the heat check reads it as fixed there, so
  // what the exhaust gives the casting is carried away, as it is, not spread through it. An estimate: the metal by the
  // exhaust ports runs hotter)
  const cooled = d.jacket > 0 ? { hot: COOLANT } : {}, cast = { mat: iron ? 'cast-iron' : 'al-a380', color: iron ? 0x4a4c4e : 0x8c8e90, finish: 'cast', one: true, ...cooled }, parts: Part[] = [];
  const liner = iron && !d.diesel ? 0 : (d.diesel ? 0.05 : 0.025) * B, bore = B / 2 + liner, H = deck - yb0;
  // (an ohv block's bores for its cam, its lifters and its pushrods, in the frame of what they are bored in)
  const ohv = d.cams === 'ohv' ? ohvTrain(d, cyl) : null, rods = ohv?.rods ?? [];
  const rodBores = (at: V3, bank?: number) => rods.filter((q) => bank === undefined || q.bank === bank).map((q) => boreAlong(q.hi, q.lo, ohv!.rodR + 0.0015, at));
  const liftBores = (at: V3, lean = 0) => rods.filter((q) => Math.abs(q.lean - lean) < 1e-6).map((q) => boreAlong(fromBank([q.x, q.lifter[1] + 0.15 * B, q.lifter[2]], q.lean), fromBank([q.x, q.lifter[1] - 0.15 * B, q.lifter[2]], q.lean), ohv!.liftR + 0.001, at));
  const liftBoresAll = (at: V3) => [...new Set(rods.map((q) => q.lean))].flatMap((l) => liftBores(at, l));
  const camBore = (at: V3, depth: number) => (ohv ? [{ r: 0.11 * B + 0.001, depth, at: [depth / 2, ohv.camY - at[1], ohv.camZ - at[2]] as V3, dir: [-1, 0, 0] as V3 }] : []);
  if (!d.vee && !d.air) {
    // (its jacket: a ring of coolant round each bore through most of the barrel's height, cored out of the casting)
    const jv = n * PI * ((B / 2 + liner + d.wallB + d.jacket) ** 2 - (B / 2 + liner + d.wallB) ** 2) * H * 0.85, holes = n * PI * bore * bore * H, V = len * H * Wb;
    if (ohv) parts.push(box('barrel', [len, H, Wb], [0, (deck + yb0) / 2, 0], { ...cast, fill: 1 - jv / (V - holes), cuts: [...cyl.map((c) => ({ r: bore, depth: H, at: [c.x, H / 2, 0] as V3, dir: [0, -1, 0] as V3 })), ...rodBores([0, (deck + yb0) / 2, 0]), ...liftBores([0, (deck + yb0) / 2, 0])], says: 'its bores, and its water jacket cored round them (its share of the casting less)' }));
    else {
      // (a twin-cam block's barrel as it is cast: its outside following each bore's jacket round (siamesed between them),
      // a deck flange at its top the head sits on, a rib down each bulkhead in the valleys between the bores, and a boss
      // for its knock sensor; its bores through it)
      const fT = 0.008, Hp = H - fT, yp = yb0 + Hp / 2, ring = (cx: number, r: number, k = 48): [number, number][] => Array.from({ length: k }, (_, i) => [cx + r * Math.cos((2 * PI * i) / k), r * Math.sin((2 * PI * i) / k)] as [number, number]);
      const xs0 = Array.from({ length: 121 }, (_, i) => -len / 2 + (len * i) / 120), up = xs0.map((x) => [x, barrelHalfAt(d, cyl, x)] as [number, number]);
      const section = { pts: [...up, ...[...up].reverse().map(([x, z]) => [x, -z] as [number, number])], holes: cyl.map((c) => ring(c.x, bore).reverse()), L: Hp };
      const Vp = prismVolume(section);
      parts.push(P('barrel', { prism: section }, [0, yp, 0], { ...cast, rot: [-PI / 2, 0, 0], fill: 1 - (jv * Hp) / H / Vp, says: 'its bores, and its water jacket cored round them (its share of the casting less); its outside following the jacket round each bore' }));
      parts.push(box('deck flange', [len, fT, Wb], [0, deck - fT / 2, 0], { ...cast, cuts: cyl.map((c) => ({ r: bore, depth: fT, at: [c.x, fT / 2, 0] as V3, dir: [0, -1, 0] as V3 })), says: 'its deck, machined flat for the gasket' }));
      for (const x of Array.from({ length: n + 1 }, (_, k) => (k - n / 2) * d.pitch)) { const zi = barrelHalfAt(d, cyl, x), rl = Wb / 2 - zi + 0.001; if (rl < 0.004) continue;
        for (const sd of [-1, 1]) parts.push(box('barrel rib', [0.006, Hp, rl], [x, yp, sd * (Wb / 2 - rl / 2)], cast)); }
      const kx = n > 1 ? (cyl[(n >> 1) - 1]!.x + cyl[n >> 1]!.x) / 2 : 0, kz0 = barrelHalfAt(d, cyl, kx) - 0.001;
      parts.push(P('knock sensor boss', { cyl: [0.016, Wb / 2 - kz0] }, [kx, deck - 0.08, (Wb / 2 + kz0) / 2], { ...cast, rot: [PI / 2, 0, 0] }));
    }
  } else if (d.banked) {
    // (a banked vee's barrels: one casting along each bank round its bores and their water jacket, leaning with it, its
    // pushrods' and lifters' bores through it; the two meet the crankcase's top in the vee)
    for (const h of headsOf(d, cyl, len)) {
      const m = h.cyl.length, at: V3 = [h.x, (deck + yb0) / 2, 0], jv = m * PI * ((B / 2 + liner + d.wallB + d.jacket) ** 2 - (B / 2 + liner + d.wallB) ** 2) * H * 0.85, V = h.L * H * Wb, holes = m * PI * bore * bore * H;
      const mine = rods.filter((q) => h.idx.includes(q.bank));
      parts.push(box('barrel', [h.L, H, Wb], fromBank(at, h.lean), { ...cast, rot: [h.lean, 0, 0], fill: 1 - jv / (V - holes), says: 'a bank\'s bores, and its water jacket cored round them (its share of the casting less)',
        cuts: [...h.cyl.map((c) => ({ r: bore, depth: H, at: [c.x - h.x, H / 2, 0] as V3, dir: [0, -1, 0] as V3 })), ...mine.map((q) => boreAlong(q.hi, q.lo, ohv!.rodR + 0.0015, at)), ...mine.map((q) => boreAlong([q.x, q.lifter[1] + 0.15 * B, q.lifter[2]], [q.x, q.lifter[1] - 0.15 * B, q.lifter[2]], ohv!.liftR + 0.001, at))] }));
    }
  } else for (const c of cyl) {
    // (a barrel to each cylinder, finned where it is cooled by air (a fin about every 9 mm, typical), leaning with its bank)
    const ro = B / 2 + liner + d.wallB + d.outer, fins: [number, number][] = [[bore, 0], [ro, 0]];
    if (d.air) for (let y = 0.004; y < H - 0.004; y += 0.009) fins.push([ro, y], [ro + 0.28 * B, y + 0.001], [ro + 0.28 * B, y + 0.0035], [ro, y + 0.0045]);
    fins.push([ro, H], [bore, H], [bore, 0]);
    const bi = cyl.indexOf(c);
    parts.push(P('barrel', { lathe: fins }, [c.x, yb0 * Math.cos(c.lean), yb0 * Math.sin(c.lean)], { ...cast, rot: [c.lean, 0, 0], cuts: [...rodBores([c.x, yb0, 0], bi), ...rods.filter((q) => q.bank === bi).map((q) => boreAlong([q.x, q.lifter[1] + 0.15 * B, q.lifter[2]], [q.x, q.lifter[1] - 0.15 * B, q.lifter[2]], ohv!.liftR + 0.001, [c.x, yb0, 0]))], says: d.air ? 'its barrel, finned to shed its heat to the air' : 'its barrel' }));
  }
  // (its crankcase: two side walls, a floor plate at the barrel's foot, its ends, and a bulkhead at each main)
  const Hc = yb0 - ysk, mains = mainsOf(d);
  // (a vee's walls open where its banks' bores run out through them, for its rods)
  for (const sd of [-1, 1]) { const wAt: V3 = [0, (yb0 + ysk) / 2, sd * (Wc / 2 - wc / 2)]; parts.push(box('crankcase wall', [len, Hc, wc], wAt, { ...cast, cuts: d.vee ? cyl.map((c) => boreAlong(fromBank([c.x, deck, 0], c.lean), fromBank([c.x, 0, 0], c.lean), bore, wAt)) : [] })); }
  // (its top, its bores through it (a vee's along each bank), its lifters' bores)
  const topAt: V3 = [0, yb0 - wc / 2, 0], bankBore = (c: { x: number; lean: number }) => boreAlong(fromBank([c.x, (yb0 + 0.02) / Math.cos(c.lean), 0], c.lean), fromBank([c.x, (yb0 - wc - 0.02) / Math.cos(c.lean), 0], c.lean), bore, topAt);
  parts.push(box('crankcase top', [len, wc, Wc], topAt, { ...cast, cuts: [...(d.vee ? cyl.map(bankBore) : cyl.map((c) => ({ r: bore, depth: wc, at: [c.x, wc / 2, 0] as V3, dir: [0, -1, 0] as V3 }))), ...liftBoresAll(topAt)] }));
  // (its ends: over the end mains, their saddles bored in them, and down each side of the end main caps to the pan's rail)
  const capW0 = 2 * (rm + 0.22 * B), endSaddle = rm + shellT;
  for (const sd of [-1, 1]) {
    parts.push(box('crankcase end', [we, yb0, Wc - 2 * wc], [sd * (len / 2 - we / 2), yb0 / 2, 0], { ...cast, cuts: [{ r: endSaddle, depth: we, at: [we / 2, -yb0 / 2, 0], dir: [-1, 0, 0] }, ...camBore([0, yb0 / 2, 0], we)] }));
    for (const sz of [-1, 1]) { const z0 = capW0 / 2, z1 = Wc / 2 - wc; parts.push(box('crankcase end', [we, -ysk, z1 - z0], [sd * (len / 2 - we / 2), ysk / 2, sz * (z0 + z1) / 2], cast)); }
  }
  const bw = wm, bh = yb0 - wc, saddle = rm + shellT;
  for (const x of mains) parts.push(box('bulkhead', [bw, bh, Wc - 2 * wc], [x, bh / 2, 0], { ...cast, cuts: [{ r: saddle, depth: bw, at: [bw / 2, -bh / 2, 0], dir: [-1, 0, 0] }, ...(d.banked ? cyl.filter((c) => Math.abs(c.x - x) < bore + bw / 2).map((c) => boreAlong(fromBank([c.x, deck, 0], c.lean), fromBank([c.x, 0, 0], c.lean), bore, [x, bh / 2, 0])) : []), ...camBore([x, bh / 2, 0], bw).map((k) => ({ ...k, at: [bw / 2, k.at[1], k.at[2]] as V3 })), ...liftBoresAll([x, bh / 2, 0])], says: 'its main saddle bored in it' }));
  const casting = group('block casting', parts, { item: 'block-casting', mat: cast.mat, says: `cast ${iron ? 'iron' : 'aluminium'} round its cores, ${(len * 1000).toFixed(0)} × ${((deck - ysk) * 1000).toFixed(0)} × ${(Wc * 1000).toFixed(0)} mm` });
  const out: Part[] = [casting];
  if (liner) for (const c of cyl) out.push(P('cylinder liner', { lathe: [[B / 2, 0], [bore, 0], [bore, H], [B / 2, H], [B / 2, 0]] }, [c.x, yb0 * Math.cos(c.lean), yb0 * Math.sin(c.lean)], { rot: [c.lean, 0, 0], item: 'cylinder-liner', mat: 'cast-iron', color: 0x5a5c60, finish: 'machined', says: d.diesel ? 'a wet liner, its coolant against it' : 'cast in' }));
  // (its main caps: each under its bulkhead, its saddle's other half, bolted up into the bulkhead by two bolts)
  const capH = saddle + 0.12 * B, capW = 2 * (rm + 0.22 * B), t = threadFor(B);
  for (const x of mains) {
    out.push(box('main cap', [bw, capH, capW], [x, -capH / 2, 0], { item: 'main-cap', mat: 'cast-iron', color: 0x5a5c60, finish: 'cast', cuts: [{ r: saddle, depth: bw, at: [bw / 2, capH / 2, 0], dir: [-1, 0, 0] }] }));
    for (const sd of [-1, 1]) out.push(bolt(t, capH + 0.35 * B, [x, -capH, sd * (rm + 0.12 * B)], [PI, 0, 0], 'main cap bolt'));
    for (const up of [true, false]) out.push(halfRing(`main bearing shell (${up ? 'upper' : 'lower'})`, rm, saddle, wm * 0.9, [x, 0, 0], up, { item: 'main-bearing-shell', mat: 'steel-low', color: 0xb89a6a, finish: 'machined' }));
  }
  return group('engine block', out, { item: 'engine-block' });
}
/** How far out a twin-cam block's barrel is cast at x along it: round each bore's jacket (Wb / 2 from its centre),
 *  siamesed between bores, square past the end bores. */
export function barrelHalfAt(d: Dims, cyl: { x: number }[], x: number): number {
  const ro = d.Wb / 2, xs = cyl.map((c) => c.x); if (x <= Math.min(...xs) || x >= Math.max(...xs)) return ro;
  return Math.max(...xs.map((cx) => (Math.abs(x - cx) < ro ? Math.sqrt(ro * ro - (x - cx) ** 2) : 0)));
}
/** A spark plug as it is made: its steel shell (thread, hex, crimp), its alumina insulator, its centre electrode and
 *  terminal stud sealed in it with glass, its ground electrode welded to the shell, its sealing washer. Its tip at its
 *  origin, up +y; its thread's size by its bore (M12 under 85 mm, else M14, typical). */
export function sparkPlug(B: number): Part {
  const th = B < 0.085 ? 0.006 : 0.007, reach = B < 0.085 ? 0.0265 : 0.019, hexR = (B < 0.085 ? 0.014 : 0.016) / Math.sqrt(3) * 1.0;
  return group('spark plug', [
    P('plug shell', { lathe: [[th * 0.62, 0], [th, 0], [th, reach], [hexR * 1.15, reach], [hexR * 1.15, reach + 0.012], [th * 0.9, reach + 0.016], [th * 0.62, reach + 0.016], [th * 0.62, 0]] }, [0, 0, 0], { item: 'spark-plug-shell', mat: 'steel-low', color: 0xc8ccd2, finish: 'plate', facets: 6 }),
    P('plug insulator', { lathe: [[0.0012, -0.002], [th * 0.6, -0.002], [th * 0.6, reach + 0.016], [0.0045, reach + 0.02], [0.0045, reach + 0.045], [0.0012, reach + 0.045], [0.0012, -0.002]] }, [0, 0, 0], { item: 'spark-plug-insulator', mat: 'alumina', color: 0xf2f0ea, finish: 'gloss' }),
    P('centre electrode', { cyl: [0.0011, 0.022] }, [0, 0.008, 0], { item: 'centre-electrode', mat: 'nickel-alloy', color: 0x9a9ca0 }),
    box('ground electrode', [0.0026, 0.0045, 0.0013], [0, -0.0025, 0.0015], { item: 'ground-electrode', mat: 'nickel-alloy', color: 0x9a9ca0 }),
    P('glass seal', { cyl: [0.0011, 0.004] }, [0, reach + 0.0, 0], { item: 'glass', mat: 'glass', color: 0x6a8a9a }),
    P('terminal stud', { cyl: [0.002, 0.03] }, [0, reach + 0.033, 0], { item: 'terminal-stud', mat: 'steel-low', color: 0xc8ccd2, finish: 'plate' }),
    P('sealing washer', { lathe: [[th, reach - 0.0015], [th + 0.0035, reach - 0.0015], [th + 0.0035, reach], [th, reach], [th, reach - 0.0015]] }, [0, 0, 0], { item: 'sealing-washer', mat: 'steel-low', color: 0xc8ccd2 })], { item: 'spark-plug' });
}
// ---- the head's pieces, each made on its own: its seat (or its foot) at its origin, up its y --------------------------------
/** The pieces a head is built of that can be made apart and wired in (a node each): each made here to the engine's size,
 *  or anything else made the same way (a spring off the coil maker, a valve off the turned maker) put in its place. */
export const HEAD_PIECES = ['intake valve', 'exhaust valve', 'valve spring', 'valve spring retainer', 'bucket tappet', 'spark plug', 'ignition coil'] as const;
export type HeadPiece = (typeof HEAD_PIECES)[number];
export type HeadParts = Partial<Record<HeadPiece, Part>>;
const valveR = (d: Dims, ex: boolean): number => (d.valves === 4 ? (ex ? 0.155 : 0.18) : ex ? 0.19 : 0.22) * d.B;
const stemOf = (d: Dims): number => Math.max(0.0025, 0.035 * d.B);
/** Its intake valves as drawn: each one's head diameter, and how many a cylinder (what its breathing is worked from). */
export const intakeValves = (s: EngineSpec): { dia: number; count: number } => { const d = engineDims(s); return { dia: 2 * valveR(d, false), count: d.valves === 4 ? 2 : 1 }; };
// (the valve train's moving pieces, made as the head makes them: what its spring must hold on the cam)
const valvePart = (d: Dims, ex: boolean): Part => { const r = valveR(d, ex), head = 0.16 * r, vL = d.tip - (d.deck + d.gasket), stem = stemOf(d);
  return turned({ name: ex ? 'exhaust valve' : 'intake valve', steps: [[r, head], [r * 0.45, 0.6 * r], [stem, vL - head - 0.6 * r]], mat: ex ? 'stainless-304' : 'steel-alloy', color: ex ? 0xa8a6a0 : 0xc8ccd2, item: ex ? 'valve-exhaust' : 'valve-intake', finish: 'ground', says: `its head ${(2 * r * 1000).toFixed(1)} mm across, its stem ${(2 * stem * 1000).toFixed(1)} mm, ${(vL * 1000).toFixed(0)} mm long${ex ? ', stainless for the heat' : ''}` }); };
const retainerPart = (d: Dims, wire: number, D: number): Part => { const stem = stemOf(d), retT = 0.06 * d.B; return P('valve spring retainer', { lathe: [[stem + 0.001, 0], [D / 2 + wire / 2 + 0.0005, 0], [D / 2 + wire / 2 + 0.0005, retT * 0.4], [stem + 0.004, retT], [stem + 0.001, retT], [stem + 0.001, 0]] }, [0, 0, 0], { item: 'valve-retainer', mat: 'steel-alloy', color: 0x8a8c90, finish: 'machined' }); };
const tappetPart = (d: Dims): Part => { const B = d.B, h = 0.3 * B; return P('bucket tappet', { lathe: [[0.145 * B, 0], [0.16 * B, 0], [0.16 * B, h], [0, h], [0, h - 0.004], [0.145 * B, h - 0.004], [0.145 * B, 0]] }, [0, 0, 0], { item: 'bucket-tappet', mat: 'steel-alloy', color: 0x8a8c90, finish: 'ground' }); };
/** A liquid-cooled engine's coolant at full load, °C (typical: a thermostat opening at 82 to 95 °C, the coolant a little over it). */
export const COOLANT = 105;
const springDesigns = new Map<string, ReturnType<typeof designSpring>>();
/** A valve spring sized by what it carries: on 0.24 bore across and about half a bore fitted (typical proportions), the
 *  thinnest chrome-silicon wire (the valve spring wire: Shigley) and the least preload that hold its valve, retainer,
 *  keepers, tappet (or half its rocker) and a third of itself on the cam's nose at the engine's redline with 1.2 to
 *  spare, its wire's stress within its allowable and clear of coil bind at full lift. Three to six active coils (fewer
 *  let a thicker wire clear coil bind, and a spring's force at a given stress grows as its wire's cube: how springs for
 *  high speeds are wound); where none holds, the best is kept and says so (`ok` false, read by Engine under load). */
export const springOf = (d: Dims) => { const k = `${d.B}|${d.valves}|${d.cams}|${d.redline}|${d.tip}`; let v = springDesigns.get(k); if (!v) springDesigns.set(k, (v = designSpring(d))); return v; };
function designSpring(d: Dims) {
  const { B } = d, L = 0.46 * B, lift = 0.11 * B, wire = SPRING_WIRES['chrome-silicon-a401']!, stem = stemOf(d);
  let best: { d: number; D: number; L: number; L0: number; n: number; holds: number; ok: boolean } | null = null;
  // (its coil round its stem's seal with half a millimetre to spare, its retainer inside its bucket tappet (a twin-cam's)
  // with 0.3 mm to spare: the largest coil and the thinnest wire, then the least preload, that do)
  for (const n of [5, 4, 6, 3]) for (const Dr of [0.24, 0.23, 0.22, 0.21, 0.2]) { const D = Dr * B;
  for (let dw = 0.03 * B; dw <= 0.06 * B + 1e-12 && D / dw >= 4; dw += 0.001 * B) { if (D / 2 - dw / 2 < stem + 0.003 + 0.0005 || (d.cams === 'dohc' && D / 2 + dw / 2 + 0.0005 > 0.145 * B - 0.0003)) continue; for (const ratio of [0.82, 0.79, 0.76, 0.73, 0.7, 0.67, 0.64]) {
    const L0 = L / ratio, cs = { d: dw, D, Na: n, L0, wire }, k = springRate(cs), F = k * (L0 - L + lift);
    const mvt = massOf(valvePart(d, false)) + massOf(retainerPart(d, dw, D)) + 2 * 7850 * 0.0025 * 0.06 * B * 0.004 + (d.cams === 'dohc' ? massOf(tappetPart(d)) : 7850 * 0.7 * 0.15 * B * 0.1 * B * 0.35 * B / 2) + (wire.density * PI * D * (n + 2) * PI * dw * dw) / 4 / 3;
    const holds = (2 * Math.sqrt(F / (4.5 * lift * mvt)) * 60) / (2 * PI), fits = shearStress(cs, F) <= allowableShear(cs) && L - lift >= 1.1 * solidLength(cs);
    const v = { d: dw, D, L, L0, n, holds, ok: fits && holds >= 1.2 * d.redline };
    if (v.ok) return v; if (fits && (!best || holds > best.holds)) best = v;
  } } }
  return best ?? { d: 0.032 * B, D: 0.24 * B, L, L0: L / 0.8, n: 5, holds: 0, ok: false };
}
/** One of a head's pieces made to its engine's size, in its own frame. */
export function headPiece(s: EngineSpec, which: HeadPiece, d = engineDims(s)): Part {
  const { B } = d, sp = springOf(d), y0 = d.deck + d.gasket, top = y0 + d.Hh;
  if (which === 'intake valve' || which === 'exhaust valve') return valvePart(d, which === 'exhaust valve');
  if (which === 'valve spring') return coil({ name: 'valve spring', d: sp.d, D: sp.D, L: sp.L, n: sp.n, L0: sp.L0, item: 'valve-spring', says: `chrome-silicon wire ${(sp.d * 1000).toFixed(2)} mm on ${(sp.D * 1000).toFixed(1)} mm, ${sp.n} active coils, fitted at ${(sp.L * 1000).toFixed(1)} mm from ${(sp.L0 * 1000).toFixed(1)} mm free: sized to hold its valve on its cam to ${sp.ok ? `${Math.round(sp.holds)} rpm (its redline ${d.redline} rpm, with 1.2 to spare)` : `${Math.round(sp.holds)} rpm: no coil that fits holds it to ${d.redline} rpm with 1.2 to spare`}` });
  if (which === 'valve spring retainer') return retainerPart(d, sp.d, sp.D);
  if (which === 'bucket tappet') return tappetPart(d);
  if (which === 'spark plug') return sparkPlug(B);
  // (a coil on each plug: its housing up out of the cam cover, its windings and core, its boot down onto the plug)
  const hh = top - (y0 + 0.08) + 0.06;
  return group('ignition coil', [P('coil housing', { cyl: [0.12 * B, hh] }, [0, hh / 2, 0], { item: 'coil-housing', mat: 'pbt', color: 0x1a1a1a, finish: 'texture' }),
    // (its primary of about 0.6 mm wire round its core, its secondary of about 0.06 mm round that, typical of a coil on a
    // plug: a hundred-odd turns against some thousands)
    { ...wound({ name: 'primary winding', ri: 0.03 * B, ro: 0.05 * B, L: 0.3 * B, d: 0.0006 }), at: [0, 0.2 * B, 0] as V3 }, { ...wound({ name: 'secondary winding', ri: 0.055 * B, ro: 0.09 * B, L: 0.3 * B, d: 0.00006 }), at: [0, 0.2 * B, 0] as V3 },
    box('coil core', [0.04 * B, 0.36 * B, 0.04 * B], [0, 0.35 * B, 0], { item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60 }),
    P('coil boot', { lathe: [[0.004, 0], [0.009, 0], [0.009, 0.04], [0.004, 0.04], [0.004, 0]] }, [0, -0.04, 0], { item: 'coil-boot', mat: 'silicone', color: 0x2a2a2a })], { item: 'ignition-coil' });
}
/** Where a direct-injection pump's lobe goes on the exhaust cam: between the last valve's lobe and the last journal, its
 *  base circle a little over the cam's tube, its lift about 5 mm (typical of a single-plunger pump's stroke). */
function pumpLobeOf(s: EngineSpec, d: Dims): { x: number; r: number; w: number; lift: number } {
  const B = d.B, Lh = d.len - 0.4 * d.we, jEdge = -(Lh / 2 - 0.05 * B - 0.07 * B) + 0.06 * B, lEdge = Math.min(...cylinders(s, d).map((c) => c.x)) - 0.22 * B - 0.085 * B;
  return { x: (jEdge + lEdge) / 2, r: 0.155 * B, w: Math.min(0.1 * B, (lEdge - jEdge) * 0.6), lift: 0.005 };
}
/** A piece put where its head holds it: what was wired in, or its own made to size; at its place, kept turned as it came. */
const placed = (q: Part, at: V3): Part => ({ ...q, at });

/** Its cylinder head: the casting (its deck with its chambers, its sides with its ports, its ends, its cam saddles, its
 *  ports and plug towers cored through it), its valve train, its cams and their caps, its bolts; in its bank's frame,
 *  its deck's foot at the block's deck. */
export function cylinderHead(s: EngineSpec, d = engineDims(s), bank?: number, given: HeadParts = {}): Part {
  const piece = (w: HeadPiece): Part => given[w] ?? headPiece(s, w, d);
  const { B, deck, Wb, Hh, td, gasket, valves, cams, len, we } = d, cylAll = cylinders(s, d), hd = bank === undefined ? headsOf({ ...d, vee: false }, cylAll, len)[0]! : headsOf(d, cylAll, len)[bank]!, cyl = hd.cyl;
  const iron = d.diesel, cast = { mat: iron ? 'cast-iron' : 'al-a380', color: iron ? 0x50525a : 0x9a9c9e, finish: 'cast', one: true, ...(d.jacket > 0 ? { hot: COOLANT } : {}) }, parts: Part[] = [];
  const y0 = deck + gasket, Lh = hd.L, x0 = hd.x, Wh = Wb, tw = 0.05 * B; void we;
  const xs = exSide(d, cyl[0]!.lean), train = cams === 'ohv' ? ohvTrain(d, cylAll).rods.filter((q) => hd.idx.includes(q.bank)) : [];
  // (its valves: four to a cylinder, two intake and two exhaust across it, or two in a row; their heads' sizes a share of
  // the bore, typical of pent-roof and of wedge chambers; its exhausts on its xs side)
  const vs = cyl.flatMap((c) => valves === 4 ? [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, b]) => ({ x: c.x + a! * 0.22 * B, z: b! * 0.21 * B, ex: b === xs, r: (b === xs ? 0.155 : 0.18) * B, c })) : [{ x: c.x - 0.22 * B, z: cams === 'ohv' ? 0 : -xs * 0.18 * B, ex: false, r: 0.22 * B, c }, { x: c.x + 0.22 * B, z: cams === 'ohv' ? 0 : xs * 0.18 * B, ex: true, r: 0.19 * B, c }]);
  const portY = y0 + td + 0.17 * B, seat = y0 + td + d.seatH, floorT = seat - (portY + 0.15 * B), pr = (valves === 4 ? 0.15 : 0.13) * B;
  // (the pushrods' bores through its deck and its spring floor, beside its ports)
  const rodBores = (at: V3) => train.map((q) => boreAlong(q.hi, q.lo, 0.03 * B + 0.0015, at));
  // (its combustion chambers: each the volume its compression ratio leaves over the piston at the top of its stroke,
  // V_c = V_s / (CR − 1), so as deep over the bore as the stroke over CR − 1; cut as deep as the deck allows, 3 mm of metal
  // kept, where a real pent roof rises on into the head above it)
  const cr = s.cr ?? (d.diesel ? 17 : 10.5), hc = Math.min(s.stroke / (cr - 1), td - 0.003);
  parts.push(box('head deck', [Lh, td, Wh], [x0, y0 + td / 2, 0], { ...cast, cuts: [...(d.diesel ? [] : cyl.map((c) => ({ r: 0.48 * B, depth: hc, at: [c.x - x0, -td / 2, 0] as V3, dir: [0, 1, 0] as V3 }))), ...vs.map((v) => ({ r: v.r * 1.02, depth: td, at: [v.x - x0, td / 2, v.z] as V3, dir: [0, -1, 0] as V3 })), ...cyl.map((c) => ({ r: d.diesel ? 0.052 * B : 0.06 * B, depth: td, at: [plugAt(d, c).x - x0, td / 2, plugAt(d, c).z] as V3, dir: [0, -1, 0] as V3 })), ...rodBores([x0, y0 + td / 2, 0])], says: 'its combustion chambers and valve seats machined in it' }));
  const sideY = y0 + td + (Hh - td) / 2;
  for (const sd of [-1, 1]) parts.push(box('head side', [Lh, Hh - td, tw], [x0, sideY, sd * (Wh / 2 - tw / 2)], { ...cast, cuts: [...vs.filter((v) => (v.ex ? xs : -xs) === sd).map((v) => ({ r: pr + 0.01 * B, depth: tw, at: [v.x - x0, portY - sideY, sd * tw / 2] as V3, dir: [0, 0, -sd] as V3 })), ...rodBores([x0, sideY, sd * (Wh / 2 - tw / 2)])] }));
  // (its ends, its cams' bores through them)
  const camZs = cams === 'dohc' ? [-xs * 0.21 * B, xs * 0.21 * B] : cams === 'sohc' ? [0] : [], rockY = d.tip + 0.12 * B, rockZ = cams === 'ohv' ? -xs * 0.15 * B : 0;
  for (const sd of [-1, 1]) parts.push(box('head end', [tw, Hh - td, Wh - 2 * tw], [x0 + sd * (Lh / 2 - tw / 2), sideY, 0], { ...cast, cuts: [...camZs.map((z) => ({ r: 0.125 * B, depth: tw, at: [tw / 2, d.camY - sideY, z] as V3, dir: [-1, 0, 0] as V3 })), ...(cams !== 'dohc' ? [{ r: 0.09 * B + 0.0005, depth: tw, at: [tw / 2, rockY - sideY, rockZ] as V3, dir: [-1, 0, 0] as V3 }] : [])] }));
  // (a port from each valve's seat out through its side, cored in the casting: a bent tube of it)
  for (const v of vs) { const sd = v.ex ? xs : -xs; parts.push(P(v.ex ? 'exhaust port' : 'intake port', { tube: { r: pr, wall: 0.006, pts: [[v.x, y0 + td, v.z], [v.x, portY, sd * 0.3 * B], [v.x, portY, sd * (Wh / 2 - tw)]] } }, [0, 0, 0], cast)); }
  // (the floor its springs sit on, over its ports, its guides' bores and its towers through it)
  parts.push(box('spring floor', [Lh - 2 * tw, floorT, Wh - 2 * tw], [x0, seat - floorT / 2, 0], { ...cast, cuts: [...vs.map((v) => ({ r: Math.max(0.0025, 0.035 * B) + 0.003, depth: floorT, at: [v.x - x0, floorT / 2, v.z] as V3, dir: [0, -1, 0] as V3 })), ...cyl.map((c) => ({ r: d.diesel ? 0.09 * B : 0.09 * B, depth: floorT, at: [plugAt(d, c).x - x0, floorT / 2, plugAt(d, c).z] as V3, dir: [0, -1, 0] as V3 })), ...rodBores([x0, seat - floorT / 2, 0])] }));
  // (a tower down the middle of each cylinder for its plug or its injector)
  const tw0 = d.diesel ? 0.08 * B : 0.06 * B, tw1 = d.diesel ? 0.088 * B : 0.09 * B;
  for (const c of cyl) parts.push(P(d.diesel ? 'injector bore' : 'plug tower', { lathe: [[tw0, 0], [tw1, 0], [tw1, Hh - td], [tw0, Hh - td], [tw0, 0]] }, [plugAt(d, c).x, y0 + td, plugAt(d, c).z], cast));
  const casting = group('head casting', parts, { item: 'head-casting', mat: cast.mat, says: `cast ${iron ? 'iron' : 'aluminium'} round its port and jacket cores, ${(Hh * 1000).toFixed(0)} mm tall` });
  const out: Part[] = [casting];
  // (its valve train: each valve's stem through its guide, its spring on the head's floor round the guide, its retainer
  // and keepers on top; a spring of wire about 0.032 bore on 0.24 bore across, about half a bore long, typical; all of
  // it inside its bucket)
  const stem = stemOf(d), sp = springOf(d), retT = 0.06 * B, tip = d.tip, gL = seat + 0.012 - (seat - floorT);
  for (const v of vs) {
    out.push(placed(piece(v.ex ? 'exhaust valve' : 'intake valve'), [v.x, y0, v.z]));
    out.push(P('valve guide', { lathe: [[stem, 0], [stem + 0.003, 0], [stem + 0.003, gL], [stem, gL], [stem, 0]] }, [v.x, seat - floorT, v.z], { item: 'valve-guide', mat: 'bronze', color: 0xa07a50, finish: 'machined' }));
    out.push(P('valve stem seal', { lathe: [[stem, 0], [stem + 0.003, 0], [stem + 0.003, 0.008], [stem, 0.008], [stem, 0]] }, [v.x, seat + 0.01, v.z], { item: 'valve-stem-seal', mat: 'fkm', color: 0x5a3020, finish: 'matte' }));
    out.push(placed(piece('valve spring'), [v.x, seat, v.z]));
    out.push(placed(piece('valve spring retainer'), [v.x, seat + sp.L, v.z]));
    for (const sd of [-1, 1]) out.push(box('valve keeper', [0.0025, retT, 0.004], [v.x + sd * (stem + 0.0013), seat + sp.L + retT / 2, v.z], { item: 'valve-keeper', mat: 'steel-alloy', color: 0x6a6c70 }));
  }
  // (its cams over its valves: two on a head with four valves a cylinder (dohc, on bucket tappets), one in the middle
  // with rockers (sohc), or one down in the block with lifters, pushrods and rockers (ohv))
  const baseR = 0.17 * B, lift = 0.11 * B, camT = threadFor(B * 0.7);
  const camAt = (zc: number, yc: number, which: typeof vs, name: string, extra: Part[] = []): number[] => {
    const cp: Part[] = [P('cam tube', { cyl: [0.12 * B, Lh] }, [x0, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true })];
    which.forEach((v, i) => { const a = (zc < 0 ? -1 : 1) * ((i * 0.37) % (PI / 3)); cp.push(P('cam lobe', { cyl: [baseR, 0.17 * B] }, [v.x, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }), box('cam lobe nose', [0.17 * B, baseR + lift, 1.4 * baseR], [v.x, yc + ((baseR + lift) / 2) * Math.cos(a), zc + ((baseR + lift) / 2) * Math.sin(a)], { rot: [a, 0, 0], mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true, fill: 0.7 })); });
    const jIn = Lh / 2 - tw - 0.07 * B, journals = (cyl.length > 1 ? Array.from({ length: cyl.length + 1 }, (_, k) => x0 + (k - cyl.length / 2) * d.pitch) : [x0 - jIn, x0 + jIn]).map((x) => Math.max(x0 - jIn, Math.min(x0 + jIn, x)));
    for (const x of journals) cp.push(P('cam journal', { cyl: [0.14 * B, 0.12 * B] }, [x, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }));
    // (its nose out through the head's front to its sprocket in the timing drive)
    if (bank === undefined) { const x1 = x0 + Lh / 2, x2 = cams === 'dohc' && /exhaust/.test(name) ? x1 + 0.014 : len / 2 + 0.035 + 0.004; cp.push(P('cam nose', { cyl: [0.12 * B * 0.985, x2 - x1] }, [(x1 + x2) / 2, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true })); }
    cp.push(...extra);
    out.push(group(name, cp, { item: 'camshaft', mat: 'cast-iron', says: `${which.length} lobes, about ${(lift * 1000).toFixed(1)} mm of lift (typical)${extra.length ? `, and ${extra[0]!.name}` : ''}` }));
    return journals;
  };
  // (a cap over each pair of journals (or each one), its half-bores in it, bolted down clear of the journals)
  const caps = (journals: number[], yc: number, zs: number[]): void => {
    const w = zs.length > 1 ? 0.92 * B : 0.5 * B, bz = zs.length > 1 ? [0, -0.4 * B, 0.4 * B] : [-0.2 * B, 0.2 * B], rj = 0.14 * B, capV = 0.12 * B * 0.18 * B * w, half = (zs.length * PI * rj * rj * 0.12 * B) / 2;
    for (const x of journals) { out.push(box('cam cap', [0.12 * B, 0.18 * B, w], [x, yc + 0.09 * B, 0], { item: 'cam-cap', mat: cast.mat, color: cast.color, finish: 'cast', fill: (capV - half) / capV, cuts: zs.map((z) => ({ r: rj, depth: 0.12 * B, at: [0.06 * B, -0.09 * B, z] as V3, dir: [-1, 0, 0] as V3 })) })); for (const z of bz) out.push(bolt(camT, 0.3 * B, [x, yc + 0.18 * B, z], [0, 0, 0], 'cam cap bolt')); }
  };
  if (cams === 'dohc') {
    const tapH = 0.3 * B, yb = tip + 0.004, yc = d.camY;
    for (const v of vs) out.push(placed(piece('bucket tappet'), [v.x, yb - tapH, v.z]));
    // (a direct-injection engine's high-pressure pump rides its own lobe on the exhaust cam, behind the last valve's)
    const pumpLobe = bank === undefined && fitOf(s).injection === 'port+direct' ? (() => { const pl = pumpLobeOf(s, d); return [P('pump drive lobe', { cyl: [pl.r, pl.w] }, [pl.x, yc, xs * 0.21 * B], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }), box('pump drive lobe nose', [pl.w, pl.r + pl.lift, 1.2 * pl.r], [pl.x, yc + (pl.r + pl.lift) / 2, xs * 0.21 * B], { mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true, fill: 0.7 })]; })() : [];
    const jr = camAt(-xs * 0.21 * B, yc, vs.filter((v) => !v.ex), 'intake camshaft'); camAt(xs * 0.21 * B, yc, vs.filter((v) => v.ex), 'exhaust camshaft', pumpLobe);
    caps(jr, yc, camZs);
    // (the chain drives the intake cam; a pair of gears in front of the head drives the exhaust cam from it, as on
    // Toyota's narrow-angle twin-cam fours (the 3S-FE's): sprockets side by side would overlap at cams this close)
    if (bank === undefined) { const z = Math.max(16, Math.round((0.42 * B) / 0.0015)), mg = (0.42 * B) / z;
      for (const zc of camZs) out.push({ ...toothed({ name: 'cam drive gear', m: mg, z, b: 0.008, bore: 0.24 * B, mat: 'steel-alloy', item: 'spur-gear' }), at: [x0 + Lh / 2 + 0.008, yc, zc], rot: [0, PI / 2, 0], passes: ['cam drive gear', 'cam nose'] }); }
  } else {
    // (rockers on a shaft along the head over the valves, each pushing its valve's tip: from its pushrod's end on the
    // cam's side (ohv), or from under its cam over the shaft (sohc))
    const ys = tip + 0.12 * B, zs = cams === 'ohv' ? -xs * 0.15 * B : 0, rk = { item: 'rocker-arm', mat: 'steel-low', color: 0x6a6c70, finish: 'cast', fill: 0.7, passes: ['rocker shaft'] };
    out.push(turned({ name: 'rocker shaft', steps: [[0.09 * B, Lh - 0.2 * B]], bore: 0.05 * B, mat: 'steel-alloy', item: 'rocker-shaft', at: [x0 - (Lh - 0.2 * B) / 2, ys, zs], rot: ALONG_X, finish: 'ground' }));
    if (cams === 'ohv') for (const q of train) { const dx = q.x - q.vx, dz = q.hi[2], armL = Math.hypot(dx, dz) + 0.1 * B; out.push(box('rocker arm', [0.15 * B, 0.1 * B, armL], [(q.x + q.vx) / 2, ys - 0.03 * B, dz / 2], { ...rk, rot: [0, Math.atan2(dx, dz), 0] })); }
    else for (const v of vs) { const dz = v.z - zs, armL = Math.hypot(dz, 0.12 * B) + 0.1 * B; out.push(box('rocker arm', [0.15 * B, 0.1 * B, armL], [v.x, ys - 0.03 * B, zs + dz / 2], rk)); }
    if (cams === 'sohc') caps(camAt(0, d.camY, vs, 'camshaft'), d.camY, [0]);
  }
  // (its head bolts: down through its deck into the block, beside each main)
  const hb = threadFor(B), mains = cyl.length > 1 ? Array.from({ length: cyl.length + 1 }, (_, k) => x0 + (k - cyl.length / 2) * d.pitch) : [x0 - Lh / 2 + 0.08 * B, x0 + Lh / 2 - 0.08 * B];
  for (const x of mains) for (const sd of [-1, 1]) out.push(bolt(hb, td + 0.75 * B, [x, y0 + td, sd * (Wh / 2 - tw - 0.06 * B)], [0, 0, 0], 'head bolt'));
  // (its plugs down its towers, a coil on each; or its injectors)
  for (const c of cyl) {
    const pa = plugAt(d, c);
    if (!d.diesel) { out.push(placed(piece('spark plug'), [pa.x, y0 + Math.min(s.stroke / ((s.cr ?? 10.5) - 1), td - 0.003), pa.z])); out.push(placed(piece('ignition coil'), [pa.x, y0 + 0.08, pa.z]));
    } else out.push(group('fuel injector', [turned({ name: 'injector body', steps: [[0.05 * B, td + 0.02], [0.075 * B, 0.18]], cavity: [[0.012 * B + 0.0003, 0.01, 0.165], [0.07 * B + 0.0004, 0.1396, 0.1804]], mat: 'stainless-304', item: 'injector-body' }), turned({ name: 'injector needle', steps: [[0.012 * B, 0.15]], mat: 'steel-alloy', item: 'injector-needle', at: [0, 0.01, 0] }), { ...wound({ name: 'injector coil', ri: 0.02 * B, ro: 0.07 * B, L: 0.04, d: 0.0003 }), at: [0, 0.14, 0] as V3 }], { item: 'fuel-injector', at: [pa.x, y0, pa.z] }));
  }
  return group(bank === undefined ? 'cylinder head' : `cylinder head ${bank + 1}`, out, { item: 'cylinder-head' });
}

/** A starter's solenoid as it is made: its steel can, its coil wound inside it round the plunger it pulls in, the copper
 *  disc the plunger drives across its two contacts, and the two terminal studs out of its end (the battery's cable and
 *  the motor's); r its can's radius, L its length, along x. */
function starterSolenoid(r: number, L: number, at: V3): Part {
  const steel = { mat: 'steel-low', color: 0x8a8c90 };
  return group('starter solenoid', [
    P('solenoid can', { cyl: [r, L] }, [0, 0, 0], { ...steel, shell: 0.0015, finish: 'paint', item: 'solenoid-can', passes: ['solenoid coil', 'plunger', 'contact disc', 'terminal stud'] }),
    // (its pull-in and hold-in windings, about 0.8 mm wire, typical)
    { ...wound({ name: 'solenoid coil', ri: 0.36 * r, ro: 0.85 * r, L: 0.6 * L, d: 0.0008, centre: true }), at: [0, -0.05 * L, 0] as V3 },
    P('plunger', { cyl: [0.3 * r, 0.75 * L] }, [0, -0.1 * L, 0], { ...steel, finish: 'ground', item: 'plunger-core' }),
    P('contact disc', { cyl: [0.62 * r, 0.004] }, [0, 0.36 * L, 0], { mat: 'copper', color: 0xb87333, item: 'contact-disc' }),
    ...[-1, 1].map((sd) => P('terminal stud', { cyl: [0.004, 0.024] }, [sd * 0.4 * r, L / 2 + 0.012 - 0.008, 0], { mat: 'copper', color: 0xb87333, finish: 'thread', item: 'terminal-stud' })),
  ], { item: 'starter-solenoid', at, rot: CYL_X,
    // (where its cables are bolted: the battery's on one stud, the motor's strap on the other, each on the stud's end)
    ports: [frame('battery terminal', [-0.4 * r, L / 2 + 0.016, 0], [0, 1, 0], [1, 0, 0]), frame('motor terminal', [0.4 * r, L / 2 + 0.016, 0], [0, 1, 0], [1, 0, 0])] });
}
/** A rectifier diode as it is made (a 1N4007's DO-41 package): its silicon die between two leads, moulded in epoxy. */
export const rectifierDiode = (at: V3): Part => group('rectifier diode', [
  P('diode body', { cyl: [0.00135, 0.0052] }, [0, 0, 0], { rot: CYL_X, mat: 'epoxy', color: 0x1a1a1a }),
  box('diode die', [0.0005, 0.001, 0.001], [0, 0, 0], { item: 'si-die', mat: 'silicon', color: 0x3a3a4a }),
  ...[-1, 1].map((sd) => P('diode lead', { cyl: [0.0004, 0.01] }, [sd * 0.0076, 0, 0], { rot: CYL_X, item: 'lead-wire', mat: 'copper', color: 0xc8ccd2 }))], { item: 'diode-1n4007', at });
/** A silencer as it is made (its recipe's: shell, two baffles, three perforated tubes, packing): along x, L long, R round;
 *  its packing in the chamber between its baffles. */
const muffler = (R: number, L: number, at: V3, rot: V3, hot: number, says: string): Part => group('muffler', [
  P('muffler shell', { cyl: [R, L] }, [0, 0, 0], { rot: CYL_X, shell: 0.0012, passes: ['exhaust runner'], item: 'silencer-shell', mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' }),
  ...[-1, 1].map((sd) => P('muffler baffle', { cyl: [R - 0.0013, 0.0015] }, [sd * L / 4, 0, 0], { rot: CYL_X, passes: ['perforated tube'], item: 'silencer-baffle', mat: 'steel-low', color: 0x5a5c60 })),
  ...[0, 1, 2].map((k) => P('perforated tube', { cyl: [0.12 * R, 0.6 * L] }, [0, 0.35 * R * Math.cos((2 * PI * k) / 3), 0.35 * R * Math.sin((2 * PI * k) / 3)], { rot: CYL_X, shell: 0.0008, fill: 0.8, item: 'perforated-tube', mat: 'steel-low', color: 0x8a8c90, says: 'its wall perforated (about 0.2 of it holes, typical)' })),
  P('muffler packing', { lathe: [[0.75 * R, 0], [R - 0.0013, 0], [R - 0.0013, L / 2 - 0.0016], [0.75 * R, L / 2 - 0.0016], [0.75 * R, 0]] }, [-L / 4 + 0.0008, 0, 0], { rot: [0, 0, -PI / 2], item: 'silencer-packing', mat: 'glass-wool', color: 0xd8d0b0, fill: 0.05, says: 'E-glass wool packed about 125 kg/m³, good to about 540 °C (typical)' })], { item: 'muffler', at, rot, hot, says });
/** A small engine's float carburettor: its cast body round its venturi, its throttle plate, its float bowl and float on
 *  its needle, its main jet; its throat along +z from `at`. */
export const carburettor = (B: number, at: V3, rot: V3 = [0, 0, 0]): Part => group('carburettor', [
  P('carburettor body', { lathe: [[0.14 * B, 0], [0.24 * B, 0], [0.24 * B, 0.6 * B], [0.14 * B, 0.6 * B], [0.14 * B, 0]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], passes: ['main jet'], item: 'carb-body', mat: 'zamak', color: 0xb0b2b0, finish: 'cast' }),
  P('throttle plate', { cyl: [0.135 * B, 0.001] }, [0, 0, 0.45 * B], { rot: [PI / 2 + 0.3, 0, 0], item: 'throttle-plate', mat: 'brass', color: 0xc8a050 }),
  P('float bowl', { cyl: [0.22 * B, 0.3 * B] }, [0, -0.4 * B, 0.3 * B], { shell: 0.0012, passes: ['main jet'], item: 'float-bowl', mat: 'zamak', color: 0xb0b2b0, finish: 'cast' }),
  P('float', { cyl: [0.16 * B, 0.12 * B] }, [0, -0.43 * B, 0.3 * B], { item: 'carb-float', mat: 'nylon', color: 0x2a2a2a, fill: 0.3, says: 'hollow' }),
  P('main jet', { cyl: [0.02 * B, 0.12 * B] }, [0, -0.25 * B, 0.3 * B], { item: 'main-jet', mat: 'brass', color: 0xc8a050 })], { item: 'carburettor', at, rot });

// ---- the engine --------------------------------------------------------------------------------------------------------
export interface EngineBuilt { engine: Part; kg: number; size: V3; mid: V3; pieces: number; parts: Record<string, Part> }
const built = new Map<string, EngineBuilt>();
/** The whole engine, every piece of it, in its own frame (above); its mass and its size what its parts come to. Made once
 *  for each spec, and shared. */
/** The engine's main parts that can be made apart and wired in (a node each): each made here to its size, or one made
 *  otherwise put in its place (the same piston in every bore, the same rod on every pin). */
export interface EngineParts { piston?: Part; rod?: Part; crank?: Part; block?: Part; head?: Part }
/** …at a crank angle (radians, from where it is drawn): its crank turned that far, each piston and rod where its pin then
 *  puts them (its cams and valves held where they are drawn: their lift is not moved). */
export function engineBuilt(s: EngineSpec, given: EngineParts = {}, pose: { crank?: number } = {}): EngineBuilt {
  const th = pose.crank ?? 0, mine = !Object.values(given).some(Boolean), key = JSON.stringify(s) + (th ? `@${th}` : ''), was = mine ? built.get(key) : undefined; if (was) return was;
  const d = engineDims(s), { B, r, deck, Wb, Wc, len, ysk, Hh, gasket, td, swing } = d, cyl = cylinders(s, d), out: Part[] = [], fit = fitOf(s);
  const block = given.block ?? cylinderBlock(s, d), crank = given.crank ?? crankshaft(s, d), piston = given.piston ?? pistonAssembly(s, d), rod = given.rod ?? conRod(s, d);
  if (given.head && d.vee) throw new Error('a vee\'s heads are made one to each bank, each turned to it: wire its pieces into the head, not a head into the engine');
  out.push(block, th ? { ...crank, rot: [th, 0, 0] } : crank);
  // (each piston and rod where its crank's pin puts them, in its bank)
  const moving: Part[] = [];
  cyl.forEach((c, i) => {
    const a = c.phase + th - c.lean, yp = r * Math.cos(a), zp = r * Math.sin(a), yw = yp + Math.sqrt(d.L * d.L - zp * zp), g = Math.atan2(-zp, yw - yp);
    const off: V3 = [c.x, 0, 0];
    moving.push(group(`cylinder ${i + 1}`, [{ ...piston, at: [0, yw, 0], name: `piston ${i + 1}` }, { ...rod, at: [0, yp, zp], rot: [g, 0, 0], name: `connecting rod ${i + 1}` }], { at: off, rot: [c.lean, 0, 0] }));
  });
  out.push(group('pistons and rods', moving));
  // (its head: one along an inline engine, one on each cylinder of a vee, leaning with it; its gasket under it)
  const hs = headsOf(d, cyl, len), heads = d.vee ? hs.map((h, i) => ({ ...cylinderHead(s, d, i), rot: [h.lean, 0, 0] as V3 })) : [given.head ? { ...given.head, at: [0, 0, 0] as V3 } : cylinderHead(s, d)];
  out.push(...heads);
  for (const c of hs) out.push(box('head gasket', [d.vee ? c.L : len, gasket, Wb], [d.vee ? c.x : 0, (deck + gasket / 2) * Math.cos(c.lean), (deck + gasket / 2) * Math.sin(c.lean)], { rot: [c.lean, 0, 0], item: 'head-gasket', mat: 'stainless-304', color: 0x9a9c9e, cuts: [...(d.vee ? c.cyl.map((q) => ({ x: q.x - c.x })) : cyl).map((q) => ({ r: B / 2, depth: gasket, at: [q.x, gasket / 2, 0] as V3, dir: [0, -1, 0] as V3 })), ...(d.cams === 'ohv' ? ohvTrain(d, cyl).rods.filter((q) => Math.abs(q.lean - c.lean) < 1e-6).map((q) => boreAlong(q.hi, q.lo, 0.03 * B + 0.0015, [d.vee ? c.x : 0, deck + gasket / 2, 0])) : [])] }));
  // (its cam cover over each head, its gasket in its groove, its bolts round it)
  const top = deck + gasket + Hh, ctop = d.cams === 'dohc' ? top + 0.45 * B : top + 0.35 * B, coverMat = d.diesel ? 'al-a380' : d.cams === 'ohv' ? 'steel-low' : 'nylon';
  for (const c of hs) {
    const Lc = c.L, h = ctop - top, yc = top + h / 2, at: V3 = [c.x, yc * Math.cos(c.lean), yc * Math.sin(c.lean)];
    // (a well through it down each plug tower, for its coil; or for each injector)
    const wells = (d.vee ? cyl.filter((q) => q.lean === c.lean) : cyl).map((q) => { const pa = plugAt(d, q); return { r: (d.diesel ? 0.11 : 0.13) * B, depth: h, at: [pa.x - c.x, h / 2, pa.z] as V3, dir: [0, -1, 0] as V3 }; });
    // (and the high-pressure pump's plunger down through it to its lobe)
    if (!d.vee && fit.injection === 'port+direct') wells.push({ r: 0.0055, depth: h, at: [pumpLobeOf(s, d).x - c.x, h / 2, exSide(d, 0) * 0.21 * B] as V3, dir: [0, -1, 0] as V3 });
    const ct = d.diesel ? 0.005 : coverMat === 'steel-low' ? 0.0009 : 0.0035, cc = { mat: coverMat, color: d.diesel ? 0x2a2a2a : 0x1a1a1a, finish: coverMat === 'steel-low' ? 'paint' : 'texture', one: true };
    out.push(group('cam cover', [box('cam cover top', [Lc, ct, Wb], [0, h / 2 - ct / 2, 0], { ...cc, cuts: wells.map((w) => ({ ...w, depth: ct, at: [w.at[0], ct / 2, w.at[2]] as V3 })) }), ...[-1, 1].map((sd) => box('cam cover side', [Lc, h - ct - 0.003, ct], [0, -ct / 2 + 0.0015, sd * (Wb / 2 - ct / 2)], cc)), ...[-1, 1].map((sd) => box('cam cover end', [ct, h - ct - 0.003, Wb - 2 * ct], [sd * (Lc / 2 - ct / 2), -ct / 2 + 0.0015, 0], cc))], { at, rot: [c.lean, 0, 0], item: 'cam-cover', mat: coverMat, says: d.diesel ? 'cast aluminium, open to the head under it' : coverMat === 'steel-low' ? 'pressed from 0.9 mm steel (typical of a pushrod engine\'s rocker cover)' : 'glass-filled nylon, moulded open underneath' }));
    const cg = { mat: 'silicone', color: 0x8a2a1a };
    out.push(group('cam cover gasket', [box('gasket', [Lc, 0.003, 0.006], [0, 0, Wb / 2 - 0.004], cg), box('gasket', [Lc, 0.003, 0.006], [0, 0, -Wb / 2 + 0.004], cg), box('gasket', [0.006, 0.003, Wb], [Lc / 2 - 0.004, 0, 0], cg), box('gasket', [0.006, 0.003, Wb], [-Lc / 2 + 0.004, 0, 0], cg)], { says: 'moulded silicone (typical of a rocker cover\'s, for the heat off the exhaust)', item: 'cam-cover-gasket', at: [c.x, (top + 0.0015) * Math.cos(c.lean), (top + 0.0015) * Math.sin(c.lean)], rot: [c.lean, 0, 0] }));
    const nb = Math.max(4, Math.round(Lc / 0.1) * 2);
    for (let k = 0; k < nb; k++) { const x = c.x - Lc / 2 + 0.02 + ((k >> 1) * (Lc - 0.04)) / Math.max(1, nb / 2 - 1), z = (k % 2 ? 1 : -1) * (Wb / 2 - 0.01); out.push(bolt('M6', 0.025, [x, ctop * Math.cos(c.lean) - z * Math.sin(c.lean), ctop * Math.sin(c.lean) + z * Math.cos(c.lean)], [c.lean, 0, 0], 'cam cover bolt')); }
  }
  const front = len / 2, back = -len / 2;
  // (its timing drive, at its front: in its own plane (u = -z, v = y), turned into place)
  const td2: Part[] = [], tp = (u: number, v: number): V3 => [u, v, 0];
  // (how far up and out its wheels and chain reach in their plane (u = -z, v = y): its case is made round them)
  let tdTop = 0, tdSide = 0;
  if (d.cams === 'ohv' || d.vee) {
    // (a gear on the crank turning one twice its size on the cam beside it, a module about 0.025 of its bore, typical)
    const ot = ohvTrain(d, cyl), m = ot.m, dist = ot.dist, a = ot.a;
    td2.push({ ...toothed({ name: 'crank gear', m, z: 24, b: 0.15 * B, bore: 0.4 * B, mat: 'steel-alloy', item: 'timing-gear' }), at: tp(0, 0) });
    tdTop = Math.max(13 * m, dist * Math.sin(a) + 25 * m); tdSide = Math.max(13 * m, dist * Math.cos(a) + 25 * m);
    td2.push({ ...toothed({ name: 'cam gear', m, z: 48, b: 0.15 * B, bore: 0.3 * B, mat: 'steel-alloy', item: 'timing-gear' }), at: tp(-dist * Math.cos(a), dist * Math.sin(a)) });
    if (d.cams === 'ohv') {
      // (its cam in the block, beside its crank where the gears put it; a lifter, a pushrod up to each rocker)
      // (its cam beside the crank, its nose out to its gear; a lobe under each lifter; a pushrod from each lifter up to
      // its rocker, each in its bank)
      const zc = ot.camZ, yc = ot.camY, x2 = len / 2 + 0.035 + 0.004, lobes: Part[] = [P('cam tube', { cyl: [0.11 * B, len - 2 * d.we] }, [0, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }), P('cam nose', { cyl: [0.11 * B, x2 - (len / 2 - d.we)] }, [(x2 + len / 2 - d.we) / 2, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true })];
      for (const q of ot.rods) lobes.push(P('cam lobe', { cyl: [0.16 * B, 0.12 * B] }, [q.x, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }));
      out.push(group('camshaft', lobes, { item: 'camshaft', mat: 'cast-iron', says: 'in the block, turned by the crank\'s gear' }));
      for (const q of ot.rods) { out.push(P('lifter', { cyl: [ot.liftR, 0.3 * B] }, fromBank(q.lifter, q.lean), { rot: [q.lean, 0, 0], item: 'lifter', mat: 'steel-alloy', color: 0x8a8c90, finish: 'ground' })); out.push(P('pushrod', { tube: { r: ot.rodR, wall: 0.0012, pts: [fromBank(q.lo, q.lean), fromBank(q.hi, q.lean)] } }, [0, 0, 0], { item: 'pushrod', mat: 'steel-low', color: 0x6a6c70 })); }
    }
  } else {
    // (a sprocket on the crank, one twice its teeth on each cam, a roller chain round them, its guide and tensioner)
    const series = B < 0.07 ? '25' : B < 0.11 ? '06B' : '10B', C = CHAINS[series]!, p = C.p / 1000, m = p / PI, ycam = d.camY;
    const wheels: [number, number, number][] = [[0, 0, (m * 21) / 2]];
    td2.push({ ...toothed({ name: 'crank sprocket', m, z: 21, b: C.width / 1000, bore: 0.4 * B, mat: 'steel-alloy', item: 'timing-sprocket' }), at: tp(0, 0), passes: ['timing chain', 'crank nose'] });
    for (const z of d.cams === 'dohc' ? [0.21 * B] : [0]) { wheels.push([-z, ycam, (m * 42) / 2]); td2.push({ ...toothed({ name: 'cam sprocket', m, z: 42, b: C.width / 1000, bore: 0.24 * B, mat: 'steel-alloy', item: 'timing-sprocket' }), at: tp(-z, ycam), passes: ['timing chain', 'cam nose'] }); }
    tdTop = Math.max(...wheels.map(([, v, rr]) => v + rr)) + C.roller / 1000 + 0.004; tdSide = Math.max(...wheels.map(([u, , rr]) => Math.abs(u) + rr)) + C.roller / 1000 + 0.06;
    const path = around(wheels.map(([u, v, rr]) => [u, v, rr + (C.roller / 2000)] as [number, number, number])).map(([u, v]) => [u, v, 0] as V3);
    td2.push({ ...partOf(chainRun({ name: 'timing chain', p, roller: C.roller / 1000, width: C.width / 1000, path, closed: true })), sealed: 'a roller chain as it is made, its links riveted', clear: 0.002, runsOn: ['sprocket', 'guide', 'tensioner'] });
    const right = Math.max(...wheels.map((w) => w[0] + w[2])) + C.roller / 1000 + 0.012, left = Math.min(...wheels.map((w) => w[0] - w[2])) - C.roller / 1000 - 0.012;
    td2.push(box('chain guide', [0.012, ycam * 0.7, 0.02], [right, ycam / 2, 0], { item: 'chain-guide', mat: 'nylon', color: 0x2a2a2a }));
    td2.push(group('chain tensioner', [box('tensioner body', [0.03, 0.04, 0.03], [left - 0.02, ycam * 0.45, 0], { mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('tensioner plunger', { cyl: [0.006, 0.03] }, [left - 0.005, ycam * 0.45, 0], { rot: [0, 0, PI / 2], mat: 'steel-alloy', color: 0xc8ccd2 })], { item: 'chain-tensioner' }));
  }
  const tdx = front + 0.035, bx = tdx + 0.07, wpAt: [number, number] = [0, Math.min(0.11, 0.85 * B) + 0.075];
  out.push(group('timing drive', td2, { item: d.cams === 'ohv' || d.vee ? 'timing-gears' : 'timing-drive', at: [tdx, 0, 0], rot: [0, PI / 2, 0] }));
  // (its timing cover over it, the crank's seal in it; its damper and pulley on the crank's nose in front)
  const small0 = d.n <= 2 && !d.diesel, coverH = Math.max(d.cams === 'ohv' || d.vee ? 0.9 * B : deck + gasket + Hh, tdTop + 0.008, d.air || small0 ? 0 : wpAt[1] + 0.068) - ysk;
  const tc = { mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', one: true }, rimL = tdx + 0.032 - front, fLo = d.cams === 'ohv' ? Math.max(0.7 * B, ohvTrain(d, cyl).camY + 0.11 * B + 0.004) : 0.7 * B, tcW = Math.max(Wc * 0.9, 2 * (tdSide + 0.008));
  // (a case round its timing drive: its face, the crank's seal and the pump through it, and its rim back to the block)
  out.push(group('timing cover', [box('timing cover face', [0.006, coverH, tcW], [tdx + 0.035, ysk + coverH / 2, 0], { ...tc, cuts: [{ r: 0.3 * B, depth: 0.006, at: [0.003, -(ysk + coverH / 2), 0], dir: [-1, 0, 0] }, ...(d.air || small0 ? [] : [{ r: 0.061, depth: 0.006, at: [0.003, wpAt[1] - (ysk + coverH / 2), -wpAt[0]] as V3, dir: [-1, 0, 0] as V3 }])] }), ...[-1, 1].map((sz) => box('timing cover rim', [rimL, coverH, 0.004], [front + rimL / 2, ysk + coverH / 2, sz * (tcW / 2 - 0.002)], tc)), box('timing cover rim', [rimL, 0.004, tcW - 0.008], [front + rimL / 2, ysk + coverH - 0.002, 0], tc), ...(ysk + coverH > fLo ? [-1, 1].map((sz) => box('timing cover flange', [0.004, ysk + coverH - fLo, tcW / 2 - Wb / 2 - 0.004], [front + 0.002, (ysk + coverH + fLo) / 2, sz * (tcW / 2 + Wb / 2 - 0.004) / 2], tc)) : [])], { item: 'timing-cover', mat: 'al-a380' }));
  out.push({ ...ringX('crank seal', 0.2 * B, 0.3 * B, 0.01, [tdx + 0.035, 0, 0], { item: 'shaft-seal', mat: 'nbr', color: 0x1a1a1a }) });
  const dr = Math.min(0.11, 0.85 * B), dx = bx;
  if (!(d.n <= 2 && !d.diesel)) {
    out.push(group('crank pulley and damper', [ringX('damper hub', 0.2 * B, dr * 0.75, 0.035, [0, 0, 0], { item: 'damper-hub', mat: 'cast-iron', color: 0x3a3c40, finish: 'cast', fill: 0.6 }), ringX('damper rubber', dr * 0.75, dr * 0.8, 0.025, [0, 0, 0], { item: 'damper-rubber', mat: 'epdm', color: 0x1a1a1a }), ringX('damper inertia ring', dr * 0.8, dr, 0.03, [0, 0, 0], { item: 'damper-ring', mat: 'cast-iron', color: 0x3a3c40, finish: 'machined' })], { item: 'torsional-damper', at: [dx, 0, 0] }));
    out.push(bolt(threadFor(B * 1.3), 0.06, [dx + 0.02, 0, 0], [0, 0, -PI / 2], 'crank pulley bolt'));
  }
  // (its flywheel on the crank's flange at the back: about 3.5 bores across (typical), its ring gear shrunk on; its bolts)
  const plate = fit.drive === 'drive-plate', small = d.n <= 2 && !d.diesel, fwR = (small ? 1.15 : 1.75) * B, fwT = plate ? 0.004 : (d.diesel ? 0.35 : small ? 0.22 : 0.3) * B, fx = back - 0.12 * B - fwT / 2 - 0.004, electric = s.starter !== 'recoil', rgM = d.diesel ? 0.0042 : 0.0025;
  const fw: Part[] = [plate ? ringX('drive plate', 0.12 * B, fwR, fwT, [0, 0, 0], { item: 'drive-plate', mat: 'steel-low', color: 0x6a6c70, finish: 'machined', fill: 0.85, says: 'pressed from 4 mm steel (typical), its torque converter bolted to its rim: an automatic\'s or a CVT\'s, with no clutch' }) : ringX('flywheel', 0.12 * B, fwR, fwT, [0, 0, 0], { item: 'flywheel-disc', mat: 'cast-iron', color: 0x5a5c60, finish: 'machined', fill: 0.85, says: 'its face ground (its pockets and lightening about 0.15 of it, typical)' })];
  if (electric) fw.push({ ...toothed({ name: 'starter ring gear', m: rgM, z: Math.round((2 * (fwR + 0.006)) / rgM), b: 0.012 + 0.04 * B, bore: 2 * fwR, mat: 'steel-alloy', item: 'starter-ring-gear' }), at: [0, 0, 0], rot: [0, PI / 2, 0] });
  out.push(electric ? group(plate ? 'drive plate and ring gear' : 'flywheel and ring gear', fw, { item: plate ? 'flywheel-drive-plate' : 'flywheel', at: [fx, 0, 0] }) : { ...fw[0]!, name: 'flywheel', at: [fx, 0, 0], says: 'its fan cast in its face, its magneto\'s magnets in its rim (not drawn)' });
  for (let k = 0; k < 6; k++) { const a = (k * PI) / 3; out.push(bolt(threadFor(B), fwT + 0.12 * B, [fx - fwT / 2, 0.3 * B * Math.cos(a), 0.3 * B * Math.sin(a)], [0, 0, PI / 2], plate ? 'drive plate bolt' : 'flywheel bolt')); }
  // (its oiling: the pan under its crankcase, its gasket and bolts; the pump on the crank's nose; its pickup to the sump;
  // its filter on the block's side; the pan's drain plug)
  const panTop = ysk, panBot = -(swing + 0.02 + (d.diesel ? 0.6 : 0.45) * B), panH = panTop - panBot, panFront = tdx + 0.029, panBack = -len / 2 - 0.002, panL = panFront - panBack, panW = Wc * 0.96, panX = (panFront + panBack) / 2;
  // (its back wall under the rear main cap and the crank's flange, which hang below its rail there)
  const panT = d.diesel ? 0.005 : 0.0012, endTop = Math.min(panTop - 0.0035, -(d.rm + d.shellT + 0.12 * B) - 0.002, -0.5 * B - 0.002);
  out.push(box('oil pan end', [panT, endTop - (panBot - 0.0035 + panT), panW - 2 * panT], [panBack + panT / 2, (endTop + panBot - 0.0035 + panT) / 2, 0], { item: 'oil-pan', mat: d.diesel ? 'al-a380' : 'steel-low', color: d.diesel ? 0x8c8e90 : 0x2a2a2a, finish: d.diesel ? 'cast' : 'paint' }));
  out.push({ ...housing({ name: 'oil pan', L: panL, H: panH, W: panW, wall: panT, open: ['top', 'back'], item: 'oil-pan', mat: d.diesel ? 'al-a380' : 'steel-low', color: d.diesel ? 0x8c8e90 : 0x2a2a2a, finish: d.diesel ? 'cast' : 'paint', says: d.diesel ? 'cast aluminium, open on top to the crankcase' : 'pressed from 1.2 mm steel (typical), open on top to the crankcase' }), at: [panX, (panTop + panBot) / 2 - 0.0035, 0] });
  out.push(group('oil pan gasket', [box('gasket', [panL, 0.003, 0.01], [0, 0, panW / 2 - 0.006], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [panL, 0.003, 0.01], [0, 0, -panW / 2 + 0.006], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [0.01, 0.003, panW], [panL / 2 - 0.006, 0, 0], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [0.01, 0.003, panW], [-panL / 2 + 0.006, 0, 0], { mat: 'nbr', color: 0x1a1a1a })], { item: 'pan-gasket', at: [panX, panTop - 0.0015, 0] }));
  const npb = Math.max(8, Math.round((2 * (panL + panW)) / 0.09));
  for (let k = 0; k < npb; k++) { const f = k / npb, per = 2 * (panL + panW), sAt = f * per; let x: number, z: number; if (sAt < panL) { x = -panL / 2 + sAt; z = panW / 2 - 0.006; } else if (sAt < panL + panW) { x = panL / 2 - 0.006; z = panW / 2 - (sAt - panL); } else if (sAt < 2 * panL + panW) { x = panL / 2 - (sAt - panL - panW); z = -panW / 2 + 0.006; } else { x = -panL / 2 + 0.006; z = -panW / 2 + (sAt - 2 * panL - panW); }
    out.push(bolt(d.diesel ? 'M8' : 'M6', 0.02, [panX + x, panTop - 0.012, z], [PI, 0, 0], 'oil pan bolt')); }
  out.push(bolt(d.diesel ? 'M16' : 'M14', 0.016, [-panL * 0.3, panBot - 0.002, 0], [PI, 0, 0], 'oil drain plug'));
  // (a gerotor round the crank's nose: its inner rotor about 0.9 bore across, its outer ring round it, typical)
  const gm = (0.9 * B) / 11;
  out.push(group('oil pump', [P('oil pump body', { lathe: (() => { const w = 0.025, g = 0.0004, a = 0.2 * B, o = 0.65 * B, rr = 0.57 * B + g, h = 0.006 + g; return [[a, -w / 2], [o, -w / 2], [o, w / 2], [a, w / 2], [a, h], [rr, h], [rr, -h], [a, -h], [a, -w / 2]] as [number, number][]; })() }, [0, 0, 0], { rot: CYL_X, item: 'oil-pump-body', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', says: 'its body and cover round the rotors, 0.4 mm clear of them (typical)' }), { ...toothed({ name: 'oil pump inner rotor', m: gm, z: 9, b: 0.012, bore: 0.42 * B, mat: 'steel-low', item: 'gerotor-inner' }), at: [0, 0, 0], rot: [0, PI / 2, 0] }, ringX('oil pump outer rotor', 0.45 * B + 0.002, 0.57 * B, 0.012, [0, 0, 0], { item: 'gerotor-outer', mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })], { item: 'oil-pump', at: [front + 0.0125, 0, 0] }));
  // (its strainer back in the sump, but no further back than the pan's own end wall: a short engine's is nearer its pump)
  const strX = Math.max(front - 0.126, panBack + 0.012), pk1 = Math.max(front - 0.06, (front + strX) / 2);
  out.push(group('oil pickup', [P('pickup tube', { tube: { r: 0.008, wall: 0.0012, pts: [[front + 0.0125, -0.65 * B - 0.009, 0], [front + 0.0125, Math.min(-0.65 * B - 0.03, panBot + 0.06), 0], [pk1, panBot + 0.035, 0], [strX + 0.006, panBot + 0.035, 0]] } }, [0, 0, 0], { mat: 'steel-low', color: 0x6a6c70, one: true }), P('strainer', { cyl: [0.035, 0.012] }, [strX, panBot + 0.035, 0], { rot: CYL_X, mat: 'steel-low', color: 0x8a8c90, fill: 0.35, one: true, says: 'a mesh over the pickup\'s mouth' })], { item: 'oil-pickup' }));
  // (a banked vee's filter on the side its starter is not: the starter goes under the side its fan is not on)
  const fr = Math.max(0.033, 0.45 * B), fh = Math.max(0.065, 0.85 * B), fz = Wc / 2 + 0.004, fSide = d.banked ? -1 : 1,
    // (and along it away from the middle, where a banked vee's exhaust crosses down that side)
    fX = d.banked ? -0.35 * len : -0.15 * len;
  out.push(group('oil filter', [P('filter can', { cyl: [fr, fh] }, [0, fh / 2, 0], { shell: 0.0005, item: 'filter-can', mat: 'steel-low', color: 0x1a4a8a, finish: 'paint' }), P('filter element', { lathe: [[fr * 0.4, 0.004], [fr * 0.85, 0.004], [fr * 0.85, fh - 0.006], [fr * 0.4, fh - 0.006], [fr * 0.4, 0.004]] }, [0, 0, 0], { item: 'filter-element', mat: 'paper', color: 0xd8c890, fill: 0.45, says: 'pleated paper, about 0.45 of its ring (typical)' }), P('filter base plate', { lathe: [[0.01, 0], [fr * 0.9, 0], [fr * 0.9, 0.003], [0.01, 0.003], [0.01, 0]] }, [0, 0, 0], { item: 'filter-base', mat: 'steel-low', color: 0x8a8c90 }), P('filter gasket', { torus: [fr * 0.75, 0.0025] }, [0, -0.002, 0], { rot: [PI / 2, 0, 0], mat: 'nbr', color: 0x1a1a1a })], { item: 'oil-filter', ...(d.vee ? { at: [fX, ysk, fSide * (Wc / 2 + fr + 0.006)] as V3, rot: [PI, 0, 0] as V3 } : { at: [-0.15 * len, 0.1 * B, fz] as V3, rot: [PI / 2, 0, 0] as V3 }) }));
  if (d.vee) out.push(box('filter adapter', [2 * fr + 0.012, 0.008, 2 * fr + 0.012], [fX, ysk + 0.004, fSide * (Wc / 2 + fr + 0.006)], { item: 'filter-adapter', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', says: 'cast, its oil ways from the crankcase\'s side to the filter under it' }));
  // (its intake on the +z side: a runner from each port up to a plenum along the engine, its throttle at the plenum's
  // front; its injectors in the runners and their rail; a diesel's from its turbo's compressor)
  const carb = s.induction === 'carburettor' || (s.induction === undefined && (d.air || d.n === 1)), carEngine = !d.air && !d.vee && !small0 && !carb && !d.diesel && d.cams === 'dohc', yport = deck + gasket + td + 0.17 * B, zport = Wb / 2, plY = yport + 0.5 * B, plZ = zport + 0.9 * B, plL = d.vee ? 2 * B : len * 0.9, runners: Part[] = [];
  const inl = cyl.map((c) => ({ x: c.x, y: yport, z: zport })), ir = (d.valves === 4 ? 0.15 : 0.13) * B + Math.min(0.003, 0.02 * B - 0.0005);
  if (!d.vee) {
    for (const c of inl) for (const vx of valveXs(d, c, false)) runners.push(P('intake runner', { tube: { r: ir, wall: 0.003, pts: [[vx, c.y, c.z], [vx, c.y, c.z + 0.25 * B], [c.x, plY - 0.1 * B, plZ - 0.2 * B]] } }, [0, 0, 0], { passes: ['injector body', 'injector needle', 'injector coil'], one: true, item: 'intake-runner', mat: d.diesel ? 'al-a380' : 'nylon', color: d.diesel ? 0x8c8e90 : 0x1a1a1a, finish: 'texture' }));
    out.push(group('intake manifold', [box('intake plenum', [plL, 0.9 * B, 0.9 * B], [0, plY, plZ], { passes: ['intake runner'], item: 'intake-plenum', mat: d.diesel ? 'al-a380' : 'nylon', shell: d.diesel ? 0.005 : 0.003, color: d.diesel ? 0x8c8e90 : 0x1a1a1a, finish: 'texture' }), ...runners], { item: 'intake-manifold', says: d.diesel ? 'cast aluminium' : 'glass-filled nylon, its shells welded' }));
    if (!d.diesel && carb) out.push(carburettor(B, [-plL / 2 - 0.3 * B, plY, plZ], [0, -PI / 2, 0]));
    else if (!d.diesel) {
      // (an injected car engine's throttle is driven by its own motor under it, a position sensor on its side (typical
      // of an electronic throttle); in its own frame, its +y the engine's -x)
      const etc = !d.vee && !d.air && !(d.n <= 2) && d.cams === 'dohc' ? [group('throttle motor', [P('motor can', { cyl: [0.012, 0.03] }, [0, 0, 0], { shell: 0.001, item: 'motor-can', mat: 'steel-low', color: 0x2a2a2a })], { item: 'throttle-motor', at: [-(0.38 * B + 0.0125), 0.02, 0] }), group('throttle position sensor', [box('sensor case', [0.02, 0.02, 0.012], [0, 0, 0.006], { item: 'sensor-case', mat: 'pbt', color: 0x2a2a2a, finish: 'texture' })], { item: 'throttle-position-sensor', at: [0, 0.02, 0.38 * B + 0.0005] })] : [];
      out.push(group('throttle body', [P('throttle housing', { lathe: [[0.3 * B, 0], [0.38 * B, 0], [0.38 * B, 0.5 * B], [0.3 * B, 0.5 * B], [0.3 * B, 0]] }, [0, 0, 0], { item: 'throttle-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('throttle plate', { cyl: [0.29 * B, 0.0012] }, [0, 0.25 * B, 0], { item: 'throttle-plate', mat: 'brass', color: 0xc8a050, rot: [0.3, 0, 0] }), ...etc], { item: 'throttle-body', at: [-plL / 2, plY, plZ], rot: [0, 0, PI / 2] }));
      for (const c of inl) out.push(group('port injector', [turned({ name: 'injector body', steps: [[0.08 * B, 0.03], [0.11 * B, 0.03]], cavity: [[0.012 * B + 0.0003, 0.005, 0.0555], [0.1 * B + 0.0004, 0.0321, 0.0479]], mat: 'stainless-304', item: 'injector-body' }), turned({ name: 'injector needle', steps: [[0.012 * B, 0.05]], mat: 'steel-alloy', item: 'injector-needle', at: [0, 0.005, 0] }), { ...wound({ name: 'injector coil', ri: 0.02 * B, ro: 0.1 * B, L: 0.015, d: 0.0002 }), at: [0, 0.0325, 0] as V3 }], { item: 'fuel-injector', at: [c.x, c.y + ir - 0.01, c.z + 0.12 * B] }));
      const ry = yport + ir - 0.01 + 0.06 + 0.009;
      out.push(P('fuel rail', { tube: { r: 0.009, wall: 0.0012, pts: [[-len / 2 + 0.03, ry, zport + 0.12 * B], [len / 2 - 0.03, ry, zport + 0.12 * B]] } }, [0, 0, 0], { item: 'fuel-rail', mat: 'stainless-304', color: 0xc8ccd2 }));
    }
  } else if (d.banked) {
    // (a banked vee's: a runner from each port on its bank's inside up into a plenum along the vee, its throttle at the
    // plenum's front; an injector in each runner, a fuel rail along each bank (typical of an injected pushrod V6's))
    const pY = deck + 1.1 * B, runs: Part[] = [], inj: Part[] = [];
    for (const c of cyl) { const xs = exSide(d, c.lean);
      for (const vx of valveXs(d, c, false)) {
        const a0 = fromBank([vx, yport, -xs * Wb / 2], c.lean), a1 = fromBank([vx, yport, -xs * (Wb / 2 + 0.3 * B)], c.lean);
        runs.push(P('intake runner', { tube: { r: ir, wall: 0.003, pts: [a0, a1, [vx, pY - 0.25 * B, 0]] } }, [0, 0, 0], { one: true, item: 'intake-runner', mat: 'al-a380', color: 0x8c8e90, finish: 'cast', passes: ['injector body', 'injector needle'] }));
        inj.push(group('port injector', [turned({ name: 'injector body', steps: [[0.08 * B, 0.03], [0.11 * B, 0.03]], cavity: [[0.012 * B + 0.0003, 0.005, 0.0555], [0.1 * B + 0.0004, 0.0321, 0.0479]], mat: 'stainless-304', item: 'injector-body' }), turned({ name: 'injector needle', steps: [[0.012 * B, 0.05]], mat: 'steel-alloy', item: 'injector-needle', at: [0, 0.005, 0] }), { ...wound({ name: 'injector coil', ri: 0.02 * B, ro: 0.1 * B, L: 0.015, d: 0.0002 }), at: [0, 0.0325, 0] as V3 }], { item: 'fuel-injector', at: a1 }));
      } }
    out.push(group('intake manifold', [box('intake plenum', [len * 0.85, 0.7 * B, 0.9 * B], [0, pY, 0], { passes: ['intake runner'], item: 'intake-plenum', mat: 'al-a380', shell: 0.004, color: 0x8c8e90, finish: 'cast' }), ...runs], { item: 'intake-manifold', says: 'cast aluminium: a plenum along the vee, a runner down to each port (typical of a pushrod V6\'s)' }));
    out.push(...inj);
    out.push(group('throttle body', [P('throttle housing', { lathe: [[0.3 * B, 0], [0.38 * B, 0], [0.38 * B, 0.5 * B], [0.3 * B, 0.5 * B], [0.3 * B, 0]] }, [0, 0, 0], { item: 'throttle-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('throttle plate', { cyl: [0.29 * B, 0.0012] }, [0, 0.25 * B, 0], { item: 'throttle-plate', mat: 'steel-low', color: 0xc8ccd2 })], { item: 'throttle-body', at: [len * 0.425, pY, 0], rot: [0, 0, -PI / 2] }));
    for (const h of headsOf(d, cyl, len)) { const xs = exSide(d, h.lean); out.push(P('fuel rail', { tube: { r: 0.009, wall: 0.0012, pts: [fromBank([h.x - h.L / 2 + 0.02, yport + 0.32 * B, -xs * (Wb / 2 + 0.3 * B)], h.lean), fromBank([h.x + h.L / 2 - 0.02, yport + 0.32 * B, -xs * (Wb / 2 + 0.3 * B)], h.lean)] } }, [0, 0, 0], { item: 'fuel-rail', mat: 'steel-low', color: 0xc8ccd2 })); }
  } else {
    // (a vee twin's: a runner from each head's port to its carburettor's throat between the banks, typical)
    out.push(group('intake manifold', [box('intake plenum', [0.8 * B, 0.5 * B, 0.5 * B], [0, deck + 0.5 * B, 0], { passes: ['intake runner'], item: 'intake-plenum', mat: 'al-a380', shell: 0.004, color: 0x8c8e90, finish: 'cast' }), ...cyl.flatMap((c) => valveXs(d, c, false).map((vx) => { const xs = exSide(d, c.lean); return P('intake runner', { tube: { r: ir, wall: 0.004, pts: [fromBank([vx, yport, -xs * Wb / 2], c.lean), fromBank([vx, yport, -xs * (Wb / 2 + 0.2 * B)], c.lean), [0, deck + 0.5 * B, 0]] } }, [0, 0, 0], { one: true, item: 'intake-runner', mat: 'al-a380', color: 0x8c8e90, finish: 'cast' }); }))], { item: 'intake-manifold' }));
    out.push(carburettor(B, [0, deck + 0.8 * B, 0], [-PI / 2, 0, 0]));
  }
  // (its exhaust on the -z side: a runner from each port into a collector along the engine, its flange at the back; its
  // gasket; a nut on two studs at each port)
  const exZ = -(Wb / 2), roFin = B / 2 + (s.block === 'iron' && !d.diesel ? 0 : (d.diesel ? 0.05 : 0.025) * B) + d.wallB + d.outer + (d.air ? 0.28 * B : 0), colZ = d.air ? -(roFin + 0.5 * B + 0.012 + (d.valves === 4 ? 0.15 : 0.13) * B + 0.003) : exZ - 0.4 * B, colY = yport - 0.3 * B, exRunners: Part[] = [], er = (d.valves === 4 ? 0.15 : 0.13) * B + Math.min(0.003, 0.02 * B - 0.0005);
  // (a diesel's turbocharger (made first: its heat shield goes round it with the manifold) on its exhaust: its turbine's scroll, its compressor's, its core, its two wheels)
  const turbo: Part[] = [];
  if (s.turbo) {
    const tz = colZ - 0.9 * B, ty = colY + 0.4 * B, tr = 0.7 * B;
    turbo.push(group('turbocharger', [ringX('turbine housing', 0.34 * B, tr, 0.6 * B, [-0.5 * B, 0, 0], { hot: 700, item: 'turbine-housing', mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', fill: 0.55, says: 'its scroll cast round its wheel (about 0.55 of the ring round it)' }), ringX('compressor housing', 0.34 * B, tr * 0.95, 0.55 * B, [0.5 * B, 0, 0], { item: 'compressor-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', fill: 0.5 }), P('turbo core', { cyl: [0.3 * B, 0.4 * B] }, [0, 0, 0], { rot: CYL_X, item: 'turbo-core', mat: 'cast-iron', color: 0x6a6c70, finish: 'cast' }), P('turbine wheel', { cyl: [0.33 * B, 0.25 * B] }, [-0.5 * B, 0, 0], { rot: CYL_X, item: 'turbine-wheel', mat: 'nickel-alloy', color: 0x8a7a6a, fill: 0.5 }), P('compressor wheel', { cyl: [0.33 * B, 0.25 * B] }, [0.5 * B, 0, 0], { rot: CYL_X, item: 'compressor-wheel', mat: 'al-2024', color: 0xc8ccd2, fill: 0.4 })], { item: 'turbocharger', at: [-len * 0.15, ty, tz] }));
  }
  out.push(...turbo);
  if (!d.vee) {
    for (const c of cyl) for (const vx of valveXs(d, c, true)) exRunners.push(P('exhaust runner', { tube: { r: er, wall: 0.005, pts: [[vx, yport, exZ - 0.0012], [vx, yport, exZ - 0.2 * B], [c.x, colY, d.air ? colZ + 0.5 * B : colZ]] } }, [0, 0, 0], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', one: true }));
    if (!d.air) exRunners.push(P('exhaust collector', { tube: { r: 0.22 * B, wall: 0.005, pts: [[len / 2 - 0.02, colY, colZ], [-len / 2 + 0.02, colY, colZ], [-len / 2 - 0.05, colY - 0.2 * B, colZ]] } }, [0, 0, 0], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', one: true }));
    out.push(group('exhaust manifold', exRunners, { item: 'exhaust-manifold', mat: 'cast-iron', hot: d.diesel ? 600 : 800, says: 'cast iron in one; about 800 °C at full load on a petrol engine, 600 °C on a diesel (typical)' }));
    out.push(box('manifold gasket', [len * 0.9, 2 * Math.min(er + 0.022, yport - deck - gasket - 0.001), 0.0012], [0, yport, exZ - 0.0006], { item: 'manifold-gasket', mat: 'stainless-304', color: 0x9a9c9e, cuts: cyl.flatMap((c) => valveXs(d, c, true).map((vx) => ({ r: er, depth: 0.0012, at: [vx, 0, 0.0006] as V3, dir: [0, 0, -1] as V3 }))) }));
    // (a nut on a stud each side of each cylinder's ports)
    for (const c of cyl) { const xs2 = valveXs(d, c, true); for (const x of [xs2[0]! - er - 0.012, xs2[xs2.length - 1]! + er + 0.012]) out.push(use('nut M8', [x, yport, exZ - 0.012], { rot: [PI / 2, 0, 0], name: 'manifold nut' })); }
    // (a heat shield of aluminised steel over it, open to the head, underneath and at the back where its pipe leaves)
    // (an air-cooled single's muffler on the end of its runner)
    const muf = d.air ? [muffler(0.5 * B, 1.4 * B, [-0.375 * 1.4 * B, colY, colZ], [0, 0, 0], 500, 'about 500 °C on its skin at full load (typical of a small engine\'s)')] : [];
    out.push(...muf);
    const xb = boundsOfAll(group('x', [...exRunners, ...muf, ...turbo])), sTop = xb.max.y + 0.025, sBot = xb.min.y - 0.01, sOut = xb.min.z - 0.01, sIn = exZ - 0.0002, sF = xb.max.x + 0.008, sB = Math.min(xb.min.x, -len / 2) - 0.01;
    out.push({ ...housing({ name: 'exhaust heat shield', L: sF - sB, H: sTop - sBot, W: sIn - sOut, wall: 0.0008, open: ['bottom', 'right', 'back'], item: 'heat-shield', mat: 'steel-low', color: 0xb8b8b0, finish: 'machined', says: 'aluminised steel sheet, 0.8 mm (typical); about 250 °C on its face (an estimate)' }), at: [(sF + sB) / 2, (sTop + sBot) / 2, (sIn + sOut) / 2], hot: 250 });
  } else if (d.banked) {
    // (a banked vee's: a cast-iron manifold on each bank's outside, a short runner from each port into a log along it;
    // the two joined behind the engine by a crossover pipe down to where the exhaust leaves (typical of a transverse V6))
    const ends: V3[] = [];
    for (const h of headsOf(d, cyl, len)) { const xs = exSide(d, h.lean), logZ = xs * (Wb / 2 + 0.55 * B), logY = yport - 0.35 * B, rs: Part[] = [];
      for (const c of h.cyl) for (const vx of valveXs(d, c, true)) rs.push(P('exhaust runner', { tube: { r: er, wall: 0.005, pts: [fromBank([vx, yport, xs * (Wb / 2 + 0.0024)], h.lean), fromBank([vx, yport, xs * (Wb / 2 + 0.25 * B)], h.lean), fromBank([c.x, logY, logZ], h.lean)] } }, [0, 0, 0], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', one: true }));
      const x0 = h.x + h.L / 2 - 0.02, x1 = h.x - h.L / 2 + 0.02;
      rs.push(P('exhaust log', { tube: { r: 0.2 * B, wall: 0.005, pts: [fromBank([x0, logY, logZ], h.lean), fromBank([x1, logY, logZ], h.lean)] } }, [0, 0, 0], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', one: true }));
      // (its gasket between it and the head: stainless sheet, a hole at each port)
      out.push(box('manifold gasket', [h.L * 0.9, 2 * Math.min(er + 0.022, yport - deck - gasket - 0.001), 0.0012], fromBank([h.x, yport, xs * (Wb / 2 + 0.0006)], h.lean), { rot: [h.lean, 0, 0], item: 'manifold-gasket', mat: 'stainless-304', color: 0x9a9c9e, cuts: h.cyl.flatMap((c) => valveXs(d, c, true).map((vx) => ({ r: er, depth: 0.0012, at: [vx - h.x, 0, xs * 0.0006] as V3, dir: [0, 0, -xs] as V3 }))) }));
      out.push(group('exhaust manifold', rs, { item: 'exhaust-manifold', mat: 'cast-iron', hot: 800, says: 'cast iron, one to each bank; about 800 °C at full load (typical of a petrol engine\'s)' })); ends.push(fromBank([0, logY - 0.2 * B, logZ], h.lean));
      // (a heat shield of aluminised steel outside it, over the log and its runners)
      // (down to a little below the log (its radius 0.2 bore), not past it into what sits under the bank: the starter, the
      // filter, the alternator)
      const sz = xs * (logZ + 0.2 * B + 0.012), sy0 = logY - 0.35 * B, sy1 = yport + 0.3 * B;
      out.push(box('exhaust heat shield', [h.L, sy1 - sy0, 0.0008], fromBank([h.x, (sy0 + sy1) / 2, sz], h.lean), { rot: [h.lean, 0, 0], item: 'heat-shield', mat: 'steel-low', color: 0xb8b8b0, finish: 'machined', says: 'aluminised steel sheet, 0.8 mm (typical)' })); }
    if (ends.length === 2) {
      // (the two banks joined at the engine's middle by a crossover pipe down each side and under its oil pan, the
      // exhaust leaving from its middle, clear of the transaxle at its back end)
      const yLow = -(d.swing + 0.02 + 0.45 * B) - 0.045, a = ends[0]!, b = ends[1]!;
      out.push(P('exhaust crossover', { tube: { r: 0.2 * B, wall: 0.0015, pts: [a, [0, yLow, a[2]], [0, yLow, b[2]], b] } }, [0, 0, 0], { item: 'exhaust-pipe', mat: 'stainless-304', color: 0x8a8278, finish: 'brushed', hot: 700, one: true, says: 'joining the banks under the oil pan (typical of a transverse V6\'s)' })); }
  } else {
    // (a vee's: from each bank's port on its outside, out and forward to a muffler across the engine's front)
    const p1 = (c: { lean: number }, vx: number): V3 => fromBank([vx, yport, exSide(d, c.lean) * (Wb / 2 + 0.3 * B)], c.lean), mx = len / 2 + 0.18, my = p1(cyl[0]!, 0)[1], mz = Math.abs(p1(cyl[0]!, 0)[2]) + 0.02;
    out.push(group('exhaust manifold', cyl.flatMap((c) => valveXs(d, c, true).map((vx) => P('exhaust runner', { tube: { r: er, wall: 0.003, pts: [fromBank([vx, yport, exSide(d, c.lean) * Wb / 2], c.lean), p1(c, vx), [mx, my, p1(c, vx)[2]]] } }, [0, 0, 0], { mat: 'steel-low', color: 0x5a4a40, finish: 'paint', one: true }))), { item: 'exhaust-manifold', hot: 700, says: 'pressed and welded steel pipes, about 700 °C (typical)' }));
    out.push(muffler(0.5 * B, 2 * mz, [mx, my, 0], [0, PI / 2, 0], 500, 'about 500 °C on its skin at full load (typical of a small engine\'s)'));
  }
  // (what hangs on its front, on a belt from the crank's pulley: its alternator and water pump, a tensioner)
  const belt: [number, number, number][] = [[0, 0, dr]], bh = 0.004;
  const altR = Math.max(0.065, Math.min(0.09, 0.85 * B)), altL = altR * 2.1, altAt: [number, number] = [-(Math.max(Wc, tcW) / 2 + altR + 0.02), d.banked ? -0.07 : deck * 0.55];
  // (a banked vee's alternator low beside its crankcase, under its bank, where its barrel and exhaust lean away from it)
  if (small) {
    // (a small engine's charging: a stator of coils under its flywheel, its magnets in the flywheel's rim (a magneto), no belt)
    out.push(group('flywheel stator', [ringX('stator core', 0.52 * B, 0.9 * B, 0.11 * B, [0, 0, 0], { passes: ['stator coil'], item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60, fill: 0.6 }), ...Array.from({ length: 6 }, (_, k) => ({ ...wound({ name: 'stator coil', ri: 0.035 * B, ro: 0.08 * B, L: 0.1 * B, d: 0.0005, centre: true }), at: [0, 0.71 * B * Math.cos((k * PI) / 3), 0.71 * B * Math.sin((k * PI) / 3)] as V3, rot: CYL_X }))], { at: [back - 0.004 - 0.055 * B, 0, 0], says: 'a stator of coils the flywheel\'s magnets sweep: its charging and its spark' }));
  }
  if (!small) {
    belt.push([altAt[0], altAt[1], 0.03]);
    const al = (n: string, ri: number, ro: number, w: number, x: number, more: Partial<Part>) => ringX(n, ri, ro, w, [x, 0, 0], more);
    out.push(group('alternator', [
      al('alternator front housing', altR * 0.3, altR, altL * 0.3, -altL * 0.15, { mat: 'al-a380', color: 0xa8aaae, finish: 'cast', fill: 0.4 }),
      al('alternator rear housing', altR * 0.3, altR, altL * 0.3, -altL * 0.85, { mat: 'al-a380', color: 0xa8aaae, finish: 'cast', fill: 0.4 }),
      al('stator', altR * 0.62, altR * 0.92, altL * 0.35, -altL * 0.5, { passes: ['stator winding 1', 'stator winding 2', 'stator winding 3'], item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60 }),
      // (its three phases' windings, about 1.2 mm wire (typical of a car's alternator), wrapped round the stator's band)
      ...[0, 1, 2].map((k) => ({ ...wound({ name: `stator winding ${k + 1}`, kind: 'toroid', ri: altR * 0.6, ro: altR * 0.95, L: altL * 0.08, d: 0.0012, fill: 0.5 }), at: [-altL * (0.3 + 0.2 * k), 0, 0] as V3, rot: CYL_X })),
      group('rotor', [al('claw pole', 0.006, altR * 0.58, altL * 0.15, -altL * 0.42, { mat: 'steel-low', color: 0x6a6c70, one: true }), al('claw pole', 0.006, altR * 0.58, altL * 0.15, -altL * 0.58, { mat: 'steel-low', color: 0x6a6c70, one: true }), { ...wound({ name: 'field coil', ri: 0.012, ro: altR * 0.4, L: altL * 0.06, d: 0.0006, centre: true }), at: [-altL * 0.5, 0, 0] as V3, rot: CYL_X }, P('rotor shaft', { cyl: [0.0085, altL * 1.1] }, [-altL * 0.5, 0, 0], { rot: CYL_X, item: 'shaft-steel', mat: 'steel-alloy', color: 0xc8ccd2 })], { item: 'rotor-claw' }),
      ...[0, 1, 2, 3, 4, 5].map((k) => rectifierDiode([-altL * 0.95, altR * 0.5 * Math.cos(k), altR * 0.5 * Math.sin(k)])),
      { ...mouldedChip({ name: 'voltage regulator', w: 0.01, d: 0.006, h: 0.0025, pins: 8 }), at: [-altL * 0.97, -altR * 0.4, 0] as V3, rot: [0, 0, PI / 2] as V3 },
      ...[-1, 1].map((sd) => box('carbon brush', [0.005, 0.005, 0.012], [-altL * 0.9, sd * 0.012, 0.012], { item: 'carbon-brush', mat: 'graphite', color: 0x2a2a2a })),
      ...[-0.05, -0.95].map((f) => ({ ...use('bearing 6203 ZZ', [altL * f, 0, 0], { rot: CYL_X }) })),
      al('alternator pulley', 0.006, 0.03, 0.025, 0.02, { mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })], { item: 'alternator', at: [bx - 0.02, altAt[1], -altAt[0]] }));
    // (its bracket from the barrel's side out to its rear housing)
    const xbk = bx - 0.02 - altL * 0.85, zb0 = d.cams === 'dohc' && !d.vee && !d.air ? Math.max(...[-0.006, 0, 0.006].map((o) => barrelHalfAt(d, cyl, xbk + o))) + 0.0005 : d.banked ? Wc / 2 + 0.0005 : Wb / 2, zb1 = -altAt[0] - altR, ybk = d.banked ? ysk + 0.025 : altAt[1];
    out.push(box('alternator bracket', [0.012, 0.04, zb1 - zb0], [xbk, ybk, (zb0 + zb1) / 2], { item: 'alternator-bracket', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }));
    if (!d.air) {
      // (its water pump over the crank's pulley, through the timing cover: its volute round its impeller, its front
      // plate with its seal, its shaft, its pulley in the belt's plane)
      if (fit.waterPump !== 'electric') belt.push([wpAt[0], wpAt[1], 0.035]);
      const ph = { item: 'pump-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', one: true };
      out.push(group('water pump', [group('pump housing', [ringX('pump volute', 0.032, 0.06, 0.024, [-0.023, 0, 0], ph), ringX('pump front plate', 0.015, 0.06, 0.006, [-0.008, 0, 0], ph)], { item: 'pump-housing', mat: 'al-a380' }), { ...toothed({ name: 'impeller', m: 0.004, z: 12, b: 0.012, bore: 0.012, mat: 'pp', item: 'impeller' }), at: [-0.023, 0, 0], rot: [0, PI / 2, 0] }, P('pump shaft', { cyl: [0.006, fit.waterPump === 'electric' ? 0.085 : 0.05] }, [fit.waterPump === 'electric' ? 0.0025 : -0.015, 0, 0], { rot: CYL_X, item: 'pump-shaft', mat: 'steel-alloy', color: 0xc8ccd2 }), ringX('pump seal', 0.006, 0.015, 0.006, [-0.008, 0, 0], { item: 'shaft-seal', mat: 'nbr', color: 0x1a1a1a }), ...(fit.waterPump === 'electric' ? [group('water pump motor', [P('motor can', { cyl: [0.034, 0.03] }, [0.04, 0, 0], { rot: CYL_X, shell: 0.0015, passes: ['pump shaft'], item: 'motor-can', mat: 'al-a380', color: 0x2a2a2a, finish: 'paint' }), ringX('stator', 0.016, 0.03, 0.018, [0.04, 0, 0], { passes: ['pump shaft', 'stator winding'], item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60 }), { ...wound({ name: 'stator winding', kind: 'toroid', ri: 0.016, ro: 0.031, L: 0.006, d: 0.0005, fill: 0.5 }), at: [0.04, 0, 0] as V3, rot: CYL_X }], { item: 'pump-motor', says: 'a brushless motor turning the impeller as the ECU asks (Toyota: motor-driven water pump)' })] : [ringX('water pump pulley', 0.006, 0.035, 0.022, [0.01, 0, 0], { mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })])], { item: 'water-pump', at: [bx - 0.01, wpAt[1], -wpAt[0]], ...(fit.waterPump === 'electric' ? { says: 'its impeller turned by its own motor, off the belt' } : {}) }));
    }
    // (its tensioner on the belt's slack side: low by the pump, or up between the crank and the alternator where the
    // pump is off the belt)
    const tAt: [number, number] = fit.waterPump === 'electric' ? [-(Wc / 2) + 0.005, deck * 0.56] : [-(Wc / 2), deck * 0.25];
    belt.push([tAt[0], tAt[1], 0.035]);
    out.push(group('belt tensioner', [box('tensioner arm', [0.014, 0.08, 0.03], [-0.01, 0.03, 0], { item: 'tensioner-arm', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), ringX('idler pulley', 0.008, 0.035, 0.025, [0.01, 0, 0], { item: 'idler-pulley', mat: 'steel-low', color: 0x8a8c90, finish: 'machined' }), { ...coil({ name: 'tensioner spring', d: 0.003, D: 0.02, L: 0.03, n: 5 }), at: [-0.01, 0.07, 0] }], { item: 'belt-tensioner', at: [bx - 0.01, tAt[1], -tAt[0]] }));
    // (an injected car engine's A/C compressor low on its intake side, on the belt through its magnetic clutch, on a
    // bracket off the crankcase wall (typical))
    if (carEngine) {
      const cz = Wc / 2 + 0.063, cy = -0.07, cr = 0.05, cL = 0.13;
      belt.push([-cz, cy, 0.055]);
      out.push(group('A/C compressor', [P('compressor body', { cyl: [cr, cL] }, [-0.02 - cL / 2, 0, 0], { rot: CYL_X, shell: 0.004, item: 'compressor-body', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', says: 'its swash plate and pistons inside (not drawn), a scroll of refrigerant R-1234yf (typical of a car of 2025)' }),
        { ...wound({ name: 'magnetic clutch', ri: 0.012, ro: 0.045, L: 0.012, d: 0.0006, centre: true, says: 'its coil, about 0.6 mm wire (typical), pulling the clutch plate onto the pulley' }), at: [-0.011, 0, 0] as V3, rot: CYL_X },
        ringX('compressor pulley', 0.012, 0.055, 0.02, [0.005, 0, 0], { item: 'pulley', mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })], { item: 'ac-compressor', at: [bx - 0.005, cy, cz] }));
      out.push(box('compressor bracket', [0.03, 0.02, cz - Wc / 2 - 0.0005], [bx - 0.02 - cL + 0.015, cy + cr + 0.01, (Wc / 2 + 0.0005 + cz) / 2], { item: 'bracket', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', joins: ['crankcase wall', 'compressor body'] }));
    }
    // (the belt round the outside of its pulleys, its middle half its thickness out from their faces)
    const loop = around(belt.map(([u, v, rr]) => [u, v, rr + bh] as [number, number, number])).map(([u, v]) => [bx, v, -u] as V3);
    out.push(P('ribbed belt', { tube: { r: bh, pts: [...loop, loop[0]!], bend: 0.004 } }, [0, 0, 0], { item: 'ribbed-belt', clear: 0.004, runsOn: ['pulley', 'damper', 'idler', 'impeller', 'clutch'], mat: 'epdm', color: 0x1a1a1a, finish: 'texture', fill: 0.9, says: 'six ribs on aramid cords (its section drawn round)' }));
  }
  // (its starter beside the flywheel, its pinion by the ring gear; or a small engine's recoil starter)
  if (electric) {
    const sR = Math.max(0.035, Math.min(0.06, 0.45 * B)), sL = sR * 3.2, sz = fwR + 0.006 + sR * 0.6, sx = fx + 0.02 + sL / 2;
    // (where beside the crankcase there is no room for it (a short single's), it sits up on the crankcase beside the
    // barrel on its intake side (away from its exhaust) and turns the ring gear through an idle gear between them, as a
    // single-cylinder ATV's starter does; its solenoid on its outboard side)
    const above = !d.vee && Wc / 2 + 0.003 + sR > sz, sAt: V3 = above ? [sx, d.yb0 + sR + 0.004, Wb / 2 + sR + 0.004] : [sx, -0.2 * B, d.banked ? sz : -sz], out1 = sAt[2] >= 0 ? 1 : -1;
    // (a banked vee's on its other side from an inline's: the side its radiator's fan is not on)
    if (above) {
      const D = Math.hypot(sAt[1], sAt[2]), rr = fwR + 0.006 + rgM, rp = (rgM * 10) / 2, ri = (D - rr - rp) / 2, zi = Math.max(12, Math.round((2 * ri) / rgM)), ux = sAt[1] / D, uz = sAt[2] / D, bw = 0.012 + 0.04 * B;
      out.push({ ...toothed({ name: 'starter idle gear', m: rgM, z: zi, b: 0.012, bore: 0.012, mat: 'steel-alloy', item: 'spur-gear', says: 'between the starter\'s pinion and the ring gear' }), at: [fx + bw / 2 + 0.006 + 0.0015, (rr + ri) * ux, (rr + ri) * uz], rot: [0, PI / 2, 0] });
    }
    out.push(group('starter motor', [P('starter can', { cyl: [sR, sL * 0.6] }, [0, 0, 0], { rot: CYL_X, shell: 0.0025, passes: ['armature shaft'], item: 'starter-can', mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' }), group('armature', [P('armature shaft', { cyl: [0.006, sL * 0.95] }, [0, 0, 0], { rot: CYL_X, item: 'shaft-steel', mat: 'steel-alloy', color: 0xc8ccd2 }), ringX('armature core', 0.006, sR * 0.62, sL * 0.35, [0, 0, 0], { passes: ['armature winding'], item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60, fill: 0.8 }), ...[0, 1, 2].map((k) => ({ ...wound({ name: 'armature winding', kind: 'toroid', ri: sR * 0.5, ro: sR * 0.66, L: sL * 0.094, d: 0.0015, fill: 0.5 }), at: [sL * (-0.1 + 0.1 * k), 0, 0] as V3, rot: ALONG_X })), ringX('commutator', 0.007, sR * 0.3, sL * 0.1, [sL * 0.235, 0, 0], { item: 'commutator', mat: 'copper', color: 0xb87333 })], { item: 'armature' }), starterSolenoid(sR * 0.5, sL * 0.5, [0.03, 0, out1 * sR * 1.4]), { ...toothed({ name: 'starter pinion', m: rgM, z: 10, b: 0.02, bore: 0.012, mat: 'steel-alloy', item: 'starter-pinion' }), at: [-sL * 0.4, 0, 0], rot: [0, PI / 2, 0] }, ...[-1, 1].map((sd) => box('starter brush', [0.006, 0.006, 0.012], [sL * 0.25, sd * sR * 0.5, 0], { item: 'carbon-brush', mat: 'graphite', color: 0x2a2a2a }))], { item: 'starter-motor', at: sAt }));
  } else {
    out.push(group('recoil starter', [box('recoil housing', [0.04, 1.6 * B, 1.6 * B], [0, 0, 0], { shell: 0.0012, mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' }), ringX('rope pulley', 0.008, 0.45 * B, 0.02, [0.005, 0, 0], { mat: 'nylon', color: 0x1a1a1a }), P('starter rope', { torus: [0.42 * B, 0.002] }, [0.005, 0, 0], { rot: [0, PI / 2, 0], mat: 'nylon', color: 0xd8d0b0 }), { ...coil({ name: 'recoil spring', d: 0.0015, D: 0.5 * B, L: 0.012, n: 6 }), at: [0.01, 0, 0], rot: [0, 0, PI / 2] }], { at: [fx - fwT / 2 - 0.03, 0, 0], says: 'a pull rope wound on a sprung pulley, ratchets into the flywheel' }));
  }
  // (an air-cooled engine's blower housing over its flywheel's fan and its barrels, its muffler and air cleaner)
  if (d.air) {
    out.push(box('blower housing', [0.06, deck + 0.3 * B - ysk, Wc + 0.3 * B], [fx, (deck + 0.3 * B + ysk) / 2, 0], { shell: 0.0012, mat: 'steel-low', color: 0xc82020, finish: 'paint', says: 'pressed steel, leading the flywheel\'s fan\'s air over the fins' }));
    const acAt: V3 = d.twin ? [0, deck + 0.8 * B + 0.6 * B + 0.45 * B, 0] : [-(len * 0.45 + 0.3 * B + 0.6 * B + 0.4 * B), yport + 0.5 * B, Wb / 2 + 0.9 * B];
    out.push(group('air cleaner', [box('air cleaner case', [0.8 * B, 0.9 * B, 0.6 * B], [0, 0, 0], { shell: 0.0015, mat: 'abs', color: 0x1a1a1a, finish: 'texture', item: 'air-cleaner-case', passes: ['air filter'] }), box('air filter', [0.7 * B, 0.7 * B, 0.4 * B], [0, 0, 0], { mat: 'paper', color: 0xd8c890, fill: 0.3, item: 'air-filter-element' })], { item: 'air-cleaner', at: acAt }));
  }
  // ==== what reads it, cools it, cleans it and wires it (an injected, liquid-cooled twin-cam car engine's, each typical
  // of one unless its fit says its maker's: src/data/references.ts names each with where it was read) ====
  if (carEngine) {
    const Lh = len - 0.4 * d.we, xs = exSide(d, 0), camY = d.camY, hx = -Lh / 2, plTop = plY + 0.45 * B, sensorMat = { mat: 'stainless-304', color: 0x9a9c9e, finish: 'machined' };
    // (a harness is laid up as one: its leads taped into its trunk, a plug moulded on each lead's end)
    const plug = (name: string, at: V3, rot: V3 = [0, 0, 0]): Part => box(name, [0.012, 0.012, 0.012], at, { rot, item: 'connector', mat: 'pbt', color: 0x2a2a2a, finish: 'texture', one: true });
    const conns: Part[] = [], leads: Part[] = [];
    const lead = (name: string, pts: V3[], r = 0.0035): void => { leads.push(P(name, { tube: { r, pts, bend: 0.008 } }, [0, 0, 0], { item: 'wire-loom', mat: 'nylon', color: 0x1a1a1a, finish: 'texture', fill: 0.7, one: true, says: 'its wires in convoluted nylon conduit (typical under a bonnet)' })); };
    // (the trunk of its harness along its intake side over the runners, down its back to a loom along the block)
    // (its low run above the bell housing's top, where a gearbox bolts on round the flywheel: the plate's radius and 30 mm)
    const tz = Wb / 2 + 0.015, ty = ctop - 0.018, lx = -len / 2 - 0.007, ly = Math.max(0.1, fwR + 0.03);
    lead('harness trunk', [[0.19, ctop + 0.042, tz], [0.18, ty, tz], [lx, ty, tz], [lx, ly, tz], [0.18, ly, tz]], 0.005);
    // (a coil's plug on its housing's side above the cover, a lead over the cover's edge to the trunk)
    for (const c of cyl) { const pa = plugAt(d, c), cy0 = ctop + 0.012, cz = pa.z + 0.12 * B + 0.0065; conns.push(plug('coil connector', [pa.x, cy0, cz])); lead('coil lead', [[pa.x, cy0, cz + 0.006], [pa.x, cy0, tz - 0.006], [pa.x, ty, tz]]); }
    // (each port injector's plug on its side above its runner, a lead up past the rail)
    for (const c of inl) { const iz = c.z + 0.12 * B + 0.009 + 0.0065, iy = c.y + ir - 0.01 + 0.04; conns.push(plug('injector connector', [c.x, iy, iz])); lead('injector lead', [[c.x, iy + 0.006, iz], [c.x, ty - 0.02, iz], [c.x, ty, tz]]); }
    // (a knock sensor bolted to the barrel's intake side between its middle cylinders, a piezoelectric ring under a
    // seismic mass in its case)
    const kx = cyl.length > 1 ? (cyl[(cyl.length >> 1) - 1]!.x + cyl[cyl.length >> 1]!.x) / 2 : 0, ky = deck - 0.08, kz = Wb / 2 + 0.0005;
    out.push(group('knock sensor', [P('knock sensor case', { cyl: [0.014, 0.012] }, [0, 0, 0.006], { rot: [PI / 2, 0, 0], item: 'sensor-case', mat: 'pbt', color: 0x2a2a2a, finish: 'texture' }), ringX('piezo element', 0.005, 0.011, 0.002, [0, 0, 0.004], { rot: [0, PI / 2, 0], item: 'piezo-ceramic', mat: 'pzt', color: 0xe8e0d0, says: 'lead zirconate titanate (PZT)' })], { item: 'knock-sensor', at: [kx, ky, kz], joins: ['barrel'] }));
    conns.push(plug('knock sensor connector', [kx, ky - 0.014 - 0.0065, kz + 0.006])); lead('knock lead', [[kx, ky - 0.0275, kz + 0.006], [kx, ly + 0.005, tz]]);
    // (an oil pressure switch in the crankcase wall low on the intake side, by the filter)
    const ox = 0.02, oy = 0.03, oz = Wc / 2 + 0.0005;
    out.push(group('oil pressure switch', [P('switch body', { cyl: [0.011, 0.022] }, [0, 0, 0.011], { rot: [PI / 2, 0, 0], item: 'switch-body', ...sensorMat })], { item: 'oil-pressure-switch', at: [ox, oy, oz], joins: ['crankcase wall'] }));
    conns.push(plug('oil pressure connector', [ox, oy, oz + 0.022 + 0.0065])); lead('oil pressure lead', [[ox, oy, oz + 0.035], [ox, oy + 0.06, oz + 0.035], [ox, ly, tz]]);
    // (a crank position sensor reading its ring gear's teeth through a bracket off the block's back (typical of an
    // engine that reads its flywheel or drive plate))
    const rgR = fwR + 0.006 + (d.diesel ? 0.0042 : 0.0025), sx = fx, sz0 = rgR + 0.002, scz = sz0 + 0.03 + 0.0065;
    out.push(group('crank position sensor', [P('sensor body', { cyl: [0.0075, 0.03] }, [0, 0, 0.015], { rot: [PI / 2, 0, 0], item: 'sensor-case', mat: 'pbt', color: 0x2a2a2a, finish: 'texture' }), P('sensor pole', { cyl: [0.003, 0.0035] }, [0, 0, -0.00175], { rot: [PI / 2, 0, 0], item: 'pole-piece', mat: 'steel-electrical', color: 0x5a5c60 })], { item: 'crank-position-sensor', at: [sx, 0, sz0], says: 'reads the ring gear\'s teeth going by (typical of an engine that reads its flywheel or drive plate)' }));
    // (its bracket: a plate on the crankcase's end, clear of the flywheel's face, and an arm out over the ring gear to it)
    const bx0 = Math.max(sx + 0.008, fx + fwT / 2 + 0.0005), bx1 = -len / 2 - 0.0005, az = sz0 + 0.022, bk = { item: 'bracket', mat: 'steel-low', color: 0x3a3c40 };
    out.push(group('crank sensor bracket', [box('bracket plate', [bx1 - bx0, 0.004, az + 0.002 - 0.09], [(bx0 + bx1) / 2, 0, (az + 0.002 + 0.09) / 2], bk), ...(bx0 > sx + 0.008 + 1e-6 ? [box('bracket arm', [bx0 - (sx + 0.008), 0.004, 0.004], [(bx0 + sx + 0.008) / 2, 0, az], bk)] : [])], { ...bk, joins: ['crankcase end', 'sensor body'] }));
    conns.push(plug('crank sensor connector', [sx, 0, scz])); lead('crank sensor lead', [[sx, 0, scz + 0.006], [sx, 0, scz + 0.014], [sx, ly, scz + 0.014], [lx, ly, 0.11], [lx, ly, tz]]);
    // (a cam position sensor at the head's back reading each cam's end (each cam is phased on its own))
    for (const zc of [-xs * 0.21 * B, xs * 0.21 * B]) {
      out.push(group('cam position sensor', [P('sensor body', { cyl: [0.0075, 0.02] }, [-0.0105, 0, 0], { rot: CYL_X, item: 'sensor-case', mat: 'pbt', color: 0x2a2a2a, finish: 'texture' }), box('sensor flange', [0.003, 0.026, 0.018], [-0.002, 0, 0], { item: 'sensor-flange', mat: 'pbt', color: 0x2a2a2a })], { item: 'cam-position-sensor', at: [hx - 0.0005, camY, zc], joins: ['head end'] }));
      conns.push(plug('cam sensor connector', [hx - 0.021 - 0.0065, camY, zc])); lead('cam sensor lead', [[hx - 0.034, camY, zc], [hx - 0.038, ty, zc], [lx, ty, tz]]);
    }
    // (its thermostat in a housing on the head's back, its coolant temperature sensor in the housing; the upper hose to
    // the radiator and the heater's hose from it, ending where the car's take them (not drawn))
    const thY = deck + gasket + td + 0.03, thZ = 0.02, thR = 0.025, thL = 0.03;
    out.push(group('thermostat housing', [P('housing', { cyl: [thR, thL] }, [-thL / 2, 0, 0], { rot: CYL_X, shell: 0.003, passes: ['thermostat'], item: 'thermostat-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }),
      group('thermostat', [ringX('thermostat flange', 0.012, 0.022, 0.002, [-0.004, 0, 0], { item: 'thermostat-flange', mat: 'brass', color: 0xc8a050 }), P('wax element', { cyl: [0.008, 0.018] }, [-0.014, 0, 0], { rot: CYL_X, item: 'wax-element', mat: 'brass', color: 0xc8a050, says: fit.waterPump === 'electric' ? 'heated by the ECU to open sooner; opens at 176–183 °F (Vehicle Service Pros, of the series)' : 'opens at about 82 °C (typical)' })], { item: 'thermostat' }),
      group('coolant temperature sensor', [P('sensor body', { cyl: [0.006, 0.02] }, [0, 0.01, 0], { item: 'sensor-case', ...sensorMat })], { item: 'coolant-temperature-sensor', at: [-thL / 2, thR + 0.0005, 0] })], { item: 'thermostat-housing', at: [hx - 0.0005, thY, thZ], joins: ['head end'] }));
    conns.push(plug('coolant sensor connector', [hx - 0.0005 - thL / 2, thY + thR + 0.021 + 0.0065, thZ])); lead('coolant sensor lead', [[hx - 0.0005 - thL / 2, thY + thR + 0.034, thZ], [hx - 0.0005 - thL / 2, thY + thR + 0.034, tz], [lx, thY + thR + 0.034, tz]]);
    const hose = (name: string, r: number, pts: V3[]): Part => P(name, { tube: { r, wall: 0.004, pts, bend: 0.03 } }, [0, 0, 0], { item: 'coolant-hose', mat: 'epdm', color: 0x1a1a1a, finish: 'texture', says: 'to the car\'s radiator and heater core, which are not drawn' });
    out.push(hose('upper radiator hose', 0.014, [[hx - thL - 0.001, thY, thZ - 0.008], [hx - thL - 0.035, thY, thZ - 0.008], [hx - thL - 0.06, thY + 0.04, thZ - 0.008]]));
    out.push(hose('heater hose', 0.007, [[hx - thL - 0.001, thY, thZ + 0.016], [hx - thL - 0.03, thY, thZ + 0.04], [hx - thL - 0.05, thY + 0.03, thZ + 0.1]]));
    // (the lower hose into the pump's inlet on its front plate, up over the belt to the radiator in front)
    out.push(hose('lower radiator hose', 0.012, [[bx - 0.018, wpAt[1] + 0.0605, 0], [bx - 0.018, wpAt[1] + 0.11, 0], [bx + 0.06, wpAt[1] + 0.125, 0], [bx + 0.14, wpAt[1] + 0.125, 0]]));
    // (its oil dipstick in a tube from the crankcase up past the manifold's front, its handle on top)
    const dx2 = len / 2 - 0.01, dzT = Wc / 2 + 0.013, dTop = plTop + 0.01;
    out.push(group('oil dipstick', [P('dipstick tube', { tube: { r: 0.0055, wall: 0.001, pts: [[dx2, 0.06, Wc / 2 + 0.0005], [dx2, 0.06, dzT], [dx2, 0.12, dzT], [dx2, dTop, dzT]], bend: 0.012 } }, [0, 0, 0], { passes: ['dipstick'], item: 'dipstick-tube', mat: 'steel-low', color: 0x3a3c40, joins: ['crankcase wall'] }),
      P('dipstick', { tube: { r: 0.0015, pts: [[dx2, 0.065, dzT], [dx2, dTop + 0.004, dzT]] } }, [0, 0, 0], { item: 'dipstick-blade', mat: 'steel-low', color: 0xc8ccd2 }),
      P('dipstick handle', { torus: [0.011, 0.003] }, [dx2, dTop + 0.018, dzT], { rot: [0, PI / 2, 0], item: 'dipstick-handle', mat: 'nylon', color: 0xe8b020 })], { item: 'oil-dipstick', says: 'its handle yellow (as it is marked in most cars, typical)' }));
    // (its PCV valve on the cam cover, a hose from it to the plenum)
    const pvx = (cyl[cyl.length - 1]!.x + cyl[cyl.length - 2]!.x) / 2, pvz = -0.03;
    out.push(group('PCV valve', [P('valve body', { cyl: [0.008, 0.025] }, [0, 0.0125, 0], { item: 'pcv-valve', mat: 'nylon', color: 0x2a2a2a })], { item: 'pcv-valve', at: [pvx, ctop + 0.0005, pvz], joins: ['cam cover top'] }));
    out.push(P('PCV hose', { tube: { r: 0.006, wall: 0.0015, pts: [[pvx, ctop + 0.0255, pvz], [pvx, ctop + 0.04, pvz], [pvx, ctop + 0.04, plZ - 0.027], [pvx, plTop + 0.0005, plZ - 0.027]], bend: 0.012 } }, [0, 0, 0], { item: 'pcv-hose', mat: 'nbr', color: 0x1a1a1a, joins: ['valve body', 'intake plenum'] }));
    // (a manifold pressure sensor on the plenum's top; the throttle's motor under its body, its position sensor beside)
    const mpx = pvx + 0.04;
    out.push(group('manifold pressure sensor', [box('sensor case', [0.025, 0.012, 0.02], [0, 0.006, 0], { item: 'sensor-case', mat: 'pbt', color: 0x2a2a2a, finish: 'texture' })], { item: 'map-sensor', at: [mpx, plTop + 0.0005, plZ], joins: ['intake plenum'] }));
    conns.push(plug('MAP sensor connector', [mpx, plTop + 0.0125 + 0.0065, plZ])); lead('MAP sensor lead', [[mpx, plTop + 0.026, plZ], [mpx, ty, plZ], [mpx, ty, tz]]);
    const tbx = -plL / 2;
    conns.push(plug('throttle connector', [tbx - 0.02, plY, plZ + 0.38 * B + 0.0125 + 0.0065])); lead('throttle lead', [[tbx - 0.02, plY, plZ + 0.38 * B + 0.025], [lx - 0.021, plY, plZ + 0.38 * B + 0.025], [lx - 0.021, plY, tz], [lx, plY, tz]]);
    // (its exhaust past the collector: a front pipe down to its catalytic converter (a ceramic honeycomb, its washcoat's
    // metals on it, in a steel can), an air-fuel ratio sensor before it, an oxygen sensor after; each on its own lead)
    // (close-coupled on its exhaust side, within the block's length and outboard of its crankcase: past its back end is the
    // gearbox's bell housing, along its drive end the starter; beyond the torque rod's rubber by what its heat needs
    // (TNGA engines' catalyst stands close behind the manifold the same way, Toyota))
    const cR = 0.055, cH = 0.14, ce: V3 = [-len / 2 - 0.05, colY - 0.2 * B, colZ], cx = Math.min(len / 2 - cR - 0.02, 0.025 + 0.085 + cR), cz = -(Math.max(Wc, Wb) / 2 + cR + 0.0078 + 0.008), cTop = ce[1] - 0.08;
    const hotEx = { mat: 'stainless-304', color: 0x7a6a60, finish: 'cast' };
    out.push(P('front pipe', { tube: { r: 0.02, wall: 0.0015, pts: [ce, [ce[0], ce[1] - 0.01, cz], [cx, ce[1] - 0.01, cz], [cx, cTop + 0.0005, cz]], bend: 0.03 } }, [0, 0, 0], { ...hotEx, item: 'exhaust-pipe', hot: 750, joins: ['exhaust collector'], says: 'about 750 °C at full load (typical)' }));
    // (its shield: a ring of aluminised steel round its can, open at its ends)
    const cs0 = cR + 0.007, cs1 = cs0 + 0.0008, sh = cH - 0.01;
    out.push(group('catalytic converter', [P('converter shell', { cyl: [cR, cH] }, [0, -cH / 2, 0], { shell: 0.0015, passes: ['catalyst substrate', 'converter mat'], item: 'converter-shell', mat: 'stainless-304', color: 0x8a8a88, finish: 'machined' }),
      P('converter mat', { lathe: [[cR - 0.0045, 0], [cR - 0.0016, 0], [cR - 0.0016, cH - 0.02], [cR - 0.0045, cH - 0.02], [cR - 0.0045, 0]] }, [0, -cH + 0.01, 0], { item: 'converter-mat', mat: 'mica', color: 0xd8d0c0, says: 'an intumescent mat holding the substrate in its can' }),
      P('converter heat shield', { lathe: [[cs0, 0], [cs1, 0], [cs1, sh], [cs0, sh], [cs0, 0]] }, [0, -cH + 0.005, 0], { item: 'heat-shield', mat: 'steel-low', color: 0xb8b8b0, finish: 'machined', hot: 350, says: 'aluminised steel, about 350 °C on its face (an estimate)' }),
      P('catalyst substrate', { cyl: [cR - 0.0046, cH - 0.02] }, [0, -cH / 2, 0], { item: 'catalyst-substrate', mat: 'alumina', color: 0xd8c8a8, fill: 0.3, says: 'cordierite honeycomb, about 0.3 of it solid (typical), drawn by alumina\'s density; platinum, palladium and rhodium in its washcoat' })], { item: 'catalytic-converter', at: [cx, cTop, cz], hot: 700, says: 'close to the manifold so it lights off soon; about 700 °C at work (typical)' }));
    out.push(P('tail pipe', { tube: { r: 0.02, wall: 0.0015, pts: [[cx, cTop - cH - 0.0005, cz], [cx, cTop - cH - 0.03, cz - 0.06], [cx, cTop - cH - 0.09, cz - 0.06]], bend: 0.03 } }, [0, 0, 0], { ...hotEx, item: 'exhaust-pipe', hot: 500, says: 'on to the car\'s muffler (not drawn)' }));
    // (a shield between the pipe below the converter and the oil pan's gasket, aluminised steel (typical of a down pipe's))
    out.push(box('tail pipe heat shield', [0.07, 0.1, 0.001], [cx, cTop - cH - 0.05, cz + 0.03], { item: 'heat-shield', mat: 'steel-low', color: 0xb8b8b0, finish: 'machined', says: 'aluminised steel, between the down pipe and the oil pan' }));
    const o2 = (name: string, at: V3): void => {
      out.push(group(name, [P('sensor shell', { cyl: [0.009, 0.026] }, [0, 0, -0.013], { rot: [PI / 2, 0, 0], item: 'sensor-shell', ...sensorMat }), P('sensing element', { cyl: [0.004, 0.012] }, [0, 0, 0.006], { rot: [PI / 2, 0, 0], item: 'zirconia-element', mat: 'zirconia', color: 0xe8e0d0 })], { item: 'oxygen-sensor', at, joins: ['front pipe', 'tail pipe'] }));
      // (its own lead, in PTFE for the heat, up behind the engine to the loom)
      leads.push(P(`${name} lead`, { tube: { r: 0.003, pts: [[at[0], at[1], at[2] - 0.0265], [at[0], at[1], cz - 0.125], [at[0], ty + 0.08, cz - 0.125], [lx - 0.02, ty + 0.08, cz - 0.125], [lx - 0.02, ty + 0.08, tz], [lx, ty, tz]], bend: 0.01 } }, [0, 0, 0], { item: 'wire-loom', mat: 'ptfe', color: 0x6a6c70, finish: 'texture', one: true }));
    };
    o2('air-fuel ratio sensor', [cx, cTop + 0.06, cz - 0.02 - 0.0005]);
    o2('oxygen sensor', [cx, cTop - cH - 0.065, cz - 0.06 - 0.02 - 0.0005]);
    // (its mounts: a rubber mount on a bracket over the timing end, and a torque rod's bush low on the exhaust side; the
    // third is on the gearbox, which is not drawn)
    out.push(group('engine mount', [box('mount bracket', [0.05, 0.02, 0.07], [0, 0.01, 0], { item: 'bracket', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('mount rubber', { cyl: [0.035, 0.035] }, [0, 0.02 + 0.0005 + 0.0175, 0], { item: 'mount-rubber', mat: 'nr', color: 0x1a1a1a })], { item: 'engine-mount', at: [front + 0.036, deck + gasket + Hh + 0.0665, -0.08], joins: ['timing cover rim'], joint: 'mount', says: 'the timing end\'s: its rubber under the car\'s body rail (typical of a transverse engine)' }));
    out.push(group('engine mount', [box('mount bracket', [0.06, 0.04, 0.03], [0, 0, -0.015], { item: 'bracket', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('mount rubber', { cyl: [0.025, 0.03] }, [0, 0, -0.03 - 0.0005 - 0.015], { rot: [PI / 2, 0, 0], item: 'mount-rubber', mat: 'nr', color: 0x1a1a1a })], { item: 'engine-mount', at: [0, 0.035, -Wc / 2 - 0.0005], joins: ['crankcase wall'], joint: 'mount', says: 'a torque rod\'s bush, low behind (typical)' }));
    // (a shield of aluminised steel on its bracket's side toward the catalyst, as its rubber cannot take the heat at that
    // distance (typical: a pressed plate on the bracket))
    out.push(box('mount heat shield', [0.001, 0.07, 0.06], [0.04, 0.035, -Wc / 2 - 0.035], { item: 'heat-shield', mat: 'steel-low', color: 0xb8b8b0, finish: 'machined', says: 'aluminised steel, between the catalyst and the torque rod\'s rubber' }));
    // (a maker's: its exhaust let back to its intake through a liquid cooler and a valve on the plenum (EGR))
    if (fit.egr === 'cooled') {
      const ex = -len / 2 - 0.13, egY = plTop + 0.0175 + 0.0005, egx = pvx - 0.045, coolY = ty + 0.03;
      out.push(P('EGR pipe', { tube: { r: 0.008, wall: 0.0012, pts: [[ce[0] - 0.0205, ce[1] - 0.01, cz], [ex, ce[1] - 0.01, cz], [ex, coolY, cz], [ex, coolY, -0.0655]], bend: 0.02 } }, [0, 0, 0], { ...hotEx, item: 'egr-pipe', hot: 600, joins: ['front pipe'], says: 'about 600 °C into the cooler (an estimate)' }));
      out.push(group('EGR cooler', [P('cooler shell', { cyl: [0.018, 0.125] }, [0, 0, 0], { rot: [PI / 2, 0, 0], shell: 0.0012, item: 'egr-cooler', mat: 'stainless-304', color: 0x8a8a88 })], { item: 'egr-cooler', at: [ex, coolY, -0.003], hot: 110, says: 'coolant round tubes of exhaust: its skin about the coolant\'s heat, 110 °C (an estimate)' }));
      out.push(P('EGR pipe', { tube: { r: 0.008, wall: 0.0012, pts: [[ex, coolY, 0.0595], [ex, coolY, plZ], [egx - 0.06, coolY, plZ], [egx, coolY, plZ], [egx, egY + 0.0175 + 0.0005, plZ]], bend: 0.02 } }, [0, 0, 0], { ...hotEx, item: 'egr-pipe', hot: 200, says: 'about 200 °C past the cooler (an estimate)' }));
      out.push(group('EGR valve', [box('valve body', [0.04, 0.035, 0.04], [0, 0, 0], { item: 'egr-valve', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', says: 'a stepper opening it as the ECU asks' })], { item: 'egr-valve', at: [egx, egY, plZ], joins: ['intake plenum'] }));
      conns.push(plug('EGR valve connector', [egx + 0.02 + 0.0065, egY, plZ])); lead('EGR valve lead', [[egx + 0.033, egY, plZ], [egx + 0.033, ty, plZ], [egx + 0.033, ty, tz]]);
    }
    // (a maker's: its electric water pump's plug on its motor's top, its lead up the front to the trunk's end)
    if (fit.waterPump === 'electric') { const px = bx - 0.01 + 0.04, py = wpAt[1] + 0.034 + 0.0065; conns.push(plug('water pump connector', [px, py, 0])); lead('water pump lead', [[px, py + 0.006, 0], [px, py + 0.03, -0.03], [px, ctop + 0.042, -0.03], [0.19, ctop + 0.042, -0.03], [0.19, ctop + 0.042, tz]]); }
    // (a maker's: its intake cam phased by an electric motor on the timing cover, in front of the intake cam)
    if (fit.vvt === 'electric-intake') {
      const vz = -xs * 0.21 * B, vx = tdx + 0.035 + 0.0035;
      out.push(group('intake cam phaser motor (VVT-iE)', [P('motor can', { cyl: [0.03, 0.05] }, [0.025, 0, 0], { rot: CYL_X, shell: 0.0015, item: 'motor-can', mat: 'al-a380', color: 0x2a2a2a, finish: 'paint' }), ringX('stator', 0.008, 0.026, 0.03, [0.025, 0, 0], { item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60 })], { item: 'vvt-motor', at: [vx, camY, vz], joins: ['timing cover face'], says: 'turns the intake cam against its sprocket (VVT-iE: of the series)' }));
      conns.push(plug('VVT motor connector', [vx + 0.025, camY + 0.03 + 0.0065, vz])); lead('VVT motor lead', [[vx + 0.025, camY + 0.043, vz], [vx + 0.025, ctop + 0.042, vz], [0.19, ctop + 0.042, tz]]);
    }
    // (a maker's: a high-pressure pump on the cam cover, its plunger down onto its lobe on the exhaust cam (D-4S))
    if (fit.injection === 'port+direct') {
      const pl = pumpLobeOf(s, d), pz = xs * 0.21 * B, py = camY + pl.r + pl.lift + 0.0005;
      out.push(group('high-pressure fuel pump', [P('pump body', { cyl: [0.018, 0.045] }, [0, ctop + 0.0005 - py + 0.0225, 0], { item: 'hp-pump-body', mat: 'stainless-304', color: 0xb8bcc0, finish: 'machined' }), P('pump plunger', { cyl: [0.004, ctop + 0.0005 - py] }, [0, (ctop + 0.0005 - py) / 2, 0], { item: 'pump-plunger', mat: 'steel-alloy', color: 0xc8ccd2, finish: 'ground', passes: ['cam cover top'] })], { item: 'hp-fuel-pump', at: [pl.x, py, pz], joins: ['cam cover top'], says: 'raises its fuel to the direct injectors\' pressure, off its lobe on the exhaust cam (of the series); the direct injectors and their rail are not drawn yet' }));
      conns.push(plug('fuel pump connector', [pl.x, ctop + 0.0455 + 0.0065, pz])); lead('fuel pump lead', [[pl.x, ctop + 0.0585, pz], [pl.x, ctop + 0.0585, tz], [pl.x + 0.01, ty, tz]]);
    }
    out.push(group('engine wiring harness', [...leads, ...conns], { item: 'engine-harness', says: 'a loom along the intake side and down the back, a plug on each sensor and actuator, to the car\'s harness and its ECU (not drawn) at its front end (HP Academy\'s layout: three wires a sensor)' }));
  }
  const engine = group(s.name ?? `${s.fuel} engine`, out, { item: 'engine-ice', says: s.says ?? '' });
  const b = boundsOfAll(engine);
  const size = b.getSize(new THREE.Vector3()), mid = b.getCenter(new THREE.Vector3()), count = (p: Part): number => (p.shape ? 1 : 0) + (p.parts ?? []).reduce((a, q) => a + count(q), 0);
  const res: EngineBuilt = { engine, kg: massOf(engine), size: [size.x, size.y, size.z], mid: [mid.x, mid.y, mid.z], pieces: count(engine), parts: { block, crank, piston, rod, head: heads[0]! } };
  if (mine) built.set(key, res); return res;
}

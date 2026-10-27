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
import { chainPath, chainRun, coil, mouldedChip, ringClip, toothed, turned } from './makers';
import { boundsOfAll, partOf } from './assembly';
import { use } from './components';
import { massOf } from './mass';
import { CHAINS } from './families';
import * as THREE from 'three';

const PI = Math.PI;
export interface EngineSpec {
  name?: string; cyl: number; /** m */ bore: number; /** m */ stroke: number; layout?: 'inline' | 'vee'; /** degrees between its banks */ vee?: number;
  fuel: 'petrol' | 'diesel'; block: 'al' | 'iron'; cooling?: 'liquid' | 'air'; cams?: 'dohc' | 'sohc' | 'ohv'; valves?: 2 | 4; turbo?: boolean;
  starter?: 'electric' | 'recoil'; /** how its fuel is metered (injection, unless it is a single or air-cooled) */ induction?: 'injection' | 'carburettor'; /** its rod's length, centre to centre, m (1.6 strokes if not said, typical) */ rod?: number; says?: string;
}
const P = (name: string, shape: Part['shape'], at: V3, more: Partial<Part> = {}): Part => ({ name, shape, at, ...more });
const box = (name: string, s: V3, at: V3, more: Partial<Part> = {}): Part => P(name, { box: s }, at, more);
const group = (name: string, parts: Part[], more: Partial<Part> = {}): Part => ({ name, at: [0, 0, 0], parts, ...more });
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
const bolt = (thread: string, L: number, at: V3, rot: V3 = [0, 0, 0], name?: string): Part => use(`bolt ${thread}x${Math.max(10, Math.min(300, Math.round((L * 1000) / 5) * 5))}`, at, { rot, ...(name ? { name } : {}) });
const threadFor = (B: number): string => (B < 0.06 ? 'M6' : B < 0.085 ? 'M8' : B < 0.11 ? 'M10' : B < 0.13 ? 'M12' : 'M16');
const around = (wheels: [number, number, number][]): [number, number][] => chainPath(wheels).map(([u, v]) => [u, v] as [number, number]);

/** Its sizes, all from its bore and stroke (each proportion typical of engines of its kind, not one maker's). */
export function engineDims(s: EngineSpec) {
  const B = s.bore, S = s.stroke, r = S / 2, n = s.cyl, diesel = s.fuel === 'diesel', air = s.cooling === 'air', vee = s.layout === 'vee';
  const L = s.rod ?? 1.6 * S, CH = diesel ? 0.62 * B : 0.33 * B, skirt = diesel ? 0.55 * B : 0.42 * B;
  const pinD = diesel ? 0.4 * B : 0.25 * B, rp = diesel ? 0.32 * B : 0.27 * B, rm = diesel ? 0.38 * B : 0.3 * B, rodW = diesel ? 0.3 * B : 0.26 * B;
  const shellT = Math.max(0.0015, 0.022 * B), wm = diesel ? 0.3 * B : 0.24 * B;
  const pitch = vee ? 0 : (air ? 1.4 : diesel ? 1.18 : 1.12) * B + 0.005;
  const wallB = (air ? 0.05 : 0.06) * B, jacket = air ? 0 : 0.08 * B, outer = (s.block === 'iron' ? 0.04 : 0.045) * B, Wb = B + 2 * (wallB + jacket + outer);
  const deck = r + L + CH, yb0 = L - r - skirt, swing = r + (diesel ? 0.62 : 0.55) * B, wc = (s.block === 'iron' ? 0.06 : 0.05) * B, Wc = 2 * (swing + 0.01) + 2 * wc;
  // (a vee twin's two rods side by side on one pin, a main journal each side of the pin's webs)
  const we = 0.12 * B, veeMain = rodW + 0.002 + 0.12 * B + wm / 2, len = vee ? 2 * (veeMain + wm / 2) + 2 * we : n * pitch + 2 * we, ysk = -(diesel ? 0.45 : 0.15) * B;
  const cams = s.cams ?? (diesel ? 'dohc' : 'dohc'), valves = s.valves ?? 4, Hh = (cams === 'dohc' ? (diesel ? 1.1 : 1.45) : cams === 'sohc' ? 1.2 : 0.95) * B, td = (diesel ? 0.16 : 0.11) * B, gasket = 0.0012;
  // (where its cams turn: over its buckets (dohc) or over its rockers (sohc), from its valve train's heights below)
  const tip = deck + gasket + td + 0.46 * B + 0.06 * B + 0.006, camY = cams === 'dohc' ? tip + 0.004 + 0.17 * B : tip + 0.12 * B + 0.1 * B + 0.17 * B;
  return { tip, camY, veeMain, B, S, r, n, L, CH, skirt, pinD, rp, rm, rodW, shellT, wm, pitch, wallB, jacket, outer, Wb, deck, yb0, swing, wc, Wc, we, len, ysk, cams, valves, Hh, td, gasket, diesel, air, vee };
}
type Dims = ReturnType<typeof engineDims>;
/** Where each cylinder is: along the crank (x), its bank's lean about x (radians), its crank pin's angle. */
function cylinders(s: EngineSpec, d: Dims): { x: number; lean: number; phase: number }[] {
  const n = d.n;
  if (d.vee) { const h = ((s.vee ?? 90) * PI) / 360; return Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * (d.rodW + 0.004), lean: i % 2 ? -h : h, phase: h })); }
  // (its firing order's crank: a four's pins at 0, 180, 180, 0°; a six's at 0, 240, 120, 120, 240, 0°; a three's 120° apart)
  const ph: Record<number, number[]> = { 1: [0], 2: [0, 180], 3: [0, 240, 120], 4: [0, 180, 180, 0], 5: [0, 144, 288, 72, 216], 6: [0, 240, 120, 120, 240, 0] };
  const deg = ph[n] ?? Array.from({ length: n }, (_, i) => (i * 720) / n);
  return Array.from({ length: n }, (_, i) => ({ x: (i - (n - 1) / 2) * d.pitch, lean: 0, phase: (deg[i]! * PI) / 180 }));
}

// ---- the moving parts ---------------------------------------------------------------------------------------------------
/** A piston with its rings, pin and the pin's clips; its pin's middle at its origin, along x; its crown up +y. */
export function pistonAssembly(s: EngineSpec, d = engineDims(s)): Part {
  const { B, CH, skirt, pinD } = d, ro = B / 2 - 0.0002, wt = (d.diesel ? 0.075 : 0.06) * B, crown = (d.diesel ? 0.2 : 0.1) * B, ri = ro - wt, mat = d.diesel ? 'steel-alloy' : 'al-a380';
  const boss = (sd: number) => ringX('pin boss', pinD / 2, pinD * 0.95, ri - d.rodW * 0.45, [sd * (d.rodW * 0.45 + (ri - d.rodW * 0.45) / 2), 0, 0], { mat, color: 0xb8bcc0, finish: 'cast', one: true });
  const piston = group('piston', [
    P('piston crown and skirt', { lathe: [[ri, -skirt], [ro, -skirt], [ro, CH], [0, CH], [0, CH - crown], [ri, CH - crown], [ri, -skirt]] }, [0, 0, 0], { mat, color: 0xb8bcc0, finish: 'cast', one: true, says: `${(B * 1000).toFixed(1)} mm across, ${((CH + skirt) * 1000).toFixed(0)} mm tall, its crown ${(crown * 1000).toFixed(0)} mm thick` }),
    boss(-1), boss(1)], { item: 'piston', mat, says: d.diesel ? 'a forged steel piston, its bowl in its crown (typical of a heavy diesel\'s)' : 'a cast aluminium piston' });
  const rings = [[0.06, 0.012, 'top ring'], [0.11, 0.013, 'second ring'], [0.16, 0.025, 'oil ring']].map(([y, h, nm]) => P(nm as string, { lathe: [[ro - 0.045 * B, -(h as number) * B / 2], [ro + 0.0001, -(h as number) * B / 2], [ro + 0.0001, (h as number) * B / 2], [ro - 0.045 * B, (h as number) * B / 2], [ro - 0.045 * B, -(h as number) * B / 2]] }, [0, CH - (y as number) * B, 0], { item: 'piston-ring', mat: 'cast-iron', color: 0x4a4c50, finish: 'machined' }));
  const pinL = 2 * ri - 0.002;
  const pin = turned({ name: 'wrist pin', steps: [[pinD / 2, pinL]], bore: pinD * 0.28, mat: 'steel-alloy', color: 0xc8ccd2, item: 'wrist-pin', at: [pinL / 2, 0, 0], rot: ALONG_X, finish: 'ground' });
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
  const bolts = [-1, 1].map((sd) => bolt(t, bL, [0, -0.09 * B, sd * (bigO + 0.03 * B)], [PI, 0, 0], 'rod bolt'));
  return group('connecting rod and cap', [rod, cap, shell(true), shell(false), ...bolts], { item: 'con-rod-assembly' });
}
/** Its crankshaft, forged in one: a main journal between each pair of cylinders and at each end, a pin for each throw
 *  at its angle with a web each side and a counterweight opposite, its nose at the front and its flange at the back. */
export function crankshaft(s: EngineSpec, d = engineDims(s)): Part {
  const { B, r, rp, rm, wm, rodW } = d, cyl = cylinders(s, d), forged = { mat: 'steel-alloy', color: 0x8a8c90, finish: 'forged', one: true }, parts: Part[] = [];
  const throws = d.vee ? [{ x: 0, phase: cyl[0]!.phase, w: 2 * rodW + 0.004 }] : cyl.map((c) => ({ x: c.x, phase: c.phase, w: rodW + 0.003 }));
  const mains = d.vee ? [-d.veeMain, d.veeMain] : Array.from({ length: d.n + 1 }, (_, k) => (k - d.n / 2) * d.pitch);
  for (const x of mains) parts.push(P('main journal', { cyl: [rm, wm] }, [x, 0, 0], { ...forged, rot: CYL_X, finish: 'ground' }));
  for (const t of throws) {
    const c = Math.cos(t.phase), sn = Math.sin(t.phase), webT = d.vee ? 0.12 * B : Math.max(0.08 * B, (d.pitch - wm - t.w) / 2);
    parts.push(P('crank pin', { cyl: [rp, t.w] }, [t.x, r * c, r * sn], { ...forged, rot: CYL_X, finish: 'ground' }));
    for (const sd of [-1, 1]) {
      const xw = t.x + sd * (t.w / 2 + webT / 2), span = r + rp + rm, mid = (r + rp - rm) / 2, cwH = 0.42 * B, cwAt = -(rm + cwH / 2 - 0.02 * B);
      parts.push(box('web', [webT, span, 2.1 * Math.max(rp, rm)], [xw, mid * c, mid * sn], { ...forged, rot: [t.phase, 0, 0] }));
      parts.push(box('counterweight', [webT, cwH, 2.6 * rm], [xw, cwAt * c, cwAt * sn], { ...forged, rot: [t.phase, 0, 0], fill: 0.8, says: 'its sector (about 0.8 of the box round it)' }));
    }
  }
  const front = Math.max(...mains) + wm / 2, back = Math.min(...mains) - wm / 2;
  parts.push(P('crank nose', { cyl: [0.2 * B, 0.7 * B] }, [front + 0.35 * B, 0, 0], { ...forged, rot: CYL_X }));
  parts.push(P('crank flange', { cyl: [0.5 * B, 0.12 * B] }, [back - 0.06 * B, 0, 0], { ...forged, rot: CYL_X }));
  return group('crankshaft', parts, { item: 'crankshaft', mat: 'steel-alloy', says: `forged in one, ${throws.length} throw${throws.length > 1 ? 's' : ''} of ${(r * 1000).toFixed(1)} mm` });
}

// ---- the castings and what is fitted in them ----------------------------------------------------------------------------
/** Its block: the casting (its barrel round its bores and their water jacket, its crankcase's walls, its bulkheads with
 *  their main saddles), its liners, its main caps with their bolts, and its main bearing shells. */
export function cylinderBlock(s: EngineSpec, d = engineDims(s)): Part {
  const { B, n, deck, yb0, Wb, Wc, wc, we, len, ysk, rm, shellT, wm } = d, cyl = cylinders(s, d), iron = s.block === 'iron';
  const cast = { mat: iron ? 'cast-iron' : 'al-a380', color: iron ? 0x4a4c4e : 0x8c8e90, finish: 'cast', one: true }, parts: Part[] = [];
  const liner = iron && !d.diesel ? 0 : (d.diesel ? 0.05 : 0.025) * B, bore = B / 2 + liner, H = deck - yb0;
  if (!d.vee && !d.air) {
    // (its jacket: a ring of coolant round each bore through most of the barrel's height, cored out of the casting)
    const jv = n * PI * ((B / 2 + liner + d.wallB + d.jacket) ** 2 - (B / 2 + liner + d.wallB) ** 2) * H * 0.85, holes = n * PI * bore * bore * H, V = len * H * Wb;
    parts.push(box('barrel', [len, H, Wb], [0, (deck + yb0) / 2, 0], { ...cast, fill: 1 - jv / (V - holes), cuts: cyl.map((c) => ({ r: bore, depth: H, at: [c.x, H / 2, 0] as V3, dir: [0, -1, 0] as V3 })), says: 'its bores, and its water jacket cored round them (its share of the casting less)' }));
  } else for (const c of cyl) {
    // (a barrel to each cylinder, finned where it is cooled by air (a fin about every 9 mm, typical), leaning with its bank)
    const ro = B / 2 + liner + d.wallB + d.outer, fins: [number, number][] = [[bore, 0], [ro, 0]];
    if (d.air) for (let y = 0.004; y < H - 0.004; y += 0.009) fins.push([ro, y], [ro + 0.28 * B, y + 0.001], [ro + 0.28 * B, y + 0.0035], [ro, y + 0.0045]);
    fins.push([ro, H], [bore, H], [bore, 0]);
    parts.push(P('barrel', { lathe: fins }, [c.x, yb0 * Math.cos(c.lean), yb0 * Math.sin(c.lean)], { ...cast, rot: [c.lean, 0, 0], says: d.air ? 'its barrel, finned to shed its heat to the air' : 'its barrel' }));
  }
  // (its crankcase: two side walls, a floor plate at the barrel's foot, its ends, and a bulkhead at each main)
  const Hc = yb0 - ysk, mains = d.vee ? [-d.veeMain, d.veeMain] : Array.from({ length: n + 1 }, (_, k) => (k - n / 2) * d.pitch);
  for (const sd of [-1, 1]) parts.push(box('crankcase wall', [len, Hc, wc], [0, (yb0 + ysk) / 2, sd * (Wc / 2 - wc / 2)], cast));
  parts.push(box('crankcase top', [len, wc, Wc], [0, yb0 - wc / 2, 0], { ...cast, cuts: d.vee ? [] : cyl.map((c) => ({ r: bore, depth: wc, at: [c.x, wc / 2, 0] as V3, dir: [0, -1, 0] as V3 })) }));
  for (const sd of [-1, 1]) parts.push(box('crankcase end', [we, Hc, Wc - 2 * wc], [sd * (len / 2 - we / 2), (yb0 + ysk) / 2, 0], cast));
  const bw = wm + 0.01, bh = yb0 - wc, saddle = rm + shellT, bV = bw * bh * (Wc - 2 * wc), full = PI * saddle * saddle * bw;
  for (const x of mains) parts.push(box('bulkhead', [bw, bh, Wc - 2 * wc], [x, bh / 2, 0], { ...cast, fill: (bV - full / 2) / (bV - full), cuts: [{ r: saddle, depth: bw, at: [bw / 2, -bh / 2, 0], dir: [-1, 0, 0] }], says: 'its main saddle bored in it' }));
  const casting = group('block casting', parts, { item: 'block-casting', mat: cast.mat, says: `cast ${iron ? 'iron' : 'aluminium'} round its cores, ${(len * 1000).toFixed(0)} × ${((deck - ysk) * 1000).toFixed(0)} × ${(Wc * 1000).toFixed(0)} mm` });
  const out: Part[] = [casting];
  if (liner) for (const c of cyl) out.push(P('cylinder liner', { lathe: [[B / 2, 0], [bore, 0], [bore, H], [B / 2, H], [B / 2, 0]] }, [c.x, yb0 * Math.cos(c.lean), yb0 * Math.sin(c.lean)], { rot: [c.lean, 0, 0], item: 'cylinder-liner', mat: 'cast-iron', color: 0x5a5c60, finish: 'machined', says: d.diesel ? 'a wet liner, its coolant against it' : 'cast in' }));
  // (its main caps: each under its bulkhead, its saddle's other half, bolted up into the bulkhead by two bolts)
  const capH = saddle + 0.12 * B, capW = 2 * (rm + 0.22 * B), cV = bw * capH * capW, t = threadFor(B);
  for (const x of mains) {
    out.push(box('main cap', [bw, capH, capW], [x, -capH / 2, 0], { item: 'main-cap', mat: 'cast-iron', color: 0x5a5c60, finish: 'cast', fill: (cV - full / 2) / (cV - full), cuts: [{ r: saddle, depth: bw, at: [bw / 2, capH / 2, 0], dir: [-1, 0, 0] }] }));
    for (const sd of [-1, 1]) out.push(bolt(t, capH + 0.35 * B, [x, -capH, sd * (rm + 0.12 * B)], [PI, 0, 0], 'main cap bolt'));
    for (const up of [true, false]) out.push(halfRing(`main bearing shell (${up ? 'upper' : 'lower'})`, rm, saddle, wm * 0.9, [x, 0, 0], up, { item: 'main-bearing-shell', mat: 'steel-low', color: 0xb89a6a, finish: 'machined' }));
  }
  return group('engine block', out, { item: 'engine-block' });
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
/** Its cylinder head: the casting (its deck with its chambers, its sides with its ports, its ends, its cam saddles, its
 *  ports and plug towers cored through it), its valve train, its cams and their caps, its bolts; in its bank's frame,
 *  its deck's foot at the block's deck. */
export function cylinderHead(s: EngineSpec, d = engineDims(s), bank?: number): Part {
  const { B, deck, Wb, Hh, td, gasket, valves, cams, len, we } = d, cylAll = cylinders(s, d), cyl = bank === undefined ? cylAll : [cylAll[bank]!];
  const iron = d.diesel, cast = { mat: iron ? 'cast-iron' : 'al-a380', color: iron ? 0x50525a : 0x9a9c9e, finish: 'cast', one: true }, parts: Part[] = [];
  const y0 = deck + gasket, Lh = bank === undefined ? len - 0.4 * we : d.pitch || 1.5 * B, x0 = bank === undefined ? 0 : cyl[0]!.x, Wh = Wb, tw = 0.05 * B, top = y0 + Hh;
  // (its valves: four to a cylinder, two intake on the +z side and two exhaust on the -z, or two in a row; their heads'
  // sizes a share of the bore, typical of pent-roof and of wedge chambers)
  const vs = cyl.flatMap((c) => valves === 4 ? [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([a, b]) => ({ x: c.x + a! * 0.21 * B, z: b! * 0.2 * B, ex: b! < 0, r: (b! > 0 ? 0.18 : 0.155) * B, c })) : [{ x: c.x - 0.22 * B, z: cams === 'ohv' ? 0 : 0.18 * B, ex: false, r: 0.22 * B, c }, { x: c.x + 0.22 * B, z: cams === 'ohv' ? 0 : -0.18 * B, ex: true, r: 0.19 * B, c }]);
  const portY = y0 + td + 0.3 * Hh;
  parts.push(box('head deck', [Lh, td, Wh], [x0, y0 + td / 2, 0], { ...cast, cuts: [...vs.map((v) => ({ r: v.r * 1.02, depth: td, at: [v.x - x0, td / 2, v.z] as V3, dir: [0, -1, 0] as V3 })), ...cyl.map((c) => ({ r: 0.06 * B, depth: td, at: [c.x - x0, td / 2, 0] as V3, dir: [0, -1, 0] as V3 }))], says: 'its combustion chambers and valve seats machined in it' }));
  for (const sd of [-1, 1]) parts.push(box('head side', [Lh, Hh - td, tw], [x0, y0 + td + (Hh - td) / 2, sd * (Wh / 2 - tw / 2)], { ...cast, cuts: cyl.map((c) => ({ r: 0.16 * B, depth: tw, at: [c.x - x0, portY - (y0 + td + (Hh - td) / 2), sd * tw / 2] as V3, dir: [0, 0, -sd] as V3 })) }));
  for (const sd of [-1, 1]) parts.push(box('head end', [tw, Hh - td, Wh - 2 * tw], [x0 + sd * (Lh / 2 - tw / 2), y0 + td + (Hh - td) / 2, 0], cast));
  // (a port from each valve's seat out through its side, cored in the casting: a bent tube of it)
  for (const c of cyl) for (const sd of [-1, 1]) parts.push(P(sd > 0 ? 'intake port' : 'exhaust port', { tube: { r: 0.15 * B, wall: 0.006, pts: [[c.x, y0 + td, sd * 0.2 * B], [c.x, portY, sd * 0.32 * B], [c.x, portY, sd * (Wh / 2 - tw)]] } }, [0, 0, 0], cast));
  // (a tower down the middle of each cylinder for its plug or its injector)
  for (const c of cyl) parts.push(P(d.diesel ? 'injector bore' : 'plug tower', { lathe: [[0.06 * B, 0], [0.09 * B, 0], [0.09 * B, Hh - td], [0.06 * B, Hh - td], [0.06 * B, 0]] }, [c.x, y0 + td, 0], cast));
  const casting = group('head casting', parts, { item: 'head-casting', mat: cast.mat, says: `cast ${iron ? 'iron' : 'aluminium'} round its port and jacket cores, ${(Hh * 1000).toFixed(0)} mm tall` });
  const out: Part[] = [casting];
  // (its valve train: each valve's stem through its guide, its spring on the head's floor round the guide, its retainer
  // and keepers on top; a spring of wire about 0.04 bore on 0.3 bore across, about half a bore long, typical)
  const stem = Math.max(0.0025, 0.035 * B), seat = y0 + td, sp = { d: 0.04 * B, D: 0.3 * B, L: 0.46 * B }, retT = 0.06 * B, tip = d.tip;
  for (const v of vs) {
    const head = 0.08 * v.r * 2, vL = tip - y0;
    out.push(turned({ name: v.ex ? 'exhaust valve' : 'intake valve', steps: [[v.r, head], [v.r * 0.45, 0.6 * v.r], [stem, vL - head - 0.6 * v.r]], mat: v.ex ? 'stainless-304' : 'steel-alloy', color: v.ex ? 0xa8a6a0 : 0xc8ccd2, item: v.ex ? 'valve-exhaust' : 'valve-intake', at: [v.x, y0, v.z], finish: 'ground' }));
    out.push(P('valve guide', { lathe: [[stem, 0], [stem + 0.003, 0], [stem + 0.003, 0.3 * Hh], [stem, 0.3 * Hh], [stem, 0]] }, [v.x, seat - 0.15 * Hh, v.z], { item: 'valve-guide', mat: 'bronze', color: 0xa07a50, finish: 'machined' }));
    out.push(P('valve stem seal', { lathe: [[stem, 0], [stem + 0.0045, 0], [stem + 0.0045, 0.008], [stem, 0.008], [stem, 0]] }, [v.x, seat + 0.15 * Hh - 0.002, v.z], { item: 'valve-stem-seal', mat: 'fkm', color: 0x5a3020, finish: 'matte' }));
    out.push({ ...coil({ name: 'valve spring', d: sp.d, D: sp.D, L: sp.L, n: 5, item: 'valve-spring' }), at: [v.x, seat, v.z] });
    out.push(P('valve spring retainer', { lathe: [[stem + 0.001, 0], [sp.D / 2 + sp.d, 0], [sp.D / 2 + sp.d, retT * 0.4], [stem + 0.004, retT], [stem + 0.001, retT], [stem + 0.001, 0]] }, [v.x, seat + sp.L, v.z], { item: 'valve-retainer', mat: 'steel-alloy', color: 0x8a8c90, finish: 'machined' }));
    for (const sd of [-1, 1]) out.push(box('valve keeper', [0.0025, retT, 0.004], [v.x + sd * (stem + 0.0013), seat + sp.L + retT / 2, v.z], { item: 'valve-keeper', mat: 'steel-alloy', color: 0x6a6c70 }));
  }
  // (its cams over its valves: two on a head with four valves a cylinder (dohc, on bucket tappets), one in the middle
  // with rockers (sohc), or one down in the block with lifters, pushrods and rockers (ohv))
  const baseR = 0.17 * B, lift = 0.11 * B, camT = threadFor(B * 0.7);
  const camAt = (zc: number, yc: number, which: typeof vs, name: string): void => {
    const cp: Part[] = [P('cam tube', { cyl: [0.12 * B, Lh] }, [x0, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true })];
    which.forEach((v, i) => { const a = (i * 2.4) % (2 * PI); cp.push(P('cam lobe', { cyl: [baseR, 0.17 * B] }, [v.x, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }), box('cam lobe nose', [0.17 * B, baseR + lift, 1.4 * baseR], [v.x, yc + ((baseR + lift) / 2) * Math.cos(a), zc + ((baseR + lift) / 2) * Math.sin(a)], { rot: [a, 0, 0], mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true, fill: 0.7 })); });
    const journals = cyl.length > 1 ? Array.from({ length: cyl.length + 1 }, (_, k) => x0 + (k - cyl.length / 2) * d.pitch) : [x0 - Lh / 2 + 0.1 * B, x0 + Lh / 2 - 0.1 * B];
    for (const x of journals) cp.push(P('cam journal', { cyl: [0.14 * B, 0.12 * B] }, [x, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }));
    out.push(group(name, cp, { item: 'camshaft', mat: 'cast-iron', says: `${which.length} lobes, about ${(lift * 1000).toFixed(1)} mm of lift (typical)` }));
    if (yc > y0) for (const x of journals) { out.push(box('cam cap', [0.12 * B, 0.18 * B, 0.36 * B], [x, yc + 0.09 * B, zc], { item: 'cam-cap', mat: cast.mat, color: cast.color, finish: 'cast', fill: 0.75 })); for (const sd of [-1, 1]) out.push(bolt(camT, 0.3 * B, [x, yc + 0.18 * B, zc + sd * 0.14 * B], [0, 0, 0], 'cam cap bolt')); }
  };
  if (cams === 'dohc') {
    const tapH = 0.3 * B, yb = tip + 0.004, yc = d.camY;
    for (const v of vs) out.push(P('bucket tappet', { lathe: [[0.17 * B, yb - tapH], [0.19 * B, yb - tapH], [0.19 * B, yb], [0, yb], [0, yb - 0.004], [0.17 * B, yb - 0.004], [0.17 * B, yb - tapH]] }, [v.x, 0, v.z], { item: 'bucket-tappet', mat: 'steel-alloy', color: 0x8a8c90, finish: 'ground' }));
    camAt(0.2 * B, yc, vs.filter((v) => !v.ex), 'intake camshaft'); camAt(-0.2 * B, yc, vs.filter((v) => v.ex), 'exhaust camshaft');
  } else {
    // (rockers on a shaft along the head over the valves, each pushing its valve's tip)
    const ys = tip + 0.12 * B, zs = cams === 'ohv' ? 0.22 * B : 0;
    out.push(turned({ name: 'rocker shaft', steps: [[0.09 * B, Lh - 0.2 * B]], bore: 0.05 * B, mat: 'steel-alloy', item: 'rocker-shaft', at: [x0 + (Lh - 0.2 * B) / 2, ys, zs], rot: ALONG_X, finish: 'ground' }));
    for (const v of vs) { const dz = v.z - zs, armL = Math.hypot(dz, 0.12 * B) + 0.1 * B; out.push(box('rocker arm', [0.15 * B, 0.1 * B, armL], [v.x, ys - 0.03 * B, zs + dz / 2 + (cams === 'ohv' ? -0.05 * B : 0)], { item: 'rocker-arm', mat: 'steel-low', color: 0x6a6c70, finish: 'cast', fill: 0.7 })); }
    if (cams === 'sohc') camAt(0, d.camY, vs, 'camshaft');
  }
  // (its head bolts: down through its deck into the block, beside each main)
  const hb = threadFor(B), mains = cyl.length > 1 ? Array.from({ length: cyl.length + 1 }, (_, k) => x0 + (k - cyl.length / 2) * d.pitch) : [x0 - Lh / 2 + 0.08 * B, x0 + Lh / 2 - 0.08 * B];
  for (const x of mains) for (const sd of [-1, 1]) out.push(bolt(hb, td + 0.75 * B, [x, y0 + td, sd * (Wh / 2 - tw - 0.06 * B)], [0, 0, 0], 'head bolt'));
  // (its plugs down its towers, a coil on each; or its injectors)
  for (const c of cyl) {
    if (!d.diesel) { out.push({ ...sparkPlug(B), at: [c.x, y0, 0] });
      out.push(group('ignition coil', [P('coil housing', { cyl: [0.12 * B, top - (y0 + 0.08) + 0.06] }, [0, (top - (y0 + 0.08) + 0.06) / 2, 0], { item: 'coil-housing', mat: 'pbt', color: 0x1a1a1a, finish: 'texture' }),
        P('primary winding', { cyl: [0.05 * B, 0.3 * B] }, [0, 0.35 * B, 0], { item: 'winding', mat: 'copper', color: 0xb87333 }), P('secondary winding', { lathe: [[0.055 * B, 0], [0.09 * B, 0], [0.09 * B, 0.3 * B], [0.055 * B, 0.3 * B], [0.055 * B, 0]] }, [0, 0.2 * B, 0], { item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.6 }),
        box('coil core', [0.04 * B, 0.36 * B, 0.04 * B], [0, 0.35 * B, 0], { item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60 }),
        P('coil boot', { lathe: [[0.004, 0], [0.012, 0], [0.012, 0.04], [0.004, 0.04], [0.004, 0]] }, [0, -0.04, 0], { item: 'coil-boot', mat: 'silicone', color: 0x2a2a2a })], { item: 'ignition-coil', at: [c.x, y0 + 0.08, 0] }));
    } else out.push(group('fuel injector', [turned({ name: 'injector body', steps: [[0.07 * B, 0.12], [0.1 * B, 0.08]], mat: 'stainless-304', item: 'injector-body' }), turned({ name: 'injector needle', steps: [[0.012 * B, 0.15]], mat: 'steel-alloy', item: 'injector-needle', at: [0, 0.01, 0] }), P('injector coil', { cyl: [0.08 * B, 0.04] }, [0, 0.16, 0], { item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.6 })], { item: 'fuel-injector', at: [c.x, y0, 0] }));
  }
  return group(bank === undefined ? 'cylinder head' : `cylinder head ${bank + 1}`, out, { item: 'cylinder-head' });
}

/** A rectifier diode as it is made (a 1N4007's DO-41 package): its silicon die between two leads, moulded in epoxy. */
export const rectifierDiode = (at: V3): Part => group('rectifier diode', [
  P('diode body', { cyl: [0.00135, 0.0052] }, [0, 0, 0], { rot: CYL_X, mat: 'epoxy', color: 0x1a1a1a }),
  box('diode die', [0.0005, 0.001, 0.001], [0, 0, 0], { item: 'si-die', mat: 'silicon', color: 0x3a3a4a }),
  ...[-1, 1].map((sd) => P('diode lead', { cyl: [0.0004, 0.01] }, [sd * 0.0076, 0, 0], { rot: CYL_X, item: 'lead-wire', mat: 'copper', color: 0xc8ccd2 }))], { item: 'diode-1n4007', at });
/** A small engine's float carburettor: its cast body round its venturi, its throttle plate, its float bowl and float on
 *  its needle, its main jet; its throat along +z from `at`. */
export const carburettor = (B: number, at: V3, rot: V3 = [0, 0, 0]): Part => group('carburettor', [
  P('carburettor body', { lathe: [[0.14 * B, 0], [0.24 * B, 0], [0.24 * B, 0.6 * B], [0.14 * B, 0.6 * B], [0.14 * B, 0]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], item: 'carb-body', mat: 'zamak', color: 0xb0b2b0, finish: 'cast' }),
  P('throttle plate', { cyl: [0.135 * B, 0.001] }, [0, 0, 0.45 * B], { rot: [PI / 2 + 0.3, 0, 0], item: 'throttle-plate', mat: 'brass', color: 0xc8a050 }),
  P('float bowl', { cyl: [0.22 * B, 0.3 * B] }, [0, -0.36 * B, 0.3 * B], { shell: 0.0012, item: 'float-bowl', mat: 'zamak', color: 0xb0b2b0, finish: 'cast' }),
  P('float', { cyl: [0.16 * B, 0.12 * B] }, [0, -0.36 * B, 0.3 * B], { item: 'carb-float', mat: 'nylon', color: 0x2a2a2a, fill: 0.3, says: 'hollow' }),
  P('main jet', { cyl: [0.02 * B, 0.08 * B] }, [0, -0.2 * B, 0.3 * B], { item: 'main-jet', mat: 'brass', color: 0xc8a050 })], { item: 'carburettor', at, rot });

// ---- the engine --------------------------------------------------------------------------------------------------------
export interface EngineBuilt { engine: Part; kg: number; size: V3; mid: V3; pieces: number; parts: Record<string, Part> }
const built = new Map<string, EngineBuilt>();
/** The whole engine, every piece of it, in its own frame (above); its mass and its size what its parts come to. Made once
 *  for each spec, and shared. */
export function engineBuilt(s: EngineSpec): EngineBuilt {
  const key = JSON.stringify(s), was = built.get(key); if (was) return was;
  const d = engineDims(s), { B, r, deck, Wb, Wc, len, ysk, Hh, gasket, td, swing } = d, cyl = cylinders(s, d), out: Part[] = [];
  const block = cylinderBlock(s, d), crank = crankshaft(s, d), piston = pistonAssembly(s, d), rod = conRod(s, d);
  out.push(block, crank);
  // (each piston and rod where its crank's pin puts them, in its bank)
  const moving: Part[] = [];
  cyl.forEach((c, i) => {
    const a = c.phase - c.lean, yp = r * Math.cos(a), zp = r * Math.sin(a), yw = yp + Math.sqrt(d.L * d.L - zp * zp), g = Math.atan2(-zp, yw - yp);
    const off: V3 = [c.x, 0, 0];
    moving.push(group(`cylinder ${i + 1}`, [{ ...piston, at: [0, yw, 0], name: `piston ${i + 1}` }, { ...rod, at: [0, yp, zp], rot: [g, 0, 0], name: `connecting rod ${i + 1}` }], { at: off, rot: [c.lean, 0, 0] }));
  });
  out.push(group('pistons and rods', moving));
  // (its head: one along an inline engine, one on each cylinder of a vee, leaning with it; its gasket under it)
  const heads = d.vee ? cyl.map((c, i) => ({ ...cylinderHead(s, d, i), rot: [c.lean, 0, 0] as V3 })) : [cylinderHead(s, d)];
  out.push(...heads);
  for (const c of d.vee ? cyl : [{ x: 0, lean: 0 }]) out.push(box('head gasket', [d.vee ? 1.5 * B : len, gasket, Wb], [d.vee ? c.x : 0, (deck + gasket / 2) * Math.cos(c.lean), (deck + gasket / 2) * Math.sin(c.lean)], { rot: [c.lean, 0, 0], item: 'head-gasket', mat: 'stainless-304', color: 0x9a9c9e, cuts: (d.vee ? [{ x: 0 }] : cyl).map((q) => ({ r: B / 2, depth: gasket, at: [q.x, gasket / 2, 0] as V3, dir: [0, -1, 0] as V3 })) }));
  // (its cam cover over each head, its gasket in its groove, its bolts round it)
  const top = deck + gasket + Hh, ctop = d.cams === 'dohc' ? top + 0.45 * B : top + 0.35 * B, coverMat = d.diesel ? 'al-a380' : 'nylon';
  for (const c of d.vee ? cyl : [{ x: 0, lean: 0 }]) {
    const Lc = d.vee ? 1.5 * B : len - 0.4 * d.we, h = ctop - top, yc = top + h / 2, at: V3 = [c.x, yc * Math.cos(c.lean), yc * Math.sin(c.lean)];
    out.push(box('cam cover', [Lc, h, Wb], at, { rot: [c.lean, 0, 0], shell: d.diesel ? 0.005 : 0.0035, item: 'cam-cover', mat: coverMat, color: d.diesel ? 0x2a2a2a : 0x1a1a1a, finish: 'texture', says: d.diesel ? 'cast aluminium' : 'glass-filled nylon' }));
    out.push(group('cam cover gasket', [box('gasket', [Lc, 0.003, 0.006], [0, 0, Wb / 2 - 0.004], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [Lc, 0.003, 0.006], [0, 0, -Wb / 2 + 0.004], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [0.006, 0.003, Wb], [Lc / 2 - 0.004, 0, 0], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [0.006, 0.003, Wb], [-Lc / 2 + 0.004, 0, 0], { mat: 'nbr', color: 0x1a1a1a })], { item: 'cam-cover-gasket', at: [c.x, (top + 0.0015) * Math.cos(c.lean), (top + 0.0015) * Math.sin(c.lean)], rot: [c.lean, 0, 0] }));
    const nb = Math.max(4, Math.round(Lc / 0.1) * 2);
    for (let k = 0; k < nb; k++) { const x = c.x - Lc / 2 + 0.02 + ((k >> 1) * (Lc - 0.04)) / Math.max(1, nb / 2 - 1), z = (k % 2 ? 1 : -1) * (Wb / 2 - 0.01); out.push(bolt('M6', 0.025, [x, ctop * Math.cos(c.lean) - z * Math.sin(c.lean), ctop * Math.sin(c.lean) + z * Math.cos(c.lean)], [c.lean, 0, 0], 'cam cover bolt')); }
  }
  const front = len / 2, back = -len / 2;
  // (its timing drive, at its front: in its own plane (u = -z, v = y), turned into place)
  const td2: Part[] = [], tp = (u: number, v: number): V3 => [u, v, 0];
  if (d.cams === 'ohv' || d.vee) {
    // (a gear on the crank turning one twice its size on the cam beside it, a module about 0.025 of its bore, typical)
    const m = Math.max(0.0015, Math.round(0.025 * B * 2000) / 2000), dist = (m * (24 + 48)) / 2, a = (40 * PI) / 180;
    td2.push({ ...toothed({ name: 'crank gear', m, z: 24, b: 0.15 * B, bore: 0.4 * B, mat: 'steel-alloy', item: 'timing-gear' }), at: tp(0, 0) });
    td2.push({ ...toothed({ name: 'cam gear', m, z: 48, b: 0.15 * B, bore: 0.3 * B, mat: 'steel-alloy', item: 'timing-gear' }), at: tp(-dist * Math.cos(a), dist * Math.sin(a)) });
    if (d.cams === 'ohv') {
      // (its cam in the block, beside its crank where the gears put it; a lifter, a pushrod up to each rocker)
      const zc = dist * Math.cos(a), yc = dist * Math.sin(a), lobes: Part[] = [P('cam tube', { cyl: [0.11 * B, len - 2 * d.we] }, [0, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true })];
      const vx = cyl.flatMap((c) => [c.x - 0.22 * B, c.x + 0.22 * B]);
      for (const x of vx) lobes.push(P('cam lobe', { cyl: [0.16 * B, 0.15 * B] }, [x, yc, zc], { rot: CYL_X, mat: 'cast-iron', color: 0x5a5c60, finish: 'ground', one: true }));
      out.push(group('camshaft', lobes, { item: 'camshaft', mat: 'cast-iron', says: 'in the block, turned by the crank\'s gear' }));
      const ytip = d.tip + 0.12 * B;
      for (const x of vx) { out.push(P('lifter', { cyl: [0.1 * B, 0.3 * B] }, [x, yc + 0.16 * B + 0.15 * B, zc], { item: 'lifter', mat: 'steel-alloy', color: 0x8a8c90, finish: 'ground' })); out.push(P('pushrod', { tube: { r: 0.03 * B, wall: 0.0012, pts: [[x, yc + 0.46 * B, zc], [x, ytip - 0.02 * B, 0.22 * B]] } }, [0, 0, 0], { item: 'pushrod', mat: 'steel-low', color: 0x6a6c70 })); }
    }
  } else {
    // (a sprocket on the crank, one twice its teeth on each cam, a roller chain round them, its guide and tensioner)
    const series = B < 0.07 ? '25' : B < 0.11 ? '06B' : '10B', C = CHAINS[series]!, p = C.p / 1000, m = p / PI, ycam = d.camY;
    const wheels: [number, number, number][] = [[0, 0, (m * 21) / 2]];
    td2.push({ ...toothed({ name: 'crank sprocket', m, z: 21, b: C.width / 1000, bore: 0.4 * B, mat: 'steel-alloy', item: 'timing-sprocket' }), at: tp(0, 0) });
    for (const z of d.cams === 'dohc' ? [0.2 * B, -0.2 * B] : [0]) { wheels.push([-z, ycam, (m * 42) / 2]); td2.push({ ...toothed({ name: 'cam sprocket', m, z: 42, b: C.width / 1000, bore: 0.24 * B, mat: 'steel-alloy', item: 'timing-sprocket' }), at: tp(-z, ycam) }); }
    const path = around(wheels.map(([u, v, rr]) => [u, v, rr + (C.roller / 2000)] as [number, number, number])).map(([u, v]) => [u, v, 0] as V3);
    td2.push(partOf(chainRun({ name: 'timing chain', p, roller: C.roller / 1000, width: C.width / 1000, path, closed: true })));
    const right = Math.max(...wheels.map((w) => w[0] + w[2])) + 0.012;
    td2.push(box('chain guide', [0.012, ycam * 0.7, 0.02], [right, ycam / 2, 0], { item: 'chain-guide', mat: 'nylon', color: 0x2a2a2a }));
    td2.push(group('chain tensioner', [box('tensioner body', [0.03, 0.04, 0.03], [-right - 0.02, ycam * 0.45, 0], { mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('tensioner plunger', { cyl: [0.006, 0.03] }, [-right - 0.005, ycam * 0.45, 0], { rot: [0, 0, PI / 2], mat: 'steel-alloy', color: 0xc8ccd2 })], { item: 'chain-tensioner' }));
  }
  const tdx = front + 0.03;
  out.push(group('timing drive', td2, { item: d.cams === 'ohv' || d.vee ? 'timing-gears' : 'timing-drive', at: [tdx, 0, 0], rot: [0, PI / 2, 0] }));
  // (its timing cover over it, the crank's seal in it; its damper and pulley on the crank's nose in front)
  const coverH = (d.cams === 'ohv' || d.vee ? 0.9 * B : deck + gasket + Hh) - ysk;
  out.push(box('timing cover', [0.006, coverH, Wc * 0.9], [tdx + 0.035, ysk + coverH / 2, 0], { item: 'timing-cover', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', cuts: [{ r: 0.21 * B, depth: 0.006, at: [0.003, -(ysk + coverH / 2), 0], dir: [-1, 0, 0] }] }));
  out.push({ ...ringX('crank seal', 0.2 * B, 0.3 * B, 0.01, [tdx + 0.035, 0, 0], { item: 'shaft-seal', mat: 'nbr', color: 0x1a1a1a }) });
  const dr = Math.min(0.11, 0.85 * B), dx = tdx + 0.07;
  if (!(d.n <= 2 && !d.diesel)) {
    out.push(group('crank pulley and damper', [ringX('damper hub', 0.2 * B, dr * 0.75, 0.035, [0, 0, 0], { item: 'damper-hub', mat: 'cast-iron', color: 0x3a3c40, finish: 'cast', fill: 0.6 }), ringX('damper rubber', dr * 0.75, dr * 0.8, 0.025, [0, 0, 0], { item: 'damper-rubber', mat: 'epdm', color: 0x1a1a1a }), ringX('damper inertia ring', dr * 0.8, dr, 0.03, [0, 0, 0], { item: 'damper-ring', mat: 'cast-iron', color: 0x3a3c40, finish: 'machined' })], { item: 'torsional-damper', at: [dx, 0, 0] }));
    out.push(bolt(threadFor(B * 1.3), 0.06, [dx + 0.02, 0, 0], [0, 0, -PI / 2], 'crank pulley bolt'));
  }
  // (its flywheel on the crank's flange at the back: about 3.5 bores across (typical), its ring gear shrunk on; its bolts)
  const small = d.n <= 2 && !d.diesel, fwR = (small ? 1.15 : 1.75) * B, fwT = (d.diesel ? 0.35 : small ? 0.22 : 0.3) * B, fx = back - 0.12 * B - fwT / 2 - 0.004, electric = s.starter !== 'recoil', rgM = d.diesel ? 0.0042 : 0.0025;
  const fw: Part[] = [ringX('flywheel', 0.12 * B, fwR, fwT, [0, 0, 0], { item: 'flywheel-disc', mat: 'cast-iron', color: 0x5a5c60, finish: 'machined', fill: 0.85, says: 'its face ground (its pockets and lightening about 0.15 of it, typical)' })];
  if (electric) fw.push({ ...toothed({ name: 'starter ring gear', m: rgM, z: Math.round((2 * (fwR + 0.006)) / rgM), b: 0.012 + 0.04 * B, bore: 2 * fwR, mat: 'steel-alloy', item: 'starter-ring-gear' }), at: [0, 0, 0], rot: [0, PI / 2, 0] });
  out.push(electric ? group('flywheel and ring gear', fw, { item: 'flywheel', at: [fx, 0, 0] }) : { ...fw[0]!, name: 'flywheel', at: [fx, 0, 0], says: 'its fan cast in its face, its magneto\'s magnets in its rim (not drawn)' });
  for (let k = 0; k < 6; k++) { const a = (k * PI) / 3; out.push(bolt(threadFor(B), fwT + 0.12 * B, [fx - fwT / 2, 0.3 * B * Math.cos(a), 0.3 * B * Math.sin(a)], [0, 0, PI / 2], 'flywheel bolt')); }
  // (its oiling: the pan under its crankcase, its gasket and bolts; the pump on the crank's nose; its pickup to the sump;
  // its filter on the block's side; the pan's drain plug)
  const panTop = ysk, panBot = -(swing + 0.02 + (d.diesel ? 0.6 : 0.45) * B), panH = panTop - panBot, panL = len * 0.96, panW = Wc * 0.96;
  out.push(box('oil pan', [panL, panH, panW], [0, (panTop + panBot) / 2 - 0.002, 0], { item: 'oil-pan', mat: d.diesel ? 'al-a380' : 'steel-low', shell: d.diesel ? 0.005 : 0.0012, color: d.diesel ? 0x8c8e90 : 0x2a2a2a, finish: d.diesel ? 'cast' : 'paint', says: d.diesel ? 'cast aluminium' : 'pressed from 1.2 mm steel (typical)' }));
  out.push(group('oil pan gasket', [box('gasket', [panL, 0.003, 0.01], [0, 0, panW / 2 - 0.006], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [panL, 0.003, 0.01], [0, 0, -panW / 2 + 0.006], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [0.01, 0.003, panW], [panL / 2 - 0.006, 0, 0], { mat: 'nbr', color: 0x1a1a1a }), box('gasket', [0.01, 0.003, panW], [-panL / 2 + 0.006, 0, 0], { mat: 'nbr', color: 0x1a1a1a })], { item: 'pan-gasket', at: [0, panTop - 0.0015, 0] }));
  const npb = Math.max(8, Math.round((2 * (panL + panW)) / 0.09));
  for (let k = 0; k < npb; k++) { const f = k / npb, per = 2 * (panL + panW), sAt = f * per; let x: number, z: number; if (sAt < panL) { x = -panL / 2 + sAt; z = panW / 2 - 0.006; } else if (sAt < panL + panW) { x = panL / 2 - 0.006; z = panW / 2 - (sAt - panL); } else if (sAt < 2 * panL + panW) { x = panL / 2 - (sAt - panL - panW); z = -panW / 2 + 0.006; } else { x = -panL / 2 + 0.006; z = -panW / 2 + (sAt - 2 * panL - panW); }
    out.push(bolt(d.diesel ? 'M8' : 'M6', 0.02, [x, panTop - 0.012, z], [PI, 0, 0], 'oil pan bolt')); }
  out.push(bolt(d.diesel ? 'M16' : 'M14', 0.016, [-panL * 0.3, panBot - 0.002, 0], [PI, 0, 0], 'oil drain plug'));
  // (a gerotor round the crank's nose: its inner rotor about 0.9 bore across, its outer ring round it, typical)
  const gm = (0.9 * B) / 11;
  out.push(group('oil pump', [ringX('oil pump body', 0.2 * B, 0.95 * B, 0.025, [0, 0, 0], { item: 'oil-pump-body', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', fill: 0.7 }), { ...toothed({ name: 'oil pump inner rotor', m: gm, z: 9, b: 0.012, bore: 0.42 * B, mat: 'steel-low', item: 'gerotor-inner' }), at: [0, 0, 0], rot: [0, PI / 2, 0] }, ringX('oil pump outer rotor', 0.45 * B + 0.002, 0.57 * B, 0.012, [0, 0, 0], { item: 'gerotor-outer', mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })], { item: 'oil-pump', at: [front - 0.02, 0, 0] }));
  out.push(group('oil pickup', [P('pickup tube', { tube: { r: 0.008, wall: 0.0012, pts: [[front - 0.02, -0.8 * B, 0], [front - 0.05, panBot + 0.05, 0], [front - 0.12, panBot + 0.03, 0]] } }, [0, 0, 0], { mat: 'steel-low', color: 0x6a6c70, one: true }), P('strainer', { cyl: [0.035, 0.012] }, [front - 0.14, panBot + 0.018, 0], { mat: 'steel-low', color: 0x8a8c90, fill: 0.35, one: true, says: 'a mesh over the pickup\'s mouth' })], { item: 'oil-pickup' }));
  const fr = Math.max(0.033, 0.45 * B), fh = Math.max(0.065, 0.85 * B), fz = Wc / 2 + 0.004;
  out.push(group('oil filter', [P('filter can', { cyl: [fr, fh] }, [0, fh / 2, 0], { shell: 0.0005, item: 'filter-can', mat: 'steel-low', color: 0x1a4a8a, finish: 'paint' }), P('filter element', { lathe: [[fr * 0.4, 0.004], [fr * 0.85, 0.004], [fr * 0.85, fh - 0.006], [fr * 0.4, fh - 0.006], [fr * 0.4, 0.004]] }, [0, 0, 0], { item: 'filter-element', mat: 'paper', color: 0xd8c890, fill: 0.45, says: 'pleated paper, about 0.45 of its ring (typical)' }), P('filter base plate', { lathe: [[0.01, 0], [fr * 0.9, 0], [fr * 0.9, 0.003], [0.01, 0.003], [0.01, 0]] }, [0, 0, 0], { item: 'filter-base', mat: 'steel-low', color: 0x8a8c90 }), P('filter gasket', { torus: [fr * 0.75, 0.0025] }, [0, -0.002, 0], { rot: [PI / 2, 0, 0], mat: 'nbr', color: 0x1a1a1a })], { item: 'oil-filter', at: [-0.15 * len, 0.1 * B, fz], rot: [-PI / 2, 0, 0] }));
  // (its intake on the +z side: a runner from each port up to a plenum along the engine, its throttle at the plenum's
  // front; its injectors in the runners and their rail; a diesel's from its turbo's compressor)
  const carb = s.induction === 'carburettor' || (s.induction === undefined && (d.air || d.n === 1)), yport = deck + gasket + td + 0.3 * Hh, zport = Wb / 2, plY = yport + 0.35 * B, plZ = zport + 0.55 * B, plL = d.vee ? 2 * B : len * 0.9, runners: Part[] = [];
  const inl = cyl.map((c) => ({ x: c.x, y: yport, z: zport }));
  if (!d.vee) {
    for (const c of inl) runners.push(P('intake runner', { tube: { r: 0.17 * B, wall: 0.003, pts: [[c.x, c.y, c.z], [c.x, c.y, c.z + 0.25 * B], [c.x, plY - 0.1 * B, plZ - 0.2 * B]] } }, [0, 0, 0], { item: 'intake-runner', mat: d.diesel ? 'al-a380' : 'nylon', color: d.diesel ? 0x8c8e90 : 0x1a1a1a, finish: 'texture' }));
    out.push(group('intake manifold', [box('intake plenum', [plL, 0.9 * B, 0.9 * B], [0, plY, plZ], { item: 'intake-plenum', mat: d.diesel ? 'al-a380' : 'nylon', shell: d.diesel ? 0.005 : 0.003, color: d.diesel ? 0x8c8e90 : 0x1a1a1a, finish: 'texture' }), ...runners], { item: 'intake-manifold', says: d.diesel ? 'cast aluminium' : 'glass-filled nylon, its shells welded' }));
    if (!d.diesel && carb) out.push(carburettor(B, [plL / 2 + 0.3 * B, plY, plZ], [0, PI / 2, 0]));
    else if (!d.diesel) {
      out.push(group('throttle body', [P('throttle housing', { lathe: [[0.3 * B, 0], [0.38 * B, 0], [0.38 * B, 0.5 * B], [0.3 * B, 0.5 * B], [0.3 * B, 0]] }, [0, 0, 0], { item: 'throttle-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), P('throttle plate', { cyl: [0.29 * B, 0.0012] }, [0, 0.25 * B, 0], { item: 'throttle-plate', mat: 'brass', color: 0xc8a050, rot: [0.3, 0, 0] })], { item: 'throttle-body', at: [plL / 2, plY, plZ], rot: [0, 0, -PI / 2] }));
      for (const c of inl) out.push(group('fuel injector', [turned({ name: 'injector body', steps: [[0.08 * B, 0.03], [0.11 * B, 0.03]], mat: 'stainless-304', item: 'injector-body' }), turned({ name: 'injector needle', steps: [[0.012 * B, 0.05]], mat: 'steel-alloy', item: 'injector-needle', at: [0, 0.005, 0] }), P('injector coil', { cyl: [0.1 * B, 0.015] }, [0, 0.04, 0], { item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.6 })], { item: 'fuel-injector', at: [c.x, c.y + 0.2 * B, c.z + 0.12 * B], rot: [-0.6, 0, 0] }));
      out.push(P('fuel rail', { tube: { r: 0.009, wall: 0.0012, pts: [[-len / 2 + 0.03, yport + 0.2 * B + 0.07, zport + 0.12 * B + 0.04], [len / 2 - 0.03, yport + 0.2 * B + 0.07, zport + 0.12 * B + 0.04]] } }, [0, 0, 0], { item: 'fuel-rail', mat: 'stainless-304', color: 0xc8ccd2 }));
    }
  } else {
    // (a vee twin's: a runner from each head's port to its carburettor's throat between the banks, typical)
    out.push(group('intake manifold', [box('intake plenum', [0.8 * B, 0.5 * B, 0.5 * B], [0, deck + 0.5 * B, 0], { item: 'intake-plenum', mat: 'al-a380', shell: 0.004, color: 0x8c8e90, finish: 'cast' }), ...cyl.map((c) => P('intake runner', { tube: { r: 0.14 * B, wall: 0.004, pts: [[c.x, (deck + 0.4 * Hh) * Math.cos(c.lean) * 0.95, (deck + 0.4 * Hh) * Math.sin(c.lean) * 0.6], [0, deck + 0.5 * B, 0]] } }, [0, 0, 0], { item: 'intake-runner', mat: 'al-a380', color: 0x8c8e90, finish: 'cast' }))], { item: 'intake-manifold' }));
    out.push(carburettor(B, [0, deck + 0.8 * B, 0], [-PI / 2, 0, 0]));
  }
  // (its exhaust on the -z side: a runner from each port into a collector along the engine, its flange at the back; its
  // gasket; a nut on two studs at each port)
  const exZ = -(Wb / 2), colZ = exZ - 0.4 * B, colY = yport - 0.3 * B, exRunners: Part[] = [];
  if (!d.vee) {
    for (const c of cyl) exRunners.push(P('exhaust runner', { tube: { r: 0.15 * B, wall: 0.005, pts: [[c.x, yport, exZ], [c.x, yport, exZ - 0.2 * B], [c.x, colY, colZ]] } }, [0, 0, 0], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', one: true }));
    exRunners.push(P('exhaust collector', { tube: { r: 0.22 * B, wall: 0.005, pts: [[len / 2 - 0.02, colY, colZ], [-len / 2 + 0.02, colY, colZ], [-len / 2 - 0.05, colY - 0.2 * B, colZ]] } }, [0, 0, 0], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', one: true }));
    out.push(group('exhaust manifold', exRunners, { item: 'exhaust-manifold', mat: 'cast-iron', says: 'cast iron in one' }));
    out.push(box('manifold gasket', [len * 0.9, 0.42 * B, 0.0012], [0, yport, exZ - 0.0006], { item: 'manifold-gasket', mat: 'stainless-304', color: 0x9a9c9e }));
    for (const c of cyl) for (const sd of [-1, 1]) out.push(use('nut M8', [c.x + sd * 0.22 * B, yport, exZ - 0.012], { rot: [PI / 2, 0, 0], name: 'manifold nut' }));
  } else {
    out.push(group('exhaust manifold', cyl.map((c) => P('exhaust runner', { tube: { r: 0.13 * B, wall: 0.003, pts: [[c.x, (deck + 0.4 * Hh) * Math.cos(c.lean), (deck + 0.4 * Hh) * Math.sin(c.lean) * 1.1], [c.x, deck * 0.4, Math.sign(c.lean) * (Wc / 2 + 0.1 * B)], [0, ysk, Math.sign(c.lean) * (Wc / 2 + 0.15 * B)]] } }, [0, 0, 0], { mat: 'steel-low', color: 0x5a4a40, finish: 'paint', one: true })), { item: 'exhaust-manifold', says: 'pressed and welded steel pipes' }));
  }
  // (a diesel's turbocharger on its exhaust: its turbine's scroll, its compressor's, its core, its two wheels)
  if (s.turbo) {
    const tz = colZ - 0.9 * B, ty = colY + 0.4 * B, tr = 0.7 * B;
    out.push(group('turbocharger', [P('turbine housing', { cyl: [tr, 0.6 * B] }, [-0.45 * B, 0, 0], { rot: CYL_X, item: 'turbine-housing', mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', fill: 0.45, says: 'its scroll cast round its wheel (about 0.45 of the cylinder round it)' }), P('compressor housing', { cyl: [tr * 0.95, 0.55 * B] }, [0.5 * B, 0, 0], { rot: CYL_X, item: 'compressor-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', fill: 0.4 }), P('turbo core', { cyl: [0.3 * B, 0.4 * B] }, [0, 0, 0], { rot: CYL_X, item: 'turbo-core', mat: 'cast-iron', color: 0x6a6c70, finish: 'cast' }), P('turbine wheel', { cyl: [0.33 * B, 0.25 * B] }, [-0.45 * B, 0, 0], { rot: CYL_X, item: 'turbine-wheel', mat: 'nickel-alloy', color: 0x8a7a6a, fill: 0.5 }), P('compressor wheel', { cyl: [0.33 * B, 0.25 * B] }, [0.5 * B, 0, 0], { rot: CYL_X, item: 'compressor-wheel', mat: 'al-2024', color: 0xc8ccd2, fill: 0.4 })], { item: 'turbocharger', at: [-len * 0.15, ty, tz] }));
  }
  // (what hangs on its front, on a belt from the crank's pulley: its alternator and water pump, a tensioner)
  const belt: [number, number, number][] = [[0, 0, dr]], bx = dx;
  const altR = Math.max(0.065, Math.min(0.09, 0.85 * B)), altL = altR * 2.1, altAt: [number, number] = [-(Wc / 2 + altR + 0.02), Math.max(0.3, deck * 0.6)];
  if (small) {
    // (a small engine's charging: a stator of coils under its flywheel, its magnets in the flywheel's rim (a magneto), no belt)
    out.push(group('flywheel stator', [ringX('stator core', 0.25 * B, 0.75 * B, 0.18 * B, [0, 0, 0], { item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60, fill: 0.6 }), ...Array.from({ length: 6 }, (_, k) => P('stator coil', { cyl: [0.08 * B, 0.2 * B] }, [0, 0.6 * B * Math.cos((k * PI) / 3), 0.6 * B * Math.sin((k * PI) / 3)], { rot: CYL_X, item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.6 }))], { at: [fx + fwT / 2 + 0.12 * B, 0, 0], says: 'a stator of coils the flywheel\'s magnets sweep: its charging and its spark' }));
  }
  if (!small) {
    belt.push([altAt[0], altAt[1], 0.03]);
    const al = (n: string, ri: number, ro: number, w: number, x: number, more: Partial<Part>) => ringX(n, ri, ro, w, [x, 0, 0], more);
    out.push(group('alternator', [
      al('alternator front housing', altR * 0.3, altR, altL * 0.3, -altL * 0.15, { mat: 'al-a380', color: 0xa8aaae, finish: 'cast', fill: 0.4 }),
      al('alternator rear housing', altR * 0.3, altR, altL * 0.3, -altL * 0.85, { mat: 'al-a380', color: 0xa8aaae, finish: 'cast', fill: 0.4 }),
      al('stator', altR * 0.62, altR * 0.92, altL * 0.35, -altL * 0.5, { item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60 }),
      ...[0, 1, 2].map((k) => al(`stator winding ${k + 1}`, altR * 0.6, altR * 0.95, altL * 0.08, -altL * (0.3 + 0.2 * k) , { item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.5 })),
      group('rotor', [al('claw pole', 0.006, altR * 0.58, altL * 0.15, -altL * 0.42, { mat: 'steel-low', color: 0x6a6c70, one: true }), al('claw pole', 0.006, altR * 0.58, altL * 0.15, -altL * 0.58, { mat: 'steel-low', color: 0x6a6c70, one: true }), al('field coil', 0.012, altR * 0.4, altL * 0.06, -altL * 0.5, { item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.6 }), P('rotor shaft', { cyl: [0.0085, altL * 1.1] }, [-altL * 0.5, 0, 0], { rot: CYL_X, item: 'shaft-steel', mat: 'steel-alloy', color: 0xc8ccd2 })], { item: 'rotor-claw' }),
      ...[0, 1, 2, 3, 4, 5].map((k) => rectifierDiode([-altL * 0.95, altR * 0.5 * Math.cos(k), altR * 0.5 * Math.sin(k)])),
      { ...mouldedChip({ name: 'voltage regulator', w: 0.01, d: 0.006, h: 0.0025, pins: 8 }), at: [-altL * 0.97, -altR * 0.4, 0] as V3, rot: [0, 0, PI / 2] as V3 },
      ...[-1, 1].map((sd) => box('carbon brush', [0.005, 0.005, 0.012], [-altL * 0.9, sd * 0.012, 0.012], { item: 'carbon-brush', mat: 'graphite', color: 0x2a2a2a })),
      ...[-0.05, -0.95].map((f) => ({ ...use('bearing 608 ZZ', [altL * f, 0, 0], { rot: CYL_X }) })),
      al('alternator pulley', 0.006, 0.03, 0.025, 0.02, { mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })], { item: 'alternator', at: [bx, altAt[1], -altAt[0]] }));
    if (!d.air) {
      const wpAt: [number, number] = [Wb * 0.25, deck * 0.35];
      belt.push([wpAt[0], wpAt[1], 0.035]);
      out.push(group('water pump', [ringX('pump housing', 0.012, 0.06, 0.05, [-0.03, 0, 0], { item: 'pump-housing', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast', fill: 0.5 }), { ...toothed({ name: 'impeller', m: 0.004, z: 12, b: 0.012, bore: 0.012, mat: 'pp', item: 'impeller' }), at: [-0.06, 0, 0], rot: [0, PI / 2, 0] }, P('pump shaft', { cyl: [0.006, 0.08] }, [-0.03, 0, 0], { rot: CYL_X, item: 'pump-shaft', mat: 'steel-alloy', color: 0xc8ccd2 }), ringX('pump seal', 0.006, 0.015, 0.008, [-0.05, 0, 0], { item: 'shaft-seal', mat: 'nbr', color: 0x1a1a1a }), ringX('water pump pulley', 0.006, 0.035, 0.022, [0.01, 0, 0], { mat: 'steel-low', color: 0x6a6c70, finish: 'machined' })], { item: 'water-pump', at: [bx, wpAt[1], -wpAt[0]] }));
    }
    const tAt: [number, number] = [-(Wc / 2), deck * 0.25];
    belt.push([tAt[0], tAt[1], 0.035]);
    out.push(group('belt tensioner', [box('tensioner arm', [0.02, 0.08, 0.03], [-0.015, 0.03, 0], { item: 'tensioner-arm', mat: 'al-a380', color: 0x9a9c9e, finish: 'cast' }), ringX('idler pulley', 0.008, 0.035, 0.025, [0.01, 0, 0], { item: 'idler-pulley', mat: 'steel-low', color: 0x8a8c90, finish: 'machined' }), { ...coil({ name: 'tensioner spring', d: 0.003, D: 0.02, L: 0.03, n: 5 }), at: [-0.015, 0.06, 0] }], { item: 'belt-tensioner', at: [bx, tAt[1], -tAt[0]] }));
    const loop = around(belt).map(([u, v]) => [bx, v, -u] as V3);
    out.push(P('ribbed belt', { tube: { r: 0.004, pts: [...loop, loop[0]!], bend: 0.004 } }, [0, 0, 0], { item: 'ribbed-belt', mat: 'epdm', color: 0x1a1a1a, finish: 'texture', fill: 0.9, says: 'six ribs on aramid cords (its section drawn round)' }));
  }
  // (its starter beside the flywheel, its pinion by the ring gear; or a small engine's recoil starter)
  if (electric) {
    const sR = Math.max(0.035, Math.min(0.06, 0.45 * B)), sL = sR * 3.2, sz = fwR + 0.006 + sR * 0.6, sx = fx + 0.02 + sL / 2;
    out.push(group('starter motor', [P('starter can', { cyl: [sR, sL * 0.6] }, [0, 0, 0], { rot: CYL_X, shell: 0.0025, item: 'starter-can', mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' }), group('armature', [P('armature shaft', { cyl: [0.006, sL * 0.95] }, [0, 0, 0], { rot: CYL_X, item: 'shaft-steel', mat: 'steel-alloy', color: 0xc8ccd2 }), P('armature core', { cyl: [sR * 0.62, sL * 0.35] }, [0, 0, 0], { rot: CYL_X, item: 'lamination-stack', mat: 'steel-electrical', color: 0x5a5c60, fill: 0.8 }), ...[0, 1, 2].map((k) => P('armature winding', { lathe: [[sR * 0.5, 0], [sR * 0.66, 0], [sR * 0.66, sL * 0.1], [sR * 0.5, sL * 0.1], [sR * 0.5, 0]] }, [sL * (-0.15 + 0.1 * k), 0, 0], { rot: ALONG_X, item: 'winding', mat: 'copper', color: 0xb87333, fill: 0.5 })), ringX('commutator', 0.007, sR * 0.3, sL * 0.12, [sL * 0.3, 0, 0], { item: 'commutator', mat: 'copper', color: 0xb87333 })], { item: 'armature' }), P('starter solenoid', { cyl: [sR * 0.5, sL * 0.5] }, [0.03, sR * 1.4, 0], { rot: CYL_X, item: 'starter-solenoid', mat: 'steel-low', color: 0x8a8c90, fill: 0.7 }), { ...toothed({ name: 'starter pinion', m: rgM, z: 10, b: 0.02, bore: 0.012, mat: 'steel-alloy', item: 'starter-pinion' }), at: [-sL * 0.4, 0, 0], rot: [0, PI / 2, 0] }, ...[-1, 1].map((sd) => box('starter brush', [0.006, 0.006, 0.012], [sL * 0.25, sd * sR * 0.5, 0], { item: 'carbon-brush', mat: 'graphite', color: 0x2a2a2a }))], { item: 'starter-motor', at: [sx, -0.2 * B, -sz] }));
  } else {
    out.push(group('recoil starter', [box('recoil housing', [0.04, 1.6 * B, 1.6 * B], [0, 0, 0], { shell: 0.0012, mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' }), ringX('rope pulley', 0.008, 0.45 * B, 0.02, [0.005, 0, 0], { mat: 'nylon', color: 0x1a1a1a }), P('starter rope', { torus: [0.42 * B, 0.002] }, [0.005, 0, 0], { rot: [0, PI / 2, 0], mat: 'nylon', color: 0xd8d0b0 }), { ...coil({ name: 'recoil spring', d: 0.0015, D: 0.5 * B, L: 0.012, n: 6 }), at: [0.01, 0, 0], rot: [0, 0, PI / 2] }], { at: [fx - fwT / 2 - 0.03, 0, 0], says: 'a pull rope wound on a sprung pulley, ratchets into the flywheel' }));
  }
  // (an air-cooled engine's blower housing over its flywheel's fan and its barrels, its muffler and air cleaner)
  if (d.air) {
    out.push(box('blower housing', [0.06, deck + 0.3 * B - ysk, Wc + 0.3 * B], [fx, (deck + 0.3 * B + ysk) / 2, 0], { shell: 0.0012, mat: 'steel-low', color: 0xc82020, finish: 'paint', says: 'pressed steel, leading the flywheel\'s fan\'s air over the fins' }));
    out.push(group('muffler', [P('muffler shell', { cyl: [0.5 * B, 1.4 * B] }, [0, 0, 0], { rot: CYL_X, shell: 0.0012, mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' }), P('muffler baffle', { cyl: [0.48 * B, 0.0015] }, [0, 0, 0], { rot: CYL_X, mat: 'steel-low', color: 0x5a5c60 })], { at: [0, deck * 0.6, -(Wc / 2 + 0.6 * B)] }));
    out.push(group('air cleaner', [box('air cleaner case', [0.8 * B, 0.9 * B, 0.6 * B], [0, 0, 0], { shell: 0.0015, mat: 'abs', color: 0x1a1a1a, finish: 'texture' }), box('air filter', [0.7 * B, 0.7 * B, 0.4 * B], [0, 0, 0], { mat: 'paper', color: 0xd8c890, fill: 0.3 })], { at: [0, deck + 0.4 * B, Wc / 2 + 0.4 * B] }));
  }
  const engine = group(s.name ?? `${s.fuel} engine`, out, { item: 'engine-ice', says: s.says ?? '' });
  const b = boundsOfAll(engine);
  const size = b.getSize(new THREE.Vector3()), mid = b.getCenter(new THREE.Vector3()), count = (p: Part): number => (p.shape ? 1 : 0) + (p.parts ?? []).reduce((a, q) => a + count(q), 0);
  const res: EngineBuilt = { engine, kg: massOf(engine), size: [size.x, size.y, size.z], mid: [mid.x, mid.y, mid.z], pieces: count(engine), parts: { block, crank, piston, rod, head: heads[0]! } };
  built.set(key, res); return res;
}

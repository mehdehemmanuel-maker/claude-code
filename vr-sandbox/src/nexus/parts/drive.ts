// OWNS: a shaft line — what spins, what drives it, what loads it, and the speed the whole thing settles at.
//
// WHY THIS FILE EXISTS. Three things in this tree each knew their own half of a drive and none of them could
// reach the others:
//
//   parts/gears.ts        the real involute: what meshes, and what a hand-placed train does when one gear is
//                         turned. But `train(parts, driver, theta, torque = 1, rpm = 60)` took its torque and
//                         its speed as DEFAULT ARGUMENTS. A made-up 1 N·m at a made-up 60 rpm.
//   engineering/dcmotor   a real DC motor: Kt, Ke, terminal resistance, rotor inertia, winding heat. But
//   + motorrun.ts         `runMotor(d, { V, load, … })` took its load as a CONSTANT NUMBER, and its idea of a
//                         gearbox was `throughGear(T, w, g: GearheadData)` — a catalogue ratio scalar, nothing
//                         to do with the teeth you can place by hand.
//   parts/mate.ts         shafts, bores and what seats in what. `JointKind` has had 'gear' in it the whole time
//   + mechanism.ts        and nothing ever produced one.
//
// So a motor could not be loaded by a real train, and a real train could not be driven by a motor. Both halves
// ran on numbers somebody typed. THE ONE CONNECTION IS A SHAFT: everything that spins sits on one, named. A
// source puts torque into a shaft, a gearing carries it between two, a load takes it off one. That is the whole
// interface, and it is deliberately not about gears — a belt, a worm, a chain or a hand crank is the same three
// roles, so the next one plugs in without touching this file.
//
// WHAT IS EMERGENT HERE, and the reason this is not just plumbing: nothing below computes the answer. The motor
// knows its torque at a speed; the train knows its ratio and its inertia from the geometry someone placed; the
// load knows what it demands. Where it actually ends up — the settling speed, the current it draws getting
// there, whether that current cooks the winding — is the crossing of curves that live in different files.

import { fitAt } from './fits';
import { DENSITY } from './mass';
import { MESH_EFFICIENCY, section, sizesOf, train, type GearCut, type Placed, type Train } from './gears';
import { motorModel, type MotorModel } from '../../engineering/dcmotor';
// src/engineering/gears.ts was an ISLAND: `node tools/wired.mjs islands` found nothing under src/ importing it,
// and it holds the two things this file was otherwise guessing at — a mesh's efficiency from its own tooth counts
// and the friction on them (Niemann and Winter) instead of a typical 0.98, and the Lewis bending equation, which
// says whether the tooth SURVIVES the torque. It is not a second gears implementation to delete: it is the
// strength half of one, and this is the import that was missing.
import { meshEfficiency, toothTorque, type GearGeometry } from '../../engineering/gears';
import { getMaterial } from '../../data/materials';
import type { MotorData } from '../../data/motors';

/** Anything that spins sits on a shaft, named. This is the only connection between the parts of a drive. */
export interface Spinner { shaft: string }

/** What puts torque into a shaft: what it can give at a speed, and its own spinning mass.
 *  A DC motor is one. So is a hand crank, an engine, or a wound spring — none of which this file has to know. */
export interface Source extends Spinner {
  id: string;
  /** torque it makes turning at w rad/s, N·m — negative where it is being driven faster than it can drive */
  torqueAt(w: number): number;
  /** its own rotating inertia, kg·m² */ inertia: number;
  /** the current it draws at w, A, where it is the kind of thing that draws current */ currentAt?(w: number): number;
  /** most it carries continuously without cooking, A */ continuous?: number;
  /** the shaft it turns, m — what has to fit the first bore */ shaftD?: number;
  says: string;
}

/** What carries torque from one shaft to another: how the speeds relate, what is lost, what spins on the way. */
export interface Gearing {
  from: string; to: string;
  /** turns of `to` per turn of `from`, signed — a 9:1 reduction that also reverses is −1/9 */ ratio: number;
  /** power out over power in, driving */ efficiency: number;
  /** everything turning in it, referred to `from`'s shaft, kg·m² */ inertia: number;
  meshes: number;
  says: string;
}

/** What takes torque off a shaft. Constant, viscous, a fan's square law, a mass being lifted — all one shape. */
export interface Load extends Spinner {
  id: string;
  /** torque it demands turning at w rad/s, N·m */ torqueAt(w: number): number;
  inertia: number;
  /** the bore it is driven through, m, where it has one */ boreD?: number;
  says: string;
}

/** A drive: one source, the gearing between it and the load, and the load. */
export interface Rig { source: Source; gearing: Gearing | null; load: Load; faults: string[] }

/* ------------------------------------------------------------------ what a gear really weighs and how it spins */

/** A closed contour's area and its second polar moment about the origin, both unsigned. The polar moment is the
 *  ∫r²dA a spinning part's inertia is made of, taken over the REAL outline — involute flanks, root fillets, bore
 *  and all — because a gear is not a disc and a toothed rim with a big bore has visibly less inertia than one.
 *  (Check: a full disc of radius R gives A = πR² and J = πR⁴/2, so ρ·b·J = ½mR², which is the textbook disc.) */
export function contourJ(pts: [number, number][]): { area: number; J: number } {
  let a2 = 0, j = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]!, [x1, y1] = pts[(i + 1) % pts.length]!;
    const c = x0 * y1 - x1 * y0;
    a2 += c;
    j += c * (x0 * x0 + x0 * x1 + x1 * x1 + y0 * y0 + y0 * y1 + y1 * y1);
  }
  return { area: Math.abs(a2 / 2), J: Math.abs(j / 12) };
}

/** A gear's mass and its inertia about its own axis, from the section the viewer draws and the printer gets —
 *  so the number that sets how fast a train picks up speed comes from the same geometry the teeth do. */
export function gearSpin(c: GearCut): { mass: number; inertia: number; rho: number; says: string } {
  const p = section(c), g = sizesOf(c);
  const rho = DENSITY[c.matter ?? 'steel-low'] ?? DENSITY['steel-low']!;
  const o = contourJ(p.pts);
  let area = o.area, J = o.J;
  for (const h of p.holes ?? []) { const q = contourJ(h); area -= q.area; J -= q.J; }
  const mass = rho * g.b * area, inertia = rho * g.b * J;
  return { mass, inertia, rho,
    says: `${c.z}T module ${(c.m * 1000).toFixed(2)} in ${c.matter ?? 'steel-low'}: ${(mass * 1000).toFixed(1)} g, ${inertia.toExponential(3)} kg·m² about its axis, from its own section with its bore taken out` };
}

/** A cut gear said in the words the strength maths uses. The same gear, not a copy of it: both sides read the
 *  module, the tooth count and the face width off the one GearCut the board was built from. */
export const asGeometry = (c: GearCut): GearGeometry => ({ module: c.m, teeth: c.z, width: c.b });

/** The material a gear is cut from, as the strength maths needs it. `matter` on a GearCut is a density key for
 *  mass.ts; this maps the steels among them onto the full material, and says so when it has to assume. */
export function gearMaterial(c: GearCut): { id: string; assumed: boolean } {
  const want = c.matter ?? 'steel-low';
  const known: Record<string, string> = {
    'steel-low': 'steel.a36', 'steel-high': 'steel.1018-cd', 'steel-alloy': 'steel.4140-ann',
    'steel-tool': 'steel.4140-ann', 'cast-iron': 'cast-iron.gray-30', 'stainless-304': 'stainless.304',
    'stainless-316': 'stainless.316',
  };
  return known[want] ? { id: known[want]!, assumed: false } : { id: 'steel.a36', assumed: true };
}

/** THE TOOTH, judged against the torque that is actually on it. A drive can settle at a perfectly sensible speed
 *  and strip a tooth on the way there, and no speed, current or ratio says so: the question is a stress one. The
 *  worst case is standing still, where the motor makes its stall torque and the pitch line is not yet moving. */
export function toothHolds(c: GearCut, torque: number, rpm: number): { carries: number; margin: number; ok: boolean; says: string } {
  const mat = gearMaterial(c), g = asGeometry(c);
  const V = (Math.abs(rpm) / 60) * Math.PI * c.m * c.z; // pitch-line speed, m/s — faster teeth hit harder
  const carries = toothTorque(g, getMaterial(mat.id), V);
  const margin = Math.abs(torque) > 1e-12 ? carries / Math.abs(torque) : Infinity;
  return { carries, margin, ok: margin >= 1,
    says: margin >= 1
      ? `${c.z}T holds: its teeth carry ${carries.toFixed(3)} N·m at ${Math.abs(rpm).toFixed(0)} rpm against the ${Math.abs(torque).toFixed(3)} N·m on them — ${margin.toFixed(1)}x over${mat.assumed ? ' (material assumed mild steel)' : ''}`
      : `${c.z}T STRIPS: its teeth carry ${carries.toFixed(3)} N·m and ${Math.abs(torque).toFixed(3)} N·m is on them. Widen the face, raise the module, or pick a harder steel${mat.assumed ? ' (material assumed mild steel)' : ''}` };
}

/* ----------------------------------------------------------------------------------- a motor as a torque source */

/** A catalogue motor turned into something a shaft line can use. Its torque curve is the real one: the winding
 *  sees V less the back-EMF Kt·w, that over R is the current, Kt times that is the torque, less its friction. */
export function motorSource(d: MotorData, o: { V?: number; shaft: string; id?: string }): Source {
  const m: MotorModel = motorModel(d), V = o.V ?? d.V;
  const currentAt = (w: number) => (V - m.Kt * w) / m.R25;
  return {
    id: o.id ?? d.id, shaft: o.shaft, inertia: m.rotorInertia, continuous: m.maxContinuousCurrent, shaftD: d.shaft,
    currentAt,
    torqueAt: (w) => m.Kt * currentAt(w) - (w > 1e-9 ? m.Tf : 0),
    says: `${m.label} at ${V} V: ${(m.Kt * 1000).toFixed(1)} mN·m/A, ${m.R25.toFixed(3)} Ω, free at ${((m.noLoadSpeed * 60) / (2 * Math.PI)).toFixed(0)} rpm, stalling at ${m.stallTorque.toFixed(3)} N·m, ${m.maxContinuousCurrent} A continuous`,
  };
}

/** The speed a source makes no more torque at — the top of the range an operating point can be in. */
export const freeSpeed = (s: Source): number => {
  let lo = 0, hi = 1;
  while (s.torqueAt(hi) > 0 && hi < 1e6) hi *= 2;
  for (let i = 0; i < 80; i++) { const mid = (lo + hi) / 2; if (s.torqueAt(mid) > 0) lo = mid; else hi = mid; }
  return hi;
};

/* ------------------------------------------------------------------------- a hand-placed train as that gearing */

/** How many meshes power crosses going from one gear to another — the path's length, not the train's size, because
 *  an idler hanging off the side loses nothing on the way to the output and a stage in series loses its own. */
export function meshPath(t: Train, from: string, to: string): string[] | null {
  if (from === to) return [];
  const next = new Map<string, string[]>();
  for (const m of t.meshes) {
    (next.get(m.a) ?? next.set(m.a, []).get(m.a)!).push(m.b);
    (next.get(m.b) ?? next.set(m.b, []).get(m.b)!).push(m.a);
  }
  const seen = new Set([from]), q: { id: string; path: string[] }[] = [{ id: from, path: [] }];
  while (q.length) {
    const cur = q.shift()!;
    for (const n of next.get(cur.id) ?? []) {
      if (seen.has(n)) continue;
      const path = [...cur.path, n];
      if (n === to) return path;
      seen.add(n); q.push({ id: n, path });
    }
  }
  return null;
}

/** A train someone placed by hand, read as the gearing between its driver and one of its gears. Everything here
 *  comes out of where the gears were PUT: the ratio from the meshes the distances produced, the inertia from each
 *  gear's own section, and the loss from the number of meshes on the path between the two. */
export function trainGearing(places: Placed[], driver: string, out: string, t?: Train, mu?: number): Gearing | string {
  const tr = t ?? train(places, driver);
  if (tr.faults.length) return `the train will not go round: ${tr.faults[0]}`;
  const end = tr.turn[out];
  if (!end) return `nothing called "${out}" is driven by "${driver}"`;
  const path = meshPath(tr, driver, out);
  if (path === null) return `"${out}" is in the drawing but no chain of meshes reaches it from "${driver}"`;
  // EVERY gear that turns adds inertia, not only the ones on the path: an idler spins too, and referring each to
  // the driver's shaft is what makes one number out of a set of gears all turning at different speeds.
  let inertia = 0;
  for (const p of places) {
    const t = tr.turn[p.id];
    if (!t || sizesOf(p.gear).kind === 'rack') continue;
    // THE RECIPROCAL MATTERS. gears.ts's `ratio` is the TORQUE multiplication — its own comment says so, and its
    // rpm divides by it. A gear turning n times per turn of the driver stores (1/2)J(nw)^2, so it is felt at the
    // driver's shaft as J·n^2 with n the SPEED ratio. Read the torque ratio as a speed ratio here and a 60-tooth
    // wheel behind a 20-tooth pinion comes out nine times harder to accelerate instead of nine times easier,
    // which is the sign of the error: the drive would not spin up in the half second it actually takes.
    const n = 1 / t.ratio;
    inertia += gearSpin(p.gear).inertia * n * n;
  }
  // WITH mu GIVEN, the loss is the real one: pi·mu·(1/z1 + 1/z2) per mesh, so a small pinion loses more than a
  // big one and nothing here is a flat 2%. Without it, the typical figure gears.ts's own walk already uses, so
  // the two agree about the same train.
  const by = new Map(places.map((p) => [p.id, p]));
  let efficiency = 1;
  if (mu === undefined) efficiency = MESH_EFFICIENCY ** path.length;
  else {
    let at = driver;
    for (const step of path) {
      const x = by.get(at), y = by.get(step);
      efficiency *= x && y ? meshEfficiency(asGeometry(x.gear), asGeometry(y.gear), mu) : MESH_EFFICIENCY;
      at = step;
    }
  }
  const ratio = 1 / end.ratio;
  return { from: driver, to: out, ratio, efficiency, inertia, meshes: path.length,
    says: `${path.length} ${path.length === 1 ? 'mesh' : 'meshes'} from ${driver} to ${out}: ${Math.abs(ratio) <= 1 ? `${(1 / Math.abs(ratio)).toFixed(3)}:1 reduction` : `${Math.abs(ratio).toFixed(3)}:1 overdrive`}${ratio < 0 ? ', reversing' : ''}, ${(efficiency * 100).toFixed(1)}% through the teeth, and ${inertia.toExponential(3)} kg·m² of gear referred to ${driver}'s shaft` };
}

/* --------------------------------------------------------------------------------------------- loads, as a kind */

/** A constant torque: a brake, a cutting force, a mass on a drum. */
export const steadyLoad = (shaft: string, T: number, id = 'load'): Load =>
  ({ id, shaft, inertia: 0, torqueAt: () => T, says: `${T.toFixed(3)} N·m whatever the speed` });

/** What a fan or a propeller takes: torque with the square of the speed, so it cannot be referred by a ratio alone
 *  and is exactly the case a catalogue "efficiency × ratio" gets wrong. */
export const fanLoad = (shaft: string, k: number, id = 'fan'): Load =>
  ({ id, shaft, inertia: 0, torqueAt: (w) => k * w * w, says: `${k.toExponential(2)}·ω² N·m — a fan law` });

/** A spinning mass with nothing holding it back: a flywheel, a wheel off the ground. */
export const inertialLoad = (shaft: string, J: number, id = 'flywheel'): Load =>
  ({ id, shaft, inertia: J, torqueAt: () => 0, says: `${J.toExponential(3)} kg·m² to get up to speed and nothing to hold it there` });

/* ------------------------------------------------------------------------- where the whole thing actually settles */

/** What a shaft of this diameter does in a bore of that one, named as the fit it really is. A drive is not
 *  connected because two files agree on a word: the motor's shaft has to go into the gear's bore. */
export function shaftInBore(shaftM: number, boreM: number): { fit: string; says: string } | string {
  const s = +(shaftM * 1000).toFixed(3), b = +(boreM * 1000).toFixed(3);
  if (b <= 0) return `the gear has no bore, so nothing can drive it: it is a blank`;
  if (s > b + 0.05) return `a ⌀${s} mm shaft does not enter a ⌀${b} mm bore: ${(s - b).toFixed(3)} mm too big`;
  if (b - s > 0.3) return `a ⌀${s} mm shaft is ${(b - s).toFixed(2)} mm loose in a ⌀${b} mm bore: it would not drive it, and a bush or the next size of gear is wanted`;
  const id = s >= b ? 'H7/p6' : b - s > 0.05 ? 'H7/h6' : 'H7/k6';
  const f = fitAt(id, b);
  return { fit: id, says: `⌀${s} mm shaft in a ⌀${b} mm bore, held as ${f.fit.name} (${id}). ${f.fit.says}` };
}

export interface Settled {
  /** at the source's own shaft */ w: number; rpm: number; torque: number;
  /** at the load's shaft */ outW: number; outRpm: number; outTorque: number;
  current: number | null;
  /** mechanical power in at the source and out at the load, W */ powerIn: number; powerOut: number;
  /** everything spinning, referred to the source's shaft, kg·m² */ inertia: number;
  stalled: boolean;
  /** drawing more than it carries continuously: it runs, and then it cooks */ overCurrent: boolean;
  says: string;
}

/** Everything in the rig, referred to the source's shaft. */
export const rigInertia = (r: Rig): number =>
  r.source.inertia + (r.gearing?.inertia ?? 0) + r.load.inertia * (r.gearing?.ratio ?? 1) ** 2;

/** Torque the source has left over at speed w, after the load is referred back through the gearing. Zero at the
 *  operating point; this one function is the whole coupling. */
export function netTorque(r: Rig, w: number): number {
  const n = r.gearing?.ratio ?? 1, eta = r.gearing?.efficiency ?? 1;
  return r.source.torqueAt(w) - (r.load.torqueAt(n * w) * Math.abs(n)) / eta;
}

/** THE OPERATING POINT: the speed where what the source makes equals what the load takes through the gearing.
 *  Neither side knows it. Change one gear and it moves, which is the thing to watch. */
export function settle(r: Rig): Settled {
  const n = r.gearing?.ratio ?? 1, eta = r.gearing?.efficiency ?? 1, hi = freeSpeed(r.source);
  let w = 0;
  const stalled = netTorque(r, 0) <= 0;
  if (!stalled) { let lo = 0, up = hi; for (let i = 0; i < 90; i++) { const mid = (lo + up) / 2; if (netTorque(r, mid) > 0) lo = mid; else up = mid; } w = lo; }
  const torque = r.source.torqueAt(w), outW = n * w, outTorque = r.load.torqueAt(outW);
  const current = r.source.currentAt ? r.source.currentAt(w) : null;
  const over = current !== null && r.source.continuous !== undefined && current > r.source.continuous;
  const rpm = (w * 60) / (2 * Math.PI), outRpm = (outW * 60) / (2 * Math.PI);
  return { w, rpm, torque, outW, outRpm, outTorque, current,
    powerIn: torque * w, powerOut: Math.abs(outTorque * outW), inertia: rigInertia(r), stalled, overCurrent: over,
    says: stalled
      ? `it does not turn: at rest the load wants ${((r.load.torqueAt(0) * Math.abs(n)) / eta).toFixed(4)} N·m at the source's shaft and the source makes ${r.source.torqueAt(0).toFixed(4)} N·m — ${r.gearing ? 'a deeper reduction or a bigger source' : 'a reduction between them'} is wanted`
      : `it settles at ${rpm.toFixed(0)} rpm at the source and ${outRpm.toFixed(1)} rpm at the load, the source making ${torque.toFixed(4)} N·m${current !== null ? ` on ${current.toFixed(2)} A` : ''}, ${(torque * w).toFixed(1)} W in and ${Math.abs(outTorque * outW).toFixed(1)} W out${over ? ` — BUT ${current!.toFixed(2)} A is over its ${r.source.continuous} A continuous rating: it will run and then cook` : ''}` };
}

export interface Spun {
  t: number[]; rpm: number[]; outRpm: number[]; current: (number | null)[];
  end: Settled; /** time to 63% of where it settles, s */ rise: number; reached: number;
}

/** How fast the net torque falls away as the shaft speeds up, at its steepest over the whole range — the stiffness
 *  that sets how small a time step this drive needs. A motor's own curve is gentle; a fan's square law on the end
 *  of a reduction is not, and nothing about the sample rate someone asked for knows the difference. */
export function stiffness(r: Rig): number {
  const hi = Math.max(freeSpeed(r.source), 1e-6);
  let worst = 0;
  for (let i = 0; i <= 40; i++) {
    const w = (hi * i) / 40, h = Math.max(hi * 1e-6, 1e-9);
    worst = Math.max(worst, Math.abs((netTorque(r, w + h) - netTorque(r, Math.max(0, w - h))) / (w + h - Math.max(0, w - h))));
  }
  return worst;
}

/** It getting there, not just where it gets to: the inertia the gears really have sets how long a drive takes to
 *  come up to speed, and that is the number a ratio alone can never give.
 *
 *  THE STEP IS CHOSEN, NOT TAKEN FROM THE CALLER. Asked for 400 samples over ten seconds, the first version of
 *  this stepped 25 ms at a time — and a hand crank on a fan, whose time constant is a fifth of a millisecond,
 *  overshot to 2000 rad/s on the first step, came back negative on the second, and sat at zero for ten seconds
 *  reporting that the drive never span up. The sample grid is what the caller wants to SEE; the step is what the
 *  drive's own stiffness allows, and the two have nothing to do with each other. motorrun.ts already knew this
 *  and paced itself by the motor's mechanical time constant; this does the same from the whole rig's. */
export function spinUp(r: Rig, seconds: number, steps = 400): Spun {
  const J = rigInertia(r), end = settle(r), n = r.gearing?.ratio ?? 1;
  const dt = seconds / steps, out: Spun = { t: [], rpm: [], outRpm: [], current: [], end, rise: NaN, reached: 0 };
  const k = stiffness(r), tau = k > 0 ? J / k : Infinity;
  const sub = Math.min(4096, Math.max(1, Math.ceil(dt / (tau / 20))));
  const h = dt / sub;
  let w = 0;
  for (let i = 0; i <= steps; i++) {
    const t = i * dt;
    out.t.push(t); out.rpm.push((w * 60) / (2 * Math.PI)); out.outRpm.push((n * w * 60) / (2 * Math.PI));
    out.current.push(r.source.currentAt ? r.source.currentAt(w) : null);
    if (Number.isNaN(out.rise) && end.w > 0 && w >= 0.632 * end.w) out.rise = t;
    if (i === steps) break;
    for (let j = 0; j < sub; j++) {
      const k1 = netTorque(r, w) / J, k2 = netTorque(r, Math.max(0, w + (k1 * h) / 2)) / J;
      w = Math.max(0, w + k2 * h);
    }
  }
  out.reached = end.w > 0 ? w / end.w : 0;
  if (Number.isNaN(out.rise)) out.rise = seconds;
  return out;
}

/** A motor bolted to a train someone placed, driving something. Every way it can be wrong, said rather than
 *  assumed: the shaft not fitting the bore, the train not going round, the load stalling it, the current cooking
 *  it. This is the one call that makes the three islands one machine. */
export function driveLine(o: {
  motor: MotorData; V?: number; places: Placed[]; driver: string; out: string; load: Load;
  /** the friction on the teeth — about 0.05 with oil, 0.15 dry. Given, the mesh loss is derived rather than typical */
  mu?: number;
}): { rig: Rig; settled: Settled; gearing: Gearing | null; fit: string | null; teeth: ReturnType<typeof toothHolds>[] } {
  const faults: string[] = [];
  const source = motorSource(o.motor, { V: o.V, shaft: `${o.driver}-shaft` });
  const t = train(o.places, o.driver);
  const g = trainGearing(o.places, o.driver, o.out, t, o.mu);
  if (typeof g === 'string') faults.push(g);
  for (const r of t.refused) faults.push(`${r.a} and ${r.b} cannot mesh: ${r.why}`);
  for (const l of t.loose) faults.push(`${l.id} is driven by nothing: ${l.why}`);
  // THE MECHANICAL CONNECTION, not a shared word: the motor's own shaft into the driver gear's own bore.
  const first = o.places.find((p) => p.id === o.driver);
  let fit: string | null = null;
  if (first && source.shaftD !== undefined) {
    const s = shaftInBore(source.shaftD, sizesOf(first.gear).bore);
    if (typeof s === 'string') faults.push(s); else fit = s.says;
  }
  const gearing = typeof g === 'string' ? null : g;
  const rig: Rig = { source, gearing, load: o.load, faults };
  const settled = settle(rig);
  // EVERY gear, at the torque that is really on it — worst at standstill, where the motor makes its stall torque
  // and the pitch line is not yet moving to soften the blow. A drive that settles happily can still strip here.
  const teeth: ReturnType<typeof toothHolds>[] = [];
  const stall = train(o.places, o.driver, 0, source.torqueAt(0), 0);
  for (const p of o.places) {
    const on = stall.turn[p.id]?.torque;
    if (on === undefined || sizesOf(p.gear).kind === 'rack') continue;
    const v = toothHolds(p.gear, on, 0);
    teeth.push(v);
    if (!v.ok) faults.push(`${p.id}: ${v.says}`);
  }
  return { rig, settled, gearing, fit, teeth };
}

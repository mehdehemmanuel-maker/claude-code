// Arms from their makers' Denavit–Hartenberg tables: where every joint and the flange are for any joint angles, the
// angles that put the flange at a point with its tool pointing a way (found by damped least squares, from a seed, within
// each joint's limits), and a six-axis arm drawn as a housing at each joint and a tube along each link, each joint a
// group its program turns. A table is standard (each joint turning about its own z, the next frame d along it and a
// along the new x, then turned α about that x) or modified (Craig's: a along x and turned α about it first, then the
// joint turning about the new z, d along it: Franka's), of any number of joints, with a fixed tip past the last (its
// flange). First the UR5e (Universal Robots' figures); the Franka Research 3's seven joints are its own (./franka.ts).
// Owner of: arms by their DH tables (their kinematics, and the six-axis drawing). The Meca500, with its own closed-form
// inverse and drawing, stays in ./meca.ts.

import type { Part } from './kits';

export interface DH { d: number; a: number; alpha: number }
/** A chain of joints by its table (mm, rad): standard, or modified (`mdh`); its fixed tip past its last joint (a flange
 *  set off along it), each joint's limits (rad, low and high) and the pose it rests in, a seed for its inverse. */
export interface Chain { dh: DH[]; mdh?: boolean; tip?: DH; limits?: [number, number][]; home?: number[] }
/** An arm by its table (mm, rad) and how it is drawn: each joint's housing (its radius, and where it runs along its
 *  axis, from and to, mm: a wrist's covers its offset to the next joint), each link's tube (radius, mm), its base, its
 *  mass (kg) and colours, each figure's source. */
export interface DHArm extends Chain { id: string; name: string; housing: [number, number, number][]; tube: number[]; base: { r: number; h: number; foot?: { r: number; h: number }; bolts?: { n: number; pcd: number; words: string; torque: number } }; mass: number; flange: { r: number; h: number }; body: number; caps: number; src: string; leaves: string }
const PI = Math.PI;
export const UR5E: DHArm = {
  id: 'ur5e', name: 'Universal Robots UR5e',
  dh: [{ d: 162.5, a: 0, alpha: PI / 2 }, { d: 0, a: -425, alpha: 0 }, { d: 0, a: -392.2, alpha: 0 }, { d: 133.3, a: 0, alpha: PI / 2 }, { d: 99.7, a: 0, alpha: -PI / 2 }, { d: 99.6, a: 0, alpha: 0 }],
  housing: [[60, 40, 162.5], [60, -65, 65], [50, -56, 56], [45, -48, 133.3], [45, -48, 99.7], [45, -45, 91.6]], tube: [0, 45, 38, 0, 0, 0], base: { r: 58, h: 40, foot: { r: 74.5, h: 8 }, bolts: { n: 4, pcd: 132, words: 'screw M8x20', torque: 20 } }, mass: 18.4, flange: { r: 31.5, h: 8 },
  body: 0xd5d9dc, caps: 0x33373c,
  src: 'Universal Robots: its DH table (d1 162.5, a2 −425, a3 −392.2, d4 133.3, d5 99.7, d6 99.6 mm, as its fact sheet\'s drawing and the DH table quote them), its Ø 149 mm footprint, bolted down by four M8 8.8 bolts through 8.5 mm holes on a Ø 132 mm circle at 20 N·m (its user manual), its ISO 9409-1-50-4-M6 flange, 18.4 kg arm (20.6 kg with its cable)',
  leaves: 'its joint housings\' and tubes\' sizes and its foot\'s height estimates sized to its 149 mm footprint and 18.4 kg; its colours typical of its pictures (light grey arm, dark grey joint caps), not measured; its covers, cables, brakes and drives inside not drawn apart',
};
export const DH_ARMS: Record<string, DHArm> = { ur5e: UR5E };

type M4 = number[];
const mul = (A: M4, B: M4): M4 => { const C = new Array(16).fill(0); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) C[r * 4 + c] += A[r * 4 + k]! * B[k * 4 + c]!; return C; };
const I4: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
/** One joint's transform. Standard: turned θ about z, d along it, a along the new x, α about it. Modified: a along x,
 *  α about it, then θ about the new z and d along it. */
const step = (j: DH, th: number, mdh = false): M4 => {
  const ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(j.alpha), sa = Math.sin(j.alpha);
  return mdh ? [ct, -st, 0, j.a, st * ca, ct * ca, -sa, -sa * j.d, st * sa, ct * sa, ca, ca * j.d, 0, 0, 0, 1] : [ct, -st * ca, st * sa, j.a * ct, st, ct * ca, -ct * sa, j.a * st, 0, sa, ca, j.d, 0, 0, 0, 1];
};
/** Every joint's frame for joint angles q (rad), the base's first; the last is the flange (its z out of it), its tip's
 *  where it has one. */
export function fk(arm: Chain, q: number[]): M4[] {
  const out: M4[] = [I4]; let T = I4;
  arm.dh.forEach((j, i) => { T = mul(T, step(j, q[i] ?? 0, arm.mdh)); out.push(T); });
  if (arm.tip) out.push(mul(T, step(arm.tip, 0, arm.mdh)));
  return out;
}
/** The flange's point (mm) and the way its tool points (its z), for joint angles q. */
export function flangeOf(arm: Chain, q: number[]): { at: [number, number, number]; z: [number, number, number] } { const T = fk(arm, q).at(-1)!; return { at: [T[3]!, T[7]!, T[11]!], z: [T[2]!, T[6]!, T[10]!] }; }
/** Joint angles putting the flange at `at` (mm) with its tool pointing along `z` (a unit vector; none: any way), from
 *  `seed` (its rest pose if not said): damped least squares on the numerical Jacobian, each step limited and each joint
 *  kept within its limits. Its miss (mm, and degrees off the way) said, so a point out of reach is seen. */
export function ik(arm: Chain, at: [number, number, number], z: [number, number, number] | null, seed: number[] = arm.home ?? [0, -PI / 2, PI / 2, -PI / 2, -PI / 2, 0]): { q: number[]; miss: number; off: number } {
  // (the point first, from the seed with its base turned toward it; then the way the tool points as well, from there:
  // asked for both at once from far off, the pointing's pull stalls it)
  const s0 = [...seed]; s0[0] = Math.atan2(at[1], at[0]) - Math.atan2(flangeOf(arm, seed).at[1], flangeOf(arm, seed).at[0]) + seed[0]!;
  const near = z ? solve(arm, at, null, s0).q : s0; return solve(arm, at, z, near);
}
function solve(arm: Chain, at: [number, number, number], z: [number, number, number] | null, seed: number[]): { q: number[]; miss: number; off: number } {
  const N = arm.dh.length, lim = (k: number, v: number) => (arm.limits?.[k] ? Math.max(arm.limits[k]![0], Math.min(arm.limits[k]![1], v)) : v);
  const q = seed.slice(0, N).map((v, k) => lim(k, v)), err = (qq: number[]) => { const f = flangeOf(arm, qq), e = [at[0] - f.at[0], at[1] - f.at[1], at[2] - f.at[2]]; if (z) e.push(...[z[0] - f.z[0], z[1] - f.z[1], z[2] - f.z[2]].map((v) => v * 200)); return e; };
  for (let it = 0; it < 200; it++) {
    const e = err(q), n = e.length, J: number[][] = Array.from({ length: n }, () => new Array(N).fill(0)), h = 1e-5;
    if (Math.hypot(...e.slice(0, 3)) < 0.01 && (!z || Math.hypot(...e.slice(3)) < 0.02)) break;
    for (let k = 0; k < N; k++) { const qq = [...q]; qq[k]! += h; const e2 = err(qq); for (let r = 0; r < n; r++) J[r]![k] = (e[r]! - e2[r]!) / h; }
    // (Δq = Jᵀ (J Jᵀ + λ² I)⁻¹ e, solved by Gauss–Jordan on the small n×n system)
    const lam = 10, A = J.map((ri, r) => J.map((rj, c) => ri.reduce((s, v, k) => s + v * rj[k]!, 0) + (r === c ? lam * lam : 0))), b = [...e];
    for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r; [A[c], A[p]] = [A[p]!, A[c]!]; [b[c], b[p]] = [b[p]!, b[c]!]; for (let r = 0; r < n; r++) if (r !== c) { const f = A[r]![c]! / A[c]![c]!; for (let k = c; k < n; k++) A[r]![k]! -= f * A[c]![k]!; b[r]! -= f * b[c]!; } }
    const y = b.map((v, r) => v / A[r]![r]!);
    for (let k = 0; k < N; k++) { const d = J.reduce((s, row, r) => s + row[k]! * y[r]!, 0); q[k] = lim(k, q[k]! + Math.max(-0.2, Math.min(0.2, d))); }
  }
  const f = flangeOf(arm, q), miss = Math.hypot(at[0] - f.at[0], at[1] - f.at[1], at[2] - f.at[2]), off = z ? (Math.acos(Math.max(-1, Math.min(1, z[0] * f.z[0] + z[1] * f.z[1] + z[2] * f.z[2]))) * 180) / PI : 0;
  return { q, miss, off };
}

/** The arm drawn: its base on its footprint, then each joint a group (named "… joint k", turned about its own z by its
 *  program, by q[k] here if given) holding its housing and its link (a tube d along z, then a along x) and the next
 *  joint's frame, turned α; the flange last, and what is on it (a tool, in the flange's frame: z out of it). Drawn in
 *  the arm's own frame (z up), turned so it stands with y up. */
export function dhArmParts(arm: DHArm, nm = arm.name, q: number[] = [], tool: Part[] = []): Part[] {
  const mm = 0.001, body = { mat: 'al-6061', color: arm.body, finish: 'paint', fill: 0.42 }, cap = { mat: 'abs', color: arm.caps, finish: 'moulded' };
  const P = (name: string, shape: Part['shape'], o: Partial<Part>): Part => ({ name, shape, ...o } as Part);
  const tube = (name: string, r: number, from: [number, number, number], to: [number, number, number]): Part | null => {
    const d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], L = Math.hypot(d[0]!, d[1]!, d[2]!); if (L < 1 || r <= 0) return null;
    // (a cylinder is drawn along y: turned onto the link's direction, along x or z here)
    const rot: [number, number, number] = Math.abs(d[0]!) > Math.abs(d[2]!) ? [0, 0, PI / 2] : [PI / 2, 0, 0];
    return P(name, { cyl: [r * mm, L * mm] }, { ...body, at: [(from[0] + d[0]! / 2) * mm, (from[1] + d[1]! / 2) * mm, (from[2] + d[2]! / 2) * mm], rot });
  };
  let inner: Part[] = [P(`${nm} tool flange`, { cyl: [arm.flange.r * mm, arm.flange.h * mm] }, { mat: 'stainless-304', color: 0xbfc4c8, finish: 'brushed', item: 'robot-flange', at: [0, 0, -arm.flange.h / 2 * mm], rot: [PI / 2, 0, 0] }), ...tool];
  for (let k = arm.dh.length - 1; k >= 0; k--) {
    const j = arm.dh[k]!, [hr, z0, z1] = arm.housing[k]!, hl = z1 - z0, zc = (z0 + z1) / 2, parts: Part[] = [];
    // (its housing round its axis, z, from z0 to z1, a cap on each end its axis comes out of (a column's foot stands on
    // what is below it); its drive inside; its link from the axis out to the next joint)
    parts.push(P(`${nm} joint ${k + 1} housing`, { cyl: [hr * mm, hl * mm] }, { ...body, item: 'arm-casting', at: [0, 0, zc * mm], rot: [PI / 2, 0, 0] }));
    for (const z of k === 0 ? [z1] : [z0, z1]) parts.push(P(`${nm} joint ${k + 1} cap`, { cyl: [hr * 0.92 * mm, 6 * mm] }, { ...cap, at: [0, 0, (z + Math.sign(z - zc) * 3) * mm], rot: [PI / 2, 0, 0] }));
    parts.push(P(`${nm} joint ${k + 1} drive`, { cyl: [hr * 0.6 * mm, Math.min(hl, 90) * 0.6 * mm] }, { mat: 'steel-electrical', color: 0x55585c, finish: 'cast', fill: 0.5, item: 'joint-drive', at: [0, 0, (k === 0 ? z0 + 30 : 0) * mm], rot: [PI / 2, 0, 0], fixed: 'bolted inside its housing' }));
    const t1 = tube(`${nm} link ${k + 1}`, arm.tube[k] ?? 0, [0, 0, 0], [0, 0, j.d]), t2 = tube(`${nm} link ${k + 1} arm`, arm.tube[k] ?? 0, [0, 0, j.d], [j.a, 0, j.d]);
    for (const t of [t1, t2]) if (t) parts.push(t);
    const next: Part = { name: `${nm} frame ${k + 1}`, at: [j.a * mm, 0, j.d * mm], rot: [j.alpha, 0, 0], parts: inner } as Part;
    inner = [{ name: `${nm} joint ${k + 1}`, joint: 'bearing', fixed: `turning about its axis (joint ${k + 1})`, ...(q[k] ? { rot: [0, 0, q[k]!] } : {}), parts: [...parts, next] } as Part];
  }
  // (its base a body on a foot whose lip its bolts go down through: their heads on the lip, clear of the body)
  const { foot } = arm.base, f = foot?.h ?? 0;
  const base = P(nm, { cyl: [arm.base.r * mm, (arm.base.h - f) * mm] }, { ...body, item: 'arm-casting', at: [0, 0, (f + (arm.base.h - f) / 2) * mm], rot: [PI / 2, 0, 0], fixed: 'bolted to its table through its base' });
  const lip = foot ? [P(`${nm} foot`, { cyl: [foot.r * mm, foot.h * mm] }, { ...body, item: 'arm-casting', at: [0, 0, foot.h / 2 * mm], rot: [PI / 2, 0, 0], fixed: 'bolted to its table through its base' })] : [];
  return [{ name: `${nm} standing`, rot: [-PI / 2, 0, 0], parts: [base, ...lip, ...inner] } as Part];
}

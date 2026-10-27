// Parts placed by their mating faces. A part says where it can be met (src/nexus/kits.ts Port): a pattern of holes, of
// threads or of pins on one of its faces, of a thread size, often by a standard (a NEMA motor's face, an ISO 9409 robot
// flange, a wheel's bolt circle). Another part with the same pattern, seen from the other side, mates with it: holes
// onto threads take cap screws through the holes, holes onto holes take bolts with a washer and a nut, pins into holes
// take nuts. Seen from the other side a pattern is its own mirror, so two ports mate where one's pattern, mirrored and
// turned about the face, lands on the other's within a fifth of a millimetre: a square of four fits in four turns, a
// pattern that is not symmetric in one. The second part is then placed so the faces meet, square to each other, and the
// fasteners are laid from the component library (src/nexus/components.ts), each its length from the plies it clamps.
// So an assembly is not placed by hand: what meets is what mates, and nothing is put where it does not fit.
//
// And by their round faces: a part with a bore slid onto a round piece of another (a sprocket onto a cam's nose, a
// bearing onto its shaft, a pulley onto a crank), their axes made one, its fit said by what the bore and the shaft
// measure (`onto`); and a part bored wherever another passes through it (a pushrod's bore through a block, a bolt's
// through a plate), each hole cut in the pieces it runs through and no others (`boreThrough`).

import * as THREE from 'three';
import { boltedJoint, use } from './components';
import { METRIC, NEMA_FACE } from './families';
import type { Cut, Part, Port, Shape, V3 } from './kits';
import { piecesOf as boxesOf } from './form';

const TOL = 0.0002;
/** The standards' patterns, centres in metres: a NEMA motor's face (NEMA ICS 16: the four tapped holes on a square, the
 *  pilot boss), an ISO 9409-1 tool flange (holes on a circle), a wheel's bolt circle. */
export const STANDARD: Record<string, { thread: string; pattern: [number, number][]; pilot?: number; says: string }> = {};
const square = (side: number): [number, number][] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [(x! * side) / 2, (y! * side) / 2] as [number, number]);
const circle = (pcd: number, n: number, from = 0): [number, number][] => Array.from({ length: n }, (_, i) => [(pcd / 2) * Math.cos(from + (2 * Math.PI * i) / n), (pcd / 2) * Math.sin(from + (2 * Math.PI * i) / n)] as [number, number]);
for (const [n, f] of Object.entries(NEMA_FACE)) STANDARD[`NEMA ${n}`] = { thread: f.thread, pattern: square(f.holes / 1000), pilot: f.pilot / 1000, says: `NEMA ${n}: four ${f.thread} on a ${f.holes} mm square round a ${f.pilot} mm pilot (NEMA ICS 16)` };
/** ISO 9409-1 robot tool flanges by their name (pitch circle, number of holes, thread): the face a gripper or a tool bolts to. */
for (const [pcd, n, t] of [[31.5, 4, 'M5'], [40, 4, 'M6'], [50, 4, 'M6'], [63, 4, 'M6'], [80, 6, 'M8'], [100, 6, 'M8'], [125, 6, 'M10'], [160, 6, 'M10']] as [number, number, string][])
  STANDARD[`ISO 9409-1-${pcd}-${n}-${t}`] = { thread: t, pattern: circle(pcd / 1000, n, Math.PI / n), says: `ISO 9409-1: ${n} × ${t} on a ${pcd} mm pitch circle` };

// ---- the frame of a port, in the frame both parts are placed in ---------------------------------------------------------
const v = (a: V3) => new THREE.Vector3(...a);
const matOf = (p: Part) => new THREE.Matrix4().compose(v(p.at ?? [0, 0, 0]), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
interface Frame { o: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; w: THREE.Vector3 }
const frameOf = (p: Part, q: Port): Frame => { const m = matOf(p), r = new THREE.Matrix4().extractRotation(m), n = v(q.n).applyMatrix4(r).normalize(), u = v(q.u).applyMatrix4(r).normalize(); return { o: v(q.at).applyMatrix4(m), n, u, w: n.clone().cross(u) }; };

/** Whether two ports mate (their sexes, their threads, their patterns), and if so the turn about the first's face at which
 *  the second's pattern, mirrored, lands on the first's: or why they do not. */
export function fit(a: Port, b: Port): { turn: number } | string {
  const pair = [a.sex, b.sex].sort().join('+');
  if (!['holes+threads', 'holes+holes', 'holes+pins'].includes(pair)) return `${a.sex} do not take ${b.sex}`;
  if (a.thread.toLowerCase() !== b.thread.toLowerCase()) return `${a.thread} is not ${b.thread}`;
  if (a.pattern.length !== b.pattern.length || !a.pattern.length) return `${a.pattern.length} against ${b.pattern.length}`;
  // (b's point (r, φ) lands at angle θ - φ in a's face: the mirror, turned by θ)
  const [x0, y0] = b.pattern[0]!, r0 = Math.hypot(x0, y0), f0 = Math.atan2(y0, x0);
  for (const [xa, ya] of a.pattern) {
    if (Math.abs(Math.hypot(xa, ya) - r0) > TOL) continue;
    const th = Math.atan2(ya, xa) + f0, c = Math.cos(th), s = Math.sin(th);
    const lands = b.pattern.every(([x, y]) => a.pattern.some(([p, q]) => Math.hypot(x * c + y * s - p, x * s - y * c - q) < TOL));
    if (lands) return { turn: th };
  }
  return 'their patterns are not one another\'s mirror';
}

/** Places b so its port meets a's: its face on a's, square to it, its pattern on a's; and lays the fasteners that hold
 *  them, in the frame both are placed in. a and b are parts of one assembly (their at and rot in its frame). */
export function mate(a: Part, pa: string, b: Part, pb: string): { b: Part; fasteners: Part[]; passes: string[]; says: string } | string {
  const qa = a.ports?.find((q) => q.name === pa), qb = b.ports?.find((q) => q.name === pb);
  if (!qa || !qb) return `no port ${!qa ? `${pa} on the ${a.name}` : `${pb} on the ${b.name}`}`;
  const f = fit(qa, qb); if (typeof f === 'string') return `the ${b.name}'s ${pb} does not mate the ${a.name}'s ${pa}: ${f}`;
  const A = frameOf(a, qa), c = Math.cos(f.turn), s = Math.sin(f.turn);
  // (b's face turned to face a's: its normal against a's, its u turned by the fit about a's normal)
  const N = A.n.clone().negate(), U = A.u.clone().multiplyScalar(c).addScaledVector(A.w, s), W = N.clone().cross(U);
  const to = new THREE.Matrix4().makeBasis(U, W, N), from = new THREE.Matrix4().makeBasis(v(qb.u).normalize(), v(qb.n).normalize().cross(v(qb.u).normalize()), v(qb.n).normalize());
  const R = to.multiply(from.transpose()), q = new THREE.Quaternion().setFromRotationMatrix(R), e = new THREE.Euler().setFromQuaternion(q);
  const at = A.o.clone().sub(v(qb.at).applyQuaternion(q)), placed: Part = { ...b, at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z] };
  // the fasteners, at each of a's pattern points: from the holes' side, their heads on the back of the part with the holes
  const pts = qa.pattern.map(([x, y]) => A.o.clone().addScaledVector(A.u, x).addScaledVector(A.w, y)), out: Part[] = [];
  const holesB = qb.sex === 'holes', H = holesB ? qb : qa, other = holesB ? qa : qb, up = holesB ? A.n.clone() : N.clone(), back = holesB ? qb.t : qa.t, nm = holesB ? b.name : a.name;
  const T = METRIC[H.thread.replace(/x.*/, '')], d = Number(H.thread.slice(1).replace(/x.*/, '')), axis = (p: THREE.Vector3, words: string, more: Partial<Part>) => { const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up), ee = new THREE.Euler().setFromQuaternion(qq); return use(words, [p.x, p.y, p.z], { rot: [ee.x, ee.y, ee.z], ...more }); };
  let says: string;
  if (other.sex === 'threads') {
    // cap screws (ISO 4762) through the holes into the threads, engaged 1.5 d or as deep as the threads go, the shortest sold
    const L = [4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100].find((x) => x >= back * 1000 + Math.min(1.5 * d, other.t * 1000 - 0.5) - 0.01 && x <= back * 1000 + other.t * 1000 - 0.5) ?? Math.round(back * 1000 + Math.min(1.5 * d, other.t * 1000 - 0.5));
    for (const [i, p] of pts.entries()) out.push(axis(p.clone().addScaledVector(up, back), `screw ${H.thread}x${L}`, { name: `${nm} screw ${i + 1}`, fixed: `through the ${nm} into the ${holesB ? a.name : b.name}'s thread`, passes: [] }));
    says = `${pts.length} × ${H.thread} × ${L} cap screws through the ${nm} into the ${holesB ? a.name : b.name}`;
  } else if (other.sex === 'holes') {
    // through both: a bolt, a washer under its head and under its nut (src/nexus/components.ts boltedJoint's stack)
    if (!T) return `no metric thread ${H.thread}`;
    const grip = (qa.t + qb.t) * 1000;
    for (const [i, p] of pts.entries()) { const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up), ee = new THREE.Euler().setFromQuaternion(qq), at2 = p.clone().addScaledVector(up, back + T.h / 1000); out.push({ ...boltedJoint(H.thread, grip), name: `${nm} bolt ${i + 1}`, at: [at2.x, at2.y, at2.z], rot: [ee.x, ee.y, ee.z] }); }
    says = `${pts.length} bolts, washers and nuts through ${grip.toFixed(1)} mm`;
  } else {
    // pins through the holes: a nut on each, against the back of the part with the holes
    for (const [i, p] of pts.entries()) out.push(axis(p.clone().addScaledVector(up, back), `nut ${H.thread}`, { name: `${nm} nut ${i + 1}`, fixed: `run onto its pin against the ${nm} and torqued` }));
    says = `${pts.length} nuts on the ${a.name === nm ? b.name : a.name}'s pins`;
  }
  // (the holes drilled, the threads tapped, the pins' holes: in both parts, said, not drawn)
  // (and the two faces are meant to meet: each part's pieces join the other's)
  const names = out.flatMap((x) => [x.name, ...(x.parts ?? []).map((y) => y.name)]);
  const said = withRecords(placed, names, piecesOf(a));
  return { b: said, fasteners: out, passes: names, says: `the ${b.name}'s ${pb} on the ${a.name}'s ${pa}${qa.std ? ` (${qa.std})` : ''}: ${says}` };
}

/** A part's drawn pieces' names (itself where it is drawn whole). */
const piecesOf = (p: Part): string[] => { const out: string[] = []; const walk = (q: Part) => { if (q.shape) out.push(q.name); for (const r of q.parts ?? []) walk(r); }; walk(p); return [...new Set(out)]; };
/** A copy of a part, it and its drawn pieces passing these (its holes and threads, said) and joining those (the faces
 *  its mate meets): what is said of a part is said where it is drawn. */
function withRecords(p: Part, passes: string[], joins: string[]): Part {
  const add = (q: Part): Part => ({ ...q, passes: [...new Set([...(q.passes ?? []), ...passes])], ...(q.shape ? { joins: [...new Set([...(q.joins ?? []), ...joins])] } : {}), ...(q.parts ? { parts: q.parts.map(add) } : {}) });
  return add(p);
}
/** An assembly by its mates: the first part where it is, each next one placed on the first port of a part already placed
 *  that it mates, its fasteners laid; what mates nothing is said, not placed. */
export function assemble(name: string, parts: Part[]): { part: Part; mates: string[]; unplaced: string[] } {
  const [root, ...rest] = parts; if (!root) return { part: { name, at: [0, 0, 0], parts: [] }, mates: [], unplaced: [] };
  const placed: Part[] = [{ ...root, at: root.at ?? [0, 0, 0] }], extra: Part[] = [], mates: string[] = [], unplaced: string[] = [], used = new Set<string>();
  let todo = [...rest], progress = true;
  while (todo.length && progress) {
    progress = false;
    for (const b of [...todo]) {
      let done = false;
      for (const a of placed) { for (const qa of a.ports ?? []) { if (used.has(`${a.name}|${qa.name}`)) continue; for (const qb of b.ports ?? []) { if (used.has(`${b.name}|${qb.name}`) || typeof fit(qa, qb) === 'string') continue;
        const m = mate(a, qa.name, b, qb.name); if (typeof m === 'string') continue;
        const ai = placed.indexOf(a); placed[ai] = withRecords(a, m.passes, piecesOf(m.b)); placed.push(m.b); extra.push(...m.fasteners); mates.push(m.says); used.add(`${a.name}|${qa.name}`); used.add(`${b.name}|${qb.name}`); done = true; break; } if (done) break; } if (done) break; }
      if (done) { todo = todo.filter((x) => x !== b); progress = true; }
    }
  }
  unplaced.push(...todo.map((x) => `${x.name}: mates nothing placed (its ports: ${(x.ports ?? []).map((q) => `${q.name} ${q.sex} ${q.thread}`).join(', ') || 'none'})`));
  return { part: { name, at: [0, 0, 0], says: `${name}: ${mates.join('; ')}`, parts: [...placed, ...extra] }, mates, unplaced };
}

// ---- by their round faces -------------------------------------------------------------------------------------------------
const matrixOfPart = (p: Part) => new THREE.Matrix4().compose(v(p.at ?? [0, 0, 0]), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
/** Every drawn piece of a part with where it is in the part's frame (through every group it is in). */
function piecesIn(root: Part, m0 = new THREE.Matrix4()): { p: Part; m: THREE.Matrix4; path: number[] }[] {
  const out: { p: Part; m: THREE.Matrix4; path: number[] }[] = [];
  const walk = (p: Part, m: THREE.Matrix4, path: number[]) => { const mm = m.clone().multiply(matrixOfPart(p)); if (p.shape) out.push({ p, m: mm, path }); (p.parts ?? []).forEach((q, i) => walk(q, mm, [...path, i])); };
  walk(root, m0, []); return out;
}
/** A round piece's axis in its own frame (along its y: a cylinder's, a turned part's; along its z: an extruded part's),
 *  its two ends there, its outside radius and its bore (0 where it is solid). */
function roundOf(s: Shape, base?: boolean): { a: V3; b: V3; r: number; bore: number } | null {
  if ('cyl' in s) { const h = s.cyl[1], lo = base ? 0 : -h / 2; return { a: [0, lo, 0], b: [0, lo + h, 0], r: Math.max(s.cyl[0], s.cyl[2] ?? s.cyl[0]), bore: 0 }; }
  if ('lathe' in s) { const ys = s.lathe.map((q) => q[1]), xs = s.lathe.map((q) => q[0]); return { a: [0, Math.min(...ys), 0], b: [0, Math.max(...ys), 0], r: Math.max(...xs), bore: Math.min(...xs) }; }
  if ('prism' in s) { const L = s.prism.L, hole = s.prism.holes?.[0]; return { a: [0, 0, -L / 2], b: [0, 0, L / 2], r: Math.max(...s.prism.pts.map(([x, y]) => Math.hypot(x, y))), bore: hole ? Math.min(...hole.map(([x, y]) => Math.hypot(x, y))) * Math.cos(Math.PI / hole.length) : 0 }; }
  return null;
}
/** Where a part's bore is, in its own frame: the round piece of it with the narrowest hole through it (a gear's teeth, a
 *  bearing's inner ring, a pulley's hub): its axis's two ends and the hole's radius. */
export function boreOf(p: Part): { a: THREE.Vector3; b: THREE.Vector3; r: number; piece: string } | null {
  let best: { a: THREE.Vector3; b: THREE.Vector3; r: number; piece: string } | null = null;
  for (const n of piecesIn({ ...p, at: [0, 0, 0], rot: [0, 0, 0] })) { const q = roundOf(n.p.shape!, n.p.base); if (!q || q.bore <= 0) continue; if (!best || q.bore < best.r) best = { a: v(q.a).applyMatrix4(n.m), b: v(q.b).applyMatrix4(n.m), r: q.bore, piece: n.p.name }; }
  return best;
}
/** A shaft: the first round piece of a part named like `re` (a cam's nose, a crank's nose, an axle): its axis's two ends
 *  in the part's frame and its radius. */
export function shaftOf(p: Part, re: RegExp): { a: THREE.Vector3; b: THREE.Vector3; r: number; piece: string } | null {
  for (const n of piecesIn(p)) { if (!re.test(n.p.name)) continue; const q = roundOf(n.p.shape!, n.p.base); if (q) return { a: v(q.a).applyMatrix4(n.m), b: v(q.b).applyMatrix4(n.m), r: q.r, piece: n.p.name }; }
  return null;
}
export interface OntoFit { part: Part; gap: number; says: string }
/** A part slid onto a shaft of another: its bore's axis made the shaft's, its middle `from` the shaft's far end (b) by
 *  `inset` (or from its near end, a), turned `turn` about it; the fit by what the bore and shaft measure: a clearance
 *  (it slides on, keyed or clamped), or an interference (pressed or shrunk on). It and the shaft are said to pass one
 *  another where they meet. In the frame `on` is in. */
export function onto(on: Part, shaft: string | RegExp, it: Part, o: { from?: 'end' | 'start'; inset?: number; turn?: number } = {}): OntoFit | string {
  const re = typeof shaft === 'string' ? new RegExp(shaft, 'i') : shaft, S = shaftOf(on, re); if (!S) return `nothing round in the ${on.name} is named like "${shaft}"`;
  const Bo = boreOf(it); if (!Bo) return `the ${it.name} has no bore to go on with`;
  const gap = Bo.r - S.r; if (gap < -0.02 * S.r) return `the ${it.name}'s bore (${(2 * Bo.r * 1000).toFixed(2)} mm) is too small for the ${S.piece} (${(2 * S.r * 1000).toFixed(2)} mm): it would not go on`;
  // (its axis turned onto the shaft's, then about it; its bore's middle where it is to sit)
  const dS = S.b.clone().sub(S.a).normalize(), dB = Bo.b.clone().sub(Bo.a).normalize(), q = new THREE.Quaternion().setFromUnitVectors(dB, dS).premultiply(new THREE.Quaternion().setFromAxisAngle(dS, o.turn ?? 0));
  const end = o.from === 'start' ? S.a : S.b, into = o.from === 'start' ? dS : dS.clone().negate(), target = end.clone().addScaledVector(into, o.inset ?? 0), mid = Bo.a.clone().add(Bo.b).multiplyScalar(0.5).applyQuaternion(q);
  const at = target.sub(mid), e = new THREE.Euler().setFromQuaternion(q);
  const fit = gap >= 0 ? `a clearance of ${(gap * 2e6).toFixed(0)} µm across: it slides on, keyed or clamped${gap > 0.02 * S.r ? ' (loose: more than 4 % of the shaft, it would want a sleeve)' : ''}` : `an interference of ${(-gap * 2e6).toFixed(0)} µm across: pressed or shrunk on`;
  const part: Part = { ...it, at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z], passes: [...new Set([...(it.passes ?? []), S.piece])] };
  return { part, gap, says: `the ${it.name} on the ${S.piece}: its ${(2 * Bo.r * 1000).toFixed(2)} mm bore on ${(2 * S.r * 1000).toFixed(2)} mm, ${fit}` };
}
/** The line a part runs along (its longest way, through the middles of its pieces' boxes) and how far it reaches from
 *  that line, in the frame it is drawn in. */
export function lineOf(p: Part): { a: THREE.Vector3; b: THREE.Vector3; r: number } {
  const pts: THREE.Vector3[] = [];
  for (const n of piecesIn(p)) {
    const s = n.p.shape!, bx: { c: V3; u?: [V3, V3, V3]; h: V3 }[] = 'box' in s ? [{ c: [0, 0, 0], h: [s.box[0] / 2, s.box[1] / 2, s.box[2] / 2] }] : 'cyl' in s ? [{ c: [0, n.p.base ? s.cyl[1] / 2 : 0, 0], h: [s.cyl[0], s.cyl[1] / 2, s.cyl[0]] }] : 'loft' in s || 'tube' in s || 'lathe' in s || 'prism' in s || 'surf' in s ? boxesOf(s as never) : [];
    for (const b of bx) { const u = b.u ?? [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; pts.push(v(b.c).applyMatrix4(n.m)); for (let k = 0; k < 3; k++) for (const sg of [-1, 1]) pts.push(v(b.c).addScaledVector(v(u[k]!), sg * b.h[k]!).applyMatrix4(n.m)); }
  }
  const c = pts.reduce((a, q) => a.add(q), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, pts.length));
  // (its longest way: the covariance's first eigenvector, by power iteration)
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0]; for (const q of pts) { const d = q.clone().sub(c).toArray(); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) C[i * 3 + j]! += d[i]! * d[j]!; }
  let d = new THREE.Vector3(1, 0.7, 0.3).normalize(); for (let k = 0; k < 60; k++) { const n2 = new THREE.Vector3(C[0]! * d.x + C[1]! * d.y + C[2]! * d.z, C[3]! * d.x + C[4]! * d.y + C[5]! * d.z, C[6]! * d.x + C[7]! * d.y + C[8]! * d.z); if (n2.lengthSq() < 1e-30) break; d = n2.normalize(); }
  let lo = Infinity, hi = -Infinity, r = 0; for (const q of pts) { const t = q.clone().sub(c).dot(d); lo = Math.min(lo, t); hi = Math.max(hi, t); r = Math.max(r, q.clone().sub(c).addScaledVector(d, -t).length()); }
  return { a: c.clone().addScaledVector(d, lo), b: c.clone().addScaledVector(d, hi), r };
}
/** The run of a line from a to b inside a piece's shape's box (in its own frame): its two ends' parameters, or null. */
function runIn(s: Shape, base: boolean | undefined, a: THREE.Vector3, b: THREE.Vector3): [number, number] | null {
  let lo: number[], hi: number[];
  if ('box' in s) { lo = s.box.map((x) => -x / 2); hi = s.box.map((x) => x / 2); }
  else { const q = roundOf(s, base); if (!q) return null; const ax = q.a[1] !== q.b[1] ? 1 : 2; lo = [-q.r, -q.r, -q.r]; hi = [q.r, q.r, q.r]; lo[ax] = Math.min(q.a[ax]!, q.b[ax]!); hi[ax] = Math.max(q.a[ax]!, q.b[ax]!); }
  if ('box' in s && base) { lo[1] = 0; hi[1] = s.box[1]; }
  const d = b.clone().sub(a); let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) { const dk = d.getComponent(k), ak = a.getComponent(k); if (Math.abs(dk) < 1e-12) { if (ak < lo[k]! || ak > hi[k]!) return null; continue; } let ta = (lo[k]! - ak) / dk, tb = (hi[k]! - ak) / dk; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
  return t1 > t0 ? [t0, t1] : null;
}
/** A host bored wherever a guest passes through it: a hole along the guest's line, as wide as it reaches and the
 *  clearance more, cut in each piece of the host it runs through (and no other); the host said to pass it. Both in one
 *  frame. Says how many holes, in which pieces. */
export function boreThrough(host: Part, guest: Part, clearance = 0.0005): { part: Part; holes: string[]; says: string } {
  const L = lineOf(guest), r = L.r + clearance, holes: string[] = [];
  const cutFor = (p: Part, m: THREE.Matrix4): Cut | null => {
    if (!p.shape) return null; const inv = m.clone().invert(), a = L.a.clone().applyMatrix4(inv), b = L.b.clone().applyMatrix4(inv);
    // (the guest's line run on past its ends a little, so a hole it fills to its end is cut to the face)
    const d = b.clone().sub(a), ext = 0.002 / Math.max(1e-9, d.length()), A = a.clone().addScaledVector(d, -ext), Bb = b.clone().addScaledVector(d, ext), run = runIn(p.shape, p.base, A, Bb); if (!run) return null;
    const D = Bb.clone().sub(A), from = A.clone().addScaledVector(D, run[0]), to = A.clone().addScaledVector(D, run[1]), len = to.distanceTo(from); if (len < 1e-5) return null;
    const dir = to.clone().sub(from).normalize(); return { r, depth: len, at: from.toArray() as V3, dir: dir.toArray() as V3 };
  };
  const walk = (p: Part, m: THREE.Matrix4): Part => { const mm = m.clone().multiply(matrixOfPart(p)), c = cutFor(p, mm); if (c) holes.push(p.name); return { ...p, ...(c ? { cuts: [...(p.cuts ?? []), c] } : {}), ...(p.parts ? { parts: p.parts.map((q) => walk(q, mm)) } : {}) }; };
  // (the host's own place is the frame both are in: its pieces' places are taken from there)
  const kids = (host.parts ?? []).map((q) => walk(q, matrixOfPart(host))), c0 = cutFor(host, matrixOfPart(host)); if (c0) holes.unshift(host.name);
  const part: Part = { ...host, ...(c0 ? { cuts: [...(host.cuts ?? []), c0] } : {}), ...(host.parts ? { parts: kids } : {}), passes: [...new Set([...(host.passes ?? []), guest.name])] };
  return { part, holes, says: holes.length ? `${holes.length} hole${holes.length > 1 ? 's' : ''} of ${(2 * r * 1000).toFixed(1)} mm for the ${guest.name}, through ${[...new Set(holes)].join(', ')}` : `the ${guest.name} passes through nothing of the ${host.name}` };
}

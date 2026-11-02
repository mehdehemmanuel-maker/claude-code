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
import type { Cut, Keep, Part, Port, Shape, V3 } from './kits';
import { ROUND, piecesOf as boxesOf } from './form';
import { scopeOf, truth } from './generate';
import { CLEARANCE, INSERT, boreOf, engagementOf, frameOfAsking, matrixOfPart, negativeOf, piecesIn, roundOf, shaftOf, type Asking, type HostMeasure, type Measure, type Negative, type NegativeRow, type PlannedCheck, type Refusal, type ToolBody } from './interfaces';
import { soldLengths } from './catalogue';
export { boreOf, shaftOf };

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
  // (a pin into threads is a screw's or a stud's own interface meeting a tapped hole or an insert (spec 01, I8))
  if (!['holes+threads', 'holes+holes', 'holes+pins', 'pins+threads'].includes(pair)) return `${a.sex} do not take ${b.sex}`;
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

/** The fastener the catalogue sells for a stack of plies (spec 01, I10), and why: through them all, an ISO 4017 hex bolt
 *  with an ISO 7089 washer under its head and under its ISO 4032 nut, the shortest sold that leaves two pitches past the nut
 *  (typical practice); into a tapped last ply, an ISO 4762 cap screw engaged as far as Bossard's table asks for that ply's
 *  material (1.5 d, typical, where its material has no row), never deeper than the threads go less 0.5 mm; into a heat-set
 *  insert, a cap screw engaged its insert's length less 1 mm (typical), short of the insert's hole. Sizes in m. */
export interface Fastener { words: string; std: string; thread: string; L: number; nut?: string; washers: number; why: string[] }
export function fastenerFor(s: { thread: string; plies: number[]; how: 'through' | 'tapped' | 'insert'; host?: string; class?: '8.8' | '10.9' | '12.9' }): Fastener | Refusal {
  const T = METRIC[s.thread], d = Number(s.thread.slice(1)); if (!T) return { refused: true, rule: 'ISO 261', need: 0, have: 0, unit: '', source: 'ISO 261', why: `no metric thread ${s.thread}` };
  const mm = (x: number) => +(x * 1000).toFixed(3), plies = s.plies.map(mm), no = (rule: string, need: number, have: number, source: string, why: string): Refusal => ({ refused: true, rule, need: +need.toFixed(3), have: +have.toFixed(3), unit: 'mm', source, why });
  if (s.how === 'through') {
    const grip = plies.reduce((a, b) => a + b, 0), need = grip + 2 * T.h + T.m + 2 * T.p, sold = soldLengths('ISO 4017', s.thread), L = sold.find((x) => x >= need - 1e-9);
    if (L === undefined) return no('a length sold', need, sold.at(-1) ?? 0, 'ISO 4017', `${need.toFixed(1)} mm of bolt asked; ISO 4017 sells ${s.thread} up to ${sold.at(-1) ?? 0} mm`);
    return { words: `bolt ${s.thread}x${L}`, std: 'ISO 4017', thread: s.thread, L, nut: `nut ${s.thread}`, washers: 2, why: [`through ${plies.join(' + ')} = ${grip} mm of plies`, `an ISO 7089 washer under its head and under its nut, ${T.h} mm each`, `its ISO 4032 nut ${T.m} mm`, `two pitches past the nut, ${2 * T.p} mm (typical practice)`, `${need.toFixed(1)} mm: the shortest ISO 4017 length sold, ${L} mm`] };
  }
  const through = plies.slice(0, -1).reduce((a, b) => a + b, 0), last = plies.at(-1) ?? 0, sold = soldLengths('ISO 4762', s.thread);
  if (s.how === 'insert') { const ins = INSERT[s.thread]; if (!ins) return no('an insert', 0, 0, 'CNC Kitchen inserts', `no heat-set insert for ${s.thread}`);
    const lo = through + ins.L - 1, hi = through + Math.min(ins.depth, last), L = sold.find((x) => x >= lo - 1e-9 && x <= hi + 1e-9);
    if (L === undefined) return no('a length sold between', lo, hi, 'ISO 4762; CNC Kitchen inserts', `a cap screw of ${lo.toFixed(1)} to ${hi.toFixed(1)} mm asked (its ${ins.series}'s length less 1 mm, typical, short of its hole); ISO 4762 sells none between`);
    return { words: `screw ${s.thread}x${L}`, std: 'ISO 4762', thread: s.thread, L, washers: 0, why: [`through ${through} mm`, `into a ${ins.series} insert ${ins.L} mm long: engaged its length less 1 mm (typical), short of its ${ins.depth} mm hole`, `the shortest ISO 4762 length sold between, ${L} mm`] }; }
  const e = s.host ? engagementOf(s.host, s.class ?? '8.8') : null, want = (e?.k ?? 1.5) * d, eng = Math.min(want, last - 0.5), lo = through + eng, hi = through + last - 0.5, L = sold.find((x) => x >= lo - 0.01 && x <= hi + 1e-9);
  if (L === undefined) return no('a length sold between', lo, hi, 'ISO 4762', `a cap screw of ${lo.toFixed(1)} to ${hi.toFixed(1)} mm asked; ISO 4762 sells none between`);
  return { words: `screw ${s.thread}x${L}`, std: 'ISO 4762', thread: s.thread, L, washers: 0, why: [`through ${through} mm`, e ? `engaged ${want.toFixed(1)} mm (${e.why})` : `engaged ${want.toFixed(1)} mm (1.5 d, typical: no engagement row for its material)`, ...(eng < want ? [`only ${eng.toFixed(1)} mm: the threads go ${last} mm`] : []), `the shortest ISO 4762 length sold between ${lo.toFixed(1)} and ${hi.toFixed(1)} mm, ${L} mm`] };
}

/** Places b so its port meets a's: its face on a's, square to it, its pattern on a's; and lays the fasteners that hold
 *  them, in the frame both are placed in. a and b are parts of one assembly (their at and rot in its frame). */
export function mate(a: Part, pa: string, b: Part, pb: string): { b: Part; fasteners: Part[]; passes: string[]; says: string } | string {
  const qa = a.ports?.find((q) => q.name === pa), qb = b.ports?.find((q) => q.name === pb);
  if (!qa || !qb) return `no port ${!qa ? `${pa} on the ${a.name}` : `${pb} on the ${b.name}`}`;
  const f = fit(qa, qb); if (typeof f === 'string') return `the ${b.name}'s ${pb} does not mate the ${a.name}'s ${pa}: ${f}`;
  if ([qa.sex, qb.sex].sort().join('+') === 'pins+threads') return `the ${a.name}'s ${pa} and the ${b.name}'s ${pb} are a pin and threads: a fastener meets threads (fastenerFor); parts are mated through holes`;
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
    // cap screws (ISO 4762) through the holes into the threads, as fastenerFor chooses them (the tapped part's material's
    // engagement, or 1.5 d; never deeper than the threads go), the shortest sold
    const tapped = holesB ? a : b, ff = fastenerFor({ thread: H.thread.replace(/x.*/, ''), plies: [back, other.t], how: 'tapped', ...(tapped.mat ? { host: tapped.mat } : {}) });
    const L = 'refused' in ff ? Math.round(back * 1000 + Math.min(1.5 * d, other.t * 1000 - 0.5)) : ff.L;
    for (const [i, p] of pts.entries()) out.push(axis(p.clone().addScaledVector(up, back), `screw ${H.thread}x${L}`, { name: `${nm} screw ${i + 1}`, fixed: `through the ${nm} into the ${holesB ? a.name : b.name}'s thread`, passes: [] }));
    says = `${pts.length} × ${H.thread} × ${L} cap screws through the ${nm} into the ${holesB ? a.name : b.name}${'refused' in ff ? ` (${ff.why}: the nearest)` : `: ${ff.why.join('; ')}`}`;
  } else if (other.sex === 'holes') {
    // through both: a bolt, a washer under its head and under its nut (src/nexus/components.ts boltedJoint's stack)
    if (!T) return `no metric thread ${H.thread}`;
    const grip = (qa.t + qb.t) * 1000, ff = fastenerFor({ thread: H.thread, plies: [qa.t, qb.t], how: 'through' }); if ('refused' in ff) return ff.why;
    for (const [i, p] of pts.entries()) { const qq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up), ee = new THREE.Euler().setFromQuaternion(qq), at2 = p.clone().addScaledVector(up, back + T.h / 1000); out.push({ ...boltedJoint(H.thread, grip), name: `${nm} bolt ${i + 1}`, at: [at2.x, at2.y, at2.z], rot: [ee.x, ee.y, ee.z] }); }
    says = `${pts.length} ${ff.words} bolts (${ff.std}), washers and nuts through ${grip.toFixed(1)} mm: ${ff.why.join('; ')}`;
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
/** A piece's shape's box in its own frame (a round piece's from its axis and radius), or null. */
function boxIn(s: Shape, base: boolean | undefined): [number[], number[]] | null {
  let lo: number[], hi: number[];
  if ('box' in s) { lo = s.box.map((x) => -x / 2); hi = s.box.map((x) => x / 2); }
  else { const q = roundOf(s, base); if (!q) return null; const ax = q.a[1] !== q.b[1] ? 1 : 2; lo = [-q.r, -q.r, -q.r]; hi = [q.r, q.r, q.r]; lo[ax] = Math.min(q.a[ax]!, q.b[ax]!); hi[ax] = Math.max(q.a[ax]!, q.b[ax]!); }
  if ('box' in s && base) { lo[1] = 0; hi[1] = s.box[1]; }
  return [lo, hi];
}
/** The run of a line from a to b inside a piece's shape's box (in its own frame): its two ends' parameters, or null. */
function runIn(s: Shape, base: boolean | undefined, a: THREE.Vector3, b: THREE.Vector3): [number, number] | null {
  const bx = boxIn(s, base); if (!bx) return null; const [lo, hi] = bx;
  const d = b.clone().sub(a); let t0 = 0, t1 = 1;
  for (let k = 0; k < 3; k++) { const dk = d.getComponent(k), ak = a.getComponent(k); if (Math.abs(dk) < 1e-12) { if (ak < lo[k]! || ak > hi[k]!) return null; continue; } let ta = (lo[k]! - ak) / dk, tb = (hi[k]! - ak) / dk; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
  return t1 > t0 ? [t0, t1] : null;
}
/** A host bored wherever a guest passes through it: a hole along the guest's line, as wide as it reaches and the
 *  clearance more, cut in each piece of the host it runs through (and no other); the host said to pass it. Both in one
 *  frame. Says how many holes, in which pieces. */
export function boreThrough(host: Part, guest: Part, clearance = 0.0005): { part: Part; holes: string[]; says: string } {
  // (a fastener's hole is its standard's: ISO 273 medium for its thread, read from its name ("M8 × 30 hex bolt", "bolt
  // M8x30"); anything else, as wide as it reaches and the clearance more (spec 01, I10))
  const th = /\bM(\d+(?:\.\d+)?)\b/.exec(guest.name)?.[0], std = th && /\b(bolt|screw|stud|pin)\b/i.test(guest.name) ? CLEARANCE[th] : undefined;
  const L = lineOf(guest), r = std ? std.medium / 2000 : L.r + clearance, holes: string[] = [];
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
  return { part, holes, says: holes.length ? `${holes.length} hole${holes.length > 1 ? 's' : ''} of ${(2 * r * 1000).toFixed(1)} mm${std ? ` (ISO 273 medium for ${th})` : ''} for the ${guest.name}, through ${[...new Set(holes)].join(', ')}` : `the ${guest.name} passes through nothing of the ${host.name}` };
}

/** Where a line from a to b runs through a piece's material (in its own frame), as parameters along it: exact for a box
 *  and for a prism (its section's polygon, its holes too, along its length, z from −L/2 to L/2), the box of the rest. */
function materialRuns(s: Shape, base: boolean | undefined, a: THREE.Vector3, b: THREE.Vector3): [number, number][] {
  if (!('prism' in s)) { const r = runIn(s, base, a, b); return r ? [r] : []; }
  const { pts, L, holes } = s.prism, d = b.clone().sub(a);
  let t0 = 0, t1 = 1; if (Math.abs(d.z) < 1e-12) { if (a.z < -L / 2 || a.z > L / 2) return []; } else { let ta = (-L / 2 - a.z) / d.z, tb = (L / 2 - a.z) / d.z; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); }
  if (t1 <= t0) return [];
  const rings = [pts, ...(holes ?? [])], inside = (x: number, y: number) => { let n = 0; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i]!, [xj, yj] = r[j]!; if ((yi! > y) !== (yj! > y) && x < ((xj! - xi!) * (y - yi!)) / (yj! - yi!) + xi!) n++; } return n % 2 === 1; };
  const ts = [t0, t1]; for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i]!, [xj, yj] = r[j]!, ex = xj! - xi!, ey = yj! - yi!, den = d.x * ey - d.y * ex; if (Math.abs(den) < 1e-15) continue;
    const t = ((xi! - a.x) * ey - (yi! - a.y) * ex) / den, u = ((xi! - a.x) * d.y - (yi! - a.y) * d.x) / den; if (u >= 0 && u <= 1 && t > t0 && t < t1) ts.push(t); }
  ts.sort((x, y) => x - y); const out: [number, number][] = [];
  for (let i = 1; i < ts.length; i++) { const m = (ts[i - 1]! + ts[i]!) / 2; if (ts[i]! - ts[i - 1]! > 1e-9 && inside(a.x + d.x * m, a.y + d.y * m)) { const last = out[out.length - 1]; if (last && Math.abs(last[1] - ts[i - 1]!) < 1e-9) last[1] = ts[i]!; else out.push([ts[i - 1]!, ts[i]!]); } }
  return out;
}

/** Every bolted joint in a thing bores the plies in its grip (fault D14: frame rails, gussets and brackets were drawn with
 *  their bolts through them and no hole): what lies between the washer under its head and the washer under its nut is
 *  what it clamps, so each piece there gets a clearance hole on the bolt's line (ISO 273 medium, `CLEARANCE` in interfaces.ts), and no piece
 *  past its washers is bored (a shank run on into something else is still a clash). A piece already holed on that line is
 *  left as it is. A joint is a group holding a washer under its head and one under its nut (`boltedJoint`). Nothing is
 *  changed in place: the pieces holed and the groups over them are new. */
export function boreGrips(root: Part): { part: Part; holes: number; joints: number } {
  const mmm = 1e-3, under = (p: Part, re: RegExp) => p.parts?.find((q) => re.test(q.name));
  const jointOf = (p: Part) => { const hw = under(p, /washer under the head$/), nw = under(p, /washer under the nut$/), th = hw && /^(M[\d.]+) /.exec(hw.name)?.[1], T = th ? METRIC[th] : undefined;
    return hw && nw && th && T ? { top: (hw.at?.[1] ?? 0) + T.h * mmm, y0: hw.at?.[1] ?? 0, y1: (nw.at?.[1] ?? 0) + T.h * mmm, bottom: nw.at?.[1] ?? 0, r: ((CLEARANCE[th]?.medium ?? Number(th.slice(1)) * 1.1) * mmm) / 2 } : null; };
  // (each joint's line from the face its head's washer bears on to the far face of its nut's washer, and where along it
  // its grip begins and ends: a piece whose material runs on into a washer's seat is not seated as a ply, and is left
  // unbored, its clash shown (bored, a washer drawn inside a rail's web was hidden: 2026-11-01))
  const joints: { a: THREE.Vector3; b: THREE.Vector3; g0: number; g1: number; r: number; box: THREE.Box3 }[] = [];
  const scan = (p: Part, m: THREE.Matrix4) => { const mm = m.clone().multiply(matrixOfPart(p)), j = jointOf(p);
    if (j) { const a = new THREE.Vector3(0, j.top, 0).applyMatrix4(mm), b = new THREE.Vector3(0, j.bottom, 0).applyMatrix4(mm), span = j.top - j.bottom;
      joints.push({ a, b, g0: (j.top - j.y0) / span, g1: (j.top - j.y1) / span, r: j.r, box: new THREE.Box3().setFromPoints([a, b]).expandByScalar(j.r) }); return; }
    for (const q of p.parts ?? []) scan(q, mm); };
  scan(root, new THREE.Matrix4());
  let holes = 0;
  const walk = (p: Part, m: THREE.Matrix4): Part => { const mm = m.clone().multiply(matrixOfPart(p));
    if (jointOf(p)) return p;
    let cuts = p.cuts; const bx = p.shape && joints.length ? boxIn(p.shape, p.base) : null;
    if (bx) { const wb = new THREE.Box3(); for (let k = 0; k < 8; k++) wb.expandByPoint(new THREE.Vector3(bx[k & 1 ? 1 : 0][0]!, bx[k & 2 ? 1 : 0][1]!, bx[k & 4 ? 1 : 0][2]!).applyMatrix4(mm));
      const inv = mm.clone().invert();
      for (const j of joints) { if (!j.box.intersectsBox(wb)) continue; const A = j.a.clone().applyMatrix4(inv), B = j.b.clone().applyMatrix4(inv), runs = materialRuns(p.shape!, p.base, A, B); if (!runs.length) continue;
        const Lj = A.distanceTo(B), seat = 0.0003 / Math.max(Lj, 1e-9); // (a ply touching a washer's face is seated; one into it by 0.3 mm is not)
        if (runs.some(([u0, u1]) => u0 < j.g0 - seat || u1 > j.g1 + seat)) continue;
        const lo = Math.max(0, Math.min(...runs.map((x) => x[0])) - 0.001 / Lj), hi = Math.min(1, Math.max(...runs.map((x) => x[1])) + 0.001 / Lj);
        const D = B.clone().sub(A), from = A.clone().addScaledVector(D, lo), to = A.clone().addScaledVector(D, hi), len = to.distanceTo(from); if (len < 1e-5) continue;
        const dir = to.clone().sub(from).normalize(), r = j.r;
        if ((cuts ?? []).some((c) => { const cd = new THREE.Vector3(...c.dir).normalize(); if (Math.abs(cd.dot(dir)) < 0.9998) return false; const rel = from.clone().sub(new THREE.Vector3(...c.at)); return rel.sub(cd.multiplyScalar(rel.dot(cd))).length() < Math.max(c.r, r); })) continue;
        cuts = [...(cuts ?? []), { r, depth: len, at: from.toArray() as V3, dir: dir.toArray() as V3 }]; holes++; } }
    return { ...p, ...(cuts !== p.cuts ? { cuts } : {}), ...(p.parts ? { parts: p.parts.map((q) => walk(q, mm)) } : {}) };
  };
  return { part: walk(root, new THREE.Matrix4()), holes, joints: joints.length };
}

// ---- any outline onto any surface ---------------------------------------------------------------------------------------
export interface OntoSurface { piece: Part; tiles: number; missed: number; /** the most any tile's corner stands off the surface under it (+ clear of it, − into it), m */ gap: number; area: number; says: string }
/** Where a ray first meets a thing's drawn surface (its pieces as the viewer draws them, only those whose box it crosses),
 *  and the surface's normal there, facing the ray. */
export function rayOnto(nodes: { m: THREE.Matrix4; box: THREE.Box3 | null; mesh: () => THREE.Mesh | null }[], from: THREE.Vector3, dir: THREE.Vector3): { at: THREE.Vector3; n: THREE.Vector3; d: number } | null {
  const ray = new THREE.Ray(from, dir), rc = new THREE.Raycaster(from, dir, 0, 100); let best: THREE.Intersection | null = null;
  for (const q of nodes) { if (!q.box || !ray.intersectsBox(q.box)) continue; const mesh = q.mesh(); if (!mesh) continue; const hit = rc.intersectObject(mesh, false)[0]; if (hit && (!best || hit.distance < best.distance)) best = hit; }
  if (!best?.face) return null; const n = best.face.normal.clone().transformDirection(best.object.matrixWorld); if (n.dot(dir) > 0) n.negate();
  return { at: best.point.clone(), n, d: best.distance };
}
/** The part of a polygon inside a rectangle (Sutherland–Hodgman, one edge of the rectangle at a time). */
function clipRect(poly: [number, number][], x0: number, y0: number, x1: number, y1: number): [number, number][] {
  let out = poly; const edge = (inside: (p: [number, number]) => boolean, cut: (a: [number, number], b: [number, number]) => [number, number]) => { const src = out; out = []; for (let i = 0; i < src.length; i++) { const a = src[i]!, b = src[(i + 1) % src.length]!; if (inside(b)) { if (!inside(a)) out.push(cut(a, b)); out.push(b); } else if (inside(a)) out.push(cut(a, b)); } };
  const atX = (x: number) => (a: [number, number], b: [number, number]): [number, number] => [x, a[1] + ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0])], atY = (y: number) => (a: [number, number], b: [number, number]): [number, number] => [a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]), y];
  edge((p) => p[0] >= x0, atX(x0)); if (out.length) edge((p) => p[0] <= x1, atX(x1)); if (out.length) edge((p) => p[1] >= y0, atY(y0)); if (out.length) edge((p) => p[1] <= y1, atY(y1));
  return out;
}
const areaOf = (p: [number, number][]) => p.reduce((a, q, i) => { const r = p[(i + 1) % p.length]!; return a + q[0] * r[1] - r[0] * q[1]; }, 0) / 2;
/** Any flat outline (a vent, a badge, a decal, a sign, a panel, an address number) laid onto any thing's surface: drawn in
 *  a plane looking along `toward` (its u to the right, its v up as `up` says, metres), cast onto the thing from `at`; in
 *  tiles `tile` across where asked, each set on the surface's tangent where its middle lands, so a large one follows a
 *  curved surface piecewise; `t` thick, standing `proud` off the surface (0: on it). Says how far the tiles' corners stand
 *  off the surface under them, so how well it follows it is measured, not assumed. */
export function ontoSurface(target: Part, outline: [number, number][], o: { at: V3; toward: V3; up?: V3; t: number; proud?: number; tile?: number; name: string; mat?: string; color?: number; finish?: string; item?: string; geometry: (s: Shape, mat?: string, make?: 'pressed', facets?: number) => THREE.BufferGeometry | null; layout: (p: Part) => { p: Part; m: THREE.Matrix4; box: THREE.Box3 | null }[] }): OntoSurface | string {
  if (outline.length < 3) return 'an outline needs three points or more';
  const D = new THREE.Vector3(...o.toward).normalize(), up0 = new THREE.Vector3(...(o.up ?? [0, 1, 0])), U = up0.clone().sub(D.clone().multiplyScalar(up0.dot(D))).normalize(), R = D.clone().cross(U).normalize();
  if (!Number.isFinite(U.x) || U.lengthSq() < 0.5) return 'its up is along its direction: give an up across it';
  const cache = new Map<object, THREE.Mesh | null>(), nodes = o.layout(target).filter((n) => n.p.shape).map((n) => ({ m: n.m, box: n.box, mesh: () => { let me = cache.get(n.p); if (me === undefined) { const g = o.geometry(n.p.shape!, n.p.mat, n.p.make, n.p.facets); me = g ? new THREE.Mesh(g) : null; if (me) { me.matrixAutoUpdate = false; me.matrixWorld.copy(n.m); } cache.set(n.p, me); } return me; } }));
  const A = new THREE.Vector3(...o.at), plane = (u: number, v: number) => A.clone().addScaledVector(R, u).addScaledVector(U, v);
  const xs = outline.map((p) => p[0]), ys = outline.map((p) => p[1]), tile = o.tile ?? 0, area = Math.abs(areaOf(outline));
  const tiles: [number, number][][] = [];
  if (tile > 0) for (let x = Math.min(...xs); x < Math.max(...xs); x += tile) for (let y = Math.min(...ys); y < Math.max(...ys); y += tile) { const c = clipRect(outline, x, y, x + tile, y + tile); if (c.length >= 3 && Math.abs(areaOf(c)) > 1e-8) tiles.push(c); }
  else tiles.push(outline);
  const parts: Part[] = []; let missed = 0, gap = 0;
  for (const tl of tiles) {
    const a2 = areaOf(tl), cx = tl.reduce((s, p, i) => { const q = tl[(i + 1) % tl.length]!; return s + (p[0] + q[0]) * (p[0] * q[1] - q[0] * p[1]); }, 0) / (6 * a2), cy = tl.reduce((s, p, i) => { const q = tl[(i + 1) % tl.length]!; return s + (p[1] + q[1]) * (p[0] * q[1] - q[0] * p[1]); }, 0) / (6 * a2);
    const hit = rayOnto(nodes, plane(cx, cy).addScaledVector(D, -1), D); if (!hit) { missed++; continue; }
    const N = hit.n, X = R.clone().sub(N.clone().multiplyScalar(R.dot(N))).normalize(), Y = N.clone().cross(X), proud = o.proud ?? 0;
    // (how far each corner of the tile, on its tangent plane, stands off the surface beneath it)
    for (const p of tl) { const c = hit.at.clone().addScaledVector(X, p[0] - cx).addScaledVector(Y, p[1] - cy), h = rayOnto(nodes, c.clone().addScaledVector(N, 0.05), N.clone().negate()); if (h) { const g = 0.05 - h.d; if (Math.abs(g) > Math.abs(gap)) gap = g; } }
    const e = new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, N), 'XYZ'), at = hit.at.clone().addScaledVector(N, proud + o.t / 2);
    parts.push({ name: o.name, shape: { prism: { pts: tl.map((p): [number, number] => [p[0] - cx, p[1] - cy]), L: o.t } }, at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z], ...(o.mat ? { mat: o.mat } : {}), ...(o.color !== undefined ? { color: o.color } : {}), ...(o.finish ? { finish: o.finish } : {}), ...(o.item ? { item: o.item } : {}) } as Part);
  }
  if (!parts.length) return `it lands on nothing: nothing of the ${target.name} lies along ${o.toward.join(', ')} from ${o.at.join(', ')}`;
  const piece: Part = parts.length === 1 ? parts[0]! : { name: o.name, ...(o.item ? { item: o.item } : {}), parts };
  return { piece, tiles: parts.length, missed, gap, area, says: `${o.name}: ${(area * 1e4).toFixed(0)} cm² laid onto the ${target.name} in ${parts.length} ${parts.length === 1 ? 'piece' : 'tiles'}${missed ? ` (${missed} over nothing, left out)` : ''}, ${(o.t * 1000).toFixed(1)} mm thick; its corners within ${(Math.abs(gap) * 1000).toFixed(1)} mm of the surface` };
}

// ---- imprint: an interface stood on any point of any surface (spec 01, I6; design §2.4, step 1) -------------------------
/** Where a ray first meets a thing's surface, and the frame an interface stands in there: `at` on the surface, `n` its
 *  outward normal (the hole runs along −n, into the host), `u` laid along the piece's own first axis as it lies in the
 *  surface (a box's x, a cylinder's or a turned part's axis on its side; its x on its end), turned about `n` by `turn`.
 *  Boxes, plain cylinders (r2 unsaid), spheres and turned parts are met exactly, in their own frames (a faceted mesh misses a
 *  curved side by more than a tenth of a millimetre); any other shape by its drawn mesh (`geometry`, the views' own), its normal from the mesh's own normals
 *  blended across the triangle met. In the thing's frame; null where the ray meets nothing. */
export function standOn(host: Part, from: V3, dir: V3, o: { turn?: number; geometry?: (s: Shape) => THREE.BufferGeometry | null } = {}): { at: V3; n: V3; u: V3; piece: string; exact: boolean } | null {
  const O = new THREE.Vector3(...from), D = new THREE.Vector3(...dir).normalize();
  let best: { t: number; at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; piece: string; exact: boolean } | null = null;
  for (const q of piecesIn(host)) {
    const s = q.p.shape!, inv = q.m.clone().invert(), o2 = O.clone().applyMatrix4(inv), d2 = D.clone().transformDirection(inv), sc = D.clone().applyMatrix3(new THREE.Matrix3().setFromMatrix4(inv)).length();
    const hits: { t: number; n: THREE.Vector3; u: THREE.Vector3 }[] = [];
    if ('box' in s) { const h = s.box.map((x) => x / 2), lo = q.p.base ? [-h[0]!, 0, -h[2]!] : h.map((x) => -x), hi = q.p.base ? [h[0]!, s.box[1], h[2]!] : h;
      for (let k = 0; k < 3; k++) for (const side of [-1, 1]) { const dk = d2.getComponent(k); if (Math.abs(dk) < 1e-12) continue; const plane = side < 0 ? lo[k]! : hi[k]!, t = (plane - o2.getComponent(k)) / dk; if (t <= 0) continue;
        const p = o2.clone().addScaledVector(d2, t); if ([0, 1, 2].every((j) => j === k || (p.getComponent(j) >= lo[j]! - 1e-12 && p.getComponent(j) <= hi[j]! + 1e-12))) { const n = new THREE.Vector3().setComponent(k, side); hits.push({ t, n, u: k === 0 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0) }); } } }
    else if ('cyl' in s && (s.cyl[2] === undefined || s.cyl[2] === s.cyl[0])) { const [r, hh] = s.cyl, y0 = q.p.base ? 0 : -hh / 2, y1 = y0 + hh;
      const a = d2.x ** 2 + d2.z ** 2, b = 2 * (o2.x * d2.x + o2.z * d2.z), c = o2.x ** 2 + o2.z ** 2 - r * r, disc = b * b - 4 * a * c;
      if (a > 1e-18 && disc >= 0) for (const t of [(-b - Math.sqrt(disc)) / (2 * a), (-b + Math.sqrt(disc)) / (2 * a)]) { if (t <= 0) continue; const p = o2.clone().addScaledVector(d2, t); if (p.y >= y0 - 1e-12 && p.y <= y1 + 1e-12) hits.push({ t, n: new THREE.Vector3(p.x, 0, p.z).normalize(), u: new THREE.Vector3(0, 1, 0) }); }
      for (const [y, ny] of [[y0, -1], [y1, 1]] as const) { if (Math.abs(d2.y) < 1e-12) continue; const t = (y - o2.y) / d2.y; if (t <= 0) continue; const p = o2.clone().addScaledVector(d2, t); if (p.x ** 2 + p.z ** 2 <= r * r + 1e-15) hits.push({ t, n: new THREE.Vector3(0, ny, 0), u: new THREE.Vector3(1, 0, 0) }); } }
    else if ('sphere' in s) { const r = s.sphere, b = 2 * o2.dot(d2), c = o2.lengthSq() - r * r, disc = b * b - 4 * d2.lengthSq() * c;
      if (disc >= 0) for (const t of [(-b - Math.sqrt(disc)) / (2 * d2.lengthSq()), (-b + Math.sqrt(disc)) / (2 * d2.lengthSq())]) if (t > 0) { const p = o2.clone().addScaledVector(d2, t), n = p.clone().normalize(); hits.push({ t, n, u: new THREE.Vector3(0, 1, 0).sub(n.clone().multiplyScalar(n.y)).lengthSq() > 1e-9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0) }); } }
    // (a turned part met exactly, each segment of its profile the cone, cylinder or flat ring it turns into (a quadratic for
    // each), its ends closed to the axis as its solid is (brep.ts): the drawn mesh's facets put a 30 mm bore's corners
    // 0.04 mm off, more than a keyway's lead is held to (the I17 rows). Its normal faces the ray, as a mesh's does)
    else if ('lathe' in s) { let pr = s.lathe.map(([r, y]) => [Math.max(0, r), y] as [number, number]); const first = pr[0]!, last = pr[pr.length - 1]!;
      if (!(first[0] === last[0] && first[1] === last[1])) { if (last[0] > 0) pr = [...pr, [0, last[1]]]; if (first[0] > 0) pr = [[0, first[1]], ...pr]; }
      const face = (t: number, nn: THREE.Vector3) => { if (nn.dot(d2) > 0) nn.negate(); hits.push({ t, n: nn.normalize(), u: new THREE.Vector3(0, 1, 0) }); };
      for (let i = 0; i + 1 < pr.length; i++) { const [r0, y0] = pr[i]!, [r1, y1] = pr[i + 1]!; if (Math.hypot(r1 - r0, y1 - y0) < 1e-12 || (r0 === 0 && r1 === 0)) continue;
        if (Math.abs(y1 - y0) < 1e-12) { if (Math.abs(d2.y) < 1e-15) continue; const t = (y0 - o2.y) / d2.y; if (t <= 0) continue; const p = o2.clone().addScaledVector(d2, t), rho = Math.hypot(p.x, p.z); if (rho >= Math.min(r0, r1) - 1e-12 && rho <= Math.max(r0, r1) + 1e-12) face(t, new THREE.Vector3(0, 1, 0)); continue; }
        const b = (r1 - r0) / (y1 - y0), a0 = r0 - b * y0, k = a0 + b * o2.y, A = d2.x ** 2 + d2.z ** 2 - b * b * d2.y ** 2, B = 2 * (o2.x * d2.x + o2.z * d2.z - b * d2.y * k), C = o2.x ** 2 + o2.z ** 2 - k * k;
        const ts = Math.abs(A) < 1e-15 ? (Math.abs(B) < 1e-15 ? [] : [-C / B]) : (() => { const disc = B * B - 4 * A * C; return disc < 0 ? [] : [(-B - Math.sqrt(disc)) / (2 * A), (-B + Math.sqrt(disc)) / (2 * A)]; })();
        for (const t of ts) { if (t <= 0) continue; const p = o2.clone().addScaledVector(d2, t); if (p.y < Math.min(y0, y1) - 1e-12 || p.y > Math.max(y0, y1) + 1e-12 || a0 + b * p.y < -1e-12) continue; face(t, new THREE.Vector3(p.x, -b * (a0 + b * p.y), p.z)); } } }
    // (both sides of each triangle met: a profile drawn top-down winds its triangles inward, and a front-only ray went
    // through to the far wall (the evaluator, 2026-11-01); each vertex normal made unit before they are blended)
    else if (o.geometry) { const g = o.geometry(s); if (g) { const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), hit = new THREE.Raycaster(o2, d2.clone().normalize()).intersectObject(mesh, false)[0];
      if (hit?.face) { const nn = g.attributes.normal, f = hit.face, bc = hit.barycoord, vn = (i: number) => new THREE.Vector3().fromBufferAttribute(nn as THREE.BufferAttribute, i).normalize(); const n = nn && bc ? vn(f.a).multiplyScalar(bc.x).add(vn(f.b).multiplyScalar(bc.y)).add(vn(f.c).multiplyScalar(bc.z)).normalize() : f.normal.clone();
        if (n.dot(d2) > 0) n.negate(); hits.push({ t: hit.distance / d2.length(), n, u: 'lathe' in s || 'cyl' in s ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0) }); } } }
    for (const h of hits) {
      const tw = h.t / sc; if (best && tw >= best.t) continue; // (the ray's length in the thing's frame: the piece may be scaled)
      const nW = h.n.clone().transformDirection(q.m), at = o2.clone().addScaledVector(d2, h.t).applyMatrix4(q.m);
      // (a round piece's u along its own axis, so a keyway lies along it and not around it; on an end face, where that is
      // nothing, x as it lies in the face; where x is the normal, z (the zero frame of a lathe hit along x: the I17 spec))
      let u = h.u.clone().transformDirection(q.m); u.sub(nW.clone().multiplyScalar(u.dot(nW))); if (u.lengthSq() < 1e-12) u = new THREE.Vector3(1, 0, 0).sub(nW.clone().multiplyScalar(nW.x)); if (u.lengthSq() < 1e-12) u = new THREE.Vector3(0, 0, 1).sub(nW.clone().multiplyScalar(nW.z)); u.normalize();
      if (o.turn) u.applyAxisAngle(nW, o.turn);
      best = { t: tw, at, n: nW, u, piece: q.p.name, exact: 'box' in s || 'sphere' in s || 'lathe' in s || ('cyl' in s && (s.cyl[2] === undefined || s.cyl[2] === s.cyl[0])) };
    }
  }
  return best ? { at: best.at.toArray() as V3, n: best.n.toArray() as V3, u: best.u.toArray() as V3, piece: best.piece, exact: best.exact } : null;
}

// ---- the checks before cutting (spec 01, I7; design §2.4, step 3) -------------------------------------------------------
export interface CutCheck { check: string; ok: boolean; need: number; have: number; unit: 'mm'; rule: string; source: string; /** false where its `when` does not hold there: recorded, not asked */ applies?: boolean }
export interface Imprinted { frame: { at: V3; n: V3; u: V3 }; piece: string; path: number[]; turn: number; asking: Asking; negative: Negative; checks: CutCheck[];
  /** the host as measured where it stood: its depth along the line, its span along u and where that span's middle lies from
   *  the point (m), the free way out along n (Infinity where nothing is met) */ measured: HostMeasure;
  /** how far each of the negative's section tools starts out in front of the point stood on, so its outline meets the
   *  surface all round (a slot in a bore: the bore falls away under its corners), m; 0 for any other tool */ lead: number[] }
/** What the imprint measures on the host, by a check's measure (I17): each answers what was found (m) against what the
 *  check asks, once or once for each of the piece's other cuts. */
interface Measuring { at: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; v: THREE.Vector3; depth: number; q: { p: Part; m: THREE.Matrix4 }; host: Part; neg: Negative;
  hit: (from: THREE.Vector3, dir: THREE.Vector3) => THREE.Vector3 | null; widest: number; /** the remove tools' outlines in the face (along u, along w), a turned one as its widest circle */ outline: [number, number][] }
type Found = { have: number; need: number; ok: boolean; rule?: string };
const lineOff = (x: Measuring, c: Cut) => { const ca = new THREE.Vector3(...c.at).applyMatrix4(x.q.m), cd = new THREE.Vector3(...c.dir).transformDirection(x.q.m), rel = x.at.clone().sub(ca); return rel.sub(cd.clone().multiplyScalar(rel.dot(cd))); };
const within = (have: number, need: number | undefined, most: number | undefined): Found => { const lo = need === undefined || have >= need - 1e-9, hi = most === undefined || have <= most + 1e-9; return { have, need: !hi ? most! : need ?? most ?? have, ok: lo && hi }; };
const MEASURE: Record<Measure, (c: PlannedCheck, x: Measuring) => Found[]> = {
  // (settled where the negative was made, from what it was asked and the host's measures)
  value: (c) => [within(c.done?.have ?? NaN, typeof c.need === 'number' ? c.need : undefined, c.most)],
  // (from the line at a depth, rays across it in twelve directions find the nearest edge of the piece. From 'outline': a ray
  // from the line toward each point of the cut's outline, how far the piece runs on past the point (a slot on a shaft: a ray
  // across the slot's middle leaves the shaft's side long before the slot's far end, and the slot is whole; its reach set
  // against the ray along each direction refused it (the I17 rows)). A ray that meets nothing: the line is not within the
  // piece there (a ray grazing its face, a hole at its edge): no wall at all, never an endless one (the AI pasted onto an
  // angle's corner: 2026-11-01))
  across: (c, x) => { if (Array.isArray(c.need)) throw new Error(`${c.check}: a need along two ways is a spacing's`); const mid = x.at.clone().addScaledVector(x.n, -(c.at ?? x.depth / 2)); let least = Infinity;
    if (c.from === 'outline' && x.outline.length) for (const [a, b] of x.outline) { const L = Math.hypot(a, b); if (L < 1e-12) continue; const h = x.hit(mid, x.u.clone().multiplyScalar(a / L).addScaledVector(x.v, b / L)); least = Math.min(least, (h ? h.distanceTo(mid) : 0) - L); }
    else for (let k = 0; k < 12; k++) { const th = (k * Math.PI) / 6, h = x.hit(mid, x.u.clone().multiplyScalar(Math.cos(th)).addScaledVector(x.v, Math.sin(th))); least = Math.min(least, h ? h.distanceTo(mid) : 0); }
    return [within(least, c.need ?? 0, c.most)]; },
  // (from each of the piece's other cuts, its line: one distance, or one along u and one along w where both are asked
  // and one is enough)
  spacing: (c, x) => (x.q.p.cuts ?? []).map((cut) => { const rel = lineOff(x, cut);
    if (Array.isArray(c.need)) { const [pu, pw] = c.need, du = Math.abs(rel.dot(x.u)), dw = Math.abs(rel.dot(x.v)), byU = (pu > 0 ? du / pu : Infinity) >= (pw > 0 ? dw / pw : Infinity); return { have: byU ? du : dw, need: byU ? pu : pw, ok: du >= pu - 1e-9 || dw >= pw - 1e-9 }; }
    const off = rel.length(), need = c.need ?? 0; return { have: off, need, ok: off >= need - 1e-9 }; }),
  'breaking in': (c, x) => (x.q.p.cuts ?? []).map((cut) => { const off = lineOff(x, cut).length(), rc = Math.max(cut.r, ...(cut.prof ?? []).map((p) => p[0])); return { have: off, need: rc + x.widest, ok: off >= rc + x.widest }; }),
  // (the room each keep needs, out along n or behind the face, against the thing's other pieces' boxes)
  room: (c, x) => x.neg.tools.filter((k) => k.role === 'keep').map((k) => { const sg = k.along === '-n' ? -1 : 1, a = x.at.clone().addScaledVector(x.n, sg * 1e-4), b = x.at.clone().addScaledVector(x.n, sg * (k.length ?? 0)), box = new THREE.Box3().setFromPoints([a, b]).expandByScalar(k.r ?? 0);
    const other = piecesIn(x.host).find((y) => y.p !== x.q.p && !!y.p.shape && (() => { const bx = new THREE.Box3(); const s = y.p.shape!; const half = 'box' in s ? s.box.map((z) => z / 2) : null; if (!half) return false; for (let i = 0; i < 8; i++) bx.expandByPoint(new THREE.Vector3(i & 1 ? half[0]! : -half[0]!, i & 2 ? half[1]! : -half[1]!, i & 4 ? half[2]! : -half[2]!).applyMatrix4(y.m)); return bx.intersectsBox(box); })());
    return { have: other ? 0 : (k.length ?? 0), need: k.length ?? 0, ok: !other, rule: `${k.why.split(':')[0]}${other ? `: the ${other.p.name} is in it` : ''}` }; }),
};
/** An interface imprinted where a ray meets a host: stood on the surface (standOn; a seat on a shaft moved onto the axis of
 *  the round piece's end face met), the host measured there (its depth along the line, its span along u, the free way out
 *  along n), the negative made for the host's material and those measures (negativeOf), then checked before anything is cut:
 *  each check the negative asks, in its order, measured on the host by its measure (MEASURE: the edge distance across the
 *  line, the spacing from the piece's other cuts, that it breaks into none, the room its keep needs against the thing's other
 *  pieces, a value settled from the measures); a check whose `when` does not hold there is recorded as not applying. The
 *  first check that fails is the refusal, with its rule, the value needed and the value found; nothing is cut here (I8 cuts). */
export function imprint(host: Part, asking: Asking, from: V3, dir: V3, o: { turn?: number; fit?: 'fine' | 'medium' | 'coarse'; geometry?: (s: Shape) => THREE.BufferGeometry | null; /** rows given at run time, for a row asked by name */ rows?: Record<string, NegativeRow> } = {}): Imprinted | Refusal {
  let f = standOn(host, from, dir, o); if (!f) return { refused: true, rule: 'a surface to stand on', need: 0, have: 0, unit: '', source: '', why: 'the ray meets nothing of the host' };
  const q = piecesIn(host).find((x) => x.p.name === f!.piece)!, mm = 1e-3, inv = q.m.clone().invert(), solo: Part = { name: 'piece', parts: [{ ...q.p, parts: undefined, at: [0, 0, 0], rot: [0, 0, 0] }] };
  const hit = (p: THREE.Vector3, d: THREE.Vector3) => { const h = standOn(solo, p.clone().applyMatrix4(inv).toArray() as V3, d.clone().transformDirection(inv).toArray() as V3, o); return h ? new THREE.Vector3(...h.at).applyMatrix4(q.m) : null; };
  // (a seat on a shaft stands on its axis: the point met moved onto the axis of the round piece, on its end face)
  if (frameOfAsking(asking, o.rows) === 'axis') { const rd = q.p.shape ? roundOf(q.p.shape, q.p.base) : null, nn = new THREE.Vector3(...f.n);
    const ax = rd ? new THREE.Vector3(...rd.b).sub(new THREE.Vector3(...rd.a)).transformDirection(q.m) : null, off = ax ? (Math.acos(Math.min(1, Math.abs(nn.dot(ax)))) * 180) / Math.PI : 90;
    if (!rd || off > 0.5) return { refused: true, rule: 'the end face of a round piece', need: 0.5, have: +off.toFixed(2), unit: 'deg', source: '', why: rd ? `the face met is ${off.toFixed(1)}° off the ${q.p.name}'s axis: a seat on a shaft stands on the end face of a round piece` : `the ${q.p.name} is not round: a seat on a shaft stands on the end face of a round piece` };
    const A = new THREE.Vector3(...rd.a).applyMatrix4(q.m), p0 = new THREE.Vector3(...f.at); f = { ...f, at: A.clone().addScaledVector(ax!, p0.sub(A).dot(ax!)).toArray() as V3 }; }
  const at = new THREE.Vector3(...f.at), n = new THREE.Vector3(...f.n), u = new THREE.Vector3(...f.u), v = n.clone().cross(u).normalize();
  // (its depth: the far side met from beyond it, coming back along n)
  const farAt = hit(at.clone().addScaledVector(n, -10), n) ?? at, depth = at.distanceTo(farAt);
  // (its span along u through the point, just under the surface, and where that span's middle lies from the point; the free
  // way out along n, to whatever of the piece stands across it)
  const inside = at.clone().addScaledVector(n, -1e-5), ends = [u, u.clone().negate()].map((d) => hit(inside, d)), tp = ends[0] ? ends[0].distanceTo(inside) : NaN, tm = ends[1] ? ends[1].distanceTo(inside) : NaN;
  const out = hit(at.clone().addScaledVector(n, 1e-6), n), measured: HostMeasure = { material: q.p.mat ?? 'steel-low', thickness: depth, ...(Number.isFinite(tp + tm) ? { span: tp + tm, mid: (tp - tm) / 2 } : {}), free: out ? out.distanceTo(at) : Infinity };
  const neg = negativeOf(asking, measured, { ...(o.fit ? { fit: o.fit } : {}), ...(o.rows ? { rows: o.rows } : {}) }); if ('refused' in neg) return neg;
  const removes = neg.tools.filter((x) => x.role === 'remove'), radial = (x: ToolBody) => (x.sect ? Math.max(...x.sect.map(([a, b]) => Math.hypot(a, b))) : Math.max(0, ...(x.prof ?? []).map((p) => p[0])));
  const widest = removes.length ? Math.max(...removes.map(radial)) : 0, outline = removes.flatMap((t) => (t.sect ?? Array.from({ length: ROUND }, (_, i): [number, number] => [radial(t) * Math.cos((2 * Math.PI * i) / ROUND), radial(t) * Math.sin((2 * Math.PI * i) / ROUND)])).map(([a, b]): [number, number] => [a + (t.at?.[0] ?? 0), b + (t.at?.[2] ?? 0)]));
  const checks: CutCheck[] = [], put = (c: CutCheck) => { checks.push(c); return c.ok; }, at3 = (x: number) => +(x / mm).toFixed(3), x: Measuring = { at, n, u, v, depth, q, host, neg, hit, widest, outline };
  for (const c of neg.checks) for (const r of MEASURE[c.measure](c, x)) {
    const applies = !c.when || truth(c.when, scopeOf({ ...(neg.scope ?? {}), have: r.have }));
    if (!put({ check: c.check, ok: !applies || r.ok, need: at3(r.need), have: at3(r.have), unit: 'mm', rule: r.rule ?? c.rule, source: c.source, ...(applies ? {} : { applies: false }) })) return refusal(checks);
  }
  put({ check: 'depth', ok: true, need: at3(depth), have: at3(depth), unit: 'mm', rule: 'the negative made for the depth found', source: neg.mirror.std ?? '' });
  // (a section tool's lead: rays back along −n from points all along its outline's edges (a millimetre apart, not its corners alone: a square
  // slot through a hub has its corners a hair past the hub's ends, over nothing), from out in the free way (half of it, at
  // most 10 mm), find where the surface lies under it; the most it lies in front of the point stood on)
  const raise = Math.min((measured.free ?? Infinity) / 2, 0.01), along = (pts: [number, number][]) => pts.flatMap(([a, b], i) => { const [c, d] = pts[(i + 1) % pts.length]!, m = Math.max(1, Math.ceil(Math.hypot(c - a, d - b) / 0.001)); return Array.from({ length: m }, (_, k): [number, number] => [a + ((c - a) * k) / m, b + ((d - b) * k) / m]); });
  const lead = neg.tools.map((t) => { if (!t.sect) return 0; const P = at.clone().addScaledVector(u, t.at?.[0] ?? 0).addScaledVector(n, t.at?.[1] ?? 0).addScaledVector(v, t.at?.[2] ?? 0);
    return Math.max(0, ...along(t.sect).map(([a, b]) => { const p = P.clone().addScaledVector(u, a).addScaledVector(v, b), h = hit(p.clone().addScaledVector(n, raise), n.clone().negate()); return h ? h.sub(p).dot(n) : 0; })); });
  return { frame: { at: f.at, n: f.n, u: f.u }, piece: f.piece, path: q.path, turn: o.turn ?? 0, asking, negative: neg, checks, measured, lead };
}

/** An imprint applied (spec 01, I8; R9): its negative's remove bodies cut into the piece (turned cuts, its own frame), its
 *  keep bodies made the piece's keep zones, the mirror interface the piece gains made a port the fastener's finds by fit()
 *  (a clearance hole's holes, a tapped or insert hole's threads), and the imprint recorded on the piece. The thing is not
 *  changed in place: the piece and what holds it are new. */
export function applyImprint(host: Part, im: Imprinted, of: string): { part: Part; port: Port; says: string } {
  const q = piecesIn(host).find((x) => x.path.join('/') === im.path.join('/'))!, inv = q.m.clone().invert();
  const loc = (v: V3) => new THREE.Vector3(...v).applyMatrix4(inv), dirL = (v: V3) => new THREE.Vector3(...v).transformDirection(inv);
  const at = loc(im.frame.at), n = dirL(im.frame.n), u = dirL(im.frame.u), w = n.clone().cross(u).normalize(), neg = im.negative; // (w = n × u, as frameOf and mate() read a port)
  // (a tool's place in the interface's frame: x along u, y along n (the hole runs along −y), z across both)
  const place = (p?: V3) => at.clone().addScaledVector(u, p?.[0] ?? 0).addScaledVector(n, p?.[1] ?? 0).addScaledVector(w, p?.[2] ?? 0);
  // (a section tool: its outline cut its depth along −n, started its lead in front so it meets the surface all round, its
  // section's y flipped: the cut's own frame runs w = (−n) × u, the interface's the other way)
  const cuts: Cut[] = neg.tools.map((x, i) => ({ x, lead: im.lead?.[i] ?? 0 })).filter(({ x }) => x.role === 'remove').map(({ x, lead }): Cut => {
    if (x.sect) return { r: Math.max(...x.sect.map(([a, b]) => Math.hypot(a, b))), depth: (x.depth ?? 0) + lead, at: place(x.at).addScaledVector(n, lead).toArray() as V3, dir: n.clone().negate().toArray() as V3, u: u.toArray() as V3, sect: x.sect.map(([a, b]): [number, number] => [a, -b]) };
    const prof = x.prof!, rIn = Math.min(...prof.filter((p) => p[0] > 0).map((p) => p[0])), depth = Math.max(...prof.map((p) => p[1]));
    return { r: rIn, depth, at: place(x.at).toArray() as V3, dir: n.clone().negate().toArray() as V3, ...(prof.length === 2 && prof[0]![0] === prof[1]![0] ? {} : { prof }) }; });
  const keeps: Keep[] = neg.tools.filter((x) => x.role === 'keep').map((x) => { const a = place(x.at), b = a.clone().addScaledVector(n, (x.along === '-n' ? -1 : 1) * (x.length ?? 0)), box = new THREE.Box3().setFromPoints([a, b]).expandByScalar(x.r ?? 0), c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    return { name: `room for ${of}`, kind: 'box', at: c.toArray() as V3, size: sz.toArray() as V3, why: x.why }; });
  const holes = neg.tools.filter((x) => x.role === 'remove'), pattern: [number, number][] = holes.length > 1 ? holes.filter((x) => (x.at?.[0] ?? 0) !== 0 || (x.at?.[2] ?? 0) !== 0).map((x) => [x.at![0], x.at![2]]) : [[0, 0]];
  const thread = neg.mirror.takes ?? String(neg.mirror.size.thread ?? ''), sex: Port['sex'] = neg.mirror.sex ?? (neg.mirror.kind === 'hole.tapped' || neg.mirror.kind === 'hole.insert' ? 'threads' : 'holes');
  // (each imprinted port named apart: mate() and assemble() find a port by its name)
  const depth = neg.mirror.t ?? (holes.length ? Math.max(...holes.map((x) => (x.prof ? Math.max(...x.prof.map((p) => p[1])) : x.depth ?? 0))) : 0), taken = new Set((q.p.ports ?? []).map((x) => x.name)), base = `${of} (imprinted)`;
  let name = base; for (let k = 2; taken.has(name); k++) name = `${base} ${k}`;
  const port: Port = { name, sex, thread, pattern, at: at.toArray() as V3, n: n.toArray() as V3, u: u.toArray() as V3, t: depth };
  // (its face's query: its normal, near where it stood, and 'the farthest out along it' only where it was so: a face on a
  // step below another of the same normal keeps to its own step (the evaluator, 2026-11-01))
  const bx0 = q.p.shape ? boxIn(q.p.shape, q.p.base) : null, far0 = bx0 ? Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => new THREE.Vector3(bx0[k & 1 ? 1 : 0][0]!, bx0[k & 2 ? 1 : 0][1]!, bx0[k & 4 ? 1 : 0][2]!).dot(n))) : undefined, outmost = far0 !== undefined && at.dot(n) >= far0 - 1e-6;
  const rec = { of, at: port.at, n: port.n, u: port.u, turn: im.turn, mirror: neg.mirror.kind, port: name, why: neg.why, asking: im.asking, face: { normal: port.n, ...(outmost ? { extreme: 'max' as const } : {}), near: port.at, ...(Number.isFinite(im.measured?.free) ? { free: im.measured.free } : {}) }, made: { cuts, keep: keeps }, ...(neg.limits?.length ? { limits: neg.limits } : {}) };
  const swap = (p: Part, path: number[]): Part => path.length ? { ...p, parts: p.parts!.map((c, i) => (i === path[0] ? swap(c, path.slice(1)) : c)) } : { ...p, cuts: [...(p.cuts ?? []), ...cuts], keep: [...(p.keep ?? []), ...keeps], ports: [...(p.ports ?? []), port], imprints: [...(p.imprints ?? []), rec] };
  return { part: swap(host, q.path), port, says: `${cuts.length} cut${cuts.length > 1 ? 's' : ''} in the ${q.p.name} for ${of}, ${keeps.length} keep zone${keeps.length === 1 ? '' : 's'}; it gains ${sex} ${thread} (${neg.mirror.std ?? ''})` };
}
/** Every imprint on a thing made again where its face now is (spec 01, I9; R10): each imprint's cuts, keep zones and port
 *  taken off its piece, its face found again by what the face is, not by a number (the face whose normal is the one it
 *  stood on, the farthest out along it, met from outside at the point it stood over), and the imprint made there afresh
 *  from what asked it (its negative for the depth the piece now has, its checks run again). Where no face answers (the
 *  point no longer over the piece; the surface there facing otherwise; another face with that normal lying farther out),
 *  or the checks now refuse it, it is lost and said so, with why: never moved to some other face. */
export function reapplyImprints(host: Part, o: { geometry?: (s: Shape) => THREE.BufferGeometry | null; /** rows given at run time, for an imprint a row asked by name */ rows?: Record<string, NegativeRow> } = {}): { part: Part; kept: string[]; lost: { of: string; why: string }[] } {
  let part = host; const kept: string[] = [], lost: { of: string; why: string }[] = [];
  const at = (p: Part, path: number[]): Part => path.reduce((x, i) => x.parts![i]!, p);
  const swap = (p: Part, path: number[], f: (x: Part) => Part): Part => (path.length ? { ...p, parts: p.parts!.map((c, i) => (i === path[0] ? swap(c, path.slice(1), f) : c)) } : f(p));
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  // (a part that carries imprints and has no surface of its own now (made into sub-parts): each of them lost, said so)
  const walkAll = (p: Part, path: number[]): void => { if (!p.shape && p.imprints?.some((r) => !r.lost)) { for (const r of p.imprints.filter((x) => !x.lost)) lost.push({ of: r.of, why: 'the piece it stood on has no surface of its own now' }); part = swap(part, path, (x) => ({ ...x, imprints: (x.imprints ?? []).map((r) => (r.lost ? r : { ...r, lost: 'the piece it stood on has no surface of its own now' })) })); } (p.parts ?? []).forEach((c, i) => walkAll(c, [...path, i])); };
  walkAll(host, []);
  for (const q of piecesIn(host)) for (const rec of q.p.imprints ?? []) {
    if (rec.lost || !rec.face || !rec.asking || !rec.made) continue;
    // (off: its cuts, keep zones, port and record)
    part = swap(part, q.path, (p) => ({ ...p, cuts: (p.cuts ?? []).filter((c) => !rec.made!.cuts.some((m) => same(m, c))), keep: (p.keep ?? []).filter((k) => !rec.made!.keep.some((m) => same(m, k))), ports: (p.ports ?? []).filter((x) => x.name !== rec.port), imprints: (p.imprints ?? []).filter((x) => x !== rec) }));
    const piece = at(part, q.path), m = piecesIn(part).find((x) => x.path.join('/') === q.path.join('/'))!.m, n = new THREE.Vector3(...rec.face.normal).normalize(), near = new THREE.Vector3(...rec.face.near);
    // (from far out along its normal, or, for a face across a way of its own (a hub's bore), from half way across it: from
    // far out the ray met the hub's outside first, a face with the same normal)
    const solo: Part = { name: 'piece', parts: [{ ...piece, parts: undefined, at: [0, 0, 0], rot: [0, 0, 0] }] }, h = standOn(solo, near.clone().addScaledVector(n, Math.min(10, (rec.face.free ?? Infinity) / 2)).toArray() as V3, n.clone().negate().toArray() as V3, o);
    const loseIt = (why: string) => { lost.push({ of: rec.of, why }); part = swap(part, q.path, (p) => ({ ...p, imprints: [...(p.imprints ?? []), { ...rec, lost: why }] })); };
    if (!h) { loseIt('no face answers there: the point it stood over is off the piece now'); continue; }
    const hn = new THREE.Vector3(...h.n); if (hn.dot(n) < Math.cos((0.5 * Math.PI) / 180)) { loseIt(`the surface there faces otherwise now (${((Math.acos(Math.min(1, hn.dot(n))) * 180) / Math.PI).toFixed(1)}° from the face it stood on)`); continue; }
    const bx = boxIn(piece.shape!, piece.base); if (bx && rec.face.extreme === 'max') { const far = Math.max(...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => new THREE.Vector3(bx[k & 1 ? 1 : 0][0]!, bx[k & 2 ? 1 : 0][1]!, bx[k & 4 ? 1 : 0][2]!).dot(n))); if (new THREE.Vector3(...h.at).dot(n) < far - 1e-6) { loseIt('another face with its normal lies farther out: not the face it stood on, the farthest'); continue; } }
    // (the ray from just above its own face, a tenth of a millimetre: a piece over it (a lid) is not met first)
    const W = (v: THREE.Vector3) => v.applyMatrix4(m).toArray() as V3, from = W(new THREE.Vector3(...h.at).addScaledVector(n, 1e-4)), dir = n.clone().negate().transformDirection(m).toArray() as V3;
    const im = imprint(part, rec.asking as Asking, from, dir, { turn: rec.turn, ...(o.geometry ? { geometry: o.geometry } : {}), ...(o.rows ? { rows: o.rows } : {}) });
    if ('refused' in im) { loseIt(`its checks refuse it there now: ${im.why}`); continue; }
    // (and only on its own piece: another standing over it now is not its face (it hopped onto one: the evaluator, 2026-11-01))
    if (im.path.join('/') !== q.path.join('/')) { loseIt(`the ${im.piece} stands over it now: its own face is not the one met`); continue; }
    part = applyImprint(part, im, rec.of).part; kept.push(rec.of);
  }
  return { part, kept, lost };
}
/** How a part's own interface meets a port, by its kind: which way it mates (a bolt's thread and a shaft are pins; a bore
 *  takes them) and the mark its size is written with where it carries no thread of its own (I17). */
const PORT_OF: Record<string, { sex: Port['sex']; mark: string }> = { 'thread.external': { sex: 'pins', mark: 'M' }, shaft: { sex: 'pins', mark: 'Ø' }, bore: { sex: 'holes', mark: 'Ø' } };
/** A part's own interface as a port fit() reads: a bolt's or a screw's thread (its shank) as a pin of its size, where its
 *  head bears, along its shank; a shaft as a pin, a bore as a hole, each of its diameter. */
export function portOfInterface(it: { kind: string; size: Record<string, number | string>; frame: { at: V3; n: V3; u: V3 } | null; name?: string }): Port | null {
  const k = PORT_OF[it.kind]; if (!k || !it.frame) return null; const d = Number(it.size.d); if (!Number.isFinite(d)) return null;
  return { name: it.name ?? 'thread', sex: k.sex, thread: typeof it.size.thread === 'string' ? it.size.thread : `${k.mark}${+(d * 1000).toFixed(3)}`, pattern: [[0, 0]], at: it.frame.at, n: it.frame.n, u: it.frame.u, t: 0 };
}
const refusal = (checks: CutCheck[]): Refusal => { const c = checks[checks.length - 1]!; return { refused: true, rule: c.check, need: c.need, have: c.have, unit: c.unit, source: c.source, why: `${c.check} ${c.have} mm, ${c.rule} asks ${c.need} mm (${c.source})` }; };

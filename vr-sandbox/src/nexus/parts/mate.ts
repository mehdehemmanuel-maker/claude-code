// Parts placed by their mating faces. A part says where it can be met (src/nexus/parts/kits.ts Port): a pattern of holes, of
// threads or of pins on one of its faces, of a thread size, often by a standard (a NEMA motor's face, an ISO 9409 robot
// flange, a wheel's bolt circle). Another part with the same pattern, seen from the other side, mates with it: holes
// onto threads take cap screws through the holes, holes onto holes take bolts with a washer and a nut, pins into holes
// take nuts. Seen from the other side a pattern is its own mirror, so two ports mate where one's pattern, mirrored and
// turned about the face, lands on the other's within a fifth of a millimetre: a square of four fits in four turns, a
// pattern that is not symmetric in one. The second part is then placed so the faces meet, square to each other, and the
// fasteners are laid from the component library (src/nexus/parts/components.ts), each its length from the plies it clamps.
// So an assembly is not placed by hand: what meets is what mates, and nothing is put where it does not fit.

import * as THREE from 'three';
import { boltedJoint, use } from './components';
import { CLEAR } from './fab';
import { METRIC, NEMA_FACE } from './families';
import type { Part, Port, V3 } from './kits';

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
    // through both: a bolt, a washer under its head and under its nut (src/nexus/parts/components.ts boltedJoint's stack)
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

// ---- connectors read off the geometry, rather than declared -------------------------------------------------------------
// Twenty-eight parts in this library declare a port by hand, against nine thousand catalogue sizes, so a hand-declared
// port will never be how most parts mate. But a drilled pattern is already in the geometry: a `Cut` is a hole with a
// place, a direction, a radius and a depth (src/nexus/parts/kits.ts), and a ring or a row of equal cuts drilled the same
// way into the same face *is* a bolt pattern, whether or not anyone wrote one down. So it is read back out instead.
// What that buys is not 28 ports plus a few: a generator that drills holes gives every size it makes its own ports, so
// the rail, the block and the board cover their whole catalogue at once.
// Two holes are the fewest that can fix a turn, so a lone hole is not a pattern here and is left for a bore to own.

/** What a drilled hole of this radius takes. The rule is physical rather than clever: a through hole passes the
 *  largest metric screw it clears (ISO 273's medium series, so a 3.5 mm hole passes an M3 whose table size is 3.4),
 *  and a hole drawn at a thread's own nominal diameter is one tapped for that thread.
 *
 *  What this cannot do, said plainly because two attempts at it failed: this library draws tapped holes at three
 *  different diameters depending on the generator - the clearance size, the thread's major diameter, and its root
 *  diameter (`rootR` in src/nexus/kinds/plant.ts) - and those interleave. An M3 at its root is 2.459 mm and an M2.5 at
 *  its nominal is 2.5, so no reading of the radius tells them apart; the first attempt here called a NEMA 17's four
 *  tapped M3 holes "M2.5", and adding the root form to fix it flipped an MGN rail's Ø3.5 clearance holes to "M4
 *  tapped" instead. So where a generator uses the root form the derived thread is one size small, the port the part
 *  *declares* is the authority there, and the fix is one convention in the library rather than a third guess. */
function holeOf(r: number): { thread: string; sex: 'holes' | 'threads' } | null {
  const d = r * 2000;
  // a hole at a thread's own nominal diameter is tapped for it: that reading is exact, so it wins
  for (const t of Object.keys(CLEAR)) if (Math.abs(d - Number(t.slice(1))) < 0.08) return { thread: t, sex: 'threads' };
  // otherwise it passes the largest screw whose clearance hole is no bigger than it, drilled at most 0.2 mm over
  let best: string | null = null, size = 0;
  for (const [t, clear] of Object.entries(CLEAR)) if (clear <= d + 0.001 && d - clear <= 0.2 && clear > size) { size = clear; best = t; }
  return best ? { thread: best, sex: 'holes' } : null;
}

/** What a hole is for: what it says, where it says (`Cut.thread`), and only otherwise what its radius can bear. A
 *  declared thread is believed over the geometry because the geometry genuinely cannot tell - which is the whole
 *  reason the field exists. Its sex still comes from the radius: a hole drawn at or over its thread's clearance size
 *  is one a screw passes, anything tighter is one a screw threads into. */
function kindOf(h: { r: number; thread?: string }): { thread: string; sex: 'holes' | 'threads' } | null {
  if (!h.thread) return holeOf(h.r);
  const clear = CLEAR[h.thread];
  return { thread: h.thread, sex: clear !== undefined && h.r * 2000 >= clear - 0.05 ? 'holes' : 'threads' };
}

/** A unit vector across `n`, chosen from the world axis least along it, so the frame is the same every run. */
function across(n: THREE.Vector3): THREE.Vector3 {
  const ax = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  const pick = ax.reduce((a, b) => (Math.abs(a.dot(n)) <= Math.abs(b.dot(n)) ? a : b));
  return pick.clone().sub(n.clone().multiplyScalar(pick.dot(n))).normalize();
}

/** Every mating face this part's own drilled holes make, in the part's frame: holes of one size, drilled one way into
 *  one face, gathered into the pattern they are. A port that was declared is not replaced - this is what a part has
 *  *as well*, and `assemble` may use either. */
export function portsFrom(p: Part): Port[] {
  interface Hole { at: THREE.Vector3; dir: THREE.Vector3; r: number; depth: number; seat?: number; thread?: string }
  let holes: Hole[] = [];
  const walk = (q: Part, m: THREE.Matrix4): void => {
    const mm = m.clone().multiply(matOf(q)), rot = new THREE.Matrix4().extractRotation(mm);
    for (const c of q.cuts ?? []) holes.push({ at: v(c.at).applyMatrix4(mm), dir: v(c.dir).applyMatrix4(rot).normalize(), r: c.r, depth: c.depth, ...(c.thread ? { thread: c.thread } : {}) });
    for (const r of q.parts ?? []) walk(r, mm);
  };
  walk(p, new THREE.Matrix4());

  // A counterbore is one hole, not two. Cuts down the same axis are the same hole: the narrowest is the hole a screw
  // passes or threads into, the widest is the seat its head drops into. Read as two, the rail's counterbores came out
  // as an M3 pattern and an M5 pattern on one face, and only one of those is a thing you can bolt to.
  const axis = (h: Hole) => `${h.dir.toArray().map((x) => x.toFixed(3)).join(',')}|${h.at.clone().sub(h.dir.clone().multiplyScalar(h.at.dot(h.dir))).toArray().map((x) => x.toFixed(4)).join(',')}`;
  const coax = new Map<string, Hole[]>();
  for (const h of holes) { const k = axis(h); (coax.get(k) ?? coax.set(k, []).get(k)!).push(h); }
  holes = [...coax.values()].map((g) => {
    const thin = g.reduce((a, b) => (a.r <= b.r ? a : b)), wide = g.reduce((a, b) => (a.r >= b.r ? a : b));
    const said = g.find((x) => x.thread)?.thread;
    return { ...thin, depth: Math.max(...g.map((x) => x.depth)), ...(wide.r > thin.r ? { seat: wide.r } : {}), ...(said ? { thread: said } : {}) };
  });

  // one group a (direction, size, face): the face is where along the drilling direction the holes start.
  const key = (h: Hole) => `${h.dir.toArray().map((x) => x.toFixed(3)).join(',')}|${h.r.toFixed(5)}|${h.at.dot(h.dir).toFixed(4)}`;
  const groups = new Map<string, Hole[]>();
  for (const h of holes) { const k = key(h); (groups.get(k) ?? groups.set(k, []).get(k)!).push(h); }

  const out: Port[] = [];
  for (const [, g] of [...groups].sort(([a], [b]) => (a < b ? -1 : 1))) {
    if (g.length < 2) continue; // two holes are the fewest that can fix a turn; a lone one is a bore, not a pattern
    const kind = kindOf(g[0]!); if (!kind) continue;
    const dir = g[0]!.dir, n = dir.clone().negate(), u = across(n), w = n.clone().cross(u);
    const o = g.reduce((a, h) => a.add(h.at), new THREE.Vector3()).divideScalar(g.length);
    const pattern = g.map((h) => { const d = h.at.clone().sub(o); return [+d.dot(u).toFixed(6), +d.dot(w).toFixed(6)] as [number, number]; })
      .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    // a standard's pattern is named where ours lands on it in any turn about the face, to a tenth of a millimetre
    const std = Object.entries(STANDARD).find(([, sd]) => sd.thread === kind.thread && sd.pattern.length === pattern.length
      && [0, 1, 2, 3].some((t) => sd.pattern.every((q) => { const a = (t * Math.PI) / 2, qx = q[0] * Math.cos(a) - q[1] * Math.sin(a), qy = q[0] * Math.sin(a) + q[1] * Math.cos(a);
        return pattern.some((r) => Math.hypot(qx - r[0], qy - r[1]) < 0.0001); })))?.[0];
    out.push({ name: `${g.length} × ${kind.thread} read off its ${kind.sex === 'threads' ? 'tapped holes' : 'holes'}`,
      sex: kind.sex, thread: kind.thread, pattern, at: [o.x, o.y, o.z], n: [n.x, n.y, n.z], u: [u.x, u.y, u.z],
      t: Math.max(...g.map((h) => h.depth)), ...(std ? { std } : {}) });
  }
  return out;
}

/** Every drilled hole in this part that nothing can name: it says no thread and its radius is near no metric size. A
 *  hole nobody can name is a hole no part can be bolted to, so this is the list a round works down - by saying the
 *  thread where there is one, and by leaving it alone where the hole is genuinely not for a screw (a heater cartridge
 *  bore, a thermistor well, a shaft bore all belong here and are not faults). */
export function unnamedHoles(p: Part): { at: V3; r: number; depth: number }[] {
  const out: { at: V3; r: number; depth: number }[] = [];
  const walk = (q: Part): void => {
    for (const c of q.cuts ?? []) if (!kindOf(c)) out.push({ at: c.at, r: c.r, depth: c.depth });
    for (const r of q.parts ?? []) walk(r);
  };
  walk(p);
  return out;
}

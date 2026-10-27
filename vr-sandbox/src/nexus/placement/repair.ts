// The autopilot (docs/PLACEMENT.md, section 4; layer H: auto.loop, repair.library). A thing is checked by the rules; the
// findings are grouped into problems (a rule, the part at fault and the unit it harms or runs into); each problem is tried
// with the repairs the library holds for its rule, cheapest first: move the part (the placement solver), nudge it out of
// what it runs into, put a heat shield between. A repair is kept only if its problem is gone and the parts it changed have
// fewer findings than before (the guard); a problem no repair clears becomes a named task with why each repair failed.
// Nothing is typed by hand: what moves, where to, and what is made come from the rules, the maps and the needs.

import * as THREE from 'three';
import type { Part, V3 } from '../kits';
import { AMBIENT, HEAT_FALLOFF, MAX_SERVICE, rulesOf, trianglesOf, type Finding } from '../make/rules';
import { trisOf } from '../make/critic';
import { MeshBVH } from 'three-mesh-bvh';
import { layout, type Node } from '../make/space';
import { NEAR, needsOf } from './model';
import { placeOne } from './solve';
import { route, type Section } from './line';

export interface Problem { key: string; rule: Finding['rule']; a: string; b: string; findings: Finding[]; worst: Finding }
/** What a repair changed: the tree, the places in it to check again, and what it did. */
export interface Change { tree: Part; touched: string[]; did: string }
export interface Repair { id: string; name: string; rules: Finding['rule'][]; /** tried in this order, least first */ cost: number; says: string; run: (t: Part, p: Problem, o: { step?: number }) => Change | { no: string } }
export interface Attempt { problem: string; repair: string; kept: boolean; why: string; ms: number }
export interface Task { problem: string; findings: number; cause: string }
export interface AutoRun { tree: Part; before: number; after: number; problems: number; attempts: Attempt[]; tasks: Task[]; kept: string[]; ms: number; says: string }

// (places in a tree: "/12/3" is child 12, then its child 3)
const idx = (path: string) => path.split('/').filter(Boolean).map(Number);
const partAt = (root: Part, path: string): Part | undefined => idx(path).reduce<Part | undefined>((p, i) => p?.parts?.[i], root);
const unitOf = (path: string) => (path ? `/${idx(path)[0]}` : '');
const under = (path: string | undefined, u: string) => !!path && (path === u || path.startsWith(u + '/'));
const involves = (f: Finding, places: string[]) => places.some((u) => under(f.pa, u) || under(f.pb, u));
/** A tree with only the branches to these places (each kept whole), everything on the way kept as it is placed. */
export function prune(root: Part, places: string[]): Part {
  const ps = places.map(idx), walk = (p: Part, depth: number, live: number[][]): Part => {
    const kids: Part[] = []; (p.parts ?? []).forEach((q, i) => { const on = live.filter((x) => x[depth] === i); if (!on.length) return; kids.push(on.some((x) => x.length === depth + 1) ? q : walk(q, depth + 1, on)); });
    return { ...p, parts: kids };
  };
  return walk(root, 0, ps);
}
/** The tree with the part at a place replaced. */
function setAt(root: Part, path: string, by: Part): Part {
  const [i, ...rest] = idx(path); if (i === undefined) return by;
  const kids = [...(root.parts ?? [])]; kids[i] = rest.length ? setAt(kids[i]!, '/' + rest.join('/'), by) : by; return { ...root, parts: kids };
}

/** Findings as problems: the rule, the part at fault (a: the hot one, the one that runs into), and the unit of the other. */
export function problemsOf(fs: Finding[]): Problem[] {
  const by = new Map<string, Finding[]>();
  for (const f of fs) { const k = `${f.rule}|${f.pa ?? f.a}|${f.pb ? unitOf(f.pb) : f.b}`; (by.get(k) ?? by.set(k, []).get(k)!).push(f); }
  const badness = (f: Finding) => (f.need ? (f.need - (f.gap ?? 0)) / f.need : 1);
  return [...by].map(([key, findings]) => { const worst = findings.reduce((a, b) => (badness(b) > badness(a) ? b : a)); return { key, rule: worst.rule, a: worst.a, b: worst.b, findings, worst }; })
    .sort((x, y) => y.findings.length - x.findings.length);
}
const nameOf = (p: Problem) => `${p.rule}: the ${p.a} and the ${p.b}${p.findings.length > 1 ? ` (${p.findings.length} findings)` : ''}`;

// (what may be moved whole: not a line or a skin (routed or formed, not placed), not the engine, nothing that moves, nothing
// that faces something)
function whyFixed(root: Part, path: string): string | null {
  const p = partAt(root, path); if (!p) return 'not found';
  const sh = p.shape ? Object.keys(p.shape)[0] : ''; if (/^(tube|surf|loft)$/.test(sh ?? '')) return `the ${p.name} is a ${sh === 'tube' ? 'line, routed' : 'skin, formed'}, not placed`;
  if (p.item === 'engine-ice') return 'the engine is placed by the drivetrain';
  let moves = false; const walk = (q: Part) => { if (q.travel || q.clear) moves = true; (q.parts ?? []).forEach(walk); }; walk(p); if (moves) return `the ${p.name} moves`;
  const face = needsOf(prune(root, [path])).find((n) => n.kind === 'face'); if (face) return `the ${face.part} faces ${face.to}`;
  return null;
}
/** The smaller of two places first (by the box round what is there). */
function smallerFirst(root: Part, ns: Node[], paths: string[]): string[] {
  const vol = (path: string) => { const n = ns.find((x) => x.path === path); const s = n?.sub?.getSize(new THREE.Vector3()); return s ? s.x * s.y * s.z : Infinity; };
  void root; return [...new Set(paths)].sort((a, b) => vol(a) - vol(b));
}

/** Where a shield leaves the harmed part open to the heat: every vertex of what is at `pb` within reach of the hot part at
 *  `pa`, its line to the nearest point of the hot surface tried against the plate; the hottest of those it does not cover
 *  (°C), against its material's limit. The rules try only the nearest pair; a shield must cover all that is too hot. */
export function uncovered(t: Part, pa: string, pb: string, plate: { c: THREE.Vector3; n: THREE.Vector3; u: THREE.Vector3; w: THREE.Vector3; half: number }): { worst: number; limit: number; open: number } {
  // (each on its own, where it is: the hot pieces of the one, the pieces heat harms of the other)
  const hot = trianglesOf(prune(t, [pa])).filter((m) => (m.p.hot ?? m.node.parent?.p.hot ?? 0) > AMBIENT), harmed = trianglesOf(prune(t, [pb])).filter((m) => MAX_SERVICE[m.p.mat ?? ''] !== undefined && !(m.p.hot ?? m.node.parent?.p.hot));
  if (!hot.length || !harmed.length) return { worst: AMBIENT, limit: Infinity, open: 0 };
  const Th = Math.max(...hot.map((m) => m.p.hot ?? m.node.parent?.p.hot ?? 0)), pos: number[] = [];
  for (const m of hot) { const T = trisOf(m); for (let i = 0; i < T.n * 9; i++) pos.push(T.v[i]!); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); const bvh = new MeshBVH(g), hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 };
  let worst = AMBIENT, limit = Infinity, open = 0; const v = new THREE.Vector3(), reach = HEAT_FALLOFF * Math.log((Th - AMBIENT) / 1);
  for (const m of harmed) {
    const lim = MAX_SERVICE[m.p.mat!]!, T = trisOf(m); limit = Math.min(limit, lim);
    for (let i = 0; i < T.n * 3; i++) {
      v.set(T.v[i * 3]!, T.v[i * 3 + 1]!, T.v[i * 3 + 2]!); const r = bvh.closestPointToPoint(v, hit, 0, reach); if (!r) continue;
      const temp = AMBIENT + (Th - AMBIENT) * Math.exp(-r.distance / HEAT_FALLOFF); if (temp <= lim) continue;
      // (the line from it to the hot surface through the plate's plane, inside the plate?)
      const d = r.point.clone().sub(v), den = d.dot(plate.n); let covered = false;
      if (Math.abs(den) > 1e-9) { const s = plate.c.clone().sub(v).dot(plate.n) / den; if (s > 0 && s < 1) { const x = v.clone().addScaledVector(d, s).sub(plate.c); covered = Math.abs(x.dot(plate.u)) <= plate.half && Math.abs(x.dot(plate.w)) <= plate.half; } }
      if (!covered) { open++; worst = Math.max(worst, temp); }
    }
  }
  return { worst, limit, open };
}

/** The repairs, by the rule they answer, least costly first. */
export const REPAIRS: Repair[] = [
  { id: 'nudge', name: 'Nudge it clear', rules: ['interference', 'clearance'], cost: 1, says: 'the smaller of the two moved straight out along x, y or z, 1 mm, then 2, 4, 8, 16, 32, until the two no longer meet (the least move kept)',
    run: (t, pr) => {
      const f = pr.worst; if (!f.pa || !f.pb) return { no: 'the finding does not say where its parts are' };
      const ns = layout(t), steps = [0.001, 0.002, 0.004, 0.008, 0.016, 0.032], dirs = [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      for (const path of smallerFirst(t, ns, [f.pa, f.pb])) {
        const p = partAt(t, path)!, n = ns.find((x) => x.path === path), holder = n?.parent?.m ?? new THREE.Matrix4(), toLocal = new THREE.Matrix3().setFromMatrix4(holder).invert(), at0 = (p.at ?? [0, 0, 0]) as V3;
        for (const d of steps) for (const dir of dirs) {
          const v = new THREE.Vector3(...(dir as V3)).multiplyScalar(d).applyMatrix3(toLocal), moved = setAt(t, path, { ...p, at: [at0[0] + v.x, at0[1] + v.y, at0[2] + v.z] });
          const left = rulesOf(prune(moved, [f.pa, f.pb])).findings.filter((x) => x.rule === pr.rule && new Set([x.a, x.b]).has(f.a) && new Set([x.a, x.b]).has(f.b));
          if (!left.length) return { tree: moved, touched: [path], did: `the ${p.name} moved ${Math.round(d * 1000)} mm ${['up', 'down', 'forward', 'back', 'to the right', 'to the left'][dirs.indexOf(dir)]}` };
        }
      }
      return { no: 'no straight move of either up to 32 mm parts them' };
    } },
  { id: 'reroute', name: 'Route it again', rules: ['heat', 'clearance', 'interference'], cost: 1.5, says: 'a line (a hose, a cable, a pipe: a tube) routed again between its own two ends, each left the way it went, by the shortest way through free, cool space (route, its section read from the tube: its bore, its wall and its material)',
    run: (t, pr, o) => {
      const f = pr.worst, why: string[] = [], ns = layout(t);
      // (for heat, only what is harmed: the hot part is where it is for its own reasons)
      for (const path of (pr.rule === 'heat' ? [f.pb] : [f.pb, f.pa]).filter((x): x is string => !!x)) {
        const p = partAt(t, path), tube = p?.shape && 'tube' in p.shape ? p.shape.tube : null; if (!p || !tube) { why.push(`the ${p?.name ?? 'part'} is not a line`); continue; }
        const n = ns.find((x) => x.path === path); if (!n || tube.pts.length < 2) { why.push(`the ${p.name} has no ends`); continue; }
        const W = tube.pts.map((q) => new THREE.Vector3(...q).applyMatrix4(n.m)), last = W.length - 1, dirOut = (a: THREE.Vector3, b: THREE.Vector3) => b.clone().sub(a).normalize().toArray() as V3;
        const core = tube.wall ? tube.r - tube.wall : tube.r;
        const sec: Section = { id: 'as-is', name: p.name, round: true, layers: tube.wall ? [{ name: 'bore', mat: 'water', t: core, bore: true }, { name: 'wall', mat: p.mat ?? 'rubber', t: tube.wall }] : [{ name: 'core', mat: p.mat ?? 'rubber', t: tube.r }], bend: (tube.bend ?? 2 * tube.r) / (2 * tube.r) /* (a moulded hose: as tight as one outside diameter where it says nothing, an estimate) */, clear: 0.005, logic: 'clear', color: p.color ?? 0x1a1a1a, source: 'as the line is drawn' };
        try {
          const r = route(setAt(t, path, { ...p, shape: undefined }), W[0]!.toArray() as V3, W[last]!.toArray() as V3, { section: sec, fromDir: dirOut(W[0]!, W[1]!), toDir: dirOut(W[last]!, W[last - 1]!), step: o.step ? Math.min(o.step, 0.02) : 0.015 });
          if (r.tightest < r.least - 1e-6) { why.push(`the ${p.name}'s best way bends ${Math.round(r.tightest * 1000)} mm, tighter than the ${Math.round(r.least * 1000)} mm it may`); continue; }
          const inv = n.m.clone().invert(), pts = r.pts.map((q) => new THREE.Vector3(...q).applyMatrix4(inv).toArray() as V3);
          return { tree: setAt(t, path, { ...p, shape: { tube: { ...tube, pts, bend: r.least } } }), touched: [path], did: `the ${p.name} routed again: ${r.says}` };
        } catch (e) { why.push((e as Error).message); }
      }
      return { no: why.join('; ') || 'no line to route' };
    } },
  { id: 'move', name: 'Move it (place.solve)', rules: ['heat', 'interference', 'clearance'], cost: 2, says: 'the part harmed (or the smaller that runs in) placed again by the solver: every place it fits tried, held to its material\'s heat and what moves, the cheapest chosen; kept near what it is wired to',
    run: (t, pr, o) => {
      const f = pr.worst; if (!f.pb) return { no: 'the finding does not say where its parts are' };
      const ns = layout(t), cands = pr.rule === 'heat' ? [unitOf(f.pb)] : smallerFirst(t, ns, [unitOf(f.pa ?? ''), unitOf(f.pb)].filter(Boolean)), why: string[] = [];
      for (const u of cands) {
        const fixed = whyFixed(t, u); if (fixed) { why.push(fixed); continue; }
        const p = partAt(t, u)!, nr = NEAR.find(([re]) => re.test(`${p.name} ${p.item ?? ''}`));
        try { const { placed, tree } = placeOne(t, u, { near: nr?.[1], step: o.step }); return { tree, touched: [u], did: `the ${p.name} moved ${Math.round(placed.chosen.moved * 1000)} mm: ${placed.reason}` }; } catch (e) { why.push((e as Error).message); }
      }
      return { no: why.join('; ') || 'nothing to move' };
    } },
  { id: 'shield', name: 'Heat shield between', rules: ['heat'], cost: 3, says: 'a pressed stainless shield (0.8 mm, typical) put square across the line between the hot part and the one harmed, half way, an air gap each side; as wide as twice the distance the heat needs (60 to 250 mm), smaller if it would run into anything',
    run: (t, pr) => {
      const f = pr.worst; if (!f.from || !f.at || !f.pa || !f.pb) return { no: 'the finding does not say where its nearest points are' };
      const p = new THREE.Vector3(...f.from), q = new THREE.Vector3(...f.at), g = p.distanceTo(q); if (g < 0.006) return { no: `the two are ${(g * 1000).toFixed(0)} mm apart: no room for a shield and an air gap each side (6 mm)` };
      const n = q.clone().sub(p).normalize(), mid = p.clone().addScaledVector(n, g / 2), e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n));
      const at = t.parts?.length ?? 0, path = `/${at}`, why: string[] = [], q0 = new THREE.Quaternion().setFromEuler(e), u = new THREE.Vector3(1, 0, 0).applyQuaternion(q0), w = new THREE.Vector3(0, 0, 1).applyQuaternion(q0);
      for (let s = Math.min(0.25, Math.max(0.06, 2 * (f.need ?? 0.05))); s >= 0.04; s *= 0.7) {
        const open = uncovered(t, f.pa, f.pb, { c: mid, n, u, w, half: s / 2 });
        if (open.open) { why.push(`${Math.round(s * 1000)} mm leaves ${open.open} points of the ${f.b} at up to ${Math.round(open.worst)} °C (over its ${open.limit} °C) in the open`); continue; }
        const shield: Part = { name: `heat shield (${f.a} / ${f.b})`, item: 'heat-shield', shape: { box: [s, 0.0008, s] }, at: [mid.x, mid.y, mid.z], rot: [e.x, e.y, e.z], mat: 'stainless-304', finish: 'brushed', color: 0xb8bcc2, fixed: `clipped to the ${f.a}, ${Math.round((g / 2) * 1000)} mm off it`, says: `pressed stainless between the ${f.a} and the ${f.b}, ${Math.round((g / 2) * 1000)} mm of air each side` };
        const tree = { ...t, parts: [...(t.parts ?? []), shield] }, hits = rulesOf(tree, { within: [path] }).findings.filter((x) => x.rule === 'interference');
        if (!hits.length) return { tree, touched: [path, unitOf(f.pb)], did: `a ${Math.round(s * 1000)} mm shield between the ${f.a} and the ${f.b}, ${Math.round((g / 2) * 1000)} mm from each` };
        why.push(`${Math.round(s * 1000)} mm runs into the ${hits[0]!.a === shield.name ? hits[0]!.b : hits[0]!.a}`);
      }
      return { no: `no shield fits: ${why.join(', ')}` };
    } },
];

/** Check, repair, check again, until nothing is left that a repair can clear; what is left, a named task. */
export function autoLoop(root: Part, o: { rounds?: number; repairs?: Repair[]; /** the solver's cell, m (default 25 mm) */ step?: number; onStep?: (a: Attempt) => void } = {}): AutoRun {
  const t0 = Date.now(), lib = [...(o.repairs ?? REPAIRS)].sort((a, b) => a.cost - b.cost), attempts: Attempt[] = [], tasks: Task[] = [], kept: string[] = [], blocked = new Set<string>();
  let tree = root, fs = rulesOf(tree).findings; const before = fs.length, problems = problemsOf(fs).length;
  for (let round = 0; round < (o.rounds ?? 30); round++) {
    const pr = problemsOf(fs).find((x) => !blocked.has(x.key)); if (!pr) break;
    let done = false; const why: string[] = [];
    for (const r of lib.filter((x) => x.rules.includes(pr.rule))) {
      const t1 = Date.now(), c = r.run(tree, pr, { step: o.step });
      const log = (kept: boolean, w: string) => { const a = { problem: nameOf(pr), repair: r.id, kept, why: w, ms: Date.now() - t1 }; attempts.push(a); o.onStep?.(a); };
      if ('no' in c) { log(false, c.no); why.push(`${r.id}: ${c.no}`); continue; }
      // (the guard: what the change touched, checked again; kept only if this problem is gone and there is less wrong there)
      const old = fs.filter((f) => involves(f, c.touched)), fresh = rulesOf(c.tree, { within: c.touched }).findings, still = problemsOf(fresh).some((x) => x.key === pr.key);
      if (still || fresh.length >= old.length) { const w = still ? 'its finding remains' : `${fresh.length} findings there, where there were ${old.length}`; log(false, `${c.did}; undone: ${w}`); why.push(`${r.id}: ${w}`); continue; }
      tree = c.tree; fs = [...fs.filter((f) => !involves(f, c.touched)), ...fresh]; log(true, `${c.did}; ${old.length} findings there, now ${fresh.length}`); kept.push(c.did); done = true; break;
    }
    if (!done) { blocked.add(pr.key); tasks.push({ problem: nameOf(pr), findings: pr.findings.length, cause: why.join('; ') || `no repair for ${pr.rule} in the library` }); }
  }
  // (the last word is a full check, not the sum of the partial ones)
  const after = rulesOf(tree).findings.length;
  const says = `${before} findings in ${problems} problems; ${kept.length} repair${kept.length === 1 ? '' : 's'} kept, ${attempts.length - kept.length} undone or refused; ${after} findings left${tasks.length ? `, ${tasks.length} named task${tasks.length === 1 ? '' : 's'}` : ''}`;
  return { tree, before, after, problems, attempts, tasks, kept, ms: Date.now() - t0, says };
}

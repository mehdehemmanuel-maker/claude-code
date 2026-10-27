// What may not run into, touch or come near what: the rules a made thing is held to, piece by piece, on the surfaces as
// drawn (triangle against triangle: the critic's meshClashes and leastDistance), not on boxes round them.
//
//   interference   no two pieces cross, unless they are one piece (a casting's walls, a pressing's patches), one is
//                  said to pass through the other (an axle through its hub), one is a fastener in what it fastens (its
//                  hole not cut in what it holds), or one sits in a bore cut for it (a piston in its cylinder)
//   clearance      a piece that moves or must breathe (a belt, a fan's blades, a chain) keeps the gap it says
//                  (Part.clear) from everything but what it runs on
//   heat           a hot piece (Part.hot, its surface's temperature) heats what is near it, the heat falling off with
//                  distance; no piece is where it is hotter than its material stands (MAX_SERVICE): rubber, nylon,
//                  polypropylene, foam, wiring kept back from an exhaust, a turbo, a catalytic converter
//
// Each finding names the two pieces, how deep or how close, and what would put it right.

import * as THREE from 'three';
import type { Part } from '../kits';
import { contacts, layout, type Node } from './space';
import { leastDistance, meshClashes, trisOf, type Tris, type TriMesh } from './critic';
import { leafGeometry } from '../view/kit3d';

/** The most a material stands in service, °C (typical continuous ratings: makers' datasheets for each polymer family;
 *  metals and glass well above anything near an engine, given as where they begin to lose their strength or temper). */
export const MAX_SERVICE: Record<string, number> = {
  rubber: 80, nbr: 120, epdm: 150, neoprene: 120, silicone: 230, fkm: 230, pu: 90, foam: 90, pet: 150, cotton: 120, paper: 150,
  pp: 100, pe: 80, abs: 85, pvc: 60, pc: 120, pmma: 80, nylon: 120, pbt: 140, pom: 100, ptfe: 260, epoxy: 150, phenolic: 200, fibreglass: 300,
  'al-6061': 200, 'al-6063': 200, 'al-a380': 250, 'al-5052': 200, 'al-2024': 150, 'al-7075': 150, zamak: 100, lead: 150, solder: 150, copper: 250, brass: 250,
  glass: 450, 'glass-wool': 540, 'steel-low': 450, 'steel-alloy': 500, 'steel-spring': 250, 'steel-chrome': 400, 'cast-iron': 600, 'stainless-304': 870, 'nickel-alloy': 1000, ceramic: 1200, mica: 700, alumina: 1500,
};
/** How fast the heat of a hot surface falls off with distance from it (a length: its excess over the air about e times
 *  smaller each 40 mm, an estimate for an engine bay's mix of radiation and moving air). */
export const HEAT_FALLOFF = 0.04;
export const AMBIENT = 40;

export interface Finding { rule: 'interference' | 'clearance' | 'heat'; a: string; b: string; says: string; depth?: number; gap?: number; need?: number; at?: [number, number, number] }
interface Mesh3 extends TriMesh { p: Part; node: Node; tris?: Tris }
const T = (m: Mesh3): Tris => (m.tris ??= trisOf(m));

/** Every drawn piece of a thing as its triangles in the thing's frame, with what the rules read from it. */
export function trianglesOf(root: Part): Mesh3[] {
  const out: Mesh3[] = [], v = new THREE.Vector3();
  for (const n of layout(root)) {
    if (!n.p.shape) continue; const g = leafGeometry(n.p); if (!g) continue;
    const P = g.getAttribute('position'), pos = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(n.m); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
    const idx = g.getIndex(); out.push({ name: n.p.name, path: n.path, pos, ...(idx ? { idx: idx.array } : {}), mat: n.p.mat, ...(n.p.passes ? { passes: n.p.passes } : {}), ...(n.p.joins ? { joins: n.p.joins } : {}), p: n.p, node: n });
  }
  return out;
}
// (a pin is a fastener only as a dowel, a split pin or a cotter: a wrist pin, a crank pin or a hinge pin is a part in its own right)
const fastenerRe = /\b(bolt|screw|stud|nut|rivet|washer|dowel|split pin|cotter pin|keeper|clip|circlip|spider|plug)\b/i;
// (the nearest holder it is one piece with, or the thing it is a fastener of: what it may meet)
const ownerOf = (n: Node): Node => { let x = n; while (x.parent && (x.p.one || !x.p.item)) x = x.parent; return x; };
// (the unit made whole that it is in, under the thing checked: a chain, a bearing, a bought part fitted as it comes; its
// own pieces are its maker's to fit, not the build's)
const unitOf = (n: Node): Node | null => { let u: Node | null = null; for (let x: Node | null = n; x && x.parent; x = x.parent) if (x.p.sealed) u = x; return u; };
const linked = (a: Mesh3, b: Mesh3) => { const A = ownerOf(a.node), B = ownerOf(b.node), ua = unitOf(a.node); if (ua && ua === unitOf(b.node)) return true; return A === B || a.node.path.startsWith(B.path + '/') || b.node.path.startsWith(A.path + '/'); };
const fastens = (a: Mesh3, b: Mesh3) => fastenerRe.test(a.name) || fastenerRe.test(b.name) || fastenerRe.test(ownerOf(a.node).p.name) || fastenerRe.test(ownerOf(b.node).p.name);
// (a guest in a hole cut in its host, on the hole's axis and no wider than it: a valve in its seat's bore, a piston in its
// cylinder, a bolt in its hole; it cannot run into the host, and is not tried)
const inCut = (host: Mesh3, guest: Mesh3): boolean => {
  if (!host.p.cuts?.length || !guest.node.obb) return false;
  const inv = host.node.m.clone().invert(), c = guest.node.obb.c.clone().applyMatrix4(inv);
  return host.p.cuts.some((k) => { const ax = new THREE.Vector3(...k.dir).normalize(), rel = c.clone().sub(new THREE.Vector3(...k.at)), along = rel.dot(ax), off = rel.clone().sub(ax.clone().multiplyScalar(along)).length();
    const half = guest.node.obb!.h, u = guest.node.obb!.u, wdir = ax.clone().transformDirection(host.node.m), widths = [0, 1, 2].filter((i) => Math.abs(u[i]!.dot(wdir)) < 0.7).map((i) => half[i]!);
    const rg = widths.length ? Math.max(...widths) : Math.min(...half); return off + rg <= k.r * 1.08 + 0.0005; });
};
// (what a piece or anything it is in says passes through it or is joined to it, against the names of the other piece and
// of what it is in: a sprocket says the chain's links pass it, whichever of its pieces meets whichever of theirs)
const upFrom = (n: Node): Part[] => { const o: Part[] = []; for (let x: Node | null = n; x; x = x.parent) o.push(x.p); return o; };
const names = (n: Node): Set<string> => new Set(upFrom(n).map((p) => p.name));
const tells = (a: Node, b: Node): boolean => { const nb = names(b); return upFrom(a).some((p) => p.passes?.some((x) => nb.has(x)) || p.joins?.some((x) => nb.has(x))); };
const said = (a: Mesh3, b: Mesh3) => inCut(a, b) || inCut(b, a) || tells(a.node, b.node) || tells(b.node, a.node);

/** What runs into what: pieces whose surfaces cross, that are not one piece, not fitted one through the other, not a
 *  fastener in what it fastens. */
/** The pairs whose oriented boxes press into each other and that the rules do not excuse: what is tried exactly. */
export function candidates(ms: Mesh3[]): [Mesh3, Mesh3][] {
  const byNode = new Map<Node, Mesh3>(); for (const m of ms) byNode.set(m.node, m);
  return contacts(ms.map((m) => m.node)).filter((c) => c.depth > 0.0005).map((c) => [byNode.get(c.a)!, byNode.get(c.b)!] as [Mesh3, Mesh3]).filter(([a, b]) => a && b && !linked(a, b) && !fastens(a, b) && !said(a, b));
}
export function interference(ms: Mesh3[], o: { touch?: number; pair?: (a: Mesh3, b: Mesh3) => boolean } = {}): Finding[] {
  const out: Finding[] = [], seen = new Set<string>(), tol = o.touch ?? 0.0002;
  // (first the pieces' oriented boxes, fast: only pairs whose boxes press into each other by more than half a millimetre,
  // and that the rules do not excuse, are tried on their triangles)
  const cands = candidates(ms).filter(([a, b]) => !o.pair || o.pair(a, b));
  for (const [a, b] of cands) {
    const key = [ownerOf(a.node).path, ownerOf(b.node).path].sort().join('|'); if (seen.has(key)) continue;
    const c = meshClashes([a, b], { touch: tol, edge: 'scaled', fused: () => false }).find((x) => x.kind === 'through'); if (!c) continue;
    seen.add(key);
    out.push({ rule: 'interference', a: ownerOf(a.node).p.name, b: ownerOf(b.node).p.name, says: `the ${a.name} runs into the ${b.name}`, ...(c.at ? { at: c.at as [number, number, number] } : {}) });
  }
  return out;
}
/** The gaps kept: a piece that says its clearance (Part.clear) closer than that to anything it does not run on. */
export function clearances(ms: Mesh3[]): Finding[] {
  const out: Finding[] = [];
  for (const a of ms) {
    const need = a.p.clear ?? (a.node.parent?.p.clear); if (!need) continue;
    for (const b of ms) {
      if (b === a || linked(a, b) || said(a, b) || (a.p.runsOn ?? a.node.parent?.p.runsOn ?? []).some((r) => b.name.includes(r) || ownerOf(b.node).p.name.includes(r))) continue;
      const d = leastDistance(T(a), T(b), need); if (d && d.d < need) out.push({ rule: 'clearance', a: ownerOf(a.node).p.name, b: ownerOf(b.node).p.name, gap: d.d, need, says: `the ${a.name} is ${(d.d * 1000).toFixed(1)} mm from the ${b.name}: it needs ${(need * 1000).toFixed(0)} mm` });
    }
  }
  return out;
}
/** What is too near something hot for its material: at the least distance between them, the hot piece's heat (its
 *  excess over the air falling off by HEAT_FALLOFF) against what the other's material stands. Says how far back it
 *  needs to be. */
// (what heat harms: polymers, rubbers, foams, fabrics and the metals that melt or soften low (lead, solder, zinc alloy);
// a steel, iron or aluminium part near a manifold is cooled by what it is bolted to and is the engine's own business)
const HARMED = /^(rubber|nbr|epdm|neoprene|silicone|fkm|pu|foam|pet|cotton|paper|pp|pe|abs|pvc|pc|pmma|nylon|pbt|pom|ptfe|epoxy|phenolic|fibreglass|lead|solder|zamak)$/;
/** Whether a straight line between two points passes through a solid piece other than the two (a shield between them:
 *  the head between an exhaust port and a valve's seal, a heat shield's sheet, a cover over a gasket). Any opaque piece
 *  stops what radiates; the piece that stops it is held to its own limit in its turn. Glass lets it through. */
function shielded(p: THREE.Vector3, q: THREE.Vector3, ms: Mesh3[], skip: Mesh3[]): boolean {
  const dir = q.clone().sub(p), len = dir.length(); if (len < 1e-4) return false; dir.normalize();
  const ray = new THREE.Ray(p, dir), box = new THREE.Box3().setFromPoints([p, q]).expandByScalar(1e-4), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), hit = new THREE.Vector3();
  for (const m of ms) {
    if (skip.includes(m) || /glass/.test(m.mat ?? '')) continue;
    const t = T(m); if (t.lo[0] > box.max.x || t.hi[0] < box.min.x || t.lo[1] > box.max.y || t.hi[1] < box.min.y || t.lo[2] > box.max.z || t.hi[2] < box.min.z) continue;
    for (let i = 0; i < t.n; i++) { const v = t.v, o = i * 9; a.set(v[o]!, v[o + 1]!, v[o + 2]!); b.set(v[o + 3]!, v[o + 4]!, v[o + 5]!); c.set(v[o + 6]!, v[o + 7]!, v[o + 8]!); if (ray.intersectTriangle(a, b, c, false, hit) && hit.distanceTo(p) < len - 1e-4 && hit.distanceTo(p) > 1e-4) return true; }
  }
  return false;
}
export function heat(ms: Mesh3[]): Finding[] {
  const out: Finding[] = [], hot = ms.filter((m) => (m.p.hot ?? m.node.parent?.p.hot ?? 0) > AMBIENT);
  for (const h of hot) {
    const Th = (h.p.hot ?? h.node.parent?.p.hot)!;
    for (const b of ms) {
      if (b === h || linked(h, b) || !HARMED.test(b.mat ?? '')) continue; const lim = MAX_SERVICE[b.mat ?? ''] ?? Infinity; if (lim >= Th) continue;
      const need = HEAT_FALLOFF * Math.log((Th - AMBIENT) / Math.max(1, lim - AMBIENT)), d = leastDistance(T(h), T(b), need);
      if (!d || d.d >= need) continue;
      // (in the open between them, the heat reaches it; behind a metal wall (the head, a heat shield), it does not)
      if (shielded(new THREE.Vector3(...d.p), new THREE.Vector3(...d.q), ms, [h, b])) continue;
      out.push({ rule: 'heat', a: ownerOf(h.node).p.name, b: ownerOf(b.node).p.name, gap: d.d, need, at: d.q as [number, number, number], says: `the ${b.name} (${b.mat}, good to about ${lim} °C) is ${(d.d * 1000).toFixed(0)} mm from the ${h.name} at about ${Th} °C, in the open: about ${Math.round(AMBIENT + (Th - AMBIENT) * Math.exp(-d.d / HEAT_FALLOFF))} °C there; it needs ${(need * 1000).toFixed(0)} mm, or a heat shield between` });
    }
  }
  return out;
}
/** All three, on a thing's surfaces as drawn. */
/** …or only between what is named like `only` (a piece of it, or anything it is in) and everything: what moves, at one
 *  place in its motion. */
export function rulesOf(root: Part, o: { touch?: number; only?: RegExp } = {}): { findings: Finding[]; pieces: number } {
  const all = trianglesOf(root), on = o.only ? (m: Mesh3) => [...names(m.node)].some((n) => o.only!.test(n)) : null, ms = all;
  if (on) { const res = interference(ms, { ...o, pair: (a, b) => on(a) || on(b) }); return { findings: res, pieces: all.filter(on).length }; }
  return { findings: [...interference(ms, o), ...clearances(ms), ...heat(ms)], pieces: ms.length };
}

/** The rules through a motion: the thing made at each of `steps` places through it (a crank turned through a revolution,
 *  a door through its swing), only what moves tried against everything at each; each finding with where it happened. */
export function rulesThrough(make: (t: number) => Part, steps: number, only: RegExp, o: { touch?: number } = {}): { findings: (Finding & { t: number })[]; tried: number } {
  const out: (Finding & { t: number })[] = [], seen = new Set<string>();
  for (let k = 0; k < steps; k++) { const t = k / steps; for (const f of rulesOf(make(t), { ...o, only }).findings) { const key = `${f.a}|${f.b}|${f.says}`; if (seen.has(key)) continue; seen.add(key); out.push({ ...f, t }); } }
  return { findings: out, tried: steps };
}

// The critic: what is wrong with a made thing, whatever it is, found from its parts, and put right where a rule can.
// Each finding names the part, the rule broken, by how much, and what was done.
//
//   room to move   a part that turns (a wheel, a tyre, a fan, a rotor, an auger, a gear, a pulley, a disc, a blade, a
//                  drum, an impeller, a flywheel) sweeps a ring round its axis and needs a clearance past it, as its
//                  kind does: a tyre about 30 mm to its arch (typical), a fan's or propeller's tip about 1.5 % of its
//                  diameter (at least 5 mm, typical), an auger's flight 6 mm to its trough (typical of screw conveyors,
//                  CEMA's are 3–10), a gear or pulley 2 mm. A fixed part in that room is in its way: a shell it turns
//                  inside is given an opening round it with that clearance (an arch), and the turning part set flush
//                  with the shell's side; anything else in its way is said
//   held up        everything rests, through what it touches, on the ground: a part held by nothing is found by the
//                  embodiment's own load path (src/nexus/embody/tree.ts) and set down onto what is nearest beneath or
//                  beside it, when that is near (a fifth of its size); else said
//   walls          a hollow part's wall no thinner than its making allows (typical minimums: moulded plastic 0.8 mm,
//                  pressed steel 0.6 mm, glass 3.2 mm as toughened side glass is, castings 3 mm, wood 3 mm): thickened
//   standing       its centre of mass over what it stands on, or it tips: said
//   through        two parts of the same thing passing through each other (not one inside a shell): said
//   density        a thing as a whole lighter than air or heavier than solid gold is wrong somewhere: said

import * as THREE from 'three';
import { DENSITY, massOf, type Part } from '../kits';
import { loadPath } from '../embody/tree';
import type { Part as EPart } from '../embody/part';
import { classOf } from './detail';
import { contacts, grownOf, layout, least, sat, thingOf, toLocal, type Node, type OBB } from './space';

export interface Finding { check: string; part: string; says: string; fixed: boolean }

// what turns: by the kind of part it is (a wheel's group turns as one: its tyre, rim and disc with it)
const TURNS = /\b(wheels?|tyres?|tires?|rims?|rotors?|propellers?|fans?|augers?|screw conveyors?|gears?|pulleys?|sprockets?|(?:brake )?discs?|saw blades?|fan blades?|rotor blades?|drums?|turbines?|impellers?|flywheels?|spindles?)\b/i;
/** Whether a part turns, and the room it needs past its ring, m. */
export function turning(p: Part): { clearance: number; why: string } | null {
  const tyre = p.mat === 'rubber' && !!p.shape && 'torus' in p.shape, n = p.name.toLowerCase();
  if (!tyre && !TURNS.test(n)) return null;
  if (tyre || /\b(wheel|tyre|tire|rim|disc)s?\b/.test(n)) return { clearance: 0.03, why: 'a wheel needs about 30 mm to its arch (typical)' };
  if (/\b(fan|propeller|rotor|turbine|impeller)/.test(n)) return { clearance: 0.005, why: "a fan's or propeller's tip about 1.5 % of its diameter, at least 5 mm (typical)" };
  if (/\bauger|screw conveyor/.test(n)) return { clearance: 0.006, why: "an auger's flight about 6 mm to its trough (typical; 3–10 mm)" };
  return { clearance: 0.002, why: 'a gear, pulley or disc about 2 mm (typical)' };
}
const ancestors = (n: Node) => { const a: Node[] = []; for (let x = n.parent; x; x = x.parent) a.push(x); return a; };
const isUnder = (a: Node, b: Node): boolean => { for (let x: Node | null = a; x; x = x.parent) if (x === b) return true; return false; };
/** The axis a turning thing turns about: its own round shape's, or its largest round part's. */
function axisOf(n: Node, nodes: Node[]): THREE.Vector3 {
  const round = (x: Node) => x.p.shape && ('torus' in x.p.shape || 'cyl' in x.p.shape) && x.obb;
  const r = round(n) ? n : nodes.filter((x) => isUnder(x, n) && round(x) && !x.p.detail).sort((a, b) => Math.max(...b.obb!.h) - Math.max(...a.obb!.h))[0];
  if (!r) return new THREE.Vector3(0, 0, 1); return ('torus' in r.p.shape! ? r.obb!.u[2] : r.obb!.u[1]).clone();
}
const WALL: [RegExp, number, string][] = [[/^(abs|pp|pc|pmma|nylon)$/, 0.0008, 'moulded plastic'], [/^glass$/, 0.0032, 'toughened glass'], [/^cast-iron$/, 0.003, 'a casting'], [/^(wood|oak|bamboo)$/, 0.003, 'wood'], [/steel|stainless/, 0.0006, 'pressed steel'], [/^al-/, 0.0008, 'aluminium sheet']];
const boxOBB = (b: THREE.Box3): OBB => { const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).multiplyScalar(0.5); return { c, u: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)], h: [s.x, s.y, s.z] }; };

/** What is wrong with a thing, and what was put right (the thing is changed in place). */
export function critique(root: Part): Finding[] {
  const out: Finding[] = [], say = (check: string, part: string, says: string, fixed: boolean) => out.push({ check, part, says, fixed });
  let nodes = layout(root);
  // ---- room to move: each turning thing (the outermost of what turns together) against the fixed parts near it ----
  const movers = nodes.filter((n) => turning(n.p) && n.sub && !n.p.detail && !ancestors(n).some((a) => turning(a.p)));
  for (const m0 of movers) {
    nodes = layout(root); const m = nodes.find((x) => x.path === m0.path)!, need = turning(m.p)!, ax = axisOf(m, nodes), env = m.sub!.clone().expandByScalar(need.clearance), ctr = m.sub!.getCenter(new THREE.Vector3());
    for (const f of nodes) {
      if (f === m || !f.obb || f.p.detail || isUnder(f, m) || isUnder(m, f) && !f.p.shell || turning(f.p) || ancestors(f).some((a) => turning(a.p)) || !f.p.mat || classOf(f.p.mat) === 'soft' || classOf(f.p.mat) === 'organic') continue;
      if (!env.intersectsBox(f.box!) || !sat(boxOBB(env), f.obb, 0)) continue;
      const opened = (f.p.parts ?? []).some((q) => q.detail === 'room to move' && q.name === `opening for ${m.p.name}`);
      if (opened) continue;
      if (f.p.shell && f.box!.containsPoint(ctr)) {
        // turning inside a shell: open the shell round it, and set it flush with the shell's side, 10 mm inside it (a road
        // wheel is covered by its arch: UNECE R26 / EU 2019/2144 ask a wheel not to stand proud of the body)
        const k = [0, 1, 2].reduce((b, i) => (Math.abs(ax.getComponent(i)) > Math.abs(ax.getComponent(b)) ? i : b), 0), fc = f.box!.getCenter(new THREE.Vector3()), side = Math.sign(ctr.getComponent(k) - fc.getComponent(k)) || 1;
        const half = (m.sub!.max.getComponent(k) - m.sub!.min.getComponent(k)) / 2, faceAt = side > 0 ? f.box!.max.getComponent(k) : f.box!.min.getComponent(k), want = faceAt - side * (half + 0.01);
        const R = Math.max(...[0, 1, 2].filter((i) => i !== k).map((i) => (m.sub!.max.getComponent(i) - m.sub!.min.getComponent(i)) / 2)) + need.clearance;
        if (Math.abs(ctr.getComponent(k) - want) > 1e-3) { const shift = new THREE.Vector3(); shift.setComponent(k, want - ctr.getComponent(k)); moveBy(m, shift); }
        const at = ctr.clone(); at.setComponent(k, faceAt + side * 0.003); const loc = toLocal(f, at), dir = new THREE.Vector3(); dir.setComponent(k, side);
        const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.transformDirection(f.m.clone().invert())));
        (f.p.parts ??= []).push({ name: `opening for ${m.p.name}`, shape: { cyl: [R, 0.004] }, at: [loc.x, loc.y, loc.z], rot: [e.x, e.y, e.z], color: 0x0c0c0e, kg: 0, detail: 'room to move' });
        say('room to move', m.p.name, `${need.why}: it turned inside the ${f.p.name}, so the ${f.p.name} is opened round it (${(R * 1000).toFixed(0)} mm) and it is set flush with its side`, true);
        break;
      }
      say('room to move', m.p.name, `${need.why}: the ${f.p.name} is in its way`, false);
    }
  }
  // ---- held up: the embodiment's load path, from the ground (or, for a thing held or flying, its heaviest piece) ----
  nodes = layout(root);
  // (what grew, a tree's twigs on its branches, is held by growing, not by resting)
  const alive = grownOf(nodes);
  const solid = nodes.filter((n) => n.obb && n.p.mat && classOf(n.p.mat) !== 'organic' && !n.p.detail && !alive(n)), touch = contacts(nodes, (n) => solid.includes(n));
  const id = (n: Node) => `p${n.path}`, map = new Map<string, Set<string>>([['ground', new Set()], ...solid.map((n) => [id(n), new Set<string>()] as [string, Set<string>])]);
  for (const t of touch) { map.get(id(t.a))!.add(id(t.b)); map.get(id(t.b))!.add(id(t.a)); }
  const grounded = solid.filter((n) => n.box!.min.y <= 0.005); for (const n of grounded) { map.get(id(n))!.add('ground'); map.get('ground')!.add(id(n)); }
  if (!grounded.length && solid.length) { const heavy = solid.reduce((a, n) => (massOf({ ...n.p, parts: [] }) > massOf({ ...a.p, parts: [] }) ? n : a)); map.get(id(heavy))!.add('ground'); map.get('ground')!.add(id(heavy)); }
  const eparts: EPart[] = [{ id: 'ground', name: 'the ground', category: '', material: 'soil', shape: { kind: 'block', size: [1, 1, 1] }, at: [0, -1e6, 0], mass: 0, values: [] }, ...solid.map((n) => ({ id: id(n), name: n.p.name, category: '', material: n.p.mat!, shape: { kind: 'block' as const, size: [1, 1, 1] as [number, number, number] }, at: [0, 0, 0] as [number, number, number], mass: 0, values: [] }))];
  const lp = loadPath(eparts, 1e-3, map), byId = new Map(solid.map((n) => [id(n), n]));
  for (const e of lp.floating) {
    const n = byId.get(e.id); if (!n?.box) continue;
    let best: { d: number; to: Node } | null = null; const size = n.box.getSize(new THREE.Vector3()).length();
    for (const h of lp.held) { const o = byId.get(h); if (!o?.box || o === n) continue; const d = boxGap(n.box, o.box); if (!best || d < best.d) best = { d, to: o }; }
    if (best && best.d > 0 && best.d < size / 5) { const gap = gapBetween(n.box, best.to.box!); moveBy(n, gap); say('held up', n.p.name, `it touched nothing that holds it: set onto the ${best.to.p.name} (${(gap.length() * 1000).toFixed(0)} mm)`, true); }
    else say('held up', n.p.name, `nothing holds it up${best ? ` (the nearest, the ${best.to.p.name}, is ${(Math.max(0, best.d) * 1000).toFixed(0)} mm away)` : ''}`, false);
  }
  // ---- walls ----
  for (const n of nodes) {
    const p = n.p; if (!p.shell || !p.mat || p.detail) continue; const w = WALL.find(([re]) => re.test(p.mat!));
    if (w && p.shell < w[1] - 1e-9) { say('walls', p.name, `its ${(p.shell * 1000).toFixed(1)} mm wall is thinner than ${w[2]} is made (${(w[1] * 1000).toFixed(1)} mm): thickened`, true); p.shell = w[1]; }
  }
  // ---- through: one thing passing into another (a car into a house): within one thing, parts set into each
  // other (a pole into its base, a blade into its guard) are how it is built ----
  for (const t of touch) {
    if (thingOf(t.a) === thingOf(t.b) || alive(t.a) || alive(t.b) || t.a.p.shell || t.b.p.shell || isUnder(t.a, t.b) || isUnder(t.b, t.a) || classOf(t.a.p.mat) === 'soft' || classOf(t.b.p.mat) === 'soft') continue;
    const small = Math.min(least(t.a.box!), least(t.b.box!)); if (t.depth > Math.max(0.01, 0.3 * small)) say('through', t.a.p.name, `it passes ${(t.depth * 1000).toFixed(0)} mm into the ${t.b.p.name}`, false);
  }
  // ---- standing and density ----
  const all = new THREE.Box3(); for (const n of nodes) if (n.box) all.union(n.box);
  if (!all.isEmpty() && grounded.length) {
    const M = massOf(root), com = centreOfMass(nodes), feet = new THREE.Box3(); for (const n of grounded) feet.union(n.box!);
    if (M > 0 && (com.x < feet.min.x - 1e-3 || com.x > feet.max.x + 1e-3 || com.z < feet.min.z - 1e-3 || com.z > feet.max.z + 1e-3)) say('standing', root.name, `its centre of mass (${com.x.toFixed(2)}, ${com.z.toFixed(2)} m) is not over what it stands on (${feet.min.x.toFixed(2)}…${feet.max.x.toFixed(2)}, ${feet.min.z.toFixed(2)}…${feet.max.z.toFixed(2)}): it would tip`, false);
  }
  if (!all.isEmpty()) {
    const M = massOf(root), V = all.getSize(new THREE.Vector3()), rho = M / Math.max(1e-9, V.x * V.y * V.z);
    if (M > 0 && ((rho < 1.2 && !nodes.some((n) => n.p.mat === 'foliage' || n.p.mat === 'leaf')) || rho > (DENSITY.gold ?? 19300))) say('density', root.name, `as a whole ${rho.toFixed(1)} kg/m³ over its bounds: ${rho < 1.2 ? 'lighter than air' : 'heavier than gold'}`, false);
  }
  return out;
}
function centreOfMass(nodes: Node[]): THREE.Vector3 { const c = new THREE.Vector3(); let m = 0; for (const n of nodes) { if (!n.box) continue; const own = massOf({ ...n.p, parts: [] }); if (own <= 0) continue; c.addScaledVector(n.box.getCenter(new THREE.Vector3()), own); m += own; } return m > 0 ? c.divideScalar(m) : c; }
/** The least move that brings one box against another (along the axis they are nearest across). */
/** How far apart two boxes are (0 if they touch or overlap). */
const boxGap = (a: THREE.Box3, b: THREE.Box3) => Math.hypot(...[0, 1, 2].map((k) => Math.max(0, b.min.getComponent(k) - a.max.getComponent(k), a.min.getComponent(k) - b.max.getComponent(k))));
function gapBetween(a: THREE.Box3, b: THREE.Box3): THREE.Vector3 {
  const v = new THREE.Vector3(), d = [0, 1, 2].map((k) => { const lo = b.min.getComponent(k) - a.max.getComponent(k), hi = a.min.getComponent(k) - b.max.getComponent(k); return lo > 0 ? lo : hi > 0 ? -hi : 0; });
  const k = d.reduce((best, x, i) => (Math.abs(x) > Math.abs(d[best]!) ? i : best), 0); v.setComponent(k, d[k]!); return v;
}
/** A part moved by a world displacement (its place in its holder's frame changed). */
function moveBy(n: Node, world: THREE.Vector3): void {
  const inv = (n.parent?.m ?? new THREE.Matrix4()).clone().invert(), d = world.clone().transformDirection(inv).multiplyScalar(world.length());
  const at = n.p.at ?? [0, 0, 0]; n.p.at = [at[0] + d.x, at[1] + d.y, at[2] + d.z];
}

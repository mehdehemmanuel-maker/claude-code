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
import { contacts, dirToLocal, grownOf, layout, least, sat, thingOf, toLocal, type Node, type OBB } from './space';
import { insideBy, stationAt, type Loft, type Station } from '../form';
import { inSweep } from '../panels';
import { patchPoints, type Patch } from '../surface';

export interface Finding { check: string; part: string; says: string; fixed: boolean }

// what turns: by the kind of part it is (a wheel's group turns as one: its tyre, rim and disc with it)
const TURNS = /\b(wheels?|tyres?|tires?|rims?|rotors?|propellers?|fans?|augers?|screw conveyors?|gears?|pulleys?|sprockets?|(?:brake )?discs?|saw blades?|fan blades?|rotor blades?|mower blades?|cutting blades?|drums?|turbines?|impellers?|flywheels?|spindles?)\b/i;
/** Whether a part turns, and the room it needs past its ring, m. */
export function turning(p: Part): { clearance: number; why: string; /** beside it, along its axle, where that differs */ side?: number } | null {
  const tyre = p.mat === 'rubber' && !!p.shape && ('torus' in p.shape || 'lathe' in p.shape), n = p.name.toLowerCase();
  // (a steering wheel turns, but its room is a hand's round its rim inside the cab, not an arch cut in the body)
  if (/\b(steering|hand|fifth) ?wheel|wheel ?(nut|bolt|stud|arch|well|base|mount|hanger|house)/.test(n)) return null;
  if (!tyre && !TURNS.test(n)) return null;
  if (tyre || /\b(wheel|tyre|tire|rim|disc)s?\b/.test(n)) return { clearance: 0.03, side: 0.015, why: 'a wheel needs about 30 mm to its arch and 15 mm beside its sidewall (typical)' };
  if (/\b(fan|propeller|rotor|turbine|impeller)/.test(n)) return { clearance: 0.005, why: "a fan's or propeller's tip about 1.5 % of its diameter, at least 5 mm (typical)" };
  if (/\bauger|screw conveyor/.test(n)) return { clearance: 0.006, why: "an auger's flight about 6 mm to its trough (typical; 3–10 mm)" };
  if (/\b(mower|cutting) blade/.test(n)) return { clearance: 0.01, why: "a mower blade's tip about 10 mm inside its deck (typical)" };
  return { clearance: 0.002, why: 'a gear, pulley or disc about 2 mm (typical)' };
}
const ancestors = (n: Node) => { const a: Node[] = []; for (let x = n.parent; x; x = x.parent) a.push(x); return a; };
const isUnder = (a: Node, b: Node): boolean => { for (let x: Node | null = a; x; x = x.parent) if (x === b) return true; return false; };
/** The axis a turning thing turns about: its own round shape's, or its largest round part's. */
function axisOf(n: Node, nodes: Node[]): THREE.Vector3 {
  const round = (x: Node) => x.p.shape && ('torus' in x.p.shape || 'cyl' in x.p.shape || 'lathe' in x.p.shape) && x.obb;
  const r = round(n) ? n : nodes.filter((x) => isUnder(x, n) && round(x) && !x.p.detail).sort((a, b) => Math.max(...b.obb!.h) - Math.max(...a.obb!.h))[0];
  if (!r) { const o = n.obb; if (!o) return new THREE.Vector3(0, 0, 1); const k = [0, 1, 2].reduce((b, i) => (o.h[i]! < o.h[b]! ? i : b), 0); return o.u[k]!.clone(); }
  return ('torus' in r.p.shape! ? r.obb!.u[2] : r.obb!.u[1]).clone();
}
const WALL: [RegExp, number, string][] = [[/^(abs|pp|pc|pmma|nylon)$/, 0.0008, 'moulded plastic'], [/^glass$/, 0.0032, 'toughened glass'], [/^cast-iron$/, 0.003, 'a casting'], [/^(wood|oak|bamboo)$/, 0.003, 'wood'], [/steel|stainless/, 0.0006, 'pressed steel'], [/^al-/, 0.0008, 'aluminium sheet']];
const boxOBB = (b: THREE.Box3): OBB => { const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3()).multiplyScalar(0.5); return { c, u: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)], h: [s.x, s.y, s.z] }; };

/** An interface checked: who offers, who asks, and each figure against the other. */
export interface Contract { kind: string; provider: string; requirer: string; rows: { what: string; required: string; provided: string; ok: boolean }[]; ok: boolean }
const mm = (x: number) => `${+(x * 1000).toPrecision(3)} mm`;
/** Every interface in a thing, paired and checked: a part that asks for something, with the part it meets (or names) that
 *  offers it. A shaft fits its bore within 0.5 mm (a running or press fit is a few hundredths: ISO 286; this is coarser,
 *  to catch a wrong size, not a fit); a nut its stud by thread; a driven shaft carries what drives it. */
export function contracts(nodes: Node[], touch = contacts(nodes)): Contract[] {
  const out: Contract[] = [], meets = new Map<Node, Set<Node>>();
  for (const t of touch) { (meets.get(t.a) ?? meets.set(t.a, new Set()).get(t.a)!).add(t.b); (meets.get(t.b) ?? meets.set(t.b, new Set()).get(t.b)!).add(t.a); }
  for (const r of nodes) for (const q of r.p.iface ?? []) {
    if (q.role !== 'requires') continue;
    const named = (p: Node) => q.to === p.p.name || (p.p.iface ?? []).some((x) => x.to === r.p.name);
    const cands = nodes.filter((p) => p !== r && (p.p.iface ?? []).some((x) => x.role === 'provides' && x.kind === q.kind && (!x.to || x.to === r.p.name)) && (named(p) || meets.get(r)?.has(p)) && (!q.to || q.to === p.p.name));
    for (const p of cands) {
      const g = (p.p.iface ?? []).find((x) => x.role === 'provides' && x.kind === q.kind)!, rows: Contract['rows'] = [];
      if (q.kind === 'shaft' && q.d && g.d) rows.push({ what: 'shaft in its bore', required: `${mm(q.d)} bore`, provided: `${mm(g.d)} shaft`, ok: Math.abs(q.d - g.d) <= 0.0005 });
      if (q.kind === 'studs' && q.d && g.d) rows.push({ what: 'thread', required: `M${+(q.d * 1000).toFixed(0)}`, provided: `${g.n ?? ''}${g.n ? ' × ' : ''}M${+(g.d * 1000).toFixed(0)} studs`, ok: Math.abs(q.d - g.d) < 1e-4 });
      if (q.kind === 'chain' && q.d && g.d) rows.push({ what: 'chain pitch', required: mm(q.d), provided: `${mm(g.d)} teeth`, ok: Math.abs(q.d - g.d) < 1e-4 });
      if (q.kind === 'drive' && q.torque !== undefined && g.torque !== undefined) rows.push({ what: 'torque', required: `at most ${q.torque.toFixed(0)} N·m (what it carries)`, provided: `${g.torque.toFixed(0)} N·m (what drives it)`, ok: g.torque <= q.torque });
      if (rows.length) out.push({ kind: q.kind, provider: p.p.name, requirer: r.p.name, rows, ok: rows.every((x) => x.ok) });
    }
  }
  return out;
}
/** The parts paired by an interface: what goes through a hub is its shaft, not in its way. */
function paired(nodes: Node[], touch: ReturnType<typeof contacts>): Set<string> {
  const out = new Set<string>(); const has = (n: Node) => !!n.p.iface?.length;
  for (const c of contracts(nodes, touch)) { const a = nodes.find((n) => n.p.name === c.provider), b = nodes.find((n) => n.p.name === c.requirer); if (a && b) { out.add(`${a.path}|${b.path}`); out.add(`${b.path}|${a.path}`); } }
  for (const t of touch) if (has(t.a) && has(t.b) && t.a.p.iface!.some((x) => t.b.p.iface!.some((y) => y.kind === x.kind && y.role !== x.role))) { out.add(`${t.a.path}|${t.b.path}`); out.add(`${t.b.path}|${t.a.path}`); }
  return out;
}

/** What is wrong with a thing, and what was put right (the thing is changed in place). */
export function critique(root: Part): Finding[] {
  const out: Finding[] = [], say = (check: string, part: string, says: string, fixed: boolean) => out.push({ check, part, says, fixed });
  let nodes = layout(root);
  // ---- room to move: each turning thing (the outermost of what turns together) against the fixed parts near it ----
  const movers = nodes.filter((n) => turning(n.p) && n.sub && !n.p.detail && !ancestors(n).some((a) => turning(a.p)));
  const pairs = paired(nodes, contacts(nodes, (n) => !!n.p.iface?.length));
  const pairedTo = new Map<string, string[]>(); for (const k of pairs) { const [a, b] = k.split('|') as [string, string]; (pairedTo.get(a) ?? pairedTo.set(a, []).get(a)!).push(b); }
  let dirty = false;
  for (const m0 of movers) {
    if (dirty) { nodes = layout(root); dirty = false; } const m = nodes.find((x) => x.path === m0.path)!, need = turning(m.p)!, ax = axisOf(m, nodes), ctr = m.sub!.getCenter(new THREE.Vector3());
    // the room it needs: the disc it sweeps round its axis (a blade's, not its still box), and the room past that
    // (a round thing's reach is its radius; a blade's, the farthest corner of it from its axis)
    // (a wheel sweeps a ring: inside its rim, behind its face, is where its knuckle, brake and strut foot live)
    const ringIn = nodes.filter((x) => isUnder(x, m) && x.p.mat === 'rubber' && x.p.shape && ('torus' in x.p.shape || 'lathe' in x.p.shape)).map((x) => 'torus' in x.p.shape! ? x.p.shape.torus[0] - x.p.shape.torus[1] : Math.min(...(x.p.shape as { lathe: [number, number][] }).lathe.map(([r]) => r)));
    const bore = ringIn.length ? Math.max(0, Math.min(...ringIn) - 0.03) : 0;
    const roundish = nodes.some((x) => isUnder(x, m) && x.p.shape && ('torus' in x.p.shape || 'cyl' in x.p.shape || 'lathe' in x.p.shape) && !x.p.detail), ext = m.sub!.getSize(new THREE.Vector3());
    const sweep = roundish ? Math.max(...[0, 1, 2].map((i) => (ext.getComponent(i) / 2) * Math.sqrt(Math.max(0, 1 - ax.getComponent(i) ** 2)))) : Math.max(...corners(m.sub!).map((q) => q.clone().sub(ctr).sub(ax.clone().multiplyScalar(q.clone().sub(ctr).dot(ax))).length())), along = Math.max(...corners(m.sub!).map((q) => Math.abs(q.clone().sub(ctr).dot(ax))));
    const sideRoom = need.side ?? need.clearance, env = new THREE.Box3().setFromCenterAndSize(ctr, new THREE.Vector3(...[0, 1, 2].map((i) => 2 * (Math.abs(ax.getComponent(i)) * (along + sideRoom) + Math.sqrt(Math.max(0, 1 - ax.getComponent(i) ** 2)) * (sweep + need.clearance)))));
    // turning inside its own housing (a mower's blades in their deck, a fan in its duct, an auger in its trough): its tip
    // kept the room asked inside the housing's walls
    const blocked = new Set(nodes.filter((x) => isUnder(x, m)).flatMap((x) => pairedTo.get(x.path) ?? []));
    const house = ancestors(m).find((a) => a.p.shape && 'loft' in a.p.shape && a.p.shell);
    if (house) { const l = (house.p.shape as { loft: Loft }).loft, u = new THREE.Vector3(1, 0, 0).cross(ax).lengthSq() > 1e-6 ? new THREE.Vector3(1, 0, 0).cross(ax).normalize() : new THREE.Vector3(0, 1, 0).cross(ax).normalize(), v = ax.clone().cross(u);
      // along its housing (a fan in its duct, an auger in its trough): its tip within the section; across it (a mower's
      // blades under their deck, open below): within the housing's outline in plan
      const duct = Math.abs(dirToLocal(house, ax).x) > 0.9, xs = l.st.map((q) => q.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
      let worst = Infinity; for (let i = 0; i < 24; i++) { const a = (i / 24) * 2 * Math.PI, q = toLocal(house, ctr.clone().addScaledVector(u, Math.cos(a) * sweep).addScaledVector(v, Math.sin(a) * sweep)), st = stationAt(l, q.x); worst = Math.min(worst, !st ? -1 : duct ? roomIn(st, q.y, q.z) : Math.min(Math.max(st.w, st.wt ?? 0) - Math.abs(q.z), q.x - x0, x1 - q.x)); }
      if (worst < need.clearance) say('room to move', m.p.name, `${need.why}: its tip comes ${worst < 0 ? 'outside' : `within ${(worst * 1000).toFixed(0)} mm of`} the ${house.p.name}`, false);
    }
    for (const f of nodes) {
      if (blocked.has(f.path)) continue; // an interface (its axle in its hub), not in its way
      if (f === m || !f.obb || f.p.detail || isUnder(f, m) || isUnder(m, f) || turning(f.p) || ancestors(f).some((a) => turning(a.p)) || !f.p.mat || classOf(f.p.mat) === 'soft' || classOf(f.p.mat) === 'organic') continue;
      if (!env.intersectsBox(f.box!) || !f.pieces.some((pc) => sat(boxOBB(env), pc, 0))) continue;
      // (and then exactly: within the cylinder it sweeps, not merely that cylinder's box)
      if (!f.pieces.some((pc) => hitsCylinder(pc, ctr, ax, sweep + need.clearance, along + sideRoom, bore))) continue;
      // a skin (src/nexus/panels.ts) is tested exactly, point by point on it, against the room the wheel sweeps through
      // its lock and its bump: its arch is its maker's to draw (from that same sweep), never the critic's to cut
      if (f.p.shape && 'surf' in f.p.shape) {
        const ez = ax.clone().normalize(), ey = new THREE.Vector3(0, 1, 0).addScaledVector(ez, -ez.y).normalize(), ex = ey.clone().cross(ez), tr = m.p.travel ?? {};
        const wh = { name: m.p.name, x: 0, y: 0, z: 0, R: sweep, w: 2 * along, steer: tr.steer ?? 0, bump: tr.bump ?? 0 }, room = { radial: need.clearance, side: sideRoom, poses: 7 };
        const hit = patchPoints(f.p.shape.surf as Patch, 30, 14).map((q) => new THREE.Vector3(...q).applyMatrix4(f.m).sub(ctr)).find((d) => inSweep([d.dot(ex), d.dot(ey), d.dot(ez)], wh, room));
        if (!hit) continue;
        say('room to move', m.p.name, `${need.why}${tr.steer || tr.bump ? `, steered ${Math.round(((tr.steer ?? 0) * 180) / Math.PI)}° either way and risen ${Math.round((tr.bump ?? 0) * 1000)} mm` : ''}: the ${f.p.name} is in its way`, false); continue;
      }
      const opened = (f.p.parts ?? []).some((q) => q.detail === 'room to move' && q.name === `opening for ${m.p.name}`);
      if (opened) continue;
      // a lofted panel over a wheel (a car's body, a fender): its lower edge raised round the wheel, so the panel is
      // cut back into an arch with the room asked between them
      if (f.p.shape && 'loft' in f.p.shape) {
        const lc = toLocal(f, ctr), la = dirToLocal(f, ax);
        if (Math.abs(la.z) > 0.9) {
          const ext = m.sub!.getSize(new THREE.Vector3()), k = [0, 1, 2].reduce((b, i) => (Math.abs(ax.getComponent(i)) > Math.abs(ax.getComponent(b)) ? i : b), 0);
          const R = Math.max(...[0, 1, 2].filter((i) => i !== k).map((i) => ext.getComponent(i) / 2)) + need.clearance, halfW = ext.getComponent(k) / 2, r = archOf(f.p.shape.loft, lc.x, lc.y, Math.abs(lc.z) - halfW, R);
          if (r === 'clear') continue;
          if (r === 'cut') { dirty = true; say('room to move', m.p.name, `${need.why}: the ${f.p.name} is cut back round it into an arch ${(R * 1000).toFixed(0)} mm round its axle`, true); continue; }
          say('room to move', m.p.name, `${need.why}: the ${f.p.name} is lower than the top of it there, and cannot be cut back round it`, false); continue;
        }
      }
      if (f.p.shell && f.box!.containsPoint(ctr)) {
        // turning inside a box-shaped shell, which cannot be cut into an arch: the shell opened round it (a dark opening on
        // its side) and the wheel set out to stand 2 mm proud of it, so it can be seen (a lofted body is cut instead, above)
        const k = [0, 1, 2].reduce((b, i) => (Math.abs(ax.getComponent(i)) > Math.abs(ax.getComponent(b)) ? i : b), 0), fc = f.box!.getCenter(new THREE.Vector3()), side = Math.sign(ctr.getComponent(k) - fc.getComponent(k)) || 1;
        const half = (m.sub!.max.getComponent(k) - m.sub!.min.getComponent(k)) / 2, faceAt = side > 0 ? f.box!.max.getComponent(k) : f.box!.min.getComponent(k), want = faceAt - side * (half - 0.002);
        const R = Math.max(...[0, 1, 2].filter((i) => i !== k).map((i) => (m.sub!.max.getComponent(i) - m.sub!.min.getComponent(i)) / 2)) + need.clearance;
        if (Math.abs(ctr.getComponent(k) - want) > 1e-3) { const shift = new THREE.Vector3(); shift.setComponent(k, want - ctr.getComponent(k)); moveBy(m, shift); }
        dirty = true;
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
  // an interface holds what it joins (a sprocket on its shaft), touching or not
  for (const c of contracts(nodes.filter((n) => !n.p.detail), touch)) { const a = solid.find((n) => n.p.name === c.provider), b = solid.find((n) => n.p.name === c.requirer); if (a && b) { map.get(id(a))!.add(id(b)); map.get(id(b))!.add(id(a)); } }
  // made as one with what holds it: held by being part of it
  for (const n of solid) if (n.p.one) { const h = ancestors(n).find((a) => map.has(id(a))); if (h) { map.get(id(n))!.add(id(h)); map.get(id(h))!.add(id(n)); } }
  const grounded = solid.filter((n) => n.box!.min.y <= 0.005); for (const n of grounded) { map.get(id(n))!.add('ground'); map.get('ground')!.add(id(n)); }
  if (!grounded.length && solid.length) { const heavy = solid.reduce((a, n) => (massOf({ ...n.p, parts: [] }) > massOf({ ...a.p, parts: [] }) ? n : a)); map.get(id(heavy))!.add('ground'); map.get('ground')!.add(id(heavy)); }
  const eparts: EPart[] = [{ id: 'ground', name: 'the ground', category: '', material: 'soil', shape: { kind: 'block', size: [1, 1, 1] }, at: [0, -1e6, 0], mass: 0, values: [] }, ...solid.map((n) => ({ id: id(n), name: n.p.name, category: '', material: n.p.mat!, shape: { kind: 'block' as const, size: [1, 1, 1] as [number, number, number] }, at: [0, 0, 0] as [number, number, number], mass: 0, values: [] }))];
  const lp = loadPath(eparts, 1e-3, map), byId = new Map(solid.map((n) => [id(n), n]));
  for (const e of lp.floating) {
    const n = byId.get(e.id); if (!n?.box) continue;
    let best: { d: number; to: Node } | null = null; const size = n.box.getSize(new THREE.Vector3()).length();
    // (what turns cannot hold it: a part rested on a tyre would rub; nor is a part moved far: a slip of a few
    // centimetres is put right, a part a span away is a fault in the design, and is said)
    const group = (o: Node) => [o, ...ancestors(o)].find((a) => !!turning(a.p)) ?? null, mine = group(n);
    for (const h of lp.held) { const o = byId.get(h); if (!o?.box || o === n || group(o) !== mine) continue; const d = boxGap(n.box, o.box); if (!best || d < best.d) best = { d, to: o }; }
    if (best && best.d > 0 && best.d < Math.min(size / 4, 0.06)) { const gap = gapBetween(n.box, best.to.box!); moveBy(n, gap); say('held up', n.p.name, `it touched nothing that holds it: set onto the ${best.to.p.name} (${(gap.length() * 1000).toFixed(0)} mm)`, true); }
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
  // ---- interfaces: each pair that meets checked, a failed one said with its numbers ----
  for (const c of contracts(nodes.filter((n) => !n.p.detail))) if (!c.ok) say('interfaces', c.requirer, `on the ${c.provider}: ${c.rows.filter((r) => !r.ok).map((r) => `${r.what} needs ${r.required}, has ${r.provided}`).join('; ')}`, false);
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
/** A loft cut back round a wheel at (x, y) in its own frame, its inner face at |z| = zIn, its room R: the loft's lower edge
 *  raised to the circle's top at every station over it (stations added at its middle, at 0.7 R and at R either side, so
 *  the arch is round). 'clear' if the loft does not reach it, 'cut' if cut, 'too low' if the loft's top is below it. */
function archOf(l: Loft, x: number, y: number, zIn: number, R: number): 'clear' | 'cut' | 'too low' {
  const circle = (dx: number) => y + Math.sqrt(Math.max(0, R * R - dx * dx));
  // (in its span only: at R either side the room's circle comes down to the axle's height and no further)
  const near = [-0.95, -0.7, -0.35, 0, 0.35, 0.7, 0.95].map((f) => stationAt(l, x + f * R)).filter((s): s is Station => !!s);
  if (!near.some((s) => s.w > zIn && s.lo < circle(s.x - x) - 1e-4)) return 'clear';
  // the arch's stations: over it, and at its feet (the axle's height at R, the sill again a little past it)
  for (const f of [-1.15, -1, -0.95, -0.7, -0.35, 0, 0.35, 0.7, 0.95, 1, 1.15]) { const s = stationAt(l, x + f * R); if (s && !l.st.some((q) => Math.abs(q.x - s.x) < 1e-6)) l.st.push(s); }
  let low = false;
  for (const s of l.st) {
    const dx = s.x - x; if (Math.abs(dx) > R * 1.0001 || s.w <= zIn) continue;
    const top = Math.abs(dx) >= R * 0.999 ? y : circle(dx); if (s.lo >= top) continue;
    if (top > s.hi - 0.03) { low = true; continue; } s.lo = top;
  }
  l.st.sort((a, b) => a.x - b.x);
  return low ? 'too low' : 'cut';
}
/** How far a point (y, z in a loft's frame) lies inside a station's section, m (negative: outside it). */
const roomIn = (s: Station, y: number, z: number) => insideBy(s, y, z);
/** Whether an oriented box reaches into a cylinder (its middle, axis, radius and half-length): the box sampled on a grid
 *  finer than a quarter of the radius, each point tested by its distance along and from the axis. */
function hitsCylinder(o: OBB, c: THREE.Vector3, ax: THREE.Vector3, R: number, L: number, Rin = 0): boolean {
  const n = o.h.map((h) => Math.max(2, Math.min(14, Math.ceil((2 * h) / Math.max(1e-3, R / 4)) + 1)));
  const q = new THREE.Vector3(), d = new THREE.Vector3();
  for (let i = 0; i < n[0]!; i++) for (let j = 0; j < n[1]!; j++) for (let k = 0; k < n[2]!; k++) {
    q.copy(o.c).addScaledVector(o.u[0], o.h[0] * (2 * i / (n[0]! - 1) - 1)).addScaledVector(o.u[1], o.h[1] * (2 * j / (n[1]! - 1) - 1)).addScaledVector(o.u[2], o.h[2] * (2 * k / (n[2]! - 1) - 1));
    d.copy(q).sub(c); const a = d.dot(ax); if (Math.abs(a) > L) continue; const r = d.addScaledVector(ax, -a).length(); if (r <= R && r >= Rin) return true;
  }
  return false;
}
const corners = (b: THREE.Box3) => [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z));
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

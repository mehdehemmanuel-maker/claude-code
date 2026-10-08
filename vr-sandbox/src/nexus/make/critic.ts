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
import { classOf, onePiece } from './detail';
import { contacts, dirToLocal, grownOf, layout, least, sat, thingOf, toLocal, type Node, type OBB } from './space';
import { insideBy, stationAt, type Lathe, type Loft, type Station } from '../form';
import { inSweep } from '../panels';
/** How wide a turned part is along its axis: a tyre's width at its sidewalls' widest, from its section (its covering
 *  boxes stand a few millimetres proud of it, which is room for them, not for it). */
const latheWidth = (l: Lathe) => Math.max(...l.map((q) => q[1])) - Math.min(...l.map((q) => q[1]));
import { closestOn, draft, fairness, patchAt, patchPoints, type Patch, type V3 as SV3 } from '../surface';

export interface Finding { check: string; part: string; says: string; fixed: boolean }

// what turns: by the kind of part it is (a wheel's group turns as one: its tyre, rim and disc with it)
const TURNS = /\b(wheels?|tyres?|tires?|rims?|rotors?|propellers?|fans?|augers?|screw conveyors?|gears?|pulleys?|sprockets?|(?:brake )?discs?|saw blades?|fan blades?|rotor blades?|mower blades?|cutting blades?|drums?|turbines?|impellers?|flywheels?|spindles?)\b/i;
/** Whether a part turns, and the room it needs past its ring, m. */
export function turning(p: Part): { clearance: number; why: string; /** beside it, along its axle, where that differs */ side?: number } | null {
  // (a tyre: a rubber ring round an axle big enough to hold air, as detail.ts's ringed is; a joint's boot, a rack's
  // bellows, a bush or a seal is rubber turned round an axle too, but does not roll on the ground)
  const n = p.name.toLowerCase(), big = !!p.shape && ('torus' in p.shape ? p.shape.torus[0] + p.shape.torus[1] > 0.08 : 'lathe' in p.shape ? Math.max(...p.shape.lathe.map(([r]) => r)) > 0.08 : false);
  const tyre = p.mat === 'rubber' && big && !/\b(boot|bellows|bush|seal|gaiter|grommet|mount)/.test(n);
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
    if (dirty) { nodes = layout(root); dirty = false; } const m = nodes.find((x) => x.path === m0.path)!, need = turning(m.p)!, ax = axisOf(m, nodes);
    // (what turns is what is of its link: a brake's caliper carried in a wheel's group, on its own link (its knuckle's, its
    // fork's), does not turn with it, and the room is the wheel's, not the caliper's)
    const ownLink = (x: Node): boolean => { for (let y: Node | null = x; y && y !== m; y = y.parent) if (y.p.link !== undefined && y.p.link !== m.p.link) return false; return true; };
    const turns = nodes.filter((x) => isUnder(x, m) && x.box && ownLink(x)), box = turns.length ? turns.reduce((b, x) => b.union(x.box!), new THREE.Box3()) : m.sub!, ctr = box.getCenter(new THREE.Vector3());
    // the room it needs: the disc it sweeps round its axis (a blade's, not its still box), and the room past that
    // (a round thing's reach is its radius; a blade's, the farthest corner of it from its axis)
    // (a wheel sweeps a ring: inside its rim, behind its face, is where its knuckle, brake and strut foot live)
    const ringIn = nodes.filter((x) => isUnder(x, m) && x.p.mat === 'rubber' && x.p.shape && ('torus' in x.p.shape || 'lathe' in x.p.shape)).map((x) => 'torus' in x.p.shape! ? x.p.shape.torus[0] - x.p.shape.torus[1] : Math.min(...(x.p.shape as { lathe: [number, number][] }).lathe.map(([r]) => r)));
    // (inside its rim's barrel is free for what does not turn, 10 mm clear of the barrel's well, typical of a caliper's
    // room to its wheel: measured from the rim where it is drawn, else 30 mm in from the tyre's bead)
    const rimIn = nodes.filter((x) => isUnder(x, m) && /\brim\b/i.test(x.p.name) && classOf(x.p.mat ?? '') === 'metal' && x.p.shape && 'lathe' in x.p.shape).map((x) => Math.min(...(x.p.shape as { lathe: [number, number][] }).lathe.map(([r]) => r)));
    const bore = rimIn.length ? Math.max(0, Math.min(...rimIn) - 0.01) : ringIn.length ? Math.max(0, Math.min(...ringIn) - 0.03) : 0;
    const roundish = nodes.some((x) => isUnder(x, m) && x.p.shape && ('torus' in x.p.shape || 'cyl' in x.p.shape || 'lathe' in x.p.shape) && !x.p.detail), ext = box.getSize(new THREE.Vector3());
    const sweep = roundish ? Math.max(...[0, 1, 2].map((i) => (ext.getComponent(i) / 2) * Math.sqrt(Math.max(0, 1 - ax.getComponent(i) ** 2)))) : Math.max(...corners(box).map((q) => q.clone().sub(ctr).sub(ax.clone().multiplyScalar(q.clone().sub(ctr).dot(ax))).length())), along = Math.max(...corners(box).map((q) => Math.abs(q.clone().sub(ctr).dot(ax))));
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
      // (what is carried with it, steered and risen with it as a knuckle is with its wheel, is never in its way)
      if ([f, ...ancestors(f)].some((a) => a.p.movesWith === m.p.name)) continue;
      if (f === m || !f.obb || f.p.detail || isUnder(f, m) || isUnder(m, f) || turning(f.p) || ancestors(f).some((a) => turning(a.p)) || !f.p.mat || classOf(f.p.mat) === 'soft' || classOf(f.p.mat) === 'organic') continue;
      if (!env.intersectsBox(f.box!) || !f.pieces.some((pc) => sat(boxOBB(env), pc, 0))) continue;
      // (and then exactly: within the cylinder it sweeps, not merely that cylinder's box)
      if (!f.pieces.some((pc) => hitsCylinder(pc, ctr, ax, sweep + need.clearance, along + sideRoom, bore))) continue;
      // a skin (src/nexus/panels.ts) is tested exactly, point by point on it, against the room the wheel sweeps through
      // its lock and its bump: its arch is its maker's to draw (from that same sweep), never the critic's to cut
      if (f.p.shape && 'surf' in f.p.shape) {
        // (its tyre sweeps the ring about the tyre's own middle, its full width; what is inside its rim, the hub and the
        // brake, reaches further in but only within the rim's bore)
        const ez = ax.clone().normalize(), ey = new THREE.Vector3(0, 1, 0).addScaledVector(ez, -ez.y).normalize(), ex = ey.clone().cross(ez), tr = m.p.travel ?? {};
        const tyreN = nodes.find((x) => isUnder(x, m) && x.p.mat === 'rubber' && x.box), tc = tyreN ? tyreN.box!.getCenter(new THREE.Vector3()) : ctr, tw = !tyreN ? 2 * along : tyreN.p.shape && 'lathe' in tyreN.p.shape ? latheWidth(tyreN.p.shape.lathe) : Math.abs(tyreN.box!.getSize(new THREE.Vector3()).dot(ez));
        const off = tc.clone().sub(ctr).dot(ez), room = { radial: need.clearance, side: sideRoom, poses: 7 };
        const section = tyreN?.p.shape && 'lathe' in tyreN.p.shape ? tyreN.p.shape.lathe : undefined, tyreSweep = { name: m.p.name, x: 0, y: 0, z: off, R: sweep, w: tw, steer: tr.steer ?? 0, bump: tr.bump ?? 0, section }, hubSweep = { ...tyreSweep, z: 0, R: Math.max(0, bore), w: 2 * along, section: undefined };
        // (a skin by the wheel straight ahead through its bump and at full lock at ride height, as its arch is drawn (BODY_RULES
        // 'lip'); a wheelhouse's liner by its whole sweep, lock in bump, from the strip along its lip on in: that strip is the
        // arch's, the tyre passing just behind it)
        const liner = /liner/.test(f.p.name), straight = { ...tyreSweep, steer: 0 }, atRest = { ...tyreSweep, bump: 0 };
        const hit = patchPoints(f.p.shape.surf as Patch, 30, 14).map((q) => new THREE.Vector3(...q).applyMatrix4(f.m).sub(ctr)).find((d, i) => { const l: [number, number, number] = [d.dot(ex), d.dot(ey), d.dot(ez)]; if (inSweep(l, hubSweep, { ...room, radial: 0 })) return true; return liner ? (i % 15) / 14 >= 0.15 && inSweep(l, tyreSweep, room) : inSweep(l, straight, room) || inSweep(l, atRest, room); });
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
  // ---- skins: how each meets its neighbours (as its maker says, and why), whether it parts from its die, how tight it bends ----
  skinChecks(nodes, say);
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

// ---- skins (src/nexus/panels.ts): each checked once, its own results kept with it ----------------------------------
const formed = new WeakMap<Patch, { least: number; pull: SV3; rmin: number; rminAt: [number, number] }>(), grids = new WeakMap<Patch, { a: number; b: number; at: SV3 }[]>();
const met = new WeakMap<Patch, Map<string, { gap: number; angle: number }>>(), ids = new WeakMap<Patch, number>(); let nextId = 0;
const idOf = (pt: Patch) => { let i = ids.get(pt); if (i === undefined) { i = nextId++; ids.set(pt, i); } return i; };
const gridOf = (pt: Patch) => { let g = grids.get(pt); if (!g) { g = []; for (let i = 0; i <= 40; i++) for (let j = 0; j <= 16; j++) g.push({ a: i / 40, b: j / 16, at: patchAt(pt, i / 40, j / 16).at }); grids.set(pt, g); } return g; };
const deg = (r: number) => (r * 180) / Math.PI;
/** A skin's meetings with its neighbours checked against what its maker said of them: across a mirror, its normal with no
 *  part across the mirror (within 1°); in one tangent plane with a neighbour (G1: within 8 mm and 3°); a crease, within
 *  8 mm. A pressed or moulded skin is pulled from its die from the best direction there is (the die tipped as a stamping
 *  engineer sets it), and said where it would still lock in; and its tightest radius is said where it is under three
 *  times its sheet's thickness (tighter than an outer panel is pressed without splitting, typical). */
function skinChecks(nodes: Node[], say: (check: string, part: string, says: string, fixed: boolean) => void): void {
  const skins = nodes.filter((n) => n.p.shape && 'surf' in n.p.shape && !n.p.detail);
  for (const n of skins) {
    const pt = (n.p.shape as { surf: Patch }).surf;
    for (const m of n.p.meets ?? []) {
      const ts = Array.from({ length: 19 }, (_, k) => 0.05 + (0.9 * k) / 18), ab = (t: number): [number, number] => (m.edge === 'a0' ? [0, t] : m.edge === 'a1' ? [1, t] : m.edge === 'b0' ? [t, 0] : [t, 1]);
      if (m.kind === 'mirror') {
        let worst = 0; for (const t of ts) { const q = patchAt(pt, ...ab(t)); if (Math.abs(q.at[2]) < 2e-3) worst = Math.max(worst, deg(Math.asin(Math.min(1, Math.abs(q.n[2]))))); }
        if (worst > 1) say('continuity', n.p.name, `it meets its own mirror at ${worst.toFixed(1)}°, not in one tangent plane (${m.why})`, false);
        continue;
      }
      const other = skins.find((x) => x.p.name === m.part); if (!other) { say('continuity', n.p.name, `it is to meet the ${m.part}, which is not there`, false); continue; }
      // (each point of this edge taken into the neighbour's frame, the point of the neighbour nearest it found, and the
      // two normals compared there)
      const opt = (other.p.shape as { surf: Patch }).surf, into = new THREE.Matrix4().copy(other.m).invert().multiply(n.m), rot = new THREE.Matrix3().setFromMatrix4(into), og = gridOf(opt);
      // (what two skins' meeting is depends only on them, the edge, and where one stands from the other: kept, so a car
      // park of one model, or the critic's next round, does not work it out again)
      let seen = met.get(pt); if (!seen) { seen = new Map(); met.set(pt, seen); }
      const mk = `${idOf(opt)}|${m.edge}|${into.elements.map((v) => v.toFixed(4)).join(',')}`; let got = seen.get(mk);
      if (!got) {
        let g2 = 0, a2 = 0;
        for (const t of ts) {
          const q = patchAt(pt, ...ab(t)), P = new THREE.Vector3(...q.at).applyMatrix4(into), c = closestOn(opt, [P.x, P.y, P.z], og), on = patchAt(opt, c.a, c.b).n;
          g2 = Math.max(g2, c.d); a2 = Math.max(a2, deg(Math.acos(Math.min(1, Math.abs(new THREE.Vector3(...q.n).applyMatrix3(rot).normalize().dot(new THREE.Vector3(...on)))))));
        }
        got = { gap: g2, angle: a2 }; seen.set(mk, got);
      }
      const { gap, angle } = got;
      if (gap > 0.008) say('continuity', n.p.name, `it is to meet the ${m.part} (${m.why}), but stands ${(gap * 1000).toFixed(0)} mm from it`, false);
      else if (m.kind === 'G1' && angle > 3) say('continuity', n.p.name, `it meets the ${m.part} at ${angle.toFixed(1)}°, not in one tangent plane (${m.why})`, false);
    }
    const pressed = n.p.make === 'pressed' || (classOf(n.p.mat) === 'polymer' && !!n.p.shell);
    if (!pressed) continue;
    let f = formed.get(pt); if (!f) { const d = draft(pt, undefined, 16, 10), fr = fairness(pt, 24, 12); f = { least: d.least, pull: d.pull, rmin: fr.rmin, rminAt: fr.rminAt }; formed.set(pt, f); }
    if (f.least < -0.5 * (Math.PI / 180)) say('draft', n.p.name, `it would lock in its die: an undercut of ${(-deg(f.least)).toFixed(1)}° however the press is set (its best, along ${f.pull.map((v) => v.toFixed(2)).join(', ')})`, false);
    if (n.p.shell && n.p.make === 'pressed' && f.rmin < 3 * n.p.shell) say('radius', n.p.name, `it bends to a ${(f.rmin * 1000).toFixed(1)} mm radius (at ${f.rminAt.map((v) => v.toFixed(2)).join(', ')} on it), tighter than ${(n.p.shell * 1000).toFixed(1)} mm sheet is pressed (about three times its thickness, typical)`, false);
  }
}

// ---- clashes: every triangle of every part against every other part's ----
// A box says two parts might meet; only their surfaces say whether they do. What a person sees as wrong at a glance up
// close is one part showing through another (a handle sunk in its door, a liner through its fender, a beam through the
// dash) or two surfaces laid on each other so closely that the nearer flickers through (z-fighting): both found here
// from the drawn triangles themselves, anywhere on the thing, whatever the parts are.
/** A part as drawn: its triangles in the world, and where it is in the tree (its holders' names). */
export interface TriMesh { name: string; path: string; pos: ArrayLike<number>; idx?: ArrayLike<number>; mat?: string; /** its holder's material */ holder?: string; /** a weld's bead, fused into what it joins */ weld?: boolean; /** what passes through an opening in it */ passes?: string[]; /** how it is fixed to what holds it or sits beside it (Part.fixed): welded to it, seated on it, clipped into it */ joined?: string; /** the parts the joints laid on it join it to, by name (Part.joins) */ joins?: string[]; /** a weld bead's: the parts it welds together, by name (it is one with those, and nothing else it touches) */ welds?: string[]; /** the rigid link it is one of (Part.link, its holders' where not said; '' the thing's own frame) */ link?: string; /** the kind of joint it is (Part.joint) */ joint?: string; /** its own mass, kg (without what it holds) */ kg?: number; /** which drawn part it is, where two share a path (a left and a right of one name under one holder) */ id?: string; /** its sheet's thickness where it is a pressed or moulded shell (Part.shell), m */ shell?: number }
type CV3 = [number, number, number];
/** Where two parts meet: crossing (one through the other), touching (within the tolerance, across each other), or
 *  layered (laid parallel within it: a decal or a seam on a panel, which flickers if it is too close). */
export interface Clash { a: string; b: string; pa: string; pb: string; /** through: one passes into the other; meets: they cross only where both end (two panels joined edge to edge, as a door's top meets its glass's belt); touch and layered as said */ kind: 'through' | 'meets' | 'touch' | 'layered' | /** one piece with what holds it (cast or moulded together, or welded), so not one part in another */ 'fused' | /** through an opening one of them has for it */ 'fitted' | /** face to face where a joint (welds, bolts, screws, a seal) joins them, as built */ 'joined'; hits: number; at: CV3; min: CV3; max: CV3; /** how far the meeting runs, m (the diagonal of what it covers) */ span: number; /** the mean normal of the surfaces there, to look along */ normal: CV3; /** how far one passes into the other, m, where one of them is closed (a solid's surface) */ depth?: number; /** a holder and what it holds, or two held by one holder */ kin: 'holds' | 'siblings' | 'apart'; /** fitted: false where its maker says it passes through an opening but none is drawn (the two cross) */ opening?: boolean; /** joined or fused: why, as its maker or a joint says (a joint's record, or Part.fixed) */ by?: string; /** the two meshes' places in the list given */ ia?: number; ib?: number }
interface Tris { n: number; v: Float64Array; box: Float64Array; nor: Float64Array; lo: CV3; hi: CV3; /** which of each triangle's edges is on the mesh's boundary (one triangle uses it), a bit each */ edge: Uint8Array; /** no boundary at all: the surface of a solid, which has an inside */ closed: boolean }
function trisOf(m: TriMesh): Tris {
  const P = m.pos, I = m.idx, n = Math.floor((I ? I.length : P.length / 3) / 3), v = new Float64Array(n * 9), box = new Float64Array(n * 6), nor = new Float64Array(n * 3), lo: CV3 = [Infinity, Infinity, Infinity], hi: CV3 = [-Infinity, -Infinity, -Infinity];
  for (let t = 0; t < n; t++) {
    for (let k = 0; k < 3; k++) { const vi = I ? I[t * 3 + k]! : t * 3 + k; for (let c = 0; c < 3; c++) v[t * 9 + k * 3 + c] = P[vi * 3 + c]!; }
    for (let c = 0; c < 3; c++) { const a = v[t * 9 + c]!, b = v[t * 9 + 3 + c]!, d = v[t * 9 + 6 + c]!, mn = Math.min(a, b, d), mx = Math.max(a, b, d); box[t * 6 + c] = mn; box[t * 6 + 3 + c] = mx; if (mn < lo[c]!) lo[c] = mn; if (mx > hi[c]!) hi[c] = mx; }
    const ux = v[t * 9 + 3]! - v[t * 9]!, uy = v[t * 9 + 4]! - v[t * 9 + 1]!, uz = v[t * 9 + 5]! - v[t * 9 + 2]!, wx = v[t * 9 + 6]! - v[t * 9]!, wy = v[t * 9 + 7]! - v[t * 9 + 1]!, wz = v[t * 9 + 8]! - v[t * 9 + 2]!;
    const nx = uy * wz - uz * wy, ny = uz * wx - ux * wz, nz = ux * wy - uy * wx, l = Math.hypot(nx, ny, nz) || 1; nor[t * 3] = nx / l; nor[t * 3 + 1] = ny / l; nor[t * 3 + 2] = nz / l;
  }
  // (its boundary: the edges only one triangle uses, its corners matched by where they are, to a hundredth of a millimetre)
  const key = (t: number, k: number) => `${Math.round(v[t * 9 + k * 3]! * 1e5)},${Math.round(v[t * 9 + k * 3 + 1]! * 1e5)},${Math.round(v[t * 9 + k * 3 + 2]! * 1e5)}`, ids = new Map<string, number>(), vid = new Int32Array(n * 3);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) { const s2 = key(t, k); let id = ids.get(s2); if (id === undefined) { id = ids.size; ids.set(s2, id); } vid[t * 3 + k] = id; }
  const uses = new Map<number, number>(), ek = (a: number, b: number) => (a < b ? a * 4194304 + b : b * 4194304 + a);
  for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) { const e = ek(vid[t * 3 + k]!, vid[t * 3 + ((k + 1) % 3)]!); uses.set(e, (uses.get(e) ?? 0) + 1); }
  const edge = new Uint8Array(n); for (let t = 0; t < n; t++) for (let k = 0; k < 3; k++) if (uses.get(ek(vid[t * 3 + k]!, vid[t * 3 + ((k + 1) % 3)]!)) === 1) edge[t] |= 1 << k;
  return { n, v, box, nor, lo, hi, edge, closed: edge.every((x) => x === 0) };
}
/** Whether a point is within d of one of triangle t's boundary edges. */
function nearEdge(p: CV3, T: Tris, t: number, d: number): boolean {
  for (let k = 0; k < 3; k++) {
    if (!(T.edge[t]! & (1 << k))) continue; const o = t * 9, a: CV3 = [T.v[o + k * 3]!, T.v[o + k * 3 + 1]!, T.v[o + k * 3 + 2]!], k2 = (k + 1) % 3, b: CV3 = [T.v[o + k2 * 3]!, T.v[o + k2 * 3 + 1]!, T.v[o + k2 * 3 + 2]!];
    const ab: CV3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-18, s = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2));
    if (Math.hypot(p[0] - a[0] - ab[0] * s, p[1] - a[1] - ab[1] * s, p[2] - a[2] - ab[2] * s) < d) return true;
  }
  return false;
}
/** Where the segment p→q crosses triangle t of T (Möller and Trumbore's test), or null. */
function segTri(p: CV3, q: CV3, T: Tris, t: number): CV3 | null {
  const v = T.v, o = t * 9, e1 = [v[o + 3]! - v[o]!, v[o + 4]! - v[o + 1]!, v[o + 5]! - v[o + 2]!], e2 = [v[o + 6]! - v[o]!, v[o + 7]! - v[o + 1]!, v[o + 8]! - v[o + 2]!], d = [q[0] - p[0], q[1] - p[1], q[2] - p[2]];
  const h = [d[1]! * e2[2]! - d[2]! * e2[1]!, d[2]! * e2[0]! - d[0]! * e2[2]!, d[0]! * e2[1]! - d[1]! * e2[0]!], a = e1[0]! * h[0]! + e1[1]! * h[1]! + e1[2]! * h[2]!;
  // (a segment lying in the triangle's plane, to within rounding, does not cross it: two faces laid on each other, a
  // disc's hat on its wheel's face, are touching, which rounding must not make a crossing)
  const nx = e1[1]! * e2[2]! - e1[2]! * e2[1]!, ny = e1[2]! * e2[0]! - e1[0]! * e2[2]!, nz = e1[0]! * e2[1]! - e1[1]! * e2[0]!, nl = Math.hypot(nx, ny, nz) || 1e-30, dl = Math.hypot(d[0]!, d[1]!, d[2]!) || 1e-30;
  if (Math.abs(a) < 1e-9 * nl * dl) return null;
  { const pd = ((p[0] - v[o]!) * nx + (p[1] - v[o + 1]!) * ny + (p[2] - v[o + 2]!) * nz) / nl, qd = ((q[0] - v[o]!) * nx + (q[1] - v[o + 1]!) * ny + (q[2] - v[o + 2]!) * nz) / nl; if (Math.abs(pd) < 1e-7 || Math.abs(qd) < 1e-7) return null; }
  const f = 1 / a, s = [p[0] - v[o]!, p[1] - v[o + 1]!, p[2] - v[o + 2]!], u = f * (s[0]! * h[0]! + s[1]! * h[1]! + s[2]! * h[2]!); if (u < 0 || u > 1) return null;
  const qq = [s[1]! * e1[2]! - s[2]! * e1[1]!, s[2]! * e1[0]! - s[0]! * e1[2]!, s[0]! * e1[1]! - s[1]! * e1[0]!], w = f * (d[0]! * qq[0]! + d[1]! * qq[1]! + d[2]! * qq[2]!); if (w < 0 || u + w > 1) return null;
  // (strictly within the segment: an end lying on the triangle is a touch, found as one, not a crossing)
  const tt = f * (e2[0]! * qq[0]! + e2[1]! * qq[1]! + e2[2]! * qq[2]!); if (tt <= 1e-6 || tt >= 1 - 1e-6) return null;
  return [p[0] + d[0]! * tt, p[1] + d[1]! * tt, p[2] + d[2]! * tt];
}
/** The least distance from a point to triangle t of T (Ericson, Real-Time Collision Detection 5.1.5). */
function pointTri(p: CV3, T: Tris, t: number): number {
  const v = T.v, o = t * 9, a: CV3 = [v[o]!, v[o + 1]!, v[o + 2]!], b: CV3 = [v[o + 3]!, v[o + 4]!, v[o + 5]!], c: CV3 = [v[o + 6]!, v[o + 7]!, v[o + 8]!];
  const sub3 = (x: CV3, y: CV3): CV3 => [x[0] - y[0], x[1] - y[1], x[2] - y[2]], dot3 = (x: CV3, y: CV3) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], dist = (x: CV3) => Math.hypot(p[0] - x[0], p[1] - x[1], p[2] - x[2]);
  const ab = sub3(b, a), ac = sub3(c, a), ap = sub3(p, a), d1 = dot3(ab, ap), d2 = dot3(ac, ap); if (d1 <= 0 && d2 <= 0) return dist(a);
  const bp = sub3(p, b), d3 = dot3(ab, bp), d4 = dot3(ac, bp); if (d3 >= 0 && d4 <= d3) return dist(b);
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const k = d1 / (d1 - d3); return dist([a[0] + ab[0] * k, a[1] + ab[1] * k, a[2] + ab[2] * k]); }
  const cp = sub3(p, c), d5 = dot3(ab, cp), d6 = dot3(ac, cp); if (d6 >= 0 && d5 <= d6) return dist(c);
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const k = d2 / (d2 - d6); return dist([a[0] + ac[0] * k, a[1] + ac[1] * k, a[2] + ac[2] * k]); }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const k = (d4 - d3) / (d4 - d3 + (d5 - d6)); return dist([b[0] + (c[0] - b[0]) * k, b[1] + (c[1] - b[1]) * k, b[2] + (c[2] - b[2]) * k]); }
  const den = 1 / (va + vb + vc), sv = vb * den, tw = vc * den; return dist([a[0] + ab[0] * sv + ac[0] * tw, a[1] + ab[1] * sv + ac[1] * tw, a[2] + ab[2] * sv + ac[2] * tw]);
}
/** Every place two parts' surfaces cross or come within `touch` of each other (1 mm unless said), each pair once. */
export function meshClashes(meshes: TriMesh[], o: { touch?: number; skip?: (a: TriMesh, b: TriMesh) => boolean; /** a holder and what it holds that are one piece (src/nexus/make/detail.ts's onePiece, unless said) */ fused?: (a: TriMesh, b: TriMesh, kin: Clash['kin']) => boolean } = {}): Clash[] {
  // (a holder and what it holds of its one casting, or two it holds that are: an alloy wheel's barrel, centre and spokes)
  // (and a part drawn in pieces, its patches under one name and holder (a skin split at a crease, a door in two), is one
  // pressing with itself)
  const fused = o.fused ?? ((a: TriMesh, b: TriMesh, kin: Clash['kin']) => (a.name === b.name && a.path === b.path && a.mat === b.mat && !!a.mat) || (a.weld && (!a.welds || a.welds.includes(b.name))) || (b.weld && (!b.welds || b.welds.includes(a.name))) || (onePiece(a.mat, b.mat) && (kin === 'holds' || (kin === 'siblings' && (a.holder === a.mat || (/^(abs|pp|pu|nylon)$/.test(a.mat ?? '') && a.path.split('/').length > 2))))));
  // (a moulding's own pieces are one with each other under the part they make (a wheel cover's rim and spokes); two
  // mouldings that only share the whole thing as their holder (a car's B pillar trim and its belt moulding) are not)
  const fitted = (a: TriMesh, b: TriMesh) => !!a.passes?.includes(b.name) || !!b.passes?.includes(a.name);
  const tol = o.touch ?? 0.001, T = meshes.map(trisOf), out: Clash[] = [];
  const kinOf = (a: TriMesh, b: TriMesh): Clash['kin'] => (b.path.startsWith(a.path + '/') || a.path.startsWith(b.path + '/') ? 'holds' : a.path.slice(0, a.path.lastIndexOf('/')) === b.path.slice(0, b.path.lastIndexOf('/')) ? 'siblings' : 'apart');
  for (let i = 0; i < meshes.length; i++) for (let j = i + 1; j < meshes.length; j++) {
    const A = T[i]!, B = T[j]!; if (!A.n || !B.n) continue;
    const lo: CV3 = [0, 0, 0], hi: CV3 = [0, 0, 0]; let apart = false;
    for (let c = 0; c < 3; c++) { lo[c] = Math.max(A.lo[c]!, B.lo[c]!) - tol; hi[c] = Math.min(A.hi[c]!, B.hi[c]!) + tol; if (lo[c]! > hi[c]!) apart = true; }
    if (apart || o.skip?.(meshes[i]!, meshes[j]!)) continue;
    const inO = (X: Tris) => { const ids: number[] = []; for (let t = 0; t < X.n; t++) { let ok = true; for (let c = 0; c < 3 && ok; c++) if (X.box[t * 6 + c]! > hi[c]! || X.box[t * 6 + 3 + c]! < lo[c]!) ok = false; if (ok) ids.push(t); } return ids; };
    const ia = inO(A); if (!ia.length) continue; const ib = inO(B); if (!ib.length) continue;
    // (B's triangles in a grid over where the two overlap, so each of A's is tried only against those near it)
    const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]), h = Math.max(ext / 48, 0.003), nx = Math.max(1, Math.ceil((hi[0] - lo[0]) / h)), ny = Math.max(1, Math.ceil((hi[1] - lo[1]) / h)), nz = Math.max(1, Math.ceil((hi[2] - lo[2]) / h));
    const cell = (x: number, c: number, nn: number) => Math.max(0, Math.min(nn - 1, Math.floor((x - lo[c]!) / h))), grid = new Map<number, number[]>();
    for (const t of ib) { const x0 = cell(B.box[t * 6]! - tol, 0, nx), x1 = cell(B.box[t * 6 + 3]! + tol, 0, nx), y0 = cell(B.box[t * 6 + 1]! - tol, 1, ny), y1 = cell(B.box[t * 6 + 4]! + tol, 1, ny), z0 = cell(B.box[t * 6 + 2]! - tol, 2, nz), z1 = cell(B.box[t * 6 + 5]! + tol, 2, nz); for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) { const k = (x * ny + y) * nz + z; let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(t); } }
    // (each place they meet kept with what kind of meeting it is: 0 through, 1 where both end, 2 touching, 3 laid parallel)
    const seen = new Int32Array(B.n).fill(-1), hits: { p: CV3; k: number; n: CV3; ta: number; tb: number }[] = [];
    for (const ta of ia) {
      const near0: number[] = [], x0 = cell(A.box[ta * 6]!, 0, nx), x1 = cell(A.box[ta * 6 + 3]!, 0, nx), y0 = cell(A.box[ta * 6 + 1]!, 1, ny), y1 = cell(A.box[ta * 6 + 4]!, 1, ny), z0 = cell(A.box[ta * 6 + 2]!, 2, nz), z1 = cell(A.box[ta * 6 + 5]!, 2, nz);
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (const tb of grid.get((x * ny + y) * nz + z) ?? []) if (seen[tb] !== ta) { seen[tb] = ta; near0.push(tb); }
      if (!near0.length) continue;
      const va = (k: number): CV3 => [A.v[ta * 9 + k * 3]!, A.v[ta * 9 + k * 3 + 1]!, A.v[ta * 9 + k * 3 + 2]!];
      for (const tb of near0) {
        let ov = true; for (let c = 0; c < 3 && ov; c++) if (A.box[ta * 6 + c]! > B.box[tb * 6 + 3 + c]! + tol || A.box[ta * 6 + 3 + c]! < B.box[tb * 6 + c]! - tol) ov = false; if (!ov) continue;
        const vb = (k: number): CV3 => [B.v[tb * 9 + k * 3]!, B.v[tb * 9 + k * 3 + 1]!, B.v[tb * 9 + k * 3 + 2]!];
        const nAB: CV3 = [A.nor[ta * 3]! + B.nor[tb * 3]!, A.nor[ta * 3 + 1]! + B.nor[tb * 3 + 1]!, A.nor[ta * 3 + 2]! + B.nor[tb * 3 + 2]!];
        let crossed = false;
        // (an edge of either crossing the other's triangle; where it is an edge each ends at, and the crossing is at the
        // other's end too, the two are joined there, not one through the other)
        // (every edge tried, so both ends of where two triangles cross are kept and a meeting's length is its own)
        // (through only where it is within both: a crossing on either one's edge is that edge resting on the other's face, as
        // a wheel's mounting face on its hub, and on both, the two joined there; 3 mm, so a seam's band where two skins meet
        // in one tangent plane is a join, not a crossing)
        const kindAt = (x: CV3) => { const ea = nearEdge(x, A, ta, 0.003), eb = nearEdge(x, B, tb, 0.003); return ea && eb ? 1 : ea || eb ? 2 : 0; };
        for (let e = 0; e < 3; e++) { const x = segTri(va(e), va((e + 1) % 3), B, tb); if (x) { hits.push({ p: x, k: kindAt(x), n: nAB, ta, tb }); crossed = true; } }
        for (let e = 0; e < 3; e++) { const x = segTri(vb(e), vb((e + 1) % 3), A, ta); if (x) { hits.push({ p: x, k: kindAt(x), n: nAB, ta, tb }); crossed = true; } }
        if (crossed) continue;
        // (not crossing: is a corner of either within the tolerance of the other, and are they laid parallel there?)
        const par = Math.abs(A.nor[ta * 3]! * B.nor[tb * 3]! + A.nor[ta * 3 + 1]! * B.nor[tb * 3 + 1]! + A.nor[ta * 3 + 2]! * B.nor[tb * 3 + 2]!) > 0.97;
        // (a corner on its own part's edge lying on the other's edge: the two joined there, edge to edge)
        const onEdge = (T2: Tris, t2: number, k: number) => !!(T2.edge[t2]! & ((1 << k) | (1 << ((k + 2) % 3))));
        const before = hits.length;
        for (let k = 0; k < 3; k++) {
          if (pointTri(va(k), B, tb) < tol) hits.push({ p: va(k), k: onEdge(A, ta, k) && nearEdge(va(k), B, tb, tol) ? 1 : par ? 3 : 2, n: nAB, ta, tb });
          if (pointTri(vb(k), A, ta) < tol) hits.push({ p: vb(k), k: onEdge(B, tb, k) && nearEdge(vb(k), A, ta, tol) ? 1 : par ? 3 : 2, n: nAB, ta, tb });
        }
        // (and two edges passing within it, where no corner is: two tubes crossed square, a ring's rim against a tube, as
        // the least distance measures them, so the two never disagree)
        if (hits.length === before) for (let e = 0; e < 3; e++) for (let f = 0; f < 3; f++) {
          const [p, q2] = segSeg(va(e), va((e + 1) % 3), vb(f), vb((f + 1) % 3)), d = Math.hypot(p[0] - q2[0], p[1] - q2[1], p[2] - q2[2]);
          if (d < tol) { hits.push({ p: [(p[0] + q2[0]) / 2, (p[1] + q2[1]) / 2, (p[2] + q2[2]) / 2], k: (A.edge[ta]! & (1 << e)) && (B.edge[tb]! & (1 << f)) ? 1 : par ? 3 : 2, n: nAB, ta, tb }); e = 3; break; }
        }
      }
    }
    if (!hits.length) continue;
    // each place apart its own meeting (a mirrored skin meets its liner on both sides of the car; a bolt's two ends): the
    // hits joined where they share a triangle of either part (so a crossing is followed along its own curve however large
    // its triangles), or lie within 2 cm of each other
    const par = hits.map((_, k) => k), find = (k: number): number => (par[k] === k ? k : (par[k] = find(par[k]!))), join = (a: number, b: number) => { par[find(a)] = find(b); };
    const byA = new Map<number, number>(), byB = new Map<number, number>(); hits.forEach((hh, k) => { const a = byA.get(hh.ta), b = byB.get(hh.tb); if (a !== undefined) join(k, a); else byA.set(hh.ta, k); if (b !== undefined) join(k, b); else byB.set(hh.tb, k); });
    const C = 0.02, cells = new Map<string, number[]>(); hits.forEach((hh, k) => { const ck = hh.p.map((x) => Math.floor(x / C)).join(','); let l = cells.get(ck); if (!l) cells.set(ck, (l = [])); l.push(k); });
    for (const [ck, ks] of cells) { const [x, y, z] = ck.split(',').map(Number) as CV3; for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) { const o2 = cells.get(`${x + dx},${y + dy},${z + dz}`); if (o2) for (const k of o2) join(k, ks[0]!); } }
    const groups = new Map<number, typeof hits>(); hits.forEach((hh, k) => { const g = find(k); let l = groups.get(g); if (!l) groups.set(g, (l = [])); l.push(hh); });
    for (const hs of groups.values()) {
      const mn: CV3 = [Infinity, Infinity, Infinity], mx: CV3 = [-Infinity, -Infinity, -Infinity], at: CV3 = [0, 0, 0], ns: CV3 = [0, 0, 0], cnt = [0, 0, 0, 0];
      for (const hh of hs) { cnt[hh.k]!++; for (let c = 0; c < 3; c++) { mn[c] = Math.min(mn[c]!, hh.p[c]!); mx[c] = Math.max(mx[c]!, hh.p[c]!); at[c] += hh.p[c]! / hs.length; ns[c] += hh.n[c]!; } }
      // (through where any of it is one passing into the other, unless nearly all of it is the two ending together)
      // (laid on it where most of it is parallel within the tolerance, a decal's outline meeting the panel's edge or not)
      const kind: Clash['kind'] = cnt[0]! > 0.1 * (cnt[0]! + cnt[1]! + cnt[2]!) && cnt[0]! >= 2 ? 'through' : cnt[3]! >= 0.5 * (cnt[1]! + cnt[2]! + cnt[3]!) && cnt[3]! > 0 ? 'layered' : cnt[1]! > cnt[2]! ? 'meets' : 'touch';
      // how deep: the corners of either's crossing triangles that are inside the other (where it is closed), by their
      // distance to its nearest face there, signed by that face's normal; under 2 mm it is resting on it, not in it
      let depth: number | undefined;
      if (cnt[0]! > 0 && (A.closed || B.closed)) {
        depth = 0;
        // (inside by parity, a ray from the corner crossing the solid's surface an odd number of times, so the way its
        // triangles are wound cannot mislead it; then how far in, to its nearest face)
        const inside = (p: CV3, Q: Tris) => { const far: CV3 = [p[0] + 37.1, p[1] + 41.3, p[2] + 29.7]; let k = 0; for (let q = 0; q < Q.n; q++) if (segTri(p, far, Q, q)) k++; return k % 2 === 1; };
        const probe = (P: Tris, ts: Set<number>, Q: Tris) => { const seenV = new Set<string>(); for (const t of ts) for (let k = 0; k < 3; k++) { const p: CV3 = [P.v[t * 9 + k * 3]!, P.v[t * 9 + k * 3 + 1]!, P.v[t * 9 + k * 3 + 2]!], key = p.join(','); if (seenV.has(key)) continue; seenV.add(key); if (Q.n > 40000 || !inside(p, Q)) continue; let best = Infinity; for (const q of Q.n <= 6000 ? Array.from({ length: Q.n }, (_, i2) => i2) : qs(Q)) best = Math.min(best, pointTri(p, Q, q)); if (best < 0.5 && best > depth!) depth = best; } };
        // (the other's triangles met in this meeting, and those near them: enough to find the nearest face to each corner)
        const qs = (Q: Tris) => (Q === A ? [...new Set(hs.map((x) => x.ta))] : [...new Set(hs.map((x) => x.tb))]);
        if (B.closed) probe(A, new Set(hs.map((x) => x.ta)), B); if (A.closed) probe(B, new Set(hs.map((x) => x.tb)), A);
      }
      const nl = Math.hypot(...ns) || 1, kin = kinOf(meshes[i]!, meshes[j]!), kind2 = kind === 'through' && depth !== undefined && depth < 0.002 ? 'touch' : kind;
      // (a part said to be fixed to what holds it or beside it, welded, seated or clipped, meets it as it is fixed: unless
      // it passes deep into it, which no fixing explains)
      // (what a maker or a joint says explains only a meeting face to face: no word explains one passing into the other,
      // and where neither is closed there is no depth to excuse a crossing by, so it stays one: a liner said to be 4 mm in
      // from its skin that crosses it is through it, whatever it is said to be)
      // (and only of what it names: a word on how a part is fixed labels its meeting with another where it names that other,
      // or names none; "clipped to its inner wheelhouse" says nothing of the fender the liner also meets, and a seat's weld
      // to its tube is not the spring's. Nor where one is sunk in the other: a label is earned face to face, with no depth)
      const flush = kind2 !== 'through' && (depth === undefined || depth < 0.0005);
      // (a word that names the other labels its meeting with it wherever it is; one that names none, only its meeting with
      // what holds it or sits beside it)
      const claimFor0 = (p: TriMesh, q: TriMesh) => { const c = claimOf(p.joined, q); return c === 2 || (c === 1 && kin !== 'apart') ? p.joined : undefined; }, claimFor = claimFor0;
      const fixedBy = flush ? claimFor(meshes[i]!, meshes[j]!) ?? claimFor(meshes[j]!, meshes[i]!) : undefined;
      // (and two parts a joint was laid on, face to face where it joins them)
      const joinedBy = flush && (!!meshes[i]!.joins?.includes(meshes[j]!.name) || !!meshes[j]!.joins?.includes(meshes[i]!.name));
      // (through an opening its maker says one has for the other: where they cross, the opening is said, not drawn)
      const fit = fitted(meshes[i]!, meshes[j]!), isFused = ((kin !== 'apart' || meshes[i]!.weld || meshes[j]!.weld) && fused(meshes[i]!, meshes[j]!, kin)) || /weld/.test(fixedBy ?? '');
      // (where a maker says two metal parts of one assembly are welded together and they overlap, the overlap is the weld's
      // fillet, which is not drawn: one piece, said so)
      // (or lap one on the other at a flange, sunk where they are spot-welded: a pressing's flange on the next)
      // (of one assembly by any weld it says; across two, as a rack's post to its frame, only by a weld that names the other)
      const weldsTo = (p: TriMesh, q: TriMesh) => { const c = claimFor0(p, q); return !!c && /weld/i.test(c) && (kin !== 'apart' || claimOf(p.joined, q) === 2); };
      const weldLap = (kind2 === 'through' || !flush) && METAL.test(meshes[i]!.mat ?? '') && METAL.test(meshes[j]!.mat ?? '') && (weldsTo(meshes[i]!, meshes[j]!) || weldsTo(meshes[j]!, meshes[i]!));
      const kindF: Clash['kind'] = fit ? 'fitted' : joinedBy ? 'joined' : isFused || weldLap ? 'fused' : fixedBy ? 'joined' : kind2;
      const by = kindF === 'joined' ? (joinedBy ? 'a joint laid on them' : fixedBy) : kindF === 'fused' ? (weldLap ? `${claimFor0(meshes[i]!, meshes[j]!) ?? claimFor0(meshes[j]!, meshes[i]!)} (overlapping where the weld's fillet would be, not drawn)` : fixedBy && /weld/.test(fixedBy) ? fixedBy : meshes[i]!.weld || meshes[j]!.weld ? 'the weld bead between them' : 'one casting or moulding') : undefined;
      out.push({ a: meshes[i]!.name, b: meshes[j]!.name, pa: meshes[i]!.path, pb: meshes[j]!.path, ia: i, ib: j, kind: kindF, ...(depth !== undefined ? { depth } : {}), ...(fit ? { opening: cnt[0]! === 0 } : {}), ...(by ? { by } : {}), hits: hs.length, at, min: mn, max: mx, span: Math.hypot(mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]), normal: [ns[0] / nl, ns[1] / nl, ns[2] / nl], kin });
    }
  }
  const rank = { through: 0, touch: 1, layered: 2, meets: 3, joined: 4, fitted: 4, fused: 5 } as const;
  return out.sort((p, q) => rank[p.kind] - rank[q.kind] || q.span - p.span);
}

// ---- least distance: one measure for every question of how far apart two parts are ----
// (the gap the bench reports and the meetings the clash finder finds are both read from this, so they cannot disagree:
// once the gap was the least corner-to-corner distance, which for two boxes is far more than the true one)
/** The point of triangle t of T nearest p (Ericson, Real-Time Collision Detection 5.1.5). */
function nearestOnTri(p: CV3, T: Tris, t: number): CV3 {
  const v = T.v, o = t * 9, a: CV3 = [v[o]!, v[o + 1]!, v[o + 2]!], b: CV3 = [v[o + 3]!, v[o + 4]!, v[o + 5]!], c: CV3 = [v[o + 6]!, v[o + 7]!, v[o + 8]!];
  const sub3 = (x: CV3, y: CV3): CV3 => [x[0] - y[0], x[1] - y[1], x[2] - y[2]], dot3 = (x: CV3, y: CV3) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const ab = sub3(b, a), ac = sub3(c, a), ap = sub3(p, a), d1 = dot3(ab, ap), d2 = dot3(ac, ap); if (d1 <= 0 && d2 <= 0) return a;
  const bp = sub3(p, b), d3 = dot3(ab, bp), d4 = dot3(ac, bp); if (d3 >= 0 && d4 <= d3) return b;
  const vc = d1 * d4 - d3 * d2; if (vc <= 0 && d1 >= 0 && d3 <= 0) { const k = d1 / (d1 - d3); return [a[0] + ab[0] * k, a[1] + ab[1] * k, a[2] + ab[2] * k]; }
  const cp = sub3(p, c), d5 = dot3(ab, cp), d6 = dot3(ac, cp); if (d6 >= 0 && d5 <= d6) return c;
  const vb = d5 * d2 - d1 * d6; if (vb <= 0 && d2 >= 0 && d6 <= 0) { const k = d2 / (d2 - d6); return [a[0] + ac[0] * k, a[1] + ac[1] * k, a[2] + ac[2] * k]; }
  const va = d3 * d6 - d5 * d4; if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const k = (d4 - d3) / (d4 - d3 + (d5 - d6)); return [b[0] + (c[0] - b[0]) * k, b[1] + (c[1] - b[1]) * k, b[2] + (c[2] - b[2]) * k]; }
  const den = 1 / (va + vb + vc), sv = vb * den, tw = vc * den; return [a[0] + ab[0] * sv + ac[0] * tw, a[1] + ab[1] * sv + ac[1] * tw, a[2] + ab[2] * sv + ac[2] * tw];
}
/** The nearest points of segments p1→q1 and p2→q2 (Ericson 5.1.9). */
function segSeg(p1: CV3, q1: CV3, p2: CV3, q2: CV3): [CV3, CV3] {
  const d1: CV3 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]], d2: CV3 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]], r: CV3 = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const dot3 = (x: CV3, y: CV3) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2], a = dot3(d1, d1), e = dot3(d2, d2), f = dot3(d2, r), cl = (x: number) => Math.max(0, Math.min(1, x));
  let s = 0, t = 0;
  if (a < 1e-18 && e < 1e-18) { s = 0; t = 0; } else if (a < 1e-18) { t = cl(f / e); } else {
    const c = dot3(d1, r); if (e < 1e-18) { s = cl(-c / a); } else { const b = dot3(d1, d2), den = a * e - b * b; s = den > 1e-18 ? cl((b * f - c * e) / den) : 0; t = (b * s + f) / e; if (t < 0) { t = 0; s = cl(-c / a); } else if (t > 1) { t = 1; s = cl((b - c) / a); } }
  }
  return [[p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s], [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t]];
}
const vtx = (T: Tris, t: number, k: number): CV3 => [T.v[t * 9 + k * 3]!, T.v[t * 9 + k * 3 + 1]!, T.v[t * 9 + k * 3 + 2]!];
/** The least distance between two triangles, and the points where it is (0 where they cross). */
function triTri(A: Tris, ta: number, B: Tris, tb: number): { d: number; p: CV3; q: CV3 } {
  for (let e = 0; e < 3; e++) { const x = segTri(vtx(A, ta, e), vtx(A, ta, (e + 1) % 3), B, tb) ?? segTri(vtx(B, tb, e), vtx(B, tb, (e + 1) % 3), A, ta); if (x) return { d: 0, p: x, q: x }; }
  let best = { d: Infinity, p: [0, 0, 0] as CV3, q: [0, 0, 0] as CV3 };
  const take = (p: CV3, q: CV3) => { const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); if (d < best.d) best = { d, p, q }; };
  for (let k = 0; k < 3; k++) { const pa = vtx(A, ta, k); take(pa, nearestOnTri(pa, B, tb)); const pb = vtx(B, tb, k); take(nearestOnTri(pb, A, ta), pb); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const [p, q] = segSeg(vtx(A, ta, i), vtx(A, ta, (i + 1) % 3), vtx(B, tb, j), vtx(B, tb, (j + 1) % 3)); take(p, q); }
  return best;
}
const triGap = (alo: ArrayLike<number>, ahi: ArrayLike<number>, blo: ArrayLike<number>, bhi: ArrayLike<number>) => Math.hypot(Math.max(0, blo[0]! - ahi[0]!, alo[0]! - bhi[0]!), Math.max(0, blo[1]! - ahi[1]!, alo[1]! - bhi[1]!), Math.max(0, blo[2]! - ahi[2]!, alo[2]! - bhi[2]!));
const triLo = (T: Tris, t: number) => [T.box[t * 6]!, T.box[t * 6 + 1]!, T.box[t * 6 + 2]!], triHi = (T: Tris, t: number) => [T.box[t * 6 + 3]!, T.box[t * 6 + 4]!, T.box[t * 6 + 5]!];
/** How the least distance is measured, said with it. */
export const LEAST_METHOD = 'triangle to triangle: every corner of each against every face of the other, and every edge against every edge, among the triangles near enough to matter; 0 where they cross';
/** The least distance between two drawn parts and where it is, exactly as their triangles stand (0 where they cross), no
 *  further than `beyond` looked (Infinity past it). Their triangles taken in order of how near they could be, so the
 *  search stops as soon as nothing nearer is possible. */
export function leastDistance(a: TriMesh | Tris, b: TriMesh | Tris, beyond = Infinity): { d: number; at: CV3; p: CV3; q: CV3 } | null {
  const A = 'n' in a ? a : trisOf(a), B = 'n' in b ? b : trisOf(b); if (!A.n || !B.n) return null;
  let best = { d: beyond, p: [0, 0, 0] as CV3, q: [0, 0, 0] as CV3 };
  if (triGap(A.lo, A.hi, B.lo, B.hi) >= best.d) return null;
  // (each one's triangles that could be within the best of the other's whole box, nearest first)
  const near = (X: Tris, Y: Tris) => { const ids: [number, number][] = []; for (let t = 0; t < X.n; t++) { const g = triGap(triLo(X, t), triHi(X, t), Y.lo, Y.hi); if (g < best.d) ids.push([g, t]); } return ids.sort((p, q) => p[0] - q[0]); };
  const ia = near(A, B), ib = near(B, A); if (!ia.length || !ib.length) return null;
  // (B's in a grid, so each of A's is tried only against those near it; the grid's cells about the size of B's triangles)
  let ext = 0; for (const [, t] of ib) for (let c = 0; c < 3; c++) ext = Math.max(ext, B.box[t * 6 + 3 + c]! - B.box[t * 6 + c]!);
  const h = Math.max(0.002, Math.min(0.2, ext)), key = (x: number, y: number, z: number) => `${x},${y},${z}`, grid = new Map<string, number[]>(), cell = (x: number) => Math.floor(x / h);
  for (const [, t] of ib) for (let x = cell(B.box[t * 6]!); x <= cell(B.box[t * 6 + 3]!); x++) for (let y = cell(B.box[t * 6 + 1]!); y <= cell(B.box[t * 6 + 4]!); y++) for (let z = cell(B.box[t * 6 + 2]!); z <= cell(B.box[t * 6 + 5]!); z++) { const k = key(x, y, z); let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(t); }
  const seen = new Int32Array(B.n).fill(-1);
  for (const [g, ta] of ia) {
    if (g >= best.d) break;
    // (the cells within the best so far of this triangle; where that is far, B's near triangles taken straight)
    const r = Math.min(best.d, 1e3), lo = triLo(A, ta).map((x) => x - r), hi = triHi(A, ta).map((x) => x + r), cand: number[] = [];
    const cells = (cell(hi[0]!) - cell(lo[0]!) + 1) * (cell(hi[1]!) - cell(lo[1]!) + 1) * (cell(hi[2]!) - cell(lo[2]!) + 1);
    if (!isFinite(cells) || cells > ib.length) { for (const [, tb] of ib) cand.push(tb); }
    else for (let x = cell(lo[0]!); x <= cell(hi[0]!); x++) for (let y = cell(lo[1]!); y <= cell(hi[1]!); y++) for (let z = cell(lo[2]!); z <= cell(hi[2]!); z++) for (const tb of grid.get(key(x, y, z)) ?? []) if (seen[tb] !== ta) { seen[tb] = ta; cand.push(tb); }
    for (const tb of cand) {
      if (triGap(triLo(A, ta), triHi(A, ta), triLo(B, tb), triHi(B, tb)) >= best.d) continue;
      const r2 = triTri(A, ta, B, tb); if (r2.d < best.d) { best = r2; if (best.d === 0) break; }
    }
    if (best.d === 0) break;
  }
  if (!(best.d < beyond)) return null;
  return { d: best.d, p: best.p, q: best.q, at: [(best.p[0] + best.q[0]) / 2, (best.p[1] + best.q[1]) / 2, (best.p[2] + best.q[2]) / 2] };
}

// ---- held: what holds what, and whether what should move can ----
// (the critic's first tool, asked for in its second round: it found by hand, one gap at a time, a hub welded to its
// knuckle, an arm welded to it, a wheel 25 mm off its hub, a caliper and a subframe touching nothing)
//   floats    the parts are a graph, joined where they meet (any meeting the clash finder finds, within its tolerance) or
//             stand on the ground; every group not joined to the heaviest is held by nothing, and is said with the
//             nearest part of the rest and how far it is
//   blocks    a link (Part.link: a wheel, a knuckle, an arm) meets another only at a joint that lets them move (a bearing,
//             a ball joint, a bush); a weld, a fastener or one casting laid across two links stops that motion
//   rubs      two links that meet with no joint between them (a tyre on its liner, an arm on its subframe's face)
//   unjointed a link that meets no other through a joint: it cannot move as it is said to, or it is held by nothing
// (a maker's word names a part where one of that part's own words is in it, sides and plurals aside; it names none where it
// says of all it meets, or names no place at all: "pressed", "cast as one")
const SIDES = /\b(front|rear|left|right)\b/g, stemsOf = (s: string) => new Set(s.toLowerCase().replace(SIDES, ' ').split(/[^a-z]+/).filter((w) => w.length >= 3 && !/^(the|and|its|with|for)$/.test(w)).map((w) => w.replace(/(es|s)$/, '')));
const TARGET = /\b(to|into|onto|on|in|under|through|across|over|from|against|between|round|inside|beside)\s+(its|the|a|an|their|each|two|three|four|both)\b/i;
/** Whether a maker's word on how a part is fixed speaks of another: 2 where it names it, 1 where it names nothing (it says
 *  it of all it meets), 0 where it names something else. */
export function claimOf(text: string | undefined, other: TriMesh): 0 | 1 | 2 {
  if (!text) return 0;
  // (by its head noun, the last word of its name, or its holder's: "bolted to its caliper ear" names an ear, not the
  // caliper's halves; "sliding in its carrier" names the legs of the carrier that holds them; a weld names no rubber)
  if (/weld/i.test(text) && !METAL.test(other.mat ?? '')) return 0;
  const ws = stemsOf(text), head = (s: string) => [...stemsOf(s.replace(/\(.*?\)/g, ' '))].pop(), segs = other.path.split('/'), hs = [head(other.name), segs.length > 2 ? head(segs[segs.length - 2]!) : undefined];
  for (const h of hs) if (h && ws.has(h)) return 2;
  return /what it (meets|touches)|where it meets|wherever it meets/i.test(text) || !TARGET.test(text) ? 1 : 0;
}
const METAL = /^(steel|al|cast|iron|zamak|zinc|ti|copper|brass|bronze)/i;
export interface Held {
  /** groups held by nothing: not reached from the root by joints that carry load. Each with how it touches the rest
   *  without being held by it (crossing it, a point's touch, a plain touch no joint is said for, the ground) */
  floats: { parts: string[]; n: number; kg: number; nearest: { a: string; b: string; d: number; at: CV3 } | null; via: string[] }[];
  blocks: { links: [string, string]; by: string; a: string; b: string; at: CV3 }[];
  rubs: { links: [string, string]; a: string; b: string; at: CV3; kind: Clash['kind'] }[];
  joints: { links: [string, string]; joint: string; a: string; b: string }[];
  unjointed: { link: string; parts: number; meets: string[] }[];
  /** a link (one rigid body) whose parts are not all one: its pieces, and how far apart the two largest are */
  splits: { link: string; pieces: string[][]; gap: number | null }[];
  /** a link joined to too few others to be held and to pass on what it carries: a shaft with a joint at one end only */
  chains: { link: string; joinedTo: string[]; needs: string }[];
  /** where a part is said to pass through an opening in another and none is drawn: the two cross */
  saidNotDrawn: { a: string; b: string; n: number }[];
  /** the root everything must reach (the heaviest group held together: the body, or a frame), how many parts, its mass */ main: { n: number; kg: number; root: string; parts: string[] };
  method: string;
}
const FRAME = 'its frame';
/** What holds what (held:, v2, the critic's round 3): from a root, the heaviest group held together, each part must be
 *  reached by joints that carry load, as built: a meeting face to face (no crossing, no point's touch: 5 mm of it at the
 *  least) that a record explains (a joint laid on the two, a weld or one casting, a maker's word on how one is fixed to the
 *  other, an opening said for it) or across which one of them is a joint (a bearing, a bush, a mount, a spring, a ball
 *  joint, a slide, a hinge). The ground holds nothing up: what reaches the root only by standing on the road floats. And
 *  each link's own parts must be one, and each link joined to as many others as it needs to carry anything. */
export function held(meshes: TriMesh[], clashes: Clash[] = meshClashes(meshes)): Held {
  // (a part drawn as several meshes is one node: by which drawn part it is, else its path; a left and a right of one
  // name under one holder are two)
  const keyOf = (m: TriMesh) => m.id ?? m.path, ids = new Map<string, number>(), node = (key: string) => { let k = ids.get(key); if (k === undefined) { k = ids.size; ids.set(key, k); } return k; };
  meshes.forEach((m) => node(keyOf(m))); const N = ids.size, par = Array.from({ length: N }, (_, i) => i);
  const find = (k: number): number => (par[k] === k ? k : (par[k] = find(par[k]!))), join = (a: number, b: number) => { par[find(a)] = find(b); };
  const byPath = new Map<string, TriMesh>(); for (const m of meshes) if (!byPath.has(keyOf(m))) byPath.set(keyOf(m), m);
  const meshOf = (c: Clash, side: 0 | 1) => meshes[side ? c.ib! : c.ia!] ?? meshes.find((m) => m.path === (side ? c.pb : c.pa))!;
  // (what holds: no crossing, flush, 5 mm of meeting at the least, and a record of it or a joint across it)
  const sunk = (c: Clash) => c.kind === 'through' || (c.depth !== undefined && c.depth >= 0.0005 && c.kind !== 'fitted' && c.kind !== 'fused');
  // (a cover, a bellows or a boot, is held by its own link's part it is clamped on, and holds nothing across to another: it
  // follows what it covers)
  const covers = (c: Clash) => meshOf(c, 0).joint === 'cover' || meshOf(c, 1).joint === 'cover', sameLink = (c: Clash) => (meshOf(c, 0).link || '') === (meshOf(c, 1).link || '');
  // (a point's touch is under 5 mm of meeting, or under half the smaller part where that is smaller still: an M3 bolt's
  // head meets its washer over less than 5 mm and is not touching it at a point)
  const EXT = new Map<TriMesh, number>(), ext = (m: TriMesh) => { let e = EXT.get(m); if (e === undefined) { const t = trisOf(m); EXT.set(m, (e = t.n ? Math.max(t.hi[0]! - t.lo[0]!, t.hi[1]! - t.lo[1]!, t.hi[2]! - t.lo[2]!) : 0)); } return e; };
  const least = (c: Clash) => Math.min(0.005, 0.5 * Math.min(ext(meshOf(c, 0)), ext(meshOf(c, 1))));
  const holds = (c: Clash) => { if (sunk(c) || c.span < least(c)) return false; if (covers(c)) return sameLink(c); if (c.kind === 'joined' || c.kind === 'fused' || c.kind === 'fitted') return true; const a = meshOf(c, 0), b = meshOf(c, 1); return !!(a.joint || b.joint); };
  const whyNot = (c: Clash) => (c.kind === 'through' ? 'crossing' : sunk(c) ? `sunk ${((c.depth ?? 0) * 1000).toFixed(1)} mm` : c.span < least(c) ? 'a point\'s touch' : 'a touch no joint is said for');
  // (a constant-velocity joint carries torque, not weight: what it joins is held by it only where it is the lighter, as a
  // drive shaft hangs between its joints; an engine is not held up by its drive shafts, but by its mounts)
  const cvEdge = (c: Clash) => { const a = meshOf(c, 0), b = meshOf(c, 1); return (a.link || '') !== (b.link || '') && (a.joint === 'cv' || b.joint === 'cv'); };
  for (const c of clashes) if (holds(c) && !cvEdge(c)) join(node(keyOf(meshOf(c, 0))), node(keyOf(meshOf(c, 1))));
  { const kg0 = new Map<number, number>(); for (const [k2, m] of byPath) { const g = find(node(k2)); kg0.set(g, (kg0.get(g) ?? 0) + (m.kg ?? 0)); }
    const nb = new Map<number, Set<number>>(); for (const c of clashes) if (holds(c) && cvEdge(c)) { const ga = find(node(keyOf(meshOf(c, 0)))), gb = find(node(keyOf(meshOf(c, 1)))); if (ga === gb) continue; (nb.get(ga) ?? nb.set(ga, new Set()).get(ga)!).add(gb); (nb.get(gb) ?? nb.set(gb, new Set()).get(gb)!).add(ga); }
    for (const [g, ns] of nb) { const mine = kg0.get(g) ?? 0, heavier = [...ns].filter((h) => (kg0.get(h) ?? 0) > mine).sort((p, q) => (kg0.get(q) ?? 0) - (kg0.get(p) ?? 0)); if (heavier.length) join(g, heavier[0]!); } }
  const T = new Map<TriMesh, Tris>(), tris = (m: TriMesh) => { let t = T.get(m); if (!t) T.set(m, (t = trisOf(m))); return t; };
  const onGround = new Set<string>(); for (const m of meshes) if (tris(m).n && tris(m).lo[1]! < 0.005) onGround.add(keyOf(m));
  // (the groups, and how heavy each is: the heaviest is the root)
  const groups = new Map<number, string[]>(); for (const [p, k] of ids) { const g = find(k); let l = groups.get(g); if (!l) groups.set(g, (l = [])); l.push(p); }
  const kgOf = (ps: string[]) => ps.reduce((s, p) => s + (byPath.get(p)?.kg ?? 0), 0), nameOf = (p: string) => byPath.get(p)?.name ?? p;
  const ranked = [...groups.entries()].map(([g, ps]) => ({ g, ps, kg: kgOf(ps) })).sort((p, q) => q.kg - p.kg || q.ps.length - p.ps.length);
  const main = ranked[0], heaviest = main ? [...main.ps].sort((p, q) => (byPath.get(q)?.kg ?? 0) - (byPath.get(p)?.kg ?? 0))[0] : undefined;
  const out: Held = { floats: [], blocks: [], rubs: [], joints: [], unjointed: [], splits: [], chains: [], saidNotDrawn: [], main: { n: main?.ps.length ?? 0, kg: +(main?.kg ?? 0).toFixed(1), root: heaviest ? nameOf(heaviest) : '', parts: main ? [...new Set([...main.ps].sort((p, q) => (byPath.get(q)?.kg ?? 0) - (byPath.get(p)?.kg ?? 0)).map(nameOf))].slice(0, 24) : [] }, method: `held from the heaviest group held together, by meetings face to face (flush, 5 mm of it at the least) that a record explains (a joint laid on them, a weld or one casting, a maker's word naming the other, an opening said for it) or a joint is across; the ground holds nothing up; distances ${LEAST_METHOD}` };
  // (what touches what without holding it, by group, for each float's account of itself)
  const touchVia = new Map<number, Set<string>>(); for (const c of clashes) { if (holds(c)) continue; const ga = find(node(keyOf(meshOf(c, 0)))), gb = find(node(keyOf(meshOf(c, 1)))); if (ga === gb) continue; for (const [g, o] of [[ga, c.b], [gb, c.a]] as const) (touchVia.get(g) ?? touchVia.set(g, new Set()).get(g)!).add(`${whyNot(c)} of ${o}`); }
  for (const r of ranked.slice(1)) {
    // (its nearest part not in it: the meshes of the rest nearest by box first, measured until none nearer is possible)
    const mine = new Set(r.ps), own = meshes.filter((m) => mine.has(keyOf(m)) && tris(m).n), rest = meshes.filter((m) => !mine.has(keyOf(m)) && tris(m).n);
    let best: Held['floats'][number]['nearest'] = null;
    const pairs: [number, TriMesh, TriMesh][] = []; for (const a of own) for (const b of rest) pairs.push([triGap(tris(a).lo, tris(a).hi, tris(b).lo, tris(b).hi), a, b]);
    pairs.sort((p, q) => p[0] - q[0]);
    for (const [g, a, b] of pairs.slice(0, 400)) { if (best && g >= best.d) break; const d = leastDistance(tris(a), tris(b), best?.d ?? Infinity); if (d && (!best || d.d < best.d)) best = { a: a.name, b: b.name, d: +d.d.toFixed(4), at: d.at.map((x) => +x.toFixed(4)) as CV3 }; }
    // (named by its heaviest parts, so a subframe with its arms and rack reads as the subframe)
    const names = [...new Set(r.ps.sort((p, q) => (byPath.get(q)?.kg ?? 0) - (byPath.get(p)?.kg ?? 0)).map(nameOf))];
    const via = [...(touchVia.get(r.g) ?? [])].slice(0, 6); if (r.ps.some((p) => onGround.has(p))) via.unshift('standing on the ground (which holds nothing up)');
    out.floats.push({ parts: names.slice(0, 8), n: r.ps.length, kg: +r.kg.toFixed(2), nearest: best, via });
  }
  out.floats.sort((p, q) => q.kg - p.kg);
  // (links: where two meet, it must be at a joint, and never by anything rigid)
  const linkOf = (p: string) => byPath.get(p)?.link || FRAME, RIGID = /\b(hex head|washer|screw|bolt|rivet|stud|nut)\b|weld/i;
  const meets = new Map<string, Set<string>>(), jointed = new Set<string>(), count = new Map<string, number>(), jl = new Map<string, Map<string, Set<string>>>(); for (const p of byPath.keys()) count.set(linkOf(p), (count.get(linkOf(p)) ?? 0) + 1);
  for (const c of clashes) {
    const ma = meshOf(c, 0), mb = meshOf(c, 1), la = ma.link || FRAME, lb = mb.link || FRAME; if (la === lb || covers(c)) continue; const links = [la, lb].sort() as [string, string];
    (meets.get(la) ?? meets.set(la, new Set()).get(la)!).add(lb); (meets.get(lb) ?? meets.set(lb, new Set()).get(lb)!).add(la);
    const rigid = c.kind === 'fused' ? 'one piece (fused)' : ma?.weld || mb?.weld ? 'a weld bead' : RIGID.test(c.a) || RIGID.test(c.b) ? `a fastener (${RIGID.test(c.a) ? c.a : c.b})` : undefined;
    // (where both sides say a joint, the one that moves most is what they make: a cup turning in its seal and a spider rolling in
    // it make a constant-velocity joint, not a bearing)
    const RANK = ['cv', 'universal', 'ball', 'slide', 'hinge', 'bearing', 'bush', 'spring', 'mount'], joint = ma?.joint && mb?.joint ? [ma.joint, mb.joint].sort((p, q) => (RANK.indexOf(p) + 99) % 99 - (RANK.indexOf(q) + 99) % 99)[0] : ma?.joint ?? mb?.joint;
    if (rigid) out.blocks.push({ links, by: rigid, a: c.a, b: c.b, at: c.at });
    else if (joint && !sunk(c)) { jointed.add(la); jointed.add(lb); for (const [x, y] of [[la, lb], [lb, la]]) { const m2 = jl.get(x) ?? jl.set(x, new Map()).get(x)!; (m2.get(y) ?? m2.set(y, new Set()).get(y)!).add(joint); } if (!out.joints.some((j) => j.links[0] === links[0] && j.links[1] === links[1] && j.joint === joint)) out.joints.push({ links, joint, a: c.a, b: c.b }); }
    else out.rubs.push({ links, a: c.a, b: c.b, at: c.at, kind: c.kind });
  }
  for (const [l, n] of count) if (l !== FRAME && !jointed.has(l)) out.unjointed.push({ link: l, parts: n, meets: [...(meets.get(l) ?? [])] });
  // (each link's own parts one rigid body: joined by any meeting but a crossing)
  const lp = new Map<string, string[]>(); for (const p of byPath.keys()) { const l = linkOf(p); if (l !== FRAME) (lp.get(l) ?? lp.set(l, []).get(l)!).push(p); }
  const lpar = new Map<string, string>(), lfind = (p: string): string => { const q = lpar.get(p) ?? p; if (q === p) return p; const r2 = lfind(q); lpar.set(p, r2); return r2; };
  for (const c of clashes) { if (c.kind === 'through') continue; const a = keyOf(meshOf(c, 0)), b = keyOf(meshOf(c, 1)); if (linkOf(a) !== linkOf(b) || linkOf(a) === FRAME) continue; lpar.set(lfind(a), lfind(b)); }
  for (const [l, ps] of lp) {
    const by = new Map<string, string[]>(); for (const p of ps) { const r2 = lfind(p); (by.get(r2) ?? by.set(r2, []).get(r2)!).push(p); } if (by.size < 2) continue;
    const pieces = [...by.values()].sort((p, q) => kgOf(q) - kgOf(p)), A = meshes.filter((m) => pieces[0]!.includes(keyOf(m)) && tris(m).n), B = meshes.filter((m) => pieces[1]!.includes(keyOf(m)) && tris(m).n);
    let gap: number | null = null; for (const a of A) for (const b of B) { const d = leastDistance(tris(a), tris(b), gap ?? Infinity); if (d && (gap === null || d.d < gap)) gap = d.d; }
    out.splits.push({ link: l, pieces: pieces.map((pc) => [...new Set(pc.map(nameOf))].slice(0, 6)), gap: gap === null ? null : +gap.toFixed(4) });
  }
  // (each link joined to as many others as it must be to carry anything: a wheel or a hand's control to one, a shaft or a
  // rod to one at each end; a drive shaft by a constant-velocity joint at each)
  for (const [l] of lp) {
    const nb = jl.get(l) ?? new Map<string, Set<string>>(), ps = lp.get(l)!, wheel = ps.some((p) => /^(tyre|outer tyre)\b/.test(nameOf(p))), hand = ps.some((p) => /^steering wheel$|handlebar/.test(nameOf(p)));
    const need = wheel || hand ? 1 : 2, cv = [...nb.entries()].filter(([, ks]) => ks.has('cv')).length, drive = /drive shaft/.test(l);
    if (nb.size < need || (drive && cv < 2)) out.chains.push({ link: l, joinedTo: [...nb.entries()].map(([o, ks]) => `${o} (${[...ks].join(', ')})`), needs: drive ? 'a constant-velocity joint at each end, to what drives it and to what it drives' : need === 1 ? 'a joint to what it turns on' : 'a joint at each end: to what holds it and to what it moves' });
  }
  // (each opening said and not drawn, pair by pair)
  const snd = new Map<string, { a: string; b: string; n: number }>(); for (const c of clashes) if (c.kind === 'fitted' && c.opening === false) { const k = [c.a, c.b].sort().join('|'); const e = snd.get(k) ?? { a: c.a, b: c.b, n: 0 }; e.n++; snd.set(k, e); }
  out.saidNotDrawn = [...snd.values()].sort((p, q) => q.n - p.n);
  return out;
}
/** What a frame is built of, judged by what joins its parts (held v3, the critic's frame tool): the body-in-white, its
 *  steel sheet joined by welds, bonds, drawn bolts and castings alone, which must be one piece without the powertrain;
 *  every place a load comes into it (a mount, a bush, a spring's seat, a hinge, a slide) reached from that piece by
 *  steel alone; each moving link's joints, and those that cannot move as they say (a rod sliding at both ends, a link
 *  held rigidly and by a moving joint to the same thing); joints said by parts that cannot be them (a boot is never a
 *  joint); and what is held only through openings said and not drawn. */
export interface Frame {
  /** the frame's steel sheet in pieces joined by structure alone, heaviest first, each with what joins it to the next by anything else */
  biw: { n: number; kg: number; parts: string[]; cut: string[] }[];
  /** the frame's structure (its sheet, and the steel bolted or welded to it, as a subframe), from its heaviest piece */
  structure: { n: number; kg: number };
  /** where a load comes into the frame and the part it comes to is not in its structure */
  loads: { at: string; from: string; by: string; reaches: string }[];
  /** each moving link's joints, and a fault where they cannot move as they say */
  links: { link: string; joints: string[]; fault?: string }[];
  /** joints said by parts that cannot be them */
  kinds: { part: string; joint: string; why: string }[];
  /** parts held to the root only through openings said and not drawn */
  saidHeld: { parts: string[]; kg: number }[];
}
const ISOLATOR = new Set(['mount', 'bush', 'spring']), KINEMATIC = new Set(['ball', 'slide', 'bearing', 'cv', 'universal', 'hinge']), ELASTOMER = /^(rubber|pu|foam|epdm|nbr)$/;
export function frame(meshes: TriMesh[], clashes: Clash[] = meshClashes(meshes)): Frame {
  const keyOf = (m: TriMesh) => m.id ?? m.path, byKey = new Map<string, TriMesh>(); for (const m of meshes) if (!byKey.has(keyOf(m))) byKey.set(keyOf(m), m);
  const meshOf = (c: Clash, side: 0 | 1) => meshes[side ? c.ib! : c.ia!] ?? meshes.find((m) => m.path === (side ? c.pb : c.pa))!;
  const linkOf = (m: TriMesh) => m.link || FRAME, kgOf = (ks: Iterable<string>) => [...ks].reduce((a, k) => a + (byKey.get(k)?.kg ?? 0), 0);
  const sunk = (c: Clash) => c.kind === 'through' || (c.depth !== undefined && c.depth >= 0.0005 && c.kind !== 'fitted' && c.kind !== 'fused');
  // (each meeting, by what it is: structure (welded, bonded, bolted, cast as one, with nothing that gives between),
  // an isolator (rubber, a mount, a bush, a spring), a moving joint, a cover, or nothing that holds)
  const FASTENER = /\b(bolt|nut|stud|screw|rivet|washer)\b/i;
  const classOf = (c: Clash): 'structure' | 'isolator' | 'kinematic' | 'cover' | 'none' => {
    const a = meshOf(c, 0), b = meshOf(c, 1); if (a.joint === 'cover' || b.joint === 'cover') return 'cover';
    if (sunk(c) || c.span < 0.005) return 'none';
    const joints = [a.joint, b.joint].filter(Boolean) as string[];
    if (joints.some((j) => KINEMATIC.has(j)) && linkOf(a) !== linkOf(b)) return 'kinematic';
    if (joints.some((j) => ISOLATOR.has(j)) || ELASTOMER.test(a.mat ?? '') || ELASTOMER.test(b.mat ?? '')) return 'isolator';
    if (c.kind === 'fused' || c.kind === 'joined' || c.kind === 'fitted' || FASTENER.test(a.name) || FASTENER.test(b.name)) return 'structure';
    return joints.length ? 'kinematic' : 'none';
  };
  const cls = clashes.map(classOf);
  const uf = () => { const par = new Map<string, string>(), find = (k: string): string => { const q = par.get(k) ?? k; if (q === k) return k; const r = find(q); par.set(k, r); return r; }; return { find, join: (a: string, b: string) => { const ra = find(a), rb = find(b); if (ra !== rb) par.set(ra, rb); } }; };
  const METALS = /^(steel|al-|aluminium|iron|cast-iron|stainless)/;
  // (the body-in-white: the frame's own steel sheet, with nothing that gives between its pieces)
  const sheet = new Set([...byKey.values()].filter((m) => linkOf(m) === FRAME && /^steel/.test(m.mat ?? '') && (m.shell ?? 0) > 0 && (m.shell ?? 0) < 0.004).map(keyOf));
  const u1 = uf(); clashes.forEach((c, i) => { const a = keyOf(meshOf(c, 0)), b = keyOf(meshOf(c, 1)); if (cls[i] === 'structure' && sheet.has(a) && sheet.has(b)) u1.join(a, b); });
  const pieces = new Map<string, string[]>(); for (const k of sheet) { const r = u1.find(k); (pieces.get(r) ?? pieces.set(r, []).get(r)!).push(k); }
  const ranked = [...pieces.values()].sort((p, q) => kgOf(q) - kgOf(p)), nm = (k: string) => byKey.get(k)?.name ?? k, names = (ks: string[]) => [...new Set([...ks].sort((p, q) => (byKey.get(q)?.kg ?? 0) - (byKey.get(p)?.kg ?? 0)).map(nm))];
  const out: Frame = { biw: [], structure: { n: 0, kg: 0 }, loads: [], links: [], kinds: [], saidHeld: [] };
  const pieceOf = new Map<string, number>(); ranked.forEach((ps, i) => ps.forEach((k) => pieceOf.set(k, i)));
  for (const [i, ps] of ranked.entries()) {
    // (what joins this piece to another piece by anything but structure: its cut)
    const cut = new Map<string, number>(); clashes.forEach((c, j) => { const a = keyOf(meshOf(c, 0)), b = keyOf(meshOf(c, 1)); const pa = pieceOf.get(a), pb = pieceOf.get(b); if (cls[j] === 'structure' && pa !== undefined && pb !== undefined) return; if (cls[j] === 'none' || cls[j] === 'cover') return; const mine = pa === i ? b : pb === i ? a : null; if (!mine || pieceOf.get(mine) === i) return; const lab = `${nm(mine)} (${cls[j]})`; cut.set(lab, (cut.get(lab) ?? 0) + 1); });
    out.biw.push({ n: ps.length, kg: +kgOf(ps).toFixed(1), parts: names(ps).slice(0, 12), cut: [...cut.entries()].map(([l, n]) => (n > 1 ? `${l} ×${n}` : l)).slice(0, 8) });
  }
  // (the frame's structure: its sheet and the metal joined to it by structure, in the frame's own link)
  const metal = new Set([...byKey.values()].filter((m) => linkOf(m) === FRAME && METALS.test(m.mat ?? '')).map(keyOf));
  const u2 = uf(); clashes.forEach((c, i) => { const a = keyOf(meshOf(c, 0)), b = keyOf(meshOf(c, 1)); if (cls[i] === 'structure' && metal.has(a) && metal.has(b)) u2.join(a, b); });
  const main = ranked[0] ? u2.find(ranked[0][0]!) : null, inStructure = (k: string) => main !== null && metal.has(k) && u2.find(k) === main;
  out.structure = { n: [...metal].filter(inStructure).length, kg: +kgOf([...metal].filter(inStructure)).toFixed(1) };
  // (each load into the frame: each part that gives or moves (a mount, a bush, a spring, rubber, a moving joint's part) that
  // meets the frame's own metal, and meets none of it that is in the structure: what it bears on is held some other way)
  const giving = (m: TriMesh) => (!!m.joint && m.joint !== 'cover') || ELASTOMER.test(m.mat ?? '');
  const partners = new Map<string, { m: TriMesh; by: string }[]>();
  clashes.forEach((c, i) => { if (cls[i] !== 'isolator' && cls[i] !== 'kinematic' && cls[i] !== 'structure') return; const a = meshOf(c, 0), b = meshOf(c, 1);
    for (const [x, y] of [[a, b], [b, a]] as const) if (giving(x)) (partners.get(keyOf(x)) ?? partners.set(keyOf(x), []).get(keyOf(x))!).push({ m: y, by: cls[i]! }); });
  // (an assembly hung on the structure by what gives (the engine on its mounts, the exhaust on its hangers) is mounted: a
  // load into it is the assembly's, not the body's)
  const mounted = new Set<string>(); for (const ps of partners.values()) { const roots = new Set(ps.filter((p2) => metal.has(keyOf(p2.m))).map((p2) => u2.find(keyOf(p2.m)))); if (main && roots.has(main)) for (const r of roots) if (r !== main) mounted.add(r); }
  for (const [k, ps] of partners) { const g = byKey.get(k)!, body = ps.filter((p2) => linkOf(p2.m) === FRAME && METALS.test(p2.m.mat ?? '') && !giving(p2.m)); if (!body.length || body.some((p2) => inStructure(keyOf(p2.m)) || mounted.has(u2.find(keyOf(p2.m))))) continue;
    for (const nm2 of new Set(body.map((p2) => p2.m.name))) out.loads.push({ at: nm2, from: g.name, by: g.joint ?? 'rubber', reaches: 'not the frame\'s structure: what it bears on is not welded or bolted into the body, so the load goes on only through what gives, moves or is the powertrain, or nowhere' }); }
  // (each moving link's joints, as the meetings say them)
  const lj = new Map<string, Map<string, Set<string>>>();
  clashes.forEach((c, i) => { if (cls[i] !== 'kinematic' && cls[i] !== 'isolator') return; const a = meshOf(c, 0), b = meshOf(c, 1), la = linkOf(a), lb = linkOf(b); if (la === lb) return; const j = a.joint && b.joint ? (KINEMATIC.has(a.joint) ? a.joint : b.joint) : a.joint ?? b.joint ?? 'rubber';
    for (const [x, y] of [[la, lb], [lb, la]]) { const m2 = lj.get(x!) ?? lj.set(x!, new Map()).get(x!)!; (m2.get(y!) ?? m2.set(y!, new Set()).get(y!)!).add(j); } });
  for (const [l, to] of lj) { if (l === FRAME) continue; const joints = [...to.entries()].map(([o, ks]) => `${o}: ${[...ks].join(', ')}`), kinds = [...to.values()].flatMap((ks) => [...ks]);
    let fault: string | undefined;
    if (kinds.length >= 2 && kinds.every((k) => k === 'slide')) fault = 'UNDER-CONSTRAINED: it slides at every joint, so nothing holds it along its slides';
    // (a spring beside a slide is a coil-over, as it should be; a mount or a bush beside a moving joint to the same thing holds it two ways)
    for (const [o, ks] of to) if ([...ks].some((k) => k === 'mount' || k === 'bush') && [...ks].some((k) => KINEMATIC.has(k) && k !== 'bearing')) fault = `OVER-CONSTRAINED: held to ${o} both by a mount (${[...ks].filter((k) => k === 'mount' || k === 'bush').join(', ')}) and by a moving joint (${[...ks].filter((k) => KINEMATIC.has(k)).join(', ')})`;
    out.links.push({ link: l, joints, ...(fault ? { fault } : {}) }); }
  // (joints said by parts that cannot be them)
  for (const m of byKey.values()) { if (!m.joint) continue;
    if (m.joint !== 'cover' && /\b(boot|bellows|gaiter|dust cover)\b/.test(m.name)) out.kinds.push({ part: m.name, joint: m.joint, why: 'a boot or a bellows covers a joint; it is never one' });
    else if (m.joint === 'cv' && !/\b(joint|race|spider|bell|housing|tripod|cup)\b/.test(m.name)) out.kinds.push({ part: m.name, joint: m.joint, why: 'a constant-velocity joint is a bell, a race or a spider, not this' });
    else if (m.joint === 'ball' && !/\b(ball|joint)\b/.test(m.name)) out.kinds.push({ part: m.name, joint: m.joint, why: 'a ball joint is said by the part itself: no ball in a socket is drawn at its end' }); }
  // (what is held to the root only through openings said and not drawn: held again without them, and what falls away)
  const hold = (c: Clash, i: number) => cls[i] !== 'none' && cls[i] !== 'cover', u3 = uf(), u4 = uf();
  clashes.forEach((c, i) => { if (!hold(c, i)) return; const a = keyOf(meshOf(c, 0)), b = keyOf(meshOf(c, 1)); u3.join(a, b); if (!(c.kind === 'fitted' && c.opening === false)) u4.join(a, b); });
  if (ranked[0]) { const r3 = u3.find(ranked[0][0]!), r4 = u4.find(ranked[0][0]!), lost = [...byKey.keys()].filter((k) => u3.find(k) === r3 && u4.find(k) !== r4), grp = new Map<string, string[]>(); for (const k of lost) { const g = u4.find(k); (grp.get(g) ?? grp.set(g, []).get(g)!).push(k); }
    out.saidHeld = [...grp.values()].map((ks) => ({ parts: names(ks).slice(0, 8), kg: +kgOf(ks).toFixed(2) })).sort((p, q) => q.kg - p.kg); }
  return out;
}

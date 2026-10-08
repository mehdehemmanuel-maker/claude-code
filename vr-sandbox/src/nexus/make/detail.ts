// Attention to detail: what a real thing has that a sketch of it does not, added to anything made by rules about how
// things are made, never about one thing. Every rule reads the thing's parts by their materials, their sizes, how they
// touch, what kind of part they are and where the thing stands; none names a car or a bed. A rule's numbers are
// sourced where a source is named, else typical.
//
//   joints     every place two engineered parts touch is a joint, made as that pair of materials is joined: steel to
//              steel welded (a fillet bead whose leg is the thinner part, up to 12 mm); unlike metals bolted, with a
//              washer under each head (ISO 4017 heads: across flats about 1.6 d; ISO 7089 washers: 2.1 d across); two round
//              parts on one axis bolted on a circle (so a rim on its hub gets its wheel nuts); wood screwed; plastic
//              screwed into bosses; glass set in a rubber seal; an inflated tyre on its rim given a valve;
//   finishes   every surface as its material looks at its true scale: wood's grain along its length, brick in courses
//              (215 by 65 mm with 10 mm joints, BS EN 771), tread on a tyre, a weave on cloth, a cast skin on iron;
//   supports   a free-standing thing indoors stands on feet (pads 30 mm across); a tall post outdoors on a base plate
//              with four anchor bolts;
//   access     a space people sit in has a door for each row of seats on each side (its seam a 4 mm gap, typical of
//              car doors; its handle at hand height); glass taller than a hand has a roof over it and pillars at its
//              corners and between its doors;
//   lights     a lamp is a lens over a reflector and the light itself;
//   the road   a thing with wheels and seats that goes on roads carries number plates (520 by 110 mm, the EU size) and
//              a mirror each side (UNECE R46 asks for them);
//   machines   an engine or a motor carries its rating plate;
//   wear       as old as the conditions say: rust where steel is bare outside, paint faded, worn where it is touched.

import * as THREE from 'three';
import { massOf, type Part } from '../kits';
import type { Conditions } from './conditions';
import { edgeRadius } from '../finish';
import { contacts, dirToLocal, grownOf, layout, least, patchIn, toLocal, type Contact, type Node } from './space';

export type MatClass = 'metal' | 'wood' | 'polymer' | 'rubber' | 'glass' | 'masonry' | 'soft' | 'organic';
export const classOf = (m?: string): MatClass | null => !m ? null : /steel|stainless|al-|copper|cast-iron|titanium|gold|silver/.test(m) ? 'metal' : /wood|oak|bamboo|cardboard/.test(m) ? 'wood' : /abs|pp|pc|pmma|nylon|carbon/.test(m) ? 'polymer' : m === 'rubber' ? 'rubber' : m === 'glass' || m === 'ice' ? 'glass' : /brick|concrete|granite|tile|render|marble|asphalt/.test(m) ? 'masonry' : /cotton|silk|leather|foam/.test(m) ? 'soft' : 'organic';
const engineered = (n: Node) => { const c = classOf(n.p.mat); return !!c && c !== 'organic' && !n.p.detail; };

export interface Ctx { root: Part; nodes: Node[]; touch: Contact[]; cond: Conditions; centre: THREE.Vector3; size: number; mass: number; doors: number[]; joined: Set<string>; /** in a living thing: what grew is not joined */ living: (n: Node) => boolean }
export interface DetailRule { id: string; family: 'joints' | 'edges' | 'finishes' | 'supports' | 'access' | 'lights' | 'the road' | 'machines' | 'wear'; says: string; source: string; on: boolean; run(c: Ctx): number }

// ---- adding a detail to a part, in its own frame ----
const UP = new THREE.Vector3(0, 1, 0), AX = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
/** A detail added to a part at a world point, its axis (a cylinder's, a box's height) along a world direction. */
function attach(to: Node, rule: string, d: Omit<Part, 'at' | 'rot'>, world: THREE.Vector3, axis: THREE.Vector3 = UP, spin = 0): Part {
  const at = toLocal(to, world), dir = dirToLocal(to, axis).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir); if (spin) q.multiply(new THREE.Quaternion().setFromAxisAngle(UP, spin));
  const e = new THREE.Euler().setFromQuaternion(q), p: Part = { ...d, at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z], detail: rule };
  (to.p.parts ??= []).push(p); return p;
}
/** A detail added to a part at a point of its own frame, its axis along one of its own axes (k: 0 x, 1 y, 2 z) one way. */
function put(to: Node, rule: string, d: Omit<Part, 'at' | 'rot'>, at: THREE.Vector3, k: number, sign: number): Part {
  const dir = new THREE.Vector3(); dir.setComponent(k, sign); const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir));
  const p: Part = { ...d, at: [at.x, at.y, at.z], rot: [e.x, e.y, e.z], detail: rule }; (to.p.parts ??= []).push(p); return p;
}
/** The smallest detail worth drawing on a part: one two-thousandth of the thing it belongs to (a scene's car, not the scene). */
const seen = (n: Node) => { let x = n; while (x.parent && x.parent.parent) x = x.parent; const b = x.sub ?? x.box; return b ? b.getSize(new THREE.Vector3()).length() / 2000 : 0; };
const ISO = [3, 4, 5, 6, 8, 10, 12, 16, 20, 24];
/** A bolt's size for the thinner of two parts joined: about twice its thickness, an ISO size from M3 to M24 (typical). */
export const boltFor = (t: number) => ISO.find((d) => d >= Math.min(24, Math.max(3, t * 2000))) ?? 24;
/** A hex head and its washer (ISO 4017 heads about 1.6 d across flats and 0.65 d high; ISO 7089 washers 2.1 d across,
 *  0.18 d thick), on a part's face in its own frame, pointing out along its axis k one way. Stainless by the sea. */
function boltAt(to: Node, rule: string, at: THREE.Vector3, k: number, sk: number, dmm: number, mat = 'steel-low'): void {
  const d = dmm / 1000, s = 1.6 * d, kk = 0.65 * d, wd = 2.1 * d, wt = 0.18 * d, step = (x: number) => { const p = at.clone(); p.setComponent(k, at.getComponent(k) + sk * x); return p; };
  const washer = put(to, rule, { name: `M${dmm} washer (ISO 7089)`, shape: { cyl: [wd / 2, wt] }, mat, color: 0xb8bcc0 }, step(wt / 2), k, sk);
  washer.parts = [{ name: `M${dmm} hex head (ISO 4017)`, shape: { cyl: [s / Math.sqrt(3), kk] }, facets: 6, mat, color: 0x9a9ea4, at: [0, wt / 2 + kk / 2, 0], detail: rule }];
}
/** A pan-head screw (about 1.9 d across, 0.35 d high, typical) on a part's face in its own frame. */
function screwAt(to: Node, at: THREE.Vector3, k: number, sk: number, dmm: number): void { const d = dmm / 1000, p = at.clone(); p.setComponent(k, at.getComponent(k) + sk * 0.175 * d); put(to, 'joints', { name: `${dmm} mm screw`, shape: { cyl: [0.95 * d, 0.35 * d] }, mat: 'steel-low', color: 0x8a8e94 }, p, k, sk); }

// ---- the rules ----
/** How a pair of materials is joined (typical practice). */
export function jointFor(a: Node, b: Node): 'weld' | 'bolts' | 'screws' | 'seal' | 'valve' | 'none' {
  const ca = classOf(a.p.mat), cb = classOf(b.p.mat), has = (c: MatClass) => ca === c || cb === c;
  if (has('glass')) return 'seal';
  if (has('rubber')) return (a.p.mat === 'rubber' && 'torus' in (a.p.shape ?? {})) || (b.p.mat === 'rubber' && 'torus' in (b.p.shape ?? {})) ? 'valve' : 'none';
  if (has('soft') || has('organic')) return 'none';
  if (ca === 'masonry' && cb === 'masonry') return 'none';
  if (ca === 'metal' && cb === 'metal') return a.p.mat === b.p.mat && a.p.mat !== 'cast-iron' && !a.p.make && !b.p.make ? 'weld' : 'bolts';
  if (has('masonry')) return has('metal') ? 'bolts' : 'none'; // metal is anchored into it; wood and plastic are tied in hidden
  if (has('wood') || has('polymer')) return 'screws';
  return 'none';
}
const isRound = (n: Node) => !!n.p.shape && ('cyl' in n.p.shape || 'torus' in n.p.shape);
/** The axis a round part turns about, in the world. */
const roundAxis = (n: Node) => new THREE.Vector3(0, 'torus' in n.p.shape! ? 0 : 1, 'torus' in n.p.shape! ? 1 : 0).transformDirection(n.m);
const radiusOf = (n: Node) => { const s = n.p.shape!; return 'cyl' in s ? Math.max(s.cyl[0], s.cyl[2] ?? 0) : 'torus' in s ? s.torus[0] + s.torus[1] : 0; };

export const RULES: DetailRule[] = [
  {
    // the edges rule is src/nexus/finish.ts's, the one place edges are decided; it is drawn where each part is drawn
    // (src/nexus/view/kit3d.ts), and listed here so every detail of a made thing is in one list
    id: 'edges', family: 'edges', on: true, source: 'src/nexus/finish.ts (each rule names its own)', says: 'no edge truly sharp: each rounded as its material is made, never more than a third of its thinnest side',
    run(c) { let n = 0; for (const x of c.nodes) if (x.local && !x.p.detail && edgeRadius(x.p.mat, least(x.local), x.p.make) > 2e-4) n++; return n; },
  },
  {
    id: 'joints', family: 'joints', on: true, source: 'ISO 4017 / ISO 7089 / typical joining practice', says: 'every joint made as its materials are joined: welded, bolted (on a circle where round parts meet on one axis), screwed, sealed, or given a valve',
    run(c) {
      let n = 0;
      for (const t of c.touch) {
        const key = `${t.a.path}|${t.b.path}`; if (c.joined.has(key)) continue; c.joined.add(key);
        if ((c.living(t.a) || c.living(t.b)) && (classOf(t.a.p.mat) === 'wood' || classOf(t.b.p.mat) === 'wood')) continue; // grown, not joined
        const how = jointFor(t.a, t.b); if (how === 'none') continue;
        // fastened from the side you can reach: the part whose face looks furthest out from the thing along the joint's axis
        const out = t.normal.clone().multiplyScalar(Math.sign(t.mid.clone().sub(c.centre).dot(t.normal)) || 1), reach = (x: Node) => { const o = x.obb!; return o.c.dot(out) + o.h[0] * Math.abs(o.u[0].dot(out)) + o.h[1] * Math.abs(o.u[1].dot(out)) + o.h[2] * Math.abs(o.u[2].dot(out)); };
        const host = how === 'seal' ? (classOf(t.a.p.mat) === 'glass' ? t.a : t.b) : how === 'valve' ? (classOf(t.a.p.mat) === 'metal' ? t.a : t.b) : reach(t.a) >= reach(t.b) ? t.a : t.b, other = host === t.a ? t.b : t.a;
        const patch = patchIn(host, other); if (!patch || !host.local) continue;
        const ln = dirToLocal(host, out), k = [0, 1, 2].reduce((b, i) => (Math.abs(ln.getComponent(i)) > Math.abs(ln.getComponent(b)) ? i : b), 0), sk = Math.sign(ln.getComponent(k)) || 1;
        const face = sk > 0 ? host.local.max.getComponent(k) : host.local.min.getComponent(k), u = (k + 1) % 3, v = (k + 2) % 3, ps = patch.getSize(new THREE.Vector3()), pc = patch.getCenter(new THREE.Vector3());
        const thin = Math.max(0.0005, Math.min(host.p.shell ?? least(host.local), other.p.shell ?? (other.local ? least(other.local) : 1)));
        if (how === 'valve') { // a valve through the rim near its edge, pointing out of its outer face (a TR413 valve: about 33 mm): one to a tyre
          // (through the rim, the round part it sits on: not a spoke, and not a second one through the brake disc)
          const tyre = host === t.a ? t.b : t.a; if (!host.p.shape || !('cyl' in host.p.shape || 'torus' in host.p.shape) || c.joined.has(`valve ${tyre.path}`)) continue; c.joined.add(`valve ${tyre.path}`);
          const ax = 'cyl' in host.p.shape ? 1 : 2, R = radiusOf(host), side = Math.sign(dirToLocal(host, out).getComponent(ax)) || 1;
          const at = new THREE.Vector3(); at.setComponent(ax === 1 ? 0 : 0, R * 0.8); at.setComponent(ax, side * (ax === 1 ? host.local.max.y : host.local.max.z) + side * 0.012);
          put(host, 'joints', { name: 'tyre valve', shape: { cyl: [0.0055, 0.033] }, mat: 'rubber', color: 0x161616 }, at, ax, side); n++; continue;
        }
        if (how === 'seal') { // a rubber seal 8 mm wide round the glass where it sits (typical glazing gasket)
          const w = 0.008; if (ps.getComponent(u) < 0.05 || ps.getComponent(v) < 0.05) continue;
          for (const [along, across] of [[u, v], [v, u]] as const) for (const e of [-1, 1]) {
            const at = pc.clone(); at.setComponent(k, face); at.setComponent(across, pc.getComponent(across) + e * (ps.getComponent(across) / 2 - w / 2));
            const dims: [number, number, number] = [w, w, w]; dims[along] = ps.getComponent(along); dims[k] = w * 0.75;
            const p = put(host, 'joints', { name: 'glazing seal', shape: { box: dims }, mat: 'rubber', color: 0x101010 }, at, 1, 1); p.rot = [0, 0, 0]; n++;
          }
          continue;
        }
        if (how === 'weld') { // a fillet bead along the joint's longer edge on the reachable side: its leg the thinner part, 2–12 mm
          const leg = Math.min(0.012, Math.max(0.002, thin)), along = ps.getComponent(u) >= ps.getComponent(v) ? u : v, across = along === u ? v : u, len = ps.getComponent(along);
          if (len < 0.01 || leg < seen(host)) continue; const at = pc.clone(); at.setComponent(k, face + sk * leg * 0.3); at.setComponent(across, patch.max.getComponent(across));
          put(host, 'joints', { name: 'weld bead', shape: { cyl: [leg * 0.45, len] }, mat: host.p.mat, color: 0x6a6e72, finish: 'weld' }, at, along, 1); n++; continue;
        }
        // bolts or screws
        const dmm = how === 'screws' ? Math.min(8, boltFor(thin)) : boltFor(thin), d = dmm / 1000; if (1.6 * d < seen(host)) continue;
        if (isRound(t.a) && isRound(t.b) && Math.abs(roundAxis(t.a).dot(roundAxis(t.b))) > 0.95 && Math.abs(roundAxis(t.a).dot(out)) > 0.9) {
          // two round parts on one axis: on a pitch circle, 4 under 0.2 m across the smaller, 5 to 0.6 m, else 8 (typical of hubs)
          const small = radiusOf(t.a) < radiusOf(t.b) ? t.a : t.b, r = radiusOf(small), count = r < 0.1 ? 4 : r < 0.3 ? 5 : 8, pcd = Math.max(r * 0.32, 2.5 * d), ctr = toLocal(host, small.obb!.c); ctr.setComponent(k, face);
          for (let i = 0; i < count; i++) { const a = (i / count) * Math.PI * 2, at = ctr.clone(); at.setComponent(u, ctr.getComponent(u) + Math.cos(a) * pcd); at.setComponent(v, ctr.getComponent(v) + Math.sin(a) * pcd); boltAt(host, 'joints', at, k, sk, Math.max(dmm, 12)); n++; }
          continue;
        }
        // flat: a row along a long joint, else one near each corner; 2.5 d in from its edges, no closer than 3 d apart
        const Lu = ps.getComponent(u), Lv = ps.getComponent(v), inset = 2.5 * d; if (Math.min(Lu, Lv) < 3 * d) continue;
        const pts: [number, number][] = [];
        if (Math.max(Lu, Lv) > 3 * Math.min(Lu, Lv)) { const L = Math.max(Lu, Lv), q = Math.max(2, Math.min(12, Math.floor((L - 2 * inset) / Math.max(3 * d, 0.15)) + 1)); for (let i = 0; i < q; i++) { const f = -L / 2 + inset + ((L - 2 * inset) * i) / (q - 1); pts.push(Lu >= Lv ? [f, 0] : [0, f]); } }
        else for (const a of [-1, 1]) for (const b of [-1, 1]) pts.push([a * (Lu / 2 - inset), b * (Lv / 2 - inset)]);
        for (const [fu, fv] of pts) { const at = pc.clone(); at.setComponent(k, face); at.setComponent(u, pc.getComponent(u) + fu); at.setComponent(v, pc.getComponent(v) + fv); if (how === 'screws') screwAt(host, at, k, sk, dmm); else boltAt(host, 'joints', at, k, sk, dmm); n++; }
      }
      return n;
    },
  },
  {
    id: 'finishes', family: 'finishes', on: true, source: 'BS EN 771 brick sizes; typical surfaces', says: 'every surface as its material looks at its true size: grain, brick courses, tread, weave, a cast skin, brushed or painted metal',
    run(c) {
      let n = 0;
      for (const x of c.nodes) {
        const p = x.p, m = p.mat; if (!m || p.detail || p.finish) continue;
        const f = m === 'wood' || m === 'oak' || m === 'bamboo' ? 'grain' : m === 'brick' ? 'brick' : m === 'concrete' || m === 'render' ? 'concrete' : m === 'tile' ? 'tiles' : m === 'asphalt' ? 'asphalt' : m === 'rubber' ? ('torus' in (p.shape ?? {}) ? 'tread' : 'rubber') : m === 'cotton' || m === 'silk' || m === 'foam' ? 'weave' : m === 'leather' ? 'leather' : m === 'cast-iron' ? 'cast' : /^al-/.test(m) && !p.make ? 'brushed' : classOf(m) === 'metal' ? 'paint' : m === 'granite' || m === 'marble' ? 'stone' : classOf(m) === 'polymer' && m !== 'pc' && m !== 'pmma' ? 'texture' : null;
        if (f) { p.finish = f; n++; }
      }
      return n;
    },
  },
  {
    id: 'feet', family: 'supports', on: true, source: 'typical', says: 'a free-standing thing indoors stands on four pads (30 mm across, 8 mm deep), not on its bare base',
    run(c) {
      if (c.mass > 400 || c.cond.env === 'outdoor' || c.cond.env === 'marine' || hasWheels(c)) return 0;
      const ground = c.nodes.filter((x) => x.box && engineered(x) && x.box.min.y < 0.02 && classOf(x.p.mat) !== 'soft');
      if (!ground.length || ground.some((x) => x.p.detail === 'feet')) return 0;
      const fp = new THREE.Box3(); for (const x of ground) fp.union(x.box!); const s = fp.getSize(new THREE.Vector3()); if (s.x < 0.15 || s.z < 0.15) return 0;
      const base = ground.reduce((a, x) => (x.box!.getSize(new THREE.Vector3()).x * x.box!.getSize(new THREE.Vector3()).z > a.box!.getSize(new THREE.Vector3()).x * a.box!.getSize(new THREE.Vector3()).z ? x : a));
      for (const a of [-1, 1]) for (const b of [-1, 1]) attach(base, 'feet', { name: 'foot pad', shape: { cyl: [0.015, 0.008] }, mat: 'rubber', color: 0x1a1a1a }, new THREE.Vector3(fp.min.x + s.x / 2 + a * (s.x / 2 - 0.04), fp.min.y - 0.004, fp.min.z + s.z / 2 + b * (s.z / 2 - 0.04)));
      c.root.at = [c.root.at?.[0] ?? 0, (c.root.at?.[1] ?? 0) + 0.008, c.root.at?.[2] ?? 0];
      return 4;
    },
  },
  {
    id: 'base plates', family: 'supports', on: true, source: 'typical of lighting columns', says: 'a tall post standing on the ground stands on a base plate (2.5 times its width) held by four anchor bolts',
    run(c) {
      let n = 0;
      for (const x of c.nodes) {
        if (!x.box || !engineered(x) || x.box.min.y > 0.05 || classOf(x.p.mat) !== 'metal') continue;
        const s = x.box.getSize(new THREE.Vector3()), w = Math.max(s.x, s.z); if (s.y < 1.5 || s.y < 6 * w) continue;
        const plate = Math.max(0.2, 2.5 * w), t = 0.02, ctr = new THREE.Vector3((x.box.min.x + x.box.max.x) / 2, t / 2, (x.box.min.z + x.box.max.z) / 2);
        const bp = attach(x, 'base plates', { name: 'base plate', shape: { box: [plate, t, plate] }, mat: x.p.mat, color: x.p.color, finish: 'paint' }, ctr);
        const holder: Node = { p: bp, parent: x, kids: [], m: new THREE.Matrix4(), box: null, obb: null, local: null, sub: null, depth: x.depth + 1, path: `${x.path}/bp` };
        for (const a of [-1, 1]) for (const b of [-1, 1]) boltAt(holder, 'base plates', new THREE.Vector3(a * plate * 0.38, t / 2, b * plate * 0.38), 1, 1, 20);
        n += 5;
      }
      return n;
    },
  },
  {
    id: 'doors', family: 'access', on: true, source: 'car door gaps 3–5 mm (typical); handles at hand height', says: 'a space people sit in has a door for each row of seats on each side, its seam a 4 mm gap and its handle where a hand reaches',
    run(c) {
      const seats = c.nodes.filter((x) => /\bseat\b/i.test(x.p.name) && !x.p.detail); if (!seats.length) return 0;
      const pos = (x: Node) => new THREE.Vector3().setFromMatrixPosition(x.m);
      const shell = c.nodes.filter((x) => x.box && x.p.shell && classOf(x.p.mat) === 'metal' && seats.every((s) => x.box!.containsPoint(pos(s)) || (pos(s).y >= x.box!.min.y - 0.05 && Math.abs(pos(s).x) <= x.box!.max.x && Math.abs(pos(s).z) <= x.box!.max.z)))[0];
      if (!shell) return 0;
      const B = shell.box!, rows = [...new Set(seats.map((s) => Math.round(pos(s).x * 4) / 4))].sort((a, b) => b - a), len = Math.min(1.15, (B.max.x - B.min.x) / (rows.length + 1.2));
      let n = 0; c.doors = [];
      for (const x of rows) for (const side of [-1, 1]) {
        const z = side > 0 ? B.max.z + 0.001 : B.min.z - 0.001, y0 = B.min.y + 0.08, y1 = B.max.y - 0.02, x0 = x - len / 2, x1 = x + len / 2, gap = 0.004, seam = { color: 0x15161a, kg: 0 }; // a gap: no mass
        for (const [a, b, horiz] of [[x0, x1, true], [x0, x1, false]] as const) {
          if (horiz) for (const y of [y0, y1]) attach(shell, 'doors', { name: 'door seam', shape: { box: [b - a, gap, gap] }, ...seam }, new THREE.Vector3((a + b) / 2, y, z), UP);
          else for (const xx of [a, b]) attach(shell, 'doors', { name: 'door seam', shape: { box: [gap, y1 - y0, gap] }, ...seam }, new THREE.Vector3(xx, (y0 + y1) / 2, z), UP);
        }
        attach(shell, 'doors', { name: 'door handle', shape: { box: [0.16, 0.022, 0.03] }, mat: 'pc', color: 0x2a2c30, make: 'pressed' }, new THREE.Vector3(x1 - 0.18, y0 + (y1 - y0) * 0.72, z + side * 0.012), UP);
        n += 5; c.doors.push(x0, x1);
      }
      return n;
    },
  },
  {
    id: 'framing', family: 'access', on: true, source: 'typical', says: 'glass taller than a hand has a roof over it and pillars at its corners and between doors',
    run(c) {
      let n = 0;
      for (const g of c.nodes) {
        if (!g.box || g.p.mat !== 'glass' || g.p.detail) continue; const s = g.box.getSize(new THREE.Vector3()); if (s.y < 0.3 || s.x * s.z < 0.4) continue;
        const under = c.nodes.find((x) => x.box && x !== g && x.p.shell && classOf(x.p.mat) === 'metal' && Math.abs(x.box.max.y - g.box!.min.y) < 0.05); if (!under) continue;
        const col = under.p.color ?? 0x888888, t = 0.035;
        attach(g, 'framing', { name: 'roof panel', shape: { box: [s.x + 0.02, t, s.z + 0.02] }, mat: under.p.mat, color: col, make: 'pressed', shell: under.p.shell, finish: 'paint' }, new THREE.Vector3((g.box.min.x + g.box.max.x) / 2, g.box.max.y + t / 2 - 0.005, (g.box.min.z + g.box.max.z) / 2)); n++;
        const xs = [g.box.min.x + 0.03, g.box.max.x - 0.03, ...c.doors.filter((x) => x > g.box!.min.x + 0.1 && x < g.box!.max.x - 0.1)];
        for (const x of [...new Set(xs.map((v) => Math.round(v * 20) / 20))]) for (const z of [g.box.min.z + 0.02, g.box.max.z - 0.02]) { attach(g, 'framing', { name: 'pillar', shape: { box: [0.07, s.y, 0.05] }, mat: under.p.mat, color: col, make: 'pressed', shell: under.p.shell ?? 0.0012, finish: 'paint' }, new THREE.Vector3(x, (g.box.min.y + g.box.max.y) / 2, z)); n++; }
      }
      return n;
    },
  },
  {
    id: 'lamps', family: 'lights', on: true, source: 'typical', says: 'a lamp is a lens over a chrome reflector and the light itself, in a dark housing',
    run(c) {
      let n = 0;
      for (const x of c.nodes) {
        if (!x.box || x.p.detail || !(/\b(head ?light|tail ?light|lamp|light)\b/i.test(x.p.name) || x.p.light) || (x.p.mat !== 'pc' && x.p.mat !== 'pmma' && x.p.mat !== 'glass')) continue;
        const s = x.box.getSize(new THREE.Vector3()), out = new THREE.Vector3().setFromMatrixPosition(x.m).sub(c.centre), axis = s.x <= s.y && s.x <= s.z ? 0 : s.z <= s.y ? 2 : 1, dir = AX[axis]!.clone().multiplyScalar(Math.sign(out.getComponent(axis)) || 1), mid = x.box.getCenter(new THREE.Vector3());
        const dims: [number, number, number] = [s.x * 0.9, s.y * 0.9, s.z * 0.9]; dims[axis] = Math.max(0.005, s.getComponent(axis) * 0.3);
        attach(x, 'lamps', { name: 'reflector', shape: { box: dims }, mat: 'al-6061', color: 0xe8ecf0, finish: 'chrome' }, mid.clone().addScaledVector(dir, -s.getComponent(axis) * 0.3), UP);
        const red = /tail/i.test(x.p.name), r = Math.min(s.y, s.z, s.x === s.getComponent(axis) ? Math.min(s.y, s.z) : s.x) * 0.25;
        attach(x, 'lamps', { name: red ? 'brake light' : 'lamp', shape: { sphere: Math.max(0.005, r) }, mat: 'glass', color: red ? 0xff2a1a : 0xfff4dc, glow: true }, mid.clone().addScaledVector(dir, -s.getComponent(axis) * 0.05), UP);
        n += 2;
      }
      return n;
    },
  },
  {
    id: 'road kit', family: 'the road', on: true, source: 'EU number plate 520 × 110 mm; UNECE R46 mirrors', says: 'a thing with wheels and seats that goes on roads carries number plates front and back and a mirror each side',
    run(c) {
      if (!hasWheels(c) || !c.nodes.some((x) => /\bseat\b/i.test(x.p.name))) return 0;
      const body = c.nodes.filter((x) => x.box && x.p.shell && classOf(x.p.mat) === 'metal').sort((a, b) => b.box!.getSize(new THREE.Vector3()).length() - a.box!.getSize(new THREE.Vector3()).length())[0]; if (!body) return 0;
      const B = body.box!, yp = B.min.y + (B.max.y - B.min.y) * 0.45; let n = 0;
      for (const e of [-1, 1]) { attach(body, 'road kit', { name: 'number plate', shape: { box: [0.003, 0.11, 0.52] }, mat: 'al-6061', color: 0xf4f0d8, finish: 'plate' }, new THREE.Vector3(e > 0 ? B.max.x + 0.002 : B.min.x - 0.002, yp, 0), UP); n++; }
      const front = c.nodes.filter((x) => /\bseat\b/i.test(x.p.name)).map((x) => new THREE.Vector3().setFromMatrixPosition(x.m).x).reduce((a, b) => Math.max(a, b), -Infinity);
      for (const side of [-1, 1]) { attach(body, 'road kit', { name: 'wing mirror', shape: { box: [0.1, 0.11, 0.2] }, mat: 'abs', color: body.p.color, make: 'pressed', finish: 'paint' }, new THREE.Vector3(front + 0.35, B.max.y + 0.06, side * (B.max.z + 0.09)), UP); n++; }
      return n;
    },
  },
  {
    id: 'rating plates', family: 'machines', on: true, source: 'typical (IEC 60034-1 asks a motor to carry one)', says: 'an engine or a motor carries its rating plate',
    run(c) {
      let n = 0;
      for (const x of c.nodes) {
        if (!x.box || x.p.detail || !/\b(engine|motor|generator|compressor|pump)\b/i.test(x.p.name) || x.box.getSize(new THREE.Vector3()).y < 0.05) continue;
        const s = x.box.getSize(new THREE.Vector3()), side = s.x >= s.z ? 2 : 0, at = x.box.getCenter(new THREE.Vector3()); at.setComponent(side, x.box.max.getComponent(side) + 0.001);
        const dims: [number, number, number] = side === 2 ? [0.08, 0.05, 0.001] : [0.001, 0.05, 0.08];
        attach(x, 'rating plates', { name: 'rating plate', shape: { box: dims }, mat: 'al-6061', color: 0xd8dce0, finish: 'plate' }, at, UP); n++;
      }
      return n;
    },
  },
  {
    id: 'wear', family: 'wear', on: true, source: 'the conditions said', says: 'as old as asked: rust where bare steel stands outside, paint faded, worn where it is touched',
    run(c) {
      const outside = c.cond.env && c.cond.env !== 'indoor' && c.cond.env !== 'space' ? 0.25 : 0; let n = 0;
      for (const x of c.nodes) {
        const cl = classOf(x.p.mat); if (!cl || cl === 'organic' || (c.living(x) && cl === 'wood')) continue;
        const w = Math.min(1, c.cond.age + (cl === 'metal' ? outside : outside / 2)); if (w >= 0.3) { x.p.wear = +w.toFixed(2); n++; }
      }
      return n;
    },
  },
];
const hasWheels = (c: Ctx) => c.nodes.filter((x) => x.p.mat === 'rubber' && x.p.shape && 'torus' in x.p.shape).length >= 2;

/** The details added to a thing (it is changed in place: give it a copy). */
export function addDetails(root: Part, cond: Conditions, on: (r: DetailRule) => boolean = (r) => r.on): { counts: Record<string, number>; kg: Record<string, number>; total: number } {
  const counts: Record<string, number> = {}, kg: Record<string, number> = {}, base = { root, cond, doors: [] as number[], joined: new Set<string>() };
  for (const r of RULES) {
    if (!on(r)) continue;
    // laid out afresh for each rule: what one adds, the next can see
    const nodes = layout(root), all = new THREE.Box3(), grown = grownOf(nodes); for (const x of nodes) if (x.box) all.union(x.box);
    const m0 = massOf(root), ctx: Ctx = { ...base, living: grown, nodes, touch: r.id === 'joints' ? contacts(nodes, engineered) : [], centre: all.isEmpty() ? new THREE.Vector3() : all.getCenter(new THREE.Vector3()), size: all.isEmpty() ? 1 : all.getSize(new THREE.Vector3()).length(), mass: massOf(root) };
    counts[r.id] = r.run(ctx); base.doors = ctx.doors; kg[r.id] = massOf(root) - m0;
  }
  return { counts, kg, total: Object.values(counts).reduce((a, b) => a + b, 0) };
}
/** A thing without the details a pipeline added (to add them again after it is changed). */
/** (what the critic cut, an opening for a wheel, is a change to the thing itself, and stays) */
export function stripDetails(p: Part): Part { return { ...p, parts: p.parts?.filter((q) => !q.detail || q.detail === 'room to move').map(stripDetails), finish: undefined, wear: undefined }; }

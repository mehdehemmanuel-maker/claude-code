// Who notices what (docs/LIFE.md, section 6: node sense). Every thing gives off what its signature says (tags.ts: seen,
// heard, warm) and what it releases into the air (gas.ts); every observer (a person, a detector) takes in what reaches
// its senses where it stands, facing where it faces: sight within its field and its line of sight, sharper where it looks;
// sound over the background; warmth on the skin; a gas at its nose or its sensor, against what that gas does. What it
// notices is ranked by how far over its threshold it is, harm first, and the strongest are attended.
//
// The trick that makes it scale: every source is put in a grid whose cells are as big as the source reaches, one grid for
// each doubling of reach; an observer looks only in the cells round it at each level, so only pairs that could reach each
// other are ever tried, and a ray for line of sight is cast only for what passes every cheaper test first.

import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import type { Part, V3 } from '../kits';
import { layout, type Node } from '../make/space';
import { surfacesWithOwners } from '../placement/fields';
import { ACTORS, BACKGROUND_DB, tagsOf, type Actor, type Tag } from './tags';
import { SUBSTANCES, STILL, concentration, releasesOf, shutIn, type Air, type Release, type State } from './gas';

export type Sense = 'sight' | 'hearing' | 'warmth' | 'smell' | 'gas';
export interface Observer { name: string; /** its eyes, or its sensor */ at: V3; facing: V3; kind: 'person' | 'co alarm'; actor?: Actor }
/** A smoke-and-CO alarm sounds at 70 ppm of carbon monoxide (UL 2034's first point: 70 ppm within 60 to 240 minutes). */
export const CO_ALARM = 70e-6;
/** The eye's field: about 100° to each side, 50° up and 70° down (typical of the human visual field); its acuity halving
 *  every 2.5° out from where it looks (MAR ∝ 1 + e / 2.5°, typical of measured eccentricity data). */
export const FIELD = { side: 100, up: 50, down: 70, e2: 2.5 };
export interface Notice { observer: string; thing: string; path: string; /** where it is */ to: V3; sense: Sense; /** how far over its threshold, dB */ margin: number; dist: number; harm: boolean; why: string }
export interface Perceived { notices: Notice[]; attended: Notice[] }
export interface Perception { by: Record<string, Perceived>; releases: Release[]; stats: { sources: number; observers: number; allPairs: number; tried: number; rays: number; ms: number }; says: string }

interface Source { tag?: Tag; release?: Release; c: THREE.Vector3; r: number; reach: number }

/** Every observer's senses over a thing, in a state (its engine running?) and an air (still, a wind, shut in a room). */
export function perceive(root: Part, observers: Observer[], o: { state?: State & { starting?: boolean }; air?: Air; shut?: { volume: number; changes?: number; minutes: number }; attend?: number; /** the eyes' ray budget each (default 3,000) */ rays?: number; /** rays meet the drawn surfaces, not the parts' covering boxes (slower) */ exact?: boolean } = {}): Perception {
  const t0 = performance.now(), nodes = layout(root), byPath = new Map(nodes.map((n) => [n.path, n])), state = o.state ?? {}, air = o.air ?? STILL;
  const tags = tagsOf(root, ACTORS.adult, nodes).tags, rel = releasesOf(root, state, nodes);
  // (what runs only when the machine runs: its engine's sound and its hot parts' warmth)
  const running = !!state.running || !!state.starting, sources: Source[] = [], sounds = (t: Tag) => t.heard > 0 && (t.heardWhen === 'starting' ? !!state.starting : running);
  for (const t of tags) {
    const n = byPath.get(t.path); if (!n?.sub) continue; const c = n.sub.getCenter(new THREE.Vector3()), r = n.sub.getSize(new THREE.Vector3()).length() / 2;
    // (only what is heard or felt goes in the grid: what is seen is found down the tree, below)
    const reach = Math.max(sounds(t) ? t.heard : 0, running ? t.warm + r : 0); if (reach > 0) sources.push({ tag: t, c, r, reach });
  }
  for (const x of rel) { const s = SUBSTANCES[x.substance]!, lv = Math.min(s.smell ?? 1, s.harm ?? 1, s.burns ?? 1, CO_ALARM); let reach = 0.05; while (concentration(x, [x.at[0] + reach, x.at[1], x.at[2]], air.wind ? STILL : air) >= lv && reach < 1e4) reach *= 1.5; sources.push({ release: x, c: new THREE.Vector3(...x.at), r: 0, reach: o.shut ? 1e6 : air.wind ? reach * 4 : reach }); }
  // (the levels: a grid for each doubling of reach from 0.25 m, each cell as big as the reach at its level)
  const levels = new Map<number, Map<string, Source[]>>(), lvOf = (r: number) => Math.max(0, Math.ceil(Math.log2(r / 0.25))), cellSize = (L: number) => 0.25 * 2 ** L;
  for (const s of sources) { const L = lvOf(s.reach), cs = cellSize(L), k = `${Math.floor(s.c.x / cs)},${Math.floor(s.c.y / cs)},${Math.floor(s.c.z / cs)}`; const g = levels.get(L) ?? levels.set(L, new Map()).get(L)!; (g.get(k) ?? g.set(k, []).get(k)!).push(s); }
  let rays = 0, tried = 0; const ray = new THREE.Ray();
  const tagAt = new Map(tags.map((t) => [t.path, t]));
  // (what the eyes' rays meet: each part's tight covering boxes (its stand-in, as the renderer stands boxes in for what is
  // far: a dozen triangles a box, against the millions of its drawn surfaces), or, asked for, its drawn surfaces)
  const people = observers.some((x) => x.kind === 'person'), sw = !people ? null : o.exact ? surfacesWithOwners(nodes.filter((x) => x.p.shape)) : boxesWithOwners(nodes), geo = sw ? { bvh: new MeshBVH(sw.geo), ownerOf: sw.ownerOf } : null;
  const by: Record<string, Perceived> = {};
  for (const ob of observers) {
    const eye = new THREE.Vector3(...ob.at), face = new THREE.Vector3(...ob.facing).normalize(), out: Notice[] = [], cand = new Set<Source>();
    for (const [L, g] of levels) { const cs = cellSize(L), [i, j, k] = [Math.floor(eye.x / cs), Math.floor(eye.y / cs), Math.floor(eye.z / cs)]; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) for (const s of g.get(`${i + a},${j + b},${k + c}`) ?? []) cand.add(s); }
    tried += cand.size;
    for (const s of cand) {
      const d = Math.max(0.05, eye.distanceTo(s.c)), name = s.tag?.part ?? s.release!.part, path = s.tag?.path ?? s.release!.path;
      if (s.release) {
        const x = s.release, sub = SUBSTANCES[x.substance]!, C = o.shut ? shutIn(x, o.shut.volume, o.shut.changes).steady * (1 - Math.exp(-(o.shut.changes ?? 0.5) / 60 * o.shut.minutes)) : concentration(x, ob.at, air, x.at[1] - 0.2), ppmS = C >= 1e-3 ? `${(C * 100).toFixed(2)} %` : `${(C * 1e6).toFixed(C < 1e-6 ? 4 : 1)} ppm`;
        if (ob.kind === 'co alarm') { if (x.substance === 'co' && C >= CO_ALARM) out.push({ observer: ob.name, thing: name, path, to: s.c.toArray() as V3, sense: 'gas', margin: 10 * Math.log10(C / CO_ALARM), dist: d, harm: true, why: `carbon monoxide ${ppmS}: over the 70 ppm it sounds at` }); continue; }
        const harm = !!sub.harm && C >= sub.harm;
        if (sub.smell && C >= sub.smell) out.push({ observer: ob.name, thing: name, path, to: s.c.toArray() as V3, sense: 'smell', margin: 10 * Math.log10(C / sub.smell), dist: d, harm, why: `smells ${sub.smellsOf}: ${sub.name} ${ppmS}, over the ${(sub.smell * 1e6).toPrecision(2)} ppm it is smelled at` });
        else if (harm) out.push({ observer: ob.name, thing: name, path, to: s.c.toArray() as V3, sense: 'gas', margin: 10 * Math.log10(C / sub.harm!), dist: d, harm: true, why: `${sub.name} ${ppmS}, over its working-day limit, and it has no smell: not noticed, but harmful` });
        continue;
      }
      if (ob.kind !== 'person') continue; const t = s.tag!;
      if (sounds(t)) { const Lp = 10 * Math.log10(1) + (20 * Math.log10(t.heard) + 11 + BACKGROUND_DB) - 20 * Math.log10(d) - 11; if (Lp > BACKGROUND_DB) out.push({ observer: ob.name, thing: t.part, path: t.path, to: s.c.toArray() as V3, sense: 'hearing', margin: Lp - BACKGROUND_DB, dist: d, harm: Lp > 85, why: `heard at ${Lp.toFixed(0)} dB(A), over the ${BACKGROUND_DB} dB(A) round it` }); }
      if (running && t.warm > 0 && d - s.r <= t.warm) out.push({ observer: ob.name, thing: t.part, path: t.path, to: s.c.toArray() as V3, sense: 'warmth', margin: 10 * Math.log10(t.warm / Math.max(0.01, d - s.r)), dist: d, harm: d - s.r < 0.05, why: `its warmth felt ${((d - s.r) * 1000).toFixed(0)} mm off` });
    }
    // (sight, by the eye's own budget: rays out from the eye, packed as its acuity is (as many at each angle out as its
    // sharpness there, 1 / (1 + e / 2.5°)), each meeting the first thing in its way; what a ray meets is seen if it is big
    // enough at that distance and angle. Occlusion is exact, small things to the side are missed as an eye misses them,
    // and the cost is the budget, not the number of things)
    if (ob.kind === 'person' && geo) {
      const hits = new Map<string, { d: number; ecc: number; c: THREE.Vector3; n: Node }>(), up0 = Math.abs(face.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0), right = new THREE.Vector3().crossVectors(face, up0).normalize(), upv = new THREE.Vector3().crossVectors(right, face).normalize();
      const N = o.rays ?? 3000, Emax = FIELD.side, A = Math.log(1 + Emax / FIELD.e2);
      for (let k = 0; k < N; k++) {
        // (eccentricity by the inverse of the density's integral: e = e2 (exp(u ln(1 + E/e2)) − 1); round it by the golden angle)
        const u = (k + 0.5) / N, e = FIELD.e2 * (Math.exp(u * A) - 1), az = k * 2.39996323, er = (e * Math.PI) / 180;
        const dir = face.clone().multiplyScalar(Math.cos(er)).addScaledVector(right, Math.sin(er) * Math.cos(az)).addScaledVector(upv, Math.sin(er) * Math.sin(az)).normalize();
        const el = (Math.asin(Math.max(-1, Math.min(1, dir.y))) * 180) / Math.PI; if (el > FIELD.up || el < -FIELD.down) continue;
        rays++; ray.origin.copy(eye); ray.direction.copy(dir); const hit = geo.bvh.raycastFirst(ray, THREE.DoubleSide); if (!hit?.face) continue;
        const n0 = geo.ownerOf(Math.floor(hit.face.a / 3)); if (!n0) continue; let u0: Node | null = n0; while (u0 && !tagAt.has(u0.path)) u0 = u0.parent; if (!u0) continue;
        const was = hits.get(u0.path); if (!was || e < was.ecc) hits.set(u0.path, { d: hit.distance, ecc: e, c: hit.point.clone(), n: u0 });
      }
      tried += N;
      for (const [path, h] of hits) { const t = tagAt.get(path)!, reach = t.seen / (1 + h.ecc / FIELD.e2); if (h.d > reach) continue;
        out.push({ observer: ob.name, thing: t.part, path, to: h.c.toArray() as V3, sense: 'sight', margin: 20 * Math.log10(reach / Math.max(0.05, h.d)), dist: h.d, harm: t.tags.includes('hot') && running && h.d < 0.5, why: `seen ${h.ecc.toFixed(0)}° from where it looks, ${h.d.toFixed(1)} m off, within the ${reach.toFixed(1)} m it is seen at there` }); }
    }
    // (attention: harm first, then how far over its threshold; one notice for each thing, by its strongest sense)
    const best = new Map<string, Notice>(); for (const n of out.sort((a, b) => Number(b.harm) - Number(a.harm) || b.margin - a.margin)) if (!best.has(n.path + n.sense)) best.set(n.path + n.sense, n);
    const ranked = [...best.values()], seen = new Set<string>(), attended: Notice[] = [];
    for (const n of ranked) { if (seen.has(n.path)) continue; seen.add(n.path); attended.push(n); if (attended.length >= (o.attend ?? 5)) break; }
    by[ob.name] = { notices: ranked, attended };
  }
  const ms = performance.now() - t0, allPairs = (tags.length + rel.length) * observers.length;
  return { by, releases: rel, stats: { sources: tags.length + rel.length, observers: observers.length, allPairs, tried, rays, ms }, says: `${observers.length} observer${observers.length === 1 ? '' : 's'}, ${tags.length + rel.length} sources: ${tried} of ${allPairs} pairs tried (${allPairs ? ((100 * tried) / allPairs).toFixed(1) : 0} %), ${rays} lines of sight cast, ${ms.toFixed(0)} ms` };
}

/** Every part's covering boxes as triangles, each run knowing its part (12 triangles a box). */
export function boxesWithOwners(ns: Node[]): { geo: THREE.BufferGeometry; ownerOf: (t: number) => Node | undefined } | null {
  const pos: number[] = [], owners: { upTo: number; node: Node }[] = []; let tris = 0;
  const F = [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]];
  for (const n of ns) { if (!n.p.shape || !n.pieces.length) continue;
    for (const b of n.pieces) { const v = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => b.c.clone().addScaledVector(b.u[0], (i & 4 ? 1 : -1) * b.h[0]).addScaledVector(b.u[1], (i & 2 ? 1 : -1) * b.h[1]).addScaledVector(b.u[2], (i & 1 ? 1 : -1) * b.h[2]));
      for (const [a, b2, c, d] of F) { for (const k of [a!, b2!, c!, a!, c!, d!]) pos.push(v[k]!.x, v[k]!.y, v[k]!.z); tris += 2; } }
    owners.push({ upTo: tris, node: n }); }
  if (!pos.length) return null;
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const ownerOf = (t: number) => { let lo = 0, hi = owners.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (t < owners[m]!.upTo) hi = m; else lo = m + 1; } return owners[lo]?.node; };
  return { geo, ownerOf };
}

/** Where an observer stands, found, not typed: by what is named, on the side of it away from the middle of everything,
 *  so far off, at the actor's eye height over the ground, facing it. */
export function standBy(root: Part, near: RegExp, o: { off?: number; actor?: Actor; name?: string; kind?: Observer['kind']; nodes?: Node[] } = {}): Observer {
  const ns = o.nodes ?? layout(root), n = ns.find((x) => near.test(x.p.name) && x.sub); if (!n) throw new Error(`nothing named like ${String(near)} to stand by`);
  const all = new THREE.Box3(); for (const x of ns) if (x.sub && x.depth <= 1) all.union(x.sub); const mid = all.getCenter(new THREE.Vector3()), c = n.sub!.getCenter(new THREE.Vector3());
  const away = c.clone().sub(mid).setY(0); if (away.lengthSq() < 1e-9) away.set(1, 0, 0); away.normalize();
  const h = n.sub!.getSize(new THREE.Vector3()), reachOut = Math.abs(away.x) * h.x / 2 + Math.abs(away.z) * h.z / 2 + (o.off ?? 1.2), actor = o.actor ?? ACTORS.adult!;
  const ground = Math.min(...ns.map((x) => x.sub?.min.y ?? Infinity).filter(Number.isFinite)), eyeY = o.kind === 'co alarm' ? c.y : ground + 0.936 * actor.height;
  const at = c.clone().addScaledVector(away, reachOut).setY(eyeY), facing = c.clone().sub(at).normalize();
  return { name: o.name ?? `${actor.name} by the ${n.p.name}`, at: at.toArray() as V3, facing: facing.toArray() as V3, kind: o.kind ?? 'person', actor };
}

/** What each observer notices, drawn: a figure where it stands, a line to each thing it attends to in its sense's colour
 *  (sight white, hearing violet, warmth orange, smell yellow, gas red), and round each release where it does harm, red. */
export const SENSE_COLOR: Record<Sense, number> = { sight: 0xf5f5f5, hearing: 0xb04aff, warmth: 0xff8c1a, smell: 0xf1c40f, gas: 0xff2a2a };
export function showPerception(p: Perception, observers: Observer[]): Part {
  const parts: Part[] = [];
  for (const ob of observers) {
    const eye = new THREE.Vector3(...ob.at), person = ob.kind === 'person', h = person ? 0.936 * (ob.actor ?? ACTORS.adult!).height : 0.12;
    parts.push({ name: ob.name, shape: { capsule: [person ? 0.17 : 0.06, Math.max(0.02, h - (person ? 0.34 : 0.12))] }, at: [eye.x, eye.y - h / 2 + (person ? 0.06 : 0), eye.z], color: person ? 0x4aa3ff : 0xffffff, mat: 'pu', finish: 'matte' });
    if (person) parts.push({ name: `${ob.name}: looking`, shape: { tube: { r: 0.012, pts: [ob.at, eye.clone().addScaledVector(new THREE.Vector3(...ob.facing).normalize(), 0.5).toArray() as V3] } }, color: 0x4aa3ff, mat: 'pu' });
    for (const n of p.by[ob.name]?.attended ?? []) parts.push({ name: `${ob.name} ${n.sense}: ${n.thing}`, shape: { tube: { r: n.harm ? 0.012 : 0.007, pts: [ob.at, n.to] } }, color: SENSE_COLOR[n.sense], mat: 'pu', finish: 'matte' });
  }
  // (where each release does harm, as a sphere out to its working-day limit, in still air)
  for (const r of p.releases) { const s = SUBSTANCES[r.substance]!; if (!s.harm) continue; let d = 0.05; while (concentration(r, [r.at[0] + d, r.at[1], r.at[2]]) >= s.harm && d < 50) d *= 1.1; if (d > 0.06) parts.push({ name: `${s.name}: over its limit`, shape: { sphere: d }, at: r.at, color: 0xff2a2a, mat: 'glass', finish: 'matte' }); }
  return { name: 'what is noticed', at: [0, 0, 0], parts, says: 'each observer a figure (a person blue, a detector white), a line to each thing it attends to in its sense\'s colour (sight white, hearing violet, warmth orange, smell yellow, gas red); where a gas does harm, a red sphere' };
}

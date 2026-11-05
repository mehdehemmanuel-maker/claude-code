// Parts made the way things are made, each maker one process or one geometry that many products share. A lead-acid
// battery's plate is a cast grid (as a fan guard, a drain cover and a radiator's core are) with paste pressed into it (as
// a pasted electrode, a plated part or an overmoulded handle is coated); its separator wraps the plate (as a bag, a
// sleeve, shrink wrap do); its plates stack, alternating, along the cell (as heat-sink fins, motor laminations and a
// capacitor's foils do); a strap is cast across their lugs (as a busbar joins cells, a comb joins pins); its cells go
// into a moulded case with partitions (as a toolbox's, an ice tray's, a junction box's); and the cells are joined in
// series from one to the next. A lithium cell's electrodes are wound into a roll (as a coil's wire, a capacitor's film
// and a roll of tape are). Each maker draws its result to the bottom, each piece tagged with what it is, so it comes
// apart, and so the audit (`explodeAudit` in components.ts) can hold it to its recipe.
//
// Frames: a plate or sheet stands in the y-z plane, thin along x (as plates stand in a cell); a stack runs along x; a
// case's length is along x, its cells side by side along it, its floor at y = 0; a roll's axis is y.

import type { Part, V3 } from './kits';
import { boundsOfAll, flatten, frame, place, type Assembly, type Placed } from './assembly';
import * as THREE from 'three';

const PI = Math.PI;
const box = (name: string, s: V3, at: V3, more: Partial<Part> = {}): Part => ({ name, shape: { box: s }, at, ...more });

/** A cast grid: a frame round its edge, `bars` upright and `wires` across inside it, and a lug at its top on one side,
 *  all one casting. It stands in the y-z plane, `t` thick along x. */
export function gridPlate(o: { name?: string; w: number; h: number; t: number; bars: number; wires: number; rim?: number; lug?: 'left' | 'right' | 'none'; mat?: string; color?: number; item?: string }): Part {
  const { w, h, t } = o, rim = o.rim ?? Math.max(0.002, Math.min(w, h) * 0.035), bar = rim * 0.5, mat = o.mat ?? 'lead', color = o.color ?? 0x7c7f84, g: Partial<Part> = { mat, color, finish: 'cast', one: true };
  const parts: Part[] = [
    box('grid frame (top)', [t, rim, w], [0, h / 2 - rim / 2, 0], g), box('grid frame (bottom)', [t, rim, w], [0, -h / 2 + rim / 2, 0], g),
    box('grid frame (side)', [t, h - 2 * rim, rim], [0, 0, -w / 2 + rim / 2], g), box('grid frame (side)', [t, h - 2 * rim, rim], [0, 0, w / 2 - rim / 2], g),
  ];
  for (let i = 1; i <= o.bars; i++) parts.push(box('grid bar', [t, h - 2 * rim, bar], [0, 0, -w / 2 + (i * w) / (o.bars + 1)], g));
  for (let j = 1; j <= o.wires; j++) parts.push(box('grid wire', [t * 0.8, bar * 0.8, w - 2 * rim], [0, -h / 2 + (j * h) / (o.wires + 1), 0], g));
  if (o.lug !== 'none') parts.push(box('lug', [t, 0.016, 0.012], [0, h / 2 + 0.008, (o.lug === 'right' ? 1 : -1) * (w / 2 - 0.014)], g));
  return { name: o.name ?? 'cast grid', at: [0, 0, 0], item: o.item ?? 'pb-grid', mat, parts, says: `a cast grid, ${(w * 1000).toFixed(0)} × ${(h * 1000).toFixed(0)} × ${(t * 1000).toFixed(1)} mm: a frame, ${o.bars} bars and ${o.wires} wires, one casting` };
}
/** A part coated: the part itself, and a layer of another material over it, filling it and standing proud of it by
 *  `t` each side along its thinnest axis (paste pressed into a grid, paint, plating, an overmould). Its pieces named for
 *  what it is (the part keeps its own lug, standing out of the coat). */
export function coated(base: Part, o: { name: string; t: number; mat: string; color: number; item?: string; layer?: string; layerItem?: string; fill?: number; says?: string }): Part {
  const b = boundsOfAll(base), s = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3()), thin = s.x <= s.y && s.x <= s.z ? 0 : s.y <= s.z ? 1 : 2;
  // (the coat over the body of the part, not its lug: what stands up out of it at its top is left bare)
  const body = new THREE.Box3(); flatten({ ...base, parts: (base.parts ?? []).filter((q) => !/lug/.test(q.name)) }, (f) => { body.union(boundsOfAll(f.leaf).clone().applyMatrix4(f.m)); });
  const bs = body.isEmpty() ? s : body.getSize(new THREE.Vector3()), bc = body.isEmpty() ? c : body.getCenter(new THREE.Vector3()), size: V3 = [bs.x, bs.y, bs.z]; size[thin] += 2 * o.t;
  const coat = box(o.layer ?? `${o.name} (its coat)`, size, [bc.x, bc.y, bc.z], { mat: o.mat, color: o.color, finish: 'matte', fill: o.fill ?? 1, ...(o.layerItem ? { item: o.layerItem } : {}), says: o.says ?? '' });
  return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : {}), parts: [{ ...base, at: [0, 0, 0] }, coat], says: o.says ?? '' };
}
/** A part wrapped: in an envelope of a sheet `t` thick round it, with `gap` to it (a separator round a plate, a bag, a
 *  sleeve, shrink wrap), open at its top (where its lug comes out). */
export function wrapped(base: Part, o: { name: string; t: number; gap?: number; mat: string; color: number; item: string; fill?: number; says?: string }): Part {
  const b = boundsOfAll(base), g = o.gap ?? 0.0002, t = o.t;
  // (round its body: below its lug)
  const lugTop = (base.parts ?? []).some((q) => /lug|coat/.test(q.name)) ? (() => { const bb = new THREE.Box3(); flatten({ ...base, parts: (base.parts ?? []).filter((q) => !/^lug/.test(q.name) && !(q.parts ?? []).length) }, (f) => { bb.union(boundsOfAll(f.leaf).clone().applyMatrix4(f.m)); }); return bb.isEmpty() ? b : bb; })() : b;
  const bs = lugTop.getSize(new THREE.Vector3()), bc = lugTop.getCenter(new THREE.Vector3());
  const sides: Part[] = [
    box(`${o.name} (front)`, [t, bs.y + g, bs.z + 2 * g], [bc.x - bs.x / 2 - g - t / 2, bc.y - g / 2, bc.z]),
    box(`${o.name} (back)`, [t, bs.y + g, bs.z + 2 * g], [bc.x + bs.x / 2 + g + t / 2, bc.y - g / 2, bc.z]),
    box(`${o.name} (bottom)`, [bs.x + 2 * g + 2 * t, t, bs.z + 2 * g], [bc.x, bc.y - bs.y / 2 - g - t / 2, bc.z]),
    box(`${o.name} (edge)`, [bs.x + 2 * g + 2 * t, bs.y + g, t], [bc.x, bc.y - g / 2, bc.z - bs.z / 2 - g - t / 2]),
    box(`${o.name} (edge)`, [bs.x + 2 * g + 2 * t, bs.y + g, t], [bc.x, bc.y - g / 2, bc.z + bs.z / 2 + g + t / 2]),
  ].map((p) => ({ ...p, mat: o.mat, color: o.color, finish: 'matte', fill: o.fill ?? 1, one: true }));
  return { name: `${base.name}, wrapped`, at: [0, 0, 0], parts: [{ ...base, at: [0, 0, 0] }, { name: o.name, at: [0, 0, 0], item: o.item, mat: o.mat, parts: sides, says: o.says ?? `a sheet ${(t * 1000).toFixed(1)} mm thick folded round it and sealed at its edges` }] };
}
/** Things stacked along x, so many in all, each `pitch` on from the last, taking the things given in turn (a cell's
 *  negative and positive plates, fins on a heat pipe, laminations in a stator), the stack centred on its middle. */
export function stackOf(things: (Part | Assembly)[], n: number, pitch: number, name = `stack of ${n}`): Assembly {
  const items: Placed[] = []; for (let i = 0; i < n; i++) items.push(place(things[i % things.length]!, [(i - (n - 1) / 2) * pitch, 0, 0]));
  return { name, items };
}
/** Straps cast or welded across every piece named `pattern` (lugs, terminals, tabs), one strap for each side they stand
 *  on (along z), over their tops: a cell's two plate straps, a busbar over a row of cells' terminals. In `series`, the
 *  pieces on each side are joined two by two alternately instead (one to the next and so on, zig-zag), so one thing's
 *  plus is joined to the next one's minus, as cells in series are; its two free ends are said, for its posts. */
export function strapsOver(t: Part | Assembly, pattern: string, o: { name?: string; h?: number; w?: number; mat?: string; color?: number; item?: string; series?: boolean } = {}): { straps: Part[]; ends: V3[] } {
  const re = new RegExp(pattern, 'i'), found: THREE.Box3[] = [];
  flatten(t, (f) => { if (re.test(f.leaf.name)) found.push(boundsOfAll(f.leaf).clone().applyMatrix4(f.m)); });
  if (!found.length) throw new Error(`nothing in it is named like "${pattern}"`);
  const h = o.h ?? 0.008, mat = o.mat ?? 'lead', color = o.color ?? 0x7c7f84, item = o.item ?? 'la-strap', straps: Part[] = [], ends: V3[] = [];
  const sides = new Map<number, THREE.Box3[]>(); for (const b of found) { const z = Math.round(b.getCenter(new THREE.Vector3()).z * 200) / 200; (sides.get(z) ?? sides.set(z, []).get(z)!).push(b); }
  const bar = (bs: THREE.Box3[], name: string) => { const u = new THREE.Box3(); for (const b of bs) u.union(b); const s = u.getSize(new THREE.Vector3()), c = u.getCenter(new THREE.Vector3()); return box(name, [s.x + 0.004, h, Math.max(s.z + 0.004, o.w ?? 0)], [c.x, u.max.y + h / 2, c.z], { mat, color, finish: 'cast', item }); };
  if (!o.series) { let k = 0; for (const [, bs] of [...sides].sort((a, b) => a[0] - b[0])) straps.push(bar(bs, `${o.name ?? 'strap'} ${++k}`)); return { straps, ends }; }
  // in series: each side's pieces in order along x, joined two by two, the sides starting one apart (zig-zag)
  const ss = [...sides].sort((a, b) => a[0] - b[0]).map(([, bs]) => bs.sort((a, b) => a.min.x - b.min.x));
  ss.forEach((bs, k) => { for (let i = k % 2; i + 1 < bs.length; i += 2) {
    // (a link across the gap between the two, overlapping each by 6 mm: through the partition between them)
    const a = bs[i]!, b = bs[i + 1]!, x0 = a.max.x - 0.006, x1 = b.min.x + 0.006, z = (a.getCenter(new THREE.Vector3()).z + b.getCenter(new THREE.Vector3()).z) / 2, y = Math.max(a.max.y, b.max.y);
    straps.push(box(`${o.name ?? 'connector'} ${straps.length + 1}`, [Math.max(0.004, x1 - x0), h, o.w ?? 0.014], [(x0 + x1) / 2, y - h / 2, z], { mat, color, finish: 'cast', item }));
  } if (k % 2 === 1 || bs.length % 2 === 1) { const free = k % 2 === 1 ? [bs[0]!, ...(bs.length % 2 === 0 ? [bs[bs.length - 1]!] : [])] : [bs[bs.length - 1]!]; for (const b of free) { const c = b.getCenter(new THREE.Vector3()); ends.push([c.x, b.max.y, c.z]); } } });
  return { straps, ends };
}
/** A moulded enclosure: its floor, four walls and partitions dividing it into `cells` along its length, all one
 *  moulding; ribs across its floor under each cell (a battery case's bridges, a crate's feet); and its lid, separate,
 *  to go on top. Its frames: each cell's middle on its floor ("cell 1", …), and the lid's seat. */
export function enclosure(o: { L: number; W: number; H: number; wall: number; floor?: number; cells: number; partition?: number; lid?: number; ribs?: number; mat?: string; color?: number; item?: string; lidItem?: string; name?: string }): { case: Part; lid: Part; cell: [number, number, number] } {
  const { L, W, H, wall, cells } = o, fl = o.floor ?? wall, pt = o.partition ?? wall * 0.6, lt = o.lid ?? wall * 4, mat = o.mat ?? 'pp', color = o.color ?? 0x1c1d20, g: Partial<Part> = { mat, color, finish: 'satin', one: true };
  const c = (L - 2 * wall - (cells - 1) * pt) / cells, x = (i: number) => -L / 2 + wall + c / 2 + i * (c + pt), rib = o.ribs ?? 0;
  const parts: Part[] = [
    box('floor', [L, fl, W], [0, fl / 2, 0], g), box('wall (front)', [L, H - fl, wall], [0, fl + (H - fl) / 2, -W / 2 + wall / 2], g), box('wall (back)', [L, H - fl, wall], [0, fl + (H - fl) / 2, W / 2 - wall / 2], g),
    box('wall (end)', [wall, H - fl, W - 2 * wall], [-L / 2 + wall / 2, fl + (H - fl) / 2, 0], g), box('wall (end)', [wall, H - fl, W - 2 * wall], [L / 2 - wall / 2, fl + (H - fl) / 2, 0], g),
  ];
  for (let i = 1; i < cells; i++) parts.push(box('partition', [pt, H - fl, W - 2 * wall], [x(i) - c / 2 - pt / 2, fl + (H - fl) / 2, 0], g));
  if (rib > 0) for (let i = 0; i < cells; i++) for (const z of [-0.25, 0.25]) parts.push(box('rib', [c * 0.9, rib, 0.004], [x(i), fl + rib / 2, z * (W - 2 * wall)], g));
  const ports = Array.from({ length: cells }, (_, i) => frame(`cell ${i + 1}`, [x(i), fl + rib, 0], [0, 1, 0], [1, 0, 0]));
  return {
    case: { name: o.name ?? 'case', at: [0, 0, 0], item: o.item ?? 'battery-case', mat, parts, ports, says: `moulded in one: its floor, walls and ${cells - 1} partitions${rib ? ', ribs under each cell' : ''}` },
    lid: { name: 'lid', at: [0, 0, 0], item: o.lidItem ?? 'battery-lid', mat, shape: { box: [L, lt, W] }, color: 0x16171a, finish: 'satin', ports: [frame('seat', [0, -lt / 2, 0], [0, -1, 0], [1, 0, 0])], says: 'moulded, heat-sealed onto its case' },
    cell: [c, H - fl - rib, W - 2 * wall],
  };
}
/** Things put into an enclosure's cells (its frames "cell 1", …), every other one turned half round when `alternate`
 *  (so each one's plus lies beside the next one's minus, as a battery's cells do). */
export function intoCells(thing: Part | Assembly, container: Part, alternate = false): Assembly {
  const cells = (container.ports ?? []).filter((q) => /^cell \d+$/.test(q.name));
  if (!cells.length) throw new Error(`${container.name} has no cells to put things into`);
  return { name: `${cells.length} × ${thing.name}`, items: cells.map((q, i) => place(thing, q.at, [0, alternate && i % 2 ? PI : 0, 0])) };
}
/** A wound roll: strips (each its thickness, its material, its share of the mass) laid over one another and wound round a
 *  core, `turns` times, `h` tall: a lithium cell's cathode, separator and anode; a coil's wire and insulation; a film
 *  capacitor; a roll of tape. Its axis y, its middle at the origin. */
export function woundRoll(o: { name: string; core: number; turns: number; h: number; strips: { name: string; t: number; color: number; mat?: string; kg?: number; item?: string; says?: string }[]; item?: string; says?: string }): Part {
  const pitch = o.strips.reduce((a, s) => a + s.t, 0) + 0.00001 * o.strips.length;
  const spiral = (phase: number, t: number): [number, number][] => {
    const n = Math.max(3, Math.round(o.turns)) * 48, a: [number, number][] = [], b: [number, number][] = [];
    for (let i = 0; i <= n; i++) { const th = (i / 48) * 2 * PI, rr = o.core + pitch * (i / 48) + phase; a.push([rr * Math.cos(th), rr * Math.sin(th)]); b.push([(rr + t) * Math.cos(th), (rr + t) * Math.sin(th)]); }
    return [...a, ...b.reverse()];
  };
  let phase = 0; const parts: Part[] = [];
  for (const s of o.strips) { parts.push({ name: s.name, shape: { prism: { pts: spiral(phase, s.t), L: o.h } }, at: [0, 0, 0], rot: [PI / 2, 0, 0], color: s.color, finish: 'satin', ...(s.mat ? { mat: s.mat } : {}), ...(s.kg !== undefined ? { kg: s.kg } : {}), ...(s.item ? { item: s.item } : {}), says: s.says ?? '' }); phase += s.t + 0.00001; }
  return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : {}), parts, says: o.says ?? `${Math.round(o.turns)} turns of ${o.strips.map((s) => s.name).join(', ')} round a ${(o.core * 2000).toFixed(1)} mm core` };
}
/** Each cell of an enclosure filled with a liquid to a height over its floor (a battery's acid, a tank's fuel, a
 *  radiator's coolant): weighed as all of it, less what stands in it (`share`: the part of the cell the liquid fills);
 *  drawn as its surface (a layer at its height), so what is under it can be seen. */
export function fillCells(container: Part, o: { L: number; W: number; h: number; mat: string; rho: number; share?: number; name?: string; item?: string; color?: number }): Assembly {
  const cells = (container.ports ?? []).filter((q) => /^cell \d+$/.test(q.name)), share = o.share ?? 1, kg = o.L * o.W * o.h * o.rho * share, layer = 0.004;
  const liquid: Part = box(o.name ?? 'liquid', [o.L - 0.001, layer, o.W - 0.001], [0, 0, 0], { mat: o.mat, kg, color: o.color ?? 0x9fb8c4, finish: 'gloss', ...(o.item ? { item: o.item } : {}), says: `filled ${(o.h * 1000).toFixed(0)} mm deep: ${(o.L * o.W * o.h * share * 1000).toFixed(2)} L, ${kg.toFixed(2)} kg (drawn as its surface)` });
  return { name: `${o.name ?? 'liquid'} in ${cells.length} cells`, items: cells.map((q) => place(liquid, [q.at[0], q.at[1] + o.h - layer / 2, q.at[2]])) };
}

// ---- turned, coiled, cut, stamped, chained, cast: the makers of machines -----------------------------------------------
// (as many products share these as share a grid or a coat: a valve, a crank's journal, a bolt's blank, an axle are
// turned; a valve's spring, a clutch's, a pen's are coiled; every gear is cut round a bore; a circlip, a washer, a chain's
// plate are stamped; an engine's block, a gearbox's case, a pump's body are cored castings, their walls round cavities)

/** A coil of wire along y from y = 0: wire d, mean diameter D, free length L, n active coils and a closed coil at each end
 *  (a compression spring's ends, closed so it stands square), as a valve's, a clutch's or a pen's is coiled. */
/** A coiled spring drawn at its length L (as it is fitted, compressed from its free length L0 where that is longer). */
// (32 points a turn: at 12 a coil read as an octagon in the 3D view)
export function coil(o: { name: string; d: number; D: number; L: number; n: number; L0?: number; mat?: string; color?: number; item?: string; says?: string }): Part {
  const per = 32, turns = o.n + 2, pitch = (o.L - 2 * o.d) / o.n, pts: V3[] = [];
  for (let i = 0; i <= turns * per; i++) { const t = i / per, a = 2 * PI * t, y = t < 1 ? o.d / 2 + t * o.d : t > turns - 1 ? o.L - o.d / 2 - (turns - t) * o.d : o.d * 1.5 + (t - 1) * pitch; pts.push([(o.D / 2) * Math.cos(a), Math.min(o.L - o.d / 2, y), (o.D / 2) * Math.sin(a)]); }
  return { name: o.name, shape: { tube: { r: o.d / 2, pts, bend: o.d } }, at: [0, 0, 0], mat: o.mat ?? 'steel-spring', color: o.color ?? 0x3a3c40, finish: 'paint', ...(o.item ? { item: o.item } : {}), made: { by: 'coil', d: o.d, D: o.D, n: o.n, L: o.L, L0: Math.max(o.L, o.L0 ?? o.L) }, says: o.says ?? `coiled: ${(o.d * 1000).toFixed(1)} mm wire on a ${(o.D * 1000).toFixed(1)} mm mean diameter, ${o.n} active coils, ends closed${(o.L0 ?? o.L) > o.L ? `; ${(((o.L0 ?? o.L) - o.L) * 1000).toFixed(1)} mm compressed from its ${((o.L0 ?? o.L) * 1000).toFixed(1)} mm free length as fitted` : ''}` };
}
/** A winding as it is wound: close turns of enamelled wire d across. The outermost layer is drawn turn by turn, a wire
 *  of its own diameter (what is seen of a coil); the layers under it are drawn as the solid they pack into, its share of
 *  copper `fill` (round wire packs to about 0.5 to 0.7 of a winding's section, typical). On a former (a solenoid: round
 *  its axis y, from ri to ro, L long, its foot at its origin, or its middle where `centre`), or round a ring's section
 *  (a toroid: a band round the axis y from ri to ro, L thick, its middle at its origin, the wire wrapped round the band
 *  as it goes round: a stator's, an armature's). A winding of more turns in its outer layer than can be drawn (fine wire)
 *  draws the most that can and says how many it has. */
export const WOUND_MOST = 160;
export function wound(o: { name: string; kind?: 'solenoid' | 'toroid' | 'pole'; ri?: number; ro?: number; /** a pole's: its core's half width and height, and the winding's outside's */ iw?: number; ih?: number; ow?: number; oh?: number; L: number; d: number; fill?: number; centre?: boolean; item?: string; color?: number; says?: string }): Part {
  const kind = o.kind ?? 'solenoid', d = o.d, w = { mat: 'magnet-wire', color: o.color ?? 0xb87333, one: true }, pts: V3[] = [];
  let turns: number, drawn: number, dd: number;
  if (kind === 'pole') {
    // (round a rectangular pole that runs along z, L long, its middle at its origin: the turns in x-y, going along z)
    const { iw = 0, ih = 0, ow = 0, oh = 0 } = o; turns = Math.max(1, Math.floor((o.L - d) / d)); drawn = Math.min(turns, WOUND_MOST); dd = drawn < turns ? (o.L - d) / (drawn + 1) : d;
    const hx = ow - dd / 2, hy = oh - dd / 2, per = 16, sq = (x: number) => Math.sign(x) * Math.abs(x) ** 0.4, around = (t: number): [number, number] => [hx * sq(Math.cos(2 * PI * t)), hy * sq(Math.sin(2 * PI * t))];
    for (let i = 0; i <= drawn * per; i++) { const t = i / per, [x, y] = around(t); pts.push([x, y, -o.L / 2 + dd / 2 + t * ((o.L - dd) / Math.max(1, drawn))]); }
    const rect = (a: number, b: number): [number, number][] => [[-a, -b], [a, -b], [a, b], [-a, b]];
    return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : { item: 'winding' }), mat: 'magnet-wire', made: { by: 'wound', kind, d, turnsOuter: turns, drawn }, says: o.says ?? `${turns} turns of ${(d * 1000).toFixed(2)} mm enamelled wire in its outer layer round its pole${drawn < turns ? ` (${drawn} drawn, each ${(dd * 1000).toFixed(2)} mm: finer than can be drawn)` : ''}, its layers under it packed to ${Math.round((o.fill ?? 0.6) * 100)} %`,
      parts: [{ name: `${o.name} inner layers`, shape: { prism: { pts: rect(ow - dd, oh - dd), holes: [rect(iw, ih)], L: o.L } }, at: [0, 0, 0], ...w, fill: o.fill ?? 0.6 }, { name: `${o.name} wire`, shape: { tube: { r: dd / 2, pts, bend: dd / 4 } }, envelope: { prism: { pts: rect(ow, oh), holes: [rect(ow - dd - 1e-5, oh - dd - 1e-5)], L: o.L } }, at: [0, 0, 0], ...w, finish: 'enamel' }] };
  }
  const ri = o.ri ?? 0, ro = o.ro ?? 0;
  if (kind === 'solenoid') {
    const y0 = o.centre ? -o.L / 2 : 0, r = ro - d / 2; turns = Math.max(1, Math.floor((o.L - d) / d)); drawn = Math.min(turns, WOUND_MOST); dd = drawn < turns ? (o.L - d) / (drawn + 1) : d;
    const per = 8;
    for (let i = 0; i <= drawn * per; i++) { const t = i / per, a = 2 * PI * t; pts.push([r * Math.cos(a), y0 + dd / 2 + t * ((o.L - dd) / Math.max(1, drawn)), r * Math.sin(a)]); }
    const body: [number, number][] = [[ri, y0], [ro - dd, y0], [ro - dd, y0 + o.L], [ri, y0 + o.L], [ri, y0]];
    return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : { item: 'winding' }), mat: 'magnet-wire', made: { by: 'wound', kind, d, turnsOuter: turns, drawn }, says: o.says ?? `${turns} turns of ${(d * 1000).toFixed(2)} mm enamelled wire in its outer layer${drawn < turns ? ` (${drawn} drawn, each ${(dd * 1000).toFixed(2)} mm: finer than can be drawn)` : ''}, its layers under it packed to ${Math.round((o.fill ?? 0.6) * 100)} %`,
      parts: [{ name: `${o.name} inner layers`, shape: { lathe: body }, at: [0, 0, 0], ...w, fill: o.fill ?? 0.6 }, { name: `${o.name} wire`, shape: { tube: { r: dd / 2, pts, bend: dd / 4 } }, envelope: { lathe: [[ro - dd - 1e-5, y0], [ro, y0], [ro, y0 + o.L], [ro - dd - 1e-5, y0 + o.L], [ro - dd - 1e-5, y0]] }, at: [0, 0, 0], ...w, finish: 'enamel' }] };
  }
  // (a toroid: round the band's section (a rounded rectangle, half a by half b) as it goes round the axis)
  const Rm = (ri + ro) / 2; turns = Math.max(3, Math.floor((2 * PI * (ri + d / 2)) / d)); drawn = Math.min(turns, WOUND_MOST); dd = drawn < turns ? (2 * PI * (ri + d / 2)) / drawn : d;
  const a = (ro - ri) / 2 - dd / 2, b = o.L / 2 - dd / 2, per = 12, sq = (x: number) => Math.sign(x) * Math.abs(x) ** 0.5;
  for (let i = 0; i <= drawn * per; i++) { const t = i / per, phi = (2 * PI * t) / drawn, th = 2 * PI * t, rr = Rm + a * sq(Math.cos(th)); pts.push([rr * Math.cos(phi), b * sq(Math.sin(th)), rr * Math.sin(phi)]); }
  const body: [number, number][] = [[ri + dd, -b], [ro - dd, -b], [ro - dd, b], [ri + dd, b], [ri + dd, -b]];
  return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : { item: 'winding' }), mat: 'magnet-wire', made: { by: 'wound', kind, d, turnsOuter: turns, drawn }, says: o.says ?? `${turns} turns of ${(d * 1000).toFixed(2)} mm enamelled wire round its band${drawn < turns ? ` (${drawn} drawn, each ${(dd * 1000).toFixed(2)} mm: finer than can be drawn)` : ''}, its layers under them packed to ${Math.round((o.fill ?? 0.6) * 100)} %`,
    parts: [{ name: `${o.name} inner layers`, shape: { lathe: body }, at: [0, 0, 0], ...w, fill: o.fill ?? 0.6 }, { name: `${o.name} wire`, shape: { tube: { r: dd / 2, pts, bend: dd / 4 } }, envelope: { lathe: [[ri, -o.L / 2], [ro, -o.L / 2], [ro, o.L / 2], [ri, o.L / 2], [ri, -o.L / 2]] }, at: [0, 0, 0], ...w, finish: 'enamel' }] };
}
/** A toothed wheel cut round a bore: module m, z teeth, b wide along z (its axis), its teeth drawn as their straight-sided
 *  outline from the root to the tip circle (the involute's curve not drawn), as every spur, helical and timing gear and
 *  sprocket is cut. */
export function toothed(o: { name: string; m: number; z: number; b: number; bore: number; mat: string; color?: number; item?: string; says?: string; hub?: { r: number; L: number } }): Part {
  const ra = (o.m * (o.z + 2)) / 2, rf = (o.m * (o.z - 2.5)) / 2, outline: [number, number][] = [], step = (2 * PI) / o.z;
  for (let i = 0; i < o.z; i++) { const a = i * step; for (const [f, r] of [[0, rf], [0.04, rf], [0.21, ra], [0.47, ra], [0.64, rf], [1, rf]] as [number, number][]) if (!(f === 1)) outline.push([r * Math.cos(a + f * step), r * Math.sin(a + f * step)]); }
  const hole = Array.from({ length: 24 }, (_, i) => [(o.bore / 2) * Math.cos((2 * PI * i) / 24), (o.bore / 2) * Math.sin((2 * PI * i) / 24)] as [number, number]);
  const g: Partial<Part> = { mat: o.mat, color: o.color ?? 0x8a8c90, finish: 'machined', one: true };
  const parts: Part[] = [{ name: `${o.name} teeth`, shape: { prism: { pts: outline, holes: [hole], L: o.b } }, at: [0, 0, 0], ...g }];
  if (o.hub) parts.push({ name: `${o.name} hub`, shape: { lathe: [[o.bore / 2, 0], [o.hub.r, 0], [o.hub.r, o.hub.L], [o.bore / 2, o.hub.L], [o.bore / 2, 0]] }, at: [0, 0, o.b / 2], rot: [PI / 2, 0, 0], ...g });
  return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : {}), mat: o.mat, parts, says: o.says ?? `cut: module ${(o.m * 1000).toFixed(2)}, ${o.z} teeth, ${(o.b * 1000).toFixed(0)} mm wide, pitch circle ${(o.m * o.z * 1000).toFixed(1)} mm` };
}
/** A ring stamped from sheet, open at a gap, with two lug eyes either side of it (a circlip's, a hose clip's): inside
 *  radius ri, its band w wide, t thick along z. */
export function ringClip(o: { name: string; ri: number; w: number; t: number; gap?: number; lugs?: boolean; mat?: string; color?: number; item?: string; says?: string }): Part {
  const g = o.gap ?? 0.5, n = 32, ro = o.ri + o.w, pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const a = g / 2 + ((2 * PI - g) * i) / n; pts.push([ro * Math.cos(a), ro * Math.sin(a)]); }
  for (let i = n; i >= 0; i--) { const a = g / 2 + ((2 * PI - g) * i) / n; pts.push([o.ri * Math.cos(a), o.ri * Math.sin(a)]); }
  const parts: Part[] = [{ name: o.name, shape: { prism: { pts, L: o.t } }, at: [0, 0, 0], mat: o.mat ?? 'steel-spring', color: o.color ?? 0x2a2b2e, finish: 'plate', one: true }];
  if (o.lugs !== false) for (const s of [-1, 1]) parts.push({ name: `${o.name} lug`, shape: { cyl: [o.w * 0.9, o.t] }, at: [ro * Math.cos(s * (g / 2 + 0.25)), ro * Math.sin(s * (g / 2 + 0.25)), 0], rot: [PI / 2, 0, 0], mat: o.mat ?? 'steel-spring', color: o.color ?? 0x2a2b2e, finish: 'plate', one: true, cuts: [{ r: o.w * 0.35, depth: o.t, at: [0, o.t / 2, 0], dir: [0, -1, 0] }] });
  return { name: o.name, at: [0, 0, 0], ...(o.item ? { item: o.item } : {}), parts, says: o.says ?? `stamped from ${(o.t * 1000).toFixed(1)} mm spring steel` };
}
/** Roller chain along a path of points (closed: back to its first), a link at each pitch: an inner link (two plates
 *  pressed on two bushes, a roller on each) then an outer (two plates riveted on two pins through the bushes), turn and
 *  turn about, each piece tagged; as a bicycle's, a timing drive's and a conveyor's chain are made. */
export function chainRun(o: { name: string; p: number; roller: number; width: number; path: V3[]; closed?: boolean; says?: string }): Assembly {
  // (its pin about 0.52 of its roller across, its bush's outside 0.74, its plates 0.93 of its pitch high and 0.126 thick,
  // as an 08B's 4.45, 6.3, 11.8 and 1.6 mm are to its 8.51 mm roller and 12.7 mm pitch: ISO 606, others in proportion)
  const p = o.p, h = p * 0.93, t = p * 0.126, pin = o.roller * 0.26, bushR = o.roller * 0.37, w = o.width;
  // (a plate: its two holes drilled, its rounded ends and waist (about 0.68 of the box round it, typical of a figure-of-eight plate) as its share)
  const plate = (n: string, it: string, z: number, r: number): Part => ({ name: n, shape: { box: [p + h * 0.8, h, t] }, at: [p / 2, 0, z], mat: 'steel-alloy', color: 0x6a6c70, finish: 'machined', item: it, fill: 0.68, cuts: [-p / 2, p / 2].map((x) => ({ r, depth: t, at: [x, 0, t / 2] as V3, dir: [0, 0, -1] as V3 })) });
  const inner: Assembly = { name: 'inner link', item: 'chain-inner-link', items: [plate('inner plate', 'chain-plate', -(w / 2 + t / 2), bushR), plate('inner plate', 'chain-plate', w / 2 + t / 2, bushR), ...[0, p].flatMap((x) => [
    { name: 'bush', shape: { lathe: [[pin, -(w / 2 + t)], [bushR, -(w / 2 + t)], [bushR, w / 2 + t], [pin, w / 2 + t], [pin, -(w / 2 + t)]] }, at: [x, 0, 0], rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x8a8c90, finish: 'machined', item: 'chain-bush' } as Part,
    { name: 'roller', shape: { lathe: [[bushR, -w / 2 + 0.0003], [o.roller / 2, -w / 2 + 0.0003], [o.roller / 2, w / 2 - 0.0003], [bushR, w / 2 - 0.0003], [bushR, -w / 2 + 0.0003]] }, at: [x, 0, 0], rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x9a9ca0, finish: 'machined', item: 'chain-roller' } as Part])].map((q) => ({ of: q, at: [0, 0, 0] as V3, rot: [0, 0, 0] as V3, s: 1 })) };
  const outer: Assembly = { name: 'outer link', item: 'chain-outer-link', items: [plate('outer plate', 'chain-plate', -(w / 2 + 1.5 * t), pin), plate('outer plate', 'chain-plate', w / 2 + 1.5 * t, pin), ...[0, p].map((x) => ({ name: 'pin', shape: { cyl: [pin, w + 4.6 * t] }, at: [x, 0, 0], rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0xb0b2b6, finish: 'machined', item: 'chain-pin' } as Part))].map((q) => ({ of: q, at: [0, 0, 0] as V3, rot: [0, 0, 0] as V3, s: 1 })) };
  // (walk the path a pitch at a time, each link turned to the line from its pin to the next)
  const pts = o.closed ? [...o.path, o.path[0]!] : o.path, items: Placed[] = []; let k = 0;
  const segLen = (i: number) => Math.hypot(pts[i + 1]![0] - pts[i]![0], pts[i + 1]![1] - pts[i]![1], pts[i + 1]![2] - pts[i]![2]);
  const at = (s: number): V3 => { let i = 0, rest = s; while (i < pts.length - 2 && rest > segLen(i)) { rest -= segLen(i); i++; } const L = segLen(i) || 1, f = Math.min(1, rest / L); return [0, 1, 2].map((j) => pts[i]![j]! + (pts[i + 1]![j]! - pts[i]![j]!) * f) as V3; };
  const total = pts.slice(0, -1).reduce((a, _, i) => a + segLen(i), 0), n = Math.max(2, Math.floor(total / p / 2) * 2);
  for (k = 0; k < n; k++) { const a = at(k * p), b = at((k + 1) * p); items.push(place(k % 2 ? outer : inner, a, [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])])); }
  return { name: o.name, item: 'roller-chain', items };
}

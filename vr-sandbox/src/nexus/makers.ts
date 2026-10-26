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

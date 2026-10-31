// Exact solids: every part's shape made a boundary-representation solid by OpenCascade (the replicad build of
// OpenCascade.js, LGPL-2.1), placed where the part is, its holes cut by true booleans, its validity checked by the
// kernel's own analyser and its volume measured by it. What the meshes only draw, this makes: the compiler's stage 10
// (geometry is exact solids) and, after it, STEP. What cannot be made yet is counted and said, never drawn as a mesh and
// called a solid. The road map's item 6.
import type { Part, Shape, V3 } from './kits';
import { sectionPoint, tubeLegs } from './form';
import { massOf, densityKg } from './mass';
import { register, type BlockDef, type PortDef, type Type } from './blocks';
import { trianglesOf, interferencePairs } from './make/rules';

// (the kernel's types are its own; this module hands out only what it measures)
type Solid = any; // eslint-disable-line @typescript-eslint/no-explicit-any
type Replicad = typeof import('replicad');
let R: Replicad | undefined, loading: Promise<Replicad> | undefined;

/** The kernel, loaded once: under Node from its file, in a page from its URL. About a quarter of a second under Node. */
export function kernel(): Promise<Replicad> {
  if (R) return Promise.resolve(R);
  return (loading ??= (async () => {
    const [{ default: init }, rep] = await Promise.all([import('replicad-opencascadejs'), import('replicad')]);
    let oc: unknown;
    if (typeof process !== 'undefined' && process.versions?.node) {
      const { readFileSync } = await import(/* @vite-ignore */ 'node:fs'), { createRequire } = await import(/* @vite-ignore */ 'node:module');
      const file = createRequire(import.meta.url).resolve('replicad-opencascadejs/wasm');
      oc = await (init as (o: object) => Promise<unknown>)({ wasmBinary: readFileSync(file) });
    } else {
      const url = (await import('replicad-opencascadejs/wasm?url')).default as string;
      oc = await (init as (o: object) => Promise<unknown>)({ locateFile: () => url });
    }
    rep.setOC(oc as Parameters<Replicad['setOC']>[0]); R = rep; return rep;
  })());
}

const deg = 180 / Math.PI;
/** A profile [r, y] spun about y: closed as it is where it ends where it began (a ring), else along the axis. */
function revolved(r: Replicad, prof: [number, number][]): Solid {
  let pts = prof.filter((q, i) => i === 0 || Math.hypot(q[0] - prof[i - 1]![0], q[1] - prof[i - 1]![1]) > 1e-9).map(([a, y]) => [Math.max(0, a), y] as [number, number]);
  const closed = pts.length > 2 && Math.hypot(pts[0]![0] - pts[pts.length - 1]![0], pts[0]![1] - pts[pts.length - 1]![1]) < 1e-9;
  if (closed) pts = pts.slice(0, -1);
  else { if (pts[pts.length - 1]![0] > 0) pts.push([0, pts[pts.length - 1]![1]]); if (pts[0]![0] > 0) pts.unshift([0, pts[0]![1]]); }
  if (pts.length < 3) throw new Error('a profile of fewer than three points');
  return r.revolution(r.makePolygon(pts.map(([a, y]) => [a, y, 0])), [0, 0, 0], [0, 1, 0]);
}
/** A turned profile with n flat sides (a nut's six): each of its points a polygon round y, joined by ruled faces. */
function faceted(r: Replicad, prof: [number, number][], n: number): Solid {
  const ring = (a: number, y: number) => r.assembleWire(Array.from({ length: n }, (_, k) => { const t0 = (2 * Math.PI * k) / n, t1 = (2 * Math.PI * (k + 1)) / n; return r.makeLine([a * Math.sin(t0), y, a * Math.cos(t0)], [a * Math.sin(t1), y, a * Math.cos(t1)]); }));
  const pts = prof.filter((q, i) => i === 0 || Math.hypot(q[0] - prof[i - 1]![0], q[1] - prof[i - 1]![1]) > 1e-9), mid = pts.filter((q) => q[0] > 1e-9);
  // (its ends on the axis are capped flat: a lathe's profile runs out to its axis at each end)
  return r.loft(mid.map(([a, y]) => ring(a, y)), { ruled: true });
}
/** A loft's station as a closed polygon at its x (its section's own points, 64 round). */
const stationWire = (r: Replicad, s: Parameters<typeof sectionPoint>[0]) => r.assembleWire((() => { const k = 64, p = Array.from({ length: k }, (_, i) => { const [y, z] = sectionPoint(s, (2 * Math.PI * i) / k); return [s.x, y, z + (s.z ?? 0)] as V3; }); return p.map((a, i) => r.makeLine(a, p[(i + 1) % k]!)); })());
/** A tube's run as its straights and true arcs, a circle swept along it (its bore swept and taken out, where it has a wall). */
function swept(r: Replicad, t: Extract<Shape, { tube: unknown }>['tube']): Solid {
  const legs = tubeLegs(t); if (!legs.length) throw new Error('a tube with no length');
  const edges = legs.map((l) => {
    if (l.kind === 'line') return r.makeLine(l.a, l.b);
    // (an arc's middle: from its corner toward the arc's centre, less its radius)
    const c = l.c!, ua = norm(sub(l.a, c)), ub = norm(sub(l.b, c)), bis = norm(add(ua, ub)), half = Math.acos(Math.max(-1, Math.min(1, dot(ua, ub)))) / 2, ca = Math.hypot(...sub(l.a, c)), rad = ca * Math.tan(half), toO = rad / Math.sin(half);
    const O = add(c, mul(bis, toO)), m = add(O, mul(bis, -rad)); return r.makeThreePointArc(l.a, m, l.b);
  });
  const d0 = norm(sub(legs[0]!.b, legs[0]!.a)), at = legs[0]!.a;
  const along = (spine: unknown) => { const ring = (rr: number) => r.genericSweep(r.assembleWire([r.makeCircle(rr, at, d0)]), spine as never, { frenet: true }, false); const out = ring(t.r); return t.wall && t.wall < t.r - 1e-6 ? out.cut(ring(t.r - t.wall)) : out; };
  return along(r.assembleWire(edges));
}
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], norm = (a: V3): V3 => mul(a, 1 / (Math.hypot(...a) || 1));

/** A shape as an exact solid in its part's own frame, as the renderer draws it (kit3d.ts `geometry`): cylinders and
 *  cones along y about their middles, a prism along z about its middle, a torus round z. Throws what it cannot make. */
export function solidOfShape(r: Replicad, s: Shape, facets?: number): Solid {
  if ('box' in s) { const [a, b, c] = s.box; return r.makeBox([-a / 2, -b / 2, -c / 2], [a / 2, b / 2, c / 2]); }
  if ('cyl' in s) { const [a, h, a2 = a] = s.cyl, prof: [number, number][] = [[0, -h / 2], [a, -h / 2], [a2, h / 2], [0, h / 2]]; return facets ? faceted(r, prof, facets) : revolved(r, prof); }
  if ('cone' in s) return revolved(r, [[0, -s.cone[1] / 2], [s.cone[0], -s.cone[1] / 2], [0, s.cone[1] / 2]]);
  if ('sphere' in s) return r.makeSphere(s.sphere);
  if ('torus' in s) { const [Rr, a] = s.torus; return r.revolution(r.makeFace(r.assembleWire([r.makeCircle(a, [Rr, 0, 0], [0, 1, 0])])), [0, 0, 0], [0, 0, 1]); }
  if ('capsule' in s) { const [a, h] = s.capsule; return revolved(r, [[0, -h / 2], [a, -h / 2], [a, h / 2], [0, h / 2]]).fuse(r.makeSphere(a).translate([0, h / 2, 0])).fuse(r.makeSphere(a).translate([0, -h / 2, 0])); }
  if ('lathe' in s) return facets ? faceted(r, s.lathe, facets) : revolved(r, s.lathe);
  // (its outline's points each once: a point repeated, or the first said again at the end, is an edge of no length)
  if ('prism' in s) { const poly = (p0: [number, number][]) => { const pts = p0.filter((p, i) => Math.hypot(p[0] - p0[(i + 1) % p0.length]![0], p[1] - p0[(i + 1) % p0.length]![1]) > 1e-9); return r.assembleWire(pts.map((p, i) => r.makeLine([p[0], p[1], 0], [pts[(i + 1) % pts.length]![0], pts[(i + 1) % pts.length]![1], 0]))); };
    // (each opening cut through it as a solid of its own, a little longer than it: an inner loop of one face is as good
    // only while it is wound the other way and clear of the outline, which an outline drawn as points does not promise)
    const bar = (pts: [number, number][], L: number) => r.basicFaceExtrusion(r.makeFace(poly(pts)), new r.Vector([0, 0, L])).translate([0, 0, -L / 2]);
    return (s.prism.holes ?? []).reduce((b: Solid, h) => b.cut(bar(h, s.prism.L * 1.02)), bar(s.prism.pts, s.prism.L)); }
  if ('loft' in s) { const st = [...s.loft.st].sort((a, b) => a.x - b.x).filter((x) => x.w > 1e-5 && x.hi - x.lo > 1e-5); if (st.length < 2) throw new Error('a loft of fewer than two sections'); return r.loft(st.map((x) => stationWire(r, x)), { ruled: true }); }
  if ('tube' in s) return swept(r, s.tube);
  if ('surf' in s) throw new Error('a freeform skin (its NURBS surface thickened: not built yet)');
  throw new Error(`a ${Object.keys(s)[0]} (not a solid)`);
}

/** The kernel's own validity check (BRepCheck_Analyzer). */
function valid(sol: Solid): boolean { try { const oc = (R as unknown as { getOC: () => any }).getOC(), a = new oc.BRepCheck_Analyzer(sol.wrapped, true, false); const ok = typeof a.IsValid_2 === 'function' ? a.IsValid_2() : a.IsValid(); a.delete(); return !!ok; } catch { return false; } }

export interface SolidRow { path: string; /** its place in the tree by index ("/12/3"), as layout and the rules say it */ ix: string; name: string; shape: string; ok: boolean; why?: string; valid?: boolean; volume?: number; kg?: number; ourKg: number; diff?: number; fill?: number; shell?: boolean; cuts: number }
export interface Solids { rows: SolidRow[]; made: number; failed: number; invalid: number; volume: number; kg: number; ourKg: number; byWhy: Record<string, number>; solids: { path: string; ix: string; solid: Solid }[] }

/** Every piece of a thing as an exact solid, placed (each part's at and rot, three's XYZ order), its holes cut: what was
 *  made, what was not and why, each one's volume by the kernel times its density against our own mass of it. A hollow
 *  part (a shell) is not made yet: said, and counted. */
export async function solidsOf(thing: Part, o: { keep?: boolean; /** keep only these (by their index path) */ only?: Set<string> } = {}): Promise<Solids> {
  const r = await kernel(), rows: SolidRow[] = [], solids: { path: string; ix: string; solid: Solid }[] = [];
  const walk = (p: Part, path: string, ix: string, place: (s: Solid) => Solid) => {
    const here = (s: Solid) => { let x = s; if (p.rot) { const [a, b, c] = p.rot; if (c) x = x.rotate(c * deg, [0, 0, 0], [0, 0, 1]); if (b) x = x.rotate(b * deg, [0, 0, 0], [0, 1, 0]); if (a) x = x.rotate(a * deg, [0, 0, 0], [1, 0, 0]); } if (p.at) x = x.translate(p.at); return place(x); };
    const me = `${path}/${p.name}`;
    // (a piece with a stated mass is made a solid all the same: only its mass is not set against its volume)
    if (p.shape) {
      const own = massOf({ ...p, parts: undefined }), row: SolidRow = { path: me, ix, name: p.name, shape: Object.keys(p.shape)[0]!, ok: false, ourKg: own, cuts: p.cuts?.length ?? 0, ...(p.fill !== undefined && p.fill !== 1 ? { fill: p.fill } : {}) };
      try {
        if (p.shell) { row.shell = true; throw new Error('a hollow part (its wall offset inward: not built yet)'); }
        let s = solidOfShape(r, p.shape, p.facets);
        if (p.base) { const h = 'cyl' in p.shape ? p.shape.cyl[1] : 'cone' in p.shape ? p.shape.cone[1] : 'capsule' in p.shape ? p.shape.capsule[1] : 'box' in p.shape ? p.shape.box[1] : 0; s = s.translate([0, h / 2, 0]); }
        for (const c of p.cuts ?? []) { const d = norm(c.dir), hole = c.n ? solidOfShape(r, { cyl: [c.r, c.depth] }, c.n).rotate(Math.acos(Math.max(-1, Math.min(1, d[1]))) * deg, [0, 0, 0], Math.hypot(d[2], d[0]) > 1e-9 ? [d[2], 0, -d[0]] : [1, 0, 0]).translate(add(c.at, mul(d, c.depth / 2))) : r.makeCylinder(c.r, c.depth, c.at, d); s = s.cut(hole); hole.delete?.(); }
        const v0 = r.measureVolume(s); if (v0 < 0) throw new Error('its profile crosses itself (the kernel measures it inside out)'); const v = v0, rho = p.mat ? densityKg(p.mat) : undefined;
        Object.assign(row, { ok: true, valid: valid(s), volume: v, ...(rho && p.kg === undefined ? { kg: v * rho * (p.fill ?? 1), diff: own > 0 ? (v * rho * (p.fill ?? 1)) / own - 1 : undefined } : {}) });
        // (each solid freed once measured, unless kept: the kernel's memory is its own, not the garbage collector's)
        if (o.keep && (!o.only || o.only.has(ix))) solids.push({ path: me, ix, solid: here(s) }); else s.delete?.();
      } catch (e) { row.why = e instanceof Error && e.message ? e.message : `the kernel could not make this ${row.shape}${'tube' in p.shape ? ' (a sweep along its run)' : ''}`; }
      rows.push(row);
    }
    (p.parts ?? []).forEach((q, k) => walk(q, me, `${ix}/${k}`, here));
  };
  walk(thing, '', '', (s) => s);
  const made = rows.filter((x) => x.ok), byWhy: Record<string, number> = {};
  for (const x of rows) if (!x.ok) { const k = (x.why ?? '').replace(/\d[\d.]*/g, '#').slice(0, 80); byWhy[k] = (byWhy[k] ?? 0) + 1; }
  return { rows, made: made.length, failed: rows.length - made.length, invalid: made.filter((x) => !x.valid).length, volume: made.reduce((a, x) => a + (x.volume ?? 0), 0), kg: made.reduce((a, x) => a + (x.kg ?? 0), 0), ourKg: made.filter((x) => x.kg !== undefined).reduce((a, x) => a + x.ourKg, 0), byWhy, solids };
}

// ---- as a node -------------------------------------------------------------------------------------------------------
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
/** What a thing's exact solids say, in a line and a table: the worst first (not made, invalid, then most off). */
export function solidsSaid(s: Solids): { rows: Record<string, unknown>[]; says: string } {
  const off = s.rows.filter((x) => x.ok && x.diff !== undefined && Math.abs(x.diff) > 0.01);
  const rank = (x: SolidRow) => (!x.ok ? 3 : !x.valid ? 2 : Math.abs(x.diff ?? 0) > 0.01 ? 1 : 0);
  const rows = [...s.rows].sort((a, b) => rank(b) - rank(a) || Math.abs(b.diff ?? 0) - Math.abs(a.diff ?? 0)).slice(0, 300).map((x) => ({ piece: x.name, shape: x.shape, made: x.ok ? (x.valid ? 'yes' : 'yes, not valid') : `no: ${x.why}`, 'volume, cm³': x.volume !== undefined ? +(x.volume * 1e6).toPrecision(4) : '', 'kg (solid)': x.kg !== undefined ? +x.kg.toPrecision(4) : '', 'kg (ours)': +x.ourKg.toPrecision(4), off: x.diff !== undefined ? `${(x.diff * 100).toFixed(2)} %` : '', ...(x.fill !== undefined ? { 'share said': x.fill } : {}) }));
  const why = Object.entries(s.byWhy).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} ${k}`).join('; ');
  return { rows, says: `${s.made} of ${s.rows.length} pieces made exact solids (${s.invalid} not valid)${s.failed ? `; not made: ${why}` : ''}; ${off.length} of those made off our mass by more than 1 %; ${s.kg.toPrecision(4)} kg from their volumes against our ${s.ourKg.toPrecision(4)} kg for the same pieces` };
}
register({ version: 1, by: 'built in', pure: true, id: 'solid.exact', name: 'Exact solids (B-rep, OpenCascade)', kind: 'critic', ability: 'check', domains: ['mechanical', 'manufacturing', 'vehicles', 'structural'],
  spec: { gloss: 'Can every piece of it be made an exact solid, is each one valid, and does each one\'s volume agree with its mass?', discipline: 'mechanical.design', role: 'assessment', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010371.10010396', label: 'Computing methodologies: shape modeling' }],
    model: { equations: ['m = ρ V (the solid\'s volume, by the kernel) × its stated share where it has one', 'off = m / m_ours − 1'], class: 'analytical', time: 'steady', linear: true, method: 'each shape a boundary-representation solid in OpenCascade (revolved, extruded, swept along true lines and arcs, lofted through its sections), its holes cut by booleans, checked by BRepCheck_Analyzer, its volume by its mass properties', references: ['OpenCascade Technology 7.x, Modeling Algorithms and Shape Healing user guides (Open Cascade SAS)', 'replicad and replicad-opencascadejs 1.1.0 (S. Genoud), LGPL-2.1'] } },
  says: 'Every piece of a thing made an exact solid by a CAD kernel (OpenCascade): turned parts revolved, sections extruded, tubes swept along their true straights and arcs, bodies lofted through their sections, holes cut by real booleans; each checked valid by the kernel, and its volume times its density set against the mass we give it, so a mass formula that is wrong shows (one was: a saddle bored along a face was counted a whole hole). What it cannot make (a hollow skin, a dense winding) is counted, with why, never drawn as a mesh and called a solid',
  ports: { inputs: [P('thing', 'part')], outputs: [P('made', 'integer'), P('failed', 'integer'), P('invalid', 'integer'), P('kg', 'number', { unit: 'kg', label: 'mass from their volumes' }), P('ourKg', 'number', { unit: 'kg', label: 'our mass of the same pieces' }), P('rows', 'table'), P('why', 'record', { label: 'what was not made, by reason' }), P('says', 'text')] },
  run: async (i) => { const t = i.thing as Part; if (!t || typeof t.name !== 'string') throw new Error('wire a thing in'); const s = await solidsOf(t), said = solidsSaid(s); return { made: s.made, failed: s.failed, invalid: s.invalid, kg: s.kg, ourKg: s.ourKg, rows: said.rows, why: s.byWhy, says: said.says }; },
  tests: [{ inputs: { thing: { name: 'bar', shape: { box: [0.1, 0.02, 0.02] }, at: [0, 0, 0], mat: 'steel-low', cuts: [{ r: 0.005, depth: 0.02, at: [0, 0.01, 0], dir: [0, -1, 0] }] } }, outputs: { made: 1, failed: 0, invalid: 0 } }] } as BlockDef);

// ---- export: STEP, STL, 3MF, glTF, a bill of materials ---------------------------------------------------------------
/** A thing's files: STEP (AP242, as OpenCascade 8 writes it; each solid named by its path in the thing's tree, coloured), STL (binary, its solids
 *  together), 3MF (each solid an object, named), glTF 2.0 (each solid a mesh, named), and its bill of materials (CSV).
 *  Meshes are the kernel's own tessellation of the exact solids, within 0.2 mm of them. Units: millimetres in every
 *  file (STEP's, 3MF's), metres in glTF (its own rule). What could not be made a solid is not in them, and is listed. */
export async function filesOf(thing: Part, o: { formats?: string[] } = {}): Promise<{ files: Record<string, Uint8Array>; solids: Solids }> {
  const r = await kernel(), s = await solidsOf(thing, { keep: true }), want = new Set(o.formats ?? ['step', 'stl', '3mf', 'gltf', 'bom']), files: Record<string, Uint8Array> = {}, base = thing.name.replace(/[^\w-]+/g, '-');
  const colourOf = new Map<string, number>(); const walk = (p: Part, path: string) => { const me = `${path}/${p.name}`; if (p.color !== undefined) colourOf.set(me, p.color); (p.parts ?? []).forEach((q) => walk(q, me)); }; walk(thing, '');
  const bytes = async (b: Blob) => new Uint8Array(await b.arrayBuffer()), hex = (c?: number) => `#${(c ?? 0x9a9ea4).toString(16).padStart(6, '0')}`;
  const mm = s.solids.map((x) => ({ ...x, mmSolid: x.solid.clone().scale(1000, [0, 0, 0]) }));
  if (want.has('step')) files[`${base}.step`] = await bytes(r.exportSTEP(mm.map((x) => ({ shape: x.mmSolid, name: x.path.slice(1), color: hex(colourOf.get(x.path)) })), { unit: 'MM', modelUnit: 'MM' } as never));
  const meshes = (want.has('stl') || want.has('3mf') || want.has('gltf')) ? s.solids.map((x) => ({ path: x.path, m: x.solid.mesh({ tolerance: 2e-4, angularTolerance: 0.35 }) as { triangles: number[]; vertices: number[]; normals: number[] } })) : [];
  if (want.has('stl')) { const n = meshes.reduce((a, x) => a + x.m.triangles.length / 3, 0), buf = new DataView(new ArrayBuffer(84 + 50 * n)); buf.setUint32(80, n, true); let at = 84;
    for (const { m } of meshes) for (let t = 0; t < m.triangles.length; t += 3) { const v = [0, 1, 2].map((k) => m.triangles[t + k]! * 3), p = v.map((i) => [m.vertices[i]!, m.vertices[i + 1]!, m.vertices[i + 2]!]), a = p[0]!, b = p[1]!, c = p[2]!, e1 = [b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!], e2 = [c[0]! - a[0]!, c[1]! - a[1]!, c[2]! - a[2]!], nn = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!], L = Math.hypot(...nn) || 1;
      for (const x of nn) { buf.setFloat32(at, x / L, true); at += 4; } for (const q of p) for (const x of q) { buf.setFloat32(at, x * 1000, true); at += 4; } at += 2; }
    files[`${base}.stl`] = new Uint8Array(buf.buffer); }
  if (want.has('3mf')) { const { zipSync, strToU8 } = await import('fflate'), esc = (x: string) => x.replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`);
    const objs = meshes.map(({ path, m }, i) => `<object id="${i + 1}" type="model" name="${esc(path.slice(1))}"><mesh><vertices>${Array.from({ length: m.vertices.length / 3 }, (_, k) => `<vertex x="${(m.vertices[3 * k]! * 1000).toFixed(4)}" y="${(m.vertices[3 * k + 1]! * 1000).toFixed(4)}" z="${(m.vertices[3 * k + 2]! * 1000).toFixed(4)}"/>`).join('')}</vertices><triangles>${Array.from({ length: m.triangles.length / 3 }, (_, k) => `<triangle v1="${m.triangles[3 * k]}" v2="${m.triangles[3 * k + 1]}" v3="${m.triangles[3 * k + 2]}"/>`).join('')}</triangles></mesh></object>`).join('');
    const model = `<?xml version="1.0" encoding="UTF-8"?><model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02"><resources>${objs}</resources><build>${meshes.map((_, i) => `<item objectid="${i + 1}"/>`).join('')}</build></model>`;
    files[`${base}.3mf`] = zipSync({ '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>'), '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>'), '3D/3dmodel.model': strToU8(model) }); }
  if (want.has('gltf')) { const chunks: Uint8Array[] = [], views: object[] = [], acc: object[] = [], ms: object[] = [], nodes: object[] = []; let off = 0;
    const push = (a: Float32Array | Uint32Array, target: number) => { const b = new Uint8Array(a.buffer.slice(0)); views.push({ buffer: 0, byteOffset: off, byteLength: b.length, target }); chunks.push(b); off += b.length; return views.length - 1; };
    meshes.forEach(({ path, m }) => { const pos = new Float32Array(m.vertices), lo = [0, 1, 2].map((k) => Math.min(...pos.filter((_, i) => i % 3 === k))), hi = [0, 1, 2].map((k) => Math.max(...pos.filter((_, i) => i % 3 === k)));
      const pv = push(pos, 34962), nv = push(new Float32Array(m.normals), 34962), iv = push(new Uint32Array(m.triangles), 34963);
      acc.push({ bufferView: pv, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: lo, max: hi }, { bufferView: nv, componentType: 5126, count: pos.length / 3, type: 'VEC3' }, { bufferView: iv, componentType: 5125, count: m.triangles.length, type: 'SCALAR' });
      const a0 = acc.length - 3; ms.push({ name: path.slice(1), primitives: [{ attributes: { POSITION: a0, NORMAL: a0 + 1 }, indices: a0 + 2 }] }); nodes.push({ name: path.slice(1), mesh: ms.length - 1 }); });
    const bin = new Uint8Array(off); let p = 0; for (const c of chunks) { bin.set(c, p); p += c.length; }
    const b64 = typeof Buffer !== 'undefined' ? Buffer.from(bin).toString('base64') : btoa(Array.from(bin, (c) => String.fromCharCode(c)).join(''));
    files[`${base}.gltf`] = new TextEncoder().encode(JSON.stringify({ asset: { version: '2.0', generator: 'Nexus (brep.ts, OpenCascade tessellation)' }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: ms, accessors: acc, bufferViews: views, buffers: [{ byteLength: off, uri: `data:application/octet-stream;base64,${b64}` }] })); }
  if (want.has('bom')) { const q = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`; files[`${base}-bom.csv`] = new TextEncoder().encode(['path,shape,made,volume_cm3,kg_solid,kg_ours,why', ...s.rows.map((x) => [q(x.path.slice(1)), x.shape, x.ok ? (x.valid ? 'yes' : 'not valid') : 'no', x.volume !== undefined ? (x.volume * 1e6).toFixed(4) : '', x.kg?.toFixed(5) ?? '', x.ourKg.toFixed(5), q(x.why ?? '')].join(','))].join('\n')); }
  for (const x of mm) x.mmSolid.delete?.(); for (const x of s.solids) x.solid.delete?.();
  return { files, solids: s };
}
/** A STEP file read back by the kernel: how many solids, their volume (m³). */
export async function readStep(bytes: Uint8Array): Promise<{ solids: number; volume: number }> {
  const r = await kernel(), sh = await r.importSTEP(new Blob([bytes as BlobPart])) as Solid, oc = (r as unknown as { getOC: () => any }).getOC();
  const ex = new oc.TopExp_Explorer(sh.wrapped, oc.TopAbs_ShapeEnum.TopAbs_SOLID, oc.TopAbs_ShapeEnum.TopAbs_SHAPE); let n = 0, v = 0;
  for (; ex.More(); ex.Next()) { n++; const sol = new r.Solid(ex.Current()); v += Math.abs(r.measureVolume(sol)); }
  ex.delete(); return { solids: n, volume: v / 1e9 };
}
register({ version: 1, by: 'built in', pure: true, id: 'export.files', name: 'Export (STEP, STL, 3MF, glTF, BOM)', kind: 'bridge', ability: 'transform', domains: ['mechanical', 'manufacturing', 'vehicles'],
  spec: { gloss: 'What are its files, for any CAD program, slicer or viewer, and does its STEP read back as it went out?', discipline: 'mechanical.design', role: 'data source', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010371.10010396', label: 'Computing methodologies: shape modeling' }],
    model: { equations: ['the STEP read back by the kernel: its solids counted and their volume against what was written'], class: 'data', time: 'steady', linear: true, method: 'Exact solids made, written by OpenCascade (STEP AP242 through XDE, names and colours), meshed by its tessellator for STL, 3MF and glTF', references: ['ISO 10303-242 (STEP AP242)', '3MF Consortium, 3MF Core Specification 1.3', 'Khronos glTF 2.0'] } },
  says: 'A thing written as files: STEP (each solid named by its place in the thing\'s tree, coloured, millimetres), STL, 3MF and glTF (the kernel\'s own meshes of the exact solids), and its bill of materials as CSV; the STEP read back by the kernel and its solids counted and measured against what was written. What could not be made a solid is not in them, and is said',
  settings: [{ key: 'formats', label: 'Formats (a space between: step stl 3mf gltf bom)', type: 'text', default: 'step stl 3mf gltf bom' }],
  ports: { inputs: [P('thing', 'part')], outputs: [P('files', 'record', { label: 'each file by its name, as a Blob' }), P('list', 'table'), P('readBack', 'record', { label: 'the STEP read back: solids, volume' }), P('says', 'text')] },
  run: async (i, c) => { const t = i.thing as Part; if (!t || typeof t.name !== 'string') throw new Error('wire a thing in');
    const { files, solids } = await filesOf(t, { formats: String(c.set.formats ?? '').split(/\s+/).filter(Boolean) }), step = Object.entries(files).find(([k]) => k.endsWith('.step'));
    const back = step ? await readStep(step[1]) : undefined, same = back ? back.solids === solids.made && Math.abs(back.volume / solids.volume - 1) < 1e-3 : undefined;
    // (each file a Blob: a page saves it as it is, and a board's inspector shows its size, not its bytes)
    return { files: Object.fromEntries(Object.entries(files).map(([k, b]) => [k, new Blob([b as BlobPart])])), list: Object.entries(files).map(([name, b]) => ({ file: name, kB: +(b.length / 1024).toFixed(1) })), readBack: back ?? {}, says: `${Object.keys(files).length} files of ${solids.made} solids${solids.failed ? ` (${solids.failed} pieces not solids, left out: see Exact solids)` : ''}${back ? `; the STEP read back: ${back.solids} solids, ${(back.volume * 1e6).toPrecision(5)} cm³ against ${(solids.volume * 1e6).toPrecision(5)} written: ${same ? 'the same' : 'NOT the same'}` : ''}` }; },
  tests: [{ inputs: { thing: { name: 'bar', shape: { box: [0.1, 0.02, 0.02] }, at: [0, 0, 0], mat: 'steel-low' } }, set: { formats: 'step' }, outputs: { readBack: { solids: 1, volume: 0.00004 } } }] } as BlockDef);

// ---- independent verification: what runs into what, by exact booleans against the rules' triangles -----------------
/** Each pair the rules try for interference, judged twice: by the rules' triangle test (rules.ts, the meshes as drawn)
 *  and by the kernel's boolean (the volume the two exact solids share). Where they agree, and every pair where they do
 *  not, with the shared volume: an engine other than the one that drew it, set beside the checker. */
export async function interferenceCrossCheck(thing: Part, o: { least?: number } = {}): Promise<{ pairs: number; both: number; neither: number; meshOnly: { a: string; b: string; mm3: number }[]; exactOnly: { a: string; b: string; mm3: number }[]; unmade: number }> {
  const least = o.least ?? 1e-9, pairs = interferencePairs(trianglesOf(thing)), s = await solidsOf(thing, { keep: true, only: new Set(pairs.flatMap((q) => [q.pa, q.pb])) }), by = new Map(s.solids.map((x) => [x.ix, x.solid]));
  let both = 0, neither = 0, unmade = 0; const meshOnly: { a: string; b: string; mm3: number }[] = [], exactOnly: typeof meshOnly = [];
  for (const q of pairs) { const A = by.get(q.pa), B = by.get(q.pb); if (!A || !B) { unmade++; continue; }
    // (copies: a boolean consumes what it is given, and each solid is in more than one pair)
    let v = 0; try { const c = A.clone().intersect(B.clone()); v = Math.abs(measureVolumeSafe(c)); c.delete?.(); } catch { unmade++; continue; }
    const exact = v > least, row = { a: q.a, b: q.b, mm3: +(v * 1e9).toPrecision(3) };
    if (exact && q.through) both++; else if (!exact && !q.through) neither++; else if (q.through) meshOnly.push(row); else exactOnly.push(row); }
  for (const x of s.solids) x.solid.delete?.();
  return { pairs: pairs.length, both, neither, meshOnly, exactOnly, unmade };
}
const measureVolumeSafe = (x: Solid): number => { try { return R!.measureVolume(x); } catch { return 0; } };
register({ version: 1, by: 'built in', pure: true, id: 'verify.interference', name: 'Interference two ways (exact booleans, the rules)', kind: 'critic', ability: 'check', domains: ['mechanical', 'manufacturing', 'vehicles'],
  spec: { gloss: 'Do the rules\' triangle test and a CAD kernel\'s booleans agree on what runs into what?', discipline: 'mechanical.design', role: 'assessment', codes: [{ scheme: 'ACM CCS 2012', code: '10010147.10010371.10010396', label: 'Computing methodologies: shape modeling' }],
    model: { equations: ['a pair clashes by the kernel where its two exact solids share more than 1 mm³'], class: 'analytical', time: 'steady', linear: true, method: 'each pair the rules try (rules.ts, its excuses applied: fitted through, fastened, joined), judged by the triangle test and by OpenCascade\'s boolean common', references: ['Möller, A fast triangle-triangle intersection test, J. Graphics Tools 2, 25 (1997)', 'OpenCascade Technology 7.x, Boolean Operations user guide'] } },
  says: 'Every pair of pieces the rules try for interference, judged twice: by the rules\' triangle test on the meshes, and by the volume the two exact solids share (OpenCascade\'s boolean). Where both say clash, where both say clear, and every pair where they disagree, with the volume shared: a piece wholly inside another crosses no surface, so the triangles miss it and the kernel does not',
  ports: { inputs: [P('thing', 'part')], outputs: [P('rows', 'table', { label: 'every disagreement' }), P('agree', 'integer'), P('disagree', 'integer'), P('says', 'text')] },
  run: async (i) => { const t = i.thing as Part; if (!t || typeof t.name !== 'string') throw new Error('wire a thing in'); const x = await interferenceCrossCheck(t);
    const rows = [...x.exactOnly.map((r) => ({ ...r, triangles: 'clear', kernel: `shares ${r.mm3} mm³` })), ...x.meshOnly.map((r) => ({ ...r, triangles: 'clash', kernel: `shares ${r.mm3} mm³` }))].sort((a, b) => b.mm3 - a.mm3);
    return { rows, agree: x.both + x.neither, disagree: rows.length, says: `${x.pairs} pairs tried: both clash ${x.both}, both clear ${x.neither}; only the kernel finds ${x.exactOnly.length} (pieces inside others, which cross no surface), only the triangles ${x.meshOnly.length}; ${x.unmade} not judged (a piece not made a solid)` }; } } as BlockDef);

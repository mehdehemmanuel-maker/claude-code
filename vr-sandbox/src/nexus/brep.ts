// Exact solids: every part's shape made a boundary-representation solid by OpenCascade (the replicad build of
// OpenCascade.js, LGPL-2.1), placed where the part is, its holes cut by true booleans, its validity checked by the
// kernel's own analyser and its volume measured by it. What the meshes only draw, this makes: the compiler's stage 10
// (geometry is exact solids) and, after it, STEP. What cannot be made yet is counted and said, never drawn as a mesh and
// called a solid. The road map's item 6.
import type { Part, Shape, V3 } from './kits';
import { sectionPoint, tubeLegs } from './form';
import { massOf, densityKg } from './mass';
import { register, type BlockDef, type PortDef, type Type } from './blocks';

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

export interface SolidRow { path: string; name: string; shape: string; ok: boolean; why?: string; valid?: boolean; volume?: number; kg?: number; ourKg: number; diff?: number; fill?: number; shell?: boolean; cuts: number }
export interface Solids { rows: SolidRow[]; made: number; failed: number; invalid: number; volume: number; kg: number; ourKg: number; byWhy: Record<string, number>; solids: { path: string; solid: Solid }[] }

/** Every piece of a thing as an exact solid, placed (each part's at and rot, three's XYZ order), its holes cut: what was
 *  made, what was not and why, each one's volume by the kernel times its density against our own mass of it. A hollow
 *  part (a shell) is not made yet: said, and counted. */
export async function solidsOf(thing: Part, o: { keep?: boolean } = {}): Promise<Solids> {
  const r = await kernel(), rows: SolidRow[] = [], solids: { path: string; solid: Solid }[] = [];
  const walk = (p: Part, path: string, place: (s: Solid) => Solid) => {
    const here = (s: Solid) => { let x = s; if (p.rot) { const [a, b, c] = p.rot; if (c) x = x.rotate(c * deg, [0, 0, 0], [0, 0, 1]); if (b) x = x.rotate(b * deg, [0, 0, 0], [0, 1, 0]); if (a) x = x.rotate(a * deg, [0, 0, 0], [1, 0, 0]); } if (p.at) x = x.translate(p.at); return place(x); };
    const me = `${path}/${p.name}`;
    if (p.shape && p.kg === undefined) {
      const own = massOf({ ...p, parts: undefined }), row: SolidRow = { path: me, name: p.name, shape: Object.keys(p.shape)[0]!, ok: false, ourKg: own, cuts: p.cuts?.length ?? 0, ...(p.fill !== undefined && p.fill !== 1 ? { fill: p.fill } : {}) };
      try {
        if (p.shell) { row.shell = true; throw new Error('a hollow part (its wall offset inward: not built yet)'); }
        let s = solidOfShape(r, p.shape, p.facets);
        if (p.base) { const h = 'cyl' in p.shape ? p.shape.cyl[1] : 'cone' in p.shape ? p.shape.cone[1] : 'capsule' in p.shape ? p.shape.capsule[1] : 'box' in p.shape ? p.shape.box[1] : 0; s = s.translate([0, h / 2, 0]); }
        for (const c of p.cuts ?? []) { const d = norm(c.dir), hole = c.n ? solidOfShape(r, { cyl: [c.r, c.depth] }, c.n).rotate(Math.acos(Math.max(-1, Math.min(1, d[1]))) * deg, [0, 0, 0], Math.hypot(d[2], d[0]) > 1e-9 ? [d[2], 0, -d[0]] : [1, 0, 0]).translate(add(c.at, mul(d, c.depth / 2))) : r.makeCylinder(c.r, c.depth, c.at, d); s = s.cut(hole); hole.delete?.(); }
        const v = Math.abs(r.measureVolume(s)), rho = p.mat ? densityKg(p.mat) : undefined;
        Object.assign(row, { ok: true, valid: valid(s), volume: v, ...(rho ? { kg: v * rho * (p.fill ?? 1), diff: own > 0 ? (v * rho * (p.fill ?? 1)) / own - 1 : undefined } : {}) });
        // (each solid freed once measured, unless kept: the kernel's memory is its own, not the garbage collector's)
        if (o.keep) solids.push({ path: me, solid: here(s) }); else s.delete?.();
      } catch (e) { row.why = e instanceof Error && e.message ? e.message : `the kernel could not make this ${row.shape}${'tube' in p.shape ? ' (a sweep along its run)' : ''}`; }
      rows.push(row);
    }
    for (const q of p.parts ?? []) walk(q, me, here);
  };
  walk(thing, '', (s) => s);
  const made = rows.filter((x) => x.ok), byWhy: Record<string, number> = {};
  for (const x of rows) if (!x.ok) { const k = (x.why ?? '').replace(/\d[\d.]*/g, '#').slice(0, 80); byWhy[k] = (byWhy[k] ?? 0) + 1; }
  return { rows, made: made.length, failed: rows.length - made.length, invalid: made.filter((x) => !x.valid).length, volume: made.reduce((a, x) => a + (x.volume ?? 0), 0), kg: made.reduce((a, x) => a + (x.kg ?? 0), 0), ourKg: made.reduce((a, x) => a + x.ourKg, 0), byWhy, solids };
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

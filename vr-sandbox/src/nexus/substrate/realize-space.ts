// A generated structure given a body in space (docs/NEXUS-FROM-REALITY.md, section 27). The generator says what an
// intent needs: regions, and elements between and inside them, each with the values it derived. Here each of those is
// given a shape, a size and a place, so that it can be seen, walked around and built: whatever the intent was. Nothing
// here knows what is being made. The rules read only what the generator said:
//
// - an intent's region is a volume; its size is the size it states, else a share of the largest one stated. A region
//   of the site that touches most of the others is the medium they are all in, and is shown as the space around them;
//   the site's other regions stand around the edge, the person's in the middle, placed by what they touch;
// - a region the generator makes inside another (where matter is deposited, where it flows, where it is used) sits in
//   that region;
// - a conversion that drives along an axis is a rail along that axis, as long as the travel it derived; any other
//   conversion is a device in its region, sized by the power it handles;
// - a path runs through the regions it names, in order, as wide as its carrier's flux makes it;
// - a boundary is a plate between its two sides, as large as the area it derived; heat shed from an element is fins on
//   it; a guard is a shell around what it guards;
// - an observer is a sensor on what it observes; a modulation a valve on what it modulates; a store a vessel;
// - a gap is a marker at the element it stopped, or at the region its want is about.
//
// Every thing keeps the order the generator made it in, the want it serves and what required it, so a viewer can
// show it being generated, and why. Sizes are true where the generator derived them; the whole is then scaled to fit
// where it is shown, and the scale is returned.

import type { Element, Gap, Structure } from './manifold';
import type { Intent } from '../ask/want';
import { toSI } from '../../ganglia/units';
import { dimOf } from './dimension';

export type Shape = 'volume' | 'medium' | 'reservoir' | 'rail' | 'device' | 'tube' | 'plate' | 'fins' | 'shell' | 'sensor' | 'valve' | 'vessel' | 'pad' | 'marker';
export interface Thing {
  id: string;
  /** What the generator made it as: a region, an element's kind, or a gap. */
  kind: string;
  carrier: string | null;
  says: string;
  values: { name: string; value: number; unit: string }[];
  shape: Shape;
  /** Its centre and its size along x, y (up) and z, metres in the model. */
  at: [number, number, number];
  size: [number, number, number];
  /** A rail's axis; a tube's points. */
  axis?: 'x' | 'y' | 'z';
  points?: [number, number, number][];
  /** The order it was generated in, the want it serves, what required it. */
  order: number;
  want: string | null;
  parent: string | null;
  rule: string;
  gap?: { kind: string; lacks: string };
}
export interface Space { name: string; things: Thing[]; wants: { id: string; says: string }[]; scale: number; radius: number }

type V3 = [number, number, number];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mid = (a: V3, b: V3): V3 => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
const dimIs = (unit: string, of: string) => { try { return dimOf(unit).join() === dimOf(of).join(); } catch { return false; } };
const si = (v: { value: number; unit: string }) => { try { return toSI(v.value, v.unit); } catch { return v.value; } };

/** The first value of an element in a dimension, in SI. */
const valueIn = (e: Element, of: string, name?: RegExp) => { const v = e.values.find((x) => dimIs(x.unit, of) && (!name || name.test(x.name))); return v ? si(v) : null; };

/** Lay out points in the plane by springs on what touches what, from a fixed start: the same input, the same place. */
function springs(n: number, edges: [number, number, number][], fixed: (i: number) => V3 | null): V3[] {
  const p: V3[] = Array.from({ length: n }, (_, i) => fixed(i) ?? [Math.cos(i * 2.39996) * 0.5, 0, Math.sin(i * 2.39996) * 0.5]);
  for (let it = 0; it < 500; it++) {
    const f = p.map(() => [0, 0, 0] as V3);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const dx = p[i]![0] - p[j]![0], dz = p[i]![2] - p[j]![2], r2 = dx * dx + dz * dz + 1e-4;
      f[i]![0] += (0.02 * dx) / r2; f[i]![2] += (0.02 * dz) / r2; f[j]![0] -= (0.02 * dx) / r2; f[j]![2] -= (0.02 * dz) / r2;
    }
    for (const [a, b, rest] of edges) {
      const dx = p[b]![0] - p[a]![0], dz = p[b]![2] - p[a]![2], r = Math.hypot(dx, dz) + 1e-9, k = 0.1 * (r - rest) / r;
      f[a]![0] += k * dx; f[a]![2] += k * dz; f[b]![0] -= k * dx; f[b]![2] -= k * dz;
    }
    for (let i = 0; i < n; i++) if (!fixed(i)) { p[i]![0] += Math.max(-0.05, Math.min(0.05, f[i]![0])); p[i]![2] += Math.max(-0.05, Math.min(0.05, f[i]![2])); }
  }
  return p;
}

export function realize(intent: Intent, s: Structure, fit = 0.7): Space {
  const things: Thing[] = [];
  const pos = new Map<string, V3>(), half = new Map<string, number>();
  let order = 0;

  // ---- the intent's regions -------------------------------------------------------------------------------------------
  const regs = intent.regions;
  const sizeOf = (r: (typeof regs)[number]) => {
    const ls = Object.values(r.quantities).filter((l) => l.value !== null && dimIs(l.unit, 'm')).map((l) => Math.abs(toSI(l.value!, l.unit)));
    const area = Object.values(r.quantities).filter((l) => l.value !== null && dimIs(l.unit, 'm^2')).map((l) => Math.sqrt(Math.abs(toSI(l.value!, l.unit))));
    const all = [...ls, ...area];
    return all.length ? Math.max(...all) : null;
  };
  // sizes as stated, shown true within a decade of the middle one and compressed beyond, so a region a million times
  // larger or smaller than the rest stays in view; its label keeps its true size
  const stated = regs.map(sizeOf).filter((x): x is number => x !== null && x > 0).sort((a, b) => a - b);
  const ref = stated.length ? stated[Math.floor(stated.length / 2)]! : 0.3;
  const shown = (x: number) => { const r = x / ref; return ref * (r > 10 ? 10 * (r / 10) ** 0.15 : r < 0.1 ? 0.1 * (r / 0.1) ** 0.15 : r); };
  const largest = Math.max(ref, ...stated.map(shown));
  const medium = regs.find((r) => r.environment && r.adjoins.length >= Math.max(2, regs.length / 2));
  const placed = regs.filter((r) => r !== medium);
  const index = new Map(placed.map((r, i) => [r.id, i]));
  const sizeFor = (r: (typeof regs)[number]) => { const x = sizeOf(r); return Math.max(largest * 0.15, x === null ? largest * (r.environment ? 0.35 : 0.5) : shown(x)); };
  const edges: [number, number, number][] = [];
  for (const r of placed) for (const o of r.adjoins) {
    const j = index.get(o);
    if (j !== undefined && j > index.get(r.id)!) edges.push([index.get(r.id)!, j, (sizeFor(r) + sizeFor(placed[j]!)) * 0.75 + largest * 0.25]);
  }
  // regions that touch only through the medium still belong near one another: a weak spring to the centre's region
  const core = placed.findIndex((r) => !r.environment);
  placed.forEach((r, i) => { if (i !== core && core >= 0 && !edges.some(([a, b]) => a === i || b === i)) edges.push([core, i, largest * 1.4]); });
  const p = springs(placed.length, edges, (i) => (i === core ? [0, 0, 0] : null));
  placed.forEach((r, i) => {
    const h = sizeFor(r) / 2, at: V3 = [p[i]![0], h, p[i]![2]];
    pos.set(r.id, at); half.set(r.id, h);
    things.push({ id: r.id, kind: 'region', carrier: null, says: r.id, values: Object.values(r.quantities).filter((l) => l.value !== null).map((l) => ({ name: l.name, value: l.value!, unit: l.unit })), shape: r.environment ? 'reservoir' : 'volume', at, size: [h * 2, h * 2, h * 2], order: order++, want: null, parent: null, rule: r.environment ? 'a region of the site the intent is in' : 'a region the intent is about' });
  });
  const extentOf = () => { let m = 0; for (const [id, a] of pos) m = Math.max(m, Math.hypot(a[0], a[2]) + (half.get(id) ?? 0)); return m; };
  if (medium) {
    const R = extentOf() * 1.15;
    pos.set(medium.id, [0, R * 0.25, 0]); half.set(medium.id, R);
    things.push({ id: medium.id, kind: 'region', carrier: null, says: `${medium.id}, the medium everything here is in`, values: Object.values(medium.quantities).filter((l) => l.value !== null).map((l) => ({ name: l.name, value: l.value!, unit: l.unit })), shape: 'medium', at: [0, 0, 0], size: [R * 2, R * 0.5, R * 2], order: order++, want: null, parent: null, rule: 'a region of the site that touches most of the others: the medium' });
  }

  // ---- what the generator made, in the order it made it ----------------------------------------------------------
  const regionOfElement = (e: Element): string | null => e.regions.find((r) => pos.has(r) && r !== medium?.id) ?? e.regions.find((r) => pos.has(r)) ?? null;
  const seat = (e: Element): V3 => {
    // an element sits where its first region is, or where what required it is
    const r = regionOfElement(e);
    if (r) return pos.get(r)!;
    if (e.why.parent && pos.has(e.why.parent)) return pos.get(e.why.parent)!;
    return [0, largest * 0.5, 0];
  };
  const kids = new Map<string, number>();
  const offset = (key: string, radius: number): V3 => {
    const k = kids.get(key) ?? 0; kids.set(key, k + 1);
    const a = k * 2.39996, r = radius * (0.35 + 0.12 * (k % 4));
    return [Math.cos(a) * r, radius * (0.15 + 0.1 * (k % 3)), Math.sin(a) * r];
  };
  const unit = largest * 0.08;
  for (const e of s.elements) {
    const base = seat(e), r = regionOfElement(e), h = r ? half.get(r) ?? unit : unit;
    const vals = e.values.map((v) => ({ name: v.name, value: v.value, unit: v.unit }));
    const common = { id: e.id, kind: e.kind, carrier: e.carrier, says: e.says, values: vals, order: order++, want: e.why.want, parent: e.why.parent, rule: e.why.rule };
    const axisOf = e.id.match(/:(x|y|z)$/)?.[1] as 'x' | 'y' | 'z' | undefined;
    let t: Thing;
    if (e.kind === 'region') {
      // a region made inside another: where it is deposited, used, flows
      const size = Math.max(unit, (valueIn(e, 'm', /travel|span|extent/) ?? h * 1.2));
      const at = add(base, [0, 0, 0]);
      t = { ...common, shape: 'volume', at, size: [size, size, size] };
      pos.set(e.id, at); half.set(e.id, size / 2);
    } else if (e.kind === 'conversion' && axisOf) {
      const travel = valueIn(e, 'm', /travel/) ?? h * 2;
      const c = pos.get(e.why.parent ?? '') ?? base, hh = half.get(e.why.parent ?? '') ?? h;
      const at: V3 = axisOf === 'x' ? add(c, [0, hh + unit, -hh - unit]) : axisOf === 'y' ? add(c, [hh + unit, 0, -hh - unit]) : add(c, [-hh - unit, hh + unit, 0]);
      const len = travel + unit;
      t = { ...common, shape: 'rail', axis: axisOf, at, size: axisOf === 'x' ? [len, unit * 0.5, unit * 0.5] : axisOf === 'y' ? [unit * 0.5, len, unit * 0.5] : [unit * 0.5, unit * 0.5, len] };
      pos.set(e.id, at); half.set(e.id, unit);
    } else if (e.kind === 'conversion') {
      const P = valueIn(e, 'W');
      const size = Math.max(unit * 0.6, Math.min(unit * 3, unit * (P ? (P / 50) ** (1 / 3) : 1)));
      const at = add(base, offset(r ?? e.id, h));
      t = { ...common, shape: 'device', at, size: [size, size, size] };
      pos.set(e.id, at); half.set(e.id, size / 2);
    } else if (e.kind === 'path') {
      const pts = e.regions.map((x) => pos.get(x)).filter((x): x is V3 => !!x);
      const lane = (kids.get(`lane:${e.carrier}`) ?? 0); kids.set(`lane:${e.carrier}`, lane + 1);
      const lift = unit * (0.3 + 0.25 * (lane % 4));
      const route = (pts.length >= 2 ? pts : [base, add(base, [0, h, 0])]).map((q) => add(q, [0, lift, 0]));
      t = { ...common, shape: 'tube', at: route[Math.floor(route.length / 2)]!, size: [unit * 0.18, unit * 0.18, unit * 0.18], points: route };
      pos.set(e.id, mid(route[0]!, route[route.length - 1]!));
    } else if (e.kind === 'boundary') {
      const a = pos.get(e.regions[0] ?? ''), b = pos.get(e.regions[1] ?? '');
      const area = valueIn(e, 'm^2');
      if (e.id.startsWith('shed:') && a) t = { ...common, shape: 'fins', at: add(a, [0, (half.get(e.regions[0]!) ?? unit) + unit * 0.3, 0]), size: [unit * 0.8, unit * 0.4, unit * 0.8] };
      else if (e.id.startsWith('guard:') && a) { const g = (half.get(e.regions[0]!) ?? unit) * 2.6; t = { ...common, shape: 'shell', at: a, size: [g, g, g] }; }
      else {
        const side = area ? Math.max(unit, Math.min(largest, Math.sqrt(area))) : unit * 2;
        const at = a && b ? mid(a, b) : a ?? base;
        t = { ...common, shape: 'plate', at: add(at, offset(`plate:${e.regions.join('|')}`, unit * 0.5)), size: [side, side, unit * 0.12] };
      }
    } else if (e.kind === 'observer') {
      const on = pos.get(e.why.parent ?? '') ?? base;
      t = { ...common, shape: 'sensor', at: add(on, offset(`obs:${e.why.parent}`, unit * 1.5)), size: [unit * 0.45, unit * 0.45, unit * 0.45] };
    } else if (e.kind === 'modulation') {
      const on = pos.get(e.why.parent ?? '') ?? base;
      t = { ...common, shape: 'valve', at: add(on, offset(`mod:${e.why.parent}`, unit * 1.2)), size: [unit * 0.7, unit * 0.7, unit * 0.2] };
    } else if (e.kind === 'store') {
      t = { ...common, shape: 'vessel', at: add(base, offset(r ?? e.id, h)), size: [unit * 0.9, unit * 1.3, unit * 0.9] };
    } else {
      t = { ...common, shape: 'pad', at: add(base, offset(r ?? e.id, h)), size: [unit, unit * 0.15, unit] };
    }
    things.push(t);
    if (!pos.has(e.id)) pos.set(e.id, t.at);
  }
  // ---- the gaps, where they stopped what was being generated ---------------------------------------------------------
  s.gaps.forEach((g: Gap, i) => {
    const want = intent.wants.find((w) => w.id === g.want);
    const at0 = (g.element ? pos.get(g.element) : undefined) ?? (want ? pos.get(want.region) : undefined) ?? [0, largest, 0];
    const at = add(at0, [Math.cos(i * 1.7) * unit, unit * (1.2 + (i % 3) * 0.4), Math.sin(i * 1.7) * unit]);
    things.push({ id: `gap ${i + 1}`, kind: 'gap', carrier: g.carrier, says: g.lacks, values: [], shape: 'marker', at, size: [unit * 0.5, unit * 0.5, unit * 0.5], order: order++, want: g.want, parent: g.element, rule: g.distinction ?? 'a gap', gap: { kind: g.kind ?? 'open', lacks: g.lacks } });
  });
  // ---- fit it where it is shown ----------------------------------------------------------------------------------
  let far = 0;
  for (const t of things) if (t.shape !== 'medium') far = Math.max(far, Math.hypot(t.at[0], t.at[2]) + Math.max(t.size[0], t.size[2]) / 2);
  const scale = fit / Math.max(far, 1e-9);
  const sc = (v: V3): V3 => [v[0] * scale, v[1] * scale, v[2] * scale];
  for (const t of things) { t.at = sc(t.at); t.size = sc(t.size); if (t.points) t.points = t.points.map(sc); }
  return { name: intent.name, things, wants: intent.wants.map((w) => ({ id: w.id, says: w.says })), scale, radius: fit };
}

/** Why a thing is there, as the generator recorded it, walked up through what required it. */
export function whyOf(space: Space, id: string): string[] {
  const by = new Map(space.things.map((t) => [t.id, t]));
  const out: string[] = [];
  for (let t = by.get(id), n = 0; t && n < 8; t = t.parent ? by.get(t.parent) : undefined, n++) {
    out.push(`${t.says}${t.rule ? `  ← ${t.rule}` : ''}`);
    if (!t.parent) { const w = space.wants.find((x) => x.id === t!.want); if (w) out.push(`because you said: “${w.says}”`); }
  }
  return out;
}

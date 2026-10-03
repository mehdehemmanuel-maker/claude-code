// Nex Space (docs/NEX-SPACE.md): the continuous part of Nex, where it exists. A law of the book is a generative
// object: it does not store its answers, it computes them when asked, over its inputs, inside the domain it declares.
// So between two structures that differ in one quantity of one law there is a continuum, defined by the law and
// bounded by its domain, which is materialised only at the points a question touches (lazy), and whose edge can be
// found to any precision by stepping finer where the law stops (adaptive). Between two structures that share no
// such coordinate there is nothing: interpolation is refused, not fabricated. And given samples alone, whether a
// relation is one continuum or several regimes is decided by evidence (description length), not declared.
//
// What is continuous here is exactly what a law makes continuous; distinctions, kinds, parts and arrows stay
// discrete. Nothing below is a manifold for its own sake: each function answers a question the discrete form could
// not answer cleanly, and the tests measure it.

import type { Law } from '../types';
import { withConstants } from '../laws';
import { dimensionOf, sameDim } from '../units';
import { d, q, r, type R, type Structure, type Mode } from './core';

// ---- a one-parameter family: a trajectory through Nex Space along one input of a law

export interface Family {
  law: Law;
  /** The input that varies. */
  sym: string;
  /** The other inputs, held. */
  held: Record<string, number>;
  /** The structure at one point: materialised only when asked. */
  at(x: number): R;
  /** The law's own output there, or NaN outside its domain. */
  value(x: number): number;
  /** Whether the law holds there, and if not why. */
  admissible(x: number): { ok: true } | { ok: false; why: string };
  /** The edge of the domain between an admissible point and an inadmissible one, to within `eps` of the input, with how many evaluations it took. */
  edge(inside: number, outside: number, eps?: number): { at: number; evaluations: number; why: string } | null;
  /** The relative sensitivity of the output to the input there (d ln y / d ln x). */
  sensitivity(x: number): number;
}

/** The family of structures a law generates along one input, the others held. */
export function family(law: Law, sym: string, held: Record<string, number>): Family {
  const input = law.inputs.find((i) => i.sym === sym);
  if (!input) throw new Error(`${law.id} has no input ${sym}`);
  const bound = (x: number) => ({ ...held, [sym]: x });
  const admissible = (x: number): { ok: true } | { ok: false; why: string } => {
    if (!Number.isFinite(x)) return { ok: false, why: 'not a number' };
    const why = law.outside?.(bound(x));
    if (why) return { ok: false, why };
    let y: number;
    try { y = law.eval(withConstants(law, bound(x))); } catch (e) { return { ok: false, why: (e as Error).message }; }
    return Number.isFinite(y) ? { ok: true } : { ok: false, why: 'the law gives no finite value there' };
  };
  const value = (x: number): number => (admissible(x).ok ? law.eval(withConstants(law, bound(x))) : NaN);
  return {
    law, sym, held,
    at: (x) => {
      const a = admissible(x);
      const mode: Mode = a.ok ? 'true' : 'outside-domain';
      const inputs = law.inputs.map((i) => r('quantity', [d(i.sym, { en: i.name }), q(bound(x)[i.sym] ?? NaN, i.unit)], {}));
      const out = r('quantity', [d(law.output.sym, { en: law.output.name }), q(a.ok ? law.eval(withConstants(law, bound(x))) : NaN, law.output.unit)], {});
      return r('function', [d(law.id, { en: law.name, formula: law.formula }), r('state', inputs, {}), out], { dir: 1, mech: law.id, mode, ...(a.ok ? {} : { under: [a.why] }), dom: [d(`valid:${law.id}`, { en: law.valid })] });
    },
    value,
    admissible,
    edge: (inside, outside, eps = 1e-6) => {
      if (!admissible(inside).ok || admissible(outside).ok) return null;
      let lo = inside, hi = outside, n = 2, why = (admissible(outside) as { why: string }).why;
      // bisection: the step halves where the law stops, and nowhere else
      while (Math.abs(hi - lo) > eps * Math.max(1, Math.abs(lo), Math.abs(hi))) {
        const mid = (lo + hi) / 2;
        const a = admissible(mid); n++;
        if (a.ok) lo = mid; else { hi = mid; why = a.why; }
        if (n > 200) break;
      }
      return { at: lo, evaluations: n, why };
    },
    sensitivity: (x) => { const y0 = value(x), y1 = value(x * 1.001); return Number.isFinite(y0) && Number.isFinite(y1) && y0 !== 0 ? Math.log(y1 / y0) / Math.log(1.001) : NaN; },
  };
}

// ---- interpolation is admitted only along a shared coordinate

export type Between =
  | { ok: true; law: Law; sym: string; family: Family; from: number; to: number }
  | { ok: false; mode: Mode; why: string };

/**
 * Whether two structures lie on one continuum: both must be the same law's structure with the same held inputs and
 * one input differing (then the family between them is the law's), or two quantities of one dimension (then the
 * number line is the coordinate and the law is none). Two quantities of different dimensions, or two things with no
 * law between them, admit no interpolation: the space between them is not defined, and nothing is made up.
 */
export function between(a: Structure, b: Structure, laws: Map<string, Law>): Between {
  if (a.k === 'Q' && b.k === 'Q') return sameDim(a.dim, b.dim) ? { ok: false, mode: 'unknown', why: 'two numbers of one dimension lie on a line, but no law makes the line a family: say which law' } : { ok: false, mode: 'undefined', why: 'the two quantities have different dimensions: there is no space between them' };
  if (a.k === 'R' && b.k === 'R' && a.op === 'function' && b.op === 'function' && a.c.mech && a.c.mech === b.c.mech) {
    const law = laws.get(a.c.mech);
    if (!law) return { ok: false, mode: 'unmodelled', why: `no law ${a.c.mech} stands behind the structures` };
    const read = (s: R): Record<string, number> => { const st = s.args[1]; const out: Record<string, number> = {}; if (st?.k === 'R') for (const x of st.args) if (x.k === 'R' && x.args[0]?.k === 'D' && x.args[1]?.k === 'Q') out[x.args[0].id] = x.args[1].v; return out; };
    const va = read(a), vb = read(b);
    const differing = law.inputs.filter((i) => va[i.sym] !== vb[i.sym]).map((i) => i.sym);
    if (differing.length === 0) return { ok: false, mode: 'unknown', why: 'the two structures are one point' };
    if (differing.length > 1) return { ok: false, mode: 'unknown', why: `more than one input differs (${differing.join(', ')}): a path needs one coordinate at a time, or a declared curve` };
    const sym = differing[0]!;
    const held = { ...va }; delete held[sym];
    return { ok: true, law, sym, family: family(law, sym, held), from: va[sym]!, to: vb[sym]! };
  }
  if (a.k === 'D' && b.k === 'D') return { ok: false, mode: 'undefined', why: 'two distinctions share no coordinate: there is nothing between a motor and a bearing but what a law would say, and none is given' };
  return { ok: false, mode: 'undefined', why: 'the two structures are not of one kind' };
}

// ---- continuous or discrete, decided by evidence

export interface Sample { x: number; y: number; label?: string }
export interface Regime { from: number; to: number; exponent: number; scale: number; n: number }
export interface Verdict {
  /** One continuum, or several regimes with boundaries between them. */
  regimes: Regime[];
  /** The boundaries between regimes, in x. */
  boundaries: number[];
  /** The description length of the model chosen and of the one-regime model: the choice is the shorter. */
  length: { chosen: number; oneRegime: number };
  /** Whether the labels, if given, are explained by the continuum (one law of x) rather than by anything else. */
  labelsAreOneContinuum: boolean | null;
}

const fitPower = (pts: Sample[]): { exponent: number; scale: number; rss: number } => {
  const lx = pts.map((p) => Math.log(p.x)), ly = pts.map((p) => Math.log(p.y));
  const n = pts.length, mx = lx.reduce((a, b) => a + b, 0) / n, my = ly.reduce((a, b) => a + b, 0) / n;
  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sxx += (lx[i]! - mx) ** 2; sxy += (lx[i]! - mx) * (ly[i]! - my); }
  const exponent = sxx > 0 ? sxy / sxx : 0, scale = Math.exp(my - exponent * mx);
  let rss = 0;
  for (let i = 0; i < n; i++) rss += (ly[i]! - (Math.log(scale) + exponent * lx[i]!)) ** 2;
  return { exponent, scale, rss };
};

/**
 * Given samples of y against x (positive, as a law's quantities are), whether they are one power law or several
 * regimes, by description length: a regime costs its two parameters; the data costs its residual under the model
 * (Gaussian, in bits); a boundary is kept only when the bits it saves on the residual exceed what it costs. Labels,
 * when given, are then checked: if one continuum explains the data and the labels are intervals of x, the categories
 * are a human cut on a continuum, not distinctions of the thing.
 */
export function regimes(samples: Sample[], opts: { minPer?: number } = {}): Verdict {
  const pts = [...samples].filter((p) => p.x > 0 && p.y > 0).sort((a, b) => a.x - b.x);
  const minPer = opts.minPer ?? 4, n = pts.length;
  // the description length of a model with k parameters and residual rss over n points, the noise estimated from
  // the residual itself (n ln(rss/n) + k ln n, in bits): a boundary pays only when it cuts the residual by more than
  // its own two parameters and the cut cost; noise alone never pays for a boundary
  const bits = (rss: number, k: number) => (n * Math.log(Math.max(rss, 1e-300) / n) + k * Math.log(n)) / Math.LN2;
  const one = fitPower(pts);
  const oneBits = bits(one.rss, 2);
  let best: { bits: number; splits: number[] } = { bits: oneBits, splits: [] };
  // one boundary: the split that pays best; then a second if it pays again
  const tryWith = (splits: number[]): number => {
    let rss = 0;
    const edges = [0, ...splits, pts.length];
    for (let k = 0; k + 1 < edges.length; k++) { const seg = pts.slice(edges[k], edges[k + 1]); if (seg.length < minPer) return Infinity; rss += fitPower(seg).rss; }
    return bits(rss, 2 * (splits.length + 1) + splits.length);
  };
  for (let i = minPer; i <= pts.length - minPer; i++) { const b = tryWith([i]); if (b < best.bits) best = { bits: b, splits: [i] }; }
  if (best.splits.length) { const first = best.splits[0]!; for (let j = minPer; j <= pts.length - minPer; j++) { if (Math.abs(j - first) < minPer) continue; const sp = [first, j].sort((a, b) => a - b); const b = tryWith(sp); if (b < best.bits) best = { bits: b, splits: sp }; } }
  const edges = [0, ...best.splits, pts.length];
  const out: Regime[] = [];
  for (let k = 0; k + 1 < edges.length; k++) { const seg = pts.slice(edges[k], edges[k + 1]); const f = fitPower(seg); out.push({ from: seg[0]!.x, to: seg[seg.length - 1]!.x, exponent: f.exponent, scale: f.scale, n: seg.length }); }
  const boundaries = best.splits.map((i) => Math.sqrt(pts[i - 1]!.x * pts[i]!.x));
  let labelsAreOneContinuum: boolean | null = null;
  if (pts.some((p) => p.label !== undefined)) {
    // labels are intervals of x when no label's range overlaps another's
    const ranges = new Map<string, [number, number]>();
    for (const p of pts) { const l = p.label ?? ''; const have = ranges.get(l); ranges.set(l, have ? [Math.min(have[0], p.x), Math.max(have[1], p.x)] : [p.x, p.x]); }
    const rs = [...ranges.values()].sort((a, b) => a[0] - b[0]);
    const intervals = rs.every((cur, i) => i === 0 || cur[0] > rs[i - 1]![1]);
    labelsAreOneContinuum = intervals && out.length === 1;
  }
  return { regimes: out, boundaries, length: { chosen: best.bits, oneRegime: oneBits }, labelsAreOneContinuum };
}

/** The structure a verdict is: one law-shaped family in mode true, or a state of regimes with boundaries, each regime an approximate power law. */
export function verdictStructure(v: Verdict, what: string): Structure {
  const regime = (g: Regime) => r('approximate', [d(`${what}:${g.from.toPrecision(3)}..${g.to.toPrecision(3)}`), r('quantity', [d('exponent'), q(Math.round(g.exponent * 100) / 100, '')], {})], { ev: { how: 'estimated' }, dom: [d(`x:${g.from.toPrecision(3)}..${g.to.toPrecision(3)}`)] });
  if (v.regimes.length === 1) return regime(v.regimes[0]!);
  return r('state', v.regimes.map(regime), { mode: 'true', under: v.boundaries.map((b) => `boundary at ${b.toPrecision(3)}`) });
}

/** The dimension of a law's output and the units of its inputs, for a question that asks whether two laws share a coordinate. */
export const sharesCoordinate = (a: Law, b: Law): string[] => a.inputs.filter((x) => b.inputs.some((y) => { try { return sameDim(dimensionOf(x.unit), dimensionOf(y.unit)) && x.name.toLowerCase() === y.name.toLowerCase(); } catch { return false; } })).map((x) => x.sym);

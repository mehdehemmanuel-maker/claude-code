// Forms from words, and forms invented for a job. "A 40 mm sphere", "a 100 × 50 × 20 mm block rounded 5 mm with a
// 10 mm hole", "a hollow 60 mm cube with 2 mm walls filled with a gyroid lattice of 12 mm cells", "a NACA 2412 wing
// 300 mm long with a 100 mm chord": said in words, built in the form language. And a job instead of a shape: "invent
// a bracket that holds 500 N at 120 mm from the wall", "a beam spanning 400 mm that carries 2 kN in the middle": the
// shape is grown by its loads (topopt.ts), checked as the real part in its material, and thickened until it holds.
// Nothing here is a stored shape: every one is built from what was said.

import { findQuantities, sameDim, DIMS } from '../ganglia/units';
import { getMaterial, MATERIALS } from '../data/materials';
import { bounds, type Form, type Section } from './form';
import { growShape, grownSection, type Grown, type Problem } from './topopt';

const LENGTH = DIMS.length, FORCE = DIMS.force, MASS = DIMS.mass;
const g0 = 9.80665;

/** The lengths said, in order, with the word after each ("40 mm long" gives long). */
function lengths(text: string): { v: number; word: string }[] {
  const t = text.toLowerCase();
  return findQuantities(t).filter((q) => sameDim(q.dim, LENGTH)).map((q) => {
    const after = t.slice(q.at + q.text.length).trim().split(/[\s,]+/)[0] ?? '';
    const before = t.slice(Math.max(0, q.at - 14), q.at).trim().split(/\s+/).at(-1) ?? '';
    return { v: q.si, word: `${before} ${after}` };
  });
}

/** "100 x 50 x 20 mm": the three lengths of a block, in metres. */
function triple(text: string): [number, number, number] | null {
  const m = /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|in)\b/.exec(text.toLowerCase());
  if (!m) return null;
  const k = { mm: 1e-3, cm: 1e-2, m: 1, in: 0.0254 }[m[4] as 'mm' | 'cm' | 'm' | 'in'];
  return [Number(m[1]) * k, Number(m[2]) * k, Number(m[3]) * k];
}

/** A material named in the words, or none. */
export function materialIn(text: string): string | null {
  const t = text.toLowerCase();
  const words: [RegExp, string][] = [[/\b(aluminium|aluminum)\b/, 'aluminum.6061-t6'], [/\bsteel\b/, 'steel.1018-cd'], [/\bstainless\b/, 'steel.304'], [/\b(nylon|onyx|printed|carbon)\b/, 'polymer.nylon-microcarbon'], [/\b(titanium)\b/, 'titanium.ti6al4v']];
  for (const [re, id] of words) if (re.test(t) && MATERIALS.some((m) => m.id === id)) return id;
  return null;
}

/** A shape from words, or null when the words don't name one. */
export function formFromWords(text: string): Form | null {
  const t = text.toLowerCase();
  const L = lengths(t);
  const find = (re: RegExp) => L.find((x) => re.test(x.word))?.v;
  const first = L[0]?.v;
  const dia = (fallback?: number) => {
    const d = find(/\b(diameter|dia|wide|across)\b|ø/) ?? fallback;
    const r = find(/\bradius\b/);
    return r !== undefined ? 2 * r : d;
  };
  let f: Form | null = null;
  const tri = triple(t);
  if (/\b(sphere|ball|orb)\b/.test(t)) { const d = dia(first); if (d) f = { f: 'sphere', r: d / 2 }; }
  else if (/\b(torus|donut|doughnut)\b/.test(t)) {
    const d = dia(first), tube = find(/\b(thick|section|tube)\b/) ?? (d ? d / 5 : undefined);
    if (d && tube) f = { f: 'torus', R: (d - tube) / 2, r: tube / 2 };
  } else if (/\b(wing|blade|aerofoil|airfoil|foil)\b/.test(t)) {
    const code = /naca\s*(\d{4})/.exec(t)?.[1] ?? '2412';
    const span = find(/\b(long|span|length)\b/) ?? first, chord = find(/\bchord\b/) ?? (span ? span / 3 : undefined);
    if (span && chord) f = { f: 'move', of: { f: 'extrude', sec: { s: 'naca', code, chord }, h: span }, p: [-chord / 2, 0, 0] };
  } else if (/\b(tube|pipe)\b/.test(t)) {
    const d = dia(first), wall = find(/\b(wall|walls|thick)\b/) ?? (d ? d / 10 : undefined), len = find(/\b(long|length|tall|high)\b/) ?? (L[1]?.v);
    if (d && wall && len && wall < d / 2) f = { f: 'move', of: { f: 'extrude', sec: { s: 'ring', ro: d / 2, ri: d / 2 - wall }, h: len }, q: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] };
  } else if (/\b(cone)\b/.test(t)) {
    const d = dia(first), h = find(/\b(tall|high|height|long)\b/) ?? L[1]?.v ?? d;
    if (d && h) f = { f: 'cone', r: d / 2, h };
  } else if (/\b(capsule|pill)\b/.test(t)) {
    const d = dia(first), len = find(/\b(long|length|tall)\b/) ?? L[1]?.v;
    if (d && len) f = { f: 'capsule', r: d / 2, h: Math.max(0, len - d) };
  } else if (/\b(cylinder|rod|disc|disk|puck|bar|peg)\b/.test(t)) {
    const d = dia(first), h = find(/\b(tall|high|long|length|thick|height)\b/) ?? L[1]?.v ?? d;
    if (d && h) f = { f: 'cylinder', r: d / 2, h };
  } else if (/\b(cube)\b/.test(t)) {
    const s = tri ? tri[0] : first;
    if (s) f = { f: 'box', x: s, y: s, z: s };
  } else if (/\b(block|box|plate|slab|brick|cuboid)\b/.test(t)) {
    const [x, y, z] = tri ?? [find(/\b(long|length)\b/) ?? first, find(/\b(wide|width)\b/) ?? L[1]?.v, find(/\b(thick|tall|high|deep)\b/) ?? L[2]?.v];
    if (x && y && z) f = { f: 'box', x, y, z };
  }
  if (!f) return null;
  // rounded corners
  const round = find(/\b(round|rounded|fillet|radius)\b/);
  if (f.f === 'box' && round && /round|fillet/.test(t)) f = { ...f, r: Math.min(round, f.x / 2, f.y / 2, f.z / 2) };
  // hollow, with walls
  if (/\b(hollow|shell)\b/.test(t)) { const wall = find(/\bwalls?\b/) ?? 2e-3; f = { f: 'shell', of: f, t: wall }; }
  // a lattice inside
  const lat = /\b(gyroid|schwarz|diamond)\b/.exec(t)?.[1];
  if (lat) {
    const cell = find(/\bcells?\b/) ?? 0.01, wall = find(/\b(struts?|sheets?)\b/) ?? 1e-3;
    f = { f: 'lattice', of: f, kind: lat === 'schwarz' ? 'schwarz-p' : (lat as 'gyroid' | 'diamond'), cell, t: wall };
  }
  // holes, through the thinnest direction
  const holes = [...t.matchAll(/(\d+(?:\.\d+)?)\s*(mm|cm|in)\s*(?:diameter\s*)?holes?/g)];
  if (holes.length && /\bholes?\b/.test(t)) {
    const k = (u: string) => ({ mm: 1e-3, cm: 1e-2, in: 0.0254 })[u as 'mm' | 'cm' | 'in'];
    const [blo, bhi] = bounds(f);
    const reach = 3 * Math.max(bhi[0] - blo[0], bhi[1] - blo[1], bhi[2] - blo[2]);
    const take: Form[] = holes.map((h) => ({ f: 'cylinder', r: (Number(h[1]) * k(h[2]!)) / 2, h: reach }));
    const through = f.f === 'box' ? ([f.x, f.y, f.z].indexOf(Math.min(f.x, f.y, f.z))) : 1;
    const q: [number, number, number, number] | undefined = through === 0 ? [0, 0, Math.SQRT1_2, Math.SQRT1_2] : through === 2 ? [Math.SQRT1_2, 0, 0, Math.SQRT1_2] : undefined;
    f = { f: 'subtract', from: f, take: take.map((c) => (q ? { f: 'move', of: c, q } : c)) };
  }
  return f;
}

// ------------------------------------------------------------------------------------------------ inventing for a job

export interface Invention {
  form: Form;
  problem: Problem;
  grown: Grown;
  material: string;
  /** What it is for, in words; its growth and the thickness it was set to. */
  job: string;
  attempts: { t: number; volfrac: number; safety: number }[];
  caution?: string;
}

/**
 * A part grown for a job said in words: a bracket held at a wall with a load at its far end, or a beam held at both
 * ends with a load in the middle. Its loads and lengths are read from what was said, and its shape grown by them.
 * Its thickness is then set for the safety factor wanted: in plane stress the stress in a plate goes exactly as one
 * over its thickness, and the grown topology doesn't depend on it, so one growth and one rescale hit the target. A
 * plate thinner than about a fortieth of its span is said to need a check for buckling sideways, which a plane model
 * can't see.
 */
export function invent(text: string, minSafety = 2): Invention | null {
  const t = text.toLowerCase();
  const qs = findQuantities(t);
  const force = qs.find((q) => sameDim(q.dim, FORCE))?.si ?? (qs.find((q) => sameDim(q.dim, MASS))?.si ?? NaN) * g0;
  if (!Number.isFinite(force) || force <= 0) return null;
  const span = lengths(t).find((x) => !/\b(thick|wide)\b/.test(x.word))?.v;
  if (!span) return null;
  const beam = /\b(beam|bridge|span|spanning|joist)\b/.test(t);
  const bracket = /\b(bracket|arm|cantilever|hook|mount|holder|support|hanger)\b/.test(t);
  if (!beam && !bracket) return null;
  const material = materialIn(t) ?? 'polymer.nylon-microcarbon';
  const m = getMaterial(material);
  const nx = 60, ny = beam ? 20 : 30, h = span / nx;
  const said = lengths(t).find((x) => /\bthick\b/.test(x.word))?.v;
  const t0 = said ?? Math.max(3e-3, span / 20);
  const p: Problem = beam
    ? { nx, ny, h, t: t0, E: m.E, nu: m.nu, yield: m.yield, volfrac: 0.4, rmin: 2,
      supports: [{ edge: 'bottom', fix: 'both', from: 0, to: 0 }, { edge: 'bottom', fix: 'y', from: 1, to: 1 }],
      loads: [{ at: [span / 2, ny * h], force: [0, -force] }] }
    : { nx, ny, h, t: t0, E: m.E, nu: m.nu, yield: m.yield, volfrac: 0.4, rmin: 2.4,
      supports: [{ edge: 'left', fix: 'both' }], loads: [{ at: [span, (ny * h) / 2], force: [0, -force] }] };
  const g0r = growShape(p);
  const attempts: Invention['attempts'] = [{ t: t0, volfrac: p.volfrac, safety: g0r.safety }];
  // the thickness for a safety factor of 1.25 × the least wanted (unless the thickness was said), no thinner than 2 mm
  const tf = said ?? Math.max(2e-3, (t0 * (1.25 * minSafety)) / g0r.safety);
  const k = tf / t0;
  const grown: Grown = { ...g0r, stress: g0r.stress / k, deflection: g0r.deflection / k, compliance: g0r.compliance / k, safety: g0r.safety * k, volume: g0r.volume * k };
  const final: Problem = { ...p, t: tf };
  attempts.push({ t: tf, volfrac: p.volfrac, safety: grown.safety });
  const sec: Section = grownSection(grown, final);
  const W = final.nx * final.h, H = final.ny * final.h;
  const form: Form = { f: 'move', of: { f: 'extrude', sec, h: final.t }, p: [-W / 2, -H / 2, 0] };
  const job = beam ? `a beam spanning ${(span * 1000).toFixed(0)} mm carrying ${force.toFixed(0)} N in the middle` : `a bracket holding ${force.toFixed(0)} N at ${(span * 1000).toFixed(0)} mm from its wall`;
  return { form, problem: final, grown, material, job, attempts, ...(tf < span / 40 ? { caution: `it is a thin plate (${(tf * 1000).toFixed(1)} mm for a ${(span * 1000).toFixed(0)} mm span): check it for buckling sideways, which a plane model can't see` } : {}) };
}

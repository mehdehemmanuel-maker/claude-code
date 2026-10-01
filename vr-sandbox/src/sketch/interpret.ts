// What a drawing on the interpretation wall means as parts: each stroke read as a shape (strokes.ts), and what you
// say as you draw it ("this is a steel pipe", "oak", "40 cm long", "no, it's a wheel") deciding which part, what it's
// made of and how big. The wall is drawn at a scale (1:1 by default: what you draw is the size it is), and each part
// is placed where its stroke was, on a plane in front of the wall, upright as drawn.

import { resolveKind, resolveMaterial } from '../forge/catalog';
import { readStroke, type P2, type Reading, type Shape } from './strokes';

export interface Interpretation {
  /** The part kind, its parameters (m), its material id. */
  kind: string;
  params: Record<string, number | string>;
  material: string;
  /** Where its centre goes on the wall (m, wall coordinates: x along it, y up), and its turn in the wall's plane. */
  at: P2;
  angle: number;
  /** What she understood, in a few words, to say back. */
  said: string;
  /** How sure she is (0..1), from how well the stroke fits its shape. */
  sure: number;
}

const LENGTH: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, inch: 0.0254, inches: 0.0254, ft: 0.3048, foot: 0.3048, feet: 0.3048 };

/** "40 cm long", "2 inches thick", "50mm wide": sizes you said, by what they size. */
function sizesIn(words: string) {
  const out: Record<string, number> = {};
  const re = /(\d+(?:\.\d+)?)\s*(mm|cm|m|in|inch(?:es)?|ft|foot|feet)\b\s*(long|wide|thick|tall|high|across|diameter|round)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(words))) out[m[3] ?? 'size'] = Number(m[1]) * (LENGTH[m[2]!] ?? 1);
  return out;
}

/** The kind a word names, if any ("pipe", "wheel", "beam", "board"...). */
function kindIn(words: string): string | null {
  for (const w of words.split(/[^a-z0-9.]+/)) {
    if (w.length < 3) continue;
    try { return resolveKind(w); } catch { /* not a part word */ }
  }
  return null;
}

/** A material a word names, for a kind ("oak", "steel", "aluminium"...). */
function materialIn(kind: string, words: string): string | null {
  for (const w of words.split(/[^a-z0-9.-]+/)) {
    if (w.length < 3 || ['this', 'that', 'the', 'make', 'its', 'it', 'a', 'an', 'and', 'with', 'long', 'wide', 'thick'].includes(w)) continue;
    try {
      const id = resolveMaterial(kind, w);
      if (id !== resolveMaterial(kind, undefined) || id.includes(w)) return id;
    } catch { /* not a material word */ }
  }
  return null;
}

/** Long stock: what a straight stroke can be. */
const LINEAR = ['rod.round', 'rod.square', 'tube.round', 'tube.square', 'beam.i', 'angle', 'lumber'];

/** The parts a shape can be, the most natural first. */
function kindsFor(shape: Shape): string[] {
  switch (shape.kind) {
    case 'line': return shape.length < 0.4 ? ['rod.round', 'lumber', 'tube.round', 'beam.i'] : ['lumber', 'tube.round', 'rod.round', 'beam.i'];
    case 'circle': return ['disc', 'wheel', 'sphere'];
    case 'rect': return ['plate', 'block'];
    case 'triangle': return ['wedge'];
    case 'polygon': return ['plate'];
  }
}

/**
 * The part a stroke and your words make, at the wall's scale (metres in the world per metre drawn). `words` may name
 * the part, its material and its sizes; anything not said comes from the drawing, or the part's own default.
 */
export function interpret(reading: Reading, words = '', scale = 1): Interpretation {
  const w = words.toLowerCase();
  const shape = reading.shape;
  const said = kindIn(w);
  const kinds = kindsFor(shape);
  // what you called it, if the shape can be that (a line any long stock; a drawn rectangle called a board is a plate)
  const kind = said && (kinds.includes(said) || (shape.kind === 'line' && LINEAR.includes(said))) ? said : kinds[0]!;
  const material = materialIn(kind, w) ?? resolveMaterial(kind, undefined);
  const sz = sizesIn(w);
  const params: Record<string, number | string> = {};
  let at: P2 = [0, 0], angle = 0;
  const S = (x: number) => x * scale;
  switch (shape.kind) {
    case 'line': {
      at = [(shape.a[0] + shape.b[0]) / 2, (shape.a[1] + shape.b[1]) / 2];
      angle = Math.atan2(shape.b[1] - shape.a[1], shape.b[0] - shape.a[0]);
      params['length'] = sz['long'] ?? sz['size'] ?? S(shape.length);
      if (kind === 'rod.round' && (sz['thick'] || sz['diameter'])) params['diameter'] = sz['thick'] ?? sz['diameter']!;
      if (kind === 'tube.round' && (sz['thick'] || sz['diameter'] || sz['across'])) params['od'] = sz['diameter'] ?? sz['across'] ?? sz['thick']!;
      break;
    }
    case 'circle': {
      at = shape.c;
      const d = sz['diameter'] ?? sz['across'] ?? sz['wide'] ?? sz['size'] ?? S(2 * shape.r);
      params['diameter'] = d;
      if (kind === 'disc' && sz['thick']) params['thickness'] = sz['thick'];
      if (kind === 'wheel' && (sz['wide'] || sz['thick'])) params['width'] = sz['wide'] ?? sz['thick']!;
      break;
    }
    case 'rect': {
      at = shape.c;
      angle = shape.angle;
      const L = sz['long'] ?? S(shape.w), H = sz['tall'] ?? sz['high'] ?? sz['wide'] ?? S(shape.h);
      if (kind === 'block') { params['x'] = L; params['y'] = H; params['z'] = sz['thick'] ?? Math.min(L, H); }
      else { params['length'] = L; params['width'] = H; params['thickness'] = sz['thick'] ?? 0.01; }
      break;
    }
    case 'triangle': {
      const xs = shape.pts.map((p) => p[0]), ys = shape.pts.map((p) => p[1]);
      at = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      params['length'] = sz['long'] ?? S(Math.max(...xs) - Math.min(...xs));
      params['height'] = sz['tall'] ?? sz['high'] ?? S(Math.max(...ys) - Math.min(...ys));
      if (sz['wide'] || sz['thick']) params['width'] = sz['wide'] ?? sz['thick']!;
      break;
    }
    case 'polygon': {
      const xs = shape.pts.map((p) => p[0]), ys = shape.pts.map((p) => p[1]);
      at = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
      params['length'] = S(Math.max(...xs) - Math.min(...xs));
      params['width'] = S(Math.max(...ys) - Math.min(...ys));
      params['thickness'] = sz['thick'] ?? 0.01;
      break;
    }
  }
  const sure = Math.max(0, Math.min(1, 1 - reading.error * 5));
  const mm = (x: number) => (x >= 1 ? `${x.toFixed(2)} m` : `${Math.round(x * 1000)} mm`);
  const size = Object.entries(params).filter(([, v]) => typeof v === 'number').map(([k, v]) => `${k} ${mm(v as number)}`).join(', ');
  return { kind, params, material, at, angle, said: `${kind.replace('.', ' ')} in ${material}, ${size}`, sure };
}

/** Read one stroke and what you said with it. */
export function interpretStroke(pts: P2[], words = '', scale = 1): Interpretation | null {
  const r = readStroke(pts);
  return r ? interpret(r, words, scale) : null;
}

/** "No, it's a wheel", "make it a pipe", "oak", "60 cm long": the same stroke read again with what you said now. */
export function correct(reading: Reading, before: string, now: string, scale = 1): Interpretation {
  const w = now.toLowerCase().replace(/^(no|nope|not that|wrong)[,.!]?\s*/, '');
  // a shape you named overrides the one she read
  const named: Shape['kind'] | null = /\b(circle|round|wheel|disc|disk)\b/.test(w) ? 'circle' : /\b(line|rod|pipe|tube|beam|bar|stick|lumber)\b/.test(w) ? 'line' : null;
  const alt = named && named !== reading.shape.kind ? reading.alternatives.find((a) => a.shape.kind === named) : null;
  const r: Reading = alt ? { shape: alt.shape, error: alt.error, alternatives: [] } : reading;
  return interpret(r, `${before} ${w}`, scale);
}

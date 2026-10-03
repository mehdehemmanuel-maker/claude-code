// Places: ground of any kind. A place is not a stored scene; it is a few physical numbers read from the words that ask
// for it (what the ground is, how it rises and rolls, where the water stands, the sky and the sun), from which its
// ground is grown as a heightfield the physics world stands on and the renderer draws, the same numbers for both.
//
//   ground  what it is made of (dry sand, soil, granite), how far it rises inland (a beach face is about 1 in 20),
//           and its relief: rolling hills and dunes as a sum of octaves of smooth noise, seeded, so a place asked
//           for twice is the same place
//   water   a sea or lake as a volume of water at its level, with real buoyancy and drag
//   sky     its colours, overhead and at the horizon, how far you see (fog), and the sun's height and bearing
//
// The ground is shifted so that where you stand (the origin) is at y = 0, the floor everything was built on.

export interface PlaceSpec {
  id: string;
  name: string;
  ground: {
    material: string;
    /** Rise per metre inland (+z away from the water); 0 for level ground. */
    slope: number;
    /** Where the slope meets the water level, m along z (the shoreline), when there is water. */
    shore: number;
    /** Height of the relief, m, and its wavelength, m. */
    relief: number;
    wavelength: number;
    /** An island falls away all round: its radius, m (0 for none). */
    island: number;
    seed: number;
  };
  water?: { name: string; density: number };
  sky: { zenith: number; horizon: number; visibility: number };
  sun: { elevation: number; azimuth: number; intensity: number };
  /** Where its numbers come from. */
  sources: string[];
}

const BEACH_FACE = 'Bascom, The relationship between sand size and beach-face slope, Trans. AGU 32 (1951): beach faces about 1:10 (coarse sand) to 1:50 (fine)';
const DUNES = 'Bagnold, The Physics of Blown Sand and Desert Dunes, Methuen 1941: dunes of a few metres to tens of metres, tens of metres apart';
const SEAWATER = 'UNESCO EOS-80 equation of state: surface seawater about 1025 kg/m3 (35 g/kg, 15 °C)';
const FRESH = 'Fresh water at 20 °C: 998.2 kg/m3 (CRC Handbook)';

/** The places she knows by word, and what each is made of. */
export const PLACES: Record<string, Omit<PlaceSpec, 'id'>> = {
  beach: {
    name: 'a sandy beach', ground: { material: 'ground.sand-dry', slope: 0.05, shore: -8, relief: 0.25, wavelength: 14, island: 0, seed: 1 },
    water: { name: 'the sea', density: 1025 }, sky: { zenith: 0x3d84d6, horizon: 0xbfe3f5, visibility: 400 }, sun: { elevation: 50, azimuth: 200, intensity: 2.6 },
    sources: [BEACH_FACE, SEAWATER],
  },
  island: {
    name: 'a small island', ground: { material: 'ground.sand-dry', slope: 0.06, shore: 0, relief: 0.4, wavelength: 18, island: 30, seed: 7 },
    water: { name: 'the sea', density: 1025 }, sky: { zenith: 0x2f7ad0, horizon: 0xc7ecf8, visibility: 450 }, sun: { elevation: 55, azimuth: 180, intensity: 2.7 },
    sources: [BEACH_FACE, SEAWATER],
  },
  lake: {
    name: 'a lakeshore', ground: { material: 'ground.soil', slope: 0.04, shore: -10, relief: 0.6, wavelength: 25, island: 0, seed: 3 },
    water: { name: 'the lake', density: 998.2 }, sky: { zenith: 0x5089c8, horizon: 0xd6e6ee, visibility: 300 }, sun: { elevation: 40, azimuth: 160, intensity: 2.3 },
    sources: [FRESH],
  },
  desert: {
    name: 'a desert of dunes', ground: { material: 'ground.sand-dry', slope: 0, shore: 0, relief: 3, wavelength: 40, island: 0, seed: 11 },
    sky: { zenith: 0x6aa6dc, horizon: 0xf2dcb3, visibility: 350 }, sun: { elevation: 65, azimuth: 190, intensity: 3 },
    sources: [DUNES],
  },
  meadow: {
    name: 'a meadow of rolling hills', ground: { material: 'ground.soil', slope: 0, shore: 0, relief: 1.5, wavelength: 30, island: 0, seed: 5 },
    sky: { zenith: 0x5a8fd0, horizon: 0xd4e4d2, visibility: 300 }, sun: { elevation: 42, azimuth: 150, intensity: 2.4 },
    sources: [],
  },
  mountain: {
    name: 'a mountainside', ground: { material: 'stone.granite', slope: 0.15, shore: 0, relief: 8, wavelength: 70, island: 0, seed: 13 },
    sky: { zenith: 0x3a6db8, horizon: 0xdbe6f0, visibility: 600 }, sun: { elevation: 35, azimuth: 140, intensity: 2.8 },
    sources: [],
  },
};

/** Words that name a place, and the place they name. */
const WORDS: [RegExp, string][] = [
  [/\b(beach|seaside|coast|shore|sea|ocean|yacht)\b/, 'beach'], [/\b(island|islands)\b/, 'island'], [/\b(lake|pond|lakeshore)\b/, 'lake'],
  [/\b(desert|dunes?|wasteland|sahara)\b/, 'desert'], [/\b(meadow|field|garden|forest|hills?|park|countryside|grass)\b/, 'meadow'],
  [/\b(mountains?|mountainside|cliffs?|peak)\b/, 'mountain'],
];

/** The place a request names, or null. Night turns its sky dark and its sun to a moon's glow. */
export function placeFromWords(text: string): PlaceSpec | null {
  const t = text.toLowerCase();
  const hit = WORDS.find(([re]) => re.test(t));
  if (!hit) return null;
  const base = PLACES[hit[1]]!;
  const night = /\b(night|midnight|moonlit|starry)\b/.test(t);
  return {
    id: hit[1] + (night ? '.night' : ''), ...base,
    ...(night ? { sky: { zenith: 0x070b1a, horizon: 0x1b2340, visibility: 120 }, sun: { ...base.sun, elevation: 30, intensity: 0.15 } } : {}),
  };
}

// --------------------------------------------------------------------------------------------- the ground grown

/** A hash of two integers and a seed to [0, 1): the lattice values of the noise (integer mixing, after Jenkins). */
function lattice(x: number, z: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(z | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [−1, 1], C² continuous (quintic fade), so slopes have no creases. */
function noise(x: number, z: number, seed: number): number {
  const xi = Math.floor(x), zi = Math.floor(z), fx = x - xi, fz = z - zi;
  const s = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const u = s(fx), v = s(fz);
  const a = lattice(xi, zi, seed), b = lattice(xi + 1, zi, seed), c = lattice(xi, zi + 1, seed), d = lattice(xi + 1, zi + 1, seed);
  return 2 * (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) - 1;
}

/** Relief: four octaves, each half the size and half the height of the one before (fractional Brownian motion). */
function relief(x: number, z: number, g: PlaceSpec['ground']): number {
  let h = 0, amp = 1, f = 1 / g.wavelength, norm = 0;
  for (let o = 0; o < 4; o++) { h += amp * noise(x * f, z * f, g.seed + o * 101); norm += amp; amp *= 0.5; f *= 2; }
  return (g.relief * h) / norm;
}

/** The ground's height at a point before it is shifted to stand you at y = 0: the slope, the island's fall, the relief. */
function rawHeight(x: number, z: number, g: PlaceSpec['ground']): number {
  const rise = g.island > 0 ? g.slope * (g.island - Math.hypot(x, z)) : g.slope * (z - g.shore);
  // near the water the relief dies away, as a beach face is smoothed by its waves
  const calm = g.island > 0 ? Math.min(1, Math.max(0, (g.island - Math.hypot(x, z)) / 8)) : g.slope > 0 ? Math.min(1, Math.max(0, (z - g.shore) / 8)) : 1;
  return rise + relief(x, z, g) * (0.15 + 0.85 * calm);
}

export interface Heightfield {
  /** Samples per side, and the side's length, m; the field spans −size/2 to size/2 in x and z. */
  n: number;
  size: number;
  /** Heights, row by row along z then x: heights[iz * n + ix], m, with the origin's ground at 0. */
  heights: Float32Array;
  /** The water's level, m, when there is water (on the same scale). */
  waterLevel: number | null;
  min: number;
  max: number;
}

/** The ground of a place as a heightfield, its origin's ground at y = 0. */
export function heightfield(p: PlaceSpec, n = 128, size = 160): Heightfield {
  const g = p.ground, step = size / (n - 1);
  const zero = rawHeight(0, 0, g);
  const heights = new Float32Array(n * n);
  let min = Infinity, max = -Infinity;
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const h = rawHeight(-size / 2 + ix * step, -size / 2 + iz * step, g) - zero;
    heights[iz * n + ix] = h;
    if (h < min) min = h;
    if (h > max) max = h;
  }
  // the origin falls between samples: shift by the ground there as the triangles have it, so you stand exactly at 0
  const f: Heightfield = { n, size, heights, waterLevel: null, min, max };
  const at0 = groundAt(f, 0, 0);
  for (let i = 0; i < heights.length; i++) heights[i]! -= at0;
  f.min -= at0;
  f.max -= at0;
  // the water stands where the slope crosses its zero: the shoreline (or the island's edge)
  f.waterLevel = p.water ? -zero - at0 : null;
  return f;
}

/**
 * The ground's height at a point, on the same triangles the physics world stands on: each cell split along its
 * diagonal from (x, z) to (x + 1, z + 1), as Jolt splits a heightfield's cells (and the renderer draws them).
 */
export function groundAt(f: Pick<Heightfield, 'n' | 'size' | 'heights'>, x: number, z: number): number {
  const step = f.size / (f.n - 1);
  const gx = Math.min(f.n - 1.000001, Math.max(0, (x + f.size / 2) / step)), gz = Math.min(f.n - 1.000001, Math.max(0, (z + f.size / 2) / step));
  const ix = Math.floor(gx), iz = Math.floor(gz), u = gx - ix, v = gz - iz;
  const h = (i: number, k: number) => f.heights[(iz + k) * f.n + ix + i]!;
  return v > u ? h(0, 0) + (h(1, 1) - h(0, 1)) * u + (h(0, 1) - h(0, 0)) * v : h(0, 0) + (h(1, 0) - h(0, 0)) * u + (h(1, 1) - h(1, 0)) * v;
}

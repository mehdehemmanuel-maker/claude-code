// Numbers to lean on: pure functions, no state, nothing of the platform. The noise is value noise on an integer
// lattice, hashed so the same (x, y, key) is always the same number wherever it is asked; fbm stacks octaves of it.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;

/** a toward b by t, per channel. `out` is written and returned when given, so a hot loop need not allocate. */
export function mix(a, b, t, out = [0, 0, 0]) {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}

/** 0 at a, 1 at b, eased between (a may be above b, for a fade the other way). */
export const smooth = (a, b, x) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** FNV-1a over a string: the seed when none is given. */
export const hash = (s) => {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** mulberry32: a small, fast generator whose every number comes from the seed alone. */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in 0..1 for a lattice point (x, y) under a key, with no pattern across neighbours. */
export const h2 = (x, y, key) => {
  let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(key | 0, 2246822519);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/** Value noise: smooth between the lattice points. */
export function noise(x, y, key = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const top = lerp(h2(xi, yi, key), h2(xi + 1, yi, key), u);
  const bottom = lerp(h2(xi, yi + 1, key), h2(xi + 1, yi + 1, key), u);
  return lerp(top, bottom, v);
}

/** Octaves of noise, each twice as fine and half as strong, normalised back to 0..1. */
export function fbm(x, y, key = 0, oct = 5) {
  let s = 0, a = 0.5, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * noise(x, y, key + i);
    n += a;
    x *= 2.03;
    y *= 1.97;
    a *= 0.5;
  }
  return s / n;
}

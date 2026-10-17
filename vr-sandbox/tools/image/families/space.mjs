// The space family: a black star sky with no horizon, a planet shaded as a sphere (limb darkening, a terminator from
// the light's side), rings for Saturn with the planet hiding their far half, a colour per body from its known look
// (Mars red-orange with dark maria, Earth blue with clouds and green-brown land, Jupiter banded with a storm oval,
// Venus pale cream, Saturn pale gold, the Moon grey with maria and craters), a nebula or a galaxy as coloured noise
// in two hues over the stars, an asteroid field, and 'from orbit' puts the viewer low over the body so its limb is a
// curve across the bottom third; 'moons' puts two to four small grey moons about the body. Every colour is a
// painter's reading of the body, not a photograph, and the scene's notes say so. Words: mars, venus, jupiter, saturn,
// planet(s), earth, orbit, moonscape, nebula, galaxy, space, cosmos, asteroid(s), moons ('moon' itself is the
// reader's own word: in a space picture with no body named it is the body).
import { clamp, fbm, h2, mix, smooth } from '../math.mjs';
import { register } from '../registry.mjs';
import { finishPass } from '../passes.mjs';
import { hsl, note, noteUndrawn } from './abstract.mjs';

export const WORDS =
  /^(mars|venus|jupiter|saturn|planet|planets|earth|orbit|moonscape|nebula|galaxy|space|cosmos|asteroids?|moons)$/;
const BODIES = /^(mars|venus|jupiter|saturn|earth)$/;

function apply(scene, word) {
  const sp = scene.space ??= { body: null, orbit: false, nebula: false, galaxy: false, asteroids: false, moons: false };
  if (scene.family !== 'space') {
    scene.family = 'space';
    noteUndrawn(scene, 'a space picture has no ground', ['stars', 'moon', 'sun']);
  }
  if (BODIES.test(word)) sp.body = word;
  else if (/^planets?$/.test(word)) sp.body ??= 'planet';
  else if (word === 'moonscape') {
    sp.body ??= 'moon';
    sp.orbit = true;
  } else if (word === 'orbit') sp.orbit = true;
  else if (word === 'nebula') sp.nebula = true;
  else if (word === 'galaxy') sp.galaxy = true;
  else if (/^asteroids?$/.test(word)) sp.asteroids = true;
  else if (word === 'moons') sp.moons = true;
  const lead = 'painted by the space family (no ground, no horizon): ';
  if (sp.body) note(scene, `${lead}a planet painted from its known colours, not a photograph`);
  else if (sp.nebula || sp.galaxy) note(scene, `${lead}a nebula painted as noise in two hues, not a photograph`);
  else note(scene, `${lead}a black star sky`);
}

// ── The sky ────────────────────────

const SPACE_TOP = [0.004, 0.005, 0.014], SPACE_BOTTOM = [0.0, 0.0, 0.006];
const STAR_WARM = [1, 0.93, 0.8], STAR_COOL = [0.82, 0.88, 1];

/** Black, with dense small stars (the density per pixel scaled so a thumbnail is not speckled). */
function starSky(ctx) {
  const { W, H, data, scale } = ctx, rare = 0.0045 / Math.max(scale, 0.5) ** 2, c = [0, 0, 0];
  for (let y = 0; y < H; y++) {
    mix(SPACE_TOP, SPACE_BOTTOM, y / H, c);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3, star = h2(x, y, 101);
      let r = c[0], g = c[1], b = c[2];
      if (star > 1 - rare) {
        const a = ((star - (1 - rare)) / rare) ** 1.5 * 0.9, tint = h2(x, y, 102) < 0.3 ? STAR_WARM : STAR_COOL;
        r += tint[0] * a;
        g += tint[1] * a;
        b += tint[2] * a;
      }
      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
    }
  }
}

/** A few bright stars with a soft glow, from rand. */
function brightStars(ctx, n) {
  const { W, H, rand, put, disc, scale } = ctx;
  for (let k = 0; k < n; k++) {
    const x = rand() * W, y = rand() * H, bright = 0.5 + rand() * 0.5, tint = rand() < 0.3 ? STAR_WARM : STAR_COOL;
    const reach = (3 + bright * 6) * scale;
    for (let py = Math.max(0, y - reach) | 0; py <= Math.min(H - 1, y + reach); py++) {
      for (let px = Math.max(0, x - reach) | 0; px <= Math.min(W - 1, x + reach); px++) {
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y) / reach;
        if (d < 1) put(px, py, tint, 0.5 * bright * Math.exp(-d * d * 5) * (1 - d));
      }
    }
    disc(x, y, (0.6 + bright * 0.9) * scale, [1, 1, 1], bright);
  }
}

const NEBULAE = [
  [[0.75, 0.2, 0.55], [0.1, 0.5, 0.65]], [[0.9, 0.45, 0.15], [0.15, 0.3, 0.75]], [[0.45, 0.15, 0.7], [0.2, 0.7, 0.45]],
];

/** Coloured clouds in two hues over the stars: a broad mass with dark lanes, brighter at its heart. */
function nebula(ctx) {
  const { W, H, rand, put } = ctx, hues = NEBULAE[Math.floor(rand() * NEBULAE.length)];
  const cx = 0.3 + rand() * 0.4, cy = 0.3 + rand() * 0.4, rx = 0.45 + rand() * 0.25, ry = 0.35 + rand() * 0.25;
  const off = rand() * 50, c = [0, 0, 0], k = Math.max(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const u = x / k * 3 + off, v = y / k * 3, d = Math.hypot((x / W - cx) / rx, (y / H - cy) / ry);
      const body = fbm(u, v, 103, 5), lane = fbm(u * 2.3 + 7, v * 2.3, 104, 4), mass = smooth(1.3, 0.3, d);
      const a = clamp((body - 0.38) * 2.2) * mass * (0.35 + 0.65 * smooth(0.3, 0.65, lane));
      if (a <= 0.003) continue;
      mix(hues[0], hues[1], smooth(0.35, 0.65, fbm(u * 0.8 + 3, v * 0.8, 105, 3)), c);
      const heart = smooth(0.7, 0, d) * 0.5;
      c[0] += heart;
      c[1] += heart * 0.9;
      c[2] += heart * 0.8;
      put(x, y, c, a * 0.85);
    }
  }
}

/** A spiral galaxy seen at a tilt: an inclined elliptical haze with a bright warm core and noisy arms. */
function galaxy(ctx) {
  const { W, H, rand, put } = ctx, tilt = 0.3 + rand() * 0.4, th = rand() * Math.PI, R = 0.42 * Math.min(W, H);
  const cx = W * (0.4 + rand() * 0.2), cy = H * (0.4 + rand() * 0.2), ct = Math.cos(th), st = Math.sin(th);
  const arms = 2 + Math.floor(rand() * 2), twist = 2.5 + rand() * 2, c = [0, 0, 0], off = rand() * 10;
  const core = [1, 0.9, 0.72], arm = [0.6, 0.7, 1];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, ex = (dx * ct + dy * st) / R, ey = (-dx * st + dy * ct) / (R * tilt);
      const r = Math.hypot(ex, ey);
      if (r > 1.3) continue;
      const phi = Math.atan2(ey, ex), spiral = 0.5 + 0.5 * Math.cos(arms * phi - twist * Math.log(r + 0.05));
      const grain = fbm(ex * 4 + off, ey * 4, 106, 3), disc = Math.exp(-r * r * 2.2);
      const a = disc * (0.15 + 0.55 * spiral * smooth(0.1, 0.4, r) * (0.5 + grain)) + Math.exp(-r * r * 30) * 0.9;
      if (a <= 0.003) continue;
      mix(arm, core, Math.exp(-r * r * 6), c);
      put(x, y, c, clamp(a));
    }
  }
}

// ── The bodies ─────────────────────

const WHITE = [0.95, 0.96, 0.98];
/** The atmosphere's colour at the limb, where a body has one to show. */
const ATMOSPHERE = {
  earth: [0.45, 0.7, 1], mars: [0.85, 0.65, 0.5], venus: [0.95, 0.9, 0.75], saturn: null, jupiter: null,
};

/**
 * The surface colour of a body at longitude u (radians) and latitude v (-1..1, the true one, for the caps and the
 * storm), with vz the latitude the noise is read at (zoomed from orbit), keyed by the body.
 */
function surface(body, u, v, vz, seedHue, out) {
  if (body === 'mars') {
    mix([0.80, 0.42, 0.25], [0.42, 0.20, 0.14], clamp((fbm(u * 1.2, vz * 2.2, 111, 4) - 0.52) * 4), out);
    const cap = smooth(0.8, 0.9, Math.abs(v) + (fbm(u * 3, vz * 3, 112, 2) - 0.5) * 0.1);
    return mix(out, [0.95, 0.93, 0.9], cap, out);
  }
  if (body === 'earth') {
    const land = smooth(0.54, 0.6, fbm(u * 1.1, vz * 1.7, 113, 5));
    const soil = mix([0.22, 0.45, 0.16], [0.55, 0.45, 0.25], smooth(0.4, 0.7, fbm(u * 2.5, vz * 3, 114, 3)));
    mix([0.06, 0.2, 0.5], soil, land, out);
    mix(out, [0.92, 0.94, 0.97], smooth(0.78, 0.9, Math.abs(v)), out); // the ice caps
    const cloud = clamp((fbm(u * 2.2 + 5, vz * 3.5, 115, 4) - 0.52) * 4) * 0.9;
    return mix(out, WHITE, cloud, out);
  }
  if (body === 'jupiter' || body === 'saturn') {
    const soft = body === 'saturn', freq = soft ? 7 : 9.5;
    const b = vz + (fbm(u * 3, vz * 6, 116, 3) - 0.5) * (soft ? 0.05 : 0.09);
    const t = 0.5 + 0.5 * Math.sin(b * freq + 1.2 * Math.sin(b * 3 + 1)), k = soft ? 0.5 : 1;
    const pale = soft ? [0.88, 0.80, 0.62] : [0.86, 0.78, 0.65], dark = soft ? [0.74, 0.64, 0.46] : [0.60, 0.40, 0.28];
    mix(pale, dark, 0.5 + (t - 0.5) * k, out);
    if (!soft) { // the great storm: an oval below the equator
      const du = Math.atan2(Math.sin(u - 1.1), Math.cos(u - 1.1)), d = Math.hypot(du / 0.26, (v + 0.3) / 0.11);
      mix(out, [0.80, 0.40, 0.28], smooth(1, 0.5, d), out);
    }
    return out;
  }
  if (body === 'venus') {
    const swirl = fbm(u * 1.6 + vz * 2.5, vz * 3.5, 117, 4) - 0.5;
    out[0] = 0.92 + swirl * 0.12;
    out[1] = 0.86 + swirl * 0.12;
    out[2] = 0.70 + swirl * 0.1;
    return out;
  }
  if (body === 'moon') {
    mix([0.62, 0.61, 0.58], [0.34, 0.34, 0.36], smooth(0.52, 0.6, fbm(u * 1.3, vz * 2, 118, 4)), out);
    const cu = u * 4, cv = vz * 4, ci = Math.floor(cu), cj = Math.floor(cv); // a crater per cell, some cells
    const kx = ci + 0.2 + h2(ci, cj, 119) * 0.6, ky = cj + 0.2 + h2(ci, cj, 120) * 0.6, r = 0.1 + h2(ci, cj, 121) * 0.2;
    const d = Math.hypot(cu - kx, cv - ky) / r;
    if (h2(ci, cj, 122) < 0.6 && d < 1.25) {
      const rim = smooth(1.25, 1, d) * smooth(0.75, 1, d), floor = smooth(0.95, 0.6, d);
      mix(out, [0.78, 0.77, 0.74], rim * 0.6, out);
      return mix(out, [0.3, 0.3, 0.32], floor * 0.5, out);
    }
    return out;
  }
  const base = hsl(seedHue, 0.45, 0.5), tint = hsl(seedHue + 0.08, 0.5, 0.35);
  return mix(base, tint, smooth(0.4, 0.6, fbm(u * 1.5, vz * 3, 123, 4)), out);
}

/**
 * The body as a sphere at (cx, cy) of radius R pixels, lit from the unit vector `light` (its z toward the viewer):
 * Lambert shading with limb darkening, a soft terminator, the night side nearly black, the atmosphere brightening
 * the lit limb, and an anti-aliased edge. `zoom` scales the surface's noise so a body seen from orbit (a radius of
 * frames) keeps the grain of one seen whole.
 */
function sphere(ctx, body, cx, cy, R, light, seedHue, off, zoom = 1) {
  const { W, H, put } = ctx, [lx, ly, lz] = light, air = ATMOSPHERE[body], c = [0, 0, 0];
  const rimFrom = zoom > 1 ? 0.25 : 0.5; // from orbit the air is a thin band at the limb, not a wash over the land
  const y0 = Math.max(0, Math.floor(cy - R - 1)), y1 = Math.min(H - 1, Math.ceil(cy + R + 1));
  const x0 = Math.max(0, Math.floor(cx - R - 1)), x1 = Math.min(W - 1, Math.ceil(cx + R + 1));
  for (let y = y0; y <= y1; y++) {
    const ny = (y + 0.5 - cy) / R;
    for (let x = x0; x <= x1; x++) {
      const nx = (x + 0.5 - cx) / R, rr = nx * nx + ny * ny;
      if (rr > 1.02 + 2 / R) continue;
      const edge = clamp(0.5 - (Math.sqrt(rr) - 1) * R); // coverage at the limb, one pixel soft
      if (edge <= 0.002) continue;
      const nz = Math.sqrt(Math.max(0, 1 - rr)), lam = nx * lx + ny * ly + nz * lz;
      const u = Math.atan2(nx, nz) * zoom + off, vz = (ny + (zoom > 1 ? 1 : 0)) * zoom;
      // From orbit the rows over the limb are ny near -1, which read whole is the pole: the viewer is put over the
      // temperate belt instead (vz spans 0..1.2 there), else Mars and Earth showed nothing but their ice caps.
      surface(body, u, zoom > 1 ? vz * 0.5 - 0.3 : ny, vz, seedHue, c);
      // From orbit the subsolar point is off the visible stretch, so the light is gained to read as day.
      const day = smooth(-0.04, 0.12, lam), limb = 0.45 + 0.55 * nz, gain = zoom > 1 ? 1.8 : 1.15;
      const k = 0.02 + day * Math.min(1, Math.max(0, lam) * gain) * limb;
      c[0] *= k;
      c[1] *= k;
      c[2] *= k;
      if (air) { // the atmosphere glows where the surface turns away, on the lit side
        const rim = smooth(rimFrom, 0.03, nz) * day * 0.5;
        mix(c, air, rim, c);
      }
      put(x, y, c, edge);
    }
  }
}

const RING = [0.85, 0.78, 0.62];

/** Saturn's rings: an ellipse round the planet, its far half drawn under the disc and the near half over it. */
function rings(ctx, cx, cy, R, tilt, light, half) {
  const { W, H, put } = ctx, rx = 2.3 * R, ry = rx * tilt, c = [0, 0, 0];
  const y0 = Math.max(0, Math.floor(cy - ry - 1)), y1 = Math.min(H - 1, Math.ceil(cy + ry + 1));
  const x0 = Math.max(0, Math.floor(cx - rx - 1)), x1 = Math.min(W - 1, Math.ceil(cx + rx + 1));
  const profile = (rho) => { // the rings' density by radius in planet radii: C, B, the Cassini division, A
    if (rho < 1.25 || rho > 2.3) return 0;
    if (rho < 1.5) return 0.25 * smooth(1.25, 1.35, rho);
    if (rho < 1.93) return 0.6;
    if (rho < 2.0) return 0.08;
    return 0.45 * smooth(2.3, 2.2, rho);
  };
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    if ((dy < 0) !== (half === 'far')) continue;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx, rho = Math.hypot(dx / R, dy / (R * tilt));
      let a = profile(rho) * (0.7 + 0.3 * h2(Math.round(rho * 40), 0, 124)); // ringlets
      if (a <= 0.01) continue;
      const soft = Math.min(1, (rho - 1.25) * R * tilt, (2.3 - rho) * R * tilt); // the edges land between pixels
      a *= clamp(soft);
      const lit = 0.55 + 0.45 * clamp(0.5 + (dx / rx) * light[0] * 1.5);
      mix([0.3, 0.28, 0.25], RING, lit, c);
      if (half === 'far') { // in the planet's shadow, its edge soft over a tenth of the radius
        const k = 1 - 0.7 * smooth(R * 1.0, R * 0.85, Math.abs(dx + light[0] * R * 0.4));
        c[0] *= k;
        c[1] *= k;
        c[2] *= k;
      }
      put(x, y, c, a);
    }
  }
}

/**
 * Two to four small moons about a body at (cx, cy, R; rings is Saturn's tilt), each a shaded grey sphere clear of
 * the disc and the rings; without a body, scattered. Answers how many were drawn.
 */
function moons(ctx, body, light, seedHue, off) {
  const { W, H, rand } = ctx, n = 2 + Math.floor(rand() * 3), S = Math.min(W, H);
  for (let k = 0; k < n; k++) {
    const r = S * (0.012 + rand() * 0.022);
    let mx = rand() * W, my = rand() * H;
    if (body && !body.orbit) { // round the planet, in frame, clear of the disc and of the rings' ellipse
      for (let tries = 0; tries < 8; tries++) {
        const th = rand() * Math.PI * 2, d = body.R * (1.7 + rand() * 1.5);
        mx = clamp(body.cx + Math.cos(th) * d, r * 2, W - r * 2);
        my = clamp(body.cy + Math.sin(th) * d * 0.7, r * 2, H - r * 2);
        const dx = (mx - body.cx) / body.R, dy = (my - body.cy) / body.R;
        if (Math.hypot(dx, dy) > 1.25 && (!body.rings || Math.hypot(dx, dy / body.rings) > 2.45)) break;
      }
    } else if (body) my = rand() * H * 0.45; // from orbit: in the sky over the limb
    sphere(ctx, 'moon', mx, my, r, light, seedHue, off + k * 1.7);
  }
  return n;
}

/** Grey lumps of varied size, each a polygon whose radius wanders, shaded toward the light. */
function asteroids(ctx, light) {
  const { W, H, rand, poly } = ctx, n = 10 + Math.floor(rand() * 14), S = Math.min(W, H), c = [0, 0, 0];
  for (let k = 0; k < n; k++) {
    const cx = rand() * W, cy = rand() * H, r = S * (0.012 + rand() ** 2 * 0.08), pts = [], seed = rand() * 100;
    const sides = 9 + Math.floor(rand() * 5), tone = 0.35 + rand() * 0.25;
    for (let i = 0; i < sides; i++) {
      const th = (i / sides) * Math.PI * 2, rk = r * (0.7 + fbm(i * 0.9 + seed, seed, 125, 2) * 0.6);
      pts.push(cx + Math.cos(th) * rk, cy + Math.sin(th) * rk);
    }
    poly(pts, (x, y) => {
      const nx = (x - cx) / r, ny = (y - cy) / r;
      const lam = clamp(0.2 + 0.8 * (nx * light[0] + ny * light[1] + 0.5 * light[2]));
      const g = tone * lam * (0.85 + 0.3 * fbm(x / 6, y / 6, 126, 2));
      c[0] = g;
      c[1] = g;
      c[2] = g * 1.03;
      return c;
    });
  }
}

/** The space family's one pass: the sky, the nebula or galaxy, the body and its rings, the asteroids. */
export function spacePass(ctx) {
  const { W, H, rand, scene, layout } = ctx, sp = scene.space ?? {};
  layout.horizon = null;
  layout.shore = null;
  layout.family = 'space';
  layout.planet = null;
  layout.moons = 0;
  starSky(ctx);
  // The light: from one side and a little above, mostly toward the viewer, so the terminator shows as a crescent
  // of night on the far side; the same vector lights the rings and the asteroids.
  const side = rand() < 0.5 ? -1 : 1, lz = 0.4 + rand() * 0.35, ly = -(0.1 + rand() * 0.3);
  const lx = side * Math.sqrt(Math.max(0, 1 - lz * lz - ly * ly)), light = [lx, ly, lz];
  const seedHue = rand(), off = rand() * Math.PI * 2;
  if (sp.nebula) nebula(ctx);
  if (sp.galaxy) galaxy(ctx);
  brightStars(ctx, Math.max(4, Math.min(40, Math.round(18 * (W * H) / (1280 * 720)))));
  const body = sp.body ?? ('moon' in (scene.things ?? {}) ? 'moon' : null);
  let about = null; // where the body stands, for its moons
  if (body) {
    if (sp.orbit) { // low over the body: a huge disc whose limb crosses the bottom third
      const R = 1.6 * Math.max(W, H), cy = 0.63 * H + R, cx = W / 2;
      const air = ATMOSPHERE[body];
      if (air) { // the atmosphere's band above the limb
        const thick = 0.07 * H;
        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const d = cy - Math.sqrt(Math.max(0, R * R - (x + 0.5 - cx) ** 2)) - (y + 0.5);
            if (d < 0 || d > thick * 3) continue;
            ctx.put(x, y, air, 0.5 * Math.exp(-((d / thick) ** 2)) * smooth(-0.3, 0.3, light[2]));
          }
        }
      }
      // The light from the side, so the terminator crosses the visible stretch of the surface.
      sphere(ctx, body, cx, cy, R, [side * 0.9, -0.28, 0.32], seedHue, off, R / (0.3 * Math.min(W, H)));
      layout.planet = { cx: 0.5, cy: cy / H, r: R / Math.min(W, H), body, orbit: true };
      about = { cx, cy, R, orbit: true };
    } else {
      const saturn = body === 'saturn', S = Math.min(W, H);
      const R = S * (saturn ? 0.17 + rand() * 0.04 : 0.22 + rand() * 0.08);
      const cx = W * (0.38 + rand() * 0.24), cy = H * (0.4 + rand() * 0.18), tilt = 0.25 + rand() * 0.3;
      if (saturn) rings(ctx, cx, cy, R, tilt, light, 'far');
      sphere(ctx, body, cx, cy, R, light, seedHue, off);
      if (saturn) rings(ctx, cx, cy, R, tilt, light, 'near');
      layout.planet = { cx: cx / W, cy: cy / H, r: R / S, body, orbit: false, rings: saturn ? { tilt } : null };
      about = { cx, cy, R, orbit: false, rings: saturn ? tilt : null };
    }
  }
  if (sp.moons) layout.moons = moons(ctx, about, light, seedHue, off);
  if (sp.asteroids) asteroids(ctx, light);
}

export function installSpace() {
  register('families', {
    id: 'space', detect: (scene) => scene.family === 'space', passes: [spacePass, finishPass], words: WORDS, apply,
  });
}

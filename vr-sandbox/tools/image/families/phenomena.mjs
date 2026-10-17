// The sky's phenomena in a landscape: a rainbow, the aurora, lightning. Each is a thing with no footprint (sky: true,
// so the reader counts it by its word and thingsPass hands its box to the layout) and is painted by phenomenaPass,
// which the scene-families hook puts into the landscape family's list right after cloudPass: the rainbow and the
// aurora stand in the air behind the land, the fork comes down from the cloud base. A rainbow is a 7-band arc
// opposite the sun by day, fading at its ends and under a storm, with a fainter reversed secondary bow; it is drawn
// only when the word is given (rain alone does not raise one, so the pictures that rain keep their look). The aurora
// is green-violet vertical curtains over the stars at night. Lightning is a seeded jagged white fork with branches
// and a brief glow on the clouds; the reader's storm condition already claims 'lightning', so the storm comes with
// it. Two conditions keep the hour honest: an aurora turns the time to night and a rainbow turns a night to day,
// each said in scene.overridden. 'northern lights': 'northern' is the aurora's word; 'lights' is claimed beside it
// by a words-only family entry (never painted) and goes back among the ignored words otherwise.
import { clamp, fbm, lerp, mix, smooth } from '../math.mjs';
import { register } from '../registry.mjs';
import { dropWord } from './abstract.mjs';

const BANDS = [ // outside in: red to violet, as the primary bow lays them
  [1, 0.15, 0.1], [1, 0.55, 0.1], [1, 0.95, 0.2], [0.2, 0.85, 0.25], [0.15, 0.55, 1], [0.25, 0.2, 0.8], [0.6, 0.2, 0.8],
];
const AURORA_LOW = [0.2, 0.95, 0.45], AURORA_HIGH = [0.55, 0.2, 0.75];
const BOLT = [0.96, 0.96, 1], FLASH = [0.75, 0.75, 0.9];

/** The box a phenomenon painted, for the thing's draw() to hand to the layout; nothing when it was not painted. */
const boxOf = (ctx, id, inst) => ctx.phenomena?.[id] ?? { x: inst.ux * ctx.W, y: inst.uy * ctx.H, w: 0, h: 0 };

// ── The rainbow ────────────────────

/** A 7-band arc opposite the sun, the bow's top a quarter of the way down, fading at its feet; a faint secondary. */
function rainbow(ctx) {
  const { W, H, hy, sun, scene, put, scale } = ctx, cx = W * (1 - sun.x), cy = hy + 0.22 * H;
  const r = Math.max(2, cy - 0.14 * H), band = Math.max(1.2 * scale, r * 0.014), width = band * BANDS.length;
  const strength = (scene.storm ? 0.3 : 0.55) * (1 - scene.fog * 0.5) * (0.6 + 0.4 * ctx.gloom);
  const bow = (R, k, reversed) => {
    const y0 = Math.max(0, Math.floor(cy - R - width)), y1 = Math.min(Math.ceil(hy), Math.ceil(cy));
    const x0 = Math.max(0, Math.floor(cx - R - width)), x1 = Math.min(W - 1, Math.ceil(cx + R + width));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - (R - width);
        if (d < -1 || d > width + 1) continue;
        let i = Math.floor(d / band);
        if (i < 0 || i >= BANDS.length) continue;
        if (reversed) i = BANDS.length - 1 - i;
        const edge = Math.min(1, d + 1, width + 1 - d); // the bow's outer and inner edge land between pixels
        const foot = smooth(hy, hy - 0.35 * (hy - (cy - R)), y); // fading toward the horizon at each foot
        put(x, y, BANDS[i], strength * k * clamp(edge) * (0.35 + 0.65 * foot));
      }
    }
  };
  bow(r, 1, false);
  bow(r * 1.22, 0.3, true);
  const top = cy - r - width;
  return { x: cx - r - width, y: top, w: 2 * (r + width), h: Math.max(1, hy - top) };
}

// ── The aurora ─────────────────────

/** Green curtains hanging from a wavy band, violet above, rayed by fine vertical noise, over the stars. */
function aurora(ctx) {
  const { W, H, hy, rand, put, scene } = ctx, off = rand() * 20, c = [0, 0, 0], k = 1 - scene.clouds * 0.5;
  const top = Math.floor(hy * 0.08), bottom = Math.ceil(hy * 0.85);
  for (let x = 0; x < W; x++) {
    const u = x / W, base = hy * (0.45 + (fbm(u * 2.5 + off, 0.5, 161, 3) - 0.5) * 0.5); // the curtain's lower edge
    const tall = hy * (0.3 + fbm(u * 3 + off, 2.5, 162, 2) * 0.35), ray = 0.4 + 0.6 * fbm(u * 60 + off, 1, 163, 3);
    const bright = 0.25 + 0.75 * fbm(u * 6 + off, 3.5, 164, 3);
    for (let y = top; y < bottom; y++) {
      const up = (base - y) / tall;
      if (up < -0.15 || up > 1.4) continue;
      const a = smooth(-0.15, 0.1, up) * smooth(1.4, 0.35, up) * ray * bright * 0.7 * k;
      if (a <= 0.003) continue;
      mix(AURORA_LOW, AURORA_HIGH, smooth(0.15, 0.9, up), c);
      put(x, y, c, a);
    }
  }
  return { x: 0, y: top, w: W, h: bottom - top };
}

// ── The lightning ──────────────────

/** A jagged fork from the cloud base to the horizon with branches, glowing, and a flash on the clouds at its root. */
function lightning(ctx) {
  const { W, H, hy, rand, line, put, scale } = ctx, x0 = W * (0.2 + rand() * 0.6), y0 = H * (0.08 + rand() * 0.12);
  const step = H / 28, points = [[x0, y0]], flash = (x, y, reach, a) => {
    for (let py = Math.max(0, y - reach) | 0; py <= Math.min(H - 1, y + reach); py++) {
      for (let px = Math.max(0, x - reach) | 0; px <= Math.min(W - 1, x + reach); px++) {
        const d = Math.hypot(px + 0.5 - x, py + 0.5 - y) / reach;
        if (d < 1) put(px, py, FLASH, a * Math.exp(-d * d * 4) * (1 - d));
      }
    }
  };
  flash(x0, y0, H * 0.25, 0.45); // the glow on the clouds
  const fork = (x, y, drift, width, depth, until) => {
    let px = x, py = y, bend = drift;
    while (py < until) {
      bend += (rand() - 0.5) * 0.9;
      bend = clamp(bend, -1.2, 1.2);
      const nx = px + bend * step, ny = py + step * (0.6 + rand() * 0.6);
      // The core never under a pixel (at 180 rows 2.2 * scale is half of one, and a half-covered stroke is grey)
      line(px, py, nx, ny, Math.max(2.5, width * 3.5 * scale), BOLT, 0.18, Math.max(2, 4 * scale)); // the glow
      line(px, py, nx, ny, Math.max(1, width * scale), BOLT, 0.95);
      points.push([nx, ny]);
      if (depth > 0 && rand() < 0.3) {
        const side = rand() < 0.5 ? -1 : 1;
        fork(nx, ny, bend + side * 0.8, width * 0.55, depth - 1, lerp(ny, until, 0.3 + rand() * 0.4));
      }
      px = nx;
      py = ny;
    }
  };
  fork(x0, y0, (rand() - 0.5) * 0.6, 2.2, 2, hy);
  let minX = Infinity, maxX = -Infinity;
  for (const [x] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  return { x: minX - 2, y: y0, w: maxX - minX + 4, h: hy - y0 };
}

/** The phenomena the scene names, painted after the clouds; nothing is drawn (and no rand is spent) without a word. */
export function phenomenaPass(ctx) {
  const { usual, L, scene } = ctx;
  ctx.phenomena = {};
  if (usual('rainbow', 1) > 0 && !L.sunk) ctx.phenomena.rainbow = rainbow(ctx);
  if (usual('aurora', 1) > 0 && scene.time === 'night') ctx.phenomena.aurora = aurora(ctx);
  if (usual('lightning', 1) > 0) ctx.phenomena.lightning = lightning(ctx);
}

/** A thing with no footprint: the reader counts its word, phenomenaPass paints it, draw() hands its box on. */
const phenomenon = (id, match) => ({
  id, match, usual: 1, sky: true, band: null, draw: (ctx, inst) => boxOf(ctx, id, inst),
});

export function installPhenomena() {
  register('things', phenomenon('rainbow', /^rainbows?$/));
  register('things', phenomenon('aurora', /^(auroras?|borealis|northern)$/));
  register('things', phenomenon('lightning', /^(lightning|thunderbolts?)$/));
  register('families', { // 'lights' beside the northern lights: claimed, never painted; elsewhere left as unknown
    id: 'aurora-lights', detect: () => false, passes: [], words: /^lights$/,
    apply: (scene, word) => {
      if (!scene.instances.some((i) => i.kind === 'aurora')) dropWord(scene, word);
    },
  });
  register('conditions', {
    id: 'aurora-night', kind: 'weather', match: /^(auroras?|borealis|northern)$/,
    apply: (s) => { // an aurora is seen at night: a daytime one is turned to night, and said
      if (s.time === 'night') return;
      s.overridden.push({ what: 'time', from: s.time, to: 'night', because: 'aurora' });
      s.time = 'night';
      s.hour = 23;
    },
  });
  register('conditions', {
    id: 'rainbow-day', kind: 'weather', match: /^rainbows?$/,
    apply: (s) => { // a rainbow needs the sun: a night one is turned to day, and said
      if (s.time !== 'night') return;
      s.overridden.push({ what: 'time', from: 'night', to: 'day', because: 'rainbow' });
      s.time = 'day';
      s.hour = 12;
    },
  });
}

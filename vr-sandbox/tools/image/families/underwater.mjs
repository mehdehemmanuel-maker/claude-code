// The underwater family: a blue gradient darker downward, light rays from the top (godrays by noise), a sandy seabed
// with caustics, coral silhouettes and fans in warm colours, kelp, bubbles rising, a few fish as simple lens shapes
// with tails (creatures-flyers will own fish proper later: these are minimal and 'fish' is read only inside this
// family), and a diver when the words say diving, diver or scuba. No horizon. Words: underwater, undersea, coral(s),
// reef(s), diving, diver(s), scuba, seabed, aquarium claim the family; fish is its detail and goes back among the
// ignored words when the family is not chosen. 'coral' before a colour word or a sky word (coral pink, a coral
// sunset) is a colour, not the reef: it goes back among the ignored words unless another word claims the family.
import { clamp, fbm, h2, lerp, mix, noise, smooth } from '../math.mjs';
import { COLOURS, NUMBERS, words } from '../read.mjs';
import { register } from '../registry.mjs';
import { finishPass } from '../passes.mjs';
import { dropWord, note, noteUndrawn, undrop } from './abstract.mjs';

export const WORDS = /^(underwater|undersea|corals?|reefs?|diving|divers?|scuba|seabed|aquarium|fish|fishes)$/;
const HEAD = /^(underwater|undersea|corals?|reefs?|diving|divers?|scuba|seabed|aquarium)$/;

/** The number before `word` in the prompt ("three fish"), or null. */
function countBefore(scene, word) {
  const ws = words(scene.prompt), at = ws.indexOf(word);
  for (let j = at - 1; j >= Math.max(0, at - 2); j--) {
    if (/^\d+$/.test(ws[j])) return Math.min(40, +ws[j]);
    if (NUMBERS[ws[j]] !== undefined && !/^an?$/.test(ws[j])) return Math.min(40, NUMBERS[ws[j]]);
  }
  return null;
}

/** The words a 'coral' colours when it comes before them: a sky, a sunset, a dusk or dawn. */
const SKY = /^(sky|skies|sunsets?|sunrises?|dusk|dawn|clouds?|glow|light)$/;
/** Whether 'coral' is a colour here: the word after it is a colour or a sky word ('coral pink', 'a coral sunset'). */
function coralColour(scene, word) {
  if (!/^corals?$/.test(word)) return false;
  const ws = words(scene.prompt), next = ws[ws.indexOf(word) + 1];
  return !!next && (!!COLOURS[next] || SKY.test(next));
}

function apply(scene, word) {
  const u = scene.underwater ??= { fish: null, diver: false, dropped: [] };
  if (coralColour(scene, word) && scene.family !== 'underwater') {
    u.dropped.push(word);
    dropWord(scene, word);
    return;
  }
  if (HEAD.test(word) && scene.family !== 'underwater') {
    scene.family = 'underwater';
    undrop(scene, u.dropped);
    note(scene, 'painted by the underwater family (no sky, no horizon): the light comes down through the water');
    noteUndrawn(scene, 'an underwater picture has no ground above the water');
  }
  if (/^(diving|divers?|scuba)$/.test(word)) u.diver = true;
  if (/^fish(es)?$/.test(word)) {
    if (scene.family === 'underwater') u.fish = countBefore(scene, word) ?? 6;
    else {
      u.fish = countBefore(scene, word) ?? 6;
      u.dropped.push(word);
      dropWord(scene, word);
    }
  }
}

// ── The water ──────────────────────

const TOP = [0.12, 0.56, 0.72], DEEP = [0.02, 0.09, 0.26], RAY = [0.6, 0.9, 0.95], SAND = [0.80, 0.70, 0.48];
const CAUSTIC = [0.85, 0.96, 0.96];
const CORALS = [[0.95, 0.45, 0.25], [0.9, 0.3, 0.45], [0.85, 0.25, 0.2], [0.6, 0.3, 0.7], [0.95, 0.7, 0.2]];
const KELP = [0.15, 0.45, 0.25], BUBBLE = [0.8, 0.95, 1];

/** The gradient, the rays and the seabed with its caustics, row by row. */
function water(ctx, bed, dim) {
  const { W, H, data, sun, rand } = ctx, c = [0, 0, 0], slant = (sun.left ? 1 : -1) * 0.35, off = rand() * 20;
  const sand = mix(SAND, DEEP, 0.18);
  for (let y = 0; y < H; y++) {
    const t = y / H;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3, yb = bed[x];
      mix(TOP, DEEP, smooth(0, 1, t) ** 0.8, c);
      if (y < yb) { // open water: the rays
        const u = (x + y * slant) / W, ray = fbm(u * 14 + off, 0.3 + t * 0.4, 141, 3);
        const r = clamp((ray - 0.5) * 3) ** 2 * (1 - t) ** 2.2 * 0.55;
        mix(c, RAY, r, c);
      } else { // the seabed, ribbed by the swell, lit by caustics that fade with the depth
        const into = (y - yb) / Math.max(1, H - yb), n = fbm(x / 30, y / 6, 142, 3);
        mix(sand, c, 0.12 + into * 0.3, c);
        const tone = 0.85 + n * 0.3;
        c[0] *= tone;
        c[1] *= tone;
        c[2] *= tone;
        const k1 = 1 - Math.abs(2 * noise(x / 22 + off, y / 9, 143) - 1); // two ridged fields: bright lines where
        const k2 = 1 - Math.abs(2 * noise(x / 17 + 5, y / 7, 144) - 1); // their creases cross
        const caustic = Math.max(0, (k1 + k2) / 2 - 0.5) * 2.2 * (1 - into * 0.8);
        mix(c, CAUSTIC, clamp(caustic) * 0.55, c);
      }
      data[i] = c[0] * dim;
      data[i + 1] = c[1] * dim;
      data[i + 2] = c[2] * dim;
    }
  }
}

// ── What lives there ───────────────

/** A branching coral: three levels of strokes that fork and thin. */
function branching(ctx, x, y, size, c) {
  const { line } = ctx;
  const grow = (px, py, ang, len, w, depth, key) => {
    const nx = px + Math.cos(ang) * len, ny = py - Math.sin(ang) * len;
    line(px, py, nx, ny, w, c);
    if (depth === 0) return;
    const forks = 2 + (h2(key, depth, 145) < 0.4 ? 1 : 0);
    for (let k = 0; k < forks; k++) {
      const spread = (k - (forks - 1) / 2) * (0.55 + h2(key, k, 146) * 0.3);
      grow(nx, ny, ang + spread, len * (0.6 + h2(key, k, 147) * 0.15), w * 0.65, depth - 1, key * 3 + k + 1);
    }
  };
  grow(x, y, Math.PI / 2 + (h2(x | 0, y | 0, 148) - 0.5) * 0.4, size * 0.4, Math.max(1, size * 0.09), 3, (x | 0) + 1);
}

/** A sea fan: a half disc with radial ribs and a scalloped edge. */
function fan(ctx, x, y, size, c) {
  const { poly, line } = ctx, pts = [x, y], n = 16, dark = mix(c, [0, 0, 0.1], 0.35);
  for (let i = 0; i <= n; i++) {
    const th = Math.PI * (1 - i / n), r = size * (0.85 + 0.15 * (i % 2));
    pts.push(x + Math.cos(th) * r, y - Math.sin(th) * r * 0.9);
  }
  poly(pts, c, 0.88);
  for (let i = 1; i < 8; i++) {
    const th = Math.PI * i / 8;
    line(x, y, x + Math.cos(th) * size * 0.8, y - Math.sin(th) * size * 0.72, Math.max(0.8, size * 0.03), dark, 0.7);
  }
}

/** A brain coral: a dome with wandering darker grooves. */
function brain(ctx, x, y, size, c) {
  const { ellipse } = ctx, groove = mix(c, [0, 0, 0.1], 0.4), out = [0, 0, 0];
  ellipse(x, y, size, size * 0.6, (px, py) => {
    const g = Math.sin((fbm(px / (size * 0.3), py / (size * 0.3), 149, 2) - 0.5) * 24);
    return mix(c, groove, smooth(0.3, 0.8, g), out);
  });
}

/** Tube sponges: a few upright rounded tubes with dark mouths. */
function tubes(ctx, x, y, size, c) {
  const { rect, ellipse } = ctx, n = 3 + ((x | 0) % 3), dark = mix(c, [0, 0, 0.1], 0.5);
  for (let k = 0; k < n; k++) {
    const h = size * (0.6 + h2(k, x | 0, 150) * 0.7), w = Math.max(1.5, size * 0.18);
    const tx = x + (k - (n - 1) / 2) * w * 1.4;
    rect(tx - w / 2, y - h, w, h, c);
    ellipse(tx, y - h, w / 2, w / 4, dark);
  }
}

/** Kelp: a wavy strand of short strokes rising from the bed. */
function kelp(ctx, x, y, size, c) {
  const { line } = ctx, segs = 10, sway = size * 0.12;
  let px = x, py = y;
  for (let i = 1; i <= segs; i++) {
    const nx = x + Math.sin(i * 0.9 + x * 0.01) * sway * (i / segs), ny = y - size * i / segs;
    line(px, py, nx, ny, Math.max(1, size * 0.05 * (1 - i / segs) + 0.8), c, 0.9);
    px = nx;
    py = ny;
  }
}

/** A fish: a lens body, a forked tail, a small dorsal fin, an eye; heading `dir`. */
function fish(ctx, x, y, len, dir, c) {
  const { poly, disc } = ctx, h = len * 0.42, pts = [], n = 10, stripe = mix(c, [0, 0, 0.1], 0.5), out = [0, 0, 0];
  const along = (i) => x - dir * len / 2 + dir * len * i / n, bulge = (i) => Math.sin(Math.PI * i / n) * h / 2;
  for (let i = 0; i <= n; i++) pts.push(along(i), y - bulge(i));
  for (let i = n - 1; i > 0; i--) pts.push(along(i), y + bulge(i));
  poly(pts, (px) => (Math.abs(((px - x) * dir) / len + 0.1) < 0.08 ? stripe : mix(c, out, 0, out)));
  const tail = x - dir * len / 2;
  poly([tail, y, tail - dir * len * 0.3, y - h * 0.55, tail - dir * len * 0.3, y + h * 0.55], c);
  poly([x - dir * len * 0.15, y - h / 2, x + dir * len * 0.1, y - h / 2, x - dir * len * 0.05, y - h * 0.9], c);
  disc(x + dir * len * 0.3, y - h * 0.1, Math.max(0.6, len * 0.05), [0.05, 0.05, 0.08]);
}

/** A column of bubbles rising from (x, y), each a ring with a highlight. */
function bubbles(ctx, x, y, count, scale) {
  const { disc } = ctx;
  for (let k = 0; k < count; k++) {
    const by = y - k * 9 * scale * (1 + k * 0.08), bx = x + Math.sin(k * 1.7) * 4 * scale, r = (1 + k * 0.35) * scale;
    if (by < -r) break;
    disc(bx, by, r, BUBBLE, (px, py) => 0.12 + 0.6 * smooth(r * 0.55, r, Math.hypot(px - bx, py - by)));
    disc(bx - r * 0.35, by - r * 0.35, Math.max(0.5, r * 0.25), [1, 1, 1], 0.8);
  }
}

/** A diver: a dark silhouette swimming level, body, head, arms, legs with fins, a tank, bubbles from the mask. */
function diver(ctx, x, y, len, dir) {
  const { ellipse, disc, line } = ctx, c = [0.06, 0.07, 0.1], h = len * 0.22;
  ellipse(x, y, len * 0.3, h / 2, c);
  disc(x + dir * len * 0.36, y - h * 0.1, h * 0.42, c);
  ellipse(x - dir * len * 0.05, y - h * 0.45, len * 0.18, h * 0.3, [0.5, 0.52, 0.55]); // the tank
  line(x + dir * len * 0.2, y + h * 0.3, x + dir * len * 0.5, y + h * 0.5, Math.max(1, h * 0.25), c);
  for (const [dy, k] of [[0.1, 1], [-0.1, 0.9]]) {
    line(x - dir * len * 0.28, y + h * dy, x - dir * len * 0.52, y + h * (dy + 0.15 * k), Math.max(1, h * 0.28), c);
    const knee = y + h * (dy + 0.15 * k);
    line(x - dir * len * 0.52, knee, x - dir * len * 0.68, y + h * (dy - 0.05), Math.max(1, h * 0.12), c); // the fin
  }
  return { x: x + dir * len * 0.42, y: y - h * 0.3 };
}

/** The underwater family's one pass. */
export function underwaterPass(ctx) {
  const { W, H, rand, scene, layout, scale, ellipse } = ctx, u = scene.underwater ?? {};
  layout.horizon = null;
  layout.shore = null;
  layout.family = 'underwater';
  const dim = scene.time === 'night' ? 0.35 : 1, off = rand() * 10, bed = new Float32Array(W);
  for (let x = 0; x < W; x++) bed[x] = H * (0.74 + (fbm((x / W) * 3 + off, 0.5, 151, 3) - 0.5) * 0.08);
  water(ctx, bed, dim);
  layout.seabed = 0.74;
  const S = Math.min(W, H), corals = [], c = [0, 0, 0];
  const n = 6 + Math.floor(rand() * 7);
  for (let k = 0; k < n; k++) {
    const x = rand() * W, depth = rand(), y = lerp(bed[clamp(x | 0, 0, W - 1)] + 2, H - 1, depth * 0.9);
    const size = S * (0.05 + depth * 0.14), kind = rand(), colour = CORALS[Math.floor(rand() * CORALS.length)];
    mix(colour, DEEP, (1 - depth) * 0.4, c);
    const col = [c[0] * dim, c[1] * dim, c[2] * dim];
    corals.push({ x, y, size, depth });
    ellipse(x, y, size * 0.9, size * 0.12, [0.02, 0.05, 0.12], 0.35, Math.max(2, size * 0.1)); // its shadow on the sand
    if (kind < 0.3) branching(ctx, x, y, size, col);
    else if (kind < 0.5) fan(ctx, x, y, size * 0.8, col);
    else if (kind < 0.7) brain(ctx, x, y, size * 0.6, col);
    else if (kind < 0.85) tubes(ctx, x, y, size * 0.8, col);
    else kelp(ctx, x, y, size * 2.2, [KELP[0] * dim, KELP[1] * dim, KELP[2] * dim]);
  }
  corals.sort((a, b) => a.depth - b.depth);
  const fishCount = u.fish ?? 5, dir = rand() < 0.5 ? -1 : 1, school = fishCount >= 6;
  const fx = W * (0.3 + rand() * 0.4), fy = H * (0.25 + rand() * 0.3), placed = [];
  for (let k = 0; k < fishCount; k++) {
    const x = school ? fx + (rand() - 0.5) * W * 0.35 : rand() * W, y = school ? fy + (rand() - 0.5) * H * 0.25
      : H * (0.1 + rand() * 0.55);
    const len = S * (0.045 + rand() * 0.04) * (school ? 0.8 : 1), own = school ? dir : rand() < 0.5 ? -1 : 1;
    const base = CORALS[(k + 4) % CORALS.length], far = rand() * 0.5;
    mix(base, DEEP, far, c);
    fish(ctx, x, y, len, own, [c[0] * dim, c[1] * dim, c[2] * dim]);
    placed.push({ x: x / W, y: y / H, len: len / S });
  }
  layout.fish = placed;
  let bubbleColumns = 0;
  if (u.diver) {
    const mouth = diver(ctx, W * (0.3 + rand() * 0.4), H * (0.2 + rand() * 0.2), S * 0.4, dir);
    bubbles(ctx, mouth.x, mouth.y, 9, scale);
    bubbleColumns++;
  }
  for (let k = 0; k < 2 + Math.floor(rand() * 2); k++) { // bubbles from the corals
    const from = corals[Math.floor(rand() * corals.length)];
    if (!from) break;
    bubbles(ctx, from.x + (rand() - 0.5) * from.size, from.y - from.size * 0.5, 5 + Math.floor(rand() * 5), scale);
    bubbleColumns++;
  }
  layout.bubbles = bubbleColumns;
  layout.corals = corals.length;
}

export function installUnderwater() {
  register('families', {
    id: 'underwater', detect: (scene) => scene.family === 'underwater', passes: [underwaterPass, finishPass],
    words: WORDS, apply,
  });
}

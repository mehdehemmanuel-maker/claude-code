// The portrait family: a stylised face, not a likeness of anyone (the scene's notes say so). A centred head oval
// with neck and shoulders, in the proportions of an adult head (figures-creatures-structures.json, people.adult,
// Drillis & Contini fractions: head 0.22 m tall by 0.15 m wide, shoulders 0.46 m across, the neck 0.09 m; the eye
// line at the head's half height and the pupils 0.063 m apart are the usual artist's proportions, typical), hair in
// the colour the words name before 'hair' (or a seeded natural one) in a style by seed (short, long, bun, curly as
// clusters of blobs), eyes with iris and highlight, brows, the nose as a shadow stroke, a mouth, a skin tone from a
// seeded set, a plain or gradient backdrop and a soft shadow. Words: portrait, face, selfie, headshot claim the
// family when no landscape thing is named ('face' not after cliff, rock, north, south, east or west: a cliff face
// is a landscape's); woman, man, girl, boy when they stand alone (every other word known and
// none a landscape's: not 'a woman by a lake');
// hair, eyes, beard, glasses, smiling, blonde, brunette, redhead are its details and go back among the ignored
// words when the family is not chosen. 'person' is left to creatures-flyers: the reader's own tests keep it among the
// ignored words beside a forklift, and a family's claim always counts as recognised.
import { clamp, h2, mix, smooth } from '../math.mjs';
import { COLOURS, knows, words } from '../read.mjs';
import { register } from '../registry.mjs';
import { finishPass } from '../passes.mjs';
import { bare, dropWord, hsl, note, undrop } from './abstract.mjs';

export const WORDS = new RegExp(
  '^(portrait|face|woman|man|girl|boy|selfie|headshot|hair|eyes|beard|blonde|blond|brunette|redhead|smiling' +
  '|glasses)$',
);
const HEAD = /^(portrait|face|selfie|headshot)$/, PERSON = /^(woman|man|girl|boy)$/;
/** The shell's note when this family paints: creatures-flyers hands a bare person word here with the same words. */
export const PORTRAIT_NOTE =
  'painted by the portrait family (no ground, no horizon): a stylised face, not a likeness of anyone';

/**
 * Every word of the prompt is known and none names a landscape (a lake, night: bare()): nothing else is asked for,
 * so a person word alone means a portrait; 'a woman by a lake' leaves the woman to creatures-flyers.
 */
const alone = (scene) => words(scene.prompt).every(knows) && bare(scene);
/** The words a 'face' follows when it is a landscape's side, not a person's: a cliff face, the north face. */
const SIDE = /^(cliffs?|rocks?|north|south|east|west|northern|southern|eastern|western)$/;
const sideFace = (scene, word) => {
  if (word !== 'face') return false;
  const ws = words(scene.prompt), at = ws.indexOf('face');
  return at > 0 && SIDE.test(ws[at - 1]);
};

function apply(scene, word) {
  const p = scene.portrait ??= { words: [], dropped: [] };
  const claim = (HEAD.test(word) && !sideFace(scene, word)) || (PERSON.test(word) && alone(scene));
  if (scene.family !== 'portrait' && scene.instances.length === 0 && claim) {
    scene.family = 'portrait';
    undrop(scene, p.dropped);
    note(scene, PORTRAIT_NOTE);
  }
  if (scene.family === 'portrait') p.words.push(word);
  else {
    p.dropped.push(word);
    dropWord(scene, word);
  }
}

// ── The looks ──────────────────────

/** Skin tones: a stylised set spanning light to deep, not anyone's. */
const SKIN = [
  [0.96, 0.80, 0.69], [0.90, 0.70, 0.56], [0.80, 0.58, 0.42], [0.62, 0.42, 0.28], [0.44, 0.28, 0.18],
  [0.95, 0.85, 0.76],
];
/** Natural hair colours, and the colour words as hair (red hair is auburn, not a pillar-box red). */
const HAIR = {
  black: [0.08, 0.07, 0.08], brown: [0.35, 0.22, 0.12], blonde: [0.85, 0.70, 0.40], auburn: [0.58, 0.20, 0.08],
  grey: [0.72, 0.72, 0.72], chestnut: [0.45, 0.26, 0.14],
};
const HAIR_WORDS = {
  red: HAIR.auburn, orange: [0.75, 0.35, 0.12], yellow: HAIR.blonde, gold: HAIR.blonde, brown: HAIR.brown,
  black: HAIR.black, grey: HAIR.grey, gray: HAIR.grey, silver: HAIR.grey, white: [0.9, 0.9, 0.9],
  blonde: HAIR.blonde, blond: HAIR.blonde, brunette: HAIR.brown, redhead: HAIR.auburn,
};
const EYES = [[0.35, 0.22, 0.12], [0.25, 0.45, 0.65], [0.3, 0.5, 0.3], [0.45, 0.35, 0.2], [0.4, 0.4, 0.45]];
const LIP = [0.72, 0.35, 0.35];

/** The colour word before `after` in the prompt (within two words), or null. */
function colourBefore(scene, after) {
  const ws = words(scene.prompt);
  for (let i = 0; i < ws.length; i++) {
    if (!after.test(ws[i])) continue;
    for (let j = i - 1; j >= Math.max(0, i - 2); j--) if (COLOURS[ws[j]] || HAIR_WORDS[ws[j]]) return ws[j];
  }
  return null;
}

/** What the words and the seed decide: hair colour and style, skin, eyes, glasses, beard, the smile, the clothing. */
function looks(ctx) {
  const { rand, scene } = ctx, said = scene.portrait?.words ?? [], ws = words(scene.prompt);
  const feminine = said.some((w) => /^(woman|girl)$/.test(w)), masculine = said.some((w) => /^(man|boy)$/.test(w));
  const hairWord = colourBefore(scene, /^(hair|haired)$/) ??
    ws.find((w) => /^(blonde|blond|brunette|redhead)$/.test(w));
  const natural = Object.keys(HAIR), r = rand();
  const hair = hairWord ? HAIR_WORDS[hairWord] ?? COLOURS[hairWord] : HAIR[natural[Math.floor(r * natural.length)]];
  const styles = feminine ? ['long', 'long', 'bun', 'curly'] : masculine ? ['short', 'short', 'curly', 'long']
    : ['short', 'long', 'bun', 'curly'];
  const style = styles[Math.floor(rand() * styles.length)];
  const skin = SKIN[Math.floor(rand() * SKIN.length)];
  const eyeWord = colourBefore(scene, /^eyes$/);
  const eye = eyeWord ? COLOURS[eyeWord] : EYES[Math.floor(rand() * EYES.length)];
  const beard = said.includes('beard') || (masculine && rand() < 0.35);
  const glasses = said.includes('glasses') || rand() < 0.15;
  const smiling = said.includes('smiling') || rand() < 0.5;
  const clothWord = ws.find((w) => COLOURS[w] && w !== hairWord && w !== eyeWord);
  const cloth = clothWord ? COLOURS[clothWord] : hsl(rand(), 0.35, 0.35);
  return { hair, style, skin, eye, beard, glasses, smiling, cloth, feminine, hairWord };
}

// ── The painting ───────────────────

/** A soft gradient backdrop in a muted seeded hue, lighter behind the head, darker at night. */
function backdrop(ctx) {
  const { W, H, rand, data, scene } = ctx, h = rand(), night = scene.time === 'night', c = [0, 0, 0];
  const a = hsl(h, 0.22, night ? 0.22 : 0.78), b = hsl(h + 0.05, 0.3, night ? 0.08 : 0.42);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const glow = Math.exp(-(((x / W - 0.5) * 2) ** 2 + ((y / H - 0.4) * 2) ** 2)); // lighter behind the head
      const t = clamp(0.3 * (x / W) + 0.7 * (y / H) + 0.25 - 0.45 * glow);
      mix(a, b, t, c);
      const i = (y * W + x) * 3;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
    }
  }
}

/** The head's frame: centre, height and width in pixels, from the picture's size. */
function frame(ctx) {
  const { W, H } = ctx, hh = Math.min(0.42 * H, 0.9 * W), hw = hh * 0.68; // 0.15 / 0.22: the adult head's ratio
  return { cx: W / 2, cy: H * 0.42, hh, hw };
}

function hairBehind(ctx, f, look) {
  const { ellipse, poly, disc, lit } = ctx, { cx, cy, hh, hw } = f, c = lit(look.hair, 0.6);
  if (look.style === 'long') {
    const top = cy - hh * 0.5, bottom = cy + hh * 0.95;
    const crown = top + hh * 0.1;
    poly([cx - hw * 0.55, crown, cx + hw * 0.55, crown, cx + hw * 0.85, bottom, cx - hw * 0.85, bottom], c);
  } else if (look.style === 'curly') {
    for (let k = 0; k < 18; k++) {
      const th = Math.PI * (0.05 + 0.9 * k / 17), r = hw * (0.2 + 0.08 * h2(k, 1, 131));
      disc(cx + Math.cos(Math.PI + th) * hw * 0.62, cy - hh * 0.1 - Math.sin(th) * hh * 0.5, r, c);
    }
  } else if (look.style === 'bun') disc(cx, cy - hh * 0.58, hw * 0.22, c);
  ellipse(cx, cy - hh * 0.12, hw * 0.56, hh * 0.46, c); // the mass behind the head, a little wider than it
}

function hairOver(ctx, f, look) {
  const { poly, lit, sun } = ctx, { cx, cy, hh, hw } = f, dark = lit(look.hair, 0.6), light = lit(look.hair, 0.95);
  const pts = [], n = 14, lineY = cy - hh * 0.18; // the hairline, wavy
  for (let i = 0; i <= n; i++) { // across the top of the head, the outer arc
    const th = Math.PI * (1 + i / n), s = Math.sin(th);
    pts.push(cx + Math.cos(th) * hw * 0.53, cy - hh * 0.05 + s * hh * 0.5);
  }
  for (let i = n; i >= 0; i--) { // back along the hairline
    const u = i / n, wave = (h2(i, 2, 132) - 0.5) * hh * 0.04 + Math.cos((u - 0.5) * Math.PI) * hh * 0.06;
    pts.push(cx + (u - 0.5) * hw * 1.0, lineY - wave);
  }
  const sc = [0, 0, 0], toLight = sun.left ? 1 : -1; // lit on the sun's side, the turn soft over a third of the width
  const shade = (x) => mix(dark, light, smooth(-0.35, 0.35, ((cx - x) / hw) * toLight), sc);
  poly(pts, shade);
  if (look.style === 'long') { // the strands framing the face
    for (const side of [-1, 1]) {
      poly([cx + side * hw * 0.5, lineY, cx + side * hw * 0.56, lineY, cx + side * hw * 0.64, cy + hh * 0.6,
        cx + side * hw * 0.52, cy + hh * 0.6], shade);
    }
  }
}

/** The portrait family's one pass: backdrop, shoulders, neck, hair behind, the head, the features, hair over. */
export function portraitPass(ctx) {
  const { W, H, scene, layout, ellipse, poly, disc, line, lit, sun } = ctx, look = looks(ctx), f = frame(ctx);
  const { cx, cy, hh, hw } = f, c = [0, 0, 0];
  layout.horizon = null;
  layout.shore = null;
  layout.family = 'portrait';
  backdrop(ctx);
  const skinLit = lit(look.skin, 0.95), skinShade = lit(look.skin, 0.55), toward = sun.left ? -1 : 1;
  // The soft shadow of the head on the backdrop, cast away from the light.
  const soft = Math.max(2, hh * 0.06);
  ellipse(cx - toward * hw * 0.25, cy + hh * 0.12, hw * 0.62, hh * 0.56, [0.05, 0.05, 0.08], 0.22, soft);
  // Shoulders: a rounded trapezoid from the neck's root to the foot of the frame, in the clothing's colour.
  const shoulderY = cy + hh * 0.5 + hh * 0.45, half = hw * 3.07 / 2; // 0.46 m across for a 0.15 m head
  const cloth = lit(look.cloth, 0.85), clothShade = lit(look.cloth, 0.55), pts = [];
  for (let i = 0; i <= 12; i++) { // the shoulders' curve, from the collar out to the arms, each side
    const u = i / 12, x = cx + (u - 0.5) * 2 * half, y = shoulderY - hh * 0.22 * (1 - Math.abs(u - 0.5) * 2) ** 0.6;
    pts.push(x, y);
  }
  pts.push(cx + half, H + 2, cx - half, H + 2);
  const sc = [0, 0, 0], toLight = sun.left ? 1 : -1;
  poly(pts, (x) => mix(clothShade, cloth, smooth(-0.3, 0.3, ((cx - x) / half) * toLight), sc));
  // The neck, with the chin's shadow on it.
  const neckW = hw * 0.38, chin = cy + hh * 0.5;
  ctx.rect(cx - neckW / 2, chin - hh * 0.1, neckW, hh * 0.42, (x, y) => (y < chin + hh * 0.12 ? skinShade : skinLit));
  hairBehind(ctx, f, look);
  // The head: an oval, lit from the sun's side, a little darker toward the chin.
  ellipse(cx, cy, hw / 2, hh / 2, (x, y) => {
    const side = ((x - cx) / (hw / 2)) * toward, down = (y - cy) / (hh / 2);
    return mix(skinShade, skinLit, clamp(0.55 + 0.35 * side - 0.2 * Math.max(0, down)), c);
  });
  for (const side of [-1, 1]) ellipse(cx + side * hw * 0.5, cy + hh * 0.02, hw * 0.07, hh * 0.09, skinShade); // ears
  // The eyes on the eye line, the pupils 0.063 m apart (0.42 of the head's width).
  const eyeDx = hw * 0.21, eyeY = cy, eyeW = hw * 0.11, eyeH = hh * 0.045, irisR = eyeH * 0.9;
  const ink = [0.08, 0.07, 0.08], white = [0.95, 0.95, 0.94], browC = lit(look.hair, 0.5);
  for (const side of [-1, 1]) {
    const ex = cx + side * eyeDx;
    ellipse(ex, eyeY, eyeW, eyeH, white);
    disc(ex, eyeY, irisR, lit(look.eye, 0.9));
    disc(ex, eyeY, irisR * 0.45, ink);
    disc(ex - toward * irisR * 0.35, eyeY - irisR * 0.35, Math.max(0.6, irisR * 0.22), [1, 1, 1]);
    line(ex - eyeW, eyeY - eyeH * 0.3, ex + eyeW, eyeY - eyeH * 0.3, Math.max(0.8, eyeH * 0.35), ink, 0.8); // the lid
    const browY = cy - hh * 0.085, lift = hh * 0.02; // the brow, arched
    line(ex - eyeW * 1.1, browY + lift, ex, browY - lift, Math.max(1, hh * 0.018), browC);
    line(ex, browY - lift, ex + eyeW * 1.1, browY + lift * 0.5, Math.max(1, hh * 0.016), browC);
  }
  // The nose: a shadow stroke down the shaded side and a shadow under the tip.
  const noseTip = cy + hh * 0.2, noseX = cx - toward * hw * 0.05;
  line(cx - toward * hw * 0.02, cy - hh * 0.02, noseX, noseTip, Math.max(1, hw * 0.03), skinShade, 0.7, 2);
  ellipse(cx, noseTip + hh * 0.03, hw * 0.1, hh * 0.025, skinShade, 0.6, 2);
  // The mouth: a line between the lips and a lower lip, curved up when smiling.
  const mouthY = cy + hh * 0.33, mouthW = hw * 0.17, curve = look.smiling ? hh * 0.03 : 0;
  const lipDark = mix(LIP, ink, 0.45), lip = lit(look.feminine ? LIP : mix(LIP, look.skin, 0.4), 0.9);
  ellipse(cx, mouthY + hh * 0.02, mouthW * 0.9, hh * 0.028, lip);
  for (let i = 0; i < 6; i++) { // the lip line as six strokes along a shallow arc
    const u0 = i / 6 - 0.5, u1 = (i + 1) / 6 - 0.5;
    const y0 = mouthY - curve * (1 - 4 * u0 * u0), y1 = mouthY - curve * (1 - 4 * u1 * u1);
    line(cx + u0 * 2 * mouthW, y0, cx + u1 * 2 * mouthW, y1, Math.max(1, hh * 0.012), lipDark, 0.9);
  }
  if (look.beard) { // a beard over the jaw, below the mouth
    const beardC = lit(look.hair, 0.6);
    const clear = (x, y) => y <= mouthY + hh * 0.05 && Math.abs(x - cx) <= mouthW * 1.4; // round the mouth
    ellipse(cx, cy + hh * 0.36, hw * 0.46, hh * 0.2, (x, y) => (clear(x, y) ? null : beardC), 0.9);
  }
  if (look.glasses) {
    const r = eyeW * 1.5, w = Math.max(1, hh * 0.01), frameC = [0.15, 0.12, 0.1];
    for (const side of [-1, 1]) {
      const ex = cx + side * eyeDx;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2, b = ((i + 1) / 24) * Math.PI * 2;
        const ax = ex + Math.cos(a) * r, ay = eyeY + Math.sin(a) * r * 0.85;
        line(ax, ay, ex + Math.cos(b) * r, eyeY + Math.sin(b) * r * 0.85, w, frameC);
      }
    }
    line(cx - eyeDx + r, eyeY, cx + eyeDx - r, eyeY, w, frameC);
  }
  hairOver(ctx, f, look);
  layout.face = {
    cx: 0.5, cy: cy / H, w: hw / W, h: hh / H, hair: look.hairWord ?? 'seeded', style: look.style,
    hairColour: look.hair,
  };
}

export function installPortrait() {
  register('families', {
    id: 'portrait', detect: (scene) => scene.family === 'portrait', passes: [portraitPass, finishPass],
    words: WORDS, apply,
  });
}

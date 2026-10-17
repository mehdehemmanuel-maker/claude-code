// The core: a scene to pixels, with nothing of Node in it, so the same files paint in a browser. paint() builds the
// context every pass shares and runs the chosen family's passes in order. The registries (registry.mjs, re-exported
// here) are ordered arrays a package extends with register(): things (what stands in a picture), families (which
// passes paint a kind of picture), styles (a finish over the whole), conditions (the words that set time, weather and
// ground); the reader consults the same arrays, so a registered thing or family word is read without an edit to it.
// What each file owns: math.mjs the numbers (noise, hashes, the generator); registry.mjs the registries and the
// vocabulary; read.mjs words to a scene; draw.mjs the anti-aliased primitives, the camera in metres (SIZES, project),
// the sun's direction, shadows and the sprite wrapper; passes.mjs the layers from the sky to the finish; things.mjs
// what stands in the picture; styles.mjs the finishes; text.mjs and font.mjs the caption; this file the context.
import { clamp, hash, lerp, mix, rng } from './math.mjs';
import { COLOURS, words } from './read.mjs';
import { celestialPass, cloudPass, finishPass, groundPass, landBehindPass, skyPass, weatherPass } from './passes.mjs';
import { drawers, thingsPass } from './things.mjs';
import { attach } from './draw.mjs';
import { styleFor } from './styles.mjs';
import { families, register, styles, things } from './registry.mjs';

// The registries, as registry.mjs holds them: the same arrays, so nothing importing them from here breaks.
export {
  things, families, styles, conditions, register, keyOf, thingFor, thingByKey, familyFor, styleNamed,
} from './registry.mjs';

// The painter's primitives, camera and sizes, for an importer that draws its own things (tools/image.d.mts types them).
export {
  SIZES, ELEVATION, elevationAt, camera, sunlight, shadowLength, shadowPoints, hull, canvas, disc, ellipse, poly, quad,
  tri, rect, line,
} from './draw.mjs';

// ── The palette by time of day ─────

export const LIGHT = {
  day: {
    top: [0.30, 0.52, 0.90], horizon: [0.72, 0.82, 0.92], sun: [1, 0.97, 0.85], light: [1, 0.97, 0.90],
    ambient: 0.55, height: 0.72, sunk: false,
  },
  dawn: {
    top: [0.35, 0.40, 0.70], horizon: [0.98, 0.70, 0.45], sun: [1, 0.80, 0.55], light: [1, 0.85, 0.65],
    ambient: 0.45, height: 0.12, sunk: false,
  },
  sunset: {
    top: [0.20, 0.18, 0.45], horizon: [0.98, 0.50, 0.25], sun: [1, 0.60, 0.30], light: [1, 0.70, 0.45],
    ambient: 0.38, height: 0.08, sunk: false,
  },
  night: {
    top: [0.02, 0.03, 0.09], horizon: [0.08, 0.10, 0.20], sun: [0.92, 0.93, 0.85], light: [0.55, 0.62, 0.80],
    ambient: 0.16, height: 0.55, sunk: true,
  },
};

// ── The built-ins ──────────────────

for (const drawer of drawers) register('things', drawer);
register('families', {
  id: 'landscape',
  detect: () => true,
  // hook for sky-light: the sun's disc goes on before the clouds, so they cross it with their own lit edges; the
  // water still reflects the clouded sky without the disc (cloudPass paints into the snapshot celestialPass takes).
  passes: [skyPass, celestialPass, cloudPass, landBehindPass, groundPass, thingsPass, weatherPass, finishPass],
});

// ── Painting ───────────────────────

/**
 * Paints a scene (from `read`) into { width, height, data: Float32Array rgb in 0..1, layout }. `style` names a
 * finish when the words did not (an unknown name is an Error listing the ids, before anything is painted) and `text`
 * a caption when the words did not; a style that asks something of the scene (minimalist: no clouds) has it first.
 */
export function paint(scene, { width = 1280, height = 720, seed, style, text } = {}) {
  const W = width, H = height;
  const data = new Float32Array(W * H * 3);
  const rand = rng(seed ?? hash(words(scene.prompt).join(' '))); // from the words, not their case or punctuation
  const styleId = scene.style ?? style, entry = styleId ? styleFor(styleId, styles) : null;
  if (entry?.scene) scene = { ...scene, ...entry.scene };
  const L = LIGHT[scene.time];
  const gloom = scene.storm ? 0.45 : clamp(1 - scene.clouds * 0.45 - scene.fog * 0.2);
  const horizon = 0.58 + (rand() - 0.5) * 0.06; // as a share of the height, from the top
  const sunX = 0.2 + rand() * 0.6;
  const sunY = horizon - L.height * horizon * (0.5 + rand() * 0.5);
  const layout = { horizon, sun: [sunX, sunY], shore: null, things: [] };
  const img = { width: W, height: H, data, layout };
  const ctx = {
    W, H, hy: horizon * H, horizon, L, gloom, sun: { x: sunX, y: sunY, left: sunX < 0.5 }, rand,
    scene, layout, data, img,
    sky: null, // the sky before the sun's disc, snapshotted by celestialPass: what water reflects
    shoreY: H, // where the water ends and the land begins, set by groundPass
    scale: H / 720, // fixed-pixel detail (stars, birds, rain, snow, windows) is sized for 720 rows and scaled by this
    style: styleId,
    text, // a caption from paint's options; scene.text (the reader's) wins over it
    things, styles,
  };
  tools(ctx);
  attach(ctx); // the primitives, the camera in metres, the sun's direction, shadow() and sprite()
  const family = families.find((f) => f.detect(scene)) ?? families[0];
  for (const pass of family.passes) pass(ctx);
  return img;
}

/** The helpers every pass and drawer shares. The colour helpers take an `out` so a hot loop need not allocate. */
function tools(ctx) {
  const { W, H, hy, L, gloom, scene, data } = ctx;
  const px = (x, y) => (y * W + x) * 3;
  // The air's colour: the horizon's, greyed by fog, and halved toward a neutral grey, so a sunset's orange haze tints
  // the far ground rather than turning it to mud (the grass stayed green under lit() and browned under air()).
  const hazeColour = mix(mix(L.horizon, [0.75, 0.78, 0.82], scene.fog * 0.5), [0.8, 0.8, 0.8], 0.5);
  const haze = 0.55 + scene.fog * 0.6;
  // The light on the ground is the scene's light mixed 35% toward white: a sunset tints the grass, it does not dye it.
  const groundLight = L.light.map((v) => v + (1 - v) * 0.35);
  ctx.px = px;
  ctx.put = (x, y, c, a = 1) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = px(x | 0, y | 0);
    data[i] = lerp(data[i], c[0], a);
    data[i + 1] = lerp(data[i + 1], c[1], a);
    data[i + 2] = lerp(data[i + 2], c[2], a);
  };
  ctx.get = (x, y, out = [0, 0, 0]) => {
    const i = px(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1));
    out[0] = data[i];
    out[1] = data[i + 1];
    out[2] = data[i + 2];
    return out;
  };
  ctx.getSky = (x, y, out = [0, 0, 0]) => {
    const i = px(clamp(x | 0, 0, W - 1), clamp(y | 0, 0, H - 1)), sky = ctx.sky;
    out[0] = sky[i];
    out[1] = sky[i + 1];
    out[2] = sky[i + 2];
    return out;
  };
  // A colour under the scene's light: k is how much of it faces the sun (0 in shade, 1 full on).
  const under = (light) => (c, k, out = [0, 0, 0]) => {
    const exposure = L.ambient + k * (1 - L.ambient);
    out[0] = c[0] * exposure * light[0] * gloom;
    out[1] = c[1] * exposure * light[1] * gloom;
    out[2] = c[2] * exposure * light[2] * gloom;
    return out;
  };
  ctx.lit = under(L.light);
  ctx.litGround = under(groundLight); // for the ground plane's own tones (grass, sand, snow, pavement)
  // A colour seen through the air: depth 0 is at hand, 1 at the horizon.
  ctx.air = (c, depth, out = [0, 0, 0]) => mix(c, hazeColour, clamp(depth * haze), out);
  const T = scene.things;
  ctx.usual = (thing, n) => (thing in T ? T[thing] || n : 0);
  ctx.foot = (fy) => (fy - hy) / (H - hy); // 0 at the horizon, 1 at the foot of the picture
  ctx.sizeAt = (fy) => 0.05 + ctx.foot(fy) * 0.95;
  ctx.col = (thing, fallback) => (scene.colours[thing] ? COLOURS[scene.colours[thing]] : fallback);
}

// ── Out of the float buffer ────────

/** The picture as 8-bit RGBA, alpha 255: what a canvas or a PNG wants. */
export function toRGBA8({ width, height, data }) {
  const out = new Uint8ClampedArray(width * height * 4);
  for (let p = 0, i = 0, o = 0; p < width * height; p++, i += 3, o += 4) {
    out[o] = Math.round(clamp(data[i]) * 255);
    out[o + 1] = Math.round(clamp(data[i + 1]) * 255);
    out[o + 2] = Math.round(clamp(data[i + 2]) * 255);
    out[o + 3] = 255;
  }
  return out;
}

/** An ImageData for a canvas where there is one, else the same shape as plain data. */
export function toImageData(img) {
  const rgba = toRGBA8(img);
  const ImageData = globalThis.ImageData;
  if (ImageData) return new ImageData(rgba, img.width, img.height);
  return { width: img.width, height: img.height, data: rgba };
}

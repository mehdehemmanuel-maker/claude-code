// Creatures, people and flying things, each from a table of figures in metres and one drawing rule per family, as
// vehicles.mjs draws every vehicle from its row. CREATURES holds ten animals (cat, dog, horse, deer, cow, sheep,
// goat, wolf, elephant, camel) with the shoulder height, the body length, the neck's length and angle (standing and
// grazing), the head, the legs, the tail and the ears, each row saying where its figures are from (the figures sheet
// scratchpad/figures/figures-creatures-structures.json, 2026-10-17: 'published', 'typical' or an 'estimate'), and
// the one or two features silhouettes.md says must not be left out (the horse's hanging head and hair tail, the
// deer's antlers and stub tail, the cow's low head and udder, the sheep's fleece, the goat's raised tail, the wolf's
// low head and straight tail, the elephant's trunk and ears, the camel's hump and U neck, the cat's ears and raised
// tail, the dog's muzzle and raised head). creature() stands a row side-on in the world: its parts in the animal's
// own frame (u metres from the rump toward the head, v up) projected through the camera at the instance's depth, the
// far legs shaded and the near legs lit, the flank lit from the sun's side, a shadow on the ground, standing or
// grazing by the seed (a herd mostly faces one way). FIGURE holds the adult and the child in fractions of stature
// (Drillis & Contini, published) and figure() draws a person standing (frontal), walking (side-on, legs apart) or
// sitting (on the ground); a crowd is 8-20 figures clustered 0.6-0.9 m apart (Fruin). FLYERS holds the airliner
// (A320), the small plane (Cessna 172), the helicopter (Bell 412), the hot-air balloon, the rocket (Falcon 9), the
// dragon (an estimate: nothing real to cite) and the kite, each drawn in the sky at the depth placement gave it; the
// birds are drawn here too (gull, crow and sparrow by word, a body dot, the wings in one of five phases, a loose V
// about the first of the flock) and bats at night; fish, whale, dolphin and shark break the water's surface (a
// whale with its spout), and a sea creature brings its water when the words name none. Everything is lit through
// ctx.lit, so the night stays dark; only a flame is painted in its own colour.
//
// The reader: a registered thing is read by its match with no edit to read.mjs. Four conditions registered here keep
// the words honest where the reader's rules cannot: the irregular plurals (people, children, men, women, sheep,
// deer, cattle: the usual number, not one), 'fish' (the underwater family's when an underwater word is named, else a
// leaping fish on the water), a sea creature's water, a collective noun (a flock of birds, a herd of cattle: bound
// to the creature word after it, else left among the ignored words), and the bare person words: woman, man, girl
// and boy are things here, marked `figure` so read.mjs's bare() still counts a prompt with nothing else of a
// landscape as bare ('a man in space' is the space family's); when the prompt is nothing but one of them and known
// words, this file hands the scene to the portrait family itself (the same family, note and record), and when a
// landscape thing or condition is named the word is a figure. 'launching' sets the rocket low on its plume,
// 'standing', 'walking' and 'sitting' pose the figures when there are figures (else they stay ignored: a sitting
// cat stands), and 'bats' turns an unsaid hour to night (said in scene.overridden).
import { clamp, fbm, h2, lerp, mix, smooth } from '../math.mjs';
import { COMPOUNDS, CONDITIONS, NUMBERS, bare, dropWord, knows, note, words } from '../read.mjs';
import { familyFor, register } from '../registry.mjs';
import { PORTRAIT_NOTE } from '../families/portrait.mjs';

// ── The figures, in metres ─────────
// shoulder: ground to the withers; body: point of chest to point of rump; depth: the body's depth (shoulder - leg);
// neck { len, up, graze }: base of skull to withers along the top line, its angle from horizontal standing and
// grazing (degrees); head { len, h, angle }: skull to muzzle, its depth, the angle it hangs from the neck's line;
// leg { len, thick }: ground to the belly, the thickness at the top; tail { len, kind }; ears { kind, size }; the
// extras a kind carries; colours: the typical ones, by seed, [r, g, b]. Every row names its source.

const BLACK = [0.08, 0.08, 0.09], WHITE = [0.9, 0.9, 0.88], CREAM = [0.88, 0.84, 0.72];

export const CREATURES = {
  cat: { // head-body 0.46, tail 0.30: Burnie & Wilson, Animal (DK), published; shoulder and leg: estimate
    name: 'domestic cat', source: 'typical (DK Animal); shoulder and leg an estimate from proportions',
    shoulder: 0.24, body: 0.35, neck: { len: 0.08, up: 35, graze: -40 }, head: { len: 0.1, h: 0.08, angle: 0 },
    leg: { len: 0.14, thick: 0.03 }, tail: { len: 0.3, kind: 'curl' }, ears: { kind: 'point', size: 0.035 },
    muzzle: 0.15, colours: [[0.45, 0.38, 0.3], BLACK, [0.8, 0.45, 0.15]], usual: 1,
  },
  dog: { // withers 0.48-0.62 (Kennel Club / AKC standards, published); the rest typical proportions (estimate)
    name: 'medium dog (collie / labrador size)', source: 'height published (breed standards); proportions estimate',
    shoulder: 0.53, body: 0.58, neck: { len: 0.18, up: 45, graze: -45 }, head: { len: 0.22, h: 0.13, angle: -10 },
    leg: { len: 0.27, thick: 0.06 }, tail: { len: 0.35, kind: 'sabre' }, ears: { kind: 'drop', size: 0.08 },
    muzzle: 0.45, colours: [BLACK, [0.8, 0.62, 0.3], [0.4, 0.26, 0.14]], usual: 2,
  },
  horse: { // 15.5 hands (BHS/FEI, published); the square horse, head 2/5 of withers, neck one head: typical
    name: 'riding horse, 15.5 hands', source: 'height range published (BHS/FEI); proportions typical',
    shoulder: 1.57, body: 1.57, neck: { len: 0.65, up: 45, graze: -60 }, head: { len: 0.6, h: 0.22, angle: -70 },
    leg: { len: 0.8, thick: 0.12 }, tail: { len: 1.0, kind: 'hair' }, ears: { kind: 'point', size: 0.12 },
    muzzle: 0.4, mane: true, dark: true, usual: 3,
    colours: [[0.4, 0.22, 0.1], [0.6, 0.3, 0.12], [0.75, 0.75, 0.72], [0.1, 0.1, 0.1]],
  },
  deer: { // red deer stag 1.05-1.30 at the shoulder, antlers to ~1 m, 12 points (Macdonald; BDS: published ranges)
    name: 'red deer stag', source: 'shoulder and antlers published ranges; neck, leg and tail an estimate',
    shoulder: 1.2, body: 1.3, neck: { len: 0.6, up: 60, graze: -50 }, head: { len: 0.45, h: 0.17, angle: -15 },
    leg: { len: 0.7, thick: 0.07 }, tail: { len: 0.15, kind: 'stub' }, ears: { kind: 'oval', size: 0.2 },
    muzzle: 0.4, antlers: { up: 0.8, beam: 0.9, spread: 0.75, points: 12 }, rump: CREAM, usual: 2,
    colours: [[0.55, 0.32, 0.15], [0.45, 0.38, 0.3]],
  },
  cow: { // Holstein ~1.47 at the withers, 680 kg (Holstein Association USA, published); proportions typical
    name: 'dairy cow (Holstein-Friesian)', source: 'height published (Holstein Association); proportions typical',
    shoulder: 1.45, body: 1.7, neck: { len: 0.4, up: 15, graze: -35 }, head: { len: 0.52, h: 0.28, angle: -25 },
    leg: { len: 0.72, thick: 0.12 }, tail: { len: 0.95, kind: 'rope' }, ears: { kind: 'side', size: 0.15 },
    muzzle: 0.35, udder: true, patches: true, usual: 4,
    colours: [WHITE, [0.55, 0.3, 0.15], [0.12, 0.12, 0.12], [0.72, 0.55, 0.35]],
  },
  sheep: { // 0.65-1.25 across breeds (Macdonald; DK), 0.75 for a lowland meat breed: typical; fleece 0.05-0.1
    name: 'domestic sheep (Suffolk / Texel type)', source: 'height range published; 0.75 and the rest typical',
    shoulder: 0.75, body: 0.75, neck: { len: 0.25, up: 30, graze: -40 }, head: { len: 0.25, h: 0.14, angle: -20 },
    leg: { len: 0.38, thick: 0.045 }, tail: { len: 0.1, kind: 'hang' }, ears: { kind: 'side', size: 0.08 },
    muzzle: 0.3, fleece: 0.07, darkFace: true, usual: 6, colours: [WHITE, CREAM, [0.3, 0.22, 0.16]],
  },
  goat: { // ADGA Alpine does 0.76 m at the withers minimum (published); body, neck and tail typical (estimate)
    name: 'dairy goat (Alpine / Nubian type)', source: 'height published (ADGA); proportions estimate',
    shoulder: 0.78, body: 0.8, neck: { len: 0.32, up: 50, graze: -35 }, head: { len: 0.25, h: 0.13, angle: -10 },
    leg: { len: 0.42, thick: 0.045 }, tail: { len: 0.15, kind: 'up' }, ears: { kind: 'drop', size: 0.2 },
    muzzle: 0.35, horns: 0.25, beard: 0.08, usual: 3, colours: [WHITE, [0.5, 0.33, 0.18], [0.15, 0.14, 0.14]],
  },
  wolf: { // 0.66-0.81 at the shoulder, tail 0.35-0.5 (Mech & Boitani; DK: published ranges); the rest estimate
    name: 'grey wolf', source: 'shoulder and tail published ranges; body, neck and leg an estimate',
    shoulder: 0.75, body: 0.9, neck: { len: 0.25, up: 25, graze: -45 }, head: { len: 0.28, h: 0.14, angle: -5 },
    leg: { len: 0.42, thick: 0.06 }, tail: { len: 0.45, kind: 'straight' }, ears: { kind: 'point', size: 0.08 },
    muzzle: 0.5, usual: 3, colours: [[0.55, 0.52, 0.48], [0.45, 0.4, 0.33], [0.85, 0.85, 0.83]],
  },
  elephant: { // bull 3.2 at the shoulder, head-body 6-7.5, ears 1.5-2, trunk 2, tusks 1.5-2.5 (Laursen & Bekoff;
    // Shoshani: published); the chest-rump body and the free leg an estimate
    name: 'African bush elephant, bull', source: 'heights, ears, trunk, tusks published; body and leg an estimate',
    shoulder: 3.2, body: 4.0, neck: { len: 0.3, up: 0, graze: -10 }, head: { len: 1.2, h: 1.3, angle: -20 },
    leg: { len: 1.7, thick: 0.55 }, tail: { len: 1.2, kind: 'thin' }, ears: { kind: 'huge', size: 1.6 },
    muzzle: 0, trunk: 2.0, tusks: 1.8, columns: true, usual: 3,
    colours: [[0.45, 0.44, 0.43], [0.5, 0.45, 0.38], [0.55, 0.42, 0.35]],
  },
  camel: { // dromedary 1.8-2.0 at the shoulder, hump top 2.1-2.3 (DK; Kohler-Rollefson: published ranges)
    name: 'dromedary', source: 'shoulder and hump published ranges; neck, body and leg an estimate',
    shoulder: 1.9, body: 1.6, neck: { len: 1.1, up: 65, graze: -45 }, head: { len: 0.5, h: 0.2, angle: -60 },
    leg: { len: 1.1, thick: 0.09 }, tail: { len: 0.5, kind: 'hang' }, ears: { kind: 'point', size: 0.08 },
    muzzle: 0.35, hump: 0.35, uNeck: true, knees: true, usual: 3,
    colours: [[0.78, 0.62, 0.4], [0.62, 0.45, 0.28], [0.85, 0.75, 0.58]],
  },
};

/**
 * People as fractions of stature H (Drillis & Contini 1966, reproduced in Winter: published fractions, derived
 * metres), the child's from Snyder et al. 1977 and Bodyspace (typical): the head's height and width, the neck, the
 * shoulder line and width (bideltoid: the outer silhouette), the hip joint and width, the crotch, the knee, the arm's
 * segments, the foot, the walking step. A crowd stands 0.6-0.9 m apart, centre to centre (Fruin, published).
 */
export const FIGURE = {
  adult: {
    h: 1.7, head: 0.13, headW: 0.088, neck: 0.052, shoulder: 0.818, shoulderW: 0.27, hip: 0.53, hipW: 0.191,
    crotch: 0.46, knee: 0.285, upperArm: 0.186, forearm: 0.146, hand: 0.108, foot: 0.152, stride: 0.44,
    source: 'Drillis & Contini 1966 (published fractions); bideltoid breadth Pheasant & Haslegrave (published)',
  },
  child: { // a 7-year-old, 1.20 m (CDC/WHO medians, published); the fractions typical of a 5-9-year-old
    h: 1.2, head: 0.16, headW: 0.115, neck: 0.04, shoulder: 0.81, shoulderW: 0.24, hip: 0.52, hipW: 0.18,
    crotch: 0.435, knee: 0.275, upperArm: 0.175, forearm: 0.14, hand: 0.108, foot: 0.155, stride: 0.4,
    source: 'height published (growth charts); fractions typical (Snyder 1977; Bodyspace children\'s tables)',
  },
  crowd: { spacing: [0.6, 0.9], count: [8, 20], sd: 0.09, children: 1 / 6, source: 'Fruin 1971 (published)' },
};

/** The flyers, in metres; each row names its source. */
export const FLYERS = {
  airplane: { // Airbus A320 Aircraft Characteristics for Airport Planning (published); nacelle and chords typical
    name: 'Airbus A320', source: 'published (Airbus); nacelle and chord typical',
    length: 37.57, span: 35.8, fuselageH: 4.14, tailH: 11.76, sweep: 25, stabSpan: 12.45,
    nacelle: { d: 2.4, len: 4.4 }, rootChord: 7, tipChord: 1.6, depth: [150, 700], usual: 1,
  },
  cessna: { // Cessna 172S specifications (Textron, published); the cabin section an estimate
    name: 'Cessna 172 Skyhawk', source: 'published (Textron); cabin section estimate',
    length: 8.28, span: 11, tailH: 2.72, fuselageH: 1.5, chord: 1.63, prop: 1.93, stabSpan: 3.4,
    depth: [60, 300], usual: 1,
  },
  helicopter: { // Bell 412EP product specification (published); the cabin an estimate
    name: 'Bell 412', source: 'published (Bell); cabin estimate',
    length: 17.1, fuselage: 12.9, rotor: 14, height: 4.6, tailRotor: 2.6, cabinH: 1.9, depth: [60, 300], usual: 1,
  },
  balloon: { // AX-7/AX-8 class volumes (FAI, published); the envelope's and basket's sizes the makers' typical
    name: 'sport hot-air balloon', source: 'class volumes published (FAI); dimensions typical (Cameron)',
    envelopeD: 17, envelopeH: 19.5, mouth: 4.5, gap: 2.5, basket: { w: 1.2, h: 1.1 }, total: 23,
    depth: [120, 500], usual: 3,
  },
  rocket: { // SpaceX Falcon 9: 70 x 3.7 m, fairing 5.2 x 13.1 (published); plume and legs typical/estimate
    name: 'SpaceX Falcon 9', source: 'published (SpaceX); plume length an estimate',
    height: 70, d: 3.7, fairingD: 5.2, fairingH: 13.1, interstage: 0.6, plume: 100, depth: [400, 1500], usual: 1,
  },
  dragon: { // fantasy: every figure an estimate by proportion (a horse's torso 2.5x, bat wings 1.5x the length)
    name: 'dragon (fantasy)', source: 'estimate: no real referent',
    body: 6, depthM: 2.4, neck: 4, head: 1.6, tail: 8, span: 28, chord: 6, leg: 2, depth: [70, 260], usual: 1,
  },
  kite: { // mass-market single-line diamond kite: typical retail dimensions; the line's angle typical
    name: 'diamond kite', source: 'typical (retail kites)',
    h: 0.9, w: 0.8, tail: 3, line: 50, depth: [15, 60], usual: 1,
  },
};

/** The birds by word (RSPB / BTO species facts: published spans), and the bat (a pipistrelle, typical). */
export const BIRDS = {
  gull: { span: 1.35, match: /^(gulls?|seagulls?|birds?)$/, body: 0.6 },
  crow: { span: 0.98, match: /^(crows?|ravens?|rooks?|jackdaws?)$/, body: 0.46 },
  sparrow: { span: 0.23, match: /^(sparrows?|swallows?|swifts?|starlings?|songbirds?|finch|finches)$/, body: 0.15 },
  bat: { span: 0.22, match: /^bats?$/, body: 0.05 },
};

/** The swimmers, in metres (Perrin et al., Encyclopedia of Marine Mammals: published; the fish typical). */
export const SWIMMERS = {
  whale: { len: 14, depthM: 3, flipper: 4.5, fluke: 4.5, dorsal: 0.3, blow: 3, usual: 2 },
  dolphin: { len: 2.7, depthM: 0.55, dorsal: 0.25, beak: 0.12, fluke: 0.6, usual: 3 },
  shark: { len: 4, dorsal: 0.45, usual: 1 }, // a 4 m shark: typical of a large reef or white shark
  fish: { len: 0.3, depthM: 0.075, usual: 4 },
};

// ── Shared ─────────────────────────

const DEG = Math.PI / 180;
/** Where a thing stands: things.mjs's stance, repeated for the same reason landforms.mjs repeats it (no export). */
function stance(ctx, inst) {
  const zm = inst.zm ?? Math.min(ctx.groundZ(inst.fy), 400), s = ctx.camera.focal / zm, x0 = inst.ux * ctx.W;
  const shadow = inst.fy >= ctx.hy ? ctx.shadow : () => {};
  return { x0, fy: inst.fy, zm, s, xm: inst.xm ?? (x0 - ctx.W / 2) / s, shadow };
}

/** A box that grows round every point marked in it, for the layout. */
function extent() {
  const b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  return {
    mark(x, y, r = 0) {
      if (x - r < b.x0) b.x0 = x - r;
      if (x + r > b.x1) b.x1 = x + r;
      if (y - r < b.y0) b.y0 = y - r;
      if (y + r > b.y1) b.y1 = y + r;
    },
    box(fallback) {
      if (!Number.isFinite(b.x0)) return fallback;
      return { x: b.x0, y: b.y0, w: Math.max(1, b.x1 - b.x0), h: Math.max(1, b.y1 - b.y0) };
    },
  };
}

/** A capsule between two points in a width, marked into the extent. */
function stroke(ctx, ext, a, b, width, c, alpha = 1) {
  const w = Math.max(0.8, width);
  ext.mark(a[0], a[1], w / 2);
  ext.mark(b[0], b[1], w / 2);
  ctx.line(a[0], a[1], b[0], b[1], w, c, alpha);
}

/** A polyline of capsules, the width tapering from w0 to w1. */
function ribbon(ctx, ext, pts, w0, w1, c, alpha = 1) {
  for (let i = 0; i + 1 < pts.length; i++) {
    stroke(ctx, ext, pts[i], pts[i + 1], lerp(w0, w1, i / Math.max(1, pts.length - 2)), c, alpha);
  }
}

/**
 * The size factor the words gave, softened for a living thing: 'tall', 'big' and 'large' are a little over the
 * plain size, 'small', 'little' and 'tiny' a little under, and only 'giant', 'huge', 'enormous', 'massive' and
 * 'towering' are the full factor (a 'tall man' is 1.9 m, a 'giant' 3.4 m).
 */
function sizeOf(inst) {
  const k = inst.size || 1, mods = inst.instance?.modifiers ?? [];
  if (k === 1) return 1;
  if (mods.some((m) => /^(giant|huge|enormous|massive|towering)$/.test(m))) return k;
  return k > 1 ? 1.12 : 0.8;
}

/** The herd's way: one for the scene (from the sun's seeded place), most of a herd facing it. */
const herdWay = (ctx) => (h2(3, 3, (ctx.sun.x * 997) | 0) < 0.5 ? 1 : -1);

// ── Creatures ──────────────────────

const HOOF = [0.12, 0.1, 0.09], ANTLER = [0.42, 0.33, 0.22], TUSK = [0.92, 0.9, 0.82], EYE = [0.05, 0.05, 0.06];
const UDDER = [0.9, 0.72, 0.68];

/**
 * One animal of `kind` from its row: side-on at the instance's place, facing the herd's way (a few face the other),
 * standing or grazing by the seed, in the instance's colour or one of the row's. Parts in the animal's frame (u from
 * the rump toward the head, v up, metres) go through at(): x0 + dir * u * s, fy - v * s. Order: the shadow, the far
 * legs (shaded), the tail when it hangs behind, the body (its flank lit from the sun's side, the top brighter than
 * the belly), the neck and the head with their features, the near legs (lit) and their hooves, the extras.
 */
export function creature(ctx, inst, kind = inst.instance?.kind) {
  const C = CREATURES[kindOfCreature(kind, inst)] ?? CREATURES.horse, { rand, lit, sun, ellipse, disc, poly } = ctx;
  const { x0, fy, zm, s, xm, shadow } = stance(ctx, inst), k = sizeOf(inst), S = s * k, ext = extent();
  const dir = rand() < 0.8 ? herdWay(ctx) : -herdWay(ctx), at = (u, v) => [x0 + dir * (u - C.body / 2) * S, fy - v * S];
  const pose = inst.pose ?? (rand() < (C.udder || C.fleece ? 0.6 : 0.35) ? 'grazing' : 'standing');
  const base = inst.colour ?? C.colours[Math.floor(rand() * C.colours.length)];
  const toSun = sun.left ? -1 : 1, c = [0, 0, 0], depth = C.shoulder - C.leg.len;
  const dark = C.dark && !inst.colour ? mix(base, BLACK, 0.7) : mix(base, BLACK, 0.4); // mane, tail, hooves: darker
  const flank = (cx, cy, rx, ry) => (x, y) => { // a cylinder's light: the top lit, the belly in shade, the sun's side
    const up = clamp((cy - y) / ry, -1, 1), side = clamp((x - cx) / rx, -1, 1);
    let kk = 0.5 + 0.28 * up + 0.14 * side * toSun;
    const col = C.patches && !inst.colour ? patch(base, x, y, S) : base;
    return lit(col, clamp(kk, 0.25, 1), c);
  };
  const legW = C.leg.thick * S, hoofW = Math.max(1, legW * (C.columns ? 1.1 : 1.25));
  shadow(xm, zm, { w: C.body * k * 1.1, d: C.body * k * 0.35 }, C.shoulder * k);
  // The legs: the fore pair under the shoulder, the hind pair under the rump, the far ones a step apart from the
  // near ones (one hind leg behind the other, as silhouettes.md asks) and shaded; a knee bends each a little.
  const legs = (far) => {
    const kk = far ? 0.42 : 0.78, col = lit(C.dark && !inst.colour ? dark : base, kk), top = C.leg.len + depth * 0.25;
    const pairs = [[C.body * 0.86 + (far ? -0.07 : 0) * C.body, 1], [C.body * 0.14 + (far ? 0.1 : 0) * C.body, -1]];
    for (const [u, fore] of pairs) {
      const kneeU = u + (C.columns ? 0 : fore * 0.08 * C.leg.len), kneeV = C.leg.len * (fore > 0 ? 0.5 : 0.45);
      const lw = legW * (far ? 0.9 : 1), low = C.columns ? lw : lw * 0.7;
      stroke(ctx, ext, at(u, top), at(kneeU, kneeV), lw, col);
      stroke(ctx, ext, at(kneeU, kneeV), at(u + (C.columns ? 0 : fore * 0.02), 0.02), low, col);
      if (C.knees) disc(...at(kneeU, kneeV), lw * 0.75, col); // a camel's knobbly knees
      const [hx, hy_] = at(u + (C.columns ? 0 : fore * 0.02), 0.02);
      ellipse(hx, hy_, hoofW / 2, Math.max(0.8, hoofW * 0.25), lit(HOOF, far ? 0.4 : 0.6));
    }
  };
  legs(true);
  // The body: an ellipse (two for the fleece's rounder oblong), the hump and the udder with it.
  const [bx, by] = at(C.body / 2, C.leg.len + depth / 2), rx = C.body / 2 * S, ry = depth / 2 * S;
  const bodyC = flank(bx, by, rx, ry);
  if (C.tail.kind === 'hair' || C.tail.kind === 'rope' || C.tail.kind === 'thin' || C.tail.kind === 'hang') {
    tail(ctx, ext, C, at, S, dir, pose, lit(dark, 0.6), fy);
  }
  if (C.udder) ellipse(...at(C.body * 0.25, C.leg.len - 0.05), 0.25 * S, 0.18 * S, lit(UDDER, 0.7));
  ellipse(bx, by, rx, ry, bodyC);
  ext.mark(bx, by, Math.max(rx, ry));
  if (C.fleece) { // the wool's rounded outline: discs along the top and the belly
    const r = (depth / 2 + C.fleece) * S;
    for (let i = 0; i < 5; i++) {
      const [px, py] = at(C.body * (0.12 + 0.19 * i), C.leg.len + depth / 2);
      disc(px, py, r * (0.85 + 0.15 * h2(i, 1, 201)), bodyC);
    }
    ext.mark(bx, by, r);
  }
  if (C.hump) disc(...at(C.body * 0.5, C.shoulder - 0.08), 0.42 * S, bodyC); // the camel's hump
  if (C.rump) ellipse(...at(C.body * 0.06, C.leg.len + depth * 0.45), 0.12 * S, 0.14 * S, lit(C.rump, 0.8)); // deer
  // The neck and the head: the neck from the withers (lower on the chest for the camel's U and when grazing), the
  // head hanging from its end at the row's angle (near vertical for a horse, level for a deer), a muzzle before it.
  const grazing = pose === 'grazing', baseV = C.shoulder - (grazing ? depth * 0.3 : 0) - (C.uNeck ? depth * 0.45 : 0);
  const neckU = C.body * (C.uNeck ? 0.98 : 0.92), neckC = lit(base, 0.62);
  let a = (grazing ? C.neck.graze : C.neck.up) * DEG, headA = (grazing ? -80 : C.head.angle) * DEG;
  if (grazing) { // the neck swings down just far enough for the muzzle to reach the ground, no farther than straight
    const reach = (0.06 - baseV + C.head.len * 0.95) / C.neck.len;
    a = Math.max(-Math.PI / 2, Math.asin(clamp(reach, -1, 0)));
  }
  const neckW = Math.max(1, (C.uNeck ? 0.28 : C.head.h * 1.1) * S), pts = [];
  let u1 = neckU, v1 = baseV;
  if (C.uNeck && !grazing) { // the camel's U: out and down from the chest, then up at the row's angle
    const dip = C.neck.len * 0.3;
    pts.push(at(u1, v1), at(u1 + dip * Math.cos(-15 * DEG), v1 + dip * Math.sin(-15 * DEG)));
    u1 += dip * Math.cos(-15 * DEG);
    v1 += dip * Math.sin(-15 * DEG);
    pts.push(at(u1 + C.neck.len * 0.7 * Math.cos(a), v1 + C.neck.len * 0.7 * Math.sin(a)));
    u1 += C.neck.len * 0.7 * Math.cos(a);
    v1 += C.neck.len * 0.7 * Math.sin(a);
  } else {
    pts.push(at(u1, v1), at(u1 + C.neck.len * Math.cos(a), v1 + C.neck.len * Math.sin(a)));
    u1 += C.neck.len * Math.cos(a);
    v1 += C.neck.len * Math.sin(a);
  }
  if (C.trunk) { // an elephant has no neck to speak of: a head set on the shoulders
    u1 = C.body * 0.98;
    v1 = C.shoulder - C.head.h * 0.45;
  } else {
    ribbon(ctx, ext, pts, neckW * 1.15, neckW, neckC);
    if (C.mane) ribbon(ctx, ext, pts.map(([x, y]) => [x, y - neckW * 0.5]), neckW * 0.45, neckW * 0.3, lit(dark, 0.5));
  }
  const skullLen = C.head.len * (1 - C.muzzle), headW = Math.max(1, C.head.h * S);
  const hx0 = u1, hv0 = v1, hx1 = hx0 + skullLen * Math.cos(headA), hv1 = hv0 + skullLen * Math.sin(headA);
  const mu = hx1 + C.head.len * C.muzzle * Math.cos(headA), mv = hv1 + C.head.len * C.muzzle * Math.sin(headA);
  const headC = C.darkFace && !inst.colour ? lit(BLACK, 0.8) : lit(base, 0.7);
  if (C.trunk) {
    ellipse(...at(hx0, hv0), C.head.len * 0.5 * S, C.head.h * 0.5 * S, headC);
    ext.mark(...at(hx0, hv0), C.head.h * 0.5 * S);
  } else {
    stroke(ctx, ext, at(hx0, hv0), at(hx1, hv1), headW, headC);
    if (C.muzzle > 0) stroke(ctx, ext, at(hx1, hv1), at(mu, mv), headW * 0.6, headC);
  }
  // The eye, the ears, the horns, the antlers, the beard, the tusks and the trunk.
  const eyeU = hx0 + skullLen * 0.35 * Math.cos(headA);
  const [ex, ey] = at(eyeU, hv0 + skullLen * 0.35 * Math.sin(headA) + C.head.h * 0.22);
  if (headW > 3) disc(ex, ey, Math.max(0.8, headW * 0.09), EYE);
  ears(ctx, ext, C, at, S, dir, hx0, hv0, headA, headC, grazing);
  if (C.antlers) antlers(ctx, ext, C, at, S, dir, hx0, hv0 + C.head.h * 0.4, grazing);
  if (C.horns) {
    for (const side of [0, 0.03]) {
      const [gx, gy] = at(hx0 + side, hv0 + C.head.h * 0.45);
      const tip = [gx - dir * C.horns * 0.8 * S, gy - C.horns * 0.6 * S];
      stroke(ctx, ext, [gx, gy], tip, headW * 0.22, lit(ANTLER, 0.7));
    }
  }
  if (C.beard) {
    const chin = mv - C.head.h * 0.45;
    stroke(ctx, ext, at(mu, chin), at(mu - 0.02, chin - C.beard), headW * 0.3, headC);
  }
  if (C.trunk) trunkAndTusks(ctx, ext, C, at, S, dir, hx0, hv0, lit(base, 0.65));
  if (C.tail.kind === 'curl' || C.tail.kind === 'sabre' || C.tail.kind === 'stub' || C.tail.kind === 'up' ||
    C.tail.kind === 'straight') tail(ctx, ext, C, at, S, dir, pose, lit(dark, 0.6), fy);
  legs(false);
  const box = ext.box({ x: x0 - rx, y: fy - C.shoulder * S, w: rx * 2, h: C.shoulder * S });
  return { ...box, pose, species: kindOfCreature(kind, inst) };
}

/** The row a kind draws: the registered id, else the horse. */
function kindOfCreature(kind, inst) {
  if (kind && CREATURES[kind]) return kind;
  const word = inst?.instance?.word ?? inst?.word ?? '';
  return Object.keys(CREATURES).find((id) => CREATURE_WORDS[id].test(word.split(' ').pop() ?? '')) ?? 'horse';
}

/** A cow's patches: the base colour where a slow noise is high, black where it is low. */
function patch(base, x, y, S) {
  const n = fbm(x / (0.35 * S), y / (0.35 * S), 203, 3);
  return n > 0.5 ? base : BLACK;
}

/** The tail by its kind: a horse's hair, a cow's rope with its switch, a cat's curl, a dog's sabre, a stub... */
function tail(ctx, ext, C, at, S, dir, pose, col, fy) {
  const T = C.tail, root = C.body * 0.03, rootV = C.leg.len + (C.shoulder - C.leg.len) * 0.9, L = T.len;
  const w = Math.max(0.8, C.leg.thick * S * 0.45);
  if (T.kind === 'hair') { // a full tail hanging from the dock to the hocks, swept a little back
    const dock = at(root, rootV), p = [dock, at(root - 0.1, rootV - L * 0.35), at(root - 0.16, rootV - L * 0.7),
      at(root - 0.12, rootV - L)];
    ribbon(ctx, ext, p, C.leg.thick * S * 1.1, C.leg.thick * S * 1.4, col);
  } else if (T.kind === 'rope') {
    const p = [at(root, rootV), at(root - 0.03, rootV - L * 0.5), at(root - 0.02, rootV - L * 0.85)];
    ribbon(ctx, ext, p, w, w * 0.7, col);
    ctx.ellipse(...at(root - 0.02, rootV - L * 0.92), w * 1.4, L * 0.1 * S, col); // the switch
  } else if (T.kind === 'thin') {
    const p = [at(root, rootV - 0.2), at(root - 0.1, rootV - L * 0.5), at(root - 0.15, rootV - L)];
    ribbon(ctx, ext, p, w, w * 0.6, col);
    ctx.disc(...at(root - 0.15, rootV - L), w * 1.6, col); // the tuft
  } else if (T.kind === 'hang') {
    stroke(ctx, ext, at(root, rootV), at(root - 0.04, rootV - L), w, col);
  } else if (T.kind === 'stub') {
    stroke(ctx, ext, at(root, rootV), at(root - L * 0.5, rootV - L * 0.8), w * 1.4, col);
  } else if (T.kind === 'up') { // a goat's: short and raised
    stroke(ctx, ext, at(root, rootV), at(root - L * 0.5, rootV + L * 0.85), w * 1.3, col);
  } else if (T.kind === 'straight') { // a wolf's: hanging straight down and a little back, never curled
    ribbon(ctx, ext, [at(root, rootV - 0.02), at(root - L * 0.4, rootV - L * 0.75), at(root - L * 0.55, rootV - L)],
      w * 1.8, w * 1.2, col);
  } else if (T.kind === 'sabre') { // a dog's: level or curving up
    const up = pose === 'grazing' ? 0.2 : 0.7;
    ribbon(ctx, ext, [at(root, rootV), at(root - L * 0.5, rootV + L * 0.35 * up), at(root - L * 0.8, rootV + L * up)],
      w * 1.6, w * 0.9, col);
  } else { // a cat's: up from the top of the rump in a curve, the tip hooked
    const p = [at(root, rootV), at(root - L * 0.15, rootV + L * 0.45), at(root - L * 0.1, rootV + L * 0.85),
      at(root + L * 0.1, rootV + L)];
    ribbon(ctx, ext, p, w * 1.2, w * 0.9, col);
  }
  void fy;
}

/** The ears: pointed triangles on top (cat, horse, wolf), dropped ovals (dog, goat), big ovals (deer), out sideways
 * (cow, sheep), the elephant's huge rounded flap behind the eye. */
function ears(ctx, ext, C, at, S, dir, hu, hv, headA, col, grazing) {
  const E = C.ears, size = E.size * S, top = C.head.h * 0.5;
  const [px, py] = at(hu + 0.1 * C.head.len * Math.cos(headA), hv + top);
  if (size < 1.5) return;
  if (E.kind === 'point') {
    for (const off of [-0.6, 0.3]) {
      const x = px - dir * size * off, y = py;
      ctx.poly([x - size * 0.3, y, x + size * 0.3, y, x + size * 0.05, y - size], col);
      ext.mark(x, y - size);
    }
  } else if (E.kind === 'oval') {
    for (const off of [-0.5, 0.4]) {
      const x = px - dir * size * off, y = py - size * 0.45;
      ctx.ellipse(x - dir * size * 0.25, y, size * 0.22, size * 0.5, col);
      ext.mark(x, y - size * 0.5);
    }
  } else if (E.kind === 'drop') {
    const x = px - dir * size * 0.3, y = py - top * S * 0.2 + size * 0.45;
    ctx.ellipse(x, y, size * 0.2, size * 0.5, col);
    ext.mark(x, y + size * 0.5);
  } else if (E.kind === 'side') {
    const y = py - top * S * 0.5 + (grazing ? -size * 0.3 : 0);
    ctx.ellipse(px - dir * size * 0.5, y, size * 0.5, size * 0.2, col);
  } else if (E.kind === 'huge') {
    const x = px - dir * C.head.len * 0.45 * S, y = py + size * 0.25, pts = [];
    for (let i = 0; i < 12; i++) { // a rounded flap, wider at the top, lobed below
      const th = (i / 12) * Math.PI * 2, r = size * (0.5 - 0.1 * Math.cos(th * 2)) * (0.7 + 0.3 * h2(i, 2, 204));
      pts.push(x + Math.cos(th) * r * 0.75 * dir - dir * size * 0.1, y + Math.sin(th) * r);
    }
    ctx.poly(pts, col);
    ext.mark(x, y, size * 0.6);
  }
}

/** A stag's antlers: two beams from the brow rising back and curving forward at the top, tines off each. */
function antlers(ctx, ext, C, at, S, dir, hu, hv, grazing) {
  const A = C.antlers, col = ctx.lit(ANTLER, 0.75), w = Math.max(0.8, 0.04 * S), tilt = grazing ? -50 * DEG : 0;
  const rot = (u, v) => [u * Math.cos(tilt) - v * Math.sin(tilt), u * Math.sin(tilt) + v * Math.cos(tilt)];
  for (const [side, k] of [[-0.06, 0.9], [0.04, 1]]) {
    const beam = [[0, 0], [-0.25 * A.beam, 0.45 * A.up], [-0.3 * A.beam, 0.8 * A.up], [-0.1 * A.beam, A.up]];
    const pts = beam.map(([u, v]) => { const [ru, rv] = rot(u * k, v * k); return at(hu + side + ru, hv + rv); });
    ribbon(ctx, ext, pts, w * 1.4, w * 0.8, col);
    const tines = Math.max(2, Math.round(A.points / 2) - 3);
    for (let i = 0; i < tines; i++) {
      const t = 0.25 + 0.55 * i / tines, [bu, bv] = beam[1 + (i % 2)], [nu, nv] = beam[2 + (i % 2)];
      const u = lerp(bu, nu, t), v = lerp(bv, nv, t), [ru, rv] = rot(u * k, v * k);
      const [tu, tv] = rot((u + 0.12 * A.spread) * k, (v + 0.22 * A.up) * k);
      stroke(ctx, ext, at(hu + side + ru, hv + rv), at(hu + side + tu, hv + tv), w * 0.8, col);
    }
  }
}

/** The elephant's trunk hanging from the head to the ground in a slight S, and its tusks forward and up. */
function trunkAndTusks(ctx, ext, C, at, S, dir, hu, hv, col) {
  const face = hu + C.head.len * 0.45, top = hv - C.head.h * 0.1, L = C.trunk;
  const p = [at(face, top), at(face + 0.25, top - L * 0.3), at(face + 0.2, top - L * 0.65),
    at(face + 0.35, top - L * 0.98)];
  ribbon(ctx, ext, p, 0.4 * S, 0.14 * S, col);
  const tusk = ctx.lit(TUSK, 0.9);
  for (const dv of [-0.05, 0.05]) {
    const t = [at(face, top - C.head.h * 0.3 + dv), at(face + C.tusks * 0.5, top - C.head.h * 0.3 - 0.35 + dv),
      at(face + C.tusks * 0.85, top - C.head.h * 0.3 - 0.2 + dv)];
    ribbon(ctx, ext, t, 0.14 * S, 0.05 * S, tusk);
  }
}

// ── People ─────────────────────────

/** Coats an uncoloured figure wears, by the seed: red, rust, mustard, plum, moss, teal, navy, grey. */
export const COATS = [
  [0.72, 0.18, 0.14], [0.78, 0.42, 0.12], [0.8, 0.64, 0.2], [0.5, 0.18, 0.3], [0.32, 0.42, 0.2], [0.16, 0.42, 0.45],
  [0.14, 0.2, 0.42], [0.45, 0.45, 0.47],
];
const TROUSERS = [[0.15, 0.16, 0.22], [0.2, 0.2, 0.2], [0.35, 0.26, 0.18], [0.3, 0.32, 0.4]];
const SKIN = [[0.96, 0.8, 0.69], [0.9, 0.7, 0.56], [0.8, 0.58, 0.42], [0.62, 0.42, 0.28], [0.44, 0.28, 0.18]];
const HAIR = [[0.08, 0.07, 0.08], [0.35, 0.22, 0.12], [0.85, 0.7, 0.4], [0.58, 0.2, 0.08], [0.72, 0.72, 0.72]];
const CHILD_WORD = /^(child|children|kids?|boys?|girls?|toddlers?)$/;

/**
 * One person at the instance's place: 1.70 m (1.20 m for a child word), the proportions of FIGURE, standing
 * (frontal, the feet 0.2 m apart, the arms hanging to mid-thigh), walking (side-on, the legs a step apart and the
 * arms swinging opposite) or sitting on the ground, the pose from scene.pose or the seed; a coat in the instance's
 * colour or a seeded one, dark trousers, a skin and a hair tone by the seed; its shadow. `person` overrides the
 * place for a crowd's member: { x0, fy, s, h, pose, dir }.
 */
export function figure(ctx, inst, person = null) {
  const { rand, lit, sun, scene, disc, ellipse, poly } = ctx, ext = extent();
  const st = person ?? stance(ctx, inst), x0 = st.x0, fy = st.fy;
  const word = inst.instance?.word ?? inst.word ?? '', child = person?.child ?? CHILD_WORD.test(word.split(' ').pop());
  const F = child ? FIGURE.child : FIGURE.adult, h = person?.h ?? F.h * sizeOf(inst), s = st.s * h; // px per stature
  const pose = person?.pose ?? scene.pose ?? (rand() < 0.3 ? 'walking' : 'standing');
  const dir = person?.dir ?? (rand() < 0.5 ? 1 : -1), toSun = sun.left ? 1 : -1;
  const coat = inst.colour ?? COATS[Math.floor(rand() * COATS.length)], trousers = TROUSERS[Math.floor(rand() * 4)];
  const skin = SKIN[Math.floor(rand() * SKIN.length)], hair = HAIR[Math.floor(rand() * HAIR.length)];
  const at = (u, v) => [x0 + dir * u * s, fy - v * s], c = [0, 0, 0];
  const shade = (cx, hw, col) => (x) => lit(col, 0.5 + 0.38 * (0.5 - 0.5 * clamp((x - cx) / hw, -1, 1) * toSun), c);
  if (!person) st.shadow(st.xm, st.zm, { w: 0.5 * h / 1.7, d: 0.3 }, h);
  const headR = [F.headW / 2 * s, F.head / 2 * s], neckW = 0.05 * s, legW = 0.085 * s, shankW = 0.06 * s;
  const armW = 0.05 * s, trouserC = lit(trousers, 0.6), skinC = lit(skin, 0.8), hairC = lit(hair, 0.6);
  const head = (u, v) => { // the head on its neck gap, the hair a cap over its top
    const [hx, hy_] = at(u, v);
    ellipse(hx, hy_, headR[0], headR[1], skinC);
    const hairline = hy_ - headR[1] * 0.15;
    ellipse(hx, hy_ - headR[1] * 0.35, headR[0] * 1.02, headR[1] * 0.6, (x, y) => (y < hairline ? hairC : null));
    ext.mark(hx, hy_, headR[1] + 1);
  };
  if (pose === 'sitting') { // on the ground: the hips down, the thighs forward, the arms on the knees
    const hip = 0.09, sh = hip + (F.shoulder - F.hip), chin = sh + F.neck;
    stroke(ctx, ext, at(0, hip), at(0.25, hip + 0.1), legW, trouserC);
    stroke(ctx, ext, at(0.25, hip + 0.1), at(0.3, 0.03), shankW, trouserC);
    ellipse(...at(0.36, 0.025), 0.07 * s, 0.03 * s, trouserC);
    poly([...at(-0.08, sh), ...at(0.08, sh), ...at(0.1, hip), ...at(-0.1, hip)], shade(x0, 0.09 * s, coat));
    disc(...at(0, sh), 0.09 * s, shade(x0, 0.09 * s, coat));
    stroke(ctx, ext, at(0.02, sh - 0.02), at(0.12, hip + 0.16), armW, lit(coat, 0.6));
    stroke(ctx, ext, at(0.12, hip + 0.16), at(0.24, hip + 0.13), armW * 0.9, lit(coat, 0.6));
    disc(...at(0.26, hip + 0.12), 0.025 * s, skinC);
    ctx.rect(at(0, chin)[0] - neckW / 2, at(0, chin)[1], neckW, F.neck * s + 1, skinC);
    head(0.01, chin + F.head / 2);
    ext.mark(...at(-0.12, hip));
  } else if (pose === 'walking') { // side-on, a step apart, the body leaning a little into the walk
    const lean = 0.03, step = F.stride * 0.45;
    stroke(ctx, ext, at(-0.02, F.hip), at(-0.1, F.knee + 0.02), legW, lit(trousers, 0.45)); // the far leg, back
    stroke(ctx, ext, at(-0.1, F.knee + 0.02), at(-step, 0.04), shankW, lit(trousers, 0.45));
    ellipse(...at(-step - 0.03, 0.025), 0.07 * s, 0.025 * s, lit(trousers, 0.4));
    stroke(ctx, ext, at(lean + 0.03, F.shoulder), at(lean + 0.14, F.shoulder - F.upperArm), armW, lit(coat, 0.45));
    stroke(ctx, ext, at(lean + 0.14, F.shoulder - F.upperArm), at(lean + 0.2, F.shoulder - F.upperArm - F.forearm),
      armW * 0.9, lit(coat, 0.45));
    poly([...at(lean - 0.07, F.shoulder), ...at(lean + 0.07, F.shoulder), ...at(0.06, F.hip - 0.02),
      ...at(-0.06, F.hip - 0.02)], shade(x0, 0.07 * s, coat));
    disc(...at(lean, F.shoulder), 0.07 * s, shade(x0, 0.07 * s, coat));
    stroke(ctx, ext, at(0.02, F.hip), at(0.14, F.knee), legW, trouserC); // the near leg, forward
    stroke(ctx, ext, at(0.14, F.knee), at(step, 0.04), shankW, trouserC);
    ellipse(...at(step + 0.04, 0.025), 0.07 * s, 0.025 * s, trouserC);
    stroke(ctx, ext, at(lean, F.shoulder - 0.01), at(lean - 0.1, F.shoulder - F.upperArm), armW, lit(coat, 0.7));
    stroke(ctx, ext, at(lean - 0.1, F.shoulder - F.upperArm), at(lean - 0.14, F.shoulder - F.upperArm - F.forearm),
      armW * 0.9, lit(coat, 0.7));
    disc(...at(lean - 0.15, F.shoulder - F.upperArm - F.forearm - 0.03), 0.025 * s, skinC);
    ctx.rect(at(lean + 0.02, F.shoulder + F.neck)[0] - neckW / 2, at(0, F.shoulder + F.neck)[1], neckW, F.neck * s + 1,
      skinC);
    head(lean + 0.03, F.shoulder + F.neck + F.head / 2);
  } else { // standing, frontal: the feet apart, both arms hanging to mid-thigh
    const hipX = F.hipW * 0.28, footX = 0.06, hw = F.shoulderW / 2;
    for (const side of [-1, 1]) {
      stroke(ctx, ext, at(side * hipX, F.hip), at(side * (hipX + 0.01), F.knee), legW, trouserC);
      stroke(ctx, ext, at(side * (hipX + 0.01), F.knee), at(side * footX, 0.04), shankW, trouserC);
      ellipse(...at(side * footX, 0.02), 0.045 * s, 0.022 * s, lit(trousers, 0.5));
    }
    const hip = F.crotch + 0.02;
    poly([...at(-hw, F.shoulder), ...at(hw, F.shoulder), ...at(F.hipW / 2, hip), ...at(-F.hipW / 2, hip)],
      shade(x0, hw * s, coat));
    for (const side of [-1, 1]) {
      const sh = side * hw * 0.92, el = side * (hw + 0.02), wr = side * (hw + 0.035);
      const colA = lit(coat, side * toSun < 0 ? 0.78 : 0.52);
      stroke(ctx, ext, at(sh, F.shoulder - 0.03), at(el, F.shoulder - F.upperArm), armW, colA);
      stroke(ctx, ext, at(el, F.shoulder - F.upperArm), at(wr, F.shoulder - F.upperArm - F.forearm), armW * 0.9, colA);
      disc(...at(wr, F.shoulder - F.upperArm - F.forearm - 0.03), 0.026 * s, skinC);
    }
    ctx.rect(at(0, F.shoulder + F.neck)[0] - neckW / 2, at(0, F.shoulder + F.neck)[1], neckW, F.neck * s + 1, skinC);
    head(0, F.shoulder + F.neck + F.head / 2);
  }
  const box = ext.box({ x: x0 - 0.25 * s, y: fy - s, w: 0.5 * s, h: s });
  return { ...box, pose, child };
}

/**
 * A crowd: 8-20 figures clustered 0.6-0.9 m apart about the instance's place, their statures spread (sd 0.09 m) and
 * one in six a child, each projected at its own depth, the farthest first.
 */
export function crowd(ctx, inst) {
  const { rand, camera, scene } = ctx, R = FIGURE.crowd, { xm, zm, shadow } = stance(ctx, inst), k = sizeOf(inst);
  const n = R.count[0] + Math.floor(rand() * (R.count[1] - R.count[0] + 1)), cols = Math.ceil(Math.sqrt(n * 1.6));
  const gap = lerp(R.spacing[0], R.spacing[1], rand()), rows = Math.ceil(n / cols), people = [];
  for (let i = 0; i < n; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const dx = (col - (cols - 1) / 2) * gap + (rand() - 0.5) * gap * 0.5, dz = (row - (rows - 1) / 2) * gap * 0.9;
    const child = rand() < R.children, gauss = (rand() + rand() - 1) * R.sd * 1.7;
    const h = (child ? FIGURE.child.h : FIGURE.adult.h + gauss) * k;
    people.push({ x: xm + dx, z: zm + dz + (rand() - 0.5) * gap * 0.3, h, child, dir: rand() < 0.5 ? 1 : -1 });
  }
  people.sort((a, b) => b.z - a.z);
  shadow(xm, zm, { w: cols * gap, d: rows * gap }, 1.2);
  const ext = extent();
  for (const p of people) {
    const pr = camera.project(p.x, p.z), s = camera.focal / p.z;
    const pose = scene.pose ?? (rand() < 0.2 ? 'walking' : 'standing');
    const b = figure(ctx, inst, { x0: pr.x, fy: pr.y, s, h: p.h, pose, dir: p.dir, child: p.child, xm: p.x, zm: p.z });
    ext.mark(b.x, b.y);
    ext.mark(b.x + b.w, b.y + b.h);
  }
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), people: n };
}

// ── Flyers ─────────────────────────

const FUSELAGE = [0.92, 0.92, 0.93], UNDERSIDE = [0.55, 0.57, 0.6], GLASS = [0.2, 0.28, 0.36], NAV = [1, 0.3, 0.25];
const FLAME = [1, 0.62, 0.15], FLAME_CORE = [1, 0.95, 0.75], SMOKE = [0.62, 0.6, 0.58], DARKMETAL = [0.2, 0.2, 0.22];
const BASKET = [0.45, 0.3, 0.14], TRAIL = [0.96, 0.97, 0.98], NAV_GREEN = [0.25, 1, 0.35];
const CABIN_LIGHT = [1, 0.86, 0.55]; // a lit cabin window, painted as a light

const SKY_TOP = 0.02; // the share of the height a flyer keeps under the frame's top

/**
 * Where a flyer hangs: its screen place from placement's ux/uy, its scale from its depth. `reach` (metres up and
 * down from its origin) keeps it inside the sky band: its top under the frame's top, its underside over the horizon.
 */
function hang(ctx, inst, dir, reach = null) {
  const zm = inst.zm ?? 200, s = ctx.camera.focal / zm * sizeOf(inst), x0 = inst.ux * ctx.W;
  let y0 = (inst.uy ?? 0.3) * ctx.H;
  if (reach) {
    const top = SKY_TOP * ctx.H + reach.up * s, bottom = ctx.hy - 1 - reach.down * s;
    y0 = bottom >= top ? clamp(y0, top, bottom) : (top + bottom) / 2;
  }
  return { x0, y0, zm, s, at: (u, v) => [x0 + dir * u * s, y0 - v * s] };
}

/** An airline's seeded colour for the fin when the words gave none. */
const LIVERY = [[0.75, 0.12, 0.12], [0.1, 0.3, 0.6], [0.9, 0.5, 0.1], [0.1, 0.45, 0.3], [0.4, 0.15, 0.5]];

/**
 * The airliner, side-on and a little from below: a long white tube with a drooping nose, the swept wings set back of
 * the middle (the near one hanging below, the far one above and smaller), two engine pods under them, the tall
 * swept fin in the livery's colour and a small tailplane; a contrail behind by day; nav lights by night.
 */
function airliner(ctx, inst) {
  const A = FLYERS.airplane, { rand, lit, scene, poly, ellipse } = ctx, dir = rand() < 0.5 ? 1 : -1, ext = extent();
  const reach = { up: A.tailH, down: A.span * 0.21 }; // the fin's top, the near wing hanging below
  const { at, s } = hang(ctx, inst, dir, reach), L = A.length, R = A.fuselageH / 2, night = scene.time === 'night';
  const livery = inst.colour ?? LIVERY[Math.floor(rand() * LIVERY.length)], c = [0, 0, 0];
  const body = (x, y) => lit(FUSELAGE, 0.95, c), belly = lit(UNDERSIDE, 0.7), fin = lit(livery, 0.85);
  if (!night && scene.clouds < 0.9) contrail(ctx, ext, at, L, R, s);
  // the far wing, above the fuselage: the sweep seen in plan, foreshortened
  const wing = (lift, k, col) => {
    const u0 = L * 0.42, root = A.rootChord, tip = A.tipChord, out = A.span / 2 * k;
    const back = out * Math.tan(A.sweep * DEG);
    poly([...at(u0, lift), ...at(u0 + root, lift), ...at(u0 + root + back - tip, lift + out * 0.42),
      ...at(u0 + back, lift + out * 0.42)].map((v) => v), col);
    ext.mark(...at(u0 + back, lift + out * 0.42));
  };
  wing(R * 0.3, 0.55, lit(UNDERSIDE, 0.55));
  // the fuselage: a tube with a drooping nose and an upswept tail
  const tube = [];
  const round = (i, k) => R * Math.sqrt(1 - ((i - 5) / k) ** 2) * 0.98;
  for (let i = 0; i <= 10; i++) tube.push(...at(L * (1 - i / 10) + 0.2, round(i, 5.2) + R));
  tube.push(...at(L * 0.02, R * 0.45));
  for (let i = 0; i <= 10; i++) tube.push(...at(L * (i / 10), R - round(i, 5.3)));
  tube.push(...at(L * 0.98, R * 1.25));
  poly(tube, (x, y) => (y > at(0, R * 0.8)[1] ? belly : body(x, y)));
  ext.mark(...at(0, 0));
  ext.mark(...at(L, 2 * R));
  // the fin and the tailplane
  const finTop = A.tailH - R * 0.3;
  poly([...at(L * 0.86, 2 * R), ...at(L * 0.98, 2 * R), ...at(L * 1.02, finTop), ...at(L * 0.95, finTop)], fin);
  ext.mark(...at(L * 1.02, A.tailH - R * 0.3));
  const stab = R * 0.9 - A.stabSpan * 0.18;
  poly([...at(L * 0.9, R * 0.9), ...at(L * 1.0, R * 0.9), ...at(L * 1.03, stab), ...at(L * 0.96, stab)], belly);
  // the near wing, hanging below, and the pods under it
  wing(-R * 0.1, -1, (x, y) => lit(UNDERSIDE, 0.6, c));
  for (const k of [0.35, 0.7]) {
    const out = A.span / 2 * k, u = L * 0.42 + out * Math.tan(A.sweep * DEG) - A.nacelle.len * 0.5;
    const v = -R * 0.1 - out * 0.42, nl = A.nacelle.len, nd = A.nacelle.d;
    ellipse(...at(u + nl / 2, v - nd * 0.3), nl / 2 * s, nd / 2 * s, lit(UNDERSIDE, 0.5));
    ellipse(...at(u, v - A.nacelle.d * 0.3), A.nacelle.d * 0.22 * s, A.nacelle.d / 2 * s, DARKMETAL);
  }
  if (night) {
    ctx.disc(...at(L * 0.08, R * 0.9), Math.max(1, 0.4 * s), [1, 1, 1]);
    ctx.disc(...at(L * 1.0, A.tailH - R * 0.4), Math.max(1, 0.4 * s), NAV);
  }
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), species: 'airliner' };
}

/** A contrail: two white streaks from the engines, bright behind the plane and fading out over four lengths. */
function contrail(ctx, ext, at, L, R, s) {
  const w = Math.max(1.5, R * 1.1 * s), reach = Math.max(1, L * 4 * s);
  for (const v of [-R * 0.1, -R * 0.9]) {
    const [x1, y1] = at(L * 0.6, v), [x2, y2] = at(L * 4.6, v + R * 0.4);
    ctx.line(x1, y1, x2, y2, w, TRAIL, (x) => 0.95 * (1 - clamp(Math.abs(x - x1) / reach)) ** 1.2, Math.max(2, w));
    ext.mark(x2, y2, w);
  }
}

/** The small plane: a high straight wing with its strut, a boxy cabin, the prop disc, a fin, fixed wheels. */
function cessna(ctx, inst) {
  const A = FLYERS.cessna, { rand, lit, poly, ellipse } = ctx, dir = rand() < 0.5 ? 1 : -1, ext = extent();
  const { at, s } = hang(ctx, inst, dir, { up: A.tailH + 0.5, down: 0.8 }); // the fin's top to the wheels
  const L = A.length, H = A.fuselageH, base = inst.colour ?? FUSELAGE, c = [0, 0, 0];
  const stripe = inst.colour ? lit(mix(inst.colour, BLACK, 0.3), 0.8) : lit(LIVERY[Math.floor(rand() * 5)], 0.85);
  const body = lit(base, 0.9), shade = lit(base, 0.6);
  const belt = at(0, H * 0.45)[1];
  poly([...at(L * 0.25, 0), ...at(L * 0.85, H * 0.45), ...at(L, H * 0.55), ...at(L, H * 0.8), ...at(L * 0.6, H),
    ...at(L * 0.2, H), ...at(L * 0.05, H * 0.75), ...at(L * 0.05, H * 0.3)], (x, y) => (y > belt ? shade : body));
  poly([...at(L * 0.22, H * 0.62), ...at(L * 0.3, H * 0.95), ...at(L * 0.5, H * 0.95), ...at(L * 0.5, H * 0.62)],
    lit(GLASS, 0.8));
  ext.mark(...at(0, 0));
  ext.mark(...at(L, H));
  const wingV = H * 1.08, wingW = Math.max(1.2, A.chord * 0.18 * s); // the high wing, edge-on and a little from below
  poly([...at(L * 0.22, wingV), ...at(L * 0.22 + A.chord, wingV), ...at(L * 0.3 + A.chord, wingV - A.span * 0.035),
    ...at(L * 0.3, wingV - A.span * 0.035)], (x, y) => lit(base, 0.5, c));
  const over = A.span * 0.02;
  ctx.line(...at(L * 0.22 - over, wingV + 0.05), ...at(L * 0.22 + A.chord + over, wingV + 0.05), wingW, body);
  ext.mark(...at(L * 0.22 - A.span * 0.02, wingV + 0.3));
  ctx.line(...at(L * 0.33, wingV), ...at(L * 0.4, H * 0.3), Math.max(0.8, 0.05 * s), shade); // the strut
  const T = A.tailH; // the fin
  poly([...at(L * 0.86, H * 0.85), ...at(L * 0.98, H * 0.85), ...at(L * 1.0, T), ...at(L * 0.93, T)], stripe);
  ext.mark(...at(L, A.tailH));
  ctx.line(...at(L * 0.86, H * 0.6), ...at(L * 1.02, H * 0.6), Math.max(1, 0.1 * s), shade); // the tailplane
  ctx.line(...at(L * 0.3, H * 0.4), ...at(L * 0.75, H * 0.52), Math.max(1, 0.12 * s), stripe); // the cheat line
  ellipse(...at(L * 0.02, H * 0.52), Math.max(0.8, 0.08 * s), A.prop / 2 * s, [0.5, 0.5, 0.52], 0.5); // the prop disc
  for (const [u, v] of [[L * 0.12, -0.35], [L * 0.45, -0.45]]) { // the fixed undercarriage
    ctx.line(...at(u, H * 0.1), ...at(u, v), Math.max(0.8, 0.05 * s), shade);
    ctx.disc(...at(u, v), Math.max(1, 0.22 * s), DARKMETAL);
    ext.mark(...at(u, v - 0.3));
  }
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), species: 'cessna' };
}

/** The helicopter: a rounded cabin with a glazed nose, a tapering boom to a fin and tail rotor, skids, the rotor's
 * thin disc on its mast above. */
function helicopter(ctx, inst) {
  const A = FLYERS.helicopter, { rand, lit, poly, ellipse, scene } = ctx, dir = rand() < 0.5 ? 1 : -1, ext = extent();
  const { at, s } = hang(ctx, inst, dir, { up: A.height + 0.6, down: 0.2 }); // the rotor disc to the skids
  const paints = [[0.9, 0.9, 0.9], [0.9, 0.75, 0.1], [0.2, 0.3, 0.22]];
  const base = inst.colour ?? paints[Math.floor(rand() * 3)], night = scene.time === 'night';
  const body = lit(base, 0.85), shade = lit(base, 0.55), cabL = A.fuselage * 0.42, Hc = A.cabinH * 1.3;
  const boomV = Hc * 0.55; // the cabin's floor at v = 0.6 (the skids below), the boom from its back
  const mid = at(0, 0.6 + Hc * 0.5)[1];
  ellipse(...at(cabL * 0.5, 0.6 + Hc * 0.5), cabL * 0.5 * s, Hc * 0.5 * s, (x, y) => (y > mid ? shade : body));
  // the glazed nose: by night the cabin is lit from inside, so the dark body reads against dark buildings
  ellipse(...at(cabL * 0.22, 0.6 + Hc * 0.6), cabL * 0.2 * s, Hc * 0.32 * s, night ? CABIN_LIGHT : lit(GLASS, 0.85));
  ext.mark(...at(0, 0));
  ext.mark(...at(cabL, 0.6 + Hc));
  const bv = 0.6 + boomV, F = A.fuselage;
  const root = cabL * 0.85; // the boom, then the fin
  poly([...at(root, bv + 0.5), ...at(F, bv + 0.35), ...at(F, bv - 0.1), ...at(root, bv - 0.6)], shade);
  poly([...at(F - 0.6, bv + 0.3), ...at(F + 0.2, bv + 0.3), ...at(F + 0.5, bv + 1.6), ...at(F - 0.1, bv + 1.6)], body);
  ellipse(...at(F + 0.25, bv + 1.2), Math.max(0.8, 0.12 * s), A.tailRotor / 2 * s, DARKMETAL, 0.7); // the tail rotor
  ext.mark(...at(F + 0.5, bv + 1.2 + A.tailRotor / 2));
  ctx.rect(at(cabL * 0.5, A.height - 0.3)[0] - 0.15 * s, at(0, A.height - 0.3)[1], 0.3 * s, 0.6 * s, DARKMETAL); // mast
  ellipse(...at(cabL * 0.5, A.height), A.rotor / 2 * s, Math.max(0.8, 0.12 * s), DARKMETAL, 0.75); // the rotor disc
  ellipse(...at(cabL * 0.5, A.height), A.rotor / 2 * s, Math.max(1.5, 0.5 * s), DARKMETAL, 0.18, 2); // its blur
  ext.mark(...at(cabL * 0.5 - A.rotor / 2, A.height + 0.3));
  ext.mark(...at(cabL * 0.5 + A.rotor / 2, A.height));
  for (const u of [cabL * 0.2, cabL * 0.75]) {
    ctx.line(...at(u, 0.6), ...at(u + 0.2, 0.05), Math.max(0.8, 0.06 * s), DARKMETAL); // the skids' legs
  }
  ctx.line(...at(-0.3, 0.05), ...at(cabL + 0.3, 0.05), Math.max(0.8, 0.08 * s), DARKMETAL); // the skid
  if (night) { // the nav light of the side shown (red to port, green to starboard), the tail light, the beacon
    const r = Math.max(1, 0.35 * s);
    ctx.disc(...at(cabL * 0.55, 0.6 + Hc * 0.2), r, dir > 0 ? NAV : NAV_GREEN);
    ctx.disc(...at(F + 0.3, bv + 1.75), r, [1, 1, 1]);
    ctx.disc(...at(cabL * 0.5, A.height + 0.45), r, NAV);
  }
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), species: 'helicopter', lights: night };
}

/**
 * The hot-air balloon: an inverted teardrop (widest above the middle, narrowing to the mouth) in vertical gores
 * striped in the instance's colour (or two seeded ones) and cream, lit from the sun's side, a gap, lines, and the
 * tiny basket a twelfth of the envelope's width below.
 */
function balloon(ctx, inst) {
  const B = FLYERS.balloon, { rand, lit, sun, poly } = ctx, ext = extent();
  const { at, s } = hang(ctx, inst, 1, { up: B.total, down: 0.5 }); // the crown to the basket
  const main = inst.colour ?? LIVERY[Math.floor(rand() * LIVERY.length)];
  const second = LIVERY[Math.floor(rand() * LIVERY.length)], toSun = sun.left ? -1 : 1;
  const gores = [main, CREAM, inst.colour ? main : second, CREAM], D = B.envelopeD, Hh = B.envelopeH;
  const bottom = B.basket.h + B.gap, half = (t) => { // the half-width at height t (0 the mouth, 1 the crown)
    const m = t < 0.58 ? (t - 0.58) / 0.62 : (t - 0.58) / 0.42;
    return D / 2 * Math.sqrt(Math.max(0, 1 - m * m));
  };
  const pts = [];
  for (let i = 0; i <= 20; i++) pts.push(...at(-half(i / 20), bottom + Hh * i / 20));
  for (let i = 20; i >= 0; i--) pts.push(...at(half(i / 20), bottom + Hh * i / 20));
  const [cx] = at(0, 0), c = [0, 0, 0];
  poly(pts, (x, y) => {
    const t = clamp((at(0, bottom)[1] - y) / (Hh * s)), hw = Math.max(1e-3, half(t) * s);
    const side = clamp((x - cx) / hw, -1, 1);
    const gore = Math.floor((Math.asin(side) / Math.PI + 0.5) * 7.99) % gores.length; // 8 gores across the face
    const kk = 0.45 + 0.45 * Math.sqrt(1 - side * side) * (0.75 + 0.25 * side * toSun * -1) + 0.1 * side * toSun;
    return lit(gores[gore], clamp(kk, 0.3, 1), c);
  });
  ext.mark(...at(-D / 2, bottom + Hh));
  ext.mark(...at(D / 2, 0));
  const lineC = lit(DARKMETAL, 0.6), lw = Math.max(0.6, 0.04 * s), bw = B.basket.w, bh = B.basket.h;
  for (const k of [-1, 1]) ctx.line(...at(k * B.mouth / 2, bottom), ...at(k * bw / 2, bh), lw, lineC);
  ctx.rect(at(-bw / 2, bh)[0], at(0, bh)[1], bw * s, bh * s, lit(BASKET, 0.7)); // the basket
  if (rand() < 0.4) ctx.disc(...at(0, bottom - 0.6), Math.max(1, 0.5 * s), FLAME, 0.8); // the burner firing
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), species: 'balloon' };
}

/**
 * The rocket: a white cylinder nineteen times taller than it is wide, the fairing's step at the top, the black
 * interstage band three fifths of the way up, four grid fins under it; a flame below. 'launching' stands it just
 * off the pad at the horizon with a flame longer than itself and grey smoke pooling and spreading at the pad.
 */
function rocket(ctx, inst) {
  const Rk = FLYERS.rocket, { lit, scene, poly, ellipse, disc } = ctx, ext = extent(), launching = !!scene.launching;
  const zm = inst.zm ?? 600, s = ctx.camera.focal / zm * sizeOf(inst), x0 = inst.ux * ctx.W;
  const ground = ctx.project(0, zm).y, aloft = (inst.uy ?? 0.3) * ctx.H + Rk.height * 0.5 * s;
  const flameL = launching ? Rk.plume * 0.75 : Rk.height * 0.5, fw = Rk.d * 0.7;
  // launching: seconds off the pad, the rocket a plume's length up, so the flame ends over the ground row and the
  // smoke pools on it; nothing of it is painted below the ground
  const base = launching ? ground - (flameL + PAD_CLEAR) * s : aloft;
  const at = (u, v) => [x0 + u * s, base - v * s], r = Rk.d / 2, fr = Rk.fairingD / 2, Hh = Rk.height;
  const night = scene.time === 'night';
  const toSun = ctx.sun.left ? -1 : 1, c = [0, 0, 0];
  const body = (x) => lit(FUSELAGE, 0.55 + 0.4 * (0.5 + 0.5 * clamp((x - x0) / Math.max(1, r * s), -1, 1) * toSun), c);
  if (launching) { // the smoke at the pad: billows spreading sideways on the ground, lit red by the flame at night
    const n = 14, spread = 55;
    for (let i = 0; i < n; i++) {
      const u = (h2(i, 1, 211) - 0.5) * 2 * spread, rm = 8 + h2(i, 3, 211) * 10, rr = rm * s;
      const v = rm * 0.85 + h2(i, 2, 211) * 8 * (1 - Math.abs(u) / spread * 0.6), px = x0 + u * s, py = ground - v * s;
      const near = Math.exp(-((u / 18) ** 2));
      mix(lit(SMOKE, 0.75), FLAME, (night ? 0.45 : 0.25) * near, c);
      const billow = (x, y) => (y > ground ? 0 : 0.5 * (0.6 + 0.4 * fbm(x / 9, y / 9, 212, 2)));
      disc(px, py, rr, [c[0], c[1], c[2]], billow, Math.max(2, rr * 0.5));
      ext.mark(px - rr, py);
      ext.mark(px + rr, py);
      ext.mark(px, py - rr);
      ext.mark(px, Math.min(py + rr, ground));
    }
  }
  const flame = [...at(-fw, 0), ...at(fw, 0), ...at(fw * 0.4, -flameL * 0.55), ...at(0, -flameL),
    ...at(-fw * 0.4, -flameL * 0.55)];
  poly(flame, (x, y) => { // orange edge, white-yellow core: painted in its own colour, it is a light
    const d = Math.abs(x - x0) / Math.max(1, fw * s), down = (y - base) / Math.max(1, flameL * s);
    return mix(FLAME_CORE, FLAME, clamp(d * 1.5 + down * 0.8), c);
  }, (x, y) => 0.95 - 0.5 * clamp((y - base) / Math.max(1, flameL * s)));
  ext.mark(...at(0, -flameL));
  if (night) disc(x0, base, 14 * s, FLAME, 0.25, 14 * s); // its glow
  const top = Hh - Rk.fairingH;
  ctx.rect(at(-r, top)[0], at(0, top)[1], 2 * r * s, top * s, body); // the body
  const band = Hh * Rk.interstage;
  ctx.rect(at(-r, band + 1.4)[0], at(0, band + 1.4)[1], 2 * r * s, 2.8 * s, lit(DARKMETAL, 0.5)); // the interstage
  for (const side of [-1, 1]) { // the grid fins, folded flat
    const [gx, gy] = at(side * r - (side > 0 ? 0 : 1.1), band - 1.5);
    ctx.rect(gx, gy, 1.1 * s, 1.3 * s, lit(DARKMETAL, 0.6));
  }
  poly([...at(-fr, top), ...at(fr, top), ...at(fr, Hh - 4), ...at(0, Hh), ...at(-fr, Hh - 4)], body); // the fairing
  ext.mark(...at(-fr, Hh));
  ext.mark(...at(fr, 0));
  if (launching) { // smoke along the ground, its lower half under the ground row left unpainted
    ellipse(x0, ground, 30 * s, Math.max(1, 1.5 * s), lit(SMOKE, 0.6), (x, y) => (y > ground ? 0 : 0.5), 3);
    ext.mark(x0 - 30 * s, ground);
    ext.mark(x0 + 30 * s, ground);
  }
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), species: 'rocket', launching, ground };
}

const DRAGONS = [[0.72, 0.1, 0.08], [0.2, 0.42, 0.18], [0.3, 0.22, 0.12]]; // red by default, else green or bronze
const PAD_CLEAR = 6; // metres the launching rocket's flame ends over the ground row

/**
 * The dragon in flight: a horse-like body, the long S neck forward to a wedge head with swept horns, the legs
 * tucked, the tail streaming behind as long as the body and neck, and bat wings from behind the shoulders, the
 * membrane on four finger spars, in a shallow V up or down by the seed (the far wing drawn first and darker).
 */
function dragon(ctx, inst) {
  const Dn = FLYERS.dragon, { rand, lit, poly, disc } = ctx, dir = rand() < 0.5 ? 1 : -1, ext = extent();
  const base = inst.colour ?? (rand() < 0.7 ? DRAGONS[0] : DRAGONS[1 + Math.floor(rand() * 2)]); // mostly red
  const body = lit(base, 0.7), dark = lit(mix(base, BLACK, 0.35), 0.6);
  const membrane = lit(mix(base, [0.6, 0.4, 0.3], 0.3), 0.8);
  const phase = rand() < 0.5 ? 1 : -1, T = Dn.tail, B = Dn.body, u0 = T, shoulder = [u0 + B * 0.75, 1.0];
  // its reach up and down from the body line: the wings' tips at the top or the bottom of their stroke
  const reach = phase > 0 ? { up: Dn.span * 0.52, down: 2 } : { up: Dn.neck + 3.5, down: Dn.span * 0.38 };
  const { at, s } = hang(ctx, inst, dir, reach);
  const wing = (k, col, sparC) => { // from the shoulder: the arm out and up, the fingers fanning, the edge back
    const span = Dn.span / 2 * k, lift = phase * span * 0.45;
    const wrist = [shoulder[0] + span * 0.25, shoulder[1] + lift * 0.5 + 1.5];
    const tips = [0, 1, 2, 3].map((i) => {
      const a = (0.95 - i * 0.42) * (phase > 0 ? 1 : -1), reach = span * (0.75 - i * 0.12);
      return [wrist[0] + Math.cos(a) * reach * (i === 0 ? 1 : 0.85), wrist[1] + Math.sin(a) * reach];
    });
    const pts = [shoulder, wrist, tips[0]];
    for (let i = 1; i < tips.length; i++) { // a scallop between each pair of finger tips
      const [ax, ay] = tips[i - 1], [bx, by] = tips[i];
      const mx = (ax + bx) / 2 - (bx - ax) * 0.1, my = (ay + by) / 2 - phase * Math.abs(bx - ax) * 0.18;
      pts.push([mx, my], [bx, by]);
    }
    pts.push([u0 + B * 0.15, 0.6]);
    poly(pts.flatMap(([u, v]) => at(u, v)), col, 0.92);
    for (const t of tips) { stroke(ctx, ext, at(...wrist), at(...t), Math.max(0.8, 0.18 * s), sparC); }
    stroke(ctx, ext, at(...shoulder), at(...wrist), Math.max(1, 0.35 * s), sparC);
  };
  wing(0.75, lit(mix(base, BLACK, 0.5), 0.5), lit(mix(base, BLACK, 0.6), 0.5));
  // the tail, the body, the legs tucked, the neck and the head
  const tailPts = [[0, 1.6 - phase * 1.5], [T * 0.3, 1.0], [T * 0.65, 0.9], [u0, 1.1]];
  ribbon(ctx, ext, tailPts.map(([u, v]) => at(u, v)), 0.12 * s, 0.9 * s, dark);
  const tip = 1.6 - phase * 1.5; // the spade: a diamond a man's height across, so the tail reads as a dragon's
  poly([...at(0.6, tip), ...at(-0.9, tip + 1.0), ...at(-2.2, tip), ...at(-0.9, tip - 1.0)], dark);
  ext.mark(...at(-2.2, tip + 1.0));
  ext.mark(...at(-2.2, tip - 1.0));
  const belly = at(0, 1.0)[1];
  const dm = Dn.depthM;
  ctx.ellipse(...at(u0 + B / 2, 1.0 + dm * 0.1), B / 2 * s, dm / 2 * s, (x, y) => (y > belly ? dark : body));
  ext.mark(...at(u0, 1.0), Dn.depthM / 2 * s);
  for (const [u, v] of [[u0 + B * 0.2, 0.1], [u0 + B * 0.32, 0.2], [u0 + B * 0.7, 0.1], [u0 + B * 0.82, 0.2]]) {
    stroke(ctx, ext, at(u, v + 0.5), at(u - Dn.leg * 0.45, v - 0.4), Math.max(1, 0.4 * s), dark); // a tucked leg
  }
  const N = Dn.neck, nu = u0 + B;
  const neck = [[nu - B * 0.05, 1.6], [nu + N * 0.3, 2.6], [nu + N * 0.65, 2.9], [nu + N, 2.4]];
  ribbon(ctx, ext, neck.map(([u, v]) => at(u, v)), 1.1 * s, 0.7 * s, body);
  const [hu, hv] = neck[3], Hl = Dn.head;
  poly([...at(hu - 0.2, hv + 0.6), ...at(hu + Hl, hv + 0.05), ...at(hu - 0.2, hv - 0.45)], body); // the wedge head
  for (const dv of [0.55, 0.25]) { // the horns, swept back
    stroke(ctx, ext, at(hu - 0.1, hv + dv), at(hu - 1.1, hv + dv + 0.7), Math.max(0.8, 0.14 * s), dark);
  }
  if (s > 2) disc(...at(hu + 0.25, hv + 0.2), Math.max(0.8, 0.1 * s), [0.95, 0.8, 0.2]); // the eye
  ext.mark(...at(hu + Hl, hv));
  wing(1, membrane, dark);
  return { ...ext.box({ x: 0, y: 0, w: 1, h: 1 }), species: 'dragon', phase };
}

/**
 * The kite: a diamond leaning into the wind with a cross spar and a ribbon tail, on a line running down at about
 * 50 degrees to the hand of a figure already painted (the kite then hangs above that figure), else to the ground.
 */
function kite(ctx, inst) {
  const K = FLYERS.kite, { rand, lit, scene, layout, poly, line } = ctx, ext = extent(), H = ctx.H;
  const holder = layout.things.find((t) => (t.kind === 'person' || t.kind === 'crowd') && t.visible !== false);
  const angle = (K.line + (rand() - 0.5) * 20) * DEG, dir = rand() < 0.5 ? 1 : -1;
  let x0, y0, s, hand;
  if (holder) {
    const zm = Math.min(ctx.groundZ(holder.y + holder.h), 400);
    s = ctx.camera.focal / zm;
    hand = [holder.x + holder.w / 2 + dir * holder.w * 0.3, holder.y + holder.h * 0.55];
    const len = Math.min(0.4 * H, (hand[1] - 0.06 * H) / Math.sin(angle));
    x0 = hand[0] + dir * Math.cos(angle) * len;
    y0 = hand[1] - Math.sin(angle) * len;
  } else {
    const hg = hang(ctx, inst, dir);
    x0 = hg.x0;
    y0 = hg.y0;
    s = hg.s;
    const len = Math.min(0.5 * H, (ctx.hy + 0.1 * H - y0) / Math.sin(angle));
    hand = [x0 - dir * Math.cos(angle) * len, y0 + Math.sin(angle) * len];
  }
  const col = inst.colour ?? LIVERY[Math.floor(rand() * LIVERY.length)];
  const c = lit(col, 0.85), dk = lit(mix(col, BLACK, 0.4), 0.7);
  line(hand[0], hand[1], x0, y0, Math.max(0.6, 0.012 * s), lit(DARKMETAL, 0.6), 0.7); // the line
  ext.mark(hand[0], hand[1]);
  const lean = 30 * DEG * dir, cl = Math.cos(lean), sl = Math.sin(lean);
  const rot = (u, v) => [x0 + (u * cl - v * sl) * s, y0 - (u * sl + v * cl) * s];
  const top = rot(0, K.h * 0.6), bot = rot(0, -K.h * 0.4), l = rot(-K.w / 2, 0), r = rot(K.w / 2, 0);
  poly([...top, ...r, ...bot, ...l], (x) => ((x - x0) * dir > 0 ? c : dk));
  line(...top, ...bot, Math.max(0.6, 0.02 * s), dk);
  line(...l, ...r, Math.max(0.6, 0.02 * s), dk);
  ext.mark(...top);
  ext.mark(...bot);
  ext.mark(...l);
  ext.mark(...r);
  let px = bot[0], py = bot[1]; // the ribbon tail, wavering down-wind
  for (let i = 1; i <= 8; i++) {
    const nx = bot[0] - dir * Math.cos(lean) * K.tail * s * i / 8 * 0.4 + Math.sin(i * 1.7) * 0.12 * s;
    const ny = bot[1] + K.tail * s * i / 8 * 0.8;
    line(px, py, nx, ny, Math.max(0.6, 0.02 * s), i % 2 ? c : dk);
    px = nx;
    py = ny;
  }
  ext.mark(px, py);
  void scene;
  return { ...ext.box({ x: x0, y: y0, w: 1, h: 1 }), species: 'kite', held: !!holder };
}

// ── Birds and bats ─────────────────

const NIGHTBIRD = [0.1, 0.1, 0.12], DAYBIRD = [0.14, 0.14, 0.16], GULLBODY = [0.8, 0.8, 0.82], PHASES = 5;

/** The species a bird word names: a gull by the sea, a crow inland when the word is only 'birds'. */
function speciesOf(ctx, inst) {
  const word = (inst.instance?.word ?? inst.word ?? 'birds').split(' ').pop();
  for (const id of ['bat', 'sparrow', 'crow']) if (BIRDS[id].match.test(word)) return id;
  if (/^birds?$/.test(word)) return ctx.scene.ground === 'water' ? 'gull' : 'crow';
  return 'gull';
}

/**
 * One bird of a flock. The first bird painted sets the flock's spot; the rest hang on a loose V from it (each a
 * span or two along an arm, jittered), so seven birds read as a flock, not a scatter. Each has one of five wing
 * phases (gliding flat, the downstroke, the upstroke, a deep beat, the wrists cocked), never the same as its
 * neighbour's, a body dot, and the species' wing shape: a gull's long wings angled at the wrist, a crow's broad
 * straight ones with fingered tips, a sparrow's dot with a tail, a bat's scalloped membranes. Sized by its span at
 * its depth and never under three pixels at 720 rows.
 */
export function bird(ctx, inst) {
  const { W, H, scene, rand, line, disc, ellipse, scale } = ctx, species = speciesOf(ctx, inst), Bd = BIRDS[species];
  const flock = flockOf(ctx, species), i = flock.n++, s = ctx.camera.focal / (inst.zm ?? 60) * sizeOf(inst);
  const span = Math.max(3 * scale, Bd.span * (0.85 + rand() * 0.3) * s), half = span / 2;
  let x0 = inst.ux * W, y0 = (inst.uy ?? 0.3) * H;
  if (i === 0) Object.assign(flock, { x0, y0, arm: rand() < 0.5 ? 1 : -1 });
  else { // on the V: the arm alternates, each bird a little farther out and lower, jittered
    const arm = (i % 2 ? 1 : -1) * flock.arm, k = Math.ceil(i / 2), gap = span * (1.3 + rand() * 0.7);
    x0 = clamp(flock.x0 + arm * k * gap + (rand() - 0.5) * gap * 0.6, half, W - half);
    y0 = clamp(flock.y0 + k * gap * 0.4 + (rand() - 0.5) * gap * 0.4, 2, ctx.hy * 0.9);
  }
  const phase = (i + Math.floor(rand() * 2)) % PHASES, night = scene.time === 'night';
  const c = inst.colour ?? (night ? NIGHTBIRD : DAYBIRD);
  const width = Math.max(0.8, span * (species === 'crow' ? 0.06 : 0.04));
  const body = inst.colour ?? (night ? NIGHTBIRD : species === 'gull' ? GULLBODY : DAYBIRD);
  const lift = [0.02, 0.22, -0.18, 0.4, 0.12][phase] * half, wrist = [0.45, 0.4, 0.5, 0.35, 0.3][phase];
  const ext = extent();
  ext.mark(x0, y0);
  if (species === 'sparrow') { // a dot with a tail and a quick 'v'
    ellipse(x0, y0, Math.max(1, span * 0.18), Math.max(0.8, span * 0.12), c);
    line(x0, y0, x0 - half * 0.5, y0 + half * 0.1, width, c, 0.9);
    for (const d of [-1, 1]) line(x0, y0, x0 + d * half * 0.7, y0 - lift * 1.5 - half * 0.1, width, c, 0.85);
    ext.mark(x0 - half, y0 - half * 0.5);
    ext.mark(x0 + half, y0 + half * 0.3);
    return { ...ext.box(), phase, species };
  }
  if (species === 'bat') { // scalloped membranes, two notches a wing
    for (const d of [-1, 1]) {
      const pts = [x0, y0 - span * 0.08, x0 + d * half * 0.4, y0 - lift - span * 0.12, x0 + d * half, y0 - lift * 0.6];
      pts.push(x0 + d * half * 0.78, y0 - lift * 0.1 + span * 0.1, x0 + d * half * 0.45, y0 - lift * 0.2 + span * 0.14);
      pts.push(x0, y0 + span * 0.1);
      ctx.poly(pts, c, 0.95);
    }
    ellipse(x0, y0, Math.max(0.8, span * 0.08), Math.max(1, span * 0.14), c);
    ext.mark(x0 - half, y0 - lift - span * 0.2);
    ext.mark(x0 + half, y0 + span * 0.2);
    return { ...ext.box(), phase, species };
  }
  for (const d of [-1, 1]) { // the wings: shoulder to wrist, wrist to tip
    const wx = x0 + d * half * wrist, wy = y0 - lift * (species === 'gull' ? 1 : 0.6), tx = x0 + d * half;
    const ty = species === 'gull' ? y0 - lift * 0.1 + half * 0.12 : wy - lift * 0.3;
    line(x0, y0, wx, wy, width, c, 0.95);
    line(wx, wy, tx, ty, width * 0.8, c, 0.9);
    if (species === 'crow' && span > 12 * scale) { // the fingered tips: three short splayed strokes
      for (let f = 0; f < 3; f++) {
        line(tx - d * half * 0.15, ty, tx + d * half * 0.08, ty - (f - 1) * half * 0.12, width * 0.5, c, 0.8);
      }
    }
    ext.mark(tx, ty);
    ext.mark(wx, wy);
  }
  const bodyR = Math.max(0.8, span * (species === 'crow' ? 0.07 : 0.05));
  ellipse(x0, y0 + bodyR * 0.3, bodyR * 2, bodyR, body); // the body
  if (species === 'crow') line(x0, y0, x0 - half * 0.25, y0 + bodyR * 1.5, bodyR * 1.2, c, 0.9); // the square tail
  else disc(x0 + half * 0.1, y0, bodyR * 0.7, body); // the head poking forward
  return { ...ext.box(), phase, species };
}

/** The flock of a species in this painting (reset when the things are painted again). */
function flockOf(ctx, species) {
  if (!ctx.flocks || ctx.flocks.run !== ctx.painted) ctx.flocks = { run: ctx.painted, by: {} };
  return ctx.flocks.by[species] ??= { n: 0, x0: 0, y0: 0, arm: 1 };
}

// ── Swimmers ───────────────────────

const WHALE = [0.12, 0.13, 0.15], DOLPHIN = [0.35, 0.38, 0.42], SHARK = [0.3, 0.32, 0.35], FISH = [0.7, 0.72, 0.74];
const BLOW = [0.92, 0.94, 0.96], FOAM = [0.9, 0.93, 0.95];

/**
 * A sea creature at the surface, its foot row the waterline: a whale as a low dark arc with the hump and its small
 * dorsal fin two thirds back, a long white-edged flipper, a bushy spout rising three metres ahead (or its flukes
 * raised in a dive); a dolphin arcing out, falcate fin and beak, its flat flukes behind; a shark's fin and tail lobe
 * with a wake; a fish leaping in an arch with a splash.
 */
export function swimmer(ctx, inst, kind) {
  const Sw = SWIMMERS[kind], { rand, lit, poly, ellipse, disc, line } = ctx, ext = extent();
  const { x0, fy, s: s0 } = stance(ctx, inst), s = s0 * sizeOf(inst), dir = rand() < 0.5 ? 1 : -1;
  const at = (u, v) => [x0 + dir * (u - Sw.len / 2) * s, fy - v * s], L = Sw.len;
  const foam = lit(FOAM, 0.9), blow = lit(mix(BLOW, ctx.L.horizon, 0.3), 0.95); // lit, so the night keeps them dim
  if (kind === 'whale') {
    const col = inst.colour ?? WHALE, back = lit(col, 0.6), dark = lit(col, 0.4), c = [0, 0, 0], pts = [];
    const dive = rand() < 0.3, top = Sw.depthM * 0.4;
    ellipse(x0, fy, L * 0.5 * s, Math.max(1, 0.15 * s), foam, 0.3, 2); // a little foam along the waterline, under it
    for (let i = 0; i <= 24; i++) { // the back: a rounded dome out of the water, the hump two thirds back
      const t = i / 24, hump = 0.5 * Math.exp(-(((t - 0.66) / 0.1) ** 2));
      pts.push(...at(L * t, Math.sin(t * Math.PI) ** 0.55 * top + hump));
    }
    pts.push(...at(L, -0.3), ...at(0, -0.3));
    poly(pts, (x, y) => lit(col, 0.45 + 0.3 * clamp((at(0, top)[1] - y) / (top * s)), c));
    const hv = top + 0.45; // the stubby dorsal fin on the hump
    poly([...at(L * 0.63, hv), ...at(L * 0.7, hv), ...at(L * 0.66, hv + Sw.dorsal)], back);
    // the long flipper raised out of the water at the shoulder (a humpback's slap), its leading edge white
    const fu = L * 0.78, fp = Sw.flipper * 0.8, tipU = fu + fp * 0.5, tipV = 0.4 + fp * 0.8;
    poly([...at(fu - 0.2, 0.5), ...at(fu + 0.8, 0.5), ...at(tipU + 0.15, tipV), ...at(tipU - 0.3, tipV - 0.3)], dark);
    line(...at(fu + 0.75, 0.55), ...at(tipU + 0.1, tipV - 0.05), Math.max(0.8, 0.1 * s), foam);
    ext.mark(...at(tipU, tipV + 0.3));
    if (dive) { // the flukes raised at the tail, notched in the middle, the trailing edge serrated
      const tu = L * 0.02, fk = Sw.fluke / 2, f = [[0.6, 0], [-0.6, 0], [-fk, 3.6], [-fk * 0.7, 4.3], [-0.3, 3.4],
        [fk * 0.4, 4.3], [fk * 0.6, 3.6]];
      poly(f.flatMap(([du, v]) => at(tu + du, v)), dark);
      ext.mark(...at(tu - fk, 4.5));
    } else { // the blow: a bushy column of soft discs ahead of the hump
      for (let i = 0; i < 7; i++) {
        const v = 0.6 + Sw.blow * (i / 6) ** 0.8, r = (0.35 + 0.25 * i / 6) * s * (1 + h2(i, 1, 221) * 0.4);
        const [px, py] = at(L * 0.9 + (h2(i, 2, 221) - 0.5) * 0.8, v);
        disc(px, py, Math.max(1, r), blow, 0.6 * (1 - i / 9), Math.max(1.5, r * 0.6));
      }
      ext.mark(...at(L * 0.9, Sw.blow + 1));
    }
    ext.mark(...at(0, -0.3));
    ext.mark(...at(L, hv + Sw.dorsal));
    return { ...ext.box(), species: kind, dive };
  }
  if (kind === 'dolphin') { // arcing out: the back and fin showing, the beak forward, the flukes flat behind
    const col = inst.colour ?? DOLPHIN, body = lit(col, 0.65), pts = [];
    for (let i = 0; i <= 10; i++) pts.push(at(L * i / 10, Math.sin(i / 10 * Math.PI) * Sw.depthM * 1.3 - 0.1));
    ribbon(ctx, ext, pts, Sw.depthM * 0.5 * s, Sw.depthM * 0.9 * s, body);
    ribbon(ctx, ext, pts.slice(5), Sw.depthM * 0.9 * s, Sw.depthM * 0.35 * s, body);
    const back = Sw.depthM * 1.6, dm = Sw.depthM; // the falcate fin, then the beak
    poly([...at(L * 0.45, back), ...at(L * 0.58, back), ...at(L * 0.4, back + Sw.dorsal)], body);
    line(...at(L * 0.98, dm * 0.2), ...at(L + Sw.beak * 1.5, dm * 0.05), Math.max(0.8, dm * 0.3 * s), body);
    line(...at(0.1, -0.05), ...at(-Sw.fluke * 0.5, -0.1), Math.max(0.8, 0.06 * s), body); // the flat flukes, edge-on
    ellipse(x0, fy, L * 0.5 * s, Math.max(1, 0.12 * s), foam, 0.35, 2);
    ext.mark(...at(-Sw.fluke * 0.5, -0.2));
    ext.mark(...at(L + Sw.beak * 1.5, Sw.depthM * 1.6 + Sw.dorsal));
    return { ...ext.box(), species: kind };
  }
  if (kind === 'shark') { // the dorsal fin, the tail's upper lobe, a shadow of the back between, a wake
    const col = inst.colour ?? SHARK, fin = lit(col, 0.55), D = Sw.dorsal;
    poly([...at(L * 0.45, 0), ...at(L * 0.62, 0), ...at(L * 0.44, D)], fin);
    poly([...at(L * 0.02, 0), ...at(L * 0.1, 0), ...at(L * -0.02, D * 0.7)], fin);
    ellipse(...at(L * 0.4, -0.1), L * 0.45 * s, Math.max(1, 0.25 * s), lit(col, 0.5), 0.45, 2);
    line(...at(L * 0.62, 0), ...at(L * 1.0, 0.02), Math.max(0.8, 0.05 * s), foam, 0.4); // the wake
    ext.mark(...at(L * -0.02, D));
    ext.mark(...at(L, -0.2));
    return { ...ext.box(), species: kind };
  }
  // a fish leaping: an arched lens, a forked tail, a dorsal fin, a splash below
  const col = inst.colour ?? FISH, body = lit(col, 0.8), back = lit(mix(col, [0.2, 0.3, 0.25], 0.6), 0.6);
  const a = 40 * DEG, ca = Math.cos(a), sa = Math.sin(a), dm = Sw.depthM;
  const rot = (u, v) => at(L / 2 + (u * ca - v * sa), 0.45 + (u * sa + v * ca));
  const pts = [];
  for (let i = 0; i <= 10; i++) pts.push(...rot(L * (i / 10 - 0.5), Math.sin(i / 10 * Math.PI) * dm / 2));
  for (let i = 9; i > 0; i--) pts.push(...rot(L * (i / 10 - 0.5), -Math.sin(i / 10 * Math.PI) * dm / 2));
  const spine = rot(0, 0)[1];
  poly(pts, (x, y) => (y < spine ? back : body));
  poly([...rot(-L / 2, 0), ...rot(-L * 0.68, dm * 0.45), ...rot(-L * 0.68, -dm * 0.45)], back); // the forked tail
  poly([...rot(-L * 0.1, dm / 2), ...rot(L * 0.15, dm / 2), ...rot(-L * 0.05, dm * 0.9)], back); // the dorsal fin
  for (let i = 0; i < 5; i++) { // the splash
    disc(...at(L * (0.2 + 0.15 * i), 0.02 + h2(i, 1, 222) * 0.12), Math.max(0.8, 0.03 * s), foam, 0.8);
  }
  ext.mark(...rot(-L * 0.7, -Sw.depthM));
  ext.mark(...rot(L * 0.5, Sw.depthM));
  ext.mark(x0, fy);
  return { ...ext.box(), species: kind };
}

// ── The registry ───────────────────

/** The words each creature is read by. */
export const CREATURE_WORDS = {
  cat: /^(cats?|kittens?|kitty|tabby)$/, dog: /^(dogs?|pupp(y|ies)|hounds?|collies?|labradors?)$/,
  horse: /^(horses?|pon(y|ies)|mares?|stallions?|foals?)$/, deer: /^(deer|stags?|hinds?|reindeer|fawns?|elk)$/,
  cow: /^(cows?|cattle|bulls?|calf|calves|oxen|ox|heifers?)$/, sheep: /^(sheep|lambs?|ewes?|rams?)$/,
  goat: /^(goats?|billy-goats?)$/, wolf: /^(wolf|wolves)$/, elephant: /^(elephants?)$/,
  camel: /^(camels?|dromedar(y|ies))$/,
};
const PERSON_WORDS = new RegExp(
  '^(persons?|people|man|men|woman|women|child|children|kids?|boys?|girls?|hikers?|fisherman|fishermen|' +
  'farmers?|shepherds?|pedestrians?|walkers?|villagers?|tourists?|figures?|toddlers?)$',
);
const PORTRAIT_WORDS = /^(woman|man|girl|boy)$/, PORTRAIT_HEAD = /^(portrait|face|selfie|headshot)$/;
const SIDE = /^(cliffs?|rocks?|north|south|east|west|northern|southern|eastern|western)$/;
const COLLECTIVES = /^(flocks?|herds?|packs?|swarms?|shoals?|pods?)$/; // bound to the creature word after them
const IRREGULAR = /^(people|children|men|women|sheep|deer|cattle|oxen|reindeer|elk|fishermen)$/;
const UNDERWATER_HEAD = /^(underwater|undersea|corals?|reefs?|diving|divers?|scuba|seabed|aquarium)$/;
const FISH_WORDS = /^(fish|fishes)$/;
const SEA_WORDS = /^(whales?|dolphins?|sharks?|orcas?|porpoises?)$/;

const creatureEntry = (id) => {
  const C = CREATURES[id];
  const raised = Math.max(0, C.neck.len * Math.sin(C.neck.up * DEG)) * 0.8;
  const h = C.antlers ? C.shoulder + C.neck.len * 0.87 + C.antlers.up : C.hump ? C.shoulder + 0.4 : C.shoulder + raised;
  const w = C.body + C.head.len * 0.8 + (C.tail.kind === 'hair' ? 0.1 : C.tail.kind === 'curl' ? 0 : C.tail.len * 0.3);
  return {
    id, word: `${id}s`, match: CREATURE_WORDS[id], usual: C.usual, band: null,
    size: { w, h, d: Math.max(0.2, C.leg.thick * 4 + (C.ears.kind === 'huge' ? 1 : 0)) },
    draw: (ctx, inst) => creature(ctx, inst, id),
  };
};
const KEYS = { deer: 'deer', sheep: 'sheep', wolf: 'wolves' }; // the keys that are not the id with an s

/** The registry entries: the creatures, the people, the flyers, the birds, the bats and the swimmers. */
export const CREATURE_THINGS = [
  ...Object.keys(CREATURES).map((id) => ({ ...creatureEntry(id), word: KEYS[id] ?? `${id}s` })),
  { // `figure`: a person word is no landscape's, for read.mjs's bare() (the space and portrait claims)
    id: 'person', word: 'people', match: PERSON_WORDS, usual: 4, band: null, size: { w: 0.6, h: 1.7, d: 0.5 },
    draw: figure, figure: true,
  },
  { id: 'crowd', word: 'crowds', match: /^crowds?$/, usual: 1, band: null, size: { w: 6, h: 1.8, d: 4 }, draw: crowd },
  {
    id: 'airplane', word: 'airplanes', match: /^(airplanes?|aeroplanes?|planes?|jets?|airliners?|aircraft|jetliners?)$/,
    usual: 1, sky: true, band: null, depth: FLYERS.airplane.depth, size: { w: 37.6, h: 11.8 }, draw: airliner,
  },
  {
    id: 'cessna', word: 'cessnas', match: /^(cessnas?|propeller-planes?|light-aircraft|biplanes?|microlights?)$/,
    usual: 1, sky: true, band: null, depth: FLYERS.cessna.depth, size: { w: 11, h: 2.7 }, draw: cessna,
  },
  {
    id: 'helicopter', word: 'helicopters', match: /^(helicopters?|helis?|whirlybirds?)$/, usual: 1, sky: true,
    band: null, depth: FLYERS.helicopter.depth, size: { w: 17.1, h: 4.6 }, draw: helicopter,
  },
  {
    id: 'balloon', word: 'balloons', match: /^(hot-air-balloons?|balloons?)$/, usual: 3, sky: true, band: null,
    depth: FLYERS.balloon.depth, size: { w: 17, h: 23 }, draw: balloon,
  },
  {
    id: 'rocket', word: 'rockets', match: /^(rockets?|spaceships?|launchers?)$/, usual: 1, sky: true, band: null,
    depth: FLYERS.rocket.depth, size: { w: 5.2, h: 70 }, draw: rocket,
  },
  {
    id: 'dragon', word: 'dragons', match: /^(dragons?|wyverns?)$/, usual: 1, sky: true, band: null,
    depth: FLYERS.dragon.depth, size: { w: 28, h: 12 }, draw: dragon,
  },
  {
    id: 'kite', word: 'kites', match: /^kites?$/, usual: 1, sky: true, band: null, depth: FLYERS.kite.depth, draw: kite,
  },
  // the birds: the key stays 'birds' (read.mjs's USUAL row), the drawer is here now
  {
    id: 'bird', word: 'birds', usual: 7, sky: true, band: null, depth: [25, 120], draw: bird,
    match: new RegExp(
      '^(birds?|gulls?|seagulls?|crows?|ravens?|rooks?|jackdaws?|swallows?|sparrows?|swifts?|starlings?|songbirds?|' +
      'finch|finches)$',
    ),
  },
  { id: 'bat', word: 'bats', match: /^bats?$/, usual: 5, sky: true, band: null, depth: [8, 40], draw: bird },
  {
    id: 'whale', word: 'whales', match: /^(whales?|orcas?)$/, usual: 2, band: null, onWater: true,
    size: { w: 14, h: 4, d: 4 }, draw: (ctx, inst) => swimmer(ctx, inst, 'whale'),
  },
  {
    id: 'dolphin', word: 'dolphins', match: /^(dolphins?|porpoises?)$/, usual: 3, band: null, onWater: true,
    size: { w: 2.7, h: 1.1, d: 0.6 }, draw: (ctx, inst) => swimmer(ctx, inst, 'dolphin'),
  },
  {
    id: 'shark', word: 'sharks', match: /^sharks?$/, usual: 1, band: null, onWater: true, size: { w: 4, h: 0.6, d: 1 },
    draw: (ctx, inst) => swimmer(ctx, inst, 'shark'),
  },
  { // read by its condition below, not by its match: the underwater family's own 'fish' keeps its claim
    id: 'fish', word: 'fish', match: /^$/, usual: 4, band: null, onWater: true, size: { w: 0.4, h: 0.5, d: 0.2 },
    draw: (ctx, inst) => swimmer(ctx, inst, 'fish'),
  },
];

/**
 * Whether the prompt is a bare person word and known words only: read.mjs's bare() (which overlooks the figure
 * entry and the `figure` conditions here), every word known, and no family word but the portrait's. A pose word
 * (walking, sitting) is a scene's: 'a man walking' is a figure in a landscape, not a face.
 */
function aloneWithFigure(scene) {
  const ws = words(scene.prompt).flatMap((w) => COMPOUNDS[w] ?? [w]);
  if (!ws.every(knows) || !bare(scene)) return false;
  return ws.every((w) => {
    const family = familyFor(w);
    return !family || family.id === 'portrait';
  });
}

/** The number before a word in the prompt (a or an counts as one), or null. */
function numberBefore(ws, at) {
  const w = ws[at - 1];
  if (at <= 0 || w === undefined) return null;
  if (/^\d+$/.test(w)) return +w;
  return NUMBERS[w] ?? null;
}

/** Water for a sea creature when the words named none, said in scene.overridden. */
function bringWater(s, g, w) {
  if (g.water || g.beach) return;
  g.water = true;
  if (!s.waterWord) {
    s.waterWord = 'sea';
    s.lake = false;
  }
  s.overridden.push({ what: 'ground', from: g.land ?? 'grass', to: 'water', because: w });
}

export function installCreatures() {
  for (const entry of CREATURE_THINGS) register('things', entry);
  const condition = (entry) => register('conditions', entry);
  condition({ // a bare person word is the portrait family's; in a scene it is a figure
    id: 'figure-or-portrait', kind: 'weather', match: PORTRAIT_WORDS, figure: true,
    apply: (s) => {
      const ws = words(s.prompt), sideFace = (w, i) => w === 'face' && i > 0 && SIDE.test(ws[i - 1]);
      const head = ws.some((w, i) => PORTRAIT_HEAD.test(w) && !sideFace(w, i));
      const figures = s.instances.filter((i) => i.kind === 'people');
      if (!figures.length || s.family) return;
      const claim = head ? s.instances.length === figures.length : aloneWithFigure(s);
      if (!claim) return;
      s.instances = s.instances.filter((i) => !figures.includes(i));
      s.family = 'portrait';
      const p = s.portrait ??= { words: [], dropped: [] };
      for (const f of figures) for (const w of f.word.split(' ')) if (PORTRAIT_WORDS.test(w)) p.words.push(w);
      note(s, PORTRAIT_NOTE);
    },
  });
  condition({ // the irregular plurals: the usual number when no number stands before the word
    id: 'irregular-plurals', kind: 'weather', match: IRREGULAR, figure: true,
    apply: (s) => {
      const ws = words(s.prompt);
      for (const inst of s.instances) {
        const last = inst.word.split(' ').pop();
        if (!IRREGULAR.test(last) || inst.count !== 1 || inst.usual) continue;
        if (numberBefore(ws, ws.indexOf(last)) !== null) continue;
        const entry = CREATURE_THINGS.find((e) => (e.word ?? e.id) === inst.kind);
        inst.count = entry?.usual ?? 1;
        inst.usual = true;
      }
    },
  });
  condition({ // a collective noun binds to the creature word within three words after it, else it is ignored
    id: 'collective', kind: 'weather', match: COLLECTIVES,
    apply: (s, g, w) => {
      const ws = words(s.prompt), at = ws.indexOf(w), ours = CREATURE_THINGS.map((e) => e.word ?? e.id);
      const inst = s.instances.find((i) => i.index > at && i.index <= at + 3 && ours.includes(i.kind));
      if (!inst) {
        dropWord(s, w);
        return;
      }
      if (inst.count === 1 && !inst.usual) { // 'a herd of elephant': the usual number of them
        inst.count = CREATURE_THINGS.find((e) => (e.word ?? e.id) === inst.kind)?.usual ?? 1;
        inst.usual = true;
      }
    },
  });
  condition({ // a sea creature brings its water
    id: 'sea-creatures', kind: 'water', match: SEA_WORDS, apply: (s, g, w) => bringWater(s, g, w),
  });
  condition({ // 'fish': the underwater family's when an underwater word is named, else a leaping fish on the water
    id: 'fish', kind: 'water', match: FISH_WORDS,
    apply: (s, g, w) => {
      const ws = words(s.prompt);
      if (ws.some((x) => UNDERWATER_HEAD.test(x))) {
        familyFor(w)?.apply?.(s, w);
        return;
      }
      bringWater(s, g, w);
      const at = ws.indexOf(w), n = numberBefore(ws, at), usual = n === null && w === 'fish';
      const count = usual ? SWIMMERS.fish.usual : Math.min(40, n ?? 1);
      const inst = { kind: 'fish', count, size: 1, modifiers: [], word: w, index: at };
      s.instances.push(usual ? { ...inst, usual: true } : inst);
    },
  });
  condition({
    id: 'launching', kind: 'weather', match: /^(launching|launches|launch|lift-?off|liftoff|blast-?off|blastoff)$/,
    apply: (s) => { s.launching = true; },
  });
  condition({ // a pose, when there are figures to take it; else the word goes back among the ignored
    id: 'pose', kind: 'weather',
    match: /^(standing|stands?|walking|walks?|strolling|running|runs?|sitting|seated|sits?)$/,
    apply: (s, g, w) => {
      if (!s.instances.some((i) => (i.kind === 'people' || i.kind === 'crowds') && i.count > 0)) {
        dropWord(s, w);
        return;
      }
      s.pose = /^s(tand|it)/.test(w) ? (/sit|seat/.test(w) ? 'sitting' : 'standing') : 'walking';
    },
  });
  condition({ // bats fly at night: an unsaid hour is turned to night, and said
    id: 'bats-night', kind: 'weather', match: /^bats?$/,
    apply: (s) => {
      const timeWord = CONDITIONS.filter((c) => c.kind === 'time');
      if (s.time === 'night' || words(s.prompt).some((w) => timeWord.some((c) => c.match.test(w)))) return;
      s.overridden.push({ what: 'time', from: s.time, to: 'night', because: 'bats' });
      s.time = 'night';
      s.hour = 23;
    },
  });
}

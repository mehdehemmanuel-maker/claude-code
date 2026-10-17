// Hand-written types for tools/image.mjs (which re-exports tools/image/core.mjs and read.mjs), so TypeScript callers
// such as tests/unit/image.test.ts see the shapes. Kept by hand: the .mjs files are the source of truth.

export type Time = 'day' | 'dawn' | 'sunset' | 'night';
export type Ground = 'grass' | 'sand' | 'snow' | 'pavement' | 'water';

/** What the words were read as. `--describe` prints exactly this. */
export interface Scene {
  prompt: string;
  time: Time;
  clouds: number;
  fog: number;
  rain: number;
  snow: number;
  storm: boolean;
  ground: Ground;
  road: boolean;
  beach: boolean;
  things: Record<string, number>;
  colours: Record<string, string>;
  land: Ground;
  style?: string;
}

/** A thing's box in pixels: x, y its top left corner, w and h its size; the foot stands at (x + w / 2, y + h). */
export interface ThingBox { kind: string; x: number; y: number; w: number; h: number }
export interface Layout {
  horizon: number; // share of the height, from the top
  sun: [number, number]; // shares of the width and height
  shore: number | null; // share of the height where the water ends, when there is a shore
  things: ThingBox[];
}
export interface Image { width: number; height: number; data: Float32Array; layout: Layout }
export interface PaintOptions { width?: number; height?: number; seed?: number; style?: string }

export interface Light {
  top: number[]; horizon: number[]; sun: number[]; light: number[]; ambient: number; height: number; sunk: boolean;
}

/** What every pass and drawer is handed. */
export interface Ctx {
  W: number;
  H: number;
  hy: number;
  horizon: number;
  L: Light;
  gloom: number;
  sun: { x: number; y: number; left: boolean };
  rand: () => number;
  scene: Scene;
  layout: Layout;
  data: Float32Array;
  img: Image;
  sky: Float32Array | null;
  shoreY: number;
  scale: number;
  style: string | undefined;
  things: ThingEntry[];
  styles: StyleEntry[];
  px(x: number, y: number): number;
  put(x: number, y: number, c: ArrayLike<number>, a?: number): void;
  get(x: number, y: number, out?: number[]): number[];
  getSky(x: number, y: number, out?: number[]): number[];
  lit(c: ArrayLike<number>, k: number, out?: number[]): number[];
  air(c: ArrayLike<number>, depth: number, out?: number[]): number[];
  usual(thing: string, n: number): number;
  foot(fy: number): number;
  sizeAt(fy: number): number;
  col(thing: string, fallback: number[]): number[];
}

export interface ThingInstance { ux: number; fy?: number; uy?: number }
export interface ThingEntry {
  id: string;
  word: string;
  match: RegExp;
  usual: number;
  band: [number, number] | null;
  onWater?: boolean;
  sky?: boolean;
  draw(ctx: Ctx, inst: ThingInstance): Omit<ThingBox, 'kind'>;
}
export interface FamilyEntry { id: string; detect(scene: Scene): boolean; passes: Array<(ctx: Ctx) => void> }
export interface StyleEntry { id: string; match: RegExp; apply(img: Image, ctx: Ctx): void }
export interface GroundRead { land?: string; water: boolean; beach: boolean }
export interface ConditionEntry {
  id: string;
  kind: 'time' | 'sky' | 'weather' | 'ground' | 'water';
  match: RegExp;
  apply(scene: Scene, ground: GroundRead): void;
}

// read.mjs
export declare const NUMBERS: Record<string, number>;
export declare const COLOURS: Record<string, number[]>;
export declare const THINGS: Record<string, RegExp>;
export declare const COLLECTIVE: RegExp;
export declare const SINGLE: string[];
export declare const CONDITIONS: ConditionEntry[];
export declare function words(prompt: string): string[];
export declare function read(prompt: string): Scene;

// core.mjs
export declare const LIGHT: Record<Time, Light>;
export declare const things: ThingEntry[];
export declare const families: FamilyEntry[];
export declare const styles: StyleEntry[];
export declare const conditions: ConditionEntry[];
export declare function register(kind: 'things', entry: ThingEntry): ThingEntry;
export declare function register(kind: 'families', entry: FamilyEntry): FamilyEntry;
export declare function register(kind: 'styles', entry: StyleEntry): StyleEntry;
export declare function register(kind: 'conditions', entry: ConditionEntry): ConditionEntry;
export declare function paint(scene: Scene, opts?: PaintOptions): Image;
export declare function toRGBA8(img: Pick<Image, 'width' | 'height' | 'data'>): Uint8ClampedArray;
export declare function toImageData(img: Image): ImageData | { width: number; height: number; data: Uint8ClampedArray };

// image.mjs
export declare function png(img: Pick<Image, 'width' | 'height' | 'data'>): Buffer;
export declare function generate(prompt: string, opts?: PaintOptions & { out?: string }): string;

// ── reader + honest-report ──────── (appended by that package: the reader's instances and honesty,
// the shell's report)
export interface Instance {
  kind: string;
  count: number; // resolved: 'trees' is 9 (usual), 'no trees' 0 (none), 'a hundred trees' 40 (MOST)
  size: number;
  modifiers: string[];
  word: string;
  index: number; // the token the mention starts at
  colour?: string;
  placement?: 'near' | 'far' | 'left' | 'right' | 'centre';
  usual?: true;
  none?: true;
}
export interface Override { what: string; from: string | number; to: string | number; because: string }
export interface Scene {
  recognised: number;
  hour: number;
  wet: boolean;
  season: string | null;
  moonPhase: MoonPhase | null;
  roadKind: 'asphalt' | 'dirt' | null;
  river: boolean;
  frozen: boolean;
  text?: string;
  instances: Instance[];
  ignored: string[];
  overridden: Override[];
}
export interface GroundRead {
  clear: boolean;
  extra: Array<Pick<Instance, 'kind' | 'count' | 'word'> & { usual?: true }>;
}
export interface ConditionEntry { apply(scene: Scene, ground: GroundRead, word: string): void }
export declare const MOST: number;
export declare const USUAL: Record<string, number>;
export declare const USUAL_BY_WORD: Record<string, number>;
export declare const SIZE_WORDS: Record<string, number>;
export declare const PLACEMENT: Record<string, string>;
export declare const MOON_PHASES: RegExp;
export declare const NEGATION: RegExp;
export declare const STYLES: Array<{ id: string; match: RegExp }>;
export declare const STOP: Set<string>;
export declare const STOP_SCAN: Set<string>;
export declare const PHRASES: string[][];
export declare const COMPOUNDS: Record<string, string[]>;
export declare const AFTER: Record<string, RegExp>;
export declare function knows(word: string): boolean;
export declare function nounLooking(word: string): boolean;
export declare const SOFTWARE: string;
export declare function png(
  img: Pick<Image, 'width' | 'height' | 'data'>, opts: { text?: Record<string, string> },
): Buffer;
export declare function generate(prompt: string, opts?: PaintOptions & { out?: string; scene?: Scene }): string;
export declare function report(scene: Scene): string[];
export declare function strictRefusal(scene: Scene): string | null;
export declare function parse(argv: string[]): {
  words: string[]; out?: string; width?: number; height?: number; seed?: number; describe?: boolean; strict?: boolean;
  help?: boolean;
};

// -- primitives-world (tools/image/draw.mjs, re-exported by core.mjs) --------------------------------------------
// Anti-aliased primitives, a camera in metres, the sun's direction, shadows and the sprite wrapper. Ctx, ThingEntry
// and ThingInstance below merge with the interfaces above (declaration merging): new members only, nothing retyped.
// ctx.sun gains az, el, dir, visible and moon at run time; they are typed on ctx.light, which is the same object.

export type Colour = ArrayLike<number>;
/** A colour, or a function of the pixel's centre giving one (null or undefined leaves the pixel as it is). */
export type Shade = Colour | ((x: number, y: number) => Colour | null | undefined);
/** An alpha, or a function of the pixel's centre giving one. */
export type Alpha = number | ((x: number, y: number) => number);
/** The least a primitive needs to paint on. */
export interface Painter { W: number; H: number; put(x: number, y: number, c: Colour, a?: number): void }
export interface Projected { x: number; y: number; scale: number }
export interface Camera {
  eye: number; // metres above the ground
  horizon: number; // the row of the horizon
  focal: number; // pixels
  equiv: number; // the lens, in mm on a 24 mm-high frame
  project(xm: number, zm: number, hm?: number): Projected;
  groundZ(fy: number): number;
  groundX(px: number, fy: number): number;
}
export interface SunLight {
  x: number;
  y: number;
  left: boolean;
  az: number; // radians right of the lens axis
  el: number; // radians above the horizon
  dir: [number, number, number];
  visible: boolean; // a disc is in the sky to cast shadows
  moon: boolean;
}
export interface Footprint { w: number; d: number }
export interface Sizes {
  eye: number;
  person: number;
  car: { l: number; w: number; h: number; wheel: number; wheelbase: number };
  kart: { l: number; w: number; h: number };
  lane: number;
  lanes: number;
  centreLine: number;
  dash: { on: number; period: number };
  pine: [number, number];
  broadleaf: [number, number];
  storey: number;
  building: { w: [number, number]; storeys: [number, number]; window: { w: number; h: number } };
  cabin: {
    w: number; d: number; wall: number; rise: number; door: { w: number; h: number }; window: number; sill: number;
    chimney: number;
  };
  sailboat: { hull: number; beam: number; freeboard: number; mast: number; boom: number; foot: number };
  birdSpan: number;
}
export declare const SIZES: Sizes;
export declare const ELEVATION: { dawn: number; day: [number, number]; sunset: number; night: number };
export declare function elevationAt(hour: number, noon: number): number;
export declare function camera(W: number, H: number, hy: number, equiv?: number): Camera;
export declare function sunlight(
  scene: Scene, sun: { x: number; y: number }, L: Light, cam: Camera, W: number, horizon: number,
): Pick<SunLight, 'az' | 'el' | 'dir' | 'visible' | 'moon'>;
export declare function shadowLength(h: number, el: number): number;
export declare function shadowPoints(
  az: number, el: number, xm: number, zm: number, fp: Footprint, h: number, lift?: number,
): number[];
export declare function hull(flat: ArrayLike<number>): number[];
export declare function canvas(
  W: number, H: number,
): Painter & { data: Float32Array; get(x: number, y: number, out?: number[]): number[] };
export declare function disc(
  ctx: Painter, cx: number, cy: number, r: number, c: Shade, a?: Alpha, soft?: number,
): void;
export declare function ellipse(
  ctx: Painter, cx: number, cy: number, rx: number, ry: number, c: Shade, a?: Alpha, soft?: number,
): void;
export declare function poly(ctx: Painter, pts: ArrayLike<number>, c: Shade, a?: Alpha, soft?: number): void;
export declare function quad(
  ctx: Painter, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
  c: Shade, a?: Alpha, soft?: number,
): void;
export declare function tri(
  ctx: Painter, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Shade, a?: Alpha,
  soft?: number,
): void;
export declare function rect(
  ctx: Painter, x: number, y: number, w: number, h: number, c: Shade, a?: Alpha, soft?: number,
): void;
export declare function line(
  ctx: Painter, x0: number, y0: number, x1: number, y1: number, width: number, c: Shade, a?: Alpha, soft?: number,
): void;
export interface Ctx {
  camera: Camera;
  light: SunLight;
  tops: Int16Array[]; // per sprite id: the highest row it painted solidly in each column, -1 where none
  project(xm: number, zm: number, hm?: number): Projected;
  groundZ(fy: number): number;
  groundX(px: number, fy: number): number;
  shadow(xm: number, zm: number, fp: Footprint, h: number, lift?: number): void;
  sprite<T>(zm: number, draw: () => T, id?: number): T;
  disc(cx: number, cy: number, r: number, c: Shade, a?: Alpha, soft?: number): void;
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Shade, a?: Alpha, soft?: number): void;
  poly(pts: ArrayLike<number>, c: Shade, a?: Alpha, soft?: number): void;
  quad(
    x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number,
    c: Shade, a?: Alpha, soft?: number,
  ): void;
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Shade, a?: Alpha, soft?: number): void;
  rect(x: number, y: number, w: number, h: number, c: Shade, a?: Alpha, soft?: number): void;
  line(x0: number, y0: number, x1: number, y1: number, width: number, c: Shade, a?: Alpha, soft?: number): void;
}
export interface ThingInstance { zm?: number } // metres away; a drawer reads it before groundZ(fy)
export interface ThingEntry {
  depth?: [number, number]; // how far away it may stand, in metres (nearest, farthest); band is used when absent
  size?: { w: number; h: number }; // its typical width and height in metres, so the shore can judge whether it fits
}

// ── sky-light ──────────────────────
// celestialPass, cloudPass and landBehindPass (tools/image/passes.mjs): the moon and the ridges in the layout, the
// moon's phase as the reader's Scene.moonPhase (declared above) carries it, and a probe a test can hook in to read
// the face term of each ridge column. Scene.hour (above) is read too: before 8 or from 17 the sun is drawn low.

/**
 * The moon's phase, the reader's words (MOON_PHASES and 'moonless'); null is a full moon, as before. The painter
 * draws full, half and crescent, and no moon for new or moonless; gibbous, waxing and waning are drawn full.
 */
export type MoonPhase = 'full' | 'half' | 'crescent' | 'new' | 'gibbous' | 'waxing' | 'waning' | 'moonless';
/** One ridge of the land behind: its per-column top in pixels (rows from the top of the picture). */
export interface RangeLine { kind: 'mountains' | 'hills'; depth: number; top: number[] }
export interface Layout {
  moon?: [number, number] | null; // shares of the width and height, null when no moon is drawn
  ranges?: RangeLine[]; // far to near, set by landBehindPass
}
export interface Ctx {
  /** Set by a test pass: called per ridge column as probe("face", range, x, face, slope). */
  probe?: (name: 'face', range: number, x: number, face: number, slope: number) => void;
}

// ── finish-styles-text: styles.mjs, text.mjs, font.mjs (the interfaces above are merged into, not redeclared)
/** What placeText did with the caption, in Layout.text. */
export interface TextLayout {
  text: string;
  lines: string[]; // one or two, the second ending in '...' when truncated
  truncated: boolean;
  at: 'top' | 'bottom'; // the third of the picture it went in
  x: number; // the block's top-left corner and size in pixels
  y: number;
  w: number;
  h: number;
}
export interface TextOptions {
  x: number;
  y: number;
  scale?: number; // default textScale(H) = max(2, round(H / 180))
  colour?: ArrayLike<number>;
  halo?: boolean | number; // true: a ring half the scale thick (1 px at scales 1 and 2); a number: that many px
  haloColour?: ArrayLike<number>;
}
export interface Layout { text?: TextLayout }
export interface Scene { text?: string }
export interface PaintOptions { text?: string }
export interface Ctx { text?: string }
/** A style may turn the default finish's grain or vignette off (both default to true). */
export interface StyleEntry { grain?: boolean; vignette?: boolean }

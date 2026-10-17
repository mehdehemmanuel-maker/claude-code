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

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

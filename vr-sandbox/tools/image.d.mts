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
  /** lit() for the ground plane's own tones: by day the light is mixed 35% toward white, at night it is the light. */
  litGround(c: ArrayLike<number>, k: number, out?: number[]): number[];
  air(c: ArrayLike<number>, depth: number, out?: number[]): number[];
  usual(thing: string, n: number): number;
  foot(fy: number): number;
  sizeAt(fy: number): number;
  col(thing: string, fallback: number[]): number[];
}

export interface ThingInstance { ux: number; fy?: number; uy?: number }
export interface ThingEntry {
  id: string;
  word?: string; // the key in scene.things when not the id (the built-ins: trees, houses, …)
  match: RegExp; // the reader tries it on every token: a registered thing is read without an edit to read.mjs
  usual: number;
  band?: [number, number] | null;
  onWater?: boolean;
  sky?: boolean;
  draw(ctx: Ctx, inst: ThingInstance): Omit<ThingBox, 'kind'>;
}
export interface FamilyEntry {
  id: string;
  detect(scene: Scene): boolean;
  passes: Array<(ctx: Ctx) => void>;
  words?: RegExp; // the tokens the family claims in the reader
  apply?(scene: Scene, word: string): void; // run on each claimed token; without it, scene.family = id
}
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

// core.mjs (the registries are registry.mjs's arrays, re-exported, with its vocabulary helpers)
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
  /** The word that brought the water, singular (sea, lake, river, harbour, beach, boats force none); null without. */
  waterWord: string | null;
  /** A still water (lake, pond, loch, lagoon, tarn, lakeside): the painter gives it a far bank. */
  lake: boolean;
  text?: string;
  family?: string; // set by a registered family's words (registry.mjs)
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
export declare function generate(
  prompt: string, opts?: PaintOptions & { out?: string; scene?: Scene; painted?: (image: Image) => void },
): string;
export declare function report(scene: Scene): string[];
export declare function strictRefusal(scene: Scene): string | null;
export declare function parse(argv: string[]): {
  words: string[]; out?: string; width?: number; height?: number; seed?: number; describe?: boolean; strict?: boolean;
  help?: boolean; style?: string; text?: string;
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
export declare function camera(W: number, H: number, hy: number, equiv?: number, eye?: number): Camera;
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
  size?: { w: number; h: number; d?: number }; // its width, height and depth in metres (d: placement-critic)
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
  lines: string[]; // one or two, the second ending in '...' when truncated; [] when nothing fits; as drawn ('?')
  truncated: boolean;
  substituted: number; // characters outside the font (code points 32-126), drawn as '?'
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
/** `flat` is a style's ask (minimalist): a sky with no glow round the sun or the moon, a sun with no halo. */
export interface Scene { text?: string; flat?: boolean }
/** The style and text options win over the words' (the shell says so in its `changed:` line). */
export interface PaintOptions { text?: string }
export interface Ctx { text?: string }
/**
 * A style may turn the default finish's grain or vignette off (both default to true) and ask something of the scene
 * before it is painted (minimalist: clouds 0.05, fog 0, flat true), laid over the scene by paint().
 */
export interface StyleEntry { grain?: boolean; vignette?: boolean; scene?: Partial<Scene> }
/** The shell's stderr notes on a caption: cut to two lines, characters drawn as '?'. */
export declare function textNotes(layout: Layout): string[];

// ── vocabulary registry (tools/image/registry.mjs, re-exported by core.mjs) ──
/** The key of a thing in scene.things: its word when it has one, else its id. */
export declare function keyOf(entry: Pick<ThingEntry, 'id' | 'word'>): string;
export declare function thingFor(token: string): ThingEntry | undefined;
export declare function thingByKey(key: string): ThingEntry | undefined;
export declare function familyFor(token: string): FamilyEntry | undefined;
export declare function styleNamed(token: string): StyleEntry | undefined;

// ── water-reflections (tools/image/passes.mjs: groundPass's wandering shore, far bank, horizon haze and water;
// reflectPass after thingsPass; things.mjs's shoreFor says when a thing keeps the far bank) ──
export interface Layout {
  shoreLine?: number[] | null; // per column, the row where the water ends as a share of the height; null: no shore
  farShore?: number | null; // a river's far bank as a share of the height; null when the scene is not a river
}
export interface Ctx {
  shoreLine?: Float32Array; // the shore row per column, in pixels (H where there is no shore)
  shoreAt?(x: number): number;
  farLine?: Float32Array | null; // a river's far bank per column, else null
  farAt?: ((x: number) => number) | null;
  bankTop?: Float32Array | null; // the far-bank strip's top per column, when one is painted
  farBankNeeded?: boolean; // set by shoreFor: a land thing cannot stand on the near shore and keeps the far bank
  plate?: Float32Array | null; // the frame as groundPass left it, before the things: what reflectPass mirrors against
}

// ── ground-weather (tools/image/passes.mjs: landPixel and the road, weatherFarPass and weatherPass; the helpers
// are typed in tools/image/passes.d.mts for a direct import). Ctx merges with the interfaces above.
export interface Ctx {
  /** The season's leaf colours, (pine, r) -> colour, set by core.mjs's tools(); null when no season was named. */
  leaf?: ((pine: boolean, r: number) => number[]) | null;
  /** The fog's scale on every sprite's air fade (1 + fog * 1.2), set by weatherFarPass, read by ctx.sprite. */
  fogK?: number;
  /** The road's drifting centre at a row, in pixels (W * (0.5 + roadDrift(foot(y)))), set by groundPass. */
  roadX?: (y: number) => number;
}

// ── placement-critic: things.mjs place() and critic(), draw.mjs frameCamera() (merged into the above, not retyped)
// The instance every drawer is handed carries the shared fields: colour ([r, g, b] in 0..1, or undefined when the
// words gave none), size (a factor: tiny 0.5, huge 2), heading ('away' for a vehicle on a road seen from behind),
// xm/zm (metres right of the lens axis and away) and instance (the reader's record). camera() takes the eye
// frameCamera chose (declared above); ThingEntry.size gained d (above).
export type Heading = 'away' | 'toward' | 'side';
/** The shared interface of the round, declared once: placement sets these, every drawer (vehicles too) reads them. */
export interface ThingInstance {
  colour?: number[]; // [r, g, b] in 0..1 from the words, undefined when they gave none
  size?: number; // a factor, 1 by default: tiny 0.5, huge 2
  heading?: Heading; // 'away' for a vehicle on a road seen from behind
  xm?: number; // metres right of the lens axis (zm, above, is the depth)
  yaw?: number; // radians the nose turns from the heading; without it, on the road, a little toward the near side
  instance?: Instance; // the reader's record
  word?: string; // the word that named it, when no instance record is given
}
export interface ThingEntry { onRoad?: boolean } // stands on the road at a lane's centre, heading along it
/** What frameCamera chose: the eye height in metres, the lens, the ground share the fit was made for, for what. */
export interface Framing { eye: number; equiv: number; near: number; subject: string | null }
export interface ThingBox {
  xm?: number;
  zm?: number;
  heading?: Heading;
  footprint?: Footprint; // metres on the ground, as it faces
  crowded?: boolean; // placed over another after every try failed (a frame too small for what was asked)
  visible?: boolean; // the critic saw it: half its painted pixels still its own, over 12 rows or columns at 720 rows
  pixels?: number; // how many pixels are its own in the finished picture
  painted?: number; // how many it painted (what it would show alone): pixels / painted is how much of it shows
  replaced?: boolean; // the critic could not see it the first time and placed it again
}
export interface Layout { camera?: { eye: number; equiv: number; near: number | null } }
export interface Scene { report?: { visible?: Record<string, [number, number]> } } // { trees: [seen, asked] }
export interface Ctx {
  framing?: Framing;
  owner?: Int32Array; // per pixel, the id (index in layout.things) of the last thing painted solidly there, or -1
  painted?: number[]; // per id, the pixels it painted solidly, covered since or not (what it would show alone)
  // the road's centre in metres is read from ground-weather's ctx.roadX (above) through groundX: no field of its own
}
/** How much of the frame the subject may take: its height of the rows, its width of the columns (by thing id). */
export declare const FIT: { height: number; width: number; house: number; boat: number; [id: string]: number };
/** Where the near subject stands, as a share of the ground band: mid-field, or the near shore of a water scene. */
export declare const NEAR_SHARE: { land: number; water: number };
/** The share of the columns one of n things of a kind may take: its kind's share over the square root of n. */
export declare function fitWidth(id: string, n?: number): number;
export declare function frameCamera(
  scene: Scene, instances: Instance[] | undefined, opts?: { W?: number; H?: number; horizon?: number },
): Framing;
/** A want: one reader instance with a registered drawer, as place() takes it. */
export interface Want {
  entry: ThingEntry;
  instance: Instance;
  count: number;
  size: number;
  colour?: number[];
  placement?: Instance['placement'];
  asked: boolean; // by count or as a single thing, not the usual number
}
/** One placed copy: where it stands and the box it will be drawn in. */
export interface Placed {
  want: Want;
  entry: ThingEntry;
  u: number; // the ground share its foot is at
  ux: number;
  uy?: number;
  fy: number;
  zm: number;
  xm: number;
  heading: Heading;
  fp: Footprint;
  box: { x: number; y: number; w: number; h: number } | null;
  farBank?: boolean;
  crowded?: boolean;
  replaced?: boolean;
  seed?: number;
  id?: number;
}
export declare function place(ctx: Ctx, want: Want, i: number, placed: Placed[], retry?: boolean): Placed | null;
export declare function critic(
  ctx: Ctx, placed: Placed[], list?: Want[],
): { tally: Record<string, [number, number]>; again: Placed[] };

// ── vehicles (tools/image/things/vehicles.mjs, re-exported by core.mjs) ──
// Every vehicle kind from one rule and a figures table in metres (each row cites src/nexus/machines.ts or says
// 'typical'), drawn as projected prisms and wheels at the instance's heading. The shared ThingInstance fields it
// reads (colour, size, heading, xm, yaw, instance, word) and ThingEntry.onRoad are declared once, above.

export type Cab = 'none' | 'forward' | 'mid' | 'rear';
/** An axle: u metres behind the nose, its tyre's radius and width, its track (0 for a single-track machine). */
export interface VehicleAxle { u: number; r: number; w: number; track: number; dual?: boolean }
export interface VehicleBox {
  length: number; height: number; startsAt: number; floor?: number; rail?: number; width?: number;
}
export interface VehicleRow {
  name: string;
  shape: 'kart' | 'car' | 'pickup' | 'bus' | 'truck' | 'semi' | 'forklift' | 'atv' | 'bike' | 'bicycle' | 'tractor';
  source: string; // what is published (with its machines.ts lines) and what is typical
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  overhangs: { front: number; rear: number };
  wheelDiameter: { front: number; rear: number };
  clearance: number;
  bodyHeight: number | null;
  cab: Cab;
  cabLength: number | null;
  cabHeight?: number;
  hoodLength?: number;
  tractorLength?: number; // the semi: its tractor alone (length is the combination)
  bed: VehicleBox | null;
  trailer: VehicleBox | null;
  axles: VehicleAxle[];
  openSeat: boolean;
  rollHoop: boolean; // false on every row: none in machines.ts (a rental kart's seat shell to 0.5 m stands in)
  mast: { u: [number, number]; width: number; height: number } | null;
  roofSign: { u: [number, number]; w: number; h: [number, number] } | null;
  lamps: { front: number | null; rear: number | null }; // heights, null where the machine carries none
  lines?: {
    nose: number; cowl: number; belt: number; roofF: number; roofR: number; roof: number; deck: number; tail: number;
  };
  guard?: { top: number; posts: number[] };
  seat?: number;
  rake?: number;
  [more: string]: unknown;
}
export type VehicleKind =
  | 'kart' | 'car' | 'hatchback' | 'pickup' | 'truck' | 'semi' | 'suv' | 'van' | 'bus' | 'taxi' | 'forklift'
  | 'motorcycle' | 'dirtbike' | 'bicycle' | 'atv' | 'tractor';
export declare const VEHICLES: Record<VehicleKind, VehicleRow>;
/** The words each registered kind is read by (hatchback is a word of car, pickup of truck). */
export declare const VEHICLE_WORDS: Record<string, RegExp>;
/** Paintwork an uncoloured vehicle picks from by the seed. */
export declare const PALETTE: number[][];
export declare const VEHICLE_THINGS: ThingEntry[];
/** A part in the vehicle's own frame (u from the nose, v right, h up, metres). */
export interface VehiclePart {
  kind: 'prism' | 'wheel' | 'tube' | 'ring' | 'disc' | 'lamp';
  axis?: 'u' | 'v' | 'h';
  u?: number;
  v?: number;
  h?: number;
  r?: number;
  w?: number;
  [more: string]: unknown;
}
export declare function vehicleRow(kind: string, word?: string): VehicleRow;
export declare function vehicleParts(
  row: VehicleRow, colour: number[], glass?: number[], uncoloured?: boolean,
): VehiclePart[];
export declare function drawVehicle(ctx: Ctx, inst: ThingInstance, kind: string): Omit<ThingBox, 'kind'>;

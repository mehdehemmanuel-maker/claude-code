// Hand-written types for tools/image/passes.mjs (ground-weather's exports; the passes themselves are typed as the
// family's pass functions in ../image.d.mts). The .mjs file is the source of truth.
import type { Ctx, Scene, ThingEntry } from '../image.mjs';

/** What the ground is made of, by name: grass, sand, snow, pavement, water. */
export declare const GROUND: Record<string, number[]>;
export declare function skyPass(ctx: Ctx): void;
export declare function celestialPass(ctx: Ctx): void;
export declare function cloudPass(ctx: Ctx): void;
export declare function landBehindPass(ctx: Ctx): void;
export declare function groundPass(ctx: Ctx): void;
/** Before the things: ctx.fogK, and the two far layers of rain or snow (near things hide them). */
export declare function weatherFarPass(ctx: Ctx): void;
/** Over everything: wet's darkening, snow on every top edge, the fog band, the near rain and snow. */
export declare function weatherPass(ctx: Ctx): void;
export declare function finishPass(ctx: Ctx): void;

/** The season's land and leaf colours: autumn (straw; orange, rust, gold), spring, summer; winter: snow. */
export declare const SEASON: Record<'autumn' | 'spring' | 'summer', { land: number[]; leaf: number[][] }>;
/** (pine, r in 0..1) -> a leaf colour for the season, or null when no season was named. */
export declare function seasonLeaf(scene: Scene): ((pine: boolean, r: number) => number[]) | null;
/** The land's colour in its season (grass turns to straw in autumn). */
export declare function seasonLand(scene: Scene): number[];
/** The road's centre's drift across the picture at a depth, as a share of the width to add to 0.5. */
export declare function roadDrift(near: number): number;
/** The row fields this package adds (set once per picture; landRow sets the per-row ones). */
export declare function landFields(ctx: Ctx): {
  landTint: number[]; hills: boolean; flowers: boolean; rc: number; vergeHalf: number; rutAt: number; rutHalf: number;
  relief: number; tuft: number; flowerCell: number;
};
export declare function landRow(ctx: Ctx, row: Record<string, unknown> & { near: number; ppm: number }): void;
/** The light on a slope: the normal from the slopes (m per m across, away) against the sun's direction, 1 +- amp. */
export declare function reliefShade(dir: ArrayLike<number>, hx: number, hz: number, amp: number, k?: number): number;
/** A dune field in metres: out = [height 0..1, slope across, slope away]. */
export declare function duneAt(xm: number, zm: number, out: number[]): number[];
/** Named hills in the frame: out = [height 0..1, slope across per u, slope down per near, rise in rows]. */
export declare function hillAt(u: number, near: number, band: number, out: number[]): number[];
/** How much of a grass tuft stands at a pixel, 0..1. */
export declare function tuftAt(
  ctx: Ctx, row: { tuft: number }, x: number, y: number, xm: number, zm: number,
): number;

export interface RainLayer { share: number; len: [number, number]; alpha: number; bright: number; width: number }
export interface SnowLayer { share: number; r: number; alpha: number }
/** Far to near: the near layer's streaks are longer and brighter than the far layer's. */
export declare const RAIN_LAYERS: RainLayer[];
export declare const SNOW_LAYERS: SnowLayer[];
/** The flowers thing core.mjs registers after the six built-ins: a flag on the land, and a clump per counted one. */
export declare const FLOWERS: ThingEntry;

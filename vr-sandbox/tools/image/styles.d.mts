// Hand-written types for tools/image/styles.mjs (finish-styles-text). The .mjs file is the source of truth.
import type { StyleEntry } from '../image.mjs';

/** The styles core.mjs registers, in order: pixel, poster, minimalist, sketch, watercolour, mono, sepia, vintage. */
export declare const STYLES: StyleEntry[];
/** The entry with this id, or an Error whose message lists every id in `styles`. */
export declare function styleFor(id: string, styles: StyleEntry[]): StyleEntry;
/** The first style one of the words names, for a reader that sets scene.style. */
export declare function styleOf(words: string[], styles?: StyleEntry[]): StyleEntry | undefined;
/** round(H / 90), never under 2: the pixel style's cell. */
export declare function pixelCell(H: number): number;
export declare function quantise(samples: Float32Array, n: number, k: number): Float32Array;
export declare function luma(data: Float32Array, n: number, out?: Float32Array): Float32Array;
export declare function sobel(f: Float32Array, W: number, H: number, out?: Float32Array): Float32Array;
export declare function boxBlur(
  data: Float32Array, W: number, H: number, r: number, ch?: number, out?: Float32Array,
): Float32Array;
export declare function posterise(data: Float32Array, levels: number): void;
export declare function grain(data: Float32Array, W: number, H: number, amp: number, key: number): void;
export declare function vignette(data: Float32Array, W: number, H: number, strength: number): void;

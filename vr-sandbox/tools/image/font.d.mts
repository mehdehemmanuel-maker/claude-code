// Hand-written types for tools/image/font.mjs (finish-styles-text). The .mjs file is the source of truth.

export declare const GLYPH_W: 5;
export declare const GLYPH_H: 7;
export declare const FIRST: 32;
export declare const LAST: 126;
/** 95 glyphs × 9 hex digits: see the packing format in font.mjs. */
export declare const FONT: string;
/** Index into FONT for a character or code point, or -1 outside 32..126. */
export declare function glyphIndex(ch: string | number): number;
/** Seven rows of five bits each (bit 4 the leftmost column); anything outside 32..126 gives '?'. */
export declare function glyph(ch: string | number): readonly number[];
/** The box the glyphs of `text` cover in pixels; the halo is not counted. */
export declare function measure(text: string, scale?: number, gap?: number, lineGap?: number): {
  width: number; height: number;
};
/** Calls put(px, py, isHalo) for every halo pixel, then every ink pixel, of `text` at (x, y). */
export declare function drawText(
  put: (px: number, py: number, isHalo: boolean) => void,
  text: string,
  x: number,
  y: number,
  opts?: { scale?: number; gap?: number; lineGap?: number; halo?: boolean | number },
): void;

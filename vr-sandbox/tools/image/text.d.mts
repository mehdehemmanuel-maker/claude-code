// Hand-written types for tools/image/text.mjs (finish-styles-text). The .mjs file is the source of truth.
import type { Ctx, TextLayout, TextOptions } from '../image.mjs';

export declare const INK: number[];
export declare const HALO: number[];
/** max(2, round(H / 180)): the font scale for a picture of H rows. */
export declare function textScale(H: number): number;
/** Paints text with its top-left glyph corner at (x, y) through ctx.put; returns the box the glyphs cover. */
export declare function drawText(
  ctx: Pick<Ctx, 'W' | 'H' | 'put'>,
  text: string,
  opts: TextOptions,
): { x: number; y: number; w: number; h: number };
/** One line, two, or two with an ellipsis, none wider than maxWidth; characters outside the font counted as '?'. */
export declare function fitText(
  text: string, scale: number, maxWidth: number,
): { lines: string[]; truncated: boolean; substituted: number };
/** Lays a caption out top- or bottom-centre away from the layout's things, paints it, records ctx.layout.text. */
export declare function placeText(ctx: Pick<Ctx, 'W' | 'H' | 'put' | 'layout'>, text: string): TextLayout;

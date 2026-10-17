// Hand-written types for tools/image-examples.mjs (the gallery script), so tests/unit/image-examples.test.ts sees
// the shapes. Kept by hand: the .mjs file is the source of truth.

/** A row of the gallery: one picture, a strip of seeds, a grid of styles, a sheet of prompts, or an honesty run. */
export interface Example {
  file: string;
  prompt?: string;
  size: [number, number];
  seed?: number;
  caption: string;
  describe?: boolean;
  lead?: boolean;
  pair?: 'left' | 'right';
  strip?: number;
  styles?: string[];
  cols?: number;
  cells?: { prompt: string; seed: number; label?: string }[];
  stderr?: boolean;
}
export declare const EXAMPLES: Example[];
/** docs/images, resolved. */
export declare const DIR: string;
/** The README's generated regions: [open marker, close marker] by name. */
export declare const MARK: Record<'leads' | 'gallery' | 'vocabulary', [string, string]>;
/** One example painted into memory: each file it makes (relative to docs/images) to its bytes. */
export declare function render(ex: Example): Map<string, Buffer>;
/** The header's vocabulary paragraph, reflowed to 118 columns. */
export declare function vocabulary(source?: string): string;
export declare function gallery(files: Map<string, Buffer>, leads?: boolean): string;
export declare function region(readme: string, mark: [string, string]): string | null;
export declare function withRegion(readme: string, mark: [string, string], body: string): string;

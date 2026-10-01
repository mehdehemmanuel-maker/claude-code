// What building needs from a place to build in: the document and its undo, where each part is, and what it's made
// of. The headset's workshop is one (App); Ego's test bench is another (bench.ts), a real document with no headset.

import type { Material } from '../data/materials';
import type { DocStore } from '../doc/store';
import type { BuildDoc, Part, Pose } from '../doc/types';

export interface Workshop {
  readonly store: DocStore;
  readonly doc: BuildDoc;
  /** Where a part is now: in the headset, where physics has it; on a bench, where it was put. */
  livePose(id: string): Pose | null;
  materialOf(p: Part): Material;
  readonly settings: { placeFrozen: boolean };
  /** Your usual joint for two materials, if you have one (Ego's memory). */
  joinPreference?: ((a: Material, b: Material | null) => string | null) | null;
  /** A joint you chose by hand, for her to remember. */
  joinChosen?: ((a: Material, b: Material | null, kind: string) => void) | null;
}

// Ego's test bench: a real build document, with its undo, and no headset. She builds a design here first, through the
// same Forge, the same Best join and the same commands as your hands, so what she tests is exactly what she'd build.

import { getMaterial, type Material } from '../data/materials';
import { newDoc } from '../doc/commands';
import { DocStore } from '../doc/store';
import type { Part, Pose, SimSettings } from '../doc/types';
import type { Workshop } from './workshop';

export class Bench implements Workshop {
  readonly store: DocStore;
  readonly settings = { placeFrozen: false };

  constructor(sim?: SimSettings) {
    const doc = newDoc('Test bench');
    if (sim) doc.sim = structuredClone(sim);
    this.store = new DocStore(doc);
  }

  get doc() {
    return this.store.doc;
  }

  /** On a bench nothing has moved: a part is where it was put. */
  livePose(id: string): Pose | null {
    return this.doc.parts[id]?.pose ?? null;
  }

  materialOf(p: Part): Material {
    return this.doc.materials[p.material] ?? getMaterial(p.material);
  }
}

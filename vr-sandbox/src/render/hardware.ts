// What a joint looks like: the hardware the joint is (bolts, screw heads, a weld bead, a hinge pin, a servo horn, a
// wire), declared here per connector kind as plain shapes and drawn by the renderer as declared and not otherwise.
// Presentation is derived from the world and never the other way (docs/LAW-TREE-INTEGRITY.md): a joint's hardware is
// what the joint's own template says it is made of, sized by the joint's own parameters; a part's body is drawn from
// the part (parts/registry visual); nothing else is drawn. Found when the renderer drew a servo case at every servo
// joint, with no servo part behind it, and a blind viewer took it for a machine.

import type { Connection, Vec3 } from '../doc/types';
import { numberOf } from '../schema/params';

export type Prim =
  | { shape: 'box'; size: Vec3; at?: Vec3; tint: number; opacity?: number }
  | { shape: 'cylinder'; radius: number; height: number; segments?: number; at?: Vec3; tint: number }
  /** A half sphere (a screw's or a nail's head), domed upward from its base. */
  | { shape: 'dome'; radius: number; at?: Vec3; tint: number }
  | { shape: 'sphere'; radius: number; at?: Vec3; tint: number }
  | { shape: 'torus'; radius: number; tube: number; at?: Vec3; tint: number }
  | { shape: 'helix'; turns: number; radius: number; wire: number; tint: number }
  /** A bead of a weld, along `dir` for `length` about `at`. */
  | { shape: 'capsule'; radius: number; length: number; at: Vec3; dir: Vec3; tint: number };

export interface Hardware {
  prims: Prim[];
  /** How the hardware follows its two ends: a fixed glyph at end A, a thing stretched end to end, or a slack rope. */
  dynamic: 'none' | 'spring' | 'rope' | 'band';
  rope?: { radius: number; tint: number };
}

const STEEL = 0xb8bec4;
const DARK = 0x33383d;
const NONE: Hardware = { prims: [], dynamic: 'none' };

/** A bolt's nominal diameter from its size, m. */
export function sizeD(size: string) {
  const m = /M(\d+)/.exec(size);
  return m ? Number(m[1]) / 1000 : 0.008;
}

/** Where fastener i of n sits on a w × l face. */
export function spread(i: number, n: number, w: number, l: number): [number, number] {
  if (n === 1) return [0, 0];
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const cx = i % cols, cz = Math.floor(i / cols);
  return [((cx + 0.5) / cols - 0.5) * w * 0.8, ((cz + 0.5) / rows - 0.5) * l * 0.8];
}

/** The hardware a connection is made of, in its end-A frame (y along the joint's axis). */
export function hardwareOf(c: Connection): Hardware {
  const p = c.params;
  const prims: Prim[] = [];
  switch (c.kind) {
    case 'bolted': {
      const d = sizeD(String(p['size'] ?? 'M8'));
      const n = Math.max(1, numberOf(p, 'count', 1));
      const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03);
      for (let i = 0; i < n; i++) {
        const [x, z] = spread(i, n, w, l);
        prims.push({ shape: 'cylinder', radius: d * 0.85, height: d * 0.65, segments: 6, at: [x, -d * 0.33, z], tint: STEEL });
        prims.push({ shape: 'cylinder', radius: d * 1.05, height: d * 0.18, segments: 16, at: [x, -d * 0.05, z], tint: STEEL });
      }
      return { prims, dynamic: 'none' };
    }
    case 'screwed':
    case 'nailed':
    case 'riveted': {
      const d = numberOf(p, 'diameter', 0.004);
      const n = Math.max(1, Math.min(24, numberOf(p, 'count', 1)));
      const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03);
      for (let i = 0; i < n; i++) {
        const [x, z] = spread(i, n, w, l);
        prims.push({ shape: 'dome', radius: d * 1.1, at: [x, -d * 0.2, z], tint: c.kind === 'riveted' ? 0xc6c9cc : STEEL });
      }
      return { prims, dynamic: 'none' };
    }
    case 'weld': {
      // a fillet bead in the corner along the seam, as wide as the weld and no wider: it follows the outline of the
      // bond for the weld's length (0 = all round), and reads as a seam, not an object
      const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03), leg = numberOf(p, 'leg', 0.005);
      const r = 0.35 * leg;
      const corners: [number, number][] = [[-w / 2, -l / 2], [w / 2, -l / 2], [w / 2, l / 2], [-w / 2, l / 2], [-w / 2, -l / 2]];
      let left = numberOf(p, 'length') > 0 ? numberOf(p, 'length') : 2 * (w + l);
      for (let i = 0; i < 4 && left > 1e-4; i++) {
        const [x0, z0] = corners[i]!, [x1, z1] = corners[i + 1]!;
        const span = Math.hypot(x1 - x0, z1 - z0), run = Math.min(span, left);
        if (run < 1e-4) continue;
        const ux = (x1 - x0) / span, uz = (z1 - z0) / span;
        prims.push({ shape: 'capsule', radius: r, length: run, at: [x0 + (ux * run) / 2, 0, z0 + (uz * run) / 2], dir: [ux, 0, uz], tint: 0x62666b });
        left -= run;
      }
      return { prims, dynamic: 'none' };
    }
    case 'glued':
    case 'soldered': {
      const w = numberOf(p, 'bondW', 0.03), l = numberOf(p, 'bondL', 0.03);
      return { prims: [{ shape: 'box', size: [w, 0.0015, l], tint: c.kind === 'glued' ? 0xe8c04a : 0xc7ccd1, opacity: 0.6 }], dynamic: 'none' };
    }
    case 'fixed':
    case 'clamp':
      // a clamp to the bench
      return { prims: [{ shape: 'box', size: [0.012, 0.012, 0.012], tint: 0xd23fd6 }], dynamic: 'none' };
    case 'hinge':
    case 'bearing':
    case 'eddy-brake':
    case 'motor': {
      const d = numberOf(p, 'pin', numberOf(p, 'bore', 0.01));
      prims.push({ shape: 'cylinder', radius: d / 2, height: Math.max(0.03, d * 5), segments: 16, tint: STEEL });
      if (c.kind === 'eddy-brake') {
        const r = numberOf(p, 'radius', 0.05);
        for (const s of [-1, 1]) prims.push({ shape: 'box', size: [0.02, 0.012, 0.02], at: [r, s * 0.01, 0], tint: 0xc23b22 });
      }
      if (c.kind === 'bearing') prims.push({ shape: 'torus', radius: d * 0.9, tube: d * 0.35, tint: DARK });
      return { prims, dynamic: 'none' };
    }
    case 'servo':
      // the horn on the shaft face: a nylon disc the common 16 mm size, 3 mm thick; the case and the shaft are the
      // servo part's own
      return { prims: [{ shape: 'cylinder', radius: 0.008, height: 0.003, segments: 24, at: [0, 0.0015, 0], tint: 0xf2f2ee }], dynamic: 'none' };
    case 'slider': {
      const max = numberOf(p, 'max', 0.2), min = numberOf(p, 'min', -0.2);
      return { prims: [{ shape: 'box', size: [0.012, Math.max(0.1, max - min), 0.012], at: [0, (max + min) / 2, 0], tint: STEEL }], dynamic: 'none' };
    }
    case 'ball':
      return { prims: [{ shape: 'sphere', radius: numberOf(p, 'stud', 0.012) * 0.8, tint: STEEL }], dynamic: 'none' };
    case 'spring': {
      const D = numberOf(p, 'D', 0.02), d = numberOf(p, 'd', 0.002), Na = numberOf(p, 'Na', 10);
      return { prims: [{ shape: 'helix', turns: Math.round(Na + 2), radius: D / 2, wire: Math.max(d, 0.0008), tint: 0x9ea6ad }], dynamic: 'spring' };
    }
    case 'link': {
      // a rod stretched end to end (the root is scaled to the distance)
      const d = numberOf(p, 'diameter', 0.008);
      return { prims: [{ shape: 'cylinder', radius: d / 2, height: 1, segments: 12, at: [0, 0.5, 0], tint: STEEL }], dynamic: 'spring' };
    }
    case 'band':
      return { prims: [{ shape: 'box', size: [numberOf(p, 'width', 0.02), 1, numberOf(p, 'thickness', 0.0015) * 2], at: [0, 0.5, 0], tint: 0xd35b2a }], dynamic: 'band' };
    case 'rope': {
      const grade = String(p['grade']);
      return { prims: [], dynamic: 'rope', rope: { radius: Math.max(0.005, numberOf(p, 'diameter', 0.006)) / 2, tint: grade.includes('steel') ? 0x8f969c : grade.includes('chain') ? 0x6d7277 : 0xd9c08a } };
    }
    case 'wire':
      // red insulation
      return { prims: [], dynamic: 'rope', rope: { radius: 0.003, tint: 0xb3261e } };
    case 'signal':
      // a three-wire servo lead
      return { prims: [], dynamic: 'rope', rope: { radius: 0.002, tint: 0x2b2f33 } };
    default:
      // a kind the registry does not have cannot exist; nothing is drawn for it
      return NONE;
  }
}

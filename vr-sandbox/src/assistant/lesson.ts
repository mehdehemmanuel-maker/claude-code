// Lessons that check what you do. A lesson is not a script: it is any design Ego can make, built first on her bench,
// and turned into the steps of building it yourself. Each step shows what to do (a guide where the part goes) and is
// done only when it is done in your world:
//
//   place  a part of that kind and material, about that size, where the guide shows it (its box within a few
//          centimetres of the guide's, so it is turned as it should be too)
//   join   those two parts joined: by the joint it names, or another of the same model (rigid for rigid, a hinge for a
//          hinge); the test then shows whether yours holds
//   test   played, and every joint still holding after a few seconds under its own weight
//
// The steps follow the bench's own order, which is the order the design is put together in, frame first. Whatever you
// build that the lesson didn't ask for is yours: it neither counts nor gets in the way.

import { Bench } from '../app/bench';
import type { Workshop } from '../app/workshop';
import { BuildHost } from '../forge/apphost';
import { run } from '../forge/forge';
import { getConnectorKind } from '../connectors/registry';
import { transformPoint } from '../doc/math';
import type { Part, SimSettings, Vec3 } from '../doc/types';
import { effectiveParams, getPartKind } from '../parts/registry';
import { shapeBounds } from '../parts/shapes';

export type Step =
  | { do: 'place'; target: Part; says: string }
  | { do: 'join'; a: string; b: string | null; kind: string; says: string }
  | { do: 'test'; seconds: number; says: string };

export interface Lesson {
  name: string;
  steps: Step[];
  /** The step you are on; steps.length when every one is done. */
  at: number;
  /** Which of your parts each of the lesson's parts became. */
  matched: Record<string, string>;
  /** When the test began, s of world time, if it has. */
  testFrom?: number;
}

/** How close a placed part must be to its guide: each face of its box within this of the guide's, m. */
export const PLACE_TOLERANCE = 0.06;

const kindLabel = (k: string) => getPartKind(k).label.toLowerCase();

/** A lesson from a design said in Forge: built on a bench first, then its parts, its joints and its test, in order. */
export function lessonFrom(name: string, forge: string, sim: SimSettings): Lesson {
  const bench = new Bench(sim);
  const r = run(forge, new BuildHost(bench));
  if (!r.ok) throw new Error(`the design didn't build: ${r.error}`);
  const doc = bench.doc;
  const steps: Step[] = [];
  const names = new Map<string, string>();
  for (const p of Object.values(doc.parts)) {
    const m = bench.materialOf(p);
    const said = `${p.name || kindLabel(p.kind)}`;
    names.set(p.id, said);
    steps.push({ do: 'place', target: structuredClone(p), says: `Place a ${m.name.toLowerCase()} ${kindLabel(p.kind)} where the guide shows it (${said}).` });
  }
  for (const c of Object.values(doc.connections)) {
    const k = getConnectorKind(c.kind);
    steps.push({ do: 'join', a: c.a.part, b: c.b?.part ?? null, kind: c.kind, says: `Join ${names.get(c.a.part)} ${c.b ? `to ${names.get(c.b.part)}` : 'to the floor'} with a ${k.label.toLowerCase()}.` });
  }
  steps.push({ do: 'test', seconds: 3, says: 'Play it: it must stand for three seconds under its own weight with every joint holding.' });
  return { name, steps, at: 0, matched: {} };
}

/** A part's box in the world: its collision shape's bounds at its pose. */
function boxOf(w: Workshop, p: Part, pose = w.livePose(p.id) ?? p.pose): { min: Vec3; max: Vec3 } {
  const kind = getPartKind(p.kind);
  const b = shapeBounds(kind.collision(effectiveParams(kind, p.params, w.materialOf(p))));
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const x of [b.min[0], b.max[0]]) for (const y of [b.min[1], b.max[1]]) for (const z of [b.min[2], b.max[2]]) {
    const q = transformPoint(pose, [x, y, z]);
    for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k]!, q[k]!); max[k] = Math.max(max[k]!, q[k]!); }
  }
  return { min, max };
}

/** Your part that does a place step: same kind and material, its box on the guide's. */
function placedFor(w: Workshop, l: Lesson, target: Part): string | null {
  const used = new Set(Object.values(l.matched));
  const want = boxOf(w, target, target.pose);
  for (const p of Object.values(w.doc.parts)) {
    if (used.has(p.id) || p.kind !== target.kind || p.material !== target.material) continue;
    const got = boxOf(w, p);
    if ([0, 1, 2].every((k) => Math.abs(got.min[k]! - want.min[k]!) <= PLACE_TOLERANCE && Math.abs(got.max[k]! - want.max[k]!) <= PLACE_TOLERANCE)) return p.id;
  }
  return null;
}

/** Joints of the same model do the same job (rigid for rigid, a hinge for a hinge): yours may differ from hers. */
const family = (kind: string) => getConnectorKind(kind).model;

/** Whether a join step is done in your world: those two parts joined, the joint intact. */
function joined(w: Workshop, l: Lesson, s: Extract<Step, { do: 'join' }>): boolean {
  const a = l.matched[s.a], b = s.b ? l.matched[s.b] : null;
  if (!a || (s.b && !b)) return false;
  return Object.values(w.doc.connections).some((c) => c.state.status !== 'broken' && family(c.kind) === family(s.kind)
    && ((c.a.part === a && (c.b?.part ?? null) === b) || (c.a.part === b && c.b?.part === a)));
}

export interface Progress { done: Step[]; now: Step | null; finished: boolean }

/**
 * Move the lesson on by what has been done in your world since it last looked. `playing` and `time` (world seconds)
 * say whether the world runs and how long; a joint broken under test sends you back to fix it.
 */
export function advance(w: Workshop, l: Lesson, playing: boolean, time: number): Progress {
  const done: Step[] = [];
  while (l.at < l.steps.length) {
    const s = l.steps[l.at]!;
    if (s.do === 'place') {
      const id = placedFor(w, l, s.target);
      if (!id) break;
      l.matched[s.target.id] = id;
    } else if (s.do === 'join') {
      if (!joined(w, l, s)) break;
    } else {
      const mine = new Set(Object.values(l.matched));
      const broken = Object.values(w.doc.connections).some((c) => c.state.status === 'broken' && (mine.has(c.a.part) || (c.b && mine.has(c.b.part))));
      if (!playing || broken) { delete l.testFrom; break; }
      l.testFrom ??= time;
      if (time - l.testFrom < s.seconds) break;
    }
    done.push(s);
    l.at++;
  }
  return { done, now: l.steps[l.at] ?? null, finished: l.at >= l.steps.length };
}

/** Where the guide for the step you are on goes: the part to place, at its pose. */
export const guideOf = (l: Lesson): Part | null => { const s = l.steps[l.at]; return s?.do === 'place' ? s.target : null; };

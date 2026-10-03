// The construction gate: the one door into this world. A part or a connection exists only by passing through it, in
// the document (DocStore, where every placement, load, undo and template goes) and again at the physics' intake
// (PhysicsWorld#apply, so that nothing reaches the solver that the document did not admit). What it refuses is not an
// object with a defect: it is a failed construction, and nothing of it enters anywhere. Each refusal cites the law it
// enforces (src/ganglia/tree/nodes.ts, the K series), so a refusal is a judgment, never a style.
//
// Found when a walker stood in the world on servo joints with no servo in them, drawing torque from no battery on
// commands from the solver's clock, its feet set into its shanks, drawn with servos that were not there: every layer
// below the law tree could represent what the tree forbade (docs/LAW-TREE-INTEGRITY.md).

import type { BuildDoc, Connection, Part, Pose } from '../../doc/types';
import { getMaterial, type Material } from '../../data/materials';
import { boughtRefusal, effectiveParams, getPartKind } from '../../parts/registry';
import { getConnectorKind, type ConnectorKind } from '../../connectors/registry';
import { REACH, spans, throughOf, unreachable } from '../../connectors/through';
import { separation, type Solid } from '../../doc/overlap';
import { composePose, length, sub } from '../../doc/math';
import { paramProblems } from '../../schema/params';
import type { CollisionShape, ConvexShape } from '../../parts/shapes';
import type { PartKind } from '../../parts/registry';

/**
 * Penetration two solids in contact may show and still be two solids in contact, m: the contacts' own slop (Jolt's
 * mPenetrationSlop, which the physics sets from here). Deeper, they are one space claimed twice.
 */
export const CONTACT_TOLERANCE = 0.002;

export interface Refusal {
  /** The law refused under (a node id in src/ganglia/tree/nodes.ts). */
  law: string;
  what: 'part' | 'connection';
  id: string;
  name: string;
  reason: string;
}

export class ConstructionRefused extends Error {
  readonly refusal: Refusal;
  constructor(r: Refusal) {
    super(`${r.name}: ${r.reason} [${r.law}]`);
    this.name = 'ConstructionRefused';
    this.refusal = r;
  }
}

/** What stands in a world as the gate sees it: every part at its place, every connection, the materials in use. */
export interface Standing {
  parts(): Iterable<Part>;
  connections(): Iterable<Connection>;
  material(id: string): Material | undefined;
}

export function standingOf(doc: BuildDoc): Standing {
  return {
    parts: () => Object.values(doc.parts),
    connections: () => Object.values(doc.connections),
    material: (id) => doc.materials[id] ?? safeMaterial(id),
  };
}

function safeMaterial(id: string): Material | undefined {
  try { return getMaterial(id); } catch { return undefined; }
}

function partKind(id: string): PartKind | null {
  try { return getPartKind(id); } catch { return null; }
}

function connectorKind(id: string): ConnectorKind | null {
  try { return getConnectorKind(id); } catch { return null; }
}

const finite = (v: readonly number[]) => v.every((x) => Number.isFinite(x));

/** A convex shape as the overlap test takes it: a hull by its bounding box (an overestimate, flagged as such). */
function solidOf(s: ConvexShape): Solid {
  if (s.type === 'box' || s.type === 'sphere' || s.type === 'cylinder') return s;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of s.points) for (let i = 0; i < 3; i++) { min[i] = Math.min(min[i]!, p[i]!); max[i] = Math.max(max[i]!, p[i]!); }
  return { type: 'box', half: [(max[0]! - min[0]!) / 2 || 1e-6, (max[1]! - min[1]!) / 2 || 1e-6, (max[2]! - min[2]!) / 2 || 1e-6] };
}

/** A part's solids in the world: its collision shape at its pose, a compound by its children. */
function solidsOf(part: Part, m: Material): { pose: Pose; solid: Solid }[] {
  const k = getPartKind(part.kind);
  const shape: CollisionShape = k.collision(effectiveParams(k, part.params, m));
  if (shape.type !== 'compound') return [{ pose: part.pose, solid: solidOf(shape) }];
  return shape.children.map((c) => {
    const solid = solidOf(c.shape);
    // a hull child's box is centred on its points, not on its frame
    if (c.shape.type === 'hull') {
      const pts = c.shape.points;
      const centre: [number, number, number] = [0, 1, 2].map((i) => (Math.min(...pts.map((p) => p[i]!)) + Math.max(...pts.map((p) => p[i]!))) / 2) as [number, number, number];
      return { pose: composePose(part.pose, { p: [c.p[0] + centre[0], c.p[1] + centre[1], c.p[2] + centre[2]], q: c.q }), solid };
    }
    return { pose: composePose(part.pose, { p: c.p, q: c.q }), solid };
  });
}

/** How far apart two parts are, m: negative by the depth their solids share. */
export function partSeparation(a: Part, ma: Material, b: Part, mb: Material): number {
  let best = Infinity;
  for (const x of solidsOf(a, ma)) for (const y of solidsOf(b, mb)) best = Math.min(best, separation(x.pose, x.solid, y.pose, y.solid));
  return best;
}

/** Joints whose template is a bore the other part runs in: a shaft in a bearing, a body in a split clamp, a rod through a slider's guide. Two solids so joined share that space by design. */
const BORED = new Set(['bearing', 'clamp', 'slider']);

/** A bolt's nominal diameter from its size, m (the connector's own reading of it). */
const boltD = (size: unknown) => { const m = /M(\d+)/.exec(String(size ?? '')); return m ? Number(m[1]) / 1000 : 0; };

/**
 * Whether two parts are declared to pass through one another by a bored joint between them: a bearing, a clamp, a
 * slider's guide; or a bolted joint whose bolt is one of the parts (a round rod of the bolt's own diameter through
 * the other: an M24 rod through a throwing arm is an M24 bolt through it).
 */
function bored(world: Standing, a: Part, b: Part): boolean {
  for (const c of world.connections()) {
    if (!c.b || !((c.a.part === a.id && c.b.part === b.id) || (c.a.part === b.id && c.b.part === a.id))) continue;
    if (BORED.has(c.kind)) return true;
    if (c.kind === 'bolted') {
      const d = boltD(c.params['size']);
      for (const p of [a, b]) if (p.kind === 'rod.round' && Math.abs(Number(p.params['diameter']) - d) <= 0.001) return true;
    }
  }
  return false;
}

/**
 * Whether a part may stand in this world, or why not. `tolerance` is the deepest overlap with any other part that is
 * still a contact (CONTACT_TOLERANCE): the physics' own. Overlap is judged with the joints known (a bore declared by
 * a joint is space two parts share by design), so a construction judges it when it closes: `overlaps: false` leaves
 * it to then.
 */
export function judgePart(world: Standing, part: Part, tolerance = CONTACT_TOLERANCE, opts: { overlaps?: boolean } = {}): Refusal | null {
  const no = (law: string, reason: string): Refusal => ({ law, what: 'part', id: part.id, name: part.name || part.kind, reason });
  const kind = partKind(part.kind);
  if (!kind) return no('K-1', `there is no template for a "${part.kind}": nothing says what it is`);
  const problems = paramProblems(kind.params, part.params);
  if (problems.length) return no('K-2', `its template takes only what it offers: ${problems.join('; ')}`);
  const m = world.material(part.material);
  if (!m) return no('K-3', `"${part.material}" is not a material this world has`);
  if (kind.materialFilter && !kind.materialFilter(m)) return no('K-3', `a ${kind.label.toLowerCase()} is not made of ${m.name}`);
  if (!finite(part.pose.p) || !finite(part.pose.q) || Math.abs(Math.hypot(...part.pose.q) - 1) > 1e-3) return no('K-4', 'its place is not a place: a position and a unit rotation');
  // two solids cannot share space: a part in pieces is where its pieces are (its physics), not where it was placed
  if (opts.overlaps !== false && !part.damage.segments) {
    for (const other of world.parts()) {
      if (other.id === part.id || other.damage.segments) continue;
      const mo = world.material(other.material);
      if (!mo) continue;
      const sep = partSeparation(part, m, other, mo);
      if (sep < -tolerance && !bored(world, part, other)) return no('K-5', `it would be where ${other.name} is, by ${(-sep * 1000).toFixed(1)} mm: two solids cannot share space`);
    }
  }
  return null;
}

/** Whether a connection may stand in this world, or why not. */
export function judgeConnection(world: Standing, conn: Connection): Refusal | null {
  const name = (k: ConnectorKind | null) => k?.label ?? conn.kind;
  const kind = connectorKind(conn.kind);
  const no = (law: string, reason: string): Refusal => ({ law, what: 'connection', id: conn.id, name: name(kind), reason });
  if (!kind) return no('K-1', `there is no template for a "${conn.kind}" joint: nothing says what it is`);
  const problems = paramProblems(kind.params, conn.params);
  if (problems.length) return no('K-2', `its template takes only what it offers: ${problems.join('; ')}`);
  let pa: Part | undefined, pb: Part | undefined;
  for (const p of world.parts()) {
    if (p.id === conn.a.part) pa = p;
    if (conn.b && p.id === conn.b.part) pb = p;
  }
  if (!pa) return no('K-6', 'its first end is on no part: a joint is owned by what it joins');
  if (conn.b && !pb) return no('K-6', 'its second end is on no part: a joint is owned by what it joins');
  if (!conn.b && kind.category === 'Powered') return no('K-6', `a ${kind.label.toLowerCase()} runs between two parts, never to the world`);
  if (!finite(conn.a.frame.p) || !finite(conn.a.frame.q) || (conn.b && (!finite(conn.b.frame.p) || !finite(conn.b.frame.q)))) return no('K-4', 'its ends are not places');
  const mA = world.material(pa.material), mB = pb ? world.material(pb.material) : null;
  if (!mA || (pb && !mB)) return no('K-3', 'a part it joins is of no material this world has');
  const kA = getPartKind(pa.kind), kB = pb ? getPartKind(pb.kind) : null;
  // a bought item takes only the joints its maker allows
  const bought = boughtRefusal(kA, kind.id, kind.label) ?? (kB ? boughtRefusal(kB, kind.id, kind.label) : null);
  if (bought) return no('K-7', bought);
  // a joint is where the parts are: each end on its part, and the two ends together
  const gap = unreachable(kind.model, kind.label, pa, mA, conn.a.frame, pb ?? null, mB ?? null, conn.b?.frame ?? null);
  if (gap) return no('K-8', gap);
  const wa = composePose(pa.pose, conn.a.frame), wb = pb && conn.b ? composePose(pb.pose, conn.b.frame) : wa;
  const apart = length(sub(wb.p, wa.p));
  if (pb && !spans(kind.model) && apart > REACH) return no('K-8', `its two ends are ${Math.round(apart * 1000)} mm apart: nothing physical joins them`);
  // what its parts make it: the connector's own judgment of the two parts, their sections and its place on them
  const derived = kind.derive({
    params: conn.params, matA: mA, matB: mB ?? null,
    thicknessA: kA.dims(effectiveParams(kA, pa.params, mA)).b,
    thicknessB: kB && pb && mB ? kB.dims(effectiveParams(kB, pb.params, mB)).b : kA.dims(effectiveParams(kA, pa.params, mA)).b,
    through: throughOf(pa, mA, conn.a.frame, pb ?? null, mB ?? null, conn.b?.frame ?? null),
    distance: apart, cure: 1e12,
    partA: { kind: pa.kind, params: pa.params }, partB: pb ? { kind: pb.kind, params: pb.params } : undefined,
    frameA: conn.a.frame, frameB: conn.b?.frame,
  });
  if (derived.instantFailure) return no('K-9', derived.instantFailure);
  // one shaft takes one horn; a servo listens on one lead; a load takes one supply
  for (const other of world.connections()) {
    if (other.id === conn.id) continue;
    if (kind.id === 'servo' && other.kind === 'servo' && other.a.part === conn.a.part) return no('K-10', `${pa.name} has one shaft, and a horn is on it already`);
    if (kind.id === 'signal' && other.kind === 'signal' && conn.b && other.b?.part === conn.b.part) return no('K-10', `${pb!.name} listens on one lead, and has one already`);
    if (kind.id === 'wire' && other.kind === 'wire' && conn.b) {
      const load = pa.kind === 'battery' ? pb! : pa;
      if (other.a.part === load.id || other.b?.part === load.id) return no('K-10', `${load.name} takes one supply, and has one already`);
    }
  }
  return null;
}

export function admitPart(world: Standing, part: Part, tolerance?: number, opts?: { overlaps?: boolean }): void {
  const r = judgePart(world, part, tolerance, opts);
  if (r) throw new ConstructionRefused(r);
}

export function admitConnection(world: Standing, conn: Connection): void {
  const r = judgeConnection(world, conn);
  if (r) throw new ConstructionRefused(r);
}

/** Every part, then every connection, of a whole document: the first refusal, or null. */
export function judgeDoc(doc: BuildDoc): Refusal | null {
  const world = standingOf(doc);
  for (const p of Object.values(doc.parts)) { const r = judgePart(world, p); if (r) return r; }
  for (const c of Object.values(doc.connections)) { const r = judgeConnection(world, c); if (r) return r; }
  return null;
}

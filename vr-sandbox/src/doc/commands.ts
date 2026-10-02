// High-level, undoable edits on the build document.

import { getMaterial } from '../data/materials';
import { STANDARD_GRAVITY } from '../data/materials';
import { getConnectorKind } from '../connectors/registry';
import { getPartKind } from '../parts/registry';
import { sanitizeParams, type Params, type ParamValue } from '../schema/params';
import { randomId, type IdSource } from './ids';
import { canonicalPose, clonePose, composePose, relativePose } from './math';
import type { DocStore, TxBuilder } from './store';
import { APP_VERSION, CATALOG_VERSION, type BuildDoc, type Connection, type Endpoint, type Part, type Pose, type SimSettings, type Vec3 } from './types';

export function defaultSim(): SimSettings {
  return {
    gravity: [0, -STANDARD_GRAVITY, 0],
    airDensity: 1.204,
    airDrag: true,
    fluids: [],
    cureClock: 0,
    magnetism: true,
  };
}

export function newDoc(name = 'Untitled build', created = new Date().toISOString()): BuildDoc {
  return {
    format: 'vrsb',
    version: 1,
    catalog: CATALOG_VERSION,
    meta: { name, created, app: APP_VERSION },
    assemblies: {},
    parts: {},
    connections: {},
    materials: {},
    sim: defaultSim(),
  };
}

export interface PartSpec {
  kind: string;
  pose: Pose;
  material?: string;
  params?: Params;
  frozen?: boolean;
  name?: string;
  assembly?: string | null;
}

/** Build a part record (pure). */
export function makePart(spec: PartSpec, ids: IdSource = randomId): Part {
  const kind = getPartKind(spec.kind);
  const material = spec.material ?? kind.defaultMaterial;
  return {
    id: ids('p'),
    kind: kind.id,
    name: spec.name ?? kind.label,
    material,
    params: sanitizeParams(kind.params, spec.params),
    pose: canonicalPose(spec.pose),
    frozen: spec.frozen ?? false,
    assembly: spec.assembly ?? null,
    features: [],
    damage: { broken: [], segments: null },
  };
}

function ensureMaterial(tx: TxBuilder, store: DocStore, id: string) {
  if (!store.doc.materials[id]) tx.create('materials', id, getMaterial(id));
}

export function addPart(store: DocStore, spec: PartSpec, ids: IdSource = randomId): Part {
  const part = makePart(spec, ids);
  store.transact(`Place ${part.name}`, (tx) => {
    ensureMaterial(tx, store, part.material);
    tx.create('parts', part.id, part);
  });
  return part;
}

export function setPartParam(store: DocStore, id: string, key: string, value: ParamValue) {
  const part = store.doc.parts[id];
  if (!part) return;
  const kind = getPartKind(part.kind);
  const params = sanitizeParams(kind.params, { ...part.params, [key]: value });
  // a re-dimensioned part is a new piece of stock: its old damage no longer applies
  const damaged = part.damage.broken.length > 0 || part.damage.segments !== null;
  store.transact(`Set ${key}`, (tx) => tx.update('parts', id, damaged ? { params, damage: { broken: [], segments: null } } : { params }), { mergeKey: `param:${id}:${key}` });
}

export function setPartMaterial(store: DocStore, ids: string[], material: string) {
  store.transact('Change material', (tx) => {
    ensureMaterial(tx, store, material);
    for (const id of ids) if (store.doc.parts[id]) tx.update('parts', id, { material });
  });
}

/** Moving a part moves its recorded segment poses (bent or broken pieces) rigidly with it. */
function movedFields(part: Part, pose: Pose): Partial<Part> {
  const next = canonicalPose(pose);
  if (!part.damage.segments) return { pose: next };
  const delta = composePose(next, relativePose(part.pose, { p: [0, 0, 0], q: [0, 0, 0, 1] }));
  return { pose: next, damage: { ...part.damage, segments: part.damage.segments.map((sp) => canonicalPose(composePose(delta, sp))) } };
}

export function setPartPose(store: DocStore, id: string, pose: Pose, mergeKey?: string) {
  const part = store.doc.parts[id];
  if (!part) return;
  store.transact('Move', (tx) => tx.update('parts', id, movedFields(part, pose)), { mergeKey });
}

export function setPartPoses(store: DocStore, poses: Map<string, Pose>, label = 'Move') {
  store.transact(label, (tx) => {
    for (const [id, pose] of poses) {
      const part = store.doc.parts[id];
      if (part) tx.update('parts', id, movedFields(part, pose));
    }
  });
}

/** Place a part exactly as it now is, pieces included (a hand-moved frozen part). Undoable. */
export function placePart(store: DocStore, id: string, pose: Pose, segments: Pose[] | null) {
  const part = store.doc.parts[id];
  if (!part) return;
  store.transact('Move', (tx) => tx.update('parts', id, segments
    ? { pose: canonicalPose(pose), damage: { ...part.damage, segments: segments.map(canonicalPose) } }
    : { pose: canonicalPose(pose) }));
}

export function setFrozen(store: DocStore, ids: string[], frozen: boolean) {
  store.transact(frozen ? 'Freeze' : 'Unfreeze', (tx) => {
    for (const id of ids) if (store.doc.parts[id]) tx.update('parts', id, { frozen });
  });
}

/** Connections touching any of the given parts. */
export function connectionsOf(doc: BuildDoc, partIds: Iterable<string>): Connection[] {
  const set = new Set(partIds);
  return Object.values(doc.connections).filter((c) => set.has(c.a.part) || (c.b !== null && set.has(c.b.part)));
}

export function deleteParts(store: DocStore, ids: string[]) {
  if (ids.length === 0) return;
  store.transact(ids.length === 1 ? 'Delete part' : `Delete ${ids.length} parts`, (tx) => {
    for (const c of connectionsOf(store.doc, ids)) tx.delete('connections', c.id);
    for (const id of ids) tx.delete('parts', id);
  });
}

/**
 * Duplicate parts plus every connection whose ends are all inside the selection, with fresh IDs.
 * Returns the old -> new ID map for parts.
 */
export function duplicateParts(store: DocStore, ids: string[], offset: Vec3, idSource: IdSource = randomId): Map<string, string> {
  const map = new Map<string, string>();
  const set = new Set(ids);
  store.transact(ids.length === 1 ? 'Duplicate part' : `Duplicate ${ids.length} parts`, (tx) => {
    for (const id of ids) {
      const src = store.doc.parts[id];
      if (!src) continue;
      const copy: Part = structuredClone(src);
      copy.id = idSource('p');
      copy.pose = canonicalPose({ p: [src.pose.p[0] + offset[0], src.pose.p[1] + offset[1], src.pose.p[2] + offset[2]], q: src.pose.q });
      copy.features = copy.features.map((f) => ({ ...f, id: idSource('f') }));
      if (copy.damage.segments) {
        copy.damage.segments = copy.damage.segments.map((sp) => canonicalPose({ p: [sp.p[0] + offset[0], sp.p[1] + offset[1], sp.p[2] + offset[2]], q: sp.q }));
      }
      map.set(id, copy.id);
      tx.create('parts', copy.id, copy);
    }
    for (const c of connectionsOf(store.doc, ids)) {
      const inside = set.has(c.a.part) && (c.b === null || set.has(c.b.part));
      if (!inside || c.state.status === 'broken') continue;
      const copy: Connection = structuredClone(c);
      copy.id = idSource('c');
      copy.a.part = map.get(c.a.part)!;
      if (copy.b) copy.b.part = map.get(c.b!.part)!;
      tx.create('connections', copy.id, copy);
    }
  });
  return map;
}

/** Parts and the joints among them, posed relative to a base: a template, ready to be placed anywhere. */
export interface Fragment {
  parts: Part[];
  connections: Connection[];
}

/** The parts `ids` (at their `poses`) and every intact joint among them, relative to `base`. */
export function fragmentOf(doc: BuildDoc, ids: string[], poses: (id: string) => Pose, base: Pose): Fragment {
  const set = new Set(ids);
  const parts = ids.filter((id) => doc.parts[id]).map((id) => {
    const p: Part = structuredClone(doc.parts[id]!);
    const now = poses(id);
    p.pose = canonicalPose(relativePose(base, now));
    // damaged stock keeps its pieces where they are, relative to the part
    if (p.damage.segments) p.damage.segments = p.damage.segments.map((sp) => canonicalPose(relativePose(base, composePose(now, relativePose(doc.parts[id]!.pose, sp)))));
    return p;
  });
  const connections = connectionsOf(doc, ids).filter((c) => set.has(c.a.part) && (c.b === null || set.has(c.b.part)) && c.state.status !== 'broken').map((c) => structuredClone(c));
  return { parts, connections };
}

/** Place a fragment at `at`: fresh ids, its parts' materials added to the build, one undoable step. */
export function insertFragment(store: DocStore, frag: Fragment, at: Pose, label: string, idSource: IdSource = randomId): Map<string, string> {
  const map = new Map<string, string>();
  store.transact(label, (tx) => {
    for (const src of frag.parts) {
      const copy: Part = structuredClone(src);
      copy.id = idSource('p');
      copy.pose = canonicalPose(composePose(at, src.pose));
      copy.features = copy.features.map((f) => ({ ...f, id: idSource('f') }));
      if (copy.damage.segments) copy.damage.segments = copy.damage.segments.map((sp) => canonicalPose(composePose(at, sp)));
      map.set(src.id, copy.id);
      ensureMaterial(tx, store, copy.material);
      tx.create('parts', copy.id, copy);
    }
    for (const c of frag.connections) {
      if (!map.has(c.a.part) || (c.b && !map.has(c.b.part))) continue;
      const copy: Connection = structuredClone(c);
      copy.id = idSource('c');
      copy.a.part = map.get(c.a.part)!;
      if (copy.b) copy.b.part = map.get(c.b!.part)!;
      copy.state = { ...copy.state, status: 'intact', note: '' };
      tx.create('connections', copy.id, copy);
    }
  });
  return map;
}

export interface ConnectionSpec {
  kind: string;
  a: Endpoint;
  b: Endpoint | null;
  params?: Params;
}

export function makeConnection(spec: ConnectionSpec, ids: IdSource = randomId): Connection {
  const kind = getConnectorKind(spec.kind);
  return {
    id: ids('c'),
    kind: kind.id,
    a: { part: spec.a.part, frame: canonicalPose(spec.a.frame) },
    b: spec.b ? { part: spec.b.part, frame: canonicalPose(spec.b.frame) } : null,
    params: sanitizeParams(kind.params, spec.params),
    state: { status: 'intact', cure: 0, note: '' },
  };
}

export function addConnection(store: DocStore, spec: ConnectionSpec, ids: IdSource = randomId): Connection {
  const conn = makeConnection(spec, ids);
  store.transact(`Connect: ${getConnectorKind(conn.kind).label}`, (tx) => tx.create('connections', conn.id, conn));
  return conn;
}

export function setConnectionParam(store: DocStore, id: string, key: string, value: ParamValue) {
  const c = store.doc.connections[id];
  if (!c) return;
  const kind = getConnectorKind(c.kind);
  const params = sanitizeParams(kind.params, { ...c.params, [key]: value });
  store.transact(`Set ${key}`, (tx) => tx.update('connections', id, { params }), { mergeKey: `cparam:${id}:${key}` });
}

/** Mark a connection's new physical state (from the simulation). Undoable, so a test can be rolled back. */
export function setConnectionState(store: DocStore, id: string, state: Partial<Connection['state']>, label: string) {
  const c = store.doc.connections[id];
  if (!c) return;
  store.transact(label, (tx) => tx.update('connections', id, { state: { ...c.state, ...state } }));
}

export function setSim(store: DocStore, patch: Partial<SimSettings>, mergeKey?: string) {
  store.transact('World settings', (tx) => tx.sim(patch), { mergeKey });
}

/** Write live physics poses back into the design (not an undo step). Damaged parts also record each segment. */
export function commitPoses(store: DocStore, poses: Map<string, Pose>, segments = new Map<string, Pose[]>()) {
  store.transact('Commit poses', (tx) => {
    for (const [id, pose] of poses) {
      const part = store.doc.parts[id];
      if (!part || part.frozen) continue;
      tx.update('parts', id, { pose: canonicalPose(pose) });
    }
    for (const [id, segs] of segments) {
      const part = store.doc.parts[id];
      if (!part || part.frozen) continue;
      tx.update('parts', id, { damage: { ...part.damage, segments: segs.map(canonicalPose) } });
    }
  }, { undoable: false });
}

/** Record a fracture of bond `bond` (undoable, so a crash test can be taken back). */
export function recordFracture(store: DocStore, id: string, bond: number, segments: Pose[] | null, label: string) {
  const part = store.doc.parts[id];
  if (!part || part.damage.broken.includes(bond)) return;
  const broken = [...part.damage.broken, bond].sort((a, b) => a - b);
  store.transact(label, (tx) => tx.update('parts', id, { damage: { broken, segments: segments ? segments.map(canonicalPose) : part.damage.segments } }));
}

export function repairPart(store: DocStore, id: string) {
  const part = store.doc.parts[id];
  if (!part) return;
  store.transact('Repair part', (tx) => tx.update('parts', id, { damage: { broken: [], segments: null } }));
}

/** Parts reachable from `start` through intact connections. */
export function connectedComponent(doc: BuildDoc, start: string): Set<string> {
  const adj = new Map<string, string[]>();
  for (const c of Object.values(doc.connections)) {
    if (c.state.status === 'broken' || !c.b) continue;
    (adj.get(c.a.part) ?? adj.set(c.a.part, []).get(c.a.part)!).push(c.b.part);
    (adj.get(c.b.part) ?? adj.set(c.b.part, []).get(c.b.part)!).push(c.a.part);
  }
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of adj.get(cur) ?? []) if (!seen.has(n)) { seen.add(n); stack.push(n); }
  }
  return seen;
}

export { clonePose };

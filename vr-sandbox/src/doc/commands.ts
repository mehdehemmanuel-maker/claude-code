// High-level, undoable edits on the build document.

import { getMaterial } from '../data/materials';
import { STANDARD_GRAVITY } from '../data/materials';
import { getConnectorKind } from '../connectors/registry';
import { getPartKind } from '../parts/registry';
import { sanitizeParams, type Params, type ParamValue } from '../schema/params';
import { randomId, type IdSource } from './ids';
import { canonicalPose, clonePose } from './math';
import type { DocStore, TxBuilder } from './store';
import {
  APP_VERSION, CATALOG_VERSION, type BuildDoc, type Connection, type Endpoint, type FluidVolume, type Part, type Pose,
  type SimSettings, type Vec3,
} from './types';

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
  store.transact(`Set ${key}`, (tx) => tx.update('parts', id, { params }), { mergeKey: `param:${id}:${key}` });
}

export function setPartMaterial(store: DocStore, ids: string[], material: string) {
  store.transact('Change material', (tx) => {
    ensureMaterial(tx, store, material);
    for (const id of ids) if (store.doc.parts[id]) tx.update('parts', id, { material });
  });
}

export function setPartPose(store: DocStore, id: string, pose: Pose, mergeKey?: string) {
  if (!store.doc.parts[id]) return;
  store.transact('Move', (tx) => tx.update('parts', id, { pose: canonicalPose(pose) }), { mergeKey });
}

export function setPartPoses(store: DocStore, poses: Map<string, Pose>, label = 'Move') {
  store.transact(label, (tx) => {
    for (const [id, pose] of poses) if (store.doc.parts[id]) tx.update('parts', id, { pose: canonicalPose(pose) });
  });
}

export function setFrozen(store: DocStore, ids: string[], frozen: boolean) {
  store.transact(frozen ? 'Freeze' : 'Unfreeze', (tx) => {
    for (const id of ids) if (store.doc.parts[id]) tx.update('parts', id, { frozen });
  });
}

export function renamePart(store: DocStore, id: string, name: string) {
  store.transact('Rename', (tx) => tx.update('parts', id, { name }), { mergeKey: `name:${id}` });
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

export function deleteConnection(store: DocStore, id: string) {
  store.transact('Disconnect', (tx) => tx.delete('connections', id));
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

export function addFluid(store: DocStore, fluid: FluidVolume) {
  setSim(store, { fluids: [...store.doc.sim.fluids.filter((f) => f.id !== fluid.id), fluid] });
}

/** Write live physics poses back into the design (not an undo step). */
export function commitPoses(store: DocStore, poses: Map<string, Pose>) {
  store.transact('Commit poses', (tx) => {
    for (const [id, pose] of poses) {
      const part = store.doc.parts[id];
      if (!part || part.frozen) continue;
      const c = canonicalPose(pose);
      tx.update('parts', id, { pose: c });
    }
  }, { undoable: false });
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

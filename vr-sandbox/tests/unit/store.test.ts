import { describe, expect, it } from 'vitest';
import { DocStore } from '../../src/doc/store';
import {
  addConnection, addPart, commitPoses, connectedComponent, deleteParts, duplicateParts, newDoc, recordFracture, repairPart,
  setPartParam, setPartPose,
} from '../../src/doc/commands';
import { seededIds } from '../../src/doc/ids';
import { encodeDoc } from '../../src/persistence/codec';

const origin = { p: [0, 0, 0] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] };

function setup() {
  const store = new DocStore(newDoc('t', '2026-01-01T00:00:00Z'));
  const ids = seededIds(1);
  // a 100 mm block with a 6 mm plate bolted on its top face: the bolt stands on the face the two parts share
  const a = addPart(store, { kind: 'block', pose: origin, params: { x: 0.1, y: 0.1, z: 0.1 } }, ids);
  const b = addPart(store, { kind: 'plate', pose: { p: [0, 0.053, 0], q: [0, 0, 0, 1] }, params: { length: 0.1, width: 0.1, thickness: 0.006 } }, ids);
  const c = addConnection(store, { kind: 'bolted', a: { part: a.id, frame: { p: [0, 0.05, 0], q: [0, 0, 0, 1] } }, b: { part: b.id, frame: { p: [0, -0.003, 0], q: [1, 0, 0, 0] } }, params: { size: 'M6', count: 2, bondW: 0.08, bondL: 0.08 } }, ids);
  return { store, ids, a, b, c };
}

describe('document store', () => {
  it('embeds a material snapshot when a part is placed', () => {
    const { store, a } = setup();
    expect(store.doc.materials[a.material]?.density).toBeGreaterThan(0);
  });

  it('undo and redo restore exact bytes', () => {
    const { store, a } = setup();
    const before = encodeDoc(store.doc);
    setPartParam(store, a.id, 'x', 0.5);
    expect(store.doc.parts[a.id]!.params['x']).toBe(0.5);
    store.undo();
    expect(Buffer.from(encodeDoc(store.doc)).equals(Buffer.from(before))).toBe(true);
    store.redo();
    expect(store.doc.parts[a.id]!.params['x']).toBe(0.5);
  });

  it('slider drags merge into one undo step', () => {
    const { store, a } = setup();
    for (const v of [0.2, 0.3, 0.4, 0.45]) setPartParam(store, a.id, 'x', v);
    store.undo();
    expect(store.doc.parts[a.id]!.params['x']).toBe(0.1);
  });

  it('parameters are clamped to their schema', () => {
    const { store, a } = setup();
    setPartParam(store, a.id, 'x', 1e9);
    expect(store.doc.parts[a.id]!.params['x']).toBe(20);
  });

  it('deleting a part removes its connections, undo brings both back', () => {
    const { store, a, c } = setup();
    deleteParts(store, [a.id]);
    expect(store.doc.connections[c.id]).toBeUndefined();
    store.undo();
    expect(store.doc.connections[c.id]).toBeDefined();
    expect(store.doc.parts[a.id]).toBeDefined();
  });

  it('duplicating a sub-assembly remaps internal connections', () => {
    const { store, a, b } = setup();
    const map = duplicateParts(store, [a.id, b.id], [1, 0, 0], seededIds(7));
    const copies = Object.values(store.doc.connections).filter((x) => x.a.part === map.get(a.id));
    expect(copies).toHaveLength(1);
    expect(copies[0]!.b!.part).toBe(map.get(b.id));
    expect(store.doc.parts[map.get(a.id)!]!.pose.p[0]).toBe(1);
  });

  it('silent pose commits are not reverted by undoing an unrelated edit', () => {
    const { store, a } = setup();
    setPartParam(store, a.id, 'x', 0.3); // longer, not taller: a block grown up into the plate on it is refused
    commitPoses(store, new Map([[a.id, { p: [5, 0, 0], q: [0, 0, 0, 1] }]]));
    store.undo();
    expect(store.doc.parts[a.id]!.params['x']).toBe(0.1);
    expect(store.doc.parts[a.id]!.pose.p[0]).toBe(5);
  });

  it('connected components follow intact connections', () => {
    const { store, a, b } = setup();
    expect([...connectedComponent(store.doc, a.id)].sort()).toEqual([a.id, b.id].sort());
  });

  it('a failed transaction rolls back completely', () => {
    const { store, a } = setup();
    const before = encodeDoc(store.doc);
    expect(() => store.transact('bad', (tx) => {
      tx.update('parts', a.id, { frozen: true });
      tx.create('parts', a.id, {});
    })).toThrow();
    expect(Buffer.from(encodeDoc(store.doc)).equals(Buffer.from(before))).toBe(true);
  });

  it('fractures are undoable, repair clears them, and moving a damaged part moves its pieces', () => {
    const store = new DocStore(newDoc('t', '2026-01-01T00:00:00Z'));
    const ids = seededIds(7);
    const rod = addPart(store, { kind: 'rod.square', pose: origin, params: { length: 1, side: 0.02, fracture: '4' } }, ids);
    const pieces = [0, 1, 2, 3].map((k) => ({ p: [-0.375 + 0.25 * k, 0, 0] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] }));
    const before = encodeDoc(store.doc);
    recordFracture(store, rod.id, 2, pieces, 'Fractured');
    recordFracture(store, rod.id, 0, null, 'Fractured');
    expect(store.doc.parts[rod.id]!.damage.broken).toEqual([0, 2]);
    // a whole move carries every recorded piece along
    setPartPose(store, rod.id, { p: [1, 2, 3], q: [0, 0, 0, 1] });
    expect(store.doc.parts[rod.id]!.damage.segments![3]!.p).toEqual([1.375, 2, 3]);
    store.undo(); store.undo(); store.undo();
    expect(Buffer.from(encodeDoc(store.doc)).equals(Buffer.from(before))).toBe(true);
    store.redo(); store.redo();
    repairPart(store, rod.id);
    expect(store.doc.parts[rod.id]!.damage).toEqual({ broken: [], segments: null });
    // re-dimensioning stock is new stock: damage is cleared with it
    recordFracture(store, rod.id, 1, null, 'Fractured');
    setPartParam(store, rod.id, 'length', 1.5);
    expect(store.doc.parts[rod.id]!.damage.broken).toEqual([]);
  });
});

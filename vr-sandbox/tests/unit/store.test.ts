import { describe, expect, it } from 'vitest';
import { DocStore } from '../../src/doc/store';
import {
  addConnection, addPart, commitPoses, connectedComponent, deleteParts, duplicateParts, newDoc, setPartParam,
} from '../../src/doc/commands';
import { seededIds } from '../../src/doc/ids';
import { encodeDoc } from '../../src/persistence/codec';

const origin = { p: [0, 0, 0] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] };

function setup() {
  const store = new DocStore(newDoc('t', '2026-01-01T00:00:00Z'));
  const ids = seededIds(1);
  const a = addPart(store, { kind: 'block', pose: origin }, ids);
  const b = addPart(store, { kind: 'plate', pose: { p: [0, 0.2, 0], q: [0, 0, 0, 1] } }, ids);
  const c = addConnection(store, { kind: 'bolted', a: { part: a.id, frame: origin }, b: { part: b.id, frame: origin } }, ids);
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
    setPartParam(store, a.id, 'y', 0.3);
    commitPoses(store, new Map([[a.id, { p: [5, 0, 0], q: [0, 0, 0, 1] }]]));
    store.undo();
    expect(store.doc.parts[a.id]!.params['y']).toBe(0.1);
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
});

import { describe, expect, it } from 'vitest';
import { interpret } from '../../src/assistant/intent';
import { DocStore } from '../../src/doc/store';
import { addConnection, addPart, fragmentOf, insertFragment, newDoc } from '../../src/doc/commands';
import { seededIds } from '../../src/doc/ids';
import { composePose } from '../../src/doc/math';

describe('plain requests to Ego', () => {
  it('reads what you ask into what to do', () => {
    expect(interpret('make it stronger')).toEqual({ do: 'strengthen' });
    expect(interpret('Ego, weld these together please')).toEqual({ do: 'join', joint: 'weld', floor: false });
    expect(interpret('bolt it to the floor')).toEqual({ do: 'join', joint: 'bolted', floor: true });
    expect(interpret('place 4 steel blocks')).toEqual({ do: 'place', count: 4, kind: 'block', material: 'steel' });
    expect(interpret('give me an oak board')).toEqual({ do: 'place', count: 1, kind: 'board', material: 'oak' });
    expect(interpret('add three pipes')).toEqual({ do: 'place', count: 3, kind: 'pipe', material: undefined });
    expect(interpret('save this as a template')).toEqual({ do: 'template' });
    expect(interpret('duplicate it 3 times')).toEqual({ do: 'duplicate', count: 3 });
    expect(interpret('freeze it')).toEqual({ do: 'freeze' });
    expect(interpret('why did it break?')).toEqual({ do: 'why' });
    expect(interpret("what's wrong")).toEqual({ do: 'status' });
    expect(interpret('moon gravity')).toEqual({ do: 'command', command: 'gravity moon' });
    expect(interpret('play')).toEqual({ do: 'command', command: 'play' });
    expect(interpret('Ego, look at this')).toEqual({ do: 'show' });
    expect(interpret('see this?')).toEqual({ do: 'show' });
  });

  it('leaves Forge to Forge', () => {
    expect(interpret('place lumber length=1.2m at 0 1 0 as rail')).not.toBeNull(); // a place request, but…
    expect(interpret('repeat 4 { place block }')).toBeNull();
    expect(interpret('join rail post with bolted')).toBeNull();
  });
});

describe('templates', () => {
  it('an assembly saved relative to its base places anywhere as a fresh copy, joints and all', () => {
    const store = new DocStore(newDoc('t', '2026-01-01T00:00:00Z'));
    const ids = seededIds(7);
    const a = addPart(store, { kind: 'block', pose: { p: [1, 0.05, 2], q: [0, 0, 0, 1] } }, ids);
    const b = addPart(store, { kind: 'block', pose: { p: [1, 0.15, 2], q: [0, 0, 0, 1] } }, ids);
    addConnection(store, { kind: 'bolted', a: { part: a.id, frame: { p: [0, 0.05, 0], q: [0, 0, 0, 1] } }, b: { part: b.id, frame: { p: [0, -0.05, 0], q: [0, 0, 0, 1] } } }, ids);
    const base = { p: [1, 0, 2] as [number, number, number], q: [0, 0, 0, 1] as [number, number, number, number] };
    const frag = fragmentOf(store.doc, [a.id, b.id], (id) => store.doc.parts[id]!.pose, base);
    expect(frag.parts.map((p) => p.pose.p[1])).toEqual([0.05, 0.15]);
    expect(frag.connections.length).toBe(1);
    const at = { p: [-3, 0, 0] as [number, number, number], q: [0, Math.SQRT1_2, 0, Math.SQRT1_2] as [number, number, number, number] };
    const map = insertFragment(store, frag, at, 'Place template', ids);
    expect(Object.keys(store.doc.parts).length).toBe(4);
    expect(Object.keys(store.doc.connections).length).toBe(2);
    const copyA = store.doc.parts[map.get(a.id)!]!;
    expect(copyA.pose.p).toEqual(composePose(at, frag.parts[0]!.pose).p.map((x) => +x.toFixed(9)) as never);
    const c2 = Object.values(store.doc.connections).find((c) => c.a.part === copyA.id)!;
    expect(c2.b!.part).toBe(map.get(b.id));
    // one undo takes the whole copy away
    store.undo();
    expect(Object.keys(store.doc.parts).length).toBe(2);
  });
});

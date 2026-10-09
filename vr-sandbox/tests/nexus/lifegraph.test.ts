import { describe, expect, it } from 'vitest';
import { BRAIN_MAP, LifeGraph, MESSENGER_IDS } from '../../src/nexus/life/graph';
import { LIFE, MOLECULES } from '../../src/nexus/life';

describe('the life graph', () => {
  const g = new LifeGraph();
  it('has the eleven messengers the user named, each made somewhere, each with what it is made from', () => {
    for (const id of MESSENGER_IDS) { const n = g.of(id)!; expect(n.node.kind).toBe('messenger'); expect(n.node.from).toBeTruthy(); expect(n.linked.some((l) => l.how === 'made in')).toBe(true); }
    expect(g.of('melatonin')!.linked.find((l) => l.how === 'made in')!.node.id).toBe('pineal');
    expect(g.of('noradrenaline')!.linked.find((l) => l.how === 'made in')!.node.id).toBe('locus-coeruleus');
  });
  it('every link\'s two ends are nodes, and every library entry it names is in the library', () => {
    const ids = new Set([...LIFE.map((e) => e.id), ...MOLECULES.map((m) => m.id)]);
    for (const l of g.links) { expect(g.nodes.has(l.a)).toBe(true); expect(g.nodes.has(l.b)).toBe(true); }
    for (const n of g.nodes.values()) if (n.entry) expect(ids.has(n.entry), n.entry).toBe(true);
  });
  it('places every region on the map inside it, no two on one spot', () => {
    const m = BRAIN_MAP(); expect(m.length).toBeGreaterThan(25);
    for (const r of m) { expect(r.at![0]).toBeGreaterThanOrEqual(0); expect(r.at![0]).toBeLessThanOrEqual(1); expect(r.at![1]).toBeGreaterThanOrEqual(0); expect(r.at![1]).toBeLessThanOrEqual(1); }
    for (let i = 0; i < m.length; i++) for (let j = i + 1; j < m.length; j++) expect(Math.hypot(m[i]!.at![0] - m[j]!.at![0], m[i]!.at![1] - m[j]!.at![1]), `${m[i]!.id} and ${m[j]!.id}`).toBeGreaterThan(0.03);
  });
  it('a link the user makes is seen from either node, and kept', () => {
    const h = new LifeGraph(), me = h.add('person', 'Maya'), walk = h.add('memory', 'the walk by the river'), park = h.add('place', 'Riverside park');
    h.link(walk.id, me.id, 'with'); h.link(walk.id, park.id, 'at'); h.link(walk.id, 'oxytocin', 'felt');
    expect(h.of(me.id)!.linked.map((l) => l.node.id)).toEqual([walk.id]);
    expect(h.of('oxytocin')!.linked.some((l) => l.node.id === walk.id && l.mine)).toBe(true);
    const back = new LifeGraph(JSON.parse(JSON.stringify(h.saved())));
    expect(back.of(walk.id)!.linked.map((l) => l.node.name).sort()).toEqual(['Maya', 'Riverside park', 'oxytocin']);
    expect(back.unlink(walk.id, 'oxytocin')).toBe(true); expect(back.of('oxytocin')!.linked.some((l) => l.node.id === walk.id)).toBe(false);
    expect(back.unlink('melatonin', 'pineal')).toBe(false);
    expect(back.remove(me.id)).toBe(true); expect(back.of(walk.id)!.linked.some((l) => l.node.name === 'Maya')).toBe(false);
    expect(h.add('person', 'Maya').id).toBe('person:maya-2');
  });
});

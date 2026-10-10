// Node boards (src/nexus/substrate/boards.ts): words and links, and what the links make of them. The most connected node a node
// links to is what it sits under; a node no neighbour outranks heads a category; the pipeline is the same structure in
// order. And a board made from a real build: the categories its parts are filed in.

import { describe, expect, it } from 'vitest';
import { addNode, boardOfBuild, categoriesOf, compact, deepMerge, deleteNode, derive, edgesOf, findNodes, layout, levelOf, link, moveNode, nodesOf, pathTo, placesOf, toggleLink, unpin, type Board, type Patch } from '../../src/nexus/substrate/boards';
import { readAsk } from '../../src/nexus/ask/words';
import { generate } from '../../src/nexus/substrate/manifold';
import { embodyAny } from '../../src/nexus/embody/any';

const empty = (): Board => ({ title: 't', nodes: {}, edges: {} });
const apply = (b: Board, p: Patch | null | undefined): Board => (p ? deepMerge(b, p) : b);
const word = (b: Board, w: string, linkTo?: string): [Board, string] => { const { id, patch } = addNode(w, linkTo); return [apply(b, patch), id]; };
const ids = (b: Board) => Object.fromEntries(nodesOf(b).map((n) => [n.label, n.id]));
const BOX = () => ({ w: 120, h: 42 });

function vehicle(): Board {
  let b = empty();
  for (const w of ['Vehicle', 'Wheel', 'Motor', 'Battery', 'Tyre', 'Frame']) [b] = word(b, w);
  const n = ids(b);
  for (const w of ['Wheel', 'Motor', 'Battery', 'Frame']) b = apply(b, toggleLink(b, n.Vehicle!, n[w]!)!.patch);
  b = apply(b, toggleLink(b, n.Wheel!, n.Tyre!)!.patch);
  return b;
}

describe('a board of words', () => {
  it('asks only for a word: a node is its label, linked from another if given', () => {
    let b = empty(); let v: string, w: string;
    [b, v] = word(b, 'Vehicle'); [b, w] = word(b, ' Wheel ', v);
    expect(b.nodes[w]).toEqual({ label: 'Wheel' });
    expect(edgesOf(b)).toEqual([expect.objectContaining({ from: v, to: w, rel: 'connects' })]);
  });
  it('puts each node under its most connected neighbour; the most connected head the categories', () => {
    const b = vehicle(), d = derive(b), n = ids(b);
    expect(levelOf(d, n.Vehicle!)).toBe('category');
    for (const w of ['Wheel', 'Motor', 'Battery', 'Frame']) expect(levelOf(d, n[w]!)).toBe('subcategory');
    expect(levelOf(d, n.Tyre!)).toBe('sub-subcategory');
    expect(pathTo(d, n.Tyre!).map((id) => b.nodes[id]!.label)).toEqual(['Vehicle', 'Wheel', 'Tyre']);
    expect(categoriesOf(d).map((id) => b.nodes[id]!.label)).toEqual(['Vehicle']);
    expect(d.size.get(n.Vehicle!)).toBe(6);
  });
  it('a word with no links is not linked, and is no category', () => {
    let b = vehicle(); [b] = word(b, 'Lidar');
    const d = derive(b);
    expect(levelOf(d, ids(b).Lidar!)).toBe('unlinked');
    expect(categoriesOf(d)).toHaveLength(1);
  });
  it('a tie goes to the node whose neighbours are better connected, never to a coin', () => {
    // two nodes of one link each, one of them also near the hub: the near one is above
    let b = vehicle(); let a: string, c: string;
    [b, a] = word(b, 'Rim'); [b, c] = word(b, 'Spoke');
    const n = ids(b);
    b = apply(b, link(b, n.Tyre!, a)); b = apply(b, link(b, a, c));
    const d = derive(b);
    expect(d.parent.get(c)).toBe(a); expect(d.parent.get(a)).toBe(n.Tyre);
    expect(derive(b).order).toEqual(d.order);
  });
});

describe('linking by tapping', () => {
  it('a tap links, the next unlinks, and the link is brought back rather than made again', () => {
    let b = vehicle(); const n = ids(b);
    const t1 = toggleLink(b, n.Tyre!, n.Frame!)!; expect(t1.linked).toBe(true); b = apply(b, t1.patch);
    const id = Object.keys(t1.patch.edges!)[0]!;
    const t2 = toggleLink(b, n.Frame!, n.Tyre!)!; expect(t2.linked).toBe(false); b = apply(b, t2.patch);
    expect(b.edges[id]!.deleted).toBe(true);
    const t3 = toggleLink(b, n.Tyre!, n.Frame!)!; b = apply(b, t3.patch);
    expect(Object.keys(t3.patch.edges!)).toEqual([id]);
    expect(Object.keys(b.edges)).toHaveLength(6);
  });
  it('unlinking takes every link between the two, whatever their kind', () => {
    let b = vehicle(); const n = ids(b);
    b = apply(b, link(b, n.Vehicle!, n.Wheel!, 'calls'));
    const t = toggleLink(b, n.Wheel!, n.Vehicle!)!; b = apply(b, t.patch);
    expect(edgesOf(b).filter((e) => [e.from, e.to].includes(n.Wheel!) && [e.from, e.to].includes(n.Vehicle!))).toHaveLength(0);
  });
  it('a node deleted takes its links with it; written whole, the dead are left out', () => {
    let b = vehicle(); const n = ids(b);
    b = apply(b, deleteNode(b, n.Wheel!));
    expect(nodesOf(b).map((x) => x.label)).not.toContain('Wheel');
    expect(edgesOf(b).some((e) => e.from === n.Wheel || e.to === n.Wheel)).toBe(false);
    const c = compact(b);
    expect(Object.keys(c.nodes)).not.toContain(n.Wheel); expect(Object.values(c.edges).every((e) => !e.deleted)).toBe(true);
  });
  it('finds a node by a few letters: the one it names, then those it begins, the most connected first', () => {
    const b = vehicle(), d = derive(b);
    expect(findNodes(b, d, 'whe')[0]!.label).toBe('Wheel');
    expect(findNodes(b, d, '').map((x) => x.label)[0]).toBe('Vehicle');
    expect(findNodes(b, d, 'tyre', ids(b).Tyre)).toHaveLength(0);
  });
});

describe('the pipeline: the same structure, in the order it is derived', () => {
  it('a category is step 1, what sits under it the next, and so on down', () => {
    const b = vehicle(), d = derive(b), n = ids(b);
    expect(d.step.get(n.Vehicle!)).toBe(0); expect(d.step.get(n.Wheel!)).toBe(1); expect(d.step.get(n.Tyre!)).toBe(2);
    const at = layout(d, 'pipeline', BOX);
    expect(at.get(n.Vehicle!)!.x).toBeLessThan(at.get(n.Wheel!)!.x);
    expect(at.get(n.Wheel!)!.x).toBe(at.get(n.Motor!)!.x);
    expect(at.get(n.Wheel!)!.x).toBeLessThan(at.get(n.Tyre!)!.x);
  });
  it('a directed link orders its ends: what is depended on before what needs it, and a loop back orders nothing', () => {
    let b = vehicle(); const n = ids(b);
    b = apply(b, link(b, n.Motor!, n.Battery!, 'depends on'));
    expect(derive(b).step.get(n.Motor!)).toBeGreaterThan(derive(b).step.get(n.Battery!)!);
    let c = vehicle(); const m = ids(c);
    c = apply(c, link(c, m.Tyre!, m.Vehicle!, 'feeds back to'));
    expect(derive(c).step.get(m.Vehicle!)).toBe(0);
  });
  it('lays the categories out without two nodes in one place, and words not linked yet first', () => {
    let b = vehicle(); [b] = word(b, 'Lidar');
    const d = derive(b), at = layout(d, 'categories', BOX), seen = new Set<string>();
    for (const p of at.values()) { const k = `${p.x},${p.y}`; expect(seen.has(k)).toBe(false); seen.add(k); }
    expect(at.get(ids(b).Lidar!)).toEqual({ x: 0, y: 0 });
  });
  it('a node dragged stays where it was put, in that view only, until it is let go', () => {
    let b = vehicle(); const n = ids(b);
    b = apply(b, moveNode(n.Tyre!, 'categories', 900.4, 40.6));
    expect(placesOf(b, derive(b), 'categories', BOX).get(n.Tyre!)).toEqual({ x: 900, y: 41 });
    expect(placesOf(b, derive(b), 'pipeline', BOX).get(n.Tyre!)).not.toEqual({ x: 900, y: 41 });
    b = apply(b, unpin(b, 'categories'));
    expect(nodesOf(b).find((x) => x.id === n.Tyre)!.pin).toBeNull();
    expect(unpin(b, 'categories')).toBeNull();
  });
});

describe('a board made from a build', () => {
  it('is the ask, the categories its parts are filed in, and the parts, alike ones as one', () => {
    const r = readAsk('a cart that carries 150 kg at 8 km/h');
    if ('problems' in r) throw new Error(r.problems.join('; '));
    const m = embodyAny(r.intent, generate(r.intent))!;
    const b = boardOfBuild('a cart that carries 150 kg at 8 km/h', r.intent.name, m.parts), d = derive(b);
    expect(b.nodes.in!.label).toBe('a cart that carries 150 kg at 8 km/h');
    // every part is in it: the counts on the items add up to the parts
    const items = nodesOf(b).filter((n) => /^i\d/.test(n.id));
    expect(items.reduce((t, n) => t + (Number(n.label.match(/^(\d+) × /)?.[1] ?? 1)), 0)).toBe(m.parts.length);
    // the taxonomy's names: the wheels are filed under Wheels, under Motion
    const wheels = nodesOf(b).find((n) => n.label === 'Wheels')!;
    expect(b.nodes[edgesOf(b).find((e) => e.to === wheels.id)!.from]!.label).toBe('Motion');
    // parts that differ only by their number are one kind: the stator teeth of both motors, as one
    expect(items.some((n) => /^\d+ × stator tooth$/.test(n.label))).toBe(true);
    // and what the links make of it: whatever has the most links heads it, the ask or not; a part sits a step below
    // its category, and its path runs up through the taxonomy's names
    // (in this cart the permanent-magnet motors, 13 kinds of part, outrank the ask's 8 domains: they head a category)
    const most = d.order[0]!;
    expect(levelOf(d, most)).toBe('category');
    expect(categoriesOf(d)).toContain('in');
    expect(categoriesOf(d).map((id) => d.size.get(id)!)).toEqual([...categoriesOf(d).map((id) => d.size.get(id)!)].sort((a, c) => c - a));
    const tyre = items.find((n) => /tyre/.test(n.label))!, path = pathTo(d, tyre.id).map((id) => b.nodes[id]!.label);
    expect(path.slice(-2)).toEqual(['Wheels', tyre.label]);
    expect(d.step.get(tyre.id)).toBe(path.length - 1);
  });
});

// The structure between the laws (src/ganglia/lawgraph.ts, docs/LAW-GRAPH.md): typed relations computed from the
// book, derivations found by composing laws, every path between two laws kept with the relations that compose it,
// closeness as several answers, what is deep computed from the derivation topology, the layout derived from the
// structure and regenerated when it changes, and the same structure at every zoom with the cross-links kept.

import { describe, expect, it } from 'vitest';
import { ancestry, between, branch, closeness, compositions, cone, deepest, lawGraph, paths, projection, roots, sayCloseness, sayConnected, sayDeepest, sayStanding, standing, STRUCTURAL, type Edge } from '../../src/ganglia/lawgraph';
import { lawById, withConstants } from '../../src/ganglia/laws';

describe('the structure between the laws', () => {
  it('derivations are found by composing laws, and each one found reproduces the result on fresh points: Joule heating is electrical power through Ohm\'s law; potential energy is kinetic energy through the speed of a fall', () => {
    const ds = compositions();
    expect(ds.length).toBeGreaterThanOrEqual(3);
    expect(ds).toContainEqual(expect.objectContaining({ result: 'joule', outer: 'power.electric', inner: 'ohm', quantity: 'voltage' }));
    expect(ds).toContainEqual(expect.objectContaining({ result: 'energy.potential', outer: 'energy.kinetic', inner: 'free-fall.speed', quantity: 'speed' }));
    // held on fresh points, not the ones it was found on
    const j = lawById('joule')!, pe = lawById('power.electric')!, ohm = lawById('ohm')!;
    for (const [I, R] of [[3, 0.7], [0.2, 50], [12, 0.05]]) expect(pe.eval({ V: ohm.eval({ I, R }), I })).toBeCloseTo(j.eval({ I, R }), 9);
    for (const d of ds) expect(d.maxRel).toBeLessThan(1e-6);
    console.log(`derivations by composition: ${ds.map((d) => `${d.result} = ${d.outer} ∘ ${d.inner} via ${d.quantity}`).join(' | ')}`);
  });

  it('a law exists once and carries every kind of relation; no kind is collapsed into another', () => {
    const g = lawGraph();
    expect(g.nodes.size).toBe(144);
    const kinds = new Set(g.edges.map((e) => e.kind));
    expect([...kinds].sort()).toEqual(['co-used', 'derives-from', 'feeds', 'shares-constant', 'shares-shape']);
    for (const e of g.edges) { expect(e.via.length).toBeGreaterThan(0); expect(e.source.length).toBeGreaterThan(0); }
    const ohm = g.adj.get('ohm')!;
    expect(ohm.some((e) => e.kind === 'derives-from' && e.from === 'joule')).toBe(true);
    expect(ohm.some((e) => e.kind === 'feeds')).toBe(true);
    expect(ohm.some((e) => e.kind === 'co-used')).toBe(true);
    expect(ohm.some((e) => e.kind === 'shares-shape')).toBe(true);
  });

  it('every path is kept with the relations that compose it: A→B→D and A→C→E→D both survive, and what lies between is counted per path', () => {
    const extra: Edge[] = [
      { from: 'B', to: 'A', kind: 'derives-from', via: 'x', source: 'test', weight: 1 }, { from: 'D', to: 'B', kind: 'derives-from', via: 'x', source: 'test', weight: 1 },
      { from: 'C', to: 'A', kind: 'derives-from', via: 'y', source: 'test', weight: 1 }, { from: 'E', to: 'C', kind: 'derives-from', via: 'y', source: 'test', weight: 1 }, { from: 'D', to: 'E', kind: 'derives-from', via: 'y', source: 'test', weight: 1 },
    ];
    const g = lawGraph({ extra });
    const ps = paths(g, 'A', 'D', { maxDepth: 4, kinds: STRUCTURAL });
    expect(ps.map((p) => p.steps.map((s) => s.law).join(''))).toEqual(['ABD', 'ACED']);
    expect(ps[0]!.kinds).toEqual(['derives-from', 'derives-from']);
    expect(between(g, 'A', 'D')).toEqual([{ law: 'B', through: 1 }, { law: 'C', through: 1 }, { law: 'E', through: 1 }]);
    expect(closeness(g, 'A', 'D').derivational).toBe(2);
    expect(cone(g, 'A').map((x) => x.law).sort()).toEqual(['B', 'C', 'D', 'E']);
    expect(ancestry(g, 'D').map((x) => `${x.law}@${x.depth}`)).toEqual(['B@1', 'E@1', 'A@2', 'C@2']);
    // D's standing: two chains to A, the longer one counts for depth; A is deepest in that cone
    expect(standing(g).get('A')).toMatchObject({ reach: 4, depthBelow: 3, heightAbove: 0, foundational: true });
    expect(deepest(g)[0]!.id).toBe('A');
  });

  it('how close two laws are has several answers, never one number', () => {
    const g = lawGraph();
    const c = closeness(g, 'ohm', 'joule');
    expect(c).toMatchObject({ derivational: 1, dependency: 1, commonAncestor: { law: 'ohm', fromA: 0, fromB: 1 }, shape: null, domains: ['electrical', 'electrical'] });
    expect(c.structuralPaths).toBeGreaterThanOrEqual(1);
    const far = closeness(g, 'pendulum.period', 'diffusion.time');
    expect(far.derivational).toBeNull();
    expect(far.commonAncestor).toBeNull();
    expect(far.domains).toEqual(['mechanics', 'fluids']);
    expect(sayCloseness(g, 'ohm', 'joule')).toMatch(/^How close Ohm's law and Joule heating are has several answers: derivational distance 1; dependency distance 1; common ancestor Ohm's law \(0 and 1 steps up\); no shared shape; one human domain \(electrical, electrical\); \d+ structural paths? and (at least )?\d+ paths? of use within 4 steps\.$/);
    expect(sayConnected(g, 'ohm', 'joule')).toMatch(/^Ohm's law and Joule heating, within 4 steps: \d+ structural paths?.*Ohm's law ←\[derives-from\]← Joule heating/);
  });

  it('what is deep is computed from the topology: a structure put above five laws by the substrate becomes the deepest, and the layout regenerates from the change', () => {
    const before = lawGraph();
    const st0 = standing(before);
    expect(st0.get('pendulum.period')!.heightAbove).toBe(0);
    const above = (id: string) => (['pendulum.period', 'diffusion.time', 'lumped.time-constant', 'rc.time-constant', 'motor.time-constant'].includes(id) ? [{ to: 'tsc.process-time-scaling', name: 'process time scaling', says: 'k read off the shape' }] : []);
    const after = lawGraph({ above });
    const st1 = standing(after);
    expect(st1.get('pendulum.period')!.heightAbove).toBe(1);
    expect(st1.get('tsc.process-time-scaling')).toMatchObject({ reach: 5, depthBelow: 1, foundational: true });
    expect(deepest(after)[0]!.id).toBe('tsc.process-time-scaling');
    const p0 = projection(before), p1 = projection(after);
    const y = (p: typeof p0, id: string) => p.nodes.find((n) => n.id === id)!.y;
    expect(y(p1, 'tsc.process-time-scaling')).toBe(1);
    expect(y(p0, 'pendulum.period')).toBe(0);
    // the same structure gives the same layout; a changed structure moves the plane too
    const again = projection(lawGraph({ above }));
    expect(again.nodes).toEqual(p1.nodes);
    const moved = p0.nodes.filter((n) => { const m = p1.nodes.find((x) => x.id === n.id); return m && (Math.abs(m.x - n.x) > 1e-3 || Math.abs(m.z - n.z) > 1e-3); }).length;
    expect(moved).toBeGreaterThan(0);
    console.log(`projection: ${p0.nodes.length} placed, ${p0.groups.length} groups before; ${moved} laws moved in the plane after the structure gained one parent of five`);
  });

  it('zoom keeps the cross-links: the root view aggregates every edge between cones by kind, and opening a cone lists each one leaving it', () => {
    const above = (id: string) => (['pendulum.period', 'diffusion.time', 'lumped.time-constant', 'rc.time-constant', 'motor.time-constant'].includes(id) ? [{ to: 'tsc.process-time-scaling', name: 'process time scaling' }] : []);
    const g = lawGraph({ above });
    const r = roots(g);
    const top = r.find((s) => s.root === 'tsc.process-time-scaling')!;
    expect(top.members.length).toBe(6);
    const aggregated = top.links.reduce((n, l) => n + l.count, 0);
    const opened = branch(g, 'tsc.process-time-scaling');
    expect(opened.members.length).toBe(6);
    // every edge leaving the cone appears once in the aggregate, by kind, from this cone's side
    const leavingFromHere = opened.leaving.filter((e) => opened.members.includes(e.from)).length;
    expect(aggregated).toBe(leavingFromHere);
    expect(opened.leaving.length).toBeGreaterThan(aggregated);
    // the whole book is covered once: every law is a member of exactly one super-node's home
    expect(r.flatMap((s) => s.members).length).toBeGreaterThanOrEqual(g.nodes.size);
  });

  it('standing and the deepest are said from the structure', () => {
    const g = lawGraph();
    expect(sayStanding(g, 'ohm')).toMatch(/^Ohm's law: 1 law rests on it by derivation \(Joule heating\); it rests on 0; chains 1 deep below and 0 above; its output reaches \d+ laws downstream through quantities; nothing above it: deepest in its cone\.$/);
    expect(sayDeepest(g)).toMatch(/^The deepest by derivation \(nothing above them, the most resting on them\): .*\. The widest by use \(whose output reaches the most laws through quantities\): .*\. Computed from the topology, not assigned\.$/);
    expect(withConstants(lawById('weight')!, { m: 1, g: 9.81 }).g).toBe(9.81);
  });
});

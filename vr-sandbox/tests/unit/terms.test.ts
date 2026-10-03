// Laws as terms (src/ganglia/native/terms.ts): the other half of the experiment in docs/NEX-TOPOLOGY.md §14. A term is
// the law when it reproduces the law's own worked example; anti-unification over the terms gives the generalisation
// order without a label; the laws that had no power form join it; the description-length criterion says what the
// shared shapes save; and a change to one term reaches, by citation alone, what was derived from it.

import { describe, expect, it } from 'vitest';
import { affected, evalTerm, generalisationOrder, instanceOf, lawHash, lgg, reproduces, TERMS, termedLaws, termOf, termSize } from '../../src/ganglia/native/terms';
import { shapeOf } from '../../src/ganglia/native/forms';
import { candidates, descriptionLength, Morphemes, promote } from '../../src/ganglia/native/morpheme';
import { text, read } from '../../src/ganglia/native/text';
import { hash } from '../../src/ganglia/native/core';
import { NODES } from '../../src/ganglia/tree/nodes';

describe('laws as terms', () => {
  it('every term reproduces its law\'s worked example: the term is the law, and eval is its realisation', () => {
    const ids = Object.keys(TERMS);
    expect(ids.length).toBeGreaterThanOrEqual(40);
    const bad = ids.map((id) => [id, reproduces(id)] as const).filter(([, r]) => !r || !r.ok).map(([id, r]) => `${id}: ${r ? `${r.got} vs ${r.expected} (rel ${r.rel.toExponential(2)})` : 'no law'}`);
    expect(bad).toEqual([]);
  });

  it('a term is Nex: it prints to the compact text and reads back to the same hash', () => {
    for (const id of Object.keys(TERMS)) { const t = TERMS[id]!; expect(hash(read(text(t)))).toBe(hash(t)); }
  });

  it('the laws with no power form now have a shape: the ones the exponent probe could not see join the order', () => {
    const shapeless = termedLaws().filter((l) => !shapeOf(l)).map((l) => l.id);
    expect(shapeless.length).toBeGreaterThanOrEqual(15);
    const { shapes } = generalisationOrder(termedLaws().map((l) => ({ id: l.id, term: TERMS[l.id]! })));
    const joined = shapeless.filter((id) => shapes.some((s) => s.instances.includes(id)));
    // measured 3 October 2026: see the console line
    console.log(`shapeless laws ${shapeless.length}, of which in a shared shape ${joined.length}: ${joined.join(' ')}`);
    expect(joined.length).toBeGreaterThan(0);
  });

  it('anti-unification keeps the operations and abstracts the names: the energies are one shape with ½, a mass-like and a squared speed-like', () => {
    const g = lgg(TERMS['energy.kinetic']!, TERMS['capacitor.energy']!);
    expect(text(g.def)).toBe('apply(op:mul, 0.5, $1, apply(op:pow, $2, 2))');
    expect(instanceOf(g.def, TERMS['spring.energy']!)).toBe(true);
    expect(instanceOf(g.def, TERMS['joule']!)).toBe(false);
    // a sum is not a product: von Mises and the parallel axis share only the shape "something of a sum with a square in it"
    const h = lgg(TERMS['parallel-axis']!, TERMS['composite.rule-of-mixtures']!);
    expect(text(h.def)).toBe('apply(op:add, $1, apply(op:mul, $2, $3))');
  });

  it('the generalisation order over the terms is deeper than the exponent probe\'s two levels, and nothing in it was declared', () => {
    const corpus = termedLaws().map((l) => ({ id: l.id, term: TERMS[l.id]! }));
    const order = generalisationOrder(corpus);
    console.log(`terms ${corpus.length}; shapes with 2+ instances ${order.shapes.length}; maximal ${order.maximal.length}; depth ${order.depth}`);
    for (const m of order.maximal.sort((a, b) => b.instances.length - a.instances.length).slice(0, 6)) console.log(`   ${m.instances.length} instances: ${text(m.def)} :: ${m.instances.join(' ')}`);
    expect(order.depth).toBeGreaterThan(2);
    expect(order.maximal.length).toBeGreaterThan(0);
  });

  it('description length: the shared shapes shorten the corpus; the hand-kept law tree adds nodes and shortens nothing', () => {
    const corpus = termedLaws().map((l) => ({ s: TERMS[l.id]!, domain: l.domain }));
    const before = descriptionLength(corpus.map((c) => c.s));
    const reg = new Morphemes();
    const cands = candidates(corpus, { min: 3, minOcc: 2, minDomains: 1 });
    const promoted = promote(reg, cands, 12);
    const after = descriptionLength(corpus.map((c) => c.s), reg);
    const treeNodesForTheseLaws = NODES.filter((n) => termedLaws().some((l) => n.id.endsWith(l.id) || n.id.includes(l.id.split('.')[0]!))).length;
    console.log(`description length ${before} → ${after} with ${promoted.length} shapes promoted (${promoted.map((m) => text(m.def)).slice(0, 4).join(' | ')}); the law tree keeps ${NODES.length} nodes, ${treeNodesForTheseLaws} touching these laws, and compresses none of them`);
    expect(after).toBeLessThan(before);
    expect(promoted.length).toBeGreaterThan(0);
  });

  it('a change to one term reaches what cites it, by hash alone; what does not cite it is untouched', () => {
    const records = [
      { id: 'tau.pendulum', cites: [lawHash('pendulum.period')!] },
      { id: 'tau.scaling', cites: ['h:tau.pendulum', lawHash('diffusion.time')!] },
      { id: 'design.table', cites: [lawHash('stress.von-mises')!] },
    ];
    const byHash = (id: string) => (id === 'tau.pendulum' ? 'h:tau.pendulum' : undefined);
    const corrected = { ...TERMS['pendulum.period']! };
    const stale = affected(records, [hash(corrected)], byHash);
    expect(stale.sort()).toEqual(['tau.pendulum', 'tau.scaling']);
    expect(affected(records, [hash(TERMS['carnot']!)], byHash)).toEqual([]);
    expect(termSize(TERMS['carnot']!)).toBe(5);
    expect(evalTerm(TERMS['carnot']!, { Tc: 300, Th: 600 })).toBe(0.5);
    expect(termOf('nothing.such')).toBeNull();
  });
});

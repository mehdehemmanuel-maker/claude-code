// The law tree is data, and data can be checked (docs/LAW-TREE.md §L.3): it is one rooted acyclic structure, every
// realisation it names is code that exists, every obligation it says is held is held by a test that exists, and every
// numerical parameter carries its contract. A node that fails here is not knowledge until it is fixed.

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NODES } from '../../src/ganglia/tree/nodes';
import { ancestors, index, ROOT_KINDS, why, type Node } from '../../src/ganglia/tree/schema';

const nodes = index(NODES);
const edges = (n: Node) => [...n.parents, ...(n.dependsOn ?? [])];
/** Every module a realisation may name, as a lazy import (a dynamic import needs a static root). */
const modules = import.meta.glob('../../src/**/*.ts');

describe('the law tree', () => {
  it('has no duplicate node, and every parent and dependency is a node', () => {
    for (const n of NODES) for (const p of edges(n)) expect(nodes.has(p), `${n.id} → ${p}`).toBe(true);
  });

  it('is rooted: only axioms and model assumptions have no parent, and they have none', () => {
    for (const n of NODES) {
      if (ROOT_KINDS.has(n.kind)) expect(n.parents, `${n.id} is a root`).toEqual([]);
      else expect(n.parents.length, `${n.id} has no parent`).toBeGreaterThan(0);
    }
  });

  it('is acyclic over parents and dependencies', () => {
    const state = new Map<string, 'open' | 'done'>();
    const visit = (id: string, path: string[]) => {
      const s = state.get(id);
      if (s === 'done') return;
      expect(s, `cycle: ${[...path, id].join(' → ')}`).not.toBe('open');
      state.set(id, 'open');
      for (const p of edges(nodes.get(id)!)) visit(p, [...path, id]);
      state.set(id, 'done');
    };
    for (const n of NODES) visit(n.id, []);
  });

  it('every node derives from the roots: WHY stops only at axioms and model assumptions', () => {
    for (const n of NODES) {
      const roots = ancestors(nodes, n.id).filter((a) => ROOT_KINDS.has(nodes.get(a)!.kind));
      if (!ROOT_KINDS.has(n.kind)) expect(roots.length, `${n.id} reaches no root`).toBeGreaterThan(0);
      const lines = why(nodes, n.id);
      expect(lines.some((l) => l.includes('not in the tree')), `${n.id} cites an orphan`).toBe(false);
    }
  });

  it('every realisation names an exported symbol, or a method of an exported class, that exists', async () => {
    for (const n of NODES) {
      for (const r of n.realisedBy ?? []) {
        const load = modules[`../../src/${r.module}.ts`];
        expect(load, `${n.id}: no module ${r.module}`).toBeDefined();
        const mod = (await load!()) as Record<string, unknown>;
        const [cls, method] = r.symbol.split('#');
        const target = method ? (mod[cls!] as { prototype?: Record<string, unknown> } | undefined)?.prototype?.[method] : mod[cls!];
        expect(typeof target, `${n.id}: ${r.module}.${r.symbol}`).toMatch(/function|object|number/);
      }
    }
  });

  it('every obligation said to be held is held by a test that exists, by name', () => {
    for (const n of NODES) {
      for (const h of n.heldBy ?? []) {
        expect(existsSync(h.file), `${n.id}: ${h.file}`).toBe(true);
        expect(readFileSync(h.file, 'utf8').includes(h.test), `${n.id}: no test "${h.test}" in ${h.file}`).toBe(true);
      }
    }
  });

  it('every tested law holds an obligation, and every numerical parameter carries its contract and its value', () => {
    for (const n of NODES) {
      if (n.proof === 'tested') expect((n.heldBy ?? []).length + (n.realisedBy ?? []).length, `${n.id} is "tested" by nothing`).toBeGreaterThan(0);
      if (n.kind === 'parameter') {
        expect(n.value, `${n.id} has no value`).toBeDefined();
        expect(n.contract, `${n.id} has no contract`).toBeDefined();
      }
      if (n.proof === 'violated') expect(n.limits?.length, `${n.id} is violated but says not where`).toBeGreaterThan(0);
    }
  });

  it('a law of the kernel cites its chain: F-1.1.1 rests on the port axiom and the realisation axiom', () => {
    const chain = ancestors(nodes, 'F-1.1.1');
    expect(chain).toContain('A-1');
    expect(chain).toContain('A-4');
    expect(chain).toContain('F-1');
  });
});

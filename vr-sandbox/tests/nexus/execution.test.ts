// The execution graph of a run (src/nexus/embody/execution.ts): built from what the run recorded as it ran, its order
// its own dependencies, and every question about a node answered from its records and edges.

import { describe, expect, it } from 'vitest';
import { car, printer } from '../../src/nexus/asked';
import { generate } from '../../src/nexus/manifold';
import { embodyAny } from '../../src/nexus/embody/any';
import { executionOf, explain, retryOf } from '../../src/nexus/embody/execution';

const run = (i: ReturnType<typeof car>) => { const s = generate(i), m = embodyAny(i, s)!; return { i, s, m, x: executionOf(i, s, m) }; };

describe('the execution graph of a run', () => {
  const c = run(car());
  it('records what the designers read as they ran, each read feeding the step it was read for', () => {
    expect(c.m.reads!.length).toBeGreaterThan(10);
    expect(c.m.reads!.every((r) => r.step >= 0 && r.step <= c.m.trace.length)).toBe(true);
    const reads = c.x.edges.filter((e) => e.rel === 'reads');
    expect(reads.length).toBeGreaterThan(5);
    expect(reads.every((e) => /^step:/.test(e.to))).toBe(true);
  });
  it('has a node for every step that ran, in the order it ran, and every decision with its law and what else it tried', () => {
    expect(c.x.nodes.filter((n) => n.kind === 'step' || n.kind === 'decision').length).toBe(c.m.trace.length);
    for (const g of c.m.gates!) { const n = c.x.nodes.find((k) => k.kind === 'decision' && k.why.startsWith(g.question))!; expect(n.law).toBe(g.law); expect(n.tried).toEqual(g.tried); }
    expect(c.x.edges.filter((e) => e.rel === 'then').length).toBe(c.m.trace.length - 1);
  });
  it('links every generated element back to the want it was derived for', () => {
    const into = (id: string) => c.x.edges.filter((e) => e.to === id).map((e) => e.from);
    for (const n of c.x.nodes.filter((k) => k.kind === 'generated')) {
      let at = n.id, guard = 0;
      while (!at.startsWith('want:') && guard++ < 30) { const up = into(at).find((f) => f.startsWith('el:') || f.startsWith('want:')); if (!up) break; at = up; }
      expect(at.startsWith('want:')).toBe(true);
    }
  });
  it('orders nodes by their own dependencies: everything a node takes is shallower than it', () => {
    const d = new Map(c.x.nodes.map((n) => [n.id, n.depth]));
    const cut = c.x.edges.filter((e) => d.get(e.from)! >= d.get(e.to)!);
    // only a cycle (two subsystems holding each other) may close back on itself
    expect(cut.every((e) => ['power', 'signal', 'drive', 'support', 'decision'].includes(e.rel))).toBe(true);
  });
  it('answers what depends on a want and what removing it would take away, from its edges', () => {
    const w = c.x.nodes.find((n) => n.kind === 'want' && c.x.edges.some((e) => e.from === n.id))!;
    expect(explain(c.x, w.id, 'depends')).toMatch(/depend on it directly/);
    expect(explain(c.x, w.id, 'remove')).toMatch(/^Without it, \d+ would lose/);
    const d = c.x.nodes.find((n) => n.kind === 'decision' && (n.tried?.length ?? 0) > 1)!;
    expect(explain(c.x, d.id, 'alternatives')).toMatch(/^Tried: /);
    expect(explain(c.x, d.id, 'law')).toBe(d.law);
  });
  it('answers what calls a node, what it calls, what comes before and after it, and what was made of it, from the run', () => {
    const sub = c.x.nodes.find((n) => n.kind === 'built' && n.facts?.energy)!;
    expect(sub).toBeTruthy();
    expect(explain(c.x, sub.id, 'geometry')).toMatch(/^Its geometry: \d+ /);
    expect(explain(c.x, sub.id, 'material')).toMatch(/^Its material: /);
    expect(explain(c.x, sub.id, 'position')).toMatch(/centred at \(/);
    expect(explain(c.x, sub.id, 'energy')).toMatch(/^Its energy: power /);
    expect(explain(c.x, sub.id, 'calledBy')).toMatch(/^Called by \d+/);
    expect(explain(c.x, sub.id, 'before')).toMatch(/must exist before it/);
    const w = c.x.nodes.find((n) => n.kind === 'want' && c.x.edges.some((e) => e.from === n.id))!;
    expect(explain(c.x, w.id, 'calls')).toMatch(/^It calls \d+/);
    expect(explain(c.x, w.id, 'after')).toMatch(/become possible after it/);
    // what the run did not record is said to be a gap, not answered
    expect(explain(c.x, w.id, 'timing')).toMatch(/not recorded .*a gap/);
  });
  it("puts the printer's flaws in the graph with the check that found them and the law they break", () => {
    const p = run(printer());
    const fl = p.x.nodes.filter((n) => n.kind === 'failure');
    expect(fl.length).toBeGreaterThan(0);
    for (const f of fl) { expect(f.law).toBeTruthy(); expect(p.x.edges.some((e) => e.to === f.id && e.rel === 'finds')).toBe(true); }
  });
  it('shows a retry as a path: what stood, the demand, what it changed, and the nodes that differ marked with what they were', () => {
    const i2 = car(), s2 = generate(i2);
    i2.wants = i2.wants.map((w) => (/mass|carr|load/i.test(w.quantity.name) && w.lo ? { ...w, lo: { ...w.lo, value: (w.lo.value ?? 0) * 2 } } : w));
    const m2 = embodyAny(i2, s2)!, after = executionOf(i2, s2, m2);
    const r = retryOf(c.x, 'it has to carry twice as much', ['mass 300 kg → 600 kg'], after);
    expect(r.nodes.find((n) => n.id === 'demand')!.label).toMatch(/twice as much/);
    expect(r.edges.some((e) => e.from === 'demand' && e.to === 'change:0')).toBe(true);
    expect(explain(r, 'result', 'changed')).toMatch(/^(Before: |Unchanged on the retry)/);
    const none = retryOf(c.x, 'mud hits the battery', [], c.x);
    expect(none.nodes.find((n) => n.id === 'change:none')!.unknown).toBe('mud hits the battery');
  });
});

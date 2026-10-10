// The second slice: an arm bolted to a post. A joint is a coupling whose shared boundary variables are read from
// the solution and measured by the kernel; the bolt group's capacity bounds them at the declared factor; the
// catalogue of sections and bolt groups is searched under two preferences in order.

import { describe, expect, it } from 'vitest';
import { jolt } from '../conformance/helpers';
import { bracketCatalogue, bracketIntent, bracketMaterial, bracketOnPost, type BracketSlice } from '../../src/nexus/substrate/bracket';
import { GROUP_BENDING } from '../../src/nexus/book';
import { leavesUnder, why, type WhyNode } from '../../src/nexus/substrate/why';

const KIND_WORDS = ['plate', 'block', 'lumber', 'table', 'shelf', 'template', 'default', 'bracket'];
let built: BracketSlice | null = null;
async function slice(): Promise<BracketSlice> { return (built ??= bracketOnPost(bracketIntent('the person'), bracketMaterial(), bracketCatalogue(), await jolt())); }

describe('the bracket: semantics, search and construction', () => {
  it('with the section and the bolt group free, the solver binds the load and reports the rest free', async () => {
    const s = await slice();
    expect(s.open.bound['P']!.value).toBeCloseTo(20 * 9.80665, 9);
    expect(s.open.free.map((f) => f.sym)).toContain('M');
    expect(s.open.free.map((f) => f.sym)).toContain('Mcap');
    expect(s.open.free.find((f) => f.sym === 'Mcap')!.wouldBind[0]!.by).toBe('bolt-group.bending');
    expect(s.open.constraints.every((c) => c.holds === null)).toBe(true);
  }, 120000);

  it('two preferences in order: the least section that carries the load, then the fewest and smallest bolts', async () => {
    const s = await slice();
    expect(s.choice.pick!.option.label).toBe('2x4 flat + M6 ×1');
    expect(s.choice.tie).toEqual([]);
    const labels = s.choice.manifold.map((c) => c.option.label);
    expect(labels).toContain('2x4 flat + M12 ×2');
    expect(labels.some((l) => l.startsWith('2x2'))).toBe(false);
    const by = Object.fromEntries(s.choice.candidates.map((c) => [c.option.label, c]));
    expect(by['2x2 on edge + M6 ×1']!.unsatisfied).toEqual(['stiffness: the tip sag is within the declared limit']);
    expect(by['1x4 on edge + M6 ×1']!.refused[0]).toMatch(/lateral stability/);
    const bound = s.choice.pick!.solution.bound;
    expect(bound['Mcap']!.value! / bound['Mneed']!.value!).toBeGreaterThan(2);
    expect(bound['Mcap']!.law).toBe(GROUP_BENDING.hash);
  }, 120000);

  it('the joint\'s frames and every coordinate are coupling solutions from the frame; the arm\'s top is flush with the post\'s', async () => {
    const s = await slice();
    const c = s.configuration!;
    expect(c.bodies.arm.centre!.y.value).toBeCloseTo(1 - 0.038 / 2, 12);
    expect(c.bodies.arm.centre!.x.value).toBeCloseTo(0.05 + 0.5, 12);
    expect(c.joint.onPost.x.value).toBeCloseTo(0.05, 12);
    expect(c.joint.onPost.y.value).toBeCloseTo(0.5 - 0.019, 12);
    expect(c.joint.onArm.x.value).toBeCloseTo(-0.5, 12);
    expect(c.bodies.load.centre!.x.value).toBeCloseTo(0.55, 12);
    for (const d of [c.bodies.arm.centre!.x, c.bodies.load.centre!.x, c.bodies.post.centre!.y]) expect(leavesUnder(d).some((l) => l.name.startsWith('origin'))).toBe(true);
    expect(c.balance.balanced).toBe(true);
    expect(c.jointHolds.value).toBe(1);
  }, 120000);

  it('no derivation names a kind of thing', async () => {
    const s = await slice();
    const walk = (n: WhyNode, path: string) => {
      const text = `${n.name} | ${n.law ?? ''}`.toLowerCase();
      for (const w of KIND_WORDS) expect(new RegExp(`\\b${w}\\b`).test(text), `${path}: "${n.name}" / "${n.law}" names "${w}"`).toBe(false);
      for (const [sym, c] of Object.entries(n.inputs)) walk(c, `${path}/${sym}`);
    };
    for (const d of s.journal.records()) walk(why(d), d.name);
  }, 120000);
});

describe('the bracket in the kernel', () => {
  it('the joint holds, the kernel\'s root moment and shear agree with the derivation within the contract, and so does its utilisation against the bolt-group law', async () => {
    const s = await slice();
    const r = s.realization!;
    expect(r.events).toEqual([]);
    expect(r.holds.value).toBe(1);
    expect(r.mode).toBe('bending');
    const by = Object.fromEntries(s.comparisons.map((c) => [c.name, c]));
    for (const name of ['root moment at the joint', 'root shear at the joint', 'the joint holds', 'rests', 'utilisation of the joint']) expect(by[name]!.verdict.kind, `${name}: ${JSON.stringify(by[name]!.verdict)} derived ${by[name]!.derived.value} measured ${by[name]!.measured.value}`).toBe('within');
    expect(by['tip sag']!.verdict.kind).toBe('unobserved');
    expect(r.utilisation.value).toBeGreaterThan(0.1);
    expect(r.utilisation.value).toBeLessThan(0.2);
  }, 120000);

  it('the tip sag is observed by the elastic line and unobserved by the kernel; the elastic root loads agree with the statics to the error it measured', async () => {
    const s = await slice();
    const by = Object.fromEntries(s.comparisons.map((c) => [c.name, c]));
    expect(by['tip sag']!.verdict.kind).toBe('unobserved');
    expect(by['tip sag (elastic)']!.verdict.kind, JSON.stringify(by['tip sag (elastic)']!.verdict)).toBe('within');
    expect(by['tip sag (elastic)']!.measured.value).toBeCloseTo(s.choice.pick!.solution.bound['delta']!.value!, 6);
    for (const name of ['root moment (elastic)', 'root shear (elastic)']) expect(by[name]!.verdict.kind, name).toBe('within');
    expect(s.elastic!.error.value!).toBeLessThan(1e-6);
    expect(s.elastic!.tipSag.uncertainty).toBe(s.elastic!.error.value);
  }, 120000);

  it('WHY on the measured moment is a measurement; on the derived one it reaches the given mass, the sourced wood and the bolt standard', async () => {
    const s = await slice();
    const by = Object.fromEntries(s.comparisons.map((c) => [c.name, c]));
    expect(why(by['root moment at the joint']!.measured).origin?.class).toBe('measured');
    const leaves = leavesUnder(s.choice.pick!.solution.bound['Mcap']!);
    expect(leaves.some((l) => l.origin.source?.includes('ISO 262'))).toBe(true);
    expect(leaves.some((l) => l.origin.source?.includes('ISO 898-1'))).toBe(true);
    expect(leavesUnder(by['root moment at the joint']!.derived).some((l) => l.name === 'mass to carry')).toBe(true);
  }, 120000);
});

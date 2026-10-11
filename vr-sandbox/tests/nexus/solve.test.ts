// Part XXIV 6: constraint systems and the solver. Two bars and a load: everything the bindings determine is bound;
// remove one law and its variable is reported free, nothing filled, nothing downstream bound; two evidences that
// disagree are a contradiction; a search fills a free variable only from declared options under a declared
// preference, and a tie is reported, not broken.

import { describe, expect, it } from 'vitest';
import { RECT_AREA, RECT_MODULUS, BENDING_STRESS, WEIGHT } from '../../src/nexus/book';
import { ofLeaf } from '../../src/nexus/lang/evaluate';
import { law } from '../../src/nexus/lang/law';
import { search, solve, type System } from '../../src/nexus/substrate/solve';
import { div, le, leaf, mul, variable } from '../../src/nexus/lang/term';

const given = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }));
const g = ofLeaf(leaf('g', 9.80665, 'm/s^2', { class: 'fundamental', source: 'ISO 80000-3' }));

/** A load hung from a bar of section b × h: its weight, the bar's modulus, the stress at a lever arm. */
function twoBars(): System {
  const v = { W: variable('W', 'N'), r: variable('r', 'm'), M: variable('M', 'N m'), S: variable('S', 'm^3'), sigma: variable('sigma', 'Pa'), allow: variable('allow', 'Pa') };
  return {
    name: 'two bars and a load',
    vars: [
      { sym: 'm', unit: 'kg', name: 'mass' }, { sym: 'g', unit: 'm/s^2', name: 'gravity' }, { sym: 'W', unit: 'N', name: 'weight' }, { sym: 'r', unit: 'm', name: 'lever arm' },
      { sym: 'M', unit: 'N m', name: 'moment' }, { sym: 'b', unit: 'm', name: 'breadth' }, { sym: 'h', unit: 'm', name: 'depth' }, { sym: 'S', unit: 'm^3', name: 'section modulus' },
      { sym: 'A', unit: 'm^2', name: 'area' }, { sym: 'sigma', unit: 'Pa', name: 'stress' }, { sym: 'allow', unit: 'Pa', name: 'allowable' },
    ],
    relations: [
      { kind: 'law', sym: 'W', law: WEIGHT, args: { m: 'm', g: 'g' } },
      { kind: 'term', sym: 'M', term: mul(v.W, v.r), name: 'moment at the root', grounds: 'the weight at the lever arm' },
      { kind: 'law', sym: 'S', law: RECT_MODULUS, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'A', law: RECT_AREA, args: { b: 'b', h: 'h' } },
      { kind: 'law', sym: 'sigma', law: BENDING_STRESS, args: { M: 'M', S: 'S' } },
      { kind: 'constrain', holds: le(v.sigma, v.allow), says: 'the stress is within the allowable', role: 'design', source: 'test' },
    ],
    bindings: { m: given('mass', 20, 'kg'), g, r: given('lever arm', 0.5, 'm'), b: given('breadth', 0.02, 'm'), h: given('depth', 0.04, 'm'), allow: given('allowable', 30e6, 'Pa') },
  };
}

describe('the solver', () => {
  it('binds what the bindings determine, each a record citing its law', () => {
    const s = solve(twoBars());
    expect(s.free).toEqual([]);
    expect(s.bound['W']!.value).toBeCloseTo(20 * 9.80665, 9);
    expect(s.bound['sigma']!.value).toBeCloseTo((20 * 9.80665 * 0.5) / ((0.02 * 0.04 ** 2) / 6), 6);
    expect(s.bound['sigma']!.law).toBe(BENDING_STRESS.hash);
    expect(s.constraints[0]!.holds).toBe(true);
    expect(s.satisfied).toBe(true);
  });

  it('one law removed: its variable is free, nothing is filled, nothing downstream is bound', () => {
    const sys = twoBars();
    sys.relations = sys.relations.filter((r) => !(r.kind === 'law' && r.law === RECT_MODULUS));
    const s = solve(sys);
    expect(s.free.map((f) => f.sym)).toEqual(['S', 'sigma']);
    expect(s.free[0]!.wouldBind).toEqual([]);
    expect(s.free[1]!.wouldBind).toEqual([{ by: 'stress.bending', waitingOn: ['S'] }]);
    expect(s.bound['S']).toBeUndefined();
    expect(s.bound['sigma']).toBeUndefined();
    expect(s.constraints[0]!.holds).toBeNull();
    expect(s.satisfied).toBeNull();
  });

  it('an unknown binding stays unknown through the system and leaves the constraint undecided', () => {
    const sys = twoBars();
    sys.bindings['h'] = ofLeaf(leaf('depth', null, 'm', { class: 'unknown' }));
    const s = solve(sys);
    expect(s.bound['S']!.status).toBe('unknown');
    expect(s.bound['sigma']!.status).toBe('unknown');
    expect(s.constraints[0]!.holds).toBeNull();
  });

  it('two evidences that disagree are a contradiction, both kept', () => {
    const sys = twoBars();
    sys.relations.push({ kind: 'term', sym: 'W', term: mul(variable('m', 'kg'), variable('g', 'm/s^2'), variable('k', '1')), name: 'weight, by another route', grounds: 'test' });
    sys.vars.push({ sym: 'k', unit: '1', name: 'a stray factor' });
    sys.bindings['k'] = given('k', 1.1, '1');
    const s = solve(sys);
    expect(s.contradictions.map((c) => c.sym)).toEqual(['W']);
    expect(s.bound['W']!.status).toBe('contradicted');
    expect(Object.keys(s.bound['W']!.inputs)).toEqual(['a', 'b']);
  });

  it('a search fills the free section only from declared options, under a declared preference, and reports a tie', () => {
    const sys = twoBars();
    delete sys.bindings['b']; delete sys.bindings['h'];
    expect(solve(sys).free.map((f) => f.sym)).toEqual(['b', 'h', 'S', 'A', 'sigma']);
    const opt = (label: string, b: number, h: number) => ({ label, leaves: { b: leaf('b', b, 'm', { class: 'configuration', source: 'test catalogue' }), h: leaf('h', h, 'm', { class: 'configuration', source: 'test catalogue' }) } });
    const prefer = law({ id: 'least', name: 'least area', statement: 'least area', formula: 'min A', inputs: [{ sym: 'A', unit: 'm^2', name: 'area' }], output: { sym: 'A', unit: 'm^2', name: 'area' }, term: variable('A', 'm^2'), domain: [], source: { cite: 'test', kind: 'declaration' } });
    const c = search(sys, [opt('thin', 0.01, 0.02), opt('right', 0.02, 0.04), opt('big', 0.04, 0.08)], prefer);
    expect(c.candidates.map((x) => x.admissible)).toEqual([false, true, true]);
    expect(c.candidates[0]!.unsatisfied).toEqual(['the stress is within the allowable']);
    expect(c.pick!.option.label).toBe('right');
    expect(c.why!.value).toBeCloseTo(0.0008, 12);
    const tie = search(sys, [opt('a', 0.02, 0.04), opt('b', 0.016, 0.05)], prefer);
    expect(tie.pick).toBeNull();
    expect(tie.tie.map((t) => t.option.label)).toEqual(['a', 'b']);
  });

  it('a validity constrain refuses a candidate, a design constrain leaves it unsatisfied: both reported', () => {
    const sys = twoBars();
    delete sys.bindings['b']; delete sys.bindings['h'];
    sys.relations.push({ kind: 'constrain', holds: le(div(variable('h', 'm'), variable('b', 'm')), leaf('two', 2, '1', { class: 'configuration', source: 'test' })), says: 'd/b ≤ 2', role: 'validity', source: 'test' });
    const opt = (label: string, b: number, h: number) => ({ label, leaves: { b: leaf('b', b, 'm', { class: 'configuration', source: 'test catalogue' }), h: leaf('h', h, 'm', { class: 'configuration', source: 'test catalogue' }) } });
    const prefer = law({ id: 'least', name: 'least area', statement: 'least area', formula: 'min A', inputs: [{ sym: 'A', unit: 'm^2', name: 'area' }], output: { sym: 'A', unit: 'm^2', name: 'area' }, term: variable('A', 'm^2'), domain: [], source: { cite: 'test', kind: 'declaration' } });
    const c = search(sys, [opt('deep', 0.01, 0.08), opt('thin', 0.01, 0.02)], prefer);
    expect(c.candidates[0]!.refused).toEqual(['d/b ≤ 2']);
    expect(c.candidates[1]!.unsatisfied).toEqual(['the stress is within the allowable']);
    expect(c.pick).toBeNull();
  });
});

// Part XXIV 3 and 4: evaluation as derivation; status and validity. No bare value: every evaluation is a record
// that recomputes to itself; unknown in, unknown out; outside a law's domain, refused with the domain named; the
// weakest input sets the status; uncertainty propagates.

import { describe, expect, it } from 'vitest';
import { evaluate, isDerivation, ofLeaf, recompute } from '../../src/nexus/substrate/evaluate';
import { apply } from '../../src/nexus/substrate/law';
import { PATCH_SAG, WEIGHT } from '../../src/nexus/book';
import { leaf, mul, unknown, variable } from '../../src/nexus/substrate/term';
import { why } from '../../src/nexus/substrate/why';

const given = (name: string, v: number, unit: string, u?: number) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }, u));

describe('derivation', () => {
  it('every evaluation is a record that recomputes to itself', () => {
    const m = given('mass', 10, 'kg'), g = ofLeaf(leaf('g', 9.80665, 'm/s^2', { class: 'fundamental', source: 'ISO 80000-3' }));
    const W = apply(WEIGHT, { m, g });
    expect(isDerivation(W)).toBe(true);
    expect(W.value).toBeCloseTo(98.0665, 9);
    expect(W.law).toBe(WEIGHT.hash);
    expect(recompute(W).value).toBe(W.value);
    expect(recompute(W).hash).toBe(W.hash);
    expect(isDerivation({ ...W })).toBe(false);
  });

  it('unknown in, unknown out: a derivation from an unknown is unknown, never a default', () => {
    const W = apply(WEIGHT, { m: ofLeaf(unknown('mass', 'kg')), g: given('g', 9.81, 'm/s^2') });
    expect(W.value).toBeNull();
    expect(W.status).toBe('unknown');
    const M = evaluate('moment', mul(variable('W', 'N'), variable('L', 'm')), { W, L: given('L', 1, 'm') });
    expect(M.status).toBe('unknown');
    expect(M.value).toBeNull();
  });

  it('the status is the weakest input, never stronger than derived', () => {
    const fundamental = ofLeaf(leaf('g', 9.80665, 'm/s^2', { class: 'fundamental', source: 'ISO 80000-3' }));
    const assumed = ofLeaf(leaf('mass', 10, 'kg', { class: 'assumed', by: 'test', grounds: 'a guess' }));
    expect(apply(WEIGHT, { m: assumed, g: fundamental }).status).toBe('assumed');
    expect(apply(WEIGHT, { m: ofLeaf(leaf('mass', 10, 'kg', { class: 'measured', source: 'a scale' })), g: fundamental }).status).toBe('derived');
    expect(apply(WEIGHT, { m: given('mass', 10, 'kg'), g: fundamental }).status).toBe('given');
  });

  it('outside a law\'s domain the evaluation is refused with the domain named', () => {
    const env = { P: given('P', 1000, 'N'), L: given('L', 2, 'm'), w: given('w', 0, 'm'), E: given('E', 200e9, 'Pa'), I: given('I', 1e-7, 'm^4'), h: given('h', 0.3, 'm') };
    const d = apply(PATCH_SAG, env);
    expect(d.status).toBe('outside-validity');
    expect(d.value).toBeNull();
    expect(d.refusal?.domain).toMatch(/slender/);
    expect(d.refusal?.law).toBe(PATCH_SAG.hash);
    expect(apply(PATCH_SAG, { ...env, h: given('h', 0.04, 'm') }).status).toBe('given');
  });

  it('uncertainty propagates to first order', () => {
    const m = given('mass', 10, 'kg', 0.1), g = given('g', 9.81, 'm/s^2');
    const W = apply(WEIGHT, { m, g });
    expect(W.uncertainty).toBeCloseTo(0.981, 6);
  });

  it('WHY is total: every path ends in a leaf with an origin', () => {
    const W = apply(WEIGHT, { m: given('mass', 10, 'kg'), g: ofLeaf(leaf('g', 9.80665, 'm/s^2', { class: 'fundamental', source: 'ISO 80000-3' })) });
    const tree = why(W);
    expect(tree.law).toBe(WEIGHT.hash);
    expect(tree.inputs['m']!.origin?.class).toBe('given');
    expect(tree.inputs['g']!.origin?.source).toBe('ISO 80000-3');
  });
});

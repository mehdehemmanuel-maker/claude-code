// Part XXIV 3 and 4: evaluation as derivation; status and validity. No bare value: every evaluation is a record
// that recomputes to itself; unknown in, unknown out; outside a law's domain, refused with the domain named; the
// weakest input sets the status; uncertainty propagates.

import { describe, expect, it } from 'vitest';
import { ofLeaf } from '../../src/nexus/evaluate';
import { apply } from '../../src/nexus/law';
import { PATCH_SAG } from '../../src/nexus/book';
import { leaf } from '../../src/nexus/term';

const given = (name: string, v: number, unit: string, u?: number) => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'test' }, u));

describe('derivation', () => {
  
  
  
  it('outside a law\'s domain the evaluation is refused with the domain named', () => {
    const env = { P: given('P', 1000, 'N'), L: given('L', 2, 'm'), w: given('w', 0, 'm'), E: given('E', 200e9, 'Pa'), I: given('I', 1e-7, 'm^4'), h: given('h', 0.3, 'm') };
    const d = apply(PATCH_SAG, env);
    expect(d.status).toBe('outside-validity');
    expect(d.value).toBeNull();
    expect(d.refusal?.domain).toMatch(/slender/);
    expect(d.refusal?.law).toBe(PATCH_SAG.hash);
    expect(apply(PATCH_SAG, { ...env, h: given('h', 0.04, 'm') }).status).toBe('given');
  });

  
  });

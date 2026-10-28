// The law nodes, built from the book (docs/REALITY.md, step 3): every law a node, solved for any of its variables,
// refused in words outside where it holds or extrapolated and marked, its evidence and its tree said beside it.

import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { runBlock } from '../../src/nexus/dataflow';
import { BOOK } from '../../src/nexus/book';

describe('every law of the book is a node', () => {
  it('241 nodes, the old ids kept, each with its kind said', () => {
    for (const l of BOOK) { const b = LIBRARY.get(`law.${l.id}`); expect(b, l.id).toBeDefined(); expect(b!.says, l.id).toMatch(/It is /); }
    expect([...LIBRARY.values()].filter((b) => b.kind === 'law').length).toBe(BOOK.length);
  });
});

describe('solved for any variable', () => {
  it('forward, and backward for an input written in a unit with an offset: the temperature that gives a resistance', async () => {
    const R = (await runBlock('law.copper.tempco', { R0: 0.317, T: 100, T0: 25 })).R as number;
    expect(R).toBeCloseTo(0.41043575, 8);
    const back = await runBlock('law.copper.tempco', { solve: 'T', R0: 0.317, R, T0: 25 });
    // in °C, as its port says, not converted twice
    expect(back.T).toBeCloseTo(100, 6);
    expect(String(back.why)).toMatch(/solved numerically/);
  });
  it('a product of powers is rearranged, not searched: the mass that weighs 98.0665 N', async () => {
    const r = await runBlock('law.weight', { solve: 'm', W: 98.0665, g: 9.80665 });
    expect(r.m).toBeCloseTo(10, 12); expect(String(r.why)).not.toMatch(/numerically/);
  });
  it('where more than one value solves it, it says so, and a range chooses', async () => {
    const r = await runBlock('law.screw.efficiency', { solve: 'l', eta: 0.46324813129085995, d2: 0.014, mu: 0.1, alpha: 0.2617993877991494 });
    expect(String(r.caution)).toMatch(/values of l solve it/);
    const near = await runBlock('law.screw.efficiency', { solve: 'l', from: '0', to: '0.02', eta: 0.46324813129085995, d2: 0.014, mu: 0.1, alpha: 0.2617993877991494 });
    expect(near.l).toBeCloseTo(0.004, 9);
  });
  it('a variable only in where the law holds cannot be solved for, and says why', async () => {
    await expect(runBlock('law.beam.simply-supported.first-period', { solve: 'h', T1: 0.04, L: 2, E: 200e9, I: 1e-7, rho: 7850, A: 0.0008 })).rejects.toThrow(/only in where the law holds/);
  });
});

describe('outside where it holds', () => {
  it('refuses in words by default, extrapolates and marks it when asked', async () => {
    await expect(runBlock('law.radiation', { eps: 1.2, A: 0.1, T: 350, Tinf: 290 })).rejects.toThrow(/does not hold here: it needs an emissivity between 0 and 1/);
    const x = await runBlock('law.radiation', { outside: 'extrapolate', eps: 1.2, A: 0.1, T: 350, Tinf: 290 });
    expect(x.q).toBeGreaterThan(0); expect(x.status).toBe('outside-validity (extrapolated)'); expect(String(x.caution)).toMatch(/not a prediction/);
  });
  it('the evidence of a result is said: a law of inputs set by hand is no stronger than they are (given); its tree names the law', async () => {
    const r = await runBlock('law.ohm', { I: 2, R: 5 });
    expect(r.V).toBe(10); expect(r.status).toBe('given'); expect(String(r.why)).toMatch(/Ohm's law: V = I R/);
  });
});

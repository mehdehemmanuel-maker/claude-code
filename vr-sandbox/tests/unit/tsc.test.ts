// The time / scale / causal-propagation branch (src/ganglia/native/tsc.ts): every result a structure with the evidence
// it cites produced by running the check here; status computed, never written; the substrate holds the structures and
// the arrows that put existing laws under them; a change to a law reaches the records that cite it by hash alone.

import { describe, expect, it } from 'vitest';
import { averagingCheck, branch, cFromEm, chainRedistribution, criticalLengths, deepest, discovery, frontier, morseRegime, propagate, rebuild, recordById, report, rigidDomain, sayFrontier, sizeExponent, statusOf, vectorOf, windowMean } from '../../src/ganglia/native/tsc';
import { lawHash, TERMS } from '../../src/ganglia/native/terms';
import { hash } from '../../src/ganglia/native/core';
import { text, read } from '../../src/ganglia/native/text';
import { lawById, LAWS } from '../../src/ganglia/laws';
import { shapeOf, isDimless } from '../../src/ganglia/native/forms';
import { Substrate } from '../../src/ganglia/substrate/substrate';
import { bridge } from '../../src/ganglia/substrate/bridge';
import { ingest, type Report } from '../../src/ganglia/substrate/population';
import { substrate } from '../../src/ganglia/substrate';
import { TICK } from '../../src/physics/protocol';
import { TICK as WORLD_TICK } from '../../src/physics/world';

const fresh = (): Report => ({ processed: 0, discoveredEntities: 0, discoveredRelations: 0, rejected: [], promotedManifolds: [], generators: [], constructionPaths: 0, unknowns: 0, converged: false, queued: 0, byDomain: {} });

describe('the time/scale/causal-propagation branch', () => {
  it('the observation operator: the mean of a fast periodic component over a window is bounded by A τp / (π τo), and the bound is reached', () => {
    const c = averagingCheck(20.5), whole = averagingCheck(20);
    expect(c.holds).toBe(true);
    expect(c.best).toBeGreaterThan(0.95);
    // a window of whole periods averages the component to nothing: the stable appearance is then exact
    expect(whole.best).toBeLessThan(1e-9);
    // apparently stable: at τp/τo = 1/100 the residual is under 1 % of the amplitude whatever the phase
    expect(windowMean(1, 1, 100, 0.3, 0.2).bound).toBeCloseTo(1 / (100 * Math.PI), 12);
    expect(Math.abs(windowMean(1, 1, 100, 0.3, 0.2).mean)).toBeLessThan(0.01);
  });

  it('a strike into a free chain: the organised share is 1/N exactly by momentum, and a harmonic chain holds half the rest as motion on average', () => {
    const r = chainRedistribution(8);
    expect(r.organised).toBeCloseTo(1 / 8, 9);
    expect(r.energyDrift).toBeLessThan(1e-3);
    expect(r.internalMotionShare).toBeGreaterThan(0.4);
    expect(r.internalMotionShare).toBeLessThan(0.6);
    expect(chainRedistribution(4).organised).toBeCloseTo(0.25, 9);
  });

  it('one transformation, two regimes: a Morse chain stays bound below the bond energy per bond and breaks above it', () => {
    const curve = [0.2, 0.5, 1, 2, 4].map((x) => morseRegime(x));
    console.log(`Morse chain, share of bonds broken by energy per bond over the bond energy: ${curve.map((x) => `${x.ratio}: ${x.dissociated.toFixed(2)}`).join(', ')}`);
    expect(curve[0]!.dissociated).toBe(0);
    for (let i = 1; i < curve.length; i++) expect(curve[i]!.dissociated).toBeGreaterThanOrEqual(curve[i - 1]!.dissociated);
    // the derivation predicts only this much: bound at the bottom, a rising share, an unbound regime at the top; where the boundary sits is the chain's to say (measured 3 October: 0, 0.14, 0.14, 0.43, 0.43)
    expect(curve.at(-1)!.dissociated).toBeGreaterThan(0);
  });

  it('c is not independent of the book: 1/√(μ0 ε0) from two other laws reproduces it, and the new wave-speed law has c as its vacuum example', () => {
    const c = cFromEm();
    expect(c.rel).toBeLessThan(1e-8);
    const law = lawById('wave.speed.electromagnetic')!;
    expect(law.eval(law.example.inputs)).toBeCloseTo(299792458, 0);
    const s = shapeOf(law)!;
    expect(isDimless(s.residual)).toBe(true);
    expect(s.terms.map((x) => x.exp).sort()).toEqual([-0.5, -0.5]);
  });

  it('how a process\'s time follows size, read off the shapes under same-material scaling: the pendulum as √L, diffusion as L², lumped cooling as L, an RC time as size-free', () => {
    expect(sizeExponent(lawById('pendulum.period')!)).toBe(0.5);
    expect(sizeExponent(lawById('diffusion.time')!)).toBe(2);
    expect(sizeExponent(lawById('lumped.time-constant')!)).toBe(1);
    expect(sizeExponent(lawById('rc.time-constant')!)).toBe(0);
    const rec = recordById('tsc.process-time-scaling')!;
    expect(vectorOf(rec).simulated).toBe(2); // Froude and cooling, measured in the engine (scale/observations.ts)
    expect(statusOf(rec)).toBe('SUPPORTED LAW');
  });

  it('the rigid realisation\'s domain: a part longer than one tick of sound is outside it; rubber at 44 cm, steel at 56 m, at the world\'s own tick', () => {
    expect(TICK).toBe(WORLD_TICK);
    const rubber = rigidDomain('rubber.natural', 1.0), steel = rigidDomain('steel.a36', 1.0);
    expect(rubber.cSound).toBeCloseTo(40.2, 0);
    expect(rubber.inside).toBe(false);
    expect(rubber.critical).toBeCloseTo(0.446, 2);
    expect(steel.inside).toBe(true);
    expect(steel.critical).toBeCloseTo(56.1, 0);
    const crit = criticalLengths();
    expect(crit[0]!.critical).toBeLessThan(0.5);
    console.log(`critical lengths at a ${(TICK * 1000).toFixed(1)} ms tick: ${crit.slice(0, 5).map((x) => `${x.id} ${x.critical.toFixed(2)} m`).join(', ')} … ${crit.at(-1)!.id} ${crit.at(-1)!.critical.toFixed(0)} m`);
  });

  it('every record is Nex (prints and reads back to its hash), carries its derivation, and its status is computed from its evidence vector', () => {
    const recs = branch();
    expect(recs.length).toBe(14);
    for (const x of recs) { expect(hash(read(text(x.structure)))).toBe(x.hash); expect(x.says.length).toBeGreaterThan(10); }
    const statuses = Object.fromEntries(recs.map((x) => [x.id, statusOf(x)]));
    console.log(JSON.stringify(statuses));
    expect(statuses['tsc.a1-homogeneity']).toBe('ASSUMPTION');
    expect(statuses['tsc.process-time-scaling']).toBe('SUPPORTED LAW');
    expect(statuses['tsc.coarse-graining']).toBe('CANDIDATE LAW');
    expect(statuses['tsc.sampling-boundary']).toBe('DERIVED');
    expect(statuses['tsc.rigid-domain']).toBe('CANDIDATE LAW');
    expect(statuses['tsc.redistribution']).toBe('CANDIDATE LAW');
    expect(statuses['tsc.c-electromagnetic']).toBe('DERIVED');
    expect(statuses['tsc.propagation-shapes']).toBe('DERIVED');
    expect(statuses['tsc.bond-regime']).toBe('CANDIDATE LAW'); // one simulation outside this world: a candidate, flagged outside, never more until a world reaches it
    expect(statuses['tsc.c-role']).toBe('UNRESOLVED');
    expect(statuses['tsc.time-order']).toBe('HYPOTHESIS');
    expect(statuses['tsc.scale-nature']).toBe('CANDIDATE LAW');
    expect(Object.values(statuses)).not.toContain('CRYSTALLIZED LAW');
    expect(Object.values(statuses)).not.toContain('CONTRADICTED');
    // nothing is promoted by belief: a record with no derivation and no leaf but an assumption is a hypothesis at most
    expect(statusOf({ ...recs[0]!, derivation: { from: [], rule: 'none' }, evidence: [recs[0]!.evidence[0]!], counterexamples: [], world: 'inside' })).toBe('HYPOTHESIS');
    expect(statusOf({ ...recs[0]!, derivation: { from: [], rule: 'none' }, evidence: [], counterexamples: [], world: 'inside' })).toBe('UNRESOLVED');
    expect(statusOf({ ...recs[0]!, derivation: { from: [], rule: 'none' }, evidence: [], counterexamples: [], world: 'outside' })).toBe('OUTSIDE DOMAIN');
    expect(statusOf({ ...recs[3]!, counterexamples: [recs[3]!.evidence[0]!] })).toBe('CONTRADICTED');
  });

  it('the frontier is the records with a legal question left, each with the measurement that would move it; said for the headset', () => {
    const open = frontier();
    expect(open.map((x) => x.id).sort()).toEqual(['tsc.a2-finite-propagation', 'tsc.bond-regime', 'tsc.c-role', 'tsc.coarse-graining', 'tsc.redistribution', 'tsc.rigid-domain', 'tsc.scale-nature', 'tsc.time-order']);
    expect(open.every((x) => x.reopen.length > 0)).toBe(true);
    const said = sayFrontier();
    expect(said).toMatch(/^8 open in the time\/scale branch: /);
    expect(said).toMatch(/the role of c \(UNRESOLVED, outside this world, 3 branches; would move on: nothing in the physics engine propagates at c, no clock in the engine but the tick\)/);
  });

  it('the branch enters the substrate: existing time laws are instances of the scaling result, and what nothing generalises is computed before and after', () => {
    const s = new Substrate();
    bridge(s);
    const before = deepest(s);
    expect(before).toContain('pendulum.period');
    const rep = fresh();
    ingest(s, discovery(), rep);
    expect(rep.rejected.map((x) => `${x.relation.from}-${x.relation.kind}->${x.relation.to}: ${x.why}`)).toEqual([]);
    const after = deepest(s);
    expect(after).not.toContain('pendulum.period');
    expect(after).not.toContain('lumped.time-constant');
    // five time-valued laws under the scaling result, and the electromagnetic wave speed under c's derivation
    expect(before.filter((id) => !after.includes(id)).sort()).toEqual(['diffusion.time', 'lumped.time-constant', 'motor.time-constant', 'pendulum.period', 'rc.time-constant', 'wave.speed.electromagnetic']);
    expect(s.get('tsc.process-time-scaling')?.kinds).toContain('law');
    expect(s.reach('tsc.process-time-scaling', 'generalizes').map((x) => x.id).sort()).toEqual(['diffusion.time', 'lumped.time-constant', 'motor.time-constant', 'pendulum.period', 'rc.time-constant']);
    expect(s.get('tsc.c-role')?.coverage.unknowns.length).toBe(2);
    // and the built substrate the app uses carries it too
    expect(substrate().has('tsc.coarse-graining')).toBe(true);
    console.log(report(before, after));
  });

  it('a corrected law term reaches, by hash alone, the records derived from it; what cites nothing of it is untouched', () => {
    const stale = propagate([lawHash('pendulum.period')!]);
    expect(stale).toContain('tsc.process-time-scaling');
    expect(stale).not.toContain('tsc.coarse-graining');
    // the assumption of finite propagation changed: everything under it is stale, including what stands on those
    const a2 = recordById('tsc.a2-finite-propagation')!;
    const under = propagate([a2.hash]);
    expect(under.sort()).toEqual(['tsc.c-role', 'tsc.rigid-domain']);
    // rebuilt after a change, the branch recomputes: the same number of records, the same statuses
    rebuild();
    expect(branch().length).toBe(14);
    expect(TERMS['pendulum.period']).toBeDefined();
    expect(LAWS.some((l) => l.id === 'sound.speed')).toBe(true);
  });
});

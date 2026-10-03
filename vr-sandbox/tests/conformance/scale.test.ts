// Scale hypotheses tested in the engine itself. The scale layer predicts, from a law's own example, how a quantity
// changes when a thing is built λ times bigger of the same material; the world is then built at both sizes and
// measured. A prediction that the engine does not reproduce would be a finding against one of them, and said.
import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { classify, exponentOfDim, similarityById } from '../../src/ganglia/scale';
import { parseUnit } from '../../src/ganglia/units';
import type { Claim } from '../../src/ganglia/scale';

const G = 9.80665;
const ratio = (a: number, b: number) => a / b;

/** The period of a pendulum of length L with a bob of diameter d, from zero crossings of its swing. */
async function pendulumPeriod(L: number, d: number): Promise<number> {
  const r = await rig({}, false);
  const th = (4 * Math.PI) / 180;
  const pivot = r.part('block', at(0, 3.5, 0), { frozen: true, params: { x: 0.02, y: 0.02, z: 0.02 } });
  const bob = r.part('sphere', at(L * Math.sin(th), 3.5 - L * Math.cos(th), 0), { params: { diameter: d } });
  r.connect('rope', { part: pivot, frame: at(0, 0, 0) }, { part: bob, frame: at(0, 0, 0) }, { grade: 'steel-wire-6x19', diameter: 0.003 });
  const crossings: number[] = [];
  let prev = 1;
  r.run(Math.max(6, 4 * 2 * Math.PI * Math.sqrt(L / G)), (t) => { const x = r.pos(bob)[0]; if (prev > 0 && x <= 0) crossings.push(t); prev = x; });
  r.done();
  return (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1);
}

/**
 * A steel cube of side a hung from a frozen anchor on a coil spring of wire d, coil D, Na active coils and an explicit
 * free length, under gravity g: its sag under its own weight, measured as the settled drop from the unstretched
 * position, and its period from zero crossings of its velocity after a small pull.
 */
async function springPeriod(a: number, d: number, D: number, Na: number, pull: number, g = G): Promise<{ T: number; m: number; k: number; sag: number; decayPerCycle: number; cycles: number }> {
  const L0 = 0.05, top = 2;
  const k = (d ** 4 * 81.7e9) / (8 * D ** 3 * Na);
  const hang = async (zeta: number, offset: number) => {
    const r = await rig({ gravity: [0, -g, 0] }, false);
    const anchor = r.part('block', at(0, top, 0), { frozen: true, params: { x: 0.02, y: 0.02, z: 0.02 } });
    const mass = r.part('block', at(0, top - L0 - offset - a / 2, 0), { material: 'steel.a36', params: { x: a, y: a, z: a } });
    r.connect('spring', { part: anchor, frame: at(0, 0, 0) }, { part: mass, frame: at(0, a / 2, 0) }, { d, D, Na, L0, zeta });
    return { r, mass, m: r.world.bodyMass(mass.id)! };
  };
  const settling = await hang(0.7, 0);
  settling.r.run(4);
  const yEq = settling.r.pos(settling.mass)[1];
  const sag = (top - L0 - a / 2) - yEq;
  settling.r.done();
  // released from `pull` below equilibrium: the period from the upward crossings of equilibrium, the decay from the peaks
  const swing = await hang(0, sag + pull);
  const crossings: number[] = [];
  const peaks: number[] = []; // the highest point of each cycle, a cycle running from one upward crossing to the next
  let prev = -1, peak = 0;
  swing.r.run(Math.max(4, 8 * 2 * Math.PI * Math.sqrt(swing.m / k)), (t) => {
    const y = swing.r.pos(swing.mass)[1] - yEq;
    if (prev < 0 && y >= 0) { if (crossings.length) peaks.push(peak); crossings.push(t); peak = 0; }
    peak = Math.max(peak, y); prev = y;
  });
  swing.r.done();
  // over as many whole cycles as the engine kept the body moving (it falls asleep once slow): the decay per cycle, and how many cycles there were
  const n = peaks.length;
  const decayPerCycle = n >= 2 && peaks[0]! > 0 ? 1 - Math.pow(peaks[n - 1]! / peaks[0]!, 1 / (n - 1)) : NaN;
  return { T: (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1), m: swing.m, k, sag, decayPerCycle, cycles: crossings.length - 1 };
}

describe('scale hypotheses, predicted by the law book and measured in the world', () => {
  it('Froude: a pendulum four times longer with a bob of the same material swings twice as slowly, as the covariant verdict predicts', async () => {
    const lambda = 4;
    const verdict = classify('pendulum.period', similarityById('scale.froude')!, lambda);
    expect(verdict.verdict).toBe('covariant');
    const predicted = verdict.expected / verdict.example; // λ^½ from the output's dimension
    expect(predicted).toBeCloseTo(2, 9);
    const small = await pendulumPeriod(0.5, 0.04), big = await pendulumPeriod(0.5 * lambda, 0.04 * lambda);
    const measured = ratio(big, small);
    expect(Math.abs(measured / predicted - 1)).toBeLessThan(0.02);
    // the same with a clock that is not scaled is the verdict the same-material similarity gives: scale-dependent, by the same √λ
    const same = classify('pendulum.period', similarityById('scale.same-material')!, lambda);
    expect(same.verdict).toBe('scale-dependent');
    expect(same.ratio).toBeCloseTo(measured, 1);
    const observation: Claim = { id: 'observation.froude-pendulum-in-the-engine', status: 'observation', statement: `In the engine a pendulum ${lambda} times longer with a bob ${lambda} times wider swings ${measured.toFixed(3)} times slower; Froude predicts ${predicted}.`, axioms: [], formulation: 'T₂/T₁ measured against λ^½', predictions: [], compatible: ['scale.froude covariance of pendulum.period'], conflicting: [], falsification: ['a measured ratio off λ^½ by more than the solver\'s period error'], unresolved: [], history: [], source: { cite: 'this test, Jolt Physics in the conformance harness', kind: 'maker' } };
    expect(observation.status).toBe('observation');
  }, 180000);

  it('Cauchy: a steel cube twice the side on a coil spring of twice the wire and coil rings at half the frequency, as the covariant verdict predicts; gravity scaled as 1/λ keeps the sag similar, gravity unscaled makes it grow as λ²', async () => {
    const lambda = 2;
    const verdict = classify('natural.frequency', similarityById('scale.cauchy')!, lambda);
    expect(verdict.verdict).toBe('covariant');
    const predicted = verdict.expected / verdict.example; // λ⁻¹ from the output's dimension
    expect(predicted).toBeCloseTo(0.5, 9);
    // the derivation: under Cauchy g must go as 1/λ (the centrifuge, here run the other way); the engine takes any gravity
    const cauchy = similarityById('scale.cauchy')!;
    expect(exponentOfDim(cauchy, parseUnit('m/s^2').dim)).toBe(-1);
    const small = await springPeriod(0.05, 0.0015, 0.015, 12, 0.005), big = await springPeriod(0.05 * lambda, 0.0015 * lambda, 0.015 * lambda, 12, 0.005 * lambda, G / lambda);
    // the same material scaled: mass as λ³, the spring's rate as λ (G d⁴ / 8 D³ Na)
    expect(ratio(big.m, small.m)).toBeCloseTo(8, 1);
    expect(ratio(big.k, small.k)).toBeCloseTo(2, 9);
    const measured = ratio(1 / big.T, 1 / small.T);
    expect(Math.abs(measured / predicted - 1)).toBeLessThan(0.02);
    // with gravity scaled as 1/λ the sag scales with the length, as everything else does
    expect(ratio(big.sag, small.sag)).toBeCloseTo(lambda, 1);
    // with gravity left as it is, the sag goes as λ³/λ = λ²: measured. The frequency still halves (a linear spring does not care where it hangs),
    // but the static deflection does not scale with the structure: that is what the same-material verdict on spring.rate under Froude says
    const unscaled = await springPeriod(0.05 * lambda, 0.0015 * lambda, 0.015 * lambda, 12, 0.005 * lambda);
    expect(ratio(unscaled.sag, small.sag)).toBeCloseTo(lambda * lambda, 0);
    expect(Math.abs(ratio(1 / unscaled.T, 1 / small.T) / predicted - 1)).toBeLessThan(0.02);
    // a finding, recorded and not tuned: the engine's spring with zero damping still loses amplitude every cycle, by about the same
    // fraction at 15 and at 31 steps per period, so it is not the integrator's step but the constraint's own dissipation (see docs/SCALE.md)
    const finding: Claim = { id: 'observation.undamped-spring-decay-in-the-engine', status: 'observation', statement: `An undamped coil spring in the engine loses ${(small.decayPerCycle * 100).toFixed(0)} % of its amplitude per cycle at ${(small.T * 90).toFixed(0)} steps per period (${small.cycles} cycles before it slept) and ${(big.decayPerCycle * 100).toFixed(0)} % at ${(big.T * 90).toFixed(0)} (${big.cycles} cycles).`, axioms: [], formulation: 'peak ratio over three cycles', predictions: [], compatible: [], conflicting: ['an undamped spring conserves its amplitude'], falsification: [], unresolved: ['where the energy goes: the ledger should show it'], history: [], source: { cite: 'this test, Jolt Physics in the conformance harness', kind: 'maker' } };
    expect(Number.isFinite(small.decayPerCycle) && Number.isFinite(big.decayPerCycle), finding.statement).toBe(true);
    expect(finding.conflicting.length).toBe(1);
    expect(small.decayPerCycle, finding.statement).toBeGreaterThan(0); // the finding stands until the ledger says where the energy goes
    console.info(`FINDING ${finding.statement}`);
    // under Froude the same spring would be scale-dependent: its rate is held by the material's modulus, not scaled by its dimension
    expect(classify('spring.rate', similarityById('scale.froude')!, lambda).verdict).toBe('scale-dependent');
    expect(classify('spring.rate', similarityById('scale.cauchy')!, lambda).verdict).toBe('covariant');
  }, 180000);
});

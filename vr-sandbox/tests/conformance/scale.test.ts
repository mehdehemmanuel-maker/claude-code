// Scale hypotheses tested in the engine itself. The scale layer predicts, from a law's own example, how a quantity
// changes when a thing is built λ times bigger of the same material; the world is then built at both sizes and
// measured. A prediction that the engine does not reproduce would be a finding against one of them, and said.
import { describe, expect, it } from 'vitest';
import { at, rig } from './helpers';
import { MAX_SUBSTEPS, SUBSTEP_OMEGA_DT, TICK } from '../../src/physics/world';
import { classify, exponentOfDim, observationById, similarityById } from '../../src/ganglia/scale';
import { parseUnit } from '../../src/ganglia/units';
import type { Claim } from '../../src/ganglia/scale';
import { AMBIENT, thermalOf, warm } from '../../src/engineering/thermal';
import { getMaterial } from '../../src/data/materials';
import { lawById } from '../../src/ganglia/laws';

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
 * A Douglas-fir cube of side a afloat in fresh water: the fraction of its height under the surface once it has settled,
 * and its heave period from a small push down, from the upward crossings of its settled height.
 */
async function floating(a: number): Promise<{ fraction: number; T: number; cycles: number }> {
  const level = 1;
  const fluids = [{ id: 'water', name: 'fresh water', min: [-20, -4, -20] as [number, number, number], max: [20, level, 20] as [number, number, number], density: 998.2 }];
  const settle = async (offset: number) => {
    const r = await rig({ fluids }, false);
    // placed near where it will float (a fir cube rides about half under), offset metres lower for the push
    const block = r.part('block', at(0, level + a / 2 - 0.53 * a - offset, 0), { material: 'wood.douglas-fir', params: { x: a, y: a, z: a } });
    return { r, block };
  };
  const still = await settle(0);
  still.r.run(Math.max(8, 20 * 2 * Math.PI * Math.sqrt(a / G)));
  const yEq = still.r.pos(still.block)[1];
  const fraction = (level - (yEq - a / 2)) / a;
  still.r.done();
  const pushed = await settle(0.1 * a);
  const crossings: number[] = [];
  let prev = -1;
  pushed.r.run(Math.max(6, 10 * 2 * Math.PI * Math.sqrt(a / G)), (t) => { const y = pushed.r.pos(pushed.block)[1] - yEq; if (prev < 0 && y >= 0) crossings.push(t); prev = y; });
  pushed.r.done();
  return { fraction, T: crossings.length >= 2 ? (crossings.at(-1)! - crossings[0]!) / (crossings.length - 1) : NaN, cycles: crossings.length - 1 };
}

/**
 * An EVA foam ball of diameter d let fall from rest through still air (1.204 kg/m³), no floor: its speed once it has
 * stopped gaining, from its last tenth of a second, and what the drag law gives for its terminal speed.
 */
async function terminalSpeed(d: number): Promise<{ v: number; law: number }> {
  const r = await rig({ airDrag: true }, false);
  const ball = r.part('sphere', at(0, 0, 0), { material: 'foam.eva', params: { diameter: d } });
  const m = r.world.bodyMass(ball.id)!;
  const ys: [number, number][] = [];
  r.run(8, (t) => { ys.push([t, r.pos(ball)[1]]); });
  r.done();
  const [t1, y1] = ys[ys.length - 1]!;
  const [t0, y0] = ys.find(([t]) => t >= t1 - 0.1)!;
  const rho = 1.204, Cd = 0.47, A = (Math.PI / 4) * d * d;
  return { v: (y0 - y1) / (t1 - t0), law: Math.sqrt((2 * m * G) / (rho * Cd * A)) };
}

/**
 * A mild-steel cube of side a, 120 K above the room, left to cool in still air by the engine's thermal model (free
 * convection by the laminar air correlation plus radiation, lumped): the time to lose half its excess. And the same
 * cooling integrated from the law book's own laws (convection.natural, radiation), a second way to the same number.
 */
function halfCoolingTime(a: number): { model: number; laws: number } {
  const m = getMaterial('steel.a36'), th = thermalOf(m);
  const mass = m.density * a ** 3, area = 6 * a * a, C = mass * th.c, T0 = AMBIENT + 120, half = AMBIENT + 60;
  const dt = 0.5;
  let T = T0, model = 0;
  while (T > half) { const next = warm(T, 0, mass, th.c, area, a, th.emissivity, dt); if (next <= half) { model += dt * (T - half) / (T - next); T = next; break; } T = next; model += dt; }
  const conv = lawById('convection.natural')!, rad = lawById('radiation')!;
  const coef = conv.constants!['C']!.value, sigma = rad.constants!['sigma']!.value;
  const loss = (temp: number) => conv.eval!({ dT: temp - AMBIENT, L: a, C: coef })! * area * (temp - AMBIENT) + rad.eval!({ eps: th.emissivity, A: area, T: temp + 273.15, Tinf: AMBIENT + 273.15, sigma })!;
  let U = T0, laws = 0;
  const h = 0.05;
  while (U > half) { const k1 = -loss(U) / C, k2 = -loss(U + 0.5 * h * k1) / C, k3 = -loss(U + 0.5 * h * k2) / C, k4 = -loss(U + h * k3) / C; const next = U + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4); if (next <= half) { laws += h * (U - half) / (U - next); break; } U = next; laws += h; }
  return { model, laws };
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
  it('Coulomb: a block four times the side holds at the same ramp angle and slides with the same acceleration, as the law book predicts under Froude similarity', async () => {
    const lambda = 4, mu = 0.45; // birch plywood on birch plywood
    // the law book: under Froude similarity (same material, the same g) the friction force grows as the weight, λ³, so the acceleration, force over mass, does not change
    const v = classify('friction.coulomb', similarityById('scale.froude')!, lambda);
    expect(v.verdict).toBe('covariant');
    const forceRatio = v.expected / v.example;
    expect(forceRatio).toBeCloseTo(lambda ** 3, 6);
    const accelRatio = forceRatio / lambda ** 3;
    expect(accelRatio).toBeCloseTo(1, 9);
    const axisAngle = (axis: [number, number, number], th: number): [number, number, number, number] => { const sn = Math.sin(th / 2); return [axis[0] * sn, axis[1] * sn, axis[2] * sn, Math.cos(th / 2)]; };
    /** The distance a cube of side `size` slides along a plywood ramp at `deg` in the 0.5 s after 0.3 s of settling or sliding. */
    const slide = async (size: number, deg: number) => {
      const r = await rig();
      const th = (deg * Math.PI) / 180, q = axisAngle([0, 0, 1], th);
      r.part('plate', at(0, 1, 0, q), { frozen: true, material: 'wood.birch-plywood', params: { length: 6, width: 2, thickness: 0.04 } });
      const n = [-Math.sin(th), Math.cos(th)], h = 0.02 + size / 2;
      const block = r.part('block', at(n[0]! * h + 0.5 * Math.cos(th), 1 + n[1]! * h + 0.5 * Math.sin(th), 0, q), { material: 'wood.birch-plywood', params: { x: size, y: size, z: size } });
      r.run(0.3);
      const p0 = r.pos(block);
      r.run(0.5);
      const p1 = r.pos(block);
      r.done();
      return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    };
    // below atan(mu) = 24° both hold; above, both slide the same distance in the same time
    expect(await slide(0.1, 18)).toBeLessThan(0.002);
    expect(await slide(0.1 * lambda, 18)).toBeLessThan(0.002);
    const d1 = await slide(0.1, 35), d4 = await slide(0.1 * lambda, 35);
    console.log('OBSERVED observation.coulomb-ramp', d4 / d1);
    const o = observationById('observation.coulomb-ramp')!;
    expect(Math.abs(d4 / d1 - accelRatio)).toBeLessThan(o.tolerance);
    expect(Math.abs(d4 / d1 - o.measured), 'the register records what the engine gives').toBeLessThan(o.tolerance);
    const th = (35 * Math.PI) / 180, a = G * (Math.sin(th) - mu * Math.cos(th));
    expect(Math.abs(d1 / (0.3 * a * 0.5 + 0.5 * a * 0.25) - 1)).toBeLessThan(0.05);
  }, 180000);

  it('Rolling: a cylinder four times the radius rolls down the same ramp with the same acceleration, as the inertia of a disc under Froude similarity predicts', async () => {
    const lambda = 4;
    // the law book: a disc's inertia under Froude similarity grows as λ⁵ (covariant), the mass as λ³ and r² as λ², so I / m r² is the same ½ and so is the acceleration
    const v = classify('inertia.disc', similarityById('scale.froude')!, lambda);
    expect(v.verdict).toBe('covariant');
    expect(v.expected / v.example).toBeCloseTo(lambda ** 5, 6);
    const predicted = v.expected / v.example / (lambda ** 3 * lambda ** 2);
    expect(predicted).toBeCloseTo(1, 9);
    const axisAngle = (axis: [number, number, number], th: number): [number, number, number, number] => { const sn = Math.sin(th / 2); return [axis[0] * sn, axis[1] * sn, axis[2] * sn, Math.cos(th / 2)]; };
    const roll = async (rad: number) => {
      const r = await rig();
      const th = (12 * Math.PI) / 180, q = axisAngle([0, 0, 1], -th);
      r.part('plate', at(0, 1, 0, q), { frozen: true, material: 'rubber.natural', params: { length: 8, width: 2, thickness: 0.05 } });
      const along = [Math.cos(th), -Math.sin(th)], nrm = [Math.sin(th), Math.cos(th)];
      const cyl = r.part('rod.round', at(-2 * along[0]! + nrm[0]! * (0.025 + rad + 0.001), 1 - 2 * along[1]! + nrm[1]! * (0.025 + rad + 0.001), 0, axisAngle([1, 0, 0], Math.PI / 2)), { material: 'rubber.natural', params: { diameter: 2 * rad, length: 4 * rad } });
      r.run(0.2);
      const p0 = r.pos(cyl);
      r.run(0.6);
      const p1 = r.pos(cyl);
      r.done();
      return Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    };
    const s1 = await roll(0.05), s4 = await roll(0.05 * lambda);
    const measured = s4 / s1;
    console.log('OBSERVED observation.rolling-cylinder', measured);
    const o = observationById('observation.rolling-cylinder')!;
    expect(Math.abs(measured - predicted)).toBeLessThan(o.tolerance);
    expect(Math.abs(measured - o.measured), 'the register records what the engine gives').toBeLessThan(o.tolerance);
    const th = (12 * Math.PI) / 180, a = (2 / 3) * G * Math.sin(th);
    expect(Math.abs(s1 / (0.2 * a * 0.6 + 0.5 * a * 0.36) - 1)).toBeLessThan(0.05);
  }, 180000);

  it('Restitution: a rubber ball four times the diameter dropped from four times the height bounces four times as high, and from the same height as high, as Froude similarity predicts with the restitution held', async () => {
    const lambda = 4;
    // the law book: potential energy under Froude similarity is covariant (λ⁴: mass λ³, height λ); the bounce keeps the fraction e² of the drop height, e a
    // property of the materials that every engineering similarity holds, so the apex scales with the drop height: λ for λ times the height, 1 for the same height
    const v = classify('energy.potential', similarityById('scale.froude')!, lambda);
    expect(v.verdict).toBe('covariant');
    expect(v.expected / v.example).toBeCloseTo(lambda ** 4, 6);
    /** The apex of the first bounce of a rubber sphere of diameter d dropped from a height h (of its underside) onto the floor. */
    const bounce = async (d: number, h: number) => {
      const r = await rig();
      const ball = r.part('sphere', at(0, h + d / 2, 0), { material: 'rubber.natural', params: { diameter: d } });
      let prev = Infinity, state: 'fall' | 'rise' | 'done' = 'fall', apex = 0;
      r.run(2 * Math.sqrt((2 * h) / G) + 1, () => {
        const y = r.pos(ball)[1] - d / 2;
        if (state === 'fall' && y > prev + 1e-6) state = 'rise';
        if (state === 'rise') { apex = Math.max(apex, y); if (y < prev - 1e-6) state = 'done'; }
        prev = y;
      });
      r.done();
      expect(state, `the ball of ${d} m bounced and came down again`).toBe('done');
      return apex;
    };
    const small = await bounce(0.05, 0.5), big = await bounce(0.05 * lambda, 0.5 * lambda), same = await bounce(0.05 * lambda, 0.5);
    console.log('OBSERVED observation.restitution-froude', big / small, 'same-height', same / small, 'fraction', small / 0.5);
    const o = observationById('observation.restitution-froude')!;
    expect(Math.abs(big / small / lambda - 1)).toBeLessThan(o.tolerance);
    expect(Math.abs(same / small - 1)).toBeLessThan(o.tolerance);
    expect(Math.abs(big / small / o.measured - 1), 'the register records what the engine gives').toBeLessThan(o.tolerance);
  }, 240000);

  it('Froude: a pendulum four times longer with a bob of the same material swings twice as slowly, as the covariant verdict predicts', async () => {
    const lambda = 4;
    const verdict = classify('pendulum.period', similarityById('scale.froude')!, lambda);
    expect(verdict.verdict).toBe('covariant');
    const predicted = verdict.expected / verdict.example; // λ^½ from the output's dimension
    expect(predicted).toBeCloseTo(2, 9);
    const small = await pendulumPeriod(0.5, 0.04), big = await pendulumPeriod(0.5 * lambda, 0.04 * lambda);
    const measured = ratio(big, small);
    console.log('OBSERVED observation.froude-pendulum', measured);
    expect(Math.abs(measured / predicted - 1)).toBeLessThan(0.02);
    expect(Math.abs(measured / observationById('observation.froude-pendulum')!.measured - 1), 'the register records what the engine gives').toBeLessThan(0.02);
    // the same with a clock that is not scaled is the verdict the same-material similarity gives: scale-dependent, by the same √λ
    const same = classify('pendulum.period', similarityById('scale.same-material')!, lambda);
    expect(same.verdict).toBe('scale-dependent');
    expect(same.ratio).toBeCloseTo(measured, 1);
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
    console.log('OBSERVED observation.cauchy-spring', measured);
    expect(Math.abs(measured / predicted - 1)).toBeLessThan(0.02);
    expect(Math.abs(measured / observationById('observation.cauchy-spring')!.measured - 1), 'the register records what the engine gives').toBeLessThan(0.02);
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
    // the engine states its model of this loss: implicit integration damps a spring by zeta_num = omega dt_sub / 2, with dt_sub set by the
    // stiffness-regime rule; the measured decay is that model's prediction, 1 − exp(−2π zeta_num), at both sizes (N-5)
    const zetaNum = (m: number, k: number) => { const omega = Math.sqrt(k / m); const sub = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil((omega * TICK) / SUBSTEP_OMEGA_DT))); return (omega * TICK) / sub / 2; };
    for (const x of [small, big]) {
      const predictedDecay = 1 - Math.exp(-2 * Math.PI * zetaNum(x.m, x.k));
      expect(Math.abs(x.decayPerCycle / predictedDecay - 1), `${finding.statement}; model predicts ${(predictedDecay * 100).toFixed(1)} %`).toBeLessThan(0.1);
    }
    console.info(`FINDING ${finding.statement}`);
    // under Froude the same spring would be scale-dependent: its rate is held by the material's modulus, not scaled by its dimension
    expect(classify('spring.rate', similarityById('scale.froude')!, lambda).verdict).toBe('scale-dependent');
    expect(classify('spring.rate', similarityById('scale.cauchy')!, lambda).verdict).toBe('covariant');
  }, 180000);

  it('Archimedes: a fir cube twice the side floats with the same fraction of its height under water, and heaves √2 slower, as Froude similarity predicts', async () => {
    const lambda = 2;
    const froude = similarityById('scale.froude')!;
    // the law book: buoyancy and weight both go as λ³ under Froude, so the fraction submerged, their quotient, goes as λ⁰
    const lift = classify('buoyancy', froude, lambda), weight = classify('weight', froude, lambda);
    expect(lift.verdict).toBe('covariant');
    expect(weight.verdict).toBe('covariant');
    expect(lift.expected / lift.example).toBeCloseTo(lambda ** 3, 9);
    expect(weight.expected / weight.example).toBeCloseTo(lambda ** 3, 9);
    const predictedFraction = (lift.expected / lift.example) / (weight.expected / weight.example);
    expect(predictedFraction).toBeCloseTo(1, 9);
    // time goes as λ^½ under Froude, so a heave period does
    const predictedHeave = lambda ** exponentOfDim(froude, parseUnit('s').dim);
    expect(predictedHeave).toBeCloseTo(Math.SQRT2, 9);
    const small = await floating(0.2), big = await floating(0.2 * lambda);
    // the fraction itself is the density ratio, fir over water: 530 / 998.2
    expect(Math.abs(small.fraction / (530 / 998.2) - 1), 'a fir cube rides with 53 % of its height under').toBeLessThan(0.03);
    const measuredFraction = ratio(big.fraction, small.fraction);
    console.log('OBSERVED observation.archimedes-fraction', measuredFraction, small.fraction, big.fraction);
    expect(Math.abs(measuredFraction / predictedFraction - 1)).toBeLessThan(0.02);
    expect(Math.abs(measuredFraction / observationById('observation.archimedes-fraction')!.measured - 1), 'the register records what the engine gives').toBeLessThan(0.02);
    expect(small.cycles).toBeGreaterThanOrEqual(2);
    expect(big.cycles).toBeGreaterThanOrEqual(2);
    const measuredHeave = ratio(big.T, small.T);
    console.log('OBSERVED observation.archimedes-heave', measuredHeave, small.T, big.T, small.cycles, big.cycles);
    expect(Math.abs(measuredHeave / predictedHeave - 1)).toBeLessThan(0.02);
    expect(Math.abs(measuredHeave / observationById('observation.archimedes-heave')!.measured - 1), 'the register records what the engine gives').toBeLessThan(0.02);
    // the periods themselves: a floating block is a spring whose rate is the water-plane area times ρ g, T = 2π √(ρ_wood a / ρ_water g); the engine's water brings no added mass
    for (const [x, a] of [[small, 0.2], [big, 0.4]] as const) expect(Math.abs(x.T / (2 * Math.PI * Math.sqrt((530 / 998.2) * a / G)) - 1), 'the heave period is what Archimedes and Newton give').toBeLessThan(0.02);
  }, 180000);

  it('Drag: a foam ball twice the diameter falls √2 faster once the air holds it, as Froude similarity predicts, and each at the speed the drag law gives', async () => {
    const lambda = 2;
    const froude = similarityById('scale.froude')!;
    // the law book: drag and weight both go as λ³ under Froude (a force), so the speed at which they balance goes as λ^½
    const drag = classify('drag.aero', froude, lambda), weight = classify('weight', froude, lambda);
    expect(drag.verdict).toBe('covariant');
    expect(drag.expected / drag.example).toBeCloseTo(lambda ** 3, 9);
    expect(weight.expected / weight.example).toBeCloseTo(lambda ** 3, 9);
    const predicted = lambda ** exponentOfDim(froude, parseUnit('m/s').dim);
    expect(predicted).toBeCloseTo(Math.SQRT2, 9);
    const small = await terminalSpeed(0.1), big = await terminalSpeed(0.2);
    const measured = ratio(big.v, small.v);
    console.log('OBSERVED observation.drag-terminal', measured, small.v, small.law, big.v, big.law);
    expect(Math.abs(measured / predicted - 1)).toBeLessThan(0.02);
    expect(Math.abs(measured / observationById('observation.drag-terminal')!.measured - 1), 'the register records what the engine gives').toBeLessThan(0.02);
    // the speeds themselves: v = √(2 m g / ρ C_d A) with the ball's frontal area π d² / 4, not its box
    for (const x of [small, big]) expect(Math.abs(x.v / x.law - 1), 'the terminal speed is what the drag law gives').toBeLessThan(0.02);
  }, 180000);

  it('Cooling: a steel cube twice the side cools more than twice as slowly, between what h held and laminar free convection give; the thermal world is not Froude-similar', () => {
    const lambda = 2;
    const froude = similarityById('scale.froude')!;
    // the law book: a lumped time constant m c / h A goes as λ with h held, not as λ^½ as Froude needs, so it is scale-dependent, by λ
    const lumped = classify('lumped.time-constant', froude, lambda);
    expect(lumped.verdict).toBe('scale-dependent');
    expect(lumped.got / lumped.example).toBeCloseTo(lambda, 6); // what the law gives: m c / h A goes as λ³ / λ²
    expect(lumped.ratio).toBeCloseTo(Math.SQRT2, 6); // off Froude's λ^½ by √2
    // and the engine's h is not held: free convection sheds less per area from a bigger thing (h ∝ L^-¼), so a purely convective time goes as λ^1.25; radiation's share, size-free, pulls it back toward λ
    const convective = lambda ** 1.25;
    const small = halfCoolingTime(0.1), big = halfCoolingTime(0.2);
    const measured = ratio(big.model, small.model), fromLaws = ratio(big.laws, small.laws);
    console.log('OBSERVED observation.cooling-size', measured, fromLaws, small.model, big.model, small.laws, big.laws);
    expect(measured).toBeGreaterThan(lambda);
    expect(measured).toBeLessThan(convective);
    // the engine's model and the law book integrated agree: two ways to one number
    expect(Math.abs(measured / fromLaws - 1)).toBeLessThan(0.01);
    for (const [x] of [[small], [big]] as const) expect(Math.abs(x.model / x.laws - 1)).toBeLessThan(0.01);
    expect(Math.abs(measured / observationById('observation.cooling-size')!.measured - 1), 'the register records what the engine gives').toBeLessThan(0.01);
    expect(Math.abs(fromLaws / observationById('observation.cooling-size')!.predicted - 1), 'the register records what the law book predicts').toBeLessThan(0.01);
  });
});

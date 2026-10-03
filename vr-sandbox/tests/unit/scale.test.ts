// Scale relativity: scale is a transformation, every verdict is derived from the law book and the dimensions, an
// observation is a projection, a status never changes silently, and the hypothesis of structural equivalence across
// scale is held as a hypothesis with what agrees and what conflicts.
import { describe, expect, it } from 'vitest';
import { LAWS, lawById } from '../../src/ganglia/laws';
import { TICK } from '../../src/physics/world';
import { parseUnit } from '../../src/ganglia/units';
import {
  SIMILARITIES, similarityById, exponentOf, exponentOfDim, scaleSystem, absoluteScale, planckUnits, GROUPS, groupById, groupUnder, classify, covarianceTable, scaleSetters,
  OBSERVERS, observerById, project, projections, MECHANISMS, mechanismById, propagation, CROSS_SCALES, askOf, universalScaleStructuralEquivalence, promote, StatusRefused, findScaleAnalogues, findPattern, scaleManifold, manifoldScaleTable,
} from '../../src/ganglia/scale';
import { build } from '../../src/ganglia/substrate';
import { interpret } from '../../src/assistant/intent';
import { answerScale } from '../../src/assistant/scaleTalk';

const froude = similarityById('scale.froude')!, same = similarityById('scale.same-material')!, reynolds = similarityById('scale.reynolds')!, cauchy = similarityById('scale.cauchy')!;
const EPISTEMIC = ['axiom', 'theorem', 'derivation', 'empirical-law', 'observation', 'model', 'hypothesis', 'conjecture'];

describe('scale is a transformation, not a category', () => {
  it('a quantity scales by its dimension, and what the regime holds fixed does not', () => {
    expect(exponentOf(froude, { unit: 'm' })).toBe(1);
    expect(exponentOf(froude, { unit: 'kg' })).toBe(3);
    expect(exponentOf(froude, { unit: 'm/s' })).toBe(0.5);
    expect(exponentOf(froude, { unit: 'N' })).toBe(3);
    expect(exponentOf(froude, { unit: 'Pa', name: 'stress' })).toBe(1);
    expect(exponentOf(froude, { unit: 'Hz' })).toBe(-0.5);
    expect(exponentOf(froude, { unit: 'kg/m^3', name: 'density' })).toBe(0); // the same material
    expect(exponentOf(froude, { unit: 'm/s^2', name: 'gravity' })).toBe(0); // the same planet
    expect(exponentOf(froude, { unit: 'Pa s', name: 'dynamic viscosity' })).toBe(0); // held, although its dimension says λ^1.5
    expect(exponentOf({ ...froude, holds: [] }, { unit: 'Pa s', name: 'dynamic viscosity' })).toBe(1.5);
    const sys = scaleSystem(froude, [{ sym: 'L', name: 'length', unit: 'm', value: 2 }, { sym: 'rho', name: 'density', unit: 'kg/m^3', value: 7870 }, { sym: 'v', name: 'speed', unit: 'm/s', value: 3 }], 100);
    expect(sys.map((q) => [q.exponent, q.scaled, q.held])).toEqual([[1, 200, false], [0, 7870, true], [0.5, 30, false]]);
  });

  it('each similarity\'s exponents follow from what it holds: gravity consistent under Froude, sound under Cauchy, diffusivity under Reynolds', () => {
    const g = parseUnit('m/s^2').dim, c = parseUnit('m/s').dim, nu = parseUnit('m^2/s').dim, rho = parseUnit('kg/m^3').dim;
    expect(exponentOfDim(froude, g)).toBe(0);
    expect(exponentOfDim(cauchy, c)).toBe(0);
    expect(exponentOfDim(reynolds, nu)).toBe(0);
    expect(exponentOfDim(same, g)).toBe(1); // gravity would have to scale: it does not, so same-material-same-clock breaks gravity laws
    for (const t of SIMILARITIES) {
      expect(t.derivation.length, t.id).toBeGreaterThan(20);
      expect(EPISTEMIC, t.id).toContain(t.status);
      if (t.holds.includes('material')) expect(exponentOfDim(t, rho), `${t.id}: the same material has the same density`).toBe(0);
    }
    expect(SIMILARITIES.find((t) => t.id === 'scale.allometric')!.status).toBe('empirical-law'); // Kleiber is measured, not proved
  });

  it('three independent constants admit no scaling but the identity: the Planck scale, derived', () => {
    const c = { sym: 'c', unit: 'm/s', value: 299792458 }, hbar = { sym: 'hbar', unit: 'J s', value: 1.054571817e-34 }, G = { sym: 'G', unit: 'm^3/kg s^2', value: 6.6743e-11 };
    const all = absoluteScale([c, hbar, G]);
    expect(all.family).toBeNull();
    expect(all.independent).toBe(3);
    const two = absoluteScale([c, hbar]);
    expect(two.family).toEqual([-1, 1, 1, 0, 0]);
    expect(absoluteScale([]).family).toEqual([0, 1, 0, 0, 0]);
    const p = planckUnits();
    expect(p.length / 1.616e-35).toBeCloseTo(1, 2);
    expect(p.time / 5.391e-44).toBeCloseTo(1, 2);
    expect(p.mass / 2.176e-8).toBeCloseTo(1, 2);
  });
});

describe('dimensionless groups', () => {
  it('every group is dimensionless, and invariant under the transformation it was derived for', () => {
    for (const g of GROUPS) {
      const dim = g.factors.reduce((d, f) => d.map((x, i) => x + f.power * parseUnit(f.unit).dim[i]!), [0, 0, 0, 0, 0]);
      expect(dim.every((x) => Math.abs(x) < 1e-9), `${g.id} is not dimensionless: ${dim}`).toBe(true);
    }
    for (const t of SIMILARITIES) for (const id of t.preserves) expect(groupUnder(groupById(id)!, t).invariant, `${t.id} was derived to preserve ${id}`).toBe(true);
  });

  it('Reynolds breaks under Froude with the same fluid, and Froude under Reynolds: no transform keeps both', () => {
    const re = groupUnder(groupById('Re')!, froude);
    expect(re.invariant).toBe(false);
    expect(re.exponent).toBeCloseTo(1.5, 9);
    expect(re.says).toMatch(/held fixed/);
    const fr = groupUnder(groupById('Fr')!, reynolds);
    expect(fr.invariant).toBe(false);
    expect(fr.exponent).toBeCloseTo(-3, 9);
    expect(groupUnder(groupById('He')!, cauchy).invariant).toBe(true);
    expect(groupUnder(groupById('Bo')!, froude).invariant).toBe(false); // surface tension held: the capillary length does not scale
  });
});

describe('derived similarities for heat and electromagnetism', () => {
  it('a thermal similarity with temperature scaled as 1/λ² keeps every conduction and storage law and loses radiation', () => {
    const th = similarityById('scale.thermal')!;
    expect(exponentOfDim(th, parseUnit('W/m K').dim)).toBe(0); // conductivity consistent
    expect(exponentOfDim(th, parseUnit('J/kg K').dim)).toBe(0); // specific heat consistent
    expect(exponentOfDim(th, parseUnit('m^2/s').dim)).toBe(0); // diffusivity consistent
    for (const id of ['conduction', 'heat.capacity', 'thermal.resistance.conduction', 'diffusion.time']) expect(classify(id, th).verdict, id).toMatch(/covariant|invariant/);
    expect(classify('lumped.time-constant', th).held.map((h) => h.sym)).toContain('h'); // a surface coefficient held by the environment: the lumped time constant does not follow
    expect(classify('radiation', th).verdict).toBe('scale-dependent');
    expect(classify('radiation', th).setsScale.map((c) => c.sym)).toEqual(['sigma']);
    for (const id of th.preserves) expect(groupUnder(groupById(id)!, th).invariant, id).toBe(true);
  });

  it('the diffusive similarity is also the electromagnetic one: μ₀ and resistivity held, current unscaled, L/R as λ²', () => {
    const r = similarityById('scale.reynolds')!;
    expect(exponentOfDim(r, parseUnit('N/A^2').dim)).toBe(0); // μ₀ consistent
    expect(exponentOfDim(r, parseUnit('ohm m').dim)).toBe(0); // resistivity consistent
    expect(exponentOfDim(r, parseUnit('ohm').dim)).toBe(-1); // R ∝ 1/λ
    expect(exponentOfDim(r, parseUnit('A').dim)).toBe(0);
    expect(groupUnder(groupById('Rm')!, r).invariant).toBe(true);
    expect(classify('wire.resistance', r).verdict).toMatch(/covariant|invariant/);
    expect(classify('skin.depth', r).verdict).toMatch(/covariant|invariant/);
  });
});

describe('covariance of the law book, derived from each law\'s own example', () => {
  it('every executable law is classified under every similarity, with the transformation that explains it', () => {
    const table = covarianceTable(10);
    expect(table.length).toBe(SIMILARITIES.length);
    for (const { transform, tally, rows } of table) {
      expect(Object.values(tally).reduce((a, b) => a + b, 0), transform.id).toBe(LAWS.length);
      expect(tally.unknown, `${transform.id}: ${rows.filter((r) => r.verdict === 'unknown').map((r) => `${r.law}: ${r.why}`).join(' | ')}`).toBe(0);
      for (const r of rows) { expect(r.why.length, r.law).toBeGreaterThan(10); expect(Number.isFinite(r.ratio) || r.verdict === 'unknown', r.law).toBe(true); }
    }
  });

  it('laws without dimensional constants are covariant; the constant inside sets the scale where they are not', () => {
    expect(classify('spring.energy', froude).verdict).toBe('covariant');
    expect(classify('stress.axial', froude).verdict).toBe('covariant');
    expect(classify('natural.frequency', froude).verdict).toBe('covariant');
    expect(classify('weight', froude).verdict).toBe('covariant'); // g is consistent under Froude
    const w = classify('weight', same);
    expect(w.verdict).toBe('scale-dependent');
    expect(w.held.map((c) => c.sym)).toEqual(['g']); // gravity is an input of the same planet, held while its dimension says λ
    expect(w.why).toMatch(/held fixed by the regime/);
    const pot = classify('energy.potential', same);
    expect(pot.verdict).toBe('scale-dependent');
    expect(pot.setsScale.map((c) => c.sym)).toEqual(['g']); // here g is a constant inside the law: it sets the scale
    expect(pot.why).toMatch(/sets a scale/);
    const pend = classify('pendulum.period', same);
    expect(pend.verdict).toBe('scale-dependent');
    expect(pend.ratio).toBeCloseTo(Math.sqrt(10), 9); // the period grows as √L though the clock was not scaled: Galileo
    expect(classify('pendulum.period', froude).verdict).toBe('covariant');
    expect(classify('radiation', froude).verdict).toBe('scale-dependent'); // σ sets a scale unless temperature scales
    expect(classify('landauer', froude).setsScale.map((c) => c.sym)).toContain('k');
    expect(classify('reynolds', reynolds).verdict).toBe('invariant');
    expect(classify('reynolds', froude).verdict).toBe('scale-dependent');
  });

  it('the square-cube law is a derived verdict: with the same material and clock, weight outgrows strength', () => {
    const w = classify('weight', same, 10);
    expect(w.got / w.example).toBeCloseTo(1000, 6); // weight ×λ³
    expect(w.expected / w.example).toBeCloseTo(10000, 6); // what the force's dimension would give with an unscaled clock
    const s = classify('stress.axial', froude, 10);
    expect(s.verdict).toBe('covariant');
    expect(s.got / s.example).toBeCloseTo(10, 6); // stress ×λ: a thing ten times bigger is ten times nearer its strength
  });

  it('the flywheel\'s specific energy is invariant under every same-material similarity: energy per kilogram does not know the size', () => {
    for (const t of SIMILARITIES.filter((t) => t.holds.includes('material'))) {
      const c = classify('flywheel.specific-energy', t, 10);
      expect(c.verdict, t.id).toBe('invariant');
      expect(c.got).toBeCloseTo(c.example, 6);
      // density is consistent with the transform (mass ∝ λ³ was derived from it); the allowable stress is held where its dimension would move it
      for (const h of c.held) expect(['sigma', 'rho']).toContain(h.sym);
      expect(c.why).toMatch(/size does not enter/);
    }
  });

  it('the constants that set scales are listed from the law book, with their dimensions and the laws that carry them', () => {
    const setters = scaleSetters();
    const g = setters.find((s) => s.sym === 'g')!;
    expect(g.laws).toEqual(expect.arrayContaining(['energy.potential', 'pendulum.period', 'buoyancy']));
    expect(setters.map((s) => s.sym)).toEqual(expect.arrayContaining(['g', 'k', 'c', 'G', 'mu0', 'eps0']));
    for (const s of setters) expect(parseUnit(s.unit).dim.some((d) => d !== 0), s.sym).toBe(true);
  });
});

describe('observation is a projection of reality through an observer', () => {
  const wingbeat = { name: 'a fly\'s wingbeat', length: 3e-3, time: 5e-3, frequency: 200 };
  it('the same process is instantaneous to one observer and extended to another: the difference is in them, not in it', () => {
    expect(project(wingbeat, observerById('observer.human')!).temporal).toBe('instantaneous');
    expect(project(wingbeat, observerById('observer.bat')!).temporal).toBe('resolved');
    expect(project(wingbeat, observerById('observer.fly')!).temporal).toBe('resolved');
    expect(project(wingbeat, observerById('observer.physics-step')!).temporal).toBe('aliased'); // a sampler at 90 Hz sees a false slow beat of a 200 Hz wing
    expect(project(wingbeat, observerById('observer.human')!).says).toMatch(/fused/); // an integrator blurs it
    expect(project(wingbeat, observerById('observer.human')!).spatial).toBe('resolved');
    expect(project(wingbeat, observerById('observer.fly')!).spatial).toBe('invisible');
    const all = projections(wingbeat);
    expect(all.length).toBe(OBSERVERS.length);
    expect(new Set(all.map((p) => p.temporal)).size).toBeGreaterThan(1);
    // scaled a hundred times up under Froude (a bird-sized flapper beats ten times slower): a person resolves it
    const big = project(wingbeat, observerById('observer.human')!, { transform: froude, lambda: 100 });
    expect(big.process.time).toBeCloseTo(5e-2, 9);
    expect(big.temporal).toBe('resolved');
  });

  it('the physics step cannot see an elastic wave in a short rod: that is why the rod is rigid, and it stops being so when the rod is long', () => {
    const steel = mechanismById('carry.sound-steel')!;
    const short = propagation(1, steel, TICK, TICK);
    expect(short.propagationTime).toBeCloseTo(1 / 5960, 9);
    expect(short.regime).toBe('lumped');
    expect(short.ratios.propagationOverResponse).toBeLessThan(0.1);
    const long = propagation(100, steel, TICK, TICK);
    expect(long.regime).toBe('distributed');
    expect(long.causal).toBe(true);
    expect(long.says).toMatch(/distributed/);
  });

  it('nothing carries information faster than light, except inside a model marked hypothetical', () => {
    const warp = { id: 'carry.warp', name: 'a warp signal', speed: 1e9, medium: 'nothing known', source: { cite: 'none', kind: 'rule of thumb' as const } };
    expect(() => propagation(1, warp, 1, 1)).toThrow(/exceeds the speed of light/);
    const h = propagation(1, warp, 1, 1, { hypothetical: true });
    expect(h.causal).toBe(false);
    expect(h.says).toMatch(/HYPOTHETICAL/);
    for (const m of MECHANISMS) if (m.speed) expect(m.speed).toBeLessThanOrEqual(299792458);
  });

  it('a smaller thing is faster because its distances are shorter: diffusion crosses a cell in a moment and a body never', () => {
    const water = mechanismById('carry.diffusion-water')!;
    const cell = propagation(1e-5, water, 1, 1), body = propagation(1e-1, water, 1, 1);
    expect(body.propagationTime / cell.propagationTime).toBeCloseTo(1e8, 3); // x² : four decades of length, eight of time
    expect(cell.propagationTime).toBeCloseTo(0.05, 9);
    expect(body.propagationTime).toBeGreaterThan(3600); // a body needs a heart (Péclet)
  });
});

describe('cross-scale dynamics are first-class middle structures', () => {
  it('heat is a state, a gradient, a transport and an interaction at each scale, with what disappears and appears said', () => {
    const heat = CROSS_SCALES.find((c) => c.id === 'cross.heat')!;
    const micro = askOf(heat, 'micro');
    expect(micro.appearsGoingUp).toContain('temperature');
    expect(micro.disappearsGoingUp.join(' ')).toMatch(/one molecule/);
    expect(micro.carriesUp).toEqual(expect.arrayContaining(['energy', 'information', 'causality']));
    expect(micro.transformation.length).toBeGreaterThan(2);
    expect(askOf(heat, 'macro').transformation).toEqual([]);
    expect(heat.invariant).toContain('energy');
    expect(heat.levels.map((l) => l.characteristicLength)).toEqual([...heat.levels.map((l) => l.characteristicLength)].sort((a, b) => a - b));
    const s = build().substrate;
    for (const c of CROSS_SCALES) for (const st of c.up) if (st.law) expect(lawById(st.law) ?? s.get(st.law)?.kinds.includes('law'), `${c.id}: ${st.law} is not a law`).toBeTruthy();
  });

  it('the reverse path exists: a macro constraint selects microconfigurations and is realised through micro dynamics', () => {
    for (const c of CROSS_SCALES) {
      expect(c.down.map((s) => s.via)).toEqual(expect.arrayContaining(['constraint', 'realisation']));
      expect(c.up.map((s) => s.via)).toEqual(expect.arrayContaining(['interaction', 'collective', 'emergent-variable']));
      expect(c.breaks.length).toBeGreaterThan(1);
      expect(EPISTEMIC).toContain(c.status);
    }
  });
});

describe('the hypothesis of universal scale structural equivalence', () => {
  it('is a hypothesis with axioms, a formulation, predictions, what agrees, what conflicts and what would falsify it; the conflicts are derived', () => {
    const h = universalScaleStructuralEquivalence(10);
    expect(h.status).toBe('hypothesis');
    expect(h.axioms.length).toBeGreaterThanOrEqual(4);
    expect(h.formulation).toMatch(/LAW\(S_λ X\) = 0/);
    expect(h.predictions.length).toBeGreaterThanOrEqual(3);
    expect(h.conflicting[0]).toMatch(/Planck length 1\.6\de-35 m/);
    expect(h.derived.absolute.family).toBeNull();
    expect(h.derived.scaleDependentLaws).toBeGreaterThan(0);
    expect(h.derived.covariantLaws).toBeGreaterThan(h.derived.scaleDependentLaws);
    expect(h.compatible[0]).toMatch(new RegExp(`${h.derived.covariantLaws} of ${LAWS.length} executable laws`));
    expect(h.falsification.some((f) => /already observed/.test(f))).toBe(true);
    expect(h.unresolved.length).toBeGreaterThan(2);
  });

  it('a status never changes silently', () => {
    const h = universalScaleStructuralEquivalence(10);
    expect(() => promote(h, 'theorem', '')).toThrow(StatusRefused);
    expect(() => promote(h, 'axiom', 'because it is obvious to me')).toThrow(/nothing becomes an axiom/);
    expect(() => promote(h, 'observation', 'I looked')).toThrow(/does not become/);
    const m = promote(h, 'model', 'held within regimes bounded by c, ħ, G, e and m_e: engineering similarity (Buckingham 1914)', '2026-10-03');
    expect(m.status).toBe('model');
    expect(m.history).toEqual([{ from: 'hypothesis', to: 'model', evidence: 'held within regimes bounded by c, ħ, G, e and m_e: engineering similarity (Buckingham 1914)', at: '2026-10-03' }]);
    expect(h.status).toBe('hypothesis'); // the original is untouched
    expect(() => promote(m, 'model', 'again')).toThrow(/already is/);
  });
});

describe('self-similarity across decades, in the substrate', () => {
  const s = build().substrate;
  it('the substrate carries scale as an axis: transformations, observers, groups and the hypothesis are entities; laws link to what they are invariant under', () => {
    expect(s.get('scale.froude')!.kinds).toEqual(expect.arrayContaining(['scale', 'transformation']));
    expect(s.get('scale.froude')!.says).toMatch(/Status: theorem/);
    expect(s.reach('spring.energy', 'invariant-under').map((e) => e.id)).toEqual(expect.arrayContaining(['scale.froude', 'scale.cauchy', 'scale.reynolds']));
    expect(s.reach('weight', 'invariant-under').map((e) => e.id)).not.toContain('scale.same-material');
    const re = s.reach('group.Re', 'invariant-under').map((e) => e.id);
    expect(re).toContain('scale.reynolds');
    expect(re).toContain('scale.geometric'); // with nothing held, every dimensionless group is invariant: Buckingham
    expect(re).not.toContain('scale.froude');
    expect(s.reach('cross.heat.micro', 'coarse-grains-to').map((e) => e.id)).toEqual(['cross.heat.meso']);
    expect(s.reach('cross.heat.meso', 'refines-to').map((e) => e.id)).toEqual(['cross.heat.micro']);
    expect(s.get('observer.fly')!.kinds).toContain('observer');
    expect(s.reach('cross.rigid-body.macro', 'observed-by').map((e) => e.id)).toContain('observer.physics-step');
    const h = s.get('hypothesis.universal-scale-structural-equivalence')!;
    expect(h.kinds).toEqual(['hypothesis']);
    expect(h.coverage.unknowns.length).toBeGreaterThan(2);
    expect(s.get('bio.cell')!.params?.find((p) => p.sym === 'L_c')?.low).toBe(1e-5);
    expect(s.dangling()).toEqual([]);
  });

  it('a rotary motor at ten nanometres and a turbine at ten metres share their structure, found by it, nine decades apart', () => {
    const r = findScaleAnalogues(s, 'bio.atp-synthase', { minDecades: 3 })!;
    expect(r.length).toBe(1e-8);
    const ids = r.analogues.map((a) => a.entity.id);
    expect(ids.some((id) => ['motor.electric', 'turbine', 'servo', 'bio.bacterial-flagellar-motor'].includes(id))).toBe(true);
    for (const a of r.analogues) { expect(a.decades).toBeGreaterThanOrEqual(3); expect(a.similarity).toBeGreaterThan(0.2); expect(a.why).toMatch(/decades/); }
    expect(r.unplaced).toBeGreaterThan(100); // most things carry no characteristic length yet: said, not hidden
  });

  it('a feedback loop recurs from a body to a planet', () => {
    const r = findScaleAnalogues(s, 'bio.homeostasis', { minDecades: 2, minSimilarity: 0.1 })!;
    const ids = r.analogues.map((a) => a.entity.id);
    expect(ids.some((id) => ['earth.climate', 'circuit.feedback-controller', 'bio.gene-regulation'].includes(id))).toBe(true);
    const byPattern = findPattern(s, { does: ['fn.control'], feedback: true });
    expect(byPattern.length).toBeGreaterThan(1);
    expect(byPattern.map((a) => Math.log10(a.length))).toEqual([...byPattern.map((a) => Math.log10(a.length))]);
  });
});

describe('scale-aware manifolds', () => {
  it('a manifold scales each parameter by its own dimension and says where it stops being the same member', () => {
    const f = scaleManifold('flywheel.disc', froude, 10);
    expect(f).not.toBeNull();
    expect(f!.parameters.length).toBeGreaterThan(0);
    expect(new Set(f!.parameters.map((p) => p.exponent)).size).toBeGreaterThan(1); // never alike
    expect(f!.laws.length).toBeGreaterThan(0);
    expect(f!.says).toMatch(/×λ\^/);
    const table = manifoldScaleTable(froude, 10);
    expect(table.length).toBeGreaterThan(5);
    for (const row of table) expect(row.laws.every((c) => c.why.length > 0)).toBe(true);
  });
});

describe('Ego speaks scale', () => {
  it('understands scale questions', () => {
    expect(interpret('what changes if I make it ten times smaller')).toMatchObject({ do: 'scaling', query: 'transform', factor: 0.1 });
    expect(interpret('scale the kart up by 3')).toMatchObject({ do: 'scaling', query: 'transform', factor: 3, of: 'kart' });
    expect(interpret('is the pendulum period scale invariant')).toMatchObject({ do: 'scaling', query: 'law', of: 'pendulum period' });
    expect(interpret('how does a fly see a heartbeat')).toMatchObject({ do: 'scaling', query: 'observe', observer: 'fly', of: 'heartbeat' });
    expect(interpret('scale analogues of ATP synthase')).toMatchObject({ do: 'scaling', query: 'analogues', of: 'atp synthase' });
    expect(interpret('is reality the same at every scale')).toMatchObject({ do: 'scaling', query: 'hypothesis' });
    expect(interpret('at what scale is ohms law valid')).toMatchObject({ do: 'scaling', query: 'regime', of: 'ohms law' });
    expect(interpret('how long does a signal take to cross a 10 m steel beam')).toMatchObject({ do: 'scaling', query: 'propagate' });
  });

  it('answers with the derived numbers and verdicts', () => {
    const t = answerScale({ do: 'scaling', query: 'transform', factor: 0.1 });
    expect(t).toMatch(/mass ×0\.001/);
    expect(t).toMatch(/square-cube/);
    expect(t).toMatch(/Re/);
    const law = answerScale({ do: 'scaling', query: 'law', of: 'pendulum period' });
    expect(law).toMatch(/scale-dependent/);
    expect(law).toMatch(/covariant/);
    const obs = answerScale({ do: 'scaling', query: 'observe', observer: 'fly', of: 'heartbeat' });
    expect(obs).toMatch(/a fly gets/i);
    const an = answerScale({ do: 'scaling', query: 'analogues', of: 'atp synthase' });
    expect(an).toMatch(/decades/);
    const hyp = answerScale({ do: 'scaling', query: 'hypothesis' });
    expect(hyp).toMatch(/hypothesis/);
    expect(hyp).toMatch(/Planck/);
    const reg = answerScale({ do: 'scaling', query: 'regime', of: 'ohms law' });
    expect(reg).toMatch(/Ohm/);
    const prop = answerScale({ do: 'scaling', query: 'propagate', of: '10 m steel beam', distance: 10, carrier: 'steel' });
    expect(prop).toMatch(/5960/);
  });
});

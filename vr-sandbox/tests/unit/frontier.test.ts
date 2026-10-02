// The frontier, the scales of the laws, and finding the math. Each item is a want under its words and nothing ends at
// "impossible"; every law has the number that says where it holds and the deeper law it is the limit of; and Ego can
// find the form of a law from units alone and fit it from measurements.

import { describe, expect, it } from 'vitest';
import { cantMatter, dimensionlessGroups, discover, explore, FRONTIER, frontierById, frontierCensus, frontierFor, frontierReport, geodesic, lawById, REGIMES, scaleCheck, ellipticK, workflowById } from '../../src/ganglia';

describe('the frontier', () => {
  it('stores every invention asked, each with a want, a label, a path and what she learns next; none ends at impossible', () => {
    expect(FRONTIER.length).toBe(46);
    expect(new Set(FRONTIER.map((f) => f.id)).size).toBe(FRONTIER.length);
    for (const f of FRONTIER) {
      expect(f.wants.length, f.id).toBeGreaterThan(5);
      expect(f.path.length, f.id).toBeGreaterThanOrEqual(2);
      expect(f.learn.length, f.id).toBeGreaterThanOrEqual(1);
      if (f.label === 'relabelled') { expect(f.law, f.id).toBeTruthy(); expect(f.as, f.id).toBeTruthy(); }
      expect(frontierReport(explore(f)), f.id).not.toMatch(/impossible/i);
    }
  });

  it('every bound is computed by a law she has, and every nearest real thing has a source', () => {
    for (const f of FRONTIER) {
      const x = explore(f);
      for (const n of x.attempt.notes) {
        if (n.law) expect(lawById(n.law), `${f.id}: ${n.law}`).toBeTruthy();
        expect(n.fix, `${f.id}: ${n.says}`).toBeUndefined();
      }
      for (const n of f.nearest) expect(n.source.cite.length, f.id).toBeGreaterThan(10);
    }
  });

  it('labels: what has been made, what can be built, what waits on a discovery, and what is relabelled to meet its want', () => {
    const c = frontierCensus();
    expect(c.total).toBe(46);
    expect(c.byLabel.made + c.byLabel.buildable + c.byLabel.research + c.byLabel.relabelled).toBe(46);
    // the law each relabelling runs into is named, and the want is still met
    expect(frontierById('battery.everlasting')!.as).toMatch(/century/);
    expect(frontierById('container.time-dilating')!.as).toMatch(/cold/);
    expect(frontierById('superconductor.room-temperature')!.label).toBe('research');
  });

  it('a time-slowing box needs Earth inside 12 mm; cold slows chemistry by 25 orders instead', () => {
    const x = explore(frontierById('container.time-dilating')!);
    const half = x.attempt.notes.find((n) => n.law === 'time.dilation.gravity')!;
    expect(half.value).toBeCloseTo(0.5, 9);
    expect(half.says).toMatch(/11\.8 mm/);
    expect(x.attempt.notes.find((n) => n.law === 'arrhenius')!.value!).toBeLessThan(1e-24);
  });

  it('gravity by turning: 223.6 m at 2 rpm for 1 g, blueprinted', () => {
    const x = explore(frontierById('boots.gravity')!);
    expect(x.reach).toBe('blueprinted');
    expect(x.attempt.notes[0]!.value).toBeCloseTo(9.80665, 9);
    expect(x.blueprint!.summary).toMatch(/223\.6 m/);
  });

  it('a geodesic dome: 26 hubs, 65 struts of two lengths (chord factors 0.54653 and 0.61803), each strut sized against buckling', () => {
    const g = geodesic(1);
    expect([g.hubs.length, g.struts.length, g.faces.length]).toEqual([26, 65, 40]);
    expect([...g.lengths.entries()].sort()).toEqual([['0.54653', 30], ['0.61803', 35]]);
    for (const h of g.hubs) expect(Math.hypot(...h)).toBeCloseTo(1, 12);
    const x = explore(frontierById('dome.geodesic')!);
    expect(x.reach).toBe('blueprinted');
    expect(x.blueprint!.parts.every((p) => p.startsWith('shs.'))).toBe(true);
  });

  it('an aerogel tent loses no more than a resting body makes; sound-proof paint adds 0.03 dB to a wall', () => {
    const tent = explore(frontierById('tent.aerogel')!);
    expect(tent.blueprint!.summary).toMatch(/80 mm/);
    expect(tent.attempt.notes[0]!.value!).toBeLessThanOrEqual(100);
    const paint = explore(frontierById('paint.sound-dampening')!).attempt.notes[0]!;
    expect(paint.value!).toBeGreaterThan(0);
    expect(paint.value!).toBeLessThan(0.05);
  });

  it('carbon blocks from lime come out even at best: the stoichiometry of burning and taking back', () => {
    const n = explore(frontierById('blocks.carbon-capturing')!).attempt.notes[0]!;
    expect(n.value).toBeCloseTo((630 * 44.009) / 56.077, 9);
  });

  it('shape-shifting furniture and synthetic muscles grow whole: a motor turning a lead screw, every part real', () => {
    for (const id of ['furniture.shape-shifting', 'muscles.synthetic']) {
      const x = explore(frontierById(id)!);
      const r = x.attempt.results[0]!;
      expect(r.level, id).toBe('works');
      expect(r.way, id).toBe('motor.rotary>lead.screw');
    }
  });

  it('finds the frontier item a request names', () => {
    expect(frontierFor('can you make me an invisibility cloak')?.id).toBe('cloak.invisible');
    expect(frontierFor('blueprint for gravity boots')?.id).toBe('boots.gravity');
    expect(frontierFor('how would you build a geodesic dome')?.id).toBe('dome.geodesic');
  });
});

describe('a lead screw actuator, sized whole', () => {
  it('pushes 600 N at 10 mm/s through a Tr10 × 2 that holds its load unpowered, its wire sized for the fuse that protects it', () => {
    const r = workflowById('actuator.design')!.run({ force: 600, speed: 0.01, stroke: 0.3 });
    expect(r.ok).toBe(true);
    const c = r.choice as { screw: { item: string; efficiency: number; holds: boolean; rpm: number }; fuse: string | null };
    expect(c.screw.item).toBe('leadscrew.tr10x2');
    expect(c.screw.efficiency).toBeCloseTo(0.403, 2);
    expect(c.screw.holds).toBe(true);
    expect(c.screw.rpm).toBeCloseTo(300, 9);
    expect(c.fuse).toBeTruthy();
  });
});

describe('every law has a scale', () => {
  it('each regime is of a law she has, and its number is finite at the law\'s own example', () => {
    for (const r of REGIMES) {
      const law = lawById(r.law);
      expect(law, r.law).toBeTruthy();
      const s = scaleCheck(r.law, law!.example.inputs)!;
      expect(Number.isFinite(s.value), r.law).toBe(true);
      expect(s.says, r.law).toMatch(/limit of/);
    }
  });

  it('kinetic energy is the low-speed limit of relativity: no error at walking pace, 19% low at half light speed', () => {
    expect(Math.abs(scaleCheck('energy.kinetic', { m: 1, v: 1.4 })!.error!)).toBeLessThan(1e-15);
    const half = scaleCheck('energy.kinetic', { m: 1, v: 0.5 * 299792458 })!;
    expect(half.within).toBe(false);
    const g = 1 / Math.sqrt(0.75);
    expect(half.error!).toBeCloseTo(0.125 / (g - 1) - 1, 12);
  });

  it('the small-swing pendulum is the limit of the exact one: 18.0% slow-reckoned at 90°', () => {
    expect(ellipticK(0)).toBeCloseTo(Math.PI / 2, 14);
    expect(scaleCheck('pendulum.period', { L: 1, theta: 1e-4 })!.error!).toBeCloseTo(0, 8);
    // exact T/T₀ at 90° is 1.18034 (K(sin 45°) = 1.85407)
    expect(1 / (1 + scaleCheck('pendulum.period', { L: 1, theta: Math.PI / 2 })!.error!)).toBeCloseTo(1.18034, 5);
  });

  it('Fourier\'s law past its limit: in 20 nm pores air conducts a tenth of its bulk value, why aerogel insulates', () => {
    const s = scaleCheck('conduction', { k: 0.026, A: 1, dT: 1, L: 20e-9 })!;
    expect(s.within).toBe(false);
    expect(1 / (1 + s.error!)).toBeLessThan(0.1);
  });
});

describe('finding the math', () => {
  it('from units alone: a pendulum\'s period can depend only on √(L/g); its mass can\'t matter', () => {
    const qs = [{ sym: 'T', unit: 's' }, { sym: 'L', unit: 'm' }, { sym: 'g', unit: 'm/s^2' }, { sym: 'm', unit: 'kg' }];
    const gs = dimensionlessGroups(qs, 'T');
    expect(gs.length).toBe(1);
    expect(gs[0]!.powers).toEqual({ T: 1, L: -0.5, g: 0.5 });
    expect(cantMatter(qs, gs)).toEqual(['m']);
  });

  it('drag: two groups, the drag coefficient and the Reynolds number', () => {
    const gs = dimensionlessGroups([{ sym: 'F', unit: 'N' }, { sym: 'rho', unit: 'kg/m^3' }, { sym: 'v', unit: 'm/s' }, { sym: 'D', unit: 'm' }, { sym: 'mu', unit: 'Pa s' }], 'F');
    expect(gs.length).toBe(2);
    expect(gs[0]!.powers['F']).toBe(1);
    expect(gs[1]!.powers['F']).toBeUndefined();
  });

  it('fits the constant and powers from measurements, and says when a group doesn\'t matter', () => {
    // measurements of a spring-mass oscillator: T against m and k (and an amplitude it shouldn't depend on)
    const samples = [0.5, 1, 2, 4].flatMap((m) => [10, 40, 160].flatMap((k) => [0.01, 0.05].map((a) => ({ T: 2 * Math.PI * Math.sqrt(m / k) * (1 + 1e-4 * Math.sin(m * k)), m, k, a }))));
    const d = discover(samples, [{ sym: 'T', unit: 's' }, { sym: 'm', unit: 'kg' }, { sym: 'k', unit: 'N/m' }, { sym: 'a', unit: 'm' }], 'T');
    expect(d.dropped).toEqual(['a']);
    expect(d.C).toBeCloseTo(2 * Math.PI, 3);
    expect(d.law).toEqual({ m: 0.5, k: -0.5 });
  });
});

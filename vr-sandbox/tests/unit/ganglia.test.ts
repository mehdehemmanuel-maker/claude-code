// The ganglia hold only what they can stand behind: every law reproduces a worked example computed outside it, every
// part agrees with itself by the laws relating its figures (and a known kind of datasheet error is caught), every
// process states its limits and source, and every workflow reaches the answer an engineer would by hand.

import { describe, expect, it } from 'vitest';
import { LAWS, PROCESSES, CATALOG, WORKFLOWS, recall, explain, linked, workflowById, solve, fingerprint, solveFor, sensitivity, uncertainty, showWork, show, graph, dangling, path, neighbours, findQuantities, parseUnit, toSI } from '../../src/ganglia';
import { withConstants, use } from '../../src/ganglia/laws';
import { MACHINES, machineById, breakdown as breakdownOf } from '../../src/ganglia/machines';
import { nodesOf } from '../../src/ganglia/machines';
import { dimensionOf, type Dim } from '../../src/ganglia/units';
import { lintCatalog, lintItem, lintMotor, lintBattery } from '../../src/ganglia/parts';
import { tapDrill, threadEngagement, minBendRatio } from '../../src/ganglia/processes';
import { MOTORS } from '../../src/data/motors';
import { BATTERIES } from '../../src/data/batteries';
import { interpret } from '../../src/assistant/intent';
import type { CatalogItem } from '../../src/ganglia/types';

describe('laws', () => {
  it('each one reproduces its worked example, and says where it comes from and where it holds', () => {
    const ids = new Set<string>();
    for (const l of LAWS) {
      expect(ids.has(l.id), `duplicate ${l.id}`).toBe(false);
      ids.add(l.id);
      const got = l.eval(withConstants(l, l.example.inputs));
      expect(Math.abs(got - l.example.output) / Math.max(Math.abs(l.example.output), 1e-30), `${l.id}: ${got} vs ${l.example.output}`).toBeLessThan(l.example.rel ?? 1e-9);
      expect(l.source.cite.length, l.id).toBeGreaterThan(5);
      expect(l.valid.length, l.id).toBeGreaterThan(5);
      expect(l.tags.length, l.id).toBeGreaterThan(0);
      for (const i of l.inputs) expect(i.sym in l.example.inputs || (l.id === 'weight' && i.sym === 'g'), `${l.id} example lacks ${i.sym}`).toBe(true);
    }
    expect(LAWS.length).toBeGreaterThanOrEqual(50);
  });
});

describe('processes', () => {
  it('each states what it makes, from what, with what, its limits and its source', () => {
    for (const p of PROCESSES) {
      expect(p.limits.length, p.id).toBeGreaterThan(0);
      expect(p.materials.length, p.id).toBeGreaterThan(0);
      expect(p.source.cite.length, p.id).toBeGreaterThan(5);
    }
  });

  it('their numbers are the trade\'s: tap drills, thread engagement, bend radii', () => {
    for (const [size, mm] of [['M5', 4.2], ['M6', 5.0], ['M8', 6.8], ['M10', 8.5]] as const) expect(Math.abs(tapDrill(size)! * 1000 - mm)).toBeLessThan(0.1);
    expect(threadEngagement('aluminum')).toBe(2);
    expect(threadEngagement('steel')).toBe(1);
    expect(minBendRatio('steel.a36', 0.002)).toBe(1);
    expect(minBendRatio('aluminum.6061-t6', 0.0254 / 4)).toBeCloseTo(4, 9);
    expect(minBendRatio('aluminum.6061-t6', 0.0254 / 16)).toBe(2.5);
  });
});

describe('parts', () => {
  it('every part in the catalogue agrees with itself, and has a source', () => {
    expect(lintCatalog()).toEqual([]);
    for (const c of CATALOG) expect(c.source.cite.length, c.id).toBeGreaterThan(5);
  });

  it('the lint catches the kinds of datasheet error that happen: the wrong winding, a typo, an impossible rating', () => {
    const re40 = MOTORS['motor.dc.coreless.d40-150w-24v']!;
    // the 12 V winding's order number on the 24 V winding's data (the mistake this catalogue once made)
    expect(lintMotor({ ...re40, label: 'maxon RE 40, 12 V, 150 W (148866)' })[0]).toMatch(/label says 12 V/);
    // an older edition's resistance with the newer edition's stall current
    expect(lintMotor({ ...re40, published: { ...re40.published, terminalR: 0.317 } }).join(' ')).toMatch(/stall/);
    // a wire whose area was typed in square millimetres' worth of the next gauge
    const wire = CATALOG.find((c) => c.id === 'awg.14')!;
    expect(lintItem({ ...wire, specs: { ...wire.specs, area: 3.31e-6 } })[0]).toMatch(/copper's is/);
    // a bearing whose static rating exceeds its dynamic one
    const b: CatalogItem = { ...CATALOG.find((c) => c.id === 'bearing.dgbb.6205')!, specs: { bore: 0.025, od: 0.052, width: 0.015, C: 7800, C0: 14800, type: 'ball' } };
    expect(lintItem(b)[0]).toMatch(/dynamic rating not above static/);
    // a "12 V" battery of five cells
    expect(lintBattery({ ...BATTERIES['battery.sla.12v-7ah']!, cells: 5 })[0]).toMatch(/5 lead-acid cells make 10 V/);
  });
});

describe('workflows', () => {
  const run = (id: string, spec: Record<string, number>) => workflowById(id)!.run(spec) as ReturnType<NonNullable<ReturnType<typeof workflowById>>['run']> & { choice: Record<string, unknown> | null };

  it('a drive for a 120 kg kart at 3 m/s: two RE 40s with 12:1 gearheads on 24 V, through a controller that limits their current', () => {
    const r = run('drive.select', { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 });
    expect(r.ok).toBe(true);
    const c = r.choice as unknown as { motor: string; gearhead: string; battery: string; series: number; controller: string; currentLimit: number; topSpeed: number; cruiseCurrent: number };
    expect(c.motor).toBe('motor.dc.coreless.d40-150w-24v');
    expect(c.gearhead).toBe('gearhead.planetary.d42-12to1');
    expect(c.battery).toBe('battery.sla.12v-7ah');
    expect(c.series).toBe(2);
    expect(c.controller).toBe('controller.dc.2ch-30a-34v-limit');
    // by hand: (0.015 x 120 g + 120 x 0.7) x 0.125 / 2 = 6.35 N m a wheel; / (12 x 0.81) / 0.0302 + 0.137 = 21.8 A; x 1.1
    expect(c.currentLimit).toBe(24);
    expect(c.topSpeed).toBeGreaterThan(3);
    expect(c.cruiseCurrent).toBeLessThan(6);
    expect(r.trace.map((t) => t.law)).toEqual(expect.arrayContaining(['rolling.resistance', 'newton.second', 'wheel.torque', 'traction.limit', 'gear.output.torque']));
  });

  it('asked for what nothing in the catalogue can do, it says so and why', () => {
    const r = run('drive.select', { mass: 500, wheelRadius: 0.125, speed: 10, accel: 4, motors: 2 });
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/Nothing in the catalogue/);
    expect(r.warnings.join(' ')).toMatch(/spin/);
  });

  it('a wire: 16 AWG for 20 A over 1 m, 12 AWG over 3 m (the drop, not the rating, decides)', () => {
    expect((run('wire.size', { current: 20, length: 1, voltage: 24 }).choice as { gauge: string }).gauge).toBe('16');
    expect((run('wire.size', { current: 20, length: 3, voltage: 24 }).choice as { gauge: string }).gauge).toBe('12');
  });

  it('a battery: 24 V at 5 A for an hour takes two strings, because a lead-acid block drawn fast gives less', () => {
    const c = run('battery.size', { voltage: 24, current: 5, hours: 1 }).choice as { series: number; parallel: number; hours: number };
    expect(c.series).toBe(2);
    expect(c.parallel).toBe(2);
    expect(c.hours).toBeGreaterThan(1);
  });

  it('a shaft for 30 N m bending and 20 N m torque at 2x in 1018 needs 12.4 mm: a 16 mm bar', () => {
    const r = run('shaft.size', { M: 30, T: 20, n: 2 });
    expect((r.choice as { diameter: number }).diameter).toBe(0.016);
    expect(r.warnings.join(' ')).toMatch(/endurance/);
  });

  it('a bearing for 500 N at 600 rpm on a 25 mm shaft: a 6005 bare, a UCP205 housed', () => {
    expect((run('bearing.select', { load: 500, rpm: 600, hours: 5000, bore: 0.025 }).choice as { bearing: string }).bearing).toBe('bearing.dgbb.6005');
    expect((run('bearing.select', { load: 500, rpm: 600, hours: 5000, bore: 0.025, housed: 1 }).choice as { bearing: string }).bearing).toBe('bearing.unit.ucp205');
  });

  it('a coupling, a controller and a torque arm for the kart\'s gearmotor', () => {
    expect((run('coupling.select', { torque: 5.83, bore: 0.012, sf: 1.5 }).choice as { coupling: string }).coupling).toBe('coupling.jaw.10nm-22mm');
    expect((run('controller.select', { voltage: 25.8, current: 22, motors: 2, limit: 1 }).choice as { controller: string; count: number })).toEqual({ controller: 'controller.dc.2ch-30a-34v-limit', count: 1 });
    const arm = run('torquearm.size', { torque: 5.83, radius: 0.037, length: 0.037 }).choice as { rodEnd: string; force: number };
    expect(arm.rodEnd).toBe('rod-end.m8-female');
    expect(arm.force).toBeCloseTo(157.6, 0);
  });

  it('a whole drivetrain from one sentence: every part sized from the drive\'s own numbers, counted and priced', () => {
    const r = run('powertrain.design', { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 });
    expect(r.ok).toBe(true);
    const c = r.choice as unknown as { wire: { gauge: string }; coupling: string; torqueArm: { rodEnd: string }; bearing: string; axle: number; bill: { id: string; count: number }[]; cost: Record<string, number> };
    // 24 A is past 16 AWG's 22 A rating: 14 AWG, as the kart is wired
    expect(c.wire.gauge).toBe('14');
    // 0.0302 x (24 - 0.137) x 12 x 0.81 = 7.0 N m at the output, x 1.5 = 10.5 N m: past the L075's 10.2, an L090
    expect(c.coupling).toBe('coupling.jaw.16nm-25mm');
    expect(c.torqueArm.rodEnd).toBe('rod-end.m8-female');
    expect(c.bearing).toBe('bearing.unit.ucp205');
    // strength needs about 10 mm; the axle is made to the pillow block's 25 mm bore
    expect(c.axle).toBe(0.025);
    expect(c.bill).toEqual(expect.arrayContaining([{ id: 'motor.dc.coreless.d40-150w-24v', count: 2 }, { id: 'battery.sla.12v-7ah', count: 2 }, { id: 'rod-end.m8-female', count: 4 }]));
    // two RE 40s at EUR 502.09 and two GP 42 Cs at EUR 234.36; two NP7-12s at USD 28.99
    expect(c.cost['EUR']).toBeCloseTo(2 * 502.09 + 2 * 234.36, 6);
    expect(c.cost['USD']).toBeCloseTo(2 * 28.99, 6);
    expect(interpret('design the whole drivetrain for a 120 kg kart at 3 m/s')).toEqual({ do: 'engineer', workflow: 'powertrain.design', spec: { mass: 120, speed: 3 } });
  });

  it('each says what it uses, and every law and process it names exists', () => {
    for (const w of WORKFLOWS) {
      for (const l of w.uses.laws) expect(LAWS.some((x) => x.id === l), `${w.id} uses ${l}`).toBe(true);
      for (const p of w.uses.processes) expect(PROCESSES.some((x) => x.id === p), `${w.id} uses ${p}`).toBe(true);
      expect(linked(w.id).length).toBeGreaterThan(0);
    }
  });
});

describe('recall', () => {
  it('finds what a question is about', () => {
    expect(recall('rolling resistance')[0]!.item.id).toBe('rolling.resistance');
    expect(recall('how do I tap a thread', 3).map((k) => k.item.id)).toContain('tap');
    expect(recall('drive for a kart', 4).map((k) => k.item.id)).toContain('drive.select');
    expect(recall('25 mm bearing pillow block', 5).map((k) => k.item.id)).toContain('bearing.unit.ucp205');
    expect(explain(recall('euler buckling')[0]!)).toMatch(/π² E I/);
    // the world's own knowledge too: its materials, joints and shapes
    expect(recall('6061 aluminium', 3).map((k) => k.item.id)).toContain('aluminum.6061-t6');
    expect(recall('split clamp', 3).map((k) => k.item.id)).toEqual(expect.arrayContaining(['clamp', 'split-clamp']));
    expect(recall('battery', 6).some((k) => k.kind === 'shape')).toBe(true);
  });
});

describe('Ego hears an engineering question', () => {
  it('reads the numbers out of plain words', () => {
    expect(interpret('pick a drive for a 120 kg kart at 3 m/s')).toEqual({ do: 'engineer', workflow: 'drive.select', spec: { mass: 120, speed: 3 } });
    expect(interpret('size a wire for 20 A over 3 m at 24 V')).toEqual({ do: 'engineer', workflow: 'wire.size', spec: { current: 20, length: 3, voltage: 24 } });
    expect(interpret('which bearing for 500 N at 600 rpm for 5000 hours on a 25 mm shaft')).toEqual({ do: 'engineer', workflow: 'bearing.select', spec: { load: 500, rpm: 600, hours: 5000, bore: 0.025 } });
    expect(interpret('size a shaft for 20 Nm and 30 Nm bending')).toEqual({ do: 'engineer', workflow: 'shaft.size', spec: { T: 20, M: 30 } });
    expect(interpret('tell me about rolling resistance')).toEqual({ do: 'recall', about: 'rolling resistance' });
    expect(interpret('what do you know')).toEqual({ do: 'ganglia' });
  });

  it('in whatever units it is said in', () => {
    const d = interpret('pick a drive for a 265 lb kart at 8 mph on 10 in wheels, 2 motors') as { spec: Record<string, number> };
    expect(d.spec['mass']).toBeCloseTo(120.2, 1);
    expect(d.spec['speed']).toBeCloseTo(3.576, 3);
    expect(d.spec['wheelRadius']).toBeCloseTo(0.127, 6);
    expect(d.spec['motors']).toBe(2);
    expect(interpret('size a wire for 30 amps over 10 ft at 12 v')).toEqual({ do: 'engineer', workflow: 'wire.size', spec: { current: 30, length: 3.048, voltage: 12 } });
    expect(interpret('which bearing for 112 lbf at 600 rpm for 5000 hours on a 1 in shaft')).toEqual({ do: 'engineer', workflow: 'bearing.select', spec: { load: 498.200820909, rpm: 600, hours: 5000, bore: 0.0254 } });
    expect(interpret('show your work')).toEqual({ do: 'work' });
    expect(interpret('what does it depend on')).toEqual({ do: 'depends' });
  });
});

describe('accuracy: every law is dimensionally sound', () => {
  it('every unit it is written in is a unit', () => {
    for (const l of LAWS) {
      for (const i of [...l.inputs, l.output]) expect(() => parseUnit(i.unit), `${l.id}: ${i.unit}`).not.toThrow();
      for (const c of Object.values(l.constants ?? {})) expect(() => parseUnit(c.unit), `${l.id}: ${c.unit}`).not.toThrow();
    }
  });

  it('change the size of any base unit and its output rescales exactly as its dimension says (a wrong power fails this)', () => {
    const lambda = 1.37;
    for (const l of LAWS) {
      const base = withConstants(l, l.example.inputs);
      const y0 = l.eval(base);
      for (let b = 0; b < 5; b++) {
        const scaled: Record<string, number> = {};
        const dimOf = (sym: string): Dim => {
          const i = l.inputs.find((x) => x.sym === sym);
          if (i) return dimensionOf(i.unit);
          const c = l.constants?.[sym];
          return c ? dimensionOf(c.unit) : [0, 0, 0, 0, 0];
        };
        for (const [k, v] of Object.entries(base)) scaled[k] = v * lambda ** dimOf(k)[b]!;
        const want = y0 * lambda ** dimensionOf(l.output.unit)[b]!;
        const got = l.eval(scaled);
        expect(Math.abs(got - want) / Math.max(Math.abs(want), 1e-300), `${l.id}, base dimension ${b}: ${got} vs ${want}`).toBeLessThan(1e-9);
      }
    }
  });

  it('a law used beyond what it holds for says so', () => {
    expect(use('bearing.life.l10', { C: 10000, P: 8000, p: 3 }).caution).toMatch(/half the dynamic rating/);
    expect(use('buckling.johnson', { A: 5e-5, Sy: 370e6, E: 200e9, K: 1, L: 1, r: 0.002 }).caution).toMatch(/Euler/);
    expect(use('spring.rate', { G: 79e9, d: 0.005, D: 0.1, n: 8 }).caution).toMatch(/spring index 20/);
    expect(use('stress.hoop', { p: 1e6, r: 0.01, t: 0.003 }).caution).toMatch(/Lamé/);
    expect(use('rolling.resistance', { Crr: 0.015, N: 1000 }).caution).toBeNull();
    expect(() => use('ohm', { I: 2 })).toThrow(/needs resistance/);
  });

  it('every source says what kind it is where it is a standard, a maker or a textbook', () => {
    const kinds = LAWS.map((l) => l.source.kind).filter(Boolean);
    expect(kinds.length).toBeGreaterThan(LAWS.length * 0.6);
  });
});

describe('reasoning: inverse, sensitivity, uncertainty, working', () => {
  it('solves any law backwards for one input', () => {
    // a 20 mm shaft at 50 N m is sheared 31.8 MPa: asked for the diameter that gives that, it finds 20 mm
    expect(solveFor('torsion.solid', 'd', { T: 50 }, 31830988.61837906)).toBeCloseTo(0.02, 9);
    // the dynamic rating for 3.24 billion revolutions at 1 kN is 14.8 kN
    expect(solveFor('bearing.life.l10', 'C', { P: 1000, p: 3 }, 3241792000)).toBeCloseTo(14800, 3);
    expect(solveFor('natural.frequency', 'k', { m: 2 }, 11.253953951963828)).toBeCloseTo(10000, 4);
    expect(solveFor('ohm', 'R', { I: 2 }, -5)).toBeNull();
  });

  it('knows what an answer hangs on: a shaft\'s stress goes as the cube of its diameter', () => {
    const e = sensitivity('torsion.solid', { T: 50, d: 0.02 });
    expect(e['T']).toBeCloseTo(1, 6);
    expect(e['d']).toBeCloseTo(-3, 6);
    const u = uncertainty('rolling.resistance', { Crr: 0.015, N: 1000 }, { Crr: 0.3, N: 0.05 });
    expect(u.independent).toBeCloseTo(Math.hypot(0.3, 0.05), 6);
    expect(u.worst).toBeCloseTo(0.35, 6);
    expect(u.dominant).toBe('Crr');
  });

  it('shows its work: each law, its formula, the numbers in with their units, what came out', () => {
    const r = workflowById('drive.select')!.run({ mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 });
    const work = showWork(r);
    expect(work[0]).toMatch(/^1\. Rolling resistance \(what the tyres lose rolling\): F = C_rr N with Crr 0\.015, N 1\.18 kN → 17\.7 N$/);
    expect(show(0.0124, 'm')).toBe('12.4 mm');
    expect(show(31830988, 'Pa')).toBe('31.8 MPa');
  });
});

describe('efficiency: remembered answers and a fast index', () => {
  it('the same question, in any order, is one fingerprint, and is answered once', () => {
    expect(fingerprint('wire.size', { current: 20, length: 3 })).toBe(fingerprint('wire.size', { length: 3, current: 20 }));
    expect(fingerprint('wire.size', { current: 20, length: 3 })).not.toBe(fingerprint('wire.size', { current: 20, length: 4 }));
    const a = solve('powertrain.design', { mass: 120, speed: 3 });
    const b = solve('powertrain.design', { speed: 3, mass: 120 });
    expect(a.cached).toBe(false);
    expect(b.cached).toBe(true);
    expect(b.result).toBe(a.result);
  });

  it('recalls fast: a thousand questions in well under a frame budget each', () => {
    recall('warm up the index');
    const t0 = performance.now();
    for (let i = 0; i < 1000; i++) recall(['bearing for a wheel', 'tap a thread in aluminium', 'rolling resistance', 'battery runtime', 'weld a steel frame'][i % 5]!);
    const per = (performance.now() - t0) / 1000;
    expect(per).toBeLessThan(1);
  });

  it('understands a builder\'s other words for things', () => {
    expect(recall('aluminium bar', 4).map((k) => k.item.id)).toContain('aluminum.6061-t6');
    // no entry says "gearbox": its synonym finds the gearhead; "cable" finds the wire gauges
    expect(recall('gearbox', 4).map((k) => k.item.id)).toContain('gearhead.planetary.d42-12to1');
    expect(recall('cable', 6).map((k) => k.item.id)).toEqual(expect.arrayContaining(['awg.14']));
    expect(recall('axle size', 4).map((k) => k.item.id)).toContain('shaft.size');
  });
});

describe('structure: one graph of everything, with no loose ends', () => {
  it('every relation points at something that exists', () => {
    expect(dangling()).toEqual([]);
    expect(graph().edges.length).toBeGreaterThan(300);
  });

  it('says how two things relate', () => {
    // a bearing to the law that rates it, directly; a battery to the drivetrain workflow that chooses it
    expect(path('part:bearing.dgbb.6205', 'law:bearing.life.l10')!.map((x) => x.via)).toEqual([null, 'ratedBy']);
    expect(path('part:battery.sla.12v-7ah', 'workflow:powertrain.design')).not.toBeNull();
    expect(neighbours('joint:clamp', 'madeBy')).toContain('process:split-clamp');
    expect(neighbours('process:weld.mig', 'works')).toContain('material:steel.a36');
  });
});

describe('units: whatever units it is said in', () => {
  it('parses the units laws are written in', () => {
    expect(parseUnit('W/m^2 K').dim).toEqual([1, 0, -3, 0, -1]);
    expect(parseUnit('N m/A').dim).toEqual([1, 2, -2, -1, 0]);
    expect(toSI(8, 'mi/h')).toBeCloseTo(3.57632, 5);
    expect(toSI(25, 'degC')).toBeCloseTo(298.15, 9);
  });

  it('reads quantities out of what is said', () => {
    const q = findQuantities('a 265 lb kart at 8 mph on 10 in wheels, 20 N·m, 3/4 in bolts, 5% grade');
    expect(q.map((x) => x.unit)).toEqual(['lb', 'mi/h', 'in', 'N m', 'in', '%']);
    expect(q[0]!.si).toBeCloseTo(120.2, 1);
    expect(q[1]!.si).toBeCloseTo(3.576, 3);
    expect(q[4]!.si).toBeCloseTo(0.01905, 5);
  });
});

describe('machines, broken down', () => {
  it('a continuous-fibre composite printer (figures from the Markforged FX10): every assembly published by its maker with its source, or said not to be', () => {
    const fx = machineById('printer.cff-composite')!;
    const nodes = nodesOf(fx);
    expect(nodes.length).toBeGreaterThan(15);
    for (const n of nodes) {
      if (n.published) expect(n.source?.cite.length, n.name).toBeGreaterThan(5);
      else expect(n.is, n.name).toMatch(/not published/i);
    }
    // its build volume and chamber as published
    expect([fx.specs['buildX'], fx.specs['buildY'], fx.specs['buildZ']]).toEqual([0.375, 0.3, 0.3]);
    expect(fx.specs['chamberMax']).toBeCloseTo(273.15 + 60, 9);
    expect(breakdownOf(fx).some((l) => /Metal Kit/.test(l))).toBe(true);
  });

  it('what it prints with agrees with itself, and the composite laws give what a fibre-reinforced part is', () => {
    expect(lintCatalog().filter((x) => /^(filament|fibre)\./.test(x.id))).toEqual([]);
    // 30% carbon fibre (60 GPa) in Onyx (2.4 GPa): about 20 GPa along it, 3.4 GPa across it
    expect(use('composite.rule-of-mixtures', { Vf: 0.3, Ef: 60e9, Em: 2.4e9 }).value).toBeCloseTo(19.68e9, -6);
    expect(use('composite.transverse', { Vf: 0.3, Ef: 60e9, Em: 2.4e9 }).value).toBeCloseTo(3.37e9, -7);
    // a sixth shrinkage in the furnace: printed 20% big
    expect(use('sinter.scale', { s: 0.167 }).value).toBeCloseTo(1.2, 2);
  });

  it('joins the rest: it runs its processes and is fed its materials; Ego breaks it down when asked, however it is spelled', () => {
    expect(neighbours('machine:printer.cff-composite', 'runs')).toEqual(expect.arrayContaining(['process:cff', 'process:metal.fff']));
    expect(neighbours('machine:printer.cff-composite', 'feeds')).toContain('part:filament.nylon-microcarbon');
    expect(path('machine:printer.cff-composite', 'law:composite.rule-of-mixtures')).not.toBeNull();
    expect(interpret('breakdown mark forged fx10')).toEqual({ do: 'breakdown', what: 'mark forged fx10' });
    expect(recall('mark forged fx10', 1)[0]!.item.id).toBe('printer.cff-composite');
    expect(MACHINES.length).toBeGreaterThan(0);
  });

  it('an EUV lithography scanner: light from tin plasma, six mirrors, two stages; each assembly sourced or said not to be, and its resolution from Rayleigh', () => {
    const m = machineById('lithography.euv-scanner')!;
    for (const n of nodesOf(m)) if (n.published) expect(n.source?.cite, n.name).toBeTruthy(); else expect(n.is, n.name).toMatch(/not published/i);
    expect(m.tree.map((n) => n.name)).toEqual(expect.arrayContaining(['Light source (laser-produced tin plasma)', 'Illuminator', 'Projection optics', 'Wafer stages', 'Vacuum system']));
    // 13 nm at 0.33 NA and 13.5 nm light: k1 = CD NA / lambda, about 0.32
    expect(use('rayleigh.resolution', { k1: 0.32, lambda: Number(m.specs['wavelength']), NA: Number(m.specs['NA']) }).value).toBeCloseTo(Number(m.specs['resolution']), 9);
    expect(recall('asml euv lithography machine', 1)[0]!.item.id).toBe('lithography.euv-scanner');
    expect(interpret('break down the ASML extreme ultraviolet lithography machine')).toMatchObject({ do: 'breakdown' });
  });
});


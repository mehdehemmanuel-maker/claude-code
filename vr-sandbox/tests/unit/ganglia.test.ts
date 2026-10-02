// The ganglia hold only what they can stand behind: every law reproduces a worked example computed outside it, every
// part agrees with itself by the laws relating its figures (and a known kind of datasheet error is caught), every
// process states its limits and source, and every workflow reaches the answer an engineer would by hand.

import { describe, expect, it } from 'vitest';
import { LAWS, PROCESSES, CATALOG, WORKFLOWS, recall, explain, linked, workflowById } from '../../src/ganglia';
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
      const got = l.eval(l.example.inputs);
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
    const re40 = MOTORS['maxon.re40-148867']!;
    // the 12 V winding's order number on the 24 V winding's data (the mistake this catalogue once made)
    expect(lintMotor({ ...re40, label: 'maxon RE 40, 12 V, 150 W (148866)' })[0]).toMatch(/label says 12 V/);
    // an older edition's resistance with the newer edition's stall current
    expect(lintMotor({ ...re40, published: { ...re40.published, terminalR: 0.317 } }).join(' ')).toMatch(/stall/);
    // a wire whose area was typed in square millimetres' worth of the next gauge
    const wire = CATALOG.find((c) => c.id === 'awg.14')!;
    expect(lintItem({ ...wire, specs: { ...wire.specs, area: 3.31e-6 } })[0]).toMatch(/copper's is/);
    // a bearing whose static rating exceeds its dynamic one
    const b: CatalogItem = { ...CATALOG.find((c) => c.id === 'skf.6205')!, specs: { bore: 0.025, od: 0.052, width: 0.015, C: 7800, C0: 14800, type: 'ball' } };
    expect(lintItem(b)[0]).toMatch(/dynamic rating not above static/);
    // a "12 V" battery of five cells
    expect(lintBattery({ ...BATTERIES['yuasa.np7-12']!, cells: 5 })[0]).toMatch(/5 lead-acid cells make 10 V/);
  });
});

describe('workflows', () => {
  const run = (id: string, spec: Record<string, number>) => workflowById(id)!.run(spec) as ReturnType<NonNullable<ReturnType<typeof workflowById>>['run']> & { choice: Record<string, unknown> | null };

  it('a drive for a 120 kg kart at 3 m/s: two RE 40s with 12:1 gearheads on 24 V, through a controller that limits their current', () => {
    const r = run('drive.select', { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 });
    expect(r.ok).toBe(true);
    const c = r.choice as unknown as { motor: string; gearhead: string; battery: string; series: number; controller: string; currentLimit: number; topSpeed: number; cruiseCurrent: number };
    expect(c.motor).toBe('maxon.re40-148867');
    expect(c.gearhead).toBe('maxon.gp42c-203115');
    expect(c.battery).toBe('yuasa.np7-12');
    expect(c.series).toBe(2);
    expect(c.controller).toBe('basicmicro.roboclaw-2x30a');
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
    expect((run('bearing.select', { load: 500, rpm: 600, hours: 5000, bore: 0.025 }).choice as { bearing: string }).bearing).toBe('skf.6005');
    expect((run('bearing.select', { load: 500, rpm: 600, hours: 5000, bore: 0.025, housed: 1 }).choice as { bearing: string }).bearing).toBe('ucp205');
  });

  it('a coupling, a controller and a torque arm for the kart\'s gearmotor', () => {
    expect((run('coupling.select', { torque: 5.83, bore: 0.012, sf: 1.5 }).choice as { coupling: string }).coupling).toBe('lovejoy.l075');
    expect((run('controller.select', { voltage: 25.8, current: 22, motors: 2, limit: 1 }).choice as { controller: string; count: number })).toEqual({ controller: 'basicmicro.roboclaw-2x30a', count: 1 });
    const arm = run('torquearm.size', { torque: 5.83, radius: 0.037, length: 0.037 }).choice as { rodEnd: string; force: number };
    expect(arm.rodEnd).toBe('skf.si8e');
    expect(arm.force).toBeCloseTo(157.6, 0);
  });

  it('a whole drivetrain from one sentence: every part sized from the drive\'s own numbers, counted and priced', () => {
    const r = run('powertrain.design', { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 });
    expect(r.ok).toBe(true);
    const c = r.choice as unknown as { wire: { gauge: string }; coupling: string; torqueArm: { rodEnd: string }; bearing: string; axle: number; bill: { id: string; count: number }[]; cost: Record<string, number> };
    // 24 A is past 16 AWG's 22 A rating: 14 AWG, as the kart is wired
    expect(c.wire.gauge).toBe('14');
    // 0.0302 x (24 - 0.137) x 12 x 0.81 = 7.0 N m at the output, x 1.5 = 10.5 N m: past the L075's 10.2, an L090
    expect(c.coupling).toBe('lovejoy.l090');
    expect(c.torqueArm.rodEnd).toBe('skf.si8e');
    expect(c.bearing).toBe('ucp205');
    // strength needs about 10 mm; the axle is made to the pillow block's 25 mm bore
    expect(c.axle).toBe(0.025);
    expect(c.bill).toEqual(expect.arrayContaining([{ id: 'maxon.re40-148867', count: 2 }, { id: 'yuasa.np7-12', count: 2 }, { id: 'skf.si8e', count: 4 }]));
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
    expect(recall('25 mm bearing pillow block', 5).map((k) => k.item.id)).toContain('ucp205');
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
});

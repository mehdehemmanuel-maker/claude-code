// Building blocks, principles and ways. A block is known by what it does, not who makes it, and opens up into its
// own anatomy; a design of blocks is checked connection by connection, each problem naming the principle it breaks;
// every principle says why, by which laws; and a job has as many ways as physics allows, not the one we thought of
// first.

import { describe, expect, it } from 'vitest';
import { ARCHETYPES, CATALOG, PRINCIPLES, CATEGORIES, WAYS, checkDesign, conceive, asWhole, byMedium, designFromPowertrain, lawById, portsOf, recall, solve, workflowById, buildable, dangling, path } from '../../src/ganglia';
import { archetypeOf, type Design } from '../../src/ganglia/blocks';
import { principleById } from '../../src/ganglia/principles';
import { lintCatalog } from '../../src/ganglia/parts';
import { WIRE_GAUGES } from '../../src/data/batteries';
import { interpret } from '../../src/assistant/intent';
import type { PowertrainChoice } from '../../src/ganglia/workflows';

const kart = () => solve('powertrain.design', { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 }).result as { ok: boolean; choice: PowertrainChoice };

describe('principles: why things are the way they are', () => {
  it('each says what to do and why, by laws that exist, from a source, in a category', () => {
    expect(PRINCIPLES.length).toBeGreaterThanOrEqual(40);
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(15);
    for (const p of PRINCIPLES) {
      expect(p.rule.length, p.id).toBeGreaterThan(20);
      expect(p.why.length, p.id).toBeGreaterThan(20);
      expect(p.source.cite, p.id).toBeTruthy();
      for (const l of p.laws) expect(lawById(l), `${p.id} cites ${l}`).toBeDefined();
    }
    expect(new Set(PRINCIPLES.map((p) => p.id)).size).toBe(PRINCIPLES.length);
  });

  it('every principle a block or a check names is one she holds', () => {
    for (const a of ARCHETYPES) for (const p of a.principles) expect(principleById(p), `${a.id} names ${p}`).toBeDefined();
    // the checks: every problem any design can raise names a principle (exercised below); here, that the graph has no loose ends
    expect(dangling()).toEqual([]);
    expect(path('principle:torque-arm', 'law:buckling.euler')).not.toBeNull();
  });

  it('answers why: the question finds its principle', () => {
    const why = (q: string) => {
      const i = interpret(q);
      expect(i?.do, q).toBe('reason');
      return recall((i as { about: string }).about, 1, ['principle'])[0]!.item.id;
    };
    expect(why('why use a torque arm?')).toBe('torque-arm');
    expect(why('why are bearings press fit')).toBe('interference-on-rotating-ring');
    expect(why('why put the bearings close to the wheel')).toBe('bearing-near-load');
    expect(why('why fuse at the battery')).toBe('fuse-at-source');
    expect(why('why not drill into the battery')).toBe('no-holes-in-bought-items');
    expect(why('why lay carbon fibre along the load')).toBe('load-composites-along-fibres');
    // "why did it break?" still asks about what just happened
    expect(interpret('why did it break?')).toEqual({ do: 'why' });
    expect(interpret('why')).toEqual({ do: 'why' });
    expect(interpret('design principles')).toEqual({ do: 'principles' });
    expect(interpret('principles of fits and tolerances')).toEqual({ do: 'principles', of: 'fits and tolerances' });
  });
});

describe('building blocks: what a thing does, whoever makes it', () => {
  it('every catalogued part of a block family has ports with finite ratings', () => {
    for (const c of CATALOG) {
      const a = archetypeOf(c);
      if (!a || a.id === 'material.print') continue;
      const ports = portsOf({ id: 'x', item: c.id });
      expect(ports.length, c.id).toBeGreaterThan(0);
      for (const p of ports) for (const [k, v] of Object.entries(p.r)) expect(Number.isFinite(v), `${c.id} ${p.name}.${k}`).toBe(true);
    }
  });

  it('each block opens into its anatomy, piece by piece, by laws that exist, with a source', () => {
    for (const a of ARCHETYPES) {
      expect(a.inside.length, a.id).toBeGreaterThan(0);
      expect(a.insideSource.cite, a.id).toBeTruthy();
      for (const x of a.inside) if (x.law) expect(lawById(x.law), `${a.id} ${x.name}`).toBeDefined();
    }
    // a motor is a whole system of its own: the force that drives it is the Lorentz force on its winding
    expect(ARCHETYPES.find((a) => a.id === 'actuation.rotary')!.inside.some((x) => x.law === 'lorentz.force')).toBe(true);
  });

  it('the kart\'s drivetrain, as blocks, holds at every connection, and says its motors only take 24 A in bursts', () => {
    const r = kart();
    expect(r.ok).toBe(true);
    const d = designFromPowertrain(r.choice);
    const problems = checkDesign(d);
    expect(problems.filter((p) => p.severity === 'error')).toEqual([]);
    // 24 A is four times the coreless motor's 5.8-6 A continuous: fine for the seconds it accelerates, not for cruising
    expect(problems.filter((p) => p.severity === 'warning').map((p) => p.principle)).toEqual(['derate-for-heat']);
    // two 12 V blocks in series: 24 V nominal, 25.8 V charged
    expect(portsOf(d.blocks.find((b) => b.id === 'pack')!)[0]!.r['Vmax']).toBeCloseTo(25.8, 6);
  });

  it('finds what is wrong, and which principle it breaks', () => {
    const base = designFromPowertrain(kart().choice);
    const vary = (f: (d: Design) => void) => { const d: Design = structuredClone(base); f(d); return checkDesign(d).map((p) => p.principle); };
    const set = (d: Design, id: string, b: Record<string, unknown>) => { const i = d.blocks.findIndex((x) => x.id === id); d.blocks[i] = { ...d.blocks[i]!, ...b } as Design['blocks'][number]; };
    // a 25 mm axle won't go in a coupling bored to 22 mm at most
    expect(vary((d) => set(d, 'coupling', { item: 'coupling.jaw.10nm-22mm' }))).toContain('match-shaft-to-bore');
    // 24 A through 18 AWG (rated 16 A)
    expect(vary((d) => set(d, 'wire', { item: 'awg.18' }))).toContain('size-wire-by-drop-and-ampacity');
    // a driver with no current limit on a motor that stalls at 80 A
    expect(vary((d) => set(d, 'controller', { item: 'controller.dc.1ch-30a-30v' }))).toContain('current-limit-motors');
    // three blocks in series (38.7 V charged) into a 34 V controller
    expect(vary((d) => set(d, 'pack', { series: 3 }))).toContain('match-voltage');
    // the wheel's load hung on the gearhead's own output bearings
    expect(vary((d) => d.links.push({ a: ['gearhead', 'output'], b: ['bearing', 'bore'], carries: { F: 294 } }))).toContain('gearhead-takes-torque-not-load');
    // no fuse at the battery
    expect(vary((d) => { d.links[0]!.via = ['wire']; })).toContain('fuse-at-source');
    // a 40 A fuse on a 32 A wire: the wire burns first
    expect(vary((d) => set(d, 'fuse', { item: 'fuse.blade-ato.40a' }))).toContain('fuse-at-source');
  });
});

describe('fuses: protecting the wire', () => {
  it('the kart\'s: above 125% of 24 A, within 14 AWG\'s 32 A, and able to break a dead short of about 412 A', () => {
    const w = WIRE_GAUGES['14']!;
    const r = workflowById('fuse.select')!.run({ current: 24, ampacity: 32, voltage: 25.8, sourceR: 2 * 0.023, wireR: 2 * 1 * w.ohmPerM }) as { choice: { fuse: string; fault: number } };
    expect(r.choice.fuse).toBe('fuse.blade-ato.30a');
    expect(r.choice.fault).toBeCloseTo(25.8 / (0.046 + 2 * w.ohmPerM), 6);
    // the drivetrain buys one per motor
    expect(kart().choice.bill).toContainEqual({ id: 'fuse.blade-ato.30a', count: 2 });
  });

  it('refuses when no fuse can protect the wire', () => {
    const r = workflowById('fuse.select')!.run({ current: 24, ampacity: 16, voltage: 25.8 });
    expect(r.ok).toBe(false);
    expect(r.summary).toMatch(/heavier wire/);
    expect(lintCatalog().filter((x) => x.id.startsWith('fuse.'))).toEqual([]);
  });
});

describe('ways: as many as physics allows', () => {
  it('electric power into travel has many answers, against the ground, a fluid, a rail, a rope or nothing at all', () => {
    const ways = conceive('electric', 'travel');
    expect(ways.length).toBeGreaterThanOrEqual(10);
    const media = [...byMedium(ways).keys()];
    for (const m of ['ground', 'fluid', 'rail', 'rope', 'reaction mass'] as const) expect(media).toContain(m);
    const ids = ways.map((c) => c.ways.map((w) => w.id).join('>'));
    // not every way needs a wheel: a linear motor on its rail, a hub motor that is its own wheel, a thruster, a propeller
    expect(ids).toEqual(expect.arrayContaining(['motor.linear', 'motor.hub', 'ion.thruster', 'motor.rotary>propeller', 'motor.rotary>wheel']));
    // the one thing all of them need: something that turns electric power into motion
    for (const c of ways) expect(c.transducer, ids[ways.indexOf(c)]).not.toBeNull();
  });

  it('says which it can build now, and which are possible but not placeable until their parts are catalogued', () => {
    const ways = conceive('electric', 'travel');
    const find = (id: string) => ways.find((c) => c.ways.map((w) => w.id).join('>') === id)!;
    expect(find('motor.rotary>wheel').buildable).toBe(true);
    expect(find('motor.rotary>gear.reduce>wheel').buildable).toBe(true);
    expect(find('motor.rotary>propeller').buildable).toBe(false);
    expect(find('motor.rotary>propeller').missing.map((w) => w.id)).toEqual(['propeller']);
    expect(find('motor.linear').buildable).toBe(false);
  });

  it('chains through other flows: electric power into heat into a stroke is a thermal actuator', () => {
    expect(conceive('electric', 'translation').map((c) => c.ways.map((w) => w.id).join('>'))).toContain('joule.heating>thermal.actuator');
  });

  it('a chain seen whole is one converter: a kart is a motor for travel', () => {
    const c = conceive('electric', 'travel').find((x) => x.ways.map((w) => w.id).join('>') === 'motor.rotary>gear.reduce>wheel')!;
    const whole = asWhole(c);
    expect(whole.takes).toEqual(['electric']);
    expect(whole.gives).toEqual(['travel']);
    expect(whole.against).toBe('ground');
  });

  it('every way works by laws that exist and is done by blocks that exist', () => {
    for (const w of WAYS) {
      for (const l of w.laws) expect(lawById(l), `${w.id} cites ${l}`).toBeDefined();
      for (const a of w.embodiedBy) expect(ARCHETYPES.some((x) => x.id === a), `${w.id} by ${a}`).toBe(true);
      if (w.embodiedBy.length) expect(buildable(w), w.id).toBe(true);
    }
    expect(interpret('how do I turn electricity into motion?')).toEqual({ do: 'conceive', from: 'electric', to: 'travel' });
  });
});

// Embodiment (docs/NEXUS-FROM-REALITY.md, section 28): the printer generated and built as hardware, round by round. Each
// test holds a law the experiment found or updated (src/nexus/embody/journal.ts), not an example's numbers.

import { describe, expect, it } from 'vitest';
import { printer } from '../../src/nexus/asked';
import { AT_SPEED, embody, type Machine } from '../../src/nexus/embody/embody';
import { LAW_UPDATES } from '../../src/nexus/embody/journal';
import { boxOf, extentOf, part, placeParts, type Part } from '../../src/nexus/embody/part';
import { WINDING_CLASS } from '../../src/nexus/embody/stock';
import { find } from '../../src/nexus/embody/taxonomy';
import { buildSteps, loadPath, nodeAt, treeOf } from '../../src/nexus/embody/tree';
import { generate } from '../../src/nexus/manifold';
import { plainBrain, type WorldApi } from '../../src/nexus/view/brain';

const build = (o = {}) => { const i = printer(o); return embody(i, generate(i))!; };
const m: Machine = build();
const val = (name: string) => m.values.find((v) => v.name === name)!.value;

describe('the rounds', () => {
  it('remedy what they find until nothing a rule can remedy is left, and keep every round', () => {
    expect(m.rounds.length).toBeGreaterThan(1);
    expect(m.rounds.at(-1)!.flaws).toEqual([]);
    expect(m.rounds.at(-1)!.remedies).toEqual([]);
    for (const r of m.rounds.slice(0, -1)) expect(r.remedies.length).toBeGreaterThan(0);
    // each round keeps the machine it made and the sub-loops inside it
    for (const r of m.rounds) { expect(r.snapshot.length).toBe(r.parts); expect(r.trace.some((s) => s.stage === 'head')).toBe(true); expect(r.trace.some((s) => s.stage === 'motor')).toBe(true); }
  });

  it('hold a support that sags past its share from both sides, then make it thicker', () => {
    const all = m.rounds.flatMap((r) => r.remedies);
    expect(all).toContain('support it from both sides');
    expect(m.axes.filter((a) => a.ask.vertical).length).toBe(2);
    expect(val('support sag')).toBeLessThanOrEqual(1e-4 / 4);
  });
});

describe('the laws the experiment updated', () => {
  it('read a temperature the intent holds in kelvin as degrees Celsius where the parts\' rules want it', () => {
    for (const a of m.axes) {
      const Tw = a.motor.values.find((v) => v.name === 'winding temperature')!.value;
      expect(Tw).toBeGreaterThan(20);
      expect(Tw).toBeLessThan(WINDING_CLASS.maxC);
    }
    for (const c of m.electrical!.cables) expect(c.Tconductor).toBeLessThan(120);
  });

  it('lay the asked flow as streams slow enough for the motion, and accelerate within the time budget', () => {
    const n = m.hotEnd!.streams, w = val('stream width'), h = val('layer height'), v = val('deposition speed'), a = val('acceleration');
    expect(n).toBeGreaterThan(1);
    // v = Q / (n w h η): the flow back from the speed is the flow asked for a day's part
    const Q = v * n * w * h * AT_SPEED.value;
    expect(Q).toBeCloseTo(0.2 ** 3 / 86400, 12);
    // a = v² / (ℓ (1/η − 1)): a line as long as the part spends its share of the time changing speed
    expect(a).toBeCloseTo(v ** 2 / (0.2 * (1 / AT_SPEED.value - 1)), 9);
    const t = 0.2 / v + v / a;
    expect((0.2 / v) / t).toBeCloseTo(AT_SPEED.value, 9);
  });

  it('put no two solids in one place, and nothing fixed where a moving part sweeps', () => {
    expect(val('interferences')).toBe(0);
    expect(m.rounds.flatMap((r) => r.flaws).filter((f) => f.check === 'interference' || f.check === 'sweep')).toEqual([]);
  });

  it('rest each thing on what holds it: the z axes on the plate, the nozzle a layer above the support at the top of its travel', () => {
    const plate = m.parts.find((p) => p.id === 'base plate')!, top = boxOf(plate).c[1] + boxOf(plate).h[1];
    for (const z of ['z1', 'z2']) expect(extentOf(m.parts.filter((p) => p.id.startsWith(`${z}/`))).lo[1]).toBeCloseTo(top, 6);
    const surface = m.parts.find((p) => p.id === 'support/surface')!;
    expect(val('nozzle height') - (boxOf(surface).c[1] + boxOf(surface).h[1])).toBeCloseTo(val('layer height'), 9);
  });

  it('thread every fastener into parts that exist', () => {
    const ids = new Set(m.parts.map((p) => p.id));
    const fasteners = m.parts.filter((p) => p.into);
    expect(fasteners.length).toBeGreaterThan(20);
    for (const f of fasteners) for (const t of f.into!) expect(ids.has(t), `${f.id} → ${t}`).toBe(true);
  });

  it('tell every conductor in a cable apart by its colour', () => {
    for (const c of m.electrical!.cables) expect(new Set(c.conductors.map((x) => x.colour)).size, c.id).toBe(c.conductors.length);
  });

  it('are numbered in the order they were found', () => {
    LAW_UPDATES.forEach((l, i) => { expect(l.n).toBe(i + 1); expect(l.was).not.toBe(l.now); });
  });
});

describe('what holds it and how it goes together', () => {
  it('holds every part: a load path from the ground through what it touches or is fastened into', () => {
    expect(loadPath(m.parts).floating.map((p) => p.id)).toEqual([]);
    expect(m.parts.find((p) => p.id === 'spool/axle')!.into).toEqual(['spool/bracket']);
  });
  it('knows a motor as its subsystems: what turns, what holds the field, what holds the two apart', () => {
    const motor = nodeAt(treeOf(m.parts), 'x/motor')!;
    expect(motor.children.map((c) => c.name).sort()).toEqual(['bearings', 'encoder', 'fasteners', 'housing', 'rotor', 'stator']);
    expect(motor.parts.length).toBe(m.parts.filter((p) => p.id.startsWith('x/motor/')).length);
  });
  it('builds a motor from the inside out, every part once, fasteners last', () => {
    const steps = buildSteps(m.parts, 'x/motor'), order = steps.map((s2) => s2.node.split('/').at(-1));
    expect(steps.flatMap((s2) => s2.parts).sort()).toEqual(m.parts.filter((p) => p.id.startsWith('x/motor/')).map((p) => p.id).sort());
    expect(order.indexOf('rotor')).toBeLessThan(order.indexOf('housing'));
    expect(order.indexOf('stator')).toBeLessThan(order.indexOf('housing'));
    expect(steps.at(-1)!.title).toMatch(/fasten/);
  });
  it('builds the whole machine from the ground up, every part once', () => {
    const steps = buildSteps(m.parts), parts = steps.flatMap((s2) => s2.parts);
    expect(new Set(parts).size).toBe(parts.length);
    expect(parts.length).toBe(m.parts.length);
    const first = (re: RegExp) => steps.findIndex((s2) => re.test(s2.node));
    expect(first(/^frame/)).toBeLessThan(first(/^z1/));
    expect(first(/^z1/)).toBeLessThan(first(/^support/));
  });
});

describe('every part', () => {
  it('has a place in the taxonomy and a mass', () => {
    for (const p of m.parts) {
      const path = p.category.split('/');
      expect(find(path.slice(0, 2).join('/')) ?? find(path[0]!), p.category).not.toBeNull();
      expect(p.mass).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('a new ask', () => {
  it('builds a machine for a larger part, its frame larger to hold it', () => {
    const big = build({ size: 0.3 });
    // the loop ends before its rounds run out, every flaw left located, with no remedy that would still apply
    expect(big.rounds.length).toBeLessThan(16);
    expect(big.rounds.at(-1)!.flaws.filter((f) => f.remedy)).toEqual([]);
    expect(big.hotEnd!.streams).toBeLessThanOrEqual(Math.floor(0.3 / 8e-3));
    expect(big.size[0]).toBeGreaterThan(m.size[0]);
    expect(big.parts.find((p) => p.id === 'support')!.name).toContain('320');
  });
});

describe('placing an assembly', () => {
  const block = (at: [number, number, number], size: [number, number, number]): Part => part({ id: 'b', name: 'b', category: 'structure/frame', material: 'm', shape: { kind: 'block', size }, at, values: [] }, 1000);
  it('turns +z to the axis asked and rolls it in quarter turns about it, keeping every size', () => {
    const [p] = placeParts([block([0, 1, 2], [1, 2, 3])], 'y', [0, 0, 0], 1);
    expect(p!.at.map((x) => Math.round(x * 1e9) / 1e9)).toEqual([-1, 2, 0]);
    expect([...(p!.shape as { size: number[] }).size].sort()).toEqual([1, 2, 3]);
    // four quarter turns are none
    const [q] = placeParts([block([0.3, 0.1, -0.2], [1, 2, 3])], 'x', [0, 0, 0], 4), [r] = placeParts([block([0.3, 0.1, -0.2], [1, 2, 3])], 'x', [0, 0, 0], 0);
    expect(q!.at).toEqual(r!.at);
  });
});

describe('the plain reading of what a person says', () => {
  const calls: string[] = [];
  const world: WorldApi = {
    brief: () => 'a 3D printer', find: () => [], part: () => null, selected: () => null,
    focus: (t) => { calls.push(`focus ${t}`); return `there: ${t}`; },
    explode: (t, a) => { calls.push(`explode ${t} ${a}`); return 'ok'; },
    note: async (t, k, x) => { calls.push(`note ${t}|${k}|${x}`); return 'noted'; },
    rebuild: (a) => { calls.push(`rebuild ${JSON.stringify(a)}`); return 'rebuilt'; },
    replay: () => { calls.push('replay'); return 'again'; },
    expand: (t) => { calls.push(`expand ${t}`); return 'out'; },
    build: (t) => { calls.push(`build ${t}`); return 'built'; },
    show: (p) => { calls.push(`show ${p}`); return 'shown'; },
    make: (w) => { calls.push(`make ${w}`); return 'made'; },
    flaws: () => { calls.push('flaws'); return 'listed'; },
    operate: () => { calls.push('operate'); return 'operated'; },
    again: (d) => { calls.push(`again ${d}`); return 'tried'; },
  };
  const b = plainBrain(world), ac = new AbortController();
  it('takes apart, puts back, shows, notes, rebuilds, replays, and tries again with a demand', async () => {
    await b.ask('take the hot end apart', () => undefined, ac.signal);
    await b.ask('put it back together', () => undefined, ac.signal);
    await b.ask('show me the y motor', () => undefined, ac.signal);
    await b.ask('note on the y motor: it is too loud', () => undefined, ac.signal);
    await b.ask('make it bigger, 300 mm', () => undefined, ac.signal);
    await b.ask('run it again', () => undefined, ac.signal);
    await b.ask('expand the x motor', () => undefined, ac.signal);
    await b.ask('build the printer', () => undefined, ac.signal);
    await b.ask('show me the rounds', () => undefined, ac.signal);
    await b.ask('hide everything', () => undefined, ac.signal);
    await b.ask('build me a cabin of 40 m² for 2 people', () => undefined, ac.signal);
    await b.ask('show me the flaws', () => undefined, ac.signal);
    await b.ask('show me the process from the start', () => undefined, ac.signal);
    await b.ask('no, it has to carry 300 kg', () => undefined, ac.signal);
    await b.ask('the wheels need a guard, mud will hit the battery', () => undefined, ac.signal);
    await b.ask('mud from the wheels will hit the battery', () => undefined, ac.signal);
    expect(calls.slice(-4)).toEqual(['replay', 'again no, it has to carry 300 kg', 'again the wheels need a guard, mud will hit the battery', 'again mud from the wheels will hit the battery']);
    calls.splice(-4);
    expect(calls).toEqual(['explode hot end 1', 'explode all 0', 'focus y motor', 'note the y motor|flaw|it is too loud', 'rebuild {"size":0.3}', 'again run it again', 'expand x motor', 'build the machine', 'show rounds', 'show none', 'make build me a cabin of 40 m² for 2 people', 'flaws']);
  });
});

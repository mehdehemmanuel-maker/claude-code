// Evidence on every node and every value (src/nexus/evidence.ts): each node's own read from what it is, the weakest
// carried along every wire, results that cannot be physical said, and nothing called validated because its tests pass.

import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { EVIDENCE, evidenceOf } from '../../src/nexus/evidence';
import { Engine, emptyBoard, placeBlock, wire } from '../../src/nexus/dataflow';
import { defaultsOf, portsOf } from '../../src/nexus/blocks';
import { parseUnit } from '../../src/ganglia/units';

const ev = (id: string) => evidenceOf(LIBRARY.get(id)!);

describe('each node\'s own evidence, read from what it is', () => {
  it('laws by their kind: a definition exact, a fundamental law derived, a material\'s law empirical, an approximation simplified', () => {
    expect(ev('law.weight').kind).toBe('exact'); expect(ev('law.first.law').kind).toBe('derived');
    expect(ev('law.ohm').kind).toBe('empirical'); expect(ev('law.pendulum.period').kind).toBe('simplified');
    // with what it assumes and where it stops
    expect(ev('law.radiation').limits.join(' ')).toMatch(/emissivity/); expect(ev('law.pendulum.period').assumptions.length).toBe(1);
  });
  it('a typed number given; a maker\'s model specified; a shape a design (hypothetical); a simulation simplified', () => {
    expect(ev('in.number').kind).toBe('given'); expect(ev('vehicle.model').kind).toBe('specified');
    expect(ev('shape.box').kind).toBe('hypothetical'); expect(ev('seed.house').kind).toBe('hypothetical');
    expect(ev('letgo').kind).toBe('simplified'); expect(ev('ai.ask').kind).toBe('hypothetical');
  });
  it('every node has one, and none is called validated against experiment because its tests pass', () => {
    for (const b of LIBRARY.values()) { const e = evidenceOf(b); expect(EVIDENCE, b.id).toContain(e.kind); expect(e.validation, b.id).not.toBe('validated against experiment'); }
    // laws the rest of the book reaches another way are compared with an independent reference
    expect(ev('law.ohm').validation).toBe('compared with an independent reference');
  });
});

describe('the weakest evidence carried along every wire', () => {
  it('a number typed into a definition stays given; into a material\'s law it is no stronger than empirical, and says which node made it so', async () => {
    const b = emptyBoard('t'), m = placeBlock(b, 'in.number', 0, 0, { value: 2, unit: 'kg' }), w = placeBlock(b, 'law.weight', 0, 0, { g: 9.80665 });
    const i = placeBlock(b, 'in.number', 0, 0, { value: 2, unit: 'A' }), o = placeBlock(b, 'law.ohm', 0, 0, { R: 5 });
    wire(b, m, 'value', w, 'm'); wire(b, i, 'value', o, 'I');
    const e = new Engine(b); await e.run();
    expect(e.state.get(w)!.evidence).toEqual({ kind: 'given', from: [m] });
    expect(e.state.get(o)!.evidence).toEqual({ kind: 'empirical', from: [o] });
  });
  it('a result that cannot be physical is said on the node that gave it: a mass below nothing', async () => {
    const b = emptyBoard('t'), a = placeBlock(b, 'in.number', 0, 0, { value: 1, unit: 'kg' }), s = placeBlock(b, 'math.subtract', 0, 0, { b: 3 });
    wire(b, a, 'value', s, 'a');
    const e = new Engine(b); await e.run();
    expect(e.state.get(s)!.out!.result).toBe(-2);
    expect(e.state.get(s)!.warnings?.[0]).toMatch(/cannot be below nothing/);
  });
});

describe('units every port is in', () => {
  it('every port\'s unit is one the units parser reads, or a currency: a value in a unit nothing reads can be neither converted nor checked', () => {
    const bad: string[] = [];
    for (const b of LIBRARY.values()) { let ps; try { ps = portsOf(b, defaultsOf(b)); } catch { continue; } for (const p of [...ps.inputs, ...ps.outputs]) if (p.unit && !/^(USD|EUR|GBP)$/.test(p.unit)) { try { parseUnit(p.unit); } catch { bad.push(`${b.id}.${p.name}: ${p.unit}`); } } }
    expect(bad).toEqual([]);
  });
});

describe('uncertainty carried along wires', () => {
  const run = async (b: ReturnType<typeof emptyBoard>) => { const e = new Engine(b); await e.run(); return e; };
  it('a reading\'s ± goes through a law to first order: 2 ± 0.1 kg weighs 19.6 ± 0.98 N', async () => {
    const b = emptyBoard('t'), m = placeBlock(b, 'in.number', 0, 0, { value: 2, unit: 'kg', pm: '0.1' }), w = placeBlock(b, 'law.weight', 0, 0, { g: 9.80665 });
    wire(b, m, 'value', w, 'm');
    const e = await run(b);
    expect(e.state.get(m)!.uncertainty).toEqual({ value: 0.1 });
    expect(e.state.get(w)!.out!.W).toBeCloseTo(19.6133, 4); expect(e.state.get(w)!.uncertainty!.W).toBeCloseTo(0.980665, 6);
  });
  it('one source into two inputs moves together (x times x is 2x δx, not √2 x δx); two sources add in quadrature', async () => {
    const b = emptyBoard('t'), x = placeBlock(b, 'in.number', 0, 0, { value: 3, pm: '0.1' }), sq = placeBlock(b, 'math.multiply', 0, 0, {});
    wire(b, x, 'value', sq, 'a'); wire(b, x, 'value', sq, 'b');
    const y = placeBlock(b, 'in.number', 0, 0, { value: 4, pm: '0.2' }), pr = placeBlock(b, 'math.multiply', 0, 0, {});
    wire(b, x, 'value', pr, 'a'); wire(b, y, 'value', pr, 'b');
    const e = await run(b);
    expect(e.state.get(sq)!.uncertainty!.result).toBeCloseTo(0.6, 9);
    expect(e.state.get(pr)!.uncertainty!.result).toBeCloseTo(Math.hypot(4 * 0.1, 3 * 0.2), 9);
  });
  it('a ± in millimetres arrives in metres; a ± that is not one fails its node in words; none at all stays none', async () => {
    const b = emptyBoard('t'), l = placeBlock(b, 'in.number', 0, 0, { value: 500, unit: 'mm', pm: '2' }), t = placeBlock(b, 'law.pendulum.period', 0, 0, {});
    wire(b, l, 'value', t, 'L');
    const bad = placeBlock(b, 'in.number', 0, 0, { value: 1, pm: '-1' }), plain = placeBlock(b, 'in.number', 0, 0, { value: 1 });
    const e = await run(b), T = e.state.get(t)!.out!.T as number;
    // T = 2π√(L/g): δT = T δL / 2L, to first order (the root bends over ±δL: a share of a few in a million)
    expect(e.state.get(t)!.uncertainty!.T / (T * 0.002 / (2 * 0.5))).toBeCloseTo(1, 5);
    expect(e.state.get(bad)!.error).toMatch(/not an uncertainty/); expect(e.state.get(plain)!.uncertainty).toBeUndefined();
  });
  it('changing only a ± runs again what it feeds', async () => {
    const b = emptyBoard('t'), m = placeBlock(b, 'in.number', 0, 0, { value: 2, unit: 'kg', pm: '0.1' }), w = placeBlock(b, 'law.weight', 0, 0, { g: 9.80665 });
    wire(b, m, 'value', w, 'm');
    const e = await run(b); b.nodes[m]!.set = { ...b.nodes[m]!.set, pm: '0.2' }; e.touch(m); await e.run();
    expect(e.state.get(w)!.uncertainty!.W).toBeCloseTo(1.96133, 6);
  });
});

describe('extrapolation carried, and what is conserved checked', () => {
  it('a law asked to go past where it holds says so, and everything that rests on it says it rests on an extrapolation', async () => {
    const b = emptyBoard('t'), c = placeBlock(b, 'law.cantilever.root-moment', 0, 0, { P: 100, a: 1, q: 10, ell: 0.6, outside: 'extrapolate' }), d = placeBlock(b, 'math.multiply', 0, 0, { b: 2 });
    wire(b, c, 'M', d, 'a');
    const e = new Engine(b); await e.run();
    expect(e.state.get(c)!.warnings!.join(' ')).toMatch(/extrapolated/);
    expect(e.state.get(d)!.extrapolated).toEqual([c]);
  });
  it('a balance says when what goes in is not what comes out and is kept, and carries the inputs\' ± into the imbalance', async () => {
    const b = emptyBoard('t'), a = placeBlock(b, 'in.number', 0, 0, { value: 100, unit: 'J', pm: '3' }), o = placeBlock(b, 'in.number', 0, 0, { value: 90, unit: 'J', pm: '4' });
    const k = placeBlock(b, 'check.balance', 0, 0, { tol: 0.01 }); wire(b, a, 'value', k, 'in'); wire(b, o, 'value', k, 'out');
    const e = new Engine(b); await e.run(); const s = e.state.get(k)!;
    expect(s.out!.imbalance).toBeCloseTo(10, 9); expect(s.uncertainty!.imbalance).toBeCloseTo(5, 9);
    expect(s.warnings!.join(' ')).toMatch(/energy is not conserved/);
  });
});

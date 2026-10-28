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

// The runtime (src/nexus/runtime.ts, src/nexus/journal.ts): the state as a fold over one append-only journal, the
// constraint store, and the loop that evaluates again only what reads what changed. Laws are the kept ones; the leaves
// are given or measured with their origins; nothing here is an object, a kind or an intent.

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { lawById } from '../../src/nexus/book';
import { LINE_WEIGHT, RECT_AREA, RECT_I, RECT_MODULUS } from '../../src/nexus/book/slice';
import { address, MemorySink } from '../../src/nexus/journal';
import { bound, instance, Runtime } from '../../src/nexus/runtime';
import { FileSink } from '../../src/nexus/sink-file';
import { leaf } from '../../src/nexus/term';
import { explain } from '../../src/nexus/why';

const person = 'the person';
const given = (at: string, name: string, v: number, unit: string) => ({ kind: 'leaf' as const, at, leaf: leaf(name, v, unit, { class: 'given', by: person, grounds: 'what the person said' }) });
const measured = (at: string, name: string, v: number, unit: string, u: number) => ({ kind: 'leaf' as const, at, leaf: leaf(name, v, unit, { class: 'measured', source: 'a tape', window: 'one reading' }, u) });
const site = (at: string, name: string, v: number, unit: string) => ({ kind: 'leaf' as const, at, leaf: leaf(name, v, unit, { class: 'measured', source: 'the site', window: 'as stated' }) });

/** A bar of a section, its weight per length, and the section's second moment: two chains from the same breadth and depth. */
function bar(rt: Runtime) {
  const at = (q: string) => address('the bar', q);
  rt.admit(given(at('b'), 'breadth', 0.038, 'm'));
  rt.admit(given(at('h'), 'depth', 0.184, 'm'));
  rt.admit(site(at('rho'), 'density of what it is made of', 530, 'kg/m^3'));
  rt.admit(site(at('g'), 'gravity', 9.80665, 'm/s^2'));
  rt.admit(instance(LINE_WEIGHT, at('q'), { rho: at('rho'), b: at('b'), h: at('h'), g: at('g') }));
  rt.admit(instance(RECT_I, at('I'), { b: at('b'), h: at('h') }));
  rt.admit(instance(RECT_AREA, at('A'), { b: at('b'), h: at('h') }));
  return at;
}

describe('the state is a fold over the journal, and only what reads a change is evaluated again', () => {
  it('a law put to work at addresses binds its output as a derivation whose WHY ends in the leaves and their origins', () => {
    const rt = Runtime.open();
    const at = bar(rt);
    expect(rt.binding(at('q'))!.value).toBeCloseTo(530 * 0.038 * 0.184 * 9.80665, 9);
    const text = explain(rt.why(at('q'))!);
    expect(text).toMatch(/breadth = 0\.038 m \[given\] ← given \(what the person said\) by the person/);
    expect(text).toMatch(/density of what it is made of = 530 kg\/m\^3 \[measured\] ← measured: the site/);
  });

  it('changing the density evaluates the weight again and nothing else; changing the depth evaluates all three that read it', () => {
    const rt = Runtime.open();
    const at = bar(rt);
    const I = rt.binding(at('I'))!.hash;
    const density = rt.admit(site(at('rho'), 'density of what it is made of', 400, 'kg/m^3'));
    expect(density.evaluated).toBe(1);
    expect(density.changed).toEqual([at('rho'), at('q')]);
    expect(rt.binding(at('I'))!.hash).toBe(I);
    const depth = rt.admit(given(at('h'), 'depth', 0.235, 'm'));
    expect(depth.evaluated).toBe(3);
    expect(rt.binding(at('I'))!.value).toBeCloseTo(0.038 * 0.235 ** 3 / 12, 15);
  });

  it('a runtime opened on the journal is the same state: every binding has the same identity, and nothing is evaluated that the journal does not hold', () => {
    const sink = new MemorySink();
    const a = Runtime.open(sink);
    const at = bar(a);
    a.admit(site(at('rho'), 'density of what it is made of', 400, 'kg/m^3'));
    const b = Runtime.open(sink);
    expect(b.addresses().sort()).toEqual(a.addresses().sort());
    for (const k of a.addresses()) expect(b.binding(k)!.hash).toBe(a.binding(k)!.hash);
    expect(b.journal.contributions().length).toBe(a.journal.contributions().length);
  });

  it('the journal survives the process: written to a file, read back term by term against each term\'s identity', () => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-journal-'));
    try {
      const path = join(dir, 'journal.jsonl');
      const at = bar(Runtime.open(new FileSink(path)));
      const back = Runtime.open(new FileSink(path));
      expect(back.binding(at('q'))!.value).toBeCloseTo(530 * 0.038 * 0.184 * 9.80665, 9);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('a term changed on disk is refused when read back, never silently taken', () => {
    const sink = new MemorySink();
    bar(Runtime.open(sink));
    sink.lines[0] = sink.lines[0]!.replace('0.038', '0.039');
    expect(() => Runtime.open(sink)).toThrow(/is not the term written/);
  });
});

describe('what the state lacks is a gap at an address, never a sentence', () => {
  it('a relation waiting on an address nothing binds names that address', () => {
    const rt = Runtime.open();
    const at = (q: string) => address('a section', q);
    rt.admit(given(at('b'), 'breadth', 0.038, 'm'));
    const c = rt.admit(instance(RECT_MODULUS, at('S'), { b: at('b'), h: at('h') }));
    expect(c.gaps).toEqual([{ kind: 'unbound', at: at('S'), relation: expect.any(String), waitingOn: [at('h')] }]);
    expect(rt.admit(given(at('h'), 'depth', 0.089, 'm')).gaps).toEqual([]);
  });

  it('a want is a constraint whose origin is a person: unmet, it is located at the addresses it bounds; met once the state changes', () => {
    const rt = Runtime.open();
    const at = bar(rt);
    const want = bound(at('q'), 'at most', leaf('lightest it may be', 30, 'N/m', { class: 'given', by: person, grounds: 'what the person said' }), person, 'it weighs no more than 30 N per metre');
    const c = rt.admit(want);
    expect(c.gaps).toEqual([{ kind: 'unmet', constraint: expect.any(String), says: 'it weighs no more than 30 N per metre', by: person, at: [at('q')], record: expect.anything() }]);
    expect(rt.admit(site(at('rho'), 'density of what it is made of', 400, 'kg/m^3')).gaps).toEqual([]);
  });

  it('a measurement where a law derives a value is compared with it: within its uncertainty nothing; past it, an anomaly at the address, journalled once', () => {
    const rt = Runtime.open();
    const at = bar(rt);
    const A = 0.038 * 0.184;
    expect(rt.admit(measured(at('A'), 'area measured', A * 1.001, 'm^2', A * 0.01)).gaps).toEqual([]);
    const c = rt.admit(measured(at('A'), 'area measured', A * 1.2, 'm^2', A * 0.01));
    expect(c.gaps.map((g) => [g.kind, 'at' in g ? g.at : null])).toEqual([['anomaly', at('A')]]);
    rt.admit(given(at('note'), 'a note', 1, '1'));
    expect(rt.journal.all().filter((e) => e.kind === 'anomaly').length).toBe(1);
  });

  it('a law refuses inputs outside its domain, and the refusal is at the address it would have bound', () => {
    const rt = Runtime.open();
    const at = (q: string) => address('a copper run', q);
    rt.admit(given(at('R0'), 'resistance at the reference', 0.3, 'ohm'));
    rt.admit(given(at('T0'), 'reference temperature', 20, 'degC'));
    rt.admit(given(at('T'), 'temperature', 250, 'degC'));
    const c = rt.admit(instance(lawById('copper.tempco'), at('R'), { R0: at('R0'), T: at('T'), T0: at('T0') }));
    expect(c.gaps).toEqual([{ kind: 'refused', at: at('R'), relation: expect.any(String), domain: expect.stringMatching(/between −50 and 200 °C/) }]);
    expect(rt.admit(given(at('T'), 'temperature', 80, 'degC')).gaps).toEqual([]);
  });

  it('a relation that would close a loop is held out: propagation cannot settle it, and the gap says so', () => {
    const rt = Runtime.open();
    const at = (q: string) => address('a loop', q);
    rt.admit(instance(RECT_AREA, at('A'), { b: at('b'), h: at('h') }));
    const c = rt.admit(instance(RECT_AREA, at('b'), { b: at('A'), h: at('h') }, 'b from A'));
    expect(c.gaps.some((g) => g.kind === 'cycle' && g.at === at('b'))).toBe(true);
  });
});

// One registry of quantities, one set of constants, one source type, and each law's kind (docs/REALITY.md, step 2).

import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BOOK, KINDS, KIND_SAYS, CONST } from '../../src/nexus/book';
import { QUANTITIES, meaning, quantityOf } from '../../src/nexus/quantities';
import { CONSTANTS } from '../../src/data/constants';
import { dimOf, dimText, sameDim } from '../../src/nexus/dimension';
import { toSI } from '../../src/ganglia/units';

describe('quantities', () => {
  it('every port of every law is a registered quantity of its own dimension', () => {
    const none: string[] = [];
    for (const l of BOOK) for (const p of [...l.inputs, l.output]) { const x = quantityOf(l, p); if (!x) none.push(`${l.id}.${p.sym} (${p.name})`); else expect(sameDim(x.dim, dimOf(p.unit)), `${l.id}.${p.sym}`).toBe(true); }
    expect(none).toEqual([]);
  });
  it('each quantity has a unit the units parser reads, a sentence, and an id once', () => {
    for (const x of QUANTITIES) { expect(() => dimOf(x.unit), x.id).not.toThrow(); expect(x.says.length, x.id).toBeGreaterThan(10); }
    expect(new Set(QUANTITIES.map((x) => x.id)).size).toBe(QUANTITIES.length);
  });
  it('one letter, different things, are told apart: E an energy in one law, a modulus in another', () => {
    const at = (id: string, sym: string) => { const l = BOOK.find((x) => x.id === id)!; return quantityOf(l, [...l.inputs, l.output].find((p) => p.sym === sym)!)!.id; };
    expect(at('energy.kinetic', 'E')).toBe('energy'); expect(at('sound.speed', 'E')).toBe('modulus');
    // one dimension, two things: a torque is not an energy; a stress is not a pressure
    expect(at('wheel.torque', 'T')).toBe('torque'); expect(at('first.law', 'dU')).toBe('energy');
    expect(at('stress.hoop', 'sigma')).toBe('stress'); expect(at('stress.hoop', 'p')).toBe('pressure');
    expect(meaning(BOOK.find((l) => l.id === 'ohm')!, { sym: 'R', unit: 'ohm', name: 'resistance' })).toBe('R, the resistance in Ohm\'s law: an electrical resistance (volts it takes to push each ampere through), in ohm.');
  });
  it('the mole is a dimension: a molar quantity is not a plain number', () => {
    expect(dimText(dimOf('J/mol K'))).toBe('kg m^2 s^-2 K^-1 mol^-1');
    expect(sameDim(dimOf('mol'), dimOf('1'))).toBe(false);
  });
});

describe('what each law is', () => {
  it('every law of the book has a kind and a reason, and nothing else does', () => {
    const ids = new Set(BOOK.map((l) => l.id));
    expect(BOOK.filter((l) => !KINDS[l.id]).map((l) => l.id)).toEqual([]);
    expect(Object.keys(KINDS).filter((k) => !ids.has(k))).toEqual([]);
    for (const [id, [kind, why]] of Object.entries(KINDS)) { expect(KIND_SAYS[kind], id).toBeDefined(); expect(why.length, id).toBeGreaterThan(3); }
  });
  it('kinds read as they should for laws whose kind is not in doubt', () => {
    expect(KINDS['first.law']![0]).toBe('fundamental'); expect(KINDS['hooke']![0]).toBe('constitutive');
    expect(KINDS['pendulum.period']![0]).toBe('approximation'); expect(KINDS['kleiber.scaling']![0]).toBe('empirical');
    expect(KINDS['reynolds']![0]).toBe('definition'); expect(KINDS['section.rect.second-moment']![0]).toBe('geometry');
  });
});

describe('one set of constants', () => {
  it('the book\'s constants are the set\'s, in its units', () => {
    for (const k of ['g', 'c', 'h', 'kB', 'R', 'F', 'sigmaSB', 'G', 'mu0', 'eps0', 'e', 'NA', 'me', 'mu'] as const) {
      const leaf = CONST[k], c = CONSTANTS[k];
      expect(leaf.value, k).toBe(toSI(c.value, c.unit));
    }
    // the exact ones agree with each other: R = k_B N_A, F = e N_A
    expect(CONSTANTS.R.value).toBeCloseTo(CONSTANTS.kB.value * CONSTANTS.NA.value, 8);
    expect(CONSTANTS.F.value).toBeCloseTo(CONSTANTS.e.value * CONSTANTS.NA.value, 4);
  });
  it('no other code defines one of them again', () => {
    const root = join(__dirname, '../../src'), files: string[] = [];
    const walk = (d: string) => { for (const x of readdirSync(d)) { const p = join(d, x); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.ts')) files.push(p); } };
    walk(root);
    const again = files.filter((f) => !f.endsWith('data/constants.ts')).filter((f) => /(=|return)\s*(9\.80665|5\.670374419e-8|96485(\.33212)?|6\.6743e-11|1\.380649e-23|8\.314462618|299792458|6\.62607015e-34|6\.02214076e23)\b/.test(readFileSync(f, 'utf8')));
    expect(again).toEqual([]);
  });
});

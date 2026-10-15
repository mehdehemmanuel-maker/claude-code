// A dimension is not a quantity.
//
// Metrology keeps three things apart and so does the code: a DIMENSION is algebra (kg m^-3); a KIND OF QUANTITY is
// a named sort (density, torque, length); a QUANTITY is that kind of a specific thing (this gear's density). Torque
// and kinetic energy are different kinds sharing one dimension, and binding a law's port by dimension alone cannot
// tell them apart — which is how a sprocket's pitch was once read as a pendulum's length.
//
// The vocabulary is DERIVED from the book's own port names, so these tests check the derivation against the book
// rather than against a list someone typed.
import { describe, expect, it } from 'vitest';
import { QUANTITY_KINDS, byHead, crowded, portFit, head, homonyms, plain } from '../../src/nexus/book/quantities';
import { BOOK } from '../../src/nexus/book';
import { dimOf, dimText } from '../../src/nexus/lang/dimension';

describe('the vocabulary, derived from the book', () => {
  it('holds every port name the book uses, and nothing else', () => {
    const named = new Set<string>();
    for (const l of BOOK) { for (const p of l.inputs) named.add(plain(p.name)); named.add(plain(l.output.name)); }
    expect(QUANTITY_KINDS.size).toBe(named.size);
    for (const n of named) expect(QUANTITY_KINDS.has(n), `${n} is in the vocabulary`).toBe(true);
    expect(QUANTITY_KINDS.size, 'the book really does speak of hundreds of distinct kinds').toBeGreaterThan(500);
  });

  it('each kind records the laws that take it and the laws that give it, correctly', () => {
    for (const k of [...QUANTITY_KINDS.values()].slice(0, 60)) {
      for (const id of k.takenBy) expect(BOOK.find((l) => l.id === id)!.inputs.some((p) => plain(p.name) === k.name)).toBe(true);
      for (const id of k.givenBy) expect(plain(BOOK.find((l) => l.id === id)!.output.name)).toBe(k.name);
      expect(k.takenBy.length + k.givenBy.length, `${k.name} is used somewhere`).toBeGreaterThan(0);
    }
  });

  it('a head drops qualifiers, so every radius is a radius and an extent keeps its axis out of it', () => {
    expect(head('wheel radius')).toBe('radius');
    expect(head('bend radius')).toBe('radius');
    expect(head('kinetic energy')).toBe('energy');
    expect(head('extent x')).toBe('extent');
    expect(head('extent z')).toBe('extent');
    expect(byHead().get('radius')!.length, 'the book names several radii').toBeGreaterThan(1);
  });

  it('reports where the BOOK itself uses one name for two dimensions', () => {
    const h = homonyms();
    expect(h.length, 'the book does contain such faults').toBeGreaterThan(0);
    for (const x of h) {
      expect(x.dims.length).toBeGreaterThan(1);
      // each really is used at every dimension it claims
      const used = new Set<string>();
      for (const id of x.laws) {
        const l = BOOK.find((y) => y.id === id)!;
        for (const p of [...l.inputs, l.output]) if (plain(p.name) === x.name) used.add(dimText(dimOf(p.unit)));
      }
      for (const d of x.dims) expect(used, `${x.name} at ${d}`).toContain(d);
    }
    // the one that matters most: a linear speed and an angular one under one word
    expect(h.map((x) => x.name)).toContain('speed');
  });

  it('measures how badly dimension-binding alone would do', () => {
    const c = crowded();
    const bare = c.find((x) => x.dim === '1')!;
    expect(bare.kinds.length, 'scores of unrelated kinds share the dimensionless 1').toBeGreaterThan(50);
    const work = c.find((x) => x.dim === 'kg m^2 s^-2');
    if (work) {
      // torque, energy and a bending moment are one dimension and three kinds
      expect(work.kinds.some((k) => /torque/.test(k))).toBe(true);
      expect(work.kinds.some((k) => /energy/.test(k))).toBe(true);
    }
  });
});

describe('grading what may fill a port', () => {
  const g = (offered: string, port: string, ou: string, pu: string) =>
    portFit(offered, { name: port, sym: 'q' }, dimOf(ou), dimOf(pu));

  it('the same name is exact', () => {
    expect(g('density', 'density', 'kg/m^3', 'kg/m^3')).toBe('exact');
    expect(g('Sprocket Teeth', 'sprocket teeth', '-', '-')).toBe('exact');
  });

  it('a qualified name of the same sort at the same dimension is kin', () => {
    expect(g('wheel radius', 'radius', 'm', 'm')).toBe('kin');
    expect(g('radius', 'bend radius', 'm', 'm')).toBe('kin');
  });

  it('a different kind at the same dimension is only ever stretched, never exact or kin', () => {
    // the two that caused real wrong answers
    expect(g('pitch', 'length', 'm', 'm')).toBe('stretched');
    expect(g('Froude number', 'sprocket teeth', '-', '-')).toBe('stretched');
    // and the one that would be worst: torque is not energy, whatever the algebra says
    expect(g('torque', 'kinetic energy', 'N m', 'J')).toBe('stretched');
    expect(g('bending moment', 'potential energy', 'N m', 'J')).toBe('stretched');
  });

  it('a different dimension is no match at all', () => {
    expect(g('mass', 'length', 'kg', 'm')).toBe('no');
    expect(g('density', 'volume', 'kg/m^3', 'm^3')).toBe('no');
  });
});

// The universal law observation table: for every law, the physical thing you can watch it on.
//
// Derived, not asserted — a law is connected to a thing when the thing HAS the quantities the law reads. These tests
// hold the derivation to three things it would be easy to fake: that a witness really does answer the ports claimed,
// that a port the thing cannot answer is listed as yours to supply (the recipe), and that a value some law merely
// says the thing WOULD have is never printed as a property it has.
import { describe, expect, it } from 'vitest';
import { observationTable, pointable, showsIt, tableLines, witnessesFor } from '../../src/nexus/substrate/witness';
import { know } from '../../src/nexus/substrate/derive';
import { lawById } from '../../src/nexus/book';
import { plain } from '../../src/nexus/book/quantities';
import { dimOf, sameDim } from '../../src/nexus/lang/dimension';

const things = pointable(6);

describe('a physical witness', () => {
  it('names a thing that really does answer every port it claims, in the right dimension', () => {
    for (const id of ['newton.second', 'energy.kinetic', 'inertia.disc', 'stress.axial']) {
      for (const w of witnessesFor(lawById(id), things)) {
        for (const g of w.gives) {
          const f = know(w.thing, g.port, undefined, 2);
          expect(f, `${w.thing} answers ${g.port}`).toBeTruthy();
          expect(f!.value).toBeCloseTo(g.value, 9);
          // and the answer is in the dimension the law's port is written in, not merely a name that matched
          const port = lawById(id).inputs.find((p) => p.name === g.port)!;
          expect(sameDim(dimOf(f!.unit), dimOf(port.unit)), `${g.port}: ${f!.unit} vs ${port.unit}`).toBe(true);
        }
      }
    }
  });

  it('lists every port the thing cannot answer as yours to supply, and that IS the recipe', () => {
    const w = witnessesFor(lawById('newton.second'), things)[0]!;
    expect(w.gives.map((g) => plain(g.port))).toContain('mass');
    expect(w.youSupply.map((s) => plain(s.port))).toContain('acceleration');
    expect(w.says).toMatch(/you supply acceleration/);
    // gives + youSupply is the whole law, with nothing dropped and nothing invented
    expect(w.gives.length + w.youSupply.length).toBe(lawById('newton.second').inputs.length);
  });

  it("never prints what a law says a thing WOULD have as something it has", () => {
    // A bobbin's mass comes out of its size and its material: it has that. A bobbin's "speed" comes out of
    // free-fall.speed reading its own height as a drop height — true arithmetic about a question nobody asked.
    for (const w of observationTable(undefined, things).rows) {
      for (const g of w.gives) {
        if (g.itsOwn) expect(g.how, `${w.thing}'s ${g.port} is claimed as its own`).toMatch(/inventory|mixing law|stated size|overall size/);
        else expect(g.how, `${w.thing}'s ${g.port} came out of a law, so it must not be claimed as its own`).not.toMatch(/^the inventory/);
      }
    }
    const kinetic = witnessesFor(lawById('energy.kinetic'), things)[0];
    if (kinetic && kinetic.gives.some((g) => !g.itsOwn)) expect(kinetic.says).toMatch(/WOULD be/);
  });

  it('a law with no witness is reported, with what it would need', () => {
    const t = observationTable(undefined, things);
    expect(t.unwitnessed.length, 'the book reaches well past what is in this environment').toBeGreaterThan(0);
    for (const u of t.unwitnessed) {
      expect(witnessesFor(lawById(u.law), things), `${u.law} really has none`).toEqual([]);
      expect(u.needs.length).toBe(lawById(u.law).inputs.length);
    }
  });

  it('every row carries its place on time’s tree, rooted at time', () => {
    for (const r of observationTable(undefined, things).rows.slice(0, 40)) {
      expect(r.onTimesTree[0]).toBe('time');
      expect(r.onTimesTree[r.onTimesTree.length - 1]).toBe(r.law);
      expect(r.completeness).toBeGreaterThan(0);
      expect(r.completeness).toBeLessThanOrEqual(1);
    }
  });

  it('the table prints, and the summary agrees with the rows', () => {
    const t = observationTable(undefined, things);
    const lines = tableLines(t, 4);
    expect(lines[0]).toBe('THE UNIVERSAL LAW OBSERVATION TABLE');
    const witnessed = new Set(t.rows.map((r) => r.law));
    expect(t.summary[0]).toContain(`${witnessed.size} of`);
    expect(t.summary[1]).toContain(`${t.rows.filter((r) => r.completeness === 1).length} are WHOLLY`);
    expect(showsIt('newton.second', things).length).toBeGreaterThan(0);
  });
});

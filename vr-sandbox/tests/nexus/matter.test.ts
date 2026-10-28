// One material system (src/nexus/matter.ts): every material a part carries said as exactly as it is known, every
// property with how it is known, a stand-in said as one, a family never passed off as a grade.

import { describe, expect, it } from 'vitest';
import { MATTER, densityOf, handbookOf, matterOf } from '../../src/nexus/matter';
import { DENSITY, massOf } from '../../src/nexus/mass';
import { ELEMENTS, MATERIALS as COMPOSITION } from '../../src/nexus/elements';
import { PERIODIC } from '../../src/data/periodic';
import { MATERIALS as HANDBOOK } from '../../src/data/materials';
import { strengthOf } from '../../src/nexus/loads';
import { surfaceOf } from '../../src/nexus/sim';

describe('every material a part carries', () => {
  it('is in the one table, with a family and what it is', () => {
    for (const id of Object.keys(DENSITY)) { const row = MATTER[id]; expect(row, id).toBeDefined(); expect(row!.is.length, id).toBeGreaterThan(2); }
    for (const [id, row] of Object.entries(MATTER)) if (row.handbook) expect(HANDBOOK.some((m) => m.id === row.handbook), id).toBe(true);
  });
  it('a family is never passed off as a grade: wood is unspecified, its numbers a stand-in, its family\'s span said', () => {
    const w = matterOf('wood');
    expect(w.specified).toBe(false); expect(w.is).toMatch(/species unsaid/);
    expect(w.props.find((p) => p.key === 'friction')!.evidence).toBe('stand-in');
    // a stand-in gives no strength: birch plywood's strength is not this wood's
    expect(w.props.some((p) => p.key === 'yield')).toBe(false); expect(strengthOf('wood')).toBeNull();
    const c = matterOf('concrete'); expect(c.specified).toBe(false); expect(c.is).toMatch(/mix and strength class unsaid/);
  });
  it('a specified grade has its handbook\'s numbers, each with its source and evidence', () => {
    const s = matterOf('steel-low');
    expect(s.handbook).toEqual({ id: 'steel.1018-cd', name: expect.stringMatching(/1018/), same: true });
    for (const k of ['density', 'E', 'yield', 'ultimate', 'friction', 'c', 'k', 'alpha', 'melts']) expect(s.props.find((p) => p.key === k), k).toBeDefined();
    for (const p of s.props) expect(p.source.length, p.key).toBeGreaterThan(5);
    // one steel throughout: its make-up is 1018's too
    expect(s.makeup.says).toMatch(/1018/);
  });
  it('the friction map no longer goes by spelling: tissue and tile are not titanium, platinum is not acrylic', () => {
    expect(surfaceOf('tissue').from).toMatch(/typical/);
    expect(surfaceOf('tile').from).toMatch(/clay-brick/);
    expect(surfaceOf('platinum').from).toMatch(/typical/);
    expect(handbookOf('tile')!.same).toBe(false);
  });
  it('a material that is one element weighs what that element does: silver and tin are not weightless', () => {
    for (const id of ['silver', 'tin', 'nickel']) if (COMPOSITION[id]) {
      const d = densityOf(id); expect(d, id).not.toBeNull(); expect(d!.value, id).toBeGreaterThan(5000);
      expect(massOf({ name: id, shape: { box: [0.01, 0.01, 0.01] }, mat: id }), id).toBeGreaterThan(0.005);
    }
  });
});

describe('the elements', () => {
  it('every element the compositions use has periodic data, its weight within 0.1 % of the kept IUPAC weight', () => {
    for (const [sym, e] of Object.entries(ELEMENTS)) { const p = PERIODIC[sym]; expect(p, sym).toBeDefined(); expect(Math.abs(p!.weight - e.w) / e.w, sym).toBeLessThan(1e-3); }
  });
  it('118 elements; the superheavy ones carry no predicted figures as if measured', () => {
    expect(Object.keys(PERIODIC).length).toBe(118);
    expect(PERIODIC['Fe']!.density).toBe(7874); expect(PERIODIC['Og']!.density).toBeNull();
  });
});

// Ego's language of form. Any tree of primitives, sections and operations is a shape; its mesh converges on the true
// surface and its mass properties are integrated exactly over that mesh; what can make it is read from what it is;
// a shape grown by its loads is checked as the real part; and a form read from a file is untrusted.

import { describe, expect, it } from 'vitest';
import { parseForm, FormError, sectionArea, nacaPoints, bounds, describe as say, genome, type Form } from '../../src/forms/form';
import { solid, boxes, overhangs, massProps } from '../../src/forms/mesh';
import { routes, makeIn } from '../../src/forms/make';
import { growShape, grownSection } from '../../src/forms/topopt';
import { formFromWords, invent } from '../../src/forms/say';
import { getPartKind, massOf } from '../../src/parts/registry';
import { getMaterial } from '../../src/data/materials';
import { interpret } from '../../src/assistant/intent';
import { attempt, challengeById } from '../../src/ganglia';

const rel = (a: number, b: number) => Math.abs(a / b - 1);

describe('forms: shapes from a small tree', () => {
  it('meshes converge on the exact volume as the grid is refined', () => {
    const cases: [Form, number][] = [
      [{ f: 'sphere', r: 0.05 }, (4 / 3) * Math.PI * 0.05 ** 3],
      [{ f: 'cylinder', r: 0.02, h: 0.1 }, Math.PI * 0.02 ** 2 * 0.1],
      [{ f: 'torus', R: 0.05, r: 0.01 }, 2 * Math.PI ** 2 * 0.05 * 0.01 ** 2],
      [{ f: 'extrude', sec: { s: 'ring', ro: 0.02, ri: 0.015 }, h: 0.1 }, Math.PI * (0.02 ** 2 - 0.015 ** 2) * 0.1],
      [{ f: 'subtract', from: { f: 'box', x: 0.1, y: 0.1, z: 0.02 }, take: [{ f: 'move', of: { f: 'cylinder', r: 0.02, h: 0.1 }, q: [Math.SQRT1_2, 0, 0, Math.SQRT1_2] }] }, 0.1 * 0.1 * 0.02 - Math.PI * 0.02 ** 2 * 0.02],
    ];
    for (const [f, exact] of cases) {
      const coarse = rel(solid(f, 32).mass.volume, exact), fine = rel(solid(f, 64).mass.volume, exact);
      expect(fine, say(f)).toBeLessThan(0.015);
      expect(fine, say(f)).toBeLessThan(coarse);
    }
  });

  it('integrates mass properties exactly over a mesh: a unit cube by hand', () => {
    // a closed cube from 0 to 1, twelve outward triangles
    const P = Float64Array.from([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1]);
    const I = Uint32Array.from([0, 2, 1, 0, 3, 2, 4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 2, 3, 7, 2, 7, 6, 1, 2, 6, 1, 6, 5, 0, 4, 7, 0, 7, 3]);
    const m = massProps({ positions: P, indices: I });
    expect(m.volume).toBeCloseTo(1, 12);
    expect(m.centroid).toEqual([0.5, 0.5, 0.5].map((x) => expect.closeTo(x, 12)));
    // about its centre: (1² + 1²)/12 for a unit cube of unit density
    expect(m.inertia.slice(0, 3)).toEqual([1 / 6, 1 / 6, 1 / 6].map((x) => expect.closeTo(x, 12)));
    expect(m.area).toBeCloseTo(6, 12);
    // and a sphere's inertia from its mesh: 2/5 m r²
    const s = solid({ f: 'sphere', r: 0.05 }, 64).mass;
    expect(rel(s.inertia[0], 0.4 * s.volume * 0.05 ** 2)).toBeLessThan(0.01);
  });

  it('an aerofoil is the NACA four-digit section, area as its formula gives', () => {
    const pts = nacaPoints('0012', 1);
    // symmetric, 12% thick at about 30% chord
    const at30 = pts.filter((p) => Math.abs(p[0] - 0.3) < 0.03).map((p) => p[1]);
    expect(Math.max(...at30) - Math.min(...at30)).toBeCloseTo(0.12, 2);
    // its area is twice the thickness curve integrated by hand (closed trailing edge): 10 t (0.2969·2/3 − 0.126/2 − 0.3516/3 + 0.2843/4 − 0.1036/5)
    const exact = 10 * 0.12 * (0.2969 * (2 / 3) - 0.126 / 2 - 0.3516 / 3 + 0.2843 / 4 - 0.1036 / 5);
    expect(rel(sectionArea({ s: 'naca', code: '0012', chord: 1 }), exact)).toBeLessThan(0.005);
  });

  it('collides as its solid: a ring keeps its hole, a lattice by the body it fills', () => {
    const ring = boxes({ f: 'extrude', sec: { s: 'ring', ro: 0.05, ri: 0.03 }, h: 0.02 });
    expect(ring.some((b) => Math.abs(b.center[0]) < b.half[0] && Math.abs(b.center[1]) < b.half[1])).toBe(false);
    const lat = boxes({ f: 'lattice', of: { f: 'box', x: 0.05, y: 0.05, z: 0.05 }, kind: 'gyroid', cell: 0.0125, t: 0.001 });
    expect(lat.reduce((s, b) => s + 8 * b.half[0] * b.half[1] * b.half[2], 0)).toBeCloseTo(0.05 ** 3, 8);
  });

  it('says which way up prints with least support', () => {
    // a mushroom: a cap on a stem overhangs printed stem down; flat cap down it doesn't
    const mushroom: Form = { f: 'union', of: [{ f: 'cylinder', r: 0.005, h: 0.04 }, { f: 'move', of: { f: 'cylinder', r: 0.02, h: 0.005 }, p: [0, 0.02, 0] }] };
    const o = overhangs(solid(mushroom, 48).mesh);
    expect(o[0]!.up).toBe('-y');
    expect(o.find((x) => x.up === '+y')!.share).toBeGreaterThan(o[0]!.share + 0.05);
  });
});

describe('forms: what can make them', () => {
  const can = (f: Form) => routes(f).filter((r) => r.can).map((r) => r.process);
  it('reads the process from the shape', () => {
    expect(can({ f: 'extrude', sec: { s: 'ring', ro: 0.0125, ri: 0.0105 }, h: 0.5 })).toContain('saw');
    expect(can({ f: 'revolve', sec: { s: 'polygon', pts: [[0, 0], [0.02, 0], [0.02, 0.01], [0.01, 0.03], [0, 0.03]] } })).toContain('turn');
    expect(can(formFromWords('a 100 x 50 x 20 mm block with a 10 mm hole')!)).toContain('mill');
    const gyroid = formFromWords('a 60 mm cube filled with a gyroid lattice of 12 mm cells')!;
    expect(can(gyroid)).toEqual(['metal.fff', 'cff']);
    // too big for the printer; walls too thin for its nozzle
    expect(can({ f: 'lattice', of: { f: 'box', x: 0.6, y: 0.1, z: 0.1 }, kind: 'gyroid', cell: 0.02, t: 0.002 })).toEqual([]);
    expect(can({ f: 'lattice', of: { f: 'box', x: 0.05, y: 0.05, z: 0.05 }, kind: 'gyroid', cell: 0.01, t: 0.0004 })).toEqual([]);
    expect(makeIn(gyroid, 'aluminum.6061-t6').can).toBe(false);
    expect(makeIn(gyroid, 'polymer.nylon-microcarbon')).toMatchObject({ can: true, process: 'cff' });
  });
});

describe('forms: grown by their loads', () => {
  it('its solver is exact: a bar pulled evenly stretches P L / E A at stress P / A', () => {
    const ny = 4, P = 1000;
    const loads = [...Array(ny + 1)].map((_, j) => ({ at: [0.2, j * 0.01] as [number, number], force: [((j === 0 || j === ny ? 0.5 : 1) * P) / ny, 0] as [number, number] }));
    const g = growShape({ nx: 20, ny, h: 0.01, t: 0.01, E: 200e9, nu: 0.3, yield: 250e6, supports: [{ edge: 'left', fix: 'x' }, { edge: 'left', fix: 'y', from: 0, to: 0 }], loads, volfrac: 1, iterations: 0 });
    expect(g.stress).toBeCloseTo(P / (0.04 * 0.01), 3);
    // the largest movement is at a far corner: the stretch, and the bar's narrowing (Poisson) across it
    expect(g.deflection).toBeCloseTo(Math.hypot((P * 0.2) / (200e9 * 0.04 * 0.01), (0.3 * P * 0.04) / (200e9 * 0.04 * 0.01)), 12);
  });

  it('a cantilever grows a symmetric truss, much stiffer for the same material', () => {
    const p = { nx: 40, ny: 20, h: 0.003, t: 0.01, E: 68.9e9, nu: 0.33, yield: 276e6, supports: [{ edge: 'left' as const, fix: 'both' as const }], loads: [{ at: [0.12, 0.03] as [number, number], force: [0, -500] as [number, number] }], volfrac: 0.4, rmin: 2 };
    const g = growShape(p);
    expect(g.history.at(-1)! / g.history[0]!).toBeLessThan(0.3);
    expect(g.x.reduce((s, v) => s + v, 0) / g.x.length).toBeCloseTo(0.4, 2);
    let asym = 0;
    for (let j = 0; j < 20; j++) for (let i = 0; i < 40; i++) asym = Math.max(asym, Math.abs(g.x[j * 40 + i]! - g.x[(19 - j) * 40 + i]!));
    expect(asym).toBeLessThan(1e-3);
    // as a form, its mesh holds the material the densities say
    const f: Form = { f: 'extrude', sec: grownSection(g, p), h: p.t };
    expect(rel(solid(f, 60).mass.volume, g.volume)).toBeLessThan(0.08);
  });

  it('invents a bracket for a job said in words: grown, then made as thick as its safety factor needs', () => {
    const inv = invent('invent a bracket that holds 500 N at 120 mm from the wall')!;
    expect(inv.job).toBe('a bracket holding 500 N at 120 mm from its wall');
    expect(inv.grown.safety).toBeCloseTo(2.5, 6);
    expect(routes(inv.form).filter((r) => r.can).map((r) => r.process)).toEqual(expect.arrayContaining(['mill', 'cff']));
    // a steel beam, thin enough that it says to check it for buckling
    expect(invent('a steel beam spanning 400 mm that carries 2 kN in the middle')!.caution).toMatch(/buckling/);
    expect(invent('a bracket')).toBeNull();
  });
});

describe('forms: real parts in the world', () => {
  it('a form part weighs its exact volume times its material\'s density, and keeps its genome', () => {
    const kind = getPartKind('form');
    const f = formFromWords('a 40 mm sphere')!;
    const params = { form: genome(f) };
    const mat = getMaterial('polymer.nylon-microcarbon');
    expect(massOf(kind, params, mat)).toBeCloseTo(solid(f).mass.volume * 1200, 9);
    expect(kind.collision(params).type).toBe('compound');
    expect(kind.visual(params).type).toBe('mesh');
    const [lo, hi] = bounds(f);
    expect(kind.dims(params).length).toBeCloseTo(hi[0] - lo[0], 9);
  });

  it('a form from a file is untrusted: kinds, numbers, depth and size are checked', () => {
    expect(() => parseForm('{"f":"sphere","r":-1}')).toThrow(FormError);
    expect(() => parseForm('{"f":"sphere","r":"1"}')).toThrow(FormError);
    expect(() => parseForm('{"f":"nope"}')).toThrow(FormError);
    expect(() => parseForm('{"f":"sphere","r":1e9}')).toThrow(FormError);
    expect(() => parseForm('{"f":"move","of":{"f":"sphere","r":0.1},"q":[0,0,0,2]}')).toThrow(FormError);
    let deep: unknown = { f: 'sphere', r: 0.01 };
    for (let i = 0; i < 40; i++) deep = { f: 'offset', of: deep, d: 0 };
    expect(() => parseForm(JSON.stringify(deep))).toThrow(/deeper/);
    expect(() => parseForm('not json')).toThrow(FormError);
    expect(parseForm(genome(formFromWords('a 60 mm cube filled with a gyroid lattice of 12 mm cells')!))).toMatchObject({ f: 'lattice', kind: 'gyroid' });
  });

  it('Ego reads shapes and jobs, and the geometry challenge now works', () => {
    expect(interpret('make a 40 mm sphere')).toEqual({ do: 'shape', words: 'make a 40 mm sphere' });
    expect(interpret('invent a bracket that holds 500 N at 120 mm from the wall')).toEqual({ do: 'invent', words: 'invent a bracket that holds 500 N at 120 mm from the wall' });
    expect(interpret('form {"f":"sphere","r":0.02}')).toEqual({ do: 'shape', words: '{"f":"sphere","r":0.02}' });
    expect(interpret('place 4 steel blocks')).toMatchObject({ do: 'place' });
    const a = attempt(challengeById('geometry')!);
    expect(a.results.map((r) => r.level)).toEqual(['works', 'works', 'works']);
  });
});

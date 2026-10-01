import { describe, expect, it } from 'vitest';
import { fitCircle, readStroke, simplify, type P2 } from '../../src/sketch/strokes';

// a hand isn't steady: a little deterministic wobble on every stroke
const wobble = (pts: P2[], amp: number): P2[] => pts.map(([x, y], i) => [x + amp * Math.sin(i * 1.7), y + amp * Math.cos(i * 2.3)]);
const line = (a: P2, b: P2, n = 40): P2[] => Array.from({ length: n }, (_, i) => [a[0] + ((b[0] - a[0]) * i) / (n - 1), a[1] + ((b[1] - a[1]) * i) / (n - 1)]);
const circle = (c: P2, r: number, n = 60, sweep = 2 * Math.PI): P2[] => Array.from({ length: n }, (_, i) => [c[0] + r * Math.cos((sweep * i) / (n - 1)), c[1] + r * Math.sin((sweep * i) / (n - 1))]);
const path = (...corners: P2[]): P2[] => corners.slice(1).flatMap((p, i) => line(corners[i]!, p, 25).slice(i ? 1 : 0));

describe('reading a drawing', () => {
  it('a straight stroke is a line, its length measured', () => {
    const r = readStroke(wobble(line([0, 0], [0.8, 0.3]), 0.004))!;
    expect(r.shape.kind).toBe('line');
    if (r.shape.kind === 'line') expect(r.shape.length).toBeCloseTo(Math.hypot(0.8, 0.3), 1);
  });

  it('a round stroke is a circle, its centre and radius fitted', () => {
    const r = readStroke(wobble(circle([0.4, 0.5], 0.2), 0.004))!;
    expect(r.shape.kind).toBe('circle');
    if (r.shape.kind === 'circle') {
      expect(r.shape.r).toBeCloseTo(0.2, 2);
      expect(r.shape.c[0]).toBeCloseTo(0.4, 2);
    }
    // exact data fits exactly
    const exact = fitCircle(circle([1, 2], 0.3));
    expect(exact.error).toBeLessThan(1e-6);
  });

  it('a closed four-cornered stroke is a rectangle, its sides measured; three corners a triangle', () => {
    const r = readStroke(wobble(path([0, 0], [0.6, 0], [0.6, 0.3], [0, 0.3], [0, 0.005]), 0.003))!;
    expect(r.shape.kind).toBe('rect');
    if (r.shape.kind === 'rect') {
      expect(Math.max(r.shape.w, r.shape.h)).toBeCloseTo(0.6, 1);
      expect(Math.min(r.shape.w, r.shape.h)).toBeCloseTo(0.3, 1);
    }
    const t = readStroke(wobble(path([0, 0], [0.5, 0], [0.25, 0.4], [0.005, 0.005]), 0.003))!;
    expect(t.shape.kind).toBe('triangle');
  });

  it('a short arc is not taken for a circle; what is unclear has alternatives to correct to', () => {
    const r = readStroke(circle([0, 0], 0.3, 30, Math.PI / 2))!;
    expect(r.shape.kind).not.toBe('circle');
    expect(simplify(line([0, 0], [1, 0]), 0.01).length).toBe(2);
  });
});

describe('what a drawing means as parts', async () => {
  const { interpretStroke, correct } = await import('../../src/sketch/interpret');
  const { readStroke: read } = await import('../../src/sketch/strokes');
  it('a line drawn with "steel pipe" is a steel tube as long as the line; a circle is a disc as wide as it', () => {
    const pipe = interpretStroke(line([0, 1], [1.2, 1]), 'this is a steel pipe')!;
    expect(pipe.kind).toBe('tube.round');
    expect(pipe.material.startsWith('steel')).toBe(true);
    expect(pipe.params['length']).toBeCloseTo(1.2, 2);
    const disc = interpretStroke(circle([0.5, 0.5], 0.15))!;
    expect(disc.kind).toBe('disc');
    expect(disc.params['diameter']).toBeCloseTo(0.3, 2);
  });

  it('sizes you say win over the drawing, and the wall scale sizes the rest', () => {
    const board = interpretStroke(path([0, 0], [0.6, 0], [0.6, 0.3], [0, 0.3], [0, 0.005]), 'oak board 2 cm thick', 2)!;
    expect(board.kind).toBe('plate');
    expect(board.material).toBe('wood.red-oak');
    expect(board.params['thickness']).toBeCloseTo(0.02, 6);
    expect(Math.max(board.params['length'] as number, board.params['width'] as number)).toBeCloseTo(1.2, 1);
  });

  it('"no, it\'s a wheel" reads the same stroke again as you meant it', () => {
    const r = read(circle([0, 0], 0.2))!;
    const fixed = correct(r, '', "no, it's a wheel");
    expect(fixed.kind).toBe('wheel');
    expect(fixed.params['diameter']).toBeCloseTo(0.4, 2);
  });
});

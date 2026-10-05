import { describe, expect, it } from 'vitest';
import { freeSpot } from '../../src/ganglia/tree/gate';
import { getMaterial } from '../../src/data/materials';
import type { Part } from '../../src/doc/types';

describe('the gate', () => {
  it('a part placed where another stands is set beside it, the first clear place across the view (K-5), and left where asked when nothing is clear within reach', () => {
    const part = (id: string, x: number, size = 0.1): Part => ({ id, kind: 'block', name: id, material: 'wood.douglas-fir', params: { x: size, y: size, z: size }, pose: { p: [x, 0.05, 0], q: [0, 0, 0, 1] }, frozen: false, assembly: null, features: [], damage: { broken: [], segments: null } });
    const there = [part('a', 0), part('b', 0.15)];
    const wanted = part('new', 0);
    // the nearest clear place, either side: one step to the left is clear, one to the right is where b stands
    expect(freeSpot(wanted, there, getMaterial, [1, 0, 0], 0.15)).toEqual([-0.15, 0.05, 0]);
    expect(freeSpot(part('new', 0), [...there, part('c', -0.15)], getMaterial, [1, 0, 0], 0.15)).toEqual([0.3, 0.05, 0]);
    expect(freeSpot(part('new', 1), there, getMaterial, [1, 0, 0], 0.15)).toEqual([1, 0.05, 0]);
    const wall = Array.from({ length: 30 }, (_, k) => part(`w${k}`, -2 + k * 0.15));
    expect(freeSpot(part('new', 0), wall, getMaterial, [1, 0, 0], 0.15, 5)).toEqual([0, 0.05, 0]);
  });
});

import { describe, expect, it } from 'vitest';
import { inside, matterOf } from '../../src/nexus/embody/inside';
import type { Part } from '../../src/nexus/embody/part';

const part = (material: string): Part => ({ id: `p-${material}`, name: material, category: 'structure', material, mass: 1, at: [0, 0, 0], size: [0.1, 0.1, 0.1], values: [] } as unknown as Part);

describe('inside a part', () => {
  it('follows steel down from the crystal of iron to the floor, largest first', () => {
    const d = inside(part('steel.a36'));
    expect(d.matter).toBe('Fe');
    expect(d.gap).toBeNull();
    expect(d.levels[0]!.what).toMatch(/crystal/i);
    expect(d.levels[0]!.what).toMatch(/Fe/);
    for (let i = 1; i < d.levels.length; i++) if (Number.isFinite(d.levels[i]!.size) && Number.isFinite(d.levels[i - 1]!.size)) expect(d.levels[i]!.size).toBeLessThanOrEqual(d.levels[i - 1]!.size);
    expect(d.levels.some((l) => l.kind === 'particle')).toBe(true);
    expect(d.levels.at(-1)!.kind).toBe('floor');
    expect(d.levels.every((l) => l.from.length > 0 || l.kind === 'floor')).toBe(true);
  });
  it('says where the kept species end instead of drawing a crystal for wood', () => {
    expect(matterOf(part('wood.spruce')).matter).toBeNull();
    const d = inside(part('wood.spruce'));
    expect(d.gap).toMatch(/gap/);
    expect(d.levels.some((l) => /crystal/i.test(l.what))).toBe(false);
    expect(d.levels.at(-1)!.kind).toBe('floor');
  });
});

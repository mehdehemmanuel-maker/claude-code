import { describe, expect, it } from 'vitest';
import { component } from '../../src/nexus/components';
import { massOf } from '../../src/nexus/mass';
import { BOARD_DEFS, boardMass } from '../../src/nexus/sbc';
import type { Part } from '../../src/nexus/kits';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
const words = (id: string) => (BOARD_DEFS[id]!.cls === 'pico' ? `pico ${id}` : `sbc ${id} ${BOARD_DEFS[id]!.ram[0]}GB`);

describe('single-board computers', () => {
  it('draws every board whole, every part its inventory lists in it, weighing what its solids weigh', () => {
    for (const id of Object.keys(BOARD_DEFS)) {
      const c = component(words(id)); if (typeof c === 'string') throw new Error(`${id}: ${c}`);
      expect(c.faults, id).toEqual([]);
      expect(Math.abs(massOf(c.part) * 1000 - boardMass(id)), id).toBeLessThan(0.01);
    }
  });
  it('weighs within a fifth of what its maker says it weighs, where it says', () => {
    for (const [id, b] of Object.entries(BOARD_DEFS)) if (b.g) expect(Math.abs(boardMass(id) / b.g - 1), `${id}: ${boardMass(id).toFixed(1)} g against ${b.g} g`).toBeLessThan(0.2);
  });
  it('gives a Raspberry Pi 5 its 40-pin header, its holes 58 by 49 mm for M2.5 screws, and its maker\'s figures', () => {
    const c = component('sbc pi5 8GB'); if (typeof c === 'string') throw new Error(c);
    expect(all(c.part).filter((p) => p.item === 'header-pin')).toHaveLength(40);
    const h = c.part.ports!.find((p) => p.name === 'mounting holes')!;
    expect(h.thread).toBe('M2.5');
    const xs = [...new Set(h.pattern.map(([x]) => +(x * 1000).toFixed(1)))].sort((a, b) => a - b), zs = [...new Set(h.pattern.map(([, z]) => +(z * 1000).toFixed(1)))].sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeCloseTo(58, 5); expect(zs[1]! - zs[0]!).toBeCloseTo(49, 5);
    expect(c.item.spec).toMatch(/Cortex-A76 at 2\.4 GHz/); expect(c.item.spec).toMatch(/8 GB LPDDR4X/);
  });
  it('keeps D-Robotics\' RDK X5 as its maker gives it: 8 Cortex-A55 at 1.5 GHz, a 10 TOPS BPU, 100 × 80 mm', () => {
    const c = component('sbc rdkx5 8GB'); if (typeof c === 'string') throw new Error(c);
    expect(c.item.spec).toMatch(/8 × Arm Cortex-A55 at 1\.5 GHz/); expect(c.item.spec).toMatch(/10 TOPS/); expect(c.item.spec).toMatch(/100 × 80 mm/);
    expect(all(c.part).filter((p) => p.item === 'usb-a-socket')).toHaveLength(4);
  });
});

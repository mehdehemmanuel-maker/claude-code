import { describe, expect, it } from 'vitest';
import { component } from '../../src/nexus/components';
import { massOf } from '../../src/nexus/mass';
import { approx, BOARD_DEFS, boardMass } from '../../src/nexus/sbc';
import { OPI5_SMALL } from '../../src/nexus/sbc-opi5-small';
import { pkgOf } from '../../src/nexus/packages';
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
  it('weighs within a fifth of what its maker says it weighs, where its layout is measured; the rest named as approximate', () => {
    for (const [id, b] of Object.entries(BOARD_DEFS)) if (b.g && !approx(id)) expect(Math.abs(boardMass(id) / b.g - 1), `${id}: ${boardMass(id).toFixed(1)} g against ${b.g} g`).toBeLessThan(0.2);
    // (each leaves this list when its layout is measured from its photos and drawings)
    expect(Object.keys(BOARD_DEFS).filter(approx)).toEqual(['pi5', 'pi4b', 'pi3bplus', 'pizero2w', 'cm5', 'pico1', 'pico1w', 'pico2', 'pico2w', 'opi5plus', 'opi5pro', 'opi5max', 'rdkx3', 'rdkx5', 'rdks100', 'rdks100p']);
    const c = component('sbc opi5plus 4GB'); if (typeof c === 'string') throw new Error(c);
    expect(c.item.spec).toMatch(/its layout approximate/);
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
    expect(all(c.part).filter((p) => p.item === 'usb-a-tongue')).toHaveLength(4);
  });
  it('draws an Orange Pi 5 from its measured layout: its 26-pin header and 3-pin UART, its RK3588S 17 mm across, its holes 93.85 × 55.89 mm for M2.5, the right way round', () => {
    const c = component('sbc opi5 8GB'); if (typeof c === 'string') throw new Error(c);
    expect(c.faults).toEqual([]);
    const ps = all(c.part), named = (s: string) => ps.find((p) => p.name.endsWith(s))!;
    expect(ps.filter((p) => p.item === 'header-pin')).toHaveLength(29);
    expect(ps.filter((p) => p.item === 'pin-header-2x13')).toHaveLength(1); expect(ps.filter((p) => p.item === 'pin-header-2x20')).toHaveLength(0);
    const h = c.part.ports!.find((p) => p.name === 'mounting holes')!; expect(h.thread).toBe('M2.5');
    const xs = [...new Set(h.pattern.map(([x]) => +(x * 1000).toFixed(3)))].sort((a, b) => a - b), zs = [...new Set(h.pattern.map(([, z]) => +(z * 1000).toFixed(3)))].sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeCloseTo(93.85, 2); expect(zs[1]! - zs[0]!).toBeCloseTo(55.89, 2);
    // (seen from above, its header along the far edge: drawn at -z, as its drawing's z = 58.67 runs along -z; its power
    // USB-C on the near edge at +z with its mouth facing out)
    expect(named('26-pin header').at![2]).toBeLessThan(-0.025); expect(named('USB-C power in').at![2]).toBeGreaterThan(0.025);
    expect(c.item.spec).not.toMatch(/approximate/);
    expect(Math.abs(boardMass('opi5') / 46 - 1)).toBeLessThan(0.2);
  });
  it('draws the Orange Pi 5\'s small parts where its photo shows them, each in its own case or package', () => {
    const c = component('sbc opi5 8GB'); if (typeof c === 'string') throw new Error(c);
    const ps = all(c.part), n = (k: string) => OPI5_SMALL.filter((r) => k.includes(r[0])).length;
    expect(OPI5_SMALL.length).toBeGreaterThan(80);
    expect(ps.filter((p) => p.item === 'sot-package')).toHaveLength(n('t'));
    expect(ps.filter((p) => p.item === 'chip-resistor')).toHaveLength(n('r'));
    expect(ps.filter((p) => p.item === 'chip-capacitor')).toHaveLength(n('cp'));
    expect(ps.filter((p) => p.item === 'inductor-power').length).toBe(n('l') + 3);   // (and the three its layout places)
    // (each on the board, its middle within it)
    for (const r of OPI5_SMALL) { expect(r[1]).toBeGreaterThan(0); expect(r[1]).toBeLessThan(100); expect(r[2]).toBeGreaterThan(0); expect(r[2]).toBeLessThan(62); }
    // (a SOT-323 as JEDEC MO-203 draws it: 2.0 × 1.25 mm, leads at 0.65)
    expect(pkgOf('SOT-323')).toMatchObject({ L: 2.0, W: 1.25, pitch: 0.65, span: 2.1 });
  });
});

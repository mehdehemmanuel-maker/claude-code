import { describe, expect, it } from 'vitest';
import { component } from '../../src/nexus/parts/components';
import { massOf } from '../../src/nexus/parts/mass';
import { approx, BOARD_DEFS, boardMass, PI4_HAND } from '../../src/nexus/boards/sbc';
import { OPI5_SMALL } from '../../src/nexus/boards/sbc-opi5-small';
import { PI5_SMALL } from '../../src/nexus/boards/sbc-pi5-small';
import { PI4_SMALL } from '../../src/nexus/boards/sbc-pi4-small';
import { BOARD_DEFS as DEFS, boardComps, JOINTS } from '../../src/nexus/boards/sbc';
import { pkgOf } from '../../src/nexus/boards/packages';
import type { Part } from '../../src/nexus/parts/kits';

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
    expect(Object.keys(BOARD_DEFS).filter(approx)).toEqual(['pi3bplus', 'pizero2w', 'cm5', 'pico2', 'pico2w', 'opi5plus', 'opi5pro', 'opi5max', 'rdkx3', 'rdkx5', 'rdks100', 'rdks100p']);
    const c = component('sbc opi5plus 4GB'); if (typeof c === 'string') throw new Error(c);
    expect(c.item.spec).toMatch(/its layout approximate/);
  });
  it('gives a Raspberry Pi 5 its 40-pin header, its holes 58 by 49 mm for M2.5 screws, and its maker\'s figures', () => {
    const c = component('sbc pi5 8GB'); if (typeof c === 'string') throw new Error(c);
    // (its 40-pin header's pins, and the four of its PoE header beside them)
    expect(all(all(c.part).find((p) => p.name.endsWith('40-pin header'))!).filter((p) => p.item === 'header-pin')).toHaveLength(40);
    expect(all(c.part).filter((p) => p.item === 'header-pin')).toHaveLength(44);
    const h = c.part.ports!.find((p) => p.name === 'mounting holes')!;
    expect(h.thread).toBe('M2.5');
    const xs = [...new Set(h.pattern.map(([x]) => +(x * 1000).toFixed(1)))].sort((a, b) => a - b), zs = [...new Set(h.pattern.map(([, z]) => +(z * 1000).toFixed(1)))].sort((a, b) => a - b);
    expect(xs[1]! - xs[0]!).toBeCloseTo(58, 5); expect(zs[1]! - zs[0]!).toBeCloseTo(49, 5);
    expect(c.item.spec).toMatch(/Cortex-A76 at 2\.4 GHz/); expect(c.item.spec).toMatch(/8 GB LPDDR4X/);
  });
  it('draws a Raspberry Pi 5 from Raspberry Pi\'s own 3D model: its ports where the model puts them, its board 1.4 mm thick, its microSD under it', () => {
    const c = component('sbc pi5 8GB'); if (typeof c === 'string') throw new Error(c);
    expect(c.faults).toEqual([]);
    const ps = all(c.part), named = (s: string) => ps.find((p) => p.name.endsWith(s))!, x = (s: string) => +(named(s).at![0] * 1000 + 42.5).toFixed(2), y = (s: string) => +(28 - named(s).at![2] * 1000).toFixed(2);
    // (the drawing's x and y of each port's middle, from where it is drawn: the model's and the mechanical drawing's)
    expect(x('USB-C power in')).toBeCloseTo(11.2, 1); expect(x('micro-HDMI 0')).toBeCloseTo(25.8, 1); expect(x('micro-HDMI 1')).toBeCloseTo(39.2, 1);
    expect(y('Gigabit Ethernet')).toBeCloseTo(10.2, 1); expect(y('USB 3.0 (two, stacked)')).toBeCloseTo(29.05, 1); expect(y('USB 2.0 (two, stacked)')).toBeCloseTo(47.0, 1);
    expect(x('40-pin header')).toBeCloseTo(32.5, 1); expect(y('40-pin header')).toBeCloseTo(52.5, 1);
    expect(named('microSD socket').at![1]).toBeLessThan(-0.0013);
    expect(ps.filter((p) => p.item === 'fpc-socket-22')).toHaveLength(2); expect(ps.filter((p) => p.item === 'jst-sh-4v')).toHaveLength(1);
    expect(c.item.spec).not.toMatch(/approximate/);
  });
  it('gives the Raspberry Pi 5 what its maker\'s photo shows: its silkscreen and copper on its own millimetres, its chips\' markings, the small parts it shows, each in its case', () => {
    const b = DEFS.pi5!; expect(b.ink?.res).toBe(20); expect(b.ink?.w).toBe(85 * 20); expect(b.copper?.w).toBe(85 * 14);
    const c = component('sbc pi5 8GB'); if (typeof c === 'string') throw new Error(c);
    const ps = all(c.part); expect(PI5_SMALL.length).toBeGreaterThan(10);
    expect(ps.filter((p) => p.item === 'chip-capacitor' || p.item === 'chip-resistor' || p.item === 'sot-package').length).toBe(PI5_SMALL.length);
    for (const r of PI5_SMALL) { expect(r[1]).toBeGreaterThan(0); expect(r[1]).toBeLessThan(85); expect(r[2]).toBeGreaterThan(0); expect(r[2]).toBeLessThan(56); }
    expect(ps.some((p) => p.text?.startsWith('BROADCOM'))).toBe(true); expect(ps.some((p) => /DA9091/.test(p.text ?? ''))).toBe(true);
  });
  it('draws a Raspberry Pi 4 from its maker\'s drawing and its photo: its ports where the drawing puts them, its Ethernet on the far side, its camera and display sockets of fifteen contacts, what its photo shows', () => {
    const c = component('sbc pi4b 4GB'); if (typeof c === 'string') throw new Error(c);
    expect(c.faults).toEqual([]); expect(c.item.spec).not.toMatch(/approximate/);
    const ps = all(c.part), named = (s: string) => ps.find((p) => p.name.endsWith(s))!, x = (s: string) => +(named(s).at![0] * 1000 + 42.5).toFixed(2), y = (s: string) => +(28 - named(s).at![2] * 1000).toFixed(2);
    // (the drawing's figures: USB-C at 11.2, the micro-HDMIs at 26.0 and 39.5; Ethernet 45.75 up the right edge, the
    // USB 3.0 pair at 27 and the USB 2.0 at 9: the Pi 5's the other way round; the jack where its photo puts it, 53.85,
    // 0.35 from its drawing's 53.5, the mounting hole beside it true to a pixel; its own body, not a headphone jack's)
    expect(x('USB-C power in')).toBeCloseTo(11.2, 1); expect(x('micro-HDMI 0')).toBeCloseTo(26.0, 1); expect(x('micro-HDMI 1')).toBeCloseTo(39.5, 1);
    expect(Math.abs(x('audio and video jack') - 53.5)).toBeLessThan(0.4); expect(named('audio and video jack').item).toBe('av-jack-4p');
    expect(y('Gigabit Ethernet')).toBeCloseTo(45.75, 1); expect(y('USB 3.0 (two, stacked)')).toBeCloseTo(27.0, 1); expect(y('USB 2.0 (two, stacked)')).toBeCloseTo(9.0, 1);
    expect(ps.filter((p) => p.item === 'fpc-socket-15')).toHaveLength(2);
    // (its small parts: the finder's, and those read by eye round its power chip where its photo is soft; its J2's three
    // unfitted holes, its two lights at its left edge)
    expect(ps.filter((p) => p.item === 'chip-capacitor' || p.item === 'chip-resistor' || p.item === 'sot-package' || p.item === 'diode-smd').length).toBe(PI4_SMALL.length + PI4_HAND.filter((r) => r[0] !== 'q').length);
    expect(ps.filter((p) => p.item === 'dfn-package').length).toBe(PI4_HAND.filter((r) => r[0] === 'q').length);
    expect((BOARD_DEFS.pi4b!.more ?? []).filter((h) => /J2/.test(h.why ?? ''))).toHaveLength(3);
    expect(ps.filter((p) => /(activity|power) light \((ACT|PWR)\)$/.test(p.name) && /^led-chip/.test(p.item ?? "")).length).toBeGreaterThanOrEqual(2);
    expect(DEFS.pi4b!.ink?.res).toBe(20); expect(DEFS.pi4b!.copper?.w).toBe(85 * 14);
    expect(ps.some((p) => /VL805/.test(p.text ?? ''))).toBe(true); expect(ps.some((p) => /BCM54213PE/.test(p.text ?? ''))).toBe(true);
  });
  it('solders every lead it draws: a fillet under the board where one comes through, and round the foot of one that sits on it', () => {
    const j = boardComps('pi5').find((c) => c.name === JOINTS)!;
    // (its 40-pin and PoE headers' 44 pins, its two USB stacks' 18 + 8 contacts and 8 legs, its RJ45's 8 contacts, 2 shield
    // legs and 4 lights' leads)
    const through = (j.kids ?? []).filter((k) => /^solder joint /.test(k.name));
    expect(through).toHaveLength(44 + 18 + 8 + 8 + 8 + 2 + 4);
    // (and every surface-mounted termination standing on the board's top face: a chip's leads, a passive's end caps)
    expect((j.kids ?? []).filter((k) => /^solder fillet /.test(k.name)).length).toBeGreaterThan(100);
    const c = component('sbc pi5 8GB'); if (typeof c === 'string') throw new Error(c);
    expect(all(c.part).filter((p) => p.item === 'solder-joint' && /solder joint /.test(p.name))).toHaveLength(92);
    expect(all(c.part).filter((p) => p.item === 'solder-joint' && /solder fillet /.test(p.name)).length).toBeGreaterThan(100);
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

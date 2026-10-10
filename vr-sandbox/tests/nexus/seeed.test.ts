import { describe, expect, it } from 'vitest';
import { GROVE, XIAO, XIAOS, groveChain, groveFits, groveOf, groveParts, grovePlugParts, xiaoOf } from '../../src/nexus/machines/seeed';
import { componentOf } from '../../src/nexus/parts/components';
import { resolve } from '../../src/nexus/parts/inventory';
import { massOf } from '../../src/nexus/parts/mass';

/** The kind a word names, drawn: its parts, its faults and what it weighs. */
function drawn(words: string) {
  const r = resolve(words);
  if (!r || typeof r === 'string') throw new Error(`${words}: ${String(r)}`);
  const c = componentOf(r.id);
  if (!c) throw new Error(`${words}: no design`);
  return { ...c, g: massOf(c.part) * 1000 };
}

describe('the XIAO footprint, which every board in the family shares', () => {
  it('is one footprint whatever chip is on it: fourteen pins, eleven of them GPIO', () => {
    expect(XIAO.pins).toBe(XIAO.gpio + XIAO.power);
    expect(XIAO.pins).toBe(2 * XIAO.rows);
    expect(XIAO.names.a).toHaveLength(XIAO.rows); expect(XIAO.names.b).toHaveLength(XIAO.rows);
    // (its two rows name eleven D pins and the three power pins, and no name twice)
    const all = [...XIAO.names.a, ...XIAO.names.b];
    expect(new Set(all).size).toBe(XIAO.pins);
    expect(all.filter((n) => n.startsWith('D'))).toHaveLength(XIAO.gpio);
    expect(all.filter((n) => ['3V3', 'GND', '5V'].includes(n))).toHaveLength(XIAO.power);
    // (its rows at 2.54 mm fit inside its 21 mm length)
    expect((XIAO.rows - 1) * XIAO.pitch).toBeLessThan(XIAO.size[1]);
  });
  it('offers only the chips whose figures are taken from Seeed\'s own wiki, each with its source', () => {
    expect(XIAOS.length).toBeGreaterThan(0);
    for (const b of XIAOS) {
      expect(b.src.toLowerCase()).toContain('seeed');
      expect(b.mhz).toBeGreaterThan(0);
      expect(b.chip.length).toBeGreaterThan(0);
    }
  });
  it('says what goes into a board: its pads, its two chips, its regulator, its socket, its buttons, lights and passives', () => {
    for (const of of [xiaoOf('ESP32C3'), xiaoOf('RP2040')]) {
      expect(of).toContain(`castellated-pad*${XIAO.pins}`);
      // (two chips either way: its own chip and, beside it, the charger or the flash)
      expect(of).toContain('ic-package*2'); expect(of).toContain('sot-package');
      expect(of).toContain('usb-c-socket'); expect(of).toContain('pcb-bare');
      expect(of).toContain('chip-resistor'); expect(of).toContain('chip-capacitor');
    }
  });
  it('says what goes into a Grove module by its bus: two pull-ups on I\u00b2C, one resistor otherwise', () => {
    expect(groveOf('i2c')).toContain('chip-resistor*2');
    expect(groveOf('uart')).toContain('chip-resistor ');
    for (const bus of Object.keys(GROVE.bus)) {
      expect(groveOf(bus)).toContain(`socket-contact*${GROVE.pins}`);
      expect(groveOf(bus)).toContain('grove-part');
    }
  });
});

describe('Grove: one plug, five board sizes', () => {
  it('has one four-pin plug, and names its four pins by what the module talks over', () => {
    expect(GROVE.pins).toBe(4);
    for (const [bus, pins] of Object.entries(GROVE.bus)) {
      expect(pins).toHaveLength(GROVE.pins);
      expect(pins.slice(2)).toEqual(['VCC', 'GND']);
      expect(bus.length).toBeGreaterThan(0);
    }
  });
  it('makes its board sizes out of 20 mm units', () => {
    for (const [name, [w, d]] of Object.entries(GROVE.sizes)) {
      const [a, b] = name.split('x').map(Number);
      expect(w).toBe(a! * 20); expect(d).toBe(b! * 20);
    }
  });
  it('lets an I²C bus be shared and refuses to share a UART or a pin', () => {
    expect(groveChain('i2c', 4).ok).toBe(true);
    expect(groveChain('i2c', 4).says).toContain('address');
    expect(groveChain('uart', 1).ok).toBe(true);
    expect(groveChain('uart', 2).ok).toBe(false);
    expect(groveChain('digital', 2).ok).toBe(false);
  });
  it('warns off a 5 V module on a 3.3 V board, and lets the other way round through with a word', () => {
    expect(groveFits(3.3, 3.3).ok).toBe(true);
    const bad = groveFits(5, 3.3);
    expect(bad.ok).toBe(false); expect(bad.says).toContain('level shifter');
    expect(groveFits(3.3, 5).ok).toBe(true);
  });
  it('draws the socket with its four contacts, and a module with its socket on it', () => {
    const plug = grovePlugParts();
    expect(plug.filter((p) => p.item === 'socket-contact')).toHaveLength(GROVE.pins);
    // (each contact a right angle: a blade in the socket and a leg down through the board)
    for (const c of plug.filter((p) => p.item === 'socket-contact')) expect(c.parts).toHaveLength(2);
    expect(plug[0]!.item).toBe('grove-socket');
    const [mod] = groveParts('a module', '1x2', 'uart');
    const names = (mod!.parts ?? []).map((p) => p.name);
    expect(names.some((n) => n.includes('board'))).toBe(true);
    expect(names.some((n) => n.includes('socket'))).toBe(true);
  });
});

describe('both drawn whole, with nothing its inventory lists left out', () => {
  // (the kinds' own masses are estimates — Seeed publishes neither board's weight — so this says only that the drawing
  //  and the estimate agree, which is what the library's own check asks of every kind)
  for (const words of ['xiao ESP32C3', 'xiao RP2040', 'grove 1x1 i2c', 'grove 2x3 uart', 'grove 1x3 analogue']) {
    it(`${words}: no missing parts, and it weighs what its kind says`, () => {
      const d = drawn(words);
      expect(d.faults).toEqual([]);
      expect(d.g).toBeGreaterThan(0);
    });
  }
  it('a XIAO carries its chip whole: its die, its lead frame and its bond wires inside the moulding', () => {
    const d = drawn('xiao ESP32C3'), seen: string[] = [];
    const walk = (p: { name: string; item?: string; parts?: unknown[] }) => { seen.push(`${p.name}|${p.item ?? ''}`); for (const q of (p.parts ?? []) as typeof p[]) walk(q); };
    walk(d.part as Parameters<typeof walk>[0]);
    for (const want of ['si-die', 'lead-frame', 'bond-wire', 'mould-compound', 'castellated-pad', 'usb-c-shell'])
      expect(seen.some((s) => s.endsWith(`|${want}`))).toBe(true);
  });
  it('a bigger Grove board weighs more than a smaller one, by its own board', () => {
    expect(drawn('grove 2x3 i2c').g).toBeGreaterThan(drawn('grove 1x1 i2c').g);
  });
});

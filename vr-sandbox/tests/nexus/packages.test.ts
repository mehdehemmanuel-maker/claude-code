import { describe, expect, it } from 'vitest';
import { component } from '../../src/nexus/components';
import { massOf } from '../../src/nexus/mass';
import { bandsOf, BAND, chipCode, chipSolids, pkgMass, pkgOf, pkgSolids, solidsMass, solidVolume } from '../../src/nexus/packages';
import type { Part } from '../../src/nexus/kits';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('electronic packages', () => {
  it('weigh what makers say they weigh, within a fifth (MCC\'s published weights)', () => {
    // (Micro Commercial Components, "Component Weight Information", mccsemi.com/Package/WeightList, approximate weights;
    // its SOP-8 for SOIC-8, its TO-220AB for TO-220, its D2-PAK for TO-263)
    const MCC: Record<string, number> = { 'DO-41': 0.33, 'DO-201': 1.141, SMA: 0.06, 'SOT-23': 0.008, 'SOT-23-6': 0.011, 'SOT-223': 0.116, 'SOIC-8': 0.088, 'TO-220': 1.9332, 'TO-92': 0.212, 'TO-263': 1.404 };
    for (const [n, g] of Object.entries(MCC)) expect(Math.abs(pkgMass(pkgOf(n)!) / g - 1), n).toBeLessThan(0.2);
  });
  it('draws a chip resistor within a fifth of Yageo\'s weights, from its layers', () => {
    // (Yageo RT series data sheet, unit weight: RT0402 0.564 mg, RT0805 4.642 mg; RC0603 2 mg)
    for (const [L, W, T, mg] of [[1, 0.5, 0.35, 0.564], [1.6, 0.8, 0.45, 2], [2, 1.25, 0.5, 4.642]]) expect(Math.abs((solidsMass(chipSolids('resistor', L!, W!, T!)) * 1000) / mg! - 1), `${L}×${W}`).toBeLessThan(0.2);
  });
  it('gives each package a lead for each of its pins, its die inside its body, and a wire to each lead the die is not on', () => {
    for (const [n, pins, wires] of [['DIP-8', 8, 8], ['SOIC-16', 16, 16], ['TQFP-100', 100, 100], ['QFN-56', 56, 56], ['SOT-23', 3, 2], ['SOT-23-6', 6, 6], ['SOT-223', 4, 2], ['TO-92', 3, 2], ['TO-220', 3, 2], ['DO-41', 2, 0], ['SMA', 2, 0]] as [string, number, number][]) {
      const ss = pkgSolids(pkgOf(n)!), leads = new Set(ss.filter((s) => s.role === 'lead').map((s) => s.lead)), body = ss.find((s) => s.role === 'body')!, die = ss.find((s) => s.role === 'die')!;
      // (a SOT-223's tab is a lead of its own, its fourth)
      expect(leads.size, n).toBe(pins);
      expect(ss.filter((s) => s.role === 'wire').length, n).toBe(wires);
      expect(Math.abs(die.at[1] - body.at[1]), `${n}: its die within its body's height`).toBeLessThan(('box' in body.shape ? body.shape.box[1] : 'cyl' in body.shape ? body.shape.cyl[0] * 2 : 10) / 2);
    }
  });
  it('weighs a drawn part as its solids weigh: what is inside the moulding taken out of it once', () => {
    for (const w of ['chip NE555 DIP-8', 'chip ATMEGA2560 TQFP-100', 'chip RP2040 QFN-56', 'transistor IRLZ44N', 'regulator AMS1117-3.3', 'diode 1N4148', 'zener 5.1V 5W', 'chipresistor 0603 1% 10kohm', 'mlcc X7R 0805 100nF 50V', 'smdled 5050 white', 'resistor 4.7k', 'led red 5mm']) {
      const c = component(w); if (typeof c === 'string') throw new Error(`${w}: ${c}`);
      expect(c.faults, w).toEqual([]);
      expect(Math.abs(massOf(c.part) * 1000 / c.item.g! - 1), w).toBeLessThan(w.startsWith('chipresistor') ? 0.2 : 0.02);
    }
  });
  it('files each piece under the inventory\'s part, so a chip opens to its die, lead frame, wires and moulding', () => {
    const c = component('chip NE555 DIP-8'); if (typeof c === 'string') throw new Error(c);
    const items = all(c.part).map((p) => p.item).filter(Boolean);
    expect(items.filter((i) => i === 'bond-wire')).toHaveLength(8);
    for (const i of ['si-die', 'lead-frame', 'mould-compound']) expect(items, i).toContain(i);
    expect(c.part.parts!.find((p) => p.item === 'mould-compound')!.text).toBe('NE555');
    const led = component('led blue 5mm'); if (typeof led === 'string') throw new Error(led);
    expect(all(led.part).map((p) => p.item)).toContain('led-die-ingan');
  });
  it('marks resistors by IEC 60062: colour bands, and chip codes by case and tolerance', () => {
    expect(bandsOf(4700).map((b) => BAND[b]![0])).toEqual(['yellow', 'violet', 'black', 'brown', 'brown']);
    expect(bandsOf(1).map((b) => BAND[b]![0])).toEqual(['brown', 'black', 'black', 'silver', 'brown']);
    expect([chipCode(1e4, '5%', '0805'), chipCode(1e4, '1%', '0805'), chipCode(1e4, '1%', '0603'), chipCode(4.7, '5%', '1206'), chipCode(47.5, '1%', '1206'), chipCode(1e4, '1%', '0402')]).toEqual(['103', '1002', '01C', '4R7', '47R5', '']);
    const r = component('resistor 4.7k'); if (typeof r === 'string') throw new Error(r);
    expect(all(r.part).filter((p) => p.name.endsWith('colour band')).map((p) => p.color)).toEqual(bandsOf(4700).map((b) => BAND[b]![1]));
  });
  it('drills a TO-220\'s tab through for its heat-sink screw', () => {
    const tab = pkgSolids(pkgOf('TO-220')!).find((s) => s.role === 'tab')!;
    expect(tab.hole?.r).toBeCloseTo(1.85); expect(solidVolume(tab)).toBeLessThan(10 * 15.1 * 1.27);
  });
});

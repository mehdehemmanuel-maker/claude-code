// A circuit laid on a breadboard from its nets (src/nexus/embody/breadboard.ts): every net one conductor, no two nets on
// one, checked on what was laid; what the clips cannot carry stays off with what serves it; and the printer's board.

import { describe, expect, it } from 'vitest';
import { check, conductorOf, layOut, type Component } from '../../src/nexus/embody/breadboard';
import { printer } from '../../src/nexus/ask/asked';
import { generate } from '../../src/nexus/substrate/manifold';
import { embodyAny } from '../../src/nexus/embody/any';

const R = (id: string, a: string, b: string, I?: number): Component => ({ id, name: id, body: [0.0063, 0.0025, 0.0025], colour: 0, pins: [{ name: '1', net: a, I }, { name: '2', net: b, I }] });
const RAILS = { topPlus: '+3.3 V', topMinus: '0 V', bottomPlus: '+24 V', bottomMinus: '0 V' };

describe('a circuit on a breadboard', () => {
  it('lays a divider and its filter with every net one conductor and no two nets on one', () => {
    const l = layOut([{ id: 'hdr', name: 'header', to: 'controller', body: [0, 0.0085, 0.0025], colour: 0, pins: [{ name: '3V3', net: '+3.3 V' }, { name: 'ADC', net: 'sense' }, { name: 'GND', net: '0 V' }] }, R('pull-up', '+3.3 V', 'sense'), R('filter', 'sense', '0 V'), R('thermistor', 'sense', '0 V')], RAILS);
    expect(l.opens).toEqual([]);
    expect(l.shorts).toEqual([]);
    const holes = l.placed.flatMap((p) => p.holes).concat(l.jumpers.flatMap((j) => [j.from, j.to])).map((h) => `${h.row}:${h.col}`);
    expect(new Set(holes).size).toBe(holes.length);
    // the half-rows a net's leads are in are only ever that net's
    const owner = new Map<string, string>();
    for (const p of l.placed) p.comp.pins.forEach((pin, i) => { const c = conductorOf(p.holes[i]!); if (!c.startsWith('rail')) { expect(owner.get(c) ?? pin.net).toBe(pin.net); owner.set(c, pin.net); } });
  });
  it('finds a short a jumper makes and an open where one is missing', () => {
    const l = layOut([R('a', 'x', 'y'), R('b', 'y', 'z'), R('c', 'x', 'z'), R('d', 'x', 'w'), R('e', 'x', 'v'), R('f', 'x', 'u'), R('g', 'x', 't')], RAILS);
    expect(check(l)).toEqual({ opens: [], shorts: [] });
    const y = l.placed[0]!.holes[1]!, z = l.placed[1]!.holes[1]!;
    expect(check({ ...l, jumpers: [...l.jumpers, { net: 'y', from: y, to: z }] }).shorts.length).toBeGreaterThan(0);
    // x has more leads than one half-row holds: it is two, joined; take the jumper away and it is open
    expect(l.jumpers.some((j) => j.net === 'x')).toBe(true);
    expect(check({ ...l, jumpers: l.jumpers.filter((j) => j.net !== 'x') }).opens.some((o) => o.startsWith('x'))).toBe(true);
  });
  it('keeps what its clips cannot carry off it, with what serves it, and the header pins nothing uses', () => {
    const l = layOut([
      { id: 'hdr', name: 'header', to: 'controller', body: [0, 0.0085, 0.0025], colour: 0, pins: [{ name: '3V3', net: '+3.3 V' }, { name: 'PWM', net: 'pwm' }, { name: 'GND', net: '0 V' }] },
      R('gate', 'pwm', 'g'), R('pulldown', 'g', '0 V'),
      { id: 'fet', name: 'fet', body: [0.01, 0.015, 0.0045], colour: 0, pins: [{ name: 'G', net: 'g' }, { name: 'D', net: 'drain', I: 5 }, { name: 'S', net: '0 V', I: 5 }] },
      R('pull-up', '+3.3 V', 'sense'), R('filter', 'sense', '0 V'),
    ], RAILS, 1);
    expect(l.refused.map((r) => r.id).sort()).toEqual(['fet', 'gate', 'pulldown']);
    expect(l.placed.find((p) => p.comp.id === 'hdr')!.comp.pins.map((p) => p.name)).toEqual(['3V3', 'GND']);
    expect(l.opens.concat(l.shorts)).toEqual([]);
  });
  it('gives the printer a board that checks, its thermistor wired to its header and its power stage on the controller', () => {
    const i = printer(), m = embodyAny(i, generate(i))!;
    const board = m.parts.find((p) => p.id === 'bb:board')!;
    expect(board.name).toMatch(/every net joined, none to another/);
    expect(m.flaws.filter((f) => f.where === 'breadboard')).toEqual([]);
    expect(m.parts.some((p) => p.id === 'bb:q-heater')).toBe(false);
    expect(board.values.find((v) => v.name === 'breadboard clips')!.law).toMatch(/heater MOSFET \(a lead of it carries/);
    // every lead of a two-lead part goes into a hole: its wire starts below the board's top
    for (const p of m.parts.filter((x) => /:lead-/.test(x.id))) expect(p.shape.kind).toBe('wire');
    const cable = m.parts.find((p) => p.id === 'cable:thermistor')!, hdr = m.parts.find((p) => p.id === 'bb:j-thermistor')!;
    if (cable.shape.kind !== 'wire') throw new Error('no wire');
    const end = cable.shape.points.at(-1)!;
    expect(Math.hypot(end[0] - hdr.at[0], end[2] - hdr.at[2])).toBeLessThan(0.01);
  });
});

// Sizes far from ours (src/nexus/sizing.ts) and what the laws say of what is asked before anything is made
// (src/nexus/bounds.ts): each dimensionless group read at the size asked, on its side of the threshold where the
// physics changes, and each bound worked out from the figures the ask gives, with its estimates said.

import { describe, expect, it } from 'vitest';
import { namedSize, sizeAt } from '../../src/nexus/sizing';
import { bounds } from '../../src/nexus/bounds';
import { conceive } from '../../src/nexus/conceive';

const group = (L: number, key: string, o = {}) => sizeAt(L, o).groups.find((g) => g.key === key)!;

describe('what a size asks of a thing', () => {
  it('reads a rotor as big as the Earth as past its own weight and its own gravity, though turning once a day is slow', () => {
    const e = sizeAt(1.27e7, { w: (2 * Math.PI) / 86400 });
    expect(group(1.27e7, 'self-weight').past).toBe(true);
    expect(group(1.27e7, 'self-gravity').past).toBe(true);
    // its rim goes about 460 m/s: within what steel bears before it flies apart
    expect(e.groups.find((g) => g.key === 'tip speed')!.past).toBe(false);
    // light takes 42 ms to cross it: too long to keep it in step from one place
    expect(group(1.27e7, 'light time').value).toBeCloseTo(1.27e7 / 299792458, 6);
    expect(e.must.length).toBeGreaterThan(0);
  });
  it('reads a tardigrade-sized flyer as viscous and stuck by surface tension, where electrostatic drives beat magnets', () => {
    expect(namedSize(' a drone the size of a tardigrade ')!.L).toBe(5e-4);
    const re = group(5e-4, 'Reynolds', { v: 1, flies: true });
    expect(re.value).toBeCloseTo((1.204 * 1 * 5e-4) / 1.813e-5, 6);
    expect(re.value).toBeLessThan(1000);
    expect(group(5e-4, 'Bond').past).toBe(true);
    expect(group(5e-4, 'actuation').past).toBe(true);
    // a thing our size is on none of those sides
    expect(group(0.3, 'Bond').past).toBe(false);
    expect(group(0.3, 'actuation').past).toBe(false);
  });
});

describe('what the laws say of what is asked', () => {
  it('a 2 cm cube passing on 100 W cannot shed its loss in still air at 45 °C', () => {
    const [heat] = bounds({ size: { W: 0.02 }, power: [{ W: 100, as: 'gives' }], tmax: 45 });
    expect(heat!.ok).toBe(false);
    // its loss at 95% is 5.26 W; it settles far hotter than 45 °C
    expect(heat!.what).toMatch(/5\.26 W/);
    expect(Number(/settles near ([\d.]+) °C/.exec(heat!.says)![1])).toBeGreaterThan(100);
  });
  it('a 10 µm heat engine on 0.5 K gives far less than 1 µW: Carnot on the heat that crosses it', () => {
    const [b] = bounds({ size: { W: 1e-5 }, dT: 0.5, Tat: 310, heatEngine: true, power: [{ W: 1e-6, as: 'makes' }] });
    expect(b!.ok).toBe(false);
    // ΔT / T = 0.5 / 310 of the 0.5 × 10 µm × 0.5 K that crosses it: about 4 nW
    expect(b!.says).toMatch(/0\.161%/);
    expect(b!.says).toMatch(/times too little/);
  });
  it('a board 100 × 62 mm drawing 8 W for 2 h can carry its cells: 16 Wh, about 64 g and 25 cm³', () => {
    const c = conceive('Design a single-board computer the same size as an Orange Pi 5 (100 x 62 mm) with a built-in battery that keeps it running for 2 hours during a power cut while drawing up to 8 W under full load.');
    expect(c.said.size).toEqual({ W: 0.1, D: 0.062 });
    const cells = c.bounds.find((b) => /carries what it needs/.test(b.what))!;
    expect(cells.ok).toBe(true);
    expect(cells.says).toMatch(/^16 Wh: 64 g/);
    // its thickness is not said, so it is taken, and said to be taken
    expect(cells.says).toMatch(/estimate/);
  });
  it('a motor as big as the Earth needs almost no field to give 20 TW turning once a day', () => {
    const c = conceive('Design an electric motor as big as the Earth, with a rotor about 12,700 km across spinning once every 24 hours, that puts out 20 terawatts to power the whole planet.');
    // read at its size: past its own gravity, so nothing kept is made in its place
    expect(c.scale!.groups.find((g) => g.key === 'self-gravity')!.past).toBe(true);
    const m = c.bounds.find((b) => /as a motor/.test(b.what))!;
    expect(m.ok).toBe(true);
    expect(m.what).toMatch(/turning once in 1 day$/);
    expect(m.says).toMatch(/far less than the Earth's own/);
  });
});

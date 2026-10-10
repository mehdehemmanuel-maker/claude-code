import { describe, expect, it } from 'vitest';
import { QUEST3, fitsIpd, frameBudget, pixelAt, pixelsPerDegree, runtime } from '../../src/nexus/headset';
import { componentOf } from '../../src/nexus/components';
import { resolve } from '../../src/nexus/inventory';
import { massOf } from '../../src/nexus/mass';

describe('a headset by its maker\'s figures', () => {
  it('gives how many pixels fall on a degree, from its own pixels and its own field', () => {
    const [x, y] = pixelsPerDegree();
    expect(x).toBeCloseTo(QUEST3.pixels[0] / QUEST3.fov[0], 9); expect(y).toBeCloseTo(QUEST3.pixels[1] / QUEST3.fov[1], 9);
    // (about 19 across and 23 up: a Quest 3's angular resolution is quoted near 25 PPD at the middle, where its
    // lenses are sharpest, which is more than this average over the whole field)
    expect(x).toBeGreaterThan(18); expect(x).toBeLessThan(20);
  });
  it('gives how wide a pixel is at a distance, growing with it', () => {
    const near = pixelAt(500), far = pixelAt(1000);
    expect(far).toBeCloseTo(2 * near, 9);
    // (at half a metre a pixel covers about 0.47 mm: its 110° over 2,064 pixels is 0.053° a pixel)
    expect(near).toBeCloseTo((500 * (QUEST3.fov[0] / QUEST3.pixels[0]) * Math.PI) / 180, 9);
    expect(near).toBeGreaterThan(0.4); expect(near).toBeLessThan(0.5);
  });
  it('gives a frame\'s time at a refresh rate, and refuses one the headset does not run', () => {
    expect(frameBudget(90).ms).toBeCloseTo(11.11, 2); expect(frameBudget(90).refused).toEqual([]);
    expect(frameBudget(120).ms).toBeCloseTo(8.33, 2);
    expect(frameBudget(60).refused[0]).toMatch(/not one of the Meta Quest 3's/);
  });
  it('says whether a face\'s eyes are a distance it can be set to', () => {
    expect(fitsIpd(63)).toEqual({ ok: true, set: 63, says: 'set to 63 mm' });
    const narrow = fitsIpd(48); expect(narrow.ok).toBe(false); expect(narrow.set).toBe(QUEST3.ipd[0]);
    expect(narrow.says).toMatch(/outside the Meta Quest 3's 53–75 mm/);
    expect(runtime().frames).toBe(120 * 3600);
  });
  for (const [w, kg] of [['headset Quest-3', QUEST3.kg], ['vrcontroller Touch-Plus', QUEST3.controller.kg]] as [string, number][]) {
    it(`draws ${w} with every part its inventory lists, weighing what Meta says`, () => {
      const it0 = resolve(w); if (!it0 || typeof it0 === 'string') throw new Error(`${w}: ${String(it0)}`);
      const c = componentOf(it0.id); expect(c, w).toBeTruthy(); expect(c!.faults, w).toEqual([]);
      expect(Math.abs(massOf(c!.part) - kg) / kg, w).toBeLessThan(0.2);
    });
  }
  it('draws its optics on the slide its IPD wheel moves, and its six cameras and depth sensor on its face', () => {
    const it0 = resolve('headset Quest-3'); if (!it0 || typeof it0 === 'string') throw new Error(String(it0));
    const all: { name: string; item?: string; joint?: string }[] = [];
    const walk = (p: { name: string; item?: string; joint?: string; parts?: unknown[] }) => { all.push(p); for (const q of (p.parts ?? []) as typeof p[]) walk(q); };
    walk(componentOf(it0.id)!.part);
    expect(all.filter((p) => p.item === 'headset-optic').length).toBe(2);
    expect(all.filter((p) => p.item === 'headset-optic' && p.joint === 'slide').length).toBe(2);
    expect(all.filter((p) => p.item === 'headset-camera').length).toBe(QUEST3.cameras.colour + QUEST3.cameras.mono);
    expect(all.filter((p) => p.item === 'depth-sensor').length).toBe(QUEST3.cameras.depth);
  });
});

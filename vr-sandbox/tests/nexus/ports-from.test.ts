// Connectors read off the geometry rather than declared. Twenty-eight parts in this library declare a port by hand
// against nine thousand catalogue sizes, so what matters here is that a *generator* that drills holes gives every size
// it makes its own ports: the rail is tested at two sizes for that reason, not for two examples' sake.

import { describe, expect, it } from 'vitest';
import { use } from '../../src/nexus/parts/components';
import { axesFrom, fit, portsFrom, seat, seats, unnamedHoles } from '../../src/nexus/parts/mate';
import type { Port } from '../../src/nexus/parts/kits';

const mirror = (p: Port): Port => ({ ...p, sex: p.sex === 'holes' ? 'threads' : 'holes', n: [-p.n[0], -p.n[1], -p.n[2]], pattern: p.pattern.map(([x, y]) => [-x, y] as [number, number]) });

describe('ports read off a part\'s own drilled holes', () => {
  it('finds the rail\'s mounting pattern at every size the generator makes', () => {
    for (const words of ['rail MGN12 L240', 'rail MGN9 L160', 'rail MGN15 L300']) {
      const ports = portsFrom(use(words));
      expect(ports.length, words).toBeGreaterThanOrEqual(2);
      for (const p of ports) {
        expect(p.pattern.length, `${words} ${p.name}`).toBeGreaterThanOrEqual(2); // two holes fix a turn; one does not
        expect(p.t).toBeGreaterThan(0);
        expect(Math.hypot(...p.n)).toBeCloseTo(1, 6); // its face points somewhere
        expect(Math.abs(p.n[0] * p.u[0] + p.n[1] * p.u[1] + p.n[2] * p.u[2])).toBeCloseTo(0, 6); // across its own normal
      }
    }
  }, 60000);

  it('reads the same pattern every run, so a derived port is a fact and not a sample', () => {
    const a = portsFrom(use('rail MGN12 L240')), b = portsFrom(use('rail MGN12 L240'));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  }, 60000);

  it('a derived port mates with its own mirror, so the existing machinery takes it unchanged', () => {
    const p = portsFrom(use('rail MGN12 L240'))[0]!;
    expect(fit(p, mirror(p)), p.name).not.toBeTypeOf('string');
  }, 60000);

  it('a counterbore is one hole, not two', () => {
    // A seat and the hole through it share an axis. Read apart they came out as two patterns of different sizes on one
    // face, and only one of those is something you can bolt to.
    const ports = portsFrom(use('rail MGN12 L240'));
    const byFace = new Map<string, number>();
    for (const p of ports) { const k = `${p.n.map((x) => x.toFixed(2)).join(',')}|${p.pattern.length}`; byFace.set(k, (byFace.get(k) ?? 0) + 1); }
    for (const [k, n] of byFace) expect(n, `two ports of one count on one face: ${k}`).toBe(1);
  }, 60000);

  it('a hole says which thread it is cut for, rather than being guessed from its radius', () => {
    // The hot end's nozzle thread is drawn at its root diameter, so no reading of the radius calls it M6. It says so.
    const ports = portsFrom(use('heatblock mk8'));
    const unnamed = unnamedHoles(use('heatblock mk8'));
    // Its heater bore and thermistor well are holes for no screw: they are allowed to be unnamed and are not faults.
    expect(unnamed.length).toBeLessThanOrEqual(3);
    expect(ports.every((p) => /^M[\d.]+$/.test(p.thread))).toBe(true);
  }, 60000);

  it('parts with no drilled pattern claim none', () => {
    for (const words of ['screw M5x20', 'nut M5', 'bolt M8x30']) expect(portsFrom(use(words)), words).toEqual([]);
  }, 60000);
});

describe('bores read off a part\'s own turned profiles', () => {
  it('the seat it derives is the bore the part is sold by', () => {
    // The check that makes this worth having: a 6205 is sold as 25 x 52 x 15 and a GT2 B5 by its 5 mm bore, so the
    // derived seat can be held against the catalogue rather than against anyone's opinion of the geometry.
    for (const [words, mm] of [['bearing 6205', 25], ['bearing 625', 5], ['bearing 6204', 20], ['pulley GT2 20T B5', 5]] as [string, number][]) {
      const s = seat(use(words));
      expect(s, words).not.toBeNull();
      expect(+(s!.d * 1000).toFixed(2), `${words} seat`).toBeCloseTo(mm, 1);
    }
  }, 60000);

  it('a shaft of that size seats, and one too big is refused with the number', () => {
    const s = seat(use('bearing 6205'))!;
    expect(seats(s, 25)).toMatchObject({ mm: 25, clearance: 0 });
    expect(seats(s, 30)).toMatch(/does not enter.*5 mm too big/);
    expect(seats(s, 20)).toMatch(/loose.*not a seat/);
  }, 60000);

  it('a bearing\'s bore is the inner ring\'s, not its outer ring\'s raceway', () => {
    // "the biggest bore" was the first rule and it named the 6205's 43.05 mm outer raceway, which is a real inner
    // diameter and not the seat. The part's own axis, then the narrowest way through it, is what names the seat.
    const all = axesFrom(use('bearing 6205'));
    expect(Math.max(...all.map((a) => a.d * 1000))).toBeGreaterThan(40); // the raceway is still found
    expect(seat(use('bearing 6205'))!.d * 1000).toBeCloseTo(25, 1); // and is not mistaken for the seat
  }, 60000);
});

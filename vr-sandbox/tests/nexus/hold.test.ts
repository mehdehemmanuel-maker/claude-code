import { describe, expect, it } from 'vitest';
import { composeMachine } from '../../src/nexus/ask/machine';
import { counterweight, frictionHold, holdsFor, gravityMoment, overCentre, passiveHolds, selfLocking, selfLockingLead, springBalance, type Joint } from '../../src/nexus/ask/hold';
import { springRate, yieldForce } from '../../src/engineering/springs';

const LAMP: Joint = { kg: 0.8, armMm: 400, postMm: 250, attachMm: 120, faceMm: 18, swingDeg: 270 };

describe('a hold that needs no power', () => {
  // The fault this file exists for: `a desk lamp with an arm that stays where you put it` was answered with two
  // NEMA 17s, because holding meant driving and keeping the current on (Run 9c).
  it('the four words that used to mean two steppers are held three ways with nothing drawn', () => {
    const ways = passiveHolds(LAMP);
    expect(ways.length).toBeGreaterThanOrEqual(3);
    expect(ways.every((h) => h.watts === 0)).toBe(true);
    expect(new Set(ways.map((h) => h.how))).toContain('spring');
    const powered = holdsFor(LAMP).find((h) => h.how === 'powered')!;
    expect(powered.watts).toBeGreaterThan(0);              // and it is last, because it is the only one that burns
    expect(holdsFor(LAMP).at(-1)!.cannot ?? powered.how).toBeTruthy();
  });

  // k·a·b = m·g·r has no θ in it, which is the whole reason an Anglepoise holds everywhere and not at one angle.
  it('the spring balance holds at every angle, not one: the balance equation has no angle in it', () => {
    const h = springBalance(LAMP);
    expect(h.cannot).toBeUndefined();
    const k = (LAMP.kg * 9.80665 * (LAMP.armMm / 1000)) / ((LAMP.postMm! / 1000) * (LAMP.attachMm! / 1000));
    // the moment the spring makes is k·a·b·sin θ and gravity's is m·g·r·sin θ: equal at EVERY θ when k·a·b = m·g·r
    for (const deg of [15, 45, 90, 135, 170]) {
      const t = (deg * Math.PI) / 180;
      const spring = k * (LAMP.postMm! / 1000) * (LAMP.attachMm! / 1000) * Math.sin(t);
      const gravity = LAMP.kg * 9.80665 * (LAMP.armMm / 1000) * Math.sin(t);
      expect(spring).toBeCloseTo(gravity, 9);
    }
  });

  it('the coil it picks is a real spring: it makes the rate it claims and does not yield at full stretch', () => {
    const h = springBalance(LAMP);
    const m = /([\d.]+) mm .* wire, ([\d.]+) mm mean coil, (\d+) active coils: ([\d.]+) N\/m/.exec(h.says)!;
    expect(m).toBeTruthy();
    const d = Number(m[1]) / 1000, D = Number(m[2]) / 1000, Na = Number(m[3]), want = Number(m[4]);
    const wire = { A: 1974, m: 0.108, G: 77.2e9, E: 203.4e9, density: 7850, allowableFraction: 0.5, id: 'x', label: 'x', source: 'x' };
    const s = { d, D, Na, L0: 0, wire };
    expect(springRate(s) / want).toBeCloseTo(1, 1);
    expect(yieldForce(s)).toBeGreaterThan(0);
  });

  it('a spring with nowhere to anchor refuses, and says what it needed', () => {
    const h = springBalance({ kg: 1, armMm: 300 });
    expect(h.cannot).toMatch(/nowhere to anchor/);
    expect(h.holds).toBe(0);
  });

  it('a counterweight balances at every angle too, and says what the mass costs', () => {
    const h = counterweight(LAMP, 100);
    expect(h.holds).toBeCloseTo(gravityMoment(LAMP), 6);
    expect(h.says).toMatch(/3\.20 kg at 100 mm/);           // m2 = m1 r1 / r2 = 0.8 × 400 / 100
    expect(h.costs).toMatch(/inertia/);
  });

  it('a clamped joint that cannot hold says so with the number that refuses it', () => {
    expect(frictionHold(LAMP).cannot).toBeUndefined();
    const weak = frictionHold({ ...LAMP, kg: 20 }, 0.2, 2500, 2);
    expect(weak.cannot).toMatch(/holds .* and carries/);
  });

  it('an over-centre catch refuses a joint that has to hold its middle', () => {
    expect(overCentre({ ...LAMP, swingDeg: 270 }).cannot).toMatch(/holds at one angle/);
    expect(overCentre({ ...LAMP, swingDeg: 10 }).cannot).toBeUndefined();
  });
});

describe('a screw that will not be pushed back', () => {
  // lead, not pitch: a four-start screw climbs four times as fast per turn, and that is what decides it
  it('the T8 × 8 this tree built every Z axis on BACKDRIVES; the single start holds', () => {
    const load: Joint = { kg: 5, armMm: 50, screw: { leadMm: 8, meanMm: 7 } };
    const four = selfLocking(load);
    expect(four.cannot).toMatch(/backdrives/);
    expect(four.says).toMatch(/20\.0°/);                    // atan(8 / (π·7))
    const one = selfLocking({ ...load, screw: { leadMm: 2, meanMm: 7 } });
    expect(one.cannot).toBeUndefined();
    expect(one.says).toMatch(/5\.2°/);
  });

  it('the biggest lead that holds is derived from the diameter and the friction, not chosen', () => {
    expect(selfLockingLead(7, 0.16)).toBe(2);               // lead ≤ π·7·0.16 = 3.5 mm, so 2 of {8,4,2,1}
    expect(selfLockingLead(20, 0.16)).toBe(8);              // a fatter screw carries a longer lead
    expect(selfLockingLead(7, 0.02)).toBeNull();            // greased to nothing: no made lead is small enough
  });

  // THE INVARIANT. A gantry that drops when the power cuts is as basic as a fault gets, and it sat in every machine
  // this file composes until Run 9c. This fails the gate if any axis that lifts is ever put on a screw that
  // backdrives again — the check, not just the fix.
  it('every axis that LIFTS in a composed machine is driven by a screw that self-locks', () => {
    for (const words of ['a machine that cuts 400x300x80', 'a machine that prints 300x300', 'a machine that cuts 200x200x60']) {
      const m = composeMachine(words);
      for (const st of m.stages) {
        const lead = /T8 × (\d+) lead screw/.exec(st.unit.says)?.[1];
        if (!lead) continue;
        const vertical = /raises ([\d.]+) kg/.test(st.unit.says) && st.unit.id.startsWith('screw-axis') && st.unit === m.stages.at(-2)?.unit;
        if (!vertical) continue;
        const held = selfLocking({ kg: 1, armMm: 1, screw: { leadMm: Number(lead), meanMm: 7 } });
        expect(held.cannot, `${words}: ${st.unit.name} is on a T8 × ${lead}`).toBeUndefined();
      }
    }
  });
});

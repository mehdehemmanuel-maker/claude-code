import { describe, expect, it } from 'vitest';
import { AIR_ISA, G_EARTH, SEAWATER, HAZARDS, ballast, burn, climb, cushion, droneKg, endurance, hover, hoverAllUp, hoverKg, hovers, hull, jet, jetFuelKg, jetKg, lift, hullPlate, subKg } from '../../src/nexus/machines/craft';
import { componentOf } from '../../src/nexus/parts/components';
import { resolve } from '../../src/nexus/parts/inventory';
import { massOf } from '../../src/nexus/parts/mass';
import { lawById } from '../../src/nexus/book';
import { ofLeaf, type Derivation } from '../../src/nexus/substrate/evaluate';
import { apply } from '../../src/nexus/substrate/law';
import { leaf } from '../../src/nexus/substrate/term';

/** The kind a word names, drawn. */
function drawn(words: string) {
  const r = resolve(words);
  if (!r || typeof r === 'string') throw new Error(`${words}: ${String(r)}`);
  const c = componentOf(r.id);
  if (!c) throw new Error(`${words}: no design`);
  return { ...c, g: massOf(c.part) * 1000 };
}
/** A law of the book, run on its own ports. */
const run = (id: string, inputs: Record<string, number>): number => {
  const t = lawById(id);
  const e: Record<string, Derivation> = Object.fromEntries(t.inputs.map((q) => [q.sym, ofLeaf(leaf(q.name, inputs[q.sym]!, q.unit, { class: 'given', by: 'test' }))]));
  const d = apply(t, e);
  if (d.value === null) throw new Error(`${id}: ${d.refusal?.domain ?? d.because ?? 'no value'}`);
  return d.value;
};

describe('a rotor holding something up: momentum theory', () => {
  it('agrees with the book\'s own law, read the other way round', () => {
    // (hover() works the power out from the thrust; thrust.ideal-static works the thrust out from the power. Put one
    //  into the other and the thrust comes back, which is the only check that matters)
    const h = hover(0.9, 0.24, 4);
    expect(run('thrust.ideal-static', { rho: AIR_ISA, A: h.A, P: h.ideal })).toBeCloseTo(h.T, 6);
  });
  it('costs less power over a bigger disc, for the same weight', () => {
    const small = hover(2, 0.2, 4), big = hover(2, 0.4, 4);
    expect(big.wattsAll).toBeLessThan(small.wattsAll);
    // (the ideal power goes as 1/√A, so twice the diameter is half the power)
    expect(small.ideal / big.ideal).toBeCloseTo(2, 2);
  });
  it('throws the air down faster the harder its disc is loaded', () => {
    const h = hover(2, 0.3, 4);
    expect(h.vi).toBeCloseTo(Math.sqrt(h.disc / (2 * AIR_ISA)), 9);
  });
  it('lift() is hover() inverted: the power a rotor draws is the power that holds its share up', () => {
    const h = hover(1.4, 0.28, 4);
    expect(lift(h.watts, 0.28, 4).kg).toBeCloseTo(1.4, 6);
  });
  it('spends a pack in minutes, not hours', () => {
    const e = endurance(140, 77);
    expect(e.minutes).toBeCloseTo((77 * 0.8 * 60) / 140, 9);
    expect(e.minutes).toBeGreaterThan(10); expect(e.minutes).toBeLessThan(60);
  });
});

describe('a jet: what it pushes with and what it burns', () => {
  it('pushes by its mass flow times the speed it adds', () => {
    expect(jet(2, 500, 0)).toBe(1000);
    expect(jet(2, 500, 100)).toBe(800);
    expect(jet(2, 500)).toBe(run('thrust.jet', { mdot: 2, ve: 500, v0: 0 }));
  });
  it('says plainly when a set of engines cannot lift what it is strapped to', () => {
    const no = hovers(130, 200, 2);
    expect(no.ok).toBe(false); expect(no.says).toContain('does not leave the ground');
    const yes = hovers(130, 400, 5);
    expect(yes.ok).toBe(true); expect(yes.ratio).toBeGreaterThan(1.5);
  });
  it('burns its fuel in minutes, which is why a jet suit\'s flight is short', () => {
    const b = burn(2000, 0.17, 23);
    expect(b.kgPerHour).toBeCloseTo(340, 6);
    expect(b.minutes).toBeGreaterThan(2); expect(b.minutes).toBeLessThan(8);
  });
});

describe('an air cushion: a hovercraft floats on a hundredth of an atmosphere', () => {
  const c = cushion(1000, 10, 20, 0.02, { L: 5 });
  it('presses no harder than its own weight over its own area', () => {
    expect(c.p).toBeCloseTo(run('cushion.pressure', { m: 1000, A: 10 }), 6);
    expect(c.p / 101325).toBeLessThan(0.02);
  });
  it('loses the air its own pressure drives out under the skirt, and the fan puts it back', () => {
    expect(c.Q).toBeCloseTo(run('cushion.escape', { Cd: 0.53, Lp: 20, h: 0.02, p: c.p, rho: AIR_ISA }), 6);
    expect(c.watts).toBeCloseTo((c.Q * c.p) / 0.6, 6);
  });
  it('has a hump speed to get over, from the wave its own depression makes', () => {
    expect(c.hump).toBeCloseTo(Math.sqrt(G_EARTH * 5), 9);
  });
  it('climbs only what its thrust climbs, because a cushion has no grip', () => {
    const g = climb(1000, 2000);
    expect(g.grade).toBeCloseTo(2000 / (1000 * G_EARTH), 9);
    expect(g.says).toContain('no grip');
  });
});

describe('a hull in water: how deep it may go, and what floats it', () => {
  it('buckles where Windenburg and Trilling say it does', () => {
    const h = hull(100, 2, 0.02, 2);
    expect(h.buckle).toBeCloseTo(run('hull.collapse', { E: 200e9, t: 0.02, D: 2, Lh: 2 }), 3);
  });
  it('is held by buckling when it is thin and by yielding when it is thick', () => {
    expect(hull(100, 1.2, 0.006, 2).buckle).toBeLessThan(hull(100, 1.2, 0.006, 2).squash);
    expect(hull(100, 1.2, 0.08, 2).squash).toBeLessThan(hull(100, 1.2, 0.08, 2).buckle);
  });
  it('wants more plate for more depth, and more again for a wider hull', () => {
    expect(hullPlate(300, 1.2, 2).t).toBeGreaterThan(hullPlate(100, 1.2, 2).t);
    expect(hullPlate(100, 2.0, 2).t).toBeGreaterThan(hullPlate(100, 1.2, 2).t);
  });
  it('finds a plate whose margin is the factor asked for, and no more than it must', () => {
    const f = hullPlate(100, 1.2, 2, 1.5);
    expect(f.hull.margin).toBeGreaterThanOrEqual(1.5);
    expect(hull(100, 1.2, f.t - 0.0005, 2).margin).toBeLessThan(1.5);
  });
  it('floats what displaces more than it weighs, and sinks what does not', () => {
    const up = ballast(2.5, 1800);
    expect(up.lift).toBeCloseTo(2.5 * SEAWATER, 6);
    expect(up.take).toBeGreaterThan(0); expect(up.says).toContain('reserve');
    expect(ballast(1.0, 1800).says).toContain('sinks');
  });
});

describe('each craft drawn whole, and weighing what its kind says', () => {
  for (const words of ['drone 4 span250', 'drone 4 span450', 'drone 6 span650', 'hovercraft L5 2', 'hovercraft L3 1', 'jetsuit 5 T400', 'jetsuit 4 T400', 'submarine depth100 D1200', 'submarine depth300 D1600']) {
    it(`${words}: nothing its inventory lists is left out, and its mass agrees`, () => {
      const d = drawn(words);
      expect(d.faults).toEqual([]);
      expect(d.g).toBeGreaterThan(0);
    });
  }
  it('a bigger drone weighs more and hovers on more power', () => {
    expect(droneKg(4, 0.45)).toBeGreaterThan(droneKg(4, 0.25));
    expect(hover(droneKg(4, 0.45), 0.29, 4).wattsAll).toBeGreaterThan(hover(droneKg(4, 0.25), 0.16, 4).wattsAll);
  });
  it('a hovercraft\'s own mass is not its all-up mass: the people are counted where the cushion is', () => {
    expect(hoverAllUp(5, 2)).toBe(hoverKg(5, 2) + 180);
    expect(hoverKg(5, 2)).toBeLessThan(hoverAllUp(5, 2));
    // (its seats are the craft's; the people in them are not)
    expect(hoverKg(5, 4) - hoverKg(5, 1)).toBe(36);
  });
  it('a jet suit\'s mass is engines, frame, fuel and a pilot, and the kind weighs it without the pilot', () => {
    expect(jetKg(5, 400)).toBeGreaterThan(90);
    expect(jetFuelKg(5, 400)).toBeGreaterThan(5);
    expect(drawn('jetsuit 5 T400').g / 1000).toBeLessThan(jetKg(5, 400) - 90 + 20);
  });
  it('a deeper submarine is heavier, because its plate is thicker', () => {
    expect(subKg(300, 1.2)).toBeGreaterThan(subKg(100, 1.2));
  });
});

describe('what each one can do to the person building it, said plainly', () => {
  for (const k of ['drone', 'jetpack', 'hovercraft', 'submarine']) {
    it(`${k}: its hazards are named, not hinted at`, () => {
      expect(HAZARDS[k]!.length).toBeGreaterThanOrEqual(3);
      for (const h of HAZARDS[k]!) expect(h.length).toBeGreaterThan(40);
    });
  }
  it('a jet suit says there is no glide and no autorotation', () => {
    expect(HAZARDS.jetpack!.join(' ')).toMatch(/autorotation|no glide/);
  });
  it('a submarine says a hull that fails implodes', () => {
    expect(HAZARDS.submarine!.join(' ')).toContain('implodes');
  });
  it('the kinds carry those hazards into what they say about themselves', () => {
    const r = resolve('submarine depth100 D1200');
    expect(typeof r === 'object' && r !== null && 'spec' in r ? String(r.spec) : '').toContain('implodes');
  });
});

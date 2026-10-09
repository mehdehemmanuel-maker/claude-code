import { describe, expect, it } from 'vitest';
import { EFFECTS, invent, sayInvention } from '../../src/nexus/invent';

describe('inventing what nothing kept does', () => {
  it('turns ocean waves into drinking water by a chain whose ports mate, sized under the floor of the laws, its missing membrane said', () => {
    const v = invent('a machine that turns ocean waves into drinking water'), c = v.chains[0]!;
    expect(v.want?.flow).toBe('fresh water');
    expect(c.stages.map((s) => s.name)).toEqual(['the waves', 'wave float', 'piston pump', 'reverse-osmosis membrane']);
    expect(c.out.unit).toBe('l');
    // (no better than the laws allow: under what the least work to separate it would give from the same pumping)
    const floor = Number(/at most ([\d.]+) l/.exec(c.floor!)![1]);
    expect(c.out.value).toBeGreaterThan(100); expect(c.out.value).toBeLessThan(floor);
    expect(c.parts.find((p) => p.words === 'reverse-osmosis membrane')?.have).toBe(false);
    expect(sayInvention(v)).toMatch(/Not kept yet: reverse-osmosis membrane/);
  });
  it('lights a lamp from a raised weight, matching its slow drum to the generator by as many gear stages as the ratio needs', () => {
    const c = invent('a lamp powered by gravity').chains[0]!, gear = c.stages.find((s) => s.adapter)!;
    expect(c.stages[0]!.name).toBe('a raised weight');
    expect(gear.name).toMatch(/gear train, [45] stages/); // 1.4 rpm to 3000 rpm is about 1:2100, at most 1:6 a stage
    expect(c.parts.every((p) => p.have)).toBe(true);
    // (honest about how little a falling weight gives: a fraction of a watt, tens of lumens)
    expect(c.out.unit).toBe('lm'); expect(c.out.value).toBeGreaterThan(5); expect(c.out.value).toBeLessThan(50);
  });
  it('keeps out what it is asked to: a fridge with no electricity uses no stage that makes or takes it', () => {
    const v = invent('a fridge with no electricity');
    expect(v.excluded).toEqual(['electricity']);
    for (const c of v.chains) for (const s of c.stages) expect(s.effect && (s.effect.from === 'electric' || s.effect.to === 'electric')).toBeFalsy();
    expect(v.chains[0]!.stages.some((s) => s.name === 'absorption cooler')).toBe(true);
  });
  it('runs on what it is said to run on: a wind pump starts from the wind, not the wall', () => {
    const v = invent('a wind pump for a farm');
    expect(v.chains.length).toBeGreaterThan(0);
    for (const c of v.chains) expect(c.stages[0]!.name).toBe('the wind');
  });
  it('never gives more than goes in: each chain is its source times what each stage keeps', () => {
    for (const a of ['a charger that runs on a river', 'a hand-cranked flashlight', 'a stove that makes electricity from its fire', 'a wind pump for a farm']) {
      for (const c of invent(a).chains) if (c.out.unit === 'W') expect(c.out.value, `${a}: ${c.says}`).toBeLessThanOrEqual(c.source.watts * c.keeps + 1e-9);
    }
    // (and no effect keeps more than it takes, but a cooler, whose number is the heat it moves for each watt)
    for (const e of EFFECTS) if (e.eta !== undefined && e.to !== 'cold') expect(e.eta, e.name).toBeLessThanOrEqual(1);
  });
  it('says what it would need where nothing reaches what is wanted, and asks what to make where nothing is said', () => {
    expect(invent('a box').why).toMatch(/nothing it should give was read/);
  });
});

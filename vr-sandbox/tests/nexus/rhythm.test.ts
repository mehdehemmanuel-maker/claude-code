import { describe, expect, it } from 'vitest';
import { clock, CORTISOL, dayOf, hourOf, MELATONIN, momentOf, TYPICAL_DAY } from '../../src/nexus/life/rhythm';
import { LifeGraph } from '../../src/nexus/life/graph';

const d = TYPICAL_DAY;
describe('the messengers\' daily rhythms', () => {
  it('melatonin: at its day level by day, rising from 2 h before sleep, its peak by age about 3 a.m.', () => {
    expect(MELATONIN.at(12, d)).toBeCloseTo(1.5, 5); expect(MELATONIN.at(20.5, d)).toBeCloseTo(1.5, 5);
    expect(MELATONIN.at(22, d)).toBeGreaterThan(5); expect(MELATONIN.at(3, d)).toBeCloseTo(72.4, 1);
    expect(MELATONIN.at(3, { ...d, age: 85 })).toBeCloseTo(24.8, 1); expect(MELATONIN.at(8.5, d)).toBeCloseTo(1.5, 5);
    expect(MELATONIN.says(3, d)).toMatch(/peak/); expect(MELATONIN.says(13, d)).toMatch(/day level/);
  });
  it('cortisol: 15 nmol/L on waking, half again 30 min after, under the late-night 7.6 by 11 p.m.', () => {
    expect(CORTISOL.at(7, d)).toBeCloseTo(15, 5); expect(CORTISOL.at(7.5, d)).toBeCloseTo(22.5, 5);
    expect(CORTISOL.at(23.5, d)).toBeLessThan(7.6); expect(CORTISOL.at(12, d)).toBeLessThan(CORTISOL.at(8, d)); expect(CORTISOL.at(5, d)).toBeGreaterThan(CORTISOL.at(1, d));
    expect(CORTISOL.says(7.3, d)).toMatch(/awakening response/);
  });
  it('moves with the user\'s own sleep', () => {
    const late = { sleep: 2, wake: 10, age: 25 }; expect(MELATONIN.at(3, late)).toBeLessThan(MELATONIN.at(6, late)); expect(CORTISOL.at(10.5, late)).toBeCloseTo(22.5, 5);
    expect(momentOf(3).map((m) => m.id)).toEqual(['melatonin', 'cortisol']);
  });
  it('reads hours and sleep from words', () => {
    expect(hourOf('3am')).toBe(3); expect(hourOf('the walk at 7:30 pm')).toBe(19.5); expect(hourOf('15:45 coffee')).toBe(15.75); expect(hourOf('midnight')).toBe(0); expect(hourOf('Riverside park')).toBeNull();
    expect(dayOf('23:00 to 7:00')).toEqual({ sleep: 23, wake: 7, age: 25 }); expect(dayOf('I sleep at 11 and wake at 7')!.sleep).toBe(23); expect(dayOf('sleep 1am wake 9am')).toMatchObject({ sleep: 1, wake: 9 });
    expect(clock(19.5)).toBe('7:30 p.m.'); expect(clock(0)).toBe('12 a.m.');
  });
  it('a time node and each rhythm\'s messenger show each other, by what it is doing then', () => {
    const g = new LifeGraph(), t = g.add('time', '3am');
    expect(g.of(t.id)!.linked.find((l) => l.node.id === 'melatonin')!.how).toMatch(/^at 3 a\.m\.: 72\.4 pg\/mL in plasma, near its night's peak/);
    expect(g.of('melatonin')!.linked.some((l) => l.node.id === t.id)).toBe(true); expect(g.of('cortisol')!.linked.some((l) => l.node.id === t.id)).toBe(true);
    g.day = { sleep: 2, wake: 10, age: 40 }; const back = new LifeGraph(JSON.parse(JSON.stringify(g.saved())));
    expect(back.day).toEqual({ sleep: 2, wake: 10, age: 40 }); expect(back.of(t.id)!.linked.find((l) => l.node.id === 'melatonin')!.how).toMatch(/rising for the night/);
  });
});

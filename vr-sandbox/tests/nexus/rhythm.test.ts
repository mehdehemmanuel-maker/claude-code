import { describe, expect, it } from 'vitest';
import { ADRENALINE, BETA_ENDORPHIN, clock, CORTISOL, cosinor, dayOf, dayOfEach, fromTwo, hourOf, MELATONIN, momentOf, RHYTHMS, TYPICAL_DAY, WITHOUT } from '../../src/nexus/life/rhythm';
import { MESSENGER_IDS } from '../../src/nexus/life/graph';
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
    expect(momentOf(3).map((m) => m.id)).toEqual(['melatonin', 'cortisol', 'endorphins', 'adrenaline']);
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

describe('a rhythm is data, and so is the lack of one', () => {
  it('the two-point fit reproduces the very samples it was built from', () => {
    // Infante 1998's controls: 25.4 pg/mL at 09:00 and 17.7 at 20:00, with a peak taken as ACTH's (waking + 0.5 h).
    // The measurement is the INPUT, so the curve must pass through both points exactly, not near them.
    expect(BETA_ENDORPHIN.at(9, d)).toBeCloseTo(25.4, 2);
    expect(BETA_ENDORPHIN.at(20, d)).toBeCloseTo(17.7, 2);
  });
  it('two samples at the same place on the cosine are refused rather than fitted', () => {
    // 6 a.m. and 9 a.m. sit either side of a 7:30 peak at the same height: they cannot tell amplitude from mesor,
    // and a fit that answered anyway would be a number invented out of a degenerate pair.
    expect(() => fromTwo([6, 20], [9, 20], 7.5)).toThrow(/same place on the cosine/);
  });
  it('a cosinor peaks where it says it does, whichever the day', () => {
    const r = cosinor({ id: 'x', unit: 'u', mesor: 10, amp: 4, peak: 3, relTo: 'wake', src: 'a test', high: 'high', low: 'low' });
    const early = { sleep: 22, wake: 6, age: 30 }, late = { sleep: 3, wake: 11, age: 30 };
    expect(r.at(9, early)).toBeCloseTo(14, 6);    // waking + 3 h
    expect(r.at(14, late)).toBeCloseTo(14, 6);    // the peak moves with the person, not the clock
    expect(r.at(21, early)).toBeCloseTo(6, 6);    // and twelve hours later it is at the bottom
  });
  it('adrenaline is lowest asleep and climbing after waking, which is the one thing Dodt measured', () => {
    const mid = (d.sleep + 4) % 24;               // the middle of the night
    expect(ADRENALINE.at(mid, d)).toBeLessThan(ADRENALINE.at(d.wake, d));
    expect(ADRENALINE.at(d.wake + 2, d)).toBeGreaterThan(ADRENALINE.at(d.wake, d));
    expect(ADRENALINE.at(mid, d)).toBeGreaterThan(0);          // a concentration, never negative
  });
  it('every one of the eleven messengers is answered: a curve, or why there is none', () => {
    const answered = new Set([...Object.keys(RHYTHMS), ...Object.keys(WITHOUT)]);
    expect(MESSENGER_IDS.filter((m) => !answered.has(m))).toEqual([]);
    // and the two sets do not overlap: a messenger cannot both have a curve and a reason for having none
    expect(Object.keys(RHYTHMS).filter((k) => WITHOUT[k])).toEqual([]);
    expect(dayOfEach()).toHaveLength(MESSENGER_IDS.length);
    for (const w of Object.values(WITHOUT)) expect(w.src.length, `${w.id} says why with no source`).toBeGreaterThan(20);
  });
  it('noradrenaline is refused a curve, and the refusal says posture rather than "not done yet"', () => {
    expect(RHYTHMS.noradrenaline).toBeUndefined();
    expect(WITHOUT.noradrenaline!.why).toBe('looked-and-found-none');
    expect(WITHOUT.noradrenaline!.says).toMatch(/POSTURE/);
    expect(WITHOUT.noradrenaline!.says).toMatch(/180 %/);      // the number that makes the case
  });
  it('the three fast transmitters are refused for a different reason from the two unreachable ones', () => {
    for (const id of ['acetylcholine', 'gaba', 'glutamate']) expect(WITHOUT[id]!.why).toBe('no-blood-level-to-have-one');
    for (const id of ['dopamine', 'serotonin']) expect(WITHOUT[id]!.why).toBe('measured-elsewhere');
    expect(WITHOUT.oxytocin!.why).toBe('looked-and-found-none');
  });
  it('the graph says why a messenger has no day, and says nothing for one that has', () => {
    const g = new LifeGraph();
    expect(g.whyNoDay('melatonin')).toBeNull();
    expect(g.whyNoDay('gaba')!.why).toMatch(/synaptic transmitter/);
    expect(g.whyNoDay('oxytocin')!.why).toMatch(/looked for and is not there/);
    expect(g.whyNoDay('a-place-of-mine')).toBeNull();
  });
  it('a time node now shows four messengers, not two', () => {
    const g = new LifeGraph(), t = g.add('time', '9am');
    const msgs = g.of(t.id)!.linked.filter((l) => l.node.kind === 'messenger').map((l) => l.node.id).sort();
    expect(msgs).toEqual(['adrenaline', 'cortisol', 'endorphins', 'melatonin']);
    expect(momentOf(9, d)).toHaveLength(4);
  });
});

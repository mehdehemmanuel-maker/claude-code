// WHAT TURNS IS WHAT SAYS IT TURNS. `critic.ts`'s `turning()` is the predicate behind every `room to move` finding,
// and it used to answer by matching the part's name against twenty-two words with a hand-kept list of name exceptions
// beside it. Measured on one hatchback: of 16 open `room to move` findings, 8 came from `reduction gear and
// differential` — a CAST HOUSING, the only part of that assembly that is drawn — because its name contains "gear".
// The subframe it is bolted to, the steering rack, the motor, the inverter and the torque rod that holds it were all
// reported as being in the way of a casting that does not move. Two more came from `stub spindle`, `joint: 'bearing'`,
// a shaft turning in its own race (docs/ROUNDS.md Run 7h).
//
// So a part may now say. This file holds the three answers apart: what the part declares, what its joint implies, and
// the name list that still answers for everything that says nothing.
import { describe, expect, it } from 'vitest';
import type { Part } from '../../src/nexus/parts/kits';
import { KITS, makeKit } from '../../src/nexus/parts/kits';
import { perfect } from '../../src/nexus/make/pipeline';
import { turning } from '../../src/nexus/make/critic';

const P = (name: string, more: Partial<Part> = {}): Part => ({ name, shape: { cyl: [0.05, 0.1] }, mat: 'steel', ...more });

describe('what turns', () => {
  it('a part that says it does not turn, does not, however it is named', () => {
    expect(turning(P('reduction gear and differential')), 'the name alone still answers').toBeTruthy();
    expect(turning(P('reduction gear and differential', { rotates: false }))).toBeNull();
  });

  it('a part that turns inside a named member sweeps its own solid and asks no room', () => {
    expect(turning(P('input shaft gear', { rotates: { within: 'the gearbox case' } }))).toBeNull();
  });

  it('a journalled part asks no room, and one that also travels keeps its envelope', () => {
    expect(turning(P('stub spindle', { joint: 'bearing' })), 'it turns in its own race').toBeNull();
    // (a wheel on a bearing still steers and rises RELATIVE to the body, and that envelope is real whatever holds its
    //  axis: this is the line that stops the journalled rule from quietly cancelling every arch on the car)
    expect(turning(P('front wheel', { joint: 'bearing', travel: { steer: 0.6, bump: 0.08 } }))).toBeTruthy();
  });

  it('the name list still answers for a part that says nothing', () => {
    expect(turning(P('17 in alloy rim'))?.clearance, 'a wheel asks 30 mm to its arch').toBe(0.03);
    expect(turning(P('cooling fan'))?.clearance, "a fan's tip asks 5 mm").toBe(0.005);
    expect(turning(P('floor pan')), 'and a panel does not turn').toBeNull();
  });

  // THE MEASUREMENT, kept: the hatchback's `room to move` is the four wheels against the bodywork over them, and
  // nothing else. Before this round it was that plus eight complaints from a casting and two from a shaft in its race.
  // A number here is a ratchet: it may fall as the bodywork is fixed, never rise.
  it('a hatchback: only its wheels ask for room, and only of the bodywork over them', () => {
    const k = KITS.find((x) => x.id === 'car')!, words = 'a small hatchback';
    const m = perfect(makeKit(k, words, 1).part, words);
    const rtm = m.findings.filter((f) => !f.fixed && f.check === 'room to move');
    expect([...new Set(rtm.map((f) => f.part))].sort(), 'something that is not a wheel is asking for room to turn').toEqual(['front left wheel', 'front right wheel', 'rear left wheel', 'rear right wheel']);
    expect(rtm.length, 'room to move on a hatchback: 6 when this was written, and it may fall but not rise').toBeLessThanOrEqual(6);
  }, 120000);
});

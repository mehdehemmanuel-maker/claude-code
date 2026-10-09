import { describe, expect, it } from 'vitest';
import { bridges, cut, HAND, jointPoint, LAYOUT, leadAt, letGo, newBench, payOut, PROTO, PROTO_STEPS, protoHold, readout, STEPS, takeUp, tick, TRIM, wipe, type Bench, type V3 } from '../../src/nexus/solder-lesson';
import { grade, idealVolume } from '../../src/nexus/solder-joint';

const dt = 1 / 60;
/** The hands held so for s seconds: the tip at `tip`, the wire's end at `wire` (each null when away). */
function hold(b: Bench, s: number, tip: V3 | null, wire: V3 | null): void { for (let t = 0; t < s - 1e-9; t += dt) tick(b, dt, tip, wire); }
const away: V3 = [0, 60, 0];
/** A bench with the headers and the Pico in place, the iron hot in hand and tinned, the solder in the other hand. */
function ready(): Bench {
  const b = newBench();
  letGo(b, 'header-a', [0, LAYOUT.board.top + LAYOUT.strip, 8.89]); letGo(b, 'header-b', [0, LAYOUT.board.top + LAYOUT.strip, -8.89]); letGo(b, 'pico', [0, LAYOUT.picoTop, 0]);
  takeUp(b, 'iron'); takeUp(b, 'solder'); hold(b, 8, away, null); hold(b, 0.3, away, away); return b;
}
/** A joint made as the lesson says: the tip on pad and pin for `heat` s, then solder fed to the joint for `feed` s, the
 *  wire away, then the tip away to let it cool. */
function solder(b: Bench, n: number, heat = 1.3, feed = 0.95): void { const p = jointPoint(n); while (b.wire.out < 15) payOut(b); hold(b, heat, p, null); hold(b, feed, p, p); hold(b, 0.3, p, null); hold(b, 2, away, null); }

describe('a hands-on soldering lesson: the Pico\'s headers', () => {
  it('takes its steps only in order, each when it is done by hand', () => {
    const b = newBench(); expect(b.step).toBe(0);
    expect(letGo(b, 'pico', [0, LAYOUT.picoTop, 0])).toMatch(/headers go in the breadboard first/);
    expect(letGo(b, 'header-a', [0, 30, 0])).toMatch(/goes back/); expect(b.placed['header-a']).toBe(false);
    letGo(b, 'header-a', [0.5, LAYOUT.board.top + LAYOUT.strip, 9.5]); expect(b.placed['header-a']).toBe(true);
    // (the second header cannot take the first's row)
    expect(letGo(b, 'header-b', [0, LAYOUT.board.top + LAYOUT.strip, 8.89])).toMatch(/goes back/);
    letGo(b, 'header-b', [0, LAYOUT.board.top + LAYOUT.strip, -8.89]); tick(b, dt, null, null); expect(b.step).toBe(1);
    letGo(b, 'pico', [1, LAYOUT.picoTop + 1, -1]); tick(b, dt, null, null); expect(b.step).toBe(2);
  });
  it('heats the iron to its set 330 °C, and tins its tip only once it is hot enough to melt the solder', () => {
    const b = newBench(); takeUp(b, 'iron'); takeUp(b, 'solder');
    hold(b, 1, away, away); expect(b.iron.tinned).toBe(0); expect(readout(b).last.join(' ')).toMatch(/not hot enough/);
    hold(b, 8, away, null); expect(b.iron.T).toBeGreaterThan(300);
    hold(b, 0.3, away, away); expect(b.iron.tinned).toBeGreaterThan(0);
  });
  it('makes a good joint heated first, then fed its solder, then left to cool; its wire used up as it melts', () => {
    const b = ready(), out = b.wire.out; solder(b, 1);
    const g = grade(b.joints[0]!.j); expect(g.grade).toBe('good'); expect(b.wire.out).toBeLessThan(out - 3);
    expect(readout(b).joint).toMatch(/pin 1 \(GP0\).*good/);
  });
  it('makes a cold joint when the solder is fed to the iron before the joint is hot, and mends it when reheated', () => {
    const b = ready(), p = jointPoint(5), onTip: V3 = [p[0], p[1] + 1.0, p[2]];
    hold(b, 0.15, p, null); hold(b, 0.6, p, onTip); hold(b, 2, away, null);
    expect(grade(b.joints[4]!.j).grade).toBe('cold'); expect(b.log.join(' ')).toMatch(/balls on the cold joint/);
    hold(b, 2.5, p, null); hold(b, 2, away, null); expect(grade(b.joints[4]!.j).grade).not.toBe('cold');
  });
  it('bridges two neighbours fed far too much, and a clean tip draws the excess off them', () => {
    const b = ready(); solder(b, 10, 1.3, 2.4); solder(b, 11, 1.3, 2.4);
    expect(bridges(b)).toContainEqual([10, 11]);
    for (let k = 0; k < 8 && bridges(b).length; k++) { wipe(b); hold(b, 1.5, jointPoint(k % 2 ? 11 : 10), null); hold(b, 1, away, null); }
    expect(bridges(b)).toEqual([]);
  });
  it('is done when all 40 are good and the iron is back in its stand', () => {
    const b = ready(); expect(STEPS[b.step]!.src).toMatch(/solder-headers 3/);
    for (const n of [1, 20, 21, 40]) solder(b, n);
    expect(STEPS[b.step]!.src).toMatch(/solder-headers 4/);
    for (let n = 1; n <= 40; n++) if (![1, 20, 21, 40].includes(n)) { if (b.iron.tinned < 5) hold(b, 0.3, away, away); wipe(b); solder(b, n); }
    expect(b.joints.filter((q) => grade(q.j).grade !== 'good').map((q) => `${q.pin} ${grade(q.j).grade}`)).toEqual([]);
    expect(b.step).toBe(STEPS.length - 1); letGo(b, 'iron', null); hold(b, 3, null, null); expect(b.step).toBe(STEPS.length);
    expect(readout(b).do).toMatch(/Done/);
  });
});

describe('a hands-on soldering lesson: an LED and its resistor on a Perma-Proto', () => {
  // (a part held over the middle of its holes in the board lying on the bench)
  const over = (k: 'resistor' | 'led' | 'link'): V3 => { const q = PROTO.seats[k]; return [PROTO.at[0] + (q[0]![0] + q[1]![0]) / 2, 12, PROTO.at[2] + (q[0]![1] + q[1]![1]) / 2]; };
  // (fed as long as it takes the wire, at the hand's pace, to give a joint its good amount: a Perma-Proto's 1.2 mm hole
  // through 1.6 mm holds about two and a half times a Pico's)
  const solderAt = (b: Bench, n: number) => { const q = b.joints[n - 1]!, p = q.at, feed = idealVolume(q.shape) / (HAND.feedMm * (Math.PI / 4) * HAND.wire ** 2);
    while (b.wire.out < 25) payOut(b); hold(b, 1.6, p, null); hold(b, feed, p, p); hold(b, 0.3, p, null); hold(b, 2, away, null); };
  function protoReady(): Bench {
    const b = newBench('proto'); for (const k of ['resistor', 'led', 'link'] as const) letGo(b, k, over(k)); letGo(b, 'proto', protoHold());
    takeUp(b, 'iron'); takeUp(b, 'solder'); hold(b, 8, away, null); hold(b, 0.3, away, away); return b;
  }
  it('takes its parts in over their holes, the LED only the right way round, and the board into the hands only with them in', () => {
    const b = newBench('proto'); expect(b.joints.length).toBe(6);
    expect(letGo(b, 'proto', protoHold())).toMatch(/parts in first/);
    expect(letGo(b, 'resistor', [0, 12, 0])).toMatch(/not over its holes/);
    letGo(b, 'resistor', over('resistor')); tick(b, dt, null, null); expect(b.step).toBe(1);
    expect(letGo(b, 'led', over('led'), { reversed: true })).toMatch(/wrong way.*long lead.*anode/); expect(b.placed.led).toBe(false);
    expect(letGo(b, 'led', over('led'), { upright: false })).toMatch(/upright.*legs down/); expect(b.placed.led).toBe(false);
    letGo(b, 'led', over('led')); letGo(b, 'link', over('link')); tick(b, dt, null, null); expect(b.step).toBe(3);
    expect(letGo(b, 'proto', protoHold(), { over: false })).toMatch(/turn the board over first/); expect(b.placed.proto).toBe(false);
    expect(letGo(b, 'proto', protoHold())).toMatch(/underside up/); tick(b, dt, null, null); expect(b.step).toBe(4);
    expect(takeUp(b, 'led')).toMatch(/take the board out first/);
  });
  it('solders its six joints good, the leads 0.6 mm round and the LED\'s legs 0.5 square in 1.2 mm holes', () => {
    const b = protoReady(); expect(PROTO_STEPS[b.step]!.src).toMatch(/solder-proto 5/);
    for (let n = 1; n <= 6; n++) { if (b.iron.tinned < 5) hold(b, 0.3, away, away); wipe(b); solderAt(b, n); }
    expect(b.joints.map((q) => grade(q.j, q.shape).grade)).toEqual(Array(6).fill('good'));
    expect(PROTO_STEPS[b.step]!.src).toMatch(/solder-proto 6/);
  });
  it('trims each lead to IPC-A-610\'s protrusion: too high says cut closer, into the fillet says it bit the joint; done with all six', () => {
    const b = protoReady(); for (let n = 1; n <= 6; n++) { if (b.iron.tinned < 5) hold(b, 0.3, away, away); wipe(b); solderAt(b, n); }
    const q = b.joints[2]!, p = leadAt(q, 1);
    expect(cut(b, leadAt(q, 5))).toMatch(/still stands: cut closer/); expect(q.lead).toBeCloseTo(5);
    expect(cut(b, [p[0] + 5, p[1], p[2]])).toMatch(/closed on nothing/);
    expect(cut(b, leadAt(q, 0.3))).toMatch(/bit into the fillet/);
    // (the jaws' edge across a lead, its tip 3 mm past it, levelled 1.2 mm along it: cut where the edge crosses it)
    const r0 = b.joints[0]!, x = leadAt(r0, 1.2), side: V3 = [r0.dir[2], 0, -r0.dir[0]], l = Math.hypot(side[0], side[2]);
    expect(cut(b, [x[0] - (side[0] / l) * 3, x[1], x[2] - (side[2] / l) * 3], [side[0] / l, 0, side[2] / l])).toMatch(/1\.2 mm standing/);
    for (const r of b.joints) cut(b, leadAt(r, 1.2));
    expect(b.joints.every((r) => r.lead <= TRIM.max)).toBe(true);
    // (the bitten joint heated again mends; then every joint good and every lead trimmed, the iron back: done)
    hold(b, 2.5, q.at, null); hold(b, 2, away, null); tick(b, dt, null, null);
    letGo(b, 'iron', null); hold(b, 3, null, null); expect(b.step).toBe(PROTO_STEPS.length); expect(readout(b).do).toMatch(/Done/);
  });
});

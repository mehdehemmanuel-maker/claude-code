import { describe, expect, it } from 'vitest';
import { bridges, jointPoint, LAYOUT, letGo, newBench, payOut, readout, STEPS, takeUp, tick, wipe, type Bench, type V3 } from '../../src/nexus/solder-lesson';
import { grade } from '../../src/nexus/solder-joint';

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

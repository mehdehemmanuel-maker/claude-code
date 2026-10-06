// Frames grown along their loads, in the intent pipeline: what an ask says (what it holds, how high or how far out,
// what holds it, the wind it stands in) is the ground the frame is grown from, and its shape is what those ask.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import type { Jolt } from '../../src/nexus/realize';
import { answersFrom, conceive, designs } from '../../src/nexus/conceive';

let J: Jolt;
beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const go = (words: string) => { let c = conceive(words), all: Record<string, string> = {}; for (let k = 0; k < 3 && c.questions.length; k++) { all = { ...all, ...answersFrom(c, 'go') }; c = conceive(words, all); } return c; };
const made = (words: string, physics: Jolt | null = null, seed = 101) => designs(go(words), 1, { seed, physics })[0]!;
const check = (d: ReturnType<typeof made>, what: RegExp) => d.checks.find((x) => what.test(x.what));
const struts = (d: ReturnType<typeof made>) => d.steps.filter((x) => /^place (tube|bar) named \w+_s\d+ /.test(x)).length;

describe('a frame grown along its loads', () => {
  it('a thing held out from a wall grows a tripod of three struts to it, of the matter lightest when each is sized', () => {
    const d = made('a wall bracket that holds a 17 kg camera 400 mm out from the wall');
    expect(d.plan[0]).toMatch(/a frame grown along its loads/);
    expect(struts(d)).toBe(3);
    expect(d.choices.join(' ')).toMatch(/a frame of 3 struts of Carbon fibre .* 3 of them held by the wall/);
    expect(d.choices.join(' ')).toMatch(/grown and made of the others: Structural steel ASTM A36 [\d.]+ kg/);
    for (const w of [/^its struts carry what it holds$/, /^what it holds moves no more than it may$/, /^it does not fold under any load$/]) expect(check(d, w)?.ok).toBe(true);
  }, 120000);
  it('"a 10 m tower" is 10 m tall; standing alone it grows four legs to a point, none of its feet lifting', () => {
    const c = go('a 10 m tower that holds a 5 kg antenna at its top');
    expect(c.wants[0]!.q.H!.v).toBe(10);
    const d = made('a 10 m tower that holds a 5 kg antenna at its top');
    expect(struts(d)).toBe(4);
    expect(check(d, /^it rests on the floor without being held down$/)?.ok).toBe(true);
    expect(d.footprint[0]).toBeGreaterThanOrEqual(3);
  }, 120000);
  it('in a gust, with its foot no wider than said, the wind is grown for and its feet weighed down by what it would lift them by', () => {
    const d = made('Bird-watching tower: 5 m high platform, 2 m x 2 m footprint at most, has to hold 2 adults (200 kg) up top and not tip over in 90 km/h gusts.', J, 8020);
    expect(d.choices.join(' ')).toMatch(/a 90 km\/h wind along it and across it/);
    expect(d.choices.join(' ')).toMatch(/kg of concrete set on its feet, as the wind would lift or slide it there/);
    for (const w of [/^it stands in a 90 km\/h wind$/, /^empty, it stands in that wind$/, /^it rests on the floor without being held down$/]) expect(check(d, w)?.ok).toBe(true);
    expect(d.footprint[0]).toBeLessThanOrEqual(2.4);
  }, 240000);
  it('a shelf things lie on along a wall stays on brackets at the studs: the frame is grown only for a thing held out', () => {
    const d = made("I need a wall shelf for my record collection that's 1.2 m long and 320 mm deep, holds 70 kg spread evenly, and can only be screwed into two wall studs that are 600 mm apart.");
    expect(d.plan[0]).toMatch(/a board on two steel brackets screwed to the wall/);
  }, 120000);
});

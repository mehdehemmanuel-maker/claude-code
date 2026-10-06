// The intent pipeline (src/nexus/conceive.ts, src/nexus/parse.ts): what an ask names is the thing named last before
// what it does, not a word that only qualifies it; each number is read by the words beside it, or said to be unused;
// what is not something kept is said, with what it would need, and nothing is made in its place; what is made is
// checked under the laws, against the limits said, and with real physics where it moves.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import type { Jolt } from '../../src/nexus/realize';
import { answersFrom, conceive, designs, len } from '../../src/nexus/conceive';
import { parseAsk } from '../../src/nexus/parse';
import { findQuantities } from '../../src/ganglia/units';

let J: Jolt;
beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const go = (words: string) => { let c = conceive(words), all: Record<string, string> = {}; for (let k = 0; k < 3 && c.questions.length; k++) { all = { ...all, ...answersFrom(c, 'go') }; c = conceive(words, all); } return c; };

describe('reading what is said', () => {
  it('reads sizes from micrometres to thousands of kilometres, joined by hyphens or not', () => {
    const si = (s: string) => findQuantities(` ${s} `).map((q) => q.si);
    expect(si('a 40-micrometer robot')[0]).toBeCloseTo(40e-6, 12);
    expect(si('12,000 kilometers across')[0]).toBe(1.2e7);
    expect(si('a 1.5-meter-tall robot')[0]).toBe(1.5);
    expect(si('below 100 degrees Celsius')[0]).toBeCloseTo(373.15, 6);
    expect(si('for 14 days')[0]).toBe(14 * 86400);
    // a newton-metre is said with its capital, a nanometre without
    expect(findQuantities(' 20 Nm ')[0]!.unit).toBe('N m');
    expect(findQuantities(' 50 nm ')[0]!.unit).toBe('nm');
  });
  it('names a thing by its last word, not by the words that qualify it', () => {
    const head = (s: string) => parseAsk(s).clauses[0]!.head;
    expect(head('a wall-mounted gadget that folds a fitted bed sheet')).toBe('gadget');
    expect(head('a kitchen drawer insert that measures out rice')).toBe('insert');
    expect(head('a bathroom shelf robot that refills bottles')).toBe('robot');
    expect(head('A ring-shaped sunshade 12,000 kilometers across that sits between Venus and the Sun')).toBe('sunshade');
    expect(head('A pedal-powered cargo tricycle whose load bed lifts 1.2 m')).toBe('tricycle');
    expect(head('a table that holds 30 kg')).toBe('table');
  });
  it('makes nothing in place of what it cannot make, and says what each part would need', () => {
    for (const ask of ['A microSD card that holds 4 TB and keeps its data for 50 years', 'A coin-sized stick-on skin patch that reads blood sugar from sweat every 60 seconds', 'A backpack for a house cat that turns its purring into electricity']) {
      const c = go(ask);
      expect(c.wants, ask).toEqual([]);
      expect(c.asked.filter((a) => a.kind !== 'for' && !a.got).length, ask).toBeGreaterThan(0);
      expect(c.asked.every((a) => a.got || a.why), ask).toBe(true);
    }
    // "holds 4 TB" is holding information, not a weight; "house" in "a house cat" is no house to make
    const sd = conceive('A microSD card that holds 4 TB');
    expect(sd.asked.some((a) => a.kind === 'does' && /information|electronics/.test(a.why))).toBe(true);
    expect(conceive('a backpack for a house cat').wants.some((w) => w.fn === 'enclose')).toBe(false);
  });
  it('reads each number by the words beside it: a travel, a limit, an altitude, something else\'s size', () => {
    const tri = conceive('A pedal-powered cargo tricycle whose 200 kg load bed lifts 1.2 m on a scissor lift');
    const raise = tri.wants.find((w) => w.fn === 'raise')!, bed = tri.wants.find((w) => w.fn === 'support')!;
    expect(raise.q.L!.v).toBe(1.2);
    expect(bed.q.F!.v / 9.80665).toBeCloseTo(200, 6);
    expect(tri.wants.find((w) => w.fn === 'move')).toBeTruthy();
    const narrow = conceive('a cart that is no wider than 25 cm and weighs under 4 kg');
    expect(narrow.limits.W).toBe(0.25);
    expect(narrow.limits.mass).toBe(4);
    const city = conceive('a platform floating at 52 km altitude with a 2 km cable');
    expect(city.dropped.some((d) => /^52 km: where it works/.test(d))).toBe(true);
    expect(city.dropped.some((d) => /^2 km: the size of cable/.test(d))).toBe(true);
    expect(conceive('a 2 m bridge').wants[0]!.q.span!.v).toBe(2);
  });
  it('reads a chain of sizes as one size, by the words before and after it', () => {
    const p = conceive('a platform that folds flat to 60 x 40 x 15 cm so it fits in a car trunk');
    // what it must fold down to is checked against it as made, all three sizes as one
    expect(p.limits.fold).toEqual([0.6, 0.4, 0.15]);
    const w = conceive('a fold-down workbench that opens to a 120 x 60 cm top at 90 cm high in a cabinet only 15 cm deep');
    const top = w.wants.find((x) => x.fn === 'support')!;
    expect([top.q.W!.v, top.q.D!.v, top.q.H!.v]).toEqual([1.2, 0.6, 0.9]);
    expect(w.dropped.some((x) => /^15 cm: said of the cabinet/.test(x))).toBe(true);
  });
  it('tells a part that folds from the whole of it folding down, and what it does by from what it does', () => {
    // the whole of it folding is a linkage, not kept: no leaf is made in its place
    const b = conceive('a folding footbridge that packs into a 70 cm long bundle');
    expect(b.wants.some((x) => x.fn === 'swing')).toBe(false);
    expect(b.asked.filter((a) => /collapse together/.test(a.why)).length).toBe(2);
    // a part of it that folds is a leaf that swings
    expect(conceive('a box with a lid that folds back').wants.some((x) => x.fn === 'swing')).toBe(true);
    // "extends to raise": how it raises, not a slide of its own
    const l = conceive('a platform that extends to raise a 90 kg person to a 1.8 m standing height');
    expect(l.wants.some((x) => x.fn === 'slide')).toBe(false);
    expect(l.wants.find((x) => x.fn === 'raise')!.q.L!.v).toBe(1.8);
    expect(l.asked.some((a) => a.text.startsWith('extends to raise'))).toBe(true);
  });
  it('takes what it would, said back in round numbers', () => {
    const c = conceive('a turntable');
    expect(Object.values(answersFrom(c, 'go')!)).toContain('60');
  });
});

describe('reading what is said, D3', () => {
  it('reads millions, sieverts, crews, data rates, and a model number as part of a name', () => {
    const si = (x: string) => findQuantities(` ${x} `)[0]!;
    expect(si('a 1 million tonne city').si).toBe(1e9);
    expect(si('below 0.6 Sv for the trip').unit).toBe('Sv');
    const sh = conceive('a crewed ship that carries 4 astronauts from low Earth orbit to Mars orbit in 90 days and back again, weighing under 400 tonnes, keeping each dose below 0.6 Sv');
    expect(sh.said.crew).toBe(4);
    expect(sh.said.trip).toEqual({ from: 'earth', to: 'mars', back: true, days: 90 });
    expect(sh.said.dose).toBeCloseTo(0.6, 9);
    expect(sh.limits.mass).toBe(4e5);
    expect(conceive('a microSD card with Wi-Fi at 50 MB/s').said.rate).toBe(4e8);
    expect(conceive('a board the same size as an Orange Pi 5 (100 x 62 mm)').dropped.some((d) => /part of a name \("Orange Pi 5"\)/.test(d))).toBe(true);
  });
  it('says what it read when nothing is made, and asks nothing it cannot use', () => {
    const c = conceive('I want a microSD card that stores 2 TB and has built-in Wi-Fi so I can pull photos off it at 50 MB/s, without the card going above 70 °C.');
    expect(c.wants).toEqual([]);
    expect(c.questions).toEqual([]);
    expect(c.heard.some((h) => /no hotter than 70 °C/.test(h))).toBe(true);
  });
});

describe('making it, and checking what was asked', () => {
  it('says how much of the ask it does, and holds what it makes to the limits said', () => {
    const c = go('a cart that carries 20 kg, folds a fitted bed sheet and weighs under 1 kg');
    const [d] = designs(c, 1, { seed: 101, physics: null });
    expect(d!.does[0]).toBeLessThan(d!.does[1]);
    expect(d!.whole).toBe(false);
    const lim = d!.checks.find((x) => /weighs no more than 1 kg/.test(x.what))!;
    expect(lim.ok).toBe(d!.mass <= 1);
    // under a weight limit its matter is chosen for lightness, and said so
    expect(d!.choices.some((x) => /lightest for its stiffness \(Ashby/.test(x))).toBe(true);
  });
  it('frames a top no sheet alone bears: joists on two rails, each the least the load law lets bear its share', () => {
    const [d] = designs(go('a raised vegetable bed on legs, 2 m by 1 m and 75 cm tall, that holds 30 cm of soaking-wet soil'), 1, { seed: 8020, physics: J });
    expect(d!.choices.some((x) => /so it is framed: the top on \d+ joists/.test(x))).toBe(true);
    for (const re of [/its top bears .* between its joists/, /its joists bear their share/, /its rails bear half of all of it/]) { const k = d!.checks.find((x) => re.test(x.what))!; expect(k.ok, k.says).toBe(true); }
    expect(d!.ok).toBe(true);
  }, 60000);
  it('holds loose soil in with walls against its sideways push, and checks it for a wheelchair', () => {
    const [d] = designs(go('a raised vegetable bed on legs, 2 m by 1 m and 75 cm tall so I can garden from a wheelchair, that holds 30 cm of soaking-wet soil'), 1, { seed: 8020, physics: null });
    const walls = d!.checks.find((x) => /its walls hold the .*soil in/.test(x.what))!;
    expect(walls.ok, walls.says).toBe(true);
    expect(walls.says).toMatch(/2\.79 kPa at the foot/);
    expect(d!.checks.find((x) => /a wheelchair fits under it/.test(x.what))!.ok).toBe(false);
    expect(d!.checks.find((x) => /within reach from a wheelchair/.test(x.what))!.ok).toBe(false);
  });
  it('rolls on mud as mud rolls, and its wheels must grip to climb', () => {
    const [d] = designs(go('a garden cart that hauls 100 kg of wet soil up a 20-degree muddy slope'), 1, { seed: 101, physics: null });
    const grip = d!.checks.find((x) => /its driven wheels grip/.test(x.what))!;
    expect(grip.ok).toBe(false);
    expect(d!.checks.find((x) => /rolling what it carries/.test(x.what))!.says).toMatch(/rolling resistance 0\.2 of its weight on mud/);
    expect(d!.choices.some((x) => /lies 250 mm deep in it, as in a wheelbarrow/.test(x))).toBe(true);
  });
  it('dries only as far as heat and moving air take the water away', () => {
    const [d] = designs(go('a cabinet that dries soaked boots at 40°C in under 3 hours and uses less than 200 W'), 1, { seed: 101, physics: J });
    const dry = d!.checks.find((x) => /it dries what is put in it/.test(x.what))!;
    expect(dry.ok).toBe(false);
    expect(dry.says).toMatch(/2\.41 MJ\/kg at 40 °C/);
    expect(dry.says).toMatch(/51\.1 g of it a cubic metre/);
  }, 60000);
  it('weighs a bridge without the ends that stand for its banks, framed where a frame is lighter than a sheet', () => {
    const [d] = designs(go('a footbridge that weighs under 5 kg and spans a 3 m wide stream while one 100 kg adult walks across'), 1, { seed: 101, physics: null });
    const lim = d!.checks.find((x) => /weighs no more than 5 kg/.test(x.what))!;
    expect(lim.says).toMatch(/not counting its 2 ends, .* which stand for the banks it rests on/);
    expect(d!.choices.some((x) => /a sheet alone would weigh .* so it is framed/.test(x))).toBe(true);
    // the bridge proper is still more than 5 kg, and it says where its weight is
    expect(lim.ok).toBe(false);
    expect(lim.says).toMatch(/where it weighs most: the 2 rails /);
  });
  it('makes a cart that moves at the speed asked, its speed held by its controller', () => {
    const [d] = designs(go('a cart that carries 20 kg at 1 m/s'), 1, { seed: 101, physics: J });
    const run = d!.checks.find((x) => /it moves at 1 m\/s/.test(x.what))!;
    expect(run.ok, run.says).toBe(true);
    expect(d!.ok && d!.whole).toBe(true);
  }, 60000);
  it('raises what it carries on a carriage between posts, what rides joined to the carriage', () => {
    const [d] = designs(go('a lift that raises 50 kg 1 m'), 1, { seed: 101, physics: J });
    const up = d!.checks.find((x) => /raises what it carries/.test(x.what))!;
    expect(up.ok, up.says).toBe(true);
    // what raises it is not derived: said, so it is not all done
    expect(d!.gaps.some((g) => /what raises it/.test(g))).toBe(true);
  }, 60000);
  it('steadies what stands tall: a shelf with a tank on it does not tip when pushed at its top', () => {
    const [d] = designs(go('a shelf with a tank on it'), 1, { seed: 101, physics: J });
    const push = d!.checks.find((x) => /pushed at its top/.test(x.what))!;
    expect(push.ok, push.says).toBe(true);
    expect(d!.choices.some((x) => /deepened|widened/.test(x))).toBe(true);
  }, 60000);
  it('says sizes in units read at a glance', () => {
    expect(len(4e-5)).toBe('40 µm');
    expect(len(1.2e7)).toBe('12000 km');
    expect(len(0.45)).toBe('450 mm');
    expect(len(52000)).toBe('52 km');
  });
});

// Wave 6 (docs/STRESS-WAVES.md): asks said the way people say them, a sentence at a time, with what they must not use
// ("no grid power, no burning fuel"), and things no kept kind covers: a glazed house through a cold night, a dock that
// heels with its crowd at one side in a chop, a sphere under the sea that must not buckle, a clock that lifts a ball each
// minute for a year on two AA cells, a slider that crawls; and a shelter made of cloth on poles, staked against the wind's
// lift, that packs into a bag.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import type { Jolt } from '../../src/nexus/realize';
import { answersFrom, conceive, designs } from '../../src/nexus/conceive';
import { parseAsk } from '../../src/nexus/parse';

let J: Jolt;
beforeAll(async () => { J = (await initJolt()) as unknown as Jolt; });
const go = (words: string) => { let c = conceive(words), all: Record<string, string> = {}; for (let k = 0; k < 3 && c.questions.length; k++) { all = { ...all, ...answersFrom(c, 'go') }; c = conceive(words, all); } return c; };
const law = (words: string, what: RegExp) => go(words).bounds.find((b) => what.test(b.what));
const made = (words: string, seed = 101) => designs(go(words), 1, { seed, physics: null })[0]!;
const check = (d: ReturnType<typeof made>, what: RegExp) => d.checks.find((x) => what.test(x.what));

const GREENHOUSE = 'Greenhouse, 4 x 6 m footprint. Snow load 2.4 kPa. Outside -30 C, inside must hold above 4 C overnight, no grid power, no burning fuel. Panels max 12 kg each, one person assembles, no tools beyond a drill.';
const DOCK = 'Please design a floating dock for a tidal estuary with a 3.5 m tidal range and 1.2 m wind chop, carrying six adults (500 kg total) at no less than 200 mm freeboard, with no foam that can shed microplastics, and no fixed piles.';
const CLOCK = "i need a desk clock that tells the time by rolling a steel ball down a 500 mm zig-zag track every minute and lifting it back up with a motor, running on two AA batteries for at least a year, and it has to be quieter than 25 dB at one metre so it won't wake me";
const SLIDER = 'Need a motorized camera slider for my mirrorless setup: 1.2 m of travel, carries 4 kg, and has to crawl at 2 mm/s for timelapses with zero visible judder. Runs off a USB-C power bank, stays quieter than 40 dB, and packs into a 60 cm backpack.';
const STALL = 'so where I live it hits 46 C every July and I sell at an outdoor market, I want a folding stall shelter that packs into a bag under 12 kg, opens in under 2 minutes, stays under 32 C inside with no electricity, and survives 50 km/h gusts';

describe('reading an ask a sentence at a time', () => {
  it('each sentence starts a clause of its own; a figure with the few words that name it is no thing asked', () => {
    const p = parseAsk(GREENHOUSE);
    expect(p.clauses.map((c) => c.text)).toContain('panels max 12 kg each');
    const c = go(GREENHOUSE);
    expect(c.asked.filter((a) => a.kind === 'thing').map((a) => a.text)).toEqual(['Greenhouse']);
    expect(c.limits.part).toBe(12);
  });
  it('"no grid power" rules out the grid, not power of its own; "no burning fuel" rules out a flame; who assembles it is asked, not checked', () => {
    const c = go(GREENHOUSE);
    expect(c.said.noPower).toBeUndefined(); expect(c.said.noGrid).toBe(true); expect(c.said.noFuel).toBe(true);
    expect(c.heard).toContain('no grid power: a limit: nothing it makes is wired to a grid; power of its own (cells in the sun, a store they fill) is not ruled out'); expect(c.heard).toContain('no burning fuel: a limit, checked against what it makes that burns');
    expect(c.asked.find((a) => a.text === 'one person assembles')).toMatchObject({ kind: 'does', got: null });
    expect(c.asked.find((a) => a.text === 'no tools beyond a drill')).toMatchObject({ kind: 'limit', met: false });
    expect(c.asked.some((a) => /power/.test(a.text) && a.kind === 'does')).toBe(false);
  });
  it('"so it won\'t wake me" carries no one; a motor named with what it lifts drives it; "for at least a year" is one year', () => {
    const c = go(CLOCK);
    expect(c.wants.map((w) => w.fn)).toEqual(['raise']);
    expect(c.wants[0]!.q.m!.v).toBeCloseTo(0.0084, 6);
    expect(c.said.runFor).toBeCloseTo(31556952, 0);
    expect(c.said.cellWh).toBe(7);
  });
  it('a slider that crawls slides; "zero visible judder" is said back, not a thing it has', () => {
    const c = go(SLIDER);
    expect(c.asked.find((a) => /^crawl at 2 mm\/s/.test(a.text))?.got).toBe('slide');
    expect(c.asked.some((a) => /judder/.test(a.text))).toBe(false);
    expect(c.heard.some((h) => /^zero visible judder: said back/.test(h))).toBe(true);
  });
  it('a float reads its tide, its chop and its freeboard; "for two people" carries two', () => {
    const c = go(DOCK), fl = c.wants.find((w) => w.fn === 'float')!;
    expect(c.said.tide).toBe(3.5); expect(fl.q.wave!.v).toBe(1.2); expect(fl.q.fb!.v).toBeCloseTo(0.2, 9); expect(fl.flags).toContain('people');
    expect(c.asked.some((a) => /chop/.test(a.text))).toBe(false);
    expect(go('a raft for two people').wants[0]!.q.m!.v).toBe(160);
  });
  it('"hand-carried" is how it is carried, not a hand it has; "capable of cutting" is what it does; N-m is a twist, not a store', () => {
    const c = go('Formal request: a hand-carried deep-sea sampling tool for a crewed submersible at 4,000 m depth (400 bar), capable of cutting and retrieving a 2 kg sediment core, with no more than 3 N-m of manipulator torque and zero hydraulic oil leakage.');
    expect(c.asked.find((a) => a.kind === 'thing')?.why).toMatch(/corer/);
    expect(c.asked.some((a) => /^cutting and retrieving a 2 kg sediment core/.test(a.text))).toBe(true);
    expect(c.said.store).toBeUndefined();
  });
});

describe('what the laws say of it', () => {
  it('a glazed house through a cold night off the grid: U A ΔT out, the water that would hold it, the sun short of the day, and the cells that would make it up', () => {
    const b = law(GREENHOUSE, /^it holds above 4 °C through the night in -30 °C with no grid power and no fuel$/)!;
    expect(b.ok).toBe(false);
    expect(b.says).toContain('258 W/K'); expect(b.says).toContain('123 kWh'); expect(b.says).toContain('4.07 m³'); expect(b.says).toContain('it loses 3.57 times');
    // 211 kWh a day lost against 59 kWh gathered: 152 kWh from cells at 0.18 of 3 kWh/m², 281 m²
    expect(b.says).toContain('the 152 kWh a day it lacks'); expect(b.says).toContain('about 281 m² of them');
    expect(law(GREENHOUSE.replace('no grid power, no burning fuel', 'no power'), /^it holds above 4 °C/)!.what).toMatch(/with no power and no fuel$/);
  });
  it('a sphere pushed from outside must not buckle: Zoelly with a knockdown, buckling setting its wall', () => {
    const b = law('a titanium sphere that holds out the sea 4000 m deep', /^it holds out the sea 4 km down$/)!;
    expect(b.says).toContain('Zoelly'); expect(b.says).toContain('4.15% of its radius'); expect(b.says).toContain('buckling sets it');
  });
  it('a ball lifted each minute for a year against two AA cells, with what carries it up: lifted to the top of its track, within them; with no track said, a desk height, more than they hold', () => {
    const b = law(CLOCK, /^its cells last/)!;
    // 525,960 lifts of 8.4 g and a 4.2 g carriage by 25 mm (500 mm falling 1 in 20): 3.09 mJ each, 0.451 Wh, 2.26 Wh at 0.2, and 0.877 Wh to keep time
    expect(b.ok).toBe(true); expect(b.says).toContain('5.26 × 10^5 lifts'); expect(b.says).toContain('25 mm (the fall of its 500 mm track at about 1 in 20, estimate)'); expect(b.says).toContain('3.13 Wh against the 7 Wh'); expect(b.says).toContain('lifted more than 67.8 mm each time, they would not last');
    const d = law(CLOCK.replace('down a 500 mm zig-zag track ', ''), /^its cells last/)!;
    expect(d.ok).toBe(false); expect(d.says).toContain("150 mm (a desk thing's height, estimate)"); expect(d.says).toContain('14.4 Wh against the 7 Wh');
  });
  it('stairs climbed, a frame hovering, a slow slide: each weighed', () => {
    expect(law('Tracked stair-climbing crawler for carrying a 6 kg grocery bag. Climbs 35 degree stairs at 0.15 m/s, 24 V battery for 90 minutes of runtime.', /^it climbs stairs at 35°$/)?.says).toContain('118 N');
    expect(law('a foldable quadcopter frame with an all-up weight of 900 g including a 250 g camera payload, and the frame must weigh under 140 g', /^it lifts 900 g in all$/)?.says).toContain('510 g');
    expect(law(SLIDER, /^it slides at 2 mm\/s$/)?.says).toContain('2.5 µm');
  });
});

describe('what is made of it', () => {
  it('a dock: a decked hull made deep and wide enough heeled with its crowd at one side, clear of the chop', () => {
    const d = made(DOCK), c = check(d, /^with its load to one side, its deck stands at least 200 mm above the water and above 1.2 m waves$/)!;
    expect(c.ok).toBe(true); expect(c.says).toMatch(/heels 7\.99°/); expect(c.says).toContain('they do not wash over it');
  });
  it('a slider: a light carriage with what it carries put on it, its rail checked bending under it', () => {
    const d = made(SLIDER);
    expect(check(d, /^its rail bears 4 kg on the carriage at its middle$/)?.ok).toBe(true);
    expect(d.asked.find((a) => a.text === 'carries 4 kg')?.got).toBe('slide');
    expect(d.mass).toBeLessThan(8);
  });
  it('a market stall of cloth on poles: under its 12 kg, packed into a bag, staked, drawing no power', () => {
    const d = made(STALL);
    expect(d.plan.join(' ')).toMatch(/a cloth on a frame of poles/);
    expect(d.mass).toBeLessThan(12);
    expect(check(d, /^it packs down$/)?.says).toMatch(/sections of at most 600 mm/);
    expect(check(d, /^it draws no power$/)?.ok).toBe(true);
    expect(d.asked.find((a) => /^packs into a bag under 12 kg/.test(a.text))?.got).toBe('enclose');
  });
  it('staked, a cloth shelter stands in its wind by statics and in the physics', () => {
    const [d] = designs(go(STALL), 1, { seed: 101, physics: J });
    expect(check(d!, /^the wind does not lift it$/)).toMatchObject({ ok: true, says: expect.stringMatching(/its 8 stakes hold/) });
    expect(check(d!, /^it stands in a 50 km\/h wind$/)?.ok).toBe(true);
  }, 120000);
  it('what it does is tested before it is pushed to tip it: a pump that tips in the push still turns', () => {
    const [d] = designs(go('Design a hand-cranked pump that a kid can turn to lift 400 litres an hour out of a 25 m deep well, without ever needing more than 60 W of effort at the handle.'), 1, { seed: 101, physics: J });
    expect(check(d!, /^it turns at 60 rpm$/)?.ok).toBe(true);
    expect(check(d!, /^it rides 1 m up and down its guides$/)?.ok).toBe(true);
  }, 120000);
  it('a free-rolling cart is pushed to tip it across its wheels, not along them', () => {
    const [d] = designs(go('a cart with a table on it'), 1, { seed: 101, physics: J });
    expect(check(d!, /^pushed at its top, it does not tip$/)).toMatchObject({ ok: true, says: expect.stringMatching(/sideways, across the way its wheels roll/) });
  }, 120000);
});

describe('what was asked is counted where a check or a law weighs it', () => {
  const ask = (d: ReturnType<typeof made>, text: RegExp) => d.asked.find((a) => text.test(a.text));
  it('a snow load and a night held warm are asked: each met only where its check or its law passes', () => {
    const d = made(GREENHOUSE);
    expect(ask(d, /^its roof bears 2.4 kPa of snow$/)).toMatchObject({ kind: 'limit', met: false, why: expect.stringMatching(/^its own check fails: [\d.]+ times over its yield$/) });
    expect(ask(d, /^it holds above 4 °C through the night/)).toMatchObject({ kind: 'limit', met: false, why: 'the laws say not: it loses 3.57 times what it gathers' });
    expect(ask(d, /^it draws no power from a grid$/)?.met).toBe(true); expect(ask(d, /^it burns no fuel$/)?.met).toBe(true);
    // a house for light that lets none through is not that house
    expect(ask(d, /^Greenhouse$/)).toMatchObject({ kind: 'thing', got: null, why: expect.stringMatching(/lets no light through/) });
    expect(d.does[1]).toBe(d.asked.filter((a) => a.kind !== 'for').length);
  });
  it('a wind said as what it is for is a limit its wind test answers, once, however many checks weigh it', () => {
    const [d] = designs(go('Please design a freestanding three-sided loafing shelter for four adult goats, roughly 12 feet by 8 feet, rated for 90 mph wind gusts and a 30 psf snow load, assembled by two people with hand tools, with no single component heavier than 50 pounds.'), 1, { seed: 101, physics: J });
    const wind = d!.asked.filter((a) => /wind/.test(a.text));
    expect(wind).toHaveLength(1); expect(wind[0]).toMatchObject({ text: 'for 90 mph wind gusts', kind: 'limit' });
    expect(wind[0]!.met).toBe(!!d!.checks.filter((x) => /wind/.test(x.what)).every((x) => x.ok));
    expect(ask(d!, /^its roof bears 1.44 kPa of snow$/)?.kind).toBe('limit');
  }, 120000);
  it('weighed by the laws but done by nothing made, it is not met; a law that answers what is asked says so beside it', () => {
    expect(ask(made(STALL), /^under 32 °C inside with 46 °C round it$/)).toMatchObject({ kind: 'limit', met: false, why: 'the laws weigh it, but nothing made is checked to do it' });
    expect(ask(made(SLIDER), /^crawl at 2 mm\/s/)).toMatchObject({ got: null, why: expect.stringMatching(/^the laws weigh it \(it slides at 2 mm\/s\), but nothing made is checked to do it$/) });
    expect(ask(made(CLOCK.replace('down a 500 mm zig-zag track ', '')), /^running on two aa batteries/)?.why).toMatch(/; and the laws say not: its cells last 365 days/);
    // a motor asked for is had only where one is made
    expect(ask(made(CLOCK), /^with a motor$/)).toMatchObject({ got: null, why: expect.stringMatching(/^no motor is made/) });
    expect(ask(made(SLIDER), /^a motorized camera slider$/)?.got).toBeNull();
  });
});

describe('a platform at a tree, a slide to its stop', () => {
  const TREE = 'so we have a 45 cm diameter oak and want a treehouse platform 2.4 m up for three 30 kg kids plus an 80 kg parent, no more than two bolts through the trunk, and it has to tolerate 15 cm of trunk sway in wind without binding or cracking';
  it('people counted from their weights are counted once; what it is for, said with its weight, is what it carries', () => {
    const c = go(TREE);
    expect(c.said.people).toBe(4); expect(c.said.peopleArea).toBeCloseTo(1.4, 6);
    expect(c.asked.find((a) => a.text === 'for three 30 kg kids')).toMatchObject({ kind: 'does', got: 'support', load: true });
  });
  it('"no more than two bolts through the trunk" is a limit; "without binding" where it must sway is not checked; the tree is not made', () => {
    const d = made(TREE);
    expect(d.asked.find((a) => a.text === 'no more than two bolts through the trunk')).toMatchObject({ kind: 'limit', met: true });
    expect(d.asked.find((a) => a.text === 'without binding or cracking')).toMatchObject({ got: null });
    expect(d.gaps.join(' ')).toContain('a hole of its 450 mm and 150 mm of sway each way, 750 mm across, is not cut');
    expect(d.does[0]).toBeLessThan(d.does[1]);
  });
  it('a slide is pushed across its whole travel, and passes only where it reaches its stop', () => {
    const [d] = designs(go(SLIDER), 1, { seed: 101, physics: J });
    expect(d!.checks.find((x) => x.what === 'it slides 1.2 m')).toMatchObject({ ok: true, says: expect.stringMatching(/it slid as far as 1\.2 m, its stop at 1\.2 m/) });
  }, 120000);
});

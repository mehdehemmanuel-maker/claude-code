// Wave 6 (docs/STRESS-WAVES.md): asks said the way people say them, a sentence at a time, with what they must not use
// ("no grid power, no burning fuel"), and things no kept kind covers: a glazed house through a cold night, a dock that
// heels with its crowd at one side in a chop, a sphere under the sea that must not buckle, a clock that lifts a ball each
// minute for a year on two AA cells, a slider that crawls; and a shelter made of cloth on poles, staked against the wind's
// lift, that packs into a bag.

import { beforeAll, describe, expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import type { Jolt } from '../../src/nexus/realize';
import { answersFrom, conceive, designs, heelBox, sayConception } from '../../src/nexus/conceive';
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
  it('a slider that crawls slides; "zero visible judder" is said back, and asked: how steadily it moves is not weighed', () => {
    const c = go(SLIDER);
    expect(c.asked.find((a) => /^crawl at 2 mm\/s/.test(a.text))?.got).toBe('slide');
    expect(c.asked.find((a) => /judder/.test(a.text))).toMatchObject({ kind: 'does', got: null, why: expect.stringMatching(/not weighed/) });
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
  it('a ball lifted each minute for a year against two AA cells, with what carries it up: lifted only as far as they allow along its track; with no track said, a desk height, more than they hold', () => {
    const b = law(CLOCK, /^its cells last/)!;
    // 525,960 lifts of 8.4 g and a 4.2 g carriage: at 25 mm (500 mm falling 1 in 20) a tiny geared motor pulsed each minute at
    // about 0.05 would take 9.9 Wh against 7; they would last at 17 mm, so it lifts nine-tenths of that, 15 mm: 6.29 Wh
    expect(b.ok).toBe(true); expect(b.says).toContain('5.26 × 10^5 lifts'); expect(b.says).toContain('15 mm (nine-tenths of what its cells allow, so that they last; 1 in 33.3 along its track)'); expect(b.says).toContain('6.29 Wh against the 7 Wh'); expect(b.says).toContain('a small geared motor of about 0.05 (run a second or so at a time'); expect(b.says).toContain('lifted more than 17 mm each time, they would not last');
    const d = law(CLOCK.replace('down a 500 mm zig-zag track ', ''), /^its cells last/)!;
    expect(d.ok).toBe(false); expect(d.says).toContain("150 mm (a desk thing's height, estimate)");
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
    expect(c.ok).toBe(true); expect(c.says).toMatch(/heels 6\.84° \(its section under water clipped at its waterline/); expect(c.says).toContain('they do not wash over it');
    // its deck on cross frames close enough that one standing between two of them, borne by a strip as wide as it spans,
    // bends it within 1/150 of that
    expect(check(d, /^its deck bears a person standing on it$/)).toMatchObject({ ok: true, says: expect.stringMatching(/on 12 cross frames, 340 mm apart: .* borne by a strip 340 mm wide/) });
    // no piles: moored by anchors and chains alone, and a gangway to the shore at no steeper than 1 in 3 over half the tide
    expect(d.asked.find((a) => /^rides a 3\.5 m tide/.test(a.text))).toMatchObject({ got: null, why: expect.stringMatching(/anchors and chains with that much slack, piles being ruled out\) is not made; nor .*a gangway .* at least 5\.53 m long/) });
  });
  it('heeled by its section clipped at its waterline: a box past its bottom edge loses what rights it; with its weight too high and to one side, it goes over', () => {
    // a 2.179 m wide box 63 mm deep in the water rights itself by small heels (GM 3.76 m) but its bottom edge is out of the
    // water past 4.1°; its crowd 527 mm to one side and 1.37 m up brings no heel to rest before its deck goes under
    expect(heelBox(2.179, 0.8512, 749 / 1000 / 4.4208, 2.179 / 2 - (500 * 0.7895) / 749, 1.3705)).toBeNull();
    // the 2.8817 m one made: at rest at 6.55°, its low edge 620 mm above still water
    const h = heelBox(2.8817, 0.8283, 807 / 1000 / 4.4208, 2.8817 / 2 - (500 * (2.8817 / 2 - 0.3)) / 807, (307 * 0.8283 * 0.45 + 500 * (0.8283 + 0.012 + 1)) / 807)!;
    expect((h.th * 180) / Math.PI).toBeCloseTo(6.55, 1); expect(h.low).toBeCloseTo(0.6195, 2);
    // even and low, it does not heel
    expect(heelBox(2, 0.5, 0.2, 1, 0.1)).toEqual({ th: 0, low: expect.closeTo(0.4, 6) });
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
    expect(check(d!, /^the wind does not lift it$/)).toMatchObject({ ok: true, says: expect.stringMatching(/its 9 stakes hold/) });
    // open at its front, the air inside pushes its roof up 0.63 of the wind's ½ ρ v², not 0.2
    expect(check(d!, /^the wind does not lift it$/)?.says).toMatch(/pushing up 0\.63 of it through its open front/);
    expect(d!.gaps.join(' ')).toMatch(/on paving no stake goes in: weights on its four poles' feet hold it instead, about \d+ kg on each/);
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
    expect(ask(d, /^its roof bears 2.4 kPa of snow$/)).toMatchObject({ kind: 'limit', met: false, why: expect.stringMatching(/^its own check fails: bending 392 mm, more than 1\/250 of its span$/) });
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

describe('a cart of gas cylinders on a slope', () => {
  const CART = 'Rolling welding cart: carries two 150 lb gas cylinders (9 in dia, 55 in tall) plus 90 lb welder, must not tip on a 10 degree slope, fit through 30 inch door, total weight under 120 lb empty, steel.';
  it('its deck bears what it carries; loose on its slope, cylinders 229 mm across and 1.4 m tall tip at 9.29°, and want securing', () => {
    const d = made(CART);
    expect(check(d, /^its deck bears 177 kg$/)?.ok).toBe(true);
    expect(check(d, /^what it carries stands on its 10° slope$/)).toMatchObject({ ok: false, says: expect.stringMatching(/tips at 9\.29° \(tan θ = d \/ h, statics\), less than its slope; gas cylinders are kept upright and secured \(OSHA 29 CFR 1926\.350\)/) });
    // pushing it up the slope is not what it carries: "Rolling" stands; what it carries falls with its load
    expect(d.asked.find((a) => a.text === 'Rolling')?.got).toBe('move');
    expect(d.asked.find((a) => /^carries two 150 lb gas cylinders/.test(a.text))).toMatchObject({ got: null, why: expect.stringMatching(/^its load fails: what it carries stands on its 10° slope/) });
  });
});

describe('what it stands in, and on', () => {
  const GOATS = 'Please design a freestanding three-sided loafing shelter for four adult goats, roughly 12 feet by 8 feet, rated for 90 mph wind gusts and a 30 psf snow load, assembled by two people with hand tools, with no single component heavier than 50 pounds.';
  it('a shelter beasts stand in has no floor; plywood breaks at its bending strength, it does not yield', () => {
    const d = made(GOATS);
    expect(d.choices.join(' ')).toMatch(/^no floor \(they stand on the ground\), three walls \(its front left open\)/);
    expect(d.steps.some((x) => /_floor\b/.test(x))).toBe(false);
    expect(check(d, /^its roof bears 1.44 kPa of snow$/)?.says).toMatch(/times under its bending strength/);
  });
  it('a tool worked in the sea is open to it: no sphere, only its solid parts squeezed in bulk', () => {
    const b = law('Formal request: a hand-carried deep-sea sampling tool for a crewed submersible at 4,000 m depth (400 bar), capable of cutting and retrieving a 2 kg sediment core, with no more than 3 N-m of manipulator torque and zero hydraulic oil leakage.', /^open to the sea 4 km down/)!;
    expect(b.says).toContain('0.0339% of their volume in Ti-6Al-4V'); expect(b.says).not.toMatch(/\bsphere\b/);
  });
  it('an airlock pumped down to keep its gas: V [(p₁ − p₂) − p₂ ln(p₁ / p₂)], not p V ln(p₁ / p₂); "seals against" is a seal, not biology', () => {
    const AIR = "I want a Martian dust-proof airlock door for a surface greenhouse that cycles about 20 times a day, holds 0.6 bar against Mars's 0.006 bar outside, seals against abrasive regolith, and must run on under 50 watts of power.";
    // 4 m³ × (59.4 kPa − 0.6 kPa × ln 100) = 227 kJ; 20 a day over 86 400 s: 52.4 W
    expect(law(AIR, /^its lock, pumped down 20 times a day, draws no more than 50 W$/)).toMatchObject({ ok: false, says: expect.stringMatching(/227 kJ each time .* 51 W through a sol of 88 775 s/) });
    // its door, apart from what pumping its lock draws: a plug door; its leaf about 11.5 mm of 6061-T6 (Roark, β 0.636)
    // its leaf: 11.5 mm at its yield over 1.5 sags 27 mm; 15.8 mm keeps its 13,400 pushes a Mars year under its 96.5 MPa
    // endurance (ASM); sagging no more than 8 mm for its seal to seat, 17.3 mm
    expect(law(AIR, /^its door holds/)).toMatchObject({ ok: null, says: expect.stringMatching(/11\.5 mm at its yield over 1\.5 .* sags 27\.3 mm.* 15\.8 mm keeps each push under the 96\.5 MPa .* so 17\.3 mm, set by its sag/) });
    expect(law(AIR, /^its lock, pumped down/)?.says).toContain('755 W while it pumps');
    expect(go(AIR).asked.find((a) => /^seals against/.test(a.text))?.why).toMatch(/^sealing \(a gasket or lip pressed shut\)/);
  });
  it('high up, the air is said by its pressure; how dense it is waits for how cold it is; in snow a peg holds little', () => {
    const EV = 'need a wind-proof emergency shelter for 6 climbers at 7,800 m on Everest-type terrain, must survive 160 km/h gusts at minus 40 C, weigh under 35 kg packed, and be pitched by two gloved people in under four minutes';
    expect(go(EV).heard).toContain("7,800 m up: the air's pressure there is 0.36 of the sea's (standard atmosphere); how dense it is there, with how cold it is, is weighed in the wind on it");
    expect(made(EV).gaps.join(' ')).toMatch(/in snow or ice a peg holds little/);
  });
});

describe('ratings, costs, rotors, a child climbing it, a width folded', () => {
  const CRAWL = 'Tracked stair-climbing crawler for carrying a 6 kg grocery bag. Climbs 35 degree stairs at 0.15 m/s, width max 330 mm, 24 V battery for 90 minutes of runtime, brushed gearmotors under 150 W each, must not tip backward at the top edge. Budget BOM $250.';
  it('"150 W each" is what each motor is rated at; "$250" is a cost; the cells are sized from the climb', () => {
    const c = go(CRAWL);
    expect(c.said.motorW).toBe(150); expect(c.said.volts).toBe(24); expect(c.said.power).toBeUndefined();
    expect(c.dropped).toContain('250: a cost: what it costs is not weighed');
    const b = c.bounds.find((x) => /^it climbs stairs at 35°$/.test(x.what))!;
    // 21 kg × g × sin 35° × 0.15 m/s / 0.5 = 35.4 W; 53.2 Wh over 1.5 h; through 0.9 and 0.9, 65.6 Wh, 262 g at 250 Wh/kg
    expect(b.says).toContain('65.6 Wh, about 262 g of lithium-ion cells'); expect(b.says).toContain('about 1.64 A'); expect(b.says).toContain('two motors rated 150 W each (300 W) are 8.47 times what it takes: a rating, not what they draw');
  });
  it('a drone reads its drop and its rotors: no overlap, twice its weight, folded into its tube', () => {
    const c = go('Please design a foldable quadcopter frame for a 7-inch propeller cinematic drone with an all-up weight of 900 g including a 250 g camera payload. The frame must weigh under 140 g, survive a 2 m drop onto concrete, and collapse to fit inside a 120 mm diameter tube for storage.');
    expect(c.said.drop).toBe(2); expect(c.said.prop).toBeCloseTo(0.1778, 4); expect(c.said.fitDia).toBeCloseTo(0.12, 6);
    const b = c.bounds.find((x) => /^it lifts 900 g in all$/.test(x.what))!;
    expect(b.says).toContain('at least 251 mm across from motor to motor'); expect(b.says).toContain('4.41 N (450 g) from each motor'); expect(b.says).toContain('its 178 mm rotors must fold or come off');
    expect(c.bounds.some((x) => /^it survives a 2 m drop$/.test(x.what))).toBe(true);
  });
  it('a child climbing it is weighed with it empty, not as a load; "tip-proof" stands on its tip checks; corners not rounded are not met', () => {
    const W = 'Classroom backpack storage: freestanding, tip-proof unit, 30 cubbies for 6-9 kg bags, 1.1 m max height so teachers see over it, rounded corners radius 25 mm minimum, survives a 25 kg child climbing it, footprint under 0.5 m by 3 m.';
    expect(go(W).said.climber).toBe(25);
    const d = designs(go(W), 1, { seed: 101, physics: null })[0]!;
    expect(check(d, /^empty, a 25 kg child climbing its front does not tip it$/)).toMatchObject({ ok: true, says: expect.stringMatching(/300 mm out from its foot there/) });
    expect(d.asked.find((a) => a.text === 'tip-proof')?.got).toBe('support');
    expect(d.asked.find((a) => a.text === 'corners rounded to at least 25 mm')).toMatchObject({ kind: 'limit', met: false });
  });
  it('a folded width is across its plan, not its thinnest way', () => {
    const d = made('Design a child bicycle trailer for two children aged 2 to 6, combined payload 40 kg, towed at a maximum 20 km/h, with a rollover protection frame passing a 3 g lateral load test, a five-point harness, an empty mass below 14 kg, and a folded width under 30 cm.');
    expect(check(d, /^folded, it is no more than 300 mm wide$/)).toMatchObject({ ok: false, says: expect.stringMatching(/883 mm across at its narrower way/) });
    expect(d.checks.some((x) => /^it folds flat to/.test(x.what))).toBe(false);
  });
});

describe('a gate held shut', () => {
  it('latched at its far end to a post set in the ground: its pin and its posts hold half the push each, and "stay shut" is done', () => {
    const [d] = designs(go('so I have a 14 foot wide pasture gate and I want it to swing open on its own when my ATV gets within 20 feet but stay shut when cattle lean on it with maybe 1200 pounds of force, solar powered, and it has to keep working through 5 cloudy days'), 1, { seed: 101, physics: J });
    // 5340 N shared by its two posts, 2670 N each 700 mm up: a 16 mm pin holds 30.2 kN in single shear; a 50 mm post at its foot 89.7 MPa
    expect(check(d!, /^shut, its latch and its posts hold half the push each$/)).toMatchObject({ ok: true, says: expect.stringMatching(/30\.2 kN in single shear .* 89\.7 MPa .* 760 mm at the latch post/) });
    expect(check(d!, /^it can be made under the laws$/)?.ok).toBe(true);
    expect(check(d!, /^it swings open$/)?.ok).toBe(true);
    expect(d!.asked.find((a) => a.text === 'stay shut when cattle lean on it')?.got).toBe('swing');
  }, 120000);
});

describe('the third judging, fixed by cause', () => {
  it('a cart is sized for its cylinders side by side, tips the worse way of across and along, and fails "not tip" where its load tips', () => {
    const d = made('Rolling welding cart: carries two 150 lb gas cylinders (9 in dia, 55 in tall) plus 90 lb welder, must not tip on a 10 degree slope, fit through 30 inch door, total weight under 120 lb empty, steel.');
    expect(check(d, /^its 2 cylinders fit side by side on its deck$/)?.ok).toBe(true);
    expect(check(d, /^on its 10° slope, it does not tip$/)?.says).toMatch(/up or down the slope/);
    expect(d.asked.find((a) => a.text === 'not tip on a 10 degree slope')?.got).toBeNull();
  });
  it('compartments are divided; a footprint "under" is a limit and made under it; a child on it pulling at its top is weighed, and held by weight low in it', () => {
    const d = made('Classroom backpack storage: freestanding, tip-proof unit, 30 cubbies for 6-9 kg bags, 1.1 m max height so teachers see over it, rounded corners radius 25 mm minimum, survives a 25 kg child climbing it, footprint under 0.5 m by 3 m.');
    expect(d.asked.find((a) => a.text === '30 cubbies')?.got).toBe('support');
    expect(d.choices.join(' ')).toMatch(/9 dividers between each shelf and the next making 10 compartments to a row/);
    expect(d.asked.find((a) => /^its plan is within 3 m × 500 mm/.test(a.text))?.met).toBe(true); expect(d.footprint.map((x) => +x.toFixed(3))).toEqual([2.99, 0.49]);
    expect(check(d, /^a 25 kg child standing on a shelf does not break it$/)?.ok).toBe(true);
    expect(d.steps.some((x) => /^place plate named \w+_ballast of steel\.a36/.test(x))).toBe(true);
    expect(check(d, /^empty, a 25 kg child climbing its front does not tip it$/)).toMatchObject({ ok: true, says: expect.stringMatching(/standing on it and leaning back from its top, 1\.05 m up, their pull there tips it at \d+ N .* more than the up to their own weight/) });
  });
  it('what is towed is a deck slung between two wheels with a tow arm and a hitch, its turning at its speed weighed', () => {
    const d = made('Design a child bicycle trailer for two children aged 2 to 6, combined payload 40 kg, towed at a maximum 20 km/h, with a rollover protection frame passing a 3 g lateral load test, a five-point harness, an empty mass below 14 kg, and a folded width under 30 cm.');
    expect(d.plan.join(' ')).toMatch(/a deck slung between two wheels, towed by an arm at its front/);
    expect(d.steps.some((x) => /named \w+_towarm /.test(x)) && d.steps.some((x) => /named \w+_hitch /.test(x))).toBe(true);
    expect(d.asked.find((a) => /^towed at/.test(a.text))?.got).toBe('move');
    // 20 km/h about a 5 m radius pulls it at 0.629 of g; its wheels set 880 mm apart tip it only at 0.944, by 1.5
    expect(check(d, /^turning at 20 km\/h, it does not tip over$/)).toMatchObject({ ok: true, says: expect.stringMatching(/880 mm track .* 0\.944 of g .* 0\.629 of g/) });
    expect(check(d, /^its tow arm bears its hitch's share and its braking$/)?.ok).toBe(true);
    // what pushes by hand is four wheels and a handle
    expect(made('a garden cart that carries 50 kg of soil, pushed by hand').plan.join(' ')).toMatch(/a deck on four free wheels, pushed by hand/);
  });
  it('a roof on four walls is a plate held round its edges, bending its shorter way', () => {
    const d = made(GREENHOUSE);
    expect(check(d, /^its roof bears 2\.4 kPa of snow$/)?.says).toMatch(/bending mostly across its 4 m \(Roark Table 11\.4/);
  });
  it('a cloth frame: poles held at their feet alone; eaves take the roof\'s lift and its cloth\'s pull', () => {
    const d = made(STALL);
    expect(check(d, /^its poles bear the wind and its roof$/)?.says).toMatch(/held upright at its foot alone, .* \(w H² \/ 2\)/);
    expect(check(d, /^its eaves bear the wind and its roof$/)?.says).toMatch(/T = p s² \/ 8 f, \d+ N on each metre/);
  });
  it('the habitat is as long as its crew want, its launch buckling weighed, its cold stated as a swing; "needs no power" is its own clause', () => {
    const b = law('Design a pressurized lunar lava-tube habitat module for 4 crew: 6 m inner diameter, 0.7 bar internal pressure, surviving a 300 K day-night swing, and total launch mass under 9,000 kg so it fits one lander delivery.', /^it holds 70 kPa in/)!;
    // its ends alone, 6 m across, hold 113 m³, more than the 100 m³ its crew want: a sphere; launched at 5 g its 3 mm wall
    // bears 1.4 × 7.8 MPa against 9.58 MPa (SP-8007's γ 0.224), so it is made 3.2 mm
    expect(b.says).toContain('its two hemispherical ends alone hold 113 m³, more than the 100 m³ its crew of 4 want'); expect(b.says).toContain('1030 kg of wall');
    expect(b.says).toContain('against the 9.58 MPa it buckles at'); expect(b.says).toContain('γ 0.224'); expect(b.says).toContain('so its wall is made 3.2 mm'); expect(b.says).toContain('a wall free to grow takes no stress');
    expect(parseAsk('a flood barrier that holds back 60 cm of water, needs no power or batteries, and has to hide in a 10 cm deep recess').clauses.map((c) => c.text)).toContain('needs no power or batteries and');
  });
});

describe('the fourth judging, fixed by cause', () => {
  const W6 = (i: number) => [
    "so I have a 14 foot wide pasture gate and I want it to swing open on its own when my ATV gets within 20 feet but stay shut when cattle lean on it with maybe 1200 pounds of force, solar powered, and it has to keep working through 5 cloudy days", "I want a pop-up school playground climbing frame that two teachers can assemble in under 15 minutes with no tools, holds 10 kids at 40 kg each, stays under 1.2 m high so falls are survivable, and packs into a 1.5 m by 0.6 m trolley.", "Our front door floods about once a year, so I need a flood barrier for a 90 cm wide doorway that pops up by itself when water reaches 5 cm, holds back 60 cm of water, needs no power or batteries, and has to hide in a 10 cm deep recess.", "Please design a foldable quadcopter frame for a 7-inch propeller cinematic drone with an all-up weight of 900 g including a 250 g camera payload. The frame must weigh under 140 g, survive a 2 m drop onto concrete, and collapse to fit inside a 120 mm diameter tube for storage.", "i need a desk clock that tells the time by rolling a steel ball down a 500 mm zig-zag track every minute and lifting it back up with a motor, running on two AA batteries for at least a year, and it has to be quieter than 25 dB at one metre so it won't wake me"
  ][[4, 5, 9, 14, 15].indexOf(i)]!;
  it('a frame of a thing is that thing, made as its frame: a quadcopter frame is its hub and arms, its motors carried, its drop weighed', () => {
    const c = go(W6(14)), fl = c.wants.find((w) => w.fn === 'lift')!;
    expect(fl.flags).toContain('frame'); expect(fl.q.Dr!.v).toBeCloseTo(0.1778, 4); expect(fl.q.auw!.v).toBeCloseTo(0.9, 6);
    const d = made(W6(14));
    expect(d.mass).toBeLessThan(0.14); expect(d.steps.some((x) => /_motor\d/.test(x))).toBe(false);
    // rotors 178 mm across, a tenth apart: motors 138 mm out; at full throttle each pulls 4.41 N on a 12 × 4 mm arm
    expect(check(d, /^its arms bear its motors at full throttle$/)).toMatchObject({ ok: true, says: expect.stringMatching(/4\.41 N .* 12 × 4 mm arm/) });
    // 17.7 J landed against what four arms bend away elastically: an arm breaks unless what it lands on takes the rest
    expect(check(d, /^it survives a 2 m drop$/)).toMatchObject({ ok: false, says: expect.stringMatching(/17\.7 J .* or an arm breaks/) });
    expect(check(d, /^it goes inside a 120 mm tube$/)?.ok).toBe(false);
  });
  it('what bears every load holds, though it does not keep to every limit: said apart', () => {
    const d = made(W6(5));
    expect(d.ok).toBe(false); expect(d.holds).toBe(true);
  });
  it('a gate leant on is borne by the two rails nearest the push; it opens itself only where a drive is made; its cells through dark days weighed', () => {
    const d = made(W6(4));
    expect(check(d, /^shut, its rails bear/)?.says).toMatch(/taken by the 2 of its 5 rails nearest where it is leant on/);
    expect(d.asked.find((a) => /^swing open on its own/.test(a.text))).toMatchObject({ got: null, why: expect.stringMatching(/nothing made does it by itself: what drives it \(a ram or a motor at its hinge\) is not made/) });
    expect(law(W6(4), /^it opens itself through 5 days on its cells$/)?.says).toMatch(/100 Wh over 5 days with no sun/);
  });
  it('a flap that rises on its own: floated up by the water in its recess where it weighs less, its push taken by stops at its sides', () => {
    const b = law(W6(9), /^holding back 600 mm of water$/)!;
    expect(b.says).toMatch(/weighs about 12\.3 kg; .* holds it up with 31\.5 kg \(ρ L W d\), so it floats up once the water is 50 mm up/);
    expect(b.says).toContain('stands upright once the water is 346 mm deep'); expect(b.says).toContain('one or the other: a flap hinged at its sill turns freely there');
  });
  it('a cloth shelter on snow: its door assumed, said apart; its stakes counted as pegs; a wind it must survive not done where pegs in snow hold it', () => {
    const EV = "need a wind-proof emergency shelter for 6 climbers at 7,800 m on Everest-type terrain, must survive 160 km/h gusts at minus 40 C, weigh under 35 kg packed, and be pitched by two gloved people in under four minutes";
    expect(sayConception(go(EV))).toMatch(/^I read it as something to enclose a space, with a door to go in by \(not asked, taken: swing open and shut\)/);
    const d = made(EV);
    expect(check(d, /weighs no more than 35 kg/)?.says).toMatch(/with its 42 stakes as steel pegs of about 30 g each \(estimate\), 1\.26 kg .* stands in the physics for what its stakes hold in the ground is not a weight it has/);
    expect(d.asked.find((a) => /160 km\/h gusts/.test(a.text))).toMatchObject({ got: null, why: expect.stringMatching(/in snow or ice a peg holds little/) });
  });
  it('a lifter said to hang on the wall is screwed to it, standing on no base; its hand crank weighed', () => {
    const LIFT = "I need a hand-cranked lifter to get 55 lb hay bales from the barn floor up to my loft hatch 9 feet high, no electricity, and it has to fold flat to under 6 inches thick so it hangs on the wall. Parts budget around $150.";
    const d = made(LIFT);
    expect(d.steps.some((x) => /named \w+_base /.test(x))).toBe(false); expect(d.steps.some((x) => /named \w+_wall of concrete/.test(x))).toBe(true); expect(d.mass).toBeLessThan(15);
    expect(law(LIFT, /^it is raised 2\.74 m by a hand crank$/)?.says).toMatch(/6\.12 N·m .* 15 N·m, so it wants no gearing .* 17\.5 turns .* a ratchet and pawl/);
  });
  it('put up by two people: no part heavier than they lift together (HSE L23, two-thirds of 2 × 16 kg)', () => {
    const d = made(W6(5));
    expect(check(d, /^no part weighs more than 21\.3 kg$/)?.ok).toBe(false);
  });
  it('high up, people at its edge and a lean at its top are weighed together', () => {
    const d = made("so we have a 45 cm diameter oak and want a treehouse platform 2.4 m up for three 30 kg kids plus an 80 kg parent, no more than two bolts through the trunk, and it has to tolerate 15 cm of trunk sway in wind without binding or cracking");
    expect(check(d, /^170 kg at an edge of its top does not tip it$/)).toMatchObject({ ok: false, says: expect.stringMatching(/together they turn it with 763 N·m against 532 N·m/) });
  });
  it('how loud it may be is asked, though not weighed', () => {
    expect(go(W6(15)).asked.find((a) => /25 dB/i.test(a.text))).toMatchObject({ kind: 'limit', got: null, met: false });
  });
});

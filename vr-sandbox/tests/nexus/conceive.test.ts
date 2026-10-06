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
    expect(sh.said.trip).toEqual({ from: 'earth', to: 'mars', back: true, days: 90, low: true });
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
    expect(lim.says).toMatch(/where it weighs most: the deck in its 3 pieces [\d.]+ kg, the 2 rails /);
  });
  it('makes a cart that moves at the speed asked, its speed held by its controller', () => {
    const [d] = designs(go('a cart that carries 20 kg at 1 m/s'), 1, { seed: 101, physics: J });
    const run = d!.checks.find((x) => /it moves at 1 m\/s/.test(x.what))!;
    expect(run.ok, run.says).toBe(true);
    expect(d!.ok && d!.whole).toBe(true);
  }, 60000);
  it('raises what it carries on a carriage between posts, what rides joined to the carriage', () => {
    const [d] = designs(go('a lift that raises 50 kg 1 m'), 1, { seed: 101, physics: J });
    const up = d!.checks.find((x) => /^it rides 1 m up and down its guides$/.test(x.what))!;
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

describe('wave 3: what keeps, encloses, hangs, turns, spans and stands in the wind', () => {
  it('keeping hot or cold over a time is not done, and is weighed as made: a bare cup cools in about an hour', () => {
    const c = go('Design a mug that keeps tea above 55 °C for 2 hours and weighs no more than 350 g');
    expect(c.asked.find((a) => /keeps tea/.test(a.text))!.got).toBe(null);
    const [d] = designs(c, 1, { seed: 101, physics: null });
    const k = d!.checks.find((x) => /^as made, it keeps what it holds above 55 °C/.test(x.what))!;
    expect(k.ok).toBe(false);
    expect(k.says).toMatch(/falls to 55 °C in about (\d+(\.\d+)? (h|min))/);
    expect(k.says).toMatch(/its open top's evaporation [\d.]+ W more \(the Lewis analogy, estimate\)/);
  });
  it('reads "keeps it ... in a 5 °C car" as a place, not as keeping something in, and "under 400 g empty" as its own weight', () => {
    const c = go('I want a 1 litre vacuum flask, under 400 g empty, that keeps tea poured at 95°C still above 70°C after 48 hours sitting in a 5°C car.');
    expect(c.wants.map((w) => w.fn)).toEqual(['contain']);
    expect(c.limits.mass).toBeCloseTo(0.4, 9);
  });
  it('stands the vessel it holds inside what encloses it, and sizes that to take it', () => {
    const [d] = designs(go('a cooler box that holds 20 litres of drinks at 4°C for 72 hours in 35°C heat'), 1, { seed: 101, physics: null });
    expect(d!.checks.find((x) => x.what === 'it can be made under the laws')!.ok).toBe(true);
    expect(d!.plan.some((p) => /hold a liquid.*, in what is to enclose a space/.test(p))).toBe(true);
    const cold = d!.checks.find((x) => /^as made, it keeps what it holds at 4 °C/.test(x.what))!;
    expect(cold.ok).toBe(false);
    expect(cold.says).toMatch(/let in [\d.]+ W/);
  });
  it('sizes a shelter for who sleeps in it, takes the ground it may cover as a limit, and loads its roof with the snow said', () => {
    const c = go('Can you come up with a 4-person emergency shelter for a mountain site that packs into a sled under 30 kg, takes up no more than 3 m x 2.5 m of ground, and survives 110 km/h winds and 80 cm of settled snow on the roof?');
    expect(c.limits.W).toBe(3); expect(c.limits.D).toBe(2.5); expect(c.limits.mass).toBeCloseTo(30, 9);
    const enc = c.wants.find((w) => w.fn === 'enclose')!;
    expect(enc.q.W!.v).toBeCloseTo(2.6, 9); expect(enc.q.D!.v).toBe(2);
    expect(enc.q.roofP!.v).toBeCloseTo(300 * 9.80665 * 0.8, 3);
    expect(c.asked.some((a) => /winds/.test(a.text))).toBe(false);
    const [d] = designs(c, 1, { seed: 101, physics: null });
    const roof = d!.checks.find((x) => /its roof bears 80 cm of settled snow/.test(x.what))!;
    expect(roof.says).toMatch(/bending [\d.]+ mm/);
  });
  it('bears a footbridge of several people spread along it on a frame of deep lumber, its deck in pieces no heavier than a person may carry', () => {
    const [d] = designs(go('design a footbridge over a 6.5 m wide creek on my property with a 1.1 m wide deck that can carry 4 adults plus a loaded wheelbarrow (call it 450 kg total), and no single piece can weigh more than 35 kg because we\'re carrying everything in by hand with no crane'), 1, { seed: 101, physics: null });
    expect(d!.checks.find((x) => /no part weighs more than 35 kg/.test(x.what))!.ok).toBe(true);
    // with the crowd gathered at its middle one rail a side would weigh more than 35 kg: two side by side under each edge
    expect(d!.checks.find((x) => /its rails bear a quarter of all of it each, two under each edge/.test(x.what))!.ok).toBe(true);
    expect(d!.choices.some((x) => /4 rails, two side by side under each edge/.test(x))).toBe(true);
    expect(d!.choices.some((x) => /its deck in \d+ pieces/.test(x))).toBe(true);
    expect(d!.ok).toBe(true);
  });
  it('hangs a wall shelf on two brackets at the studs said, the wall standing for itself and not weighed', () => {
    const [d] = designs(go('I need a wall shelf for my record collection that\'s 1.2 m long and 320 mm deep, holds 70 kg spread evenly, sags no more than 3 mm in the middle, and can only be screwed into two wall studs that are 600 mm apart.'), 1, { seed: 101, physics: J });
    expect(d!.plan[0]).toMatch(/a board on two steel brackets screwed to the wall/);
    expect(d!.choices.some((x) => /600 mm apart, at the studs/.test(x))).toBe(true);
    for (const w of ['its board bears 70 kg', 'its brackets bear their half', 'its screws hold in the studs', 'it sags no more than 3 mm', 'pushed at its top, it does not tip']) expect(d!.checks.find((x) => x.what.startsWith(w))!.ok).toBe(true);
    expect(d!.mass).toBeLessThan(20);
  }, 60000);
  it('turns the whole of what is asked to turn on what turns it, and stands its tank beside the soil, not in it', () => {
    const [d] = designs(go('Can you make a balcony planter that turns 360° every 6 hours so the plants get even sun, holds 40 kg of wet soil, and waters itself from a 10 L tank for 3 weeks?'), 1, { seed: 101, physics: null });
    expect(d!.asked.find((a) => a.kind === 'thing')!.got).toBe('support');
    expect(d!.plan[0]).toMatch(/^to turn: .*, on the floor$/);
    expect(d!.plan.filter((p) => /on what is to turn$/.test(p)).length).toBe(2);
    expect(d!.checks.find((x) => x.what === 'it can be made under the laws')!.ok).toBe(true);
  });
  it('pushes the wind on the faces its parts show, where they are, so an open frame is not taken for a solid wall', () => {
    const [d] = designs(go('Bird-watching tower: 5 m high platform, 2 m x 2 m footprint at most, has to hold 2 adults (200 kg) up top and not tip over in 90 km/h gusts.'), 1, { seed: 8020, physics: J });
    const wind = d!.checks.find((x) => /it stands in a 90 km\/h wind/.test(x.what))!;
    expect(wind.says).toMatch(/its parts show across it \(\d+ slender, by a drag coefficient of 2/);
    expect(wind.says).toMatch(/centred [\d.]+ m up/);
    expect(d!.asked.some((a) => /footprint/.test(a.text))).toBe(false);
    expect(d!.asked.find((a) => /^not tip over/.test(a.text))!.got).toBe('support');
  }, 60000);
  it('holds a wood column to K L / d of 50 at most', () => {
    const [d] = designs(go('a stool made of oak'), 1, { seed: 101, physics: null });
    expect(d!.checks.find((x) => /legs carry it without buckling/.test(x.what))!.says).toMatch(/K L \/ d [\d.]+ \(a wood column no more than 50: NDS 3\.7\.1\.4\)/);
  });
  it('says the surface dose on Europa, and does not judge a silicon rating by a dose to tissue', () => {
    const c = go('Need a flight computer board for a Europa lander that fits on a 100 mm x 160 mm card, draws under 8 W, and survives a 30-day surface mission behind no more than 2 kg of tantalum shielding without going over its 300 krad(Si) total dose rating.');
    const b = c.bounds.find((x) => /stays within its 300 krad on Europa/.test(x.what))!;
    expect(b.ok).toBe(null);
    expect(b.says).toMatch(/30 days there is about 162 Sv; that is not the dose to silicon/);
    expect(b.says).toMatch(/its 2 kg of tantalum round a 160 mm × 100 mm × 25 mm box \(estimate\) is about 4\.44 g\/cm²/);
    expect(c.bounds.some((x) => /into still air/.test(x.says))).toBe(false);
  });
});

describe('wave 3 rescored: what was asked said back, what it stands on, tests that do not spoil each other', () => {
  it('a door hung in a walk-in front swings, its test run before a gust blows the shelter away, and its sizes are read as built', () => {
    const [d] = designs(go('Can you come up with a 4-person emergency shelter for a mountain site that packs into a sled under 30 kg, takes up no more than 3 m x 2.5 m of ground, and survives 110 km/h winds and 80 cm of settled snow on the roof?'), 1, { seed: 101, physics: J });
    const sw = d!.checks.find((x) => x.what === 'it swings open')!;
    expect(sw.ok).toBe(true);
    // the wind test comes after it, and the door swung open does not make it deeper than it was built
    expect(d!.checks.findIndex((x) => /^it stands in a 110 km\/h wind$/.test(x.what))).toBeGreaterThan(d!.checks.indexOf(sw));
    expect(d!.checks.find((x) => /no more than 2\.5 m deep/.test(x.what))!.says).toBe('it is 2.05 m deep as made');
  }, 60000);
  it('a planter on a balcony is weighed against what a balcony is made for, all it weighs and carries', () => {
    const [d] = designs(go('Can you make a balcony planter for a tiny apartment that turns 360° every 6 hours so the plants get even sun, holds 40 kg of wet soil, and waters itself from a 10 L tank for 3 weeks?'), 1, { seed: 8020, physics: null });
    const b = d!.checks.find((x) => x.what === 'the balcony bears it')!;
    expect(b.says).toMatch(/kPa over its .* footprint against the 2\.5 kPa a balcony is made for, and .* kN on its one foot against 2 kN on any 50 mm square \(EN 1991-1-1 Table 6\.2/);
  });
  it('what it is said to carry is said back as done by what carries it, and who it is for keeps its "with"', () => {
    const c = go("design a footbridge over a 6.5 m wide creek on my property with a 1.1 m wide deck that can carry 4 adults plus a loaded wheelbarrow (call it 450 kg total), and no single piece can weigh more than 35 kg because we're carrying everything in by hand with no crane");
    expect(c.asked.find((a) => /^carry 4 adults plus a loaded wheelbarrow \(call it 450 kg total\)$/.test(a.text))).toMatchObject({ kind: 'does', got: 'support', load: true });
    expect(go("Design a mug for someone with a Parkinson's tremor that keeps tea above 55 °C for 2 hours").asked.some((a) => a.kind === 'for' && a.text === "for someone with a parkinson's tremor")).toBe(true);
    // the size said with what it is for is its own, not what it is for
    expect(go("I need a wall shelf for my record collection that's 1.2 m long and 320 mm deep, holds 70 kg").asked.some((a) => a.kind === 'for' && a.text === 'for my record collection')).toBe(true);
  });
  it('a cabinet that lowers what it carries carries it: only the raising is not derived', () => {
    const [d] = designs(go('I want a wall-mounted kitchen cabinet that lowers itself 50 cm to counter height for a wheelchair user in under 10 seconds, carries up to 20 kg of plates'), 1, { seed: 101, physics: J });
    expect(d!.asked.find((a) => /^carries up to 20 kg/.test(a.text))!.got).toBe('raise');
    expect(d!.asked.find((a) => /^lowers itself/.test(a.text))!.got).toBe(null);
  }, 60000);
  it('a flask held in the hand is narrow and tall, a mug no wider than a hand closes round', () => {
    const [f] = designs(go('I want a 1 litre vacuum flask, under 400 g empty'), 1, { seed: 101, physics: null });
    const [m] = designs(go('a mug that holds 350 ml'), 1, { seed: 101, physics: null });
    const dims = (d: typeof f) => /an upright tube of .* ([\d.]+) mm across and ([\d.]+) mm tall/.exec(d!.choices.join('; '))!.slice(1).map(Number);
    const [fw, fh] = dims(f), [mw] = dims(m);
    expect(fw).toBeLessThanOrEqual(90); expect(fh / fw).toBeGreaterThanOrEqual(2);
    expect(mw).toBeLessThanOrEqual(90);
  });
  it('a speed it burrows at is weighed, not dropped; a board on Europa sheds its heat to Europa\'s cold ground', () => {
    const w = go('what would a 4 cm earthworm-style robot look like that burrows through wet clay soil at 1 m per hour, draws 0.5 W');
    expect(w.dropped.some((x) => /1 m per hour/.test(x))).toBe(false);
    expect(w.bounds.some((b) => /^pushing through the ground at 1 m\/h$/.test(b.what))).toBe(true);
    const e = go('Need a flight computer board for a Europa lander that fits on a 100 mm x 160 mm card, draws under 8 W');
    const sh = e.bounds.find((b) => /^it sheds the 8 W/.test(b.what))!;
    expect(sh.says).toMatch(/to Europa's ground round it at about -163 °C/);
    expect(sh.says).toMatch(/settles near -2\d(\.\d+)? °C/);
  });
});

describe('wave 3 rescored: what it is named for, and what powers it', () => {
  it('a vacuum flask made with no vacuum is not ticked as a vacuum flask; a mug is a mug', () => {
    const f = go('I want a 1 litre vacuum flask, under 400 g empty, that keeps tea poured at 95°C still above 70°C after 48 hours sitting in a 5°C car.');
    const th = f.asked.find((a) => a.kind === 'thing')!;
    expect(th.got).toBe(null); expect(th.why).toMatch(/^made only as something to hold a liquid: what it is named for \(vacuum\) is not made/);
    expect(go('a mug that holds 350 ml').asked.find((a) => a.kind === 'thing')!.got).toBe('contain');
  });
  it('a board for a lander runs on the lander: what it would carry is weighed, not judged; a pod said to be battery-powered is judged', () => {
    const e = go('Need a flight computer board for a Europa lander that fits on a 100 mm x 160 mm card, draws under 8 W, and survives a 30-day surface mission');
    const b = e.bounds.find((x) => /^it carries what it needs for 30 days at 8 W, if it ran on cells of its own$/.test(x.what))!;
    expect(b.ok).toBe(null);
    const p = go('Could you invent a battery-powered sensor pod that sits at the bottom of the Challenger Deep (10,935 m) for 90 days drawing 50 W on average, with the whole titanium pressure sphere and batteries weighing under 120 kg?');
    expect(p.bounds.find((x) => /^it carries what it needs for 90 days at 50 W$/.test(x.what))!.ok).toBe(false);
  });
});

describe('a speed held by its controller, and a speed too slow for the motor kept', () => {
  it('a robot carrying its load is held at the speed asked by the third second, as a stiff speed controller holds it', () => {
    const [d] = designs(go('Can you make a little robot that crawls through 15 cm diameter drain pipes by itself at about 0.2 m/s'), 1, { seed: 101, physics: J });
    const m = d!.checks.find((x) => x.what === 'it moves at 0.2 m/s')!;
    expect(m.ok).toBe(true);
    const v = Number(/it went ([\d.]+) m\/s/.exec(m.says)![1]); expect(Math.abs(v - 0.2) / 0.2).toBeLessThan(0.05);
  }, 60000);
  it('a turn held slower than its brushes let it turn smoothly is not ticked, though the physics holds it', () => {
    const [d] = designs(go('a turntable that turns once every 6 hours'), 1, { seed: 101, physics: J });
    const t = d!.checks.find((x) => /^it turns at /.test(x.what))!;
    expect(t.ok).toBe(false);
    if (/came to/.test(t.says) && !/but the physics takes its brushes' friction as smooth/.test(t.says)) expect(Math.abs(Number(/came to ([\d.]+) rpm/.exec(t.says)![1]) / 0.00278 - 1)).toBeGreaterThan(0.15);
    expect(d!.gaps.some((g) => /where its brushes' friction stalls it/.test(g))).toBe(true);
  }, 60000);
});

describe('round D5: what the D4 judges found, by cause', () => {
  const b = (c: ReturnType<typeof go>, re: RegExp) => c.bounds.find((x) => re.test(x.what))!;
  it('swimming and getting there are judged apart; its mass at the density it sinks by; the field gradient that would hold it up', () => {
    const c = go('Design a 200 µm magnetically driven microswimmer that travels through human blood at 50 µm/s and delivers a 5 ng drug payload to a clot 3 cm away within 15 minutes.');
    expect(b(c, /^swimming at 50 µm\/s in blood$/).ok).toBe(true);
    const g = b(c, /^getting to it through flowing blood$/); expect(g.ok).toBe(false);
    expect(g.says).toMatch(/8\.63 µg/); expect(g.says).toMatch(/a gradient of about 0\.981 T\/m/);
    expect(c.questions.some((q) => q.key === 'what')).toBe(false);
    const re = c.scale!.groups.find((x) => x.key === 'Reynolds')!; expect(re.says).toMatch(/^0\.00303 in blood/);
  });
  it('a sail too small is sized for the time asked; a solar sail is not solar cells', () => {
    const c = go('Come up with a 150 m square solar-sail tug that moves through the vacuum of space towing a 2 tonne probe from Earth orbit to Mars in under 3 years.');
    expect(b(c, /^light alone carries it/).says).toMatch(/it would want a sail 1\.24 km square .* or 266 m square .* for the leg between the planets alone/);
    expect(c.asked.some((a) => /electronics/.test(a.why))).toBe(false);
  });
  it('a hand-cranked kettle with an open top never boils: its evaporation is weighed', () => {
    const [d] = designs(go('Looking for a hand-crank camping kettle under 2 kg that an ordinary adult can use to bring 1 litre of 15°C stream water to a boil in 5 minutes of cranking.'), 1, { seed: 101, physics: null });
    const k = d!.checks.find((x) => /^as made, a hand crank brings/.test(x.what))!;
    expect(k.ok).toBe(false); expect(k.says).toMatch(/settles near [67]\d(\.\d+)? °C and never reaches 100 °C/);
  });
  it('the Mars stage: its propellant at three twentieths said as propellant, the ellipse worked, several launches said', () => {
    const r = b(go('Design a crewed transfer stage that pushes a 40-tonne payload from a 400 km low Earth orbit into Mars orbit in 180 days using methane-oxygen engines with 370 s specific impulse, and tell me how much propellant it has to carry.'), /^the rocket equation/);
    expect(r.says).toMatch(/at three twentieths it must carry 1040 t of propellant, 1240 t leaving/);
    expect(r.says).toMatch(/captured instead into a long ellipse.* 222 t of propellant/);
    expect(r.says).toMatch(/over several launches/);
  });
  it('a buried lunar habitat loses more than it draws in its first hours; a closed sphere and a dome on a floor told apart', () => {
    const c = go('I want an inflatable habitat at the lunar south pole, 8 m in diameter, kept at 101 kPa inside, buried under enough regolith to hold crew dose below 50 mSv per year, and kept warm through -170 °C nights on no more than 15 kW of power.');
    const w = b(c, /^it keeps warm under its cover$/); expect(w.ok).toBe(null); expect(w.says).toMatch(/more than its 15 kW for the first 5\.5\d? h/);
    expect(b(c, /^it holds 101 kPa in$/).says).toMatch(/as a closed sphere its wall holds it all round.* set instead as a dome on a floor 8 m across, the floor or what anchors it must hold 5\.08 MN up/);
  });
  it('a pod at the bottom of the sea: 900 Wh/kg is beyond any cell; its wall said as part of its radius', () => {
    const c = go('Could you invent a battery-powered sensor pod that sits at the bottom of the Challenger Deep (10,935 m) for 90 days drawing 50 W on average, with the whole titanium pressure sphere and batteries weighing under 120 kg?');
    expect(b(c, /^its cells kept dry/).says).toMatch(/120 kg must hold 900 Wh\/kg, more than any cell holds/);
    expect(b(c, /^it holds out the sea/).says).toMatch(/has a wall 11\.6% as thick as the radius inside it/);
  });
  it('a mug that may spill 5 ml if knocked over is asked that, not left as a number unused', () => {
    const c = go("Design a mug for someone with a Parkinson's tremor that keeps tea above 55 °C for 2 hours, weighs no more than 350 g, and spills less than 5 ml if it gets knocked over on a table.");
    expect(c.asked.find((a) => /^spills no more than 5 ml if knocked over$/.test(a.text))).toMatchObject({ kind: 'does', got: null });
    expect(c.dropped.some((x) => /spill/.test(x))).toBe(false);
  });
  it('a shelter in the wind: its lift and its turning together, the air inside pushing up too, the margins taken', () => {
    const [d] = designs(go('Can you come up with a 4-person emergency shelter for a mountain site that packs into a sled under 30 kg, takes up no more than 3 m x 2.5 m of ground, and survives 110 km/h winds and 80 cm of settled snow on the roof?'), 1, { seed: 101, physics: J });
    expect(d!.checks.find((x) => x.what === 'empty, it stands in that wind')!.says).toMatch(/less the wind's lift below/);
    const up = d!.checks.find((x) => x.what === 'the wind does not lift it')!;
    expect(up.ok).toBe(false); expect(up.says).toMatch(/the air inside pushing up 0\.2 of it/); expect(up.says).toMatch(/with its door open into the wind/);
  }, 60000);
  it('a footbridge says its abutments are not made, and that rails too long for one span must be made to length', () => {
    const [d] = designs(go("design a footbridge over a 6.5 m wide creek on my property with a 1.1 m wide deck that can carry 4 adults plus a loaded wheelbarrow (call it 450 kg total), and no single piece can weigh more than 35 kg because we're carrying everything in by hand with no crane"), 1, { seed: 101, physics: null });
    expect(d!.gaps.some((g) => /abutments and their footings/.test(g))).toBe(true);
    expect(d!.gaps.some((g) => /nothing to splice it over, so it must be engineered timber made to length/.test(g))).toBe(true);
  });
});

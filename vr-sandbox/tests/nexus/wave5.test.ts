// Wave 5 (docs/STRESS-WAVES.md): asks for things not yet invented, read and weighed by the laws that govern them, not by
// a kind of thing kept: wind through a rotor (Betz), heat held in sand, water held back, a hatch holding a cabin's air,
// ice that keeps a cold store with no power, a mast standing alone in a gale, a slope a walker rolls on; and what is made
// checked as it is used: the air inside held warm through its walls, a heater that must reach its mark, a chair rocked
// back on two legs and stacked, a leaf under a pressure, one hand folding what folds, a fold against a wall that keeps
// above the floor, and an arm held only at its joined end.

import { describe, expect, it } from 'vitest';
import { answersFrom, conceive, designs } from '../../src/nexus/conceive';
import { Workshop } from '../../src/nexus/generate';
import { planTree, type Box } from '../../src/nexus/foldtree';

const go = (words: string) => { let c = conceive(words), all: Record<string, string> = {}; for (let k = 0; k < 3 && c.questions.length; k++) { all = { ...all, ...answersFrom(c, 'go') }; c = conceive(words, all); } return c; };
const law = (words: string, what: RegExp) => go(words).bounds.find((b) => what.test(b.what));
const made = (words: string, seed = 101) => designs(go(words), 1, { seed, physics: null })[0]!;
const check = (d: ReturnType<typeof made>, what: RegExp) => d.checks.find((x) => what.test(x.what));

describe('what the laws say of things not kept', () => {
  it('a rotor in the wind takes at most 16/27 of ½ ρ v³ A (Betz): 300 W at 10 m/s sweeps at least 1.03 m', () => {
    const b = law('Design a small wind turbine that clamps onto a balcony railing, weighs under 15 kg, and puts out 300 W in a 10 m/s wind without the blades ever swinging out past the railing.', /rotor gives 300 W/);
    expect(b?.says).toContain('0.841 m²'); expect(b?.says).toContain('1.03 m across'); expect(b?.says).toContain('railing');
  });
  it('a cubic metre of sand inside its insulation holds m c ΔT: 12.7 kWh for each 100 K, and loses some through it', () => {
    const b = law('Looking for a sand-filled heat battery that fits in a 1 m³ space under my stairs, charges from 3 kW of spare solar, and keeps the house warm through a 14-hour night while the outside of the case stays below 40 °C.', /store of heat in 1 m³ of sand/);
    expect(b?.says).toContain('0.343 m³'); expect(b?.says).toContain('12.7 kWh'); expect(b?.says).toContain('4.22 h'); expect(b?.says).toContain('486 W'); expect(b?.says).toContain('31.6 kWh'); expect(b?.says).toContain('643 to 1290 W'); expect(b?.ok).toBeNull();
  });
  it('still water 1.2 m deep pushes ½ ρ g h² on each metre of wall, at a third of its depth', () => {
    const b = law('I need a flood wall for my street that folds flat into a 30 cm deep slot in the sidewalk and flips up to hold back 1.2 m of fast-moving floodwater, and two neighbors should be able to raise a 20 m run in under 10 minutes.', /holding back 1.2 m of water/);
    expect(b?.says).toContain('7.06 kN'); expect(b?.says).toContain('400 mm up'); expect(b?.says).toContain('141 kN');
  });
  it('a 1.6 m hatch holding a cabin\'s air: p A on it, and a flat steel plate as thick as Roark gives', () => {
    const b = law('Design a docking collar for a spinning station ring that can latch onto a visiting ship while the ring keeps turning at 2 rpm, with a 1.6 m clear hatch that holds 101 kPa of cabin air.', /hatch 1.6 m across/);
    expect(b?.says).toContain('203 kN'); expect(b?.says).toContain('21.9 mm');
  });
  it('kept cold with no electricity: what leaks in at 0 °C inside, edges and corners counted, melts ice at 334 kJ/kg', () => {
    const b = law("Can you design a cooler that runs on no electricity at all and keeps 20 liters of medicine below 8 °C for 10 days when it's 40 °C outside?", /^ice keeps/);
    expect(b?.says).toContain('126 kg'); expect(b?.says).toContain('40.5 kg'); expect(b?.says).toContain('Incropera');
  });
  it('a mast standing alone in a gale: its foot as wide as the wind\'s moment needs, and Greenhill\'s height', () => {
    const b = law('Looking for a self-erecting emergency radio mast that rides in a pickup bed, telescopes up to 25 m in under 15 minutes with no guy wires, and doesn\'t buckle in a 150 km/h hurricane gust at full height.', /standing 25 m tall/);
    expect(b?.says).toContain('320 mm'); expect(b?.says).toContain('C_d 0.772'); expect(b?.says).toContain('Greenhill'); expect(b?.says).toContain('31.1 kN·m');
  });
  it('the sun on a 2.4 m² heater on a winter day warms air by P = ṁ c_p ΔT', () => {
    const b = law('I need a flat-pack solar air heater for my shed roof, no bigger than 1.2 m by 2 m, that blows out 55 °C air on a clear winter day and still holds up under 1.5 kN/m² of snow.', /sun warms air to 55/);
    expect(b?.says).toContain('720 W'); expect(b?.says).toContain('10.9 L/s');
  });
});

describe('reading what is said', () => {
  it('a thing named after who needs it, and a clause with its "that" left out', () => {
    expect(go('My dad needs a walker that brakes on its own on any slope steeper than 8% and holds up to a sudden 1000 N lean when he stumbles').name).toBe('walker');
    expect(go('Design a footbridge a rescue crew can hike in on their backs, no single piece over 20 kg, that spans a 15 m washed-out gorge').name).toBe('footbridge');
  });
  it('a tolerance is not a target, the mains carries nothing, a stack is a count and a height', () => {
    const oven = go('Design a countertop slow-roast oven that holds 85°C to within ±0.5°C for 12 hours straight while never drawing more than 400 W from a normal kitchen outlet.');
    expect(oven.said.mains).toBe(true); expect(oven.wants.find((w) => w.fn === 'warm')?.q.T?.v).toBe(85); expect(oven.dropped.some((d) => /^0\.5 °C: how steadily/.test(d))).toBe(true);
    const chair = go('Can you make a stacking dining chair that weighs under 3 kg, survives a 150 kg person rocking back on the two rear legs, and nests 12 high without the stack going over 1.5 m?');
    expect(chair.said.stackN).toBe(12); expect(chair.said.stackH).toBe(1.5); expect(chair.wants.find((w) => w.fn === 'support')?.flags).toContain('rock');
  });
  it('how level it is held is a tolerance; a tilt of what it carries is weighed', () => {
    const wc = go('I want a powered wheelchair that can go up and down a normal staircase with 18 cm steps while carrying a 120 kg rider, keeping the seat level within 3 degrees the whole way.');
    expect(wc.dropped.some((d) => /^3 degrees: how near level/.test(d))).toBe(true);
    const bed = go('Hospital bed that slowly tilts a 140 kg patient 30 degrees side to side every 2 hours to stop pressure sores, and keeps doing it for 72 hours on battery if the power goes out.');
    expect(bed.said.tilt).toBeCloseTo(Math.PI / 6, 6); expect(bed.bounds.find((b) => /tilted 30°/.test(b.what))?.says).toContain('0.577');
  });
});

describe('what is made, checked as it is used', () => {
  it('a chair rocked back on its two rear legs: those two carry it; stacked, as made it does not nest', () => {
    const d = made('Can you make a stacking dining chair that weighs under 3 kg, survives a 150 kg person rocking back on the two rear legs, and nests 12 high without the stack going over 1.5 m?', 8020);
    expect(check(d, /legs carry it/)?.says).toContain('rocked back onto two of them');
    const st = check(d, /^12 of it stack within 1.5 m$/); expect(st?.ok).toBe(false); expect(st?.says).toContain('59.1 mm');
  });
  it('a hatch\'s leaf under the cabin\'s pressure, held at its edges (Roark): plywood gives, and the hatch is not ticked', () => {
    const d = made('Design a docking collar for a spinning station ring that can latch onto a visiting ship while the ring keeps turning at 2 rpm, with a 1.6 m clear hatch that holds 101 kPa of cabin air.');
    const c = check(d, /holds 101 kPa across it$/); expect(c?.ok).toBe(false); expect(c?.says).toContain('Roark');
    expect(d.asked.find((a) => /hatch/.test(a.text))?.got).toBeNull();
  });
  it('an oven\'s inside held at 85 °C through its walls; its heater sized by them, and too hot for the plywood it is in', () => {
    const d = made('Design a countertop slow-roast oven that holds 85°C to within ±0.5°C for 12 hours straight while never drawing more than 400 W from a normal kitchen outlet.');
    const c = check(d, /^its walls let out no more than what warms it, the air inside at 85 °C/); expect(c?.ok).toBe(true); expect(c?.says).toContain('400 W');
    const h = check(d, /^its heater holds the air inside at 85 °C$/); expect(h?.ok).toBe(false); expect(h?.says).toContain('2.44 W/K'); expect(h?.says).toContain('chars');
    // it has a door, and what it does is not ticked while its heater fails
    expect(d.choices.join(' ')).toContain('a door hung in the front');
    expect(d.asked.find((a) => a.kind === 'does')?.got).toBeNull(); expect(d.asked.find((a) => a.kind === 'thing')?.got).toBeNull();
  });
  it('a tent warmed by the two in it at -45 °C: its walls let out far more than 200 W', () => {
    const d = made('Can you design a two-person Antarctic tent that packs down to under 2.5 kg, stays standing in 120 km/h katabatic gusts, and keeps the inside livable at -45°C using nothing but body heat?');
    const c = check(d, /^its walls let out no more than what warms it, the air inside at 18 °C with -45 °C round it/); expect(c?.ok).toBe(false); expect(c?.says).toContain('150 W of the 200 W the people in it give'); expect(c?.says).toContain('the wind outside (0.04 m² K/W'); expect(c?.says).toContain('foam');
  });
  it('a solar heater, bare, loses more than the winter sun puts into it', () => {
    const d = made('I need a flat-pack solar air heater for my shed roof, no bigger than 1.2 m by 2 m, that blows out 55 °C air on a clear winter day and still holds up under 1.5 kN/m² of snow.');
    const c = check(d, /keeps warm at 55 °C/); expect(c?.ok).toBe(false); expect(c?.says).toContain('the sun puts into it');
  });
  it('a loft bed against the wall: it hangs there, one hand cannot fold it, and it is measured without the wall', () => {
    const d = made('I want a loft bed for a room with a 2.4 m ceiling that holds two adults (180 kg total) and folds flat up against the wall in under 30 seconds using one hand.');
    expect(d.choices.join(' ')).toContain('screwed to the wall');
    const h = check(d, /^one hand folds it$/); expect(h?.ok).toBe(false); expect(h?.says).toContain('148 N');
    // its own height, not the wall's it hangs on
    const hh = check(d, /^it stands under the 2\.4 m ceiling$/); expect(hh?.ok).toBe(true); expect(hh?.says).toMatch(/^its top is [\d.]+ m above the floor/);
    expect(check(d, /^folded, it stays under the 2\.4 m ceiling$/)?.ok).toBe(true);
    expect(d.asked.find((a) => /folds/.test(a.text))?.got).toBeNull();
  });
});

describe('wave 5b: what the blind rejudge found, by cause', () => {
  it('a thing is ticked only where all it is asked to do is done; a number said and not used un-ticks what it was said with', () => {
    const d = made('I want a powered wheelchair that can go up and down a normal staircase with 18 cm steps while carrying a 120 kg rider, keeping the seat level within 3 degrees the whole way.');
    expect(d.asked.find((a) => a.kind === 'thing')?.got).toBeNull();
    // its wheels cannot roll up a step taller than their radius
    const w = check(d, /^its wheels climb a 180 mm step$/); expect(w?.ok).toBe(false); expect(w?.says).toContain('360 mm');
  });
  it('rocked back, a chair\'s rear legs bend at the seat: weighed, and what it survives is listed and tied to it', () => {
    const d = made('Can you make a stacking dining chair that weighs under 3 kg, survives a 150 kg person rocking back on the two rear legs, and nests 12 high without the stack going over 1.5 m?', 8020);
    const c = check(d, /^its rear legs bear it rocked back$/); expect(c?.says).toContain('W/2 · L (sin θ + μ cos θ)');
    const a = d.asked.find((x) => /rocking back/.test(x.text)); expect(a?.kind).toBe('does'); expect(a?.got ?? null).toBe(c?.ok ? 'support' : null);
  });
  it('snow on a solar heater\'s plate is borne by the load law, not only said', () => {
    const d = made('I need a flat-pack solar air heater for my shed roof, no bigger than 1.2 m by 2 m, that blows out 55 °C air on a clear winter day and still holds up under 1.5 kN/m² of snow.');
    const c = check(d, /bears 1.5 kPa on it$/); expect(c?.ok).toBe(false); expect(c?.says).toContain('3.6 kN');
    expect(d.asked.find((a) => a.kind === 'thing')?.got).toBeNull();
  });
  it('standing in a wind is what it is asked to do, listed (its test of it, with Jolt, decides its tick)', () => {
    const c = go('Can you design a two-person Antarctic tent that packs down to under 2.5 kg, stays standing in 120 km/h katabatic gusts, and keeps the inside livable at -45°C using nothing but body heat?');
    expect(c.asked.find((a) => /^stays standing in 120 km\/h/.test(a.text))?.kind).toBe('does');
  });
  it('a ring that spins, a grip over eight decades, a grain that sticks, a thickness from what it is the size of, a stair\'s treads', () => {
    expect(law('Design a docking collar for a spinning station ring that can latch onto a visiting ship while the ring keeps turning at 2 rpm, with a 1.6 m clear hatch that holds 101 kPa of cabin air.', /^on a ring turning at 2 rpm$/)?.says).toContain('224 m');
    const g = go('Need one gripper mechanism that can handle both a 20 micron dust grain and a 3 m solar panel, with grip force adjustable anywhere from 1 micronewton up to 500 N.');
    expect(g.asked.find((a) => a.kind === 'thing')?.text).toBe('one gripper mechanism');
    expect(g.bounds.find((b) => /^a grip from/.test(b.what))?.says).toContain('28.9 bits');
    expect(g.bounds.find((b) => /^a grain 20 µm across$/.test(b.what))?.says).toContain('times its weight');
    expect(go('looking for a flight computer the size of a microSD card, roughly 15 x 11 mm, that runs a cubesat on under 200 mW and survives 100 krad of radiation').said.size?.H).toBe(0.001);
    expect(law('A pull-down attic staircase that fits through a hatch only 60 cm wide, takes 120 kg on any step, and is spring-counterbalanced so it needs less than 50 N of pull to open or close.', /^each step bears 120 kg$/)?.says).toContain('147 N·m');
  });
});

describe('the laws under it', () => {
  it('an arm held only at the end it is joined at is a cantilever fixed there: F L³ / 8 E I spread along it', () => {
    const w = new Workshop({ parts: () => [] }, 1);
    w.run('place block named a of steel.a36 at 0 m, 0.5 m, 0 m size 100 x 100 x 100 mm');
    w.run('place bar named b of steel.a36 at 0.55 m, 0.5 m, 0 m size 1000 x 20 x 20 mm');
    w.run('join a, b as g'); w.run('load b with 100 N spread');
    expect(w.value('b.deflection')).toBeCloseTo(100 / (8 * 200e9 * (0.02 ** 4 / 12)), 6);
    expect(w.value('b.factor')).toBeCloseTo(250 / 37.5, 1);
  });
  it('folding against a wall, nothing folds through the floor under it', () => {
    const wall: Box = { name: 'w_wall', at: [0, 0.8, -0.1], w: 1.6, h: 1.6, d: 0.2 };
    const board: Box = { name: 'w_board', at: [0, 0.41, 0.3], w: 1.0, h: 0.02, d: 0.6 };
    const p = planTree([wall, board], new Map(), { ground: ['w_wall'] });
    expect(p.folds).toHaveLength(1);
    const b = p.folded.find((x) => x.name === 'w_board')!; expect(b.at[1] - b.h / 2).toBeGreaterThanOrEqual(-1e-9); expect(b.d).toBeCloseTo(0.02, 6);
  });
});

describe('wave 5c: what the third blind round found, by cause', () => {
  it('a limit said is asked as much as what it does: met where its check passes, the piece too heavy to carry counted', () => {
    const d = made('Design a footbridge a rescue crew can hike in on their backs, no single piece over 20 kg, that spans a 15 m washed-out gorge and safely carries a loaded stretcher plus four carriers, around 400 kg total.');
    const lim = d.asked.find((a) => a.kind === 'limit' && /^no part weighs more than 20 kg$/.test(a.text));
    expect(lim?.met).toBe(false); expect(d.does[1]).toBe(4);
    // a span bent far past a tenth of it is said to mean only that it fails
    expect(check(d, /^it spans 15 m/)?.says).toContain('a figure that means only it fails long before');
    // how it was tested is said in its tests, not ticked as a check of its own
    expect(check(d, /^tested with what it carries/)).toBeUndefined();
  });
  it('on a roof the wind lifts it; its plan is checked; a weight within a quarter of its limit with parts still to come is not ticked', () => {
    const h = made('I need a flat-pack solar air heater for my shed roof, no bigger than 1.2 m by 2 m, that blows out 55 °C air on a clear winter day and still holds up under 1.5 kN/m² of snow.');
    const lift = check(h, /^on a roof, its own weight holds it down in a storm$/); expect(lift?.ok).toBe(false); expect(lift?.says).toContain('903 N');
    expect(check(h, /^its plan is within 2 m × 1\.2 m, either way round$/)?.ok).toBe(true);
    expect(h.asked.some((a) => a.kind === 'has' && /flat.pack/.test(a.text) && /how it comes apart/.test(a.why))).toBe(true);
    const o = made('Can you design a folding patient hoist that lifts a 160 kg person from the floor onto a 75 cm high bed in under 30 seconds, but still folds small enough for a car boot and weighs under 18 kg itself?');
    const w = check(o, /it weighs no more than 18 kg/); expect(w?.ok).toBe(false); expect(w?.says).toContain('only 0.47 kg is left for it');
  });
  it('a heater just strong enough holds its mark but never brings it there; a hatch leaf bent past half its thickness is said so', () => {
    const o = made('Design a countertop slow-roast oven that holds 85°C to within ±0.5°C for 12 hours straight while never drawing more than 400 W from a normal kitchen outlet.');
    const hx = check(o, /^its heater holds the air inside at 85 °C$/)!; expect(hx.says).toMatch(/comes within 0\.5 °C only after/); expect(hx.says).toMatch(/one of the 400 W it may use gets there in/); expect(hx.says).toContain('goes down into that');
    const c = made('Design a docking collar for a spinning station ring that can latch onto a visiting ship while the ring keeps turning at 2 rpm, with a 1.6 m clear hatch that holds 101 kPa of cabin air.');
    const p = check(c, /holds 101 kPa across it$/)!; expect(p.says).toMatch(/times its thickness: so far past where this reading holds/); expect(p.says).toContain('no opening it closes');
    expect(c.asked.find((a) => a.kind === 'has' && /hatch/.test(a.text))?.why).toContain('and there is no opening it closes');
  });
  it('reads what it is: a mast, a computer that runs a craft, brakes its wheels drive, a hand that closes, a sentence that goes on', () => {
    const m = go('Looking for a self-erecting emergency radio mast that rides in a pickup bed, telescopes up to 25 m in under 15 minutes with no guy wires, and doesn\'t buckle in a 150 km/h hurricane gust at full height.');
    expect(m.asked[0]!.why).toMatch(/^a mast standing tall/);
    expect(m.heard.some((h) => /^wind of 150 km\/h: nothing is made to push, but what it would take is weighed below$/.test(h))).toBe(true);
    const f = go('looking for a flight computer the size of a microSD card, roughly 15 x 11 mm, that runs a cubesat on under 200 mW and survives 100 krad of radiation');
    expect(f.asked.some((a) => /working it, as a computer runs what it is in/.test(a.why))).toBe(true);
    const k = go('My dad needs a walker that brakes on its own on any slope steeper than 8% and holds up to a sudden 1000 N lean when he stumbles, with the brakes powered by the rolling wheels so there\'s nothing to charge.');
    expect(k.asked.some((a) => /powered by its own rolling/.test(a.why))).toBe(true); expect(k.asked.some((a) => /^braking: a brake/.test(a.why))).toBe(true);
    const h = go('Can you come up with a soft robotic hand for a hadal lander that picks up jellyfish and sea cucumbers at 10,900 m down without tearing them? It has to close with less than 0.5 N of force while the water outside is pushing at about 110 MPa.');
    expect(h.asked.some((a) => / them it\b/.test(a.text))).toBe(false); expect(h.asked.some((a) => /^closing on what it holds/.test(a.why))).toBe(true);
  });
  it('the laws: a cooler with no power is weighed in ice, a tilt by its drive, a rotor at its clamp, a stair by its load factor', () => {
    const c = go('Can you design a cooler that runs on no electricity at all and keeps 20 liters of medicine below 8 °C for 10 days when it\'s 40 °C outside?');
    expect(c.bounds.some((b) => /Peltier/.test(b.what))).toBe(false); expect(c.bounds.find((b) => /^ice keeps/.test(b.what))?.says).toContain('8.02 kg more');
    expect(c.heard.some((h) => /weighed below by the ice it must carry$/.test(h))).toBe(true);
    const t = law('Hospital bed that slowly tilts a 140 kg patient 30 degrees side to side every 2 hours to stop pressure sores, and keeps doing it for 72 hours on battery if the power goes out.', /tilted 30°/);
    expect(t?.says).toContain('through a slow drive of about 0.25'); expect(t?.says).toContain('which its drive or a lock must hold');
    const r = law('Design a small wind turbine that clamps onto a balcony railing, weighs under 15 kg, and puts out 300 W in a 10 m/s wind without the blades ever swinging out past the railing.', /rotor gives 300 W/);
    expect(r?.says).toMatch(/at the clamp, its own 15 kg held 727 mm in turns it with 107 N·m/);
    const s = law('A pull-down attic staircase that fits through a hatch only 60 cm wide, takes 120 kg on any step, and is spring-counterbalanced so it needs less than 50 N of pull to open or close.', /each step bears 120 kg/);
    expect(s?.says).toContain('29.9 mm thick'); expect(s?.says).toContain('135 to 415 N·m');
  });
});

// The machine inventor: composing a machine out of what the component library affords, rather than copying a blueprint.
//
// The checks that matter here are the ones that stop a bill of materials from becoming fiction: every part named by a
// unit must be a part the library really draws, every unit's mass must include what it buys whole, and the stacking
// rule must put each load on the thing that actually takes it. Two of these are faults this file's first run had, and
// both are kept as tests so they cannot come back: tools were stacked on each other, so a camera beside a gripper was
// asked to hold the gripper's load; and a payload was added to every stage alike.

import { beltFor, beltPull } from '../../src/nexus/kinds/motion';
import { describe, expect, it } from 'vitest';
import {
  BRAIN, EYE, GRIPPER, SPINDLE, beltAxis, composeMachine, baseFrame, machineText, machineWords,
  readMachine, screwAxis, stack, turnAxis, unitKg, unitUsd, armLink, layUnit, machineParts, machinePart, everyUnit, beltStages, type Unit,
} from '../../src/nexus/ask/machine';
import * as THREE from 'three';
import { component } from '../../src/nexus/parts/components';
import { layout } from '../../src/nexus/parts/space';
import type { Part } from '../../src/nexus/parts/kits';
import { machineBuild, throwAt, under3K } from '../../src/nexus/works';

// `ask/machine.ts` owns the list. It was written out here and in `cli/machine-main.ts` as well, so a unit added to
// one and not the others was checked by nothing - the two-owners fault, in the file whose own test asserts it.
const ALL: Unit[] = everyUnit();

describe('every unit is made of parts the library really draws', () => {
  it('no unit names a part the component library cannot make', () => {
    const gaps = ALL.flatMap((u) => unitKg(u).gaps.map((g) => `${u.id}: ${g}`));
    expect(gaps).toEqual([]);
  });
  it('a unit weighs what its drawn parts and its bought lines weigh, not a gram', () => {
    // (the first run left bought lines out of the sum, so the eye and the brain weighed 1 g and every stack below them
    //  was checked against a load that was not there)
    for (const u of ALL) expect(unitKg(u).kg, u.id).toBeGreaterThan(0.004);
    expect(unitKg(BRAIN).kg).toBeGreaterThan(0.5);      // its supply alone is 600 g
    expect(unitKg(SPINDLE).kg).toBeGreaterThan(1);      // the spindle itself is a kilogram
  });
  it('prices come from a seller\'s own page, and a part with no page says so', () => {
    const { usd, unpriced } = unitUsd(screwAxis(300));
    expect(usd).toBeGreaterThan(40);                     // its rail, motor and bearings are all sourced
    expect(unpriced.join(' ')).toMatch(/extrusion/);     // its extrusion is not, and is named rather than guessed at
  });
});

describe('a part comes back at the size it was asked for', () => {
  // The fault this exists for: `ask/machine.ts` orders `pulley GT2 <teeth> <bore>`, and the pulley family read teeth
  // only from "60t" and a bore only from "8mm", so those words matched neither and it returned its 20-tooth, 5 mm
  // default *silently*. Every pulley every composed machine ordered was that part whatever the bill said, and a
  // pulley is the gear ratio, so every arm's torque table was arithmetic over a ratio the drawing did not have. The
  // completeness check above could not see it: the part resolved, it was simply the wrong one. Resolving is not
  // agreeing, and this is the check for the difference.
  it('every number in the words a unit orders a part by is in the part it gets', () => {
    const wrong: string[] = [];
    for (const u of ALL) {
      for (const { words } of u.of) {
        const c = component(words);
        if (typeof c === 'string') continue;                       // a gap, which the test above owns
        const got = `${c.part.name ?? ''} ${JSON.stringify(c.part).slice(0, 400)}`;
        for (const n of words.match(/(?<![\w.])\d{2,4}(?![\w.])/g) ?? []) {
          if (!got.includes(n)) wrong.push(`${u.id} asked "${words}" and ${n} is nowhere in what came back`);
        }
      }
    }
    expect([...new Set(wrong)]).toEqual([]);
  });

  it('a belt stage cannot reduce more than the pulleys it is made of', () => {
    // 20 teeth is the smallest driver worth making and 80 the family's largest wheel, so 4:1 is a real ceiling.
    // Asking one pair for 50:1 is a 1000-tooth pulley: it is staged, or a belt is the wrong machine for it.
    expect(beltStages(4)).toHaveLength(1);
    expect(beltStages(5)).toHaveLength(2);                          // 4:1 is the most one pair gives
    expect(beltStages(50)).toHaveLength(3);
    expect(beltStages(100)).toBeNull();                             // and then say so, rather than draw a fiction
    for (const r of [3, 5, 10, 20, 50]) {
      const st = beltStages(r)!;
      for (const x of st) expect(x.driven, `${r}:1`).toBeLessThanOrEqual(80);
      // what the pulleys give is within a quarter of what was asked, and it is that figure the torque is taken from
      const real = st.reduce((a, x) => a * (x.driven / x.driver), 1);
      expect(Math.abs(real - r) / r, `${r}:1 delivers ${real.toFixed(2)}`).toBeLessThan(0.25);
      expect(turnAxis(r).says).toContain(real.toFixed(2));
    }
  });
});

describe('a screw axis and a belt axis are the same parts and not the same machine', () => {
  it('the screw raises more and the belt runs faster', () => {
    const s = screwAxis(300), b = beltAxis(300);
    expect(s.lifts).toBeGreaterThan(b.lifts * 1.5);
    expect(b.speed).toBeGreaterThan(s.speed * 3);
  });
  it('a finer lead raises more', () => {
    expect(screwAxis(300, 2).lifts).toBeGreaterThan(screwAxis(300, 8).lifts * 3);
  });
  it('both carry the same, because what carries is the rail and not the drive', () => {
    expect(screwAxis(300).carries).toBe(beltAxis(300).carries);
  });
});

describe('what the words spell', () => {
  it('the same units spell a printer, a router and a pick-and-place', () => {
    const p = composeMachine('a machine that prints 300x300x400');
    const c = composeMachine('a machine that cuts 400x300x80');
    const g = composeMachine('a machine that picks up 1kg and sees 800x400x200');
    expect(p.does).toContain('deposit'); expect(p.does).not.toContain('cut');
    expect(c.does).toContain('cut'); expect(c.does).not.toContain('deposit');
    expect(g.does).toEqual(expect.arrayContaining(['grip', 'see']));
    // and none of them is a stored machine: each is its own stack of the same words
    expect(new Set([p, c, g].map((m) => m.stages.map((s) => s.unit.id).join('+'))).size).toBe(3);
  });
  it('a cut gets screws on every axis and a print gets belts across, because a cutter pushes sideways', () => {
    const c = composeMachine('a machine that cuts 400x300x80'), p = composeMachine('a machine that prints 300x300x400');
    expect(c.stages.filter((s) => /screw axis/.test(s.unit.name))).toHaveLength(3);
    expect(p.stages.filter((s) => /belt axis/.test(s.unit.name))).toHaveLength(2);
  });
  it('the size asked for is the travel, and the frame is bigger than it', () => {
    const m = composeMachine('a machine that prints 300x300x400');
    expect(m.reach).toEqual([300, 300, 400]);
    expect(m.stages[0]!.unit.box[0]).toBeGreaterThan(300);
  });
  it('words with no tool in them are refused with what to say instead', () => {
    const m = composeMachine('a machine');
    expect(m.refusals.join(' ')).toMatch(/says what the machine must \*do\*/);
  });
  it('a size and a payload are read out of the words', () => {
    const r = readMachine('a machine that picks up 2.5 kg over 900 x 450 x 300');
    expect(r.mm).toEqual([900, 450, 300]); expect(r.payload).toBe(2.5); expect(r.does).toContain('grip');
  });
});

describe('the stacking rule puts each load on what takes it', () => {
  it('every axis carries the axes above it, the tools, and what is held', () => {
    const axes = [beltAxis(400), screwAxis(200)];
    const r = stack(baseFrame(600, 600, 550), axes, [GRIPPER, EYE], 1);
    const bottom = r.stages.find((s) => s.unit.id === axes[0]!.id)!;
    const top = r.stages.find((s) => s.unit.id === axes[1]!.id)!;
    expect(bottom.carrying).toBeGreaterThan(top.carrying);
    expect(top.carrying).toBeGreaterThan(1);           // the gripper, the eye and the kilogram
  });
  it('a camera beside a gripper carries nothing: tools are bolted side by side, not stacked', () => {
    const r = stack(baseFrame(600, 600, 550), [screwAxis(200)], [GRIPPER, EYE], 2);
    const eye = r.stages.find((s) => s.unit.id === 'eye')!;
    expect(eye.carrying).toBe(0);
    expect(eye.ok).toBe(true);
    expect(r.refusals.join(' ')).not.toMatch(/camera/);
  });
  it('a payload is checked against the grip that holds it, with both numbers', () => {
    const over = stack(baseFrame(600, 600, 550), [screwAxis(200)], [GRIPPER], 2);
    expect(over.refusals.join(' ')).toMatch(/grips 1\.5 kg and was asked to hold 2 kg/);
    const under = stack(baseFrame(600, 600, 550), [screwAxis(200)], [GRIPPER], 1);
    expect(under.refusals).toEqual([]);
  });
  it('asking for a load with nothing that grips is refused by name', () => {
    expect(composeMachine('a machine that prints 200x200 and holds 5kg').refusals.join(' ')).toMatch(/nothing on it grips/);
  });
  it('the frame carries everything, and its own weight is not counted onto itself', () => {
    const r = stack(baseFrame(600, 600, 550), [screwAxis(200)], [EYE], 0);
    const fr = r.stages[0]!;
    expect(fr.carrying).toBeCloseTo(r.kg - unitKg(baseFrame(600, 600, 550)).kg, 2);
  });
});

describe('an invented machine is a thing you can actually go and build', () => {
  it('its lines route through the $3,000 works with nothing it cannot do', () => {
    const job = throwAt(machineBuild(composeMachine('a machine that prints 300x300x400')), under3K().ids);
    expect(job.gaps).toEqual([]);
    expect(job.buy.length).toBeGreaterThan(10);
    expect(job.usd).toBeGreaterThan(100);
  });
  it('the extrusion is cut here and the rail, the motor and the belt are bought', () => {
    const job = throwAt(machineBuild(composeMachine('a machine that prints 300x300x400')), under3K().ids);
    expect(job.ops.some((o) => /extrusion/i.test(o.part))).toBe(true);
    const bought = job.buy.map((b) => b.line.name).join(' | ');
    for (const want of [/MGN12H/, /NEMA 17 stepper/, /GT2 belt/]) expect(bought).toMatch(want);
  });
  it('a toothed pulley, a coupling and a hot end are bought, never turned here', () => {
    // (all four were faults the router had until an invented machine was thrown at it: a $3 coupling came out forged
    //  on the propane forge, and a GT2 pulley came out turned on the mini lathe)
    const job = throwAt(machineBuild(composeMachine('a machine that prints 300x300x400')), under3K().ids);
    const turned = job.ops.filter((o) => /lathe|forge/.test(o.station)).map((o) => o.part).join(' | ');
    for (const never of [/pulley/i, /coupling/i, /nozzle/i, /heat/i]) expect(turned).not.toMatch(never);
  });
  it('it is said in full, with what each stage carries and what is bought and why', () => {
    const said = machineText(composeMachine('a machine that cuts 400x300x80'));
    expect(said).toMatch(/composed, not copied/);
    expect(said).toMatch(/carries/);
    expect(said).toMatch(/bought:/);
  });
});

describe('words in the room', () => {
  it('answers an invention ask and nothing else', () => {
    expect(machineWords('invent me a machine that prints 200x200x200')).toMatch(/of travel/);
    expect(machineWords('what is the weather')).toBeNull();
    expect(machineWords('show me the works')).toBeNull();
  });
});

describe('the arrangement comes out of the words too, not out of a default', () => {
  it('"along a wall" is a rail, "reaches" is an arm, "lathe" is a table, and anything else is a gantry', () => {
    expect(readMachine('a hand that moves along a wall 3000 mm').arrange).toBe('rail');
    expect(readMachine('an arm that reaches 600 mm').arrange).toBe('arm');
    expect(readMachine('a lathe that cuts 200x100').arrange).toBe('table');
    expect(readMachine('a machine that prints 300x300').arrange).toBe('gantry');
  });
  it('a rail and an arm are given by one number, which the first run read as nothing', () => {
    expect(readMachine('a hand that moves along a wall 3000 mm').mm[0]).toBe(3000);
    expect(readMachine('an arm that reaches 600 mm and picks up 1kg').mm[0]).toBe(600);
    // and a gantry still wants its three
    expect(readMachine('a machine that prints 250x210x200').mm).toEqual([250, 210, 200]);
  });
  it('the belt is the ceiling, not the tooth count: a reduction no GT2 width can pull is refused', () => {
    // staging capped the ratio a pair of pulleys can give and moved the fiction into the belt. A 50:1 axis published
    // 18.24 N·m on a 74-tooth output - 774 N in a belt that BREAKS near 550 N and is rated to work at 27 - and
    // nothing could notice, because the belt family carried no force at all.
    expect(beltPull(6), "a 6 mm GT2's working tension, a seller's own figure").toBe(27);
    expect(beltFor(20), 'a light pull takes the narrowest belt there is').toBe(6);
    expect(beltFor(60), 'a harder one takes a wider belt before it takes another stage').toBe(15);
    expect(beltFor(800), 'and past the widest in the family the honest answer is none').toBeNull();
    const deep = turnAxis(50);
    expect(deep.cannot, 'a 50:1 belt reduction cannot be built of GT2 and must say so').toBeTruthy();
    expect(deep.cannot).toMatch(/worm|cycloidal/);
    expect(deep.says, 'and it must not publish a torque it cannot hold').not.toMatch(/N·m at the output/);
    // the bearings follow the stage count: an intermediate shaft wants its own pair, and two were ordered whatever
    const two = turnAxis(10), three = turnAxis(50);
    const bearings = (u: ReturnType<typeof turnAxis>) => u.of.find((o) => /bearing 6805/.test(o.words))!.n;
    expect(bearings(three)).toBeGreaterThan(bearings(two));
    // and the box follows the real centre distance rather than being 120 mm whatever the stage count
    expect(turnAxis(50).box[2]).toBeGreaterThan(turnAxis(3).box[2]);
  });

  it('a number is read by its dimension, so a speed is never a length and a rate is never a payload', () => {
    // the reader used to be two regexes that knew `mm` and `kg`. They could not tell a length from a speed that
    // contains one, so `300 mm/s` was 300 mm of travel and `1.2 kg/h` a 1.2 kg payload; and any other unit was
    // unseen, so `6 m` silently became the 300 mm default. Quantities come from `findQuantities` with dimensions now.
    expect(readMachine('a camera on a 6 m rail').mm[0], 'six metres is 6000 mm, not the 300 mm default').toBe(6000);
    const fast = readMachine('a gantry that moves a tool at 300 mm/s over 400 x 400 x 400');
    expect(fast.mm, 'a speed is not a travel, whatever digits it holds').toEqual([400, 400, 400]);
    expect(fast.payload, 'nothing here weighs anything').toBe(0);
    const rate = readMachine('a line that makes 1.2 kg/h of filament');
    expect(rate.payload, 'kg per hour is a rate, and a rate is not a mass on a carriage').toBe(0);
    expect(readMachine('an arm that picks up 3 kg').payload).toBe(3);
  });

  it('what the words said and nothing used is computed, not remembered', () => {
    // `notDone` is a set difference: the quantities in the ask minus the quantities a part was sized by. A number the
    // machine ignores can no longer be dropped in silence, because dropping it is exactly what puts it in this list.
    const m = composeMachine('a gantry that moves 25 kg at 1000 mm/s over 2000 x 1000 x 600');
    expect(m.notDone.join(' '), 'the asked speed is met by nothing here and must say so').toMatch(/1000 mm\/s/);
    expect(composeMachine('an arm that reaches 540 mm and picks up 3 kg').notDone.join(' '))
      .not.toMatch(/540|3 kg/);
  });

  it('a machine the ask says this one FOLLOWS is not built into this one, or sold with it', () => {
    // "a camera head ... that follows a print head" gave the camera a hot end, a Bowden tube and a 40 W cartridge,
    // because /print/ matched anywhere in the sentence. Two machines are named and only one is being built.
    const m = composeMachine('a two-axis camera head on a 6 m rail that follows a print head moving at 300 mm/s');
    expect(m.does, 'it sees; it does not print').toContain('see');
    expect(m.does, "the print head is what it follows, not what it is").not.toContain('deposit');
    expect(m.stages.map((s) => s.unit.id).join(' ')).not.toMatch(/hot.?end/i);
    expect(m.notDone.join(' '), 'and the other machine is named as not built, rather than silently dropped').toMatch(/follows a print head/);
  });

  it('a part the library will not draw is fatal to the mass and the price that rest on it', () => {
    // it used to print a mass, a price and a bill beside the refusal, which is the weight of what happened to be
    // drawable wearing the name of the machine.
    const m = composeMachine('a robotic hand that moves along a wall 2000 mm and picks up 1 kg');
    expect(m.gaps.length, 'a 2100 mm MGN12H rail is past the 2000 mm the library draws').toBeGreaterThan(0);
    expect(m.usd, 'no price is honest here').toBeNull();
    expect(m.kg).toBe(0);
    expect(m.refusals.join(' ')).toMatch(/WITHHELD/);
  });

  it('a rail puts the tool on one long slide on brackets, with no frame around it', () => {
    const m = composeMachine('a robotic hand that moves along a wall 2000 mm and picks up 1 kg');
    expect(m.arrange).toBe('rail');
    expect(m.stages.map((s) => s.unit.id).join(' ')).toMatch(/rail-mount-2000/);
    expect(m.stages.filter((s) => s.unit.does === 'slide')).toHaveLength(1);
    // This line used to read `expect(m.refusals).toEqual([])`, and it was asserting a lie. A 2000 mm travel wants a
    // 2100 mm rail, and the library refuses to draw one: `rail MGN12H 2100: length must be 50-2000 mm`. The machine
    // reported a mass, a price and a bill anyway, and the test held the door open for it by demanding silence. A gap
    // is now fatal to the figures that rest on it, so the refusal below is the correct answer and its absence was the
    // fault (docs/MANNY.md #20). What is still checked is that there is exactly ONE refusal and it is that one: a rail
    // must not quietly acquire others.
    // (this asserted exactly one refusal until the belt learned what it may pull: the hand's wrist is a 5.06:1 turn
    // axis whose second stage wants 141 N of a 67.5 N belt, so there are two now and both are real. The check is
    // that each named one is PRESENT, not that no other may appear - a count is a brittle way to say "nothing
    // quietly appears" and it was the first thing to break when a true refusal was added.)
    expect(m.refusals.join(' ')).toMatch(/WITHHELD, not computed/);
    expect(m.refusals.join(' '), 'the wrist cannot be belted and must say so').toMatch(/cannot be made of GT2 belt/);
    expect(m.kg, 'a withheld mass is not a quiet zero dressed as a weight').toBe(0);
    expect(m.usd).toBeNull();
  });
});

describe('an arm is checked by torque, because that is how an arm fails', () => {
  it('each joint is geared to the moment it actually has to hold, not to a number written down', () => {
    const near = composeMachine('an arm that reaches 300 mm and picks up 1kg');
    const far = composeMachine('an arm that reaches 600 mm and picks up 1kg');
    expect(near.joints![0]!.ratio).toBeLessThan(far.joints![0]!.ratio);
    expect(far.joints![0]!.needs).toBeGreaterThan(near.joints![0]!.needs * 1.5);
    for (const m of [near, far]) for (const j of m.joints!) expect(j.holds).toBeGreaterThanOrEqual(j.needs);
  });
  it('a reach a belt-geared NEMA 17 cannot hold is refused with both numbers and a way out', () => {
    const m = composeMachine('an arm that reaches 1200 mm and picks up 3 kg');
    const said = m.refusals.join(' ');
    expect(said).toMatch(/the shoulder has to hold 40\.\d+ N·m/);
    expect(said).toMatch(/counterbalance spring|cycloidal/);
    expect(m.joints![0]!.holds).toBeLessThan(m.joints![0]!.needs);
  });
  it('a joint\'s load is reported in N·m and a stack\'s in kg: one is never printed as the other', () => {
    const m = composeMachine('an arm that reaches 600 mm and picks up 1kg');
    const joint = m.stages.find((s) => s.unit.does === 'turn')!;
    expect(joint.inUnit).toBe('N·m');
    expect(machineText(m)).toMatch(/carries [\d.]+ N·m/);
    expect(composeMachine('a machine that prints 300x300').stages[0]!.inUnit).toBeUndefined();
  });
  it('the shoulder always has more to hold than the elbow', () => {
    const j = composeMachine('an arm that reaches 800 mm and picks up 1kg').joints!;
    expect(j[0]!.needs).toBeGreaterThan(j[1]!.needs);
  });
  it('a gripper that cannot hold the load says so on an arm as well as on a gantry', () => {
    const m = composeMachine('an arm that reaches 400 mm and picks up 5 kg');
    expect(m.refusals.join(' ')).toMatch(/grips 1\.5 kg and was asked to hold 5 kg/);
    expect(m.refusals.join(' ')).not.toMatch(/undefined/);
  });
});

describe('a composed machine is real geometry, not a heap of its parts', () => {
  const use = (w: string) => { const c = component(w); if (typeof c === 'string') throw new Error(c); return structuredClone(c.part); };
  it('every unit lays out its own parts, and none of them is left at the origin in a pile', () => {
    for (const u of [screwAxis(300), beltAxis(300), turnAxis(3), baseFrame(500, 500, 650), armLink(300)]) {
      const parts = layUnit(u, use);
      expect(parts.length, u.id).toBeGreaterThan(2);
      const atOrigin = parts.filter((p) => p.at![0] === 0 && p.at![1] === 0 && p.at![2] === 0);
      expect(atOrigin.length, `${u.id} leaves ${atOrigin.length} parts stacked at 0,0,0`).toBeLessThanOrEqual(1);
    }
  });
  it('a slide puts its rail above its beam and its motor off one end, which is what a slide is', () => {
    const parts = layUnit(screwAxis(300), use);
    const beam = parts.find((p) => /extrusion/i.test(p.name))!, rail = parts.find((p) => /rail|MGN/i.test(p.name))!;
    const motor = parts.find((p) => /stepper|NEMA/i.test(p.name))!;
    expect(rail.at![1]).toBeGreaterThan(beam.at![1]);           // the rail sits on the beam
    expect(Math.abs(motor.at![0])).toBeGreaterThan(0.1);        // the motor is off the end, not in the middle
  });
  it('a frame puts four uprights at its corners', () => {
    const parts = layUnit(baseFrame(600, 400, 500), use);
    const corners = parts.filter((p) => Math.abs(p.at![0]) > 0.25 && Math.abs(p.at![2]) > 0.15);
    expect(corners.length).toBeGreaterThanOrEqual(4);
  });
  it('a gantry turns its second slide across its first, because that is what a gantry is', () => {
    const m = composeMachine('a machine that prints 300x300x400');
    const slides = machineParts(m, use).filter((p) => /axis/.test(p.name));
    expect(slides.length).toBe(3);
    expect(slides[0]!.rot).toBeUndefined();
    expect(slides[1]!.rot?.[1]).toBeCloseTo(Math.PI / 2, 3);     // the second runs across the first
  });
  it('an arm marches its joints along its own links instead of stacking them', () => {
    const m = composeMachine('an arm that reaches 600 mm and picks up 1kg');
    const laid = machineParts(m, use);
    const xs = laid.map((p) => p.at![0]);
    expect(Math.max(...xs)).toBeGreaterThan(0.3);                // it reaches out, it does not pile up
    expect(xs).toEqual([...xs].sort((a, b) => a - b));           // and each one is further out than the last
  });
  it('the whole thing is one part with its units inside it, and it says what it is', () => {
    const p = machinePart(composeMachine('a machine that cuts 400x300x80'), use);
    expect(p.parts!.length).toBeGreaterThan(3);
    expect(p.says).toMatch(/400 × 300 × 80 mm/);
  });
  it('a part the library cannot draw is left out rather than faked, and the machine still stands', () => {
    const p = machinePart(composeMachine('a machine that prints 300x300'), () => { throw new Error('nope'); });
    expect(p.parts!.every((u) => (u.parts ?? []).length === 0)).toBe(true);   // nothing invented to fill the hole
  });
});

// A length of stock is DECLARED z-long and the library hands it back already stood upright, so `layUnit` used to turn
// it twice: a frame's four uprights cancelled to flat, its four depth members stood up, and a rail's beam was drawn on
// end. A near-cube frame looks like a frame however its twelve members are permuted, which is how that survived six
// rounds of being looked at — so the frame is checked by COUNTING directions rather than by looking, and the rail is
// checked at a length where one axis is ten times the others (docs/MANNY.md #46).
describe('stock is laid the way it is drawn, not the way it is declared', () => {
  const use = (w: string): Part => { const c = component(w); if (typeof c === 'string') throw new Error(c); return c.part; };
  /** which way a laid part's longest side really points in the world: 0 x, 1 y, 2 z */
  const runs = (p: Part): number => {
    let b: THREE.Box3 | null = null;
    for (const n of layout(p)) if (n.box) b = b ? b.union(n.box) : n.box.clone();
    const s = b!.getSize(new THREE.Vector3());
    return s.x >= s.y && s.x >= s.z ? 0 : s.y >= s.z ? 1 : 2;
  };

  it('a frame is twelve members, four running along each axis', () => {
    const by = [0, 0, 0];
    for (const q of layUnit(baseFrame(700, 700, 750), use)) by[runs(q)]! += 1;
    expect(by).toEqual([4, 4, 4]);   // measured [0, 8, 4] on the old code: nothing ran along x at all
  });

  it("a 2000 mm rail's beam lies along the travel, not on end", () => {
    const m = composeMachine('a rail-mounted machine that picks things up over 2000 mm carrying 25 kg');
    const beam = layout(machinePart(m, use)).filter((n) => /extrusion/.test(n.p.name ?? '') && n.box)
      .sort((a, b) => b.box!.getSize(new THREE.Vector3()).length() - a.box!.getSize(new THREE.Vector3()).length())[0];
    const s = beam!.box!.getSize(new THREE.Vector3());
    expect(+(s.x * 1000).toFixed(0)).toBeGreaterThan(1900);   // the beam spans the ask's 2000 mm
    expect(s.x).toBeGreaterThan(s.y * 10);                    // and is not standing up in it
    expect(s.x).toBeGreaterThan(s.z * 10);
  });
});

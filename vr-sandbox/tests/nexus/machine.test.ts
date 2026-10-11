// The machine inventor: composing a machine out of what the component library affords, rather than copying a blueprint.
//
// The checks that matter here are the ones that stop a bill of materials from becoming fiction: every part named by a
// unit must be a part the library really draws, every unit's mass must include what it buys whole, and the stacking
// rule must put each load on the thing that actually takes it. Two of these are faults this file's first run had, and
// both are kept as tests so they cannot come back: tools were stacked on each other, so a camera beside a gripper was
// asked to hold the gripper's load; and a payload was added to every stage alike.

import { describe, expect, it } from 'vitest';
import {
  BRAIN, EYE, GRIPPER, HOT_END, SPINDLE, beltAxis, composeMachine, baseFrame, machineText, machineWords,
  readMachine, screwAxis, stack, turnAxis, unitKg, unitUsd, armLink, layUnit, machineParts, machinePart, type Unit,
} from '../../src/nexus/ask/machine';
import { component } from '../../src/nexus/parts/components';
import { machineBuild, throwAt, under3K } from '../../src/nexus/works';

const ALL: Unit[] = [baseFrame(500, 500, 650), screwAxis(300), beltAxis(300), turnAxis(3), HOT_END, SPINDLE, GRIPPER, EYE, BRAIN];

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
  it('a rail puts the tool on one long slide on brackets, with no frame around it', () => {
    const m = composeMachine('a robotic hand that moves along a wall 2000 mm and picks up 1 kg');
    expect(m.arrange).toBe('rail');
    expect(m.stages.map((s) => s.unit.id).join(' ')).toMatch(/rail-mount-2000/);
    expect(m.stages.filter((s) => s.unit.does === 'slide')).toHaveLength(1);
    expect(m.refusals).toEqual([]);
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

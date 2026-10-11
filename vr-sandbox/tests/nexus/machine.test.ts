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
  readMachine, screwAxis, stack, turnAxis, unitKg, unitUsd, type Unit,
} from '../../src/nexus/ask/machine';
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

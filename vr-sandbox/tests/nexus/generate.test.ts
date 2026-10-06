// Generation (src/nexus/generate.ts): what a pipeline makes, worked out offline from laws and the kept data. Each
// number here is checked against its law worked by hand: a plate's thickness from its bending stress, a shaft's
// diameter from its torque, energies from m g h, m c ΔT and ½ I ω², a union's volume counting where walls meet once.

import { describe, expect, it } from 'vitest';
import { Workshop, calc, matterOf, scopeOf, type PartRef } from '../../src/nexus/generate';
import { thermalOf } from '../../src/engineering/thermal';

const bearing: PartRef = { name: 'front bearing 6204 (20×47×14 mm)', at: [0, 0.3, 0], w: 0.047, h: 0.047, d: 0.014, mass: 0.11, r: 0.0235, bore: 0.02, axis: 'z' };
const rail: PartRef = { name: 'frame rail', at: [0, 0.1, 0], w: 0.5, h: 0.02, d: 0.02, mass: 0.4 };
const shop = (seed = 1) => new Workshop({ parts: () => [bearing, rail] }, seed);
const near = (a: number, b: number, rel = 1e-4) => expect(Math.abs(a - b) / Math.abs(b)).toBeLessThan(rel);

describe('reading what is said', () => {
  const sc = scopeOf({ B: 3, D: 4, load: 200 });
  it('numbers carry their units into SI, and expressions read as written', () => {
    expect(calc('40 mm', sc)).toBeCloseTo(0.04); expect(calc('2 kN * 3 m', sc)).toBe(6000); expect(calc('20 N·m', sc)).toBe(20);
    expect(calc('3 * 4 ^ 2', sc)).toBe(48); expect(calc('sqrt(16) + cbrt(27)', sc)).toBe(7); expect(calc('1000 rpm', sc)).toBeCloseTo(104.72, 2);
    expect(calc('if load > 100 N then 6 mm else 4 mm', sc)).toBeCloseTo(0.006); expect(calc('load under 300 N and B is 3', sc)).toBe(true);
  });
  it('calculations as they are typed: BxD, a percentage of a value, degrees in º', () => {
    expect(calc('BxD', sc)).toBe(12); expect(calc('B*D%', sc)).toBeCloseTo(0.12); expect(calc('32º + 22', sc)).toBeCloseTo(22.5585, 4); expect(calc('B²+D²', sc)).toBe(25);
    const w = shop(); w.run('set B = 3'); w.run('set D = 4'); expect(w.run('B x D =')).toMatch(/= 12/); expect(w.run('calc B*D%=')).toMatch(/= 0\.12/); expect(w.value('ans')).toBeCloseTo(0.12);
    expect(w.run('calc B*D = 12')).toMatch(/yes, it holds/);
    // one side = the other, ending in =: each side worked out, and whether they are the same
    expect(w.run('B*D%=32º+22*2=')).toMatch(/^B\*D% = 0\.12 and 32º\+22\*2 = 44\.5585: no, they are not the same/); expect(w.value('ans')).toBeCloseTo(44.5585, 4);
  });
  it('says what it does not know, and what it does', () => {
    expect(() => calc('happiness * 2', sc)).toThrow(/I do not know "happiness": I know B, D, load/);
    expect(() => matterOf('unobtanium')).toThrow(/I know no matter "unobtanium"\. I know steel/);
  });
});

describe('making things, sized by what is required', () => {
  it('a plate put on a bearing covers it and sits on it; sized by its bending law, it is as thick as the law asks', () => {
    const w = shop();
    w.run('set load = 200 N'); w.run('material aluminium');
    expect(w.run('place plate named cap on bearing')).toMatch(/Placed cap: plate 47 mm × 14 mm × 1\.4 mm of Aluminium 6061-T6/);
    // a plate across a bearing as a beam on two supports, loaded at its middle: σ = 3 F L / (2 b h²), at half its yield
    w.run('size cap.h so 3 * load * cap.w / (2 * cap.d * cap.h^2) <= cap.yield / 2');
    const h = Math.sqrt((3 * 200 * 0.047) / (2 * 0.014 * (276e6 / 2)));
    near(w.value('cap.h'), h, 1e-6); near(w.value('cap.bottom'), 0.3 + 0.0235, 1e-9);
    // the law is kept: a load set again sizes it again; a condition that chooses steel sizes it by steel
    w.run('set load = 800 N'); near(w.value('cap.h'), 2 * h, 1e-6);
    // what is made keeps the matter it was made of: a condition says which, for the cap
    w.run('if load > 500 N then material steel for cap else material aluminium for cap');
    near(w.value('cap.h'), Math.sqrt((3 * 800 * 0.047) / (2 * 0.014 * (250e6 / 2))), 1e-6);
    near(w.value('cap.mass'), 7850 * 0.047 * 0.014 * w.value('cap.h'), 1e-9);
  });
  it('a shaft put through a bearing takes its bore and lies along its axis; sized by its torque, it is as thick as the law asks', () => {
    const w = shop();
    expect(w.run('place shaft named axle through bearing')).toMatch(/axle: shaft 20 mm × 60 mm/);
    expect(w.value('axle.d')).toBeCloseTo(0.06); expect(w.value('axle.w')).toBeCloseTo(0.02);
    w.run('set torque = 20 N·m');
    w.run('size axle.D so 16 * torque / (pi * axle.D^3) <= axle.yield / 3');
    near(w.value('axle.D'), Math.cbrt((16 * 20) / (Math.PI * (276e6 / 3))), 1e-6);
  });
  it('no size that makes the law hold is said so, and nothing is changed', () => {
    const w = shop(); w.run('place plate named p on bearing');
    expect(() => w.run('size p.h so p.h > 20 m')).toThrow(/No size of p\.h from 0\.1 mm to 10 m/);
    expect(w.value('p.h')).toBeCloseTo(0.0014);
  });
  it('a part it is placed by must be there, and the parts that are are named', () => {
    expect(() => shop().run('place plate on gearbox')).toThrow(/no "gearbox" here.*named front, frame/);
  });
});

describe('energy, by its law', () => {
  it('to lift, heat, spin and move a thing takes what the law says', () => {
    const w = shop(); w.run('place block named b size 100 x 100 x 100 mm'); const m = 2700 * 1e-3;
    expect(w.run('energy lift b 1 m')).toMatch(/takes 26\.4\d* J: E = m g h/); near(w.value('energy'), m * 9.80665, 1e-9);
    w.run('energy heat b 10 K'); near(w.value('energy'), m * thermalOf(matterOf('aluminium')).c * 10, 1e-9);
    w.run('place disc named fly size 100 mm x 10 mm'); w.run('energy spin fly 3000 rpm');
    const mf = 2700 * Math.PI * 0.05 ** 2 * 0.01, wv = (3000 * 2 * Math.PI) / 60; near(w.value('energy'), 0.5 * (0.5 * mf * 0.05 ** 2) * wv * wv, 1e-9);
    w.run('energy move b 2 m/s'); near(w.value('energy'), 0.5 * m * 4, 1e-9);
  });
});

describe('placing, turning, flipping, stretching', () => {
  it('every side of a thing, and an offset from it', () => {
    const w = shop(); w.run('place cube named c size 10 mm');
    for (const [side, x, y, z] of [['left of', -0.0235 - 0.01 - 0.005, 0.3, 0], ['right of', 0.0235 + 0.01 + 0.005, 0.3, 0], ['in front of', 0, 0.3, 0.007 + 0.01 + 0.005], ['behind', 0, 0.3, -0.007 - 0.01 - 0.005], ['under', 0, 0.3 - 0.0235 - 0.005, 0]] as const) {
      w.run(`move c ${side} bearing`); expect([w.value('c.x'), w.value('c.y'), w.value('c.z')].map((v) => +v.toFixed(6))).toEqual([x, y, z].map((v) => +v.toFixed(6)));
    }
    w.run('move c from bearing by 10 mm, 20 mm, 30 mm'); expect([w.value('c.x'), w.value('c.y'), w.value('c.z')].map((v) => +v.toFixed(6))).toEqual([0.01, 0.32, 0.03]);
  });
  it('turned any angle about x, y and z: its box turns with it', () => {
    const w = shop(); w.run('place bar named b at 0, 0, 0 size 100 x 10 x 20 mm');
    w.run('rotate b 90 about z'); expect(w.value('b.w')).toBeCloseTo(0.02); expect(w.value('b.h')).toBeCloseTo(0.1);
    w.run('rotate b to x 0 y 45 z 0'); expect(w.value('b.w')).toBeCloseTo((0.1 + 0.01) / Math.SQRT2);
    w.run('rotate b x 360'); expect(w.value('b.w')).toBeCloseTo((0.1 + 0.01) / Math.SQRT2);
  });
  it('flipped across an axis its place mirrors; a mirrored copy follows the first one\'s sizes', () => {
    const w = shop(); w.run('place ball named a at 100 mm, 0.2 m, 50 mm size 20 mm');
    w.run('flip a x'); expect(w.value('a.x')).toBeCloseTo(-0.1); expect(w.value('a.z')).toBeCloseTo(0.05);
    w.run('mirror a z named a2'); expect(w.value('a2.z')).toBeCloseTo(-0.05); expect(w.value('a2.x')).toBeCloseTo(-0.1);
    w.run('a.D = 30 mm'); expect(w.value('a2.D')).toBeCloseTo(0.03);
  });
  it('expanded and shrunk along x, y or z, by a length, a percentage, a factor or to a length', () => {
    const w = shop(); w.run('place block named b at 0, 0, 0 size 100 x 50 x 20 mm');
    w.run('expand b x by 20 mm'); expect(w.value('b.w')).toBeCloseTo(0.12);
    w.run('shrink b y by 50%'); expect(w.value('b.h')).toBeCloseTo(0.01);
    w.run('stretch b z to 200 mm'); expect(w.value('b.d')).toBeCloseTo(0.2);
    w.run('place post named p at 0, 0, 0 size 20 x 100 mm'); w.run('stretch p y to 300 mm'); expect(w.value('p.h')).toBeCloseTo(0.3); expect(w.value('p.D')).toBeCloseTo(0.02);
    // a ball stretched one way is no longer a ball: its volume is still known, its area is said not to be
    w.run('place ball named o at 1 m, 0, 0 size 40 mm'); const v0 = w.value('o.volume');
    expect(w.run('expand o x by 2')).toMatch(/its area is not known exactly \(its volume is\)/); expect(w.value('o.volume')).toBeCloseTo(2 * v0); expect(w.value('o.w')).toBeCloseTo(0.08);
  });
});

describe('joined into one piece', () => {
  it('two walls that meet at a corner are one piece: where they meet is counted once, exactly', () => {
    const w = shop(); w.run('material concrete');
    w.run('place wall named a at 0, 1 m, 0 size 1000 x 100 x 2000 mm'); w.run('place wall named b at 450 mm, 1 m, 450 mm size 100 x 1000 x 2000 mm');
    expect(w.run('join a and b as walls')).toMatch(/Joined a \+ b as walls, one piece/);
    near(w.value('walls.volume'), 0.2 + 0.2 - 0.02, 1e-9); near(w.value('walls.mass'), matterOf('concrete').density * 0.38, 1e-9);
    // moved and turned as one
    w.run('move walls by 0, 0, 1 m'); expect(w.value('a.z')).toBeCloseTo(1); expect(w.value('b.z')).toBeCloseTo(1.45);
    const before = [w.value('walls.w'), w.value('walls.d')]; w.run('rotate walls 90 about y'); expect([w.value('walls.w'), w.value('walls.d')].map((v) => +v.toFixed(6))).toEqual([before[1]!, before[0]!].map((v) => +v.toFixed(6)));
    near(w.value('walls.volume'), 0.38, 1e-9);
    // stretched as one, about its middle
    w.run('expand walls y by 2'); expect(w.value('walls.h')).toBeCloseTo(4); near(w.value('walls.volume'), 0.76, 1e-9);
    expect(w.run('split walls')).toMatch(/stand apart again/);
  });
  it('a shape placed joined to another becomes one piece with it; a piece of round things is sampled, and says how near', () => {
    const w = shop(); w.run('place ball named a at 0, 0, 0 size 100 mm'); const r = w.run('place ball named b at 50 mm, 0, 0 size 100 mm joined to a');
    expect(r).toMatch(/Joined a \+ b as a_b.*sampled at 40 000 points, within/);
    // two unit spheres a radius apart: 2 V − the lens 5π r³ / 12
    const R = 0.05, exact = 2 * ((4 / 3) * Math.PI * R ** 3) - (5 * Math.PI * R ** 3) / 12;
    expect(Math.abs(w.value('a_b.volume') - exact) / exact).toBeLessThan(0.02);
  });
});

describe('many pipelines in one room', () => {
  it('what is made keeps the matter it was made of; a matter said for a thing, or a piece, changes it', () => {
    const w = shop(); w.run('material concrete'); w.run('place wall named w1 at 1 m, 1 m, 0 size 1000 x 100 x 2000 mm'); w.run('place wall named w2 at 1.45 m, 1 m, 450 mm size 100 x 1000 x 2000 mm');
    expect(w.run('material steel')).toMatch(/for what is made from here; what is made already keeps its own/);
    near(w.value('w1.mass'), 2400 * 0.2, 1e-9); w.run('place cube named c at 0, 1 m, 0 size 100 mm'); near(w.value('c.mass'), 7850 * 1e-3, 1e-9);
    w.run('join w1 and w2 as walls'); expect(w.run('material brick for walls')).toMatch(/^w1, w2 now of /);
    near(w.value('w1.mass'), matterOf('brick').density * 0.2, 1e-9); near(w.value('c.mass'), 7850 * 1e-3, 1e-9);
  });
  it('a thing said nowhere goes on the floor beside the build, clear of what was made before it; turned, it stays', () => {
    const w = shop(); w.run('place cube named big at 0.4 m, 0.2 m, 0 size 300 mm');
    w.run('place plate named p size 200 x 200 x 10 mm'); expect(w.holds('overlap(p, big) = 0')).toBe(true); expect(w.holds('overlap(p, frame_rail) = 0')).toBe(true);
    const x = w.value('p.x'); w.run('rotate p y 40'); near(w.value('p.x'), x, 1e-12);
    // what sits on it is not in its way, so a pipeline run again puts it back where it was
    w.run('place cube named top on p'); w.run('place plate named p size 200 x 200 x 10 mm'); near(w.value('p.x'), x, 1e-12);
    // and what is made after it, or made again, never moves it
    w.run('place cube named big at 0.4 m, 0.2 m, 0 size 300 mm'); near(w.value('p.x'), x, 1e-12);
  });
  it("a pipeline's rule holds over what it makes, not over what another makes; run again, a pipeline makes the same", () => {
    const w = shop(5), walls = ['material concrete', 'place wall named w1 at 1.6 m, 1 m, 0 size 1000 x 100 x 2000 mm', 'place wall named w2 at 2.05 m, 1 m, 450 mm size 100 x 1000 x 2000 mm', 'join w1 and w2 as walls', 'rotate walls 30 about y'];
    w.run('rule no overlap', 'other'); w.run('place cube named c at 1.6 m, 1 m, 0 size 50 mm', 'mine');
    // two walls that meet before they are joined: another pipeline's rule is not theirs
    for (const round of [1, 2]) { for (const t of walls) w.run(t, 'walls'); near(w.value('w1.ry'), Math.PI / 6, 1e-12); expect(w.joined().map((j) => j.members.join())).toEqual(['w1,w2']); void round; }
    expect(() => w.run('place cube named d at 1.6 m, 1 m, 0 size 50 mm', 'other')).toThrow(/That would break the rules?: c and d overlap/);
  });
  it('split, each stays where its piece had it; made anew, what stood on it goes with it', () => {
    const w = shop(); w.run('place wall named w1 at 1.6 m, 1 m, 0 size 1000 x 100 x 2000 mm'); w.run('place wall named w2 at 2.05 m, 1 m, 450 mm size 100 x 1000 x 2000 mm'); w.run('join w1 and w2 as walls'); w.run('rotate walls 30 about y');
    const x = w.value('w1.x'); w.run('split walls'); near(w.value('w1.x'), x, 1e-12); near(w.value('w1.ry'), Math.PI / 6, 1e-12);
    w.run('place plate named base at 0, 0.5 m, 0 size 300 x 300 x 10 mm'); w.run('place cube named top on base');
    expect(w.run('place plate named base at 0, 0.5 m, 0 size 200 x 200 x 10 mm')).toMatch(/Made anew base: .*\(what stood on the one before, top, went with it\)/); expect(w.all().made.some((m) => m.name === 'top')).toBe(false);
  });
  it('things are connected only where they touch, and held by what can hold them; a group is moved as one but not held', () => {
    const w = shop(); w.run('material steel'); w.run('place cube named a at 0, 1 m, 0 size 100 mm'); w.run('place cube named b at 100 mm, 1 m, 0 size 100 mm');
    w.run('place cube named far at 0.5 m, 1 m, 0 size 100 mm');
    expect(() => w.run('join a and far as x')).toThrow(/far does not touch the rest of x: things are connected only where they touch \(the nearest, a and far, are 400 mm apart\)/);
    expect(w.run('join a and b as ab')).toMatch(/one piece: fused a–b \(both are iron at base\)/);
    // steel to aluminium touching: they do not fuse, so the strongest adhesive that holds both holds them
    w.run('place cube named c of aluminium at 200 mm, 1 m, 0 size 100 mm');
    expect(() => w.run('fuse b and c')).toThrow(/b and c cannot be fused: molten iron and aluminium do not dissolve in each other/);
    expect(w.run('join ab and c')).toMatch(/glued with Structural epoxy \(24 h\) b–c \(they do not fuse: molten .* 25 MPa in lap shear/);
    expect(w.run('group a and far as loose')).toMatch(/nothing holds them together/);
  });
  it('a standing action: steps as one, every size worked out from what it is given, by its law, with its conditions', () => {
    const w = shop(); w.run('place cube named m at 0, 0.8 m, 0 size 100 mm'); w.run('place plate named deck at 0, 0.4 m, 0 size 600 x 600 x 20 mm');
    const said = w.run('mount m on deck');
    // the plate: 100 mm + 2 × max(10 mm, 15 mm) each way; as thick as m's weight bends it, at half yield, but not under 2 mm
    expect(w.value('m_mount.w')).toBeCloseTo(0.13); expect(w.value('m_mount.h')).toBeCloseTo(0.002, 6);
    expect(said).toMatch(/^mount m, deck: 9 steps\./); expect(w.joined().find((j) => j.name === 'm_mounted')!.members).toEqual(['m', 'm_mount', 'deck']);
    near(w.value('m_mount.bottom'), w.value('deck.top'), 1e-9); near(w.value('m.bottom'), w.value('m_mount.top'), 1e-9);
    // heavier than 20 kg: the mount is steel, and the law sizes it again by steel's yield and its load
    const v = shop(); v.run('place cube named big of steel at 0, 1 m, 0 size 300 mm'); v.run('set big_load = 20 kN'); v.run('mount big');
    const F = 0.3 ** 3 * 7850 * 9.80665 + 20000, Lw = v.value('big_mount.w'), b = v.value('big_mount.d');
    near(v.value('big_mount.h'), Math.sqrt((3 * F * Lw) / (2 * b * (250e6 / 2))), 1e-3); expect(v.value('big_mount.density')).toBe(7850);
    // with concrete the matter in hand, a mount is aluminium all the same: concrete does not hold a bolt
    const c = shop(); c.run('material concrete'); c.run('place cube named q of steel at 0, 1 m, 0 size 100 mm'); c.run('mount q'); expect(c.value('q_mount.density')).toBe(2700);
    // and what is itself too soft for a bolt cannot be mounted by one: it says so
    c.run('place cube named soft at 1 m, 1 m, 0 size 100 mm'); expect(() => c.run('mount soft')).toThrow(/Concrete C30 is too soft to hold a bolt \(it yields at 3 MPa\)/);
  });
  it('support: as many legs as its size asks, each sized by buckling and yield; your own action, called the same way', () => {
    const w = shop(); w.run('place box named slab at 0, 1 m, 0 size 1500 x 600 x 40 mm'); w.run('support slab');
    expect(w.joined().find((j) => j.name === 'slab_stand')!.members).toHaveLength(7);
    // each leg carries a sixth of the weight over 0.98 m: Euler with a factor 3 sets its diameter
    const P = 1.5 * 0.6 * 0.04 * 2700 * 9.80665 / 6, L = 0.98, D = ((P * 3 * L * L * 64) / (Math.PI ** 3 * 68.9e9)) ** 0.25;
    near(w.value('slab_legD'), Math.max(D, 0.005), 1e-3); expect(w.value('slab_leg1.bottom')).toBeCloseTo(0, 9);
    const f = shop(); f.run('place cube named low at 1 m, 25 mm, 0 size 50 mm'); expect(() => f.run('support low')).toThrow(/support stopped at step 3 .*: low stands on the floor already, so there is nothing under it to support/);
    expect(w.run('action riser {X}: place plate named {X}_riser under {X}; join {X} and {X}_riser')).toMatch(/called as "riser \{X\}"/);
    w.run('place cube named k at 2 m, 1 m, 0 size 50 mm'); expect(w.run('riser k')).toMatch(/^riser k: 2 steps/);
    expect(() => w.run('action place {X}: report')).toThrow(/"place" is a call already/);
    expect(() => w.run('riser')).toThrow(/riser is called as "riser \{X\}": say what \{X\} is/);
    // a name with "to" in it is one name: "size rotor_disc.h so …" is not "size ro to r_disc.h"
    w.run('place plate named rotor_disc at 3 m, 1 m, 0 size 100 x 100 x 5 mm'); expect(w.run('size rotor_disc.h so rotor_disc.mass > 100 g')).toMatch(/^Sized rotor_disc's h to 3\.7\d* mm/);
  });
  it('things turned are judged as they stand, not by the boxes round them', () => {
    const w = shop(); w.run('place cube named a at 0, 1 m, 0 size 100 mm turned y 45');
    // a's box round it reaches 70.7 mm out, into b's; a itself, a diamond, stops at x + z = 70.7 mm, short of b's corner at 80 mm
    w.run('place cube named b at 90 mm, 1 m, 90 mm size 100 mm'); expect(w.holds('overlap(a, b) = 0')).toBe(true);
    w.run('move b to 70 mm, 1 m, 70 mm'); expect(w.holds('overlap(a, b) = 1')).toBe(true);
  });
  it('scattered again, fewer: the copies of the last scatter are gone', () => {
    const w = shop(3); w.run('place plate named base at 0, 0.5 m, 0 size 400 x 400 x 10 mm'); w.run('place peg named peg size 8 x 20 mm');
    w.run('scatter peg 9 on base'); expect(w.all().made.filter((m) => /^peg/.test(m.name))).toHaveLength(9);
    w.run('scatter peg 3 on base'); expect(w.all().made.filter((m) => /^peg/.test(m.name))).toHaveLength(3);
  });
});

describe('rules, patterns and chance', () => {
  it('a step that would break a rule is undone, and says which', () => {
    const w = shop(); w.run('rule no overlap'); w.run('place cube named a at 0, 1 m, 0 size 100 mm');
    expect(() => w.run('place cube named b at 50 mm, 1 m, 0 size 100 mm')).toThrow(/break the rule: a and b overlap\. Undone/);
    expect(w.facts().made).toBe(1);
    w.run('rule a.mass under 3 kg'); expect(() => w.run('expand a x by 2')).toThrow(/a\.mass under 3 kg does not hold/); expect(w.value('a.w')).toBeCloseTo(0.1);
  });
  it('a pattern along a line and round an axis; copies follow the first', () => {
    const w = shop(); w.run('place pin named p at 0.1 m, 0, 0 size 4 x 20 mm');
    w.run('pattern p 4 along x 20 mm'); expect(w.value('p_4.x')).toBeCloseTo(0.16);
    w.run('place pin named q from bearing by 15 mm, 0, 0 size 3 x 10 mm'); w.run('pattern q 4 round bearing');
    // round the bearing's axis (z): a quarter turn puts the second straight above its middle
    expect(w.value('q_2.x')).toBeCloseTo(0); expect(w.value('q_2.y')).toBeCloseTo(0.315);
    w.run('p.D = 6 mm'); expect(w.value('p_3.D')).toBeCloseTo(0.006);
  });
  it('scattered at random over a thing: every one on it, none overlapping; the same seed makes the same', () => {
    const run = (seed: number) => { const w = shop(seed); w.run('place plate named base at 0, 1 m, 0 size 400 x 400 x 10 mm'); w.run('place peg named g size 10 x 20 mm'); w.run('scatter g 12 on base turned randomly'); return w; };
    const w = run(7), f = w.facts();
    expect(f.made).toBe(13);
    for (let i = 1; i <= 12; i++) { const n = i === 1 ? 'g' : `g_${i}`; expect(f[`${n}.y`]! - 0.01).toBeCloseTo(1.005); expect(Math.abs(f[`${n}.x`]!)).toBeLessThanOrEqual(0.2); }
    for (let i = 1; i <= 12; i++) for (let j = i + 1; j <= 12; j++) { const a = i === 1 ? 'g' : `g_${i}`, b = `g_${j}`; expect(w.value(`overlap(${a}, ${b})`)).toBe(0); }
    expect(run(7).facts()['g_5.x']).toBe(f['g_5.x']); expect(run(8).facts()['g_5.x']).not.toBe(f['g_5.x']);
  });
  it('random values, picks and chances are drawn from the seed and written into the step', () => {
    const a = shop(3), b = shop(3);
    a.run('set w = random(10 mm, 40 mm)'); b.run('set w = random(10 mm, 40 mm)'); expect(a.value('w')).toBe(b.value('w')); expect(a.value('w')).toBeGreaterThanOrEqual(0.01);
    expect(a.run('material one of steel, brass, copper')).toMatch(/Matter: (Structural steel|Brass|Copper)/);
    a.run('set n = randint(1, 6)'); expect(Number.isInteger(a.value('n'))).toBe(true);
  });
  it('spatial reads between things: gap, distance, overlap, inside', () => {
    const w = shop(); w.run('place cube named a at 0, 1 m, 0 size 100 mm'); w.run('place cube named b at 300 mm, 1 m, 0 size 100 mm');
    expect(w.value('gap(a, b)')).toBeCloseTo(0.2); expect(w.value('dist(a, b)')).toBeCloseTo(0.3); expect(w.holds('overlap(a, b) = 0')).toBe(true);
    w.run('place cube named c at 0, 1 m, 0 size 20 mm'); expect(w.holds('inside(c, a)')).toBe(true);
    expect(w.run('if gap(a, b) > 100 mm then set wide = 1')).toMatch(/yes, so wide = 1/);
  });
});

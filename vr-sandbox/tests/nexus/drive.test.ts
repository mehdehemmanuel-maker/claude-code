// A drive is three files that have to agree about one machine. These tests are written so that the fault they
// catch is the fault of DISAGREEMENT: each number that both sides can compute is computed on both sides and the
// two are compared, rather than either being checked against the formula that produced it.
//
// The one that earned its place: gears.ts's `turn[].ratio` is the TORQUE multiplication and the speed ratio is
// its reciprocal, so the first version of drive.ts read a 3:1 reduction as a 3:1 overdrive and multiplied the
// big wheel's inertia by nine where it should have divided. Every number still looked plausible on its own —
// a speed, a current, a settling point — and the drive simply took 70 times too long to spin up.
import { describe, expect, it } from 'vitest';
import {
  contourJ, driveLine, fanLoad, freeSpeed, gearSpin, inertialLoad, motorSource, netTorque, rigInertia,
  settle, shaftInBore, spinUp, steadyLoad, trainGearing, type Rig,
} from '../../src/nexus/parts/drive';
import { MESH_EFFICIENCY, train, type GearCut, type Placed } from '../../src/nexus/parts/gears';
import { asGeometry, gearMaterial, toothHolds } from '../../src/nexus/parts/drive';
import { meshEfficiency, toothTorque } from '../../src/engineering/gears';
import { getMaterial } from '../../src/data/materials';
import { MOTORS } from '../../src/data/motors';

const MOTOR = MOTORS['motor.dc.coreless.d40-150w-24v']!;
const cut = (z: number, bore = 0.006): GearCut => ({ m: 0.002, z, b: 0.008, bore, matter: 'steel-low' });
/** 20T driving 60T: centres are m(z1+z2)/2 = 2·80/2 = 80 mm. */
const PAIR: Placed[] = [{ id: 'pinion', gear: cut(20), at: [0, 0] }, { id: 'wheel', gear: cut(60), at: [0.08, 0] }];

describe('a gear spins like the shape it actually is', () => {
  it('a polygon of a circle gives the disc its textbook inertia', () => {
    const R = 0.05, n = 4000;
    const pts: [number, number][] = Array.from({ length: n }, (_, i) => [R * Math.cos((2 * Math.PI * i) / n), R * Math.sin((2 * Math.PI * i) / n)]);
    const { area, J } = contourJ(pts);
    expect(area).toBeCloseTo(Math.PI * R * R, 6);
    // J = ∫r²dA = πR⁴/2, which with ρb in front is the ½mR² of every textbook
    expect(J / ((Math.PI * R ** 4) / 2)).toBeCloseTo(1, 5);
  });

  it('is never heavier or harder to spin than the solid disc of its own tip circle', () => {
    for (const z of [12, 20, 40, 60]) {
      const g = cut(z), s = gearSpin(g);
      const ra = (g.m * z) / 2 + g.m, solid = 7850 * g.b * Math.PI * ra * ra;
      expect(s.mass, `${z}T`).toBeLessThan(solid);
      expect(s.mass, `${z}T`).toBeGreaterThan(0.5 * solid); // and it is a gear, not a spider
      expect(s.inertia, `${z}T`).toBeLessThan(0.5 * solid * ra * ra);
    }
  });

  it('a bore takes away inertia, and more of it than it takes away mass', () => {
    const solid = gearSpin({ ...cut(40), bore: 0 }), bored = gearSpin(cut(40, 0.012));
    expect(bored.mass).toBeLessThan(solid.mass);
    expect(bored.inertia).toBeLessThan(solid.inertia);
    // the metal a bore removes is all near the axis, so it was carrying little of the inertia: the inertia must
    // fall by a SMALLER fraction than the mass, and a sign error in the hole subtraction breaks this at once
    const dm = 1 - bored.mass / solid.mass, dJ = 1 - bored.inertia / solid.inertia;
    expect(dJ).toBeLessThan(dm);
    expect(dJ).toBeGreaterThan(0);
  });
});

describe('the reduction goes the way a reduction goes', () => {
  it('a small gear driving a big one turns it slower and harder', () => {
    const g = trainGearing(PAIR, 'pinion', 'wheel');
    if (typeof g === 'string') throw new Error(g);
    expect(Math.abs(g.ratio)).toBeCloseTo(1 / 3, 9); // the wheel turns a third as often
    expect(g.ratio).toBeLessThan(0); // and the other way round
    expect(g.meshes).toBe(1);
    expect(g.efficiency).toBeCloseTo(MESH_EFFICIENCY, 12);
  });

  it('the deeper the reduction, the less the load is felt at the driver — which is what one is for', () => {
    const shallow = trainGearing([{ id: 'a', gear: cut(30), at: [0, 0] }, { id: 'b', gear: cut(40), at: [0, 0.07] }], 'a', 'b');
    const deep = trainGearing([{ id: 'a', gear: cut(18), at: [0, 0] }, { id: 'b', gear: cut(90), at: [0, 0.108] }], 'a', 'b');
    if (typeof shallow === 'string') throw new Error(shallow);
    if (typeof deep === 'string') throw new Error(deep);
    const load = steadyLoad('out', 1);
    const felt = (g: typeof deep) => (load.torqueAt(0) * Math.abs(g.ratio)) / g.efficiency;
    expect(felt(deep)).toBeLessThan(felt(shallow));
    // AND the LOAD's inertia is referred down by the square of the ratio, which is the half a ratio alone misses
    const J = 0.01;
    expect(J * deep.ratio ** 2).toBeLessThan(J * shallow.ratio ** 2);

    // A REDUCTION IS NOT FREE, and this assertion was the other way round until the numbers said otherwise: the
    // train's OWN gears get bigger as the ratio deepens, and a 90-tooth wheel's inertia referred back through 5:1
    // beats the whole of a 30/40 pair referred through 1.33:1 — inertia goes as the fourth power of the radius
    // and only the square of the ratio works against it. So a deep reduction makes the load easy to move and the
    // gearbox itself hard, and which wins is a question only the real geometry answers.
    expect(deep.inertia).toBeGreaterThan(shallow.inertia);
  });

  it('an idler costs a mesh without changing the ratio', () => {
    const direct = trainGearing([{ id: 'a', gear: cut(20), at: [0, 0] }, { id: 'c', gear: cut(20), at: [0.04, 0] }], 'a', 'c');
    const idled = trainGearing([
      { id: 'a', gear: cut(20), at: [0, 0] }, { id: 'b', gear: cut(20), at: [0.04, 0] }, { id: 'c', gear: cut(20), at: [0.08, 0] },
    ], 'a', 'c');
    if (typeof direct === 'string') throw new Error(direct);
    if (typeof idled === 'string') throw new Error(idled);
    expect(Math.abs(idled.ratio)).toBeCloseTo(Math.abs(direct.ratio), 9);
    expect(idled.meshes).toBe(2);
    expect(idled.efficiency).toBeLessThan(direct.efficiency);
    expect(idled.ratio).toBeGreaterThan(0); // two meshes put it back the first way round
    expect(direct.ratio).toBeLessThan(0);
    // the idler spins too, so it is harder to accelerate even though it changes nothing about the ratio
    expect(idled.inertia).toBeGreaterThan(direct.inertia);
  });
});

describe('the gear train and the motor agree about the same machine', () => {
  // THE DECISIVE ONE. gears.ts works the output torque out its own way — walking the mesh tree, multiplying the
  // torque ratio at each step and taking MESH_EFFICIENCY off as it goes. drive.ts never looks at that number: it
  // takes the motor's real torque curve and refers the load back through the ratio and the path's efficiency.
  // Two routes to one quantity. If they disagree, one of them is wrong, and no test of either alone would say so.
  it('the torque the train says comes out is the torque the motor puts in through the ratio', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.3) });
    expect(d.rig.faults).toEqual([]);
    const s = d.settled;
    expect(s.stalled).toBe(false);
    // what gears.ts makes of the motor's actual shaft torque, by its own walk
    const byTrain = train(PAIR, 'pinion', 0, s.torque, s.rpm).turn['wheel']!;
    expect(byTrain.torque).toBeGreaterThan(s.torque); // a reduction multiplies torque, or nothing here is right
    // and what drive.ts makes of it, which never consults the line above
    const byDrive = (s.torque / Math.abs(d.gearing!.ratio)) * d.gearing!.efficiency;
    expect(byDrive).toBeCloseTo(byTrain.torque, 9);
    // the speeds too, from the two different directions
    expect(Math.abs(byTrain.rpm)).toBeCloseTo(Math.abs(s.outRpm), 6);
  });

  it('at the operating point the load really is balanced, by the definition neither module holds', () => {
    for (const T of [0.01, 0.05, 0.2, 0.5]) {
      const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', T) });
      if (d.settled.stalled) continue;
      expect(Math.abs(netTorque(d.rig, d.settled.w)), `${T} N·m`).toBeLessThan(1e-9);
    }
  });

  it('power out is power in less the teeth, and never more', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.3) });
    const s = d.settled;
    expect(s.powerOut).toBeLessThan(s.powerIn);
    expect(s.powerOut / s.powerIn).toBeCloseTo(d.gearing!.efficiency, 6);
  });
});

describe('what it does over time, which an operating point cannot say', () => {
  it('a spin-up ends where the operating point says it does', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.2) });
    const s = spinUp(d.rig, 1);
    expect(s.reached).toBeGreaterThan(0.999);
    expect(s.rpm[s.rpm.length - 1]!).toBeCloseTo(d.settled.rpm, 1);
  });

  it('energy is conserved over the spin-up: what went in came out, went into the teeth, or is in the spin', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.15) });
    const r = d.rig, J = rigInertia(r), n = r.gearing!.ratio, eta = r.gearing!.efficiency;
    const seconds = 0.6, steps = 20000, dt = seconds / steps;
    let w = 0, shaftWork = 0, loadWork = 0, teeth = 0;
    for (let i = 0; i < steps; i++) {
      const Tm = r.source.torqueAt(w), Tl = r.load.torqueAt(n * w);
      const referred = (Tl * Math.abs(n)) / eta;
      shaftWork += Tm * w * dt;                       // the motor's shaft does this much
      loadWork += Math.abs(Tl * n * w) * dt;          // the load absorbs this much
      teeth += (referred - Tl * Math.abs(n)) * w * dt; // and the meshes eat the difference
      const k2 = (r.source.torqueAt(Math.max(0, w + (((Tm - referred) / J) * dt) / 2)) - (r.load.torqueAt(n * Math.max(0, w + (((Tm - referred) / J) * dt) / 2)) * Math.abs(n)) / eta) / J;
      w = Math.max(0, w + k2 * dt);
    }
    const spinEnergy = 0.5 * J * w * w;
    expect(shaftWork).toBeGreaterThan(0);
    // the shaft's work must be exactly the load's work, the teeth's losses, and what is left turning
    expect((loadWork + teeth + spinEnergy) / shaftWork).toBeCloseTo(1, 4);
  });

  it('a flywheel takes longer to come up than a bare shaft, and settles at the same speed', () => {
    const base = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: inertialLoad('out', 0) });
    const heavy = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: inertialLoad('out', 0.02) });
    expect(rigInertia(heavy.rig)).toBeGreaterThan(rigInertia(base.rig));
    expect(spinUp(heavy.rig, 4).rise).toBeGreaterThan(spinUp(base.rig, 4).rise);
    expect(heavy.settled.rpm).toBeCloseTo(base.settled.rpm, 6); // nothing holds either back at the end
  });

  it("a fan's square law settles somewhere a constant torque never would", () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: fanLoad('out', 4e-5) });
    const s = d.settled;
    expect(s.stalled).toBe(false);
    // the whole point of a law rather than a number: the load it ends up taking is one the caller never said
    expect(s.outTorque).toBeGreaterThan(0);
    expect(s.outTorque).toBeCloseTo(4e-5 * s.outW * s.outW, 9);
    // and it starts from nothing, so it can never stall from rest however small the motor
    expect(netTorque(d.rig, 0)).toBeGreaterThan(0);
  });
});

describe('every way a drive is wrong, said rather than assumed', () => {
  it('refuses a motor whose shaft will not go in the gear it is meant to drive', () => {
    const tight: Placed[] = [{ id: 'pinion', gear: cut(20, 0.003), at: [0, 0] }, { id: 'wheel', gear: cut(60), at: [0.08, 0] }];
    const d = driveLine({ motor: MOTOR, places: tight, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.1) });
    expect(d.rig.faults.join(' ')).toMatch(/does not enter/);
    expect(d.fit).toBeNull();
  });

  it('names a loose bore as not driving anything, and a blank as a blank', () => {
    expect(shaftInBore(0.006, 0.01)).toMatch(/loose/);
    expect(shaftInBore(0.006, 0)).toMatch(/no bore/);
    const ok = shaftInBore(0.006, 0.006);
    expect(typeof ok).not.toBe('string');
  });

  it('says it does not turn, instead of reporting a speed, when the load is past stalling', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 40) });
    expect(d.settled.stalled).toBe(true);
    expect(d.settled.rpm).toBe(0);
    expect(d.settled.says).toMatch(/does not turn/);
    expect(spinUp(d.rig, 1).rpm.every((x) => x === 0)).toBe(true);
  });

  it('a gear placed where nothing reaches it is reported, not silently left out', () => {
    const lonely: Placed[] = [...PAIR, { id: 'orphan', gear: cut(20), at: [0.4, 0.4] }];
    const d = driveLine({ motor: MOTOR, places: lonely, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.1) });
    expect(d.rig.faults.join(' ')).toMatch(/orphan is driven by nothing/);
  });

  it('refuses an output no chain of meshes reaches', () => {
    const two: Placed[] = [...PAIR, { id: 'far', gear: cut(20), at: [0.5, 0] }];
    expect(trainGearing(two, 'pinion', 'far')).toMatch(/no chain of meshes reaches it|nothing called/);
  });

  it('a current over the motor’s continuous rating is called out even though it runs', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 1.2) });
    expect(d.settled.stalled).toBe(false);
    expect(d.settled.current!).toBeGreaterThan(MOTOR.maxContinuousCurrent);
    expect(d.settled.overCurrent).toBe(true);
    expect(d.settled.says).toMatch(/cook/);
  });

  it('the free speed is where the source gives up, and nothing settles past it', () => {
    const s = motorSource(MOTOR, { shaft: 's' }), hi = freeSpeed(s);
    expect(s.torqueAt(hi * 0.99)).toBeGreaterThan(0);
    expect(s.torqueAt(hi * 1.01)).toBeLessThan(0);
    const rig: Rig = { source: s, gearing: null, load: steadyLoad('s', 0), faults: [] };
    expect(settle(rig).w).toBeLessThanOrEqual(hi + 1e-9);
  });
});

describe('the interface is not about gears', () => {
  it('a source with no gearing at all drives a load directly', () => {
    const rig: Rig = { source: motorSource(MOTOR, { shaft: 's' }), gearing: null, load: steadyLoad('s', 0.5), faults: [] };
    const s = settle(rig);
    expect(s.stalled).toBe(false);
    expect(s.outRpm).toBeCloseTo(s.rpm, 9); // one shaft, one speed
    expect(Math.abs(netTorque(rig, s.w))).toBeLessThan(1e-9);
    expect(s.torque).toBeCloseTo(0.5, 6); // and it carries exactly what the load takes
  });

  it('anything that gives torque at a speed is a source, catalogue or not', () => {
    // a hand crank: whatever a person can keep up, falling off as it gets faster. Nothing in this file knows
    // what a motor is, which is the test — a belt, a worm or a spring plugs in the same way.
    const crank = { id: 'arm', shaft: 's', inertia: 1e-4, torqueAt: (w: number) => Math.max(0, 8 - 0.5 * w), says: 'a person' };
    const rig: Rig = { source: crank, gearing: null, load: fanLoad('s', 0.01), faults: [] };
    const s = settle(rig);
    expect(s.stalled).toBe(false);
    expect(s.current).toBeNull(); // an arm draws no amps and is not asked to
    expect(Math.abs(netTorque(rig, s.w))).toBeLessThan(1e-9);
    expect(spinUp(rig, 10).reached).toBeGreaterThan(0.99);
  });
});

describe('the strength island, now reached', () => {
  // src/engineering/gears.ts held the Lewis bending equation and a real mesh loss and NOTHING under src/ imported
  // it — `node tools/wired.mjs islands` is what found that. These tests are what keep it reached: delete the
  // import and they fail, rather than the file quietly going back to being an island nobody notices.
  it('a GearCut and a GearGeometry are the same gear, not two', () => {
    const c = cut(37, 0.008);
    const g = asGeometry(c);
    expect(g.module).toBe(c.m);
    expect(g.teeth).toBe(c.z);
    expect(g.width).toBe(c.b);
  });

  it('the derived mesh loss depends on the tooth counts; the typical figure cannot', () => {
    const small = trainGearing([{ id: 'a', gear: cut(18), at: [0, 0] }, { id: 'b', gear: cut(18), at: [0, 0.036] }], 'a', 'b', undefined, 0.05);
    const big = trainGearing([{ id: 'a', gear: cut(80), at: [0, 0] }, { id: 'b', gear: cut(80), at: [0, 0.16] }], 'a', 'b', undefined, 0.05);
    if (typeof small === 'string') throw new Error(small);
    if (typeof big === 'string') throw new Error(big);
    // pi·mu·(1/z1 + 1/z2): small teeth slide further per mesh, so a small pair loses MORE
    expect(small.efficiency).toBeLessThan(big.efficiency);
    expect(small.efficiency).toBeCloseTo(meshEfficiency(asGeometry(cut(18)), asGeometry(cut(18)), 0.05), 12);
    // and dry is worse than oiled, which a flat 0.98 can never say
    const dry = trainGearing([{ id: 'a', gear: cut(18), at: [0, 0] }, { id: 'b', gear: cut(18), at: [0, 0.036] }], 'a', 'b', undefined, 0.15);
    if (typeof dry === 'string') throw new Error(dry);
    expect(dry.efficiency).toBeLessThan(small.efficiency);
  });

  it('without a friction figure it falls back to the one gears.ts itself uses, so the two agree', () => {
    const g = trainGearing(PAIR, 'pinion', 'wheel');
    if (typeof g === 'string') throw new Error(g);
    expect(g.efficiency).toBeCloseTo(MESH_EFFICIENCY, 12);
  });

  it('a tooth that cannot carry the torque says so instead of turning', () => {
    // same module and count, a face width a tenth as wide: strength goes with the face, so this one strips
    const thin: GearCut = { m: 0.002, z: 20, b: 0.0004, bore: 0.006, matter: 'steel-low' };
    const stout: GearCut = { m: 0.002, z: 20, b: 0.012, bore: 0.006, matter: 'steel-low' };
    const T = 3;
    expect(toothHolds(stout, T, 0).ok).toBe(true);
    expect(toothHolds(thin, T, 0).ok).toBe(false);
    expect(toothHolds(thin, T, 0).says).toMatch(/STRIPS/);
    // and it is the Lewis number itself, not a rule of thumb about it
    expect(toothHolds(stout, T, 0).carries).toBeCloseTo(toothTorque(asGeometry(stout), getMaterial('steel.a36'), 0), 9);
  });

  it('a harder steel carries more, and a bigger module more again', () => {
    const mild = toothHolds({ m: 0.002, z: 20, b: 0.008, matter: 'steel-low' }, 1, 0);
    const alloy = toothHolds({ m: 0.002, z: 20, b: 0.008, matter: 'steel-alloy' }, 1, 0);
    const coarse = toothHolds({ m: 0.004, z: 20, b: 0.008, matter: 'steel-low' }, 1, 0);
    expect(alloy.carries).toBeGreaterThan(mild.carries);
    expect(coarse.carries).toBeGreaterThan(mild.carries);
    expect(gearMaterial({ m: 0.002, z: 20, b: 0.008, matter: 'steel-alloy' }).assumed).toBe(false);
  });

  it('faster teeth carry less, because they hit harder', () => {
    const g: GearCut = { m: 0.002, z: 20, b: 0.008, matter: 'steel-low' };
    expect(toothHolds(g, 1, 6000).carries).toBeLessThan(toothHolds(g, 1, 0).carries);
  });

  it('a material with no gear steel behind it is answered, and says it assumed', () => {
    const plastic = gearMaterial({ m: 0.002, z: 20, b: 0.008, matter: 'pla' });
    expect(plastic.assumed).toBe(true);
    expect(toothHolds({ m: 0.002, z: 20, b: 0.008, matter: 'pla' }, 1, 0).says).toMatch(/material assumed/);
  });

  it('a drive whose teeth will strip at stall is refused, however well it would settle', () => {
    // a thin-faced pair under a motor that stalls at 2.4 N·m: it would run beautifully at speed
    const weak: Placed[] = [
      { id: 'pinion', gear: { m: 0.002, z: 20, b: 0.0003, bore: 0.006, matter: 'steel-low' }, at: [0, 0] },
      { id: 'wheel', gear: { m: 0.002, z: 60, b: 0.0003, bore: 0.006, matter: 'steel-low' }, at: [0.08, 0] },
    ];
    const d = driveLine({ motor: MOTOR, places: weak, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.05) });
    expect(d.settled.stalled).toBe(false);          // it does turn
    expect(d.teeth.some((v) => !v.ok)).toBe(true);  // and it breaks doing it
    expect(d.rig.faults.join(' ')).toMatch(/STRIPS/);
  });

  it('a sound drive reports every gear as holding, with a margin', () => {
    const d = driveLine({ motor: MOTOR, places: PAIR, driver: 'pinion', out: 'wheel', load: steadyLoad('out', 0.3) });
    expect(d.teeth).toHaveLength(2);
    expect(d.teeth.every((v) => v.ok)).toBe(true);
    expect(d.teeth.every((v) => v.margin > 1)).toBe(true);
    expect(d.rig.faults.filter((f) => /STRIPS/.test(f))).toEqual([]);
  });
});

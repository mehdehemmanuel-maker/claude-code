// Wave 14, job "kit-machines" (decision 0029: a fuller library of the mid-level blocks machines are made of; the user: "No
// no toys this is a superior cad ai"): every seed of assemblies/kit-machines.ts builds at its defaults and at a smaller and
// a larger setting with every node ok, is one group of pieces (each reached from every other through the faces the
// operations wrote, as accept-w13-groups counts them), its bound grows with its inputs, the ones that move give a joint
// (motionOf), and plain words find it (searchByFunction). The four engineered from requirements (tracked base, wheeled
// chassis, lift mast, claw) give the numbers of their report as outputs, and each is checked here against the hand
// formula, worked from the constants alone (g, the two steels' yields and modulus as src/data/materials.ts gives them).
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, placeBlock, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import type { Block } from '../../src/nexus/room';
import { motionOf } from '../../src/nexus/sim';
import { searchByFunction } from '../../src/nexus/aitools';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
const groups = (b: Block) => { const up = b.pieces.map((_, i) => i), top = (i: number): number => (up[i] === i ? i : (up[i] = top(up[i]!))); for (const f of b.faces) up[top(f.a)] = top(f.b); return new Set(b.pieces.map((_, i) => top(i))).size; };
async function built(id: string, set: Record<string, unknown>): Promise<{ block?: Block; out: Record<string, unknown>; failing: string[] }> {
  const b = emptyBoard(id); placeBlock(b, id, 0, 0, set, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
  return { block: e.state.get('x')?.out?.block as Block | undefined, out: (e.state.get('x')?.out ?? {}) as Record<string, unknown>, failing: [...e.state].filter(([, s]) => s.status !== 'ok').map(([n, s]) => `${n}: ${s.error}`) };
}
/** Each seed: a smaller and a larger setting, whether it moves, and the plain words that should find it. */
const KIT: Record<string, { small: Record<string, unknown>; large: Record<string, unknown>; moves: boolean; words: string }> = {
  'seed.tracked-base': { small: { payload: 1000, length: 1800, width: 1400 }, large: { payload: 8000, length: 4000, width: 3000 }, moves: true, words: 'tracks' },
  'seed.dozer-blade': { small: { width: 1500, height: 500, arm: 800 }, large: { width: 5000, height: 1800, arm: 3000 }, moves: false, words: 'bulldozer blade' },
  'seed.cab': { small: { width: 900, depth: 1000, height: 1400 }, large: { width: 2400, depth: 2600, height: 2400 }, moves: false, words: 'operator cab' },
  'seed.lift-mast': { small: { load: 1000, lift: 2000, centre: 400 }, large: { load: 5000, lift: 4000, centre: 600 }, moves: true, words: 'forklift mast' },
  'seed.turret': { small: { diameter: 300, barrel: 400 }, large: { diameter: 2500, barrel: 4000 }, moves: true, words: 'turret' },
  'seed.wheeled-chassis': { small: { payload: 500, wheelbase: 1800, track: 1200, wheel: 500 }, large: { payload: 8000, wheelbase: 4500, track: 2200, wheel: 1100, wheels: '6' }, moves: true, words: 'chassis with wheels' },
  'seed.cube-frame': { small: { x: 400, y: 400, z: 400, section: 20 }, large: { x: 4000, y: 3000, z: 5000, section: 80 }, moves: false, words: 'frame of extrusions' },
  'seed.booth': { small: { w: 800, d: 600, h: 900 }, large: { w: 5000, d: 4000, h: 3000 }, moves: false, words: 'enclosure' },
  'seed.conveyor': { small: { length: 1000, width: 300, height: 600 }, large: { length: 10000, width: 1200, height: 1200 }, moves: true, words: 'conveyor' },
  'seed.chute': { small: { length: 500, width: 200 }, large: { length: 4000, width: 1500 }, moves: false, words: 'chute' },
  'seed.bin': { small: { w: 300, d: 200, h: 150 }, large: { w: 2400, d: 1600, h: 1200 }, moves: false, words: 'bin' },
  'seed.claw': { small: { load: 100, reach: 300, fingers: 2 }, large: { load: 3000, reach: 1500, fingers: 5 }, moves: true, words: 'claw' },
  'seed.cargo-bed': { small: { length: 1200, width: 700, side: 120 }, large: { length: 6000, width: 2400, side: 600 }, moves: false, words: 'cargo bed' },
  'seed.hover-skirt-hull': { small: { length: 2000, width: 1000 }, large: { length: 6000, width: 3000 }, moves: true, words: 'hovercraft hull' },
};
const size = (b: Block) => Math.max(...[0, 1, 2].map((k) => b.hi[k]! - b.lo[k]!));
// (the constants the hand formulas use: standard gravity; AISI 1018 cold drawn and AISI 4140 quenched and tempered, the
// handbook rows steel-low and steel-alloy stand on in src/nexus/matter.ts, as src/data/materials.ts gives them)
const g = 9.80665, Ylow = 370e6, Yalloy = 655e6, E = 205e9, tau = 0.577 * Yalloy;
/** A rectangular hollow section's elastic modulus about the axis across its depth H, m³ (sharp corners). */
const Zrhs = (B: number, H: number, t: number) => ((B * H ** 3 - (B - 2 * t) * (H - 2 * t) ** 3) / (6 * H)) * 1e-9;
const near = (got: unknown, want: number, what: string) => expect(Math.abs(Number(got) - want) <= Math.max(0.06, Math.abs(want) * 0.002), `${what}: ${String(got)} given, ${want.toFixed(2)} by hand`).toBe(true);

describe('wave 14, kit-machines: the machine sub-assemblies build smaller, default and larger, each one group', () => {
  for (const [id, k] of Object.entries(KIT)) it(id, async () => {
    expect(LIBRARY.has(id), `${id} is in the library`).toBe(true);
    const sizes: number[] = [];
    for (const set of [k.small, {}, k.large]) {
      const at = `${id} at ${JSON.stringify(set)}`, r = await built(id, set);
      expect(r.failing, `${at}: every node ok`).toEqual([]);
      const b = r.block!; expect(groups(b), `${at}: one group of pieces`).toBe(1);
      if (k.moves) expect(motionOf(b).joints.length, `${at}: it moves by a joint (${motionOf(b).says})`).toBeGreaterThan(0);
      sizes.push(size(b));
    }
    expect(sizes[0]! < sizes[1]! && sizes[1]! < sizes[2]!, `${id}: its bound grows with its inputs (${sizes.map((s) => (s * 1000).toFixed(0)).join(' < ')} mm)`).toBe(true);
    expect(searchByFunction(k.words, 8).map((f) => f.id), `"${k.words}" finds ${id}`).toContain(id);
  }, 30_000);
});

describe('wave 14, kit-machines: the engineered seeds\' numbers, each by its hand formula', () => {
  it('the lift mast: 1500 kg at a 500 mm load centre, 3 m, 160 bar', async () => {
    const o = (await built('seed.lift-mast', {})).out, F = 1500 * g;
    // (forks: each half the load at the load centre, a 100 x 35 mm arm: sigma = 6 M / (b t²); 30 mm would give 245 MPa, under 3)
    const Mf = (F / 2) * 0.5, fork = (6 * Mf) / (0.1 * 0.035 ** 2);
    expect(o.forkT, 'the fork\'s thickness, the next 5 mm over sqrt(6 M 3 / (b Y))').toBe(Math.ceil((Math.sqrt((6 * Mf * 3) / (0.1 * Yalloy)) * 1000) / 5) * 5);
    near(o.forkStressMPa, fork / 1e6, 'fork stress, MPa'); near(o.forkSafety, Yalloy / fork, 'fork safety'); expect(Number(o.forkSafety)).toBeGreaterThanOrEqual(3);
    // (uprights: the load at the load centre and 200 mm, two of them: RHS 100x50x4 is the lightest section that keeps 2)
    const Mm = (F * 0.7) / 2, mast = Mm / Zrhs(50, 100, 4);
    expect(o.section).toBe('RHS 100x50x4'); near(o.mastStressMPa, mast / 1e6, 'upright stress, MPa'); near(o.mastSafety, Ylow / mast, 'upright safety'); expect(Number(o.mastSafety)).toBeGreaterThanOrEqual(2);
    // (cylinder: 2:1 reeving and 15 %: 33.8 kN; bore 100 at 160 bar, its Ø45 rod a 1.5 m pinned strut: bore 63 would push
    // enough (49.9 kN) but its Ø28 rod's Euler load is 27.1 kN, and bore 80's Ø36 rod's 74.2 kN is under 2.5 times the push)
    const need = 2 * F * 1.15, gives = (160e5 * Math.PI * 0.1 ** 2) / 4, euler = (Math.PI ** 2 * E * ((Math.PI * 0.045 ** 4) / 64)) / 1.5 ** 2;
    expect(o.bore).toBe('100'); near(o.cylNeedkN, need / 1000, 'cylinder push, kN'); near(o.cylGiveskN, gives / 1000, 'cylinder gives, kN'); near(o.rodEulerkN, euler / 1000, 'rod Euler load, kN');
    expect(gives >= need && euler >= 2.5 * need && (Math.PI ** 2 * E * ((Math.PI * 0.036 ** 4) / 64)) / 1.5 ** 2 < 2.5 * need, 'bore 100 passes and bore 80\'s rod does not').toBe(true);
    expect(String(o.report)).toMatch(/RHS 100x50x4.*bore 100 mm/);
  }, 30_000);
  it('the tracked undercarriage: 2 t at 1 m/s up a 30 % grade', async () => {
    const o = (await built('seed.tracked-base', {})).out, W = 2000 * 1.6 * g, contact = 0.78 * 2.4;
    // (ground pressure: 200 mm tracks give 41.9 kPa; 150 mm would give 55.9)
    expect(o.track).toBe(200); near(o.groundkPa, W / (2 * 0.2 * contact) / 1000, 'ground pressure, kPa'); expect(W / (2 * 0.15 * contact)).toBeGreaterThan(50e3);
    // (cross members: half the payload with 1.5 at mid-span of 1.6 m, M = P L / 4, on SHS 80x80x5)
    const Mx = ((2000 * g * 1.5) / 2) * (1.6 / 4), cross = Mx / Zrhs(80, 80, 5);
    expect(o.section).toBe('SHS 80x80x5'); near(o.crossStressMPa, cross / 1e6, 'cross member stress, MPa'); near(o.crossSafety, Ylow / cross, 'cross member safety'); expect(Number(o.crossSafety)).toBeGreaterThanOrEqual(2);
    // (tractive effort: W (sin + 0.08 cos) of atan 0.3; half at the 264 mm sprocket radius; the shaft d³ = 16 T 3 / (pi tau))
    const th = Math.atan(0.3), TE = W * (Math.sin(th) + 0.08 * Math.cos(th)), T = (TE / 2) * 0.264, d = Math.ceil((Math.cbrt((16 * T * 3) / (Math.PI * tau)) * 1000) / 5) * 5, shear = (16 * T) / (Math.PI * (d / 1000) ** 3);
    near(o.effortkN, TE / 1000, 'tractive effort, kN'); near(o.shaftTorqueNm, T, 'sprocket shaft torque, N m'); expect(o.shaftMm).toBe(d); near(o.shaftShearMPa, shear / 1e6, 'shaft shear, MPa'); expect(Number(o.shaftSafety)).toBeGreaterThanOrEqual(3);
    near(o.powerkW, (TE * 1) / 0.85 / 1000, 'drive power, kW'); near(o.sprocketRpm, (1 / (2 * Math.PI * 0.264)) * 60, 'sprocket speed, rev/min');
    expect(String(o.report)).toMatch(/rating not in the table/);
  }, 30_000);
  it('the wheeled chassis: 1 t on a 2.4 m wheelbase at 5 m/s up 15 %', async () => {
    const o = (await built('seed.wheeled-chassis', {})).out;
    // (rails: the payload along the wheelbase with a factor of 2 on two rails: M = P g L / 8, on RHS 80x40x4)
    const Mr = (1000 * g * 2.4) / 8, rail = Mr / Zrhs(40, 80, 4);
    expect(o.section).toBe('RHS 80x40x4'); near(o.railStressMPa, rail / 1e6, 'rail stress, MPa'); expect(Number(o.railSafety)).toBeGreaterThanOrEqual(2);
    // (axles: a quarter of 1.5 t with a factor of 2 at 350 mm: d³ = 32 M 2 / (pi Y), the next 5 mm)
    const Ma = ((1500 * g) / 4) * 2 * 0.35, d = Math.ceil((Math.cbrt((32 * Ma * 2) / (Math.PI * Yalloy)) * 1000) / 5) * 5, axle = (32 * Ma) / (Math.PI * (d / 1000) ** 3);
    expect(o.axleMm).toBe(d); near(o.axleStressMPa, axle / 1e6, 'axle stress, MPa'); near(o.axleSafety, Yalloy / axle, 'axle safety'); expect(Number(o.axleSafety)).toBeGreaterThanOrEqual(2);
    const th = Math.atan(0.15), TE = 1500 * g * (Math.sin(th) + 0.015 * Math.cos(th));
    near(o.effortkN, TE / 1000, 'tractive effort, kN'); near(o.wheelTorqueNm, TE * 0.325, 'wheel torque, N m'); near(o.powerkW, (TE * 5) / 0.9 / 1000, 'drive power, kW'); near(o.wheelRpm, (5 / (Math.PI * 0.65)) * 60, 'wheel speed, rev/min');
  }, 30_000);
  it('the claw: 500 kg, four fingers of 600 mm reach, 160 bar', async () => {
    const o = (await built('seed.claw', {})).out, per = (500 * g) / 4, M = per * 0.36;
    // (fingers: a bar b = h / 2 in bending, h³ = 12 M 3 / Y, the next 5 mm: 20 x 40)
    const h = Math.ceil((Math.cbrt((12 * M * 3) / Ylow) * 1000) / 5) * 5, stress = (6 * M) / ((h / 2000) * (h / 1000) ** 2);
    expect(h).toBe(40); near(o.fingerStressMPa, stress / 1e6, 'finger stress, MPa'); near(o.fingerSafety, Ylow / stress, 'finger safety'); expect(Number(o.fingerSafety)).toBeGreaterThanOrEqual(3);
    // (pins: twice a finger's share in double shear, tau = V / (2 A), on the Ø14 the bushing table gives over h / 3)
    const pinShear = (2 * per) / (2 * Math.PI * 0.007 ** 2);
    expect(o.pin).toBe(14); near(o.pinShearMPa, pinShear / 1e6, 'pin shear, MPa'); expect(Number(o.pinSafety)).toBeGreaterThanOrEqual(3);
    // (cylinder: n M / a with a = 90 mm: 19.6 kN; bore 40 gives 20.1 kN at 160 bar, bore 32 only 12.9)
    const need = (4 * M) / 0.09, gives = (160e5 * Math.PI * 0.04 ** 2) / 4;
    expect(o.bore).toBe('40'); near(o.cylNeedkN, need / 1000, 'cylinder force, kN'); near(o.cylGiveskN, gives / 1000, 'cylinder gives, kN'); expect(gives >= need && (160e5 * Math.PI * 0.032 ** 2) / 4 < need).toBe(true);
  }, 30_000);
});

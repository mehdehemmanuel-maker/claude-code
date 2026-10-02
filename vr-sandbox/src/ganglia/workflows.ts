// How Ego works a design out: each workflow is an engineer's procedure. What it needs to know, the laws it applies in
// order, the catalogue it chooses from. It returns the choice, the other workable answers and what each trades, and
// the trace of every law it applied with its numbers, so the reasoning can be read and checked. It is all
// closed-form: an answer in microseconds, and the test stand only to prove it.

import { MOTORS, GEARHEADS, type GearheadData } from '../data/motors';
import { BATTERIES, WIRE_GAUGES, type BatteryData } from '../data/batteries';
import { motorModel, type MotorModel } from '../engineering/dcmotor';
import { packCapacity, packOCV, type Pack } from '../engineering/battery';
import { getMaterial, STANDARD_GRAVITY as g } from '../data/materials';
import { apply, use } from './laws';
import { BEARINGS, CONTROLLERS, COUPLINGS, FUSES, HOLLOW_SECTIONS, LEAD_SCREWS, PILLOW_BLOCKS, ROD_ENDS } from './parts';
import { lewisFormFactor } from '../engineering/mechanics';
import { MIN_TEETH, MODULES } from '../engineering/gears';
import type { CatalogItem, TraceStep, Workflow, WorkflowResult } from './types';

const q = (sym: string, name: string, unit: string, d?: number) => ({ sym, name, unit, ...(d === undefined ? {} : { default: d }) });
const r3 = (x: number) => Number(x.toPrecision(3));

/** Apply a law and write it down. */
function step(trace: TraceStep[], law: string, why: string, inputs: Record<string, number>, unit: string): number {
  const { value, caution } = use(law, inputs);
  trace.push({ law, for: why, inputs, output: value, unit, ...(caution ? { caution } : {}) });
  return value;
}

/** What a run's laws said about being used beyond what they hold for. */
const cautions = (trace: TraceStep[]) => trace.filter((t) => t.caution).map((t) => `${t.law}: ${t.caution}`);

const n = (s: Record<string, number | string>, k: string, d: number) => (typeof s[k] === 'number' && Number.isFinite(s[k] as number) ? (s[k] as number) : d);

// ------------------------------------------------------------------------------------------------ vehicle drive

export interface DriveChoice {
  motor: string;
  gearhead: string | null;
  battery: string;
  series: number;
  controller: string;
  controllers: number;
  /** The current limit to set, A per motor. */
  currentLimit: number;
  /** What it does: top speed m/s, starting push N, current at cruise A per motor, runtime at cruise h. */
  topSpeed: number;
  push: number;
  cruiseCurrent: number;
  runtime: number;
}

/** One drive the search found: what it is, how well it fits, why, and what its priced parts cost. */
type DriveOption = { choice: DriveChoice; score: number; why: string; cost: number };

/**
 * Every motor, gearhead, pack and controller that gives a torque at a speed within their ratings, best first. Shared
 * by a vehicle's drive (r its wheel's radius, v its speed in m/s) and an actuator's (r = 1, v its shaft's speed in
 * rad/s). Geared 0: direct drive only; 1: through a gearhead only; anything else: either.
 */
function searchDrives(Tw: number, Tc: number, v: number, r: number, k: number, geared: number, speedSays: (x: number) => string): DriveOption[] {
  const options: DriveOption[] = [];
  for (const md of Object.values(MOTORS)) {
    const mm = motorModel(md);
    const gears: (GearheadData | null)[] = [...(geared === 1 ? [] : [null]), ...(geared === 0 ? [] : Object.values(GEARHEADS).filter((x) => x.fits.includes(md.id)))];
    for (const gh of gears) {
      for (const bd of Object.values(BATTERIES)) {
        const series = Math.max(1, Math.round(md.V / bd.V));
        const pack: Pack = { data: bd, series, parallel: 1 };
        const V = packOCV(pack, 0.8);
        const o = evaluateDrive(mm, gh, pack, V, Tw, Tc, r);
        if (!o) continue;
        for (const c of CONTROLLERS) {
          const vmax = Number(c.specs['vMax']), cont = Number(c.specs['continuous']), ch = Number(c.specs['channels']);
          if (packOCV(pack, 1) > vmax) continue;
          if (o.pushCurrent > cont) continue;
          const count = Math.ceil(k / ch);
          const limits = c.specs['currentLimit'] === 'yes';
          const cost = (md.price?.amount ?? 0) * k + (gh?.price?.amount ?? 0) * k + (bd.price?.amount ?? 0) * series;
          const speedMargin = o.topSpeed / v, pushMargin = Math.min(md.maxContinuousCurrent * 3, cont) / o.pushCurrent;
          const ok = o.topSpeed >= v && o.cruiseCurrent <= md.maxContinuousCurrent && (!gh || Tw <= gh.maxContinuousTorque * 1.5);
          if (!ok) continue;
          const score = Math.min(speedMargin, 3) + Math.min(pushMargin, 3) + (limits ? 1 : 0) - cost / 5000;
          options.push({
            cost, score,
            why: `${speedSays(o.topSpeed)} top, ${r3(o.pushCurrent)} A a motor to push, ${r3(o.cruiseCurrent)} A cruising (rated ${md.maxContinuousCurrent} A)${limits ? '' : '; its controller has no current limit, so a stall draws the motor\'s full stall current'}`,
            choice: {
              motor: md.id, gearhead: gh?.id ?? null, battery: bd.id, series, controller: c.id, controllers: count,
              currentLimit: Math.ceil(o.pushCurrent * 1.1), topSpeed: o.topSpeed, push: (o.pushTorque * k) / r, cruiseCurrent: o.cruiseCurrent,
              runtime: runtimeHours(pack, mm, o, k),
            },
          });
        }
      }
    }
  }
  return options.sort((x, y) => y.score - x.score);
}

export const driveSelect: Workflow<Record<string, number | string>, DriveChoice> = {
  id: 'drive.select', name: 'Choose a vehicle drive',
  goal: 'Motors, gearheads, battery and controller that move a vehicle at the speed and acceleration asked, up the grade asked, within every part\'s rating.',
  asks: [q('mass', 'total mass, rider included', 'kg'), q('wheelRadius', 'driven wheel radius', 'm'), q('speed', 'top speed wanted', 'm/s'), q('accel', 'acceleration wanted', 'm/s^2', 0.5),
    q('grade', 'steepest grade', '%', 0), q('motors', 'driven wheels, one motor each', '-', 2), q('Crr', 'rolling resistance coefficient', '-', 0.015), q('mu', 'tyre grip', '-', 0.8), q('driven', 'share of weight on the driven wheels', '-', 0.5)],
  steps: [
    'What holds it back: rolling resistance and the grade; what it must add: mass times acceleration.',
    'Per motor, the torque at the wheel and the wheel\'s speed at top speed.',
    'Check the tyres can put that down (traction).',
    'For every motor, gearhead and battery that fit: the speed it reaches at cruise (back-EMF meets the pack\'s voltage less its I R), the current the push needs, and whether that is within the motor\'s continuous rating, the gearhead\'s torque and a controller\'s current.',
    'Rank what works by margin on speed and push, then by cost.',
  ],
  uses: { laws: ['rolling.resistance', 'grade.force', 'newton.second', 'wheel.torque', 'traction.limit', 'gear.output.torque', 'motor.torque', 'motor.current', 'motor.back-emf', 'energy.electric'], families: ['dc motor', 'gearhead', 'battery', 'motor controller'], processes: [] },
  tags: ['vehicle', 'kart', 'drive', 'motor', 'battery', 'robot'],
  run(spec) {
    const trace: TraceStep[] = [], warnings: string[] = [];
    const m = n(spec, 'mass', 100), r = n(spec, 'wheelRadius', 0.125), v = n(spec, 'speed', 2), a = n(spec, 'accel', 0.5);
    const grade = n(spec, 'grade', 0), k = Math.max(1, Math.round(n(spec, 'motors', 2))), Crr = n(spec, 'Crr', 0.015), mu = n(spec, 'mu', 0.8), share = n(spec, 'driven', 0.5);
    const N = m * g;
    const Fr = step(trace, 'rolling.resistance', 'what the tyres lose rolling', { Crr, N }, 'N');
    const Fg = step(trace, 'grade.force', `the ${grade}% grade`, { m, theta: Math.atan(grade / 100) }, 'N');
    const Fa = step(trace, 'newton.second', `to accelerate at ${a} m/s²`, { m, a }, 'N');
    const grip = step(trace, 'traction.limit', 'the most the driven tyres can push', { mu, N: N * share }, 'N');
    if (Fr + Fg + Fa > grip) warnings.push(`It needs ${r3(Fr + Fg + Fa)} N of push and its driven tyres grip only ${r3(grip)} N: they will spin. Less acceleration, more weight on them, or grippier tyres.`);
    const Tw = step(trace, 'wheel.torque', 'per motor, to accelerate up the grade', { F: (Fr + Fg + Fa) / k, r }, 'N m');
    const Tc = (Fr + Fg) * r / k;
    const ww = v / r;
    const options = searchDrives(Tw, Tc, v, r, k, typeof spec['geared'] === 'number' ? spec['geared'] : -1, (x) => `${r3(x)} m/s`);
    const best = options[0];
    if (best) {
      // the chosen one's own numbers, in the trace
      const md = MOTORS[best.choice.motor]!, mm = motorModel(md), gh = best.choice.gearhead ? GEARHEADS[best.choice.gearhead]! : null;
      const Nr = gh?.ratio ?? 1, eta = gh?.efficiency ?? 1, I = best.choice.currentLimit;
      const Tm = step(trace, 'motor.torque', `torque the motor makes at its ${I} A limit, less its friction (I less I0)`, { Kt: mm.Kt, I: I - mm.I0 }, 'N m');
      step(trace, 'gear.output.torque', 'what the gearhead then gives each wheel', { T: Tm, i: Nr, eta }, 'N m');
      step(trace, 'motor.back-emf', 'back-EMF at the speed asked', { Ke: mm.Kt, w: ww * Nr }, 'V');
    }
    const parts = best ? [best.choice.motor, ...(best.choice.gearhead ? [best.choice.gearhead] : []), best.choice.battery, best.choice.controller] : [];
    return {
      ok: !!best,
      summary: best
        ? `${k} × ${MOTORS[best.choice.motor]!.label}${best.choice.gearhead ? ` with ${GEARHEADS[best.choice.gearhead]!.label}` : ''}, on ${best.choice.series} × ${BATTERIES[best.choice.battery]!.label} in series, through ${best.choice.controllers} × ${CONTROLLERS.find((c) => c.id === best.choice.controller)!.label} limited to ${best.choice.currentLimit} A: ${best.why}; about ${r3(best.choice.runtime)} h at cruise.`
        : `Nothing in the catalogue moves ${m} kg at ${v} m/s with ${a} m/s² of acceleration: ${r3(Tw)} N·m a wheel and ${r3(ww)} rad/s. Fewer demands, more motors, or a bigger motor in the catalogue.`,
      choice: best?.choice ?? null,
      alternatives: options.slice(1, 4).map((o) => ({ choice: o.choice, why: o.why })),
      trace, warnings: [...warnings, ...cautions(trace)], parts,
    };
  },
};

/** One motor, gearhead and pack: the speed it reaches at cruise, and the currents it draws cruising and pushing. */
function evaluateDrive(mm: MotorModel, gh: GearheadData | null, pack: Pack, V: number, Tw: number, Tc: number, r: number) {
  const N = gh?.ratio ?? 1, eta = gh?.efficiency ?? 1;
  const R = mm.R25 * 1.2 + pack.series * pack.data.internalR; // a warm winding (about 75 °C) and the pack's own resistance
  // at cruise: the current the steady load needs, and the speed the motor turns at with it
  const cruiseCurrent = Tc / (N * eta) / mm.Kt + mm.I0;
  const wm = (V - cruiseCurrent * R) / mm.Kt;
  if (wm <= 0) return null;
  const topSpeed = (wm / N) * r;
  const pushCurrent = Tw / (N * eta) / mm.Kt + mm.I0;
  return { cruiseCurrent, topSpeed, pushCurrent, pushTorque: Tw, wm, R, V };
}

/** Hours a pack lasts at cruise: what the motors draw (back-EMF power plus copper), at the maker's capacity for that rate. */
function runtimeHours(pack: Pack, mm: MotorModel, o: { cruiseCurrent: number; wm: number; R: number; V: number }, k: number) {
  const P = k * (mm.Kt * o.cruiseCurrent * o.wm + o.cruiseCurrent ** 2 * o.R);
  const I = P / o.V;
  return packCapacity(pack, I) / I;
}

// ------------------------------------------------------------------------------------------------ wire

export interface WireChoice { gauge: string; drop: number; loss: number; ampacity: number }

export const wireSize: Workflow<Record<string, number | string>, WireChoice> = {
  id: 'wire.size', name: 'Size a power wire',
  goal: 'The thinnest copper pair that carries the current within its rating and drops no more than the allowed share of the supply.',
  asks: [q('current', 'current', 'A'), q('length', 'run length, one way', 'm'), q('voltage', 'supply', 'V', 24), q('drop', 'allowed drop', '-', 0.03), q('fused', 'protected by a fuse at 125% of the current (1) or not (0)', '-', 0)],
  steps: ['Each gauge from thinnest: is its chassis rating at least the current, or at least its fuse\'s 125% of it when fused (a fuse may be no bigger than its wire)?', 'Does twice the run times its resistance per metre times the current drop less than the allowed share?', 'The first that passes both.'],
  uses: { laws: ['wire.drop', 'joule', 'wire.resistance'], families: ['wire'], processes: ['crimp'] }, tags: ['wire', 'cable', 'battery', 'motor'],
  run(spec) {
    const I = n(spec, 'current', 10), L = n(spec, 'length', 1), V = n(spec, 'voltage', 24), share = n(spec, 'drop', 0.03);
    const rated = n(spec, 'fused', 0) > 0 ? 1.25 * I : I;
    const trace: TraceStep[] = [];
    const gauges = Object.entries(WIRE_GAUGES).sort((a, b) => a[1].area - b[1].area);
    const fits: WireChoice[] = [];
    for (const [gauge, w] of gauges) {
      const drop = apply('wire.drop', { I, L, Rm: w.ohmPerM });
      if (w.ampacity >= rated && drop <= share * V) fits.push({ gauge, drop, loss: apply('joule', { I, R: 2 * L * w.ohmPerM }), ampacity: w.ampacity });
    }
    const best = fits[0];
    if (best) {
      const w = WIRE_GAUGES[best.gauge]!;
      step(trace, 'wire.drop', `${best.gauge} AWG pair over ${L} m`, { I, L, Rm: w.ohmPerM }, 'V');
      step(trace, 'joule', 'what it loses as heat', { I, R: 2 * L * w.ohmPerM }, 'W');
    }
    return {
      ok: !!best, choice: best ?? null, trace, warnings: cautions(trace), parts: best ? [`awg.${best.gauge}`] : [],
      summary: best ? `${best.gauge} AWG pair: rated ${best.ampacity} A, drops ${r3(best.drop)} V (${r3((best.drop / V) * 100)}% of ${V} V), loses ${r3(best.loss)} W.` : `No gauge in the catalogue carries ${I} A over ${L} m within ${share * 100}%: a shorter run, a higher voltage, or heavier cable.`,
      alternatives: fits.slice(1, 3).map((f) => ({ choice: f, why: `heavier: drops ${r3(f.drop)} V, loses ${r3(f.loss)} W` })),
    };
  },
};

// ------------------------------------------------------------------------------------------------ battery

export interface PackChoice { battery: string; series: number; parallel: number; hours: number; mass: number }

export const batterySize: Workflow<Record<string, number | string>, PackChoice> = {
  id: 'battery.size', name: 'Size a battery pack',
  goal: 'Blocks in series for the voltage and strings in parallel for the runtime, from the maker\'s capacity at that rate.',
  asks: [q('voltage', 'nominal voltage', 'V', 24), q('current', 'average current', 'A'), q('hours', 'runtime wanted', 'h')],
  steps: ['Series blocks to make the voltage.', 'The capacity a string gives at that current (the maker\'s table: faster drawn, less given).', 'Strings in parallel until the runtime is met.'],
  uses: { laws: ['energy.electric', 'lead-acid.ocv'], families: ['battery'], processes: [] }, tags: ['battery', 'runtime', 'power'],
  run(spec) {
    const V = n(spec, 'voltage', 24), I = n(spec, 'current', 5), h = n(spec, 'hours', 1);
    const trace: TraceStep[] = [];
    const out: PackChoice[] = [];
    for (const b of Object.values(BATTERIES)) out.push(sizePack(b, V, I, h));
    out.sort((a, b) => a.mass - b.mass);
    const best = out[0]!;
    step(trace, 'energy.electric', 'what it gives over the runtime', { V, I, t: h * 3600 }, 'J');
    return {
      ok: true, choice: best, trace, warnings: cautions(trace), parts: [best.battery], alternatives: out.slice(1).map((c) => ({ choice: c, why: `${r3(c.mass)} kg` })),
      summary: `${best.series * best.parallel} × ${BATTERIES[best.battery]!.label} (${best.series} in series × ${best.parallel} in parallel), ${r3(best.mass)} kg: at ${I} A it runs ${r3(best.hours)} h.`,
    };
  },
};

function sizePack(b: BatteryData, V: number, I: number, h: number): PackChoice {
  const series = Math.max(1, Math.round(V / b.V));
  let parallel = 1;
  while (parallel < 50 && packCapacity({ data: b, series, parallel }, I) / I < h) parallel++;
  const hours = packCapacity({ data: b, series, parallel }, I) / I;
  return { battery: b.id, series, parallel, hours, mass: series * parallel * b.mass };
}

// ------------------------------------------------------------------------------------------------ shaft

/** Round bright bar as stocked (metric), m. */
export const ROUND_BAR = [0.006, 0.008, 0.01, 0.012, 0.016, 0.02, 0.025, 0.03, 0.035, 0.04, 0.05, 0.06];

export const shaftSize: Workflow<Record<string, number | string>, { diameter: number; least: number; material: string }> = {
  id: 'shaft.size', name: 'Size a solid shaft',
  goal: 'The least stocked round bar that carries a bending moment and a torque with a safety factor against yield.',
  asks: [q('M', 'bending moment', 'N m', 0), q('T', 'torque', 'N m'), q('n', 'safety factor', '-', 2)],
  steps: ['Distortion energy: d = [16 n √(4M² + 3T²) / (π S_y)]^(1/3).', 'The next bar up from stock.', 'A rotating shaft also wants a fatigue check: the endurance limit, which this states.'],
  uses: { laws: ['shaft.diameter.static', 'torsion.solid', 'fatigue.endurance.steel'], families: [], processes: ['turn', 'saw'] }, tags: ['shaft', 'axle', 'diameter'],
  run(spec) {
    const M = n(spec, 'M', 0), T = n(spec, 'T', 10), sf = n(spec, 'n', 2);
    const mat = getMaterial(typeof spec['material'] === 'string' ? spec['material'] : 'steel.1018-cd');
    const trace: TraceStep[] = [];
    const least = step(trace, 'shaft.diameter.static', `for ${M} N·m bending and ${T} N·m torque at ${sf}× on ${mat.name}`, { M, T, n: sf, Sy: mat.yield }, 'm');
    const d = ROUND_BAR.find((x) => x >= least) ?? null;
    if (d) step(trace, 'torsion.solid', `shear in the ${d * 1000} mm bar`, { T, d }, 'Pa');
    const Se = step(trace, 'fatigue.endurance.steel', 'if it turns while bent (rotating bending reverses the stress)', { Sut: mat.ultimate }, 'Pa');
    return {
      ok: !!d, choice: d ? { diameter: d, least, material: mat.id } : null, trace, parts: [], alternatives: [],
      warnings: [...cautions(trace), ...(M > 0 ? [`Turning while it is bent, each point on it is stressed back and forth: check it against the endurance limit (polished bar ${r3(Se / 1e6)} MPa, less for its surface and size).`] : [])],
      summary: d ? `Ø${d * 1000} mm ${mat.name} bar (it needs at least ${r3(least * 1000)} mm).` : `More than ${ROUND_BAR[ROUND_BAR.length - 1]! * 1000} mm: ${r3(least * 1000)} mm needed.`,
    };
  },
};

// ------------------------------------------------------------------------------------------------ bearings

export const bearingSelect: Workflow<Record<string, number | string>, { bearing: string; hours: number }> = {
  id: 'bearing.select', name: 'Choose a bearing',
  goal: 'The smallest catalogued bearing (or pillow block) on the shaft that lasts the hours asked at the load and speed asked, and carries the load standing still.',
  asks: [q('load', 'radial load', 'N'), q('rpm', 'speed', 'rpm'), q('hours', 'life wanted', 'h', 5000), q('bore', 'shaft diameter', 'm', 0), q('minBore', 'or the least the shaft must be', 'm', 0), q('housed', 'in a pillow block (1) or bare (0)', '-', 0)],
  steps: ['For each one that fits the shaft: its rating life L10 = (C/P)³ million revolutions, in hours at the speed.', 'And its static rating at least the load.', 'The smallest that lasts.'],
  uses: { laws: ['bearing.life.l10', 'bearing.life.hours'], families: ['bearing', 'pillow block'], processes: ['bearing.fit'] }, tags: ['bearing', 'axle', 'wheel', 'shaft', 'pillow block'],
  run(spec) {
    const P = n(spec, 'load', 500), rpm = n(spec, 'rpm', 300), want = n(spec, 'hours', 5000), bore = n(spec, 'bore', 0), minBore = n(spec, 'minBore', 0), housed = n(spec, 'housed', 0) > 0;
    const trace: TraceStep[] = [];
    const pool: CatalogItem[] = housed ? PILLOW_BLOCKS : BEARINGS;
    // on a given shaft, its bore; for a shaft still to be sized, any bore at least as big as it must be
    const fits = (b: CatalogItem) => (bore ? Math.abs(Number(b.specs['bore']) - bore) < 1e-4 : Number(b.specs['bore']) >= minBore);
    const fit = pool.filter(fits).map((b) => {
      const L = apply('bearing.life.l10', { C: Number(b.specs['C']), P, p: 3 });
      return { b, hours: apply('bearing.life.hours', { L, n: rpm }) };
    }).filter((x) => x.hours >= want && Number(x.b.specs['C0']) >= P).sort((x, y) => Number(x.b.specs['bore']) - Number(y.b.specs['bore']) || Number(x.b.specs['C']) - Number(y.b.specs['C']));
    const best = fit[0];
    if (best) {
      const L = step(trace, 'bearing.life.l10', `${best.b.label} at ${P} N`, { C: Number(best.b.specs['C']), P, p: 3 }, 'rev');
      step(trace, 'bearing.life.hours', `at ${rpm} rpm`, { L, n: rpm }, 'h');
    }
    return {
      ok: !!best, choice: best ? { bearing: best.b.id, hours: best.hours } : null, trace, warnings: cautions(trace), parts: best ? [best.b.id] : [],
      alternatives: fit.slice(1, 3).map((x) => ({ choice: { bearing: x.b.id, hours: x.hours }, why: `${r3(x.hours)} h` })),
      summary: best ? `${best.b.label}: ${r3(best.hours)} h rating life at ${P} N and ${rpm} rpm (asked ${want} h).` : `No catalogued ${housed ? 'pillow block' : 'bearing'}${bore ? ` for a ${bore * 1000} mm shaft` : ''} lasts ${want} h at ${P} N and ${rpm} rpm.`,
    };
  },
};

// ------------------------------------------------------------------------------------------------ couplings, controllers, torque arms

export const couplingSelect: Workflow<Record<string, number | string>, { coupling: string }> = {
  id: 'coupling.select', name: 'Choose a shaft coupling',
  goal: 'The smallest jaw coupling whose rating covers the torque times a service factor, bored to both shafts.',
  asks: [q('torque', 'torque', 'N m'), q('bore', 'larger shaft', 'm'), q('sf', 'service factor', '-', 1.5)],
  steps: ['Torque times service factor (1.0 smooth electric drive, 1.5 moderate shocks, 2 and up heavy shocks).', 'The smallest whose nominal rating covers it and whose largest bore takes the shaft.'],
  uses: { laws: [], families: ['coupling'], processes: ['bore'] }, tags: ['coupling', 'shaft', 'motor'],
  run(spec) {
    const T = n(spec, 'torque', 5), d = n(spec, 'bore', 0.012), sf = n(spec, 'sf', 1.5);
    const fit = COUPLINGS.filter((c) => Number(c.specs['torque']) >= T * sf && Number(c.specs['maxBore']) >= d).sort((a, b) => Number(a.specs['torque']) - Number(b.specs['torque']));
    const best = fit[0];
    return {
      ok: !!best, choice: best ? { coupling: best.id } : null, trace: [], warnings: [], parts: best ? [best.id] : [],
      alternatives: fit.slice(1, 2).map((c) => ({ choice: { coupling: c.id }, why: `${r3(Number(c.specs['torque']))} N·m` })),
      summary: best ? `${best.label}: rated ${r3(Number(best.specs['torque']))} N·m against ${r3(T * sf)} N·m (×${sf}), bores to ${r3(Number(best.specs['maxBore']) * 1000)} mm.` : `No catalogued coupling carries ${r3(T * sf)} N·m on a ${d * 1000} mm shaft.`,
    };
  },
};

/**
 * A fuse for a battery circuit: above what it carries in normal running, below what its wire can carry, rated for the
 * circuit's voltage, and able to break the current a dead short would draw (the battery's voltage over its own
 * resistance and the wire's, out and back).
 */
export const fuseSelect: Workflow<Record<string, number | string>, { fuse: string; fault: number }> = {
  id: 'fuse.select', name: 'Choose a fuse',
  goal: 'The smallest catalogued fuse that runs cool at the load, blows before the wire it protects burns, and can break a dead short.',
  asks: [q('current', 'current in normal running', 'A'), q('ampacity', 'rating of the wire it protects', 'A'), q('voltage', 'highest circuit voltage (charged battery)', 'V', 26), q('sourceR', 'battery internal resistance', 'ohm', 0.05), q('wireR', 'wire resistance, out and back', 'ohm', 0.01)],
  steps: ['At least 125% of the current it carries (continuous loads, NEC 210.20).', 'No more than the wire\'s rating, so the wire is protected (NEC 240.4; ABYC E-11).', 'Rated for the circuit\'s highest voltage.', 'Its interrupting rating above the fault current: the battery\'s voltage over its resistance and the wire\'s (Ohm).'],
  uses: { laws: ['ohm', 'joule'], families: ['fuse', 'wire'], processes: ['crimp'] }, tags: ['fuse', 'protection', 'battery', 'wire', 'short circuit'],
  run(spec) {
    const I = n(spec, 'current', 10), amp = n(spec, 'ampacity', 20), V = n(spec, 'voltage', 26), R = n(spec, 'sourceR', 0.05) + n(spec, 'wireR', 0.01);
    const fault = V / R;
    const fit = FUSES.filter((f) => Number(f.specs['rating']) >= 1.25 * I && Number(f.specs['rating']) <= amp && Number(f.specs['voltage']) >= V && Number(f.specs['interrupt']) >= fault)
      .sort((a, b) => Number(a.specs['rating']) - Number(b.specs['rating']));
    const best = fit[0];
    const why = !best ? (1.25 * I > amp ? `125% of ${r3(I)} A is past the wire's ${amp} A: use a heavier wire` : fault > 1000 ? `a short would draw ${r3(fault)} A, past a blade fuse's 1000 A: it needs a higher-interrupting fuse I don't have catalogued` : `none catalogued between ${r3(1.25 * I)} and ${amp} A at ${r3(V)} V`) : '';
    return {
      ok: !!best, choice: best ? { fuse: best.id, fault } : null, trace: [], warnings: [], parts: best ? [best.id] : [],
      alternatives: fit.slice(1, 2).map((f) => ({ choice: { fuse: f.id, fault }, why: `${f.specs['rating']} A, closer to the wire's rating` })),
      summary: best ? `${best.label}: above 125% of ${r3(I)} A, within the wire's ${amp} A, and it can break the ${r3(fault)} A of a dead short (${r3(V)} V over ${r3(R * 1000)} mΩ). Fit it at the battery's terminal.` : `No fuse: ${why}.`,
    };
  },
};

/**
 * A pair of spur gears for a torque and a ratio: the smallest ISO 54 module whose pinion teeth (never fewer than a
 * 20° full-depth tooth needs to escape undercut) carry the tangential load at their roots within the material's yield
 * over a safety factor, by Lewis, with a face width of about ten modules.
 */
export const gearSize: Workflow<Record<string, number | string>, { module: number; z1: number; z2: number; d1: number; d2: number; b: number; stress: number }> = {
  id: 'gear.size', name: 'Size a pair of spur gears',
  goal: 'The smallest standard module whose teeth carry the pinion\'s torque within their material\'s yield over a safety factor.',
  asks: [q('torque', 'pinion torque', 'N m'), q('ratio', 'speed ratio', '-', 3), q('sf', 'safety factor', '-', 2), q('faceModules', 'face width, in modules', '-', 10)],
  steps: [`A pinion of at least ${MIN_TEETH} teeth, so a 20° full-depth tooth isn't undercut.`, 'For each ISO 54 module, smallest first: pitch diameter m z, tangential load 2 T / d, Lewis stress at the root.', 'The first whose stress is within the yield over the safety factor; the gear has ratio times the teeth.'],
  uses: { laws: ['gear.lewis', 'gear.output.torque'], families: [], processes: ['mill'] }, tags: ['gear', 'spur gear', 'module', 'tooth', 'gearbox'],
  run(spec) {
    const T = n(spec, 'torque', 10), ratio = n(spec, 'ratio', 3), sf = n(spec, 'sf', 2), k = n(spec, 'faceModules', 10);
    const mat = getMaterial(typeof spec['material'] === 'string' ? spec['material'] : 'steel.4140-ann');
    const z1 = Math.max(MIN_TEETH, Math.round(n(spec, 'teeth', MIN_TEETH))), z2 = Math.round(z1 * ratio), Y = lewisFormFactor(z1);
    const trace: TraceStep[] = [];
    for (const m of MODULES) {
      const d1 = m * z1, Wt = (2 * T) / d1, b = k * m;
      const stress = apply('gear.lewis', { Wt, b, m, Y });
      if (stress <= mat.yield / sf) {
        step(trace, 'gear.lewis', `root stress of the ${z1}-tooth pinion at module ${m * 1000} mm`, { Wt, b, m, Y }, 'Pa');
        return {
          ok: true, choice: { module: m, z1, z2, d1, d2: m * z2, b, stress }, trace, warnings: cautions(trace), parts: [], alternatives: [],
          summary: `Module ${m * 1000} mm: a ${z1}-tooth pinion (Ø${r3(d1 * 1000)} mm) and a ${z2}-tooth gear (Ø${r3(m * z2 * 1000)} mm), ${r3(b * 1000)} mm wide, in ${mat.name.toLowerCase()}: ${r3(stress / 1e6)} MPa at the root against ${r3(mat.yield / 1e6 / sf)} MPa allowed (yield over ${sf}). Centres ${r3(((d1 + m * z2) / 2) * 1000)} mm apart.`,
        };
      }
    }
    return { ok: false, choice: null, trace, warnings: [], parts: [], alternatives: [], summary: `No ISO 54 first-choice module up to ${MODULES.at(-1)! * 1000} mm carries ${T} N·m in ${mat.name.toLowerCase()}: a stronger steel or a wider face.` };
  },
};

/**
 * A frame member from stock: the lightest square hollow section that carries a load within its yield over a safety
 * factor and sags no more than its span over a ratio, held at both ends with the load in the middle, or held at one
 * end with the load at the other.
 */
export const memberSize: Workflow<Record<string, number | string>, { section: string; stress: number; sag: number; mass: number }> = {
  id: 'member.size', name: 'Size a frame member',
  goal: 'The lightest stocked hollow section that carries the load strongly and stiffly enough.',
  asks: [q('span', 'span', 'm'), q('load', 'load', 'N'), q('cantilever', 'held at one end (1) or both (0)', '-', 0), q('sf', 'safety factor on yield', '-', 2), q('sagRatio', 'span over the sag allowed', '-', 250)],
  steps: ['The bending moment: P L / 4 between two supports, P L held at one end.', 'Each stocked section, lightest first: its stress M / S and its sag.', 'The first within the yield over the safety factor and the sag limit.'],
  uses: { laws: ['stress.bending', 'beam.simply-supported.point', 'beam.cantilever.point'], families: ['hollow section'], processes: ['saw', 'weld.mig'] }, tags: ['frame', 'beam', 'member', 'tube', 'chassis', 'structure'],
  run(spec) {
    const L = n(spec, 'span', 0.6), P = n(spec, 'load', 1000), canti = n(spec, 'cantilever', 0) > 0, sf = n(spec, 'sf', 2), ratio = n(spec, 'sagRatio', 250);
    const M = canti ? P * L : (P * L) / 4, E = 200e9;
    const sorted = [...HOLLOW_SECTIONS].sort((a, b2) => Number(a.specs['massPerM']) - Number(b2.specs['massPerM']));
    const trace: TraceStep[] = [];
    for (const c of sorted) {
      const S = Number(c.specs['S']), I = Number(c.specs['I']), Sy = Number(c.specs['yield']);
      const stress = apply('stress.bending', { M, S });
      const sag = apply(canti ? 'beam.cantilever.point' : 'beam.simply-supported.point', { P, L, E, I });
      if (stress <= Sy / sf && sag <= L / ratio) {
        step(trace, 'stress.bending', `stress in ${c.id}`, { M, S }, 'Pa');
        step(trace, canti ? 'beam.cantilever.point' : 'beam.simply-supported.point', `sag of ${c.id}`, { P, L, E, I }, 'm');
        const mass = Number(c.specs['massPerM']) * L;
        return {
          ok: true, choice: { section: c.id, stress, sag, mass }, trace, warnings: cautions(trace), parts: [c.id], alternatives: [],
          summary: `${c.label}, ${r3(L * 1000)} mm long (${r3(mass)} kg): ${r3(stress / 1e6)} MPa against ${r3(Sy / sf / 1e6)} MPa allowed, sagging ${r3(sag * 1000)} mm (limit ${r3((L / ratio) * 1000)} mm).`,
        };
      }
    }
    return { ok: false, choice: null, trace, warnings: [], parts: [], alternatives: [], summary: `No stocked section up to ${HOLLOW_SECTIONS.at(-1)!.label} carries ${r3(P)} N over ${r3(L * 1000)} mm: shorten the span or share the load.` };
  },
};

/**
 * A strut from stock: the lightest square hollow section that carries a push along its length without yielding or
 * buckling (Euler for slender struts, Johnson's parabola for stocky ones), pinned at both ends unless told otherwise.
 */
export const strutSize: Workflow<Record<string, number | string>, { section: string; stress: number; buckling: number; mass: number }> = {
  id: 'strut.size', name: 'Size a strut',
  goal: 'The lightest stocked hollow section that carries a push along its length without yielding or buckling.',
  asks: [q('length', 'length between its joints', 'm'), q('load', 'push along it', 'N'), q('K', 'effective length factor', '-', 1), q('sf', 'safety factor', '-', 2.5)],
  steps: ['Each stocked section, lightest first: its stress F / A against yield.', 'Its buckling load, by Euler past its slenderness transition and Johnson below it.', 'The first that carries the push times the safety factor both ways.'],
  uses: { laws: ['stress.axial', 'buckling.euler', 'buckling.johnson', 'slenderness.transition'], families: ['hollow section'], processes: ['saw', 'weld.mig'] }, tags: ['strut', 'column', 'dome', 'truss', 'leg', 'structure', 'compression'],
  run(spec) {
    const L = n(spec, 'length', 1), F = n(spec, 'load', 1000), K = n(spec, 'K', 1), sf = n(spec, 'sf', 2.5), E = 200e9;
    const sorted = [...HOLLOW_SECTIONS].sort((a, b2) => Number(a.specs['massPerM']) - Number(b2.specs['massPerM']));
    const trace: TraceStep[] = [];
    for (const c of sorted) {
      const A = Number(c.specs['area']), I = Number(c.specs['I']), Sy = Number(c.specs['yield']);
      const stress = apply('stress.axial', { F, A });
      const rg = Math.sqrt(I / A), slender = (K * L) / rg, transition = apply('slenderness.transition', { E, Sy });
      const crit = slender >= transition ? apply('buckling.euler', { E, I, L, K }) : apply('buckling.johnson', { Sy, A, L, K, r: rg, E });
      if (stress <= Sy / sf && crit >= F * sf) {
        step(trace, 'stress.axial', `stress in ${c.id}`, { F, A }, 'Pa');
        if (slender >= transition) step(trace, 'buckling.euler', `buckling load of ${c.id}`, { E, I, L, K }, 'N');
        else step(trace, 'buckling.johnson', `buckling load of ${c.id}`, { Sy, A, L, K, r: rg, E }, 'N');
        const mass = Number(c.specs['massPerM']) * L;
        return {
          ok: true, choice: { section: c.id, stress, buckling: crit, mass }, trace, warnings: cautions(trace), parts: [c.id], alternatives: [],
          summary: `${c.label}, ${r3(L * 1000)} mm long (${r3(mass)} kg): ${r3(stress / 1e6)} MPa against ${r3(Sy / sf / 1e6)} MPa allowed; it buckles at ${r3(crit / 1000)} kN, ${r3(crit / F)} times the push.`,
        };
      }
    }
    return { ok: false, choice: null, trace, warnings: [], parts: [], alternatives: [], summary: `No stocked section up to ${HOLLOW_SECTIONS.at(-1)!.label} carries ${r3(F)} N over ${r3(L * 1000)} mm without buckling: brace it or share the push.` };
  },
};

export const controllerSelect: Workflow<Record<string, number | string>, { controller: string; count: number }> = {
  id: 'controller.select', name: 'Choose a motor controller',
  goal: 'A brushed DC controller that takes the pack\'s full voltage and the motors\' current, with a current limit when one is asked for.',
  asks: [q('voltage', 'pack voltage, fully charged', 'V'), q('current', 'continuous current a motor', 'A'), q('motors', 'motors', '-', 1), q('limit', 'needs a settable current limit (1) or not (0)', '-', 1)],
  steps: ['Its top voltage above the charged pack\'s.', 'Its continuous current at least each motor\'s.', 'A current limit, when asked: without one a stalled motor draws its full stall current.'],
  uses: { laws: ['motor.current'], families: ['motor controller'], processes: [] }, tags: ['controller', 'motor', 'pwm'],
  run(spec) {
    const V = n(spec, 'voltage', 26), I = n(spec, 'current', 10), k = n(spec, 'motors', 1), lim = n(spec, 'limit', 1) > 0;
    const fit = CONTROLLERS.filter((c) => Number(c.specs['vMax']) >= V && Number(c.specs['continuous']) >= I && (!lim || c.specs['currentLimit'] === 'yes'))
      .map((c) => ({ c, count: Math.ceil(k / Number(c.specs['channels'])) })).sort((a, b) => a.count - b.count);
    const best = fit[0];
    return {
      ok: !!best, choice: best ? { controller: best.c.id, count: best.count } : null, trace: [], warnings: [], parts: best ? [best.c.id] : [],
      alternatives: fit.slice(1).map((x) => ({ choice: { controller: x.c.id, count: x.count }, why: x.c.label })),
      summary: best ? `${best.count} × ${best.c.label}: to ${best.c.specs['vMax']} V, ${best.c.specs['continuous']} A continuous a channel.` : `No catalogued controller takes ${V} V and ${I} A${lim ? ' with a current limit' : ''}.`,
    };
  },
};

export const torqueArmSize: Workflow<Record<string, number | string>, { rodEnd: string; rod: number; force: number }> = {
  id: 'torquearm.size', name: 'Size a torque arm',
  goal: 'A tie rod with rod ends that holds a housing against its reaction torque: rated for the push without buckling.',
  asks: [q('torque', 'reaction torque', 'N m'), q('radius', 'arm radius from the axis', 'm'), q('length', 'rod length', 'm'), q('n', 'safety factor', '-', 3)],
  steps: ['The force on the rod: the torque over its radius.', 'A rod end whose static rating covers it with the factor.', 'The thinnest stocked rod that neither yields nor buckles (pinned at both ends).'],
  uses: { laws: ['buckling.euler', 'buckling.johnson', 'slenderness.transition'], families: ['rod end'], processes: ['saw', 'tap'] }, tags: ['torque arm', 'tie rod', 'rod end', 'motor mount'],
  run(spec) {
    const T = n(spec, 'torque', 5), rr = n(spec, 'radius', 0.04), L = n(spec, 'length', 0.05), sf = n(spec, 'n', 3);
    const trace: TraceStep[] = [];
    const F = T / rr;
    const steel = getMaterial('steel.1018-cd');
    const end = ROD_ENDS.find((e) => Number(e.specs['C0']) >= F * sf);
    let rod: number | null = null;
    const transition = apply('slenderness.transition', { E: steel.E, Sy: steel.yield });
    for (const d of ROUND_BAR) {
      // a pinned strut buckles by Euler when slender, by Johnson (yielding as it bows) when stocky
      const A = (Math.PI / 4) * d * d, I = (Math.PI * d ** 4) / 64, rg = d / 4;
      const slender = L / rg >= transition;
      const P = slender ? apply('buckling.euler', { E: steel.E, I, L, K: 1 }) : apply('buckling.johnson', { A, Sy: steel.yield, E: steel.E, K: 1, L, r: rg });
      if (P >= F * sf) {
        rod = d;
        if (slender) step(trace, 'buckling.euler', `Ø${d * 1000} mm rod ${L * 1000} mm long (slenderness ${r3(L / rg)}, past ${r3(transition)})`, { E: steel.E, I, L, K: 1 }, 'N');
        else step(trace, 'buckling.johnson', `Ø${d * 1000} mm rod ${L * 1000} mm long (slenderness ${r3(L / rg)}, below ${r3(transition)}: it yields before it buckles)`, { A, Sy: steel.yield, E: steel.E, K: 1, L, r: rg }, 'N');
        break;
      }
    }
    const ok = !!end && rod !== null;
    return {
      ok, choice: ok ? { rodEnd: end!.id, rod: rod!, force: F } : null, trace, warnings: cautions(trace), parts: end ? [end.id] : [], alternatives: [],
      summary: ok ? `${r3(F)} N on the arm: a Ø${rod! * 1000} mm steel rod with ${end!.label} at each end (static ${r3(Number(end!.specs['C0']))} N).` : `${r3(F)} N on the arm is more than the catalogued rod ends take at ${sf}×: a longer arm (less force) or a bigger rod end.`,
    };
  },
};

// ------------------------------------------------------------------------------------------------ a whole drivetrain

export interface PowertrainChoice {
  drive: DriveChoice;
  wire: WireChoice | null;
  coupling: string | null;
  torqueArm: { rodEnd: string; rod: number; force: number } | null;
  bearing: string | null;
  fuse: string | null;
  axle: number | null;
  axleMaterial: string | null;
  /** What each drive carries: torque at the gearhead's output at the current limit (N m), each driven wheel's load (N). */
  torque: number;
  wheelLoad: number;
  /** Each bought item and how many. */
  bill: { id: string; count: number }[];
  /** What the priced items come to, by currency. */
  cost: Record<string, number>;
  /** An actuator's lead screw, when it pushes: the screw, the torque and speed it is turned at, its efficiency, and whether it holds its load unpowered. */
  screw?: { item: string; force: number; torque: number; rpm: number; efficiency: number; holds: boolean } | null;
}

/** What every electric drive needs after its motor: wire for its current limit, the fuse that protects it, the coupling and torque arm for the torque at its output. */
function accessories(c: DriveChoice, run: number) {
  const md = MOTORS[c.motor]!, mm = motorModel(md), gh = c.gearhead ? GEARHEADS[c.gearhead]! : null, bat = BATTERIES[c.battery]!;
  const Tout = mm.Kt * (c.currentLimit - mm.I0) * (gh?.ratio ?? 1) * (gh?.efficiency ?? 1);
  const wire = wireSize.run({ current: c.currentLimit, length: run, voltage: bat.V * c.series, fused: 1 });
  const fuse = fuseSelect.run({ current: c.currentLimit, ampacity: wire.choice?.ampacity ?? 0, voltage: packOCV({ data: bat, series: c.series, parallel: 1 }, 1), sourceR: bat.internalR * c.series, wireR: wire.choice ? 2 * run * WIRE_GAUGES[wire.choice.gauge]!.ohmPerM : 0 });
  const coupling = couplingSelect.run({ torque: Tout, bore: gh?.shaft ?? md.shaft, sf: 1.5 });
  const arm = torqueArmSize.run({ torque: Tout, radius: 0.04, length: 0.04 });
  return { Tout, wire, fuse, coupling, arm };
}

/** Each bought item of a drive and how many. */
function billOf(c: DriveChoice, k: number, wire: WorkflowResult<WireChoice>, fuse: WorkflowResult<{ fuse: string }>, coupling: WorkflowResult<{ coupling: string }>, arm: WorkflowResult<{ rodEnd: string }>, more: { id: string; count: number }[]) {
  return [
    { id: c.motor, count: k }, ...(c.gearhead ? [{ id: c.gearhead, count: k }] : []), { id: c.battery, count: c.series }, { id: c.controller, count: c.controllers },
    ...(wire.choice ? [{ id: `awg.${wire.choice.gauge}`, count: k }] : []), ...(fuse.choice ? [{ id: fuse.choice.fuse, count: k }] : []), ...(coupling.choice ? [{ id: coupling.choice.coupling, count: k }] : []),
    ...(arm.choice ? [{ id: arm.choice.rodEnd, count: 2 * k }] : []), ...more,
  ];
}

/** What the priced items of a bill come to, by currency. */
function costOf(bill: { id: string; count: number }[]): Record<string, number> {
  const cost: Record<string, number> = {};
  const priced = [...Object.values(MOTORS), ...Object.values(GEARHEADS), ...Object.values(BATTERIES)];
  for (const b of bill) { const p = priced.find((x) => x.id === b.id)?.price; if (p) cost[p.currency] = (cost[p.currency] ?? 0) + p.amount * b.count; }
  return cost;
}

/**
 * One question, a whole drivetrain: the drive first (motors, gearheads, pack, controller), then each part it implies,
 * sized from the drive's own numbers. The wire from its current limit, the coupling and torque arm from the torque
 * at the gearhead's output, the wheel bearings from each wheel's load and speed, the axle from its torque and the
 * wheel's overhang.
 */
export const powertrain: Workflow<Record<string, number | string>, PowertrainChoice> = {
  id: 'powertrain.design', name: 'Design a whole drivetrain',
  goal: 'Every part a vehicle\'s drive needs, chosen from the catalogue and sized from one another: drive, wiring, fuses, couplings, torque arms, wheel bearings and axles.',
  asks: [...driveSelect.asks, q('wire', 'wire run, pack to motor', 'm', 1), q('overhang', 'wheel centre to its bearing', 'm', 0.06), q('hours', 'bearing life wanted', 'h', 1000)],
  steps: ['Choose the drive (drive.select).', 'Size the wire for its current limit (wire.size), and the fuse that protects it (fuse.select).', 'The gearhead\'s output torque at that limit sizes the coupling (coupling.select) and the torque arm (torquearm.size).', 'Each driven wheel\'s load and speed choose its bearing (bearing.select, housed).', 'Its torque and the wheel\'s overhang size the axle (shaft.size).', 'Count what to buy, and what the priced parts cost.'],
  uses: { laws: [...driveSelect.uses.laws, 'wire.drop', 'bearing.life.l10', 'shaft.diameter.static', 'buckling.euler'], families: ['dc motor', 'gearhead', 'battery', 'motor controller', 'wire', 'fuse', 'coupling', 'rod end', 'pillow block'], processes: ['crimp', 'bore', 'split-clamp', 'bearing.fit', 'turn'] },
  tags: ['vehicle', 'kart', 'drivetrain', 'powertrain', 'robot', 'drive'],
  run(spec) {
    const d = driveSelect.run(spec);
    if (!d.ok || !d.choice) return { ...d, choice: null, alternatives: [] };
    const c = d.choice;
    const k = Math.max(1, Math.round(n(spec, 'motors', 2))), m = n(spec, 'mass', 100), r = n(spec, 'wheelRadius', 0.125), share = n(spec, 'driven', 0.5);
    const { Tout, wire, fuse, coupling, arm } = accessories(c, n(spec, 'wire', 1));
    const wheelLoad = (m * g * share) / k, rpm = (c.topSpeed / r) * (60 / (2 * Math.PI));
    // the axle as strength needs it, then the bearing it runs in (bored at least that), and the axle is made to that bore
    const strength = shaftSize.run({ T: Tout, M: wheelLoad * n(spec, 'overhang', 0.06), n: 2 });
    const bearing = bearingSelect.run({ load: wheelLoad, rpm, hours: n(spec, 'hours', 1000), minBore: strength.choice?.least ?? 0, housed: 1 });
    const bore = bearing.choice ? Number(PILLOW_BLOCKS.find((b) => b.id === bearing.choice!.bearing)!.specs['bore']) : null;
    const axle: WorkflowResult<{ diameter: number; least: number; material: string }> = bore && strength.choice
      ? { ...strength, choice: { ...strength.choice, diameter: bore }, summary: `Ø${bore * 1000} mm ${getMaterial(strength.choice.material).name} bar, the bearing's bore (strength needs ${r3(strength.choice.least * 1000)} mm).` }
      : strength;
    const bill = billOf(c, k, wire, fuse, coupling, arm, bearing.choice ? [{ id: bearing.choice.bearing, count: k }] : []);
    const cost = costOf(bill);
    const all = [d, wire, fuse, coupling, arm, bearing, axle];
    const choice: PowertrainChoice = {
      drive: c, wire: wire.choice, fuse: fuse.choice?.fuse ?? null, coupling: coupling.choice?.coupling ?? null, torqueArm: arm.choice, bearing: bearing.choice?.bearing ?? null,
      axle: axle.choice?.diameter ?? null, axleMaterial: axle.choice?.material ?? null, torque: Tout, wheelLoad, bill, cost,
    };
    return {
      ok: all.every((x) => x.ok), choice, alternatives: [], parts: bill.map((b) => b.id),
      trace: all.flatMap((x) => x.trace), warnings: all.flatMap((x) => x.warnings),
      summary: [d.summary, wire.summary, fuse.summary, coupling.summary, arm.summary, bearing.summary, `Axle: ${axle.summary}`].join(' ')
        + (Object.keys(cost).length ? ` The priced parts come to ${Object.entries(cost).map(([cur, v]) => `${cur} ${v.toFixed(2)}`).join(' + ')}.` : ''),
    };
  },
};

/**
 * An electric actuator for any job, not only a vehicle's: a shaft turned at a torque and speed, or a push at a force
 * and speed through a lead screw. The screw first, when it pushes: the smallest that carries the push in its core,
 * doesn't buckle over the stroke and keeps its nut's bearing pressure; its efficiency and lead set the torque and
 * speed it must be turned at. Then the same drive search a vehicle's uses, at that torque and speed, and the same
 * wire, fuse, coupling and torque arm.
 */
export const actuatorDesign: Workflow<Record<string, number | string>, PowertrainChoice> = {
  id: 'actuator.design', name: 'Design an electric actuator',
  goal: 'Motor, gearhead, pack, controller, wiring and fuse that turn a shaft at the torque and speed asked, or push at the force and speed asked through a lead screw.',
  asks: [q('torque', 'torque at the output shaft', 'N m', 5), q('rpm', 'output speed', 'rpm', 60), q('force', 'push wanted (through a lead screw when given)', 'N', 0), q('speed', 'push speed', 'm/s', 0.01),
    q('stroke', 'stroke', 'm', 0.3), q('motors', 'motors', '-', 1), q('peak', 'starting over running torque', '-', 1.5), q('sf', 'safety factor on the screw', '-', 2), q('wire', 'wire run, pack to motor', 'm', 1)],
  steps: ['Pushing: each stocked lead screw, smallest first, for its core stress, its buckling over the stroke (pinned at both ends) and its nut\'s bearing pressure.', 'Its efficiency from its lead and friction; the torque it needs (F l / 2π η) and the speed (v / l).', 'The drive search, at that torque (running and starting) and speed.', 'Wire, fuse, coupling and torque arm from the drive\'s own numbers.'],
  uses: { laws: ['screw.efficiency', 'screw.force', 'stress.axial', 'buckling.euler', 'motor.torque', 'motor.current', 'motor.back-emf', 'wire.drop'], families: ['lead screw', 'dc motor', 'gearhead', 'battery', 'motor controller', 'wire', 'fuse', 'coupling', 'rod end'], processes: ['saw', 'turn', 'crimp', 'bore'] },
  tags: ['actuator', 'linear actuator', 'drill', 'lift', 'jack', 'motor', 'robot', 'furniture'],
  run(spec) {
    const trace: TraceStep[] = [], warnings: string[] = [];
    const F = n(spec, 'force', 0), v = n(spec, 'speed', 0.01), L = n(spec, 'stroke', 0.3), sf = n(spec, 'sf', 2), k = Math.max(1, Math.round(n(spec, 'motors', 1))), peak = n(spec, 'peak', 1.5);
    let T = n(spec, 'torque', 5), rpm = n(spec, 'rpm', 60);
    let screw: PowertrainChoice['screw'] = null;
    if (F > 0) {
      const per = F / k;
      const fit = LEAD_SCREWS.find((c) => {
        const d3 = Number(c.specs['d3']), d2 = Number(c.specs['d2']), P = Number(c.specs['pitch']), A = (Math.PI / 4) * d3 * d3, I = (Math.PI / 64) * d3 ** 4;
        const bearing = per / (Math.PI * d2 * (P / 2) * (Number(c.specs['nutLength']) / P));
        return apply('stress.axial', { F: per, A }) <= Number(c.specs['yield']) / sf && apply('buckling.euler', { E: 200e9, I, L, K: 1 }) >= per * sf && bearing <= Number(c.specs['bearing']);
      });
      if (!fit) return { ok: false, choice: null, trace, warnings, parts: [], alternatives: [], summary: `No stocked lead screw up to ${LEAD_SCREWS.at(-1)!.label} pushes ${r3(per)} N over a ${r3(L * 1000)} mm stroke: shorten the stroke, guide the nut, or share the push between more screws.` };
      const d3 = Number(fit.specs['d3']), l = Number(fit.specs['lead']);
      step(trace, 'stress.axial', `stress in ${fit.id}'s core`, { F: per, A: (Math.PI / 4) * d3 * d3 }, 'Pa');
      step(trace, 'buckling.euler', `${fit.id} over the stroke`, { E: 200e9, I: (Math.PI / 64) * d3 ** 4, L, K: 1 }, 'N');
      const eta = step(trace, 'screw.efficiency', `${fit.id} raising its load`, { l, d2: Number(fit.specs['d2']), mu: Number(fit.specs['mu']), alpha: (15 * Math.PI) / 180 }, '-');
      T = (per * l) / (2 * Math.PI * eta);
      step(trace, 'screw.force', 'the push that torque gives back', { T, eta, l }, 'N');
      rpm = (v / l) * 60;
      screw = { item: fit.id, force: per, torque: T, rpm, efficiency: eta, holds: eta < 0.5 };
      if (!screw.holds) warnings.push(`${fit.label} is ${r3(eta * 100)}% efficient: it runs back under its load, so it needs a brake.`);
    }
    const w = (rpm * 2 * Math.PI) / 60;
    const options = searchDrives(T * peak, T, w, 1, k, -1, (x) => `${r3((x * 60) / (2 * Math.PI))} rpm`);
    const best = options[0];
    if (!best) return { ok: false, choice: null, trace, warnings, parts: [], alternatives: [], summary: `Nothing in the catalogue turns ${r3(T)} N·m at ${r3(rpm)} rpm${screw ? ` (to turn ${screw.item} for ${r3(F)} N)` : ''}: a bigger motor in the catalogue, or share the job.` };
    const c = best.choice;
    const { wire, fuse, coupling, arm } = accessories(c, n(spec, 'wire', 1));
    const bill = billOf(c, k, wire, fuse, coupling, arm, screw ? [{ id: screw.item, count: k }] : []);
    const all = [wire, fuse, coupling, arm];
    const choice: PowertrainChoice = {
      drive: c, wire: wire.choice, fuse: fuse.choice?.fuse ?? null, coupling: coupling.choice?.coupling ?? null, torqueArm: arm.choice, bearing: null, axle: null, axleMaterial: null,
      torque: T, wheelLoad: 0, bill, cost: costOf(bill), screw,
    };
    const drive = `${k} × ${MOTORS[c.motor]!.label}${c.gearhead ? ` with ${GEARHEADS[c.gearhead]!.label}` : ''}, on ${c.series} × ${BATTERIES[c.battery]!.label}, through ${CONTROLLERS.find((x) => x.id === c.controller)!.label} limited to ${c.currentLimit} A: ${best.why}.`;
    return {
      ok: all.every((x) => x.ok), choice, alternatives: options.slice(1, 4).map((o) => ({ choice: { ...choice, drive: o.choice }, why: o.why })), parts: bill.map((b) => b.id),
      trace: [...trace, ...all.flatMap((x) => x.trace)], warnings: [...warnings, ...cautions(trace), ...all.flatMap((x) => x.warnings)],
      summary: [screw ? `${LEAD_SCREWS.find((x) => x.id === screw.item)!.label}: ${r3(screw.efficiency * 100)}% efficient, turned at ${r3(T)} N·m and ${r3(rpm)} rpm to push ${r3(F / k)} N at ${r3(v * 1000)} mm/s${screw.holds ? '; it holds its load unpowered' : ''}.` : `${r3(T)} N·m at ${r3(rpm)} rpm.`, drive, wire.summary, fuse.summary, coupling.summary, arm.summary].join(' '),
    };
  },
};

export const WORKFLOWS: Workflow[] = [powertrain, driveSelect, wireSize, fuseSelect, batterySize, shaftSize, bearingSelect, couplingSelect, controllerSelect, torqueArmSize, gearSize, memberSize, strutSize, actuatorDesign] as unknown as Workflow[];
export const workflowById = (id: string) => WORKFLOWS.find((w) => w.id === id);
export type { WorkflowResult };

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
import { BEARINGS, CONTROLLERS, COUPLINGS, PILLOW_BLOCKS, ROD_ENDS } from './parts';
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
    type Option = { choice: DriveChoice; score: number; why: string; cost: number };
    const options: Option[] = [];
    for (const md of Object.values(MOTORS)) {
      const mm = motorModel(md);
      const gears: (GearheadData | null)[] = [null, ...Object.values(GEARHEADS).filter((x) => x.fits.includes(md.id))];
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
              why: `${r3(o.topSpeed)} m/s top, ${r3(o.pushCurrent)} A a motor to push, ${r3(o.cruiseCurrent)} A cruising (rated ${md.maxContinuousCurrent} A)${limits ? '' : '; its controller has no current limit, so a stall draws the motor\'s full stall current'}`,
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
    options.sort((x, y) => y.score - x.score);
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
  asks: [q('current', 'current', 'A'), q('length', 'run length, one way', 'm'), q('voltage', 'supply', 'V', 24), q('drop', 'allowed drop', '-', 0.03)],
  steps: ['Each gauge from thinnest: is its chassis rating at least the current?', 'Does twice the run times its resistance per metre times the current drop less than the allowed share?', 'The first that passes both.'],
  uses: { laws: ['wire.drop', 'joule', 'wire.resistance'], families: ['wire'], processes: ['crimp'] }, tags: ['wire', 'cable', 'battery', 'motor'],
  run(spec) {
    const I = n(spec, 'current', 10), L = n(spec, 'length', 1), V = n(spec, 'voltage', 24), share = n(spec, 'drop', 0.03);
    const trace: TraceStep[] = [];
    const gauges = Object.entries(WIRE_GAUGES).sort((a, b) => a[1].area - b[1].area);
    const fits: WireChoice[] = [];
    for (const [gauge, w] of gauges) {
      const drop = apply('wire.drop', { I, L, Rm: w.ohmPerM });
      if (w.ampacity >= I && drop <= share * V) fits.push({ gauge, drop, loss: apply('joule', { I, R: 2 * L * w.ohmPerM }), ampacity: w.ampacity });
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
  axle: number | null;
  /** Each bought item and how many. */
  bill: { id: string; count: number }[];
  /** What the priced items come to, by currency. */
  cost: Record<string, number>;
}

/**
 * One question, a whole drivetrain: the drive first (motors, gearheads, pack, controller), then each part it implies,
 * sized from the drive's own numbers. The wire from its current limit, the coupling and torque arm from the torque
 * at the gearhead's output, the wheel bearings from each wheel's load and speed, the axle from its torque and the
 * wheel's overhang.
 */
export const powertrain: Workflow<Record<string, number | string>, PowertrainChoice> = {
  id: 'powertrain.design', name: 'Design a whole drivetrain',
  goal: 'Every part a vehicle\'s drive needs, chosen from the catalogue and sized from one another: drive, wiring, couplings, torque arms, wheel bearings and axles.',
  asks: [...driveSelect.asks, q('wire', 'wire run, pack to motor', 'm', 1), q('overhang', 'wheel centre to its bearing', 'm', 0.06), q('hours', 'bearing life wanted', 'h', 1000)],
  steps: ['Choose the drive (drive.select).', 'Size the wire for its current limit (wire.size).', 'The gearhead\'s output torque at that limit sizes the coupling (coupling.select) and the torque arm (torquearm.size).', 'Each driven wheel\'s load and speed choose its bearing (bearing.select, housed).', 'Its torque and the wheel\'s overhang size the axle (shaft.size).', 'Count what to buy, and what the priced parts cost.'],
  uses: { laws: [...driveSelect.uses.laws, 'wire.drop', 'bearing.life.l10', 'shaft.diameter.static', 'buckling.euler'], families: ['dc motor', 'gearhead', 'battery', 'motor controller', 'wire', 'coupling', 'rod end', 'pillow block'], processes: ['crimp', 'bore', 'split-clamp', 'bearing.fit', 'turn'] },
  tags: ['vehicle', 'kart', 'drivetrain', 'powertrain', 'robot', 'drive'],
  run(spec) {
    const d = driveSelect.run(spec);
    if (!d.ok || !d.choice) return { ...d, choice: null, alternatives: [] };
    const c = d.choice, md = MOTORS[c.motor]!, mm = motorModel(md), gh = c.gearhead ? GEARHEADS[c.gearhead]! : null;
    const k = Math.max(1, Math.round(n(spec, 'motors', 2))), m = n(spec, 'mass', 100), r = n(spec, 'wheelRadius', 0.125), share = n(spec, 'driven', 0.5);
    const Tout = mm.Kt * (c.currentLimit - mm.I0) * (gh?.ratio ?? 1) * (gh?.efficiency ?? 1);
    const shaft = gh?.shaft ?? md.shaft;
    const wire = wireSize.run({ current: c.currentLimit, length: n(spec, 'wire', 1), voltage: BATTERIES[c.battery]!.V * c.series });
    const coupling = couplingSelect.run({ torque: Tout, bore: shaft, sf: 1.5 });
    const arm = torqueArmSize.run({ torque: Tout, radius: 0.04, length: 0.04 });
    const wheelLoad = (m * g * share) / k, rpm = (c.topSpeed / r) * (60 / (2 * Math.PI));
    // the axle as strength needs it, then the bearing it runs in (bored at least that), and the axle is made to that bore
    const strength = shaftSize.run({ T: Tout, M: wheelLoad * n(spec, 'overhang', 0.06), n: 2 });
    const bearing = bearingSelect.run({ load: wheelLoad, rpm, hours: n(spec, 'hours', 1000), minBore: strength.choice?.least ?? 0, housed: 1 });
    const bore = bearing.choice ? Number(PILLOW_BLOCKS.find((b) => b.id === bearing.choice!.bearing)!.specs['bore']) : null;
    const axle: WorkflowResult<{ diameter: number; least: number; material: string }> = bore && strength.choice
      ? { ...strength, choice: { ...strength.choice, diameter: bore }, summary: `Ø${bore * 1000} mm ${getMaterial(strength.choice.material).name} bar, the bearing's bore (strength needs ${r3(strength.choice.least * 1000)} mm).` }
      : strength;
    const bill = [
      { id: c.motor, count: k }, ...(c.gearhead ? [{ id: c.gearhead, count: k }] : []), { id: c.battery, count: c.series }, { id: c.controller, count: c.controllers },
      ...(wire.choice ? [{ id: `awg.${wire.choice.gauge}`, count: k }] : []), ...(coupling.choice ? [{ id: coupling.choice.coupling, count: k }] : []),
      ...(arm.choice ? [{ id: arm.choice.rodEnd, count: 2 * k }] : []), ...(bearing.choice ? [{ id: bearing.choice.bearing, count: k }] : []),
    ];
    const cost: Record<string, number> = {};
    const priced = [...Object.values(MOTORS), ...Object.values(GEARHEADS), ...Object.values(BATTERIES)];
    for (const b of bill) { const p = priced.find((x) => x.id === b.id)?.price; if (p) cost[p.currency] = (cost[p.currency] ?? 0) + p.amount * b.count; }
    const all = [d, wire, coupling, arm, bearing, axle];
    const choice: PowertrainChoice = {
      drive: c, wire: wire.choice, coupling: coupling.choice?.coupling ?? null, torqueArm: arm.choice, bearing: bearing.choice?.bearing ?? null,
      axle: axle.choice?.diameter ?? null, bill, cost,
    };
    return {
      ok: all.every((x) => x.ok), choice, alternatives: [], parts: bill.map((b) => b.id),
      trace: all.flatMap((x) => x.trace), warnings: all.flatMap((x) => x.warnings),
      summary: [d.summary, wire.summary, coupling.summary, arm.summary, bearing.summary, `Axle: ${axle.summary}`].join(' ')
        + (Object.keys(cost).length ? ` The priced parts come to ${Object.entries(cost).map(([cur, v]) => `${cur} ${v.toFixed(2)}`).join(' + ')}.` : ''),
    };
  },
};

export const WORKFLOWS: Workflow[] = [powertrain, driveSelect, wireSize, batterySize, shaftSize, bearingSelect, couplingSelect, controllerSelect, torqueArmSize] as unknown as Workflow[];
export const workflowById = (id: string) => WORKFLOWS.find((w) => w.id === id);
export type { WorkflowResult };

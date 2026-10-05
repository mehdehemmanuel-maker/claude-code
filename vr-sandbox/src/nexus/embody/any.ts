// Embodiment of anything (docs/NEXUS-FROM-REALITY.md, section 29): what the generator derived for any ask, built as
// hardware from what it derived, not from what the thing is called. The generator's elements say what must happen —
// a region moves on the ground or through the air, charge is stored and turned into motion, heat is supplied across
// a boundary of some area, members of a section span between support lines, water flows in along a path, air is
// exchanged for what the people breathe out, a quantity is observed and modulated — and each kind of element has a
// designer that sizes real parts from a law:
//
//   on the ground   F = m a + C_rr m g + m g grade, F = C_rr m g + ½ ρ C_d A v²: wheels from load and the step they
//                   climb, a motor for each driven wheel (src/nexus/embody/motor.ts) through a belt, sized for its
//                   continuous torque with its peak a short-time duty, a disc and caliper at each wheel from the
//                   energy of a stop, rails of a section that holds the load between the axles, a steered axle
//   in the air      momentum theory: P = T^1.5 / (FoM √(2ρA)) at hover, a rotor and motor on each arm, arms that bend
//                   under twice the hover thrust within their share
//   stored charge   cells in series for the voltage and in parallel for the energy and the current
//   a frame         the members the generator sized (section, spacing, support lines, blocking, bracing) laid as
//                   studs, plates, joists and bearing walls on footings as wide as the ground's bearing asks
//   heat            insulation as thick as the U the envelope may let through; heating or a heat pump that makes up
//                   Q = Σ U A ΔT and what the exchanged air carries out, less what a recovery unit gives back
//   water, air      copper tube from the flow and the velocity it may run at; drains and downpipes from what they
//                   carry; a fan from the exchange asked
//   light           fittings from the flux density asked over the area, through their radiant efficiency
//   observed        a sensor for what is observed; one controller for every modulation
//
// Where the generator offers ways that exclude each other (charge or petrol for the same store), one is chosen and
// the others are kept as not chosen, not as gaps. Whatever no designer covers is a gap, located on its element. The
// parts' mass loads the drive that moves them, so a moving thing is designed again on the mass it came to until that
// no longer changes: each round kept.

import { MATERIALS } from '../../data/materials';
import { toSI } from '../../ganglia/units';
import type { Structure } from '../manifold';
import type { Intent } from '../want';
import { embody, type Choices, type Machine, type Round, type Step } from './embody';
import { conductorTemperature } from './electrical';
import { motorFor, type Motor } from './motor';
import { extentOf, part, placeParts, type Flaw, type Part, type V3, type Value } from './part';
import {
  awgDiameter, BOARDS, COLOURS, COPPER, COPPER_PIPES, COPPER_PIPES_SRC, DOWNPIPE, DRAG_COEFFICIENT, ENVELOPE_U, FANS, FANS_SRC, GAP_SHEAR_BY_COOLING, GAP_SHEAR_BY_COOLING_SRC,
  CELLS, HEAT_PUMP_COP, HEAT_RECOVERY, HONEYCOMB, INSULATIONS, LED_RADIANT_EFFICIENCY, MINERAL_WOOL, PACK_OVERHEAD, PEAK_OVER_CONTINUOUS, PIPE_VELOCITY, RECT_TUBES,
  ROLLING_RESISTANCE, ROTOR, STRIP_FOOTING, TYRES, TYRES_SRC,
} from './stock';
import { floatingClusters } from './tree';

const mm = 1e-3, g0 = 9.80665, eta = 0.9;
const mat = (id: string) => MATERIALS.find((m) => m.id === id)!;
const DEFAULT_CHOICES: Choices = { bedSupport: 1, bedT: 0, streams: 0, room: [0, 0, 0], exhausted: [] };

/** A printer-like structure (something deposited, moved along axes) goes to the printer's embodiment; anything else here. */
export function embodyAny(intent: Intent, s: Structure, maxRounds = 8): Machine | null {
  if (s.elements.some((e) => e.id.startsWith('deposit:')) && s.elements.some((e) => e.kind === 'conversion' && /:(x|y|z)$/.test(e.id))) return embody(intent, s);
  const rounds: Round[] = [];
  let self = 0, grew = Infinity;
  for (let n = 1; n <= maxRounds; n++) {
    const m = once(intent, s, self);
    const mass = m.parts.reduce((a, p) => a + p.mass, 0);
    // a design whose every round adds more than the last carries itself less well each time: it does not settle
    const growth = self > 0 ? mass / self : Infinity;
    if (n >= 3 && growth > 1.03 && growth >= grew) {
      m.flaws.push({ check: 'mass', where: 'the whole', says: `its mass does not settle: ${self.toFixed(1)} → ${mass.toFixed(1)} kg, each round adding more than the last; what it must carry, at what it is asked, is past what these parts carry of themselves`, law: 'the mass a drive moves includes the drive and its store', value: growth, limit: 1, remedy: null });
      rounds.push({ n, flaws: m.flaws, remedies: [], parts: m.parts.length, mass, choices: DEFAULT_CHOICES, snapshot: m.parts, trace: m.trace });
      return { ...m, rounds };
    }
    grew = growth;
    // the drive was sized for what it carries and itself: run again on the mass it came to, until that holds
    const moves = m.values.some((v) => v.name === 'mass it moves');
    const settled = !moves || Math.abs(mass - self) <= Math.max(0.03 * mass, 0.05);
    const remedies = settled ? [] : [`designed again for its own mass: ${self.toFixed(1)} → ${mass.toFixed(1)} kg`];
    rounds.push({ n, flaws: m.flaws, remedies, parts: m.parts.length, mass, choices: DEFAULT_CHOICES, snapshot: m.parts, trace: m.trace });
    if (settled) return { ...m, rounds };
    self = mass;
  }
  return { ...once(intent, s, self), rounds };
}

// ---- reading the intent and the structure -----------------------------------------------------------------------------
interface Ctx {
  intent: Intent; s: Structure;
  /** A quantity of a region, in SI, by its symbol or a pattern over its name. */
  q(region: string, re: RegExp | string): number | null;
  /** A want's bound on a region, in SI: at least (lo) or at most (hi), of a quantity in that unit whose name matches. */
  want(region: string, unit: string, re: RegExp, bound: 'lo' | 'hi'): number | null;
  /** A value the generator derived on an element, in SI. */
  val(id: string, re: RegExp): number | null;
  has(id: string): boolean;
  ambient: number; g: number;
}
function context(intent: Intent, s: Structure): Ctx {
  const qs = (region: string) => intent.regions.find((r) => r.id === region)?.quantities ?? {};
  const q: Ctx['q'] = (region, re) => { const all = qs(region); const l = typeof re === 'string' ? all[re] : Object.values(all).find((x) => re.test(x.name)); return l && l.value !== null ? l.value : null; };
  const want: Ctx['want'] = (region, unit, re, bound) => { const w = intent.wants.find((x) => x.region === region && x.quantity.unit === unit && re.test(x.quantity.name) && x[bound]); const l = w?.[bound]; return l && l.value !== null ? l.value : null; };
  // values the generator states in compound units ("m^3/s per Pa") are SI where they carry no prefix
  const si = (value: number, unit: string) => { try { return toSI(value, unit.replace(/ per /g, '/')); } catch { return value; } };
  const val: Ctx['val'] = (id, re) => { const e = s.elements.find((x) => x.id === id); const v = e?.values.find((x) => re.test(x.name)); return v ? si(v.value, v.unit) : null; };
  const temps = intent.regions.filter((r) => r.environment).flatMap((r) => Object.values(r.quantities)).filter((l) => /coldest|hottest/.test(l.name) && l.value !== null);
  const ambient = temps.length ? temps.reduce((a, l) => a + l.value!, 0) / temps.length - 273.15 : 20;
  return { intent, s, q, want, val, has: (id) => s.elements.some((e) => e.id === id), ambient, g: g0 };
}
/** The region the person's thing is: the one that moves, or the one most of the wants are about. */
function bodyOf(c: Ctx): { id: string; moving: boolean } | null {
  const mv = c.s.elements.find((e) => e.id.startsWith('moving:'));
  if (mv) return { id: mv.id.slice('moving:'.length), moving: true };
  const mine = c.intent.regions.filter((r) => !r.environment);
  const count = (id: string) => c.intent.wants.filter((w) => w.region === id).length + (c.s.elements.some((e) => e.id.startsWith(`members:${id}:`)) ? 10 : 0);
  const r = [...mine].sort((a, b) => count(b.id) - count(a.id))[0];
  return r ? { id: r.id, moving: false } : null;
}
/** Its extent, from what the region states: its sides, or a plan area and a height, or a size, or else its mass. */
function extentOfRegion(c: Ctx, id: string): V3 {
  const r = c.intent.regions.find((x) => x.id === id);
  const e = r?.extent, num = (k?: string | null) => (k ? c.q(id, k) : null);
  let x = num(e?.x), z = num(e?.z);
  const y = num(e?.y), plan = e?.plan ? c.q(id, e.plan) : null;
  if (plan && (!x || !z)) { const side = Math.sqrt(plan); x = x ?? side; z = z ?? side; }
  const size = c.q(id, /size|largest/), m = c.q(id, /mass/);
  const fallback = size ?? (m ? Math.max(0.05, Math.cbrt(m / 300)) : 0.3);
  return [x ?? fallback, y ?? fallback, z ?? fallback];
}
/** What the generator sized for a set of members: the section, the spacing, the support lines, and the matter. */
function sizedOf(c: Ctx, id: string) {
  const e = c.s.elements.find((x) => x.id === id);
  if (!e) return null;
  const get = (re: RegExp) => e.values.find((v) => re.test(v.name))?.value ?? null;
  const sized = e.values.find((v) => v.name.startsWith('sized: '))?.name.match(/^sized: (.+?), the fewest/)?.[1] ?? null;
  const matter = sized ? MATERIALS.find((m) => sized.startsWith(m.name)) ?? null : null;
  return { id, sized, matter, b: get(/^breadth$/), d: get(/^depth$/), spacing: get(/^spacing$/), lines: get(/^support lines/) ?? 0, members: get(/^members$/), blocking: get(/^rows of blocking/) ?? 0, density: get(/^density of what/) ?? matter?.density ?? 500 };
}

// ---- the parts, as each designer makes them --------------------------------------------------------------------------
interface Load { id: string; name: string; P: number; V: number; at: V3; conductors: number }
interface B {
  parts: Part[]; values: Value[]; flaws: Flaw[]; trace: Step[]; used: Set<string>; loads: Load[];
  add(p: Omit<Part, 'mass'> & { mass?: number }, density: number): Part;
  v(name: string, value: number, unit: string, law: string): number;
  use(...ids: string[]): void;
  of(...names: string[]): Value[];
}
function builder(): B {
  const b: B = {
    parts: [], values: [], flaws: [], trace: [], used: new Set(), loads: [],
    add: (p, density) => { const x = { ...part(p, density), unit: p.id.split('/')[0]! }; b.parts.push(x); return x; },
    v: (name, value, unit, law) => { b.values.push({ name, value, unit, law }); return value; },
    use: (...ids) => { for (const id of ids) b.used.add(id); },
    of: (...names) => b.values.filter((x) => names.includes(x.name)),
  };
  return b;
}
const coolingFor = (P: number) => GAP_SHEAR_BY_COOLING[P < 400 ? 0 : P < 6000 ? 1 : 2]!;
const busFor = (P: number) => (P <= 600 ? 24 : P <= 6000 ? 48 : 400);

/** A motor designed for the torque it holds at a speed, placed with its shaft along an axis. */
function motorAt(B: B, id: string, name: string, T: number, w: number, V: number, ambient: number, to: `${'' | '-'}${'x' | 'y' | 'z'}`, at: V3): Motor {
  const c = coolingFor(T * w);
  const { motor, history } = motorFor({ id: `${id}/motor`, name, T, w, V, shaftAtLeast: 6 * mm, ambient, shear: { value: c.value, h: c.h, cooling: c.cooling, source: `${c.cooling}: ${GAP_SHEAR_BY_COOLING_SRC.source}` } });
  history.forEach((h, i) => B.trace.push({ stage: 'motor', where: `${id}/motor`, round: i + 1, says: `stack ${h.aspect.toFixed(2)} of its bore, ${h.grade}, cooled by ${c.cooling}`, flaws: h.flaws, remedy: h.remedy }));
  for (const p of placeParts(motor.parts, to, at)) B.parts.push({ ...p, unit: id });
  for (const f of motor.flaws) B.flaws.push(f);
  return motor;
}

// ---- on the ground ------------------------------------------------------------------------------------------------------
interface Rolled { battery: V3; deck: number; cruise: (v: number) => number; front: number; heatAt: V3 }
function rolling(c: Ctx, B: B, body: string, ext: V3, self: number, ground: string): Rolled {
  B.use(`moving:${body}`, `contact:${body}|${ground}`);
  const payload = c.val(`moving:${body}`, /mass it moves/) ?? c.q(body, /mass/) ?? 10;
  const M = B.v('mass it moves', payload + self, 'kg', `what it carries (${payload.toFixed(0)} kg) and itself (${self.toFixed(1)} kg, the last round's parts)`);
  const vTop = c.want(body, 'm/s', /^speed/, 'hi') ?? c.want(body, 'm/s', /^speed/, 'lo') ?? 1.5, a = c.want(body, 'm/s^2', /^acceleration/, 'lo') ?? 1;
  const grade = c.val(`moving:${body}`, /grade/) ?? c.q(ground, /grade/) ?? 0.05, mu = c.q(ground, /friction/) ?? 0.7, step = c.q(ground, /bump|step|height of/) ?? 0.01;
  const air = c.intent.regions.find((r) => r.environment && /air/.test(r.id))?.id ?? '';
  const drag = `drag:moving:${body}|${air}`, area = c.val(drag, /area/) ?? ext[0] * ext[1];
  if (c.has(drag)) B.use(drag);
  const rho = c.q(air, /density of air/) ?? 1.2;
  // the wheels: the smallest stocked that carries a quarter of the weight with a quarter to spare and climbs the step
  const share = 0.25, climbs = (r: number) => Math.sqrt(Math.max(0, 2 * r * step - step * step)) / Math.max(1e-6, r - step) <= share;
  const tyre = TYRES.find((t) => t.load >= 1.25 * (M * c.g) / 4 && climbs(t.r)) ?? TYRES.at(-1)!;
  if (tyre.load < (M * c.g) / 4) B.flaws.push({ check: 'load', where: 'wheels', says: `no stocked tyre carries ${(M * c.g / 4).toFixed(0)} N a wheel`, law: 'F_wheel ≤ load index', value: (M * c.g) / 4, limit: tyre.load, remedy: null });
  const r = B.v('wheel radius', tyre.r, 'm', `${tyre.id}: carries ${tyre.load} N (${TYRES_SRC.source}), past a quarter of ${(M * c.g).toFixed(0)} N with a quarter to spare, and climbs a ${(step * 1e3).toFixed(0)} mm step at ${share} of the weight`);
  const road = (v: number) => ROLLING_RESISTANCE.value * M * c.g + 0.5 * rho * DRAG_COEFFICIENT.value * area * v * v;
  const Fa = B.v('force to accelerate', M * a + ROLLING_RESISTANCE.value * M * c.g + M * c.g * grade, 'N', `F = m a + C_rr m g + m g grade: ${a} m/s² up a ${(grade * 100).toFixed(0)} % grade, C_rr ${ROLLING_RESISTANCE.value} (${ROLLING_RESISTANCE.source})`);
  const Ft = B.v('force at top speed', road(vTop), 'N', `F = C_rr m g + ½ ρ C_d A v², C_d ${DRAG_COEFFICIENT.value} (${DRAG_COEFFICIENT.source}), A ${area.toFixed(2)} m², ${vTop.toFixed(1)} m/s`);
  const P = B.v('drive power', Math.max(Ft * vTop, Fa * vTop * 0.4) / eta, 'W', `the larger of top speed and acceleration held to 40 % of top speed, over η ${eta}`);
  const driven = Fa > mu * (M * c.g / 2) * 0.8 ? 4 : 2;
  B.v('driven wheels', driven, '1', driven === 4 ? 'two driven wheels would slip: the force asked is past what friction on half the weight passes' : 'two: friction on half the weight passes the force asked');
  const V = B.v('bus voltage', busFor(P), 'V', P <= 600 ? 'safety extra-low voltage for small drives' : P <= 6000 ? 'under the 60 V DC of extra-low voltage (IEC 61140) for light vehicles' : 'about 400 V for traction, so the current stays carriable');
  const wWheel = vTop / r, wMotor = 400, G = B.v('reduction', Math.max(1, Math.min(6, wMotor / wWheel)), '1', `motor near ${wMotor} rad/s at top speed, the wheel at ${wWheel.toFixed(1)} rad/s; one belt stage, at most 6 to 1`);
  // each motor holds the larger of what top speed needs and its share of the peak over the short-time duty
  const Tpeak = (Fa * r) / driven / G / eta, Tcont = Math.max((Ft * r) / driven / G / eta, Tpeak / PEAK_OVER_CONTINUOUS.value);
  B.v('motor torque, continuous', Tcont, 'N m', `the larger of top speed's ${((Ft * r) / driven / G / eta).toFixed(1)} N m and the peak ${Tpeak.toFixed(1)} N m over ${PEAK_OVER_CONTINUOUS.value} (${PEAK_OVER_CONTINUOUS.source})`);
  // the chassis: two rails between the axles, each carrying half the weight at mid-span, on edge
  const L = B.v('wheelbase', Math.max(ext[2] + r, 4 * r), 'm', 'the length the carried region needs, and room for the wheels'), track = Math.max(ext[0] + 0.1, 3 * tyre.w + 0.1);
  const Mb = (M * c.g / 2) * 2 * L / 4, sy = 250e6;
  const onEdge = RECT_TUBES.map((t) => ({ ...t, b: Math.min(t.b, t.h), h: Math.max(t.b, t.h) }));
  const fits = (t: (typeof onEdge)[number]) => { const I = (t.b * t.h ** 3 - (t.b - 2 * t.t) * (t.h - 2 * t.t) ** 3) / 12; return Mb / (I / (t.h / 2)) <= sy / 3; };
  const tube = onEdge.find(fits) ?? onEdge.at(-1)!;
  if (!fits(tube)) B.flaws.push({ check: 'strength', where: 'chassis', says: `no stocked section holds ${(Mb / 1e3).toFixed(1)} kN m within a third of yield`, law: 'σ = M c / I', value: Mb, limit: 0, remedy: null });
  B.v('rail section', tube.h, 'm', `${tube.id} steel on edge: σ = M c / I under M = F L / 4 with twice the static weight (${(Mb / 1e3).toFixed(1)} kN m), within a third of 250 MPa yield`);
  const railY = r + tube.h / 2 + 0.03, deck = railY + tube.h / 2, railLen = L + 2 * r * 1.1, railX = track / 2 - tube.b / 2 - tyre.w;
  const tubeMass = (len: number) => 2 * tube.t * (tube.b + tube.h) * len * 7850;
  for (const [id, x] of [['rail-left', -railX], ['rail-right', railX]] as const) B.add({ id: `chassis/${id}`, name: `chassis rail ${tube.id} × ${railLen.toFixed(2)} m, steel`, category: 'structure/frame', material: 'steel.a36', system: 'rails', shape: { kind: 'block', size: [tube.b, tube.h, railLen] }, at: [x, railY, 0], colour: 0x546e7a, values: B.of('rail section'), mass: tubeMass(railLen) }, 0);
  for (const z of [-L / 2, 0, L / 2]) B.add({ id: `chassis/cross-${z < 0 ? 'rear' : z > 0 ? 'front' : 'mid'}`, name: `cross member ${tube.id}, steel`, category: 'structure/frame', material: 'steel.a36', system: 'rails', shape: { kind: 'block', size: [2 * railX - tube.b, tube.h, tube.b] }, at: [0, railY, z], colour: 0x607d8b, values: [], mass: tubeMass(2 * railX), into: ['chassis/rail-left', 'chassis/rail-right'] }, 0);
  // brakes from the energy of a stop, springs from the ride, motors through belts
  const Estop = 0.5 * M * vTop * vTop / 4, dT = 150, cIron = 460;
  const rotorR = 0.55 * r, rotorM = Estop / (cIron * dT), rotorT = Math.max(12 * mm, rotorM / (7200 * Math.PI * rotorR * rotorR * 0.84));
  B.v('brake disc', rotorT, 'm', `a stop from ${vTop.toFixed(1)} m/s puts ${(Estop / 1e3).toFixed(0)} kJ in each disc; ΔT ≤ ${dT} K in cast iron (c ${cIron} J/kg K): ${rotorM.toFixed(2)} kg, at least 12 mm`);
  const kSpring = B.v('spring rate', (M / 4) * (2 * Math.PI * 1.5) ** 2, 'N/m', 'k = m (2π f)² for a quarter of the mass at 1.5 Hz, a ride people find comfortable (estimate): the store that smooths the road');
  B.use(`store:momentum:${body}:smoothing`);
  const corners: [string, number, number, boolean][] = [['rear-left', -1, -1, true], ['rear-right', 1, -1, true], ['front-left', -1, 1, driven === 4], ['front-right', 1, 1, driven === 4]];
  for (const [name, sx, sz, drives] of corners) {
    const id = `wheel-${name}`, x = sx * (track / 2 - tyre.w / 2), z = sz * L / 2, inner = sx * (railX - tube.b / 2);
    B.add({ id: `${id}/tyre`, name: `tyre ${tyre.id}`, category: 'motion/wheels', material: 'rubber.natural', system: 'wheel', shape: { kind: 'round', r: tyre.r, length: tyre.w, axis: 'x', bore: tyre.r * 1.2 }, at: [x, r, z], colour: 0x1a1a1a, values: B.of('wheel radius') }, 1100);
    B.add({ id: `${id}/rim`, name: `rim for ${tyre.id}, aluminium`, category: 'motion/wheels', material: 'aluminum.6061-t6', system: 'wheel', shape: { kind: 'round', r: tyre.r * 0.6, length: tyre.w * 0.9, axis: 'x', bore: tyre.r * 0.2 }, at: [x, r, z], colour: 0xb0bec5, values: [] }, 900);
    const hubX = sx * (track / 2 - tyre.w - 0.02), axleR = Math.max(10 * mm, tyre.r * 0.08);
    B.add({ id: `${id}/axle`, name: `stub axle Ø${(2 * axleR * 1e3).toFixed(0)} mm, steel`, category: 'motion/guides/shafts', material: 'steel.4140-ann', system: 'wheel', shape: { kind: 'round', r: axleR, length: Math.abs(x - inner), axis: 'x' }, at: [(x + inner) / 2, r, z], colour: 0xd5dbe1, values: [] }, 7850);
    B.add({ id: `${id}/brake-disc`, name: `brake disc Ø${(2 * rotorR * 1e3).toFixed(0)} × ${(rotorT * 1e3).toFixed(0)} mm, cast iron`, category: 'motion/brakes', material: 'cast-iron.gray-30', system: 'brake', shape: { kind: 'round', r: rotorR, length: rotorT, axis: 'x', bore: axleR * 2 }, at: [hubX, r, z], colour: 0x8d8d8d, values: B.of('brake disc') }, 7200);
    B.add({ id: `${id}/caliper`, name: 'brake caliper, two pistons', category: 'motion/brakes', material: 'cast-iron.gray-30', system: 'brake', shape: { kind: 'block', size: [rotorT + 30 * mm, rotorR * 0.5, rotorR * 0.6] }, at: [hubX, r + rotorR * 0.75, z], colour: 0xc62828, values: [], into: [`${id}/mount`] }, 3500);
    B.add({ id: `${id}/mount`, name: 'upright and wheel mount, steel, bolted to the rail', category: 'structure/joints/brackets', material: 'steel.a36', system: 'wheel', shape: { kind: 'block', size: [12 * mm, deck - r + 0.05, tyre.r * 0.8] }, at: [inner - sx * 6 * mm, (r + deck) / 2, z], colour: 0x78909c, values: [], into: [`chassis/rail-${sx < 0 ? 'left' : 'right'}`, `${id}/axle`] }, 7850);
    B.add({ id: `${id}/spring`, name: `coil spring ${(kSpring / 1e3).toFixed(1)} kN/m and damper`, category: 'motion/suspension', material: 'steel.music-wire', system: 'suspension', shape: { kind: 'round', r: Math.max(25 * mm, tyre.r * 0.12), length: deck - r, axis: 'y' }, at: [inner - sx * 0.04, (r + deck) / 2, z - sz * (tyre.r * 0.55)], colour: 0xffb300, values: B.of('spring rate'), into: [`chassis/rail-${sx < 0 ? 'left' : 'right'}`, `${id}/mount`] }, 3000);
    if (drives) {
      const mx = sx * (railX - tube.b / 2 - 0.09), mz = z - sz * (tyre.r * 0.5 + 0.08);
      motorAt(B, id, `${name} wheel motor`, Tcont, wMotor, V, c.ambient, sx > 0 ? 'x' : '-x', [mx, r, mz]);
      B.add({ id: `${id}/motor-bracket`, name: 'motor bracket, steel plate, to the rail', category: 'structure/joints/brackets', material: 'steel.a36', system: 'drive', shape: { kind: 'block', size: [0.1, 10 * mm, 0.14] }, at: [mx, railY - tube.h / 2 - 5 * mm, mz], colour: 0x78909c, values: [], into: [`chassis/rail-${sx < 0 ? 'left' : 'right'}`, `${id}/motor/housing`] }, 7850);
      B.add({ id: `${id}/belt`, name: `toothed belt, ${G.toFixed(1)} to 1, motor to wheel`, category: 'motion/transmission/belt', material: 'glass-fibre reinforced neoprene', system: 'drive', shape: { kind: 'wire', points: [[mx, r, mz], [hubX, r, z]], r: 6 * mm }, at: [mx, r, z], colour: 0x111111, values: B.of('reduction'), mass: 0.12 }, 0);
      B.loads.push({ id: `${id} motor`, name: `${name} motor`, P: P / driven, V, at: [mx, r, mz], conductors: 3 });
    }
  }
  B.trace.push({ stage: 'axis', where: 'running gear', round: 1, says: `${driven} of 4 wheels driven, ${tyre.id}, ${G.toFixed(1)} to 1, ${(P / 1e3).toFixed(1)} kW at ${V} V`, flaws: [], remedy: null });
  B.use(`conversion:charge->momentum:moving:${body}`, `conversion:momentum:${body}:removal`, `shed:conversion:charge->momentum:moving:${body}`, `shed:conversion:momentum:${body}:removal`, `path:momentum:${body}`, `filter:momentum:${body}`);
  // steering: past walking pace a steered axle; the tightest curve sets the angle, the friction on its tyres the force
  const curve = c.q(ground, /tightest curve|radius/);
  if (vTop > 4) {
    B.use(`modulation:momentum:${body}:direction`);
    const angle = B.v('steer angle', Math.atan(L / Math.max(L * 1.5, curve ?? 10)), 'rad', `δ = atan(L/R) at the tightest curve, ${(curve ?? 10).toFixed(0)} m`);
    const Frack = B.v('rack force', (2 * mu * (M * c.g / 4) * 0.03) / 0.13, 'N', 'turning both tyres at rest: friction times the load on each over a 30 mm scrub, through 130 mm steering arms (estimate)');
    const rackR = Math.max(10 * mm, Math.sqrt(Frack / (Math.PI * 120e6)));
    const zr = L / 2 - 0.12;
    B.add({ id: 'steering/rack', name: `steering rack Ø${(2 * rackR * 1e3).toFixed(0)} mm, ${(0.13 * angle * 1e3 * 2).toFixed(0)} mm of travel`, category: 'motion/transmission/rack', material: 'steel.4140-ann', system: 'rack', shape: { kind: 'round', r: rackR + 8 * mm, length: 2 * railX - tube.b - 0.02, axis: 'x' }, at: [0, railY, zr], colour: 0x90a4ae, values: B.of('steer angle', 'rack force'), into: ['chassis/rail-left', 'chassis/rail-right'] }, 7850);
    for (const sx of [-1, 1]) B.add({ id: `steering/tie-rod-${sx < 0 ? 'left' : 'right'}`, name: 'tie rod and ball joint', category: 'motion/transmission/rack', material: 'steel.4140-ann', system: 'rods', shape: { kind: 'wire', points: [[sx * (railX - tube.b / 2 - 0.01), railY, zr], [sx * (railX - tube.b / 2 - 0.01), r + 0.04, L / 2 - 0.02]], r: 8 * mm }, at: [sx * railX, railY, zr], colour: 0xb0bec5, values: [], mass: 0.6 }, 0);
    B.add({ id: 'steering/column', name: 'steering column, two universal joints', category: 'motion/transmission/rack', material: 'steel.a36', system: 'column', shape: { kind: 'round', r: 12 * mm, length: 0.55, axis: 'y' }, at: [-ext[0] / 4, deck + 0.3, zr], colour: 0x78909c, values: [], into: ['steering/rack'] }, 7850);
    B.add({ id: 'steering/wheel', name: 'steering wheel Ø380 mm', category: 'motion/transmission/rack', material: 'polyurethane over steel', system: 'column', shape: { kind: 'round', r: 0.19, length: 0.03, axis: 'z', bore: 0.3 }, at: [-ext[0] / 4, deck + 0.6, zr - 0.05], colour: 0x263238, values: [], into: ['steering/column'] }, 900);
  } else if (c.has(`modulation:momentum:${body}:direction`)) {
    B.use(`modulation:momentum:${body}:direction`);
    B.v('steering', 0, '1', 'by the driven wheels\' speed difference: at walking pace a skid turn is stable');
  }
  // a crush structure where a stop against a wall is wanted
  const stroke = c.val(`stroke:momentum:${body}`, /stroke/);
  if (stroke) {
    B.use(`stroke:momentum:${body}`);
    const aMax = c.want(body, 'm/s^2', /in a stop|crash/, 'hi') ?? 400, A = (M * aMax) / HONEYCOMB.sigma, side = Math.sqrt(A / 2);
    for (const sx of [-1, 1]) B.add({ id: `crash/box-${sx < 0 ? 'left' : 'right'}`, name: `crush box ${(side * 1e3).toFixed(0)} mm square × ${(stroke * 1e3).toFixed(0)} mm, aluminium honeycomb`, category: 'safety/crash', material: 'aluminum honeycomb 5052', system: 'crash', shape: { kind: 'block', size: [side, side, stroke] }, at: [sx * railX, railY, railLen / 2 + stroke / 2], colour: 0xffcc80, values: [{ name: 'crush area', value: A, unit: 'm^2', law: `σ A = m a: ${M.toFixed(0)} kg at ${aMax} m/s² over ${(HONEYCOMB.sigma / 1e6).toFixed(1)} MPa (${HONEYCOMB.source}); the stroke s ≥ v²/2a the generator derived` }] }, HONEYCOMB.density);
  }
  return { battery: [0, deck, -L / 6], deck, cruise: (v) => (road(v) * v) / eta, front: L / 2, heatAt: [0, deck, L / 2 - 0.12 - 0.25] };
}

/** The shell around what a moving region carries: a floor, a roof, sides and ends, lined, sealed against rain. */
function shell(c: Ctx, B: B, body: string, ext: V3, deck: number): void {
  const [w, h, l] = ext, t = 2 * mm, liner = 10 * mm;
  const panel = (id: string, at: V3, size: V3) => B.add({ id: `body/${id}`, name: `body panel, 2 mm aluminium sheet, ${liner * 1e3} mm foam liner, sealed`, category: 'safety/guards', material: 'aluminum.5052-h32', system: 'shell', shape: { kind: 'block', size }, at, colour: 0x80cbc4, values: [], mass: (size[0] * size[1] * size[2] / Math.min(...size)) * (t * 2680 + liner * 30) }, 0);
  panel('floor', [0, deck + t / 2, 0], [w, t, l]);
  panel('roof', [0, deck + h, 0], [w, t, l]);
  for (const sx of [-1, 1]) panel(`side-${sx < 0 ? 'left' : 'right'}`, [sx * w / 2, deck + h / 2, 0], [t, h, l]);
  for (const sz of [-1, 1]) panel(`end-${sz < 0 ? 'rear' : 'front'}`, [0, deck + h / 2, sz * l / 2], [w, h, t]);
  for (const e of c.s.elements) if (e.id.startsWith(`boundary:volume of water:${body}|`)) B.use(e.id);
  carried(c, B, body);
}
/** What the generator asked of the frame that carries the region: its floor members, the loads on it, its weight to the ground. */
function carried(c: Ctx, B: B, body: string): void {
  const floor = sizedOf(c, `members:${body}:down`);
  if (floor) { B.use(floor.id); if (floor.sized) B.v('floor members', floor.d ?? 0, 'm', `the generator sized what the carried region rests on: ${floor.sized}; the deck and rails here carry it`); }
  for (const e of c.s.elements) if ((e.id.startsWith('load:') && e.id.endsWith(`->${body}`)) || e.id === `weight:${body}` || e.id.startsWith(`path:momentum:${body}->`)) B.use(e.id);
}

/** Heating and cooling of a region across its boundary: a heat pump that holds the band at both ends of the site's air. */
function climate(c: Ctx, B: B, body: string, k: number, t: number, at: V3, into: string[], V: number): void {
  const faces = c.s.elements.filter((e) => e.id.startsWith(`boundary:energy:${body}|`) && /:(up|side|down)$/.test(e.id));
  const A = faces.reduce((a, e) => a + (c.val(e.id, /^area$/) ?? 0), 0);
  if (!A) return;
  const air = c.intent.regions.find((r) => r.environment && /air/.test(r.id))?.id ?? '';
  const lo = (c.q(air, /coldest/) ?? 253.15) - 273.15, hi = (c.q(air, /hottest/) ?? 308.15) - 273.15;
  const Tlo = (c.want(body, 'degC', /^temperature/, 'lo') ?? 293.15) - 273.15, Thi = (c.want(body, 'degC', /^temperature/, 'hi') ?? 299.15) - 273.15;
  const people = c.intent.regions.flatMap((r) => Object.values(r.produces ?? {})).find((l) => /heat/.test(l.name))?.value ?? 0;
  const U = k / t, Qh = U * A * Math.max(0, Tlo - lo), Qc = U * A * Math.max(0, hi - Thi) + people;
  B.v('heat lost at the coldest', Qh, 'W', `Q = U A ΔT: U = λ/t = ${U.toFixed(2)} W/m²K over ${A.toFixed(1)} m², ${Tlo} °C inside, ${lo.toFixed(0)} °C outside`);
  B.v('heat gained at the hottest', Qc, 'W', `U A ΔT to ${hi.toFixed(0)} °C outside, and ${people.toFixed(0)} W the people give off`);
  const Q = Math.max(Qh, Qc) * 1.25, Pe = B.v('heat pump power', Q / HEAT_PUMP_COP.value, 'W', `${(Q / 1e3).toFixed(2)} kW of heat moved (1.25 times the larger end) at COP ${HEAT_PUMP_COP.value} (${HEAT_PUMP_COP.source})`);
  B.add({ id: 'climate/heat-pump', name: `heat pump ${(Q / 1e3).toFixed(1)} kW: compressor, two coils, a reversing valve, a blower`, category: 'thermal/heat-pump', material: 'steel case, copper and aluminium coils', system: 'heat pump', shape: { kind: 'block', size: [0.45, 0.28, 0.3] }, at: [at[0], at[1] + 0.14, at[2]], colour: 0x90caf9, values: B.of('heat pump power', 'heat lost at the coldest', 'heat gained at the hottest'), mass: 8 + Q / 300, into }, 0);
  B.loads.push({ id: 'heat pump', name: 'heat pump', P: Pe, V, at, conductors: 2 });
  B.use(...faces.map((e) => e.id), `boundary:energy:${body}|${air}`, `conversion:energy:${body}:supply`, `conversion:energy:${body}:removal`, `path:energy:${body}->${air}`, `shed:conversion:energy:${body}:removal`, `store:energy:${body}:smoothing`);
  for (const e of c.s.elements) if (e.id.startsWith('path:charge:store->conversion:energy:')) B.use(e.id);
}

// ---- in the air ---------------------------------------------------------------------------------------------------------
function flying(c: Ctx, B: B, body: string, ext: V3, self: number, air: string): { battery: V3; deck: number; P: number; cruise: (v: number) => number } {
  B.use(`moving:${body}`); for (const e of c.s.elements) if (/^(thrust|hover|lift|drag):/.test(e.id) && e.id.includes(body)) B.use(e.id);
  B.use(`conversion:charge->momentum:moving:${body}`, `shed:conversion:charge->momentum:moving:${body}`, `conversion:momentum:${body}:removal`, `shed:conversion:momentum:${body}:removal`);
  const payload = c.val(`moving:${body}`, /mass it moves/) ?? c.q(body, /mass/) ?? 1;
  const M = B.v('mass it moves', payload + self, 'kg', `what it carries (${payload.toFixed(2)} kg) and itself (${self.toFixed(2)} kg, the last round's parts)`);
  const rho = c.q(air, /density/) ?? 1.2, n = 4;
  const T = M * c.g / n, A = T / ROTOR.discLoading, D = B.v('rotor diameter', 2 * Math.sqrt(A / Math.PI), 'm', `disc loading ${ROTOR.discLoading} N/m² (${ROTOR.source}) at hover, a quarter of ${(M * c.g).toFixed(1)} N each`);
  const Pi = T ** 1.5 / Math.sqrt(2 * rho * A), P = B.v('hover power', (n * Pi) / ROTOR.figureOfMerit, 'W', `P = T^1.5/√(2ρA) a rotor, over a figure of merit ${ROTOR.figureOfMerit}`);
  const w = B.v('rotor speed', (2 * ROTOR.tipSpeed) / D, 'rad/s', `tip speed ${ROTOR.tipSpeed} m/s`), Q = Pi / ROTOR.figureOfMerit / w;
  const V = busFor(P), armL = B.v('arm length', D * 0.75 + Math.max(ext[0], ext[2]) / 2, 'm', 'rotors clear of each other and of the body: three quarters of a diameter beyond its edge');
  // arms: carbon tubes that bend under twice the hover thrust at their tips within a third of what they bear
  const cf = mat('composite.cfrp'), sAllow = cf.yield / 3, Mtip = 2 * T * armL;
  const ro = Math.max(4 * mm, Math.cbrt((4 * Mtip) / (Math.PI * sAllow * (1 - 0.8 ** 4)))), ri = 0.8 * ro;
  B.v('arm tube', 2 * ro, 'm', `σ = M c / I under twice the hover thrust at the tip (${Mtip.toFixed(2)} N m), a carbon tube bored to 0.8 of its diameter, within a third of ${(cf.yield / 1e6).toFixed(0)} MPa`);
  const hub = Math.max(0.1, 0.45 * Math.max(ext[0], ext[2])), deck = 0.14 + ext[1] / 2;
  for (const [id, y] of [['hub-top', deck + ro + 1.5 * mm], ['hub-bottom', deck - ro - 1.5 * mm]] as const) B.add({ id: `frame/${id}`, name: `hub plate ${(hub * 1e3).toFixed(0)} mm square × 3 mm, carbon`, category: 'structure/frame', material: 'composite.cfrp', system: 'hub', shape: { kind: 'block', size: [hub, 3 * mm, hub] }, at: [0, y, 0], colour: 0x263238, values: [] }, cf.density);
  for (let k = 0; k < n; k++) {
    const th = Math.PI / 4 + (k * Math.PI) / 2, dx = Math.cos(th), dz = Math.sin(th), tip: V3 = [dx * armL, deck, dz * armL];
    B.add({ id: `arm-${k + 1}/tube`, name: `arm, carbon tube Ø${(2 * ro * 1e3).toFixed(0)} × ${((ro - ri) * 1e3).toFixed(1)} mm × ${(armL * 1e3).toFixed(0)} mm`, category: 'structure/frame', material: 'composite.cfrp', system: 'arm', shape: { kind: 'round', r: ro, length: armL, axis: 'x', bore: 2 * ri }, at: [dx * armL / 2, deck, dz * armL / 2], turn: { axis: 'y', angle: -th }, colour: 0x37474f, values: B.of('arm tube'), into: ['frame/hub-top', 'frame/hub-bottom', `arm-${k + 1}/motor/housing`] }, cf.density);
    motorAt(B, `arm-${k + 1}`, `rotor ${k + 1} motor`, Q * 1.3, w, V, c.ambient, 'y', [tip[0], deck + ro + 0.02, tip[2]]);
    B.add({ id: `arm-${k + 1}/rotor`, name: `rotor Ø${(D * 1e3).toFixed(0)} mm, two blades, carbon`, category: 'motion/rotors', material: 'composite.cfrp', system: 'rotor', shape: { kind: 'block', size: [D, 3 * mm, D * 0.08] }, at: [tip[0], deck + ro + 0.06, tip[2]], turn: { axis: 'y', angle: k * 0.7 }, colour: 0x90a4ae, values: B.of('rotor diameter', 'hover power', 'rotor speed'), into: [`arm-${k + 1}/motor/rotor`, `arm-${k + 1}/motor/shaft`] }, cf.density);
    B.loads.push({ id: `rotor ${k + 1} motor`, name: `rotor ${k + 1} motor`, P: (2 * P) / n, V, at: tip, conductors: 3 });
  }
  for (const [k, sx, sz] of [[1, -1, -1], [2, 1, -1], [3, -1, 1], [4, 1, 1]] as const) B.add({ id: `frame/leg-${k}`, name: 'landing leg, carbon rod Ø8 mm', category: 'structure/frame', material: 'composite.cfrp', system: 'legs', shape: { kind: 'round', r: 4 * mm, length: deck - ro - 3 * mm, axis: 'y' }, at: [sx * hub * 0.4, (deck - ro - 3 * mm) / 2, sz * hub * 0.4], colour: 0x37474f, values: [], into: ['frame/hub-bottom'] }, cf.density);
  B.add({ id: 'payload/mount', name: `payload bay for ${payload.toFixed(2)} kg, carbon tray`, category: 'structure/frame', material: 'composite.cfrp', system: 'bay', shape: { kind: 'block', size: [Math.max(ext[0], 0.05), Math.max(ext[1], 0.02), Math.max(ext[2], 0.05)] }, at: [0, deck - ro - 3 * mm - Math.max(ext[1], 0.02) / 2, 0], colour: 0x455a64, values: [], mass: 0.05, into: ['frame/hub-bottom'] }, 0);
  carried(c, B, body);
  B.trace.push({ stage: 'axis', where: 'rotors', round: 1, says: `4 rotors Ø${(D * 1e3).toFixed(0)} mm, ${P.toFixed(0)} W at hover, ${V} V`, flaws: [], remedy: null });
  for (const id of [`modulation:momentum:${body}:direction`, `path:momentum:${body}`, `filter:momentum:${body}`, `store:momentum:${body}:smoothing`]) if (c.has(id)) B.use(id);
  // in forward flight the rotors also make up the drag: P(v) = P_hover + ½ ρ C_d A v³ / η
  const area = c.val(`drag:moving:${body}|${air}`, /area/) ?? ext[0] * ext[1];
  const cruise = (v: number) => P + (0.5 * rho * 1.0 * area * v ** 3) / eta;
  B.v('power at speed', cruise(c.want(body, 'm/s', /^speed/, 'lo') ?? c.want(body, 'm/s', /^speed/, 'hi') ?? 0), 'W', `hover and the drag at speed, ½ ρ C_d A v³ with C_d 1 for a bluff body and A ${area.toFixed(3)} m² (estimate)`);
  return { battery: [0, deck + ro + 3 * mm, 0], deck, P, cruise };
}

// ---- stored charge ------------------------------------------------------------------------------------------------------
function battery(c: Ctx, B: B, E: number, Ipeak: number, V: number, at: V3, into: string[]): void {
  // the cell that makes the pack with the fewest: energy cells where the energy asks most, power cells where the current does
  const plan = (cell: (typeof CELLS)[number]) => { const S = Math.max(1, Math.ceil(V / cell.V)); return { cell, S, Pn: Math.max(1, Math.ceil(E / (S * cell.V * cell.Ah * 3600 * 0.9)), Math.ceil(Ipeak / cell.Imax)) }; };
  const { cell, S, Pn } = CELLS.map(plan).sort((a, b) => a.S * a.Pn * a.cell.mass - b.S * b.Pn * b.cell.mass)[0]!;
  B.v('cells', S * Pn, '1', `${S}s${Pn}p of ${cell.id} (${cell.source}): ${S} in series for ${V} V, ${Pn} in parallel for ${(E / 3.6e6).toFixed(2)} kWh at 90 % usable and ${Ipeak.toFixed(0)} A at ${cell.Imax} A a cell`);
  const n = S * Pn, cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols);
  const size: V3 = [cols * cell.d * 1.05 + 10 * mm, cell.l + 12 * mm, rows * cell.d * 1.05 + 10 * mm];
  B.add({ id: 'battery/pack', name: `battery pack ${S}s${Pn}p, ${(S * cell.V).toFixed(0)} V, ${((S * Pn * cell.V * cell.Ah) / 1e3).toFixed(2)} kWh, ${n} cells`, category: 'energy/battery', material: `Li-ion cells (${cell.id}), aluminium case`, system: 'cells', shape: { kind: 'block', size }, at: [at[0], at[1] + size[1] / 2, at[2]], colour: 0x1565c0, values: B.of('cells', 'energy stored'), mass: n * cell.mass * PACK_OVERHEAD.value, into }, 0);
  B.add({ id: 'battery/bms', name: `battery management board, ${S} cell taps, cuts off past ${cell.Vmax} V or below ${cell.Vmin} V a cell`, category: 'circuits/power', material: 'FR4', system: 'management', shape: { kind: 'block', size: [Math.min(0.1, size[0]), 8 * mm, Math.min(0.06, size[2])] }, at: [at[0], at[1] + size[1] + 4 * mm, at[2]], colour: 0x2e7d32, values: [], mass: 0.08 }, 0);
  for (const e of c.s.elements) if (e.id.startsWith('store:charge') || e.id.startsWith('refill:charge')) B.use(e.id);
}

// ---- a frame on the ground, its envelope and what serves the inside ----------------------------------------------------
interface Framed { inner: { wall: Record<'front' | 'back' | 'left' | 'right', number>; floor: number; ceiling: number }; boards: Record<'front' | 'back' | 'left' | 'right', string>; ceilingJoists: { z: number; id: string }[]; outer: V3 }
function framed(c: Ctx, B: B, body: string, ext: V3): Framed {
  const [W, H, D] = ext;
  const est = (b: number, d: number, sp: number) => ({ id: '', sized: null, matter: mat('wood.douglas-fir'), b, d, spacing: sp, lines: 0, members: null, blocking: 0, density: 530 });
  const side = sizedOf(c, `members:${body}:side`) ?? est(0.038, 0.089, 0.406), up = sizedOf(c, `members:${body}:up`) ?? est(0.038, 0.184, 0.61), down = sizedOf(c, `members:${body}:down`) ?? est(0.038, 0.184, 0.61);
  const bear = sizedOf(c, `supports:${body}:up`) ?? est(0.038, 0.089, 0.406);
  B.use(...[`members:${body}:side`, `members:${body}:up`, `members:${body}:down`, `supports:${body}:up`, `supports:${body}:down`, `bracing:${body}:side`, `path:momentum:${body}->`].filter((x) => c.has(x)));
  for (const e of c.s.elements) if (/^(load|weight|bound):|^path:momentum:/.test(e.id) || e.id.startsWith('bound:momentum:') || e.id.startsWith('rests:')) B.use(e.id);
  const timber = (s: { matter: { id: string } | null }) => s.matter?.id ?? 'wood.douglas-fir';
  const say = (s: { sized: string | null; b: number | null; d: number | null; spacing: number | null }, what: string) => `${what}: ${s.sized ?? `${((s.b ?? 0) * 1e3).toFixed(0)} × ${((s.d ?? 0) * 1e3).toFixed(0)} mm at ${((s.spacing ?? 0) * 1e3).toFixed(0)} mm (estimate)`}`;
  const tw = B.v('wall insulation', MINERAL_WOOL.k / ENVELOPE_U.wall, 'm', `t = λ/U with λ ${MINERAL_WOOL.k} W/m K (${MINERAL_WOOL.source}), U ${ENVELOPE_U.wall} W/m²K (${ENVELOPE_U.source})`);
  const tr = B.v('roof insulation', MINERAL_WOOL.k / ENVELOPE_U.roof, 'm', `t = λ/U, U ${ENVELOPE_U.roof} W/m²K`);
  const tf = B.v('floor insulation', MINERAL_WOOL.k / ENVELOPE_U.floor, 'm', `t = λ/U, U ${ENVELOPE_U.floor} W/m²K`);
  B.use(`path:energy:${body}->the ground`, `boundary:energy:${body}|the ground`, `boundary:energy:${body}|the ground:down`);
  const bw = side.b ?? 0.038, dw = side.d ?? 0.089, Wo = W + 2 * dw, Do = D + 2 * dw;
  // footings: under the walls and each line the floor joists rest on, as wide as the ground's bearing asks
  const need = c.s.elements.find((e) => e.id.startsWith(`bound:momentum:${body}|`)), least = need ? c.val(need.id, /with the sized/) ?? c.val(need.id, /least meeting area/) ?? 0 : 0;
  const lines = Math.max(0, Math.round(down.lines)), hf = STRIP_FOOTING.depth;
  const runs = 2 * Wo + 2 * Do + lines * Do, wf = B.v('footing width', Math.max(STRIP_FOOTING.width, least / Math.max(1, runs)), 'm', `the ground's least meeting area, ${least.toFixed(2)} m², over ${runs.toFixed(1)} m of footing, and no less than ${STRIP_FOOTING.width * 1e3} mm (${STRIP_FOOTING.source})`);
  const footing = (id: string, at: V3, size: V3) => B.add({ id: `footings/${id}`, name: `strip footing ${(size[0] > size[2] ? size[0] : size[2]).toFixed(2)} m × ${(wf * 1e3).toFixed(0)} × ${(hf * 1e3).toFixed(0)} mm, concrete`, category: 'structure/foundation', material: 'concrete.c30', system: id.startsWith('line') ? 'lines' : 'perimeter', shape: { kind: 'block', size }, at, colour: 0x9e9e9e, values: B.of('footing width') }, 2400);
  for (const sz of [-1, 1]) footing(`perimeter-${sz < 0 ? 'back' : 'front'}`, [0, hf / 2, sz * (Do / 2 - wf / 2)], [Wo, hf, wf]);
  for (const sx of [-1, 1]) footing(`perimeter-${sx < 0 ? 'left' : 'right'}`, [sx * (Wo / 2 - wf / 2), hf / 2, 0], [wf, hf, Do - 2 * wf]);
  for (let k = 1; k <= lines; k++) footing(`line-${k}`, [-Wo / 2 + (k * Wo) / (lines + 1), hf / 2, 0], [wf, hf, Do - 2 * wf]);
  // floor joists across the width, at the spacing sized, insulation between, a board over, then the deck
  const along = (len: number, b: number, sp: number) => { const out: number[] = []; for (let u = -len / 2 + b / 2; u < len / 2 - b / 2 - 1e-6; u += sp) out.push(u); if (len / 2 - b / 2 - out.at(-1)! > sp / 4) out.push(len / 2 - b / 2); else out[out.length - 1] = len / 2 - b / 2; return out; };
  const bf = down.b ?? 0.038, df = down.d ?? 0.184, spf = down.spacing ?? 0.61;
  const joists = along(Do, bf, spf);
  joists.forEach((z, i) => B.add({ id: `floor/joist-${i + 1}`, name: `floor joist ${((bf) * 1e3).toFixed(0)} × ${(df * 1e3).toFixed(0)} × ${Wo.toFixed(2)} m`, category: 'structure/frame', material: timber(down), system: 'joists', shape: { kind: 'block', size: [Wo, df, bf] }, at: [0, hf + df / 2, z], colour: 0xc89a62, values: [{ name: 'section', value: df, unit: 'm', law: say(down, 'the generator sized the floor') }] }, down.density));
  for (let i = 0; i + 1 < joists.length; i++) { const gap = joists[i + 1]! - joists[i]! - bf; if (gap > 1e-3) B.add({ id: `floor/batt-${i + 1}`, name: `mineral wool batt ${(df * 1e3).toFixed(0)} mm between joists`, category: 'thermal/insulation', material: 'mineral wool', system: 'insulation', shape: { kind: 'block', size: [Wo, df, gap] }, at: [0, hf + df / 2, (joists[i]! + joists[i + 1]!) / 2], colour: 0xfff59d, values: B.of('floor insulation') }, MINERAL_WOOL.density); }
  const tb = Math.max(0, tf - df);
  if (tb > 1e-3) B.add({ id: 'floor/board', name: `rigid mineral wool board ${(tb * 1e3).toFixed(0)} mm over the joists`, category: 'thermal/insulation', material: 'mineral wool board', system: 'insulation', shape: { kind: 'block', size: [Wo, tb, Do] }, at: [0, hf + df + tb / 2, 0], colour: 0xfff176, values: B.of('floor insulation') }, 140);
  const fl0 = hf + df + tb;
  B.add({ id: 'floor/deck', name: `floor deck, OSB/3 ${BOARDS.osb.t * 1e3} mm`, category: 'structure/envelope', material: 'OSB/3', system: 'deck', shape: { kind: 'block', size: [Wo, BOARDS.osb.t, Do] }, at: [0, fl0 + BOARDS.osb.t / 2, 0], colour: 0xd7b98e, values: [] }, BOARDS.osb.density);
  const fl = fl0 + BOARDS.osb.t, Hs = H - 2 * bw;
  // walls: plates, studs at the spacing sized, rows of blocking, insulation between, boards inside and out, bracing
  const brace = sizedOf(c, `bracing:${body}:side`), F = c.val(`bracing:${body}:side`, /largest force in a bar/) ?? 0, bars = Math.max(1, Math.round(c.val(`bracing:${body}:side`, /least bars/) ?? 1));
  const strapA = F ? (F * 1.5) / 235e6 : 0, strapT = Math.max(2 * mm, Math.ceil((strapA / 0.05) * 1e3) * mm);
  if (F) B.v('brace', strapA, 'm^2', `A = F γ / f_y: the largest force in a bar the generator found, ${(F / 1e3).toFixed(1)} kN, at γ 1.5 over S235's 235 MPa: a 50 × ${(strapT * 1e3).toFixed(0)} mm steel flat`);
  void brace;
  const outerBoard = Math.max(0, tw - dw);
  const walls = [
    { name: 'front', axis: 0, len: Wo, off: D / 2 + dw / 2, sign: 1 }, { name: 'back', axis: 0, len: Wo, off: -(D / 2 + dw / 2), sign: -1 },
    { name: 'left', axis: 2, len: D, off: -(W / 2 + dw / 2), sign: -1 }, { name: 'right', axis: 2, len: D, off: W / 2 + dw / 2, sign: 1 },
  ] as const;
  const boards = {} as Framed['boards'], innerAt = {} as Framed['inner']['wall'];
  for (const w of walls) {
    const id = `wall-${w.name}`, rows = Math.max(0, Math.round(side.blocking));
    // a position along the wall and through it, to the world
    const at = (u: number, y: number, n: number): V3 => (w.axis === 0 ? [u, y, w.off + n] : [w.off + n, y, u]);
    const size = (lu: number, ly: number, ln: number): V3 => (w.axis === 0 ? [lu, ly, ln] : [ln, ly, lu]);
    const wood = { category: 'structure/frame', material: timber(side), colour: 0xc89a62 } as const;
    B.add({ id: `${id}/plate-bottom`, name: `bottom plate ${(bw * 1e3).toFixed(0)} × ${(dw * 1e3).toFixed(0)} mm`, ...wood, system: 'plates', shape: { kind: 'block', size: size(w.len, bw, dw) }, at: at(0, fl + bw / 2, 0), values: [] }, side.density);
    B.add({ id: `${id}/plate-top`, name: `top plate ${(bw * 1e3).toFixed(0)} × ${(dw * 1e3).toFixed(0)} mm`, ...wood, system: 'plates', shape: { kind: 'block', size: size(w.len, bw, dw) }, at: at(0, fl + bw + Hs + bw / 2, 0), values: [] }, side.density);
    const studs = along(w.len, bw, side.spacing ?? 0.406);
    studs.forEach((u, i) => B.add({ id: `${id}/stud-${i + 1}`, name: `stud ${(bw * 1e3).toFixed(0)} × ${(dw * 1e3).toFixed(0)} × ${(Hs * 1e3).toFixed(0)} mm`, ...wood, system: 'studs', shape: { kind: 'block', size: size(bw, Hs, dw) }, at: at(u, fl + bw + Hs / 2, 0), values: [{ name: 'section', value: dw, unit: 'm', law: say(side, 'the generator sized the walls') }] }, side.density));
    for (let i = 0; i + 1 < studs.length; i++) {
      const gap = studs[i + 1]! - studs[i]! - bw, mid = (studs[i]! + studs[i + 1]!) / 2;
      if (gap <= 1e-3) continue;
      const cuts = [fl + bw, ...Array.from({ length: rows }, (_, j) => fl + bw + (Hs * (j + 1)) / (rows + 1)), fl + bw + Hs];
      for (let j = 1; j <= rows; j++) B.add({ id: `${id}/blocking-${i + 1}-${j}`, name: `blocking ${(gap * 1e3).toFixed(0)} mm`, ...wood, system: 'blocking', shape: { kind: 'block', size: size(gap, bw, dw) }, at: at(mid, cuts[j]!, 0), values: [] }, side.density);
      for (let j = 0; j < cuts.length - 1; j++) {
        const y0 = cuts[j]! + (j > 0 ? bw / 2 : 0), y1 = cuts[j + 1]! - (j + 1 < cuts.length - 1 ? bw / 2 : 0);
        if (y1 - y0 > 1e-3) B.add({ id: `${id}/batt-${i + 1}-${j + 1}`, name: `mineral wool batt ${(dw * 1e3).toFixed(0)} mm`, category: 'thermal/insulation', material: 'mineral wool', system: 'insulation', shape: { kind: 'block', size: size(gap, y1 - y0, dw) }, at: at(mid, (y0 + y1) / 2, 0), colour: 0xfff59d, values: B.of('wall insulation') }, MINERAL_WOOL.density);
      }
    }
    // inside: plasterboard; outside: straps, sheathing, and the insulation the studs' depth leaves short
    const inward = -w.sign, ib = BOARDS.plasterboard.t;
    B.add({ id: `${id}/board-in`, name: `plasterboard ${ib * 1e3} mm`, category: 'structure/envelope', material: 'gypsum board', system: 'boards', shape: { kind: 'block', size: size(w.axis === 0 ? W : D, H, ib) }, at: at(0, fl + H / 2, inward * (dw / 2 + ib / 2)), colour: 0xf5f5f5, values: [] }, BOARDS.plasterboard.density);
    boards[w.name] = `${id}/board-in`;
    innerAt[w.name] = w.off + inward * (dw / 2 + ib);
    let out = dw / 2;
    if (F) {
      const half = w.len / bars, diag = Math.hypot(half, Hs), ang = Math.atan2(Hs, half);
      for (let k = 0; k < bars; k++) B.add({ id: `${id}/brace-${k + 1}`, name: `diagonal brace, steel flat 50 × ${(strapT * 1e3).toFixed(0)} mm × ${diag.toFixed(2)} m`, category: 'structure/frame', material: 'steel.a36', system: 'bracing', shape: { kind: 'block', size: size(diag, 0.05, strapT) }, at: at(-w.len / 2 + half * (k + 0.5), fl + bw + Hs / 2, w.sign * (out + strapT / 2)), turn: { axis: w.axis === 0 ? 'z' : 'x', angle: (k % 2 ? -1 : 1) * ang * (w.axis === 0 ? 1 : -1) }, colour: 0x607d8b, values: B.of('brace'), into: studs.map((_, i) => `${id}/stud-${i + 1}`).filter((_, i) => i % 3 === 0) }, 7850);
      out += strapT;
    }
    B.add({ id: `${id}/sheathing`, name: `sheathing, OSB/3 ${BOARDS.sheathing.t * 1e3} mm`, category: 'structure/envelope', material: 'OSB/3', system: 'boards', shape: { kind: 'block', size: size(w.len + (w.axis === 0 ? 2 * (out - dw / 2 + BOARDS.sheathing.t) : 0), H, BOARDS.sheathing.t) }, at: at(0, fl + H / 2, w.sign * (out + BOARDS.sheathing.t / 2)), colour: 0xd7b98e, values: [], into: [`${id}/plate-bottom`, `${id}/plate-top`] }, BOARDS.sheathing.density);
    out += BOARDS.sheathing.t;
    if (outerBoard > 1e-3) B.add({ id: `${id}/outer-board`, name: `wood-fibre insulation board ${(outerBoard * 1e3).toFixed(0)} mm, rendered`, category: 'thermal/insulation', material: 'wood-fibre board', system: 'insulation', shape: { kind: 'block', size: size(w.len + (w.axis === 0 ? 2 * (out - dw / 2 + outerBoard) : 0), H, outerBoard) }, at: at(0, fl + H / 2, w.sign * (out + outerBoard / 2)), colour: 0xbcaaa4, values: B.of('wall insulation'), into: [`${id}/sheathing`] }, 160);
  }
  for (const e of c.s.elements) if (e.id.startsWith(`boundary:energy:${body}|`) || e.id.startsWith(`boundary:volume of water:${body}|`)) B.use(e.id);
  // the roof: joists across the width on the walls and on bearing walls under each support line the generator sized
  const top = fl + H, br = up.b ?? 0.038, dr = up.d ?? 0.184, rl = Math.max(0, Math.round(up.lines));
  const rj = along(Do, br, up.spacing ?? 0.61);
  const ceilingJoists = rj.map((z, i) => ({ z, id: `roof/joist-${i + 1}` }));
  rj.forEach((z, i) => B.add({ id: `roof/joist-${i + 1}`, name: `roof joist ${(br * 1e3).toFixed(0)} × ${(dr * 1e3).toFixed(0)} × ${Wo.toFixed(2)} m`, category: 'structure/frame', material: timber(up), system: 'joists', shape: { kind: 'block', size: [Wo, dr, br] }, at: [0, top + dr / 2, z], colour: 0xc89a62, values: [{ name: 'section', value: dr, unit: 'm', law: say(up, 'the generator sized the roof') }] }, up.density));
  for (let i = 0; i + 1 < rj.length; i++) { const gap = rj[i + 1]! - rj[i]! - br; if (gap > 1e-3) B.add({ id: `roof/batt-${i + 1}`, name: `mineral wool batt ${(dr * 1e3).toFixed(0)} mm between roof joists`, category: 'thermal/insulation', material: 'mineral wool', system: 'insulation', shape: { kind: 'block', size: [Wo, dr, gap] }, at: [0, top + dr / 2, (rj[i]! + rj[i + 1]!) / 2], colour: 0xfff59d, values: B.of('roof insulation') }, MINERAL_WOOL.density); }
  const trb = Math.max(0, tr - dr);
  let y = top + dr;
  if (trb > 1e-3) { B.add({ id: 'roof/board', name: `rigid insulation board ${(trb * 1e3).toFixed(0)} mm over the joists`, category: 'thermal/insulation', material: 'mineral wool board', system: 'insulation', shape: { kind: 'block', size: [Wo, trb, Do] }, at: [0, y + trb / 2, 0], colour: 0xfff176, values: B.of('roof insulation') }, 140); y += trb; }
  B.add({ id: 'roof/deck', name: `roof deck, OSB/3 ${BOARDS.osb.t * 1e3} mm`, category: 'structure/envelope', material: 'OSB/3', system: 'deck', shape: { kind: 'block', size: [Wo + 0.3, BOARDS.osb.t, Do + 0.3] }, at: [0, y + BOARDS.osb.t / 2, 0], colour: 0xd7b98e, values: [] }, BOARDS.osb.density);
  y += BOARDS.osb.t;
  B.add({ id: 'roof/membrane', name: 'roof membrane, EPDM 1.5 mm, laid to fall', category: 'structure/envelope', material: 'EPDM', system: 'membrane', shape: { kind: 'block', size: [Wo + 0.3, 1.5 * mm, Do + 0.3] }, at: [0, y + 0.75 * mm, 0], colour: 0x37474f, values: [] }, 1150);
  const roofTop = y + 1.5 * mm;
  const bs = bear.b ?? 0.038, bd = bear.d ?? 0.089;
  for (let k = 1; k <= rl; k++) {
    const x = -W / 2 + (k * W) / (rl + 1), id = `bearing-wall-${k}`;
    const wood = { category: 'structure/frame', material: timber(bear), colour: 0xd8b074 } as const;
    B.add({ id: `${id}/plate-bottom`, name: `bottom plate ${(bs * 1e3).toFixed(0)} × ${(bd * 1e3).toFixed(0)} mm`, ...wood, system: 'plates', shape: { kind: 'block', size: [bd, bs, D] }, at: [x, fl + bs / 2, 0], values: [] }, bear.density);
    B.add({ id: `${id}/plate-top`, name: `top plate ${(bs * 1e3).toFixed(0)} × ${(bd * 1e3).toFixed(0)} mm`, ...wood, system: 'plates', shape: { kind: 'block', size: [bd, bs, D] }, at: [x, top - bs / 2, 0], values: [] }, bear.density);
    along(D, bs, bear.spacing ?? 0.406).forEach((z, i) => B.add({ id: `${id}/stud-${i + 1}`, name: `stud ${(bs * 1e3).toFixed(0)} × ${(bd * 1e3).toFixed(0)} × ${((H - 2 * bs) * 1e3).toFixed(0)} mm`, ...wood, system: 'studs', shape: { kind: 'block', size: [bd, H - 2 * bs, bs] }, at: [x, fl + H / 2, z], values: [{ name: 'section', value: bd, unit: 'm', law: say(bear, `the generator sized the line under the roof's support line ${k}`) }] }, bear.density));
  }
  B.trace.push({ stage: 'frame', where: 'frame', round: 1, says: `${joists.length} floor joists on ${lines + 4} footings, studs at ${((side.spacing ?? 0) * 1e3).toFixed(0)} mm, ${rj.length} roof joists on ${rl} bearing walls`, flaws: [], remedy: null });
  // what the people pass through, and what lets light in
  const passage = c.s.elements.find((e) => e.id.startsWith('passage:') && e.id.endsWith(`|${body}`));
  const doorH = Math.min(2.1, H - 0.1);
  B.add({ id: 'openings/door', name: 'door 0.9 × 2.1 m, insulated, a lever handle and a lock', category: 'structure/envelope', material: 'timber, foam core', system: 'doors', shape: { kind: 'block', size: [0.9, doorH, 0.05] }, at: [0, fl + doorH / 2, Do / 2 + 0.025 + (out(D) - dw)], colour: 0x8d6e63, values: passage ? [{ name: 'time to leave', value: c.val(passage.id, /time to leave/) ?? 0, unit: 's', law: 'the generator: the farthest distance to the sides at the speed the people move' }] : [], into: ['wall-front/stud-1', 'wall-front/plate-bottom'] }, 400);
  if (passage) B.use(passage.id, `modulation:${passage.id}`);
  function out(_: number) { return dw + (F ? strapT : 0) + BOARDS.sheathing.t + outerBoard; }
  const light = c.s.elements.find((e) => e.id.startsWith(`boundary:light:${body}|`) && e.id.endsWith(':open'));
  if (light) {
    B.use(light.id);
    const glazing = B.v('glazing', 0.15 * W * D, 'm^2', 'windows of about 15 % of the floor area, past the 10 % many building codes ask (estimate)');
    const each = glazing / 4, ww = Math.min(2.4, Math.sqrt(each * 1.6)), wh = each / ww;
    for (const w of walls) {
      const u = w.name === 'front' ? W / 4 : 0, n = w.sign * (out(0) - dw / 2 + 0.03);
      B.add({ id: `openings/window-${w.name}`, name: `window ${ww.toFixed(1)} × ${wh.toFixed(1)} m, triple glazed`, category: 'structure/envelope', material: 'glass, timber frame', system: 'windows', shape: { kind: 'block', size: w.axis === 0 ? [ww, wh, 0.06] : [0.06, wh, ww] }, at: w.axis === 0 ? [u, fl + 0.9 + wh / 2, w.off + n] : [w.off + n, fl + 0.9 + wh / 2, u], colour: 0x81d4fa, values: B.of('glazing'), into: [`wall-${w.name}/stud-1`, `wall-${w.name}/sheathing`] }, 900);
    }
  }
  // rain off the roof: gutters and downpipes as many as what the faces intercept asks
  const rain = c.s.elements.find((e) => e.id.startsWith('path:volume of water:') && e.id.endsWith('->the sewer') && !e.id.includes(`${body}->`));
  if (rain) {
    B.use(rain.id);
    const Qr = c.val(rain.id, /what it carries/) ?? 0.002, n = Math.max(2, Math.ceil(Qr / DOWNPIPE.q));
    B.v('downpipes', n, '1', `${(Qr * 1e3).toFixed(1)} L/s of rain the faces intercept over ${DOWNPIPE.q * 1e3} L/s an ${DOWNPIPE.d * 1e3} mm downpipe carries (${DOWNPIPE.source})`);
    for (const sz of [-1, 1]) B.add({ id: `rainwater/gutter-${sz < 0 ? 'back' : 'front'}`, name: 'gutter 125 mm half-round', category: 'fluid/pipes', material: 'PVC-U', system: 'gutters', shape: { kind: 'block', size: [Wo + 0.3, 0.07, 0.125] }, at: [0, roofTop - 0.035, sz * (Do / 2 + 0.15 + 0.0625)], colour: 0x455a64, values: [], into: ['roof/deck'] }, 300);
    for (let k = 0; k < n; k++) { const sx = k % 2 ? 1 : -1, sz = k < 2 ? 1 : -1; B.add({ id: `rainwater/downpipe-${k + 1}`, name: `downpipe Ø${DOWNPIPE.d * 1e3} mm, to a gully 150 mm above the ground`, category: 'fluid/pipes', material: 'PVC-U', system: 'downpipes', shape: { kind: 'round', r: DOWNPIPE.d / 2, length: roofTop - 0.07 - 0.15, axis: 'y' }, at: [sx * (Wo / 2 + 0.05), 0.15 + (roofTop - 0.07 - 0.15) / 2, sz * (Do / 2 + 0.15 + 0.0625)], colour: 0x455a64, values: B.of('downpipes'), into: [`rainwater/gutter-${sz < 0 ? 'back' : 'front'}`] }, 300); }
  }
  const inner = { wall: innerAt, floor: fl, ceiling: top };
  return { inner, boards, ceilingJoists, outer: [Wo, roofTop, Do] };
}

function standing(c: Ctx, B: B, body: string, ext: V3): { source: V3; sourceInto: string[] } {
  const [W, , D] = ext;
  const f = framed(c, B, body, ext), V = c.q('the grid', /voltage/) ?? 230, fl = f.inner.floor, inW = f.inner.wall;
  const onWall = (wall: 'front' | 'back' | 'left' | 'right', u: number, y: number, size: V3): { at: V3; size: V3; into: string[] } => {
    const n = inW[wall], d = wall === 'front' || wall === 'right' ? -1 : 1;
    if (wall === 'front' || wall === 'back') return { at: [u, y, n + d * size[2] / 2], size, into: [f.boards[wall]] };
    return { at: [n + d * size[2] / 2, y, u], size: [size[2], size[1], size[0]], into: [f.boards[wall]] };
  };
  // the air exchanged for what the people breathe out, through a unit that gives back most of the heat it carries out
  const ex = c.s.elements.find((e) => e.id.startsWith(`exchange:${body}|`)), recovery = c.s.elements.find((e) => e.id.startsWith(`recovery:${body}|`));
  const Qa = ex ? c.val(ex.id, /least flow/) ?? 0 : 0, airHeat = ex ? c.val(ex.id, /heat it carries out/) ?? 0 : 0;
  if (ex && Qa > 0) {
    const fan = FANS.find((x) => x.q >= Qa) ?? FANS.at(-1)!;
    B.v('air exchanged', Qa, 'm^3/s', `the generator's least flow, the largest the species need: ${(Qa * 3600).toFixed(0)} m³/h`);
    const p = onWall('left', D / 4, fl + 2.0, [0.6, 0.35, 0.3]);
    B.add({ id: 'air/unit', name: `${recovery ? 'heat-recovery ventilation unit' : 'ventilation fan'}, ${fan.id}, ${(fan.q * 3600).toFixed(0)} m³/h (${FANS_SRC.source})`, category: 'fluid/air', material: 'EPP case, aluminium exchanger', system: 'ventilation', shape: { kind: 'block', size: p.size }, at: p.at, colour: 0xcfd8dc, values: B.of('air exchanged'), mass: 8, into: p.into }, 0);
    for (const sz of [-1, 1]) B.add({ id: `air/duct-${sz < 0 ? 'in' : 'out'}`, name: `duct Ø${Math.round(fan.d * 1e3)} mm through the wall`, category: 'fluid/air', material: 'galvanised steel', system: 'ducts', shape: { kind: 'round', r: fan.d / 2, length: 0.5, axis: 'x' }, at: [inW.left - 0.15, fl + 2.0, D / 4 + sz * 0.15], colour: 0xb0bec5, values: [], into: ['air/unit', 'wall-left/board-in'] }, 600);
    B.loads.push({ id: 'ventilation', name: 'ventilation', P: fan.W, V, at: p.at, conductors: 2 });
    B.use(ex.id, ...(recovery ? [recovery.id] : []), ...c.s.elements.filter((e) => e.id.startsWith('conversion:volume of air:') || e.id.startsWith('shed:conversion:volume of air:') || e.id.startsWith('wind:exchange:') || (e.id.startsWith('boundary:amount of') && e.id.includes(`${body}|`))).map((e) => e.id));
  }
  // heating: what the envelope loses and what the exchanged air carries out, less what the recovery unit gives back
  const outside = c.intent.regions.find((r) => r.environment && /air|outside/.test(r.id));
  const Tin = (c.want(body, 'degC', /temperature/, 'lo') ?? 293.15) - 273.15, Tout = (outside ? c.q(outside.id, /coldest/) ?? 253.15 : 253.15) - 273.15, dT = Math.max(1, Tin - Tout);
  const [Wo, , Do] = f.outer, H = ext[1];
  const Qenv = B.v('heat lost through the envelope', (ENVELOPE_U.wall * 2 * (Wo + Do) * H + ENVELOPE_U.roof * Wo * Do + ENVELOPE_U.floor * Wo * Do) * dT, 'W', `Q = Σ U A ΔT across walls, roof and floor, ${Tin.toFixed(0)} °C inside, ${Tout.toFixed(0)} °C outside`);
  const supply = c.s.elements.find((e) => e.id === `conversion:energy:${body}:supply`);
  if (supply) {
    B.use(supply.id);
    const Qair = (recovery ? 1 - HEAT_RECOVERY.value : 1) * (c.val(supply.id, /least it supplies/) ?? airHeat);
    const Pheat = (Qenv + Qair) * 1.25, each = 1000, n = Math.max(1, Math.ceil(Pheat / each));
    B.v('heating', n * each, 'W', `${n} × ${each} W panels: 1.25 times the envelope's ${Qenv.toFixed(0)} W and the exchanged air's ${Qair.toFixed(0)} W${recovery ? ` (${HEAT_RECOVERY.value * 100} % recovered: ${HEAT_RECOVERY.source})` : ''}`);
    const wall = (k: number) => (['back', 'left', 'right', 'front'] as const)[k % 4];
    for (let k = 0; k < n; k++) {
      const w = wall(k)!, len = w === 'front' || w === 'back' ? W : D, u = ((Math.floor(k / 4) + 0.5) / Math.ceil(n / 4) - 0.5) * len * 0.6 + (w === 'front' ? -W / 4 : 0);
      const p = onWall(w, u, fl + 0.35, [0.8, 0.45, 0.08]);
      B.add({ id: `heating/panel-${k + 1}`, name: `${each} W electric panel heater`, category: 'thermal/heating', material: 'steel case, nichrome element', system: 'panels', shape: { kind: 'block', size: p.size }, at: p.at, colour: 0xeceff1, values: B.of('heating'), mass: 9, into: p.into }, 0);
      B.loads.push({ id: `heater ${k + 1}`, name: `heater ${k + 1}`, P: each, V, at: p.at, conductors: 2 });
    }
  }
  B.use(`store:energy:${body}:smoothing`);
  // water in to a tap over a basin, waste out to the sewer
  const water = c.s.elements.find((e) => e.id.startsWith('path:volume of water') && e.id.endsWith(`->${body}`));
  const basin = onWall('back', W / 4, fl + 0.85, [0.5, 0.15, 0.4]);
  if (water) {
    B.use(water.id, ...c.s.elements.filter((e) => e.id === `shed:${water.id}` || e.id === `protection:${water.id}` || e.id.startsWith(`use:volume of water:${body}`) || e.id.startsWith(`modulation:volume of water:${body}`)).map((e) => e.id));
    const use = c.val(`use:volume of water:${body}`, /least flux/) ?? (c.val(water.id, /least conductance/) ?? 1e-9) * (c.val(water.id, /largest drop/) ?? 2e5);
    const pipe = COPPER_PIPES.find((p) => use / (Math.PI * ((p.d - 2 * p.t) / 2) ** 2) <= PIPE_VELOCITY.value) ?? COPPER_PIPES.at(-1)!;
    B.v('water flow', use, 'm^3/s', `the most the inside draws at once: ${(use * 6e4).toFixed(1)} L/min`);
    B.add({ id: 'water/basin', name: 'basin, vitreous china', category: 'fluid/pipes', material: 'vitreous china', system: 'fittings', shape: { kind: 'block', size: basin.size }, at: basin.at, colour: 0xfafafa, values: [], mass: 12, into: basin.into }, 0);
    B.add({ id: 'water/tap', name: 'tap and stop valve', category: 'fluid/pipes', material: 'brass.c360', system: 'fittings', shape: { kind: 'block', size: [0.06, 0.12, 0.06] }, at: [basin.at[0], basin.at[1] + 0.135, basin.at[2] - 0.1], colour: 0xd4af37, values: [], mass: 0.8, into: ['water/basin'] }, 0);
    B.add({ id: 'water/main', name: `${pipe.id} copper tube (${COPPER_PIPES_SRC.source}), from the main`, category: 'fluid/pipes', material: 'copper.c110', system: 'supply', shape: { kind: 'wire', points: [[W / 4, -0.6, -Do / 2 - 1], [W / 4, -0.6, inW.back + 0.03], [W / 4, basin.at[1] + 0.1, inW.back + 0.03]], r: pipe.d / 2 }, at: [W / 4, 0, inW.back], colour: 0xb87333, values: [{ name: 'velocity', value: use / (Math.PI * ((pipe.d - 2 * pipe.t) / 2) ** 2), unit: 'm/s', law: `v = Q/A ≤ ${PIPE_VELOCITY.value} m/s (${PIPE_VELOCITY.source})` }], mass: 1.5 }, 0);
  }
  const waste = c.s.elements.find((e) => e.id === `path:volume of water:${body}->the sewer`);
  if (waste) {
    B.use(waste.id, ...c.s.elements.filter((e) => e.id.startsWith('collect:volume of water')).map((e) => e.id));
    B.add({ id: 'drainage/waste', name: 'waste pipe Ø110 mm, PVC-U, a trap under the basin, to the sewer at a 1 in 40 fall', category: 'fluid/pipes', material: 'PVC-U', system: 'waste', shape: { kind: 'wire', points: [[basin.at[0], basin.at[1] - 0.1, basin.at[2]], [basin.at[0], -0.5, basin.at[2]], [basin.at[0], -0.7, -Do / 2 - 2]], r: 0.055 }, at: basin.at, colour: 0x8d6e63, values: [], mass: 4 }, 0);
  }
  // light: fittings from the flux density asked over the floor, through their radiant efficiency, under the joists
  const lightUse = c.s.elements.find((e) => e.id === `use:light:${body}`), lamp = c.s.elements.find((e) => e.id === `conversion:light:${body}:supply`);
  if (lightUse && lamp) {
    const E = c.val(lightUse.id, /least flux density/) ?? 2, Pl = B.v('lighting', (E * W * D) / LED_RADIANT_EFFICIENCY.value, 'W', `${E} W/m² of light over ${(W * D).toFixed(0)} m² at ${LED_RADIANT_EFFICIENCY.value} radiant efficiency (${LED_RADIANT_EFFICIENCY.source})`);
    const each = 36, n = Math.max(1, Math.ceil(Pl / each)), cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols);
    const js = f.ceilingJoists.filter((j) => Math.abs(j.z) < D / 2 - 0.3);
    for (let k = 0; k < n; k++) {
      const i = k % cols, j = Math.floor(k / cols), x = ((i + 0.5) / cols - 0.5) * W, zWant = ((j + 0.5) / rows - 0.5) * D;
      const joist = js.reduce((a, b) => (Math.abs(b.z - zWant) < Math.abs(a.z - zWant) ? b : a), js[0]!);
      B.add({ id: `lighting/panel-${k + 1}`, name: `LED panel ${each} W, 600 × 600 mm`, category: 'circuits/lighting', material: 'aluminium frame, PMMA diffuser', system: 'fittings', shape: { kind: 'block', size: [0.6, 0.03, 0.6] }, at: [x, f.inner.ceiling - 0.015, joist.z], colour: 0xfffde7, values: B.of('lighting'), mass: 3, into: [joist.id] }, 0);
    }
    const circuits = Math.ceil((n * each) / 1000);
    for (let k = 0; k < circuits; k++) B.loads.push({ id: `lighting ${k + 1}`, name: `lighting circuit ${k + 1}`, P: Math.min(1000, n * each - k * 1000), V, at: [((k + 0.5) / circuits - 0.5) * W, f.inner.ceiling - 0.03, 0], conductors: 2 });
    B.use(lightUse.id, lamp.id, `shed:${lamp.id}`, `modulation:light:${body}:person`);
  }
  // sockets and the rest the inside draws
  const sockets = c.val(`use:charge:${body}`, /least power/);
  if (sockets) {
    B.use(`use:charge:${body}`, `modulation:charge:${body}:person`);
    const n = Math.ceil(sockets / 3680);
    B.v('socket circuits', n, '1', `${(sockets / 1e3).toFixed(0)} kW the inside draws over 3.68 kW a 16 A circuit carries at ${V} V`);
    for (let k = 0; k < n; k++) { const w = (['back', 'left', 'right', 'front'] as const)[k % 4]!, p = onWall(w, (k % 2 ? 1 : -1) * 1.2, fl + 0.3, [0.086, 0.086, 0.04]); B.add({ id: `sockets/outlet-${k + 1}`, name: 'double socket outlet, 16 A circuit', category: 'interconnect/connectors', material: 'polycarbonate, brass', system: 'outlets', shape: { kind: 'block', size: p.size }, at: p.at, colour: 0xffffff, values: B.of('socket circuits'), mass: 0.15, into: p.into }, 0); B.loads.push({ id: `sockets ${k + 1}`, name: `socket circuit ${k + 1}`, P: Math.min(3680, sockets - k * 3680), V, at: p.at, conductors: 2 }); }
  }
  // the supply: a meter and consumer unit on the wall the grid comes in through
  const unit = onWall('left', -D / 4, fl + 1.5, [0.36, 0.3, 0.12]);
  B.add({ id: 'supply/unit', name: 'consumer unit: a main switch, a residual-current device, a breaker for each circuit', category: 'interconnect/protection', material: 'polycarbonate, copper', system: 'supply', shape: { kind: 'block', size: unit.size }, at: unit.at, colour: 0xeceff1, values: [], mass: 4, into: unit.into }, 0);
  for (const e of c.s.elements) if (/^(path|return|shed|protection):(path:)?charge:the grid|^path:charge:the grid|^return:charge:/.test(e.id) || e.id.endsWith('charge:the grid->' + body)) B.use(e.id);
  for (const e of c.s.elements) if (e.id.includes('charge:the grid')) B.use(e.id);
  return { source: unit.at, sourceInto: unit.into };
}

// ---- the whole --------------------------------------------------------------------------------------------------------
function once(intent: Intent, s: Structure, self: number): Omit<Machine, 'rounds'> {
  const c = context(intent, s), B = builder();
  const body = bodyOf(c);
  const empty = { axes: [], hotEnd: null, electrical: null, order: [] };
  if (!body) return { name: intent.name, parts: [], values: [], flaws: [{ check: 'body', where: intent.name, says: 'nothing of the person\'s to embody', law: 'a region the wants are about', value: 0, limit: 1, remedy: null }], trace: [], size: [0, 0, 0], bom: [], config: [], ...empty };
  const ext = extentOfRegion(c, body.id);
  const ground = s.elements.find((e) => e.id.startsWith(`contact:${body.id}|`))?.id.split('|')[1] ?? null;
  const thrust = s.elements.find((e) => e.id.startsWith(`thrust:${body.id}|`));
  // ways that exclude each other: charge where it is offered, the others kept as not chosen
  const stores = s.elements.filter((e) => e.id.startsWith('store:') && e.id.includes(`:moving:${body.id}`));
  const chosen = stores.find((e) => e.id.startsWith('store:charge')) ?? stores[0];
  for (const st of stores.filter((x) => x !== chosen)) {
    const carrier = st.id.split(':')[1]!;
    const others = s.elements.filter((e) => e.id.includes(`${carrier}:`) || e.id.includes(`${carrier}->`));
    B.use(...others.map((e) => e.id));
    B.trace.push({ stage: 'choose', where: st.id, round: 1, says: `${chosen?.id.split(':')[1] ?? 'one'} chosen over ${carrier}: the generator offers both for the same store; ${others.length} elements of ${carrier} not built`, flaws: [], remedy: null });
  }
  let batteryAt: V3 = [0, 0.05, 0], batteryInto: string[] = [], source: V3 = [ext[0] / 2 + 0.2, 0.5, 0], sourceInto: string[] = [], cruise: ((v: number) => number) | null = null, hover = 0;
  if (body.moving && ground) {
    const r = rolling(c, B, body.id, ext, self, ground);
    shell(c, B, body.id, ext, r.deck);
    batteryAt = [0, r.deck + 2 * mm, -ext[2] / 4]; batteryInto = ['body/floor']; cruise = r.cruise;
    const V = B.loads[0]?.V ?? 48;
    climate(c, B, body.id, MINERAL_WOOL.k, 10 * mm, r.heatAt, ['chassis/cross-front'], V);
  } else if (body.moving && thrust && (c.q(thrust.id.split('|')[1] ?? '', /density/) ?? 1.2) < 10) {
    const r = flying(c, B, body.id, ext, self, thrust.id.split('|')[1] ?? 'air');
    batteryAt = r.battery; batteryInto = ['frame/hub-top']; hover = r.P; cruise = r.cruise;
  } else if (!body.moving) {
    const r = standing(c, B, body.id, ext);
    source = r.source; sourceInto = r.sourceInto;
  }
  const P = B.loads.reduce((a, l) => a + l.P, 0);
  // stored charge for the range or the time asked
  const store = chosen && chosen.id.startsWith('store:charge') ? chosen : s.elements.find((e) => e.id.startsWith('store:charge'));
  if (store && P > 0) {
    const range = c.val(store.id, /distance/) ?? c.want(body.id, 'm', /^distance/, 'lo');
    const vTop = c.want(body.id, 'm/s', /^speed/, 'hi') ?? c.want(body.id, 'm/s', /^speed/, 'lo') ?? 1.5, vCruise = hover ? vTop : vTop * 0.7;
    const time = range ? range / Math.max(0.1, vCruise) : c.want(body.id, 's', /time|aloft|long/, 'lo') ?? c.val(store.id, /time|how long/) ?? 1200;
    const aux = B.loads.filter((l) => l.conductors === 2).reduce((a, l) => a + l.P, 0) * 0.5;
    const Pdraw = (cruise ? cruise(vCruise) : hover || P) + aux;
    const E = B.v('energy stored', Pdraw * time, 'J', range ? `${(Pdraw / 1e3).toFixed(2)} kW to hold ${vCruise.toFixed(0)} m/s${hover ? '' : ' (0.7 of top speed)'} and half the rest, over ${(range / 1e3).toFixed(1)} km` : `${Pdraw.toFixed(0)} W at hover over ${(time / 60).toFixed(0)} minutes`);
    const V = B.loads[0]?.V ?? 24;
    battery(c, B, E, (P * 1.2) / V, V, batteryAt, batteryInto);
    source = [batteryAt[0], batteryAt[1] + 0.05, batteryAt[2]]; sourceInto = ['battery/pack'];
  } else if (P > 0 && body.moving) B.flaws.push({ check: 'source', where: 'energy', says: 'it draws power and stores none: no source designed', law: 'every load has a source', value: P, limit: 0, remedy: null });
  // one controller for every modulation, a sensor for each observer, on it
  const mods = s.elements.filter((e) => e.kind === 'modulation'), obs = s.elements.filter((e) => e.kind === 'observer');
  const ctl: V3 = body.moving ? [source[0] + 0.25, source[1], source[2]] : [source[0], source[1] - 0.35, source[2]];
  B.add({ id: 'control/controller', name: `controller: ${B.loads.filter((l) => l.conductors === 3).length} motor drives, ${mods.length} modulations, ${obs.length} sensor inputs`, category: 'control/controller', material: 'FR4, aluminium heat spreader', system: 'controller', shape: { kind: 'block', size: [0.16, 0.03, 0.1] }, at: [ctl[0], ctl[1] + 0.015, ctl[2]], colour: 0x1b5e20, values: [], mass: 0.2, into: sourceInto.length ? sourceInto : ['body/floor'] }, 0);
  B.use(...mods.map((m) => m.id));
  obs.forEach((o, i) => {
    B.use(o.id);
    const what = /energy/.test(o.id) ? 'temperature: a thermistor' : /position/.test(o.id) ? 'position: an encoder' : /momentum/.test(o.id) ? 'speed and attitude: an inertial board' : 'a sensor';
    B.add({ id: `sensing/${i + 1}`, name: `sensor for ${what}`, category: /energy/.test(o.id) ? 'sensing/temperature' : 'sensing/position', material: 'FR4', system: 'sensors', shape: { kind: 'block', size: [0.03, 0.01, 0.03] }, at: [ctl[0] - 0.06 + (i % 4) * 0.04, ctl[1] + 0.035, ctl[2] - 0.03 + Math.floor(i / 4) * 0.04], colour: 0x26c6da, values: [{ name: 'resolution needed', value: c.val(o.id, /resolution/) ?? 0, unit: '1', law: 'what the generator asked it to resolve' }], mass: 0.01, into: ['control/controller'] }, 0);
  });
  B.trace.push({ stage: 'whole', where: 'control', round: 1, says: `one controller, ${mods.length} modulations, ${obs.length} sensors`, flaws: [], remedy: null });
  // wiring: from the source to each load, the thinnest conductor that holds its insulation and a 3 % drop
  const ins = INSULATIONS[1]!, sizes = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 6, 4, 2, 1, 0];
  for (const l of B.loads) {
    const I = l.P / l.V, len = Math.hypot(l.at[0] - source[0], l.at[1] - source[1], l.at[2] - source[2]) * 1.3 + 0.3;
    const ok = (n: number) => { const d = awgDiameter(n), Rm = COPPER.rho / (Math.PI * d * d / 4); return conductorTemperature(n, ins, I, c.ambient) <= ins.maxC - 5 && 2 * Rm * len * I <= 0.03 * l.V; };
    const awg = sizes.find(ok);
    if (awg === undefined) B.flaws.push({ check: 'conductor', where: `wiring/${l.id}`, says: `no conductor to AWG 0 carries ${I.toFixed(0)} A over ${len.toFixed(1)} m within a 3 % drop`, law: 'ΔV = 2 I R l ≤ 3 %', value: I, limit: 0, remedy: null });
    const n = awg ?? 0, d = awgDiameter(n) + 2 * ins.wall;
    B.add({ id: `wiring/${l.id}`, name: `${l.name} cable: ${l.conductors} × AWG ${n}, ${ins.name}, ${len.toFixed(1)} m`, category: 'interconnect/conductors/awg', material: `copper, ${ins.name}`, system: 'cables', shape: { kind: 'wire', points: [source, [source[0], Math.max(source[1], l.at[1]) + 0.02, l.at[2]], l.at], r: (d / 2) * Math.sqrt(l.conductors) }, at: source, colour: l.conductors === 3 ? COLOURS['phase 1']!.hex : COLOURS['dc positive']!.hex, values: [{ name: 'current', value: I, unit: 'A', law: `I = P / V: ${l.P.toFixed(0)} W at ${l.V} V` }], mass: l.conductors * Math.PI * (awgDiameter(n) / 2) ** 2 * len * COPPER.density }, 0);
  }
  if (B.loads.length) B.trace.push({ stage: 'wiring', where: 'wiring', round: 1, says: `${B.loads.length} circuits from the ${store ? 'battery' : 'supply'}`, flaws: [], remedy: null });
  // what nothing here designs is a gap, located on its element
  const gaps = s.elements.filter((e) => !B.used.has(e.id) && !/^(bound)$/.test(e.kind) && !(e.kind === 'region' && e.id.startsWith('moving:')));
  for (const e of gaps.slice(0, 24)) B.flaws.push({ check: 'gap', where: e.id, says: `nothing designs ${e.kind} "${e.id}" yet${e.says ? `: ${e.says}` : ''}`, law: 'every element the generator derived is embodied, or is a gap', value: 1, limit: 0, remedy: null });
  // the whole checked: every part held from the ground
  const loose = floatingClusters(B.parts);
  for (const cl of loose.slice(0, 8)) B.flaws.push({ check: 'held', where: cl[0]!.id.split('/')[0]!, says: `${cl.length} part${cl.length > 1 ? 's' : ''} held by nothing: ${[...new Set(cl.map((p) => p.name))].slice(0, 2).join('; ')}`, law: 'every part has a load path to the ground', value: cl.length, limit: 0, remedy: null, parts: cl.map((p) => p.id) });
  B.trace.push({ stage: 'whole', where: 'the whole', round: 1, says: `${B.parts.length} parts, ${gaps.length} elements not yet designed, ${loose.length} loose`, flaws: B.flaws.filter((f) => f.check === 'held' || f.check === 'gap').slice(0, 8), remedy: null });
  const ex = B.parts.length ? extentOf(B.parts) : { lo: [0, 0, 0] as V3, hi: [0, 0, 0] as V3 };
  const bomMap = new Map<string, { name: string; qty: number; material: string; category: string; mass: number }>();
  for (const p of B.parts) { const e = bomMap.get(p.name) ?? { name: p.name, qty: 0, material: p.material, category: p.category, mass: 0 }; e.qty++; e.mass += p.mass; bomMap.set(p.name, e); }
  return { name: intent.name, parts: B.parts, values: B.values, flaws: B.flaws, trace: B.trace, size: ex.hi.map((h, k) => h - ex.lo[k]!) as V3, bom: [...bomMap.values()], config: B.values.slice(0, 10).map((v) => ({ name: v.name, value: v.value, unit: v.unit, law: v.law })), ...empty };
}

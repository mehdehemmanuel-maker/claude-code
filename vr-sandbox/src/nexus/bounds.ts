// What the laws say of what was asked, whether or not anything is made: each a bound from a law kept, on figures read
// from the ask. Heat a thing must shed against what still air takes from its surface at the temperature it may reach;
// the energy it must carry for so long at so much, against what a cell of that weight or size holds; the power to hover,
// by momentum theory, and whether that theory holds at its size; a heat engine's most, Carnot's, on the heat that can
// cross it; a motor's torque, and the shear its air gap must carry for it, against what electric machines carry; a
// slope's pull against what its motors give. Each is said with its figures, and where a figure is an estimate it says so.

import { heatLoss, AMBIENT } from '../engineering/thermal';
import { matterOf } from './generate';
import { AIR, fmt, lenSay, timeSay } from './sizing';
import { BODIES, left, transfer } from './orbits';

const g = 9.80665;
/** A bound: ok when what was asked is within it, not ok when past it, null when nothing was asked to hold it against (a figure, said). */
export interface Bound { what: string; ok: boolean | null; says: string }
/** What an ask said that the bounds read: each figure with what it is of. */
export interface Said {
  /** its own sizes, m: as said or named */ size?: { W?: number; D?: number; H?: number };
  /** watts: drawn or used by it, put out by it, made by it */ power?: { W: number; as: 'draws' | 'gives' | 'makes' }[];
  /** the most its outside may reach, °C */ tmax?: number;
  /** a temperature difference it runs on, K, and the temperature it runs at, K */ dT?: number; Tat?: number;
  /** how long it must run, s */ runFor?: number;
  /** what it carries, kg; its own mass limit, kg */ payload?: number; massLimit?: number;
  /** turning: rad/s; its speed along, m/s */ w?: number; v?: number;
  /** it flies, it is a heat engine, it is a motor, it is powered by light (W/m² falling on it) */ flies?: boolean; heatEngine?: boolean; motor?: boolean; light?: number;
  /** a trip from one body's low orbit to another's in so many days, and back or not; the crew; the most dose each may take, Sv */
  trip?: { from: string; to: string; days?: number; back: boolean }; crew?: number; dose?: number;
  /** data it sends by radio, bits/s */ rate?: number; radio?: boolean;
  /** it is round (a sphere as wide as it is said); it is in vacuum (it sheds heat only by radiating); it is in a liquid */ round?: boolean; vacuum?: boolean; immersed?: boolean;
  /** it stands on loose ground (sand, soil) */ ground?: 'sand' | 'soil';
  /** the wind it must stand in, m/s */ wind?: number;
}

/** A radio sending at its best rates: about 2.5 nJ a bit (802.11ac at its highest rates, estimate). */
const RADIO_J_PER_BIT = 2.5e-9;
/** Deep space: about 1.84 mSv a day from cosmic rays (Zeitlin et al., Science 340, 1080 (2013): Curiosity's RAD on its cruise to Mars). */
const SPACE_SV_PER_DAY = 1.84e-3;
/** A crew of four on a long trip: a habitat and its life support of about 40 t (NASA Mars Design Reference Architecture 5.0, its transit habitat: estimate). */
const HAB_PER_4 = 40e3;
/** Li-ion cells now: about 250 Wh/kg and 650 Wh/L for good cylindrical and pouch cells (estimate; makers' sheets 2024). */
const CELL = { whPerKg: 250, whPerL: 650 };
/** Electric machines carry an air-gap shear of about 10 to 50 kPa, up to 100 kPa liquid-cooled (Pyrhönen, Jokinen and
 *  Hrabovcová, Design of Rotating Electrical Machines, 2nd ed., Table 6.3: estimate taken as 50 kPa at most). */
const SHEAR = 5e4;

/** Every bound the figures read allow, each a law on what was asked. */
export function bounds(s: Said): Bound[] {
  // a thing given one size is taken as a cube of it; given two, as flat: its thickness a quarter of the less (estimate)
  const out: Bound[] = [], dims = s.size ?? {}, W = dims.W, D = dims.D ?? dims.W, flat = dims.H === undefined && dims.D !== undefined, H = dims.H ?? (flat ? Math.min(dims.W ?? dims.D!, dims.D!) / 4 : dims.W), thick = flat && H !== undefined ? ` (its thickness taken as ${lenSay(H)}, a quarter of its width: estimate)` : '';
  const area = s.round && W ? Math.PI * W * W : W && D && H ? 2 * (W * D + W * H + D * H) : undefined, vol = s.round && W ? (Math.PI * W ** 3) / 6 : W && D && H ? W * D * H : undefined, Lc = H ?? W;
  // what its surface sheds at T °C: in air by convection and radiation, in vacuum by radiation alone (to surroundings at 20 °C)
  const SB = 5.670374419e-8, shed = (T: number) => (s.vacuum ? 0.9 * SB * area! * ((T + 273.15) ** 4 - (AMBIENT + 273.15) ** 4) : heatLoss(T, area!, Lc!, 0.9));
  // a radio: what it draws sending so much, at so many joules a bit, unless what it draws is said; and its antenna
  if (s.radio && s.rate !== undefined) {
    const Pr = s.rate * RADIO_J_PER_BIT; if (!s.power?.some((x) => x.as === 'draws')) s.power = [...(s.power ?? []), { W: Pr, as: 'draws' }];
    out.push({ what: `sending ${fmt(s.rate / 1e6)} Mbit/s by radio`, ok: null, says: `about ${fmt(Pr)} W at ${RADIO_J_PER_BIT * 1e9} nJ a bit (Wi-Fi at its best rates, estimate), weighed with what it sheds below` });
    if (W) { const q = 299792458 / 2.4e9 / 4, Lmax = Math.max(W, D ?? 0, dims.H ?? 0); out.push({ what: 'its antenna fits it', ok: Lmax >= q, says: `a quarter wave at 2.4 GHz is ${lenSay(q)}${Lmax < q ? `, ${fmt(q / Lmax)} times its ${lenSay(Lmax)}: an antenna that small radiates poorly (Chu's limit), and less inside a metal case` : `, within its ${lenSay(Lmax)}`}` });
  }
  }
  const P = (as: 'draws' | 'gives' | 'makes') => s.power?.find((x) => x.as === as)?.W;
  // heat: what it must shed (all it draws; what it loses passing on what it gives, at 95%, an estimate for a good
  // converter) against what still air takes from its surface at its hottest (convection and radiation, the kept law)
  const heat = P('draws') ?? (P('gives') !== undefined ? P('gives')! * (1 / 0.95 - 1) : undefined);
  if (heat !== undefined && area !== undefined && Lc) {
    const cap = s.tmax !== undefined ? shed(s.tmax) : undefined;
    // where it settles: found by halving between the room and far above it
    let lo = AMBIENT, hi = AMBIENT + 1; while (shed(hi) < heat && hi < 1e5) hi = AMBIENT + (hi - AMBIENT) * 2; for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (shed(mid) < heat) lo = mid; else hi = mid; }
    const T = (lo + hi) / 2, perM2 = heat / area;
    // past its limit: the size of the same shape that would shed it there (its surface grows as the square of its size)
    const grow = cap !== undefined && cap < heat ? Math.sqrt(heat / cap) : 1;
    out.push({ what: `it sheds the ${fmt(heat)} W it turns to heat${s.tmax !== undefined ? ` at no more than ${s.tmax} °C` : ''}`, ok: cap === undefined ? null : cap >= heat, says: `its ${fmt(area * 1e4)} cm² of ${s.round ? 'round ' : ''}surface${thick} (${fmt(perM2)} W on each square metre) sheds ${cap !== undefined ? `${fmt(cap)} W at ${s.tmax} °C` : 'it'} ${s.vacuum ? `in vacuum by radiation alone (emissivity 0.9, to surroundings at ${AMBIENT} °C)` : `into still air at ${AMBIENT} °C (natural convection and radiation, emissivity 0.9)`}; left so, it settles near ${T - AMBIENT < 0.01 ? `${AMBIENT} °C, ${fmt(T - AMBIENT)} K above it` : `${fmt(T)} °C`}${P('gives') !== undefined && P('draws') === undefined ? ` (the heat is what it loses passing on ${fmt(P('gives')!)} W at 95% (estimate))` : ''}${grow > 1 ? `: it needs ${fmt(grow * grow)} times the surface, so the same shape ${fmt(grow)} times as big, ${lenSay(grow * (W ?? 0))} across where it is ${lenSay(W ?? 0)}; or air blown over it (a fan: a few times what still air takes, estimate)` : ''}` });
  }
  // energy carried: so many watts for so long, against what cells of its size and weight hold
  const run = P('draws') ?? P('gives') ?? P('makes');
  if (run !== undefined && s.runFor !== undefined) {
    // what it needs, and more for a converter at 90% and a cell used to 90% of what it holds (estimate)
    const Wh0 = (run * s.runFor) / 3600, Wh = Wh0 / (0.9 * 0.9), kg = Wh / CELL.whPerKg, L = Wh / CELL.whPerL;
    out.push({ what: `it carries what it needs for ${timeSay(s.runFor)} at ${fmt(run)} W`, ok: vol === undefined && s.massLimit === undefined ? null : (vol === undefined || L / 1000 <= vol * 0.5) && (s.massLimit === undefined || kg <= s.massLimit), says: `${fmt(Wh0)} Wh used, ${fmt(Wh)} Wh carried (a converter at 90% and the cells used to 90%, estimate): ${fmt(kg * 1000)} g of lithium-ion cells, ${fmt(L * 1000)} cm³ (about ${CELL.whPerKg} Wh/kg and ${CELL.whPerL} Wh/L, estimate)${vol !== undefined ? `, against its ${fmt(vol * 1e6)} cm³ in all${thick}${L / 1000 > vol * 0.5 ? `: more than half of it` : ''}` : ''}${s.massLimit !== undefined && kg > s.massLimit ? `, more than the ${fmt(s.massLimit)} kg it may weigh` : ''}` });
  }
  // hovering: momentum theory, power ideal (m g)^1.5 / √(2 ρ A) over a disc as wide as it is; out of its range below Re ~ 1000
  if (s.flies && W) {
    const A = W * (D ?? W), own = (s.massLimit ?? 1000 * W * (D ?? W) * (H ?? W) * 0.1), m = (s.payload ?? 0) + own, Pi = (m * g) ** 1.5 / Math.sqrt(2 * AIR.rho * A), vi = Math.sqrt((m * g) / (2 * AIR.rho * A)), Re = (AIR.rho * vi * W) / AIR.mu;
    const E = s.runFor !== undefined ? (Pi / 0.5) * s.runFor : undefined, cellKg = E !== undefined ? E / 3600 / CELL.whPerKg : undefined;
    out.push({ what: `it can carry the energy to hover with ${s.payload !== undefined ? `${fmt(s.payload * 1000)} g` : 'what it carries'}`, ok: cellKg === undefined ? null : cellKg < m * 0.5, says: `${fmt(m * 1000)} g in all (its own taken as a tenth of water's density over its size, estimate) over ${fmt(A * 1e4)} cm²: momentum theory gives ${fmt(Pi)} W ideal, pushing air down at ${fmt(vi)} m/s (the Reynolds number of that air across it ${fmt(Re)})${Re < 1000 ? `: below about 1000 the theory does not hold, and viscosity takes more, so this is a floor; fliers this small (Megaphragma wasps, featherwing beetles) hover by flapping bristled wings at Re about 10, so the laws allow it, by flapping` : ''}${E !== undefined ? `; for ${timeSay(s.runFor!)} at half that ideal (estimate) it needs ${fmt(E)} J, ${fmt(cellKg! * 1e9)} µg of cells${cellKg! >= m * 0.5 ? `, ${fmt(cellKg! / m)} times all it weighs: it cannot carry its own energy, it must be given it as it flies (by light or by radio)` : ''}` : ''}` });
  }
  // flying along: the drag it must push against at its speed, by the drag of a sphere its size (Schiller and Naumann's
  // fit below Re 1000, 0.44 above), against its weight
  if (s.flies && s.v !== undefined && W) {
    const Af = W * (H ?? W), Re = (AIR.rho * s.v * W) / AIR.mu, Cd = Re < 1000 ? (24 / Re) * (1 + 0.15 * Re ** 0.687) : 0.44, Dr = 0.5 * AIR.rho * s.v ** 2 * Af * Cd, m = (s.payload ?? 0) + (s.massLimit ?? 1000 * W * (D ?? W) * (H ?? W) * 0.1);
    out.push({ what: `flying at ${fmt(s.v)} m/s`, ok: null, says: `at Re ${fmt(Re)} its drag coefficient is about ${fmt(Cd)} (a sphere, Schiller and Naumann), so it is held back by ${fmt(Dr)} N, ${fmt(Dr / (m * g))} times its weight, ${fmt(Dr * s.v)} W at the least: ${Dr > m * g ? 'it must thrust more forward than it lifts' : 'less than it lifts'}` });
  }
  // a heat engine: the heat must cross what lies between it and its warm and cold sides, a conductance K = k A / L; the
  // most power such an engine gives is K ΔT² / 4 T (the engine run at the speed that gives the most, Curzon and Ahlborn:
  // half the difference spent driving the heat across), k = 0.5 W/(m K) for water or tissue (estimate)
  if (s.heatEngine && s.dT !== undefined) {
    const T = s.Tat ?? 310, L = W ?? 0.01, K = 0.5 * L, most = (K * s.dT ** 2) / (4 * T), want = P('makes') ?? P('gives'), near = L < 1e-3 ? (s.dT * L) / 1e-3 : s.dT;
    out.push({ what: 'a heat engine on that difference gives what is asked', ok: want === undefined ? null : most >= want, says: `the heat crosses its ${lenSay(L)} through water or tissue, a conductance of ${fmt(K)} W/K (k L, k 0.5 W/(m K), estimate); the most power from ${s.dT} K across that is K ΔT² / 4 T = ${fmt(most)} W at ${fmt(T)} K (Curzon and Ahlborn; Carnot's share alone, ΔT / T, is ${fmt((s.dT / T) * 100)}%)${want !== undefined ? ` against the ${fmt(want)} W asked${most < want ? `: ${fmt(want / most)} times too little` : ''}` : ''}${L < 1e-3 ? `; and if the ${s.dT} K lies over about a millimetre (estimate), across its own ${lenSay(L)} it sees about ${fmt(near)} K, and gives ${fmt((near / s.dT) ** 2)} of that` : ''}` });
  }
  // a motor gives what it is given, less its losses; what gives a world its power when the motor is a world: its own spin,
  // ½ I ω² as a uniform sphere of steel its size (estimate), and how fast that would run down, its stator held against
  // its torque by something not turning with it
  if (s.motor && (P('gives') ?? P('makes')) !== undefined && s.w !== undefined && W && s.round) {
    const Pm = (P('gives') ?? P('makes'))!, R = W / 2, M = matterOf('steel.a36').density * (4 / 3) * Math.PI * R ** 3, I = 0.4 * M * R * R, E = 0.5 * I * s.w ** 2, dTday = ((2 * Math.PI * Pm) / (I * s.w ** 3)) * 3.156e7;
    out.push({ what: `what gives it the ${fmt(Pm)} W it gives`, ok: null, says: `as a motor it draws at least ${fmt(Pm / 0.95)} W (95%, estimate) from a supply; to power a world it must be a generator turned by something: its own spin holds ${fmt(E)} J (½ I ω², a uniform sphere of steel its size, estimate), ${timeSay(E / Pm)} at that power, its turn lengthening by ${fmt(dTday * 1e3)} ms a year; its stator must be held against ${fmt(Pm / s.w)} N·m by something not turning with it` });
  }
  // what loose ground bears under it: about 200 kPa for sand, 100 kPa for soft soil (presumptive bearing, estimate)
  if (s.ground && (s.payload ?? 0) > 0) {
    const q = s.ground === 'sand' ? 2e5 : 1e5, A = ((s.payload ?? 0) * g) / q;
    out.push({ what: `the ground bears what it carries`, ok: null, says: `${fmt(s.payload!)} kg on ${s.ground} that bears about ${fmt(q / 1e3)} kPa (presumptive bearing, estimate) needs at least ${fmt(A)} m² of foot on the ground, ${lenSay(Math.sqrt(A))} square, before its own weight` });
  }
  // a motor: its torque, and the shear its air gap must carry for it at its size
  if (s.motor && (P('gives') ?? P('makes')) !== undefined && s.w !== undefined && W) {
    const Pm = (P('gives') ?? P('makes'))!, tq = Pm / s.w, R = W / 2, len = s.round ? W : H ?? W, shear = tq / (2 * Math.PI * R * R * len), B = Math.sqrt(2 * 1.25663706212e-6 * shear);
    out.push({ what: `as a motor it gives ${fmt(Pm)} W turning once in ${timeSay((2 * Math.PI) / s.w)}`, ok: shear <= SHEAR, says: `${fmt(tq)} N·m of torque; on a rotor ${lenSay(W)} across and as long, its air gap carries ${fmt(shear)} Pa of shear (T / 2π R² L) against the 10 to 50 kPa electric machines carry (estimate): a field of about ${fmt(B * 1e6)} µT is enough (B² / 2μ0 at that shear)${shear <= SHEAR && shear < 1 ? ', far less than the Earth\'s own (about 50 µT): its size makes even a faint field turn it' : ''}` });
  }
  // light: what a cell of its face gathers at the light it is under, at 20% (estimate)
  if (s.light !== undefined && W && D) {
    const got = s.light * W * D * 0.2, need = P('draws');
    out.push({ what: 'the light on it powers it', ok: need === undefined ? null : got >= need, says: `${fmt(s.light)} W/m² on ${fmt(W * D * 1e4)} cm² at 20% (estimate) gives ${fmt(got)} W${need !== undefined ? ` against the ${fmt(need)} W it draws${got < need ? `: ${fmt(need / got)} times too little` : ''}` : ''}` });
  }
  // a trip between orbits: the least speed it must gain and lose for the time asked, what that leaves of its mass by the
  // rocket equation, and the dose on the way
  if (s.trip && BODIES[s.trip.from] && BODIES[s.trip.to]) {
    const { from, to, back } = s.trip, A = BODIES[from]!, B = BODIES[to]!, tr = transfer(from, to, s.trip.days ?? 1e5), one = tr.dv1 + tr.dv2, all = back ? 2 * one : one, km = (v: number) => `${fmt(v / 1e3)} km/s`;
    const m0 = s.massLimit, need = s.crew !== undefined ? (HAB_PER_4 * s.crew) / 4 : undefined;
    const by = (Isp: number) => { const l = left(m0!, all, Isp), tanks = (m0! - l) * 0.1; return { l, net: l - tanks }; }, chem = m0 !== undefined ? by(450) : null, nuc = m0 !== undefined ? by(900) : null;
    out.push({ what: `it goes from a low orbit of ${A.name} to one of ${B.name}${s.trip.days !== undefined ? ` in ${fmt(tr.days)} days` : ''}${back ? ' and back' : ''}`, ok: m0 === undefined ? null : nuc!.net >= (need ?? 0) && nuc!.net > 0,
      says: `${tr.slowest && s.trip.days !== undefined && s.trip.days > tr.hohmann ? `no transfer takes longer than Hohmann's ${fmt(tr.hohmann)} days; ` : ''}the least of the transfers that take ${fmt(tr.days)} days (Lambert's problem, the planets on circles in one plane, crossing ${fmt(tr.angle)}° round the Sun) leaves 400 km up at ${km(tr.dv1)} more and comes into 400 km up at ${km(tr.dv2)} less: ${km(one)}${back ? `, ${km(all)} there and back` : ''}${m0 !== undefined ? `; by the rocket equation, of the ${fmt(m0 / 1000)} t that leaves, ${fmt(chem!.l / 1000)} t is left with chemical engines (Isp 450 s, hydrogen and oxygen) and ${fmt(nuc!.l / 1000)} t with nuclear-thermal ones (Isp 900 s, estimate); less tanks a tenth of what they held (estimate), ${fmt(Math.max(0, chem!.net) / 1000)} t and ${fmt(Math.max(0, nuc!.net) / 1000)} t for all else${need !== undefined ? `, against about ${fmt(need / 1000)} t of habitat and life support for ${s.crew} (NASA DRA 5.0, estimate)` : ''}; one stage, unrefuelled: staged or refuelled on the way it does better` : ''}` });
    if (s.trip.days !== undefined) { const days = tr.days * (back ? 2 : 1), dose = days * SPACE_SV_PER_DAY; out.push({ what: `the dose on the way${s.dose !== undefined ? ` is under ${fmt(s.dose)} Sv` : ''}`, ok: s.dose === undefined ? null : dose <= s.dose, says: `${fmt(days)} days between the planets at about ${SPACE_SV_PER_DAY * 1e3} mSv a day (Curiosity's RAD on its cruise, Zeitlin et al. 2013): ${fmt(dose)} Sv${s.dose !== undefined ? ` against ${fmt(s.dose)}` : ''}; the wait at ${B.name} for the planets to come round for the way back is not counted, and adds about as much a day in orbit` }); }
  }
  return out;
}

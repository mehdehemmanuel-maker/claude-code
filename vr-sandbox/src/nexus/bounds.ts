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
  trip?: { from: string; to: string; days?: number; back: boolean; low?: boolean }; crew?: number; dose?: number;
  /** data it sends by radio, bits/s */ rate?: number; radio?: boolean;
  /** it is round (a sphere as wide as it is said); it is in vacuum (it sheds heat only by radiating); it is in a liquid */ round?: boolean; vacuum?: boolean; immersed?: boolean;
  /** it stands on loose ground (sand, soil) */ ground?: 'sand' | 'soil' | 'balcony';
  /** the wind it must stand in, m/s */ wind?: number;
  /** it is held up by a gas lighter than air */ buoyant?: boolean;
  /** its engines' specific impulse, s; it is a sail pushed by light */ isp?: number; sail?: boolean;
  /** temperatures: round it, where what it holds starts, what it is kept cold at, what it must be brought to, °C */ Tamb?: number; T0?: number; Tkeep?: number; Tto?: number;
  /** it is slender (a worm, a rod); it is driven from outside by a field; how deep under water it works, m; the pressure kept inside it, Pa; a dose it may take in a year, Sv */ slender?: boolean; fieldDriven?: boolean; depth?: number; pin?: number; dosePerYear?: boolean;
  /** the total dose it is rated for, Gy; the world it is on; how high it climbs, m */ ratedDose?: number; on?: string; climb?: number;
  /** it is buried (under regolith, soil); the shield round it, kg and of what */ buried?: boolean; shield?: { kg: number; of: string };
  /** it has a vacuum wall */ vacuumWall?: boolean; burrows?: boolean; /** it waters what grows in it, over so much soil, m² */ waters?: boolean; waterArea?: number;
  /** how long it must keep, s; what it has to do it in, s; its walls' thickness, m; it is worked by hand; what it holds, m³ */ keepFor?: number; within?: number; wall?: number; human?: boolean; volume?: number;
  /** whether it is said to run on power it carries (a battery, cells, fuel, a charge); false where nothing says so and it is part of something else that powers it */ ownPower?: boolean;
  /** the least its contents may cool to, °C; an area of it (panels, sail), m²; energy it stores, J; how far it must go, m */ tmin?: number; area?: number; store?: number; distance?: number;
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

/** A titanium sphere (Ti-6Al-4V, its yield over 1.5) holding a cubic metre against the sea so deep, its wall thick
 *  (Lamé: σ = 3 p r_o³ / 2 (r_o³ − r_i³) at its inside), kg: ρ ((r_o / r_i)³ − 1). */
const sphereKgPerM3 = (depth: number) => { const p = 1025 * 9.80665 * depth, f = (3 * p) / (2 * (880e6 / 1.5)); return f >= 1 ? Infinity : 4430 * (f / (1 - f)); };

/** Every bound the figures read allow, each a law on what was asked. */
export function bounds(s: Said): Bound[] {
  // a thing given one size is taken as a cube of it; given two, as flat: its thickness a quarter of the less (estimate)
  const out: Bound[] = [], dims = s.size ?? {}, W = dims.W, D = dims.D ?? dims.W, flat = dims.H === undefined && dims.D !== undefined, H = dims.H ?? (flat ? Math.min(dims.W ?? dims.D!, dims.D!) / 4 : dims.W), thick = flat && H !== undefined ? ` (its thickness taken as ${lenSay(H)}, a quarter of its width: estimate)` : '';
  const area = s.slender && W ? Math.PI * (W / 8) * W : s.round && W ? Math.PI * W * W : W && D && H ? 2 * (W * D + W * H + D * H) : undefined, vol = s.slender && W ? (Math.PI * (W / 8) ** 2 * W) / 4 : s.round && W ? (Math.PI * W ** 3) / 6 : W && D && H ? W * D * H : undefined, Lc = H ?? W;
  // what its surface sheds at T °C: in air by convection and radiation, in vacuum by radiation alone, to what is round it: on
  // Europa its ground, about 110 K at the equator (as Wikipedia's Europa article gives it), else a room's 20 °C
  const SINK = s.on === 'europa' ? -163 : AMBIENT, sinkSays = s.on === 'europa' ? "Europa's ground round it at about -163 °C (110 K at its equator, as Wikipedia's Europa article gives it)" : `surroundings at ${AMBIENT} °C`;
  const SB = 5.670374419e-8, shed = (T: number) => (s.vacuum ? 0.9 * SB * area! * ((T + 273.15) ** 4 - (SINK + 273.15) ** 4) : heatLoss(T, area!, Lc!, 0.9));
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
  // what burrows sheds its heat into the ground round it, which takes it far better than air: not weighed as air
  if (heat !== undefined && area !== undefined && Lc && !s.burrows && !s.buried) {
    const cap = s.tmax !== undefined ? shed(s.tmax) : undefined;
    // where it settles: found by halving between the room and far above it
    const T0 = s.vacuum ? SINK : AMBIENT; let lo = T0, hi = T0 + 1; while (shed(hi) < heat && hi < 1e5) hi = T0 + (hi - T0) * 2; for (let k = 0; k < 100; k++) { const mid = (lo + hi) / 2; if (shed(mid) < heat) lo = mid; else hi = mid; }
    const T = (lo + hi) / 2, perM2 = heat / area;
    // past its limit: the size of the same shape that would shed it there (its surface grows as the square of its size)
    const grow = cap !== undefined && cap < heat ? Math.sqrt(heat / cap) : 1;
    out.push({ what: `it sheds the ${fmt(heat)} W it turns to heat${s.tmax !== undefined ? ` at no more than ${s.tmax} °C` : ''}`, ok: cap === undefined ? null : cap >= heat, says: `its ${fmt(area * 1e4)} cm² of ${s.round ? 'round ' : ''}surface${thick} (${fmt(perM2)} W on each square metre) sheds ${cap !== undefined ? `${fmt(cap)} W at ${s.tmax} °C` : 'it'} ${s.vacuum ? `in vacuum by radiation alone (emissivity 0.9, to ${sinkSays})` : `into still air at ${AMBIENT} °C (natural convection and radiation, emissivity 0.9)`}; left so, it settles near ${T - T0 < 0.01 ? `${T0} °C, ${fmt(T - T0)} K above it` : `${fmt(T)} °C`}${P('gives') !== undefined && P('draws') === undefined ? ` (the heat is what it loses passing on ${fmt(P('gives')!)} W at 95% (estimate))` : ''}${grow > 1 ? `: it needs ${fmt(grow * grow)} times the surface, so the same shape ${fmt(grow)} times as big, ${lenSay(grow * (W ?? 0))} across where it is ${lenSay(W ?? 0)}; or air blown over it (a fan: a few times what still air takes, estimate)` : ''}` });
  }
  // energy carried: so many watts for so long, against what cells of its size and weight hold
  const run = P('draws') ?? P('gives') ?? P('makes');
  if (run !== undefined && s.runFor !== undefined) {
    // what it needs, and more for a converter at 90% and a cell used to 90% of what it holds (estimate)
    const Wh0 = (run * s.runFor) / 3600, Wh = Wh0 / (0.9 * 0.9), kg = Wh / CELL.whPerKg, L = Wh / CELL.whPerL;
    // deep under water its cells must sit in a sphere that holds the sea out, packed in at about 60% (estimate); its weight
    // counts with theirs; primary lithium cells (Li-SOCl2, about 600 Wh/kg and 1000 Wh/L, estimate) shrink both
    const perV = s.depth !== undefined ? sphereKgPerM3(s.depth) : 0, sphere = (perV * (L / 1000)) / 0.6, all = kg + sphere;
    const pKg = Wh / 600, pSphere = (perV * (Wh / 1000 / 1000)) / 0.6, pAll = pKg + pSphere;
    if (s.depth !== undefined) out.push({ what: `its cells kept dry ${lenSay(s.depth)} down`, ok: s.massLimit === undefined ? null : Math.min(all, pAll) <= s.massLimit, says: `its ${fmt(L)} L of lithium-ion cells, packed in at about 60% (estimate), in a titanium sphere that holds the sea out weigh ${fmt(kg)} kg and ${fmt(sphere)} kg${s.massLimit !== undefined ? `, ${fmt(all)} kg against the ${fmt(s.massLimit)} kg it may weigh` : ''}; primary lithium cells (Li-SOCl2, about 600 Wh/kg and 1000 Wh/L, estimate) make it ${fmt(pAll)} kg (${fmt(pKg)} kg of cells, ${fmt(pSphere)} kg of sphere); cells in oil outside the hull, at the sea's pressure, need no sphere at all (as deep vehicles carry them)${s.massLimit !== undefined && Math.min(all, pAll) > s.massLimit ? `; at ${fmt(s.massLimit)} kg of primary cells and their sphere it runs ${fmt(run)} W for about ${timeSay((s.runFor * s.massLimit) / pAll)}` : ''}` });
    // what runs on what it is part of (a board on a lander's power) carries nothing of its own: weighed as if it did, not judged
    out.push({ what: `it carries what it needs for ${timeSay(s.runFor)} at ${fmt(run)} W${s.ownPower === false ? ', if it ran on cells of its own' : ''}`, ok: s.ownPower === false || (vol === undefined && s.massLimit === undefined) ? null : (vol === undefined || L / 1000 <= vol * 0.5) && (s.massLimit === undefined || kg <= s.massLimit), says: `${fmt(Wh0)} Wh used, ${fmt(Wh)} Wh carried (a converter at 90% and the cells used to 90%, estimate): ${fmt(kg * 1000)} g of lithium-ion cells, ${fmt(L * 1000)} cm³ (about ${CELL.whPerKg} Wh/kg and ${CELL.whPerL} Wh/L, estimate)${vol !== undefined ? `, against its ${fmt(vol * 1e6)} cm³ in all${thick}${L / 1000 > vol ? `: ${fmt(L / 1000 / vol)} times all of it` : L / 1000 > vol * 0.5 ? `: more than half of it` : ''}` : ''}${s.massLimit !== undefined && kg > s.massLimit ? `, more than the ${fmt(s.massLimit)} kg it may weigh` : ''}${vol !== undefined && L / 1000 > vol * 0.5 ? `; cells in 40% of it (estimate) hold ${fmt(0.4 * vol * 1000 * CELL.whPerL)} Wh: ${timeSay((0.4 * vol * 1000 * CELL.whPerL * 0.81 * 3600) / run)} at ${fmt(run)} W, or ${fmt((0.4 * vol * 1000 * CELL.whPerL * 0.81 * 3600) / s.runFor)} W for the time asked` : ''}${s.tmin !== undefined && s.tmin < -20 ? `; lithium-ion cells do not work below about −20 °C (estimate): they must be kept warm` : ''}` });
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
    const q = s.ground === 'balcony' ? 2.5e3 : s.ground === 'sand' ? 2e5 : 1e5, A = ((s.payload ?? 0) * g) / q;
    out.push({ what: s.ground === 'balcony' ? 'the balcony bears what it carries' : `the ground bears what it carries`, ok: null, says: s.ground === 'balcony' ? `a balcony is made for about 2.5 to 4 kPa spread over it (EN 1991-1-1 Table 6.2, estimate): ${fmt(s.payload!)} kg wants at least ${fmt(A)} m² under it at 2.5 kPa, ${lenSay(Math.sqrt(A))} square, before its own weight; what it weighs in all over what it stands on is weighed with what is made` : `${fmt(s.payload!)} kg on ${s.ground} that bears about ${fmt(q / 1e3)} kPa (presumptive bearing, estimate) needs at least ${fmt(A)} m² of foot on the ground, ${lenSay(Math.sqrt(A))} square, before its own weight` });
  }
  // a motor: its torque, and the shear its air gap must carry for it at its size
  if (s.motor && (P('gives') ?? P('makes')) !== undefined && s.w !== undefined && W) {
    const Pm = (P('gives') ?? P('makes'))!, tq = Pm / s.w, R = W / 2, len = s.round ? W : H ?? W, shear = tq / (2 * Math.PI * R * R * len), B = Math.sqrt(2 * 1.25663706212e-6 * shear);
    out.push({ what: `as a motor it gives ${fmt(Pm)} W turning once in ${timeSay((2 * Math.PI) / s.w)}`, ok: shear <= SHEAR, says: `${fmt(tq)} N·m of torque; on a rotor ${lenSay(W)} across and as long, its air gap carries ${fmt(shear)} Pa of shear (T / 2π R² L) against the 10 to 50 kPa electric machines carry (estimate): a field of about ${fmt(B * 1e6)} µT is enough (B² / 2μ0 at that shear)${shear <= SHEAR && shear < 1 ? ', far less than the Earth\'s own (about 50 µT): its size makes even a faint field turn it' : ''}` });
  }
  // light: what a cell of its face gathers at the light it is under, at 20% (estimate)
  if (s.light !== undefined && W && D && !s.sail) {
    const got = s.light * W * D * 0.2, need = P('draws');
    out.push({ what: 'the light on it powers it', ok: need === undefined ? null : got >= need, says: `${fmt(s.light)} W/m² on ${fmt(W * D * 1e4)} cm² at 20% (estimate) gives ${fmt(got)} W${need !== undefined ? ` against the ${fmt(need)} W it draws${got < need ? `: ${fmt(need / got)} times too little` : ''}` : ''}` });
  }
  // a trip between orbits: the least speed it must gain and lose for the time asked, what that leaves of its mass by the
  // rocket equation, and the dose on the way
  // a sail: pushed by light alone, about 9 µN on each square metre it reflects at the Earth's distance (2 S / c, S 1361 W/m²,
  // reflecting 90%, estimate), against all it moves; the speed it must change between the planets is what a two-burn
  // transfer changes there (Hohmann's), and a sail steered across the light gives about 0.4 of its push to that (estimate)
  const sailArea = s.area ?? (W && D ? W * D : undefined);
  if (s.sail && sailArea !== undefined) {
    const P = ((1 + 0.9) * 1361) / 299792458, Fs = P * sailArea, sailKg = sailArea * 0.01, m = (s.payload ?? 0) + sailKg, a = Fs / m;
    const tr = s.trip && BODIES[s.trip.from] && BODIES[s.trip.to] ? transfer(s.trip.from, s.trip.to, 1e5) : null, dv = tr ? tr.vInf1 + tr.vInf2 : undefined;
    // between the planets the light thins as 1 / r²: about 1 / (r1 r2) of it on the way, on average (estimate); about a
    // third of a sail's push spirals it out of an orbit round a planet or down into one (it pushes usefully on part of each
    // orbit, estimate), what it must lose or gain its circular speed there: out of 800 km, down to 400 km
    const AU = 1.496e11, bA = tr ? BODIES[s.trip!.from]! : null, bB = tr ? BODIES[s.trip!.to]! : null, rA = bA ? bA.a / AU : 1, rB = bB ? bB.a / AU : 1, thin = 1 / (rA * rB);
    const vEsc = bA ? Math.sqrt(bA.mu / (bA.R + 8e5)) : 0, vCap = bB ? Math.sqrt(bB.mu / (bB.R + 4e5)) : 0;
    const cruise = dv !== undefined ? dv / (0.4 * thin * a) : undefined, esc = tr ? vEsc / (0.3 * a / rA ** 2) : undefined, cap = tr ? vCap / (0.3 * a / rB ** 2) : undefined;
    const days = cruise !== undefined ? (cruise + esc! + cap!) / 86400 : undefined;
    // at 400 km the air still pushes back: about 3e-12 kg/m³ there (moderate sun, estimate), ½ ρ v² at orbital speed
    const qAir = 0.5 * 3e-12 * 7670 ** 2;
    out.push({ what: `light alone carries it${s.trip?.days !== undefined ? ` in ${fmt(s.trip.days)} days` : ''}`, ok: days === undefined || s.trip?.days === undefined ? null : days <= s.trip.days, says: `light pushes ${fmt(P * 1e6)} µN on each square metre at the Earth's distance ((1 + R) S / c, reflecting R = 90%, estimate): ${fmt(Fs)} N on its ${fmt(sailArea)} m², against ${fmt(m / 1000)} t (${s.payload !== undefined ? `${fmt(s.payload / 1000)} t it tows and ` : ''}${fmt(sailKg / 1000)} t of sail at 10 g/m², estimate): ${fmt(a * 1000)} mm/s², ${fmt((a * 3.156e7) / 1000)} km/s in a year near the Earth${dv !== undefined ? `; spiralling out of an orbit 800 km over ${bA!.name} (${fmt(vEsc / 1000)} km/s, pushing usefully about 0.3 of its push, estimate) takes about ${timeSay(esc!)}; between the planets it must change its speed by ${fmt(dv / 1000)} km/s (what Hohmann's two burns change), steered across the light about 0.4 of its push (estimate), the light about ${fmt(thin)} as strong on the way (1 / r², estimate): about ${timeSay(cruise!)}; spiralling down to 400 km over ${bB!.name} (${fmt(vCap / 1000)} km/s, its light ${fmt(1 / rB ** 2)} as strong) about ${timeSay(cap!)}: about ${fmt(days!)} days in all` : ''}; at 400 km the air pushes back ${fmt(qAir * 1e6)} µPa, ${fmt(qAir / P)} times the light, so it must start above about 800 km (estimate); the tug that holds it, its booms and what steers it are not weighed` });
  }
  if (s.trip && BODIES[s.trip.from] && BODIES[s.trip.to] && !s.sail) {
    const { from, to, back } = s.trip, A = BODIES[from]!, B = BODIES[to]!, tr = transfer(from, to, s.trip.days ?? 1e5), one = tr.dv1 + tr.dv2, all = back ? 2 * one : one, km = (v: number) => `${fmt(v / 1e3)} km/s`;
    const m0 = s.massLimit, need = s.crew !== undefined ? (HAB_PER_4 * s.crew) / 4 : undefined;
    const by = (Isp: number) => { const l = left(m0!, all, Isp), tanks = (m0! - l) * 0.1; return { l, net: l - tanks }; }, chem = m0 !== undefined ? by(s.isp ?? 450) : null, nuc = m0 !== undefined && s.isp === undefined ? by(900) : null;
    // what it must carry for a payload said: the propellant the rocket equation asks, with tanks a tenth of it (estimate)
    const g0 = 9.80665, mr = Math.exp(all / (g0 * (s.isp ?? 450))), prop = s.payload !== undefined && m0 === undefined ? (s.payload * (mr - 1)) / (1 - 0.1 * (mr - 1)) : undefined;
    const best = nuc ?? chem;
    // its dry mass a tenth of what it holds: what it must carry at three twentieths, as engines, structure and keeping the
    // propellant cold take more (estimate)
    const prop15 = s.payload !== undefined && m0 === undefined && 1 - 0.15 * (mr - 1) > 0 ? (s.payload * (mr - 1)) / (1 - 0.15 * (mr - 1)) : undefined;
    out.push({ what: `the rocket equation takes it from a low orbit of ${A.name} to one of ${B.name}${s.trip.days !== undefined ? ` in ${fmt(tr.days)} days` : ''}${back ? ' and back' : ''}`, ok: m0 !== undefined ? best!.net >= (need ?? 0) && best!.net > 0 : prop !== undefined ? prop > 0 : null,
      says: `${prop !== undefined ? (prop > 0 ? `for its ${fmt(s.payload! / 1000)} t it must carry ${fmt(prop / 1000)} t of propellant and ${fmt((prop * 0.1) / 1000)} t of tanks (a tenth of what they hold, estimate), ${fmt((s.payload! + prop * 1.1) / 1000)} t leaving, at ${s.isp ?? 450} s (mass ratio ${fmt(mr)}); it is steep in that tenth: with its engines, structure and what keeps it cold, at three twentieths it is ${prop15 !== undefined ? `${fmt(prop15 / 1000)} t` : 'more than any single stage carries'}; no losses in its burns, no boil-off and no reserve are counted; ` : `at ${s.isp ?? 450} s no single stage carries it: tanks a tenth of what they hold weigh more than it leaves with (mass ratio ${fmt(mr)}); `) : ''}${tr.slowest && s.trip.days !== undefined && s.trip.days > tr.hohmann ? `with two burns the least speed is Hohmann's, ${fmt(tr.hohmann)} days: a slower trip saves no more; ` : ''}the least of the transfers that take ${fmt(tr.days)} days (Lambert's problem, the planets on circles in one plane, crossing ${fmt(tr.angle)}° round the Sun) leaves 400 km up at ${km(tr.dv1)} more and comes into a circular orbit 400 km up at ${km(tr.dv2)} less (taken: captured into a long ellipse it brakes about half as much, estimate): ${km(one)}${back ? `, ${km(all)} there and back` : ''}${m0 !== undefined ? `; by the rocket equation, of the ${fmt(m0 / 1000)} t that leaves, ${fmt(chem!.l / 1000)} t is left at ${s.isp ?? 450} s${s.isp === undefined ? ' (chemical engines, hydrogen and oxygen)' : ''}${nuc ? ` and ${fmt(nuc.l / 1000)} t with nuclear-thermal ones (Isp 900 s, estimate)` : ''}; less tanks a tenth of what they held (estimate), ${fmt(Math.max(0, chem!.net) / 1000)} t${nuc ? ` and ${fmt(Math.max(0, nuc.net) / 1000)} t` : ''} for all else${need !== undefined ? `, against about ${fmt(need / 1000)} t of habitat and life support for ${s.crew} (NASA DRA 5.0, estimate)` : ''}; one stage, unrefuelled: staged or refuelled on the way it does better` : ''}` });
    if (s.trip.days !== undefined) { const days = tr.days * (back ? 2 : 1), dose = days * SPACE_SV_PER_DAY; out.push({ what: `the dose on the way${s.dose !== undefined ? ` is under ${fmt(s.dose)} Sv` : ''}`, ok: s.dose === undefined ? null : dose <= s.dose, says: `${fmt(days)} days between the planets at about ${SPACE_SV_PER_DAY * 1e3} mSv a day (Curiosity's RAD on its cruise, Zeitlin et al. 2013): ${fmt(dose)} Sv${s.dose !== undefined ? ` against ${fmt(s.dose)}` : ''}; the wait at ${B.name} for the planets to come round for the way back is not counted, and adds about as much a day in orbit` }); }
  }
  out.push(...more(s, W, D, H, vol, area));
  return out;
}

/** The laws on keeping and making heat, on what light and hands give, on what floats in air, swims in blood, burrows,
 *  sits deep under water and holds a pressure in: each weighed on the figures read, each estimate said as one. */
function more(s: Said, W: number | undefined, D: number | undefined, H: number | undefined, vol0: number | undefined, area0: number | undefined): Bound[] {
  const out: Bound[] = [], c = 4186, V = s.volume, m = V !== undefined ? V * 1000 : undefined, Ta = s.Tamb ?? AMBIENT;
  // a vessel holding V as a cylinder twice as tall as it is wide (estimate): its outside
  const vesselArea = (v: number) => { const d = Math.cbrt((2 * v) / Math.PI); return 2.5 * Math.PI * d * d; };
  // keeping hot: from T0 to no less than Tmin over t, the most heat it may lose for each kelvin, U A = m c / t · ln((T0 − Ta)/(Tmin − Ta)),
  // against what walls do: a good steel vacuum flask about 0.05 W/K for a litre (estimate), 2 cm of foam k A / t (k 0.03 W/(m K),
  // estimate), a bare cup about 10 W/(m² K) of still air
  const tk = s.keepFor ?? s.runFor;
  if (s.tmin !== undefined && tk !== undefined && m !== undefined) {
    const T0 = s.T0 ?? s.tmin + 30, A = vesselArea(V!), need = ((m * c) / tk) * Math.log((T0 - Ta) / (s.tmin - Ta)), vac = 0.035 * (A / vesselArea(1e-3)), foam = (0.03 * A) / 0.02, bare = 10 * A, best = s.vacuumWall ? vac : Math.min(vac, foam);
    out.push({ what: `walls can keep what it holds above ${s.tmin} °C for ${timeSay(tk)}`, ok: need >= best, says: `${fmt(m)} kg of it from ${fmt(T0)} °C${s.T0 === undefined ? ' (taken: estimate)' : ''} in ${fmt(Ta)} °C round it may lose at most ${fmt(need)} W for each kelvin (U A = m c / t · ln((T0 − Ta)/(Tmin − Ta))), against about ${fmt(vac)} W/K for a good vacuum flask its size (a litre's about 0.02 to 0.05 W/K, from makers' figures for keeping hot a day, estimate; scaled by its surface), ${fmt(foam)} for 2 cm of foam and ${fmt(bare)} bare${need < vac ? `: even a vacuum flask loses about ${fmt(vac / need)} times too much` : ''}; what the walls made do is checked with them` });
  }
  // keeping cold: the heat leaking in through walls of foam (k 0.03 W/(m K), estimate) round what it holds, over the time
  // asked, pumped out by a Peltier at about 0.5 (estimate; Carnot allows Tc / ΔT): the electricity, against what it stores
  if (s.Tkeep !== undefined && (s.runFor ?? s.keepFor) !== undefined) {
    const v = V ?? 0.02, side = Math.cbrt(v) * 1.1, A = 6 * side * side, wall = s.wall ?? 0.03, dT = (s.Tamb ?? 25) - s.Tkeep, Q = (0.03 * A * dT) / wall, t = (s.runFor ?? s.keepFor)!, E = Q * t, cop = 0.5, carnot = (s.Tkeep + 273.15) / Math.max(dT, 0.1), elec = E / cop, chill = (v * 1000 * c * dT) / cop;
    const ideal = E / carnot, Qv = (0.006 * A * dT) / wall;
    out.push({ what: `walls of foam and a Peltier keep what it holds at ${s.Tkeep} °C for ${timeSay(t)}`, ok: s.store === undefined ? null : elec <= s.store, says: `${fmt(A * 1e4)} cm² of walls round it at the least (a cube a tenth wider than what it holds, estimate), ${lenSay(wall)} of foam (k 0.03 W/(m K), estimate), let in ${fmt(Q)} W at ${fmt(dT)} K: ${fmt(E / 3600)} Wh over that time; a Peltier pumps it out at about ${cop} at best (estimate; less as the lift grows, about 0.1 to 0.3 at 30 K), so it draws ${fmt(elec / 3600)} Wh${s.store !== undefined ? ` against the ${fmt(s.store / 3600)} Wh it stores${elec > s.store ? `: ${fmt(elec / s.store)} times too little` : ''}` : ''}${s.store !== undefined && ideal > s.store ? `; even a perfect cooler (Carnot, ${fmt(carnot)}) would draw ${fmt(ideal / 3600)} Wh: no cooler can` : ''}; vacuum panels as thick (k about 0.006 W/(m K), estimate) would let in ${fmt(Qv)} W, ${fmt((Qv * t) / cop / 3600)} Wh by a Peltier; chilling what is put in warm takes ${fmt(chill / 3600)} Wh more` });
  }
  // bringing it to a temperature in a time: m c ΔT / t, against what a person cranking gives (about 75 W kept up, estimate)
  if (s.Tto !== undefined && s.within !== undefined && m !== undefined) {
    const T0 = s.T0 ?? AMBIENT, P = (m * c * (s.Tto - T0)) / s.within, hand = 75, got = hand * 0.7;
    out.push({ what: `it brings what it holds to ${s.Tto} °C in ${timeSay(s.within)}`, ok: s.human ? P <= got : null, says: `${fmt(m)} kg from ${fmt(T0)} °C to ${s.Tto} °C is ${fmt((m * c * (s.Tto - T0)) / 1000)} kJ: ${fmt(P)} W for that time, with nothing lost${s.human ? ` against about ${hand} W a person keeps up cranking (estimate), ${fmt(got)} W of it heating it through a generator at 70% (estimate): ${fmt(P / got)} times too little; in ${timeSay(s.within)} that warms it ${fmt((got * s.within) / (m * c))} K; with nothing lost it would take ${timeSay((m * c * (s.Tto - T0)) / got)}, and its walls lose heat as it warms (weighed with what is made)` : ''}` });
  }
  // what light gives a panel in a time, at 22% (estimate), against what it must fill
  if (s.light !== undefined && s.area !== undefined && !s.sail) {
    const t = s.within ?? s.runFor, P = s.light * s.area * 0.22, E = t !== undefined ? P * t : undefined;
    out.push({ what: `light on its ${fmt(s.area)} m² gives what is asked`, ok: E === undefined || s.store === undefined ? null : E >= s.store, says: `${fmt(s.light)} W/m² on ${fmt(s.area)} m² at 22% (a good panel, estimate) gives ${fmt(P)} W${E !== undefined ? `, ${fmt(E / 3600)} Wh in ${timeSay(t!)} (all the light falling on it is ${fmt((s.light * s.area * t!) / 3600)} Wh)` : ''}${s.store !== undefined && E !== undefined ? ` against the ${fmt(s.store / 3600)} Wh to fill${(s.light * s.area * t!) < s.store ? `: even all the light on it, at 100%, is ${fmt(s.store / (s.light * s.area * t!))} times too little: no panel that size can` : ''}${E < s.store ? `; at 22% it is ${fmt(s.store / E)} times too little; it needs at least ${fmt((s.store / E) * s.area)} m², or ${timeSay(s.store / P)} of that light, before what charging loses (about a tenth, estimate) and hot cells lose (about a tenth at midday, estimate)` : ''}` : ''}` });
  }
  // floating in air: a hull as long as it is, six times as long as it is wide (estimate), of helium lifting about 1.02 kg
  // a cubic metre at sea level (estimate); pushed along against ½ ρ v² 0.025 V^⅔ (an airship's drag, estimate) at 70%
  // through its propellers, burning fuel at 35% of 43 MJ/kg (estimate) over the distance said
  if (s.buoyant && W) {
    const L = Math.max(W, D ?? 0, H ?? 0), V = (Math.PI * L ** 3) / 216, lift = 1.02 * V, v = s.v, Dr = v !== undefined ? 0.5 * 1.204 * v * v * 0.025 * V ** (2 / 3) : undefined, P = Dr !== undefined ? (Dr * v!) / 0.7 : undefined, fuel = P !== undefined && s.distance !== undefined ? (P * (s.distance / v!)) / (0.35 * 43e6) : undefined;
    // its hull, gas cells, engines and crew: about half its gross lift (the rigid airships of the 1930s, estimate); and at
    // 1.5 km up the air is about 0.86 as dense (standard atmosphere), so it lifts that much less
    const own = 0.5 * lift, left = lift - own - (s.payload ?? 0) - (fuel ?? 0), high = 0.86 * lift - own - (s.payload ?? 0) - (fuel ?? 0);
    out.push({ what: `its gas holds up what it carries`, ok: s.payload === undefined ? null : left >= 0, says: `a hull ${lenSay(L)} long and ${lenSay(L / 6)} across (six to one, estimate) holds ${fmt(V)} m³ of helium, lifting about ${fmt(lift / 1000)} t (1.02 kg a cubic metre at sea level, estimate)${s.payload !== undefined ? `: less its own hull, gas cells and engines, about half of that (rigid airships of the 1930s, estimate)${fuel !== undefined ? ` and the fuel below` : ''}, ${fmt(left / 1000)} t is left over the ${fmt(s.payload / 1000)} t it carries at sea level, ${fmt(high / 1000)} t at 1.5 km up (the air 0.86 as dense)` : ''}${P !== undefined ? `; at ${fmt(v! * 3.6)} km/h its drag is about ${fmt(Dr! / 1000)} kN (½ ρ v² 0.025 V^⅔, estimate), ${fmt(P / 1e6)} MW through its propellers at 70%` : ''}${fuel !== undefined ? `; over ${lenSay(s.distance!)} that burns about ${fmt(fuel / 1000)} t of fuel at 35% (43 MJ/kg, estimate), with no wind against it and no reserve; as it burns, and as it unloads, it grows that much lighter and must take on ballast (water from its exhaust, or vented gas), not weighed` : ''}` });
  }
  // swimming in blood: its Reynolds number in blood (μ 3.5 mPa s, ρ 1060 kg/m³: whole blood, estimate), the Stokes drag on
  // it, its time to go so far; against the flow it swims in and the vessels it must fit
  if (s.immersed && W && s.v !== undefined && W < 0.01) {
    const mu = 3.5e-3, Re = (1060 * s.v * W) / mu, F = 3 * Math.PI * mu * W * s.v, t = s.distance !== undefined ? s.distance / s.v : undefined;
    // the vessels it fits (wider than about 1.5 times it): flow there about 1 to 10 cm/s in arterioles and small arteries
    // (estimate); denser than blood by 1000 kg/m³ (a magnetic composite, estimate) it sinks at 2 Δρ g a² / 9 μ (Stokes)
    const flowLo = W < 1e-4 ? 1e-3 : 0.01, flowHi = W < 1e-4 ? 0.01 : 0.1, swept = s.v < flowLo, a = W / 2, sink = (2 * 1000 * 9.80665 * a * a) / (9 * mu), body = (1060 * Math.PI * W ** 3) / 6;
    // driven by a turning field: a helix advancing a tenth of its length a turn (estimate) turns at v / 0.1 L; its drag
    // torque 8 π μ a³ ω against m × B with 1% of it NdFeB (about 1e6 A/m, estimate) in 5 mT
    const omega = (2 * Math.PI * s.v) / (0.1 * W), tDrag = 8 * Math.PI * mu * a ** 3 * omega, tMag = 0.01 * ((Math.PI * W ** 3) / 6) * 1e6 * 5e-3;
    out.push({ what: `swimming at ${fmt(s.v * 1e6)} µm/s in blood`, ok: swept ? false : t === undefined || s.within === undefined ? null : t <= s.within, says: `at Re ${fmt(Re)} in blood (μ 3.5 mPa s, estimate) inertia counts for nothing: it must swim by a stroke that does not reverse (a turning helix, a beating tail: Purcell's scallop theorem); Stokes drag on it is ${fmt(F * 1e9)} nN${t !== undefined ? `; ${lenSay(s.distance!)} at its speed takes ${timeSay(t)}${s.within !== undefined ? ` against the ${timeSay(s.within)} it has` : ''}` : ''}; but in the vessels it fits (it fits no capillary, 5 to 10 µm) blood flows at about ${fmt(flowLo * 100)} to ${fmt(flowHi * 100)} cm/s (estimate), ${fmt(flowLo / s.v)} to ${fmt(flowHi / s.v)} times its speed: it is swept along, and swims to the clot only where blood stands still (a vessel the clot blocks); denser than blood by 1000 kg/m³ (a magnetic composite, estimate) it sinks at ${fmt(sink * 1000)} mm/s, ${fmt(sink / s.v)} times its speed, unless it is about as light as blood, held up by the field's pull, or rolls along the vessel's wall${s.payload !== undefined ? `; its ${fmt(s.payload * 1e12)} ng is ${fmt((s.payload / body) * 100)}% of its ${fmt(body * 1e9)} µg (as dense as blood), and how it lets it go is not kept` : ''}${s.fieldDriven ? `; turned by a field as a helix advancing a tenth of its length a turn (estimate), it turns ${fmt(omega / (2 * Math.PI))} times a second against a drag torque of ${fmt(tDrag)} N·m (8 π μ a³ ω); 1% of it NdFeB (about 1e6 A/m, estimate) in 5 mT gives ${fmt(tMag)} N·m, ${fmt(tMag / tDrag)} times that` : ''}` });
  }
  // burrowing: what it pushes through, about 0.3 MPa ahead of it in wet clay (cone resistance, estimate), over its tip
  if (s.burrows && W && s.v !== undefined) {
    const d = s.slender ? W / 8 : W, F = 3e5 * Math.PI * (d / 2) ** 2, skin = 2e4 * Math.PI * d * W * 0.5, P = (F + skin) * s.v;
    out.push({ what: `pushing through the ground at ${fmt(s.v * 3600)} m/h`, ok: null, says: `wet clay pushes back about 0.3 MPa ahead of it (cone resistance, estimate) over its ${lenSay(d)} tip (taken as an eighth of its length, estimate): ${fmt(F)} N; and dragging half its skin along the burrow against about 20 kPa (the strength of soft clay, estimate), ${fmt(skin)} N more: ${fmt(P * 1000)} mW at its speed at the least, before what anchors it and its actuators lose` });
  }
  // deep under water: the pressure there, ρ g h, and a sphere of titanium (Ti-6Al-4V, its yield over 1.5) holding a volume
  // against it, its wall thick (Lamé: the most stress, at its inside, 3 p r_o³ / 2 (r_o³ − r_i³))
  if (s.depth !== undefined) {
    const p = 1025 * 9.80665 * s.depth, perV = sphereKgPerM3(s.depth), tr = Math.cbrt(1 / (1 - (3 * p) / (2 * (880e6 / 1.5)))) - 1;
    out.push({ what: `it holds out the sea ${lenSay(s.depth)} down`, ok: null, says: `the pressure there is ${fmt(p / 1e6)} MPa (ρ g h); a titanium sphere (Ti-6Al-4V, its yield over 1.5) holding a volume against it is ${fmt(tr * 100)}% as thick as it is wide inside, and weighs ${fmt(perV)} kg for each cubic metre inside (a thick wall, Lamé)${vol0 !== undefined ? `: for its ${fmt(vol0 * 1000)} L, ${fmt(perV * vol0)} kg` : ''}` });
  }
  // a pressure held inside: the pull in its wall, p r / 2 for a sphere, p r for a cylinder
  if (s.pin !== undefined && W) {
    const r = W / 2, Tn = (s.pin * r) / 2;
    const gb = s.on === 'moon' ? 1.62 : 9.80665, cover = 2.5 * 1600 * gb;
    out.push({ what: `it holds ${fmt(s.pin / 1000)} kPa in`, ok: null, says: `its wall pulls ${fmt(Tn / 1000)} kN on each metre (p r / 2, a sphere ${lenSay(W)} across); a cover of 2.5 m of ground on it (1600 kg/m³ under ${fmt(gb)} m/s², estimate) presses back only ${fmt(cover / 1000)} kPa, so its wall and anchors carry nearly all of it: on a flat floor ${lenSay(W)} across it pushes up ${fmt((s.pin * Math.PI * r * r) / 1e6)} MN` });
  }
  // a total dose it is rated for, on Europa's surface: about 5.4 Sv a day there (Ringwald 2000, as Wikipedia's Europa
  // article gives it), taken as 5.4 Gy in silicon (estimate), over the time it is there
  const there = s.runFor ?? s.keepFor;
  if (s.ratedDose !== undefined && s.on === 'europa' && there !== undefined) {
    const days = there / 86400, dose = 5.4 * days, rho = ({ tantalum: 16650, tungsten: 19300, lead: 11340, aluminium: 2700, aluminum: 2700, copper: 8960 } as Record<string, number>)[s.shield?.of ?? ''] ?? 16650;
    // its shield spread over a box round its card, 25 mm deep (estimate)
    const box = W && D ? 2 * (W * D + (W + D) * 0.025) : undefined, areal = s.shield && box ? s.shield.kg / box : undefined;
    out.push({ what: `it stays within its ${fmt(s.ratedDose / 10)} krad on Europa`, ok: null, says: `Europa's surface gives about 5.4 Sv a day to tissue at its surface (Ringwald 2000, as Wikipedia's Europa article gives it): ${fmt(days)} days there is about ${fmt(dose)} Sv; that is not the dose to silicon behind a shield, which a dose-depth curve for Jupiter's electrons gives and is not kept, nor what it takes on the way through Jupiter's belts (Europa Clipper's whole mission is about 2.8 Mrad behind 100 mils of aluminium, as NASA gives it, estimate): its ${fmt(s.ratedDose / 10)} krad is not judged here${areal !== undefined ? `; its ${fmt(s.shield!.kg)} kg of ${s.shield!.of} round a ${lenSay(Math.max(W!, D!))} × ${lenSay(Math.min(W!, D!))} × 25 mm box (estimate) is about ${fmt(areal / 10)} g/cm², ${lenSay(areal / rho)} of it` : ''}` });
  }
  // a habitat buried on the Moon: what leaks out through its cover, k 4π ΔT r1 r2 / (r2 − r1) (a shell), regolith about
  // 0.01 W/(m K) (estimate, from the Apollo heat-flow probes) 2.5 m deep (estimate), to the cold said round it
  if (s.on === 'moon' && s.buried && W && s.round) {
    const r1 = W / 2, r2 = r1 + 2.5, dT = 20 - (s.Tamb ?? -170), Q = (4 * Math.PI * 0.01 * dT * r1 * r2) / (r2 - r1), P = s.power?.find((x) => x.as === 'draws')?.W;
    out.push({ what: 'it keeps warm under its cover', ok: P === undefined ? null : Q <= P, says: `through 2.5 m of regolith (k about 0.01 W/(m K), estimate, from the Apollo heat-flow probes) to ${fmt(s.Tamb ?? -170)} °C, a ${lenSay(W)} sphere at 20 °C loses about ${fmt(Q)} W (a shell, 4π k ΔT r1 r2 / (r2 − r1)), ${P !== undefined ? `${fmt(P / Q)} times less than its ${fmt(P / 1000)} kW: keeping warm is easy; what it makes inside it cannot shed through its cover, so the rest must go out through radiators, not kept` : ''}; the nights' cold reaches only a few tenths of a metre into the ground, so its cover sits near the ground's mean (estimate); 2.5 m of cover is about ${fmt((4 / 3) * Math.PI * (r2 ** 3 - r1 ** 3) * 1600 / 1000)} t of regolith (1600 kg/m³, estimate)` });
  }
  // a dose in a year on the Moon's surface: about 1.37 mSv a day (Chang'e 4's LND, Zhang et al. 2020)
  if (s.dose !== undefined && s.dosePerYear) {
    const yr = 1.37e-3 * 365;
    out.push({ what: `its crew take under ${fmt(s.dose * 1000)} mSv a year`, ok: s.buried ? null : false, says: `the Moon's surface gives about ${fmt(yr * 1000)} mSv a year (1.37 mSv a day, Chang'e 4's LND at mid-latitude near solar minimum, Zhang et al. 2020): ${fmt(yr / s.dose)} times the limit unshielded; ${s.buried ? 'buried as asked, how deep the cover must be (about 2 to 3 m of regolith, estimate, with the neutrons it makes) is not derived' : 'it needs cover, about 2 to 3 m of regolith (estimate), and how it is shielded is not kept'}` });
  }
  // climbing so high in a time: m g h / t for what it carries and itself (at most its weight limit), with nothing lost
  if (s.climb !== undefined && s.within !== undefined) {
    const kg = (s.payload ?? 0) + (s.massLimit ?? 0), P = (kg * 9.80665 * s.climb) / s.within;
    out.push({ what: `it climbs ${lenSay(s.climb)} in ${timeSay(s.within)}`, ok: null, says: `${fmt(kg)} kg (${s.payload !== undefined ? `the ${fmt(s.payload)} kg it carries` : 'nothing carried said'}${s.massLimit !== undefined ? ` and its own ${fmt(s.massLimit)} kg at most` : ''}) up ${lenSay(s.climb)} in that time takes about ${fmt(P)} W (m g h / t), with nothing lost; how it climbs (legs, tracks, a lifting frame) is not kept` });
  }
  // watering what grows: a planted surface loses about 3 to 6 mm of water a day in summer sun (evapotranspiration, estimate)
  const soil = s.waterArea ?? (W && D ? W * D : undefined);
  if (s.waters && soil !== undefined) {
    const days = (s.runFor ?? s.keepFor ?? 7 * 86400) / 86400, lo = soil * 3 * days, hi = soil * 6 * days;
    out.push({ what: 'its tank waters it for the time asked', ok: V === undefined ? null : V * 1000 >= hi, says: `${fmt(soil * 1e4)} cm² of soil loses about 3 to 6 mm of water a day in summer sun (evapotranspiration, estimate): ${fmt(lo)} to ${fmt(hi)} L over ${fmt(days)} days${V !== undefined ? ` against the ${fmt(V * 1000)} L it holds` : ''}` });
  }
  return out;
}

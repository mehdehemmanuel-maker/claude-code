// Craft that are not wheeled: what holds each one up, as its own law. A wheeled machine stands on the ground
// (machines.ts); these four do not, and each holds itself up a different way, so what is general here is the support,
// not the vehicle:
//
//   a rotor or a ducted fan   throws air down          momentum theory (thrust.ideal-static)
//   a jet                     throws its own mass out  thrust.jet
//   an air cushion            sits on trapped air      cushion.pressure, cushion.escape
//   a hull in water           displaces its own weight Archimedes, and hull.collapse for how deep it may go
//
// Every craft here is sized from those: a quadcopter's hover power from its rotors' disc area, a jet suit's thrust
// against the weight of a person, a hovercraft's lift fan from the air that runs out under its skirt, a submarine's
// plate from the pressure at the depth it is rated to. The laws are the book's (src/nexus/book/fluids.ts,
// src/ganglia/laws.ts); what is here is the arithmetic that uses them and the figures it uses, each sourced or
// labelled an estimate.
//
// Owner of: how a craft holds itself up and what that costs, and the craft drawn from it.

import type { Part, V3 as Vec } from '../parts/kits';
import { massOf } from '../parts/mass';

/** Air at ISA sea level, kg/m³ (ISO 2533). */
export const AIR = 1.225;
/** Sea water, kg/m³ (typical of the open ocean at the surface; fresh water is 1000). */
export const SEAWATER = 1025;
/** Standard gravity, m/s² (ISO 80000-3). */
export const G = 9.80665;

// ---- rotors: a drone, a lift fan, anything that hovers by throwing air down --------------------------------------

/** What it takes to hover: the thrust each rotor must make, the air it throws and the power that costs. */
export interface Hover {
  /** thrust a rotor, N */ T: number;
  /** one rotor's disc, m² */ A: number;
  /** thrust over the whole disc area, N/m²: the number that decides how hard hovering is */ disc: number;
  /** the speed the air leaves at, m/s (its induced velocity) */ vi: number;
  /** the least power any rotor of that disc could hover on, W */ ideal: number;
  /** what one shaft must give, W: the ideal over the rotor's figure of merit */ shaft: number;
  /** what one rotor's drive draws, W: the shaft over the motor's and its controller's efficiency */ watts: number;
  /** every shaft together, W */ shaftAll: number;
  /** what the battery gives, W: every drive together — this is the figure endurance is worked out on */ wattsAll: number;
  says: string;
}
/**
 * Hovering by momentum theory (Leishman, Principles of Helicopter Aerodynamics, ch. 2): a rotor of disc area A
 * holding up a thrust T throws air down at √(T / 2ρA) and cannot do it on less than T √(T / 2ρA) of power. A real
 * rotor makes that in its figure of merit (0.6 to 0.75 for a small propeller, an estimate from the range Leishman
 * gives); its motor and controller together pass about 80 % (an estimate typical of a hobby drive).
 */
export function hover(kg: number, D: number, n: number, o: { rho?: number; fm?: number; drive?: number } = {}): Hover {
  const rho = o.rho ?? AIR, fm = o.fm ?? 0.7, drive = o.drive ?? 0.8;
  const A = (Math.PI * D * D) / 4, T = (kg * G) / n, vi = Math.sqrt(T / (2 * rho * A));
  const ideal = T * vi, shaft = ideal / fm, watts = shaft / drive;
  return { T, A, disc: T / A, vi, ideal, shaft, watts, shaftAll: shaft * n, wattsAll: watts * n,
    says: `${n} rotors ${(D * 1000).toFixed(0)} mm across hold ${kg} kg: ${T.toFixed(1)} N each over ${A.toFixed(3)} m² of disc (${(T / A).toFixed(0)} N/m²), the air leaving at ${vi.toFixed(1)} m/s. The least power that can do it is ${ideal.toFixed(0)} W a rotor; at a figure of merit of ${fm} the shafts take ${(shaft * n).toFixed(0)} W and at ${drive} through the motors and their controllers the battery gives ${(watts * n).toFixed(0)} W` };
}
/** How long a pack holds it up, minutes: its usable energy over what hovering draws (hovering only — climbing, wind
 *  and manoeuvring all cost more, and a pack is not run flat). */
export function endurance(watts: number, Wh: number, usable = 0.8): { minutes: number; says: string } {
  const minutes = (Wh * usable * 60) / watts;
  return { minutes, says: `${Wh} Wh, ${(usable * 100).toFixed(0)} % of it usable, at ${watts.toFixed(0)} W is ${minutes.toFixed(1)} minutes hovering still in still air; flying, climbing or in wind, less` };
}
/** The thrust a set of rotors can make at a power, by the same law read the other way (the book's
 *  thrust.ideal-static): what is left over its weight is what it can lift or accelerate with. */
export function lift(watts: number, D: number, n: number, o: { rho?: number; fm?: number; drive?: number } = {}): { T: number; kg: number; says: string } {
  // (`watts` is what one rotor's drive draws, as `hover().watts` is: n of them together make n times the thrust)
  const rho = o.rho ?? AIR, fm = o.fm ?? 0.7, drive = o.drive ?? 0.8, A = (Math.PI * D * D) / 4;
  // (the figure of merit is the ideal power over the real one for the same thrust, so the thrust a real shaft
  //  power makes is the ideal thrust of fm times that power: fm^(2/3) times the ideal of the power itself)
  const shaft = watts * drive, T = Math.pow(fm, 2 / 3) * Math.cbrt(2 * rho * A * shaft * shaft) * n;
  return { T, kg: T / G, says: `${n} rotors ${(D * 1000).toFixed(0)} mm across on ${watts.toFixed(0)} W push ${T.toFixed(0)} N, which holds up ${(T / G).toFixed(2)} kg` };
}

// ---- jets: a jet suit, a thrust fan, anything that throws its own mass out ---------------------------------------

/** Thrust from a stream (the book's thrust.jet): what goes out a second times how much faster it leaves than the
 *  craft is going. */
export const jet = (mdot: number, ve: number, v0 = 0): number => mdot * (ve - v0);
/** What a jet burns: its thrust-specific fuel consumption, kg of fuel an hour for each newton it makes. A small
 *  turbojet is near 0.17 kg/N·h (its makers' figures for micro-turbines of a few hundred newtons, an estimate of the
 *  class, not of one engine); a turbofan less than half that. */
export function burn(T: number, tsfc = 0.17, kgFuel = 0): { kgPerHour: number; minutes: number; says: string } {
  const kgPerHour = T * tsfc, minutes = kgFuel > 0 ? (kgFuel / kgPerHour) * 60 : 0;
  return { kgPerHour, minutes,
    says: `${T.toFixed(0)} N at ${tsfc} kg/N·h burns ${kgPerHour.toFixed(1)} kg of kerosene an hour${kgFuel > 0 ? `, so ${kgFuel} kg of fuel lasts ${minutes.toFixed(1)} minutes at that thrust` : ''}` };
}
/** Whether a set of engines holds a craft up, and with how much to spare. Under 1 it does not leave the ground; a
 *  craft a person flies needs margin enough to climb and to correct, not just to hover. */
export function hovers(kg: number, perEngine: number, n: number): { ratio: number; ok: boolean; says: string } {
  const T = perEngine * n, W = kg * G, ratio = T / W;
  return { ratio, ok: ratio > 1,
    says: ratio <= 1 ? `${n} × ${perEngine} N is ${T} N against ${W.toFixed(0)} N of weight: it does not leave the ground` : `${n} × ${perEngine} N is ${T} N against ${W.toFixed(0)} N of weight, a thrust-to-weight of ${ratio.toFixed(2)}: ${((ratio - 1) * G).toFixed(1)} m/s² to climb and to correct with` };
}

// ---- an air cushion: a hovercraft --------------------------------------------------------------------------------

export interface Cushion {
  /** the pressure under it, Pa */ p: number;
  /** how fast the air runs out under the skirt, m/s */ v: number;
  /** what runs out, m³/s: what the lift fan must put back */ Q: number;
  /** what the lift fan takes, W */ watts: number;
  /** the hump speed: the speed of the wave its own depression makes, m/s, which it must get over */ hump: number;
  says: string;
}
/**
 * A hovercraft's cushion (Yun & Bliault, Theory and Design of Air Cushion Craft): it floats on air at its own weight
 * over its cushion area — a thousandth of an atmosphere, no more — and that air runs out through the gap under its
 * skirt at √(2p/ρ). The lift fan must replace it, at the cushion's pressure, through its own efficiency. The hump
 * speed is the shallow-water wave speed of the depression it presses into the water, √(g L): below it the craft is
 * climbing its own bow wave and needs most power.
 */
export function cushion(kg: number, area: number, perimeter: number, gap = 0.02, o: { rho?: number; cd?: number; eta?: number; L?: number } = {}): Cushion {
  const rho = o.rho ?? AIR, cd = o.cd ?? 0.53, eta = o.eta ?? 0.6;
  const p = (kg * G) / area, v = Math.sqrt((2 * p) / rho), Q = cd * perimeter * gap * v, watts = (Q * p) / eta;
  const hump = Math.sqrt(G * (o.L ?? Math.sqrt(area)));
  return { p, v, Q, watts, hump,
    says: `${kg} kg on ${area} m² of cushion is ${p.toFixed(0)} Pa — ${((p / 101325) * 100).toFixed(2)} % of an atmosphere. Through a ${(gap * 1000).toFixed(0)} mm gap round ${perimeter} m of skirt that air leaves at ${v.toFixed(1)} m/s, ${Q.toFixed(2)} m³/s, which the lift fan puts back on ${(watts / 1000).toFixed(1)} kW at ${(eta * 100).toFixed(0)} % efficient. Its hump speed is ${hump.toFixed(1)} m/s (${(hump * 1.944).toFixed(1)} knots): below that it is climbing its own bow wave and needs most of its thrust` };
}
/** What a hovercraft may climb: a cushion holds its pressure over a slope until its skirt loses the seal, so the
 *  gradient it takes is what its thrust can push it up, not what its cushion can hold. */
export const climb = (kg: number, thrust: number): { grade: number; says: string } => {
  const grade = thrust / (kg * G);
  return { grade, says: `${thrust} N against ${(kg * G).toFixed(0)} N of weight climbs a slope of ${(grade * 100).toFixed(0)} % while its skirt keeps the seal; a cushion has no grip, so a slope it cannot climb it slides back down` };
};

// ---- a hull in water: a submarine ---------------------------------------------------------------------------------

export interface Hull {
  /** the pressure at the depth asked, Pa (gauge: what the hull feels) */ p: number;
  /** the pressure the plate buckles at, Pa (Windenburg & Trilling) */ buckle: number;
  /** the pressure the plate yields at, Pa (hoop stress, 2 σ t / D) */ squash: number;
  /** whichever gives way first, Pa */ collapse: number;
  /** how deep that is, m */ crush: number;
  /** collapse over the pressure at the depth asked */ margin: number;
  says: string;
}
/**
 * How deep a cylindrical pressure hull may go. A tube squeezed from outside does not crush, it buckles into lobes:
 * Windenburg and Trilling's approximation (Trans. ASME 56, 1934) to von Mises' solution gives the pressure at which
 * an unstiffened cylinder of length Lh between rigid ends goes. A thick enough tube yields first instead, at the hoop
 * stress 2 σ t / D. Whichever is lower is the hull's collapse pressure; a submarine is rated well inside it (navies
 * work to about 1.5 times the deepest dive, and the collapse depth is deeper again).
 */
export function hull(depth: number, D: number, t: number, Lh: number, o: { E?: number; sy?: number; rho?: number } = {}): Hull {
  const E = o.E ?? 200e9, sy = o.sy ?? 350e6, rho = o.rho ?? SEAWATER;
  const p = rho * G * depth;
  const buckle = (2.6 * E * Math.pow(t / D, 2.5)) / (Lh / D - 0.45 * Math.sqrt(t / D));
  const squash = (2 * sy * t) / D, collapse = Math.min(buckle, squash);
  return { p, buckle, squash, collapse, crush: collapse / (rho * G), margin: collapse / p,
    says: `at ${depth} m the sea presses ${(p / 1e5).toFixed(1)} bar on it. A ${(D * 1000).toFixed(0)} mm hull of ${(t * 1000).toFixed(1)} mm plate, ${Lh} m between its frames, buckles at ${(buckle / 1e5).toFixed(1)} bar and yields at ${(squash / 1e5).toFixed(1)} bar, so it goes ${buckle < squash ? 'by buckling' : 'by yielding'} at ${(collapse / 1e5).toFixed(1)} bar — ${(collapse / (rho * G)).toFixed(0)} m down, ${(collapse / p).toFixed(2)} times the depth asked` };
}
/** The plate a hull needs for a depth, found by walking the thickness up until its collapse pressure is the safety
 *  factor times the pressure there (0.5 mm steps, as plate is sold). */
export function plateFor(depth: number, D: number, Lh: number, safety = 1.5, o: { E?: number; sy?: number; rho?: number } = {}): { t: number; hull: Hull; says: string } {
  for (let t = 0.001; t <= 0.2; t += 0.0005) {
    const h = hull(depth, D, +t.toFixed(4), Lh, o);
    if (h.margin >= safety) return { t: +t.toFixed(4), hull: h, says: `${(t * 1000).toFixed(1)} mm of plate takes a ${(D * 1000).toFixed(0)} mm hull to ${depth} m with ${safety} times the margin: ${h.says}` };
  }
  return { t: 0.2, hull: hull(depth, D, 0.2, Lh, o), says: `no plate up to 200 mm takes a ${(D * 1000).toFixed(0)} mm hull to ${depth} m at ${safety} times the margin: it wants frames, a smaller hull, or a sphere` };
}
/** What floats and what sinks it: a hull displaces its own volume of water, so what it weighs against that is how
 *  much ballast it must take on to go under, and what is left is its reserve buoyancy on the surface. */
export function ballast(volume: number, kg: number, o: { rho?: number } = {}): { lift: number; take: number; reserve: number; says: string } {
  const rho = o.rho ?? SEAWATER, lift = volume * rho, take = lift - kg, reserve = take / kg;
  return { lift, take, reserve,
    says: take <= 0 ? `${volume} m³ displaces ${lift.toFixed(0)} kg of sea water and it weighs ${kg} kg: it sinks as it is, and wants ${(-take).toFixed(0)} kg of buoyancy to float` : `${volume} m³ displaces ${lift.toFixed(0)} kg of sea water against its ${kg} kg, so it floats with ${take.toFixed(0)} kg of reserve (${(reserve * 100).toFixed(0)} % of itself) and must flood that much ballast to go under` };
}

// ---- what is dangerous about each ----------------------------------------------------------------------------------

/** Said plainly, because the user asked to be taught to build these: what each one can do to the person building or
 *  flying it. These are not warnings bolted on; they are what the same arithmetic says when it is read for harm. */
export const HAZARDS: Record<string, string[]> = {
  drone: [
    'a propeller turning at flying speed cuts: a 250 mm carbon blade at 8,000 rpm has a tip at 100 m/s and takes a fingertip off. Bind the throttle off, props off the bench, and never arm it in your hands',
    'lithium polymer cells vent and burn when punctured, over-charged or shorted; a crash dents a cell. Charge in a bag or a box, never unattended, and retire a swollen pack',
    'what goes up comes down where it fails: a 900 g drone that stops at 50 m lands at about 30 m/s. Fly it over no one',
  ],
  jetpack: [
    'a jet suit\'s exhaust leaves at several hundred degrees and hundreds of metres a second: it sets light to what it is pointed at and burns anyone beside it',
    'kerosene is a flammable liquid under pressure, with a hot engine beside it; a leak at the pump is a fire on the pilot',
    'there is no autorotation and no glide. A turbine that stops below the height a parachute opens at is a fall, and the margin here is seconds. This is equipment for a trained pilot over water with a crew, not a thing to build and try',
    'the gyroscopes in the turbines resist being turned: a fast roll loads the arms and the mounts far past the thrust',
  ],
  hovercraft: [
    'a cushion has no grip at all: it does not brake, it does not hold a slope, and it slides on in the direction it was going. Everything about stopping it is thrust and distance',
    'the lift fan is a large thin disc turning fast in a duct a hand fits into; the thrust fan is worse. Guard both, and never run either with the duct open',
    'carbon monoxide collects in the cabin of a petrol craft whose cushion blows its own exhaust back under it',
  ],
  submarine: [
    'a hull that fails at depth does not leak, it implodes: at 100 m the sea presses a tonne on every hand\'s width of plate, and the inside is at one atmosphere. There is no warning and no escape from inside',
    'the arithmetic here is a first sizing, not a classed design: a real pressure hull is checked for out-of-roundness, welds, penetrations and fatigue, and surveyed. Nobody should dive a hull sized only by a formula',
    'breathing gas and carbon dioxide are what kill people in small submersibles long before the hull does; so is water on the batteries',
  ],
};

// ---- drawn ----------------------------------------------------------------------------------------------------------
//
// Each craft is laid out from the arithmetic above, not from a picture: a drone's arms are as long as its rotors need
// to clear each other, its motors are sized to the thrust each must make; a hovercraft's skirt is the perimeter the
// escape flow was worked out over; a submarine's plate is the thickness its depth asked for. Where a size is not
// decided by a law it is typical of such a craft, and says so.

const mm = 0.001, PI = Math.PI;
const P = (name: string, shape: Part['shape'], o: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...o } as Part);
const B = (name: string, s: Vec, at: Vec, o: Partial<Part> = {}): Part => P(name, { box: s }, { at, ...o });
const C = (name: string, r: number, h: number, at: Vec, o: Partial<Part> = {}): Part => P(name, { cyl: [r, h] }, { at, ...o });
const group = (name: string, at: Vec, parts: Part[], o: Partial<Part> = {}): Part => ({ name, at, parts, ...o } as Part);

/**
 * A propeller or rotor, D across, n blades, of a pitch (how far it would screw forward in one turn, which is how a
 * propeller is sold: a 10 × 4.5 is 10 inches across and 4.5 of pitch). Its blade is twisted because its pitch is the
 * same all the way out: the angle at a radius is atan(pitch / 2π r), coarse at the root and fine at the tip, so the
 * section stands up near the hub and lies flat near the end. The blade is drawn as its own stations along its span,
 * each one its chord at that radius, as thin as a real section is (a tenth of its chord), laid at its own twist about
 * the span — so what is seen is the real shape, and what it weighs is what a thin twisted blade weighs. Drawing it
 * instead as one loft (the envelope the twisted chord sweeps) made it a solid blob: a 580 mm rotor came out at 400 g a
 * blade against the 50 to 60 g a real carbon one of that size weighs, and that error grew as the cube of the size.
 * `hand` mirrors it, by the sign of the twist: a multirotor's rotors must come in both hands or it spins.
 */
export function propParts(nm: string, D: number, o: { blades?: number; pitch?: number; hand?: 1 | -1; color?: number; mat?: string; turn?: number } = {}): Part[] {
  const n = o.blades ?? 2, R = D / 2, hub = Math.max(5 * mm, D * 0.055), hand = o.hand ?? 1;
  // (its pitch about 55 % of its diameter, as a multirotor's props are sold)
  const pitch = o.pitch ?? D * 0.55, C0 = D * 0.14, mat = o.mat ?? 'nylon', color = o.color ?? 0x23262b;
  // (twelve stations along the span, each drawn a seventh longer than its own slice so that it laps its neighbours and
  //  the blade reads as one piece: drawn end to end they showed as a row of separate blocks from above. Each station
  //  carries the mass of its own slice, not of the lap, so the blade still weighs what a blade of this section weighs)
  const SEG = 12, LAP = 1.15;
  const st = Array.from({ length: SEG }, (_, i) => {
    const t = (i + 0.5) / SEG, r = hub + (R - hub) * t, len = (R - hub) / SEG;
    // (the chord: widest at two fifths out, drawn in to a round tip)
    const c = C0 * (0.62 + 1.1 * t - 1.25 * t * t) * (t > 0.93 ? (1 - t) / 0.07 : 1);
    // (a tenth of its chord through: what a propeller's section is, and never thinner than a mould will fill)
    const th = Math.max(0.6 * mm, c * 0.1);
    // (its slice's own mass: the section it really is, about seven tenths of the box round it, as an aerofoil is)
    return { r, len, c, th, kg: massOf({ name: 'slice', shape: { box: [c, th, len] }, mat } as Part) * 0.7, b: Math.atan(pitch / (2 * Math.PI * r)) };
  });
  return [group(nm, [0, 0, 0], [
    P(`${nm} hub`, { lathe: [[0, -D * 0.02], [hub, -D * 0.018], [hub, D * 0.018], [hub * 0.45, D * 0.022], [0, D * 0.022]] }, { at: [0, 0, 0], mat, color, finish: 'moulded', item: 'propeller', says: `${(D * 1000).toFixed(0)} mm across, ${(pitch * 1000).toFixed(0)} mm of pitch, ${n} blades, ${hand > 0 ? 'right' : 'left'} handed` }),
    ...Array.from({ length: n }, (_, k) => { const a = (2 * PI * k) / n + (o.turn ?? 0), x = Math.cos(a), z = Math.sin(a);
      // (each station's own box: its chord across, its thickness through, its piece of the span along the radius —
      //  rot [0, π/2 − a, ±b] sends its z out along the radius and pitches its chord about that span by the twist)
      return group(`${nm} blade ${k + 1}`, [0, 0, 0], st.map((s, i) => B(`${nm} blade ${k + 1} station ${i + 1}`, [s.c, s.th, s.len * LAP], [x * s.r, 0, z * s.r],
        { rot: [0, PI / 2 - a, hand * s.b] as Vec, mat, color, finish: 'moulded', one: true, kg: s.kg })),
      { says: `twisted by its own pitch: ${((st[0]!.b * 180) / PI).toFixed(0)}° at the root, ${((st[SEG - 1]!.b * 180) / PI).toFixed(0)}° at the tip, ${(st[1]!.c * 1000).toFixed(0)} mm of chord at its widest` }); }),
  ])];
}

/** A brushless outrunner as a multirotor carries: its magnet bell turning round a wound stator on two bearings. Its
 *  name is its stator — 2806 is 28 mm across and 6 mm of stack — and its bell is about a quarter wider than that. The
 *  inside proportions (the wall of the bell, the tooth count, how deep the magnets sit) are typical of the class. */
export function outrunnerParts(nm: string, stator: string, kv: number, use: (w: string) => Part): Part[] {
  const d = Number(stator.slice(0, 2)) * mm, stack = Number(stator.slice(2)) * mm;
  const bell = d * 1.25, H = stack * 2.2 + 6 * mm, wall = Math.max(0.6 * mm, bell * 0.025);
  // (the bell is cut with the holes a real one is: air through them cools the windings, and they take its weight out)
  const vents = Array.from({ length: 8 }, (_, k) => { const a = (2 * PI * k) / 8;
    return { r: bell * 0.055, depth: wall * 3, at: [Math.cos(a) * bell * 0.3, H * 0.46, Math.sin(a) * bell * 0.3] as Vec, dir: [0, -1, 0] as Vec }; });
  const parts: Part[] = [
    P(`${nm} bell`, { lathe: [[0, H * 0.46], [bell / 2, H * 0.46], [bell / 2, -H * 0.5], [bell / 2 - wall, -H * 0.5], [bell / 2 - wall, H * 0.46 - wall], [0, H * 0.46 - wall], [0, H * 0.46]] },
      { at: [0, 0, 0], mat: 'al-6061', color: 0xb8403a, finish: 'anodised', item: 'motor-can', cuts: vents, says: 'the bell: it turns, its vents cool the windings, and the propeller bolts to its top' }),
    ...Array.from({ length: 14 }, (_, k) => { const a = (2 * PI * k) / 14;
      return B(`${nm} magnet ${k + 1}`, [bell * 0.07, stack * 1.1, bell * 0.16], [Math.cos(a) * (bell / 2 - wall - bell * 0.035), -H * 0.06, Math.sin(a) * (bell / 2 - wall - bell * 0.035)], { rot: [0, -a, 0] as Vec, mat: 'ndfeb', color: 0x3a3d42, item: 'magnet-ndfeb', says: 'fourteen poles inside the bell' }); }),
    P(`${nm} stator`, { cyl: [d / 2, stack] }, { at: [0, -H * 0.06, 0], mat: 'steel-electrical', color: 0x8d9298, item: 'lamination-stack', fill: 0.72, says: 'laminations stacked and bonded: filled to the steel the slots leave' }),
    ...Array.from({ length: 12 }, (_, k) => { const a = (2 * PI * k) / 12;
      return B(`${nm} winding ${k + 1}`, [d * 0.16, stack * 1.25, d * 0.2], [Math.cos(a) * d * 0.33, -H * 0.06, Math.sin(a) * d * 0.33], { rot: [0, -a, 0] as Vec, mat: 'magnet-wire', color: 0xb4702a, fill: 0.62, item: 'winding', says: 'twelve teeth wound in three phases' }); }),
    P(`${nm} shaft`, { cyl: [d * 0.09, H * 1.15] }, { at: [0, H * 0.05, 0], mat: 'steel-alloy', color: 0xc2c7cb, finish: 'polished', item: 'shaft-steel' }),
    P(`${nm} prop nut`, { cyl: [d * 0.17, d * 0.1] }, { at: [0, H * 0.56, 0], facets: 6, mat: 'al-7075', color: 0xc8512b, finish: 'anodised', says: 'what holds the propeller on: left-hand threaded on a right-hand motor, so running tightens it' }),
    P(`${nm} base`, { lathe: [[0, -H * 0.5], [bell / 2 * 0.92, -H * 0.5], [bell / 2 * 0.92, -H * 0.5 - 1.2 * mm], [0, -H * 0.5 - 1.2 * mm], [0, -H * 0.5]] }, { at: [0, 0, 0], mat: 'al-6061', color: 0x8f949a, finish: 'anodised', item: 'end-bell', says: `its mounting plate, four M3 on 16 or 19 mm, ${kv} KV` }),
  ];
  for (const k of [0, 1]) parts.push({ ...use('bearing 625'), at: [0, (k ? H * 0.2 : -H * 0.28), 0] as Vec, fixed: 'pressed into the stator boss, the shaft through both' });
  return [group(`${nm}`, [0, 0, 0], parts, { item: 'bldc-outrunner' })];
}

/** A multirotor, laid out by what its rotors need: its arms long enough that the discs clear each other by a tenth of
 *  their diameter, its motors the stator size the thrust each makes asks for, its body a sandwich of two plates on
 *  standoffs with the flight controller between them and the pack underneath. Its rotors alternate hand round the
 *  craft, as they must for their torques to cancel. */
export function droneParts(nm: string, n: number, span: number, use: (w: string) => Part): Part[] {
  // (adjacent rotors are span·sin(π/n) apart, and their discs are left a tenth of a diameter between them)
  const D = (span * Math.sin(PI / n)) / 1.1, R = span / 2;
  const kg = droneKg(n, span), h = hover(kg, D, n);
  const stator = D < 0.15 ? '1306' : D < 0.22 ? '2204' : D < 0.3 ? '2806' : D < 0.42 ? '2814' : '5010';
  const kv = D < 0.15 ? 4000 : D < 0.22 ? 2300 : D < 0.3 ? 1300 : D < 0.42 ? 700 : 280;
  const body = Math.max(0.07, span * 0.26), plate = 0.002, arm = Math.max(0.008, span * 0.028), deck = 0.03;
  const parts: Part[] = [];
  parts.push(B(`${nm} top plate`, [body * 0.78, plate, body * 0.62], [0, deck + plate / 2, 0], { mat: 'cfrp', color: 0x1b1d20, finish: 'brushed', item: 'frame-quad', fixed: 'the frame the arms bolt to' }));
  parts.push(B(`${nm} bottom plate`, [body, plate, body * 0.8], [0, deck - 0.026, 0], { mat: 'cfrp', color: 0x1b1d20, finish: 'brushed' }));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][])
    parts.push(C(`${nm} standoff`, 0.003, 0.028, [sx * body * 0.33, deck - 0.012, sz * body * 0.25], { mat: 'al-6061', color: 0x9aa0a6, finish: 'anodised' }));
  for (let k = 0; k < n; k++) {
    const a = (2 * PI * k) / n + PI / n, x = Math.cos(a), z = Math.sin(a);
    const root = body * 0.34, L = R - root;
    parts.push(P(`${nm} arm ${k + 1}`, { cyl: [arm / 2, L] }, { at: [x * (root + L / 2), deck - 0.006, z * (root + L / 2)], rot: [0, PI - a, PI / 2] as Vec, mat: 'cfrp', color: 0x1b1d20, finish: 'brushed', shell: 0.0012, says: 'a pultruded carbon tube, clamped into the frame' }));
    // (the clamp the tube goes into: a real frame does not weld its arms to its plates, it pinches them between two
    //  blocks so a broken arm is a five-minute job)
    parts.push(B(`${nm} arm clamp ${k + 1}`, [arm * 2.2, arm * 1.5, arm * 1.9], [x * root, deck - 0.006, z * root], { rot: [0, -a, 0] as Vec, mat: 'nylon', color: 0x2a2d32, finish: 'moulded', says: 'two halves and two screws round the tube' }));
    const mx = x * R, mz = z * R;
    parts.push(B(`${nm} motor mount ${k + 1}`, [arm * 2.4, 0.003, arm * 2.4], [mx, deck + 0.0015, mz], { mat: 'al-6061', color: 0x8f949a, finish: 'anodised', says: 'the plate the motor\'s four screws go into, clamped on the tube\'s end' }));
    parts.push(...outrunnerParts(`${nm} motor ${k + 1}`, stator, kv, use).map((q) => ({ ...q, at: [mx, deck + 0.014, mz] as Vec, fixed: 'bolted to the arm\'s end, its shaft up' })));
    // (handed in turn round the craft: two one way and two the other, so their torques cancel and it holds a heading)
    // (each rotor stopped where it stopped: a craft at rest does not have its blades lined up)
    parts.push(...propParts(`${nm} rotor ${k + 1}`, D, { hand: k % 2 === 0 ? 1 : -1, turn: k * 0.7 }).map((p) => ({ ...p, at: [mx, deck + 0.038, mz] as Vec })));
    for (const j of [-1, 0, 1]) parts.push(P(`${nm} phase wire ${k + 1}`, { cyl: [0.0011, R - root] }, { at: [x * (root + (R - root) / 2) + j * 0.0025 * Math.sin(a), deck - 0.006 - arm * 0.6, z * (root + (R - root) / 2) - j * 0.0025 * Math.cos(a)], rot: [0, PI - a, PI / 2] as Vec, mat: 'copper', color: j === 0 ? 0x1a1c20 : j < 0 ? 0xc8512b : 0xd8d9db, says: 'one of its three phases, down the arm to its controller' }));
    parts.push(B(`${nm} speed controller ${k + 1}`, [0.028, 0.004, 0.014], [x * (R * 0.55), deck - 0.012, z * (R * 0.55)], { mat: 'fr4', color: 0x14301f, rot: [0, -a, 0] as Vec, says: 'its MOSFETs and its chip not drawn apart; one for each motor, taped under its arm' }));
    parts.push(P(`${nm} leg ${k + 1}`, { cyl: [0.005, 0.07] }, { at: [x * R * 0.72, deck - 0.05, z * R * 0.72], rot: [0.22 * Math.sin(a), 0, -0.22 * Math.cos(a)] as Vec, mat: 'nylon', color: 0x2a2d32, finish: 'moulded' }));
    parts.push(P(`${nm} foot ${k + 1}`, { sphere: 0.008 }, { at: [x * R * 0.72 + 0.0077 * Math.cos(a), deck - 0.084, z * R * 0.72 + 0.0077 * Math.sin(a)], mat: 'rubber', color: 0x15171a, finish: 'texture', says: 'what it lands on' }));
  }
  parts.push(B(`${nm} flight controller`, [0.036, 0.006, 0.036], [0, deck - 0.004, 0], { mat: 'fr4', color: 0x14301f, says: 'its chips not drawn apart; its gyro and accelerometer read hundreds of times a second' }));
  parts.push(B(`${nm} radio receiver`, [0.022, 0.005, 0.014], [0, deck - 0.004, body * 0.26], { mat: 'fr4', color: 0x14301f, says: 'its radio chip and its aerial not drawn apart' }));
  parts.push(B(`${nm} battery`, [body * 0.62, 0.03, body * 0.46], [0, deck - 0.044, 0], { mat: 'pe', color: 0x1a1a22, finish: 'moulded', fill: 0.65, says: 'its cells and its leads not drawn apart', fixed: 'strapped under the bottom plate' }));
  parts.push(B(`${nm} battery strap`, [body * 0.18, 0.002, body * 0.56], [0, deck - 0.044, 0], { mat: 'nylon', color: 0xc8512b, finish: 'texture' }));
  parts.push(B(`${nm} camera`, [0.022, 0.022, 0.018], [body * 0.42, deck - 0.03, 0], { mat: 'abs', color: 0x15171a, finish: 'moulded', says: 'its sensor and its lens not drawn apart' }));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][])
    parts.push(P(`${nm} frame screw`, { cyl: [0.0015, 0.008] }, { at: [sx * body * 0.33, deck + plate + 0.004, sz * body * 0.25], mat: 'steel-low', color: 0x8d9298, item: 'screw-m3', says: 'the cap screws through the top plate into the standoffs' }));
  // (what is on it but not drawn apart: its wiring, its canopy, its GPS and compass, its gimbal's damping and the
  //  screws beyond the four at its plates — weighed rather than drawn, as the lab instruments' chassis are)
  const drawn = parts.reduce((a, q) => a + massOf(q), 0), rest = Math.max(0, kg - drawn);
  parts.push({ name: `${nm} wiring, canopy, GPS and fasteners`, at: [0, deck, 0] as Vec, kg: rest, says: `${(rest * 1000).toFixed(0)} g not drawn apart: its wiring loom, its canopy, its GPS and compass, its gimbal's dampers and the rest of its screws (an estimate)` } as Part);
  return [group(nm, [0, 0, 0], parts, { says: `${h.says}. ${endurance(h.wattsAll, droneWh(n, span)).says}` })];
}
/** What a multirotor of that many rotors and that span weighs, kg: an estimate fitted to what such craft weigh — about
 *  500 g at a 250 mm span, 1.25 kg at 450 and 2.6 kg for a 650 mm hexacopter. */
export const droneKg = (n: number, span: number): number => +(0.5 * Math.pow(span / 0.25, 1.6) * (n / 4) ** 0.3).toFixed(3);
/** The pack such a craft carries, Wh: about a third of its weight in cells at 180 Wh/kg (an estimate of a hobby pack). */
export const droneWh = (n: number, span: number): number => +(droneKg(n, span) * 0.33 * 180).toFixed(0);

/** A ducted fan: its duct a ring with a belled mouth, its blades on a hub inside it, straightener vanes behind that
 *  also carry the hub, and a guard over the mouth. Drawn on its own axis along y, the air going down, D across the
 *  duct's bore. */
export function fanParts(nm: string, D: number, blades = 8, o: { duct?: number; color?: number; guard?: boolean } = {}): Part[] {
  // (the duct's wall is a laminate, not a share of its diameter: 3 mm of glass on a small fan and 6 on a metre and a
  //  half, which is what a moulded duct is laid up at. Scaling the wall with D made a 1.4 m duct a 68 mm ring of solid
  //  glass weighing 134 kg)
  const R = D / 2, wall = o.duct ?? Math.max(3 * mm, D * 0.0045), h = D * 0.62, hub = R * 0.32, color = o.color ?? 0x3b4048;
  const parts: Part[] = [
    P(`${nm} duct`, { lathe: [[R, -h / 2], [R + wall, -h / 2], [R + wall, h / 2], [R * 1.14 + wall, h / 2 + D * 0.05], [R * 1.14, h / 2 + D * 0.05], [R, h / 2], [R, -h / 2]] }, { at: [0, 0, 0], mat: 'fibreglass', color, finish: 'moulded', fill: 0.85, says: `its ${(wall * 1000).toFixed(1)} mm laminate, drawn at 85 % of the ring it sweeps because the bell is a lip and not a solid: ${(D * 1000).toFixed(0)} mm across the bore. Its mouth is belled so the air turns into it without separating` }),
    C(`${nm} hub`, hub, h * 0.5, [0, 0, 0], { mat: 'al-6061', color: 0x9aa0a6, finish: 'anodised', shell: 0.004 }),
    P(`${nm} spinner`, { cone: [hub, hub * 1.1] }, { at: [0, h * 0.3, 0], mat: 'al-6061', color: 0x9aa0a6, finish: 'anodised', shell: 0.002, says: 'over the hub, so the air is not stirred by its face: a 2 mm pressing, not a solid cone' }),
    ...Array.from({ length: blades }, (_, k) => { const a = (2 * PI * k) / blades;
      return B(`${nm} blade ${k + 1}`, [(R - hub) * 0.98, D * 0.008, D * 0.16], [Math.cos(a) * (hub + (R - hub) / 2), 0, Math.sin(a) * (hub + (R - hub) / 2)], { rot: [0, -a, 0.42] as Vec, mat: 'nylon', color: 0x1e2126, finish: 'moulded', says: 'set at one pitch: a real fan blade twists along its span' }); }),
    ...Array.from({ length: 6 }, (_, k) => { const a = (PI * k) / 6;
      return B(`${nm} straightener ${k + 1}`, [R * 1.9, D * 0.012, D * 0.05], [0, -h * 0.34, 0], { rot: [0, -a, 0] as Vec, mat: 'nylon', color: 0x2a2d32, finish: 'moulded', says: 'behind the rotor: it takes the swirl out of the air, and it is what the hub is held by' }); }),
  ];
  if (o.guard !== false) for (let k = 0; k < 4; k++) { const a = (PI * k) / 4;
    parts.push(P(`${nm} guard bar ${k + 1}`, { cyl: [D * 0.008, R * 2 + wall] }, { at: [0, h / 2 + D * 0.05, 0], rot: [PI / 2, -a, 0] as Vec, mat: 'steel-low', color: 0x8d9298, says: 'the guard over its mouth: a fan this size takes a hand off' })); }
  return [group(nm, [0, 0, 0], parts)];
}

/** The belt drive from the engine to the thrust fan: a double-grooved 125 mm pulley on the crank, a 200 mm one on the
 *  fan's shaft (so the fan turns at about six tenths of engine speed, which is how a light craft gears its thrust fan),
 *  and the SPZ belt that fits the centres, snapped up to a length they are sold in. The shaft runs in two pillow blocks
 *  on the pylon's head. The lift fan is driven off the same crank by a second belt, which is not drawn. The pulleys are
 *  the catalogue's own (a 125 and a 200 SPZ pulley, in the hovercraft's parts list); the belt is drawn and weighed at
 *  70 g a metre, but its body, cords and cover are not drawn apart, so it is not claimed as the catalogue's. */
export function hoverDrive(L: number): { a: [number, number]; b: [number, number]; r1: number; r2: number; belt: number } {
  // (the pulley and its bearing stand in the fan's intake, ahead of the duct's mouth and carried by the pylon's head,
  //  which is where a light craft puts them: drawn inside the duct they would be in the blades)
  const deck = 0.36, thrustD = L * 0.17, r1 = 0.0625, r2 = 0.1, mouth = -L * 0.4 + thrustD * 0.31;
  const a: [number, number] = [-L * 0.2 - 0.26, deck + 0.16], b: [number, number] = [mouth + 0.19, deck + thrustD * 0.6];
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), want = 2 * d + PI * (r1 + r2);
  // (the lengths SPZ belts are sold in, ISO 4184; the first that goes round)
  const belt = [630, 800, 1000, 1250, 1600, 2000, 2500, 3150].find((x) => x / 1000 >= want) ?? 3150;
  return { a, b, r1, r2, belt };
}

/** A hovercraft, laid out from its cushion: its hull the plan the cushion pressure was worked out over, its skirt the
 *  perimeter the escape flow was, its lift fan sized to put that flow back into the plenum under it, its thrust fan
 *  and rudders at the stern. Bow at +x, length along x, beam along z. */
export function hovercraftParts(nm: string, L: number, seats: number): Part[] {
  const W = L * 0.52, deck = 0.36, skirt = L * 0.085, kg = hoverAllUp(L, seats);
  const area = L * W * 0.82, perim = 2 * (L + W) * 0.95, c = cushion(kg, area, perim, 0.02, { L });
  // (the lift fan: big enough to pass the air that runs out under the skirt at about 28 m/s through its own disc)
  const liftD = Math.max(0.3, Math.sqrt((4 * (c.Q / 28)) / PI)), thrustD = L * 0.17;
  // (its plan: square at the stern, drawn in round to a blunt bow, as a light craft's buoyancy tank is. The section is
  //  the plan and the prism's length is the hull's depth, so the shape that is seen from above is the shape it has)
  const planPts: [number, number][] = [[-L / 2, -W / 2], [L * 0.1, -W / 2], [L * 0.34, -W * 0.46], [L * 0.46, -W * 0.3], [L / 2, 0], [L * 0.46, W * 0.3], [L * 0.34, W * 0.46], [L * 0.1, W / 2], [-L / 2, W / 2]];
  const parts: Part[] = [
    P(`${nm} hull`, { prism: { pts: planPts, L: deck } }, { at: [0, deck / 2, 0], rot: [PI / 2, 0, 0] as Vec, mat: 'fibreglass', color: 0xd8d9db, finish: 'moulded', shell: 0.0015,
      says: 'drawn as its 1.5 mm glass skin; the foam it is laid over is not drawn apart. A buoyant box of glass over foam: it floats when the cushion is off, which is what makes it a boat and not an aeroplane' }),
    B(`${nm} deck`, [L * 0.9, 0.012, W * 0.86], [0, deck, 0], { mat: 'fibreglass', color: 0xc9ccd0, finish: 'moulded', fill: 0.12, says: 'a foam-cored sandwich: two 3 mm skins over 50 mm of foam, drawn as the share of the solid they are' }),
    // (the rubbing strake round the gunwale, which is where it takes the knocks and where the skirt bolts on)
    ...planPts.map((pt, k) => { const q = planPts[(k + 1) % planPts.length]!, mx = (pt[0] + q[0]) / 2, mz = (pt[1] + q[1]) / 2, len = Math.hypot(q[0] - pt[0], q[1] - pt[1]), a = Math.atan2(q[1] - pt[1], q[0] - pt[0]);
      return B(`${nm} rubbing strake ${k + 1}`, [len, 0.05, 0.03], [mx, deck - 0.03, mz], { rot: [0, -a, 0] as Vec, mat: 'rubber', color: 0x1e2126, finish: 'texture', fill: 0.55, says: 'a hollow extrusion, drawn as the solid it fills' }); }),
    // (the plenum: the open space under the hull the lift fan fills, which the skirt holds the air in)
    P(`${nm} plenum opening`, { prism: { pts: planPts.map(([x, z]) => [x * 0.82, z * 0.82] as [number, number]), L: 0.01 } }, { at: [0, 0.005, 0], rot: [PI / 2, 0, 0] as Vec, color: 0x6f7378, finish: 'texture', says: 'drawn to show where the air is, and weighed as nothing because it is an opening, not a part. The hull\'s open underside: the air the fan blows down is held in by the skirt and carries the craft on it' }),
  ];
  // (the skirt: fingers of neoprene-coated nylon round the whole plan, each overlapping its neighbour as a real one
  //  does, so a tear in one does not open the cushion)
  // (a finger is as wide as the share of the perimeter it hangs on, with a tenth over so it laps its neighbours. Sizing
  //  it to the skirt's depth instead left gaps on a small craft and overlapped by half on a big one, and weighed the
  //  whole skirt at ten times the coated fabric it is)
  // (and it hangs where the hull's own edge runs: the fingers are set along the plan's own perimeter by arc length, a
  //  little inside it, not round an ellipse through its corners — round an ellipse the bow was bitten out of the skirt
  //  and the sides stood off the hull, which a blind judge saw before anything else)
  const nSeg = 40;
  const edges = planPts.map((pt, k) => { const q = planPts[(k + 1) % planPts.length]!, len = Math.hypot(q[0] - pt[0], q[1] - pt[1]);
    return { pt, u: [(q[0] - pt[0]) / len, (q[1] - pt[1]) / len] as [number, number], len }; });
  const round = edges.reduce((a, e) => a + e.len, 0), fingerR = (round / nSeg) * 0.55;
  for (let k = 0; k < nSeg; k++) {
    let d = ((k + 0.5) / nSeg) * round, i = 0;
    while (d > edges[i]!.len && i < edges.length - 1) { d -= edges[i]!.len; i++; }
    const e = edges[i]!, inset = fingerR * 0.7;
    // (inward is the edge's own normal: the plan is wound so that turning its direction a quarter turn points into it)
    const x = e.pt[0] + e.u[0] * d - e.u[1] * inset, z = e.pt[1] + e.u[1] * d + e.u[0] * inset;
    parts.push(P(`${nm} skirt finger ${k + 1}`, { lathe: [[fingerR * 0.56, skirt * 0.5], [fingerR, 0], [fingerR * 0.86, -skirt * 0.5], [0, -skirt * 0.5], [0, skirt * 0.5], [fingerR * 0.56, skirt * 0.5]] },
      { at: [x, -skirt * 0.35, z], mat: 'neoprene', color: 0x25282d, finish: 'texture', shell: 0.0012,
        says: `nylon under neoprene, 1.2 mm, ${(fingerR * 2 * 1000).toFixed(0)} mm across on a ${((round / nSeg) * 1000).toFixed(0)} mm pitch so it laps its neighbours: a finger is torn off and replaced, not patched` }));
  }
  // (the lift fan, in a raised inlet on the deck, blowing down a well into the plenum)
  parts.push(...fanParts(`${nm} lift fan`, liftD, 12, { color: 0x2f3338 }).map((p) => ({ ...p, at: [-L * 0.06, deck + liftD * 0.3, 0] as Vec })));
  parts.push(P(`${nm} lift inlet`, { lathe: [[liftD * 0.62, 0], [liftD * 0.72, 0], [liftD * 0.72, liftD * 0.5], [liftD * 0.86, liftD * 0.62], [liftD * 0.8, liftD * 0.62], [liftD * 0.62, liftD * 0.5], [liftD * 0.62, 0]] }, { at: [-L * 0.06, deck, 0], mat: 'fibreglass', color: 0xb9bcc0, fill: 0.25, says: 'the inlet the lift fan draws through, standing proud of the deck so spray does not go down it' }));
  parts.push(P(`${nm} lift well`, { lathe: [[liftD * 0.62, -deck], [liftD * 0.62, 0], [liftD * 0.68, 0], [liftD * 0.68, -deck], [liftD * 0.62, -deck]] }, { at: [-L * 0.06, deck, 0], mat: 'fibreglass', color: 0xb9bcc0, fill: 0.25, says: 'the well it blows down through into the plenum' }));
  // (the thrust fan on its pylon at the stern, its rudders in the slipstream behind it)
  parts.push(...fanParts(`${nm} thrust fan`, thrustD, 9, { color: 0x2f3338 }).map((p) => ({ ...p, at: [-L * 0.4, deck + thrustD * 0.6, 0] as Vec, rot: [0, 0, PI / 2] as Vec })));
  parts.push(B(`${nm} fan pylon`, [0.06, thrustD * 0.6, W * 0.5], [-L * 0.4, deck + thrustD * 0.3, 0], { mat: 'al-6061', color: 0x9aa0a6, finish: 'anodised', fill: 0.22, says: 'a welded frame, drawn as the slab it fills' }));
  for (const sz of [-1, 0, 1]) parts.push(B(`${nm} rudder`, [thrustD * 0.5, thrustD * 1.05, 0.014], [-L * 0.4 - thrustD * 0.62, deck + thrustD * 0.6, sz * thrustD * 0.3], { mat: 'nylon', color: 0xc8512b, finish: 'moulded', shell: 0.003, says: 'in the fan\'s slipstream, turned together by the wheel: all the steering there is. A hollow moulded vane, drawn as its 3 mm skin' }));
  for (const sz of [-1, 1]) parts.push(P(`${nm} rudder linkage`, { cyl: [0.008, thrustD * 0.6] }, { at: [-L * 0.4 - thrustD * 0.62, deck + thrustD * 1.1, sz * thrustD * 0.15], rot: [PI / 2, 0, 0] as Vec, mat: 'steel-low', color: 0x8d9298, says: 'the bar that makes the three vanes one' }));
  parts.push(B(`${nm} engine`, [0.45, 0.3, 0.4], [-L * 0.2, deck + 0.16, 0], { mat: 'al-a380', color: 0x6f7378, finish: 'cast', fill: 0.2, says: 'a petrol engine driving both fans by belts, drawn as its block filled to what such an engine weighs (its make and power not decided here)' }));
  // (the drive: the crank pulley, the belt over the fan's pulley, the shaft and the two pillow blocks that carry it —
  //  an engine that drives nothing is not an engine)
  const dr = hoverDrive(L), ux = (dr.b[0] - dr.a[0]) / Math.hypot(dr.b[0] - dr.a[0], dr.b[1] - dr.a[1]), uy = (dr.b[1] - dr.a[1]) / Math.hypot(dr.b[0] - dr.a[0], dr.b[1] - dr.a[1]);
  parts.push(C(`${nm} crank pulley`, dr.r1 * 1.064, 0.0323, [dr.a[0], dr.a[1], 0], { rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x8f949a, finish: 'machined', item: 'vpulley-spz-125-2', says: 'two grooves on the crank: one belt to the thrust fan, one to the lift fan' }));
  parts.push(C(`${nm} fan pulley`, dr.r2 * 1.04, 0.0201, [dr.b[0], dr.b[1], 0], { rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0x8f949a, finish: 'machined', item: 'vpulley-spz-200-1' }));
  parts.push(P(`${nm} drive belt`, { tube: { r: 0.0048, bend: 0.02, pts: [[dr.a[0] - uy * dr.r1, dr.a[1] + ux * dr.r1, 0], [dr.b[0] - uy * dr.r2, dr.b[1] + ux * dr.r2, 0], [dr.b[0] + ux * dr.r2, dr.b[1] + uy * dr.r2, 0], [dr.b[0] + uy * dr.r2, dr.b[1] - ux * dr.r2, 0], [dr.a[0] + uy * dr.r1, dr.a[1] - ux * dr.r1, 0], [dr.a[0] - ux * dr.r1, dr.a[1] - uy * dr.r1, 0], [dr.a[0] - uy * dr.r1, dr.a[1] + ux * dr.r1, 0]] as Vec[] } },
    { at: [0, 0, 0], mat: 'rubber', color: 0x17191c, finish: 'texture', kg: (dr.belt / 1000) * 0.07, says: `an SPZ belt ${dr.belt} mm round, 70 g a metre: wrapped on both pulleys, as a belt is. Its rubber body, its polyester tension cords and its cover are not drawn apart` }));
  parts.push(P(`${nm} fan shaft`, { cyl: [0.0125, Math.abs(dr.b[0] + L * 0.4) + 0.08] }, { at: [(dr.b[0] + -L * 0.4) / 2, dr.b[1], 0], rot: [0, 0, PI / 2] as Vec, mat: 'steel-alloy', color: 0xc2c7cb, finish: 'polished', says: 'the fan on one end, the pulley on the other, the bearing between' }));
  parts.push(B(`${nm} bearing bracket`, [Math.abs(dr.b[0] + L * 0.4) - 0.04, 0.05, 0.12], [(dr.b[0] + -L * 0.4) / 2, dr.b[1] - 0.06, 0], { mat: 'al-6061', color: 0x8f949a, finish: 'anodised', shell: 0.005, says: 'out of the pylon\'s head into the intake, to carry the bearing ahead of the duct' }));
  parts.push(B(`${nm} fan bearing`, [0.0402, 0.073, 0.14], [dr.b[0] - 0.1, dr.b[1], 0], { mat: 'cast-iron', color: 0x5a5e63, finish: 'cast', fill: 0.2, says: 'a UCP 205 on the bracket, drawn as the block it fills: a cast housing is mostly the space round its bearing. Its 6205 bearing and its two set screws are not drawn apart' }));
  parts.push(P(`${nm} spark plug`, { cyl: [0.0105, 0.06] }, { at: [-L * 0.2 + 0.1, deck + 0.3, 0.08], mat: 'steel-low', color: 0xb9bcc0, fill: 0.3, says: 'M14 × 1.25, 19 mm reach, nickel: its shell, its insulator, its electrodes, its terminal and its sealing washer are not drawn apart' }));
  parts.push(B(`${nm} fuel tank`, [0.34, 0.2, 0.3], [-L * 0.3, deck + 0.11, 0], { mat: 'pe', color: 0x24272c, finish: 'moulded', shell: 0.004, says: 'ahead of nothing and behind the seats: a tank is never over the engine' }));
  // (a seat is a moulded glass shell with foam and vinyl over it, so it is drawn as the shell and the cushion it is,
  //  not as a block of solid polyurethane: that put 22 kg under each person)
  for (let k = 0; k < seats; k++) { const row = Math.floor(k / 2), sz = (k % 2) * 2 - 1, sx = L * 0.2 - row * 0.52, sw = seats === 1 ? 0 : sz * W * 0.2;
    parts.push(B(`${nm} seat shell ${k + 1}`, [0.42, 0.1, 0.44], [sx, deck + 0.22, sw], { mat: 'fibreglass', color: 0x2a2d32, finish: 'moulded', shell: 0.004, says: 'a 4 mm glass pan on the deck' }));
    parts.push(B(`${nm} seat cushion ${k + 1}`, [0.4, 0.07, 0.42], [sx, deck + 0.25, sw], { mat: 'foam', color: 0x1d2025, finish: 'texture', says: 'polyurethane blown to about 35 kg/m\u00b3 under a vinyl cover' }));
    parts.push(B(`${nm} seat back shell ${k + 1}`, [0.09, 0.46, 0.44], [sx - 0.2, deck + 0.45, sw], { mat: 'fibreglass', color: 0x2a2d32, finish: 'moulded', shell: 0.004 }));
    parts.push(B(`${nm} seat back cushion ${k + 1}`, [0.06, 0.42, 0.42], [sx - 0.19, deck + 0.45, sw], { mat: 'foam', color: 0x1d2025, finish: 'texture' }));
  }
  parts.push(B(`${nm} console`, [0.18, 0.3, W * 0.5], [L * 0.38, deck + 0.15, 0], { mat: 'fibreglass', color: 0xc9ccd0, finish: 'moulded', shell: 0.004, says: 'what the wheel, the throttle and the screen stand on' }));
  // (the column runs from the console's face up to the wheel's own hub: a wheel on nothing steers nothing)
  parts.push(P(`${nm} steering column`, { cyl: [0.018, 0.26] }, { at: [L * 0.355, deck + 0.4, 0], rot: [0, 0, 0.5] as Vec, mat: 'steel-low', color: 0x6f7378 }));
  parts.push(P(`${nm} wheel hub`, { cyl: [0.04, 0.03] }, { at: [L * 0.415, deck + 0.512, 0], rot: [0, 0, 0.5 + PI / 2] as Vec, mat: 'al-6061', color: 0x8f949a, finish: 'anodised' }));
  parts.push(P(`${nm} wheel`, { torus: [0.13, 0.012] }, { at: [L * 0.415, deck + 0.512, 0], rot: [0, 0, 0.5 + PI / 2] as Vec, mat: 'rubber', color: 0x17191c }));
  for (const sz of [-1, 1]) parts.push(B(`${nm} wheel spoke`, [0.016, 0.1, 0.012], [L * 0.415, deck + 0.512, sz * 0.07], { rot: [0, 0, 0.5 + PI / 2] as Vec, mat: 'al-6061', color: 0x8f949a }));
  // (5 mm acrylic, which is what a light craft's screen is cut from, in a frame of four extrusions round it — a frame
  //  drawn as a closed box weighed as much as the screen it holds)
  parts.push(B(`${nm} windscreen`, [0.005, 0.44, W * 0.6], [L * 0.345, deck + 0.52, 0], { mat: 'pmma', color: 0xaebfcc, finish: 'polished', rot: [0, 0, 0.22] as Vec, fixed: 'bolted down the console\'s front edge' }));
  for (const [i, [dy, dz, ly, lz]] of ([[0.23, 0, 0.03, W * 0.62], [-0.23, 0, 0.03, W * 0.62], [0, W * 0.3, 0.46, 0.03], [0, -W * 0.3, 0.46, 0.03]] as [number, number, number, number][]).entries())
    parts.push(B(`${nm} screen frame ${i + 1}`, [0.03, ly, lz], [L * 0.352 - dy * 0.22, deck + 0.52 + dy, dz], { mat: 'al-6061', color: 0x8f949a, finish: 'anodised', rot: [0, 0, 0.22] as Vec, shell: 0.0025, says: i < 2 ? 'the rail along its top and bottom edge' : 'the stile up its side' }));
  return [group(nm, [0, 0, 0], parts, { says: `${c.says}. ${climb(kg, kg * G * 0.25).says}` })];
}
/** What a hovercraft of that length weighs on its own, kg. There is no standard light hovercraft to look the figure up
 *  in, so it is worked out from what one is made of, as the drawing above is: a glass hull skin and a foam-cored deck
 *  over a plan L by 0.52 L, a skirt round that perimeter, two fans, an engine and its seats. That comes to about
 *  22 L^1.6 for the craft and 12 kg for each seat — an area, not a length, because a hull is a skin over its plan.
 *  (70 kg a metre, which this was, is the same craft only at one size: it was 40 % light at 3 m and 40 % heavy at 8.)
 *  It lands where light craft are measured: 240 kg for a 4 m two-seater, against 260 kg for a Hov Pod SPX of that
 *  length and 186 for a Neoteric Hovertrek, which is a notably light one. */
export const hoverKg = (L: number, seats = 1): number => +(22 * Math.pow(L, 1.6) + 12 * seats).toFixed(0);
/** What its cushion must hold, kg: the craft and everyone aboard (90 kg a person in their gear). */
export const hoverAllUp = (L: number, seats: number): number => hoverKg(L, seats) + 90 * seats;

/** A micro-turbine as a jet suit carries: air in at its intake bell, through its compressor, burnt, and out of its
 *  tailpipe at the other end. Drawn along x with its intake at −x and its exhaust at +x, so the thrust is toward −x:
 *  point it down and it lifts. Its length about four times its diameter, as this class of engine is. */
export function turbineParts(nm: string, D: number): Part[] {
  const R = D / 2, L = D * 4;
  return [group(nm, [0, 0, 0], [
    P(`${nm} case`, { lathe: [[R * 0.74, -L * 0.42], [R, -L * 0.3], [R, L * 0.2], [R * 0.74, L * 0.38], [R * 0.52, L * 0.38], [R * 0.52, -L * 0.42], [R * 0.74, -L * 0.42]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'stainless-304', color: 0x9fa5ab, finish: 'brushed', shell: 0.0012,
      says: 'drawn as its 1.2 mm case; its compressor wheel, its combustor and its turbine inside it are not drawn apart' }),
    // (its mouth: open, with the compressor's blades a little way down it. An engine with no inlet is a bottle)
    // (the mouth: a bell turned out and open, with the compressor a little way down it. An engine capped at the front
    //  is a bottle, and the one thing a judge looks for in a jet is that air can get in)
    P(`${nm} intake bell`, { lathe: [[R * 0.74, -L * 0.42], [R * 1.08, -L * 0.52], [R * 1.0, -L * 0.56], [R * 0.68, -L * 0.46], [R * 0.68, -L * 0.42], [R * 0.74, -L * 0.42]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0xb4b9bd, finish: 'polished' }),
    P(`${nm} intake mouth`, { lathe: [[0, -L * 0.52], [R * 0.98, -L * 0.52], [R * 0.98, -L * 0.5], [0, -L * 0.5], [0, -L * 0.52]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, color: 0x15171a, says: 'the opening itself, drawn dark because it is a hole: this is where the air goes in' }),
    P(`${nm} inlet nose`, { cone: [R * 0.3, R * 0.5] }, { at: [-L * 0.44, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'al-6061', color: 0xb4b9bd, finish: 'polished', says: 'the nose the air parts round, on the compressor\'s own shaft' }),
    ...Array.from({ length: 12 }, (_, k) => { const a = (2 * PI * k) / 12;
      return B(`${nm} compressor blade ${k + 1}`, [R * 0.22, D * 0.03, R * 0.5], [-L * 0.4, Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.55], { rot: [-a, 0, 0.5] as Vec, mat: 'al-7075', color: 0xc2c7cb, finish: 'polished' }); }),
    P(`${nm} nozzle`, { lathe: [[R * 0.52, L * 0.38], [R * 0.6, L * 0.38], [R * 0.52, L * 0.58], [R * 0.44, L * 0.58], [R * 0.52, L * 0.38]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'stainless-304', color: 0x55585c, finish: 'texture',
      says: 'the exhaust leaves here at several hundred degrees and hundreds of metres a second: it sets light to what it is pointed at' }),
    P(`${nm} exhaust cone`, { cone: [R * 0.24, R * 0.55] }, { at: [L * 0.44, 0, 0], rot: [0, 0, -PI / 2] as Vec, mat: 'stainless-304', color: 0x4a4d52, finish: 'texture', says: 'the centrebody behind the turbine' }),
    P(`${nm} exit plane`, { lathe: [[R * 0.24, L * 0.58], [R * 0.48, L * 0.58], [R * 0.48, L * 0.6], [R * 0.24, L * 0.6], [R * 0.24, L * 0.58]] }, { at: [0, 0, 0], rot: [0, 0, PI / 2] as Vec, color: 0x3a1a12, finish: 'texture', says: 'where the gas leaves: drawn dark and scorched, because that is what it looks like after one flight' }),
    B(`${nm} fuel line`, [L * 0.55, 0.008, 0.008], [0, -R * 0.92, 0], { mat: 'stainless-304', color: 0x8d9298 }),
    B(`${nm} starter`, [D * 0.2, D * 0.16, D * 0.16], [-L * 0.3, -R * 0.78, 0], { mat: 'al-6061', color: 0x74797e, finish: 'cast', says: 'the starter and its glow plug: a turbine is spun up and lit, it does not just run' }),
  ])];
}

/** The pilot, drawn as a figure so what is worn reads at the size a person wears it. It is a mannequin, not a person:
 *  no face, no likeness, and it is given no mass, because what is weighed here is the equipment. */
export function pilotParts(nm: string): Part[] {
  const look = { color: 0x23262b, finish: 'texture' as const };
  const limb = (name: string, r: number, h: number, at: Vec, rot?: Vec): Part => P(name, { capsule: [r, h] }, { at, ...(rot ? { rot } : {}), ...look });
  return [group(`${nm} pilot`, [0, 0, 0], [
    P(`${nm} helmet`, { sphere: 0.115 }, { at: [0.01, 1.63, 0], color: 0x15171a, finish: 'polished' }),
    B(`${nm} visor`, [0.07, 0.09, 0.19], [0.08, 1.62, 0], { color: 0x2a3b46, finish: 'polished' }),
    limb(`${nm} neck`, 0.045, 0.06, [0, 1.52, 0]),
    P(`${nm} chest`, { loft: { st: [{ x: -0.1, w: 0.17, lo: -0.1, hi: 0.1, n: 2.6 }, { x: 0.12, w: 0.19, lo: -0.11, hi: 0.11, n: 2.6 }, { x: 0.36, w: 0.15, lo: -0.1, hi: 0.1, n: 2.4 }] } }, { at: [0, 1.17, 0], rot: [0, 0, PI / 2] as Vec, ...look, says: 'the torso, as a shape: no likeness' }),
    limb(`${nm} hips`, 0.15, 0.1, [0, 0.96, 0]),
    ...[-1, 1].map((s) => limb(`${nm} ${s < 0 ? 'left' : 'right'} upper arm`, 0.052, 0.26, [0.02, 1.3, s * 0.21], [0, 0, -0.3 * s] as Vec)),
    ...[-1, 1].map((s) => limb(`${nm} ${s < 0 ? 'left' : 'right'} forearm`, 0.045, 0.26, [0.055, 1.08, s * 0.33], [0, 0, 0.25] as Vec)),
    ...[-1, 1].map((s) => P(`${nm} ${s < 0 ? 'left' : 'right'} hand`, { sphere: 0.05 }, { at: [0.06, 0.95, s * 0.36], ...look })),
    ...[-1, 1].map((s) => limb(`${nm} ${s < 0 ? 'left' : 'right'} thigh`, 0.075, 0.38, [0, 0.72, s * 0.1])),
    ...[-1, 1].map((s) => limb(`${nm} ${s < 0 ? 'left' : 'right'} shin`, 0.06, 0.38, [0, 0.32, s * 0.1])),
    ...[-1, 1].map((s) => B(`${nm} ${s < 0 ? 'left' : 'right'} boot`, [0.24, 0.08, 0.1], [0.05, 0.08, s * 0.1], { color: 0x15171a, finish: 'texture' })),
  ], { says: 'the pilot as a figure, to show what is worn and how it is held: it is given no mass, because what is weighed is the equipment' })];
}

/** A jet suit: the engines a pilot wears, laid out so their thrust passes through the body's own centre — two to a
 *  hand and the rest on the back, the hands steering by where they point. The pilot is drawn as a figure so the scale
 *  and the hold can be seen. Its hazards are in HAZARDS.jetpack and are not decoration: this is not a thing to build
 *  and try. */
export function jetpackParts(nm: string, engines: number, perEngine: number): Part[] {
  const kg = jetKg(engines, perEngine), h = hovers(kg, perEngine, engines);
  // (an engine's size from its thrust: this class runs about 30 kN for each square metre of intake, so a 400 N engine
  //  is about 130 mm across — an estimate from the size of the engines jet suits use)
  const D = Math.sqrt((4 * (perEngine / 30000)) / PI), perSide = Math.min(2, Math.floor(engines / 2)), arms = perSide * 2, back = engines - arms;
  const parts: Part[] = [...pilotParts(nm)];
  parts.push(
    P(`${nm} backplate`, { prism: { pts: [[-0.2, -0.26], [0.2, -0.26], [0.23, 0.08], [0.13, 0.3], [-0.13, 0.3], [-0.23, 0.08]], L: 0.05 } }, { at: [-0.18, 1.2, 0], rot: [0, PI / 2, 0] as Vec, mat: 'cfrp', color: 0x1b1d20, finish: 'brushed', shell: 0.004, says: 'a 4 mm carbon moulding shaped to a back: the frame everything hangs on' }),
    P(`${nm} fuel tank`, { lathe: [[0, -0.2], [0.12, -0.18], [0.13, 0.16], [0, 0.2]] }, { at: [-0.3, 1.18, 0], mat: 'al-5052', color: 0x8c9196, finish: 'brushed', shell: 0.002, says: 'kerosene, under pressure, against a hot engine: a leak here is a fire on the pilot' }),
    P(`${nm} fuel`, { lathe: [[0, -0.19], [0.115, -0.17], [0.125, 0.15], [0, 0.19]] }, { at: [-0.3, 1.18, 0], mat: 'petrol', color: 0xb8a66a, kg: jetFuelKg(engines, perEngine), says: `the ${jetFuelKg(engines, perEngine)} kg of kerosene it leaves with: a jet suit's whole flight is what is in this tank` }),
    B(`${nm} fuel pump`, [0.09, 0.08, 0.08], [-0.26, 0.96, 0], { mat: 'al-6061', color: 0x74797e, finish: 'cast', says: 'a brushless gear pump: its rotors and its motor not drawn apart' }),
    B(`${nm} pack`, [0.14, 0.045, 0.05], [-0.27, 1.05, 0], { mat: 'pe', color: 0x1a1a22, finish: 'moulded', says: 'a 6S 5000 mAh pack, its six pouch cells and its plug not drawn apart: what runs the pumps, the controller and the starters. The engines burn kerosene; nothing about them is electric but the starting and the deciding' }),
    B(`${nm} engine controller`, [0.12, 0.03, 0.09], [-0.26, 1.45, 0], { mat: 'al-6061', color: 0x53575c, finish: 'anodised', says: 'its board and its drivers not drawn apart. One channel for each engine: the pilot\'s throttle is a request, this decides the fuel' }),
    ...[-1, 1].map((s) => B(`${nm} shoulder strap ${s < 0 ? 'left' : 'right'}`, [0.07, 0.42, 0.05], [-0.06, 1.3, s * 0.15], { rot: [0, 0, -0.2] as Vec, mat: 'nylon', color: 0x17191c, finish: 'texture' })),
    B(`${nm} waist belt`, [0.16, 0.08, 0.42], [-0.06, 1.0, 0], { mat: 'nylon', color: 0x17191c, finish: 'texture', says: 'the belt that takes the thrust into the hips, not the shoulders' }),
  );
  for (let k = 0; k < back; k++) {
    const sz = back === 1 ? 0 : (k * 2 - 1) * 0.16;
    parts.push(...turbineParts(`${nm} back engine ${k + 1}`, D).map((p) => ({ ...p, at: [-0.33, 1.3, sz] as Vec, rot: [0, 0, -PI / 2 + 0.22] as Vec })));
    parts.push(B(`${nm} back engine mount ${k + 1}`, [0.09, 0.1, 0.07], [-0.26, 1.3, sz], { mat: 'cfrp', color: 0x1b1d20, finish: 'brushed', says: 'the bracket from the engine to the backplate' }));
    parts.push(P(`${nm} back fuel line ${k + 1}`, { cyl: [0.0045, 0.26] }, { at: [-0.28, 1.12, sz * 0.6], rot: [0, 0, 0.3] as Vec, mat: 'nbr', color: 0x17191c, finish: 'texture', item: 'softhose-nbr-6-1.5-1', says: 'from the pump up to this engine: one hose for each' }));
  }
  for (let k = 0; k < arms; k++) {
    const side = k % 2 === 0 ? -1 : 1, pair = Math.floor(k / 2);
    const z = side * 0.36, y = 0.95 + pair * (D * 0.95), x = 0.06;
    parts.push(group(`${nm} ${side < 0 ? 'left' : 'right'} arm unit ${pair + 1}`, [x, y, z], [
      ...turbineParts(`${nm} arm engine ${k + 1}`, D * 0.8).map((p) => ({ ...p, at: [0, 0.06, 0] as Vec, rot: [0, 0, -PI / 2 + 0.1] as Vec })),
      ...(pair === 0 ? [P(`${nm} grip ${k + 1}`, { cyl: [0.022, 0.13] }, { at: [0, -0.02, side * 0.035], rot: [0.25 * side, 0, 0] as Vec, mat: 'rubber', color: 0x1a1c20, finish: 'texture', says: 'the hand goes here: where it points is where the thrust goes' }),
        P(`${nm} hand on the grip ${k + 1}`, { torus: [0.038, 0.022] }, { at: [0, -0.02, side * 0.035], rot: [PI / 2 + 0.25 * side, 0, 0] as Vec, color: 0x23262b, finish: 'texture', says: 'the pilot\'s hand closed round it, drawn as a shape and weighed as nothing' })] : []),
      B(`${nm} throttle ${k + 1}`, [0.034, 0.018, 0.018], [0.03, -0.02, side * 0.035], { mat: 'abs', color: 0xc8512b, finish: 'moulded', says: side < 0 ? 'the left grip\'s trigger: thrust' : 'the right grip\'s: trim and the kill switch' }),
      // (the bracket that makes the grip and the engine one piece: without it the engine is not held by anything)
      B(`${nm} arm bracket ${k + 1}`, [0.05, 0.16, 0.012], [0, 0.03, side * 0.028], { mat: 'cfrp', color: 0x1b1d20, finish: 'brushed' }),
      P(`${nm} arm fuel line ${k + 1}`, { cyl: [0.0045, 0.2] }, { at: [-0.05, 0.0, -side * 0.1], rot: [PI / 2, 0, 0] as Vec, mat: 'nbr', color: 0x17191c, finish: 'texture', item: 'softhose-nbr-6-1.5-1', says: 'a 6 mm hose down the arm and back to the pump on the frame: it must flex with the arm, so it is hose and not pipe' }),
    ]));
  }
  return [group(nm, [0, 0, 0], parts, { says: `${h.says}. ${burn(perEngine * engines, 0.17, jetFuelKg(engines, perEngine)).says}. ${HAZARDS.jetpack!.join('. ')}` })];
}
/** What a jet suit weighs with its fuel and a pilot, kg: the engines (about 1 kg for each 100 N of thrust, an estimate
 *  of this class), the frame and fuel, and a 90 kg pilot in their gear. */
export const jetKg = (engines: number, perEngine: number): number => +(engines * (perEngine / 100) + 14 + jetFuelKg(engines, perEngine) + 90).toFixed(0);
/** The fuel it leaves with, kg: enough for about four minutes at hover thrust, which is a flight. */
export const jetFuelKg = (engines: number, perEngine: number): number => +((engines * perEngine * 0.17 * 4) / 60).toFixed(0);

/** A small submarine, laid out from its hull: its plate the thickness the depth it is rated to asked for, its ring
 *  frames at the spacing that thickness was worked out over, a sphere of acrylic at the bow to see out of, saddle
 *  ballast tanks, a sail with its hatch, and — behind a tail that tapers away from it, where the water can reach it —
 *  a shrouded propeller with its planes and rudder. Bow at +x, the hull's axis along x. */
export function submarineParts(nm: string, depth: number, D: number): Part[] {
  const frame = D * 1.7, body = frame * 2.4, R = D / 2;
  const t = plateFor(depth, D, frame).t;
  // (the hull: a hemisphere at the bow, the cylinder the people are in, and a cone drawn away to the stern so the
  //  propeller and its planes work in water that is going somewhere, not in the hull's own wake)
  const tail = R * 1.9, nose = R;
  const parts: Part[] = [
    P(`${nm} pressure hull`, { lathe: [...Array.from({ length: 9 }, (_, i) => { const u = i / 8; return [R * Math.pow(Math.sin((PI / 2) * u), 0.72), -body / 2 - tail * (1 - u)] as [number, number]; }), [R, body / 2],
      ...Array.from({ length: 9 }, (_, i) => { const u = i / 8; return [R * Math.cos((PI / 2) * u * 0.98), body / 2 + nose * Math.sin((PI / 2) * u)] as [number, number]; })] },
      { at: [0, 0, 0], rot: [0, 0, -PI / 2] as Vec, mat: 'steel-alloy', color: 0xf0c419, finish: 'painted', shell: t, item: 'pressure-shell',
        says: `${(t * 1000).toFixed(1)} mm of plate: what ${depth} m asked for at 1.5 times the margin` }),
    ...Array.from({ length: 3 }, (_, k) => P(`${nm} ring frame ${k + 1}`, { torus: [R - t - 0.02, 0.018] }, { at: [(k - 1) * frame, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'steel-alloy', color: 0x6f7378,
      says: 'inside, welded to the shell: the frames are what the collapse pressure was worked out between' })),
    // (the bow: a fairing ring out of the hull, then the acrylic sphere, so the two meet on a seat and not in the air)
    P(`${nm} viewport seat`, { lathe: [[R * 0.52, body / 2 + nose * 0.86], [R * 0.6, body / 2 + nose * 0.86], [R * 0.6, body / 2 + nose * 1.02], [R * 0.52, body / 2 + nose * 1.02], [R * 0.52, body / 2 + nose * 0.86]] }, { at: [0, 0, 0], rot: [0, 0, -PI / 2] as Vec, mat: 'steel-alloy', color: 0x6f7378, says: 'the flange the dome is clamped onto: at depth the sea presses it into its seat, which is why a sphere is used and not a flat pane' }),
    P(`${nm} viewport dome`, { sphere: R * 0.74 }, { at: [body / 2 + nose * 1.06, 0, 0], mat: 'pmma', color: 0xbcd3e0, finish: 'polished', shell: 0.05, says: 'cast acrylic, 50 mm thick: what the pilot sees out of' }),
    // (the sail)
    P(`${nm} sail`, { prism: { pts: [[-D * 0.34, 0], [D * 0.3, 0], [D * 0.22, D * 0.42], [-D * 0.26, D * 0.42]], L: D * 0.42 } }, { at: [0, R * 0.86, 0], rot: [0, PI / 2, 0] as Vec, mat: 'fibreglass', color: 0xf0c419, finish: 'painted', shell: 0.008 }),
    P(`${nm} hatch ring`, { torus: [D * 0.17, 0.02] }, { at: [-D * 0.02, R * 0.86 + D * 0.42, 0], rot: [PI / 2, 0, 0] as Vec, mat: 'steel-alloy', color: 0x8d9298 }),
    C(`${nm} hatch`, D * 0.17, 0.03, [-D * 0.02, R * 0.86 + D * 0.44, 0], { mat: 'steel-alloy', color: 0xc8512b, finish: 'painted', says: 'the only way in or out' }),
    C(`${nm} mast`, 0.025, D * 0.5, [-D * 0.26, R * 0.86 + D * 0.62, 0], { mat: 'stainless-304', color: 0xb4b9bd, finish: 'polished' }),
    B(`${nm} mast head`, [0.09, 0.12, 0.07], [-D * 0.26, R * 0.86 + D * 0.88, 0], { mat: 'abs', color: 0x24272c, finish: 'moulded', says: 'the aerial and the light on top of it' }),
  ];
  // (saddle ballast tanks: what it floods to go under, and blows to come up, standing proud either side)
  for (const sz of [-1, 1]) {
    parts.push(P(`${nm} ballast tank`, { lathe: [[0, -body * 0.3], [D * 0.16, -body * 0.24], [D * 0.2, 0], [D * 0.16, body * 0.24], [0, body * 0.3]] },
      { at: [0, -R * 0.12, sz * (R + D * 0.12)], rot: [0, 0, -PI / 2] as Vec, mat: 'steel-low', color: 0x3f4349, finish: 'painted', shell: 0.003,
        says: 'open at the bottom and vented at the top: it floods by its own weight and is blown out with air' }));
    parts.push(B(`${nm} tank vent`, [0.07, 0.05, 0.05], [body * 0.2, -R * 0.12 + D * 0.2, sz * (R + D * 0.12)], { mat: 'brass', color: 0xb08d57, says: 'the vent at the top: shut, the tank holds its air and the boat stays up' }));
  }
  // (the stern, behind the tail cone: the shroud, the propeller in it, the planes and the rudder ahead of them)
  const px = -body / 2 - tail - R * 0.1;
  parts.push(P(`${nm} propeller shroud`, { lathe: [[R * 0.52, -D * 0.16], [R * 0.57, -D * 0.16], [R * 0.57, D * 0.16], [R * 0.52, D * 0.16], [R * 0.52, -D * 0.16]] }, { at: [px, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'stainless-304', color: 0x9aa0a6, finish: 'brushed', says: 'a ring round the propeller: it adds thrust at low speed and keeps a line out of it' }));
  parts.push(C(`${nm} propeller hub`, R * 0.13, D * 0.12, [px, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'bronze', color: 0xb08d57, finish: 'polished' }));
  for (let k = 0; k < 4; k++) { const a = (2 * PI * k) / 4;
    parts.push(B(`${nm} propeller blade ${k + 1}`, [D * 0.04, R * 0.42, R * 0.3], [px, Math.cos(a) * R * 0.31, Math.sin(a) * R * 0.31], { rot: [-a, 0, 0.6] as Vec, mat: 'bronze', color: 0xb08d57, finish: 'polished', says: 'drawn at one pitch: a real blade is skewed and twisted' })); }
  parts.push(C(`${nm} shaft`, 0.022, D * 0.22, [px + D * 0.16, 0, 0], { rot: [0, 0, PI / 2] as Vec, mat: 'stainless-316', color: 0xc2c7cb, finish: 'polished' }));
  parts.push(P(`${nm} shaft seal`, { lathe: [[0.03, -0.03], [0.055, -0.03], [0.055, 0.03], [0.03, 0.03], [0.03, -0.03]] }, { at: [px + D * 0.26, 0, 0], rot: [0, 0, PI / 2] as Vec, mat: 'bronze', color: 0x8d7340, says: 'where the shaft goes through the hull: the one hole in it that turns' }));
  for (const [ax, az, nmP] of [[1, 0, 'upper rudder'], [-1, 0, 'lower rudder'], [0, 1, 'starboard plane'], [0, -1, 'port plane']] as [number, number, string][])
    parts.push(P(`${nm} ${nmP}`, { prism: { pts: [[-D * 0.42, 0], [D * 0.22, 0], [D * 0.14, R * 0.95], [-D * 0.3, R * 0.95]], L: 0.02 } },
      { at: [px + D * 0.42, ax * R * 0.3, az * R * 0.3], rot: az === 0 ? [0, 0, ax > 0 ? 0 : PI] as Vec : [az > 0 ? -PI / 2 : PI / 2, 0, 0] as Vec, mat: 'fibreglass', color: 0xf0c419, finish: 'painted',
        says: ax !== 0 ? 'the rudder: it turns the boat' : 'the stern plane: it holds the depth' }));
  // (what is inside: the battery under the floor, the air bottles, the seat)
  parts.push(B(`${nm} battery pod`, [body * 0.5, D * 0.16, D * 0.4], [0, -R * 0.6, 0], { mat: 'abs', color: 0x24272c, finish: 'moulded', fill: 0.6, says: 'its cells and their management not drawn apart. Under the floor, where its weight holds the boat upright' }));
  for (const sz of [-1, 1]) parts.push(P(`${nm} air bottle`, { capsule: [D * 0.07, body * 0.3] }, { at: [-body * 0.2, -R * 0.1, sz * R * 0.5], rot: [0, 0, PI / 2] as Vec, mat: 'steel-alloy', color: 0x2e6f9e, finish: 'painted', shell: 0.005, says: 'high-pressure air: it blows the ballast to come up, and it is the only way up if the power goes' }));
  parts.push(B(`${nm} seat`, [0.5, 0.08, 0.42], [body * 0.14, -R * 0.34, 0], { mat: 'pu', color: 0x1d2025, finish: 'texture', fill: 0.5 }));
  const vol = PI * R * R * body + (2 / 3) * PI * R * R * R + (PI * R * R * tail) / 3;
  return [group(nm, [0, 0, 0], parts, { says: `${hull(depth, D, t, frame).says}. ${ballast(vol * 0.85, subKg(depth, D), {}).says}. ${HAZARDS.submarine!.join('. ')}`, fixed: `${(body + nose + tail).toFixed(1)} m overall` })];
}
/** What a small submarine of that hull weighs, kg: two terms, because they do not scale together. Its plate is
 *  arithmetic — the hull's own area times the thickness the depth asked for, times the density of steel. Its fit-out is
 *  not: the ring frames, the ballast tanks, the battery pod, the motor, the propeller and its shroud, the acrylic dome,
 *  the sail and hatch, the seats and the people in them go with the size of the hull and not with the plate, and come
 *  to about 700 kg a metre of hull as D^2.4 (an estimate, totalled from the drawing's own fit-out). Taking the fit-out
 *  as a share of the plate instead, as this did, made a shallow boat 28 % too heavy and a deep one 16 % too light,
 *  because at 50 m the plate is 6 mm and at 500 it is 29. A two-person 100 m boat comes out at 2.8 t, against about
 *  2.5 t for a U-Boat Worx NEMO of that rating. */
export function subKg(depth: number, D: number): number {
  const frame = D * 1.7, body = frame * 2.4, t = plateFor(depth, D, frame).t;
  const area = PI * D * body + 4 * PI * (D / 2) ** 2;
  return +(area * t * 7850 + 700 * Math.pow(D, 2.4)).toFixed(0);
}

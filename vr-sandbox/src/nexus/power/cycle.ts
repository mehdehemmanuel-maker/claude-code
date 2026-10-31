// An engine running, worked out from what it is: its bore, stroke, rod, compression ratio, cylinders and intake valves
// (src/nexus/engines.ts builds the same engine from the same numbers). Each cylinder, crank degree by crank degree:
// what it breathes in (its swept volume filled at the manifold's pressure, as fully as its valves let it: Taylor's
// inlet Mach index), the fuel burned with it (a stoichiometric mixture), that heat let out as a Wiebe function says a
// flame burns, and the pressure that makes on its piston as the volume over it changes (a single zone, its gas
// expanding and compressed polytropically); that force turned through its rod and crank into torque. Its cylinders
// summed, each firing in turn; less what its friction and pumping take (Heywood's correlation for engines of its kind).
// Every figure says where it comes from; what is not modelled (knock, a turbo, cam timing by speed) is said.

/** What an engine is, for running it. */
export interface EngineRun { cyl: number; bore: number; stroke: number; /** rod, centre to centre, m */ rod: number; /** compression ratio */ cr: number; fuel: 'petrol' | 'diesel'; /** intake valves: head diameter, m, and how many a cylinder */ valve: { dia: number; count: number } }
/** How it is run. */
export interface Operating { rpm: number; /** 0 to 1: the manifold's pressure over the air's (a closed throttle is about 0.3, typical) */ load?: number }

export const AIR = { p: 101_325, T: 293, R: 287, a: 343 }; // (the air at 20 °C at sea level: ISO 2533 standard pressure; its speed of sound)
/** The fuels: their lower heating values (Heywood 1988, appendix D: gasoline 44.0 MJ/kg, diesel 42.5), the air each
 *  burns with exactly (stoichiometric: 14.6 and 14.5), and the polytropic exponent of the gas in the cylinder (1.3, typical). */
export const FUEL = { petrol: { lhv: 44.0e6, afr: 14.6 }, diesel: { lhv: 42.5e6, afr: 14.5 } };
const GAMMA = 1.3;
/** How the flame burns (Wiebe, as Heywood 1988 §9.2.2 gives it): a = 5, m = 2, lasting 55° (typical); started 20° before
 *  top centre, so half is burned about 8° after it, where a spark engine makes its best torque (Heywood §9.3). */
export const WIEBE = { a: 5, m: 2, start: -20, span: 55 };
/** Heat lost to the walls and burned incompletely: a fifth of the fuel's (an estimate, typical of a spark engine). */
export const LOSS = 0.2;
/** The volumetric efficiency of a well-tuned four-valve intake at its best, 0.9 (typical); falling once the inlet Mach
 *  index passes 0.6 (Taylor; Heywood 1988 fig. 6-21) as (0.6 / Z)^0.7 (an estimate fit to that curve). */
export const VE_BEST = 0.9;

export const meanPistonSpeed = (e: EngineRun, rpm: number) => (2 * e.stroke * rpm) / 60;
/** Taylor's inlet Mach index: Z = (B / Di)² S̄p / (Ci a), the valves' flow coefficient Ci 0.35 (typical). */
export const machIndex = (e: EngineRun, rpm: number) => ((e.bore * e.bore) / (e.valve.count * e.valve.dia * e.valve.dia)) * meanPistonSpeed(e, rpm) / (0.35 * AIR.a);
export const volEff = (e: EngineRun, rpm: number) => { const z = machIndex(e, rpm); return z <= 0.6 ? VE_BEST : VE_BEST * (0.6 / z) ** 0.7; };
/** What friction and pumping take at full load (Heywood 1988 eq. 13.20, for four-stroke spark engines of 0.845 to 2.0 L):
 *  tfmep = 0.97 + 0.15 (N/1000) + 0.05 (N/1000)² bar; at part load the pumping grows by what the throttle closes off. */
export const fmep = (rpm: number, load = 1) => (0.97 + 0.15 * (rpm / 1000) + 0.05 * (rpm / 1000) ** 2) * 1e5 + (1 - load) * AIR.p;

export interface Cycle {
  rpm: number; load: number; /** each crank degree over two turns: the first cylinder's pressure, and the whole crank's torque */ trace: { deg: number; p: number; torque: number }[];
  peak: number; peakAt: number; imep: number; fmep: number; bmep: number; torque: number; power: number; fuel: number; bsfc: number; efficiency: number; ve: number; mach: number; says: string;
}
/** One engine at one speed and load, crank degree by crank degree. */
export function runEngine(e: EngineRun, op: Operating): Cycle {
  const load = Math.max(0.2, Math.min(1, op.load ?? 1)), A = (Math.PI * e.bore * e.bore) / 4, r = e.stroke / 2, l = e.rod, Vd = A * e.stroke, Vc = Vd / (e.cr - 1), f = FUEL[e.fuel];
  const V = (deg: number) => { const t = (deg * Math.PI) / 180; return Vc + A * (r + l - r * Math.cos(t) - Math.sqrt(l * l - (r * Math.sin(t)) ** 2)); };
  // (what it breathes: its swept volume at the manifold's pressure and the air's temperature, as full as its valves let it)
  const ve = volEff(e, op.rpm), air = (ve * load * AIR.p * Vd) / (AIR.R * AIR.T), Q = (air / f.afr) * f.lhv * (1 - LOSS);
  // (the closed part of its cycle, from the intake valve closing at bottom centre (−180°) to the exhaust opening (+180°):
  // dp = −γ p dV / V + (γ − 1) dQ / V, the burn's share of Q by Wiebe's x = 1 − exp(−a ((θ − θ0) / Δθ)^(m+1)))
  const xb = (deg: number) => (deg <= WIEBE.start ? 0 : 1 - Math.exp(-WIEBE.a * Math.min(1, (deg - WIEBE.start) / WIEBE.span) ** (WIEBE.m + 1)));
  const p: number[] = [], step = 0.25; let pc = load * AIR.p, peak = 0, peakAt = 0;
  for (let d = -180; d <= 180 + 1e-9; d += step) { const v0 = V(d), v1 = V(d + step), dQ = Q * (xb(d + step) - xb(d)); p.push(pc); if (pc > peak) { peak = pc; peakAt = d; } pc = pc + (-GAMMA * pc * (v1 - v0) + (GAMMA - 1) * dQ) / v0; }
  // (the piston's force on the crank as torque: F r sin(θ + φ) / cos φ, φ the rod's angle; the open strokes at the
  // manifold's and the exhaust's pressures, their pumping counted in fmep)
  const torqueAt = (deg: number, pr: number) => { const t = (deg * Math.PI) / 180, phi = Math.asin((r * Math.sin(t)) / l); return (pr - AIR.p) * A * r * Math.sin(t + phi) / Math.cos(phi); };
  const pAt = (deg: number) => { const d = ((((deg + 360) % 720) + 720) % 720) - 360; if (d < -180 || d > 180) return d > 180 ? AIR.p : load * AIR.p; return p[Math.round((d + 180) / step)] ?? AIR.p; };
  const trace: Cycle['trace'] = []; let work = 0;
  for (let deg = -360; deg < 360; deg += 1) { let T = 0; for (let c = 0; c < e.cyl; c++) { const dd = deg - (720 / e.cyl) * c; T += torqueAt(dd, pAt(dd)); } trace.push({ deg, p: pAt(deg), torque: T }); }
  // (its indicated work from the closed cycle, ∮ p dV)
  for (let k = 0; k + 1 < p.length; k++) { const d = -180 + k * step; work += ((p[k]! + p[k + 1]!) / 2) * (V(d + step) - V(d)); }
  const imep = work / Vd, fm = fmep(op.rpm, load), bmep = imep - fm, torque = (bmep * Vd * e.cyl) / (4 * Math.PI), power = torque * (op.rpm * 2 * Math.PI / 60);
  const fuel = ((air / f.afr) * e.cyl * op.rpm) / 120, bsfc = power > 0 ? (fuel / power) * 3.6e9 : Infinity, efficiency = power > 0 ? power / (fuel * f.lhv) : 0;
  return { rpm: op.rpm, load, trace, peak, peakAt, imep, fmep: fm, bmep, torque, power, fuel, bsfc, efficiency, ve, mach: machIndex(e, op.rpm),
    says: `${op.rpm} rpm${load < 1 ? ` at ${Math.round(load * 100)} % manifold pressure` : ', full load'}: ${(torque).toFixed(0)} N·m, ${(power / 1000).toFixed(1)} kW; its cylinders peak at ${(peak / 1e5).toFixed(0)} bar ${peakAt.toFixed(0)}° after top centre; imep ${(imep / 1e5).toFixed(1)} bar less ${(fm / 1e5).toFixed(1)} bar of friction and pumping; filled ${(ve * 100).toFixed(0)} % (inlet Mach index ${machIndex(e, op.rpm).toFixed(2)}); ${(fuel * 3600).toFixed(1)} kg of fuel an hour, ${bsfc.toFixed(0)} g/kWh, ${(efficiency * 100).toFixed(0)} % of its fuel's energy to the crank` };
}
/** Its full-load curve over a range of speeds. */
export function torqueCurve(e: EngineRun, from = 1000, to = 7000, every = 250): { rpm: number; torque: number; power: number }[] {
  const out: { rpm: number; torque: number; power: number }[] = []; for (let n = from; n <= to + 1e-9; n += every) { const c = runEngine(e, { rpm: n }); out.push({ rpm: n, torque: c.torque, power: c.power }); } return out;
}

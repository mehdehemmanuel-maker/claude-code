// A DC motor run in time, from its datasheet model (engineering/dcmotor.ts): the current its voltage drives against its
// back-EMF and its copper's resistance at the temperature it is, the speed its torque less its load and friction
// spins it to, and the heat its copper makes, through its winding and housing to the air (the two-node model of
// heatStep). Its inductance is left out: its current settles in well under a millisecond, far quicker than anything
// here is read.
//
// A liquid cooling it runs through a jacket round its housing, a gap of 2 mm (assumed: a jacket's gap is a design
// choice; say another to change it). The heat the liquid carries is worked from its own properties: its Reynolds number
// in the gap says whether it flows laminar or turbulent; laminar, the gap's walls heated on one side give Nu = 4.86
// (Incropera, Fundamentals of Heat and Mass Transfer, 7th ed., Table 8.3, parallel plates, one side insulated);
// turbulent, Gnielinski's correlation with Petukhov's friction factor (Incropera eqs. 8.21 and 8.62), blended
// linearly between Re 2300 and 3000. The jacket passes heat G = m c_p (1 - exp(-UA / m c_p)) per kelvin between the
// housing and the liquid coming in (the effectiveness of a stream past a wall at one temperature), the liquid leaves
// warmer by the heat it carries over m c_p, and pushing it through the gap takes dp Q of a pump's power.

import type { MotorData } from '../data/motors';
import { heatStep, motorModel, windingR, type MotorHeat, type MotorModel } from './dcmotor';
import { AMBIENT } from './thermal';

export interface Liquid { name: string; rho: number; cp: number; mu: number; k: number; source: string }
/** Liquids at about room temperature, with where each figure is from. */
export const LIQUIDS: Record<string, Liquid> = {
  water: { name: 'water', rho: 997, cp: 4179, mu: 855e-6, k: 0.613, source: 'Incropera 7th ed. Table A.6, saturated water at 300 K' },
  glycol: { name: 'ethylene glycol', rho: 1114, cp: 2415, mu: 1.57e-2, k: 0.252, source: 'Incropera 7th ed. Table A.5, ethylene glycol at 300 K' },
  'glycol-water': { name: 'glycol and water, half and half', rho: 1071, cp: 3300, mu: 3.9e-3, k: 0.38, source: 'ASHRAE Fundamentals ch. 31, 50 % ethylene glycol by mass at 20 °C (read from its tables, estimated)' },
  oil: { name: 'engine oil', rho: 884, cp: 1909, mu: 0.486, k: 0.145, source: 'Incropera 7th ed. Table A.5, unused engine oil at 300 K' },
};
export function liquidOf(word: string): Liquid {
  const w = word.toLowerCase().trim();
  const id = /glycol.*water|water.*glycol|coolant|antifreeze/.test(w) ? 'glycol-water' : /glycol/.test(w) ? 'glycol' : /oil/.test(w) ? 'oil' : /water/.test(w) ? 'water' : null;
  if (!id) throw new Error(`I know no liquid "${word}": I know water, ethylene glycol, glycol and water, and engine oil.`);
  return LIQUIDS[id]!;
}

export interface Coolant { liquid: Liquid; /** m³/s */ flow: number; /** deg C, coming in */ tIn: number; /** the jacket's gap, m */ gap?: number }
export interface Jacket { Re: number; regime: 'laminar' | 'turbulent' | 'between'; Nu: number; h: number; UA: number; G: number; dp: number; pump: number }
export interface MotorRun {
  label: string; V: number; load: number; seconds: number;
  /** Time, speed (rpm), current (A), winding and housing (deg C), sampled at about 200 points. */
  t: number[]; rpm: number[]; current: number[]; winding: number[]; housing: number[];
  /** Where it ends. */
  end: { rpm: number; current: number; torque: number; winding: number; housing: number; powerIn: number; powerOut: number; efficiency: number };
  /** Energy over the run, J: from the source, out at the shaft, into the copper as heat, into friction, and in its spin at the end. */
  energy: { in: number; out: number; copper: number; friction: number; spin: number };
  /** How long it took to come to 63 % of its speed, s. */
  rise: number;
  stalled: boolean;
  /** When its winding first passed its limit, s; null where it never did. */
  overheated: number | null;
  maxWinding: number;
  jacket: (Jacket & { carried: number; out: number; liquid: string; flow: number; tIn: number }) | null;
  thermalEstimated: boolean;
}

/** The jacket round a housing of diameter D and length L, the liquid flowing at Q through a gap g. */
export function jacketOf(D: number, L: number, c: Coolant): Jacket {
  const g = c.gap ?? 0.002, A = Math.PI * (D + g) * g, v = c.flow / A, Dh = 2 * g, { rho, mu, cp, k } = c.liquid;
  const Re = (rho * v * Dh) / mu, Pr = (mu * cp) / k;
  const lam = 4.86, fLam = 96 / Math.max(Re, 1e-9);
  const turb = (r: number) => { const f = (0.79 * Math.log(r) - 1.64) ** -2; return { Nu: ((f / 8) * (r - 1000) * Pr) / (1 + 12.7 * Math.sqrt(f / 8) * (Pr ** (2 / 3) - 1)), f }; };
  let Nu: number, f: number, regime: Jacket['regime'];
  if (Re < 2300) { Nu = lam; f = fLam; regime = 'laminar'; }
  else if (Re >= 3000) { const t = turb(Re); Nu = t.Nu; f = t.f; regime = 'turbulent'; }
  else { const s = (Re - 2300) / 700, t = turb(3000); Nu = lam + s * (t.Nu - lam); f = 96 / 2300 + s * (t.f - 96 / 2300); regime = 'between'; }
  const h = (Nu * k) / Dh, UA = h * Math.PI * D * L, mcp = rho * c.flow * cp, G = mcp * (1 - Math.exp(-UA / mcp)), dp = (f * L * rho * v * v) / (2 * Dh);
  return { Re, regime, Nu, h, UA, G, dp, pump: dp * c.flow };
}

/** The motor run at V volts against a load torque for so many seconds, from rest and at the room's temperature. */
export function runMotor(d: MotorData, o: { V: number; load: number; seconds: number; coolant?: Coolant; ambient?: number; inertia?: number }): MotorRun {
  const m: MotorModel = motorModel(d), Ta = o.ambient ?? AMBIENT, J = m.rotorInertia + (o.inertia ?? 0);
  const jacket = o.coolant ? jacketOf(d.diameter, d.length, o.coolant) : null;
  // the housing loses heat to the air and to the liquid: one path to an ambient between the two
  const th = jacket ? { ...m.thermal, Rha: 1 / (1 / m.thermal.Rha + jacket.G) } : m.thermal;
  const amb = jacket ? (Ta / m.thermal.Rha + jacket.G * o.coolant!.tIn) * th.Rha : Ta;
  let w = 0, t = 0, heat: MotorHeat = { winding: Ta, housing: Ta }, overheated: number | null = null, rise = NaN;
  const E = { in: 0, out: 0, copper: 0, friction: 0, spin: 0 }, out: Pick = { t: [], rpm: [], current: [], winding: [], housing: [] };
  const R0 = windingR(m, heat.winding), tauM = (J * R0) / (m.Kt * m.Kt), wFree = Math.max(0, (o.V - R0 * (o.load + m.Tf) / m.Kt) / m.Kt);
  const every = o.seconds / 200; let next = 0, I = 0;
  while (t < o.seconds - 1e-12) {
    const R = windingR(m, heat.winding);
    // while it gathers speed, steps a twentieth of its mechanical time constant; then, as its heat moves, a tenth of a second
    const settling = t < 10 * tauM, dt = Math.min(settling ? tauM / 20 : 0.1, o.seconds - t);
    I = (o.V - m.Kt * w) / R;
    const Tm = m.Kt * I, friction = w > 1e-9 ? m.Tf : Math.min(m.Tf, Math.abs(Tm - o.load)), net = Tm - o.load - friction;
    if (settling) w = Math.max(0, w + (net / J) * dt);
    else { const ws = (o.V - R * (o.load + m.Tf) / m.Kt) / m.Kt; w = Math.max(0, ws); I = w > 0 ? (o.load + m.Tf) / m.Kt : o.V / R; }
    const Pcu = I * I * R;
    E.in += o.V * I * dt; E.out += o.load * w * dt; E.copper += Pcu * dt; E.friction += m.Tf * w * dt;
    heat = heatStep(th, heat, Pcu, m.Tf * w, dt, amb);
    t += dt;
    if (Number.isNaN(rise) && wFree > 0 && w >= 0.632 * wFree) rise = t;
    if (overheated === null && heat.winding > m.thermal.maxWinding) overheated = t;
    if (t >= next - 1e-12 || t >= o.seconds - 1e-12) { out.t.push(t); out.rpm.push((w * 60) / (2 * Math.PI)); out.current.push(I); out.winding.push(heat.winding); out.housing.push(heat.housing); next += every; }
  }
  E.spin = 0.5 * J * w * w;
  const Tshaft = o.load, pIn = o.V * I, pOut = Tshaft * w;
  const carried = jacket ? jacket.G * (heat.housing - o.coolant!.tIn) : 0;
  return {
    label: d.label, V: o.V, load: o.load, seconds: o.seconds, ...out,
    end: { rpm: (w * 60) / (2 * Math.PI), current: I, torque: Tshaft, winding: heat.winding, housing: heat.housing, powerIn: pIn, powerOut: pOut, efficiency: pIn > 0 ? pOut / pIn : 0 },
    energy: E, rise: Number.isNaN(rise) ? 0 : rise, stalled: w <= 1e-6, overheated, maxWinding: m.thermal.maxWinding,
    jacket: jacket ? { ...jacket, carried, out: o.coolant!.tIn + carried / (o.coolant!.liquid.rho * o.coolant!.flow * o.coolant!.liquid.cp), liquid: o.coolant!.liquid.name, flow: o.coolant!.flow, tIn: o.coolant!.tIn } : null,
    thermalEstimated: m.thermal.estimated,
  };
}
type Pick = { t: number[]; rpm: number[]; current: number[]; winding: number[]; housing: number[] };

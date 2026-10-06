// What the laws say of what was asked, whether or not anything is made: each a bound from a law kept, on figures read
// from the ask. Heat a thing must shed against what still air takes from its surface at the temperature it may reach;
// the energy it must carry for so long at so much, against what a cell of that weight or size holds; the power to hover,
// by momentum theory, and whether that theory holds at its size; a heat engine's most, Carnot's, on the heat that can
// cross it; a motor's torque, and the shear its air gap must carry for it, against what electric machines carry; a
// slope's pull against what its motors give. Each is said with its figures, and where a figure is an estimate it says so.

import { heatLoss, AMBIENT } from '../engineering/thermal';
import { AIR, fmt, lenSay, timeSay } from './sizing';

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
}

/** Li-ion cells now: about 250 Wh/kg and 650 Wh/L for good cylindrical and pouch cells (estimate; makers' sheets 2024). */
const CELL = { whPerKg: 250, whPerL: 650 };
/** Electric machines carry an air-gap shear of about 10 to 50 kPa, up to 100 kPa liquid-cooled (Pyrhönen, Jokinen and
 *  Hrabovcová, Design of Rotating Electrical Machines, 2nd ed., Table 6.3: estimate taken as 50 kPa at most). */
const SHEAR = 5e4;

/** Every bound the figures read allow, each a law on what was asked. */
export function bounds(s: Said): Bound[] {
  // a thing given one size is taken as a cube of it; given two, as flat: its thickness a quarter of the less (estimate)
  const out: Bound[] = [], dims = s.size ?? {}, W = dims.W, D = dims.D ?? dims.W, flat = dims.H === undefined && dims.D !== undefined, H = dims.H ?? (flat ? Math.min(dims.W ?? dims.D!, dims.D!) / 4 : dims.W), thick = flat && H !== undefined ? ` (its thickness taken as ${lenSay(H)}, a quarter of its width: estimate)` : '';
  const area = W && D && H ? 2 * (W * D + W * H + D * H) : undefined, vol = W && D && H ? W * D * H : undefined, Lc = H ?? W;
  const P = (as: 'draws' | 'gives' | 'makes') => s.power?.find((x) => x.as === as)?.W;
  // heat: what it must shed (all it draws; what it loses passing on what it gives, at 95%, an estimate for a good
  // converter) against what still air takes from its surface at its hottest (convection and radiation, the kept law)
  const heat = P('draws') ?? (P('gives') !== undefined ? P('gives')! * (1 / 0.95 - 1) : undefined);
  if (heat !== undefined && area !== undefined && Lc) {
    const cap = s.tmax !== undefined ? heatLoss(s.tmax, area, Lc, 0.9) : undefined;
    let T = AMBIENT + 1; for (let k = 0; k < 200 && heatLoss(T, area, Lc, 0.9) < heat; k++) T = AMBIENT + (T - AMBIENT) * 1.08 + 0.5;
    out.push({ what: `it sheds the ${fmt(heat)} W it turns to heat${s.tmax !== undefined ? ` at no more than ${s.tmax} °C` : ''}`, ok: cap === undefined ? null : cap >= heat, says: `its ${fmt(area * 1e4)} cm² of surface${thick} sheds ${cap !== undefined ? `${fmt(cap)} W at ${s.tmax} °C` : 'it'} into still air at ${AMBIENT} °C (natural convection and radiation, emissivity 0.9); left so, it settles near ${fmt(T)} °C${P('gives') !== undefined && P('draws') === undefined ? ` (the heat is what it loses passing on ${fmt(P('gives')!)} W at 95% (estimate))` : ''}${cap !== undefined && cap < heat ? `: it needs ${fmt(heat / cap)} times the surface, or a fan or a heat sink` : ''}` });
  }
  // energy carried: so many watts for so long, against what cells of its size and weight hold
  const run = P('draws') ?? P('gives') ?? P('makes');
  if (run !== undefined && s.runFor !== undefined) {
    const Wh = (run * s.runFor) / 3600, kg = Wh / CELL.whPerKg, L = Wh / CELL.whPerL;
    out.push({ what: `it carries what it needs for ${timeSay(s.runFor)} at ${fmt(run)} W`, ok: vol === undefined && s.massLimit === undefined ? null : (vol === undefined || L / 1000 <= vol * 0.5) && (s.massLimit === undefined || kg <= s.massLimit), says: `${fmt(Wh)} Wh: ${fmt(kg * 1000)} g of lithium-ion cells, ${fmt(L * 1000)} cm³ (about ${CELL.whPerKg} Wh/kg and ${CELL.whPerL} Wh/L, estimate)${vol !== undefined ? `, against its ${fmt(vol * 1e6)} cm³ in all${thick}${L / 1000 > vol * 0.5 ? `: more than half of it` : ''}` : ''}${s.massLimit !== undefined && kg > s.massLimit ? `, more than the ${fmt(s.massLimit)} kg it may weigh` : ''}` });
  }
  // hovering: momentum theory, power ideal (m g)^1.5 / √(2 ρ A) over a disc as wide as it is; out of its range below Re ~ 1000
  if (s.flies && W) {
    const A = W * (D ?? W), own = (s.massLimit ?? 1000 * W * (D ?? W) * (H ?? W) * 0.1), m = (s.payload ?? 0) + own, Pi = (m * g) ** 1.5 / Math.sqrt(2 * AIR.rho * A), vi = Math.sqrt((m * g) / (2 * AIR.rho * A)), Re = (AIR.rho * vi * W) / AIR.mu;
    const E = s.runFor !== undefined ? (Pi / 0.5) * s.runFor : undefined, cellKg = E !== undefined ? E / 3600 / CELL.whPerKg : undefined;
    out.push({ what: `it can hover with ${s.payload !== undefined ? `${fmt(s.payload * 1000)} g` : 'what it carries'}`, ok: Re >= 1000 && (cellKg === undefined || cellKg < m * 0.5), says: `${fmt(m * 1000)} g in all (its own taken as a tenth of water's density over its size, estimate) over ${fmt(A * 1e4)} cm²: momentum theory gives ${fmt(Pi)} W ideal, pushing air down at ${fmt(vi)} m/s, Re ${fmt(Re)}${Re < 1000 ? `: below about 1000 the theory does not hold, and viscosity takes far more` : ''}${E !== undefined ? `; for ${timeSay(s.runFor!)} at half that ideal (estimate) it needs ${fmt(E)} J, ${fmt(cellKg! * 1e9)} µg of cells${cellKg! >= m * 0.5 ? `, ${fmt(cellKg! / m)} times all it weighs: it cannot carry its own energy, it must be given it as it flies (by light or by radio)` : ''}` : ''}` });
  }
  // a heat engine: no more than Carnot's share, ΔT / T, of the heat that crosses it; the heat that crosses a thing its
  // size by conduction through water or tissue, k A ΔT / L, k = 0.5 W/(m K) (estimate)
  if (s.heatEngine && s.dT !== undefined) {
    const T = s.Tat ?? 310, eta = s.dT / T, L = W ?? 0.01, Q = 0.5 * L * L * s.dT / L, most = eta * Q, want = P('makes') ?? P('gives');
    out.push({ what: 'a heat engine on that difference gives what is asked', ok: want === undefined ? null : most >= want, says: `at most ${fmt(eta * 100)}% of the heat it passes (Carnot, ΔT / T at ${fmt(T)} K); ${fmt(Q)} W of heat crosses ${lenSay(L)} of water or tissue at ${s.dT} K (k A ΔT / L, k 0.5 W/(m K), estimate), so it gives at most ${fmt(most)} W${want !== undefined ? ` against the ${fmt(want)} W asked${most < want ? `: ${fmt(want / most)} times too little` : ''}` : ''}` });
  }
  // a motor: its torque, and the shear its air gap must carry for it at its size
  if (s.motor && (P('gives') ?? P('makes')) !== undefined && s.w !== undefined && W) {
    const Pm = (P('gives') ?? P('makes'))!, tq = Pm / s.w, R = W / 2, len = H ?? W, shear = tq / (2 * Math.PI * R * R * len), B = Math.sqrt(2 * 1.25663706212e-6 * shear);
    out.push({ what: `as a motor it gives ${fmt(Pm)} W turning once in ${timeSay((2 * Math.PI) / s.w)}`, ok: shear <= SHEAR, says: `${fmt(tq)} N·m of torque; on a rotor ${lenSay(W)} across and as long, its air gap carries ${fmt(shear)} Pa of shear (T / 2π R² L) against the 10 to 50 kPa electric machines carry (estimate): a field of about ${fmt(B * 1e6)} µT is enough (B² / 2μ0 at that shear)${shear <= SHEAR && shear < 1 ? ', far less than the Earth\'s own (about 50 µT): its size makes even a faint field turn it' : ''}` });
  }
  // light: what a cell of its face gathers at the light it is under, at 20% (estimate)
  if (s.light !== undefined && W && D) {
    const got = s.light * W * D * 0.2, need = P('draws');
    out.push({ what: 'the light on it powers it', ok: need === undefined ? null : got >= need, says: `${fmt(s.light)} W/m² on ${fmt(W * D * 1e4)} cm² at 20% (estimate) gives ${fmt(got)} W${need !== undefined ? ` against the ${fmt(need)} W it draws${got < need ? `: ${fmt(need / got)} times too little` : ''}` : ''}` });
  }
  return out;
}

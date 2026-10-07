// What a part does, worked out by its law from its own numbers and the ones you give it: a screw's proof load and the
// torque to tighten it, a spring's force at a deflection, a gear's mesh, a wire's drop, the resistor an LED needs, how
// long a cell lasts, how far a beam bends, a magnet's field, a thermistor's curve … Every law is named and every
// number not exact says what it is: a standard's, a handbook's, or typical.

import type { Item } from './inventory';
import { CHAINS, IPE, JST, METRIC, NDFEB, NPS40 } from './families';

/** Numbers given in words, in SI: "at 5 mm", "2 A", "12 V", "load 2 kN", "span 3 m", "at 1000 rpm", "60 °C", "with z40". */
export interface Given {
  length?: number; force?: number; current?: number; voltage?: number; power?: number; rpm?: number; temperature?: number;
  resistance?: number; time?: number; teeth?: number; kv?: number; capacity?: number; speed?: number; pressure?: number; span?: number; cantilever?: boolean; loop?: boolean;
}
const UNIT: [RegExp, keyof Given, number][] = [
  [/^(mm)$/i, 'length', 1e-3], [/^(cm)$/i, 'length', 1e-2], [/^(m)$/i, 'length', 1], [/^(kn)$/i, 'force', 1e3], [/^(n)$/i, 'force', 1],
  [/^(ma)$/i, 'current', 1e-3], [/^(a)$/i, 'current', 1], [/^(mv)$/i, 'voltage', 1e-3], [/^(v)$/i, 'voltage', 1], [/^(kw)$/i, 'power', 1e3], [/^(w)$/i, 'power', 1],
  [/^(rpm)$/i, 'rpm', 1], [/^(°c|c|degc)$/i, 'temperature', 1], [/^(k|kohm|kΩ)$/i, 'resistance', 1e3], [/^(mohm|mΩ|meg)$/i, 'resistance', 1e6], [/^(ohms?|Ω|r)$/i, 'resistance', 1],
  [/^(s)$/i, 'time', 1], [/^(min)$/i, 'time', 60], [/^(h)$/i, 'time', 3600], [/^(mah)$/i, 'capacity', 1e-3], [/^(ah)$/i, 'capacity', 1],
  [/^(m\/s)$/i, 'speed', 1], [/^(bar)$/i, 'pressure', 1e5], [/^(mpa)$/i, 'pressure', 1e6], [/^(kpa)$/i, 'pressure', 1e3], [/^(psi)$/i, 'pressure', 6894.76],
];
export function given(words: string): Given {
  const g: Given = {}, w = words.replace(/,/g, ' ');
  if (/\bcantilever|sticking out|from a wall\b/i.test(w)) g.cantilever = true;
  if (/\b(both ways|there and back|round trip|loop)\b/i.test(w)) g.loop = true;
  const kv = /\b(?:kv\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*kv)\b/i.exec(w); if (kv) g.kv = Number(kv[1] ?? kv[2]);
  const z = /\b(?:with\s+)?z\s*(\d+)\b|\b(\d+)\s*(?:teeth|t)\b/i.exec(w); if (z) g.teeth = Number(z[1] ?? z[2]);
  const span = /\bspan\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(mm|cm|m)\b/i.exec(w);
  for (const m of w.matchAll(/(-?\d+(?:\.\d+)?)\s*(m\/s|°c|degc|kohm|mohm|kΩ|mΩ|ohms?|Ω|mah|ah|rpm|bar|mpa|kpa|psi|kn|kw|mm|cm|ma|mv|min|meg|[mnavwskhcr])(?![a-z])/gi)) {
    const v = Number(m[1]), u = m[2]!;
    // "10k" alone is a resistance; "k" after a temperature would be kelvin, which is not read here
    const hit = UNIT.find(([re]) => re.test(u)); if (!hit) continue;
    const [, key, f] = hit; if (key === 'teeth' || key === 'kv') continue;
    if (g[key] === undefined) (g as Record<string, number>)[key] = v * f;
  }
  if (span) g.span = Number(span[1]) * (span[2] === 'mm' ? 1e-3 : span[2] === 'cm' ? 1e-2 : 1);
  return g;
}

export interface Behaviour { law: string; lines: string[]; values: Record<string, number> }
const f = (x: number, d = 2) => (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString('en-GB') : Math.abs(x) >= 100 ? x.toFixed(0) : x.toFixed(d).replace(/\.?0+$/, ''));
const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
/** The next E12 value at or above r. */
export const e12Up = (r: number): number => { const dec = 10 ** Math.floor(Math.log10(r)); for (const k of [...E12, 10]) if (k * dec >= r * 0.9999) return +(k * dec).toPrecision(3); return 10 * dec; };
/** Proof stress, MPa, by strength class (ISO 898-1 table 3; A2/A4-70 the 0.2 % stress of ISO 3506-1). */
export const PROOF: Record<string, number> = { '4.6': 225, '4.8': 310, '5.6': 280, '5.8': 380, '6.8': 440, '8.8': 580, '10.9': 830, '12.9': 970, A2: 450, A4: 450 };
/** Young's modulus, GPa (handbook values: steel 200, stainless 193, aluminium 69, brass 100, copper 117; EN 1993 takes 210 for structural steel). */
export const YOUNG: Record<string, number> = { steel: 200, stainless: 193, aluminium: 69, brass: 100, copper: 117, structural: 210 };
/** LED forward voltage at 20 mA, V: typical of datasheets for each colour. */
export const VF: Record<string, number> = { red: 2.0, orange: 2.0, yellow: 2.1, green: 3.0, blue: 3.0, white: 3.0, warm: 3.0, uv: 3.3, ir: 1.3 };
/** A cell's capacity, Ah: typical of the size's cells of the 2020s (makers' ranges in brackets in what is said). */
export const CELL_AH: Record<string, [number, string]> = { '18650': [3.0, '2.5–3.5'], '21700': [4.8, '4–5'], '14500': [0.8, '0.6–1'], '26650': [5.0, '4–5.5'] };

type Rule = (p: Record<string, string | number>, g: Given, i: Item) => Behaviour | string;
const bolted: Rule = (p, g, i) => {
  const t = String(p.thread), T = METRIC[t]; if (!T) return 'No thread to work from.';
  if (i.sized?.family === 'setscrew') return 'A set screw is classed by its hardness (45H), not by a proof load: it holds by its point biting the shaft.';
  const d = Number(t.slice(1)), cl = String(p.class ?? (i.sized?.family === 'threadedrod' ? '4.8' : '8.8')), sp = cl === '8.8' && d > 16 ? 600 : PROOF[cl] ?? 580;
  const As = (Math.PI / 4) * (d - 0.9382 * T.p) ** 2, Fp = As * sp, Fi = 0.75 * Fp, Tq = 0.2 * Fi * d / 1000;
  const lines = [`Stress area ${f(As)} mm² (ISO 898-1: π/4 · (d − 0.9382 p)²).`, `Proof load ${f(Fp / 1000)} kN at class ${cl} (proof stress ${sp} MPa).`, `Clamp it to about 75 % of that, ${f(Fi / 1000)} kN, with about ${f(Tq)} N·m (T = K·F·d, K ≈ 0.2 for dry steel: an estimate; oiled threads need less).`];
  if (g.force) lines.push(`Under ${f(g.force / 1000)} kN it is at ${f((100 * g.force) / Fp, 0)} % of its proof load: ${g.force < Fp ? `a factor of ${f(Fp / g.force)} to spare` : 'past it: it will stretch for good'}.`);
  return { law: 'bolt proof load and preload (ISO 898-1; T = K F d)', lines, values: { stress_area_mm2: As, proof_kN: Fp / 1000, preload_kN: Fi / 1000, torque_Nm: Tq } };
};
const RULES: Record<string, Rule> = {
  screw: bolted, bolt: bolted, threadedrod: bolted, setscrew: bolted,
  spring(p, g): Behaviour | string {
    const d = Number(p.d), D = Number(p.D), L = Number(p.L), n = Number(p.n), G = 79.3e3, k = (G * d ** 4) / (8 * D ** 3 * n), C = D / d, Kw = (4 * C - 1) / (4 * C - 4) + 0.615 / C;
    const solid = (n + 2) * d, travel = Math.max(0, L - solid), Sut = 2211 * d ** -0.145, allow = 0.45 * Sut;
    const lines = [`Rate ${f(k)} N/mm (k = G d⁴ / 8 D³ n, music wire G 79.3 GPa).`, `Solid at about ${f(solid)} mm with closed ends (n + 2 coils), so ${f(travel)} mm of travel.`];
    let x = g.length !== undefined ? g.length * 1000 : g.force !== undefined ? g.force / k : travel;
    if (x > travel) { lines.push(`It cannot go ${f(x)} mm: it is solid after ${f(travel)} mm.`); x = travel; }
    const F = k * x, tau = (Kw * 8 * F * D) / (Math.PI * d ** 3);
    lines.push(`At ${f(x)} mm: ${f(F)} N, and the wire's shear stress ${f(tau)} MPa (Wahl factor ${f(Kw, 3)}) against about ${f(allow)} MPa it may take statically (0.45 × its tensile strength, ${f(Sut)} MPa for music wire this thick: Shigley, table 10-4).`);
    return { law: 'helical spring (k = G d⁴ / 8 D³ n; τ = K_w 8 F D / π d³)', lines, values: { rate_N_mm: k, force_N: F, deflection_mm: x, stress_MPa: tau, travel_mm: travel } };
  },
  gear(p, g): Behaviour | string {
    const m = Number(p.m), z = Number(p.z), d = m * z, lines = [`Pitch circle ${f(d)} mm, outside ${f(m * (z + 2))} mm, root about ${f(m * (z - 2.5))} mm (module ${m}).`], values: Record<string, number> = { pitch_mm: d };
    if (g.teeth) { const r = g.teeth / z; lines.push(`With a ${g.teeth}-tooth gear of the same module: ratio ${f(r, 3)} : 1, centres ${f((m * (z + g.teeth)) / 2)} mm apart.`); values.ratio = r; }
    if (g.rpm) { const v = (Math.PI * d * g.rpm) / 60000; lines.push(`At ${f(g.rpm)} rpm its pitch line moves at ${f(v)} m/s${g.teeth ? `, and the other turns at ${f((g.rpm * z) / g.teeth)} rpm` : ''}.`); values.pitch_line_m_s = v; }
    if (g.rpm && g.power) { const Tq = g.power / ((2 * Math.PI * g.rpm) / 60), Ft = (2 * Tq) / (d / 1000); lines.push(`Carrying ${f(g.power)} W: ${f(Tq)} N·m on it, ${f(Ft)} N at its teeth.`); values.torque_Nm = Tq; values.tooth_force_N = Ft; }
    if (lines.length === 1) lines.push('Say "with z40" for its mesh, "at 1000 rpm" for its speed, and "200 W" for its load.');
    return { law: 'spur gear (d = m z; ratio z₂/z₁; a = m (z₁ + z₂) / 2)', lines, values };
  },
  pulley(p, g): Behaviour | string {
    const z = Number(p.teeth), mm = 2 * z, spm = 3200 / mm, lines = [`${mm} mm of GT2 belt a turn (2 mm pitch × ${z} teeth); ${f(spm)} steps/mm with a 1.8° stepper at 16 microsteps.`], values: Record<string, number> = { mm_per_rev: mm, steps_per_mm: spm };
    if (g.rpm) { const v = (mm * g.rpm) / 60; lines.push(`At ${f(g.rpm)} rpm the belt runs ${f(v)} mm/s.`); values.belt_mm_s = v; }
    return { law: 'toothed belt (travel = pitch × teeth a turn)', lines, values };
  },
  leadscrew(p, g): Behaviour | string {
    const d = Number(p.d), pitch = Number(p.pitch), starts = Number(p.starts), lead = pitch * starts, dm = d - pitch / 2, lam = Math.atan(lead / (Math.PI * dm)), mu = 0.15;
    const lines = [`Lead ${f(lead)} mm a turn (${pitch} mm pitch × ${starts} start${starts === 1 ? '' : 's'}); ${f(3200 / lead)} steps/mm with a 1.8° stepper at 16 microsteps.`, `Lead angle ${f((lam * 180) / Math.PI, 1)}°: ${Math.tan(lam) < mu ? 'it holds a load without a brake (tan λ below friction of about 0.15, a brass nut on steel: an estimate)' : 'a load on it can back-drive it (tan λ above friction of about 0.15, an estimate): it needs a brake or a held motor'}.`];
    const values: Record<string, number> = { lead_mm: lead, steps_per_mm: 3200 / lead, lead_angle_deg: (lam * 180) / Math.PI };
    if (g.rpm) { lines.push(`At ${f(g.rpm)} rpm the nut moves ${f((lead * g.rpm) / 60)} mm/s.`); values.nut_mm_s = (lead * g.rpm) / 60; }
    return { law: 'lead screw (lead = pitch × starts; self-locking when tan λ < μ)', lines, values };
  },
  stepper(_p, g): Behaviour | string {
    const lines = ['200 steps a turn (1.8°); 3200 at 16 microsteps.'], values: Record<string, number> = { steps_rev: 200 };
    if (g.rpm) { lines.push(`At ${f(g.rpm)} rpm it takes ${f((g.rpm / 60) * 3200)} microsteps a second.`); values.step_rate = (g.rpm / 60) * 3200; }
    return { law: 'stepper (360° / 1.8° = 200 steps)', lines, values };
  },
  wire(p, g): Behaviour | string {
    const n = Number(p.awg), d = 0.127 * 92 ** ((36 - n) / 39), A = (Math.PI * d * d) / 4, rpm = 1.7241e-8 / (A * 1e-6), L = g.length ?? Number(p.length ?? 1), run = (g.loop ? 2 : 1) * L, R = rpm * run;
    const lines = [`${f(d, 3)} mm, ${f(A, 3)} mm² (the AWG formula); ${f(rpm * 1000)} mΩ a metre (annealed copper, 1.7241 × 10⁻⁸ Ω·m at 20 °C: the IACS standard wire tables use).`, `${f(run)} m of it${g.loop ? ', there and back' : ''}: ${f(R * 1000)} mΩ.`];
    const values: Record<string, number> = { d_mm: d, area_mm2: A, ohm_per_m: rpm, ohm: R };
    if (g.current) { const V = g.current * R; lines.push(`At ${f(g.current)} A: ${f(V)} V lost, ${f(g.current ** 2 * R)} W as heat, ${f(g.current / A)} A/mm² in the copper.`); values.drop_V = V; values.loss_W = g.current ** 2 * R; }
    return { law: 'resistance of a wire (R = ρ L / A)', lines, values };
  },
  resistor(p, g): Behaviour | string {
    const R = Number(p.ohms), W = Number(p.watts), V = g.voltage ?? (g.current ? g.current * R : undefined);
    if (V === undefined) return { law: "Ohm's law", lines: [`${f(R)} Ω, rated ${W} W: it takes up to ${f(Math.sqrt(W * R))} V across it at its rating.`], values: { ohm: R, max_V: Math.sqrt(W * R) } };
    const I = V / R, P = V * I;
    return { law: "Ohm's law (I = V / R; P = V I)", lines: [`At ${f(V)} V: ${f(I * 1000)} mA through it, ${f(P)} W in it, ${P <= W ? `within its ${W} W` : `past its ${W} W: it will burn; use ${P <= 0.5 ? '½' : P <= 1 ? '1' : P <= 2 ? '2' : `${Math.ceil(P)}`} W or a bigger value`}.`], values: { current_mA: I * 1000, power_W: P } };
  },
  led(p, g): Behaviour | string {
    const c = String(p.colour), Vf = VF[c] ?? 2.0, If = 0.02, Vs = g.voltage ?? 5;
    if (Vs <= Vf) return `${f(Vs)} V is under the LED's ${Vf} V: it will not light.`;
    const R = (Vs - Vf) / If, Rn = e12Up(R), I = (Vs - Vf) / Rn;
    return { law: 'LED series resistor (R = (V − V_f) / I)', lines: [`A ${c} LED drops about ${Vf} V at 20 mA (typical of datasheets).`, `From ${f(Vs)} V it needs ${f(R)} Ω: use ${f(Rn)} Ω (the next E12 value), for ${f(I * 1000)} mA and ${f(I * I * Rn * 1000)} mW in the resistor.`], values: { vf_V: Vf, resistor_ohm: Rn, current_mA: I * 1000 } };
  },
  cell(p, g): Behaviour | string {
    const size = String(p.size), [Ah0, range] = CELL_AH[size] ?? [3, '?'], Ah = g.capacity ?? Ah0, Wh = 3.6 * Ah, lines = [`About ${f(Ah)} Ah${g.capacity ? '' : ` (typical; ${range} Ah by maker)`} at 3.6 V nominal: ${f(Wh)} Wh.`], values: Record<string, number> = { Ah, Wh };
    if (g.current) { lines.push(`At ${f(g.current)} A it runs about ${f(Ah / g.current)} h (less at high currents: the cell's own resistance takes some).`); values.hours = Ah / g.current; }
    else if (g.power) { lines.push(`Giving ${f(g.power)} W it runs about ${f(Wh / g.power)} h.`); values.hours = Wh / g.power; }
    return { law: 'capacity (t = Ah / I; Wh = V Ah)', lines, values };
  },
  pack(p, g): Behaviour | string {
    const S = Number(p.s), P = Number(p.p), Ah = g.capacity ?? 3.0 * P, V = 3.6 * S, Wh = V * Ah, lines = [`${S} in series, ${P} side by side: ${f(V)} V nominal (${f(4.2 * S)} V full, about ${f(3.0 * S)} V empty), about ${f(Ah)} Ah, ${f(Wh)} Wh (18650 cells of 3 Ah, typical).`], values: Record<string, number> = { V, Ah, Wh };
    if (g.current) { lines.push(`At ${f(g.current)} A: about ${f(Ah / g.current)} h.`); values.hours = Ah / g.current; } else if (g.power) { lines.push(`Giving ${f(g.power)} W: about ${f(Wh / g.power)} h.`); values.hours = Wh / g.power; }
    return { law: 'cells in series and parallel (V = S × 3.6 V; Ah = P × cell)', lines, values };
  },
  capacitor(p, g): Behaviour | string {
    const C = Number(p.farads), V = g.voltage ?? Number(p.volts), E = 0.5 * C * V * V, lines = [`At ${f(V)} V it holds ${E < 0.01 ? `${f(E * 1000)} mJ` : `${f(E)} J`} (E = ½ C V²).`], values: Record<string, number> = { energy_J: E };
    if (g.resistance) { const tau = g.resistance * C; lines.push(`Through ${f(g.resistance)} Ω: τ = ${tau < 1 ? `${f(tau * 1000)} ms` : `${f(tau)} s`}; charged to 99 % in 5τ.`); values.tau_s = tau; }
    if (V > Number(p.volts)) lines.push(`${f(V)} V is past its ${p.volts} V rating.`);
    return { law: 'capacitor (E = ½ C V²; τ = R C)', lines, values };
  },
  dcmotor(p, g): Behaviour | string {
    const V = g.voltage ?? Number(p.volts);
    if (!g.kv || !g.resistance) return `A brushed motor's numbers are its maker's: say its speed constant and winding resistance, as "at ${V}V kv 1500 2ohm", and I work out the rest.`;
    const kt = 60 / (2 * Math.PI * g.kv), Is = V / g.resistance, Ts = kt * Is, w0 = g.kv * V, Pmax = (V * V) / (4 * g.resistance);
    return { law: 'DC motor (no-load speed Kv V; stall torque Kt V / R; Kt = 60 / 2π Kv)', lines: [`At ${f(V)} V: about ${f(w0)} rpm unloaded, ${f(Is)} A and ${f(Ts * 1000)} mN·m stalled (Kt ${f(kt * 1000, 3)} mN·m/A).`, `Its most power out, ${f(Pmax)} W, at half speed and half the stall torque (ignoring friction).`], values: { rpm0: w0, stall_A: Is, stall_mNm: Ts * 1000, max_W: Pmax } };
  },
  servo(p, g): Behaviour | string {
    const T = { micro: 1.8, standard: 9.4 }[String(p.size)] ?? 1.8, Nm = T * 9.80665 / 100, r = (g.length ?? 0.02) * 1000;
    return { law: 'torque at an arm (F = T / r)', lines: [`${T} kg·cm (${f(Nm, 3)} N·m) at 4.8 V, from its maker: at an arm of ${f(r)} mm it pushes ${f(Nm / (r / 1000))} N, lifts ${f(T / (r / 10))} kg.`], values: { torque_Nm: Nm, force_N: Nm / (r / 1000) } };
  },
  rod(p, g): Behaviour | string { return beam(p, g, 'rod'); },
  tube(p, g): Behaviour | string { return beam(p, g, 'tube'); },
  ibeam(p, g): Behaviour | string {
    const [h, , , , kgm, Iy, Wy] = IPE[String(p.size)]!, L = g.span ?? g.length ?? Number(p.length), W = g.force ?? 10e3, E = 210e9, I = Iy * 1e-8, w = W / L;
    const d = (5 * w * L ** 4) / (384 * E * I), M = (w * L * L) / 8, s = M / (Wy * 1e-6) / 1e6;
    return { law: 'simply supported beam under an even load (δ = 5 w L⁴ / 384 E I; σ = M / W)', lines: [`IPE ${p.size} over ${f(L)} m carrying ${f(W / 1000)} kN spread along it (and its own ${f(kgm * L * 9.81 / 1000)} kN, not counted):`, `it bends ${f(d * 1000)} mm in the middle (L/${f(L / d, 0)}; L/300 is a common limit), and its flanges carry ${f(s)} MPa against S235's 235 MPa (EN 10025-2) and S355's 355.`], values: { deflection_mm: d * 1000, stress_MPa: s, moment_kNm: M / 1000, h_mm: h } };
  },
  magnet(p, g): Behaviour | string {
    const D = Number(p.d) / 1000, h = Number(p.h) / 1000, R = D / 2, Br = NDFEB[String(p.grade)] ?? 1.3, z = g.length ?? 0;
    const B = (Br / 2) * ((h + z) / Math.sqrt(R * R + (h + z) ** 2) - z / Math.sqrt(R * R + z * z));
    return { law: 'field on the axis of a cylinder magnet (B = Br/2 · [(h+z)/√(R²+(h+z)²) − z/√(R²+z²)])', lines: [`${z ? `${f(z * 1000)} mm from its face` : 'At its face'}, on its axis: ${f(B * 1000)} mT (Br ${Br} T for ${p.grade}, the middle of the grade's range).`], values: { field_mT: B * 1000 } };
  },
  heater(p, g): Behaviour | string {
    const V0 = Number(p.volts), W0 = Number(p.watts), R = (V0 * V0) / W0, V = g.voltage ?? V0, P = (V * V) / R;
    return { law: 'resistive heater (R = V² / P)', lines: [`${f(R)} Ω cold-to-hot about the same for nichrome; at ${f(V)} V it gives ${f(P)} W${V !== V0 ? ` (rated ${W0} W at ${V0} V)` : ''}, drawing ${f(V / R)} A.`], values: { ohm: R, power_W: P, current_A: V / R } };
  },
  thermistor(p, g): Behaviour | string {
    const R25 = Number(p.r25), B = Number(p.beta), T0 = 298.15;
    if (g.resistance) { const T = 1 / (1 / T0 + Math.log(g.resistance / R25) / B) - 273.15; return { law: 'NTC β model (1/T = 1/T₀ + ln(R/R₀)/β)', lines: [`At ${f(g.resistance)} Ω it is at about ${f(T, 1)} °C.`], values: { temperature_C: T } }; }
    const t = g.temperature ?? 200, R = R25 * Math.exp(B * (1 / (t + 273.15) - 1 / T0));
    return { law: 'NTC β model (R = R₀ e^(β (1/T − 1/T₀)))', lines: [`At ${f(t)} °C: ${f(R)} Ω (${f(R25)} Ω at 25 °C, β ${B} K). The β model drifts a few degrees far from 25 °C; makers give tables for that.`], values: { ohm: R } };
  },
  pipe(p, g): Behaviour | string {
    const [OD, t] = NPS40[String(p.nps)]!, ID = OD - 2 * t, A = (Math.PI * (ID / 1000) ** 2) / 4, lines = [`${f(ID)} mm inside: ${f(A * 1e6)} mm² to flow through.`], values: Record<string, number> = { id_mm: ID, area_mm2: A * 1e6 };
    if (g.speed) { const Q = A * g.speed * 60000; lines.push(`At ${f(g.speed)} m/s: ${f(Q)} L/min.`); values.flow_L_min = Q; }
    if (g.pressure) { const s = (g.pressure * OD) / (2 * t) / 1e6; lines.push(`At ${f(g.pressure / 1e5)} bar its wall carries ${f(s)} MPa round it (σ = P D / 2 t, thin-wall).`); values.hoop_MPa = s; }
    return { law: 'pipe flow and hoop stress (Q = A v; σ = P D / 2 t)', lines, values };
  },
  sprocket(p, g): Behaviour | string {
    const C = CHAINS[String(p.series)]!, z = Number(p.z), D = C.p / Math.sin(Math.PI / z), lines = [`Pitch circle ${f(D)} mm (p / sin(180° / ${z})).`], values: Record<string, number> = { pitch_mm: D };
    if (g.teeth) { lines.push(`With a ${g.teeth}-tooth sprocket: ratio ${f(g.teeth / z, 3)} : 1.`); values.ratio = g.teeth / z; }
    if (g.rpm) { const v = (z * C.p * g.rpm) / 60000; lines.push(`At ${f(g.rpm)} rpm the chain runs ${f(v)} m/s.`); values.chain_m_s = v; }
    return { law: 'sprocket (D = p / sin(180°/z); v = z p n)', lines, values };
  },
  oring(p, g): Behaviour | string {
    const cs = Number(p.cs);
    if (g.length === undefined) return { law: 'O-ring squeeze', lines: [`${cs} mm section: say the gland depth, "in 1.6mm", for its squeeze.`], values: {} };
    const gl = g.length * 1000, sq = ((cs - gl) / cs) * 100;
    return { law: 'O-ring squeeze ((cs − gland) / cs)', lines: [`In a ${f(gl)} mm gland: ${f(sq, 1)} % squeeze${sq < 10 ? ', too little to seal' : sq > 35 ? ', too much: it will take a set' : ''} (a static seal wants roughly 15–30 %: Parker O-Ring Handbook).`], values: { squeeze_pct: sq } };
  },
  jst(p, g): Behaviour | string {
    const J = JST[String(p.series)]!;
    return { law: 'contact rating', lines: [`${J.amps} A a contact (JST ${p.series}).${g.current ? ` At ${f(g.current)} A: ${g.current <= J.amps ? 'within it' : 'past it: use two contacts, or VH'}.` : ''}`], values: { amps: J.amps } };
  },
  extrusion(): Behaviour | string { return "An extrusion's bending needs its maker's moment of inertia (the slots make it far less than a solid bar's): give it, or use a rod, tube or IPE beam, whose numbers are known."; },
};
/** A rod or tube as a beam: centre load on a span, or held at one end. */
function beam(p: Record<string, string | number>, g: Given, kind: 'rod' | 'tube'): Behaviour {
  const mt = String(p.matter), E = (YOUNG[mt] ?? 200) * 1e9, L = g.span ?? g.length ?? Number(p.length) / 1000, F = g.force ?? 100;
  let I: number, c: number, says: string;
  if (kind === 'rod') { const d = Number(p.d) / 1000; I = (Math.PI * d ** 4) / 64; c = d / 2; says = `${/^(8|11|18)/.test(String(p.d)) ? 'an' : 'a'} ${p.d} mm ${mt} rod`; }
  else { const D = Number(p.od) / 1000, t = Number(p.wall) / 1000, sq = p.shape === 'square'; I = sq ? (D ** 4 - (D - 2 * t) ** 4) / 12 : (Math.PI * (D ** 4 - (D - 2 * t) ** 4)) / 64; c = D / 2; says = `${/^(8|11|18)/.test(String(p.od)) ? 'an' : 'a'} ${p.od} × ${p.wall} mm ${p.shape} ${mt} tube`; }
  const cant = !!g.cantilever, d = cant ? (F * L ** 3) / (3 * E * I) : (F * L ** 3) / (48 * E * I), M = cant ? F * L : (F * L) / 4, s = (M * c) / I / 1e6;
  return { law: cant ? 'cantilever (δ = F L³ / 3 E I)' : 'simply supported, load in the middle (δ = F L³ / 48 E I)', lines: [`${says[0]!.toUpperCase()}${says.slice(1)}, ${cant ? `held at one end and sticking out ${f(L * 1000)} mm` : `on two supports ${f(L * 1000)} mm apart`}, ${f(F)} N ${cant ? 'at its end' : 'in the middle'}:`, `it bends ${f(d * 1000, 3)} mm, its surface stressed to ${f(s)} MPa (E ${E / 1e9} GPa, a handbook value).`], values: { deflection_mm: d * 1000, stress_MPa: s, I_mm4: I * 1e12 } };
}
/** What an item does, worked out from its sizes and what you give it in words. A part made to sizes by a family has
 *  its family's law; one of the seeded examples of a family uses that family's first example's sizes. */
export function behave(i: Item, words = '', families?: { id: string; examples: string[] }[], call?: (w: string) => Item | string | null): Behaviour | string {
  let sized = i.sized;
  if (!sized && i.family && families && call) { const fam = families.find((x) => x.id === i.family); const ex = fam && call(fam.examples[0]!); if (ex && typeof ex === 'object') sized = ex.sized; }
  if (!sized) return `${i.name} has no law of its own here: it is ${i.kind === 'material' ? 'a material' : 'made of its parts'}; ask what one of its parts does.`;
  // a kind of bought part made from its table: what it does is in its own numbers, worked out from its standard and law
  const rule = RULES[sized.family]; if (!rule) return i.spec ? { law: 'its standard, and the law in each of its numbers', lines: [i.spec.replace(/ \(sizes: [\s\S]*\)$/, '')], values: {} } : `${i.name} has no behaviour worked out here yet.`;
  return rule(sized.params, given(words), i);
}
export const BEHAVIOURS = Object.keys(RULES);

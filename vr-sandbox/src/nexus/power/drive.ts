// A powertrain on the road, worked out from what it is: its engine's torque at each speed (power/cycle.ts), its
// gearbox's ratios (a manual's gears, or a CVT's range and its launch gear), its final drive, the radius its tyres roll
// on (from their size code), what it weighs and what the air and its tyres take from it. At each road speed, the most it
// can pull (the best ratio for that speed, its engine kept between idle and redline), less what it takes to keep going,
// over its mass and its turning parts' share: the most it can speed up, which anything driving it (Follow a path) uses.


/** The air (ISO 2533 at sea level, 15 °C: 1.225 kg/m³) and gravity (standard: 9.80665 m/s²). */
export const RHO = 1.225, G = 9.80665;
export type Gearbox = { kind: 'manual'; ratios: number[]; source?: string } | { kind: 'cvt'; /** the belt's lowest and highest ratios */ low: number; high: number; /** a launch gear below the belt, if it has one */ launch?: number; source?: string };
export interface Powertrain { curve: { rpm: number; torque: number }[]; gearbox: Gearbox; final: number; /** from crank to wheels (0.9, typical of a front-drive transaxle) */ efficiency?: number; idle?: number; redline?: number }
export interface Road { mass: number; /** m */ tyreR: number; /** drag area Cd × A, m² */ CdA: number; /** rolling resistance (0.010, typical of a passenger tyre) */ Crr?: number; /** the share of its weight on its driven wheels, and their grip (0.6 and 0.9, typical of front drive on dry asphalt) */ driven?: number; mu?: number; /** its turning parts' inertia as a share of its mass (0.05, typical) */ rotating?: number }

/** The radius a tyre rolls on, from its size code (205/55R16: its rim's radius plus its sidewall, 205 mm × 55 %); a size
 *  in inches (24x8-12) its diameter's half. */
export function tyreRadius(code: string): number {
  const m = /^(\d{3})\/(\d{2})\s*Z?R\s*(\d{2})/i.exec(code); if (m) return (Number(m[3]) * 25.4) / 2000 + (Number(m[1]) * Number(m[2])) / 100 / 1000;
  const n = /^(\d+(?:\.\d+)?)x/i.exec(code); if (n) return (Number(n[1]) * 0.0254) / 2;
  throw new Error(`"${code}" is not a tyre size code (205/55R16, or 24x8-12)`);
}
const torqueAt = (pt: Powertrain, rpm: number) => { const c = pt.curve; if (rpm <= c[0]!.rpm) return c[0]!.torque; for (let k = 1; k < c.length; k++) if (rpm <= c[k]!.rpm) { const a = c[k - 1]!, b = c[k]!, u = (rpm - a.rpm) / (b.rpm - a.rpm); return a.torque + u * (b.torque - a.torque); } return c[c.length - 1]!.torque; };

/** The most it pulls at a road speed: the best of its ratios, its engine held between idle and redline (below idle at
 *  the start, it slips its clutch or converter and gives its idle torque), and no more than its driven tyres grip. */
export function pullAt(pt: Powertrain, road: Road, v: number): { force: number; ratio: number; rpm: number } {
  const eff = pt.efficiency ?? 0.9, idle = pt.idle ?? 800, red = pt.redline ?? Math.max(...pt.curve.map((c) => c.rpm)), w = Math.max(v, 0) / road.tyreR;
  const ratios = pt.gearbox.kind === 'manual' ? pt.gearbox.ratios : (() => { const g = pt.gearbox, out: number[] = [], lo = g.launch ?? g.low; for (let k = 0; k <= 60; k++) out.push(g.high + ((lo - g.high) * k) / 60); return out; })();
  let best = { force: 0, ratio: ratios[0]!, rpm: idle };
  for (const r of ratios) { const rpm = (w * r * pt.final * 60) / (2 * Math.PI); if (rpm > red) continue; const n = Math.max(rpm, idle), F = (torqueAt(pt, n) * r * pt.final * eff) / road.tyreR; if (F > best.force) best = { force: F, ratio: r, rpm: n }; }
  const grip = (road.driven ?? 0.6) * (road.mu ?? 0.9) * road.mass * G; if (best.force > grip) best = { ...best, force: grip };
  return best;
}
export const resistance = (road: Road, v: number, grade = 0) => (road.Crr ?? 0.01) * road.mass * G * Math.cos(Math.atan(grade)) + 0.5 * RHO * road.CdA * v * v + road.mass * G * Math.sin(Math.atan(grade));

export interface Drive { capability: { speed: number; accel: number; ratio: number; rpm: number }[]; zeroTo100: number; top: number; trace: { t: number; v: number; rpm: number; ratio: number }[]; says: string }
/** What it can do: the most it can speed up at each speed, how long from rest to 100 km/h, its top speed on the flat. */
export function drive(pt: Powertrain, road: Road): Drive {
  const m = road.mass * (1 + (road.rotating ?? 0.05)), capability: Drive['capability'] = [];
  let top = 0; for (let v = 0; v < 120; v += 0.25) { const p = pullAt(pt, road, v), a = (p.force - resistance(road, v)) / m; if (v % 1 === 0) capability.push({ speed: v, accel: Math.max(0, a), ratio: p.ratio, rpm: Math.round(p.rpm) }); if (a > 0) top = v; else if (v > 5) break; }
  const trace: Drive['trace'] = []; let v = 0, t = 0, z = NaN;
  while (t < 60 && v < Math.min(top, 100 / 3.6 + 5)) { const p = pullAt(pt, road, v), a = (p.force - resistance(road, v)) / m; if (Math.round(t * 100) % 25 === 0) trace.push({ t: Math.round(t * 100) / 100, v, rpm: Math.round(p.rpm), ratio: p.ratio }); v += a * 0.01; t += 0.01; if (Number.isNaN(z) && v >= 100 / 3.6) z = t; if (a <= 1e-4) break; }
  return { capability, zeroTo100: z, top, trace, says: `from rest to 100 km/h in ${Number.isFinite(z) ? z.toFixed(1) : 'never'} s; ${(top * 3.6).toFixed(0)} km/h flat out (pulling ${capability[0] ? (capability[0].accel / G).toFixed(2) : 0} g from rest)` };
}

/** What is known of real powertrains, to run them by name (each figure's source with it). */
export const POWERTRAINS: Record<string, { engine: { cr: number; rod?: number; source: string }; gearbox: Gearbox; final: number; idle: number; redline: number; CdA: number; source: string }> = {
  corolla: {
    engine: { cr: 13.0, source: 'M20A-FKS 13.0:1 (mymotorlist.com engine listing; Toyota quotes up to 14:1 across the Dynamic Force family)' },
    gearbox: { kind: 'cvt', launch: 3.377, low: 2.236, high: 0.447, source: 'K120 Direct Shift-CVT: launch gear 3.377, belt 2.236 to 0.447 (toyota-club.net CVT FAQ, a third-party listing)' },
    final: 4.262, idle: 700, redline: 6600, CdA: 0.3 * 0.84 * 1.78 * 1.435,
    source: 'final drive 4.262 (the same FAQ); idle 700 rpm (typical); redline its rated speed, 6,600 rpm (Toyota); drag area Cd 0.30 (typical of a sedan, an estimate) times 0.84 of its width by its height (typical)',
  },
};

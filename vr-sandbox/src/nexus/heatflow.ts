// Heat between things that touch, and from each to the room's air, in time. Each thing is one temperature (lumped: fair
// while its Biot number h L / k is small, as for metal; a thick piece of wood or plastic runs hotter outside than in,
// and is said to); each pair that touches passes heat through the conductance between their middles: from each one's
// middle to the face they touch through, L / (k A), and across the face itself, its contact resistance R'' / A. Each
// loses heat to still air by natural convection and radiation (heatLoss, Holman's simplified air correlation and
// eps sigma (T^4 - Ta^4)). Stepped implicitly (backward Euler, Gauss-Seidel), so it is stable at any step; what goes
// in, what goes to the air and what is stored balance to rounding.

import { AMBIENT, heatLoss } from '../engineering/thermal';

/** Where two things only touch, pressed lightly, in air: an aluminium interface of 10 um roughness at 10^5 N/m^2 with
 *  air between, R'' = 2.75e-4 m^2 K/W (Incropera, Fundamentals of Heat and Mass Transfer, 7th ed., Table 3.1b). Used
 *  for every pair that touches, not only aluminium, since no other pair's figure is kept: an estimate past aluminium. */
export const TOUCHING_R = 2.75e-4;
/** A glue line conducts as a polymer layer: about 0.2 W/(m K) for an unfilled epoxy or acrylic (estimated; fillers
 *  raise it), over the glue's own bond-line thickness. */
export const GLUE_K = 0.2;

export interface HeatNode { name: string; /** J/K */ C: number; /** deg C */ T0: number; /** W put in */ P: number; /** m^2 open to the air */ area: number; /** m, its height, for the air */ L: number; emissivity: number }
export interface HeatLink { a: number; b: number; /** W/K */ G: number }
export interface HeatRun { t: number[]; T: number[][]; end: number[]; /** J over the run: put in, lost to the air, held more at the end than at the start */ energy: { in: number; air: number; stored: number }; /** W/K to the air at the end, each */ gAir: number[] }

/** So many seconds of heat moving: sampled at about 200 moments. */
export function flowHeat(nodes: HeatNode[], links: HeatLink[], seconds: number, ambient = AMBIENT): HeatRun {
  const n = nodes.length, T = nodes.map((x) => x.T0), steps = Math.min(4000, Math.max(200, Math.ceil(seconds / 0.5))), dt = seconds / steps;
  const nb: { j: number; G: number }[][] = nodes.map(() => []);
  for (const l of links) { nb[l.a]!.push({ j: l.b, G: l.G }); nb[l.b]!.push({ j: l.a, G: l.G }); }
  const out: HeatRun = { t: [0], T: nodes.map((x) => [x.T0]), end: [], energy: { in: 0, air: 0, stored: 0 }, gAir: [] };
  const gOf = (i: number, t: number) => { const x = nodes[i]!, d = Math.abs(t - ambient) < 1e-3 ? 1e-3 : t - ambient; return x.area > 0 ? heatLoss(ambient + d, x.area, x.L, x.emissivity, ambient) / d : 0; };
  let g = T.map((t, i) => gOf(i, t)), every = Math.max(1, Math.round(steps / 200));
  for (let s = 1; s <= steps; s++) {
    const old = [...T];
    for (let it = 0; it < 500; it++) {
      let most = 0;
      for (let i = 0; i < n; i++) {
        const x = nodes[i]!, c = x.C / dt; let num = c * old[i]! + x.P + g[i]! * ambient, den = c + g[i]!;
        for (const e of nb[i]!) { num += e.G * T[e.j]!; den += e.G; }
        const v = num / den; most = Math.max(most, Math.abs(v - T[i]!)); T[i] = v;
      }
      if (most < 1e-9) break;
    }
    for (let i = 0; i < n; i++) { out.energy.in += nodes[i]!.P * dt; out.energy.air += g[i]! * (T[i]! - ambient) * dt; }
    // the air's pull read again at the new temperatures, for the next step
    g = T.map((t, i) => gOf(i, t));
    if (s % every === 0 || s === steps) { out.t.push(s * dt); for (let i = 0; i < n; i++) out.T[i]!.push(T[i]!); }
  }
  out.end = [...T]; out.gAir = g;
  out.energy.stored = nodes.reduce((a, x, i) => a + x.C * (T[i]! - x.T0), 0);
  return out;
}

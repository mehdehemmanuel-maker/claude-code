// What a thing gives off into the air (docs/LIFE.md, section 4): a gas is a substance, given off by a source at a rate,
// carried by the air and thinned as it goes. A smell is one sense's reading of it, not the thing itself: carbon monoxide
// has none and harms, hydrogen has none and burns, a few parts per billion of hydrogen sulphide are smelled at once. So
// each substance carries what it does at each concentration (smelled, harmful, flammable), each source says what it
// gives off and how fast (from the physics where it can: an engine's exhaust from its displacement and speed, a
// battery's hydrogen by Faraday's law), and the air carries it: in still air it spreads as from a point into a room
// stirred by its own draughts; in a wind, as a plume (Briggs' spreads for neutral air).

import * as THREE from 'three';
import type { Part, V3 } from '../kits';
import { layout, type Node } from '../make/space';

export interface Substance {
  id: string; name: string; /** g/mol */ M: number;
  /** the least most people smell, as a volume fraction; null if it has no smell */ smell: number | null; smellsOf?: string;
  /** a limit for a working day (a time-weighted average), and where it is dangerous at once, volume fractions */ harm?: number; deadly?: number;
  /** its lower flammable limit in air, volume fraction */ burns?: number;
  source: string;
}
const ppm = 1e-6;
export const SUBSTANCES: Record<string, Substance> = {
  co: { id: 'co', name: 'carbon monoxide', M: 28.01, smell: null, harm: 35 * ppm, deadly: 1200 * ppm, burns: 0.125, source: 'odourless; NIOSH REL 35 ppm, IDLH 1,200 ppm; LEL 12.5 % (NFPA)' },
  h2: { id: 'h2', name: 'hydrogen', M: 2.016, smell: null, burns: 0.04, source: 'odourless; LEL 4 % (NFPA)' },
  h2s: { id: 'h2s', name: 'hydrogen sulphide', M: 34.08, smell: 0.0005 * ppm, smellsOf: 'rotten eggs', harm: 10 * ppm, deadly: 100 * ppm, burns: 0.04, source: 'smelled from about 0.5 ppb (ATSDR); NIOSH ceiling 10 ppm, IDLH 100 ppm; LEL 4 %' },
  petrol: { id: 'petrol', name: 'petrol vapour', M: 72, smell: 0.3 * ppm, smellsOf: 'petrol', harm: 300 * ppm, burns: 0.014, source: 'smelled from about 0.3 ppm (typical of published thresholds, which range widely); ACGIH TLV 300 ppm; LEL 1.4 % (NFPA); molar mass of the vapour about 72 g/mol (typical)' },
  hc: { id: 'hc', name: 'exhaust hydrocarbons', M: 72, smell: 0.3 * ppm, smellsOf: 'exhaust', source: 'unburnt fuel in the exhaust, smelled as petrol is (typical)' },
  glycol: { id: 'glycol', name: 'ethylene glycol', M: 62.07, smell: 25 * ppm, smellsOf: 'sweet coolant', source: 'smelled from about 25 ppm (typical)' },
};

/** A source: where it is, what it gives off and how fast (m³/s of the gas at room conditions), and why that rate. */
export interface Release { at: V3; substance: string; rate: number; /** its fraction as it comes out (a diluted gas never more concentrated than that) */ pure: number; part: string; path: string; why: string }

/** Idle, rpm (typical of a warm petrol engine). */
export const IDLE_RPM = 750;
/** The most a catalyst car may give off at idle: CO 0.3 % and hydrocarbons 200 ppm (the UK MOT's limits; most give far less). */
export const EXHAUST_LIMITS = { co: 0.003, hc: 200 * ppm };
/** An engine's exhaust flow, m³/s: a four-stroke breathes its displacement every two turns. */
export const exhaustFlow = (cc: number, rpm = IDLE_RPM) => cc * 1e-6 * rpm / 120;
/** Hydrogen from a lead-acid battery overcharged, m³/s: by Faraday's law, 1 Ah splits water for 0.418 L of hydrogen at
 *  0 °C and 1 atm (3600 C / (2 × 96485 C/mol) × 22.4 L/mol). A flooded battery's float overcharge, about 0.1 A (typical). */
export const hydrogenFrom = (amps: number) => amps * (3600 / (2 * 96485)) * 0.0224 / 3600;

/** How the air moves: still (indoors, or a calm), or a wind at a speed toward a direction. */
export interface Air { wind: number; to?: V3; /** stirring of still air, m²/s (about 0.05 indoors: an estimate of a room's own draughts) */ stir?: number }
export const STILL: Air = { wind: 0, stir: 0.05 };

/** Briggs' spreads for neutral air (class D, open country): σy = 0.08 x (1 + 0.0001 x)^-½, σz = 0.06 x (1 + 0.0015 x)^-½. */
const sy = (x: number) => 0.08 * x / Math.sqrt(1 + 0.0001 * x), sz = (x: number) => 0.06 * x / Math.sqrt(1 + 0.0015 * x);

/** The volume fraction of a release at a point: in still air, C = Q / (4π K r); in a wind, a Gaussian plume (reflected
 *  off the ground at y = ground). Never above the gas as it comes out. */
export function concentration(r: Release, p: V3, air: Air = STILL, ground = 0, pure = r.pure): number {
  const d = [p[0] - r.at[0], p[1] - r.at[1], p[2] - r.at[2]], dist = Math.max(0.05, Math.hypot(d[0]!, d[1]!, d[2]!));
  if (!air.wind) return Math.min(pure, r.rate / (4 * Math.PI * (air.stir ?? 0.05) * dist));
  const t = air.to ?? [1, 0, 0], tl = Math.hypot(...t), u = [t[0] / tl, 0, t[2] / tl], x = d[0]! * u[0]! + d[2]! * u[2]!; if (x <= 0.05) return 0;
  const y = Math.hypot(d[0]! - x * u[0]!, d[2]! - x * u[2]!), H = r.at[1] - ground, z = p[1] - ground, a = sy(x), b = sz(x);
  return Math.min(pure, (r.rate / (2 * Math.PI * air.wind * a * b)) * Math.exp(-(y * y) / (2 * a * a)) * (Math.exp(-((z - H) ** 2) / (2 * b * b)) + Math.exp(-((z + H) ** 2) / (2 * b * b))));
}
/** How far from a release (downwind, at its own height) it stays above a fraction: found by halving. */
export function reachOf(r: Release, level: number, air: Air = STILL): number {
  const at = (s: number): V3 => { const t = air.to ?? [1, 0, 0], tl = Math.hypot(...t); return air.wind ? [r.at[0] + (t[0] / tl) * s, r.at[1], r.at[2] + (t[2] / tl) * s] : [r.at[0] + s, r.at[1], r.at[2]]; };
  if (concentration(r, at(0.06), air, r.at[1] - 1) < level) return 0;
  let lo = 0.06, hi = 0.06; while (concentration(r, at(hi), air, r.at[1] - 1) >= level && hi < 1e5) hi *= 2;
  for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (concentration(r, at(m), air, r.at[1] - 1) >= level) lo = m; else hi = m; }
  return lo;
}
/** What a release does, and how far: smelled to, harmful to, flammable to. */
export function effectsOf(r: Release, air: Air = STILL): { smelled: number; harmful: number; flammable: number; says: string } {
  const s = SUBSTANCES[r.substance]!, smelled = s.smell ? reachOf(r, s.smell, air) : 0, harmful = s.harm ? reachOf(r, s.harm, air) : 0, flammable = s.burns ? reachOf(r, s.burns, air) : 0;
  const bits = [s.smell ? `smelled (${s.smellsOf}) to ${smelled.toFixed(1)} m` : 'no smell', s.harm ? `over its working-day limit to ${harmful.toFixed(2)} m` : '', s.burns ? (flammable > 0 ? `flammable to ${flammable.toFixed(3)} m` : 'never flammable in the open') : ''].filter(Boolean);
  return { smelled, harmful, flammable, says: `${s.name} from the ${r.part}, ${(r.rate * 1e6).toFixed(r.rate < 1e-6 ? 3 : 1)} cm³/s (${r.why}): ${bits.join(', ')}, ${air.wind ? `in a ${air.wind} m/s wind` : 'in still air'}` };
}

/** What a thing gives off in a state (its engine running, its battery charging), found from what its parts are. */
export interface State { running?: boolean; /** a battery's overcharge current, A (default 0.1 when the engine runs: typical of a flooded battery on float) */ overcharge?: number }
export function releasesOf(root: Part, state: State = {}, nodes: Node[] = layout(root)): Release[] {
  const out: Release[] = [];
  if (state.running) for (const e of nodes.filter((n) => n.p.item === 'engine-ice')) {
    const cc = Number(/\((\d+(?:\.\d+)?) cc/.exec(e.p.name)?.[1] ?? NaN); if (!Number.isFinite(cc)) continue;
    // (out of the far end of its exhaust: of every part of it (pipes, silencers), the one farthest from the engine, at its
    // end away from the engine)
    const c = e.sub!.getCenter(new THREE.Vector3()), parts = nodes.filter((n) => n.sub && /^(exhaust-pipe|silencer-shell|muffler|tail-pipe)$/.test(n.p.item ?? ''));
    const far = parts.sort((a, b) => b.sub!.getCenter(new THREE.Vector3()).distanceTo(c) - a.sub!.getCenter(new THREE.Vector3()).distanceTo(c))[0];
    const end = far ? far.sub!.clampPoint(far.sub!.getCenter(new THREE.Vector3()).sub(c).multiplyScalar(10).add(c), new THREE.Vector3()).setY(far.sub!.getCenter(new THREE.Vector3()).y) : c;
    const at = end.toArray() as V3, Q = exhaustFlow(cc), why = `a ${cc} cc engine at ${IDLE_RPM} rpm breathes ${(Q * 1000).toFixed(1)} L/s`;
    out.push({ at, substance: 'co', rate: Q * EXHAUST_LIMITS.co, pure: EXHAUST_LIMITS.co, part: far?.p.name ?? 'exhaust', path: e.path, why: `${why}, at most 0.3 % of it carbon monoxide (the UK MOT idle limit for catalyst cars)` });
    out.push({ at, substance: 'hc', rate: Q * EXHAUST_LIMITS.hc, pure: EXHAUST_LIMITS.hc, part: far?.p.name ?? 'exhaust', path: e.path, why: `${why}, at most 200 ppm of it hydrocarbons (the MOT limit)` });
  }
  const amps = state.overcharge ?? (state.running ? 0.1 : 0);
  if (amps > 0) for (const b of nodes.filter((n) => n.p.item === 'battery-sli' && n.sub)) {
    const top = b.sub!.getCenter(new THREE.Vector3()).setY(b.sub!.max.y);
    out.push({ at: top.toArray() as V3, substance: 'h2', rate: hydrogenFrom(amps), pure: 1, part: b.p.name, path: b.path, why: `${amps} A of overcharge splits water: 0.418 L of hydrogen an ampere-hour (Faraday's law)` });
  }
  return out;
}

/** A release shut in a room: the room's air well mixed, changed so many times an hour (a closed garage about 0.5, typical),
 *  it climbs toward Q / (n V) as 1 − e^(−n t): how high, and how soon it passes a level. */
export function shutIn(r: Release, volume: number, changesPerHour = 0.5): { steady: number; minutesTo: (level: number) => number; says: string } {
  const n = changesPerHour / 3600, steady = Math.min(r.pure, r.rate / (n * volume)), s = SUBSTANCES[r.substance]!;
  const minutesTo = (level: number) => (level >= steady ? Infinity : -Math.log(1 - level / steady) / n / 60);
  const marks = [s.harm ? `past its working-day limit in ${minutesTo(s.harm).toFixed(1)} min` : '', s.deadly ? (Number.isFinite(minutesTo(s.deadly)) ? `dangerous at once (${Math.round(s.deadly / ppm)} ppm) in ${minutesTo(s.deadly).toFixed(0)} min` : `never dangerous at once`) : '', s.burns ? (Number.isFinite(minutesTo(s.burns)) ? `flammable in ${minutesTo(s.burns).toFixed(0)} min` : 'never flammable') : ''].filter(Boolean);
  return { steady, minutesTo, says: `${s.name} shut in ${volume.toFixed(0)} m³ changed ${changesPerHour} times an hour: climbing toward ${steady >= 0.001 ? `${(steady * 100).toFixed(2)} %` : `${Math.round(steady / ppm)} ppm`}; ${marks.join(', ')}` };
}

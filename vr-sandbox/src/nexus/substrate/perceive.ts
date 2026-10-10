// Observation as a physical projection. Reality is generated first; an observer is another physical system in it,
// and what it receives is what physically reaches it: carried by some carrier across the medium between, at that
// medium's speed, inside the band its detector answers, above the least signal it registers and below the most,
// averaged over its window, read at its rate, blurred to its resolution, after its latency. An observer is a
// configuration of such senses, never a category: an eye, an ear, a camera and a spectrometer are values of the
// same fields. The physical manifold is never handed to an observer whole.
//
// When an observer would need the manifold finer than it was generated (a camera faster than the realization was
// read), the projection does not invent what is not there: it returns what the manifold would have to be generated
// at, for the generator to refine.

import { CONST } from '../book/constants';

/** One way an observer receives: a carrier, a band, the least and most it registers, a window, a resolution, a latency. */
export interface Sense {
  name: string;
  /** The carrier the signal comes by: light, momentum (a pressure, a motion), or a matter carrier (a species). */
  carrier: string;
  /** The frequencies of the carrier it answers, Hz: of the radiation for light, of the oscillation for a pressure or a motion. */
  band?: { lo: number; hi: number };
  /** The matters it answers to, for a matter carrier: what it has receptors for. */
  answers?: string[];
  /** The least signal it registers and the most before it saturates, in `unit`. */
  least: number; most: number; unit: string;
  /** The time it averages over, s, and the time between readings (its window when it reads continuously). */
  window: number; every?: number;
  /** The smallest angle it tells apart, rad (or a length, m, where it touches). */
  resolution: { angle?: number; length?: number };
  /** The time it takes to register what reached it, s. */
  latency: number;
  /** The power it shines on what it measures, W, for an observer that illuminates: its light pushes what it lights by that power over c. */
  shines?: number;
  /** Where each value comes from. */
  sources: Record<string, string>;
}

export interface Observer { name: string; senses: Sense[]; /** How long it takes to act on what it registered, s. */ acts?: number }

/** Where the observer is: how far, and through what: the medium decides how fast each carrier crosses. */
export interface Placement { distance: number; speeds: Record<string, number> }

export type Loss = 'out of band' | 'not answered' | 'below what it registers' | 'saturated' | 'averaged' | 'aliased' | 'blurred' | 'not held by the manifold';

// ---- a time series: the manifold's state over time, as generated ---------------------------------------------------

/**
 * A quantity of the manifold over time, in the representation it was generated in. `holds` says the finest window the
 * representation holds for, and why: a realization read once a step holds nothing finer than the step; a body
 * realized rigid is rigid only to windows the sound crossing it is short against. A `position` is seen across the line
 * of sight; a `signal` arrives in the sense's own unit.
 */
export interface Series { carrier: string; unit: string; kind: 'position' | 'signal'; t: number[]; v: number[]; holds: { finest: number; because: string }[] }

export interface Received { sense: string; detected: boolean; lost: Loss[]; t: number[]; v: number[]; delay: number; refine?: { window: number; because: string[] } }

/**
 * What a sense receives of a series. It arrives after the carrier crosses the distance and the sense's latency; each
 * reading is the mean over the window before it, taken every `every`; a position finer than the resolution at the
 * distance is lost to it; a signal weaker than the least it registers is not received, one stronger saturates. An
 * observer whose window is finer than the representation holds is not given what the manifold does not hold: it gets
 * what the manifold would have to be generated at, and why.
 */
export function receiveSeries(s: Series, sense: Sense, at: Placement): Received {
  const lost: Loss[] = [];
  const speed = at.speeds[s.carrier];
  if (sense.carrier !== s.carrier || speed === undefined) return { sense: sense.name, detected: false, lost: ['not answered'], t: [], v: [], delay: Infinity };
  const delay = at.distance / speed + sense.latency;
  const breaks = s.holds.filter((h) => sense.window < h.finest);
  if (breaks.length) return { sense: sense.name, detected: false, lost: ['not held by the manifold'], t: [], v: [], delay, refine: { window: sense.window, because: breaks.map((h) => h.because) } };
  const every = sense.every ?? sense.window;
  const t: number[] = [], v: number[] = [];
  for (let r = s.t[0]! + sense.window; r <= s.t.at(-1)!; r += every) {
    let sum = 0, n = 0;
    for (let i = 0; i < s.t.length; i++) if (s.t[i]! > r - sense.window && s.t[i]! <= r) { sum += s.v[i]!; n++; }
    if (n) { t.push(r + delay); v.push(sum / n); }
  }
  const range = v.length ? Math.max(...v) - Math.min(...v) : 0;
  if (s.kind === 'position') {
    // what the resolution at the distance cannot tell apart
    const q = sense.resolution.angle !== undefined ? sense.resolution.angle * at.distance : sense.resolution.length ?? 0;
    if (q > 0) for (let i = 0; i < v.length; i++) v[i] = Math.round(v[i]! / q) * q;
    if (range < q) lost.push('blurred');
    return { sense: sense.name, detected: !lost.length, lost, t, v, delay };
  }
  if (sense.unit !== s.unit) return { sense: sense.name, detected: false, lost: ['not answered'], t: [], v: [], delay };
  const peak = v.length ? Math.max(...v.map(Math.abs)) : 0;
  if (peak < sense.least) lost.push('below what it registers');
  if (peak > sense.most) { lost.push('saturated'); for (let i = 0; i < v.length; i++) v[i] = Math.sign(v[i]!) * Math.min(Math.abs(v[i]!), sense.most); }
  return { sense: sense.name, detected: peak >= sense.least, lost, t, v, delay };
}

// ---- a spectrum: what a body radiates, by its temperature ---------------------------------------------------------

/** Planck's law: the radiance of a black body per frequency, W / (m² sr Hz). Planck, Ann. Phys. 4, 553 (1901). */
export const planck = (f: number, T: number) => (2 * CONST.h.value! * f ** 3 / CONST.c.value! ** 2) / Math.expm1(CONST.h.value! * f / (CONST.kB.value! * T));

/** The radiance a black body at T gives in a band, W / (m² sr): Planck's law integrated over the band by Simpson's rule in ln f. */
export function radianceIn(band: { lo: number; hi: number }, T: number, cells = 400): number {
  const a = Math.log(band.lo), b = Math.log(band.hi), h = (b - a) / cells;
  let s = 0;
  for (let i = 0; i <= cells; i++) { const u = a + i * h, f = Math.exp(u), y = planck(f, T) * f; s += (i === 0 || i === cells ? 1 : i % 2 ? 4 : 2) * y; }
  return (s * h) / 3;
}

/** Whether a sense that answers light registers a body at T radiating as a black body, and what reaches it. */
export function receiveGlow(T: number, sense: Sense): { detected: boolean; radiance: number; lost: Loss[] } {
  if (sense.carrier !== 'light' || !sense.band) return { detected: false, radiance: 0, lost: ['not answered'] };
  const radiance = radianceIn(sense.band, T);
  const lost: Loss[] = [];
  if (radiance < sense.least) lost.push('below what it registers');
  if (radiance > sense.most) lost.push('saturated');
  return { detected: radiance >= sense.least, radiance, lost };
}

/** The temperature at which a black body begins to register to a sense: where its in-band radiance reaches the least it registers. */
export function glowOnset(sense: Sense, lo = 1, hi = 1e5): number {
  for (let i = 0; i < 200; i++) { const m = Math.sqrt(lo * hi); if (radianceIn(sense.band!, m) < sense.least) lo = m; else hi = m; }
  return Math.sqrt(lo * hi);
}

// ---- a rate: a mechanism of the manifold, by its frequency ---------------------------------------------------------

/**
 * How a sense meets an oscillation of its carrier at a frequency. Outside its band it is not received. Inside, and
 * slower than the window, it is followed in time; faster, it is a line in a spectrum: its rate is read though no moment
 * of it is (an ear hears a pitch, an eye a colour, a spectrometer a band).
 */
export function meetRate(frequency: number, carrier: string, sense: Sense): 'followed' | 'a line' | 'out of band' | 'not answered' {
  if (sense.carrier !== carrier) return 'not answered';
  if (sense.band && (frequency < sense.band.lo || frequency > sense.band.hi)) return 'out of band';
  return 1 / frequency >= 2 * (sense.every ?? sense.window) ? 'followed' : 'a line';
}

// ---- a level: an amount of a matter, held -------------------------------------------------------------------------

/** Whether a sense registers a matter at a concentration: only what it has receptors for, above the least it registers. */
export function receiveLevel(matter: string, concentration: number, sense: Sense): { detected: boolean; lost: Loss[] } {
  if (!sense.answers) return { detected: false, lost: ['not answered'] };
  if (!sense.answers.includes(matter)) return { detected: false, lost: ['not answered'] };
  if (concentration < sense.least) return { detected: false, lost: ['below what it registers'] };
  return { detected: true, lost: concentration > sense.most ? ['saturated'] : [] };
}

/**
 * What an observer gives to what it observes over a watch: the light it shines pushes what absorbs it by the power over
 * c (reaction.light). Against the momentum the observed holds, it says whether the observer is outside the dynamics or
 * part of them.
 */
export const pushOver = (sense: Sense, watch: number) => ((sense.shines ?? 0) / CONST.c.value!) * watch;

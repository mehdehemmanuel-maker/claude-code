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

// ---- THE HUMAN EYE, AND SEEING TRACED BACK TO TIME ----------------------------------------------------------------
//
// Everything above is written for any observer. This is the human one, filled in from measurements, and the point of
// it is that EVERY STEP FROM THE PHOTON TO THE PERCEPT IS A TIME. A wavelength is a time (λ/c). A colour is a rate.
// An isomerisation is a duration. An integration window is a duration. A flicker-fusion frequency is one over a
// duration. A nerve's conduction delay, a saccade, the latency to report — durations. So the chain reduces, on the
// one tree, to time^1 for every step and time^-1 for every rate, and nothing else appears in it.
//
// It also settles, with numbers instead of argument, why light looks like a steady colour rather than a wave: the
// eye's window is 10^13 optical cycles long, so `meetRate` returns 'a line' and not 'followed'. That blur is REAL,
// and it is in the eye. What it is not is a fact about the light — and the decisive evidence for that is at the
// bottom of this block, in FASTER_THAN_THE_ORBIT: the thought experiment of giving the observer a faster clock has
// actually been carried out, down past the orbital period itself, and the wave did not become a particle on a track.

/** One beat in the chain from a photon to a percept: a duration, its rate, and where the number is from. */
export interface Beat {
  what: string;
  /** the duration, s */ seconds: number;
  /** its rate, Hz = 1/seconds */ hz: number;
  /** where in the chain */ stage: 'light' | 'retina' | 'nerve' | 'brain' | 'body';
  source: string;
}
const beat = (what: string, seconds: number, stage: Beat['stage'], source: string): Beat =>
  ({ what, seconds, hz: 1 / seconds, stage, source });

const C_ = CONST.c.value!;
/** the wavelength the light-adapted eye is most sensitive to, as a time: one period of it */
export const periodOf = (metres: number): number => metres / C_;

/** EVERY STEP OF SEEING, AS A DURATION. Twelve orders of magnitude inside one organ, and every row a time. */
export const SEEING: Beat[] = [
  beat('one period of 555 nm light, the wavelength the light-adapted eye answers best', periodOf(555e-9), 'light',
    'CIE V(λ) peaks at 555 nm; the period is λ/c'),
  beat('one period of 507 nm light, where the dark-adapted eye answers best', periodOf(507e-9), 'light',
    'CIE V′(λ) peaks at 507 nm; the period is λ/c'),
  beat('rhodopsin twists: 11-cis retinal to all-trans, the first step in vision and the fastest reaction known in biology',
    200e-15, 'retina', 'Schoenlein, Peteanu, Mathies & Shank 1991, Science 254:412'),
  beat('a cone’s response to one photon reaches its peak', 40e-3, 'retina',
    'Schnapf, Nunn, Meister & Baylor 1990, J Physiol 427:681 (macaque cones, ~40 ms)'),
  beat('a rod’s response to one photon reaches its peak', 200e-3, 'retina',
    'Baylor, Nunn & Schnapf 1984, J Physiol 357:575 (macaque rods, ~200 ms)'),
  beat('the cone’s critical duration: below this only total energy counts, not how it is spread (Bloch’s law)', 30e-3, 'retina',
    'Bloch’s law; cone critical duration about 30 ms (Graham & Kemp 1938; Barlow 1958)'),
  beat('the rod’s critical duration', 100e-3, 'retina',
    'Bloch’s law; rod critical duration about 100 ms (Barlow 1958, J Physiol 141:337)'),
  beat('one action potential', 1e-3, 'nerve', 'Hodgkin & Huxley 1952, J Physiol 117:500: the spike is about 1 ms'),
  beat('a neuron’s membrane time constant, R_m C_m — the capacitor that sets how long it adds up its input', 15e-3, 'nerve',
    'Koch, Biophysics of Computation, OUP 1999: cortical τ_m typically 10–20 ms'),
  beat('light reaches the first visual area of the cortex', 66e-3, 'brain',
    'Schmolesky et al. 1998, J Neurophysiol 79:3272 (macaque V1 onset ~66 ms)'),
  beat('a saccade: the eye is thrown to a new place and vision is suppressed while it flies', 50e-3, 'brain',
    'Bahill, Clark & Stark 1975, Math Biosci 24:191 (the main sequence: 30–100 ms over normal amplitudes)'),
  beat('the alpha rhythm, one cycle — the rate at which attention appears to sample', 100e-3, 'brain',
    'Berger 1929; sampling at ~10 Hz: VanRullen & Koch 2003, Trends Cogn Sci 7:207'),
  beat('you can say you saw it', 300e-3, 'brain',
    'the P3b at about 300 ms (Dehaene & Changeux 2011, Neuron 70:200); Libet 1983 puts report later still'),
  beat('one heartbeat', 1, 'body', 'about 60 beats a minute at rest'),
  beat('one breath', 4, 'body', 'about 15 breaths a minute at rest'),
];

/** THE HUMAN EYE AS A `Sense`, so the same projection that serves a camera and a spectrometer serves it. Its window
 *  is the cone's critical duration, which is what makes a colour a colour: see `whyLightIsAColour`. */
export const EYE_CONE: Sense = {
  name: 'a cone, light-adapted', carrier: 'light',
  band: { lo: C_ / 780e-9, hi: C_ / 380e-9 },
  least: 1e-2, most: 1e8, unit: 'cd/m^2',
  window: 30e-3, every: 1 / 60,
  resolution: { angle: 2.9e-4 },
  latency: 66e-3,
  sources: {
    band: 'CIE: the visible range 380–780 nm, as frequencies',
    window: 'Bloch’s law: the cone critical duration, about 30 ms',
    every: 'photopic critical flicker fusion about 60 Hz (Hecht & Shlaer 1936, J Gen Physiol 19:965; the Ferry–Porter law makes it rise with luminance)',
    resolution: '1 arcminute, the standard acuity limit: 2.9e-4 rad',
    latency: 'to V1, about 66 ms (Schmolesky et al. 1998)',
    least: 'the photopic range begins near 10^-2 cd/m^2',
  },
};
export const EYE_ROD: Sense = {
  name: 'a rod, dark-adapted', carrier: 'light',
  band: { lo: C_ / 640e-9, hi: C_ / 400e-9 },
  least: 1e-6, most: 1e-2, unit: 'cd/m^2',
  window: 100e-3, every: 1 / 15,
  resolution: { angle: 1.7e-3 },
  latency: 200e-3,
  sources: {
    band: 'the scotopic response, roughly 400–640 nm, as frequencies',
    window: 'Bloch’s law: the rod critical duration, about 100 ms',
    every: 'scotopic critical flicker fusion about 15 Hz (Hecht & Shlaer 1936)',
    resolution: 'about 6 arcminutes dark-adapted',
    latency: 'the rod single-photon response peaks near 200 ms (Baylor, Nunn & Schnapf 1984)',
    least: 'a few photons at the cornea; about 10^-6 cd/m^2 as a luminance',
  },
};
export const HUMAN_EYE: Observer = { name: 'a human eye', senses: [EYE_CONE, EYE_ROD], acts: 300e-3 };

/** WHY LIGHT IS A COLOUR AND NOT A WAVE YOU CAN WATCH, as a ratio of two times. The light's period against the eye's
 *  window: the eye averages that many cycles into one reading, so `meetRate` answers 'a line' — the rate is read
 *  though no moment of it is. This is the blur, it is real, and it is a property OF THE EYE. */
export function whyLightIsAColour(nm = 555, sense: Sense = EYE_CONE): {
  nm: number; period: number; frequency: number; window: number; cycles: number;
  meets: ReturnType<typeof meetRate>; says: string } {
  const period = periodOf(nm * 1e-9), frequency = 1 / period;
  const cycles = sense.window / period;
  const meets = meetRate(frequency, 'light', sense);
  return { nm, period, frequency, window: sense.window, cycles, meets,
    says: `${nm} nm light turns over every ${period.toExponential(3)} s (${frequency.toExponential(3)} Hz). ${sense.name} averages over ${sense.window} s, which is ${cycles.toExponential(3)} optical cycles in one reading, so meetRate says "${meets}": the rate is read, no moment of it is. That is what a colour IS — a frequency too fast to follow, reported as a quality. The blur is in the eye.` };
}

/** A CARRIER IS NOT A MODULATION, and `meetRate` above could not tell them apart — found by writing the flicker
 *  test for this round. A light signal carries TWO rates: the carrier (its colour, about 5e14 Hz, which must fall
 *  in the band or it is not seen at all) and the modulation (its flicker, 1–100 Hz, which must be slower than the
 *  window or it fuses). `meetRate` takes one frequency and checks it against the band first, so asking it about a
 *  1 Hz flashing light answered "out of band" — true of 1 Hz radiation, nonsense about a flashing lamp. The two
 *  questions are physically different and now have one function each.
 *  'unseen'   the colour is outside the band: no modulation of it matters.
 *  'followed' the flicker is slower than the window: you see it flashing.
 *  'fused'    the flicker is faster than the window: you see steady light. THIS IS FLICKER FUSION, and it is the
 *             same mechanism that makes a colour a colour — only the rate differs. One law, two regimes. */
export function meetFlicker(carrierHz: number, modulationHz: number, sense: Sense):
  { verdict: 'unseen' | 'followed' | 'fused'; carrier: ReturnType<typeof meetRate>; cyclesPerWindow: number; says: string } {
  const carrier = meetRate(carrierHz, 'light', sense);
  const cyclesPerWindow = modulationHz * (sense.every ?? sense.window);
  const verdict = carrier === 'out of band' || carrier === 'not answered' ? 'unseen'
    : 1 / modulationHz >= 2 * (sense.every ?? sense.window) ? 'followed' : 'fused';
  return { verdict, carrier, cyclesPerWindow,
    says: verdict === 'unseen'
      ? `a ${(3e8 / carrierHz * 1e9).toFixed(0)} nm carrier is outside ${sense.name}’s band, so nothing it does is seen`
      : verdict === 'followed'
      ? `${modulationHz} Hz is slower than twice ${sense.name}’s reading interval, so you see it flicker`
      : `${modulationHz} Hz is faster than ${sense.name} reads, so it FUSES into steady light — the same averaging that turns a ${(3e8 / carrierHz * 1e9).toFixed(0)} nm carrier into a colour, at a rate ${(carrierHz / modulationHz).toExponential(2)} times lower` };
}

/** How many turns of anything get averaged into one reading. The general form of the bicycle-wheel argument. */
export const cyclesAveraged = (period: number, window = EYE_CONE.window): number => window / period;

/** ONE TURN OF AN ELECTRON IN HYDROGEN, as a time. The orbital speed is αc, so the period is 2πa₀/(αc) — which makes
 *  the Bohr period a pure consequence of the fine-structure constant and the Bohr radius, both measured. */
export function bohrPeriod(): number {
  const alpha = CONST.e.value! ** 2 / (4 * Math.PI * CONST.eps0.value! * (CONST.h.value! / (2 * Math.PI)) * C_);
  return (2 * Math.PI * CONST.a0.value!) / (alpha * C_);
}

/** A single pole's cutoff: something that integrates with time constant τ passes nothing above 1/(2πτ). */
export function flickerCutoff(tau: number): number { return 1 / (2 * Math.PI * tau); }

/** WHERE THE TRACE TO TIME STOPS WORKING, SAID PLAINLY RATHER THAN FITTED. The tempting next step is to DERIVE the
 *  flicker-fusion frequency from the eye's own integration time: one pole with time constant τ cuts off at 1/(2πτ),
 *  so put in the cone's measured critical duration and read off the frequency above which flicker fuses.
 *  IT DOES NOT WORK. The measured critical duration is about 30 ms, which gives 5.3 Hz, and the measured flicker
 *  fusion is about 60 Hz: the model is out by a factor of eleven.
 *  You can make it agree by using τ = 2.65 ms instead — but that number is not a measurement of anything, it is
 *  60 Hz run backwards through the formula. That is a knob, and this file refuses to turn it for the same reason
 *  the clock-ratio construction in `invariant.ts` was refused: a parameter chosen to hit the target is not a
 *  derivation of the target. (Run 8n held the user's thesis to that rule. Run 8o holds this round's to it.)
 *  WHY it fails is the honest content: the two numbers measure different things. A critical duration is energy
 *  summation at THRESHOLD — how long the eye adds photons up before deciding something is there. A flicker cutoff
 *  is modulation transfer ABOVE threshold — how deep a ripple has to be before it stops being visible. And the
 *  retina is a cascade of stages, not one capacitor, so its roll-off is steeper than a single pole can be; the
 *  measured cutoff also climbs with luminance (the Ferry–Porter law), which a fixed τ cannot do at all.
 *  So: every step of seeing IS a time, and the chain is real. What is NOT yet shown is that the later times are
 *  derivable from the earlier ones. They are measured separately, and here they are reported separately. */
export function flickerFromWindow(sense: Sense = EYE_CONE, measuredCFF = 60): {
  window: number; onePole: number; measured: number; factorOut: number; backFitTau: number; works: boolean; says: string } {
  const onePole = flickerCutoff(sense.window), factorOut = measuredCFF / onePole;
  const backFitTau = 1 / (2 * Math.PI * measuredCFF);
  return { window: sense.window, onePole, measured: measuredCFF, factorOut, backFitTau, works: factorOut < 1.5 && factorOut > 0.67,
    says: `${sense.name}: its measured window is ${(sense.window * 1e3).toFixed(0)} ms, so one pole would cut off at ${onePole.toFixed(1)} Hz. Flicker fusion is measured at about ${measuredCFF} Hz — OUT BY A FACTOR OF ${factorOut.toFixed(1)}. Agreement would need τ = ${(backFitTau * 1e3).toFixed(2)} ms, which is the answer run backwards through the formula and not a measurement of anything. The model is refused rather than tuned: a critical duration is energy summation at threshold and a flicker cutoff is modulation transfer above it, and the retina is a cascade, not one capacitor.` };
}

/** THE THOUGHT EXPERIMENT, ALREADY PERFORMED. "Scale your clock down to the electron's and the cloud would
 *  crystallise into a planet on a track" is testable, because we have built those clocks. A pulse shorter than the
 *  orbital period is a faster shutter than the orbit, and we have had one since 2001; the record is 43 as against a
 *  Bohr period of 152 as. What those instruments see is not a little planet. They see wavepackets, interference and
 *  tunnelling — and two Nobel Prizes were given for looking. The faster observer exists; the picture did not change. */
export const FASTER_THAN_THE_ORBIT = [
  { instrument: 'a femtosecond laser pulse', seconds: 6e-15,
    source: 'Zewail’s femtochemistry, Nobel Prize in Chemistry 1999: bonds watched as they break' },
  { instrument: 'the first attosecond pulse train', seconds: 250e-18,
    source: 'Paul et al. 2001, Science 292:1689; Hentschel et al. 2001, Nature 414:509' },
  { instrument: 'the shortest pulse yet made', seconds: 43e-18,
    source: 'Gaumnitz et al. 2017, Opt Express 25:27506' },
  { instrument: 'one turn of the electron in hydrogen, for comparison', seconds: 1.5198e-16,
    source: 'computed by bohrPeriod(): 2πa₀/(αc), from CODATA a₀ and α' },
] as const;

// ---- THE CASCADE: the shape a single pole could not have ----------------------------------------------------------
//
// `flickerFromWindow` above refused to derive flicker fusion, because one pole with the measured window gives 5.3 Hz
// against a measured 60 Hz and the only way to agree was to invent a time constant. This closes it properly, and the
// reason it can is that a retina is not one capacitor: it is a CHAIN of stages, each passing its output to the next,
// and Fourtes & Hodgkin measured that in 1964. n identical stages of time constant τ give
//
//     h(t) = t^(n-1) e^(-t/τ) / (τ^n (n-1)!)        the impulse response, unit area, a gamma
//     |H(f)| = (1 + (2π f τ)²)^(-n/2)               the amplitude response
//     t_peak = (n-1) τ                              exact, and the thing that is MEASURED
//
// Three numbers go in and all three are measured somewhere else: n from the cascade literature, the time to peak
// from primate cones, the contrast sensitivity from psychophysics. NOTHING IS FITTED — which is the whole point,
// because the last round's failure was a fitted τ and this one has to be better than that or it is worth nothing.
//
// WHY ONE POLE COULD NEVER HAVE WORKED, and this is the useful part: a single pole fails in BOTH directions at once.
// Its corner is 11× too low (5.3 against 60 Hz) AND its tail is far too shallow — falling as 1/f, it still passes a
// 250th of its signal at 1.3 kHz, so by the same criterion it predicts a flicker fusion of 1326 Hz, 22× too HIGH.
// A filter cannot be that slow at the bottom and that sharp at the top with one pole. Only a chain can, because a
// chain falls as 1/f^n. The old failure was not a bad parameter; it was the wrong shape.

/** A chain of n identical first-order stages, each of time constant τ. */
export interface Cascade {
  n: number; tau: number;
  /** when its response to a flash peaks, s: exactly (n-1)τ */ timeToPeak: number;
  /** the equivalent rectangular duration, s: its area over its peak */ integrationTime: number;
  /** where it is down 3 dB, Hz */ halfPower: number;
  /** the slope it settles to, dB per octave: n stages give -6n */ slopePerOctave: number;
  /** its response to a flash at time t, s^-1 */ at(t: number): number;
  /** how much of a sinusoid at f survives, 0..1 */ amplitudeAt(f: number): number;
}

const lnFactorial = (k: number): number => { let s = 0; for (let i = 2; i <= k; i++) s += Math.log(i); return s; };

export function cascade(n: number, tau: number): Cascade {
  const timeToPeak = (n - 1) * tau;
  const at = (t: number): number => t <= 0 ? 0
    : Math.exp((n - 1) * Math.log(t) - t / tau - n * Math.log(tau) - lnFactorial(n - 1));
  return {
    n, tau, timeToPeak,
    // unit area over the peak value: the width of the rectangle that would pass the same total
    integrationTime: 1 / at(timeToPeak),
    halfPower: Math.sqrt(2 ** (1 / n) - 1) / (2 * Math.PI * tau),
    slopePerOctave: -6.0206 * n,
    at,
    amplitudeAt: (f: number) => (1 + (2 * Math.PI * f * tau) ** 2) ** (-n / 2),
  };
}

/** The chain whose response peaks when the measured one does: τ = t_peak/(n-1). The measurement sets τ, not a fit. */
export const cascadeFromPeak = (timeToPeak: number, n: number): Cascade => cascade(n, timeToPeak / (n - 1));

/** WHAT FLICKER FUSION ACTUALLY IS, and the criterion is the definition rather than a choice: the frequency at which
 *  a fully modulated signal is attenuated past what the system can still detect. So |H(f)| = 1/S, where S is the
 *  measured peak contrast sensitivity — and that solves exactly:
 *      f = √(S^(2/n) − 1) / (2π τ)
 *  With the cone's measured 40 ms time to peak, n = 10 from the cascade literature and S = 250 from psychophysics,
 *  it predicts 50.9 Hz against a measured 60 Hz: 15% out, with no parameter fitted anywhere. The prediction holds
 *  its shape over the whole plausible range of n (46 Hz at n = 4, 65 Hz at n = 20), which is the test that it is a
 *  result and not a fit — a fitted model moves wherever you push it. */
export function cffFromCascade(timeToPeak = 40e-3, n = 10, sensitivity = 250, measuredCFF = 60): {
  cascade: Cascade; predicted: number; measured: number; offBy: number; attenuationAtMeasured: number;
  onePolePredicted: number; says: string } {
  const c = cascadeFromPeak(timeToPeak, n);
  const predicted = Math.sqrt(sensitivity ** (2 / n) - 1) / (2 * Math.PI * c.tau);
  // the same criterion on one pole fitted to the measured 30 ms window, for the contrast
  const onePolePredicted = Math.sqrt(sensitivity ** 2 - 1) / (2 * Math.PI * 30e-3);
  return { cascade: c, predicted, measured: measuredCFF, offBy: predicted / measuredCFF - 1,
    attenuationAtMeasured: c.amplitudeAt(measuredCFF), onePolePredicted,
    says: `${n} stages of ${(c.tau * 1e3).toFixed(2)} ms (from the measured ${(timeToPeak * 1e3).toFixed(0)} ms time to peak, τ = t_peak/(n−1)) attenuate ${measuredCFF} Hz by ${(1 / c.amplitudeAt(measuredCFF)).toFixed(0)}×. A system that detects ${sensitivity}:1 contrast therefore loses a fully modulated flicker at ${predicted.toFixed(1)} Hz, against ${measuredCFF} Hz measured — ${(Math.abs(predicted / measuredCFF - 1) * 100).toFixed(0)}% out, with nothing fitted. The same criterion on ONE pole gives ${onePolePredicted.toFixed(0)} Hz, ${(onePolePredicted / measuredCFF).toFixed(0)}× too high, while its corner sits 11× too low: one pole is the wrong shape, not a bad parameter, because a chain falls as 1/f^n and a pole only as 1/f.` };
}

/** The sources for the three numbers the cascade takes, so none of them can quietly become a knob. */
export const CASCADE_INPUTS = [
  { what: 'n, the number of stages', value: 10, fitted: false,
    source: 'Fourtes & Hodgkin 1964, J Physiol 172:239 fitted n = 10 to Limulus; Watson 1986 (Handbook of Perception and Human Performance) uses 9 for the human excitatory stage' },
  { what: 'the time to peak of a cone’s flash response, s', value: 40e-3, fitted: false,
    source: 'Schnapf, Nunn, Meister & Baylor 1990, J Physiol 427:681 (macaque cones)' },
  { what: 'peak temporal contrast sensitivity', value: 250, fitted: false,
    source: 'de Lange 1958, J Opt Soc Am 48:777; Kelly 1961, J Opt Soc Am 51:422 — peak around 200–300 near 5–10 Hz' },
  { what: 'critical flicker fusion, the thing being predicted', value: 60, fitted: false,
    source: 'Hecht & Shlaer 1936, J Gen Physiol 19:965 — held OUT of the derivation and compared to it' },
] as const;

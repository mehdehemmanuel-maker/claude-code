// The messengers' daily rhythms: how a person's melatonin, cortisol, adrenaline and endorphins rise and fall over the
// clock, set by when they sleep and wake, from the studies that measured them (each figure's source with it; where a
// curve's shape between measured points is drawn smooth, that is said). Time in the life graph is these: a time node
// is a moment of a day, and what each messenger is doing then is read off its curve.
//
// AND THE ONES WITH NO CURVE, WHICH ARE NOT A SILENCE. The user named eleven messengers; two had a curve here and
// nine had nothing at all, which reads as "not done yet" for all nine and is wrong about most of them. A messenger
// is without a daily curve for one of three reasons, and they are different facts: a study LOOKED AND FOUND NONE
// (oxytocin), a study found one and its figures are not reachable from this container (dopamine, serotonin), or the
// thing has no blood level to have a day — a fast synaptic transmitter is made, used and cleared inside a cleft in
// milliseconds (acetylcholine, GABA, glutamate). `WITHOUT` records which, with the source, so the absence is an
// answer rather than a gap. Noradrenaline is the one worth reading: its night-time fall is POSTURE, not the clock.
//
// Owner of: the daily curves of the messengers that have one, why the rest have none, a moment's levels, and time
// nodes' words.

/** When a person sleeps and wakes (hours on the clock, 0–24) and how old they are. */
export interface Day { sleep: number; wake: number; age: number }
export const TYPICAL_DAY: Day = { sleep: 23, wake: 7, age: 25 };
/** A messenger's level at an hour of the clock, in its own unit, and how it is measured. */
export interface Rhythm { id: string; unit: string; at: (h: number, d: Day) => number; says: (h: number, d: Day) => string; src: string }
const mod24 = (h: number) => ((h % 24) + 24) % 24;
/** Hours from a to b going forward round the clock. */
const ahead = (a: number, b: number) => mod24(b - a);
/** A smooth step from 0 to 1 over [0, 1] (the curve's shape between measured points: drawn smooth, not measured). */
const ease = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.cos(Math.PI * x)) / 2);

/** Peak night-time plasma melatonin by age, pg/mL: the weighted means of the studies Kennaway gathered (2023: 0–9 years
 *  155; 20–29, 72.4 ± 27.4; 80–89, 24.8 ± 7.4); between them, read straight across. */
const MEL_PEAK: [number, number][] = [[5, 155], [15, 79.7], [25, 72.4], [35, 63.8], [45, 63.6], [55, 60.8], [65, 45.2], [75, 33.6], [85, 24.8]];
const melPeak = (age: number): number => { const t = MEL_PEAK; if (age <= t[0]![0]) return t[0]![1]; for (let i = 1; i < t.length; i++) if (age <= t[i]![0]) { const [a0, v0] = t[i - 1]!, [a1, v1] = t[i]!; return v0 + ((v1 - v0) * (age - a0)) / (a1 - a0); } return t.at(-1)![1]; };
/** Melatonin: 1–2 pg/mL by day; rising from the dim-light melatonin onset about 2 h before habitual sleep; highest
 *  between 2 and 4 a.m. (taken here as the night's middle: 3 a.m. for 11 to 7); back to day level by about
 *  an hour after waking. */
export const MELATONIN: Rhythm = {
  id: 'melatonin', unit: 'pg/mL in plasma',
  at: (h, d) => {
    const base = 1.5, peak = melPeak(d.age), onset = mod24(d.sleep - 2), top = mod24(d.sleep + ahead(d.sleep, d.wake) / 2), gone = mod24(d.wake + 1);
    const night = ahead(onset, gone), t = ahead(onset, h); if (t >= night) return base;
    const up = ahead(onset, top), down = night - up;
    return base + (peak - base) * (t <= up ? ease(t / up) : ease(1 - (t - up) / down));
  },
  says: (h, d) => { const v = MELATONIN.at(h, d), p = melPeak(d.age); return v < 3 ? 'at its day level: the pineal holds it back while there is light' : v > 0.85 * p ? 'near its night\'s peak' : ahead(mod24(d.sleep - 2), h) < ahead(mod24(d.sleep - 2), mod24(d.sleep + ahead(d.sleep, d.wake) / 2)) ? 'rising for the night' : 'falling toward morning'; },
  src: 'Kennaway 2023, "The dim light melatonin onset across ages" (PMC10171641): day levels 1–2 pg/mL by GC-MS, peak means by age; the onset about 2 h before habitual sleep and the peak near 3–4 a.m. (Lewy 1980; Psychiatric Times\' review); the curve between them drawn smooth',
};
/** Cortisol (salivary): about 15 nmol/L on waking, about 50 % higher (38–75 %) at its peak 30 min after; falling through
 *  the day to under 7.6 nmol/L late at night (the 95th centile at 23:00–24:00), lowest in the first half of the night;
 *  rising again in the second half of the night toward waking. */
export const CORTISOL: Rhythm = {
  id: 'cortisol', unit: 'nmol/L in saliva',
  at: (h, d) => {
    const wakeV = 15, peakV = 22.5, lowV = 2, peakAt = mod24(d.wake + 0.5), lowAt = mod24(d.sleep + 1.5), t = ahead(d.wake, h);
    if (t <= 0.5) return wakeV + (peakV - wakeV) * ease(t / 0.5);
    const fall = ahead(peakAt, lowAt); if (ahead(peakAt, h) <= fall) { const x = ahead(peakAt, h) / fall, k = 3.2; return lowV + ((peakV - lowV) * (Math.exp(-k * x) - Math.exp(-k))) / (1 - Math.exp(-k)); }
    return lowV + (wakeV - lowV) * ease(ahead(lowAt, h) / ahead(lowAt, d.wake));
  },
  says: (h, d) => { const t = ahead(d.wake, h); return t <= 1 ? 'in its waking rise, the cortisol awakening response' : t < 8 ? 'falling through the day' : CORTISOL.at(h, d) < 4 ? 'at its lowest, the first half of the night' : 'rising again before waking'; },
  src: 'the cortisol awakening response (Pruessner 1997; Clow 2004; summarised by Wikipedia): about 15 nmol/L on waking, a 38–75 % (mean 50 %) rise peaking about 30 min after; St Boniface Hospital\'s lab manual: late-night salivary cortisol under 7.6 nmol/L (95th centile); its night-time low (2 nmol/L) and the fall\'s shape between them estimates',
};

// ---- a rhythm as DATA: the three numbers chronobiology reports one with -------------------------------------------

/** The cosinor model, which is how a daily rhythm is actually published: `v(t) = M + A·cos(2π(t − φ)/24)`, where M is
 *  the MESOR (the mean the curve swings about, not the arithmetic mean of the samples), A the amplitude (half the
 *  peak-to-trough swing) and φ the acrophase (when it peaks). Melatonin and cortisol keep hand-written curves because
 *  their studies give them sharper shapes than a cosine — melatonin a night-long plateau, cortisol a 30-minute spike
 *  on waking — but for everything else the cosine IS what was fitted, so a new messenger is a row of measured numbers
 *  and not a new function. `relTo` says what the acrophase is measured from: the clock, or hours after waking, which
 *  is what a rhythm entrained to the sleep–wake cycle rather than to the sun is tied to. */
export interface Cosinor {
  id: string; unit: string; mesor: number; amp: number;
  /** when it peaks: an hour of the clock, or hours after waking when `relTo` is 'wake' */ peak: number;
  relTo: 'clock' | 'wake'; src: string;
  /** what it is doing at its top and its bottom, in words */ high: string; low: string;
}
/** The curve those numbers make. */
export function cosinor(c: Cosinor): Rhythm {
  const phase = (h: number, d: Day) => (c.relTo === 'wake' ? ahead(mod24(d.wake + c.peak), h) : ahead(c.peak, h));
  const at = (h: number, d: Day) => c.mesor + c.amp * Math.cos((2 * Math.PI * phase(h, d)) / 24);
  return {
    id: c.id, unit: c.unit, at, src: c.src,
    says: (h, d) => { const v = at(h, d), hi = c.mesor + c.amp, lo = c.mesor - c.amp;
      return v > hi - 0.25 * c.amp ? c.high : v < lo + 0.25 * c.amp ? c.low
        : Math.sin((2 * Math.PI * phase(h, d)) / 24) < 0 ? 'rising toward its peak' : 'falling from its peak'; },
  };
}
/** THE MEASUREMENT IS THE INPUT. A study that sampled a messenger at two hours of the day gives two points and no
 *  curve; given when the rhythm peaks (from what drives it), those two points fix the cosine exactly — two equations,
 *  two unknowns. So the numbers written here are the ones the paper printed, and the mesor and amplitude are worked
 *  out from them rather than read off a figure by eye. The cosine between the two points is the MODEL and says so;
 *  where it is wrong it is wrong in a way a third sample would catch. */
export function fromTwo(a: [number, number], b: [number, number], peakAt: number): { mesor: number; amp: number } {
  const w = (h: number) => Math.cos((2 * Math.PI * ahead(peakAt, h)) / 24);
  const [h1, v1] = a, [h2, v2] = b, d = w(h1) - w(h2);
  if (Math.abs(d) < 1e-9) throw new Error(`two samples ${h1} h and ${h2} h sit at the same place on the cosine: they cannot fix one`);
  const amp = (v1 - v2) / d;
  return { mesor: +(v1 - amp * w(h1)).toFixed(3), amp: +amp.toFixed(3) };
}

/** β-endorphin: cut from the same POMC molecule as ACTH and let go with it, so it follows the cortisol axis and peaks
 *  on waking. Infante et al. 1998 sampled healthy non-meditating controls at two hours and found a diurnal rhythm
 *  (p < 0.01): 25.4 ± 1.7 pg/mL at 09:00 against 17.7 ± 1.1 at 20:00. Those two points fix the cosine, given a peak
 *  half an hour after waking — which is ACTH's, not β-endorphin's own measured acrophase, and is the assumption in
 *  this curve. */
const BE = fromTwo([9, 25.4], [20, 17.7], 7.5);
export const BETA_ENDORPHIN: Rhythm = cosinor({
  id: 'endorphins', unit: 'pg/mL in plasma', mesor: BE.mesor, amp: BE.amp, peak: 0.5, relTo: 'wake',
  high: 'near its morning high, let go with ACTH from the same POMC molecule',
  low: 'at its evening low, with the cortisol axis quiet',
  src: 'Infante et al. 1998, "ACTH and beta-endorphin in transcendental meditation" (PMID 9748098): controls 25.4 ± 1.7 pg/mL at 09:00 and 17.7 ± 1.1 at 20:00, p < 0.01, with ACTH and cortisol falling the same way. Two measured points; the cosine between them, and its peak taken as ACTH\'s (half an hour after waking), are the model',
});

/** Adrenaline: entrained to SLEEP, not to the sun. Dodt et al. 1997 drew blood every 7 minutes from 9:30 p.m. to
 *  8:30 a.m. with the subjects lying flat throughout, so posture could not confound it, and found adrenaline
 *  significantly lower during sleep than in the waking hours either side, lower still in REM, and climbing again
 *  after waking — while noradrenaline did none of those things (see WITHOUT). The SHAPE and its timing are that
 *  study's; the two levels are estimates inside the plasma reference range (0–140 pg/mL, UCSF Health), because the
 *  paper's own concentrations are behind a subscription this container cannot reach. */
export const ADRENALINE: Rhythm = cosinor({
  id: 'adrenaline', unit: 'pg/mL in plasma', mesor: 32, amp: 18, peak: 3, relTo: 'wake',
  high: 'at its daytime high: awake, upright and spending',
  low: 'at its lowest, asleep — and lower still in REM',
  src: 'Dodt et al. 1997, Hypertension 30(1):71–76 (PMID 9231823): adrenaline significantly lower in nocturnal sleep than in wakefulness either side, lowest in REM, rising after awakening, with every sample taken strictly horizontal so posture is ruled out. The shape and timing are measured; the 32 ± 18 pg/mL is an ESTIMATE inside the 0–140 pg/mL reference range (UCSF Health), not the paper\'s figure',
});

export const RHYTHMS: Record<string, Rhythm> = { melatonin: MELATONIN, cortisol: CORTISOL, endorphins: BETA_ENDORPHIN, adrenaline: ADRENALINE };

// ---- and the ones with no curve, which is a different fact for each ------------------------------------------------

/** Why a messenger has no daily curve here. Three different facts, and lumping them together as "not done" is the
 *  thing this type exists to stop. */
export type Without = 'looked-and-found-none' | 'measured-elsewhere' | 'no-blood-level-to-have-one';
export interface NoRhythm { id: string; why: Without; says: string; src: string }

export const WITHOUT: Record<string, NoRhythm> = {
  noradrenaline: {
    id: 'noradrenaline', why: 'looked-and-found-none',
    says: 'its night-time fall is POSTURE, not the clock. Lying flat all night, plasma noradrenaline is NOT significantly lower asleep than awake and is not raised by waking — but standing up at the end of the night raises it by 180 %, against adrenaline\'s 46 %. So the "daily rhythm" of noradrenaline that a sitting-and-standing day shows is mostly the day\'s posture, and a curve drawn against the clock here would be a curve of when you happen to be upright',
    src: 'Dodt et al. 1997, Hypertension 30(1):71–76 (PMID 9231823), sampling every 7 min strictly horizontal; Linsell et al. 1985, J Clin Endocrinol Metab 60(6):1210–5 (PMID 3998066), which found the diurnal rhythm significant but noradrenaline higher with upright posture and higher awake',
  },
  oxytocin: {
    id: 'oxytocin', why: 'looked-and-found-none',
    says: 'a study went looking for one in three fluids at once — cerebrospinal fluid, blood and saliva — and found no diurnal rhythm in any of them. That is a measured absence, not a missing measurement: oxytocin here answers to what you are doing and who you are with, not to the hour',
    src: 'Kagerbauer et al., "Absence of a diurnal rhythm of oxytocin and arginine-vasopressin in human cerebrospinal fluid, blood and saliva"',
  },
  dopamine: {
    id: 'dopamine', why: 'measured-elsewhere',
    says: 'it has one, and a good one: plasma dopamine tracks clock time MORE closely than either noradrenaline or adrenaline (r = −0.54, p < 0.001), falling as the day goes on. The direction is known here and the figures are not — the paper is behind a subscription this container cannot reach — so no curve is drawn rather than one being invented around the direction',
    src: 'Sowers & Vlachakis 1984, "Circadian variation in plasma dopamine levels in man" (PMID 6501806)',
  },
  serotonin: {
    id: 'serotonin', why: 'measured-elsewhere',
    says: 'the brain\'s serotonin and the blood\'s are two different pools and nearly all of the blood\'s is in platelets and in the gut, so a plasma figure is not a reading of what the brain is doing. In the pineal it is the night\'s raw material — melatonin is made FROM it after dark — so where melatonin rises, pineal serotonin is being spent. That link is in the graph; a plasma curve is not drawn, because the number it would draw is not the one anybody means',
    src: 'the pineal pathway (serotonin → N-acetylserotonin → melatonin) as the textbooks give it; see MELATONIN\'s own curve for the night it feeds',
  },
  acetylcholine: {
    id: 'acetylcholine', why: 'no-blood-level-to-have-one',
    says: 'a fast synaptic transmitter has no daily blood level to have a rhythm in: it is made, let go into a cleft 20 nm wide, read, and broken up by acetylcholinesterase in about a millisecond, and the little that escapes into blood says nothing about the brain. Its day is real but it is a STATE and not a concentration — the basal forebrain releases it hard in waking and in REM and almost not at all in deep sleep — and that belongs to the graph\'s states, not to a curve',
    src: 'the synaptic cleft and acetylcholinesterase as the textbooks give them; the waking/REM pattern from microdialysis, which is animal work',
  },
  gaba: {
    id: 'gaba', why: 'no-blood-level-to-have-one',
    says: 'the same as acetylcholine, and more so: GABA is the brain\'s brake, made and recycled inside the synapse and its astrocyte, and what little is in blood does not cross into the brain. There is no circulating pool whose day could be drawn',
    src: 'the GABA–glutamine cycle and the blood–brain barrier as the textbooks give them',
  },
  glutamate: {
    id: 'glutamate', why: 'no-blood-level-to-have-one',
    says: 'the same, and it is the other half of the same cycle: glutamate is the brain\'s accelerator, cleared from the cleft by the astrocytes wrapping it and handed back as glutamine. Blood glutamate follows what you ate',
    src: 'the glutamate–glutamine cycle and the blood–brain barrier as the textbooks give them',
  },
};

/** Every messenger the user named, each either with its curve or with why it has none: eleven answers, no silences. */
export function dayOfEach(): { id: string; has: boolean; says: string; src: string }[] {
  const out = Object.values(RHYTHMS).map((r) => ({ id: r.id, has: true, says: `a curve in ${r.unit}`, src: r.src }));
  for (const w of Object.values(WITHOUT)) out.push({ id: w.id, has: false, says: w.says, src: w.src });
  return out.sort((a, b) => (a.has === b.has ? a.id.localeCompare(b.id) : a.has ? -1 : 1));
}
/** An hour of the clock in words: "3 a.m.", "7:30 p.m.". */
export function clock(h: number): string { const m = Math.round(mod24(h) * 60) % 1440, H = Math.floor(m / 60), M = m % 60, h12 = H % 12 || 12; return `${h12}${M ? `:${String(M).padStart(2, '0')}` : ''} ${H < 12 ? 'a.m.' : 'p.m.'}`; }
/** What every messenger with a rhythm is doing at an hour, for a person's day. */
export function momentOf(h: number, d: Day = TYPICAL_DAY): { id: string; v: number; unit: string; says: string }[] {
  return Object.values(RHYTHMS).map((r) => ({ id: r.id, v: +r.at(h, d).toFixed(1), unit: r.unit, says: r.says(h, d) }));
}
/** The hour a time node's name says: "3am", "3 a.m.", "7:30 pm", "15:30", "midnight", "noon"; null when it says none. */
export function hourOf(name: string): number | null {
  const t = name.toLowerCase();
  if (/\bmidnight\b/.test(t)) return 0; if (/\b(noon|midday)\b/.test(t)) return 12;
  const m = /\b(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/.exec(t);
  if (m) { const H = Number(m[1]) % 12 + (/^p/.test(m[3]!) ? 12 : 0), M = Number(m[2] ?? 0); return H <= 23 && M < 60 ? H + M / 60 : null; }
  const n = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(t); return n ? Number(n[1]) + Number(n[2]) / 60 : null;
}
/** "I sleep at 11 and wake at 7", "23 to 7", "sleep 0:30 wake 8:15": a person's sleep and wake, or null. */
export function dayOf(text: string, age = TYPICAL_DAY.age): Day | null {
  const hs = [...text.toLowerCase().matchAll(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/g)].map((m) => { let H = Number(m[1]) % 24; if (m[3]) H = (H % 12) + (/^p/.test(m[3]) ? 12 : 0); return H + Number(m[2] ?? 0) / 60; });
  if (hs.length < 2) return null; let [sleep, wake] = hs as [number, number];
  // (a bare "11 to 7" reads as night: a sleep hour before 12 without a.m. or p.m. taken as evening when waking comes after it)
  if (!/a\.?m|p\.?m/.test(text.toLowerCase()) && sleep < 12 && sleep >= wake && sleep > 6) sleep += 12;
  return { sleep: mod24(sleep), wake: mod24(wake), age };
}

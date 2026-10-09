// The messengers' daily rhythms: how a person's melatonin and cortisol rise and fall over the clock, set by when they
// sleep and wake, from the studies that measured them (each figure's source with it; where a curve's shape between
// measured points is drawn smooth, that is said). Time in the life graph is these: a time node is a moment of a day, and
// what each messenger is doing then is read off its curve.
// Owner of: the daily curves of the messengers that have one, a moment's levels, and time nodes' words.

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
export const RHYTHMS: Record<string, Rhythm> = { melatonin: MELATONIN, cortisol: CORTISOL };
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

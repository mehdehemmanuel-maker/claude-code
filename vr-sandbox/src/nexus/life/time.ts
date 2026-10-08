// Time in living things: how long each kind of cell lives before it is replaced, how much power each part of the
// body burns at rest, and so what a body does each second and each day (cells made and lost, grams turned over, ATP
// made and spent), and how it changes as it ages. Lifespans are measured ones where the source is named, estimates
// where it says so; power is each tissue's rate at rest (Elia 1992: liver 200, brain 240, heart and kidneys 440,
// skeletal muscle 13, fat 4.5, everything else 12 kcal a kilogram a day) times its mass.

import { INVENTORY, countIn, gramsOfItem } from '../inventory';

/** How long one lives, days (Infinity: kept all life), and where that is from. */
export const LIFESPAN: Record<string, { days: number; says: string }> = {
  'red-blood-cell': { days: 120, says: 'about 120 days, then the spleen and liver take it apart' },
  platelet: { days: 9, says: '8–10 days' },
  neutrophil: { days: 2, says: 'hours in the blood, a few days in all (an estimate)' },
  monocyte: { days: 3, says: '1–3 days in the blood, then months as a macrophage (an estimate)' },
  eosinophil: { days: 4, says: 'hours in the blood, days in tissue (an estimate)' },
  basophil: { days: 2, says: 'a day or two (an estimate)' },
  macrophage: { days: 180, says: 'months to years in its tissue (an estimate)' },
  lymphocyte: { days: 365, says: 'months to decades: memory cells last years (a year here, an estimate)' },
  enterocyte: { days: 4, says: '3–5 days from the crypt to the villus tip, then shed' },
  'goblet-cell': { days: 4, says: '3–5 days, with the gut lining' },
  keratinocyte: { days: 28, says: 'about 4 weeks from the base of the epidermis to its top' },
  corneocyte: { days: 14, says: 'about 2 weeks in the horny layer, then shed' },
  hepatocyte: { days: 365, says: 'about a year (200–400 days, an estimate); the liver regrows when cut' },
  adipocyte: { days: 3650, says: 'about 10 years: a tenth of fat cells renewed each year (Spalding et al. 2008)' },
  osteoclast: { days: 14, says: 'about 2 weeks' },
  osteoblast: { days: 90, says: 'about 3 months making bone, then walled in as an osteocyte or gone (an estimate)' },
  osteocyte: { days: 9125, says: 'decades (25 years here, an estimate)' },
  'muscle-fibre-i': { days: 5500, says: 'about 15 years (Spalding et al. 2005)' }, 'muscle-fibre-iia': { days: 5500, says: 'about 15 years (Spalding et al. 2005)' }, 'muscle-fibre-iix': { days: 5500, says: 'about 15 years (Spalding et al. 2005)' },
  cardiomyocyte: { days: 36500, says: 'about 1 % renewed a year at 25, 0.45 % at 75 (Bergmann et al. 2009): most last a lifetime' },
  'endothelial-cell': { days: 365, says: 'months to years (a year here, an estimate)' },
  fibroblast: { days: 365, says: 'months to years (an estimate)' },
  'smooth-muscle-cell': { days: 3650, says: 'years (an estimate)' },
  'tubule-cell': { days: 365, says: 'about a year (an estimate)' },
  microglia: { days: 1530, says: 'a median of 4.2 years (Réu et al. 2017)' },
  oligodendrocyte: { days: 121000, says: 'about 0.3 % renewed a year in white matter (Yeung et al. 2014)' },
  'beta-cell': { days: 36500, says: 'little renewal after about 30 (Perl et al. 2010): most last a lifetime' },
  sperm: { days: 74, says: 'about 74 days to make (Heller & Clermont 1963); about 100 million a day' },
  'pyramidal-neuron': { days: Infinity, says: 'as old as you: cortical neurons are not replaced (Bhardwaj et al. 2006)' },
  interneuron: { days: Infinity, says: 'not replaced (Bhardwaj et al. 2006)' }, 'purkinje-cell': { days: Infinity, says: 'not replaced' }, 'granule-cell': { days: Infinity, says: 'not replaced' }, 'deep-neuron': { days: Infinity, says: 'not replaced' }, 'dopamine-neuron': { days: Infinity, says: 'not replaced: about 5–10 % lost a decade in old age (an estimate)' },
  'rod-cell': { days: Infinity, says: 'kept all life, but each renews its outer segment\'s discs about every 10 days (Young 1967)' }, 'cone-cell': { days: Infinity, says: 'kept all life' }, 'hair-cell': { days: Infinity, says: 'not replaced: what is lost to noise stays lost' },
  oocyte: { days: Infinity, says: 'all made before birth; about 400 ripen in a lifetime' }, podocyte: { days: Infinity, says: 'not replaced (an estimate)' }, chondrocyte: { days: 36500, says: 'very little renewal in adults (an estimate)' },
  mitochondrion: { days: 20, says: 'weeks: worn ones are eaten (mitophagy) and others divide (an estimate)' },
  'e-coli': { days: 20 / 1440, says: 'divides every 20 minutes at best' }, yeast: { days: 90 / 1440, says: 'divides every 90 minutes or so' },
};
/** Each tissue's resting rate, kcal a kg a day (Elia 1992); what is not named is 12. */
const RATE: Record<string, number> = {
  'liver-tissue': 200, hepatocyte: 200, 'cortical-grey': 240, 'white-matter': 240, 'deep-grey': 240, 'cerebellar-cortex': 240, 'cardiac-muscle': 440, cardiomyocyte: 440, 'kidney-tissue': 440, nephron: 440,
  'skeletal-muscle-tissue': 13, 'slow-muscle-tissue': 13, 'other-muscles': 13, 'adipose-tissue': 4.5,
};
const OTHER = 12, W_PER = 4184 / 86400 / 1000; // W for each kcal a kg a day, a gram
const watt = new Map<string, number>();
/** Watts a thing burns at rest: each tissue in it by its mass and its rate. */
export function wattsOf(id: string): number {
  const k = watt.get(id); if (k !== undefined) return k;
  const i = INVENTORY.get(id); if (!i) return 0;
  const g = gramsOfItem(i) ?? 0, r = RATE[id];
  let w: number;
  if (r !== undefined) w = g * r * W_PER;
  else if (i.kind === 'material' || !i.of.length) w = g * OTHER * W_PER;
  else { w = 0; for (const c of i.of) { const ci = INVENTORY.get(c.id); if (!ci) continue; const gc = i.mass?.[c.id]; w += gc !== undefined ? (ci.kind === 'material' ? gc * OTHER * W_PER : (gc / Math.max(gramsOfItem(ci) ?? gc, 1e-30)) * wattsOf(c.id)) : c.n * wattsOf(c.id); } }
  watt.set(id, w);
  return w;
}
/** ATP a body makes and spends a day, g: its resting power over about 50 kJ a mole (ATP's free energy in a cell, typical). */
export const atpPerDay = (watts: number): number => ((watts * 86400) / 50e3) * 507.18;
/** What a body does in a span of days: cells of each kind made and lost, grams turned over, energy and ATP. */
export function turnover(body = 'human', days = 1): { cells: number; grams: number; kJ: number; atp: number; kinds: { id: string; name: string; n: number; g: number; perSecond: number }[] } {
  const kinds: { id: string; name: string; n: number; g: number; perSecond: number }[] = [];
  for (const [id, l] of Object.entries(LIFESPAN)) {
    if (!Number.isFinite(l.days) || /coli|yeast|mitochondrion/.test(id)) continue;
    const count = countIn(body, id); if (!count) continue;
    const n = (count * days) / l.days, one = gramsOfItem(INVENTORY.get(id)!) ?? 0;
    kinds.push({ id, name: INVENTORY.get(id)!.name, n, g: n * one, perSecond: count / (l.days * 86400) });
  }
  kinds.sort((a, b) => b.n - a.n);
  const w = wattsOf(body);
  return { cells: kinds.reduce((a, k) => a + k.n, 0), grams: kinds.reduce((a, k) => a + k.g, 0), kJ: (w * 86400 * days) / 1000, atp: atpPerDay(w) * days, kinds };
}
/** A thing's clock, to read: how long one lives, how many are replaced a second in a body, what it burns. */
export function clockOf(id: string): string {
  const l = LIFESPAN[id], w = wattsOf(id), i = INVENTORY.get(id); if (!i) return '';
  const parts: string[] = [];
  if (l) { parts.push(`lives ${Number.isFinite(l.days) ? (l.days >= 365 ? `${+(l.days / 365).toPrecision(2)} years` : l.days >= 1 ? `${+l.days.toPrecision(2)} days` : `${Math.round(l.days * 1440)} minutes`) : 'all life'}: ${l.says}`); const n = countIn('human', id); if (n && Number.isFinite(l.days) && !/coli|yeast/.test(id)) parts.push(`${perSecondSays(n / (l.days * 86400))} replaced a second in a body`); }
  if (w > 0) parts.push(`burns ${w >= 0.1 ? `${+w.toPrecision(3)} W` : w >= 1e-6 ? `${+(w * 1e6).toPrecision(3)} µW` : `${+(w * 1e12).toPrecision(3)} pW`} at rest`);
  return parts.join(' · ');
}
const perSecondSays = (x: number) => (x >= 1e6 ? `${+(x / 1e6).toPrecision(3)} million` : x >= 1e3 ? `${Math.round(x).toLocaleString('en')}` : x >= 1 ? `${+x.toPrecision(2)}` : `one every ${+(1 / x).toPrecision(2)} s`);

/** How a body changes with age, from a young adult's (about 30): each change an estimate of the typical, and says so. */
export function aged(age: number): { height: number; muscle: number; bone: number; brain: number; fat: number; telomere: number; says: string[] } {
  const after = (a0: number) => Math.max(0, age - a0);
  const height = after(40) ? -0.001 * after(40) : 0, muscle = Math.pow(0.99, after(50)), bone = Math.pow(0.995, after(40)), brain = Math.pow(0.998, Math.min(after(40), 30)) * Math.pow(0.995, after(70)), fat = 1 + 0.01 * Math.min(after(30), 30);
  return {
    height, muscle, bone, brain, fat, telomere: -25 * Math.max(0, age - 20),
    says: [
      `height ${height ? `${Math.round(height * 1000)} mm` : 'as at 30'} (about 1 cm a decade after 40, an estimate)`,
      `skeletal muscle ×${muscle.toFixed(2)} (about 1 % a year after 50, an estimate)`,
      `bone ×${bone.toFixed(2)} (about 0.5 % a year after 40 in men, an estimate)`,
      `brain ×${brain.toFixed(3)} (about 0.2 % a year after 40, 0.5 % after 70, estimates)`,
      `fat ×${fat.toFixed(2)} (estimate)`,
      `telomeres about ${Math.round(25 * Math.max(0, age - 20))} base pairs shorter than at 20 (about 25 a year in white cells, an estimate)`,
    ],
  };
}

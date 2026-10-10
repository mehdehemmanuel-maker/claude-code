// How close is close enough, and can this machine do it: the arithmetic that was being done in my head.
//
// Every round before this one, a tolerance was a number somebody wrote down. "±0.02 mm on a bearing seat" — why 0.02?
// Because it felt about right. That is the kind of guess this file exists to delete. A tolerance is not an opinion:
// it is derived from what the feature has to *do*, through the fit it has to make, through a table that has been the
// same since 1962.
//
// Four pieces, and each removes a judgement call:
//
//   1. **The grade.** ISO 286-1 gives a tolerance in micrometres for a size and a grade — IT5 to IT11 below. A hole
//      of 25 mm at IT7 may be 21 µm wide and no wider. That is the whole of "how precise is precise".
//   2. **The fit.** A shaft in a hole is a pair of grades with a pair of offsets: H7/h6 locates, H7/g6 slides, H7/p6
//      is pressed in and stays. The fit decides the tolerance; nobody picks the tolerance directly.
//   3. **The stack.** Four parts in a line, each ±0.1, do not give a ±0.1 assembly. Worst case they give ±0.4; made
//      in quantity and centred they give ±0.2, because errors are as likely to cancel as to add. Both are computed
//      here, with which one to believe.
//   4. **The capability.** A process that "holds ±0.05" holds it at three standard deviations, which means σ = 0.017
//      and about one part in 370 outside. Ask that process for ±0.02 and Cp is 0.39: you scrap two parts in three.
//      So "can this works hold that?" has a number, and a plan can make five to get four.
//
// That last one is the ability this adds to the works: a plan that knows its scrap rate makes the extra part up front
// instead of finding out at the measuring bench, and a gap that used to read "nothing here holds ±0.02" now reads
// "the mini lathe would scrap two in three, so make eight to get two, or buy it".
//
// Owner of: ISO 286 grades and the fits made from them, what a named feature's tolerance should be, tolerance
// stack-up, and process capability (Cp, Cpk, scrap). The processes and stations that have these tolerances are
// `works.ts`; the edge radius a cut leaves is `finish.ts`; what a cutter is run at is `link.ts`.

/** ISO 286-1's standard tolerance grades: the width of the tolerance band, µm, by size step and grade. The steps are
 *  the standard ones (over 1 to 3, over 3 to 6, …), and the grades are the ones a workshop can reach — IT5 is ground,
 *  IT6 to IT7 are a good lathe or a jig borer, IT8 to IT9 are ordinary machining, IT10 to IT11 are a saw and a drill.
 *  Source: ISO 286-1's table of standard tolerance grades (the same table every machinist's handbook reprints). */
export const IT_STEPS: { over: number; upTo: number; it: Record<number, number> }[] = [
  { over: 0, upTo: 3, it: { 5: 4, 6: 6, 7: 10, 8: 14, 9: 25, 10: 40, 11: 60, 12: 100, 13: 140 } },
  { over: 3, upTo: 6, it: { 5: 5, 6: 8, 7: 12, 8: 18, 9: 30, 10: 48, 11: 75, 12: 120, 13: 180 } },
  { over: 6, upTo: 10, it: { 5: 6, 6: 9, 7: 15, 8: 22, 9: 36, 10: 58, 11: 90, 12: 150, 13: 220 } },
  { over: 10, upTo: 18, it: { 5: 8, 6: 11, 7: 18, 8: 27, 9: 43, 10: 70, 11: 110, 12: 180, 13: 270 } },
  { over: 18, upTo: 30, it: { 5: 9, 6: 13, 7: 21, 8: 33, 9: 52, 10: 84, 11: 130, 12: 210, 13: 330 } },
  { over: 30, upTo: 50, it: { 5: 11, 6: 16, 7: 25, 8: 39, 9: 62, 10: 100, 11: 160, 12: 250, 13: 390 } },
  { over: 50, upTo: 80, it: { 5: 13, 6: 19, 7: 30, 8: 46, 9: 74, 10: 120, 11: 190, 12: 300, 13: 460 } },
  { over: 80, upTo: 120, it: { 5: 15, 6: 22, 7: 35, 8: 54, 9: 87, 10: 140, 11: 220, 12: 350, 13: 540 } },
  { over: 120, upTo: 180, it: { 5: 18, 6: 25, 7: 40, 8: 63, 9: 100, 10: 160, 11: 250, 12: 400, 13: 630 } },
  { over: 180, upTo: 250, it: { 5: 20, 6: 29, 7: 46, 8: 72, 9: 115, 10: 185, 11: 290, 12: 460, 13: 720 } },
  { over: 250, upTo: 315, it: { 5: 23, 6: 32, 7: 52, 8: 81, 9: 130, 10: 210, 11: 320, 12: 520, 13: 810 } },
  { over: 315, upTo: 400, it: { 5: 25, 6: 36, 7: 57, 8: 89, 9: 140, 10: 230, 11: 360, 12: 570, 13: 890 } },
  { over: 400, upTo: 500, it: { 5: 27, 6: 40, 7: 63, 8: 97, 9: 155, 10: 250, 11: 400, 12: 630, 13: 970 } },
];
export const IT_SRC = "ISO 286-1's standard tolerance grades (IT5–IT13 by size step), as every machinist's handbook reprints them";

/** The width of an IT band at a size, in mm. Outside the table's 500 mm it is extrapolated from the last step and
 *  said so, because a works that works a half-metre part is not this works. */
export function itBand(mm: number, grade: number): number {
  const d = Math.abs(mm);
  const step = IT_STEPS.find((s) => d > s.over && d <= s.upTo) ?? IT_STEPS[IT_STEPS.length - 1]!;
  const µm = step.it[grade];
  if (µm == null) throw new Error(`IT${grade} is not in the table: it holds IT5 to IT13, which is everything from ground to sawn`);
  return +(µm / 1000).toFixed(4);
}

/** A hole-and-shaft fit: the two bands and their offsets from nominal, µm. `hole` and `shaft` are [lower, upper]
 *  deviations in µm, as a fit table gives them. */
export interface Fit {
  id: string; name: string;
  /** what it is for, and what goes wrong with the next one along */ says: string;
  /** [lower, upper] deviation of the hole, µm, at this size */ hole: (mm: number) => [number, number];
  /** [lower, upper] deviation of the shaft, µm */ shaft: (mm: number) => [number, number];
  src: string;
}

const H = (grade: number) => (mm: number): [number, number] => [0, Math.round(itBand(mm, grade) * 1000)];
const h = (grade: number) => (mm: number): [number, number] => [-Math.round(itBand(mm, grade) * 1000), 0];
// g, k and p need ISO 286's fundamental deviations. Rather than reprint tables I am not certain of end to end, each
// is given as the rule the standard states, over the sizes a small works actually works (under 120 mm), and said so.
/** ISO 286's fundamental deviation for shaft g, µm: es = −2.5 · D^0.34, rounded as the standard rounds it. */
const gEs = (mm: number) => -Math.round(2.5 * Math.pow(Math.max(1, Math.abs(mm)), 0.34));
/** For shaft k at grades 4 to 7 the lower deviation is +Δ, where Δ is IT(grade) − IT(grade−1): the standard's own
 *  construction, which makes k a fit that is always slightly into the hole. */
const kEi = (mm: number, grade: number) => Math.round((itBand(mm, grade) - itBand(mm, grade - 1)) * 1000);
/** For shaft p the lower deviation is +IT7 − IT6 plus the standard's 6 µm step for p: taken as IT7 − IT6 + 6. */
const pEi = (mm: number) => Math.round((itBand(mm, 7) - itBand(mm, 6)) * 1000) + 6;

export const FITS: Fit[] = [
  { id: 'H7/h6', name: 'a locating fit', says: 'it goes together by hand and does not rattle: a spigot into a bore, a cover onto a boss. It will not turn in service and it is not meant to',
    hole: H(7), shaft: h(6), src: `${IT_SRC}; H is zero at the bottom and h is zero at the top, by definition` },
  { id: 'H7/g6', name: 'a sliding fit', says: 'it slides and turns freely with oil on it: a shaft in a plain bush, a pin in a lever. Make it H7/h6 instead and it seizes the first time it gets warm',
    hole: H(7), shaft: (mm) => [gEs(mm) - Math.round(itBand(mm, 6) * 1000), gEs(mm)], src: `${IT_SRC}; shaft g's upper deviation es = −2.5·D^0.34 µm (ISO 286)` },
  { id: 'H7/k6', name: 'a bearing seat on a shaft', says: "what a rolling bearing's inner ring wants when the shaft turns under load: slightly into the hole, so the ring cannot creep round the shaft and polish it away. A sliding fit here destroys the shaft in a few hundred hours",
    hole: H(7), shaft: (mm) => [kEi(mm, 6), kEi(mm, 6) + Math.round(itBand(mm, 6) * 1000)], src: `${IT_SRC}; shaft k's lower deviation is +Δ (ISO 286); SKF and every bearing maker recommend k5 or k6 for a rotating inner ring under normal load` },
  { id: 'H7/p6', name: 'a press fit', says: 'driven in with a press and never coming out: a bush into a housing, a dowel. It needs the press, and it needs the bore not to be tapered',
    hole: H(7), shaft: (mm) => [pEi(mm), pEi(mm) + Math.round(itBand(mm, 6) * 1000)], src: `${IT_SRC}; shaft p is interference throughout (ISO 286)` },
  { id: 'H8/f7', name: 'a running fit', says: 'a loose running fit for a shaft in a bearing that is wet, dirty or hot: more clearance on purpose',
    hole: H(8), shaft: (mm) => [-Math.round((itBand(mm, 7) + itBand(mm, 6)) * 1000), -Math.round(itBand(mm, 6) * 1000)], src: `${IT_SRC}; f is the next clearance letter out from g (ISO 286), its deviation taken as one IT6 clear` },
  { id: 'H11/h11', name: 'a free fit', says: 'a bolt through a hole, a bracket on a slot: nothing is located by it, so nothing is spent on it. This is the fit most of a machine is made to and the one a saw and a drill can hold',
    hole: H(11), shaft: h(11), src: `${IT_SRC}; the grade a drilled and sawn part reaches` },
];
export const fitById = (id: string): Fit => { const f = FITS.find((x) => x.id === id); if (!f) throw new Error(`no fit ${id}`); return f; };

export interface Fitted {
  fit: Fit; mm: number;
  /** the hole, mm: [least, most] */ hole: [number, number];
  /** the shaft, mm: [least, most] */ shaft: [number, number];
  /** clearance, mm: negative is interference */ clearance: [number, number];
  /** what the maker has to hold on each, ± mm */ holeTol: number; shaftTol: number;
  says: string;
}
/** A fit worked out at a size: what the hole may be, what the shaft may be, how loose or tight it ends up, and the
 *  ± each part has to be made to. That last pair is the number a works is judged against, and it is never the one a
 *  person would have guessed: a 25 mm bearing seat is ±0.0065 mm, not the ±0.01 that sounds careful. */
export function fitAt(id: string, mm: number): Fitted {
  const fit = fitById(id);
  const [hl, hu] = fit.hole(mm), [sl, su] = fit.shaft(mm);
  const hole: [number, number] = [+(mm + hl / 1000).toFixed(4), +(mm + hu / 1000).toFixed(4)];
  const shaft: [number, number] = [+(mm + sl / 1000).toFixed(4), +(mm + su / 1000).toFixed(4)];
  const clearance: [number, number] = [+(hole[0] - shaft[1]).toFixed(4), +(hole[1] - shaft[0]).toFixed(4)];
  const holeTol = +((hu - hl) / 2000).toFixed(4), shaftTol = +((su - sl) / 2000).toFixed(4);
  return { fit, mm, hole, shaft, clearance, holeTol, shaftTol,
    says: `${fit.id} at ⌀${mm}: the hole ${hole[0]} to ${hole[1]} (±${holeTol}), the shaft ${shaft[0]} to ${shaft[1]} (±${shaftTol}), leaving ${clearance[0] < 0 && clearance[1] < 0 ? `${(-clearance[1]).toFixed(4)} to ${(-clearance[0]).toFixed(4)} mm of interference` : `${clearance[0]} to ${clearance[1]} mm of clearance`}. ${fit.says}` };
}

/** What a named feature's tolerance should be, derived rather than written: the words a bill of materials uses, read
 *  into the fit that feature has to make. This is the call that was being made by feel on every line of every build. */
export function tolFor(name: string, mm?: number): { tol: number; fit?: string; why: string } {
  const d = mm ?? 25, n = name.toLowerCase();
  const by = (id: string, which: 'hole' | 'shaft') => { const f = fitAt(id, d); return { tol: which === 'hole' ? f.holeTol : f.shaftTol, fit: id, why: `${name} is ${f.fit.name}: ${f.says}` }; };
  if (/bearing (seat|journal)|shaft.*bearing/.test(n)) return by('H7/k6', 'shaft');
  if (/bearing (bore|housing|pocket)|\bbore\b.*bearing/.test(n)) return by('H7/k6', 'hole');
  if (/press fit|dowel|interference|driven in/.test(n)) return by('H7/p6', 'hole');
  if (/\bbush\b|plain bearing|slide|sliding|pivot|kingpin|\bpin\b.*lever/.test(n)) return by('H7/g6', 'hole');
  if (/spigot|locat|register|boss|hub|adapter/.test(n)) return by('H7/h6', 'hole');
  if (/clearance hole|through hole|bolt hole|slot/.test(n)) return by('H11/h11', 'hole');
  if (/gasket|sealing face|mating face|flange face|\bshim\b/.test(n))
    return { tol: +(itBand(d, 12) / 2).toFixed(4), why: `${name} has to seal against another face, so it gets IT12 at ${d} mm — loose, but not free: a gasket face out by a tenth of a millimetre leaks` };
  // and here is the important one. Most of a machine locates nothing: a frame member, a cover, a bracket, a thrown
  // pot. Giving those a tolerance is not caution, it is a cost with nothing on the other side of it — and an engine
  // that does it refuses to let a potter's wheel make a mug, because no wheel holds IT11. They get no requirement,
  // and come out at whatever their process holds.
  return { tol: Infinity, why: 'nothing locates off it, so it comes out as its process leaves it' };
}

// ---- the stack ---------------------------------------------------------------------------------------------------

export interface Stack { worst: number; rss: number; n: number; biggest: { of: string; tol: number }; says: string }
/** Four parts in a line, each ±0.1, are not a ±0.1 assembly. Worst case they are ±0.4 — every error the same way at
 *  once, which does happen, on the one assembly that matters. Made in quantity and centred they are ±0.2, because
 *  errors cancel as often as they add (root-sum-square). Use the worst case for a one-off and for anything that must
 *  never jam; use the RSS for a batch, and expect the odd one to need filing. */
export function stackOf(all: { of: string; tol: number }[]): Stack {
  // a part with no tolerance is not part of the chain: it locates nothing, so nothing stacks through it
  const parts = all.filter((p) => Number.isFinite(p.tol));
  const worst = +parts.reduce((a, p) => a + Math.abs(p.tol), 0).toFixed(4);
  const rss = +Math.sqrt(parts.reduce((a, p) => a + p.tol * p.tol, 0)).toFixed(4);
  const biggest = [...parts].sort((a, b) => Math.abs(b.tol) - Math.abs(a.tol))[0] ?? { of: 'nothing', tol: 0 };
  if (!parts.length) return { worst: 0, rss: 0, n: 0, biggest, says: 'nothing in this build locates off anything else, so there is no chain to add up' };
  return { worst, rss, n: parts.length, biggest,
    says: `${parts.length} in the chain: ±${worst} worst case, ±${rss} in a batch made centred. ${biggest.tol && worst ? `${biggest.of} is ${Math.round((Math.abs(biggest.tol) / worst) * 100)} % of it, so that is the one to tighten` : 'nothing in it dominates'}` };
}

// ---- the capability ----------------------------------------------------------------------------------------------

/** The normal distribution's own integral, to about 1.5e-7: Abramowitz and Stegun 7.1.26. Needed because a scrap rate
 *  is the tail of a normal curve and nothing else in this library had one. */
export function normCdf(z: number): number {
  const s = z < 0 ? -1 : 1, x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + s * erf);
}

export interface Capable {
  ok: boolean; cp: number; cpk: number;
  /** parts in a million outside the tolerance */ ppm: number;
  /** of n wanted, how many to make */ make: (n: number) => number;
  /** the process's own standard deviation, mm */ sigma: number;
  says: string;
}
/** Can a process that holds ±`holds` be asked for ±`wanted`, and what does it cost in scrap?
 *
 *  A process specified at ±0.05 holds that at three standard deviations — that is what the figure means — so σ is a
 *  third of it. Cp is the tolerance band over six σ: 1.33 is the usual minimum anyone accepts, 1.0 is three σ and
 *  about 2,700 parts per million outside, below 1.0 the scrap is visible on the floor. Cpk is the same with the mean
 *  off centre, which is the honest case, because nobody's machine is centred.
 *
 *  `make(n)` is the number to start to end up with n good ones, and that is the ability this buys: a plan that makes
 *  eight to get six instead of finding out at the measuring bench. */
export function capable(o: { holds: number; wanted: number; offset?: number; min?: number }): Capable {
  const sigma = Math.abs(o.holds) / 3, T = 2 * Math.abs(o.wanted), off = Math.abs(o.offset ?? 0);
  const cp = sigma > 0 ? T / (6 * sigma) : Infinity;
  const cpk = sigma > 0 ? Math.max(0, (Math.abs(o.wanted) - off) / (3 * sigma)) : Infinity;
  // both tails, with the mean off centre by `off`
  const out = sigma > 0 ? (1 - normCdf((Math.abs(o.wanted) - off) / sigma)) + (1 - normCdf((Math.abs(o.wanted) + off) / sigma)) : 0;
  const ppm = Math.round(Math.min(1, Math.max(0, out)) * 1e6);
  const good = Math.max(1e-6, 1 - Math.min(0.999, out));
  const min = o.min ?? 1.0;
  return { ok: cpk >= min, cp: +cp.toFixed(2), cpk: +cpk.toFixed(2), ppm, sigma: +sigma.toFixed(4),
    make: (n: number) => Math.ceil(n / good),
    says: cpk >= 1.33 ? `a process holding ±${o.holds} has σ ${sigma.toFixed(4)}, so ±${o.wanted} is Cp ${cp.toFixed(2)}, Cpk ${cpk.toFixed(2)}: comfortable, about ${ppm} in a million outside`
      : cpk >= min ? `±${o.wanted} out of a process holding ±${o.holds} is Cpk ${cpk.toFixed(2)}: it will do it, but about ${(ppm / 1e4).toFixed(2)} % come out wrong, so make spares and measure every one`
      : `±${o.wanted} out of a process holding ±${o.holds} is Cpk ${cpk.toFixed(2)} — ${(Math.min(100, ppm / 1e4)).toFixed(1)} % scrap. Make ${Math.ceil(1 / good)} to get one, or use a process that holds it` };
}

/** What a process is really holding, once some parts have been measured. Three measurements is not a capability
 *  study and this says so; from about thirty it is worth more than the class figure, because it is this machine in
 *  this room with this operator, and that is what a works actually has. */
export function measured(errs: number[], o: { holds?: number } = {}): { sigma: number; mean: number; holds: number; n: number; trust: 'too few' | 'a hint' | 'real'; says: string } {
  const n = errs.length;
  if (!n) return { sigma: (o.holds ?? 0) / 3, mean: 0, holds: o.holds ?? 0, n: 0, trust: 'too few', says: 'nothing measured yet: the class figure is all there is' };
  const mean = errs.reduce((a, x) => a + x, 0) / n;
  const sigma = n > 1 ? Math.sqrt(errs.reduce((a, x) => a + (x - mean) ** 2, 0) / (n - 1)) : Math.abs(errs[0]! - mean);
  const holds = +(3 * sigma).toFixed(4);
  const trust = n < 8 ? 'too few' : n < 30 ? 'a hint' : 'real';
  return { sigma: +sigma.toFixed(5), mean: +mean.toFixed(5), holds, n, trust,
    says: trust === 'real' ? `measured over ${n} parts: σ ${sigma.toFixed(4)} mm and a mean ${mean >= 0 ? '+' : ''}${mean.toFixed(4)} off nominal, so this machine holds ±${holds} — believe this over the class figure${o.holds ? ` of ±${o.holds}` : ''}, and take the ${mean >= 0 ? 'oversize' : 'undersize'} out of the offset before anything else`
      : trust === 'a hint' ? `${n} parts is a hint, not a study: σ ${sigma.toFixed(4)} suggests ±${holds}, and the mean is ${mean >= 0 ? '+' : ''}${mean.toFixed(4)} off nominal, which is worth correcting now`
      : `${n} parts measured: too few to say what the machine holds, but the mean is already ${mean >= 0 ? '+' : ''}${mean.toFixed(4)} off nominal and that part is worth correcting` };
}

/** The fits and grades written out, to be read or argued with. */
export function fitsText(mm = 25): string {
  return [`At ⌀${mm} mm:`, ...FITS.map((f) => `  ${fitAt(f.id, mm).says}`),
    `  IT grades at ${mm} mm: ${[5, 6, 7, 8, 9, 10, 11].map((g) => `IT${g} ${itBand(mm, g)}`).join(', ')} mm wide (${IT_SRC}).`].join('\n');
}

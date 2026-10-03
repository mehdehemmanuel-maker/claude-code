// A battery pack of lead-acid blocks, by the chemistry and its maker's table. Its open-circuit voltage follows the
// acid's specific gravity (cell volts = 0.85 + SG, the electrochemical rule of thumb for lead-acid; SG from about 1.10
// flat to 1.30 charged in a VRLA cell, so 1.95 to 2.15 V a cell). Under load it sags by its internal resistance. How
// much charge it gives depends on how fast it is drawn: its maker's capacity table, interpolated, so drawn at its 1 h
// rate it lasts an hour and at its 20 h rate twenty. It is flat when, under load, it falls to the end voltage its maker
// rates that rate to.

import type { BatteryData } from '../data/batteries';

export interface Pack {
  data: BatteryData;
  /** Blocks in series, and strings of them in parallel. */
  series: number;
  parallel: number;
}

/**
 * Open-circuit volts of one cell at state of charge `soc` (0 flat, 1 charged), by its chemistry: a lead-acid cell
 * 1.95 to 2.15 V (its acid's strength sets it), a nickel-metal-hydride cell about 1.25 V over most of its charge,
 * rising to 1.40 V full (the curve's shape an estimate: the plateau is what the chemistry gives).
 */
export const cellOCV = (chemistry: BatteryData['chemistry'], soc: number) => {
  const x = Math.max(0, Math.min(1, soc));
  return chemistry === 'nimh' ? 1.25 + 0.15 * x * x : 0.85 + 1.1 + 0.2 * x;
};

export const packOCV = (p: Pack, soc: number) => p.series * p.data.cells * cellOCV(p.data.chemistry, soc);
export const packR = (p: Pack) => (p.series * p.data.internalR) / p.parallel;

/** Points of the maker's table as (current A, capacity Ah, end volts per cell), fastest first. */
function table(d: BatteryData) {
  return d.capacity.map((c) => ({ I: c.Ah / c.hours, Ah: c.Ah, end: c.endPerCell })).sort((x, y) => y.I - x.I);
}

/**
 * Capacity one block gives from charged at a constant current I (A): log-log interpolation between the maker's points;
 * slower than its slowest rate, that rate's capacity; faster than its fastest, extrapolated along its two fastest.
 */
export function blockCapacity(d: BatteryData, I: number): number {
  const t = table(d);
  if (!(I > 0) || I <= t[t.length - 1]!.I) return t[t.length - 1]!.Ah;
  for (let i = 0; i < t.length - 1; i++) {
    const hi = t[i]!, lo = t[i + 1]!;
    if (I >= lo.I && I <= hi.I) {
      const f = Math.log(I / lo.I) / Math.log(hi.I / lo.I);
      return Math.exp(Math.log(lo.Ah) + f * (Math.log(hi.Ah) - Math.log(lo.Ah)));
    }
  }
  const a = t[0]!, b = t[1]!;
  const slope = Math.log(a.Ah / b.Ah) / Math.log(a.I / b.I);
  return a.Ah * Math.pow(I / a.I, slope);
}

/** End voltage per cell the maker rates a discharge at current I to (interpolated by rate). */
export function endPerCell(d: BatteryData, I: number): number {
  const t = table(d);
  if (I >= t[0]!.I) return t[0]!.end;
  if (I <= t[t.length - 1]!.I) return t[t.length - 1]!.end;
  for (let i = 0; i < t.length - 1; i++) {
    const hi = t[i]!, lo = t[i + 1]!;
    if (I >= lo.I && I <= hi.I) return lo.end + ((hi.end - lo.end) * Math.log(I / lo.I)) / Math.log(hi.I / lo.I);
  }
  return t[t.length - 1]!.end;
}

/** The pack's capacity at current I (A), Ah. */
export const packCapacity = (p: Pack, I: number) => p.parallel * blockCapacity(p.data, I / p.parallel);

/** State of charge after drawing I (A) for dt (s): the fraction of what it gives at that rate. */
export function drain(p: Pack, soc: number, I: number, dt: number): number {
  if (!(I > 0)) return soc;
  return Math.max(0, soc - (I * dt) / (3600 * packCapacity(p, I)));
}

/** Whether the pack is flat drawing I: its voltage under that load at or below the end voltage for that rate. */
export function flat(p: Pack, soc: number, I: number): boolean {
  if (soc <= 0) return true;
  const V = packOCV(p, soc) - I * packR(p);
  return V <= p.series * p.data.cells * endPerCell(p.data, I / p.parallel);
}

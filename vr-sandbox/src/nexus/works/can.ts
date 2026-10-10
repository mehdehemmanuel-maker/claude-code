// What this works knows about itself, and whether it can make a thing.
//
// A station's tolerance is a class figure until the works has measured something. Once it has, the measurement is
// worth more: it is this machine, in this room, with this operator. This is the loop the rest of the package keeps
// claiming to close, closed — measure a part, and the next plan is made against what the machine actually does.
//
// And the tolerance check is no longer a cliff. A process is eligible while its capability is above a floor, and the
// scrap it costs comes back in the verdict, so a plan can make eight to get six instead of finding out at the
// measuring bench. Refusing a tight tolerance outright was the engine being prissier than a real shop.
//
// Owner of: what has been measured, what a station therefore holds, and the verdict on whether a works can make a
// given thing — which station, which process, how well, and what stops it when nothing can.

import { capable, measured, type Capable } from '../fits';
import { makes, processById, type Family, type MatClass, type Process, type Shape } from './families';
import { STATIONS, stationById, stationUsd, type Station } from './stations';
import { runMinutes } from './plan';

// ---- what the works knows about itself ---------------------------------------------------------------------------
// A station's tolerance is a class figure until the works has measured something. Once it has, the measurement is
// worth more: it is this machine, in this room, with this operator. This is the loop the whole file keeps claiming
// to close, closed: measure a part, and the next plan is made against what the machine actually does.

// ---- what the works knows about itself ---------------------------------------------------------------------------
// A station's tolerance is a class figure until the works has measured something. Once it has, the measurement is
// worth more: it is this machine, in this room, with this operator. This is the loop the whole file keeps claiming
// to close, closed: measure a part, and the next plan is made against what the machine actually does.

export interface WorksState {
  /** errors from nominal, mm, by `station/process` */ seen: Record<string, number[]>;
  /** minutes actually taken, by process, against what was planned */ took?: Record<string, { planned: number; real: number }[]>;
}
export const emptyState = (): WorksState => ({ seen: {}, took: {} });
/** Note what a part came out at. The sign matters: a mean offset is worth correcting before anything else, because it
 *  is free — it is one number in the machine, not a better machine. */
export function sawPart(state: WorksState, station: string, process: string, errMm: number): WorksState {
  const k = `${station}/${process}`;
  return { ...state, seen: { ...state.seen, [k]: [...(state.seen[k] ?? []), errMm] } };
}
/** What a station really holds on a process: its measured spread where there is enough of it, else the class figure.
 *  Eight parts is a hint and thirty is a study; under eight the class figure stands, and the mean offset is reported
 *  either way because it is worth correcting from the first part. */
export function holdsOf(station: Station, process: string, state?: WorksState): { tol: number; from: 'class' | 'measured'; says: string } {
  const classTol = station.tol ?? processById(process).tol;
  const errs = state?.seen[`${station.id}/${process}`] ?? [];
  if (errs.length < 8) return { tol: classTol, from: 'class', says: errs.length ? `${errs.length} parts measured, too few to say: the class figure ±${classTol} stands. ${measured(errs, { holds: classTol }).says}` : `nothing measured on ${station.name} yet: the class figure ±${classTol}` };
  const m = measured(errs, { holds: classTol });
  return { tol: m.holds, from: 'measured', says: m.says };
}

export interface Want {
  material: MatClass; size: [number, number, number]; tol?: number; feature?: number;
  /** only this family of making */ family?: Family;
  /** round, flat or neither */ shape?: Shape; cm3?: number; n?: number;
  /** true to allow a prep-, finish- or join-only process to answer. Off by default, and naming a family does not turn
   *  it on — asking for `cut` and being offered a drill press is how a plan ends up facing a plate on a lathe */ anyRole?: boolean;
  /** what this works has measured, so the answer is about this machine rather than its class */ state?: WorksState;
  /** the least Cpk worth starting: 1.0 is three sigma, 0.5 is about one part in seven scrapped. Default 0.5, because
   *  a cheap works does hold a tight tolerance by making spares and measuring every one, and refusing that outright
   *  was the engine being prissier than a real shop */ minCpk?: number;
}
export interface Verdict {
  ok: boolean; by?: { station: Station; process: Process }; minutes?: number;
  /** how well the chosen station holds what was asked, and how many to make to get the ones wanted */ fit?: Capable;
  why?: string; buy?: { station: Station; usd: number };
}
/** Can this works make that, and on what? The station and process that would do it in the fewest minutes, or the cause
 *  that stops it and the cheapest station that would close the gap. A gap is named by its cause — the material, the
 *  size, the tolerance, the shape — never as "no". */
const canMakeMemo = new Map<string, Verdict>();
export function canMake(ids: string[], w: Want): Verdict {
  // memoised: planJob asks this once a line, worksUnder asks it never, but `worksUnder` scores a hundred candidate
  // sets and the tests throw six builds at five works, so the same question is asked thousands of times
  const key = `${ids.join(',')}|${w.material}|${w.size.join('x')}|${w.tol ?? ''}|${w.feature ?? ''}|${w.family ?? ''}|${w.shape ?? ''}|${w.cm3 ?? ''}|${w.n ?? ''}|${w.anyRole ? 1 : 0}|${w.minCpk ?? ''}|${w.state ? JSON.stringify(w.state.seen) : ''}`;
  const had = canMakeMemo.get(key); if (had) return had;
  const v = canMakeUncached(ids, w);
  if (canMakeMemo.size > 4000) canMakeMemo.clear();
  canMakeMemo.set(key, v);
  return v;
}
function canMakeUncached(ids: string[], w: Want): Verdict {
  const want = { tol: Infinity, feature: 0, shape: 'solid' as Shape, n: 1, minCpk: 0.5, ...w };
  const fits = (s: Station, p: Process): string | null => {
    if (!want.anyRole && !makes(p)) return 'role';
    if (!p.on.includes(want.material)) return 'material';
    if (want.family && p.family !== want.family) return 'family';
    if (p.shape && p.shape !== want.shape) return 'shape';
    const e = s.envelope;
    if (e) { const part = [...want.size].sort((a, b) => a - b), box = [...e].sort((a, b) => a - b); if (part.some((x, i) => x > box[i]!)) return 'size'; }
    // the tolerance is no longer a cliff: a process is eligible while its capability is above the floor, and the
    // scrap it costs comes back in the verdict so the plan can make the spares
    if (Number.isFinite(want.tol)) { const h = holdsOf(s, p.id, want.state).tol; if (capable({ holds: h, wanted: want.tol }).cpk < want.minCpk) return 'tolerance'; }
    if (want.feature > 0 && p.feature > want.feature) return 'feature';
    return null;
  };
  const able = ids.map(stationById).flatMap((s) => s.does.map((d) => { const p = processById(d); return { s, p, no: fits(s, p) }; }));
  const tried = able.flatMap((a) => (a.no ? [a.no] : []));
  const ok = able.filter((a) => !a.no).map((a) => {
    const fit = Number.isFinite(want.tol) ? capable({ holds: holdsOf(a.s, a.p.id, want.state).tol, wanted: want.tol }) : undefined;
    const n = fit ? fit.make(want.n) : want.n;
    return { ...a, fit, minutes: a.p.setup + runMinutes(a.p, { n, cm3: want.cm3, size: want.size }) };
  });
  if (ok.length) {
    // the cheapest in minutes, and between two alike the one that holds it better: a comfortable process is worth a
    // minute of anyone's time against one that scraps a part in five
    const best = ok.sort((a, b) => a.minutes - b.minutes || (b.fit?.cpk ?? 0) - (a.fit?.cpk ?? 0))[0]!;
    return { ok: true, by: { station: best.s, process: best.p }, minutes: +best.minutes.toFixed(1), fit: best.fit };
  }
  const could = STATIONS.filter((s) => !ids.includes(s.id) && s.does.some((d) => !fits(s, processById(d)))).sort((a, b) => stationUsd(a) - stationUsd(b))[0];
  const near = ids.map(stationById).flatMap((s) => s.does.map(processById).filter((p) => makes(p) && p.on.includes(want.material) && (!p.shape || p.shape === want.shape))
    .map((p) => ({ s, p, c: capable({ holds: holdsOf(s, p.id, want.state).tol, wanted: want.tol }) }))).sort((a, b) => b.c.cpk - a.c.cpk)[0];
  const cause = tried.includes('tolerance')
    ? `nothing here holds ±${want.tol} mm${near ? `: the nearest is ${near.s.name} at Cpk ${near.c.cpk}, which would scrap ${(near.c.ppm / 1e4).toFixed(0)} % — ${Math.ceil(near.c.make(want.n) / Math.max(1, want.n))} made for every one kept` : ''}`
    : tried.includes('size') ? `nothing here takes a part ${want.size.join(' × ')} mm`
    : tried.includes('shape') ? `nothing here makes a ${want.shape === 'solid' ? 'shape like that' : `${want.shape} part`} out of ${want.material}`
    : tried.includes('feature') ? `nothing here makes a ${want.feature} mm feature`
    : `nothing here works ${want.material}`;
  return { ok: false, why: cause, ...(could ? { buy: { station: could, usd: stationUsd(could) } } : {}) };
}

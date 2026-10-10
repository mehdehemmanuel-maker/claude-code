// The works a budget actually buys.
//
// "What is the most capable works I can have for this much" is the question a person really asks, and the answer is
// not the top of a list of tiers: it is a greedy walk that spends each dollar where it buys the most capability, and
// takes the cheap-and-laborious path wherever there is one.
//
// Owner of: scoring a works' capability, the walk that spends a budget, and the works under $3,000 this was asked
// for. The stations it spends on, and their prices, are `stations.ts`.

import { usd as money } from '../parts/prices';
import { processById, type MatClass } from './families';
import { STATIONS, stationById, stationCost, stationUsd, worksOf, type Buying } from './stations';

/** The works a budget actually buys, derived rather than declared. This is the question a person really asks — "what
 *  is the most capable works I can have for this much" — and the answer is not the top of a list of tiers: it is a
 *  greedy walk that spends each dollar where it buys the most capability.
 *
 *  Capability is scored, so the trade is arguable rather than asserted: a family of making not yet covered is worth
 *  far more than a second machine in a family already covered; a material class the works cannot touch is worth more
 *  than a faster way to touch one it can; and a tenfold improvement in tolerance is worth about as much as a new
 *  material. The floor — a bench, measurement and a computer — is bought first and not scored, because nothing else
 *  works without it: a machine with no way to hold the part, check the part or send it a program is an ornament.
 *  The safety kit is bought automatically the first time a hazardous station is chosen, and its cost comes out of the
 *  same budget, because that is what honesty costs. */
export interface Bought { id: string; usd: number; as: Buying; hours: number; gain: string }
/** What this library's own builds are made of, and so what a works for them has to work: machines, boards, robots and
 *  instruments. It is the default `want` because a capability is only worth what it is wanted for — without it the
 *  engine will buy a potter's wheel before a 3D printer, since the wheel is the cheapest station that covers forming,
 *  and be right by its own score and absurd in a workshop. Ask for clay and it will buy the wheel. */
export const WANT_MACHINES: MatClass[] = ['thermoplastic', 'metal-soft', 'metal-hard', 'board', 'composite', 'wood'];
export function worksUnder(cap: number, o: { floor?: string[]; avoid?: string[]; prefer?: Buying; want?: MatClass[] } = {}): { ids: string[]; usd: number; hours: number; left: number; steps: Bought[]; says: string } {
  const prefer = o.prefer ?? 'build', want = o.want ?? WANT_MACHINES;
  // a family counts only where a process in it works something wanted; a wanted material class is worth fifteen times
  // one that is not. Both numbers are arguable, and arguing with them is the point of having them written down.
  const score = (ids: string[]): number => {
    const procs = [...new Set(ids.flatMap((i) => stationById(i).does))].map(processById);
    const useful = procs.filter((p) => p.on.some((c) => want.includes(c)));
    const families = new Set(useful.map((p) => p.family)).size;
    const classes = [...new Set(procs.filter((p) => p.family !== 'measure').flatMap((p) => p.on))];
    const tol = Math.min(...ids.flatMap((i) => stationById(i).does.map(processById).filter((p) => p.family !== 'measure').map((p) => stationById(i).tol ?? p.tol)), Infinity);
    return 1000 * families + 300 * classes.filter((c) => want.includes(c)).length + 20 * classes.filter((c) => !want.includes(c)).length
      + 25 * procs.length + (Number.isFinite(tol) ? 150 * Math.max(0, -Math.log10(tol)) : 0);
  };
  const avoid = o.avoid ?? [];
  const base = (o.floor ?? ['bench', 'measuring', 'computer']).filter((i) => !avoid.includes(i));
  const ids: string[] = [], steps: Bought[] = [];
  let usd = 0, hours = 0;
  const take = (id: string, gain: string) => {
    const c = stationCost(stationById(id), ids, prefer);
    ids.push(id); usd = +(usd + c.usd).toFixed(2); hours += c.hours;
    steps.push({ id, usd: c.usd, as: c.as, hours: c.hours, gain });
  };
  // the floor, in the order its own self-builds allow: a bench welded by a welder needs the welder first, so on the
  // first pass the floor is bought as it comes and the greedy below may replace nothing — the order is the point
  for (const id of base) take(id, 'the floor: nothing else works without it');
  if (usd > cap) return { ids: [], usd: 0, hours: 0, left: cap, steps: [], says: `${money(cap)} does not reach the floor: a bench, a calliper and a computer are ${money(usd)} between them, and a machine with no way to hold, check or program the part is an ornament` };
  const hazardous = (id: string) => stationById(id).does.some((d) => !!processById(d).hazard);
  for (;;) {
    let best: { id: string; per: number; gain: number; cost: number } | null = null;
    for (const st of STATIONS) {
      if (ids.includes(st.id) || avoid.includes(st.id) || st.id === 'safety') continue;
      const c = stationCost(st, ids, prefer);
      const needsKit = (hazardous(st.id) || !!st.selfBuild?.needs.includes('safety')) && !ids.includes('safety');
      const cost = +(c.usd + (needsKit ? stationUsd(stationById('safety')) : 0)).toFixed(2);
      if (cost <= 0 || usd + cost > cap) continue;
      const gain = score([...ids, st.id]) - score(ids);
      if (gain <= 0) continue;
      const per = gain / cost;
      if (!best || per > best.per) best = { id: st.id, per, gain, cost };
    }
    if (!best) break;
    if ((hazardous(best.id) || !!stationById(best.id).selfBuild?.needs.includes('safety')) && !ids.includes('safety'))
      take('safety', `bought with ${stationById(best.id).name}, because it carries a hazard and a works that owns one without the other is not cheaper \u2014 it is unbuilt`);
    const c = stationCost(stationById(best.id), ids, prefer);
    take(best.id, `${Math.round(best.gain)} points of capability for ${money(c.usd)}${c.as === 'build' ? ` and ${c.hours} h of your own work, made here rather than bought` : c.as === 'used' ? ', secondhand' : ''}: ${stationById(best.id).why.split(/[.:]/)[0]}`);
  }
  const w = worksOf(ids), left = +(cap - usd).toFixed(2);
  const builtHere = steps.filter((x) => x.as === 'build');
  return { ids, usd, hours, left, steps,
    says: `For ${money(cap)}: ${ids.length} stations at ${money(usd)}${hours ? ` plus ${hours} h of your own work` : ''}, ${money(left)} left for the first month of consumables \u2014 filament, welding wire, flux, a crucible of aluminium, cutters.`
      + ` It covers ${w.families.length} of the six families (${w.families.join(', ')}), works ${w.materials.length} material classes, and holds \u00b1${w.tol} mm at its best while measuring to \u00b1${w.measureTol}.`
      + (w.missing.length ? ` It does not cover ${w.missing.join(' or ')}.` : '')
      + (builtHere.length ? ` ${builtHere.length} station${builtHere.length === 1 ? ' is' : 's are'} made here rather than bought (${builtHere.map((x) => stationById(x.id).name).join(', ')}), which is where the money was saved and where the ${builtHere.reduce((a, x) => a + x.hours, 0)} h went.` : '') };
}

/** The works this was asked for: the most capable one under $3,000, derived by `worksUnder` and not chosen by hand,
 *  so it moves when a price or a station moves instead of going stale in a list. Worked out on the first call and
 *  kept, rather than at import, so that every file importing this one does not pay for a greedy walk over stations it
 *  will never ask about. A function and not a constant, because a constant would have to be either eager or a proxy,
 *  and a proxy is the kind of cleverness that costs an afternoon the first time it surprises someone. */
let under3k: ReturnType<typeof worksUnder> | null = null;
export const under3K = (): ReturnType<typeof worksUnder> => (under3k ??= worksUnder(3000));

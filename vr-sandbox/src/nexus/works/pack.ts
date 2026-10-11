// The works as a thing you can go and buy, in the order to buy it in. `worksUnder` (src/nexus/works/budget.ts) spends a
// budget and says which stations and in what order; this turns that into what a person actually needs in front of them:
// each station's own seller and price where a seller sells it, what the estimate is of where none does, what the used
// market asks, and — where the cheapest way to have a station is to make it — the job that makes it, routed through the
// works as it stands at that moment, which is the part a list of machines cannot tell you.
//
// The order is the whole point and it is not alphabetical or by price: the welder comes before the forge because the
// forge is a welded tube, and the bench comes after the welder because the bench is welded too. A works that buys in
// the wrong order pays new for the three things it could have made.
//
// Owner of: the works as a build pack (what to buy, in what order, from whom, and what to make instead).

import { cheapest, type Offer } from '../parts/prices';
import { planJob, type Job } from './plan';
import { stationById, stationCost, stationUsd, worksOf, type Buying, type Station } from './stations';
import { BUILDS } from './builds';

/** Which build makes which station, where this works keeps a bill of materials for it. Where a station has none, its
 *  self-build is still described (its own `how`), and a bill for it is the next thing to write. */
export const BUILT_BY: Record<string, string> = { brake: 'brake-sheet', foundry: 'furnace-crucible', bench: 'workbench' };
import { worksUnder } from './budget';

/** One station, as it is come by: bought from a named seller, bought used, or made here from the job that makes it. */
export interface StationBuy {
  id: string; name: string; as: Buying;
  usd: number; /** hours of work, where it is made or has to be collected */ hours: number;
  /** the seller's own offer, where a seller sells this station's keystone part */ offer?: Offer;
  /** what the money is: an offer, an estimate of a set, or the materials of a self-build */ from: string;
  /** what having it adds that the works could not do before */ gain: string;
  /** the stations it has to have before it can be made here */ after: string[];
  /** the job that makes it, where this works keeps a build for it */ job?: Job;
  /** the steps to make it, where there is no build to plan: its own description, as one step with a check */ how?: string;
  floor: number; kw: number; why: string;
}

export interface WorksPack {
  cap: number; stations: StationBuy[];
  usd: number; hours: number;
  /** what it would have cost with everything bought new, and what the order saves */ ifNew: number; saves: number;
  floor: number; kw: number; needs: string[];
  families: string[]; missing: string[]; materials: string[];
  tol: number; measureTol: number;
  says: string;
}

/** A station's keystone offer: the real listing behind its price, where its price is a key in prices.ts rather than an
 *  estimate of a set of things (a bench is a bench, a vice, files and a drill, and no one sells that as one line). */
function offerOf(s: Station): Offer | undefined {
  return s.price ? cheapest(s.price)?.offer : undefined;
}

/** The works a budget buys, as a pack: every station in the order to come by it, with its seller or its job. */
export function worksPack(cap = 3000, o: Parameters<typeof worksUnder>[1] = {}): WorksPack {
  const r = worksUnder(cap, o);
  const had: string[] = [], stations: StationBuy[] = [];
  for (const step of r.steps) {
    const s = stationById(step.id);
    const way = stationCost(s, had, o.prefer ?? 'build');
    const build = BUILT_BY[step.id] ? BUILDS.find((b) => b.id === BUILT_BY[step.id]) : undefined;
    const b: StationBuy = {
      id: s.id, name: s.name, as: step.as, usd: step.usd, hours: step.hours,
      from: way.says, gain: step.gain, after: step.as === 'build' ? s.selfBuild?.needs ?? [] : [],
      floor: s.floor, kw: s.kw, why: s.why,
      ...(step.as === 'new' && offerOf(s) ? { offer: offerOf(s) } : {}),
      // a station made here is made on the works as it stands at that moment, which is why the order matters
      ...(step.as === 'build' && build && had.length ? { job: planJob(`${s.name} (made here)`, build.lines, [...had], build.joins ?? []) } : {}),
      ...(step.as === 'build' && s.selfBuild ? { how: s.selfBuild.how } : {}),
    };
    stations.push(b); had.push(s.id);
  }
  const sum = worksOf(r.ids);
  const ifNew = +r.ids.reduce((a, i) => a + stationUsd(stationById(i)), 0).toFixed(2);
  return {
    cap, stations, usd: r.usd, hours: r.hours, ifNew, saves: +(ifNew - r.usd).toFixed(2),
    floor: sum.floor, kw: sum.kw, needs: sum.needs,
    families: sum.families, missing: sum.missing, materials: sum.materials,
    tol: sum.tol, measureTol: sum.measureTol, says: r.says,
  };
}

const money = (n: number) => `$${n.toFixed(2)}`;
/** a, b and c */
const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/** The pack as a page: a table in buying order, then each self-build's own job, then what the works still cannot do. */
export function worksPackText(p: WorksPack): string {
  const out = [`# The works under $${p.cap.toLocaleString('en-US')}`, '', p.says, '',
    `${money(p.usd)} and ${p.hours} hours of work, against ${money(p.ifNew)} with everything bought new: the order saves ${money(p.saves)}.`,
    `It wants ${p.floor} m² of floor and draws ${p.kw} kW with everything running at once (nothing here runs everything at once), and it needs ${p.needs.join(', ')}.`,
    `It covers ${p.families.join(', ')}${p.missing.length ? ` and not ${p.missing.join(', ')}` : ' — all six families'}, over ${p.materials.length} classes of material, holding ±${p.tol} mm and measuring to ±${p.measureTol} mm.`, '',
    '## In this order', '', '| # | station | how | cost | running | why this one |', '| --- | --- | --- | --- | --- | --- |'];
  let run = 0;
  p.stations.forEach((s, i) => {
    run = +(run + s.usd).toFixed(2);
    const how = s.as === 'build' ? `make it (${s.hours} h${s.after.length ? `, needs ${s.after.join(', ')} first` : ''})` : s.as === 'used' ? 'buy used' : s.offer ? `[${s.offer.name}](${s.offer.url}) from ${s.offer.seller}` : 'buy new';
    out.push(`| ${i + 1} | ${s.name} | ${how} | ${money(s.usd)} | ${money(run)} | ${s.gain} |`);
  });
  for (const s of p.stations) {
    if (s.as !== 'build') continue;
    out.push('', `## Making ${s.name}`, '', s.how ?? '', ...(s.after.length ? ['', `It needs ${list(s.after.map((n) => stationById(n).name))} first: that is why it is step ${p.stations.indexOf(s) + 1} and not step one.`] : []));
    if (s.job) {
      out.push('', `Its job as this works routes it, on the ${s.job.works.length} stations bought before it (${s.job.works.join(', ')}): ${s.job.minutes} minutes of work over ${s.job.makespan} minutes of clock.`, '',
        ...s.job.ops.map((op) => `- ${op.part}${op.n > 1 ? ` \u00d7 ${op.n}` : ''}: ${op.process} at ${stationById(op.station).name}, ${op.setup} min setup and ${op.run} min run${Number.isFinite(op.tol) ? `, \u00b1${op.tol} mm` : ''}`),
        ...(s.job.buy.length ? ['', ...s.job.buy.map((b) => `- buy ${b.line.name}${b.line.n > 1 ? ` \u00d7 ${b.line.n}` : ''}: ${b.why}${b.usd == null ? ' (not priced yet)' : ` (${money(b.usd)})`}`)] : []),
        ...(s.job.gaps.length ? ['', ...s.job.gaps.map((g) => `- **gap**: ${g.line.name} \u2014 ${g.why}`)] : []));
    }
  }
  const unpriced = p.stations.filter((s) => !s.offer && s.as === 'new');
  out.push('', '## What the money is', '',
    ...p.stations.map((s) => `- ${s.name}: ${s.offer ? `${s.offer.seller}'s own price as seen ${s.offer.seen}` : s.from}`),
    ...(unpriced.length ? ['', `${unpriced.length} of these are estimates of a set rather than one seller's line: ${unpriced.map((s) => s.name).join('; ')}. Each says what it is an estimate of above.`] : []));
  return out.join('\n');
}

// Local clocks. A manifold does not advance on one step: each region advances at the time its own mechanisms need. For
// a carrier stored in a region and conducted across its boundaries, that time is the region's capacity over what
// conducts to and from it (the carrier family's time constant, C / G). Regions with no path between them share nothing
// and need no common clock at all; regions that exchange need only agree on what crosses.
//
// The steps are powers of two of the finest, so every region's step is a whole number of the finer ones and the clocks
// meet. Across each boundary the side with the finer clock computes the flux, because it resolves it, and the side
// with the coarser clock receives exactly the content that crossed, accumulated over its step: nothing is made or lost
// between clocks, whatever the clocks are. A coarser region is seen by a finer one as it last was, which is stale by at
// most the coarser step, and that step is a small fraction of the coarser region's own time.

export interface Region { name: string; /** capacity, J/K */ C: number; /** potential at the start */ T0: number; /** what is made in it, W */ source?: number }
/** A boundary between two regions, or between a region and a held reservoir (b < 0, at potential `held`). */
export interface Boundary { a: number; b: number; /** conductance, W/K */ G: number; held?: number }

export interface Plan {
  /** Each region's own time: its capacity over all that conducts to and from it. */
  own: number[];
  /** Each region's step: the finest step times 2^level. */
  step: number[];
  level: number[];
  finest: number;
  /** The groups of regions with paths between them: a group shares no clock with another. */
  groups: number[][];
}

/** Steps from the regions' own times: a fraction of each (one for all, or one per region), rounded down to the finest times a power of two. */
export function plan(regions: Region[], boundaries: Boundary[], fraction: number | number[]): Plan {
  const G = regions.map((_, i) => boundaries.filter((x) => x.a === i || x.b === i).reduce((s, x) => s + x.G, 0));
  const own = regions.map((r, i) => r.C / G[i]!);
  const want = own.map((t, i) => (Array.isArray(fraction) ? fraction[i]! : fraction) * t);
  const finest = Math.min(...want);
  const level = want.map((w) => Math.floor(Math.log2(w / finest) + 1e-12));
  // the groups: regions joined by a boundary between them (a reservoir joins nothing)
  const parent = regions.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  for (const x of boundaries) if (x.b >= 0) parent[find(x.a)] = find(x.b);
  const groups = [...new Set(regions.map((_, i) => find(i)))].map((g) => regions.map((_, i) => i).filter((i) => find(i) === g));
  return { own, step: level.map((l) => finest * 2 ** l), level, finest, groups };
}

export interface Run { T: number[]; /** content made in every region and crossing from every reservoir over the run, J */ made: number; /** content held at the start and the end, J */ start: number; end: number; /** region-steps taken */ steps: number }

/**
 * Advance every region on its own clock for a duration. A region steps when the finest clock has run its step; across
 * a boundary the finer side computes the flux from both sides' present potentials and the coarser side receives what
 * crossed, at its own next step. Explicit in each region: stable while each step is under twice the region's own time.
 */
export function advance(regions: Region[], boundaries: Boundary[], p: Plan, duration: number): Run {
  const T = regions.map((r) => r.T0);
  const owed = regions.map(() => 0); // content received across boundaries the region does not compute, since its last step
  const ticks = Math.round(duration / p.finest);
  const start = regions.reduce((s, r, i) => s + r.C * T[i]!, 0);
  let made = 0, steps = 0;
  // who computes each boundary's flux: the side with the finer clock, or the region when the other side is held
  const owner = boundaries.map((x) => (x.b < 0 ? x.a : p.level[x.a]! <= p.level[x.b]! ? x.a : x.b));
  for (let t = 0; t < ticks; t++) {
    const due = regions.map((_, i) => i).filter((i) => t % 2 ** p.level[i]! === 0).sort((a, b) => p.level[a]! - p.level[b]!);
    for (const i of due) {
      const dt = p.step[i]!;
      let q = (regions[i]!.source ?? 0) * dt;
      made += (regions[i]!.source ?? 0) * dt;
      boundaries.forEach((x, k) => {
        if (owner[k] !== i) return;
        const other = x.b < 0 ? x.held! : T[x.a === i ? x.b : x.a]!;
        const e = x.G * (other - T[i]!) * dt;
        q += e;
        if (x.b < 0) made += e; else owed[x.a === i ? x.b : x.a]! -= e;
      });
      T[i] = T[i]! + (q + owed[i]!) / regions[i]!.C;
      owed[i] = 0;
      steps++;
    }
  }
  // what was owed and not yet received is still in transit: it is counted where it will arrive
  const end = regions.reduce((s, r, i) => s + r.C * T[i]! + owed[i]!, 0);
  return { T, made, start, end, steps };
}

/** The same regions on one clock, every region at the finest step: what a single world-wide clock costs. */
export function oneClock(regions: Region[], boundaries: Boundary[], step: number, duration: number): Run {
  const p: Plan = { own: [], step: regions.map(() => step), level: regions.map(() => 0), finest: step, groups: [regions.map((_, i) => i)] };
  return advance(regions, boundaries, p, duration);
}

export interface Refinement { fractions: number[]; run: Run; plan: Plan; path: { region: number; change: number }[] }

/**
 * Refine only where it changes what is generated. Every region starts at a coarse fraction of its own time; each round
 * tries each region's step halved alone, keeps the one halving that changes the result most, and stops when no
 * halving changes any region's potential by the tolerance. A region whose step does not matter to the result is left
 * coarse, however fast it is.
 */
export function refineWhereNeeded(regions: Region[], boundaries: Boundary[], duration: number, tolerance: number, start = 0.4, rounds = 24): Refinement {
  const fractions = regions.map(() => start);
  let run = advance(regions, boundaries, plan(regions, boundaries, fractions), duration);
  const path: Refinement['path'] = [];
  for (let k = 0; k < rounds; k++) {
    let best = { region: -1, change: 0, run };
    for (let i = 0; i < regions.length; i++) {
      const f = fractions.map((x, j) => (j === i ? x / 2 : x));
      const r = advance(regions, boundaries, plan(regions, boundaries, f), duration);
      const change = Math.max(...r.T.map((x, j) => Math.abs(x - run.T[j]!)));
      if (change > best.change) best = { region: i, change, run: r };
    }
    if (best.change < tolerance) break;
    fractions[best.region]! /= 2;
    run = best.run;
    path.push({ region: best.region, change: best.change });
  }
  return { fractions, run, plan: plan(regions, boundaries, fractions), path };
}

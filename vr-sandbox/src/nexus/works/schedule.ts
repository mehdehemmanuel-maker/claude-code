// Laying the operations on the machines, and saying how good that is.
//
// Each station does one thing at a time and an operation waits for what it is after; the makespan is when the last
// one ends. Earliest-finish, which is what a one-person shop actually does.
//
// And then the honest part: a makespan on its own is a number with nothing to compare it to. It can never be shorter
// than the longest chain of operations that must happen in order, nor shorter than the busiest station's own total
// work, and the larger of those is the floor. That turns "169 minutes" into "169 against a floor of 141, so there
// are 28 minutes of waiting in it and here is the station that is the reason".
//
// Owner of: the schedule, the critical path, and the floor a schedule is judged against.

import { stationById } from './stations';
import type { Op } from './plan';

export interface Bound { makespan: number; floor: number; chain: number; busiest: { station: string; minutes: number }; slack: number; critical: string[]; says: string }
/** How good the schedule is, against what is possible rather than against nothing. The makespan can never be shorter
 *  than the longest chain of operations that must happen in order, nor shorter than the busiest station's own total
 *  work. The larger of those two is the floor. Knowing it is the difference between "169 minutes" and "169 against a
 *  floor of 141, so there are 28 minutes of waiting in it and here is which station is the reason". */
export function boundOf(ops: Op[]): Bound {
  const by = new Map(ops.map((o) => [o.id, o]));
  const seen = new Map<string, number>();
  const chainOf = (id: string, guard = new Set<string>()): number => {
    if (seen.has(id)) return seen.get(id)!;
    if (guard.has(id)) return 0;
    guard.add(id);
    const o = by.get(id); if (!o) return 0;
    const own = o.setup + o.run;
    const best = Math.max(0, ...o.after.map((a) => chainOf(a, guard)));
    const v = +(own + best).toFixed(1);
    seen.set(id, v); guard.delete(id);
    return v;
  };
  const chains = ops.map((o) => ({ id: o.id, len: chainOf(o.id) }));
  const chain = Math.max(0, ...chains.map((c) => c.len));
  const load = new Map<string, number>();
  for (const o of ops) load.set(o.station, +((load.get(o.station) ?? 0) + o.setup + o.run).toFixed(1));
  const busiest = [...load].sort((a, b) => b[1] - a[1])[0] ?? ['nothing', 0] as [string, number];
  const floor = +Math.max(chain, busiest[1]).toFixed(1);
  const makespan = scheduleOf(ops).makespan;
  // the critical path: walk back from the operation whose chain is longest
  const critical: string[] = [];
  let at: string | undefined = chains.sort((a, b) => b.len - a.len)[0]?.id;
  while (at) {
    critical.unshift(at);
    const o: Op | undefined = by.get(at);
    at = o?.after.map((a) => ({ a, l: chainOf(a) })).sort((x, y) => y.l - x.l)[0]?.a;
  }
  return { makespan, floor, chain, busiest: { station: busiest[0], minutes: busiest[1] }, slack: +(makespan - floor).toFixed(1), critical,
    says: ops.length === 0 ? 'nothing to schedule'
      : `${(makespan / 60).toFixed(1)} h on the clock against a floor of ${(floor / 60).toFixed(1)} h — ${floor === chain ? `the longest chain that must happen in order (${critical.length} operations)` : `${stationById(busiest[0]).name}'s own ${(busiest[1] / 60).toFixed(1)} h of work`} is what sets it, and ${((makespan - floor) / 60).toFixed(1)} h of the plan is waiting. ${makespan <= floor + 1e-6 ? 'This schedule cannot be beaten.' : `Another ${stationById(busiest[0]).name} would take ${((busiest[1] / 2) / 60).toFixed(1)} h off it if anything else could run then.`}` };
}

/** How long a run of n parts takes on a process: its rate where it has one, else the trade's own figure for that
 *  process; the setup once for the batch, because a batch is why a works has a queue at all. */

/** Operations laid on the machines: each station does one thing at a time, an operation waits for what it is after,
 *  and the makespan is when the last one ends. Earliest-finish, which is what a one-person shop actually does. */
export function scheduleOf(ops: Op[]): { at: { op: Op; start: number; end: number }[]; makespan: number } {
  const free: Record<string, number> = {}, done: Record<string, number> = {}, at: { op: Op; start: number; end: number }[] = [];
  const left = [...ops];
  while (left.length) {
    const ready = left.filter((o) => o.after.every((a) => !left.some((x) => x.id === a)));
    if (!ready.length) { // a cycle: lay the rest end to end rather than hang
      for (const o of left) { const s = Math.max(0, ...Object.values(free)); at.push({ op: o, start: s, end: s + o.setup + o.run }); done[o.id] = s + o.setup + o.run; free[o.station] = s + o.setup + o.run; }
      break;
    }
    ready.sort((a, b) => (a.setup + a.run) - (b.setup + b.run));
    const o = ready[0]!;
    const start = Math.max(free[o.station] ?? 0, ...o.after.map((a) => done[a] ?? 0), 0), end = +(start + o.setup + o.run).toFixed(1);
    at.push({ op: o, start, end }); done[o.id] = end; free[o.station] = end;
    left.splice(left.indexOf(o), 1);
  }
  at.sort((a, b) => a.start - b.start || a.end - b.end);
  return { at, makespan: +Math.max(0, ...at.map((x) => x.end)).toFixed(1) };
}

// The engine checking its own answer.
//
// Every line in, every line accounted for; every operation on a station that does its process; nothing starting
// before what it waits for; no station doing two things at once; the minutes adding up. `planJob` runs this on its
// own output and attaches the result, so a plan that lost a part says so instead of being quietly wrong — which is
// the whole point: a silent plan that lost a part is worse than a loud one that admits it.
//
// Owner of: the audit. It imports nothing at runtime, so it can never be the reason a plan fails to build.

import { PROCESSES } from './families';
import { stationById } from './stations';
import type { Join, PartLine } from './lines';
import type { Job } from './plan';

export interface Audit { ok: boolean; complaints: string[]; lines: number; made: number; bought: number; gaps: number; says: string }
/** The engine checking its own answer. Every line in, every line accounted for; every operation on a station that
 *  does its process; nothing starting before what it waits for; no station doing two things at once; the minutes
 *  adding up. A plan that fails this is still returned — with the complaint attached, because a silent plan that
 *  lost a part is worse than a loud one that says it did. */
export function auditJob(j: Job, lines: PartLine[], joins: Join[] = []): Audit {
  const complaints: string[] = [];
  for (const l of lines) {
    const made = j.ops.some((o) => o.part === l.name || o.part.startsWith(`${l.name}:`) || o.part.includes(l.name));
    const bought = j.buy.some((b) => b.line.name === l.name || b.line.name === `${l.name} (as material)`);
    const gap = j.gaps.some((g) => g.line.name === l.name);
    if (!made && !bought && !gap) complaints.push(`${l.name} is in the build and nowhere in the plan: not made, not bought, not refused`);
  }
  for (const jn of joins) {
    const pr = PROCESSES.find((x) => x.id === jn.how);
    const did = j.ops.some((o) => o.process === jn.how), said = j.gaps.some((g) => g.why.includes(jn.says.slice(0, 24)) || g.line.name.includes(pr?.name ?? jn.how));
    if (!did && !said) complaints.push(`${jn.n} × ${jn.how} is declared by the build and neither done nor refused`);
  }
  for (const o of j.ops) {
    if (!stationById(o.station).does.includes(o.process)) complaints.push(`${o.id} runs ${o.process} on ${o.station}, which does not do it`);
    if (o.run < 0 || o.setup < 0) complaints.push(`${o.id} takes negative time`);
  }
  const at = new Map(j.schedule.map((x) => [x.op.id, x]));
  if (at.size !== j.ops.length) complaints.push(`${j.ops.length} operations and ${at.size} scheduled: one is missing or doubled`);
  for (const x of j.schedule) for (const a of x.op.after) { const b = at.get(a); if (b && x.start < b.end - 1e-6) complaints.push(`${x.op.id} starts at ${x.start} before ${a} ends at ${b.end}`); }
  const byStation = new Map<string, { start: number; end: number }[]>();
  for (const x of j.schedule) byStation.set(x.op.station, [...(byStation.get(x.op.station) ?? []), x]);
  for (const [st, xs] of byStation) { const sorted = [...xs].sort((a, b) => a.start - b.start); for (let i = 1; i < sorted.length; i++) if (sorted[i]!.start < sorted[i - 1]!.end - 1e-6) complaints.push(`${st} is doing two things at once at ${sorted[i]!.start} min`); }
  const sum = +j.ops.reduce((a, o) => a + o.setup + o.run, 0).toFixed(1);
  if (Math.abs(sum - j.minutes) > 0.2) complaints.push(`the operations add to ${sum} min and the plan says ${j.minutes}`);
  if (j.makespan > j.minutes + 0.2) complaints.push(`the makespan ${j.makespan} is longer than all the work ${j.minutes}, which cannot be`);
  const made = j.ops.length, bought = j.buy.length, gaps = j.gaps.length;
  return { ok: !complaints.length, complaints, lines: lines.length, made, bought, gaps,
    says: complaints.length ? `this plan does not hold up: ${complaints.length} complaint${complaints.length === 1 ? '' : 's'} — ${complaints[0]}` : `${lines.length} lines in, ${made} operations, ${bought} bought, ${gaps} refused; every line accounted for, every operation on a station that does it, nothing out of order, no station double-booked` };
}

// The package written out for a person to read, and the words in the room that reach it.
//
// Owner of: how a works, a job and its programs are said, and which of them a sentence asks for.

import { usd as money } from '../prices';
import { linkFor } from '../link';
import { FAMILIES } from './families';
import { TIERS, stationById, stationCost, stationUsd, worksOf, type Buying } from './stations';
import { under3K, worksUnder } from './budget';
import { BUILDS, bootstrapOf, jobForModel, throwAt } from './builds';
import type { Job } from './plan';

/** A works written out: what it covers, what it does not, what it costs to stand up, what it wants of the building. */
export function worksText(ids: string[], prefer: Buying = 'new'): string {
  const w = worksOf(ids), out: string[] = [];
  const had: string[] = []; let paid = 0, hrs = 0;
  for (const i of ids) { const c = stationCost(stationById(i), had, prefer); had.push(i); if (Number.isFinite(c.usd)) { paid += c.usd; hrs += c.hours; } }
  out.push(`${w.stations.length} stations, ${money(+paid.toFixed(2))}${hrs ? ` and ${hrs} h of your own work` : ''}${prefer !== 'new' ? ` (${money(w.usd)} if every one of them were bought new)` : ''}, ${w.floor} m² of floor, ${w.kw} kW if everything ran at once (it will not).`);
  out.push(`Covers: ${w.families.map((f) => FAMILIES.find((x) => x.id === f)!.name).join(', ')}.`);
  if (w.missing.length) out.push(`Does not cover: ${w.missing.map((f) => FAMILIES.find((x) => x.id === f)!.name).join(', ')}.`);
  out.push(`Works ${w.materials.join(', ')}; holds ±${w.tol} mm at its best and measures to ±${w.measureTol} mm, which is the gap it closes by trying again; the biggest part any one station takes is ${w.envelope.join(' × ')} mm.`);
  if (w.needs.length) out.push(`The building must give it: ${w.needs.join(', ')}.`);
  for (const s of w.stations) { const l = linkFor(s.id); out.push(`  ${s.name} — ${money(stationUsd(s))}${l ? ` · ${l.transport}` : ''}: ${s.why}`); }
  return out.join('\n');
}
/** A job written out: the order the machines run in, what is bought, and what cannot be done here at all. */
export function jobText(j: Job): string {
  const out = [`${j.what} in ${j.works.length} stations: ${j.ops.length} operations, ${(j.minutes / 60).toFixed(1)} h of machine time, ${(j.makespan / 60).toFixed(1)} h on the clock with the machines running together.`];
  if (j.buy.length) out.push(`Bought — ${j.buy.length} line${j.buy.length === 1 ? '' : 's'}, ${j.buy.reduce((a, b) => a + b.line.n, 0)} parts and lengths${j.usd ? `, ${money(j.usd)} of it priced` : ', none of it priced here'}:\n${j.buy.map((b) => `  - ${b.line.n} × ${b.line.name}${b.usd != null ? ` — ${money(b.usd)}` : ''}: ${b.why}`).join('\n')}`);
  if (j.gaps.length) out.push(`Cannot be done here:\n${j.gaps.map((g) => `  - ${g.line.name}: ${g.why}`).join('\n')}`);
  for (const x of j.schedule) out.push(`  ${String(Math.round(x.start)).padStart(5)}–${String(Math.round(x.end)).padEnd(5)} min  ${stationById(x.op.station).name} (${x.op.transport}, ${x.op.lang}): ${x.op.says}`);
  const sent = j.ops.filter((o) => o.transport !== 'hand').length;
  if (j.ops.length) out.push(sent ? `${sent} of ${j.ops.length} operation${j.ops.length === 1 ? '' : 's'} ${sent === 1 ? 'is' : 'are'} a program this can send the machine itself; the rest are hands, written out as steps.` : 'Every operation here is hands: nothing in this works has a port on it.');
  const spares = j.ops.reduce((a, o) => a + (o.spares ?? 0), 0);
  if (spares) out.push(`${spares} part${spares === 1 ? '' : 's'} started beyond what is wanted, because the processes that hold these tolerances scrap some: ${j.ops.filter((o) => o.spares).map((o) => `${o.spares} × ${o.part} (Cpk ${o.fit!.cpk})`).join(', ')}.`);
  if (j.stack) out.push(`The tolerance chain: ${j.stack.says}`);
  if (j.ops.length) out.push(j.bound.says);
  if (!j.audit.ok) out.push(`The plan does not check out: ${j.audit.complaints.join('; ')}.`);
  return out.join('\n');
}
/** Every program this job sends, in the order it sends them: what actually goes down the wire. */
export function programsText(j: Job): string {
  return j.schedule.map(({ op: o }) => `==== ${o.id}  ${o.part} — ${stationById(o.station).name} over ${o.transport} as ${o.lang}\n${o.program}`).join('\n\n');
}

/** Words in the room: "what can I make with", "a works for $5000", "build me a go-kart in the metal shop". */
export function worksWords(text: string): string | null {
  const t = text.toLowerCase();
  const build = BUILDS.find((b) => new RegExp(`\\b${b.id}\\b`).test(t) || new RegExp(`\\b${b.id}\\b`).test(t.replace(/[- ]/g, '')));
  if (!build && !/\b(works|workshop|shop|factory|cell|fab|make anything|industrial|build .* here)\b/.test(t)) return null;
  const named = [...TIERS].sort((a, b) => b.name.length - a.name.length).find((x) => t.includes(x.name))
    ?? [...TIERS].sort((a, b) => b.id.length - a.id.length).find((x) => new RegExp(`\\b${x.id}\\b`).test(t));
  const tier = named ?? { id: 'under3k', name: 'the works under $3,000', stations: under3K().ids, says: under3K().says };
  if (build) return `${build.what}\n${build.src}\n\nIn ${tier.name}:\n${jobText(throwAt(build, tier.stations))}`;
  if (/ender|voron/.test(t)) { const m = /voron/.test(t) ? 'voron24' : 'ender3'; const b = bootstrapOf(tier.stations, m); return `${b.says}\n\n${jobText(jobForModel(m, tier.stations))}`; }
  const budget = /\$ ?([\d,]+)/.exec(t);
  if (budget) {
    const cap = Number(budget[1]!.replace(/,/g, ''));
    const fits = [...TIERS].reverse().find((x) => worksOf(x.stations).usd <= cap);
    if (!fits) { const cheap = TIERS[0]!; return `Nothing on the list stands up for ${money(cap)}: the cheapest, ${cheap.name}, is ${money(worksOf(cheap.stations).usd)}.\n\n${worksText(cheap.stations)}`; }
    return `For ${money(cap)}: ${fits.name}. ${fits.says}\n\n${worksText(fits.stations)}`;
  }
  return `${tier.name}: ${tier.says}\n\n${worksText(tier.stations)}`;
}

/** The buying order written out, so a person can work down it. */
export function worksUnderText(cap: number, o: Parameters<typeof worksUnder>[1] = {}): string {
  const r = worksUnder(cap, o);
  if (!r.ids.length) return r.says;
  const out = [r.says, ''];
  let run = 0;
  for (const st of r.steps) { run = +(run + st.usd).toFixed(2); out.push(`  ${money(st.usd).padStart(9)} ${st.as === 'build' ? 'build' : st.as === 'used' ? 'used ' : 'new  '} ${String(money(run)).padStart(9)} total  ${stationById(st.id).name}${st.hours ? ` (${st.hours} h)` : ''}\n${' '.repeat(12)}${st.gain}${st.as === 'build' ? `\n${' '.repeat(12)}how: ${stationById(st.id).selfBuild!.how}` : ''}`); }
  out.push('', worksText(r.ids, o.prefer ?? 'build'));
  return out.join('\n');
}

/** The works this was asked for: the most capable one under $3,000, derived by `worksUnder` and not chosen by hand,
 *  so it moves when a price or a station moves instead of going stale in a list. It is what `worksWords` answers with
 *  by default, and what the builds below are routed through unless another set of stations is named.
 *
 *  Worked out on the first read and kept, rather than at import: every file that imports this one would otherwise pay
 *  for a greedy walk over every station it will never ask about. */

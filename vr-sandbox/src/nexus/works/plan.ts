// Routing a build into operations: the engine itself.
//
// Every line of a build becomes an operation on a named station, a purchase with the process that is missing as its
// reason, or a gap that names its cause and the cheapest station that would close it. Nothing in here is
// special-cased per build: the rules do all of it, and they are the rules at the top of `families.ts` and `can.ts`.
//
// The passes are in the order the real work happens: form every part, make the joints that happen while the
// material is still green, finish what is not finished when it is formed (batched, because a kiln fires a load),
// measure what has a tolerance, make the joints that need finished parts, then assemble. Get that order wrong and
// the plan fires a mug handle before it is joined to the mug.
//
// Owner of: an operation, a job, how long a run takes, what is not finished when it is formed, and the router.

import { usd as money } from '../parts/prices';
import { burrOf } from '../parts/finish';
import { cutAt, cutRefuses } from '../machines/link';
import { CUTTING, type Lang, type Transport } from '../machines/link';
import { stackOf, type Capable } from '../parts/fits';
import { PROCESSES, processById, type MatClass, type Process } from './families';
import { STATIONS, stationById, stationUsd } from './stations';
import { ALWAYS_BOUGHT, STOCK, classOf, priceOfLine, shapeOf, tolOf, type Join, type PartLine } from './lines';
import { canMake, type Verdict, type WorksState } from './can';
import { programFor } from './programs';
import { auditJob, type Audit } from './audit';
import { boundOf, scheduleOf, type Bound } from './schedule';

/** One operation on one station: what it is, where it runs, how long it takes, what it waits for, and — this is the
 *  point of the file — the program the machine is actually sent, and the wire it goes down. */
export interface Op {
  id: string; part: string; n: number; process: string; station: string;
  /** minutes */ setup: number; run: number;
  /** the ids this cannot start before */ after: string[];
  transport: Transport; lang: Lang; /** what the machine is sent, or the steps a person follows */ program: string;
  /** ± mm this operation has to hold, where it has to hold anything */ tol?: number;
  /** how well the station holds it, and how many it starts to keep `n` */ fit?: Capable;
  /** parts started beyond the ones wanted, because the process scraps some */ spares?: number;
  says: string;
}
/** What a build costs in machines, money and hours, and where it cannot be done at all. */
export interface Job {
  what: string; works: string[];
  ops: Op[]; /** parts and material bought, with why */ buy: { line: PartLine; why: string; usd: number | null }[];
  /** lines nothing here can make and nothing sells ready-made */ gaps: { line: PartLine; why: string }[];
  minutes: number; /** with the stations run in parallel */ makespan: number;
  usd: number; schedule: { op: Op; start: number; end: number }[];
  /** the engine's own check on this plan: it refuses to hand back a plan that lost something */ audit: Audit;
  /** how good the schedule is against what is possible, and what the critical path is */ bound: Bound;
  /** the tolerance chain through the parts that have one */ stack?: ReturnType<typeof stackOf>;
}

/** How long a run of n parts takes on a process: its rate where it has one, else the trade's own figure for that
 *  process; the setup once for the batch, because a batch is why a works has a queue at all. */
/** How much material a cut actually takes off, cm³: a profile out of sheet is its kerf, a shape out of a block is
 *  most of the block. 3 mm is a common cutter and a fair kerf for a laser's own allowance plus its lead-ins. */
function removed(_p: Process, line: { size?: [number, number, number] }, cm3: number): number {
  const mm = line.size;
  if (mm) {
    const [t, b, a] = [...mm].sort((x, y) => x - y);
    if (t <= 12 && a > 0) return Math.max(cm3 * 0.15, (2 * (a + b) * 3 * t) / 1000);
  }
  return cm3 * 1.8;
}
export function runMinutes(p: Process, line: { n: number; cm3?: number; size?: [number, number, number] }): number {
  if (p.cycle) return p.cycle; // a load is a load: ten hours in the kiln for one mug or for forty
  const cm3 = line.cm3 ?? (line.size ? (line.size[0] * line.size[1] * line.size[2]) / 1000 * 0.3 : 8);
  const each =
    p.id === 'saw' ? 1.5
    : p.id === 'weld-mig' || p.id === 'weld-tig' ? Math.max(1, (line.size ? (2 * (line.size[0] + line.size[1])) / 100 : 2))
    : p.id === 'spot-weld' ? 0.05
    : p.id === 'fasten' ? 1
    : p.id === 'solder' ? 0.6
    : p.id === 'bond' ? 2
    : p.id === 'calliper' || p.id === 'weigh' ? 0.5
    : p.id === 'indicate' || p.id === 'probe' ? 1
    // a cut takes material away, and how much depends on what it is cutting. A part cut out of sheet loses only its
    // kerf — perimeter × 3 mm × thickness — while a part cut out of a block loses most of the block. Charging a drone
    // frame as a block says nine hours for a job that takes half of one.
    : p.rate ? Math.max(0.5, (p.family === 'cut' ? removed(p, line, cm3) : cm3) / p.rate)
    : 2;
  return +(each * line.n).toFixed(1);
}

/** What is not finished when it is formed. A works without the finishing station has not made the thing: it has made
 *  greenware, a sticky print or a wax-and-powder brick, and saying otherwise is the one lie this file must not tell. */
export const FINISH: { when: (cls: MatClass, process: string) => boolean; process: string; times?: number; why: string }[] = [
  { when: (c) => c === 'clay', process: 'kiln', times: 2, why: 'clay is not a mug until it is fired: a bisque, then a glaze firing. Unfired, it dissolves in the water you put in it' },
  { when: (c) => c === 'photopolymer', process: 'cure', why: 'a resin print comes out wet with uncured resin: washed in alcohol and cured under UV, or it stays soft and keeps sensitising whoever holds it' },
  { when: (_c, p) => p === 'bound-metal', process: 'sinter', why: 'a bound-metal print is steel powder in a wax binder: debound, then sintered at about 1380 °C, where it shrinks 16 to 20 % into metal' },
];


/** Route a build: every line either becomes an operation on a station here, is bought (as a finished component or as
 *  material), or is named as a gap with its cause. Each operation is given its program and the wire it goes down, so
 *  a plan is a thing a works can run rather than a thing it can read. Then the operations are scheduled across the
 *  machines there are. Nothing in here is special-cased per build: the rules at the top of the file do all of it. */
export function planJob(what: string, lines: PartLine[], ids: string[], joins: Join[] = [], state?: WorksState): Job {
  const ops: Op[] = [], buy: Job['buy'] = [], gaps: Job['gaps'] = [];
  let k = 0;
  const op = (o: Omit<Op, 'transport' | 'lang' | 'program'>, line?: PartLine): Op => { const full = { ...o, ...programFor(o, line) }; ops.push(full); return full; };
  const stationFor = (process: string): string | null => ids.find((i) => stationById(i).does.includes(process)) ?? null;
  const sawTol = processById('saw').tol;

  // pass 1: every line routed. A line that is made records the op that forms it and the finishing it is owed, so the
  // joints that happen while the material is still green can be put in between.
  const formed: { line: PartLine; id: string; owed: typeof FINISH; start: number }[] = [];
  for (const line of lines) {
    const cls = classOf(line.mat);
    const no = ALWAYS_BOUGHT.find((r) => r.what.test(line.name) && !(r.unless?.test(line.name) ?? false))
      ?? (cls === 'board' ? { why: 'a wafer fab and a pick-and-place line' }
        : cls === 'live' ? { why: 'a living culture is grown, not made: it needs a source and a lab, not a machine' } : undefined);
    if (no) { const c = priceOfLine(line); buy.push({ line, why: no.why, usd: c ? c.usd : null }); continue; }
    // stock of a material no process here works (a bag of refractory castable, a ceramic blanket) is still bought, and
    // what happens to it afterwards is hands: laid dry, poured, cut with a knife. Saying "cannot be done here" of a
    // thing you buy for $20 and pour into place is the engine being wrong in the most discouraging direction.
    const bag = STOCK.find((r) => r.what.test(line.name) && !(r.unless?.test(line.name) ?? false));
    if (!cls && bag) { const c = priceOfLine(line); buy.push({ line, why: bag.why, usd: c ? c.usd : null }); continue; }
    if (!cls) { gaps.push({ line, why: `${line.mat} is not a material any process here works, and nothing in the price book sells it` }); continue; }

    const size = line.size ?? [60, 60, 30], shape = shapeOf(line);
    // the tolerance is derived from what the part is, not written down by feel (fits.ts)
    const want = tolOf(line), tol = want.tol;
    // stock: the material is bought, and cutting it to size is still this works' job — but only if this works can
    // hold what the part asks for. A saw holds ±1 mm, and promising better with nothing that does it is the lie.
    const st = STOCK.find((r) => r.what.test(line.name) && !(r.unless?.test(line.name) ?? false));
    if (st) {
      const fine = tol < sawTol;
      const v = fine ? canMake(ids, { material: cls, size, tol, feature: line.feature, shape, cm3: line.cm3, n: line.n, family: 'cut', state }) : { ok: false } as Verdict;
      if (fine && !v.ok) {
        gaps.push({ line, why: `the stock is bought by the sheet or the length, but ${want.why.replace(/^.*?: /, '')} — ±${tol} mm — and ${v.why}${v.buy ? `; the cheapest station that would is ${v.buy.station.name} at ${money(v.buy.usd)}` : ''}. A sawn face is ±${sawTol} mm, and there is nothing here to face it with` });
        continue;
      }
      const c = priceOfLine(line);
      buy.push({ line: { ...line, name: `${line.name} (as material)` }, why: st.why, usd: c ? c.usd : null });
      if (v.ok) {
        const id = `op${++k}`;
        const start = v.fit ? v.fit.make(line.n) : line.n, spares = start - line.n;
        const brr = burrOf(v.by!.process.id, line.mat, { thickMm: Math.min(...size), edges: 4 });
        op({ id, part: line.name, n: start, process: v.by!.process.id, station: v.by!.station.id, setup: v.by!.process.setup,
          run: +(runMinutes(v.by!.process, { ...line, n: start }) + brr.minutes).toFixed(1), after: [], tol, fit: v.fit, spares,
          says: `${start} × ${line.name} cut from bought stock by ${v.by!.process.name} on ${v.by!.station.name}, held to ±${tol} mm${spares ? ` (${line.n} wanted, ${spares} spare: ${v.fit!.says})` : ''}${brr.minutes ? `; then ${brr.by}` : ''}` }, line);
        formed.push({ line, id, owed: [], start });
      } else if (stationFor('saw')) {
        const id = `op${++k}`;
        op({ id, part: line.name, n: line.n, process: 'saw', station: stationFor('saw')!, setup: processById('saw').setup, run: runMinutes(processById('saw'), line), after: [],
          tol, says: `${line.n} × ${line.name} cut to size from bought stock; a sawn face is ±${sawTol} mm, and ${Number.isFinite(tol) ? `this wants ±${tol}` : want.why}` }, line);
        formed.push({ line, id, owed: [], start: line.n });
      } else gaps.push({ line, why: 'the stock is bought, but nothing here cuts it to length: a works without a saw cannot start' });
      continue;
    }

    // made here: the station and process that do it in the fewest minutes
    const v = canMake(ids, { material: cls, size, tol, feature: line.feature, shape, cm3: line.cm3, n: line.n, state });
    if (!v.ok) {
      const c = priceOfLine(line);
      if (c) buy.push({ line, why: `${v.why}, so it is bought instead`, usd: c.usd });
      else gaps.push({ line, why: `${v.why}${v.buy ? `; the cheapest station that would is ${v.buy.station.name} at ${money(v.buy.usd)}` : ''}, and nothing in the price book sells it ready-made. It wants ±${tol} mm because ${want.fit ? `it is ${want.fit}` : want.why}` });
      continue;
    }
    const p = v.by!.process, s = v.by!.station;
    // what is not finished when it is formed: if this works cannot finish it, it cannot make it, and says so
    const owed = FINISH.filter((f) => f.when(cls, p.id));
    const cannot = owed.find((f) => !stationFor(f.process));
    if (cannot) {
      const could = STATIONS.filter((x) => x.does.includes(cannot.process)).sort((a, b) => stationUsd(a) - stationUsd(b))[0];
      gaps.push({ line, why: `${s.name} would ${p.name.replace(/ing\b/, '')} it, but nothing here finishes it: ${cannot.why}${could ? `. The cheapest station that would is ${could.name} at ${money(stationUsd(could))}` : ''}` });
      continue;
    }
    const id = `op${++k}`, after: string[] = [];
    const start = v.fit ? v.fit.make(line.n) : line.n, spares = start - line.n;
    // a cut that cannot be cut: the cutter's own rules, before the machine finds out (link.ts `cutRefuses`). Each
    // rule belongs to one process and is only asked of that one — a lathe has no stickout, a mill no slenderness.
    if (p.family === 'cut') {
      const cut = cutAt({ material: (cls in CUTTING ? cls : 'thermoplastic') as keyof typeof CUTTING, spindle: s.kw * 1000 });
      const sorted = [...size].sort((a, b) => a - b);
      const no = cutRefuses({ cut,
        ...(p.id === 'mill' ? { depth: sorted[0], wall: line.wall } : {}),
        ...(p.id === 'drill' ? { holeD: line.feature, holeDepth: sorted[2] } : {}),
        ...(p.id === 'turn' ? { slender: { len: sorted[2]!, dia: line.feature ?? sorted[0]! } } : {}) });
      if (no.length) { gaps.push({ line, why: `${s.name} cannot cut it as drawn: ${no.join('; ')}` }); continue; }
    }
    // a touch probe finds the part instead of the operator finding it, which is most of a setup
    if (tol < 0.1 && s.does.includes('probe')) {
      const pid = `op${++k}`;
      op({ id: pid, part: `${line.name}: found on the machine`, n: 1, process: 'probe', station: s.id, setup: processById('probe').setup, run: 1, after: [], tol,
        says: `probe ${line.name}'s stock on ${s.name} before cutting: the machine finds the part, which takes ${Math.round(p.setup * 0.4)} min off the setup and takes the operator's eye out of the loop — the whole reason a probe pays for itself` }, line);
      after.push(pid);
    }
    if (p.family === 'cut' && stationFor('saw') && stationFor('saw') !== s.id) {
      const cutId = `op${++k}`;
      op({ id: cutId, part: `${line.name}: stock`, n: line.n, process: 'saw', station: stationFor('saw')!, setup: processById('saw').setup, run: runMinutes(processById('saw'), line), after: [],
        says: `cut ${line.n} × stock for ${line.name} to length; a sawn face is ±${sawTol} mm, so it is faced on the machine afterwards` }, line);
      after.push(cutId);
    }
    const brr = burrOf(p.id, line.mat, { thickMm: Math.min(...size), edges: 4 });
    const probed = after.some((a) => ops.find((o) => o.id === a)?.process === 'probe');
    op({ id, part: line.name, n: start, process: p.id, station: s.id, setup: probed ? +(p.setup * 0.6).toFixed(1) : p.setup,
      run: +(runMinutes(p, { ...line, n: start }) + brr.minutes).toFixed(1), after, tol: Number.isFinite(tol) ? tol : undefined, fit: v.fit, spares,
      says: `${start} × ${line.name} by ${p.name} on ${s.name}${Number.isFinite(tol) ? `, held to ±${tol} mm` : ''}${spares ? ` (${line.n} wanted, ${spares} spare: ${v.fit!.says})` : ''}${brr.minutes ? `; then ${brr.by} — ${brr.says}` : ''}` }, line);
    formed.push({ line, id, owed, start });
  }

  // pass 2: the joints made while the material is still green, before any firing or sintering
  const green = joins.filter((j) => j.when === 'before-finishing');
  const greenIds: string[] = [];
  for (const j of green) {
    const jp = PROCESSES.find((x) => x.id === j.how), where = jp ? stationFor(jp.id) : null;
    if (!jp || !where) { gaps.push({ line: { name: `${j.n} × ${j.how}`, n: j.n, mat: '' }, why: `${j.says} — and nothing here does it` }); continue; }
    const jid = `op${++k}`;
    op({ id: jid, part: `${what}: ${jp.name} (green)`, n: j.n, process: jp.id, station: where, setup: jp.setup,
      run: +(j.mm ? (j.mm / 100) * j.n : runMinutes(jp, { n: j.n })).toFixed(1), after: formed.map((f) => f.id),
      says: `${j.n} × ${jp.name} before anything is fired: ${j.says}` });
    greenIds.push(jid);
  }

  // pass 3: the finishing each made line is owed, batched — a kiln fires a load, and firing twice what fits in one
  // load costs twice as long for no reason
  const batches = new Map<string, { f: typeof FINISH[number]; t: number; station: string; lines: PartLine[]; after: string[] }>();
  for (const f of formed) for (const fi of f.owed) for (let t = 0; t < (fi.times ?? 1); t++) {
    const key = `${fi.process}#${t}`, at = batches.get(key);
    const pre = [...(greenIds.length ? greenIds : [f.id])];
    if (at) { at.lines.push(f.line); at.after = [...new Set([...at.after, ...pre])]; }
    else batches.set(key, { f: fi, t, station: stationFor(fi.process)!, lines: [f.line], after: pre });
  }
  const lastOf = new Map<string, string>();
  for (const [key, b] of [...batches].sort((a, b) => a[1].t - b[1].t)) {
    const fp = processById(b.f.process), name = b.f.process === 'kiln' ? (b.t === 0 ? 'bisque' : 'glaze') : fp.name;
    const n = b.lines.reduce((a, l) => a + (formed.find((f) => f.line === l)?.start ?? l.n), 0);
    const prev = [...lastOf.entries()].filter(([pk]) => pk.startsWith(`${b.f.process}#`)).map(([, v]) => v);
    const id = `op${++k}`;
    op({ id, part: `${b.lines.length === 1 ? b.lines[0]!.name : `${b.lines.length} kinds of part`}: ${name}`, n, process: b.f.process, station: b.station,
      setup: fp.setup, run: runMinutes(fp, { n }), after: [...new Set([...b.after, ...prev])],
      says: `${name === 'bisque' || name === 'glaze' ? `${name}-fire` : name} ${n} parts in one load (${b.lines.map((l) => `${l.n} × ${l.name}`).join(', ')}): ${b.f.why}` }, b.lines[0]);
    lastOf.set(key, id);
  }
  // pass 4: anything with a tolerance on it is measured, or the works never finds out it was wrong
  for (const f of formed) {
    const w = tolOf(f.line);
    if (w.tol >= sawTol || !ids.includes('measuring')) continue;
    const last = [...lastOf.values()].length && f.owed.length ? [...lastOf.values()] : [f.id];
    const fit = ops.find((o) => o.id === f.id)?.fit;
    op({ id: `op${++k}`, part: `${f.line.name}: measured`, n: f.start, process: w.tol < 0.02 ? 'indicate' : 'calliper', station: 'measuring', setup: 0,
      run: runMinutes(processById('calliper'), { ...f.line, n: f.start }), after: last, tol: w.tol,
      says: `check ${f.start} × ${f.line.name} against ±${w.tol} mm before anything is built on it — ${w.why}${fit && fit.cpk < 1.33 ? `. This is the operation that catches the ${(fit.ppm / 1e4).toFixed(1)} % that come out wrong` : ''}` }, f.line);
  }

  // pass 5: the joints the build declares for finished parts, in the order it declares them — welding a frame is not
  // assembly, and it is usually most of the work
  const made = ops.filter((o) => !/: stock$|: measured$/.test(o.part));
  const joinIds: string[] = [];
  for (const j of joins.filter((x) => x.when !== 'before-finishing')) {
    const jp = PROCESSES.find((x) => x.id === j.how);
    if (!jp) { gaps.push({ line: { name: j.how, n: j.n, mat: '' }, why: `${j.how} is not a process this engine knows` }); continue; }
    const where = stationFor(jp.id);
    if (!where) {
      const could = STATIONS.filter((x) => x.does.includes(jp.id)).sort((a, b) => stationUsd(a) - stationUsd(b))[0];
      gaps.push({ line: { name: `${j.n} × ${jp.name}`, n: j.n, mat: '' }, why: `${j.says} — and nothing here does it${could ? `; the cheapest station that would is ${could.name} at ${money(stationUsd(could))}` : ''}` });
      continue;
    }
    const jid = `op${++k}`;
    op({ id: jid, part: `${what}: ${jp.name}`, n: j.n, process: jp.id, station: where, setup: jp.setup,
      run: +(j.mm ? (j.mm / 100) * j.n : runMinutes(jp, { n: j.n })).toFixed(1), after: [...made.map((o) => o.id), ...joinIds],
      says: `${j.n} × ${jp.name}${j.mm ? `, ${j.mm} mm of bead each` : ''}: ${j.says}` });
    joinIds.push(jid);
  }

  // pass 6: assembling it is an operation too, and it is the one everybody forgets to count
  const madeN = made.reduce((a, o) => a + o.n, 0), boughtN = buy.reduce((a, b) => a + b.line.n, 0);
  if (madeN + boughtN > 0 && stationFor('fasten')) op({ id: `op${++k}`, part: `${what}: assembly`, n: 1, process: 'fasten', station: stationFor('fasten')!, setup: 10,
    run: +((madeN + boughtN) * 1.2).toFixed(1), after: ops.map((o) => o.id), says: `put ${madeN + boughtN} parts together: about a minute and a quarter a part, which is the number every plan leaves out` });

  const sch = scheduleOf(ops);
  const held = ops.filter((o) => o.tol != null && Number.isFinite(o.tol) && processById(o.process).family !== 'measure').map((o) => ({ of: o.part, tol: o.tol! }));
  const job: Job = { what, works: ids, ops, buy, gaps,
    minutes: +ops.reduce((a, o) => a + o.setup + o.run, 0).toFixed(1), makespan: sch.makespan,
    usd: +buy.reduce((a, b) => a + (b.usd ?? 0), 0).toFixed(2), schedule: sch.at,
    audit: { ok: true, complaints: [], lines: lines.length, made: ops.length, bought: buy.length, gaps: gaps.length, says: 'not checked' },
    bound: boundOf(ops), ...(held.length > 1 ? { stack: stackOf(held) } : {}) };
  job.audit = auditJob(job, lines, joins);
  return job;
}

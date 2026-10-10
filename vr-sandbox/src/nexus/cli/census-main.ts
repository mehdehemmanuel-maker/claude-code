// The census as a program, made to be reviewed while it runs and to never wait on one build:
//   - asks are handed out one at a time to whichever thread is free, so no thread sits idle behind another's slow share
//   - each ask has a budget; a build past it is stopped (its thread replaced) and kept as a finding: too slow, or a hang
//   - every result is written as a line the moment it comes, so the census can be read before it ends
//   - asks the reader turns into the same ask are built once on each thread
//   - with a previous census, what changed is printed first: what is newly built, newly broken, newly read
// Run: npm run nexus:census -- [out.jsonl] [limit] [--quick] [--compare prev.jsonl] [--budget seconds] [--report census.md]

import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { censusAsks, quickAsks, runAsk, summarize, type CensusAsk, type CensusResult } from '../substrate/census';
import { readAsk } from '../ask/words';

if (!isMainThread) {
  const memo = new Map<string, CensusResult>();
  parentPort!.on('message', (a: CensusAsk) => {
    const r = readAsk(a.words), key = 'problems' in r ? null : JSON.stringify(r.intent);
    const hit = key ? memo.get(key) : undefined;
    const out = hit ? { ...hit, words: a.words, family: a.family, ...(a.term ? { term: a.term } : {}), ms: 0, same: hit.words } : runAsk(a);
    if (key && !hit) memo.set(key, out);
    parentPort!.postMessage(out);
  });
} else {
  const args = process.argv.slice(2), flag = (f: string) => { const i = args.indexOf(f); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const report = flag('--report'), compare = flag('--compare'), budget = Number(flag('--budget') ?? 30) * 1000, quick = args.includes('--quick');
  const rest = args.filter((x) => x !== '--quick'), out = rest[0] ?? 'census.jsonl', limit = Number(rest[1] ?? Infinity);
  const asks = (quick ? quickAsks() : censusAsks()).slice(0, limit), n = Math.max(1, Math.min(availableParallelism(), asks.length));
  writeFileSync(out, '');
  const t0 = Date.now(), results: CensusResult[] = [];
  let next = 0;
  const keep = (r: CensusResult) => { results.push(r); appendFileSync(out, `${JSON.stringify(r)}\n`); if (results.length % 100 === 0) console.log(`  ${results.length}/${asks.length} in ${((Date.now() - t0) / 1000).toFixed(0)} s`); };
  await new Promise<void>((allDone) => {
    let live = 0;
    const start = () => {
      if (next >= asks.length) { if (live === 0) allDone(); return; }
      const w = new Worker(fileURLToPath(import.meta.url)); live++;
      let current: { ask: CensusAsk; at: number } | null = null;
      const feed = () => { if (next >= asks.length) { void w.terminate(); live--; clearInterval(watch); if (live === 0) allDone(); return; } current = { ask: asks[next++]!, at: Date.now() }; w.postMessage(current.ask); };
      const watch = setInterval(() => {
        if (!current || Date.now() - current.at < budget) return;
        // past its budget: kept as what it is, and its thread replaced
        keep({ words: current.ask.words, family: current.ask.family, ...(current.ask.term ? { term: current.ask.term } : {}), status: 'timeout', problems: [`no result in ${budget / 1000} s: a build that runs away or never ends`], ms: budget });
        clearInterval(watch); current = null; void w.terminate(); live--; start();
      }, 250);
      w.on('message', (r: CensusResult) => { current = null; keep(r); feed(); });
      w.on('error', (e) => { if (current) keep({ words: current.ask.words, family: current.ask.family, status: 'unbuilt', problems: [`it threw: ${e.message}`], ms: Date.now() - current.at }); clearInterval(watch); live--; start(); });
      feed();
    };
    for (let i = 0; i < n; i++) start();
  });
  const s = summarize(results);
  writeFileSync(out.replace(/\.jsonl$/, '') + '.summary.json', JSON.stringify({ at: new Date().toISOString(), wall: Date.now() - t0, ...s }, null, 0));
  console.log(`${asks.length} asks in ${((Date.now() - t0) / 1000).toFixed(1)} s on ${n} threads (${(s.ms / 1000).toFixed(1)} s of building)`);
  if (compare && existsSync(compare)) {
    const prev = new Map(readFileSync(compare, 'utf8').split('\n').filter(Boolean).map((l) => { const r = JSON.parse(l) as CensusResult; return [r.words, r] as const; }));
    const moved = results.filter((r) => prev.get(r.words) && prev.get(r.words)!.status !== r.status);
    const rank = { built: 3, flawed: 2, unbuilt: 1, timeout: 0, unread: 0 } as const;
    const up = moved.filter((r) => rank[r.status] > rank[prev.get(r.words)!.status]), down = moved.filter((r) => rank[r.status] < rank[prev.get(r.words)!.status]);
    console.log(`against ${compare}: ${up.length} better, ${down.length} worse, ${results.length - moved.length} the same`);
    for (const r of down.slice(0, 15)) console.log(`  worse: "${r.words}" ${prev.get(r.words)!.status} → ${r.status}${r.flaws?.[0] ? `: ${r.flaws[0].says.slice(0, 100)}` : ''}`);
    for (const r of up.slice(0, 15)) console.log(`  better: "${r.words}" ${prev.get(r.words)!.status} → ${r.status}`);
  }
  if (report) {
    const row = (xs: (string | number)[]) => `| ${xs.join(' | ')} |`;
    writeFileSync(report, [
      `# Nexus census`, '', `${new Date().toISOString().slice(0, 10)}: ${asks.length} asks in ${((Date.now() - t0) / 1000).toFixed(0)} s on ${n} threads. Written by \`npm run nexus:census -- out.jsonl --report ${report}\` (src/nexus/substrate/census.ts); every build counts as built only when its own checks hold.`, '',
      '## How each kind of ask fared', '', row(['kind', 'built', 'with flaws', 'read, not embodied', 'not read', 'past its budget']), row(['---', '---:', '---:', '---:', '---:', '---:']),
      ...Object.entries(s.byFamily).map(([f, c]) => row([f, c.built, c.flawed, c.unbuilt, c.unread, c.timeout])), '',
      '## What stops builds, by how many it stops', '', ...s.blockers.slice(0, 30).map((b) => `- **${b.count}** × ${b.kind}: ${b.what.replace(/\|/g, '/')} — e.g. *${b.examples[0]?.replace(/\|/g, '/')}*`), '',
      '## How far each domain of the manifold is reached', '', row(['domain', 'built from its ask', 'made as a part', 'gap', 'terms']), row(['---', '---:', '---:', '---:', '---:']),
      ...s.domains.map((d) => row([d.name, d.built, d.part, d.gap, d.terms])), '',
      '## The slowest', '', ...[...results].sort((a, b) => b.ms - a.ms).slice(0, 8).map((r) => `- ${(r.ms / 1000).toFixed(1)} s, ${r.status}: ${r.words}`), '',
    ].join('\n'));
  }
  for (const [f, c] of Object.entries(s.byFamily)) console.log(`  ${f}: ${Object.entries(c).filter(([, v]) => v).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const slow = [...results].sort((a, b) => b.ms - a.ms).slice(0, 5);
  console.log(`slowest: ${slow.map((r) => `${(r.ms / 1000).toFixed(1)} s ${r.status} "${r.words}"`).join(' | ')}`);
  console.log('blockers:'); for (const b of s.blockers.slice(0, 20)) console.log(`  ${b.count} × ${b.kind}: ${b.what.slice(0, 150)}\n      e.g. ${b.examples[0]?.slice(0, 150)}`);
  console.log('domains:'); for (const d of s.domains) console.log(`  ${d.name}: ${d.built} built, ${d.part} as parts, ${d.gap} gaps of ${d.terms}`);
}

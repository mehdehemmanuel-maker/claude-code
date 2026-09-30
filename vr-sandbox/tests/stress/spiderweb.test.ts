// Runs the whole Spiderweb (npm run stress): every case, the immune system's verdicts on them, and the changes since
// the last run; writes reports/spiderweb.{json,html}. SPIDERWEB_FILTER runs part of it (matched against group, node,
// scenario and material); SPIDERWEB_SEEDS sets how many chaos scenes to try.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import { runSpiderweb, type WebReport } from '../../src/diagnostics/spiderweb';
import { evaluateImmune } from '../../src/diagnostics/immune';
import { spiderwebHtml } from '../../src/diagnostics/webreport';

const key = (r: WebReport['runs'][number]) => `${r.group} | ${r.node} | ${r.scenario} | ${r.material}`;

it('spiderweb', async () => {
  const J = await initJolt();
  mkdirSync('reports', { recursive: true });
  const partial: WebReport['runs'] = [];
  const { cases, ...report } = runSpiderweb(J, process.env['SPIDERWEB_FILTER'] ?? '', (r, i, n) => {
    if (r.status !== 'pass') process.stdout.write(`[${i + 1}/${n}] ${r.status.toUpperCase()} ${r.group} ${r.node} · ${r.scenario} · ${r.material}: ${[...new Set(r.anomalies.map((a) => a.kind))].join(', ')}\n`);
    // a long run leaves what it has so far, so a run cut short still reports
    partial.push(r);
    if (partial.length % 20 === 0) writeFileSync('reports/spiderweb.partial.json', JSON.stringify({ done: partial.length, of: n, runs: partial }, null, 1));
  });
  const immune = evaluateImmune(cases, report.runs);
  report.immune = immune.map((x) => ({
    id: x.antibody.id, guards: x.antibody.guards, status: x.antibody.status, verdict: x.verdict, cases: x.cases,
    failed: x.failed.map((f) => `${key(f.run)}: ${f.kinds.join(', ')}`),
    found: `${x.antibody.found.date}: ${x.antibody.found.symptom}`, cause: x.antibody.cause, fix: x.antibody.fix,
  }));
  if (existsSync('reports/spiderweb.json')) {
    const prev = JSON.parse(readFileSync('reports/spiderweb.json', 'utf8')) as WebReport;
    const before = new Map(prev.runs.map((r) => [key(r), r.status]));
    report.changes = {
      newFail: report.runs.filter((r) => r.status === 'fail' && before.has(key(r)) && before.get(key(r)) !== 'fail').map(key),
      fixed: report.runs.filter((r) => r.status !== 'fail' && before.get(key(r)) === 'fail').map(key),
    };
  }
  writeFileSync('reports/spiderweb.json', JSON.stringify(report, null, 1));
  writeFileSync('reports/spiderweb.html', spiderwebHtml(report));
  const t = report.totals;
  process.stdout.write(`SPIDERWEB ${t.runs} runs: ${t.fail} fail, ${t.warn} warn, ${t.pass} pass in ${t.seconds.toFixed(0)} s\n`);
  for (const x of immune) process.stdout.write(`IMMUNE ${x.antibody.id} ${x.verdict.toUpperCase()} (${x.cases} cases, ${x.failed.length} failing) ${x.antibody.guards}\n`);
  if (report.changes) process.stdout.write(`CHANGES ${report.changes.newFail.length} new failures, ${report.changes.fixed.length} fixed\n`);
});

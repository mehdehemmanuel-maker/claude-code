// The gate (npm run immune): every guarding antibody must hold. A breached one names the cases that broke it.

import { expect, it } from 'vitest';
import initJolt from 'jolt-physics/wasm-compat';
import { runImmune } from '../../src/diagnostics/immune';

it('every guarding antibody holds', async () => {
  const J = await initJolt();
  const { results } = runImmune(J, process.env['IMMUNE_FILTER'] ?? '');
  for (const x of results) process.stdout.write(`IMMUNE ${x.antibody.id} ${x.verdict.toUpperCase()} (${x.cases} cases) ${x.antibody.guards}\n${x.failed.slice(0, 5).map((f) => `   ${f.run.node} · ${f.run.scenario} · ${f.run.material}: ${f.kinds.join(', ')}\n`).join('')}`);
  const breached = results.filter((x) => x.verdict === 'breached').map((x) => `${x.antibody.id} ${x.antibody.guards}: ${x.failed.map((f) => `${f.run.node} · ${f.run.scenario}`).slice(0, 5).join('; ')}`);
  expect(breached).toEqual([]);
});

// A rules check on one thing, or one part of it, from the command line: what the rules find and how long it took,
// capped at two minutes (npm run check). Skipped unless asked, so the gate does not run it.
//   CHECK=corolla npm run check                  a machine by its short name, whole
//   CHECK=engine.whole ONLY=injector npm run check   a block's thing, only what is named so (and what meets it)
//   CHECK=corolla WITHIN=/3/0 npm run check     only what is under that place in its tree
import { describe, it } from 'vitest';
import '../../src/nexus/seeds';
import { runBlock } from '../../src/nexus/dataflow';
import { rulesOf } from '../../src/nexus/make/rules';
import { MACHINES } from '../../src/nexus/machines';
import type { Part } from '../../src/nexus/kits';

const what = process.env.CHECK;
describe.skipIf(!what)('check', () => {
  it(String(what), async () => {
    const t0 = Date.now(), byName = MACHINES.find((m) => (m.short ?? m.id) === what);
    const out = byName ? await runBlock('vehicle.model', { model: what }) : await runBlock(what!, {});
    const thing = (byName ? out.vehicle : Object.values(out).find((v) => v && typeof v === 'object' && 'name' in (v as object))) as Part | undefined;
    if (!thing) throw new Error(`${what} made no thing`);
    const built = Date.now(), r = rulesOf(thing, { ...(process.env.ONLY ? { only: new RegExp(process.env.ONLY, 'i') } : {}), ...(process.env.WITHIN ? { within: process.env.WITHIN.split(',') } : {}) });
    const by = new Map<string, number>(); for (const f of r.findings) { const k = f.says.replace(/\d+(\.\d+)?/g, '#'); by.set(k, (by.get(k) ?? 0) + 1); }
    console.log(`${what}: built in ${((built - t0) / 1000).toFixed(1)} s; ${r.pieces} pieces checked in ${((Date.now() - built) / 1000).toFixed(1)} s; ${r.findings.length} findings`);
    for (const [k, n] of [...by].sort((a, b) => b[1] - a[1])) console.log(`  ${n} × ${k.slice(0, 200)}`);
  }, 120_000);
});

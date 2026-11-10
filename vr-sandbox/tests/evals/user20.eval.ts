// The user's own twenty requests (2026-11-10, in their words, docs/WANTED.md): each built by composeBuild with the real
// model, its board, steps and what the pipeline itself says is unmet kept in EVAL_DIR, to be photographed and judged by
// eye (no pattern scores these: the user judges the pictures). Run: `EVAL_DIR=<dir> npx vitest run --config
// vitest.eval.config.ts tests/evals/user20.eval.ts` (needs ANTHROPIC_API_KEY; costs real tokens); `EVAL_PICK=3,7` some.
import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../src/nexus/seeds';
import { composeBuild, sdkAsk } from '../../src/nexus/agent';
import { Engine } from '../../src/nexus/dataflow';
import { nodesOf } from '../../src/nexus/boards';

export const USER20 = ['One-Cubic-Meter Foam 3D Printer', 'Robotic Arm RC Car', 'Turret Go-Kart', 'Miniature RC Forklift', 'Transforming Furniture', 'RC Bulldozer', 'Kinetic Sculpture Machine', 'Giant Robotic Spider', 'Industrial Giant Claw', 'Personal Hovercraft',
  'RC Excavator Factory', 'Robotic Paint Booth', 'Mechanical Dinosaur', 'Automatic Sorting Machine', 'Wearable Third Arm', 'Follow-Me Cargo Robot', 'Rolling Robot Sphere', 'Portable Deployable Bridge', 'Modular RC Utility Vehicle', 'Pneumatic Walking Machine'];

it('the user\'s twenty requests, built', async () => {
  const dir = process.env.EVAL_DIR ?? '.'; mkdirSync(dir, { recursive: true });
  const pick = (process.env.EVAL_PICK ?? '').split(',').map(Number).filter(Boolean), model = process.env.EVAL_MODEL || undefined;
  const todo = USER20.map((r, k) => [r, k + 1] as const).filter(([, k]) => !pick.length || pick.includes(k));
  const one = async (req: string, k: number) => {
    const t0 = Date.now(), tokens = { in: 0, out: 0, cached: 0, written: 0 }; let row: Record<string, unknown>;
    try {
      const r = await composeBuild(req, { ask: sdkAsk({ ...(model ? { model } : {}), tokens, signal: AbortSignal.timeout(420_000) }) });
      const e = new Engine(r.board); await e.run();
      const bad = nodesOf(r.board).filter((n) => e.state.get(n.id)?.status !== 'ok').map((n) => `${n.id}: ${String(e.state.get(n.id)?.error ?? e.state.get(n.id)?.status).slice(0, 120)}`);
      writeFileSync(join(dir, `${k}.board.json`), JSON.stringify(r.board));
      row = { k, request: req, asks: r.asks, nodes: nodesOf(r.board).length, bad, unmet: r.unmet, works: (r as { works?: unknown }).works ?? null, parts: r.parts.map((p) => `${p.name} (${p.by ?? '?'})`), steps: r.steps, ...tokens, s: +((Date.now() - t0) / 1000).toFixed(0) };
    } catch (x) { row = { k, request: req, failed: (x as Error).message.slice(0, 300), ...tokens, s: +((Date.now() - t0) / 1000).toFixed(0) }; }
    writeFileSync(join(dir, `${k}.json`), JSON.stringify(row, null, 1));
    console.log(`DONE ${k}. ${req} | ${row.failed ? `FAILED ${row.failed}` : `asks ${row.asks}, nodes ${row.nodes}, bad ${(row.bad as string[]).length}, unmet ${(row.unmet as string[]).length}`} | ${row.s} s`);
  };
  for (let i = 0; i < todo.length; i += 4) await Promise.all(todo.slice(i, i + 4).map(([r, k]) => one(r, k)));
}, 7_200_000);

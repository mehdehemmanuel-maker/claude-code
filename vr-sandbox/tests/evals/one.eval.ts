// The one test (spec 00, task S14; plan/specs/00-structure/the-one-test.md): one ordinary request, typed as a person types
// it, that needs every part of Nexus. Each of its 18 pass lines is fixed beforehand in evals/one-test/expected.json; this
// runs the request through the AI in the app and scores the lines that can be scored today ("auto"); the rest say what
// must exist, or be worked out by hand from sources, before they can be. The count of lines passing is the plan's honest
// measure of progress. Run: `npm run eval:one` (needs ANTHROPIC_API_KEY; one request, real tokens).
import { it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import '../../src/nexus/seeds';
import { agentBuild, type AgentRun } from '../../src/nexus/agent';
import { Engine } from '../../src/nexus/dataflow';
import { nodesOf } from '../../src/nexus/boards';

interface Line { n: number; what: string; passWhen: string; proves: string; state: string }
const EXPECTED = JSON.parse(readFileSync(join(__dirname, '../../evals/one-test/expected.json'), 'utf8')) as { request: string; lines: Line[] };

/** The lines scored from what the AI built: passed, or failed with what was seen. */
const SCORE: Record<number, (r: AgentRun, e: Engine) => { pass: boolean; seen: string }> = {
  1: (r) => { const finds = r.steps.filter((s) => s.tool === 'find'), said = finds.map((s) => `${JSON.stringify(s.input)} ${s.result}`).join(' ').toLowerCase();
    const got = ['wall', 'shelf', 'lamp'].filter((w) => said.includes(w)); return { pass: got.length === 3, seen: finds.length ? `its finds reached: ${got.join(', ') || 'none of wall, shelf, lamp'} (${finds.length} finds)` : 'it made no find' }; },
  3: (r, e) => { const walls = nodesOf(r.board).filter((n) => /wall|room/.test(r.board.nodes[n.id]?.block ?? '')), ok = walls.filter((n) => e.state.get(n.id)?.status === 'ok');
    const mat = ok.some((n) => /"mat(erial)?"\s*:/.test(JSON.stringify(e.state.get(n.id)?.out ?? {}))); return { pass: ok.length > 0 && mat, seen: walls.length ? `${ok.length} wall or room node(s) ran; a material ${mat ? 'is' : 'is not'} named in what they made` : 'no wall or room on the board' }; },
  9: (r, e) => { const lamps = nodesOf(r.board).filter((n) => /lamp|light|bulb/.test(`${r.board.nodes[n.id]?.block} ${r.board.nodes[n.id]?.label ?? ''}`)), text = lamps.map((n) => JSON.stringify(e.state.get(n.id)?.out ?? {})).join(' ');
    const sourced = /lumen|\blm\b/i.test(text) && /source/i.test(text); return { pass: lamps.length > 0 && sourced, seen: lamps.length ? `${lamps.length} lamp or light node(s); bulb figures with a source ${sourced ? 'found' : 'not found'}` : 'no lamp on the board' }; },
  15: (r) => { const made = r.made.length, placed = made ? nodesOf(r.board).filter((n) => r.board.nodes[n.id]?.block === r.made[0]!.id).length : 0; return { pass: made > 0 && placed >= 3, seen: `${made} block(s) folded; the first placed ${placed} time(s)` }; },
  17: (r) => { const c = r.checked ?? ''; const flagged = /unsupported|not supported|no step supports|not traced|ungrounded/i.test(c); return { pass: !!c && !flagged, seen: c ? `the second model's reading: ${c.replace(/\s+/g, ' ').slice(0, 160)}` : 'not read by a second model' }; },
};

it('the one test: the lamp on the shelf', async () => {
  const t0 = Date.now(), r = await agentBuild(EXPECTED.request, { seconds: 240 }), e = new Engine(r.board); await e.run();
  let passed = 0, scored = 0;
  for (const l of EXPECTED.lines) {
    if (l.state === 'auto' && SCORE[l.n]) { const s = SCORE[l.n]!(r, e); scored++; if (s.pass) passed++; console.log(`${s.pass ? 'PASS' : 'FAIL'} ${l.n}. ${l.what} | ${s.seen}`); }
    else console.log(`NOT YET ${l.n}. ${l.what} | ${l.state}`);
  }
  console.log(`\nRESULT ${passed} of 18 lines pass (${scored} could be scored today); ${r.steps.length} steps; tokens in ${r.tokens.in} (+${r.tokens.cached} cached), out ${r.tokens.out}; ${((Date.now() - t0) / 1000).toFixed(0)} s; model ${r.model}; near misses ${r.nearMisses.length}`);
  console.log(`the answer: ${r.answer.replace(/\s+/g, ' ').slice(0, 600)}`);
  for (const m of r.nearMisses) console.log(`near miss, step ${m.step} (${m.tool}): ${m.kind}: ${m.what} | ${m.response}`);
}, 600_000);

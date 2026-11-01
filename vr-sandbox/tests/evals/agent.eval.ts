// The AI's evaluation set (spec 00, task S5): fixed requests, each with a check that needs no model. The board the agent
// built is run, and the request is right when a number it asked for stands on the board (any node, any output, within
// 1 %), or when what it asked to be made or folded was. Every expected number is worked out here from the same constants
// the app uses, never typed in from memory. Run: `npm run eval:agent` (needs ANTHROPIC_API_KEY; costs real tokens);
// `EVAL_ONLY=3` runs the first three; `EVAL_MODEL` picks the model (the app's default when unset).
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import '../../src/nexus/seeds';
import { agentBuild, type AgentRun } from '../../src/nexus/agent';
import { Engine } from '../../src/nexus/dataflow';
import { CONSTANTS } from '../../src/data/constants';

const g = CONSTANTS.g.value, R = CONSTANTS.R.value;
type Check = (run: AgentRun, e: Engine) => string | null; // null: right; else why not
/** Some node on the board gives this number (within rel), as any of its outputs, or any item of a list it gives. */
const gives = (want: number, rel = 0.01): Check => (_r, e) => {
  const seen: number[] = [];
  for (const s of e.state.values()) for (const v of Object.values(s.out ?? {})) for (const x of Array.isArray(v) ? v : [v]) if (typeof x === 'number' && Number.isFinite(x)) { seen.push(x); if (Math.abs(x - want) <= rel * Math.abs(want)) return null; }
  return `no node gives ${+want.toPrecision(6)}; nearest ${seen.length ? +seen.sort((a, b) => Math.abs(a - want) - Math.abs(b - want))[0]!.toPrecision(6) : 'none'}`;
};
const runsClean: Check = (_r, e) => { const bad = [...e.state].filter(([, s]) => s.status !== 'ok'); return e.state.size === 0 ? 'the board is empty' : bad.length ? `${bad.length} nodes not ok: ${bad[0]![1].error?.slice(0, 80)}` : null; };
const both = (...cs: Check[]): Check => (r, e) => cs.map((c) => c(r, e)).find((x) => x) ?? null;

export const CASES: [string, Check][] = [
  ['What does a 2 kg mass weigh on Earth, in newtons?', gives(2 * g)],
  ['Kinetic energy of a 1000 kg car at 20 m/s?', gives(0.5 * 1000 * 20 ** 2)],
  ['12 V across 4 ohms: what current flows?', gives(12 / 4)],
  ['Power turned to heat by 2 A through 10 ohms?', gives(2 ** 2 * 10)],
  ['Stress in a 10 mm diameter round rod pulled with 5 kN?', gives(5000 / (Math.PI * 0.005 ** 2))],
  ['Make the checked coil spring with 6 active coils and tell me its rate.', gives(9423.828125)],
  ['Heat needed to warm 2 kg of water by 10 K, its specific heat 4186 J/kg K?', gives(2 * 4186 * 10)],
  ['How much does a 1 m steel bar grow warmed by 50 K, expansion coefficient 12e-6 per K?', gives(1 * 12e-6 * 50)],
  ['Pressure of 1 mol of ideal gas at 300 K in 0.0249 cubic metres?', gives(1 * R * 300 / 0.0249)],
  ['Period of a simple pendulum 1 m long on Earth?', gives(2 * Math.PI * Math.sqrt(1 / g))],
  ['Potential energy of 5 kg raised 3 m on Earth?', gives(5 * g * 3)],
  ['Momentum of a 0.145 kg ball at 40 m/s?', gives(0.145 * 40)],
  ['Drag on a body of area 2 square metres, drag coefficient 0.3, at 30 m/s in air of density 1.225 kg/m3?', gives(0.5 * 1.225 * 30 ** 2 * 0.3 * 2)],
  ['Torque from 50 N pushing at the end of a 0.3 m lever, square to it?', gives(50 * 0.3)],
  ['A beam on two supports 2 m apart carries 1 kN at its middle: the largest bending moment?', gives(1000 * 2 / 4)],
  ['Energy stored in a 100 microfarad capacitor at 50 V?', gives(0.5 * 100e-6 * 50 ** 2)],
  ['Two resistors of 100 and 220 ohms in series: total resistance?', gives(100 + 220)],
  ['Area of a circle 50 mm across, in square metres?', gives(Math.PI * 0.025 ** 2)],
  ['Mass of 0.002 cubic metres of steel at 7850 kg per cubic metre?', gives(0.002 * 7850)],
  ['A shaft turns at 60 rpm: its frequency in hertz?', gives(1)],
  ['Heat flow through a wall 0.2 m thick, conductivity 0.8 W/m K, area 10 square metres, 20 K warmer inside?', gives(0.8 * 10 * 20 / 0.2)],
  ['Speed of sound in air at 293.15 K, taking its ratio of heats as 1.4 and molar mass 0.028965 kg/mol?', gives(Math.sqrt(1.4 * R * 293.15 / 0.028965))],
  ['The best efficiency of a heat engine between 300 K and 600 K?', gives(1 - 300 / 600)],
  ['Build a board that adds 2 and 3.', gives(5)],
  ['How far does something fall from rest in 2 s on Earth, no air?', gives(0.5 * g * 2 ** 2)],
  ['Centripetal acceleration of a car on a 50 m radius curve at 15 m/s?', gives(15 ** 2 / 50)],
  ['Open the starter board about a steel ball let go.', runsClean],
  ['Open the starter board of a battery built from its parts.', runsClean],
  ['Make an M8 socket head cap screw 30 mm long.', both(runsClean, (r) => (r.board && Object.keys(r.board.nodes).length ? null : 'no node placed'))],
  ['Build the checked coil spring and fold the board into one block called My spring.', both(runsClean, (r) => (r.made.length ? null : 'no block made'))],
];

it('the AI, on its evaluation set', async () => {
  const only = Number(process.env.EVAL_ONLY ?? CASES.length), model = process.env.EVAL_MODEL || undefined, rows: Record<string, unknown>[] = [];
  const one = async ([req, check]: [string, Check], k: number) => {
    const t0 = Date.now(); let row: Record<string, unknown>;
    try {
      const r = await agentBuild(req, { ...(model ? { model } : {}), seconds: 120, check: false });
      const e = new Engine(r.board); await e.run(); const why = check(r, e);
      row = { k: k + 1, request: req, right: !why, why: why ?? '', steps: r.steps.length, in: r.tokens.in, cached: r.tokens.cached, out: r.tokens.out, s: +((Date.now() - t0) / 1000).toFixed(1), model: r.model, stopped: r.stopped ?? '' };
    } catch (x) { row = { k: k + 1, request: req, right: false, why: `failed: ${(x as Error).message.slice(0, 120)}`, steps: 0, in: 0, cached: 0, out: 0, s: +((Date.now() - t0) / 1000).toFixed(1) }; }
    rows.push(row); console.log(`${row.right ? 'RIGHT' : 'WRONG'} ${row.k}. ${req.slice(0, 60)} | steps ${row.steps}, in ${row.in} (+${row.cached} cached), out ${row.out}, ${row.s} s ${row.why ? `| ${row.why}` : ''}`);
  };
  const todo = CASES.slice(0, only).map((c, k) => [c, k] as const);
  for (let i = 0; i < todo.length; i += 5) await Promise.all(todo.slice(i, i + 5).map(([c, k]) => one(c, k)));
  rows.sort((a, b) => (a.k as number) - (b.k as number));
  const right = rows.filter((r) => r.right).length, sum = (f: string) => rows.reduce((a, r) => a + (r[f] as number), 0);
  console.log(`\nRESULT ${right} of ${rows.length} right; steps ${sum('steps')}; tokens in ${sum('in')} (+${sum('cached')} cached), out ${sum('out')}; ${sum('s').toFixed(0)} s summed`);
  if (process.env.EVAL_OUT) writeFileSync(process.env.EVAL_OUT, JSON.stringify(rows, null, 1));
}, 1_800_000);

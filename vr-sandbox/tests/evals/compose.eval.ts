// The AI on things made of several things (decision 0027): twenty-five compound requests (the user, 2026-11-06: "I asked
// for a drone with a robot arm attached ... I'm gonna send random requests every time"), each built by composeBuild (a
// split call, a call a part that no library assembly or starter board gives, a join call, each asked again once with only
// what failed) and scored with no model by score (score.ts): its board runs with every node ok, uses a block or a piece of
// each kind the request names (read inside folded parts too, down to the bottom), and gives one thing of at least so many
// pieces; and the pipeline's own check said nothing unmet. Each kind is a pattern on block ids and piece names; each
// least count of pieces is an estimate of what a recognisable build of it holds, not a figure from a source.
// Run: `npm run eval:compose` (needs ANTHROPIC_API_KEY; costs real tokens); `EVAL_ONLY=5` the first five; `EVAL_PICK=7`
// the seventh alone; `EVAL_MODEL` the model; `EVAL_OUT=file.json` keeps every run's steps, plans and result.
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import '../../src/nexus/seeds';
import { composeBuild, sdkAsk } from '../../src/nexus/agent';
import { Engine } from '../../src/nexus/dataflow';
import { nodesOf } from '../../src/nexus/boards';
import { W, score, type Want } from './score';

const K = (s: string) => new RegExp(s, 'i');
const DRONE = K('^seed\\.quadcopter$|prop'), ARM = K('^seed\\.robot-arm$|gripper|finger|forearm|upper arm|link|^piece\\.servo$'), WHEEL = K('^piece\\.(wheel|castor)$|wheel|tyre|tire');
const CAMERA = K('camera|lens'), PANTILT = K('^piece\\.servo$|servo|pan|tilt'), BELT = K('^piece\\.(belt|pulley)$|belt|roller|pulley'), LAMP = K('^piece\\.(led|lamp)$|led|lamp|bulb|shade');
const JOINT = K('^piece\\.(hinge|pianohinge)$|hinge|pivot|joint|^mate\\.bolted$'), CRANE = K('boom|jib|mast|hook|winch|crane'), EXTRUSION = K('^piece\\.extrusion$|extrusion');
const AXIS = K('^piece\\.(mgn|rail|leadscrew|belt|shaft)$|rail|lead ?screw|carriage|belt'), TANK = K('^piece\\.tank$|tank'), PIPE = K('^piece\\.(pipe|run|pvcpipe|hose|elbow)$|pipe|hose');
const PUMP = K('pump|impeller|motor'), HULL = K('hull|deck|boat'), PROP = K('prop|blade'), BLADE = K('blade|^room\\.ring$'), TOWER = K('tower|mast|post|pole|^piece\\.(hollowsection|pipe)$');
const LEG = K('leg|tripod'), RAIL = K('^piece\\.(mgn|rail|extrusion)$|rail|carriage'), TABLE = K('table|leg|^piece\\.(lumber|sheet)$'), PANEL = K('solar|panel|^piece\\.sheet$');
const SPINDLE = K('spindle|drill|chuck|motor'), DRUM = K('drum|winch|spool|reel'), SHELF = K('^piece\\.(anglebracket|bracket|sheet|lumber)$|shelf|bracket'), FAN = K('^piece\\.fan$|fan|blade');
const BASKET = K('basket|crate|^piece\\.case$|box'), CART = K('cart|trailer|bed|castor'), BODY = K('body|chassis|torso|^piece\\.(case|plate)$'), MOTOR = K('^seed\\.motor-dc$|^piece\\.(dcmotor|gearmotor|stepper)$|motor');

export const COMPOSE: [string, Want][] = [
  ['A drone with a robot arm attached', W(40, DRONE, ARM)],
  ['A robot car with a camera on a pan-tilt head', W(12, WHEEL, CAMERA, PANTILT)],
  ['A conveyor belt with a robot arm picking from it', W(15, BELT, ARM)],
  ['A desk lamp with an arm that bends', W(6, LAMP, JOINT)],
  ['A crane on a truck', W(15, WHEEL, CRANE)],
  ['A 3D printer frame with its X and Y axes', W(12, EXTRUSION, AXIS)],
  ['A quadcopter carrying a camera under it', W(40, DRONE, CAMERA)],
  ['A small robot base with a robot arm on top', W(20, WHEEL, ARM)],
  ['A water tank on a two-wheeled trailer', W(8, TANK, WHEEL)],
  ['A pump bolted next to a tank with a pipe between them', W(6, TANK, PUMP, PIPE)],
  ['A small boat with a motor and a propeller at its stern', W(6, HULL, MOTOR, PROP)],
  ['A wind turbine: three blades on a hub at the top of a tower', W(8, BLADE, TOWER)],
  ['A camera on a three-legged tripod', W(5, CAMERA, LEG)],
  ['A robot arm riding on a linear rail', W(10, ARM, RAIL)],
  ['A table with a desk lamp standing on it', W(6, TABLE, LAMP)],
  ['A rover with a solar panel and a camera on a mast', W(12, WHEEL, PANEL, CAMERA)],
  ['A gantry with a drill spindle on its carriage', W(10, RAIL, SPINDLE)],
  ['A winch on the bed of a truck', W(10, WHEEL, DRUM)],
  ['A pan-tilt head with a lamp on top', W(4, PANTILT, LAMP)],
  ['A wall shelf with a desk fan standing on it', W(5, SHELF, FAN)],
  ['A walking robot: a body on four legs', W(8, BODY, LEG)],
  ['A bicycle with a basket on the front', W(8, WHEEL, BASKET)],
  ['A cart towed behind a robot car', W(12, WHEEL, CART)],
  ['A drone with a camera and a gripper under it', W(40, DRONE, CAMERA, ARM)],
  ['A conveyor belt driven by a DC motor, a box riding on it', W(10, BELT, MOTOR, BASKET)],
];

it('the AI, on things made of several things', async () => {
  const only = Number(process.env.EVAL_ONLY ?? COMPOSE.length), pick = Number(process.env.EVAL_PICK ?? 0), model = process.env.EVAL_MODEL || undefined, rows: Record<string, unknown>[] = [];
  const one = async ([req, want]: [string, Want], k: number) => {
    const t0 = Date.now(), tokens = { in: 0, out: 0, cached: 0, written: 0 };
    let row: Record<string, unknown>;
    try {
      const r = await composeBuild(req, { ask: sdkAsk({ ...(model ? { model } : {}), tokens, signal: AbortSignal.timeout(300_000) }) });
      const e = new Engine(r.board); await e.run();
      const why = score(r.board, e, want) ?? (r.unmet.length ? `not met: ${r.unmet[0]!.slice(0, 160)}` : null);
      row = { k: k + 1, request: req, right: !why, why: why ?? '', asks: r.asks, nodes: nodesOf(r.board).length, parts: r.parts.map((p) => `${p.name}:${p.by ?? '?'}`).join(' '), ...tokens, s: +((Date.now() - t0) / 1000).toFixed(1), steps: r.steps, plans: r.plans };
    } catch (x) { row = { k: k + 1, request: req, right: false, why: `failed: ${(x as Error).message.slice(0, 140)}`, asks: 0, nodes: 0, ...tokens, s: +((Date.now() - t0) / 1000).toFixed(1) }; }
    rows.push(row); console.log(`${row.right ? 'RIGHT' : 'WRONG'} ${row.k}. ${req.slice(0, 64)} | ${row.parts ?? ''} | asks ${row.asks}, nodes ${row.nodes}, in ${row.in} (+${row.cached} cached, ${row.written} written), out ${row.out}, ${row.s} s${row.why ? ` | ${row.why}` : ''}`);
  };
  const todo = COMPOSE.slice(0, only).map((c, k) => [c, k] as const).filter(([, k]) => !pick || k + 1 === pick);
  for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(([c, k]) => one(c, k)));
  rows.sort((a, b) => (a.k as number) - (b.k as number));
  const right = rows.filter((r) => r.right).length, sum = (f: string) => rows.reduce((a, r) => a + ((r[f] as number) || 0), 0);
  console.log(`\nRESULT ${right} of ${rows.length} right (composed from parts); asks ${sum('asks')}; tokens in ${sum('in')} (+${sum('cached')} cached, ${sum('written')} written), out ${sum('out')}; ${sum('s').toFixed(0)} s summed`);
  if (process.env.EVAL_OUT) writeFileSync(process.env.EVAL_OUT, JSON.stringify(rows, null, 1));
}, 3_600_000);

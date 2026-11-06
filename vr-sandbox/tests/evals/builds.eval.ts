// The AI on things to build (decision 0026, step 4: the bootstrap): forty requests across the library, each scored with
// no model. A request is right when its board runs with every node ok, uses a block of each kind it names (its id, on the
// board or inside a folded block on it, or a piece of its build by that name), and gives one
// thing (its pieces joined by the faces the operations wrote, one group) of at least so many pieces. Assist (one call, a
// plan; asked once more with only the lines that failed) by default; `EVAL_MODE=auto` runs the tool loop instead.
// Run: `npm run eval:builds` (needs ANTHROPIC_API_KEY; costs real tokens); `EVAL_ONLY=5` the first five; `EVAL_PICK=7`
// the seventh alone; `EVAL_MODEL` the model; `EVAL_OUT=file.json` keeps every plan and its result (what repeats across
// the plans is what the library should hold as one block).
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import '../../src/nexus/seeds';
import { agentBuild, agentPlan, runPlan, type AgentPlan } from '../../src/nexus/agent';
import { Engine, emptyBoard } from '../../src/nexus/dataflow';
import { nodesOf, type Board } from '../../src/nexus/boards';
import { W, score, type Want } from './score';
export { score };

const FASTENER = /^piece\.(bolt|csk|buttonhead|panhead|woodscrew|shoulderscrew|carriagebolt|threadedrod|setscrew|deckscrew|nail)$|^mate\.(bolted|plate|lid)$/;
export const BUILDS: [string, Want][] = [
  ['A desk lamp: an LED on top of a post standing on a round base.', W(3, /^piece\.led$/)],
  ['Two steel plates 100 x 100 x 5 mm bolted together with four M6 bolts.', W(6, /^piece\.plate$/, FASTENER)],
  ['A hollow box with its lid bolted on.', W(3, /^piece\.case$/, /^mate\.(lid|bolted)$|^piece\.(bolt|csk)$/)],
  ['A NEMA 17 stepper on a motor plate, the plate bolted to a 2020 extrusion.', W(4, /^piece\.stepper$/, /^piece\.extrusion$/)],
  ['An Arduino Uno on four standoffs on an acrylic plate.', W(6, /^piece\.devboard$/, /^piece\.(standoff|hexstandoff)$/)],
  ['A Raspberry Pi 4 bolted to a plate with a 40 mm fan above it.', W(4, /^piece\.devboard$/, /^piece\.fan$/)],
  ['A square frame of four 2020 extrusions joined by corner brackets.', W(8, /^piece\.extrusion$/, /^piece\.cornerbracket$/)],
  ['An 8 mm shaft in two pillow blocks with a pulley between them.', W(4, /^piece\.shaft$/, /^piece\.pillowblock$/, /^piece\.pulley$/)],
  ['A 608 bearing on an 8 mm shaft, the bearing in a housing plate.', W(3, /^piece\.bearing$/, /^piece\.(shaft|plate)$/)],
  ['A wheel on the shaft of a DC gear motor.', W(2, /^piece\.wheel$/, /^piece\.(gearmotor|dcmotor)$/)],
  ['A copper pipe run from a tank to a ball valve.', W(3, /^piece\.ballvalve$/, /^piece\.(tank|case)$/)],
  ['A steel post on a base plate bolted to a concrete block.', W(6, /^piece\.(hollowsection|steelbeam|bar)$/, /^piece\.brick$/)],
  ['A brick wall three courses high.', W(6, /^piece\.(wall|brick)$/)],
  ['A timber frame: two 2x4 studs nailed to a bottom plate.', W(5, /^piece\.lumber$/, /^piece\.(nail|woodscrew|deckscrew)$/)],
  ['A drawer front with a pull handle screwed on.', W(3, /^piece\.handle$/)],
  ['Two plywood panels joined by a hinge.', W(3, /^piece\.(hinge|pianohinge)$/, /^piece\.sheet$|^piece\.plate$/)],
  ['A hobby servo bolted to an L bracket.', W(3, /^piece\.servo$/, /^piece\.bracket$/)],
  ['A breadboard with an LED, a resistor and a push button in it.', W(4, /^piece\.breadboard$/, /^piece\.led$/, /^piece\.resistor$/)],
  ['A PVC pipe with an elbow on one end and a tee on the other.', W(3, /^piece\.pvcpipe$/, /^piece\.pvcfitting$/)],
  ['A flanged pipe joint: two flanges, a gasket and four bolts with nuts.', W(8, /^piece\.(flange|asmeflange)$/, /^piece\.flangegasket$/)],
  ['Two 8 mm shafts joined end to end by a shaft coupler.', W(3, /^piece\.shaft$/, /^piece\.coupler$/)],
  ['A T8 lead screw with its brass nut, coupled to a NEMA 17 stepper.', W(4, /^piece\.leadscrew$/, /^piece\.leadnut$/, /^piece\.coupler$/)],
  ['An MGN12 linear rail with its carriage and a plate bolted on the carriage.', W(3, /^piece\.mgn$/, /^piece\.plate$/)],
  ['A castor bolted under a plywood board.', W(3, /^piece\.castor$/)],
  ['An 80 mm fan screwed to a panel with four screws.', W(6, /^piece\.fan$/, FASTENER)],
  ['A battery pack: four 18650 cells side by side in a box.', W(5, /^piece\.cell$/, /^piece\.case$/)],
  ['A switch box: a toggle switch and a fuse holder in a hollow box with its lid.', W(4, /^piece\.case$/, /^piece\.(switch|toggle|fuse)$/)],
  ['A small robot base: two motors driving wheels, a battery and a castor on a plate.', W(8, /^piece\.wheel$|wheel/i, /^piece\.castor$|castor|caster/i)],
  ['A quadcopter: four motors on the arms of a cross frame.', W(8, /^room\.ring$|^piece\.(dcmotor|gearmotor|stepper)$|motor/i)],
  ['A desk fan: a motor with blades round its hub on a post and a base.', W(6, /^room\.ring$|blade/i)],
  ['A wall shelf: a board on two angle brackets screwed into wall plugs.', W(5, /^piece\.(anglebracket|bracket)$/, /^piece\.wallplug$/)],
  ['A gear on a shaft held by a shaft collar.', W(3, /^piece\.gear$/, /^piece\.collar$/)],
  ['A gas strut between two brackets.', W(3, /^piece\.gasstrut$/)],
  ['A heat-set insert in a plate with a screw in it.', W(3, /^piece\.heatset$/)],
  ['A T-nut in a 2020 extrusion with a bracket bolted on.', W(3, /^piece\.tnut$/, /^piece\.extrusion$/)],
  ['A 0.96 inch OLED display bolted to a front panel.', W(3, /^piece\.display$/)],
  ['A threaded rod through two plates, a nut and washer each side of each plate.', W(8, /^piece\.threadedrod$/, /^piece\.(nut|nyloc)$/, /^piece\.washer$/)],
  ['A disc magnet set in a pocket of a plate.', W(2, /^piece\.magnet$/)],
  ['A steel I-beam bolted to two steel angles.', W(5, /^piece\.steelbeam$/, /^piece\.steelangle$/)],
  ['A water tank with an outlet pipe through its side wall and a valve on the pipe.', W(3, /^piece\.(tank|case)$/, /^piece\.(ballvalve|checkvalve|needlevalve)$/)],
];

it('the AI, on things to build', async () => {
  const auto = process.env.EVAL_MODE === 'auto', only = Number(process.env.EVAL_ONLY ?? BUILDS.length), pick = Number(process.env.EVAL_PICK ?? 0), model = process.env.EVAL_MODEL || undefined, rows: Record<string, unknown>[] = [];
  const one = async ([req, want]: [string, Want], k: number) => {
    const t0 = Date.now(), tok = { in: 0, out: 0, cached: 0, written: 0 }, add = (t: typeof tok) => { tok.in += t.in; tok.out += t.out; tok.cached += t.cached; tok.written += t.written; };
    let row: Record<string, unknown>;
    try {
      let board: Board = emptyBoard(req), why: string | null = 'not built', plans: AgentPlan[] = [], asks = 0;
      if (auto) { const r = await agentBuild(req, { ...(model ? { model } : {}), seconds: 150, check: false }); add(r.tokens); asks = r.steps.length; board = r.board; const e = new Engine(board); await e.run(); why = score(board, e, want); }
      else {
        let failing: string[] = [];
        for (let round = 0; round < 2 && why; round++) {
          const p = await agentPlan(req, { ...(model ? { model } : {}), ...(round ? { board, failing } : {}) }); add(p.tokens); asks++;
          if (!p.plan) { why = `no plan read: ${p.error?.slice(0, 100)}`; continue; }
          plans.push(p.plan); const ran = await runPlan(p.plan, round ? board : emptyBoard(req)); board = ran.board; failing = ran.failing;
          const e = new Engine(board); await e.run(); why = failing.length ? `failing: ${failing.slice(0, 2).join(' | ').slice(0, 160)}` : score(board, e, want);
        }
      }
      row = { k: k + 1, request: req, right: !why, why: why ?? '', asks, nodes: nodesOf(board).length, ...tok, s: +((Date.now() - t0) / 1000).toFixed(1), plans };
    } catch (x) { row = { k: k + 1, request: req, right: false, why: `failed: ${(x as Error).message.slice(0, 140)}`, asks: 0, nodes: 0, ...tok, s: +((Date.now() - t0) / 1000).toFixed(1) }; }
    rows.push(row); console.log(`${row.right ? 'RIGHT' : 'WRONG'} ${row.k}. ${req.slice(0, 64)} | asks ${row.asks}, nodes ${row.nodes}, in ${row.in} (+${row.cached} cached, ${row.written} written), out ${row.out}, ${row.s} s${row.why ? ` | ${row.why}` : ''}`);
  };
  const todo = BUILDS.slice(0, only).map((c, k) => [c, k] as const).filter(([, k]) => !pick || k + 1 === pick);
  for (let i = 0; i < todo.length; i += 5) await Promise.all(todo.slice(i, i + 5).map(([c, k]) => one(c, k)));
  rows.sort((a, b) => (a.k as number) - (b.k as number));
  const right = rows.filter((r) => r.right).length, sum = (f: string) => rows.reduce((a, r) => a + ((r[f] as number) || 0), 0);
  console.log(`\nRESULT ${right} of ${rows.length} right (${auto ? 'Auto' : 'Assist'}); asks ${sum('asks')}; tokens in ${sum('in')} (+${sum('cached')} cached, ${sum('written')} written), out ${sum('out')}; ${right ? `${Math.round((sum('in') + sum('written') + sum('out')) / right)} tokens in and out (cache reads apart) per right build` : 'none right'}; ${sum('s').toFixed(0)} s summed`);
  if (process.env.EVAL_OUT) writeFileSync(process.env.EVAL_OUT, JSON.stringify(rows, null, 1));
}, 3_600_000);

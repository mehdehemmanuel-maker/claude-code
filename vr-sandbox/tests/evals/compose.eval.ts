// The AI on things made of several things (decision 0027): twenty-five compound requests (the user, 2026-11-06: "I asked
// for a drone with a robot arm attached ... I'm gonna send random requests every time"), each built by composeBuild (a
// split call, a call a part that no library assembly or starter board gives, a join call, each asked again once with only
// what failed) and scored with no model by score (score.ts): its board runs with every node ok, uses a block or a piece of
// each kind the request names (read inside folded parts too, down to the bottom), and gives one thing of at least so many
// pieces; and the pipeline's own check said nothing unmet. Each kind is a pattern on block ids and piece names and, where a
// family makes it, any family on its aisle whose name says it (decision 0028: a new family of the kind counts); each least
// count of pieces is an estimate of what a recognisable build of it holds, not a figure from a source.
// Run: `npm run eval:compose` (needs ANTHROPIC_API_KEY; costs real tokens); `EVAL_SET=more` the twenty-five more below,
// `EVAL_SET=all` both; `EVAL_ONLY=5` the first five; `EVAL_PICK=7` the seventh alone; `EVAL_MODEL` the model;
// `EVAL_OUT=file.json` keeps every run's steps, plans and result; `EVAL_REPEAT=2` runs the set twice in one process and
// says, for each request, whether its second run used parts remembered from the first (memory.ts: a remembered part's
// block on its board, and the uses memory.ts counted) and how many calls it took against the first (decision 0028: "the
// second run should use the first run's parts and need fewer calls").
import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import '../../src/nexus/seeds';
import { composeBuild, sdkAsk } from '../../src/nexus/agent';
import { Engine } from '../../src/nexus/dataflow';
import { nodesOf } from '../../src/nexus/boards';
import { savedParts } from '../../src/nexus/memory';
import { W, score, usedIn, type Kind, type Want } from './score';

// (a kind: its pattern read on block ids and on pieces' names, as before; and, where a family makes it, any family on its
// aisle whose name says it)
const K = (s: string, aisle?: RegExp, named?: RegExp): Kind => { const re = new RegExp(s, 'i'); return { says: String(re), ids: re, pieces: re, ...(aisle ? { aisle } : {}), ...(named ? { named } : {}) }; };
const MOTORS = /^Motion \/ Motors$/, WHEELS = /Wheels and castors$/, LIGHTS = /^Electronics \/ (Lights|Optoelectronics)$/, SERVO = /servo/i, MOTORED = /motor/i;
const DRONE = K('^seed\\.quadcopter$|prop'), ARM = K('^seed\\.robot-arm$|gripper|finger|forearm|upper arm|link|^piece\\.servo$', MOTORS, SERVO), WHEEL = K('^piece\\.(wheel|castor)$|wheel|tyre|tire', WHEELS);
const CAMERA = K('camera|lens'), PANTILT = K('^piece\\.servo$|servo|pan|tilt', MOTORS, SERVO), BELT = K('^piece\\.(belt|pulley)$|belt|roller|pulley', /(Gears, pulleys and belts|Belts and pulleys)$/, /belt|pulley/i);
const LAMP = K('^piece\\.(led|lamp)$|led|lamp|bulb|shade', LIGHTS, /^(SMD )?LED\b(?! display)|bulb|lamp/i);
const JOINT = K('^piece\\.(hinge|pianohinge)$|hinge|pivot|joint|^mate\\.bolted$', /^Hardware \/ Hinges/, /hinge/i), CRANE = K('boom|jib|mast|hook|winch|crane');
const EXTRUSION = K('^piece\\.extrusion$|extrusion', /^Structure \/ (Sections|Aluminium profiles)$/, /extrusion|t-slot|v-slot/i);
const AXIS = K('^piece\\.(mgn|rail|leadscrew|belt|shaft)$|rail|lead ?screw|carriage|belt', /^(Motion \/ Linear motion|Linear motion \/ Ball screws)$/), TANK = K('^piece\\.tank$|tank', /\/ Tanks$/);
const PIPE = K('^piece\\.(pipe|run|pvcpipe|hose|elbow)$|pipe|hose', /^(Fluid \/ (Pipe and tube|Hose)|Plumbing \/ (Pressure pipe|PEX|Garden hose)|Building \/ Drainage)$/, /pipe|tube|hose/i);
const PUMP = K('pump|impeller|motor', MOTORS, MOTORED), HULL = K('hull|deck|boat'), PROP = K('prop|blade'), BLADE = K('blade|^room\\.ring$');
const TOWER = K('tower|mast|post|pole|^piece\\.(hollowsection|pipe)$', /^Structure \/ (Sections|Steel tube|Aluminium profiles)$/, /hollow|tube/i);
const LEG = K('leg|tripod'), RAIL = K('^piece\\.(mgn|rail|extrusion)$|rail|carriage', /^(Motion \/ Linear motion|Linear motion \/ .+)$/, /rail/i), TABLE = K('table|leg|^piece\\.(lumber|sheet)$'), PANEL = K('solar|panel|^piece\\.sheet$');
const SPINDLE = K('spindle|drill|chuck|motor', MOTORS, MOTORED), DRUM = K('drum|winch|spool|reel'), SHELF = K('^piece\\.(anglebracket|bracket|sheet|lumber)$|shelf|bracket', /^Structure \/ Brackets$/, /bracket/i), FAN = K('^piece\\.fan$|fan|blade', /\/ Fans$/, /fan/i);
const BASKET = K('basket|crate|^piece\\.case$|box', /^(Structure \/ Boxes|Enclosures \/ .+)$/, /box|case/i), CART = K('cart|trailer|bed|castor', WHEELS, /castor/i), BODY = K('body|chassis|torso|^piece\\.(case|plate)$');
const MOTOR = K('^seed\\.motor-dc$|^piece\\.(dcmotor|gearmotor|stepper)$|motor', MOTORS, MOTORED);

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

// Twenty-five more (`EVAL_SET=more`): the kinds of thing a person sends at random (the user, 2026-11-06: "I'm gonna send
// random requests every time"): vehicles, robots, furniture, machines, buildings, tools and toys, often in a few words.
// Each holds the kinds a person would look for to know it (by a family's aisle where a family makes it, else by its
// pieces' names: a seat, a cab, a window), one group, and at least so many pieces: every least count an estimate of what
// a recognisable build of it holds (four wheels, a frame, a seat and a wheel to steer), not a figure from a source.
const SEAT = K('seat|saddle|chair|bench'), FRAME = K('frame|chassis|tube|^piece\\.(hollowsection|steeltube|altube|albox|extrusion|bar)$', /^Structure \/ (Sections|Steel tube|Aluminium profiles)$/, /tube|hollow|box section|extrusion/i);
const TORSO = K('body|torso|chassis|^piece\\.(case|plate)$'), HEAD = K('head|camera|sensor|eye'), WALL = K('wall|panel|board|plank|^piece\\.(sheet|lumber|wall|brick)$', /^Structure \/ (Plates and sheet|Timber|Masonry)$/);
const DOOR = K('door'), WINDOW = K('window|glass|pane|glazing'), ROOF = K('roof'), DRIVE = K('pedal|crank|chain|sprocket', /Chain and sprockets$/, /chain|sprocket/i);
const HOTEND = K('nozzle|hot ?end|extruder|print ?head'), BED = K('bed|build plate|platform'), TIPPER = K('dump|tipper|bed|body|box'), CAB = K('cab');
const POST = K('post|leg|frame|beam|^piece\\.(lumber|hollowsection|steeltube)$', /^Structure \/ (Timber|Sections|Steel tube)$/, /timber|hollow|tube/i), ROPE = K('chain|rope|cable', /^Rigging \/ Chain$/);
const GRIP = K('^seed\\.gripper$|gripper|finger|jaw'), MOUNT = K('rod|mount|canopy|bracket'), GATE = K('gate|rail|picket|slat|board|^piece\\.lumber$', /^Structure \/ Timber$/);
const FORK = K('fork|tine|mast'), SCREEN = K('monitor|screen|display', /Boards and displays$/, /display/i), BACK = K('back|rest');
const TURNTABLE = K('turntable|slewing|bearing', /^(Motion \/ Bearings|Bearings \/ .+)$/, /bearing/i), TRACK = K('track|tread|crawler|wheel|sprocket', WHEELS);
const BOOM = K('boom|stick|^seed\\.robot-arm$'), BUCKET = K('bucket|scoop'), SPRINKLER = K('sprinkler|nozzle|spray'), WAGON = K('wagon|carriage|coach|truck|car\\b');
const COLUMN = K('column|post|pillar|^piece\\.(hollowsection|steeltube|shaft)$', /^Structure \/ (Sections|Steel tube)$/, /hollow|tube/i), ROTOR = K('rotor|blade|^room\\.ring$'), FUSELAGE = K('body|fuselage|cabin|cockpit'), TAIL = K('tail');
const TRAY = K('tray|tub|bucket|bin|basket|box'), HANDLES = K('handle|grip', /Handles and knobs$/, /handle/i);
export const COMPOSE_MORE: [string, Want][] = [
  ['A go-kart', W(10, WHEEL, FRAME, SEAT)],
  ['A robot dog', W(10, TORSO, LEG, HEAD)],
  ['A bookshelf with a lamp on it', W(6, SHELF, LAMP)],
  ['A shed with a door and a window', W(8, WALL, DOOR, WINDOW, ROOF)],
  ['A boat with an outboard motor', W(6, HULL, MOTOR, PROP)],
  ['A wind turbine on a tower', W(8, BLADE, TOWER)],
  ['A bicycle', W(10, WHEEL, FRAME, DRIVE, SEAT)],
  ['A 3D printer', W(15, EXTRUSION, AXIS, HOTEND, BED)],
  ['A tripod with a camera', W(5, CAMERA, LEG)],
  ['A dump truck', W(12, WHEEL, TIPPER, CAB)],
  ['A swing set', W(6, POST, SEAT, ROPE)],
  ['A conveyor feeding a box', W(8, BELT, BASKET)],
  ['A robotic gripper on a linear rail', W(8, GRIP, RAIL)],
  ['A ceiling fan', W(6, BLADE, MOTOR, MOUNT)],
  ['A garden gate on its hinges', W(5, GATE, JOINT, POST)],
  ['A forklift', W(12, WHEEL, FORK)],
  ['A desk with a monitor on it', W(6, TABLE, SCREEN)],
  ['A chair', W(6, SEAT, LEG, BACK)],
  ['A robot arm on a turntable', W(10, ARM, TURNTABLE)],
  ['An excavator', W(15, TRACK, BOOM, BUCKET)],
  ['A water pump with a pipe to a sprinkler', W(5, PUMP, PIPE, SPRINKLER)],
  ['A toy train: an engine pulling two wagons', W(12, WHEEL, WAGON)],
  ['A drill press', W(6, SPINDLE, COLUMN)],
  ['A helicopter', W(8, ROTOR, FUSELAGE, TAIL)],
  ['A wheelbarrow', W(5, WHEEL, TRAY, HANDLES)],
];
/** The set a run takes: the first twenty-five, the twenty-five more, or both. */
export const composeSet = (which = ''): [string, Want][] => (which === 'more' ? COMPOSE_MORE : which === 'all' ? [...COMPOSE, ...COMPOSE_MORE] : COMPOSE);

/** The parts memory.ts keeps now, by id, with the uses it counted. */
const usesNow = (): Map<string, number> => new Map(savedParts().map((p) => [p.id, p.uses]));

it('the AI, on things made of several things', async () => {
  const SET = composeSet(process.env.EVAL_SET), only = Number(process.env.EVAL_ONLY ?? SET.length), pick = Number(process.env.EVAL_PICK ?? 0), model = process.env.EVAL_MODEL || undefined;
  const repeat = Math.max(1, Math.min(3, Number(process.env.EVAL_REPEAT ?? 1) || 1)), rows: Record<string, unknown>[] = [];
  const one = async ([req, want]: [string, Want], k: number, pass: number, kept: Map<string, number>) => {
    const t0 = Date.now(), tokens = { in: 0, out: 0, cached: 0, written: 0 };
    let row: Record<string, unknown>;
    try {
      const r = await composeBuild(req, { ask: sdkAsk({ ...(model ? { model } : {}), tokens, signal: AbortSignal.timeout(300_000) }) });
      const e = new Engine(r.board); await e.run();
      const why = score(r.board, e, want) ?? (r.unmet.length ? `not met: ${r.unmet[0]!.slice(0, 160)}` : null);
      // (the parts remembered before this pass that its board places, read inside its folded parts too)
      const remembered = [...new Set(usedIn(r.board).filter((id) => kept.has(id)))];
      row = { k: k + 1, pass, request: req, right: !why, why: why ?? '', asks: r.asks, nodes: nodesOf(r.board).length, parts: r.parts.map((p) => `${p.name}:${p.by ?? '?'}`).join(' '), remembered, ...tokens, s: +((Date.now() - t0) / 1000).toFixed(1), steps: r.steps, plans: r.plans };
    } catch (x) { row = { k: k + 1, pass, request: req, right: false, why: `failed: ${(x as Error).message.slice(0, 140)}`, asks: 0, nodes: 0, remembered: [], ...tokens, s: +((Date.now() - t0) / 1000).toFixed(1) }; }
    rows.push(row); console.log(`${row.right ? 'RIGHT' : 'WRONG'} ${repeat > 1 ? `run ${pass}, ` : ''}${row.k}. ${req.slice(0, 64)} | ${row.parts ?? ''} | asks ${row.asks}, nodes ${row.nodes}, in ${row.in} (+${row.cached} cached, ${row.written} written), out ${row.out}, ${row.s} s${(row.remembered as string[]).length ? ` | remembered ${(row.remembered as string[]).join(', ')}` : ''}${row.why ? ` | ${row.why}` : ''}`);
  };
  const todo = SET.slice(0, only).map((c, k) => [c, k] as const).filter(([, k]) => !pick || k + 1 === pick);
  const sum = (rs: Record<string, unknown>[], f: string) => rs.reduce((a, r) => a + ((r[f] as number) || 0), 0);
  const passes: { kept: Map<string, number>; after: Map<string, number> }[] = [];
  for (let pass = 1; pass <= repeat; pass++) {
    const kept = usesNow();
    for (let i = 0; i < todo.length; i += 3) await Promise.all(todo.slice(i, i + 3).map(([c, k]) => one(c, k, pass, kept)));
    passes.push({ kept, after: usesNow() });
    const these = rows.filter((r) => r.pass === pass).sort((a, b) => (a.k as number) - (b.k as number)), right = these.filter((r) => r.right).length;
    console.log(`\nRESULT${repeat > 1 ? ` (run ${pass})` : ''} ${right} of ${these.length} right (composed from parts); asks ${sum(these, 'asks')}; tokens in ${sum(these, 'in')} (+${sum(these, 'cached')} cached, ${sum(these, 'written')} written), out ${sum(these, 'out')}; ${sum(these, 's').toFixed(0)} s summed; ${savedParts().length} parts remembered after it`);
  }
  // (each request's runs side by side: did a later run place a part kept by an earlier one, and how many calls did it take)
  for (let pass = 2; pass <= repeat; pass++) {
    const was = rows.filter((r) => r.pass === pass - 1), now = rows.filter((r) => r.pass === pass).sort((a, b) => (a.k as number) - (b.k as number));
    const { kept, after } = passes[pass - 1]!, counted = [...after].reduce((a, [id, n]) => a + Math.max(0, n - (kept.get(id) ?? 0)), 0);
    for (const r of now) { const w = was.find((x) => x.k === r.k); console.log(`AGAIN ${r.k}. ${String(r.request).slice(0, 56)} | remembered parts ${(r.remembered as string[]).length ? (r.remembered as string[]).join(', ') : 'none'} | asks ${w?.asks ?? '?'} then ${r.asks} | ${w?.right ? 'right' : 'wrong'} then ${r.right ? 'right' : 'wrong'}`); }
    const usedSome = now.filter((r) => (r.remembered as string[]).length).length, fewer = now.filter((r) => { const w = was.find((x) => x.k === r.k); return w && (r.asks as number) < (w.asks as number); }).length;
    console.log(`\nREPEAT run ${pass} against run ${pass - 1}: ${usedSome} of ${now.length} used parts remembered from before it; memory.ts counted ${counted} uses of the ${kept.size} parts it held before it; asks ${sum(was, 'asks')} then ${sum(now, 'asks')} (${fewer} requests took fewer calls); right ${was.filter((r) => r.right).length} then ${now.filter((r) => r.right).length}`);
  }
  rows.sort((a, b) => (a.pass as number) - (b.pass as number) || (a.k as number) - (b.k as number));
  if (process.env.EVAL_OUT) writeFileSync(process.env.EVAL_OUT, JSON.stringify(rows, null, 1));
}, 3_600_000);

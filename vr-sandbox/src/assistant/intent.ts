// Plain requests to Ego. "make it stronger", "weld these", "place 4 steel blocks", "save this as a template",
// "why did it break?". Each is read into an intent: what to do, to what, how many, with what. Ego then does it with
// the same engineering as everything else. A line that isn't a request is tried as Forge.

import { isComplaint } from './reports';
import type { Design, DesignSpec } from './designer';
import { DIMS, findQuantities, sameDim, type Dim, type Said } from '../ganglia/units';
import { archetypeByWord, type Flow } from '../ganglia/blocks';
import { flowOfPhrase } from '../ganglia/words';
import { formFromWords } from '../forms/say';
import { frontierFor } from '../ganglia/frontier';

export type Intent =
  | { do: 'strengthen' }
  | { do: 'join'; joint: string; floor: boolean }
  | { do: 'place'; count: number; kind: string; material?: string }
  | { do: 'freeze' | 'unfreeze' | 'delete' | 'template' | 'status' | 'why' | 'help' }
  | { do: 'duplicate'; count: number }
  | { do: 'skill'; which: string }
  | { do: 'complain'; words: string }
  | { do: 'design'; spec: DesignSpec; material?: string }
  | { do: 'show' }
  /** What she knows about something: a law, a process, a part, a way of working it out. */
  | { do: 'recall'; about: string }
  /** How much she knows. */
  | { do: 'ganglia' }
  /** Work a design out by one of her workflows (ganglia/workflows.ts), with what was said. */
  | { do: 'engineer'; workflow: string; spec: Record<string, number> }
  /** How she got her last answer, law by law with the numbers; and what it hangs on most. */
  | { do: 'work' }
  /** What something is made of, assembly by assembly. */
  | { do: 'breakdown'; what: string }
  /** Why something is done the way it is: the principle behind it. */
  | { do: 'reason'; about: string }
  /** The principles she designs by, all or of one kind. */
  | { do: 'principles'; of?: string }
  /** The building blocks she builds with. */
  | { do: 'blocks' }
  /** Ways to turn one flow into another (electric power into travel...): chains of building blocks. */
  | { do: 'conceive'; from: Flow; to: Flow }
  /** Grow a whole machine for a job, the fittest of every buildable way. */
  | { do: 'grow'; from: Flow; to: Flow; spec: Record<string, number> }
  /** Take on a hard challenge (or all of them) and say where it breaks. */
  | { do: 'challenge'; which?: string }
  /** The frontier: inventions past what is built, each with its want, its label, its path and her blueprint. */
  | { do: 'frontier'; which?: string }
  /** Where a law holds, and what it is the limit of. */
  | { do: 'scale'; about: string; words: string }
  /** A lesson: a design to build yourself, step by step, each checked in your world. */
  | { do: 'teach'; spec: DesignSpec; material?: string }
  /** A want of any kind (a place, a life, a lesson, a body): what it is made of here, done as far as she can now. */
  | { do: 'want'; words: string }
  /** What a block is made of, piece by piece. */
  | { do: 'inside'; what: string }
  /** A shape said in words (or as a form genome), made and placed. */
  | { do: 'shape'; words: string; material?: string }
  /** A part invented for a job: its shape grown by its loads. */
  | { do: 'invent'; words: string }
  | { do: 'depends' }
  | { do: 'level' }
  | { do: 'command'; command: 'play' | 'build' | 'undo' | 'redo' | 'save' | 'new' | 'pause' | 'switch on' | 'switch off' | 'gravity earth' | 'gravity moon' | 'gravity zero' };

const NUMBERS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, pair: 2, couple: 2 };

const JOINT_WORDS: Record<string, string> = {
  weld: 'weld', bolt: 'bolted', screw: 'screwed', glue: 'glued', rivet: 'riveted', nail: 'nailed', solder: 'soldered',
  join: 'best', attach: 'best', connect: 'best', fasten: 'best', fix: 'best', stick: 'best', lock: 'best',
};

const it = '(?:it|this|that|these|them|those|the (?:selection|assembly|thing))';

/** What a line asks for, or null if it isn't a request Ego knows (then it may be Forge). */
export function interpret(line: string): Intent | null {
  const t = line.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9%. ]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^(ego|hey ego|please|can you|could you|would you)\s+/g, '').replace(/\s+please$/, '');
  if (!t) return null;
  let m: RegExpExecArray | null;
  if (/^(help|what can you do|commands)$/.test(t)) return { do: 'help' };
  if (/^(what level are you|your level|level|how (much )?have you grown|how smart are you)/.test(t)) return { do: 'level' };
  if ((m = /^(?:do|run|use)(?: (?:the|your|my))? skill (.+)$|^skill (.+)$|^do (?:the )?(.+?) (?:skill|thing)$/.exec(t))) return { do: 'skill', which: (m[1] ?? m[2] ?? m[3])!.trim() };
  if (/^(whats wrong|status|report|how is it|hows it (doing|going)|check (it|this|the build)|anything wrong)/.test(t)) return { do: 'status' };
  // "why did it break?" is about what just happened; any other "why" asks for the reason things are done as they are
  if (/^why( did (it|that|this|the .+?) (break|fail|fall|snap|collapse|bend|give way)( down| over)?)?$/.test(t)) return { do: 'why' };
  if ((m = /^why (?:do|does|did|is|are|should|would|must|use|have|put|make)?\s*(?:you |we |i |it |they |one |people |engineers |an? |the )*(.+)$/.exec(t))) return { do: 'reason', about: m[1]!.trim() };
  if ((m = /^(?:what is|whats) the (?:reason|point|idea) (?:for|of|behind) (?:an? |the )?(.+)$/.exec(t))) return { do: 'reason', about: m[1]!.trim() };
  if (new RegExp(`^(make ${it} )?(stronger|sturdier|hold|stiffer)|^(fix|strengthen|reinforce) ${it}|^fix( it)?$|^make ${it} hold`).test(t)) return { do: 'strengthen' };
  // a part for a job, its shape grown by its loads: "invent a bracket that holds 500 N at 120 mm"
  if (/^(invent|grow|design|make|create|build|print)\b/.test(t) && /\b(bracket|beam|arm|hook|mount|holder|bridge|cantilever|joist|hanger)\b/.test(t) && findQuantities(t).some((q) => sameDim(q.dim, DIMS.force) || sameDim(q.dim, DIMS.mass))) return { do: 'invent', words: line.trim() };
  // a shape in the form language, said as its genome
  if (/^\s*(form|shape)\s*[:=]?\s*\{/i.test(line)) return { do: 'shape', words: line.trim().replace(/^(form|shape)\s*[:=]?\s*/i, '') };
  // the frontier: "what's on your frontier", "can you make an invisibility cloak", "blueprint for gravity boots"
  if (/^((whats|what is) (on )?)?(your |the )?frontier( list)?$|^(show|list) (me )?(your |the )?frontier/.test(t)) return { do: 'frontier' };
  if (/^(make|build|create|invent|design|(give me )?(a |the )?blueprints?( for| of)?|how (would|do|can|could|should) (you|i|we|one) (make|build|create)|is it possible to (make|build)|(could|can) (we|i) (make|build))\b/.test(t)) {
    const f = frontierFor(t);
    if (f) return { do: 'frontier', which: f.id };
  }
  // where a law holds: "where does kinetic energy break down", "at what scale does fouriers law fail"
  if ((m = /^(?:where|when|at what (?:scale|speed|size|temperature)) (?:does|do|is|would|will) (?:the )?(.+?) (?:hold|break(?: down)?|fail|stop working|stop holding|apply|stop applying|stay true|stop being true|work)\b/.exec(t))) return { do: 'scale', about: m[1]!.trim(), words: line.trim() };
  if ((m = /^(?:what is|whats) the (?:scale|limit|regime) of (?:the )?(.+)$/.exec(t))) return { do: 'scale', about: m[1]!.trim(), words: line.trim() };
  // a hard challenge, said any way: "try to build a computer", "create a symbiote", "build something that flies"
  if (/^(challenge|try to|build|create|make|invent|design|take|run)\b/.test(t) && (m = /\b(computer|symbiote|scientist|language|geometry|new shape|fly|flies|flying|flight)\b/.exec(t)) && !/\b(table|desk|bench|wall|tower|shelf|crate)\b/.test(t)) {
    const w = m[1]!;
    return { do: 'challenge', which: w === 'new shape' ? 'geometry' : /^fl/.test(w) ? 'flight' : w };
  }
  // a lesson in building something she can design: "teach me to build a table", "show me how to build a shelf"
  if ((m = /^(?:teach me (?:how )?to|show me how to|train me to|give me a lesson (?:in|on)|lesson:?)\s+(?:build|make|put together)\s+(.+)$/.exec(t))) {
    const d = designOf(`build ${m[1]}`);
    if (d) return { do: 'teach', spec: d.spec, ...(d.material ? { material: d.material } : {}) };
  }
  // a want of any kind: a place to be, a life to fill it, a body to wear, a lesson
  if (/^(i (just )?(want|wanna|would like|d like)|take me|put me|spawn me|drop me|let me (be|live|chill|relax|explore|learn|practice)|turn me into|make me (tiny|small|smaller|giant|big|bigger|huge)|teach me|train me|show me how to (play|dance|fight|speak|cook|swim|survive)|populate|generate an?|give me an? (world|tutorial|lesson|course))\b/.test(t)
    || /\b(spawner|tutorial|simulation as an?|sim-within-a-sim|ecosystem of)\b/.test(t) || /^(go|back) (to|back to) (the )?(beach|island|lake|desert|meadow|mountains?|workshop)\b|^back to (the )?workshop$/.test(t)) return { do: 'want', words: line.trim() };
  // something's wrong: she looks, fixes what she can, and writes it up for Claude
  if (isComplaint(t)) return { do: 'complain', words: line.trim() };
  if (new RegExp(`^save ${it} as (a )?template|^(make|save) (a )?template|^template ${it}`).test(t)) return { do: 'template' };
  if (new RegExp(`^(unfreeze|unpin|free|release) ${it}`).test(t)) return { do: 'unfreeze' };
  if (new RegExp(`^(freeze|pin|anchor) ${it}`).test(t)) return { do: 'freeze' };
  if (new RegExp(`^(delete|remove|trash|get rid of|scrap) ${it}`).test(t)) return { do: 'delete' };
  if ((m = new RegExp(`^(duplicate|copy|clone) ${it}(?: (\\w+) times)?`).exec(t))) return { do: 'duplicate', count: count(m[2]) ?? 1 };
  if ((m = new RegExp(`^(weld|bolt|screw|glue|rivet|nail|solder|join|attach|connect|fasten|stick|lock)(?: ${it})?(?: together)?( to (the )?(floor|ground))?$`).exec(t))) {
    return { do: 'join', joint: JOINT_WORDS[m[1]!]!, floor: !!m[2] };
  }
  const commands: [RegExp, Extract<Intent, { do: 'command' }>['command']][] = [
    [/^(play|go|run it|test it|start)$/, 'play'], [/^(stop|back to build|build mode|edit)$/, 'build'], [/^undo( that)?$/, 'undo'], [/^redo$/, 'redo'],
    [/^save( (the|my) build)?$/, 'save'], [/^(new build|start over|clear (it|everything))$/, 'new'], [/^(pause|freeze time)$/, 'pause'],
    [/^(switch|magnets?|power) on$/, 'switch on'], [/^(switch|magnets?|power) off$/, 'switch off'],
    [/^(earth|normal) gravity$|^gravity (earth|normal)$/, 'gravity earth'], [/^moon gravity$|^gravity moon$/, 'gravity moon'], [/^(zero|no) gravity$|^gravity (zero|off)$/, 'gravity zero'],
  ];
  for (const [re, command] of commands) if (re.test(t)) return { do: 'command', command };
  // "look at this", "see this?", "watch this", "look here": she looks where you point
  if (/^(look|see|watch|check)( at)? (this|that|here|it)\b|^(look|see|watch) here\b|^(do you see|can you see) (this|that)/.test(t)) return { do: 'show' };
  if (/^(how much do you know|what do you know|your (ganglia|knowledge)|what have you learned)$/.test(t)) return { do: 'ganglia' };
  // a building block opens into its anatomy; a machine breaks down into its assemblies
  if ((m = /^(?:whats inside|what is inside|open up|anatomy of|what makes up|break ?down|whats in|what is in)\s+(?:an? |the )?(.+)$/.exec(t)) && !!archetypeByWord(m[1]!) && !/fx10|printer|markforged/.test(t)) return { do: 'inside', what: m[1]!.trim() };
  if ((m = /^(?:break ?down|breakdown|tear ?down|teardown|what is inside|whats inside|whats in|what is in|what makes up|map out)\s+(?:of\s+)?(?:an? |the )?(.+)$/.exec(t))) return { do: 'breakdown', what: m[1]!.trim() };
  if (/^(show (me )?(your|the) (work|working|workings|math|maths|calculation|calculations)|how did you (get|work out) (that|it)|show your working)$/.test(t)) return { do: 'work' };
  if (/^(what does (it|that) (depend|hang) on|what matters (most)?|what (is it|is that) (most )?sensitive to)$/.test(t)) return { do: 'depends' };
  if (/^((your |the )?(design )?(principles|rules)( of design)?|what (design )?(principles|rules) do you (know|follow|use|design by)|how do you (decide|design))$/.test(t)) return { do: 'principles' };
  if ((m = /^(?:design )?(?:principles|rules) (?:of|for|about) (?:an? |the )?(.+)$/.exec(t))) return { do: 'principles', of: m[1]!.trim() };
  if (/^((your |the |what )?(building )?blocks( do you (have|know|use|build with))?|what do you build with)$/.test(t)) return { do: 'blocks' };
  if (/^(challenge yourself|(take|run|try) (a |the |your )?challenges?|(what|which) challenges?.*|how far can you go)$/.test(t)) return { do: 'challenge' };
  if ((m = /^(?:grow|evolve|develop) (?:me )?(?:a |an )?(?:machine|something|thing|design)? ?(?:that |to )?(?:turns?|converts?|changes?) (.+?) (?:into|to) (.+?)(?: for (.+))?$/.exec(t))) {
    const from = flowOfPhrase(m[1]!), to = flowOfPhrase(m[2]!);
    if (from && to && from !== to) return { do: 'grow', from, to, spec: vehicleSpec(line) };
  }
  if ((m = /^(?:grow|evolve|develop) (?:me )?(?:a |an )?(.*\b(?:kart|cart|car|vehicle|robot|buggy)\b.*)$/.exec(t))) return { do: 'grow', from: 'electric', to: 'travel', spec: vehicleSpec(line) };
  if ((m = /^(?:how (?:do|can|could|would|should) (?:i|you|we|one) )?(?:turn|convert|change|transform|get from) (.+?) (?:into|to) (.+)$/.exec(t))) {
    const from = flowOfPhrase(m[1]!), to = flowOfPhrase(m[2]!);
    if (from && to && from !== to) return { do: 'conceive', from, to };
  }
  const e = engineerOf(t, line);
  if (e) return e;
  if ((m = /^(?:what do you know about|tell me about|explain|what is|whats|what are|how (?:is|are|do (?:i|you)) (?:make|made|cut|drill|tap|bend|weld|fit|size|choose|pick)?)\s*(?:an? |the )?(.+)$/.exec(t))) return { do: 'recall', about: m[1]!.trim() };
  const d = designOf(t);
  if (d) return d;
  // a shape with its sizes: "make a 40 mm sphere", "print a 60 mm cube filled with a gyroid lattice"
  if (/^(make|build|print|create|place|spawn|give me|shape|form)\b/.test(t) && findQuantities(t).some((q) => sameDim(q.dim, DIMS.length)) && formFromWords(line)) return { do: 'shape', words: line.trim() };
  if ((m = /^(?:place|add|spawn|give me|put|make|build|drop)(?: me)? (?:(\w+) )?(.+?)(?: here| in front( of me)?)?$/.exec(t))) {
    const n = count(m[1]);
    const words = (n === null && m[1] ? `${m[1]} ${m[2]}` : m[2]!).split(' ').filter((w) => !['of', 'the', 'some'].includes(w));
    if (!words.length) return null;
    // "4 steel blocks", "an oak board": the last word is the part, what comes before it the material
    const kind = singular(words[words.length - 1]!);
    const material = words.length > 1 ? words.slice(0, -1).join(' ') : undefined;
    return { do: 'place', count: Math.min(n ?? 1, 50), kind, material };
  }
  return null;
}

/** A vehicle's numbers, however they were said: mass, speed, wheel radius, motors. */
function vehicleSpec(line: string): Record<string, number> {
  const spec: Record<string, number> = {};
  for (const q of findQuantities(line)) {
    if (sameDim(q.dim, DIMS.mass)) spec['mass'] = q.si;
    else if (sameDim(q.dim, DIMS.speed)) spec['speed'] = q.si;
    else if (sameDim(q.dim, DIMS.length)) spec['wheelRadius'] = q.si / 2;
  }
  const k = /(\d+|two|three|four) motors?/.exec(line.toLowerCase());
  if (k) spec['motors'] = Number(k[1]) || ({ two: 2, three: 3, four: 4 } as Record<string, number>)[k[1]!]!;
  return spec;
}


/** blocks → block, boxes → box, batteries → battery; brass and glass stay. */
function singular(w: string) {
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/(ss|us)$/.test(w)) return w;
  if (/(s|x|z|ch|sh)es$/.test(w)) return w.replace(/es$/, '');
  return w.replace(/s$/, '');
}

const DESIGNS: [RegExp, Design][] = [
  [/\b(table|desk|workbench)\b/, 'table'], [/\bbench\b/, 'bench'], [/\b(crate|box|chest)\b/, 'crate'],
  [/\b(shelf|shelves|shelving|bookshelf|bookcase)\b/, 'shelf'], [/\b(brick wall|wall)\b/, 'wall'], [/\b(tower|stack|column|pillar)\b/, 'tower'],
];
const LENGTH: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, meter: 1, meters: 1, metre: 1, metres: 1, in: 0.0254, inch: 0.0254, inches: 0.0254, ft: 0.3048, foot: 0.3048, feet: 0.3048 };

/** "build a table that holds 80 kg, 90 cm tall, out of oak": what to design, how big, for what, in what. */
function designOf(t: string): Extract<Intent, { do: 'design' }> | null {
  if (!/^(build|design|make|create|construct|give me|i want|i need)\b/.test(t)) return null;
  const hit = DESIGNS.find(([re]) => re.test(t));
  if (!hit) return null;
  const spec: DesignSpec = { what: hit[1] };
  let m: RegExpExecArray | null;
  const dims = /(\d+(?:\.\d+)?)\s*(mm|cm|m|meters?|metres?|in|inch(?:es)?|ft|foot|feet)\s*(tall|high|wide|long|deep)/g;
  while ((m = dims.exec(t))) {
    const v = Number(m[1]) * (LENGTH[m[2]!] ?? 1);
    if (m[3] === 'tall' || m[3] === 'high') spec.height = v;
    else if (m[3] === 'deep') spec.depth = v;
    else spec.width = v;
  }
  if ((m = /(\d+(?:\.\d+)?)\s*(kg|kilos?|kilograms?|lbs?|pounds?)/.exec(t))) spec.load = Number(m[1]) * (/^(lb|pound)/.test(m[2]!) ? 0.4536 : 1);
  if ((m = /(\d+|two|three|four|five|six|seven|eight|ten|twelve|twenty)\s*(shelves|courses|rows|blocks|bricks|levels|high|tall)/.exec(t))) spec.count = count(m[1]) ?? undefined;
  let material: string | undefined;
  if ((m = /\b(?:out of|made of|made from|from|in)\s+([a-z][a-z-]*(?: [a-z][a-z-]*)?)/.exec(t))) material = m[1]!.replace(/\s+(that|which|with|for|and)\b.*$/, '').trim();
  else if ((m = /\b(?:a|an)\s+([a-z-]+)\s+(?:table|desk|workbench|bench|crate|box|chest|shelf|bookshelf|bookcase|wall|tower|stack)\b/.exec(t)) && !/^(big|small|little|large|tall|short|long|wide|strong|sturdy|simple|nice|good|new)$/.test(m[1]!)) material = m[1];
  return { do: 'design', spec, material };
}

/**
 * "pick a drive for a 265 lb kart at 8 mph", "size a wire for 20 a over 3 m at 24 v", "which bearing for 500 n at 600
 * rpm for 5000 hours on a 25 mm shaft", "size a shaft for 20 nm and 30 nm bending": a question one of her workflows
 * answers. Every number is read with its unit and taken by its dimension (a mass in kg or lb, a speed in m/s, km/h or
 * mph, a length in mm, in or ft), so it is understood whatever units it comes in; what wasn't said takes the
 * workflow's default.
 */
function engineerOf(t: string, line: string): Extract<Intent, { do: 'engineer' }> | null {
  const qs = findQuantities(line);
  const spec: Record<string, number> = {};
  const of = (d: Dim, not?: (x: Said) => boolean) => qs.find((x) => sameDim(x.dim, d) && !(not && not(x)));
  const after = (x: Said, re: RegExp) => re.test(line.slice(x.at + x.text.length, x.at + x.text.length + 24).toLowerCase());
  const before = (x: Said, re: RegExp) => re.test(line.slice(Math.max(0, x.at - 24), x.at).toLowerCase());
  const put = (k: string, v: number | undefined) => { if (v !== undefined && Number.isFinite(v)) spec[k] = Number(v.toPrecision(12)); };
  const wheels = (x: Said) => after(x, /^\s*(diameter\s+)?wheels?|^\s*tyres?|^\s*tires?/);
  if (/\b(drive|motors?|powertrain|drivetrain)\b/.test(t) && of(DIMS.mass) && /\b(for|pick|choose|size|design|what|which)\b/.test(t)) {
    put('mass', of(DIMS.mass)?.si);
    put('speed', of(DIMS.speed)?.si);
    put('accel', of(DIMS.accel)?.si);
    const pct = qs.find((x) => x.unit === '%');
    if (pct) put('grade', pct.value);
    const wheel = qs.find((x) => sameDim(x.dim, DIMS.length) && wheels(x));
    if (wheel) put('wheelRadius', wheel.si / 2);
    const m = /(\d+|two|three|four|one) (?:motors|driven wheels)/.exec(t);
    if (m) put('motors', count(m[1]) ?? undefined);
    return { do: 'engineer', workflow: /powertrain|drivetrain|whole|everything|all the parts/.test(t) ? 'powertrain.design' : 'drive.select', spec };
  }
  if (/\b(wire|cable|gauge)\b/.test(t) && of(DIMS.current)) {
    put('current', of(DIMS.current)?.si);
    put('length', of(DIMS.length)?.si);
    put('voltage', of(DIMS.voltage)?.si);
    const pct = qs.find((x) => x.unit === '%');
    if (pct) put('drop', pct.value / 100);
    return { do: 'engineer', workflow: 'wire.size', spec };
  }
  if (/\b(battery|batteries|pack)\b/.test(t) && of(DIMS.current)) {
    put('current', of(DIMS.current)?.si);
    const time = of(DIMS.time);
    if (time) put('hours', time.si / 3600);
    put('voltage', of(DIMS.voltage)?.si);
    return { do: 'engineer', workflow: 'battery.size', spec };
  }
  if (/\bbearings?\b|\bpillow blocks?\b/.test(t) && of(DIMS.force)) {
    put('load', of(DIMS.force)?.si);
    const rpm = qs.find((x) => x.unit === 'rpm');
    if (rpm) put('rpm', rpm.value);
    const time = of(DIMS.time);
    if (time) put('hours', time.si / 3600);
    put('bore', qs.find((x) => sameDim(x.dim, DIMS.length) && after(x, /^\s*(shaft|axle|bore)/))?.si);
    if (/pillow block|housed|hanger/.test(t)) put('housed', 1);
    return { do: 'engineer', workflow: 'bearing.select', spec };
  }
  const torques = qs.filter((x) => sameDim(x.dim, DIMS.torque));
  if (/\b(shaft|axle)\b/.test(t) && /\b(size|for|how thick|diameter|what)\b/.test(t) && torques.length) {
    const bending = torques.find((x) => after(x, /^\s*(of\s+)?bending/) || before(x, /bending\s*(of\s*)?$/));
    put('T', torques.find((x) => x !== bending)?.si);
    if (bending) put('M', bending.si);
    const m = /(?:safety factor|factor of) (\d+(?:\.\d+)?)/.exec(t);
    if (m) put('n', Number(m[1]));
    return { do: 'engineer', workflow: 'shaft.size', spec };
  }
  if (/\bcoupling\b/.test(t) && torques.length) {
    put('torque', torques[0]!.si);
    put('bore', qs.find((x) => sameDim(x.dim, DIMS.length) && after(x, /^\s*(shaft|bore)/))?.si);
    return { do: 'engineer', workflow: 'coupling.select', spec };
  }
  if (/\b(controller|driver|esc)\b/.test(t) && of(DIMS.current)) {
    put('current', of(DIMS.current)?.si);
    put('voltage', of(DIMS.voltage)?.si);
    const m = /(\d+|two|three|four|one) motors/.exec(t);
    if (m) put('motors', count(m[1]) ?? undefined);
    return { do: 'engineer', workflow: 'controller.select', spec };
  }
  if (/torque arm/.test(t) && torques.length) {
    put('torque', torques[0]!.si);
    put('radius', qs.find((x) => sameDim(x.dim, DIMS.length) && !after(x, /^\s*long/))?.si);
    put('length', qs.find((x) => sameDim(x.dim, DIMS.length) && after(x, /^\s*long/))?.si);
    return { do: 'engineer', workflow: 'torquearm.size', spec };
  }
  return null;
}

function count(w: string | undefined): number | null {
  if (!w) return null;
  if (/^\d+$/.test(w)) return Number(w);
  return NUMBERS[w] ?? null;
}

export const HELP = 'Try: "pick a drive for a 120 kg kart at 3 m/s", "why use a torque arm?", "how do I turn electricity into motion?", "design principles", "size a wire for 20 A over 2 m", "which bearing for 500 N at 600 rpm on a 25 mm shaft", "tell me about rolling resistance", "make it stronger", "weld these", "place 4 steel blocks", "build a table that holds 60 kg", "build a brick wall 2 m long", "save this as a template", "freeze it", "duplicate it 3 times", "why did it break?", "do skill 1", "what level are you?", "play". Or type Forge.';

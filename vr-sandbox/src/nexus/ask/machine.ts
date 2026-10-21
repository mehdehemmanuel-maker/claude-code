// Machines invented from the library, the way a program is written from a language rather than copied from a blueprint.
//
// Owner of: composing an ask into a machine that is a real bill of materials — what it can reach, what it can carry,
// what it costs, and what it cannot do and why. The units it composes FROM are `ask/machine-units.ts` (split out when
// the lint caught this file at 735 lines: a catalogue of assemblies and the arithmetic that chooses between them are
// two concerns), and how one is laid out in space is `ask/machine-draw.ts`.
//
// src/nexus/ask/invent.ts chains *flows*: a port carries power in one domain and meets a port of the same kind, and
// conservation sizes the chain. This is that same rule one level up, over *motion and structure*: a unit has a base it
// is bolted to and a moving end that carries the next unit, and a stack is sound when every stage carries the mass of
// everything above it. Nothing here is a named machine. A screw axis, a belt axis, a turn axis, a hot end, a spindle,
// a gripper, an eye and a brain are the words; three slides under a hot end spell a 3D printer, three under a spindle
// spell a router, two under a gripper and an eye spell a pick-and-place, and one long slide under a hand spells a
// robot that moves along a wall. The machine is not stored anywhere: it is what the words compose to, and a
// combination nobody has built composes exactly as well as one everybody has, or is refused with the number that
// refuses it.
//
// Every unit is made of parts the component library really draws, named by the words that draw them, so a machine
// invented here is a list you can order and a thing that can be stood in the room. What is bought whole rather than
// composed (a spindle motor, a servo) says so, because pretending to compose a part that is really a purchase is the
// way a bill of materials quietly becomes fiction.

import { component, use } from '../parts/components';
import { massOf } from '../parts/mass';
import { addKit, type Part } from '../parts/kits';
import { cheapest } from '../parts/prices';
// the reader lives in its own file now (ask/machine-read.ts); re-exported here so every existing door goes on
// meaning what it meant, which is the same reason index.ts and works.ts sit at the root
import { readMachine } from './machine-read';
import { machinePart } from './machine-draw';
import { selfLockingLead } from './hold';
export { readMachine, type MachineWant } from './machine-read';
// the units themselves live in their own file now (ask/machine-units.ts); re-exported here for the same reason
export { screwAxis, beltAxis, beltStages, turnAxis, baseFrame, bedPlate, RAIL, HOT_END, SPINDLE, GRIPPER, SOLDER_HEAD, EYE, BRAIN, type Does, type Unit } from './machine-units';
import { screwAxis, beltAxis, beltStages, turnAxis, baseFrame, bedPlate, RAIL, NEMA17_NM, HOT_END, SPINDLE, GRIPPER, SOLDER_HEAD, EYE, BRAIN, type Does, type Unit } from './machine-units';


// ---- composing ----------------------------------------------------------------------------------------------------

/** One unit in a stack, with what it has to carry because of what is above it. */
export interface Mounted {
  unit: Unit; /** kg standing on its moving end, or — on an arm's joint — the N·m it has to hold */ carrying: number;
  /** what `carrying` is in: a stack is checked in kg and a joint in N·m, and printing one as the other is a lie */
  inUnit?: 'kg' | 'N·m';
  /** what is above it, by name */ above: string[];
  ok: boolean; why?: string;
}
/** A machine composed from units: what it is, what it reaches, what it costs, and what it cannot do. */
export interface Machine {
  asked: string; name: string; stages: Mounted[];
  /** how it is put together, which the words also say */ arrange: Arrangement;
  /** for an arm: the moment each joint has to hold straight out, against what it can be geared to */
  joints?: { at: string; needs: number; holds: number; ratio: number }[];
  /** its envelope: how far it moves in each of the three ways it slides, mm */ reach: number[];
  /** its mass, kg — or **null** where a part is not drawn, exactly as `usd` is null when a part is not priced: a
   *  machine whose bill is short has no mass to report, and 0 is not that (docs/MANNY.md #57) */ kg: number | null; holding: number; usd: number | null;
  /** lines with no price here, said rather than guessed */ unpriced: string[];
  /** what it affords, in the order the stack gives them */ does: Does[];
  /** what it will not do, each with the number that refuses it */ refusals: string[];
  /** parts the library does not draw by those words: a gap, never a stand-in */ gaps: string[];
  /** what the words said that nothing here consumed - the computed difference between the quantities in the ask and
   *  the quantities a part was sized by. Never a remembered list: a number dropped in silence puts itself here. */
  notDone: string[];
}

/** What a unit weighs: the sum of its drawn parts, kg. Parts bought whole are weighed where a price page gives one and
 *  otherwise left out of the sum and said — a mass that quietly invents the heavy half of a machine is worse than none. */
/** Every unit the library affords, at one representative size each, so that one list is the only list. `npm run
 *  machine -- units` printed its own copy of this and the gate had no way to check any of them; a unit added to one
 *  and not the other is the two-owners fault with nothing to catch it. */
export function everyUnit(): Unit[] {
  return [baseFrame(500, 500, 650), screwAxis(300), beltAxis(300), ...RATIOS.map((r) => turnAxis(r)), HOT_END, SPINDLE, GRIPPER, EYE, BRAIN];
}

export function unitKg(u: Unit): { kg: number; gaps: string[] } {
  let kg = 0; const gaps: string[] = [];
  for (const { words, n } of u.of) {
    const c = component(words);
    if (typeof c === 'string') { gaps.push(`${words}: ${c}`); continue; }
    kg += massOf(c.part) * n;
  }
  for (const b of u.bought ?? []) {
    if (b.kg == null) { gaps.push(`${b.what}: bought whole and its listing gives no weight, so it is not in this unit's ${kg.toFixed(2)} kg`); continue; }
    kg += b.kg * b.n;
  }
  return { kg: +kg.toFixed(3), gaps };
}

/** What a unit costs: each drawn part at its cheapest real offer, each bought line at what its listing said. */
export function unitUsd(u: Unit): { usd: number; unpriced: string[] } {
  let usd = 0; const unpriced: string[] = [];
  for (const { words, n, price } of u.of) {
    const got = price ? cheapest(price, n) : null;
    if (got) usd += got.usd; else unpriced.push(`${n} × ${words}`);
  }
  for (const b of u.bought ?? []) {
    const got = b.price ? cheapest(b.price, b.n) : null;
    if (got) usd += got.usd; else if (b.usd != null) usd += b.usd * b.n; else unpriced.push(`${b.n} × ${b.what}`);
  }
  return { usd: +usd.toFixed(2), unpriced };
}

/** Stack a machine: the frame at the bottom, the axes one on the next, and the tools bolted *side by side* to the
 *  moving end of the topmost axis. Two things here were faults in the first run of this file, and both are the kind a
 *  bill of materials hides: tools were stacked on each other, so a camera beside a gripper was asked to hold the
 *  gripper's load; and a payload was added to every stage alike, so the camera was carrying the 2 kg the gripper was
 *  holding. A payload hangs from whatever grips it, is checked against that grip, and is then carried by everything
 *  below it and by nothing above. */
/** Why a unit cannot be built at the size it was given, or null. Below the shortest length of stock the library will
 *  cut, so nothing orderable is refused. There are two stacking paths in this file — a frame with axes, and an arm of
 *  joints and links — and this is one rule called by both, because the fault it catches was that only one of them
 *  asked anything at all and the other pushed its links with `ok: true` unconditionally.
 *
 *  It asks only whether the thing HAS a size, not whether the catalogue sells one that small, and the difference is
 *  the point. The first version read `d >= 10`, which is the stock families' own floor retyped into `ask/` — the same
 *  fault as a bearing's mass copied out of the library into another file — and it was already wrong for a second
 *  family, since MGN rail refuses at 50. Worse, it is asked of all three dimensions, so `EYE.box = [25, 12, 24]`
 *  cleared it by 2 mm and the first genuinely small end-effector (a probe, a 0402 nozzle, a laser diode) would have
 *  been refused with "nothing is made at no size", which would be a lie. Zero is false for every family at every size
 *  for ever and needs no constant; a size the catalogue cannot cut is the family's own refusal to give, and that is
 *  #58's work, not this function's (docs/MANNY.md #74). */
/** THE ROUND TRIP: a unit orders a part by words, and this asks the library for it and reads back what it actually
 *  got. `extrusion 2020 3` returns `extrusion-2020-500` — a part 167 times longer than the line names — because a
 *  family that cannot make the size asked hands back its own example instead of refusing, silently, and the bill then
 *  names a thing nobody would ever receive.
 *
 *  It replaces a floor rather than tuning one: a floor here can only ever be one family's (MGN rail refuses at 50,
 *  extrusion at 10), and asking what came back needs none. docs/MANNY.md #75 has the whole argument. */
const ASKED_SIZE = /(?:^|\s)(\d+(?:\.\d+)?)\s*(?:mm)?$/;
export function wrongPart(words: string): string | null {
  const m = ASKED_SIZE.exec(words.trim());
  if (!m) return null;                                   // no size named: nothing to be substituted for
  let got = '';
  try { got = use(words).item ?? ''; } catch { return null; }   // an honest refusal is not a silent substitution
  if (!got) return null;
  return new RegExp(`(^|[^\\d])${m[1]}([^\\d]|$)`).test(got) ? null
    : `it orders "${words}" and the library hands back \`${got}\`, which is not that part: the family could not make the size asked and gave its own example instead, so this line names something nobody would receive`;
}

export function tooSmall(unit: Unit): string | null {
  const thin = unit.box.findIndex((d) => !(d > 0) || !Number.isFinite(d));
  if (thin >= 0) return `it is ${unit.box[thin]} mm across its ${'xyz'[thin]} axis, and nothing is made at no size: the ask gave it no span to be built at, so this is a refusal and not a small machine`;
  for (const o of unit.of) { const no = wrongPart(o.words); if (no) return no; }
  return null;
}

export function stack(frameUnit: Unit, axes: Unit[], tools: Unit[], payloadKg = 0): { stages: Mounted[]; kg: number; holding: number; refusals: string[]; gaps: string[] } {
  const refusals: string[] = [], gaps: string[] = [];
  const weigh = (u: Unit) => { const r = unitKg(u); gaps.push(...r.gaps); return r.kg; };
  const frameKg = weigh(frameUnit), axisKg = axes.map(weigh), toolKg = tools.map(weigh);
  const toolsKg = toolKg.reduce((a, b) => a + b, 0);
  const stages: Mounted[] = [];
  // A machine's mass is the machine. What it is holding is a *load*, not a part of it, and adding the two gave a
  // 1.39 kg arm holding a 3 kg brick a stated mass of 4.39 kg - which the forge then attributed to its 55 g servo.
  // Every stage still carries the payload, because that is what a stage has to hold up; only the total differs.
  const own = frameKg + axisKg.reduce((a, b) => a + b, 0) + toolsKg;
  const all = own + payloadKg;                 // the frame: everything stands on it, the load included
  // NOTHING MAY BE BUILT AT NO SIZE. A six-axis arm asked with "0.1 mm repeatability, 700 mm reach" read the
  // repeatability as the reach and composed two joints with two 0 mm links between them, ordered `extrusion 2020 0`,
  // reported "holds" at every stage because a zero load is held by anything, and priced the result $117.83. Every
  // check in this file asks whether a unit holds what is above it; not one asked whether the unit EXISTS. A span of
  // zero is not a small machine, it is a refusal, and it is caught here rather than in whatever read the words,
  // because the reading can be wrong in ways nobody has thought of yet and a part of no length is wrong always
  // (docs/MANNY.md #59).
  const push = (unit: Unit, carrying: number, above: string[]) => {
    // (the refusal is pushed by `composeMachine`'s `cannot` sweep, which walks every stage of every arrangement. #73
    //  deleted the duplicate writer in `armStack` and left this one, so the frame path reported twice where the arm
    //  path reported once — the same two-writers-one-list fault, half fixed. docs/MANNY.md #80.)
    const no = tooSmall(unit);
    if (no) { stages.push({ unit: { ...unit, cannot: no }, carrying: +carrying.toFixed(3), above, ok: false, why: no }); return; }
    const holds = unit.does === 'hold' || unit.carries >= carrying;
    const s: Mounted = { unit, carrying: +carrying.toFixed(3), above, ok: holds };
    if (!holds) { s.why = `it holds ${unit.carries} kg and ${carrying.toFixed(2)} kg stands on it (${unit.limit})`; refusals.push(`${unit.name}: ${s.why}`); }
    stages.push(s);
  };
  push(frameUnit, all - frameKg, [...axes, ...tools].map((u) => u.name));
  // each axis carries the axes above it, every tool, and whatever is being held
  for (let i = 0; i < axes.length; i++) {
    const aboveKg = axisKg.slice(i + 1).reduce((a, b) => a + b, 0) + toolsKg + payloadKg;
    push(axes[i]!, aboveKg, [...axes.slice(i + 1), ...tools].map((u) => u.name));
  }
  // a tool holds only what it is for: a gripper its grip, everything else nothing
  for (let i = 0; i < tools.length; i++) {
    const u = tools[i]!;
    if (u.does === 'grip' && payloadKg > 0) {
      const ok = u.lifts >= payloadKg;
      const s: Mounted = { unit: u, carrying: payloadKg, above: ['what it is holding'], ok };
      if (!ok) { s.why = `it grips ${u.lifts} kg and was asked to hold ${payloadKg} kg (${u.limit})`; refusals.push(`${u.name}: ${s.why}`); }
      stages.push(s);
    } else push(u, 0, []);
  }
  return { stages, kg: +own.toFixed(2), holding: +payloadKg.toFixed(2), refusals, gaps };
}

/** Which way a slide in a stack of this many runs: the last slide is up, the rest across. A stack's vertical axis is
 *  the one that has to *raise* what is above it, which is a different number from holding it. */
function liftCheck(stages: Mounted[]): string[] {
  const slides = stages.filter((s) => s.unit.does === 'slide');
  const up = slides[slides.length - 1]; if (!up) return [];
  return up.unit.lifts >= up.carrying ? []
    : [`${up.unit.name} raises ${up.unit.lifts} kg and would have to raise ${up.carrying.toFixed(2)} kg: give it a finer lead (a T8 × 2 raises four times as much at a quarter the speed) or a second motor`];
}

/** Compose an ask into a machine: the tool its words call for, the slides that carry it over the size asked, the frame
 *  under them and the brain beside them — then every stage checked against what stands on it. */
export function composeMachine(words: string): Machine {
  const want = readMachine(words);
  const [x, y, z] = want.mm;
  const tools: Unit[] = [];
  if (want.does.includes('deposit')) tools.push(HOT_END);
  if (want.does.includes('cut')) tools.push(SPINDLE);
  if (want.does.includes('solder')) tools.push(SOLDER_HEAD);
  if (want.does.includes('grip')) tools.push(GRIPPER);
  if (want.does.includes('see')) tools.push(EYE);
  if (want.does.includes('turn') && want.arrange !== 'arm' && want.arrange !== 'table') tools.push(turnAxis(3));
  // a cut takes force sideways, so its across axes are screws too; a tool that only has to be put somewhere gets
  // belts, which are five times as fast for the same motor
  const fast = !want.does.includes('cut');
  const slide = (mm: number) => (fast ? beltAxis(mm) : screwAxis(mm));

  let st: { stages: Mounted[]; kg: number; holding: number; refusals: string[]; gaps: string[] };
  let units: Unit[];
  let joints: Machine['joints'];
  if (want.arrange === 'arm') {
    // reach is the first number, and an arm's check is the moment at each joint, not the mass on a rail
    const a = armStack(x, tools, want.payload);
    st = a; joints = a.joints;
    units = [...a.stages.map((s) => s.unit), BRAIN];
  } else if (want.arrange === 'rail') {
    // one long slide bracketed to the wall, with a turn axis and the tool riding it: the rail *is* the mobility
    const mount = railMount(x), travel = slide(x), wrist = turnAxis(5);
    st = stack(mount, [travel], [wrist, ...tools], want.payload);
    units = [mount, travel, wrist, ...tools, BRAIN];
  } else if (want.arrange === 'table') {
    // the work turns under a tool brought in on one slide: a lathe, a wheel, a turntable
    const table = turnAxis(10), inFeed = screwAxis(y);
    st = stack(baseFrame(x + 200, y + 200, z + 200), [inFeed], tools, want.payload);
    st.stages.unshift({ unit: table, carrying: want.payload, above: ['the work on it'], ok: table.carries >= want.payload });
    units = [table, inFeed, ...tools, BRAIN];
  } else {
    // THE AXIS THAT LIFTS MUST HOLD WITH THE POWER OFF, and the lead that does is derived rather than typed.
    // Every Z axis here was a T8 × 8 — four starts, a 20.0° lead angle against a 9.1° friction angle — which
    // BACKDRIVES: the gantry drops the moment the current goes (Run 9c, `npm run machine -- hold 5kg 50mm
    // screw=8/7`). `selfLockingLead` asks what lead is inside the friction angle for a 7 mm mean T8 on brass and
    // answers 2 mm, the single start. It costs a quarter of the speed and gives four times the force at the nut.
    const axes = [slide(x), slide(y), screwAxis(z, selfLockingLead(7) ?? 2)];
    const bed = bedPlate(x, y);
    // THE FRAME IS AS TALL AS WHAT HANGS IN IT. `z + 350` was a constant, and a constant is a guess: at 300 × 180 ×
    // 45 it gave a 395 mm frame for a chain 648 mm long, so the drawing put the spindle above the frame's top rail
    // with the floor 300 mm under it. What hangs inside is the bottom rail the bed sits on, the bed, the tool at its
    // full drop, the column it rides and the beams that carry the column — the same five numbers the drawing hangs
    // them by (`machine-draw.ts`), so the two cannot disagree.
    const beams = axes.slice(0, -1).reduce((a, u) => a + u.box[1], 0), column = axes[axes.length - 1]!.box[0];
    const drop = tools.reduce((a, t) => Math.max(a, t.box[1]), 0);
    const fr = baseFrame(x + 200, y + 200, Math.max(z + 350, RAIL + bed.box[1] + drop + column + beams));
    st = stack(fr, axes, tools, want.payload);
    // the work surface goes in after the stack is checked, because it carries the WORK and not the machine: it is
    // weighed and gapped like every other unit (a bed whose sheet the library will not draw makes the total short,
    // the same as a beam would), and the frame's own load grows by it, since it is bolted to the frame.
    const bk = unitKg(bed); st.gaps.push(...bk.gaps); st.kg = +(st.kg + bk.kg).toFixed(2);
    const base = st.stages[0]!;
    st.stages[0] = { ...base, carrying: +(base.carrying + bk.kg).toFixed(3), above: [bed.name, ...base.above] };
    st.stages.splice(1, 0, { unit: bed, carrying: want.payload, above: ['the work clamped to it'], ok: bed.carries >= want.payload });
    units = [fr, bed, ...axes, ...tools, BRAIN];
  }
  const money = units.map((u) => unitUsd(u));
  const usd = +money.reduce((a, b) => a + b.usd, 0).toFixed(2);
  const refusals = [...st.refusals, ...(want.arrange === 'gantry' ? liftCheck(st.stages) : [])];
  if (want.payload > 0 && !tools.some((u) => u.does === 'grip')) refusals.push(`it was asked to hold ${want.payload} kg and nothing on it grips: say "picks up" and a gripper is composed in`);
  if (!want.does.length) refusals.push('nothing in those words says what the machine must *do*: name a tool (print, cut, solder, pick up, see, turn) and it is composed round it');
  // A GAP IS FATAL TO THE FIGURES THAT REST ON IT. A machine whose beam or rail the library refuses to draw used to
  // report a mass, a price and a bill of materials anyway, as confidently as one it had drawn - the refusal printed a
  // line and the numbers printed beside it, and nothing said the numbers were short by the very part that was missing.
  // That is a made-up figure wearing a sourced one's clothes, which theme 9 forbids outright. So where a part is not
  // drawn, the mass and the price it would have contributed are not known, and `kg`/`usd` say they are not known
  // rather than reporting the sum of what happened to be drawable.
  // a unit that says it cannot be built says so where the refusals are read, not only in its own sentence
  for (const m of st.stages) if (m.unit.cannot) refusals.push(`${m.unit.name}: ${m.unit.cannot}`);
  // WITHHELD for two reasons now, not one. A part the library does not draw makes a total INCOMPLETE; a unit that
  // cannot be built at all makes it FICTIONAL — and the arm went on reporting 1.53 kg and $117.83 for two motor
  // plates and sixteen fasteners belonging to a link whose own stage line said it could not exist. That is #57's
  // shape one commit after #57, which is the argument for asking the question where the predicate already is rather
  // than at each place that prints (docs/MANNY.md #72).
  const cannot = st.stages.filter((s) => s.unit.cannot);
  const short = st.gaps.length > 0 || cannot.length > 0;
  // "at the size the ask gave" was true of the only writer this clause had when it was written, and `tooSmall` is not
  // the only writer: `turnAxis` sets `cannot` for a reduction GT2 belt cannot carry, where the size was never the
  // problem. The sentence named one cause for a predicate with several — and the widening it brought (every
  // belt-overloaded machine now withholds, where the composed printer used to report 6.97 kg and $505.51) is right
  // and was shipped without being written down. So it says what is true of all of them, and each unit's own `cannot`
  // is already printed above it (docs/MANNY.md #76).
  if (cannot.length) refusals.push(`its mass and price are WITHHELD, not computed: ${cannot.length} unit${cannot.length === 1 ? '' : 's'} here cannot be built as composed (each says why above), so a total would be the weight and price of parts for a thing that cannot exist`);
  if (st.gaps.length) refusals.push(`its mass and price are WITHHELD, not computed: ${st.gaps.length} part${st.gaps.length === 1 ? ' is' : 's are'} not drawn by the library (above), so any total here would be the weight of what was drawable and not of the machine. Size those parts within what the library makes, or take the refusal as the answer`);
  return {
    asked: words, name: want.name, arrange: want.arrange, stages: st.stages, reach: want.mm,
    kg: short ? null : st.kg, holding: st.holding,
    usd: short ? null : (usd || null), unpriced: money.flatMap((m) => m.unpriced), does: [...new Set(units.map((u) => u.does))],
    refusals, gaps: st.gaps, notDone: want.notDone, ...(joints ? { joints } : {}),
  };
}

/** A machine written out: what it is made of, stage by stage, with what each carries and what it costs. */
export function machineText(m: Machine): string {
  const span = m.arrange === 'arm' ? `${m.reach[0]} mm of reach` : m.arrange === 'rail' ? `${m.reach[0]} mm of travel along it` : `${m.reach.join(' × ')} mm of travel`;
  const out = [`${m.name}, ${span}: ${m.stages.length + 1} units, ${m.kg == null ? 'nothing weighed here' : `${m.kg} kg`}${m.holding ? ` (holding ${m.holding} kg, which is a load and not part of it)` : ''}, ${m.usd == null ? 'nothing priced here' : `$${m.usd.toFixed(2)}`}.`];
  out.push(`It was composed, not copied: ${m.does.join(', ')} are the words, arranged as ${{ gantry: 'a gantry in a frame, because the tool has to get anywhere in a box', rail: 'one long rail, because what was asked for is travel along something', arm: 'a jointed arm, because what was asked for is reach', table: 'a turning table under a fixed tool' }[m.arrange]}.`);
  if (m.joints) for (const j of m.joints) out.push(`  ${j.at} holds ${j.holds} N·m geared ${j.ratio}:1 and has to hold ${j.needs} N·m straight out: ${j.holds >= j.needs ? 'holds' : 'NO'}`);
  for (const s of m.stages) {
    out.push(`  ${s.unit.name} — ${s.unit.says}`);
    out.push(`      carries ${s.carrying.toFixed(2)} ${s.inUnit ?? 'kg'}${s.above.length ? ` (${s.above.join(', ')})` : ' (nothing above it)'}: ${s.ok ? 'holds' : `NO — ${s.why}`}`);
    const parts = [...s.unit.of.map((p) => `${p.n} × ${p.words}`), ...(s.unit.bought ?? []).map((b) => `${b.n} × ${b.what} (bought: ${b.why})`)];
    out.push(`      ${parts.join('; ')}`);
  }
  if (m.unpriced.length) out.push(`No price here for: ${[...new Set(m.unpriced)].join(', ')}.`);
  if (m.gaps.length) out.push(`The library does not draw: ${[...new Set(m.gaps)].join('; ')}.`);
  if (m.refusals.length) out.push(`It will not:\n${m.refusals.map((r) => `  - ${r}`).join('\n')}`);
  // what the words said and nothing here used. Printed beside the refusals rather than under them, because a number
  // that was read and then dropped is a different fault from a number that refuses the machine, and the two were
  // indistinguishable while one of them was silent.
  if (m.notDone.length) out.push(`Said in the ask and NOT done here:\n${m.notDone.map((r) => `  - ${r}`).join('\n')}`);
  return out.join('\n');
}

/** Words in the room: "invent me a machine that prints 300 x 300", "an arm that reaches 600 mm and picks up 1 kg".
 *
 *  `stand` is how it gets drawn without this file knowing anything about the viewer: the room passes a way to put a
 *  part in front of you and a way to draw one from the library, and both are plain functions. A machine that is only
 *  a list of parts is the fault the user named — "why does everything look bogus" — so where the room can stand it,
 *  it stands. */
export function machineWords(text: string, o: { stand?: (p: Part, m: Machine) => string; use?: (words: string) => Part } = {}): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
  const asked = /^(invent|compose|design|make|build|stand|show) (me )?(a |an )?(machine|rig|thing|arm|hand|gantry|robotic hand)\b/.test(t)
    || /^(a|an) (machine|arm|rig|robotic hand) that /.test(t) || /^what would a machine that /.test(t);
  if (!asked) return null;
  const m = composeMachine(t);
  const said = machineText(m);
  if (!o.stand || !o.use) return said;
  try {
    const part = machinePart(m, o.use), drawn = massOf(part);
    // what is drawn is not what it weighs: a line bought whole (the spindle, the servo, the supply, the lead screw)
    // has a listing's mass and no drawing, so the room's own figure is always the lighter one. Say which is which
    // rather than let two numbers disagree on the same screen.
    const short = (m.kg ?? drawn) - drawn;
    return `${o.stand(part, m)}${short > 0.05 ? ` Standing: ${drawn.toFixed(2)} kg of it is drawn and ${short.toFixed(2)} kg is bought whole and has no drawing here (${m.stages.flatMap((s) => s.unit.bought ?? []).map((b) => b.what).join(', ') || 'its bought lines'}).` : ''}\n\n${said}`;
  } catch (e) { return `${said}\n\n(It is not standing in the room: ${(e as Error).message})`; }
}

// ---- how it is arranged, which is also the words' to say ------------------------------------------------------------
// The first run of this file always built the same thing: a frame with three slides stacked in it. That is a template
// wearing a composer's clothes — every ask came out a gantry, whatever it asked for. The arrangement is as much a part
// of what the words say as the tool is, and it changes which check even applies: a gantry is checked by *mass*, because
// what fails is a rail carrying what stands on it; an arm is checked by *torque*, because what fails is a joint holding
// a load out at the end of a link, and a joint that holds 1.2 N·m does not care that the load is only half a kilogram
// if it is half a kilogram 400 mm away.

/** How a machine is put together. Not a list of machines — a list of the shapes a stack can take. */
export type Arrangement =
  /** a frame with slides stacked in it: the tool goes anywhere in a box */ | 'gantry'
  /** one long slide, bracketed to a wall or a floor, with the tool riding it: the rail is the mobility */ | 'rail'
  /** a chain of turn axes with links between them: reach by angles, checked by torque */ | 'arm'
  /** the work turns under a fixed tool: a lathe, a wheel, a turntable */ | 'table';

/** A link between two joints of an arm: a length of 2020 extrusion with a plate at each end. */
export function armLink(mm: number): Unit {
  return {
    id: `arm-link-${mm}`, name: `a ${mm} mm link`, does: 'hold', range: 0,
    of: [{ words: `extrusion 2020 ${Math.round(mm / 50) * 50}`, n: 1 }, { words: 'motorplate nema17 t4 aluminium', n: 2 },
      { words: 'slotnut slot6 M5 hammer', n: 8 }, { words: 'bolt M5x12', n: 8 }],
    carries: 20, lifts: 0, speed: 0, limit: 'a 2020 section in bending over its own length, which is far more than any joint here can hold out at its end',
    box: [mm, 40, 40], says: `${mm} mm of 2020 extrusion with a motor plate bolted at each end`,
    src: 'the extrusion\'s own section from the library; it is never what fails on an arm this size, the joint is',
  };
}

/** The bracket that holds a rail to a wall or a floor, every 400 mm along it. */
export function railMount(mm: number): Unit {
  const n = Math.max(2, Math.round(mm / 400) + 1);
  return {
    id: `rail-mount-${mm}`, name: `${n} brackets along ${mm} mm`, does: 'hold', range: 0,
    of: [{ words: 'angle 40x4 steel 500mm', n }, { words: 'bolt M8x30', n: n * 2 }, { words: 'slotnut slot6 M5 hammer', n: n * 2 }, { words: 'bolt M5x12', n: n * 2 }],
    carries: 150, lifts: 0, speed: 0,
    limit: `${n} steel angle brackets at 400 mm centres into a wall: what holds is the wall and its fixings, which is not something this can know`,
    box: [mm, 60, 80], says: `${n} lengths of 40 × 4 steel angle at 400 mm centres, bolted through the wall and into the beam's slots`,
    src: 'the angle\'s own section from the library; its spacing is the usual 400 mm stud pitch, and what the wall itself holds is said rather than claimed',
  };
}

/** The ratios a turn axis is geared at, cheapest first: a GT2 pair does 3:1 easily, 5:1 and 10:1 with a bigger wheel,
 *  and past that it wants a second stage. The composer takes the first that holds, which is why nothing here asserts a
 *  joint's torque — it is chosen against the moment it actually has to hold. */
// Only ratios a belt can really give, in stages: 4:1 one stage, 16:1 two, 64:1 three. The old ladder went to 50:1
// on a single pair, which is a 1000-tooth pulley nobody makes.
const RATIOS = [3, 5, 10, 20, 50].filter((r) => beltStages(r) !== null);

/** An arm checked the way an arm fails: the moment at each joint with the arm straight out, against what that joint can
 *  be geared to hold. Fully extended and horizontal is the worst case and the one people build and then discover. */
export function armStack(reach: number, tools: Unit[], payloadKg = 0): { stages: Mounted[]; kg: number; holding: number; refusals: string[]; gaps: string[]; joints: { at: string; needs: number; holds: number; ratio: number }[] } {
  const refusals: string[] = [], gaps: string[] = [], joints: { at: string; needs: number; holds: number; ratio: number }[] = [];
  const weigh = (u: Unit) => { const r = unitKg(u); gaps.push(...r.gaps); return r.kg; };
  // upper arm and forearm: the usual split, longer nearer the base where the moment is worst
  const L = [Math.round(reach * 0.55), Math.round(reach * 0.45)] as const;
  const links = L.map((mm) => armLink(mm)), linkKg = links.map(weigh);
  const toolKg = tools.reduce((a, t) => a + weigh(t), 0);
  const endKg = toolKg + payloadKg;
  const stages: Mounted[] = [];
  // the moment at each joint, in metres, with everything beyond it held straight out
  const need = (i: number): number => {
    let nm = 0;
    for (let j = i; j < L.length; j++) {
      const toMid = L.slice(i, j).reduce((a, b) => a + b, 0) + L[j]! / 2;
      nm += linkKg[j]! * 9.80665 * (toMid / 1000);
    }
    return nm + endKg * 9.80665 * (L.slice(i).reduce((a, b) => a + b, 0) / 1000);
  };
  const NAMES = ['the shoulder', 'the elbow'];
  for (let i = 0; i < L.length; i++) {
    const nm = need(i);
    const delivers = (r: number) => { const st = beltStages(r); if (!st) return 0; return NEMA17_NM * st.reduce((a, x) => a * (x.driven / x.driver), 1) * 0.95 ** Math.max(1, st.length); };
    const ratio = RATIOS.find((r) => delivers(r) >= nm);
    const got = delivers(ratio ?? RATIOS[RATIOS.length - 1]!);
    const j = turnAxis(ratio ?? RATIOS[RATIOS.length - 1]!);
    joints.push({ at: NAMES[i] ?? `joint ${i + 1}`, needs: +nm.toFixed(2), holds: +got.toFixed(2), ratio: ratio ?? RATIOS[RATIOS.length - 1]! });
    const s: Mounted = { unit: { ...j, name: `${NAMES[i] ?? `joint ${i + 1}`}, geared ${ratio ?? RATIOS[RATIOS.length - 1]}:1` }, carrying: +nm.toFixed(2), inUnit: 'N·m', above: [...links.slice(i).map((l) => l.name), ...tools.map((t) => t.name)], ok: !!ratio };
    if (!ratio) {
      s.why = `${NAMES[i] ?? `joint ${i + 1}`} has to hold ${nm.toFixed(2)} N·m with the arm straight out and a NEMA 17 geared 50:1 by belt holds ${got.toFixed(2)}: shorten the link, take the load off with a counterbalance spring, or put a worm or cycloidal reducer there instead of a belt (which is where a cheap arm stops being cheap)`;
      refusals.push(s.why);
    }
    // (the refusal itself is pushed once, by the `cannot` sweep in `composeMachine`, which walks every stage of both
    //  arrangements. Pushing it here too printed it twice per link — four lines for two links, split around two
    //  unrelated refusals, so a reader counted four faults where there was one: two writers on one list, in the file
    //  whose own lint forbids a rule written twice. docs/MANNY.md #73.)
    const noLink = tooSmall(links[i]!);
    stages.push(s, { unit: noLink ? { ...links[i]!, cannot: noLink } : links[i]!, carrying: 0, above: [], ok: !noLink, ...(noLink ? { why: noLink } : {}) });
  }
  for (const u of tools) {
    const held = u.does === 'grip' ? payloadKg : 0, ok = u.does !== 'grip' || u.lifts >= payloadKg;
    const s: Mounted = { unit: u, carrying: held, above: held ? ['what it is holding'] : [], ok };
    if (!ok) { s.why = `it grips ${u.lifts} kg and was asked to hold ${payloadKg} kg (${u.limit})`; refusals.push(`${u.name}: ${s.why}`); }
    stages.push(s);
  }
  // the arm's own mass; what it holds is `holding` and is never added in (see the note in `stack`). Each joint's
  // moment above still includes the payload, which is the number that decides its gearing.
  const kg = linkKg.reduce((a, b) => a + b, 0) + toolKg + joints.reduce((a, j) => a + unitKg(turnAxis(j.ratio)).kg, 0);
  return { stages, kg: +kg.toFixed(2), holding: +payloadKg.toFixed(2), refusals, gaps, joints };
}

// `layUnit`, `machineParts` and `machinePart` moved to `./machine-draw` (drawing is not composing); re-exported
// here so every caller that had them from this file still does.
export { layUnit, machineParts } from './machine-draw';
export { machinePart };

// ---- the machine as a kit, so a composed machine can be LOOKED AT ------------------------------------------------
// This is one array entry, and its absence is why six rounds of review judged a picture of a 400 mm rail. Everything
// else was already here: `machinePart` turns a composed machine into placed parts and `view/works-room.ts` calls it.
// But `view/look.ts` picks its kit by id out of `KITS`, there was no `machine` id, so every ask fell through to the
// `part` kit - whose words-to-part lookup answers a sentence with its family's example. The numbers half of
// `manny-see` was reading `composeMachine` and the picture half was drawing an end cap, and nothing said so.
// Registered from here rather than from `parts/kits.ts` because a kit that composes a machine has to import `ask/`,
// and `parts/` importing `ask/` is the up-layer import the tidy lint forbids - the same reason `world/creatures.ts`
// registers its own. `view/look.ts` imports this module for the side effect, as it already does for creatures.
addKit({
  id: 'machine', name: 'machine', words: /\b(machine|gantry|arm|rail|robot|printer|router|mill|lathe|press|winder|feeder|conveyor|plotter|pick and place)\b/i,
  choices: [], saidWhole: true,
  says: 'a machine composed from the component library by what each unit affords, as `npm run machine` composes it: the same units, the same bill, the same refusals - drawn',
  build(c) {
    const words = String(c.said ?? '').trim();
    const m = composeMachine(words || 'a machine that picks things up');
    const p = machinePart(m, use);
    // What the composer REFUSED travels with the drawing, so a picture of a machine that cannot be built says so in
    // the same place `manny-see` and the look page already read (`lookReady.says`, and the stamp burnt into the PNG).
    const bad = [...m.refusals, ...m.gaps.map((g) => `not drawn: ${g}`)];
    return { ...p, says: `${bad.length ? `THIS MACHINE DOES NOT HOLD: ${bad[0]}${bad.length > 1 ? ` (and ${bad.length - 1} more)` : ''}. ` : ''}${p.says}` };
  },
});

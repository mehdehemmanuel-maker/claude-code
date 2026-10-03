// Ego: the assistant in the workshop. She needs no outside service, because the world she lives in is fully known:
// every part, material, joint, load and failure. So she can say exactly why something broke and what would have
// held, keep a Forge transcript of the build, learn your habits, and run what you type.
//
//   senses   the document (parts, joints, materials), live joint loads, physics events, what you hold and select
//   thinks   the engineering the physics runs on: connector capacities, the join planner, the fix search
//   acts     Forge statements, through the same commands as your tools (so all of it undoes)
//   learns   the habit graph: which action tends to follow which, on this headset
//
// See docs/EGO.md for what comes next (her body, the robot arm, the printer, an on-device language model).

import { ConstructionRefused } from '../ganglia/tree/gate';
import type { App } from '../app/app';
import type { PhysicsEvent } from '../physics/protocol';
import type { Change } from '../doc/store';
import type { Connection, Part, Pose, Vec3 } from '../doc/types';
import { getConnectorKind } from '../connectors/registry';
import { connectionGeometry } from '../connectors/through';
import { composePose, relativePose } from '../doc/math';
import { connectedComponent, deleteParts, duplicateParts, setFrozen, setPartPoses } from '../doc/commands';
import { effectiveParams, getPartKind, massOf } from '../parts/registry';
import { DISPLAY, defaultsOf, formatForce, type Params } from '../schema/params';
import { AUTO_JOIN } from '../connectors/plan';
import { run, type RunResult } from '../forge/forge';
import { AppHost } from '../forge/apphost';
import { understand } from './understand';
import { advance, guideOf, lessonFrom, type Lesson } from './lesson';
import { buildVisual } from '../render/geometry';
import { ghostMaterial } from '../render/materials';
import { placeFromWords } from '../world/place';
import { buildSwimmer, buildWalker, swimmerFromWords, WALKERS, walkerFromWords } from '../world/creature';
import { Herd } from '../world/herd';
import { POOL } from '../physics/environment';
import { TICK } from '../physics/world';
import { findQuantities, parseUnit, sameDim } from '../ganglia/units';
import type { ToolManager } from '../tools/tools';
import { fixesFor, MARGIN } from './fixes';
import { HabitGraph } from './habits';
import { HELP, interpret, type Intent } from './intent';
import { Growth, XP } from './growth';
import { findRepeat, nameFor, signatureOf, SkillBook, skillProgram } from './skills';
import { foresee } from './foresight';
import { ReportBook, troubleOf, type Trouble } from './reports';
import { design, type DesignSpec } from './designer';
import { categoryOf, Life } from './life';
import { Voice } from './voice';
import { resolveKind, resolveMaterial } from '../forge/catalog';
import { getMaterial } from '../data/materials';
import { engineer, engineeredReport, instantiate, type Engineered } from '../ganglia/manifold';
import { answerTraversal } from './traverse';
import { answerScale } from './scaleTalk';
import { substrateCensus } from '../ganglia';
import { anatomyOf, ARCHETYPES, archetypeByWord, asWhole, attempt, blockName, blocksByArchetype, breakdown, byMedium, CATEGORIES, census, challengeById, CHALLENGES, conceive, explore, FRONTIER, frontierById, frontierCensus, frontierReport, scaleCheck, explain, grow, lawById, nameOf, PRINCIPLES, principleName, recall, report, sensitivity, showWork, solve, workflowById } from '../ganglia';
import type { WorkflowResult } from '../ganglia/types';
import { describe as describeForm, genome, parseForm, type Form } from '../forms/form';
import { solid } from '../forms/mesh';
import { makeIn, routes } from '../forms/make';
import { formFromWords, invent, materialIn } from '../forms/say';

export interface Advice {
  id: string;
  kind: 'break' | 'warn' | 'tip';
  text: string;
  fixes: { label: string; apply: () => void }[];
}

/** Warn once a joint passes this share of its capacity; again only after it has eased below RESET. */
const WARN = 0.85;
/** Reports she files on her own in a session: past this a flaw is already written up many times over. */
const MAX_AUTO_REPORTS = 5;
const RESET = 0.6;
const MAX_ADVICE = 6;

export class Ego {
  readonly name = 'Ego';
  readonly habits: HabitGraph;
  readonly host: AppHost;
  readonly voice = new Voice();
  /** How far she has grown, and what she remembers of your choices. */
  readonly growth = new Growth();
  /** What she has taught herself from watching you. */
  readonly skills = new SkillBook();
  /** A run of your steps she's offered to learn, waiting for your answer. */
  private offered: string | null = null;
  /** What you've told her is wrong, kept for Claude. */
  readonly reports = new ReportBook();
  advice: Advice[] = [];
  /** This session's build, as Forge: every placement, joint and change you or she made. */
  journal: string[] = [];
  /** What her last commands did. */
  output: string[] = [];
  /** The command being typed on the tablet. */
  command = '';
  private warned = new Set<string>();
  /** Watchdog findings she has already acted on (each body and kind once, as the watchdog reports them). */
  private guarded = new Set<string>();
  /** Joints made since she last looked, and whether a look is on its way. */
  private newJoints = new Set<string>();
  private lookQueued = false;
  /** While she builds a design: she checks it whole when it's done. */
  private designing = false;
  private capacities = new Map<string, ReturnType<ReturnType<typeof getConnectorKind>['derive']>>();
  private autoReports = 0;
  private clock = 0;
  private seq = 0;

  constructor(private app: App, private tools: ToolManager | null, habits?: HabitGraph) {
    this.habits = habits ?? new HabitGraph();
    this.host = new AppHost(app, tools);
    app.store.subscribe((changes, source) => { if (source === 'do') this.record(changes); });
    // memory: Best join tries your usual joint for the pair first (it still has to hold)
    app.joinPreference = (a, b) => (this.growth.has('memory') ? this.growth.preferred(`join:${a.category}+${b?.category ?? 'floor'}`) : null);
    app.joinChosen = (a, b, kind) => this.growth.prefer(`join:${a.category}+${b?.category ?? 'floor'}`, kind);
    app.eventListeners.push((e) => this.onEvent(e));
    app.everyFrame('Ego', (dt) => this.tick(dt));
    this.herd = new Herd({
      // the world's own time: under load the physics slows rather than spirals, and a mind must slow with it
      time: () => app.live.ticks * TICK,
      pose: (id) => app.livePose(id),
      exists: (id) => !!app.doc.parts[id],
      you: () => this.host.viewer(),
      dry: (x, z) => { const w = app.waterLevel(); return w === null || app.groundAt(x, z) > w; },
      gait: (amplitude) => app.physics.send({ op: 'gait', amplitude }),
    });
  }

  /** The creatures she has put in the world, each with its mind. */
  readonly herd: Herd;

  // ---- acting -----------------------------------------------------------------------------------

  /** What she last worked out by a workflow, with its whole trace (for her page and a follow-up question). */
  lastWorked: { workflow: string; result: WorkflowResult } | null = null;
  /** The last contract engineered through the manifold language: what "build it" places. */
  lastEngineered: Engineered | null = null;

  /** Ask her something in plain words ("make it stronger", "weld these"); anything else is run as Forge. */
  ask(text: string): string {
    // drawing on the wall: what you say is about the drawing
    const draw = this.tools?.draw;
    if (draw && this.tools?.tool === draw) {
      const said = draw.hear(text);
      if (said) { this.output = [...this.output, `› ${text.slice(0, 80)}`, said].slice(-12); this.reply(said); return said; }
    }
    // your life: what to remember, remind you of, and where the money goes (all kept on this headset)
    const lifeSaid = this.life_(text);
    if (lifeSaid) { this.output = [...this.output, `› ${text.slice(0, 80)}`, lifeSaid].slice(-12); this.gain('ask'); this.reply(lifeSaid); return lifeSaid; }
    const intent = interpret(text);
    if (!intent) {
      const r = this.run(text);
      return r.error ?? r.lines[r.lines.length - 1] ?? '';
    }
    let reply: string;
    try {
      reply = this.act(intent);
      this.gain('ask');
    } catch (e) {
      reply = e instanceof Error ? e.message : String(e);
    }
    this.output = [...this.output, `› ${text.slice(0, 80)}`, reply].slice(-12);
    this.reply(reply);
    return reply;
  }

  /** Say it: on her page, in a message, and aloud. */
  reply(text: string) {
    this.app.toast(`${this.name}: ${text}`, 'info');
    this.voice.say(text);
    this.app.notify();
  }

  /** The selection's assembly, or what's held: what "it" and "this" mean. */
  private it(): string[] {
    const id = this.tools?.grab.holding ?? [...this.app.selection.parts][0];
    if (!id || !this.app.doc.parts[id]) throw new Error('Select it first: point at it with Grab and pull the trigger.');
    return this.app.component(id);
  }

  /**
   * A form made real: placed in front of you in a material something can make it in, with its mass and how it is made.
   * If nothing can make it (in the material asked for, or at all), it isn't placed (rule R11), and she says why.
   */
  private makeForm(f: Form, material: string | null, said: string): string {
    const all = routes(f), can = all.filter((r) => r.can);
    const opening = `${said[0]!.toUpperCase()}${said.slice(1)}.`;
    if (!can.length) return `${opening} But nothing I know can make it, so I won't place it: ${all.map((r) => `${r.process}: ${r.why}`).join('; ')}.`;
    if (material) {
      const r = makeIn(f, material);
      if (!r.can) return `${opening} But I can't make it in ${getMaterial(material).name.toLowerCase()}, so I won't place it: ${r.why}. ${can.map((x) => `${x.process} makes it in ${x.materials.join(' or ')}`).join('; ')}.`;
    }
    const pick = (cats: string[]) => cats.includes('polymer') ? 'polymer.nylon-microcarbon' : cats.includes('aluminum') ? 'aluminum.6061-t6' : cats.includes('steel') ? 'steel.1018-cd' : null;
    const mat = material ?? pick(can[0]!.materials) ?? pick(can.flatMap((r) => r.materials))!;
    const how = makeIn(f, mat);
    const s = solid(f);
    const id = this.host.place('form', { form: genome(f) }, mat, null, [], undefined);
    this.app.select([id]);
    return `${opening} ${(s.mass.volume * 1e6).toFixed(1)} cm³, ${(s.mass.volume * getMaterial(mat).density * 1000).toFixed(0)} g in ${getMaterial(mat).name.toLowerCase()}. Made by ${how.why}. It's in front of you.`;
  }

  private act(i: Intent): string {
    const app = this.app;
    switch (i.do) {
      case 'help': return HELP;
      case 'status': {
        const top = this.advice[0];
        return `${this.observe()}.${top ? ` ${top.text}` : ' Everything is holding.'}`;
      }
      case 'why': {
        const b = this.advice.find((a) => a.kind === 'break');
        return b ? b.text : 'Nothing has broken.';
      }
      case 'strengthen': {
        const a = this.advice.find((x) => x.fixes.length);
        if (a) { a.fixes[0]!.apply(); return `Done: ${a.fixes[0]!.label}.`; }
        // nothing failing: the most loaded joint in what you're pointing at gets twice its strength
        const ids = new Set(this.it());
        const joints = Object.values(app.doc.connections).filter((c) => ids.has(c.a.part) && c.state.status !== 'broken' && getConnectorKind(c.kind).model === 'rigid');
        if (!joints.length) return 'It has no joints to strengthen.';
        const c = joints.reduce((m, x) => ((app.live.loads.get(x.id)?.u ?? 0) > (app.live.loads.get(m.id)?.u ?? 0) ? x : m), joints[0]!);
        const mode = app.live.loads.get(c.id)?.mode ?? 'bending';
        const cap = this.capacity(c, mode) ?? 0;
        const fixes = cap > 0 ? this.fixes(c, mode, cap) : [];
        if (!fixes.length) return `The ${getConnectorKind(c.kind).label.toLowerCase()} is already as strong as these parts allow.`;
        fixes[0]!.apply();
        return `Done: ${fixes[0]!.label}.`;
      }
      case 'join': {
        const sel = [...app.selection.parts].filter((id) => app.doc.parts[id]);
        const held = this.tools?.grab.holding;
        const a = held ?? sel[0];
        if (!a) throw new Error('Select the part to join first.');
        const joint = i.joint === 'best' ? undefined : i.joint;
        if (i.floor) return this.host.join(a, null, joint);
        const mine = new Set(app.component(a));
        // the other part: a selected one not already joined to it, else whatever it touches
        const touching = (b: string) => { try { this.host.join(a, b, joint); return true; } catch { return false; } };
        const candidates = [...sel.filter((b) => !mine.has(b)), ...Object.keys(app.doc.parts).filter((b) => !mine.has(b))];
        for (const b of candidates) if (touching(b)) return `Joined ${app.doc.parts[a]!.name} and ${app.doc.parts[b]!.name}.`;
        return 'It isn\'t touching anything to join to. Set it against the other part first.';
      }
      case 'place': {
        const kind = resolveKind(i.kind);
        const material = resolveMaterial(kind, i.material);
        const ids: string[] = [];
        for (let k = 0; k < i.count; k++) ids.push(this.host.placeInRow(kind, material, k, i.count));
        app.select(ids);
        return `Placed ${i.count} ${getPartKind(kind).label.toLowerCase()}${i.count > 1 ? 's' : ''} in ${getMaterial(material).name}.`;
      }
      case 'freeze': case 'unfreeze': {
        const ids = this.it();
        app.commitLivePoses();
        setFrozen(app.store, ids, i.do === 'freeze');
        return `${i.do === 'freeze' ? 'Pinned' : 'Freed'} ${ids.length} part${ids.length === 1 ? '' : 's'}.`;
      }
      case 'delete': {
        const ids = this.it();
        deleteParts(app.store, ids);
        return `Removed ${ids.length} part${ids.length === 1 ? '' : 's'}. Undo brings ${ids.length === 1 ? 'it' : 'them'} back.`;
      }
      case 'duplicate': {
        const ids = this.it();
        app.commitLivePoses();
        const b = app.boundsOf(ids);
        const step = b.max[0] - b.min[0] + 0.05;
        let all: string[] = [];
        for (let k = 1; k <= i.count; k++) all = [...all, ...duplicateParts(app.store, ids, [step * k, 0, 0]).values()];
        app.select(all);
        return `Made ${i.count} cop${i.count === 1 ? 'y' : 'ies'}.`;
      }
      case 'template': {
        const e = app.saveTemplate(this.it());
        return e ? `Saved “${e.name}”. It's on My builds, Templates.` : 'Nothing to save.';
      }
      case 'command': {
        if (i.command === 'pause') { app.togglePause(); return app.settings.paused ? 'Paused.' : 'Running.'; }
        return `${this.host.command(i.command)}.`;
      }
      case 'skill': {
        if (!this.skills.skills.length) return 'I haven\'t learned any skills yet. Repeat something you build and I\'ll offer.';
        const n = Number(i.which);
        const sk = Number.isInteger(n) && n >= 1 ? this.skills.skills[n - 1] : this.skills.skills.find((x) => x.name.includes(i.which));
        if (!sk) return `I don't know a skill called ${i.which}. I know: ${this.skills.skills.map((x, k) => `${k + 1}. ${x.name}`).join('; ')}.`;
        return this.runSkill(sk.id);
      }
      case 'complain': return this.complain(i.words);
      case 'design': return this.designIt(i.spec, i.material);
      case 'ganglia': {
        const c = census();
        const sc = substrateCensus();
        return `I know ${c.laws} laws, ${c.processes} ways of making things, ${c.parts} parts you can buy, ${c.materials} materials, ${c.joints} kinds of joint, ${c.shapes} shapes of stock, ${c.machines} machine${c.machines === 1 ? '' : 's'} broken down, ${c.blocks} kinds of building block, ${c.principles} principles of why things are done as they are, and ${c.workflows} ways of working a design out, each with where it comes from. Under all of it is a substrate of ${sc.entities} things joined by ${sc.relations} arrows, ${sc.stubs} of them questions I have not answered yet. Ask me about any of them, ask me why, ask me every way to store energy or what makes the machines that make a motor, or ask me to size something: a drive, a wire, a battery, a shaft, a bearing.`;
      }
      case 'traverse': return answerTraversal(i);
      case 'scaling': return answerScale(i);
      case 'work': {
        const w = this.lastWorked;
        if (!w) return 'I haven\'t worked anything out yet. Ask me to size something.';
        const lines = showWork(w.result);
        return lines.length ? lines.join(' ') : 'That one was a choice from the catalogue, with no law to apply: its ratings decided it.';
      }
      case 'depends': {
        const w = this.lastWorked;
        if (!w || !w.result.trace.length) return 'I haven\'t worked anything out yet.';
        const all: { e: number; text: string }[] = [];
        for (const step of w.result.trace) {
          const law = lawById(step.law);
          if (!law) continue;
          for (const [sym, e] of Object.entries(sensitivity(step.law, step.inputs))) {
            const name = law.inputs.find((x) => x.sym === sym)?.name ?? sym;
            all.push({ e, text: `${name} in ${law.name.toLowerCase()} (1% more is ${Math.abs(e).toFixed(e % 1 ? 2 : 0)}% ${e > 0 ? 'more' : 'less'})` });
          }
        }
        all.sort((a, b) => Math.abs(b.e) - Math.abs(a.e));
        return all.length ? `It hangs most on ${all.slice(0, 3).map((x) => x.text).join('; ')}.` : 'Nothing in it depends on a number you can change.';
      }
      case 'breakdown': {
        const hit = recall(i.what, 1, ['machine'])[0] ?? recall(i.what, 1)[0];
        if (!hit) return `I don't know what's inside ${i.what} yet.`;
        if (hit.kind !== 'machine') return explain(hit);
        const lines = breakdown(hit.item);
        const unknown = lines.filter((l) => l.includes('[not published]')).length;
        return `${lines.join(' ')}${unknown ? ` (${unknown} of its sub-assemblies its maker doesn't detail: I won't guess them.)` : ''} Source: ${hit.item.source.cite}.`;
      }
      case 'reason': {
        const hits = recall(i.about, 3, ['principle']);
        if (!hits.length) {
          const any = recall(i.about, 1)[0];
          return any ? `I don't have a principle for that, but here is what I know: ${explain(any)}` : `I don't know why yet.`;
        }
        return `${explain(hits[0]!)}${hits.length > 1 ? ` Related: ${hits.slice(1).map(nameOf).join('; ')}.` : ''}`;
      }
      case 'principles': {
        if (i.of) {
          const cat = CATEGORIES.find((c) => c.includes(i.of!) || i.of!.includes(c));
          const ps = cat ? PRINCIPLES.filter((p) => p.category === cat) : recall(i.of, 4, ['principle']).map((k) => k.item as (typeof PRINCIPLES)[number]);
          if (!ps.length) return `I don't have principles about ${i.of} yet.`;
          return `${cat ? `On ${cat}` : `About ${i.of}`}: ${ps.map((p) => p.rule).join(' ')} Ask me why about any of them.`;
        }
        const by = CATEGORIES.map((c) => `${c} (${PRINCIPLES.filter((p) => p.category === c).map(principleName).join(', ')})`);
        return `I design by ${PRINCIPLES.length} principles, each with its reason, the laws behind it and where it comes from. By kind: ${by.join('; ')}. Ask "why …" about any of them, or "principles of fits and tolerances".`;
      }
      case 'blocks': {
        const have = blocksByArchetype();
        return `I build with ${ARCHETYPES.length} kinds of block, each known by what it does: ${ARCHETYPES.map((a) => `${blockName(a)} (${have[a.id]?.length ? `${have[a.id]!.length} in the catalogue` : a.shapes?.length ? 'made from stock' : 'put together from blocks'})`).join(', ')}. Any part is one of them; ask me about any.`;
      }
      case 'conceive': {
        const ways = conceive(i.from, i.to);
        const say = (f: string) => (f === 'electric' ? 'electric power' : f);
        if (!ways.length) return `I don't know a physical way from ${say(i.from)} to ${say(i.to)} yet.`;
        const groups = [...byMedium(ways)].map(([m, cs]) => {
          const best = cs[0]!;
          return `against ${m === 'reaction mass' ? 'mass it throws away' : m === 'none' ? 'nothing' : `the ${m}`}: ${best.ways.map((w) => w.name.toLowerCase()).join(' then ')}${best.buildable ? '' : ' (possible; not buildable here yet)'}`;
        });
        const now = ways.filter((c) => c.buildable).length;
        const motor = ways.every((c) => c.transducer) ? ' Every one of them needs a transducer, a motor in the widest sense; the rest depends on what it pushes against.' : '';
        return `${ways.length} ways to turn ${say(i.from)} into ${say(i.to)}, by what they push against. ${groups.join('; ')}.${motor} ${now} I can build here now. ${asWhole(ways[0]!).says}`;
      }
      case 'grow': {
        const spec = { mass: 120, wheelRadius: 0.125, speed: 3, motors: 2, ...i.spec };
        const g = grow({ from: i.from, to: i.to, spec });
        if (!g.best) {
          const p = g.possible[0];
          return p ? `I can't grow one here yet: the simplest way is ${p.concept.ways.map((w) => w.name.toLowerCase()).join(' then ')}, and I can't build ${p.missing.join(', ')} yet.` : `I know no way to turn ${i.from} into ${i.to}.`;
        }
        const b = g.best, f = b.fitness;
        const said = b.findings.filter((x) => x.level !== 'warning').slice(0, 3).map((x) => x.message);
        if (b.sized) this.lastWorked = { workflow: 'powertrain.design', result: b.sized };
        return `Grown from ${Object.entries(spec).map(([k, v]) => `${k} ${Number(v.toPrecision(3))}`).join(', ')} by ${b.concept.ways.map((w) => w.name.toLowerCase()).join(', then ')}: ${f.organs} blocks, ${f.parts} parts. ${anatomyOf(b).join('. ')}. Built in this order: ${b.order.map((o) => o.organ).join(', ')}.${said.length ? ` Not yet real: ${said.join('; ')}.` : ' Every part is real.'}${g.others.length ? ` I grew ${g.others.length} other${g.others.length > 1 ? 's' : ''} and kept the fittest.` : ''} ${g.possible.length} more ways are possible but not buildable here yet.`;
      }
      case 'challenge': {
        if (i.which) {
          const c = challengeById(i.which);
          return c ? report(attempt(c)) : `I don't have a challenge called ${i.which}.`;
        }
        const all = CHALLENGES.map((c) => attempt(c));
        return `I set myself ${all.length} hard challenges to find where I break: ${all.map((a) => `${a.challenge.name.toLowerCase()} (as far as ${a.best}, at worst ${a.worst})`).join('; ')}. Each miss is a thing to fix. Ask me for one, like "take the computer challenge".`;
      }
      case 'contract': {
        const r = engineer(i.contract);
        this.lastEngineered = r;
        const canPlace = r.candidates.find((k) => k.instantiable);
        return `${engineeredReport(r)}${canPlace ? ` Say "build it" and I place the lightest one I can make here (${canPlace.store.name}), or "build the ${canPlace.store.mechanism} one".` : ''}`;
      }
      case 'realize': {
        const r = this.lastEngineered;
        if (!r) return 'Nothing is engineered yet: tell me what to store, give out, work between, weigh under.';
        const pick = i.which ? r.candidates.find((k) => k.store.mechanism === i.which || k.store.names?.some((n) => n.toLowerCase().includes(i.which!)) || k.store.name.includes(i.which!)) : r.candidates.find((k) => k.instantiable) ?? r.chosen;
        if (!pick) return `I engineered no ${i.which ?? ''} way for that contract.`;
        const at = this.host.frontFloor(1.2);
        const out = instantiate(pick, this.app.store, [at[0], at[1], at[2]], [0, 0, 0, 1], `store${++this.seq}`);
        if ('refused' in out) return `${pick.store.name}: ${out.refused}.`;
        this.app.select(out.parts);
        return `${out.says}. Its path into the world: ${[...pick.steps, ...out.steps].map((x) => x.verb.toLowerCase().replace('_', ' ')).join(', ')}.`;
      }
      case 'frontier': {
        if (i.which) return frontierReport(explore(frontierById(i.which)!));
        const c = frontierCensus();
        return `I keep ${c.total} inventions past what is built as challenges: ${c.byLabel.made} have been made, ${c.byLabel.buildable} can be built from known physics, ${c.byLabel.research} wait on a discovery, and ${c.byLabel.relabelled} run into a law as said, so I relabel them to what meets the want. None ends at impossible. I can size ${c.byReach.blueprinted} whole myself and grow part of ${c.byReach.grown}; for the rest I have the path and what I learn next. Ask me for one, like "blueprint for gravity boots" (${FRONTIER.slice(0, 4).map((f) => f.name.toLowerCase()).join(', ')}...).`;
      }
      case 'scale': {
        const law = lawById(i.about.replace(/\s+/g, '.')) ?? (recall(i.about, 1, ['law'])[0]?.item as ReturnType<typeof lawById>);
        if (!law) return `I don't know a law called ${i.about}.`;
        const given = Object.fromEntries(findQuantities(i.words).flatMap((q) => { const inp = law.inputs.find((x) => sameDim(parseUnit(x.unit).dim, q.dim)); return inp ? [[inp.sym, q.si] as [string, number]] : []; }));
        const s = scaleCheck(law.id, { ...law.example.inputs, ...given });
        return s ? s.says : `${law.name} holds where it was measured: ${law.valid} I haven't written down the number that bounds it, or the law it is the limit of, yet: that is a gap in me.`;
      }
      case 'teach': return this.teach(i.spec, i.material);
      case 'want': {
        const u = understand(i.words);
        for (const a of u.acts) {
          if ('command' in a) this.host.command(a.command);
          else if ('timeScale' in a) app.setTimeScale(a.timeScale);
          else if ('playerScale' in a) { app.settings.playerScale = a.playerScale; app.notify(); }
          else if ('swimmer' in a) this.releaseSwimmer(a.swimmer);
          else if ('walker' in a) this.releaseWalker(a.walker);
          else { const p = a.place === null ? null : placeFromWords(a.place); if ((p?.id ?? null) !== (app.place?.id ?? null)) app.setPlace(p); }
        }
        return u.says;
      }
      case 'inside': {
        const a = archetypeByWord(i.what) ?? (recall(i.what, 1, ['block'])[0]?.item as (typeof ARCHETYPES)[number] | undefined);
        if (!a) return `I don't know what's inside ${i.what} yet.`;
        return `A ${blockName(a)} is a system of its own. ${a.inside.map((x) => `${x.name[0]!.toUpperCase()}${x.name.slice(1)}: ${x.does}${x.law ? ` (${lawById(x.law)?.name ?? x.law})` : ''}.`).join(' ')} Source: ${a.insideSource.cite}.`;
      }
      case 'shape': {
        let f: Form | null = null;
        try { f = i.words.trim().startsWith('{') ? parseForm(i.words) : formFromWords(i.words); } catch (e) { return `That isn't a form I can read: ${(e as Error).message}.`; }
        if (!f) return 'I couldn\'t read a shape in that. Say it with its sizes, like "a 40 mm sphere" or "a 60 mm cube filled with a gyroid lattice of 12 mm cells".';
        return this.makeForm(f, materialIn(i.words), describeForm(f));
      }
      case 'invent': {
        const inv = invent(i.words);
        if (!inv) return 'Tell me the job with its numbers: what it holds and how far, like "a bracket that holds 500 N at 120 mm from the wall" or "a beam spanning 400 mm that carries 2 kN in the middle".';
        const g = inv.grown, sizes = `${(inv.problem.nx * inv.problem.h * 1000).toFixed(0)} × ${(inv.problem.ny * inv.problem.h * 1000).toFixed(0)} × ${(inv.problem.t * 1000).toFixed(1)} mm`;
        const said = `I grew ${inv.job} from its loads, as bone grows: a ${sizes} plate, ${Math.round((1 - inv.problem.volfrac) * 100)}% of it taken away where it carried nothing. In ${getMaterial(inv.material).name.toLowerCase()} it carries the load at a safety factor of ${g.safety.toFixed(1)} on yield (peak stress ${(g.stress / 1e6).toFixed(1)} MPa) and deflects ${(g.deflection * 1000).toFixed(2)} mm.${inv.caution ? ` But ${inv.caution}.` : ''}`;
        return this.makeForm(inv.form, inv.material, said);
      }
      case 'recall': {
        const hits = recall(i.about, 3);
        if (!hits.length) return `I don't know anything about ${i.about} yet.`;
        return `${explain(hits[0]!)}${hits.length > 1 ? ` I also know: ${hits.slice(1).map(nameOf).join('; ')}.` : ''}`;
      }
      case 'engineer': {
        const w = workflowById(i.workflow);
        if (!w) return `I don't know how to work out ${i.workflow} yet.`;
        const { result: r, cached } = solve(w.id, i.spec);
        this.lastWorked = { workflow: w.id, result: r };
        void cached;
        const laws = [...new Set(r.trace.map((s) => lawById(s.law)?.name).filter(Boolean))];
        const assumed = w.asks.filter((a) => !(a.sym in i.spec) && a.default !== undefined).map((a) => `${a.name} ${a.default} ${a.unit}`);
        return `${r.summary}${r.warnings.length ? ` ${r.warnings.join(' ')}` : ''}${r.alternatives.length ? ` (${r.alternatives.length} other${r.alternatives.length > 1 ? 's' : ''} would do.)` : ''}${laws.length ? ` Worked out by ${laws.join(', ')}.` : ''}${assumed.length ? ` I took ${assumed.join(', ')}.` : ''}`;
      }
      case 'show': {
        const at = this.app.pointing?.();
        if (!at) return 'Point at it with your right hand, then tell me to look.';
        return this.show(at.id, at.point);
      }
      case 'level': {
        const l = this.growth.level, nx = this.growth.next;
        return `I'm level ${l.level}, with ${Math.floor(this.growth.xp)} experience.${nx ? ` At ${nx.xp} I'll be able to ${nx.learned.replace(/^I('ve| can| will|'ll)?\s*/i, '').toLowerCase()}` : ' I\'ve learned everything I can so far.'}`;
      }
    }
  }

  // ---- designing ------------------------------------------------------------------------------------

  /** Design what was asked, build it in front of you, and check it will hold. */
  designIt(spec: DesignSpec, materialWord?: string): string {
    const app = this.app;
    if (materialWord) spec.material = resolveMaterial('block', materialWord);
    const before = new Set(Object.keys(app.doc.parts));
    // a little further off than a single part, so the whole thing is in front of you
    const [x, , z] = this.host.frontFloor(1.2 + (spec.depth ?? 0.5) / 2);
    const plan = design(spec, x, z, `${spec.what}${++this.seq}-`);
    this.designing = true;
    let r: RunResult;
    try { r = run(plan.forge, this.host); } finally { queueMicrotask(() => { this.designing = false; }); }
    if (!r.ok) return `I couldn't build it: ${r.error}`;
    const made = Object.keys(app.doc.parts).filter((id) => !before.has(id));
    app.select(made);
    this.gain('template');
    const risks = this.forecast().filter((f) => made.includes(app.doc.connections[f.id]?.a.part ?? '') && f.u >= 0.8);
    const verdict = risks.length ? `But ${risks.length} joint${risks.length === 1 ? '' : 's'} will be near the limit: see my page.` : 'Every joint will carry its load with margin.';
    for (const f of risks.slice(0, 2)) { const c = app.doc.connections[f.id]!; this.say('warn', `In my design, the ${getConnectorKind(c.kind).label.toLowerCase()} joining ${this.names(c)} will carry ${Math.round(f.u * 100)}% of its ${f.mode} capacity.`, this.fixes(c, f.mode, f.load)); }
    return `${plan.notes.join(' ')} ${verdict}`;
  }

  /**
   * A swimmer into the water there is: the place's sea or lake, a few metres out and facing away from the shore, or the
   * workshop's pool. It swims only under physics, so the world is set running.
   */
  private releaseSwimmer(words: string) {
    const app = this.app, plan = swimmerFromWords(words);
    if (!plan) return;
    const water = app.place?.water ? { level: app.waterLevel()!, at: [0, 0, app.place.ground.shore - 6] as [number, number, number], heading: Math.PI / 2 }
      : { level: POOL.water, at: [POOL.x + plan.length * plan.segments / 2, 0, POOL.z] as [number, number, number], heading: 0 };
    try {
      buildSwimmer(app.store, plan, [water.at[0], water.level - plan.thickness, water.at[2]], water.heading, `${plan.name.split(' ').pop()}${++this.seq}`);
    } catch (e) {
      if (!(e instanceof ConstructionRefused)) throw e;
      this.say('warn', `I can't make ${plan.name}: ${e.refusal.name}: ${e.refusal.reason} (${e.refusal.law}).`, []);
      return;
    }
    if (app.settings.build) app.play();
  }

  /**
   * A walker on the ground a metre and a half in front of you, facing you, with a mind of its own: it comes to you,
   * goes to look at things, and rests when it is tired.
   */
  private releaseWalker(words: string) {
    const app = this.app, plan = walkerFromWords(words);
    if (!plan) return;
    const at = this.host.frontFloor(1.5), you = this.host.viewer();
    const heading = Math.atan2(-(you[2] - at[2]), you[0] - at[0]);
    const kind = Object.keys(WALKERS).find((k) => WALKERS[k] === plan) ?? 'walker';
    const tag = `${kind}${++this.seq}`;
    let w;
    try {
      w = buildWalker(app.store, plan, [at[0], at[1] + 0.003, at[2]], heading, tag);
    } catch (e) {
      if (!(e instanceof ConstructionRefused)) throw e;
      this.say('warn', `I can't make ${plan.name}: ${e.refusal.name}: ${e.refusal.reason} (${e.refusal.law}).`, []);
      return;
    }
    this.herd.add(`the ${kind}`, w, this.seq);
    if (app.settings.build) app.play();
  }

  /** The lesson you are on, if any. */
  lesson: Lesson | null = null;
  private lessonSaid = -1;

  /**
   * A lesson in building what she can design: designed in front of you, built first on her bench, then taught step
   * by step, each shown by a guide where the part goes and done only when it is done in your world.
   */
  teach(spec: DesignSpec, materialWord?: string): string {
    if (materialWord) spec.material = resolveMaterial('block', materialWord);
    const [x, , z] = this.host.frontFloor(1.2 + (spec.depth ?? 0.5) / 2);
    const plan = design(spec, x, z, `${spec.what}${++this.seq}-`);
    let l: Lesson;
    try { l = lessonFrom(`a ${spec.what}`, plan.forge, this.app.doc.sim); } catch (e) { return `I couldn't make a lesson of it: ${(e as Error).message}`; }
    this.lesson = l;
    this.lessonSaid = 0;
    const places = l.steps.filter((s) => s.do === 'place').length, joins = l.steps.filter((s) => s.do === 'join').length;
    return `Let's build ${l.name} together: ${places} parts to place, ${joins} joints, then a test. ${plan.notes[0] ?? ''} First: ${l.steps[0]!.says}`;
  }

  /** Move the lesson on by what you've done, say the next step, and show its guide. */
  private teachTick() {
    const l = this.lesson, app = this.app;
    if (!l) return;
    const p = advance(app, l, !app.settings.build, app.simTime);
    if (p.done.length && p.now && l.at !== this.lessonSaid) {
      this.lessonSaid = l.at;
      this.say('tip', `✓ Done. Next (${l.at + 1} of ${l.steps.length}): ${p.now.says}`, []);
    }
    const g = guideOf(l);
    if (g) {
      const kind = getPartKind(g.kind), m = app.materialOf(g);
      app.view.showGuide(`lesson:${g.id}`, () => buildVisual(kind.visual(effectiveParams(kind, g.params, m)), ghostMaterial, () => ghostMaterial), g.pose);
    } else app.view.showGuide('', null, null);
    if (p.finished) {
      this.say('tip', `You built ${l.name}, and it holds. That's the lesson done.`, []);
      this.gain('template');
      this.lesson = null;
      app.view.showGuide('', null, null);
    }
  }

  /** What every rigid joint will carry once gravity acts (the analysis behind foresight). */
  private forecast() {
    const app = this.app, doc = app.doc;
    const parts = Object.values(doc.parts).map((p) => {
      const k = getPartKind(p.kind), m = app.materialOf(p);
      const b = app.boundsOf([p.id]);
      return { id: p.id, mass: massOf(k, effectiveParams(k, p.params, m), m), com: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] as [number, number, number], grounded: p.frozen || b.min[1] <= 0.005 };
    });
    const joints = Object.values(doc.connections).filter((c) => c.state.status !== 'broken' && getConnectorKind(c.kind).model === 'rigid').map((c) => {
      const d = this.derived(c);
      const at = composePose(app.livePose(c.a.part) ?? doc.parts[c.a.part]!.pose, c.a.frame).p;
      return { id: c.id, a: c.a.part, b: c.b?.part ?? null, at, shear: d.capacities.shear, bending: d.capacities.bending };
    });
    return foresee(parts, joints, Math.hypot(...doc.sim.gravity));
  }

  // ---- the watchdog --------------------------------------------------------------------------------

  /**
   * What the watchdog catches is a realisation failing an obligation of a law (docs/LAW-TREE.md): a part through the
   * floor (F-3.5, transport), a pose that stopped being a number (A-4), a body flung from nowhere (ML-3). It is
   * evidence, never hers to put right: Ego has no hand on any body's pose or velocity (ML-4, ML-7), so a fault is the
   * kernel's to contain and hers to name, with the node it broke, and to write up for Claude with the build as it was.
   */
  private guard() {
    const app = this.app;
    for (const a of app.live.health) {
      const key = `${a.kind}:${a.id}`;
      if (this.guarded.has(key)) continue;
      this.guarded.add(key);
      const id = a.id.split('#')[0]!;
      const part = app.doc.parts[id];
      const name = part?.name ?? 'the scene';
      let trouble: Trouble = 'other';
      let node: string;
      switch (a.kind) {
        case 'fell': case 'tunnel': trouble = 'fell-through'; node = 'F-3.5 (nothing passes through a solid)'; break;
        case 'nonfinite': trouble = 'flung'; node = 'A-4 (every number stays a number)'; break;
        case 'flung': trouble = 'flung'; node = 'ML-3 (no energy without a source)'; break;
        case 'jitter': trouble = 'jitter'; node = 'ML-3 (no energy without a source)'; break;
        case 'slow': trouble = 'slow'; node = 'A-4 (the tick within its budget)'; break;
        case 'storage': trouble = 'other'; node = 'I7 (bounded storage)'; break;
        case 'drift': trouble = 'other'; node = 'F-3.1 (an intact joint stays closed)'; break;
        default: continue; // held-part findings are for the report page
      }
      const words = `(Ego saw it herself) ${a.kind} on ${name}: ${a.detail}`;
      // a report per finding while they're few; a storm of them is one flaw, already written up
      const filed = this.autoReports < MAX_AUTO_REPORTS;
      if (filed) {
        this.autoReports++;
        this.reports.add({ at: new Date().toISOString(), words, trouble, seen: [`watchdog ${a.severity}: ${a.detail}`, `obligation ${node}`, this.focus()], fixed: null, version: __BUILD__, physics: __PHYSICS__, build: app.doc.meta.name, shareCode: app.shareCode() });
      }
      const what = a.kind === 'jitter' ? `${name} is moving with no source of energy`
        : a.kind === 'slow' ? `Things are running slow: ${a.detail}`
        : a.kind === 'storage' ? `Saving: ${a.detail}`
        : a.kind === 'drift' ? `the joint on ${name} came apart while intact`
        : a.kind === 'fell' || a.kind === 'tunnel' ? `${name} went through the floor`
        : a.kind === 'flung' ? `${name} was flung faster than anything could throw it`
        : `${name} left the laws of physics`;
      this.say(a.severity === 'critical' ? 'warn' : 'tip', `👁 ${what}: the physics broke its own obligation ${node}. Nothing from this run counts as physics until that is fixed.${filed ? ' Written up for Claude.' : ''}`, []);
    }
  }

  // ---- your life ------------------------------------------------------------------------------------

  /** What you tell her to remember, to remind you of, and what you spend: kept on this headset only. */
  readonly life = new Life();

  /** Words about your life, if they are: what she says back (null when they're about something else). */
  private life_(text: string): string | null {
    const t = text.trim().replace(/^(hey |ok |okay )?ego[,:]?\s*/i, '');
    const lower = t.toLowerCase();
    const money = (x: number) => `$${x.toFixed(x % 1 ? 2 : 0)}`;
    if (/^(please )?remind me\b/i.test(t)) {
      const r = this.life.remind(t);
      if (!r) return 'When should I remind you? Say "in 20 minutes", "at 5 pm" or "tomorrow at 9".';
      const due = new Date(r.due);
      return `I'll remind you to ${r.what} at ${due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}${due.toDateString() !== new Date().toDateString() ? ` on ${due.toLocaleDateString([], { weekday: 'long' })}` : ''}, while the app is open.`;
    }
    if (/^(please )?(remember|note|don'?t forget)\b/i.test(t)) {
      const f = this.life.remember(t);
      return f ? `I'll remember: ${f.said}.` : 'Tell me it as "remember (that) X is Y", and I\'ll keep it.';
    }
    if (/\bbudget\b/.test(lower) && /set|make|give|my/.test(lower)) {
      const b = this.life.budget(t);
      if (b) return `Budget set: ${money(b.amount)} a week for ${b.category}.`;
    }
    if (/^(i )?(spent|paid|bought|got paid|earned|made|received|sold)\b|^\$\d/.test(lower)) {
      const m = this.life.spend(t);
      if (m) {
        const week = this.life.summary(startOfWeek());
        const over = week.over.find((o) => o.category === m.category);
        return `Noted: ${money(m.amount)} ${m.kind === 'earned' ? 'in' : `on ${m.category}`}. This week: ${money(week.spent)} out, ${money(week.earned)} in.${over ? ` That's over your ${m.category} budget (${money(over.spent)} of ${money(over.budget)}).` : ''}`;
      }
    }
    let m: RegExpExecArray | null;
    if ((m = /^how much (did i|have i) (spend|spent)(?: on (\w+))?(?: (this week|this month|today|last week))?/.exec(lower))) {
      const span = m[4] ?? 'this week';
      const from = span === 'today' ? startOfDay() : span === 'this month' ? startOfMonth() : span === 'last week' ? new Date(startOfWeek().getTime() - 7 * 864e5) : startOfWeek();
      const to = span === 'last week' ? startOfWeek() : new Date();
      const sum = this.life.summary(from, to);
      if (m[3]) { const cat = categoryOf(m[3]) === 'other' ? m[3] : categoryOf(m[3]); return `${span[0]!.toUpperCase()}${span.slice(1)} on ${m[3]}: ${money(sum.byCategory[cat] ?? 0)}.`; }
      const top = Object.entries(sum.byCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${money(v)}`).join(', ');
      return `${span[0]!.toUpperCase()}${span.slice(1)}: ${money(sum.spent)} out${top ? ` (${top})` : ''}, ${money(sum.earned)} in.`;
    }
    if (/^(what'?s|what is|what was|when'?s|when is|when was|where'?s|where is|who'?s|who is|do you remember|what did i (say|tell you))\b/.test(lower)) {
      const f = this.life.recall(t);
      if (f) return `You told me ${f.said}.`;
    }
    return null;
  }

  // ---- shown something ------------------------------------------------------------------------------

  /** What you showed her last: the part (or the spot), when, and how it moved while she watched (5 s). */
  shown: { id: string | null; point: Vec3; at: number; trail: { t: number; p: Vec3; v: number }[]; said: string } | null = null;

  /**
   * You pointed and said "look": she looks there, says what she sees, from the world's own state (what it is, how it
   * sits and moves, what holds it and how hard), and keeps watching it a few seconds, so what you tell her next comes
   * with what really happened.
   */
  show(id: string | null, point: Vec3): string {
    const said = id && this.app.doc.parts[id] ? this.describe(id) : `I'm looking at the spot you pointed at (${point.map((x) => x.toFixed(2)).join(', ')} m), but there's no part there.`;
    this.shown = { id: id && this.app.doc.parts[id] ? id : null, point, at: this.app.live.ticks, trail: [], said };
    this.gain('ask');
    return `${said} Tell me what's wrong with it, and I'll look into it.`;
  }

  /** One part as she sees it: what it is, where and how it moves, what holds it, and anything the watchdog saw. */
  describe(id: string): string {
    const app = this.app, p = app.doc.parts[id]!;
    const k = getPartKind(p.kind), m = app.materialOf(p);
    const mass = massOf(k, effectiveParams(k, p.params, m), m);
    const b = app.boundsOf([id]);
    const v = app.live.velocity(id)?.linear;
    const speed = v ? Math.hypot(v[0], v[1], v[2]) : 0;
    const bits = [`That's ${p.name}: ${k.label.toLowerCase()} in ${m.name}, ${mass < 1 ? `${Math.round(mass * 1000)} g` : `${mass.toFixed(1)} kg`}`];
    bits.push(p.frozen ? 'frozen in place' : this.tools?.grab.holding === id ? 'in your hand' : b.min[1] < 0.003 ? `on the floor${speed > 0.02 ? `, moving at ${speed.toFixed(2)} m/s` : ', still'}` : speed > 0.02 ? `${b.min[1].toFixed(2)} m up, moving at ${speed.toFixed(2)} m/s` : `${b.min[1].toFixed(2)} m up, still`);
    const joints = Object.values(app.doc.connections).filter((c) => (c.a.part === id || c.b?.part === id));
    if (joints.length) {
      const say = joints.slice(0, 3).map((c) => {
        const l = app.live.loads.get(c.id);
        return c.state.status === 'broken' ? `a broken ${getConnectorKind(c.kind).label.toLowerCase()}` : `${getConnectorKind(c.kind).label.toLowerCase()} at ${Math.round((l?.u ?? 0) * 100)}%${l?.mode ? ` of its ${l.mode}` : ''}`;
      });
      bits.push(`${joints.length} joint${joints.length === 1 ? '' : 's'}: ${say.join(', ')}`);
    } else bits.push('joined to nothing');
    const group = app.component(id);
    if (group.length > 1) bits.push(`part of an assembly of ${group.length}`);
    const T = app.live.temps.get(id);
    if (T !== undefined && Math.abs(T - 20) >= 0.01) bits.push(`${T.toFixed(T - 20 < 1 ? 2 : 1)} °C (${(T - 20).toFixed(2)} K above the room, from the work done on it)`);
    const seen = app.live.health.filter((a) => a.id.split('#')[0] === id).slice(-2).map((a) => `the watchdog saw it ${a.kind === 'jitter' ? 'shaking' : a.kind === 'fell' || a.kind === 'tunnel' ? 'go through the floor' : a.kind}`);
    return `${bits.join('; ')}.${seen.length ? ` ${seen.join(', ')}.` : ''}`;
  }

  /** While she watches what you showed her: where it is and how fast, each frame for five seconds. */
  private watchShown() {
    const w = this.shown;
    if (!w?.id) return;
    const t = (this.app.live.ticks - w.at) / 90;
    if (t > 5 || w.trail.length > 600) return;
    const pose = this.app.livePose(w.id), v = this.app.live.velocity(w.id)?.linear;
    if (pose) w.trail.push({ t, p: [...pose.p] as Vec3, v: v ? Math.hypot(v[0], v[1], v[2]) : 0 });
  }

  /** What she saw while watching it, in a line for the report. */
  private watched(): string | null {
    const w = this.shown;
    if (!w?.id || w.trail.length < 2) return null;
    const a = w.trail[0]!, z = w.trail[w.trail.length - 1]!;
    const moved = Math.hypot(z.p[0] - a.p[0], z.p[1] - a.p[1], z.p[2] - a.p[2]);
    const peak = Math.max(...w.trail.map((x) => x.v));
    // shaking: speed up and down while getting nowhere
    const turns = w.trail.slice(2).filter((x, i) => (x.v - w.trail[i + 1]!.v) * (w.trail[i + 1]!.v - w.trail[i]!.v) < 0 && x.v > 0.02).length;
    const name = this.app.doc.parts[w.id]?.name ?? 'it';
    return `watching ${name} for ${z.t.toFixed(1)} s: it moved ${(moved * 100).toFixed(1)} cm, rose ${((z.p[1] - a.p[1]) * 100).toFixed(1)} cm, peak speed ${peak.toFixed(2)} m/s${turns > 6 && moved < 0.02 ? `, speed reversing ${turns} times: shaking in place` : ''}`;
  }

  // ---- complaints -----------------------------------------------------------------------------------

  /**
   * You told her something's wrong. She notes what she saw at that moment, fixes what she can herself, and keeps a
   * report for Claude with the build as it was.
   */
  complain(words: string): string {
    const app = this.app;
    const trouble = troubleOf(words);
    const recent = app.live.health.filter((a) => app.live.ticks - a.at < 900);
    const name = (id: string) => (id ? app.doc.parts[id.split('#')[0]!]?.name ?? 'a part' : 'the scene');
    const shown = this.shown && app.live.ticks - this.shown.at < 90 * 60 ? this.shown : null;
    const seen = [
      ...(shown ? [`you showed me: ${shown.said}`, ...(this.watched() ? [this.watched()!] : [])] : []),
      ...recent.slice(-6).map((a) => `watchdog ${a.severity}: ${a.kind} on ${name(a.id)}: ${a.detail}`),
      ...this.advice.filter((a) => a.kind !== 'tip').slice(0, 3).map((a) => a.text),
      this.focus(),
      `${app.fps.toFixed(0)} fps, physics ${(app.live.stats?.stepMs ?? 0).toFixed(1)} ms a step, ${Object.keys(app.doc.parts).length} parts, ${Object.keys(app.doc.connections).length} joints, ${app.settings.build ? 'building' : 'playing'}`,
      // where the time goes, by subsystem and by physics section
      ...(trouble === 'slow' ? [
        `frame time: ${app.budget.breakdown().slice(0, 5).map(([k, v]) => `${k} ${v.toFixed(1)} ms`).join(', ') || 'not measured yet'}`,
        `physics tick: ${Object.entries(app.live.stats?.sections ?? {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v.toFixed(1)} ms`).join(', ')}; ${app.live.stats?.substeps ?? 1} substeps, ${app.live.stats?.magnetPairs ?? 0} magnetic pairs`,
      ] : []),
      ...(trouble === 'save' ? [`storage: ${(app.storageUsed() / 1e6).toFixed(2)} M of about 5 M characters used; ${app.library.list().length} builds, ${app.templates.list().length} templates`] : []),
    ];
    // what you showed her counts as what you mean
    const hints: { kind: string; id: string }[] = recent.map((a) => ({ kind: a.kind, id: a.id.split('#')[0]! }));
    // (shaking: she settles the part you showed her; anything else she checks against what she saw, not moves it)
    if (shown?.id) hints.push({ kind: trouble === 'jitter' ? 'jitter' : 'shown', id: shown.id });
    const fixed = this.selfFix(trouble, hints);
    this.reports.add({ at: new Date().toISOString(), words, trouble, seen, fixed, version: __BUILD__, physics: __PHYSICS__, build: app.doc.meta.name, shareCode: app.shareCode() });
    this.gain('ask');
    const n = this.reports.unsent.length;
    return `${fixed ? `I ${fixed}. ` : ''}I've written it up for Claude with what I saw and the build as it was (${n} report${n === 1 ? '' : 's'} to send, on my page).`;
  }

  /** What she can do about it herself, and what she did (null when it's one for Claude). */
  private selfFix(trouble: Trouble, recent: { kind: string; id: string }[]): string | null {
    const app = this.app;
    switch (trouble) {
      // a part through the floor or shaking in place is the physics failing an obligation (F-3.5, ML-3): not hers to
      // hide by moving or stilling it (she has no hand on any pose or velocity); the kernel contains it, she reports it
      case 'fell-through':
      case 'jitter':
        return null;
      case 'flung':
        if (app.canStop) { app.stop(); return 'took you back to the build as it was'; }
        if (app.checkpoints.length) { app.rewind(); return 'rewound to your last checkpoint'; }
        return null;
      case 'broke': {
        const a = this.advice.find((x) => x.kind === 'break' && x.fixes.length);
        if (!a) return null;
        a.fixes[0]!.apply();
        return `fitted a stronger joint: ${a.fixes[0]!.label.replace(/\s*\(.*\)$/, '')}`;
      }
      case 'slow': {
        const s = app.settings;
        if (!s.shadows && !s.particles) return null;
        s.shadows = false;
        s.particles = false;
        app.view.sun.castShadow = false;
        app.notify();
        return 'turned off shadows and particles to speed things up';
      }
      case 'save': {
        // try it again, and say exactly what happened
        const before = app.library.list().length;
        const entry = app.saveBuild();
        if (!entry) return null;
        return `saved it again as “${entry.name}” (${app.library.list().length > before ? 'a new build' : 'over the one you had open'}), and it read back whole`;
      }
      case 'stuck':
        if (!this.tools?.grab.holding) return null;
        this.tools.grab.release();
        return 'let go of what you were holding';
      default:
        return null;
    }
  }

  // ---- growing ----------------------------------------------------------------------------------

  /** Experience for something done together; a new level brings a new ability, and she says so. */
  gain(what: keyof typeof XP) {
    for (const l of this.growth.earn(XP[what])) {
      this.say('tip', `🌱 Level ${l.level}: ${l.learned}`, []);
    }
  }

  /** Run a learned skill a metre in front of you. */
  runSkill(id: string): string {
    const sk = this.skills.skills.find((x) => x.id === id);
    if (!sk) return 'I don\'t have that skill.';
    const [x, , z] = this.host.frontFloor();
    const prefix = `${sk.name.split(',')[0]!.trim()}-${++this.seq}-`;
    const r = run(skillProgram(sk, x, z, prefix), this.host);
    if (!r.ok) return r.error ?? 'That skill didn\'t work here.';
    this.skills.used(id);
    this.gain('skillUsed');
    return `Done: ${sk.name}.`;
  }

  /** You repeated something: offer to learn it (once per kind of thing). */
  private noticeRepeats() {
    if (!this.growth.has('skills') || this.offered) return;
    const lines = findRepeat(this.journal);
    if (!lines) return;
    const sig = signatureOf(lines);
    if (this.skills.knows(sig)) return;
    this.offered = sig;
    const name = nameFor(lines);
    this.say('tip', `I noticed you do this often: ${name}. Shall I learn it as a skill?`, [
      { label: '🧠 Learn it', apply: () => { const sk = this.skills.learn(lines); this.offered = null; this.dismissTips(); if (sk) { this.gain('skillLearned'); this.reply(`Learned: ${sk.name}. Ask me to do it, or tap it under Skills.`); } } },
      { label: 'No thanks', apply: () => { this.skills.decline(sig); this.offered = null; this.dismissTips(); } },
    ]);
  }

  private dismissTips() {
    this.advice = this.advice.filter((a) => a.kind !== 'tip' || !a.text.startsWith('I noticed'));
    this.app.notify();
  }

  /**
   * Foresight: what every joint will carry once gravity acts, from the load path to the ground. Joints that would
   * fail, or come close, are said before they do. `on` says why she's looking.
   */
  foresee(on: 'play' | 'joint', only?: Set<string>) {
    if (!this.growth.has(on === 'play' ? 'foresight' : 'initiative')) return [];
    const doc = this.app.doc;
    const found = this.forecast().filter((f) => (only ? only.has(f.id) : true) && f.u >= (on === 'play' ? 0.8 : 0.6));
    for (const f of found.slice(0, 3)) {
      const c = doc.connections[f.id]!;
      const unit = f.mode === 'bending' ? 'N·m' : 'N';
      const val = (x: number) => (unit === 'N' ? formatForce(x) : `${x.toFixed(1)} N·m`);
      const verdict = f.u >= 1 ? 'will fail' : 'will be close to failing';
      this.say('warn', `${on === 'play' ? 'Before it runs: ' : ''}the ${getConnectorKind(c.kind).label.toLowerCase()} joining ${this.names(c)} ${verdict}. It will carry ${val(f.load)} of ${f.mode} on a ${val(f.capacity)} capacity.`, this.fixes(c, f.mode, f.load));
    }
    return found;
  }

  /** A joint's capacities as built (fully cured), worked out once for each joint as it is. */
  private derived(c: Connection) {
    const { a, b, g } = this.geometry(c);
    const key = `${c.kind}|${JSON.stringify(c.params)}|${a.id}|${b?.id ?? ''}|${g.thicknessA}|${g.thicknessB}|${g.bondW}|${g.bondL}|${JSON.stringify(g.through)}`;
    const hit = this.capacities.get(key);
    if (hit) return hit;
    const d = getConnectorKind(c.kind).derive({ params: c.params, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: g.thicknessB, through: g.through, distance: 0, cure: 1e12 });
    if (this.capacities.size > 4000) this.capacities.clear();
    this.capacities.set(key, d);
    return d;
  }

  /** Run Forge: typed on the tablet, or a suggestion. */
  run(src: string): RunResult {
    const r = run(src, this.host);
    this.output = [...this.output, `› ${src.replace(/\s+/g, ' ').slice(0, 80)}`, ...r.lines, ...(r.error ? [`✗ ${r.error}`] : [])].slice(-12);
    if (r.error) this.app.toast(`${this.name}: ${r.error}`, 'warn');
    else if (r.lines.length) this.app.toast(`${this.name}: ${r.lines[r.lines.length - 1]}`, 'ok');
    this.app.notify();
    return r;
  }

  /** What she suggests doing next, from your habits: ready-to-use tools, one tap each. */
  suggestions(): { label: string; run: () => void }[] {
    const out: { label: string; run: () => void }[] = [];
    if (!this.growth.has('habits')) return out;
    for (const { token } of this.habits.predict(8)) {
      const [verb, what] = token.split(':');
      if (verb === 'place' && what) {
        try {
          const k = getPartKind(what);
          out.push({ label: `＋ ${k.label}`, run: () => { this.app.spawnKind = what; this.tools?.byId('place'); this.app.notify(); } });
        } catch { /* a kind no longer in the catalog */ }
      } else if (verb === 'join' && what) {
        const label = what === AUTO_JOIN ? 'Best join' : (() => { try { return getConnectorKind(what).label; } catch { return null; } })();
        if (label) out.push({ label: `🔩 ${label}`, run: () => { this.app.joinKind = what; this.tools?.byId('join'); this.app.notify(); } });
      }
      if (out.length >= 4) break;
    }
    return out;
  }

  // ---- sensing ----------------------------------------------------------------------------------

  /** A line on what she sees. */
  observe(): string {
    const doc = this.app.doc;
    const parts = Object.keys(doc.parts).length;
    const conns = Object.values(doc.connections);
    let worst: { c: Connection; u: number } | null = null;
    for (const c of conns) {
      if (c.state.status === 'broken') continue;
      const u = this.app.live.loads.get(c.id)?.u ?? 0;
      if (!worst || u > worst.u) worst = { c, u };
    }
    const broken = conns.filter((c) => c.state.status === 'broken').length;
    const bits = [`${parts} part${parts === 1 ? '' : 's'}`, `${conns.length} joint${conns.length === 1 ? '' : 's'}`];
    if (broken) bits.push(`${broken} broken`);
    if (worst && worst.u > 0.01) bits.push(`most loaded: ${getConnectorKind(worst.c.kind).label} at ${Math.round(worst.u * 100)}%`);
    return bits.join(' · ');
  }

  /** What you're working on: held, else selected. */
  focus(): string {
    const id = this.tools?.grab.holding ?? [...this.app.selection.parts][0];
    const p = id ? this.app.doc.parts[id] : null;
    if (!p) return 'Nothing in hand or selected';
    return `${this.tools?.grab.holding ? 'Holding' : 'Selected'}: ${p.name} (${this.app.materialOf(p).name})`;
  }

  private onEvent(e: PhysicsEvent) {
    if (e.type !== 'break') return;
    const c = this.app.doc.connections[e.conn];
    if (!c) return;
    const fixes = this.fixes(c, e.mode, e.load);
    const unit = e.mode === 'bending' || e.mode === 'torsion' ? 'N·m' : 'N';
    const load = unit === 'N' ? formatForce(e.load) : `${e.load.toFixed(1)} N·m`;
    const why = e.mode === 'instant' ? e.note : `${e.mode} reached ${load}, over its ${unit === 'N' ? formatForce(e.capacity) : `${e.capacity.toFixed(1)} N·m`} capacity`;
    this.say('break', `The ${getConnectorKind(c.kind).label.toLowerCase()} joining ${this.names(c)} broke: ${why}.`, fixes);
  }

  /** Near failure: warn once per joint, with what would carry it. */
  private tick(dt: number) {
    this.herd.tick();
    this.teachTick();
    this.watchShown();
    this.clock += dt;
    if (this.clock < 0.5) return;
    this.clock = 0;
    this.guard();
    for (const r of this.life.due()) { this.say('tip', `⏰ Reminder: ${r.what}.`, []); this.app.toast(`${this.name}: ⏰ ${r.what}`, 'info'); }
    for (const c of Object.values(this.app.doc.connections)) {
      const l = this.app.live.loads.get(c.id);
      if (!l || c.state.status === 'broken') continue;
      if (l.u < RESET) { this.warned.delete(c.id); continue; }
      if (l.u < WARN || this.warned.has(c.id)) continue;
      this.warned.add(c.id);
      const cap = this.capacity(c, l.mode);
      const fixes = cap ? this.fixes(c, l.mode, l.u * cap) : [];
      this.say('warn', `Heads up: the ${getConnectorKind(c.kind).label.toLowerCase()} joining ${this.names(c)} is at ${Math.round(l.u * 100)}% of its ${l.mode} capacity.`, fixes);
    }
  }

  private say(kind: Advice['kind'], text: string, fixes: Advice['fixes']) {
    this.advice = [{ id: `a${++this.seq}`, kind, text, fixes }, ...this.advice].slice(0, MAX_ADVICE);
    this.voice.say(fixes.length ? `${text} I can fix it: ${fixes[0]!.label.replace(/\(.*\)/, '')}.` : text);
    this.app.notify();
  }

  dismiss(id: string) {
    this.advice = this.advice.filter((a) => a.id !== id);
    this.app.notify();
  }

  // ---- engineering --------------------------------------------------------------------------------

  private geometry(c: Connection) {
    const pa = this.app.doc.parts[c.a.part]!, pb = c.b ? this.app.doc.parts[c.b.part] ?? null : null;
    return {
      a: this.app.materialOf(pa), b: pb ? this.app.materialOf(pb) : null,
      g: connectionGeometry(this.app.doc, c, (p) => this.app.materialOf(p)),
    };
  }

  private capacity(c: Connection, mode: string) {
    const { a, b, g } = this.geometry(c);
    const d = getConnectorKind(c.kind).derive({ params: c.params, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: g.thicknessB, through: g.through, distance: 0, cure: 1e12 });
    return (d.capacities as unknown as Record<string, number>)[mode] ?? null;
  }

  private fixes(c: Connection, mode: string, load: number): Advice['fixes'] {
    if (getConnectorKind(c.kind).model !== 'rigid') return [];
    const { a, b, g } = this.geometry(c);
    return fixesFor({ kind: c.kind, params: c.params, mode, load }, a, b, g).map((f) => ({
      label: `${f.label} (holds ${mode === 'bending' || mode === 'torsion' ? `${f.capacity.toFixed(0)} N·m` : formatForce(f.capacity)}, ${MARGIN}× the load)`,
      apply: () => this.applyFix(c.id, f.kind, f.params),
    }));
  }

  /**
   * Put the fix in. After Play: back to the build with the joint changed, to try again. Otherwise the loose piece (and
   * whatever is still fixed to it) is set back where the joint holds it, and refastened, as a person would.
   */
  applyFix(connId: string, kind: string, params: Params) {
    const app = this.app;
    if (app.canStop) app.stop();
    const c = app.doc.connections[connId];
    if (!c) return;
    const broken = c.state.status === 'broken';
    app.store.transact(`${this.name}: fix joint`, (tx) => {
      tx.update('connections', connId, { kind, params, state: { ...c.state, status: 'intact', note: '' } });
    });
    if (broken && !app.settings.build && c.b) this.reseat(c);
    this.advice = this.advice.filter((x) => !x.fixes.length || x.text.indexOf(this.names(c)) < 0);
    this.gain('fix');
    app.toast(`${this.name}: ${getConnectorKind(kind).label} fitted${app.settings.build ? ' — press Play to try it' : ''}`, 'ok');
    app.notify();
  }

  /** B's side back where the joint holds it on A: B's frame onto A's, the rest of its assembly moved with it. */
  private reseat(c: Connection) {
    const live = (id: string) => this.app.livePose(id) ?? this.app.doc.parts[id]!.pose;
    const aWorld = composePose(live(c.a.part), c.a.frame);
    const bNow = live(c.b!.part);
    const bWant: Pose = composePose(aWorld, relativePose(c.b!.frame, { p: [0, 0, 0], q: [0, 0, 0, 1] }));
    const group = connectedComponent(this.app.doc, c.b!.part);
    if (group.has(c.a.part)) return; // still joined to A some other way: nothing to put back
    const poses = new Map<string, Pose>();
    for (const id of group) poses.set(id, composePose(bWant, relativePose(bNow, live(id))));
    setPartPoses(this.app.store, poses, `${this.name}: set it back`);
  }

  private names(c: Connection) {
    const n = (id: string) => this.app.doc.parts[id]?.name ?? 'a part';
    return c.b ? `${n(c.a.part)} and ${n(c.b.part)}` : `${n(c.a.part)} to the floor`;
  }

  // ---- the journal and the habits ------------------------------------------------------------------

  /** Your build actions, as Forge, and as habits. */
  private record(changes: Change[]) {
    const doc = this.app.doc;
    const slug = (s: string) => s.replace(/\s+/g, '-');
    for (const ch of changes) {
      if (ch.op === 'create' && ch.coll === 'parts') {
        const p = ch.value as unknown as Part;
        this.note(`place ${p.kind}${paramText(p.kind, p.params)} mat ${p.material} at ${p.pose.p.map((x) => x.toFixed(3)).join(' ')} as ${slug(p.name)}`, `place:${p.kind}`);
      } else if (ch.op === 'create' && ch.coll === 'connections') {
        const c = ch.value as unknown as Connection;
        const n = (id: string) => slug(doc.parts[id]?.name ?? id);
        this.note(`join ${n(c.a.part)} ${c.b ? n(c.b.part) : 'floor'} with ${c.kind}`, `join:${this.app.joinKind === AUTO_JOIN ? AUTO_JOIN : c.kind}`);
        // initiative: a joint that won't hold is said as it's made, not when it breaks. A burst of joints (a script,
        // a template, a design) is looked at once, when it's done, not once per joint
        this.newJoints.add(c.id);
        if (!this.lookQueued) {
          this.lookQueued = true;
          queueMicrotask(() => {
            this.lookQueued = false;
            const ids = new Set(this.newJoints);
            this.newJoints.clear();
            if (!this.designing) this.app.budget.measure("Ego's foresight", () => this.foresee('joint', ids));
          });
        }
      } else if (ch.op === 'update' && ch.coll === 'parts') {
        const p = doc.parts[ch.id];
        if (!p) continue;
        if ('material' in ch.fields) this.note(`set ${slug(p.name)} mat ${p.material}`, 'set:mat');
        if ('params' in ch.fields) {
          const before = (ch.fields['params']!.before ?? {}) as Params;
          for (const [k, v] of Object.entries(p.params)) if (JSON.stringify(before[k]) !== JSON.stringify(v)) this.note(`set ${slug(p.name)} ${k}=${fmt(p.kind, k, v)}`, `set:${k}`);
        }
      } else if (ch.op === 'delete' && ch.coll === 'parts') {
        this.note(`delete ${slug(String((ch.value as { name?: string }).name ?? ch.id))}`, 'delete');
      }
    }
  }

  private note(line: string, token: string) {
    this.journal.push(line);
    if (this.journal.length > 500) this.journal.shift();
    if (this.growth.has('habits')) this.habits.see(token);
    this.gain(token.startsWith('join:') ? 'joint' : 'action');
    this.noticeRepeats();
  }

  /** The session as text you can paste to Claude (or anyone): the Forge transcript and the build's share code. */
  forClaude(): string {
    return [`# ${this.app.doc.meta.name} — Forge transcript`, ...this.journal, '', `# share code (opens the exact build)`, this.app.shareCode()].join('\n');
  }
}

/** A part's parameters that differ from its kind's defaults, in Forge with units. */
function paramText(kindId: string, params: Params) {
  const kind = getPartKind(kindId);
  const d = defaultsOf(kind.params);
  const bits = Object.entries(params).filter(([k, v]) => JSON.stringify(d[k]) !== JSON.stringify(v)).map(([k, v]) => `${k}=${fmt(kindId, k, v)}`);
  return bits.length ? ` ${bits.join(' ')}` : '';
}

const FORGE_UNITS: Record<string, [string, number]> = { mm: ['mm', 1000], cm: ['cm', 100], m: ['m', 1], kg: ['kg', 1], g: ['g', 1000], N: ['N', 1], kN: ['kN', 1e-3], '%': ['%', 100], deg: ['deg', 180 / Math.PI] };

function fmt(kindId: string, key: string, v: unknown): string {
  if (typeof v !== 'number') return String(v);
  const def = getPartKind(kindId).params.find((p) => p.key === key);
  const u = def?.type === 'number' ? FORGE_UNITS[def.display] : undefined;
  if (!u || !DISPLAY[def!.type === 'number' ? def!.display : '']) return String(+v.toPrecision(6));
  return `${+(v * u[1]).toPrecision(6)}${u[0]}`;
}

const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const startOfWeek = () => { const d = startOfDay(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const startOfMonth = () => { const d = startOfDay(); d.setDate(1); return d; };

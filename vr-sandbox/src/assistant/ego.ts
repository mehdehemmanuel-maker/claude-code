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

import type { App } from '../app/app';
import type { PhysicsEvent } from '../physics/protocol';
import type { Change } from '../doc/store';
import type { Connection, Part, Pose } from '../doc/types';
import { getConnectorKind } from '../connectors/registry';
import { composePose, relativePose } from '../doc/math';
import { connectedComponent, deleteParts, duplicateParts, setFrozen, setPartPoses } from '../doc/commands';
import { effectiveParams, getPartKind } from '../parts/registry';
import { DISPLAY, defaultsOf, formatForce, numberOf, type Params } from '../schema/params';
import { AUTO_JOIN } from '../connectors/plan';
import { run, type RunResult } from '../forge/forge';
import { AppHost } from '../forge/apphost';
import type { ToolManager } from '../tools/tools';
import { fixesFor, MARGIN } from './fixes';
import { HabitGraph } from './habits';
import { HELP, interpret, type Intent } from './intent';
import { Growth, XP } from './growth';
import { findRepeat, nameFor, signatureOf, SkillBook, skillProgram } from './skills';
import { foresee } from './foresight';
import { ReportBook, troubleOf, type Trouble } from './reports';
import { design, type DesignSpec } from './designer';
import { Voice } from './voice';
import { resolveKind, resolveMaterial } from '../forge/catalog';
import { getMaterial } from '../data/materials';

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
  private guardFixes: { at: number; trouble: Trouble; did: string }[] = [];
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
    app.onFrame.push((dt) => this.tick(dt));
  }

  // ---- acting -----------------------------------------------------------------------------------

  /** Ask her something in plain words ("make it stronger", "weld these"); anything else is run as Forge. */
  ask(text: string): string {
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
    const r = run(plan.forge, this.host);
    if (!r.ok) return `I couldn't build it: ${r.error}`;
    const made = Object.keys(app.doc.parts).filter((id) => !before.has(id));
    app.select(made);
    this.gain('template');
    const risks = this.forecast().filter((f) => made.includes(app.doc.connections[f.id]?.a.part ?? '') && f.u >= 0.8);
    const verdict = risks.length ? `But ${risks.length} joint${risks.length === 1 ? '' : 's'} will be near the limit: see my page.` : 'Every joint will carry its load with margin.';
    for (const f of risks.slice(0, 2)) { const c = app.doc.connections[f.id]!; this.say('warn', `In my design, the ${getConnectorKind(c.kind).label.toLowerCase()} joining ${this.names(c)} will carry ${Math.round(f.u * 100)}% of its ${f.mode} capacity.`, this.fixes(c, f.mode, f.load)); }
    return `${plan.notes.join(' ')} ${verdict}`;
  }

  /** What every rigid joint will carry once gravity acts (the analysis behind foresight). */
  private forecast() {
    const app = this.app, doc = app.doc;
    const parts = Object.values(doc.parts).map((p) => {
      const k = getPartKind(p.kind), m = app.materialOf(p);
      const b = app.boundsOf([p.id]);
      return { id: p.id, mass: k.volume(effectiveParams(k, p.params, m), m) * m.density, com: [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2] as [number, number, number], grounded: p.frozen || b.min[1] <= 0.005 };
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
   * What the watchdog catches is something no real world does: a part through the floor, a body flung from nowhere,
   * a pose that stopped being a number, a part shaking in place. She puts it right at once, without being asked, and
   * writes it up for Claude with the build as it was, since it is a flaw in this world's physics, not in your build.
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
      const pose = part ? app.livePose(id) : null;
      const set = (p: Pose) => app.physics.send({ op: 'setPose', id, pose: p, linear: [0, 0, 0], angular: [0, 0, 0] });
      let did: string | null = null;
      let trouble: Trouble = 'other';
      switch (a.kind) {
        case 'fell': case 'tunnel': {
          trouble = 'fell-through';
          if (!part) break;
          const b = app.boundsOf([id]), at = pose ?? part.pose;
          // back where it went through, resting on the floor (or where you built it, if it has left the room)
          const far = Math.hypot(at.p[0], at.p[2]) > 50 || !Number.isFinite(at.p[1]);
          set(far ? part.pose : { p: [at.p[0], at.p[1] - b.min[1] + 0.002, at.p[2]], q: at.q });
          did = `put ${name} back on the floor`;
          break;
        }
        case 'nonfinite':
          trouble = 'flung';
          if (!part) break;
          set(part.pose);
          did = `put ${name} back where you built it`;
          break;
        case 'flung':
          trouble = 'flung';
          if (!part || !pose) break;
          set(pose);
          did = `stopped ${name}`;
          break;
        case 'jitter':
          trouble = 'jitter';
          if (!part || !pose) break;
          set(pose);
          did = `settled ${name}`;
          break;
        default:
          continue; // held-part and timing findings are for the report page, not for her hands
      }
      const words = `(Ego saw it herself) ${a.kind} on ${name}: ${a.detail}`;
      // a report per finding while they're few; a storm of them is one flaw, already written up
      const filed = this.autoReports < MAX_AUTO_REPORTS;
      if (filed) {
        this.autoReports++;
        this.reports.add({ at: new Date().toISOString(), words, trouble, seen: [`watchdog ${a.severity}: ${a.detail}`, this.focus()], fixed: did, version: __BUILD__, build: app.doc.meta.name, shareCode: app.shareCode() });
      }
      if (did) this.guardFixes = [...this.guardFixes, { at: app.live.ticks, trouble, did }].slice(-10);
      this.gain('fix');
      this.say(a.severity === 'critical' ? 'warn' : 'tip', `👁 ${a.kind === 'jitter' ? `${name} was shaking in place` : `The watchdog caught ${a.kind === 'fell' || a.kind === 'tunnel' ? `${name} going through the floor` : a.kind === 'flung' ? `${name} flung faster than anything could throw it` : `${name} leaving the laws of physics`}`}. ${did ? `I ${did}.` : ''}${filed ? ' Written up for Claude.' : ''}`, []);
    }
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
    const seen = [
      ...recent.slice(-6).map((a) => `watchdog ${a.severity}: ${a.kind} on ${name(a.id)}: ${a.detail}`),
      ...this.advice.filter((a) => a.kind !== 'tip').slice(0, 3).map((a) => a.text),
      this.focus(),
      `${app.fps.toFixed(0)} fps, physics ${(app.live.stats?.stepMs ?? 0).toFixed(1)} ms a step, ${Object.keys(app.doc.parts).length} parts, ${Object.keys(app.doc.connections).length} joints, ${app.settings.build ? 'building' : 'playing'}`,
    ];
    // what she already put right on her own, if it's what you mean
    const already = this.guardFixes.filter((f) => f.trouble === trouble && app.live.ticks - f.at < 900).map((f) => f.did);
    const fixed = this.selfFix(trouble, recent.map((a) => ({ kind: a.kind, id: a.id.split('#')[0]! }))) ?? (already.length ? `already ${already.join(' and ')}` : null);
    this.reports.add({ at: new Date().toISOString(), words, trouble, seen, fixed, version: __BUILD__, build: app.doc.meta.name, shareCode: app.shareCode() });
    this.gain('ask');
    const n = this.reports.unsent.length;
    return `${fixed ? `I ${fixed}. ` : ''}I've written it up for Claude with what I saw and the build as it was (${n} report${n === 1 ? '' : 's'} to send, on my page).`;
  }

  /** What she can do about it herself, and what she did (null when it's one for Claude). */
  private selfFix(trouble: Trouble, recent: { kind: string; id: string }[]): string | null {
    const app = this.app;
    const still = (id: string) => {
      const pose = app.livePose(id);
      if (pose) app.physics.send({ op: 'setPose', id, pose, linear: [0, 0, 0], angular: [0, 0, 0] });
    };
    switch (trouble) {
      case 'fell-through': {
        // anything below the floor goes back on top of it, at rest
        const sunk = Object.keys(app.doc.parts).filter((id) => app.boundsOf([id]).min[1] < -0.02 || recent.some((a) => a.id === id && (a.kind === 'tunnel' || a.kind === 'fell')));
        for (const id of sunk) {
          const b = app.boundsOf([id]), pose = app.livePose(id) ?? app.doc.parts[id]!.pose;
          app.physics.send({ op: 'setPose', id, pose: { p: [pose.p[0], pose.p[1] - b.min[1] + 0.002, pose.p[2]], q: pose.q }, linear: [0, 0, 0], angular: [0, 0, 0] });
        }
        return sunk.length ? `put ${sunk.length === 1 ? app.doc.parts[sunk[0]!]!.name : `${sunk.length} parts`} back on the floor` : null;
      }
      case 'flung':
        if (app.canStop) { app.stop(); return 'took you back to the build as it was'; }
        if (app.checkpoints.length) { app.rewind(); return 'rewound to your last checkpoint'; }
        return null;
      case 'jitter': {
        const shaky = [...new Set(recent.filter((a) => a.kind === 'jitter' || a.kind === 'restless' || a.kind === 'unsteady').map((a) => a.id))].filter((id) => app.doc.parts[id]);
        for (const id of shaky) still(id);
        return shaky.length ? `settled ${shaky.length === 1 ? app.doc.parts[shaky[0]!]!.name : `${shaky.length} parts`}` : null;
      }
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
  foresee(on: 'play' | 'joint', only?: string) {
    if (!this.growth.has(on === 'play' ? 'foresight' : 'initiative')) return [];
    const doc = this.app.doc;
    const found = this.forecast().filter((f) => (only ? f.id === only : true) && f.u >= (on === 'play' ? 0.8 : 0.6));
    for (const f of found.slice(0, 3)) {
      const c = doc.connections[f.id]!;
      const unit = f.mode === 'bending' ? 'N·m' : 'N';
      const val = (x: number) => (unit === 'N' ? formatForce(x) : `${x.toFixed(1)} N·m`);
      const verdict = f.u >= 1 ? 'will fail' : 'will be close to failing';
      this.say('warn', `${on === 'play' ? 'Before it runs: ' : ''}the ${getConnectorKind(c.kind).label.toLowerCase()} joining ${this.names(c)} ${verdict}. It will carry ${val(f.load)} of ${f.mode} on a ${val(f.capacity)} capacity.`, this.fixes(c, f.mode, f.load));
    }
    return found;
  }

  private derived(c: Connection) {
    const { a, b, g } = this.geometry(c);
    return getConnectorKind(c.kind).derive({ params: c.params, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: g.thicknessB, distance: 0, cure: 1e12 });
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
    this.clock += dt;
    if (this.clock < 0.5) return;
    this.clock = 0;
    this.guard();
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
    const t = (p: Part) => { const k = getPartKind(p.kind); return k.dims(effectiveParams(k, p.params, this.app.materialOf(p))).b; };
    return {
      a: this.app.materialOf(pa), b: pb ? this.app.materialOf(pb) : null,
      g: { thicknessA: t(pa), thicknessB: pb ? t(pb) : t(pa), bondW: numberOf(c.params, 'bondW', 0.03), bondL: numberOf(c.params, 'bondL', 0.03) },
    };
  }

  private capacity(c: Connection, mode: string) {
    const { a, b, g } = this.geometry(c);
    const d = getConnectorKind(c.kind).derive({ params: c.params, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: g.thicknessB, distance: 0, cure: 1e12 });
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
        // initiative: a joint that won't hold is said as it's made, not when it breaks
        queueMicrotask(() => this.foresee('joint', c.id));
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


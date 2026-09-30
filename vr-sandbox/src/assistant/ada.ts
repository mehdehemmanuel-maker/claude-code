// Ada: the assistant in the workshop. She needs no outside service, because the world she lives in is fully known:
// every part, material, joint, load and failure. So she can say exactly why something broke and what would have
// held, keep a Forge transcript of the build, learn your habits, and run what you type.
//
//   senses   the document (parts, joints, materials), live joint loads, physics events, what you hold and select
//   thinks   the engineering the physics runs on: connector capacities, the join planner, the fix search
//   acts     Forge statements, through the same commands as your tools (so all of it undoes)
//   learns   the habit graph: which action tends to follow which, on this headset
//
// See docs/ADA.md for what comes next (her body, the robot arm, the printer, an on-device language model).

import type { App } from '../app/app';
import type { PhysicsEvent } from '../physics/protocol';
import type { Change } from '../doc/store';
import type { Connection, Part, Pose } from '../doc/types';
import { getConnectorKind } from '../connectors/registry';
import { composePose, relativePose } from '../doc/math';
import { connectedComponent, setPartPoses } from '../doc/commands';
import { effectiveParams, getPartKind } from '../parts/registry';
import { DISPLAY, defaultsOf, formatForce, numberOf, type Params } from '../schema/params';
import { AUTO_JOIN } from '../connectors/plan';
import { run, type RunResult } from '../forge/forge';
import { AppHost } from '../forge/apphost';
import type { ToolManager } from '../tools/tools';
import { fixesFor, MARGIN } from './fixes';
import { HabitGraph } from './habits';

export interface Advice {
  id: string;
  kind: 'break' | 'warn' | 'tip';
  text: string;
  fixes: { label: string; apply: () => void }[];
}

/** Warn once a joint passes this share of its capacity; again only after it has eased below RESET. */
const WARN = 0.85;
const RESET = 0.6;
const MAX_ADVICE = 6;

export class Ada {
  readonly name = 'Ada';
  readonly habits: HabitGraph;
  readonly host: AppHost;
  advice: Advice[] = [];
  /** This session's build, as Forge: every placement, joint and change you or she made. */
  journal: string[] = [];
  /** What her last commands did. */
  output: string[] = [];
  /** The command being typed on the tablet. */
  command = '';
  private warned = new Set<string>();
  private clock = 0;
  private seq = 0;

  constructor(private app: App, private tools: ToolManager | null, habits?: HabitGraph) {
    this.habits = habits ?? new HabitGraph();
    this.host = new AppHost(app, tools);
    app.store.subscribe((changes, source) => { if (source === 'do') this.record(changes); });
    app.eventListeners.push((e) => this.onEvent(e));
    app.onFrame.push((dt) => this.tick(dt));
  }

  // ---- acting -----------------------------------------------------------------------------------

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
    this.habits.see(token);
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


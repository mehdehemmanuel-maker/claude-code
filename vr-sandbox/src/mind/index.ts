// The Mind: Ego's own persistent state, and the one rule that moves it. It holds a journal (journal.ts) and runs the
// loop (investigate.ts) on two events only: a stand result on a design she built, and a line she was asked that she
// could not read. On each event it commits what the event is, then performs the next legal action until there is
// none, and rests: nothing polls, nothing ticks, no timer is set. At start, `resume` reads the journal and performs
// the next legal action of every investigation that is not resolved, which is how a reload in the middle of one
// continues it: the rule is the same function of the same data.

import type { SimSettings } from '../doc/types';
import type { StandResult, StandSetup } from '../physics/stand';
import type { DesignSpec } from '../assistant/designer';
import { investigations, last, openJournal, type Commit, type Journal } from './journal';
import { gapsOf, lessonsOf, type Gap, type Lesson } from '../construct/lessons';
import { Investigator, next, PHYSICS, type Action, type Clock, type Effects, type PartInfo, type Prediction, type Signature, type TestSpec } from './investigate';
import type { Anomaly } from '../diagnostics/watchdog';
import type { rigidDomain } from '../ganglia/native/tsc';

export type MindEvent =
  | { kind: 'stand-result'; inv: string; spec: DesignSpec; result: StandResult; signature: Signature; predicted: Prediction; since: number }
  | { kind: 'watchdog'; inv: string; anomaly: Anomaly; part: PartInfo | null; obligation: string; since: number }
  | { kind: 'construct'; part: PartInfo; domain: ReturnType<typeof rigidDomain>; since: number }
  | { kind: 'request'; text: string; since: number };

/** One step she took, with its cost. */
export interface Step { inv: string; did: Action['do']; kind: Commit['kind'] | null; ms: number; session: string }

const SESSION = () => Math.random().toString(36).slice(2, 8);

export class Mind {
  /** This run of the app. */
  readonly session: string;
  /** Working on an investigation now: false whenever there is nothing legal to do. */
  active = false;
  /** Every step taken this session, in order, with how long it took. */
  readonly steps: Step[] = [];
  /** Stand runs this session: how many, simulated seconds, wall ms. */
  readonly stands = { runs: 0, seconds: 0, ms: 0 };
  private investigator: Investigator;
  private busy: Promise<void> = Promise.resolve();

  constructor(readonly journal: Journal, private effects: Effects, clock: Clock = { now: () => performance.now(), iso: () => new Date().toISOString() }, session = SESSION(), readonly physics = PHYSICS) {
    this.session = session;
    const counted: Effects = { sim: effects.sim, rigid: effects.rigid, stand: async (setup: StandSetup) => { const res = await effects.stand(setup); this.stands.runs++; this.stands.seconds += res.seconds; this.stands.ms += res.ms; return res; } };
    this.investigator = new Investigator(journal, counted, session, clock, physics);
    this.effects = counted;
  }

  /** The Mind over the journal this runtime can keep. */
  static async open(effects: Effects, journal?: Journal): Promise<Mind> {
    return new Mind(journal ?? await openJournal(), effects);
  }

  /** The investigations with a legal action left. */
  /** What failure has taught (construct/lessons.ts): every hypothesis of a construction law the stand settled. */
  lessons(): Lesson[] { return lessonsOf(this.journal.commits); }
  /** Every failure no law explains: a facet named in the family, not yet derived. */
  gaps(): Gap[] { return gapsOf(this.journal.commits); }

  /** Every investigation not resolved or closed: those with a legal action next, and those resting on an open question (her frontier). */
  unresolved(): string[] {
    return investigations(this.journal.commits).filter((inv) => { const l = last(this.journal.commits, inv); return !!l && l.status !== 'resolved' && l.status !== 'closed'; });
  }
  /** The unresolved investigations with a legal action next: what resume drives. */
  pending(): string[] {
    return this.unresolved().filter((inv) => next(this.journal.commits, inv).do !== 'rest');
  }

  /** The last investigation touched, resolved or not. */
  current(): string | null {
    const c = this.journal.commits.filter((x) => x.kind !== 'request' && !x.inv.startsWith('construct:')).at(-1);
    return c?.inv ?? null;
  }

  /** An event: committed as what it is, then the loop run to rest. */
  process(ev: MindEvent): Promise<void> {
    const job = async () => {
      if (ev.kind === 'request') { await this.investigator.request(ev.text, ev.since); return; }
      if (ev.kind === 'construct') { await this.investigator.observeConstruct(ev.part, ev.domain, ev.since); return; }
      if (ev.kind === 'watchdog') { await this.investigator.observeWatchdog(ev.inv, ev.anomaly, ev.part, ev.obligation, ev.since); await this.drive(ev.inv); return; }
      const test: TestSpec = { spec: ev.spec, changes: [], factor: 1 };
      await this.investigator.observe(ev.inv, test, ev.result, ev.signature, ev.predicted, ev.since);
      await this.drive(ev.inv);
    };
    return (this.busy = this.busy.then(job, job));
  }

  /** The rule at start: every investigation that is not resolved continues from its journal. Returns what was done. */
  resume(): Promise<Step[]> {
    const before = this.steps.length;
    const job = async () => { for (const inv of this.pending()) await this.drive(inv); };
    return (this.busy = this.busy.then(job, job)).then(() => this.steps.slice(before));
  }

  private async drive(inv: string): Promise<void> {
    this.active = true;
    try {
      for (;;) {
        const a = next(this.journal.commits, inv);
        if (a.do === 'rest') break;
        const t0 = performance.now();
        const c = await this.investigator.perform(a, inv);
        this.steps.push({ inv, did: a.do, kind: c?.kind ?? null, ms: performance.now() - t0, session: this.session });
        if (!c) break;
      }
    } finally {
      this.active = false;
    }
  }

  /** The last commit of the current investigation. */
  get latest(): Commit | undefined {
    const inv = this.current();
    return inv ? last(this.journal.commits, inv) : undefined;
  }

  get sim(): SimSettings { return this.effects.sim; }
}

export { type Commit, type Journal, MemoryJournal, IdbJournal, openJournal, of, investigations } from './journal';
export { next, signatureOf, outcomeOf, buildTest, candidatesOf, describeChange, standLoads, standPushes, overturning, footprint, worldBox, JOINT_LIMIT, PROOF, PUSH, PHYSICS, TOLERANCE, type Action, type Effects, type Prediction, type Signature, type TestSpec, type Outcome, type Change, type PartInfo } from './investigate';
export { sayWorking, sayChanged, sayBrief } from './say';
export { lessonsOf, gapsOf, withLessons, lessonDiscovery, lessonCitations, sayLesson, lessonId, gapId, type Lesson, type Gap } from '../construct/lessons';

// The immune system. Every fault found and fixed leaves an antibody behind: a rule that remembers the incident (what
// was seen, why it happened, how it was fixed) and guards against it coming back, not just for the part it was found
// on but for everything that shares the traits that made it happen. Antibodies select their cases from the whole
// Spiderweb universe, which is generated from the part, material and connector registries, so a new part or
// material is tested by every antibody whose traits it has, the moment it is added.
//
// The language, read top to bottom:
//   antibody(id, what it guards)
//     .found(date, symptom)       the incident, as it was first seen
//     .cause(...)                 the root cause
//     .fix(...)                   what was changed
//     .guards(...anomaly kinds)   the invariants it enforces (watchdog.ts)
//     .on(selector)               which cases: by procedure (hold, throw, ...) and subject traits (segmented, ...)
//     .open()                     a diagnosed fault not yet fixed: reported, not yet gating
// A guarding antibody that fails blocks the change (npm run immune).

import type JoltNS from 'jolt-physics';
import { getPartKind } from '../parts/registry';
import { getMaterial } from '../data/materials';
import { spiderwebCases, runCase, type Case, type Procedure, type WebRun } from './spiderweb';
import type { AnomalyKind } from './watchdog';

/** What an antibody can know about a case's subject. */
export interface Traits {
  proc: Procedure;
  kind: string | null;
  category: string | null;
  /** Breakable stock: a chain of bonded segments. */
  segmented: boolean;
  magnet: boolean;
  /** Its collision shape is a convex hull (its centre of mass is not at its origin). */
  hull: boolean;
  round: boolean;
  /** Much longer than it is thick. */
  slender: boolean;
  material: string | null;
  metal: boolean;
}

export function traitsOf(c: Case): Traits {
  const k = c.kind && c.proc !== 'joint' ? (() => { try { return getPartKind(c.kind!); } catch { return null; } })() : null;
  const shape = k ? k.collision(Object.fromEntries(k.params.map((p) => [p.key, p.default]))) : null;
  const d = k ? k.dims(Object.fromEntries(k.params.map((p) => [p.key, p.default]))) : null;
  const mat = c.material && c.material !== 'mixed' ? (() => { try { return getMaterial(c.material); } catch { return null; } })() : null;
  return {
    proc: c.proc,
    kind: c.kind ?? null,
    category: k?.category ?? null,
    segmented: !!k?.segment,
    magnet: k?.category === 'Magnets',
    hull: shape?.type === 'hull',
    round: shape?.type === 'cylinder' || shape?.type === 'sphere' || (shape?.type === 'compound' && k?.id === 'tube.round'),
    slender: !!d && d.length > 5 * d.a,
    material: mat?.id ?? null,
    metal: !!mat && ['steel', 'stainless', 'aluminum', 'copper', 'brass', 'titanium', 'cast-iron'].includes(mat.category),
  };
}

export interface Antibody {
  id: string;
  guards: string;
  found: { date: string; symptom: string };
  cause: string;
  fix: string;
  invariants: AnomalyKind[];
  select: (t: Traits) => boolean;
  status: 'guarding' | 'open';
}

class AntibodyBuilder {
  private a: Antibody;
  constructor(id: string, guards: string) {
    this.a = { id, guards, found: { date: '', symptom: '' }, cause: '', fix: '', invariants: [], select: () => false, status: 'guarding' };
  }
  found(date: string, symptom: string) { this.a.found = { date, symptom }; return this; }
  cause(s: string) { this.a.cause = s; return this; }
  fix(s: string) { this.a.fix = s; return this; }
  guards(...k: AnomalyKind[]) { this.a.invariants = k; return this; }
  on(select: (t: Traits) => boolean) { this.a.select = select; return this; }
  open() { this.a.status = 'open'; return this; }
  build(): Antibody { return { ...this.a }; }
}

export const antibody = (id: string, guards: string) => new AntibodyBuilder(id, guards);

const is = (...procs: Procedure[]) => (t: Traits) => procs.includes(t.proc);

/** The immune memory: every fault fixed so far, and the ones diagnosed but not yet fixed. */
export const ANTIBODIES: Antibody[] = [
  antibody('AB-001', 'A held part follows the hand steadily, even on its stiffest axis, in either hand')
    .found('2026-09-28', 'Objects held in the hand, the left especially, had "a focused centre of gravity" and spun out of control')
    .cause('The grab drove one segment of a bonded part with gains sized for the whole part and one inertia for every axis, so its stiffest axis went unstable and the bonds had to carry the hand\'s wrench')
    .fix('The hand drives the whole piece as one rigid body: its inertia tensor about its true centre of mass, gravity carried, approach speed limited to what the hand can stop, the wrench shared over the segments')
    .guards('spin', 'flung', 'nonfinite', 'crash')
    .on(is('hold', 'turn')).build(),
  antibody('AB-002', 'A part held for welding stays within 1.5 mm and 0.5° of the hand, tremor and all')
    .found('2026-09-28', '"I want objects to be more stable in my hand so I can hold a project in place when I weld"')
    .cause('as AB-001; a part too heavy for one hand is expected to drop (noted, not a fault)')
    .fix('as AB-001')
    .guards('unsteady', 'spin', 'flung', 'nonfinite', 'crash')
    .on(is('weld')).build(),
  antibody('AB-003', 'A destroyed world gives back all its memory')
    .found('2026-09-29', 'The stress web ran the WebAssembly heap out of memory after 94 worlds')
    .cause('destroy() freed only the Jolt system: the collision-group filter (a 4096-group pair table, 1 MB), the contact listener and scratch vectors leaked with every world, i.e. every template load and reset')
    .fix('destroy() frees everything the world allocated; the collision group releases the last reference to the filter')
    .guards('leak')
    .on(is('memory')).build(),
  antibody('AB-004', 'A magnet snapped onto steel or another magnet lies flush and still')
    .found('2026-09-28', 'Small magnets rocked on their rims and were flung off; touching magnets shifted sideways pushed apart')
    .cause('A point-patch field model whose pull depended on how the patches lined up; then a contact solver unable to hold a gram of magnet pulled at thousands of g')
    .fix('Exact pole-face fields (closed forms), conservative edge smoothing, and a latch that holds stuck magnets rigidly until the load beats the pull, friction or tipping limit')
    .guards('flung', 'fell', 'jitter', 'restless', 'nonfinite', 'crash')
    .on(is('snap')).build(),
  antibody('AB-005', 'Templates run as built: no crash, no non-number, nothing flung or out of the world')
    .found('2026-09-28', 'The go-kart and other builds "break physics"')
    .cause('Builds that could not work as designed (catapult), and solver faults under load')
    .fix('Templates rebuilt to work physically, and every template card tested in use')
    .guards('crash', 'nonfinite', 'flung', 'fell')
    .on(is('template')).build(),
  antibody('AB-006', 'Random scenes of anything joined to anything never crash, produce non-numbers or leave the world')
    .found('2026-09-29', 'Chaos seeds (the stress web)')
    .cause('to be learnt from the chaos seeds as they fail')
    .fix('each failing seed becomes its own antibody when fixed')
    .guards('crash', 'nonfinite', 'fell')
    .on(is('chaos')).build(),
  antibody('AB-007', 'Nothing thrown passes through a wall')
    .found('2026-09-29', 'The stress web: spheres and rods thrown at 10 m/s went through a 10 cm wall')
    .cause('Discrete collision detection: a fast, thin body steps past a wall between ticks')
    .fix('Continuous collision (Jolt linear cast) for every moving body: a body is swept along its path each tick, not only placed at its end')
    .guards('tunnel')
    .on(is('throw')).build(),
  antibody('AB-008', 'A scene with nothing to power it never gains energy')
    .found('2026-09-28', 'Energy audit A5; the stress web: bonded stock lying still or dropped gains energy')
    .cause('Two faults and a false alarm. The assembly solver stepped the gyroscopic term explicitly, which adds energy every tick to a fast-spinning uneven part (a thin angle bounced higher than it fell, 2 J to 34 J in flight); it re-solved contacts Jolt had already overshot (a bonded chain on the floor rocking at the tick rate); and the watchdog counted a breakable part twice, once as its own frame with a guessed inertia')
    .fix('The gyroscopic term taken implicitly (Catto: one Newton step), which never adds energy; resting and sliding contacts on assemblies solved by the assembly solve alone (impacts stay Jolt\'s, with continuous collision); the watchdog watches bodies only')
    .guards('energy')
    .on(is('rest', 'drop', 'stack', 'pile', 'extreme')).build(),
  antibody('AB-010', 'A part placed through another is moved out with no energy gained')
    .found('2026-09-29', 'Chaos seeds: overlapping parts left each other at 150 to 600 m/s, and then the world went NaN')
    .cause('The assembly solver took overlap and joint drift out as velocity (Baumgarte): the deeper the overlap, the faster the parts left, with energy nothing supplied (0.6 to 13 J in zero g); deep overlaps also swung long parts through their neighbours in one linear step')
    .fix('Split impulse: position errors are solved on pseudo-velocities that move poses only, inside a trust region where the linear solve holds (turn error within the contact slop), at most 0.2 m per tick as Jolt does')
    .guards('energy', 'flung', 'nonfinite', 'crash')
    .on(is('overlap')).build(),
  antibody('AB-011', 'Bonded stock of any slenderness stays finite and physical')
    .found('2026-09-29', 'A breakable 1.4 mm wire 1.89 m long exploded to 500 m/s, then NaN, on its own, and hung the world')
    .cause('Single precision: a locked bond inverts its segments\' summed inverse inertia, whose moments differed by 3.3e4 (stable to 1e4, measured in Jolt alone)')
    .fix('A bonded segment\'s smallest moment is held to at least 1/1000 of its largest (A13); only its spin about its own axis changes, and only for segments over about 77 radii long. Non-numbers that still arise are contained before Jolt sees them (F3) and reported')
    .guards('nonfinite', 'flung', 'crash')
    .on((t) => t.segmented && (t.proc === 'extreme' || t.proc === 'overlap' || t.proc === 'drop' || t.proc === 'rest')).build(),
  antibody('AB-009', 'Any joint, shaken then overloaded, gives way without an explosion')
    .found('2026-09-29', 'The stress web (joint torture): every joint "flung" its block when overloaded')
    .cause('The test, not the joints: its 20 kN push went on after the joint gave, firing the freed block. A real test rig is a ram with a stroke')
    .fix('The overload is a stroke-limited ram (25 mm), so a freed block can take no more than force x stroke of work; every connector then gives way cleanly')
    .guards('crash', 'nonfinite', 'flung')
    .on(is('joint')).build(),
];

export interface ImmuneResult {
  antibody: Antibody;
  cases: number;
  failed: { run: WebRun; kinds: AnomalyKind[] }[];
  verdict: 'holds' | 'breached' | 'open';
}

/** The antibodies' verdicts on a set of runs (runs[i] is the run of cases[i]). */
export function evaluateImmune(cases: Case[], runs: WebRun[], abs = ANTIBODIES): ImmuneResult[] {
  const traits = cases.map(traitsOf);
  return abs.map((a) => {
    const mine = cases.map((_, i) => i).filter((i) => a.select(traits[i]!));
    const failed = mine.flatMap((i) => {
      const run = runs[i]!;
      const kinds = [...new Set(run.anomalies.filter((x) => a.invariants.includes(x.kind)).map((x) => x.kind))];
      return kinds.length ? [{ run, kinds }] : [];
    });
    const verdict: ImmuneResult['verdict'] = failed.length === 0 ? 'holds' : a.status === 'open' ? 'open' : 'breached';
    return { antibody: a, cases: mine.length, failed, verdict };
  });
}

/** Run only what the antibodies (or those matching `filter`) look at, and their verdicts. */
export function runImmune(J: typeof JoltNS, filter = '', onRun?: (r: WebRun) => void): { results: ImmuneResult[]; runs: WebRun[] } {
  const abs = ANTIBODIES.filter((a) => !filter || `${a.id} ${a.guards}`.toLowerCase().includes(filter.toLowerCase()));
  const cases = spiderwebCases('').filter((c) => { const t = traitsOf(c); return abs.some((a) => a.select(t)); });
  const runs = cases.map((c) => { const r = runCase(J, c); onRun?.(r); return r; });
  return { results: evaluateImmune(cases, runs, abs), runs };
}

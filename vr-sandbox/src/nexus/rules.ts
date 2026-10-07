// If this, then that: rules you make by picking an IF and a THEN, no typing, each on or off, and the robot's own, which it
// practises with. An IF is an event (a pipeline run that fails or holds, a build finished, a flaw found, a timer, a phrase
// said, the forge opening, the robot's mood) or a condition on the weather that starts it the moment it turns true (the
// wind over 30 km/h, rain, frost). A THEN is something done through the forge: the pipeline run again another way, the
// best of it searched for, a test ask tried, a note to Claude, the robot moved to act or speak, a hologram opened.
//
// A rule fires at most once a minute, and a chain of rules set off by rules stops three deep: a rule that reruns the
// pipeline on a failed run cannot run for ever.

export type IfId =
  | 'run-fails' | 'run-holds' | 'built' | 'flaw' | 'opens' | 'said-go' | 'every-10' | 'every-60'
  | 'wind-over-30' | 'gusts-over-50' | 'raining' | 'snowing' | 'frost' | 'hot' | 'storm'
  | 'robot-bored' | 'robot-happy' | 'robot-frustrated' | 'robot-curious';
export type ThenId =
  | 'rerun-seed' | 'try-matter' | 'best' | 'next-test' | 'design-wind' | 'tell-claude'
  | 'celebrate' | 'investigate' | 'say-weather' | 'robot-say' | 'practice' | 'holo-weather' | 'holo-pipeline' | 'make-it';

export type RuleEvent =
  | { kind: 'run'; held: boolean; ask?: string }
  | { kind: 'built' } | { kind: 'flaw' } | { kind: 'open' }
  | { kind: 'said'; text: string }
  | { kind: 'tick'; minutes: number }
  | { kind: 'weather' }
  | { kind: 'mood'; label: string };

export interface IfSpec { id: IfId; says: string; group: 'pipeline' | 'room' | 'time' | 'weather' | 'robot'; on: RuleEvent['kind']; /** a condition on the facts: the rule starts the moment it turns true */ cond?: (f: Record<string, number>) => boolean; match?: (e: RuleEvent) => boolean }
export const IFS: IfSpec[] = [
  { id: 'run-fails', says: 'a pipeline run fails', group: 'pipeline', on: 'run', match: (e) => e.kind === 'run' && !e.held },
  { id: 'run-holds', says: 'a pipeline run holds', group: 'pipeline', on: 'run', match: (e) => e.kind === 'run' && e.held },
  { id: 'built', says: 'a build finishes', group: 'room', on: 'built' },
  { id: 'flaw', says: 'a flaw is found', group: 'room', on: 'flaw' },
  { id: 'opens', says: 'the forge opens', group: 'room', on: 'open' },
  { id: 'said-go', says: 'I say "go"', group: 'room', on: 'said', match: (e) => e.kind === 'said' && /\bgo\b/i.test(e.text) },
  { id: 'every-10', says: 'every 10 minutes', group: 'time', on: 'tick', match: (e) => e.kind === 'tick' && e.minutes > 0 && e.minutes % 10 === 0 },
  { id: 'every-60', says: 'every hour', group: 'time', on: 'tick', match: (e) => e.kind === 'tick' && e.minutes > 0 && e.minutes % 60 === 0 },
  { id: 'wind-over-30', says: 'the wind is over 30 km/h', group: 'weather', on: 'weather', cond: (f) => (f.wind ?? 0) > 30 },
  { id: 'gusts-over-50', says: 'gusts are over 50 km/h', group: 'weather', on: 'weather', cond: (f) => (f.gusts ?? 0) > 50 },
  { id: 'raining', says: 'it starts raining', group: 'weather', on: 'weather', cond: (f) => (f.raining ?? 0) > 0 },
  { id: 'snowing', says: 'it starts snowing', group: 'weather', on: 'weather', cond: (f) => (f.snowing ?? 0) > 0 },
  { id: 'frost', says: 'it drops below 0 °C', group: 'weather', on: 'weather', cond: (f) => f.temperature !== undefined && f.temperature < 0 },
  { id: 'hot', says: 'it goes over 30 °C', group: 'weather', on: 'weather', cond: (f) => (f.temperature ?? -99) > 30 },
  { id: 'storm', says: 'a thunderstorm comes', group: 'weather', on: 'weather', cond: (f) => (f.storm ?? 0) > 0 },
  { id: 'robot-bored', says: 'the robot gets bored', group: 'robot', on: 'mood', match: (e) => e.kind === 'mood' && e.label === 'bored' },
  { id: 'robot-happy', says: 'the robot is happy', group: 'robot', on: 'mood', match: (e) => e.kind === 'mood' && /^(happy|proud|excited)$/.test(e.label) },
  { id: 'robot-frustrated', says: 'the robot is frustrated', group: 'robot', on: 'mood', match: (e) => e.kind === 'mood' && e.label === 'frustrated' },
  { id: 'robot-curious', says: 'the robot gets curious', group: 'robot', on: 'mood', match: (e) => e.kind === 'mood' && e.label === 'curious' },
];
export interface ThenSpec { id: ThenId; says: string }
export const THENS: ThenSpec[] = [
  { id: 'rerun-seed', says: 'run the pipeline again, next seed' },
  { id: 'try-matter', says: 'run it again of another matter' },
  { id: 'best', says: 'search for its best edits' },
  { id: 'next-test', says: 'run the next test ask' },
  { id: 'design-wind', says: 'design for the wind outside' },
  { id: 'tell-claude', says: 'tell Claude what happened' },
  { id: 'celebrate', says: 'the robot celebrates' },
  { id: 'investigate', says: 'the robot looks into it' },
  { id: 'say-weather', says: 'the robot says the weather' },
  { id: 'robot-say', says: 'the robot says how it feels' },
  { id: 'practice', says: 'the robot practises an ask' },
  { id: 'holo-weather', says: 'open the weather hologram' },
  { id: 'holo-pipeline', says: 'open the pipeline hologram' },
  { id: 'make-it', says: 'make the ask in the room' },
];
export const ifOf = (id: IfId) => IFS.find((x) => x.id === id)!;
export const thenOf = (id: ThenId) => THENS.find((x) => x.id === id)!;

export interface Rule { id: string; if: IfId; then: ThenId; on: boolean; /** the robot's own, which it practises with */ robot?: boolean; fired: number; last?: number; /** a condition rule: whether it held at the last look, so it starts only as it turns true */ held?: boolean }
export const ruleSays = (r: Rule) => `IF ${ifOf(r.if).says} THEN ${thenOf(r.then).says}`;
/** The robot's own rules: what it does when it is bored, when a run holds, and when one fails. */
export const ROBOT_RULES: Rule[] = [
  { id: 'r-bored', if: 'robot-bored', then: 'practice', on: true, robot: true, fired: 0 },
  { id: 'r-holds', if: 'run-holds', then: 'celebrate', on: true, robot: true, fired: 0 },
  { id: 'r-fails', if: 'run-fails', then: 'investigate', on: true, robot: true, fired: 0 },
  { id: 'r-storm', if: 'storm', then: 'say-weather', on: true, robot: true, fired: 0 },
];

/** The least time between two firings of a rule, ms; and how deep rules set off by rules may go. */
export const COOLDOWN = 60_000, DEEPEST = 3;

/** The rules an event starts, now: each on, matching it (or its condition turning true on the facts), out of its
 *  cooldown, and no deeper than rules may chain. The rules are marked as fired; the ones to do are returned. */
export function due(rules: Rule[], e: RuleEvent, facts: Record<string, number>, now: number, depth = 0): Rule[] {
  const out: Rule[] = [];
  for (const r of rules) {
    const spec = ifOf(r.if); if (spec.on !== e.kind) continue;
    let yes: boolean;
    if (spec.cond) { const h = spec.cond(facts); yes = h && !r.held; r.held = h; }
    else yes = spec.match ? spec.match(e) : true;
    if (!yes || !r.on || depth >= DEEPEST || (r.last !== undefined && now - r.last < COOLDOWN)) continue;
    r.fired++; r.last = now; out.push(r);
  }
  return out;
}

let n = 0;
export const newRule = (ifId: IfId, thenId: ThenId): Rule => ({ id: `u${Date.now().toString(36)}${(n++).toString(36)}`, if: ifId, then: thenId, on: true, fired: 0 });

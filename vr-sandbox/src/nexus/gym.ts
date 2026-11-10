// The practice gym and the inspector (decision 0029, wave 14; the user: "generate, inspect, upgrade random generations
// each time so we actually get the flow down instead of templates"). Three things, none of which builds: a varied machine
// request from word tables, the same for the same seed (`randomRequest`); the inspector's rule and the strict reader of its
// answer (`inspect`: four pictures of a build scored, the three upgrades worth most each given to the stage that owns it);
// and what many runs say together (`lessonsOf`: the recurring faults grouped by stage and by root, counted), with the
// lessons table and the history line the gym run writes (tests/evals/gym.eval.ts writes the files; nothing is written here).
import type { Ask } from './agent';
import { sameFeature, type Feature } from './lookat';

// ---- a random request ----------------------------------------------------------------------------------------------

/** A small generator (mulberry32) from a seed: the same numbers for the same seed, on every machine. */
function rng(seed: number): () => number {
  let a = (Math.imul(seed | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Kinds of machine (none of the user's twenty, tests/evals/user20.eval.ts: the gym practises on what it was not shown). */
export const KINDS = ['six-legged timber harvester', 'folding footbridge', 'gantry crane', 'tower crane', 'scissor lift', 'cherry picker', 'trenching machine', 'pipe-laying crawler', 'log splitter', 'hay baler', 'seed planter', 'apple-picking robot', 'greenhouse watering gantry', 'conveyor palletiser', 'bottle-capping carousel', 'pick-and-place delta robot', 'plasma-cutting table', 'tube-bending machine', 'wire-winding machine', 'sheet-metal press', 'band sawmill', 'pottery wheel', 'weaving loom', 'printing press', 'drawbridge', 'canal lock gate', 'cable car', 'funicular carriage', 'monorail trolley', 'rail inspection cart', 'tracked snow groomer', 'amphibious rover', 'stair-climbing hand truck', 'self-balancing unicycle', 'pedal-powered quadricycle', 'recumbent trike', 'tilting three-wheeler', 'sidecar motorcycle', 'airboat', 'paddle-wheel boat', 'catamaran tender', 'submersible inspection drone', 'quadcopter with a winch', 'tilt-rotor drone', 'ornithopter', 'weather balloon gondola', 'telescope mount', 'satellite dish positioner', 'solar tracker', 'wind turbine', 'water wheel', 'trebuchet', 'ballista', 'catapult', 'orrery', 'marble run lift', 'automaton drummer', 'animatronic owl', 'mechanical horse', 'snake robot', 'inchworm robot', 'tensegrity rover', 'window-cleaning robot', 'pipe-crawling robot', 'tree-climbing robot', 'lawn-mowing rover', 'vending carousel', 'coffee-roasting drum', 'dough-sheeting machine', 'exoskeleton leg', 'prosthetic hand', 'camera crane', 'motion-control slider', 'stage lift', 'car park stacker', 'tyre changer', 'engine hoist', 'vehicle tow dolly', 'tunnel-boring machine', 'rock crusher', 'bucket-wheel digger', 'dredger', 'pile driver', 'concrete mixer truck', 'street sweeper', 'bin-lifting refuse truck', 'aircraft tug', 'luggage carousel', 'parcel-sorting shuttle', 'warehouse stacker crane'] as const;
/** How big, in the request's own words (the pipeline reads a size from them). */
export const SCALES = ['RC', 'miniature', 'desktop', 'tabletop', 'person-sized', 'garage-sized', 'industrial', 'giant', '4 m span', '2 m long', 'half-metre', 'backpack-sized'] as const;
/** What drives it. */
export const POWERS = ['hydraulic', 'pneumatic', 'battery-electric', 'hand-cranked', 'pedal-powered', 'solar-powered', 'spring-wound', 'belt-driven', 'chain-driven', 'cable-driven', 'servo-driven', 'steam-powered', 'counterweight-driven', 'geared'] as const;
/** A twist: what makes this one not the catalogue's. */
export const TWISTS = ['on a trailer', 'on crawler tracks', 'on four steered wheels', 'that folds flat for transport', 'with a telescoping boom', 'with an operator cab', 'with outriggers', 'with a rotating turret base', 'on rails', 'with a gripper on the end', 'with a tool-changing head', 'carried on a tripod', 'with a tipping hopper', 'with twin articulated arms', 'hung from an overhead beam', 'with a winch and hook', 'on pontoons', 'with a guard cage around it', 'built from tube and plate', 'with a control pedestal beside it'] as const;

const pickOf = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
/** "a" or "an" before a phrase, by its sound. */
const article = (s: string): string => (/^(?:[aeio]|hour|RC\b|8|11|18)/i.test(s) && !/^(?:one|uni)/i.test(s) ? 'an' : 'a');

/** A varied machine request, the same for the same seed: a kind of machine, with (each most of the time) a scale, a power
 *  source and a twist ("a hydraulic RC six-legged timber harvester on a trailer"). Nothing here is built or looked up. */
export function randomRequest(seed: number): string {
  const r = rng(seed), kind = pickOf(r, KINDS), scale = pickOf(r, SCALES), power = pickOf(r, POWERS), twist = pickOf(r, TWISTS), which = r();
  // (one word in six left out, in turn: the requests differ in form as well as in words; the kind and one other always said)
  const parts = [which < 0.12 ? '' : power, which >= 0.12 && which < 0.24 ? '' : scale, kind].filter(Boolean).join(' ');
  return `${article(parts)} ${parts}${which >= 0.24 && which < 0.36 ? '' : ` ${twist}`}`;
}

// ---- the inspector -------------------------------------------------------------------------------------------------

/** The stages of the pipeline an upgrade can belong to: the whole's form; what moves and what moves it; what holds and
 *  carries (frames, joins, fasteners, bearings); the small things that make it read as real; materials and colours. */
export const STAGES = ['shape', 'mechanism', 'engineering', 'detail', 'surface'] as const;
export type Stage = typeof STAGES[number];
/** The four scores, each 0 to 10. */
export const SCORES = ['silhouette', 'proportion', 'mechanism', 'surface'] as const;
export type Score = typeof SCORES[number];
/** One picture of a build and where it was taken from. */
export interface View { name: string; png: Uint8Array }
/** The four views the inspector is shown, in order (the camera does not know a build's front: they are directions round it). */
export const VIEWS = [{ name: 'three-quarter', says: 'from one corner, a little above (the front-right three-quarter)', azimuth: 35, elevation: 24 }, { name: 'side', says: 'from the side, level', azimuth: 90, elevation: 4 },
  { name: 'top', says: 'from straight above', azimuth: 0, elevation: 89 }, { name: 'rear', says: 'from the opposite corner, a little above (the rear-left three-quarter)', azimuth: 215, elevation: 24 }] as const;
/** An upgrade: the stage that owns it, what to change in this build, and the fault under it in general words (said of any
 *  build, never of this request: what the lessons cluster by). */
export interface Upgrade { stage: Stage; what: string; root: string }
/** What the inspector said of a build. `failed`: why there is no reading (every score then 0). */
export interface Inspection { features: { name: string; seen: 'seen' | 'not seen' | 'wrong'; note: string }[]; stranger: string; named: boolean;
  scores: Record<Score, number>; confidence: number; upgrades: Upgrade[]; failed?: string }

/** The inspector's rule (one task: look and score, change nothing). Strict on purpose: the anchors say what a 3 and a 7 are. */
export const INSPECT_RULE = `## Here: inspect what was built (one task: look and score, change nothing)
The pictures are one build, made for the request below, as the 3D view shows it: ${VIEWS.map((v, i) => `picture ${i + 1} ${v.says}`).join('; ')}.
You are the inspector. You are not its builder and you are not kind: a score says what the pictures show, never what was
meant. A grey floor grid is the view's, not the build's. Reply with one JSON object and nothing else:
{"stranger": "what a person shown these pictures with no caption would call the thing, in a few words",
 "named": false,
 "features": [{"name": "tracks", "seen": "seen", "note": "two long tracks under the body"}, {"name": "blade", "seen": "not seen", "note": "nothing in front"}, {"name": "cab", "seen": "wrong", "note": "a flat plate where the cab should be"}],
 "scores": {"silhouette": 3, "proportion": 4, "mechanism": 2, "surface": 2},
 "confidence": 0.15,
 "upgrades": [{"stage": "shape", "what": "what to change in this build, one line", "root": "parts scattered apart, not one body"}, {"stage": "mechanism", "what": "...", "root": "no visible joints or actuators"}, {"stage": "surface", "what": "...", "root": "everything one grey material"}]}
stranger: write this FIRST, before reading the request again: the honest name ("a table with a pole on it", "loose blocks
on a plate"). named: true only where that name is the thing asked for (or a plain synonym of it); false otherwise.
features: every feature of the list below once, by its name as written. seen: plainly there, in its place, about its
proportion. "not seen": not in the pictures, or hidden inside. "wrong": something is there but a person would not take it
for the feature (far too small, the wrong shape, the wrong place).
scores, whole numbers 0 to 10, each judged on the pictures alone:
- silhouette: the outline against the background. 0 nothing or one block; 3 a generic assembly, could be many things; 5 the
  right family of thing (a vehicle, a crane, an arm) but not which; 7 the outline alone says the thing asked; 9 unmistakable.
- proportion: the sizes of the parts beside each other and beside the whole. 0 parts wildly off (a wheel bigger than the
  body, a part lost as a speck, things far apart or inside one another); 5 plausible with one part plainly off; 8 as the
  real thing is.
- mechanism: mechanical completeness: what must move has something visible to move it and to carry it (joints, pivots,
  hinges, axles, cylinders, motors, belts, fasteners, a frame that reaches the ground). 0 solid blocks touching or floating;
  3 some joints or wheels but most moving parts with no visible means; 5 the main motion's joints and actuator shown, the
  rest not; 8 every motion the request implies has its joint and its actuator, and the thing stands on something.
- surface: materials and colours reading as the real thing. 0 one flat colour throughout; 3 two or three materials, placed
  without meaning; 5 metal reads as metal and tyres as rubber but no paint, glass or markings where the real thing has
  them; 8 a person would say what each part is made of and the colours are the real thing's.
A part floating in the air, apart from the rest, or passing through another lowers silhouette, proportion and mechanism.
A score above 6 needs its reason visible in at least two pictures. Most first builds earn 2 to 5: do not round up.
confidence, 0 to 1: the chance that a stranger shown picture 1 alone, no caption, would name the request (its kind of
machine: the scale and the power source need not be guessed). named false: never above 0.3. named true and the features
mostly seen: 0.6 and up. Only an unmistakable build earns 0.9.
upgrades: the THREE changes that would raise the confidence most, most valuable first, each owned by one stage:
shape (the whole's form: a missing or misshapen feature, parts apart, the wrong layout, the wrong size);
mechanism (what moves and what moves it: joints, linkages, actuators, wheels, tracks, drives);
engineering (what holds and carries: frames, supports to the ground, joins, fasteners, bearings, things floating);
detail (the small things that make it read as real: cab, lights, hoses, handles, guards, controls);
surface (materials and colours).
what: the change in this build, one line. root: the fault under it in 3 to 6 plain general words, said of any build and
never naming this request's parts ("parts floating, not joined", "no visible actuators", "everything one grey material",
"a named feature missing", "feature far too small"): the same fault in two builds gets the same root words.`;

const clip = (s: unknown, n: number): string => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
/** The inspector's reply read strictly (throws with the reason where it is not in its form): one JSON object; the four
 *  scores numbers from 0 to 10; a confidence from 0 to 1; `stranger` said and `named` true or false; every feature of the
 *  list once with seen, not seen or wrong; one to three upgrades, each with a stage of STAGES, what and root. The first
 *  three upgrades are kept; a confidence above 0.3 where the stranger did not name the request is held to 0.3 (the rule's
 *  own bound). */
export function inspectionOf(reply: string, features: readonly Feature[]): Inspection {
  const i = reply.indexOf('{'), j = reply.lastIndexOf('}'); if (i < 0 || j <= i) throw new Error('no JSON object in the reply');
  let o: Record<string, unknown>; try { o = JSON.parse(reply.slice(i, j + 1)) as Record<string, unknown>; } catch (e) { throw new Error(`the reply is not JSON: ${(e as Error).message.slice(0, 120)}`); }
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new Error('the reply is not one JSON object');
  const sc = o.scores as Record<string, unknown> | undefined; if (!sc || typeof sc !== 'object') throw new Error('"scores" is missing: {silhouette, proportion, mechanism, surface}, each 0 to 10');
  const scores = {} as Record<Score, number>;
  for (const k of SCORES) { const v = sc[k]; if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 10) throw new Error(`scores.${k} is ${JSON.stringify(v)}: a number from 0 to 10`); scores[k] = v; }
  const c = o.confidence; if (typeof c !== 'number' || !Number.isFinite(c) || c < 0 || c > 1) throw new Error(`"confidence" is ${JSON.stringify(c)}: a number from 0 to 1`);
  const stranger = clip(o.stranger, 160); if (!stranger) throw new Error('"stranger" is missing: what a person with no caption would call the thing');
  if (typeof o.named !== 'boolean') throw new Error(`"named" is ${JSON.stringify(o.named)}: true or false`);
  if (!Array.isArray(o.features)) throw new Error('"features" is missing: a list of {name, seen, note}');
  const said = o.features.map((f) => (f ?? {}) as Record<string, unknown>);
  const fs = features.map((f) => { const x = said.filter((s) => sameFeature(String(s.name ?? ''), f.name)); if (x.length !== 1) throw new Error(`the feature "${f.name}" is said ${x.length} times: every feature of the list once, by its name`);
    const seen = String(x[0]!.seen ?? '').toLowerCase().trim(); if (seen !== 'seen' && seen !== 'not seen' && seen !== 'wrong') throw new Error(`the feature "${f.name}" has seen ${JSON.stringify(x[0]!.seen)}: "seen", "not seen" or "wrong"`);
    return { name: f.name, seen: seen as 'seen' | 'not seen' | 'wrong', note: clip(x[0]!.note, 160) }; });
  if (!Array.isArray(o.upgrades) || !o.upgrades.length) throw new Error('"upgrades" is missing: the three most valuable, each {stage, what, root}');
  const upgrades = o.upgrades.slice(0, 3).map((u, k) => { const x = (u ?? {}) as Record<string, unknown>, stage = String(x.stage ?? '').toLowerCase().trim() as Stage, what = clip(x.what, 240), root = clip(x.root, 80);
    if (!STAGES.includes(stage)) throw new Error(`upgrade ${k + 1} has stage ${JSON.stringify(x.stage)}: one of ${STAGES.join(', ')}`);
    if (!what || !root) throw new Error(`upgrade ${k + 1} has no ${what ? 'root' : 'what'}`); return { stage, what, root }; });
  return { features: fs, stranger, named: o.named, scores, confidence: o.named ? c : Math.min(c, 0.3), upgrades };
}
/** A build with no reading: every score 0, and why. */
export const unread = (why: string, features: readonly Feature[] = []): Inspection => ({ features: features.map((f) => ({ name: f.name, seen: 'not seen' as const, note: '' })), stranger: '', named: false,
  scores: { silhouette: 0, proportion: 0, mechanism: 0, surface: 0 }, confidence: 0, upgrades: [], failed: clip(why, 300) });

/** The inspector: shown the pictures of a build (VIEWS' four, in order) with the request and its recognition list, it says
 *  of each feature seen, not seen or wrong, scores silhouette, proportion, mechanical completeness and surface 0 to 10,
 *  gives one confidence 0 to 1 that a stranger would name the request, and the three upgrades worth most, each with the
 *  stage that owns it. Its reply is read strictly; one that cannot be read is asked for once more with the reason, then
 *  scored 0 with why. No pictures: scored 0 (nothing to look at), no call made. */
export async function inspect(request: string, features: readonly Feature[], views: readonly View[], ask: Ask): Promise<Inspection> {
  if (!views.length) return unread('no pictures of the build: nothing to look at', features);
  const prompt = `${INSPECT_RULE}\n\nThe request: ${request}\n${features.length ? `Its recognition list:\n${features.map((f) => `- ${f.name}: ${f.is}${f.where ? ` (${f.where})` : ''}`).join('\n')}` : 'It has no recognition list: "features" is [].'}\nThe pictures, in order: ${views.map((v) => v.name).join(', ')}.`;
  let why = '';
  for (let k = 0; k < 2; k++) {
    let reply: string; try { reply = await ask(why ? `${prompt}\n\nYour last reply could not be read: ${why}. Reply again with the one JSON object, in its form, and nothing else.` : prompt, 'default', views.map((v) => v.png)); }
    catch (e) { why = `the inspector could not be asked: ${(e as Error).message}`; continue; }
    try { return inspectionOf(reply, features); } catch (e) { why = (e as Error).message; }
  }
  return unread(`the inspector's reply could not be read, twice: ${why}`, features);
}

// ---- what many runs say ----------------------------------------------------------------------------------------------

/** One run of the gym: the request and what the inspector said of its build. */
export interface GymRun { request: string; inspection: Inspection }
/** A recurring fault: its root (the key words its wordings share), the stage that owns it, how many times it was said,
 *  and up to three requests and two of the inspector's own wordings as examples. */
export interface Lesson { root: string; stage: Stage; count: number; requests: string[]; words: string[] }

const STOP = new Set('a an and are as at be by for from in into is it its not no of on or so than that the their them there this to too with without all any each every one thing things part parts build builds built whole very far much more most some only just still also visible plainly reads read look looks like should would could has have having does do being'.split(' '));
/** A word to its root form, roughly (plurals and endings off: "joints", "jointed" and "joint" are one key word). */
const stem = (w: string): string => (w.length > 4 ? w.replace(/(?:ings?|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w);
/** A wording's key words: its words lower-cased, the common ones dropped, each to its root form, once. */
export function keyWords(s: string): string[] { return [...new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOP.has(w)).map(stem))]; }

/** From many runs' inspections, the recurring faults: every upgrade the inspector asked for (by its root words, else its
 *  what), every feature not seen and every feature wrong (two roots of the shape stage), and every run with no reading (a
 *  root of the engineering stage: nothing was built, or nothing could be read). Within a stage, wordings that share two
 *  key words (one, where either has two or fewer) are one root, named by the three key words most said. Most frequent
 *  first; ties by stage in STAGES' order, then by name. */
export function lessonsOf(runs: readonly GymRun[]): Lesson[] {
  interface Cluster { stage: Stage; keys: string[]; tally: Map<string, number>; shown: Map<string, string>; count: number; requests: string[]; words: string[]; fixed?: string }
  const clusters: Cluster[] = [];
  const add = (stage: Stage, wording: string, request: string, said: string, fixed?: string) => {
    const keys = keyWords(wording); if (!keys.length && !fixed) return;
    let best: Cluster | undefined, most = 0;
    for (const c of clusters) { if (c.stage !== stage || (c.fixed ?? '') !== (fixed ?? '')) continue; if (fixed) { best = c; break; }
      const shared = keys.filter((k) => c.keys.includes(k)).length; if (shared > most && (shared >= 2 || Math.min(keys.length, c.keys.length) <= 2)) { best = c; most = shared; } }
    if (!best) { best = { stage, keys, tally: new Map(), shown: new Map(), count: 0, requests: [], words: [], ...(fixed ? { fixed } : {}) }; clusters.push(best); }
    best.count++; for (const k of keys) best.tally.set(k, (best.tally.get(k) ?? 0) + 1);
    for (const w of wording.toLowerCase().split(/[^a-z0-9]+/)) if (w && !STOP.has(w) && !best.shown.has(stem(w))) best.shown.set(stem(w), w);
    if (!best.requests.includes(request) && best.requests.length < 3) best.requests.push(request);
    if (said && !best.words.includes(said) && best.words.length < 2) best.words.push(said);
  };
  for (const r of runs) { const x = r.inspection;
    if (x.failed) { add('engineering', '', r.request, x.failed, 'no reading of the build'); continue; }
    for (const u of x.upgrades) add(u.stage, u.root || u.what, r.request, `${u.root}: ${u.what}`);
    for (const f of x.features) if (f.seen !== 'seen') add('shape', '', r.request, `${f.name}: ${f.note}`, f.seen === 'wrong' ? 'a named feature wrong' : 'a named feature not seen'); }
  const name = (c: Cluster) => c.fixed ?? [...c.tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => c.shown.get(k) ?? k).join(' ');
  return clusters.map((c) => ({ root: name(c), stage: c.stage, count: c.count, requests: c.requests, words: c.words }))
    .sort((a, b) => b.count - a.count || STAGES.indexOf(a.stage) - STAGES.indexOf(b.stage) || a.root.localeCompare(b.root));
}

const mean = (xs: readonly number[]): number => (xs.length ? +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(3) : 0);
/** One line of the gym's history: the date, which set, how many, the mean confidence and the mean of each score (a run
 *  with no reading counts as 0 in every mean), and how many had no reading. */
export interface GymLine { date: string; set: string; n: number; confidence: number; silhouette: number; proportion: number; mechanism: number; surface: number; unread: number }
export function historyLine(runs: readonly GymRun[], date: string, set: string): GymLine {
  const of = (k: Score) => mean(runs.map((r) => r.inspection.scores[k]));
  return { date, set, n: runs.length, confidence: mean(runs.map((r) => r.inspection.confidence)), silhouette: of('silhouette'), proportion: of('proportion'), mechanism: of('mechanism'), surface: of('surface'), unread: runs.filter((r) => r.inspection.failed).length };
}
const cell = (s: string): string => s.replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
/** The lessons as plan/GYM-LESSONS.md: what the run was, its means, and the table (root, stage, count, example requests,
 *  example inspector words), most frequent first. */
export function lessonsMarkdown(lessons: readonly Lesson[], line: GymLine): string {
  return `# What the gym's inspector keeps saying\n\nRewritten by each gym run (\`tests/evals/gym.eval.ts\`; the reader and the grouping: \`src/nexus/gym.ts\`); never edited by hand.\nEach row is a fault the inspector met in more than one wording: fix the root in the pipeline stage that owns it, never\none request. The numbers over time: \`tests/evals/gym-history.json\`.\n\nThis run: ${line.date}, set ${line.set}, ${line.n} builds (${line.unread} with no reading); mean confidence ${line.confidence};\nmean scores of 10: silhouette ${line.silhouette}, proportion ${line.proportion}, mechanism ${line.mechanism}, surface ${line.surface}.\n\n| Root | Stage | Count | Example requests | The inspector's words |\n| --- | --- | --- | --- | --- |\n${lessons.map((l) => `| ${cell(l.root)} | ${l.stage} | ${l.count} | ${l.requests.map(cell).join('; ')} | ${l.words.map(cell).join(' // ')} |`).join('\n')}\n`;
}

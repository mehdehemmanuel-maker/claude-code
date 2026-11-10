// What a person must see to recognise the thing asked for, and an eye on the result (decision 0029, wave 14): the rules
// the compose path (agent.ts composeBuild) asks with, and the readers that hold a model's answers to their form. No model
// is called here and nothing is built: agent.ts makes the calls and the mends; this file says what is asked and reads it.

/** One thing a person must be able to see: its name, what it is with its rough proportion, where it sits; then, as the
 *  run finds them, the part that shows it and what the eye last said of it. */
export interface Feature { name: string; is: string; where?: string; part?: string; seen?: 'seen' | 'not seen' | 'wrong'; note?: string }
/** The request's recognition list: its features, the whole's longest side in metres where the words give one (a guess
 *  from the request's size words, said as one), and a line on its proportions. */
export interface Recognition { features: Feature[]; longest?: number; why?: string; proportions?: string }
/** What the eye said of a picture: each feature seen, not seen or wrong, and a line on the overall proportions. */
export interface Looked { features: { name: string; seen: NonNullable<Feature['seen']>; note: string }[]; proportions: string }

/** The recognition call's rule (one task: the list, build nothing). */
export const FEATURE_RULE = `## Here: what a person must see (one task: list, build nothing)
A person asked for a thing. Before anything is built, write its recognition list: the 5 to 8 things a person must be able
to SEE in a picture of it to say "that is one". Reply with one JSON object and nothing else:
{"features": [{"name": "tracks", "is": "two crawler tracks, each as long as the body and a third of its height", "where": "low, one each side"}, {"name": "blade", "is": "a wide curved blade, wider than the body, on two push arms", "where": "in front, low"}, {"name": "cab", "is": "a boxy cab with windows, a third of the length", "where": "on top, toward the rear"}],
 "size": {"longest_m": 0.6, "why": "an RC model"}, "proportions": "about twice as long as wide, low and heavy"}
A feature is a visible thing with its shape, never a function alone ("moves earth") and never a bolt or a wire; each
name one short word of its own. is: its shape and its size beside the rest (as long as, half the height of, wider than).
where: its place on the whole (in front, on top, at each corner, underneath). Every thing the request names is a feature
(an "excavator factory" shows a building or line with stations and an excavator on it, never one excavator alone; a
"dinosaur" shows a long neck or head with jaws, a long tail, a body on legs). size.longest_m: the whole's longest side in
metres, from the request's size words: "giant" several metres, "industrial" one to several, "personal" or a thing a person
rides or wears about a person's size (1 to 2.5), "RC" 0.3 to 0.8, "miniature" 0.1 to 0.3, a stated size as stated ("one
cubic meter": about 1.2 for its frame); no size words: the size such a thing commonly is, and say so in why.`;

/** The eye's rule (one task: look at the picture, change nothing). */
export const LOOK_RULE = `## Here: look at what was built (one task: look, change nothing)
The picture is what was built for the request below, as the 3D view shows it. For each feature of its recognition list, say
whether a person looking at this picture sees it. Reply with one JSON object and nothing else:
{"features": [{"name": "tracks", "seen": "seen", "note": "two long tracks under the body"}, {"name": "blade", "seen": "not seen", "note": "nothing in front of the body"}, {"name": "cab", "seen": "wrong", "note": "a flat plate where the cab should be"}], "proportions": "one line: the overall shape and whether a person would take it for the thing asked"}
seen: plainly there, in its place, about its proportion. "not seen": not in the picture, or hidden inside. "wrong": something
is there but a person would not take it for the feature (far too small, the wrong shape, in the wrong place). Judge only
what the picture shows, never what the parts are called; every feature of the list once, by its name as written.`;

/** The mend rule for what the eye did not see (the functional gate's mend path, agent.ts: one change, run, taken or not). */
export const SEE_RULE = `## Here: make it look like what was asked (one task)
The build runs, but a person looking at its picture does not see the features below. Reply with one JSON object and nothing
else, a change: {"tool": "change", "remove": [...], "add": {...}, "set": {...}, "wires": [...], "says": "..."}. For each
feature not seen, add what shows it (an assembly that is it, else pieces: room.make a box, rod, tube, sphere, cone or dome of
the feature's proportions beside the whole's size given below) and join it to the whole in its place by an operation
(room.onto with the face it sits on, room.stack, room.over, room.through), the whole's last block the host; for a feature
that is wrong, set its part's size settings or replace its join. Keep every part; each operation's block into the next; end
with one space.show of the last block's thing (remove the old show).`;

const word = (s: unknown): string => String(s ?? '').toLowerCase().replace(/\W+/g, '_').replace(/^_+|_+$/g, '');
/** The same feature by two spellings ("Tracks", "tracks "): names compared as words. */
export const sameFeature = (a: string, b: string): boolean => !!word(a) && word(a) === word(b);

/** The recognition list as a model answers it (already read as JSON), held to its form: at most 8 features, each named
 *  once; a longest side only where it is a positive number. Throws where there is no feature. */
export function recognitionOf(o: Record<string, unknown>): Recognition {
  const fs = Array.isArray(o.features) ? o.features : [], seen = new Set<string>(), features: Feature[] = [];
  for (const f of fs.slice(0, 8)) { const x = (f ?? {}) as Record<string, unknown>, name = word(x.name); if (!name || seen.has(name)) continue; seen.add(name);
    features.push({ name, is: String(x.is ?? x.what ?? name).slice(0, 200), ...(x.where ? { where: String(x.where).slice(0, 80) } : {}) }); }
  if (!features.length) throw new Error('no features in the list: "features" is a list of {name, is, where}');
  const size = (o.size ?? {}) as Record<string, unknown>, m = Number(size.longest_m ?? o.longest_m);
  return { features, ...(Number.isFinite(m) && m > 0 ? { longest: m } : {}), ...(size.why ? { why: String(size.why).slice(0, 120) } : {}), ...(o.proportions ? { proportions: String(o.proportions).slice(0, 200) } : {}) };
}
/** A feature as a line: its name, what it is, where. */
export const featureLine = (f: Feature): string => `${f.name}: ${f.is}${f.where ? ` (${f.where})` : ''}`;
/** A length in metres as a person says it. */
export const metres = (m: number): string => (m >= 1 ? `${+m.toFixed(2)} m` : `${Math.round(m * 1000)} mm`);
/** The list said for the split and for each part's plan: every feature a line, the size and the proportions. */
export function recognitionLines(r: Recognition): string {
  return `A person must see (the recognition list):\n${r.features.map((f) => `- ${featureLine(f)}`).join('\n')}${r.longest ? `\nThe whole: about ${metres(r.longest)} on its longest side${r.why ? ` (${r.why})` : ''}.` : ''}${r.proportions ? `\nProportions: ${r.proportions}` : ''}`;
}

/** What the eye said, as a model answers it (already read as JSON), held to the list: every feature once, by its name;
 *  one the answer leaves out is not seen (nothing was said of it). */
export function lookedOf(o: Record<string, unknown>, features: readonly Feature[]): Looked {
  const said = (Array.isArray(o.features) ? o.features : []).map((f) => (f ?? {}) as Record<string, unknown>);
  return { proportions: String(o.proportions ?? '').slice(0, 300), features: features.map((f) => { const x = said.find((s) => sameFeature(String(s.name ?? ''), f.name)), v = String(x?.seen ?? '').toLowerCase().trim();
    const seen = x === undefined ? 'not seen' : v === 'seen' || v === 'yes' || x.seen === true ? 'seen' : v === 'wrong' ? 'wrong' : 'not seen';
    return { name: f.name, seen, note: String(x?.note ?? (x ? '' : 'the look said nothing of it')).slice(0, 160) }; }) };
}

/** The longest side of a bound, in metres (the bound in metres, as room.ts gives it); undefined with no bound. */
export function longestOf(b: { lo?: readonly number[]; hi?: readonly number[] } | undefined): number | undefined {
  if (!b?.lo || !b.hi) return undefined; const d = [0, 1, 2].map((k) => (b.hi![k] ?? 0) - (b.lo![k] ?? 0)).filter(Number.isFinite); return d.length ? Math.max(...d) : undefined;
}
/** The build's size beside the size asked: a line where they differ by more than 2 times, else undefined. */
export function sizeOff(built: number | undefined, asked: number | undefined): string | undefined {
  if (!built || !asked || built <= 0 || asked <= 0) return undefined; const k = built / asked;
  return k > 2 || k < 0.5 ? `size: the build is ${metres(built)} on its longest side, asked about ${metres(asked)} (${k > 1 ? `${+k.toFixed(1)} times too big` : `${+(1 / k).toFixed(1)} times too small`})` : undefined;
}

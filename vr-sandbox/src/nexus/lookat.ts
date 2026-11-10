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

// ---- an engineered design, not a look-alike (wave 14, E to H): the requirements as numbers, the requirement that falls
// on each part, and the check of what was built against them, with no model -------------------------------------------

/** One requirement of the design: a number with its unit (or a word: the power source, the environment), and whether
 *  the request gave it or it is assumed (typical). */
export interface Requirement { name: string; value: number | string; unit: string; from: 'request' | 'assumed' }
/** The requirement that falls on one part, in SI: N, kg, m, m/s, N·m, W. */
export type Needs = Partial<Record<'force' | 'payload' | 'span' | 'speed' | 'torque' | 'power', number>>;
const NEED_UNIT: Record<keyof Needs, string> = { force: 'N', payload: 'kg', span: 'm', speed: 'm/s', torque: 'N·m', power: 'W' };

/** The requirements' rule, asked in the recognition call (one call for both). */
export const REQUIRE_RULE = `Then the design's requirements, as numbers with units: this is an engineered machine, never a toy or a model of one.
"requirements": [{"name": "envelope", "value": 2.4, "unit": "m", "from": "assumed"}, {"name": "payload", "value": 500, "unit": "kg", "from": "request"}, {"name": "force", "value": 14700, "unit": "N", "from": "assumed"}, {"name": "speed", "value": 0.5, "unit": "m/s", "from": "assumed"}, {"name": "duty", "value": 50, "unit": "%", "from": "assumed"}, {"name": "power", "value": "hydraulic", "unit": "", "from": "assumed"}, {"name": "environment", "value": "outdoor, dust and rain", "unit": "", "from": "assumed"}]
Each of envelope (the longest side, m; the same as size.longest_m), payload (kg) or force (the working force, N), speed
(m/s), duty (% of the time under load), power (electric, hydraulic, pneumatic or engine) and environment, once. from:
"request" where the request's words give it, else "assumed" (a typical value for such a machine at this size, said as
one). "Giant", "industrial", "personal", "one cubic metre" set them. "RC" means remotely controlled, never toy-sized:
an RC bulldozer is a working machine driven by radio (size.longest_m a metre or more), unless "miniature" or "model" is
said. The force follows from the payload (payload × 9.81 × a dynamic factor of 1.5 where it is lifted or carried on legs).`;

/** The requirements as a model answers them (the recognition call's object), held to their form: each name once. */
export function requirementsOf(o: Record<string, unknown>): Requirement[] {
  const seen = new Set<string>(), out: Requirement[] = [];
  for (const r of Array.isArray(o.requirements) ? o.requirements.slice(0, 12) : []) { const x = (r ?? {}) as Record<string, unknown>, name = word(x.name); if (!name || seen.has(name) || x.value === undefined || x.value === null || x.value === '') continue; seen.add(name);
    const n = typeof x.value === 'number' ? x.value : Number(x.value);
    out.push({ name, value: Number.isFinite(n) && String(x.value).trim() !== '' ? n : String(x.value).slice(0, 80), unit: String(x.unit ?? '').slice(0, 12), from: /request/i.test(String(x.from ?? '')) ? 'request' : 'assumed' }); }
  return out;
}
/** A requirement as a line: "payload 500 kg (from the request)". */
export const requirementLine = (r: Requirement): string => `${r.name} ${r.value}${r.unit ? ` ${r.unit}` : ''} (${r.from === 'request' ? 'from the request' : 'assumed (typical)'})`;
/** The requirements said for the split and the parts. */
export const requirementLines = (rs: readonly Requirement[]): string => (rs.length ? `Requirements (an engineered machine, sized to these): ${rs.map(requirementLine).join('; ')}.` : '');

/** The requirement on a part as the split wrote it ({"force_N": 14700, "payload_kg": 500, …}; a bare name is SI). */
export function needsOf(x: unknown): Needs | undefined {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return undefined; const out: Needs = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) { const n = Number(v), base = (Object.keys(NEED_UNIT) as (keyof Needs)[]).find((b) => k.toLowerCase().startsWith(b)); if (!base || !Number.isFinite(n) || n <= 0) continue;
    const u = k.toLowerCase().slice(base.length).replace(/^_/, ''); out[base] = n * (u === 'kn' ? 1000 : u === 'mm' ? 0.001 : u === 'kw' ? 1000 : u === 'g' ? 0.001 : u === 't' ? 1000 : 1); }
  return Object.keys(out).length ? out : undefined;
}
const sig = (n: number): string => String(+n.toPrecision(3));
/** A quantity as a person reads it: 14700 N as "14.7 kN". */
export const qty = (n: number, unit: string): string => (unit === 'N' && n >= 1000 ? `${sig(n / 1000)} kN` : unit === 'W' && n >= 1000 ? `${sig(n / 1000)} kW` : `${sig(n)} ${unit}`);
export const needsLine = (n: Needs): string => (Object.keys(n) as (keyof Needs)[]).map((k) => `${k} ${qty(n[k]!, NEED_UNIT[k])}`).join(', ');

const NEED_WORDS: Record<keyof Needs, RegExp> = { force: /force|thrust|push|pull/, payload: /payload|load|capacity/, span: /span|reach/, speed: /speed|velocity/, torque: /torque/, power: /power|watt/ };
const TO_UNIT: Record<string, number> = { n: 1, kn: 1e-3, kg: 1, g: 1000, t: 1e-3, m: 1, mm: 1000, cm: 100, 'm/s': 1, 'mm/s': 1000, 'n·m': 1, 'n.m': 1, nm: 1, 'n m': 1, w: 1, kw: 1e-3 };
/** The settings of a block that take a requirement (read by their keys, labels and units, never by the block's id): the
 *  value each is set to, in the setting's own unit. A setting in a unit not known here is left alone, and said. */
export function settingsForNeeds(settings: readonly { key: string; label?: string; unit?: string; type?: string }[], needs: Needs): { set: Record<string, number>; lines: string[] } {
  const set: Record<string, number> = {}, lines: string[] = [], numeric = (x: { type?: string }) => x.type === undefined || x.type === 'number' || x.type === 'quantity';
  for (const k of Object.keys(needs) as (keyof Needs)[]) { const s = settings.find((x) => numeric(x) && NEED_WORDS[k].test(x.key.toLowerCase())) ?? settings.find((x) => numeric(x) && NEED_WORDS[k].test((x.label ?? '').toLowerCase())); if (!s || s.key in set) continue;
    const u = (s.unit ?? /\(([^)]+)\)\s*$/.exec(s.label ?? '')?.[1] ?? '').trim().toLowerCase(), f = u === '' ? 1 : TO_UNIT[u];
    if (f === undefined) { lines.push(`${k} not set on ${s.key}: its unit (${u}) is not one known here`); continue; }
    set[s.key] = +(needs[k]! * f).toPrecision(6); lines.push(`${k} ${qty(needs[k]!, NEED_UNIT[k])} into ${s.key}${u ? ` (${set[s.key]} ${s.unit ?? u})` : ''}`); }
  return { set, lines };
}

/** What a part's pieces give, read from their lines' rows where the rows carry it: the most torque (N·m), the most force
 *  (N), and the electrical power its power lines take or give (V × A, summed over its pieces, each piece's biggest). */
export function givesOf(pieces: readonly { name: string; lines?: readonly { kind?: string; size?: Readonly<Record<string, number | string>> }[] }[]): { torque?: number; force?: number; watts?: number } {
  let torque: number | undefined, force: number | undefined, watts: number | undefined; const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);
  for (const p of pieces) { let w = 0;
    for (const l of p.lines ?? []) { const s = l.size ?? {}, t = num(s.Nm) ?? num(s.torque) ?? num(s.stallTorque) ?? num(s.ratedTorque), f = num(s.N) ?? num(s.force) ?? (num(s.kN) ? num(s.kN)! * 1000 : undefined);
      if (t) torque = Math.max(torque ?? 0, t); if (f) force = Math.max(force ?? 0, f);
      const V = num(s.V), A = num(s.A), W = num(s.W) ?? (l.kind === 'power' && V && A ? V * A : undefined); if (W) w = Math.max(w, W); }
    if (w) watts = (watts ?? 0) + w; }
  return { ...(torque ? { torque } : {}), ...(force ? { force } : {}), ...(watts ? { watts } : {}) };
}
/** The safety factors a part's own engineering report states, wherever in its outputs they are (read generically: a
 *  record with a safety factor and, where it states one, its minimum; a record that says it failed). */
export function reportsIn(out: unknown, at = '', depth = 0): { what: string; sf?: number; min?: number; failed?: true }[] {
  if (!out || typeof out !== 'object' || depth > 4) return []; const found: { what: string; sf?: number; min?: number; failed?: true }[] = [];
  if (Array.isArray(out)) { out.slice(0, 40).forEach((v, k) => found.push(...reportsIn(v, `${at}[${k}]`, depth + 1))); return found; }
  const o = out as Record<string, unknown>; if (Array.isArray(o.pieces) || Array.isArray(o.parts) || Array.isArray(o.children)) return [];
  const key = (re: RegExp) => Object.keys(o).find((k) => re.test(k) && typeof o[k] === 'number'), sfK = key(/^(sf|fos|safety|safety[ _]?factor|factor[ _]of[ _]safety)$/i), minK = key(/^(min|minimum|sf[ _]?min|min[ _]?sf|min[ _]?safety|required|min[ _]?safety[ _]?factor)$/i);
  const what = String(o.check ?? o.name ?? o.what ?? (at || 'report')).slice(0, 60);
  if (sfK) found.push({ what, sf: o[sfK] as number, ...(minK ? { min: o[minK] as number } : {}) });
  else if ((o.ok === false || o.pass === false || o.passes === false || /^fail/i.test(String(o.status ?? ''))) && (o.check ?? o.name ?? o.what)) found.push({ what, failed: true });
  for (const [k, v] of Object.entries(o)) if (v && typeof v === 'object') found.push(...reportsIn(v, at ? `${at}.${k}` : k, depth + 1));
  return found.slice(0, 40);
}

/** One line of the engineering check: what a part gives against what its requirement needs. */
export interface Margin { part: string; what: 'torque' | 'force' | 'power' | 'supply' | 'safety factor' | 'report'; gives: number; needs: number; unit: string; margin: number; ok: boolean }
export interface Engineering { margins: Margin[]; reasons: string[]; notes: string[] }
export const marginLine = (m: Margin): string => (m.what === 'report' ? `${m.part}: its own engineering report says it fails` : (m.what === 'safety factor' ? `${m.part}: safety factor ${sig(m.gives)}, at least ${sig(m.needs)} stated` : m.what === 'supply' ? `supply gives ${qty(m.gives, m.unit)}, the drivers take ${qty(m.needs, m.unit)}` : `${m.part} gives ${qty(m.gives, m.unit)}${m.what === 'power' ? ' (its electrical input, V × A)' : ''}, ${qty(m.needs, m.unit)} needed`) + ` (margin ${sig(m.margin)})`);
/** The engineering check, with no model: for each part with a requirement on it, the torque, force or power its
 *  components' rows give against what the requirement needs (mechanical power: force × speed where no power is said; an
 *  electric driver cannot give more than its V × A takes in); the drivers' electrical power against the supplies'; each
 *  part's own report held to the minimum it states. What a row does not carry is said in the notes, never passed. */
export function engineeringOf(parts: readonly { name: string; role: string; needs?: Needs; pieces: Parameters<typeof givesOf>[0]; outputs?: unknown }[]): Engineering {
  const margins: Margin[] = [], notes: string[] = []; let drawn = 0, supplied = 0;
  for (const p of parts) { const g = givesOf(p.pieces), n = p.needs ?? {}, mech = n.power ?? (n.force && n.speed ? n.force * n.speed : undefined);
    if (p.role === 'supply') supplied += g.watts ?? 0; else if (p.role === 'driver') drawn += g.watts ?? 0;
    const add = (what: Margin['what'], gives: number, needs: number, unit: string) => margins.push({ part: p.name, what, gives, needs, unit, margin: gives / needs, ok: gives >= needs });
    if (n.torque && g.torque) add('torque', g.torque, n.torque, 'N·m'); if (n.force && g.force) add('force', g.force, n.force, 'N'); if (mech && g.watts && p.role !== 'supply') add('power', g.watts, mech, 'W');
    if ((n.torque || n.force || mech) && !((n.torque && g.torque) || (n.force && g.force) || (mech && g.watts))) notes.push(`${p.name}: needs ${needsLine(n)}, but its components' rows carry no torque, force or power to hold it to`);
    for (const r of reportsIn(p.outputs)) { if (r.failed) margins.push({ part: `${p.name} (${r.what})`, what: 'report', gives: 0, needs: 1, unit: '', margin: 0, ok: false });
      else if (r.sf !== undefined && r.min !== undefined) margins.push({ part: `${p.name} (${r.what})`, what: 'safety factor', gives: r.sf, needs: r.min, unit: '', margin: r.sf / r.min, ok: r.sf >= r.min });
      else if (r.sf !== undefined) notes.push(`${p.name} (${r.what}): safety factor ${sig(r.sf)}, no minimum stated to hold it to`); } }
  if (supplied && drawn) margins.push({ part: 'supply', what: 'supply', gives: supplied, needs: drawn, unit: 'W', margin: supplied / drawn, ok: supplied >= drawn });
  const fix = (m: Margin) => (m.what === 'safety factor' || m.what === 'report' ? 'make it stronger (a larger section, a stronger material, a larger size)' : m.what === 'supply' ? 'choose a larger supply' : m.what === 'force' ? 'choose a larger bore or a stronger actuator' : 'choose a larger one, or gear it down');
  return { margins, notes, reasons: margins.filter((m) => !m.ok).map((m) => `the ${marginLine(m)}: ${fix(m)}`) };
}

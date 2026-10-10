// What a person means on a board, when they do not have the word for it, spell it their own way, or say it roughly.
// A person says it as it comes ("the thing that turns the torque into force on the ground goes under motion", "moter",
// "add rim and tyre to wheels"); this reads it against what Nexus knows the names of, and against the board, and says
// back what it understood: the names for what was described, the spellings it recognised, and the changes it takes the
// words to ask for, each one for the person to accept or not. Nothing is changed by reading.
//
// What Nexus knows the names of: the embodiment taxonomy (src/nexus/embody/taxonomy.ts), every domain, category and
// subcategory with what it is for in words, and the build domain manifold (src/nexus/substrate/atlas.ts), its 32 domains and
// their terms. This reading is Nexus's own; where the page can ask Claude, Claude reads the words with the board and
// this reading beside it (src/nexus/view/forge.ts), and its reading is checked against the board the same way.

import { TAXONOMY, type Node as TaxNode } from '../embody/taxonomy';
import { DOMAINS } from './atlas';
import { derive, edgesOf, levelOf, nodesOf, type Board } from './boards';

export interface Term { said: string; means: string; why: string }
/** A change the words ask for. A node is named by its id, or as "@label" when it is one this reading adds first. */
export type Proposal = { say: string } & (
  | { op: 'rename'; node: string; to: string }
  | { op: 'add'; label: string; under?: string }
  | { op: 'link' | 'unlink'; a: string; c: string });
export interface Understanding { heard: string; understood: string; terms: Term[]; proposals: Proposal[]; by: 'claude' | 'nexus' }

// ---- words ---------------------------------------------------------------------------------------------------------------
const STOP = new Set('a an the this that these those it its it\'s is are was were be been being am of to in into on onto at by for from with without and or but not no so as than then there here what which who whom whose when where why how all any each every some such own same other another more most less very just only also too can could should would will shall may might must do does did done have has had i me my we our you your he she they them their thing things stuff something someone part parts bit bits kind sort type one ones like want wants need needs make makes made put goes go going get gets got let lets please really actually maybe mean means think know say said use used using way ways about up down out over under again'.split(' '));
/** A word as a stem: plural and -ing, -ed endings taken off, so tyres and tyre, turns and turning, are one word. */
export function stem(w: string): string {
  let s = w.toLowerCase().replace(/'s$/, '');
  if (s.length > 4 && s.endsWith('ies')) s = `${s.slice(0, -3)}y`;
  else if (s.length > 4 && /(ss|x|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us')) s = s.slice(0, -1);
  if (s.length > 5 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 4 && s.endsWith('ed')) s = s.slice(0, -2);
  return s;
}
const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').split(/[\s-]+/).filter(Boolean);
const content = (t: string) => words(t).filter((w) => !STOP.has(w) && w.length > 1).map(stem);
/** How many single edits (a letter in, out, changed, or two swapped) turn one word into the other. */
export function edits(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
    const c = a[i - 1] === b[j - 1] ? 0 : 1;
    d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1);
  }
  return d[a.length]![b.length]!;
}
const near = (a: string, b: string) => a !== b && Math.min(a.length, b.length) >= 4 && Math.abs(a.length - b.length) <= 2 && edits(a, b) <= (Math.max(a.length, b.length) >= 8 ? 2 : 1);

// ---- what Nexus knows the names of -------------------------------------------------------------------------------------
interface Known { name: string; says: string; where: string; tokens: string[] }
const KNOWN: Known[] = (() => {
  const out: Known[] = [];
  const walk = (ns: TaxNode[], up: string[]) => { for (const n of ns) { out.push({ name: n.name, says: n.says, where: [...up, n.name].join(' › '), tokens: [...new Set(content(`${n.name} ${n.says}`))] }); walk(n.children, [...up, n.name]); } };
  walk(TAXONOMY, []);
  return out;
})();
const TERMS: { name: string; domains: string[]; tokens: string[] }[] = (() => {
  const by = new Map<string, { name: string; domains: string[]; tokens: string[] }>();
  for (const d of DOMAINS) for (const t of d.terms) { const k = t.toLowerCase(); const e = by.get(k) ?? { name: t, domains: [], tokens: content(t) }; e.domains.push(d.name); by.set(k, e); }
  return [...by.values()].filter((t) => t.tokens.length);
})();
/** One of a thing: wheels a wheel, batteries a battery (only the plural taken off, nothing else). */
const singular = (w: string) => (w.length > 4 && w.endsWith('ies') ? `${w.slice(0, -3)}y` : w.length > 4 && /(ss|x|ch|sh)es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /[^su]s$/.test(w) ? w.slice(0, -1) : w);
/** Every word Nexus has a name with, by its stem, as one of it. */
const LEXICON = (() => { const m = new Map<string, string>(); for (const t of [...KNOWN.map((k) => k.name), ...TERMS.map((t) => t.name)]) for (const w of words(t)) if (w.length >= 4 && !STOP.has(w)) { const one = singular(w), was = m.get(stem(w)); if (!was || one.length < was.length) m.set(stem(w), one); } return m; })();
/** Every word Nexus writes anywhere (names, what each thing is for, its principles): spelled right, whatever it names. */
const WRITTEN = (() => { const s = new Set<string>(); const walk = (ns: TaxNode[]) => { for (const n of ns) { for (const t of [n.name, n.says, ...n.principles.map((p) => p.says)]) for (const w of words(t)) s.add(stem(w)); walk(n.children); } }; walk(TAXONOMY); for (const t of TERMS) for (const w of words(t.name)) s.add(stem(w)); return s; })();
/** One word in two spellings, British and American: neither is wrong. */
const VARIANT: [RegExp, string][] = [[/yre$/, 'ire'], [/our$/, 'or'], [/re$/, 'er'], [/ise$/, 'ize'], [/isation$/, 'ization'], [/ium$/, 'um'], [/ogue$/, 'og'], [/ae/, 'e'], [/ll/, 'l']];
const variants = (a: string, b: string) => VARIANT.some(([re, to]) => a.replace(re, to) === b || b.replace(re, to) === a);
const DF = (() => { const m = new Map<string, number>(); for (const k of KNOWN) for (const t of k.tokens) m.set(t, (m.get(t) ?? 0) + 1); return m; })();
const weight = (t: string) => Math.log(1 + KNOWN.length / (DF.get(t) ?? KNOWN.length));

/** A word spelled its own way, and the word Nexus has a name with that it is one edit or two from. */
export function spelling(w: string, also: Iterable<string> = []): string | null {
  // words as written, not as stems (cart is not casting), and none shorter than five letters: too many are words
  const raw = w.toLowerCase(), one = singular(raw), s = stem(raw); if (raw.length < 5 || STOP.has(raw) || LEXICON.has(s) || WRITTEN.has(s)) return null;
  for (const a of also) if (stem(a) === s) return null;
  let best: [string, number] | null = null;
  for (const v of new Set(LEXICON.values())) for (const x of [raw, one]) if (near(x, v) && !variants(x, v)) { const e = edits(x, v); if (!best || e < best[1]) best = [v, e]; }
  return best?.[0] ?? null;
}
/** What a description names: the taxonomy's entries that say most of what the words say, the rarest words weighing most. */
export function named(description: string, n = 3): { name: string; says: string; where: string; score: number }[] {
  const ws = new Set(content(description)); if (!ws.size) return [];
  return KNOWN.map((k) => { const hit = k.tokens.filter((t) => ws.has(t)); return { name: k.name, says: k.says, where: k.where, score: hit.length >= 2 ? hit.reduce((a, t) => a + weight(t), 0) : 0 }; })
    .filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, n);
}
/** The manifold's terms the words name outright ("a solar panel on it" names solar panel). */
export function termsIn(text: string): { name: string; domains: string[] }[] {
  const ws = new Set(content(text));
  return TERMS.filter((t) => t.tokens.every((x) => ws.has(x)) && t.tokens.join(' ').length >= 4).sort((a, b) => b.tokens.length - a.tokens.length).slice(0, 4);
}

// ---- the board: which node the words mean ------------------------------------------------------------------------------
const THIS = /^(this|it|that|this one|that one|this node|that node|here|the selected one)$/;
const clean = (p: string) => p.trim().replace(/^(the|a|an|my|our|some|this|that)\s+/i, '').replace(/[.?!,;:]+$/, '').trim();
const cap = (s: string) => s.replace(/^./, (c) => c.toUpperCase());
function refOf(phrase: string, b: Board, sel: string | null): { id?: string; label: string } {
  const p = phrase.trim().toLowerCase().replace(/[.?!,;:]+$/, '');
  if (THIS.test(p) && sel) return { id: sel, label: b.nodes[sel]!.label };
  const q = clean(phrase), ql = q.toLowerCase(), ns = nodesOf(b);
  const hit = ns.find((n) => n.label.toLowerCase() === ql) ?? ns.find((n) => stem(n.label) === stem(ql))
    ?? (ql.length >= 4 ? ns.find((n) => n.label.toLowerCase().includes(ql) || (n.label.length >= 4 && ql.includes(n.label.toLowerCase()))) : undefined)
    ?? (ql.length >= 4 ? ns.find((n) => near(stem(n.label.toLowerCase()), stem(ql))) : undefined);
  // a node to be made from the words is named with the words spelled as Nexus knows them: batery is a battery
  return hit ? { id: hit.id, label: hit.label } : { label: cap(q.split(/(\s+)/).map((w) => spelling(w) ?? w).join('')) };
}
const listOf = (t: string) => t.split(/\s*(?:,|\band\b|&|\bplus\b)\s*/i).map((x) => x.trim()).filter(Boolean);

type Ref = { id?: string; label: string };
/** A node a proposal names, on the board as it is when the proposal is taken: by its id, or by its label. */
export function resolve(b: Board, ref: string | undefined): string | undefined {
  if (!ref) return undefined;
  if (!ref.startsWith('@')) return b.nodes[ref] && !b.nodes[ref]!.deleted ? ref : undefined;
  const l = ref.slice(1).toLowerCase(); return nodesOf(b).find((n) => n.label.toLowerCase() === l)?.id;
}

/** A request on its own: it starts with what to do, or has a verb that says how one thing stands to another. */
const CLAUSE = /^(?:add|link|connect|join|attach|tie|hook|rename|call|name|unlink|disconnect|separate|detach|put|make|create)\b|\s(?:needs?|has|have|goes|go|belongs?|sits?|fits?|is|are|should|uses?|contains?|includes?|holds?|carries|runs on|takes)\s/i;
/** The requests in what was said: split at full stops, “then”, and at an “and” that joins two whole requests
 *  (“add a rim to wheel and the motor needs a battery”), not one that joins two things (“motor and battery go under power”). */
export function clauses(heard: string): string[] {
  const out: string[] = [];
  for (const part of heard.split(/[.;!?\n]+|\b(?:then|also|and then)\b/i).map((x) => x.trim()).filter(Boolean)) {
    let rest = part;
    for (;;) {
      const ands = [...rest.matchAll(/\s+and\s+/gi)];
      const at = ands.find((m) => CLAUSE.test(rest.slice(0, m.index)) && CLAUSE.test(` ${rest.slice(m.index! + m[0].length)}`));
      if (!at) break;
      out.push(rest.slice(0, at.index).trim()); rest = rest.slice(at.index! + at[0].length).trim();
    }
    out.push(rest);
  }
  return out.filter(Boolean);
}

/** What the words ask of the board, read by Nexus: the names, the spellings, the changes. */
export function understand(heard: string, b: Board, sel: string | null): Understanding {
  const terms: Term[] = [], proposals: Proposal[] = [], said: string[] = [];
  const labels = nodesOf(b).map((n) => n.label), adding = new Set<string>();
  const push = (p: Proposal) => { const k = JSON.stringify({ ...p, say: '' }); if (!proposals.some((q) => JSON.stringify({ ...q, say: '' }) === k)) proposals.push(p); };
  const ref = (r: Ref) => r.id ?? `@${r.label}`;
  /** A node that is not on the board yet is added, once. */
  const need = (r: Ref, under?: Ref) => { if (r.id || adding.has(r.label.toLowerCase())) return false; adding.add(r.label.toLowerCase()); push({ op: 'add', label: r.label, ...(under ? { under: ref(under) } : {}), say: `Add ${r.label}${under ? `, linked to ${under.label}` : ''}` }); return true; };
  /** One belongs with another: added linked to it if it is new, else linked to it. */
  const join = (child: Ref, parent: Ref) => { need(parent); if (!need(child, parent)) push({ op: 'link', a: ref(parent), c: ref(child), say: `Link ${child.label} to ${parent.label}` }); };
  for (const raw of clauses(heard)) {
    const tl = raw.replace(/^(please|can you|could you|i want to|i want you to|i'd like to|let's|lets|ok|okay|so|and|hey claude|claude)[,\s]+/i, '').trim().toLowerCase();
    let m: RegExpMatchArray | null;
    if ((m = tl.match(/^(.+?)\s+(?:is|are|'s)\s+(?:what|the (?:thing|part|one|bit) (?:that|which)|a (?:thing|part) (?:that|which)|something (?:that|which)|for|used for|there to|how)\s+(.+)$/))) {
      const subject = refOf(m[1]!, b, sel), hit = named(m[2]!)[0];
      if (hit && hit.score >= 2.5) {
        terms.push({ said: clean(m[2]!), means: hit.name, why: `${hit.where}: ${hit.says}` });
        if (subject.id && subject.label.toLowerCase() !== hit.name.toLowerCase()) push({ op: 'rename', node: subject.id, to: hit.name, say: `Rename ${subject.label} to ${hit.name}` });
        said.push(`${subject.label} is ${hit.name}`);
      } else said.push(`${subject.label} is something that ${clean(m[2]!)}`);
      continue;
    }
    if ((m = tl.match(/^(?:rename|call|name)\s+(.+?)\s+(?:to|as|into)\s+(.+)$/)) || (m = tl.match(/^(.+?)\s+(?:should be called|is called|should be|is really|is actually|means)\s+(?:a |an |the )?(.+)$/))) {
      const r = refOf(m[1]!, b, sel); if (r.id) { const to = cap(clean(m[2]!)); push({ op: 'rename', node: r.id, to, say: `Rename ${r.label} to ${to}` }); said.push(`${r.label} is ${to}`); continue; }
    }
    if ((m = tl.match(/^(?:unlink|disconnect|separate|detach|remove the link between|take)\s+(.+?)\s+(?:from|and|with|off|away from)\s+(.+)$/))) {
      const x = refOf(m[1]!, b, sel), y = refOf(m[2]!, b, sel);
      if (x.id && y.id) { push({ op: 'unlink', a: x.id, c: y.id, say: `Unlink ${x.label} and ${y.label}` }); said.push(`${x.label} and ${y.label} do not belong together`); }
      continue;
    }
    if ((m = tl.match(/^(?:link|connect|join|attach|tie|hook)\s+(.+?)\s+(?:to|with|and|onto|into|up to)\s+(.+)$/))) {
      const parent = refOf(m[2]!, b, sel); for (const x of listOf(m[1]!)) join(refOf(x, b, sel), parent);
      said.push(`${listOf(m[1]!).map((x) => refOf(x, b, sel).label).join(', ')} with ${parent.label}`); continue;
    }
    if ((m = tl.match(/^(?:add|put|make|create|new|there is|there are|there's)\s+(?:a |an |some |new )?(.+?)(?:\s+(?:to|under|in|into|inside|on|for|below|beneath|with)\s+(.+))?$/))) {
      const parent = m[2] ? refOf(m[2], b, sel) : sel ? { id: sel, label: b.nodes[sel]!.label } : undefined;
      for (const x of listOf(m[1]!)) { const r = refOf(x, b, sel); if (parent) join(r, parent); else need(r); }
      said.push(`${listOf(m[1]!).map((x) => refOf(x, b, sel).label).join(', ')}${parent ? ` with ${parent.label}` : ''}`); continue;
    }
    if ((m = tl.match(/^(.+?)\s+(?:goes|go|belongs?|sits?|fits?|is|are|comes?|should go|should be|lives?)\s+(?:under|in|inside|into|within|below|beneath|part of|a part of|a kind of|one of|with)\s+(.+)$/))) {
      const parent = refOf(m[2]!, b, sel); for (const x of listOf(m[1]!)) join(refOf(x, b, sel), parent);
      said.push(`${listOf(m[1]!).map((x) => refOf(x, b, sel).label).join(', ')} under ${parent.label}`); continue;
    }
    if ((m = tl.match(/^(.+?)\s+(?:needs?|has|have|uses?|contains?|includes?|is made of|holds?|carries|is powered by|runs on|takes)\s+(?:a |an |some |the )?(.+)$/)) && !/\b(that|which|who)\b/.test(m[1]!)) {
      const parent = refOf(m[1]!, b, sel); for (const x of listOf(m[2]!)) join(refOf(x, b, sel), parent);
      said.push(`${parent.label} has ${listOf(m[2]!).map((x) => refOf(x, b, sel).label).join(', ')}`); continue;
    }
  }
  // the names for what was described, where the words describe rather than name
  const desc = named(heard), outright = termsIn(heard);
  for (const o of outright) terms.push({ said: o.name, means: o.name, why: `a term of ${o.domains.slice(0, 3).join(', ')} in the build domain manifold` });
  if (desc[0] && desc[0].score >= 2.5 && !terms.some((t) => t.means === desc[0]!.name) && !outright.some((o) => o.name.toLowerCase() === desc[0]!.name.toLowerCase())) {
    terms.push({ said: heard.length > 60 ? `${heard.slice(0, 57)}…` : heard, means: desc[0].name, why: `${desc[0].where}: ${desc[0].says}` });
    // a vague node, or the one being described: named for what the words say it does
    const target = sel && /\b(this|it|that)\b/i.test(heard) ? sel : nodesOf(b).find((n) => /^(thing|stuff|part|thingy|thingamajig|whatchamacallit|that thing|the thing|something|\?+)$/i.test(n.label.trim()))?.id;
    if (target && b.nodes[target]!.label.toLowerCase() !== desc[0].name.toLowerCase()) push({ op: 'rename', node: target, to: desc[0].name, say: `Rename ${b.nodes[target]!.label} to ${desc[0].name}` });
  }
  // spellings: in what was said, and on the board
  for (const w of new Set(words(heard))) { const sp = spelling(w, labels.flatMap((l) => words(l))); if (sp) terms.push({ said: w, means: sp, why: `spelled like ${sp}, a word Nexus names things with` }); }
  // a label's spelling, only for words the person said, or when they ask about spelling
  const spoke = new Set(words(heard)), all = /\bspell/i.test(heard);
  for (const n of nodesOf(b)) {
    const fixed = n.label.split(/(\s+)/).map((w) => { const bare = w.replace(/[^a-z]/gi, ''), sp = /^\s+$/.test(w) || !(all || spoke.has(bare.toLowerCase())) ? null : spelling(bare); return sp ? (/^[A-Z]/.test(w) ? cap(sp) : sp) : w; }).join('');
    if (fixed !== n.label) push({ op: 'rename', node: n.id, to: fixed, say: `Rename ${n.label} to ${fixed} (the spelling)` });
  }
  const named2 = terms.filter((t) => t.said !== t.means).map((t) => `“${t.said}” is ${t.means}`);
  const understood = said.length || proposals.length
    ? `I take it you mean: ${[...said, ...named2].join('; ') || proposals.map((p) => p.say).join('; ')}.`
    : terms.length ? `${terms.map((t) => (t.said === t.means ? `${t.means} is ${t.why}` : `“${t.said}” sounds like ${t.means}: ${t.why}`)).join('; ')}.`
      : `I heard “${heard}”, and found no change in it and no name for it. Say it another way: “wheels go under motion”, “add rim and tyre to wheels”, “rename moter to motor”, or describe the thing (“the part that keeps it from rolling away”).`;
  return { heard, understood, terms, proposals, by: 'nexus' };
}

/** What Claude read, made safe: each change it proposes names a node on the board (by id or label), or one it adds. */
export function checked(raw: unknown, b: Board): Omit<Understanding, 'by' | 'heard'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { understood?: unknown; terms?: unknown; proposals?: unknown }, adding = new Set<string>();
  const ref = (s: unknown): string | undefined => { const l = String(s ?? '').trim(); if (!l) return undefined; const id = resolve(b, l) ?? resolve(b, `@${l}`); return id ?? (adding.has(l.toLowerCase()) ? `@${l}` : undefined); };
  const name = (x: string) => (x.startsWith('@') ? x.slice(1) : b.nodes[x]!.label);
  const terms = (Array.isArray(r.terms) ? r.terms : []).slice(0, 8).map((t) => ({ said: String((t as Term).said ?? '').slice(0, 80), means: String((t as Term).means ?? '').slice(0, 80), why: String((t as Term).why ?? '').slice(0, 200) })).filter((t) => t.means);
  const proposals: Proposal[] = [];
  for (const p of (Array.isArray(r.proposals) ? r.proposals : []).slice(0, 16) as Record<string, unknown>[]) {
    const op = String(p.op ?? '');
    if (op === 'rename') { const id = ref(p.node), to = String(p.to ?? '').trim().slice(0, 140); if (id && !id.startsWith('@') && to) proposals.push({ op, node: id, to, say: `Rename ${name(id)} to ${to}` }); }
    else if (op === 'add') { const label = String(p.label ?? '').trim().slice(0, 140); if (!label || ref(label)) continue; const under = ref(p.under); adding.add(label.toLowerCase()); proposals.push({ op, label, ...(under ? { under } : {}), say: `Add ${label}${under ? `, linked to ${name(under)}` : ''}` }); }
    else if (op === 'link' || op === 'unlink') { const a = ref(p.a), c = ref(p.c); if (a && c && a !== c) proposals.push({ op, a, c, say: `${op === 'link' ? 'Link' : 'Unlink'} ${name(c)} ${op === 'link' ? 'to' : 'and'} ${name(a)}` }); }
  }
  const understood = String(r.understood ?? '').trim().slice(0, 600);
  return understood || proposals.length ? { understood: understood || proposals.map((p) => p.say).join('; '), terms, proposals } : null;
}

/** What Claude is given when it is called on a board: who is calling and why, the board as the links make it, the node
 *  open, Nexus's own reading as a hint, and the answer to give, as data. */
export function claudePrompt(heard: string, b: Board, sel: string | null, local: Understanding): string {
  const d = derive(b), ns = nodesOf(b).slice(0, 220), es = edgesOf(b).slice(0, 320), label = (id: string) => b.nodes[id]?.label ?? id;
  return `You are Claude, called by the person on a node board in the Nexus forge, a room in VR. They are human and find it hard to say exactly what they mean: their words may be rough, run together, misspelled, or describe a thing whose name they do not know. Look at the board and work out what they mean. Say it back plainly, give them the right names for what they described, and propose the changes to the board they are after. Propose only what they asked for or clearly meant; never invent numbers.

A board is words and links. What each node is comes from its links: it sits under its most connected neighbour, when that neighbour has more links than it; a node no neighbour outranks heads a category. So to put X under Y, link them (Y needs more links than X to be above it).

The board "${b.title}" (${ns.length} nodes, ${es.length} links):
${ns.map((n) => `- ${n.label} [${levelOf(d, n.id)}, ${d.deg.get(n.id) ?? 0} links${d.parent.get(n.id) ? `, under ${label(d.parent.get(n.id)!)}` : ''}]`).join('\n')}
Links: ${es.map((e) => `${label(e.from)} — ${label(e.to)}${e.rel && e.rel !== 'connects' ? ` (${e.rel})` : ''}`).join('; ') || 'none yet'}
${sel ? `The node open in front of them: ${label(sel)}.` : 'No node is open.'}

What they said, as they said it: "${heard}"

Nexus's own plain reading of it (a hint, often incomplete): ${local.understood}${local.proposals.length ? ` Its proposals: ${local.proposals.map((p) => p.say).join('; ')}.` : ''}

Answer with JSON only, in this shape:
{"understood": "one or two plain sentences to them, saying back what they mean", "terms": [{"said": "their word or phrase", "means": "the right name for it", "why": "a few words on what it is"}], "proposals": [{"op": "rename", "node": "<a node's label>", "to": "<new label>"}, {"op": "add", "label": "<new node's label>", "under": "<the label of the node it links to, if any>"}, {"op": "link", "a": "<label>", "c": "<label>"}, {"op": "unlink", "a": "<label>", "c": "<label>"}]}
Use node labels exactly as they are on the board. A node you add can be named by its label in the proposals after it. Labels are short: a word or a few.`;
}

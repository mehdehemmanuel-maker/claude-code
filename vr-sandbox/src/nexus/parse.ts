// The grammar of an ask, without knowing what any thing in it is: its words, the clauses they fall into, the thing
// each clause names (its head noun and the words before it that only qualify it), the verb each clause does, and
// every number with the words on either side of it. What the things and verbs mean is read elsewhere (conceive.ts);
// here is only where each word stands, so that "a bed sheet" is a sheet and not a bed, "a shelf robot" a robot,
// "holds 4 TB" a holding of something that is not a weight, and "lifts 1.2 m" a travel and not a width.
//
// English puts the thing a phrase names last ("a kitchen drawer insert" is an insert), the words before it qualify
// it, and a relative word starts what it does ("that folds", "which tilts", "whose bed lifts"); "with" starts what it
// has; "for", "so" and "to" what it is for; a preposition a place or another thing ("into a pot", "from jugs").

import { findQuantities, type Said } from '../ganglia/units';

export interface Tok { w: string; at: number; /** the hyphenated group it belongs to ("wall-mounted" is one) */ grp: number; num: boolean; punct: boolean; /** covered by a quantity said with its unit */ q: number | null }
export type ClauseKind = 'main' | 'does' | 'has' | 'for' | 'where';
export interface Clause {
  kind: ClauseKind; opener: string; from: number; to: number; text: string;
  /** the thing it names, and the words before it that qualify it */ head: string | null; headAt: number; mods: string[];
  /** what it does: its verb, the words after it, and for "whose", what does it */ verb: string | null; verbAt: number; obj: number[]; subj: string | null;
}
export interface Number_ { said: Said | null; text: string; value: number; tok: number; end: number; clause: number; before: string[]; after: string[]; /** a number said as the first of two ("6 x 6 cm") */ by: number | null }
export interface Parse { src: string; t: string; toks: Tok[]; clauses: Clause[]; nums: Number_[] }

const DET = new Set(['a', 'an', 'the', 'my', 'our', 'your', 'his', 'her', 'its', 'their', 'this', 'these', 'those', 'some', 'any', 'each', 'every', 'all', 'no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'twelve', 'several', 'many', 'few', 'both', 'another', 'other', 'same', 'whole']);
const DOES = new Set(['that', 'which', 'who', 'whose']);
const HAS = new Set(['with', 'having', 'featuring', 'including', 'has', 'have']);
const FOR = new Set(['for', 'so', 'because']);
const WHERE = new Set(['on', 'in', 'at', 'into', 'onto', 'from', 'under', 'over', 'between', 'through', 'near', 'beside', 'of', 'by', 'inside', 'above', 'below', 'around', 'underneath', 'along', 'against', 'behind', 'within', 'across', 'past', 'toward', 'towards', 'outside', 'beneath', 'among', 'like', 'than', 'via', 'per', 'during', 'until', 'after', 'before', 'without', 'when', 'even', 'if', 'unless', 'while']);
const AND = new Set(['and', 'or', 'but', 'then', 'plus', 'also']);
const SKIP = new Set(['can', 'could', 'will', 'would', 'should', 'must', 'may', 'also', 'then', 'just', 'only', 'automatically', 'always', 'never', 'still', 'even', 'each', 'both', 'all', 'it', 'they', 'is', 'are', 'be', 'to', 'not', 'really', 'actually', 'safely', 'quietly']);
/** Words after a verb that finish it rather than start a place: "measures out", "folds flat", "lifts up". */
const PARTICLE = new Set(['out', 'up', 'down', 'off', 'away', 'back', 'over', 'flat', 'open', 'shut', 'closed', 'apart', 'together', 'around', 'in']);
/** Words that say which way a number goes ("75 cm high", "300 mm across"): part of the number, not a thing. */
export const ROLE_WORDS = new Set(['tall', 'high', 'height', 'wide', 'width', 'across', 'diameter', 'deep', 'depth', 'long', 'length', 'thick', 'thickness', 'square', 'round', 'big', 'large', 'small', 'tiny', 'sized', 'size', 'up', 'away', 'off', 'apart', 'altitude', 'elevation', 'gap', 'span', 'travel', 'stroke', 'radius', 'around', 'total', 'each', 'apiece', 'or', 'less', 'more', 'max', 'maximum', 'minimum', 'min']);

/** Verbs, as their plain forms, so that a word can be told to be one whatever its ending ("folds", "stepped",
 *  "running", "carries"): what opens what a thing does in a list, and what a thing does rather than is. */
const VERB_BASE = new Set(('hold carry move roll spin turn rotate revolve open close shut swing fold unfold slide glide lift raise lower hoist keep store contain '
  + 'warm heat cool chill freeze enclose cover shelter house float fly hover sit stand rest lean measure dispense pour fill refill pump stop run read send show display '
  + 'glow light play ring beep sense detect track follow climb crawl walk swim enter exit leave kill seal graft harm tilt dangle hang charge power drive deliver travel '
  + 'ride clean wash cut print cook make sort pick place grab grip water feed mix blend grind spray paint last work weigh fit collapse expand extend retract telescope lock '
  + 'unlock plug connect link talk listen record compute process see lower reach support bear take bring push pull lean stack sits lie flip tip rock bounce jump balance '
  + 'steer brake land orbit shade block reflect absorb collect generate convert produce sit rain grow drain flow vent breathe sail paddle row pedal wind spool reel stretch '
  + 'bend twist squeeze press clamp hook attach mount hang carry deploy unroll rotate glow blink vibrate hum sing play lift tow haul drag dig drill saw sand polish '
  + 'scan photograph film stream transmit receive charge sleep wake count dose portion fold iron dry wet spray mist heat boil brew bake fry toast chill keep is are be has have').split(' '));
export function isVerb(w: string): boolean {
  if (VERB_BASE.has(w)) return true;
  const tries = [w.replace(/ies$/, 'y'), w.replace(/ied$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/(.)\1(ing|ed)$/, '$1')];
  return tries.some((x) => x !== w && x.length > 2 && VERB_BASE.has(x));
}

/** The words of an ask, its clauses, the thing and the verb of each, and every number with the words around it. */
export function parseAsk(words: string): Parse {
  const src = ` ${words.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()} `, t = src.toLowerCase();
  const toks: Tok[] = []; let grp = 0, last = -2;
  for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|[a-zµμ°%"'][a-z0-9µμ°'²³^/]*|[,;:()!?]|\.(?=\s)/g)) {
    const w = m[0]!.replace(/^'+|'+$/g, ''), at = m.index!; if (!w) continue;
    // joined to the token before it by a hyphen ("wall-mounted", "40-micrometre"): one group
    if (!(at === last + 2 && t[at - 1] === '-')) grp++;
    toks.push({ w, at, grp, num: /^\d/.test(w), punct: /^[,;:()!?.]$/.test(w), q: null });
    last = at + m[0]!.length - 1;
  }
  // every number said with its unit, over the tokens it covers
  const qs = findQuantities(src);
  qs.forEach((q, k) => { const i = toks.findIndex((x) => x.num && (x.at === q.at || x.at === q.at + 1)); if (i < 0) return; const n = q.text.replace(/^-/, '').split(/[\s-]+/).length; for (let j = i; j < Math.min(toks.length, i + n); j++) toks[j]!.q = k; });
  const starts = (i: number) => i === 0 || toks[i - 1]!.grp !== toks[i]!.grp;
  const word = (i: number) => { const x = toks[i]; return !!x && !x.num && !x.punct && x.q === null && /^[a-z]/.test(x.w); };
  const verbAt = (i: number) => word(i) && starts(i) && !DET.has(toks[i]!.w) && !WHERE.has(toks[i]!.w) && isVerb(toks[i]!.w);
  /** After "and" or a mark: past the words of a thing ("the whole staircase"), is there a verb before the next mark? */
  const verbAfterThing = (i: number) => { for (let j = i; j < toks.length; j++) { const x = toks[j]!; if (x.punct || DOES.has(x.w) || WHERE.has(x.w) || HAS.has(x.w) || AND.has(x.w) || FOR.has(x.w)) return -1; if (j > i && verbAt(j) && !DET.has(toks[j - 1]!.w)) return j; } return -1; };
  // the clauses: each starts at a word that opens one, or after a mark; a list after a mark goes on as the one before
  const clauses: (Clause & { part?: boolean })[] = [];
  // a clause ends where the word or mark that opens the next stands
  const open = (kind: ClauseKind, opener: string, from: number) => { const c0 = clauses.at(-1); if (c0) c0.to = opener && from > c0.from ? from - 1 : from; clauses.push({ kind, opener, from, to: toks.length, text: '', head: null, headAt: -1, mods: [], verb: null, verbAt: -1, obj: [], subj: null }); return clauses.at(-1)!; };
  const host = () => clauses.findLast((c) => c.kind !== 'where' && c.kind !== 'for' && !c.part) ?? clauses[0]!;
  open('main', '', 0);
  for (let i = 0; i < toks.length; i++) {
    const x = toks[i]!, cur = clauses.at(-1)!, next = toks[i + 1];
    if (x.q !== null || x.num) continue;
    // a word of a group is a word of what the group says: only the group's first word can open a clause
    if (!starts(i)) continue;
    if (x.punct) {
      if (x.w === ':') { open('main', ':', i + 1); continue; }
      if (x.w === ',' || x.w === ';' || x.w === '(' || x.w === ')') {
        const n2 = next?.w ?? ''; if (DOES.has(n2) || HAS.has(n2) || FOR.has(n2) || WHERE.has(n2) || AND.has(n2)) continue;
        // a list goes on as the clause it is a list of: a verb starts another thing it does, a thing another of the same
        if (verbAt(i + 1)) open('does', ',', i + 1);
        else { const v = verbAfterThing(i + 1); if (v >= 0) { const c = open('does', ',', i + 1); c.subj = toks[v - 1]!.w; c.verb = toks[v]!.w; c.verbAt = v; i = v; } else if (host().kind !== 'does') open(host().kind, ',', i + 1); /* else more of what it acts on, in the clause it is in */ }
      }
      continue;
    }
    // "out", "up", "flat" after a verb finish it; a word after a number may say which way the number goes
    if (PARTICLE.has(x.w) && cur.verbAt === i - 1) continue;
    const p = toks[i - 1]; if (p && (p.q !== null || p.num) && ROLE_WORDS.has(x.w)) continue;
    if (DOES.has(x.w)) { open('does', x.w, i + 1); continue; }
    if (HAS.has(x.w) && !(x.w === 'has' && cur.kind === 'does' && cur.verb === null)) { open('has', x.w, i + 1); continue; }
    if (x.w === 'to' && next && !next.num && !DET.has(next.w) && next.q === null && isVerb(next.w)) { open('for', 'to', i + 1); continue; }
    if (FOR.has(x.w)) { open('for', x.w, i + 1); continue; }
    if (WHERE.has(x.w) || x.w === 'to') { open('where', x.w, i + 1); continue; }
    if (AND.has(x.w)) {
      // "and runs a month": another thing it does; "and the whole staircase rotates": another, said of a thing;
      // "and a door": another thing of the same kind, where things are being named; "and the sun": more of the same
      if (next && (DOES.has(next.w) || HAS.has(next.w) || FOR.has(next.w) || WHERE.has(next.w))) continue;
      let k = i + 1; while (toks[k] && word(k) && (SKIP.has(toks[k]!.w) || /ly$/.test(toks[k]!.w))) k++;
      if (verbAt(k)) { open('does', x.w, i + 1); continue; }
      const v = verbAfterThing(i + 1);
      if (v >= 0) { const c = open('does', x.w, i + 1); c.subj = toks[v - 1]!.w; c.verb = toks[v]!.w; c.verbAt = v; i = v; continue; }
      if ((cur.kind === 'main' || cur.kind === 'has') && next && (DET.has(next.w) || next.num || next.q !== null)) open(cur.kind, x.w, i + 1);
      else if ((cur.kind === 'where' || cur.kind === 'for' || cur.part) && next && (DET.has(next.w) || next.num) && host().kind !== 'does') open(host().kind, x.w, i + 1);
      continue;
    }
    // a word that does something after a thing ("a balloon floating", "a habitat hanging"): what that thing does
    if ((cur.kind === 'main' || cur.kind === 'has') && /(ing|ed|en)$/.test(x.w) && x.w.length > 4 && isVerb(x.w) && cur.head === null && headOf(toks, cur.from, i) !== null && !(next && word(i + 1) && !DET.has(next.w) && !WHERE.has(next.w) && !AND.has(next.w) && !DOES.has(next.w) && !isVerb(next.w))) {
      const h = headOf(toks, cur.from, i)!; cur.head = h.head; cur.headAt = h.at; cur.mods = h.mods; const c = open('does', '', i); c.part = true; c.subj = h.head; c.verb = x.w; c.verbAt = i; continue;
    }
    if (cur.kind === 'does' && cur.verb === null) {
      if (SKIP.has(x.w) && x.w !== 'is' && x.w !== 'are' || /ly$/.test(x.w)) continue;
      // "whose bed lifts": what does it comes first, then the verb
      if (cur.opener === 'whose') { if (verbAt(i) && i > cur.from) { const h = headOf(toks, cur.from, i); cur.subj = h?.head ?? null; cur.verb = x.w; cur.verbAt = i; } continue; }
      cur.verb = x.w; cur.verbAt = i;
    }
  }
  for (const c of clauses) {
    c.text = toks.slice(c.from, c.to).filter((x) => !x.punct).map((x, k, xs) => (k && xs[k - 1]!.grp === x.grp ? '-' : k ? ' ' : '') + x.w).join('');
    if (c.kind !== 'does' && c.head === null) { const h = headOf(toks, c.from, c.to); if (h) { c.head = h.head; c.headAt = h.at; c.mods = h.mods; } }
    if (c.kind === 'does' && c.verbAt >= 0) c.obj = Array.from({ length: Math.max(0, c.to - c.verbAt - 1) }, (_, k) => c.verbAt + 1 + k);
  }
  // every number: with its unit or without one ("8 cores", "4 TB"), with the words on either side of it in its clause
  const nums: Number_[] = [];
  const clauseOf = (i: number) => clauses.findIndex((c) => i >= c.from && i < c.to);
  const around = (i: number, end: number) => { const b: string[] = [], a: string[] = []; for (let j = i - 1; j >= Math.max(0, i - 6); j--) { if (toks[j]!.punct) break; b.push(toks[j]!.w); } for (let j = end; j < Math.min(toks.length, end + 6); j++) { if (toks[j]!.punct) break; a.push(toks[j]!.w); } return { before: b, after: a }; };
  const phrase = (from: number, n: number) => { let out = '', k = 0; for (let j = from; j < toks.length && k < n; j++) { const x = toks[j]!; if (x.punct || (starts(j) && (DOES.has(x.w) || WHERE.has(x.w) || AND.has(x.w)))) break; out += (j > from && toks[j - 1]!.grp === x.grp ? '-' : ' ') + x.w; if (j + 1 >= toks.length || toks[j + 1]!.grp !== x.grp) k++; } return out; };
  for (let i = 0; i < toks.length; i++) {
    const x = toks[i]!; if (!x.num) continue;
    const qk = x.q, said = qk !== null ? qs[qk]! : null; let end = i + 1; while (end < toks.length && qk !== null && toks[end]!.q === qk) end++;
    const v = Number(x.w.replace(/,/g, '')), x2 = toks[i + 1], n2 = toks[i + 2];
    // "6 x 6 cm": the first number is said in the second's unit
    if (!said && x2 && /^(x|×|by)$/.test(x2.w) && n2?.num && n2.q !== null) { const s2 = qs[n2.q]!; nums.push({ said: { ...s2, value: v, si: (v * s2.si) / s2.value, text: `${x.w} ${s2.unit}` }, text: `${x.w} × ${s2.text}`, value: v, tok: i, end: i + 1, clause: clauseOf(i), ...around(i, i + 1), by: nums.length + 1 }); continue; }
    nums.push({ said, text: said ? said.text : `${x.w}${phrase(i + 1, 2)}`, value: said ? said.value : v, tok: i, end, clause: clauseOf(i), ...around(i, end), by: null });
  }
  return { src, t, toks, clauses, nums };
}

/** The thing a run of words names: its last word that is not a number, a unit, a word saying which way a number goes,
 *  or a word that only points (a, the, my); and the words before it that qualify it. */
function headOf(toks: Tok[], from: number, to: number): { head: string; at: number; mods: string[] } | null {
  let at = -1;
  const starts = (i: number) => i === 0 || toks[i - 1]!.grp !== toks[i]!.grp;
  for (let i = from; i < to; i++) {
    const x = toks[i]!;
    if (x.punct) break;
    if (!starts(i)) { if (at >= 0 && toks[at]!.grp === x.grp) at = i; continue; }
    if (x.num || x.q !== null || DET.has(x.w) && !(toks[i + 1] && toks[i + 1]!.grp === x.grp) || SKIP.has(x.w)) continue;
    const p = toks[i - 1];
    if (p && (p.q !== null || p.num) && ROLE_WORDS.has(x.w)) continue;
    if (WHERE.has(x.w) || DOES.has(x.w) || HAS.has(x.w) || FOR.has(x.w) || AND.has(x.w)) break;
    // "full of", "made of", "able to": a word after the thing that says what it is, not what it is called
    if (at >= 0 && /^(full|empty|made|able|capable|ready|enough|fit|filled|free|safe|strong|light|heavy)$/.test(x.w)) break;
    // a word that does something, once there is a thing before it, ends the thing ("a balloon floating")
    if (at >= 0 && /(ing|ed)$/.test(x.w) && x.w.length > 4 && isVerb(x.w)) break;
    at = i;
  }
  if (at < 0) return null;
  const g = toks[at]!.grp, first = toks.findIndex((x) => x.grp === g), last = toks[first]!.num || toks[first]!.q !== null ? null : first;
  // a group that begins with a number ("4-deck") names its last word
  const ws = toks.filter((x) => x.grp === g), head = last === null ? ws.at(-1)!.w : ws.map((x) => x.w).join('-');
  const mods: string[] = []; const groups = new Map<number, Tok[]>();
  for (let i = from; i < first; i++) { const x = toks[i]!; if (x.punct) continue; const gg = groups.get(x.grp) ?? []; gg.push(x); groups.set(x.grp, gg); }
  for (const gg of groups.values()) { if (gg.every((x) => x.num || x.q !== null) || (gg.length === 1 && (DET.has(gg[0]!.w) || ROLE_WORDS.has(gg[0]!.w)))) continue; mods.push(gg.filter((x) => !(x.num || x.q !== null) || gg.length > 1).map((x) => x.w).join('-')); }
  return { head, at: first, mods };
}

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

export interface Tok { w: string; at: number; /** the hyphenated group it belongs to ("wall-mounted" is one) */ grp: number; num: boolean; punct: boolean; /** covered by a quantity said with its unit */ q: number | null; /** a word saying how big ("the size of") */ size?: boolean }
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
const WHERE = new Set(['as', 'on', 'in', 'at', 'into', 'onto', 'from', 'under', 'over', 'between', 'through', 'near', 'beside', 'of', 'by', 'inside', 'above', 'below', 'around', 'underneath', 'along', 'against', 'behind', 'within', 'across', 'past', 'toward', 'towards', 'outside', 'beneath', 'among', 'like', 'than', 'via', 'per', 'during', 'until', 'after', 'before', 'without', 'when', 'even', 'if', 'unless', 'while']);
const AND = new Set(['and', 'or', 'but', 'then', 'plus', 'also']);
const SKIP = new Set(['can', 'could', 'will', 'would', 'should', 'must', 'may', 'also', 'then', 'just', 'only', 'automatically', 'always', 'never', 'still', 'even', 'each', 'both', 'all', 'it', 'they', 'is', 'are', 'be', 'to', 'not', 'really', 'actually', 'safely', 'quietly', 'about', 'roughly', 'nearly', 'approximately', 'exactly', 'almost', 'barely', 'some', 'very', 'so', 'too']);
/** How an ask is put, before what is asked for: "I want", "Can you design", "Make me": no part of the thing. */
const ASKING = /^\s*(?:(?:please|hey|hi|ok|okay|so)[,\s]+)*(?:(?:(?:can|could|would|will)\s+you\s+)?(?:please\s+)?(?:design|make|build|create|invent|draw|devise|engineer|come up with|give|get|show|imagine|think up)\s+(?:me\s+|us\s+)?|(?:i\s*|i'm\s+|we\s+)?(?:want|need|would like|'d like|wish for|am looking for|looking for|are looking for|would love)\s+(?:you\s+to\s+(?:design|make|build|create|invent)\s+(?:me\s+)?)?|(?:my|our|his|her|their)\s+(?:[a-z'-]+\s+){1,3}(?:needs|wants|would like|could use)\s+)/i;
/** What is said before the ask ("our front door floods every year, so I need a flood barrier…", "we have a 45 cm oak and
 *  want a treehouse platform…"): the ask is what follows, and what came before is where it is, said after it. */
const LEAD = /^(.{8,}?)(?:[,;.!?]\s*|\s+)(?:so\s+|and\s+|but\s+)?(?:(?:i|we)\s+(?:really\s+|just\s+|also\s+)?(?:need|want|would like|'d like|am looking for|are looking for)|(?:and\s+)?want|(?:can|could|would)\s+you\s+(?:please\s+)?(?:design|make|build|come up with)|please\s+(?:design|make|build))\s+(?=(?:a|an|the|some|one|two|three|four|five|six|\d)\b)/i;
/** "What would a 4 cm robot look like that burrows…": a question about the thing, read as asking for it. */
const LOOKS = /^\s*what\s+would\s+(.+?)\s+look\s+like\s+(that|which|if|with)\b/i;
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
  + 'scan photograph film stream transmit receive charge sleep wake count dose portion fold iron dry wet spray mist heat boil brew bake fry toast chill keep is are be has have survive withstand endure weather resist '
  + 'stay remain assemble pitch span cross reach pack unpack inflate deflate deploy hold carry lift lower haul pull tow store hang open shut cool warm sit stand').split(' '));
export function isVerb(w: string): boolean {
  if (VERB_BASE.has(w)) return true;
  const tries = [w.replace(/ies$/, 'y'), w.replace(/ied$/, 'y'), w.replace(/es$/, ''), w.replace(/s$/, ''), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/(.)\1(ing|ed)$/, '$1')];
  return tries.some((x) => x !== w && x.length > 2 && VERB_BASE.has(x));
}

/** The words of an ask, its clauses, the thing and the verb of each, and every number with the words around it. */
export function parseAsk(words: string): Parse {
  let w0 = words.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();
  // "I have a 14 foot gate and I want it to swing open on its own": the gate, that swings open
  w0 = w0.replace(/^(?:(?:so|well|ok|okay)[,\s]+)?(?:i|we)\s+(?:have|own|'ve got|have got|got)\s+((?:a|an|the|my|our)\s+.+?)\s*,?\s+and\s+(?:i|we)\s+(?:want|need|would like|'d like)\s+(?:it|them)\s+to\s+/i, '$1 that ');
  if (!ASKING.test(w0) && !LOOKS.test(w0)) { const m = LEAD.exec(w0); if (m) w0 = `${w0.slice(m[0].length).replace(/[.!?\s]+$/, '')}, while ${m[1]!.replace(/^(?:so|well|ok|okay|hi|hey)[,\s]+/i, '').replace(/^(?:i|we)\s+(?:have|own|'ve got|have got|got)\s+/i, 'by ')}`; }
  // "6-9 kg bags": a range of one unit, read at its worst, the most
  w0 = w0.replace(/\b(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(kg|lbs?|g|mm|cm|m|kw|w|kn|n)\b/gi, (m0, a: string, b2: string, u: string) => (Number(b2) > Number(a) ? `${b2} ${u}` : m0));
  // "for at least a year", "lasting a week": one of it
  w0 = w0.replace(/\b(for|lasting|lasts|last|through|over)\s+(at least\s+|about\s+|around\s+)?(?:a|an|one)\s+(year|month|week|day|night|hour)\b/gi, '$1 $21 $3');
  // "5 cloudy days", "12 straight hours": the time, its word after it
  w0 = w0.replace(/\b(\d+(?:\.\d+)?)\s+(cloudy|sunny|rainy|dark|overcast|winter|summer|straight|full|whole|working|consecutive|long|cold|hot)\s+(days?|hours?|nights?|weeks?|months?)\b/gi, '$1 $3 $2');
  const src = ` ${w0.replace(LOOKS, '$1 $2').replace(ASKING, '')} `, t = src.toLowerCase();
  const toks: Tok[] = []; let grp = 0, last = -2;
  for (const m of t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?|[a-zµμ°%"'][a-z0-9µμ°'²³^/]*|[,;:()!?×]|\.(?=\s)/g)) {
    const w = m[0]!.replace(/^'+|'+$/g, ''), at = m.index!; if (!w) continue;
    // joined to the token before it by a hyphen ("wall-mounted", "40-micrometre"): one group
    if (!(at === last + 2 && t[at - 1] === '-')) grp++;
    toks.push({ w, at, grp, num: /^\d/.test(w), punct: /^[,;:()!?.]$/.test(w), q: null });
    last = at + m[0]!.length - 1;
  }
  // "the size of", "the same size as", "as big as": words that say how big, not what it is (so not its name)
  for (let i = 0; i < toks.length; i++) { const w = toks[i]!.w, n1 = toks[i + 1]?.w, n2 = toks[i + 2]?.w;
    if (w === 'size' && (n1 === 'of' || n1 === 'as')) { toks[i]!.size = true; if (toks[i - 1] && /^(the|same)$/.test(toks[i - 1]!.w)) toks[i - 1]!.size = true; if (toks[i - 2]?.w === 'the' && toks[i - 1]?.w === 'same') toks[i - 2]!.size = true; }
    if (w === 'as' && n1 && /^(big|large|small|tiny|tall|wide|long|heavy|light)$/.test(n1) && n2 === 'as') { toks[i]!.size = true; toks[i + 1]!.size = true; } }
  // every number said with its unit, over the tokens it covers
  const qs = findQuantities(src);
  // (a sign said in words, "minus 40 C", puts the number past where the quantity starts)
  qs.forEach((q, k) => { const sw = /^minus\s+/i.exec(q.text)?.[0].length ?? 0, i = toks.findIndex((x) => x.num && (x.at === q.at + sw || x.at === q.at + sw + 1)); if (i < 0) return; const n = q.text.replace(/^-|^minus\s+/i, '').split(/[\s-]+/).length; for (let j = i; j < Math.min(toks.length, i + n); j++) toks[j]!.q = k; });
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
      // "a welding cart: carries two cylinders…": after its name, what it does; else more of what it is
      if (x.w === ':') { open(verbAt(i + 1) ? 'does' : 'main', ':', i + 1); continue; }
      // a sentence that ends and one that goes on of the same thing ("…without tearing them? It has to close…"): what it
      // does next, its "it" left out
      if ((x.w === '.' || x.w === '?' || x.w === '!') && /^(it|they|this)$/.test(next?.w ?? '') && verbAt(i + 2)) { open('does', x.w, i + 2); clauses.at(-2)!.to = i; i++; continue; }
      // any other sentence after it says something new: what it does where a verb comes first ("Must hold…") or after
      // what does it ("One person assembles it"), else another thing said of it ("Panels max 12 kg each")
      if ((x.w === '.' || x.w === '?' || x.w === '!') && next && word(i + 1) && clauses.length) {
        if (DOES.has(next.w) || HAS.has(next.w) || FOR.has(next.w) || WHERE.has(next.w) || AND.has(next.w)) continue;
        if (verbAt(i + 1)) { open('does', x.w, i + 1); continue; }
        const v = verbAfterThing(i + 1); if (v >= 0) { const c = open('does', x.w, i + 1); c.subj = toks[v - 1]!.w; c.verb = toks[v]!.w; c.verbAt = v; i = v; continue; }
        open('main', x.w, i + 1); continue;
      }
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
    // "to raise a person", "to keep a cat in": what it is for is something it does
    if (x.w === 'to' && next && !next.num && !DET.has(next.w) && next.q === null && isVerb(next.w)) { const c = open('does', 'to', i + 1); c.verb = next.w; c.verbAt = i + 1; i++; continue; }
    if (FOR.has(x.w)) { open('for', x.w, i + 1); continue; }
    // "capable of cutting and retrieving a core": what it does
    if (x.w === 'of' && /^(capable|able|incapable)$/.test(toks[i - 1]?.w ?? '') && next && isVerb(next.w)) { const c = open('does', 'of', i + 1); c.verb = next.w; c.verbAt = i + 1; i++; continue; }
    if (WHERE.has(x.w) || x.w === 'to') { open('where', x.w, i + 1); continue; }
    if (AND.has(x.w)) {
      // "and runs a month": another thing it does; "and the whole staircase rotates": another, said of a thing;
      // "and a door": another thing of the same kind, where things are being named; "and the sun": more of the same
      if (next && (DOES.has(next.w) || HAS.has(next.w) || FOR.has(next.w) || WHERE.has(next.w))) continue;
      // "…that can shed microplastics, and no fixed piles": another thing it must not have, not more of what it does
      if (next && /^(no|without)$/.test(next.w) && cur.kind === 'does' && !verbAt(i + 2)) { open('main', x.w, i + 1); continue; }
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
      // "that an ordinary adult can use": a thing first, then what it does; a word that names no thing is not the verb
      if (DET.has(x.w)) { const v = verbAfterThing(i); if (v >= 0) { cur.subj = toks[v - 1]!.w; cur.verb = toks[v]!.w; cur.verbAt = v; i = v; } continue; }
      // "whose bed lifts": what does it comes first, then the verb
      if (cur.opener === 'whose') { if (verbAt(i) && i > cur.from) { const h = headOf(toks, cur.from, i); cur.subj = h?.head ?? null; cur.verb = x.w; cur.verbAt = i; } continue; }
      cur.verb = x.w; cur.verbAt = i;
    }
  }
  for (const c of clauses) {
    // (a number said below nothing keeps its sign: "from -160 °C")
    c.text = toks.slice(c.from, c.to).filter((x) => !x.punct).map((x, k, xs) => (k && xs[k - 1]!.grp === x.grp ? '-' : k ? ' ' : '') + (x.num && t[x.at - 1] === '-' && /\s/.test(t[x.at - 2] ?? ' ') ? '-' : '') + x.w).join('');
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
    const v = Number(x.w.replace(/,/g, ''));
    // "6 x 6 cm", "60 x 40 x 15 cm": each number of a chain said in the unit of the last, each one's partner the next,
    // and all of them read by the words before the chain and after it, as one size
    const chain = [i]; let k2 = i + 1;
    while (!said && toks[k2] && /^(x|×|by)$/.test(toks[k2]!.w) && toks[k2 + 1]?.num) { chain.push(k2 + 1); if (toks[k2 + 1]!.q !== null) break; k2 += 2; }
    const tail = chain.length > 1 && toks[chain.at(-1)!]!.q !== null ? toks[chain.at(-1)!]! : null;
    if (tail) {
      const s2 = qs[tail.q!]!; let tend = chain.at(-1)! + 1; while (tend < toks.length && toks[tend]!.q === tail.q) tend++;
      const ctx = { before: around(i, i + 1).before, after: around(i, tend).after }, base = nums.length;
      chain.forEach((j, m) => { const vj = Number(toks[j]!.w.replace(/,/g, '')), sj = m === chain.length - 1 ? s2 : { ...s2, value: vj, si: (vj * s2.si) / s2.value, text: `${toks[j]!.w} ${s2.unit}` }; nums.push({ said: sj, text: sj.text, value: vj, tok: j, end: m === chain.length - 1 ? tend : j + 1, clause: clauseOf(j), ...ctx, by: m < chain.length - 1 ? base + m + 1 : null }); });
      i = tend - 1; continue;
    }
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
    if (x.size) break;
    if (x.num || x.q !== null || DET.has(x.w) && !(toks[i + 1] && toks[i + 1]!.grp === x.grp) || SKIP.has(x.w)) continue;
    // "100 x 62 mm": the times sign of a chain of sizes, not a thing
    if (/^(x|×)$/.test(x.w) && toks[i - 1]?.num && toks[i + 1]?.num) continue;
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

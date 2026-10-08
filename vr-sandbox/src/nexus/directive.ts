// What a person says, read into a directive: the one thing to do (make something, bring people in, set them fighting,
// take something away, change a body) and what is still to ask before it can be done. Claude reads it where Claude can
// be asked (one call: the person's words in, a directive and any questions out); elsewhere it is read here, by the same
// rules every time. Either way what comes out is the same kind of directive, and one place carries it out.
//
// A directive that needs nothing more passes straight on; one that does asks its questions first, and the answers are
// read into it (src/nexus/view/forge.ts carries it out).

export type Directive =
  /** design and build it by the intent pipeline, or put the inventory's own in the room */
  | { act: 'make'; what: string; n: number; words: string }
  /** people in the room, by real physics: a body grown from a genome, a fighter, a man, a woman, a child */
  | { act: 'person'; who: 'person' | 'man' | 'woman' | 'child' | 'fighter'; n: number; sex?: 'XX' | 'XY'; words: string }
  /** the fighters in the room set on each other */
  | { act: 'fight'; words: string }
  /** where you are, or how the world is: a place (a beach at sunset, Mars, a cabin in a snowstorm), the weather, the time
   *  of day, gravity, your size (src/nexus/places.ts reads the words) */
  | { act: 'place'; words: string }
  /** something picked at random to be made or brought in (src/nexus/surprise.ts) */
  | { act: 'surprise'; words: string }
  /** take away what was made last, everything, or what is named */
  | { act: 'remove'; what: string; words: string }
  /** not a directive: talk, a question, a command of its own; passed on as it was said */
  | { act: 'pass'; words: string };
export interface Parsed { directive: Directive; questions: string[]; by: 'claude' | 'nexus'; heard: string }

const NUM: Record<string, number> = { a: 1, an: 1, one: 1, another: 1, some: 2, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, 'a couple of': 2, 'a few': 3, several: 3 };
const LEAD = /^(?:(?:please|pls|hey|yo|ok(?:ay)?|so|now|nexus|claude|jarvis)[,:!]?\s+|(?:can|could|would|will) you\s+|(?:i want you to|i'd like you to|i would like you to|go ahead and|let's|lets|try to|just)\s+)+/i;
const MAKE = /^(?:generate|spawn|summon|create|make|build|design|craft|produce|conjure|construct|give|bring|put|add|place|drop|get|show|render|model|grow|draw|i want|i need|i'd like|i would like|id like|let me have|let me see|can i have|can i get|gimme|i wanna see|i want to see)\b\s*(?:me|us|out|in|up|here)?\s*/i;
const PLACE = /^(?:(?:take|put|bring|send|teleport|drop|transport|beam|fly|place|get) (?:me|us)\b|(?:go|let'?s go|i (?:want|wanna|would like|'d like) to go|travel|head|fly) (?:to|into|on|onto|in|over|under|through)\b|let (?:me|us) (?:go|be|walk|stand|swim|fly|explore|visit|see|stroll|run|float|dive|sit|have a snowball)\b|(?:turn|make|change|transform) (?:this|the) (?:room|place|world|scene|forge|space) (?:into|to)\b|show me what\b|(?:make|turn|let) it (?:rain|snow|be night|be day|night|day|dark|sunny|stormy|sunset|sunrise|morning|evening)\b|it'?s (?:raining|snowing|night)\b|(?:turn|switch) (?:off|on) (?:the )?gravity\b|(?:turn|switch) (?:the )?gravity\b|(?:no|zero|low|half|double|moon|mars|jupiter|normal|earth) gravity\b|gravity\b|shrink me\b|make me (?:tiny|small|smaller|big|bigger|huge|giant|the size of)\b|(?:i want to be|i wanna be|i'?d like to be) (?:on|in|at|under|tiny|small|the size)\b|teach me to (?:surf|ski|swim|snowboard|dive)\b|(?:(?:let'?s|i (?:want|wanna|would like|'d like) to|can (?:we|i)|we should) )?go (?:go[- ]?)?kart(?:ing|s)?\b|(?:(?:let'?s|i (?:want|wanna) to|can (?:we|i)) )?(?:race|drive) (?:a |some |the )?(?:go[- ]?)?karts?\b|(?:(?:let'?s|i (?:want|wanna) to|can (?:we|i)) )?(?:play|shoot) (?:some |a game of )?(?:pool|darts|billiards)\b|(?:go )?(?:back to|return to) (?:the )?(?:forge|room|start|normal)\b|beam me up\b)/i;
const SURPRISE = /^(?:surprise me|(?:make|build|generate|spawn|show|give|create)(?: me)? (?:something|anything)(?: (?:random|cool|new|fun|surprising|interesting|crazy|wild))?(?: for me)?|(?:something|anything) (?:random|at random)|random(?: (?:thing|build|stuff|scene|invention|generation|idea))?|roll the dice|dealer'?s choice|you (?:pick|choose|decide)|pick (?:something|anything)(?: for me)?|anything|whatever|go wild|i'?m feeling lucky|feeling lucky|🎲)$/i;
const REMOVE = /^(?:remove|delete|get rid of|throw (?:away|out)|take (?:away|out)|discard|despawn|unspawn|destroy|erase|bin|trash|scrap|dismiss|clear(?: away)?|put away|close|undo|lose|kill)\b\s*/i;
const PEOPLE = /^(?:(?:mma |ufc |martial arts? )?(?:fighters?|boxers?|kickboxers?|wrestlers?|brawlers?)|(?:humans?|persons?|people|men|man|women|woman|guys?|lad(?:y|ies)|girls?|boys?|child(?:ren)?|kids?|bab(?:y|ies)|crowd)|(?:mma|ufc)(?: (?:guy|man|woman|human))?)\b/i;

/** The directive the words say, read here by rule: a make word and what to make, a remove word and what, people, a
 *  fight; anything else passed on as it was said. */
export function readPlain(text: string): Parsed {
  const heard = text.trim(), t = heard.replace(LEAD, '').replace(/[.!]+$/, '').trim(), pass = (): Parsed => ({ directive: { act: 'pass', words: heard }, questions: [], by: 'nexus', heard });
  if (PLACE.test(t)) return { directive: { act: 'place', words: heard }, questions: [], by: 'nexus', heard };
  if (SURPRISE.test(t)) return { directive: { act: 'surprise', words: heard }, questions: [], by: 'nexus', heard };
  if (/^(?:fight|spar|box|start (?:the )?fight|let them fight|make them fight|have them fight|fight each other)\b/i.test(t)) return { directive: { act: 'fight', words: heard }, questions: [], by: 'nexus', heard };
  // "throw it away", "take the chair out", "put that away"
  const away = /^(?:throw|take|put|clear)\s+(.+?)\s+(?:away|out|off)$/i.exec(t);
  if (away && !/^(?:3d|exploded|parts|view|phone|window|board|panel|keyboard|chat|apps?)\b/i.test(away[1]!.replace(/^(?:the|that|this)\s+/i, ''))) {
    const r = away[1]!.replace(/^(?:the|that|this|those|these|my)\s+/i, '').trim();
    return { directive: { act: 'remove', what: /^(?:it|that|this|them|one)$/i.test(r) ? 'last' : /^(?:everything|all|it all)$/i.test(r) ? 'all' : r, words: heard }, questions: [], by: 'nexus', heard };
  }
  const rm = REMOVE.exec(t);
  if (rm) {
    const rest = t.slice(rm[0].length).replace(/^(?:the|that|this|those|these|my|our|of)\s+/i, '').trim();
    // "close the 3d view", "put away the phone": the forge's own words, passed on
    if (/^(?:3d|exploded|parts|view|phone|window|board|panel|keyboard|chat|apps?)\b/i.test(rest) && !/^undo$/i.test(rm[0].trim())) return pass();
    const what = !rest || /^(?:it|that|this|them|one|last(?: one)?|the last one|thing)$/i.test(rest) ? 'last' : /^(?:everything|all|it all|all of (?:it|them)|the lot|whole thing|room|table|build)$/i.test(rest) ? 'all' : rest.replace(/^(?:the|a|an)\s+/i, '');
    return { directive: { act: 'remove', what, words: heard }, questions: [], by: 'nexus', heard };
  }
  const mk = MAKE.exec(t);
  if (!mk) {
    // a bare thing named with a count or an article ("5 random people", "a fighter") is a make too
    if (!/^(?:\d+|a|an|another|two|three|four|five)\s+\S/i.test(t)) return pass();
  }
  let rest = mk ? t.slice(mk[0].length) : t;
  // what is the forge's own: make it bigger, build it step by step, show me the flaws, show the pipeline
  if (/^(?:it|this|that|them|the (?:machine|flaws?|pipeline|rounds?|laws?|bill|parts|board|gates?)|what|why|how|where)\b/i.test(rest)) return pass();
  let n = 1;
  const cnt = /^(\d+|a couple of|a few|several|some|another|an|a|one|two|three|four|five|six|seven|eight|nine|ten)\s+/i.exec(rest);
  if (cnt) { n = /^\d+$/.test(cnt[1]!) ? Number(cnt[1]) : NUM[cnt[1]!.toLowerCase()] ?? 1; rest = rest.slice(cnt[0].length); }
  rest = rest.replace(/^(?:the|my|our|your|new|random|different|real|whole)\s+/gi, '').replace(/^(?:the|my|our|your|new|random|different|real|whole)\s+/gi, '').trim();
  // words that trail the thing and are not it: "a chair instead", "a boat please", "a car for me now"
  rest = rest.replace(/(?:\s+(?:instead|please|pls|now|right now|for me|for us|too|as well|again|quickly|real quick|here|there|thanks|thank you))+$/i, '').trim();
  if (!rest) return pass();
  n = Math.max(1, Math.min(12, n));
  // people: a people word that the thing asked for ends on ("a fighter", "a tall woman", "two strong men with beards")
  const ppl = new RegExp(`^(?:(?!(?:for|of|with|to|in|on|at|by|from|a|an|the|like)\\b)[a-z-]+\\s+){0,3}?(${PEOPLE.source.slice(1, -2)})\\b(?:\\s+(?:with|who|that|for|of|in|from|at|to|and)\\b.*)?$`, 'i').exec(rest);
  if (ppl) {
    const w = ppl[1]!.toLowerCase(), who: 'person' | 'man' | 'woman' | 'child' | 'fighter' = /fight|box|wrestl|brawl|mma|ufc|martial/.test(w) ? 'fighter' : /child|kid|bab/.test(w) ? 'child' : /^(?:men|man|guy|boy)/.test(w) ? 'man' : /^(?:women|woman|lad|girl)/.test(w) ? 'woman' : 'person';
    const sex = /\b(?:female|woman|women|girl|lady|ladies|she|her)\b/i.test(t) ? 'XX' as const : /\b(?:male|man|men|guy|boy|he|him)\b/i.test(t) && who !== 'person' ? 'XY' as const : undefined;
    return { directive: { act: 'person', who, n: /people|crowd|men|women|children|kids|fighters|boxers/.test(w) && !cnt ? 2 : n, ...(sex ? { sex } : {}), words: heard }, questions: [], by: 'nexus', heard };
  }
  return { directive: { act: 'make', what: rest, n, words: heard }, questions: [], by: 'nexus', heard };
}

/** What Claude is asked: the person's words, the directives there are, and what is in the room; a JSON answer. */
export function directivePrompt(text: string, room: { made: string[]; people: string[]; pending?: { directive: Directive; questions: string[]; answers: string[] } }): string {
  return `You read what a person in a VR room says into ONE directive for the room to carry out. Reply with JSON only:
{"directive": {"act": "make" | "person" | "fight" | "place" | "surprise" | "remove" | "pass", ...}, "questions": [string]}

The directives:
- make: {"act":"make","what":"<the thing, plain words, with any sizes or needs said>","n":<how many, 1-12>} for anything to build, generate, spawn or show: a car, a chair, a guitar, a drone, a house, a sword. Keep the person's own numbers in "what".
- person: {"act":"person","who":"person"|"man"|"woman"|"child"|"fighter","n":<1-12>,"sex":"XX"|"XY" (only if said)} for people or bodies: "an MMA fighter", "five random people", "a woman".
- fight: {"act":"fight"} to set the fighters in the room on each other.
- place: {"act":"place"} to go somewhere or change the world: "take me to Mars", "put me on a beach at sunset", "turn this room into a cabin in a snowstorm", "make it rain", "turn gravity off", "shrink me to the size of an ant".
- surprise: {"act":"surprise"} when they ask you to pick: "surprise me", "make something random", "anything", "you choose".
- remove: {"act":"remove","what":"last"|"all"|"<what is named>"} to take something away: remove it, delete that, get rid of the chair, undo, clear everything.
- pass: {"act":"pass"} for anything else: a question, talk, a change to what is there ("make it bigger"), a command for a panel.

Ask questions ONLY when the directive cannot be carried out without an answer and no sensible default exists; otherwise "questions": [] and the directive passes straight on. Never ask more than two. Most asks need none.
${room.pending ? `\nYou asked before: ${room.pending.questions.join(' ')} (for ${JSON.stringify(room.pending.directive)}). Their answers so far: ${room.pending.answers.join(' | ') || 'none'}. Fold this message's answer into the directive.` : ''}
In the room now: made: ${room.made.slice(0, 12).join(', ') || 'nothing'}; people: ${room.people.slice(0, 12).join(', ') || 'none'}.

They said: ${JSON.stringify(text)}`;
}

/** Claude's answer, checked: a directive of a known kind with what it needs, else null (and it is read here). */
export function checkDirective(j: unknown, heard: string): Parsed | null {
  if (!j || typeof j !== 'object') return null;
  const o = j as { directive?: Record<string, unknown>; questions?: unknown }, d = o.directive; if (!d || typeof d !== 'object') return null;
  const qs = Array.isArray(o.questions) ? o.questions.filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 2) : [];
  const n = Math.max(1, Math.min(12, Math.round(Number(d.n) || 1)));
  switch (d.act) {
    case 'make': return typeof d.what === 'string' && d.what.trim() ? { directive: { act: 'make', what: d.what.trim(), n, words: heard }, questions: qs, by: 'claude', heard } : null;
    case 'person': { const who = ['person', 'man', 'woman', 'child', 'fighter'].includes(String(d.who)) ? (d.who as 'person') : 'person'; return { directive: { act: 'person', who, n, ...(d.sex === 'XX' || d.sex === 'XY' ? { sex: d.sex } : {}), words: heard }, questions: qs, by: 'claude', heard }; }
    case 'fight': return { directive: { act: 'fight', words: heard }, questions: qs, by: 'claude', heard };
    case 'surprise': return { directive: { act: 'surprise', words: heard }, questions: [], by: 'claude', heard };
    case 'place': return { directive: { act: 'place', words: heard }, questions: qs, by: 'claude', heard };
    case 'remove': return { directive: { act: 'remove', what: typeof d.what === 'string' && d.what.trim() ? d.what.trim() : 'last', words: heard }, questions: qs, by: 'claude', heard };
    case 'pass': return { directive: { act: 'pass', words: heard }, questions: [], by: 'claude', heard };
    default: return null;
  }
}

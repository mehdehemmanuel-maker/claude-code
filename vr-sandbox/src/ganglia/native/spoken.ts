// The spoken form of Nex (docs/EGO-NATIVE-LANGUAGE.md section E): the compact text read aloud, one word per glyph,
// in English or Spanish, and heard back to the same text. It is not a translation (translate.ts is, and counts what
// it loses): it is the structure itself, said, with nothing dropped, so a listener who knows the seven words can hear
// every coordinate. The words: "of" opens the arguments, "and" separates them, "end" closes; "with" opens the
// coordinates and "so" closes them; "is" binds a key to its value; "in" gives a quantity's unit; "list" opens a list.
//
//   influence of load and current end with dir is 1 polarity is plus necessity is contributing strength is 0.8
//   cert is with kind is interval lo is 0.9 hi is 1 source is epistemic so time is with delay is 0.01 in s so so

import type { Structure } from './core';
import { read, text } from './text';

export type SpokenLang = 'en' | 'es';

const GLYPHS: Record<SpokenLang, Record<string, string>> = {
  en: { '(': 'of', ',': 'and', ')': 'end', '{': 'with', '}': 'so', ':': 'is', '[': 'in', ']': 'endin', list: 'list', endlist: 'endlist', '+': 'plus', '-': 'minus', '|': 'given' },
  es: { '(': 'de', ',': 'y', ')': 'fin', '{': 'con', '}': 'así', ':': 'es', '[': 'en', ']': 'finen', list: 'lista', endlist: 'finlista', '+': 'más', '-': 'menos', '|': 'dado' },
};

/** Tokens of the compact text: brackets, braces, commas, colons, bars, quoted strings, and bare words. */
function tokens(src: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) { i++; continue; }
    if ('()[]{},:|'.includes(ch)) { out.push(ch); i++; continue; }
    if (ch === '"') { let j = i + 1; while (j < src.length && src[j] !== '"') { if (src[j] === '\\') j++; j++; } out.push(src.slice(i, j + 1)); i = j + 1; continue; }
    let j = i; while (j < src.length && !/[\s()[\]{},:|]/.test(src[j]!)) j++;
    out.push(src.slice(i, j)); i = j;
  }
  return out;
}

/** Say a structure: its compact text, glyph by glyph, in the words of a language. A unit's words and a list's items are said as they are; a lone + or − (a polarity) is said as a word. */
export function speak(s: Structure, lang: SpokenLang = 'en'): string {
  const G = GLYPHS[lang];
  const tk = tokens(text(s));
  const out: string[] = [];
  // a square bracket after a number opens a unit; after a colon it opens a list
  let unit = false;
  for (let i = 0; i < tk.length; i++) {
    const t = tk[i]!;
    if (t === '[') { unit = i > 0 && /^-?(?:\d|\.\d|NaN|Infinity)/.test(tk[i - 1]!) && tk[i - 1] !== ':'; out.push(unit ? G['[']! : G.list!); continue; }
    if (t === ']') { out.push(unit ? G[']']! : G.endlist!); unit = false; continue; }
    // a unit's symbols are said as they are ("-" is the dimensionless unit, not a polarity)
    if (unit) { out.push(t); continue; }
    if (t === '+' || t === '-') { out.push(G[t]!); continue; }
    // a name that is one of the spoken words is said in quotes, so it is never heard as a glyph
    if (G[t] === undefined && Object.values(G).includes(t)) { out.push(JSON.stringify(t)); continue; }
    out.push(G[t] ?? t);
  }
  return out.join(' ');
}

/** Hear a spoken structure back: the words to glyphs, then the text read. A word that is also an id ("end" as a name) must have been quoted. */
export function hear(said: string, lang: SpokenLang = 'en'): Structure {
  const G = GLYPHS[lang];
  const back = new Map<string, string>();
  for (const [glyph, word] of Object.entries(G)) back.set(word, glyph === 'list' ? '[' : glyph === 'endlist' ? ']' : glyph);
  const words: string[] = [];
  let i = 0;
  // quoted strings are one word; the rest split on spaces
  while (i < said.length) {
    if (/\s/.test(said[i]!)) { i++; continue; }
    if (said[i] === '"') { let j = i + 1; while (j < said.length && said[j] !== '"') { if (said[j] === '\\') j++; j++; } words.push(said.slice(i, j + 1)); i = j + 1; continue; }
    let j = i; while (j < said.length && !/\s/.test(said[j]!)) j++;
    words.push(said.slice(i, j)); i = j;
  }
  let out = '';
  let inUnit = false;
  for (const w of words) {
    const g = back.get(w);
    if (g === '[' && w === G['[']) { out += '['; inUnit = true; continue; }
    if (g === ']' && w === G[']']) { out += ']'; inUnit = false; continue; }
    if (inUnit) { out += (out.endsWith('[') ? '' : ' ') + w; continue; }
    if (g === undefined) { out += (out && !out.endsWith('(') && !out.endsWith('[') && !out.endsWith('{') && !out.endsWith(':') ? ' ' : '') + w; continue; }
    if (g === '(' || g === '[' || g === '{') out += g;
    else if (g === ')' || g === ']' || g === '}') out += g;
    else if (g === ',') out += ', ';
    else if (g === ':') out += ':';
    else if (g === '|') out += ' | ';
    else if (g === '+' || g === '-') out += g; // a polarity
  }
  return read(out.replace(/\s+\)/g, ')').replace(/\(\s+/g, '(').replace(/\{\s+/g, '{').replace(/\s+\}/g, '}').replace(/\s+,/g, ','));
}

// Where an ask to make something goes, decided once, from the ask itself: the intent pipeline (what it must do, under
// the laws), the inventor (what turns one thing into another, as a chain of real effects), a kit (a thing named
// plainly), a place, or the inventory's own thing; and, whatever makes it, what of the ask was not done, said. The
// forge only carries the decision out (src/nexus/view/forge.ts, `perform`), so it can be read, and tested, here.
//
// The thing it is is what is said before what it does or has: "a drone" of "a drone that plants trees". A kit is found
// by that, never by a word in what it does (that made nine sunflowers of a drone that plants trees, and a brick house
// of a printer that prints houses).

import { conceive, type Conception } from './conceive';
import { invent, type Invention } from './invent';
import { INVENTORY, type Item } from './inventory';
import { kitFor, type Kit } from './kits';
import { PLACES } from './places';

export interface Route {
  /** what makes it */ by: 'design' | 'invent' | 'kit' | 'place' | 'inventory' | 'none';
  words: string; head: string; rest: string; conception: Conception;
  kit?: Kit; invention?: Invention; item?: Item;
  /** what of the ask was not done, and why, said beside what was made ('' where all of it was) */ notDone: string;
}

/** The inventory's own thing the words name: by its whole name (a kettle, a 3D printer), else the name it ends on (a
 *  drill: the cordless drill), never a word inside another's name (a car is not a carabiner). */
export function namedInInventory(words: string): Item | null {
  const w = words.trim().toLowerCase().replace(/\s+/g, ' '), forms = [...new Set([w, w.replace(/(?<=[^s])s$/, ''), w.replace(/es$/, '')])], ok = (i: Item) => i.kind !== 'material' && i.kind !== 'element';
  for (const f of forms) { const byId = INVENTORY.get(f.replace(/ /g, '-')); if (byId && ok(byId)) return byId; }
  const base = (i: Item) => i.name.toLowerCase().replace(/\s*\(.*\)\s*$/, '').replace(/,.*$/, '');
  const all = [...INVENTORY.values()].filter(ok);
  return all.find((i) => forms.includes(base(i))) ?? all.filter((i) => forms.some((f) => base(i).endsWith(` ${f}`))).sort((a, b) => (a.kind === 'product' ? 0 : 1) - (b.kind === 'product' ? 0 : 1))[0] ?? null;
}

/** Where an ask to make `what` goes (n of it), and what of it would not be done. */
export function routeMake(what: string, n = 1): Route {
  const words = `${n > 1 ? `${n} different ` : 'a '}${what}`, c = conceive(words);
  const head = what.split(/\s+(?:that|which|who|with|for|to|so|powered|running|runs|using|made)\b/i)[0]!.trim() || what, rest = what.slice(head.length).trim();
  const kit = kitFor(head) ?? undefined, notRead = c.asked.filter((a) => !a.got && a.kind !== 'for' && a.kind !== 'limit');
  // (what it is, made by a kit or the inventory, is done: only what it does or has, unread, is not)
  const notDone = (() => { const xs = notRead.filter((a) => a.kind !== 'thing').map((a) => `${a.text}${a.why ? ` (${a.why})` : ''}`); if (!xs.length && rest && !c.asked.some((a) => rest.includes(a.text.replace(/^an? /, '')))) xs.push(`"${rest}" was not read`); return xs.length ? ` Not done, honestly: ${xs.join('; ')}; it is made as a plain ${head}.` : ''; })();
  const base = { words, head, rest, conception: c };
  // a need said with its numbers (a cart that carries 150 kg) is designed; a thing named plainly a kit makes, where one does
  const needs = /\d+(?:\.\d+)?\s*(?:kg|t|tonnes?|m²|m2|m|km|km\/h|m\/s|°c|l|litres?|liters?|w|kw|kwh|people|persons?|bikes|kids|mm)\b/i.test(what);
  // what turns one thing into another, where the pipeline cannot read it into a want: invented
  const invented = notRead.length || !c.wants.length ? invent(what) : null;
  if (c.wants.length && (needs || !kit) && !invented?.chains.length) return { ...base, by: 'design', notDone: '' };
  if (invented?.chains.length) return { ...base, by: 'invent', invention: invented, notDone: '' };
  if (kit) return { ...base, by: 'kit', kit, notDone };
  if (c.wants.length) return { ...base, by: 'design', notDone: '' };
  { const w = what.toLowerCase(); if (PLACES.some((x) => { const m = x.words.exec(w); return m && m.index <= 16; })) return { ...base, by: 'place', notDone: '' }; }
  const whole = namedInInventory(what), item = whole ?? namedInInventory(head);
  if (item) return { ...base, by: 'inventory', item, notDone: whole ? '' : notDone };
  return { ...base, by: 'none', notDone: '' };
}

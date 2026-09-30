// Search everything from the tablet: parts, materials, joints, tools, your builds and world actions, as you type.
// Every word you type must match the start of a word of an entry (its name, category, id or the words a builder uses
// for it); whole-word and name matches rank first.

import { CONNECTOR_KINDS } from '../connectors/registry';
import { MATERIALS, MATERIAL_GROUPS } from '../data/materials';
import { PART_KINDS } from '../parts/registry';
import { KIND_WORDS } from '../forge/catalog';
import type { Item } from './icons';

export interface Entry {
  item: Item;
  label: string;
  sub: string;
  words: string[];
}

const split = (s: string) => s.toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);

export function catalogEntries(): Entry[] {
  const out: Entry[] = [];
  for (const k of PART_KINDS) {
    out.push({ item: { type: 'part', id: k.id }, label: k.label, sub: `Part · ${k.category}`, words: [...split(k.label), ...split(k.id), ...split(k.category), ...(KIND_WORDS[k.id] ?? []), 'part'] });
  }
  const groupOf = new Map<string, string>();
  for (const g of MATERIAL_GROUPS) for (const id of g.ids) groupOf.set(id, g.label);
  for (const m of MATERIALS) {
    out.push({ item: { type: 'material', id: m.id }, label: m.name, sub: `Material · ${groupOf.get(m.id) ?? m.category}`, words: [...split(m.name), ...split(m.id), ...split(m.category), ...split(groupOf.get(m.id) ?? ''), 'material'] });
  }
  out.push({ item: { type: 'joint', id: 'auto' }, label: 'Best join', sub: 'Joint · picks for the materials', words: ['best', 'join', 'auto', 'joint', 'connect', 'attach', 'stick', 'fasten'] });
  for (const c of CONNECTOR_KINDS) {
    out.push({ item: { type: 'joint', id: c.id }, label: c.label, sub: `Joint · ${c.category}`, words: [...split(c.label), ...split(c.id), ...split(c.category), 'joint', 'join'] });
  }
  return out;
}

/** Entries matching every word of the query, best first. */
export function search(entries: Entry[], query: string, limit = 60): Entry[] {
  const q = split(query);
  if (!q.length) return [];
  const scored: { e: Entry; s: number }[] = [];
  for (const e of entries) {
    let s = 0;
    const name = split(e.label);
    let all = true;
    for (const w of q) {
      const inName = name.some((x) => x.startsWith(w));
      const inWords = inName || e.words.some((x) => x.startsWith(w));
      if (!inWords) { all = false; break; }
      s += (inName ? 3 : 1) + (name.includes(w) || e.words.includes(w) ? 2 : 0);
    }
    if (all) scored.push({ e, s: s - e.label.length / 100 });
  }
  return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.e);
}

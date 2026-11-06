// The parts the AI (or a person) built, remembered (decision 0028: "save for later use each part"). Each is a library
// block of its own (a folded board, its chosen settings its inputs), kept where the app runs: in a page, the browser's
// store, the same one the blocks a person saves are kept in; on claude.ai also the page's shared store, so a part lasts
// across devices and reaches the session that builds the app; under Node (the relay, the evaluations) for the run. The
// next build recalls them by their words before it builds anything again.
import type { Board } from './boards';
import { block, register } from './blocks';
import { groupBlock } from './dataflow';

/** A part remembered: a saved block (as the AI's tools and the pages already keep one) and what it was made for. */
export interface SavedPart {
  id: string; name: string; says: string; domains: string[]; graph: Board;
  /** the request it was built for, in the person's words */
  from: string;
  /** when it was made (ISO) */
  made: string;
  /** what was checked when it was kept: its pieces, the groups they fall in, the nodes failing (0 to keep it) */
  checked: { pieces: number; groups: number; failing: number };
  /** how many builds have used it since */
  uses: number;
  tags: string[];
  by: 'ai' | 'you';
}
/** A store kept apart from the page (the page's shared store on claude.ai): every part, and one put. */
export interface Remote { all(): Promise<SavedPart[]>; put(p: SavedPart): Promise<void> }

const KEY = 'nexus.nodeblocks.v1';
let mem: SavedPart[] = [], remote: Remote | null = null;
const local = (): Storage | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
const read = (): SavedPart[] => { const s = local(); if (!s) return mem; try { return (JSON.parse(s.getItem(KEY) ?? '[]') as Partial<SavedPart>[]).map(full); } catch { return []; } };
const write = (all: SavedPart[]): void => { const s = local(); if (!s) { mem = all; return; } try { s.setItem(KEY, JSON.stringify(all)); } catch { mem = all; } };
/** A block saved before this module (an id, a name, says, domains and a board) read as a part, its other fields filled. */
const full = (p: Partial<SavedPart>): SavedPart => ({ id: String(p.id), name: String(p.name ?? p.id), says: String(p.says ?? ''), domains: p.domains ?? ['mechanical'], graph: p.graph as Board,
  from: p.from ?? '', made: p.made ?? '', checked: p.checked ?? { pieces: 0, groups: 0, failing: 0 }, uses: p.uses ?? 0, tags: p.tags ?? [], by: p.by ?? 'you' });
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'part';
/** Two boards the same thing: their nodes' blocks, settings and wires, ids and places aside. */
const digest = (g: Board): string => JSON.stringify(Object.values(g.nodes ?? {}).filter((n) => !n.deleted).map((n) => [n.block, n.set ?? {}]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))
  + JSON.stringify(Object.values(g.edges ?? {}).filter((e) => !e.deleted).length);
/** Its block put in the library (once): a saved part is placed like any other block. */
const registerOne = (p: SavedPart): void => { if (block(p.id) || !p.graph) return; try { register(groupBlock(p.graph, { id: p.id, name: p.name, says: p.says, domains: p.domains, by: 'you' })); } catch { /* one that no longer opens is left out */ } };

/** Every part remembered here. */
export function savedParts(): SavedPart[] { return read(); }
/** Every remembered part put in the library as a block: called once where the app starts. */
export function registerSaved(): number { const all = read(); for (const p of all) registerOne(p); return all.length; }
/** Remember a part: one already kept with the same board is used again (its uses counted), else it is kept under a new id
 *  (`my.<name>`), registered as a block, and sent to the remote store when there is one. */
export function remember(p: { name: string; says: string; domains?: string[]; graph: Board; from: string; checked: SavedPart['checked']; tags?: string[]; by?: 'ai' | 'you' }): SavedPart {
  const all = read(), d = digest(p.graph), same = all.find((x) => x.graph && digest(x.graph) === d);
  if (same) { same.uses++; write(all); return same; }
  let id = `my.${slug(p.name)}`, k = 2; while (all.some((x) => x.id === id) || (block(id) && !all.some((x) => x.id === id))) id = `my.${slug(p.name)}-${k++}`;
  const part: SavedPart = { id, name: p.name, says: p.says, domains: p.domains ?? ['mechanical'], graph: p.graph, from: p.from, made: new Date().toISOString(), checked: p.checked, uses: 0, tags: p.tags ?? [], by: p.by ?? 'ai' };
  all.push(part); write(all); registerOne(part); void remote?.put(part).catch(() => undefined);
  return part;
}
/** A part used by a build: counted. */
export function used(id: string): void { const all = read(), p = all.find((x) => x.id === id); if (p) { p.uses++; write(all); } }
/** The parts that match these words, best first: by the words of their name, tags, what they say and what they were
 *  made for; a part that was used more ranks first among equals. */
export function recall(words: string, n = 8): SavedPart[] {
  const ws = words.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const score = (p: SavedPart) => { const hay = `${p.name} ${p.tags.join(' ')} ${p.says} ${p.from}`.toLowerCase(), name = p.name.toLowerCase(); return ws.reduce((a, w) => a + (name.includes(w) ? 3 : hay.includes(w) ? 1 : 0), 0); };
  return read().map((p) => [p, score(p)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1] || b[0].uses - a[0].uses).slice(0, n).map(([p]) => p);
}
/** The store apart from the page (the page's shared store on claude.ai): set once where the app starts. */
export function setRemote(r: Remote | null): void { remote = r; }
/** Parts kept apart and not here are brought in (and registered); parts here and not there are sent there. */
export async function syncRemote(): Promise<{ in: number; out: number }> {
  if (!remote) return { in: 0, out: 0 };
  const there = await remote.all(), all = read(), have = new Set(all.map((p) => p.id)), had = new Set(there.map((p) => p.id));
  const add = there.filter((p) => !have.has(p.id)).map(full); for (const p of add) registerOne(p);
  if (add.length) write([...all, ...add]);
  const out = all.filter((p) => !had.has(p.id) && p.graph); for (const p of out) await remote.put(p).catch(() => undefined);
  return { in: add.length, out: out.length };
}

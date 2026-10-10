// Where the forge's boards are kept: in a claude.ai artifact, its shared store (the `db` capability), so Claude reads
// what you made when you ask it to review a board; on GitHub Pages or a local copy, this browser only, and it says so.
// One document per board. A change is a patch merged into it; writes to one board go one at a time, the next merged
// from every change made while one is on its way; a board written whole is written without what was deleted.

import { compact, deepMerge, type Board, type Patch } from '../substrate/boards';

interface DocRef { set(d: object): Promise<void>; update(d: object): Promise<void>; delete(): Promise<void> }
interface Snap { docs: { id: string; data(): unknown }[] }
interface DbLike { doc(path: string): DocRef; collection(p: string): { onSnapshot(next: (s: Snap) => void, err?: (e: unknown) => void): () => void } }

export interface BoardStore {
  /** Whether Claude can read these boards (the artifact's store), or they are in this browser only. */
  readonly shared: boolean;
  readonly boards: Map<string, Board>;
  /** Called after every change, yours or arriving. */
  subscribe(on: () => void): void;
  write(id: string, patch: Patch | Board, whole?: boolean): void;
  remove(id: string): void;
  /** What happened to the last write, in words. */
  status(): string;
}

const KEY = 'nexus-boards';
export async function makeBoardStore(): Promise<BoardStore> {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  const db = claude ? ((await claude.use('db').catch(() => null)) as DbLike | null) : null;
  const boards = new Map<string, Board>(), ons: (() => void)[] = [];
  let said = db ? 'Saved with this page: Claude reads it when you ask for a review.' : 'Kept in this browser only: this copy has no shared store, so Claude cannot read these boards.';
  const tell = () => { for (const f of ons) f(); };
  const queue = new Map<string, { inflight: boolean; pending: Patch | Board | null; whole: boolean }>();
  const keep = () => { try { localStorage.setItem(KEY, JSON.stringify([...boards])); } catch { /* storage refused: kept for this visit */ } };
  async function flush(id: string): Promise<void> {
    const q = queue.get(id); if (!db || !q || q.inflight || !q.pending) return;
    const body = { ...q.pending, updatedAt: Date.now() }, whole = q.whole; q.pending = null; q.whole = false; q.inflight = true;
    try {
      const ref = db.doc(`boards/${id}`), cur = boards.get(id);
      await (whole ? ref.set(compact({ ...(cur ?? (body as Board)), updatedAt: body.updatedAt })) : ref.update(body));
      said = 'Saved with this page: Claude reads it when you ask for a review.';
    } catch (e) {
      const code = (e as { code?: string }).code;
      // the board is not there yet: write it whole
      if (code === 'invalid_argument' && !whole) { q.pending = q.pending ? deepMerge(boards.get(id), q.pending) : boards.get(id)!; q.whole = true; }
      else said = code === 'invalid_argument' ? 'Read-only here: this view may look and arrange, not change the shared boards.' : code === 'quota_exceeded' ? 'The store is full: delete a board to make room.' : 'Not saved just now; the next change tries again.';
    }
    q.inflight = false; tell(); if (q.pending) void flush(id);
  }
  if (db) {
    db.collection('boards').onSnapshot((snap) => {
      const seen = new Set<string>();
      for (const d of snap.docs) { seen.add(d.id); let body = JSON.parse(JSON.stringify(d.data() ?? {})) as Board; const q = queue.get(d.id); if (q?.pending) body = deepMerge(body, q.pending); boards.set(d.id, body); }
      for (const k of [...boards.keys()]) if (!seen.has(k) && !queue.get(k)?.inflight) boards.delete(k);
      tell();
    }, () => { said = 'The shared store did not answer; what you change is kept for this visit.'; tell(); });
  } else {
    try { for (const [k, v] of JSON.parse(localStorage.getItem(KEY) ?? '[]') as [string, Board][]) boards.set(k, v); } catch { /* nothing kept */ }
  }
  return {
    shared: !!db, boards,
    subscribe(on) { ons.push(on); on(); },
    write(id, patch, whole = false) {
      const cur = boards.get(id);
      boards.set(id, whole ? (patch as Board) : deepMerge(cur, patch));
      if (!db) { keep(); tell(); return; }
      const q = queue.get(id) ?? { inflight: false, pending: null, whole: false };
      q.pending = whole ? patch : q.pending ? deepMerge(q.pending, patch) : patch; q.whole = q.whole || whole || !cur;
      queue.set(id, q); tell(); void flush(id);
    },
    remove(id) { boards.delete(id); if (db) db.doc(`boards/${id}`).delete().catch(() => { said = 'The board could not be deleted from the store just now.'; }); else keep(); tell(); },
    status: () => said,
  };
}

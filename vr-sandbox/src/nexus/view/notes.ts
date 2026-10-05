// A person's notes on the machine: a flaw they see, a question, an idea, or what is good, pinned to a part. They are
// findings like the checks' own: kept with the machine in the artifact's shared store, where Claude reads them back and
// answers, and where the next round of laws starts from. Where the page has no store (a local copy), they are kept in
// this browser only, and the page says so.

export type NoteKind = 'flaw' | 'question' | 'idea' | 'good';
export interface Note {
  id: string;
  partId: string; partName: string; assembly: string;
  kind: NoteKind; text: string;
  at: [number, number, number];
  ask: { size: number; tolerance: number; hours: number };
  round: number; createdAt: number;
  /** What the person was looking at when they wrote it: a JPEG, as a data URL. */
  view?: string;
  status: 'open' | 'answered' | 'done';
  reply?: string;
}

export interface Notes {
  readonly shared: boolean;
  add(n: Omit<Note, 'id' | 'createdAt' | 'status'>): Promise<Note>;
  remove(id: string): Promise<void>;
  subscribe(on: (all: Note[]) => void): void;
}

interface Snap { id: string; data(): Record<string, unknown> | undefined }
interface DbLike { collection(p: string): { add(d: Record<string, unknown>): Promise<{ id: string }>; doc(id: string): { delete(): Promise<void> }; orderBy(f: string, d?: string): { limit(n: number): { onSnapshot(next: (s: { docs: Snap[] }) => void, err?: (e: unknown) => void): () => void } } } }

const KEY = 'nexus-forge-notes';
const read = (): Note[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as Note[]; } catch { return []; } };
const write = (all: Note[]) => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* storage refused: kept for this visit */ } };

export async function makeNotes(): Promise<Notes> {
  const claude = (window as unknown as { claude?: { use(n: string): Promise<unknown> } }).claude;
  const db = claude ? ((await claude.use('db').catch(() => null)) as DbLike | null) : null;
  if (db) {
    const col = db.collection('notes');
    return {
      shared: true,
      async add(n) { const body = { ...n, createdAt: Date.now(), status: 'open' as const }; const ref = await col.add(body); return { ...body, id: ref.id }; },
      async remove(id) { await col.doc(id).delete(); },
      subscribe(on) { col.orderBy('createdAt', 'asc').limit(500).onSnapshot((s) => on(s.docs.map((d) => ({ ...(d.data() as unknown as Note), id: d.id }))), () => on([])); },
    };
  }
  let all = read(), listener: ((a: Note[]) => void) | null = null;
  return {
    shared: false,
    async add(n) { const note: Note = { ...n, id: `n${Date.now().toString(36)}`, createdAt: Date.now(), status: 'open' }; all = [...all, note]; write(all); listener?.(all); return note; },
    async remove(id) { all = all.filter((x) => x.id !== id); write(all); listener?.(all); },
    subscribe(on) { listener = on; on(all); },
  };
}

// A person's notes on the machine: a flaw they see, a question, an idea, or what is good, pinned to a part. They are
// findings like the checks' own: kept with the machine in the artifact's shared store, where Claude reads them back and
// answers, and where the next round of laws starts from. Where the page has no store (a local copy), they are kept in
// this browser only, and the page says so.

export type NoteKind = 'flaw' | 'question' | 'idea' | 'good' | 'note';
export interface Note {
  id: string;
  partId: string; partName: string; assembly: string;
  kind: NoteKind; text: string;
  at: [number, number, number];
  ask: { size: number; tolerance: number; hours: number };
  /** What stood there when it was written: the machine's name (a printer, a car, a house). */
  machine?: string;
  /** Where it was given in the causal graph (src/nexus/embody/causal.ts): the subsystem judged, and the judgment. */
  node?: string;
  verdict?: 'flag' | 'approve' | 'reject' | 'test';
  /** A pin: at the exact point it was dropped (in the machine's frame), not at its part's centre. */
  exact?: boolean;
  /** What it is on: the build, the forge's own panels and controls, or the room. */
  layer?: 'build' | 'ui' | 'environment';
  /** Where on it, in words: "40 % across, 20 % down the Flaws board", "the ▶ Operate button". */
  where?: string;
  /** Whether it reached Claude Code, who writes the laws. */
  relayed?: boolean;
  round: number; createdAt: number;
  /** What the person was looking at when they wrote it: a JPEG, as a data URL. */
  view?: string;
  status: 'open' | 'answered' | 'done';
  reply?: string;
  /** Where it is in Claude's loop: reported, read, diagnosed, law (a law written for it), tested, live (in the machine you see). */
  stage?: Stage;
  /** The journal's number for the law written for it. */
  law?: number;
}
export const STAGES = ['reported', 'read', 'diagnosed', 'law', 'tested', 'live'] as const;
export type Stage = (typeof STAGES)[number];

/** What Claude puts to you: a change it proposes, or a choice that is yours to make, and what you decided. */
export interface Proposal { id: string; title: string; why: string; options?: string[]; status: 'proposed' | 'approved' | 'declined' | string; createdAt: number; decided?: string }

export interface Notes {
  readonly shared: boolean;
  add(n: Omit<Note, 'id' | 'createdAt' | 'status'>): Promise<Note>;
  remove(id: string): Promise<void>;
  subscribe(on: (all: Note[]) => void): void;
  proposals(on: (all: Proposal[]) => void): void;
  decide(id: string, status: string): Promise<void>;
}

interface Snap { id: string; data(): Record<string, unknown> | undefined }
interface DbLike { collection(p: string): { add(d: Record<string, unknown>): Promise<{ id: string }>; doc(id: string): { delete(): Promise<void>; update(d: Record<string, unknown>): Promise<void> }; orderBy(f: string, d?: string): { limit(n: number): { onSnapshot(next: (s: { docs: Snap[] }) => void, err?: (e: unknown) => void): () => void } } } }

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
      proposals(on) { db.collection('proposals').orderBy('createdAt', 'asc').limit(100).onSnapshot((s) => on(s.docs.map((d) => ({ ...(d.data() as unknown as Proposal), id: d.id }))), () => on([])); },
      async decide(id, status) { await db.collection('proposals').doc(id).update({ status, decided: new Date().toISOString() }); },
    };
  }
  let all = read(), listener: ((a: Note[]) => void) | null = null;
  return {
    shared: false,
    async add(n) { const note: Note = { ...n, id: `n${Date.now().toString(36)}`, createdAt: Date.now(), status: 'open' }; all = [...all, note]; write(all); listener?.(all); return note; },
    async remove(id) { all = all.filter((x) => x.id !== id); write(all); listener?.(all); },
    subscribe(on) { listener = on; on(all); },
    proposals(on) { on([]); },
    async decide() { /* nothing to decide without the store */ },
  };
}

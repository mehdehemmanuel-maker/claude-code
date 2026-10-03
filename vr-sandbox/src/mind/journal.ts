// The Mind's journal: the one place Ego's own cognition persists. Not what the world is (the document, the substrate
// and the laws say that) but what she is doing about it: an observation she made, the anomaly it opened, the
// hypothesis she holds, the test she ran, what it showed, what she now believes, and the question still open. Each is
// one commit: a Nex structure (the content), its origin, how it was validated, its status, and what it was derived
// from, under the physics it was learned in. Append only: a belief revised is a new commit that supersedes the old one,
// never an edit, so the history is the store and a reload reads back exactly the state the loop left.
//
// What this asks of storage, and why localStorage is not it: an atomic append (one transaction per commit), capacity
// past a few megabytes (a journal of test results), durability when the page is closed, ordering, and a read of the
// whole history at start. IndexedDB gives all five on the Quest browser; a memory journal gives the same interface to
// the tests. Nothing here is a cache of English: every commit is read back as structure.

import type { Structure } from '../ganglia/native/core';

/** Who committed, from which kind of event. */
export type Origin = 'event:stand' | 'event:watchdog' | 'event:construct' | 'event:ask' | 'event:load' | 'ego';
/** The step of the loop a commit is: what she saw, what it opened, what she holds, what she measured, what she now believes, what is still open; or something she was asked and could not read. */
export type Kind = 'observation' | 'anomaly' | 'hypothesis' | 'evidence' | 'belief' | 'question' | 'request';
export type Status =
  /** an item the loop still has to act on */
  | 'open'
  /** a hypothesis or a question whose test has been asked for and has not come back */
  | 'testing'
  | 'confirmed' | 'rejected'
  /** a hypothesis the evidence neither confirmed nor rejected: kept, with its uncertainty */
  | 'retained'
  /** an investigation with nothing left to do */
  | 'resolved'
  /** superseded by a later commit (a belief revised, a question answered) */
  | 'closed';

/** How a commit was validated: by which instrument, with what verdict, and by how much (a margin in units of tolerance). */
export interface Validation { by: 'test stand' | 'none' | 'comparison'; verdict: 'held' | 'failed' | 'supported' | 'contradicted' | 'none'; margin?: number }

export interface Commit {
  /** Journal order, 1.. */
  seq: number;
  /** When (ISO). */
  at: string;
  /** The run of the app that committed it (a new id every page load): a commit in a later session than its parent was made after a reload. */
  session: string;
  /** The investigation it belongs to. */
  inv: string;
  kind: Kind;
  origin: Origin;
  /** What it was derived from (seqs): the recursion, as data. */
  parents: number[];
  /** The content, in Nex. */
  item: Structure;
  /** Typed data Nex has no place for yet: a design spec, the numbers of a stand result, a failure signature, candidates. */
  data: Record<string, unknown>;
  validation: Validation;
  status: Status;
  /** The physics it was committed under (vite.config.ts). */
  physics: string;
  /** Time from its cause (the event, or the previous commit) to this commit, ms. */
  ms: number;
}

export interface Journal {
  /** Every commit, in seq order, read at open. */
  readonly commits: Commit[];
  /** Commits written since open. */
  readonly writes: number;
  append(c: Omit<Commit, 'seq'>): Promise<Commit>;
}

export class MemoryJournal implements Journal {
  commits: Commit[] = [];
  writes = 0;
  constructor(from: Commit[] = []) { this.commits = from.map((c) => structuredClone(c)); }
  append(c: Omit<Commit, 'seq'>): Promise<Commit> {
    const commit: Commit = { ...structuredClone(c), seq: (this.commits[this.commits.length - 1]?.seq ?? 0) + 1 };
    this.commits.push(commit);
    this.writes++;
    return Promise.resolve(commit);
  }
  /** A copy of the journal as it stands: what a reload would read. */
  snapshot(): MemoryJournal { return new MemoryJournal(this.commits); }
}

export const STORE = 'commits';

export class IdbJournal implements Journal {
  commits: Commit[] = [];
  writes = 0;
  private constructor(private db: IDBDatabase) {}

  static open(name = 'vrsb.mind'): Promise<IdbJournal> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(name, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE, { keyPath: 'seq' }); };
      req.onerror = () => reject(req.error ?? new Error('indexedDB would not open'));
      req.onsuccess = () => {
        const j = new IdbJournal(req.result);
        const all = req.result.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        all.onsuccess = () => { j.commits = (all.result as Commit[]).sort((a, b) => a.seq - b.seq); resolve(j); };
        all.onerror = () => reject(all.error ?? new Error('the journal would not read'));
      };
    });
  }

  append(c: Omit<Commit, 'seq'>): Promise<Commit> {
    const commit: Commit = { ...c, seq: (this.commits[this.commits.length - 1]?.seq ?? 0) + 1 };
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(commit);
      tx.oncomplete = () => { this.commits.push(commit); this.writes++; resolve(commit); };
      tx.onerror = () => reject(tx.error ?? new Error('the commit was not kept'));
      tx.onabort = () => reject(tx.error ?? new Error('the commit was abandoned'));
    });
  }

  /** Forget everything (tests, and a user who asks for it). */
  static erase(name = 'vrsb.mind'): Promise<void> {
    return new Promise((resolve) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => resolve(); });
  }
}

/** The journal this runtime can keep: IndexedDB where the browser has it, else memory (tests, or a browser without it). */
export async function openJournal(): Promise<Journal> {
  if (typeof indexedDB === 'undefined') return new MemoryJournal();
  try { return await IdbJournal.open(); } catch { return new MemoryJournal(); }
}

/** The commits of one investigation, in order. */
export const of = (commits: Commit[], inv: string): Commit[] => commits.filter((c) => c.inv === inv);
/** Every investigation, by first appearance. */
/** Every investigation, by first appearance: what she works on (a note of a part outside a domain is not one). */
export const investigations = (commits: Commit[]): string[] => [...new Set(commits.filter((c) => c.kind !== 'request' && !c.inv.startsWith('construct:')).map((c) => c.inv))];
/** The last commit of an investigation. */
export const last = (commits: Commit[], inv: string): Commit | undefined => of(commits, inv).at(-1);

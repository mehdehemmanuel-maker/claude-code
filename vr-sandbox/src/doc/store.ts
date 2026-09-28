// Document store with field-level change sets and undo/redo.
// Updates record only the fields they touch, so non-undoable background writes (such as committing live
// physics poses) never get clobbered by undoing an unrelated older edit.

import type { BuildDoc, Collection, SimSettings } from './types';

type Entity = Record<string, unknown>;

export type Change =
  | { op: 'create'; coll: Collection; id: string; value: Entity }
  | { op: 'delete'; coll: Collection; id: string; value: Entity }
  | { op: 'update'; coll: Collection; id: string; fields: Record<string, { before: unknown; after: unknown }> }
  | { op: 'sim'; fields: Record<string, { before: unknown; after: unknown }> };

export interface Transaction {
  label: string;
  changes: Change[];
  mergeKey?: string;
  time: number;
}

export type ChangeSource = 'do' | 'undo' | 'redo' | 'load' | 'silent';

export type Listener = (changes: Change[], source: ChangeSource) => void;

const clone = <T>(v: T): T => (v === undefined ? v : structuredClone(v));

export class TxBuilder {
  readonly changes: Change[] = [];
  constructor(private readonly store: DocStore) {}

  create(coll: Collection, id: string, value: object) {
    if (this.store.get(coll, id)) throw new Error(`${coll}/${id} already exists`);
    this.changes.push({ op: 'create', coll, id, value: clone(value) as Entity });
    this.store.applyOne(this.changes.at(-1)!, false);
  }

  delete(coll: Collection, id: string) {
    const cur = this.store.get(coll, id);
    if (!cur) return;
    this.changes.push({ op: 'delete', coll, id, value: clone(cur) as Entity });
    this.store.applyOne(this.changes.at(-1)!, false);
  }

  update(coll: Collection, id: string, patch: object) {
    const cur = this.store.get(coll, id) as Entity | undefined;
    if (!cur) throw new Error(`${coll}/${id} not found`);
    const fields: Record<string, { before: unknown; after: unknown }> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (JSON.stringify(cur[k]) === JSON.stringify(v)) continue;
      fields[k] = { before: clone(cur[k]), after: clone(v) };
    }
    if (Object.keys(fields).length === 0) return;
    this.changes.push({ op: 'update', coll, id, fields });
    this.store.applyOne(this.changes.at(-1)!, false);
  }

  sim(patch: Partial<SimSettings>) {
    const cur = this.store.doc.sim as unknown as Entity;
    const fields: Record<string, { before: unknown; after: unknown }> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (JSON.stringify(cur[k]) === JSON.stringify(v)) continue;
      fields[k] = { before: clone(cur[k]), after: clone(v) };
    }
    if (Object.keys(fields).length === 0) return;
    this.changes.push({ op: 'sim', fields });
    this.store.applyOne(this.changes.at(-1)!, false);
  }
}

export class DocStore {
  doc: BuildDoc;
  revision = 0;
  private undoStack: Transaction[] = [];
  private redoStack: Transaction[] = [];
  private listeners = new Set<Listener>();
  static readonly MAX_UNDO = 300;
  static readonly MERGE_WINDOW_MS = 1200;

  constructor(doc: BuildDoc) {
    this.doc = doc;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  get<T = unknown>(coll: Collection, id: string): T | undefined {
    return (this.doc[coll] as Record<string, T>)[id];
  }

  /** Run edits as one undoable transaction. Returns the changes made. */
  transact(label: string, fn: (tx: TxBuilder) => void, opts: { mergeKey?: string; undoable?: boolean } = {}): Change[] {
    const tx = new TxBuilder(this);
    try {
      fn(tx);
    } catch (e) {
      // roll back anything applied so far
      for (const c of [...tx.changes].reverse()) this.applyOne(invert(c), false);
      throw e;
    }
    if (tx.changes.length === 0) return [];
    this.revision++;
    const undoable = opts.undoable ?? true;
    if (undoable) {
      const now = Date.now();
      const last = this.undoStack.at(-1);
      if (opts.mergeKey && last && last.mergeKey === opts.mergeKey && now - last.time < DocStore.MERGE_WINDOW_MS) {
        last.changes = mergeChanges(last.changes, tx.changes);
        last.time = now;
      } else {
        this.undoStack.push({ label, changes: tx.changes, mergeKey: opts.mergeKey, time: now });
        if (this.undoStack.length > DocStore.MAX_UNDO) this.undoStack.shift();
      }
      this.redoStack = [];
    }
    this.emit(tx.changes, undoable ? 'do' : 'silent');
    return tx.changes;
  }

  undo(): Transaction | undefined {
    const t = this.undoStack.pop();
    if (!t) return undefined;
    const inv = [...t.changes].reverse().map(invert);
    for (const c of inv) this.applyOne(c, true);
    this.redoStack.push(t);
    this.revision++;
    this.emit(inv, 'undo');
    return t;
  }

  redo(): Transaction | undefined {
    const t = this.redoStack.pop();
    if (!t) return undefined;
    for (const c of t.changes) this.applyOne(c, true);
    this.undoStack.push(t);
    this.revision++;
    this.emit(t.changes, 'redo');
    return t;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }

  get canRedo() {
    return this.redoStack.length > 0;
  }

  get undoLabel() {
    return this.undoStack.at(-1)?.label;
  }

  get redoLabel() {
    return this.redoStack.at(-1)?.label;
  }

  /** Replace the whole document (load / new / template). Clears history. */
  replace(doc: BuildDoc) {
    this.doc = doc;
    this.undoStack = [];
    this.redoStack = [];
    this.revision++;
    this.emit([], 'load');
  }

  /** Apply a change directly. `lenient` skips missing targets (undo of entities already gone). */
  applyOne(c: Change, lenient: boolean) {
    if (c.op === 'sim') {
      const sim = this.doc.sim as unknown as Entity;
      for (const [k, f] of Object.entries(c.fields)) sim[k] = clone(f.after);
      return;
    }
    const coll = this.doc[c.coll] as unknown as Record<string, Entity>;
    if (c.op === 'create') {
      coll[c.id] = clone(c.value);
    } else if (c.op === 'delete') {
      delete coll[c.id];
    } else {
      const cur = coll[c.id];
      if (!cur) {
        if (lenient) return;
        throw new Error(`${c.coll}/${c.id} not found`);
      }
      const next = { ...cur };
      for (const [k, f] of Object.entries(c.fields)) next[k] = clone(f.after);
      coll[c.id] = next;
    }
  }

  private emit(changes: Change[], source: ChangeSource) {
    for (const l of this.listeners) l(changes, source);
  }
}

export function invert(c: Change): Change {
  switch (c.op) {
    case 'create':
      return { op: 'delete', coll: c.coll, id: c.id, value: c.value };
    case 'delete':
      return { op: 'create', coll: c.coll, id: c.id, value: c.value };
    case 'update':
      return { op: 'update', coll: c.coll, id: c.id, fields: swap(c.fields) };
    case 'sim':
      return { op: 'sim', fields: swap(c.fields) };
  }
}

function swap(fields: Record<string, { before: unknown; after: unknown }>) {
  const out: Record<string, { before: unknown; after: unknown }> = {};
  for (const [k, f] of Object.entries(fields)) out[k] = { before: f.after, after: f.before };
  return out;
}

/** Merge a follow-up change list into an earlier one (slider drags), keeping the earliest `before`. */
function mergeChanges(prev: Change[], next: Change[]): Change[] {
  const out = [...prev];
  for (const c of next) {
    if (c.op === 'update' || c.op === 'sim') {
      const hit = out.find((o) =>
        o.op === c.op && (c.op === 'sim' || (o.op === 'update' && c.op === 'update' && o.coll === c.coll && o.id === c.id)));
      if (hit && (hit.op === 'update' || hit.op === 'sim')) {
        for (const [k, f] of Object.entries(c.fields)) {
          hit.fields[k] = { before: hit.fields[k] ? hit.fields[k]!.before : f.before, after: f.after };
        }
        continue;
      }
    }
    out.push(c);
  }
  return out;
}

/** IDs of entities touched by a change list, grouped by collection. */
export function touched(changes: Change[]) {
  const out = { parts: new Set<string>(), connections: new Set<string>(), assemblies: new Set<string>(), materials: new Set<string>(), sim: false };
  for (const c of changes) {
    if (c.op === 'sim') out.sim = true;
    else out[c.coll].add(c.id);
  }
  return out;
}

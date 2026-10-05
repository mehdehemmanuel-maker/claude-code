// Document store with field-level change sets and undo/redo.
// Updates record only the fields they touch, so non-undoable background writes (such as committing live
// physics poses) never get clobbered by undoing an unrelated older edit.

import type { BuildDoc, Collection, Connection, Part, SimSettings } from './types';
import { admitConnection, admitPart, ConstructionRefused, judgeDoc, standingOf } from '../ganglia/tree/gate';

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

/** Fields whose change makes a different thing or puts it in a different place: judged again when a hand changes them. */
const CONSTRUCTIVE = new Set(['kind', 'material', 'params', 'pose', 'damage', 'a', 'b']);

export class DocStore {
  doc: BuildDoc;
  revision = 0;
  private undoStack: Transaction[] = [];
  private redoStack: Transaction[] = [];
  private listeners = new Set<Listener>();
  static readonly MAX_UNDO = 300;
  static readonly MERGE_WINDOW_MS = 1200;

  /** Whether the running transaction constructs (places, joins, moves by hand): what it changes passes the gate. */
  private constructing = false;
  /** Parts this transaction placed or moved: judged for overlap when it closes, with its joints known. */
  private pending = new Set<string>();

  constructor(doc: BuildDoc) {
    const r = judgeDoc(doc);
    if (r) throw new ConstructionRefused(r);
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
    // a transaction that constructs is judged as it goes; one that records what the physics did (poses committed from
    // a running world) is an observation, and the physics' contacts are its own law
    const was = this.constructing, hadPending = this.pending;
    this.constructing = opts.undoable ?? true;
    this.pending = new Set();
    try {
      fn(tx);
      // the construction closes: no part it placed or moved is where another is, its joints' bores allowed for
      for (const id of this.pending) { const part = this.doc.parts[id]; if (part) admitPart(standingOf(this.doc), part); }
    } catch (e) {
      // roll back anything applied so far: a refused construction leaves nothing behind
      for (const c of [...tx.changes].reverse()) this.applyOne(invert(c), false, true);
      throw e;
    } finally {
      this.constructing = was;
      this.pending = hadPending;
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

  /** Replace the whole document (load / new / template). Clears history. A document the gate refuses is not loaded. */
  replace(doc: BuildDoc) {
    const r = judgeDoc(doc);
    if (r) throw new ConstructionRefused(r);
    this.doc = doc;
    this.undoStack = [];
    this.redoStack = [];
    this.revision++;
    this.emit([], 'load');
  }

  /** Swap in a document snapshot (checkpoint rewind) while keeping undo history. */
  restore(doc: BuildDoc) {
    const r = judgeDoc(doc);
    if (r) throw new ConstructionRefused(r);
    this.doc = doc;
    this.revision++;
    this.emit([], 'load');
  }

  /**
   * Apply a change directly. `lenient` skips missing targets (undo of entities already gone). A part or connection
   * created, or changed in what it is or where it is by a constructing transaction, passes the gate first; `rollback`
   * undoes changes already judged. The gate throws ConstructionRefused and the change is not made.
   */
  applyOne(c: Change, lenient: boolean, rollback = false) {
    if (c.op === 'sim') {
      const sim = this.doc.sim as unknown as Entity;
      for (const [k, f] of Object.entries(c.fields)) sim[k] = clone(f.after);
      return;
    }
    const coll = this.doc[c.coll] as unknown as Record<string, Entity>;
    if (c.op === 'create') {
      const value = clone(c.value);
      if (!rollback) this.admit(c.coll, value);
      coll[c.id] = value;
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
      if (!rollback && this.constructing && Object.keys(c.fields).some((k) => CONSTRUCTIVE.has(k))) this.admit(c.coll, next);
      coll[c.id] = next;
    }
  }

  private admit(coll: Collection, value: Entity) {
    if (coll === 'parts') { admitPart(standingOf(this.doc), value as unknown as Part, undefined, { overlaps: false }); this.pending.add(String(value['id'])); }
    else if (coll === 'connections') admitConnection(standingOf(this.doc), value as unknown as Connection);
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

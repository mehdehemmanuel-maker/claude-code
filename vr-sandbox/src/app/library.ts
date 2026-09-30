// Your builds: saved on this headset (the Quest browser's storage), in the same canonical text a saved file uses.
// Nothing ships pre-made; every entry here is one you saved.

export interface SavedBuild {
  id: string;
  name: string;
  /** ISO time it was last saved. */
  saved: string;
  /** The build, as encodeDocText writes it. */
  text: string;
}

const KEY = 'vrsb.library';

export class BuildLibrary {
  private entries: SavedBuild[] = [];
  /** False when the browser keeps no storage (a private window): builds then last only until the page closes. */
  persistent = true;

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null) {
    try {
      const raw = this.storage?.getItem(KEY);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(list)) this.entries = list.filter((e): e is SavedBuild => !!e && typeof e.id === 'string' && typeof e.text === 'string' && typeof e.name === 'string');
    } catch {
      this.persistent = false;
    }
  }

  /** Newest first. */
  list(): SavedBuild[] {
    return [...this.entries].sort((a, b) => b.saved.localeCompare(a.saved));
  }

  get(id: string) {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  /** Save a build: over the entry `id` when given (and still there), else as a new one named "Build n". */
  save(text: string, id?: string | null, now = new Date()): SavedBuild {
    const at = now.toISOString();
    const old = id ? this.get(id) : null;
    if (old) {
      old.text = text;
      old.saved = at;
      this.write();
      return old;
    }
    const used = new Set(this.entries.map((e) => e.name));
    let n = this.entries.length + 1;
    while (used.has(`Build ${n}`)) n++;
    const entry: SavedBuild = { id: `b${now.getTime().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: `Build ${n}`, saved: at, text };
    this.entries.push(entry);
    this.write();
    return entry;
  }

  remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.write();
  }

  private write() {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.entries));
      this.persistent = !!this.storage;
    } catch {
      this.persistent = false;
    }
  }
}

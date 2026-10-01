// Your builds: saved on this headset (the Quest browser's storage), in the same canonical text a saved file uses,
// compressed (a build is mostly repeated structure: about a tenth the size). Nothing ships pre-made; every entry here
// is one you saved. Every save is read back: if the browser didn't keep it (its storage full), you are told so, plainly.

import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import { base64url, fromBase64url } from '../persistence/codec';

export interface SavedBuild {
  id: string;
  name: string;
  /** ISO time it was last saved. */
  saved: string;
  /** The build, as encodeDocText writes it. */
  text: string;
}

const KEY = 'vrsb.library';

/** What the browser actually holds for one entry: the text deflated (`z`), or as it was before compression (`text`). */
interface Stored { id: string; name: string; saved: string; z?: string; text?: string }

const pack = (e: SavedBuild): Stored => ({ id: e.id, name: e.name, saved: e.saved, z: base64url(deflateSync(strToU8(e.text), { level: 9 })) });
const unpack = (e: Stored): SavedBuild | null => {
  try {
    const text = typeof e.z === 'string' ? strFromU8(inflateSync(fromBase64url(e.z))) : e.text;
    return typeof text === 'string' ? { id: e.id, name: e.name, saved: e.saved, text } : null;
  } catch { return null; }
};

/** Why a save didn't stick, in words. */
export class SaveError extends Error {}

export class BuildLibrary {
  private entries: SavedBuild[] = [];
  /** False when the browser keeps no storage (a private window): builds then last only until the page closes. */
  persistent = true;

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null, private key = KEY, private prefix = 'Build') {
    try {
      const raw = this.storage?.getItem(this.key);
      const list = raw ? (JSON.parse(raw) as unknown) : [];
      if (Array.isArray(list)) this.entries = (list as Stored[]).filter((e) => !!e && typeof e.id === 'string' && typeof e.name === 'string').map(unpack).filter((e): e is SavedBuild => !!e);
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

  /**
   * Save: over the entry `id` when given (and still there), else as a new one named "Build n" (or the prefix's n).
   * Throws SaveError when the browser didn't keep it; the library is then as it was.
   */
  save(text: string, id?: string | null, now = new Date()): SavedBuild {
    const at = now.toISOString();
    const before = this.entries.map((e) => ({ ...e }));
    const old = id ? this.get(id) : null;
    let entry: SavedBuild;
    if (old) {
      old.text = text;
      old.saved = at;
      entry = old;
    } else {
      const used = new Set(this.entries.map((e) => e.name));
      let n = this.entries.length + 1;
      while (used.has(`${this.prefix} ${n}`)) n++;
      entry = { id: `b${now.getTime().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`, name: `${this.prefix} ${n}`, saved: at, text };
      this.entries.push(entry);
    }
    try {
      this.write();
    } catch (e) {
      this.entries = before;
      throw e;
    }
    return entry;
  }

  remove(id: string) {
    this.entries = this.entries.filter((e) => e.id !== id);
    try { this.write(); } catch { /* removing frees space; if even that failed there is nothing more to do */ }
  }

  /** What this library takes in the browser's storage, in characters (the browser counts about 5 million). */
  get size() {
    try { return this.storage?.getItem(this.key)?.length ?? 0; } catch { return 0; }
  }

  private write() {
    if (!this.storage) { this.persistent = false; return; }
    const json = JSON.stringify(this.entries.map(pack));
    try {
      this.storage.setItem(this.key, json);
    } catch (e) {
      const full = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      throw new SaveError(full
        ? `the headset's storage for this app is full (${(json.length / 1e6).toFixed(1)} M characters needed): delete builds or templates you don't need, then save again`
        : `the browser refused to keep it (${e instanceof Error ? e.message : String(e)})`);
    }
    // read it back: kept only if it is really there
    if (this.storage.getItem(this.key) !== json) throw new SaveError('the browser did not keep it (it read back different)');
    this.persistent = true;
  }
}

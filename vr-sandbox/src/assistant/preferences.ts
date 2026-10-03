// What she remembers of your choices: which joint for which pair of materials, which material for which part, each
// counted, and the usual one offered first (it still has to hold). Kept on this headset under the key her growth once
// used, so what was learned before carries over. There are no levels: everything she can do, she can do from the
// first minute; what grows is this.

interface Saved { v: 1 | 2; xp?: number; prefs: Record<string, Record<string, number>> }

export class Preferences {
  /** Counted preferences: kind of choice → what you chose → how often. */
  prefs: Record<string, Record<string, number>> = {};

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null, private key = 'vrsb.ego') {
    try {
      const raw = this.storage?.getItem(this.key) ?? this.storage?.getItem('vrsb.ada');
      const s = raw ? (JSON.parse(raw) as Saved) : null;
      if (s && (s.v === 1 || s.v === 2)) this.prefs = s.prefs ?? {};
    } catch { /* start fresh */ }
  }

  /** Remember a choice (which joint for which pair, which material for which part). */
  prefer(what: string, choice: string) {
    const row = (this.prefs[what] ??= {});
    row[choice] = (row[choice] ?? 0) + 1;
    this.save();
  }

  /** Your usual choice for this, if you have one (chosen at least twice and most often). */
  preferred(what: string): string | null {
    const row = this.prefs[what];
    if (!row) return null;
    const [best, n] = Object.entries(row).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    return best && n >= 2 ? best : null;
  }

  private save() {
    try { this.storage?.setItem(this.key, JSON.stringify({ v: 2, prefs: this.prefs } satisfies Saved)); } catch { /* not kept */ }
  }
}

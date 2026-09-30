// The habit graph: what you tend to do next. Every build action is reduced to a token ("place:lumber", "join:screwed",
// "set:power", "play") and the graph counts which token follows which, one and two steps back. Predictions come from
// the longest history that has been seen often enough to trust; counts decay a little each session, so new habits
// take over from old ones. It learns on this headset only, and gets better the more you build.

export type Token = string;

/** Two steps back needs this many sightings before it outranks one step back. */
const TRUST = 2;
/** Each new session keeps this share of old counts. */
const DECAY = 0.9;
const MAX_TOKENS = 400;

interface Saved { v: 1; uni: Record<Token, number>; bi: Record<string, Record<Token, number>>; tri: Record<string, Record<Token, number>> }

export class HabitGraph {
  private uni = new Map<Token, number>();
  private bi = new Map<Token, Map<Token, number>>();
  private tri = new Map<string, Map<Token, number>>();
  private recent: Token[] = [];

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null, private key = 'vrsb.habits') {
    try {
      const raw = this.storage?.getItem(this.key);
      if (!raw) return;
      const s = JSON.parse(raw) as Saved;
      if (s?.v !== 1) return;
      for (const [t, n] of Object.entries(s.uni ?? {})) this.uni.set(t, n * DECAY);
      const load = (into: Map<string, Map<Token, number>>, from: Record<string, Record<Token, number>>) => {
        for (const [k, row] of Object.entries(from ?? {})) into.set(k, new Map(Object.entries(row).map(([t, n]) => [t, n * DECAY])));
      };
      load(this.bi, s.bi);
      load(this.tri, s.tri);
    } catch {
      /* unreadable: start fresh */
    }
  }

  /** Something was just done. */
  see(t: Token) {
    const [p2, p1] = [this.recent[this.recent.length - 2], this.recent[this.recent.length - 1]];
    this.uni.set(t, (this.uni.get(t) ?? 0) + 1);
    if (p1 !== undefined) bump(this.bi, p1, t);
    if (p2 !== undefined && p1 !== undefined) bump(this.tri, `${p2}>${p1}`, t);
    this.recent.push(t);
    if (this.recent.length > 8) this.recent.shift();
    this.prune();
    this.save();
  }

  /** What is likely next, most likely first, with its share of what followed this history. */
  predict(n = 4): { token: Token; p: number }[] {
    const [p2, p1] = [this.recent[this.recent.length - 2], this.recent[this.recent.length - 1]];
    const rows: Map<Token, number>[] = [];
    const tri = p2 !== undefined && p1 !== undefined ? this.tri.get(`${p2}>${p1}`) : undefined;
    if (tri && total(tri) >= TRUST) rows.push(tri);
    const bi = p1 !== undefined ? this.bi.get(p1) : undefined;
    if (bi) rows.push(bi);
    rows.push(this.uni);
    const out: { token: Token; p: number }[] = [];
    for (const row of rows) {
      const sum = total(row);
      for (const [token, c] of [...row.entries()].sort((a, b) => b[1] - a[1])) {
        if (out.length >= n) return out;
        if (!out.some((o) => o.token === token) && c > 0) out.push({ token, p: c / sum });
      }
    }
    return out;
  }

  /** How many times a token has been seen (after decay). */
  count(t: Token) {
    return this.uni.get(t) ?? 0;
  }

  private prune() {
    if (this.uni.size <= MAX_TOKENS) return;
    const drop = [...this.uni.entries()].sort((a, b) => a[1] - b[1]).slice(0, this.uni.size - MAX_TOKENS).map(([t]) => t);
    for (const t of drop) { this.uni.delete(t); this.bi.delete(t); }
  }

  private save() {
    try {
      const obj = (m: Map<string, Map<Token, number>>) => Object.fromEntries([...m].map(([k, row]) => [k, Object.fromEntries(row)]));
      const s: Saved = { v: 1, uni: Object.fromEntries(this.uni), bi: obj(this.bi), tri: obj(this.tri) };
      this.storage?.setItem(this.key, JSON.stringify(s));
    } catch {
      /* no storage: it still learns for this session */
    }
  }
}

function bump(m: Map<string, Map<Token, number>>, k: string, t: Token) {
  let row = m.get(k);
  if (!row) m.set(k, (row = new Map()));
  row.set(t, (row.get(t) ?? 0) + 1);
}

const total = (row: Map<Token, number>) => { let s = 0; for (const v of row.values()) s += v; return s; };

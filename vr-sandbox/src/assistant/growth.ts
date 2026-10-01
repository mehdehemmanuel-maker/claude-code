// How Ego grows. She starts able only to see and explain. Everything you do together gives her experience, and each
// level unlocks an ability she really gains: the code behind it runs only once she has it, and some need more than
// experience (skills need something you've repeated; habits need enough of your building to learn from). She keeps it
// on this headset and picks up where she left off.

export type Ability = 'sight' | 'habits' | 'skills' | 'foresight' | 'initiative' | 'memory';

export interface Level {
  level: number;
  xp: number;
  ability: Ability;
  /** What she says when she gains it. */
  learned: string;
}

export const LEVELS: Level[] = [
  { level: 1, xp: 0, ability: 'sight', learned: 'I can see every part, joint and load, and tell you why something fails.' },
  { level: 2, xp: 25, ability: 'habits', learned: 'I\'ve started learning your habits: I\'ll suggest what you usually do next.' },
  { level: 3, xp: 70, ability: 'skills', learned: 'I can learn skills now: when you repeat something, I\'ll offer to learn it and do it for you.' },
  { level: 4, xp: 150, ability: 'foresight', learned: 'I can see ahead: before you Play, I\'ll check every joint for the load it will carry.' },
  { level: 5, xp: 280, ability: 'initiative', learned: 'I\'ll act on my own now: when you make a joint that won\'t hold, I\'ll say so straight away.' },
  { level: 6, xp: 450, ability: 'memory', learned: 'I remember what you like: your joints and materials come first when I choose.' },
];

/** Experience for what you do together. */
export const XP = { action: 1, joint: 2, ask: 3, play: 5, template: 8, fix: 10, skillLearned: 15, skillUsed: 4 } as const;

interface Saved { v: 1; xp: number; prefs: Record<string, Record<string, number>> }

export class Growth {
  xp = 0;
  /** Counted preferences: kind of choice → what you chose → how often. */
  prefs: Record<string, Record<string, number>> = {};

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null, private key = 'vrsb.ego') {
    try {
      // what she had grown as Ada carries over to Ego
      const raw = this.storage?.getItem(this.key) ?? this.storage?.getItem('vrsb.ada');
      const s = raw ? (JSON.parse(raw) as Saved) : null;
      if (s?.v === 1) { this.xp = Math.max(0, Number(s.xp) || 0); this.prefs = s.prefs ?? {}; }
    } catch { /* start fresh */ }
  }

  get level(): Level {
    let l = LEVELS[0]!;
    for (const x of LEVELS) if (this.xp >= x.xp) l = x;
    return l;
  }

  /** The next level, or null at the top. */
  get next(): Level | null {
    return LEVELS.find((x) => x.xp > this.xp) ?? null;
  }

  has(a: Ability) {
    return LEVELS.find((x) => x.ability === a)!.level <= this.level.level;
  }

  /** Earn experience; returns the levels gained by it (usually none). */
  earn(amount: number): Level[] {
    const before = this.level.level;
    this.xp += amount;
    this.save();
    return LEVELS.filter((x) => x.level > before && x.level <= this.level.level);
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
    try { this.storage?.setItem(this.key, JSON.stringify({ v: 1, xp: this.xp, prefs: this.prefs } satisfies Saved)); } catch { /* not kept */ }
  }
}

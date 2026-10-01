// Ego and your life: what you tell her to remember, what to remind you of, and where your money goes. All of it
// stays on this headset, in its own storage; nothing is sent anywhere. She knows only what you tell her (she can't
// see your bank), and reminders come while the app is open (a web app can't wake the headset).

export interface Fact { key: string; value: string; said: string; at: string }
export interface Reminder { id: string; what: string; due: string; done: boolean }
export interface Money { id: string; amount: number; kind: 'spent' | 'earned'; category: string; note: string; at: string }

const KEY = 'vrsb.life';

/** What a category is, from the words you used ("gas" is transport, "groceries" food...). */
const CATEGORIES: [string, RegExp][] = [
  ['food', /\b(food|groceries|grocery|lunch|dinner|breakfast|restaurant|snacks?|coffee|pizza|takeout|eating out)\b/],
  ['transport', /\b(gas|fuel|petrol|uber|lyft|taxi|bus|train|parking|car|tolls?)\b/],
  ['home', /\b(rent|mortgage|electric(ity)?|water|internet|utilities|furniture|repairs?)\b/],
  ['fun', /\b(games?|movies?|concert|netflix|spotify|subscription|hobby|vr|quest)\b/],
  ['shopping', /\b(clothes|shoes|amazon|shopping|gift|presents?)\b/],
  ['health', /\b(doctor|medicine|pharmacy|gym|dentist|health)\b/],
  ['work', /\b(salary|paycheck|wages|pay|paid|work|job|freelance|client)\b/],
];
export const categoryOf = (words: string) => CATEGORIES.find(([, re]) => re.test(words.toLowerCase()))?.[0] ?? 'other';

/** "$40", "40 dollars", "40.50", "€12", "12 bucks". */
export function amountIn(words: string): number | null {
  const m = /(?:[$€£]\s*(\d+(?:[.,]\d{1,2})?))|(?:(\d+(?:[.,]\d{1,2})?)\s*(?:dollars?|bucks|euros?|pounds?|usd|eur|gbp)\b)/i.exec(words);
  const v = m?.[1] ?? m?.[2];
  return v ? Number(v.replace(',', '.')) : null;
}

/** When "in 20 minutes", "at 5 pm", "at 17:30", "tomorrow at 9", "tonight" is, from now. Null if it says no time. */
export function whenIn(words: string, now: Date): Date | null {
  const t = words.toLowerCase();
  let m: RegExpExecArray | null;
  if ((m = /\bin (\d+(?:\.\d+)?|an?|one|two|three|five|ten|fifteen|twenty|thirty) ?(seconds?|secs?|minutes?|mins?|hours?|hrs?|days?)\b/.exec(t))) {
    const words2: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, five: 5, ten: 10, fifteen: 15, twenty: 20, thirty: 30 };
    const n = words2[m[1]!] ?? Number(m[1]);
    const unit = m[2]!.startsWith('s') ? 1e3 : m[2]!.startsWith('m') ? 6e4 : m[2]!.startsWith('h') ? 36e5 : 864e5;
    return new Date(now.getTime() + n * unit);
  }
  const day = new Date(now);
  if (/\btomorrow\b/.test(t)) day.setDate(day.getDate() + 1);
  if ((m = /\bat (\d{1,2})(?::(\d{2}))? ?(am|pm)?\b/.exec(t))) {
    let h = Number(m[1]);
    const min = Number(m[2] ?? 0);
    if (m[3] === 'pm' && h < 12) h += 12;
    if (m[3] === 'am' && h === 12) h = 0;
    // "at 5" with no am/pm: the next 5 o'clock from now
    if (!m[3] && h < 12 && !/\btomorrow\b/.test(t) && (h < now.getHours() || (h === now.getHours() && min <= now.getMinutes()))) h += 12;
    day.setHours(h, min, 0, 0);
    if (day <= now && !/\btomorrow\b/.test(t)) day.setDate(day.getDate() + 1);
    return day;
  }
  if (/\btonight\b/.test(t)) { day.setHours(20, 0, 0, 0); return day; }
  if (/\btomorrow\b/.test(t)) { day.setHours(9, 0, 0, 0); return day; }
  return null;
}

export class Life {
  facts: Fact[] = [];
  reminders: Reminder[] = [];
  money: Money[] = [];
  /** Budgets per category, per week. */
  budgets: Record<string, number> = {};

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null) {
    try {
      const s = JSON.parse(this.storage?.getItem(KEY) ?? 'null');
      if (s) { this.facts = s.facts ?? []; this.reminders = s.reminders ?? []; this.money = s.money ?? []; this.budgets = s.budgets ?? {}; }
    } catch { /* start fresh */ }
  }

  /** "Remember (that) my sister's birthday is March 3": kept under its subject, said back the way you said it. */
  remember(words: string, now = new Date()): Fact | null {
    const t = words.replace(/^(please )?(remember|note|don'?t forget)( that)?\s*/i, '').trim();
    const m = /^(.+?)\s+(is|are|was|were)\s+(.+)$/i.exec(t);
    if (!m) return null;
    const key = normalise(m[1]!);
    const fact: Fact = { key, value: m[3]!.replace(/[.!]+$/, ''), said: t, at: now.toISOString() };
    this.facts = [...this.facts.filter((f) => f.key !== key), fact];
    this.save();
    return fact;
  }

  /** "What's my sister's birthday?", "when is mum's birthday", "what did I say my locker code was": what you told her. */
  recall(question: string): Fact | null {
    const q = normalise(question.replace(/^(what'?s|what is|what was|when'?s|when is|when was|where'?s|where is|who'?s|who is|do you remember|tell me)\s*/i, '').replace(/\?$/, ''));
    if (!q) return null;
    const exact = this.facts.find((f) => f.key === q);
    if (exact) return exact;
    // the fact whose subject shares the most words with the question
    const qs = new Set(q.split(' '));
    let best: Fact | null = null, score = 0;
    for (const f of this.facts) {
      const s = f.key.split(' ').filter((w) => qs.has(w)).length / Math.max(1, f.key.split(' ').length);
      if (s > score) { score = s; best = f; }
    }
    return score >= 0.5 ? best : null;
  }

  /** "Remind me to call mom in 20 minutes". */
  remind(words: string, now = new Date()): Reminder | null {
    const due = whenIn(words, now);
    if (!due) return null;
    const what = words.replace(/^(please )?remind me (to |about )?/i, '').replace(/\b(in \d+.*|at \d.*|tomorrow.*|tonight.*)$/i, '').trim();
    const r: Reminder = { id: `r${now.getTime().toString(36)}${this.reminders.length}`, what: what || 'what you asked', due: due.toISOString(), done: false };
    this.reminders = [...this.reminders, r];
    this.save();
    return r;
  }

  /** Reminders now due, marked done as they are given. */
  due(now = new Date()): Reminder[] {
    const out = this.reminders.filter((r) => !r.done && new Date(r.due) <= now);
    if (out.length) { for (const r of out) r.done = true; this.save(); }
    return out;
  }

  /** "I spent $40 on gas", "I got paid $500", "paid 12 bucks for lunch". */
  spend(words: string, now = new Date()): Money | null {
    const amount = amountIn(words);
    if (amount === null) return null;
    const earned = /\b(got paid|earned|made|received|income|paycheck|salary|sold)\b/i.test(words);
    const m: Money = { id: `m${now.getTime().toString(36)}${this.money.length}`, amount, kind: earned ? 'earned' : 'spent', category: categoryOf(words), note: words.trim(), at: now.toISOString() };
    this.money = [...this.money, m];
    this.save();
    return m;
  }

  /** What came in and went out since `from` (by category), and against each week's budget. */
  summary(from: Date, to = new Date()) {
    const inRange = this.money.filter((m) => { const t = new Date(m.at); return t >= from && t <= to; });
    const spent = inRange.filter((m) => m.kind === 'spent'), earned = inRange.filter((m) => m.kind === 'earned');
    const byCategory: Record<string, number> = {};
    for (const m of spent) byCategory[m.category] = (byCategory[m.category] ?? 0) + m.amount;
    // a week's budget is for the week, however far into it you are; longer spans count their weeks
    const weeks = Math.max(1, Math.round((to.getTime() - from.getTime()) / (7 * 864e5)));
    const over = Object.entries(this.budgets).filter(([c, b]) => (byCategory[c] ?? 0) > b * weeks).map(([c, b]) => ({ category: c, spent: byCategory[c] ?? 0, budget: b * weeks }));
    return { spent: sum(spent), earned: sum(earned), byCategory, over };
  }

  /** "Set a budget of $100 a week for food". */
  budget(words: string): { category: string; amount: number } | null {
    const amount = amountIn(words);
    if (amount === null) return null;
    const category = categoryOf(words.replace(/budget/i, ''));
    this.budgets = { ...this.budgets, [category]: /\bmonth/i.test(words) ? (amount * 12) / 52 : amount };
    this.save();
    return { category, amount: this.budgets[category]! };
  }

  private save() {
    try { this.storage?.setItem(KEY, JSON.stringify({ facts: this.facts, reminders: this.reminders, money: this.money, budgets: this.budgets })); } catch { /* not kept: said by the storage watchdog */ }
  }
}

const sum = (xs: Money[]) => xs.reduce((s, m) => s + m.amount, 0);

/** A subject in plain lower-case words: "My Sister's Birthday" and "my sisters birthday" are the same. */
function normalise(s: string) {
  return s.toLowerCase().replace(/['’]s\b/g, 's').replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(my|the|a|an|our)\b/g, ' ').replace(/\s+/g, ' ').trim();
}

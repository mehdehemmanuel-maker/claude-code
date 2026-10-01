// Skills Ego teaches herself. She watches the transcript of what you build (Forge lines). When the same run of steps
// (the same kinds placed, the same joints made) comes round again, she offers to learn it. A skill is those steps made
// general: positions relative to the first part placed, names turned into slots. Run, it builds the same thing
// wherever you are, through the same commands as everything else. Skills are kept on this headset.

export interface Skill {
  id: string;
  name: string;
  /** Forge lines with $1.. for the parts it places and `at dx y dz` relative to the first part (y stays height). */
  lines: string[];
  /** The abstract steps, to know it when it comes round again. */
  signature: string;
  uses: number;
}

const token = (line: string) => {
  const w = line.split(' ');
  if (w[0] === 'place') return `place:${w[1]}`;
  if (w[0] === 'join') return `join:${w[w.length - 1]}`;
  if (w[0] === 'set') return `set:${(w[2] ?? '').split('=')[0]}`;
  return w[0] ?? '';
};

/**
 * The run of 2 to 6 steps just finished, if the same steps (by kind) came before too and it builds something: parts
 * placed and joined, ending on the join that finishes it (so she waits for the whole thing, not its first half).
 * Returns the concrete lines of the latest run.
 */
export function findRepeat(journal: string[], minLen = 2, maxLen = 6): string[] | null {
  const toks = journal.map(token);
  for (let L = Math.min(maxLen, Math.floor(toks.length / 2)); L >= minLen; L--) {
    const tail = toks.slice(-L);
    if (!tail.some((t) => t.startsWith('place:')) || !tail[tail.length - 1]!.startsWith('join:')) continue;
    const sig = tail.join('|');
    let seen = false;
    for (let i = 0; i + L <= toks.length - L && !seen; i++) if (toks.slice(i, i + L).join('|') === sig) seen = true;
    if (!seen) continue;
    const lines = journal.slice(-L);
    if (generalize(lines)) return lines;
  }
  return null;
}

export const signatureOf = (lines: string[]) => lines.map(token).join('|');

/** The lines made general, or null when they refer to parts they didn't place (then they aren't a whole thing). */
export function generalize(lines: string[]): string[] | null {
  const slot = new Map<string, string>();
  let origin: [number, number] | null = null;
  const out: string[] = [];
  for (const line of lines) {
    const w = line.split(' ');
    if (w[0] === 'place') {
      const at = w.indexOf('at'), as = w.indexOf('as');
      if (at < 0 || as < 0) return null;
      const [x, y, z] = [Number(w[at + 1]), Number(w[at + 2]), Number(w[at + 3])];
      if (![x, y, z].every(Number.isFinite)) return null;
      origin ??= [x, z];
      slot.set(w[as + 1]!, `$${slot.size + 1}`);
      const body = [...w.slice(0, at), 'at', fmt(x - origin[0]), fmt(y), fmt(z - origin[1]), 'as', slot.get(w[as + 1]!)!];
      out.push(body.join(' '));
    } else if (w[0] === 'join') {
      const a = slot.get(w[1]!), b = w[2] === 'floor' ? 'floor' : slot.get(w[2]!);
      if (!a || !b) return null;
      out.push(['join', a, b, ...w.slice(3)].join(' '));
    } else if (w[0] === 'set' || w[0] === 'delete') {
      const r = slot.get(w[1]!);
      if (!r) return null;
      out.push([w[0], r, ...w.slice(2)].join(' '));
    } else {
      return null;
    }
  }
  return slot.size ? out : null;
}

/** A skill as Forge to run at (x, z) on the floor, its parts named `prefix1`, `prefix2`... */
export function skillProgram(skill: Skill, x: number, z: number, prefix: string): string {
  return skill.lines.map((line) => {
    const w = line.split(' ');
    if (w[0] === 'place') {
      const at = w.indexOf('at');
      w[at + 1] = fmt(Number(w[at + 1]) + x);
      w[at + 3] = fmt(Number(w[at + 3]) + z);
    }
    return w.map((t) => (/^\$\d+$/.test(t) ? `${prefix}${t.slice(1)}` : t)).join(' ');
  }).join('\n');
}

/** A name from what it does: "block, block, weld". */
export function nameFor(lines: string[]) {
  const words = lines.map((l) => {
    const w = l.split(' ');
    if (w[0] === 'place') return (w[1] ?? '').replace(/^.*\./, '');
    if (w[0] === 'join') return w[w.length - 1] === 'auto' ? 'join' : w[w.length - 1]!;
    return w[0]!;
  });
  return words.join(', ');
}

const fmt = (v: number) => String(+v.toFixed(4));

export class SkillBook {
  skills: Skill[] = [];
  /** Signatures you said no to: she doesn't ask again. */
  declined = new Set<string>();

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'> | null = globalThis.localStorage ?? null, private key = 'vrsb.skills') {
    try {
      const raw = this.storage?.getItem(this.key);
      const s = raw ? (JSON.parse(raw) as { skills: Skill[]; declined: string[] }) : null;
      if (s) { this.skills = s.skills ?? []; this.declined = new Set(s.declined ?? []); }
    } catch { /* start fresh */ }
  }

  knows(signature: string) {
    return this.skills.some((s) => s.signature === signature) || this.declined.has(signature);
  }

  learn(lines: string[]): Skill | null {
    const general = generalize(lines);
    if (!general) return null;
    const skill: Skill = { id: `s${Date.now().toString(36)}${this.skills.length}`, name: nameFor(lines), lines: general, signature: signatureOf(lines), uses: 0 };
    this.skills.push(skill);
    this.save();
    return skill;
  }

  decline(signature: string) {
    this.declined.add(signature);
    this.save();
  }

  forget(id: string) {
    this.skills = this.skills.filter((s) => s.id !== id);
    this.save();
  }

  used(id: string) {
    const s = this.skills.find((x) => x.id === id);
    if (s) { s.uses++; this.save(); }
  }

  private save() {
    try { this.storage?.setItem(this.key, JSON.stringify({ skills: this.skills, declined: [...this.declined] })); } catch { /* not kept */ }
  }
}

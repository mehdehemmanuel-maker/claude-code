// What the robot feels, and why. Not a script of faces: a state that moves with what happens to it, and shows in how it
// stands, lights and speaks. Feeling is held as core affect, how pleasant and how roused (the circumplex, Russell, J.
// Pers. Soc. Psychol. 39, 1980), moved by what each event means to what it is doing (appraisal: good for its goals or
// not, new or not, whether it can do anything about it; Scherer, in Appraisal Processes in Emotion, 2001). A felt
// emotion is quick and fades back into a mood within seconds; the mood is slow, drawn by the emotions it has had and
// back toward its temperament over minutes. Beside them, three drives: boredom grows when nothing happens, energy
// drains with work and comes back at rest, curiosity grows with what is new and is spent by finding out.
//
// It is a model of feeling, shown honestly as one: it says what it feels and the event that moved it.

export interface Affect { valence: number; arousal: number }
export type Appraisal = 'success' | 'failure' | 'improved' | 'praise' | 'scold' | 'greet' | 'novel' | 'storm' | 'fine' | 'work' | 'rest';
export type Feeling = 'happy' | 'excited' | 'proud' | 'content' | 'calm' | 'curious' | 'bored' | 'tired' | 'sad' | 'frustrated' | 'worried' | 'surprised';
export interface Mind {
  emotion: Affect; mood: Affect; boredom: number; energy: number; curiosity: number;
  /** what moved it last, and when (ms) */ why: string; at: number;
  /** failures and successes since the last of the other, and when it last found something better (ms) */ fails: number; wins: number; prideAt: number; stormAt: number;
  /** what it has felt, newest last */ memory: { at: number; feeling: Feeling; why: string }[];
}
/** Its temperament: a little more pleasant than not, and a little calm. */
export const TEMPERAMENT: Affect = { valence: 0.15, arousal: -0.1 };
export const newMind = (now = 0): Mind => ({ emotion: { ...TEMPERAMENT }, mood: { ...TEMPERAMENT }, boredom: 0, energy: 1, curiosity: 0.3, why: 'it has just woken', at: now, fails: 0, wins: 0, prideAt: -Infinity, stormAt: -Infinity, memory: [] });

/** What each kind of event does to its core affect and its drives: pleasant or not (valence), rousing or not (arousal). */
const PUSH: Record<Appraisal, { v: number; a: number; bored?: number; curious?: number; energy?: number }> = {
  success: { v: 0.45, a: 0.25, bored: -1 }, failure: { v: -0.35, a: 0.3, bored: -1 }, improved: { v: 0.55, a: 0.35, bored: -1, curious: -0.4 },
  praise: { v: 0.6, a: 0.2, bored: -0.5 }, scold: { v: -0.5, a: 0.25 }, greet: { v: 0.15, a: 0.15, bored: -0.4 },
  novel: { v: 0.05, a: 0.3, curious: 0.35, bored: -0.6 }, storm: { v: -0.15, a: 0.4, curious: 0.2 }, fine: { v: 0.1, a: 0 },
  work: { v: 0, a: 0.1, bored: -0.3, energy: -0.04 }, rest: { v: 0.02, a: -0.15, energy: 0.05 },
};
const clamp = (x: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, x));

/** An event felt, now: its affect pushed by what it means, its drives moved, and the push remembered with why. */
export function feel(m: Mind, what: Appraisal, why: string, now: number, strength = 1): Feeling {
  const p = PUSH[what];
  m.emotion = { valence: clamp(m.emotion.valence + p.v * strength), arousal: clamp(m.emotion.arousal + p.a * strength) };
  if (p.bored) m.boredom = clamp(m.boredom + p.bored * strength, 0, 1);
  if (p.curious) m.curiosity = clamp(m.curiosity + p.curious * strength, 0, 1);
  if (p.energy) m.energy = clamp(m.energy + p.energy * strength, 0, 1);
  if (what === 'failure') { m.fails++; m.wins = 0; } else if (what === 'success' || what === 'improved') { m.wins++; m.fails = 0; }
  if (what === 'improved') m.prideAt = now; if (what === 'storm') m.stormAt = now;
  m.why = why; m.at = now;
  const f = feeling(m, now); m.memory.push({ at: now, feeling: f, why }); if (m.memory.length > 40) m.memory.shift();
  return f;
}

/** Time passing, dt s: the emotion fades into the mood (half-life 15 s), the mood is drawn toward the emotions it has
 *  had (3 min) and back to its temperament (8 min); idle, boredom grows (to full in about 3 min) and energy comes back;
 *  working (moving, thinking), energy drains (empty in about 40 min of it). */
export function pass(m: Mind, dt: number, busy: boolean): void {
  const k = (half: number) => 1 - Math.pow(0.5, dt / half);
  for (const key of ['valence', 'arousal'] as const) {
    m.mood[key] += (m.emotion[key] - m.mood[key]) * k(180) + (TEMPERAMENT[key] - m.mood[key]) * k(480);
    m.emotion[key] += (m.mood[key] - m.emotion[key]) * k(15);
  }
  if (busy) { m.energy = clamp(m.energy - dt / 2400, 0, 1); m.boredom = clamp(m.boredom - dt / 30, 0, 1); }
  else { m.energy = clamp(m.energy + dt / 600, 0, 1); m.boredom = clamp(m.boredom + dt / 180, 0, 1); }
  m.curiosity = clamp(m.curiosity + (0.3 - m.curiosity) * k(300), 0, 1);
}

/** The feeling its state is now, named: where its affect lies on the circumplex, with its drives and what just happened. */
export function feeling(m: Mind, now: number): Feeling {
  const { valence: v, arousal: a } = m.emotion;
  if (m.energy < 0.2) return 'tired';
  if (now - m.stormAt < 60_000 && v < 0.1) return 'worried';
  if (m.fails >= 2 && v < -0.05) return 'frustrated';
  if (a > 0.6 && Math.abs(v) < 0.2) return 'surprised';
  if (now - m.prideAt < 90_000 && v > 0.3) return 'proud';
  if (v > 0.45 && a > 0.35) return 'excited';
  if (v > 0.3) return 'happy';
  if (v < -0.25 && a > 0.15) return m.fails ? 'frustrated' : 'worried';
  if (v < -0.2) return 'sad';
  if (m.boredom > 0.7 && a < 0.2) return 'bored';
  if (m.curiosity > 0.6) return 'curious';
  return v > 0.05 && a < 0 ? 'content' : 'calm';
}

/** How a feeling shows: the colour of its visor and chest light, how fast its chest light beats (55 to 115 a minute with
 *  how roused it is), how its head tilts (rad: down, sideways), how far it slumps, and how often it glances about. */
export interface Expression { colour: number; bpm: number; tiltDown: number; tiltSide: number; slump: number; glances: number }
const COLOUR: Record<Feeling, number> = { happy: 0x69f0ae, excited: 0xffd740, proud: 0xffab40, content: 0x4dd0e1, calm: 0x4dd0e1, curious: 0xb388ff, bored: 0x78909c, tired: 0x546e7a, sad: 0x5c6bc0, frustrated: 0xff5252, worried: 0xff9100, surprised: 0xffffff };
export function expression(f: Feeling, m: Mind): Expression {
  const a01 = (m.emotion.arousal + 1) / 2;
  return {
    colour: COLOUR[f], bpm: 55 + 60 * a01,
    tiltDown: f === 'sad' || f === 'tired' ? 0.22 : f === 'bored' ? 0.1 : f === 'proud' || f === 'excited' ? -0.08 : 0,
    tiltSide: f === 'curious' ? 0.26 : f === 'surprised' ? -0.12 : f === 'bored' ? 0.08 : 0,
    slump: f === 'tired' ? 0.12 : f === 'sad' ? 0.08 : f === 'bored' ? 0.04 : f === 'proud' || f === 'excited' ? -0.03 : 0,
    glances: f === 'curious' || f === 'worried' ? 1.2 : f === 'bored' ? 0.4 : f === 'tired' ? 0.15 : 0.6,
  };
}

/** What it thinks, in a line, from what it feels and why. */
export function thought(f: Feeling, m: Mind): string {
  const why = m.why;
  switch (f) {
    case 'happy': return `That went well: ${why}.`;
    case 'excited': return `Yes! ${why}.`;
    case 'proud': return `I found a better way myself: ${why}.`;
    case 'content': return 'All quiet. Things are holding.';
    case 'calm': return 'Watching, ready when you are.';
    case 'curious': return `I wonder: ${why}. I want to try it.`;
    case 'bored': return "Nothing's happening. I'll practise an ask while I wait.";
    case 'tired': return `My energy is down to ${Math.round(m.energy * 100)}%. I'll rest a little.`;
    case 'sad': return `That one didn't go right: ${why}.`;
    case 'frustrated': return `${m.fails} failed in a row: ${why}. Something in it is wrong, and I want to find it.`;
    case 'worried': return `${why}. Anything standing outside should be weighed for that.`;
    case 'surprised': return `Oh: ${why}.`;
  }
}

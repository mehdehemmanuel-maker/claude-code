// Surprise me: something picked at random to be made, brought in or gone to, said as an ask the rest of the forge
// reads like anything you say: a thing designed to a need (a shelf that holds so much, a bridge over so far), one of the
// inventory's real products, people, a fight, or a place. Where Claude can be asked it picks, and its pick is used only
// if it reads as something the forge can do; otherwise the pick is made here, from the asks the intent pipeline is known
// to read (each one tested: tests/nexus/surprise.test.ts).

/** A random number in [lo, hi], rounded to so many places. */
const pick = (r: () => number, lo: number, hi: number, dp = 0) => { const v = lo + (hi - lo) * r(); const k = 10 ** dp; return Math.round(v * k) / k; };
const one = <T>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length]!;

/** Things designed to what they must do, each with its numbers drawn from a range a real one has. */
export const DESIGNS: readonly ((r: () => number) => string)[] = [
  (r) => `a shelf that holds ${pick(r, 15, 80)} kg ${pick(r, 0.6, 1.6, 1)} m wide`,
  (r) => `a bridge that carries ${pick(r, 80, 500, -1)} kg over ${pick(r, 2, 6, 1)} m`,
  (r) => `a cart that carries ${pick(r, 40, 300, -1)} kg at ${pick(r, 3, 12)} km/h`,
  (r) => `a table for ${pick(r, 2, 10)} people`,
  (r) => `a gate ${pick(r, 0.9, 3, 1)} m wide that swings open`,
  (r) => `a tank that holds ${pick(r, 20, 800, -1)} L of water`,
  (r) => `a crane that lifts ${pick(r, 50, 500, -1)} kg ${pick(r, 2, 6, 1)} m`,
  (r) => `a chair for a ${pick(r, 50, 130)} kg person`,
  (r) => `a tower ${pick(r, 3, 15)} m tall`,
  (r) => `a box that holds ${pick(r, 5, 120)} L`,
  (r) => `a drawer that slides out ${pick(r, 25, 60)} cm`,
  (r) => `a bed for ${pick(r, 1, 2)} people`,
  (r) => `a desk ${pick(r, 1, 2.2, 1)} m wide`,
  (r) => `a raft that floats ${pick(r, 80, 600, -1)} kg`,
  (r) => `a dog house for a ${pick(r, 5, 60)} kg dog`,
  (r) => `a bike rack for ${pick(r, 2, 8)} bikes`,
  (r) => `a workbench that holds ${pick(r, 100, 400, -1)} kg`,
  (r) => `a robot arm that lifts ${pick(r, 0.5, 5, 1)} kg ${pick(r, 0.3, 1, 1)} m`,
  (r) => `a drone that carries a ${pick(r, 0.5, 4, 1)} kg parcel ${pick(r, 2, 12)} km at ${pick(r, 8, 20)} m/s`,
  (r) => `a boat that carries ${pick(r, 100, 600, -1)} kg ${pick(r, 5, 30)} km at ${pick(r, 2, 5, 1)} m/s`,
  (r) => `a cabin of ${pick(r, 15, 60)} m² for ${pick(r, 1, 4)} people where winter gets to ${-pick(r, 5, 35)} °C`,
  (r) => `an electric car for ${pick(r, 2, 5)} people that goes ${pick(r, 150, 500, -1)} km at ${pick(r, 80, 130, -1)} km/h`,
];
/** People, a fight, a place. */
export const OTHERS: readonly ((r: () => number) => string)[] = [
  (r) => `generate ${pick(r, 2, 6)} random people`, () => 'spawn a woman', () => 'spawn a man', () => 'spawn an MMA fighter', () => 'fight',
];

export interface Surprise { say: string; kind: 'design' | 'product' | 'people' | 'place' }

/** A surprise picked here: mostly a thing designed to a need, sometimes a real product, people, or a fight. */
export function surpriseHere(r: () => number, products: readonly string[] = []): Surprise {
  const x = r();
  if (x < 0.6 || (!products.length && x < 0.8)) return { say: `build ${one(r, DESIGNS)(r)}`, kind: 'design' };
  if (x < 0.8 && products.length) return { say: `show me a ${one(r, products).toLowerCase()}`, kind: 'product' };
  return { say: one(r, OTHERS)(r), kind: 'people' };
}

/** What Claude is asked, where it can be: one surprising thing to make, as one plain ask, within what the forge does. */
export function surprisePrompt(room: { made: string[]; people: string[]; products: string[] }, examples: string[]): string {
  return [
    'You pick ONE surprising thing for a VR forge to make or bring in right now, and say it as the user would ask for it.',
    'The forge designs things to what they must do (hold a weight up, carry a load, turn, swing open, slide, hold a liquid, enclose a space, keep warm, lift, float, move), with numbers; it can show real products from its inventory; it can bring in people (men, women, fighters) and set two fighting.',
    `Asks it reads, for their shape: ${examples.slice(0, 8).map((e) => JSON.stringify(e)).join(', ')}.`,
    `Products it has (a few): ${room.products.slice(0, 30).join(', ')}.`,
    `In the room now: ${room.made.join(', ') || 'nothing made'}; people: ${room.people.join(', ') || 'none'}. Pick something different from these, and unexpected.`,
    'Answer with JSON only: {"say": "<the ask, as said>", "why": "<a few words>"}',
  ].join('\n');
}
/** Claude's pick, used only as a string to be read like anything said; anything else is not used. */
export function checkSurprise(j: unknown): string | null {
  const s = (j as { say?: unknown } | null)?.say; return typeof s === 'string' && s.trim().length > 2 && s.length < 200 ? s.trim() : null;
}

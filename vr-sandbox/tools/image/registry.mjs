// The registries: the one place a package extends the tool, and the vocabulary the reader consults. Four ordered
// arrays and register(); nothing of Node in it, and it imports only styles.mjs (for the built-in finishes) so the
// reader can import it without a cycle (read.mjs -> registry.mjs; core.mjs -> both).
//
//   things      { id, match, usual, word?, band?, depth?, size?, onWater?, sky?, draw(ctx, inst) }: what stands in a
//               picture. The reader tries every entry's `match` on each token, so a package that registers
//               { id: 'lighthouse', match: /^lighthouses?$/, usual: 1, draw } makes read('a lighthouse') answer
//               things.lighthouse 1 with nothing ignored, and thingsPass draws it; `word` is the key in scene.things
//               when it is not the id (the six built-ins keep theirs plural: trees, houses). The six built-ins' word
//               rows stay in read.mjs's THINGS table (things.mjs points its drawers at it), one source for them;
//               mountains, hills, sun, moon and stars are read from the same table and painted by the passes.
//   families    { id, detect(scene), passes: [fn(ctx)…], words?: RegExp, apply?(scene, word) }: which passes paint
//               a kind of picture. The first whose detect() answers paints the scene, else the first registered. A
//               family with `words` claims them in the reader: each token they match is read, and apply(scene, word)
//               (or, without one, scene.family = id) is run, so a space family can claim mars, planet and nebula.
//   styles      { id, match, apply(img, ctx), grain?, vignette?, scene? }: a finish over the whole (styles.mjs); the
//               built-in eight are here from the start. The reader names the first whose match answers a token.
//   conditions  the time, sky, weather and ground matchers read.mjs weighs, in its order: read.mjs fills this array
//               with its CONDITIONS (the same array), so an entry registered here is weighed after them.
//
// register(kind, entry) adds an entry in order; one with the id of an entry already there takes its place. The
// arrays are process-global and mutable: every importer in one process shares them, and the things' order is the
// painter's order (thingsPass paints in it, each thing from ctx.rand), so re-registering changes the pictures.
import { STYLES } from './styles.mjs';

export const things = [];
export const families = [];
export const styles = [...STYLES];
export const conditions = [];
const REGISTRIES = { things, families, styles, conditions };

/** Adds an entry to a registry, in order; one with the id of an entry already there takes its place. */
export function register(kind, entry) {
  const list = REGISTRIES[kind];
  if (!list) throw new Error(`no registry named ${kind}`);
  const at = list.findIndex((e) => e.id === entry.id);
  if (at >= 0) list[at] = entry;
  else list.push(entry);
  return entry;
}

// ── The vocabulary, as the reader asks it ──

/** The key of a thing in scene.things: its word when it has one, else its id. */
export const keyOf = (entry) => entry.word ?? entry.id;

/** The registered thing a token names, or undefined. */
export const thingFor = (token) => things.find((t) => t.match instanceof RegExp && t.match.test(token));

/** The registered thing whose key this is, or undefined. */
export const thingByKey = (key) => things.find((t) => keyOf(t) === key);

/** The family that claims a token through its `words`, or undefined. */
export const familyFor = (token) => families.find((f) => f.words instanceof RegExp && f.words.test(token));

/** The style a token names, or undefined. */
export const styleNamed = (token) => styles.find((s) => s.match instanceof RegExp && s.match.test(token));

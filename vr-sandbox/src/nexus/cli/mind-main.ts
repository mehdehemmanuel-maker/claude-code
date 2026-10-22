// `npm run mind` — the local model on the user's own hardware, and what it is allowed to answer.
//
//   npm run mind -- --check                      is one reachable, which, and how fast does it answer
//   npm run mind -- "<an ask>"                   read the ask into the engine's own closed vocabulary
//   npm run mind -- "<an ask>" --both            …beside what the pattern-matching reader says, to compare
//
// It needs NEXUS_MIND_URL and NEXUS_MIND_MODEL, which `bash tools/local-llm.sh` prints when it has installed and
// served a model. With neither set, every command here still runs and says so: nothing in this tree requires a
// model to be present, and the regex readers remain the answer when none is.

import { pickFromSaying, mindAt, reachable } from '../ask/mind';
import { readMachine } from '../ask/machine-read';
import type { Does } from '../ask/machine-units';

/** The engine's own closed vocabulary of what a machine must DO. The model picks from THIS — it is never asked to
 *  invent a word, and anything it says that is not here is dropped by `keepOnly` before it is seen. */
const DOES: readonly Does[] = ['slide', 'turn', 'grip', 'deposit', 'cut', 'solder', 'see', 'think', 'hold'];

const args = process.argv.slice(2);
const both = args.includes('--both');
const words = args.filter((a) => !a.startsWith('--')).join(' ');
const at = mindAt();

const say = (s = '') => console.log(s);

if (!at) {
  say('No local model is configured.');
  say('');
  say('  bash tools/local-llm.sh        looks at your machine, picks a model that fits it, installs and serves it');
  say('  bash tools/local-llm.sh --check  says what it would do and changes nothing');
  say('');
  say('It then prints the two lines to export (NEXUS_MIND_URL and NEXUS_MIND_MODEL).');
  say('Nothing here needs it: every reader still works without one. It only sharpens them.');
  process.exit(0);
}

say(`model    ${at.model}`);
say(`at       ${at.url}`);

if (args.includes('--check') || !words) {
  const t0 = Date.now();
  const ok = await reachable(at);
  say(`answers  ${ok ? `yes, in ${Date.now() - t0} ms` : 'NO — is it serving? (bash tools/local-llm.sh)'}`);
  if (ok) {
    const c = await pickFromSaying({ from: DOES, text: 'a machine that cuts a plate and picks the parts off it', about: 'Verbs a machine can do.', many: true }, at);
    say(`picks    ${c.pick.join(', ') || '(nothing)'}  in ${c.ms} ms`);
    say(c.pick.includes('cut') && c.pick.includes('grip') ? '         ✓ the right two out of nine' : '         ~ not both of cut+grip: a smaller model may need fewer words at a time');
  }
  process.exit(ok ? 0 : 1);
}

// ---- read one ask -------------------------------------------------------------------------------------------
say('');
say(`ask      ${words}`);
const got = await pickFromSaying({ from: DOES, text: words, about: 'Verbs a machine can do.', many: true }, at);
say(`model    ${got.pick.join(', ') || '(nothing)'}  — ${got.ms} ms`);

if (both) {
  // The reader it is measured against: 7,274 characters of hand-written word-matching across three files is what
  // reads English here today, and the only honest way to know whether a model helps is to print both answers.
  const pat = readMachine(words);
  say(`pattern  ${pat.does.join(', ') || '(nothing)'}`);
  const m = new Set(got.pick), p = new Set(pat.does);
  const only = (a: Set<string>, b: Set<string>) => [...a].filter((x) => !b.has(x));
  const mOnly = only(m, p), pOnly = only(p, m);
  say('');
  if (!mOnly.length && !pOnly.length) say('they agree');
  else {
    if (mOnly.length) say(`the model saw what the pattern missed: ${mOnly.join(', ')}`);
    if (pOnly.length) say(`the pattern saw what the model missed: ${pOnly.join(', ')}`);
    say('');
    say('Neither is the verdict. The engine composes from the vocabulary either way, and every size, force and');
    say('price after this point is derived, not said — a model is allowed to pick the word and nothing else.');
  }
}

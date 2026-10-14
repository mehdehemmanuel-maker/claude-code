// `npm run why` — why a made thing is judged the way it is: every finding grouped by cause and attributed to the part
// that owns it, with the checks that looked at nothing.
//
//   npm run why -- "a small hatchback"            every open finding, grouped
//   npm run why -- --kit car "a small hatchback"  when the words alone pick the wrong kit
//   npm run why -- --seed 3 "a street"            another seed, to see which findings are structural
//
// THIS EXISTS BECAUSE I WROTE IT BY HAND FIVE TIMES IN ONE SESSION. Five throwaway `zz_probe_*` tests, each deleted
// before committing, each asking the same question of a different thing: what are the findings, grouped by check; who
// is the mover that owns each one; which obstacle does each name; what is the ratio between what a part declares and
// what it draws. Those five probes found, in order: that 92 % of a car's findings were two checks; that eight of
// sixteen came from one cast housing; that three wrong hypotheses about the cause were wrong; and that thirty-eight
// `declared` findings fall on exactly three ratios — 1.26, 0.6 and 1.2 — which is a sizing bug, not thirty-eight
// broken parts (docs/ROUNDS.md Run 7h, 7q).
//
// Every one of those was available in one pass over `perfect()`'s own output. Having to rebuild the pass each time is
// why three hypotheses got formed before the first measurement: the cheap thing to do was reason, and the expensive
// thing was look. That is the whole of what this door changes.
//
// It prints: the count open and put right; each check with its share; under each check, the parts that own it, the
// distinct things they say, and — where a finding compares a declared figure against a drawn one — the exact ratios,
// because a repeated ratio is one bug and a spread of them is many; and last, the checks that looked at NOTHING,
// which is the difference between "it is fine" and "nobody asked" (`Looked`, src/nexus/make/critic.ts).
import { KITS, makeKit } from '../parts/kits';
// the kits that register themselves on import, which `view/look.ts` and `view/forge.ts` already pull in for the same
// reason: without these two the `machine` kit does not exist and `--kit machine` is refused by the very guard built
// to stop a door guessing — the user's own composed-machine theme, unreachable from both new doors (docs/MANNY.md #113)
import '../world/creatures';
import '../ask/machine';
import { perfect } from '../make/pipeline';
import { howItMoves } from '../make/moves';
import type { Finding } from '../make/critic';

const argv = process.argv.slice(2);
const take = (flag: string): string | undefined => { const i = argv.indexOf(flag); return i < 0 ? undefined : argv.splice(i, 2)[1]; };
const kitId = take('--kit'), seed = Number(take('--seed') ?? 1), words = argv.filter((a) => !a.startsWith('--')).join(' ');
if (!words) { console.log('npm run why -- [--kit <id>] [--seed <n>] "<words>"\n\n  every finding on what those words make, grouped by cause and attributed to the part that owns it'); process.exit(2); }

// IT DOES NOT GUESS A KIT. `look.mjs` defaults to `kit=part` when the words name none, and that default is why a
// measurement of the critic's output on "a small hatchback" came back empty and was written up as "the critic is
// silent" — twice, a commit apart (docs/ROUNDS.md, "the default that lies"). This door was built with the same
// fallback and drew an end cap for a 2020 profile on its first run, which is the fault reproducing itself inside the
// tool written to stop it. So: no match, no answer — it says what it could not decide and lists what it would take.
const named = KITS.find((k) => k.id === kitId) ?? KITS.find((k) => new RegExp(`\\b${k.id}\\b`, 'i').test(words));
if (!named) {
  console.log(`why: "${words}"`);
  console.log(`no kit is named in those words, and guessing one is how this question has been answered wrongly before.`);
  console.log(`say which: npm run why -- --kit <id> "${words}"`);
  console.log(`kits: ${KITS.map((k) => k.id).sort().join(' ')}`);
  console.log('WHY: no kit named');
  process.exit(2);
}
if (kitId && !KITS.some((k) => k.id === kitId)) { console.log(`no kit \`${kitId}\`\nWHY: no such kit`); process.exit(2); }
const byWords = named;
const made = makeKit(byWords, words, seed);
const m = perfect(made.part, words);
const open = m.findings.filter((f) => !f.fixed), fixed = m.findings.filter((f) => f.fixed);

console.log(`why: "${words}"   kit=${byWords.id}  seed=${seed}  →  ${made.part.name}`);
console.log(`${open.length} still wrong, ${fixed.length} put right, ${m.rounds} round${m.rounds === 1 ? '' : 's'}\n`);

const RATIO = /says ⌀([\d.]+) and the nearest it draws is ⌀([\d.]+)/;
const byCheck = new Map<string, Finding[]>();
for (const f of open) (byCheck.get(f.check) ?? byCheck.set(f.check, []).get(f.check)!).push(f);
for (const [check, fs] of [...byCheck].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${check}  —  ${fs.length} of ${open.length} (${Math.round((100 * fs.length) / open.length)}%)`);
  const parts = new Map<string, number>();
  for (const f of fs) parts.set(f.part, (parts.get(f.part) ?? 0) + 1);
  const top = [...parts].sort((a, b) => b[1] - a[1]);
  console.log(`  ${top.length} part${top.length === 1 ? '' : 's'}: ${top.slice(0, 6).map(([p, n]) => `${p}${n > 1 ? ` ×${n}` : ''}`).join(', ')}${top.length > 6 ? `, …` : ''}`);
  // A REPEATED RATIO IS ONE BUG; A SPREAD OF THEM IS MANY. This is the line that turned 38 findings on 12 parts into
  // three constants, and three constants into one question instead of twelve.
  const ratios = new Map<string, { n: number; eg: string }>();
  for (const f of fs) { const r = RATIO.exec(f.says); if (!r) continue; const k = (Number(r[2]) / Number(r[1])).toFixed(4);
    const e = ratios.get(k) ?? { n: 0, eg: `${f.part}: ⌀${r[1]} → ⌀${r[2]}` }; e.n++; ratios.set(k, e); }
  if (ratios.size) for (const [r, e] of [...ratios].sort((a, b) => b[1].n - a[1].n)) console.log(`  drawn / declared = ${r}  ×${e.n}   e.g. ${e.eg}`);
  const said = new Map<string, number>();
  for (const f of fs) { const key = f.says.replace(/[\d.]+/g, '#').slice(0, 72); said.set(key, (said.get(key) ?? 0) + 1); }
  for (const [s, n] of [...said].sort((a, b) => b[1] - a[1]).slice(0, 3)) console.log(`  says ×${n}: ${s}`);
  console.log('');
}

const dead = Object.entries(m.looked).filter(([, n]) => !n).map(([c]) => c);
console.log(`${Object.keys(m.looked).length - dead.length} of the critic's ${Object.keys(m.looked).length} checks looked at this${dead.length ? `; these looked at NOTHING, so their silence means nothing: ${dead.join(', ')}` : ''}`);
if (!m.contracts.length) console.log('no interface was checked: nothing in it declares one');
else console.log(`${m.contracts.length} interfaces checked, ${m.contracts.filter((c) => !c.ok).length} fail`);
console.log(`WHY: ${open.length} open`);

// AND THE MOTION, UNASKED. The census line below it says which checks looked at nothing; this says the same thing for
// movement, which no check covers at all: how many parts move, how many of their joints the mechanism could use, and
// how many move with nothing saying how. `npm run moves` gives the detail; nobody has to know to ask for the verdict.
const mv = howItMoves(made.part);
console.log('');
console.log(`its motion: ${mv.from.length} parts move, ${mv.joints} of ${mv.joints + mv.dropped.length} declared joints usable${mv.m ? `, ${mv.m.dof} degrees of freedom left` : ''}`);
// no usable joint means no mechanism, and a degrees-of-freedom number printed anyway would be this door telling every
// future round something false about every build, unasked — which is the worst place for it (docs/MANNY.md #106)
if (!mv.m) console.log(`  ${mv.why}`);
if (mv.floating.length) console.log(`  ${mv.floating.length} rigid ${mv.floating.length === 1 ? 'body is' : 'bodies are'} touched by no joint: ${mv.floating.slice(0, 4).join(', ')}${mv.floating.length > 4 ? ` (+${mv.floating.length - 4})` : ''} — absent joints, not motion`);
if (mv.dropped.length) console.log(`  ${mv.dropped.length} joint${mv.dropped.length === 1 ? '' : 's'} left out of the count: ${[...new Set(mv.dropped.map((d) => d.why.replace(/\(.*\)/, '')))].join(' / ')}`);
const nosay = mv.from.filter((x) => x.unsaid);
if (nosay.length) console.log(`  ${nosay.length} move${nosay.length === 1 ? 's' : ''} and nothing says how: ${nosay.slice(0, 4).map((x) => x.part).join(', ')}${nosay.length > 4 ? ` (+${nosay.length - 4})` : ''}`);
console.log(`  npm run moves -- --kit ${named.id} "${words}"   for each mover's range, sweep and edges`);

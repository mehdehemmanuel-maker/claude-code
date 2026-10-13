// `npm run moves` — what moves in a made thing, how far, what its sweep needs clear, and how many ways the whole
// mechanism can still move.
//
//   npm run moves -- --kit car "a small hatchback"    every mover, its edges, and the DOF count
//   npm run moves -- --kit car --part hub "..."       only the movers whose name matches
//   npm run moves -- --kit printer "a 3d printer"
//
// It answers the question that had no door: a part's range of motion and the edges round it — what it is connected
// to, what it moves within, what constrains it, what force it passes on, and the envelope its sweep needs kept clear.
// Those were all derivable from what parts already declare (`joint`, `travel`, `link`, `movesWith`, `passes`,
// `iface`) and nothing read them together, so no question about motion could be asked without writing a probe first.
//
// It also runs `mobility()` (src/nexus/parts/mechanism.ts) on what it finds, which until now was a tested solver with
// no caller outside its own unit test: a rank-based degrees-of-freedom count, redundant constraints and all.
import { KITS, makeKit } from '../parts/kits';
import { howItMoves } from '../make/moves';

const argv = process.argv.slice(2);
const take = (flag: string): string | undefined => { const i = argv.indexOf(flag); return i < 0 ? undefined : argv.splice(i, 2)[1]; };
const kitId = take('--kit'), only = take('--part'), seed = Number(take('--seed') ?? 1), words = argv.filter((a) => !a.startsWith('--')).join(' ');
if (!words) { console.log('npm run moves -- [--kit <id>] [--part <name>] "<words>"\n\n  what moves, how far, what its sweep needs clear, and how many ways the whole thing can still move'); process.exit(2); }

// IT DOES NOT GUESS A KIT, for the reason written at length in why-main.ts: a convenience default turned a
// measurement of the critic into "the critic is silent" twice, a commit apart (docs/ROUNDS.md, "the default that lies").
const named = KITS.find((k) => k.id === kitId) ?? KITS.find((k) => new RegExp(`\\b${k.id}\\b`, 'i').test(words));
if (!named) {
  console.log(`moves: "${words}"`);
  console.log('no kit is named in those words, and guessing one is how this question has been answered wrongly before.');
  console.log(`say which: npm run moves -- --kit <id> "${words}"`);
  console.log(`kits: ${KITS.map((k) => k.id).sort().join(' ')}`);
  console.log('MOVES: no kit named');
  process.exit(2);
}

const { part } = makeKit(named, words, seed);
const { m, bodies, joints, from, dropped } = howItMoves(part);
const shown = only ? from.filter((x) => new RegExp(only, 'i').test(x.part)) : from;

console.log(`moves: ${part.name} (kit=${named.id}, seed=${seed})`);
console.log(`${from.length} part${from.length === 1 ? '' : 's'} move${from.length === 1 ? 's' : ''}${only ? `, ${shown.length} matching /${only}/i` : ''}`);
console.log('');
for (const x of shown.slice(0, Number(process.env.MOVES_MAX ?? 24))) {
  console.log(`  ${x.part}${x.joint ? ` — ${x.joint}${x.leaves ? `, which leaves it ${x.leaves}` : ''}` : ''}${x.link ? `  [link: ${x.link}]` : ''}`);
  if (x.range.length) console.log(`      range of motion: ${x.range.join('; ')}`);
  if (x.clearance) console.log(`      requires clearance: ${x.clearance.says}`);
  if (x.movesWithin.length) console.log(`      moves within: ${x.movesWithin.join(', ')}`);
  if (x.constrainedBy.length) console.log(`      constrained by: ${x.constrainedBy.join('; ')}`);
  if (x.connectedTo.length) console.log(`      connected to: ${x.connectedTo.slice(0, 6).join(', ')}${x.connectedTo.length > 6 ? ` (+${x.connectedTo.length - 6})` : ''}`);
  if (x.transfersForceTo.length) console.log(`      transfers force to: ${x.transfersForceTo.slice(0, 6).join(', ')}${x.transfersForceTo.length > 6 ? ` (+${x.transfersForceTo.length - 6})` : ''}`);
  if (x.unsaid) console.log(`      NOTHING SAYS HOW: ${x.unsaid}`);
}
if (shown.length > Number(process.env.MOVES_MAX ?? 24)) console.log(`  … ${shown.length - Number(process.env.MOVES_MAX ?? 24)} more (MOVES_MAX=${shown.length} to see them all)`);

const unsaid = from.filter((x) => x.unsaid);
console.log('');
console.log(`its mechanism: ${bodies} rigid ${bodies === 1 ? 'body' : 'bodies'} (its own frame the ground), ${joints} joint${joints === 1 ? '' : 's'} it could use of ${joints + dropped.length} declared`);
if (dropped.length) {
  // NOT SILENTLY: a DOF count over the joints that happened to be usable, printed as if it were the mechanism's, is
  // the confident wrong number this whole session is about. What was left out is said before what was computed.
  console.log(`  ${dropped.length} left out, so the count below is of what is left:`);
  for (const d of dropped.slice(0, 6)) console.log(`    ${d.part}: ${d.why}`);
  if (dropped.length > 6) console.log(`    … ${dropped.length - 6} more`);
}
console.log(`  ${m.says.length > 600 ? `${m.says.slice(0, 600)}…` : m.says}`);
if (m.redundant) console.log(`  (Grübler's formula would say ${m.grubler}; the rank says ${m.dof}, which is why the formula is not used)`);
console.log(`  ${unsaid.length} part${unsaid.length === 1 ? '' : 's'} move${unsaid.length === 1 ? 's' : ''} and nothing says how${unsaid.length ? `: ${unsaid.slice(0, 5).map((x) => x.part).join(', ')}` : ''}`);
console.log(`MOVES: ${from.length} movers, ${m.dof} DOF over ${joints} of ${joints + dropped.length} joints, ${unsaid.length} unsaid`);

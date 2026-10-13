// `npm run substrate` — the door the substrate never had.
//
// `src/nexus/substrate/` holds the Nexus engine: an intent manifolded into a system of laws, a section left free and
// chosen from a catalogue, a contract measured against a rigid-body realization, and a journal of why. Twenty of its
// files are tested — some of them heavily — and `node tools/unwired.mjs` showed that **not one of them is reached
// from any entry point**: no CLI imported them, no page imported them, so every one of their exports was finished
// work that only its own test could run (docs/ROUNDS.md Run 7s).
//
// That is the same fault as `mobility()` and as the look page's three silent judges, at the scale of a whole
// directory: 2,300 lines behind a green gate with nothing to reach it by. The user's rule for it was three words —
// merge, reattach, or delete. This is the reattachment: one door that runs each slice end to end and prints its
// verdict, so the engine can be worked rather than only tested.
//
//   npm run substrate                  every slice: the beam, the bracket, the swinging bar
//   npm run substrate -- beam          one of them
//
// It takes no Jolt: a realization needs the physics engine, and without it a slice still derives its system, solves
// it with the section free and makes its choice from the catalogue — which is the part this door is for. What it
// cannot do without Jolt it says, rather than printing a verdict that looks complete.
import { beamOnTwoSupports, lumberCatalogue, materialLeaves, type Slice } from '../substrate/beam';
import { bracketOnPost, bracketCatalogue, bracketIntent, bracketMaterial, type BracketSlice } from '../substrate/bracket';
import { barOnHinge, swingIntent, swingMaterial, type SwingSlice } from '../substrate/swing';
import { restIntent, toppleStudy } from '../substrate/study';
import type { Solution } from '../substrate/solve';

const want = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const run = (name: string) => !want.length || want.some((w) => name.includes(w));

// what a choice came to: how many candidates the catalogue offered, how many the constraints admitted, which was
// picked, and — the number worth having — whether the preference could break the tie at all
const sayChoice = (c: { candidates: unknown[]; manifold: unknown[]; pick: unknown; tie: unknown[] }) => {
  const pick = c.pick as { says?: string; id?: string } | null;
  return `${c.manifold.length} of ${c.candidates.length} admissible → ${pick ? (pick.says ?? pick.id ?? 'one picked') : c.tie.length ? `a tie of ${c.tie.length} the preference cannot break` : 'NONE admissible'}`;
};
// `Solution.bound` is a Record and the free list is `free`, not `unbound` (src/nexus/substrate/solve.ts:33). Written
// from memory it printed "0 bound, 0 left free" for every slice — a confident zero, the third shape this session's
// tools got wrong by guessing instead of reading the type. `satisfied` is the verdict that matters: every constraint
// holds, one fails, or one cannot be decided, and the third is not the first.
const saySolution = (s: Solution | undefined) => {
  if (!s) return 'no solution';
  const n = Object.keys(s.bound).length;
  const verdict = s.satisfied === true ? 'every constraint holds' : s.satisfied === false ? 'A CONSTRAINT FAILS' : 'a constraint CANNOT BE DECIDED';
  return `${n} symbol${n === 1 ? '' : 's'} bound, ${s.free.length} left free${s.free.length ? ` (${s.free.slice(0, 3).map((f) => f.sym).join(', ')})` : ''}; ${s.constraints.length} constraints: ${verdict}${s.contradictions.length ? `; ${s.contradictions.length} CONTRADICTION${s.contradictions.length === 1 ? '' : 'S'}` : ''}`;
};

let ran = 0, said: string[] = [];

if (run('beam')) {
  ran++;
  const s: Slice = beamOnTwoSupports(restIntent({ patch: 0.1, across: 0.3 }), materialLeaves('wood.douglas-fir'), lumberCatalogue());
  console.log('the beam on two supports — a load at rest on a span, its section left free');
  console.log(`  its system: ${saySolution(s.open)}`);
  console.log(`  its choice: ${sayChoice(s.choice as never)}`);
  const t = toppleStudy([s]);
  console.log(`  does it topple: ${t.observations.length} observation${t.observations.length === 1 ? '' : 's'}, ${t.candidates.length} candidates → ${t.chosen ? 'one relation chosen' : t.ambiguous.length ? `${t.ambiguous.length} left ambiguous` : 'nothing chosen'}${t.relation ? `: ${t.relation.name}` : ""}`);
  said.push(`beam ${(s.choice as { pick: unknown }).pick ? 'chose' : 'chose nothing'}`);
}

if (run('bracket')) {
  ran++;
  const b: BracketSlice = bracketOnPost(bracketIntent(), bracketMaterial(), bracketCatalogue());
  console.log('');
  console.log('the bracket on a post — an arm bolted to a side, carrying a load at a reach');
  console.log(`  its system: ${saySolution(b.open)}`);
  console.log(`  its choice: ${sayChoice(b.choice as never)}`);
  console.log(`  its configuration: ${b.configuration ? 'derived' : 'NOT derived — nothing admissible to configure'}`);
  said.push(`bracket ${b.configuration ? 'configured' : 'unconfigured'}`);
}

if (run('swing')) {
  ran++;
  const w: SwingSlice = barOnHinge(swingIntent(), swingMaterial());
  console.log('');
  console.log('the bar on a free hinge — time as a coordinate, released from an angle');
  console.log(`  its system: ${saySolution(w.solution)}`);
  console.log(`  its configuration: ${w.configuration ? 'derived' : 'NOT derived'}`);
  console.log(`  its realization: ${w.realization ? 'measured against the rigid-body kernel' : 'none — a realization needs Jolt, which this door does not start'}`);
  said.push(`swing ${w.configuration ? 'configured' : 'unconfigured'}`);
}

if (!ran) {
  console.log(`npm run substrate -- [beam|bracket|swing]`);
  console.log(`no slice matches ${want.join(' ')}`);
  console.log('SUBSTRATE: nothing run');
  process.exit(2);
}
console.log('');
console.log(`SUBSTRATE: ${ran} slice${ran === 1 ? '' : 's'} run — ${said.join(', ')}`);

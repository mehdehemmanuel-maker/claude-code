// Words to what a machine must do: the ask read, and nothing built. Owner of: how a sentence becomes the affordances
// a machine must have, how big it must be, what it carries, and - the part that did not exist before - WHAT THE WORDS
// SAID THAT NOTHING CONSUMED.
//
// It lives apart from `machine.ts` because reading an ask and composing a machine are two concerns and were one file:
// 729 lines, and the lint said so. The split is also the fix's own shape. Reading used to be two hand-rolled regexes
// that knew `mm` and `kg`, buried among the units they fed; three separate faults lived in that burial -
//   - a speed read as a length (`300 mm/s` became 300 mm of travel) and a rate read as a payload (`1.2 kg/h` as
//     1.2 kg), because a regex sees digits and not dimensions;
//   - any other unit unseen, so `6 m` silently became the 300 mm default and nothing said so;
//   - a tool verb anywhere in the sentence taken as this machine's, so "a camera head on a rail that FOLLOWS A PRINT
//     HEAD" was sold a hot end and a Bowden tube, and a second machine's bill went into the first's.
// Each is now answered by something the reader cannot help doing: quantities come from `findQuantities` with their
// dimensions and a slot takes one only when the dimension matches; the verbs are read only in the span that describes
// this machine; and whatever is left over is returned rather than dropped.

import { dimensionOf, findQuantities, type Said } from '../../ganglia/units';
import type { Does, Arrangement } from './machine';

/** What an ask was read as. `notDone` is the set difference between the quantities in the words and the quantities
 *  this machine consumed, so a dropped number is a thing the reader must print rather than a thing it may forget. */
export interface MachineWant { does: Does[]; mm: [number, number, number]; payload: number; name: string; arrange: Arrangement; notDone: string[] }

/** What words ask for, as the affordances a machine must have and how big it must be. Nothing here is a machine's
 *  name: "a printer", "a router" and "a thing that picks parts off a belt and puts them in a box" all arrive as the
 *  same kind of answer — what it must do, over what, carrying what. */
export function readMachine(words: string): MachineWant {
  const t = words.toLowerCase();

  // ---- what the machine IS, as against what it acts on -----------------------------------------------------------
  // A tool verb anywhere in the sentence used to give this machine that tool, so "a camera head on a rail that
  // FOLLOWS A PRINT HEAD" was sold a hot end, a Bowden tube and a 40 W cartridge, and the bill of a second machine
  // was swallowed into the first. The words name two machines and only one of them is being built.
  // So the verbs are read only in the span that describes THIS machine: a clause introduced by one of these markers
  // belongs to something else, and runs to the next comma or the end.
  // This is a scoping rule, not a parser. It fixes the measured class - a relative or participial clause naming
  // another machine - and it will not catch every way English says "this is not mine" ("beside a printer", "for a
  // lathe"). What it does not catch, it leaves read as before rather than guessing, and the limit is written here
  // rather than in a comment that claims the problem solved.
  const ELSEWHERE = /\b(?:that|which)\s+(?:follows?|feeds?|tends?|serves?|watches|loads?|unloads?|inspects?|monitors?)\b|\b(?:following|feeding|tending|serving|watching|loading|unloading)\b/g;
  const cuts: [number, number][] = [];
  { let m; ELSEWHERE.lastIndex = 0; while ((m = ELSEWHERE.exec(t))) { const end = t.indexOf(',', m.index); cuts.push([m.index, end < 0 ? t.length : end]); } }
  // blanked, not deleted, so every offset into `mine` is still an offset into the original words - which is what lets
  // a quantity found by `findQuantities` be told whose clause it stands in, by its own `at`
  const mine = cuts.reduce((acc, [a, b]) => acc.slice(0, a) + ' '.repeat(b - a) + acc.slice(b), t);
  const theirs = cuts.map(([a, b]) => t.slice(a, b).trim()).filter(Boolean).join('; ');

  const does: Does[] = [];
  if (/print|extrude|deposit|fdm|fff|filament/.test(mine)) does.push('deposit');
  if (/mill|rout|cut|carve|engrave|spindle/.test(mine)) does.push('cut');
  if (/solder|tin |reflow/.test(mine)) does.push('solder');
  if (/pick|place|grab|grip|hand|hold.*part|sort/.test(mine)) does.push('grip');
  if (/camera|see|scan|inspect|look|vision|photo/.test(mine)) does.push('see');
  if (/turn|rotate|spin|wrist|turntable|lathe|wheel/.test(mine)) does.push('turn');

  // the arrangement: a thing that travels along something is a rail, a thing that reaches is an arm, a thing that
  // turns the work under a fixed tool is a table, and anything that has to get anywhere in a box is a gantry
  const arrange: Arrangement =
    /\b(along|travel|traverse|rail|track|overhead|up the wall|across the wall|gantry crane|moves along)\b/.test(mine) ? 'rail'
      : /\b(arm|reach(es|ing)?|elbow|shoulder|wrist|jointed|articulat)/.test(mine) ? 'arm'
        : /\b(lathe|potter|wheel|turntable|spin the work|turns the work|faceplate)\b/.test(mine) ? 'table' : 'gantry';

  // ---- the numbers, by their DIMENSION ---------------------------------------------------------------------------
  // Every number used to be read by two hand-rolled regexes that knew `mm` and `kg` and nothing else. They could not
  // tell a length from a speed that happens to contain one, so `300 mm/s` was read as 300 mm of travel and `1.2 kg/h`
  // as a 1.2 kg payload; and `6 m`, `2.4 m`, `25 kg at 1000 mm/s` in any other unit were simply not seen, so the
  // machine was built to a 300 mm default and nothing said so. `findQuantities` already reads any unit into SI with
  // its dimension (src/ganglia/units.ts) and every other door in `ask/` already uses it. A slot now takes a quantity
  // only when the DIMENSION matches, which makes "a speed read as a length" unwritable rather than merely fixed.
  const LENGTH = dimensionOf('m'), MASS = dimensionOf('kg'), same = (a: Said['dim'], b: Said['dim']) => a.every((x, i) => x === b[i]);
  const said = findQuantities(words);
  // a quantity inside the span that describes ANOTHER machine is not this machine's to build to
  const ours = said.filter((q) => !(mine[q.at] === ' ' && t[q.at] !== ' '));
  const used = new Set<Said>();
  const take = (q: Said | undefined) => { if (q) used.add(q); return q; };

  // a × b × c written as a bare triple carries no unit on each number, and `findQuantities` rightly does not invent
  // one; that shape is still the commonest way a working volume is said, so it is read here and marked as read.
  const triple = /(\d{2,4})\s*(?:mm)?\s*[x×by]\s*(\d{2,4})\s*(?:mm)?(?:\s*[x×by]\s*(\d{2,4}))?/.exec(mine);
  const lengths = ours.filter((q) => same(q.dim, LENGTH));
  for (const q of lengths) used.add(q);
  const masses = ours.filter((q) => same(q.dim, MASS));
  const mm: [number, number, number] = triple ? [Number(triple[1]), Number(triple[2]), Number(triple[3] ?? triple[2])]
    : lengths.length >= 3 ? [lengths[0]!.si * 1000, lengths[1]!.si * 1000, lengths[2]!.si * 1000]
      : lengths.length && (arrange === 'rail' || arrange === 'arm') ? [lengths[0]!.si * 1000, 300, 300]
        : lengths.length ? [lengths[0]!.si * 1000, lengths[0]!.si * 1000, lengths[0]!.si * 1000]
          : [300, 300, 300];
  const payload = take(masses[0])?.si ?? 0;

  // ---- what the ask said that nothing here consumed --------------------------------------------------------------
  // `notDone` is a computed SET DIFFERENCE, never a list someone remembered to write. That is the whole point: a
  // number the machine silently ignored (a speed, a rate, an accuracy, a temperature) can no longer be dropped in
  // silence, because dropping it is what puts it in this list.
  const notDone = [
    ...ours.filter((q) => !used.has(q)).map((q) => `"${q.text.trim()}" was read, and is ${+q.si.toPrecision(4)} in SI - and nothing in this machine uses it: no part here is sized by it and no check refuses because of it, so it was asked for and not done`),
    ...(theirs.trim() ? [`the words also name something this machine works WITH rather than IS ("${theirs.trim().replace(/\s+/g, ' ').slice(0, 80)}"): it is not built, priced or weighed here, and asking for it is a separate ask`] : []),
  ];

  const name = does.length ? `a${arrange === 'arm' ? 'n arm' : arrange === 'rail' ? ' rail-mounted machine' : arrange === 'table' ? ' turning machine' : ' machine'} that ${does.map((d) => ({ deposit: 'prints', cut: 'cuts', solder: 'solders', grip: 'picks things up', see: 'sees', turn: 'turns', slide: 'moves', think: 'is programmed', hold: 'holds' })[d]).join(', ')}` : 'a machine';
  return { does, mm, payload, name, arrange, notDone };
}


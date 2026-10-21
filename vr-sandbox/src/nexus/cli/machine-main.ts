// `npm run machine` — a machine composed from the component library, printed, so an invention can be read without
// writing a throwaway test.
//
// It is the inventor's own door (src/nexus/ask/machine.ts). Nothing here is a stored machine: the words say what it
// must do and over what, and the units the library affords are stacked into something that is a real bill of
// materials — or refused with the number that refuses it.
//
//   npm run machine                                       what the words spell with nothing said
//   npm run machine -- "a machine that prints 300x300"     a printer, composed
//   npm run machine -- "a machine that cuts 400x300x80"    the same stack with a spindle on it: a router
//   npm run machine -- "a machine that picks up 2kg and sees 800x400"
//   npm run machine -- units                               every unit the library affords, and what each costs
//   npm run machine -- hold 2kg 400mm                      every way to hold that moment with no power, sized
//   npm run machine -- hold 2kg 400mm post=250 arm=120 face=20 screw=8/7 swing=270
//   npm run machine -- "..." works                         and what the $3,000 works has to do to build it

import { jobText, machineBuild, throwAt, under3K } from '../works';
import { composeMachine, everyUnit, machineText, unitKg, unitUsd, type Unit } from '../ask/machine';
import { holdText, type Joint } from '../ask/hold';

const args = process.argv.slice(2);
// WHAT HOLDS IT WITH THE POWER OFF. The door the composer did not have when it answered "an arm that stays where
// you put it" with two steppers (Run 9c).
if (args[0] === 'hold') {
  const num = (re: RegExp, d = 0) => { const m = args.join(' ').match(re); return m ? Number(m[1]) : d; };
  const screw = /screw=(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/.exec(args.join(' '));
  const j: Joint = {
    kg: num(/(\d+(?:\.\d+)?)\s*kg/, 1), armMm: num(/(\d+(?:\.\d+)?)\s*mm/, 300),
    postMm: num(/post=(\d+(?:\.\d+)?)/) || undefined, attachMm: num(/arm=(\d+(?:\.\d+)?)/) || undefined,
    faceMm: num(/face=(\d+(?:\.\d+)?)/) || undefined, swingDeg: num(/swing=(\d+(?:\.\d+)?)/) || undefined,
    ...(screw ? { screw: { leadMm: Number(screw[1]), meanMm: Number(screw[2]) } } : {}),
  };
  console.log(holdText(j));
} else if (args[0] === 'units') {
  const all: Unit[] = everyUnit();   // one list, in ask/machine.ts, which the gate also checks
  for (const u of all) {
    const { kg, gaps } = unitKg(u), { usd, unpriced } = unitUsd(u);
    console.log(`${u.id}  (${u.does})  ${kg} kg  $${usd.toFixed(2)}`);
    console.log(`    ${u.says}`);
    console.log(`    holds ${u.carries} kg, raises ${u.lifts} kg, ${u.speed}${u.does === 'turn' ? '°/s' : ' mm/s'}; ${u.limit}`);
    console.log(`    from: ${u.src}`);
    if (unpriced.length) console.log(`    no price here: ${unpriced.join(', ')}`);
    if (gaps.length) console.log(`    NOT DRAWN: ${gaps.join('; ')}`);
    console.log('');
  }
} else {
  const words = args.filter((a) => a !== 'works').join(' ') || 'a machine';
  const m = composeMachine(words);
  console.log(machineText(m));
  // and what the works has to do about it: what is bought, what is cut here, what is printed, in what order
  if (args.includes('works')) console.log(`\n==== thrown at the $3,000 works\n${jobText(throwAt(machineBuild(m), under3K().ids))}`);
}

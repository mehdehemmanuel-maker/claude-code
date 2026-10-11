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
//   npm run machine -- "..." works                         and what the $3,000 works has to do to build it

import { jobText, machineBuild, throwAt, under3K } from '../works';
import { BRAIN, EYE, GRIPPER, HOT_END, SPINDLE, beltAxis, composeMachine, baseFrame, machineText, screwAxis, turnAxis, unitKg, unitUsd, type Unit } from '../ask/machine';

const args = process.argv.slice(2);
if (args[0] === 'units') {
  const all: Unit[] = [baseFrame(500, 500, 650), screwAxis(300), beltAxis(300), turnAxis(3), HOT_END, SPINDLE, GRIPPER, EYE, BRAIN];
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

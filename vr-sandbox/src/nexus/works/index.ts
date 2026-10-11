// A works: throw any build at it and it says how that build actually gets made — on which machines, in what order,
// how long it takes, what has to be bought instead, and what program each machine is sent.
//
// It is not a catalogue of shops. "Where can anything be created" has an answer that is not a shopping list, and the
// useful engine is the one that takes a job and routes it. All making is six families:
//
//   add      material put where there was none      print, cast, deposit, grow
//   cut      material taken away                    mill, turn, drill, saw, laser, grind
//   form     material moved, none added or taken    bend, press, forge, throw, mould, draw
//   join     parts held together                    weld, braze, solder, bond, fasten
//   treat    the same material made different       sinter, fire, harden, cure, coat
//   measure  the loop closed                        calliper, indicator, probe, camera
//
// A works that covers all six over a class of material can make anything in that class inside its envelope. That is
// the criterion, and it is checkable. The sixth is the one everyone leaves out and the one that decides whether the
// other five ever improve: without measurement a shop cannot hold a tolerance, cannot find out why a part was wrong,
// and cannot get better. A $30 calliper closes more capability than a $300 machine.
//
// Routing is where a job router is honest or useless, so the rules are written down rather than implied:
//
//   - A process that only prepares (sawing stock to length), only finishes (drilling, hardening, firing, coating) or
//     only joins (welding, bonding, fastening) never makes a part on its own. A saw cannot produce a gearbox housing
//     however fast it is, and a plan that says it can is worthless.
//   - A process that can only make one kind of shape says so. A lathe makes shapes of revolution; a laser and a press
//     make flat ones. Without that, a router picks the lathe for a printed landing foot because turning is faster per
//     cubic centimetre than printing, which is true and absurd.
//   - Among the processes that do fit, the one that does this job in the fewest minutes wins — setup included, because
//     setup is most of a small job. That is what makes a bulk housing a casting and a plate a milled part without
//     either being special-cased.
//   - Measuring never makes anything. It is the loop, not the lathe.
//   - Some materials are not finished when they are formed: clay is not a mug until it is fired, a resin print is not
//     a part until it is washed and cured, a bound-metal print is powder in wax until it is debound and sintered. A
//     works without the finishing station cannot make the thing at all, and says so instead of handing over greenware.
//
// What this will not pretend: no works below a few hundred thousand makes a bearing, a motor, a rail, a belt, a screw
// or a chip. Those are ground to a micron, wound, stamped, rolled at a thousand a minute and fabbed on a wafer.
// `ALWAYS_BOUGHT` says why for each, part by part, and `STOCK` says what is bought as material and worked here —
// which is a different thing, and conflating the two is how a plan loses the welding.
//
// Owner of: the process taxonomy, the stations that do them, routing a build into operations, scheduling those
// operations across the machines there are, and what share of a real machine's own bill of materials a works could
// make for itself. The program each operation sends, and the Bluetooth that carries it, are `link.ts`. Whether one
// machine can work one material is `processor.ts`. This owns which machines to have, and what they do on Tuesday.
//
// This file is the package's one door: everything that was once `works.ts` is re-exported here, so no caller had to
// change when it was split. The split itself is the point — thirteen files, one concern each, in the order the work
// happens:
//
//   families.ts   the six families and the process table          — what making is
//   stations.ts   the machines, their prices, what a set covers   — who does it
//   budget.ts     the most capable works a budget buys            — what to buy first
//   lines.ts      one line of a build: class, shape, tolerance, bought or made
//   can.ts        what the works has measured, and what it can make
//   plan.ts       the router: lines in, operations out
//   schedule.ts   the operations on the machines, and the floor that judges it
//   audit.ts      the engine checking its own answer
//   programs.ts   the program each operation sends (binds to link.ts)
//   builds.ts     builds to throw at it, and the bootstrap share
//   economics.ts  make or buy, and when an arm pays
//   pack.ts       the works as a thing to go and buy, in the order to buy it in
//   text.ts       all of it said for a person, and the words that reach it

export * from './families';
export * from './stations';
export * from './budget';
export * from './lines';
export * from './can';
export * from './schedule';
export * from './audit';
export * from './programs';
export * from './plan';
export * from './builds';
export * from './economics';
export * from './pack';
export * from './text';

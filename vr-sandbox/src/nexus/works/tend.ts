// The robot that runs the works: what it can reach, what it can do without a person, what has to be ordered and from
// whom, and the loop from a want to a part in your hand.
//
// Owner of: tending a works — the rail the robot rides, which stations are within its arm's reach from it, the edge
// between what an operation needs and what the robot has, the purchase order for everything the plan says to buy, and
// the division of a job into what the robot does and what a person still has to.
//
// The user asked for "a robot that has a whole workshop that it can build whatever it want or even use a computer to
// order parts". Everything that needs is already here and this is the joining of it: `works/plan.ts` says which
// station does what, `works/floor.ts` says where each station stands, `ask/machine.ts` composes the robot itself out
// of library parts (a rail, an arm, a gripper, an eye — and checks its joints against the moment they have to hold),
// `machines/link.ts` is the wire that carries a program to a machine, and `parts/prices.ts` holds the seller pages.
//
// Two things are said plainly rather than pretended:
//
// 1. The robot cannot press a Buy button. It can reach a basket — the cheapest real offer for every line, each with
//    its seller, its page, the figure that page showed and the day it was seen — and then a person pays. Anything else
//    would be a system that spends money it cannot be held to, and a plan that claims it ordered something it did not
//    is worse than no plan. What a person must still do is listed by name.
// 2. The robot cannot do most of what a cheap works does. A gripper and a camera load a machine, start it and take the
//    part out; they do not strike an arc, throw a pot or pour 700 °C aluminium. Every operation is therefore an edge
//    between what it needs and what the robot has, and the ones it cannot do are named with the reason — which is how
//    you find out that a works is 60 % tended and which $200 of tooling would make it 80 %.

import { SOLDER_HEAD, composeMachine, unitKg, unitUsd, type Does, type Machine } from '../ask/machine';
import { cheapest, priceKeyOf, usd as money, type Offer } from '../parts/prices';
import { layWorks, type Floor, type Stood } from './floor';
import { stationById } from './stations';
import { worksUnder } from './budget';
import { throwAt } from './builds';
import type { Build } from './builds';
import type { Job, Op } from './plan';

/** The robot that tends a works, and where it can get to. */
export interface Tender {
  /** the machine it is, composed by the inventor, so it is a real bill of materials and a real set of refusals */
  machine: Machine;
  /** the rails it rides, each along the room's width at that depth into it. One rail serves the two rows that face
   *  its aisle and no more, so a shop of any size takes several — which is a finding, not a failure, and the number
   *  is what tells you whether a rail or a floor robot is the cheap answer */
  rails: { z: number; mm: number; serves: number }[];
  /** how far its arm reaches off the rail, mm */ reach: number;
  floor: Floor;
  /** the stations it can serve, with how far off the rail each one's near edge is, m */
  serves: { id: string; name: string; off: number }[];
  /** the stations out of reach, and what it would take */ cannot: { id: string; name: string; off: number; why: string }[];
  kg: number; usd: number | null;
  says: string;
}

/** The aisles of a floor plan, as the depth into the room of each one's middle. Rows are laid in pairs with the aisle
 *  after the pair (src/nexus/works/floor.ts), so an aisle is the gap between the back of one row and the front of the
 *  next — and a rail down it serves the two rows that face it. */
export function aislesOf(f: Floor): number[] {
  const rows = [...new Set(f.stood.map((s) => s.row))].sort((a, b) => a - b);
  const back = (r: number) => Math.max(...f.stood.filter((s) => s.row === r).map((s) => s.at[1] + s.size[1] / 2));
  const front = (r: number) => Math.min(...f.stood.filter((s) => s.row === r).map((s) => s.at[1] - s.size[1] / 2));
  const out: number[] = [];
  for (let i = 0; i + 1 < rows.length; i++) {
    const gap = front(rows[i + 1]!) - back(rows[i]!);
    if (gap > 0.5) out.push(+((back(rows[i]!) + front(rows[i + 1]!)) / 2).toFixed(2));
  }
  return out;
}

/** How far a station's nearest edge is from a rail at depth z, m: 0 where the rail passes over its footprint. */
export const offRail = (s: Stood, z: number): number => +Math.max(0, Math.abs(s.at[1] - z) - s.size[1] / 2).toFixed(2);

/** A works with a robot on a rail down its busiest aisle: what it reaches, what it costs, what it weighs. The arm is
 *  not asserted — it is composed by the inventor at the reach asked for, so its shoulder is geared to the moment it
 *  actually has to hold and a reach it cannot manage is refused there rather than here. */
export function tendWorks(ids: string[], o: { reach?: number; aisle?: number; /** the tools to fit beyond the gripper and the eye it always has */ tools?: Does[] } = {}): Tender {
  const floor = layWorks(ids);
  const reach = o.reach ?? 600;
  const mm = Math.round(floor.room[0] * 1000);
  const extra = (o.tools ?? []).map((d) => ({ solder: 'solders', deposit: 'prints', cut: 'cuts', turn: 'turns', grip: '', see: '', slide: '', think: '', hold: '' })[d]).filter(Boolean).join(' and ');
  const machine = composeMachine(`a robotic hand that moves along a wall ${mm} mm and picks up 1 kg and sees${extra ? ` and ${extra}` : ''}`);
  const within = (z: number) => floor.stood.filter((s) => offRail(s, z) * 1000 <= reach);
  // One rail serves the two rows that face its aisle and no more. So take aisles greedily until everything is served,
  // and say how many it came to: a works that wants four rails wants a robot on a floor base instead, and that is a
  // decision the number makes rather than a preference.
  const aisles = o.aisle != null ? [o.aisle] : aislesOf(floor);
  const rails: Tender['rails'] = [];
  const left = new Set(floor.stood.map((s) => s.id));
  for (const _ of aisles) {
    const best = aisles.filter((z) => !rails.some((r) => r.z === z))
      .map((z) => ({ z, got: within(z).filter((s) => left.has(s.id)) }))
      .sort((a, b) => b.got.length - a.got.length)[0];
    if (!best || !best.got.length) break;
    rails.push({ z: best.z, mm, serves: best.got.length });
    for (const s of best.got) left.delete(s.id);
  }
  const serves: Tender['serves'] = [], cannot: Tender['cannot'] = [];
  // where no aisle serves anything at this reach, there are no rails and so no "off the rail" — the distance that
  // still means something is to the nearest aisle, and the reason is that the arm is too short for this layout at all
  const lines = rails.length ? rails.map((r) => r.z) : aisles;
  for (const s of floor.stood) {
    const off = lines.length ? Math.min(...lines.map((z) => offRail(s, z))) : +Math.abs(s.at[1] - floor.room[1] / 2).toFixed(2);
    if (rails.length && off * 1000 <= reach) serves.push({ id: s.id, name: s.name, off: +off.toFixed(2) });
    else cannot.push({ id: s.id, name: s.name, off: +off.toFixed(2),
      why: rails.length
        ? `its near edge is ${off.toFixed(2)} m from the nearest rail and the arm reaches ${(reach / 1000).toFixed(2)} m: it stands in a row no aisle faces, so the work is carried to it or the layout is changed`
        : `no aisle in this layout comes within ${(reach / 1000).toFixed(2)} m of any station (the nearest is ${off.toFixed(2)} m away), so an arm this short cannot tend this works at all: the aisles are ${(aisles.length ? aisles.join(' and ') : 'none')} m in and the arm has to reach half an aisle plus the row's own depth` });
  }
  // every rail is the same machine again, so the cost of tending the whole shop is the cost of one times the rails
  const each = machine.usd ?? 0, kg = machine.kg * rails.length;
  return {
    machine, rails, reach, floor, serves, cannot, kg: +kg.toFixed(2), usd: machine.usd == null ? null : +(each * rails.length).toFixed(2),
    says: `${rails.length === 0 ? `No rail can be laid for a ${(reach / 1000).toFixed(2)} m arm in this layout: ${cannot[0]?.why ?? 'no aisle comes near a station'}. ` : ''}A hand on a ${(mm / 1000).toFixed(1)} m rail reaches ${(reach / 1000).toFixed(2)} m off it and serves the two rows facing its aisle. ${rails.length === 1 ? 'One rail' : `${rails.length} rails, at ${rails.map((r) => `${r.z} m`).join(', ')} into the room,`} put ${serves.length} of ${floor.stood.length} stations in reach${cannot.length ? ` and leave ${cannot.length} out` : ''}: ${money(each)} and ${machine.kg} kg each, ${rails.length > 1 ? `${money(each * rails.length)} and ${kg.toFixed(1)} kg in all` : 'all in'}.${rails.length > 2 ? ' At three rails or more a robot on a floor base that drives between the rows is the cheaper answer, and this is the number that says so.' : ''}${machine.refusals.length ? ` It will not: ${machine.refusals.join('; ')}.` : ''}`,
  };
}

// ---- what the robot can actually do ---------------------------------------------------------------------------------
// An edge, read from both ends: what the operation needs of a pair of hands, and what this robot's hands are. Written
// as the reason and not as a yes or no, because the reason is what tells you which tool to buy next.

/** What an operation needs of a pair of hands, and what it is about this works' hands that does or does not meet it.
 *  `needs` is read against the robot's own affordances (src/nexus/ask/machine.ts), so adding a tool to the robot
 *  changes what it can be asked to do without a line of this table changing — which is the whole point, and is how
 *  `growTender` below can cost the next tool instead of guessing at it. `never` is for what no tool composed here
 *  reaches at all, and says so rather than implying a purchase would fix it. */
const TENDS: { process: RegExp; needs: Does[]; why: string; whyNot?: string; never?: true }[] = [
  { process: /^(fff|msla|cure|kiln|sinter|pbf)$/, needs: ['grip'], why: 'a machine with a port on it: the robot clears the bed, starts the program over the wire and lifts the part off when it is cold', whyNot: 'it has nothing to clear the bed or lift the part with: a gripper' },
  { process: /^(mill|drill|turn|probe|laser)/, needs: ['grip'], why: 'the blank is set in the vice or the chuck, the program is sent over the wire, and the part comes out — the cutting is the machine\'s, not the hands\'', whyNot: 'it has nothing to set the blank with: a gripper' },
  { process: /^(calliper|indicate|weigh)$/, needs: ['grip', 'see'], why: 'the camera sees the reading and the gripper puts the part on the plate: measuring is the one thing a robot does better than a person, because it does it every time', whyNot: 'measuring wants both a hand to place the part and an eye to read the dial' },
  { process: /^(fasten|bond)$/, needs: ['grip'], why: 'a gripper drives a screw into a T-slot nut, slowly, and a camera checks it went in square', whyNot: 'it has no hand to turn a screw with' },
  { process: /^solder$/, needs: ['solder'], why: 'the iron is held on the moving end at 50° to the work and the wire is fed by its own stepper, to the joint model the lessons already use (src/nexus/teach/solder-joint.ts)', whyNot: 'nothing on it holds an iron — and a soldering head is the library\'s own Pinecil, reel and extruder drive, so this is a tool the works can build rather than a thing it lacks' },
  { process: /^(weld-mig|spot-weld|braze)$/, needs: [], never: true, why: '', whyNot: 'striking and holding an arc is a hand watching a puddle through a shade-10 lens, at 1 mm of stand-off, correcting at the speed the puddle moves: nothing composed out of this library is that, and getting it wrong burns through the work' },
  { process: /^(forge|heat-treat)$/, needs: [], never: true, why: '', whyNot: 'a forging is judged by its colour and struck while it is that colour: there is no port and no second chance' },
  { process: /^cast$/, needs: [], never: true, why: '', whyNot: 'pouring molten aluminium is 700 °C in a crucible held in tongs: a gripper that drops it sets the shop on fire, which is why the safety kit is the line the works will not cut' },
  { process: /^throw$/, needs: [], never: true, why: '', whyNot: 'throwing clay is both hands on a moving wall of it, by feel' },
  { process: /^(bend|press|shear)$/, needs: [], never: true, why: '', whyNot: 'a bench brake is a lever pulled by a person leaning on it: there is no motor to take a program, and motorising it is a different machine, not a hand' },
  { process: /^(saw|cut-manual|file|finish)/, needs: [], never: true, why: '', whyNot: 'hand work at the bench, which is most of what a cheap works is' },
];

/** Who does an operation and why, with *what kind* of why it is: a tool it has not got (and the tool is named), a
 *  place it cannot reach, something nothing here can do at all, or a process nobody has written a rule for. The kind
 *  is a field and not a phrase, because the first run of this file classified it by matching its own prose and
 *  "out of every rail's reach" did not match the pattern looking for it. */
export interface Tended {
  by: 'robot' | 'person'; why: string;
  because?: 'tool' | 'place' | 'never' | 'unwritten';
  /** the affordance it wants and has not got */ wants?: Does;
}

/** Who does an operation, and why. Three ways it can fall to a person: the robot has no tool for it (and the tool is
 *  named, because it is composable), nothing here reaches it at all, or the station is out of every rail's reach. */
export function tends(op: Op, t: Tender): Tended {
  const near = t.serves.some((s) => s.id === op.station);
  const rule = TENDS.find((r) => r.process.test(op.process));
  if (!rule) return { by: 'person', because: 'unwritten', why: `nothing is written down about tending ${op.process}, so it is a person's until it is` };
  if (rule.never) return { by: 'person', because: 'never', why: rule.whyNot! };
  const missing = rule.needs.find((d) => !t.machine.does.includes(d));
  if (missing) return { by: 'person', because: 'tool', wants: missing, why: `${rule.whyNot ?? `it has no ${missing}`}. Give it one and this becomes the robot's: ${rule.why}` };
  if (!near) {
    const out = t.cannot.find((c) => c.id === op.station);
    return { by: 'person', because: 'place', why: `the robot could do this (${rule.why}) but ${out?.name ?? op.station} is out of every rail's reach: ${out?.why ?? 'it stands in a row no aisle faces'}` };
  }
  return { by: 'robot', why: rule.why };
}

/** The unit that affords each thing a tender might want, so a gap in what the robot can do names a tool that really
 *  exists and really costs what it says. Only the ones a works can actually build are here: there is no welding head,
 *  and `TENDS` says why rather than leaving a hole for one. */
const TOOL_FOR: Partial<Record<Does, typeof SOLDER_HEAD>> = { solder: SOLDER_HEAD };

// ---- ordering --------------------------------------------------------------------------------------------------------

/** A basket: the cheapest real offer for every line the plan says to buy, each with the page it was seen on. */
export interface Order {
  lines: { what: string; n: number; offer: Offer; usd: number; packs: number }[];
  /** lines with no seller's page here: named, never given a made-up price */ unpriced: { what: string; n: number }[];
  usd: number;
  /** the sellers it is split across, because shipping is per seller and that is most of a small order */
  sellers: { seller: string; usd: number; lines: number }[];
  /** what a person has to do, because nothing here can pay for anything */ needsAPerson: string[];
}

/** The order for a job, against what is already on the shelf. */
export function orderFor(job: Job, had: string[] = []): Order {
  const lines: Order['lines'] = [], unpriced: Order['unpriced'] = [];
  for (const b of job.buy) {
    if (had.some((h) => b.line.name.toLowerCase().includes(h.toLowerCase()))) continue;
    const key = priceKeyOf(b.line.name) ?? guessKey(b.line.name);
    const got = key ? cheapest(key, b.line.n) : null;
    if (got) lines.push({ what: b.line.name, n: b.line.n, offer: got.offer, usd: got.usd, packs: got.packs });
    else unpriced.push({ what: b.line.name, n: b.line.n });
  }
  const by = new Map<string, { usd: number; lines: number }>();
  for (const l of lines) { const e = by.get(l.offer.seller) ?? { usd: 0, lines: 0 }; e.usd += l.usd; e.lines++; by.set(l.offer.seller, e); }
  const total = +lines.reduce((a, l) => a + l.usd, 0).toFixed(2);
  const needsAPerson = [
    'pay for it: nothing here can press a Buy button, and a plan that says it ordered something it did not is worse than no plan',
    ...(by.size > 1 ? [`split the order across ${by.size} sellers, which is ${by.size} lots of shipping — worth checking whether one of them stocks the lot`] : []),
    ...(lines.some((l) => l.offer.cond === 'used') ? ['find the used lines on the secondhand market: their prices here are estimates of a market, not listings'] : []),
    ...(lines.some((l) => l.offer.stock === 'out') ? ['find another seller for anything the page said was out of stock'] : []),
    ...(unpriced.length ? [`price ${unpriced.length} line${unpriced.length === 1 ? '' : 's'} nobody here has a page for`] : []),
  ];
  return { lines, unpriced, usd: total, sellers: [...by].map(([seller, e]) => ({ seller, usd: +e.usd.toFixed(2), lines: e.lines })).sort((a, b) => b.usd - a.usd), needsAPerson };
}

/** A price key for a line the inventory does not name exactly: matched on the words, which is how a "NEMA 17 stepper,
 *  40 mm" line finds the `nema17` page. Nothing is matched loosely enough to price one thing as another. */
function guessKey(name: string): string | null {
  const t = name.toLowerCase();
  const WORDS: [RegExp, string][] = [
    [/nema\s?17/, 'nema17'], [/mgn12/, 'rail-mgn12h-400'], [/gt2 belt|belt 6 mm/, 'gt2-belt'], [/gt2 pulley|pulley, 20/, 'pulley-gt2-20t-5'],
    [/ball bearing 625|bearing 625/, 'bearing-625'], [/cartridge heater/, 'heater-cartridge'], [/thermistor/, 'thermistor-ntc'],
    [/hot ?end|heater block|heat break|heat sink/, 'hotend'], [/drive gear|extruder/, 'extruder'], [/\bnozzle\b/, 'hotend'],
    [/stepper driver|control board|32-bit board/, 'printer-board'], [/24 ?v.*supply|power supply/, 'psu-24v'],
    [/xiao|esp32c3/, 'xiao-esp32c3'], [/level (shifter|converter)|bss138/, 'level-shifter'],
    [/jumper.*female|female.*jumper/, 'jumper-wires-ff'], [/flexible.*coupling|shaft coupling/, 'coupling-flex'],
    [/multimeter/, 'multimeter'], [/soldering iron|pinecil/, 'soldering-iron'],
  ];
  return WORDS.find(([re]) => re.test(t))?.[1] ?? null;
}

// ---- the loop ---------------------------------------------------------------------------------------------------------

/** A want run through a tended works: the plan, the order, and who does each step. */
export interface Run {
  what: string; tender: Tender; job: Job; order: Order;
  steps: (Tended & { op: Op })[];
  /** minutes, split by whose they are */ robotMin: number; personMin: number;
  /** the share of the machine time the robot takes, 0 to 1 */ tended: number;
  /** what one more thing would hand the robot, cheapest first: the next $200 of tooling */
  next: { buy: string; wouldTake: number; why: string }[];
}

/** Throw a build at a tended works: what it costs to order, what the robot does, what is left for you. */
export function runWorks(build: Build | string, ids: string[], had: string[] = [], o: { reach?: number; tools?: Does[] } = {}): Run {
  const tender = tendWorks(ids, o);
  const job = throwAt(build, ids);
  const order = orderFor(job, had);
  const steps = job.ops.map((op) => ({ op, ...tends(op, tender) }));
  const min = (f: (s: { by: string }) => boolean) => +steps.filter(f).reduce((a, s) => a + s.op.setup + s.op.run, 0).toFixed(1);
  const robotMin = min((s) => s.by === 'robot'), personMin = min((s) => s.by === 'person');
  // what a second rail or one more tool would hand it: the stations that are out of reach, and the processes that
  // nothing it has can do, each with the minutes it would take off a person
  const next: Run['next'] = [];
  for (const out of tender.cannot) {
    const mins = steps.filter((s) => s.op.station === out.id && s.because === 'place').reduce((a, s) => a + s.op.setup + s.op.run, 0);
    if (mins > 0) next.push({ buy: `getting ${out.name} onto a row an aisle faces`, wouldTake: +mins.toFixed(1), why: out.why });
  }
  const byWant = new Map<Does, number>();
  for (const s of steps) if (s.wants) byWant.set(s.wants, (byWant.get(s.wants) ?? 0) + s.op.setup + s.op.run);
  for (const [d, mins] of [...byWant].sort((a, b) => b[1] - a[1])) {
    const u = TOOL_FOR[d];
    next.push({
      buy: u ? `${u.name} on the robot — ${money(unitUsd(u).usd)} of parts, ${unitKg(u).kg} kg` : `a hand that can ${d}`,
      wouldTake: +mins.toFixed(1),
      why: u ? `${u.says}. Every part of it is already in the library, so the works builds this rather than buying it: ${u.src}` : `nothing composed here affords ${d} yet`,
    });
  }
  const byProcess = new Map<string, number>();
  for (const s of steps) if (s.because === 'never' || s.because === 'unwritten') byProcess.set(s.op.process, (byProcess.get(s.op.process) ?? 0) + s.op.setup + s.op.run);
  for (const [p, mins] of [...byProcess].sort((a, b) => b[1] - a[1]).slice(0, 2)) {
    next.push({ buy: `your own hands at ${p}`, wouldTake: +mins.toFixed(1), why: TENDS.find((r) => r.process.test(p))?.whyNot ?? `nothing is written down about tending ${p}` });
  }
  return { what: job.what, tender, job, order, steps, robotMin, personMin, tended: +(robotMin / Math.max(1, robotMin + personMin)).toFixed(2), next: next.sort((a, b) => b.wouldTake - a.wouldTake) };
}

/** A run written out: the robot, the order, who does what, and what would hand the robot more of it. */
export function runText(r: Run): string {
  const out = [`${r.what}, in a works a robot tends.`, '', r.tender.says, ''];
  if (r.tender.cannot.length) out.push(`Out of reach of every rail: ${r.tender.cannot.map((c) => `${c.name} (${c.off} m off)`).join(', ')}.`, '');
  out.push(`==== the order: ${money(r.order.usd)} across ${r.order.sellers.length} seller${r.order.sellers.length === 1 ? '' : 's'}`);
  for (const l of r.order.lines) out.push(`  ${l.n} × ${l.what} — ${money(l.usd)}${l.packs > 1 ? ` (${l.packs} packs)` : ''}  ${l.offer.seller}${l.offer.cond === 'used' ? ' [used: an estimate of a market]' : ''}${l.offer.stock === 'out' ? ' [out of stock on the day seen]' : ''}\n      ${l.offer.url} — ${money(l.offer.usd)} seen ${l.offer.seen}`);
  if (r.order.unpriced.length) out.push(`  no page here for: ${r.order.unpriced.map((u) => `${u.n} × ${u.what}`).join(', ')}`);
  out.push('', 'What a person still has to do about the order:', ...r.order.needsAPerson.map((s) => `  - ${s}`), '');
  out.push(`==== the work: ${(r.tended * 100).toFixed(0)} % of ${(r.robotMin + r.personMin).toFixed(0)} machine-minutes are the robot's (${r.robotMin.toFixed(0)} min to it, ${r.personMin.toFixed(0)} min to you)`);
  for (const s of r.steps) out.push(`  [${s.by === 'robot' ? 'robot' : ' you '}] ${s.op.n} × ${s.op.part} — ${s.op.process} at ${stationById(s.op.station).name}, ${(s.op.setup + s.op.run).toFixed(0)} min\n      ${s.why}`);
  if (r.next.length) out.push('', 'What would hand the robot more of it:', ...r.next.map((n) => `  - ${n.buy}: ${n.wouldTake.toFixed(0)} min off you. ${n.why}`));
  return out.join('\n');
}

/** Words in the room: "let the robot run the works", "what would the robot order for a gokart". */
export function tendWords(text: string): string | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, '');
  if (!/\b(tend|tends|tended|run the works|robot.*(run|order|build).*works|works.*robot)\b/.test(t)) return null;
  const build = /\b(gokart|go-kart|workbench|quadcopter|mug|housing|wall)\b/.exec(t);
  return runText(runWorks(build ? build[1]!.replace('go-kart', 'gokart') : 'workbench', worksUnder(3000).ids));
}

// Hard challenges, to find where Ego's engineering breaks. Easy jobs only show what already works; a hard one (a
// computer built inside her world, a symbiote, a scientist, a language, a new shape, a flying machine) runs into the
// edges of everything: what her language can say, what physics she knows, what she can build, what holds. Each
// challenge is said as the functions it needs, in plain words; `attempt` takes it through her real machinery (words
// to flows, flows to physical ways, ways to blocks, blocks grown into a body and checked), and says for each need how
// far it got:
//
//   unsayable    her language has no flow for a word in it
//   no way       she knows no physics that turns the one into the other
//   unbuildable  she knows a way, but its blocks aren't catalogued or made here (R11)
//   fails        she can grow it, but a check fails
//   partial      it grows and holds, but some parts aren't sized or can't honestly be made yet
//   works        it grows, holds and every part is real
//
// Every miss is a concrete thing to fix, and the challenges are run in the tests, so fixing one moves its result.
// Each also carries the physics that bounds it (the energy of a bit, the efficiency of a loop, the information in a
// choice), so the answer is honest about what can't be done by anyone.

import type { Flow } from './blocks';
import { conceive, type Medium } from './ways';
import { grow, compression } from './grow';
import { lawById, use } from './laws';
import { CATALOG } from './parts';
import { formFromWords, invent } from '../forms/say';
import { routes } from '../forms/make';
import { describe as describeForm } from '../forms/form';

export type Level = 'unsayable' | 'no way' | 'unbuildable' | 'fails' | 'partial' | 'works';
export const LEVEL_ORDER: Level[] = ['unsayable', 'no way', 'unbuildable', 'fails', 'partial', 'works'];

/** A need: one flow into another, or a shape (made from words, or invented for a job said in words). */
export type Need = { does: string; from: string; to: string; against?: Medium } | { does: string; form: string };

export interface Challenge {
  id: string;
  name: string;
  /** The challenge as said. */
  asked: string;
  /** What physics allows and doesn't, plainly. */
  frame: string;
  needs: Need[];
  /** The numbers to size it by, when a need is a vehicle's. */
  spec?: Record<string, number>;
  /** Checks of its own: the physics that bounds it. */
  probe?: () => Note[];
}

export interface Note { says: string; law?: string; value?: number; fix?: string }

export interface NeedResult { need: Need; level: Level; says: string; flows?: [Flow, Flow]; way?: string; missing?: string[]; fix?: string }

export interface Attempt { challenge: Challenge; results: NeedResult[]; notes: Note[]; toFix: string[]; worst: Level; best: Level }

/** The words she knows each flow by: her language, as far as it goes. */
export const FLOW_WORDS: Record<Flow, string[]> = {
  electric: ['electric', 'electricity', 'current', 'battery', 'power'],
  rotation: ['rotation', 'spin', 'turn', 'turning', 'torque'],
  translation: ['stroke', 'push', 'linear', 'lift', 'press'],
  travel: ['travel', 'motion', 'move', 'locomotion', 'flight', 'drive'],
  load: ['load', 'force', 'weight', 'support'],
  signal: ['signal', 'information', 'bit', 'bits', 'data', 'logic'],
  heat: ['heat', 'warmth', 'temperature'],
  stock: ['stock', 'material', 'filament'],
  chemical: ['chemical', 'food', 'fuel', 'sugar', 'nutrient'],
  light: ['light', 'sunlight', 'sun', 'photon'],
};

export function flowOfWord(w: string): Flow | null {
  const t = w.toLowerCase().trim();
  for (const [f, ws] of Object.entries(FLOW_WORDS) as [Flow, string[]][]) if (ws.includes(t)) return f;
  return null;
}

const ids = (ways: { id: string }[]) => ways.map((w) => w.id).join('>');

function meetForm(need: Extract<Need, { form: string }>): NeedResult {
  const inv = invent(need.form);
  const form = inv?.form ?? formFromWords(need.form);
  if (!form) return { need, level: 'unsayable', says: `I can't read a shape in "${need.form}"`, fix: `words for the shape in "${need.form}"` };
  const can = routes(form).filter((r) => r.can);
  if (!can.length) return { need, level: 'unbuildable', says: `I can say it (${describeForm(form)}) but nothing I know can make it`, fix: `a process that makes ${describeForm(form)}` };
  if (inv && inv.grown.safety < 1) return { need, level: 'fails', says: `grown for ${inv.job}, but it would yield (safety factor ${inv.grown.safety.toFixed(2)})`, fix: 'a stronger material or more of it' };
  const what = inv ? `grown by its loads for ${inv.job}: safety factor ${inv.grown.safety.toFixed(1)}, deflecting ${(inv.grown.deflection * 1000).toFixed(2)} mm` : describeForm(form);
  return { need, level: 'works', way: can[0]!.process, says: `${what}; made by ${can.map((r) => r.process).join(' or ')}` };
}

function meet(c: Challenge, need: Need): NeedResult {
  if ('form' in need) return meetForm(need);
  const f = flowOfWord(need.from), t = flowOfWord(need.to);
  if (!f || !t) {
    const word = !f ? need.from : need.to;
    return { need, level: 'unsayable', says: `my language has no flow for "${word}"`, fix: `a flow for "${word}" (and the physics that makes and uses it)` };
  }
  const all = conceive(f, t).filter((x) => !need.against || x.against === need.against);
  if (!all.length) return { need, level: 'no way', flows: [f, t], says: `I know no physical way from ${f} to ${t}${need.against ? ` against the ${need.against}` : ''}`, fix: `the physics from ${f} to ${t}` };
  const can = all.filter((x) => x.buildable);
  if (!can.length) {
    const simplest = all[0]!;
    return { need, level: 'unbuildable', flows: [f, t], way: ids(simplest.ways), missing: simplest.missing.map((w) => w.id), says: `possible by ${ids(simplest.ways)}, but I can't build ${simplest.missing.map((w) => w.name.toLowerCase()).join(', ')} here yet`, fix: `catalogue or make: ${simplest.missing.map((w) => w.name.toLowerCase()).join(', ')}` };
  }
  // buildable: grow it whole and see whether it holds
  const g = grow({ from: f, to: t, spec: c.spec ?? {} });
  const body = g.best;
  if (!body) return { need, level: 'partial', flows: [f, t], way: ids(can[0]!.ways), says: `buildable by ${ids(can[0]!.ways)}, but I couldn't grow it whole` };
  const way = ids(body.concept.ways);
  const errors = body.findings.filter((x) => x.level === 'error'), gaps = body.findings.filter((x) => x.level === 'gap');
  if (errors.length) return { need, level: 'fails', flows: [f, t], way, says: `grown by ${way}, but: ${errors[0]!.message}`, fix: errors[0]!.message };
  if (gaps.length) return { need, level: 'partial', flows: [f, t], way, says: `grown by ${way} (${body.fitness.organs} blocks) and it holds, but ${gaps.length} part${gaps.length > 1 ? 's' : ''} ${gaps.length > 1 ? 'aren\'t' : 'isn\'t'} real yet: ${gaps[0]!.message}`, fix: gaps.map((x) => x.message).join('; ') };
  return { need, level: 'works', flows: [f, t], way, says: `grown by ${way}, ${body.fitness.organs} blocks, every one real and every connection holding` };
}

/** Take a challenge through everything she has, and say where it breaks. */
export function attempt(c: Challenge): Attempt {
  const results = c.needs.map((n) => meet(c, n));
  let notes: Note[] = [];
  try { notes = c.probe?.() ?? []; } catch (e) { notes = [{ says: `I couldn't check its physics: ${(e as Error).message}`, fix: (e as Error).message }]; }
  const toFix = [...new Set([...results.flatMap((r) => (r.fix ? [r.fix] : [])), ...notes.flatMap((n) => (n.fix ? [n.fix] : []))])];
  const rank = (l: Level) => LEVEL_ORDER.indexOf(l);
  // with no needs of its own, a challenge is as far as its physics checks got
  const levels = results.length ? results.map((r) => r.level) : [notes.some((n) => n.fix) ? 'partial' as Level : 'works' as Level];
  return { challenge: c, results, notes, toFix, worst: levels.reduce((a, b) => (rank(b) < rank(a) ? b : a)), best: levels.reduce((a, b) => (rank(b) > rank(a) ? b : a)) };
}

/** A law's value, or a note that she lacks it (itself a finding). */
function bound(law: string, inputs: Record<string, number>, says: (v: number) => string): Note {
  if (!lawById(law)) return { says: `I have no law ${law} to bound it by`, fix: `the law ${law}` };
  const v = use(law, inputs).value;
  return { says: says(v), law, value: v };
}

const KART = { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 };

export const CHALLENGES: Challenge[] = [
  {
    id: 'computer', name: 'A computer, built inside the world', asked: 'Build a computer in the app.',
    frame: 'A computer is switches that hold and combine bits: anything with two stable states where one can set another will do (relays, transistors, levers, marbles, valves). Its floor is Landauer\'s: erasing a bit costs at least k T ln 2.',
    needs: [
      { does: 'hold one bit', from: 'bit', to: 'bit' },
      { does: 'let one bit switch another (a logic gate)', from: 'logic', to: 'logic' },
      { does: 'run on electric power', from: 'electric', to: 'bit' },
      { does: 'take a question from a hand: a key pressed', from: 'push', to: 'bit' },
      { does: 'show its answer', from: 'bit', to: 'light' },
    ],
    probe: () => [
      bound('landauer', { T: 300 }, (v) => `the least a bit can cost to erase at room temperature is ${v.toExponential(2)} J (Landauer); a lever flipped by a 10 g ball dropping 1 cm costs ${(0.01 * 9.80665 * 0.01).toExponential(1)} J, ${((0.01 * 9.80665 * 0.01) / v).toExponential(1)} times more: a mechanical computer works, at a heavy price per bit`),
      bound('cmos.dynamic', { alpha: 0.1, C: 1e-9, V: 1, f: 1e9 }, (v) => `a chip switching 1 nF of gates at 1 V and 1 GHz (10% of them each cycle) draws ${v.toFixed(2)} W: why chips run at low voltage (P goes as V²)`),
    ],
  },
  {
    id: 'symbiote', name: 'A symbiote', asked: 'Create a symbiote.',
    frame: 'Symbiosis is two living things each living on what the other gives. Two machines can exchange flows the same way, but a pair living only on each other is a perpetual-motion machine: every conversion loses energy, so a real symbiosis also takes from outside (light, food), and so must this.',
    needs: [
      { does: 'take its energy from the sun, as a leaf does', from: 'sunlight', to: 'electric' },
      { does: 'live on its partner\'s waste heat', from: 'heat', to: 'electric' },
      { does: 'carry its host', from: 'electric', to: 'travel' },
      { does: 'feed on food, as an animal does, to move', from: 'food', to: 'push' },
      { does: 'heal and grow itself', from: 'nutrient', to: 'tissue' },
    ],
    spec: KART,
    probe: () => [
      bound('carnot', { Tc: 300, Th: 310 }, (v) => `a partner living on the other's waste heat at body temperature (310 K into 300 K air) can turn at most ${(v * 100).toFixed(1)}% of it back into work (Carnot): a closed pair runs down within a few exchanges, so it must also take light or food from outside`),
    ],
  },
  {
    id: 'scientist', name: 'A scientist', asked: 'Create a scientist.',
    frame: 'A scientist is a loop: predict from what is known, measure the world, compare, and change what is known when they disagree. Ego has the predicting (her laws) and a world to measure in; a scientist inside it also needs senses, and hands that act on what it found.',
    needs: [
      { does: 'sense a force', from: 'force', to: 'signal' },
      { does: 'sense a temperature', from: 'temperature', to: 'signal' },
      { does: 'sense a turn', from: 'turn', to: 'signal' },
      { does: 'act on what it found', from: 'signal', to: 'push' },
    ],
    probe: () => {
      const notes: Note[] = [];
      const pend = lawById('pendulum.period');
      notes.push(pend ? { says: `she can predict: a 1 m pendulum swings in ${use('pendulum.period', { L: 1 }).value.toFixed(3)} s, and her world reproduces it (the conformance suite measures it)`, law: 'pendulum.period' } : { says: 'no pendulum law to predict with', fix: 'the law pendulum.period' });
      notes.push({ says: 'she can\'t yet run an experiment of her own choosing: her test stand (design, build on a bench, test in a second world, compare) isn\'t finished', fix: 'Ego\'s test stand: predict, build, measure, compare, revise' });
      return notes;
    },
  },
  {
    id: 'language', name: 'A more efficient language', asked: 'Create a conceptual language more efficient than any language.',
    frame: 'No language can beat every other: Shannon\'s source-coding theorem says nothing can be said in fewer bits than the information in it. What a language can do is keep its meaning in shared knowledge, as DNA relies on the cell that reads it: say the intent, and let development grow the rest. Ego\'s genome is that language.',
    needs: [],
    probe: () => {
      const g = grow({ from: 'electric', to: 'travel', spec: KART });
      if (!g.best) return [{ says: 'I couldn\'t grow the kart to measure my language by', fix: 'grow the kart' }];
      const c = compression(g.best);
      // how many bodies the genome chooses among: the catalogue families its development chooses from
      const fams = ['dc motor', 'gearhead', 'battery', 'motor controller', 'wire', 'fuse', 'coupling', 'rod end', 'pillow block'];
      const N = fams.reduce((n, f) => n * Math.max(1, CATALOG.filter((x) => x.family === f).length), 1);
      const notes: Note[] = [{ says: `the kart's genome is ${c.genomeBytes} bytes; the body it grows is ${c.bodyBytes} bytes: ${c.ratio.toFixed(0)} times smaller, because the meaning lives in the ganglia, as DNA's does in the cell` }];
      notes.push(bound('information.choices', { N }, (bits) => `its parts are chosen among about ${N.toExponential(1)} bodies, ${bits.toFixed(1)} bits of choice, against the ${c.genomeBytes * 8} bits its genome spends as text: the genome says more (the intent, which also sizes the axle, the current limit and the fuse), but the choices alone could be said ${((c.genomeBytes * 8) / Math.max(1, bits)).toFixed(0)} times smaller, and no code can say them in fewer than ${Math.ceil(bits)} bits (Shannon)`));
      return notes;
    },
  },
  {
    id: 'geometry', name: 'A new geometry', asked: 'Create a new geometry.',
    frame: 'A new shape needs a generator (a section swept along a path, a lattice, a shape grown by its loads, as bone is) and a process that can make what it generates (printing makes almost any shape; machining makes what a tool can reach).',
    needs: [
      { does: 'invent a shape nobody has drawn, for a job', form: 'invent a bracket that holds 500 N at 120 mm from the wall' },
      { does: 'make a shape no stock comes in: a lattice', form: 'a 60 mm cube filled with a gyroid lattice of 12 mm cells' },
      { does: 'make an aerofoil', form: 'a naca 2412 wing 300 mm long with a 100 mm chord' },
    ],
  },
  {
    id: 'flight', name: 'A flying machine', asked: 'Build something that flies.',
    frame: 'To fly it must push on the air hard enough to hold its weight: by a rotor or a wing. A rotor\'s ideal thrust per watt grows with its disc; a battery\'s energy per kilogram sets how long.',
    needs: [{ does: 'push on the air to fly', from: 'electric', to: 'flight', against: 'fluid' }],
    probe: () => [bound('thrust.ideal-static', { rho: 1.225, A: Math.PI * 0.15 ** 2, P: 100 }, (v) => `a 0.3 m rotor given 100 W can at best hold up ${(v / 9.80665).toFixed(2)} kg (momentum theory): a 1 kg drone needs about 80 W a rotor-pair, before losses`)],
  },
];

export const challengeById = (id: string) => CHALLENGES.find((c) => c.id === id);

/** An attempt, said plainly: each need with how far it got, the physics that bounds it, and what to fix. */
export function report(a: Attempt): string {
  const lines = a.results.map((r) => `${r.need.does}: ${r.level} — ${r.says}.`);
  return `${a.challenge.name}. ${a.challenge.frame} ${lines.join(' ')}${a.notes.length ? ` ${a.notes.map((n) => n.says).join('. ')}.` : ''}${a.toFix.length ? ` To fix: ${a.toFix.join('; ')}.` : ''}`;
}

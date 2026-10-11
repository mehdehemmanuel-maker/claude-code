// `npm run perf` — the measuring and proving tool, so that neither is ever a throwaway probe again.
//
// Five rounds in a row have begun the same way: write a test whose only job is to print what the engine costs or what
// it makes, read it, delete it. CLAUDE.md's own rule is that a thing worked out by hand twice becomes a tool, and this
// had been worked out five times in one day. The two halves it keeps are the two halves of every efficiency round:
//
//   npm run perf -- bench              every workload, each run three times, the least time kept (the wall clock on
//   npm run perf -- bench truss        this host swings a fifth run to run, so the least of several is the only
//                                      number worth quoting, and a fixed workload is the only fair one)
//   npm run perf -- dump               every generator's numbers as one hash a case: the proof a refactor changed
//   npm run perf -- dump > before.txt  nothing. Run it, change the code, run it again, diff: no line may differ
//   npm run perf -- dump kits --full   and when a hash does differ, the whole case's numbers, to find which
//
// `npm run perf -- time` and `-- profile <file>` are the other two halves (per-file test time, and a sampled profile
// from inside the worker, since vitest's workers swallow --cpu-prof); they live in tools/perf.mjs because they run
// vitest rather than the engine.

import { createHash } from 'node:crypto';
import { KITS, countParts, makeKit, massOf, type Part } from '../parts/kits';
import { aimShot, flight, newRally, robotStep, serveShot, stepBall, TT, type Ball, type V3 } from '../world/pingpong';
import { ground, lattice, truss } from '../substrate/adapt';
import { perfect } from '../make/pipeline';
import { answersFrom, conceive, designs } from '../ask/conceive';
import { BUILDS, designText } from '../works';

const args = process.argv.slice(2), verb = args[0] ?? 'help', rest = args.slice(1).filter((a) => !a.startsWith('--'));
const flag = (f: string) => args.includes(`--${f}`);
const num = (f: string, d: number) => { const a = args.find((x) => x.startsWith(`--${f}=`)); return a ? Number(a.split('=')[1]) : d; };

// ---- the dumps: every number a generator makes, as one hash a case ------------------------------------------------

type Emit = (line: string) => void;
interface Dump { id: string; what: string; run: (sub: (name: string) => void, emit: Emit) => Promise<void> | void }

const partLines = (p: Part, emit: Emit, path = ''): void => {
  const at = p.at ? p.at.join(',') : '', rot = p.rot ? p.rot.join(',') : '';
  emit(`${path}/${p.name} ${p.mat ?? '-'} ${JSON.stringify(p.shape ?? null)} ${at} ${rot} ${p.shell ?? ''} ${p.color ?? ''}`);
  for (const k of p.parts ?? []) partLines(k, emit, `${path}/${p.name}`);
};

const DUMPS: Dump[] = [
  {
    id: 'kits', what: 'every kit at three seeds: every part, its material, shape, place and turn',
    run: (sub, emit) => {
      for (const k of KITS) for (const seed of [1, 2, 3]) {
        sub(`${k.id}/${seed}`); const { part } = makeKit(k, '', seed);
        emit(`parts ${countParts(part)} mass ${massOf(part)}`); partLines(part, emit);
      }
    },
  },
  {
    id: 'pipeline', what: 'every kit through the make pipeline: what it did to each',
    run: (sub, emit) => {
      for (const k of KITS) { sub(k.id); const m = perfect(makeKit(k, k.name, 7).part, k.name); emit(JSON.stringify({ parts: m.parts, details: m.details, rounds: m.rounds })); }
    },
  },
  {
    id: 'flight', what: 'the ball, the aimed shot, the serve and a whole rally',
    run: (sub, emit) => {
      sub('flights');
      for (const [vx, vy, vz, wz] of [[-9, 1.2, 0, 0], [-9, 1.2, 0, 377], [6, 0.4, 1.5, -200], [12, 2, -0.6, 90]] as const) {
        const f = flight({ p: [1.6, TT.top + 0.25, 0.2], v: [vx, vy, vz], w: [0, 0, wz] });
        emit(`net ${f.net} bounces ${f.bounces.length}`);
        for (const q of f.path) emit(`${q.p.join(' ')} ${q.v.join(' ')} ${q.w.join(' ')}`);
      }
      sub('shots');
      for (const speed of [6, 8, 10, 12, 14]) for (const spin of [0, 30, 60]) for (const tz of [-0.5, 0.3]) {
        const s = aimShot([1.75, TT.top + 0.25, 0.3], [-1.0, TT.top, tz], speed, spin);
        emit(`${speed} ${spin} ${tz} ${s ? `${s.v.join(' ')} ${s.w.join(' ')} ${s.lands.join(' ')}` : 'none'}`);
      }
      for (const toward of [-0.5, 0.4]) for (const spin of [15, 30]) {
        const s = serveShot([1.6, TT.top + 0.25, 0.2], toward, spin);
        emit(`serve ${toward} ${spin} ${s ? `${s.v.join(' ')} ${s.lands.join(' ')}` : 'none'}`);
      }
      sub('rally');
      const seeded = (s0: number) => { let s = s0 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
      const R = newRally(1), rand = seeded(5); R.robot.wait = 0.2;
      for (let i = 0; i < 1000 * 120 && R.games.robot < 1; i++) {
        if (!R.live && R.server === 'you') { R.robot.wait -= 0.001; if (R.robot.wait <= 0) { const x = -TT.L / 2 - 0.25; R.ball = { p: [x, TT.top + 0.3, -0.3], v: [0, 2.2, 0], w: [0, 0, 0] } as Ball; R.live = true; R.hitBy = 'you'; R.bounces = { you: 0, robot: 0 }; R.served = false; R.t = 0; } }
        stepBall(R, 0.001); robotStep(R, 0.001, [-1.6, 1, 0], rand);
        if (i % 200 === 0) emit(`${i} ${R.ball.p.join(' ')} ${R.live} ${R.hitBy} ${R.score.you}-${R.score.robot}`);
      }
      emit(R.said.join(' | '));
    },
  },
  {
    id: 'frames', what: 'four frames grown along their loads: their plan, choices, checks and steps',
    run: async (sub, emit) => {
      const initJolt = (await import('jolt-physics/wasm-compat')).default as unknown as () => Promise<unknown>;
      const J = (await initJolt()) as never;
      const go = (words: string) => { let c = conceive(words), all: Record<string, string> = {}; for (let k = 0; k < 3 && c.questions.length; k++) { all = { ...all, ...answersFrom(c, 'go') }; c = conceive(words, all); } return c; };
      const asks: [string, number, boolean][] = [
        ['a wall bracket that holds a 17 kg camera 400 mm out from the wall', 101, false],
        ['a 10 m tower that holds a 5 kg antenna at its top', 101, false],
        ['Bird-watching tower: 5 m high platform, 2 m x 2 m footprint at most, has to hold 2 adults (200 kg) up top and not tip over in 90 km/h gusts.', 8020, true],
        ["need an arm that clamps onto the 32 mm round post of my stereo microscope and sticks out 150 mm sideways to hold a 40 g gooseneck LED head over the stage. tip can't droop more than 0.5 mm", 101, true],
      ];
      for (const [words, seed, phys] of asks) {
        sub(words.slice(0, 28));
        const d = designs(go(words), 1, { seed, ...(phys ? { physics: J } : {}) })[0]!;
        for (const k of ['plan', 'choices', 'checks', 'steps', 'conditions'] as const) emit(`${k} ${JSON.stringify(d[k] ?? null)}`);
        emit(`footprint ${JSON.stringify(d.footprint)}`);
      }
    },
  },
  {
    id: 'works', what: "every build's bill, and what the designer makes of it",
    run: (sub, emit) => {
      for (const b of BUILDS) {
        sub(b.id);
        for (const l of b.lines) emit(`${l.name} n ${l.n} ${l.mat} ${JSON.stringify(l.size ?? null)} ${l.cm3 ?? ''} ${l.as ?? ''}`);
        for (const l of b.lay ?? []) emit(`lay ${l.line} ${JSON.stringify(l.at)} ${l.along ?? ''} ${l.roll ?? ''}`);
      }
      sub('design'); emit(designText());
    },
  },
];

async function dump(): Promise<void> {
  const want = rest[0], full = flag('full');
  for (const d of DUMPS.filter((x) => !want || x.id === want)) {
    let name = '', lines: string[] = [], n = 0;
    const close = () => { if (name) console.log(`${d.id}/${name} lines ${n} sha ${createHash('sha256').update(lines.join('\n')).digest('hex').slice(0, 16)}`); lines = []; n = 0; };
    const emit = (l: string) => { n++; if (full) console.log(l); else lines.push(l); };
    await d.run((s) => { if (!full) close(); name = s; }, emit);
    if (!full) close();
  }
}

// ---- the benches: a fixed workload, the least of several runs ------------------------------------------------------

interface Bench { id: string; what: string; run: () => number }

const BENCHES: Bench[] = [
  {
    id: 'truss', what: '20,000 solves of a frame-sized truss (27 freedoms over 113 struts), warm-started',
    run: () => {
      const { nodes } = lattice([0, 0, 0], [2, 5, 2], [2, 5, 2]);
      const held = new Set(nodes.map((p, i) => (p[1] < 4.9 ? i : -1)).filter((i) => i >= 0));
      const G = ground(nodes, 2.3, { held }), A = G.edges.map(() => 1e-4);
      const load: V3[] = nodes.map((p) => (p[1] > 4.9 ? [0, -1000, 0] : [0, 0, 0]));
      let sum = 0, guess: V3[] | undefined;
      for (let i = 0; i < 20000; i++) { const r = truss(G, A, 69e9, held, load, guess); guess = r.u; sum += r.N[0]!; }
      return sum;
    },
  },
  { id: 'car', what: 'the car kit at three seeds', run: () => [1, 2, 3].reduce((s, seed) => s + massOf(makeKit(KITS.find((k) => k.id === 'car')!, '', seed).part), 0) },
  { id: 'carpark', what: 'the car park kit at one seed (the longest kit in the gate)', run: () => massOf(makeKit(KITS.find((k) => k.id === 'car park')!, '', 1).part) },
  { id: 'pipeline', what: 'a car through the whole make pipeline', run: () => perfect(makeKit(KITS.find((k) => k.id === 'car')!, 'car', 7).part, 'car').parts[1]! },
  {
    id: 'flight', what: '200 aimed shots and 20 serves', run: () => {
      let s = 0;
      for (let i = 0; i < 200; i++) { const sh = aimShot([1.75, TT.top + 0.25, 0.3], [-1 + (i % 7) * 0.1, TT.top, -0.5 + (i % 5) * 0.2], 8 + (i % 6), 30); s += sh ? sh.lands[0] : 0; }
      for (let i = 0; i < 20; i++) { const sv = serveShot([1.6, TT.top + 0.25, 0.2], -0.5 + i * 0.05, 15 + i); s += sv ? sv.lands[0] : 0; }
      return s;
    },
  },
];

function bench(): void {
  const want = rest[0], runs = num('runs', 3);
  for (const b of BENCHES.filter((x) => !want || x.id === want)) {
    const times: number[] = [];
    let check = 0;
    for (let i = 0; i < runs; i++) { const t = Date.now(); check = b.run(); times.push(Date.now() - t); }
    console.log(`${b.id.padEnd(9)} ${String(Math.min(...times)).padStart(6)} ms   (of ${times.join(', ')}; ${b.what}; checksum ${check.toExponential(8)})`);
  }
}

if (verb === 'dump') await dump();
else if (verb === 'bench') bench();
else {
  console.log('npm run perf -- bench [case] [--runs=n]   a fixed workload, the least of several runs');
  console.log('npm run perf -- dump [case] [--full]      every generator\'s numbers, as one hash a case');
  console.log(`\nbenches: ${BENCHES.map((b) => b.id).join(' ')}`);
  console.log(`dumps:   ${DUMPS.map((d) => d.id).join(' ')}`);
  for (const d of DUMPS) console.log(`  ${d.id.padEnd(9)} ${d.what}`);
}

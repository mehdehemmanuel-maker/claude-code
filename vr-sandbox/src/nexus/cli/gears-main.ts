// `npm run gears -- 20@0,0 40@60,0` — the gear bench from the command line: say where each gear goes and it says
// what that arrangement does, or why it does not work. The same `GearBench` the forge room uses, so the numbers
// here and the numbers in the room cannot drift apart.
//
// It refuses to invent a placement. With no arguments it says how to say one and what is on the stock rail — it
// does not build a gearbox for you, because a board that builds itself teaches nothing about centre distances.
import { GearBench, GEAR_STOCK } from '../view/gear-bench';

const argv = process.argv.slice(2);
const flag = (name: string, dflt: number): number => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : Number(argv[i + 1]); };
const str = (name: string): string | null => { const i = argv.indexOf(`--${name}`); return i < 0 ? null : argv[i + 1] ?? null; };
const m = flag('m', 2) / 1000;
const places = argv.filter((a) => /@/.test(a));

if (!places.length) {
  console.log(`THE GEAR BENCH — say where each gear goes, in millimetres from the middle of the plate.

  npm run gears -- 20@0,0 40@60,0                 a 20-tooth driving a 40-tooth: 2 to 1, the other way round
  npm run gears -- 20@0,0 60@80,0 20@80,0 60@160,0 --key 60T-2,20T-3     a compound 9 to 1
  npm run gears -- 20@0,0 15@35,0 20@70,0         an idler: same ratio, same direction
  npm run gears -- 20@0,0 rack@0,-20              a rack and pinion

  --m 2            the module, in millimetres (every gear on one bench shares it)
  --rpm 60         turns a minute at the driver        --torque 1      N·m at the driver
  --drive <id>     which gear is turned (the first placed, by default)
  --key a,b        two gears keyed to one shaft, so they turn as one piece

On the stock rail: ${GEAR_STOCK.map((s) => s.label).join(', ')}.
Two gears mesh at m(z₁+z₂)/2 apart — at module 2 a 20 and a 40 want exactly 60 mm — and the plate's holes are a
half module apart, so every meshing distance is on the grid and nothing else is.`);
  process.exit(0);
}

const bench = new GearBench(m);
bench.rpm = flag('rpm', 60);
bench.torque = flag('torque', 1);

for (const p of places) {
  const [what, where] = p.split('@') as [string, string];
  const [x, y] = (where ?? '0,0').split(',').map((v) => Number(v) / 1000);
  const rack = /^rack$/i.test(what);
  const z = rack ? 30 : Number(what.replace(/t$/i, ''));
  if (!rack && (!Number.isFinite(z) || z < 1)) { console.log(`"${p}"? A placement is <teeth>@<x>,<y> in mm, or rack@<x>,<y>.`); process.exit(1); }
  const g = bench.place(z, [x ?? 0, y ?? 0], rack ? 'rack' : undefined);
  const moved = Math.hypot(g.at[0] - (x ?? 0), g.at[1] - (y ?? 0));
  console.log(`${g.id} on the hole at ${(g.at[0] * 1000).toFixed(1)}, ${(g.at[1] * 1000).toFixed(1)} mm${moved > 1e-9 ? ` (asked for ${((x ?? 0) * 1000).toFixed(1)}, ${((y ?? 0) * 1000).toFixed(1)}: snapped ${(moved * 1000).toFixed(2)} mm to the grid)` : ''}`);
}

const keyed = str('key');
if (keyed) console.log(bench.key(...(keyed.split(',') as [string, string])));
const driver = str('drive');
if (driver) console.log(bench.drive(driver));

console.log('');
for (const line of bench.say()) console.log(line);

// AND THEN TURN IT, because a ratio printed is a claim and a train that runs is the evidence. One full turn of the
// driver, in twelve steps, printing where each gear stands — so a phase that is wrong shows up as a gear that
// jumps, and a gear nothing drives shows up as one that never moves.
console.log('');
console.log('One turn of the driver, in twelve steps (degrees at each gear):');
const ids = bench.gears.map((g) => g.id);
console.log(`  step   ${ids.map((i) => i.padStart(9)).join('')}`);
for (let i = 0; i <= 12; i++) {
  bench.tick(i === 0 ? 0 : 60 / bench.rpm / 12);
  const t = bench.solve();
  const deg = ids.map((id) => {
    const g = bench.gears.find((x) => x.id === id)!;
    if (g.cut.kind === 'rack') return `${(g.holder.position.x * 1000).toFixed(1)}mm`.padStart(9);
    const a = t?.turn[id]?.angle;
    return (a === undefined ? '—' : `${(((a * 180) / Math.PI) % 360).toFixed(1)}°`).padStart(9);
  });
  console.log(`  ${String(i).padStart(4)}   ${deg.join('')}`);
}
console.log('');
console.log(`A gear that never moves is one nothing drives; a rack's column is how far it has travelled.`);

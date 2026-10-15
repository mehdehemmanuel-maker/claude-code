// `npm run gears -- 20@0,0 40@60,0` — the gear bench from the command line: say where each gear goes and it says
// what that arrangement does, or why it does not work. The same `GearBench` the forge room uses, so the numbers
// here and the numbers in the room cannot drift apart.
//
// It refuses to invent a placement. With no arguments it says how to say one and what is on the stock rail — it
// does not build a gearbox for you, because a board that builds itself teaches nothing about centre distances.
import { GearBench, GEAR_STOCK } from '../view/gear-bench';
import { planetary, planetaryFor, type Planetary } from '../parts/gears';

const argv = process.argv.slice(2);
const flag = (name: string, dflt: number): number => { const i = argv.indexOf(`--${name}`); return i < 0 ? dflt : Number(argv[i + 1]); };
const str = (name: string): string | null => { const i = argv.indexOf(`--${name}`); return i < 0 ? null : argv[i + 1] ?? null; };
const m = flag('m', 2) / 1000;
const places = argv.filter((a) => /@/.test(a));

// A PLANETARY is not a placement on the plate: its planets ride a carrier, so their axes move and the fixed-axis
// solver below cannot describe it. It is asked for by what it is and answered by Willis.
const plan = str('planetary');
if (plan !== null) {
  const parts = plan.split(':').map(Number);
  const got: Planetary | { refused: string } = parts.length >= 2 && parts.every((v) => Number.isFinite(v))
    ? planetary(parts[0]!, parts[1]!, parts[2] ?? 3, m)
    : planetaryFor(Number(plan) || 5, Number(str('planets') ?? 3), m);
  if ('refused' in got) { console.log(`That planetary will not go together: ${got.refused}`); process.exit(1); }
  console.log(`A planetary set: ${got.sun.z} sun, ${got.n} × ${got.planet.z} planets, ${got.ring.z} ring, module ${m * 1000} mm.`);
  console.log(`  the planets' axes stand on a ${(got.carrier * 2000).toFixed(1)} mm circle; the ring is ${(got.ring.z * m * 1000).toFixed(1)} mm across its pitch circle`);
  console.log('');
  console.log('What it gives, by which member is held still (Willis):');
  console.log(`  ring held      sun in, carrier out   ${got.ratios.ringHeld.toFixed(4)} to 1, the same way round`);
  console.log(`  carrier held   sun in, ring out      ${Math.abs(got.ratios.carrierHeld).toFixed(4)} to 1, REVERSING`);
  console.log(`  sun held       ring in, carrier out  ${got.ratios.sunHeld.toFixed(4)} to 1, the same way round`);
  console.log('');
  for (const n of got.notes) console.log(`  · ${n}`);
  console.log('');
  console.log(`Every one of the ${got.n * 2} meshes was judged where the geometry puts it, and the planets go in`);
  console.log(`equally spaced because (z_sun + z_ring) = ${got.sun.z + got.ring.z} divides by ${got.n}.`);
  process.exit(0);
}

if (!places.length) {
  console.log(`THE GEAR BENCH — say where each gear goes, in millimetres from the middle of the plate.

  npm run gears -- 20@0,0 40@60,0                 a 20-tooth driving a 40-tooth: 2 to 1, the other way round
  npm run gears -- 20@0,0 60@80,0 20@80,0 60@160,0 --key 60T-2,20T-3     a compound 9 to 1
  npm run gears -- 20@0,0 15@35,0 20@70,0         an idler: same ratio, same direction
  npm run gears -- 20@0,0 rack@0,-20              a rack and pinion
  npm run gears -- --planetary 5                 a planetary set that comes to 5 to 1 with the ring held
  npm run gears -- --planetary 24:16:4           a sun, planet and planet count said exactly

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

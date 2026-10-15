// `npm run gears -- 20@0,0 40@60,0` — the gear bench from the command line: say where each gear goes and it says
// what that arrangement does, or why it does not work. The same `GearBench` the forge room uses, so the numbers
// here and the numbers in the room cannot drift apart.
//
// It refuses to invent a placement. With no arguments it says how to say one and what is on the stock rail — it
// does not build a gearbox for you, because a board that builds itself teaches nothing about centre distances.
import { GearBench, GEAR_STOCK } from '../view/gear-bench';
import { planetary, planetaryFor, section, sizesOf, type Planetary } from '../parts/gears';
import { stlOfSection } from '../parts/fab';
import { driveLine, fanLoad, inertialLoad, steadyLoad, spinUp, type Load } from '../parts/drive';
import { MOTORS } from '../../data/motors';
import { mkdirSync, writeFileSync } from 'node:fs';

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
  --stl <dir>      write a printable STL for every gear on the board, in millimetres
  --motor <id>     bolt a real catalogue motor to the driver and let the whole thing find its own speed
                   (bare --motor lists what there is).  --volts V overrides its nominal voltage
  --load <what>    what the output is turning: a number of N·m, fan:<k> for a k·w^2 fan law,
                   or flywheel:<kg·m^2>.  --out <id> is the gear it hangs on (the last placed, by default)
  --seconds <s>    show it spinning up over this long (default 1)
  --mu <0.05>      friction on the teeth, so the mesh loss is derived from the real tooth counts rather than typical
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
// PRINT WHAT YOU PUT ON THE BOARD. The same section the viewer draws and the mesh test checks, extruded to an STL
// per gear — so a train that works on the plate is a set of files a printer takes, with nothing redrawn in between.
const stlDir = str('stl');
if (stlDir) {
  mkdirSync(stlDir, { recursive: true });
  for (const g of bench.gears) {
    const sec = section(g.cut, 14);
    const file = `${stlDir}/${g.id}.stl`;
    writeFileSync(file, stlOfSection(sec.pts, sec.holes ?? [], g.cut.b, g.id));
    const sz = g.cut.kind === 'rack' ? `${(g.cut.z * Math.PI * g.cut.m * 1000).toFixed(1)} mm long` : `⌀${(sizesOf(g.cut).ra * 2000).toFixed(1)} mm`;
    console.log(`  ${file}  ${sz}, ${(g.cut.b * 1000).toFixed(0)} mm thick, module ${g.cut.m * 1000}`);
  }
  console.log('');
}

// ─── A REAL MOTOR ON THE BOARD ──────────────────────────────────────────────────────────────────────────────────
// Nothing here is typed in: the ratio comes from where the gears were put, the inertia from their own sections,
// the torque from the motor's published constants, and the speed from where those three cross.
const motorArg = str('motor');
if (motorArg !== null) {
  const mot = MOTORS[motorArg] ?? Object.values(MOTORS).find((x) => x.id.includes(motorArg));
  if (!mot) {
    console.log(`\nNo motor called "${motorArg}". There are these:`);
    for (const x of Object.values(MOTORS)) console.log(`  ${x.id}\n    ${x.label}`);
  } else {
    const ids2 = bench.gears.map((g) => g.id);
    const outId = str('out') ?? ids2[ids2.length - 1]!;
    const loadArg = str('load') ?? '0.1';
    let load: Load;
    if (loadArg.startsWith('fan:')) load = fanLoad(outId, Number(loadArg.slice(4)));
    else if (loadArg.startsWith('flywheel:')) load = inertialLoad(outId, Number(loadArg.slice(9)));
    else load = steadyLoad(outId, Number(loadArg));

    const driverId = driver ?? ids2[0]!;
    const d = driveLine({ motor: mot, V: str('volts') ? flag('volts', mot.V) : undefined, places: bench.placed(), driver: driverId, out: outId, load, mu: str('mu') ? flag('mu', 0.05) : undefined });
    console.log('');
    console.log(`The motor: ${d.rig.source.says}`);
    if (d.fit) console.log(`On the shaft: ${d.fit}`);
    if (d.gearing) console.log(`Through the gears: ${d.gearing.says}`);
    for (const v of d.teeth) console.log(`Strength: ${v.says}`);
    console.log(`Turning: ${load.says} at ${outId}`);
    for (const f of d.rig.faults) console.log(`  REFUSED: ${f}`);
    console.log('');
    console.log(`  ${d.settled.says}`);
    if (!d.settled.stalled) {
      const seconds = flag('seconds', 1), s = spinUp(d.rig, seconds, 12);
      console.log('');
      console.log(`Coming up to speed over ${seconds} s (${(s.rise * 1000).toFixed(0)} ms to 63% of it):`);
      console.log(`      time        ${driverId.padStart(10)} ${outId.padStart(10)}        amps`);
      for (let i = 0; i <= 12; i++)
        console.log(`  ${`${s.t[i]!.toFixed(3)}s`.padStart(8)}   ${`${s.rpm[i]!.toFixed(0)} rpm`.padStart(12)} ${`${s.outRpm[i]!.toFixed(0)} rpm`.padStart(12)}  ${s.current[i] === null ? '' : `${s.current[i]!.toFixed(2)} A`.padStart(10)}`);
      console.log('');
      console.log(`Nothing above was typed in: change one tooth count and every number on this page moves.`);
    }
  }
}

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

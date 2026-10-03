// What a tick costs (rule R15). The headset gives physics 11.1 ms a tick at 90 Hz on a phone-class CPU, and a walking
// dog of 21 parts once took more than half of that on a desktop. Each figure here is a ratio to a fixed workload run
// on the same machine in the same moment, so a slower or busier runner moves both alike; the limits sit well above
// what is measured now, so only a real regression (a hot path allocating again, a solver pass gone quadratic) fails.

import { expect, it } from 'vitest';
import { rig } from './helpers';
import { buildWalker, WALKERS } from '../../src/world/creature';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { getMaterial, MATERIALS } from '../../src/data/materials';

const materials = Object.fromEntries(MATERIALS.map((m) => [m.id, m]));

/** A fixed workload of the kind a tick is made of: arithmetic over small arrays. Its time in ms on this machine. */
function yardstick(): number {
  const t = performance.now();
  const a = new Float64Array(4096);
  let acc = 0;
  for (let k = 0; k < 300; k++) {
    for (let i = 0; i < a.length; i++) {
      a[i] = Math.sqrt(a[i]! + i * 1e-3) * 0.999;
      acc += a[i]!;
    }
  }
  if (!Number.isFinite(acc)) throw new Error('yardstick broke');
  return performance.now() - t;
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]!;

async function dogs(n: number) {
  const r = await rig({}, true);
  const s = new DocStore(newDoc('budget'));
  for (let i = 0; i < n; i++) buildWalker(s, WALKERS['dog']!, [i * 0.6, 0, 0], 0, `d${i}`);
  for (const p of Object.values(s.doc.parts)) r.world.apply({ op: 'upsertPart', part: p, material: getMaterial(p.material), keepLivePose: false });
  for (const c of Object.values(s.doc.connections)) r.world.apply({ op: 'upsertConnection', conn: c, materials });
  for (let i = 0; i < 90; i++) r.world.step(); // standing up, then into its stride
  return r;
}

it('a walking dog costs less than a set number of yardsticks a tick, and four cost about four times one, not more', async () => {
  // both worlds alive at once and measured turn about, so whatever else the machine is doing falls on both alike, and
  // the ratio is the median of the pairs measured in the same moment (on one CI run, 2026-10-03, the medians of two
  // runs made one after the other read four dogs at 5.11 times one while the test files ran in parallel: a
  // measurement of the runner, not of the solver; the least of the runs was tried and swings with one lucky rep of
  // the small world, 7.25x then 2.73x, where the paired median read 3.31x then 3.73x)
  const worlds = [await dogs(1), await dogs(4)];
  const costs: number[][] = [[], []];
  for (let rep = 0; rep < 7; rep++) {
    for (const [k, r] of worlds.entries()) {
      const y = yardstick();
      const t = performance.now();
      for (let i = 0; i < 60; i++) r.world.step();
      costs[k]!.push((performance.now() - t) / 60 / y);
    }
  }
  for (const r of worlds) r.done();
  const one = median(costs[0]!), four = median(costs[1]!);
  const paired = median(costs[1]!.map((c, i) => c / costs[0]![i]!));
  console.log(`tick budget: one dog ${one.toFixed(2)} yardsticks, four dogs ${four.toFixed(2)}; four to one ${paired.toFixed(2)}x by the median of pairs (${(four / one).toFixed(2)}x by the medians)`);
  expect(one).toBeLessThan(LIMIT_ONE);
  expect(paired).toBeLessThan(5);
}, 300000);

/**
 * One dog measured 1.55 to 1.61 yardsticks a tick when this was set (after the row solver stopped allocating per row:
 * about 2.2 before, by the dog's time then). Half as much again fails.
 */
const LIMIT_ONE = 2.4;

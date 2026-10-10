// What the workshop builds, built and programmed on the boards: a build is a pipeline of every step, done one after
// another in the workshop; a device set down runs its program, a pipeline of IF → THEN rules, through its own parts.

import { describe, expect, it } from 'vitest';
import { Cell, RECIPES, buildBoard, programBoard, type Recipe } from '../../src/nexus/machines/cell';
import { Devices, ROVER } from '../../src/nexus/machines/devices';
import { evaluate, triggerOf, triggersOf } from '../../src/nexus/substrate/flows';
import { nodesOf } from '../../src/nexus/substrate/boards';

const rover = RECIPES.find((r) => r.id === 'rover')!;
/** Run the cell until a promise settles: its result, or its error. */
async function settle<T>(c: Cell, p: Promise<T>, most = 200000): Promise<T> {
  let done = false, out: T | undefined, err: unknown; p.then((x) => { done = true; out = x; }, (e) => { done = true; err = e; });
  for (let k = 0; k < most && !done; k++) { c.step(0.05); if (k % 50 === 0) await Promise.resolve(); await Promise.resolve(); }
  if (err) throw err; if (!done) throw new Error('never settled'); return out as T;
}

describe('a build as a pipeline', () => {
  it('has a step for each part made, each part off the rack, the wiring, the upload, and setting it down, in order', () => {
    const b = buildBoard(rover), labels = nodesOf(b, 'pipeline').map((n) => n.label);
    expect(triggersOf(b)).toHaveLength(1);
    expect(labels).toEqual(expect.arrayContaining(['Print the chassis', 'The chassis to the plate', '2 × N20 gear motor', 'DRV8833 dual motor driver', 'Wire it', 'Upload its program', 'Set it down in the room']));
    expect(Object.values(b.nodes).map((n) => n.step?.what)).toEqual(expect.arrayContaining(['cell print chassis', 'cell take n20 2', 'cell wire rover', 'cell upload rover', 'cell release rover']));
  });
  it('is done step by step in the workshop: printed, taken, wired (and checked), uploaded, set down', async () => {
    const out: string[] = []; let released: Recipe | null = null;
    const c = new Cell({ released: (r) => { released = r; } }); c.speed = 600;
    out.push(await settle(c, c.printNow(rover.printed[0]!)));
    // wiring before every part is on the plate is refused, with what is missing
    await expect(settle(c, c.wire(rover))).rejects.toThrow(/Not on the plate yet: 2 × N20/);
    out.push(await settle(c, c.take('chassis')));
    for (const { id, n } of rover.parts) out.push(await settle(c, c.take(id, n)));
    out.push(await settle(c, c.wire(rover)), await settle(c, c.upload(rover)), c.release(rover));
    expect(out.join(' | ')).toMatch(/chassis printed .* on the plate.*Wired: .*draws up to .*Its program is on its controller.*set down in the room/);
    expect(released).toBe(rover);
  });
  it('a recipe that would burn its controller is not wired: motors with no driver', async () => {
    const bad: Recipe = { ...rover, id: 'bad', parts: rover.parts.filter((p) => p.id !== 'drv8833') };
    const c = new Cell(); c.speed = 600; c.plate.push('chassis', ...bad.parts.flatMap(({ id, n }) => Array(n).fill(id)));
    await expect(settle(c, c.wire(bad))).rejects.toThrow(/no driver/);
  });
});

describe('a device runs its program', () => {
  it("the rover's program is a pipeline of rules on its own readings, armed and quick to answer", () => {
    const p = programBoard(rover)!; expect(p.armed).toBe(true); expect(p.cooldown).toBeLessThan(5000);
    const t = triggersOf(p).map((x) => triggerOf(x.step.what)!).find((x) => x.cond?.includes('rover_distance < 300'))!;
    expect(evaluate(t.cond!, { rover_distance: 250 }, '')).toMatchObject({ ok: true });
  });
  it('driven at a wall by its rules it turns away, never touching; its firmware stops it short regardless', () => {
    const ds = new Devices(), d = ds.spawn('rover', 'little rover', 0, 0, 0);
    // a wall across the room at z = -1.5; the sensor sees it straight ahead, and nothing when turned away
    const look = (_x: number, z: number, h: number) => { const dz = -Math.cos(h); if (dz >= 0) return null; const t = (z - 0.055 * Math.cos(h) + 1.5) / -dz; return t > 0 && t < 4 ? t : null; };
    let was = { near: false, clear: false }, closest = Infinity, turned = 0;
    ds.command(d, 'forward 0.25');
    for (let k = 0; k < 4000; k++) {
      ds.step(0.01, look); const mm = d.read.distance!; closest = Math.min(closest, mm);
      // its two rules, as the board runs them: each the moment its condition turns true
      const near = mm < 300, clear = mm > 500;
      if (near && !was.near) { ds.command(d, 'turn 100'); turned++; } if (clear && !was.clear) ds.command(d, 'forward 0.25');
      was = { near, clear };
    }
    expect(turned).toBeGreaterThanOrEqual(1); expect(closest).toBeGreaterThan(ROVER.stop); expect(d.z).toBeGreaterThan(-1.5);
    const blind = ds.spawn('rover', 'blind rover', 0, 0, 0); ds.command(blind, 'forward 0.4');
    for (let k = 0; k < 2000; k++) ds.step(0.01, look);
    expect(blind.read.distance).toBeGreaterThanOrEqual(ROVER.range[0]); expect(blind.z).toBeGreaterThan(-1.5); expect(blind.doing).toMatch(/stopped short/);
  });
});

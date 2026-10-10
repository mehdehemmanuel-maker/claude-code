// The warehouse robots: ways round the lanes, never two on one marker, a battery that sends them to charge, sleep when
// told, builds carried between the table and the shelves, and their rules as a pipeline the flow engine reads.

import { describe, expect, it } from 'vitest';
import { BATTERY, Fleet, boardOfBot, factName, renameOnBoard, route, warehouseFloor } from '../../src/nexus/machines/fleet';
import { evaluate, triggerOf, triggersOf } from '../../src/nexus/substrate/flows';

const seeded = (s = 7) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
const run = (f: Fleet, secs: number, dt = 0.05, each?: () => void) => { for (let t = 0; t < secs; t += dt) { f.step(dt); each?.(); } };

describe('the warehouse floor', () => {
  it('has a way from every marker to every other, and from the docks out to the table', () => {
    const f = warehouseFloor(), ids = [...f.spots.keys()];
    for (const a of ids) for (const b of ids) expect(route(f, a, b), `${a} → ${b}`).not.toBeNull();
    expect(route(f, 'dock1', 'table')).toEqual(expect.arrayContaining(['door', 'out', 'aisle', 'table']));
    expect(f.slots).toHaveLength(36);
  });
});

describe('robots at work', () => {
  it('idle a while, their rule has them choose work; they move, never two on one marker', () => {
    const f = new Fleet({}, undefined, seeded());
    let clash = 0, moved = 0; const x0 = f.bots.map((b) => [b.x, b.z]);
    run(f, 240, 0.05, () => {
      // the rule each starts with: IF idle over 20 s THEN do something it can
      for (const b of f.bots) if (b.idleFor > 20) f.command(b, 'something');
      const at = f.bots.map((b) => b.spot); if (new Set(at).size < at.length) clash++;
      for (let i = 0; i < f.bots.length; i++) for (let j = i + 1; j < f.bots.length; j++) if (Math.hypot(f.bots[i]!.x - f.bots[j]!.x, f.bots[i]!.z - f.bots[j]!.z) < 0.3) clash++;
    });
    f.bots.forEach((b, i) => { if (Math.hypot(b.x - x0[i]![0]!, b.z - x0[i]![1]!) > 0.1 || b.log.length > 2) moved++; });
    expect(clash).toBe(0); expect(moved).toBe(3);
    expect(f.bots.flatMap((b) => b.log.map((l) => l.text)).join(' ')).toMatch(/done/);
  });
  it('a low battery sends it to a dock to charge, and below the reflex level it goes whatever it was doing', () => {
    const f = new Fleet({}, undefined, seeded()), b = f.bots[0]!;
    b.battery = BATTERY.low - 1; f.command(b, 'something');
    expect(b.task?.kind).toBe('charge');
    run(f, 120); expect(b.battery).toBeGreaterThan(BATTERY.low);
    const c = f.bots[1]!; f.command(c, 'patrol'); c.battery = BATTERY.reflex - 1; f.step(0.05); expect(c.task?.kind).toBe('charge');
  });
  it('told to sleep it parks on a dock and stays, until woken', () => {
    const f = new Fleet({}, undefined, seeded()), b = f.bots[2]!;
    f.command(b, 'wander'); run(f, 10); expect(f.command(b, 'sleep')).toMatch(/sleep/);
    run(f, 60); expect(b.asleep).toBe(true); expect(b.spot).toMatch(/^dock/);
    const at = b.spot; run(f, 60); expect(b.spot).toBe(at);
    expect(f.command(b, 'wake')).toMatch(/wakes/); expect(b.asleep).toBe(false);
  });
  it('a build at the table is taken to a shelf, and brought back to the table when asked for', () => {
    const got: string[] = [];
    const f = new Fleet({ stored: (id, s) => got.push(`stored ${id} on ${s.id}`), arrived: (id) => got.push(`arrived ${id}`) }, undefined, seeded());
    f.waiting.push('build-1'); const b = f.bots[0]!;
    expect(f.command(b, 'store')).toMatch(/takes the build in/);
    run(f, 120); expect(got[0]).toMatch(/^stored build-1 on /);
    expect(f.floor.slots.filter((s) => s.holds === 'build-1')).toHaveLength(1);
    expect(f.fetch(b, 'build-1')).toMatch(/brings the build/);
    run(f, 120); expect(got).toContain('arrived build-1');
  });
  it('says what it cannot do, and why', () => {
    const f = new Fleet({}, undefined, seeded());
    expect(f.command(f.bots[0]!, 'dance')).toMatch(/cannot dance/);
    expect(f.command(f.bots[0]!, 'juggle')).toMatch(/does not know/);
  });
});

describe('a robot\'s rules are a pipeline', () => {
  it('each rule is a trigger flowing to its action, read by the flow engine against the fleet\'s numbers', () => {
    const f = new Fleet({}, undefined, seeded()), b = f.bots[0]!, board = boardOfBot(b);
    expect(board.armed).toBe(true); expect(board.title).toBe("Rex's rules");
    const ts = triggersOf(board); expect(ts.length).toBeGreaterThanOrEqual(3);
    const low = ts.find((t) => /battery/.test(t.step.what))!, c = triggerOf(low.step.what)!;
    expect(c.kind).toBe('cond');
    b.battery = 50; expect(evaluate(c.cond!, f.facts(), '')).toMatchObject({ ok: false });
    b.battery = 10; expect(evaluate(c.cond!, f.facts(), '')).toMatchObject({ ok: true });
  });
  it('renamed, its rules read the new name', () => {
    const f = new Fleet({}, undefined, seeded()), b = f.bots[1]!, board = boardOfBot(b);
    const r = renameOnBoard(board, 'Juno', 'Big Blue');
    expect(r.title).toBe("Big Blue's rules");
    expect(Object.values(r.nodes).map((n) => n.step?.what).join(' ')).toMatch(/big_blue_battery < 25.*robot big_blue charge/);
    expect(factName('Big Blue')).toBe('big_blue');
  });
});

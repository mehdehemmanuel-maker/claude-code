// Ego's test stand: she designs, builds on her bench, tests in a world of its own with the same physics, fixes what
// failed and tests again; what she learns she keeps. And what she hands over comes with how to build it for real.

import { describe, expect, it } from 'vitest';
import { jolt } from './helpers';
import { PhysicsWorld } from '../../src/physics/world';
import { runStand, type StandSetup } from '../../src/physics/stand';
import { prove, StandMemory, PROOF } from '../../src/assistant/prove';
import { newDoc } from '../../src/doc/commands';

const memory = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };

async function stand() {
  const J = await jolt();
  return async (s: StandSetup) => { const w = new PhysicsWorld(J, s.sim); try { return runStand(w, s); } finally { w.destroy(); } };
}
const sim = { ...newDoc().sim, airDrag: false };

describe('test stand', () => {
  it('a table pushed sideways racks without aprons: she adds them, proves it at 1.5x, and remembers', async () => {
    const s = await stand(), mem = new StandMemory(memory());
    const p = await prove({ what: 'table', load: 60 }, 0, 2, 't-', sim, s, mem);
    expect(p.held).toBe(true);
    expect(p.anchor).toBe(false);
    expect(p.attempts.length).toBe(2);
    expect(p.attempts[1]!.changes.join(' ')).toMatch(/aprons/);
    expect(p.learned.join(' ')).toMatch(/needs aprons/);
    expect(p.story[1]).toMatch(new RegExp(`proof test at ${PROOF}x: 90 kg on it, pushed sideways with 450 N`));
    expect(p.fragment.parts.filter((x) => /apron/.test(x.name))).toHaveLength(4);
    // the next table starts with what the last one taught her: aprons from the first test
    const again = await prove({ what: 'table', load: 60 }, 0, 2, 'u-', sim, s, mem);
    expect(again.attempts.length).toBe(1);
    expect(again.held).toBe(true);
    // and it comes with how to build it: every part from stock, every joint's hardware, tested, nothing unbuildable
    expect(p.sheet.problems).toEqual([]);
    expect(p.sheet.assemblies).toHaveLength(1);
    expect(p.sheet.assemblies[0]!.parts).toHaveLength(9);
    expect(p.sheet.assemblies[0]!.joints.every((j) => j.tested)).toBe(true);
    expect(p.sheet.buy.some((b) => /2x2 Douglas-fir/.test(b))).toBe(true);
    expect(p.sheet.steps.some((x) => /through t-top \(18 mm\) into t-leg\d's end grain/.test(x))).toBe(true);
  }, 60000);

  it('a tall shelf strong enough to hold its load tips when pushed: she says to anchor it, not to re-make it', async () => {
    const p = await prove({ what: 'shelf', load: 20 }, 0, 2, 's-', sim, await stand(), new StandMemory(memory()));
    expect(p.held).toBe(true);
    expect(p.anchor).toBe(true);
    expect(p.story.join(' ')).toMatch(/tipped over in one piece.*anchor it to the wall/);
  }, 60000);

  it('a test ends once everything is still: no more seconds than it takes', async () => {
    const p = await prove({ what: 'crate' }, 0, 2, 'c-', sim, await stand(), new StandMemory(memory()));
    expect(p.held).toBe(true);
    expect(p.attempts[0]!.result.seconds).toBeLessThan(3);
  }, 60000);
});

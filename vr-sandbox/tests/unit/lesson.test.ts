// Lessons that check what you do: any design becomes the steps of building it yourself, each done only when done in
// your world.

import { describe, expect, it } from 'vitest';
import { Bench } from '../../src/app/bench';
import { BuildHost } from '../../src/forge/apphost';
import { run } from '../../src/forge/forge';
import { design } from '../../src/assistant/designer';
import { advance, guideOf, lessonFrom } from '../../src/assistant/lesson';

const sim = { gravity: [0, -9.80665, 0] as [number, number, number], airDensity: 1.2, airDrag: false, fluids: [], cureClock: 0, magnetism: true };

describe('a lesson from a design', () => {
  it('a table becomes its parts to place, its joints to make and a test, and each is done only when done', () => {
    const plan = design({ what: 'table', load: 20 }, 0, -1.5, 't-');
    const l = lessonFrom('a table', plan.forge, sim);
    const places = l.steps.filter((s) => s.do === 'place'), joins = l.steps.filter((s) => s.do === 'join');
    expect(places.length).toBe(plan.parts);
    expect(joins.length).toBeGreaterThan(0);
    expect(l.steps.at(-1)!.do).toBe('test');
    // your world, empty: nothing done yet, and the guide shows the first part
    const you = new Bench(sim);
    expect(advance(you, l, false, 0).done).toEqual([]);
    expect(guideOf(l)!.kind).toBe((places[0] as any).target.kind);
  });

  it('a part placed wrong does not count; placed on its guide it does; built whole and played, the lesson is done', () => {
    const plan = design({ what: 'table', load: 20 }, 0, -1.5, 't-');
    const l = lessonFrom('a table', plan.forge, sim);
    const you = new Bench(sim);
    const host = new BuildHost(you);
    // the first part, but two metres off its guide (and clear of where the table goes: a part left in the way would
    // stop the build, as two solids cannot share space)
    const first = (l.steps[0] as any).target;
    host.place(first.kind, first.params, first.material, [first.pose.p[0] + 2, first.pose.p[1], first.pose.p[2]], [], undefined);
    expect(advance(you, l, false, 0).done.length).toBe(0);
    // now built as the design says (by the same Forge, into your world)
    const r = run(plan.forge, host);
    expect(r.ok).toBe(true);
    const p = advance(you, l, false, 0);
    // every place and join done; the test waits for play
    expect(p.now!.do).toBe('test');
    expect(advance(you, l, true, 10).finished).toBe(false);
    expect(advance(you, l, true, 13.1).finished).toBe(true);
  });
});

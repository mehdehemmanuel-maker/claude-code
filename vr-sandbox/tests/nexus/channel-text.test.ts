// The text channel (src/nexus/channel-text.ts): lines in, the state's changes and gaps out. What it shows is read
// from the state, never written for a case: what a gap bears on, what nothing in the state holds or derives, and
// WHY as the graph a derivation is, each shared part once.

import { describe, expect, it } from 'vitest';
import { answer, project, read } from '../../src/nexus/channel-text';
import { MemorySink } from '../../src/nexus/journal';
import { Runtime } from '../../src/nexus/runtime';

const lines = [
  '{"gravity": {"value": 9.80665, "direction": [0, -1, 0], "by": "the headset\'s floor estimate"}}',
  '{"place": {"id": "the floor", "centre": [0, -0.05, 0], "turn": [0, 0, 0, 1], "half": [5, 0.05, 5]}}',
  '{"held": {"place": "the floor", "by": "the headset: what it measured as the floor is the ground"}}',
  '{"place": {"id": "block A", "centre": [-0.4, 0.2, 0], "turn": [0, 0, 0, 1], "half": [0.05, 0.2, 0.2]}}',
  '{"place": {"id": "block B", "centre": [0.4, 0.2, 0], "turn": [0, 0, 0, 1], "half": [0.05, 0.2, 0.2]}}',
  '{"place": {"id": "a board", "centre": [0, 0.492, 0], "turn": [0, 0, 0, 1], "half": [0.5, 0.092, 0.019]}}',
  ...['block A', 'block B', 'a board'].map((p) => `{"measure": {"at": "${p}/density of its matter", "name": "density of Douglas-fir", "value": 530, "unit": "kg/m^3", "by": "USDA Wood Handbook"}}`),
];
function feed(rt: Runtime, ls: string[]): string[] {
  return ls.flatMap((l) => { const m = read(l); return 'contribution' in m ? project(rt, rt.admit(m.contribution)) : 'contributions' in m ? m.contributions.flatMap((c) => project(rt, rt.admit(c))) : answer(rt, m); });
}

describe('the text channel shows what the state holds, what it lacks and what that lack bears on', () => {
  it('a want named at an address nothing holds or derives says so, and shows what the place holds in the unit it reads', () => {
    const rt = Runtime.open(new MemorySink());
    feed(rt, lines);
    const out = feed(rt, ['{"want": {"at": "a board/bending stress at its outermost fibre", "most": {"name": "half the fir\'s modulus of rupture", "value": 42.5e6, "unit": "Pa"}, "says": "within half its strength"}}']);
    const gap = out.find((l) => l.includes('"within half its strength"'))!;
    expect(gap).toContain('a board/bending stress at its outermost fibre (nothing holds or derives it; a board holds in Pa: a board/largest bending stress between its contacts, from its own weight)');
  });

  it('the lacks nothing waits on are counted, not listed, until all are asked for', () => {
    const rt = Runtime.open(new MemorySink());
    feed(rt, lines);
    const some = answer(rt, { ask: 'gaps', all: false }), all = answer(rt, { ask: 'gaps', all: true });
    // the floor is held, so its matter is unknown and bears on nothing: its mass and weight
    expect(some).toEqual(['     2 more bear on no constraint (the floor: 2); {"gaps": "all"} lists them']);
    expect(all.length).toBe(2);
    expect(all.every((l) => l.startsWith('gap  the floor/'))).toBe(true);
  });

  it('WHY shows a part several inputs rest on once: the board\'s stress names each leaf in full once, then refers back', () => {
    const rt = Runtime.open(new MemorySink());
    feed(rt, lines);
    const why = answer(rt, { ask: 'why', at: 'a board/largest bending stress between its contacts, from its own weight' });
    const full = why.filter((l) => / = .*← given/.test(l)).map((l) => l.replace(/^[\s\w:]*?: (?=[a-z])/, ''));
    expect(new Set(full).size).toBe(full.length);
    expect(why.some((l) => l.includes('and, shown above:'))).toBe(true);
    expect(why.length).toBeLessThan(40);
  });
});

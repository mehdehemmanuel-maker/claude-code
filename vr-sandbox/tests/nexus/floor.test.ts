// The works' floor plan: where each station stands, how big the room has to be, and what must not be next to what.
// Every number here is the layout's own arithmetic, so a change to a station's floor area or its services moves the
// plan rather than the test.
import { describe, expect, it } from 'vitest';
import { footprint, layWorks } from '../../src/nexus/works/floor';
import { under3K } from '../../src/nexus/works/budget';
import { stationById, STATIONS } from '../../src/nexus/works/stations';
import type { Stood } from '../../src/nexus/works/floor';
import { COMPOSED, stationCard } from '../../src/nexus/view/works-room';
import { composeMachine } from '../../src/nexus/ask/machine';

describe('the works on the floor', () => {
  it('every station stands on its own floor area, wider than deep and never a corridor', () => {
    for (const s of STATIONS) {
      const [w, d] = footprint(s);
      expect(w * d, s.id).toBeCloseTo(s.floor, 1);
      expect(w, s.id).toBeGreaterThanOrEqual(d);          // a machine is reached across, not walked into
      expect(w / d, s.id).toBeLessThanOrEqual(2.9);       // and a 6 m² forge is a zone, not a five-metre bench
    }
  });

  it('what burns or fumes is on the outside wall, and nothing else is', () => {
    const f = layWorks(under3K().ids);
    const wall = f.stood.filter((s) => s.wall).map((s) => s.id);
    expect(wall).toContain('forge'); expect(wall).toContain('foundry'); expect(wall).toContain('welder');
    expect(wall).not.toContain('bench'); expect(wall).not.toContain('measuring');
    // and they are the first rows: the wall is where you walk in, not something to cross the room for
    for (const s of f.stood) if (s.wall) expect(s.row, s.id).toBeLessThan(Math.max(...f.stood.filter((x) => !x.wall).map((x) => x.row)));
    expect(f.faults, 'the plan finds nothing wrong with itself').toEqual([]);
  });

  it('the room is the stations plus the aisles, and says so', () => {
    const f = layWorks(under3K().ids);
    expect(f.used).toBeCloseTo(f.stood.reduce((a, s) => a + stationById(s.id).floor, 0), 1);
    expect(f.area).toBeGreaterThan(f.used);               // there are aisles
    expect(f.area).toBeLessThan(f.used * 2.2);            // and not a hangar
    expect(f.room[0]).toBeGreaterThan(4);
    for (const s of f.stood) {
      expect(s.at[0] - s.size[0] / 2, s.id).toBeGreaterThanOrEqual(-0.01);   // inside the room
      expect(s.at[0] + s.size[0] / 2, s.id).toBeLessThanOrEqual(f.room[0] + 0.01);
      expect(s.h, s.id).toBeGreaterThan(0.5);
    }
    expect(f.services).toContain('power');
    expect(f.says).toMatch(/m² of floor/);
  });

  it('nothing overlaps anything else', () => {
    const f = layWorks(under3K().ids);
    for (let i = 0; i < f.stood.length; i++) for (let j = i + 1; j < f.stood.length; j++) {
      const a = f.stood[i]!, b = f.stood[j]!;
      const apart = Math.abs(a.at[0] - b.at[0]) >= (a.size[0] + b.size[0]) / 2 - 0.001 || Math.abs(a.at[1] - b.at[1]) >= (a.size[1] + b.size[1]) / 2 - 0.001;
      expect(apart, `${a.id} and ${b.id} overlap`).toBe(true);
    }
  });

  it('a surface plate is kept away from sparks, and says so when it is not', () => {
    // (the rule fires where the room itself puts them together: the welder is sent to the outside wall, which is far
    //  enough on its own, but a benchtop CNC is not, and in a narrow room it ends up beside the plate)
    const tight = layWorks(['bench', 'measuring', 'cnc-benchtop'], { width: 4 });
    expect(tight.faults.some((x) => /surface plate/.test(x)), tight.faults.join(' | ') || 'no faults').toBe(true);
    // and it does not fire in the works as laid out, because the wall rule has already separated them
    expect(layWorks(under3K().ids).faults).toEqual([]);
  });
});

describe('what the room stands, and what it admits it has not got', () => {
  // (the room said "1 of them is drawn… the rest stand as a stand-in" while four were real. A sentence that goes stale
  //  the moment the room gets better at its job has to be derived from what is standing, and a card that says "not
  //  drawn yet" over a composed machine is the same fault one level down.)
  it('each card says which of the three it is, and never the wrong one', () => {
    const s: Stood = { id: 'cnc-benchtop', name: 'a benchtop CNC', at: [1, 1], size: [1.4, 1.4], h: 1.35, wall: false, needs: ['power'], row: 0 };
    expect(stationCard(s, 'model').join(' ')).not.toMatch(/not drawn yet|composed here/);
    expect(stationCard(s, 'composed').join(' ')).toMatch(/composed here out of library parts/);
    expect(stationCard(s, 'composed').join(' ')).not.toMatch(/not drawn yet/);
    expect(stationCard(s, 'stand-in').join(' ')).toMatch(/not drawn yet/);
  });
  it('every station the room composes really composes, with no part the library cannot draw', () => {
    for (const [id, words] of Object.entries(COMPOSED)) {
      const m = composeMachine(words);
      expect(m.gaps, `${id}: ${words}`).toEqual([]);
      expect(m.stages.length, id).toBeGreaterThan(2);
    }
  });
  it('a composed station is sized from that station\'s own envelope, not from a guess', () => {
    for (const [id, words] of Object.entries(COMPOSED)) {
      const st = stationById(id), m = composeMachine(words);
      if (!st.envelope) continue;
      expect(m.reach[0], id).toBe(st.envelope[0]);
    }
  });
});

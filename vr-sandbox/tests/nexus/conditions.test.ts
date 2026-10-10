// The conditions read from asks written by testers who knew nothing of how they are read (wave 8): what each must hold,
// where, held by what, how far, and the limits said, whatever the thing is called.

import { describe, expect, it } from 'vitest';
import { readConditions } from '../../src/nexus/ask/conditions';

const kg = (N: number) => +(N / 9.80665).toFixed(1);

describe('the conditions an ask sets, read from what it says', () => {
  it('an arm clamped to a post, held out to a lamp: the post and its width, the reach, the load, the sag said', () => {
    const c = readConditions("need an arm that clamps onto the 32 mm round post of my stereo microscope and sticks out 150 mm sideways to hold a 40 g gooseneck LED head over the stage. tip can't droop more than 0.5 mm and it shouldnt shake when the fridge compressor kicks in on the same bench")!;
    expect(c.hold).toMatchObject({ kind: 'line', along: 'y', dia: 0.032 });
    expect(c.out).toBeCloseTo(0.15, 6); expect(c.sagMax).toBeCloseTo(0.0005, 9);
    expect(kg(c.loads[0]!.N)).toBe(0); expect(c.loads[0]!.said).toBe('40 g');
    // a compressor "kicks in": no kick
    expect(c.dyn).toBe(1);
  });
  it('a bracket hung off a truss chord: its share of a wall split over four, a hard stop, its own weight said, the matter said', () => {
    const c = readConditions('need a clamp-on bracket to hang an LED wall cluster off the bottom chord of 290mm box truss (50mm tube), total wall is about 180kg split over 4 brackets, has to take the swing when the chain motors stop hard and a bit of side load from the wall catching air in an open-sided tent, aluminium if possible, each bracket under 6kg so i can carry it up a ladder one handed')!;
    expect(c.hold).toMatchObject({ kind: 'line', along: 'x', dia: 0.05 }); expect(c.drop).toBeCloseTo(0.3, 6);
    expect(kg(c.loads[0]!.N)).toBe(45); expect(c.dyn).toBe(2); expect(c.massMax).toBe(6); expect(c.matter).toBe('aluminum.6061-t6');
  });
  it('a carrier bolted out from a guard: a cow hitting it pushes it sideways; what it may weigh said in pounds', () => {
    const c = readConditions('need a calf carrier that bolts to the front brush guard of my 2018 ranger and sticks out 3-4 ft ahead so the cow can see and smell her calf while I drive slow to the calving barn. calf is 60-110 lb, wet and kicking. a mad 1400 lb cow will hit it with her head so it can\'t bend or rip the brush guard off. whole thing under 120 lb so I can pull it off alone');
    expect(c!.hold.kind).toBe('face'); expect(c!.out).toBeCloseTo(1.2192, 4);
    expect(c!.loads.find((l) => l.side)!.said).toMatch(/1400 lb pushing on it sideways/);
    expect(c!.massMax).toBeCloseTo(54.43, 1);
  });
  it('a walkway between two towers: the people who build it are no load, the people on it are', () => {
    const c = readConditions('walkway bridge between two scaffold towers 4.5m apart at 3m height for two followspot ops plus a 40kg spot each, needs handrails and toe boards, every piece under 25kg so it can be hauled up on a rope, 2 crew build it in 45 min with a ratchet and a hammer')!;
    expect(c.hold.kind).toBe('ends'); expect(c.span).toBe(4.5); expect(c.up).toBe(3); expect(c.partMax).toBe(25);
    expect(c.loads.reduce((a, l) => a + kg(l.N), 0)).toBe(240);
  });
  it('"call it 120 kg" is what it carries in all; pieces no longer than 1.5 m and no heavier than 9 kg', () => {
    const c = readConditions('portable footbridge for a side creek on a trek, gap is 4.5 m between rock banks with about 1 m height difference, takes one person at a time with a 25 kg pack so call it 120 kg plus bounce, breaks down into pieces no longer than 1.5 m and no heavier than 9 kg so two porters can carry it')!;
    expect(c.loads).toHaveLength(1); expect(kg(c.loads[0]!.N)).toBe(120); expect(c.dyn).toBe(2);
    expect(c.span).toBe(4.5); expect(c.pieceMax).toBe(1.5); expect(c.partMax).toBe(9); expect(c.up).toBeUndefined();
  });
  it('a windbreak on frozen ground: the wind on its 80% solid face is its load; what lifts it is a limit on its weight', () => {
    const c = readConditions('portable windbreak panels for my winter feeding ground, each one 24 ft long and 10 ft tall, about 80 percent solid with 1x6 rough boards. they sit on frozen ground so I can\'t dig or drive anything in. NW gusts hit 65 mph out here. has to be moved with the loader on my JD 4440 which lifts maybe 3000 lb at the forks')!;
    expect(c.hold.kind).toBe('ground'); expect(c.massMax).toBeCloseTo(1360.8, 0);
    const w = c.loads.find((l) => l.side)!; expect(w.said).toMatch(/80% solid/); expect(c.wind).toBeCloseTo(29.06, 1);
  });
  it('a roof over a plan: snow on the ground as it lies on an open roof (ASCE 7), its clear span kept clear, who is under it not on it', () => {
    const c = readConditions('open-sided timber market pavilion for our town square, 100 ft by 50 ft footprint, clear span of 40 ft down the center aisle with no columns, roof ridge no higher than 28 ft, sits on an existing 6 in concrete slab we can saw cut for new footings, design for 40 psf ground snow, 115 mph wind, glulam or local douglas fir, has to take 800 people packed in during the harvest festival plus string lights and banners hung off the beams at up to 25 lb every 10 ft')!;
    const cv = c.cover!; expect(cv.L).toBeCloseTo(30.48, 2); expect(cv.W).toBeCloseTo(15.24, 2); expect(cv.clear).toBeCloseTo(12.19, 2);
    // 0.7 Ce Ct Is pg: Ct 1.2 open to the air, Is 1.1 for more than 300 sheltered: 0.924 × 40 psf = 1.77 kPa
    expect(cv.p).toBeCloseTo(0.7 * 1.2 * 1.1 * 40 * 47.88, 0); expect(cv.pSaid).toMatch(/ASCE 7-16 eq\. 7\.3-1/);
    expect(c.up).toBeCloseTo(8.534, 3); expect(c.out).toBeUndefined(); expect(c.span).toBeUndefined();
    expect(c.loads.some((l) => l.who)).toBe(false); expect(c.heard.join(' ')).toMatch(/800 people .*under it, on the floor, not on it/);
    expect(c.loads.find((l) => l.perM)!.perM).toBeCloseTo((25 * 4.44822) / 3.048, 2);
    expect(c.hold).toMatchObject({ kind: 'ground', footings: true }); expect(c.matter).toBe('wood.douglas-fir'); expect(c.wind).toBeCloseTo(51.41, 1);
  });
  it('no load, or nothing holding it, or nothing between them: no conditions to grow from', () => {
    expect(readConditions('a gravity fed drip system for my orchard')).toBeNull();
    expect(readConditions('a 40 g lamp')).toBeNull();
  });
});

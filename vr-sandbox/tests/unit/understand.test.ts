// Every want means something: what it is made of here, what she does about it at once, and what she builds next. The
// asks people made (worlds, lessons, a life) are read like any other request; none is a script.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ASKS } from '../../src/assistant/asks';
import { CAPABILITIES, nextToBuild, understand } from '../../src/assistant/understand';

const of = (id: string) => understand(ASKS.find((a) => a.id === id)!.said);
const ids = (u: ReturnType<typeof understand>) => u.needs.map((n) => n.cap.id);

describe('understanding a want', () => {
  it('every capability she claims is backed by the code that does it; the rest say plainly they are not built', () => {
    for (const c of CAPABILITIES) {
      if (!c.by) continue;
      const [file, symbol] = c.by.split('#');
      expect(readFileSync(file!, 'utf8'), c.by).toContain(symbol!);
    }
    expect(new Set(CAPABILITIES.map((c) => c.id)).size).toBe(CAPABILITIES.length);
  });

  it('every ask is taken to at least two things it is made of, and says what she has and what is still to build', () => {
    for (const a of ASKS) {
      const u = understand(a.said);
      expect(u.needs.length, a.id).toBeGreaterThanOrEqual(2);
      expect(u.kinds.length, a.id).toBeGreaterThanOrEqual(1);
      expect(u.says, a.id).toMatch(/^You want to/);
    }
  });

  it('a beach is sand, sea, sky and the sound of waves: she grows the ground and its sea and takes you there; a mood is still to build', () => {
    const u = of('beach');
    expect(u.kinds).toContain('feel');
    expect(ids(u)).toEqual(expect.arrayContaining(['water', 'sky', 'sound', 'terrain']));
    expect(u.acts).toEqual([{ place: 'i just want to chill on a beach.' }]);
    expect(u.says).toMatch(/taken you to a sandy beach/);
    expect(u.toBuild).toEqual(['mood']);
    // where the ground can't be grown yet she doesn't pretend: no cavern, no sea floor
    expect(of('luminescent-forest').acts).toEqual([]);
    expect(of('atlantis').acts).toEqual([]);
  });

  it('acts at once where the world can: a zero-gravity cockpit with time slowed; a magnifying glass shrinks you', () => {
    expect(of('pilot-sim').acts).toEqual([{ command: 'gravity zero' }, { timeScale: 0.25 }]);
    expect(of('micro-galactic').acts).toEqual([{ playerScale: 0.1 }]);
  });

  it('reads what describes a thing as the thing, not as an order: floating text, giant mushrooms, family trees, beach balls', () => {
    expect(of('language-ghost').acts).toEqual([]);
    expect(of('luminescent-forest').acts).toEqual([]);
    expect(ids(of('chronicle-village'))).not.toContain('plants');
    expect(ids(of('chess-master'))).not.toContain('plants');
    expect(ids(of('chemistry-sandbox'))).not.toContain('water');
    expect(ids(of('glitch-desert'))).not.toContain('machines');
  });

  it('a request to be something is to become it; a world with broken physics is given other constants, not broken ones', () => {
    expect(of('dog').kinds).toEqual(['become']);
    // a dog's body is built (a walker); wearing one is not
    expect(of('dog').toBuild).toEqual(['avatar']);
    expect(of('dog').acts).toEqual([]);
    expect(of('glitch-desert').says).toMatch(/other constants/);
  });

  it('over everything asked, what to build next is ranked by how many wants call for it: with ground, lessons, swimmers and walkers built, characters', () => {
    const next = nextToBuild(ASKS.map((a) => a.said));
    for (const built of ['terrain', 'lessons', 'swimmers', 'walkers']) expect(next.map((n) => n.id)).not.toContain(built);
    expect(next[0]!.id).toBe('characters');
    expect(next.slice(1, 4).map((n) => n.id).sort()).toEqual(['creatures', 'overlay', 'plants']);
    expect(next.map((n) => n.id)).toContain('buildings');
  });
});

describe('what she hears', () => {
  it('frontier asks, scale asks and wants are read as such, and old requests keep their meaning', async () => {
    const { interpret } = await import('../../src/assistant/intent');
    expect(interpret('can you make an invisibility cloak')).toEqual({ do: 'frontier', which: 'cloak.invisible' });
    expect(interpret('blueprint for gravity boots')).toEqual({ do: 'frontier', which: 'boots.gravity' });
    expect(interpret('whats on your frontier')).toEqual({ do: 'frontier' });
    expect(interpret('where does kinetic energy break down')).toMatchObject({ do: 'scale', about: 'kinetic energy' });
    expect(interpret('I just want to chill on a beach')).toMatchObject({ do: 'want' });
    expect(interpret('spawn me in a simulation as a dog')).toMatchObject({ do: 'want' });
    expect(interpret('teach me chess')).toMatchObject({ do: 'want' });
    expect(interpret('back to the workshop')).toMatchObject({ do: 'want' });
    // unchanged
    expect(interpret('make a 40 mm sphere')).toMatchObject({ do: 'shape' });
    expect(interpret('build something that flies')).toEqual({ do: 'challenge', which: 'flight' });
    expect(interpret('place 4 steel blocks')).toMatchObject({ do: 'place', count: 4 });
    expect(interpret('make me a battery pack')?.do).not.toBe('frontier');
  });
});

describe('places', () => {
  it('a place is read from its words, its ground grown the same each time, standing you at the floor\'s height with the water below', async () => {
    const { heightfield, placeFromWords, groundAt, PLACES } = await import('../../src/world/place');
    const beach = placeFromWords('I just want to chill on a beach')!;
    expect(beach.id).toBe('beach');
    const a = heightfield(beach), b = heightfield(beach);
    expect(a.heights).toEqual(b.heights);
    expect(Math.abs(groundAt(a, 0, 0))).toBeLessThan(1e-6);
    expect(a.waterLevel!).toBeLessThan(0);
    // the beach face rises about 1 in 20 inland, and is under water out to sea
    expect(groundAt(a, 0, 20) - groundAt(a, 0, 0)).toBeGreaterThan(0.5);
    expect(groundAt(a, 0, beach.ground.shore - 15)).toBeLessThan(a.waterLevel!);
    // dunes: relief of metres, no water; night darkens the sky
    const desert = heightfield(placeFromWords('a desert')!);
    expect(desert.waterLevel).toBeNull();
    expect(desert.max - desert.min).toBeGreaterThan(2);
    expect(placeFromWords('a beach at night')!.sun.intensity).toBeLessThan(0.5);
    expect(placeFromWords('a table')).toBeNull();
    for (const [k, p] of Object.entries(PLACES)) expect(heightfield({ id: k, ...p }).heights.every(Number.isFinite), k).toBe(true);
  });
});

describe('swimmers', () => {
  it('a fish asked for in the sea is put there; one asked for on dry land is not', async () => {
    const { interpret } = await import('../../src/assistant/intent');
    expect(interpret('put a fish in the sea')).toMatchObject({ do: 'want' });
    // a sea to put it in first (she takes you to one), then the swimmer into it
    expect(understand('put a fish in the sea').acts).toEqual([{ place: 'put a fish in the sea' }, { swimmer: 'put a fish in the sea' }]);
    expect(understand('put a fish in the sea').says).toMatch(/swimming by its own rhythm/);
    expect(understand('a deer in the forest').acts.some((a) => 'swimmer' in a)).toBe(false);
    expect(understand('spawn me as a dog').toBuild).toContain('avatar');
  });
});

describe('walkers', () => {
  it('a dog or a deer asked for is put on the ground near you; one you want to be is a body to wear, not a walker', async () => {
    const { interpret } = await import('../../src/assistant/intent');
    for (const q of ['put a dog on the beach', 'build me a robot dog', 'add a deer', 'I want a dog']) {
      expect(interpret(q), q).toMatchObject({ do: 'want' });
      expect(understand(q).acts.some((a) => 'walker' in a), q).toBe(true);
    }
    expect(understand('put a dog on the beach').acts).toEqual([{ place: 'put a dog on the beach' }, { walker: 'put a dog on the beach' }]);
    expect(understand('add a deer').says).toMatch(/long-legged .* robot walker .* on the ground near you/);
    expect(understand('spawn me in a simulation as a dog').acts).toEqual([]);
    // sky-whales still wait on creatures that fly; the deer among them can be put there now
    const u = understand('Populate this empty forest with friendly, glowing sky-whales and neon deer.');
    expect(u.acts.some((a) => 'walker' in a)).toBe(true);
    expect(u.toBuild).toContain('creatures');
  });
});

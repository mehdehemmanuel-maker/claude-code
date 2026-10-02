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

  it('a beach is sand, sea, sky and the sound of waves; she has the water, sky and sound, and builds the ground next', () => {
    const u = of('beach');
    expect(u.kinds).toContain('feel');
    expect(ids(u)).toEqual(expect.arrayContaining(['water', 'sky', 'sound', 'terrain']));
    expect(u.toBuild).toContain('terrain');
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
    expect(of('dog').toBuild).toEqual(expect.arrayContaining(['avatar', 'creatures']));
    expect(of('glitch-desert').says).toMatch(/other constants/);
  });

  it('over everything asked, what to build next is ranked by how many wants call for it: the ground first', () => {
    const next = nextToBuild(ASKS.map((a) => a.said));
    expect(next[0]!.id).toBe('terrain');
    expect(next.map((n) => n.id)).toEqual(expect.arrayContaining(['lessons', 'creatures', 'characters', 'plants', 'overlay']));
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
    // unchanged
    expect(interpret('make a 40 mm sphere')).toMatchObject({ do: 'shape' });
    expect(interpret('build something that flies')).toEqual({ do: 'challenge', which: 'flight' });
    expect(interpret('place 4 steel blocks')).toMatchObject({ do: 'place', count: 4 });
    expect(interpret('make me a battery pack')?.do).not.toBe('frontier');
  });
});

// The build domain manifold (src/nexus/substrate/atlas.ts) and the census that grounds it (src/nexus/substrate/census.ts): one node however
// many domains name a term, carriers joining every domain, grounding only from builds that ran; and the laws the census
// found missing: fuel burns only where there is air, a push on light is not a rotor's, sunlight takes the area it takes,
// and a way offered beside the one taken is not a gap.

import { describe, expect, it } from 'vitest';
import { DOMAINS, atlasOf, involves, reach, termId } from '../../src/nexus/substrate/atlas';
import { quickAsks, runAsk, summarize } from '../../src/nexus/substrate/census';

describe('the build domain manifold', () => {
  const a = atlasOf();
  it('is one node for a term however many domains name it, and every term is about some carrier', () => {
    expect(DOMAINS.length).toBe(32);
    expect(a.terms.find((t) => t.id === 'battery')!.domains.sort()).toEqual(['chemical', 'electrical', 'energy']);
    expect(a.terms.find((t) => t.id === 'sensor')!.domains.length).toBeGreaterThanOrEqual(4);
    expect(a.terms.every((t) => t.involves.length > 0)).toBe(true);
    expect(termId('batteries')).toBe('battery'); expect(termId('gases')).toBe('gas'); expect(termId('robotics')).toBe('robotics');
  });
  it('joins domains through what they share, and every domain to others through the carriers', () => {
    expect(a.relations.some((r) => r.kind === 'shares' && r.because === 'both name batteries')).toBe(true);
    const r = reach(a, 'robotic arm')!;
    expect(r.acrossDomains.some((x) => x.terms.length > 0)).toBe(true);
    expect(involves('heat pump')).toContain('heat');
  });
  it('grounds a term only where a build ran: built from its ask, made as a part, else a gap', () => {
    const g = atlasOf([{ term: 'battery', how: 'part', by: 'a part of a cart' }]);
    expect(g.terms.find((t) => t.id === 'battery')!.grounded.how).toBe('part');
    expect(g.terms.find((t) => t.id === 'quantum computing')!.grounded.how).toBe('gap');
  });
});

describe('the census', () => {
  it('runs a slice of every kind and ranks what stops builds', () => {
    const asks = quickAsks().filter((x, i) => x.family !== 'term' || i % 40 === 0).filter((x) => x.family !== 'parts');
    const rs = asks.map(runAsk), s = summarize(rs);
    expect(rs.some((r) => r.status === 'built')).toBe(true);
    expect(rs.some((r) => r.status === 'unread')).toBe(true);
    expect(s.blockers.length).toBeGreaterThan(0);
    expect(s.blockers.every((b, i) => i === 0 || s.blockers[i - 1]!.count >= b.count)).toBe(true);
    expect(s.domains.length).toBe(32);
  }, 120000);
  it('burns fuel only where there is air to burn it with', () => {
    const cart = runAsk({ words: 'a cart on petrol that carries 50 kg at 8 km/h', family: 'carried' });
    expect(cart.status).toBe('built');
    expect(cart.partTerms).toContain('fuel');
    const sub = runAsk({ words: 'a submarine on petrol that carries 50 kg at 1 m/s', family: 'carried' });
    expect(sub.flaws!.some((f) => f.check === 'oxidiser')).toBe(true);
  }, 60000);
  it('does not fly a craft on rotors where it pushes on light, in a vacuum', () => {
    const r = runAsk({ words: 'a craft in a vacuum that carries 50 kg at 100 m/s', family: 'carried' });
    expect(r.status).toBe('unbuilt');
    expect(r.designer ?? '').not.toMatch(/air/);
  }, 60000);
  it('takes the panel area sunlight takes, and says where the top it has is short', () => {
    expect(runAsk({ words: 'a cart that runs on solar that carries 50 kg at 8 km/h', family: 'carried' }).status).toBe('built');
    const boat = runAsk({ words: 'a boat that runs on solar that carries 50 kg at 3 m/s', family: 'carried' });
    expect(boat.flaws!.some((f) => f.check === 'solar area')).toBe(true);
  }, 60000);
});

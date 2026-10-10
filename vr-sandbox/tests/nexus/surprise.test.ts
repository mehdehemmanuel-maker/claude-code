// Surprise me: every thing picked here is an ask the forge reads, and reads as what it is: a design the intent pipeline
// can read wants into, a product it shows, people it brings in. Claude's pick is used only as a plain ask.

import { describe, expect, it } from 'vitest';
import { checkSurprise, DESIGNS, OTHERS, surpriseHere, surprisePrompt } from '../../src/nexus/ask/surprise';
import { conceive } from '../../src/nexus/ask/conceive';
import { readPlain } from '../../src/nexus/substrate/directive';

const rng = (s: number) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

describe('a surprise picked here', () => {
  it('is always an ask the forge can carry out', () => {
    for (let s = 1; s <= 6; s++) for (const d of DESIGNS) {
      const w = d(rng(s)); expect(conceive(w).wants.length, w).toBeGreaterThan(0); expect(readPlain(`build ${w}`).directive.act, w).toBe('make');
    }
    for (const o of OTHERS) { const w = o(rng(3)); expect(['person', 'fight'], w).toContain(readPlain(w).directive.act); }
  });
  it('picks designs mostly, products and people sometimes, and differently each time', () => {
    const r = rng(7), kinds: Record<string, number> = {}, says = new Set<string>();
    for (let i = 0; i < 200; i++) { const s = surpriseHere(r, ['Cordless drill', 'Electric kettle']); kinds[s.kind] = (kinds[s.kind] ?? 0) + 1; says.add(s.say); }
    expect(kinds.design!).toBeGreaterThan(90); expect(kinds.product!).toBeGreaterThan(20); expect(kinds.people!).toBeGreaterThan(20); expect(says.size).toBeGreaterThan(100);
    expect(readPlain('show me a cordless drill').directive).toMatchObject({ act: 'make', what: 'cordless drill' });
  });
});
describe("Claude's pick", () => {
  it('is asked with what the forge does and what is in the room, and used only as a plain ask', () => {
    const q = surprisePrompt({ made: ['chair'], people: ['Kai'], products: ['Cordless drill'] }, ['build a shelf that holds 40 kg 1.2 m wide']);
    expect(q).toMatch(/chair/); expect(q).toMatch(/Kai/); expect(q).toMatch(/Cordless drill/); expect(q).toMatch(/JSON/);
    expect(checkSurprise({ say: 'build a bridge that carries 200 kg over 5 m' })).toBe('build a bridge that carries 200 kg over 5 m');
    for (const bad of [null, 'x', { say: 3 }, { say: '' }]) expect(checkSurprise(bad)).toBeNull();
  });
});

// An ask as data (src/nexus/spec.ts): any intent written as a spec and built back is the same ask to the generator.

import { describe, expect, it } from 'vitest';
import { car, house, printer } from '../../src/nexus/asked';
import { generate } from '../../src/nexus/manifold';
import { intentFromSpec, specOf } from '../../src/nexus/spec';

describe('an ask as data', () => {
  for (const [name, i] of [['printer', printer()], ['car', car()], ['house', house()]] as const) {
    it(`writes ${name} as a spec and builds it back to what the generator derives the same structure from`, () => {
      const spec = JSON.parse(JSON.stringify(specOf(i)));
      const { intent, problems } = intentFromSpec(spec);
      expect(problems).toEqual([]);
      const a = generate(i).elements.map((e) => e.id).sort(), b = generate(intent!).elements.map((e) => e.id).sort();
      expect(b).toEqual(a);
    });
  }
  it('says what cannot be built: a want about no region, a want with no bound, a region adjoining nothing that exists', () => {
    const { problems } = intentFromSpec({ name: 'x', regions: [{ id: 'a', adjoins: ['nowhere'] }], wants: [{ id: 'w', says: 'go', region: 'b', sym: 'v', unit: 'm/s', quantity: 'speed', when: 'on demand', lo: { name: 'v', value: 1, unit: 'm/s' } }, { id: 'u', says: 'stay', region: 'a', sym: 'T', unit: 'degC', quantity: 'temperature', when: 'always' }] });
    expect(problems.some((p) => /nowhere/.test(p))).toBe(true);
    expect(problems.some((p) => /not a region/.test(p))).toBe(true);
    expect(problems.some((p) => /no bound/.test(p))).toBe(true);
  });
});

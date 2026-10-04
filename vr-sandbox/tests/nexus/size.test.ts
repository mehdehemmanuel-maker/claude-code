// Systems from elements (src/nexus/size.ts): the generator's path for charge into the house states a least conductance
// and the heat it makes there; the element becomes a system (the wire's section and route, the carrier's laws, the
// insulation's limit), searched over the standard sections for the least conductor. Nothing here names a wire size.

import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../src/data/materials';
import { ofLeaf } from '../../src/nexus/evaluate';
import { generate } from '../../src/nexus/manifold';
import { shapeOf } from '../../src/nexus/shape';
import { routeAcross, sizeByDropAlone, sizeConductor } from '../../src/nexus/size';
import { leaf } from '../../src/nexus/term';
import { house } from './inventions';

const i = house();
const s = generate(i);
const e = s.elements.find((x) => x.id === 'path:charge:the grid->inside')!;
const sh = shapeOf(i.regions.find((r) => r.id === 'inside')!)!;
const route = routeAcross(sh.x, sh.z);
const copper = MATERIALS.find((m) => m.id === 'copper.c110')!;
const sigma = ofLeaf(leaf('conductivity of Copper C110', copper.conductivity, 'S/m', { class: 'measured', source: 'src/data/materials.ts' }));
const ambient = ofLeaf(i.wants.find((w) => w.id === 'warm')!.hi!);
const sized = sizeConductor(e, sigma, route, ambient);

describe('a path for charge, sized as a system', () => {
  it('the system is made of the element: the current its heat and least conductance imply, the route across the room it serves, the conductivity of the matter it named', () => {
    expect(e.values.find((v) => v.name.startsWith('made of'))!.name).toMatch(/Copper/);
    expect(sized.system.bindings['I']!.value).toBeCloseTo(10000 / 120, 6);
    expect(route.value).toBeCloseTo(Math.sqrt(2 * 120), 9);
    expect(sized.system.bindings['Ta']!.value).toBeCloseTo(273.15 + 24, 9);
  });

  it('the drop alone would choose 4 mm², where the conductor runs far hotter than its insulation allows: the element\'s own bound is not the one that binds', () => {
    expect(sizeByDropAlone(e, sigma, route, ambient).pick!.option.label).toBe('4 mm²');
    const at4 = sized.choice.candidates.find((c) => c.option.label === '4 mm²')!;
    expect(at4.unsatisfied).toEqual(['the conductor runs no hotter than its insulation allows']);
    expect(at4.solution.bound['Tc']!.value! - 273.15).toBeGreaterThan(200);
  });

  it('with its heat, the least standard section that keeps the conductor at or under its insulation\'s 70 °C is 16 mm²; 10 mm² is refused by the heat alone', () => {
    expect(sized.choice.pick!.option.label).toBe('16 mm²');
    expect(sized.choice.pick!.solution.bound['Tc']!.value! - 273.15).toBeLessThanOrEqual(70);
    expect(sized.choice.candidates.find((c) => c.option.label === '10 mm²')!.unsatisfied).toEqual(['the conductor runs no hotter than its insulation allows']);
  });

  it('every admissible section is at least the pick: the least conductor is the least that satisfies both bounds', () => {
    const admissible = sized.choice.manifold.map((c) => c.solution.bound['A']!.value!);
    expect(Math.min(...admissible)).toBeCloseTo(16e-6, 12);
  });
});

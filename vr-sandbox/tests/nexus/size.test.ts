// Systems from elements (src/nexus/size.ts): the generator's path for charge into the house states a least conductance
// and the heat it makes there; the element becomes a system (the wire's section and route, the carrier's laws, the
// insulation's limit), searched over the standard sections for the least conductor. Nothing here names a wire size.

import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../src/data/materials';
import { ofLeaf } from '../../src/nexus/evaluate';
import { generate } from '../../src/nexus/manifold';
import { shapeOf } from '../../src/nexus/shape';
import { routeAcross, sizeByDropAlone, sizeConductor, sizeMembers } from '../../src/nexus/size';
import { lumberCatalogue, materialLeaves } from '../../src/nexus/beam';
import { gravity } from '../../src/nexus/field';
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

describe('the members across a face, sized as a system: counts, spacing, section and the support lines between', () => {
  const members = s.elements.find((x) => x.id === 'members:inside:up')!;
  const snow = s.elements.find((x) => x.id === 'load:the sky->inside')!;
  const span = ofLeaf(leaf('span of the up face', members.values.find((v) => v.name === 'span')!.value, 'm', { class: 'configuration', source: 'the generator: members:inside:up' }));
  const load = ofLeaf(leaf('snow on the up face', snow.values.find((v) => v.unit === 'Pa')!.value, 'Pa', { class: 'configuration', source: 'the generator: load:the sky->inside' }));
  const r = sizeMembers(span, sh.x, load, materialLeaves('wood.douglas-fir'), gravity(), lumberCatalogue());
  const at = (k: number) => r.choice.candidates.filter((c) => c.option.leaves['k']!.value === k);

  it('no kept lumber spans the 10.95 m roof under its snow, nor with one support line: the stiffest clear span deflects ten times what is allowed', () => {
    expect(at(0).some((c) => c.admissible)).toBe(false);
    expect(at(1).some((c) => c.admissible)).toBe(false);
    expect(Math.min(...at(0).map((c) => c.solution.bound['del']!.value! / c.solution.bound['lim']!.value!))).toBeGreaterThan(10);
  });

  it('two support lines are the fewest that frame it, and of those the least timber is 2x8 on edge at 24 inches: 19 members, deflection binding, stress far within strength', () => {
    expect(r.choice.pick!.option.label).toBe('2x8 on edge at 24 in, 2 support lines');
    const b = r.choice.pick!.solution.bound;
    expect(b['n']!.value).toBe(19);
    expect(b['del']!.value! / b['lim']!.value!).toBeGreaterThan(0.7);
    expect(b['sig']!.value! / b['f']!.value!).toBeLessThan(0.2);
  });

  it('the count of members follows from the width and the spacing: the width over the spacing, rounded up, plus one', () => {
    for (const c of r.choice.candidates.slice(0, 6)) expect(c.option.leaves['n']!.value).toBe(Math.ceil(sh.x.value! / c.option.leaves['s']!.value! - 1e-9) + 1);
  });
});

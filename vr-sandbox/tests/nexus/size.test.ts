// Systems from elements (src/nexus/substrate/size.ts): the generator's path for charge into the house states a least conductance
// and the heat it makes there; the element becomes a system (the wire's section and route, the carrier's laws, the
// insulation's limit), searched over the standard sections for the least conductor. Nothing here names a wire size.

import { describe, expect, it } from 'vitest';
import { MATERIALS } from '../../src/data/materials';
import { ofLeaf } from '../../src/nexus/substrate/evaluate';
import { generate } from '../../src/nexus/substrate/manifold';
import { shapeOf } from '../../src/nexus/substrate/shape';
import { routeAcross, sizeByDropAlone, sizeConductor, sizeMembers } from '../../src/nexus/substrate/size';
import { lumberCatalogue, materialLeaves } from '../../src/nexus/substrate/beam';
import { gravity } from '../../src/nexus/substrate/field';
import { leaf } from '../../src/nexus/substrate/term';
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

  it('no kept lumber spans the 10.95 m roof under its snow clear: the stiffest clear span (2x12) deflects three times what is allowed; with one support line the 2x10 and 2x12 do', () => {
    expect(at(0).some((c) => c.admissible)).toBe(false);
    expect(Math.min(...at(0).map((c) => c.solution.bound['del']!.value! / c.solution.bound['lim']!.value!))).toBeGreaterThan(2.9);
    expect(at(1).filter((c) => c.admissible).map((c) => c.option.label).every((l) => /^2x1[02] /.test(l))).toBe(true);
  });

  // by hand: two bays of 5.477 m; 1400 Pa over 24 in is 853 N/m, and a 38 × 286 mm fir member's own 56.5 N/m; I = 7.41e-5
  // m⁴, E 13.4 GPa (Wood Handbook): δ = 5 w L⁴ / 384 E I = 10.7 mm against L / 360 = 15.2 mm; 19 members 10.95 m long, 1199 kg
  it('one support line is the fewest that frames it, and of those the least timber is 2x12 on edge at 24 inches: 19 members, deflection binding, stress far within strength', () => {
    expect(r.choice.pick!.option.label).toBe('2x12 on edge at 24 in, 1 support line');
    const b = r.choice.pick!.solution.bound;
    expect(b['n']!.value).toBe(19);
    expect(b['del']!.value! / b['lim']!.value!).toBeGreaterThan(0.7);
    expect(b['sig']!.value! / b['f']!.value!).toBeLessThan(0.2);
  });

  it('the count of members follows from the width and the spacing: the width over the spacing, rounded up, plus one', () => {
    for (const c of r.choice.candidates.slice(0, 6)) expect(c.option.leaves['n']!.value).toBe(Math.ceil(sh.x.value! / c.option.leaves['s']!.value! - 1e-9) + 1);
  });
});

describe('the generator sizes the members it generates, and what they weigh reaches the ground', () => {
  const el = (id: string) => s.elements.find((x) => x.id === id)!;
  const val = (id: string, name: string) => el(id).values.find((v) => v.name === name || v.name.startsWith(name))!;

  it('the roof\'s members come out as the space sized them by hand: Douglas-fir 2x12 on edge at 24 inches over one support line, the matter chosen, not given', () => {
    expect(val('members:inside:up', 'sized: ').name).toMatch(/^sized: Douglas-fir \(coast\) 2x12 on edge at 24 in, 1 support line/);
    expect(val('members:inside:up', 'members').value).toBe(19);
    // of the woods dressed to the kept sections, each sized alone at the fewest lines, the fir weighs least
    const up = el('members:inside:up');
    const one = (id: string) => sizeMembers(ofLeaf(leaf('span', val('members:inside:up', 'span').value, 'm', { class: 'configuration', source: 'the generator' })), sh.x, ofLeaf(leaf('snow', 1400, 'Pa', { class: 'configuration', source: 'the generator' })), materialLeaves(id), gravity(), lumberCatalogue()).choice.pick!;
    const masses = ['wood.douglas-fir', 'wood.southern-pine', 'wood.white-pine'].map((id) => one(id)).filter((c) => c.solution.bound['k']!.value === 1).map((c) => c.solution.bound['m']!.value!);
    expect(Math.min(...masses)).toBeCloseTo(up.values.find((v) => v.name.startsWith('sized: '))!.value, 6);
  });

  it('the force down on the ground now carries the sized members\' own weight; the floor\'s members are an alternative and are not counted', () => {
    const p = el('path:momentum:inside->the ground');
    const without = p.values.find((v) => v.name === 'force down, without the structure\'s own weight')!.value;
    const withIt = p.values.find((v) => v.name === 'force down, with the sized members\' own weight')!.value;
    const counted = ['members:inside:up', 'members:inside:side', 'supports:inside:up'].reduce((t, id) => t + val(id, 'sized: ').value, 0) * gravity().value!;
    expect(withIt - without).toBeCloseTo(counted, 6);
    expect(s.gaps.some((g) => /structure's own weight/.test(g.lacks))).toBe(false);
  });

  it('the down face touches the ground: it rests on it, borne by contact far within what the ground allows, or members span it carrying the people at the worst place', () => {
    expect(el('members:inside:down').oneOf).toBe('carrying the down face of inside');
    expect(el('rests:inside|the ground').oneOf).toBe('carrying the down face of inside');
    expect(val('rests:inside|the ground', 'weight per area where it rests').value / val('rests:inside|the ground', 'bearing pressure the ground allows').value).toBeLessThan(1e-3);
    expect(val('members:inside:down', 'weight resting on it at a place not stated').value).toBeCloseTo(300 * gravity().value!, 6);
  });

  it('what is not yet sized is named: the floor\'s support lines, for want of how far the floor is held above the ground, and the floor\'s members, for the lines that stand on them', () => {
    expect(s.gaps.some((g) => g.element === 'supports:inside:down' && /not yet sized, since how far the down face is held above what bears it is not stated/.test(g.lacks))).toBe(true);
    expect(s.gaps.some((g) => g.element === 'members:inside:down' && /the lines under the up face stand on the down face/.test(g.lacks))).toBe(true);
    expect(s.gaps.some((g) => g.element === 'supports:inside:up' || /buckling\) is not in the member system/.test(g.lacks))).toBe(false);
  });
});

describe('pressing along a length: the walls and the lines under the roof are sized against buckling', () => {
  const el = (id: string) => s.elements.find((x) => x.id === id)!;
  const val = (id: string, name: string) => el(id).values.find((v) => v.name === name || v.name.startsWith(name))!;
  const conf = (name: string, v: number, unit: string) => ofLeaf(leaf(name, v, unit, { class: 'configuration', source: 'the generator' }));
  const fir = materialLeaves('wood.douglas-fir');

  it('the walls\' members carry what the roof bears on them along their length; the 1x6 the wind alone chose is refused unbraced, and one row of blocking makes it hold', () => {
    const along = val('members:inside:side', 'load per length along the top of the walls').value;
    expect(val('members:inside:side', 'sized: ').name).toMatch(/^sized: Douglas-fir \(coast\) 1x6 on edge at 24 in, 0 support lines, 1 row of blocking/);
    expect(val('members:inside:side', 'force along each member').value).toBeCloseTo(along * 0.61, 6);
    expect(val('members:inside:side', 'force along each member, with the declared factor, over its least buckling load').value).toBeLessThanOrEqual(1);
    const walls = sizeMembers(conf('height', 2.5, 'm'), conf('perimeter', 4 * sh.x.value!, 'm'), conf('wind', 1000, 'Pa'), fir, gravity(), lumberCatalogue(), { loads: { along: conf('from the roof', along, 'N/m') }, runs: [sh.x.value!, sh.z.value!, sh.x.value!, sh.z.value!] });
    const unbraced = walls.choice.candidates.find((c) => c.option.label === '1x6 on edge at 24 in, 0 support lines')!;
    expect(unbraced.unsatisfied).toEqual(['each member pressed along its length stays below its buckling load between braces, over the declared factor']);
  });

  it('each line under the roof is a wall of its own, standing on the floor: its matter is chosen for it, white pine 1x4 at 12 inches with two rows of blocking (the one line carries half the roof), lighter than the fir would be', () => {
    expect(val('supports:inside:up', 'sized: ').name).toMatch(/^sized: Eastern white pine 1x4 on edge at 12 in, 0 support lines, 2 rows of blocking/);
    expect(val('supports:inside:up', 'force along each member').value).toBeCloseTo(val('supports:inside:up', 'load per length each line carries').value * 0.305, 6);
    const line = val('supports:inside:up', 'load per length each line carries').value, len = val('supports:inside:up', 'length of each line').value;
    const firOnly = sizeMembers(conf('height', 2.5, 'm'), conf('lines', 2 * len, 'm'), conf('none', 0, 'Pa'), fir, gravity(), lumberCatalogue(), { loads: { along: conf('the line', line, 'N/m') }, runs: [len, len] }).choice.pick!;
    expect(firOnly.solution.bound['m']!.value!).toBeGreaterThan(val('supports:inside:up', 'sized: ').value);
  });
});

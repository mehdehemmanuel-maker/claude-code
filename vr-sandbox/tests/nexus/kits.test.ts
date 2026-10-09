// Kits: makers of things whose kinds multiply, every part made of a material the inventory knows, every edge as it is
// made. The count of what there is is the product of every choice, times every kit used to the times it is used (a
// street's eight houses each any house): well past a trillion. The words pick the choices they name; the rest are drawn.
// Real sizes come out as their sources give them (a queen mattress 152 by 203 cm, a 225/45R18 tyre 659 mm across, a tree's
// trunk as thick as H^1.5 asks, a sandwich's energy from what is in it).

import { describe, expect, it } from 'vitest';
import { choose, countParts, KITS, kitById, kitFor, log10All, log10Kinds, makeKit, massOf, type Part } from '../../src/nexus/kits';
import { edgeRadius, ruleFor, setEdge, EDGE_RULES } from '../../src/nexus/finish';
import { INVENTORY } from '../../src/nexus/inventory';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
const rng = () => 0.5;

describe('what the kits make', () => {
  it('make well over a trillion different things, counted exactly', () => {
    expect(log10All()).toBeGreaterThan(12);
    expect(log10Kinds(kitById('house')!)).toBeGreaterThan(6); expect(log10Kinds(kitById('street')!)).toBeGreaterThan(60);
    for (const k of KITS) expect(log10Kinds(k), k.id).toBeGreaterThan(0);
  });
  it('makes every kit, its parts made of materials the inventory knows, with mass', () => {
    const known = new Set([...INVENTORY.values()].filter((i) => i.kind === 'material').map((i) => i.id));
    for (const k of KITS) for (const seed of [1, 2, 3]) {
      const { part } = makeKit(k, '', seed); expect(countParts(part), k.id).toBeGreaterThan(1);
      if (!['galaxy', 'solar system'].includes(k.id)) expect(massOf(part), k.id).toBeGreaterThan(0);
      for (const p of all(part)) if (p.mat && /^(steel|al-|copper|wood|glass|brick|concrete|granite|rubber|abs|pp|pc|pmma|nylon|cotton|cast-iron)/.test(p.mat)) expect(known.has(p.mat), `${k.id}: ${p.name} of ${p.mat}`).toBe(true);
    }
  }, 180_000); // (every kit at three seeds: the car alone is some 900 parts now; slow under load, not stuck)
  it('reads what is asked for into its choices', () => {
    expect(kitFor('a street with lamp posts')!.id).toBe('street'); expect(kitFor('a road with lamp posts')!.id).toBe('road'); expect(kitFor('a street scene at night')!.id).toBe('street'); expect(kitFor('a red sports car')!.id).toBe('car');
    expect(choose(kitById('car')!, 'a red sports car with 19 inch wheels', rng)).toMatchObject({ body: 'sports car', colour: 'red', rim: 19 });
    expect(choose(kitById('house')!, 'a 2 storey brick house with a hip roof and a garage', rng)).toMatchObject({ storeys: 2, walls: 'brick', roof: 'hip', garage: 'yes' });
    expect(choose(kitById('tree')!, 'a 20 m oak in autumn', rng)).toMatchObject({ species: 'oak', height: 20, season: 'autumn' });
    expect(choose(kitById('bed')!, 'a queen bed with 4 pillows', rng)).toMatchObject({ size: 'queen', pillows: 4 });
    for (const [t, id] of [['give me a lightsaber', 'lightsaber'], ['make me a sandwich', 'sandwich'], ['a pile of lego the size of a house', 'bricks'], ['a tiny solar system I can hold', 'solar system'], ['a treehouse with a slide', 'treehouse'], ['a katana', 'sword'], ['a spiral galaxy', 'galaxy'], ['a water gun', 'blaster']] as const) expect(kitFor(t)?.id, t).toBe(id);
  });
  it('comes out at real sizes', () => {
    const bed = makeKit(kitById('bed')!, 'a queen bed', 1).part, mattress = all(bed).find((p) => p.name === 'cover')!; expect(mattress.shape).toMatchObject({ box: [1.52, expect.any(Number), 2.03] });
    expect(makeKit(kitById('car')!, 'a sedan with 18 inch wheels', 1).part.says).toMatch(/R18, 6[0-9]{2} mm across/);
    const t20 = makeKit(kitById('tree')!, 'a 20 m oak', 1).part, trunk = all(t20).find((p) => p.name === 'trunk')!; expect((trunk.shape as { cyl: number[] }).cyl[2]! * 2).toBeCloseTo(0.006 * 20 ** 1.5, 6);
    const lego = makeKit(kitById('bricks')!, 'a pile of lego the size of a house', 1).part; expect(lego.name).toMatch(/\d{1,3}(,\d{3})+ toy bricks/);
    const sp = choose(kitById('sandwich')!, 'a cheese and ham sandwich on white bread', rng); expect(sp).toMatchObject({ a: 'cheese', b: 'ham', c: 'none', bread: 'white' });
    const s = makeKit(kitById('sandwich')!, 'a cheese and ham sandwich on white bread', 1).part; expect(s.says).toMatch(/about \d+ kcal/);
    const kcal = Number(/about (\d+) kcal/.exec(s.says!)![1]); expect(kcal).toBeGreaterThan(150); expect(kcal).toBeLessThan(700); // a cheese and ham sandwich, about 300–450 kcal (typical)
  });
});
describe('masses as real ones weigh', () => {
  it('weighs a tree, a car, its tyres and rims about as real ones do', () => {
    const oak = makeKit(kitById('tree')!, 'a 20 m oak in summer', 1).part; expect(massOf(oak) / 1000).toBeGreaterThan(1); expect(massOf(oak) / 1000).toBeLessThan(15); // a 20 m oak: a few tonnes (typical)
    for (const body of ['sedan', 'sports car', 'hatchback']) { const car = makeKit(kitById('car')!, `a petrol ${body}`, 2).part; expect(massOf(car), body).toBeGreaterThan(800); expect(massOf(car), body).toBeLessThan(2000); } // 1.1–1.6 t (typical)
    const car = makeKit(kitById('car')!, 'a sedan with 18 inch 5-spoke wheels', 3).part, tyre = all(car).find((p) => /^tyre/.test(p.name))!, rim = all(car).find((p) => /rim$/.test(p.name))!;
    expect(massOf(tyre)).toBeGreaterThan(6); expect(massOf(tyre)).toBeLessThan(16); expect(massOf({ ...rim, parts: [] })).toBeGreaterThan(5); expect(massOf({ ...rim, parts: [] })).toBeLessThan(16); // tyre 9–12 kg, alloy rim 9–12 kg (typical)
    const house = makeKit(kitById('house')!, 'a 2 storey brick house with a gable roof', 1).part; expect(massOf(house) / 1000).toBeGreaterThan(50); expect(massOf(house) / 1000).toBeLessThan(200); // a brick house: about 100–150 t (typical)
    for (const b of ['a king metal bed', 'a king wooden bed', 'a single wooden bed']) { const m = massOf(makeKit(kitById('bed')!, b, 1).part); expect(m, b).toBeGreaterThan(20); expect(m, b).toBeLessThan(160); }
    const palm = makeKit(kitById('tree')!, 'a 25 m palm', 1).part; expect(massOf(palm) / 1000).toBeLessThan(3); // a palm does not thicken with height
    const ev = makeKit(kitById('car')!, 'an electric sedan', 4).part, pack = all(ev).find((p) => /battery pack/.test(p.name))!; expect(massOf(pack)).toBeGreaterThan(380); expect(massOf(pack)).toBeLessThan(520);
  });
});
describe('edges as things are made', () => {
  it('rounds every edge by how its material is made, never past a third of its thinnest side', () => {
    expect(edgeRadius('steel-low', 0.01)).toBeCloseTo(0.0005, 6); expect(edgeRadius('concrete', 0.3)).toBeCloseTo(0.02, 6); expect(edgeRadius('wood', 0.02)).toBeCloseTo(0.002, 6);
    expect(edgeRadius('abs', 0.002)).toBeCloseTo(0.003 > 0.002 / 3 ? 0.002 / 3 : 0.003, 6); expect(edgeRadius('foam', 0.2)).toBeCloseTo(0.05, 6); expect(edgeRadius('concrete', 0.03)).toBeCloseTo(0.01, 6);
    // (a header's square pin, 0.64 mm, keeps its corners: a stamped contact's die roll, not a moulding's round)
    expect(edgeRadius('brass', 0.00064)).toBeCloseTo(0.000064, 7);
    expect(ruleFor('mystery').id).toBe('anything else'); for (const r of EDGE_RULES) expect(r.source.length, r.id).toBeGreaterThan(5);
    expect(setEdge('edges wood 4 mm')).toMatch(/4 mm/); expect(edgeRadius('wood', 0.05)).toBeCloseTo(0.004, 6); setEdge('edges wood 2 mm');
  });
});

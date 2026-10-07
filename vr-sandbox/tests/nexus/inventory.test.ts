// The inventory: real products by category, each mapped down to its materials, each made here or bought with why;
// adjustable families that make any size from their standards; entries fed fast and checked; all of it as boards.

import { describe, expect, it } from 'vitest';
import { INVENTORY, PROCESSES, boardOfInventory, boardOfTree, categories, feed, lineOf, makeBoard, plan, resolve, routeOf, summary } from '../../src/nexus/inventory';
import { FAMILIES, callFamily } from '../../src/nexus/families';
import { triggersOf } from '../../src/nexus/flows';

describe('the inventory', () => {
  it('is filed by category and subcategory, electrical, mechanical and hardware among them, with materials at the bottom', () => {
    const cats = categories();
    for (const c of ['Electrical', 'Mechanical', 'Hardware', 'Materials']) expect(cats.has(c)).toBe(true);
    expect([...cats.get('Electrical')!.keys()].length).toBeGreaterThanOrEqual(8);
    expect([...INVENTORY.values()].filter((i) => i.kind !== 'material').length).toBeGreaterThanOrEqual(100);
    for (const i of INVENTORY.values()) expect(i.path.length, i.id).toBeGreaterThanOrEqual(2);
  });
  it('maps everything to what is in it: every part known, nothing inside itself, every branch down to materials', () => {
    for (const i of INVENTORY.values()) {
      for (const c of i.of) expect(INVENTORY.has(c.id), `${i.id} has ${c.id}`).toBe(true);
      const seen = new Set<string>(); const walk = (x: string, path: string[]) => { expect(path, `a loop: ${path.join(' > ')}`).not.toContain(x); const it = INVENTORY.get(x)!; if (!it.of.length) { expect(it.kind, `${x} has nothing in it but is not a material`).toBe('material'); return; } if (seen.has(x)) return; seen.add(x); for (const c of it.of) walk(c.id, [...path, x]); };
      walk(i.id, []);
      expect(i.make in PROCESSES).toBe(true);
    }
  });
  it('says how each thing is made here: made where the workshop can, by another way where one will do, else bought', () => {
    const p = plan('nema17'), row = (id: string) => p.find((r) => r.id === id)!;
    expect(row('end-bell').route).toMatchObject({ process: 'cast', here: true });
    expect(row('stator-stepper').route).toMatchObject({ process: 'wind', here: true });
    expect(row('lamination-stack').route.bought).toBe(true);
    expect(routeOf(INVENTORY.get('servo-case')!)).toMatchObject({ process: 'print', here: true });
    expect(routeOf(INVENTORY.get('servo-case')!).why).toMatch(/instead of moulded/);
    const s = summary('nema17'); expect(s.made).toBeGreaterThan(3); expect(s.bought).toBeGreaterThan(3); expect(s.depth).toBeGreaterThanOrEqual(3);
  });
});

describe('adjustable families', () => {
  it('a screw of any size has its pitch and head from the standards, and its mass from its shape', () => {
    const s = resolve('screw M4x20'); expect(typeof s).toBe('object'); const it = s as Exclude<typeof s, string | null>;
    expect(it.spec).toMatch(/0\.7 mm pitch/); expect(it.spec).toMatch(/head 7 mm/); expect(it.g!).toBeGreaterThan(2.3); expect(it.g!).toBeLessThan(3.5);
    expect(it.adjustable).toBe(true);
    expect(plan(it.id)[0]!.route.bought).toBe(true);
  });
  it('bearings, springs, wire, gears and the rest work out their numbers', () => {
    expect((callFamily('bearing 6201') as { spec: string }).spec).toMatch(/12 mm bore, 32 mm outside, 10 mm wide/);
    expect((callFamily('spring d1 D10 L30 n8') as { spec: string }).spec).toMatch(/rate 1\.23 N\/mm/);
    expect((callFamily('wire 22AWG 1m') as { spec: string }).spec).toMatch(/^0\.644 mm/);
    expect((callFamily('gear m1 z30 b8') as { spec: string }).spec).toMatch(/pitch circle 30 mm, outside 32 mm/);
    expect((callFamily('leadscrew T8 p2 s4 300') as { spec: string }).spec).toMatch(/lead 8 mm/);
    expect(callFamily('gear m1 z5')).toMatch(/Under 8 teeth/);
    expect(callFamily('bearing 9999')).toMatch(/Which bearing/);
    for (const f of FAMILIES) for (const ex of f.examples) { const it = callFamily(ex); expect(typeof it, ex).toBe('object'); for (const c of (it as { of: { id: string }[] }).of) expect(INVENTORY.has(c.id), `${ex} has ${c.id}`).toBe(true); }
    expect(FAMILIES.length).toBeGreaterThanOrEqual(25);
  });
});

describe('feeding it fast', () => {
  it('one line an entry, checked: what is unknown or inside itself is refused, with why', () => {
    const r = feed('desk-lamp | desk lamp | Electrical/Lighting/Lamps | product | assemble | led-bulb hinge-butt*2 screw-m3*6 | a lamp on a hinged arm\nbad-thing | bad | Yours | product | assemble | unobtainium\nloop-a | a | Yours | product | assemble | loop-b\nloop-b | b | Yours | product | assemble | loop-a');
    expect(r.added.map((i) => i.id)).toContain('desk-lamp');
    expect(r.refused.join(' ')).toMatch(/unobtainium/); expect(r.refused.join(' ')).toMatch(/inside itself/);
    expect(summary('desk-lamp').made).toBeGreaterThan(0);
    expect(lineOf(INVENTORY.get('desk-lamp')!)).toMatch(/^desk-lamp \| desk lamp \| Electrical\/Lighting\/Lamps/);
  });
  it('JSON and CSV are read the same way', () => {
    expect(feed('[{"id":"shelf","name":"shelf","path":["Hardware","Furniture"],"of":["plywood",{"id":"screw-wood","n":8}]}]').added[0]!.of).toHaveLength(2);
    expect(feed('id,name,path,kind,make,of,says\nbox-printed,printed box,Yours/Boxes,product,print,pla,a box').added[0]!.make).toBe('print');
  });
});

describe('as boards', () => {
  it('the inventory is a board of its categories; an item\'s inside a tree; making it a pipeline', () => {
    const b = boardOfInventory(); expect(Object.keys(b.nodes).length).toBeGreaterThan(150); expect(Object.values(b.nodes).some((n) => n.label.startsWith('⚙'))).toBe(true);
    const t = boardOfTree('mg996r')!; expect(Object.values(t.nodes).map((n) => n.label).join(' ')).toMatch(/servo case.*brushed DC motor|brushed DC motor.*servo case/s);
    const m = makeBoard('mg996r')!; expect(triggersOf(m)).toHaveLength(1); expect(Object.values(m.nodes).map((n) => n.step?.what)).toContain('inventory make potentiometer');
  });
});

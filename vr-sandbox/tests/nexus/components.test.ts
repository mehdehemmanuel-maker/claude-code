import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { DESIGNED, boltedJoint, component, componentOf, library, use, type Component } from '../../src/nexus/parts/components';
import { catalogue } from '../../src/nexus/parts/catalogue';
import { callFamily, FAMILIES } from '../../src/nexus/parts/families';
import { kitFor, makeKit, kitById, type Part } from '../../src/nexus/parts/kits';
import { critique } from '../../src/nexus/make/critic';
import { kitView } from '../../src/nexus/view/kit3d';

const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];

describe('the component library', () => {
  it('draws every size its families sell, each within a fifth of its standard\'s mass, filed under its category', () => {
    let n = 0;
    for (const f of DESIGNED) {
      const lines = catalogue(f), words = lines.length ? lines : FAMILIES.find((x) => x.id === f)!.examples;
      expect(words.length, f).toBeGreaterThan(0);
      for (const w of words) {
        const c = component(w); if (typeof c === 'string') throw new Error(`${w}: ${c}`);
        expect(c.faults, w).toEqual([]); expect(c.path.length, w).toBeGreaterThan(1);
        expect(all(c.part).some((p) => p.shape), w).toBe(true); expect(c.part.item, w).toBe(c.item.id); n++;
      }
    }
    expect(n).toBeGreaterThan(300);
    expect([...library().keys()]).toContain('Hardware / Fasteners / Bolts');
  });
  it('gives each build its own copy, named in the build, its pieces under that name', () => {
    const a = use('bolt M8x30', [0, 1, 0], { name: 'a bolt here' }), b = use('bolt M8x30');
    a.parts![0]!.mat = 'gold';
    expect(b.parts![0]!.mat).not.toBe('gold'); expect(b.name).toBe('M8 × 30 hex bolt');
    expect(a.parts!.every((p) => p.name === 'a bolt here')).toBe(true); expect(a.at).toEqual([0, 1, 0]);
    expect(() => use('flux capacitor 88mph')).toThrow();
  });
  it('makes a bolted joint of saved parts, stacked head, washer, plies, washer, nut, the bolt the shortest sold that leaves two pitches', () => {
    const j = boltedJoint('M10', 22), [w1, bolt, w2, nut] = j.parts!;
    expect(bolt!.name).toBe('M10 × 40 hex bolt'); // 22 + 2 × 2 (washers) + 8.4 (nut) + 2 × 1.5 = 37.4: the next length sold is 40
    expect(w1!.at![1]).toBeCloseTo(-0.002, 6); expect(w2!.at![1]).toBeCloseTo(-0.026, 6); expect(nut!.at![1]).toBeCloseTo(-0.026, 6);
    for (const p of [w1, w2, nut]) expect(p!.passes, p!.name).toContain(bolt!.name);
  });
  it('is a kit: a part is called by its words, and only with a size said', () => {
    expect(kitFor('bolt M12x40')!.id).toBe('part'); expect(kitFor('angle 40x4 steel 1000mm')!.id).toBe('part');
    expect(kitFor('a pipe organ')?.id).not.toBe('part');
    const { part } = makeKit(kitById('part')!, 'extrusion 2040 500', 1); expect(part.name).toBe('2040 extrusion');
  });
});

describe('a linear guideway, drawn whole from HIWIN\'s table', () => {
  it('draws every MGN size and carriage with every part its inventory lists, within a tenth of HIWIN\'s mass', () => {
    for (const w of ['rail MGN7C 100', 'rail MGN9H 300', 'rail MGN12H 400', 'rail MGN15C 400', 'rail MGN15H 500']) {
      const c = component(w); if (typeof c === 'string') throw new Error(c);
      expect(c.faults, w).toEqual([]); expect(Math.abs(c.mass - 1), w).toBeLessThan(0.1);
    }
  });
  it('runs 66 balls in an MGN12H\'s two circuits (the count rebuilders give), its carriage one link sliding on the rail', () => {
    const c = component('rail MGN12H 400'); if (typeof c === 'string') throw new Error(c);
    const ps = all(c.part), balls = ps.filter((p) => p.item === 'steel-ball-2.381');
    expect(balls).toHaveLength(66);
    expect(balls.every((b) => b.link === 'MGN12H rail carriage' && b.joint === 'slide')).toBe(true);
    // (each of its carriage's parts on that link, its own pieces with it)
    expect(c.part.parts!.filter((p) => /carriage|end seal|end cap|retaining wire|seal screw/.test(p.name)).every((p) => p.link === 'MGN12H rail carriage')).toBe(true);
  });
  it('mates by its rail\'s foot (its holes every 25 mm) and its carriage\'s top (four M3 threads 20 by 20), and refuses a rail shorter than its carriage', () => {
    const c = component('rail MGN12H 400'); if (typeof c === 'string') throw new Error(c);
    const [foot, top] = c.part.ports!;
    expect(foot!.sex).toBe('holes'); expect(foot!.pattern).toHaveLength(16); expect(foot!.pattern[1]![0] - foot!.pattern[0]![0]).toBeCloseTo(0.025, 6);
    expect(top!.sex).toBe('threads'); expect(top!.thread).toBe('M3'); expect(top!.pattern.map(([x, z]) => [Math.abs(x), Math.abs(z)])).toEqual(Array(4).fill([0.01, 0.01]));
    expect(component('rail MGN12H 40')).toMatch(/must be longer than that/);
  });
  it('reads a screw said by its thread and length, "M3x10", in every fastener kind', () => {
    for (const w of ['panhead M2x6 PH A2', 'countersunk M3x10', 'buttonhead M3x8']) { const c = component(w); expect(typeof c === 'string' ? c : c.item.id, w).not.toMatch(/I do not know/); }
    const p = component('panhead M2x6 PH A2'); if (typeof p === 'string') throw new Error(p); expect(p.faults).toEqual([]);
  });
});

describe('room to slide', () => {
  it('sweeps a carriage along its rail\'s travel: a stop clear of it where it is drawn but in its travel is in its way; one beyond is not', () => {
    const rail = use('rail MGN12H 200'), stop = (z: number): Part => ({ name: 'end stop', shape: { box: [0.03, 0.006, 0.01] }, at: [0, 0.011, z], mat: 'al-6061' });
    const said = (z: number) => critique({ name: 'slide', parts: [structuredClone(rail), stop(z)] }).filter((f) => f.check === 'room to slide');
    expect(said(0.07)).toHaveLength(1); expect(said(0.07)[0]!.says).toMatch(/end stop is in its way/);
    expect(said(0.12)).toEqual([]);
  });
});

describe('taken apart', () => {
  it('parts a drawn part with no piece on another, each piece out its own way, what is the part itself staying', () => {
    for (const w of ['rail MGN12H 400', 'bearing 608 2RS', 'pulley GT2 20 5']) {
      const c = component(w) as Component, v = kitView(c.part, { maxLights: 0 }), root = v.group.children[0]!, nodes = root.children.filter((o) => o.userData.part);
      const home = nodes.map((o) => o.position.clone()); v.explode(1); v.group.updateMatrixWorld(true);
      const moved = nodes.map((o, i) => o.position.distanceTo(home[i]!) > 1e-6), box = nodes.map((o) => new THREE.Box3().setFromObject(o)), m = 1e-5;
      const meet = (a: THREE.Box3, b: THREE.Box3) => a.min.x < b.max.x - m && a.max.x > b.min.x + m && a.min.y < b.max.y - m && a.max.y > b.min.y + m && a.min.z < b.max.z - m && a.max.z > b.min.z + m;
      for (let i = 0; i < nodes.length; i++) for (let j = 0; j < nodes.length; j++) if (i !== j && moved[i] && nodes[i]!.name !== nodes[j]!.name) expect(meet(box[i]!, box[j]!), `${w}: ${nodes[i]!.name} on ${nodes[j]!.name}`).toBe(false);
      expect(nodes.filter((o, i) => o.name === c.part.name && moved[i]), w).toEqual([]);
      // (the pieces out round it go each its own way, not all by the last one's: a bearing's balls round it)
      const ways = (re: RegExp) => new Set(nodes.map((o, i) => [o, o.position.clone().sub(home[i]!)] as const).filter(([o, d]) => re.test(o.name) && d.length() > 1e-6).map(([, d]) => d.toArray().map((x) => x.toFixed(4)).join())).size;
      if (/bearing/.test(w)) expect(ways(/ball$/), w).toBe(nodes.filter((o) => /ball$/.test(o.name)).length);
      if (/rail/.test(w)) expect(ways(/seal screw$/), w).toBe(4);
    }
  });
  it('finds the drawn part an item is, by its id, however it was asked for', () => {
    const c = component('rail MGN12H 400') as Component;
    expect(componentOf(c.item.id)).toBe(c); expect(component('rail mgn12h 400')).toBe(c);
    expect(componentOf('no-such-part')).toBeNull();
  });
});

describe('a designation\'s shape is not a designation that exists', () => {
  // Found 2026-10-17 by a probe that asked every family for a part using the first size its own refusal offered: a
  // regex bug handed it "M1" (the dot in "M1.6" ended the capture), and three families CRASHED on it instead of
  // refusing. `M1` and `M7` are both well-formed and neither is in the coarse series this table carries; the bolt
  // family checked and refused, while nut, washer and threaded rod parsed the shape, indexed METRIC, read undefined
  // and threw. M7 is a real ISO thread, so this was reachable by asking for an ordinary part by name.
  it('a thread the family does not make is refused, not crashed on, whichever family is asked', () => {
    for (const w of ['nut M1', 'washer M1', 'threadedrod M1', 'bolt M1x10', 'nut M7', 'bolt M99x10']) {
      const c = component(w);
      expect(typeof c, `${w} must be refused in words`).toBe('string');
      expect(String(c)).toMatch(/is not made in M[\d.x]+\. Which thread\?/);
    }
  });

  it('and a thread they do hold still makes its part', () => {
    for (const w of ['nut M1.6', 'washer M3', 'bolt M8x30']) expect(typeof component(w), w).not.toBe('string');
  });

  it('M1 is not always a thread: a module-1 gear is not refused', () => {
    // The first guard was written over the words alone and refused the inventory's own seed, "gear m1 z60 b6 pom".
    // It is scoped by the family's OWN declared parameters instead, so only a family that takes a thread is checked.
    // (the gear is known but has no design yet, so `component` refuses it for THAT reason — never for its "m1")
    expect(typeof callFamily('gear m1 z60 b6 pom'), 'the family must still read it').not.toBe('string');
    expect(String(component('gear m1 z60 b6 pom'))).not.toMatch(/is not made in/);
  });
});

// What things give off and what they let a body do (docs/LIFE.md, step 1; src/nexus/aware/), read from what they are, never tagged by hand.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import type { Part } from '../../src/nexus/kits';
import { Engine, emptyBoard, placeBlock } from '../../src/nexus/dataflow';
import { partOf, type Assembly } from '../../src/nexus/assembly';
import { makeMachine, MACHINES } from '../../src/nexus/machines';
import { ACTORS, ACUITY, bodyOf, tagsOf } from '../../src/nexus/aware/tags';

const box = (name: string, size: [number, number, number], at: [number, number, number], more: Partial<Part> = {}): Part => ({ name, shape: { box: size }, at, mat: 'oak', ...more });
const room = (things: Part[]): Part => ({ name: 'room', parts: [box('floor', [4, 0.02, 4], [0, -0.01, 0]), { name: 'bedroom fittings', parts: things }] });

describe('signatures', () => {
  it('seen where its size subtends the eye\'s arcminute; heard where its sound falls to a quiet street; warm by the rules\' fall-off', () => {
    const t = tagsOf({ name: 'bay', parts: [box('panel', [1, 1, 0.01], [0, 0.5, 0], { item: 'panel', color: 0x000000 }), { name: 'engine', item: 'engine-ice', parts: [box('block', [0.5, 0.5, 0.5], [0, 0.25, 2], { item: 'engine-block', mat: 'cast-iron', hot: 90 })] }] }).tags;
    const panel = t.find((x) => x.part === 'panel')!, engine = t.find((x) => x.part === 'engine')!;
    // (a black 1 m square on mid grey: full contrast, 1 m / one arcminute ≈ 3.4 km)
    expect(panel.seen).toBeCloseTo(1 / ACUITY, -1);
    // (80 dB(A) of sound power at idle: 10^((80 − 11 − 40) / 20) ≈ 28 m)
    expect(engine.heard).toBeCloseTo(10 ** (29 / 20), 3);
    expect(t.find((x) => x.part === 'block')!.warm).toBeCloseTo(0.04 * Math.log(50 / 5), 6);
    expect(t.find((x) => x.part === 'block')!.tags).toContain('hot');
  });
});

describe('affordances, against the body that looks', () => {
  it('a stool: an adult sits on it and lifts it; a 36 kg chest is pushed (176 N), not lifted; a bar is grasped', () => {
    const stool: Part = { name: 'stool', parts: [box('stool top', [0.4, 0.04, 0.4], [0, 0.45, 0]), box('stool leg', [0.04, 0.43, 0.04], [0, 0.215, 0])] };
    const chest = box('chest', [2, 0.8, 0.6], [1.5, 0.4, 0], { fill: 0.05 }), bar = box('rail', [0.5, 0.03, 0.03], [-1.5, 0.9, 0], { mat: 'steel-low' });
    const t = tagsOf(room([stool, chest, bar]), ACTORS.adult).tags, of = (n: string) => t.find((x) => x.part === n)!;
    expect(of('stool top').affords).toContain('sit'); expect(of('stool').affords).toContain('lift');
    expect(of('chest').affords).not.toContain('lift'); expect(of('chest').affords).toContain('push');
    expect(of('rail').affords).toContain('grasp');
  });
  it('a child of 8 and an adult see the same seat differently: its top is at an adult\'s knee, over a child\'s', () => {
    const seat: Part = { name: 'seat', parts: [box('seat top', [0.45, 0.04, 0.45], [0, 0.48, 0])] };
    expect(bodyOf(ACTORS.child!).knee).toBeLessThan(bodyOf(ACTORS.adult!).knee);
    expect(tagsOf(room([seat]), ACTORS.adult).tags.find((x) => x.part === 'seat top')!.affords).toContain('sit');
    expect(tagsOf(room([seat]), ACTORS.child).tags.find((x) => x.part === 'seat top')!.affords).not.toContain('sit');
  });
  it('the Corolla: its four doors open, its steering wheel drives it, its exhaust is hot; nothing bolted in it is lifted; its front seat has too little headroom, said', () => {
    const r = tagsOf(makeMachine(MACHINES.find((m) => m.id === 'corolla')!), ACTORS.adult), having = (a: string) => r.tags.filter((x) => x.affords.includes(a as never));
    expect(having('open').map((x) => x.part).sort()).toEqual(['front door (left)', 'front door (right)', 'rear door (left)', 'rear door (right)']);
    expect(having('drive').map((x) => x.part)).toEqual(['steering wheel']);
    expect(having('lift')).toHaveLength(0);
    expect(r.tags.some((x) => /exhaust/.test(x.part) && x.tags.includes('hot'))).toBe(true);
    expect(r.findings.some((f) => /cushion foam .* mm over it, where an adult sitting needs/.test(f))).toBe(true);
  }, 120000);
  it('a house from its seed: its doors hang on hinges and open; what has nothing hinged is said', async () => {
    const b = emptyBoard('h'); placeBlock(b, 'seed.house', 0, 0, {}, 'h'); const e = new Engine(b); await e.run();
    const r = tagsOf(partOf(e.state.get('h')!.out!.house as Assembly), ACTORS.adult);
    expect(r.tags.filter((x) => x.part === 'door' && x.affords.includes('open')).length).toBeGreaterThan(0);
    expect(r.tags.some((x) => x.affords.includes('sit'))).toBe(true);
    expect(r.findings.some((f) => /inferred/.test(f))).toBe(true);
  }, 120000);
});

import { CO_ALARM, perceive, standBy, type Observer } from '../../src/nexus/aware/sense';
import { EXHAUST_LIMITS, STILL, SUBSTANCES, concentration, effectsOf, exhaustFlow, hydrogenFrom, releasesOf, shutIn } from '../../src/nexus/aware/gas';

describe('gases: a substance given off at a rate, carried by the air, doing what it does at each concentration', () => {
  it('the rates from the physics: an engine breathes its displacement every two turns; overcharge splits water by Faraday\'s law', () => {
    expect(exhaustFlow(1987, 750)).toBeCloseTo(1987e-6 * 750 / 120, 12);
    // (1 A for an hour: 3600 C / (2 F) mol of hydrogen, 22.4 L each; F = 96485.33212 C/mol, exact in the 2019 SI)
    expect(hydrogenFrom(1) * 3600).toBeCloseTo((3600 / (2 * 96485.33212)) * 0.0224, 12);
  });
  it('in still air it falls as 1 / r, never above what comes out; in a wind it is carried downwind and not upwind', () => {
    const r = { at: [0, 1, 0] as [number, number, number], substance: 'co', rate: 1e-5, pure: 0.003, part: 'pipe', path: '/0', why: '' };
    expect(concentration(r, [2, 1, 0]) / concentration(r, [4, 1, 0])).toBeCloseTo(2, 6);
    expect(concentration(r, [0.051, 1, 0])).toBeLessThanOrEqual(0.003);
    const w = { wind: 2, to: [1, 0, 0] as [number, number, number] };
    expect(concentration(r, [5, 1, 0], w)).toBeGreaterThan(0); expect(concentration(r, [-5, 1, 0], w)).toBe(0);
  });
  it('carbon monoxide has no smell: it harms without being noticed; shut in a garage it climbs to where it is dangerous', () => {
    expect(SUBSTANCES.co!.smell).toBeNull();
    const rs = releasesOf(makeMachine(MACHINES.find((m) => m.id === 'corolla')!), { running: true }), co = rs.find((x) => x.substance === 'co')!;
    expect(co.rate).toBeCloseTo(exhaustFlow(1987) * EXHAUST_LIMITS.co, 12); expect(co.part).toBe('muffler');
    expect(effectsOf(co, STILL).smelled).toBe(0); expect(effectsOf(co, STILL).harmful).toBeGreaterThan(0);
    const g = shutIn(co, 60, 0.5); expect(g.steady).toBeGreaterThan(SUBSTANCES.co!.deadly!); expect(g.minutesTo(SUBSTANCES.co!.harm!)).toBeLessThan(5);
  }, 120000);
});

describe('who notices what', () => {
  const floor = box('floor', [20, 0.02, 20], [0, -0.01, 0], { item: 'floor', mat: 'concrete' });
  const eye = (at: [number, number, number], facing: [number, number, number]): Observer => ({ name: 'p', at, facing, kind: 'person' });
  it('a person sees what is before them and not what a wall hides, nor what is behind their back', () => {
    const t: Part = { name: 'yard', parts: [floor, box('front post', [0.3, 1.8, 0.3], [3, 0.9, 0], { item: 'post', color: 0x101010 }), box('wall', [0.1, 2.5, 3], [5, 1.25, 0], { item: 'wall', color: 0xdddddd }), box('hidden post', [0.3, 1.8, 0.3], [7, 0.9, 0], { item: 'post', color: 0x101010 }), box('back post', [0.3, 1.8, 0.3], [-3, 0.9, 0], { item: 'post', color: 0x101010 })] };
    const p = perceive(t, [eye([0, 1.6, 0], [1, 0, 0])], { rays: 3000 }), seen = new Set(p.by.p!.notices.filter((n) => n.sense === 'sight').map((n) => n.thing));
    expect(seen.has('front post')).toBe(true); expect(seen.has('wall')).toBe(true);
    expect(seen.has('hidden post')).toBe(false); expect(seen.has('back post')).toBe(false);
  });
  it('the Corolla running, shut in a garage: the people are harmed by what they cannot smell, the alarm sounds; observers stand where they are found', () => {
    const v = makeMachine(MACHINES.find((m) => m.id === 'corolla')!), obs = [standBy(v, /^muffler$/, { name: 'behind' }), standBy(v, /^muffler$/, { name: 'alarm', kind: 'co alarm', off: 1.5 })];
    const p = perceive(v, obs, { state: { running: true }, shut: { volume: 60, minutes: 30 }, rays: 500 });
    expect(p.by.behind!.attended[0]).toMatchObject({ sense: 'gas', harm: true });
    expect(p.by.alarm!.notices.some((n) => n.harm && /70 ppm/.test(n.why))).toBe(true); expect(CO_ALARM).toBe(70e-6);
    expect(p.by.behind!.notices.some((n) => n.sense === 'hearing' && /petrol engine/.test(n.thing))).toBe(true);
  }, 120000);
});

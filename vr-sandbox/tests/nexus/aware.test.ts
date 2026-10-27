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
    // (100 dB(A) of sound power: 10^((100 − 11 − 40) / 20) ≈ 282 m)
    expect(engine.heard).toBeCloseTo(10 ** (49 / 20), 3);
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

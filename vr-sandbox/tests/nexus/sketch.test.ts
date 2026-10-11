// The fast plan: an invention sketched as labelled blocks and pins, stood up and turned into a bill.
import { describe, it, expect } from 'vitest';
import { blockShape, planWords, sketchOf, sketchParts, sketchSpan, sketchText, sketchWeighs } from '../../src/nexus/ask/sketch';
import { billOfSketch, planJob, worksUnder } from '../../src/nexus/works';

const WHEEL = `# a potter's wheel, fast plan
frame box 500x600x500 at 0,0.3,0 "welded 40x40x2 frame" steel-low@0.013
pan   tub 520x110 at 0,0.645,0 "splash pan" steel-low@0.03
head  disc 300x25 at 0,0.7125,0 "plywood head" wood
motor can 180x200 at 0.26,0.28,0 "washing-machine motor"
brg   use bearing 6205 at 0,0.585,0
belt  head -> motor "1000 mm A-section, 4:1"
`;

describe('a plan placed as blocks and pins', () => {
  it('reads blocks, pins and a library part out of its own text', () => {
    const s = sketchOf(WHEEL);
    expect(s.title).toBe("a potter's wheel, fast plan");
    expect(s.blocks.map((b) => b.id)).toEqual(['frame', 'pan', 'head', 'motor', 'brg']);
    expect(s.pins).toEqual([{ from: 'head', to: 'motor', id: 'belt', label: '1000 mm A-section, 4:1' }]);
    expect(s.blocks.find((b) => b.id === 'brg')!.form, 'a block may be the library\'s own part').toBe('use');
    expect(s.faults, 'nothing unread').toEqual([]);
  });
  it('a word a plan reaches for is a form: tub, drum, pan, rod, sheet', () => {
    const s = sketchOf('a tub 100x100 at 0,0,0\nb rod 10x200 at 0,0,0\nc sheet 100x80x2 at 0,0,0');
    expect(s.blocks.map((b) => b.form)).toEqual(['can', 'bar', 'plate']);
    expect(sketchOf('a wobbler 10x10 at 0,0,0').faults[0]).toMatch(/is not a form I know/);
  });
  it('an unreadable line is kept as a fault, never dropped', () => {
    const s = sketchOf('this is not a plan line at all');
    expect(s.blocks).toEqual([]);
    expect(s.faults[0]).toMatch(/could not read/);
  });
  it('a pin that names no block says so', () => {
    expect(sketchOf('a box 10x10x10 at 0,0,0\na -> ghost').faults[0]).toMatch(/names "ghost"/);
  });
  it('stands as parts, one for every block and every pin, each saying what it is', () => {
    const p = sketchParts(sketchOf(WHEEL));
    expect(p.parts).toHaveLength(6);
    for (const q of p.parts!) expect(q.says, q.name).toBeTruthy();
    const pin = p.parts!.find((q) => /→/.test(q.name))!;
    expect(pin.shape, 'a pin is a rod between the two it joins').toHaveProperty('cyl');
    const lib = p.parts!.find((q) => /brg/.test(q.name))!;
    expect(lib.parts?.length, 'a library block comes apart into the real part\'s own pieces').toBeGreaterThan(3);
  });
  it('a block that says what fraction of itself is there weighs that, and the plan has an envelope', () => {
    const s = sketchOf(WHEEL), w = sketchWeighs(s), span = sketchSpan(s)!;
    expect(w.kg, 'a wheel, roughly').toBeGreaterThan(10);
    expect(w.kg).toBeLessThan(40);
    expect(w.unsaid, 'the motor says no material yet').toEqual(['motor']);
    expect(span.size[1], '725 mm tall').toBeCloseTo(0.725, 2);
    expect(blockShape({ id: 'x', form: 'disc', size: [300, 25], at: [0, 0, 0] })!.box).toEqual([0.3, 0.025, 0.3]);
  });
  it('is a bill the works can route, and a placeholder is not routed as a part', () => {
    const bill = billOfSketch(sketchOf(WHEEL));
    const frame = bill.find((l) => l.name.startsWith('frame'))!;
    expect(frame.size, 'an assembly is named and not yet dimensioned').toBeUndefined();
    expect(frame.name).toMatch(/an assembly, not yet a part/);
    const head = bill.find((l) => l.name.startsWith('head'))!;
    expect(head.size, 'a solid block is').toEqual([300, 25, 300]);
    const j = planJob('a plan', bill, worksUnder(3000).ids);
    expect(j.gaps, 'a sketch of real things has nothing this works cannot deal with').toEqual([]);
    expect(j.buy.some((b) => /an assembly, not yet a part/.test(b.line.name) && /no size and no volume/.test(b.why))).toBe(true);
  });
  it('says itself for a person, and stands when asked for in words', () => {
    const t = sketchText(sketchOf(WHEEL));
    expect(t).toMatch(/It stands in 610 × 725 × 520 mm/);
    let stood = '';
    const said = planWords('fast plan: a box 100x100x100 at 0,0,0 "a block"; b can 50x80 at 0.2,0,0; a -> b', { stand: (p) => { stood = p.name; return 'it stands'; } });
    expect(said).toMatch(/it stands/);
    expect(stood).toBe('a fast plan');
    expect(planWords('what is the time', { stand: () => '' }), 'other words are not a plan').toBe(null);
  });
});

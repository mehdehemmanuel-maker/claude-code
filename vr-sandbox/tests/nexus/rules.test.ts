import { describe, expect, it } from 'vitest';
import { engineBuilt, type EngineSpec } from '../../src/nexus/engines';
import { engineSpecOf } from '../../src/nexus/machines';
import { rulesOf } from '../../src/nexus/make/rules';
import type { Part } from '../../src/nexus/kits';

const blk = (name: string, at: [number, number, number], more: Partial<Part> = {}): Part => ({ name, item: name, shape: { box: [0.1, 0.1, 0.1] }, at, mat: 'steel-low', ...more });

describe('the rules a made thing is held to', () => {
  it('finds two pieces that cross, and none when they are apart', () => {
    expect(rulesOf({ name: 'x', parts: [blk('a', [0, 0, 0]), blk('b', [0.05, 0.03, 0.02])] }).findings.map((f) => f.rule)).toEqual(['interference']);
    expect(rulesOf({ name: 'x', parts: [blk('a', [0, 0, 0]), blk('b', [0.3, 0, 0])] }).findings).toEqual([]);
  });
  it('lets through what is said to pass, from any level of what it is in', () => {
    const shaft = blk('shaft', [0.05, 0, 0]);
    expect(rulesOf({ name: 'x', parts: [{ name: 'hub', item: 'hub', passes: ['shaft'], parts: [blk('hub body', [0, 0, 0], { item: undefined })] }, shaft] }).findings).toEqual([]);
  });
  it('holds a rubber piece back from something hot, unless something solid is between them', () => {
    const hot = blk('pipe', [0, 0, 0], { hot: 800 }), hose = blk('hose', [0.15, 0, 0], { mat: 'epdm' });
    const open = rulesOf({ name: 'x', parts: [hot, hose] }).findings;
    expect(open.map((f) => f.rule)).toEqual(['heat']); expect(open[0]!.need).toBeGreaterThan(0.05);
    expect(rulesOf({ name: 'x', parts: [hot, hose, { name: 'shield', item: 'shield', shape: { box: [0.002, 0.3, 0.3] }, at: [0.075, 0, 0], mat: 'steel-low' }] }).findings).toEqual([]);
  });
  it('finds nothing in the engines the machines are built with: no piece through another, nothing too near their exhausts', () => {
    // (Toyota's M20A, Honda's GX270, Kawasaki's FR651V: the inline, the single and the vee; every bore and stroke their maker's)
    const powers = [{ kind: 'inline', cc: 1987, cyl: 4, bore: 0.0805, stroke: 0.0976 }, { kind: 'single', cc: 270, bore: 0.077, stroke: 0.058, starter: 'recoil' }, { kind: 'twin', cc: 726, bore: 0.078, stroke: 0.076 }];
    for (const p of powers) { const e = engineBuilt(engineSpecOf(p as Parameters<typeof engineSpecOf>[0], true) as EngineSpec); expect(rulesOf(e.engine).findings.map((f) => f.says)).toEqual([]); }
  }, 120_000);
});

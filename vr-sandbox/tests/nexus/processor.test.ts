import { describe, expect, it } from 'vitest';
import { CLAYS, CONES, FILAMENTS, fire, FURNACE_MAX, KILNS, pour, PRINTERS, printWith, processorFor, processWords, QUARTZ } from '../../src/nexus/processor';
import { Kiln, METALS } from '../../src/nexus/cell';

const P = (id: string) => PRINTERS.find((p) => p.id === id)!, F = (id: string) => FILAMENTS.find((f) => f.id === id)!;

describe('the materials processor', () => {
  it('prints each filament at the middle of its maker\'s range where the printer reaches it', () => {
    const r = printWith(P('prusa-mini-plus'), F('pla')); expect(r.ok).toBe(true); expect(r.settings).toEqual({ nozzle: 210, bed: 50, fan: 100 }); expect(r.warn).toEqual([]);
    expect(printWith(P('prusa-mk4'), F('petg')).settings).toEqual({ nozzle: 250, bed: 80, fan: 50 });
    expect(r.steps[0]!.do).toMatch(/bed to 50 °C and the nozzle to 210 °C \(PLA: 200–220 °C nozzle, 40–60 °C bed\)/);
  });
  it('says what an open printer or a low bed costs, and refuses what it cannot do', () => {
    const pc = printWith(P('prusa-mini-plus'), F('pc')); expect(pc.ok).toBe(true); expect(pc.settings.bed).toBe(100);
    expect(pc.warn.join()).toMatch(/low end.*keep parts small/); expect(pc.warn.join()).toMatch(/open: large PC Blend.*enclosure helps/);
    expect(printWith(P('bambu-x1c'), F('asa')).warn).toEqual([]);
    expect(printWith(P('prusa-mini-plus'), { ...F('pla'), id: 'cf', name: 'carbon-filled nylon', nozzle: [290, 300], bed: [90, 100], abrasive: true }).refused.join()).toMatch(/nozzle reaches 280 °C.*290.*hardened/s);
    expect(printWith(P('prusa-mini-plus'), F('pla'), [200, 20, 20]).refused.join()).toMatch(/bigger than the Original Prusa MINI\+ prints/);
    expect(printWith(P('prusa-mini-plus'), F('pla'), [20, 20, 200]).ok).toBe(false);
  });
  it('fires clay to Orton\'s cone, through quartz\'s change slowly, as a program the workshop\'s kiln runs', () => {
    const w = KILNS.find((k) => k.id === 'workshop')!, sc2 = KILNS.find((k) => k.id === 'paragon-sc2')!, km = KILNS.find((k) => k.id === 'skutt-km818')!, k = new Kiln();
    expect(w.max).toBe(Math.min(sc2.max, Math.round(20 + k.P / k.h)));
    const b = fire(w, CLAYS[1]!, 'bisque'); expect(b.ok).toBe(true); expect(b.settings.peak).toBe(CONES['04']); expect(b.warn.join()).toMatch(/within 3 %/);
    const through = b.settings.program.find((s) => s.to >= QUARTZ)!; expect(through.rate).toBeLessThanOrEqual(80);
    expect(b.settings.program.at(-1)!.rate).toBe(60);
    k.run(b.settings.program); for (let t = 0; t < 30 * 3600 && k.running; t += 10) k.step(10); expect(k.running).toBe(false);
    expect(fire(w, CLAYS[1]!, 'glaze').refused.join()).toMatch(/reaches 1093 °C; cone 6 needs 1222/);
    expect(fire(km, CLAYS[3]!, 'glaze').ok).toBe(true); expect(fire(km, CLAYS[1]!, 'glaze').warn).toEqual([]);
    expect(fire(km, CLAYS[0]!, 'bisque').ok).toBe(true);
    expect(fire(w, CLAYS[0]!, 'glaze').steps[1]!.do).toMatch(/^Run the program: 150 °C\/h to 963 °C; 60 °C\/h to 1063 °C, hold 9 min/);
  });
  it('pours each metal where the furnace reaches it', () => {
    expect(FURNACE_MAX).toBeGreaterThan(1150);
    for (const m of METALS) { const r = pour(m); expect(r.ok, m.id).toBe(true); expect(r.steps[0]!.do).toContain(`${m.pour[0]}–${m.pour[1]} °C`); }
  });
  it('says what every machine here can do to a material', () => {
    expect(processorFor('pc').map((x) => x.ok)).toEqual([true, true, true]);
    expect(processorFor('stoneware-10').map((x) => x.ok)).toEqual([false, true, false]);
    expect(processorFor('bronze')[0]!.ok).toBe(true); expect(processorFor('unobtainium')).toEqual([]);
  });
});

describe('the processor in words', () => {
  it('answers what can make what, and how', () => {
    expect(processWords('what can I print ASA on?')).toMatch(/^ASA: the Original Prusa MINI\+ cannot \(.*bed reaches 100 °C.*\); the Original Prusa MK4 can \(nozzle 260 °C, bed 110 °C/);
    expect(processWords('print PETG on the MK4')).toMatch(/^PETG on the Original Prusa MK4: 1\. Wipe the print sheet.*bed to 80 °C and the nozzle to 250 °C/);
    expect(processWords('fire porcelain')).toMatch(/^high-fire porcelain fired to cone 10 in Skutt's KM-818: .*60 °C\/h to 1285 °C/);
    expect(processWords('fire porcelain in the paragon')).toMatch(/cannot be done: Paragon's SC-2 reaches 1093 °C; cone 10 needs 1285/);
    expect(processWords('bisque stoneware')).toMatch(/^mid-fire stoneware bisqued in Paragon's SC-2: .*Mind: cone 04/);
    expect(processWords('how do I pour bronze')).toMatch(/^tin bronze poured from the workshop's furnace: 1\. Melt the tin bronze .*1100–1150 °C/);
    expect(processWords('print the bracket')).toBeNull(); expect(processWords('hello')).toBeNull();
  });
});

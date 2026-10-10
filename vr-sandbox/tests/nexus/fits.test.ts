// Tolerance, fit and capability: the arithmetic that used to be guesswork. Each check here is a number a machinist
// would recognise, so a wrong edit shows up as a wrong fit rather than as a vague feeling that something moved.
import { describe, expect, it } from 'vitest';
import { FITS, IT_STEPS, capable, fitAt, fitById, itBand, measured, normCdf, stackOf, tolFor } from '../../src/nexus/parts/fits';
import { CUTTING, KC, cutAt, cutRefuses } from '../../src/nexus/machines/link';
import { burrOf } from '../../src/nexus/parts/finish';

describe('ISO 286 grades', () => {
  it('the table is the standard one: every step wider than the last, every grade wider than the last', () => {
    for (const s of IT_STEPS) {
      expect(s.upTo).toBeGreaterThan(s.over);
      const gs = Object.keys(s.it).map(Number).sort((a, b) => a - b);
      for (let i = 1; i < gs.length; i++) expect(s.it[gs[i]!]!, `IT${gs[i]} at ${s.over}–${s.upTo}`).toBeGreaterThan(s.it[gs[i - 1]!]!);
    }
    for (const g of [5, 6, 7, 8, 9, 10, 11]) for (let i = 1; i < IT_STEPS.length; i++)
      expect(IT_STEPS[i]!.it[g]!, `IT${g} should widen with size`).toBeGreaterThan(IT_STEPS[i - 1]!.it[g]!);
  });
  it('the figures a handbook prints: IT7 at 25 mm is 21 µm, IT6 is 13, IT11 is 130', () => {
    expect(itBand(25, 7)).toBeCloseTo(0.021, 4);
    expect(itBand(25, 6)).toBeCloseTo(0.013, 4);
    expect(itBand(25, 11)).toBeCloseTo(0.13, 4);
    expect(itBand(8, 7)).toBeCloseTo(0.015, 4);
    expect(itBand(100, 7)).toBeCloseTo(0.035, 4);
  });
  it('a size on a step boundary falls in the step that is "over" it, as the standard says', () => {
    expect(itBand(30, 7)).toBeCloseTo(0.021, 4);  // over 18 to 30
    expect(itBand(30.1, 7)).toBeCloseTo(0.025, 4); // over 30 to 50
  });
  it('a grade it does not hold is refused by name, not quietly guessed', () => {
    expect(() => itBand(25, 2)).toThrow(/IT5 to IT13/);
  });
});

describe('fits', () => {
  it('every fit says what it is for, where its numbers come from, and what goes wrong next door', () => {
    for (const f of FITS) {
      expect(f.says.length, f.id).toBeGreaterThan(60);
      expect(f.src.length, f.id).toBeGreaterThan(30);
      const at = fitAt(f.id, 25);
      expect(at.holeTol, f.id).toBeGreaterThan(0);
      expect(at.shaftTol, f.id).toBeGreaterThan(0);
      expect(at.hole[1]).toBeGreaterThan(at.hole[0]);
      expect(at.shaft[1]).toBeGreaterThan(at.shaft[0]);
    }
    expect(() => fitById('H7/nonsense')).toThrow();
  });
  it('a clearance fit clears, a locating fit may just touch, and a press fit never clears', () => {
    const slide = fitAt('H7/g6', 25), locate = fitAt('H7/h6', 25), press = fitAt('H7/p6', 25);
    expect(slide.clearance[0], 'a sliding fit always has clearance').toBeGreaterThan(0);
    expect(locate.clearance[0], 'a locating fit may be line-to-line').toBeGreaterThanOrEqual(0);
    expect(press.clearance[1], 'a press fit is interference throughout').toBeLessThan(0);
    expect(slide.clearance[0]).toBeLessThan(locate.clearance[1]);
  });
  it("a bearing seat is slightly into the hole, which is what stops the ring creeping round the shaft", () => {
    const k = fitAt('H7/k6', 25);
    expect(k.shaft[0], 'the shaft is above nominal at its smallest').toBeGreaterThan(25);
    expect(k.shaftTol, 'and it is a few microns, not a few hundredths').toBeLessThan(0.01);
  });
  it('a free fit is the loosest and a bearing seat the tightest, at the same size', () => {
    const tols = FITS.map((f) => ({ id: f.id, t: fitAt(f.id, 25).shaftTol })).sort((a, b) => a.t - b.t);
    expect(tols[0]!.id).toMatch(/k6|g6|h6|p6/);
    expect(tols[tols.length - 1]!.id).toBe('H11/h11');
  });
  it("the handbook's own numbers at 25 mm, which is the check that caught a press fit that could be loose", () => {
    const µm = (x: number) => Math.round(x * 1000);
    const at = (id: string) => { const f = fitAt(id, 25); return [µm(f.hole[0] - 25), µm(f.hole[1] - 25), µm(f.shaft[0] - 25), µm(f.shaft[1] - 25)]; };
    expect(at('H7/h6'), 'H7 is 0/+21 and h6 is −13/0').toEqual([0, 21, -13, 0]);
    expect(at('H7/g6')[2], 'g6 is −20/−7').toBe(-20);
    expect(at('H7/g6')[3]).toBe(-7);
    expect(at('H7/k6')[2], 'k6 is +2/+15').toBe(2);
    expect(at('H7/k6')[3]).toBe(15);
    expect(at('H7/p6')[2], 'p6 is +22/+35').toBe(22);
    expect(at('H7/p6')[3]).toBe(35);
    expect(at('H8/f7')[2], 'f7 is −41/−20').toBe(-41);
    expect(at('H8/f7')[3]).toBe(-20);
  });
  it('a fit gets wider with size, because the grade does', () => {
    expect(fitAt('H7/h6', 100).holeTol).toBeGreaterThan(fitAt('H7/h6', 10).holeTol);
  });
});

describe('what a feature asks for', () => {
  it('a tolerance is derived from what the part has to do', () => {
    expect(tolFor('bearing seat', 25).fit).toBe('H7/k6');
    expect(tolFor('bearing bore, machined in the casting', 52).fit).toBe('H7/k6');
    expect(tolFor('kingpin bush housing', 16).fit).toBe('H7/g6');
    expect(tolFor('dowel, press fit', 8).fit).toBe('H7/p6');
    expect(tolFor('steering boss, located on its column', 19).fit).toBe('H7/h6');
    expect(tolFor('M8 clearance hole', 9).fit).toBe('H11/h11');
  });
  it('a part that locates nothing carries no tolerance, which is the point', () => {
    for (const n of ['leg, 40 × 40 box section', 'mug body, thrown', 'frame tube', 'landing foot, printed']) {
      const t = tolFor(n, 40);
      expect(Number.isFinite(t.tol), `${n} should carry no tolerance`).toBe(false);
      expect(t.why).toMatch(/locates off it/);
    }
  });
  it('a sealing face gets a real but loose tolerance', () => {
    const g = tolFor('gasket face', 180);
    expect(Number.isFinite(g.tol)).toBe(true);
    expect(g.tol).toBeGreaterThan(itBand(180, 7) / 2);
  });
  it('the tolerance it derives is tighter for a smaller feature', () => {
    expect(tolFor('bearing seat', 10).tol).toBeLessThan(tolFor('bearing seat', 100).tol);
  });
});

describe('the stack', () => {
  it('four parts at ±0.1 are ±0.4 worst case and ±0.2 in a batch', () => {
    const s = stackOf([1, 2, 3, 4].map((i) => ({ of: `part ${i}`, tol: 0.1 })));
    expect(s.worst).toBeCloseTo(0.4, 4);
    expect(s.rss).toBeCloseTo(0.2, 4);
    expect(s.n).toBe(4);
  });
  it('it names the part that dominates, because that is the one to tighten', () => {
    const s = stackOf([{ of: 'a', tol: 0.5 }, { of: 'b', tol: 0.05 }, { of: 'c', tol: 0.05 }]);
    expect(s.biggest.of).toBe('a');
    expect(s.says).toMatch(/83 %/);
  });
  it('a part with no tolerance is not in the chain', () => {
    const s = stackOf([{ of: 'a', tol: 0.1 }, { of: 'a frame member', tol: Infinity }]);
    expect(s.n).toBe(1);
    expect(s.worst).toBeCloseTo(0.1, 4);
    expect(stackOf([{ of: 'x', tol: Infinity }]).says).toMatch(/no chain/);
  });
  it('the RSS is never worse than the worst case and never better than the biggest single part', () => {
    const parts = [{ of: 'a', tol: 0.2 }, { of: 'b', tol: 0.1 }, { of: 'c', tol: 0.05 }];
    const s = stackOf(parts);
    expect(s.rss).toBeLessThanOrEqual(s.worst);
    expect(s.rss).toBeGreaterThanOrEqual(0.2);
  });
});

describe('capability', () => {
  it('the normal integral is the one from the tables', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 6);
    expect(normCdf(1)).toBeCloseTo(0.8413, 3);
    expect(normCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normCdf(3)).toBeCloseTo(0.99865, 4);
    expect(normCdf(-3)).toBeCloseTo(0.00135, 4);
  });
  it('a process asked for what it holds is Cp 1 and about 2,700 parts per million out', () => {
    const c = capable({ holds: 0.05, wanted: 0.05 });
    expect(c.sigma).toBeCloseTo(0.0167, 3);
    expect(c.cp).toBeCloseTo(1, 1);
    expect(c.ppm).toBeGreaterThan(2000);
    expect(c.ppm).toBeLessThan(3500);
    expect(c.ok).toBe(true);
  });
  it('asked for a third of what it holds, it scraps most of them and says how many to start', () => {
    const c = capable({ holds: 0.05, wanted: 0.017 });
    expect(c.cpk).toBeLessThan(0.5);
    expect(c.ok).toBe(false);
    expect(c.make(2)).toBeGreaterThan(2);
    expect(c.says).toMatch(/scrap|to get one/);
  });
  it('asked for four times what it holds, it is comfortable and starts no spares', () => {
    const c = capable({ holds: 0.05, wanted: 0.2 });
    expect(c.cp).toBeGreaterThan(1.33);
    expect(c.make(10)).toBe(10);
    expect(c.says).toMatch(/comfortable/);
  });
  it('a mean off centre costs capability even when the spread is fine', () => {
    const centred = capable({ holds: 0.05, wanted: 0.05 });
    const off = capable({ holds: 0.05, wanted: 0.05, offset: 0.03 });
    expect(off.cpk).toBeLessThan(centred.cpk);
    expect(off.ppm).toBeGreaterThan(centred.ppm);
    expect(off.cp, 'the spread has not changed, only where it sits').toBeCloseTo(centred.cp, 2);
  });
  it('make(n) is monotonic and never fewer than n', () => {
    const c = capable({ holds: 0.05, wanted: 0.02 });
    expect(c.make(1)).toBeGreaterThanOrEqual(1);
    expect(c.make(10)).toBeGreaterThanOrEqual(c.make(1));
    expect(c.make(10)).toBeGreaterThanOrEqual(10);
  });
});

describe('what the machine is really holding', () => {
  it('nothing measured is said as nothing measured', () => {
    expect(measured([], { holds: 0.05 }).trust).toBe('too few');
    expect(measured([], { holds: 0.05 }).says).toMatch(/nothing measured/);
  });
  it('three parts is too few to say, but a mean offset is worth correcting from the first', () => {
    const m = measured([0.03, 0.031, 0.029], { holds: 0.05 });
    expect(m.trust).toBe('too few');
    expect(m.mean).toBeCloseTo(0.03, 3);
    expect(m.says).toMatch(/worth correcting/);
  });
  it('thirty parts is a study, and it is believed over the class figure', () => {
    const errs = Array.from({ length: 40 }, (_, i) => 0.01 * Math.sin(i));
    const m = measured(errs, { holds: 0.5 });
    expect(m.trust).toBe('real');
    expect(m.holds).toBeLessThan(0.5);
    expect(m.says).toMatch(/believe this over the class figure/);
  });
  it('a tighter machine measures tighter', () => {
    const tight = measured(Array.from({ length: 30 }, (_, i) => 0.001 * ((i % 3) - 1)));
    const loose = measured(Array.from({ length: 30 }, (_, i) => 0.05 * ((i % 3) - 1)));
    expect(tight.holds).toBeLessThan(loose.holds);
  });
});

describe('what a cutter does, and what it refuses', () => {
  it('every material has a cutting force, and steel costs more than wood', () => {
    for (const k of Object.keys(CUTTING)) expect(KC[k as keyof typeof CUTTING], k).toBeGreaterThan(0);
    expect(KC['metal-hard']).toBeGreaterThan(KC.wood);
  });
  it('a 3 mm two-flute in aluminium: the trade\'s own figures come back', () => {
    const c = cutAt({ d: 3, z: 2, material: 'metal-soft' });
    expect(c.vc).toBeCloseTo(Math.PI * 3 * CUTTING['metal-soft']!.rpm / 1000, 1);
    expect(c.fz).toBeCloseTo(CUTTING['metal-soft']!.feed / (CUTTING['metal-soft']!.rpm * 2), 4);
    expect(c.mrr).toBeGreaterThan(0);
    expect(c.watts).toBeGreaterThan(0);
    expect(c.minCorner).toBeCloseTo(1.5, 4);
    expect(c.maxDepth).toBeCloseTo(9, 4);
  });
  it('a bigger cutter removes more and leaves a bigger corner', () => {
    const small = cutAt({ d: 3, material: 'wood' }), big = cutAt({ d: 8, material: 'wood' });
    expect(big.mrr).toBeGreaterThan(small.mrr);
    expect(big.minCorner).toBeGreaterThan(small.minCorner);
    expect(big.maxDepth).toBeGreaterThan(small.maxDepth);
  });
  it('rubbing instead of cutting is warned about, and so is a stalled spindle', () => {
    const rub = cutAt({ d: 3, z: 40, material: 'metal-soft' });
    expect(rub.warn.join(' ')).toMatch(/rubbing, not cutting/);
    // a 12 mm cutter full width in steel wants 10 W of cut; tell it the spindle has 3 and it says so
    const stalled = cutAt({ d: 12, z: 4, material: 'metal-hard', woc: 12, spindle: 3 });
    expect(stalled.watts).toBeGreaterThan(3);
    expect(stalled.warn.join(' ')).toMatch(/stall/);
  });
  it('an inside corner smaller than the cutter is refused with the cutter that would do it', () => {
    const no = cutRefuses({ cut: cutAt({ d: 6, material: 'metal-soft' }), corner: 1 });
    expect(no.join(' ')).toMatch(/cannot be milled/);
    expect(no.join(' ')).toMatch(/2\.0 mm cutter/);
    expect(cutRefuses({ cut: cutAt({ d: 6, material: 'metal-soft' }), corner: 4 })).toEqual([]);
  });
  it('too deep, too thin and a hole too deep to drill in one go are each refused by their own rule', () => {
    const c = cutAt({ d: 3, material: 'metal-soft' });
    expect(cutRefuses({ cut: c, depth: 40 }).join(' ')).toMatch(/chatters/);
    expect(cutRefuses({ cut: c, wall: 0.5 }).join(' ')).toMatch(/pushed over/);
    expect(cutRefuses({ cut: c, holeD: 3, holeDepth: 40 }).join(' ')).toMatch(/peck it/);
    expect(cutRefuses({ cut: c, depth: 4, wall: 2, holeD: 5, holeDepth: 10 })).toEqual([]);
  });
});

describe('the burr', () => {
  it('every cutting process leaves one somewhere, and says what takes it off', () => {
    for (const p of ['drill', 'mill', 'saw', 'turn', 'laser-co2', 'press']) {
      const b = burrOf(p, 'steel-low', { thickMm: 3, holes: 4, edges: 4 });
      expect(b.side, p).not.toBe('none');
      expect(b.by.length, p).toBeGreaterThan(10);
      expect(b.says.length, p).toBeGreaterThan(40);
    }
  });
  it('adding or forming leaves no burr, and says what it leaves instead', () => {
    const b = burrOf('fff', 'abs', {});
    expect(b.side).toBe('none');
    expect(b.mm).toBe(0);
    expect(b.says).toMatch(/elephant foot|flash/);
  });
  it('a drill burrs both sides and a mill only where the cutter came out', () => {
    expect(burrOf('drill', 'al-6061', { holes: 2 }).side).toBe('both');
    expect(burrOf('mill', 'al-6061', { edges: 2 }).side).toBe('exit');
  });
  it('more holes and more edges cost more deburring time', () => {
    expect(burrOf('drill', 'steel-low', { holes: 20 }).minutes).toBeGreaterThan(burrOf('drill', 'steel-low', { holes: 2 }).minutes);
    expect(burrOf('mill', 'steel-low', { edges: 20 }).minutes).toBeGreaterThan(burrOf('mill', 'steel-low', { edges: 2 }).minutes);
  });
  it('aluminium throws a worse burr than steel, which is what catches a fingertip', () => {
    expect(burrOf('mill', 'al-6061', {}).mm).toBeGreaterThan(burrOf('mill', 'steel-low', {}).mm);
    expect(burrOf('mill', 'al-6061', {}).says).toMatch(/fingertip/);
  });
  it('a punched part has a right way up, and the burr grows with the sheet', () => {
    const thin = burrOf('press', 'steel-low', { thickMm: 1 }), thick = burrOf('press', 'steel-low', { thickMm: 6 });
    expect(thick.mm).toBeGreaterThan(thin.mm);
    expect(thin.says).toMatch(/right way up/);
  });
});

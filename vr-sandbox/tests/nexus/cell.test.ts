// The workshop corner: a printer that runs G-code as a firmware does, a slicer, a kiln that follows its program, a
// furnace that melts metal through its latent heat, the lost-PLA casting process end to end, and recipes put together.

import { describe, expect, it } from 'vitest';
import { BURNOUT, Cell, Furnace, Kiln, METALS, Printer, RECIPES, bill, fillLines, heatTo, patternOf, shapes, slice, stateOf, trapezoid, volumeOf } from '../../src/nexus/cell';

const runFor = (step: (dt: number) => void, secs: number, dt = 0.5) => { for (let t = 0; t < secs; t += dt) step(dt); };

describe('the printer', () => {
  it('moves on a trapezoid: up to speed, along, and down, in the time the profile says', () => {
    const p = trapezoid(100, 50, 1000); expect(p.T).toBeCloseTo(2.05, 6); expect(p.at(p.T)).toBe(100); expect(p.at(p.T / 2)).toBeCloseTo(50, 6);
    const tri = trapezoid(1, 50, 1000); expect(tri.T).toBeCloseTo(2 * Math.sqrt(1 / 1000), 6);
  });
  it('heats its hot end and bed in the minutes real ones take, and holds them there', () => {
    const p = new Printer(); p.load('M104 S210\nM140 S60'); p.step(0.1);
    let hot = 0, bed = 0; for (let t = 0; t < 900 && (!hot || !bed); t += 1) { p.step(1); if (!hot && p.hot.t >= 208) hot = t; if (!bed && p.bed.t >= 58) bed = t; }
    expect(hot).toBeGreaterThan(30); expect(hot).toBeLessThan(240); expect(bed).toBeGreaterThan(40); expect(bed).toBeLessThan(600);
    runFor((d) => p.step(d), 300, 1); expect(Math.abs(p.hot.t - 210)).toBeLessThan(3); expect(Math.abs(p.bed.t - 60)).toBeLessThan(3);
  });
  it('will not extrude cold, as Marlin will not, and skips what it does not know', () => {
    const p = new Printer(); p.load('G28\nG1 X10 E5 F600\nM999'); runFor((d) => p.step(d), 5, 0.1);
    expect(p.log.join(' ')).toMatch(/cold extrusion prevented/); expect(p.beads).toHaveLength(0); expect(p.log.join(' ')).toMatch(/M999: unknown command/);
  });
  it('prints what the slicer makes: a 20 mm cube, layer on layer, the PLA it said', () => {
    const s = slice([{ outline: shapes.rect(20, 20), z0: 0, z1: 10 }]);
    expect(s.layers).toBe(50); expect(s.gcode).toMatch(/M109 S210/); expect(s.grams).toBeGreaterThan(1); expect(s.grams).toBeLessThan(6);
    const p = new Printer(); p.load(s.gcode); runFor((d) => p.step(d), 6 * 3600, 2);
    expect(p.busy).toBe(false); expect(p.message).toBe('Print done');
    expect(Math.max(...p.beads.map((b) => b.z))).toBeCloseTo(10, 1);
    expect(p.grams()).toBeCloseTo(s.grams, 1);
    // every bead within the cube's footprint, round the bed's middle (the purge line aside)
    expect(p.beads.filter((b) => b.z > 0.3).every((b) => Math.abs(b.x1 - 110) <= 10.01 && Math.abs(b.y1 - 110) <= 10.01)).toBe(true);
  });
  it('fills between an outline and its holes, and nowhere else', () => {
    const lines = fillLines(shapes.rect(20, 20), [shapes.rect(10, 10)], 0, 1);
    for (const [a, b] of lines) { const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; expect(Math.abs(mid[0]!) > 5 || Math.abs(mid[1]!) > 5).toBe(true); }
    expect(lines.length).toBeGreaterThan(20);
  });
});

describe('heat for metal', () => {
  it('a charge melts through its latent heat: on the plateau at its melting point, then liquid', () => {
    const al = METALS.find((m) => m.id === 'aluminium')!, g = 500;
    expect(stateOf({ metal: al, g, H: heatTo(al, g, 400) }).T).toBeCloseTo(400, 6);
    const half = heatTo(al, g, al.melt) + (g * al.L) / 2; expect(stateOf({ metal: al, g, H: half })).toMatchObject({ T: al.melt, liquid: 0.5 });
    expect(stateOf({ metal: al, g, H: heatTo(al, g, 720) }).T).toBeCloseTo(720, 6);
    expect(heatTo(al, g, 720) / 1000).toBeCloseTo(0.5 * (0.897 * 640.3 + 397 + 1.18 * 59.7), 0);
  });
  it('the furnace melts half a kilo of aluminium in well under an hour, and the kiln follows its burnout program', () => {
    const f = new Furnace(); f.load(METALS[0]!, 500); f.burner = 1; let t = 0; for (; t < 7200 && (f.metal()!.liquid < 1 || f.metal()!.T < 720); t += 5) f.step(5);
    expect(t).toBeGreaterThan(300); expect(t).toBeLessThan(3600);
    const k = new Kiln(); k.run(BURNOUT); let peak = 0, s = 0; for (; s < 30 * 3600 && k.running; s += 30) { k.step(30); peak = Math.max(peak, k.t); }
    expect(k.running).toBe(false); expect(peak).toBeGreaterThan(725); expect(peak).toBeLessThan(745); expect(s / 3600).toBeGreaterThan(10); expect(s / 3600).toBeLessThan(16);
  });
});

describe('the cell', () => {
  it('casts a gear end to end: pattern printed, invested, burnt out, metal melted and poured, frozen, broken out', () => {
    const made: string[] = [], said: string[] = [];
    const c = new Cell({ made: (m) => made.push(`${m.kind} ${m.name} ${m.g.toFixed(0)} g`), said: (t) => said.push(t) }); c.speed = 600;
    const gear = RECIPES.find((r) => r.id === 'gear')!.printed[0]!;
    expect(c.cast(gear)).toMatch(/Casting gear in aluminium/);
    for (let k = 0; k < 40000 && !made.length; k++) c.step(0.05);
    expect(made[0]).toMatch(/^cast gear \d+ g$/);
    const g = Number(/(\d+) g/.exec(made[0]!)![1]); expect(g).toBeCloseTo((volumeOf(gear.sections) / 1000) * 2.7, -1);
    expect(said.join(' | ')).toMatch(/invested.*burnout.*crucible.*pouring.*frozen solid.*done/);
    expect(c.shelf).toContain('gear');
    expect(volumeOf(patternOf(gear))).toBeGreaterThan(volumeOf(gear.sections));
  });
  it('builds a pan-tilt camera: its parts printed, the rest off the rack, all on the plate', () => {
    const made: { name: string; g: number; spec: string[] }[] = [];
    const c = new Cell({ made: (m) => made.push(m) }); c.speed = 600;
    const r = RECIPES.find((x) => x.id === 'pan-tilt')!; c.build(r);
    for (let k = 0; k < 60000 && !made.some((m) => m.name === r.name); k++) c.step(0.05);
    const dev = made.find((m) => m.name === r.name)!; expect(dev).toBeTruthy();
    expect(dev.g).toBeCloseTo(bill(r).g, 6); expect(c.plate).toEqual(expect.arrayContaining(['base', 'yoke', 'mg996r', 'pi-cam3', 'esp32']));
    expect(dev.spec.join(' ')).toMatch(/9\.4 kg·cm/);
  });
});

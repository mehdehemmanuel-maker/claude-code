// Things built down to their smallest parts, from published figures, and reused: tyres made as they are made, batteries
// by their standards, vehicles from their axles, a computer from its transistors. Each checked against what is published
// (or typical, where that is all there is), and each checked to be stored once however often it is placed.

import { describe, expect, it } from 'vitest';
import { tyreBuilt, tyreOf, makeMachine, MACHINES, rollingOf } from '../../src/nexus/machines';
import { starterBattery, liCell, cellPack, explodeAudit, missingIn } from '../../src/nexus/components';
import { engineBuilt, engineDims, type EngineSpec } from '../../src/nexus/engines';
import type { Part } from '../../src/nexus/kits';
const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)];
import { BCI_GROUPS, CELL_FORMATS } from '../../src/data/batteries';
import { boundsOfAll, distinctCount, exploded, fitIn, massOfAll, partOf, placedCount } from '../../src/nexus/assembly';
import { PROCESSES, transistor, sramCell, die, packageOf, motherboard, desktop, SOCKETS, BOARDS } from '../../src/nexus/computer';
import { LIBRARY, defaultsOf } from '../../src/nexus/blocks';
import * as THREE from 'three';

const run = async (id: string, inputs: Record<string, unknown>, set: Record<string, unknown> = {}) => { const b = LIBRARY.get(id)!; return (await b.run!(inputs, { set: { ...defaultsOf(b), ...set } } as never)) as Record<string, any>; };
const size = (t: Parameters<typeof boundsOfAll>[0]) => boundsOfAll(t).getSize(new THREE.Vector3());

describe('tyres, made as they are made', () => {
  it('weigh what their size weighs, by makers\' listings (typical)', () => {
    // (205/55R16 touring tyres list 8–10 kg; 11R22.5 drive tyres about 50–60 kg; 315/80R22.5 steer tyres about 60–70 kg)
    expect(tyreBuilt(tyreOf('205/55R16')!).kg).toBeGreaterThan(8); expect(tyreBuilt(tyreOf('205/55R16')!).kg).toBeLessThan(10.5);
    const d = tyreBuilt(tyreOf('11R22.5')!, { pattern: 'drive' }).kg; expect(d).toBeGreaterThan(50); expect(d).toBeLessThan(62);
    const s = tyreBuilt(tyreOf('315/80R22.5')!, { pattern: 'rib' }).kg; expect(s).toBeGreaterThan(58); expect(s).toBeLessThan(72);
  });
  it('have a tread of pitches round them, as open as their pattern, and wear bars in their grooves', () => {
    const t = tyreBuilt(tyreOf('205/55R16')!);
    expect(t.pitches).toBeGreaterThan(55); expect(t.pitches).toBeLessThan(75); expect(t.void).toBeGreaterThan(0.2); expect(t.void).toBeLessThan(0.4);
    expect(tyreBuilt(tyreOf('265/70R17')!, { pattern: 'mud' }).void).toBeGreaterThan(t.void);
    expect(placedCount(t.tyre)).toBeGreaterThan(400); expect(distinctCount(t.tyre)).toBeLessThan(10);
    // worn to its bars: its tread 1.6 mm deep, and it weighs less
    const w = tyreBuilt(tyreOf('205/55R16')!, { wear: 1 }); expect(w.depth).toBeCloseTo(0.0016, 6); expect(w.kg).toBeLessThan(t.kg);
  });
  it('are made once and fitted to every wheel that takes them', () => {
    expect(tyreBuilt(tyreOf('205/55R16')!)).toBe(tyreBuilt(tyreOf('205/55R16')!));
    const car = makeMachine(MACHINES.find((m) => m.id === 'corolla')!), tyre = tyreBuilt(tyreOf('205/55R16')!).tyre, f = fitIn(car, '^((outer|inner) )?tyre \\d', tyre);
    expect(f.fitted).toBe(4);
    // (the car's own tyres are built in depth too, all-season: each swapped for this one, piece for piece)
    const own = placedCount(tyreBuilt(tyreOf('205/55R16')!, { pattern: 'all-season' }).tyre);
    expect(placedCount(f.thing)).toBe(placedCount(car) - 4 * own + 4 * placedCount(tyre));
  });
});

describe('batteries, by their standards', () => {
  it('a starting battery is its BCI group\'s size and about its typical mass, six cells of its plates', () => {
    for (const g of Object.values(BCI_GROUPS)) {
      const b = starterBattery(g.group), z = size(b);
      expect(z.x).toBeCloseTo(g.dims[0], 3); expect(z.z).toBeCloseTo(g.dims[1], 3); expect(z.y).toBeCloseTo(g.dims[2], 3);
      expect(Math.abs(massOfAll(b) / g.kg - 1)).toBeLessThan(0.15);
    }
    expect(starterBattery('35')).toBe(starterBattery('35'));
  });
  it('a lithium cell is its format\'s size and its datasheet\'s mass', () => {
    for (const f of Object.values(CELL_FORMATS)) { const c = liCell(f.id), z = size(c); expect(z.x).toBeCloseTo(f.d, 4); expect(z.y).toBeCloseTo(f.L, 4); expect(Math.abs(massOfAll(c) / f.kg - 1)).toBeLessThan(0.06); }
  });
  it('a pack of 4,416 cells stores one cell', () => {
    const p = cellPack({ format: '21700', s: 96, p: 46, modules: [23, 25, 25, 23] });
    expect(placedCount(p)).toBeGreaterThan(4416 * 9); expect(distinctCount(p)).toBeLessThan(20);
    expect(massOfAll(p)).toBeGreaterThan(4416 * CELL_FORMATS['21700']!.kg);
  });
});

describe('vehicles from what they are', () => {
  it('a truck from its axles: two, three or four, each built down to its wheel nuts', async () => {
    const steer = (await run('vehicle.axle', { x: 2.27, track: 2.05, tyre: '315/80R22.5' }, { steer: true, susp: 'leaf' })).axle;
    const drive = (x: number) => run('vehicle.axle', { x, track: 1.85, tyre: '11R22.5' }, { drive: true, dual: true, susp: 'air' }).then((r) => r.axle);
    let last = 0;
    for (const axles of [[steer, await drive(-1.5)], [steer, await drive(-1.5), await drive(-2.8)], [steer, { ...steer, x: 1 }, await drive(-1.5), await drive(-2.8)]]) {
      const v = await run('vehicle', { axles, L: 7.2 }, { kind: 'truck', power: 'diesel', extras: 'cab, tanks, stacks, fifth wheel' });
      expect(v.pieces).toBeGreaterThan(last); last = v.pieces; expect(v.wheelbase).toBeCloseTo(2.27 - axles[axles.length - 1].x, 6);
    }
  });
  it('taken apart, its pieces move out from its middle; put back, it is as it was', () => {
    const car = makeMachine(MACHINES.find((m) => m.id === 'rental kart')!), a = size(exploded(car, 1, 2)), b = size(exploded(car, 0, 2));
    expect(a.x).toBeGreaterThan(b.x * 1.3); expect(b.x).toBeCloseTo(size(car).x, 6);
  });
  it('on hinged wheels it rolls when pushed (as F t over its mass, less what its wheels take to spin), where as one body it is held by friction', async () => {
    const v = makeMachine(MACHINES.find((m) => m.id === 'corolla')!), r = rollingOf(v), m = massOfAll(r.thing), F = 4000;
    const body = r.thing.items[0]!.of.name, push = { name: body, force: [F, 0, 0], seconds: 1 };
    const rolled = await run('letgo', { things: r.thing, joints: r.joints, push, t: 3 }, { seconds: 3 });
    const sp = rolled.ends.find((e: { name: string }) => e.name === body).speed, want = F / m;
    // (its wheels take some of the push to spin: at most as if all of each wheel's mass were at its rim, so it does no worse
    // than F over its mass and its wheels' mass again)
    const wheels = r.thing.items.slice(1).reduce((a, it) => a + massOfAll(it.of), 0);
    expect(sp).toBeLessThan(want); expect(sp).toBeGreaterThan(F / (m + wheels));
    const rigid = await run('letgo', { things: { name: 'car', items: [{ of: v, at: [0, 0, 0], rot: [0, 0, 0], s: 1 }] }, push: { ...push, name: v.name }, t: 3 }, { seconds: 3 });
    expect(rigid.ends[0].speed).toBeLessThan(0.05);
  }, 120000);
});

describe('a computer down to the transistor', () => {
  it('a FinFET at its process\'s published pitches', () => {
    const pr = PROCESSES['intel-14nm']!, t = transistor('intel-14nm', 'n', 2), z = size(t);
    expect(z.x).toBeCloseTo(pr.cpp, 12); expect(z.z).toBeGreaterThanOrEqual(2 * pr.finPitch); expect(z.z).toBeLessThan(2 * pr.finPitch + 20e-9);
    expect(t.parts!.filter((p) => p.name === 'fin')).toHaveLength(2);
  });
  it('an SRAM bit is six transistors on its published bit-cell area', () => {
    for (const pr of Object.values(PROCESSES)) { const c = sramCell(pr.id), z = size(c); expect(z.x * z.z).toBeCloseTo(pr.sram, 18); expect(c.items.filter((it) => /FET/.test(it.of.name))).toHaveLength(6); }
  });
  it('a die of billions of transistors stores a few dozen things, at a density near its process\'s', () => {
    const d = die({ proc: 'intel-14nm', cores: 4, coreMm2: 7, l2KB: 256, l3MB: 8, uncoreMm2: 50 });
    expect(d.transistors).toBeGreaterThan(1e9); expect(distinctCount(d.die)).toBeLessThan(40); expect(placedCount(d.die)).toBeGreaterThan(1e10);
    const dens = d.transistors / (d.w * d.d / 1e-6) / 1e6; expect(dens).toBeGreaterThan(PROCESSES['intel-14nm']!.density * 0.4); expect(dens).toBeLessThan(PROCESSES['intel-14nm']!.density);
  });
  it('its package, board and PC are their standards\' sizes', () => {
    const d = die({ proc: 'intel-14nm', cores: 4, coreMm2: 7, l2KB: 256, l3MB: 8, uncoreMm2: 50 }), p = packageOf(d.die, 'LGA1151'), b = motherboard('ATX', p);
    expect(size(p).x).toBeCloseTo(SOCKETS.LGA1151!.w, 6); expect(size(b).x).toBeCloseTo(BOARDS.ATX!.w, 6); expect(size(b).z).toBeCloseTo(BOARDS.ATX!.d, 6);
    const pc = desktop(b); expect(placedCount(pc)).toBeGreaterThan(placedCount(b)); expect(distinctCount(pc)).toBeLessThan(120);
    expect(massOfAll(pc)).toBeGreaterThan(4); expect(massOfAll(pc)).toBeLessThan(15);
  });
});

describe('designs that come apart to the bottom', () => {
  it('the highway tractor\'s every fitting is drawn whole: no lumps, every recipe met', () => {
    const a = explodeAudit(makeMachine(MACHINES.find((m) => m.id === 'cascadia')!));
    expect(a.faked).toEqual([]); expect(a.missing).toEqual([]); expect(a.lumps).toBe(0); expect(a.tagged).toBeGreaterThan(200);
    // (what is not built yet is said, by mass: its stand-in for what is not drawn, and pieces nothing identifies)
    expect(a.says).toMatch(/only said, not built/); expect(a.unbuilt).toBeGreaterThan(0); expect(a.score).toBeLessThan(1);
  });
  it('a piece named for an assembly and drawn as one is found, with what it should come apart into', () => {
    const a = explodeAudit({ name: 'lamp on a bracket', parts: [{ name: 'bracket', shape: { box: [0.1, 0.01, 0.1] }, mat: 'steel-low' }, { name: 'headlight (left)', shape: { box: [0.2, 0.2, 0.2] }, mat: 'pc' }] });
    expect(a.faked).toHaveLength(1); expect(a.faked[0]!.is).toBe('headlamp'); expect(a.faked[0]!.of.join(' ')).toMatch(/lens/); expect(a.lumps).toBeGreaterThan(0.5);
  });
  it('what still is a lump is said (a car\'s headlamps); its doors are built round their skins, part by part', () => {
    const car = makeMachine(MACHINES.find((m) => m.id === 'corolla')!), a = explodeAudit(car);
    expect(a.faked.map((f) => f.is)).toContain('headlamp'); expect(a.faked.map((f) => f.is)).not.toContain('door');
    const doors = all(car).filter((p) => p.item === 'car-door');
    expect(doors).toHaveLength(4); for (const d of doors) expect(missingIn(d)).toEqual([]);
    expect(all(car).filter((p) => p.item === 'door-inner-panel').length).toBeGreaterThanOrEqual(2);
  });
});

describe('made the way things are made: general makers, nodes, and explode inside explode', () => {
  it('a starting battery is made by the same makers the board uses, down to each plate\'s grid and paste', () => {
    const b = starterBattery('35'), a = explodeAudit(partOf(b));
    expect(a.faked).toEqual([]); expect(a.missing).toEqual([]);
    const names = new Set<string>(); const walk = (p: { name: string; parts?: unknown[] }) => { names.add(p.name); for (const q of (p.parts ?? []) as typeof p[]) walk(q); }; walk(partOf(b));
    for (const n of ['cast grid', 'positive paste', 'negative paste', 'separator envelope', 'strap 1', 'intercell connector 1', 'positive post (SAE)', 'lid']) expect([...names].some((x) => x.startsWith(n)), n).toBe(true);
  });
  it('the board\'s battery, node by node, weighs what a group 35 does and comes apart to the bottom', async () => {
    const pw = 0.1636, ph = 0.1299, grid = (lug: string) => run('make.grid', { w: pw, h: ph, t: 0.0011, bars: 7, wires: 9, rim: 0.003 }, { lug });
    const cp = (await run('make.coat', { part: (await grid('right')).grid, t: 0.00035, fill: 0.2 }, { color: '#4a2c1c' })).coated;
    const cn = (await run('make.coat', { part: (await grid('left')).grid, t: 0.0002, fill: 0.2 }, { name: 'negative plate', item: 'plate-negative', layer: 'negative paste', layerItem: 'paste-negative' })).coated;
    const wp = (await run('make.wrap', { part: cp })).wrapped, st = (await run('make.stack', { things: [cn, wp], n: 13, pitch: 0.00264, y: ph / 2 })).stack;
    const cell = (await run('make.strap', { thing: st })).joined, en = await run('make.enclosure', { L: 0.2302, W: 0.1746, H: 0.1954 });
    const filled = (await run('make.into', { thing: cell, into: en.case })).filled, ser = await run('make.strap', { thing: filled }, { path: '^strap \\d+$', series: true, name: 'intercell connector', item: 'la-intercell' });
    expect(ser.ends).toHaveLength(2); expect(ser.count).toBe(5);
    const acid = (await run('make.fill', { into: en.case, L: en.cellL, W: en.cellW, h: ph + 0.012, share: 0.55 })).filled;
    const all = { name: 'battery', items: [en.case, ser.joined, acid, en.lid].map((x) => ({ of: x, at: [0, 0, 0] as [number, number, number], rot: [0, 0, 0] as [number, number, number], s: 1 })) };
    expect(Math.abs(massOfAll(all) / BCI_GROUPS['35']!.kg - 1)).toBeLessThan(0.2);
  });
  it('taken apart to the bottom, a plate inside a cell inside the battery comes apart too; focused, only that piece opens', () => {
    const b = starterBattery('35'), whole = size(b), apart = size(exploded(b, 0.6));
    expect(apart.x).toBeGreaterThan(whole.x * 1.3);
    const focus = exploded(b, 0.6, 64, /^cell/) as { items: { of: { name: string } }[] }, lid = focus.items.find((it) => it.of.name === 'lid')!, lid0 = b.items.find((it) => it.of.name === 'lid')!;
    expect((lid as unknown as { at: number[] }).at).toEqual(lid0.at);
  });
  it('vehicles carry real batteries: a car its group 35 over its gearbox, the truck three group 31s in a box, an EV its pack of cells', () => {
    const car = makeMachine(MACHINES.find((m) => m.id === 'corolla')!), truck = makeMachine(MACHINES.find((m) => m.id === 'cascadia')!);
    const has = (p: { name: string; parts?: unknown[] }, re: RegExp): boolean => re.test(p.name) || ((p.parts ?? []) as typeof p[]).some((q) => has(q, re));
    expect(has(car, /^battery and its tray$/)).toBe(true); expect(has(truck, /^battery box/)).toBe(true);
    expect(explodeAudit(truck).missing).toEqual([]);
  });
});

describe('an engine from its first parts', () => {
  it('weighs what its parts come to, every recipe met, no mass said for any piece', () => {
    const gx = engineBuilt({ cyl: 1, bore: 0.077, stroke: 0.058, fuel: 'petrol', block: 'al', cooling: 'air', cams: 'ohv', valves: 2, starter: 'recoil' });
    // (Honda gives the GX270 25 kg dry, with its fuel tank, governor and control base, none of them drawn here; the engine
    // drawn comes to about 19.5 kg since its counterweights were sized to pass under its piston's skirt: within a quarter)
    expect(gx.kg).toBeGreaterThan(18.75); expect(gx.kg).toBeLessThan(30);
    for (const s of [{ cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al' }, { cyl: 6, bore: 0.139, stroke: 0.163, fuel: 'diesel', block: 'iron', turbo: true }, { cyl: 2, bore: 0.078, stroke: 0.076, layout: 'vee', fuel: 'petrol', block: 'al', cooling: 'air', cams: 'ohv', valves: 2 }] as EngineSpec[]) {
      const e = engineBuilt(s); expect(missingIn(e.engine)).toEqual([]);
      const a = explodeAudit(e.engine); expect(a.lumps).toBe(0); expect(a.unbuilt).toBe(0); expect(a.pieces).toBeGreaterThan(300);
    }
  });
  it('is what the vehicles carry: the Corolla\'s is Toyota\'s bore and stroke, sized by its parts', () => {
    const car = makeMachine(MACHINES.find((m) => m.id === 'corolla')!), eng = (car.parts ?? []).find((p) => /^petrol engine/.test(p.name))!;
    expect(eng.item).toBe('engine-ice'); expect(all(eng).filter((p) => p.item === 'piston-assembly')).toHaveLength(4);
    expect(all(eng).filter((p) => p.item === 'valve-intake' || p.item === 'valve-exhaust')).toHaveLength(16);
  });
  it('its piston at the top of its stroke, its rod\'s length apart from its pin', () => {
    const s: EngineSpec = { cyl: 4, bore: 0.0805, stroke: 0.0976, fuel: 'petrol', block: 'al' }, d = engineDims(s);
    expect(d.deck - (d.r + d.L + d.CH)).toBeCloseTo(0, 9); expect(d.L / d.S).toBeCloseTo(1.6, 9);
  });
});

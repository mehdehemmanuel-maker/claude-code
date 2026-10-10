import { describe, expect, it } from 'vitest';
import { fk, flangeOf, ik, UR5E } from '../../src/nexus/dharm';
import { FR3, FRANKA_HAND } from '../../src/nexus/franka';
import { massOf } from '../../src/nexus/mass';
import * as THREE from 'three';
import { componentOf, robotPart, ROBOT_CELL } from '../../src/nexus/components';
import { contacts, layout, type Node } from '../../src/nexus/make/space';
import { pixelsAcross, robotFor, robotTasks, SENSORS, TASKS } from '../../src/nexus/robot';
import { resolve } from '../../src/nexus/inventory';

describe('arms by their DH tables: the UR5e', () => {
  it('puts its flange where Universal Robots\' table does at zero: stretched out, 817.2 mm along, 232.9 across, 62.8 up', () => {
    const f = flangeOf(UR5E, [0, 0, 0, 0, 0, 0]); expect(f.at[0]).toBeCloseTo(-817.2, 1); expect(f.at[1]).toBeCloseTo(-232.9, 1); expect(f.at[2]).toBeCloseTo(62.8, 1);
    expect(fk(UR5E, [0, 0, 0, 0, 0, 0]).length).toBe(7);
  });
  it('finds the joints that put its tool on a point pointing down, and says when a point is out of reach', () => {
    const r = ik(UR5E, [400, 200, 150], [0, 0, -1]); expect(r.miss).toBeLessThan(0.1); expect(r.off).toBeLessThan(0.5);
    const f = flangeOf(UR5E, r.q); expect(f.z[2]).toBeLessThan(-0.99);
    expect(ik(UR5E, [2000, 0, 0], null).miss).toBeGreaterThan(900);
  });
  it('is drawn by the library, each joint a group its program turns', () => {
    const it0 = resolve('robotarm UR5e'); if (!it0 || typeof it0 === 'string') throw new Error(String(it0));
    const c = componentOf(it0.id)!; expect(c).toBeTruthy(); const names: string[] = []; const walk = (p: { name: string; parts?: unknown[] }) => { names.push(p.name); for (const q of (p.parts ?? []) as { name: string }[]) walk(q); }; walk(c.part);
    for (let k = 1; k <= 6; k++) expect(names.some((n) => n.endsWith(` joint ${k}`)), `joint ${k}`).toBe(true);
    expect(names.some((n) => /tool flange/.test(n))).toBe(true);
  });
});

describe('arms by their DH tables: the Franka Research 3\'s seven joints (modified DH)', () => {
  it('puts its flange where Franka\'s table does: 88 mm out and 926 up at zero, 307 out and 590 up at its rest pose', () => {
    const z = flangeOf(FR3, [0, 0, 0, 0, 0, 0, 0]); expect(z.at[0]).toBeCloseTo(88, 6); expect(z.at[1]).toBeCloseTo(0, 6); expect(z.at[2]).toBeCloseTo(926, 6); expect(z.z[2]).toBeCloseTo(-1, 9);
    const h = flangeOf(FR3, FR3.home!); expect(h.at[0]).toBeCloseTo(306.9, 1); expect(h.at[2]).toBeCloseTo(590.3, 1); expect(h.z[2]).toBeCloseTo(-1, 9);
    // (the base's frame, each joint's, and its flange's)
    expect(fk(FR3, FR3.home!).length).toBe(9);
  });
  it('finds seven joint angles within its limits that put its tool on a point pointing down', () => {
    for (const at of [[500, 0, 200], [400, -250, 350], [300, 300, 100]] as [number, number, number][]) {
      const r = ik(FR3, at, [0, 0, -1]); expect(r.miss, `${at}`).toBeLessThan(0.1); expect(r.off, `${at}`).toBeLessThan(0.5); expect(r.q.length).toBe(7);
      r.q.forEach((v, k) => { expect(v).toBeGreaterThanOrEqual(FR3.limits![k]![0]); expect(v).toBeLessThanOrEqual(FR3.limits![k]![1]); });
    }
    // (past its 855 mm reach it says how far it misses)
    expect(ik(FR3, [1500, 0, 333], null).miss).toBeGreaterThan(300);
  });
  it('is drawn by the library with its Franka Hand on, each joint a group its program turns, weighing what Franka\'s model says its links and its hand do', () => {
    const it0 = resolve('robotarm FR3'); if (!it0 || typeof it0 === 'string') throw new Error(String(it0));
    const c = componentOf(it0.id)!; expect(c.faults).toEqual([]); const all: { name: string; item?: string }[] = []; const walk = (p: { name: string; item?: string; parts?: unknown[] }) => { all.push(p); for (const q of (p.parts ?? []) as typeof p[]) walk(q); }; walk(c.part);
    for (let k = 1; k <= 7; k++) expect(all.some((n) => n.name.endsWith(` joint ${k}`)), `joint ${k}`).toBe(true);
    expect([all.filter((p) => p.item === 'joint-drive').length, all.filter((p) => p.item === 'joint-torque-sensor').length]).toEqual([7, 7]);
    expect(all.filter((p) => p.item === 'robothand-franka-hand').length).toBe(1);
    // (its links' and its hand's own masses, and the few grams of the lines drawn between its links)
    expect(Math.abs(massOf(c.part) - (FR3.kg.reduce((a, b) => a + b, 0) + FRANKA_HAND.kg + 2 * FRANKA_HAND.finger))).toBeLessThan(0.1);
  });
});

describe('the robot drawn from its parts', () => {
  const walk = (p: { name: string; item?: string; parts?: unknown[] }, out: { name: string; item?: string }[] = []) => { out.push(p); for (const q of (p.parts ?? []) as typeof p[]) walk(q, out); return out; };
  for (const w of ['robothand RH56DFX', 'robothand 2F-85', 'toolchanger QC-11', 'ftsensor Nano17', 'depthcamera D435', 'gassensor BME688', 'robot jarvis']) it(`draws ${w} with every part its inventory lists`, () => {
    const it0 = resolve(w); if (!it0 || typeof it0 === 'string') throw new Error(`${w}: ${String(it0)}`);
    const c = componentOf(it0.id); expect(c, w).toBeTruthy(); expect(c!.faults, w).toEqual([]);
  });
  it('puts two arms, two hands with a Nano17 at each index fingertip, two changers and its senses on the robot', () => {
    const it0 = resolve('robot jarvis'); if (!it0 || typeof it0 === 'string') throw new Error(String(it0));
    const all = walk(componentOf(it0.id)!.part), n = (id: string) => all.filter((p) => p.item === id).length;
    expect([n('robotarm-ur5e'), n('robothand-rh56dfx'), n('toolchanger-qc-11'), n('ftsensor-nano17'), n('depthcamera-d435'), n('camera-module'), n('microphone-mems'), n('gassensor-bme688')]).toEqual([2, 2, 2, 2, 1, 1, 1, 1]);
  });
  // (the drawing and the design as one edge: each camera, from where it is drawn, sees what its tasks need; the arms
  // clear each other and the mast)
  const robot = () => { const it0 = resolve('robot jarvis'); if (!it0 || typeof it0 === 'string') throw new Error(String(it0)); return componentOf(it0.id)!.part; };
  it('sees from where its cameras are drawn what its tasks need: the wrist camera a 0.6 mm lead, the D435 a centimetre, the work in each one\'s view', () => {
    // (the wrist camera watches what its own hand works on, the D435 the whole work)
    const nodes = layout(robot()), { work: w, reach } = ROBOT_CELL;
    for (const [item, id, task] of [['camera-module', 'cam3', 'solder'], ['depthcamera-d435', 'd435', 'see']] as const) {
      const n = nodes.find((x) => x.p.item === item)!, c = SENSORS.find((x) => x.id === id)!, t = TASKS.find((x) => x.id === task)!, work = new THREE.Vector3(id === 'cam3' ? reach : w[0], w[1], w[2]).multiplyScalar(0.001);
      const at = new THREE.Vector3().setFromMatrixPosition(n.m), face = new THREE.Vector3(0, 0, 1).transformDirection(n.m), to = work.clone().sub(at), d = to.length() * 1000;
      const off = (face.angleTo(to) * 180) / Math.PI, need = id === 'd435' ? t.depth! : t.see!;
      expect(off, `${id} looks ${off.toFixed(0)}° off the work`).toBeLessThan((c.fig.hfov ?? 60) / 2);
      expect(pixelsAcross(c, need[0], d), `${id} at ${d.toFixed(0)} mm`).toBeGreaterThanOrEqual(3);
      if (c.fig.near) expect(d).toBeGreaterThan(c.fig.near);
    }
  });
  it('keeps its two arms clear of each other and of its mast', () => {
    const nodes = layout(robot()), top = (n: Node): string => { let x = n; while (x.parent?.parent) x = x.parent; return x.p.name; };
    const clash = contacts(nodes).map((c) => [top(c.a), top(c.b)]).filter(([a, b]) => a !== b && /arm$|mast$/.test(a!) && /arm$|mast$/.test(b!));
    expect(clash).toEqual([]);
  });
  it('draws a robot for only what it is asked, a gripper or a hand as its tasks pick', () => {
    for (const words of ['design a robot that can solder and type on a computer', 'build a robot that can solder and hear', 'make a robot that can type and smell', 'build a robot that can weld and hear', 'design a robot that can grab things and see']) {
      const d = robotFor(robotTasks(words)!).robot, p = robotPart(d); if (typeof p === 'string') throw new Error(`${words}: ${p}`);
      const all = walk(p), n = (id: string) => all.filter((q) => q.item === id).length, has = (s: string) => d.senses.some((x) => x.sense === s);
      expect([n('robotarm-ur5e'), n('toolchanger-qc-11'), n('camera-module'), n('depthcamera-d435'), n('microphone-mems'), n('gassensor-bme688'), n('ftsensor-nano17')], words)
        .toEqual([d.arms.length, d.arms.filter((a) => a.changer).length, has('sight') ? 1 : 0, has('depth') ? 1 : 0, has('hearing') ? 1 : 0, has('smell') ? 1 : 0, has('touch') ? d.arms.length : 0]);
      expect(n('robothand-2f-85') + n('robothand-rh56dfx'), words).toBe(d.arms.length);
      const nodes = layout(p), top = (x: Node): string => { let y = x; while (y.parent?.parent) y = y.parent; return y.p.name; };
      expect(contacts(nodes).map((c) => [top(c.a), top(c.b)]).filter(([a, b]) => a !== b && /arm$|mast$/.test(a!) && /arm$|mast$/.test(b!)), words).toEqual([]);
    }
  });
});

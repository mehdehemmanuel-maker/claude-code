import { describe, expect, it } from 'vitest';
import { fk, flangeOf, ik, UR5E } from '../../src/nexus/dharm';
import * as THREE from 'three';
import { componentOf, ROBOT_CELL } from '../../src/nexus/components';
import { contacts, layout, type Node } from '../../src/nexus/make/space';
import { pixelsAcross, SENSORS, TASKS } from '../../src/nexus/robot';
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

describe('the robot drawn from its parts', () => {
  const walk = (p: { name: string; item?: string; parts?: unknown[] }, out: { name: string; item?: string }[] = []) => { out.push(p); for (const q of (p.parts ?? []) as typeof p[]) walk(q, out); return out; };
  for (const w of ['robothand RH56DFX', 'toolchanger QC-11', 'ftsensor Nano17', 'depthcamera D435', 'gassensor BME688', 'robot jarvis']) it(`draws ${w} with every part its inventory lists`, () => {
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
});

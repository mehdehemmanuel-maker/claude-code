// The construction firewall, attacked. Every illegal thing here dies at the first boundary it meets: the constructor's
// language cannot say it, the document's gate refuses it, the physics' intake refuses it, the solver cannot be made to
// drive it, the renderer has nothing declared to draw for it. Found when a walker stood in the world on servo joints
// with no servo in them, drawing torque from no battery on commands from the solver's clock (docs/LAW-TREE-INTEGRITY.md).

import { describe, expect, it } from 'vitest';
import { machine, rig, type Rig } from './helpers';
import { ConstructionRefused, judgeConnection, judgePart, standingOf } from '../../src/ganglia/tree/gate';
import { DocStore } from '../../src/doc/store';
import { addConnection, addPart, makeConnection, makePart, newDoc, refuse } from '../../src/doc/commands';
import { decodeDocText, encodeDocText } from '../../src/persistence/codec';
import { getServo, SHAFT_Q } from '../../src/data/servos';
import { getMaterial } from '../../src/data/materials';
import { hardwareOf } from '../../src/render/hardware';
import { PART_KINDS } from '../../src/parts/registry';
import type { Connection, Part, Pose, Quat } from '../../src/doc/types';
import type { Controller, Pack, Receiver, Servo, Solid } from '../../src/construct/build';

const I: Quat = [0, 0, 0, 1];
const pose = (p: [number, number, number], q: Quat = I): Pose => ({ p, q });
/** The law a refusal cites, from a thrown refusal or a returned one. */
const lawOf = (fn: () => unknown): string => {
  try { const r = fn(); return r && typeof r === 'object' && 'law' in r ? String((r as { law: string }).law) : 'none'; } catch (e) { return e instanceof ConstructionRefused ? e.refusal.law : `other: ${(e as Error).message}`; }
};

/**
 * A micro servo on a frozen mount with a level 20 cm aluminium arm on its horn, under gravity, with whatever of its
 * chain is asked for: a pack wired to it, a receiver (powered) with a lead carrying the steer stick.
 */
async function arm(opts: { pack?: boolean; wireServo?: boolean; board?: boolean; lead?: boolean }) {
  const r = await rig({}, false);
  const sv = getServo('servo.micro-9g'), [l, w, h] = sv.dims;
  const HORN = 0.003;
  const { out, store } = machine(r, (b) => {
    const mount = b.place('block', [0, 1.0125, 0], I, { x: 0.025, y: 0.025, z: 0.025 }, 'mount', { material: 'steel.a36', frozen: true });
    const servo = b.place('servo', [0, 1.025 + w / 2, 0], I, { model: sv.id }, 'servo');
    servo.fasten({ thin: w, at: [0, -w / 2, 0] }, mount, { thin: 0.025, at: [0, 0.0125, 0] }, [l, h], 'screwed');
    const shaft = servo.worldOf(servo.shaft).p;
    const armPart = b.place('block', [shaft[0] + 0.1, shaft[1], shaft[2] + HORN + 0.005], I, { x: 0.2, y: 0.01, z: 0.01 }, 'arm', { material: 'aluminum.6061-t6' });
    const horn = servo.horn(armPart, { p: [-0.1, 0, -0.005 - HORN], q: SHAFT_Q });
    let pack: Pack | null = null, rx: Receiver | null = null, wire: string | null = null;
    if (opts.pack) pack = b.place('battery', [-0.2, 1, 0], I, { model: 'battery.nimh.aa', series: 4, parallel: 1, charge: 1 }, 'pack', { frozen: true });
    if (opts.board) rx = b.place('receiver', [-0.2, 1.1, 0], I, {}, 'receiver', { frozen: true });
    if (pack && opts.wireServo) wire = pack.wire(servo);
    if (pack && rx) pack.wire(rx);
    if (rx && opts.lead) rx.stick(servo, 'steer', 0.5);
    return { horn, servo, wire };
  });
  r.world.apply({ op: 'controls', channels: { steer: 0 } });
  return { r, store, ...out };
}

const extent = (r: Rig, id: string) => r.world.connectionLoad(id)!.extent;

describe('the firewall: no actuator without its chain', () => {
  it('torque with no battery: a servo wired to nothing is a free hinge; its arm falls and it draws nothing', async () => {
    const { r, horn } = await arm({ board: true, lead: true, pack: false });
    let p;
    try {
      for (let i = 0; i < 90; i++) p = r.world.step().power;
      expect(Math.abs(extent(r, horn))).toBeGreaterThan(0.5);
      expect(p?.servos?.[horn]).toMatchObject({ I: 0, V: 0, battery: null, commanded: false });
    } finally { r.done(); }
  });

  it('torque with a disconnected battery: cut the wire and the arm that was held level drops', async () => {
    const { r, horn, wire } = await arm({ pack: true, wireServo: true, board: true, lead: true });
    try {
      for (let i = 0; i < 90; i++) r.world.step();
      expect(Math.abs(extent(r, horn))).toBeLessThan(0.1);
      r.world.apply({ op: 'removeConnection', id: wire! });
      let p;
      for (let i = 0; i < 90; i++) p = r.world.step().power;
      expect(Math.abs(extent(r, horn))).toBeGreaterThan(0.5);
      expect(p?.servos?.[horn]?.I).toBe(0);
    } finally { r.done(); }
  });

  it('a command from inside physics: a powered servo with no lead is commanded by nothing and holds nothing', async () => {
    const { r, horn } = await arm({ pack: true, wireServo: true, board: true, lead: false });
    try {
      let p;
      for (let i = 0; i < 90; i++) p = r.world.step().power;
      expect(Math.abs(extent(r, horn))).toBeGreaterThan(0.5);
      expect(p?.servos?.[horn]?.commanded).toBe(false);
      expect(p?.servos?.[horn]?.V).toBeGreaterThan(4);
    } finally { r.done(); }
  });

  it('a zero-latency or forged command is nothing: only a powered board\'s own lead, stamped for this tick, commands', async () => {
    const { r, horn, servo, store } = await arm({ pack: true, wireServo: true, board: true, lead: true });
    const W = r.world as unknown as { commands: Map<string, { tick: number; board: string; lead: string; aim: number }>; ticks: number };
    try {
    for (let i = 0; i < 30; i++) r.world.step();
    // every standing command was made for the tick to come, by a board part that exists, down a lead that exists
    for (const cmd of W.commands.values()) {
      expect(cmd.tick).toBe(W.ticks);
      expect(store.doc.parts[cmd.board]?.kind).toBe('receiver');
      expect(store.doc.connections[cmd.lead]?.kind).toBe('signal');
    }
    // the stick at rest: the arm is held level
    expect(Math.abs(extent(r, horn))).toBeLessThan(0.1);
    // a forged command for this tick from a board that is not there, and a stale one from last tick: both ignored
    W.commands.set(servo.id, { tick: W.ticks, board: 'nobody', lead: 'nothing', aim: 1 });
    r.world.step();
    expect(Math.abs(extent(r, horn))).toBeLessThan(0.1);
    const real = W.commands.get(servo.id)!;
    W.commands.set(servo.id, { ...real, tick: W.ticks - 1, aim: 1 });
    r.world.step();
    expect(Math.abs(extent(r, horn))).toBeLessThan(0.1);
    } finally { r.done(); }
  });

  it('a manually injected solver actuator: an aim and a torque written onto an unpowered horn are gone by the next tick', async () => {
    const { r, horn } = await arm({ pack: false });
    const W = r.world as unknown as { conns: Map<string, { aim?: number; servoScale: number }> };
    const c = W.conns.get(horn)!;
    try {
      c.aim = 0.5;
      c.servoScale = 1;
      let p;
      for (let i = 0; i < 90; i++) p = r.world.step().power;
      expect(c.aim).toBeUndefined();
      expect(c.servoScale).toBe(0);
      expect(p?.servos?.[horn]?.torque ?? 0).toBeLessThan(1e-4);
      expect(Math.abs(extent(r, horn))).toBeGreaterThan(0.5);
    } finally { r.done(); }
  });
});

describe('the firewall: no joint without its parts', () => {
  it('torque with no servo body: a servo horn between two bars is refused by the document and by the physics', async () => {
    const store = new DocStore(newDoc('t'));
    const a = addPart(store, { kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const b = addPart(store, { kind: 'block', pose: pose([0.1, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    expect(lawOf(() => addConnection(store, { kind: 'servo', a: { part: a.id, frame: pose([0.05, 0, 0]) }, b: { part: b.id, frame: pose([-0.05, 0, 0]) }, params: {} }))).toBe('K-9');
    expect(Object.keys(store.doc.connections)).toEqual([]);
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const pa = r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const pb = r.part('block', pose([0.1, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    expect(lawOf(() => r.connect('servo', { part: pa, frame: pose([0.05, 0, 0]) }, { part: pb, frame: pose([-0.05, 0, 0]) }, {}))).toBe('K-9');
    expect(r.world.connectionLoad('anything')).toBeFalsy();
    r.done();
  });

  it('a joint attached to empty space: 5 cm off its part, or on a part that does not exist', () => {
    const store = new DocStore(newDoc('t'));
    const a = addPart(store, { kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const b = addPart(store, { kind: 'block', pose: pose([0.1, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    expect(lawOf(() => addConnection(store, { kind: 'hinge', a: { part: a.id, frame: pose([0.1, 0, 0]) }, b: { part: b.id, frame: pose([0, 0, 0]) }, params: {} }))).toBe('K-8');
    expect(lawOf(() => addConnection(store, { kind: 'hinge', a: { part: a.id, frame: pose([0.05, 0, 0]) }, b: { part: 'p_nobody', frame: pose([-0.05, 0, 0]) }, params: {} }))).toBe('K-6');
    expect(Object.keys(store.doc.connections)).toEqual([]);
  });

  it('fake actuator metadata: a hinge given a torque, a block called a servo', () => {
    const store = new DocStore(newDoc('t'));
    const a = addPart(store, { kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 }, name: 'servo' });
    const b = addPart(store, { kind: 'block', pose: pose([0.1, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    expect(lawOf(() => makeConnection({ kind: 'hinge', a: { part: a.id, frame: pose([0.05, 0, 0]) }, b: { part: b.id, frame: pose([-0.05, 0, 0]) }, params: { maxTorque: 40, rhythm: 2 } }))).toBe('K-2');
    expect(lawOf(() => addConnection(store, { kind: 'servo', a: { part: a.id, frame: pose([0.05, 0, 0]) }, b: { part: b.id, frame: pose([-0.05, 0, 0]) }, params: {} }))).toBe('K-9');
  });

  it('a malformed template makes no partial servo: an unpublished model, a horn off the shaft, a second horn, a wire between servos, a stick on a controller\'s lead', async () => {
    expect(lawOf(() => makePart({ kind: 'servo', pose: pose([0, 1, 0]), params: { model: 'servo.unicorn' } }))).toBe('K-2');
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const sv = getServo('servo.micro-9g');
    expect(lawOf(() => machine(r, (b) => {
      const s = b.place('servo', [0, 1, 0], I, { model: sv.id }, 's');
      const bar = b.place('block', [0.035, 1, 0.0145 + 0.003 + 0.005], I, { x: 0.05, y: 0.01, z: 0.01 }, 'bar', { material: 'polymer.pla' });
      // the two ends one place, but 5 mm from the shaft
      return b.connect('servo', { part: s.id, frame: { p: [0.005 + 0.005, 0, 0.0145], q: SHAFT_Q } }, { part: bar.id, frame: { p: [-0.025, 0, -0.008], q: SHAFT_Q } }, {});
    }))).toBe('K-9');
    expect(lawOf(() => machine(r, (b) => {
      const s = b.place('servo', [0, 2, 0], I, { model: sv.id }, 's');
      const bar = b.place('block', [0.055, 2, 0.0145 + 0.003 + 0.005], I, { x: 0.1, y: 0.01, z: 0.01 }, 'bar', { material: 'polymer.pla' });
      // a second bar at the same place (the one-horn law is judged as the horn is made, before the construction
      // closes on the two bars sharing space)
      const bar2 = b.place('block', [0.055, 2, 0.0145 + 0.003 + 0.005], I, { x: 0.1, y: 0.01, z: 0.01 }, 'bar2', { material: 'polymer.pla' });
      s.horn(bar);
      return s.horn(bar2);
    }))).toBe('K-10');
    expect(lawOf(() => machine(r, (b) => {
      const s1 = b.place('servo', [0, 3, 0], I, { model: sv.id }, 's1');
      const s2 = b.place('servo', [0.1, 3, 0], I, { model: sv.id }, 's2');
      return b.connect('wire', { part: s1.id, frame: pose([-0.0115, 0, 0]) }, { part: s2.id, frame: pose([-0.0115, 0, 0]) }, { gauge: '18', length: 0.2 });
    }))).toBe('K-9');
    expect(lawOf(() => machine(r, (b) => {
      const s = b.place('servo', [0, 4, 0], I, { model: sv.id }, 's');
      const ctl = b.place('controller', [0.1, 4, 0], I, { rhythm: 2 }, 'ctl');
      return b.connect('signal', { part: ctl.id, frame: pose([0.02, 0, 0]) }, { part: s.id, frame: pose([-0.0115, 0, 0]) }, { swing: 0.3, phase: 0, wave: 'sine', channel: 'steer', length: 0.2 });
    }))).toBe('K-9');
    r.done();
  });
});

describe('the firewall: no part where another is, nothing unauthorised, nothing after the fact', () => {
  it('overlapping bonded parts: the second block is refused where the first stands, before any bond', async () => {
    const store = new DocStore(newDoc('t'));
    addPart(store, { kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    expect(lawOf(() => addPart(store, { kind: 'block', pose: pose([0.05, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } }))).toBe('K-5');
    expect(Object.keys(store.doc.parts).length).toBe(1);
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    expect(lawOf(() => r.part('block', pose([0.05, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } }))).toBe('K-5');
    r.done();
  });

  it('an invalid object inserted after construction: the physics refuses it, reports it, and never holds it', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    r.part('block', pose([0, 1, 0]), { material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const bad = makePart({ kind: 'block', pose: pose([0.02, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const refusal = r.world.apply({ op: 'upsertPart', part: bad, material: getMaterial(bad.material), keepLivePose: false });
    expect(refusal && refusal.law).toBe('K-5');
    const res = r.world.step();
    expect(res.events.some((e) => e.type === 'refused' && e.id === bad.id && e.law === 'K-5')).toBe(true);
    expect(r.world.livePose(bad.id)).toBeFalsy();
    r.done();
  });

  it('physics receiving an object no template authorised: a part of no known kind', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const fake: Part = { id: 'p_fake', kind: 'unicorn', name: 'unicorn', material: 'steel.a36', params: {}, pose: pose([0, 1, 0]), frozen: false, assembly: null, features: [], damage: { broken: [], segments: null } };
    expect(lawOf(() => judgePart(standingOf(newDoc('t')), fake))).toBe('K-1');
    expect(lawOf(() => makePart({ kind: 'unicorn', pose: pose([0, 1, 0]) }))).toMatch(/^other/);
    expect(r.world.livePose('p_fake')).toBeFalsy();
    r.done();
  });

  it('replay or a saved file restoring an illegal actuator: the file decodes, the document refuses to open it', () => {
    const doc = newDoc('t');
    const a = makePart({ kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const b = makePart({ kind: 'block', pose: pose([0.1, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const c: Connection = makeConnection({ kind: 'servo', a: { part: a.id, frame: pose([0.05, 0, 0]) }, b: { part: b.id, frame: pose([-0.05, 0, 0]) }, params: {} });
    doc.parts[a.id] = a;
    doc.parts[b.id] = b;
    doc.connections[c.id] = c;
    doc.materials['steel.a36'] = getMaterial('steel.a36');
    const text = encodeDocText(doc);
    const back = decodeDocText(text);
    expect(Object.keys(back.connections).length).toBe(1);
    expect(lawOf(() => new DocStore(back))).toBe('K-9');
    const store = new DocStore(newDoc('t'));
    expect(lawOf(() => store.replace(back))).toBe('K-9');
    expect(Object.keys(store.doc.connections).length).toBe(0);
  });

  it('a label is not a machine: blocks named like a dog on hinges, told to walk, go nowhere and draw nothing', async () => {
    const r = await rig({ gravity: [0, 0, 0] }, false);
    const body = r.part('block', pose([0, 1, 0]), { material: 'wood.birch-plywood', params: { x: 0.2, y: 0.01, z: 0.16 } });
    const thigh = r.part('block', pose([0.08, 0.97, 0.09]), { material: 'polymer.pla', params: { x: 0.008, y: 0.05, z: 0.008 } });
    (body as { name: string }).name = 'dog-body';
    (thigh as { name: string }).name = 'dog-rf-hip-servo';
    const hinge = r.connect('hinge', { part: body, frame: { p: [0.08, -0.005, 0.08], q: SHAFT_Q } }, { part: thigh, frame: { p: [0, 0.025, -0.01], q: SHAFT_Q } }, { pin: 0.004 });
    r.world.apply({ op: 'gait', amplitude: { [hinge.id]: 1 } });
    const before = r.world.livePose(thigh.id)!.p;
    let p;
    for (let i = 0; i < 180; i++) p = r.world.step().power;
    const after = r.world.livePose(thigh.id)!.p;
    expect(Math.hypot(after[0] - before[0], after[1] - before[1], after[2] - before[2])).toBeLessThan(1e-3);
    expect(p?.servos ?? {}).toEqual({});
    r.done();
  });

  it('the construction gate cites a law for every refusal', () => {
    const store = new DocStore(newDoc('t'));
    const a = addPart(store, { kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    const judged = judgeConnection(standingOf(store.doc), makeConnection({ kind: 'wire', a: { part: a.id, frame: pose([0.05, 0, 0]) }, b: null, params: {} }));
    expect(judged?.law).toBe('K-6');
  });

  it('a refusal reported by the physics removes the thing from the document: one source of truth', () => {
    const store = new DocStore(newDoc('t'));
    const a = addPart(store, { kind: 'block', pose: pose([0, 1, 0]), material: 'steel.a36', params: { x: 0.1, y: 0.1, z: 0.1 } });
    refuse(store, 'part', a.id, 'test');
    expect(store.doc.parts[a.id]).toBeUndefined();
  });
});

describe('the firewall: nothing drawn that is not there', () => {
  it('a renderer-only servo: a servo horn declares a horn and no case; an unknown joint declares nothing', () => {
    const horn = hardwareOf({ id: 'c', kind: 'servo', a: { part: 'a', frame: pose([0, 0, 0]) }, b: null, params: { offset: 0 }, state: { status: 'intact', cure: 0, note: '' } });
    expect(horn.prims.every((g) => g.shape !== 'box')).toBe(true);
    expect(horn.prims.length).toBe(1);
    const unknown = hardwareOf({ id: 'c', kind: 'unicorn', a: { part: 'a', frame: pose([0, 0, 0]) }, b: null, params: {}, state: { status: 'intact', cure: 0, note: '' } });
    expect(unknown.prims).toEqual([]);
    expect(unknown.dynamic).toBe('none');
  });

  it('no invisible body and no bodiless picture: every part kind has both a collision shape and a visual', () => {
    for (const k of PART_KINDS) {
      expect(typeof k.collision, k.id).toBe('function');
      expect(typeof k.visual, k.id).toBe('function');
    }
  });
});

// keep the language's handle types in the test's vocabulary: what cannot be said is a type error here, not a runtime one
void ((_: Servo | Controller | Solid) => _);

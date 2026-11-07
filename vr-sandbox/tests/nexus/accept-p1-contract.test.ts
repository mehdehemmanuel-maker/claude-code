// P1, the component contract (plan/AUDIT.md §4 and §5.1): a read over what exists. piece.shaft, piece.bearing,
// seed.robot-arm and a board folded round the arm give one set of contract keys; a bolt offers an interface; the kinds
// cover the directive's ten classes; the arm's freedom equals its revolute joints.
import { expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, contractOf, defaultsOf, register } from '../../src/nexus/blocks';
import { Engine, Memo, emptyBoard, groupBlock, placeBlock, wire, type Env } from '../../src/nexus/dataflow';
import { run } from '../../src/nexus/view/code-worker';
import { MATES, PORT_CLASSES, classOf, interfacesOf, kindOfLine, lineKind, type InterfaceKind } from '../../src/nexus/interfaces';
import { motionOf } from '../../src/nexus/sim';
import type { Block } from '../../src/nexus/room';

const env: Env = { code: async (lang, code, inputs) => (await run({ id: 0, lang: lang as 'js', code, facts: {}, input: '', vars: inputs })).value };
async function built(id: string, set: Record<string, unknown> = {}): Promise<Block> {
  const b = emptyBoard(id); placeBlock(b, id, 0, 0, set, 'x'); const e = new Engine(b, env, new Memo()); await e.run();
  const bad = [...e.state].filter(([, s]) => s.status !== 'ok'); expect(bad.map(([n, s]) => `${n}: ${s.error}`)).toEqual([]);
  return e.state.get('x')!.out!.block as Block;
}

it('component contract', async () => {
  const shaft = LIBRARY.get('piece.shaft')!, bearing = LIBRARY.get('piece.bearing')!, arm = LIBRARY.get('seed.robot-arm')!;
  // (a board of the arm, folded by groupBlock into one block: an assembly as a component)
  const inner = emptyBoard('the robot arm, folded'); placeBlock(inner, 'seed.robot-arm', 0, 0, {}, 'arm');
  placeBlock(inner, 'group.out', 0, 0, { name: 'block', type: 'block' }, 'out'); wire(inner, 'arm', 'block', 'out', 'value');
  const group = groupBlock(inner, { id: 'test.p1-arm-folded', name: 'Robot arm, folded' }); register(group);
  const made = { shaft: await built(shaft.id), bearing: await built(bearing.id), arm: await built(arm.id), group: await built(group.id) };
  const cs = { shaft: contractOf(shaft, {}, made.shaft), bearing: contractOf(bearing, {}, made.bearing), arm: contractOf(arm, {}, made.arm), group: contractOf(group, {}, made.group) };
  const keys = Object.fromEntries(Object.entries(cs).map(([k, c]) => [k, Object.keys(c).sort().join(',')]));
  console.log('contract keys', keys.shaft);
  for (const [k, c] of Object.entries(cs)) console.log(`${k}: ${c.id} type ${JSON.stringify(c.type)} geometry ${c.geometry.by} ${c.geometry.pieces} pieces; ${c.parameters.length} parameters (${c.parameters.filter((p) => p.unit).map((p) => `${p.key} ${p.unit}`).join(', ') || 'no units stated'}); materials ${c.materials?.join('|')}; ${c.ports?.length} ports (${[...new Set(c.ports?.map((p) => p.kind))].join(', ')}); freedom ${c.freedom} (${c.freedomSays}); ${c.constraints?.length} faces; ${c.tolerances?.length} toleranced; deps ${c.deps.map((d) => `${d.id}×${d.n}`).join(' ') || 'none'}; variants ${c.variants.map((v) => `${v.key}(${v.choices.length})`).join(' ') || 'none'}; models ${c.models.length}; make ${c.make.length}; standards ${c.standards.length}; validation ${c.validation.kind}; tests ${c.tests}`);
  expect(new Set(Object.values(keys)).size).toBe(1);
  // (the fold keeps what it folds: the same pieces, ports and freedom as the arm itself)
  expect(cs.group.geometry.pieces).toBe(cs.arm.geometry.pieces);
  expect(cs.group.ports!.length).toBe(cs.arm.ports!.length);
  expect(cs.group.freedom).toBe(cs.arm.freedom);
  expect(cs.group.deps).toEqual([{ id: 'seed.robot-arm', n: 1, found: true }]);
  // (a unit where a setting states one: piece.shaft's "Length, mm")
  expect(cs.shaft.parameters.find((p) => p.key === 'length')).toMatchObject({ unit: 'mm', unitFrom: 'its label', value: 200 });
  expect(cs.shaft.parameters.find((p) => p.key === 'length')!.si).toBeCloseTo(0.2, 12);

  // a bolt offers at least one interface
  const bolt = interfacesOf(await built('piece.bolt', defaultsOf(LIBRARY.get('piece.bolt')!))).list;
  console.log('piece.bolt interfaces', bolt.map((x) => `${x.id} ${x.kind} mates ${x.mates.join('|')} (${x.says})`).join('; '));
  expect(bolt.length).toBeGreaterThan(0);

  // the kinds cover every class the directive names (4E)
  const kinds = Object.keys(MATES) as InterfaceKind[], covered = new Set(kinds.flatMap((k) => [...classOf(k)]));
  console.log('classes', PORT_CLASSES.map((c) => `${c}: ${kinds.filter((k) => classOf(k).includes(c)).join(', ')}`).join('; '));
  for (const c of PORT_CLASSES) expect(covered.has(c), c).toBe(true);
  expect(PORT_CLASSES.length).toBe(10);

  // the arm's freedom, printed, equals its revolute joints
  const m = motionOf(made.arm), revolute = m.joints.filter((j) => j.turns && !j.slide && !j.ball && !j.screw).length;
  console.log(`seed.robot-arm (its defaults: ${cs.arm.parameters.map((p) => `${p.key} ${String(p.value)}`).join(', ')}): ${m.freedomSays}; revolute ${revolute}; its joints ${m.joints.map((j) => `${m.bodies[j.a]!.name} on ${m.bodies[j.b]!.name}`).join('; ')}`);
  console.log('seed.robot-arm ports', cs.arm.ports!.map((p) => `${p.id} ${p.kind}`).join('; '));
  expect(m.freedom).toBe(revolute);
  expect(revolute).toBeGreaterThan(0);
}, 30000);

it('component contract: a line kind read from today\'s names', async () => {
  // (each from a piece as it is made today: the name decides, as kindOfLine reads it)
  const read: [string, InterfaceKind][] = [['608 inner ring/axis', 'shaft'], ['G1/2 ball valve body/axis', 'fluid'], ['G1/2 ball valve stem/axis', 'shaft'], ['DIP-8 body/leads', 'signal'],
    ['AA cell + terminal/axis', 'power'], ['Arduino Uno R3 USB-B jack joint/axis', 'data'], ['5 mm LED lens/axis', 'optical'], ['HC-SR04 ultrasonic transmitter/axis', 'acoustic'],
    ['angle bracket 90x90x65x2.5 foot/holes', 'holes'], ['ISO 15552 Ø50 cylinder rear cap/port', 'fluid'], ['M5 button head/socket', 'drive']];
  for (const [port, kind] of read) expect(kindOfLine(port), port).toBe(kind);
  expect(kindOfLine({ port: '608 inner ring/axis', kind: 'thermal' })).toBe('thermal');
  // (every line every piece makes at its defaults, by the kind read: how much of the library each class reaches today)
  const t0 = Date.now(), by = new Map<string, number>(), fails: string[] = [];
  for (const [id, d] of LIBRARY) { if (!id.startsWith('piece.') || !d.run) continue;
    try { const b = (await d.run({}, { set: defaultsOf(d) }) as { block: Block }).block; for (const p of b.pieces) for (const l of p.lines) { const k = lineKind(l).kind; by.set(k, (by.get(k) ?? 0) + 1); } }
    catch (e) { fails.push(`${id}: ${(e as Error).message.slice(0, 60)}`); } }
  console.log(`lines by kind read (${Date.now() - t0} ms): ${[...by].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}; not made at defaults: ${fails.length} (${fails.join('; ')})`);
  for (const k of ['power', 'signal', 'fluid', 'optical', 'acoustic', 'data'] as InterfaceKind[]) expect(by.get(k) ?? 0, k).toBeGreaterThan(0);
}, 30000);

// Creatures with bodies: a swimmer of real parts and servos swims because the water pushes back harder across a face
// than along it, and only then: with its rhythm stopped it goes nowhere.

import { describe, expect, it } from 'vitest';
import { rig } from './helpers';
import { buildSwimmer, SWIMMERS } from '../../src/world/creature';
import { DocStore } from '../../src/doc/store';
import { newDoc } from '../../src/doc/commands';
import { getMaterial } from '../../src/data/materials';

async function swim(rhythm: number, seconds: number) {
  const sea = { id: 'w_000000sea001', name: 'the sea', min: [-30, -5, -30] as [number, number, number], max: [30, 0.5, 30] as [number, number, number], density: 1025 };
  const r = await rig({ fluids: [sea] }, false);
  const store = new DocStore(newDoc('swim'));
  const plan = { ...SWIMMERS['whale']!, rhythm };
  const { parts, joints } = buildSwimmer(store, plan, [0, 0.5, 0], 0);
  const doc = store.doc;
  for (const id of parts) r.world.apply({ op: 'upsertPart', part: doc.parts[id]!, material: getMaterial(doc.parts[id]!.material), keepLivePose: false });
  for (const id of joints) r.world.apply({ op: 'upsertConnection', conn: doc.connections[id]!, materials: { 'polymer.hdpe': getMaterial('polymer.hdpe') } });
  const head = () => r.world.livePose(parts[0]!)!.p;
  r.run(1); // settle into the water
  const start = head();
  r.run(seconds);
  const end = head();
  const broken = joints.filter((id) => r.world.connectionStatus?.(id) === 'broken').length;
  r.done();
  return { forward: end[0] - start[0], side: end[2] - start[2], depth: end[1], broken };
}

describe('a swimmer', () => {
  it('swims forward by its own wave: more than half its length in ten seconds, head first', async () => {
    const s = await swim(1.5, 10);
    expect(s.forward).toBeGreaterThan(0.25);
    expect(Math.abs(s.side)).toBeLessThan(s.forward);
    expect(s.depth).toBeLessThan(0.55);
  }, 120000);

  it('with its rhythm stopped it goes nowhere: the thrust is the water\'s, not given', async () => {
    const s = await swim(0, 10);
    expect(Math.abs(s.forward)).toBeLessThan(0.05);
  }, 120000);
});

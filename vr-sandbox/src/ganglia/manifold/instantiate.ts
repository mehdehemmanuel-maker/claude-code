// INSTANTIATE: the last action, from a realised member to parts in the world, through the construction language and
// so through the gate. Only what a stocked datasheet realises can be placed: a pack of a stocked chemistry, a disc
// rotor on a stocked DC machine. Everything else the engineer found is constructible but not placeable here, and
// says which part kind it waits on.
import type { DocStore } from '../../doc/store';
import type { Quat, Vec3 } from '../../doc/types';
import { construct } from '../../construct/build';
import { getBattery } from '../../data/batteries';
import { packSize } from '../../parts/registry';
import { motorEnvelope } from '../../parts/registry';
import { getMaterial } from '../../data/materials';
import type { Candidate } from './engineer';
import type { Step } from './actions';

export interface Instance { parts: string[]; joints: string[]; steps: Step[]; says: string }

/** What a candidate waits on before it can be placed, or null when it can be. */
export function waitsOn(k: Candidate): string | null {
  if (!k.member.instantiable) return `a part kind for ${k.store.name}`;
  const c = k.converters.find((x) => !x.member.instantiable);
  return c ? `a stocked ${c.manifold.name}` : null;
}

/** Place a candidate in a document at `at`, yawed by `q`, as one construction; or say why it cannot be placed here. */
export function instantiate(k: Candidate, store: DocStore, at: Vec3, q: Quat, tag: string): Instance | { refused: string } {
  const why = waitsOn(k);
  if (why) return { refused: `constructible, not placeable here: it waits on ${why}` };
  const steps: Step[] = [];
  if (k.member.realization && k.store.mechanism === 'electrochemical') {
    const b = getBattery(k.member.realization);
    const { series, parallel, packs } = k.member.parameters as { series: number; parallel: number; packs: number };
    const params = { model: b.id, series, parallel, charge: 1 };
    const size = packSize(params);
    const out = construct(store, `a ${k.store.name} for the contract`, at, q, tag, (bld) => {
      // packs side by side along x, a finger's width apart
      for (let i = 0; i < packs; i++) bld.place('battery', [i * (size[0] + 0.01), size[1] / 2, 0], [0, 0, 0, 1], params, packs > 1 ? `pack${i + 1}` : 'pack');
      return { parts: bld.parts, joints: bld.joints };
    });
    steps.push({ verb: 'INSTANTIATE', from: k.store.id, to: out.parts[0]!, says: `${packs > 1 ? `${packs} packs of ` : ''}${series} × ${parallel} ${b.label.split(',')[0]}` });
    return { ...out, steps, says: `placed: ${k.member.says}` };
  }
  if (k.store.mechanism === 'inertial' && k.member.realization) {
    const machine = k.converters.find((x) => x.manifold.id === 'convert.electrical.rotational');
    if (!machine?.member.realization) return { refused: 'constructible, not placeable here: it waits on a stocked electromagnetic machine' };
    const m = getMaterial(k.member.realization);
    const r = k.member.parameters['radius']!, t = k.member.parameters['thickness']!;
    const motorParams = { model: machine.member.realization, gearhead: 'none' };
    const env = motorEnvelope(motorParams);
    const out = construct(store, `a ${k.store.name} for the contract`, at, q, tag, (bld) => {
      // the machine stands on its back on the bench, shaft up; the rotor sits on its shaft face, driven by it
      const motor = bld.place('motor.dc', [0, env.length / 2, 0], [0, 0, 0, 1], motorParams, 'machine', { frozen: true });
      const disc = bld.place('disc', [0, env.length + t / 2, 0], [0, 0, 0, 1], { diameter: 2 * r, thickness: t }, 'rotor', { material: m.id });
      motor.drive(disc, { p: [0, -t / 2, 0], q: [0, 0, 0, 1] }, { channel: 'always', currentLimit: Math.max(1, Math.round(motor.ratedCurrent)) });
      return { parts: bld.parts, joints: bld.joints };
    });
    steps.push({ verb: 'INSTANTIATE', from: k.store.id, to: out.parts[1]!, says: `a ${m.name} disc on the machine's shaft` });
    return { ...out, steps, says: `placed: ${k.member.says}, on ${machine.member.says}` };
  }
  return { refused: `constructible, not placeable here: no placement is written for ${k.store.name} yet` };
}

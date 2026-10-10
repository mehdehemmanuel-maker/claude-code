// What can be had: the kept sections as a catalogue of configuration leaves, and a kept matter's constitutive values
// as measured leaves. An availability set is a constraint inside a space, never the space.

import { getMaterial } from '../../data/materials';
import { DRESSED_SOURCE, DRESSED_SPECIES, LUMBER, LUMBER_SOURCE } from '../../data/lumber';
import { ofLeaf, type Derivation } from '../substrate/evaluate';
import type { Option } from '../substrate/solve';
import { leaf } from '../substrate/term';

export interface MaterialLeaves { id: string; density: Derivation; E: Derivation; strength: Derivation }

/** A kept material's constitutive values as measured leaves, each with the handbook that reports it. */
export function materialLeaves(id: string): MaterialLeaves {
  const m = getMaterial(id);
  const src = `${m.name}: ${m.source} (${m.confidence})`;
  const l = (name: string, v: number, unit: string) => ofLeaf(leaf(`${name} of ${m.name}`, v, unit, { class: 'measured', source: src }));
  return { id, density: l('density', m.density, 'kg/m^3'), E: l('modulus', m.E, 'Pa'), strength: l('strength (modulus of rupture)', m.ultimate, 'Pa') };
}

/** The sawn-lumber sizes as a catalogue: each dressed section in both orientations, configuration leaves with their source. */
export function lumberCatalogue(): Option[] {
  const src = `${LUMBER_SOURCE}; kept in src/data/lumber.ts`;
  const out: Option[] = [];
  for (const [size, [t, w]] of Object.entries(LUMBER)) {
    const l = (name: string, v: number) => leaf(name, v, 'm', { class: 'configuration', source: src });
    out.push({ label: `${size} on edge`, leaves: { b: l(`${size} breadth (on edge)`, t), h: l(`${size} depth (on edge)`, w) } });
    if (t !== w) out.push({ label: `${size} flat`, leaves: { b: l(`${size} breadth (flat)`, w), h: l(`${size} depth (flat)`, t) } });
  }
  return out;
}

/** The kept matters the lumber sections are dressed in, with their values, and where that availability is stated. */
export function dressedMatters(): { matters: { name: string; leaves: MaterialLeaves }[]; source: string } {
  return { matters: DRESSED_SPECIES.map((id) => ({ name: getMaterial(id).name, leaves: materialLeaves(id) })), source: DRESSED_SOURCE };
}

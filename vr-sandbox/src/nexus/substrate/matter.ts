// What a region is made of. A matter has, for each carrier, properties in roles: how readily the carrier crosses it
// (a conductivity), how much it stores (a density, a capacity per mass), how it resists momentum (a stiffness), the
// most flux density and the highest potential it bears, how much it grows per degree, and the potentials of one
// carrier at which its other properties change (above which it flows, below which it holds its shape). Matters come
// from two places: what the intent states of a region's matter, and the kept material data, which is an
// availability set (what can be had) with sources. A role the language can read but no matter states is a gap in
// the knowledge, not in the language, and is reported as such.

import { MATERIALS } from '../../data/materials';
import { leaf, type Leaf } from '../lang/term';
import type { MatterRole, Region } from '../ask/want';

export interface Property { carrier: string; role: MatterRole; leaf: Leaf }
export interface Matter { id: string; name: string; properties: Property[] }

/** The kept material data as matters: density, stiffness and strength for momentum, conductivity for charge, each measured with its source. */
export function keptMatters(): Matter[] {
  return MATERIALS.map((m) => {
    const src = `src/data/materials.ts ${m.id}: ${m.source} (${m.confidence})`;
    const l = (name: string, v: number, unit: string) => leaf(`${name} of ${m.name}`, v, unit, { class: 'measured', source: src });
    const props: Property[] = [
      { carrier: 'momentum', role: 'density', leaf: l('density', m.density, 'kg/m^3') },
      { carrier: 'momentum', role: 'stiffness', leaf: l('modulus', m.E, 'Pa') },
      { carrier: 'momentum', role: 'most flux density', leaf: l('strength', m.yield, 'Pa') },
    ];
    if (m.conductivity > 0) props.push({ carrier: 'charge', role: 'conductivity', leaf: l('electrical conductivity', m.conductivity, 'S/m') });
    return { id: m.id, name: m.name, properties: props };
  });
}

/** What a region states of the matter it holds, by carrier and role. */
export function statedOf(r: Region): Property[] {
  return Object.entries(r.properties ?? {}).map(([sym, p]) => ({ carrier: p.of, role: p.role, leaf: r.quantities[sym]! })).filter((p) => !!p.leaf);
}

export const propertyOf = (props: Property[], carrier: string, role: MatterRole): Leaf | null => props.find((p) => p.carrier === carrier && p.role === role)?.leaf ?? null;

/**
 * The matter to make something of, from what is available: every matter that states the role, the one with the most
 * (or least) of it picked; when none states it, what the knowledge lacks.
 */
export function chooseMatter(matters: Matter[], carrier: string, role: MatterRole, prefer: 'most' | 'least'): { pick: Matter | null; value: Leaf | null; candidates: Matter[]; lacks: string | null } {
  const candidates = matters.filter((m) => propertyOf(m.properties, carrier, role));
  if (!candidates.length) return { pick: null, value: null, candidates, lacks: `no available matter states its ${role} for ${carrier}` };
  const v = (m: Matter) => propertyOf(m.properties, carrier, role)!.value!;
  const pick = candidates.reduce((a, b) => (prefer === 'most' ? (v(b) > v(a) ? b : a) : v(b) < v(a) ? b : a));
  return { pick, value: propertyOf(pick.properties, carrier, role), candidates, lacks: null };
}

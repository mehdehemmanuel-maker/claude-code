// THE BOOK'S OWN VOCABULARY OF QUANTITIES — derived from it, not written beside it.
//
// A DIMENSION IS NOT A QUANTITY, and conflating them is the deepest fault this project has had. Metrology keeps
// three things apart and so does this file:
//
//   a DIMENSION          the algebra: kg m^-3. Many unrelated things share one.
//   a KIND OF QUANTITY   a named physical sort: density, mass, length, torque. Density is ONE entry here.
//   a QUANTITY           that kind, of a specific thing: the density of this gear. `know` in substrate/derive.ts
//                        returns one of these.
//
// So torque and kinetic energy are different QUANTITY_KINDS sharing one dimension (kg m^2 s^-2), and a chain pitch and a
// pendulum length are different kinds sharing m. Binding a law's port by dimension alone cannot tell them apart,
// which is exactly how `calculate` once read a sprocket's pitch as a pendulum's length and returned an "impact
// speed" for it. Measured over the book: 115 distinct kinds share the dimensionless 1, 78 share m, and 27 share
// kg m^2 s^-2 — among them torque, kinetic energy and bending moment.
//
// NOTHING HERE IS A WRITTEN-DOWN LIST. The book already names every port of every law, 572 distinct names used in
// anger, and that IS the vocabulary. This file groups them, works out which are the same kind, and reports the
// places where the book contradicts itself.

import { BOOK } from '../book';
import { dimOf, dimText, sameDim, type Dim } from '../lang/dimension';

/** A name as the vocabulary holds it: lower case, punctuation gone, single spaces. */
export const plain = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The HEAD of a name: what sort of thing it is, with its qualifiers dropped. `wheel radius` and `bend radius` are
 *  both radii; `kinetic energy` and `potential energy` are both energies. This is what makes a port named `radius`
 *  able to take a `wheel radius` while still refusing a `height`. */
export const head = (t: string): string => {
  const w = plain(t).split(' ');
  // a trailing coordinate or index is a qualifier, not the head: `extent x`, `temperature 2`
  while (w.length > 1 && /^(x|y|z|1|2|in|out|a|b|of|the|its)$/.test(w[w.length - 1]!)) w.pop();
  return w[w.length - 1] ?? plain(t);
};

/** A KIND OF QUANTITY in metrology's sense: density, mass, torque. Not `kinds/`'s Kind, which is a trade's
 *  catalogue of things you can make. */
export interface QuantityKind {
  /** the name as the book writes it, plainly */ name: string;
  /** what sort of thing it is, qualifiers dropped */ head: string;
  /** every dimension the book uses this name with — more than one is a FAULT, reported by `homonyms` */ dims: string[];
  /** the units it is written in */ units: string[];
  /** laws that take it */ takenBy: string[];
  /** laws that give it */ givenBy: string[];
}

const build = (): Map<string, QuantityKind> => {
  const by = new Map<string, QuantityKind>();
  for (const l of BOOK) {
    for (const [p, dir] of [...l.inputs.map((x) => [x, 'in'] as const), [l.output, 'out'] as const]) {
      const name = plain(p.name);
      const k = by.get(name) ?? by.set(name, { name, head: head(p.name), dims: [], units: [], takenBy: [], givenBy: [] }).get(name)!;
      const d = dimText(dimOf(p.unit));
      if (!k.dims.includes(d)) k.dims.push(d);
      if (!k.units.includes(p.unit)) k.units.push(p.unit);
      (dir === 'in' ? k.takenBy : k.givenBy).push(l.id);
    }
  }
  return by;
};

/** EVERY KIND OF QUANTITY THE BOOK SPEAKS OF, by its name. Built once from the book itself. */
export const QUANTITY_KINDS: Map<string, QuantityKind> = build();

/** The kinds that share a head: every radius, every energy, every force. */
export const byHead = (): Map<string, QuantityKind[]> => {
  const out = new Map<string, QuantityKind[]>();
  for (const k of QUANTITY_KINDS.values()) out.set(k.head, [...(out.get(k.head) ?? []), k]);
  return out;
};

/** ONE NAME, MORE THAN ONE DIMENSION: a fault in the BOOK, not in the reader. `speed` is used for both a m/s and a
 *  1/s (a linear speed and an angular one), `conductivity` for both the thermal and the electrical one. Each of
 *  these is two kinds wearing one name, and any port binding that trusts the name is wrong about one of them. */
export function homonyms(): { name: string; dims: string[]; laws: string[]; says: string }[] {
  return [...QUANTITY_KINDS.values()].filter((k) => k.dims.length > 1).map((k) => ({
    name: k.name, dims: k.dims, laws: [...new Set([...k.takenBy, ...k.givenBy])],
    says: `"${k.name}" is used for ${k.dims.length} different dimensions — ${k.dims.join(' and ')} — so it is that many different kinds of quantity wearing one name (${[...new Set([...k.takenBy, ...k.givenBy])].slice(0, 4).join(', ')})`,
  })).sort((a, b) => b.dims.length - a.dims.length);
}

/** A dimension carrying many kinds: the measure of how badly dimension-binding alone would do. */
export function crowded(most = 8): { dim: string; kinds: string[] }[] {
  const by = new Map<string, string[]>();
  for (const k of QUANTITY_KINDS.values()) for (const d of k.dims) by.set(d, [...(by.get(d) ?? []), k.name]);
  return [...by.entries()].map(([dim, kinds]) => ({ dim, kinds }))
    .sort((a, b) => b.kinds.length - a.kinds.length).slice(0, most);
}

/** HOW WELL ONE NAME ANSWERS TO A PORT, in three grades rather than a yes or a no:
 *
 *    exact      the same kind: the names agree once written plainly.
 *    kin        the same SORT of thing at the same dimension: a `wheel radius` offered for a `radius`. Allowed,
 *               and recorded, because it is usually right and occasionally not.
 *    stretched  nothing but the dimension agrees: a chain pitch offered for a pendulum length. Never silent, and
 *               never permitted at all for a dimensionless port, where 115 unrelated kinds share one dimension.
 *    no         not even the dimension.
 */
export type PortFit = 'exact' | 'kin' | 'stretched' | 'no';
export function portFit(offered: string, port: { name: string; sym: string }, offeredDim: Dim, portDim: Dim): PortFit {
  const a = plain(offered), b = plain(port.name);
  if (a === b || a === plain(port.sym)) return 'exact';
  if (!sameDim(offeredDim, portDim)) return 'no';
  if (head(offered) === head(port.name)) return 'kin';
  return 'stretched';
}

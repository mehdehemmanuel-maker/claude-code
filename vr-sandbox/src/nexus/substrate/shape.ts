// The shape of a region: a domain in the site's frame (y opposite gravity), its extent along each axis stated by
// the region or free for the language to choose, and its faces with their areas and outward normals. A balance over
// a region is a surface integral: what crosses its boundary is the flux density through each face times the face's
// area, so the language must know which faces a flux crosses (rain and snow fall onto what faces up; wind pushes on
// what faces across; sunlight from above reaches what faces up and across) and how large they are. A free extent is
// chosen by the configuration space under a declared preference, never assumed: a held region whose plan area is
// stated takes the plan with the least boundary, because it loses least of every carrier it holds and needs the
// least material to enclose (the isoperimetric principle), and the space derives that it is square.

import { evaluate, ofLeaf, type Derivation } from './evaluate';
import { law, type Law } from './law';
import { solve, type System } from './solve';
import { derive, spaceOf } from './space';
import { add, div, k, leaf, mul, variable } from './term';
import type { Region } from '../ask/want';

export type Face = 'up' | 'down' | 'side';

export interface Shape {
  region: string;
  x: Derivation; y: Derivation; z: Derivation;
  /** The area of each face kind (the four sides together), and of the largest single side. */
  area: Record<Face, Derivation>;
  largestSide: Derivation;
  /** What each face kind touches. */
  touches: Partial<Record<Face, string>>;
  /** How the free extents were chosen, when any were. */
  chosen: string | null;
}

/** The preference a free plan is chosen under: the least boundary for the plan area, declared with its grounds. */
export const LEAST_BOUNDARY: Law = law({
  id: 'preference.least-boundary', name: 'Least boundary', statement: 'Of the plans with the stated area, prefer the one whose sides are shortest: a held region loses least of every carrier through the least boundary and needs the least material to enclose it.', formula: 'min 2 (x + z)',
  inputs: [{ sym: 'perim', unit: 'm', name: 'perimeter of the plan' }], output: { sym: 'perim', unit: 'm', name: 'perimeter' },
  term: variable('perim', 'm', 'perimeter of the plan'), domain: [], source: { cite: 'declared by the language: the isoperimetric principle; a region of given plan area whose sides are least loses least through them', kind: 'declaration' },
});

const rec = (name: string, v: number, unit: string, source: string) => ofLeaf(leaf(name, v, unit, { class: 'configuration', source }));

/** The shape of a region with an extent: stated extents as they are, free ones chosen in the space; null without an extent. */
export function shapeOf(r: Region): Shape | null {
  const e = r.extent;
  if (!e) return null;
  const stated = (sym: string | null) => (sym ? ofLeaf(r.quantities[sym]!) : null);
  let x = stated(e.x), z = stated(e.z);
  const y = stated(e.y);
  if (!y) return null;
  let chosen: string | null = null;
  if ((!x || !z) && e.plan) {
    const A = ofLeaf(r.quantities[e.plan]!);
    const X = variable('x', 'm', 'extent x'), Z = variable('z', 'm', 'extent z'), Av = variable('A', 'm^2', 'plan area');
    const system: System = {
      name: `the plan of ${r.id}`,
      vars: [{ sym: 'x', unit: 'm', name: 'extent x' }, { sym: 'z', unit: 'm', name: 'extent z' }, { sym: 'A', unit: 'm^2', name: 'plan area' }, { sym: 'perim', unit: 'm', name: 'perimeter of the plan' }],
      relations: [
        { kind: 'term', sym: 'z', term: div(Av, X), name: 'extent z', grounds: 'the plan area is x times z' },
        { kind: 'term', sym: 'perim', term: mul(k(2), add(X, Z)), name: 'perimeter of the plan', grounds: 'a rectangle\'s perimeter' },
      ],
      bindings: { A },
    };
    const root = Math.sqrt(A.value!);
    const space = spaceOf(system, { x: { lo: rec('least extent', root / 4, 'm', 'a quarter of the root of the plan area'), hi: rec('most extent', root * 4, 'm', 'four times the root of the plan area') } });
    const d = derive(space, [LEAST_BOUNDARY], { x: rec('lattice spacing', root / 20, 'm', 'a twentieth of the root of the plan area') }, { x: rec('resolution', root / 1000, 'm', 'a thousandth of the root of the plan area') });
    if (!d.pick) return null;
    x = d.pick.at['x']!;
    z = solve({ ...system, bindings: { ...system.bindings, x } }).bound['z']!;
    chosen = `${d.why!.law}`;
  }
  if (!x || !z) return null;
  const X = variable('x', 'm'), Y = variable('y', 'm'), Z = variable('z', 'm');
  const ev = (name: string, t: ReturnType<typeof mul>, law_: string) => solveTerm(name, t, { x, y, z }, law_);
  const plan = ev(`area of ${r.id} facing up`, mul(X, Z), 'a box: the plan area is x times z');
  const sides = ev(`area of ${r.id}'s sides`, mul(k(2), add(X, Z), Y), 'a box: four sides, 2 (x + z) y');
  const largest = (x.value! >= z.value! ? ev(`area of ${r.id}'s largest side`, mul(X, Y), 'a box: the largest side is the longer extent times the height') : ev(`area of ${r.id}'s largest side`, mul(Z, Y), 'a box: the largest side is the longer extent times the height'));
  return { region: r.id, x, y, z, area: { up: plan, down: plan, side: sides }, largestSide: largest, touches: e.faces, chosen };
}

function solveTerm(name: string, t: ReturnType<typeof mul>, env: Record<string, Derivation>, law_: string): Derivation {
  return evaluate(name, t, env, { unit: 'm^2', law: law_ });
}

/** The faces a flux crosses, by the way it travels. */
export function facesCrossed(direction: 'down' | 'across' | 'from above' | 'vertical' | 'along'): Face[] {
  return direction === 'down' || direction === 'vertical' ? ['up'] : direction === 'across' || direction === 'along' ? ['side'] : ['up', 'side'];
}

// What a part is made of, all the way down (docs/NEXUS-FROM-REALITY.md, section 24): a part's matter, followed down
// the levels the generator's depth derives for it (src/nexus/substrate/depth.ts): its crystal or its molecule from the kept
// species, then what settles at each size the scale tuner's ladder finds, the particles, and the length below which
// no kept law holds. Nothing here is drawn for any part: the matter is read from what the part is made of, and every
// level carries the size, the binding and the clock its own derivation gives. Where the part's matter is not among
// the kept species, that is said, as a gap in the data, and the descent goes on from the atoms its composition names.

import { levelsAt, type Level } from '../substrate/depth';
import { MATERIALS } from '../../data/materials';
import type { Part } from './part';

/** One level inside a part: what holds together there, how big, how strongly, how fast it moves, and from what law. */
export interface Inside { what: string; kind: Level['kind']; size: number; bindingEV: number; mass: number; clock: number; from: string[] }
export interface Descent { part: string; matter: string | null; says: string; levels: Inside[]; gap: string | null }

const EV = 1.602176634e-19;
/** The matter a part is mostly made of, read from its material: the element its alloy is of, or its molecule. */
const BY_WORD: [RegExp, string, string][] = [
  [/stainless|steel|iron|ndfeb|magnet|fe\b/i, 'Fe', 'iron, the element its alloy is mostly of'],
  [/alumin/i, 'Al', 'aluminium, the element its alloy is mostly of'],
  [/copper|brass|bronze|\bcu\b/i, 'Cu', 'copper, the element its alloy is mostly of'],
  [/nickel|nichrome/i, 'Ni', 'nickel, the element it is mostly of'],
  [/tungsten/i, 'W', 'tungsten'], [/\blead\b/i, 'Pb', 'lead'], [/silver/i, 'Ag', 'silver'], [/\bgold\b/i, 'Au', 'gold'], [/lithium|li-ion/i, 'Li', 'lithium, what its cells store charge in'],
  [/polyethylene|polyolefin|\bpe\b|hdpe/i, 'ethylene', 'ethylene, the unit its chains are made of'],
  [/water/i, 'water', 'water'],
];
const CATEGORY: Record<string, [string, string] | null> = {
  steel: ['Fe', 'iron, the element its alloy is mostly of'], stainless: ['Fe', 'iron, the element its alloy is mostly of'], 'cast-iron': ['Fe', 'iron'], magnet: ['Fe', 'iron, most of what NdFeB is'],
  aluminum: ['Al', 'aluminium, the element its alloy is mostly of'], 'copper-alloy': ['Cu', 'copper, the element its alloy is mostly of'], polyolefin: ['ethylene', 'ethylene, the unit its chains are made of'],
};

export function matterOf(p: Part): { matter: string | null; says: string } {
  const m = MATERIALS.find((x) => x.id === p.material);
  if (m && CATEGORY[m.category]) { const [matter, says] = CATEGORY[m.category]!; return { matter, says: `${m.name}: ${says}` }; }
  for (const [re, matter, says] of BY_WORD) if (re.test(p.material) || (m && re.test(m.name))) return { matter, says: `${m?.name ?? p.material}: ${says}` };
  return { matter: null, says: `${m?.name ?? p.material}: its matter is not among the kept species` };
}

/** The levels inside a part, from the largest that holds together to the floor, at the temperature it stands in. */
export function inside(p: Part, T = 293.15): Descent {
  const { matter, says } = matterOf(p);
  const levels = levelsAt(T, matter ? { matter } : {});
  const out: Inside[] = levels
    .filter((l) => l.kind !== 'structure' || Number.isFinite(l.size))
    .map((l) => ({ what: l.what, kind: l.kind, size: l.size, bindingEV: l.binding / EV, mass: l.mass, clock: l.clock, from: l.record.map((d) => `${d.name ?? 'derived'}${d.law ? ` (${d.law})` : ''}`).slice(0, 4) }))
    .sort((a, b) => (Number.isFinite(b.size) ? b.size : 1) - (Number.isFinite(a.size) ? a.size : 1));
  return { part: p.id, matter, says, levels: out, gap: matter ? null : `${says}: from its atoms down is what the ladder derives for any matter; its own arrangement is a gap in the data` };
}

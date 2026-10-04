// The workbench's window onto Nexus: the generator, the instruments added in rounds 17 and 18, and the intents used as
// instruments, bundled for a page where they can be run and changed. Nothing here adds to the language; it exposes it.

import { generate, describe, distinctionOf, lacking, type Structure } from '../../src/nexus/manifold';
import type { Intent, Region, Want } from '../../src/nexus/want';
import { leaf, type Leaf } from '../../src/nexus/term';
import { parseUnit } from '../../src/ganglia/units';
import { asNetwork, effectiveModulus, hexagonal, solidFraction, square, triangular, type Lattice } from '../../src/nexus/frame';
import { carries, count, loadOn } from '../../src/nexus/network';
import { centreFourier, leastHeatedLength } from '../../src/nexus/transport';
import { attemptRate } from '../../src/nexus/rate';
import { CONST } from '../../src/nexus/book/constants';
import { MATERIALS } from '../../src/data/materials';
import { ALONG_FROM_BENDING, CELL_WALL_DENSITY, CELL_WALL_MODULUS_ALONG, ELASTIC_RATIOS, ELASTIC_RATIOS_SOURCE } from '../../src/data/wood';
import { car, house, printer } from '../../tests/nexus/inventions';
import { cellVessel, computeHall, fastPrinter } from '../../tests/nexus/high-bar';

export const presets: { id: string; name: string; make: () => Intent }[] = [
  { id: 'house', name: 'a house', make: house },
  { id: 'car', name: 'a car', make: car },
  { id: 'printer', name: 'a 3D printer', make: printer },
  { id: 'fast-printer', name: 'a fast, precise 3D printer', make: fastPrinter },
  { id: 'hall', name: 'a hall that computes', make: computeHall },
  { id: 'vessel', name: 'a vessel that grows cells', make: cellVessel },
];

/** A leaf's value in its own unit, as the person or the site stated it. */
export function stated(l: Leaf): number {
  const { scale, offset } = parseUnit(l.unit);
  return (l.value! - (offset ?? 0)) / scale;
}

/** The same leaf at another stated value: its name, unit and origin kept. */
export const restated = (l: Leaf, v: number): Leaf => leaf(l.name, v, l.unit, l.origin);

/** An intent with one want's bound restated: the bar moved. */
export function withBound(i: Intent, wantId: string, side: 'lo' | 'hi', v: number): Intent {
  return { ...i, wants: i.wants.map((w) => (w.id === wantId && w[side] ? { ...w, [side]: restated(w[side]!, v) } : w)) };
}

// ---- an intent as plain data, to read and to write -------------------------------------------------------------------

type LeafSpec = { name: string; value: number | null; unit: string; origin: Leaf['origin'] };
const toLeaf = (s: LeafSpec): Leaf => leaf(s.name, s.value, s.unit, s.origin);
const fromLeaf = (l: Leaf): LeafSpec => ({ name: l.name, value: l.value === null ? null : stated(l), unit: l.unit, origin: l.origin });
const mapRecord = <A, B>(r: Record<string, A> | undefined, f: (a: A) => B) => (r ? Object.fromEntries(Object.entries(r).map(([k, v]) => [k, f(v)])) : undefined);

export function toSpec(i: Intent): unknown {
  return {
    name: i.name, by: i.by, duration: fromLeaf(i.duration),
    regions: i.regions.map((r) => ({ ...r, quantities: mapRecord(r.quantities, fromLeaf), produces: mapRecord(r.produces, fromLeaf) })),
    wants: i.wants.map((w) => ({ ...w, ...(w.lo ? { lo: fromLeaf(w.lo) } : {}), ...(w.hi ? { hi: fromLeaf(w.hi) } : {}), ...(w.condition ? { condition: mapRecord(w.condition, (c) => ({ leaf: fromLeaf(c.leaf), carrier: c.carrier })) } : {}) })),
  };
}

export function fromSpec(spec: any): Intent {
  const regions: Region[] = spec.regions.map((r: any) => ({ ...r, quantities: mapRecord(r.quantities ?? {}, toLeaf) ?? {}, ...(r.produces ? { produces: mapRecord(r.produces, toLeaf) } : {}) }));
  const wants: Want[] = spec.wants.map((w: any) => ({ ...w, ...(w.lo ? { lo: toLeaf(w.lo) } : {}), ...(w.hi ? { hi: toLeaf(w.hi) } : {}), ...(w.condition ? { condition: mapRecord(w.condition, (c: any) => ({ leaf: toLeaf(c.leaf), carrier: c.carrier })) } : {}) }));
  return { name: spec.name, by: spec.by, regions, wants, duration: toLeaf(spec.duration) };
}

// ---- arrangements ---------------------------------------------------------------------------------------------------

export const lattices: Record<string, (n: number) => Lattice> = {
  triangles: (n) => triangular(n, n),
  squares: (n) => square(n, n),
  'squares at 45°': (n) => square(n, n, 1, 1),
  hexagons: (n) => hexagonal(n, n),
};

export function arrangement(kind: string, n: number, t: number) {
  const lat = lattices[kind]!(n);
  const { net, top } = asNetwork(lat);
  const c = count(net);
  const stretch = carries(net, loadOn(net, (i, d) => (top.includes(i) && d === 1 ? 1 : 0)));
  const E = effectiveModulus(lat, t), E2 = effectiveModulus(lat, t * 1.25);
  const phi = solidFraction(lat, t), phi2 = solidFraction(lat, t * 1.25);
  return { lattice: lat, count: c, stretch, phi, E, exponent: Math.log(E2 / E) / Math.log(phi2 / phi) };
}

/** The kept woods against the counting: the solid's share, and the measured stiffness along and across. */
export function woods() {
  return MATERIALS.filter((m) => m.category === 'wood').map((m) => {
    const phi = (m.specificGravity! * 1000) / CELL_WALL_DENSITY.value, EL = m.E * ALONG_FROM_BENDING.value, r = ELASTIC_RATIOS[m.id];
    return { id: m.id, name: m.name, phi, EL, ET: r ? EL * r.ET : null, ER: r ? EL * r.ER : null };
  });
}
export const woodSources = { wall: CELL_WALL_DENSITY.source, wallModulus: CELL_WALL_MODULUS_ALONG, ratios: ELASTIC_RATIOS_SOURCE };

// ---- changes and information ----------------------------------------------------------------------------------------

export { centreFourier, leastHeatedLength, generate, describe, distinctionOf, lacking };
export type { Structure };
export const constants = { kB: CONST.kB.value!, h: CONST.h.value!, c: CONST.c.value! };
export const information = {
  /** The least power to erase bits at a rate, its heat going to a temperature. */
  erase: (bitsPerSecond: number, T: number) => bitsPerSecond * CONST.kB.value! * T * Math.LN2,
  /** The least barrier a bit needs to be held for a time at a temperature. */
  barrier: (T: number, seconds: number) => CONST.kB.value! * T * Math.log(seconds * attemptRate(T)),
  /** The farthest apart two parts can be and hear each other within a lag. */
  apart: (lag: number) => CONST.c.value! * lag,
};

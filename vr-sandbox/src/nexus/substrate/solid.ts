// A solid from its constituents. A crystal is atoms at the sites of a lattice: its density is the atoms a cell holds
// times an atom's mass, over the cell's volume, and the atoms a cell holds are counted from the cell's own geometry (a
// corner is shared by the eight cells that meet there, a face by two, a site inside by none). Its stiffness is a
// pressure, and the only pressure an atom's binding and the room it takes make is the binding over the room: the
// cohesive energy over the volume per atom. The ratio of the measured bulk modulus to that is what the binding's shape
// adds, and its structure across metals names what the energy and the room alone do not say.

import type { Crystal } from '../../data/species';

/** The sites of a lattice's cubic cell, each with the number of cells that share it. */
const SITES: Record<Crystal['lattice'], { where: string; count: number; sharedBy: number }[]> = {
  bcc: [{ where: 'corner', count: 8, sharedBy: 8 }, { where: 'body centre', count: 1, sharedBy: 1 }],
  fcc: [{ where: 'corner', count: 8, sharedBy: 8 }, { where: 'face centre', count: 6, sharedBy: 2 }],
};

/** The atoms one cell holds: each site's count over the cells it is shared by. */
export const atomsPerCell = (lattice: Crystal['lattice']) => SITES[lattice].reduce((s, x) => s + x.count / x.sharedBy, 0);

/** The volume each atom takes, m³. */
export const atomicVolume = (c: Crystal) => c.a ** 3 / atomsPerCell(c.lattice);

/** Density from the atoms and their arrangement, kg/m³. */
export const crystalDensity = (c: Crystal) => c.mass / atomicVolume(c);

/** The binding over the room: cohesive energy over the volume per atom, Pa. */
export const bindingPressure = (c: Crystal) => c.cohesive / atomicVolume(c);

/** What the binding's shape adds: the measured bulk modulus over the binding pressure. */
export const stiffnessRatio = (c: Crystal) => c.measured.bulk / bindingPressure(c);

/** The bulk modulus an isotropic material's Young's modulus and Poisson's ratio imply, Pa: E / (3 (1 − 2ν)). */
export const bulkFrom = (E: number, nu: number) => E / (3 * (1 - 2 * nu));

// The book: every kept law as a term (144, by the kept data's own examples) and the slice's derived laws.

import type { Law } from '../law';
import { CHEMISTRY } from './chemistry';
import { ELECTRICAL } from './electrical';
import { FLUIDS } from './fluids';
import { INFORMATION } from './information';
import { MACHINE_ELEMENTS } from './machine-elements';
import { MAGNETISM } from './magnetism';
import { MATERIALS } from './materials';
import { MECHANICS } from './mechanics';
import { OPTICS } from './optics';
import { SLICE } from './slice';
import { STRUCTURES } from './structures';
import { THERMAL } from './thermal';

export * from './slice';
export { CONST, est } from './constants';

/** The kept book as terms, by area. */
export const KEPT: Record<string, Law[]> = { mechanics: MECHANICS, structures: STRUCTURES, materials: MATERIALS, 'machine elements': MACHINE_ELEMENTS, electrical: ELECTRICAL, thermal: THERMAL, fluids: FLUIDS, magnetism: MAGNETISM, information: INFORMATION, chemistry: CHEMISTRY, optics: OPTICS };

export const BOOK: Law[] = [...Object.values(KEPT).flat(), ...SLICE];

const byId = new Map(BOOK.map((l) => [l.id, l]));
for (const l of BOOK) if (BOOK.filter((x) => x.id === l.id).length > 1) throw new Error(`the book holds ${l.id} twice`);
export const lawById = (id: string): Law => { const l = byId.get(id); if (!l) throw new Error(`no law ${id} in the book`); return l; };

export const WEIGHT = lawById('weight');
export const BENDING_STRESS = lawById('stress.bending');
export const BAR_WAVE_SPEED = lawById('sound.speed');

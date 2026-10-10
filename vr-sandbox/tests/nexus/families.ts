// Families as want-spaces. A vehicle is not an invention to state but a point in a space whose axes are what a person
// and a site vary: what the payload moves on or through, the source of power it can have, the gravity of the site,
// its mass and its speed. The builder states each medium only by its matter and its state (its temperature against
// the matter's thresholds, its density and viscosity), never by a kind of vehicle. The language generates every
// point; the evaluation below reads each structure for what physics requires of any vehicle (its weight carried
// lawfully, its motion propelled lawfully, its power somewhere, nothing impossible generated), and never names a
// class: classes, if they emerge, are regions of the space.

import type { Intent } from '../../src/nexus/ask/want';
import type { Element, Structure } from '../../src/nexus/substrate/manifold';
import { base, GRAVITIES, MEDIA, SOURCES, vehicle, type Gravity, type Medium, type Source, type VehiclePoint } from '../../src/nexus/machines/vehicle';

export { base, GRAVITIES, MEDIA, SOURCES, vehicle, type Gravity, type Medium, type Source, type VehiclePoint };

/** The points of the space explored: every medium with every source and gravity at the base scale and speed, then scale and speed swept on each medium. */
export function lattice(): VehiclePoint[] {
  const out: VehiclePoint[] = [];
  for (const medium of MEDIA) for (const source of SOURCES) for (const gravity of GRAVITIES) out.push({ ...base, medium, source, gravity });
  for (const medium of MEDIA) for (const mass of [1, 100000]) out.push({ ...base, medium, mass });
  for (const medium of MEDIA) for (const speed of [1, 250]) out.push({ ...base, medium, speed });
  // scale and speed together, toward the small: a milligram at a centimetre a second, a picogram at a tenth of a millimetre, each for an hour
  for (const medium of MEDIA) for (const [mass, speed] of [[1e-6, 1e-2], [1e-12, 1e-4]] as const) out.push({ ...base, medium, mass, speed, range: speed * 3600 });
  return out;
}

/** What flows at its temperature: a region whose matter is above the potential it flows above. */
const flowing = (i: Intent, id: string) => { const r = i.regions.find((x) => x.id === id); if (!r) return false; const f = Object.entries(r.properties ?? {}).find(([, p]) => p.role === 'flows above'); const T = r.quantities['T']; return !!f && !!T && T.value! > r.quantities[f[0]]!.value!; };

export interface Reading { lawful: boolean; impossible: string[]; supported: boolean; propelled: boolean; powered: boolean }

/**
 * What physics requires of any vehicle, read from a structure: nothing impossible (a contact that rolls or bears
 * on a fluid, a push against nothing); the weight carried to something that can take it, or no weight; the motion
 * given by something lawful for what is touched; and power, from a store or what is aboard.
 */
export function read(i: Intent, s: Structure, p: VehiclePoint): Reading {
  const impossible: string[] = [];
  const ends = (e: Element) => e.regions[e.regions.length - 1]!;
  for (const e of s.elements) {
    if (e.kind === 'contact' && flowing(i, e.regions[1]!)) impossible.push(`${e.id}: a contact that rolls on ${e.regions[1]}, which flows`);
    if (e.kind === 'path' && e.carrier === 'momentum' && e.regions[0] === 'the payload' && flowing(i, ends(e))) impossible.push(`${e.id}: the weight carried by contact into ${ends(e)}, which flows`);
  }
  const weightless = p.gravity === 'none';
  const supported = weightless || s.elements.some((e) => (e.kind === 'path' && e.carrier === 'momentum' && e.regions[0] === 'the payload' && !flowing(i, ends(e)) && i.regions.some((r) => r.id === ends(e) && r.environment)) || e.id.startsWith('buoyancy:') || e.id.startsWith('lift:') || e.id.startsWith('hover:'));
  // a contact carries tangential momentum up to the friction times what presses it: the weight, or a grip where there is none
  const pressed = !weightless || s.elements.some((e) => e.id.startsWith('grip:'));
  const propelled = s.elements.some((e) => (e.kind === 'contact' && !e.id.startsWith('grip:') && !flowing(i, e.regions[1]!) && pressed) || e.id.startsWith('thrust:'));
  // a flux met on the way (light, a moving medium) is a region that holds nothing: what crosses from it is power with no store
  const fromFlux = (e: Element) => e.regions.slice(1).some((id) => { const r = i.regions.find((x) => x.id === id); return !!r && r.environment && !(r.holds ?? []).length; });
  const powered = s.elements.some((e) => e.kind === 'store' && !e.id.includes('smoothing')) || s.elements.some((e) => e.id.startsWith('aboard:') || ((e.id.startsWith('intercept:') || e.id.startsWith('thrust:')) && fromFlux(e)));
  return { lawful: impossible.length === 0, impossible, supported, propelled, powered };
}

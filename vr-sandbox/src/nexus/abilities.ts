// If this, then that: what has to be true of a creature for it to have an ability, as the universal laws say it. Each
// ability is a comparison of two records, what the creature has and what the ability needs, each a chain of laws over
// what is measured of it, so a mouse, a man, an elephant, a sparrow, a bee and a bacterium are put to the same laws and
// come out as they are: the mouse walks away from any fall and the man does not; the bee hovers and the man with wings
// cannot; a flatworm lives without vessels because it is flat; the bacterium cannot coast. A creature is a handful of
// numbers (its mass, its thickness, its wings, its eye), so a new one is a new handful, and what it can do follows.

import { estimate, fixed, lawsUnder, measured, setting, solve, step, valueIn } from './lawgraph';
import type { Derivation } from './evaluate';
import type { Law } from './law';

/** A creature, as the laws need it. Every number says where it is from. */
export interface Creature {
  id: string; name: string; says: string;
  /** kg */ mass: [number, string]; /** m: half its least thickness, what diffusion must cross */ half: [number, string];
  /** what it burns: Kleiber's coefficient for its kind, W at 1 kg */ B0: [number, string];
  /** m²: its area falling, flat out */ frontal?: [number, string]; /** m²: its wings */ wings?: [number, string];
  /** share of its mass that is flight muscle */ flightMuscle?: [number, string]; /** m: its pupil in daylight */ pupil?: [number, string];
  /** W/m² K through its fur, feathers or fat and skin */ insulation?: [number, string]; /** its surface over the sphere of its volume */ shape?: [number, string];
  /** m/s it swims or walks, and how long it is (for its Reynolds number) */ speed?: [number, string]; length?: [number, string];
  endotherm: boolean; inWater?: boolean;
}
const KLEIBER = 'Kleiber 1947: 3.39 W at 1 kg for mammals at rest';
const HEMMINGSEN = 'Hemmingsen 1960: ectotherms at 20 °C about 1/29 of mammals, single cells about 1/200';
export const CREATURES: Creature[] = [
  { id: 'human', name: 'a person', says: 'ICRP 89\'s reference man', mass: [73, 'ICRP 89'], half: [0.15, 'a trunk about 30 cm through'], B0: [3.39, KLEIBER], frontal: [0.7, 'spread flat falling, about 0.7 m² (a skydiver, typical)'], pupil: [0.003, 'about 3 mm in daylight (typical)'], insulation: [15, 'tissue with its vessels shut, no clothes (an estimate)'], shape: [2.3, '1.9 m² against the 0.82 of a sphere of its volume'], speed: [1.4, 'walking (typical)'], length: [1.76, 'ICRP 89'], endotherm: true },
  { id: 'person-with-wings', name: 'a person with 10 m² of wings', says: 'what if: a man\'s body with a hang-glider\'s wings and his own muscle', mass: [73, 'ICRP 89'], half: [0.15, 'as a man'], B0: [3.39, KLEIBER], wings: [10, 'a hang glider\'s wing about 14 m², a big bird\'s area scaled (an estimate)'], flightMuscle: [0.12, 'his chest and arm muscles about 12 % of him (an estimate)'], endotherm: true },
  { id: 'mouse', name: 'a mouse', says: 'the house mouse', mass: [0.025, 'typical adult'], half: [0.012, 'about 2.4 cm through (an estimate)'], B0: [3.39, KLEIBER], frontal: [0.003, 'spread falling, about 30 cm² (an estimate)'], pupil: [0.001, 'about 1 mm (an estimate)'], insulation: [6, 'fur and skin (an estimate)'], shape: [1.6, 'a compact body (an estimate)'], endotherm: true },
  { id: 'elephant', name: 'an African elephant', says: 'a cow', mass: [3000, 'typical cow 2,500–3,500 kg'], half: [0.6, 'a body about 1.2 m through (an estimate)'], B0: [3.39, KLEIBER], frontal: [5, 'an estimate'], insulation: [10, 'thick skin, little hair (an estimate)'], shape: [1.6, 'an estimate'], endotherm: true },
  { id: 'sparrow', name: 'a house sparrow', says: 'Passer domesticus', mass: [0.03, 'typical 24–40 g'], half: [0.015, 'an estimate'], B0: [4.5, 'birds above mammals at rest (an estimate)'], frontal: [0.004, 'an estimate'], wings: [0.009, 'about 90 cm² (typical)'], flightMuscle: [0.17, 'pectoral muscles about 17 % of a flying bird (typical)'], pupil: [0.002, 'an estimate'], insulation: [4, 'feathers (an estimate)'], shape: [1.6, 'an estimate'], endotherm: true },
  { id: 'eagle', name: 'a golden eagle', says: 'Aquila chrysaetos', mass: [4.5, 'typical 3–6 kg'], half: [0.08, 'an estimate'], B0: [4.5, 'birds (an estimate)'], wings: [0.65, 'about 0.6–0.7 m² (typical)'], flightMuscle: [0.17, 'typical of flying birds'], pupil: [0.006, 'an eagle\'s pupil about 6 mm (an estimate)'], endotherm: true },
  { id: 'honey-bee', name: 'a honey bee', says: 'a worker', mass: [1e-4, 'about 100 mg'], half: [0.002, 'about 4 mm through'], B0: [3.39 / 29, HEMMINGSEN], frontal: [2e-5, 'an estimate'], wings: [1e-4, 'four wings about 1 cm² in all (an estimate)'], flightMuscle: [0.3, 'thoracic muscle about 30 % of an insect (typical)'], endotherm: false },
  { id: 'flatworm', name: 'a planarian flatworm', says: 'Schmidtea', mass: [1e-5, 'about 10 mg (an estimate)'], half: [0.00025, 'flat: about 0.5 mm thick'], B0: [3.39 / 29, HEMMINGSEN], endotherm: false, inWater: true },
  { id: 'c-elegans', name: 'a nematode (C. elegans)', says: 'the worm of a thousand cells', mass: [3e-9, 'about 3 µg wet (an estimate)'], half: [0.000025, 'about 50 µm across (typical)'], B0: [3.39 / 29, HEMMINGSEN], endotherm: false, inWater: true },
  { id: 'tardigrade', name: 'a tardigrade', says: 'a water bear, active', mass: [1.3e-9, 'about a microgram: a 0.3 × 0.09 mm body (an estimate)'], half: [0.000045, 'about 0.09 mm across'], B0: [3.39 / 29, HEMMINGSEN], endotherm: false, inWater: true },
  { id: 'e-coli', name: 'E. coli', says: 'a bacterium', mass: [9.5e-16, 'Neidhardt: 0.95 pg'], half: [5e-7, 'about 1 µm across'], B0: [3.39 / 200, HEMMINGSEN], speed: [3e-5, 'about 30 µm a second swimming (typical)'], length: [2e-6, 'about 2 µm'], endotherm: false, inWater: true },
  { id: 'blue-whale', name: 'a blue whale', says: 'Balaenoptera musculus', mass: [1.2e5, 'typical adult 100–150 t'], half: [1.5, 'an estimate'], B0: [3.39, KLEIBER], insulation: [3, 'blubber 15–30 cm (an estimate)'], shape: [1.4, 'streamlined (an estimate)'], speed: [5, 'cruising about 5 m/s (typical)'], length: [25, 'about 25 m'], endotherm: true, inWater: true },
];
const rec = (c: Creature, k: keyof Creature, name: string, unit: string): Derivation => { const v = c[k] as [number, string]; return /estimate/.test(v[1]) ? estimate(`${c.name}: ${name}`, v[0], unit, v[1]) : measured(`${c.name}: ${name}`, v[0], unit, v[1]); };
const G = fixed('standard gravity', 9.80665, 'm/s^2', 'ISO 80000-3');
const AIR = measured('density of air', 1.204, 'kg/m^3', 'at 20 °C, sea level');

/** What it burns at rest: Kleiber's law with the exponent a space-filling network gives. */
export function restingPower(c: Creature): Derivation {
  const a = step('network.scaling', { n: fixed('branches at each level', 2, '-', 'a binary tree'), beta: fixed('radius ratio', 2 ** -0.5, '-', 'area-preserving branching (West, Brown & Enquist 1997)'), gamma: fixed('length ratio', 2 ** (-1 / 3), '-', 'space-filling in three dimensions') }, 'the scaling exponent');
  return step('kleiber.scaling', { B0: rec(c, 'B0', 'metabolic coefficient', 'W'), M: rec(c, 'mass', 'mass', 'kg'), a }, `what ${c.name} burns at rest`);
}

/** An ability's verdict: what it has against what it needs, each with its laws. */
export interface Verdict { ability: string; creature: string; ok: boolean | null; have: Derivation; need: Derivation; says: string; laws: Law[] }
export interface Ability { id: string; name: string; when: string; test: (c: Creature) => Verdict | null }
const verdict = (ability: Ability, c: Creature, have: Derivation, need: Derivation, ok: boolean, says: string): Verdict => ({ ability: ability.name, creature: c.name, ok, have, need, says, laws: [...new Set([...lawsUnder(have), ...lawsUnder(need)])] });
const fmt = (d: Derivation, unit: string) => `${+valueIn(d, unit)!.toPrecision(3)} ${unit}`;

export const ABILITIES: Ability[] = [
  {
    id: 'no-vessels', name: 'live without blood vessels', when: 'oxygen diffusing in from its surface must reach its middle before it is used up (Hill\'s limit)',
    test(c) {
      const B = restingPower(c), V = solve('mass.volume', 'V', { m: rec(c, 'mass', 'mass', 'kg'), rho: measured('density of tissue', 1060, 'kg/m^3', 'what src/nexus/derive.ts finds of soft tissue from its make-up') }, `${c.name}'s volume`);
      const q = step('reaction.rate-from-power', { P: B, V, dH: measured('energy a mole of O₂ burnt', 4.5e5, 'J/mol', 'Brouwer 1957') }, 'oxygen it burns a volume');
      const C = step('henry.solubility', { p: estimate('O₂ at its surface', c.inWater ? 21 : 13, 'kPa', c.inWater ? 'air-saturated water (an estimate)' : 'alveolar-like, about 13 kPa (an estimate)'), kH: measured('Henry constant of O₂ in water at 37 °C', 96280, 'Pa m^3/mol', 'from plasma\'s 0.0031 ml/dl/mmHg (Nunn)') }, 'O₂ dissolved at its surface');
      const reach = step('diffusion.sphere-limit', { D: estimate('O₂ diffusivity in tissue', 2e-9, 'm^2/s', 'about 1.5–2.5 × 10⁻⁹ (an estimate)'), C, q }, 'how deep diffusion alone can feed');
      const half = rec(c, 'half', 'half its thickness', 'm');
      return verdict(this, c, reach, half, reach.value! >= half.value!, `diffusion feeds ${fmt(reach, 'mm')} deep; ${c.name} is ${fmt(half, 'mm')} to its middle`);
    },
  },
  {
    id: 'survive-any-fall', name: 'walk away from any fall', when: 'its speed falling, where drag equals its weight, must be slow enough to land at (about 12 m/s, an estimate)',
    test(c) {
      if (!c.frontal) return null;
      const W = step('weight', { m: rec(c, 'mass', 'mass', 'kg'), g: G }, `${c.name}'s weight`);
      const vt = solve('drag.aero', 'v', { F: W, rho: AIR, Cd: estimate('drag coefficient, spread out', 1, '-', 'a bluff body about 1 (an estimate)'), A: rec(c, 'frontal', 'frontal area', 'm^2') }, 'its terminal speed');
      const limit = estimate('a speed it can land at', 12, 'm/s', 'people survive landings at about 10–15 m/s; smaller animals better (an estimate)');
      return verdict(this, c, limit, vt, vt.value! <= limit.value!, `it falls at most ${fmt(vt, 'm/s')} (drag equals weight), against a survivable ${fmt(limit, 'm/s')}`);
    },
  },
  {
    id: 'hover', name: 'hover by flapping', when: 'its flight muscle must give the power an ideal actuator disc of its wings needs to hold its weight',
    test(c) {
      if (!c.wings || !c.flightMuscle) return null;
      const W = step('weight', { m: rec(c, 'mass', 'mass', 'kg'), g: G }, `${c.name}'s weight`);
      const need = solve('thrust.ideal-static', 'P', { T: W, rho: AIR, A: rec(c, 'wings', 'wing area swept', 'm^2') }, 'least power to hover');
      const muscle = step('share.of', { w: rec(c, 'flightMuscle', 'flight muscle share', '-'), M: rec(c, 'mass', 'mass', 'kg') }, 'flight muscle');
      const have = step('power.per-mass', { p: measured('power a kilogram of flight muscle', 200, 'W/kg', 'about 200 W/kg sustained at most (Weis-Fogh & Alexander 1977)'), m: muscle }, 'power its muscle can give');
      return verdict(this, c, have, need, have.value! >= need.value!, `its muscle gives ${fmt(have, 'W')}; hovering needs at least ${fmt(need, 'W')}`);
    },
  },
  {
    id: 'keep-warm-arctic', name: 'keep warm in arctic winter at rest', when: 'what it burns must at least match what leaks through its insulation and the air to −30 °C',
    test(c) {
      if (!c.endotherm || !c.insulation || !c.shape || c.inWater) return null;
      const V = solve('mass.volume', 'V', { m: rec(c, 'mass', 'mass', 'kg'), rho: measured('density of tissue', 1060, 'kg/m^3', 'derive.ts') }, `${c.name}'s volume`);
      const area = step('area.shaped', { s: rec(c, 'shape', 'shape factor', '-'), A0: step('area.sphere-of-volume', { V }, 'surface of a sphere its volume') }, `${c.name}'s skin`);
      const loss = step('conduction.series', { A: area, dT: setting('body over the air', 37 + 30, 'K', 'arctic winter, −30 °C'), h1: rec(c, 'insulation', 'insulation', 'W/m^2 K'), h2: estimate('still air, convection and radiation', 8, 'W/m^2 K', 'about 8 (an estimate)') }, 'heat it loses');
      const made = step('power.net', { Pout: setting('shivering', 4 * restingPower(c).value!, 'W', 'about 4 times resting at most (typical)'), Pin: setting('nothing', 0, 'W', 'nothing') }, 'the most heat it makes');
      return verdict(this, c, made, loss, made.value! >= loss.value!, `it can make ${fmt(made, 'W')} against ${fmt(loss, 'W')} lost`);
    },
  },
  {
    id: 'coast', name: 'coast after a stroke', when: 'its Reynolds number must be well above 1, so its momentum outlasts the fluid\'s viscosity',
    test(c) {
      if (!c.speed || !c.length) return null;
      const water = c.inWater !== false;
      const Re = step('reynolds', { rho: measured(water ? 'density of water' : 'density of air', water ? 1000 : 1.204, 'kg/m^3', 'typical'), v: rec(c, 'speed', 'speed', 'm/s'), L: rec(c, 'length', 'length', 'm'), mu: measured(water ? 'viscosity of water' : 'viscosity of air', water ? 1e-3 : 1.8e-5, 'Pa s', 'at 20 °C') }, 'its Reynolds number');
      return verdict(this, c, Re, fixed('inertia equals viscosity', 1, '-', 'Re = 1'), Re.value! > 1, `its Reynolds number is ${+Re.value!.toPrecision(2)}: ${Re.value! > 1 ? 'momentum carries it on' : 'it stops dead the moment it stops swimming (Purcell 1977)'}`);
    },
  },
  {
    id: 'see-a-mouse', name: 'see a mouse from 300 m', when: 'its pupil must be wide enough that diffraction blurs no more than 5 cm at 300 m',
    test(c) {
      if (!c.pupil) return null;
      const theta = step('diffraction.limit', { lambda: measured('green light', 550e-9, 'm', 'the eye\'s peak, about 550 nm'), D: rec(c, 'pupil', 'pupil', 'm') }, 'the finest angle its eye resolves');
      const need = estimate('a mouse at 300 m', 0.05 / 300, 'rad', 'a 5 cm mouse at 300 m');
      return verdict(this, c, need, theta, theta.value! <= need.value!, `its eye resolves ${(theta.value! * 1e6).toPrecision(3)} µrad; a mouse at 300 m spans ${(need.value! * 1e6).toPrecision(3)}`);
    },
  },
];
/** What each creature can do, by the laws. */
export function canDo(c: Creature): Verdict[] { return ABILITIES.map((a) => a.test(c)).filter((v): v is Verdict => !!v); }
/** Abilities to read. */
export function abilityLines(c: Creature): string[] { return [`${c.name}:`, ...canDo(c).map((v) => `  ${v.ok ? '✓' : '✗'} ${v.ability}: ${v.says}`)]; }

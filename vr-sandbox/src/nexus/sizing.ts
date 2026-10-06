// What a size asks of what is made. A thing's size changes which effects win, and so which ways can meet a want at all.
// Nothing here is written per thing: each group is a ratio of two effects the laws already hold, taken at the size, and
// where it passes its threshold the other effect rules. From which side of each threshold the size lies on, what it
// would have to be built as follows: past self-weight, nothing solid stands, and gravity, pressure or tension must hold
// it; below the viscous size, air is syrup and a rotor pushes nothing; past self-gravity, it is pulled round into a
// ball; below the electrostatic size, a magnetic motor is weaker than a charged comb.
//
// The matters are the ones kept (their yield, density, stiffness and heat); the fluids are air and water at 20 °C and
// one atmosphere; the constants are CODATA's. Where an estimate is used it says so.

import { matterOf } from './generate';
import { thermalOf } from '../engineering/thermal';

const g = 9.80665, Gn = 6.6743e-11, c = 299792458, kB = 1.380649e-23, mu0 = 1.25663706212e-6, eps0 = 8.8541878128e-12;
/** Air and water at 20 °C, 1 atm: density, viscosity; water's surface tension (CRC Handbook, 97th ed.). */
export const AIR = { rho: 1.204, mu: 1.813e-5 }, WATER = { rho: 998.2, mu: 1.002e-3, gamma: 0.0728 };
/** Matters a structure is drawn from, by what each bears for its weight. */
const STRONG = ['steel.a36', 'aluminum.6061-t6', 'composite.cfrp', 'wood.douglas-fir'];

/** Sizes of things everyone names, so "the size of a tardigrade" or "as big as the Earth" is a length, with its source. */
/** Each: what names it, its length (m), its source, and where kept its three sizes, m. */
export const NAMED_SIZES: [RegExp, number, string, [number, number, number]?][] = [
  [/\b(the )?earth\b/, 1.2742e7, 'the Earth, 12,742 km across (mean radius 6,371 km, IUGG)'], [/\b(the )?moon\b/, 3.4748e6, 'the Moon, 3,475 km across (NASA)'], [/\b(the )?sun\b/, 1.3927e9, 'the Sun, 1.39 million km across (IAU nominal radius 695,700 km)'],
  [/\bjupiter\b/, 1.3982e8, 'Jupiter, 139,820 km across (NASA)'], [/\bmars\b/, 6.779e6, 'Mars, 6,779 km across (NASA)'], [/\bvenus\b/, 1.2104e7, 'Venus, 12,104 km across (NASA)'],
  [/\b(water ?bears?|tardigrades?)\b/, 5e-4, 'a tardigrade, about 0.5 mm long (adults 0.05 to 1.2 mm)'], [/\b(dust ?mites?)\b/, 3e-4, 'a dust mite, about 0.3 mm long'], [/\b(red )?blood cells?\b/, 8e-6, 'a red blood cell, about 8 µm across'],
  [/\bbacteri(a|um)\b/, 2e-6, 'a bacterium, about 1 to 2 µm long (E. coli)'], [/\bvirus(es)?\b/, 1e-7, 'a virus, about 100 nm across'], [/\batoms?\b/, 1e-10, 'an atom, about 0.1 nm across'], [/\b(human )?hairs?\b/, 7e-5, 'a human hair, about 70 µm thick'],
  [/\bgrains? of sand\b|\bsand grains?\b/, 5e-4, 'a grain of sand, 0.06 to 2 mm (0.5 mm taken)'], [/\bants?\b/, 5e-3, 'an ant, about 5 mm long'], [/\b(honey ?)?bees?\b/, 1.2e-2, 'a honey bee, about 12 mm long'], [/\bmosquito(es)?\b/, 5e-3, 'a mosquito, about 5 mm long'],
  [/\bsugar cubes?\b/, 1.6e-2, 'a sugar cube, about 16 mm on a side', [0.016, 0.016, 0.016]], [/\bcoins?\b/, 2.4e-2, 'a coin, about 24 mm across'], [/\bcredit[- ]cards?\b/, 8.56e-2, 'a credit card, 85.60 × 53.98 × 0.76 mm (ISO/IEC 7810 ID-1)', [0.0856, 0.05398, 0.00076]], [/\bmicro ?sd( cards?)?\b/, 1.5e-2, 'a microSD card, 15 × 11 × 1 mm (SD Association)', [0.015, 0.011, 0.001]],
  [/\borange pi 5\b/, 1e-1, 'an Orange Pi 5 board, 100 × 62 mm (its maker\'s sheet)'], [/\braspberry pi\b/, 8.5e-2, 'a Raspberry Pi board, 85 × 56 mm (its maker\'s sheet)'], [/\bfists?\b/, 1e-1, 'a fist, about 100 mm'], [/\b(phone|smartphone)s?\b/, 1.5e-1, 'a phone, about 150 mm long'],
  [/\b(person|human|man|woman|adult)\b/, 1.75, 'a person, about 1.75 m tall'], [/\bcars?\b/, 4.5, 'a car, about 4.5 m long'], [/\bbus(es)?\b/, 12, 'a bus, about 12 m long'], [/\bhouses?\b/, 10, 'a house, about 10 m'], [/\b(football|soccer) (field|pitch)\b/, 105, 'a football pitch, 105 m long (FIFA)'],
  [/\b(skyscraper|tower)s?\b/, 300, 'a tall tower, about 300 m'], [/\bmount everest\b|\bmountains?\b/, 8849, 'Mount Everest, 8,849 m high'], [/\bcit(y|ies)\b/, 1e4, 'a city, about 10 km across'], [/\bcontinents?\b/, 5e6, 'a continent, about 5,000 km across'],
];
/** "the size of a tardigrade", "as big as the Earth", "tardigrade-sized", "a cube the size of a sugar cube": its length. */
export function namedSize(t: string): { L: number; said: string; source: string } | null {
  const m = /\b(?:(?:the|same)\s+size\s+(?:as\s+|of\s+)|as\s+(?:big|large|small|tiny|tall|wide|long|heavy)\s+as\s+|bigger than\s+|smaller than\s+)((?:an?|the)\s+)?([a-z][a-z0-9 -]{1,40}?)(?=[,.;:]|\s+(?:that|which|with|and|who|whose|to|for|so|but|,)\b|\s*$|\s+\()|\b([a-z]+(?:[- ][a-z]+)?)-sized\b/.exec(t);
  if (!m) return null;
  const what = (m[2] ?? m[3] ?? '').trim();
  for (const [re, L, source] of NAMED_SIZES) if (re.test(` ${what} `)) return { L, said: m[0].trim(), source };
  return null;
}

export interface Group { key: string; name: string; value: number; at: number; /** which side of its threshold the size is on */ past: boolean; says: string; /** so far from its threshold, or so beside what it does, that it does not bear on it: said in one line, not each */ far?: boolean }
export interface SizeReading { L: number; groups: Group[]; /** what a thing this size would have to be built as, from which side of each threshold it lies on */ must: string[] }

const best = () => STRONG.map((id) => { const m = matterOf(id), sy = /^wood/.test(id) ? 0.5 * m.ultimate : m.yield; return { id, name: m.name, rho: m.density, sy, E: m.E, spec: sy / m.density }; }).sort((a, b) => b.spec - a.spec);
const fmt = (v: number) => (v === 0 ? '0' : Math.abs(Math.log10(Math.abs(v))) >= 4 ? v.toExponential(2).replace('e+', ' × 10^').replace('e-', ' × 10^-') : `${+v.toPrecision(3)}`);
const lenSay = (v: number) => (v >= 1e3 ? `${fmt(v / 1e3)} km` : v >= 1 ? `${fmt(v)} m` : v >= 1e-3 ? `${fmt(v * 1e3)} mm` : v >= 1e-6 ? `${fmt(v * 1e6)} µm` : `${fmt(v * 1e9)} nm`);
const timeSay = (s: number) => (s >= 3.156e7 ? `${fmt(s / 3.156e7)} year${fmt(s / 3.156e7) === '1' ? '' : 's'}` : s >= 86400 ? `${fmt(s / 86400)} day${fmt(s / 86400) === '1' ? '' : 's'}` : s >= 3600 ? `${fmt(s / 3600)} h` : s >= 60 ? `${fmt(s / 60)} min` : s >= 1 ? `${fmt(s)} s` : s >= 1e-3 ? `${fmt(s * 1e3)} ms` : s >= 1e-6 ? `${fmt(s * 1e6)} µs` : `${fmt(s * 1e9)} ns`);

/** The groups at size L (m), moving at v (m/s) where it moves, turning at w (rad/s) where it turns. */
export function sizeAt(L: number, o: { v?: number; w?: number; flies?: boolean; swims?: boolean; /** it is in a liquid (blood, water) */ immersed?: boolean; /** it moves or turns by a motor */ driven?: boolean; /** it is in vacuum: no air, no weight to speak of */ vacuum?: boolean; /** driven from outside by a field */ fieldDriven?: boolean } = {}): SizeReading {
  const ms = best(), top = ms[0]!, steel = ms.find((x) => x.id === 'steel.a36')!, groups: Group[] = [], must: string[] = [];
  // self-weight: how much of its strength a thing L tall spends holding itself up (a column of it: ρ g L / σ)
  const sw = (top.rho * g * L) / top.sy;
  // a craft in space weighs nothing to speak of; a world has its own gravity
  const weightless = !!o.vacuum && L < 1e6;
  if (!weightless) groups.push({ key: 'self-weight', name: 'self-weight ρ g L / σ', value: sw, at: 1, past: sw > 1, far: sw < 1e-3 || !!o.immersed, says: `${fmt(sw)} for ${top.name}, the strongest for its weight kept: ${sw > 1 ? `past 1: a column of it ${lenSay(L)} tall crushes under its own weight (the most it can stand is ${lenSay(top.sy / (top.rho * g))})` : sw > 0.1 ? 'it spends a large share of its strength holding itself up' : 'its own weight is a small part of what it bears'}` });
  if (sw > 1 && !weightless) must.push(`nothing solid kept holds its own shape at ${lenSay(L)}: it must be held by tension (cables, an inflated or spun shell), by pressure, or by its own gravity, not by bars or plates in compression`);
  else if (sw > 0.1 && !weightless) must.push(`at ${lenSay(L)} its structure must be tapered, trussed or put in tension: bars sized for what they carry are crushed by what they weigh`);
  // self-gravity: the size past which a body of the strongest matter is crushed round by its own pull
  // its centre's pressure (2π/3) G ρ² R² against its yield: the square of its radius against the radius where they meet
  const Rc = Math.sqrt((3 * steel.sy) / (2 * Math.PI * Gn * steel.rho ** 2)), sg = (L / 2 / Rc) ** 2;
  if (L > 1000) groups.push({ key: 'self-gravity', name: 'self-gravity, its pressure against its strength', value: sg, at: 1, past: sg > 1, says: `${fmt(sg)}: its centre's pressure, (2π/3) G ρ² R², against the yield of ${steel.name}, which it passes past a radius of ${lenSay(Rc)}` });
  if (sg > 1) must.push(`at ${lenSay(L)} it is a planet: its own gravity holds it together and pulls it into a sphere; what turns or moves in it must be fluid or bound by gravity, not held by strength`);
  // tip speed: the fastest a rim of the strongest matter turns before it flies apart, σ = ρ v²
  const vt = Math.sqrt(top.sy / top.rho), T0 = (Math.PI * L) / vt;
  const spin = o.w !== undefined ? (o.w * L) / 2 / vt : null;
  groups.push({ key: 'tip speed', name: 'rim speed against √(σ/ρ)', value: spin ?? T0, at: 1, past: spin !== null && spin > 1, far: spin === null, says: spin !== null ? `${fmt(spin)}: its rim would go ${fmt((o.w! * L) / 2)} m/s, ${spin > 1 ? 'faster than' : 'within'} the ${fmt(vt)} m/s a rim of ${top.name} bears before it flies apart` : `a rim of ${top.name} ${lenSay(L)} across turns at most once in ${timeSay(T0)} before it flies apart (${fmt(vt)} m/s at its edge)` });
  if (spin !== null && spin > 1) { const vo = Math.sqrt((Gn * (4 / 3) * Math.PI * (L / 2) ** 3 * 5500) / (L / 2)); must.push(`turning that fast at ${lenSay(L)} no matter holds it by strength: ${L / 2 > Rc ? `only gravity can (a body of rock that size holds a rim at up to ${fmt(vo)} m/s, its orbital speed)` : 'it must turn slower, or be made of many small rotors'}`); }
  // Reynolds: inertia against viscosity, in air and in water, at its speed (or the speed gravity gives a thing its size)
  const v = o.v ?? Math.sqrt(g * L), Ra = (AIR.rho * v * L) / AIR.mu, Rw = (WATER.rho * v * L) / WATER.mu;
  const Rn = o.immersed ? Rw : Ra;
  if (!o.vacuum) groups.push({ key: 'Reynolds', name: 'Reynolds number ρ v L / μ', value: Rn, at: 1, past: Rn < 1, says: o.immersed ? `${fmt(Rw)} in water (or blood, near enough) at ${fmt(v)} m/s: ${Rw < 1 ? 'the liquid is syrup to it: it stops the moment it stops pushing' : Rw < 1000 ? 'viscosity and inertia both count' : 'inertia rules'}` : `${fmt(Ra)} in air, ${fmt(Rw)} in water, at ${fmt(v)} m/s${o.v === undefined ? ' (√(g L), the speed gravity gives a thing its size: estimate)' : ''}: ${Ra < 1 ? 'air is syrup to it: viscosity rules' : Ra < 1000 ? 'viscosity and inertia both count' : 'inertia rules: wings and rotors work by throwing air'}` });
  if (o.flies && Ra < 1000) must.push(`at Re ${fmt(Ra)} a rotor or a fixed wing throws too little air to hold it up: it must flap as small insects do (a beat of hundreds of times a second), or be carried by bristled wings, or drift as a seed does`);
  if (o.swims && Rw < 1) must.push(`at Re ${fmt(Rw)} in water it cannot coast: it must swim by something that does not reverse, a turning corkscrew or a flexible tail, as bacteria and sperm do`);
  // Bond: gravity against surface tension, wet
  const Bo = (WATER.rho * g * L * L) / WATER.gamma;
  // in a liquid there is no surface to stick to: surface tension does not reach it
  if (!o.immersed && !o.vacuum) groups.push({ key: 'Bond', name: 'Bond number ρ g L² / γ', value: Bo, at: 1, past: Bo < 1, far: Bo > 1e4, says: `${fmt(Bo)}: ${Bo < 1 ? 'surface tension beats its weight: a drop of water is a wall to it, and it sticks to what it touches when damp' : 'its weight beats surface tension'}` });
  // heat: how long its own heat takes to cross it, L² / α, for steel
  const th = thermalOf(matterOf('steel.a36')), alpha = th.k / (steel.rho * th.c), tau = (L * L) / alpha;
  // how long its inside takes to follow its surface; what it can shed is a matter of its surface and the heat on each
  // square metre of it, weighed with what it draws below, not of this time
  groups.push({ key: 'heat time', name: 'heat crossing it, L² / α', value: tau, at: 1, past: false, says: `${timeSay(tau)} for steel: ${tau < 1e-3 ? 'it is at its surroundings\' temperature almost at once' : tau > 3.156e7 ? 'its inside follows its surface only over ages; what it can shed is weighed by its surface' : 'it warms and cools on human times'}` });
  // actuation: a magnetic motor's force per volume falls with size (B grows with the current loop's size); a charged
  // comb's grows as its gap shrinks. Equal where ε0 E² = μ0 J² L², at E = 3 MV/m (air breaks down at about that across
  // millimetres, Paschen) and J = 10 A/mm² (copper carried hard, estimate)
  const Lx = Math.sqrt((eps0 * 3e6 ** 2) / (mu0 * 1e7 ** 2));
  // a rough crossing: it moves with the field and the current density taken, so it is said to one figure
  const Lr = +Lx.toPrecision(1);
  // driven from outside by a field, or not driven at all, it has no motor of its own for this to bear on
  groups.push({ key: 'actuation', name: 'magnetic against electrostatic force', value: L / Lx, at: 1, past: L < Lx && !o.fieldDriven && o.driven !== false, far: !!o.fieldDriven || o.driven === false || L / Lx > 1e4, says: `${fmt(L / Lx)} of the size where they are about equal, near ${lenSay(Lr)} (a rough crossing: it moves with the breakdown field and the current density taken): ${L < Lx ? 'electrostatic and piezoelectric drives are stronger than any coil this small' : 'coils and magnets are stronger than charges'}` });
  if (L < Lx && o.driven !== false && !o.fieldDriven) must.push(`below about ${lenSay(Lr)} its motor would better be electrostatic (a comb drive) or piezoelectric than a coil and magnet: no motor kept is either`);
  // light: how long a signal takes to cross it
  // against the time it takes to do what it does (a turn, or crossing its own size at its speed): a delay that is a
  // small part of that is made up by timing; one that is not cannot be
  const lt = L / c, Tm = o.w !== undefined ? (2 * Math.PI) / o.w : o.v !== undefined ? L / o.v : undefined, lr = Tm !== undefined ? lt / Tm : undefined;
  groups.push({ key: 'light time', name: 'light crossing it, L / c', value: lt, at: 1e-3, past: lr !== undefined && lr > 1e-3, far: (lr === undefined || lr < 1e-6) && L < 1e3, says: `${timeSay(lt)}${lr !== undefined ? `, ${fmt(lr)} of the ${timeSay(Tm!)} it takes to ${o.w !== undefined ? 'turn once' : 'cross its own size'}: ${lr > 1e-3 ? 'too long to keep its far parts in step by a signal from one place: each must act on what it senses where it is' : 'a delay that timing makes up'}` : ''}` });
  if (lr !== undefined && lr > 1e-3) must.push(`its far parts are ${timeSay(lt)} of light apart, ${fmt(lr)} of the time it takes to move: no one controller keeps them in step; each part must act on what it senses where it is`);
  // heat noise: how far k T shakes a part of steel this size, against its size
  const xn = Math.sqrt((kB * 293) / (steel.E * L)) / L;
  groups.push({ key: 'thermal noise', name: 'thermal shaking √(kT / E L) / L', value: xn, at: 0.01, past: xn > 0.01, far: xn < 1e-5, says: `${fmt(xn)} of its size: ${xn > 0.01 ? 'Brownian motion shakes it as much as anything that drives it' : 'heat shakes it negligibly'}` });
  if (xn > 0.01) must.push(`at ${lenSay(L)} heat shakes it by more than a hundredth of its size: it must work by chemistry or by ratcheting on that shaking, as molecular motors do`);
  return { L, groups, must };
}
export { lenSay, timeSay, fmt };

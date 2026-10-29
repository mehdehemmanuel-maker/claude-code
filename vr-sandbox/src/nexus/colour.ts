// What colour a surface is, worked out (docs/REALITY.md phase 3): not chosen. A metal's free electrons answer light at
// each wavelength as its measured complex refractive index n + i k says; Fresnel's equations give how much of each
// wavelength it reflects; the eye's three responses (the CIE 1931 observer) under daylight (D65) weigh that spectrum into
// a colour, XYZ, and the sRGB primaries turn it into the numbers a screen shows. So silver is near white (it reflects every
// wavelength nearly alike), copper red-orange (its d-band electrons absorb above about 2.1 eV: green and blue), gold
// yellow (its edge nearer 2.4 eV), iron and steel a darker grey (55 to 65 % of each wavelength, flat).

import { CIE_SOURCE, CMF_X, CMF_Y, CMF_Z, D65, FILM_NK, METAL_NK, NM } from '../data/optics';

/** At normal incidence, the share of light of one wavelength a surface of index n + i k reflects, from air (Fresnel). */
export const reflectanceNormal = (n: number, k: number): number => ((n - 1) ** 2 + k * k) / ((n + 1) ** 2 + k * k);
/** At an angle θ from the normal (radians), unpolarised light (the mean of s and p), for a metal: Fresnel with the complex
 *  index, written as a² + b² over the surface's own terms (Born and Wolf, Principles of Optics, §14.4). */
export function reflectanceAt(n: number, k: number, theta: number): number {
  const s = Math.sin(theta), c = Math.cos(theta), n2k2 = n * n - k * k - s * s, root = Math.sqrt(n2k2 * n2k2 + 4 * n * n * k * k);
  const a = Math.sqrt(Math.max(0, (root + n2k2) / 2)), b = Math.sqrt(Math.max(0, (root - n2k2) / 2));
  const Rs = ((a - c) ** 2 + b * b) / ((a + c) ** 2 + b * b), Rp = Rs * (((a - s * Math.tan(theta)) ** 2 + b * b) / ((a + s * Math.tan(theta)) ** 2 + b * b));
  return (Rs + Rp) / 2;
}

const norm = NM.reduce((t, _, i) => t + D65[i]! * CMF_Y[i]!, 0);
/** A reflectance spectrum (on the 380–780 nm grid) as XYZ under D65, Y of a perfect white 1. */
export function xyzOf(R: number[]): [number, number, number] {
  let X = 0, Y = 0, Z = 0; for (let i = 0; i < NM.length; i++) { const w = D65[i]! * R[i]!; X += w * CMF_X[i]!; Y += w * CMF_Y[i]!; Z += w * CMF_Z[i]!; }
  return [X / norm, Y / norm, Z / norm];
}
/** XYZ to linear sRGB (IEC 61966-2-1: its primaries and D65 white); the white point XYZ of D65 itself maps to (1, 1, 1)
 *  to the rounding of the standard's matrix. */
export const linearSRGB = ([X, Y, Z]: [number, number, number]): [number, number, number] => [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.204 * Y + 1.057 * Z];
/** Linear to the sRGB curve a screen takes, 0 to 1 (clipped: a colour outside sRGB's gamut is said so by `outOfGamut`). */
export const encodeSRGB = (v: number): number => { const x = Math.max(0, Math.min(1, v)); return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055; };
export const hexOf = (lin: [number, number, number]): number => lin.map((v) => Math.round(encodeSRGB(v) * 255)).reduce((h, v) => (h << 8) | v, 0);

export interface Colour { reflectance: number[]; xyz: [number, number, number]; linear: [number, number, number]; hex: number; outOfGamut: boolean; at: { blue450: number; green550: number; red650: number }; source: string }
/** The colour a surface reflects, from its n + i k at each wavelength. */
export function colourOfNK(n: number[], k: number[], source = ''): Colour {
  const R = n.map((v, i) => reflectanceNormal(v, k[i]!)), xyz = xyzOf(R), lin = linearSRGB(xyz), at = (nm: number) => R[NM.indexOf(nm)]!;
  return { reflectance: R, xyz, linear: lin, hex: hexOf(lin), outOfGamut: lin.some((v) => v < -1e-4 || v > 1 + 1e-4), at: { blue450: at(450), green550: at(550), red650: at(650) }, source: `${source.replace(/\.\s*$/, "")}; ${CIE_SOURCE}` };
}
/** A metal's colour, from its measured optical constants (src/data/optics.ts); null where none is kept. */
export function metalColour(name: string): Colour | null { const m = METAL_NK[name]; return m ? colourOfNK(m.n, m.k, m.source) : null; }
/** The metals whose optical constants are kept. */
export const METALS_MEASURED = Object.keys(METAL_NK);

// ---- a thin film on a surface: an oxide grown on it, a coating laid on it ------------------------------------------
// Light reflects from the film's top and from the metal under it; the two waves add with the phase the film's thickness
// gives them, so some wavelengths cancel and others add: the colour of heat tint on steel, of anodised titanium, of an
// oil film. Airy's sum of every reflection inside the film (Born and Wolf §1.6, §13.4), at normal incidence:
//   r = (r₀₁ + r₁₂ e^{2iβ}) / (1 + r₀₁ r₁₂ e^{2iβ}),  β = 2π N₁ d / λ,  rᵢⱼ = (Nᵢ − Nⱼ) / (Nᵢ + Nⱼ),  N = n + i k
// (a film that absorbs, k₁ > 0, damps the wave from below: e^{2iβ} shrinks as e^{−4π k₁ d / λ}).
type C = [number, number];
const cadd = (a: C, b: C): C => [a[0] + b[0], a[1] + b[1]], cmul = (a: C, b: C): C => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cdiv = (a: C, b: C): C => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
const cexp = (a: C): C => { const m = Math.exp(a[0]); return [m * Math.cos(a[1]), m * Math.sin(a[1])]; };
const fresnel = (a: C, b: C): C => cdiv([a[0] - b[0], a[1] - b[1]], cadd(a, b));
/** The share of light of wavelength λ (nm) reflected, square on, by a film of index N₁ and thickness d (nm) on a
 *  substrate of index N₂, from air. */
export function reflectanceFilm(N1: C, d: number, N2: C, lambda: number): number {
  const r01 = fresnel([1, 0], N1), r12 = fresnel(N1, N2), beta: C = [(2 * Math.PI * N1[0] * d) / lambda, (2 * Math.PI * N1[1] * d) / lambda];
  const ph = cexp([-2 * beta[1], 2 * beta[0]]), top = cadd(r01, cmul(r12, ph)), bot = cadd([1, 0], cmul(cmul(r01, r12), ph)), r = cdiv(top, bot);
  return r[0] * r[0] + r[1] * r[1];
}
/** A metal under a film, its colour: the metal's measured n + i k, the film's, and the film's thickness (nm). */
export function filmColour(metal: string, film: string, d: number): Colour {
  const m = METAL_NK[metal], f = FILM_NK[film]; if (!m) throw new Error(`no optical constants kept for "${metal}"`); if (!f) throw new Error(`no optical constants kept for the film "${film}" (${Object.keys(FILM_NK).join(', ')})`);
  if (!(d >= 0)) throw new Error('a film\'s thickness is nothing or more');
  const R = NM.map((nm, i) => reflectanceFilm([f.n[i]!, f.k[i]!], d, [m.n[i]!, m.k[i]!], nm)), xyz = xyzOf(R), lin = linearSRGB(xyz), at = (nm: number) => R[NM.indexOf(nm)]!;
  return { reflectance: R, xyz, linear: lin, hex: hexOf(lin), outOfGamut: lin.some((v) => v < -1e-4 || v > 1 + 1e-4), at: { blue450: at(450), green550: at(550), red650: at(650) }, source: `${f.source}; on ${m.source.replace(/\.\s*$/, '')}; ${CIE_SOURCE}` };
}
/** The films whose optical constants are kept. */
export const FILMS_MEASURED = Object.keys(FILM_NK);

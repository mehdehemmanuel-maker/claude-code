// A material worked out from what it is made of and how (docs/REALITY.md phase 2.4): any mix of phases (fibres in a
// resin, particles in a metal, filler in a rubber, aggregate in a paste, a solid with pores) gets its properties from its
// phases' by the mathematics of composites, not by looking it up. What is exact is said exact; what only bounds is said
// as its bounds; what a model estimates is said with the model and the bounds it lies within.
//
//   density            Σ φᵢ ρᵢ over volume fractions: exact (with no voids but those given)
//   specific heat      Σ wᵢ cᵢ over mass fractions (Kopp and Neumann): exact for a mixture of phases
//   conduction (heat or electricity) and stiffness, for any number of phases: Hashin and Shtrikman's bounds, the
//     tightest an isotropic mix can be given only its fractions (Hashin & Shtrikman, J. Mech. Phys. Solids 11, 1963;
//     J. Appl. Phys. 33, 1962); within them, by how it is arranged:
//       particles in a matrix   the bound with the matrix as reference: Maxwell's (conduction) and Hashin's (stiffness)
//                               for spheres in a continuous matrix
//       aligned fibres          along, the rule of mixtures (Voigt: parallel); across, Halpin and Tsai (ξ = 2, round
//                               fibres) for stiffness and Rayleigh's for conduction
//       random fibres (in a plane) 3/8 of along and 5/8 of across (Tsai and Pagano); conduction the mean of the two
//       woven (0/90)            half the fibres each way: the mean of along and across, in the plane (a cross-ply, its
//                               weave's crimp left out, which takes some 5 to 15 % off)
//       layers                  in the plane, parallel (Voigt); through, in series (Reuss)
//       grains                  each phase as a continuous network of grains: Bruggeman's effective medium
//       open foam               Gibson and Ashby: E = (ρ*/ρs)² Es, σ = 0.3 (ρ*/ρs)^1.5 σs, k = (ρ*/ρs) ks / 3 + kgas
//   thermal expansion  Turner's: Σ φ K α / Σ φ K (each phase weighted by its bulk modulus)
//   strength along aligned fibres  φ σf + (1 − φ) Em εf (the fibres breaking, the matrix at their strain): the ideal
//     a laminate approaches (real ones reach some 80 to 90 % of it)
//
// A solid solution (an alloy, mixed atom by atom) is not a mix of phases: its electrons are scattered by the mixing, so
// its conduction falls far below any of these (brass, 120 W/m K, against the 300 a mix of copper and zinc would give).
// Its density and specific heat are worked as above (an ideal solution, within a few per cent); its stiffness as the mean
// of its bounds; its conduction is not worked out, and it says so.

export interface Phase { name: string; density?: number; E?: number; /** a fibre's modulus across itself, where it differs (carbon's is far less than along) */ Eacross?: number; nu?: number; k?: number; c?: number; conductivity?: number; alpha?: number; ultimate?: number }
export type Arrangement = 'particles' | 'aligned fibres' | 'random fibres' | 'woven' | 'layers' | 'grains' | 'open foam' | 'solid solution';
export const ARRANGEMENTS: Arrangement[] = ['particles', 'aligned fibres', 'random fibres', 'woven', 'layers', 'grains', 'open foam', 'solid solution'];
export interface Est { value: number; lo?: number; hi?: number; method: string; exact?: boolean }
export interface Mixed { phi: number[]; props: Record<string, Est>; cannot: string[] }

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
/** Hashin and Shtrikman's bound on a conduction with reference k0 (the least phase's for the lower, the most's for the
 *  upper): (Σ φ / (k + 2 k0))⁻¹ − 2 k0, in three dimensions. With the matrix as reference it is Maxwell's. */
const hsK = (phi: number[], k: number[], k0: number) => 1 / sum(phi.map((f, i) => f / (k[i]! + 2 * k0))) - 2 * k0;
/** Their bounds on the bulk and shear moduli, with reference moduli K0 and G0. */
const hsKG = (phi: number[], K: number[], G: number[], K0: number, G0: number): [number, number] => {
  const z = (G0 / 6) * ((9 * K0 + 8 * G0) / (K0 + 2 * G0));
  return [1 / sum(phi.map((f, i) => f / (K[i]! + (4 / 3) * G0))) - (4 / 3) * G0, 1 / sum(phi.map((f, i) => f / (G[i]! + z))) - z];
};
const EofKG = (K: number, G: number) => (9 * K * G) / (3 * K + G), nuOfKG = (K: number, G: number) => (3 * K - 2 * G) / (2 * (3 * K + G));
/** Bruggeman's effective medium: the k for which Σ φ (kᵢ − k) / (kᵢ + 2k) = 0, by bisection between the bounds. */
const bruggeman = (phi: number[], k: number[]) => { let lo = Math.min(...k), hi = Math.max(...k); for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2, f = sum(phi.map((p, j) => (p * (k[j]! - m)) / (k[j]! + 2 * m))); if (f > 0) lo = m; else hi = m; } return (lo + hi) / 2; };

/**
 * A mix of phases, by volume or mass fraction, arranged so: its properties, each with how it was worked out. `matrix` is
 * the continuous phase (for particles and fibres: the first, unless said); `porosity` the share of it that is gas (a
 * foam's), the rest the solid mix.
 */
export function mix(phases: { p: Phase; frac: number }[], by: 'volume' | 'mass', arr: Arrangement, o: { matrix?: number; porosity?: number; gas?: Phase } = {}): Mixed {
  const cannot: string[] = [], props: Record<string, Est> = {};
  const total = sum(phases.map((x) => x.frac)); if (!(total > 0)) throw new Error('a mix needs its phases\' fractions');
  // volume fractions (from mass fractions by each phase's density)
  let phi: number[];
  if (by === 'volume') phi = phases.map((x) => x.frac / total);
  else { if (phases.some((x) => !(x.p.density! > 0))) throw new Error('a mix by mass needs every phase\'s density'); const v = phases.map((x) => x.frac / x.p.density!); phi = v.map((x) => x / sum(v)); }
  const fibrous = arr === 'aligned fibres' || arr === 'random fibres' || arr === 'woven', m = o.matrix ?? (fibrous ? phases.length - 1 : 0), fib = fibrous ? phi.findIndex((_, i) => i !== m) : -1;
  const has = (key: keyof Phase) => phases.every((x) => typeof x.p[key] === 'number' && Number.isFinite(x.p[key] as number));
  const get = (key: keyof Phase) => phases.map((x) => x.p[key] as number);
  if (has('density')) props.density = { value: sum(phi.map((f, i) => f * get('density')[i]!)), method: arr === 'solid solution' ? 'Σ φ ρ (an ideal solution: real alloys differ by a few per cent)' : 'Σ φ ρ', exact: arr !== 'solid solution' };
  else cannot.push('density: a phase\'s density is not known');
  if (has('c') && has('density')) { const w = phi.map((f, i) => f * get('density')[i]!), W = sum(w); props.c = { value: sum(w.map((x, i) => (x / W) * get('c')[i]!)), method: 'Σ w c (Kopp and Neumann)', exact: arr !== 'solid solution' }; }
  else cannot.push('specific heat: a phase\'s specific heat or density is not known');
  // conduction: heat (k) and electricity (conductivity), the same mathematics
  for (const [key, what] of [['k', 'thermal conductivity'], ['conductivity', 'electrical conductivity']] as const) {
    if (arr === 'solid solution') { cannot.push(`${what}: a solid solution conducts far below any mix of its elements (its electrons are scattered by the mixing); not worked out from them`); continue; }
    if (!has(key)) { cannot.push(`${what}: a phase's is not known`); continue; }
    const k = get(key), lo = hsK(phi, k, Math.min(...k)), hi = hsK(phi, k, Math.max(...k)), voigt = sum(phi.map((f, i) => f * k[i]!)), reuss = 1 / sum(phi.map((f, i) => f / Math.max(k[i]!, 1e-300)));
    if (arr === 'particles') props[key] = { value: hsK(phi, k, k[m]!), lo, hi, method: `Maxwell's (Hashin–Shtrikman with ${phases[m]!.p.name} as the matrix)` };
    else if (arr === 'grains') props[key] = { value: bruggeman(phi, k), lo, hi, method: 'Bruggeman\'s effective medium' };
    else if (arr === 'layers') { props[key] = { value: voigt, lo: reuss, hi: voigt, method: 'in the plane of the layers: in parallel (Voigt)' }; props[`${key} through`] = { value: reuss, lo: reuss, hi: voigt, method: 'through the layers: in series (Reuss)', exact: true }; }
    else if (fibrous) {
      const km = k[m]!, kf = k[fib]!, f = phi[fib]!, across = (km * (kf + km + f * (kf - km))) / (kf + km - f * (kf - km)), touching = key === 'conductivity' ? ' (the fibres taken as not touching: at high fractions they do, and conduct far more across)' : '';
      if (arr === 'aligned fibres') { props[key] = { value: voigt, lo: reuss, hi: voigt, method: 'along the fibres: in parallel (the rule of mixtures)', exact: true }; props[`${key} across`] = { value: across, lo: reuss, hi: voigt, method: `across the fibres: Rayleigh's, round fibres in a square array${touching}` }; }
      else props[key] = { value: (voigt + across) / 2, lo, hi, method: `in the plane: the mean of along and across (fibres ${arr === 'woven' ? 'half each way' : 'random in the plane'})${touching}` };
    } else if (arr === 'open foam') { /* below, with the gas */ }
  }
  // stiffness
  if (arr !== 'open foam') {
    if (has('E') && has('nu')) {
      const E = get('E'), nu = get('nu'), K = E.map((e, i) => e / (3 * (1 - 2 * nu[i]!))), G = E.map((e, i) => e / (2 * (1 + nu[i]!)));
      const [Klo, Glo] = hsKG(phi, K, G, Math.min(...K), Math.min(...G)), [Khi, Ghi] = hsKG(phi, K, G, Math.max(...K), Math.max(...G)), lo = EofKG(Klo, Glo), hi = EofKG(Khi, Ghi);
      const voigt = sum(phi.map((f, i) => f * E[i]!)), reuss = 1 / sum(phi.map((f, i) => f / Math.max(E[i]!, 1e-300)));
      if (arr === 'particles') { const [Km, Gm] = hsKG(phi, K, G, K[m]!, G[m]!); props.E = { value: EofKG(Km, Gm), lo, hi, method: `Hashin–Shtrikman with ${phases[m]!.p.name} as the matrix (Hashin's for spheres in it)` }; props.nu = { value: nuOfKG(Km, Gm), method: 'from the same bulk and shear moduli' }; }
      else if (arr === 'grains' || arr === 'solid solution') { const Kh = (Klo + Khi) / 2, Gh = (Glo + Ghi) / 2; props.E = { value: EofKG(Kh, Gh), lo, hi, method: 'the mean of the Hashin–Shtrikman bounds (Hill\'s average)' }; props.nu = { value: nuOfKG(Kh, Gh), method: 'from the same bulk and shear moduli' }; }
      else if (arr === 'layers') { props.E = { value: voigt, lo: reuss, hi: voigt, method: 'in the plane of the layers: the rule of mixtures (Voigt)' }; props['E through'] = { value: reuss, lo: reuss, hi: voigt, method: 'through the layers: in series (Reuss)' }; props.nu = { value: sum(phi.map((f, i) => f * nu[i]!)), method: 'the rule of mixtures' }; }
      else {
        const Em = E[m]!, Ef = phases[fib]!.p.Eacross ?? E[fib]!, f = phi[fib]!, eta = (Ef / Em - 1) / (Ef / Em + 2), ET = (Em * (1 + 2 * eta * f)) / (1 - eta * f), EL = voigt;
        const crossSaid = phases[fib]!.p.Eacross ? ` (with the fibre's own modulus across it, ${+(phases[fib]!.p.Eacross! / 1e9).toPrecision(3)} GPa)` : ' (the fibre taken as stiff across as along)';
        if (arr === 'aligned fibres') { props.E = { value: EL, lo: reuss, hi: voigt, method: 'along the fibres: the rule of mixtures', exact: true }; props['E across'] = { value: ET, lo: reuss, hi: voigt, method: `across the fibres: Halpin and Tsai (ξ = 2, round fibres)${crossSaid}` }; }
        else if (arr === 'woven') props.E = { value: (EL + ET) / 2, lo: reuss, hi: voigt, method: `in the plane, along either set of fibres: the mean of along and across (a cross-ply, its crimp left out)${crossSaid}` };
        else props.E = { value: (3 / 8) * EL + (5 / 8) * ET, lo: reuss, hi: voigt, method: `in the plane: 3/8 of along and 5/8 of across (Tsai and Pagano, fibres random in a plane)${crossSaid}` };
        props.nu = { value: sum(phi.map((x, i) => x * nu[i]!)), method: 'the rule of mixtures' };
      }
      // its expansion, each phase weighted by its bulk modulus (Turner)
      if (has('alpha')) { const a = get('alpha'); props.alpha = { value: sum(phi.map((x, i) => x * K[i]! * a[i]!)) / sum(phi.map((x, i) => x * K[i]!)), lo: Math.min(...a), hi: Math.max(...a), method: 'Turner\'s: Σ φ K α / Σ φ K' }; }
      else cannot.push('thermal expansion: a phase\'s is not known');
      // strength along aligned fibres: the fibres breaking, the matrix at their strain
      if (arr === 'aligned fibres' && phases[fib]!.p.ultimate) { const sf = phases[fib]!.p.ultimate!, f = phi[fib]!; props.ultimate = { value: f * sf + (1 - f) * E[m]! * (sf / E[fib]!), method: 'along the fibres: φ σf + (1 − φ) Em εf, the ideal (laminates reach some 80 to 90 % of it)' }; }
    } else cannot.push('stiffness: a phase\'s elastic modulus or Poisson\'s ratio is not known');
  }
  // a foam: the solid mix with pores; Gibson and Ashby's laws on its relative density
  if (arr === 'open foam') {
    const p = o.porosity ?? 0; if (!(p > 0 && p < 1)) throw new Error('a foam needs its porosity, between 0 and 1');
    const rr = 1 - p, s = phases[0]!.p, gas = o.gas;
    if (s.density) props.density = { value: rr * s.density + p * (gas?.density ?? 0), method: 'Σ φ ρ (the solid and its gas)', exact: true };
    if (s.E) props.E = { value: rr * rr * s.E, method: 'Gibson and Ashby, open cells: (ρ*/ρs)² Es' };
    if (s.ultimate) props.ultimate = { value: 0.3 * rr ** 1.5 * s.ultimate, method: 'Gibson and Ashby, open cells, plastic collapse: 0.3 (ρ*/ρs)^1.5 σs' };
    if (s.k) props.k = { value: (rr * s.k) / 3 + p * (gas?.k ?? 0), method: 'Gibson and Ashby: (ρ*/ρs) ks / 3 through the struts, plus the gas' };
    if (s.c && s.density) props.c = { value: s.c, method: 'the solid\'s (the gas holds next to nothing)' };
    if (s.alpha) props.alpha = { value: s.alpha, method: 'the solid\'s (a foam grows as its struts do)' };
    if (s.conductivity) props.conductivity = { value: (rr * s.conductivity) / 3, method: 'Gibson and Ashby: (ρ*/ρs) σs / 3 through the struts' };
  }
  return { phi, props, cannot };
}

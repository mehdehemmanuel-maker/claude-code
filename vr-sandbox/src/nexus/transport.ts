// How long a change carried by conduction takes, against how long the matter is where it changes. A matter that must
// be brought to a potential through itself, by conduction from its surface, changes no faster than its own time,
// its size squared over its diffusivity times the Fourier number its centre needs. If it moves through the place of
// change, it must stay there that long: the place is at least as long as the speed it moves at times that time.
//
// For a round stream heated through its surface the two sizes cancel: the length it must be heated over is the
// Fourier number times its flow, its density and its heat capacity over π times its conductivity, whatever its
// diameter. A thinner stream moves faster by exactly what it heats faster. Only splitting the flow, or heating the
// matter otherwise than through itself, shortens it.
//
// The solutions are of the heat equation in a cylinder (Bessel's functions): mathematics, with their domain stated
// (properties constant, the surface held at one potential, the matter not mixed as it moves).

/** Bessel's function of the first kind, by its power series: exact enough below twenty. */
export function besselJ(n: number, x: number): number {
  let term = (x / 2) ** n, s = 0;
  for (let k = 1; k <= n; k++) term /= k;
  for (let k = 0; k < 80; k++) {
    s += term;
    term *= -((x / 2) ** 2) / ((k + 1) * (k + 1 + n));
    if (Math.abs(term) < 1e-17 * Math.abs(s)) break;
  }
  return s;
}

/** The first zeros of J0, by bisection between sign changes. */
export function besselZeros(count: number): number[] {
  const out: number[] = [];
  let a = 0.1, fa = besselJ(0, a);
  for (let x = 0.2; out.length < count; x += 0.1) {
    const fx = besselJ(0, x);
    if (fa * fx < 0) {
      let lo = a, hi = x;
      for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (besselJ(0, lo) * besselJ(0, m) <= 0) hi = m; else lo = m; }
      out.push((lo + hi) / 2);
    }
    a = x; fa = fx;
  }
  return out;
}

/** The centre of a long cylinder whose surface is held at a new potential: the share of the step still to come at Fourier number Fo. */
export function cylinderCentre(Fo: number, terms = 8): number {
  return besselZeros(terms).reduce((s, l) => s + (2 / (l * besselJ(1, l))) * Math.exp(-l * l * Fo), 0);
}

/** The Fourier number at which the centre has the given share of the step still to come. */
export function centreFourier(share: number): number {
  if (!(share > 0 && share < 1)) throw new Error('the share of the step left must lie between none and all of it');
  let lo = 0, hi = 10;
  for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (cylinderCentre(m) > share) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

/**
 * The least length a round stream must be heated over, its surface held at `surface`, for its centre to reach
 * `threshold` from `start`: the Fourier number its centre needs times its flow, density and heat capacity, over π
 * times its conductivity. Its diameter does not enter.
 */
export function leastHeatedLength(flow: number, density: number, capacity: number, conductivity: number, start: number, threshold: number, surface: number): { length: number; Fo: number; share: number } {
  const share = (surface - threshold) / (surface - start);
  const Fo = centreFourier(share);
  return { length: (Fo * flow * density * capacity) / (Math.PI * conductivity), Fo, share };
}

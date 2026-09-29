// The magnet force model against exact solutions.
//
// Field of a pole face: the closed forms against brute-force integration of Coulomb's law over the face.
// Force between magnets (Gilbert model: uniformly charged pole faces): the exact face-to-face force of two coaxial
// discs of radius R and charge densities s1, s2 at separation z is
//   F = mu0 s1 s2 pi R^2 int_0^inf J1(kR)^2 exp(-k z) / k dk
// and a magnet pair is the signed sum over its four face pairs.

import { describe, expect, it } from 'vitest';
import {
  blendedInteraction, blockCharges, blockFaces, cylinderCharges, cylinderFaces, imageFaces, magnetWrench, ringLevel, transformCharges,
  type Vec3,
} from '../../src/engineering/magnets';
import { discField, discFieldFast, ellipticG, ellipticKE, rectField } from '../../src/engineering/magnetField';

const MU0 = 4e-7 * Math.PI;

function J1(x: number) {
  if (x > 25) return Math.sqrt(2 / (Math.PI * x)) * Math.cos(x - (3 * Math.PI) / 4);
  let term = x / 2, sum = term;
  for (let k = 1; k < 80; k++) { term *= -(x * x) / (4 * k * (k + 1)); sum += term; if (Math.abs(term) < 1e-17 * Math.abs(sum)) break; }
  return sum;
}

function faceForce(s: number, R: number, z: number) {
  const kmax = z > 0 ? Math.min(60 / R, 40 / z + 60 / R) : 4000 / R;
  const n = 60000;
  let I = 0;
  for (let i = 0; i < n; i++) {
    const k = ((i + 0.5) / n) * kmax;
    const j = J1(k * R);
    I += (j * j * Math.exp(-k * z)) / k;
  }
  return MU0 * s * s * Math.PI * R * R * I * (kmax / n);
}

const Br = 1.3, s = Br / MU0;
/** Exact attraction of two identical coaxial discs (same orientation) at a face gap. */
const exact = (R: number, L: number, gap: number) => faceForce(s, R, gap) - 2 * faceForce(s, R, gap + L) + faceForce(s, R, gap + 2 * L);
/** Model attraction: A's faces acting on samples of B, B sideways by x. */
const model = (R: number, L: number, gap: number, rings: number, x = 0) => {
  const B = cylinderCharges([x, L + gap, 0], [0, 1, 0], R, L, Br, rings);
  return magnetWrench(cylinderFaces([0, 0, 0], [0, 1, 0], R, L, Br), B, [x, L + gap, 0]);
};
const pull = (R: number, L: number, gap: number, rings: number, x = 0) => -model(R, L, gap, rings, x)[1]!;

function bruteDisc(a: number, sx: number, z: number) {
  const nr = 600, nt = 800;
  let hn = 0, hs = 0;
  for (let i = 0; i < nr; i++) {
    const r = ((i + 0.5) / nr) * a;
    for (let j = 0; j < nt; j++) {
      const t = ((j + 0.5) / nt) * 2 * Math.PI;
      const dx = sx - r * Math.cos(t), dy = -r * Math.sin(t), d2 = dx * dx + dy * dy + z * z;
      const w = (r * (a / nr) * ((2 * Math.PI) / nt)) / (4 * Math.PI * d2 * Math.sqrt(d2));
      hn += w * z; hs += w * dx;
    }
  }
  return [hn, hs];
}

function bruteRect(hw: number, hh: number, u: number, v: number, z: number) {
  const n = 700;
  let hx = 0, hy = 0, hz = 0;
  for (let i = 0; i < n; i++) {
    const x = -hw + ((i + 0.5) / n) * 2 * hw;
    for (let j = 0; j < n; j++) {
      const y = -hh + ((j + 0.5) / n) * 2 * hh;
      const dx = u - x, dy = v - y, d2 = dx * dx + dy * dy + z * z;
      const w = ((2 * hw) / n) * ((2 * hh) / n) / (4 * Math.PI * d2 * Math.sqrt(d2));
      hx += w * dx; hy += w * dy; hz += w * z;
    }
  }
  return [hx, hy, hz];
}

describe('field of a charged pole face (closed forms)', () => {
  it('elliptic integrals', () => {
    const [K, E] = ellipticKE(0.5);
    expect(K).toBeCloseTo(1.8540746773013719, 12);
    expect(E).toBeCloseTo(1.3506438810476755, 12);
    // (1 - m/2) K - E: series and closed form agree where both hold
    const [k3, e3] = ellipticKE(0.3);
    expect(ellipticG(0.3)).toBeCloseTo((1 - 0.15) * k3 - e3, 14);
    expect(ellipticG(1e-4) / ((Math.PI / 32) * 1e-8)).toBeCloseTo(1, 3);
  });
  it('a disc: on its axis, over it, at its rim, beside it, far off and behind it', () => {
    for (const [sx, z] of [[0, 0.3], [0.5, 0.2], [0.95, 0.15], [1, 0.2], [1.05, 0.15], [2, 0.5], [5, 3], [0.5, -0.4], [1.5, 0.1]] as const) {
      const f = discField(1, sx, z), b = bruteDisc(1, sx, z);
      expect(Math.abs(f[0] - b[0]!), `Hn at ${sx},${z}`).toBeLessThan(2e-5);
      expect(Math.abs(f[1] - b[1]!), `Hs at ${sx},${z}`).toBeLessThan(2e-5);
    }
    expect(discField(1, 0, 0.3)[0]).toBeCloseTo(0.5 * (1 - 0.3 / Math.hypot(1, 0.3)), 12);
    // just in front and inside the outline: the sheet value 1/2, wherever the point is
    expect(discField(1, 0.5, 0)[0]).toBe(0.5);
    expect(discField(1, 1.5, 0)[0]).toBe(0);
  });
  it('the tabulated disc field matches the closed form to 5e-4 (outside 1e-3 radii of the rim itself)', () => {
    let worst = 0;
    for (let i = 0; i < 20000; i++) {
      const sx = Math.abs(Math.sin(i * 12.9898) * 9), z = Math.sin(i * 78.233) * 9 * Math.abs(Math.sin(i * 3.1));
      if (Math.abs(z) < 1e-3 && Math.abs(sx - 1) < 0.05) continue;
      const e = discField(1, sx, z), f = discFieldFast(1, sx, z);
      worst = Math.max(worst, Math.hypot(e[0] - f[0], e[1] - f[1]) / (Math.hypot(e[0], e[1]) + 1e-12));
    }
    expect(worst).toBeLessThan(5e-4);
    // scaled discs use the same table
    const e = discField(0.01, 0.004, 0.003), f = discFieldFast(0.01, 0.004, 0.003);
    expect(Math.abs(e[0] - f[0]) + Math.abs(e[1] - f[1])).toBeLessThan(5e-4);
  });
  it('a rectangle', () => {
    for (const [u, v, z] of [[0, 0, 0.3], [0.8, 0.2, 0.2], [1.1, 0.3, 0.2], [2, 1, 0.5], [0.3, -0.4, -0.3]] as const) {
      const f = rectField(1, 0.5, u, v, z), b = bruteRect(1, 0.5, u, v, z);
      for (let i = 0; i < 3; i++) expect(Math.abs(f[i]! - b[i]!), `H${i} at ${u},${v},${z}`).toBeLessThan(2e-5);
    }
    expect(rectField(1, 1, 0.2, 0.3, 0)[2]).toBeCloseTo(0.5, 12);
  });
});

describe('magnet force (Gilbert model) against the exact coaxial solution', () => {
  it('touching magnets attract with the right force (two N42 20 x 10 mm discs: 133 N exactly)', () => {
    const e = exact(0.01, 0.01, 0);
    expect(e).toBeGreaterThan(125);
    expect(e).toBeLessThan(140);
    expect(Math.abs(pull(0.01, 0.01, 0, 4) / e - 1)).toBeLessThan(0.015);
  });
  it('within 4% of exact at every gap with the working quadrature, and the pull only weakens as they separate', () => {
    let prev = Infinity;
    for (const g of [0, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 4]) {
      const gap = g * 0.01, m = pull(0.01, 0.01, gap, 4), e = exact(0.01, 0.01, gap);
      expect(Math.abs(m / e - 1), `gap ${gap}`).toBeLessThan(0.04);
      expect(m).toBeLessThan(prev);
      prev = m;
    }
  });
  it('size does not matter: a 4 x 2 mm pair is the 20 x 10 pair scaled (force scales with area)', () => {
    for (const g of [0, 0.1, 1]) expect(pull(0.002, 0.002, g * 0.002, 4) / pull(0.01, 0.01, g * 0.01, 4)).toBeCloseTo(0.04, 9);
  });
  it('thin magnets attract at every gap, near exact once apart (their faces nearly cancel, so contact is hardest)', () => {
    // measured with 4 rings, model / exact: 20 x 3 mm 0.96 touching, 1.10 worst; 20 x 2 0.90, 1.14; 20 x 1 0.64, 1.21
    for (const [L, contact, worst] of [[0.003, 0.06, 0.12], [0.002, 0.12, 0.16], [0.001, 0.4, 0.25]] as const) {
      expect(Math.abs(pull(0.01, L, 0, 4) / exact(0.01, L, 0) - 1), `${L} touching`).toBeLessThan(contact);
      for (const g of [0.0002, 0.001, 0.005, 0.02]) {
        const r = pull(0.01, L, g, 4) / exact(0.01, L, g);
        expect(r, `${L} at ${g}`).toBeGreaterThan(1 - worst);
        expect(r, `${L} at ${g}`).toBeLessThan(1 + worst);
      }
    }
  });
});

describe('touching magnets shifted sideways (the samples of one face never line up with the other)', () => {
  it('the pull only weakens as the overlap shrinks, and sideways the faces pull back into line', () => {
    let prev = Infinity;
    for (const off of [0, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.25]) {
      const f = model(0.01, 0.01, 1e-7, 4, off * 0.01);
      expect(-f[1]!, `pull at ${off} R`).toBeLessThan(prev + 1e-9);
      expect(-f[1]!, `pull at ${off} R`).toBeGreaterThan(0);
      if (off > 0) expect(f[0]!, `centring at ${off} R`).toBeLessThan(0);
      prev = -f[1]!;
    }
  });
  it('agrees with a finely sampled reference at every offset', () => {
    const aligned = pull(0.01, 0.01, 1e-7, 14);
    for (const off of [0.05, 0.15, 0.3, 0.5, 1]) {
      // errors measured against the aligned pull (133 N): the pull itself falls towards zero as they part sideways
      const f = model(0.01, 0.01, 1e-7, 4, off * 0.01), ref = model(0.01, 0.01, 1e-7, 14, off * 0.01);
      // measured: pull within 3.0%, the centring force up to 7% high just off alignment (the rims' pull is steepest)
      expect(Math.abs(f[1]! - ref[1]!) / aligned, `pull at ${off} R`).toBeLessThan(0.035);
      expect(Math.abs(f[0]! - ref[0]!) / aligned, `sideways at ${off} R`).toBeLessThan(0.08);
    }
  });
  it('sliding one across the other changes the force smoothly: no steeper than the finely sampled physics', () => {
    const A = cylinderFaces([0, 0, 0], [0, 1, 0], 0.01, 0.01, Br);
    const worstStep = (rings: number) => {
      const B0 = cylinderCharges([0, 0.01 + 1e-7, 0], [0, 1, 0], 0.01, 0.01, Br, rings);
      let prev: number[] | null = null, worst = 0;
      for (let i = 0; i <= 1000; i++) {
        const x = i * (0.022 / 1000);
        const f = magnetWrench(A, transformCharges(B0, [0, 0.01, 0], [x, 0, 0], [0, 0, 0]), [x, 0.01, 0]);
        if (prev) worst = Math.max(worst, Math.abs(f[1]! - prev[1]!), Math.abs(f[0]! - prev[0]!));
        prev = f;
      }
      return worst;
    };
    // the steepest change is real: just off alignment the rims pull the faces back into line at ~50 kN/m
    const ref = worstStep(14);
    expect(ref).toBeGreaterThan(0.5);
    expect(worstStep(4)).toBeLessThan(1.1 * ref);
    expect(worstStep(3)).toBeLessThan(1.1 * ref);
  });
});

describe('the model is conservative and consistent', () => {
  it('its stiffness is symmetric (the force derives from a potential), also close to contact, off centre and over the edge', () => {
    for (const [x, gap] of [[0.0003, 1e-4], [0.002, 1e-4], [0.005, 1e-4], [0.002, 5e-4], [0.001, 0.002], [0.012, 3e-4]] as const) {
      const f = (d: Vec3) => model(0.01, 0.01, gap + d[1], 4, x + d[0]);
      const h = 2e-5;
      const Jxy = (f([0, h, 0])[0]! - f([0, -h, 0])[0]!) / (2 * h);
      const Jyx = (f([h, 0, 0])[1]! - f([-h, 0, 0])[1]!) / (2 * h);
      const Jxx = (f([h, 0, 0])[0]! - f([-h, 0, 0])[0]!) / (2 * h);
      expect(Math.abs(Jxy - Jyx) / Math.max(Math.abs(Jxx), Math.abs(Jxy)), `at x ${x} gap ${gap}`).toBeLessThan(0.002);
    }
  });
  it('the force on either magnet is the same whichever is sampled (reciprocity)', () => {
    const cA: Vec3 = [0, 0, 0], cB: Vec3 = [0.004, 0.002, 0.016], nB: Vec3 = [0.3, 0, 0.95];
    const n = Math.hypot(...nB);
    const nb: Vec3 = [nB[0] / n, nB[1] / n, nB[2] / n];
    const fB = magnetWrench(cylinderFaces(cA, [0, 0, 1], 0.005, 0.005, Br), cylinderCharges(cB, nb, 0.005, 0.005, Br, 4), cB);
    const fA = magnetWrench(cylinderFaces(cB, nb, 0.005, 0.005, Br), cylinderCharges(cA, [0, 0, 1], 0.005, 0.005, Br, 4), cA);
    for (let i = 0; i < 3; i++) expect(Math.abs(fA[i]! + fB[i]!) / Math.hypot(fB[0]!, fB[1]!, fB[2]!)).toBeLessThan(0.01);
  });
  it('blocks: a block pair touching pulls with its faces\' sheet value less the fringe, like discs', () => {
    const w = 0.02, L = 0.01;
    const A = blockFaces([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1], w, w, L, Br);
    const f = (rings: number) => -magnetWrench(A, blockCharges([0, L, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1], w, w, L, Br, rings), [0, L, 0])[1]!;
    const sheet = (Br * Br * w * w) / (2 * MU0);
    expect(f(7)).toBeLessThan(sheet);
    expect(f(7)).toBeGreaterThan(0.5 * sheet);
    expect(Math.abs(f(7) / f(15) - 1)).toBeLessThan(0.03);
  });
  it('a magnet is pulled onto a steel face (image method), as hard as onto its own mirror image', () => {
    const c: Vec3 = [0, 0, 0.0051];
    const faces = cylinderFaces(c, [0, 0, 1], 0.005, 0.01, Br);
    const f = magnetWrench(imageFaces(faces, [0, 0, 0], [0, 0, 1], 1), cylinderCharges(c, [0, 0, 1], 0.005, 0.01, Br, 4), c);
    expect(f[2]).toBeLessThan(0);
    // the image of a magnet in a perfect steel plate is an identical magnet face to face: same as a coaxial pair
    const pair = pull(0.005, 0.01, 0.0002, 4);
    expect(Math.abs(-f[2]! / pair - 1)).toBeLessThan(0.02);
  });
});

describe('quadrature level', () => {
  it('the force is continuous as the quadrature level eases with distance (no steps)', () => {
    const R = 0.01, L = 0.01;
    const f = (gap: number) => {
      const level = ringLevel(gap, R);
      return -blendedInteraction(level, (rings) => model(R, L, gap, rings))[1]!;
    };
    let prev = f(0);
    for (let i = 1; i <= 400; i++) {
      const gap = 0.4 * (i / 400) ** 2;
      const cur = f(gap);
      expect(cur).toBeLessThanOrEqual(prev * (1 + 1e-9));
      expect(Math.abs(cur - prev) / prev).toBeLessThan(0.05);
      prev = cur;
    }
  });
});

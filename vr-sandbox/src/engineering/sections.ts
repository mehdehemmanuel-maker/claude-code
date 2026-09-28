// Cross-section properties used for member strength, bending and buckling.
// All inputs in metres. I is about the weaker principal axis unless noted.

export interface Section {
  /** Area, m^2. */
  A: number;
  /** Second moment of area about the governing (weak) bending axis, m^4. */
  I: number;
  /** Elastic section modulus S = I / c, m^3. */
  S: number;
  /** Plastic section modulus Z, m^3. */
  Z: number;
  /** Torsion constant J, m^4. */
  J: number;
  /** Distance to extreme fibre for torsion stress, m. */
  rTorsion: number;
}

export function roundSection(d: number): Section {
  return {
    A: (Math.PI * d * d) / 4,
    I: (Math.PI * d ** 4) / 64,
    S: (Math.PI * d ** 3) / 32,
    Z: d ** 3 / 6,
    J: (Math.PI * d ** 4) / 32,
    rTorsion: d / 2,
  };
}

export function tubeSection(D: number, t: number): Section {
  const di = Math.max(0, D - 2 * t);
  const I = (Math.PI * (D ** 4 - di ** 4)) / 64;
  return {
    A: (Math.PI * (D * D - di * di)) / 4,
    I,
    S: I / (D / 2),
    Z: (D ** 3 - di ** 3) / 6,
    J: 2 * I,
    rTorsion: D / 2,
  };
}

/** Solid rectangle b x h; bending about the axis giving the smaller I. */
export function rectSection(b: number, h: number): Section {
  const w = Math.max(b, h);
  const t = Math.min(b, h);
  const I = (w * t ** 3) / 12;
  // Roark: J = a b^3 [1/3 - 0.21 (b/a)(1 - b^4 / (12 a^4))] with a >= b.
  const J = w * t ** 3 * (1 / 3 - 0.21 * (t / w) * (1 - t ** 4 / (12 * w ** 4)));
  return { A: b * h, I, S: I / (t / 2), Z: (w * t * t) / 4, J, rTorsion: t / 2 };
}

/** Rectangular hollow section B x H x wall t (weak axis). */
export function rectTubeSection(B: number, H: number, t: number): Section {
  const w = Math.max(B, H);
  const h = Math.min(B, H);
  const wi = Math.max(0, w - 2 * t);
  const hi = Math.max(0, h - 2 * t);
  const I = (w * h ** 3 - wi * hi ** 3) / 12;
  const Am = (w - t) * (h - t);
  // Bredt-Batho thin-walled torsion constant.
  const J = (4 * Am * Am * t) / (2 * ((w - t) + (h - t)));
  return { A: w * h - wi * hi, I, S: I / (h / 2), Z: (w * h * h - wi * hi * hi) / 4, J, rTorsion: h / 2 };
}

/** Doubly symmetric I-beam: flange width b, depth h, flange thickness tf, web thickness tw (weak axis governs). */
export function iBeamSection(b: number, h: number, tf: number, tw: number): Section {
  const hw = h - 2 * tf;
  const Iweak = (2 * tf * b ** 3) / 12 + (hw * tw ** 3) / 12;
  const Zweak = (2 * tf * b * b) / 4 + (hw * tw * tw) / 4;
  const J = (2 * b * tf ** 3 + (h - tf) * tw ** 3) / 3;
  return { A: 2 * b * tf + hw * tw, I: Iweak, S: Iweak / (b / 2), Z: Zweak, J, rTorsion: Math.max(tf, tw) };
}

/** Strong-axis properties of an I-beam (for load-orientation-aware checks). */
export function iBeamStrongAxis(b: number, h: number, tf: number, tw: number) {
  const hw = h - 2 * tf;
  const I = (b * h ** 3 - (b - tw) * hw ** 3) / 12;
  const Z = b * tf * (h - tf) + (tw * hw * hw) / 4;
  return { I, S: I / (h / 2), Z };
}

// ISO metric screw threads and fastener strength data.
// Geometry per ISO 68-1 / ISO 724 (basic profile), strength per ISO 898-1 (carbon/alloy steel)
// and ISO 3506-1 (stainless). All lengths in metres, stresses in pascals.

export interface MetricThread {
  /** Nominal (major) diameter, m. */
  d: number;
  /** Pitch, m. */
  P: number;
}

/** ISO 261 coarse pitch series. */
export const METRIC_COARSE: Record<string, MetricThread> = {
  M3: { d: 0.003, P: 0.0005 },
  M4: { d: 0.004, P: 0.0007 },
  M5: { d: 0.005, P: 0.0008 },
  M6: { d: 0.006, P: 0.001 },
  M8: { d: 0.008, P: 0.00125 },
  M10: { d: 0.01, P: 0.0015 },
  M12: { d: 0.012, P: 0.00175 },
  M14: { d: 0.014, P: 0.002 },
  M16: { d: 0.016, P: 0.002 },
  M20: { d: 0.02, P: 0.0025 },
  M24: { d: 0.024, P: 0.003 },
};

/** Hex head bearing-face diameter d_w (ISO 4017 minimum), m. */
export const HEX_BEARING_DIAMETER: Record<string, number> = {
  M3: 0.00457, M4: 0.00588, M5: 0.00688, M6: 0.00888, M8: 0.01163, M10: 0.01463,
  M12: 0.01663, M14: 0.01964, M16: 0.02249, M20: 0.02819, M24: 0.03361,
};

/** Hex head width across flats s (ISO 4017), m. */
export const HEX_ACROSS_FLATS: Record<string, number> = {
  M3: 0.0055, M4: 0.007, M5: 0.008, M6: 0.01, M8: 0.013, M10: 0.016,
  M12: 0.018, M14: 0.021, M16: 0.024, M20: 0.03, M24: 0.036,
};

/** Clearance hole diameter, medium series (ISO 273), m. */
export const CLEARANCE_HOLE_MEDIUM: Record<string, number> = {
  M3: 0.0034, M4: 0.0045, M5: 0.0055, M6: 0.0066, M8: 0.009, M10: 0.011,
  M12: 0.0135, M14: 0.0155, M16: 0.0175, M20: 0.022, M24: 0.026,
};

export interface PropertyClass {
  id: string;
  /** Minimum tensile strength Rm, Pa. */
  Rm: number;
  /** Minimum yield (ReL) or 0.2% proof stress Rp0.2, Pa. */
  Rp: number;
  source: string;
}

const MPa = 1e6;

export const PROPERTY_CLASSES: Record<string, PropertyClass> = {
  '4.6': { id: '4.6', Rm: 400 * MPa, Rp: 240 * MPa, source: 'ISO 898-1:2013 Table 3' },
  '4.8': { id: '4.8', Rm: 420 * MPa, Rp: 340 * MPa, source: 'ISO 898-1:2013 Table 3' },
  '5.8': { id: '5.8', Rm: 520 * MPa, Rp: 420 * MPa, source: 'ISO 898-1:2013 Table 3' },
  '8.8': { id: '8.8', Rm: 800 * MPa, Rp: 640 * MPa, source: 'ISO 898-1:2013 Table 3 (d <= 16 mm)' },
  '10.9': { id: '10.9', Rm: 1040 * MPa, Rp: 940 * MPa, source: 'ISO 898-1:2013 Table 3' },
  '12.9': { id: '12.9', Rm: 1220 * MPa, Rp: 1100 * MPa, source: 'ISO 898-1:2013 Table 3' },
  'A2-70': { id: 'A2-70', Rm: 700 * MPa, Rp: 450 * MPa, source: 'ISO 3506-1:2020 Table 6' },
  'A4-80': { id: 'A4-80', Rm: 800 * MPa, Rp: 600 * MPa, source: 'ISO 3506-1:2020 Table 6' },
};

/** 8.8 bolts above M16 have higher minimum values. */
export function propertyClassFor(id: string, d: number): PropertyClass {
  const pc = PROPERTY_CLASSES[id];
  if (!pc) throw new Error(`Unknown property class ${id}`);
  if (id === '8.8' && d > 0.016) return { ...pc, Rm: 830 * MPa, Rp: 660 * MPa };
  return pc;
}

/** Pitch diameter d2 = d - 0.649519 P (ISO 724). */
export const pitchDiameter = (t: MetricThread) => t.d - 0.649519 * t.P;

/** Minor diameter of the external thread d3 = d - 1.226869 P (ISO 898-1). */
export const minorDiameter = (t: MetricThread) => t.d - 1.226869 * t.P;

/** Diameter for the tensile stress area: d_s = (d2 + d3) / 2. */
export const stressDiameter = (t: MetricThread) => (pitchDiameter(t) + minorDiameter(t)) / 2;

/** Tensile stress area As = (pi/4) ((d2 + d3)/2)^2 (ISO 898-1 clause 9.1.6.1). */
export const tensileStressArea = (t: MetricThread) => (Math.PI / 4) * stressDiameter(t) ** 2;

export function threadFor(size: string): MetricThread {
  const t = METRIC_COARSE[size];
  if (!t) throw new Error(`Unknown thread ${size}`);
  return t;
}

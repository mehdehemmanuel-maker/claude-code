// The person the world is built for. Every artefact made for a person takes its sizes from these by law
// (construct/laws.ts, scale.person), never from a number inside a generator: a seat is popliteal height plus a shoe,
// a desk is a seat plus the elbow above it, a passage is the shoulders plus clearance, a rung pitch is a step. Each
// number says where it is from; the design person (what a seat or a rung is rated for) is a standard's figure, not an
// average.

export interface Measure { value: number; unit: 'm' | 'kg' | 'N'; name: string; source: string; kind: 'handbook' | 'standard' | 'estimate' }

const PHEASANT = 'Pheasant & Haslegrave, Bodyspace (3rd ed., 2006), British adults 19 to 65, 50th percentile, men and women averaged';

export const PERSON = {
  stature: { value: 1.675, unit: 'm', name: 'stature', source: PHEASANT, kind: 'handbook' },
  eyeHeight: { value: 1.568, unit: 'm', name: 'eye height, standing', source: PHEASANT, kind: 'handbook' },
  shoulderHeight: { value: 1.368, unit: 'm', name: 'shoulder height, standing', source: PHEASANT, kind: 'handbook' },
  elbowHeight: { value: 1.048, unit: 'm', name: 'elbow height, standing', source: PHEASANT, kind: 'handbook' },
  hipHeight: { value: 0.865, unit: 'm', name: 'hip height, standing', source: PHEASANT, kind: 'handbook' },
  knuckleHeight: { value: 0.728, unit: 'm', name: 'knuckle height, standing', source: PHEASANT, kind: 'handbook' },
  poplitealHeight: { value: 0.42, unit: 'm', name: 'popliteal height, sitting (floor to the back of the knee)', source: PHEASANT, kind: 'handbook' },
  elbowRestHeight: { value: 0.24, unit: 'm', name: 'elbow rest height, sitting (seat to elbow)', source: PHEASANT, kind: 'handbook' },
  shoulderBreadth: { value: 0.43, unit: 'm', name: 'shoulder (bideltoid) breadth', source: PHEASANT, kind: 'handbook' },
  hipBreadth: { value: 0.365, unit: 'm', name: 'hip breadth, sitting', source: PHEASANT, kind: 'handbook' },
  buttockPopliteal: { value: 0.488, unit: 'm', name: 'buttock to popliteal length, sitting', source: PHEASANT, kind: 'handbook' },
  forwardReach: { value: 0.743, unit: 'm', name: 'forward grip reach', source: PHEASANT, kind: 'handbook' },
  verticalReach: { value: 1.983, unit: 'm', name: 'vertical grip reach, standing', source: PHEASANT, kind: 'handbook' },
  footLength: { value: 0.25, unit: 'm', name: 'foot length', source: PHEASANT, kind: 'handbook' },
  mass: { value: 69, unit: 'kg', name: 'body mass', source: PHEASANT, kind: 'handbook' },
  shoe: { value: 0.025, unit: 'm', name: 'shoe allowance under the heel', source: 'Pheasant & Haslegrave, Bodyspace: a 25 mm shoe correction to standing and sitting heights', kind: 'handbook' },
  /** What a seat, a rung or a footbridge is rated to carry: a standard's design person, heavier than the average. */
  designMass: { value: 100, unit: 'kg', name: 'design person mass', source: 'EN 1335 (office seating) and EN 131 (ladders) rate for about 100 to 150 kg; 100 kg taken as the design person for furniture', kind: 'standard' },
  rungPitch: { value: 0.3, unit: 'm', name: 'rung to rung', source: 'EN 131-1: rung spacing 250 to 300 mm', kind: 'standard' },
  stepRise: { value: 0.18, unit: 'm', name: 'a comfortable stair rise', source: 'Approved Document K (England): private stair rise 150 to 220 mm; 180 mm taken', kind: 'standard' },
  push: { value: 300, unit: 'N', name: 'a firm two-handed push', source: 'ISO 11228-2 and the Snook & Ciriello tables put sustained two-handed pushes near 200 to 300 N for most adults; the upper figure taken as the test push', kind: 'estimate' },
  elbowRoom: { value: 0.17, unit: 'm', name: 'elbow room beside the shoulders at a table', source: 'estimate: a place at a table is about 600 mm per person, the shoulders plus elbow room', kind: 'estimate' },
  clearance: { value: 0.1, unit: 'm', name: 'clearance each side of a person in a passage', source: 'estimate: 100 mm each side, as a footbridge or doorway allows beyond the shoulders', kind: 'estimate' },
} as const satisfies Record<string, Measure>;

export type PersonMeasure = keyof typeof PERSON;

/** Sizes to the nearest 50 mm, as stock and plans are cut. */
export const round5 = (x: number) => Math.round(x / 0.05) * 0.05;

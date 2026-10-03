// Parametric part families. Every dimension is a live parameter; presets are only starting values.
// Mass always comes from the exact volume of the parametric geometry times the material density.

import type { Material } from '../data/materials';
import type { Quat, Vec3 } from '../doc/types';
import { axisAngle } from '../doc/math';
import { choice, num, numberOf, stringOf, text, type ParamDef, type Params } from '../schema/params';
import {
  iBeamSection, iBeamStrongAxis, rectSection, rectTubeSection, roundSection, tubeSection, type Section,
} from '../engineering/sections';
import type { CollisionShape, ConvexShape, VisualShape } from './shapes';
import { electromagnetBr } from '../engineering/magnets';
import { bounds as formBounds, formKey, parseForm, type Form } from '../forms/form';
import { boxes as formBoxes, solid as formSolid } from '../forms/mesh';
import { GEARHEADS, MOTORS, getGearhead, getMotor } from '../data/motors';
import { BATTERIES, getBattery } from '../data/batteries';
import { CONTROLLER_BOARD, getServo, RECEIVER_BOARD, SERVOS, shaftOf, SHAFT_Q } from '../data/servos';

export interface PartDims {
  /** Longest dimension, m. */
  length: number;
  /** The two cross-section dimensions (a >= b), m. */
  a: number;
  b: number;
}

export interface MagnetGeometry {
  shape: 'cylinder' | 'block';
  /** Cylinder radius or block face half-sizes. */
  radius: number;
  w: number;
  h: number;
  /** Length along the magnetisation axis (local +Y). */
  length: number;
  /** Electromagnets: the magnetisation their coil gives at this power (a permanent magnet's comes from its grade). */
  Br?: number;
  /** Electromagnets on a switch: the control channel that turns them on and off. */
  drive?: string;
}

/**
 * Section properties for the bonds between segments of a breakable part. Bending is given about the two
 * local axes perpendicular to the length axis (length X: [about Y, about Z]; length Y: [about X, about Z]).
 */
export interface BondSection {
  A: number;
  J: number;
  /** Extreme fibre radius for torsion. */
  r: number;
  S: [number, number];
  Z: [number, number];
}

export interface PartKind {
  id: string;
  label: string;
  category: string;
  params: ParamDef[];
  defaultMaterial: string;
  materialFilter?: (m: Material) => boolean;
  collision(p: Params): CollisionShape;
  visual(p: Params): VisualShape;
  /** Exact volume of the solid, m^3. */
  volume(p: Params, m: Material): number;
  /** A bought item's mass from its datasheet, kg (a motor, a battery: not one solid material), when it has one. */
  mass?(p: Params): number;
  /**
   * A bought item is made by its maker, not here: it takes only the joints its maker allows (a drive at its shaft, wires
   * at its terminals, a clamp round its body), never a hole drilled or a bead welded into it (rule R11).
   */
  bought?: { accepts: string[]; why: string };
  dims(p: Params): PartDims;
  section?(p: Params): Section;
  /** Breakable stock: which parameter is the length and which local axis it runs along. */
  segment?: { lengthKey: string; axis: 'x' | 'y' };
  bond?(p: Params): BondSection;
  magnet?(p: Params): MagnetGeometry;
  dragCd: number;
  /** Orientation a freshly spawned part takes (e.g. rods lie along world X). */
  spawnRotation: Quat;
}

const Y_TO_X: Quat = axisAngle([0, 0, 1], -Math.PI / 2);
const IDENTITY: Quat = [0, 0, 0, 1];

const sorted = (x: number, y: number, z: number): PartDims => {
  const d = [x, y, z].sort((m, n) => n - m);
  return { length: d[0]!, a: d[1]!, b: d[2]! };
};

const box = (hx: number, hy: number, hz: number): ConvexShape => ({ type: 'box', half: [hx, hy, hz] });

function ringCompound(outer: number, inner: number, halfHeight: number, n = 12): CollisionShape {
  const rc = (outer + inner) / 2;
  const wall = Math.max(outer - inner, 1e-4);
  const half = outer * Math.sin(Math.PI / n) * 1.02;
  return {
    type: 'compound',
    children: Array.from({ length: n }, (_, i) => {
      const th = (2 * Math.PI * i) / n;
      const q = axisAngle([0, 1, 0], -th);
      return { shape: box(wall / 2, halfHeight, half), p: [Math.cos(th) * rc, 0, Math.sin(th) * rc] as Vec3, q };
    }),
  };
}

export const LUMBER: Record<string, [number, number]> = {
  '1x4': [0.019, 0.089], '1x6': [0.019, 0.14], '2x2': [0.038, 0.038], '2x4': [0.038, 0.089],
  '2x6': [0.038, 0.14], '2x8': [0.038, 0.184], '4x4': [0.089, 0.089],
};

const fracture = () => choice('fracture', 'Can break', 'auto', [
  { value: 'auto', label: 'Yes (auto resolution)' },
  { value: 'off', label: 'No: unbreakable (non-physical)' },
  ...['2', '3', '4', '6', '8', '12'].map((v) => ({ value: v, label: `${v} segments` })),
], { group: 'Strength', help: 'Breakable parts are simulated as bonded segments whose strength comes from the section and material' });

/** Rectangle t (along perp axis 1 = Y) x w (along perp axis 2 = Z) seen from the length axis. */
function rectBond(t: number, w: number): BondSection {
  // bending about Y: depth along Z (w); about Z: depth along Y (t)
  return { A: t * w, J: rectSection(w, t).J, r: Math.min(t, w) / 2, S: [(t * w * w) / 6, (w * t * t) / 6], Z: [(t * w * w) / 4, (w * t * t) / 4] };
}

function symBond(sec: Section, S: number, Z: number): BondSection {
  return { A: sec.A, J: sec.J, r: sec.rTorsion, S: [S, S], Z: [Z, Z] };
}

const isMagnet = (m: Material) => m.category === 'magnet';
/** A soft-magnetic core: ferromagnetic, but not a permanent magnet. */
const isSoftIron = (m: Material) => m.ferromagnetic && m.category !== 'magnet';
const isWood = (m: Material) => m.category === 'wood' || m.category === 'engineered-wood';
const notMagnet = (m: Material) => m.category !== 'magnet';

const parsedForms = new Map<string, Form>();
/** A form part's form, from its genome (checked as untrusted input); a 50 mm sphere if it has none. */
export function formOf(p: Params): Form {
  const g = stringOf(p, 'form', '{"f":"sphere","r":0.025}');
  let f = parsedForms.get(g);
  if (!f) {
    f = parseForm(g);
    if (parsedForms.size > 128) parsedForms.clear();
    parsedForms.set(g, f);
  }
  return f;
}

export const PART_KINDS: PartKind[] = [
  {
    id: 'block', label: 'Block', category: 'Solids', defaultMaterial: 'wood.douglas-fir', dragCd: 1.05, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      num('x', 'Length (X)', 0.1, 0.005, 20, 'mm', { group: 'Geometry' }),
      num('y', 'Height (Y)', 0.1, 0.005, 20, 'mm', { group: 'Geometry' }),
      num('z', 'Depth (Z)', 0.1, 0.005, 20, 'mm', { group: 'Geometry' }),
    ],
    collision: (p) => box(n(p, 'x') / 2, n(p, 'y') / 2, n(p, 'z') / 2),
    visual: (p) => ({ type: 'box', half: [n(p, 'x') / 2, n(p, 'y') / 2, n(p, 'z') / 2] }),
    volume: (p) => n(p, 'x') * n(p, 'y') * n(p, 'z'),
    dims: (p) => sorted(n(p, 'x'), n(p, 'y'), n(p, 'z')),
    section: (p) => rectSection(n(p, 'y'), n(p, 'z')),
  },
  {
    id: 'plate', label: 'Plate / sheet', category: 'Stock', defaultMaterial: 'aluminum.6061-t6', dragCd: 1.28, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length (X)', 0.3, 0.01, 12, 'mm', { group: 'Geometry' }),
      num('width', 'Width (Z)', 0.2, 0.01, 6, 'mm', { group: 'Geometry' }),
      num('thickness', 'Thickness', 0.006, 0.0005, 0.2, 'mm', { group: 'Geometry', step: 0.1 }),
    ],
    collision: (p) => box(n(p, 'length') / 2, n(p, 'thickness') / 2, n(p, 'width') / 2),
    visual: (p) => ({ type: 'box', half: [n(p, 'length') / 2, n(p, 'thickness') / 2, n(p, 'width') / 2] }),
    volume: (p) => n(p, 'length') * n(p, 'width') * n(p, 'thickness'),
    dims: (p) => sorted(n(p, 'length'), n(p, 'thickness'), n(p, 'width')),
    section: (p) => rectSection(n(p, 'width'), n(p, 'thickness')),
    segment: { lengthKey: 'length', axis: 'x' },
    bond: (p) => rectBond(n(p, 'thickness'), n(p, 'width')),
  },
  {
    id: 'lumber', label: 'Lumber', category: 'Stock', defaultMaterial: 'wood.douglas-fir', dragCd: 1.1, spawnRotation: IDENTITY,
    materialFilter: isWood,
    params: [
      fracture(),
      choice('size', 'Nominal size', '2x4', Object.keys(LUMBER).map((k) => ({ value: k, label: `${k} (${LUMBER[k]![0] * 1000}×${LUMBER[k]![1] * 1000} mm)` })), { group: 'Geometry' }),
      num('length', 'Length', 1.2, 0.05, 8, 'mm', { group: 'Geometry' }),
    ],
    collision: (p) => { const [t, w] = lumberDims(p); return box(n(p, 'length') / 2, t / 2, w / 2); },
    visual: (p) => { const [t, w] = lumberDims(p); return { type: 'box', half: [n(p, 'length') / 2, t / 2, w / 2], bevel: 0.003 }; },
    volume: (p) => { const [t, w] = lumberDims(p); return t * w * n(p, 'length'); },
    dims: (p) => { const [t, w] = lumberDims(p); return sorted(n(p, 'length'), t, w); },
    section: (p) => { const [t, w] = lumberDims(p); return rectSection(w, t); },
    segment: { lengthKey: 'length', axis: 'x' },
    bond: (p) => { const [t, w] = lumberDims(p); return rectBond(t, w); },
  },
  {
    id: 'rod.round', label: 'Round rod', category: 'Stock', defaultMaterial: 'steel.1018-cd', dragCd: 0.82, spawnRotation: Y_TO_X,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length', 0.5, 0.005, 12, 'mm', { group: 'Geometry' }),
      num('diameter', 'Diameter', 0.02, 0.001, 1, 'mm', { group: 'Geometry', step: 0.5 }),
    ],
    collision: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'length') / 2 }),
    visual: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'length') / 2 }),
    volume: (p) => (Math.PI / 4) * n(p, 'diameter') ** 2 * n(p, 'length'),
    dims: (p) => sorted(n(p, 'length'), n(p, 'diameter'), n(p, 'diameter')),
    section: (p) => roundSection(n(p, 'diameter')),
    segment: { lengthKey: 'length', axis: 'y' },
    bond: (p) => { const sec = roundSection(n(p, 'diameter')); return symBond(sec, sec.S, sec.Z); },
  },
  {
    id: 'rod.square', label: 'Square bar', category: 'Stock', defaultMaterial: 'steel.1018-cd', dragCd: 1.05, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length (X)', 0.5, 0.005, 12, 'mm', { group: 'Geometry' }),
      num('side', 'Side', 0.02, 0.001, 1, 'mm', { group: 'Geometry', step: 0.5 }),
    ],
    collision: (p) => box(n(p, 'length') / 2, n(p, 'side') / 2, n(p, 'side') / 2),
    visual: (p) => ({ type: 'box', half: [n(p, 'length') / 2, n(p, 'side') / 2, n(p, 'side') / 2] }),
    volume: (p) => n(p, 'side') ** 2 * n(p, 'length'),
    dims: (p) => sorted(n(p, 'length'), n(p, 'side'), n(p, 'side')),
    section: (p) => rectSection(n(p, 'side'), n(p, 'side')),
    segment: { lengthKey: 'length', axis: 'x' },
    bond: (p) => rectBond(n(p, 'side'), n(p, 'side')),
  },
  {
    id: 'tube.round', label: 'Round tube', category: 'Structural', defaultMaterial: 'steel.a36', dragCd: 0.82, spawnRotation: Y_TO_X,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length', 1, 0.01, 12, 'mm', { group: 'Geometry' }),
      num('od', 'Outside diameter', 0.0422, 0.003, 1, 'mm', { group: 'Geometry', step: 0.1 }),
      num('wall', 'Wall thickness', 0.0036, 0.0003, 0.05, 'mm', { group: 'Geometry', step: 0.1 }),
    ],
    collision: (p) => ringCompound(n(p, 'od') / 2, innerR(p), n(p, 'length') / 2),
    visual: (p) => ({ type: 'tube', outer: n(p, 'od') / 2, inner: innerR(p), halfHeight: n(p, 'length') / 2 }),
    volume: (p) => Math.PI * ((n(p, 'od') / 2) ** 2 - innerR(p) ** 2) * n(p, 'length'),
    dims: (p) => sorted(n(p, 'length'), n(p, 'od'), n(p, 'od')),
    section: (p) => tubeSection(n(p, 'od'), wallOf(p, 'od')),
    segment: { lengthKey: 'length', axis: 'y' },
    bond: (p) => { const sec = tubeSection(n(p, 'od'), wallOf(p, 'od')); return symBond(sec, sec.S, sec.Z); },
  },
  {
    id: 'tube.square', label: 'Square tube', category: 'Structural', defaultMaterial: 'steel.a36', dragCd: 1.05, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length (X)', 1, 0.01, 12, 'mm', { group: 'Geometry' }),
      num('side', 'Side', 0.04, 0.005, 1, 'mm', { group: 'Geometry' }),
      num('wall', 'Wall thickness', 0.003, 0.0003, 0.05, 'mm', { group: 'Geometry', step: 0.1 }),
    ],
    collision: (p) => {
      const s = n(p, 'side') / 2, t = wallOf(p, 'side'), L = n(p, 'length') / 2;
      return {
        type: 'compound', children: [
          { shape: box(L, t / 2, s), p: [0, s - t / 2, 0], q: IDENTITY },
          { shape: box(L, t / 2, s), p: [0, -s + t / 2, 0], q: IDENTITY },
          { shape: box(L, s - t, t / 2), p: [0, 0, s - t / 2], q: IDENTITY },
          { shape: box(L, s - t, t / 2), p: [0, 0, -s + t / 2], q: IDENTITY },
        ],
      };
    },
    visual: (p) => ({ type: 'rect-tube', halfW: n(p, 'side') / 2, halfH: n(p, 'side') / 2, wall: wallOf(p, 'side'), halfLength: n(p, 'length') / 2 }),
    volume: (p) => { const s = n(p, 'side'), t = wallOf(p, 'side'); return (s * s - (s - 2 * t) ** 2) * n(p, 'length'); },
    dims: (p) => sorted(n(p, 'length'), n(p, 'side'), n(p, 'side')),
    section: (p) => rectTubeSection(n(p, 'side'), n(p, 'side'), wallOf(p, 'side')),
    segment: { lengthKey: 'length', axis: 'x' },
    bond: (p) => { const sec = rectTubeSection(n(p, 'side'), n(p, 'side'), wallOf(p, 'side')); return symBond(sec, sec.S, sec.Z); },
  },
  {
    id: 'beam.i', label: 'I-beam', category: 'Structural', defaultMaterial: 'steel.a36', dragCd: 1.6, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length (X)', 2, 0.05, 20, 'mm', { group: 'Geometry' }),
      num('depth', 'Depth h', 0.2, 0.02, 1.2, 'mm', { group: 'Geometry' }),
      num('flange', 'Flange width b', 0.1, 0.02, 0.6, 'mm', { group: 'Geometry' }),
      num('tf', 'Flange thickness', 0.0085, 0.001, 0.08, 'mm', { group: 'Geometry', step: 0.1 }),
      num('tw', 'Web thickness', 0.0056, 0.001, 0.06, 'mm', { group: 'Geometry', step: 0.1 }),
    ],
    collision: (p) => {
      const { L, h, b, tf, tw } = ibeam(p);
      return {
        type: 'compound', children: [
          { shape: box(L / 2, tf / 2, b / 2), p: [0, h / 2 - tf / 2, 0], q: IDENTITY },
          { shape: box(L / 2, tf / 2, b / 2), p: [0, -h / 2 + tf / 2, 0], q: IDENTITY },
          { shape: box(L / 2, h / 2 - tf, tw / 2), p: [0, 0, 0], q: IDENTITY },
        ],
      };
    },
    visual: (p) => { const { L, h, b, tf, tw } = ibeam(p); return { type: 'ibeam', halfLength: L / 2, flange: b, depth: h, tf, tw }; },
    volume: (p) => { const { L, h, b, tf, tw } = ibeam(p); return (2 * b * tf + (h - 2 * tf) * tw) * L; },
    dims: (p) => { const { L, h, b } = ibeam(p); return sorted(L, h, b); },
    section: (p) => { const { h, b, tf, tw } = ibeam(p); return iBeamSection(b, h, tf, tw); },
    segment: { lengthKey: 'length', axis: 'x' },
    bond: (p) => { const { h, b, tf, tw } = ibeam(p); const weak = iBeamSection(b, h, tf, tw); const strong = iBeamStrongAxis(b, h, tf, tw); return { A: weak.A, J: weak.J, r: Math.max(tf, tw), S: [weak.S, strong.S], Z: [weak.Z, strong.Z] }; },
  },
  {
    id: 'angle', label: 'Angle (L)', category: 'Structural', defaultMaterial: 'steel.a36', dragCd: 1.4, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      fracture(),
      num('length', 'Length (X)', 1, 0.01, 12, 'mm', { group: 'Geometry' }),
      num('leg', 'Leg', 0.04, 0.005, 0.3, 'mm', { group: 'Geometry' }),
      num('t', 'Thickness', 0.004, 0.0005, 0.04, 'mm', { group: 'Geometry', step: 0.1 }),
    ],
    collision: (p) => {
      const L = n(p, 'length') / 2, a = n(p, 'leg'), t = Math.min(n(p, 't'), a * 0.5);
      return {
        type: 'compound', children: [
          { shape: box(L, t / 2, a / 2), p: [0, t / 2, a / 2], q: IDENTITY },
          { shape: box(L, (a - t) / 2, t / 2), p: [0, t + (a - t) / 2, t / 2], q: IDENTITY },
        ],
      };
    },
    visual: (p) => ({ type: 'angle', halfLength: n(p, 'length') / 2, legA: n(p, 'leg'), legB: n(p, 'leg'), t: Math.min(n(p, 't'), n(p, 'leg') * 0.5) }),
    volume: (p) => { const a = n(p, 'leg'), t = Math.min(n(p, 't'), a * 0.5); return (2 * a - t) * t * n(p, 'length'); },
    dims: (p) => sorted(n(p, 'length'), n(p, 'leg'), n(p, 'leg')),
    section: (p) => rectSection(n(p, 'leg'), n(p, 't')),
    segment: { lengthKey: 'length', axis: 'x' },
    bond: (p) => { const sec = rectSection(n(p, 'leg'), Math.min(n(p, 't'), n(p, 'leg') * 0.5)); return { A: sec.A * 2, J: sec.J * 2, r: sec.rTorsion, S: [sec.S, sec.S], Z: [sec.Z, sec.Z] }; },
  },
  {
    id: 'disc', label: 'Disc', category: 'Solids', defaultMaterial: 'steel.a36', dragCd: 1.1, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      num('diameter', 'Diameter', 0.1, 0.002, 6, 'mm', { group: 'Geometry' }),
      num('thickness', 'Thickness', 0.01, 0.0005, 2, 'mm', { group: 'Geometry', step: 0.1 }),
    ],
    collision: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'thickness') / 2 }),
    visual: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'thickness') / 2, segments: 48 }),
    volume: (p) => (Math.PI / 4) * n(p, 'diameter') ** 2 * n(p, 'thickness'),
    dims: (p) => sorted(n(p, 'diameter'), n(p, 'diameter'), n(p, 'thickness')),
  },
  {
    id: 'sphere', label: 'Sphere / ball', category: 'Solids', defaultMaterial: 'steel.52100', dragCd: 0.47, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [num('diameter', 'Diameter', 0.05, 0.002, 6, 'mm', { group: 'Geometry' })],
    collision: (p) => ({ type: 'sphere', radius: n(p, 'diameter') / 2 }),
    visual: (p) => ({ type: 'sphere', radius: n(p, 'diameter') / 2 }),
    volume: (p) => (Math.PI / 6) * n(p, 'diameter') ** 3,
    dims: (p) => sorted(n(p, 'diameter'), n(p, 'diameter'), n(p, 'diameter')),
  },
  {
    id: 'wheel', label: 'Wheel', category: 'Motion', defaultMaterial: 'rubber.natural', dragCd: 0.9, spawnRotation: axisAngle([1, 0, 0], Math.PI / 2),
    materialFilter: notMagnet,
    params: [
      num('diameter', 'Diameter', 0.25, 0.02, 3, 'mm', { group: 'Geometry' }),
      num('width', 'Width', 0.06, 0.005, 1, 'mm', { group: 'Geometry' }),
    ],
    collision: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'width') / 2 }),
    visual: (p) => ({ type: 'wheel', radius: n(p, 'diameter') / 2, halfWidth: n(p, 'width') / 2, hub: n(p, 'diameter') * 0.18 }),
    volume: (p) => (Math.PI / 4) * n(p, 'diameter') ** 2 * n(p, 'width'),
    dims: (p) => sorted(n(p, 'diameter'), n(p, 'diameter'), n(p, 'width')),
  },
  {
    // A form in Ego's language of form (forms/form.ts): any shape, its genome in the `form` parameter. Its mass is its
    // exact volume (from its mesh) times its material's density; it collides as its solid in merged boxes, holes kept.
    id: 'form', label: 'Form (invented geometry)', category: 'Forms', defaultMaterial: 'polymer.nylon-microcarbon', dragCd: 1, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [text('form', 'Form', '{"f":"sphere","r":0.025}', 65536)],
    collision: (p) => {
      const f = formOf(p);
      const bs = formBoxes(f);
      if (!bs.length) { const [lo, hi] = formBounds(f); return box((hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, (hi[2] - lo[2]) / 2); }
      return { type: 'compound', children: bs.map((b) => ({ shape: box(...b.half), p: b.center, q: IDENTITY })) };
    },
    visual: (p) => {
      const f = formOf(p), s = formSolid(f, 40, 300_000);
      return { type: 'mesh', key: formKey(f), positions: Float32Array.from(s.mesh.positions), indices: s.mesh.indices };
    },
    volume: (p) => formSolid(formOf(p)).mass.volume,
    dims: (p) => { const [lo, hi] = formBounds(formOf(p)); return sorted(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]); },
  },
  {
    id: 'wedge', label: 'Wedge / ramp', category: 'Solids', defaultMaterial: 'wood.birch-plywood', dragCd: 1, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [
      num('length', 'Length (X)', 0.6, 0.02, 10, 'mm', { group: 'Geometry' }),
      num('height', 'Height (Y)', 0.2, 0.005, 5, 'mm', { group: 'Geometry' }),
      num('width', 'Width (Z)', 0.3, 0.01, 10, 'mm', { group: 'Geometry' }),
    ],
    collision: (p) => {
      const L = n(p, 'length') / 2, H = n(p, 'height') / 2, W = n(p, 'width') / 2;
      return {
        type: 'hull', points: [
          [-L, -H, -W], [-L, -H, W], [L, -H, -W], [L, -H, W], [L, H, -W], [L, H, W],
        ],
      };
    },
    visual: (p) => ({ type: 'wedge', length: n(p, 'length'), height: n(p, 'height'), width: n(p, 'width') }),
    volume: (p) => 0.5 * n(p, 'length') * n(p, 'height') * n(p, 'width'),
    dims: (p) => sorted(n(p, 'length'), n(p, 'height'), n(p, 'width')),
  },
  {
    // a DC motor you can buy, with its gearhead if it has one: its size, mass and every constant from its datasheet
    // (data/motors.ts). Its output shaft comes out of the top (+Y) face; a Motor drive joint there turns what it drives.
    id: 'motor.dc', label: 'DC motor', category: 'Power', defaultMaterial: 'steel.1018-cd', dragCd: 0.9, spawnRotation: IDENTITY,
    bought: { accepts: ['motor', 'wire', 'clamp'], why: 'its maker charts no holes in it to drill, screw or weld into: hold it in a split clamp round its body, drive from its shaft, wire it at its terminals' },
    materialFilter: (m) => m.category === 'steel',
    params: [
      choice('model', 'Motor', 'motor.dc.coreless.d40-150w-24v', Object.values(MOTORS).map((m) => ({ value: m.id, label: m.label })), { group: 'Motor' }),
      choice('gearhead', 'Gearhead', 'gearhead.planetary.d42-12to1', [{ value: 'none', label: 'None (the motor shaft)' }, ...Object.values(GEARHEADS).map((g) => ({ value: g.id, label: g.label }))], { group: 'Motor' }),
    ],
    collision: (p) => { const e = motorEnvelope(p); return { type: 'cylinder', radius: e.radius, halfHeight: e.length / 2 }; },
    visual: (p) => {
      const m = getMotor(stringOf(p, 'model', 'motor.dc.coreless.d40-150w-24v')), g = fittedGearhead(p);
      const e = motorEnvelope(p), base = -e.length / 2;
      const children: { shape: VisualShape; p: Vec3; q: Quat; tint?: number }[] = [
        { shape: { type: 'cylinder', radius: m.diameter / 2, halfHeight: m.length / 2, segments: 40 }, p: [0, base + m.length / 2, 0], q: IDENTITY, tint: 0x2a2d31 },
      ];
      if (g) children.push({ shape: { type: 'cylinder', radius: g.diameter / 2, halfHeight: g.length / 2, segments: 40 }, p: [0, base + m.length + g.length / 2, 0], q: IDENTITY, tint: 0xa9adb3 });
      const shaft = g ? g.shaft : m.shaft;
      children.push({ shape: { type: 'cylinder', radius: shaft / 2, halfHeight: 0.006, segments: 20 }, p: [0, e.length / 2 + 0.006, 0], q: IDENTITY, tint: 0xd8dade });
      return { type: 'group', children };
    },
    volume: (p) => { const e = motorEnvelope(p); return Math.PI * e.radius * e.radius * e.length; },
    mass: (p) => getMotor(stringOf(p, 'model', 'motor.dc.coreless.d40-150w-24v')).mass + (fittedGearhead(p)?.mass ?? 0),
    dims: (p) => { const e = motorEnvelope(p); return sorted(2 * e.radius, 2 * e.radius, e.length); },
  },
  {
    // a battery pack of blocks you can buy (data/batteries.ts), strapped side by side: in series for voltage, in
    // parallel strings for capacity. How charged it is is part of the build, and runs down as it is used.
    id: 'battery', label: 'Battery', category: 'Power', defaultMaterial: 'polymer.abs', dragCd: 1.05, spawnRotation: IDENTITY,
    bought: { accepts: ['wire', 'glued', 'screwed'], why: 'a battery can\'t be drilled, welded or bolted through (its case holds the chemistry): a cell holder is screwed or glued down, a sealed block stands in a tray or under a strap, and it is wired at its terminals' },
    materialFilter: (m) => m.category === 'polymer',
    params: [
      choice('model', 'Battery', 'battery.sla.12v-7ah', Object.values(BATTERIES).map((b) => ({ value: b.id, label: b.label })), { group: 'Battery' }),
      num('series', 'In series', 2, 1, 8, '', { group: 'Battery', integer: true }),
      num('parallel', 'Strings in parallel', 1, 1, 4, '', { group: 'Battery', integer: true }),
      num('charge', 'Charge', 1, 0, 1, '%', { group: 'Battery', step: 5, linear: true }),
    ],
    collision: (p) => { const [x, y, z] = packSize(p); return box(x / 2, y / 2, z / 2); },
    visual: (p) => { const [x, y, z] = packSize(p); return { type: 'box', half: [x / 2, y / 2, z / 2], bevel: 0.004 }; },
    volume: (p) => { const [x, y, z] = packSize(p); return x * y * z; },
    mass: (p) => getBattery(stringOf(p, 'model', 'battery.sla.12v-7ah')).mass * numberOf(p, 'series', 2) * numberOf(p, 'parallel', 1),
    dims: (p) => { const [x, y, z] = packSize(p); return sorted(x, y, z); },
  },
  {
    id: 'servo', label: 'Servo', category: 'Power', defaultMaterial: 'polymer.abs', dragCd: 1.05, spawnRotation: IDENTITY,
    bought: { accepts: ['servo', 'wire', 'signal', 'screwed', 'bolted', 'glued'], why: 'its maker charts no holes in its case: screw or bolt it by its tabs, glue it down, wire it at its lead, signal it from a controller, and turn things from its horn' },
    materialFilter: (m) => m.category === 'polymer',
    params: [choice('model', 'Servo', 'servo.micro-9g', Object.values(SERVOS).map((s) => ({ value: s.id, label: s.label })), { group: 'Servo' })],
    collision: (p) => { const [l, w, h] = servoOf(p).dims; return box(l / 2, w / 2, h / 2); },
    visual: (p) => {
      const sv = servoOf(p), [l, w, h] = sv.dims, sh = servoShaft(p);
      return { type: 'group', children: [
        { shape: { type: 'box', half: [l / 2, w / 2, h / 2], bevel: 0.001 }, p: [0, 0, 0], q: IDENTITY, tint: 0x1c1f22 },
        // the shaft and horn on its +z face, where the joint is made
        { shape: { type: 'cylinder', radius: sv.shaftDiameter / 2, halfHeight: sv.horn / 2, segments: 16 }, p: [sh.p[0], sh.p[1], h / 2 + sv.horn / 2], q: SHAFT_Q, tint: 0xd8dade },
      ] };
    },
    volume: (p) => { const [l, w, h] = servoOf(p).dims; return l * w * h; },
    mass: (p) => servoOf(p).mass,
    dims: (p) => { const [l, w, h] = servoOf(p).dims; return sorted(l, w, h); },
  },
  {
    id: 'controller', label: 'Controller board', category: 'Power', defaultMaterial: 'polymer.abs', dragCd: 1.05, spawnRotation: IDENTITY,
    bought: { accepts: ['wire', 'signal', 'screwed', 'bolted', 'glued'], why: 'a board: screw it by its holes or glue its standoffs down, power it by a wire, and let its program speak to servos down signal leads' },
    materialFilter: (m) => m.category === 'polymer',
    params: [num('rhythm', 'Program: rhythm (0: hold centre)', 2, 0, 10, 'Hz', { group: 'Program' })],
    collision: () => box(CONTROLLER_BOARD.dims[0] / 2, CONTROLLER_BOARD.dims[1] / 2, CONTROLLER_BOARD.dims[2] / 2),
    visual: () => ({ type: 'box', half: [CONTROLLER_BOARD.dims[0] / 2, CONTROLLER_BOARD.dims[1] / 2, CONTROLLER_BOARD.dims[2] / 2], bevel: 0.0005 }),
    volume: () => CONTROLLER_BOARD.dims[0] * CONTROLLER_BOARD.dims[1] * CONTROLLER_BOARD.dims[2],
    mass: () => CONTROLLER_BOARD.mass,
    dims: () => sorted(CONTROLLER_BOARD.dims[0], CONTROLLER_BOARD.dims[1], CONTROLLER_BOARD.dims[2]),
  },
  {
    id: 'receiver', label: 'Radio receiver', category: 'Power', defaultMaterial: 'polymer.abs', dragCd: 1.05, spawnRotation: IDENTITY,
    bought: { accepts: ['wire', 'signal', 'screwed', 'bolted', 'glued'], why: 'a board: screw it by its holes or glue it down, power it by a wire, and let your sticks reach servos down its signal leads' },
    materialFilter: (m) => m.category === 'polymer',
    params: [],
    collision: () => box(RECEIVER_BOARD.dims[0] / 2, RECEIVER_BOARD.dims[1] / 2, RECEIVER_BOARD.dims[2] / 2),
    visual: () => ({ type: 'box', half: [RECEIVER_BOARD.dims[0] / 2, RECEIVER_BOARD.dims[1] / 2, RECEIVER_BOARD.dims[2] / 2], bevel: 0.0005 }),
    volume: () => RECEIVER_BOARD.dims[0] * RECEIVER_BOARD.dims[1] * RECEIVER_BOARD.dims[2],
    mass: () => RECEIVER_BOARD.mass,
    dims: () => sorted(RECEIVER_BOARD.dims[0], RECEIVER_BOARD.dims[1], RECEIVER_BOARD.dims[2]),
  },
  {
    id: 'weight', label: 'Test weight', category: 'Test gear', defaultMaterial: 'cast-iron.gray-30', dragCd: 0.9, spawnRotation: IDENTITY,
    materialFilter: notMagnet,
    params: [num('mass', 'Mass', 10, 0.01, 5000, 'kg', { group: 'Load', log: true })],
    collision: (p) => ({ type: 'cylinder', radius: weightD(p) / 2, halfHeight: weightD(p) / 2 }),
    visual: (p) => ({ type: 'cylinder', radius: weightD(p) / 2, halfHeight: weightD(p) / 2, segments: 40 }),
    // Sized so that the chosen mass is exact for the chosen material (d = h).
    volume: (p, m) => n(p, 'mass') / m.density,
    dims: (p) => sorted(weightD(p), weightD(p), weightD(p)),
  },
  {
    id: 'magnet.disc', label: 'Disc magnet', category: 'Magnets', defaultMaterial: 'magnet.n42', dragCd: 1.1, spawnRotation: IDENTITY,
    materialFilter: isMagnet,
    params: [
      num('diameter', 'Diameter', 0.02, 0.002, 0.3, 'mm', { group: 'Geometry', step: 0.5 }),
      num('thickness', 'Thickness (axis)', 0.01, 0.0005, 0.2, 'mm', { group: 'Geometry', step: 0.5 }),
    ],
    collision: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'thickness') / 2 }),
    visual: (p) => magnetVisual({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'thickness') / 2, segments: 40 }, n(p, 'thickness'),
      { type: 'cylinder', radius: n(p, 'diameter') / 2 * 1.001, halfHeight: n(p, 'thickness') * 0.05, segments: 40 }),
    volume: (p) => (Math.PI / 4) * n(p, 'diameter') ** 2 * n(p, 'thickness'),
    dims: (p) => sorted(n(p, 'diameter'), n(p, 'diameter'), n(p, 'thickness')),
    magnet: (p) => ({ shape: 'cylinder', radius: n(p, 'diameter') / 2, w: 0, h: 0, length: n(p, 'thickness') }),
  },
  {
    id: 'magnet.block', label: 'Block magnet', category: 'Magnets', defaultMaterial: 'magnet.n42', dragCd: 1.05, spawnRotation: IDENTITY,
    materialFilter: isMagnet,
    params: [
      num('x', 'Length (X)', 0.04, 0.002, 0.3, 'mm', { group: 'Geometry', step: 0.5 }),
      num('z', 'Width (Z)', 0.02, 0.002, 0.3, 'mm', { group: 'Geometry', step: 0.5 }),
      num('y', 'Thickness (axis)', 0.01, 0.0005, 0.2, 'mm', { group: 'Geometry', step: 0.5 }),
    ],
    collision: (p) => box(n(p, 'x') / 2, n(p, 'y') / 2, n(p, 'z') / 2),
    visual: (p) => magnetVisual({ type: 'box', half: [n(p, 'x') / 2, n(p, 'y') / 2, n(p, 'z') / 2] }, n(p, 'y'),
      { type: 'box', half: [n(p, 'x') / 2 * 1.001, n(p, 'y') * 0.05, n(p, 'z') / 2 * 1.001] }),
    volume: (p) => n(p, 'x') * n(p, 'y') * n(p, 'z'),
    dims: (p) => sorted(n(p, 'x'), n(p, 'y'), n(p, 'z')),
    magnet: (p) => ({ shape: 'block', radius: 0, w: n(p, 'x'), h: n(p, 'z'), length: n(p, 'y') }),
  },
  {
    // A lifting electromagnet: a soft-steel pole in a copper coil. Off, it is plain steel; on, it holds its rating on
    // thick steel at full power, and the hold goes as the square of the power.
    id: 'magnet.electro', label: 'Electromagnet', category: 'Magnets', defaultMaterial: 'steel.1018-cd', dragCd: 1.1, spawnRotation: IDENTITY,
    materialFilter: isSoftIron,
    params: [
      num('power', 'Power', 1, 0, 1, '%', { group: 'Coil', step: 10, linear: true }),
      num('rating', 'Holds at full power', 500, 5, 50000, 'N', { group: 'Coil', log: true, help: 'On thick steel, as the maker rates it' }),
      num('diameter', 'Pole diameter', 0.05, 0.01, 0.5, 'mm', { group: 'Geometry', step: 1 }),
      num('thickness', 'Height (axis)', 0.03, 0.01, 0.3, 'mm', { group: 'Geometry', step: 1 }),
      choice('switch', 'Switched by', 'always', [
        { value: 'always', label: 'Always on, at its power' },
        { value: 'aux', label: 'The magnet switch on the tablet' },
      ], { group: 'Coil' }),
    ],
    collision: (p) => ({ type: 'cylinder', radius: n(p, 'diameter') / 2, halfHeight: n(p, 'thickness') / 2 }),
    visual: (p) => {
      const R = n(p, 'diameter') / 2, h = n(p, 'thickness');
      return {
        type: 'group', children: [
          { shape: { type: 'cylinder', radius: R, halfHeight: h / 2, segments: 40 }, p: [0, 0, 0], q: IDENTITY },
          // the coil: copper windings round the upper part of the pole
          { shape: { type: 'cylinder', radius: R * 1.04, halfHeight: h * 0.3, segments: 40 }, p: [0, h * 0.12, 0], q: IDENTITY, tint: 0xb87333 },
          // the working (north) face, marked red like a magnet's
          { shape: { type: 'cylinder', radius: R * 1.001, halfHeight: h * 0.03, segments: 40 }, p: [0, h / 2 - h * 0.03, 0], q: IDENTITY, tint: 0xc23b22 },
        ],
      };
    },
    volume: (p) => (Math.PI / 4) * n(p, 'diameter') ** 2 * n(p, 'thickness'),
    dims: (p) => sorted(n(p, 'diameter'), n(p, 'diameter'), n(p, 'thickness')),
    magnet: (p) => {
      const g = { shape: 'cylinder' as const, radius: n(p, 'diameter') / 2, w: 0, h: 0, length: n(p, 'thickness') };
      const power = Math.min(1, Math.max(0, numberOf(p, 'power', 1)));
      return { ...g, Br: electromagnetBr(g, numberOf(p, 'rating', 500)) * power, drive: stringOf(p, 'switch', 'always') === 'aux' ? 'aux' : undefined };
    },
  },
];

/** A motor's gearhead, if one is fitted and it is made for that motor. */
export function fittedGearhead(p: Params) {
  const g = getGearhead(stringOf(p, 'gearhead', 'none'));
  return g && g.fits.includes(getMotor(stringOf(p, 'model', 'motor.dc.coreless.d40-150w-24v')).id) ? g : null;
}

/** The motor's outline: the larger of motor and gearhead across, their lengths end to end. */
export function motorEnvelope(p: Params) {
  const m = getMotor(stringOf(p, 'model', 'motor.dc.coreless.d40-150w-24v')), g = fittedGearhead(p);
  return { radius: Math.max(m.diameter, g?.diameter ?? 0) / 2, length: m.length + (g?.length ?? 0) };
}

/** A pack's outline: its blocks side by side along Z (series, then parallel strings), each standing as made. */
const servoOf = (p: Params) => getServo(stringOf(p, 'model', 'servo.micro-9g'));
/** A hinge frame's local y along the part's +z: the shaft's axis. */
/** A servo part's output shaft in its own coordinates (data/servos shaftOf): where, and only where, its horn can be. */
export function servoShaft(p: Params): { p: Vec3; q: Quat } {
  return shaftOf(servoOf(p));
}

export function packSize(p: Params): [number, number, number] {
  const b = getBattery(stringOf(p, 'model', 'battery.sla.12v-7ah'));
  const k = numberOf(p, 'series', 2) * numberOf(p, 'parallel', 1);
  return [b.dims[0], b.dims[2], b.dims[1] * k];
}

/** Why a joint of `connector` can't be made on a part of `kind`, if it can't: a bought item takes only what its maker allows. */
export function boughtRefusal(kind: PartKind, connector: string, connectorLabel: string): string | null {
  if (!kind.bought || kind.bought.accepts.includes(connector)) return null;
  return `A ${connectorLabel.toLowerCase()} joint can't be made on a ${kind.label.toLowerCase()}: ${kind.bought.why}.`;
}

/** A part's mass: its datasheet's for a bought item, else its volume of its material. */
export function massOf(kind: PartKind, params: Params, m: Material): number {
  return kind.mass ? kind.mass(params) : kind.volume(params, m) * m.density;
}

function n(p: Params, key: string) {
  return numberOf(p, key, 0.01);
}

function lumberDims(p: Params): [number, number] {
  return LUMBER[stringOf(p, 'size', '2x4')] ?? LUMBER['2x4']!;
}

function wallOf(p: Params, outerKey: string) {
  return Math.min(n(p, 'wall'), n(p, outerKey) * 0.45);
}

function innerR(p: Params) {
  return Math.max(0, n(p, 'od') / 2 - wallOf(p, 'od'));
}

function ibeam(p: Params) {
  const h = n(p, 'depth');
  const b = n(p, 'flange');
  const tf = Math.min(n(p, 'tf'), h * 0.3);
  const tw = Math.min(n(p, 'tw'), b * 0.5);
  return { L: n(p, 'length'), h, b, tf, tw };
}

export function weightD(p: Params) {
  // Uses cast iron density for the visual size if the material is unknown here; the physics mass comes from volume().
  const rho = numberOf(p, '_density', 7200);
  return Math.cbrt((4 * n(p, 'mass')) / (Math.PI * rho));
}

function magnetVisual(body: VisualShape, thickness: number, cap: VisualShape): VisualShape {
  // Paint the north face red, like real magnets are often marked.
  return {
    type: 'group', children: [
      { shape: body, p: [0, 0, 0], q: IDENTITY },
      { shape: cap, p: [0, thickness / 2 - thickness * 0.045, 0], q: IDENTITY, tint: 0xc23b22 },
    ],
  };
}

const kindById = new Map(PART_KINDS.map((k) => [k.id, k]));

export function getPartKind(id: string): PartKind {
  const k = kindById.get(id);
  if (!k) throw new Error(`Unknown part kind ${id}`);
  return k;
}

export const hasPartKind = (id: string) => kindById.has(id);


/** Parameters with runtime-derived hidden inputs (e.g. the weight's material density for sizing). */
export function effectiveParams(kind: PartKind, params: Params, material: Material): Params {
  if (kind.id === 'weight') return { ...params, _density: material.density };
  return params;
}

export interface SegmentLayout {
  count: number;
  /** Unit length axis and the two perpendicular bending axes, in part-local coordinates. */
  axis: Vec3;
  perps: [Vec3, Vec3];
  length: number;
  segLen: number;
  /** Centre of each segment along the axis (part-local). */
  centers: number[];
  /** Parameters describing one segment (same kind, shorter length): exact slice geometry and volume. */
  segParams: Params;
}

/** How a breakable part is split into bonded segments, or null if it is a single rigid body. */
export function segmentLayout(kind: PartKind, params: Params): SegmentLayout | null {
  if (!kind.segment) return null;
  const mode = stringOf(params, 'fracture', 'auto');
  if (mode === 'off') return null;
  const L = numberOf(params, kind.segment.lengthKey, 0);
  const depth = Math.max(kind.dims(params).a, 1e-4);
  // Auto: segments about four section depths long (where beam theory holds), at most six per part.
  let count = mode === 'auto' ? Math.min(6, Math.round(L / (4 * depth))) : Number(mode);
  count = Math.max(1, Math.min(12, Math.floor(count)));
  if (count < 2) return null;
  const segLen = L / count;
  const axis: Vec3 = kind.segment.axis === 'x' ? [1, 0, 0] : [0, 1, 0];
  const perps: [Vec3, Vec3] = kind.segment.axis === 'x' ? [[0, 1, 0], [0, 0, 1]] : [[1, 0, 0], [0, 0, 1]];
  const centers = Array.from({ length: count }, (_, i) => -L / 2 + segLen * (i + 0.5));
  return { count, axis, perps, length: L, segLen, centers, segParams: { ...params, [kind.segment.lengthKey]: segLen } };
}

/** Body id of segment k of a part (unsegmented parts use the part id itself). */
export const segmentBodyId = (partId: string, k: number) => `${partId}#${k}`;

/** Pose of segment k in part coordinates (straight, undamaged layout). */
export function segmentOffset(layout: SegmentLayout, k: number): { p: Vec3; q: Quat } {
  const c = layout.centers[k] ?? 0;
  return { p: [layout.axis[0] * c, layout.axis[1] * c, layout.axis[2] * c], q: [0, 0, 0, 1] };
}

/** Which segment a part-space frame lies on, and that frame expressed in the segment's own coordinates. */
export function segmentOfFrame(layout: SegmentLayout, frame: { p: Vec3; q: Quat }): { seg: number; frame: { p: Vec3; q: Quat } } {
  const a = layout.axis;
  const x = frame.p[0] * a[0] + frame.p[1] * a[1] + frame.p[2] * a[2];
  const seg = Math.max(0, Math.min(layout.count - 1, Math.floor((x + layout.length / 2) / layout.segLen)));
  const c = layout.centers[seg]!;
  return { seg, frame: { p: [frame.p[0] - a[0] * c, frame.p[1] - a[1] * c, frame.p[2] - a[2] * c], q: frame.q } };
}

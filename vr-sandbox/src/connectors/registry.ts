// Connector types. Each is a distinct, fully adjustable kind whose stiffness, damping, friction and
// strength come from real specifications through the formulas in engineering/.

import type { Material } from '../data/materials';
import { boltedJoint, BOLT_FRICTION, permissiblePreload, tighteningTorque } from '../engineering/bolts';
import { CLEARANCE_HOLE_MEDIUM, HEX_BEARING_DIAMETER, METRIC_COARSE, PROPERTY_CLASSES, propertyClassFor, tensileStressArea, threadFor } from '../engineering/threads';
import {
  ADHESIVES, blindRivet, bondCapacities, bondEdgeLength, cureFraction, FILLERS, filletWeldCapacity, fillersFor, rivetShear, SOLDERABLE, SOLDERS,
  substrateFactor, weldable,
} from '../engineering/joining';
import { lateralUltimate, withdrawalUltimate } from '../engineering/wood';
import {
  SPRING_WIRES, springRate, shearStress, allowableShear, wireUltimate, surgeFrequency, solidLength, springMass, type CoilSpring,
} from '../engineering/springs';
import { ROPE_GRADES, ropeBreakingLoad, BEARING_FRICTION, eddyDamping } from '../engineering/mechanics';
import { roundSection } from '../engineering/sections';
import { driven, type Through } from './through';
import { WIRE_GAUGES } from '../data/batteries';
import { getGearhead, getMotor } from '../data/motors';
import { boolOf, choice, flag, num, numberOf, stringOf, formatForce, type ParamDef, type Params } from '../schema/params';

export type JointModel = 'rigid' | 'revolute' | 'prismatic' | 'spherical' | 'spring' | 'rope' | 'band';

export interface Capacities {
  tension: number;
  compression: number;
  shear: number;
  bending: number;
  torsion: number;
}

export interface Readout {
  label: string;
  value: string;
  formula?: string;
}

export interface Derived {
  capacities: Capacities;
  /** Friction-grip capacities. Exceeding them makes the joint slip instead of breaking. */
  slip?: { shear: number; torsion: number; clearance: number };
  /** Linear spring along the joint axis (spring, rope, band). */
  spring?: { k: number; c: number; rest: number; min: number; max: number; tensionOnly: boolean; breakStretch?: number; bandG?: number; bandArea?: number };
  /** A power wire: its resistance (both conductors), what it carries, its length. */
  wire?: { resistance: number; ampacity: number; length: number };
  /** Revolute details. */
  revolute?: {
    frictionTorque: number;
    bearingMu: number;
    boreDiameter: number;
    limits: [number, number] | null;
    motor?: { channel: string; reverse: boolean; currentLimit: number };
    servo?: { maxTorque: number; range: number; channel: string };
    eddy?: { c: number };
    torsionSpring?: { k: number; rest: number };
  };
  prismatic?: { frictionForce: number; limits: [number, number] | null; k: number; rest: number };
  spherical?: { frictionTorque: number; cone: number };
  /** Set when the joint cannot hold at all (e.g. welding aluminium to steel). */
  instantFailure?: string;
  readouts: Readout[];
  warnings: string[];
}

export interface DeriveContext {
  params: Params;
  matA: Material;
  /** null when anchored to the world (frozen ground). */
  matB: Material | null;
  /** Thinnest section of each part at the joint, m. */
  thicknessA: number;
  thicknessB: number;
  /** Each part's thickness along the joint's normal at the joint: the path a screw or nail is driven along. */
  through?: Through;
  /** Current distance between the endpoints, m (springs, ropes). */
  distance: number;
  /** Seconds of cure accumulated (already clock-scaled). */
  cure: number;
  /** The part at end A, where a joint's rating depends on what that part is (a motor drive on its motor). */
  partA?: { kind: string; params: Params };
}

export interface ConnectorKind {
  id: string;
  label: string;
  category: 'Joining' | 'Joints' | 'Energy' | 'Powered';
  model: JointModel;
  params: ParamDef[];
  derive(ctx: DeriveContext): Derived;
  /** One-line description for the palette. */
  blurb: string;
}

const INF = Number.POSITIVE_INFINITY;
const noCap = (): Capacities => ({ tension: INF, compression: INF, shear: INF, bending: INF, torsion: INF });
const MPa = 1e6;

// ------------------------------------------------------------------------------------------------
// shared parameter groups

const bondParams = [
  num('bondW', 'Bond width', 0.03, 0.001, 2, 'mm', { group: 'Contact', help: 'Auto-filled from the touching faces when connected' }),
  num('bondL', 'Bond length', 0.03, 0.001, 2, 'mm', { group: 'Contact' }),
];

const revoluteLimitParams = [
  flag('limited', 'Angle limits', false, { group: 'Limits' }),
  num('minAngle', 'Min angle', -Math.PI / 2, -Math.PI, 0, 'deg', { group: 'Limits' }),
  num('maxAngle', 'Max angle', Math.PI / 2, 0, Math.PI, 'deg', { group: 'Limits' }),
];

const pinParams = [
  num('pin', 'Pin diameter', 0.008, 0.001, 0.2, 'mm', { group: 'Pin', step: 0.5 }),
  choice('pinMaterial', 'Pin material', 'steel.1018-cd', [
    { value: 'steel.1018-cd', label: 'Steel 1018' }, { value: 'steel.4140-ann', label: 'Steel 4140' },
    { value: 'stainless.304', label: 'Stainless 304' }, { value: 'brass.c360', label: 'Brass' }, { value: 'aluminum.6061-t6', label: 'Aluminium 6061' },
  ], { group: 'Pin' }),
];

const channelOptions = [
  { value: 'throttle', label: 'Throttle (W/S · left stick Y)' },
  { value: 'steer', label: 'Steer (A/D · left stick X)' },
  { value: 'aux', label: 'Aux (the tablet switch)' },
  { value: 'always', label: 'Always on' },
];

function pinCapacity(p: Params, pinMaterials: Record<string, number>) {
  const d = numberOf(p, 'pin', 0.008);
  const rm = pinMaterials[stringOf(p, 'pinMaterial', 'steel.1018-cd')] ?? 440 * MPa;
  const sec = roundSection(d);
  // Double shear through the knuckles; bending of the pin across a knuckle length ~ 1.5 d.
  const shear = 2 * 0.6 * rm * sec.A;
  return { shear, tension: shear, compression: shear, bending: shear * 1.5 * d * 4, torsion: INF };
}

const PIN_RM: Record<string, number> = {
  'steel.1018-cd': 440 * MPa, 'steel.4140-ann': 655 * MPa, 'stainless.304': 505 * MPa, 'brass.c360': 385 * MPa, 'aluminum.6061-t6': 310 * MPa,
};

function revoluteLimits(p: Params): [number, number] | null {
  return boolOf(p, 'limited') ? [numberOf(p, 'minAngle'), numberOf(p, 'maxAngle')] : null;
}

/** On-axis flux density at distance z from the face of a cylinder magnet (length L, radius R). */
function magnetFieldOnAxis(Br: number, L: number, R: number, z: number) {
  return (Br / 2) * ((L + z) / Math.hypot(L + z, R) - z / Math.hypot(z, R));
}

const fmt = (x: number, digits = 2) => (Number.isFinite(x) ? x.toFixed(digits) : '∞');

// ------------------------------------------------------------------------------------------------

export const CONNECTOR_KINDS: ConnectorKind[] = [
  {
    id: 'fixed', label: 'Rigid (generic)', category: 'Joining', model: 'rigid',
    blurb: 'Locks all six axes. Unbreakable unless you give it a strength.',
    params: [
      num('breakForce', 'Break force (0 = unbreakable)', 0, 0, 1e7, 'N', { group: 'Strength', log: true }),
      num('breakTorque', 'Break torque (0 = unbreakable)', 0, 0, 1e6, 'N·m', { group: 'Strength', log: true }),
    ],
    derive: ({ params }) => {
      const f = numberOf(params, 'breakForce');
      const t = numberOf(params, 'breakTorque');
      const F = f > 0 ? f : INF;
      const T = t > 0 ? t : INF;
      return {
        capacities: { tension: F, compression: F, shear: F, bending: T, torsion: T },
        readouts: [{ label: 'Strength', value: f > 0 || t > 0 ? `${formatForce(F)}, ${fmt(T)} N·m` : 'unbreakable' }],
        warnings: f > 0 || t > 0 ? [] : ['Non-physical: an unbreakable joint. Use a real joining method to get real failure.'],
      };
    },
  },
  {
    id: 'weld', label: 'Weld', category: 'Joining', model: 'rigid',
    blurb: 'Fillet weld around the joint. Strength from throat size, filler and base metal (AWS D1.1/D1.2).',
    params: [
      choice('process', 'Process', 'mig', [{ value: 'mig', label: 'MIG (GMAW)' }, { value: 'tig', label: 'TIG (GTAW)' }, { value: 'stick', label: 'Stick (SMAW)' }], { group: 'Weld' }),
      choice('filler', 'Filler', 'E70', Object.values(FILLERS).map((f) => ({ value: f.id, label: f.label })), { group: 'Weld' }),
      num('leg', 'Fillet leg size', 0.005, 0.001, 0.03, 'mm', { group: 'Weld', step: 0.5 }),
      num('length', 'Weld length (0 = all around)', 0, 0, 5, 'mm', { group: 'Weld' }),
      num('quality', 'Bead quality', 0.95, 0.05, 1, '%', { group: 'Weld', help: 'Fusion quality; the welder tool sets this from heat input' }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB, thicknessA, thicknessB }) => {
      const warnings: string[] = [];
      const b = numberOf(params, 'bondW'), d = numberOf(params, 'bondL');
      const perimeter = 2 * (b + d);
      const L = numberOf(params, 'length') > 0 ? numberOf(params, 'length') : perimeter;
      const leg = Math.min(numberOf(params, 'leg'), Math.max(0.0005, Math.min(thicknessA, matB ? thicknessB : thicknessA)));
      if (leg < numberOf(params, 'leg')) warnings.push('Leg size limited to the thinner part thickness.');
      const filler = FILLERS[stringOf(params, 'filler', 'E70')] ?? FILLERS['E70']!;
      const base = matB ? Math.min(hazUltimate(matA), hazUltimate(matB)) : hazUltimate(matA);
      const q = numberOf(params, 'quality', 0.95);
      const ok = weldable(matA.weld, matB ? matB.weld : matA.weld);
      const fillerOk = fillerMatches(filler.id, matA, matB);
      if (ok && !fillerOk) warnings.push(`${filler.label} is the wrong filler for these base metals.`);
      const R = ok ? filletWeldCapacity(leg, L, filler.Fexx, base) * q * (fillerOk ? 1 : 0.3) : 0;
      // Weld group section modulus for a rectangle outline b x d (line weld): S_w = b d + d^2 / 3 (per unit throat).
      const throat = 0.7071 * leg;
      const Sw = (b * d + (d * d) / 3) * throat;
      const tau = 0.6 * Math.min(filler.Fexx, base) * q * (fillerOk ? 1 : 0.3) * (ok ? 1 : 0);
      const Jw = ((b + d) ** 3 / 6) * throat;
      const cap = { tension: R, compression: INF, shear: R, bending: tau * Sw, torsion: (tau * Jw) / Math.max(Math.hypot(b, d) / 2, 1e-4) };
      return {
        capacities: cap,
        instantFailure: ok ? undefined : `No fusion: ${matA.name} cannot be fusion welded to ${matB ? matB.name : 'that'}.`,
        readouts: [
          { label: 'Throat', value: `${fmt(throat * 1000, 1)} mm`, formula: 'a · 0.707' },
          { label: 'Weld length', value: `${fmt(L * 1000, 0)} mm` },
          { label: 'Shear / tension capacity', value: formatForce(R), formula: '0.707 a L · 0.6 min(F_EXX, F_u,HAZ) · q' },
          { label: 'Bending capacity', value: `${fmt(cap.bending, 1)} N·m`, formula: 'τ · S_w,  S_w = (b d + d²/3)·throat' },
        ],
        warnings,
      };
    },
  },
  {
    id: 'bolted', label: 'Bolted', category: 'Joining', model: 'rigid',
    blurb: 'ISO metric bolts through clearance holes. Preload from wrench torque (VDI 2230); slips, then bears, then shears.',
    params: [
      choice('size', 'Thread', 'M8', Object.keys(METRIC_COARSE).map((k) => ({ value: k, label: `${k} × ${METRIC_COARSE[k]!.P * 1000}` })), { group: 'Fastener' }),
      choice('class', 'Property class', '8.8', Object.keys(PROPERTY_CLASSES).map((k) => ({ value: k, label: k })), { group: 'Fastener' }),
      num('count', 'Number of bolts', 1, 1, 24, '', { group: 'Fastener', integer: true }),
      choice('surface', 'Thread condition', 'zinc-plated', Object.entries(BOLT_FRICTION).map(([k, v]) => ({ value: k, label: v.label })), { group: 'Tightening' }),
      choice('tightening', 'Tighten to', 'spec', [{ value: 'spec', label: 'Spec torque (90% yield)' }, { value: 'custom', label: 'Custom torque' }, { value: 'hand', label: 'Hand tight (~2 N·m)' }], { group: 'Tightening' }),
      num('torque', 'Custom torque', 20, 0, 2000, 'N·m', { group: 'Tightening' }),
      num('interfaces', 'Shear planes', 1, 1, 4, '', { group: 'Fastener', integer: true }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB, thicknessA, thicknessB }) => {
      const size = stringOf(params, 'size', 'M8');
      const cls = stringOf(params, 'class', '8.8');
      const surface = stringOf(params, 'surface', 'zinc-plated');
      const t = threadFor(size);
      const fr = BOLT_FRICTION[surface] ?? BOLT_FRICTION['zinc-plated']!;
      const Dkm = ((HEX_BEARING_DIAMETER[size] ?? t.d * 1.45) + (CLEARANCE_HOLE_MEDIUM[size] ?? t.d * 1.1)) / 2;
      const specF = permissiblePreload(propertyClassFor(cls, t.d).Rp, 0.9, t, fr.muThread);
      const specTorque = tighteningTorque(specF, { thread: t, muThread: fr.muThread, muHead: fr.muHead, Dkm });
      const mode = stringOf(params, 'tightening', 'spec');
      const torque = mode === 'spec' ? specTorque : mode === 'hand' ? 2 : numberOf(params, 'torque');
      const b = numberOf(params, 'bondW'), d = numberOf(params, 'bondL');
      const muFaying = Math.sqrt(matA.friction * (matB ?? matA).friction);
      const plateThickness = Math.max(0.0005, Math.min(thicknessA, matB ? thicknessB : thicknessA));
      const plateUltimate = Math.min(matA.ultimate, (matB ?? matA).ultimate);
      const j = boltedJoint({
        size, propertyClass: cls, torque, surface, count: numberOf(params, 'count', 1), muFaying,
        interfaces: numberOf(params, 'interfaces', 1), plateThickness, plateUltimate,
        bendingArm: Math.max(b, d) / 2, torsionArm: Math.max(b, d) / 3,
      });
      const warnings: string[] = [];
      if (j.overTorqued) warnings.push(`Over-torqued: ${fmt(torque, 1)} N·m yields a ${size} ${cls} bolt (σ_red = ${fmt(j.assemblyStress / MPa, 0)} MPa).`);
      // a bolt through wood bears on the wood as any dowel does: the NDS yield modes on its dowel bearing strength
      // (Wood Handbook ch. 8), not a steel plate's bearing, which would overstate it about 2.5 times
      const woods = [matA, matB ?? matA].filter((m) => m.specificGravity);
      const tMain = Math.max(thicknessA, matB ? thicknessB : thicknessA), tSide = plateThickness;
      const bearing = woods.length
        ? numberOf(params, 'count', 1) * numberOf(params, 'interfaces', 1) * lateralUltimate(Math.min(...woods.map((m) => m.specificGravity!)), t.d, tMain, tSide)
        : j.bearing;
      const brittle = [matA, matB ?? matA].some((m) => !m.ductile && !m.specificGravity);
      if (brittle) warnings.push('Clamping a brittle material: bearing capacity is limited by its low strength.');
      const shear = Math.min(j.boltShear, bearing);
      return {
        capacities: {
          tension: j.overTorqued ? j.tension * 0.2 : j.tension,
          compression: INF,
          shear,
          bending: j.bending,
          torsion: shear * Math.max(Math.max(b, d) / 3, t.d),
        },
        slip: { shear: j.slipShear, torsion: j.torsionSlip, clearance: j.clearance },
        instantFailure: j.overTorqued && j.yieldUtilisation > 1.25 ? `Bolt snapped while tightening (σ_red ${fmt(j.yieldUtilisation * 100, 0)}% of yield).` : undefined,
        readouts: [
          { label: 'Wrench torque', value: `${fmt(torque, 1)} N·m${mode === 'spec' ? ' (spec)' : ''}` },
          { label: 'Preload per bolt', value: formatForce(j.preload), formula: 'F = M_A / (0.16P + 0.58 d₂ μ_G + D_Km/2 μ_K)' },
          { label: 'Yield utilisation', value: `${fmt(j.yieldUtilisation * 100, 0)} %`, formula: 'σ_red / R_p0.2' },
          { label: 'Slip load (friction grip)', value: formatForce(j.slipShear), formula: 'μ · F_M · n · planes' },
          { label: 'Bolt shear', value: formatForce(j.boltShear), formula: '0.6 R_m · A(d₃) · n · planes' },
          { label: woods.length ? 'Wood bearing' : 'Plate bearing', value: formatForce(bearing), formula: woods.length ? 'NDS yield modes Im, Is, IV × 1.6' : '2.5 d t R_m,plate · n' },
          { label: 'Tensile capacity', value: formatForce(j.tension), formula: 'A_s R_m · n' },
        ],
        warnings,
      };
    },
  },
  {
    id: 'clamp', label: 'Split clamp', category: 'Joining', model: 'rigid',
    blurb: 'A block bored to fit a round body (a motor, a tube, a shaft) and split, its halves bolted together around it. It holds by the friction its bolts\' clamping makes, nothing drilled into what it holds, and slips past that.',
    params: [
      choice('size', 'Clamp bolts', 'M5', Object.keys(METRIC_COARSE).map((k) => ({ value: k, label: `${k} × ${METRIC_COARSE[k]!.P * 1000}` })), { group: 'Fastener' }),
      choice('class', 'Property class', '8.8', Object.keys(PROPERTY_CLASSES).map((k) => ({ value: k, label: k })), { group: 'Fastener' }),
      num('count', 'Bolts (across the split)', 2, 1, 8, '', { group: 'Fastener', integer: true }),
      choice('surface', 'Thread condition', 'zinc-plated', Object.entries(BOLT_FRICTION).map(([k, v]) => ({ value: k, label: v.label })), { group: 'Tightening' }),
      choice('tightening', 'Tighten to', 'spec', [{ value: 'spec', label: 'Spec torque (90% yield)' }, { value: 'custom', label: 'Custom torque' }], { group: 'Tightening' }),
      num('torque', 'Custom torque', 2, 0, 500, 'N·m', { group: 'Tightening' }),
      num('bore', 'Bore (what it grips)', 0.042, 0.003, 0.5, 'mm', { group: 'Clamp', step: 0.5 }),
      num('width', 'Clamp width along the body', 0.025, 0.004, 0.3, 'mm', { group: 'Clamp' }),
    ],
    derive: ({ params, matA, matB }) => {
      const size = stringOf(params, 'size', 'M5'), cls = stringOf(params, 'class', '8.8');
      const t = threadFor(size), fr = BOLT_FRICTION[stringOf(params, 'surface', 'zinc-plated')] ?? BOLT_FRICTION['zinc-plated']!;
      const n = numberOf(params, 'count', 2), d = numberOf(params, 'bore', 0.042), w = numberOf(params, 'width', 0.025);
      // bolts tightened to spec (90% of yield, VDI 2230) pull the halves together with n F; the bore presses on the body
      // with that, taken as a cosine distribution over each half (the lower bound of a split hub's grip: a uniform one
      // gives pi/2 per half instead of 4/pi), so the normal force all round is (8/pi) n F
      const spec = permissiblePreload(propertyClassFor(cls, t.d).Rp, 0.9, t, fr.muThread);
      // a custom torque gives the preload the screw's own torque-tension relation does (VDI 2230), at most the spec's
      const Dkm = ((HEX_BEARING_DIAMETER[size] ?? t.d * 1.45) + (CLEARANCE_HOLE_MEDIUM[size] ?? t.d * 1.1)) / 2;
      const specTorque = tighteningTorque(spec, { thread: t, muThread: fr.muThread, muHead: fr.muHead, Dkm });
      const custom = stringOf(params, 'tightening', 'spec') === 'custom';
      const F = custom ? Math.min(spec, (spec * numberOf(params, 'torque', 2)) / specTorque) : spec;
      const mu = Math.sqrt(matA.friction * (matB ?? matA).friction);
      const N = (8 / Math.PI) * n * F;
      const torque = (mu * N * d) / 2, axial = mu * N;
      const boltsPull = n * tensileStressArea(t) * propertyClassFor(cls, t.d).Rm;
      return {
        // its frame's y is the body's axis: it turns about it at the slip torque, slides along it at the slip force;
        // pulled across, its bolts take it; tilted, its width does
        capacities: { tension: axial, compression: axial, shear: boltsPull, bending: (boltsPull * w) / 2, torsion: torque },
        readouts: [
          { label: 'Clamp force', value: formatForce(n * F), formula: 'n F_M (spec preload)' },
          { label: 'Holds against turning', value: `${fmt(torque, 1)} N·m`, formula: '(4/π) μ n F d' },
          { label: 'Holds against sliding', value: formatForce(axial), formula: '(8/π) μ n F' },
          { label: 'Friction', value: fmt(mu, 2), formula: '√(μ_A μ_B)' },
          { label: 'Pressure on the body', value: `${fmt(N / (Math.PI * d * w) / MPa, 1)} MPa`, formula: 'N / (π d w)' },
          { label: 'Wrench torque', value: `${fmt(custom ? numberOf(params, 'torque', 2) : specTorque, 1)} N·m${custom ? '' : ' (spec)'}` },
        ],
        warnings: N / (Math.PI * d * w) > 5 * MPa ? [`It presses ${fmt(N / (Math.PI * d * w) / MPa, 1)} MPa on what it grips: a thin housing (a motor's, a gearhead's) can distort under that. Tighten it less.`] : [],
      };
    },
  },
  {
    id: 'screwed', label: 'Screwed', category: 'Joining', model: 'rigid',
    blurb: 'Wood screws (USDA Wood Handbook withdrawal, NDS yield modes) or self-tappers into sheet metal.',
    params: [
      num('diameter', 'Screw diameter', 0.004, 0.002, 0.012, 'mm', { group: 'Fastener', step: 0.5 }),
      num('length', 'Screw length', 0.04, 0.008, 0.2, 'mm', { group: 'Fastener' }),
      num('count', 'Number of screws', 2, 1, 40, '', { group: 'Fastener', integer: true }),
      flag('endGrain', 'Into end grain', false, { group: 'Fastener' }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB, thicknessA, thicknessB, through }) => {
      const D = numberOf(params, 'diameter'), L = numberOf(params, 'length'), n = numberOf(params, 'count', 1);
      // driven through whichever part is thinner along its path, its point into the other (or the world anchor)
      const way = driven(through, !matB, thicknessA, thicknessB);
      const holding = way.flip ? matA : matB ?? matA;
      const side = way.flip ? matB! : matA;
      const warnings: string[] = [];
      // what the threads bite: past the side member, and no further than the holding member is deep
      const penetration = Math.max(0, Math.min(L - way.side, way.hold));
      const endGrain = boolOf(params, 'endGrain') || way.endGrain;
      let withdrawal: number, lateral: number;
      if (holding.specificGravity) {
        const Gw = holding.specificGravity;
        withdrawal = n * withdrawalUltimate('wood-screw', Gw, D, penetration) * (endGrain ? 0.75 : 1);
        lateral = n * lateralUltimate(Math.min(Gw, side.specificGravity ?? Gw), D, penetration, way.side);
      } else {
        // Self-tapping into sheet: thread stripping of the sheet, 0.6 sigma_u over the engaged thread cylinder (estimated).
        const tSheet = matB ? (way.flip ? thicknessA : thicknessB) : thicknessA;
        withdrawal = n * 0.6 * holding.ultimate * Math.PI * D * Math.min(tSheet, penetration) * 0.5;
        lateral = n * Math.min(2.5 * D * tSheet * holding.ultimate, 0.6 * 700 * MPa * (Math.PI / 4) * (D * 0.75) ** 2);
        warnings.push('Self-tapping into sheet: strength is an estimate from sheet thread stripping.');
      }
      if (penetration < 6 * D) warnings.push('Short penetration into the holding member (< 6 d).');
      const b = numberOf(params, 'bondW'), d = numberOf(params, 'bondL');
      return {
        capacities: { tension: withdrawal, compression: INF, shear: lateral, bending: withdrawal * Math.max(b, d) / 2, torsion: lateral * Math.max(b, d) / 3 },
        instantFailure: penetration > 0 ? undefined : `A ${fmt(L * 1000, 0)} mm screw can't reach through ${fmt(way.side * 1000, 0)} mm of ${side.name} into the other part: it holds nothing.`,
        readouts: [
          { label: 'Penetration', value: `${fmt(penetration * 1000, 0)} mm${endGrain ? ' (end grain)' : ''}` },
          { label: 'Withdrawal (all screws)', value: formatForce(withdrawal), formula: holding.specificGravity ? 'p = 108.25 G² D L  (N, mm)' : 'sheet thread strip (est.)' },
          { label: 'Lateral (all screws)', value: formatForce(lateral), formula: 'NDS yield modes I, IV × 1.6' },
        ],
        warnings,
      };
    },
  },
  {
    id: 'nailed', label: 'Nailed', category: 'Joining', model: 'rigid',
    blurb: 'Smooth-shank nails into wood (Wood Handbook withdrawal). Weak in withdrawal, decent in shear.',
    params: [
      num('diameter', 'Nail diameter', 0.0033, 0.0015, 0.008, 'mm', { group: 'Fastener', step: 0.1 }),
      num('length', 'Nail length', 0.075, 0.02, 0.2, 'mm', { group: 'Fastener' }),
      num('count', 'Number of nails', 4, 1, 60, '', { group: 'Fastener', integer: true }),
      flag('endGrain', 'Into end grain', false, { group: 'Fastener' }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB, thicknessA, thicknessB, through }) => {
      const D = numberOf(params, 'diameter'), L = numberOf(params, 'length'), n = numberOf(params, 'count', 1);
      const way = driven(through, !matB, thicknessA, thicknessB);
      const holding = way.flip ? matA : matB ?? matA;
      const side = way.flip ? matB! : matA;
      const Gw = holding.specificGravity ?? 0;
      const penetration = Math.max(0, Math.min(L - way.side, way.hold));
      const withdrawal = Gw > 0 ? n * withdrawalUltimate('nail', Gw, D, penetration) * (boolOf(params, 'endGrain') || way.endGrain ? 0.6 : 1) : 0;
      const lateral = Gw > 0 ? n * lateralUltimate(Math.min(Gw, side.specificGravity ?? Gw), D, penetration, way.side) : 0;
      const b = numberOf(params, 'bondW'), d = numberOf(params, 'bondL');
      return {
        capacities: { tension: withdrawal, compression: INF, shear: lateral, bending: withdrawal * Math.max(b, d) / 2, torsion: lateral * Math.max(b, d) / 3 },
        instantFailure: Gw <= 0 ? `Nails need wood to hold in; ${holding.name} can't take a nail.` : penetration > 0 ? undefined : `A ${fmt(L * 1000, 0)} mm nail can't reach through ${fmt(way.side * 1000, 0)} mm of ${side.name} into the other part: it holds nothing.`,
        readouts: [
          { label: 'Withdrawal (all nails)', value: formatForce(withdrawal), formula: 'p = 54.12 G^2.5 D L  (N, mm)' },
          { label: 'Lateral (all nails)', value: formatForce(lateral), formula: 'NDS yield modes I, IV × 1.6' },
        ],
        warnings: [],
      };
    },
  },
  {
    id: 'riveted', label: 'Riveted', category: 'Joining', model: 'rigid',
    blurb: 'Solid or blind rivets through sheet. Shear from rivet material, limited by sheet bearing.',
    params: [
      choice('type', 'Rivet type', 'blind', [{ value: 'blind', label: 'Blind (pop) rivet' }, { value: 'solid', label: 'Solid rivet' }], { group: 'Fastener' }),
      choice('rivetMaterial', 'Rivet material', 'aluminum', [{ value: 'aluminum', label: 'Aluminium (2117/5052)' }, { value: 'steel', label: 'Steel' }, { value: 'stainless', label: 'Stainless' }], { group: 'Fastener' }),
      num('diameter', 'Rivet diameter', 0.0048, 0.0024, 0.012, 'mm', { group: 'Fastener', step: 0.1 }),
      num('count', 'Number of rivets', 4, 1, 60, '', { group: 'Fastener', integer: true }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB, thicknessA, thicknessB }) => {
      const d = numberOf(params, 'diameter'), n = numberOf(params, 'count', 1);
      const rm = { aluminum: 310 * MPa, steel: 440 * MPa, stainless: 600 * MPa }[stringOf(params, 'rivetMaterial', 'aluminum') as 'aluminum'] ?? 310 * MPa;
      const blind = stringOf(params, 'type', 'blind') === 'blind';
      const shearRivet = blind ? blindRivet(n, d, rm).shear : rivetShear(n, d, rm);
      const tensionRivet = blind ? blindRivet(n, d, rm).tension : 0.5 * shearRivet;
      const t = Math.max(0.0003, Math.min(thicknessA, matB ? thicknessB : thicknessA));
      const bearing = n * 2.5 * d * t * Math.min(matA.ultimate, (matB ?? matA).ultimate);
      const b = numberOf(params, 'bondW'), L = numberOf(params, 'bondL');
      const shear = Math.min(shearRivet, bearing);
      return {
        capacities: { tension: tensionRivet, compression: INF, shear, bending: tensionRivet * Math.max(b, L) / 2, torsion: shear * Math.max(b, L) / 3 },
        readouts: [
          { label: 'Rivet shear', value: formatForce(shearRivet), formula: blind ? '0.8 · n τ π d²/4 (hollow shank)' : 'n τ π d²/4' },
          { label: 'Sheet bearing', value: formatForce(bearing), formula: '2.5 d t R_m · n' },
          { label: 'Tension', value: formatForce(tensionRivet) },
        ],
        warnings: [],
      };
    },
  },
  {
    id: 'glued', label: 'Glued', category: 'Joining', model: 'rigid',
    blurb: 'Adhesive bond. Strong in shear, weak in peel. Cures over time; substrate matters.',
    params: [
      choice('adhesive', 'Adhesive', 'epoxy-structural', Object.values(ADHESIVES).map((a) => ({ value: a.id, label: a.label })), { group: 'Adhesive' }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB, thicknessA, thicknessB, cure }) => {
      const a = ADHESIVES[stringOf(params, 'adhesive', 'epoxy-structural')] ?? ADHESIVES['epoxy-structural']!;
      const sub = Math.min(substrateFactor(a, matA.category), substrateFactor(a, (matB ?? matA).category));
      const cureF = cureFraction(a, cure);
      const k = sub * cureF;
      // the more flexible part decides how much of the face a bending load reaches
      const edge = Math.min(bondEdgeLength(matA.E, thicknessA, a), matB ? bondEdgeLength(matB.E, thicknessB, a) : Infinity);
      const c = bondCapacities(numberOf(params, 'bondW'), numberOf(params, 'bondL'), a.lapShear * k, a.peel * k, edge);
      const warnings: string[] = [];
      if (sub < 1) warnings.push(`${a.label} bonds poorly to ${sub <= 0.05 ? 'low-energy plastics' : 'this substrate'}.`);
      if (cureF < 0.99) warnings.push(`Curing: ${fmt(cureF * 100, 0)}% strength.`);
      return {
        capacities: { tension: c.tension, compression: INF, shear: c.shear, bending: c.bending, torsion: c.torsion },
        readouts: [
          { label: 'Cure', value: `${fmt(cureF * 100, 0)} %`, formula: '1 − e^(−t/τ)' },
          { label: 'Shear capacity', value: formatForce(c.shear), formula: 'τ_lap · A' },
          { label: 'Bending capacity', value: `${fmt(c.bending, 2)} N·m`, formula: 'σ · long · short · min(short/6, max(p/2σ, ℓ/2)),  σ = 0.7 τ' },
        ],
        warnings,
      };
    },
  },
  {
    id: 'soldered', label: 'Soldered', category: 'Joining', model: 'rigid',
    blurb: 'Soft solder joint. Only on metals it wets; weak but electrically sound.',
    params: [
      choice('alloy', 'Solder', 'sn63pb37', Object.values(SOLDERS).map((s) => ({ value: s.id, label: s.label })), { group: 'Solder' }),
      ...bondParams,
    ],
    derive: ({ params, matA, matB }) => {
      const s = SOLDERS[stringOf(params, 'alloy', 'sn63pb37')] ?? SOLDERS['sn63pb37']!;
      const wets = SOLDERABLE.has(matA.category) && SOLDERABLE.has((matB ?? matA).category);
      const c = bondCapacities(numberOf(params, 'bondW'), numberOf(params, 'bondL'), wets ? s.shear : 0, wets ? 1500 : 0);
      return {
        capacities: { tension: c.tension, compression: INF, shear: c.shear, bending: c.bending, torsion: c.torsion },
        instantFailure: wets ? undefined : `Solder won't wet ${!SOLDERABLE.has(matA.category) ? matA.name : (matB ?? matA).name}.`,
        readouts: [{ label: 'Shear capacity', value: formatForce(c.shear), formula: 'τ_solder · A' }],
        warnings: [],
      };
    },
  },
  {
    id: 'hinge', label: 'Hinge', category: 'Joints', model: 'revolute',
    blurb: 'Revolute joint on a pin. Friction, limits and an optional return spring.',
    params: [
      ...pinParams,
      num('friction', 'Friction torque', 0.05, 0, 500, 'N·m', { group: 'Friction', log: true }),
      ...revoluteLimitParams,
      num('springK', 'Return spring (0 = none)', 0, 0, 5000, 'N·m/deg', { group: 'Spring', log: true }),
      num('springRest', 'Spring rest angle', 0, -Math.PI, Math.PI, 'deg', { group: 'Spring' }),
    ],
    derive: ({ params }) => {
      const cap = pinCapacity(params, PIN_RM);
      const k = numberOf(params, 'springK');
      return {
        capacities: cap,
        revolute: {
          frictionTorque: numberOf(params, 'friction'), bearingMu: 0, boreDiameter: numberOf(params, 'pin'),
          limits: revoluteLimits(params), torsionSpring: k > 0 ? { k, rest: numberOf(params, 'springRest') } : undefined,
        },
        readouts: [{ label: 'Pin shear (double)', value: formatForce(cap.shear), formula: '2 · 0.6 R_m · π d²/4' }],
        warnings: [],
      };
    },
  },
  {
    id: 'bearing', label: 'Free-spinning (bearing)', category: 'Joints', model: 'revolute',
    blurb: 'Axle in a rolling or plain bearing. Friction torque grows with the load it carries.',
    params: [
      choice('bearing', 'Bearing type', 'deep-groove-ball', Object.entries(BEARING_FRICTION).map(([k, v]) => ({ value: k, label: v.label })), { group: 'Bearing' }),
      num('bore', 'Bore (shaft) diameter', 0.008, 0.002, 0.2, 'mm', { group: 'Bearing', step: 0.5 }),
      num('staticRating', 'Static load rating C0', 1370, 10, 1e6, 'N', { group: 'Bearing', log: true, help: '608 bearing: 1.37 kN' }),
    ],
    derive: ({ params }) => {
      const bt = BEARING_FRICTION[stringOf(params, 'bearing', 'deep-groove-ball')] ?? BEARING_FRICTION['deep-groove-ball']!;
      const C0 = numberOf(params, 'staticRating', 1370);
      return {
        // Brinelling and seizure well past the static rating (estimated 4x C0 to destruction).
        capacities: { tension: 4 * C0, compression: 4 * C0, shear: 4 * C0, bending: 4 * C0 * numberOf(params, 'bore') * 2, torsion: INF },
        revolute: { frictionTorque: 0, bearingMu: bt.mu, boreDiameter: numberOf(params, 'bore'), limits: null },
        readouts: [
          { label: 'Friction coefficient', value: `${bt.mu}`, formula: 'M = ½ μ P d  (SKF)' },
          { label: 'Static rating', value: formatForce(C0) },
        ],
        warnings: [],
      };
    },
  },
  {
    id: 'motor', label: 'Motor drive', category: 'Powered', model: 'revolute',
    blurb: 'Where a DC motor part (A) turns what its output shaft drives (B). It runs on what a battery wired to the motor gives it, through a controller that limits the current.',
    params: [
      choice('channel', 'Control', 'throttle', channelOptions, { group: 'Control' }),
      flag('reverse', 'Reverse direction', false, { group: 'Control' }),
      num('currentLimit', 'Controller current limit', 20, 1, 300, 'A', { group: 'Controller' }),
    ],
    derive: ({ params, partA }) => {
      const on = partA ?? { kind: 'motor.dc', params: {} };
      if (on.kind !== 'motor.dc') {
        return {
          capacities: noCap(), readouts: [], warnings: [],
          instantFailure: 'A motor drive is the output shaft of a motor: make it on a DC motor part (A), at its shaft, to what the shaft turns.',
        };
      }
      const m = getMotor(stringOf(on.params, 'model', 'maxon.re40-148867'));
      const g = getGearhead(stringOf(on.params, 'gearhead', 'none'));
      const gear = g && g.fits.includes(m.id) ? g : null;
      const d = gear?.shaft ?? m.shaft;
      // what joins motor and load is the output shaft: steel (its maker doesn't say which; taken as 1018 cold drawn,
      // Rm 440 MPa), held in the motor's bearings and loaded where it leaves the flange
      const rm = PIN_RM['steel.1018-cd']!, sec = roundSection(d);
      const capacities: Capacities = {
        tension: rm * sec.A, compression: rm * sec.A, shear: 0.6 * rm * sec.A,
        bending: (rm * Math.PI * d ** 3) / 32, torsion: (0.6 * rm * Math.PI * d ** 3) / 16,
      };
      const limit = numberOf(params, 'currentLimit', 20);
      const warnings: string[] = [];
      if (limit > m.maxContinuousCurrent) warnings.push(`The controller lets through ${fmt(limit, 0)} A; the motor carries ${fmt(m.maxContinuousCurrent, 1)} A continuously. Held there it overheats.`);
      return {
        capacities,
        revolute: {
          frictionTorque: 0, bearingMu: 0.0015, boreDiameter: d, limits: null,
          motor: { channel: stringOf(params, 'channel', 'throttle'), reverse: boolOf(params, 'reverse'), currentLimit: limit },
        },
        readouts: [
          { label: 'Motor', value: m.label + (gear ? ` + ${gear.label}` : '') },
          { label: 'Output shaft', value: `Ø${fmt(d * 1000, 0)} mm` },
          ...(gear ? [{ label: 'Gearhead carries', value: `${fmt(gear.maxContinuousTorque, 1)} N·m continuous, ${fmt(gear.maxRadial, 0)} N radial` }] : []),
          { label: 'Controller limit', value: `${fmt(limit, 0)} A` },
          { label: 'Power', value: 'the battery wired to the motor' },
        ],
        warnings,
      };
    },
  },
  {
    id: 'wire', label: 'Power wire', category: 'Powered', model: 'rope',
    blurb: 'A pair of copper conductors from a battery to a motor. It carries the current, drops voltage by its resistance, hangs slack, and pulls taut or tears like the copper it is.',
    params: [
      choice('gauge', 'Gauge', '14', Object.entries(WIRE_GAUGES).map(([g, w]) => ({ value: g, label: `${g} AWG (${fmt(w.area * 1e6, 2)} mm², ${w.ampacity} A)` })), { group: 'Wire' }),
      num('length', 'Length (0 = as placed, 20% slack)', 0, 0, 20, 'mm', { group: 'Wire' }),
    ],
    derive: ({ params, distance }) => {
      const w = WIRE_GAUGES[stringOf(params, 'gauge', '14')] ?? WIRE_GAUGES['14']!;
      const L = numberOf(params, 'length') > 0 ? numberOf(params, 'length') : Math.max(1.2 * distance, 0.05);
      // two conductors, out and back; annealed copper, E 117 GPa and 220 MPa tensile (ASTM B3)
      const A = 2 * w.area;
      const k = (117e9 * A) / L;
      const tension = 220e6 * A;
      const resistance = 2 * L * w.ohmPerM;
      return {
        capacities: { tension, compression: INF, shear: INF, bending: INF, torsion: INF },
        spring: { k, c: 0, rest: L, min: 0, max: L, tensionOnly: true },
        wire: { resistance, ampacity: w.ampacity, length: L },
        readouts: [
          { label: 'Resistance', value: `${fmt(resistance * 1000, 1)} mΩ`, formula: '2 L ρ' },
          { label: 'Carries', value: `${w.ampacity} A`, formula: 'chassis wiring' },
          { label: 'Tears at', value: formatForce(tension), formula: '220 MPa × 2A' },
        ],
        warnings: [],
      };
    },
  },
  {
    id: 'servo', label: 'Servo', category: 'Powered', model: 'revolute',
    blurb: 'Position-controlled joint with a torque limit, driven from a control channel.',
    params: [
      num('maxTorque', 'Stall torque', 2, 0.01, 2000, 'N·m', { group: 'Servo', log: true }),
      num('range', 'Travel (±)', Math.PI / 3, 0.05, Math.PI, 'deg', { group: 'Servo' }),
      choice('channel', 'Control', 'steer', channelOptions, { group: 'Control' }),
      ...pinParams,
    ],
    derive: ({ params }) => ({
      capacities: pinCapacity(params, PIN_RM),
      revolute: {
        // a servo turns only through its travel: past it is its own end stop
        frictionTorque: 0, bearingMu: 0.0015, boreDiameter: numberOf(params, 'pin'), limits: [-numberOf(params, 'range'), numberOf(params, 'range')],
        servo: { maxTorque: numberOf(params, 'maxTorque'), range: numberOf(params, 'range'), channel: stringOf(params, 'channel', 'steer') },
      },
      readouts: [{ label: 'Stall torque', value: `${fmt(numberOf(params, 'maxTorque'), 2)} N·m` }],
      warnings: [],
    }),
  },
  {
    id: 'eddy-brake', label: 'Magnetically resisted', category: 'Joints', model: 'revolute',
    blurb: 'Hinge with an eddy-current brake: a conductive rotor spinning between magnets. Torque ∝ speed.',
    params: [
      choice('rotor', 'Rotor material', 'copper', [{ value: 'copper', label: 'Copper (5.8e7 S/m)' }, { value: 'aluminium', label: 'Aluminium 6061 (2.5e7 S/m)' }], { group: 'Rotor' }),
      num('rotorThickness', 'Rotor thickness', 0.004, 0.0005, 0.03, 'mm', { group: 'Rotor', step: 0.5 }),
      num('radius', 'Magnet radius on rotor', 0.05, 0.005, 1, 'mm', { group: 'Rotor' }),
      choice('grade', 'Magnet grade', 'N42', [{ value: 'N35', label: 'N35' }, { value: 'N42', label: 'N42' }, { value: 'N52', label: 'N52' }, { value: 'C8', label: 'Ferrite C8' }], { group: 'Magnets' }),
      num('magnetD', 'Magnet diameter', 0.02, 0.003, 0.2, 'mm', { group: 'Magnets' }),
      num('magnetL', 'Magnet thickness', 0.01, 0.001, 0.1, 'mm', { group: 'Magnets' }),
      num('gap', 'Air gap', 0.006, 0.0006, 0.05, 'mm', { group: 'Magnets', step: 0.1 }),
      num('pairs', 'Magnet pairs', 2, 1, 24, '', { group: 'Magnets', integer: true }),
      ...pinParams,
    ],
    derive: ({ params }) => {
      const sigma = stringOf(params, 'rotor', 'copper') === 'copper' ? 5.8e7 : 2.5e7;
      const Br = { N35: 1.19, N42: 1.3, N52: 1.455, C8: 0.39 }[stringOf(params, 'grade', 'N42') as 'N42'] ?? 1.3;
      const R = numberOf(params, 'magnetD') / 2, L = numberOf(params, 'magnetL'), g = numberOf(params, 'gap');
      // Magnets on both sides of the rotor: field at mid-gap from each face, summed.
      const B = 2 * magnetFieldOnAxis(Br, L, R, g / 2);
      const c = numberOf(params, 'pairs', 2) * eddyDamping(sigma, numberOf(params, 'rotorThickness'), B, Math.PI * R * R, numberOf(params, 'radius'));
      return {
        capacities: pinCapacity(params, PIN_RM),
        revolute: { frictionTorque: 0.01, bearingMu: 0.0015, boreDiameter: numberOf(params, 'pin'), limits: null, eddy: { c } },
        readouts: [
          { label: 'Gap flux density', value: `${fmt(B, 3)} T`, formula: 'B = Br/2 [ (L+z)/√((L+z)²+R²) − z/√(z²+R²) ] × 2' },
          { label: 'Damping', value: `${fmt(c, 4)} N·m·s/rad`, formula: 'c ≈ ½ σ t B² A R² · pairs' },
        ],
        warnings: [],
      };
    },
  },
  {
    id: 'slider', label: 'Slider', category: 'Joints', model: 'prismatic',
    blurb: 'Linear rail. Friction, travel limits and an optional spring.',
    params: [
      num('friction', 'Friction force', 1, 0, 1e5, 'N', { group: 'Friction', log: true }),
      flag('limited', 'Travel limits', true, { group: 'Limits' }),
      num('min', 'Min travel', -0.2, -10, 0, 'mm', { group: 'Limits' }),
      num('max', 'Max travel', 0.2, 0, 10, 'mm', { group: 'Limits' }),
      num('springK', 'Spring rate (0 = none)', 0, 0, 1e6, 'N/mm', { group: 'Spring', log: true }),
      num('springRest', 'Spring rest position', 0, -10, 10, 'mm', { group: 'Spring' }),
      num('rating', 'Carriage load rating', 5000, 10, 1e6, 'N', { group: 'Strength', log: true }),
    ],
    derive: ({ params }) => {
      const r = numberOf(params, 'rating', 5000);
      return {
        capacities: { tension: INF, compression: INF, shear: 3 * r, bending: 3 * r * 0.05, torsion: 3 * r * 0.05 },
        prismatic: {
          frictionForce: numberOf(params, 'friction'),
          limits: boolOf(params, 'limited') ? [numberOf(params, 'min'), numberOf(params, 'max')] : null,
          k: numberOf(params, 'springK'), rest: numberOf(params, 'springRest'),
        },
        readouts: [{ label: 'Load rating', value: formatForce(r) }],
        warnings: [],
      };
    },
  },
  {
    id: 'ball', label: 'Ball-and-socket', category: 'Joints', model: 'spherical',
    blurb: 'Three rotational degrees of freedom with a cone limit and friction.',
    params: [
      num('stud', 'Ball stud diameter', 0.012, 0.002, 0.2, 'mm', { group: 'Stud', step: 0.5 }),
      num('cone', 'Cone limit (half angle)', Math.PI / 3, 0.05, Math.PI, 'deg', { group: 'Limits' }),
      num('friction', 'Friction torque', 0.05, 0, 500, 'N·m', { group: 'Friction', log: true }),
    ],
    derive: ({ params }) => {
      const sec = roundSection(numberOf(params, 'stud'));
      const shear = 0.6 * 655 * MPa * sec.A;
      return {
        capacities: { tension: shear * 1.5, compression: INF, shear, bending: INF, torsion: INF },
        spherical: { frictionTorque: numberOf(params, 'friction'), cone: numberOf(params, 'cone') },
        readouts: [{ label: 'Stud shear', value: formatForce(shear), formula: '0.6 R_m π d²/4 (4140)' }],
        warnings: [],
      };
    },
  },
  {
    id: 'spring', label: 'Coil spring', category: 'Energy', model: 'spring',
    blurb: 'Helical compression/extension spring. Rate, stress and the sound it makes come from the wire and coils.',
    params: [
      choice('wire', 'Wire', 'music-wire-a228', Object.values(SPRING_WIRES).map((w) => ({ value: w.id, label: w.label })), { group: 'Spring' }),
      num('d', 'Wire diameter', 0.002, 0.0002, 0.03, 'mm', { group: 'Spring', step: 0.05 }),
      num('D', 'Mean coil diameter', 0.02, 0.002, 0.4, 'mm', { group: 'Spring', step: 0.5 }),
      num('Na', 'Active coils', 10, 1, 200, '', { group: 'Spring', step: 0.5 }),
      num('L0', 'Free length (0 = as placed)', 0, 0, 5, 'mm', { group: 'Spring' }),
      num('zeta', 'Damping ratio', 0.02, 0, 2, '%', { group: 'Damping' }),
    ],
    derive: ({ params, distance }) => {
      const wire = SPRING_WIRES[stringOf(params, 'wire', 'music-wire-a228')] ?? SPRING_WIRES['music-wire-a228']!;
      const L0 = numberOf(params, 'L0') > 0 ? numberOf(params, 'L0') : Math.max(distance, 0.005);
      const s: CoilSpring = { d: numberOf(params, 'd'), D: Math.max(numberOf(params, 'D'), numberOf(params, 'd') * 2.5), Na: numberOf(params, 'Na'), L0, wire };
      const k = springRate(s);
      const Ls = solidLength(s);
      const breakForce = (wireUltimate(s) * 0.6 * Math.PI * s.d ** 3) / (8 * s.D);
      const setForce = (allowableShear(s) * Math.PI * s.d ** 3) / (8 * s.D * 1.1);
      const warnings: string[] = [];
      if (Ls >= L0) warnings.push('Free length is shorter than solid length.');
      if (s.D / s.d < 4) warnings.push('Spring index below 4: hard to coil, high stress.');
      return {
        capacities: { tension: breakForce, compression: INF, shear: INF, bending: INF, torsion: INF },
        spring: { k, c: 0, rest: L0, min: Math.min(Ls, L0), max: L0 * 50, tensionOnly: false },
        readouts: [
          { label: 'Rate k', value: `${fmt(k / 1000, 3)} N/mm`, formula: 'k = G d⁴ / (8 D³ Nₐ)' },
          { label: 'Solid length', value: `${fmt(Ls * 1000, 1)} mm`, formula: 'd (Nₐ + 2)' },
          { label: 'Wire S_ut', value: `${fmt(wireUltimate(s) / MPa, 0)} MPa`, formula: 'A / d^m' },
          { label: 'Force at permanent set', value: formatForce(setForce), formula: 'S_sy π d³ / (8 K_B D)' },
          { label: 'Surge frequency (its "boing")', value: `${fmt(surgeFrequency(s), 0)} Hz`, formula: '(2d / π D² Nₐ) √(G / 32ρ)' },
          { label: 'Spring mass', value: `${fmt(springMass(s) * 1000, 1)} g` },
          { label: 'Stress at free length +50%', value: `${fmt(shearStress(s, k * L0 * 0.5) / MPa, 0)} MPa` },
        ],
        warnings,
      };
    },
  },
  {
    id: 'rope', label: 'Rope / cable / chain', category: 'Energy', model: 'rope',
    blurb: 'Tension only. Goes slack in compression. Stiffness EA/L and breaking load from its grade.',
    params: [
      choice('grade', 'Type', 'nylon-3-strand', Object.entries(ROPE_GRADES).map(([k, v]) => ({ value: k, label: v.label })), { group: 'Rope' }),
      num('diameter', 'Diameter', 0.008, 0.001, 0.06, 'mm', { group: 'Rope', step: 0.5 }),
      num('length', 'Length (0 = as placed)', 0, 0, 50, 'mm', { group: 'Rope' }),
    ],
    derive: ({ params, distance }) => {
      const g = ROPE_GRADES[stringOf(params, 'grade', 'nylon-3-strand')] ?? ROPE_GRADES['nylon-3-strand']!;
      const d = numberOf(params, 'diameter');
      const L = numberOf(params, 'length') > 0 ? numberOf(params, 'length') : Math.max(distance, 0.01);
      const A = (Math.PI / 4) * d * d;
      const k = (g.E * A) / L;
      const mbs = ropeBreakingLoad(stringOf(params, 'grade', 'nylon-3-strand'), d);
      return {
        capacities: { tension: mbs, compression: INF, shear: INF, bending: INF, torsion: INF },
        spring: { k, c: 0, rest: L, min: 0, max: L, tensionOnly: true },
        readouts: [
          { label: 'Breaking load', value: formatForce(mbs), formula: 'MBS ≈ k d²' },
          { label: 'Axial stiffness', value: `${fmt(k / 1000, 1)} N/mm`, formula: 'EA / L' },
          { label: 'Weight', value: `${fmt(g.density * A * L * 1000, 0)} g` },
        ],
        warnings: [],
      };
    },
  },
  {
    id: 'link', label: 'Tie rod (rod ends)', category: 'Joints', model: 'spring',
    blurb: 'A steel rod with a ball rod end at each end: it holds the distance between two points, pulling or pushing, and lets both ends swivel. Carries only along its line; buckles if pushed too hard.',
    params: [
      num('diameter', 'Rod diameter', 0.008, 0.003, 0.05, 'mm', { group: 'Rod', step: 0.5 }),
      num('stud', 'Rod-end stud diameter', 0.008, 0.003, 0.05, 'mm', { group: 'Rod ends', step: 0.5 }),
      num('length', 'Length (0 = as placed)', 0, 0, 5, 'mm', { group: 'Rod' }),
    ],
    derive: ({ params, distance }) => {
      // cold-drawn 1018 steel rod (E 205 GPa, Rm 440 MPa), studs of 4140 as a ball joint's; pinned at both ends
      const d = numberOf(params, 'diameter', 0.008), L = numberOf(params, 'length') > 0 ? numberOf(params, 'length') : Math.max(distance, 0.005);
      const E = 205e9, A = (Math.PI / 4) * d * d, I = (Math.PI * d ** 4) / 64;
      const stud = roundSection(numberOf(params, 'stud', 0.008));
      const studShear = 0.6 * 655 * MPa * stud.A;
      const rod = 440 * MPa * A;
      const euler = (Math.PI ** 2 * E * I) / (L * L);
      const k = (E * A) / L;
      return {
        capacities: { tension: Math.min(rod, studShear), compression: Math.min(rod, studShear, euler), shear: INF, bending: INF, torsion: INF },
        spring: { k, c: 0, rest: L, min: 0, max: L, tensionOnly: false },
        readouts: [
          { label: 'Pull', value: formatForce(Math.min(rod, studShear)), formula: 'min(R_m A, stud shear)' },
          { label: 'Push (buckling)', value: formatForce(Math.min(rod, studShear, euler)), formula: 'π² E I / L²' },
          { label: 'Weight', value: `${fmt(7870 * A * L * 1000, 0)} g` },
        ],
        warnings: euler < rod ? [`Pushed, it buckles at ${formatForce(euler)} before the rod yields: shorter or thicker holds more.`] : [],
      };
    },
  },
  {
    id: 'band', label: 'Resistance band / bungee', category: 'Energy', model: 'band',
    blurb: 'Rubber band: tension only, non-linear (neo-Hookean), snaps when over-stretched.',
    params: [
      num('width', 'Band width', 0.02, 0.002, 0.2, 'mm', { group: 'Band' }),
      num('thickness', 'Band thickness', 0.0015, 0.0002, 0.02, 'mm', { group: 'Band', step: 0.1 }),
      num('shearModulus', 'Rubber shear modulus G', 0.5e6, 0.1e6, 3e6, 'MPa', { group: 'Rubber' }),
      num('breakStretch', 'Stretch at break λ', 6, 1.5, 10, 'x', { group: 'Rubber' }),
      num('length', 'Rest length (0 = as placed)', 0, 0, 10, 'mm', { group: 'Band' }),
    ],
    derive: ({ params, distance }) => {
      const A0 = numberOf(params, 'width') * numberOf(params, 'thickness');
      const G = numberOf(params, 'shearModulus');
      const L = numberOf(params, 'length') > 0 ? numberOf(params, 'length') : Math.max(distance, 0.01);
      const lb = numberOf(params, 'breakStretch');
      const breakForce = G * A0 * (lb - 1 / (lb * lb));
      return {
        capacities: { tension: breakForce * 1.02, compression: INF, shear: INF, bending: INF, torsion: INF },
        spring: { k: (3 * G * A0) / L, c: 0, rest: L, min: 0, max: L * lb, tensionOnly: true, breakStretch: lb, bandG: G, bandArea: A0 },
        readouts: [
          { label: 'Initial stiffness', value: `${fmt((3 * G * A0) / L, 1)} N/m`, formula: '3 G A₀ / L' },
          { label: 'Force at 2× stretch', value: formatForce(G * A0 * (2 - 0.25)), formula: 'F = G A₀ (λ − λ⁻²)' },
          { label: 'Snaps at', value: `${fmt(lb, 1)}× (${formatForce(breakForce)})` },
        ],
        warnings: [],
      };
    },
  },
];

function hazUltimate(m: Material) {
  // Heat-treated aluminium loses its temper next to the weld (AWS D1.2: 6061-T6 as-welded ~165 MPa).
  if (m.category === 'aluminum') return Math.min(m.ultimate, 165 * MPa);
  return m.ultimate;
}

const fillerMatches = (filler: string, a: Material, b: Material | null) => fillersFor(a.weld, (b ?? a).weld).includes(filler);

const kindById = new Map(CONNECTOR_KINDS.map((k) => [k.id, k]));

export function getConnectorKind(id: string): ConnectorKind {
  const k = kindById.get(id);
  if (!k) throw new Error(`Unknown connector kind ${id}`);
  return k;
}

export const hasConnectorKind = (id: string) => kindById.has(id);

/** Joint mechanism of a rigid connector changes if it slipped. */
export const isFriction = (k: ConnectorKind) => k.id === 'bolted';


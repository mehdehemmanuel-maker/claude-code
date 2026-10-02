// Messages between the app and the physics world (in a Web Worker or inline). Plain data only.

import type { Energies } from './energy';
import type { Material } from '../data/materials';
import type { Connection, Part, PartDamage, Pose, SimSettings, Vec3 } from '../doc/types';

export interface EnvironmentBox {
  half: Vec3;
  pose: Pose;
  material: string;
}

export type GrabMode = 'creative' | 'physical';

/**
 * A surface of the user's real room from the headset's scene understanding (WebXR plane / mesh detection),
 * already placed in world coordinates. Planes lie in their pose's local X-Z plane with +Y pointing out of the
 * surface (into the room); meshes are triangle soups in their pose's frame.
 */
export interface RoomSurface {
  id: string;
  kind: 'plane' | 'mesh';
  /** WebXR semantic label (floor, wall, table, couch, global mesh, ...), '' when unknown. */
  label: string;
  pose: Pose;
  /** Plane outline: x, z pairs. */
  polygon?: number[];
  /** Mesh: x, y, z triples and triangle indices. */
  vertices?: number[];
  indices?: number[];
}

/** A place's ground: heights on a square grid, row by row along z then x, spanning −size/2 to size/2 (place.ts). */
export interface TerrainField { n: number; size: number; heights: Float32Array }

export type PhysicsOp =
  | { op: 'environment'; boxes: EnvironmentBox[]; materials: Record<string, Material> }
  /** A place's ground, or none (null). */
  | { op: 'terrain'; field: TerrainField | null; material: Material | null }
  | { op: 'clear' }
  | { op: 'upsertPart'; part: Part; material: Material; keepLivePose: boolean }
  | { op: 'removePart'; id: string }
  | { op: 'upsertConnection'; conn: Connection; materials: Record<string, Material> }
  | { op: 'removeConnection'; id: string }
  | { op: 'sim'; sim: SimSettings }
  | { op: 'setPose'; id: string; pose: Pose; linear?: Vec3; angular?: Vec3 }
  | { op: 'impulse'; id: string; point: Vec3; impulse: Vec3 }
  /** `group`: parts joined to it, moved rigidly with it when it is moved precisely (creative, frozen, build). */
  | { op: 'grab'; hand: string; id: string; mode: GrabMode; target: Pose; strength: number; group?: string[] }
  | { op: 'grabTarget'; hand: string; target: Pose }
  | { op: 'release'; hand: string; linear?: Vec3; angular?: Vec3 }
  | { op: 'controls'; channels: Record<string, number> }
  /** A nervous system's command to its rhythms: each servo's swing, by its connection, scaled (0 holds it at its centre, 1 as built). */
  | { op: 'gait'; amplitude: Record<string, number> }
  | { op: 'damage'; id: string; damage: PartDamage }
  | { op: 'room'; surfaces: RoomSurface[] }
  | { op: 'options'; maxMagnetRings?: number; filterTicks?: number; magnetLatch?: boolean };

export type PhysicsEvent =
  | { type: 'contact'; a: string | null; b: string | null; point: Vec3; normal: Vec3; speed: number; impulse: number }
  | { type: 'break'; conn: string; mode: string; load: number; capacity: number; point: Vec3; note: string }
  | { type: 'slip'; conn: string; point: Vec3; note: string }
  | { type: 'splash'; part: string; point: Vec3; speed: number; size: number }
  | { type: 'fracture'; part: string; bond: number; mode: string; load: number; capacity: number; point: Vec3; note: string; segments: Pose[] }
  | { type: 'yield'; part: string; bond: number; point: Vec3; note: string }
  /** A body's state stopped being a number; it was put back where it last was, at rest (fault containment). */
  | { type: 'fault'; part: string; body: string; note: string }
  /** An intact joint whose two sides have come apart (no real joint does): a defect, for the watchdog. */
  | { type: 'drift'; conn: string; gap: number; point: Vec3; note: string }
  /** A motor's winding ran past what its insulation stands: it has failed open and never runs again. */
  | { type: 'burnout'; conn: string; part: string; temperature: number; point: Vec3; note: string }
  /** A battery went flat under its load (its voltage fell to its maker's end voltage). */
  | { type: 'flat'; part: string; point: Vec3; note: string };

export interface ConnectionLoad {
  id: string;
  /** Utilisation: governing load / capacity (1 = failure). */
  u: number;
  mode: string;
  axial: number;
  shear: number;
  bending: number;
  torsion: number;
  /** Current length for springs/ropes/bands, angle for revolute joints. */
  extent: number;
}

export interface StepResult {
  /** Slot table (body IDs by slot: the part id, or "part#k" for segment k of a breakable part). */
  slots?: (string | null)[];
  slotVersion: number;
  /** Per slot: px py pz qx qy qz qw. */
  transforms: Float32Array;
  /** Per slot: vx vy vz wx wy wz (for throws, checkpoints and audio). */
  velocities: Float32Array;
  events: PhysicsEvent[];
  loads: ConnectionLoad[];
  /** Per breakable part: utilisation of each bond between its segments (-1 = broken). */
  bonds: Record<string, number[]>;
  cure: Record<string, number>;
  stats: {
    stepMs: number; bodies: number; awake: number; substeps: number; magnetPairs: number; ticks: number;
    /** Where the tick's time went, ms, by section. */
    sections?: Record<string, number>;
  };
  /** The energy ledger since the scene began: what is held, the work put in and the heat made, by kind. */
  energy?: Energies;
  /** Heat each part took (J) over the ticks this result covers. */
  heat?: Record<string, number>;
  /** The electrical side: each battery's charge and what it gives, each motor's current and temperatures. */
  power?: PowerState;
}

export interface PowerState {
  /** By battery part: state of charge 0-1, terminal volts, amps given, flat. */
  batteries: Record<string, { soc: number; V: number; I: number; flat: boolean }>;
  /** By motor drive joint: amps (and its controller's limit), winding and housing deg C, output rpm, burnt out, its battery. */
  motors: Record<string, { I: number; limit: number; winding: number; housing: number; rpm: number; burnt: boolean; battery: string | null }>;
}

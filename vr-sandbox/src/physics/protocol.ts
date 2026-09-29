// Messages between the app and the physics world (in a Web Worker or inline). Plain data only.

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

export type PhysicsOp =
  | { op: 'environment'; boxes: EnvironmentBox[]; materials: Record<string, Material> }
  | { op: 'clear' }
  | { op: 'upsertPart'; part: Part; material: Material; keepLivePose: boolean }
  | { op: 'removePart'; id: string }
  | { op: 'upsertConnection'; conn: Connection; materials: Record<string, Material> }
  | { op: 'removeConnection'; id: string }
  | { op: 'sim'; sim: SimSettings }
  | { op: 'setPose'; id: string; pose: Pose; linear?: Vec3; angular?: Vec3 }
  | { op: 'impulse'; id: string; point: Vec3; impulse: Vec3 }
  | { op: 'grab'; hand: string; id: string; mode: GrabMode; target: Pose; strength: number }
  | { op: 'grabTarget'; hand: string; target: Pose }
  | { op: 'release'; hand: string; linear?: Vec3; angular?: Vec3 }
  | { op: 'controls'; channels: Record<string, number> }
  | { op: 'damage'; id: string; damage: PartDamage }
  | { op: 'room'; surfaces: RoomSurface[] }
  | { op: 'options'; maxMagnetRings?: number; filterTicks?: number; magnetLatch?: boolean };

export type PhysicsEvent =
  | { type: 'contact'; a: string | null; b: string | null; point: Vec3; normal: Vec3; speed: number; impulse: number }
  | { type: 'break'; conn: string; mode: string; load: number; capacity: number; point: Vec3; note: string }
  | { type: 'slip'; conn: string; point: Vec3; note: string }
  | { type: 'splash'; part: string; point: Vec3; speed: number; size: number }
  | { type: 'fracture'; part: string; bond: number; mode: string; load: number; capacity: number; point: Vec3; note: string; segments: Pose[] }
  | { type: 'yield'; part: string; bond: number; point: Vec3; note: string };

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
  stats: { stepMs: number; bodies: number; awake: number; substeps: number; magnetPairs: number; ticks: number };
}

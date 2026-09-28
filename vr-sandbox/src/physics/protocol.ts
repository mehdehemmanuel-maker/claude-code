// Messages between the app and the physics world (in a Web Worker or inline). Plain data only.

import type { Material } from '../data/materials';
import type { Connection, Part, Pose, SimSettings, Vec3 } from '../doc/types';

export interface EnvironmentBox {
  half: Vec3;
  pose: Pose;
  material: string;
}

export type GrabMode = 'creative' | 'physical';

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
  | { op: 'options'; maxMagnetRings?: number; filterTicks?: number };

export type PhysicsEvent =
  | { type: 'contact'; a: string | null; b: string | null; point: Vec3; normal: Vec3; speed: number; impulse: number }
  | { type: 'break'; conn: string; mode: string; load: number; capacity: number; point: Vec3; note: string }
  | { type: 'slip'; conn: string; point: Vec3; note: string }
  | { type: 'splash'; part: string; point: Vec3; speed: number; size: number };

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
  /** Slot table (part IDs by slot), sent when it changes. */
  slots?: (string | null)[];
  slotVersion: number;
  /** Per slot: px py pz qx qy qz qw. */
  transforms: Float32Array;
  /** Per slot: vx vy vz wx wy wz (for throws, checkpoints and audio). */
  velocities: Float32Array;
  events: PhysicsEvent[];
  loads: ConnectionLoad[];
  cure: Record<string, number>;
  stats: { stepMs: number; bodies: number; awake: number; substeps: number; magnetPairs: number; ticks: number };
}

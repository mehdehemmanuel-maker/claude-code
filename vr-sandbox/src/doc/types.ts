// The build document: the single source of truth for everything a user designs.
// Runtime systems (physics, rendering, audio) are projections of it.

import type { Material } from '../data/materials';
import type { Params } from '../schema/params';

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

export interface Pose {
  p: Vec3;
  q: Quat;
}

export interface Assembly {
  id: string;
  name: string;
  parent: string | null;
  pose: Pose;
}

export interface Feature {
  id: string;
  kind: 'hole';
  p: Vec3;
  axis: Vec3;
  d: number;
  through: boolean;
}

/** Physical damage of a breakable part: broken bonds between segments and, once damaged, each segment's pose. */
export interface PartDamage {
  broken: number[];
  segments: Pose[] | null;
}

export interface Part {
  id: string;
  kind: string;
  name: string;
  material: string;
  params: Params;
  pose: Pose;
  frozen: boolean;
  assembly: string | null;
  features: Feature[];
  damage: PartDamage;
}

/** One end of a connection: a part and a frame expressed in that part's local space. */
export interface Endpoint {
  part: string;
  frame: Pose;
}

export type ConnectionStatus = 'intact' | 'broken' | 'slipped';

export interface ConnectionState {
  status: ConnectionStatus;
  /** Seconds of cure accumulated (adhesives), at the clock rate chosen in sim settings. */
  cure: number;
  /** Human readable reason for the last state change (e.g. which failure mode tripped). */
  note: string;
}

export interface Connection {
  id: string;
  kind: string;
  a: Endpoint;
  /** Second endpoint; null anchors endpoint `a` to the world at its current placement. */
  b: Endpoint | null;
  params: Params;
  state: ConnectionState;
}

export interface FluidVolume {
  id: string;
  name: string;
  min: Vec3;
  max: Vec3;
  density: number;
}

export interface SimSettings {
  gravity: Vec3;
  airDensity: number;
  airDrag: boolean;
  fluids: FluidVolume[];
  /** Multiplier applied to adhesive cure clocks (1 = real time); 0 means cure instantly. */
  cureClock: number;
  /** Magnetic forces on/off (for debugging, flagged as a non-physical override when off). */
  magnetism: boolean;
}

export interface Meta {
  name: string;
  created: string;
  app: string;
}

export interface BuildDoc {
  format: 'vrsb';
  version: 1;
  catalog: string;
  meta: Meta;
  assemblies: Record<string, Assembly>;
  parts: Record<string, Part>;
  connections: Record<string, Connection>;
  /** Snapshot of every material the build uses, so behaviour never depends on catalog updates. */
  materials: Record<string, Material>;
  sim: SimSettings;
}

export type Collection = 'assemblies' | 'parts' | 'connections' | 'materials';

export const CATALOG_VERSION = '2026.1';
export const APP_VERSION = '0.1.0';

export const IDENTITY_POSE: Pose = { p: [0, 0, 0], q: [0, 0, 0, 1] };

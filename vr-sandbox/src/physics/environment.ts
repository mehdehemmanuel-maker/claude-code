// The workshop: static environment geometry shared by physics and rendering. Not part of saved builds.

import type { FluidVolume } from '../doc/types';
import type { EnvironmentBox } from './protocol';

const I = [0, 0, 0, 1] as [number, number, number, number];

/** Raised test pool: concrete walls, water surface 0.9 m above the floor. */
export const POOL = { x: 9, z: 0, w: 5, d: 5, wall: 0.2, height: 1.1, water: 0.9 };

export function workshopEnvironment(): EnvironmentBox[] {
  const boxes: EnvironmentBox[] = [
    // Floor (top at y = 0).
    { half: [60, 0.5, 60], pose: { p: [0, -0.5, 0], q: I }, material: 'concrete.c30' },
    // Workbench top (birch ply) on a steel frame, back wall side.
    { half: [1.2, 0.02, 0.4], pose: { p: [-3, 0.9, -4], q: I }, material: 'wood.birch-plywood' },
    { half: [1.15, 0.43, 0.35], pose: { p: [-3, 0.45, -4], q: I }, material: 'steel.a36' },
    // Ramp test lane.
    { half: [2, 0.02, 0.6], pose: { p: [-8, 0.55, 3], q: [0, 0, Math.sin(0.14), Math.cos(0.14)] }, material: 'wood.birch-plywood' },
    // Drop tower base plate.
    { half: [0.6, 0.02, 0.6], pose: { p: [4, 0.02, -6], q: I }, material: 'steel.a36' },
  ];
  const { x, z, w, d, wall, height } = POOL;
  boxes.push(
    { half: [w / 2 + wall, height / 2, wall / 2], pose: { p: [x, height / 2, z - d / 2 - wall / 2], q: I }, material: 'concrete.c30' },
    { half: [w / 2 + wall, height / 2, wall / 2], pose: { p: [x, height / 2, z + d / 2 + wall / 2], q: I }, material: 'concrete.c30' },
    { half: [wall / 2, height / 2, d / 2], pose: { p: [x - w / 2 - wall / 2, height / 2, z], q: I }, material: 'concrete.c30' },
    { half: [wall / 2, height / 2, d / 2], pose: { p: [x + w / 2 + wall / 2, height / 2, z], q: I }, material: 'concrete.c30' },
  );
  return boxes;
}

/** In mixed reality the real room is the world; only a floor at the real floor's height, so nothing falls forever. */
export function realFloor(): EnvironmentBox[] {
  return [{ half: [60, 0.5, 60], pose: { p: [0, -0.5, 0], q: I }, material: 'concrete.c30' }];
}

export function poolFluid(): FluidVolume {
  const { x, z, w, d, water } = POOL;
  return { id: 'w_p00100000000', name: 'Test pool (fresh water)', min: [x - w / 2, 0, z - d / 2], max: [x + w / 2, water, z + d / 2], density: 998.2 };
}


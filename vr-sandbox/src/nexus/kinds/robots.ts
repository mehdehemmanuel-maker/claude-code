// Robot arms by their makers' figures: the Meca500 (Mecademic), its R3 and R4 revisions, from its user manual
// (src/nexus/meca.ts holds its figures, its kinematics and its controller).

import { bare, type KindDef, type P } from './core';
import { MECA500 } from '../meca';

const s = (p: P, k: string) => String(p[k]);

export const ROBOT_KINDS: KindDef[] = [
  {
    id: 'robotarm', name: 'six-axis robot arm', path: 'Mechanical/Robots/Robot arms', says: 'a six-jointed arm that puts its tool at any pose in its reach, programmed in its maker\'s commands', std: 'Mecademic\'s Meca500 user and programming manuals',
    axes: [bare('model', 'model', ['Meca500-R3', 'Meca500-R4'])],
    title: (p) => `Mecademic ${s(p, 'model').replace('-', ' ')} six-axis arm`,
    of: () => 'arm-casting*6 joint-drive*6 robot-flange', make: 'assemble', how: 'six anodised aluminium castings, a drive in each joint (its motor, gear and encoder), wired through its hollow joints to its base\'s connectors',
    spec: (p) => `repeatability ${MECA500.repeatability} mm; payload ${MECA500.payload} kg rated; reach ${MECA500.reach} mm at its flange; ${MECA500.mass} kg; joints ${MECA500.limits.map(([a, b], i) => `J${i + 1} ${a}°…${b}°`).join(', ')}; top speeds ${MECA500.speed[s(p, 'model').endsWith('R4') ? 'R4' : 'R3'].join(', ')} °/s; ${MECA500.power}; controlled over Ethernet, port ${MECA500.ports.control} (${MECA500.src})`,
    box: () => [190, 120, 450], g: () => MECA500.mass * 1000, look: 'arm',
  },
];

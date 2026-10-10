// The robot's parts drawn from their makers' figures (src/nexus/robot.ts says what each can do): Inspire Robots'
// RH56DFX hand, ATI's QC-11 changer and Nano17 force sensor (at the hand's index fingertip, where its 12 N suits a
// fingertip's 10 N: between the wrist and a tool it would be overloaded), Intel's D435, Raspberry Pi's Camera Module 3,
// a MEMS microphone and Bosch's BME688. Where a maker gives a size it is used; the rest are estimates, said so in each
// part's own words. Every part is in metres, along +y (the hand's fingers, a changer's stack) unless said.
// Owner of: the robot's hand, changer, force sensor and senses as drawn.

import type { Part } from './kits';

const mm = 0.001, PI = Math.PI;
const P = (name: string, shape: Part['shape'], o: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...o } as Part);
const G = (name: string, parts: Part[], o: Partial<Part> = {}): Part => ({ name, at: [0, 0, 0], parts, ...o } as Part);
const AL = { mat: 'al-6061', color: 0xb9bdc2, finish: 'cast' } as const, DARK = { mat: 'pc', color: 0x2b2e33, finish: 'moulded' } as const;
/** An image sensor as the inventory has it: its die on a ceramic package under its cover glass, w × h mm, facing +z. */
const imager = (nm: string, w: number, h: number, at: [number, number, number]): Part => G(nm, [P(`${nm} package`, { box: [w * mm, h * mm, 0.8 * mm] }, { mat: 'alumina', color: 0x4a3f2c, item: 'ceramic-package', at: [0, 0, 0] }),
  P(`${nm} die`, { box: [w * 0.7 * mm, h * 0.7 * mm, 0.2 * mm] }, { mat: 'silicon', color: 0x2c2f3a, item: 'si-die', at: [0, 0, 0.5 * mm] }), P(`${nm} cover glass`, { box: [w * 0.8 * mm, h * 0.8 * mm, 0.3 * mm] }, { mat: 'glass', color: 0x2a3b44, item: 'cover-glass', at: [0, 0, 0.85 * mm] })], { item: 'image-sensor', at });

/** ATI's Nano17: Ø 17 mm (ATI's page), 14.5 mm tall (an estimate), its body stainless, six silicon gauges inside on its
 *  flexures; along +y from its base. */
export function ftParts(nm = 'ATI Nano17 force/torque sensor'): Part[] {
  const body = P(nm, { cyl: [8.5 * mm, 14.5 * mm] }, { mat: 'stainless-304', color: 0xb8bcc0, finish: 'brushed', item: 'ft-body', at: [0, 7.25 * mm, 0], fill: 0.34 /* to its 9.07 g: its flexures cut away */ });
  const gauges = Array.from({ length: 6 }, (_, i) => P(`${nm} strain gauge ${i + 1}`, { box: [2 * mm, 1 * mm, 0.2 * mm] }, { mat: 'silicon', color: 0x3a3f55, item: 'strain-gauge-si', at: [Math.cos((i * PI) / 3) * 5 * mm, 7 * mm, Math.sin((i * PI) / 3) * 5 * mm], rot: [0, -(i * PI) / 3, 0] }));
  return [body, ...gauges];
}
/** Inspire Robots' RH56DFX: 540 g, six drives (its page); its sizes an adult hand's, as Inspire publish none here (palm
 *  95 × 85 × 32 mm, fingers 17 mm round in two links, an estimate); its palm a dark moulded shell on an aluminium
 *  frame, its fingers aluminium links with dark knuckles; its wrist mount at y 0, its fingers up +y, its palm facing
 *  +z; the index finger's tip a Nano17 (see ftParts) where `ft` is given. */
export function handParts(nm = 'Inspire Robots RH56DFX dexterous hand', ft = false): Part[] {
  const wrist = P(`${nm} wrist mount`, { cyl: [25 * mm, 10 * mm] }, { ...AL, at: [0, 5 * mm, 0] });
  const palm = P(nm, { box: [85 * mm, 95 * mm, 32 * mm] }, { ...DARK, item: 'hand-palm', at: [0, 57.5 * mm, 0], fill: 0.35 });
  // (each drive its motor and screw in a case, and its own small board at its end reading its place and force)
  const servos = Array.from({ length: 6 }, (_, i) => G(`${nm} finger drive ${i + 1}`, [P(`${nm} finger drive ${i + 1} case`, { box: [10 * mm, 36 * mm, 12 * mm] }, { mat: 'steel-alloy', color: 0x55585c, at: [0, 0, 0], fill: 0.6 }),
    P(`${nm} finger drive ${i + 1} board`, { box: [9 * mm, 0.8 * mm, 11 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [0, -18.6 * mm, 0] })], { item: 'linear-servo', at: [(-31 + i * 12.4) * mm, 55 * mm, -4 * mm] }));
  const board = P(`${nm} board`, { box: [70 * mm, 60 * mm, 1.6 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [0, 60 * mm, 12 * mm] });
  const finger = (k: number, x: number, len: [number, number], tip?: Part[]): Part => {
    const [l1, l2] = len, y0 = 105, link = (j: number, y: number, l: number, r: number) => P(`${nm} finger ${k} link ${j}`, { cyl: [r * mm, l * mm] }, { ...AL, at: [0, (y + l / 2) * mm, 0] });
    const knuckle = (j: number, y: number) => P(`${nm} finger ${k} knuckle ${j}`, { cyl: [9 * mm, 18 * mm] }, { ...DARK, at: [0, y * mm, 0], rot: [0, 0, PI / 2] });
    // (a distal link ends rounded, as its moulded tip is)
    return G(`${nm} finger ${k}`, [knuckle(1, y0), link(1, y0, l1, 8.5), knuckle(2, y0 + l1), ...(tip ?? [link(2, y0 + l1, l2, 7.5), P(`${nm} finger ${k} tip`, { sphere: 7.5 * mm }, { ...AL, at: [0, (y0 + l1 + l2) * mm, 0] })])], { item: 'hand-finger', at: [x * mm, 0, 0] });
  };
  // (the index finger's distal link a Nano17 and a pad where it feels: Ø 17, the finger's own width)
  const ftTip = ft ? [G(`${nm} fingertip sensor`, ftParts(), { item: 'ftsensor-nano17', at: [0, 150 * mm, 0] }), P(`${nm} fingertip pad`, { sphere: 8 * mm }, { mat: 'silicone', color: 0x3c3f44, at: [0, 168 * mm, 0] })] : undefined;
  const fingers = [finger(1, -28.5, [45, 35], ftTip), finger(2, -9.5, [48, 38]), finger(3, 9.5, [45, 35]), finger(4, 28.5, [38, 30])];
  // (the thumb from the palm's side, swung out 26° and leaning 29° toward the palm's face as it rests: its two drives,
  // its swing and its curl; the angles estimates)
  const thumb = G(`${nm} thumb`, [P(`${nm} thumb link 1`, { cyl: [9 * mm, 40 * mm] }, { ...AL, at: [0, 20 * mm, 0] }), P(`${nm} thumb knuckle`, { cyl: [9.5 * mm, 19 * mm] }, { ...DARK, at: [0, 40 * mm, 0], rot: [0, 0, PI / 2] }), P(`${nm} thumb link 2`, { cyl: [8.5 * mm, 32 * mm] }, { ...AL, at: [0, 56 * mm, 0] })], { item: 'hand-finger', at: [-44 * mm, 40 * mm, 8 * mm], rot: [0.5, 0, 0.45] });
  return [palm, wrist, ...servos, board, ...fingers, thumb];
}
/** Robotiq's 2F-85, open: its coupling (Ø 75 × 13.9 mm, its electronics inside: Robotiq's manual) and its housing (75 ×
 *  84.9 mm, up to 90 mm off the flange), and on each side its four-bar finger as Robotiq's own model puts it (ros-industrial/robotiq,
 *  BSD): the outer knuckle pivoting 30.6 mm out and 54.9 mm up the housing, the inner knuckle 12.7 mm out and 61.4 mm
 *  up, the outer finger fixed to the outer knuckle, the inner finger pivoting at both and carrying its pad; the pads'
 *  faces 85 mm apart, the whole 162.8 mm tall and 148.6 wide open (its manual). Each link's width and mass are its
 *  model's; its drive a motor and screw in a case (its kind not published: an estimate), its colours typical of its
 *  pictures. Along +y, its fingers opening along x. */
export function gripperParts(nm = 'Robotiq 2F-85 gripper'): Part[] {
  // (its model's frame at the flange's face, as its 162.8 mm to the pads' tops says)
  const blk = { mat: 'al-6061', color: 0x2a2c30, finish: 'anodised' }, cy = 0, cp = 13.9;
  // (a link drawn from one point to another in the fingers' plane (x, y), so many mm thick across it and wide along z)
  const link = (name: string, a: [number, number], b: [number, number], thick: number, wide: number, g: number): Part => {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
    return P(name, { box: [L * mm, thick * mm, wide * mm] }, { ...blk, item: 'finger-link', at: [((a[0] + b[0]) / 2) * mm, ((a[1] + b[1]) / 2) * mm, 0], rot: [0, 0, Math.atan2(dy, dx)], kg: g / 1000 });
  };
  const finger = (sx: number): Part[] => {
    const X = (p: [number, number]): [number, number] => [sx * p[0], p[1] + cy], P1: [number, number] = [30.6011, 54.904], P2: [number, number] = [P1[0] + 31.5, P1[1] - 4.1], P3: [number, number] = [P2[0] + 6.1, P2[1] + 47.1];
    const P4: [number, number] = [12.7, 61.42], P5: [number, number] = [P4[0] + P3[0] - P1[0], P4[1] + P3[1] - P1[1]], pad: [number, number] = [P3[0] - 22.02, P3[1] + 32.42], side = sx < 0 ? 'left' : 'right';
    return [link(`${nm} ${side} outer knuckle`, X(P1), X(P2), 15, 24, 8.53), link(`${nm} ${side} outer finger`, X(P2), X(P3), 12, 27, 22.6), link(`${nm} ${side} inner knuckle`, X(P4), X(P5), 12, 39, 27.1),
      // (the inner finger from its two pivots up behind its pad: its upright, and its tab out to the outer finger's pivot)
      G(`${nm} ${side} inner finger`, [{ ...link(`${nm} ${side} inner finger upright`, X([pad[0] + 8.5, P5[1] - 3]), X([pad[0] + 8.5, pad[1] + 12]), 12, 15, 8.4), item: undefined },
        { ...link(`${nm} ${side} inner finger tab`, X([pad[0] + 14.5, P3[1]]), X(P3), 10, 15, 2), item: undefined }], { item: 'finger-link' }),
      P(`${nm} ${side} pad`, { box: [7 * mm, 37 * mm, 22 * mm] }, { mat: 'silicone', color: 0x4a4d52, item: 'finger-pad', at: [sx * (pad[0] - 0.7) * mm, (pad[1] + cy) * mm, 0] })];
  };
  return [P(nm, { box: [84.9 * mm, (90 - cp) * mm, 75 * mm] }, { ...blk, mat: 'al-a380', item: 'gripper-housing', at: [0, ((90 + cp) / 2) * mm, 0], fill: 0.45 }),
    P(`${nm} coupling`, { cyl: [37.5 * mm, cp * mm] }, { ...blk, item: 'gripper-coupling', at: [0, (cp / 2) * mm, 0], fill: 0.55 }),
    P(`${nm} coupling board`, { cyl: [30 * mm, 1.6 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [0, 7 * mm, 0] }),
    G(`${nm} drive`, [P(`${nm} drive case`, { box: [24 * mm, 50 * mm, 24 * mm] }, { mat: 'steel-alloy', color: 0x55585c, at: [0, 55 * mm, 0], fill: 0.3 }),
      P(`${nm} drive board`, { box: [22 * mm, 0.8 * mm, 22 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [0, 29.5 * mm, 0] })], { item: 'linear-servo' }),
    ...finger(-1), ...finger(1)];
}
/** ATI's QC-11: its master plate and a tool plate stacked 52.4 mm (Universal Robots' certification), 0.245 kg (ATI's
 *  page); 63 mm across to an ISO 50 flange (an estimate); along +y. */
export function changerParts(nm = 'ATI QC-11 robotic tool changer'): Part[] {
  // (their fill set to ATI's 0.163 and 0.0816 kg: hollow round their pistons and air passages)
  return [P(nm, { cyl: [31.5 * mm, 30 * mm] }, { ...AL, color: 0xa9adb1, item: 'changer-master', at: [0, 15 * mm, 0], fill: 0.52 }),
    P(`${nm} tool plate`, { cyl: [31.5 * mm, 22.4 * mm] }, { ...AL, item: 'changer-tool', at: [0, 41.2 * mm, 0], fill: 0.27 }),
    P(`${nm} locking ring`, { cyl: [26 * mm, 2 * mm] }, { mat: 'stainless-440c', color: 0x8e9398, finish: 'ground', at: [0, 30 * mm, 0] })];
}
/** Intel's D435: 90 × 25 × 25 mm (its page), an aluminium case with a black glass face, its two infrared imagers 50 mm
 *  apart (an estimate), its projector between them and its colour camera beside; its face toward +z. */
export function depthCamParts(nm = 'Intel RealSense D435 depth camera'): Part[] {
  const win = (k: string, x: number, r: number, item: string) => [P(`${nm} ${k} lens`, { cyl: [r * mm, 3 * mm] }, { mat: 'glass', color: 0x0d0f12, item, at: [x * mm, 0, 11.5 * mm], rot: [PI / 2, 0, 0] }), imager(`${nm} ${k} imager`, 6, 5, [x * mm, 0, 7.5 * mm])];
  return [P(nm, { box: [90 * mm, 25 * mm, 25 * mm] }, { mat: 'al-6061', color: 0x8b9096, finish: 'brushed', at: [0, 0, 0], fill: 0.35 }),
    P(`${nm} face`, { box: [86 * mm, 21 * mm, 0.8 * mm] }, { mat: 'glass', color: 0x101215, at: [0, 0, 12.6 * mm] }),
    ...win('left infrared', -25, 3.5, 'lens-stack'), ...win('right infrared', 25, 3.5, 'lens-stack'), ...win('colour', 37, 3, 'lens-stack'),
    // (its projector: a VCSEL array on a ceramic package under a diffractive plate, sizes typical of such a module)
    G(`${nm} projector`, [P(`${nm} projector package`, { box: [9 * mm, 7 * mm, 4.5 * mm] }, { mat: 'alumina', color: 0x2a2c30, item: 'ceramic-package', at: [0, 0, -0.75 * mm] }),
      P(`${nm} projector laser die`, { box: [1.5 * mm, 1.5 * mm, 0.2 * mm] }, { mat: 'gaas', color: 0x4a4e5a, item: 'vcsel-die', at: [0, 0, 1.6 * mm] }),
      P(`${nm} projector diffractive plate`, { box: [5 * mm, 5 * mm, 0.7 * mm] }, { mat: 'glass', color: 0x1b1d22, item: 'doe-plate', at: [0, 0, 2.65 * mm] })], { item: 'ir-projector', at: [-6 * mm, 0, 9 * mm] }),
    P(`${nm} board`, { box: [80 * mm, 20 * mm, 1.2 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [0, 0, -4 * mm] })];
}
/** Raspberry Pi's Camera Module 3: its 25 × 24 mm board and 11.5 mm height (its product brief), its lens in a square
 *  housing; its lens toward +z. */
export function camModuleParts(nm = 'Raspberry Pi Camera Module 3'): Part[] {
  return [G(nm, [P(`${nm} board`, { box: [25 * mm, 24 * mm, 1 * mm] }, { mat: 'fr4', color: 0x1c6b3a, item: 'pcb-bare', at: [0, 0, 0] }),
    imager(`${nm} sensor`, 6, 5, [0, 2.5 * mm, 0.9 * mm]),
    P(`${nm} lens housing`, { box: [8.5 * mm, 8.5 * mm, 6.5 * mm] }, { mat: 'pc', color: 0x1a1b1d, at: [0, 2.5 * mm, 5 * mm] }),
    P(`${nm} lens`, { cyl: [3 * mm, 4 * mm] }, { mat: 'pmma', color: 0x0d0f12, item: 'lens-stack', at: [0, 2.5 * mm, 9.5 * mm], rot: [PI / 2, 0, 0] }),
    P(`${nm} focus coil`, { cyl: [3.6 * mm, 1 * mm] }, { mat: 'copper', color: 0xb87333, item: 'winding', at: [0, 2.5 * mm, 3 * mm], rot: [PI / 2, 0, 0] }),
    P(`${nm} focus magnet`, { box: [2 * mm, 2 * mm, 1 * mm] }, { mat: 'ndfeb', color: 0x808488, item: 'magnet-ndfeb', at: [3.8 * mm, 2.5 * mm, 3 * mm] })], { item: 'camera-module' })];
}
/** A small board on the robot's mast carrying its TDK INMP441 microphone (4.72 × 3.76 × 1 mm, its datasheet) and Bosch's BME688
 *  (3 × 3 × 0.93 mm, its datasheet), facing +z. */
export function earNoseParts(nm = 'the robot\'s ear and nose board', ear = true, nose = true): Part[] {
  return [P(nm, { box: [30 * mm, 20 * mm, 1.6 * mm] }, { mat: 'fr4', color: 0x1f5a2a, item: 'pcb-bare', at: [0, 0, 0] }),
    // (its MEMS die beside its packaged amplifier chip: the chip's own die, lead frame, eight bond wires and moulding, as
    // the inventory has a packaged chip; their sizes typical, in its 4.72 × 3.76 mm lid)
    ...(ear ? [G('MEMS microphone', [P('MEMS microphone die', { box: [1.2 * mm, 1.2 * mm, 0.4 * mm] }, { mat: 'silicon', color: 0x3a3f55, item: 'si-die', at: [-0.8 * mm, 0, 0.2 * mm] }),
      G('MEMS microphone amplifier', [P('its lead frame', { box: [1.4 * mm, 1.4 * mm, 0.1 * mm] }, { mat: 'copper', color: 0xb87333, item: 'lead-frame', at: [0, 0, 0] }),
        P('its moulding', { box: [1.4 * mm, 1.4 * mm, 0.5 * mm] }, { mat: 'epoxy', color: 0x1a1b1d, item: 'mould-compound', at: [0, 0, 0.3 * mm] }),
        P('its die', { box: [0.8 * mm, 0.8 * mm, 0.15 * mm] }, { mat: 'silicon', color: 0x3a3f55, item: 'si-die', at: [0, 0, 0.15 * mm] }),
        ...Array.from({ length: 8 }, (_, i) => P(`its bond wire ${i + 1}`, { cyl: [0.0125 * mm, 0.4 * mm] }, { mat: 'gold', color: 0xe6c35c, item: 'bond-wire', at: [(-0.35 + (i % 4) * 0.23) * mm, (i < 4 ? -0.5 : 0.5) * mm, 0.25 * mm], rot: [PI / 2, 0, 0] }))], { item: 'ic-package', at: [0.8 * mm, 0, 0] }),
      P('MEMS microphone lid', { box: [4.72 * mm, 3.76 * mm, 1 * mm] }, { mat: 'nickel', color: 0xc9cdd1, at: [0, 0, 0.5 * mm], fill: 0.12 })], { item: 'microphone-mems', at: [-7 * mm, 0, 1.3 * mm] })] : []),
    ...(nose ? [G('Bosch BME688 gas sensor', bmeParts(), { item: 'gassensor-bme688', at: [7 * mm, 0, 1.3 * mm] })] : [])];
}
/** Bosch's BME688: its 3 × 3 × 0.93 mm 8-pin LGA (its datasheet) with its metal lid, its pressure and humidity die
 *  and its heated gas plate inside (their sizes an estimate); facing +z. */
export function bmeParts(nm = 'Bosch BME688 gas sensor'): Part[] {
  return [P(nm, { box: [3 * mm, 3 * mm, 0.93 * mm] }, { mat: 'alumina', color: 0xb0b4b8, item: 'ceramic-package', at: [0, 0, 0], fill: 0.55 }),
    P(`${nm} sensing die`, { box: [1.2 * mm, 1.2 * mm, 0.3 * mm] }, { mat: 'silicon', color: 0x3a3f55, item: 'si-die', at: [-0.6 * mm, 0, 0.1 * mm] }),
    P(`${nm} gas plate`, { box: [1.0 * mm, 1.0 * mm, 0.3 * mm] }, { mat: 'silicon', color: 0x3a3f55, item: 'si-die', at: [0.7 * mm, 0, 0.1 * mm] })];
}
/** A part rotated so what is drawn along +y points along +z (a changer's stack, a hand's fingers out of a flange). */
export const alongZ = (parts: Part[], name: string, at: [number, number, number] = [0, 0, 0]): Part => G(name, parts, { at, rot: [PI / 2, 0, 0] });

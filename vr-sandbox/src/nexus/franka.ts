// The Franka Research 3: a seven-joint arm with a torque sensor in every joint, by its maker's own figures. Its
// kinematics Franka's table (modified Denavit–Hartenberg, mm: 333 up to its shoulder, 316 to its elbow, the elbow set
// 82.5 out, 384 along its forearm, its wrist 88 out, its flange 107 past it), its joints' limits and each link's mass
// from Franka's own robot description (franka_description, robots/fr3), its payload, reach and the rest from its data
// sheet (v2.6). Each link drawn as its sections, measured across the axis it runs along from that description's
// collision meshes (tools/measure/meshloft.py: src/nexus/models/fr3.ts), in Franka's own link frames, so it turns where
// its joints do; each joint's drive inside the link before it, its torque sensor on the link after it.
// Owner of: the FR3 (its chain, its pose at rest, and its drawing).

import type { Part } from './kits';
import type { Chain } from './dharm';
import { massOf } from './mass';
import { FR3_LINKS, type MeshLoft } from './models/fr3';

const PI = Math.PI;
type V3 = [number, number, number];
export interface FrankaArm extends Chain {
  id: string; name: string;
  /** each link's mass, base first (kg, Franka's description) */ kg: number[];
  /** each joint's torque limit (N·m) and top speed (°/s) */ torque: number[]; speed: number[];
  payload: number; reach: number; mass: number; repeatability: number;
  src: string; leaves: string;
}
export const FR3: FrankaArm = {
  id: 'fr3', name: 'Franka Research 3', mdh: true,
  dh: [{ a: 0, d: 333, alpha: 0 }, { a: 0, d: 0, alpha: -PI / 2 }, { a: 0, d: 316, alpha: PI / 2 }, { a: 82.5, d: 0, alpha: PI / 2 }, { a: -82.5, d: 384, alpha: -PI / 2 }, { a: 0, d: 0, alpha: PI / 2 }, { a: 88, d: 0, alpha: PI / 2 }],
  tip: { a: 0, d: 107, alpha: 0 },
  limits: [[-2.9007, 2.9007], [-1.8361, 1.8361], [-2.9007, 2.9007], [-3.077, -0.1169], [-2.8763, 2.8763], [0.4398, 4.6216], [-3.0508, 3.0508]],
  // (the pose its own examples start from: upper arm forward 45°, elbow bent 135°, wrist square)
  home: [0, -PI / 4, 0, (-3 * PI) / 4, 0, PI / 2, PI / 4],
  kg: [2.3966, 2.9275, 2.9355, 2.2449, 2.6156, 2.3271, 1.817, 0.6271],
  torque: [87, 87, 87, 87, 12, 12, 12], speed: [150, 150, 150, 150, 301, 301, 301],
  payload: 3, reach: 855, mass: 18.3, repeatability: 0.1,
  src: 'Franka Robotics: its kinematics (modified DH: d1 333, d3 316, a4 82.5, a5 −82.5, d5 384, a7 88, flange 107 mm), its joints\' limits and each link\'s mass from its robot description (franka_description, robots/fr3); each link\'s shape measured from that description\'s collision meshes; its payload, reach, torques, speeds, flange and weight from its data sheet (R02212 v2.6)',
  leaves: 'each link\'s outside its collision mesh\'s sections (within a few mm of its covers), its white Franka\'s model\'s; each link\'s casting aluminium (typical: Franka do not publish it), its share of metal set so the link weighs what Franka\'s model gives it; its drives\' and torque sensors\' sizes and places estimates (a frameless motor and strain-wave gear, a strain-gauged flexure), hidden inside its links; its brakes, encoders, joint electronics, cables, its Pilot buttons at its wrist and its base\'s connectors not drawn',
};

const mm = 0.001;
const e = (a: 'x' | 'y' | 'z'): V3 => (a === 'x' ? [1, 0, 0] : a === 'y' ? [0, 1, 0] : [0, 0, 1]);
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/** Euler angles (x, then y, then z: as three.js turns a part) of the turn whose columns are X, Y, Z. */
const eulerOfCols = (X: V3, Y: V3, Z: V3): V3 => {
  const r = (i: number, j: number) => [X, Y, Z][j]![i]!, m13 = Math.max(-1, Math.min(1, r(0, 2)));
  return Math.abs(m13) < 0.9999999 ? [Math.atan2(-r(1, 2), r(2, 2)), Math.asin(m13), Math.atan2(-r(0, 1), r(0, 0))] : [Math.atan2(r(2, 1), r(1, 1)), Math.asin(m13), 0];
};
/** A link's measured body: its sections lofted along the axis they were cut across, turned into its link's frame. */
const loftOf = (L: MeshLoft): { shape: Part['shape']; rot: V3 } => {
  const X = e(L.along), Y = e(L.up);
  return { shape: { loft: { st: L.st.map((s) => ({ x: s.x * mm, w: s.w * mm, lo: s.lo * mm, hi: s.hi * mm, n: s.n, z: s.z * mm })) } }, rot: eulerOfCols(X, Y, cross(X, Y)) };
};

/** The Franka Hand: Franka's two-finger gripper for the FR3, by its page (730 g, 205 × 63 × 127 mm) and resellers'
 *  copies of its data sheet (80 mm stroke, 70 N continuous and 140 N at most, 50 mm/s a finger); its housing's and its
 *  fingers' masses and where its fingers ride (58.4 mm out, 40 mm each way) from Franka's description. */
export const FRANKA_HAND = { kg: 0.6544, finger: 0.0291, stroke: 80, force: [70, 140], speed: 50, mass: 0.73, size: [205, 127, 63] as V3, fingerAt: 58.4, tcp: 103.4 };

/** The Franka Hand drawn in its own frame (z out of the flange it is on, its fingers riding along y), its fingers so
 *  many mm open each (0: closed). Its housing its collision mesh's measured sections; its mounting plate and the plug
 *  that meets the FR3's connector where Franka's visual model has them; each finger the four blocks Franka's
 *  description gives it (its screw mount, its sledge, its slanted finger and its rubber tip). */
export function frankaHandParts(nm = 'Franka Hand', open = 20): Part[] {
  const P = (name: string, shape: Part['shape'], o: Partial<Part>): Part => ({ name, shape, ...o } as Part);
  const B = (name: string, s: V3, at: V3, o: Partial<Part>): Part => P(name, { box: [s[0] * mm, s[1] * mm, s[2] * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });
  const PALE = 0xe6ebed, DARK = 0x404040, H = loftOf(FR3_LINKS.find((l) => l.label === 'hand')!);
  // (its drive and its board inside its housing: estimates, Franka publish neither)
  const inside = [{ ...B(`${nm} drive`, [26, 60, 24], [0, 0, 28], { mat: 'magnet-wire', color: 0x55585c, fill: 0.5, item: 'linear-servo', fixed: 'bolted inside its housing' }), parts: [B(`${nm} drive board`, [20, 30, 1.6], [0, 0, 12.8], { mat: 'fr4', color: 0x2f6b3a, item: 'pcb-bare', fixed: 'on its drive' })] } as Part, B(`${nm} board`, [44, 80, 1.6], [0, 0, 52], { mat: 'fr4', color: 0x2f6b3a, item: 'pcb-bare', fixed: 'screwed inside its housing' })];
  const plate = B(`${nm} mounting plate`, [63, 109.6, 12.6], [0, 0, 3.8], { mat: 'al-6061', color: PALE, finish: 'anodised', item: 'gripper-coupling', fixed: 'bolted to the arm\'s flange' });
  const plug = [B(`${nm} connector plug`, [11.4, 43.3, 11.5], [0, -67.2, -20.2], { mat: 'abs', color: DARK, finish: 'moulded', fixed: 'in the arm\'s end-effector connector' }), B(`${nm} connector plate`, [4, 22.9, 40.9], [0, -92.5, -1.8], { mat: 'abs', color: DARK, finish: 'moulded' })];
  const shell = P(`${nm} housing`, H.shape, { mat: 'pc', color: 0xf3f4f7, finish: 'moulded', rot: H.rot, item: 'gripper-housing' });
  const solid = massOf({ ...shell, fill: 1 }), rest = [...inside, plate, ...plug].reduce((a, b) => a + massOf(b), 0);
  const housing = { ...shell, fill: Math.max(0.05, Math.min(1, (FRANKA_HAND.kg - rest) / solid)) };
  const finger = (side: 1 | -1): Part => {
    const al = { mat: 'al-6061', color: PALE, finish: 'anodised' } as const;
    const body = [B(`${nm} finger screw mount`, [22, 15, 20], [0, 18.5, 11], { ...al, item: 'finger-link' }), B(`${nm} finger sledge`, [22, 8.8, 3.8], [0, 6.8, 2.2], al), B(`${nm} finger`, [17.5, 7, 23.5], [0, 15.9, 28.35], { ...al, rot: [PI / 6, 0, 0] })];
    const pad = B(`${nm} finger tip`, [17.5, 15.2, 18.5], [0, 7.58, 45.25], { mat: 'silicone', color: DARK, finish: 'moulded', item: 'finger-pad' });
    const f = Math.max(0.05, Math.min(1, (FRANKA_HAND.finger - massOf(pad)) / body.reduce((a, b) => a + massOf(b), 0)));
    return { name: `${nm} ${side > 0 ? 'left' : 'right'} finger`, joint: 'slide', fixed: 'sliding along its rail in the housing, the other finger with it', at: [0, side * open * mm, FRANKA_HAND.fingerAt * mm], ...(side < 0 ? { rot: [0, 0, PI] } : {}), parts: [...body.map((b) => ({ ...b, fill: f })), pad] } as Part;
  };
  return [housing, plate, ...plug, ...inside, finger(1), finger(-1)];
}

/** The FR3 drawn at joint angles q (its rest pose if not said), its Franka Hand on its flange (or another tool): its
 *  base, then each joint a group set where Franka's table puts it and turned about its own z by its angle, holding
 *  its link (in Franka's own frame for it, coloured as Franka's model colours it), the line where it meets the link
 *  before, the next joint's drive (fixed in this link) and its own torque sensor; the flange last, and what is on it (in
 *  the flange's frame: z out of it). Drawn z up, turned to stand y up. */
export function fr3Parts(nm = FR3.name, q: number[] = FR3.home!, tool?: Part[]): Part[] {
  const P = (name: string, shape: Part['shape'], o: Partial<Part>): Part => ({ name, shape, ...o } as Part);
  const B = (name: string, s: V3, at: V3, o: Partial<Part>): Part => P(name, { box: [s[0] * mm, s[1] * mm, s[2] * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });
  // (Franka's model's colours: its white (202, 209, 238 by name, white as it shades it), its dark grey (64, 64, 64), its
  // silver (192, 192, 192), its lights' blue)
  const WHITE = 0xf3f4f7, DARK = 0x404040, SILVER = 0xc0c0c0, BLUE = 0x00aeff;
  const along = (z: number, r: number, h: number, o: Partial<Part>): Partial<Part> => ({ at: [0, 0, z * mm], rot: [PI / 2, 0, 0], ...o, shape: { cyl: [r * mm, h * mm] } });
  // (each joint's drive, a frameless motor and strain-wave gear, larger in the four big joints (87 N·m) than the three
  // wrist ones (12 N·m); where along its axis each sits, in the link it is bolted in; each torque sensor's, in the
  // link it turns: estimates, inside each link's measured outside)
  const big = (k: number) => k <= 4;
  const drive = (k: number, z: number): Part => P(`${nm} joint ${k} drive`, undefined, { ...along(z, big(k) ? 34 : 24, big(k) ? 56 : 40, { mat: 'steel-electrical', color: 0x55585c, finish: 'cast', fill: 0.45, item: 'joint-drive', fixed: 'bolted inside its link' }) });
  const sensor = (k: number, z: number): Part => P(`${nm} joint ${k} torque sensor`, undefined, { ...along(z, big(k) ? 30 : 21, big(k) ? 10 : 8, { mat: 'steel-alloy', color: 0x8a8d90, finish: 'machined', fill: 0.5, item: 'joint-torque-sensor', fixed: 'bolted between its drive\'s output and its link' }) });
  const DRIVE_AT = [-223, -60, -160, -55, -290, -70, 0], SENSOR_AT = [-185, 20, -110, 15, -245, 0, 60];
  // (where each link meets the one before, across its joint's axis, and the radius there: its collision mesh's split;
  // the wrist's (joint 6) silver where Franka's model has it)
  const LINE_AT: [number, number, number, number][] = [[-192, 55.5, 3, DARK], [0, 55.5, 3, DARK], [-122, 55.5, 3, DARK], [0, 55.5, 3, DARK], [-259, 55.5, 3, DARK], [-5.5, 47.5, 6, SILVER], [50.4, 44.5, 3, DARK]];
  const casting = (k: number, body: Part[], less: number): Part[] => {
    // (its share of metal: what Franka's model says the link weighs, less what else is in it, over its body solid)
    const solid = body.reduce((s, b) => s + massOf({ ...b, fill: 1 }), 0), fill = Math.max(0.05, Math.min(1, (FR3.kg[k]! - less) / solid));
    return body.map((b) => ({ ...b, fill }));
  };
  const al = { mat: 'al-6061', color: WHITE, finish: 'paint', item: 'arm-casting' } as const;
  // (each link its measured pieces: its white body (and its base's foot), and its dark ones where Franka's model colours
  // it dark: its base's top, its elbow's two end caps, its forearm's strut)
  const linkBody = (k: number): Part[] => {
    if (k < 7) return FR3_LINKS.filter((l) => l.label === `link${k}` || l.label.startsWith(`link${k} `)).map((l) => {
      const L = loftOf(l), part = l.label.slice(`link${k}`.length).trim();
      return P(k === 0 && !part ? nm : `${nm} ${k === 0 ? 'base' : `link ${k}`}${part ? ` ${part}` : ''}`, L.shape, { ...al, ...(part && part !== 'foot' ? { color: DARK } : {}), rot: L.rot, ...(k === 0 ? { fixed: 'bolted to its table through its base' } : {}) });
    });
    // (its last link silver, round to its flange, and the white boss out at 45° from it its end-effector connector
    // sits in: measured from its mesh, out to 88 mm along its diagonal, 74 across and 36 high; the connector's socket
    // at its end an estimate)
    const out = (u: number): V3 => [u * Math.SQRT1_2 * mm, u * Math.SQRT1_2 * mm, 77 * mm];
    return [P(`${nm} link 7`, undefined, { ...al, color: SILVER, finish: 'anodised', ...along(75.2, 44, 49.6, {}) }),
      P(`${nm} link 7 connector boss`, { box: [58 * mm, 74 * mm, 36 * mm] }, { ...al, at: out(59), rot: [0, 0, PI / 4] }),
      P(`${nm} end-effector connector`, { box: [4 * mm, 40 * mm, 20 * mm] }, { mat: 'abs', color: DARK, finish: 'moulded', at: out(89), rot: [0, 0, PI / 4] })];
  };
  // (its base's two light strips, one down each flank, and the silver and black there behind them: where Franka's
  // model has them; what each of those is not drawn apart)
  const baseKit = [1, -1].flatMap((s) => [
    B(`${nm} base light ${s > 0 ? 'left' : 'right'}`, [14, 1.5, 65], [11, s * 75.5, 47], { mat: 'pc', color: BLUE, finish: 'diffused', glow: true }),
    B(`${nm} base panel ${s > 0 ? 'left' : 'right'}`, [56, 1.5, 38], [-46, s * 75.5, 48], { mat: 'al-6061', color: SILVER, finish: 'anodised' }),
    B(`${nm} base panel ${s > 0 ? 'left' : 'right'} inset`, [47, 1, 30], [-45, s * 76.6, 46], { mat: 'abs', color: 0x111111, finish: 'moulded' })]);
  // (its Pilot at its wrist, on the end of its last drum: its light line and its two buttons' marks, where Franka's
  // model has them)
  const pilot = [B(`${nm} Pilot light`, [54, 1.2, 3], [89, 80.6, 0], { mat: 'pc', color: 0x089fff, finish: 'diffused', glow: true }),
    B(`${nm} Pilot mark red`, [3.2, 1, 3.2], [88, 80.4, 25], { mat: 'abs', color: 0xd00000, finish: 'moulded' }),
    B(`${nm} Pilot mark green`, [3.2, 1, 3.2], [88, 80.4, -25], { mat: 'abs', color: 0x20b020, finish: 'moulded' })];
  const hand = tool ?? [{ name: `${nm} Franka Hand`, item: 'robothand-franka-hand', rot: [0, 0, -PI / 4], fixed: 'bolted to its flange, plugged into its connector', parts: frankaHandParts(`${nm} Franka Hand`) } as Part];
  // (the weights each link carries beyond its casting: the next joint's drive bolted in it, its own joint's sensor,
  // and what is fitted to it)
  const drv = [1, 2, 3, 4, 5, 6, 7].map((k) => drive(k, DRIVE_AT[k - 1]!)), sen = [1, 2, 3, 4, 5, 6, 7].map((k) => sensor(k, SENSOR_AT[k - 1]!));
  const flange = P(`${nm} flange`, undefined, { ...along(103.5, 31.5, 7, { mat: 'stainless-304', color: SILVER, finish: 'machined', item: 'robot-flange', fixed: 'its tool bolted to it (DIN ISO 9409-1-A50: four M6 on a 50 mm circle)' }) });
  const fitted: Part[][] = [baseKit, [], [], [], [], [], pilot, [linkBody(7)[2]!, flange]];
  const less = (k: number) => (k < 7 ? massOf(drv[k]!) : 0) + (k > 0 ? massOf(sen[k - 1]!) : 0) + fitted[k]!.reduce((a, b) => a + massOf(b), 0);
  // (inward from the flange: each joint's group holding its link and all past it)
  let inner: Part[] = [flange, { name: `${nm} flange frame`, at: [0, 0, FR3.tip!.d * mm], parts: hand } as Part];
  for (let k = 7; k >= 1; k--) {
    const j = FR3.dh[k - 1]!, [lz, lr, lh, lc] = LINE_AT[k - 1]!, body = linkBody(k);
    const cast = k === 7 ? 2 : body.length, link: Part[] = [...casting(k, body.slice(0, cast), less(k)), ...body.slice(cast), ...(k === 6 ? pilot : []), P(`${nm} joint ${k} line`, undefined, { ...along(lz, lr, lh, { mat: lc === SILVER ? 'al-6061' : 'abs', color: lc, finish: lc === SILVER ? 'anodised' : 'moulded', fill: 0.15 }) }), sen[k - 1]!];
    const turning: Part = { name: `${nm} joint ${k}`, joint: 'bearing', fixed: `turning about its axis (joint ${k})`, ...(q[k - 1] ? { rot: [0, 0, q[k - 1]!] } : {}), parts: [...link, ...inner] } as Part;
    // (where Franka's table sets the joint, in the frame before: a along x, turned α about it, d along the new z; its
    // drive fixed there, in the link before, round its axis)
    inner = [{ name: `${nm} frame ${k}`, at: [j.a * mm, -Math.sin(j.alpha) * j.d * mm, Math.cos(j.alpha) * j.d * mm], ...(j.alpha ? { rot: [j.alpha, 0, 0] } : {}), parts: [drv[k - 1]!, turning] } as Part];
  }
  const base = [...casting(0, linkBody(0), less(0)), ...baseKit];
  return [{ name: `${nm} standing`, rot: [-PI / 2, 0, 0], parts: [...base, ...inner] } as Part];
}

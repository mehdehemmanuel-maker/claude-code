// The Meta Quest 3 by its maker's published figures and what its teardowns show, and what a headset's optics come to as
// numbers: how many pixels fall on a degree of what you see, how big a pixel is at arm's length, how much of the frame
// budget a frame has at a refresh rate, and whether a face's interpupillary distance is one the headset can be set to.
// Drawn whole from the library's parts: its visor, its two pancake lens stacks over their LCDs, its board, its battery,
// its cameras and depth sensor, its facial interface and strap, and a Touch Plus controller.
// Owner of: the Quest 3 (its figures, its optics arithmetic and its drawing).

import type { Part } from '../parts/kits';

type V3 = [number, number, number];
const PI = Math.PI, mm = 0.001;

/** The Quest 3, by Meta's figures and what its teardowns found. Sizes are mm; its box is wide × high × deep. */
export const QUEST3 = {
  id: 'Quest-3', name: 'Meta Quest 3',
  /** per eye */ pixels: [2064, 2208] as [number, number],
  /** degrees, across and up */ fov: [110, 96] as [number, number],
  hz: [72, 90, 120], ipd: [53, 75] as [number, number], ram: 8, storage: [128, 512],
  chip: 'Snapdragon XR2 Gen 2 (4 nm)', lens: 'pancake',
  /** its cameras: two colour for passthrough, four monochrome for tracking, and its depth sensor */
  cameras: { colour: 2, mono: 4, depth: 1 },
  wh: 19.44, hours: 2.2, chargeW: 18, size: [184, 160, 98] as V3, kg: 0.515,
  controller: { name: 'Touch Plus', size: [126, 67, 43] as V3, kg: 0.126, cell: 'AA' },
  src: 'Meta\'s figures as its spec sheets and reviewers\' round-ups give them: two LCDs at 2,064 × 2,208 an eye through pancake lenses, 110° across by 96° up, 72–120 Hz, a Snapdragon XR2 Gen 2 (4 nm) with 8 GB and 128 or 512 GB, a continuous 53–75 mm IPD with depth adjustment, colour passthrough with depth sensing, 184 × 160 × 98 mm over its facial interface at its shortest strap, about 515 g, about 2.2 h on a charge and about 2 h to charge at 18 W; its 19.44 Wh battery from iFixit\'s teardown (as Tom\'s Guide reports it); its Touch Plus controllers 126 × 67 × 43 mm and 126 g each with their AA cell',
  leaves: 'its outside, its optics and its chip Meta\'s; where each part sits inside, and each part\'s own size, typical of such a headset (estimates) — its lens stacks drawn as two elements and a quarter-wave film each, not the real pancake prescription, which Meta do not publish; its board drawn as one, its antennas, haptics, eye relief mechanism and cabling not drawn apart',
  hazard: 'a headset covers the eyes: it is used in a space cleared of what can be hit or tripped over, and its passthrough is an aid, not sight. Its lenses focus sunlight and are ruined (and can start a fire) if it is left where the sun falls on them. Meta ask that it is not used by under-10s, and that a break is taken when it is uncomfortable',
};

// ---- what its optics come to ----------------------------------------------------------------------------------

/** Pixels per degree: its pixels across over its field across, and the same up. A sharper headset has more. */
export const pixelsPerDegree = (h = QUEST3): [number, number] => [h.pixels[0] / h.fov[0], h.pixels[1] / h.fov[1]];
/** How wide a pixel is on a thing so far away (mm): the angle a pixel covers, times the distance. */
export const pixelAt = (mmAway: number, h = QUEST3): number => (mmAway * (h.fov[0] / h.pixels[0]) * PI) / 180;
/** How long a frame has at a refresh rate (ms), and what a rate the headset does not run refuses. */
export function frameBudget(hz: number, h = QUEST3): { ms: number; refused: string[] } {
  return { ms: 1000 / hz, refused: h.hz.includes(hz) ? [] : [`${hz} Hz is not one of the ${h.name}'s ${h.hz.join(', ')} Hz`] };
}
/** Whether a face's interpupillary distance is one the headset can be set to, and what it is set to if not. */
export function fitsIpd(mmApart: number, h = QUEST3): { ok: boolean; set: number; says: string } {
  const set = Math.max(h.ipd[0], Math.min(h.ipd[1], mmApart));
  return { ok: set === mmApart, set, says: set === mmApart ? `set to ${mmApart} mm` : `${mmApart} mm is outside the ${h.name}'s ${h.ipd[0]}–${h.ipd[1]} mm: set to ${set} mm, and what is seen will not line up` };
}
/** What the headset draws in an hour at a refresh rate: its frames, and the share of its battery an hour takes. */
export const runtime = (h = QUEST3): { frames: number; sharePerHour: number } => ({ frames: Math.max(...h.hz) * 3600, sharePerHour: 1 / h.hours });

// ---- drawn ----------------------------------------------------------------------------------------------------

const P = (name: string, shape: Part['shape'], o: Partial<Part> = {}): Part => ({ name, shape, at: [0, 0, 0], ...o } as Part);
const B = (name: string, s: V3, at: V3, o: Partial<Part> = {}): Part => P(name, { box: [s[0] * mm, s[1] * mm, s[2] * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });
const CYL = (name: string, r: number, h: number, at: V3, o: Partial<Part> = {}): Part => P(name, { cyl: [r * mm, h * mm] }, { at: [at[0] * mm, at[1] * mm, at[2] * mm], ...o });
const grp = (name: string, item: string, parts: Part[], o: Partial<Part> = {}): Part => ({ name, item, at: [0, 0, 0], parts, ...o } as Part);

/** The Quest 3 drawn, its visor facing +z: its moulded front, the camera and sensor pods across it, the two lens
 *  stacks over their LCDs on the IPD slide, the board and battery behind them, the facial interface against the face
 *  and the strap round the head; its controller beside it where one is asked for. */
export function quest3Parts(nm = QUEST3.name, massOf: (p: Part) => number = () => 0): Part[] {
  const [W, H] = QUEST3.size, visorD = 42, DARK = 0x2a2d31;
  const shellOf = { mat: 'pc', color: 0xd9dade, finish: 'moulded' } as const;
  // (its visor: a slab rounded at its corners, its bottom edge cut up in the middle for the nose, drawn through its
  // depth; the optics and the board sit behind it)
  const round = (w: number, h: number, r: number, nose: number): [number, number][] => {
    const pts: [number, number][] = [], arc = (cx: number, cy: number, a0: number, a1: number) => { for (let i = 0; i <= 5; i++) { const a = a0 + ((a1 - a0) * i) / 5; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
    arc(w / 2 - r, h / 2 - r, 0, PI / 2); arc(-w / 2 + r, h / 2 - r, PI / 2, PI); arc(-w / 2 + r, -h / 2 + r, PI, (3 * PI) / 2);
    // (the nose: the bottom edge rising to the middle and down again)
    pts.push([-34, -h / 2], [-16, -h / 2 + nose * 0.55], [0, -h / 2 + nose], [16, -h / 2 + nose * 0.55], [34, -h / 2]);
    arc(w / 2 - r, -h / 2 + r, (3 * PI) / 2, 2 * PI);
    return pts;
  };
  const visor = P(`${nm} visor`, { prism: { pts: round(W, 92, 22, 26).map(([x, y]) => [x * mm, y * mm] as [number, number]), L: visorD * mm } }, { ...shellOf, fill: 0.3, at: [0, (H - 56) * mm, 10 * mm], fixed: 'its halves clipped and screwed together' });
  // (the three pods its cameras and depth sensor look out of, where its own face shows them: two outer pairs and a
  // middle one; each pod's own glass over it)
  const front = 10 + visorD / 2;
  const pod = (x: number, _z: number, nmx: string, parts: Part[]): Part => grp(`${nm} ${nmx} pod`, 'headset-pod', [
    CYL(`${nm} ${nmx} pod`, 15, 7, [x, H - 46, front - 2], { mat: 'pc', color: DARK, finish: 'polished', rot: [PI / 2, 0, 0] }), ...parts]);
  const cam = (x: number, y: number, z: number, what: string) => ({ ...CYL(`${nm} ${what} camera`, 5, 7, [x, y, z], { mat: 'abs', color: 0x101114, finish: 'moulded', item: 'headset-camera', rot: [PI / 2, 0, 0] }) });
  const pods = [
    pod(-W / 2 + 28, 0, 'left outer', [cam(-W / 2 + 28, H - 46, front - 1, 'tracking')]),
    pod(W / 2 - 28, 0, 'right outer', [cam(W / 2 - 28, H - 46, front - 1, 'tracking')]),
    pod(0, 0, 'middle', [cam(-9, H - 46, front - 1, 'colour'), cam(9, H - 46, front - 1, 'colour'),
      CYL(`${nm} depth sensor`, 5, 8, [0, H - 46, front - 1], { mat: 'abs', color: 0x14161a, finish: 'moulded', item: 'depth-sensor', rot: [PI / 2, 0, 0], says: 'it throws a pattern of infrared and reads it back, so passthrough knows how far away a thing is' })]),
    ...[-1, 1].map((sg) => grp(`${nm} ${sg > 0 ? 'right' : 'left'} lower pod`, 'headset-pod', [CYL(`${nm} ${sg > 0 ? 'right' : 'left'} lower pod`, 13, 7, [sg * (W / 2 - 36), H - 84, front - 2], { mat: 'pc', color: DARK, finish: 'polished', rot: [PI / 2, 0, 0] }),
      cam(sg * (W / 2 - 36), H - 84, front - 1, 'tracking')])),
  ];
  // (an eye's optics: a pancake stack of two elements with the film between them, over its LCD; both on the slide the
  // IPD wheel moves, 53–75 mm apart)
  const eye = (sg: 1 | -1): Part => {
    const x = sg * 32;
    return grp(`${nm} ${sg > 0 ? 'right' : 'left'} optic`, 'headset-optic', [
      CYL(`${nm} ${sg > 0 ? 'right' : 'left'} pancake lens`, 22, 5, [x, H - 56, visorD / 2 - 12], { mat: 'pmma', color: 0xe8eef4, finish: 'polished', item: 'lens-pancake', rot: [PI / 2, 0, 0] }),
      CYL(`${nm} ${sg > 0 ? 'right' : 'left'} pancake mirror`, 22, 3, [x, H - 56, visorD / 2 - 20], { mat: 'pmma', color: 0xc8d4de, finish: 'polished', rot: [PI / 2, 0, 0], says: 'its half-mirrored face: the light goes round inside the stack before it leaves, which is what makes it short' }),
      CYL(`${nm} ${sg > 0 ? 'right' : 'left'} wave film`, 21, 0.3, [x, H - 56, visorD / 2 - 16], { mat: 'pet', color: 0xdfe5ea, finish: 'polished', says: 'the quarter-wave film that turns the light\'s polarisation, so it leaves the stack at the third pass' }),
      B(`${nm} ${sg > 0 ? 'right' : 'left'} display`, [40, 43, 2], [x, H - 56, visorD / 2 - 28], { mat: 'glass', color: 0x14181d, finish: 'polished', item: 'headset-display', glow: true, says: `${QUEST3.pixels[0]} × ${QUEST3.pixels[1]} pixels` }),
      B(`${nm} ${sg > 0 ? 'right' : 'left'} display board`, [42, 46, 1.2], [x, H - 56, visorD / 2 - 31], { mat: 'fr4', color: 0x1f3a5c, item: 'pcb-bare' }),
    ], { joint: 'slide', fixed: `on the IPD slide, ${QUEST3.ipd[0]}–${QUEST3.ipd[1]} mm apart, and in and out for eye relief` });
  };
  const ipdWheel = CYL(`${nm} IPD wheel`, 11, 7, [0, H - 96, visorD / 2 - 6], { mat: 'abs', color: DARK, finish: 'moulded', joint: 'bearing', fixed: 'turned to move both optics together' });
  const board = B(`${nm} board`, [W - 56, 54, 2], [0, H - 58, -6], { mat: 'fr4', color: 0x1f3a5c, item: 'pcb-bare', fixed: 'on standoffs behind the optics' });
  const soc = B(`${nm} processor`, [14, 14, 1.4], [0, H - 58, -8], { mat: 'epoxy', color: 0x1a1c20, finish: 'moulded', says: QUEST3.chip });
  const shield = B(`${nm} shield can`, [60, 34, 2], [0, H - 58, -9.5], { mat: 'steel-low', color: 0xb0b4b8, finish: 'brushed', shell: 0.2 * mm });
  // (its battery in the visor, where its teardown found it: a pair of pouch cells of 19.44 Wh between them)
  const battery = grp(`${nm} battery`, 'headset-battery', [...[-1, 1].map((sg) => B(`${nm} cell`, [62, 44, 5], [sg * 36, H - 58, -16], { mat: 'al-laminate', color: 0x3a3f47, finish: 'laminate', fill: 1, says: 'its stack and electrolyte in an aluminium-laminate pouch' }))],
    { fixed: 'taped into the visor behind its board', says: `${QUEST3.wh} Wh between them` });
  const sound = [-1, 1].map((sg) => grp(`${nm} ${sg > 0 ? 'right' : 'left'} speaker`, 'headset-speaker', [B(`${nm} ${sg > 0 ? 'right' : 'left'} speaker`, [22, 12, 10], [sg * (W / 2 - 16), H - 96, -2], { mat: 'abs', color: DARK, finish: 'moulded' })], { fixed: 'in the strap arm, firing down at the ear' }));
  const usb = B(`${nm} USB-C socket`, [9, 3.5, 7], [W / 2 - 42, H - 104, 0], { mat: 'steel-low', color: 0xb0b4b8, finish: 'brushed', fixed: 'in the underside of the visor' });
  const buttons = [B(`${nm} power button`, [10, 4, 4], [-W / 2 + 18, H - 100, 4], { mat: 'abs', color: DARK, finish: 'moulded' }),
    B(`${nm} volume rocker`, [24, 4, 4], [W / 2 - 22, H - 104, 4], { mat: 'abs', color: DARK, finish: 'moulded' })];
  // (its facial interface: the moulded carrier and the foam on it, against the face; it clips off to be washed)
  const face = grp(`${nm} facial interface`, 'facial-interface', [
    B(`${nm} facial interface`, [W - 20, 86, 18], [0, H - 58, -visorD / 2 - 2], { mat: 'rubber', color: 0x24272b, finish: 'moulded', shell: 2 * mm }),
    B(`${nm} face foam`, [W - 26, 82, 14], [0, H - 58, -visorD / 2 - 16], { mat: 'pu', color: 0x1f2226, finish: 'texture', fill: 0.05, says: 'polyurethane blown with air: about 60 kg/m³, a twentieth of the polymer\'s own density' })], { fixed: 'clipped onto the visor; it pulls off to be washed' });
  // (its strap: two arms round the temples to a band behind the head, the cloth top strap over it)
  const strap = grp(`${nm} strap`, 'head-strap', [
    ...[-1, 1].map((sg) => B(`${nm} ${sg > 0 ? 'right' : 'left'} strap arm`, [9, 22, 104], [sg * (W / 2 - 5), H - 72, -62], { mat: 'pc', color: 0xd9dade, finish: 'moulded', rot: [0.1, 0, 0], joint: 'hinge', fixed: 'hinged at the visor so it swings up out of the way' })),
    B(`${nm} back band`, [W - 36, 30, 10], [0, H - 78, -116], { mat: 'nylon', color: 0x24272b, finish: 'texture', fill: 0.5, says: 'the cloth band behind the head, its slider pulled to tighten it' }),
    ...[-1, 1].map((sg) => B(`${nm} ${sg > 0 ? 'right' : 'left'} band joint`, [12, 24, 22], [sg * (W / 2 - 16), H - 76, -104], { mat: 'pc', color: 0xd9dade, finish: 'moulded' })),
    B(`${nm} top strap`, [30, 84, 6], [0, H - 30, -72], { mat: 'nylon', color: 0x24272b, finish: 'texture', fill: 0.5, rot: [1.15, 0, 0], says: 'over the top of the head, so the weight is off the face' })], { fixed: 'the arms hinged on the visor, the band round the back of the head' });
  const inner = [...pods, eye(1), eye(-1), ipdWheel, board, soc, shield, battery, ...sound, usb, ...buttons, face, strap];
  // (what its shell weighs is what is left of Meta's 515 g once what is in it is counted)
  const solid = massOf({ ...visor, fill: 1 }), left = QUEST3.kg - inner.reduce((a, b) => a + massOf(b), 0);
  const shell = { ...visor, fill: Math.max(0.03, Math.min(1, left / solid)) };
  return [{ name: nm, at: [0, 0, 0], parts: [shell, ...inner] } as Part];
}

/** A Touch Plus controller: its moulded body and grip, its thumbstick, its four face buttons, its trigger and grip
 *  button, its board and its single AA cell. Its ring is gone: the headset's own cameras see it, helped by the
 *  infrared LEDs under its shell. */
export function touchParts(nm = `${QUEST3.name} Touch Plus controller`, massOf: (p: Part) => number = () => 0): Part[] {
  // (it stands on its grip: its 126 mm up the page, its 67 across and its 43 through. Its head is a group tipped back
  // the way it is held, so what is on it — the stick, the buttons, the board and the LEDs — sits on its faces)
  const DARK = 0x2a2d31;
  const shellOf = { mat: 'abs', color: 0xd9dade, finish: 'moulded' } as const;
  const headShell = B(`${nm} body`, [62, 30, 56], [0, 0, 0], { ...shellOf, shell: 1.8 * mm, fixed: 'its halves screwed and clipped together' });
  const inHead: Part[] = [
    grp(`${nm} thumbstick`, 'thumbstick', [CYL(`${nm} thumbstick`, 9, 13, [0, 20, 12], { mat: 'rubber', color: DARK, finish: 'texture' })], { joint: 'bearing', fixed: 'on its gimbal, pushed any way and clicked down' }),
    ...[[-15], [15]].map(([x], k) => CYL(`${nm} ${k ? 'B' : 'A'} button`, 7, 5, [x!, 17, -14], { mat: 'abs', color: 0xe6e8ea, finish: 'moulded' })),
    CYL(`${nm} menu button`, 4.5, 4, [-24, 16, 2], { mat: 'abs', color: 0xe6e8ea, finish: 'moulded' }),
    B(`${nm} board`, [48, 1.2, 42], [0, -4, 0], { mat: 'fr4', color: 0x1f3a5c, item: 'pcb-bare' }),
    B(`${nm} haptic motor`, [10, 4, 10], [0, -9, -12], { mat: 'steel-low', color: 0x6b6e72, finish: 'machined', item: 'vibration-motor' }),
    // (the infrared LEDs the headset's cameras pick it out by, round the head's edge under its shell)
    ...Array.from({ length: 8 }, (_, k) => { const a = (k / 8) * 2 * PI; return CYL(`${nm} tracking LED`, 2.6, 3, [Math.cos(a) * 26, 11, Math.sin(a) * 22], { mat: 'epoxy-clear', color: 0x5a2222, finish: 'moulded', says: 'under the shell, which passes the infrared it gives out though it looks white' }); }),
  ];
  const head = { name: `${nm} head`, at: [0, 96 * mm, 2 * mm] as V3, rot: [-0.42, 0, 0] as V3, parts: [headShell, ...inHead] } as Part;
  const grip = P(`${nm} grip`, { cyl: [17.5 * mm, 94 * mm, 13 * mm] }, { ...shellOf, shell: 1.8 * mm, at: [0, 48 * mm, -14 * mm], rot: [0.26, 0, 0], fixed: 'moulded with the body' });
  const rest: Part[] = [grip,
    B(`${nm} trigger`, [20, 26, 10], [0, 76, 22], { mat: 'abs', color: 0xe6e8ea, finish: 'moulded', joint: 'hinge', fixed: 'pivoted where the head meets the grip, under the index finger', rot: [-0.5, 0, 0] }),
    B(`${nm} grip button`, [9, 32, 12], [0, 60, -30], { mat: 'abs', color: 0xe6e8ea, finish: 'moulded', joint: 'hinge', fixed: 'pressed by the middle finger', rot: [0.26, 0, 0] }),
    P(`${nm} AA cell`, { cyl: [7.25 * mm, 50.5 * mm] }, { mat: 'mno2', color: 0x2a2d31, finish: 'laminate', item: 'cell-aa', at: [0, 42 * mm, -14 * mm], rot: [0.26, 0, 0], fixed: 'under the door in the grip' }),
    B(`${nm} battery door`, [26, 44, 3], [0, 38, -29], { ...shellOf, rot: [0.26, 0, 0], fixed: 'slid off the grip to change the cell' }),
  ];
  const inner = [head, ...rest];
  const solid = massOf({ ...headShell, shell: undefined, fill: 1 }), left = QUEST3.controller.kg - inner.reduce((a, b) => a + massOf(b), 0) + massOf(headShell);
  const shell = left > massOf(headShell) ? { ...headShell, shell: undefined, fill: Math.max(0.03, Math.min(1, left / solid)) } : headShell;
  return [{ name: nm, at: [0, 0, 0], parts: [{ ...head, parts: [shell, ...inHead] }, ...rest] } as Part];
}

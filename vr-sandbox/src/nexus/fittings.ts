// A vehicle's fittings drawn whole: each a real sub-assembly down to the pieces it is made of, each piece tagged with its
// inventory item (so `missingIn` and `explodeAudit` in components.ts hold it to its recipe) and fastened by the
// library's own bolts, nuts and washers. A headlamp is a housing, a reflector, a lens, an LED board and the screws that
// hold it; a fuel tank is a rolled shell, two pressed ends, baffles, a filler neck and cap, on two brackets bolted
// through its frame rail, held by two straps on rubber liners; a fifth wheel is a cast top plate with its throat, a forged
// jaw, a release handle, two brackets on pins, on angles bolted to the rails. Nothing here stands for something it is not:
// taken apart, each comes apart into what a mechanic would lay out on the floor.
//
// Its frame is the machine's: x forward, y up, z to the right. Sizes are each machine's published figures where they are
// published (its length, width, height, frame, tyres), and typical of a North American highway tractor where not (said
// at each). A truck's body is built from `TruckBody`, worked out from its figures by machines.ts.

import { boltedJoint, starterBattery, use } from './components';
import { boundsOfAll, partOf } from './assembly';
import * as THREE from 'three';
import type { Part, V3 } from './kits';
import { patchPoints } from './surface';

const PI = Math.PI, mm = 1e-3;
const P = (name: string, shape: Part['shape'] | undefined, at: V3, more: Partial<Part> = {}): Part => ({ name, ...(shape ? { shape } : {}), at, ...more });
const box = (name: string, s: V3, at: V3, more: Partial<Part> = {}) => P(name, { box: s }, at, more);
const group = (name: string, item: string, at: V3, parts: Part[], more: Partial<Part> = {}): Part => P(name, undefined, at, { item, parts, ...more });
/** A bolted joint through so much grip, its bolt's axis along `axis` (its head on the + side). */
const through = (thread: string, grip: number, at: V3, axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z' = 'y', name?: string): Part => {
  const rot: Record<string, V3> = { y: [0, 0, 0], '-y': [PI, 0, 0], x: [0, 0, -PI / 2], '-x': [0, 0, PI / 2], z: [PI / 2, 0, 0], '-z': [-PI / 2, 0, 0] };
  return { ...boltedJoint(thread, Math.round(grip / mm), name ? { name } : {}), at, rot: rot[axis] };
};
/** A screw into a tapped hole or a clip nut, its axis along `axis`. */
const screw = (words: string, at: V3, axis: 'x' | 'y' | 'z' | '-x' | '-y' | '-z' = 'y'): Part => {
  const rot: Record<string, V3> = { y: [0, 0, 0], '-y': [PI, 0, 0], x: [0, 0, -PI / 2], '-x': [0, 0, PI / 2], z: [PI / 2, 0, 0], '-z': [-PI / 2, 0, 0] };
  return use(words, at, { rot: rot[axis] });
};

// ---- lamps and mirrors ----------------------------------------------------------------------------------------------------
/** A lamp: its moulded housing, a vacuum-metallised reflector in it, an LED board at the reflector's focus, a hard-coated
 *  polycarbonate lens over it, held by screws through the housing's three ears. Its lens faces +x. */
export function lamp(name: string, w: number, h: number, d: number, at: V3, rot: V3 = [0, 0, 0], o: { lens?: number; item?: 'trk-headlamp' | 'trk-marker-lamp' } = {}): Part {
  const item = o.item ?? 'trk-headlamp', head = item === 'trk-headlamp', parts: Part[] = [
    box('lamp housing', [d, h, w], [-0.003, 0, 0], { item: 'trk-lamp-housing', mat: 'pc', color: 0x1a1b1e, shell: 0.0025, finish: 'texture' }),
    box('lamp lens', [0.004, h * 0.92, w * 0.94], [d / 2, 0, 0], { item: 'trk-lamp-lens', mat: 'pc', color: o.lens ?? 0xdfe9f2, finish: 'satin', says: 'hard-coated polycarbonate' }),
  ];
  if (head) parts.push(P('lamp reflector', { lathe: [[0.005, -d * 0.4], [Math.min(w, h) * 0.42, d * 0.3], [Math.min(w, h) * 0.44, d * 0.3]] }, [0, 0, 0], { rot: [0, 0, -PI / 2], item: 'trk-reflector', mat: 'pc', color: 0xd9dde2, finish: 'chrome', says: 'moulded, vacuum-metallised' }),
    group('LED board', 'trk-led-board', [-d * 0.2, 0, 0], [box('LED board circuit', [0.0016, h * 0.3, w * 0.3], [0, 0, 0], { item: 'pcb-bare', mat: 'fr4', color: 0x1f5a2e }), ...Array.from({ length: 6 }, (_, i) => use('led white 5mm', [0.002, (i % 2 - 0.5) * h * 0.12, (Math.floor(i / 2) - 1) * w * 0.08], { rot: [0, 0, -PI / 2], glow: true }))]),
    ...[[0, h / 2 + 0.008, w / 2 - 0.02], [0, h / 2 + 0.008, -w / 2 + 0.02], [0, -h / 2 - 0.008, 0]].map((q) => screw('bolt M6x20', q as V3, '-x')));
  else parts.push(...[-1, 1].map((s) => use('led yellow 5mm', [0, 0, s * w * 0.2], { rot: [0, 0, -PI / 2], glow: true })));
  return group(name, item, at, parts, { rot, ...(head ? { light: { lm: 2200, color: 0xfff4e0 } } : {}), says: head ? 'a headlamp: housing, reflector, LED board, lens, three M6 screws' : 'an amber marker lamp (FMVSS 108: three identification lamps and two clearance lamps on a vehicle over 80 in wide)' });
}
/** A west-coast mirror on a cab's door: two bent steel arms from cast brackets on the door to a moulded head holding its
 *  glass, each bracket held by two M8 screws. Out to side `s`. */
export function mirror(name: string, s: number, x: number, y0: number, y1: number, z0: number): Part {
  const out = 0.3, zH = z0 + s * out, yH = (y0 + y1) / 2, arm = (yy: number, k: string): Part => P(`mirror arm (${k})`, { tube: { r: 0.0125, pts: [[x, yy, z0 + s * 0.02], [x, yy, zH - s * 0.06], [x, yH + (yy < yH ? -0.16 : 0.16), zH]], wall: 0.0015, bend: 0.04 } }, [0, 0, 0], { item: 'trk-mirror-arm', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' });
  return group(name, 'trk-mirror', [0, 0, 0], [
    arm(y0, 'lower'), arm(y1, 'upper'),
    box('mirror head', [0.07, 0.38, 0.2], [x, yH, zH], { item: 'trk-mirror-head', mat: 'abs', color: 0x1a1b1e, shell: 0.003, finish: 'texture' }),
    box('mirror glass', [0.004, 0.34, 0.17], [x - 0.037, yH, zH], { item: 'trk-mirror-glass', mat: 'glass', color: 0x9fb3c4, finish: 'chrome' }),
    ...[y0, y1].map((yy) => box('mirror bracket', [0.06, 0.06, 0.03], [x, yy, z0 + s * 0.012], { item: 'trk-mirror-bracket', mat: 'al-a380', color: 0x1a1a1a, finish: 'cast' })),
    ...[y0, y1].flatMap((yy) => [-1, 1].map((k) => screw('bolt M8x25', [x + k * 0.018, yy, z0 + s * 0.027], s > 0 ? '-z' : 'z'))),
  ], { says: 'a west-coast mirror (typical of North American trucks)' });
}

// ---- the cab ---------------------------------------------------------------------------------------------------------------
export interface TruckBody {
  /** the bumper's front, the cab's back, its windscreen's foot and its roof's front edge, m along x */ front: number; cabBack: number; cowlX: number; roofX: number;
  /** its floor, its cowl, its roof's height; its cab's half-width; the machine's half-width */ floorY: number; cowlY: number; H: number; wc: number; half: number;
  /** its frame: the rails' middle height, their half-spacing, their section; their ends */ railY: number; railZ: number; railH: number; railW: number; railT: number; fx0: number; fx1: number;
  /** its steer axle's x and its tyre's radius */ steerX: number; steerR: number; color: number;
}
/** A door: its pressed outer skin and inner panel, its glass in a run of rubber seal, its two hinges (cast, each held by
 *  two M8 screws into the A-pillar), its handle and its latch. Its outer face at z = s·z0. */
export function door(name: string, s: number, x0: number, x1: number, y0: number, yBelt: number, yTop: number, z0: number, color: number): Part {
  const w = x1 - x0, xm = (x0 + x1) / 2, z = s * z0, inward = -s, gh = yTop - yBelt - 0.06;
  return group(name, 'trk-door', [0, 0, 0], [
    box('door skin', [w, yBelt - y0, 0.0016], [xm, (y0 + yBelt) / 2, z], { item: 'trk-door-skin', mat: 'al-5052', color, finish: 'paint', make: 'pressed', says: 'pressed aluminium (Freightliner builds its cabs of aluminium)' }),
    box('door inner panel', [w - 0.04, yTop - y0 - 0.04, 0.0016], [xm, (y0 + yTop) / 2, z + inward * 0.09], { item: 'trk-door-inner', mat: 'al-5052', color: 0x3a3d42, finish: 'texture', make: 'pressed' }),
    box('door glass', [w - 0.12, gh, 0.005], [xm - 0.02, yBelt + 0.03 + gh / 2, z + inward * 0.02], { item: 'trk-door-glass', mat: 'glass', color: 0x2a3c48, finish: 'gloss', says: 'tempered glass, 5 mm (typical)' }),
    // (its window frame: a run of seal round the glass, top, front and back)
    box('window seal (top)', [w - 0.08, 0.025, 0.02], [xm - 0.02, yTop - 0.0125, z + inward * 0.02], { item: 'trk-window-seal', mat: 'epdm', color: 0x111111, finish: 'texture' }),
    box('window seal (front)', [0.025, gh + 0.03, 0.02], [x1 - 0.05, yBelt + 0.03 + gh / 2, z + inward * 0.02], { item: 'trk-window-seal', mat: 'epdm', color: 0x111111, finish: 'texture' }),
    box('window seal (back)', [0.025, gh + 0.03, 0.02], [x0 + 0.03, yBelt + 0.03 + gh / 2, z + inward * 0.02], { item: 'trk-window-seal', mat: 'epdm', color: 0x111111, finish: 'texture' }),
    box('belt line', [w, 0.03, 0.03], [xm, yBelt, z + inward * 0.01], { item: 'trk-window-seal', mat: 'epdm', color: 0x111111, finish: 'texture' }),
    ...[y0 + 0.25, yBelt - 0.12].flatMap((yy) => [
      P('door hinge', { cyl: [0.018, 0.09] }, [x1 + 0.01, yy, z + inward * 0.01], { item: 'trk-door-hinge', mat: 'steel-low', color: 0x1a1a1a, finish: 'cast' }),
      screw('bolt M8x25', [x1 + 0.03, yy - 0.025, z + inward * 0.005], s > 0 ? '-z' : 'z'), screw('bolt M8x25', [x1 + 0.03, yy + 0.025, z + inward * 0.005], s > 0 ? '-z' : 'z'),
    ]),
    box('door handle', [0.16, 0.035, 0.03], [x0 + 0.16, yBelt - 0.12, z + s * 0.015], { item: 'trk-door-handle', mat: 'zamak', color: 0xc8ccd2, finish: 'chrome' }),
    box('door latch', [0.03, 0.08, 0.06], [x0 + 0.02, yBelt - 0.12, z + inward * 0.045], { item: 'trk-door-latch', mat: 'steel-low', color: 0x5a5d62, finish: 'plate' }),
  ], { says: 'a door: skin, inner panel, glass in its seals, two hinges, handle, latch' });
}
/** A day cab: its floor, back wall and rear window, roof, the panels beside its doors, A-pillars raked back with its
 *  two-piece windscreen and centre post between them, its doors, mirrors, sun visor and roof marker lamps, on four rubber
 *  cab mounts on its frame rails. Panels pressed aluminium. */
export function dayCab(b: TruckBody): Part {
  const { cabBack: xb, cowlX: xc, roofX: xr, floorY: yF, cowlY: yC, H, wc, color } = b, al = { mat: 'al-5052', color, finish: 'paint', make: 'pressed' as const };
  const pillar = Math.hypot(xc - xr, H - 0.05 - yC), lean = Math.atan2(xc - xr, H - 0.05 - yC), mid: V3 = [(xc + xr) / 2, (yC + H - 0.05) / 2, 0];
  const xD0 = xb + 0.2, xD1 = Math.min(xc - 0.3, xD0 + 1.0), yBelt = yC + 0.1, yTop = H - 0.18;
  const parts: Part[] = [
    box('cab floor', [xc - xb, 0.006, 2 * wc], [(xb + xc) / 2, yF, 0], { item: 'trk-cab-floor', ...al, color: 0x2a2c30 }),
    box('cab back wall', [0.0025, H - 0.12 - yF, 2 * wc], [xb, (H - 0.12 + yF) / 2, 0], { item: 'trk-cab-back', ...al }),
    box('rear window', [0.006, 0.42, 0.95], [xb - 0.002, yTop - 0.35, 0], { item: 'trk-door-glass', mat: 'glass', color: 0x2a3c48, finish: 'gloss' }),
    P('cab roof', { loft: { st: [{ x: xb, w: wc, lo: H - 0.14, hi: H, n: 5 }, { x: (xb + xr) / 2, w: wc, lo: H - 0.14, hi: H, n: 5 }, { x: xr + 0.04, w: wc - 0.02, lo: H - 0.16, hi: H - 0.03, n: 5 }] } }, [0, 0, 0], { item: 'trk-cab-roof', ...al, shell: 0.0016 }),
    box('windscreen centre post', [0.05, pillar, 0.06], mid, { rot: [0, 0, lean], item: 'trk-a-pillar', mat: 'al-6063', color: 0x1a1a1a, finish: 'paint' }),
    box('cowl panel', [0.12, 0.005, 2 * wc - 0.04], [xc - 0.04, yC - 0.01, 0], { item: 'trk-cab-floor', ...al, color: 0x1a1a1a }),
    box('sun visor', [0.32, 0.012, 2 * wc * 0.96], [xr + 0.12, H - 0.04, 0], { rot: [0, 0, -0.18], item: 'trk-sun-visor', ...al }),
  ];
  for (const s of [-1, 1]) {
    const z = s * wc, sd = s > 0 ? 'right' : 'left';
    parts.push(
      box(`windscreen (${sd})`, [0.007, pillar - 0.06, wc - 0.07], [mid[0] + 0.004, mid[1], s * (wc / 2 + 0.005)], { rot: [0, 0, lean], item: 'trk-windscreen', mat: 'glass', color: 0x2a3c48, finish: 'gloss', says: 'laminated glass (its PVB layer not drawn)' }),
      box(`A-pillar (${sd})`, [0.07, pillar, 0.07], [mid[0], mid[1], s * (wc - 0.035)], { rot: [0, 0, lean], item: 'trk-a-pillar', mat: 'al-6063', color, finish: 'paint', make: 'pressed' }),
      box(`cab side, behind the door (${sd})`, [xD0 - xb, H - 0.14 - yF, 0.0025], [(xb + xD0) / 2, (H - 0.14 + yF) / 2, z], { item: 'trk-cab-side', ...al }),
      box(`cab side, ahead of the door (${sd})`, [xc - xD1 - 0.02, yC - yF + 0.05, 0.0025], [(xD1 + 0.02 + xc) / 2, (yC + 0.05 + yF) / 2, z], { item: 'trk-cab-side', ...al }),
      box(`cab side, over the door (${sd})`, [xD1 - xD0, 0.04, 0.0025], [(xD0 + xD1) / 2, H - 0.16, z], { item: 'trk-cab-side', ...al }),
      door(`door (${sd})`, s, xD0, xD1, yF - 0.05, yBelt, yTop, wc + 0.004, color),
      mirror(`mirror (${sd})`, s, xD1 - 0.04, yBelt - 0.05, yTop - 0.05, wc + 0.006),
      box(`grab handle (${sd})`, [0.03, 0.75, 0.03], [xD0 - 0.06, yF + 0.6, s * (wc + 0.04)], { item: 'trk-grab-handle', mat: 'stainless-304', color: 0xd8dce2, finish: 'chrome' }),
    );
  }
  // its roof lamps: three identification lamps at its middle, 6 in apart, and a clearance lamp near each side (FMVSS 108)
  for (const z of [-0.1524, 0, 0.1524, -(wc - 0.12), wc - 0.12]) parts.push(lamp(z === 0 ? 'marker lamp (middle)' : Math.abs(z) < 0.2 ? 'marker lamp (identification)' : 'marker lamp (clearance)', 0.1, 0.035, 0.05, [xr + 0.02, H - 0.005, z], [0, 0, 0.2], { item: 'trk-marker-lamp', lens: 0xffa31a }));
  // its mounts: rubber blocks between its floor and brackets on the rails, a bolt through each
  const top = b.railY + b.railH / 2;
  for (const xx of [xb + 0.15, xc - 0.2]) for (const s of [-1, 1]) parts.push(group('cab mount', 'trk-cab-mount', [xx, 0, s * b.railZ], [
    P('cab mount rubber', { cyl: [0.055, Math.max(0.02, yF - top - 0.02)] }, [0, (yF + top) / 2 - 0.005, 0], { item: 'trk-cab-mount-rubber', mat: 'rubber', color: 0x161616, finish: 'texture' }),
    box('cab mount bracket', [0.14, 0.012, 0.14], [0, top + 0.006, 0], { item: 'trk-cab-mount-bracket', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }),
    through('M16', yF - top, [0, yF + 0.003, 0], 'y', 'cab mount bolt'),
  ]));
  return group('cab', 'trk-cab', [0, 0, 0], parts, { says: 'a day cab: pressed aluminium panels on its floor and back wall, a two-piece windscreen between raked A-pillars, two doors, mirrors, roof lamps, on four rubber mounts' });
}
/** Its hood: one fibreglass moulding from the bumper to the windscreen's foot, its fenders in it (cut away round the
 *  steer tyres, clear of their lock and bump), tilting forward on two hinges at its nose; its grille (a chrome surround,
 *  six aluminium bars, four screws) and its two headlamps set into its nose. */
export function hood(b: TruckBody, bump: number): Part {
  // (a conventional's hood: a tall, nearly upright nose round its grille, its sides flat, its top rising to the cowl)
  const { front, cowlX: xc, cowlY: yC, half, steerX, steerR, color } = b, nose = front - 0.14, wn = half * 0.74, lo = b.railY - 0.05, noseTop = yC - 0.22;
  const shell = P('hood shell', { loft: { st: [
    { x: nose, w: wn, lo: lo + 0.05, hi: noseTop, n: 5 },
    { x: nose - 0.1, w: half * 0.88, lo, hi: noseTop + 0.05, n: 6 },
    { x: steerX, w: half * 0.98, lo, hi: yC - 0.1, n: 6 },
    { x: xc + 0.25, w: half * 0.93, lo, hi: yC - 0.03, n: 6 },
    { x: xc, w: b.wc * 0.98, lo, hi: yC, n: 6 },
  ] } }, [0, 0, 0], { item: 'trk-hood-shell', mat: 'fibreglass', color, shell: 0.004, finish: 'paint', make: 'pressed',
    // (its wheel openings: the tyre's radius, its bump, and 60 mm, typical, round the axle)
    cuts: [{ r: steerR + bump + 0.06, depth: 2 * half + 0.1, at: [steerX, steerR, half + 0.05], dir: [0, 0, -1] }],
    says: 'a fibreglass (SMC) moulding with its fenders, tilting forward (typical of a conventional tractor)' });
  const gy0 = b.railY + 0.1, gy1 = noseTop - 0.07, gw = wn * 0.62, gh = gy1 - gy0, gx = nose + 0.01, bars: Part[] = [];
  for (let k = 0; k < 6; k++) bars.push(box('grille bar', [0.03, 0.035, 2 * gw - 0.05], [gx, gy0 + 0.05 + k * (gh - 0.1) / 5, 0], { item: 'trk-grille-bar', mat: 'al-6063', color: 0xc8ccd2, finish: 'chrome' }));
  const grille = group('grille', 'trk-grille', [0, 0, 0], [
    box('grille surround (top)', [0.05, 0.06, 2 * gw + 0.06], [gx, gy1, 0], { item: 'trk-grille-surround', mat: 'abs', color: 0xd8dce2, finish: 'chrome' }),
    box('grille surround (bottom)', [0.05, 0.06, 2 * gw + 0.06], [gx, gy0, 0], { item: 'trk-grille-surround', mat: 'abs', color: 0xd8dce2, finish: 'chrome' }),
    box('grille surround (left)', [0.05, gh, 0.06], [gx, (gy0 + gy1) / 2, -gw], { item: 'trk-grille-surround', mat: 'abs', color: 0xd8dce2, finish: 'chrome' }),
    box('grille surround (right)', [0.05, gh, 0.06], [gx, (gy0 + gy1) / 2, gw], { item: 'trk-grille-surround', mat: 'abs', color: 0xd8dce2, finish: 'chrome' }),
    box('grille mesh', [0.006, gh - 0.04, 2 * gw - 0.04], [gx - 0.004, (gy0 + gy1) / 2, 0], { item: 'trk-grille-bar', mat: 'al-6063', color: 0x121314, finish: 'texture' }),
    ...bars,
    ...[[gy1, -gw], [gy1, gw], [gy0, -gw], [gy0, gw]].map(([yy, zz]) => screw('bolt M6x20', [gx + 0.03, yy!, zz!], '-x')),
  ], { says: 'its grille: a chrome surround, six bars, a mesh behind, four screws' });
  // (its headlamps in the nose's corners beside the grille, swept back round them)
  const lampX = nose - 0.06, lampY = gy0 + 0.16, lz = gw + 0.17;
  return group('hood', 'trk-hood', [0, 0, 0], [shell, grille,
    lamp('headlamp (left)', 0.3, 0.17, 0.18, [lampX, lampY, -lz], [0, -0.35, 0]), lamp('headlamp (right)', 0.3, 0.17, 0.18, [lampX, lampY, lz], [0, 0.35, 0]),
    ...[-1, 1].map((s) => P('hood hinge', { cyl: [0.02, 0.12] }, [nose - 0.05, lo + 0.02, s * (b.railZ)], { rot: [PI / 2, 0, 0], item: 'trk-hood-hinge', mat: 'steel-low', color: 0x1a1a1a, finish: 'cast' })),
    ...[-1, 1].flatMap((s) => [-1, 1].map((k) => screw('bolt M10x30', [nose - 0.05 + k * 0.04, lo - 0.01, s * b.railZ], '-y'))),
  ], { says: 'a tilting hood: its moulding, grille, headlamps and hinges' });
}
/** Its front bumper: a pressed steel shell, moulded end caps, two brackets bolted through the frame rails' fronts. */
export function bumper(b: TruckBody): Part {
  const { front, half } = b, y = b.railY - 0.12, h = 0.36, w = half - 0.04;
  return group('front bumper', 'trk-bumper', [0, 0, 0], [
    box('bumper shell', [0.14, h, 2 * (w - 0.22)], [front - 0.07, y, 0], { item: 'trk-bumper-shell', mat: 'steel-low', color: 0xc8ccd2, shell: 0.004, make: 'pressed', finish: 'chrome' }),
    ...[-1, 1].map((s) => box('bumper end cap', [0.16, h, 0.24], [front - 0.1, y, s * (w - 0.11)], { rot: [0, s * 0.35, 0], item: 'trk-bumper-end', mat: 'pp', color: 0x1a1b1e, shell: 0.004, finish: 'texture' })),
    ...[-1, 1].map((s) => box('bumper bracket', [0.12, 0.2, 0.012], [front - 0.2, b.railY - 0.05, s * (b.railZ + b.railW / 2 + 0.006)], { item: 'trk-bumper-bracket', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' })),
    ...[-1, 1].flatMap((s) => [[-0.04, -0.07], [0.04, -0.07], [-0.04, 0.03], [0.04, 0.03]].map(([dx, dy]) => through('M12', b.railT + 0.012, [front - 0.2 + dx!, b.railY + dy!, s * (b.railZ + b.railW / 2 + 0.012)], s > 0 ? 'z' : '-z'))),
  ], { says: 'its front bumper: shell, end caps, brackets bolted through its rails (M12)' });
}

// ---- frame, tanks, exhaust, fifth wheel, steps, fenders ------------------------------------------------------------------
/** A frame rail's section, a C-channel opening toward the frame's middle (s: its side). */
const channel = (H: number, W: number, t: number, s: number): [number, number][] => {
  // (drawn along local z, turned to run along x: local x is the machine's -z)
  const o = -s, pts: [number, number][] = [[-W / 2, -H / 2], [W / 2, -H / 2], [W / 2, -H / 2 + t], [-W / 2 + t, -H / 2 + t], [-W / 2 + t, H / 2 - t], [W / 2, H / 2 - t], [W / 2, H / 2], [-W / 2, H / 2]];
  return pts.map(([u, v]) => [u * o, v]);
};
/** Its ladder frame: two rolled C-channel rails (its maker's section), and cross members between them, each a pressed
 *  channel held at its ends by a gusset bolted through the rail's web with four M16 bolts (huck bolts in the factory:
 *  bolts here). */
export function ladderFrame(b: TruckBody, at: number[]): Part[] {
  const L = b.fx1 - b.fx0, xm = (b.fx0 + b.fx1) / 2, out: Part[] = [], zIn = b.railZ - b.railW / 2;
  for (const s of [-1, 1]) out.push(P(`frame rail ${s > 0 ? 'right' : 'left'}`, { prism: { pts: channel(b.railH, b.railW, b.railT, s), L } }, [xm, b.railY, s * b.railZ], { rot: [0, PI / 2, 0], item: 'trk-frame-rail', mat: 'steel-alloy', color: 0x1a1a1a, finish: 'paint', make: 'pressed', says: `C-channel ${(b.railT * 1000).toFixed(0)} × ${(b.railW * 1000).toFixed(0)} × ${(b.railH * 1000).toFixed(0)} mm (Freightliner)` }));
  for (const xx of at) {
    const parts: Part[] = [box('cross member web', [0.2, 0.006, 2 * zIn - 0.024], [0, 0, 0], { item: 'trk-crossmember', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', make: 'pressed' }), box('cross member flange', [0.006, 0.18, 2 * zIn - 0.024], [-0.1, 0.0, 0], { item: 'trk-crossmember', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', make: 'pressed' })];
    for (const s of [-1, 1]) {
      parts.push(box('gusset', [0.24, 0.22, 0.008], [0, 0, s * (zIn - 0.004 - b.railT)], { item: 'trk-gusset', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', make: 'pressed' }));
      for (const [dx, dy] of [[-0.08, -0.07], [0.08, -0.07], [-0.08, 0.07], [0.08, 0.07]]) parts.push(through('M16', b.railT + 0.008, [dx!, dy!, s * (zIn + 0.002)], s > 0 ? '-z' : 'z', 'cross member bolt'));
    }
    out.push(group('cross member', 'trk-crossmember-set', [xx, b.railY, 0], parts, { fixed: 'bolted through its gussets to its frame rails\' webs' }));
  }
  return out;
}
/** A strap round a tank: a stainless band on a rubber liner (a ring about x). */
const strapRing = (name: string, r: number, x: number, item = 'trk-tank-strap'): Part[] => [
  P(name, { torus: [r + 0.006, 0.004] }, [x, 0, 0], { rot: [0, PI / 2, 0], item, mat: 'stainless-304', color: 0xc8ccd2, finish: 'brushed' }),
  P(`${name} liner`, { torus: [r + 0.002, 0.0025] }, [x, 0, 0], { rot: [0, PI / 2, 0], item: 'trk-strap-liner', mat: 'rubber', color: 0x111111, finish: 'texture' }),
];
/** A fuel tank on the side of the frame: a rolled aluminium shell, two pressed ends, two baffles inside, a filler neck and
 *  cap on top; held by two straps on rubber liners over two cast brackets, each bracket bolted through the rail's web
 *  with three M16 bolts. Its axis along x at `c`; `s` its side. */
export function fuelTank(name: string, s: number, c: V3, r: number, L: number, b: TruckBody): Part {
  const parts: Part[] = [
    P('tank shell', { cyl: [r, L - 0.01] }, [0, 0, 0], { rot: [0, 0, PI / 2], item: 'trk-tank-shell', mat: 'al-5052', color: 0xd0d4d8, shell: 0.003, finish: 'brushed', says: 'rolled 5052 aluminium, 3 mm (typical)' }),
    ...[-1, 1].map((k) => P('tank end', { cyl: [r + 0.004, 0.006, r + 0.004] }, [k * L / 2, 0, 0], { rot: [0, 0, PI / 2], item: 'trk-tank-end', mat: 'al-5052', color: 0xc0c4c8, finish: 'brushed' })),
    ...[-1, 1].map((k) => P('tank baffle', { cyl: [r - 0.004, 0.003] }, [k * L / 6, 0, 0], { rot: [0, 0, PI / 2], item: 'trk-tank-baffle', mat: 'al-5052', color: 0xa0a4a8 })),
    P('filler neck', { cyl: [0.045, 0.06] }, [L * 0.3, r + 0.02, s * r * 0.25], { item: 'trk-filler-neck', mat: 'al-6063', color: 0xc8ccd2, finish: 'brushed' }),
    P('fuel cap', { cyl: [0.055, 0.03] }, [L * 0.3, r + 0.065, s * r * 0.25], { item: 'trk-fuel-cap', mat: 'zamak', color: 0xd8dce2, finish: 'chrome' }),
    ...[-L * 0.32, L * 0.32].flatMap((x, i) => strapRing(`tank strap ${i + 1}`, r, x)),
  ];
  // its brackets, from the rail's web out under the tank (in the tank's frame: the rail's outer face is at z = -s(c.z - railZ - railW/2))
  const web = s * (b.railZ + b.railW / 2) - c[2], reach = Math.abs(web);
  for (const x of [-L * 0.32, L * 0.32]) {
    parts.push(box('tank bracket', [0.09, 0.3, reach], [x, -r * 0.55, web / 2], { item: 'trk-tank-bracket', mat: 'al-a380', color: 0x2a2c30, finish: 'cast' }));
    for (const dy of [-0.09, 0, 0.09]) parts.push(through('M16', b.railT + 0.015, [x, (b.railY - c[1]) + dy, web - Math.sign(web) * 0.008], web > 0 ? 'z' : '-z', 'tank bracket bolt'));
  }
  return group(name, 'trk-fuel-tank', c, parts, { says: `about ${Math.round(PI * r * r * L * 1000)} L (typical of a highway tractor's tank)` });
}
/** The aftertreatment unit (a "1-box" in Freightliner's words): a stainless can holding its oxidation catalyst and
 *  particulate filter (one ceramic core) and its SCR catalyst (another), a step plate on its top, on the same straps and
 *  brackets as a tank. Its axis along x at `c`. */
export function aftertreatment(s: number, c: V3, r: number, L: number, b: TruckBody): Part {
  const t = fuelTank('aftertreatment unit', s, c, r, L, b);
  t.item = 'trk-aftertreatment'; t.says = 'its exhaust aftertreatment: an oxidation catalyst and particulate filter, then an SCR catalyst dosed with DEF, in one stainless can (Freightliner\'s 1-box layout, its sizes typical)';
  t.parts = t.parts!.filter((p) => !/filler|fuel cap|baffle/.test(p.name)).map((p) => p.item === 'trk-tank-shell' ? { ...p, name: 'aftertreatment can', item: 'trk-at-can', mat: 'stainless-304', color: 0xb0b4b8 } : p.item === 'trk-tank-end' ? { ...p, item: 'trk-at-can-end', mat: 'stainless-304' } : p);
  t.parts.push(
    P('particulate filter core', { cyl: [r * 0.8, L * 0.4] }, [L * 0.22, 0, 0], { rot: [0, 0, PI / 2], item: 'trk-dpf-core', mat: 'alumina', color: 0xd8cfb8, says: 'a ceramic wall-flow filter (cordierite or silicon carbide, typical)' }),
    P('SCR catalyst core', { cyl: [r * 0.8, L * 0.4] }, [-L * 0.22, 0, 0], { rot: [0, 0, PI / 2], item: 'trk-scr-core', mat: 'alumina', color: 0xc9c2a8 }),
    box('step plate', [L * 0.6, 0.006, r * 1.4], [0, r + 0.02, 0], { item: 'trk-step-tread', mat: 'al-6063', color: 0xc8ccd2, finish: 'texture' }),
  );
  return t;
}
/** An exhaust stack: a stainless pipe up behind the cab from its aftertreatment's outlet, an elbow at its foot, a
 *  perforated heat shield, two clamps and a bracket bolted to the cab's back wall. */
export function exhaustStack(name: string, foot: V3, outlet: V3, top: number, xBack: number): Part {
  const r = 0.0635, x = foot[0], z = foot[2];
  // (the left stack fed by a crossover from the frame's middle, between the rails, under the cab's back: its pipe rises
  // from there, turns out over the rail and the tank to the stack's foot, then up)
  return group(name, 'trk-exhaust-stack', [0, 0, 0], [
    P('stack pipe', { tube: { r, pts: [outlet, [outlet[0], foot[1], outlet[2]], [x, foot[1], z], [x, top, z]], wall: 0.0015, bend: 0.15 } }, [0, 0, 0], { item: 'trk-stack-pipe', mat: 'stainless-304', color: 0xd8dce2, finish: 'chrome', says: '5 in (127 mm) stainless pipe (typical)' }),
    P('heat shield', { cyl: [r + 0.012, 0.9] }, [x, top - 0.75, z], { item: 'trk-heat-shield', mat: 'stainless-304', color: 0xe0e4e8, shell: 0.001, finish: 'chrome', says: 'perforated stainless, standing off the pipe' }),
    ...[top - 1.15, top - 0.35].map((yy) => P('stack clamp', { torus: [r + 0.004, 0.006] }, [x, yy, z], { rot: [PI / 2, 0, 0], item: 'trk-stack-clamp', mat: 'stainless-304', color: 0xc8ccd2, finish: 'brushed' })),
    box('stack bracket', [Math.max(0.02, xBack - x - r), 0.06, 0.006], [(x + r + xBack) / 2, top - 0.75, z], { item: 'trk-stack-bracket', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }),
    screw('bolt M10x30', [xBack + 0.004, top - 0.75, z], '-x'),
  ]);
}
/** A fifth wheel: its cast top plate (36 in across, its throat open to the rear down to where the kingpin locks, SAE
 *  J700's 2 in kingpin), the forged jaw under it, the release handle out to the driver's side, two brackets on pins,
 *  each on an angle bolted down to its rail with six M16 bolts. */
export function fifthWheel(b: TruckBody, x: number): Part {
  const top = b.railY + b.railH / 2, R = 0.457, t = 0.05, pts: [number, number][] = [];
  for (let k = 0; k <= 16; k++) { const a = -PI / 2 + (k / 16) * PI; pts.push([R * Math.cos(a), R * Math.sin(a)]); }
  pts.push([-0.42, R], [-0.42, 0.13], [-0.03, 0.03], [-0.03, -0.03], [-0.42, -0.13], [-0.42, -R]);
  const hA = 0.1, yA = top, yB = yA + 0.012, yP = yB + 0.11, parts: Part[] = [
    P('fifth wheel top plate', { prism: { pts, L: t } }, [0, yP + 0.06, 0], { rot: [-PI / 2, 0, 0], item: 'trk-fw-plate', mat: 'cast-iron', color: 0x1a1a1a, finish: 'cast', says: '36 in (914 mm) across, its throat open to the rear (typical of a highway tractor\'s fifth wheel)' }),
    box('locking jaw', [0.14, 0.05, 0.12], [0, yP + 0.01, 0], { item: 'trk-fw-jaw', mat: 'steel-alloy', color: 0x3a3d42, finish: 'cast', says: 'closes round a 2 in kingpin (SAE J700)' }),
    P('release handle', { tube: { r: 0.009, pts: [[0, yP + 0.01, 0], [0, yP + 0.01, -0.4], [0.05, yP, -0.5]], wall: 0.009, bend: 0.04 } }, [0, 0, 0], { item: 'trk-fw-handle', mat: 'steel-low', color: 0xd8b020, finish: 'paint' }),
  ];
  for (const s of [-1, 1]) {
    parts.push(box('fifth wheel bracket', [0.3, 0.1, 0.08], [0, yB + 0.05, s * 0.33], { item: 'trk-fw-bracket', mat: 'cast-iron', color: 0x1a1a1a, finish: 'cast' }),
      P('bracket pin', { cyl: [0.025, 0.12] }, [0, yP - 0.005, s * 0.33], { rot: [PI / 2, 0, 0], item: 'trk-fw-pin', mat: 'steel-alloy', color: 0x8a8d92, finish: 'plate' }),
      P('mounting angle', { prism: { pts: [[0, 0], [hA, 0], [hA, 0.012], [0.012, 0.012], [0.012, hA], [0, hA]].map(([u, v]) => [u! * -s, v!] as [number, number]), L: 0.75 } }, [0, yA, s * (b.railZ - b.railW / 2)], { rot: [0, PI / 2, 0], item: 'trk-fw-angle', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }));
    for (const dx of [-0.3, -0.1, 0.1, 0.3]) parts.push(through('M16', 0.012 + b.railT, [dx, yB + 0.012, s * b.railZ], 'y', 'angle bolt'));
  }
  return group('fifth wheel', 'trk-fifth-wheel', [x, 0, 0], parts, { says: 'where a trailer\'s kingpin couples: plate, jaw, handle, brackets on pins, angles bolted to its rails' });
}
/** A cab step: two aluminium treads on pressed brackets, the brackets bolted to the frame rail's web. */
export function cabStep(name: string, s: number, x: number, ys: number[], z0: number, z1: number, b: TruckBody): Part {
  const parts: Part[] = [], zm = (z0 + z1) / 2;
  for (const y of ys) parts.push(box('step tread', [0.42, 0.03, Math.abs(z1 - z0)], [x, y, s * zm], { item: 'trk-step-tread', mat: 'al-6063', color: 0xc8ccd2, finish: 'texture', says: 'extruded aluminium, its top serrated for grip' }));
  for (const dx of [-0.19, 0.19]) {
    parts.push(box('step bracket', [0.012, ys[ys.length - 1]! - ys[0]! + 0.04, Math.abs(z1 - b.railZ - b.railW / 2)], [x + dx, (ys[0]! + ys[ys.length - 1]!) / 2, s * (b.railZ + b.railW / 2 + Math.abs(z1 - b.railZ - b.railW / 2) / 2)], { item: 'trk-step-bracket', mat: 'al-5052', color: 0x2a2c30, finish: 'paint', make: 'pressed' }));
  }
  for (const dx of [-0.19, 0.19]) parts.push(through('M12', b.railT + 0.012, [x + dx, b.railY, s * (b.railZ + b.railW / 2 + 0.012)], s > 0 ? 'z' : '-z', 'step bolt'));
  return group(name, 'trk-step', [0, 0, 0], parts);
}
/** A quarter fender over a drive axle's tyres: a moulded band over their top behind them, on two tube brackets bolted to
 *  the rail; and a mud flap behind them on its hanger. `rr`: the room its tyres sweep, from the axle. */
export function quarterFender(name: string, s: number, x: number, y: number, z: number, rr: number, w: number, b: TruckBody, flap: boolean): Part {
  const a0 = PI * 0.1, a1 = PI * 0.62, t = 0.005;
  const parts: Part[] = [
    // (one moulding, its curve drawn as six flat facets, so what it covers is the band itself, never the tyre under it)
    P('quarter fender', undefined, [x, y, s * z], { item: 'trk-quarter-fender', mat: 'pp', color: 0x1a1b1e, says: 'moulded polypropylene, one piece', parts: Array.from({ length: 6 }, (_, k) => { const a = a0 + (a1 - a0) * ((k + 0.5) / 6), r = rr + t / 2, len = (rr * (a1 - a0)) / 6 * 1.03; return box('quarter fender facet', [len, t, w], [-r * Math.cos(a), r * Math.sin(a), 0], { rot: [0, 0, Math.atan2(Math.cos(a), Math.sin(a))], mat: 'pp', color: 0x1a1b1e, finish: 'texture', one: true }); }) }),
    ...[0.62, 0.95].map((f) => { const a = a0 + (a1 - a0) * (f > 0.9 ? 0.3 : 0.7), px = x - (rr + t) * Math.cos(a), py = y + (rr + t) * Math.sin(a); return P('fender bracket', { tube: { r: 0.012, pts: [[px, py, s * (z - w * 0.3)], [px, py, s * (b.railZ + b.railW / 2 + 0.01)]], wall: 0.002 } }, [0, 0, 0], { item: 'trk-fender-bracket', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }); }),
  ];
  if (flap) parts.push(
    box('mud flap', [0.008, 0.62, w], [x - rr - 0.05, 0.12 + 0.31, s * z], { item: 'trk-mud-flap', mat: 'rubber', color: 0x111111, finish: 'texture' }),
    P('flap hanger', { tube: { r: 0.014, pts: [[x - rr - 0.05, 0.77, s * (b.railZ + b.railW / 2 + 0.01)], [x - rr - 0.05, 0.77, s * (z + w / 2)]], wall: 0.002 } }, [0, 0, 0], { item: 'trk-flap-hanger', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }),
  );
  return group(name, flap ? 'trk-fender-flap-set' : 'trk-quarter-fender-set', [0, 0, 0], parts);
}
/** An air tank across the frame between its rails: a rolled steel shell, two pressed ends, a drain valve at its bottom,
 *  two straps on liners. Its axis along z at `c`. */
export function airTank(name: string, c: V3, r: number, L: number): Part {
  const parts: Part[] = [
    P('air tank shell', { cyl: [r, L] }, [0, 0, 0], { rot: [PI / 2, 0, 0], item: 'trk-air-tank-shell', mat: 'steel-low', color: 0x2a2c30, shell: 0.003, finish: 'paint' }),
    ...[-1, 1].map((k) => P('air tank end', { cyl: [r, 0.008] }, [0, 0, k * L / 2], { rot: [PI / 2, 0, 0], item: 'trk-air-tank-end', mat: 'steel-low', color: 0x2a2c30, finish: 'paint' })),
    P('drain valve', { cyl: [0.012, 0.04] }, [0, -r - 0.02, L * 0.3], { item: 'trk-drain-valve', mat: 'brass', color: 0xc9a227, finish: 'plate' }),
    ...[-L * 0.3, L * 0.3].flatMap((z, i) => strapRing(`air tank strap ${i + 1}`, r, 0, 'trk-tank-strap').map((p) => ({ ...p, at: [0, 0, z] as V3, rot: [0, 0, 0] as V3 }))),
  ];
  return group(name, 'trk-air-tank', c, parts, { says: 'a compressed-air reservoir for its brakes (typical: about 9.5 in across)' });
}
/** Its battery box: an aluminium box on two brackets bolted through the rail's web, holding `n` starting batteries of a BCI
 *  group side by side across it (each to its cells and plates), under a lid. Its middle at `c`, on side `s`. */
export function batteryBox(s: number, c: V3, grp: string, n: number, b: TruckBody): Part {
  // (its batteries lengthwise along the frame, side by side out from the rail, so the box stands clear of the tyres ahead
  // of and behind it)
  const bat = starterBattery(grp), z = boundsOfAll(bat).getSize(new THREE.Vector3()), t = 0.003, L = z.x + 0.03, W = n * (z.z + 0.006) + 0.02, H = z.y + 0.03;
  const al = { mat: 'al-5052', color: 0x2a2c30, finish: 'paint' as const, item: 'trk-battery-box-shell', one: true };
  const parts: Part[] = [
    box('battery box floor', [L, t, W], [0, t / 2, 0], al), box('battery box side', [L, H, t], [0, H / 2, -W / 2], al), box('battery box side', [L, H, t], [0, H / 2, W / 2], al),
    box('battery box end', [t, H, W], [-L / 2, H / 2, 0], al), box('battery box end', [t, H, W], [L / 2, H / 2, 0], al),
    box('battery box lid', [L + 0.01, t, W + 0.01], [0, H + t / 2 + 0.002, 0], { item: 'trk-battery-box-lid', mat: 'al-5052', color: 0x2a2c30, finish: 'paint' }),
  ];
  for (let i = 0; i < n; i++) parts.push(partOf(bat, [0, t, -W / 2 + 0.01 + (i + 0.5) * (z.z + 0.006)], [0, 0, 0], { name: `battery ${i + 1} (group ${grp})`, item: 'battery-sli', sealed: 'built whole as it is made (components.ts), fitted as it comes' }));
  const web = s * (b.railZ + b.railW / 2) - c[2], inner = Math.sign(web) * W / 2;
  for (const x of [-L / 2 + 0.05, L / 2 - 0.05]) {
    parts.push(box('battery box bracket', [0.06, 0.2, Math.abs(web - inner)], [x, 0.05, (web + inner) / 2], { item: 'trk-tank-bracket', mat: 'al-a380', color: 0x2a2c30, finish: 'cast' }));
    for (const dy of [0, 0.09]) parts.push(through('M16', b.railT + 0.015, [x, (b.railY - c[1]) + dy - 0.05, web - Math.sign(web) * 0.008], web > 0 ? 'z' : '-z', 'battery box bolt'));
  }
  return group(`battery box (${n} × group ${grp})`, 'trk-battery-box', c, parts, { says: `its starting batteries: ${n} BCI group ${grp}s (typical of a highway tractor: three or four), in an aluminium box on the frame` });
}

// ---- closures from their first parts: a car's doors, hood and deck lid ------------------------------------------------
// Each built round the skin the body's panels cut for it (its outer panel, as pressed): an inner panel pressed to the
// same shape and set in from it, hemmed to it round its edge; what is fitted between them and on them; a trim panel
// inside a door. Doors and their skins are drawn with their mirror (both sides), so what is fitted to one is fitted to
// its mirror too. Sizes typical of a mid-size car's, said where used.
const mirrorZ = (p: Part): Part => ({ ...p, at: p.at ? [p.at[0], p.at[1], -p.at[2]] : p.at, ...(p.shape && 'tube' in p.shape ? { shape: { tube: { ...p.shape.tube, pts: p.shape.tube.pts.map((q) => [q[0], q[1], -q[2]] as V3) } } } : {}), ...(p.parts ? { parts: p.parts.map(mirrorZ) } : {}), name: p.name.replace('(right)', '(left)') });
/** A closure's parts, round its skin (a part whose shape is a patch of the body's surface): kind says which. Returns its
 *  skin tagged with what it is, and what is built round it. */
export function closureOf(skin: Part, kind: 'door' | 'hood' | 'deck lid', more: Part[] = []): Part[] {
  if (!skin.shape || !('surf' in skin.shape)) return [skin];
  // (its extent over all its skin's patches: a rear door's skin is cut in two, below and above its arch's line)
  const pt = skin.shape.surf, pts = [skin, ...more].flatMap((q) => q.shape && 'surf' in q.shape ? patchPoints(q.shape.surf, 8, 6, false) : []), xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), zs = pts.map((q) => q[2]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), zm = zs.reduce((a, b) => a + b, 0) / zs.length, h = y1 - y0, l = x1 - x0;
  const steel = { mat: 'steel-low', color: 0x3a3c40, finish: 'paint' }, out: Part[] = [{ ...skin, item: kind === 'door' ? 'door-skin' : kind === 'hood' ? 'hood-skin' : 'deck-lid-skin' }];
  // (an inner panel set in from each of its skin's patches)
  const patches = [skin, ...more].flatMap((q) => q.shape && 'surf' in q.shape ? [q.shape.surf] : []);
  const inners = (name: string, off: number, m2: Partial<Part>): Part[] => patches.map((pp) => ({ name, shape: { surf: { ...pp, off } }, at: [0, 0, 0], ...m2 }));
  void pt;
  if (kind === 'door') {
    // (its inner panel 110 mm in from its skin (a door's depth at its waist, typical), pressed 0.7 mm, lightened by its
    // openings (about a third of it, for the regulator and the speaker); its trim panel inside it, moulded)
    out.push(...inners(`${skin.name} inner panel`, -0.11, { ...steel, shell: 0.0007, fill: 0.68, item: 'door-inner-panel', make: 'pressed', says: 'pressed 0.7 mm steel, hemmed to its skin round its edge; its openings for the regulator and speaker (about a third of it)' }));
    out.push(...inners(`${skin.name} trim panel`, -0.125, { mat: 'pp', color: 0x2a2a2c, shell: 0.0025, finish: 'texture', item: 'door-trim-panel', says: 'moulded polypropylene, clipped to the inner panel' }));
    const hand: Part[] = [], zi = zm - 0.055;
    // (its side-impact beam: a high-strength steel tube from its front to its back, low in it (typical))
    // (as long as the door is at its height: a rear door's skin is cut back round its arch below its waist)
    const yb = y0 + 0.42 * h, at = pts.filter((q) => Math.abs(q[1] - yb) < 0.08), bx0 = at.length ? Math.min(...at.map((q) => q[0])) : x0, bx1 = at.length ? Math.max(...at.map((q) => q[0])) : x1;
    hand.push({ name: 'side impact beam', shape: { tube: { r: 0.016, wall: 0.0018, pts: [[bx1 - 0.06, yb + 0.02, zi], [bx0 + 0.06, yb, zi]] } }, at: [0, 0, 0], mat: 'steel-alloy', color: 0x5a5c60, item: 'intrusion-beam' });
    // (two hinges on its front edge, a check strap between them; its latch on its back edge, the striker on the pillar)
    for (const f of [0.25, 0.72]) hand.push({ name: 'door hinge', at: [x1 - 0.02, y0 + f * h, zi], parts: [{ name: 'hinge leaf (door)', shape: { box: [0.03, 0.06, 0.006] }, at: [-0.012, 0, 0], mat: 'steel-low', color: 0x2a2a2a, item: 'hinge-leaf' }, { name: 'hinge leaf (body)', shape: { box: [0.03, 0.06, 0.006] }, at: [0.018, 0, 0.004], mat: 'steel-low', color: 0x2a2a2a, item: 'hinge-leaf' }, { name: 'hinge pin', shape: { cyl: [0.004, 0.065] }, at: [0.004, 0, 0.004], mat: 'steel-alloy', color: 0x8a8c90, item: 'hinge-pin' }], item: 'door-hinge' });
    hand.push({ name: 'door check strap', shape: { box: [0.12, 0.012, 0.008] }, at: [x1 - 0.06, y0 + 0.5 * h, zi], mat: 'steel-low', color: 0x2a2a2a, item: 'door-check' });
    hand.push({ name: 'door latch', at: [x0 + 0.03, y0 + 0.45 * h, zi], item: 'door-latch', parts: [{ name: 'latch housing', shape: { box: [0.03, 0.08, 0.05] }, at: [0, 0, 0], mat: 'pbt', color: 0x1a1a1a, item: 'latch-housing' }, { name: 'latch claw', shape: { box: [0.006, 0.03, 0.025] }, at: [-0.017, 0, 0], mat: 'steel-alloy', color: 0x8a8c90, item: 'latch-claw' }, { name: 'lock actuator', shape: { cyl: [0.012, 0.04] }, at: [0.01, 0.06, 0], mat: 'pbt', color: 0x1a1a1a, item: 'lock-actuator' }] });
    // (its window regulator: two rails up its middle, a cable round them, a motor at their foot)
    const xr = (x0 + x1) / 2;
    hand.push({ name: 'window regulator', at: [0, 0, 0], item: 'window-regulator', parts: [
      ...[-0.11, 0.11].map((dx) => ({ name: 'regulator rail', shape: { box: [0.025, 0.75 * h, 0.008] as V3 }, at: [xr + dx, y0 + 0.5 * h, zi + 0.02] as V3, mat: 'steel-low', color: 0x6a6c70, item: 'regulator-rail' }) as Part),
      { name: 'regulator motor', shape: { cyl: [0.03, 0.06] }, at: [xr, y0 + 0.15 * h, zi - 0.01], rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x2a2a2a, item: 'window-motor' },
      { name: 'regulator cable', shape: { tube: { r: 0.0015, pts: [[xr - 0.11, y0 + 0.13 * h, zi + 0.02], [xr - 0.11, y0 + 0.87 * h, zi + 0.02], [xr + 0.11, y0 + 0.87 * h, zi + 0.02], [xr + 0.11, y0 + 0.13 * h, zi + 0.02], [xr - 0.11, y0 + 0.13 * h, zi + 0.02]] } }, at: [0, 0, 0], mat: 'steel-alloy', color: 0x8a8c90, item: 'regulator-cable' }] });
    hand.push({ name: 'door speaker', shape: { lathe: [[0.01, 0], [0.075, 0], [0.075, 0.006], [0.03, 0.05], [0.01, 0.05], [0.01, 0]] }, at: [x1 - 0.2, y0 + 0.2 * h, zi - 0.03], rot: [-PI / 2, 0, 0], mat: 'pp', color: 0x1a1a1a, item: 'loudspeaker-car', fill: 0.4 });
    hand.push({ name: 'inside door handle', shape: { box: [0.12, 0.025, 0.02] }, at: [x0 + 0.25, y0 + 0.65 * h, zm - 0.13], mat: 'abs', color: 0x2a2a2c, item: 'door-inner-handle' });
    hand.push({ name: 'door seal', shape: { tube: { r: 0.008, wall: 0.0015, pts: [[x0 + 0.01, y0 + 0.02, zm - 0.08], [x1 - 0.01, y0 + 0.02, zm - 0.08], [x1 - 0.01, y1 - 0.02, zm - 0.08], [x0 + 0.01, y1 - 0.02, zm - 0.08], [x0 + 0.01, y0 + 0.02, zm - 0.08]] } }, at: [0, 0, 0], mat: 'epdm', color: 0x1a1a1a, item: 'door-seal' });
    const right: Part = { name: `${skin.name.replace(/s$/, '')} (right)`, at: [0, 0, 0], item: 'car-door', parts: hand, says: 'what is in the door between its skin and its trim: beam, hinges, check, latch, regulator, speaker, handle, seal' };
    out.push(right, mirrorZ(right));
  } else {
    // (its inner frame 25 mm under its skin, pressed 0.7 mm and lightened to about half (typical of a hood's or a lid's
    // inner, its ribs between the openings), hemmed to the skin; its hinges at its back corners (a hood's) or its front
    // ones (a lid's), its latch at its other end, the striker on it, a prop rod or a struts, an insulator under a hood)
    out.push(...inners(`${skin.name} inner frame`, -0.025, { ...steel, shell: 0.0007, fill: 0.5, item: 'closure-inner', make: 'pressed', says: 'pressed 0.7 mm steel, its openings about half of it, hemmed to its skin' }));
    if (kind === 'hood') out.push(...inners('hood insulator', -0.03, { mat: 'cotton', color: 0x3a3a3a, shell: 0.012, finish: 'texture', item: 'hood-insulator', says: 'a felt pad under the hood, clipped to its inner frame' }));
    const hx = kind === 'hood' ? x0 + 0.04 : x1 - 0.04, lx = kind === 'hood' ? x1 - 0.06 : x0 + 0.05, hy = (y0 + y1) / 2 - 0.02, zh = Math.min(zm * 2 - 0.08, 0.55);
    const hinge: Part = { name: `${skin.name} hinge (right)`, at: [hx, hy, zh], item: 'closure-hinge', parts: [{ name: 'hinge arm', shape: { box: [0.12, 0.02, 0.008] }, at: [0, -0.02, 0], mat: 'steel-low', color: 0x2a2a2a, item: 'hinge-leaf' }, { name: 'hinge pin', shape: { cyl: [0.005, 0.03] }, at: [kind === 'hood' ? -0.06 : 0.06, -0.03, 0], rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x8a8c90, item: 'hinge-pin' }] };
    out.push(hinge, mirrorZ(hinge));
    out.push({ name: `${skin.name} latch`, at: [lx, y0 - 0.02, 0], item: 'closure-latch', parts: [{ name: 'latch housing', shape: { box: [0.05, 0.06, 0.08] }, at: [0, 0, 0], mat: 'steel-low', color: 0x2a2a2a, item: 'latch-housing' }, { name: 'latch claw', shape: { box: [0.025, 0.006, 0.03] }, at: [0, 0.03, 0], mat: 'steel-alloy', color: 0x8a8c90, item: 'latch-claw' }] });
    out.push({ name: `${skin.name} striker`, shape: { tube: { r: 0.004, pts: [[lx, y0 - 0.0, -0.015], [lx, y0 + 0.02, -0.015], [lx, y0 + 0.02, 0.015], [lx, y0, 0.015]] } }, at: [0, 0, 0], mat: 'steel-alloy', color: 0x8a8c90, item: 'striker' });
    if (kind === 'hood') out.push({ name: 'hood prop rod', shape: { tube: { r: 0.004, pts: [[x1 - 0.12, y0 - 0.04, zh], [x0 + l * 0.5, y0 - 0.04, zh]] } }, at: [0, 0, 0], mat: 'steel-low', color: 0x2a2a2a, item: 'prop-rod' });
  }
  return out;
}

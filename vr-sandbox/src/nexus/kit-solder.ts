// The soldering kit, each tool drawn whole from what its maker publishes, the rest an estimate said so: PINE64's
// Pinecil V2 (its handle, grip, stainless barrel, board, display, buttons, ports and screws; its tip, a TS100-type
// cartridge with its sleeve, heater, copper core and iron-plated point), and Hakko's CHP-170 flush cutters. Each part a
// piece under its inventory item, so the forge opens it part by part and the breakdown queue takes it to materials.
// Frames: the iron along +x from its handle's back (x 0) to its tip's point (x 155), its face (display and buttons)
// up (+y); the cutters along +x from their handles' ends to their jaws' tips, closed, lying flat (their faces ±y).

import type { Comp } from './sbc';
import type { Solid } from './packages';
import { BOARD_PARTS, chip } from './boardparts';
import { smallPart, type SmallRow } from './sbc';

type V2 = [number, number]; type V3 = [number, number, number];
const PI = Math.PI;
const box = (role: Solid['role'], b: V3, at: V3, mat: string, more: Partial<Solid> = {}): Solid => ({ role, shape: { box: b }, at, mat, ...more });
/** A section drawn along x: its outline in (across, up) less its openings, through `len` mm from x0. */
const along = (role: Solid['role'], outline: V2[], holes: V2[][], len: number, x0: number, mat: string, more: Partial<Solid> = {}): Solid =>
  ({ role, shape: { prism: { pts: outline, L: len, ...(holes.length ? { holes } : {}) } }, at: [x0 + len / 2, 0, 0], rot: [0, PI / 2, 0], mat, ...more });
/** A turned shape along x: its profile as [radius, x] from back to front. */
const turned = (role: Solid['role'], prof: V2[], mat: string, more: Partial<Solid> = {}, at: V3 = [0, 0, 0]): Solid => ({ role, shape: { lathe: prof }, at, rot: [0, 0, -PI / 2], mat, ...more });
/** A cylinder standing up (+y), r and h, its base at `at`. */
const post = (role: Solid['role'], r: number, h: number, at: V3, mat: string, more: Partial<Solid> = {}): Solid => ({ role, shape: { cyl: [r, h] }, at: [at[0], at[1] + h / 2, at[2]], mat, ...more });
const piece = (name: string, item: string, solids: Solid[], kids: Comp[] = []): Comp => ({ name, item, solids, ...(kids.length ? { kids } : {}), at: [0, 0, 0] });
/** A rounded rectangle w across by h up about its middle, its corners radius r. */
function rrect(w: number, h: number, r: number, n = 5): V2[] {
  const out: V2[] = [], c: V2[] = [[w / 2 - r, h / 2 - r], [-w / 2 + r, h / 2 - r], [-w / 2 + r, -h / 2 + r], [w / 2 - r, -h / 2 + r]];
  c.forEach(([cx, cy], k) => { for (let i = 0; i <= n; i++) { const a = (k * PI) / 2 + (i / n) * (PI / 2); out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } });
  return out;
}
const circ = (r: number, cx = 0, cy = 0, n = 20): V2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * PI * i) / n), cy + r * Math.sin((2 * PI * i) / n)] as V2);
/** An M2 pan-head screw standing on a face at `at`, pointing in along -dir (its head on the face, its shank under it). */
const m2 = (name: string, at: V3, down: 1 | -1, len: number): Comp => piece(name, 'screw-m2', [
  { role: 'term', shape: { cyl: [1.75, 1.3] }, at: [at[0], at[1] + down * 0.65, at[2]], mat: 'stainless-304', color: 0xc9ccce, finish: 'bright' },
  { role: 'term', shape: { cyl: [0.95, len] }, at: [at[0], at[1] - down * len / 2, at[2]], mat: 'stainless-304', color: 0xb8bbbd, finish: 'thread' }]);

// ---- the Pinecil V2 -------------------------------------------------------------------------------------------------
/** PINE64's Pinecil V2 as its wiki and its sellers give it: 155 mm with its tip, 103 without, 12.8 × 16.2 mm across;
 *  28 g with its tip (18 without); a polycarbonate handle round a 304 stainless core, black, its grip green silicone;
 *  a 0.69" 96 × 16 OLED and its [+] and [-] buttons on its face; USB-C (PD 12–20 V, 24 V EPR) and a DC 5525 barrel at its
 *  back; three M2 screws (the top front one holding the tip, the bottom front one the case, an M2 × 4 ground screw by
 *  the [-] button). Its tip a TS100-type cartridge 86 mm long, 8.2 g, 6.2 Ω (PINE64's short tip), its point a B2 cone.
 *  Where nothing published gives a size, it is read off a photo of two Pinecils in a 3D-printed holder
 *  (mrangen/Pinecil-Soldering-Iron-Holder, MIT: its handle's 16.2 mm across the grip the scale, its lean of about 31°
 *  taken off), or estimated: the grip 28 mm long; the face's [+] 3.5 mm behind the grip, the display window 22 × 6 mm
 *  behind that, the [-] at 37 and the ground screw at 48; the tip's collar 7.3 mm across and 3 long, its neck 2.8 mm
 *  for 13, its heater sleeve 4.2 mm for 28, its cone 6.4 long; the handle's corners 4 mm round; its walls 1.2 mm. */
export function pinecilV2(): Comp {
  const W = 12.8, H = 16.2, R = 4, wall = 1.2, L = 103, gripAt = 71, gripL = 28, top = H / 2;
  const black = { color: 0x16171a, finish: 'moulded' } as const, grip = { color: 0x3fa64a } as const;
  // (its shell: the body from its back to its grip, the core under the grip a millimetre in so the grip lies flush,
  // its nose a ring the grip's size and a round cap to the tip's collar; its back wall cut for its two ports)
  const outer = rrect(W, H, R), inner = rrect(W - 2 * wall, H - 2 * wall, R - wall), under = rrect(W - 2, H - 2, R - 1);
  const usbHole = rrect(9.0, 3.3, 1.2).map(([a, b]) => [a, b - 3.6] as V2), dcHole = circ(3.1, 0, 3.4);
  const shell = piece('Pinecil handle shell', 'pinecil-shell', [
    along('body', outer, [inner], gripAt - wall, wall, 'pc', black),
    along('body', outer, [usbHole, dcHole], wall, 0, 'pc', black),
    along('body', under, [rrect(W - 2 - 2 * wall, H - 2 - 2 * wall, R - 1 - wall)], gripL, gripAt, 'pc', black),
    along('body', outer, [circ(3.6)], 1.5, gripAt + gripL, 'pc', black),
    turned('body', [[3.6, gripAt + gripL + 1.5], [5.6, gripAt + gripL + 1.5], [5.2, L - 0.8], [4.1, L], [3.6, L]], 'pc', black),
  ]);
  const sleeve = piece('Pinecil grip', 'pinecil-grip', [along('body', outer, [under], gripL, gripAt, 'silicone', grip)]);
  // (its core: a 304 stainless tube the tip slides into, its two spring contacts at the tube's back meeting the tip's end)
  const barrel = piece('Pinecil stainless barrel', 'pinecil-barrel', [turned('body', [[2.3, 62], [2.9, 62], [2.9, L - 1], [2.3, L - 1]], 'stainless-304', { color: 0xc4c8ca, finish: 'brushed' })]);
  const contacts = [0, 1].map((i) => piece(`Pinecil tip contact ${i + 1}`, 'tip-contact', [box('lead', [1.2, 0.3, 1.4], [62.6 + i * 1.6, (i ? -1 : 1) * 1.6, 0], 'phosphor-bronze', { color: 0xd8b25c })]));
  // (its board under its face: the BL706 RISC-V chip, the USB PD controller, the MOSFET that switches the tip, the
  // accelerometer that wakes it, their passives; its display and two switches on it, its ports at its back)
  const pcbY = 2.6, pcbT = 1.0, bt = pcbY + pcbT / 2;
  const put = (c: Comp, p: V3, o: { turn?: number; under?: boolean } = {}): Comp => ({ ...c, at: p, ...o });
  // (the chips by their datasheets' packages: BL706 a QFN-40 5 × 5 (Bouffalo), the FUSB302 an MLP-14 2.5 × 2.5 (onsemi),
  // the MOSFET and the accelerometer in typical packages of theirs, a power DFN 3.3 × 3.3 and a 2 × 2 QFN-12)
  const passives: SmallRow[] = [['c', 0, 0, 1, 0.5, 0], ['c', 0, 0, 1, 0.5, 0], ['r', 0, 0, 1, 0.5, 0], ['c', 0, 0, 1.6, 0.8, 0], ['r', 0, 0, 1, 0.5, 0], ['c', 0, 0, 1, 0.5, 0]];
  const pAt: V2[] = [[12, -2.6], [14.5, 2.6], [25, 2.8], [33, 2.7], [37, -2.8], [57, -2.6]];
  const usbc = BOARD_PARTS['usb-c-16']!().comp, kmr = () => BOARD_PARTS['tact-kmr2']!().comp;
  const board = { name: 'Pinecil board', item: 'pinecil-board', at: [0, 0, 0] as V3, kids: [
    piece('circuit board', 'pcb-bare', [box('body', [58, pcbT, W - 2 * wall - 0.4], [wall + 0.3 + 29, pcbY, 0], 'fr4', { color: 0x1f2a22 })]),
    put(chip('QFN-40-5x5', 'Bouffalo BL706 microcontroller (RISC-V, Bluetooth LE)', 'BL706'), [20, bt, 0]),
    put(chip('QFN-14-2.5x2.5', 'onsemi FUSB302 USB PD controller'), [9, bt, 2.4]),
    put(chip('DFN-8-3.3x3.3', 'tip MOSFET'), [54, bt, 0]),
    put(chip('QFN-12-2x2', 'accelerometer (what wakes it when lifted)'), [28, bt, -2.6]),
    ...passives.map((r, k) => put(smallPart(r), [pAt[k]![0], bt, pAt[k]![1]])),
    { name: 'OLED display, 0.69" 96 × 16', item: 'oled-display', at: [0, 0, 0] as V3, solids: [box('body', [26, 1.0, 7.6], [49, top - wall - 0.55, 0], 'glass', { color: 0x07080b }), box('film', [17.3, 0.02, 2.9], [49, top - wall - 0.04, 0], 'glass', { color: 0x10141a }),
      box('film', [6, 0.1, 6.4], [62.5, top - wall - 1.1, 0], 'polyimide', { color: 0xc98a2c })], kids: [piece('display driver die', 'si-die', [box('die', [5, 0.2, 0.8], [36.8, top - wall - 0.95, 0], 'silicon')])] },
    put(kmr(), [gripAt - 3.5, bt, 0]), put(kmr(), [gripAt - 37, bt, 0]),
    // (both its ports at its back (PINE64), the USB-C under its board's end, the barrel above it: their order an estimate)
    put(usbc, [wall + 3.7, pcbY - pcbT / 2, 0], { turn: PI, under: true }),
    piece('DC barrel jack', 'dc-jack-5525', [box('body', [9.0, 6.0, 6.4], [wall + 4.5, 3.4 + 2.6, 0], 'nylon', { color: 0x141414 }), turned('lead', [[0, wall + 0.6], [1.0, wall + 0.6], [1.0, wall + 8.5], [0, wall + 8.5]], 'brass', { color: 0xc9b26a }, [0, 3.4 + 2.6, 0])]),
  ] };
  // (its face: the display's window, the two buttons proud of it with their marks, the ground screw by [-])
  const window = piece('Pinecil display window', 'pinecil-shell', [box('film', [22, 0.2, 6], [49, top + 0.02, 0], 'pc', { color: 0x050608 })]);
  const plusX = gripAt - 3.5, minusX = gripAt - 37;
  const buttons = [plusX, minusX].map((x, i) => piece(`Pinecil ${i ? '[-]' : '[+]'} button`, 'pinecil-button', [post('cap', 2.0, 0.7, [x, top, 0], 'abs', { color: 0x1d1e21, finish: 'moulded' })]));
  const marks = [box('mark', [2.4, 0.01, 2.4], [plusX - 3.6, top + 0.01, 0], '', { text: '+', ink: 0xd8d8d8, inkOnly: true, color: 0x16171a, rot: [0, PI / 2, 0] }),
    box('mark', [2.4, 0.01, 2.4], [minusX - 3.6, top + 0.01, 0], '', { text: '−', ink: 0xd8d8d8, inkOnly: true, color: 0x16171a, rot: [0, PI / 2, 0] })];
  const face = piece('Pinecil face marks', 'pinecil-shell', marks);
  const screws = [m2('tip screw (M2 × 3)', [L - 1.6, 5.3, 0], 1, 3), m2('case screw (M2 × 3)', [L - 1.6, -5.3, 0], -1, 3), m2('ground screw (M2 × 4)', [gripAt - 48, top, 0], 1, 4)];
  return { name: 'Pinecil V2 soldering iron', item: 'solderiron-pinecil-v2', at: [0, 0, 0], kids: [shell, sleeve, window, face, ...buttons, barrel, ...contacts, board, ...screws, tsTip(L)] };
}

/** A TS100-type tip cartridge, as PINE64's short tip: 86 mm long, 8.2 g, 6.2 Ω; its back (34 mm into the handle) a white
 *  insulator with its two contacts (a pin at its end, a ring before it), its stainless sleeve stepping to a collar that
 *  stops on the handle's nose, a thin neck, the heater's sleeve and the point: a B2 cone, its copper core iron-plated
 *  and bright with solder at its end, the rest chromed. Its steps read off the holder's photo (estimates, ±0.5 mm). */
export function tsTip(at = 103): Comp {
  const x0 = at - 34, c = at, nk = c + 3, hb = nk + 13, hs = hb + 1.6, pt = hs + 28, end = x0 + 86;
  const chrome = { color: 0xb9bcbe, finish: 'chrome' } as const;
  return { name: 'soldering tip (TS100 type, B2)', item: 'soldering-tip', at: [0, 0, 0], kids: [
    piece('tip contacts and insulator', 'tip-connector', [turned('body', [[0, x0 + 0.6], [1.5, x0 + 0.6], [1.5, x0 + 3], [0, x0 + 3]], 'alumina', { color: 0xeeebe2 }),
      turned('lead', [[0, x0], [0.7, x0], [0.7, x0 + 0.6], [0, x0 + 0.6]], 'nickel', { color: 0xd9dcdc, finish: 'bright' }), turned('lead', [[1.5, x0 + 1.6], [1.62, x0 + 1.6], [1.62, x0 + 2.3], [1.5, x0 + 2.3]], 'nickel', { color: 0xd9dcdc, finish: 'bright' })]),
    piece('tip sleeve', 'tip-sleeve', [turned('body', [[0, x0 + 3], [2.25, x0 + 3], [2.25, c], [3.65, c], [3.65, nk - 0.3], [1.4, nk], [1.4, hb], [2.1, hb], [2.1, pt], [0, pt]], 'stainless-304', { ...chrome, share: 0.8 })]),
    piece('tip heater', 'tip-heater', [turned('core', [[0, hb + 2], [1.2, hb + 2], [1.2, pt - 1], [0, pt - 1]], 'alumina', { color: 0x9a8f80 })]),
    piece('tip point', 'tip-core', [turned('core', [[0, pt], [2.1, pt], [1.6, pt + 2.2], [0.55, end - 0.35], [0.25, end - 0.08], [0, end]], 'copper', { color: 0xcfd1d0, finish: 'bright' })],
      // (the iron plating over its working end, a few tens of microns: drawn as a skin 0.05 mm over its last 4 mm)
      [piece('iron plating', 'iron-plating', [turned('film', [[0, end - 4], [1.05, end - 4], [0.6, end - 0.35], [0.3, end - 0.06], [0, end + 0.02]], 'steel-low', { color: 0xd4d6d6, finish: 'bright', share: 0.05 })])]),
    // (the dark band where the heater's sleeve meets the neck: its weld, read as a ring in the photo)
    piece('tip sleeve weld', 'tip-sleeve', [turned('band', [[1.4, hb], [2.12, hb], [2.12, hs], [1.4, hs]], 'stainless-304', { color: 0x4a4744, finish: 'ground' })]),
  ] };
}

// ---- Hakko CHP-170 flush cutters ------------------------------------------------------------------------------------
/** Hakko's CHP-170 micro cutter, closed: high-carbon steel 2.5 mm thick, about 138 mm over all, 62 g (Hakko's bulletin
 *  PB489), hardened to HRC 56; its jaws 8 mm long, its head 13.5 mm wide (Hisco's listing); its grips red and black
 *  (Adafruit's listing), a spring holding it open and the -A's safety clip keeping a cut lead; cutting 1.3 mm (16 AWG)
 *  copper at most with 5 kg on its grips (Hakko). Its outline between those an estimate. */
export function chp170(): Comp {
  const Lt = 138, jaw = 8, pivot = Lt - jaw - 6, headW = 13.5, t = 2.5;
  const steel = { color: 0x55595c, finish: 'ground' } as const;
  // (each half: its jaw tapering to its tip, the blade's flat on the cut's side; its head round the pivot; its handle a
  // flat steel bar under its grip, the halves crossed at the rivet)
  const half = (s: 1 | -1, k: number): Comp => {
    const jawPts: V2[] = [[pivot - 4, 0], [pivot + 2, 0], [Lt - 0.4, 0], [Lt, s * 0.2], [Lt - 3, s * headW * 0.22], [pivot + 2, s * headW / 2], [pivot - 4, s * headW / 2]];
    const sol = { role: 'body' as const, shape: { prism: { pts: jawPts.map(([x, z]) => [x, -z] as V2), L: t } }, at: [0, 0, 0] as V3, rot: [-PI / 2, 0, 0] as V3, mat: 'steel-tool', ...steel };
    const arm: Solid = { role: 'body', shape: { tube: { r: 2.1, pts: [[pivot - 3, 0, -s * 2.0], [pivot - 14, 0, -s * 4.6], [pivot - 40, 0, -s * 8.2], [62, 0, -s * 10.6], [14, 0, -s * 11.5]] } }, at: [0, 0, 0], mat: 'steel-tool', ...steel };
    // (its grip a dipped sleeve bowing out from the rivet to the handle's end, a cushion strip along its outer side)
    const path = (off: number): V3[] => [[pivot - 14, 0, -s * (4.6 + off)], [pivot - 40, 0, -s * (8.2 + off)], [62, 0, -s * (10.6 + off)], [26, 0, -s * (11.6 + off)], [8, 0, -s * (11 + off)]];
    const g = piece(`CHP-170 ${k ? 'lower' : 'upper'} grip`, 'handle-grip', [{ role: 'body', shape: { tube: { r: 5.8, pts: path(0) } }, at: [0, 0, 0], mat: 'pvc', color: 0xc4262e, finish: 'texture', share: 0.85 },
      { role: 'body', shape: { tube: { r: 3.0, pts: path(3.3).slice(1) } }, at: [0, 0, 0], mat: 'pvc', color: 0x18191b, finish: 'texture', share: 0.85 },
      // (its two ends rounded shut)
      { role: 'body', shape: { lathe: [[0, 0], [5.8, 0], [5.6, 1.4], [4.2, 3.4], [0, 4.4]] }, at: [8, 0, -s * 11], rot: [0, 0, PI / 2], mat: 'pvc', color: 0xc4262e, finish: 'texture' },
      { role: 'body', shape: { lathe: [[0, 0], [5.8, 0], [5.0, 1.6], [0, 2.6]] }, at: [pivot - 14, 0, -s * 4.6], rot: [0, -s * 0.14, -PI / 2], mat: 'pvc', color: 0xc4262e, finish: 'texture' }]);
    return { name: `CHP-170 ${k ? 'lower' : 'upper'} half`, item: 'plier-jaw', at: [0, 0, 0], solids: [sol, arm], kids: [g] };
  };
  const rivet = piece('CHP-170 pivot rivet', 'plier-rivet', [post('term', 2.0, 2 * t + 0.6, [pivot - 1, -t - 0.3, 0], 'steel-low', { color: 0x9fa3a6, finish: 'bright' })]);
  const spring = piece('CHP-170 spring', 'spring-leaf', [box('band', [22, 0.35, 5.6], [pivot - 22, 0, 0], 'steel-spring', { color: 0x8a8d90, finish: 'bright' })]);
  const clip = piece('CHP-170 safety clip', 'cutter-clip', [box('body', [7, 2.6, 6], [Lt - 5.5, t + 1.3, 1.5], 'pom', { color: 0xe9e4d6 })]);
  return { name: 'Hakko CHP-170 flush cutters', item: 'flushcutter-chp-170', at: [0, 0, 0], kids: [half(1, 0), half(-1, 1), rivet, spring, clip] };
}

// ---- a solderless breadboard ----------------------------------------------------------------------------------------
/** A breadboard's tie points as BusBoard makes them (BB400: 84 × 54.3 × 8.5 mm, 30 g, white ABS with a colour legend,
 *  0.1" square wire holes, phosphor-bronze clips, 300 tie points in 60 columns of five plus four power rails of 25; its
 *  datasheet, its weight its listing's); its holes where Fritzing's drawing of a half breadboard has them (rows a–e
 *  and f–j 2.54 apart, 7.62 across the channel between e and f; each pair of rails 2.54 apart, the inner one 7.62 out
 *  from row a or j; a rail's 25 holes in fives with a hole's gap between, from the first column to the 29th). Its 170
 *  and 830 the same rows, 17 and 63 columns, the 830's rails 50 holes (typical of the sizes sold); a 1660 two 830s
 *  side by side. Estimated, said so: the holes 1.0 mm square, the top 1.0 mm thick over walls 0.94 between its clips'
 *  slots (1.6 wide: the pitch less the wall), its clips 0.2 mm phosphor bronze bent to two leaves that pinch a lead
 *  0.16 mm apart, 4.2 mm tall, their fingers 1.8 wide on the 2.54 pitch (72 % of the strip, slit between), its channel
 *  2.5 wide and 2 deep, its backing 0.2. Frame: its columns along x, its rows across z (a at +z), its top at y 8.5. */
export const BB = { pitch: 2.54, rowsZ: [13.97, 11.43, 8.89, 6.35, 3.81, -3.81, -6.35, -8.89, -11.43, -13.97], rails: [24.13, 21.59, -21.59, -24.13], H: 8.5 } as const;
const BB_SIZE: Record<number, { cols: number; L: number; W: number; rails: boolean }> = { 170: { cols: 17, L: 47, W: 35.5, rails: false }, 400: { cols: 30, L: 84, W: 54.3, rails: true }, 830: { cols: 63, L: 165, W: 54.3, rails: true } };
/** Where column c (1-based) of a breadboard of this size sits along x, mm. */
export const bbCol = (points: number, c: number): number => (c - ((BB_SIZE[points] ?? BB_SIZE[400]!).cols + 1) / 2) * BB.pitch;
/** The rail holes' columns: groups of five with one left out between, centred on the columns. */
const railCols = (cols: number): number[] => { const n = cols >= 60 ? 10 : 5, span = n * 6 - 1, s = Math.floor((cols - span) / 2) + 1; return Array.from({ length: span }, (_, k) => k).filter((k) => k % 6 !== 5).map((k) => s + k); };
export function breadboard(points: number): Comp {
  if (points === 1660) { const one = breadboard(830); return { name: '1660-point breadboard', item: 'breadboard-1660', at: [0, 0, 0], kids: [-1, 1].map((s, i): Comp => ({ ...one, name: `${i ? 'second' : 'first'} 830-point half`, item: undefined, at: [0, 0, s * BB_SIZE[830]!.W / 2] })) }; }
  const S = BB_SIZE[points] ?? BB_SIZE[400]!, p = BB.pitch, { cols, L, W } = S, H = BB.H, skin = 1.0, back = 0.2, hole = 1.0, wall = 0.94;
  const white = { color: 0xf3f1ea } as const, xs = Array.from({ length: cols }, (_, i) => bbCol(points, i + 1)), rcols = S.rails ? railCols(cols) : [];
  const sq = (x: number, z: number, a: number, b = a): V2[] => [[x - a / 2, z - b / 2], [x + a / 2, z - b / 2], [x + a / 2, z + b / 2], [x - a / 2, z + b / 2]];
  // (its top: every hole cut through it, and the channel between e and f; drawn flat, its holes up through y)
  const holes = [...xs.flatMap((x) => BB.rowsZ.map((z) => sq(x, z, hole))), ...BB.rails.filter(() => S.rails).flatMap((z) => rcols.map((c) => sq(bbCol(points, c), z, hole))), sq(0, 0, (cols - 1) * p + 1.2, 2.5)];
  const top: Solid = { role: 'body', shape: { prism: { pts: sq(0, 0, L, W), L: skin, holes } }, at: [0, H - skin / 2, 0], rot: [PI / 2, 0, 0], mat: 'abs', ...white };
  const deep = H - skin - back, mid = back + deep / 2;
  // (its walls: round the outside, between every column's slot in each half, along each rail's slot, and the channel's
  // two sides and floor)
  const walls: Solid[] = [
    box('body', [L, deep, 1.0], [0, mid, W / 2 - 0.5], 'abs', white), box('body', [L, deep, 1.0], [0, mid, -W / 2 + 0.5], 'abs', white),
    box('body', [1.0, deep, W - 2], [L / 2 - 0.5, mid, 0], 'abs', white), box('body', [1.0, deep, W - 2], [-L / 2 + 0.5, mid, 0], 'abs', white),
    ...[1, -1].flatMap((s) => Array.from({ length: cols + 1 }, (_, i) => box('body', [wall, deep, 5 * p + 0.6], [bbCol(points, i + 0.5), mid, s * 8.89], 'abs', white))),
    // (the circuit slots' long sides: by the channel, and out to the rails' slots or the frame, the band between cored as
    // it is moulded, a wall at each side)
    ...[1, -1].flatMap((s) => { const out = S.rails ? 20.79 : W / 2 - 1; return [box('body', [L - 2, deep, 1.0], [0, mid, s * 1.74], 'abs', white), ...(out - 15.54 > 2.5 ? [box('body', [L - 2, deep, 1.0], [0, mid, s * 16.04], 'abs', white), box('body', [L - 2, deep, 1.0], [0, mid, s * (out - 0.5)], 'abs', white)] : [box('body', [L - 2, deep, out - 15.54], [0, mid, s * (15.54 + out) / 2], 'abs', white)])]; }),
    // (the channel's floor, 2 mm below the top, between the slots' walls)
    box('body', [(cols - 1) * p + 1.2, 0.8, 2.5], [0, H - 2.4, 0], 'abs', white),
    // (each pair of rails' slots: the wall between them, and to the frame)
    ...(S.rails ? [1, -1].flatMap((s) => [box('body', [L - 2, deep, 0.94], [0, mid, s * 22.86], 'abs', white), box('body', [L - 2, deep, W / 2 - 1 - 24.93], [0, mid, s * (24.93 + W / 2 - 1) / 2], 'abs', white)]) : []),
  ];
  // (its legend: each pair of rails a red line by its outer rail and a blue by its inner, as BusBoard's colour legend
  // has them (typical); its columns numbered every five and its rows lettered at both ends, ink on its top)
  const ink = (text: string, x: number, z: number, w: number): Solid => box('film', [w, 0.02, 1.4], [x, H + 0.04, z], '', { color: 0xf3f1ea, text, ink: 0x3a3a3a, inkOnly: true });
  const legend: Solid[] = [
    ...(S.rails ? [1, -1].flatMap((s) => [box('film', [L - 6, 0.02, 0.5], [bbCol(points, (rcols[0]! + rcols.at(-1)!) / 2), H + 0.02, s * 25.9], '', { color: 0xd8262b }), box('film', [L - 6, 0.02, 0.5], [bbCol(points, (rcols[0]! + rcols.at(-1)!) / 2), H + 0.02, s * 19.8], '', { color: 0x2a5bd7 })]) : []),
    ...[1, ...Array.from({ length: Math.floor(cols / 5) }, (_, i) => (i + 1) * 5)].flatMap((c) => [ink(String(c), bbCol(points, c), 16.3, 2.4), ink(String(c), bbCol(points, c), -16.3, 2.4)]),
    ...'abcdefghij'.split('').flatMap((ch, i) => [ink(ch, -((cols - 1) / 2) * p - 2.6, BB.rowsZ[i]!, 1.4), ink(ch, ((cols - 1) / 2) * p + 2.6, BB.rowsZ[i]!, 1.4)]),
  ];
  const body = piece(`${points}-point breadboard body`, 'breadboard-body', [top, ...walls, ...legend]);
  // (a clip's section: two leaves from a base, bent in to pinch and out to a mouth under the hole)
  const y0 = back + 2.0, clipPts: V2[] = ([[-0.65, 0], [0.65, 0], [0.65, 2.0], [0.23, 3.5], [0.45, 4.2], [0.27, 4.26], [0.03, 3.55], [0.45, 2.0], [0.45, 0.2], [-0.45, 0.2], [-0.45, 2.0], [-0.03, 3.55], [-0.27, 4.26], [-0.45, 4.2], [-0.23, 3.5], [-0.65, 2.0]] as V2[]).map(([u, v]) => [u, y0 + v]);
  const bronze = { color: 0xc9b37a, finish: 'plate', share: 0.72 } as const;
  const clips: Comp[] = [1, -1].flatMap((s) => xs.map((x, i): Comp => piece(`clip strip ${i + 1}${s > 0 ? 'a–e' : 'f–j'}`, 'clip-strip', [{ role: 'band', shape: { prism: { pts: clipPts, L: 5 * p - 0.3 } }, at: [x, 0, s * 8.89], mat: 'phosphor-bronze', ...bronze }])));
  const rails: Comp[] = S.rails ? BB.rails.map((z, i): Comp => { const a = bbCol(points, rcols[0]!), b = bbCol(points, rcols.at(-1)!);
    return piece(`power rail clip ${i + 1}`, 'rail-clip', [{ role: 'band', shape: { prism: { pts: clipPts, L: b - a + p - 0.3 } }, at: [(a + b) / 2, 0, z], rot: [0, PI / 2, 0], mat: 'phosphor-bronze', ...bronze }]); }) : [];
  const backing = piece('adhesive backing', 'adhesive-backing', [box('film', [L, back, W], [0, back / 2, 0], 'pet', { color: 0xe8e2d0 })]);
  return { name: `${points}-point breadboard`, item: `breadboard-${points}`, at: [0, 0, 0], kids: [body, ...clips, ...rails, backing] };
}

// ---- Atten's S-11 iron stand -----------------------------------------------------------------------------------------
/** Atten's S-11 soldering-iron stand, Adafruit's 150, as its dimensional drawing gives it (cold-rolled sheet; 170.0 ×
 *  78.3 mm over all, its base 168.3 × 74.9, a front ring 19 mm inside and a rear one 31.8, the rings' tops 95.5 and
 *  114.3 up; which figure is which read by their sizes, the drawing's picture not to hand here: an estimate), with its
 *  sponge (60 × 60 mm, Adafruit's replacements for it). Estimated, said so: the sheet 1.0 mm, its rim folded up 6, the
 *  rings 10 deep, the uprights 18 wide, the rings 75 apart; the sponge 10 thick, cellulose 5 % solid; four rubber feet
 *  13.18 across (the drawing's last figure, its use read as these) and 2 high; drawn zinc-plated, its finish not said.
 *  Frame: along x from its back (x 0), up y, its middle z 0; the iron lies in its rings, its tip forward over the
 *  sponge. */
export const S11 = { L: 168.3, W: 74.9, feet: 2, t: 1.0, rear: { x: 20, top: 114.3, id: 31.8 }, front: { x: 95, top: 95.5, id: 19 } } as const;
export function standS11(): Comp {
  const { L, W, t, feet } = S11, rim = 6, zinc = { color: 0xb7bcc1, finish: 'plate' } as const, y0 = feet;
  const base = piece('S-11 base', 'stand-base', [
    box('body', [L, t, W], [L / 2, y0 + t / 2, 0], 'steel-low', zinc),
    ...[1, -1].map((s) => box('body', [L, rim, t], [L / 2, y0 + rim / 2, s * (W / 2 - t / 2)], 'steel-low', zinc)),
    ...[t / 2, L - t / 2].map((x) => box('body', [t, rim, W - 2 * t], [x, y0 + rim / 2, 0], 'steel-low', zinc)),
  ]);
  // (each ring a short tube round the iron's line on an upright from the base)
  const ring = (nm: string, r: { x: number; top: number; id: number }): Comp => { const ri = r.id / 2, ro = ri + t, cy = y0 + r.top - ro, x0 = r.x - 5;
    return piece(nm, 'stand-ring', [turned('body', [[ri, x0], [ro, x0], [ro, x0 + 10], [ri, x0 + 10], [ri, x0]], 'steel-low', zinc, [0, cy, 0]), box('body', [t, cy - ro - y0 - t, 18], [r.x, y0 + t + (cy - ro - y0 - t) / 2, 0], 'steel-low', zinc)]); };
  const sponge = piece('S-11 sponge', 'tip-sponge', [box('body', [60, 10, 60], [L - 34, y0 + t + 5, 0], 'paper', { color: 0x3a6fd0, share: 0.05 })]);
  const foot = (x: number, z: number, i: number) => piece(`S-11 foot ${i + 1}`, 'stand-foot', [post('body', 13.18 / 2, feet, [x, 0, z], 'rubber', { color: 0x1c1c1e })]);
  return { name: 'Atten S-11 soldering iron stand', item: 'ironstand-s-11', at: [0, 0, 0], kids: [base, ring('S-11 rear ring', S11.rear), ring('S-11 front ring', S11.front), sponge, ...[[12, 28], [12, -28], [L - 12, 28], [L - 12, -28]].map(([x, z], i) => foot(x!, z!, i))] };
}
/** Where the Pinecil lies in the S-11, in the stand's frame (mm): its line through the rings, resting on their bottoms
 *  (its handle 16.2 high in the rear ring, its nose 11.2 across in the front), and the point along it (the iron's own
 *  x) that sits in the front ring. */
export function ironInStand(): { at: V3; dir: V3; frontX: number } {
  const y0 = S11.feet, rear: V2 = [S11.rear.x, y0 + S11.rear.top - S11.t - S11.rear.id / 2 - (S11.rear.id / 2 - 8.1)], front: V2 = [S11.front.x, y0 + S11.front.top - S11.t - S11.front.id / 2 - (S11.front.id / 2 - 5.6)];
  const dx = front[0] - rear[0], dy = front[1] - rear[1], n = Math.hypot(dx, dy), dir: V3 = [dx / n, dy / n, 0], frontX = 100;
  return { at: [front[0] - dir[0] * frontX, front[1] - dir[1] * frontX, 0], dir, frontX };
}

// ---- Hakko's 599B tip cleaner -----------------------------------------------------------------------------------------
/** Hakko's 599B tip cleaner: 70 mm across and 71 high (Hakko's page), 86 g (QSource's listing: 0.19 lb), a round
 *  holder whose top lifts off (Adafruit's photo of it apart, its brass ball inside) round its brass wool (599B-02;
 *  9 g, ItGresa's listing). Estimated, said so: the holder die-cast zinc, its material not published, its walls 0.7 mm
 *  (what brings the whole to its 86 g); its base 70 across rising to a cup 56 across, its top a sleeve over the cup with
 *  an opening 32 across where the tip goes in; the wool a ball 50 across, 2 % brass by volume. Frame: on its base at
 *  y 0, its axis y. */
export function hakko599B(): Comp {
  const zinc = { color: 0x8d9194, finish: 'cast' } as const, w = 0.7;
  // (each part a shell w thick along its outline: the base's floor, skirt and cup; the top's sleeve over the cup, its
  // shoulder and the lip of its opening)
  const shell = (pts: V2[]): V2[] => [...pts, ...pts.slice().reverse().map(([r, y], i, a) => { const q = a[Math.min(i + 1, a.length - 1)]!, p0 = a[Math.max(i - 1, 0)]!, dr = q[0] - p0[0], dy = q[1] - p0[1], n = Math.hypot(dr, dy) || 1; return [Math.max(0, r - (dy / n) * w), y + (dr / n) * w] as V2; })];
  const base = piece('599B holder base', 'cleaner-holder', [{ role: 'body', shape: { lathe: shell([[0, 0], [35, 0], [35, 4], [30.5, 9], [28, 26]]) }, at: [0, 0, 0], mat: 'zamak', ...zinc }]);
  const top = piece('599B holder top', 'cleaner-holder', [{ role: 'body', shape: { lathe: shell([[29.5, 22], [29.5, 52], [25, 66], [17.5, 71], [16, 71]]) }, at: [0, 0, 0], mat: 'zamak', ...zinc }]);
  const wool = piece('599B brass wool', 'brass-wool', [{ role: 'body', shape: { lathe: Array.from({ length: 13 }, (_, i): V2 => [25 * Math.sin((PI * i) / 12), -25 * Math.cos((PI * i) / 12)]) }, at: [0, w + 25, 0], mat: 'brass', color: 0xd4a640, finish: 'brushed', share: 0.02 }]);
  return { name: 'Hakko 599B tip cleaner', item: 'tipcleaner-599b', at: [0, 0, 0], kids: [base, top, wool] };
}

// ---- a reel of solder ------------------------------------------------------------------------------------------------
/** A 50 g reel of 0.5 mm rosin-core tin-lead solder, Adafruit's 1886 (Atten TS-635050: 63/37 since 2019, its listing).
 *  Its 50 g is 5.95 cm³ of 63/37 (8.4 g/cm³: 30 m of 0.5 mm wire), its rosin 2.2 % of its weight (typical of cored
 *  solder); its spool an estimate (a typical 50 g spool: flanges 38 across and 1.2 thick, a barrel 20 across and 20 long
 *  round a 12 mm bore, moulded polypropylene), the wire wound on it to the diameter that holds it, packed 78 % (round
 *  wire wound in layers, typical). Frame: its axis along z, standing on its flanges' rims (its middle 19 up). */
export function solderReel(): Comp {
  const R = 19, rb = 10, w = 20, f = 1.2, pack = 0.78, vol = 50 / 8.4 * 1000, Rw = Math.sqrt(rb * rb + vol / (Math.PI * w * pack));
  const pp = { color: 0x2d6fb8 } as const, rot: [number, number, number] = [PI / 2, 0, 0];
  const spool = piece('solder spool', 'solder-spool', [
    ...[-1, 1].map((s): Solid => ({ role: 'body', shape: { lathe: [[6, s * (w / 2) ], [R, s * (w / 2)], [R, s * (w / 2 + f)], [6, s * (w / 2 + f)], [6, s * (w / 2)]] }, at: [0, R, 0], rot, mat: 'pp', ...pp })),
    { role: 'body', shape: { lathe: [[6, -w / 2], [rb, -w / 2], [rb, w / 2], [6, w / 2], [6, -w / 2]] }, at: [0, R, 0], rot, mat: 'pp', ...pp }]);
  const wire = piece('solder wire, wound', 'solder-wire', [{ role: 'body', shape: { lathe: [[rb, -w / 2], [Rw, -w / 2], [Rw, w / 2], [rb, w / 2], [rb, -w / 2]] }, at: [0, R, 0], rot, mat: 'solder-snpb', color: 0xc6cacd, finish: 'brushed', share: pack }]);
  return { name: '50 g reel of 0.5 mm 63/37 solder', item: 'solderreel-ts-635050', at: [0, 0, 0], kids: [spool, wire] };
}

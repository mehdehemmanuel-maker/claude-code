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

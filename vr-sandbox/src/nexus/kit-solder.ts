// The soldering kit, each tool drawn whole from what its maker publishes, the rest an estimate said so: PINE64's
// Pinecil V2 (its handle, grip, stainless barrel, board, display, buttons, ports and screws; its tip, a TS100-type
// cartridge with its sleeve, heater, copper core and iron-plated point), and Hakko's CHP-170 flush cutters. Each part a
// piece under its inventory item, so the forge opens it part by part and the breakdown queue takes it to materials.
// Frames: the iron along +x from its handle's back (x 0) to its tip's point (x 155), its face (display and buttons)
// up (+y); the cutters along +x from their handles' ends to their jaws' tips, closed, lying flat (their faces ±y).

import type { Comp } from './sbc';
import type { Solid } from './packages';
import type { Print } from './kits';
import { BOARD_PARTS, chip } from './boardparts';
import { pcb, smallPart, type Hole, type SmallRow } from './sbc';

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
 *  (Adafruit's listing), a spring holding it open; cutting 1.3 mm (16 AWG) copper at most with 5 kg on its grips (Hakko).
 *  The CHP-170-A the same with a safety clip on its jaws that keeps a cut lead (Hakko's "type AF"): the plain one, as
 *  Adafruit sells it, has none. Its outline between those, and the clip's shape, an estimate. */
/** How far each half of the CHP-170 stands open about its rivet, its spring holding it so (rad: its jaws about 5 mm
 *  apart at the tip, its grips about 20° apart: an estimate, its maker gives no figure). */
export const CHP170_OPEN = 0.17;
export function chp170(withClip = false): Comp {
  const Lt = 138, jaw = 8, pivot = Lt - jaw - 6, headW = 13.5, t = 2.5;
  const steel = { color: 0x55595c, finish: 'ground' } as const;
  // (each half: its jaw tapering to its tip, the blade's flat on the cut's side; its head round the pivot; its handle a
  // flat steel bar under its grip, the halves crossed at the rivet)
  const half = (s: 1 | -1, k: number): Comp => {
    // (its jaw: its inner edge straight, the flush edge it cuts with, to its point; its outer edge curving out from the
    // point to its head, round about the rivet; the halves lying in one plane)
    const R = headW / 2, cx = pivot - 1, jawPts: V2[] = [[cx - R * 0.6, 0], [Lt - 0.4, 0], [Lt, s * 0.2],
      ...Array.from({ length: 9 }, (_, i): V2 => { const u = (i + 1) / 10; return [Lt - u * (Lt - cx), s * R * Math.pow(Math.sin((u * PI) / 2), 0.7)]; }),
      ...Array.from({ length: 6 }, (_, i): V2 => { const a = PI / 2 + ((i + 1) / 7) * (PI / 2) * 0.75; return [cx + R * Math.cos(a), s * R * Math.sin(a)]; })];
    const flat = (pts: V2[]) => ({ prism: { pts: pts.map(([x, z]) => [x, -z] as V2), L: t } });
    const sol = { role: 'body' as const, shape: flat(jawPts), at: [0, 0, 0] as V3, rot: [-PI / 2, 0, 0] as V3, mat: 'steel-tool', ...steel };
    // (its handle a flat forged bar 2.5 thick out of the head on the other side of the rivet, tapering from 8 mm wide at
    // the head to 6 at its end, under its grip: sized, with the grips, so the whole weighs Hakko's 62 g)
    const spine: V2[] = [[pivot - 3, -s * 2.0], [pivot - 14, -s * 4.6], [pivot - 40, -s * 8.2], [62, -s * 10.6], [14, -s * 11.5]];
    const side = (k: number): V2[] => spine.map(([x, z], i) => { const [px, pz] = spine[Math.max(0, i - 1)]!, [nx, nz] = spine[Math.min(spine.length - 1, i + 1)]!, dx = nx - px, dz = nz - pz, l = Math.hypot(dx, dz), w = 4 - (1 * i) / (spine.length - 1); return [x - (k * w * dz) / l, z + (k * w * dx) / l]; });
    const arm: Solid = { role: 'body', shape: flat([...side(1), ...side(-1).reverse()]), at: [0, 0, 0], rot: [-PI / 2, 0, 0], mat: 'steel-tool', ...steel };
    // (its grip a dipped sleeve bowing out from the rivet to the handle's end, a cushion strip along its outer side)
    // (its grip from 22 mm behind the rivet, where the handles are 11.4 apart, to the handle's end; 10 across (an
    // estimate), so the two clear each other when it is closed; its PVC round the steel inside it)
    const gr = 5.0, path = (off: number): V3[] => [[pivot - 22, 0, -s * (5.7 + off)], [pivot - 40, 0, -s * (8.2 + off)], [62, 0, -s * (10.6 + off)], [26, 0, -s * (11.6 + off)], [8, 0, -s * (11 + off)]];
    const g = piece(`CHP-170 ${k ? 'lower' : 'upper'} grip`, 'handle-grip', [{ role: 'body', shape: { tube: { r: gr, pts: path(0) } }, at: [0, 0, 0], mat: 'pvc', color: 0xc4262e, finish: 'texture', share: 0.78 },
      { role: 'body', shape: { tube: { r: 2.4, pts: path(3.0).slice(1) } }, at: [0, 0, 0], mat: 'pvc', color: 0x18191b, finish: 'texture', share: 0.85 },
      // (its two ends rounded shut)
      { role: 'body', shape: { lathe: [[0, 0], [gr, 0], [gr - 0.2, 1.2], [gr - 1.4, 2.9], [0, 3.6]] }, at: [8, 0, -s * 11], rot: [0, 0, PI / 2], mat: 'pvc', color: 0xc4262e, finish: 'texture' },
      { role: 'body', shape: { lathe: [[0, 0], [gr, 0], [gr - 0.7, 1.4], [0, 2.2]] }, at: [pivot - 22, 0, -s * 5.7], rot: [0, -s * 0.14, -PI / 2], mat: 'pvc', color: 0xc4262e, finish: 'texture' }]);
    // (standing open about the rivet as its spring holds it: the upper half turned one way, the lower the other)
    const th = -s * CHP170_OPEN, cx0 = pivot - 1;
    return { name: `CHP-170 ${k ? 'lower' : 'upper'} half`, item: 'plier-jaw', at: [cx0 * (1 - Math.cos(th)), 0, cx0 * Math.sin(th)], turn: th, solids: [sol, arm], kids: [g] };
  };
  // (its rivet: a shank through both halves, its heads domed over them, the halves' own steel colour (Hakko's photos: a
  // dark round head, not a bright disc); its sizes an estimate)
  const rivet = piece('CHP-170 pivot rivet', 'plier-rivet', [{ role: 'term', shape: { lathe: [[0, -t - 0.75], [1.6, -t - 0.68], [2.35, -t - 0.42], [2.6, -t - 0.15], [2.6, -t], [2.0, -t], [2.0, t], [2.6, t], [2.6, t + 0.15], [2.35, t + 0.42], [1.6, t + 0.68], [0, t + 0.75]] }, at: [pivot - 1, 0, 0], mat: 'steel-low', color: 0x5d6164, finish: 'ground' }]);
  // (its return spring: a strip bent to a V, its bend just behind the rivet, each leaf back to its own handle's inner
  // side 34 mm behind the rivet, so it holds the jaws open (Adafruit: "spring-loaded"); its shape an estimate)
  // (each leaf turned open with the half whose handle it presses, about the rivet)
  const open = (p: V2, th: number): V2 => { const cx0 = pivot - 1, x = p[0] - cx0, z = p[1]; return [cx0 + x * Math.cos(th) + z * Math.sin(th), -x * Math.sin(th) + z * Math.cos(th)]; };
  const leaf = (s: 1 | -1): Solid => { const th = s * CHP170_OPEN, a = open([pivot - 9, 0], th), b = open([pivot - 34, s * 3.9], th), len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return box('band', [len, 2.4, 0.35], [(a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2], 'steel-spring', { color: 0x8a8d90, finish: 'bright', rot: [0, -Math.atan2(b[1] - a[1], b[0] - a[0]), 0] }); };
  const spring = piece('CHP-170 spring', 'spring-leaf', [leaf(-1), leaf(1)]);
  const clip = piece('CHP-170 safety clip', 'cutter-clip', [box('body', [7, 2.6, 6], [Lt - 5.5, t + 1.3, 1.5], 'pom', { color: 0xe9e4d6 })]);
  return { name: `Hakko CHP-170${withClip ? '-A' : ''} flush cutters`, item: `flushcutter-chp-170${withClip ? '-a' : ''}`, at: [0, 0, 0], kids: [half(1, 0), half(-1, 1), rivet, spring, ...(withClip ? [clip] : [])] };
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
  // (its top: every hole cut through it; the channel between e and f its whole length, open at both its ends as
  // breadboards' photos show it (typical), so its top is two halves either side of it; drawn flat, its holes up through
  // y. Each half its white face 0.3 mm thick over the rest of its thickness, the same plastic in the shade of its holes:
  // a hole's wall 1 mm square and 1 mm deep sees little of the room, so a hole reads dark, not as its lit far wall)
  const ch = 1.25, face = 0.3, holes = [...xs.flatMap((x) => BB.rowsZ.map((z) => sq(x, z, hole))), ...BB.rails.filter(() => S.rails).flatMap((z) => rcols.map((c) => sq(bbCol(points, c), z, hole)))];
  const halfPts = (sg: number, inset: number): V2[] => { const z0 = sg * ch, z1 = sg * (W / 2 - inset); return [[-L / 2 + inset, Math.min(z0, z1)], [L / 2 - inset, Math.min(z0, z1)], [L / 2 - inset, Math.max(z0, z1)], [-L / 2 + inset, Math.max(z0, z1)]]; };
  const deep = H - skin - back, mid = back + deep / 2;
  // (what lies under its top sees the room only through its holes: a 1 mm square opening 2 mm above a clip's mouth
  // takes in its projected solid angle over π, about 8 % of the light in the open)
  const dark = { ...white, shade: 0.08 } as const;
  const tops: Solid[] = [1, -1].flatMap((sg): Solid[] => { const hs = holes.filter((h) => Math.sign(h[0]![1]) === sg);
    return [{ role: 'body', shape: { prism: { pts: halfPts(sg, 0), L: face, holes: hs } }, at: [0, H - face / 2, 0], rot: [PI / 2, 0, 0], mat: 'abs', ...white },
      { role: 'body', shape: { prism: { pts: halfPts(sg, 1.0), L: skin - face, holes: hs } }, at: [0, H - face - (skin - face) / 2, 0], rot: [PI / 2, 0, 0], mat: 'abs', ...white, shade: 0.25 }]; });
  // (its walls: round the outside, between every column's slot in each half, along each rail's slot, and the channel's
  // two sides and floor)
  const walls: Solid[] = [
    // (round the outside up to under its face: the long sides, each end either side of the channel and under its floor)
    ...[1, -1].map((sg) => box('body', [L, deep + skin - face, 1.0], [0, back + (deep + skin - face) / 2, sg * (W / 2 - 0.5)], 'abs', white)),
    ...[1, -1].flatMap((sx) => [1, -1].map((sg) => box('body', [1.0, deep + skin - face, W / 2 - 1 - ch], [sx * (L / 2 - 0.5), back + (deep + skin - face) / 2, sg * (ch + (W / 2 - 1 - ch) / 2)], 'abs', white))),
    ...[1, -1].map((sx) => box('body', [1.0, H - 2.8 - back, 2 * ch], [sx * (L / 2 - 0.5), back + (H - 2.8 - back) / 2, 0], 'abs', white)),
    ...[1, -1].flatMap((s) => Array.from({ length: cols + 1 }, (_, i) => box('body', [wall, deep, 5 * p + 0.6], [bbCol(points, i + 0.5), mid, s * 8.89], 'abs', dark))),
    // (the circuit slots' long sides: by the channel, and out to the rails' slots or the frame, the band between cored as
    // it is moulded, a wall at each side)
    ...[1, -1].flatMap((s) => { const out = S.rails ? 20.79 : W / 2 - 1; return [box('body', [L - 2, deep, 1.0], [0, mid, s * 1.74], 'abs', dark), ...(out - 15.54 > 2.5 ? [box('body', [L - 2, deep, 1.0], [0, mid, s * 16.04], 'abs', dark), box('body', [L - 2, deep, 1.0], [0, mid, s * (out - 0.5)], 'abs', dark)] : [box('body', [L - 2, deep, out - 15.54], [0, mid, s * (15.54 + out) / 2], 'abs', dark)])]; }),
    // (the channel's floor, 2 mm below the top, between the slots' walls)
    box('body', [L, 0.8, 2 * ch], [0, H - 2.4, 0], 'abs', { ...white, shade: 0.6 }) /* (a long slot 2.5 wide and 2 deep: its floor sees about half the sky, sin(atan(1.25 / 2)), and the light its white walls throw down) */,
    // (the channel's two sides, from its floor to under the face: an open groove's walls, half the sky each, not the dark of
    // a clip's slot behind them)
    ...[1, -1].map((sg) => box('body', [L, 2.0 - face, 0.05], [0, H - 2.0 + (2.0 - face) / 2, sg * (ch + 0.025)], 'abs', { ...white, shade: 0.6 })),
    // (each pair of rails' slots: the wall between them, and to the frame)
    ...(S.rails ? [1, -1].flatMap((s) => [box('body', [L - 2, deep, 0.94], [0, mid, s * 22.86], 'abs', dark), box('body', [L - 2, deep, W / 2 - 1 - 24.93], [0, mid, s * (24.93 + W / 2 - 1) / 2], 'abs', dark)]) : []),
  ];
  // (its legend: each pair of rails a red line by its outer rail and a blue by its inner, as BusBoard's colour legend
  // has them (typical); its columns numbered every five and its rows lettered at both ends, ink on its top)
  // (all of it one print on its face, as it is printed: one texture, not one for each number)
  const word = (t: string, x: number, z: number): Print => ({ t, at: [x, z], h: 1.1, ink: 0x3a3a3a });
  const railMid = S.rails ? bbCol(points, (rcols[0]! + rcols.at(-1)!) / 2) : 0;
  const legend: Solid[] = [{ role: 'film', shape: { box: [L, 0.01, W] }, at: [0, H + 0.02, 0], mat: '', color: 0xf3f1ea, prints: [
    ...(S.rails ? [1, -1].flatMap((s): Print[] => [{ at: [railMid, s * 25.9], lx: L - 6, wz: 0.5, ink: 0xd8262b }, { at: [railMid, s * 19.8], lx: L - 6, wz: 0.5, ink: 0x2a5bd7 }]) : []),
    ...[1, ...Array.from({ length: Math.floor(cols / 5) }, (_, i) => (i + 1) * 5)].flatMap((c) => [word(String(c), bbCol(points, c), 16.3), word(String(c), bbCol(points, c), -16.3)]),
    ...'abcdefghij'.split('').flatMap((ch, i) => [word(ch, -((cols - 1) / 2) * p - 2.6, BB.rowsZ[i]!), word(ch, ((cols - 1) / 2) * p + 2.6, BB.rowsZ[i]!)]),
  ] }];
  const body = piece(`${points}-point breadboard body`, 'breadboard-body', [...tops, ...walls, ...legend]);
  // (a clip's section: two leaves from a base, bent in to pinch and out to a mouth under the hole)
  const y0 = back + 2.0, clipPts: V2[] = ([[-0.65, 0], [0.65, 0], [0.65, 2.0], [0.23, 3.5], [0.45, 4.2], [0.27, 4.26], [0.03, 3.55], [0.45, 2.0], [0.45, 0.2], [-0.45, 0.2], [-0.45, 2.0], [-0.03, 3.55], [-0.27, 4.26], [-0.45, 4.2], [-0.23, 3.5], [-0.65, 2.0]] as V2[]).map(([u, v]) => [u, y0 + v]);
  const bronze = { color: 0xc9b37a, finish: 'plate', share: 0.72, shade: 0.08 } as const;
  const clips: Comp[] = [1, -1].flatMap((s) => xs.map((x, i): Comp => piece(`clip strip ${i + 1}${s > 0 ? 'a–e' : 'f–j'}`, 'clip-strip', [{ role: 'band', shape: { prism: { pts: clipPts, L: 5 * p - 0.3 } }, at: [x, 0, s * 8.89], mat: 'phosphor-bronze', ...bronze }])));
  const rails: Comp[] = S.rails ? BB.rails.map((z, i): Comp => { const a = bbCol(points, rcols[0]!), b = bbCol(points, rcols.at(-1)!);
    return piece(`power rail clip ${i + 1}`, 'rail-clip', [{ role: 'band', shape: { prism: { pts: clipPts, L: b - a + p - 0.3 } }, at: [(a + b) / 2, 0, z], rot: [0, PI / 2, 0], mat: 'phosphor-bronze', ...bronze }]); }) : [];
  const backing = piece('adhesive backing', 'adhesive-backing', [box('film', [L, back, W], [0, back / 2, 0], 'pet', { color: 0xe8e2d0 })]);
  return { name: `${points}-point breadboard`, item: `breadboard-${points}`, at: [0, 0, 0], kids: [body, ...clips, ...rails, backing] };
}

// ---- Adafruit's Perma-Proto half-sized breadboard PCB ----------------------------------------------------------------
/** Adafruit's Perma-Proto half-sized breadboard PCB (product 1609) as its Eagle board gives it (Adafruit's
 *  Adafruit-Perma-Proto-PCB repository, "adafruit permaproto halfbreadboard.brd"): 81.28 × 50.8 mm of 1.6 mm FR-4
 *  (0.063", its listing); 420 holes drilled 1.2 mm and plated, each a pad 1.93 across on both faces, in 30 columns 2.54
 *  apart (the first 3.81 in from its left edge), rows a–e and f–j 2.54 apart either side of a 7.62 gap, two pairs of
 *  rails 19.05 and 21.59 out from its middle, 30 holes each; two mounting holes 3.2 mm, not plated, at its middle line's
 *  ends 73.66 apart (2.9", its listing). Its underside bare (its listing: "no mask so you can easily cut traces"), each
 *  five holes of a column joined by a strip 0.41 mm wide and each rail by one 0.81, gold over copper (its
 *  listing: gold-plated pads; drawn bright, as plated gold is). Its top as
 *  Adafruit's photo of it shows it: white (#dcdcdc lit), its numbers, letters and words black, a red line by each + rail
 *  and a blue by each − (the board's tPlaceRed and tPlaceBlue layers, 0.41 wide), its corners round (the board file
 *  chamfers them 2.54; the photo's taken, the radius 2.5 an estimate). Its logo not drawn. Frame: its columns along x
 *  (1 at -x), its rows across z (a toward +z, as the BB400's), its top at y 0. */
export const PP = { L: 81.28, W: 50.8, t: 1.6, pitch: 2.54, cols: 30, drill: 1.2, pad: 1.9304,
  rowsZ: [13.97, 11.43, 8.89, 6.35, 3.81, -3.81, -6.35, -8.89, -11.43, -13.97], plus: [21.59, -19.05], minus: [19.05, -21.59], mount: 36.83 } as const;
/** Where column c (1–30) of a Perma-Proto sits along x, mm from its middle. */
export const ppCol = (c: number): number => -36.83 + (c - 1) * PP.pitch;
export function permaProto(): Comp {
  const { L, W, t, pitch: p, cols } = PP, cx = (c: number) => ppCol(c) + L / 2, rz = (z: number) => W / 2 - z;
  // (its holes, each its board file's via, mm from its lower-left corner: every column's ten rows and four rails)
  const zs = [...PP.rowsZ, ...PP.plus, ...PP.minus];
  const more: Hole[] = [...Array.from({ length: cols }, (_, i) => zs.map((z): Hole => ({ at: [cx(i + 1), rz(z)], d: PP.drill, pad: PP.pad, why: 'its board file: drilled 1.2, its pad 1.93 (0.076")' }))).flat(),
    ...[-1, 1].map((sx): Hole => ({ at: [L / 2 + sx * PP.mount, W / 2], d: 3.2, pad: 3.2, bare: true, why: 'its board file\'s hole: 3.2 mm, 73.66 apart (its listing\'s 2.9")' }))];
  // (its underside's copper: each column's five holes a strip, each rail a strip its length)
  const strips: [number, number, number, number][] = [...Array.from({ length: cols }, (_, i) => [1, -1].map((sg): [number, number, number, number] => [cx(i + 1), rz(sg * 8.89), 0.4064, 4 * p])).flat(),
    ...[...PP.plus, ...PP.minus].map((z): [number, number, number, number] => [L / 2, rz(z), (cols - 1) * p, 0.8128])];
  const board = pcb({ L, W, t, layers: 2, holes: [], hole: PP.drill, more, mask: 0xdcdcdc, under: 'bare', strips, corner: 2.5, bright: true });
  // (its silk, ink on its top: its column numbers over row j and under row a, its row letters at both ends, its words
  // across its middle; its rails' red and blue lines, a + at each + rail's ends and a short bar at each − rail's, as its
  // board file has them)
  const ink = 0x252221, red = 0xe1584c, blue = 0x1d8fbb;
  const word = (t: string, x: number, z: number, h: number, colour = ink): Print => ({ t, at: [x, z], h, ink: colour });
  const bar = (x: number, z: number, lx: number, wz: number, colour: number): Print => ({ at: [x, z], lx, wz, ink: colour });
  const prints: Print[] = [
    ...Array.from({ length: cols }, (_, i) => [-15.75, 15.75].map((z) => word(String(i + 1), ppCol(i + 1), z, 1.016))).flat(),
    ...'ABCDEFGHIJ'.split('').flatMap((ch, k) => [-39.2, 39.3].map((x) => word(ch, x, PP.rowsZ[k]!, 1.27))),
    word('Adafruit Perma-Proto 1/2 Sized Breadboard', 2.0, 0, 1.778),
    ...[23.368, -17.272].map((z) => bar(0, z, 73.66, 0.41, red)), ...[17.272, -23.368].map((z) => bar(0, z, 73.66, 0.41, blue)),
    ...[[-39.0, 23.6], [39.0, 23.6], [39.0, -17.0], [-39.0, -17.0]].map(([x, z]) => word('+', x!, z!, 2.0, red)),
    ...[[-38.862, -23.241], [39.116, -23.241], [39.116, 17.399], [-38.862, 17.399]].map(([x, z]) => bar(x!, z!, 0.41, 1.27, blue)),
  ];
  const silk: Solid[] = [{ role: 'film', shape: { box: [L, 0.01, W] }, at: [0, 0.06, 0], mat: '', color: 0xdcdcdc, prints }];
  return { name: 'Perma-Proto half-sized breadboard PCB', item: 'permaproto-half', at: [0, 0, 0], solids: silk, kids: [board] };
}

// ---- helping hands (Adafruit's 291, the MZ101) ----------------------------------------------------------------------
/** The "third hand" Adafruit sells as its 291 (the MZ101): a weighted base, an upright, a bar across it on a swivel, an
 *  alligator clip on a ball joint at each of the bar's ends, and a 2.5" (63.5 mm) 4x glass magnifier on its own arm,
 *  every joint turned by a thumbscrew or a wingnut, nickel-plated (Adafruit's and SE's listings); 127 × 81 × 61 mm as
 *  listed (Micro-Mark: its size folded, as boxed). Estimated, said so: its base cast iron 90 × 12 × 60, painted black (inside its box, 5.0 × 3.3 × 2.9" as listed, and light enough that
 *  its buyers call it a little tippy);
 *  its upright a 6.35 mm (1/4") rod 118 tall over the base; its bar a 4.8 mm rod 150 long, 120 up; each ball 10 across, each clip 50
 *  long on an arm of 3.2 mm rod; the magnifier's rim 4 thick, its arm a 3.2 rod. Posed holding a board 81 mm long by its
 *  ends, upside down, 95 mm over the bench: the lesson's hold. Frame: its base's middle on the bench at the origin, its
 *  bar along x, y up. */
export const HANDS = { base: [90, 12, 60] as V3, upright: { d: 6.35, h: 118 }, bar: { d: 4.8, L: 150, y: 120 }, ball: 10, clip: 50, hold: { y: 95, span: 81.28 }, lens: { d: 63.5, rim: 4 } } as const;
export function helpingHands(): Comp {
  const H = HANDS, [bl, bh, bw] = H.base, ni = { color: 0xc9ccce, finish: 'bright' } as const, z0 = -20, zb = 20, yb = H.hold.y;
  const rod = (name: string, item: string, pts: V3[], d: number): Comp => piece(name, item, [{ role: 'body', shape: { tube: { r: d / 2, pts } }, at: [0, 0, 0], mat: 'steel-low', ...ni }]);
  // (a wing nut, M4 zinc (DIN 315's proportions), its wings across a)
  const wing = (name: string, at: V3): Comp => ({ name, item: 'wingnut-m4-zinc', at, solids: [{ role: 'body', shape: { cyl: [4, 6] }, at: [0, 3, 0], mat: 'zinc', ...ni },
    ...[-1, 1].map((sg): Solid => box('body', [6, 8, 1.6], [sg * 6, 5, 0], 'zinc', ni))] });
  // (its cast base painted black in a crinkle finish, matte, as such stands are (an estimate: its listing says weighted))
  const base = piece('MZ101 base', 'hands-base', [box('body', [bl, bh, bw], [0, bh / 2, 0], 'cast-iron', { color: 0x1d1e20, finish: 'crinkle' })]);
  const upright = rod('MZ101 upright', 'hands-rod', [[0, bh - 6, z0], [0, bh + H.upright.h, z0]], H.upright.d);
  // (the swivel on the upright, its bar through it in front, a wing nut locking each)
  const swivel = piece('MZ101 swivel', 'hands-swivel', [box('body', [14, 14, 22], [0, H.bar.y, z0 + 5], 'zamak', ni)]);
  const bar = rod('MZ101 bar', 'hands-rod', [[-H.bar.L / 2, H.bar.y, z0 + 11], [H.bar.L / 2, H.bar.y, z0 + 11]], H.bar.d);
  // (each end's ball joint, its arm down and forward to its clip, the clip along x holding the board's end between its
  // jaws, the board 1.6 thick and its edge 8 mm in)
  const clip = (sx: 1 | -1): Comp => {
    const x0 = sx * (H.hold.span / 2 - 8), tip = (u: number) => x0 + sx * u, L = H.clip;
    // (each jaw pressed from 0.5 mm sheet into a channel 6 wide: two sides, toothed along their gripping edge, and the
    // web across their back; teeth 1 mm deep on a 2 mm pitch over its first 22 mm biting the board's faces, the jaws
    // closed square on it (their inner edges parallel to the pivot), tapering to the pivot at 30, its lever out behind;
    // satin nickel; typical of 50 mm clips)
    const t = 0.5, jaw = (sy: 1 | -1): Solid[] => { const y = (v: number) => yb + sy * v;
      const teeth: V2[] = Array.from({ length: 12 }, (_, i): V2 => [tip(i * 2), y(i % 2 ? 0.8 : 1.8)]);
      const side: V2[] = [...teeth, [tip(24), y(1.8)], [tip(30), y(1.9)], [tip(L), y(7)], [tip(L), y(9)], [tip(30), y(4.4)], [tip(0), y(3.4)]];
      const web: V2[] = [[tip(0), y(3.4)], [tip(30), y(4.4)], [tip(L), y(9)], [tip(L), y(9 - t)], [tip(30), y(4.4 - t)], [tip(0), y(3.4 - t)]];
      return [...[-1, 1].map((sz): Solid => ({ role: 'body', shape: { prism: { pts: side, L: t } }, at: [0, 0, zb + sz * (3 - t / 2)], mat: 'steel-low', ...ni, finish: 'ground' })),
        { role: 'body', shape: { prism: { pts: web, L: 6 } }, at: [0, 0, zb], mat: 'steel-low', ...ni, finish: 'ground' }]; };
    // (the rivet through both jaws' sides at the pivot, its heads domed; the spring wound on it, a leg along each lever's
    // inside pressing them apart, so the jaws close)
    const rivet: V2[] = [[0, -3.7], [0.9, -3.6], [1.25, -3.25], [1.25, -3.05], [0.75, -3.05], [0.75, 3.05], [1.25, 3.05], [1.25, 3.25], [0.9, 3.6], [0, 3.7]];
    const helix: V3[] = Array.from({ length: 37 }, (_, i): V3 => { const a = (i / 12) * 2 * PI; return [tip(30) + 1.55 * Math.cos(a) * sx, yb + 1.55 * Math.sin(a), zb - 2.1 + (i / 36) * 4.2]; });
    const coil: V3[] = [[tip(44), yb + 5.1, zb - 2.1], [tip(36), yb + 3.2, zb - 2.1], ...helix, [tip(36), yb - 3.2, zb + 2.1], [tip(44), yb - 5.1, zb + 2.1]];
    return { name: `MZ101 ${sx > 0 ? 'right' : 'left'} clip`, item: 'alligator-clip', at: [0, 0, 0], kids: [
      piece('clip jaws', 'alligator-jaw', [...jaw(1), ...jaw(-1), { role: 'body', shape: { lathe: rivet }, at: [tip(30), yb, zb], rot: [PI / 2, 0, 0], mat: 'steel-low', ...ni }]),
      piece('clip spring', 'spring-torsion', [{ role: 'body', shape: { tube: { r: 0.3, pts: coil } }, at: [0, 0, 0], mat: 'steel-spring', ...ni }]),
      // (the arm's end held in a sleeve on the upper lever's back, crimped round it (typical of such stands))
      piece('clip sleeve', 'alligator-jaw', [{ role: 'body', shape: { cyl: [2.2, 6] }, at: [tip(37.9), yb + 8.6, zb], rot: [0, 0, -0.62 * sx], mat: 'steel-low', ...ni, finish: 'ground' }])] };
  };
  const arm = (sx: 1 | -1): Comp[] => [
    piece(`MZ101 ${sx > 0 ? 'right' : 'left'} ball`, 'hands-ball', [{ role: 'body', shape: { lathe: Array.from({ length: 13 }, (_, i): V2 => [(H.ball / 2) * Math.sin((PI * i) / 12), -(H.ball / 2) * Math.cos((PI * i) / 12)]) }, at: [sx * H.bar.L / 2, H.bar.y, z0 + 11], mat: 'zamak', ...ni }]),
    rod(`MZ101 ${sx > 0 ? 'right' : 'left'} arm`, 'hands-rod', [[sx * H.bar.L / 2, H.bar.y, z0 + 11], [sx * (H.hold.span / 2 + 46), yb + 20, zb - 3], [sx * (H.hold.span / 2 + 39), yb + 10.2, zb]], 3.2),
    wing(`MZ101 ${sx > 0 ? 'right' : 'left'} ball's wing nut`, [sx * H.bar.L / 2, H.bar.y + H.ball / 2, z0 + 11]), clip(sx)];
  // (the magnifier on its arm from the swivel, up and out over the work, its rim chromed, its lens glass 2.5" across and
  // 8 thick at its middle (its 4x a sales figure; its curves an estimate), turned to look down at the board)
  const R = H.lens.d / 2, lens: V2[] = [[0, -4], ...Array.from({ length: 8 }, (_, i): V2 => [R * Math.sin(((i + 1) * PI) / 16), -4 + 3 * (1 - Math.cos(((i + 1) * PI) / 16))]), [R, 1], ...Array.from({ length: 8 }, (_, i): V2 => [R * Math.cos(((i + 1) * PI) / 16), 1 + 3 * Math.sin(((i + 1) * PI) / 16)]), [0, 4]];
  const mag: V3 = [0, H.bar.y + 55, zb + 30];
  const tilt: V3 = [-0.9, 0, 0], magnifier: Comp = { name: 'MZ101 magnifier', item: 'magnifier-lens', at: [0, 0, 0], solids: [
    { role: 'body', shape: { lathe: [[R - 0.5, -H.lens.rim / 2], [R + 3, -H.lens.rim / 2], [R + 3, H.lens.rim / 2], [R - 0.5, H.lens.rim / 2], [R - 0.5, -H.lens.rim / 2]] }, at: mag, rot: tilt, mat: 'steel-low', ...ni },
    { role: 'body', shape: { lathe: lens }, at: mag, rot: tilt, mat: 'glass', color: 0xeef4f2 }] };
  const magArm = rod('MZ101 magnifier arm', 'hands-rod', [[0, H.bar.y + 7, z0 + 5], [0, H.bar.y + 40, z0 + 8], [0, mag[1] - (R + 3) * Math.cos(0.9), mag[2] - (R + 3) * Math.sin(0.9)]], 3.2);
  return { name: 'MZ101 helping hands with magnifier', item: 'helpinghands-mz101', at: [0, 0, 0], kids: [base, upright, swivel, bar, wing('MZ101 swivel wing nut', [0, H.bar.y + 7, z0 - 2]), ...arm(1), ...arm(-1), magArm, magnifier] };
}

// ---- Atten's S-11 iron stand -----------------------------------------------------------------------------------------
/** Atten's S-11 soldering-iron stand, Adafruit's 150, as its dimensional drawing gives it (cold-rolled sheet; 170.0 ×
 *  78.3 mm over all, its base 168.3 × 74.9, a front ring 19 mm inside and a rear one 31.8, the rings' tops 95.5 and
 *  114.3 up; which figure is which read by their sizes, the drawing's picture not to hand here: an estimate), with its
 *  sponge (60 × 60 mm, Adafruit's replacements for it; blue, as Adafruit's photos of its stand (150) show it). Estimated, said so: the sheet 1.0 mm, its rim folded up 6, the
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
 *  an opening 32 across where the tip goes in; the wool packed to that opening, under 1 % brass by volume (its 9 g). Frame: on its base at
 *  y 0, its axis y. */
export function hakko599B(): Comp {
  const zinc = { color: 0x8d9194, finish: 'cast' } as const, w = 0.7;
  // (each part a shell w thick along its outline: the base's floor, skirt and cup; the top's sleeve over the cup, its
  // shoulder and the lip of its opening)
  const shell = (pts: V2[]): V2[] => [...pts, ...pts.slice().reverse().map(([r, y], i, a) => { const q = a[Math.min(i + 1, a.length - 1)]!, p0 = a[Math.max(i - 1, 0)]!, dr = q[0] - p0[0], dy = q[1] - p0[1], n = Math.hypot(dr, dy) || 1; return [Math.max(0, r - (dy / n) * w), y + (dr / n) * w] as V2; })];
  const base = piece('599B holder base', 'cleaner-holder', [{ role: 'body', shape: { lathe: shell([[0, 0], [35, 0], [35, 4], [30.5, 9], [28, 26]]) }, at: [0, 0, 0], mat: 'zamak', ...zinc }]);
  const top = piece('599B holder top', 'cleaner-holder', [{ role: 'body', shape: { lathe: shell([[29.5, 22], [29.5, 52], [25, 66], [17.5, 71], [16, 71]]) }, at: [0, 0, 0], mat: 'zamak', ...zinc }]);
  // (the wool packed to the holder's mouth, filling the cup and the sleeve's dome, its top showing in the opening
  // (Hakko's photos of it in use); its share of solid brass what makes its 9 g)
  const woolPts: V2[] = [[0, w], [27.5, w], [28.6, 10], [28.6, 50], [24.5, 63.5], [16.8, 69.4], [10, 71.0], [0, 71.6]];
  const woolVol = (Math.PI / 3) * Math.abs(woolPts.reduce((a, [r, y], i) => { const [r2, y2] = woolPts[(i + 1) % woolPts.length]!; return a + (y2 - y) * (r * r + r * r2 + r2 * r2); }, 0));
  // (on its top, where the opening shows it, the wool as it is: a shaving of brass about 0.4 mm wide curled in loops 3 to
  // 5 mm round, wandering over the bed and over itself (Hakko's photos: a tangle, not a surface), the bed dark between
  // its turns; one strand of five sides, so one light mesh; the bed under it carries the rest of the 9 g. Its width and
  // loops typical of brass shavings, an estimate)
  let seed = 599; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }, bedTop = (r: number) => (r < 10 ? 71.6 - 0.06 * r : 71.0 - ((r - 10) / 6.8) * 1.6), curl: V3[] = [];
  { let cx = 0, cz = 0, tx = 0, tz = 0, a = 0, R = 2;
    for (let i = 0; i < 1500; i++) {
      if (i % 14 === 0) { const g = rnd() * 2 * PI, rr = 15 * Math.sqrt(rnd()); tx = rr * Math.cos(g); tz = rr * Math.sin(g); R = 1.5 + rnd(); }
      cx += (tx - cx) * 0.1; cz += (tz - cz) * 0.1; a += 0.75 + 0.4 * rnd();
      let x = cx + R * Math.cos(a), z = cz + R * Math.sin(a) * 0.8; const rr = Math.hypot(x, z); if (rr > 15.4) { x *= 15.4 / rr; z *= 15.4 / rr; }
      curl.push([x, bedTop(Math.hypot(x, z)) + 0.2 + 0.9 * Math.sin(a * 0.5 + i * 0.07), z]);
    } }
  const strandR = 0.2, strandL = curl.reduce((t, q, i) => (i ? t + Math.hypot(q[0] - curl[i - 1]![0], q[1] - curl[i - 1]![1], q[2] - curl[i - 1]![2]) : 0), 0), strandG = Math.PI * strandR * strandR * strandL * 0.0085;
  const wool = piece('599B brass wool', 'brass-wool', [{ role: 'body', shape: { lathe: [...woolPts, [0, w]] }, at: [0, 0, 0], mat: 'brass', color: 0x5e4a22, finish: 'cast', share: (9 - strandG) / (woolVol * 0.0085) },
    { role: 'body', shape: { tube: { r: strandR, pts: curl, sides: 5 } }, at: [0, 0, 0], mat: 'brass', color: 0xd9b25a, finish: 'bright' }]);
  return { name: 'Hakko 599B tip cleaner', item: 'tipcleaner-599b', at: [0, 0, 0], kids: [base, top, wool] };
}

// ---- an AA alkaline cell, and Adafruit's 3951 holder with its knife switch ----------------------------------------------
/** An AA alkaline cell (IEC 60086-2's LR6: 13.5–14.5 mm across and 49.2–50.5 long, its + nub at most 5.5 across and at
 *  least 1 high), as makers' cross-sections draw it: a nickel-plated steel can, its + terminal, holding a ring of
 *  pressed manganese dioxide and graphite against its wall; inside that a paper separator and the zinc gel anode, a
 *  brass nail down it welded to the − cap; a nylon seal under the cap; a printed sleeve round the can. Estimated, said
 *  so: the can 14.0 across, 0.25 thick (0.3 at its top); the cathode ring 2.3 thick, 3.2 g/cm³ pressed; the anode gel
 *  8.7 across, 2.8 g/cm³; the nail 1.3 across; the seal 1.7 thick; so the whole about 24 g against the 23 g typical of an
 *  alkaline AA. Its wrap's print not drawn. Frame: its axis up y, its − end on y 0, its + nub up. */
export const AA = { D: 14.0, H: 50.3, nub: 5.5 } as const;
export function aaCell(): Comp {
  const R = AA.D / 2, w = 0.25, top = 48.9, steel = { color: 0xc9cdd0, finish: 'bright' } as const;
  const can = piece('AA cell can', 'battery-can', [{ role: 'body', shape: { lathe: [[0, AA.H], [AA.nub / 2, AA.H], [AA.nub / 2, top + 0.3], [R, top], [R, 1.2], [R - 0.45, 0.75], [R - 0.45 - w, 0.75], [R - w, 1.2], [R - w, top - 0.3], [0, top - 0.3], [0, AA.H]] }, at: [0, 0, 0], mat: 'steel-low', ...steel }]);
  const cathode = piece('AA cell cathode', 'cathode-ring', [{ role: 'body', shape: { lathe: [[4.45, 2.5], [R - w, 2.5], [R - w, 47.5], [4.45, 47.5], [4.45, 2.5]] }, at: [0, 0, 0], mat: 'mno2', color: 0x2b2b2b }]);
  const sep = piece('AA cell separator', 'cell-separator', [{ role: 'body', shape: { lathe: [[4.35, 2.5], [4.45, 2.5], [4.45, 45], [4.35, 45], [4.35, 2.5]] }, at: [0, 0, 0], mat: 'paper', color: 0xe8e2d0 }]);
  const anode = piece('AA cell anode', 'anode-gel', [{ role: 'body', shape: { lathe: [[0.65, 3], [4.35, 3], [4.35, 44], [0, 44], [0, 33], [0.65, 33], [0.65, 3]] }, at: [0, 0, 0], mat: 'zinc-gel', color: 0x8e9294 }]);
  const nail = piece('AA cell collector', 'current-collector', [post('body', 0.65, 32.7, [0, 0.3, 0], 'brass', { color: 0xc8a04a, finish: 'bright' })]);
  const seal = piece('AA cell seal', 'cell-seal', [{ role: 'body', shape: { lathe: [[0.65, 0.3], [R - 0.5, 0.3], [R - w, 2.0], [0.65, 2.0], [0.65, 0.3]] }, at: [0, 0, 0], mat: 'nylon', color: 0xe9e4d6 }]);
  const cap = piece('AA cell − cap', 'negative-cap', [{ role: 'body', shape: { lathe: [[0, 0], [5.9, 0], [6.3, 0.3], [0, 0.3], [0, 0]] }, at: [0, 0, 0], mat: 'steel-low', ...steel }]);
  const label = piece('AA cell sleeve', 'battery-label', [{ role: 'body', shape: { lathe: [[R, 0.6], [R + 0.07, 0.6], [R + 0.07, top - 0.1], [R - 0.6, top + 0.2], [R - 0.6, top + 0.13], [R, top - 0.17], [R, 0.6]] }, at: [0, 0, 0], mat: 'pet', color: 0x3a3d42, finish: 'paint' }]);
  return { name: 'AA alkaline cell', item: 'battery-aa-alkaline', at: [0, 0, 0], kids: [can, cathode, sep, anode, nail, seal, cap, label] };
}
/** Adafruit's 3951: a 2 × AA holder with a knife switch (58 × 32 × 14 mm without its leads, the switch 32 long, its
 *  leads about 130 mm with crimped ends since 2022: its listing; black plastic, metal contacts, red and black leads,
 *  the switch standing up when open, perpendicular to the holder: its photos' captions). Estimated, said so: its tray
 *  ABS 1.2 mm thick, open on top so the cells stand 1.4 above its walls; at one end a coil spring for one cell's − and
 *  a plate for the other's +, joined by a strap (the cells in series); at the other end a plate and a spring, the + plate
 *  to the switch's hinge and the red lead from its clip, the black lead from the spring; the switch across that end's
 *  top (its 32 mm the holder's width): a phenolic base, a brass blade 26 long hinged at one side, closing into a brass
 *  clip at the other, a black knob on its end; the leads 22 AWG, laid straight out. Frame: along x (its switch end
 *  +x), across z, up y, its floor on y 0. */
export const H3951 = { L: 58, W: 32, H: 14, wall: 1.2, lead: 130, blade: 26, sx: 27.1 } as const;
export function holder3951(open = true): Comp {
  const { L, W, H, wall: t } = H3951, black = { color: 0x1a1a1b, finish: 'moulded' } as const, ni = { color: 0xc6c9cb, finish: 'bright' } as const, br = { color: 0xc89b45, finish: 'bright' } as const;
  const body = piece('3951 holder', 'holder-body', [box('body', [L, t, W], [0, t / 2, 0], 'abs', black), ...[-1, 1].map((sz): Solid => box('body', [L, H - t, t], [0, t + (H - t) / 2, sz * (W / 2 - t / 2)], 'abs', black)),
    ...[-1, 1].map((sx): Solid => box('body', [t, H - t, W - 2 * t], [sx * (L / 2 - t / 2), t + (H - t) / 2, 0], 'abs', black)), box('body', [L - 2 * t - 8, 3, 1.0], [0, t + 1.5, 0], 'abs', black)]);
  // (its contacts: a coil spring where a cell's − end sits, a plate where its + sits; cell A (+z) its + toward +x)
  const zA = 7.6, x0 = L / 2 - t;
  const spring = (x: number, z: number, sx: number): Solid => ({ role: 'body', shape: { tube: { r: 0.25, pts: Array.from({ length: 61 }, (_, i): V3 => { const a = (i / 10) * 2 * PI, r = 3.6 - (i / 60) * 1.2; return [x - sx * (i / 60) * 4.6, t + 7.1 + r * Math.sin(a), z + r * Math.cos(a)]; }) } }, at: [0, 0, 0], mat: 'steel-spring', ...ni });
  const plate = (x: number, z: number): Solid => box('body', [0.4, 8, 8], [x, t + 7.1, z], 'steel-spring', ni);
  const contacts = [piece('3951 − spring, cell A', 'battery-contact', [spring(-x0, zA, -1)]), piece('3951 + plate, cell B', 'battery-contact', [plate(-x0 + 0.2, -zA), box('body', [0.4, 3, 2 * zA], [-x0 + 0.2, t + 3, 0], 'steel-spring', ni)]),
    piece('3951 + plate, cell A', 'battery-contact', [plate(x0 - 0.2, zA)]), piece('3951 − spring, cell B', 'battery-contact', [spring(x0, -zA, 1)])];
  // (its knife switch across the + end's top, over its end wall and past the cells' ends (they stand 1.4 above the
  // walls): base, hinge post, clip, blade (up when open), knob)
  const sx = H3951.sx, yb = H, hz = -(W / 2 - 3), cz = W / 2 - 3, B = H3951.blade;
  const bladeAt: { at: V3; rot: V3 } = open ? { at: [sx, yb + 3 + B / 2, hz], rot: [0, 0, 0] } : { at: [sx, yb + 3, hz + B / 2], rot: [PI / 2, 0, 0] };
  const knife = piece('3951 knife switch', 'knife-switch', [box('body', [3.6, 1.6, W - 2], [sx, yb + 0.8, 0], 'abs', { color: 0x3b2a1e, finish: 'moulded' }), box('body', [3, 4.5, 1.6], [sx, yb + 3.8, hz], 'brass', br),
    ...[-1, 1].map((d): Solid => box('body', [0.5, 4.5, 2.2], [sx + d * 1.0, yb + 3.8, cz], 'brass', br)),
    { role: 'body', shape: { box: [1.2, B, 0.8] }, at: bladeAt.at, rot: [bladeAt.rot[0], 0, 0], mat: 'brass', ...br },
    { role: 'body', shape: { cyl: [2.2, 6] }, at: open ? [sx, yb + 3 + B + 2.5, hz] : [sx, yb + 3, hz + B + 2.5], rot: open ? [0, 0, 0] : [PI / 2, 0, 0], mat: 'abs', ...black }]);
  // (its leads, laid straight out from the switch end: red from the switch's clip, black from cell B's − spring)
  const wire = (name: string, z: number, colour: number): Comp => piece(name, 'wire-hookup', [{ role: 'body', shape: { tube: { r: 0.75, pts: [[L / 2, yb - 3, z], [L / 2 + 15, 1.0, z], [L / 2 + H3951.lead, 0.75, z]] } }, at: [0, 0, 0], mat: 'pvc', color: colour }]);
  return { name: 'Adafruit 3951 battery holder', item: 'switchholder-3951', at: [0, 0, 0], kids: [body, ...contacts, knife, wire('3951 red lead', cz - 2, 0xc62828), wire('3951 black lead', -zA, 0x1e1e1e)] };
}

// ---- Chip Quik's CQ4LF flux pen ------------------------------------------------------------------------------------
/** Chip Quik's CQ4LF no-clean liquid flux pen, as Adafruit sells it (its 3468): 10 ml of flux (INM0: no halide; Chip
 *  Quik's own showcase calls it VOC-, halide- and rosin-free, so water-borne: its density taken as water's, an
 *  estimate) behind a felt nib, under a cap; 132.0 × 16.0 × 16.0 mm and 19.5 g as listed. Its barrel white, its cap
 *  black, its nib pale yellow (as two image listings describe its photos; this network cannot reach them). Estimated,
 *  said so: its barrel 14 mm across, polypropylene 1.3 mm thick round a bore 11.4 that holds its 10 ml in 97 mm, a
 *  collar the cap grips and a nose holding the nib 4.1 mm across and 7 out; its cap 16 across and 31 long; its valve,
 *  its label and its print not drawn. Drawn so it weighs about 18.6 g. Frame: standing, its axis up y, its back end
 *  at the origin, its nib up. */
export const CQ4LF = { L: 132, D: 16, barrel: 14, bore: 11.4, ml: 10, g: 19.5 } as const;
export function cq4lf(): Comp {
  const R = CQ4LF.barrel / 2, rb = CQ4LF.bore / 2, white = { color: 0xf1f1ee, finish: 'moulded' } as const, black = { color: 0x1b1b1c, finish: 'moulded' } as const;
  // (its barrel: a tube closed at its back 3 mm thick; its front a collar 13 across the cap grips, tapering to a nose
  // round the nib's bore 4.2 across)
  const barrel = piece('CQ4LF barrel', 'pen-barrel', [{ role: 'body', shape: { lathe: [[0, 0], [R, 0], [R, 100], [6.5, 100.5], [6.5, 112], [3.4, 117.5], [2.1, 118], [2.1, 100.5], [rb, 100], [rb, 3], [0, 3], [0, 0]] }, at: [0, 0, 0], mat: 'pp', ...white }]);
  // (the flux filling its bore: 97 mm of it, 9.7 ml, drawn though the barrel hides it)
  const flux = piece('CQ4LF flux', 'flux-no-clean', [post('body', rb - 0.05, 97, [0, 3, 0], 'water', { color: 0xd9c98f })]);
  // (its nib: a rod of bonded polyester fibre, its end rounded, from inside the nose to 7 mm past it)
  const nib = piece('CQ4LF nib', 'felt-nib', [{ role: 'body', shape: { lathe: [[0, 104], [2.05, 104], [2.05, 121], [1.8, 123.5], [1.0, 124.7], [0, 125], [0, 104]] }, at: [0, 0, 0], mat: 'pet', color: 0xe8dc9c, finish: 'texture' }]);
  // (its cap: a cup 16 across gripping the collar, its top 2 mm thick, its rim rounded)
  const cap = piece('CQ4LF cap', 'pen-cap', [{ role: 'body', shape: { lathe: [[6.55, 100.8], [8, 100.8], [8, 131.2], [7.2, 132], [0, 132], [0, 130], [6.55, 130], [6.55, 100.8]] }, at: [0, 0, 0], mat: 'pp', ...black }]);
  return { name: 'Chip Quik CQ4LF flux pen', item: 'fluxpen-cq4lf', at: [0, 0, 0], kids: [barrel, flux, nib, cap] };
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
    // (each flange 1.2 thick, its rim a bead 2.0 thick round its edge, as a moulded spool stiffens its flanges: an
    // estimate; its bore 12 mm through)
    ...[-1, 1].map((s): Solid => ({ role: 'body', shape: { lathe: ([[6, w / 2], [R - 1.5, w / 2], [R - 1.5, w / 2 - 0.4], [R, w / 2 - 0.4], [R, w / 2 + f + 0.4], [R - 1.5, w / 2 + f + 0.4], [R - 1.5, w / 2 + f], [6, w / 2 + f], [6, w / 2]] as V2[]).map(([r, y]): V2 => [r, s * y]) }, at: [0, R, 0], rot, mat: 'pp', ...pp })),
    { role: 'body', shape: { lathe: [[6, -w / 2], [rb, -w / 2], [rb, w / 2], [6, w / 2], [6, -w / 2]] }, at: [0, R, 0], rot, mat: 'pp', ...pp }]);
  // (its outer layer the wire itself, wound as it is: a helix of 0.5 mm wire turn against turn across the barrel; the
  // layers under it as one body packed so that, with the outer layer, it holds the reel's 50 g)
  const d = 0.5, Rh = Rw - d / 2, n = Math.floor((w - d) / d), per = 24, z0 = -w / 2 + d / 2;
  const helix: V3[] = Array.from({ length: n * per + 1 }, (_, i): V3 => { const a = (2 * PI * i) / per; return [Rh * Math.cos(a), R + Rh * Math.sin(a), z0 + (i / per) * ((w - d) / n)]; });
  const outer = PI * (d / 2) ** 2 * n * 2 * PI * Rh, core = PI * ((Rw - d) ** 2 - rb * rb) * w;
  const wire = piece('solder wire, wound', 'solder-wire', [{ role: 'body', shape: { lathe: [[rb, -w / 2], [Rw - d, -w / 2], [Rw - d, w / 2], [rb, w / 2], [rb, -w / 2]] }, at: [0, R, 0], rot, mat: 'solder-snpb', color: 0xc6cacd, finish: 'brushed', share: (vol - outer) / core },
    { role: 'body', shape: { tube: { r: d / 2, pts: helix } }, at: [0, 0, 0], mat: 'solder-snpb', color: 0xc6cacd, finish: 'brushed' }]);
  // (a paper label on each flange's face, its figures the reel's own: no maker's artwork, which is not to hand; its
  // weight a few hundredths of a gram, not counted)
  const label = (s: 1 | -1): Solid => box('film', [16, 7, 0.1], [0, R + 10.5, s * (w / 2 + f + 0.05)], '', { color: 0xf4f1e8, text: '63/37  0.5 mm\n50 g', ink: 0x23262b });
  spool.solids!.push(label(1), label(-1));
  return { name: '50 g reel of 0.5 mm 63/37 solder', item: 'solderreel-ts-635050', at: [0, 0, 0], kids: [spool, wire] };
}

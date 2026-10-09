// The parts a board is made of, each drawn from its maker's drawing or its standard before any board is put together
// from them (the user: "make sure the smallest sub sub components are accurate and then so on"). Each part is its
// pieces as they are made: a socket's stamped shell drawn round its open mouth, the moulded insulator or tongue in it,
// each contact on its own; a header's pins in their strip; a switch's frame, dome, plunger and terminals; a chip's balls,
// substrate, moulding and die. Each piece is the inventory's own part (src/nexus/inventory.ts), so the breakdown queue
// and the drawing agree on what is in it.
//
// Sizes: where a maker's drawing is named, from it (most through KiCad's footprints, which are drawn from datasheets and
// name them: tools/measure/kicad.py reads them); where a standard fixes it (a USB Type-C receptacle's opening, a 2.54 mm
// header's pitch), from the standard; else measured from photos (tools/measure/photo.py) or typical, and said so. A part
// that only fits a maker's part by its size says "fits by size", never that it is that part.
//
// Its frame: the board's top face y = 0, the part standing on it; its depth along x with its mouth (where a plug, a card
// or a cable goes in) at +x, its width along z, centred on its footprint. A board places it (src/nexus/sbc.ts).

import type { Comp } from './sbc';
import { pkgItem, pkgOf, pkgSolids, type Solid } from './packages';

type V3 = [number, number, number];
type V2 = [number, number];
const PI = Math.PI;
/** Colours as the parts are: a stamped steel or stainless shell, gold contacts, black LCP or PBT, an FPC's ivory LCP,
 *  USB 3.0's blue (its spec's Pantone 300C), a moulded inductor's grey. A metal's colour is what it reflects head on, as
 *  the viewer draws metal: gold's about (1.0, 0.77, 0.34) in linear light (physically based renderers' tables, Real-Time
 *  Rendering 4th ed.), so its plating shows as bright as the room it mirrors. */
// (nickel: its reflectance head on, linear (0.660, 0.609, 0.526) as physically based renderers' tables give it, in sRGB;
// a connector's shell is nickel-plated, and Raspberry Pi 5's photo shows its shells as warm as this, #988f84 in shade)
export const HUE = { nickel: 0xd3ccbf, steel: 0xc6cacd, stainless: 0xd2d5d7, gold: 0xffe29b, tin: 0xb9bcbf, black: 0x19191b, ivory: 0xebe4d2, usb3: 0x1f5fbf, white: 0xf0efea, brown: 0x4a3324, die: 0x101216, ferrite: 0x3d3d40 };
const box = (role: Solid['role'], b: V3, at: V3, mat: string, more: Partial<Solid> = {}): Solid => ({ role, shape: { box: b }, at, mat, ...more });
/** A section drawn along x: its outline in (across, up) less its openings, through `len` mm from x0. */
const along = (role: Solid['role'], outline: V2[], holes: V2[][], len: number, x0: number, mat: string, more: Partial<Solid> = {}): Solid =>
  ({ role, shape: { prism: { pts: outline, L: len, ...(holes.length ? { holes } : {}) } }, at: [x0 + len / 2, 0, 0], rot: [0, PI / 2, 0], mat, ...more });
const piece = (name: string, item: string, solids: Solid[]): Comp => ({ name, item, solids, at: [0, 0, 0] });
/** A flat plate lying level, its outline and holes given as [x, z] (a shell's top cut with slots), th thick from y0 up. */
const plate = (role: Solid['role'], outline: V2[], holes: V2[][], th: number, y0: number, mat: string, more: Partial<Solid> = {}): Solid =>
  ({ role, shape: { prism: { pts: outline.map(([x, z]) => [x, -z] as V2), L: th, ...(holes.length ? { holes: holes.map((h) => h.map(([x, z]) => [x, -z] as V2)) } : {}) } }, at: [0, y0 + th / 2, 0], rot: [-PI / 2, 0, 0], mat, ...more });
/** A flat plate standing upright across z, its outline and holes given as [x, y] (a shell's side), th thick about zc. */
const wall = (role: Solid['role'], outline: V2[], holes: V2[][], th: number, zc: number, mat: string, more: Partial<Solid> = {}): Solid =>
  ({ role, shape: { prism: { pts: outline, L: th, ...(holes.length ? { holes } : {}) } }, at: [0, 0, zc], mat, ...more });
/** A connector's shell as it is plated: bright nickel. */
const NI = { color: HUE.nickel, finish: 'bright' } as const;
/** A rectangle w × h about its middle (a, b). */
const rect2 = (a: number, b: number, w: number, h: number): V2[] => [[a - w / 2, b - h / 2], [a + w / 2, b - h / 2], [a + w / 2, b + h / 2], [a - w / 2, b + h / 2]];
/** A stadium (a USB-C mouth's shape): w × h, its ends half circles, its foot at y0. */
function stadium(w: number, h: number, y0: number, n = 10): V2[] {
  const r = h / 2, c = w / 2 - r, pts: V2[] = [];
  for (let i = 0; i <= n; i++) { const a = -PI / 2 + (PI * i) / n; pts.push([c + r * Math.cos(a), y0 + r + r * Math.sin(a)]); }
  for (let i = 0; i <= n; i++) { const a = PI / 2 + (PI * i) / n; pts.push([-c + r * Math.cos(a), y0 + r + r * Math.sin(a)]); }
  return pts;
}
const rect = (w: number, h: number, y0: number): V2[] => [[-w / 2, y0], [w / 2, y0], [w / 2, y0 + h], [-w / 2, y0 + h]];

/** A part as drawn: its pieces, how big its footprint is (depth along x, width along z, height), where its numbers
 *  come from. */
export interface BoardPart { comp: Comp; size: V3; src: string }

// ---- USB Type-C ---------------------------------------------------------------------------------------------------
/** A top-mount USB Type-C receptacle: its stainless shell a stadium 8.94 × 3.21 mm round the Type-C spec's opening of
 *  8.34 × 2.56, 7.35 deep (HRO TYPE-C-31-M-12's drawing, through KiCad's footprint and HQ Online's listing; the 24-contact
 *  receptacles are the same outside); its moulded tongue 6.69 wide and 0.70 thick (the spec's) carrying its contacts
 *  at 0.5 mm on both faces, 12 a face where all 24 are fitted, eight a face (A1, A4–A9, A12) on a 16-contact one. */
export function usbC(contacts: 16 | 24): BoardPart {
  const W = 8.94, H = 3.21, D = 7.35, iw = 8.34, ih = 2.56, t = 0.7, tw = 6.69, tl = 5.6, x0 = -D / 2, yc = H / 2;
  const shell = piece('USB-C shell', 'usb-c-shell', [along('term', stadium(W, H, 0), [stadium(iw, ih, (H - ih) / 2)], D, x0, 'stainless-304', { color: HUE.stainless, finish: 'bright' }),
    // (its rear wall, folded down over the moulding; its four legs into the board)
    box('term', [0.3, H, W - 1.2], [x0 + 0.15, H / 2, 0], 'stainless-304', { color: HUE.stainless, finish: 'bright' }),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]): Solid => box('term', [0.6, 0.8, 0.3], [a! * 2.2, -0.4, b! * (W / 2 - 0.15)], 'stainless-304', { color: HUE.stainless, finish: 'bright' }))]);
  const tongue = piece('USB-C tongue', 'usb-c-tongue', [box('body', [tl, t, tw], [x0 + 0.3 + tl / 2, yc, 0], 'nylon', { color: HUE.black }), box('body', [1.4, ih, iw - 0.3], [x0 + 0.3 + 0.7, H / 2, 0], 'nylon', { color: HUE.black })]);
  const pos = contacts === 24 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 4, 5, 6, 7, 8, 9, 12];
  const pins = [-1, 1].flatMap((face) => pos.map((k): Comp => { const z = (k - 6.5) * 0.5;
    return piece(`USB-C contact ${face > 0 ? 'A' : 'B'}${k}`, 'usb-c-contact', [box('lead', [tl - 1.6, 0.05, 0.25], [x0 + 1.9 + (tl - 1.6) / 2, yc + face * (t / 2 + 0.025), z], 'phosphor-bronze', { color: HUE.gold }),
      box('lead', [1.0, 0.1, 0.25], [x0 - 0.5, face > 0 ? 0.05 : 0.15, z * 1.05], 'phosphor-bronze', { color: HUE.gold })]); }));
  return { comp: { name: `USB-C receptacle (${contacts} contacts)`, item: contacts === 24 ? 'usb-c-socket-24' : 'usb-c-socket', at: [0, 0, 0], kids: [shell, tongue, ...pins] }, size: [D, W, H],
    src: 'USB Type-C spec (receptacle opening 8.34 × 2.56 mm, tongue 6.69 × 0.70 mm); HRO TYPE-C-31-M-12 drawing via KiCad footprint (8.94 × 7.35 mm) and HQ Online (3.21 mm tall)' };
}

/** A USB Type-C plug as the Type-C spec has it: its shell a stadium 8.25 × 2.40 mm (to go into the receptacle's 8.34 ×
 *  2.56), 6.65 long from its end to its overmould; inside it a moulded insulator with the slot the receptacle's tongue
 *  (6.69 × 0.70) goes into, and its contacts on the slot's two faces at 0.5 mm (12 a face, a full-featured cable's); its
 *  overmould within the spec's 12.35 × 6.5 limit, 20 long (typical of a cable's moulding). Frame: along x, its mating end
 *  at x 0 facing −x (it goes in toward −x), its overmould toward +x where its cable leaves. */
export function usbCPlug(): BoardPart {
  const W = 8.25, H = 2.4, L = 6.65, sw = 7.85, sh = 2.0, slotW = 6.9, slotH = 0.78, mw = 12.0, mh = 6.2, ml = 20;
  const shell = piece('USB-C plug shell', 'usb-c-plug', [along('term', stadium(W, H, -H / 2), [stadium(sw, sh, -sh / 2)], L, 0, 'stainless-304', { color: HUE.stainless, finish: 'bright' })]);
  const ins = piece('USB-C plug insulator', 'usb-c-plug', [along('body', stadium(sw, sh, -sh / 2), [[[-slotW / 2, -slotH / 2], [slotW / 2, -slotH / 2], [slotW / 2, slotH / 2], [-slotW / 2, slotH / 2]]], L - 0.4, 0.4, 'pbt', { color: HUE.black })]);
  const pins = [-1, 1].flatMap((face) => Array.from({ length: 12 }, (_, k): Comp => piece(`USB-C plug contact ${face > 0 ? 'A' : 'B'}${k + 1}`, 'usb-c-plug', [box('lead', [L - 1.2, 0.08, 0.25], [0.8 + (L - 1.2) / 2, face * (slotH / 2 - 0.04), (k - 5.5) * 0.5], 'phosphor-bronze', { color: HUE.gold })])));
  const mould = piece('USB-C plug overmould', 'usb-c-plug', [along('body', stadium(mw, mh, -mh / 2, 12), [], ml, L, 'pvc', { color: 0x1c1c1e, finish: 'moulded' })]);
  return { comp: { name: 'USB-C plug', item: 'usb-c-plug', at: [0, 0, 0], kids: [shell, ins, ...pins, mould] }, size: [L + ml, mw, mh],
    src: 'USB Type-C spec: plug shell 8.25 × 2.40 mm, 6.65 mm from its end; overmould within 12.35 × 6.5 mm (its length typical)' };
}

// ---- USB Micro-B --------------------------------------------------------------------------------------------------
/** A top-mount USB Micro-B receptacle, its mouth at +x: its stamped stainless shell a trapezoid round the Micro-USB
 *  spec's opening (its plug 6.85 × 1.80 mm, its two lower corners cut at 45°: the mouth here 6.9 × 1.85, cut 0.6),
 *  0.25 thick at its sides; its moulded tongue hanging under the shell's top inside, its five contacts under the tongue
 *  at 0.65 mm (the spec's), their tails out of the back to their pads; two latch springs lanced in the shell's top; two
 *  tabs out at its back corners to the board. Its outside per board (W wide, D deep, H tall); where not measured, 7.5 ×
 *  5.5 × 2.5 (the outline of Molex 105017 and Amphenol 10118194 through KiCad's footprints: 7.3–7.5 × 5.0–5.5; their
 *  height typical). */
export function microUsbB(o: { W?: number; D?: number; H?: number; latch?: number; src?: string } = {}): BoardPart {
  const W = o.W ?? 7.5, D = o.D ?? 5.5, H = o.H ?? 2.5, x0 = -D / 2, mw = 6.9, mh = 1.85, mc = 0.6, y0 = (H - mh) / 2, c = mc + (W - mw) / 2;
  const trap = (w: number, h: number, cut: number, y: number): V2[] => [[-w / 2 + cut, y], [w / 2 - cut, y], [w / 2, y + cut], [w / 2, y + h], [-w / 2, y + h], [-w / 2, y + cut]];
  const S = { color: HUE.stainless, finish: 'bright' } as const;
  const latch = o.latch ?? 2.5;
  const shell = piece('micro-USB shell', 'usb-micro-shell', [
    along('term', trap(W, H, c, 0), [trap(mw, mh, mc, y0)], D, x0, 'stainless-304', S),
    box('term', [0.25, H, W - 0.5], [x0 + 0.125, H / 2, 0], 'stainless-304', S),
    // (its latch springs lanced down from its top, dark in the slot round each)
    ...[-1, 1].map((s): Solid => box('term', [0.9, 0.04, 0.5], [D / 2 - latch, H + 0.01, s * 2.5], 'stainless-304', { color: 0x55585c })),
    // (its two tabs out of its back corners, soldered flat to their pads)
    ...[-1, 1].map((s): Solid => box('term', [1.1, 0.2, 1.4], [x0 - 0.55, 0.1, s * (W / 2 - 0.7)], 'stainless-304', S))]);
  const yt = y0 + mh - 0.1 - 0.3;
  const tongue = piece('micro-USB tongue', 'usb-micro-tongue', [box('body', [D - 1.0, 0.6, 3.6], [x0 + 0.25 + (D - 1.0) / 2, yt, 0], 'nylon', { color: HUE.black }),
    box('body', [0.8, H - 0.25, W - 0.6], [x0 + 0.25 + 0.4, (H - 0.25) / 2, 0], 'nylon', { color: HUE.black })]);
  const pins = Array.from({ length: 5 }, (_, k): Comp => { const z = (k - 2) * 0.65;
    return piece(`micro-USB contact ${k + 1}`, 'usb-micro-contact', [box('lead', [D - 1.6, 0.05, 0.25], [x0 + 1.2 + (D - 1.6) / 2, yt - 0.325, z], 'phosphor-bronze', { color: HUE.gold }),
      box('lead', [1.0, 0.1, 0.3], [x0 - 0.5, 0.05, z], 'phosphor-bronze', { color: HUE.gold })]); });
  return { comp: { name: 'micro-USB receptacle', item: 'usb-micro-socket', at: [0, 0, 0], kids: [shell, tongue, ...pins] }, size: [D, W, H],
    src: o.src ?? 'USB Micro-B spec (its plug 6.85 × 1.80 mm, contacts at 0.65 mm); outside 7.5 × 5.5 mm (Molex 105017 and Amphenol 10118194 through KiCad\'s footprints), 2.5 tall (typical)' };
}

// ---- crystals -----------------------------------------------------------------------------------------------------
/** A quartz crystal in a ceramic SMD package (a 3225's, 3.2 × 2.5 mm, Abracon ABM8's outline through KiCad's
 *  footprint): its alumina base, its gold seal ring, the Kovar lid seam-welded on it, its four gold pads under its
 *  corners; inside, its quartz blank on its two mounts. Its height 0.8 mm (typical of the size); its lid as its photo
 *  shows it on a board, where measured. */
export function crystalSmd(o: { L?: number; W?: number; H?: number; lid?: [number, number]; lidHue?: number; src?: string } = {}): BoardPart {
  const L = o.L ?? 3.2, W = o.W ?? 2.5, H = o.H ?? 0.8, [ll, lw] = o.lid ?? [L - 0.5, W - 0.5], hb = H - 0.12;
  const base = piece('crystal base', 'crystal-smd-base', [
    box('body', [L, hb, W], [0, hb / 2, 0], 'alumina', { color: 0xe8e2d6 }),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]): Solid => box('lead', [1.0, 0.03, 0.8], [a! * (L / 2 - 0.55), 0.015, b! * (W / 2 - 0.45)], 'gold', { color: HUE.gold })),
    // (its seal ring: the gold-plated band round the top of the base the lid is welded to)
    plate('term', rect2(0, 0, L - 0.1, W - 0.1), [rect2(0, 0, ll + 0.1, lw + 0.1)], 0.04, hb, 'gold', { color: HUE.gold, finish: 'bright', share: 0.4 })]);
  const lid = piece('crystal lid', 'crystal-smd-lid', [box('cap', [ll, H - hb, lw], [0, hb + (H - hb) / 2, 0], 'kovar', { color: o.lidHue ?? 0xc8bcb4, finish: 'bright' })]);
  const blank = piece('quartz blank', 'quartz-blank', [box('core', [L * 0.6, 0.08, W * 0.55], [0, hb * 0.55, 0], 'quartz', { color: 0xf4f4f0 })]);
  return { comp: { name: 'quartz crystal (3225)', item: 'crystal-smd', at: [0, 0, 0], kids: [base, lid, blank] }, size: [L, W, H],
    src: o.src ?? 'Abracon ABM8: 3.2 × 2.5 mm (KiCad\'s footprint, from its datasheet); 0.8 mm tall (typical of the size)' };
}

/** A fiducial mark: a bare copper dot d across, gold-flashed (ENIG), in an opening of the solder mask `ring` across,
 *  the laminate showing dark round it; as its board's photo shows it, where measured. */
export function fiducial(d = 1.0, ring = 1.75, o: { pad?: number; bare?: number } = {}): BoardPart {
  const circ = (r: number): V2[] => Array.from({ length: 28 }, (_, i): V2 => [r * Math.cos((2 * PI * i) / 28), r * Math.sin((2 * PI * i) / 28)]);
  const comp = piece('fiducial', 'fiducial', [
    { role: 'lead', shape: { cyl: [d / 2, 0.035] }, at: [0, 0.0175, 0], mat: 'copper-foil', color: o.pad ?? HUE.gold, finish: 'bright' },
    // (the laminate where the mask is opened round it, drawn as its face 4 µm proud of the mask so it shows)
    plate('body', circ(ring / 2), [circ(d / 2)], 0.004, 0, 'fr4', { color: o.bare ?? 0x483e23 })]);
  return { comp, size: [ring, ring, 0.035], src: 'a fiducial as its photo shows it' };
}

/** A small top-pushed tactile switch as its photo shows it: its moulded base, white at its corners; its steel cover
 *  over it with an oval window, its white plunger standing in the window, a dome under it; four terminals out at its
 *  corners. Its sizes measured on its board's photo (L × W, its plunger a × b); its height typical. */
export function tactTop(o: { L: number; W: number; H: number; plunger: [number, number]; src: string }): BoardPart {
  const { L, W, H } = o, [pa, pb] = o.plunger, hc = H - 0.35, oval = (a: number, b: number): V2[] => Array.from({ length: 24 }, (_, i): V2 => [(a / 2) * Math.cos((2 * PI * i) / 24), (b / 2) * Math.sin((2 * PI * i) / 24)]);
  const kids: Comp[] = [
    piece('switch base', 'tact-base', [box('body', [L, hc - 0.15, W], [0, (hc - 0.15) / 2, 0], 'nylon', { color: HUE.white })]),
    piece('switch frame', 'tact-frame', [plate('term', rect2(0, 0, L - 0.5, W - 0.2), [oval(pa + 0.15, pb + 0.15)], 0.15, hc - 0.15, 'steel-low', { color: 0x8e9196 })]),
    piece('switch dome', 'tact-dome', [{ role: 'cap', shape: { cyl: [Math.min(pa, pb) / 2, 0.1] }, at: [0, hc - 0.4, 0], mat: 'stainless-304', color: HUE.stainless }]),
    piece('switch plunger', 'tact-plunger', [plate('cap', oval(pa, pb), [], H - hc + 0.3, hc - 0.3, 'nylon', { color: HUE.white })]),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b], i): Comp => piece(`switch terminal ${i + 1}`, 'tact-terminal', [box('lead', [0.4, 0.15, 0.6], [a! * (L / 2 + 0.15), 0.075, b! * (W / 2 - 0.55)], 'copper', { color: HUE.tin })])),
  ];
  return { comp: { name: 'tactile switch', item: 'tact-switch', at: [0, 0, 0], kids }, size: [L + 0.7, W, H], src: o.src };
}

// ---- HDMI -----------------------------------------------------------------------------------------------------------
/** HDMI receptacles: type A (full size), C (mini), D (micro). Its stamped shell round its keyed mouth (the lower corners
 *  cut, as the plug is), its moulded tongue with its 19 contacts, ten on its top face and nine under, alternating at
 *  0.5 mm. Openings from the plugs' sizes in the HDMI spec (A 13.9 × 4.45 mm, C 10.42 × 2.42, D 6.4 × 2.8) with room
 *  round them; outsides: A 15.0 × 5.6 (typical: makers' type A SMT receptacles are 14.5–15.0 wide, 5.6–6.2 tall), its
 *  depth per board measured; D 6.5 × 3.4 × 7.5 (Molex 46765's drawing via KiCad's footprint); C 11.2 × 3.2 × 7.5. */
export function hdmi(type: 'A' | 'C' | 'D', depth?: number, width?: number): BoardPart {
  const [W0, H, iw, ih, c, D0, tw, tt] = type === 'A' ? [15.0, 5.6, 14.0, 4.55, 1.05, 11.6, 10.4, 1.3] : type === 'C' ? [11.2, 3.2, 10.5, 2.5, 0.6, 7.5, 7.2, 0.6] : [6.5, 3.4, 6.5 - 0.5, 2.9, 0.5, 7.5, 4.4, 0.6], W = width ?? W0;
  const D = depth ?? D0, x0 = -D / 2, y0 = (H - ih) / 2, st = 0.3, Ht = H - st, back = 1.8, co = c + 0.25;
  // (its shell: the sides and floor one section along its depth, open at the top; its top a flat plate 0.3 thick from
  // its mouth to 1.8 mm short of its back, where the moulding and the contacts going down to the board show (as the
  // Orange Pi 5's photo shows); a type A's top lanced for two spring fingers that bear on the plug's top, 2.5 mm wide
  // and 5 mm long, 3.8 mm either side of its middle, from 1.2 mm behind its mouth (measured on that photo), each bent
  // in 8° (typical) so its tip stands below the plug's top)
  const u: V2[] = [[-W / 2 + co, 0], [W / 2 - co, 0], [W / 2, co], [W / 2, Ht], [iw / 2, Ht], [iw / 2, y0 + c], [iw / 2 - c, y0], [-iw / 2 + c, y0], [-iw / 2, y0 + c], [-iw / 2, Ht], [-W / 2, Ht], [-W / 2, co]];
  const tabs = type === 'A' ? [-3.8, 3.8] : [], f = D / 2 - 1.2, r = f - 5.0, sw = 2.5, th = (8 * PI) / 180, tl = 4.7;
  const plate: Solid = { role: 'term', shape: { prism: { pts: [[x0 + back, -W / 2], [D / 2, -W / 2], [D / 2, W / 2], [x0 + back, W / 2]], L: st, ...(tabs.length ? { holes: tabs.map((z): V2[] => [[r, z - sw / 2], [f, z - sw / 2], [f, z + sw / 2], [r, z + sw / 2]]) } : {}) } }, at: [0, H - st / 2, 0], rot: [PI / 2, 0, 0], mat: 'steel-low', ...NI };
  const fingers = tabs.map((z): Solid => box('term', [tl, st, sw - 0.6], [r + (tl / 2) * Math.cos(th), H - st / 2 - (tl / 2) * Math.sin(th), z], 'steel-low', { ...NI, rot: [0, 0, -th] }));
  const shell = piece('HDMI shell', 'hdmi-shell', [along('term', u, [], D, x0, 'steel-low', NI), plate, ...fingers,
    ...[-1, 1].map((s): Solid => box('term', [1.2, 0.8, 0.3], [x0 + D * 0.6, -0.4, s * (W / 2 - 0.15)], 'steel-low', NI))]);
  const tl2 = D - 2.2, yt = y0 + ih * 0.62;
  const ins = piece('HDMI insulator', 'hdmi-insulator', [box('body', [tl2, tt, tw], [x0 + 0.4 + tl2 / 2, yt, 0], 'pbt', { color: HUE.black }), box('body', [1.6, ih, iw - 0.4], [x0 + 0.4 + 0.8, y0 + ih / 2, 0], 'pbt', { color: HUE.black })]);
  // (each contact: its blade on the tongue, its leg down the moulding's back, its tail out along the board; those on the
  // tongue's top and those under it alternate, their tails in two rows)
  const pitch = tw / 20, xl = x0 + 0.3, bend = x0 + 2.0 + tl2 - 1.2, pins = Array.from({ length: 19 }, (_, i): Comp => { const top = i % 2 === 0, z = (i - 9) * pitch, yb = yt + (top ? 1 : -1) * (tt / 2 + 0.025), e = x0 - 1.1 - (top ? 0 : 0.9);
    return piece(`HDMI contact ${i + 1}`, 'hdmi-contact', [box('lead', [bend - xl, 0.05, pitch * 0.7], [(bend + xl) / 2, yb, z], 'phosphor-bronze', { color: HUE.gold }),
      box('lead', [0.12, yb - 0.1, pitch * 0.7], [xl, 0.1 + (yb - 0.1) / 2, z], 'phosphor-bronze', { color: HUE.gold }),
      box('lead', [xl + 0.06 - e, 0.1, pitch * 0.7], [(xl + 0.06 + e) / 2, 0.05, z], 'phosphor-bronze', { color: HUE.gold })]); });
  return { comp: { name: type === 'A' ? 'HDMI receptacle' : type === 'C' ? 'mini-HDMI receptacle' : 'micro-HDMI receptacle', item: 'hdmi-socket', at: [0, 0, 0], kids: [shell, ins, ...pins] }, size: [D, W, H],
    src: type === 'A' ? 'HDMI spec (type A plug 13.9 × 4.45 mm, 19 contacts at 0.5 mm); outside typical of makers\' SMT type A receptacles' : type === 'D' ? 'HDMI spec (type D); Molex 46765 via KiCad footprint' : 'HDMI spec (type C), outside typical' };
}

// ---- USB-A ------------------------------------------------------------------------------------------------------------
/** USB-A receptacles: the USB 2.0 spec's opening, 12.5 × 5.12 mm, in a shell 13.1 × 5.72 outside (Molex 105057's
 *  outline via KiCad), 14 deep (Stewart SS-52100's) or as measured; its tongue in the top half of the mouth, its
 *  contacts under it (four for USB 2.0 at 2.5 mm; USB 3.0's five more behind them, and its tongue blue). One port, or a
 *  stack of two in one shell 14.5 wide, 17 deep (Würth 61400826021's footprint) and 15.6 tall (typical). `onSide`: a
 *  single port stood on its side, its slot upright (the Orange Pi 5's USB 2.0).
 *
 *  Inside and under, as its maker's footprint has it (Würth 61400826021's for a stack, Stewart SS-52100's for one port,
 *  via KiCad): its moulded insulator a block at the back of each mouth as deep as leaves the plug's shell its 12 mm
 *  (typical of an A plug), the tongue standing out of it; each mouth of a stack lined with its own skin of the shell, so
 *  a plug meets metal all round (the stack's shell nickel-plated brass, Würth's datasheet); the shell open under its back
 *  where the contacts' tails come down, in their rows (a stack's 1.39 and 4.01 mm in from its back, one port's 1.01),
 *  0.6 mm wide, 2.1 mm below its seat; its legs 6.57 mm either side of its middle (a stack's four, 1.04 and 6.72 mm in;
 *  one port's two, 3.72 in), 3.94 mm below its seat (2.1 and 3.94 its drawing's unlabelled figures, read as the tails'
 *  and the legs' by their tolerances: an estimate of which is which). Stood on its side, as it was. */
export function usbA(ports: (2 | 3)[], o: { depth?: number; onSide?: boolean; windows?: { x: number; y: number; w: number; h: number }[]; detents?: boolean; posts?: boolean;
  /** its side springs where they differ from the Pi 5's: from `back` to `front` mm behind its face, `h` tall, centred at `ys`, rooted at its front or back;
   *  or `rows`, each [its top, its bottom at its root, its bottom at its free end] (a spring that tapers to its end) */
  lance?: { back: number; front: number; h?: number; ys?: number[]; rows?: [number, number, number][]; root?: 'front' | 'back' };
  /** bars embossed out of its sides, placed as `windows` are */
  ribs?: { x: number; y: number; w: number; h: number }[];
  /** its back plate's flap folded round onto each side, `to` mm from its back and `top` tall, its latch windows cut in it */
  flap?: { to: number; top: number; windows?: { x: number; y: number; w: number; h: number }[] };
  /** a marking stamped in its top (its maker's name), `x` mm from its back, centred `z` across, letters `h` tall, along its width */
  mark?: { text: string; x: number; z: number; h: number } } = {}): BoardPart {
  const stack = ports.length === 2, W = stack ? 14.5 : 13.1, H1 = 5.72, iw = 12.5, ih = 5.12, gap = 4.0, H = stack ? 2 * H1 + gap : H1, D = o.depth ?? (stack ? 17.0 : 14.0), x0 = -D / 2;
  const kids: Comp[] = [], thru = !o.onSide, mat = stack ? 'brass' : 'steel-low', TAIL = 2.1, LEG = 3.94;
  // (a stack's body 13.64 wide, its face plate 14.5: Würth's drawing; its skins 0.25 thick, so a mouth's lining fits inside it)
  const Wb = stack && thru ? 13.64 : W, sk = stack && thru ? 0.25 : 0.3;
  // (a stack's upper mouth 0.2 mm lower where its mouths are lined, so its lining meets the shell's top inside it)
  const mouths = ports.map((_, k) => stack ? k * (H1 + gap - (thru ? 0.2 : 0)) : 0);
  // (the insulator's block at the back of each mouth: the plug's 12 mm in front of it, the face plate 0.3)
  // (its tongue's tip 0.6 mm behind its face: Raspberry Pi 4's photo, from 42° above, shows a band of each tongue under
  // its mouth's lip and its contacts' bows under that, which a tip any deeper hides behind the lip (photo.py camera; an
  // estimate to about 0.2 mm))
  const back = thru ? Math.max(0.3, D - 0.3 - 12) : 0.3, tl = thru ? D - back - 0.6 : D - 2.8;
  const U = (w: number, h: number): V2[] => [[-w / 2, 0], [-w / 2 + sk, 0], [-w / 2 + sk, h - sk], [w / 2 - sk, h - sk], [w / 2 - sk, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
  const mouthsAt = mouths.map((y) => rect(iw, ih, y + (H1 - ih) / 2));
  const legs = (stack ? [1.04, 6.72] : [3.72]).flatMap((d) => [-1, 1].map((sg): Solid => box('term', [1.5, LEG + 0.15, 0.5], [x0 + d, (0.15 - LEG) / 2, sg * 6.57], mat, NI)));
  // (a stack's shell as Raspberry Pi 5's photo shows its two (photo.py camera: each feature cast onto the shell's face
  // from its photo's camera, to about 0.3 mm): its top a plate with the upper mouth's two latch springs lanced from it,
  // 3.0 mm either side of its middle, each a tongue 5.5 long tapering from 3.35 to 1.4 mm wide, its root 6.25 mm back
  // from the front, a window 2.05 back where its tip is bent down into the mouth (drawn as a step under it); its sides
  // each a plate with a spring lanced in it beside each mouth, 5.5 long and 1.2 tall, 0.8 above the mouth's middle;
  // each mouth floored and the lower roofed by a plate of the shell (the upper's roof its top); `o.windows`: what else
  // its photo shows cut in its sides; `o.detents`: two round detents on its top, 11.6 back and 2.0 either side)
  const F = x0 + D, sTop = (zc: number): { slot: V2[]; tongue: V2[]; win: V2[] } => {
    const r = F - 6.25, t = F - 0.7, g = 0.3, wx = F - 2.05;
    return { slot: [[r, zc - 1.675], [t, zc - 0.7], [t, zc + 0.7], [r, zc + 1.675], [r, zc + 1.675 - g], [t - g, zc + 0.7 - g], [t - g, zc - 0.7 + g], [r, zc - 1.675 + g]],
      tongue: [[r - 0.01, zc - 1.675 + g], [t - g, zc - 0.7 + g], [t - g, zc + 0.7 - g], [r - 0.01, zc + 1.675 - g]], win: rect2(wx, zc, 0.8, 0.8) };
  };
  // (a side spring: a U cut round a tongue, the tongue joined to the shell at its root, back or front, its free tip
  // bent in where the U closes; its top level, its bottom rising from its root to its tip where it tapers)
  const ln = o.lance, lr = F - (ln?.back ?? 7.14), lt = F - (ln?.front ?? 1.64), lh = (ln?.h ?? 1.2) / 2, front = ln?.root === 'front';
  const sSide = ([yt, ybr, ybt]: [number, number, number]): { slot: V2[]; tongue: V2[]; tip: number; tipY: number; tipH: number } => { const g = 0.25, [r, t, d] = front ? [lt, lr, 1] : [lr, lt, -1];
    return { slot: [[r, ybr], [t, ybt], [t, yt], [r, yt], [r, yt - g], [t + d * g, yt - g], [t + d * g, ybt + g], [r, ybr + g]],
      tongue: [[r + d * 0.01, ybr + g], [t + d * g, ybt + g], [t + d * g, yt - g], [r + d * 0.01, yt - g]], tip: t + d * 0.46, tipY: (ybt + yt) / 2, tipH: Math.min(0.6, yt - ybt - 2 * g - 0.1) }; };
  const stackShell = (): Solid[] => {
    const col = NI, L0 = D - 0.3, tops = [-3.0, 3.0].map(sTop), sides = (ln?.rows ?? (ln?.ys ?? mouths.map((m) => m + (H1 - ih) / 2 + ih / 2 + 0.8)).map((yc): [number, number, number] => [yc + lh, yc - lh, yc - lh])).map(sSide), zi = Wb / 2 - sk;
    const wins = (o.windows ?? []).map((w) => rect2(x0 + w.x, w.y, w.w, w.h));
    const out: Solid[] = [
      plate('term', rect2(x0 + L0 / 2, 0, L0, Wb), tops.map((f) => f.slot), sk, H - sk, mat, col),
      ...[-1, 1].map((sg) => wall('term', rect2(x0 + L0 / 2, (H - sk) / 2, L0, H - sk), [...sides.map((f) => f.slot), ...wins], sk, sg * (Wb / 2 - sk / 2), mat, col)),
      along('term', rect(W, H, 0), mouthsAt, 0.3, x0 + D - 0.3, mat, col),
      // (the latch springs: each tongue in its slot with its window, its bent tip a step down into the mouth under it)
      ...tops.flatMap((f) => [plate('term', f.tongue, [f.win], sk, H - sk, mat, col), box('term', [0.8, 0.45, 1.0], [F - 1.55, H - sk - 0.22, (f.win[0]![1] + f.win[2]![1]) / 2], mat, col)]),
      ...[-1, 1].flatMap((sg) => sides.flatMap((f) => [wall('term', f.tongue, [], sk, sg * (Wb / 2 - sk / 2), mat, col), box('term', [0.6, f.tipH, 0.35], [f.tip, f.tipY, sg * (zi - 0.17)], mat, col)])),
      // (`o.ribs`: bars embossed out of its sides, stiffening them; `o.flap`: its back plate's flap folded round onto each
      // side over it, its latch windows cut in it where the side's tabs lock it shut)
      ...[-1, 1].flatMap((sg) => (o.ribs ?? []).map((r) => box('term', [r.w, r.h, 0.2], [x0 + r.x, r.y, sg * (Wb / 2 + 0.1)], mat, col))),
      ...(o.flap ? [-1, 1].map((sg) => wall('term', rect2(x0 + o.flap!.to / 2, (0.3 + o.flap!.top) / 2, o.flap!.to, o.flap!.top - 0.3), (o.flap!.windows ?? []).map((w) => rect2(x0 + w.x, w.y, w.w, w.h)), sk, sg * (Wb / 2 + sk / 2), mat, col)) : []),
      // (each mouth's floor, and the lower's roof, plates of the shell from the insulator's block to the face plate)
      ...mouths.flatMap((m, k) => { const y = m + (H1 - ih) / 2; return [y - sk, ...(k === 0 && mouths.length > 1 ? [y + ih] : [])].map((yb) => plate('term', rect2(x0 + back + (L0 - back) / 2, 0, L0 - back, 2 * zi), [], sk, yb, mat, col)); }),
      ...(o.detents ? [-2.0, 2.0].map((z): Solid => ({ role: 'term', shape: { cyl: [0.4, 0.12] }, at: [F - 11.6, H + 0.06, z], mat, ...col })) : []),
      // (its stamped marking: drawn as the shadow its letters' relief casts, a darker ink on the shell)
      ...(o.mark ? [box('mark', [o.mark.h * 0.9 * o.mark.text.length, 0.01, o.mark.h * 1.3], [x0 + o.mark.x, H + 0.01, o.mark.z], '', { text: o.mark.text, ink: 0xa49d91, inkOnly: true, color: HUE.nickel, rot: [0, PI / 2, 0] })] : []),
    ];
    return out;
  };
  // (a single port's shell is its mouth's skin; a stack's is a skin round both, its face plate cut for each mouth, a
  // moulded divider between them)
  kids.push(piece(stack ? 'USB-A stack shell' : 'USB-A shell', 'usb-a-shell', thru
    ? [...(stack ? stackShell() : [along('term', U(W, H), [], back, x0, mat, NI), along('term', rect(W, H, 0), mouthsAt, D - back, x0 + back, mat, NI)]),
      box('term', [sk, H, Wb - 2 * sk], [x0 + sk / 2, H / 2, 0], mat, NI), ...legs]
    : [...(stack ? [along('term', rect(W, H, 0), [rect(W - 0.6, H - 0.6, 0.3)], D, x0, mat, NI), along('term', rect(W, H, 0), mouthsAt, 0.3, x0 + D - 0.3, mat, NI)] : [along('term', rect(W, H, 0), mouthsAt, D, x0, mat, NI)]),
      box('term', [0.3, H, W - 0.6], [x0 + 0.15, H / 2, 0], mat, NI), ...[-1, 1].map((sg): Solid => box('term', [1.0, 1.0, 0.3], [x0 + D * 0.5, -0.5, sg * (W / 2 - 0.15)], mat, NI))]));
  ports.forEach((gen, k) => {
    const y = mouths[k]! + (H1 - ih) / 2, ty = y + ih - 0.55 - 1.84 / 2, tongue = gen === 3 ? HUE.usb3 : HUE.black, xs = x0 + (thru ? back : 0.4);
    // (between the two mouths of a stack, its moulded floor; its tongue in the mouth's top half, 1.84 mm thick, out of its
    // block at the mouth's back)
    const block = thru ? box('body', [back - sk, ih + 2 * sk, iw + 2 * sk], [x0 + sk + (back - sk) / 2, y + ih / 2, 0], 'nylon', { color: tongue }) : box('body', [1.5, ih, iw - 0.4], [x0 + 0.4 + 0.75, y + ih / 2, 0], 'nylon', { color: tongue });
    const lo = (H1 - ih) / 2 + ih + sk, hi = (mouths[1] ?? 0) + (H1 - ih) / 2 - sk;
    const floor = thru ? box('body', [D - 0.3 - sk, hi - lo, Wb - 2 * sk], [x0 + sk + (D - 0.3 - sk) / 2, (lo + hi) / 2, 0], 'nylon', { color: HUE.black, share: 0.3 }) : box('body', [D - 0.9, gap + 0.6, W - 0.6], [x0 + 0.3 + (D - 0.9) / 2, H1 - 0.3 + (gap + 0.6) / 2, 0], 'nylon', { color: HUE.black, share: 0.3 });
    // (`o.posts`: the insulator's posts showing through the back of the shell's top edge, its photo's row of them 2.35
    // mm apart)
    const posts = o.posts && stack && k === ports.length - 1 ? Array.from({ length: 6 }, (_, i) => box('body', [0.6, 0.55, 1.1], [x0 + 0.25, H - 0.22, (i - 2.5) * 2.35], 'nylon', { color: tongue })) : [];
    kids.push(piece(`USB-A tongue${stack ? (k ? ' upper' : ' lower') : ''}`, 'usb-a-tongue', [box('body', [tl, 1.84, 11.2], [xs + tl / 2, ty, 0], 'nylon', { color: tongue }), block, ...(stack && k === 0 ? [floor] : []), ...posts]));
    const zs = gen === 3 ? [-3.5, -1, 1, 3.5, -4.5, -2.25, 0, 2.25, 4.5] : [-3.5, -1, 1, 3.5], cy = ty - 0.92 - 0.075;
    // (each contact's tail down through its row: a stack's upper mouth's at the back, its lower's in front of them)
    const row = x0 + (stack ? (k ? 1.39 : 4.01) : 1.01);
    // (a USB 2.0 contact a spring: flat in its groove under the tongue, then bowed 0.5 mm down to touch the plug's contact
    // 1.2 mm behind its end, its end tucked back up under the tongue (the bow's depth an estimate: the plug's contact
    // must press it back up into its groove); USB 3.0's five behind them flat in theirs, the plug's the springs)
    const spring = (b0: number, b1: number, z: number): Solid[] => { const k = b1 - 3.0, cx = b1 - 1.2, dip = 0.5, e = b1 - 0.3, up = 0.1;
      const seg = (xa: number, ya: number, xb: number, yb: number): Solid => box('lead', [Math.hypot(xb - xa, yb - ya), 0.15, 1.0], [(xa + xb) / 2, (ya + yb) / 2, z], 'phosphor-bronze', { color: HUE.gold, rot: [0, 0, Math.atan2(yb - ya, xb - xa)] });
      return [box('lead', [k - b0, 0.15, 1.0], [(b0 + k) / 2, cy, z], 'phosphor-bronze', { color: HUE.gold }), seg(k, cy, cx, cy - dip), seg(cx, cy - dip, e, cy - up)]; };
    zs.forEach((z, i) => { const front = i < 4, w = front ? 0.6 : 0.4, b0 = thru ? xs + (front ? 1.4 : 0.3) : 0, b1 = b0 + (front ? tl - 2 : 2.2);
      kids.push(piece(`USB-A contact ${k ? 'upper' : 'lower'} ${i + 1}`, 'usb-a-contact', thru
        ? [...(front ? spring(b0, b1, z) : [box('lead', [b1 - b0, 0.15, 0.7], [(b0 + b1) / 2, cy, z], 'phosphor-bronze', { color: HUE.gold })]),
          box('lead', [b0 - row + 0.15, 0.15, w], [(row + b0) / 2, cy, z], 'phosphor-bronze', { color: HUE.gold }),
          box('lead', [0.3, cy + TAIL, w], [row, (cy - TAIL) / 2, z], 'phosphor-bronze', { color: HUE.gold })]
        : [...(front ? spring(x0 + 1.8, x0 + 1.8 + tl - 2, z) : [box('lead', [2.2, 0.15, 0.7], [x0 + 1.4 + 1.1, cy, z], 'phosphor-bronze', { color: HUE.gold })]),
          box('lead', [0.5, Math.max(0.1, ty), 0.4], [x0 - 0.3 - (front ? 0 : 1.5), ty / 2, z], 'phosphor-bronze', { color: HUE.gold })])); });
  });
  const comp: Comp = { name: stack ? `USB-A stack (${ports.map((g) => (g === 3 ? 'USB 3.0' : 'USB 2.0')).join(' under ')})` : `USB-A receptacle (USB ${ports[0] === 3 ? '3.0' : '2.0'})`, item: stack ? (ports.includes(3) ? 'usb3-a-stack' : 'usb-a-stack') : ports[0] === 3 ? 'usb3-a-socket' : 'usb-a-socket', at: [0, 0, 0], kids };
  if (o.onSide) { // (stood on its side: its width upright, its slot vertical, the whole turned a quarter about its depth)
    const turn = (s: Solid): Solid => ({ ...s, at: [s.at[0], s.at[2] + W / 2, -(s.at[1] - H / 2)], rot: s.rot ? [s.rot[0] - PI / 2, s.rot[1], s.rot[2]] : [-PI / 2, 0, 0] });
    const deep = (c: Comp): Comp => ({ ...c, ...(c.solids ? { solids: c.solids.map(turn) } : {}), ...(c.kids ? { kids: c.kids.map(deep) } : {}) });
    return { comp: deep(comp), size: [D, H, W], src: 'USB 2.0 spec (receptacle opening 12.5 × 5.12 mm); shell 13.1 × 5.72 mm (Molex 105057 via KiCad); depth measured from the Orange Pi 5\'s photos; stood on its side as its corner photos show' };
  }
  return { comp, size: [D, W, H], src: stack ? 'USB 2.0/3.0 specs (each opening 12.5 × 5.12 mm); stack 14.5 × 17.0 mm (Würth 61400826021 via KiCad), 15.6 mm tall (typical)' : 'USB 2.0 spec (opening 12.5 × 5.12 mm); shell 13.1 × 5.72 (Molex 105057 via KiCad), 14 mm deep (Stewart SS-52100 via KiCad)' };
}

// ---- RJ45 -------------------------------------------------------------------------------------------------------------
/** An RJ45 jack with its magnetics and two lights (HanRun HR911105A's outline: 16.04 × 21.30 × 13.5 mm, green and yellow
 *  LEDs, per HQ Online's listing and KiCad's footprint): its moulded housing, its mouth for an 8P8C plug 11.68 mm wide
 *  (IEC 60603-7) with its latch slot down by the board, eight gold contacts at 1.02 mm sprung down into it, its
 *  isolation transformers wound on ferrite toroids in its back, its steel shield over all, its two lights in its face. */
export function rj45(o: { mark?: string; skirt?: boolean; /** Trxcom's TRJG092x outline (15.90 × 21.30 × 13.40, its listing) */ trxcom?: boolean;
  /** its face as its photo shows it: its shield bent across it, the plug's mouth cut through it `top` mm under its top, `mw` × `mh`, a notch `nw` ×
   *  `nh` under its middle for the plug's latch, its two lights `lw` × `lh` in the mouth's lower corners `lz` either side of its middle, the green
   *  on the `green` side of it (its own z); the shield's cut `cw` wide, centred `cz` from its middle, wider than the moulded mouth it frames */
  face?: { top: number; mw: number; mh: number; nw: number; nh: number; lw: number; lh: number; lz: number; cw?: number; cz?: number; green?: 1 | -1 } } = {}): BoardPart {
  const W = o.trxcom ? 15.9 : 16.04, H = o.trxcom ? 13.4 : 13.5, D = 21.3, x0 = -D / 2, fc = o.face, cav = 14.5;
  const mw = fc?.mw ?? 11.9, mh = fc?.mh ?? 6.9, my = fc ? H - fc.top - fc.mh : 2.6, nw = fc?.nw ?? 6.4, nh = fc?.nh ?? 1.5;
  // (its lights: in the face under the mouth, or (`o.face`) in the mouth's lower corners, the housing filling those corners round them)
  const lz = fc?.lz ?? 5.355, lw = fc?.lw ?? 2.6, lh = fc?.lh ?? 1.8, ly = fc ? my + lh / 2 : 1.6;
  // (its shield bent round its top and sides, open under it where it stands on the board)
  const t = 0.25, U: V2[] = [[-W / 2, 0], [-W / 2 + t, 0], [-W / 2 + t, H - t], [W / 2 - t, H - t], [W / 2 - t, 0], [W / 2, 0], [W / 2, H], [-W / 2, H]];
  // (`o.skirt`: its top's skirt folded 2.8 mm down over each side behind its middle, stepping up to the top edge 2.5 mm
  // ahead of it, as Raspberry Pi 5's photo shows its jack's (photo.py camera, cast on its side); `o.mark`: what its top
  // is printed with, as the photo reads)
  const skirt = o.skirt ? [-1, 1].map((sg) => wall('term', [[x0, H - 2.8], [-0.1, H - 2.8], [2.5, H + 0.2], [x0, H + 0.2]], [], 0.2, sg * (W / 2 + 0.1), 'steel-low', NI)) : [];
  // (its lines running across it, as the photo reads them)
  const mark = o.mark ? [box('mark', [W - 2, 0.01, D - 6], [0.5, H + 0.21, 0], '', { text: o.mark, ink: 0xefebe3, inkOnly: true, color: HUE.nickel, rot: [0, PI / 2, 0] })] : [];
  const shield = piece('RJ45 shield', 'rj45-shield', [along('term', U, [], D, x0, 'steel-low', NI), box('term', [0.25, H, W], [x0 + 0.125, H / 2, 0], 'steel-low', NI),
    ...[-1, 1].map((s): Solid => box('term', [1.2, 3.2 + 0.2, 0.25], [x0 + 7.45, (0.2 - 3.2) / 2, s * 7.745], 'steel-low', NI)), ...skirt,
    // (`o.face`: the shield's front bent down across its face, cut for the mouth and its notch, its lights seen in the mouth's corners)
    ...(fc ? [along('term', rect(W, H, 0), [(() => { const a = (fc.cz ?? 0) - (fc.cw ?? mw) / 2, b = (fc.cz ?? 0) + (fc.cw ?? mw) / 2; return [[a, my], [-nw / 2, my], [-nw / 2, my - nh], [nw / 2, my - nh], [nw / 2, my], [b, my], [b, my + mh], [a, my + mh]] as V2[]; })()], 0.25, x0 + D - 0.25, 'steel-low', NI)] : []), ...(o.skirt ? [box('term', [D, 0.2, W + 0.4], [0, H + 0.1, 0], 'steel-low', NI)] : []), ...mark]);
  // (its mouth for the plug with the latch's slot under it, one opening)
  const cz = lz - lw / 2, cy = my + lh;
  const mouth: V2[] = fc ? [[-mw / 2, cy], [-cz, cy], [-cz, my], [-nw / 2, my], [-nw / 2, my - nh], [nw / 2, my - nh], [nw / 2, my], [cz, my], [cz, cy], [mw / 2, cy], [mw / 2, my + mh], [-mw / 2, my + mh]]
    : [[-mw / 2, my], [-nw / 2, my], [-nw / 2, my - nh], [nw / 2, my - nh], [nw / 2, my], [mw / 2, my], [mw / 2, my + mh], [-mw / 2, my + mh]];
  const housing = piece('RJ45 housing', 'rj45-housing', [along('body', rect(W - 0.5, H - 0.25, 0), [mouth], cav - (fc ? 0.25 : 0), x0 + D - cav, 'pbt', { color: HUE.black, share: 0.6 }), box('body', [D - cav - 0.3, H - 0.25, W - 0.5], [x0 + 0.25 + (D - cav - 0.3) / 2, (H - 0.25) / 2, 0], 'pbt', { color: HUE.black, share: 0.55 }),
    // (its two moulded pegs down into the board's 3.25 mm holes, 2 mm below its seat: typical)
    ...[-1, 1].map((s): Solid => ({ role: 'body', shape: { cyl: [1.5, 2.0] }, at: [x0 + 10.5, -1.0, s * 5.715], mat: 'pbt', color: HUE.black }))]);
  const contacts = Array.from({ length: 8 }, (_, i): Comp => piece(`RJ45 contact ${i + 1}`, 'rj45-contact', [box('lead', [6.5, 0.3, 0.45], [x0 + D - 7.5, my + mh - 1.2, (i - 3.5) * 1.02], 'phosphor-bronze', { color: HUE.gold, rot: [0, 0, -0.35] }), box('lead', [0.4, 3.2, 0.4], [x0 + (i % 2 ? 1.6 : 4.14), -1.6, (i - 3.5) * 1.27], 'phosphor-bronze', { color: HUE.gold })]));
  // (four transformers and four common-mode chokes, each turns of magnet wire on a ferrite toroid, in its back)
  const mag: Comp = { name: 'RJ45 magnetics', item: 'rj45-magnetics', at: [0, 0, 0], kids: [...Array.from({ length: 8 }, (_, i): Comp => piece(`toroid ${i + 1}`, 'toroid-core', [{ role: 'core', shape: { lathe: [[1.0, 0], [1.75, 0], [1.75, 1.2], [1.0, 1.2], [1.0, 0]] }, at: [x0 + 1.8 + (i % 2) * 3.6, 6.0 + Math.floor(i / 4) * 2.4, ((i >> 1) % 2 ? 1 : -1) * 3.5], mat: 'ferrite-soft', color: HUE.ferrite }])),
    piece('windings', 'magnet-wire', [box('core', [5.5, 4.0, 10], [x0 + 3.6, 7.0, 0], 'copper', { share: 0.04, color: 0xb87333 })])] };
  // (each light a die on its small lead frame under its clear epoxy lens, in the jack's face by the board)
  // (its two leads back through the housing and down through the board 1.27 mm either side of it, 15.4 mm in from the
  // jack's back: the footprint's pads 9–12)
  const led = (name: string, item: string, die: string, z: number, color: number): Comp => ({ name, item, at: [0, 0, 0], solids: [box('cap', [0.4, lh, lw], [D / 2 - 0.15, ly, z], 'epoxy', { color })], kids: [piece(`${name} die`, die, [box('die', [0.1, 0.3, 0.3], [D / 2 - 0.3, ly, z], 'silicon', { color: 0x222222 })]), piece(`${name} lead frame`, 'lead-frame', [-1, 1].flatMap((s): Solid[] => [box('lead', [D / 2 - 0.4 - (x0 + 15.4), 0.5, 0.5], [(D / 2 - 0.4 + x0 + 15.4) / 2, ly, z + s * 1.27], 'copper', { color: HUE.tin }), box('lead', [0.5, ly + 3.2, 0.5], [x0 + 15.4, (ly - 3.2) / 2, z + s * 1.27], 'copper', { color: HUE.tin })]))] });
  return { comp: { name: 'RJ45 jack with magnetics', item: 'rj45-jack', at: [0, 0, 0], kids: [shield, housing, ...contacts, mag, led('green light', 'led-chip-green', 'led-die-ingan', -lz * -(fc?.green ?? -1), 0x35c94a), led('yellow light', 'led-chip-yellow', 'led-die-algainp', lz * -(fc?.green ?? -1), 0xf2c12e)] }, size: [D, W, H],
    src: (o.trxcom ? 'Trxcom TRJG0926HENL\'s listing: 15.90 × 21.30 × 13.40 mm; ' : '') + 'HanRun HR911105A outline (16.04 × 21.30 × 13.5 mm, green and yellow LEDs: HQ Online, KiCad footprint); its tails, shield legs, pegs and lights\' leads where KiCad\'s footprint puts them (contacts in two rows 1.27 mm apart, 1.6 and 4.14 mm in from its back); 8P8C mouth per IEC 60603-7' };
}

// ---- microSD ------------------------------------------------------------------------------------------------------------
/** A push-push microSD socket, its card slot at +x: its stainless cover over its moulded base, nine sprung contacts
 *  (eight and the card-detect) and its push-push ejector. 13.7 × 13.75 mm measured on the Orange Pi 5 (Würth's hinged
 *  693072010801 has that outline, 13.60 × 13.70, but not its push-push action, so this is no part of theirs); 1.85 mm tall
 *  (typical of push-push sockets); its slot for a card 11 × 1.0 mm (the SD Association's microSD). */
export function microSD(o: { D?: number; W?: number; H?: number; eject?: boolean; src?: string } = {}): BoardPart {
  const D = o.D ?? 13.75, W = o.W ?? 13.7, H = o.H ?? 1.85, x0 = -D / 2, eject = o.eject ?? true;
  const cover = piece('microSD cover', 'microsd-shell', [box('term', [D, 0.15, W], [0, H - 0.075, 0], 'stainless-304', { color: HUE.stainless }), ...[-1, 1].map((s): Solid => box('term', [D - 1.5, H - 0.15, 0.15], [-0.75, (H - 0.15) / 2, s * (W / 2 - 0.075)], 'stainless-304', { color: HUE.stainless })),
    box('term', [0.15, H - 0.15, W - 0.3], [x0 + 0.075, (H - 0.15) / 2, 0], 'stainless-304', { color: HUE.stainless })]);
  const base = piece('microSD base', 'microsd-base', [box('body', [D - 0.3, 0.5, W - 0.3], [0.15 - 0.15, 0.25, 0], 'nylon', { color: HUE.black }), box('body', [2.0, H - 0.65, W - 0.3], [x0 + 1.2, 0.5 + (H - 0.65) / 2, 0], 'nylon', { color: HUE.black })]);
  const contacts = Array.from({ length: 9 }, (_, i): Comp => piece(`microSD contact ${i + 1}`, 'microsd-contact', [box('lead', [4.5, 0.1, 0.7], [x0 + 5.5, 0.6, (i - 4) * 1.1], 'phosphor-bronze', { color: HUE.gold, rot: [0, 0, 0.12] }), box('lead', [1.0, 0.1, 0.6], [x0 - 0.5, 0.05, (i - 4) * 1.1], 'phosphor-bronze', { color: HUE.gold })]));
  const ejector: Comp = { name: 'push-push ejector', item: 'microsd-ejector', at: [0, 0, 0], kids: [piece('ejector slider', 'microsd-slider', [box('body', [6, 0.6, 1.6], [1.0, 0.9, -W / 2 + 1.2], 'nylon', { color: HUE.black })]), piece('ejector spring', 'spring-compression', [{ role: 'lead', shape: { tube: { r: 0.2, pts: [[x0 + 3, 0.9, -W / 2 + 1.0], [x0 + 6, 0.9, -W / 2 + 1.0]] } }, at: [0, 0, 0], mat: 'steel-alloy', color: HUE.steel }])] };
  return { comp: { name: eject ? 'microSD socket (push-push)' : 'microSD socket (push-pull)', item: eject ? 'microsd-socket' : 'microsd-socket-pull', at: [0, 0, 0], kids: [cover, base, ...contacts, ...(eject ? [ejector] : [])] }, size: [D, W, H],
    src: o.src ?? 'measured on the Orange Pi 5 (13.7 × 13.75 mm); 1.85 mm tall typical of push-push sockets; microSD card 11 × 15 × 1.0 mm (SD Association)' };
}

// ---- pin headers -----------------------------------------------------------------------------------------------------
/** A 2.54 mm pin header, rows × cols: its moulded strip 2.54 tall, its pins 0.64 mm square, 6.0 above the strip and 3.0
 *  through the board below it (Würth WR-PHD 6130xx21121, as KiCad's 3D models take them). Pins along x, rows along z,
 *  pin 1 at -x in the +z row. */
export function pinHeader(rows: 1 | 2, cols: number, plate: 'gold' | 'tin' = 'gold', blocks = 0): BoardPart {
  const p = 2.54, L = cols * p, W = rows * p, base = 2.54, up = 6.0, down = 3.0, len = up + base + down;
  // (`blocks`: its insulator moulded in blocks of so many columns, each its top's long edges chamfered 0.35 mm, a groove
  // 0.25 mm wide between them, as Raspberry Pi's photos show their headers'; else one strip)
  const c = 0.35, g = 0.25, sec: V2[] = [[-W / 2, 0], [W / 2, 0], [W / 2, base - c], [W / 2 - c, base], [-W / 2 + c, base], [-W / 2, base - c]];
  const strip = piece('header insulator', 'header-insulator', blocks > 0
    ? Array.from({ length: Math.ceil(cols / blocks) }, (_, b): Solid => { const n = Math.min(blocks, cols - b * blocks), x0 = -L / 2 + b * blocks * p; return along('body', sec, [], n * p - g, x0 + g / 2, 'pbt', { color: HUE.black }); })
    : [box('body', [L, base, W], [0, base / 2, 0], 'pbt', { color: HUE.black })]);
  const pins: Comp[] = [];
  // (numbered as headers are: pin 1 in the first row (+z), pin 2 beside it in the second, odd pins along the first row)
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) pins.push(piece(`header pin ${c * rows + r + 1}`, 'header-pin', [box('lead', [0.64, len, 0.64], [(c - (cols - 1) / 2) * p, base + up - len / 2, ((rows - 1) / 2 - r) * p], 'brass', { color: plate === 'tin' ? HUE.tin : HUE.gold, finish: 'bright', lead: c * rows + r })]));
  return { comp: { name: `${rows * cols}-pin header`, item: `pin-header-${rows}x${cols}`, at: [0, 0, 0], kids: [strip, ...pins] }, size: [L, W, base + up], src: 'Würth WR-PHD 6130xx21121 (via KiCad\'s 3D model parameters): 2.54 mm pitch, 0.64 mm pins 6.0 mm above a 2.54 mm strip; their tails 3.0 mm below its seat (RS\'s listing of the WR-PHD: mating length 6 mm, tail 3 mm), through the board and out under it' };
}

// ---- FPC and board-to-board sockets -----------------------------------------------------------------------------------
/** A 0.5 mm FPC socket, 30 contacts (TE 3-1734839-0: 20.43 × 5.1 × 2.05 mm, its housing LCP, its contacts phosphor
 *  bronze gold-plated, a slide-lock actuator pushed in at its mouth after the cable: TE's datasheet and Braunec's
 *  listing): its mouth at +x. */
export function fpc30(): BoardPart {
  const W = 20.43, D = 5.1, H = 2.05, x0 = -D / 2, n = 30;
  const housing = piece('FPC housing', 'fpc-housing', [box('body', [D - 1.3, H, W - 1.4], [x0 + (D - 1.3) / 2, H / 2, 0], 'nylon', { color: HUE.ivory }), box('body', [1.3, H - 0.6, W - 1.4], [D / 2 - 0.65, 0.3 + (H - 0.6) / 2, 0], 'nylon', { color: HUE.ivory, share: 0.4 })]);
  const actuator = piece('FPC slide lock', 'fpc-actuator', [box('body', [1.2, 0.7, W - 1.6], [D / 2 - 0.6, H - 0.35, 0], 'nylon', { color: HUE.brown })]);
  const tabs = [-1, 1].map((s): Comp => piece('FPC hold-down tab', 'fpc-tab', [box('term', [2.2, 1.6, 0.6], [x0 + 2.2, 0.8, s * (W / 2 - 0.3)], 'brass', { color: HUE.tin })]));
  const contacts = Array.from({ length: n }, (_, i): Comp => piece(`FPC contact ${i + 1}`, 'fpc-contact', [box('lead', [D - 0.8, 0.08, 0.2], [x0 + 0.4 + (D - 0.8) / 2, 0.6, (i - (n - 1) / 2) * 0.5], 'phosphor-bronze', { color: HUE.gold }), box('lead', [0.9, 0.1, 0.25], [x0 - 0.35, 0.05, (i - (n - 1) / 2) * 0.5], 'phosphor-bronze', { color: HUE.gold })]));
  return { comp: { name: '30-contact FPC socket (0.5 mm)', item: 'fpc-socket-30', at: [0, 0, 0], kids: [housing, actuator, ...tabs, ...contacts] }, size: [D, W, H], src: 'TE 3-1734839-0 (20.43 × 5.1 × 2.05 mm, LCP, slide lock: TE datasheet via Braunec and Heilind)' };
}
/** A 30-contact board-to-board socket, two rows of 15 (a camera's): 8.0 × 2.6 mm measured on the Orange Pi 5, 1.0 mm
 *  tall (typical); its pitch read from the photo as 0.4–0.45 mm, drawn at 0.4 (not confirmed by its maker's drawing). */
export function b2b30(): BoardPart {
  const L = 8.0, W = 2.6, H = 1.0;
  const housing = piece('board-to-board housing', 'b2b-housing', [box('body', [L, H, W], [0, H / 2, 0], 'nylon', { color: HUE.black, share: 0.6 })]);
  const contacts = [-1, 1].flatMap((s) => Array.from({ length: 15 }, (_, i): Comp => piece(`contact ${s < 0 ? i + 1 : 16 + i}`, 'b2b-contact', [box('lead', [0.2, 0.75, 0.12], [(i - 7) * 0.4, H * 0.55, s * 0.55], 'phosphor-bronze', { color: HUE.gold }), box('lead', [0.2, 0.08, 0.6], [(i - 7) * 0.4, 0.04, s * (W / 2 + 0.15)], 'phosphor-bronze', { color: HUE.gold })])));
  return { comp: { name: '30-contact board-to-board socket', item: 'b2b-socket-30', at: [0, 0, 0], kids: [housing, ...contacts] }, size: [L, W, H], src: 'measured on the Orange Pi 5 (8.0 × 2.6 mm); height typical; pitch read from the photo (0.4–0.45 mm), not confirmed' };
}

// ---- switches ------------------------------------------------------------------------------------------------------------
/** A tactile switch, 4.2 × 2.8 × 1.9 mm (C&K KMR2's drawing, via KiCad's footprint): its moulded base with four
 *  terminals, the stainless dome that snaps over its contacts, the plunger on the dome, the steel frame over all. Its
 *  length along x. */
export function tactKMR2(): BoardPart {
  const L = 4.2, W = 2.8, H = 1.9;
  const kids: Comp[] = [
    piece('switch base', 'tact-base', [box('body', [L - 0.6, 1.0, W], [0, 0.5, 0], 'nylon', { color: HUE.white })]),
    piece('switch dome', 'tact-dome', [{ role: 'cap', shape: { lathe: [[0, 1.25], [1.0, 1.02], [1.1, 1.0], [0, 1.0]] }, at: [0, 0, 0], mat: 'stainless-304', color: HUE.stainless }]),
    piece('switch plunger', 'tact-plunger', [{ role: 'cap', shape: { cyl: [0.55, 0.5] }, at: [0, 1.5, 0], mat: 'nylon', color: 0x9a9da1 }]),
    piece('switch frame', 'tact-frame', [box('term', [L - 0.6, 0.15, W], [0, 1.83, 0], 'steel-low', { color: HUE.steel, bores: [{ x: 0, z: 0, r: 0.62 }] })]),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b], i): Comp => piece(`switch terminal ${i + 1}`, 'tact-terminal', [box('lead', [0.6, 0.15, 0.6], [a! * (L / 2 - 0.3), 0.075, b! * (W / 2 - 0.5)], 'copper', { color: HUE.tin })])),
  ];
  return { comp: { name: 'tactile switch', item: 'tact-switch', at: [0, 0, 0], kids }, size: [L, W, H], src: 'C&K KMR2 (4.2 × 2.8 × 1.9 mm) via KiCad footprint; fits the Orange Pi 5\'s buttons by size' };
}
/** A side-pushed tactile switch, its plunger out at +x: its body 2.8 × 4.6 mm measured on the Orange Pi 5 (its power
 *  button), 3.5 tall (typical), its round plunger 1.5 mm across standing out 1.0 mm. */
export function tactSide(o: { L?: number; W?: number; H?: number; out?: number; src?: string } = {}): BoardPart {
  const L = o.L ?? 2.8, W = o.W ?? 4.6, H = o.H ?? 3.5, out = o.out ?? 1.0;
  const kids: Comp[] = [
    piece('switch base', 'tact-base', [box('body', [L, H - 0.2, W - 0.6], [0, (H - 0.2) / 2, 0], 'nylon', { color: HUE.black })]),
    piece('switch dome', 'tact-dome', [box('cap', [0.1, 1.6, 1.6], [L / 2 - 0.4, H / 2, 0], 'stainless-304', { color: HUE.stainless })]),
    piece('switch plunger', 'tact-plunger', [{ role: 'cap', shape: { cyl: [0.75, out] }, at: [L / 2 + out / 2, H / 2, 0], rot: [0, 0, PI / 2], mat: 'nylon', color: HUE.black }]),
    piece('switch frame', 'tact-frame', [box('term', [L, H, 0.15], [0, H / 2, -(W / 2 - 0.075)], 'steel-low', { color: HUE.steel }), box('term', [L, H, 0.15], [0, H / 2, W / 2 - 0.075], 'steel-low', { color: HUE.steel })]),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b], i): Comp => piece(`switch terminal ${i + 1}`, 'tact-terminal', [box('lead', [0.6, 0.15, 0.7], [a! * (L / 2 - 0.3), 0.075, b! * (W / 2 + 0.2)], 'copper', { color: HUE.tin })])),
  ];
  return { comp: { name: 'side-pushed tactile switch', item: 'tact-switch-side', at: [0, 0, 0], kids }, size: [L, W, H], src: o.src ?? 'measured on the Orange Pi 5 (2.8 × 4.6 mm body, plunger out at the board\'s edge as its side photo shows); height typical' };
}

// ---- audio, fan, microphone ---------------------------------------------------------------------------------------------
/** A 3.5 mm SMD headphone jack, its mouth at +x: its moulded body 6.2 wide, 12 deep, 5.0 tall with its round nose 2 mm
 *  further (the outline of Bsun's PJ31060-I via KiCad: 6.2 × 14.0 mm; its height typical), its bore for a 3.5 mm plug
 *  through the nose, six sprung gold contacts on its sides and top. */
export function jack35(): BoardPart {
  const W = 6.2, D = 14.0, Db = 12.0, H = 5.0, x0 = -D / 2, r = 3.6 / 2;
  const bodyPts = rect(W, H, 0), bore: V2[] = Array.from({ length: 24 }, (_, i): V2 => [r * Math.cos((2 * PI * i) / 24), H / 2 + r * Math.sin((2 * PI * i) / 24)]);
  const nose: V2[] = Array.from({ length: 32 }, (_, i): V2 => [2.5 * Math.cos((2 * PI * i) / 32), H / 2 + 2.5 * Math.sin((2 * PI * i) / 32)]);
  const body = piece('jack body', 'jack-socket-body', [along('body', bodyPts, [bore], Db, x0, 'pbt', { color: HUE.black, share: 0.75 }), along('body', nose, [bore], D - Db, x0 + Db, 'pbt', { color: HUE.black })]);
  // (four springs in slots along its top, bent strips 0.5 mm wide seen through the moulding, as its photos show them;
  // two along its sides; each with its foot out to its pad)
  const springs = Array.from({ length: 6 }, (_, i): Comp => { const top = i < 4, x = top ? x0 + 1.8 + i * 2.6 : x0 + 3 + (i - 4) * 5, z = top ? -W / 2 + 1.2 : W / 2 + 0.1;
    return piece(`jack contact ${i + 1}`, 'jack-spring', [box('lead', top ? [0.5, 0.15, 2.4] : [2.2, 3.2, 0.2], top ? [x, H + 0.05, z + 0.8] : [x, 1.9, z], 'phosphor-bronze', { color: HUE.gold, ...(top ? { rot: [0.25, 0, 0] as V3 } : {}) }), box('lead', [0.9, 0.1, 1.0], [x, 0.05, top ? -W / 2 - 0.6 : W / 2 + 0.6], 'phosphor-bronze', { color: HUE.gold })]); });
  return { comp: { name: '3.5 mm headphone jack', item: 'audio-jack', at: [0, 0, 0], kids: [body, ...springs] }, size: [D, W, H], src: 'Bsun PJ31060-I outline (6.2 × 14.0 mm) via KiCad footprint; fits the Orange Pi 5\'s jack by size; height typical' };
}
/** The four-pole audio and video jack of the Raspberry Pi 3B+ and 4B (J7 on both), its mouth at +x, as their photos
 *  show it (its maker's part is not published; every figure here read off Raspberry Pi's two photos through their
 *  cameras, photo.py mark, wall and same --edges): a black moulded face 6.7 wide and 6.1 tall, its bore (r 1.75, fitted
 *  to the bore's ellipse) centred on it 3.05 up, its round nose r 2.85 standing 2.6 out of it, 1.5 past the board's
 *  edge; a tin-plated steel shell over the top and sides of the 2.8 mm behind it, 6.0 tall, a square window in each side
 *  and a leg off each side down through the board, soldered; a black back housing 8.2 long, open on top where its switch
 *  lever lies and its two contacts' tops show at its back corners, a tail off each side at its back, soldered. Its left side is hidden in both photos: drawn as its right. Its contacts'
 *  tails under it are not drawn (no photo of its underside). */
export function avJack(o: { th?: number } = {}): BoardPart {
  const t = o.th ?? 1.4, W = 6.7, Hf = 6.1, Tf = 0.6, Ln = 2.6, rn = 2.85, ya = 3.05, Ls = 2.8, Ws = 6.6, Hs = 6.0, st = 0.3, Lb = 8.2, Wb = 6.6, Hb = 6.4;
  const D = Ln + Tf + Ls + Lb, xb = -D / 2, xs = xb + Lb, xf = xs + Ls, xn = xf + Tf;   // (back, shell's back, face's back, nose's root)
  const ring = (r: number, n = 32): V2[] => Array.from({ length: n }, (_, i): V2 => [r * Math.cos((2 * PI * i) / n), ya + r * Math.sin((2 * PI * i) / n)]);
  const bore = ring(1.75, 24), BLK = { color: HUE.black }, TIN = { color: HUE.tin };
  const face = piece('jack face', 'jack-socket-body', [along('body', rect(W, Hf, 0), [bore], Tf, xf, 'pbt', BLK), along('body', ring(rn), [bore], Ln, xn, 'pbt', BLK),
    // (the moulding under the shell that carries the bore back to the contacts)
    along('body', rect(Ws - 2 * st, Hs - st, 0), [bore], Ls, xs, 'pbt', { ...BLK, share: 0.7 })]);
  const win = rect2(xs + Ls / 2, Hs / 2 - 0.2, 1.0, 1.3);
  const shell = piece('jack shell', 'jack-shell', [plate('term', rect2(xs + Ls / 2, 0, Ls, Ws), [], st, Hs - st, 'steel-low', TIN),
    ...[-1, 1].map((s): Solid => wall('term', rect2(xs + Ls / 2, (Hs - st) / 2, Ls, Hs - st), [win], st, s * (Ws / 2 - st / 2), 'steel-low', TIN)),
    // (a leg off each side near its back, down through the board)
    ...[-1, 1].map((s): Solid => box('term', [0.8, t + 0.9, st], [xs + 0.7, -(t + 0.9) / 2 + 0.3, s * (Ws / 2 - st / 2)], 'steel-low', TIN))]);
  // (the back housing: a U open on top, its cavity 4.2 wide and 2.0 deep, closed by its back wall 1.6 thick)
  const cav: V2[] = [[-Wb / 2, 0], [Wb / 2, 0], [Wb / 2, Hb], [2.0, Hb], [2.0, Hb - 2.0], [-2.0, Hb - 2.0], [-2.0, Hb], [-Wb / 2, Hb]];
  const back = piece('jack housing', 'jack-socket-body', [along('body', cav, [], Lb - 1.6, xb + 1.6, 'pbt', { ...BLK, share: 0.75 }), box('body', [1.6, Hb, Wb], [xb + 0.8, Hb / 2, 0], 'pbt', BLK)]);
  const lever = piece('jack switch lever', 'jack-lever', [box('body', [Lb - 2.4, 0.9, 1.4], [xb + 1.6 + (Lb - 2.4) / 2, Hb - 1.4, -0.3], 'pbt', { ...BLK, rot: [0, 0.18, 0] as V3 })]);
  const contacts = [-1, 1].map((s, i): Comp => piece(`jack contact ${i + 1}`, 'jack-spring-tin', [
    box('lead', [1.1, 0.12, 1.0], [xb + 0.6, Hb + 0.06, s * (Wb / 2 - 0.7)], 'phosphor-bronze', TIN),
    // (its tail off the side at the back, down through the board)
    box('lead', [0.8, t + 0.9, 0.3], [xb + 0.8, -(t + 0.9) / 2 + 0.3, s * (Wb / 2 + 0.15)], 'phosphor-bronze', TIN)]));
  return { comp: { name: 'audio and video jack (4 poles)', item: 'av-jack-4p', at: [0, 0, 0], kids: [face, shell, back, lever, ...contacts] }, size: [D, W, Hb],
    src: 'measured off Raspberry Pi\'s photos of its 3B+ and 4B (J7) through their calibrated cameras; its maker\'s part not published; its left side drawn as its right' };
}
/** A 1.25 mm two-pin wafer, right-angle (a fan's): Molex PicoBlade 53261-0271's outline, 7.65 × 4.2 mm with its two
 *  solder tabs, via KiCad (fits the Orange Pi 5's by size); 3.0 mm tall (typical); its mouth at +x. */
export function wafer2(): BoardPart {
  const W = 7.65, D = 4.2, H = 3.0, x0 = -D / 2;
  const housing = piece('wafer housing', 'wafer-housing', [along('body', rect(4.4, H, 0), [rect(3.3, 2.1, 0.45)], D, x0, 'nylon', { color: HUE.ivory }), box('body', [0.6, H, 4.4], [x0 + 0.3, H / 2, 0], 'nylon', { color: HUE.ivory })]);
  const pins = [-0.625, 0.625].map((z, i): Comp => piece(`wafer pin ${i + 1}`, 'wafer-pin', [box('lead', [D - 0.6, 0.32, 0.32], [0.3, 1.5, z], 'phosphor-bronze', { color: HUE.tin }), box('lead', [0.8, 0.1, 0.32], [x0 - 0.4, 0.05, z], 'phosphor-bronze', { color: HUE.tin })]));
  const tabs = [-1, 1].map((s, i): Comp => piece(`wafer tab ${i + 1}`, 'solder-tab', [box('term', [2.0, 1.8, 0.3], [0.2, 0.9, s * (W / 2 - 0.15)], 'brass', { color: HUE.tin })]));
  return { comp: { name: 'fan socket (1.25 mm, 2 pins)', item: 'wafer-2p-1.25', at: [0, 0, 0], kids: [housing, ...pins, ...tabs] }, size: [D, W, H], src: 'Molex PicoBlade 53261-0271 outline (7.65 × 4.2 mm) via KiCad; fits the Orange Pi 5\'s fan socket by size; height typical' };
}
/** An electret microphone capsule, d mm across and h tall, standing on the board: its aluminium can with its sound
 *  holes over its electret film, its backplate and the JFET that buffers it. */
export function micElectret(d: number, h: number): BoardPart {
  const kids: Comp[] = [
    piece('microphone can', 'mic-can', [{ role: 'term', shape: { cyl: [d / 2, h] }, at: [0, h / 2, 0], mat: 'al-6061', color: 0x1c1c1e, share: 0.18 }]),
    piece('electret film', 'electret-film', [{ role: 'film', shape: { cyl: [d / 2 - 0.3, 0.02] }, at: [0, h - 0.6, 0], mat: 'pet', color: 0xd8d0b0 }]),
    piece('backplate', 'mic-backplate', [{ role: 'core', shape: { cyl: [d / 2 - 0.4, 0.2] }, at: [0, h - 1.0, 0], mat: 'brass', color: HUE.gold }]),
    piece('JFET', 'si-die', [box('die', [0.5, 0.2, 0.5], [0, 0.4, 0], 'silicon')]),
  ];
  return { comp: { name: 'electret microphone', item: 'mic-electret', at: [0, 0, 0], kids }, size: [d, d, h], src: `measured on the Orange Pi 5 (${d} mm across); height typical of electret capsules` };
}

// ---- chips ----------------------------------------------------------------------------------------------------------------
/** A flip-chip chip-scale package, its die bare in the middle of its moulding: a mm square, from its maker's table
 *  (Rockchip's RK3588S: FCCSP1253L, 17 × 17 mm, 1,253 balls of 0.26 mm at 0.4 mm pitch, 42 a side; standoff A1 0.17,
 *  substrate A3 0.60, moulding c 0.47, 1.24 tall overall); its die window w × l. */
export function fccsp(a: number, die: [number, number], mark = ''): Comp {
  const A1 = 0.17, sub = 0.6, mould = 0.47, share = (PI / 4) * 0.26 ** 2 / 0.4 ** 2;
  return { name: 'system-on-chip', item: 'fccsp-package', at: [0, 0, 0], kids: [
    piece('solder balls', 'solder-balls', [box('lead', [16.4 + 0.26, A1, 16.4 + 0.26], [0, A1 / 2, 0], 'solder', { inBody: 0, share, color: 0xb8bcc0 })]),
    piece('substrate', 'bga-substrate', [box('core', [a, sub, a], [0, A1 + sub / 2, 0], 'bt', { color: 0x2e3a2c })]),
    // (the moulding round the die, its window the die's: drawn whole, weighed less the die, the die's bare back a hair proud)
    piece('moulding', 'mould-compound', [box('body', [a, mould, a], [0, A1 + sub + mould / 2, 0], 'emc', { color: 0x1d1e22, share: 1 - (die[0] * die[1]) / (a * a) })]),
    piece('die', 'si-die', [box('die', [die[1], mould, die[0]], [0, A1 + sub + mould / 2 + 0.005, 0], 'silicon', { color: HUE.die, ...(mark ? { text: mark, ink: 0x8d9096 } : {}) })]),
  ] };
}
/** A memory package (LPDDR4X, 200 balls), w × l mm, as Samsung's 10 × 15 mm ones are (distributors' listings of the
 *  K4U parts): its balls (0.3 mm), substrate, two dies stacked and wire-bonded, moulded over, 1.1 mm tall (typical: Micron's
 *  10 × 14.5 mm 200-ball packages are 1.05–1.14). */
export function lpddr(w: number, l: number, mark = ''): Comp {
  const ball = 0.25, sub = 0.25, mould = 0.6;
  return { name: 'memory (LPDDR4X)', item: 'lpddr-package', at: [0, 0, 0], kids: [
    piece('moulding', 'mould-compound', [box('body', [l, mould, w], [0, ball + sub + mould / 2, 0], 'emc', { color: 0x222327, ...(mark ? { text: mark, ink: 0x9a9ca0 } : {}) })]),
    piece('substrate', 'bga-substrate', [box('core', [l, sub, w], [0, ball + sub / 2, 0], 'bt', { color: 0x2e3a2c })]),
    piece('solder balls', 'solder-balls', [box('lead', [l * 0.9, ball, w * 0.9], [0, ball / 2, 0], 'solder', { inBody: 0, share: (PI / 6) * (0.3 / 0.65) ** 2, color: 0xb8bcc0 })]),
    ...[0, 1].map((k): Comp => piece('die', 'si-die', [box('die', [l * 0.7, 0.1, w * 0.7], [0, ball + sub + 0.1 + k * 0.15, 0], 'silicon')])),
  ] };
}
/** A chip from the package library (src/nexus/packages.ts: a QFN, a WSON…), marked; a small transistor's package (a
 *  SOT-23, a SOT-323) is the inventory's sot-package, a chip's its ic-package. */
export function chip(pk: string, name: string, mark = '', item = 'ic-package'): Comp {
  const q = pkgOf(pk); if (!q) throw new Error(`no outline kept for ${pk}`);
  const ss = pkgSolids(q), frame = ss.filter((s) => pkgItem(q, s.role) === 'lead-frame');
  return { name, item, at: [0, 0, 0], kids: [...ss.filter((s) => pkgItem(q, s.role) !== 'lead-frame').map((s): Comp => ({ name: `${name} ${s.role === 'body' ? 'moulding' : s.role === 'wire' ? 'bond wire' : s.role}`, ...(pkgItem(q, s.role) ? { item: pkgItem(q, s.role)! } : {}), solids: [s.role === 'body' && mark ? { ...s, color: 0x1d1e22, text: mark, ink: 0x9a9ca0 } : s], at: [0, 0, 0] })), { name: `${name} lead frame`, item: 'lead-frame', solids: frame, at: [0, 0, 0] }] };
}
/** A moulded power inductor, a × a × h mm (its size measured), its winding inside a moulded ferrite body, marked with
 *  its value; its colour as its board's photo shows it, where measured. */
export function inductor(a: number, b: number, h: number, mark = '', color = 0x6c6a66): Comp {
  return { name: `power inductor${mark ? ` ${mark}` : ''}`, item: 'inductor-power', at: [0, 0, 0], kids: [
    piece('ferrite body', 'ferrite-core', [box('core', [a, h, b], [0, h / 2, 0], 'ferrite-soft', { color, ...(mark ? { text: mark, ink: 0x2a2a2a } : {}) })]),
    piece('winding', 'winding', [box('core', [a * 0.6, h * 0.6, b * 0.6], [0, h / 2, 0], 'copper', { share: 0.5, color: 0xb87333 })]),
  ] };
}

/** A JST SH vertical header (1.0 mm pitch, its plug from above), n pins: its moulded housing (n + 2) × 2.9 mm (JST's
 *  BM0nB-SRSS-TB, via KiCad's footprints), 4.25 tall (JST's SH drawing), open at its top for the plug, its pins upright
 *  in it, a fitting nail each end. */
export function jstSH(n: number): BoardPart {
  const W = n + 2, D = 2.9, H = 4.25, x0 = -D / 2;
  const housing = piece('JST SH housing', 'wafer-housing', [along('body', rect(W, H, 0), [rect(n + 0.4, H - 1.0, 1.0)], D, x0, 'nylon', { color: HUE.ivory, share: 0.62 }), box('body', [D, 1.0, W], [0, 0.5, 0], 'nylon', { color: HUE.ivory })]);
  const pins = Array.from({ length: n }, (_, i): Comp => piece(`pin ${i + 1}`, 'wafer-pin', [box('lead', [0.32, H - 1.3, 0.32], [-0.3, 1.0 + (H - 1.3) / 2, (i - (n - 1) / 2) * 1.0], 'phosphor-bronze', { color: HUE.tin }), box('lead', [1.2, 0.1, 0.32], [x0 - 0.4, 0.05, (i - (n - 1) / 2) * 1.0], 'phosphor-bronze', { color: HUE.tin })]));
  const nails = [-1, 1].map((sg, i): Comp => piece(`fitting nail ${i + 1}`, 'solder-tab', [box('term', [1.2, 1.6, 0.3], [0.4, 0.8, sg * (W / 2 + 0.15)], 'brass', { color: HUE.tin })]));
  return { comp: { name: `JST SH header, ${n} pins (vertical)`, item: `jst-sh-${n}v`, at: [0, 0, 0], kids: [housing, ...pins, ...nails] }, size: [D, W, H], src: `JST BM0${n}B-SRSS-TB (${W} × 2.9 mm, KiCad's footprint from JST's eSH datasheet), 4.25 mm tall (JST's drawing)` };
}
/** A 0.5 mm FPC socket as a maker's 3D model gives its section (Raspberry Pi 5's camera/display and PCIe sockets): an
 *  upright wall D - 0.55 thick (cream), its cap D wide and 1.0 thick over it (its flip lock, brown), open at +x under the cap where the cable goes in;
 *  n contacts at 0.5 mm along it, each a spring on the wall's open face and a tail out to its pad. W wide, H tall. */
export function fpcUpright(n: number, W: number, D: number, H: number, o: { pitch?: number; body?: number; lock?: number; side?: boolean; tin?: boolean; src?: string } = {}): BoardPart {
  const x0 = -D / 2, wt = D - 0.55, pitch = o.pitch ?? 0.5, lead = o.tin ? HUE.tin : HUE.gold;
  // (its moulded base cream, its flip lock along its top brown, as Raspberry Pi 5's photo shows them: the lock's top
  // measured #9a7352 by photo.py colour, its photo and a render from its camera side by side; another board's as its
  // photo shows, `o.body` and `o.lock`; `o.side`: its lock an upright bar along its closed side, its full height, as a
  // Pi 4's photo shows its camera and display sockets', its body's top bare; `o.tin`: its contacts tin)
  const lockBar = o.side ? box('body', [0.9, H, W], [x0 + 0.45, H / 2, 0], 'nylon', { color: o.lock ?? 0x9a7352 }) : box('body', [D, 1.0, W], [0, H - 0.5, 0], 'nylon', { color: o.lock ?? 0x9a7352 });
  const housing = piece('FPC housing', 'fpc-housing', [o.side ? box('body', [wt - 0.9, H - 0.3, W - 0.6], [x0 + 0.9 + (wt - 0.9) / 2, (H - 0.3) / 2, 0], 'nylon', { color: o.body ?? HUE.ivory }) : box('body', [wt, H - 1.0, W - 0.6], [x0 + wt / 2, (H - 1.0) / 2, 0], 'nylon', { color: o.body ?? HUE.ivory }), lockBar]);
  const contacts = Array.from({ length: n }, (_, i): Comp => { const z = (i - (n - 1) / 2) * pitch;
    return piece(`FPC contact ${i + 1}`, 'fpc-contact', [box('lead', [0.1, H - 1.6, 0.2], [x0 + wt + 0.05, 0.3 + (H - 1.6) / 2, z], 'phosphor-bronze', { color: lead }), box('lead', [0.8, 0.1, 0.22], [D / 2 + 0.2, 0.05, z], 'phosphor-bronze', { color: lead })]); });
  const tabs = [-1, 1].map((sg): Comp => piece('FPC hold-down tab', 'fpc-tab', [box('term', [1.6, 1.2, 0.3], [x0 + 0.8, 0.6, sg * (W / 2 - 0.15)], 'brass', { color: HUE.tin })]));
  return { comp: { name: `${n}-contact FPC socket (${pitch} mm)`, item: `fpc-socket-${n}`, at: [0, 0, 0], kids: [housing, ...contacts, ...tabs] }, size: [D, W, H], src: o.src ?? `its outline and section as its board maker's 3D model gives it (${W} × ${D} × ${H} mm); ${n} contacts at ${pitch} mm` };
}
/** A part as its board maker's mechanical 3D model gives it, there only as its outline (L × W × H mm) and not named in
 *  it: drawn as that, a moulded body, and said so. */
export function refBody(L: number, W: number, H: number, name: string, color: number = HUE.black, mat = 'emc', mark = ''): Comp {
  return { name, item: 'ref-body', at: [0, 0, 0], solids: [box('body', [L, H, W], [0, H / 2, 0], mat, { color, ...(mark ? { text: mark, ink: 0x9a9ca0 } : {}) })] };
}
/** A shield can over a radio, L × W × H mm (its outline as a board maker's 3D model gives it): its drawn steel, its
 *  radio's die inside. */
export function shieldCan(L: number, W: number, H: number, name = 'Wi-Fi and Bluetooth radio'): Comp {
  return { name, item: 'wifi-module', at: [0, 0, 0], kids: [{ name: 'shield can', solids: [{ role: 'term', shape: { box: [L, H, W] }, at: [0, H / 2, 0], mat: 'steel-low', color: HUE.steel, shell: 0.15 }], at: [0, 0, 0] }, piece('radio die', 'si-die', [box('die', [4, 0.6, 4], [0, 0.4, 0], 'silicon')])] };
}
/** Side-looking LEDs side by side (a board's power and activity lights at its edge), each L × W × H mm, their light out at
 *  +x: each its die on its lead frame under its moulded lens, in its colour. */
export function sideLeds(L: number, W: number, H: number, lights: { name: string; item: string; die: string; color: number }[]): Comp {
  const kids = lights.map((l, i): Comp => { const z = (i - (lights.length - 1) / 2) * W;
    return { name: l.name, item: l.item, at: [0, 0, 0], solids: [box('cap', [L, H, W * 0.92], [0, H / 2, z], 'epoxy', { color: l.color })], kids: [piece(`${l.name} die`, l.die, [box('die', [0.1, 0.25, 0.25], [L / 2 - 0.2, H / 2, z], 'silicon', { color: 0x222222 })]), piece(`${l.name} lead frame`, 'lead-frame', [box('lead', [L * 0.8, 0.12, W * 0.5], [0, 0.06, z], 'copper', { color: HUE.tin })])] }; });
  return { name: 'indicator lights', item: 'led-pair', at: [0, 0, 0], kids };
}
/** A top-looking chip LED, L × W × H mm (an 0603 is 1.6 × 0.8 × 0.6), its length along x: its die on its lead frame
 *  under its clear moulded lens, which looks the colour its photo gives it unlit, the frame's two ends its pads. */
export function chipLed(L: number, W: number, H: number, l: { name: string; item: string; die: string; color: number }): Comp {
  return { name: l.name, item: l.item, at: [0, 0, 0], solids: [box('cap', [L * 0.7, H - 0.1, W], [0, 0.1 + (H - 0.1) / 2, 0], 'epoxy', { color: l.color })],
    kids: [piece(`${l.name} die`, l.die, [box('die', [0.25, 0.1, 0.25], [0, 0.15, 0], 'silicon', { color: 0x222222 })]),
      piece(`${l.name} lead frame`, 'lead-frame', [...[-1, 1].map((s): Solid => box('lead', [L * 0.15 + 0.05, H, W], [s * (L / 2 - (L * 0.15 + 0.05) / 2), H / 2, 0], 'copper', { color: HUE.tin })), box('lead', [L * 0.7, 0.1, W * 0.8], [0, 0.05, 0], 'copper', { color: HUE.tin })])] };
}
/** A flip-chip BGA under a metal lid, a mm square and H tall over all (a board maker's 3D model's): its balls, its
 *  substrate, its die, its nickel-plated copper lid over 86 % of it (typical of lidded FCBGAs), or as measured (`o.lid`
 *  mm across; `o.band`: a lid pressed with a raised band across its middle, so wide, its two edges' flanges `o.drop` mm
 *  lower, as a photo of it shows). */
export function fcbgaLid(a: number, H: number, mark = '', o: { lid?: number; band?: number; drop?: number; square?: boolean } = {}): Comp {
  const ball = 0.3, sub = 0.7, lid = H - ball - sub, la = o.lid ?? a * 0.86, share = (PI / 6) * (0.4 / 0.65) ** 2;
  // (`o.square`: the band a square in the lid's middle, its rim round it lower: a Pi 4's BCM2711's, as its photo shows)
  if (o.band) {
    const d = o.drop ?? 0.3, top = ball + sub + lid;
    return { name: 'system-on-chip', item: 'soc-package', at: [0, 0, 0], kids: [
      piece('solder balls', 'solder-balls', [box('lead', [a * 0.94, ball, a * 0.94], [0, ball / 2, 0], 'solder', { inBody: 0, share, color: 0xb8bcc0 })]),
      piece('substrate', 'bga-substrate', [box('core', [a, sub, a], [0, ball + sub / 2, 0], 'bt', { color: 0x2e3a2c })]),
      piece('die', 'si-die', [box('die', [a * 0.45, 0.6, a * 0.45], [0, ball + sub + 0.3, 0], 'silicon')]),
      // (its flanges along two edges, the band raised between them carrying its marking)
      piece('lid', 'heat-spreader', [{ role: 'tab', shape: { box: [la, lid - d, la] }, at: [0, ball + sub + (lid - d) / 2, 0], mat: 'copper', color: 0xc9cbcd, shell: 0.3 },
        { role: 'tab', shape: { box: [o.square ? o.band : la, d, o.band] }, at: [0, top - d / 2, 0], mat: 'copper', color: 0xc9cbcd, shell: 0.3, ...(mark ? { text: mark, ink: 0x5a5c60 } : {}) }]),
    ] };
  }
  return { name: 'system-on-chip', item: 'soc-package', at: [0, 0, 0], kids: [
    piece('solder balls', 'solder-balls', [box('lead', [a * 0.94, ball, a * 0.94], [0, ball / 2, 0], 'solder', { inBody: 0, share, color: 0xb8bcc0 })]),
    piece('substrate', 'bga-substrate', [box('core', [a, sub, a], [0, ball + sub / 2, 0], 'bt', { color: 0x2e3a2c })]),
    piece('die', 'si-die', [box('die', [a * 0.45, 0.6, a * 0.45], [0, ball + sub + 0.3, 0], 'silicon')]),
    piece('lid', 'heat-spreader', [{ role: 'tab', shape: { box: [la, lid, la] }, at: [0, ball + sub + lid / 2, 0], mat: 'copper', color: 0xc9cbcd, shell: 0.3, ...(mark ? { text: mark, ink: 0x5a5c60 } : {}) }]),
  ] };
}

/** Every part the boards are drawn from, by the name a board's layout gives it. */
export const BOARD_PARTS: Record<string, () => BoardPart> = {
  'usb-c-16': () => usbC(16), 'usb-c-24': () => usbC(24),
  'hdmi-a': () => hdmi('A'), 'hdmi-c': () => hdmi('C'), 'hdmi-d': () => hdmi('D'),
  'usb-a-2': () => usbA([2]), 'usb-a-3': () => usbA([3]), 'usb-a-2x2': () => usbA([2, 2]), 'usb-a-3x3': () => usbA([3, 3]), 'usb-a-2-side': () => usbA([2], { depth: 16.3, onSide: true }),
  'rj45': rj45, 'microsd-push': microSD, 'header-2x13': () => pinHeader(2, 13), 'header-2x20': () => pinHeader(2, 20), 'header-1x3': () => pinHeader(1, 3),
  'fpc-30': fpc30, 'b2b-30': b2b30, 'tact-kmr2': tactKMR2, 'tact-side': tactSide, 'jack-3.5': jack35, 'av-jack-4p': () => avJack(), 'wafer-2': wafer2, 'mic-4': () => micElectret(4.0, 1.5),
};

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
export const HUE = { steel: 0xc6cacd, stainless: 0xd2d5d7, gold: 0xffe29b, tin: 0xb9bcbf, black: 0x19191b, ivory: 0xebe4d2, usb3: 0x1f5fbf, white: 0xf0efea, brown: 0x4a3324, die: 0x101216, ferrite: 0x3d3d40 };
const box = (role: Solid['role'], b: V3, at: V3, mat: string, more: Partial<Solid> = {}): Solid => ({ role, shape: { box: b }, at, mat, ...more });
/** A section drawn along x: its outline in (across, up) less its openings, through `len` mm from x0. */
const along = (role: Solid['role'], outline: V2[], holes: V2[][], len: number, x0: number, mat: string, more: Partial<Solid> = {}): Solid =>
  ({ role, shape: { prism: { pts: outline, L: len, ...(holes.length ? { holes } : {}) } }, at: [x0 + len / 2, 0, 0], rot: [0, PI / 2, 0], mat, ...more });
const piece = (name: string, item: string, solids: Solid[]): Comp => ({ name, item, solids, at: [0, 0, 0] });
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
  const shell = piece('USB-C shell', 'usb-c-shell', [along('term', stadium(W, H, 0), [stadium(iw, ih, (H - ih) / 2)], D, x0, 'stainless-304', { color: HUE.stainless }),
    // (its rear wall, folded down over the moulding; its four legs into the board)
    box('term', [0.3, H, W - 1.2], [x0 + 0.15, H / 2, 0], 'stainless-304', { color: HUE.stainless }),
    ...[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([a, b]): Solid => box('term', [0.6, 0.8, 0.3], [a! * 2.2, -0.4, b! * (W / 2 - 0.15)], 'stainless-304', { color: HUE.stainless }))]);
  const tongue = piece('USB-C tongue', 'usb-c-tongue', [box('body', [tl, t, tw], [x0 + 0.3 + tl / 2, yc, 0], 'nylon', { color: HUE.black }), box('body', [1.4, ih, iw - 0.3], [x0 + 0.3 + 0.7, H / 2, 0], 'nylon', { color: HUE.black })]);
  const pos = contacts === 24 ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [1, 4, 5, 6, 7, 8, 9, 12];
  const pins = [-1, 1].flatMap((face) => pos.map((k): Comp => { const z = (k - 6.5) * 0.5;
    return piece(`USB-C contact ${face > 0 ? 'A' : 'B'}${k}`, 'usb-c-contact', [box('lead', [tl - 1.6, 0.05, 0.25], [x0 + 1.9 + (tl - 1.6) / 2, yc + face * (t / 2 + 0.025), z], 'phosphor-bronze', { color: HUE.gold }),
      box('lead', [1.0, 0.1, 0.25], [x0 - 0.5, face > 0 ? 0.05 : 0.15, z * 1.05], 'phosphor-bronze', { color: HUE.gold })]); }));
  return { comp: { name: `USB-C receptacle (${contacts} contacts)`, item: contacts === 24 ? 'usb-c-socket-24' : 'usb-c-socket', at: [0, 0, 0], kids: [shell, tongue, ...pins] }, size: [D, W, H],
    src: 'USB Type-C spec (receptacle opening 8.34 × 2.56 mm, tongue 6.69 × 0.70 mm); HRO TYPE-C-31-M-12 drawing via KiCad footprint (8.94 × 7.35 mm) and HQ Online (3.21 mm tall)' };
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
  const plate: Solid = { role: 'term', shape: { prism: { pts: [[x0 + back, -W / 2], [D / 2, -W / 2], [D / 2, W / 2], [x0 + back, W / 2]], L: st, ...(tabs.length ? { holes: tabs.map((z): V2[] => [[r, z - sw / 2], [f, z - sw / 2], [f, z + sw / 2], [r, z + sw / 2]]) } : {}) } }, at: [0, H - st / 2, 0], rot: [PI / 2, 0, 0], mat: 'steel-low', color: HUE.steel };
  const fingers = tabs.map((z): Solid => box('term', [tl, st, sw - 0.6], [r + (tl / 2) * Math.cos(th), H - st / 2 - (tl / 2) * Math.sin(th), z], 'steel-low', { color: HUE.steel, rot: [0, 0, -th] }));
  const shell = piece('HDMI shell', 'hdmi-shell', [along('term', u, [], D, x0, 'steel-low', { color: HUE.steel }), plate, ...fingers,
    ...[-1, 1].map((s): Solid => box('term', [1.2, 0.8, 0.3], [x0 + D * 0.6, -0.4, s * (W / 2 - 0.15)], 'steel-low', { color: HUE.steel }))]);
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
export function usbA(ports: (2 | 3)[], o: { depth?: number; onSide?: boolean } = {}): BoardPart {
  const stack = ports.length === 2, W = stack ? 14.5 : 13.1, H1 = 5.72, iw = 12.5, ih = 5.12, gap = 4.0, H = stack ? 2 * H1 + gap : H1, D = o.depth ?? (stack ? 17.0 : 14.0), x0 = -D / 2;
  const kids: Comp[] = [], thru = !o.onSide, mat = stack ? 'brass' : 'steel-low', TAIL = 2.1, LEG = 3.94;
  // (a stack's body 13.64 wide, its face plate 14.5: Würth's drawing; its skins 0.25 thick, so a mouth's lining fits inside it)
  const Wb = stack && thru ? 13.64 : W, sk = stack && thru ? 0.25 : 0.3;
  // (a stack's upper mouth 0.2 mm lower where its mouths are lined, so its lining meets the shell's top inside it)
  const mouths = ports.map((_, k) => stack ? k * (H1 + gap - (thru ? 0.2 : 0)) : 0);
  // (the insulator's block at the back of each mouth: the plug's 12 mm in front of it, the face plate 0.3)
  const back = thru ? Math.max(0.3, D - 0.3 - 12) : 0.3, tl = thru ? D - back - 1.3 : D - 2.8;
  const U = (w: number, h: number): V2[] => [[-w / 2, 0], [-w / 2 + sk, 0], [-w / 2 + sk, h - sk], [w / 2 - sk, h - sk], [w / 2 - sk, 0], [w / 2, 0], [w / 2, h], [-w / 2, h]];
  const mouthsAt = mouths.map((y) => rect(iw, ih, y + (H1 - ih) / 2));
  const legs = (stack ? [1.04, 6.72] : [3.72]).flatMap((d) => [-1, 1].map((sg): Solid => box('term', [1.5, LEG + 0.15, 0.5], [x0 + d, (0.15 - LEG) / 2, sg * 6.57], mat, { color: HUE.steel })));
  // (a single port's shell is its mouth's skin; a stack's is a skin round both, its face plate cut for each mouth, a
  // moulded divider between them)
  kids.push(piece(stack ? 'USB-A stack shell' : 'USB-A shell', 'usb-a-shell', thru
    ? [...(stack ? [along('term', U(Wb, H), [], D - 0.3, x0, mat, { color: HUE.steel }), along('term', rect(W, H, 0), mouthsAt, 0.3, x0 + D - 0.3, mat, { color: HUE.steel }),
        ...mouthsAt.map((m, k) => along('term', rect(iw + 2 * sk, ih + 2 * sk, mouths[k]! + (H1 - ih) / 2 - sk), [m], D - 0.3 - back, x0 + back, mat, { color: HUE.steel }))]
      : [along('term', U(W, H), [], back, x0, mat, { color: HUE.steel }), along('term', rect(W, H, 0), mouthsAt, D - back, x0 + back, mat, { color: HUE.steel })]),
      box('term', [sk, H, Wb - 2 * sk], [x0 + sk / 2, H / 2, 0], mat, { color: HUE.steel }), ...legs]
    : [...(stack ? [along('term', rect(W, H, 0), [rect(W - 0.6, H - 0.6, 0.3)], D, x0, mat, { color: HUE.steel }), along('term', rect(W, H, 0), mouthsAt, 0.3, x0 + D - 0.3, mat, { color: HUE.steel })] : [along('term', rect(W, H, 0), mouthsAt, D, x0, mat, { color: HUE.steel })]),
      box('term', [0.3, H, W - 0.6], [x0 + 0.15, H / 2, 0], mat, { color: HUE.steel }), ...[-1, 1].map((sg): Solid => box('term', [1.0, 1.0, 0.3], [x0 + D * 0.5, -0.5, sg * (W / 2 - 0.15)], mat, { color: HUE.steel }))]));
  ports.forEach((gen, k) => {
    const y = mouths[k]! + (H1 - ih) / 2, ty = y + ih - 0.55 - 1.84 / 2, tongue = gen === 3 ? HUE.usb3 : HUE.black, xs = x0 + (thru ? back : 0.4);
    // (between the two mouths of a stack, its moulded floor; its tongue in the mouth's top half, 1.84 mm thick, out of its
    // block at the mouth's back)
    const block = thru ? box('body', [back - sk, ih + 2 * sk, iw + 2 * sk], [x0 + sk + (back - sk) / 2, y + ih / 2, 0], 'nylon', { color: tongue }) : box('body', [1.5, ih, iw - 0.4], [x0 + 0.4 + 0.75, y + ih / 2, 0], 'nylon', { color: tongue });
    const lo = (H1 - ih) / 2 + ih + sk, hi = (mouths[1] ?? 0) + (H1 - ih) / 2 - sk;
    const floor = thru ? box('body', [D - 0.3 - sk, hi - lo, Wb - 2 * sk], [x0 + sk + (D - 0.3 - sk) / 2, (lo + hi) / 2, 0], 'nylon', { color: HUE.black, share: 0.3 }) : box('body', [D - 0.9, gap + 0.6, W - 0.6], [x0 + 0.3 + (D - 0.9) / 2, H1 - 0.3 + (gap + 0.6) / 2, 0], 'nylon', { color: HUE.black, share: 0.3 });
    kids.push(piece(`USB-A tongue${stack ? (k ? ' upper' : ' lower') : ''}`, 'usb-a-tongue', [box('body', [tl, 1.84, 11.2], [xs + tl / 2, ty, 0], 'nylon', { color: tongue }), block, ...(stack && k === 0 ? [floor] : [])]));
    const zs = gen === 3 ? [-3.5, -1, 1, 3.5, -4.5, -2.25, 0, 2.25, 4.5] : [-3.5, -1, 1, 3.5], cy = ty - 0.92 - 0.075;
    // (each contact's tail down through its row: a stack's upper mouth's at the back, its lower's in front of them)
    const row = x0 + (stack ? (k ? 1.39 : 4.01) : 1.01);
    zs.forEach((z, i) => { const front = i < 4, w = front ? 0.6 : 0.4, b0 = thru ? xs + (front ? 1.4 : 0.3) : 0, b1 = b0 + (front ? tl - 2 : 2.2);
      kids.push(piece(`USB-A contact ${k ? 'upper' : 'lower'} ${i + 1}`, 'usb-a-contact', thru
        ? [box('lead', [b1 - b0, 0.15, front ? 1.0 : 0.7], [(b0 + b1) / 2, cy, z], 'phosphor-bronze', { color: HUE.gold }),
          box('lead', [b0 - row + 0.15, 0.15, w], [(row + b0) / 2, cy, z], 'phosphor-bronze', { color: HUE.gold }),
          box('lead', [0.3, cy + TAIL, w], [row, (cy - TAIL) / 2, z], 'phosphor-bronze', { color: HUE.gold })]
        : [box('lead', [front ? tl - 2 : 2.2, 0.15, front ? 1.0 : 0.7], [front ? x0 + 1.8 + (tl - 2) / 2 : x0 + 1.4 + 1.1, cy, z], 'phosphor-bronze', { color: HUE.gold }),
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
export function rj45(): BoardPart {
  const W = 16.04, H = 13.5, D = 21.3, x0 = -D / 2, mw = 11.9, mh = 6.9, my = 2.6, cav = 14.5;
  // (its shield bent round its top and sides, open under it where it stands on the board)
  const t = 0.25, U: V2[] = [[-W / 2, 0], [-W / 2 + t, 0], [-W / 2 + t, H - t], [W / 2 - t, H - t], [W / 2 - t, 0], [W / 2, 0], [W / 2, H], [-W / 2, H]];
  const shield = piece('RJ45 shield', 'rj45-shield', [along('term', U, [], D, x0, 'steel-low', { color: HUE.steel }), box('term', [0.25, H, W], [x0 + 0.125, H / 2, 0], 'steel-low', { color: HUE.steel }),
    ...[-1, 1].map((s): Solid => box('term', [1.2, 3.2 + 0.2, 0.25], [x0 + 7.45, (0.2 - 3.2) / 2, s * 7.745], 'steel-low', { color: HUE.steel }))]);
  // (its mouth for the plug with the latch's slot under it, one opening)
  const mouth: V2[] = [[-mw / 2, my], [-3.2, my], [-3.2, my - 1.5], [3.2, my - 1.5], [3.2, my], [mw / 2, my], [mw / 2, my + mh], [-mw / 2, my + mh]];
  const housing = piece('RJ45 housing', 'rj45-housing', [along('body', rect(W - 0.5, H - 0.25, 0), [mouth], cav, x0 + D - cav, 'pbt', { color: HUE.black, share: 0.6 }), box('body', [D - cav - 0.3, H - 0.25, W - 0.5], [x0 + 0.25 + (D - cav - 0.3) / 2, (H - 0.25) / 2, 0], 'pbt', { color: HUE.black, share: 0.55 }),
    // (its two moulded pegs down into the board's 3.25 mm holes, 2 mm below its seat: typical)
    ...[-1, 1].map((s): Solid => ({ role: 'body', shape: { cyl: [1.5, 2.0] }, at: [x0 + 10.5, -1.0, s * 5.715], mat: 'pbt', color: HUE.black }))]);
  const contacts = Array.from({ length: 8 }, (_, i): Comp => piece(`RJ45 contact ${i + 1}`, 'rj45-contact', [box('lead', [6.5, 0.3, 0.45], [x0 + D - 7.5, my + mh - 1.2, (i - 3.5) * 1.02], 'phosphor-bronze', { color: HUE.gold, rot: [0, 0, -0.35] }), box('lead', [0.4, 3.2, 0.4], [x0 + (i % 2 ? 1.6 : 4.14), -1.6, (i - 3.5) * 1.27], 'phosphor-bronze', { color: HUE.gold })]));
  // (four transformers and four common-mode chokes, each turns of magnet wire on a ferrite toroid, in its back)
  const mag: Comp = { name: 'RJ45 magnetics', item: 'rj45-magnetics', at: [0, 0, 0], kids: [...Array.from({ length: 8 }, (_, i): Comp => piece(`toroid ${i + 1}`, 'toroid-core', [{ role: 'core', shape: { lathe: [[1.0, 0], [1.75, 0], [1.75, 1.2], [1.0, 1.2], [1.0, 0]] }, at: [x0 + 1.8 + (i % 2) * 3.6, 6.0 + Math.floor(i / 4) * 2.4, ((i >> 1) % 2 ? 1 : -1) * 3.5], mat: 'ferrite-soft', color: HUE.ferrite }])),
    piece('windings', 'magnet-wire', [box('core', [5.5, 4.0, 10], [x0 + 3.6, 7.0, 0], 'copper', { share: 0.04, color: 0xb87333 })])] };
  // (each light a die on its small lead frame under its clear epoxy lens, in the jack's face by the board)
  // (its two leads back through the housing and down through the board 1.27 mm either side of it, 15.4 mm in from the
  // jack's back: the footprint's pads 9–12)
  const led = (name: string, item: string, die: string, z: number, color: number): Comp => ({ name, item, at: [0, 0, 0], solids: [box('cap', [0.4, 1.8, 2.6], [D / 2 - 0.15, 1.6, z], 'epoxy', { color })], kids: [piece(`${name} die`, die, [box('die', [0.1, 0.3, 0.3], [D / 2 - 0.3, 1.6, z], 'silicon', { color: 0x222222 })]), piece(`${name} lead frame`, 'lead-frame', [-1, 1].flatMap((s): Solid[] => [box('lead', [D / 2 - 0.4 - (x0 + 15.4), 0.5, 0.5], [(D / 2 - 0.4 + x0 + 15.4) / 2, 1.6, z + s * 1.27], 'copper', { color: HUE.tin }), box('lead', [0.5, 1.6 + 3.2, 0.5], [x0 + 15.4, (1.6 - 3.2) / 2, z + s * 1.27], 'copper', { color: HUE.tin })]))] });
  return { comp: { name: 'RJ45 jack with magnetics', item: 'rj45-jack', at: [0, 0, 0], kids: [shield, housing, ...contacts, mag, led('green light', 'led-chip-green', 'led-die-ingan', -5.355, 0x35c94a), led('yellow light', 'led-chip-yellow', 'led-die-algainp', 5.355, 0xf2c12e)] }, size: [D, W, H],
    src: 'HanRun HR911105A outline (16.04 × 21.30 × 13.5 mm, green and yellow LEDs: HQ Online, KiCad footprint); its tails, shield legs, pegs and lights\' leads where KiCad\'s footprint puts them (contacts in two rows 1.27 mm apart, 1.6 and 4.14 mm in from its back); 8P8C mouth per IEC 60603-7' };
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
export function pinHeader(rows: 1 | 2, cols: number): BoardPart {
  const p = 2.54, L = cols * p, W = rows * p, base = 2.54, up = 6.0, down = 3.0, len = up + base + down;
  const strip = piece('header insulator', 'header-insulator', [box('body', [L, base, W], [0, base / 2, 0], 'pbt', { color: HUE.black })]);
  const pins: Comp[] = [];
  // (numbered as headers are: pin 1 in the first row (+z), pin 2 beside it in the second, odd pins along the first row)
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) pins.push(piece(`header pin ${c * rows + r + 1}`, 'header-pin', [box('lead', [0.64, len, 0.64], [(c - (cols - 1) / 2) * p, base + up - len / 2, ((rows - 1) / 2 - r) * p], 'brass', { color: HUE.gold, lead: c * rows + r })]));
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
 *  upright wall D - 0.55 thick, its cap D wide and 1.0 thick over it, open at +x under the cap where the cable goes in;
 *  n contacts at 0.5 mm along it, each a spring on the wall's open face and a tail out to its pad. W wide, H tall. */
export function fpcUpright(n: number, W: number, D: number, H: number): BoardPart {
  const x0 = -D / 2, wt = D - 0.55;
  const housing = piece('FPC housing', 'fpc-housing', [box('body', [wt, H - 1.0, W - 0.6], [x0 + wt / 2, (H - 1.0) / 2, 0], 'nylon', { color: HUE.black }), box('body', [D, 1.0, W], [0, H - 0.5, 0], 'nylon', { color: HUE.black })]);
  const contacts = Array.from({ length: n }, (_, i): Comp => { const z = (i - (n - 1) / 2) * 0.5;
    return piece(`FPC contact ${i + 1}`, 'fpc-contact', [box('lead', [0.1, H - 1.6, 0.2], [x0 + wt + 0.05, 0.3 + (H - 1.6) / 2, z], 'phosphor-bronze', { color: HUE.gold }), box('lead', [0.8, 0.1, 0.22], [D / 2 + 0.2, 0.05, z], 'phosphor-bronze', { color: HUE.gold })]); });
  const tabs = [-1, 1].map((sg): Comp => piece('FPC hold-down tab', 'fpc-tab', [box('term', [1.6, 1.2, 0.3], [x0 + 0.8, 0.6, sg * (W / 2 - 0.15)], 'brass', { color: HUE.tin })]));
  return { comp: { name: `${n}-contact FPC socket (0.5 mm)`, item: `fpc-socket-${n}`, at: [0, 0, 0], kids: [housing, ...contacts, ...tabs] }, size: [D, W, H], src: `its outline and section as its board maker's 3D model gives it (${W} × ${D} × ${H} mm); ${n} contacts at 0.5 mm` };
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
/** A flip-chip BGA under a metal lid, a mm square and H tall over all (a board maker's 3D model's): its balls, its
 *  substrate, its die, its nickel-plated copper lid over 86 % of it (typical of lidded FCBGAs), or as measured (`o.lid`
 *  mm across; `o.band`: a lid pressed with a raised band across its middle, so wide, its two edges' flanges `o.drop` mm
 *  lower, as a photo of it shows). */
export function fcbgaLid(a: number, H: number, mark = '', o: { lid?: number; band?: number; drop?: number } = {}): Comp {
  const ball = 0.3, sub = 0.7, lid = H - ball - sub, la = o.lid ?? a * 0.86, share = (PI / 6) * (0.4 / 0.65) ** 2;
  if (o.band) {
    const d = o.drop ?? 0.3, top = ball + sub + lid;
    return { name: 'system-on-chip', item: 'soc-package', at: [0, 0, 0], kids: [
      piece('solder balls', 'solder-balls', [box('lead', [a * 0.94, ball, a * 0.94], [0, ball / 2, 0], 'solder', { inBody: 0, share, color: 0xb8bcc0 })]),
      piece('substrate', 'bga-substrate', [box('core', [a, sub, a], [0, ball + sub / 2, 0], 'bt', { color: 0x2e3a2c })]),
      piece('die', 'si-die', [box('die', [a * 0.45, 0.6, a * 0.45], [0, ball + sub + 0.3, 0], 'silicon')]),
      // (its flanges along two edges, the band raised between them carrying its marking)
      piece('lid', 'heat-spreader', [{ role: 'tab', shape: { box: [la, lid - d, la] }, at: [0, ball + sub + (lid - d) / 2, 0], mat: 'copper', color: 0xc9cbcd, shell: 0.3 },
        { role: 'tab', shape: { box: [la, d, o.band] }, at: [0, top - d / 2, 0], mat: 'copper', color: 0xc9cbcd, shell: 0.3, ...(mark ? { text: mark, ink: 0x5a5c60 } : {}) }]),
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
  'fpc-30': fpc30, 'b2b-30': b2b30, 'tact-kmr2': tactKMR2, 'tact-side': tactSide, 'jack-3.5': jack35, 'wafer-2': wafer2, 'mic-4': () => micElectret(4.0, 1.5),
};

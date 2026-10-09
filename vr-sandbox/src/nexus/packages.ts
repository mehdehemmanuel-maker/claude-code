// Electronic packages by their outlines (JEDEC, nominal): the body, how its leads leave it and where they go, their
// pitch, width and thickness, the span tip to tip, any exposed pad or tab, and the die inside on its lead frame with its
// bond wires, for every package a chip, a transistor, a regulator or a diode is sold in; and the chip resistor and
// capacitor (EIA case sizes), the leaded resistor (its colour bands by IEC 60062) and the LED, through-hole and surface.
// Each is one list of solids, mm, and both what it weighs and how it is drawn are read from that list: the kinds
// (src/nexus/kinds/electrical.ts, src/nexus/families.ts) take their mass and box from it, the library
// (src/nexus/components.ts) draws it, so the two never part. What it weighs is checked against makers' published
// weights (tests/nexus/packages.test.ts).
//
// Its frame: the board's surface y = 0, the body standing on it (through-hole leads go down through the board, below
// y = 0); a body's length along x, its width along z, so two rows of leads leave its ±z sides and a quad's all four.

import type { Print } from './kits';

export type Form = 'dip' | 'gull' | 'quad' | 'qfn' | 'sot' | 'sot223' | 'to92' | 'to220' | 'to263' | 'axial' | 'sma';
export interface Pkg {
  name: string; form: Form; pins: number;
  /** its body: length (x), width (z, a round body's diameter), height (y), mm; and how far it stands off the board */ L: number; W: number; H: number; A1: number;
  /** its leads: pitch, span tip to tip across, width, thickness (a round lead's diameter), length below the body (through-hole) */ pitch: number; span: number; lw: number; lt: number; leadL?: number;
  /** an exposed pad's side under it (QFN, HTSSOP), mm */ pad?: number; glass?: boolean; grounds: string;
  /** a flat no-lead package with pads on two sides only (SON, WSON, DFN), not four */ sides?: 2;
}
type Shape = { box: [number, number, number] } | { cyl: [number, number] } | { lathe: [number, number][] } | { prism: { pts: [number, number][]; L: number; holes?: [number, number][][] } } | { tube: { r: number; pts: [number, number, number][] } };
export type Role = 'body' | 'lead' | 'pad' | 'tab' | 'frame' | 'die' | 'wire' | 'mark' | 'film' | 'glaze' | 'term' | 'core' | 'cap' | 'band';
/** A solid, mm: what it is, its shape, where, turned how, of what (a density's name; '' for paint, which weighs
 *  nothing here); a hole through a tab (across its thinnest side, z, at its own height y); how much of it lies inside the body (whose moulding is that much less); a thin
 *  wall's thickness where it is a skin over what it covers (a termination's plating: a box open on its inner x face);
 *  the lead it belongs to; its own colour where its role's is not its (a band's); holes down through it; the share of
 *  its shape that is solid. */
export interface Solid { role: Role; shape: Shape; at: [number, number, number]; rot?: [number, number, number]; mat: string; hole?: { r: number; y: number }; inBody?: number; shell?: number; lead?: number; color?: number;
  /** holes drilled down through a slab (a board's mounting holes), mm, in its own frame */ bores?: { x: number; z: number; r: number }[];
  /** the share of its shape that is solid (a layer of solder balls, a hollow moulding) */ share?: number;
  /** the share of the room's light that reaches it, where it lies down in a cavity and sees the room only through its
   *  openings (a breadboard's clips under their holes) */ shade?: number;
  /** what is printed on its broad face (a chip's marking, a board's silkscreen), in ink of this colour where given */ text?: string; ink?: number;
  /** a picture on its top face, in this colour where its PNG is white and clear elsewhere (the copper a board's photo
   *  shows under its mask) */ paint?: { png: string; ink: number };
  /** its printing alone drawn, its ground clear (a board's silkscreen: the letters on the mask, not a plate) */ inkOnly?: boolean;
  /** how its surface was finished where its role's is not it (a connector's shell bright nickel, not a lead's matte tin) */ finish?: string;
  /** a turned shape drawn with so many flat sides (a square pin's pointed tip: 4) */ facets?: number;
  /** printing on its top face laid out as one print (words and lines where they are, mm in its own frame) */ prints?: Print[] }

// (DIP lengths by pin count from MS-001's variations; SOIC from MS-012 (narrow) and MS-013 (wide); TSSOP from MO-153;
// QFP body and pitch from MS-026; QFN from MO-220; all nominal)
const DIP_L: Record<number, number> = { 4: 4.6, 6: 8.9, 8: 9.6, 14: 19.05, 16: 19.05, 18: 22.86, 20: 26.0, 24: 31.75, 28: 34.7 };
const SOIC_L: Record<number, number> = { 8: 4.9, 10: 4.9, 14: 8.65, 16: 9.9, 18: 11.55, 20: 12.8, 24: 15.4, 28: 17.9 };
const TSSOP_L: Record<number, number> = { 8: 3.0, 14: 5.0, 16: 5.0, 20: 6.5, 24: 7.8, 28: 9.7 };
const QFP: Record<number, [number, number]> = { 32: [7, 0.8], 44: [10, 0.8], 48: [7, 0.5], 64: [10, 0.5], 80: [12, 0.5], 100: [14, 0.5], 144: [20, 0.5] };
const QFN: Record<number, [number, number]> = { 16: [3, 0.5], 20: [4, 0.5], 24: [4, 0.5], 28: [5, 0.5], 32: [5, 0.5], 40: [6, 0.5], 48: [7, 0.5], 56: [7, 0.4], 60: [7, 0.4], 64: [9, 0.5], 68: [7, 0.35] };
/** The widest pitch of MO-220's (0.65, 0.5, 0.4, 0.35 mm) that sets so many pads along a side of b mm with 0.45 mm
 *  clear at each corner. */
const qfnPitch = (n: number, b: number): number => [0.65, 0.5, 0.4, 0.35, 0.3].find((p) => (n / 4 - 1) * p <= b - 0.9) ?? 0.3;

/** A package by its name ("SOIC-8", "TQFP-32", "TO-220", "DO-41"), or null where none is kept. */
export function pkgOf(name: string): Pkg | null {
  const n = Number(/-(\d+)W?$/.exec(name)?.[1] ?? 0);
  if (/^DIP-\d+$/.test(name)) return { name, form: 'dip', pins: n, L: DIP_L[n] ?? (n / 2) * 2.54 + 0.9, W: 6.35, H: 3.3, A1: 0.5, pitch: 2.54, span: 7.62, lw: 0.46, lt: 0.25, leadL: 3.3, grounds: 'JEDEC MS-001: 2.54 mm pitch, rows 7.62 mm apart, nominal' };
  if (/^SOIC-\d+W?$/.test(name)) { const wide = n >= 18 || name.endsWith('W'); return { name, form: 'gull', pins: n, L: SOIC_L[n] ?? (n / 2) * 1.27 + 0.8, W: wide ? 7.5 : 3.9, H: 1.45, A1: 0.1, pitch: 1.27, span: wide ? 10.3 : 6.0, lw: 0.41, lt: 0.2, grounds: `JEDEC ${wide ? 'MS-013 (wide)' : 'MS-012 (narrow)'}: 1.27 mm pitch, nominal` }; }
  if (/^SSOP-\d+$/.test(name)) return { name, form: 'gull', pins: n, L: n === 28 ? 10.2 : n === 20 ? 7.2 : (n / 2) * 0.65 + 1.1, W: 5.3, H: 1.65, A1: 0.1, pitch: 0.65, span: 7.8, lw: 0.3, lt: 0.15, grounds: 'JEDEC MO-150: 0.65 mm pitch, 5.3 mm body, nominal' };
  if (/^H?TSSOP-\d+$/.test(name)) return { name, form: 'gull', pins: n, L: TSSOP_L[n] ?? (n / 2) * 0.65 + 0.6, W: 4.4, H: 0.9, A1: 0.1, pitch: 0.65, span: 6.4, lw: 0.25, lt: 0.15, ...(name.startsWith('H') ? { pad: 3 } : {}), grounds: `JEDEC MO-153: 0.65 mm pitch, 4.4 mm body${name.startsWith('H') ? ', an exposed pad under it' : ''}, nominal` };
  if (/^MSOP-\d+$/.test(name)) return { name, form: 'gull', pins: n, L: 3.0, W: 3.0, H: 0.85, A1: 0.1, pitch: n === 8 ? 0.65 : 0.5, span: 4.9, lw: 0.25, lt: 0.15, grounds: 'JEDEC MO-187: 3 × 3 mm body, nominal' };
  if (/^[TL]QFP-\d+$/.test(name)) { const [b, pitch] = QFP[n] ?? [Math.max(5, (n / 4) * 0.5 + 1), 0.5]; return { name, form: 'quad', pins: n, L: b, W: b, H: name.startsWith('T') ? 1.0 : 1.4, A1: 0.1, pitch, span: b + 2, lw: pitch * 0.45, lt: 0.15, grounds: `JEDEC MS-026: ${b} mm square, ${pitch} mm pitch, leads 1 mm out each side, nominal` }; }
  if (/^QFN-\d+$/.test(name)) { const [b, pitch] = QFN[n] ?? [Math.max(3, (n / 4) * 0.5 + 1), 0.5]; return { name, form: 'qfn', pins: n, L: b, W: b, H: 0.85, A1: 0, pitch, span: b, lw: 0.25, lt: 0.2, pad: +(b * 0.6).toFixed(2), grounds: `JEDEC MO-220: ${b} mm square, ${pitch} mm pitch, an exposed pad under it, nominal` }; }
  // (a QFN named with its body, "QFN-40-5x5": its pitch the widest that fits its pads along a side)
  const qs = /^QFN-(\d+)-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(name);
  if (qs) { const k = Number(qs[1]), b = Number(qs[2]), pitch = qfnPitch(k, b); return { name, form: 'qfn', pins: k, L: b, W: Number(qs[3]), H: 0.85, A1: 0, pitch, span: b, lw: Math.min(0.25, pitch * 0.55), lt: 0.2, pad: +(b * 0.6).toFixed(2), grounds: `JEDEC MO-220: ${b} × ${qs[3]} mm, ${pitch} mm pitch, an exposed pad under it, nominal` }; }
  // (a WSON-8, 6 × 5 mm: four pads at 1.27 mm along each long side, the exposed pad between; JEDEC MO-229, nominal)
  if (name === 'WSON-8') return { name, form: 'qfn', sides: 2, pins: 8, L: 6, W: 5, H: 0.75, A1: 0, pitch: 1.27, span: 5, lw: 0.4, lt: 0.2, pad: 3.4, grounds: 'JEDEC MO-229 (WSON-8, 6 × 5 mm): four pads at 1.27 mm along each long side and an exposed pad, nominal' };
  if (/^SOT-23(-\d)?$/.test(name)) { const k = Number(/^SOT-23-(\d)$/.exec(name)?.[1] ?? 3); return { name, form: 'sot', pins: k, L: 2.9, W: k > 3 ? 1.6 : 1.3, H: 0.95, A1: 0.05, pitch: 0.95, span: k > 3 ? 2.8 : 2.4, lw: 0.4, lt: 0.12, grounds: k > 3 ? 'JEDEC MO-178: 0.95 mm pitch, nominal' : 'JEDEC TO-236: 0.95 mm pitch, nominal' }; }
  if (/^SOT-323(-\d)?$/.test(name)) { const k = Number(/^SOT-323-(\d)$/.exec(name)?.[1] ?? 3); return { name, form: 'sot', pins: k, L: 2.0, W: 1.25, H: 0.95, A1: 0.05, pitch: 0.65, span: 2.1, lw: 0.3, lt: 0.12, grounds: 'JEDEC MO-203 (SC-70): a body 2.0 × 1.25 mm, its leads at 0.65 mm, 2.1 mm across them, nominal' }; }
  if (name === 'SOT-523') return { name, form: 'sot', pins: 3, L: 1.6, W: 0.8, H: 0.75, A1: 0.05, pitch: 0.5, span: 1.6, lw: 0.2, lt: 0.12, grounds: 'SOT-523 (SC-89): a body 1.6 × 0.8 mm, its leads at 0.5 mm, 1.6 mm across them (Diodes Inc.\'s SOT523 outline via KiCad\'s footprint, its pads 1.29 mm apart); its height 0.75, typical of the outline' };
  // (a DFN named with its body, "DFN-6-1.6x1.6": its pads along its two long sides at the widest of MO-229's pitches that
  // fits, an exposed pad between)
  const ds = /^DFN-(\d+)-(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/.exec(name);
  if (ds) { const k = Number(ds[1]), b = Number(ds[2]), w = Number(ds[3]), pitch = [0.65, 0.5, 0.4].find((q) => (k / 2 - 1) * q <= b - 0.5) ?? 0.4; return { name, form: 'qfn', sides: 2, pins: k, L: b, W: w, H: 0.55, A1: 0, pitch, span: w, lw: Math.min(0.3, pitch * 0.5), lt: 0.2, pad: +(Math.min(b, w) * 0.5).toFixed(2), grounds: `JEDEC MO-229: ${b} × ${w} mm, ${k / 2} pads at ${pitch} mm along each long side, an exposed pad between, nominal` }; }
  if (name === 'SOT-223') return { name, form: 'sot223', pins: 4, L: 6.5, W: 3.5, H: 1.6, A1: 0.05, pitch: 2.3, span: 7.0, lw: 0.7, lt: 0.26, grounds: 'JEDEC TO-261: three leads at 2.3 mm and a tab, nominal' };
  if (/^TO-92/.test(name)) return { name, form: 'to92', pins: 3, L: 4.8, W: 3.8, H: 4.8, A1: 0, pitch: 1.27, span: 0, lw: 0.45, lt: 0.4, leadL: 12.7, grounds: 'JEDEC TO-226 (TO-92): a D-shaped body, three leads at 1.27 mm, nominal' };
  if (/^TO-220/.test(name)) return { name, form: 'to220', pins: 3, L: 10.0, W: 4.5, H: 9.0, A1: 0, pitch: 2.54, span: 0, lw: 0.8, lt: 0.5, leadL: 13, grounds: 'JEDEC TO-220AB: its copper tab 1.27 mm thick with a 3.7 mm hole, three leads at 2.54 mm, nominal' };
  if (/^TO-263/.test(name)) return { name, form: 'to263', pins: 3, L: 10.1, W: 8.7, H: 4.4, A1: 0, pitch: 5.08, span: 15.3, lw: 0.8, lt: 0.5, grounds: 'JEDEC TO-263AB (D²PAK): two leads at 5.08 mm and the tab under it, nominal' };
  if (name === 'DO-41') return { name, form: 'axial', pins: 2, L: 5.2, W: 2.7, H: 2.7, A1: 0, pitch: 0, span: 0, lw: 0.8, lt: 0.8, leadL: 27, grounds: 'JEDEC DO-41: a moulded body 2.7 × 5.2 mm, leads 0.8 mm, nominal' };
  if (name === 'DO-35') return { name, form: 'axial', pins: 2, L: 4.0, W: 1.9, H: 1.9, A1: 0, pitch: 0, span: 0, lw: 0.5, lt: 0.5, leadL: 27, glass: true, grounds: 'JEDEC DO-35: a glass body 1.9 × 4 mm, leads 0.5 mm, nominal' };
  if (name === 'DO-201') return { name, form: 'axial', pins: 2, L: 9.5, W: 5.3, H: 5.3, A1: 0, pitch: 0, span: 0, lw: 1.3, lt: 1.3, leadL: 27, grounds: 'JEDEC DO-201AD: 5.3 × 9.5 mm, leads 1.3 mm, nominal' };
  if (name === 'SMA') return { name, form: 'sma', pins: 2, L: 4.3, W: 2.6, H: 2.1, A1: 0.1, pitch: 0, span: 5.2, lw: 1.4, lt: 0.2, grounds: 'JEDEC DO-214AC (SMA): 4.3 × 2.6 mm, J-bent leads, nominal' };
  if (name === 'SOD-123F') return { name, form: 'sma', pins: 2, L: 2.6, W: 1.6, H: 1.0, A1: 0.05, pitch: 0, span: 3.55, lw: 0.8, lt: 0.15, grounds: 'SOD-123F: a moulded body 2.6 × 1.6 × 1.0 mm, 3.55 mm over its two flat leads (Nexperia\'s outline, nominal); drawn in the SMA\'s form' };
  return null;
}

/** A gull-wing lead's profile, mm, in its own plane: from inside the body (u = -u0, near the die) out of its side (u = 0)
 *  at height y0, down to the board, its foot to u1; the lead's thickness t. */
const gullProfile = (y0: number, u1: number, t: number, u0 = 0.3): [number, number][] => {
  const s = Math.min(0.25, u1 * 0.25), d = Math.min(0.3, u1 * 0.35);
  return [[-u0, y0 + t / 2], [s + t / 2, y0 + t / 2], [s + d + t / 2, t], [u1, t], [u1, 0], [s + d - t / 2, 0], [s - t / 2, y0 - t / 2], [-u0, y0 - t / 2]];
};
/** The turn that takes a profile drawn out along +x to leave a side: +z, -z, +x, -x. */
const SIDE = { pz: [0, -Math.PI / 2, 0], nz: [0, Math.PI / 2, 0], px: [0, 0, 0], nx: [0, Math.PI, 0] } as const;
type V3 = [number, number, number];
const ALONG_X: V3 = [0, 0, Math.PI / 2];

/** Every solid of a package, mm, in its own frame: its body, its leads (each its own), any pad or tab, its die on its
 *  paddle and a bond wire from the die to each lead the die is not itself on (inside the body: seen only when it is
 *  opened or cut away). */
export function pkgSolids(p: Pkg): Solid[] {
  const out: Solid[] = [], bodyMat = p.glass ? 'glass' : 'emc', leadMat = 'copper';
  const yb = p.A1 + p.H / 2;
  let lead = 0;
  // the die and its wires: a square of silicon a little under half the body across, a gold wire from its edge in a low
  // loop to each lead's inner end; and, where it sits on a lead frame, the frame's copper paddle under it. All of it under
  // the moulding's top (ceil): a die 0.25 mm thick and a loop 0.15 mm over it where there is room, a thin package's die
  // ground thinner and its loop lower (an ultra-thin DFN's die about 0.15 mm, its loop about 0.1: typical), the wire
  // kept 0.08 mm under the top
  const die = (cx: number, cz: number, w: number, l: number, y: number, ends: V3[], paddle = 0, ceil = Infinity) => {
    const y0 = y - 0.125, t = Math.min(0.25, Math.max(0.08, (ceil - 0.1 - y0) * 0.6)), top = y0 + t, loop = Math.min(0.15, Math.max(0.02, ceil - 0.08 - 0.0125 - top));
    if (paddle) out.push({ role: 'frame', shape: { box: [l + 0.4, paddle, w + 0.4] }, at: [cx, y0 - paddle / 2, cz], mat: leadMat });
    out.push({ role: 'die', shape: { box: [l, t, w] }, at: [cx, y0 + t / 2, cz], mat: 'silicon' });
    for (const e of ends) { const fx = Math.max(-l / 2 + 0.05, Math.min(l / 2 - 0.05, e[0] - cx)) + cx, fz = Math.max(-w / 2 + 0.05, Math.min(w / 2 - 0.05, e[2] - cz)) + cz; out.push({ role: 'wire', shape: { tube: { r: 0.0125, pts: [[fx, top, fz], [(fx + e[0]) / 2, top + loop, (fz + e[2]) / 2], e] } }, at: [0, 0, 0], mat: 'gold' }); }
  };
  if (p.form === 'gull' || p.form === 'sot' || p.form === 'sot223' || p.form === 'quad') {
    out.push({ role: 'body', shape: { box: [p.L, p.H, p.W] }, at: [0, yb, 0], mat: bodyMat });
    const dw = Math.min(p.W, p.L) * 0.45, dl = Math.min(p.L * 0.6, dw * 1.4), ly = yb - p.A1 * 0.5, dieY = ly + p.lt / 2 + 0.125;
    // (each lead runs in from the body's side to just short of the paddle, where its wire lands)
    const inner = (side: number, pad: number) => Math.max(0.3, (side - pad) / 2 - 0.25);
    const ends: V3[] = [], u1 = (p.span - (p.form === 'quad' ? p.L : p.W)) / 2;
    const row = (side: keyof typeof SIDE, xs: number[], width = p.lw, wired = true) => { for (const x of xs) {
      const [px, pz] = side === 'pz' ? [x, p.W / 2] : side === 'nz' ? [x, -p.W / 2] : side === 'px' ? [p.L / 2, x] : [-p.L / 2, x];
      const alongZ = side === 'pz' || side === 'nz', u0 = alongZ ? inner(p.W, dw + 0.4) : inner(p.L, dl + 0.4), e = u0 - 0.1;
      out.push({ role: 'lead', shape: { prism: { pts: gullProfile(ly, u1, p.lt, u0), L: width } }, at: [px, 0, pz], rot: [...SIDE[side]] as V3, mat: leadMat, inBody: u0 * p.lt * width, lead: lead++ });
      if (wired) ends.push(side === 'pz' ? [px, ly + p.lt / 2, pz - e] : side === 'nz' ? [px, ly + p.lt / 2, pz + e] : side === 'px' ? [px - e, ly + p.lt / 2, pz] : [px + e, ly + p.lt / 2, pz]);
    } };
    const along = (k: number) => Array.from({ length: k }, (_, i) => (i - (k - 1) / 2) * p.pitch);
    if (p.form === 'gull') { row('nz', along(p.pins / 2)); row('pz', along(p.pins / 2)); }
    else if (p.form === 'quad') { const k = p.pins / 4; row('nz', along(k)); row('px', along(k)); row('pz', along(k)); row('nx', along(k)); }
    // (a SOT-23's die sits on its lone lead's paddle (a transistor's collector, a diode's cathode): wired to the other two)
    else if (p.form === 'sot') { if (p.pins === 3) { row('nz', [-p.pitch, p.pitch]); row('pz', [0], p.lw, false); } else { row('nz', [-p.pitch, 0, p.pitch]); row('pz', p.pins === 5 ? [-p.pitch, p.pitch] : [-p.pitch, 0, p.pitch]); } }
    // (a SOT-223's tab is its paddle and its middle lead: wired to the outer two)
    else { row('nz', [-p.pitch, p.pitch]); row('nz', [0], p.lw, false); row('pz', [0], 3.0, false); }
    if (p.pad) { const top = dieY - 0.125, t = top - p.A1 * 0.5, a = Math.min(p.pad, p.L * 0.8), b = Math.min(p.pad, p.W * 0.8); out.push({ role: 'pad', shape: { box: [a, t, b] }, at: [0, p.A1 * 0.5 + t / 2, 0], mat: leadMat, inBody: a * b * Math.max(0, top - p.A1) }); }
    die(0, 0, dw, dl, dieY, ends, p.pad ? 0 : p.lt, p.A1 + p.H);
  } else if (p.form === 'qfn') {
    // (a body flush with its pads: each pad copper at its edge, under and at its side, and the pad under its middle)
    out.push({ role: 'body', shape: { box: [p.L, p.H - 0.05, p.W] }, at: [0, 0.05 + (p.H - 0.05) / 2, 0], mat: bodyMat });
    const k = p.pins / (p.sides ?? 4), ends: V3[] = [], along = Array.from({ length: k }, (_, i) => (i - (k - 1) / 2) * p.pitch), lp = 0.4;
    for (const [sx, sz, alongX] of ([[0, -1, true], [1, 0, false], [0, 1, true], [-1, 0, false]] as [number, number, boolean][]).filter(([, , ax]) => p.sides !== 2 || ax)) for (const a of along) {
      const at: V3 = alongX ? [a, 0.1, sz * (p.W / 2 - lp / 2)] : [sx * (p.L / 2 - lp / 2), 0.1, a];
      out.push({ role: 'lead', shape: { box: alongX ? [p.lw, 0.2, lp] : [lp, 0.2, p.lw] }, at, mat: leadMat, inBody: p.lw * lp * 0.15, lead: lead++ }); ends.push([at[0] - sx * 0.1, 0.2, at[2] - sz * 0.1]);
    }
    const pl = p.sides === 2 ? Math.min(p.L - 1, p.pad! * 1.2) : p.pad!;
    out.push({ role: 'pad', shape: { box: [pl, 0.2, p.pad!] }, at: [0, 0.1, 0], mat: leadMat, inBody: pl * p.pad! * 0.15 });
    die(0, 0, p.pad! * 0.85, p.pad! * 0.85, 0.2 + 0.125, ends, 0, p.H);
  } else if (p.form === 'dip') {
    out.push({ role: 'body', shape: { box: [p.L, p.H, p.W] }, at: [0, p.A1 + p.H / 2, 0], mat: bodyMat });
    const k = p.pins / 2, ends: V3[] = [], y0 = p.A1 + p.H * 0.3, u1 = (p.span - p.W) / 2, sh = 1.5;
    for (const sz of [-1, 1]) for (let i = 0; i < k; i++) {
      const x = (i - (k - 1) / 2) * p.pitch, z = sz * (p.W / 2), l = lead++;
      // (its shoulder out of the body 1.5 mm wide, bent down to the board still wide; its pin 0.46 mm through the board)
      out.push({ role: 'lead', shape: { box: [sh, p.lt, u1 + 0.6] }, at: [x, y0, z + (sz * (u1 - 0.6)) / 2], mat: leadMat, inBody: sh * p.lt * 0.6, lead: l });
      out.push({ role: 'lead', shape: { box: [sh, y0, p.lt] }, at: [x, y0 / 2, sz * (p.span / 2)], mat: leadMat, lead: l });
      out.push({ role: 'lead', shape: { box: [p.lw, p.leadL!, p.lt] }, at: [x, -p.leadL! / 2, sz * (p.span / 2)], mat: leadMat, lead: l });
      ends.push([x, y0 + p.lt / 2, z - sz * 0.5]);
    }
    die(0, 0, p.W * 0.35, Math.min(p.L * 0.4, 4), y0 + p.lt / 2 + 0.125, ends, p.lt, p.A1 + p.H);
  } else if (p.form === 'to92') {
    // (a D: a circle of its length across, its front cut flat so it is its width deep; standing on the board, its die on
    // the middle lead's flattened top, wired to the outer two)
    const r = p.L / 2, flat = p.W - r, pts: [number, number][] = [];
    for (let k = 0; k < 48; k++) { const a = (2 * Math.PI * k) / 48; pts.push([r * Math.cos(a), Math.min(r * Math.sin(a), flat) - (flat - r) / 2]); }
    out.push({ role: 'body', shape: { prism: { pts, L: p.H } }, at: [0, p.H / 2, 0], rot: [-Math.PI / 2, 0, 0], mat: bodyMat });
    const ends: V3[] = [];
    for (const x of [-p.pitch, 0, p.pitch]) { out.push({ role: 'lead', shape: { box: [p.lw, p.leadL! + 1.2, p.lt] }, at: [x, (1.2 - p.leadL!) / 2, 0], mat: leadMat, inBody: p.lw * p.lt * 1.2, lead: lead++ }); if (x) ends.push([x, 1.2, 0]); }
    die(0, 0, 0.8, 0.8, 1.2 + p.lt + 0.125, ends, p.lt);
  } else if (p.form === 'to220') {
    // (its copper tab across the back, from just above the board to above the moulding, the hole that bolts it to a heat
    // sink 2.8 mm below its top; the moulding in front of it; its die on the tab, wired to the outer leads, the middle one the tab's own)
    const tt = 1.27, tabH = 15.6, tab0 = 0.5;
    out.push({ role: 'tab', shape: { box: [p.L, tabH - tab0, tt] }, at: [0, tab0 + (tabH - tab0) / 2, -p.W / 2 + tt / 2], mat: leadMat, hole: { r: 1.85, y: (tabH - tab0) / 2 - 2.8 } });
    out.push({ role: 'body', shape: { box: [p.L, p.H, p.W - tt] }, at: [0, p.H / 2, tt / 2], mat: bodyMat });
    const ends: V3[] = [];
    for (const x of [-p.pitch, 0, p.pitch]) { out.push({ role: 'lead', shape: { box: [p.lw, p.leadL! + 2, p.lt] }, at: [x, (2 - p.leadL!) / 2, 0], mat: leadMat, inBody: p.lw * p.lt * 2, lead: lead++ }); if (x) ends.push([x, 2, 0]); }
    die(0, -p.W / 2 + tt + 0.13, 3, 3, 4.5, ends);
  } else if (p.form === 'to263') {
    out.push({ role: 'tab', shape: { box: [p.L, 1.3, p.W] }, at: [0, 0.65, 0], mat: leadMat });
    out.push({ role: 'body', shape: { box: [p.L, p.H - 1.3, p.W * 0.9] }, at: [0, 1.3 + (p.H - 1.3) / 2, p.W * 0.05], mat: bodyMat });
    const ends: V3[] = [], u0 = 1.5, prof = gullProfile(p.H * 0.4, (p.span - p.W) / 2, p.lt, u0);
    for (const x of [-p.pitch / 2, p.pitch / 2]) { out.push({ role: 'lead', shape: { prism: { pts: prof, L: p.lw } }, at: [x, 0, p.W / 2], rot: [...SIDE.pz] as V3, mat: leadMat, inBody: u0 * p.lt * p.lw, lead: lead++ }); ends.push([x, p.H * 0.4, p.W / 2 - u0 + 0.1]); }
    die(0, 0, 4, 4, 1.3 + 0.13, ends);
  } else if (p.form === 'axial') {
    // (lying along x: its body, a band at its cathode; each lead a wire out of an end, run in to a nail head pressed on
    // the die, which lies between them: no bond wire)
    const r = p.W / 2, dieT = 0.25, head = Math.min(r * 0.75, 1.0), headT = 0.2, inner = p.L / 2 - dieT / 2 - headT;
    out.push({ role: 'body', shape: { cyl: [r, p.L] }, at: [0, r, 0], rot: ALONG_X, mat: bodyMat });
    out.push({ role: 'mark', shape: { cyl: [r + 0.01, p.L * 0.15] }, at: [p.L * 0.33, r, 0], rot: ALONG_X, mat: '', ...(p.glass ? { color: 0x151515 } : {}) });
    for (const s of [-1, 1]) {
      const l = lead++;
      out.push({ role: 'lead', shape: { cyl: [p.lw / 2, p.leadL!] }, at: [s * (p.L / 2 + p.leadL! / 2), r, 0], rot: ALONG_X, mat: leadMat, lead: l });
      out.push({ role: 'lead', shape: { cyl: [p.lw / 2, inner] }, at: [s * (p.L / 2 - inner / 2), r, 0], rot: ALONG_X, mat: leadMat, inBody: Math.PI * (p.lw / 2) ** 2 * inner, lead: l });
      out.push({ role: 'lead', shape: { cyl: [head, headT] }, at: [s * (dieT / 2 + headT / 2), r, 0], rot: ALONG_X, mat: leadMat, inBody: Math.PI * head * head * headT, lead: l });
    }
    out.push({ role: 'die', shape: { box: [dieT, head * 1.4, head * 1.4] }, at: [0, r, 0], mat: 'silicon' });
  } else if (p.form === 'sma') {
    // (each lead a strip under the die or over it, out of an end of the body, down its face and folded under it)
    const dieY = p.H * 0.5, half = (p.span - p.L) / 2;
    out.push({ role: 'body', shape: { box: [p.L, p.H - p.A1, p.W] }, at: [0, p.A1 + (p.H - p.A1) / 2, 0], mat: bodyMat });
    for (const s of [-1, 1]) {
      const l = lead++, yIn = dieY + s * (0.125 + p.lt / 2), inL = p.L / 2 - 0.3;
      out.push({ role: 'lead', shape: { box: [inL, p.lt, p.lw] }, at: [s * (0.3 + inL / 2), yIn, 0], mat: leadMat, inBody: inL * p.lt * p.lw, lead: l });
      out.push({ role: 'lead', shape: { box: [p.lt, yIn + p.lt / 2, p.lw] }, at: [s * (p.L / 2 + p.lt / 2), (yIn + p.lt / 2) / 2, 0], mat: leadMat, lead: l });
      out.push({ role: 'lead', shape: { box: [half + 0.8, p.lt, p.lw] }, at: [s * (p.L / 2 + half / 2 - 0.4 + p.lt), p.lt / 2, 0], mat: leadMat, lead: l });
    }
    out.push({ role: 'mark', shape: { box: [p.L * 0.12, 0.01, p.W * 0.9] }, at: [p.L * 0.38, p.H + 0.005, 0], mat: '' });
    out.push({ role: 'die', shape: { box: [1.2, 0.25, 1.2] }, at: [0, dieY, 0], mat: 'silicon' });
  }
  return out;
}

// ---- chip passives: EIA case sizes ------------------------------------------------------------------------------------
/** A thick-film chip resistor (L × W × T, mm): its alumina substrate, the ruthenium-oxide film printed on its top, the
 *  glass and epoxy overcoat over that, and a termination wrapped round each end (silver, under nickel, under tin: drawn
 *  as one plated skin 10 µm thick). Or a ceramic chip capacitor: its fired body of barium-titanate layers and nickel
 *  electrodes, and a termination over each end (copper, nickel, tin: a skin 20 µm thick). The terminations' band on its
 *  top and bottom a fifth of its length (typical: Yageo's and Murata's drawings give 0.2–0.5 mm on an 0603). */
export function chipSolids(kind: 'resistor' | 'capacitor', L: number, W: number, T: number): Solid[] {
  const a = Math.max(0.1, Math.min(0.6, 0.2 * L));
  if (kind === 'capacitor') {
    const t = 0.02;
    return [{ role: 'body', shape: { box: [L, T, W] }, at: [0, T / 2, 0], mat: 'batio3' },
      ...[-1, 1].map((s): Solid => ({ role: 'term', shape: { box: [a, T + 2 * t, W + 2 * t] }, at: [s * (L / 2 - a / 2 + t), T / 2, 0], mat: 'nickel', shell: t }))];
  }
  // (the substrate its height less 0.08 mm for the film, the overcoat and the electrodes' standoff (typical))
  const ts = T - 0.08, t = 0.01;
  return [
    { role: 'body', shape: { box: [L, ts, W] }, at: [0, ts / 2, 0], mat: 'alumina' },
    { role: 'film', shape: { box: [L - 2 * a + 0.1, 0.012, W - 0.15] }, at: [0, ts + 0.006, 0], mat: 'ruthenium-oxide' },
    { role: 'glaze', shape: { box: [L - 2 * a, 0.035, W - 0.08] }, at: [0, ts + 0.012 + 0.0175, 0], mat: 'glass' },
    ...[-1, 1].map((s): Solid => ({ role: 'term', shape: { box: [a, ts + 2 * t, W + 2 * t] }, at: [s * (L / 2 - a / 2 + t), ts / 2, 0], mat: 'nickel', shell: t })),
  ];
}

// ---- leaded resistors: IEC 60062 colour bands ------------------------------------------------------------------------
/** IEC 60062's colours by digit (0 black … 9 white), then gold (×0.1, ±5 %) and silver (×0.01, ±10 %). */
export const BAND: Record<string, [string, number]> = { '0': ['black', 0x1a1a1a], '1': ['brown', 0x7a4a1e], '2': ['red', 0xc8261e], '3': ['orange', 0xf07818], '4': ['yellow', 0xf2d21a], '5': ['green', 0x2f9a3a], '6': ['blue', 0x2650c8], '7': ['violet', 0x8a3ab8], '8': ['grey', 0x8a8a8a], '9': ['white', 0xf2f2f2], '-1': ['gold', 0xc9a227], '-2': ['silver', 0xc0c0c0] };
/** A 1 % resistor's five bands for its value (IEC 60062): three digits, the multiplier's power of ten, and brown for ±1 %. */
export function bandsOf(R: number): string[] {
  let e = Math.floor(Math.log10(R) + 1e-9) - 2, d = Math.round(R / 10 ** e); if (d >= 1000) { e++; d = Math.round(R / 10 ** e); }
  return [...String(d).padStart(3, '0'), String(Math.max(-2, e)), '1'];
}
/** A metal-film resistor lying along x, mm, its body L long and D across: its alumina rod; a steel cap pressed on each
 *  end, its lead welded to it; its lacquer coat over all of it, thicker over the caps (the "dog bone"); its five bands
 *  painted on the coat; its leads, tinned copper, out of each end. */
export function axialResistorSolids(L: number, D: number, R: number, leadD = 0.6, leadL = 28): Solid[] {
  const Ro = D / 2, ro = Ro - 0.15, rc = 0.34 * D, lc = 0.22 * L, rl = leadD / 2, w = 0.06, end = L / 2 - w;
  const coatR = (y: number) => (Math.abs(y) > end - lc - 0.1 ? Ro : 0.86 * Ro);
  // (a cap: a cup, its end 0.15 mm thick, its wall to lc along the rod)
  const cup = (s: number): [number, number][] => { const o = s * end, i = s * (end - lc), b = s * (end - 0.15); return [[rl, o], [ro, o], [ro, i], [rc, i], [rc, b], [rl, b], [rl, o]]; };
  // (the coat: its outside dog-boned, its inside on the caps and the rod)
  const coat: [number, number][] = [[rl, -L / 2], [0.8 * Ro, -L / 2], [Ro, -L / 2 + 0.12 * L], [Ro, -end + lc + 0.1], [0.86 * Ro, -end + lc + 0.35], [0.86 * Ro, end - lc - 0.35], [Ro, end - lc - 0.1], [Ro, L / 2 - 0.12 * L], [0.8 * Ro, L / 2], [rl, L / 2],
    [rl, end], [ro, end], [ro, end - lc], [rc, end - lc], [rc, -end + lc], [ro, -end + lc], [ro, -end], [rl, -end], [rl, -L / 2]];
  const bands = bandsOf(R), ys = [-L / 2 + 0.14 * L, -L / 2 + 0.26 * L, -L / 2 + 0.38 * L, -L / 2 + 0.5 * L, L / 2 - 0.16 * L], bw = 0.07 * L;
  return [
    { role: 'core', shape: { cyl: [rc, 2 * (end - 0.15)] }, at: [0, Ro, 0], rot: ALONG_X, mat: 'alumina' },
    ...[-1, 1].map((s): Solid => ({ role: 'cap', shape: { lathe: cup(s) }, at: [0, Ro, 0], rot: ALONG_X, mat: 'steel-low' })),
    { role: 'body', shape: { lathe: coat }, at: [0, Ro, 0], rot: ALONG_X, mat: 'epoxy' },
    ...bands.map((b, k): Solid => { const r = coatR(ys[k]!); return { role: 'band', shape: { lathe: [[r - 0.02, ys[k]! - bw / 2], [r + 0.012, ys[k]! - bw / 2], [r + 0.012, ys[k]! + bw / 2], [r - 0.02, ys[k]! + bw / 2], [r - 0.02, ys[k]! - bw / 2]] }, at: [0, Ro, 0], rot: ALONG_X, mat: '', color: BAND[b]![1] }; }),
    ...[-1, 1].map((s, i): Solid => ({ role: 'lead', shape: { cyl: [rl, leadL + 0.15] }, at: [s * (end - 0.15 + (leadL + 0.15) / 2), Ro, 0], rot: ALONG_X, mat: 'copper', lead: i })),
  ];
}
/** A leaded resistor's body by its power, mm (typical of metal-film 0204, 0207 and larger bodies): length, diameter, lead. */
export const axialBody = (W: number): [number, number, number] => (W <= 0.125 ? [3.6, 1.6, 0.5] : W <= 0.25 ? [6.3, 2.5, 0.6] : W <= 0.5 ? [9, 3.5, 0.6] : [12, 5, 0.8]);

// ---- LEDs -------------------------------------------------------------------------------------------------------------
/** A through-hole LED of s mm (T-1 3 mm, T-1¾ 5 mm, 10 mm; typical of makers' drawings): its clear epoxy lens, a domed
 *  cylinder on a flange, the flange cut flat on the cathode's side (the mark a hand finds it by; cut to the lens's own
 *  radius, an estimate); its two leads 2.54 mm apart, the cathode's (shorter) ending in the anvil whose reflector cup
 *  holds the die, the anode's in the post; a bond wire from the die's top to the post. */
export function ledSolids(s: number, die: 'gan' | 'algainp'): Solid[] {
  const D = s, F = s + (s <= 3 ? 0.8 : 0.8 + 0.1 * (s - 3)), H = s <= 3 ? 5.3 : s <= 5 ? 8.6 : 13.8, fl = 1.0, R = D / 2, y = 0.42 * H, lw = 0.5;
  const lens: [number, number][] = [[0, fl], [R, fl], [R, H - R]];
  for (let k = 1; k <= 12; k++) { const a = (Math.PI / 2) * (k / 12); lens.push([R * Math.cos(a), H - R + R * Math.sin(a)]); }
  const rim: [number, number][] = Array.from({ length: 48 }, (_, k): [number, number] => { const a = (2 * Math.PI * k) / 48; return [Math.max((F / 2) * Math.cos(a), -R), (F / 2) * Math.sin(a)]; });
  const aw = Math.min(1.8, 0.32 * s), ah = 0.9, px = 1.27;
  return [
    { role: 'body', shape: { lathe: [...lens, [0, fl]] }, at: [0, 0, 0], mat: 'epoxy-clear' },
    { role: 'body', shape: { prism: { pts: rim, L: fl } }, at: [0, fl / 2, 0], rot: [-Math.PI / 2, 0, 0], mat: 'epoxy-clear' },
    { role: 'lead', shape: { box: [lw, 25 + y, lw] }, at: [-px, (y - 25) / 2, 0], mat: 'copper', inBody: lw * lw * y, lead: 0 },
    { role: 'lead', shape: { box: [aw, ah, lw] }, at: [-px + aw / 2 - lw / 2, y + ah / 2, 0], mat: 'copper', inBody: aw * ah * lw, lead: 0 },
    { role: 'lead', shape: { box: [lw, 27 + y, lw] }, at: [px, (y - 27) / 2, 0], mat: 'copper', inBody: lw * lw * y, lead: 1 },
    { role: 'lead', shape: { box: [0.8, 0.6, lw] }, at: [px - 0.15, y + 0.3, 0], mat: 'copper', inBody: 0.8 * 0.6 * lw, lead: 1 },
    { role: 'die', shape: { box: [0.25, 0.12, 0.25] }, at: [-px + aw / 2 - lw / 2, y + ah + 0.06, 0], mat: die },
    { role: 'wire', shape: { tube: { r: 0.0125, pts: [[-px + aw / 2 - lw / 2, y + ah + 0.12, 0], [0, y + ah + 0.9, 0], [px - 0.15, y + 0.6, 0]] } }, at: [0, 0, 0], mat: 'gold' },
  ];
}
/** A surface LED's dies: three in a 5050 (one for each colour of an RGB, or three of one), else one. */
export const smdLedDies = (L: number, W: number): number => (L >= 5 && W >= 5 ? 3 : 1);
/** A surface LED, L × W × H mm: a chip LED (0603–1206: a laminate base, its die under a clear block) or a PLCC (2835,
 *  3528, 5050, 5730: a white moulded cup on a lead frame, its die and wire under silicone, phosphor-filled where it is
 *  white); its pads at its ends. */
export function smdLedSolids(L: number, W: number, H: number, die: 'gan' | 'algainp', white: boolean): Solid[] {
  const chip = L <= 3.2 && H <= 1.2, pads = smdLedDies(L, W), pl = Math.min(0.6, L * 0.2), out: Solid[] = [];
  if (chip) {
    const bt = Math.min(0.2, H * 0.3);
    out.push({ role: 'core', shape: { box: [L, bt, W] }, at: [0, bt / 2, 0], mat: 'fr4' });
    out.push({ role: 'body', shape: { box: [L - 0.1, H - bt, W - 0.05] }, at: [0, bt + (H - bt) / 2, 0], mat: 'epoxy-clear' });
    // (each end's pad under it, up its end in a plated half-hole, and on its top under the block, where the die sits on
    // the one and its wire lands on the other; gold over nickel, typical of laminate chip LEDs)
    const au = { color: 0xd9b24c, finish: 'plate' };
    for (const s of [-1, 1]) out.push({ role: 'lead', shape: { box: [pl, 0.035, W] }, at: [s * (L / 2 - pl / 2), 0.0175, 0], mat: 'copper', lead: s < 0 ? 0 : 1, ...au },
      { role: 'lead', shape: { box: [0.05, bt, W * 0.6] }, at: [s * (L / 2 - 0.025), bt / 2, 0], mat: 'copper', lead: s < 0 ? 0 : 1, ...au },
      { role: 'lead', shape: { box: [s < 0 ? L * 0.45 : pl, 0.02, W * 0.8] }, at: [s * (L / 2 - (s < 0 ? L * 0.45 : pl) / 2), bt + 0.01, 0], mat: 'copper', lead: s < 0 ? 0 : 1, ...au });
    out.push({ role: 'die', shape: { box: [0.25, 0.1, 0.25] }, at: [-0.15, bt + 0.07, 0], mat: die });
    out.push({ role: 'wire', shape: { tube: { r: 0.0125, pts: [[-0.15, bt + 0.12, 0], [0.1, bt + Math.min(0.3, (H - bt) * 0.6), 0], [L / 2 - pl / 2, bt + 0.02, 0]] } }, at: [0, 0, 0], mat: 'gold' });
    return out;
  }
  // (the cup's wall a sixth of its width, its floor the lead frame, 0.2 mm, flush with the cup's base)
  const wall = Math.min(W, L) / 6, ft = 0.2, cavity: [number, number] = [L - 2 * wall, W - 2 * wall];
  out.push({ role: 'core', shape: { box: [L, H - ft, wall] }, at: [0, ft + (H - ft) / 2, W / 2 - wall / 2], mat: 'ppa' });
  out.push({ role: 'core', shape: { box: [L, H - ft, wall] }, at: [0, ft + (H - ft) / 2, -W / 2 + wall / 2], mat: 'ppa' });
  out.push({ role: 'core', shape: { box: [wall, H - ft, cavity[1]] }, at: [L / 2 - wall / 2, ft + (H - ft) / 2, 0], mat: 'ppa' });
  out.push({ role: 'core', shape: { box: [wall, H - ft, cavity[1]] }, at: [-L / 2 + wall / 2, ft + (H - ft) / 2, 0], mat: 'ppa' });
  out.push({ role: 'body', shape: { box: [cavity[0], H - ft - 0.05, cavity[1]] }, at: [0, ft + (H - ft - 0.05) / 2, 0], mat: 'silicone', color: white ? 0xf2e27a : 0xe8eef2 });
  // (its lead frame: a pair of pads across its ends for each die, the floor of its cup)
  const pw = (W - 0.3 * (pads - 1)) / pads;
  for (let k = 0; k < pads; k++) for (const s of [-1, 1]) out.push({ role: 'lead', shape: { box: [L / 2 - 0.15, ft, pw] }, at: [s * (L / 4 + 0.075), ft / 2, (k - (pads - 1) / 2) * (pw + 0.3)], mat: 'copper', lead: k * 2 + (s < 0 ? 0 : 1) });
  for (let k = 0; k < pads; k++) { const z = (k - (pads - 1) / 2) * (pw + 0.3); out.push({ role: 'die', shape: { box: [0.5, 0.15, 0.5] }, at: [-0.4, ft + 0.075, z], mat: die }); out.push({ role: 'wire', shape: { tube: { r: 0.0125, pts: [[-0.4, ft + 0.15, z], [0.2, ft + 0.5, z], [L / 4, ft, z]] } }, at: [0, 0, 0], mat: 'gold' }); }
  return out;
}

// ---- weighing ---------------------------------------------------------------------------------------------------------
/** What packages are made of, kg/m³. */
export const PKG_DENSITY: Record<string, [number, string]> = {
  emc: [1900, 'epoxy moulding compound, silica-filled (typical 1.8–2.0 g/cm³)'], silicon: [2329, 'crystalline silicon (2.329 g/cm³)'], gold: [19300, 'gold (19.3 g/cm³)'],
  alumina: [3800, '96 % alumina, as chip resistors\' substrates and resistor rods (typical 3.7–3.9 g/cm³)'], nickel: [8900, 'nickel (8.9 g/cm³): a termination\'s nickel and tin over silver or copper, taken as nickel'],
  batio3: [5850, 'barium titanate fired with its nickel electrodes, as a ceramic capacitor\'s body (typical; BaTiO₃ 6.02 g/cm³ at full density)'], 'ruthenium-oxide': [6970, 'ruthenium dioxide (6.97 g/cm³), a thick film\'s conductor'],
  epoxy: [1200, 'unfilled epoxy (typical 1.1–1.25 g/cm³): a lacquer coat'], 'epoxy-clear': [1150, 'clear casting epoxy, as an LED\'s lens (typical 1.1–1.2 g/cm³)'], silicone: [1100, 'optical silicone, as an LED\'s encapsulant (typical 1.0–1.2 g/cm³)'],
  ppa: [1600, 'polyphthalamide, glass- and titania-filled, as an LED\'s white cup (typical 1.5–1.7 g/cm³)'], gan: [6150, 'gallium nitride (6.15 g/cm³)'], algainp: [4500, 'AlGaInP on GaAs (typical 4.5 g/cm³; GaAs 5.32)'],
  bt: [1900, 'BT-epoxy laminate with glass cloth, as a BGA\'s substrate (typical 1.8–2.0 g/cm³)'], solder: [7400, 'SAC305 lead-free solder (7.4 g/cm³)'],
  pbt: [1500, 'glass-filled PBT, as connectors\' insulators (typical 1.45–1.6 g/cm³)'], 'ferrite-soft': [4800, 'MnZn ferrite, as an RJ45\'s magnetics (typical 4.8 g/cm³)'],
};
/** Densities a solid is weighed by, kg/m³: the kits' own for the common metals and plastics (src/nexus/mass.ts DENSITY,
 *  typical), and those above. */
const RHO: Record<string, number> = { copper: 8960, glass: 2500, fr4: 1850, 'steel-low': 7850, 'steel-alloy': 7850, 'stainless-304': 8000, brass: 8500, nylon: 1140, pp: 905, ptfe: 2200, pet: 1380, 'phosphor-bronze': 8800, 'al-6061': 2700, ...Object.fromEntries(Object.entries(PKG_DENSITY).map(([k, [v]]) => [k, v])) };
const area = (pts: [number, number][]) => Math.abs(pts.reduce((a, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]!; return a + x * y2 - x2 * y; }, 0)) / 2;
/** A solid's volume, mm³ (a skin's: its outside's area times its wall). */
export function solidVolume(s: Solid): number {
  const sh = s.shape;
  // (a skin is a cap over an end: open on its inner face, the end of what it covers, across x)
  if ('box' in sh) { const [a, b, c] = sh.box; return (s.shell ? (2 * (a * b + a * c) + b * c) * s.shell : a * b * c - (s.hole ? Math.PI * s.hole.r ** 2 * c : 0) - (s.bores ?? []).reduce((v, h) => v + Math.PI * h.r * h.r * b, 0)) * (s.share ?? 1); }
  const k = s.share ?? 1;
  if ('cyl' in sh) return Math.PI * sh.cyl[0] ** 2 * sh.cyl[1] * k;
  if ('prism' in sh) return (area(sh.prism.pts) - (sh.prism.holes ?? []).reduce((a, h) => a + area(h), 0)) * sh.prism.L * k;
  // (turned with so many flat sides: its section the polygon's, not the circle's, as mass.ts takes it)
  if ('lathe' in sh) { const q = sh.lathe, flats = s.facets ? (s.facets * Math.sin((2 * Math.PI) / s.facets)) / (2 * Math.PI) : 1; let v = 0; for (let i = 0; i < q.length - 1; i++) { const [r1, y1] = q[i]!, [r2, y2] = q[i + 1]!; v += (Math.PI * (y2 - y1) * (r1 * r1 + r1 * r2 + r2 * r2)) / 3; } return Math.abs(v) * flats * k; }
  let L = 0; for (let i = 1; i < sh.tube.pts.length; i++) L += Math.hypot(...(sh.tube.pts[i]!.map((v, k) => v - sh.tube.pts[i - 1]![k]!) as V3));
  return Math.PI * sh.tube.r ** 2 * L * k;
}
/** How much of a solid lies inside its body, mm³: a die, its paddle and its wires wholly; a lead its run inside. */
const inside = (s: Solid) => s.inBody ?? (s.role === 'die' || s.role === 'wire' || s.role === 'frame' ? solidVolume(s) : 0);
/** Each solid's own mass, g, the body's less what lies inside it; and the share of the body's shape that is its own. */
export function solidMasses(ss: Solid[]): { s: Solid; g: number; fill: number }[] {
  const within = ss.reduce((v, s) => v + inside(s), 0);
  return ss.map((s) => { const v = solidVolume(s), own = s.role === 'body' ? Math.max(0, v - within) : v; return { s, g: (own / 1000) * ((RHO[s.mat] ?? 0) / 1000), fill: v ? own / v : 1 }; });
}
export const solidsMass = (ss: Solid[]): number => solidMasses(ss).reduce((g, m) => g + m.g, 0);
/** What a package weighs, g, from the same solids it is drawn of. */
export const pkgMass = (p: Pkg): number => solidsMass(pkgSolids(p));
/** Its box, mm: length, width across its leads, height (through-hole leads' length below the board in it). */
export const pkgBox = (p: Pkg): V3 => [p.form === 'quad' ? p.span : p.form === 'axial' ? p.L + 2 * (p.leadL ?? 0) : p.L, p.form === 'gull' || p.form === 'quad' || p.form === 'sot' || p.form === 'sot223' || p.form === 'dip' ? p.span : p.W, p.form === 'to220' ? 15.6 + (p.leadL ?? 0) : p.H + (p.form === 'dip' || p.form === 'to92' ? p.leadL ?? 0 : 0)];
/** The inventory's part each solid of a package is (src/nexus/inventory.ts): its body the moulding (or a diode's
 *  moulded or glass body), its leads, paddle and tab the lead frame (an axial diode's each a lead wire), its die and its
 *  wires; and what the package is made of, in the inventory's words, counted from its solids. */
export function pkgItem(p: Pkg, role: Role): string | undefined {
  if (role === 'body') return p.glass ? 'glass-body' : p.form === 'axial' || p.form === 'sma' ? 'epoxy-body' : 'mould-compound';
  if (role === 'lead' || role === 'frame' || role === 'tab' || role === 'pad') return p.form === 'axial' ? 'lead-wire' : 'lead-frame';
  return role === 'die' ? 'si-die' : role === 'wire' ? 'bond-wire' : undefined;
}
export function pkgMakeup(p: Pkg): string {
  const ss = pkgSolids(p), wires = ss.filter((s) => s.role === 'wire').length;
  return `si-die ${p.form === 'axial' ? 'lead-wire*2' : 'lead-frame'}${wires ? ` bond-wire*${wires}` : ''} ${pkgItem(p, 'body')}`;
}

// ---- markings ---------------------------------------------------------------------------------------------------------
const E96_3 = Array.from({ length: 96 }, (_, k) => Math.round(100 * +(10 ** (k / 96)).toPrecision(3)));
/** What a chip resistor is marked with (IEC 60062's codes, as makers print them): nothing on an 0402 or smaller; on an
 *  0603 at 1 % the EIA-96 code (two digits for its value's place in E96, a letter for its multiplier: 10 kΩ "01C");
 *  else at 1 % four digits (three and the zeros: "1002"), at 5 % three ("103"); an R for the point below 10 Ω ("4R7"). */
export function chipCode(R: number, tol: string, pkg: string): string {
  if (['01005', '0201', '0402'].includes(pkg)) return '';
  const sig = tol === '1%' ? 3 : 2, e = Math.floor(Math.log10(R) + 1e-9) - (sig - 1), d = Math.round(R / 10 ** e);
  if (tol === '1%' && pkg === '0603') { const k = E96_3.indexOf(Math.round(R / 10 ** (e - (String(d).length - 3)))), m = e - (String(d).length - 3); const L = ({ '-3': 'Z', '-2': 'Y', '-1': 'X', 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F' } as Record<string, string>)[String(m)]; if (k >= 0 && L) return `${String(k + 1).padStart(2, '0')}${L}`; }
  if (e < 0) { const t = String(Math.round(R * 10 ** (sig - 1 - Math.floor(Math.log10(R) + 1e-9)))).padStart(sig, '0'), at = Math.floor(Math.log10(R) + 1e-9) + 1; return at <= 0 ? `R${t}`.slice(0, sig + 1) : `${t.slice(0, at)}R${t.slice(at)}`; }
  return `${d}${e}`;
}

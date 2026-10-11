// The works' safety kit and extraction, drawn: a 2 kg ABC powder extinguisher, a face shield on its ratchet headgear,
// a pair of leather welding gauntlets, ear defenders, a small workplace first-aid kit, and a 100 mm in-duct fan with
// its ducting and capture hood. The station it is (`safety` in src/nexus/works/stations.ts) buys no capability and is
// the one line a cheap works will not cut, and it has stood in the works room as a grey box with a card saying so
// since the room was laid out.
//
// It is here, and not under machines/, for the reason the calliper is: these are parts of the library, not machines,
// and a file up there would have to be imported by src/nexus/parts/components.ts, which already reaches up into
// machines/ fifteen times and is the knot the lint calls debt (`parts -> machines` in tests/nexus/tidy.test.ts).
// Nothing in this file imports outside parts/.
//
// Every figure is its maker's or its standard's where one is published, and labelled an estimate where it is not. The
// published ones, each in the inventory entry it belongs to (src/nexus/parts/inventory.ts):
//   · the extinguisher: RS Components' PSP-series data sheet (PSP2000) — 2.0 kg of monoammonium-phosphate powder,
//     3.00 kg without its bracket and 3.20 kg with it, 440 mm high and 145 mm wide over the bracket, 13A/55B, 15 s of
//     discharge, 12 bar at 20 °C, a 55 bar minimum burst, and the material of every single part (a 99.5 % aluminium
//     container, a hot-pressed brass valve, a pressed-steel handle, a 23 mm brass gauge, a nylon-coated 5 mm wire
//     bracket). It is the one item of the six whose contents need no guess.
//   · the face shield: 3M's WP-series technical datasheet — a WP96 is 229 mm high, 263 mm across, 1.8 mm of moulded
//     polycarbonate, 149 g, EN 166 marked 2C-12 1 B 3 9.
//   · the ear defenders: 3M PELTOR Optime II H520A, SNR 31 dB (3M's page), 210 g (RS's listing of H520A-407).
//   · the gauntlets: EN 12477 — 350 mm overall at size 10, ±5 mm, seams in para-aramid thread.
//   · the first-aid kit: BS 8599-1's small workplace contents, in the 270 × 170 × 90 mm hinged case a seller lists.
//   · the fan: Manrose's own page for the MF100T — 178 × 220 × 298 mm, Ø100 spigots, 68 l/s (245 m³/h), 200 W,
//     24 dB(A) at 3 m, IPX4.
// What the drawing weighs against what its makers say is item by item in `safetyKitParts` at the bottom.
//
// Frames. Each item is drawn about its own base, standing on y = 0, so a build that wants only an extinguisher gets
// one; `safetyKitParts` then lays the six out as they stand at the station (1.48 × 0.67 m of floor and 1.8 m of
// height, from src/nexus/works/floor.ts) — x across the station's width, z into its depth, the origin the middle of
// the footprint at floor level, two rows deep as a shop's own safety point is.
//
// Owner of: how the safety kit and its extraction are drawn.

import type { Part, V3 } from './kits';

const mm = 1e-3, PI = Math.PI;
/** A cylinder is drawn standing on y; these lay one along x and along z. */
const ALONG_X: V3 = [0, 0, PI / 2], ALONG_Z: V3 = [PI / 2, 0, 0];
/** A prism's section is drawn in its own x–y and run along its own z. Left alone, that is a band arching up the
 *  world's y with its width front to back; turned by UP, the band lies flat (arching toward -z) and its width stands
 *  up the world's y, which is what a headgear band and a face shield's wrap are. */
const UP: V3 = [-PI / 2, 0, 0];

const at3 = (x: number, y: number, z: number): V3 => [x * mm, y * mm, z * mm];
const bx = (w: number, h: number, d: number): Part['shape'] => ({ box: [w * mm, h * mm, d * mm] });
/** A cylinder d across the bottom and h long, tapering to d2 at the top. */
const cy = (d: number, h: number, d2?: number): Part['shape'] => ({ cyl: d2 === undefined ? [(d / 2) * mm, h * mm] : [(d / 2) * mm, h * mm, (d2 / 2) * mm] });
/** A ring of section d, D across; its own plane is x–y. */
const tor = (D: number, d: number): Part['shape'] => ({ torus: [(D / 2) * mm, (d / 2) * mm] });
/** A round tube d across with a wall t (solid at 0), along a path of points in mm. */
const tub = (d: number, t: number, pts: [number, number, number][], bend = d): Part['shape'] =>
  ({ tube: { r: (d / 2) * mm, ...(t ? { wall: t * mm } : {}), pts: pts.map(([x, y, z]) => at3(x, y, z)), bend: bend * mm, sides: 12 } });
/** The path of a wire loop D across, round the y axis at height y. */
const loop = (D: number, y: number, n = 13): [number, number, number][] =>
  Array.from({ length: n }, (_, k) => [(D / 2) * Math.cos((2 * PI * k) / (n - 1)), y, (D / 2) * Math.sin((2 * PI * k) / (n - 1))] as [number, number, number]);
/** The section of a band `arc` radians wide at radius R, t thick, in its own x–y, bulging toward +y. */
function arcBand(R: number, arc: number, t: number, n = 14): [number, number][] {
  const out: [number, number][] = [], a0 = -arc / 2;
  for (let k = 0; k <= n; k++) { const a = a0 + (arc * k) / n; out.push([R * Math.sin(a), R * Math.cos(a)]); }
  for (let k = n; k >= 0; k--) { const a = a0 + (arc * k) / n, r = R - t; out.push([r * Math.sin(a), r * Math.cos(a)]); }
  return out;
}
const pz = (pts: [number, number][], L: number): Part['shape'] => ({ prism: { pts: pts.map(([x, y]) => [x * mm, y * mm] as [number, number]), L: L * mm } });

type More = Partial<Part>;
const P = (name: string, item: string, shape: Part['shape'], at: V3, more: More = {}): Part => ({ name, item, shape, at, ...more });
const grp = (name: string, item: string, parts: Part[], more: More = {}): Part => ({ name, item, at: [0, 0, 0], parts, ...more });
/** One whole item of the kit, put at (x, z) on the station's floor, under its own inventory entry. */
const stood = (name: string, item: string, x: number, z: number, says: string, parts: Part[]): Part =>
  ({ name, item, at: at3(x, 0, z), says, parts });

// A look for each material the kit is made of. The colours matter more here than usual: the whole point of this
// station is being found by someone who is not looking for it.
const RED = { mat: 'al-6063', color: 0xb3171b, finish: 'paint' as const };
const NICKEL = { mat: 'brass', color: 0xcfd3d6, finish: 'nickel' as const };
const PAINTED = { mat: 'steel-low', color: 0x3a3c3f, finish: 'paint' as const };
const BRIGHT = { mat: 'steel-low', color: 0xb9bdc1, finish: 'bright' as const };
const SPRING = { mat: 'steel-spring', color: 0x9ea3a8, finish: 'bright' as const };
const HIDE = { mat: 'leather', color: 0xb08a52, finish: 'grain' as const };
const DARK_ABS = { mat: 'abs', color: 0x1f2124, finish: 'moulded' as const };
const PALE_ABS = { mat: 'abs', color: 0xd3d6d9, finish: 'moulded' as const };
const GREEN = { mat: 'pp', color: 0x1d6b3a, finish: 'moulded' as const };
const FOAM = { mat: 'pu', color: 0x24262a, finish: 'foam' as const };
const CLEAR = { mat: 'pc', color: 0xdfe8ee, finish: 'clear' as const, shade: 0.9 };
const FOIL = { mat: 'al-6063', color: 0xaeb3b8, finish: 'foil' as const };

// ---- the extinguisher ------------------------------------------------------------------------------------------
/** The PSP2000's 23 mm gauge, its axis along z and its face at the front: the six parts a dial gauge is made of, each
 *  one the library already stores (src/nexus/parts/inventory.ts, "gauges"). It is not of the `pressuregauge` family
 *  because EN 837-1's smallest dial is 40 mm and this one is 23. */
function gaugeParts(nm: string, y: number, z: number): Part {
  const at = (dz: number): V3 => at3(0, y, z + dz);
  return grp(`${nm} pressure gauge`, 'ext-gauge', [
    P(`${nm} gauge case`, 'gauge-case', cy(23, 10), at(-5), { ...NICKEL, rot: ALONG_Z, shell: 1 * mm }),
    P(`${nm} gauge window`, 'gauge-window', cy(19, 1.5), at(-0.5), { ...CLEAR, rot: ALONG_Z }),
    P(`${nm} gauge dial`, 'gauge-dial', cy(18, 0.3), at(-2.5), { mat: 'steel-low', color: 0xe8eceb, finish: 'print', rot: ALONG_Z }),
    P(`${nm} gauge socket`, 'gauge-socket', cy(8, 12), at(11), { ...NICKEL, rot: ALONG_Z }),
    P(`${nm} Bourdon tube`, 'bourdon-tube', tor(12, 2.4), at(-6), { mat: 'phosphor-bronze', color: 0xc08a4a, finish: 'bright' }),
    P(`${nm} gauge movement`, 'gauge-movement', bx(8, 6, 3), at3(3, y, z - 7), { ...NICKEL, finish: 'machined' }),
  ]);
}

/** A 2 kg ABC powder extinguisher on its wall bracket, standing on the floor, its axis y.
 *
 *  Its one chosen number is the cylinder's wall: 1.7 mm, which is what makes the drawn solids weigh the 3.00 kg its
 *  maker gives for it without its bracket. At that wall the hoop stress at its own 12 bar working pressure is
 *  pD/2t = 39 MPa, inside pure aluminium's strength — but its own 55 bar minimum burst would be 178 MPa at the same
 *  wall, which pure aluminium does not reach, so the real cylinder is thicker or harder at its base than this is.
 *  Said rather than fudged: the weight and the burst pressure are both the maker's and they do not agree on one wall. */
export function extinguisherParts(nm: string): Part[] {
  const wall = 1.7, bore = 110 - 2 * wall, body = 370, y0 = 8, top = y0 + body;
  // the charge: 2.0 kg of monoammonium phosphate at about 900 kg/m³ packed, which is half its 1,803 as crystal — so a
  // column 249 mm up a 106.6 mm bore, and the nitrogen that drives it out is the rest of the cylinder
  const pow = 249;
  return [
    P(`${nm} cylinder`, 'ext-cylinder', cy(110, body), at3(0, y0 + body / 2, 0), { ...RED, shell: wall * mm }),
    P(`${nm} powder charge`, 'abc-powder', cy(bore, pow), at3(0, y0 + 4 + pow / 2, 0), { mat: 'abc-powder', color: 0xe7e3d6, finish: 'powder', fill: 900 / 1803 }),
    P(`${nm} dip tube`, 'ext-diptube', cy(8, 300), at3(0, y0 + 200, 0), { mat: 'pe', color: 0xe9eaec, finish: 'moulded', shell: 1 * mm }),
    P(`${nm} label`, 'ext-label', cy(110.4, 200), at3(0, 220, 0), { mat: 'pet', color: 0xc8202a, finish: 'print', shell: 0.1 * mm }),
    P(`${nm} valve head`, 'ext-valve', cy(36, 42), at3(0, top + 21, 0), { ...NICKEL, fill: 0.5 }),
    P(`${nm} nozzle`, 'ext-nozzle', cy(22, 60, 12), at3(0, top + 30, -45), { mat: 'pp', color: 0x16181a, finish: 'moulded', rot: ALONG_Z, shell: 2 * mm }),
    gaugeParts(nm, top + 30, 24),
    P(`${nm} carrying handle`, 'ext-grip', bx(85, 2.6, 26), at3(14, top + 46, 0), { ...PAINTED }),
    P(`${nm} lever`, 'ext-lever', bx(85, 2.6, 26), at3(14, top + 58, 0), { ...PAINTED }),
    P(`${nm} safety pin`, 'ext-pin', cy(3, 45), at3(26, top + 52, 0), { ...BRIGHT, rot: ALONG_Z }),
    P(`${nm} safety pin ring`, 'ext-pin', tor(22, 3), at3(26, top + 52, 24), { ...BRIGHT, rot: ALONG_Z }),
    P(`${nm} tamper seal`, 'ext-seal', tor(28, 2), at3(26, top + 52, 20), { mat: 'pe', color: 0xd8d8c8, finish: 'moulded', rot: ALONG_Z }),
    // the bracket: a loop of nylon-coated 5 mm wire round the body, and a U behind it that screws to the wall. The two
    // pieces weigh 127 g of the 200 g its maker's two totals differ by; the rest is its nylon coat and its fixings
    P(`${nm} bracket cradle`, 'ext-bracket', tub(5, 0, loop(120, 190)), [0, 0, 0], { ...PAINTED }),
    P(`${nm} bracket frame`, 'ext-bracket', tub(5, 0, [[-40, 100, 62], [-40, 290, 62], [40, 290, 62], [40, 100, 62]]), [0, 0, 0], { ...PAINTED }),
  ];
}

// ---- the face shield -------------------------------------------------------------------------------------------
/** A 3M WP96 window on a ratchet headgear, standing on the window's lower edge and looking along -z.
 *
 *  The window's wrap is derived rather than guessed. 3M gives it 229 mm high, 263 mm across, 1.8 mm thick and 149 g,
 *  and a flat sheet of those three sizes weighs 130 g — so the moulded wrap carries 15 % more polycarbonate than its
 *  width suggests. There is exactly one arc that is both 263 mm across the chord and long enough for 1.8 mm of
 *  polycarbonate over 229 mm to weigh 149 g: R 166.6 mm over 1.8185 rad (104°), 303 mm of arc, bulging 64 mm forward
 *  of its chord — which is also about what a face shield wraps to. Nothing else about the headgear is published, so
 *  the band, the ratchet, the pad and the pivots are estimates. */
export function faceShieldParts(nm: string): Part[] {
  const R = 166.6, arc = 1.8185, bandR = 95, bandY = 240;
  return [
    P(`${nm} window`, 'shield-window', pz(arcBand(R, arc, 1.8), 229), at3(0, 124, 0), { ...CLEAR, rot: UP }),
    P(`${nm} headgear band`, 'shield-band', pz(arcBand(bandR, 4.712, 2), 30), at3(0, bandY, 0), { ...DARK_ABS, rot: UP }),
    P(`${nm} brow pad`, 'shield-pad', bx(140, 30, 12), at3(0, bandY, -bandR + 7), { ...FOAM, fill: 0.2 }),
    P(`${nm} crown strap`, 'webbing', bx(20, 1.5, 180), at3(0, bandY + 16, 0), { mat: 'pet', color: 0x2c2f33, finish: 'weave' }),
    P(`${nm} headgear ratchet`, 'shield-ratchet', bx(60, 30, 14), at3(0, bandY, 72), { ...DARK_ABS, fill: 0.4 }),
    ...[-1, 1].map((s) => P(`${nm} shield pivot ${s < 0 ? 'left' : 'right'}`, 'shield-pivot', bx(50, 6, 22), at3(s * 110, bandY - 5, -50), { ...PALE_ABS, fill: 0.5 })),
  ];
}

// ---- the ear defenders -----------------------------------------------------------------------------------------
/** 3M PELTOR Optime II H520A: two cups on a sprung band, each with its sealing cushion against the head and its foam
 *  inside, standing on its cups with the band over the top. Only its weight (210 g) and its attenuation (SNR 31 dB)
 *  are published, so every size here is an estimate chosen so the solids weigh that 210 g — which is the check that
 *  the cup has been drawn as the thin shell it is and not as a solid block. */
export function earDefenderParts(nm: string): Part[] {
  const cupD = 100, cupL = 50, R = 85, cy0 = 55;
  const side = (s: number, w: string): Part[] => {
    const x = s * R;
    return [
      P(`${nm} ${w} cup`, 'muff-cup', cy(cupD, cupL), at3(x, cy0, 0), { ...DARK_ABS, rot: ALONG_X, shell: 1.7 * mm }),
      P(`${nm} ${w} cushion`, 'muff-cushion', tor(84, 20), at3(x - s * (cupL / 2 + 8), cy0, 0), { mat: 'pvc', color: 0x15171a, finish: 'moulded', rot: [0, PI / 2, 0], fill: 0.1 }),
      P(`${nm} ${w} liner`, 'muff-foam', cy(80, 18), at3(x + s * 4, cy0, 0), { ...FOAM, rot: ALONG_X, fill: 0.03 }),
      P(`${nm} ${w} stem`, 'muff-stem', tub(3, 0, [[x, cy0 + 22, -14], [x, cy0 + 70, -14], [x, cy0 + 70, 14], [x, cy0 + 22, 14]]), [0, 0, 0], { ...SPRING }),
      P(`${nm} ${w} stem slider`, 'muff-stem', bx(14, 34, 6), at3(x - s * 2, cy0 + 46, 0), { mat: 'nylon', color: 0x1a1c1f, finish: 'moulded', fill: 0.5 }),
    ];
  };
  return [
    ...side(-1, 'left'), ...side(1, 'right'),
    P(`${nm} headband`, 'muff-headband', pz(arcBand(R, PI, 1.2), 16), at3(0, cy0, 0), { ...SPRING }),
    P(`${nm} headband pad`, 'muff-pad', bx(120, 12, 28), at3(0, cy0 + R - 7, 0), { ...FOAM, fill: 0.125 }),
  ];
}

// ---- the welding gauntlets -------------------------------------------------------------------------------------
/** A pair of leather welding gauntlets lying flat, cuffs out. EN 12477 gives the only published figure — 350 mm
 *  overall at size 10, ±5 mm, and seams in para-aramid thread — so the 1.3 mm hide and the panels' sizes are typical
 *  of a welding glove, and the 0.30 kg a pair the inventory stores is what these solids weigh and not a maker's
 *  number. The hand is drawn as the sewn envelope it is, with its fingers in it: a welding glove has none of its own. */
export function weldGloveParts(nm: string): Part[] {
  const t = 1.3 * mm;
  // the sewn envelope of the hand, as the clicker die cuts it: the wrist square across, the fingers rounded off at
  // the end, 190 mm from wrist to fingertip and 115 mm across the palm (typical of a size 10)
  const mitt: [number, number][] = [[95, 55], [30, 62], [-25, 60], [-65, 52], [-90, 30], [-95, 0], [-90, -30], [-65, -52], [-25, -60], [30, -62], [95, -55]];
  const one = (s: number, w: string): Part[] => {
    const z = s * 85;
    return [
      P(`${nm} ${w} glove hand`, 'glove-hand', pz(mitt, 35), at3(-80, 17.5, z), { ...HIDE, rot: UP, shell: t }),
      // (the thumb out the side the hand's own is, so a left and a right glove laid together are the mirror pair
      //  they are sold as, rather than two gloves with their thumbs touching in the middle)
      P(`${nm} ${w} glove thumb`, 'glove-thumb', cy(32, 60), at3(-110, 17, z + s * 85), { ...HIDE, rot: ALONG_Z, shell: t }),
      P(`${nm} ${w} glove cuff`, 'glove-cuff', cy(100, 160, 120), at3(95, 62, z), { ...HIDE, rot: ALONG_X, shell: t }),
    ];
  };
  return [...one(-1, 'left'), ...one(1, 'right')];
}

// ---- the first-aid kit -----------------------------------------------------------------------------------------
/** A BS 8599-1 small workplace kit in its hinged case, its lid up. The standard says what is in a kit and not how big
 *  its box is, so the case is the 270 × 170 × 90 mm a seller lists and its walls are estimates; its contents are drawn
 *  as the one packed block of cotton they are in the box, which is the honest shape for "sterile dressings, triangular
 *  bandages, plasters, eye pads, wipes, gloves and a foil blanket" and is said so rather than drawn as nineteen things
 *  nobody has measured. */
export function firstAidParts(nm: string): Part[] {
  const W = 270, D = 170, h = 65, lean = PI / 2.4, up = Math.sin(lean), back = Math.cos(lean);
  const hy = h + 4, hz = -D / 2 - 2;                                      // where the hinge pin runs
  return [
    P(`${nm} case`, 'aidbox-shell', bx(W, h, D), at3(0, h / 2, 0), { ...GREEN, shell: 1.5 * mm }),
    P(`${nm} tray`, 'aidbox-tray', bx(250, 30, 150), at3(0, h - 14, 0), { ...GREEN, color: 0xd8dcd6, shell: 1.2 * mm }),
    P(`${nm} contents`, 'aid-dressings', bx(250, 60, 150), at3(0, 30, 0), { mat: 'cotton', color: 0xeeeae0, finish: 'weave' }),
    P(`${nm} lid`, 'aidbox-lid', bx(W, 28, D), at3(0, hy + (D / 2) * up, hz + (D / 2) * back), { ...GREEN, rot: [lean, 0, 0], shell: 1.5 * mm }),
    P(`${nm} lid handle`, 'aidbox-handle', bx(110, 10, 14), at3(0, hy + (D - 25) * up, hz + (D - 25) * back), { ...GREEN, fill: 0.6 }),
    P(`${nm} hinge pin`, 'hinge-pin', cy(3, 240), at3(0, hy, hz), { ...BRIGHT, rot: ALONG_X }),
    P(`${nm} latch`, 'aidbox-latch', bx(40, 8, 20), at3(0, h - 6, D / 2 + 6), { ...GREEN, color: 0xe8e8e4, fill: 0.5 }),
  ];
}

// ---- the extraction --------------------------------------------------------------------------------------------
/** The mains motor of the in-duct fan, as the library already stores one (`motor-shaded-pole`): a coil on a laminated
 *  core turning a cast cage rotor in two sintered bronze bushes, which is also what breaks the fan down to its
 *  elements. Manrose says only "high quality ball bearing, long life motor", so what kind of motor it is and every
 *  size of it is an estimate for a 200 W fan of this class — and its bushes stand in for the ball bearings it says it
 *  has, which is said here rather than left to be noticed. */
function fanMotor(nm: string, y: number): Part {
  const bush = (dy: number, w: string) => P(`${nm} motor ${w} bush`, 'sleeve-bearing', cy(10, 6), at3(0, y + dy, 0), { mat: 'bronze', color: 0x9a7b4a, finish: 'sinter' });
  return grp(`${nm} motor`, 'motor-shaded-pole', [
    P(`${nm} motor core`, 'lamination-stack', cy(60, 22), at3(0, y, 0), { mat: 'steel-electrical', color: 0x6b6f74, finish: 'laminated', fill: 0.6 }),
    P(`${nm} motor winding`, 'winding', cy(64, 16), at3(0, y + 19, 0), { mat: 'magnet-wire', color: 0xb5793a, finish: 'wound', fill: 0.25 }),
    grp(`${nm} motor rotor`, 'rotor-cage', [
      P(`${nm} motor rotor core`, 'lamination-stack', cy(40, 22), at3(0, y, 0), { mat: 'steel-electrical', color: 0x74787d, finish: 'laminated', fill: 0.8 }),
      P(`${nm} motor shaft`, 'shaft-steel', cy(8, 90), at3(0, y + 10, 0), { ...BRIGHT }),
    ]),
    bush(-18, 'lower'), bush(18, 'upper'),
  ]);
}

/** The 100 mm in-duct fan standing on the floor, its spigots up and down. Manrose publishes its three outside sizes,
 *  its spigot, its airflow and its power, and no weight at all, so the 1.39 kg the inventory stores for it is the
 *  drawn solids' own figure. */
export function fumeFanParts(nm: string): Part[] {
  const W = 178, D = 220, bodyH = 190, spig = 54, y0 = spig, top = y0 + bodyH;
  return [
    P(`${nm} fan case`, 'fanduct-case', bx(W, bodyH, D), at3(0, y0 + bodyH / 2, 0), { ...PALE_ABS, color: 0xe4e6e8, shell: 2 * mm }),
    P(`${nm} inlet spigot`, 'fanduct-spigot', cy(100, spig), at3(0, spig / 2, 0), { ...PALE_ABS, shell: 1.5 * mm }),
    P(`${nm} outlet spigot`, 'fanduct-spigot', cy(100, spig), at3(0, top + spig / 2, 0), { ...PALE_ABS, shell: 1.5 * mm }),
    P(`${nm} impeller`, 'fanduct-rotor', cy(92, 45), at3(0, y0 + 40, 0), { mat: 'pp', color: 0x26282b, finish: 'moulded', fill: 0.25 }),
    fanMotor(nm, y0 + 110),
    P(`${nm} bracket`, 'fanduct-bracket', bx(160, 1.5, 50), at3(0, y0 + 30, D / 2 + 1), { mat: 'steel-low', color: 0xb4b8bc, finish: 'zinc' }),
    P(`${nm} terminal cover`, 'fanduct-cover', bx(60, 25, 50), at3(W / 2 - 34, top - 14, -D / 2 - 12), { ...PALE_ABS, shell: 2 * mm }),
    ...[-1, 1].map((s) => P(`${nm} ${s < 0 ? 'live' : 'neutral'} lead`, 'wire-hookup', cy(1.6, 120), at3(W / 2 - 40 + s * 6, top - 40, -D / 2 - 30), { mat: 'copper', color: 0x202224, finish: 'pvc' })),
  ];
}

/** The run out of the fan: 800 mm of 100 mm flexible duct up out of its outlet and over the kit, with the capture hood
 *  on the end of it facing down at the work. A flexible duct holds whatever bend it is put in, which is the only
 *  reason extraction at a bench ever gets used — so it is drawn with its bend rather than as a straight pipe. Its
 *  foil is 0.12 mm; its wire helix is inside the foil and is not drawn apart. */
export function fumeRunParts(nm: string, x = 0, z = 0): Part[] {
  const y0 = 54 + 190 + 54, rise = 260, over = 360, drop = 200, end = y0 + rise - drop;
  return [
    // (its bends are drawn at 60 mm, under a duct diameter: flexible duct turns far tighter than rigid, which is the
    //  whole reason it is what reaches from a fixed fan to wherever the work is)
    P(`${nm} flexible duct`, 'duct-flex-100', tub(100, 0.12, [[x, y0, z], [x, y0 + rise, z], [x - over, y0 + rise, z], [x - over, end, z]], 60), [0, 0, 0], { ...FOIL }),
    P(`${nm} capture hood`, 'fume-hood', cy(150, 110, 100), at3(x - over, end - 55, z), { ...DARK_ABS, color: 0x30343a, shell: 1.5 * mm }),
  ];
}

// ---- the kit ---------------------------------------------------------------------------------------------------
/** The whole kit standing at its station, each item its own piece under its own inventory entry, so the viewer's
 *  explode opens the kit into six things and each of those into its own parts, down to their materials.
 *
 *  What it weighs against what its makers say:
 *    · the extinguisher 3.13 kg drawn against its maker's 3.20 kg with its bracket, 2 % under — and 3.00 kg against
 *      3.00 kg without it, which is the figure the cylinder's wall was chosen from. The 70 g missing is the bracket's
 *      nylon coat and its wall fixings, which are not drawn.
 *    · the face shield's window 148.6 g drawn against 3M's 149 g, from the wrap that figure gives it; its headgear has
 *      no published weight, and the 64 g of it drawn says so.
 *    · the ear defenders 205 g drawn against RS's 210 g for the same part number, 2 % under.
 *    · the gauntlets, the first-aid kit, the fan, the duct and the hood: no maker publishes a weight for any of them,
 *      so what the inventory stores for each is these solids' own figure and says so.
 *    · 6.13 kg for the whole kit against the 6.20 kg its eight entries add up to, 1.1 % under.
 *
 *  Left out, and said here rather than in a comment nobody reads: the extinguisher's valve thread, its valve's bores
 *  and chamber, and the gauge's green band; the face shield's and the headgear's markings; the gauntlets' seams and
 *  their cotton lining; the first-aid kit's contents drawn as one block rather than as the things BS 8599-1 lists one
 *  by one; the fan's terminal block, its dip switch, and its ball bearings (drawn as the sintered bushes the library
 *  stores); and the duct's wire helix. */
export function safetyKitParts(nm: string): Part[] {
  const fanX = 470, fanZ = -60;
  return [
    stood(`${nm} fire extinguisher`, 'extinguisher-2kg', -600, -150,
      '2 kg of ABC powder, 13A/55B, 3.20 kg with its bracket (RS Components’ PSP-series data sheet, PSP2000)', extinguisherParts(nm)),
    stood(`${nm} first-aid kit`, 'firstaid-small', -330, -150,
      'a BS 8599-1 small workplace kit in a 270 × 170 × 90 mm hinged case', firstAidParts(nm)),
    stood(`${nm} ear defenders`, 'eardefender-h520a', -520, 140,
      '3M PELTOR Optime II H520A: SNR 31 dB (EN 352), 210 g', earDefenderParts(nm)),
    stood(`${nm} welding gauntlets`, 'weldglove-pair', -150, 140,
      'leather gauntlets 350 mm long at size 10 (EN 12477), sewn with para-aramid thread', weldGloveParts(nm)),
    stood(`${nm} face shield`, 'faceshield-wp96', 250, 140,
      'a 3M WP96 window (229 × 263 mm, 1.8 mm polycarbonate, 149 g, EN 166 2C-12 1 B 3 9) on ratchet headgear', faceShieldParts(nm)),
    stood(`${nm} fume extraction`, 'fumefan-100', fanX, fanZ,
      'a Manrose MF100T: 68 l/s (245 m³/h) through 100 mm duct, 200 W, 24 dB(A) at 3 m', fumeFanParts(nm)),
    ...fumeRunParts(nm, fanX, fanZ),
  ];
}

// Wheeled machines of every kind, made one way: from what each is, never drawn for one. A machine is its axles (where
// each is, its track, its tyres by their size code, which steer, which drive, which have twin tyres), the frame that
// joins them (a pressed-steel shell, a welded tube frame, a ladder of two rails, a motorcycle's backbone), the panels
// lofted over it, its seats where its riders sit, its power (an engine sized from its displacement, or a motor and
// its battery), its controls, and what it carries or works with (a mast and forks, a fifth wheel, a mower's deck, racks,
// a bed). Every machine below is that and nothing else: a real one by its maker's published figures (each with where
// it comes from), the rest by the typical figures of their kind (said as typical).
//
// What a real product's exact surfaces are is its maker's drawing and is not public: a machine here is true to its
// published dimensions, tyres, wheelbase, track, mass, engine and part list, and its panels approximate its shape.
// Where the parts drawn weigh less than its published mass, the rest (trim, wiring, fluids, what is not drawn) is
// one part of that mass, said as such; where they weigh more, that is said too.

import { packToFit, starterBattery, use } from './components';
import { engineBuilt, type EngineSpec } from './engines';
import { driveshaft, heavyAxle, transaxle } from './drivetrain';
import { coil as coiled } from './makers';
import { boundsOfAll, massOfAll, partOf, place, type Assembly, type Placed } from './assembly';
import { massOf } from './mass';
import { aftertreatment, airTank, batteryBox, closureOf, coolingModule, exhaustSystem, bumper, cabStep, dayCab, exhaustStack, fifthWheel, fuelTank, hood, ladderFrame, quarterFender, type TruckBody } from './fittings';
import { AMBIENT, HEAT_FALLOFF, MAX_SERVICE } from './make/heat-limits';
import { WHEEL } from './kinds/fasteners';
import type { Choice, Iface, Kit, Part, Pick, Shape, V3 } from './kits';
import { archLip, bodyPanels, endAt, insideOf, lowAt, roofOf, skinIn, skinOf, tailOf, topAt, type BodyPlan, type KeepOut, type WheelAt } from './panels';
import { patchPoints, type Patch } from './surface';
import { getMaterial } from '../data/materials';
import type { Station } from './form';
import * as THREE from 'three';
import { clearPath, layout, sat, type OBB } from './make/space';

const IN = 0.0254, LB = 0.45359237, PI = Math.PI;

// ---- tyres, from their size codes -------------------------------------------------------------------------------
export interface Tyre { code: string; /** across, wide, its rim's diameter, m */ D: number; W: number; rim: number; says: string }
/** A tyre from its size code, in any of the systems marked on sidewalls: ISO metric (205/55R16, 80/100-21,
 *  295/75R22.5), flotation inches (24x8-12, 10x4.50-5, a press-on 21x7x15), conventional truck (11R22.5) and
 *  bias-ply (6.50-10). */
export function tyreOf(code: string): Tyre | null {
  const c = code.trim().toUpperCase().replace(/\s+/g, '');
  let m = /^(?:P|LT)?(\d{2,3})\/(\d{2,3})(?:Z?R|-|B|D)(\d{1,2}(?:\.5)?)C?$/.exec(c);
  if (m) { const W = +m[1]! / 1000, a = +m[2]! / 100, rim = +m[3]! * IN; return { code, W, rim, D: rim + 2 * W * a, says: `${code}: ${m[1]} mm wide, its sidewall ${m[2]} % of that, on a ${m[3]}-inch rim (ISO metric)` }; }
  m = /^(?:AT)?(\d{1,2}(?:\.\d+)?)[X×](\d{1,2}(?:\.\d+)?)(?:-|X|×)(\d{1,2}(?:\.\d+)?)$/.exec(c);
  if (m) { const D = +m[1]! * IN, W = +m[2]! * IN, rim = +m[3]! * IN; return { code, D, W, rim, says: `${code}: ${m[1]} in across, ${m[2]} in wide, on a ${m[3]}-inch rim (flotation sizes)` }; }
  m = /^(\d{1,2}(?:\.\d+)?)R(\d{2}(?:\.5)?)$/.exec(c);
  if (m) { const W = +m[1]! * IN, rim = +m[2]! * IN; return { code, W, rim, D: rim + 2 * W * 0.875, says: `${code}: ${m[1]} in wide on a ${m[2]}-inch rim, its sidewall about 87.5 % of its width (typical of conventional truck sizes)` }; }
  m = /^(\d{1,2}\.\d{2})-(\d{1,2})$/.exec(c);
  if (m) { const W = +m[1]! * IN, rim = +m[2]! * IN; return { code, W, rim, D: rim + 2 * W * 0.96, says: `${code}: ${m[1]} in wide on a ${m[2]}-inch rim, its sidewall about as tall as it is wide (typical of bias-ply sizes)` }; }
  return null;
}

// ---- what a machine is -------------------------------------------------------------------------------------------
export type Susp = 'rigid' | 'pivot' | 'strut' | 'beam' | 'wishbone' | 'swingarm' | 'leaf' | 'air' | 'fork';
export interface Axle { /** from the machine's middle, + forward */ x: number; track: number; tyre: string; steer?: boolean; drive?: boolean; dual?: boolean; brake?: { kind: 'disc' | 'drum'; d: number; vented?: boolean; /** one disc on the axle, not one in each wheel (a kart's) */ on?: 'axle' }; /** how it hangs from the frame */ susp?: Susp }
export type Frame = 'shell' | 'tube' | 'ladder' | 'backbone';
/** Where a panelled body's lines run, as shares of its length from its nose and of its height (typical of each style). */
export interface Lines { cowl: number; roofF: number; roofR: number; deck: number; belt: number; nose: number; tail: number; n: number; /** how far its belt rises from its cowl to its deck, m (its wedge: 0.02, typical, where not said) */ wedge?: number; /** how high its windscreen's foot and its back glass's foot stand, as shares of its height, where above its belt (as most cars' do: the top edge rising to each from the belt under its sail and its C pillar; at the belt where not said) */ cowlH?: number; deckH?: number; /** where its rear door's top rear corner is, and where its side glass ends at the back, as shares of its length from its nose: its rear door's shut line upright by its rear arch, then leaning back over it to there, a fixed quarter glass in the body behind the door (else upright, and its glass ending a little short of its roof's end) */ doorR?: number; dloR?: number; /** how full its windscreen and its back glass are: how far up its rise each one's control point at its middle stands (0.55 and 0.62, typical, where not said) */ bow?: [number, number]; /** how far behind its windscreen's foot its front door's top front corner is, as a share of its length: the fender runs back to it, a black sail fills the corner between its glass and its A pillar, and its mirror stands on the door (0 where not said: the door runs to the A pillar) */ sail?: number; open?: boolean; bed?: boolean; /** doors a side: one long one (a coupe's, a roadster's) or two */ doors?: 1 | 2; /** its haunches: how much narrower each side is along its doors than over its rear wheel (its published width is there), m; so much of that over its front wheel (0 to 1); and how far its shoulder line rises over its rear wheel, m (a hip, as a Monte Carlo's or a muscle car's) */ haunch?: { waist: number; front?: number; lift?: number }; /** its face: its headlamps' and its grille's height, and its tail lamps', m (typical of its kind where not said) */ face?: { lamp?: number; grille?: number; tail?: number; /** how far its tail lamps reach forward along its sides from its tail, m (0.45 where not said) */ wrap?: number } }
export interface Seat { x: number; z: number; /** its cushion's top above the ground */ y: number; style: 'bucket' | 'bench' | 'saddle' | 'pan' | 'kart' }
export interface Power { kind: 'single' | 'twin' | 'inline' | 'vee' | 'diesel' | 'electric'; /** a vee's angle between its banks, degrees (90 where not said) */ vee?: number; /** its block cast in iron or aluminium, where its maker says (else aluminium in a car, typical) */ block?: 'iron' | 'al'; cc?: number; kW: number; /** its cylinders, bore and stroke (m), how its valves are worked, how it is cooled and started, where its maker gives them (else typical of its kind and size) */ cyl?: number; bore?: number; stroke?: number; cams?: EngineSpec['cams']; valves?: 2 | 4; /** what its maker chose where engines differ (engines.ts FITS) */ fit?: string; cooling?: 'liquid' | 'air'; starter?: 'electric' | 'recoil'; x: number; z?: number; y?: number; says: string; /** its own size where it is published, m */ box?: V3; kg?: number; /** its most torque, N·m, and the reduction from it to the driven axle, where known */ torque?: number; ratio?: number; driveSays?: string }
export type Extra = 'mast' | 'guard' | 'counterweight' | 'fifth wheel' | 'tanks' | 'stacks' | 'deck' | 'racks' | 'bumpers' | 'lights' | 'pods' | 'nose' | 'fenders' | 'hood' | 'cab' | 'fork' | 'swingarm' | 'tank' | 'exhaust' | 'number';
/** A wheel cover as its maker styled it: so many spokes, in pairs or evenly round it, each swept round so far as it goes
 *  out (degrees) and widening toward the rim; a domed centre, with its maker's emblem on it. */
export interface Cover { spokes: number; /** in pairs, each pair's two spreading apart as they go out (a V), by so many degrees each */ pairs?: number; /** each swept round the same way as it goes out, degrees */ sweep?: number; /** each spoke's width at the hub and at the rim, as a share of the pitch between spokes there */ width?: [number, number]; emblem?: boolean; says?: string }
/** A body kit bolted onto a car's skin (aftermarket, or its maker's own), each piece fitted to the skin as it is made
 *  (panels.ts skinOf): flares round its arches, skirts along its rockers, a lip under its nose and a valance under its tail,
 *  an insert in a scoop on each rear quarter, a wing on its deck. Moulded ABS unless said; its colour its own. */
/** A lip's or a valance's figures (BodyKit). */
export interface Plate { d: number; t: number; out: number; sd?: number; sh?: number; rise?: number }
export interface BodyKit {
  color: number; mat?: string; says: string;
  /** a flare round each arch: so wide out from the lip, so thick (how far proud of the skin), round from and to what angle
   *  over the axle (degrees from straight ahead), riveted every so many degrees, their heads painted (black where not said);
   *  reaching so far inside the arch's lip over its opening, as a wide flare does (0 where not said) */ flares?: { w: number; t: number; from?: number; to?: number; every?: number; heads?: number; inset?: number };
  /** a skirt along each rocker between the arches: so tall over the skin's foot, so thick */ skirts?: { h: number; t: number };
  /** a lip under the front bumper and a valance under the rear: so deep along the car, so thick, reaching so far past the
   *  skin; and where said, a side piece down each of the bumper's corners: so long along the car from its end (sd), so tall
   *  (sh), its top edge rising so much toward the end (rise), m */
  lip?: Plate; valance?: Plate;
  /** an insert in a scoop on each rear quarter: its outline seen from the side, m, from the rear axle (x, ahead +) and the ground (y); and the vent it frames */ scoop?: [number, number][]; vent?: [number, number][];
  /** a ducktail spoiler moulded along the deck lid's tail: so tall at its trailing edge, so deep along the deck, across so much of the width */ spoiler?: { h: number; d: number; span: number };
  /** a wing on the deck: its chord, its height over the deck, its span as a share of the width, its pitch (degrees, its
   *  leading edge down, as a wing pressing the car down is set), how far its trailing edge is ahead of the tail, its
   *  blade's colour (its end plates and uprights the kit's); its end plates so long and so tall, m (from its chord where
   *  not said) */ wing?: { chord: number; h: number; span: number; pitch: number; back: number; color: number; plate?: number; plateH?: number };
}
export interface Machine {
  /** a tube frame's upper rails, m above the ground (an ATV's, under its seat and racks) */ upper?: number;
  /** a tube frame's rails in plan: their half-width, as shares of the room between the wheels, at its back end, the rear axle, the front axle, ahead of it and its nose */ rails?: [number, number, number, number, number];
  id: string; name: string; kind: string; source: string; /** what it is called in a few words ("corolla", "rancher"), as it is chosen */ short?: string;
  L: number; W: number; H: number; clearance: number; axles: Axle[]; frame: Frame; lines?: Lines; seats: Seat[]; power: Power;
  controls: 'wheel' | 'bars'; /** the driver's side: -1 left (as in North America), 1 right */ hand?: -1 | 1;
  rims: { style: 'spokes' | 'steel' | 'wire' | 'disc' | 'split'; spokes?: number; mat: string; lugs: number; lug: number; color?: number; /** the studs' pitch circle, mm, where its maker gives it (else typical of its stud count) */ pcd?: number; /** its offset, mm: its mounting face outboard of its rim's middle */ offset?: number; /** a full wheel cover over a steel wheel: so many spokes in its moulding, or as its maker styled it */ cover?: number | Cover; /** a colour painted down the middle of each spoke and round the rim's outer lip (a two-tone wheel's), and its centre cap's */ accent?: number; /** a colour painted round the rim's outer lip (the accent's where not said) */ lip?: number; cap?: number };
  /** its gearbox, where its maker says (a CVT, a manual) */ gearbox?: 'cvt' | 'manual' | 'automatic';
  extras: Extra[]; /** a body kit on its skin */ kit?: BodyKit; /** its mirrors' colour, where not its body's */ mirrors?: number; /** its paint's look (appearance.ts): laid on every piece in its body's colour (a paint sanded back to its primer, a clear coat) */ paint?: import('./appearance').Look; /** its published mass, kg (kerb, wet, or operating, as its maker gives it) */ mass?: number; massSays?: string;
  /** a motorcycle's head angle from vertical, rad */ rake?: number; seatH?: number; color: number; says: string;
  /** it goes on public roads (where it is sold, if said: its plates are that market's) */ road?: boolean | 'us' | 'eu';
  /** a chain drive: from a sprocket on the engine (offset from its middle) to one on the driven axle, in a plane at z */ chain?: { teeth: [number, number]; pitch: number; at: [number, number]; z: number; item?: string; says: string }; /** its overhead guard's top, m */ guardH?: number;
}

// ---- making parts -------------------------------------------------------------------------------------------------
const P = (name: string, shape: Shape | undefined, at: V3, more: Partial<Part> = {}): Part => ({ name, ...(shape ? { shape } : {}), at, ...more });
const tube = (name: string, r: number, pts: V3[], mat: string, color: number, more: Partial<Part> = {}, wall = Math.max(0.0012, r * 0.1)): Part => P(name, { tube: { r, pts, wall } }, [0, 0, 0], { mat, color, finish: 'paint', ...more });
const subV = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], unitV = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
/** A coil spring as it is wound: its wire along a helix of so many turns, its ends closed flat (typical), along y. */
const coil = (name: string, R: number, wire: number, L: number, turns: number, more: Partial<Part> = {}): Part => {
  const n = Math.round(turns * 14), pts: V3[] = []; for (let i = 0; i <= n; i++) { const f = i / n, th = f * turns * 2 * PI, y = -L / 2 + wire + (L - 2 * wire) * Math.min(1, Math.max(0, (f * turns - 0.5) / (turns - 1))); pts.push([R * Math.cos(th), y, R * Math.sin(th)]); }
  return P(name, { tube: { r: wire, pts, wall: wire, bend: R * 0.4 } }, [0, 0, 0], { mat: 'steel-spring', color: 0x1c1c1c, finish: 'paint', ...more });
};
const loft = (name: string, st: Station[], mat: string, color: number, more: Partial<Part> = {}): Part => P(name, { loft: { st } }, [0, 0, 0], { mat, color, ...more });
const darken = (c: number, k: number) => (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);

/** A tyre's section as it is turned, [radius from the axle, offset along it]: from its bead on the rim out to its widest
 *  low on the sidewall, and in again to its tread, rounded at the shoulder (its tread about 78% of its section's width,
 *  typical of a car's tyre). What it is drawn from, and what the room it needs is reckoned from. */
export function tyreSection(t: Tyre): [number, number][] {
  // (its beads seated on the rim's bead seats, at the rim's radius, just inside its flanges: a tyre holds air because
  // its beads are pressed on its rim, not 4 mm over it)
  const R = t.D / 2, r0 = t.rim / 2 + 0.0005, h = R - r0, w = t.W / 2, zb = Math.min(w * 0.8, w * 0.9 - 0.009);
  return [[r0, -zb], [r0 + h * 0.4, -w], [R - h * 0.14, -w * 0.97], [R, -w * 0.78], [R, w * 0.78], [R - h * 0.14, w * 0.97], [r0 + h * 0.4, w], [r0, zb]];
}
// ---- a tyre as it is made: its layers and its tread, from its size and its pattern -------------------------------------
// (A radial tyre from the inside out: an inner liner that holds the air, a body ply of cords from bead to bead, the
// beads (hoops of steel wire with a hard rubber apex over each, what holds it on the rim), steel belts under its tread
// (two in a car's, four in a truck's), a nylon cap ply over them (a car's), an undertread, its tread of blocks and ribs
// cut by grooves and sipes, and its sidewalls. Each layer's thickness and each cord's share of its layer are typical
// (estimates, said as such): a maker's exact construction is its own.)
export type Tread = 'highway' | 'all-season' | 'all-terrain' | 'mud' | 'rib' | 'drive' | 'knobby' | 'slick';
/** One row of blocks round the tread: where it is across (−1 to 1 of the tread's half width), how wide (a share of the
 *  half width), how long round (a share of its pitch: 1, a rib cut only by its sipes) and how far on it starts (a share
 *  of its pitch: rows staggered). */
interface TreadRow { z: number; w: number; len: number; off?: number }
const ROWS = (r: TreadRow[], both = true): TreadRow[] => both ? r.flatMap((x) => x.z === 0 ? [x] : [{ ...x, z: -x.z }, { ...x, z: x.z, off: x.off === undefined ? 0 : (x.off + 0.5) % 1 }]) : r;
export const TREAD_PATTERNS: Record<Tread, { rows: TreadRow[]; /** new tread depth, m: a car's, a truck's */ depth: [number, number]; pitch: number; sipes: number; says: string }> = {
  highway: { rows: ROWS([{ z: 0, w: 0.2, len: 1 }, { z: 0.32, w: 0.3, len: 1, off: 0 }, { z: 0.78, w: 0.4, len: 0.84, off: 0 }]), depth: [0.0085, 0.0127], pitch: 0.03, sipes: 1, says: 'three ribs and two rows of shoulder blocks between four grooves round it (typical of a touring tyre); new, 8.5 mm deep (10–11/32 in, typical)' },
  'all-season': { rows: ROWS([{ z: 0, w: 0.2, len: 0.9 }, { z: 0.32, w: 0.3, len: 0.82, off: 0.25 }, { z: 0.78, w: 0.4, len: 0.8, off: 0 }]), depth: [0.0085, 0.0127], pitch: 0.03, sipes: 2, says: 'blocks cut by more sipes, for grip on wet and cold roads (typical of an all-season tyre); 8.5 mm deep new (typical)' },
  'all-terrain': { rows: ROWS([{ z: 0, w: 0.26, len: 0.7 }, { z: 0.4, w: 0.3, len: 0.72, off: 0.25 }, { z: 0.8, w: 0.36, len: 0.68, off: 0 }]), depth: [0.0125, 0.016], pitch: 0.04, sipes: 1, says: 'staggered blocks with wide voids between them (typical of an all-terrain tyre); 12.5 mm deep new (about 16/32 in, typical)' },
  mud: { rows: ROWS([{ z: 0.22, w: 0.38, len: 0.45, off: 0 }, { z: 0.74, w: 0.48, len: 0.5, off: 0.5 }]), depth: [0.018, 0.022], pitch: 0.065, sipes: 0, says: 'big lugs, alternating, with half the tread open between them to clear mud (typical of a mud-terrain tyre); 18 mm deep new (typical)' },
  rib: { rows: ROWS([{ z: 0, w: 0.2, len: 1 }, { z: 0.4, w: 0.24, len: 1, off: 0 }, { z: 0.82, w: 0.32, len: 1, off: 0 }]), depth: [0.0095, 0.0127], pitch: 0.04, sipes: 1, says: 'five ribs straight round it, cut only by sipes (typical of a steer-axle tyre: it rolls true and wears evenly); 16/32 in (12.7 mm) new on a truck (typical)' },
  drive: { rows: ROWS([{ z: 0.24, w: 0.42, len: 0.55, off: 0 }, { z: 0.76, w: 0.44, len: 0.6, off: 0.5 }]), depth: [0.014, 0.0206], pitch: 0.05, sipes: 1, says: 'deep lugs across it (typical of a drive-axle tyre: traction); 26/32 in (20.6 mm) new on a truck (typical)' },
  knobby: { rows: ROWS([{ z: 0, w: 0.28, len: 0.35 }, { z: 0.6, w: 0.3, len: 0.35, off: 0.5 }]), depth: [0.015, 0.015], pitch: 0.055, sipes: 0, says: 'separate knobs, most of the tread open (typical of an off-road motorcycle or ATV tyre); 15 mm tall (typical)' },
  slick: { rows: [{ z: 0, w: 2, len: 1 }], depth: [0.003, 0.003], pitch: 0.05, sipes: 0, says: 'a smooth band, no grooves (a racing slick, typical: dry tracks only)' },
};
export const TREADS = Object.keys(TREAD_PATTERNS) as Tread[];
export interface TyreMake { pattern?: Tread; /** its tread's depth, m (new, typical of its pattern, where not said) */ depth?: number; /** its tread's mean pitch, m (each pitch one of three lengths) */ pitch?: number; /** sipes in each block */ sipes?: number; /** how worn, 0 new to 1 down to its wear bars (1.6 mm) */ wear?: number; /** its compound's colour */ color?: number }
export interface TyreBuilt { tyre: Assembly; kg: number; /** the share of its tread open (grooves and voids) */ void: number; depth: number; pitches: number; heavy: boolean; layers: string[]; says: string }
const tyresMade = new Map<string, TyreBuilt>();
/** A tyre as it is made, from its size code and its tread: built once for each size and tread, and the same one is then
 *  fitted to every wheel and every machine that takes it (each stores it once). Built about y (as a turned profile is),
 *  so it fits where its wheel's tyre was. */
export function tyreBuilt(t: Tyre, o: TyreMake = {}): TyreBuilt {
  const heavy = t.rim >= 0.49, pat = TREAD_PATTERNS[o.pattern ?? (heavy ? 'rib' : 'highway')], key = JSON.stringify([t.code, o]);
  const was = tyresMade.get(key); if (was) return was;
  const R = t.D / 2, r0 = t.rim / 2 + 0.0005, h = R - r0, w = t.W / 2, zb = Math.min(w * 0.8, w * 0.9 - 0.009), tw = w * 0.78;
  const BAR = 0.0016, depth0 = o.depth ?? pat.depth[heavy ? 1 : 0], wear = Math.max(0, Math.min(1, o.wear ?? 0)), depth = depth0 - (depth0 - BAR) * wear, Ru = R - depth0;
  const col = o.color ?? 0x161616, rub = (more: Partial<Part> = {}): Partial<Part> => ({ mat: 'rubber', color: col, finish: 'tread', facets: 120, ...more });
  // its casing's outside, bead to bead: under its tread at the tread's foot (Ru), its tread on it
  const O: [number, number][] = [[r0, -zb], [r0 + h * 0.4, -w], [R - h * 0.14, -w * 0.97], [Ru, -w * 0.8], [Ru, w * 0.8], [R - h * 0.14, w * 0.97], [r0 + h * 0.4, w], [r0, zb]];
  const cls = [0, 1, 2, 3, 3, 2, 1, 0], C: [number, number] = [(r0 + R) / 2, 0];
  const nrm = O.map((p, i) => {
    const segN = (a: [number, number], b: [number, number]): [number, number] => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
    const ns = [i > 0 ? segN(O[i - 1]!, p) : null, i < O.length - 1 ? segN(p, O[i + 1]!) : null].filter(Boolean) as [number, number][];
    let n: [number, number] = [ns.reduce((s, q) => s + q[0], 0), ns.reduce((s, q) => s + q[1], 0)]; const l = Math.hypot(...n) || 1; n = [n[0] / l, n[1] / l];
    return (C[0] - p[0]) * n[0] + (C[1] - p[1]) * n[1] < 0 ? [-n[0], -n[1]] as [number, number] : n;
  });
  // (thickness by where on the section: [bead, sidewall, shoulder, crown], m, and the share of each cord layer that is cord)
  const T = heavy
    ? { side: [0.007, 0.006, 0.003, 0], under: [0, 0, 0.002, 0.004], cap: [0, 0, 0, 0], belt: [0, 0, 0.001, 0.002], belts: 4, ply: 0.0028, liner: 0.0025, plyCord: { mat: 'steel', share: 0.15, rho: 7850 }, bead: 0.015 }
    : { side: [0.004, 0.0035, 0.0018, 0], under: [0, 0, 0.001, 0.002], cap: [0, 0, 0.0004, 0.0008], belt: [0, 0, 0.0006, 0.0012], belts: 2, ply: 0.0012, liner: 0.001, plyCord: { mat: 'polyester', share: 0.2, rho: 1380 }, bead: 0.006 };
  const depthAt = new Array(O.length).fill(0) as number[], parts: Part[] = [], layers: string[] = [];
  const band = (name: string, thick: number[], i0: number, i1: number, more: Partial<Part>, why: string) => {
    const outer: [number, number][] = [], inner: [number, number][] = [];
    for (let i = i0; i <= i1; i++) { const d0 = depthAt[i]!, tk = thick[cls[i]!]!, n = nrm[i]!, p = O[i]!; outer.push([p[0] + n[0] * d0, p[1] + n[1] * d0]); inner.push([p[0] + n[0] * (d0 + tk), p[1] + n[1] * (d0 + tk)]); depthAt[i] = d0 + tk; }
    const prof = [...outer, ...inner.reverse(), outer[0]!] as [number, number][];
    parts.push(P(name, { lathe: prof }, [0, 0, 0], more)); if (!layers.includes(why)) layers.push(why);
  };
  // (a cord layer's mass: its cord's share at the cord's density, the rest rubber at 1,150 kg/m³)
  const cord = (prof: number, share: number, rho: number) => (share * rho + (1 - share) * 1150) / 1150 * prof;
  // (weighed by its rubber's density times that: the layer as drawn, rubber and cord together, no mass said for it)
  const withCord = (name: string, thick: number[], i0: number, i1: number, share: number, rho: number, more: Partial<Part>, why: string) => {
    band(name, thick, i0, i1, { ...more, fill: cord(1, share, rho), says: `rubber with ${Math.round(share * 100)} % cord by volume (its weight ${cord(1, share, rho).toFixed(2)} times its rubber's)` }, why);
  };
  band('sidewall (its outer side)', T.side, 5, 7, rub({ finish: 'satin' }), 'sidewalls: flexible rubber over the ply, bead to shoulder');
  band('sidewall (its inner side)', T.side, 0, 2, rub({ finish: 'satin' }), 'sidewalls: flexible rubber over the ply, bead to shoulder');
  band('undertread', T.under, 2, 5, rub(), 'an undertread under the blocks');
  if (!heavy) withCord('cap ply (nylon)', T.cap, 2, 5, 0.3, 1140, rub({ color: 0x3a3226, finish: 'satin' }), 'a nylon cap ply over the belts (a car\'s: holds them down at speed)');
  for (let b = T.belts; b >= 1; b--) withCord(`steel belt ${b}`, T.belt, 2, 5, 0.3, 7850, rub({ color: 0x55585c, finish: 'satin' }), `${T.belts} steel belts, their cords crossed (about 30 % steel by volume, typical)`);
  withCord(`body ply (${T.plyCord.mat} cords)`, [T.ply, T.ply, T.ply, T.ply], 0, 7, T.plyCord.share, T.plyCord.rho, rub({ color: heavy ? 0x55585c : 0xc9b98f, finish: 'satin' }), `a body ply of ${T.plyCord.mat} cords radial from bead to bead (${Math.round(T.plyCord.share * 100)} % cord, typical)`);
  band('inner liner (halobutyl)', [T.liner, T.liner, T.liner, T.liner], 0, 7, rub({ color: 0x2a2a2e, finish: 'satin' }), 'an inner liner of halobutyl rubber that holds the air (tubeless)');
  // its beads: a hoop of steel wire, its apex of hard rubber over it, each inside the casing at its foot
  const bs = T.bead, rB = r0 + 0.004 + bs / 2, zB = zb - bs / 2 - (heavy ? 0.006 : 0.003);
  for (const s of [-1, 1]) {
    parts.push(P(`bead (${s < 0 ? 'inner' : 'outer'} side)`, { torus: [rB, bs / 2] }, [0, s * zB, 0], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x8a6a3a, finish: 'satin', facets: 96, says: `a hoop of bronze-coated steel wire, ${Math.round(bs * 1000)} mm across its bundle (typical), round the rim's bead seat: what holds the tyre on` }));
    parts.push(P(`apex (${s < 0 ? 'inner' : 'outer'} side)`, { lathe: [[rB + bs / 2, s * zB - s * bs * 0.35], [rB + h * 0.3, s * zB - s * bs * 0.05], [rB + bs / 2, s * zB + s * bs * 0.35], [rB + bs / 2, s * zB - s * bs * 0.35]] }, [0, 0, 0], rub({ color: 0x222226, finish: 'satin', says: 'a hard rubber filler over the bead, stiffening the lower sidewall' })));
  }
  layers.push('two beads of steel wire, a hard rubber apex over each');
  // (each layer what it is in the inventory, so the tyre comes apart into named parts)
  const LAYER: [RegExp, string][] = [[/^sidewall/, 'tyre-sidewall'], [/^undertread/, 'tyre-tread'], [/^cap ply/, 'tyre-cap-ply'], [/^steel belt/, 'tyre-belt'], [/^body ply/, 'tyre-casing'], [/^inner liner/, 'tyre-liner'], [/^bead/, 'tyre-bead'], [/^apex/, 'tyre-apex']];
  for (const q of parts) { const hit = LAYER.find(([re]) => re.test(q.name)); if (hit) q.item = hit[1]; }
  const casing: Part = P(`casing ${t.code}`, undefined, [0, 0, 0], { mat: 'rubber', color: col, says: t.says, parts });
  // its tread: pitches of three lengths in a sequence round it (as makers spread the noise of a tread's blocks over many
  // tones: the lengths, 0.85, 1 and 1.15 of its mean, and their order are typical, not any maker's), each pitch a group of
  // blocks, cut by its sipes; worn, its blocks stand lower on the same foot (0.6 mm, typical; drawn right through, where a real sipe stops short of the groove's floor)
  const circ = 2 * PI * R, mean = o.pitch ?? pat.pitch, n = Math.max(12, Math.round(circ / mean)), SEQ = [1, 0, 1, 2, 2, 1, 0, 0, 1, 2], ratio = [0.85, 1, 1.15];
  const raw = Array.from({ length: n }, (_, i) => ratio[SEQ[i % SEQ.length]!]!), k = circ / raw.reduce((a, b) => a + b, 0), SIPE = 0.0006;
  const sipes = o.sipes ?? pat.sipes, rho = Ru + depth / 2, items: Placed[] = [];
  const pitchOf = new Map<number, Part>(); let land = 0;
  const blockOf = (len: number): Part => {
    const blocks: Part[] = [];
    for (const row of pat.rows) {
      const bw = row.w * tw, z = row.z * tw; if (bw <= 0) continue;
      const span = row.len >= 1 ? len - SIPE * Math.max(1, sipes) : len * row.len, cuts = row.len >= 1 ? Math.max(1, sipes) : sipes + 1, slab = (span - (row.len >= 1 ? 0 : SIPE * sipes)) / cuts;
      if (pat === TREAD_PATTERNS.slick) { blocks.push(P('tread', { box: [depth, Math.min(2 * tw, bw), len + 0.0002] }, [rho, 0, 0], rub())); continue; }
      for (let c = 0; c < cuts; c++) {
        const s0 = (row.off ?? 0) * len + c * (slab + SIPE) + slab / 2, a = s0 / rho;
        blocks.push(P('tread block', { box: [depth, bw, slab] }, [rho * Math.cos(a), z, rho * Math.sin(a)], rub({ rot: [0, -a, 0], item: 'tyre-tread' })));
      }
    }
    return P('tread pitch', undefined, [0, 0, 0], { parts: blocks });
  };
  let ang = 0;
  for (let i = 0; i < n; i++) {
    const len = raw[i]! * k, key2 = Math.round(raw[i]! * 100);
    let pp = pitchOf.get(key2); if (!pp) { pp = blockOf(len); pitchOf.set(key2, pp); }
    items.push(place(pp, [0, 0, 0], [0, -ang / R, 0])); ang += len;
    land += pat.rows.reduce((s, row) => s + Math.min(2 * tw, row.w * tw) * (row.len >= 1 ? len - SIPE * Math.max(1, sipes) : len * row.len), 0);
  }
  // its wear bars: across the floor of its main grooves, 1.6 mm high (the legal limit in most countries), six round it
  const spans = pat.rows.map((r) => [(r.z - r.w / 2) * tw, (r.z + r.w / 2) * tw] as [number, number]).sort((a, b) => a[0] - b[0]), grooves: [number, number][] = [];
  for (let i = 1; i < spans.length; i++) if (spans[i]![0] - spans[i - 1]![1] > 0.003) grooves.push([spans[i - 1]![1], spans[i]![0]]);
  const bars: Part[] = []; for (let j = 0; j < 6; j++) for (const [g0, g1] of grooves) { const a = (j / 6) * 2 * PI; bars.push(P('wear bar', { box: [BAR, g1 - g0, 0.012] }, [(Ru + BAR / 2) * Math.cos(a), (g0 + g1) / 2, (Ru + BAR / 2) * Math.sin(a)], rub({ rot: [0, -a, 0] }))); }
  if (bars.length) items.push(place(P('wear bars', undefined, [0, 0, 0], { parts: bars })));
  const tread: Assembly = { name: `tread (${o.pattern ?? (heavy ? 'rib' : 'highway')}, ${n} pitches)`, items };
  const tyre: Assembly = { name: `tyre ${t.code}`, item: 'pneumatic-tyre', items: [place(casing), place(tread)] };
  const voidShare = Math.max(0, 1 - land / (circ * 2 * tw)), kg = massOfAll(tyre);
  const out: TyreBuilt = { tyre, kg, void: voidShare, depth, pitches: n, heavy, layers: [...layers, `its tread: ${pat.says}`], says: `${t.says}; ${n} pitches of three lengths round it; ${Math.round(voidShare * 100)} % of its tread open; ${(kg).toFixed(1)} kg as drawn` };
  tyresMade.set(key, out); return out;
}
/** A machine made to roll: its wheels taken off its body as things of their own, each on a hinge about its axle (a joint
 *  for Let it go, free: no brake, no drive), so pushed it rolls on and does not slide. Its body is everything else. */
export function rollingOf(v: Part): { thing: Assembly; joints: { kind: 'hinge'; name: string; a: string; b: string; at: V3; axis: V3; friction: number }[] } {
  const isWheel = (q: Part) => /^(front|rear|middle|axle \d+)\b.* wheel( \d+)?$/.test(q.name), wheels = (v.parts ?? []).filter(isWheel), body: Part = { ...v, name: `${v.name} (body)`, parts: (v.parts ?? []).filter((q) => !isWheel(q)) };
  return {
    thing: { name: v.name, items: [place(body), ...wheels.map((w) => place(w, w.at ?? [0, 0, 0], w.rot ?? [0, 0, 0]))] },
    joints: wheels.map((w) => ({ kind: 'hinge' as const, name: `axle of ${w.name}`, a: w.name, b: body.name, at: (w.at ?? [0, 0, 0]) as V3, axis: [0, 0, 1] as V3, friction: 0 })),
  };
}
/** A wheel: its tyre (a turned section, knobbed off-road), its rim (a turned barrel between flanges) and face, its hub
 *  and the nuts that hold it on their pitch circle, and its brake. Built with its outer face to +z. */
/** A wheel's stud circle, m across: its maker's where given, else typical of its stud count (4×100, 5×114.3, 6×139.7,
 *  8×165.1 mm, as cars, pickups and trucks use), and never wider than its rim has room for. */
// (ten studs: 285.75 mm, the North American hub-piloted truck wheel's circle, M22 × 1.5 studs; Europe's is 335 mm, ISO 4107)
const pcdOf = (lugs: number, rimR: number, given?: number) => Math.min(given ? given / 1000 : ({ 3: 0.07, 4: 0.1, 5: 0.1143, 6: 0.1397, 8: 0.1651, 10: 0.28575 } as Record<number, number>)[lugs] ?? 0.1, 2 * Math.max(0.025, rimR * 0.62));
/** Where a wheel's corner is along its axle, m out from the wheel's middle (+ toward its outer face), so the wheel and
 *  what holds it agree: its mounting face (where its maker's offset puts it, outboard of the rim's middle; else, typical,
 *  an alloy's 30 mm behind its centre pad at 30% of the half-width out, a steel or disc wheel's a quarter of the tyre's
 *  width out); its hub's flange behind it (behind a disc's hat, 6 mm, clamped between them) and the barrel it turns on;
 *  its brake (a disc's ring by its hat, 46 mm from the mounting face to the ring's far side for a 275 mm disc, typical,
 *  and so in scale; a drum's face); and where a knuckle may be: its upright 6 mm inboard of its caliper or its drum, its
 *  bearing housing round the hub's barrel from there out to 12 mm short of the hub's flange, inside the disc's hat. */
function cornerOf(t: Tyre, o: { style: Machine['rims']['style']; offset?: number; brake?: Axle['brake']; lugs?: number; pcd?: number; lug?: number; /** a disc wheel turning on a spindle fixed to an anchor plate (a beam's), not in a knuckle */ plate?: boolean }, knuckle = false) {
  // (the hub's flange out past its studs by a nut's half width and 4 mm, so each stud is pressed in whole metal)
  const rr = t.rim / 2, studR = o.lugs ? pcdOf(o.lugs, rr, o.pcd) / 2 : 0, wr = t.W * 0.45, hubR = Math.max(0.03, rr * 0.28, studR ? studR + (o.lug ?? 12) / 1000 + 0.004 : 0), disc = o.brake?.kind === 'disc' ? o.brake : null;
  // (a wire wheel's hub spans both its spoke flanges, ±a quarter of the tyre's width, and its disc is a flat rotor bolted to
  // the hub's inner end, 16 mm outside the inner flange, clear of the spokes' cone and of its caliper's outer half)
  const wire = o.style === 'wire', zF = wr * 0.5;
  const zMount0 = o.offset !== undefined ? Math.min(wr - 0.035, Math.max(-wr * 0.6, o.offset / 1000)) : o.style === 'spokes' || o.style === 'split' ? wr * 0.3 - 0.03 : t.W * 0.25, zMount = wire ? Math.max(zMount0, zF + 0.008) : zMount0;
  const hubFace = zMount - (disc ? 0.006 : 0), rB = hubR * 0.6, r = disc ? Math.min(disc.d / 2, rr - 0.02) : 0, th = disc ? (disc.vented ? 0.026 : wire ? 0.004 : 0.011) : 0;
  const hat = Math.min(0.08, Math.max(0.03, (0.046 * r) / 0.1375)), zD = wire && disc ? -(zF + 0.016 + th / 2) : zMount - hat + th / 2;
  // (its caliper: a piston half inboard of the ring, as thick as a fifth of the ring's radius up to 30 mm, typical)
  const sideIn = Math.max(0.018, Math.min(0.03, r * 0.22)), sideOut = 0.012, drumL = Math.min(0.08, t.W * 0.5);
  const calIn = disc ? zD - th / 2 - 0.0015 - sideIn : o.brake?.kind === 'drum' ? -wr * 0.3 - drumL / 2 : hubFace - 0.03;
  const armT = 0.022, armOut = Math.min(calIn - 0.006, hubFace - 0.03), zA = armOut - armT / 2, zK0 = zA - armT / 2, zK1 = hubFace - 0.016;
  // (its caliper behind the axle, a little under its middle (189° round from ahead), clear of the strut's foot over the
  // knuckle; as long round the ring as 1.1 times its radius, as wide as 0.36 of it; its carrier's two legs just past its
  // ends, bolted to two ears of the knuckle)
  const cw = Math.max(0.035, r * 0.36), ch = Math.min(0.3, r * 1.1), rc = r - cw / 2 + 0.006, ca0 = 3.3, legW = 0.02, legAt = (ch / 2 + legW / 2) / Math.max(rc, 0.01);
  return { wr, rr, hubR, rB, zMount, hubFace, zSpig: zMount + 0.006, hubIn: knuckle ? zK0 - 0.002 : disc && o.plate ? zA + armT / 2 + 0.002 : wire && disc ? zD + th / 2 : wire ? Math.min(-t.W * 0.3, -zF - 0.004) : -t.W * 0.3, r, th, zD, zF, wire, rh: hubR + 0.008, sideIn, sideOut, drumL, zA, zK0, zK1, armT, rK: Math.min(hubR + 0.002, rB + 0.02), studR, cw, ch, rc, ca0, legW, legAt, calIn };
}
/** A MacPherson strut's line, in half-widths from the car's middle: its foot clamped to the knuckle 100 mm over the
 *  axle, its tube 30 mm in from the tyre's inner face there, leaning in 12° (its tube's inclination, typical) to its
 *  top mount under its tower; its spring seated 15 mm over the tyre's top, wound round its rod up to the mount. Where a
 *  low car has no room over its tyre for a spring 160 mm long (typical, the least that carries a car's corner), its
 *  seat is lower, beside the tyre, and its strut stands further in, so the spring's coils clear the tyre's inner face by
 *  15 mm. */
const strutOf = (a: Axle, t: Tyre, m: Machine) => {
  const y = t.D / 2, yb = y + 0.1, top = Math.min(m.H * 0.62, y + 0.55), lean = Math.tan(0.21), cos = Math.cos(0.21), zIn = a.track / 2 - t.W / 2;
  const ySeat = Math.min(t.D + 0.015, top - 0.03 - 0.16 * cos), beside = ySeat < t.D + 0.015, zb = Math.min(zIn - 0.03, beside ? zIn - 0.015 - 0.066 + (ySeat - yb) * lean : Infinity);
  return { y, yb, top, lean, zb, zt: zb - (top - yb) * lean, ySeat, zAt: (yy: number) => zb - (yy - yb) * lean };
};
function wheel(name: string, t: Tyre, o: { pattern?: Tread; style: Machine['rims']['style']; spokes?: number; mat: string; lugs: number; lug: number; color?: number; pcd?: number; offset?: number; cover?: number | Cover; accent?: number; lip?: number; cap?: number; brake?: Axle['brake']; knobs?: boolean; dual?: boolean; single?: boolean; /** its hub's bore, m (the radius of what it turns on or is turned by: a drive shaft's splined stub, a spindle); solid where not said */ bore?: number; /** on the car's left, turned half round to face out: what is behind its axle on the right is behind it here too */ left?: boolean; knuckle?: boolean; /** the rigid link its axle is (a twist beam's), which its anchor plate and caliper are one with */ axle?: string }): Part {
  const R = t.D / 2, parts: Part[] = [], wr = t.W * 0.45, rr = t.rim / 2, metal = o.mat;
  const tyre = (dz: number, nm: string): Part => {
    const prof = tyreSection(t);
    const knobs: Part[] = [];
    if (o.knobs) { const n = Math.round((2 * PI * R) / 0.05); for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const a = ((i + (s > 0 ? 0.5 : 0)) / n) * 2 * PI; knobs.push(P('knob', { box: [0.014, 0.024, t.W * 0.34] }, [(R + 0.005) * Math.cos(a), (R + 0.005) * Math.sin(a), s * t.W * 0.22], { rot: [0, 0, a], mat: 'rubber', color: 0x141414, finish: 'tread', one: true })); } }
    // (the tyre as it is made (tyreBuilt): its casing's layers, beads and liner, its tread's pitches of blocks; shared by
    // every wheel that takes it, fitted as it comes)
    void prof; void knobs;
    return partOf(tyreBuilt(t, { pattern: o.pattern ?? (o.knobs ? 'knobby' : t.rim >= 0.49 ? 'rib' : 'all-season') }).tyre, [0, 0, dz], [PI / 2, 0, 0], { name: nm, fixed: 'its beads seated on its rim, held there by its pressure', says: t.says, sealed: 'built whole as it is made (tyreBuilt), fitted as it comes' });
  };
  const gap = o.dual ? t.W + 0.03 : 0;
  if (o.dual) { parts.push(tyre(gap / 2, `outer tyre ${t.code}`), tyre(-gap / 2, `inner tyre ${t.code}`)); } else parts.push(tyre(0, `tyre ${t.code}`));
  const rimProf: [number, number][] = [[rr + 0.012, -wr], [rr, -wr + 0.008], [rr, -wr * 0.55], [rr - 0.014, -wr * 0.35], [rr - 0.014, wr * 0.35], [rr, wr * 0.55], [rr, wr - 0.008], [rr + 0.012, wr]];
  const face: Part[] = [], hubR = Math.max(0.03, rr * 0.28), pcd = pcdOf(o.lugs, rr, o.pcd) / 2;
  // an alloy wheel's face, cast with its barrel: a centre pad round its bore that the nuts clamp (out past their circle
  // by a nut's width), and its spokes from the pad out to the barrel, each wider toward the rim (the share of the circle
  // each covers, more for few spokes than for many) and rising from the pad to just under the rim's outer lip, so the face
  // is dished as a wheel's is and its spokes meet its lip, not a flat star sunk inside its barrel (typical)
  // (its mounting face where its corner puts it, its centre pad 30 mm proud of it)
  const cn = cornerOf(t, { ...o, plate: !o.knuckle && !!o.bore }, o.knuckle), zMount = cn.zMount, zc = zMount + 0.03, rb = Math.max(0.012, Math.min(0.03, pcd - 0.022)), rp = Math.min(rr * 0.55, pcd + Math.max(0.016, o.lug * 0.0016)), zr = wr - 0.012;
  if (o.style === 'spokes' || o.style === 'split') {
    // (its spokes run into the barrel, cast with it: their ends 1 mm into its wall, not short of it)
    const n = o.spokes ?? 5, share = n <= 6 ? 0.42 : n <= 10 ? 0.34 : 0.26, half = (r: number) => (Math.PI * r * share) / n, deep = Math.max(0.012, rr * 0.1), r1 = rr + 0.001;
    face.push(P('centre pad', { lathe: [[rb, zc - 0.03], [rb, zc], [rp - 0.006, zc - 0.002], [rp, zc - 0.012], [rp, zc - 0.03]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: metal, color: o.color ?? 0xc8ccd2, finish: 'brushed', passes: Array.from({ length: o.lugs }, (_, i) => [`wheel nut ${i + 1}`, `wheel stud ${i + 1}`]).flat() }));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI, st = [0, 0.5, 1].map((f) => { const r = rp - 0.006 + (r1 - rp + 0.006) * f, top = zc - 0.002 + (zr - zc + 0.002) * f - (f > 0 && f < 1 ? 0.006 : 0); return { x: r, w: half(r), lo: top - deep * (1 - 0.3 * f), hi: top, n: 3 }; });
      // (a two-tone wheel's accent: a band of paint down the middle of each spoke's face, a third of its width at the hub)
      face.push(P(`spoke ${i + 1}`, { loft: { st } }, [0, 0, 0], { rot: [PI / 2, a, 0], mat: metal, color: o.color ?? 0xc8ccd2, finish: (o.lip ?? o.accent) === undefined ? 'brushed' : 'paint', ...(o.accent !== undefined ? { look: { auto: false, graphics: [{ kind: 'stripe' as const, axis: 'z' as const, at: 0, width: half(rp) * 0.7, colour: o.accent }] } } : {}) }));
    }
    face.push(P('centre cap', { lathe: [[0, zc + 0.004], [rb * 0.7, zc + 0.003], [rb - 0.001, zc - 0.002], [rb - 0.001, zc - 0.012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'abs', color: o.cap ?? darken(o.color ?? 0xc8ccd2, 0.82), finish: 'paint', fixed: 'clipped into the bore', says: 'its centre cap, clipped into the bore (typical; its maker\'s emblem on it not drawn)' }));
  }
  // a steel wheel: its disc pressed and welded into its barrel, its stud holes on its pad, painted; where it wears a full
  // cover (a moulded disc snapped over its outer flange, spoked as its maker styled it), the cover over the nuts
  else if (o.style === 'steel' || o.style === 'disc') {
    // (its pad flat round the studs, then pressed out 9 mm over the caliper, and its flange turned in along the barrel's
    // outer bead seat, where it is welded: so the brake behind it has room, as a steel wheel's dish gives it)
    // (a pressing 4 mm thick, typical: its back face the mounting face, clamped on the disc's hat or the hub's flange, its
    // front face where the nuts seat; drawn as the closed section it is)
    const zE = Math.min(wr - 0.025, zMount + 0.02), tk = 0.004, dsk: [number, number][] = [[rb, zMount], [rp + 0.01, zMount], [rp + 0.03, zMount + 0.011], [rr * 0.8, zMount + 0.011], [rr, zE - 0.004], [rr, Math.max(zE - 0.015, wr * 0.55 + 0.001)]];
    // (its flange pressed into the barrel where the barrel is at its full radius, outboard of the well, and welded there)
    face.push(P('wheel disc', { lathe: [...dsk, ...dsk.slice().reverse().map(([r2, z2], i, a) => [i === 0 ? r2 - tk : i === a.length - 1 ? r2 : r2 - tk * 0.5, z2 + tk] as [number, number]), [rb, zMount]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: metal, color: o.color ?? 0x3a3a3a, fill: 1, finish: 'paint', fixed: 'pressed, and welded into its barrel round its edge inside the well', passes: ['tyre valve', ...Array.from({ length: o.lugs }, (_, i) => `wheel stud ${i + 1}`)] }));
    if (o.cover) {
      // (its spokes: in pairs, each pair's two a narrow slot apart, or evenly round it; each swept round as it goes out, so
      // the windows between them are teardrops, not wedges; widening toward the rim)
      const cv: Cover = typeof o.cover === 'number' ? { spokes: o.cover } : o.cover, n = Math.max(3, cv.spokes), cz = zMount + 0.034, ce = wr - 0.004, r1 = rr - 0.022, cc = 0xc4c8cc, cvm: Partial<Part> = { mat: 'abs', color: cc, finish: 'paint' };
      // (each spoke as wide, as a share of the pitch between spokes, as its maker made it: at the hub and at the rim)
      const pairs = !!cv.pairs && n % 2 === 0, spread = ((cv.pairs ?? 0) * Math.PI) / 180, sweep = ((cv.sweep ?? 0) * Math.PI) / 180, [wh, wrim] = cv.width ?? [0.36, 0.36];
      const angleOf = (i: number) => (i / n) * 2 * PI, side = (i: number) => (pairs ? (i % 2 ? 1 : -1) : 0), half = (r: number, f: number) => ((Math.PI * r) / n) * (wh + (wrim - wh) * f);
      const named = typeof o.cover === 'number' ? `${n} spokes (typical of the style; its maker gives the wheel)` : cv.says ?? `${n} spokes${pairs ? ' in pairs' : ''}`;
      face.push(P('wheel cover', undefined, [0, 0, 0], { mat: 'abs', color: cc, fixed: 'snapped over the rim\'s outer flange', says: `its full wheel cover: moulded ABS, ${named}`, parts: [
        // (its rim out over the barrel's flange, 2 mm clear of it all round, its lip past the flange's edge)
        P('cover rim', { lathe: [[r1 - 0.004, ce - 0.006], [rr + 0.014, wr + 0.006], [rr + 0.014, wr + 0.003], [rr - 0.004, wr - 0.006], [r1 - 0.004, ce - 0.012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], ...cvm, passes: ['tyre valve'] }),
        P('cover hub', { lathe: [[0, cz + 0.008], [rp * 0.6, cz + 0.006], [rp + 0.006, cz], [rp + 0.006, cz - 0.012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], ...cvm }),
        // (its maker's emblem, a chrome oval on the dome, standing on it at its edge: its design not drawn)
        ...(cv.emblem ? [P('cover emblem', { lathe: [[0, cz + 0.011], [0.024, cz + 0.0085], [0.027, cz + 0.008 - (0.002 * 0.027) / (rp * 0.6)]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'abs', color: 0xd8dce0, finish: 'chrome', says: 'its maker\'s emblem, a chrome oval on its domed centre (its design not drawn)' })] : []),
        // (each from inside the hub's edge out into the rim's ring, both of its one moulding)
        ...Array.from({ length: n }, (_, i) => { const a = angleOf(i), st = [0, 0.25, 0.5, 0.75, 1].map((f) => { const r = rp + (r1 + 0.006 - rp) * f, top = cz + (ce - 0.006 - cz) * f - (f > 0 && f < 1 ? 0.004 : 0); return { x: r, w: half(r, f), lo: top - 0.008, hi: top, n: 4, z: r * Math.sin(sweep * f ** 1.4 + side(i) * spread * f) }; }); return P(`cover spoke ${i + 1}`, { loft: { st } }, [0, 0, 0], { rot: [PI / 2, a, 0], ...cvm }); })] }));
    }
  }
  else if (o.style === 'wire') { const n = o.spokes ?? 32; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI, s = i % 2 ? 1 : -1, a2 = a + (s * 3 * 2 * PI) / n; face.push(tube(`spoke ${i + 1}`, 0.0018, [[hubR * 0.9 * Math.cos(a), hubR * 0.9 * Math.sin(a), s * wr * 0.5], [(rr - 0.01) * Math.cos(a2), (rr - 0.01) * Math.sin(a2), 0]], 'steel-low', 0xb8bcc2, { finish: 'chrome', item: 'spoke', fixed: 'laced: its head hooked through a hole in its hub\'s flange, its nipple threaded into the rim (the holes and nipples not drawn)' })); } }
  if (!o.knobs && rr > 0.12) { const n = o.spokes ?? 5, a = PI / n, tilt = 0.5; face.push(P('tyre valve', { cyl: [0.0055, 0.033] }, [Math.cos(a) * (rr - 0.0015 - 0.016 * Math.sin(tilt)), Math.sin(a) * (rr - 0.0015 - 0.016 * Math.sin(tilt)), wr * 0.62 + 0.016 * Math.cos(tilt)], { rot: [PI / 2 - tilt * Math.sin(a), 0, -tilt * Math.cos(a)], mat: 'rubber', color: 0x161616, fixed: 'snapped through the rim', says: 'its valve (a TR413 snap-in, typical)' })); }
  // (its face is the rim's own: an alloy wheel's spokes are cast with its barrel, a steel wheel's disc welded into it, a
  // wire wheel's spokes laced into it; each taken into the rim's frame, turned a quarter about x as the rim is, so what
  // stands out at +z in the wheel stands out at +z still, on its outer face)
  const ownFace = (f: Part): Part => ({ ...f, at: [f.at![0], f.at![2], -f.at![1]] as V3, rot: f.rot ? [f.rot[0] - PI / 2, f.rot[1], f.rot[2]] as V3 : [-PI / 2, 0, 0] });
  parts.push(P(`${Math.round(t.rim / IN)} in ${o.style === 'steel' ? 'steel' : o.style === 'wire' ? 'spoked' : 'alloy'} rim`, { lathe: rimProf }, [0, 0, 0], { rot: [PI / 2, 0, 0], passes: ['tyre valve', ...(o.style === 'wire' ? Array.from({ length: o.spokes ?? 32 }, (_, k) => `spoke ${k + 1}`) : [])], mat: metal, color: o.color ?? (o.style === 'steel' ? 0x3a3a3a : 0xc8ccd2), shell: metal.startsWith('al') ? (o.style === 'wire' ? 0.003 : 0.008) : 0.004, finish: o.style === 'steel' || (o.lip ?? o.accent) !== undefined ? 'paint' : 'brushed', ...((o.lip ?? o.accent) !== undefined ? { look: { auto: false, graphics: [{ kind: 'stripe' as const, axis: 'y' as const, at: Math.max(...rimProf.map((q) => q[1])) - 0.004, width: 0.006, colour: (o.lip ?? o.accent)! }] } } : {}), parts: face.map(ownFace) }));
  const shaftD = o.single ? 0.022 : Math.max(0.03, t.rim * 0.12), studs: Iface[] = o.lugs ? [{ kind: 'studs', role: 'provides', d: o.lug / 1000, n: o.lugs }] : [];
  // (the hub's face where the wheel is clamped on, behind the wheel's own centre: it does not stand through it)
  // (and behind the brake disc's hat, which is clamped between them, where it has a disc)
  // (a flange the wheel is clamped to, and behind it the barrel it turns on, in its knuckle's bearing where it has one)
  const hubFace = cn.hubFace, hubR2 = cn.hubR, rb2 = Math.max(0.012, hubR2 * 0.45), flangeT = 0.01;
  // (its spigot through the disc's hat and the wheel's centre bore, as a hub-centric wheel is centred on it; its bore
  // the size of what turns it, its nut on its spigot's face)
  // (a hub turning on a fixed spindle turns on its bearing: a sealed ring 12 mm deep round the spindle, its outer race in
  // the hub's bore, its inner race on the spindle and clamped by the nut, which meets nothing that turns)
  // (on a fixed spindle, as a twist beam's: a sealed hub-bearing unit, its bearing in the hub's barrel behind the flange, its
  // inner part the spindle, bolted to the carrier; the hub closed in front of it, with no nut, as a sealed unit is)
  const race = o.axle && o.bore ? 0.012 : 0, rSp = Math.min(rb, rb2) - 0.001, bore = (o.bore ?? 0) + race, zSp = o.bore ? cn.zSpig : hubFace, zB = hubFace - flangeT - 0.006;
  if (race) parts.push(P('wheel bearing', { lathe: [[o.bore!, cn.hubIn], [bore, cn.hubIn], [bore, zB], [o.bore!, zB], [o.bore!, cn.hubIn]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x8a8e92, finish: 'plate', link: o.axle, joint: 'bearing', passes: ['stub spindle right', 'stub spindle left'], fixed: 'pressed into the hub, its inner race on the spindle', item: 'bearing hub unit', says: 'its wheel bearing: a sealed double-row ball bearing in the hub\'s barrel (typical of a hub-bearing unit)' }));
  if (o.bore && !race) parts.push(P('axle nut', { cyl: [(o.bore * 2 * 1.25) / Math.sqrt(3), 0.014] }, [0, 0, zSp + 0.007], { rot: [PI / 2, 0, 0], facets: 6, mat: 'steel-alloy', color: 0x9a9ea4, finish: 'plate', passes: ['outer joint stub', 'stub spindle right', 'stub spindle left'], ...(o.axle ? { link: o.axle } : {}), fixed: 'run on its stub against the spigot\'s face, and staked', says: `its axle nut, M${Math.round(o.bore * 2000)} × 1.5, staked (typical)` }));
  parts.push(P('hub', { lathe: race ? [[0, zSp], [rSp, zSp], [rSp, hubFace], [hubR2, hubFace], [hubR2, hubFace - flangeT], [cn.rB, hubFace - flangeT - 0.004], [cn.rB, cn.hubIn], [bore, cn.hubIn], [bore, zB], [0, zB], [0, zSp]] : o.bore ? [[bore, zSp], [rSp, zSp], [rSp, hubFace], [hubR2, hubFace], [hubR2, hubFace - flangeT], [cn.rB, hubFace - flangeT - 0.004], [cn.rB, cn.hubIn], [bore, cn.hubIn], [bore, zSp]] : [[0, hubFace], [hubR2, hubFace], [hubR2, hubFace - flangeT], [cn.rB, hubFace - flangeT - 0.004], [cn.rB, cn.hubIn], [0, cn.hubIn]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x6a6a6a, finish: 'cast', passes: ['outer joint stub', 'stub spindle right', 'stub spindle left', 'front axle', 'rear axle', ...Array.from({ length: o.lugs }, (_, i) => `wheel stud ${i + 1}`)], iface: [{ kind: 'shaft', role: 'requires', d: shaftD, says: 'its bore, for the axle' }, ...studs] }));
  // (a wire wheel's spoke flanges, one each side at a quarter of the tyre's width, from the hub's barrel out past where its
  // spokes' heads hook through them)
  if (cn.wire) for (const e of [-1, 1]) parts.push(P('spoke flange', { lathe: [[cn.rB, e * cn.zF - 0.002], [cn.hubR * 0.95, e * cn.zF - 0.002], [cn.hubR * 0.95, e * cn.zF + 0.002], [cn.rB, e * cn.zF + 0.002], [cn.rB, e * cn.zF - 0.002]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'al-a380', color: 0x9a9ea4, finish: 'cast', passes: Array.from({ length: o.spokes ?? 32 }, (_, k) => `spoke ${k + 1}`), fixed: 'cast with its hub', says: 'a spoke flange of its hub, its spokes\' heads hooked through it (typical)' }));
  // its nuts on the wheel's face (a lug nut: 1.75 d across its flats, 1.6 d tall, as Toyota's M12 × 1.5 are 21 mm
  // across and about 19 mm tall, typical), each on a stud pressed through the hub's flange, out through the disc's hat
  // and the wheel, its tip 3 mm past its nut
  // (on an alloy wheel's pad, its nut's 60° cone in the coned seat of its stud hole, the seat said, not drawn: the cone's
  // foot as far under the pad's face there as the cone is high)
  const padAt = (r: number) => (r <= rb ? zc : zc - (0.002 * (r - rb)) / Math.max(1e-6, rp - 0.006 - rb));
  const thread = Object.keys(WHEEL).find((k) => WHEEL[k]!.d === o.lug) ?? `M${o.lug}x1.5`, nutH = (WHEEL[thread]?.h ?? o.lug * 1.6) / 1000, padT = o.style === 'steel' || o.style === 'disc' ? 0.004 : 0, nutZ = o.style === 'spokes' || o.style === 'split' ? padAt(pcd) - 0.25 * nutH : o.style === 'steel' || o.style === 'disc' ? zMount + padT : t.W * 0.25 - 0.001;
  const rimName = `${Math.round(t.rim / IN)} in ${o.style === 'steel' ? 'steel' : o.style === 'wire' ? 'spoked' : 'alloy'} rim`;
  for (let i = 0; i < o.lugs; i++) {
    const a = (i / o.lugs) * 2 * PI + PI / 2, z0 = hubFace - flangeT, z1 = nutZ + nutH + 0.003;
    // (each the library's: its nut on its cone seat against the wheel, its stud's head behind the hub's flange, its knurl
    // through the flange, its thread out through the disc's hat and the wheel, 3 mm past its nut)
    const xy = [Math.cos(a) * pcd, Math.sin(a) * pcd] as const;
    parts.push(use(`wheelnut ${thread}`, [xy[0], xy[1], nutZ], { rot: [PI / 2, 0, 0], name: `wheel nut ${i + 1}`, fixed: 'run onto its stud against the wheel and torqued', joins: ['wheel disc', 'centre pad', rimName], passes: [`wheel stud ${i + 1}`] }));
    // (its length the next of its family's standard lengths, every 5 mm from 35, that reaches 3 mm past its nut)
    parts.push(use(`wheelstud ${thread} L${Math.max(35, Math.ceil(((z1 - z0) * 1000) / 5) * 5)}`, [xy[0], xy[1], z0], { rot: [-PI / 2, 0, 0], name: `wheel stud ${i + 1}`, fixed: 'pressed into the hub\'s flange, knurled under its head' }));
  }
  if (o.brake?.kind === 'disc') {
    const { r, th, zD, rh, sideIn, sideOut } = cn;
    // a disc as it is cast: its friction ring, and its hat standing out from the ring's inner edge to its mounting face,
    // clamped between the hub and the wheel (6 mm, typical), the hub inside the hat; its caliper astride the ring's edge
    // behind the axle (as a front-drive car's are, clear of its drive shaft ahead), mirrored side for side: a sliding
    // caliper of cast iron, its piston half inboard and its finger half outboard, a bridge over the ring between them,
    // as long round the ring as 1.1 times its radius (a 275 mm disc's about 150 mm, typical of one piston)
    const yM = zMount - zD, hatT = 0.006;
    // (a wire wheel's a flat rotor, bolted to its hub's inner end)
    parts.push(P(`${o.brake.vented ? 'vented ' : ''}brake disc ${Math.round(o.brake.d * 1000)} mm`, { lathe: cn.wire ? [[rb2, th / 2], [r, th / 2], [r, -th / 2], [rb2, -th / 2], [rb2, th / 2]] : [[rb2, yM], [rh + 0.004, yM], [rh + 0.004, th / 2], [r, th / 2], [r, -th / 2], [rh, -th / 2], [rh, yM - hatT], [rb2, yM - hatT], [rb2, yM]] }, [0, 0, zD], { rot: [PI / 2, 0, 0], mat: 'cast-iron', color: 0x7a7a7a, fill: o.brake.vented ? 0.6 : 1, finish: 'cast', item: o.brake.d < 0.25 ? 'brake-disc' : undefined, fixed: 'clamped between its hub and the wheel by the wheel\'s nuts', passes: Array.from({ length: o.lugs }, (_, i) => `wheel stud ${i + 1}`) }));
    // (a small disc's, as a quad's or a kart's, of aluminium, typical)
    const { cw, ch, rc, ca0, legW } = cn, ca = o.left ? PI - ca0 : ca0, cc = 0x34373a, cm = r < 0.125 ? 'al-a380' : 'cast-iron';
    const at2 = (rad: number): V3 => [Math.cos(ca) * rad, Math.sin(ca) * rad, 0];
    // (its carrier: two legs just past the caliper's ends, each from the knuckle's ear (its face at armOut) to over the
    // ring's edge, the caliper sliding on a guide pin in each (the pins not drawn); bolted to the ears, it does not turn)
    // (laid out in the caliper's own frame, turned to its angle: radially out along x, round the ring along y, so each leg
    // stands flush against the caliper's end)
    const inCal = (x: number, y2: number, z: number): V3 => [Math.cos(ca) * x - Math.sin(ca) * y2, Math.sin(ca) * x + Math.cos(ca) * y2, z];
    const onPlate = !o.knuckle && !!o.bore, carrier: Part[] = o.knuckle || onPlate ? [-1, 1].flatMap((e) => {
      const yL = e * (ch / 2 + legW / 2), zIn = cn.zA + cn.armT / 2 - zD, zRing = -(th / 2 + 0.0015), zOut = th / 2 + 0.0015 + sideOut, r0 = rc - cw / 2, r1 = r + 0.016;
      return [P('carrier leg', { box: [r1 - r0, legW, zRing - zIn] }, inCal((r0 + r1) / 2, yL, (zIn + zRing) / 2), { rot: [0, 0, ca], mat: 'cast-iron', color: 0x2e3032, finish: 'cast', cuts: [{ r: 0.0048, depth: zRing - zIn + 0.002, at: [rc - cw * 0.1 - (r0 + r1) / 2, e * (0.006 - legW / 2), (zRing - zIn) / 2 + 0.001], dir: [0, 0, -1] }], says: 'its guide pin slides in a bore through it', fixed: onPlate ? 'bolted through the dust shield to its axle carrier' : 'bolted to its caliper ear on the knuckle' }),
        P('carrier bridge', { box: [r1 - r - 0.004, legW, zOut - zRing] }, inCal((r + 0.004 + r1) / 2, yL, (zRing + zOut) / 2), { rot: [0, 0, ca], mat: 'cast-iron', color: 0x2e3032, finish: 'cast' })];
    }) : [];
    // (a wheel on a spindle with no knuckle, a beam's: its anchor plate, the spindle through its bore, its two ears the
    // caliper's carrier is bolted to, welded to the end of its arm; with the axle, not turning)
    // (its axle carrier: a forged flange 150 by 130 mm on the end of its arm, its spindle's flange bolted to its face through
    // the dust shield, the caliper's carrier on its ears through the shield; the shield a 1.2 mm pressing as wide as the disc)
    const spins = ['stub spindle right', 'stub spindle left'], axle = o.axle ?? '';
    if (onPlate) parts.push(P('axle carrier', { box: [0.15, 0.13, cn.armT - 0.0012] }, [0, 0, cn.zA - 0.0006], { mat: 'steel-alloy', color: 0x2e3032, finish: 'paint', link: axle, passes: spins, fixed: 'forged, welded to the end of its trailing arm', says: 'its axle carrier: a forged flange on the end of its trailing arm, its spindle\'s flange bolted to it through the dust shield (typical of a twist-beam axle)' }),
      P('brake dust shield', { lathe: [[o.bore! + 0.004, cn.zA + cn.armT / 2 - 0.0012], [r, cn.zA + cn.armT / 2 - 0.0012], [r, cn.zA + cn.armT / 2], [o.bore! + 0.004, cn.zA + cn.armT / 2], [o.bore! + 0.004, cn.zA + cn.armT / 2 - 0.0012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x2e3032, finish: 'paint', link: axle, passes: spins, fixed: 'clamped between its axle carrier and its spindle\'s flange', says: 'its brake\'s dust shield: a 1.2 mm pressing as wide as the disc (typical)' }));
    // (the caliper as it is made, in the room its halves take: its body cast in one (piston half, finger half, bridge),
    // its piston in a bore in the piston half with its seal and dust boot, a pad each side of the disc (a steel backing
    // plate, its friction material bonded on), on two guide pins in their boots, a bleed screw; a small one's return
    // spring and two bolts. The pads take the inner part of each half's room (typical proportions, so the caliper's
    // outline is what it was))
    const padIn = Math.min(0.012, sideIn * 0.45), padOut = Math.min(0.008, sideOut * 0.6), bodyIn = sideIn - padIn, bodyOut = sideOut - padOut, pr = Math.min(ch * 0.32, cw * 0.4), rp = r - cw * 0.425 - 0.001, fixedC = 'cast as one with its other half and bridge, sliding on its two guide pins in its carrier';
    const zIn0 = -(th / 2 + 0.0015), zOut0 = th / 2 + 0.0015, rot: V3 = [0, 0, ca], cast = { mat: cm, color: cc, finish: 'cast' };
    const pad = (z: number, t: number, side: string): Part => P(`brake pad (${side})`, undefined, [0, 0, 0], { item: 'disc-brake-pad', parts: [
      P('pad backing plate', { box: [cw * 0.9, ch * 0.85, Math.min(0.005, t * 0.4)] }, [...at2(rp).slice(0, 2), z + Math.sign(z) * (t - Math.min(0.005, t * 0.4) / 2)] as V3, { rot, mat: 'steel-low', color: 0x3a3a3a, item: 'pad-backing' }),
      P('pad friction', { box: [cw * 0.85, ch * 0.8, t - Math.min(0.005, t * 0.4)] }, [...at2(rp).slice(0, 2), z + Math.sign(z) * (t - Math.min(0.005, t * 0.4)) / 2] as V3, { rot, mat: 'friction-composite', color: 0x5a5048, finish: 'texture', item: 'pad-friction', says: 'friction material: resin-bonded fibres and metal particles (typical)' })] });
    const small = o.brake.d < 0.25;
    parts.push(P('brake caliper', undefined, [0, 0, zD], { item: small ? 'brake-caliper-disc' : 'brake-caliper', ...(o.knuckle ? { link: name.replace(/ wheel$/, ' upright') } : { link: o.axle ?? '' }), says: `a sliding caliper of ${cm === 'cast-iron' ? 'cast iron' : 'aluminium'}, one piston (typical)${o.knuckle ? ', on its carrier, bolted to two ears of the knuckle' : ''}`, parts: [
      ...(carrier.length ? [P('caliper carrier', undefined, [0, 0, 0], { mat: 'cast-iron', color: 0x2e3032, finish: 'cast', item: 'caliper-carrier', says: 'its carrier (bracket): cast iron, bolted to the knuckle\'s two ears, the caliper sliding on its two guide pins (typical)', parts: carrier })] : []),
      P('caliper body', undefined, [0, 0, 0], { item: 'caliper-body', mat: cm, parts: [
        P('caliper piston half', { box: [cw, ch, bodyIn] }, [...at2(rc).slice(0, 2), zIn0 - padIn - bodyIn / 2] as V3, { rot, ...cast, one: true, fixed: fixedC, cuts: [{ r: pr, depth: bodyIn * 0.8, at: [rp - rc, 0, bodyIn / 2], dir: [0, 0, -1] }] }),
        P('caliper finger half', { box: [cw * 0.8, ch * 0.9, bodyOut] }, [...at2(rc + cw * 0.1).slice(0, 2), zOut0 + padOut + bodyOut / 2] as V3, { rot, ...cast, one: true, fixed: fixedC }),
        P('caliper bridge', { box: [0.016, ch * 0.7, th + 0.003 + sideIn + sideOut] }, [...at2(r + 0.0015 + 0.008).slice(0, 2), (sideOut - sideIn) / 2] as V3, { rot, ...cast, one: true, fixed: fixedC })] }),
      P('caliper piston', { cyl: [pr - 0.0005, bodyIn * 0.75] }, [...at2(rp).slice(0, 2), zIn0 - padIn - bodyIn * 0.375] as V3, { rot: [PI / 2, 0, 0], mat: 'steel-chrome', color: 0xc8ccd2, finish: 'plate', item: 'caliper-piston' }),
      P('piston seal', { torus: [pr - 0.0005, 0.0012] }, [...at2(rp).slice(0, 2), zIn0 - padIn - bodyIn * 0.6] as V3, { rot: [0, 0, 0], mat: 'epdm', color: 0x1a1a1a, item: 'piston-seal-brake' }),
      P('dust boot', { torus: [pr, 0.002] }, [...at2(rp).slice(0, 2), zIn0 - padIn - 0.001] as V3, { mat: 'epdm', color: 0x1a1a1a, item: 'dust-boot' }),
      pad(zIn0, padIn, 'inner'), pad(zOut0, padOut, 'outer'),
      ...[-1, 1].map((e2) => P('guide pin', { cyl: [0.0045, sideIn + 0.01] }, [Math.cos(ca) * (rc - cw * 0.1) - e2 * Math.sin(ca) * (ch / 2 + 0.006), Math.sin(ca) * (rc - cw * 0.1) + e2 * Math.cos(ca) * (ch / 2 + 0.006), zIn0 - 0.0005 - (sideIn + 0.01) / 2] as V3, { rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x8a8c90, item: 'guide-pin' })),
      P('bleed screw', { cyl: [0.003, 0.018] }, [...at2(rc + cw / 2).slice(0, 2), zIn0 - padIn - bodyIn / 2] as V3, { rot: [0, 0, ca - PI / 2], mat: 'steel-low', color: 0x8a8c90, item: 'bleed-screw' }),
      ...(small ? [{ ...coiled({ name: 'return spring', d: 0.0008, D: 0.006, L: 0.012, n: 4, item: 'spring-compression' }), at: [...at2(rc).slice(0, 2), zIn0 - sideIn - 0.004] as V3 }, ...[-1, 1].map((e2) => use('bolt M6x20', [Math.cos(ca) * rc - e2 * Math.sin(ca) * ch * 0.3, Math.sin(ca) * rc + e2 * Math.cos(ca) * ch * 0.3, zIn0 - sideIn], { rot: [-PI / 2, 0, 0], name: 'caliper bolt' }))] : [])] }));
  } else if (o.brake?.kind === 'drum') parts.push(P(`brake drum ${Math.round(o.brake.d * 1000)} mm`, { cyl: [Math.min(o.brake.d / 2, rr - 0.015), cn.drumL] }, [0, 0, -wr * 0.3], { rot: [PI / 2, 0, 0], mat: 'cast-iron', color: 0x4a4a4a, shell: 0.008, finish: 'cast' }));
  // (all of it turns as one on its bearing, its caliper apart: the wheel's link)
  return P(name, undefined, [0, 0, 0], { parts, link: name });
}

// ---- panels: a body of skins over the machine, by its lines (src/nexus/panels.ts) ----------------------------------------
/** How far a wheel steers and rises, by how its axle hangs (typical of each: a car's front wheels about 35° at full lock,
 *  a strut's bump travel about 80 mm, a beam's 90, a wishbone's or a leaf's 100, a swingarm's 120, a rigid axle's none). */
const BUMP: Record<string, number> = { strut: 0.08, beam: 0.09, wishbone: 0.1, leaf: 0.1, air: 0.1, swingarm: 0.12, pivot: 0.05, rigid: 0 };
export const travelOf = (a: Axle): { steer: number; bump: number } => ({ steer: a.steer ? 0.61 : 0, bump: BUMP[a.susp ?? 'rigid'] ?? 0 });
/** Where the power sits: as given, or as low as its sump allows (about 60 mm over the machine's lowest point, typical). */
/** An electric car's battery pack: under its floor between its wheels (clear of each tyre by 120 mm), as wide as the room
 *  between their inner faces less 20 mm a side, 110 mm deep on its own clearance (typical of a skateboard pack); the floor
 *  laid on it. */
function packOf(m: Machine): { x0: number; x1: number; z: number; y0: number; h: number } | null {
  if (m.kind !== 'car' || m.frame !== 'shell' || m.power.kind !== 'electric') return null;
  const fa = m.axles[0]!, ra = m.axles[m.axles.length - 1]!, ft = tyreOf(fa.tyre)!, rt = tyreOf(ra.tyre)!, inner = Math.min(fa.track / 2 - ft.W / 2, ra.track / 2 - rt.W / 2) - 0.04;
  // (and ahead of a twist beam's arms, which reach 450 mm forward of the axle to their pivots)
  // (and ahead of a rigid axle's leaves, whose floor stands over them)
  const lf = leafOf(ra);
  return { x0: Math.max(ra.x + rt.D / 2 + 0.12, ra.susp === 'beam' ? ra.x + 0.45 + 0.04 : -Infinity, lf ? lf.x1 + 0.04 : -Infinity), x1: fa.x - ft.D / 2 - 0.12, z: inner - 0.02, y0: m.clearance + 0.01, h: 0.11 };
}
/** The top of a car's cabin floor over x: on its battery pack where it has one, else on its pan; the rear seat's on its
 *  raised floor over the tank. */
const floorTop = (m: Machine, x: number): number => { const fl = floorOf(m), pk = packOf(m), ov = overAxle(m), base = fl && x < fl.kick ? fl.top : pk ? pk.y0 + pk.h + 0.08 : m.clearance + 0.1; const bf = ov && pk && x - 0.45 < pk.x0 ? beamFloor(m, ov.x1) : null; return ov && x - 0.45 < ov.x1 && x + 0.25 > ov.x0 ? Math.max(base, ov.top) : bf ? Math.max(base, bf) : base; };
// (the same, where a local name hides it)
const floorTopAt = floorTop;
/** The floor's top over a twist beam's trailing arms ahead of the axle, from x forward (their tube's top there, falling
 *  from the wheel's centre to their pivots 450 mm ahead; 30 mm over it, and the floor's own 80 mm). */
const beamFloor = (m: Machine, x: number): number | null => { const ra = m.axles[m.axles.length - 1]!, R = tyreOf(ra.tyre)!.D / 2; return ra.susp === 'beam' ? R + (m.clearance + 0.1 - R) * Math.min(1, Math.max(0, (x - ra.x) / 0.45)) + 0.025 + 0.03 + 0.08 : null; };
/** A car's floor over a rigid rear axle on leaves (a van's, a pickup's): over the leaves' whole length, as high as their
 *  top risen through the axle's bump with 30 mm to spare and the floor's own 30 mm, whatever is ahead of it (a fuel
 *  tank's raised floor, or a battery pack's). */
const overAxle = (m: Machine): { x0: number; x1: number; top: number } | null => {
  if (m.kind !== 'car' || m.frame !== 'shell') return null; const ra = m.axles[m.axles.length - 1]!, lf = leafOf(ra);
  if (lf) return { x0: lf.x0 - 0.05, x1: lf.x1 + 0.05, top: lf.top + travelOf(ra).bump + 0.06 };
  // (and over an electric car's motor at its rear axle, 130 mm round its shaft: the floor stepped up over it, 30 mm clear
  // and its own 30 mm, as the rear seat of a rear-motored electric car sits)
  const p = m.power; if (p.kind === 'electric' && Math.abs(p.x - ra.x) < 0.3) return { x0: p.x - 0.18, x1: p.x + 0.18, top: (p.y ?? 0.4) + 0.13 + 0.06 };
  // (and over an electric car's twist beam, where no fuel tank's raised floor is: from behind its axle (its springs and
  // dampers) to past its beam, 150 mm ahead; over the beam (its middle no higher than the wheel's, 32 mm round) risen
  // through its bump there, 60 % of the wheel's as it is 60 % of the way from the pivots, 30 mm clear and the floor's 30)
  if (p.kind === 'electric' && ra.susp === 'beam') { const R = tyreOf(ra.tyre)!.D / 2; return { x0: ra.x - 0.18, x1: ra.x + 0.15 + 0.032 + 0.05, top: R + 0.032 + 0.6 * travelOf(ra).bump + 0.06 }; }
  return null;
};
/** A car's raised rear floor over its fuel tank: the kick-up just ahead of its rearmost seat's cushion, back to just
 *  ahead of its rear axle's beam; the tank under it as tall as its 50 L (about) needs over that floor, its width
 *  beside the exhaust on the left (typical of a sedan's). None for a car with no rear seat, an electric one, or one
 *  that is not a unibody. */
function floorOf(m: Machine): { kick: number; x0: number; top: number; tank: { x0: number; x1: number; y0: number; h: number; z0: number; z1: number } } | null {
  if (m.kind !== 'car' || m.frame !== 'shell' || m.power.kind === 'electric' || m.seats.length < 3) return null;
  const xs = m.seats.map((q) => q.x), back = Math.min(...xs); if (Math.max(...xs) - back < 0.4) return null;
  const ra = m.axles[m.axles.length - 1]!, lf = leafOf(ra), kick = back + 0.3, c = m.clearance;
  // (over a rigid axle on leaves, the floor runs back over the leaves' whole length, as high as their top risen through
  // the axle's bump with 30 mm to spare, as a van's or a pickup's load floor is; the tank ahead of their front eyes)
  const x0 = lf ? lf.x0 - 0.05 : ra.x + (ra.susp === 'beam' ? 0.15 + 0.032 + 0.05 : 0.25), tx0 = lf ? lf.x1 + 0.03 : x0;
  const z0 = -Math.min(0.48, ra.track / 2 - 0.3), z1 = -0.06, L = Math.max(0.2, kick - 0.02 - tx0), h = Math.min(0.3, Math.max(0.18, 0.05 / Math.max(0.1, L * (z1 - z0))));
  return { kick, x0, top: Math.max(c + 0.02 + h + 0.005 + 0.03, lf ? lf.top + travelOf(ra).bump + 0.03 + 0.03 : -Infinity), tank: { x0: tx0, x1: Math.max(tx0 + 0.2, kick - 0.02), y0: c + 0.02, h, z0, z1 } };
}
/** A rigid axle's leaf springs: their pack over the axle, clamped to it, 1.4 m long (its main leaf), four leaves of 22 mm
 *  (typical); where they reach fore and aft and how high their top is. */
const leafOf = (a: Axle): { x0: number; x1: number; top: number } | null => { if (a.susp !== 'leaf') return null; const t = tyreOf(a.tyre)!, ar = Math.max(0.03, t.rim * 0.12) / 2; return { x0: a.x - 0.7, x1: a.x + 0.7, top: t.D / 2 + ar + 0.011 + 3 * 0.022 + 0.011 }; };
/** A car's exhaust: down from behind its engine to under its floor's tunnel, back along the middle beside the tank, and
 *  out to the right of the tail behind its rear axle (typical). */
function exhaustPath(m: Machine): V3[] {
  const p = powerAt(m), c = m.clearance, es = engineSize(p, true).s, fa = m.axles[0]!.x, ra = m.axles[m.axles.length - 1]!.x, back = floorOf(m)?.tank.x0 ?? ra + 0.3, xe = across(m) ? p.x - (es[2] * 0.75) / 2 - 0.02 : p.x - es[0] / 2;
  // (across the car its down pipe drops between the block's back and the drive shafts' line, then under them, turned
  // tight there: a pipe's own bend, about 30 mm, typical of a mandrel-bent exhaust)
  // (its middle halfway between the block's back and the shafts' line, less their radii)
  const xd = (xe + 0.02 + fa + 0.014) / 2;
  return across(m) ? [[xd, (p.y ?? 0.4) - 0.12, p.z ?? 0], [xd, c + 0.1, p.z ?? 0], [fa - 0.25, c + 0.06, 0], [back - 0.05, c + 0.05, 0], [ra - 0.2, c + 0.07, 0.3], [-m.L / 2 + 0.22, c + 0.09, 0.32]]
    : [[xe, (p.y ?? 0.4) - 0.12, p.z ?? 0], [Math.min(xe - 0.1, fa - 0.12), c + 0.06, 0], [back - 0.05, c + 0.05, 0], [ra - 0.2, c + 0.07, 0.3], [-m.L / 2 + 0.22, c + 0.09, 0.32]];
}
/** Whether its engine is set across the car: a car whose driven axle is its front one, hung independently, with its
 *  engine ahead of the cabin (typical of front-wheel drive). */
const across = (m: Machine) => m.kind === 'car' && m.power.kind !== 'electric' && m.power.x > 0 && !!m.axles[0]?.drive && (m.axles[0]!.susp === 'strut' || m.axles[0]!.susp === 'wishbone');
/** Where a transverse engine and its gearbox go: ahead of the axle line its drive shafts pass, by the block's depth and
 *  the room for the shafts and the down pipe between them (85 mm); toward the right between the strut towers (or the inner wheelhouses, the nearer), the
 *  gearbox at its left end in what is left, 150 to 330 mm (typical). */
function bayOf(m: Machine, s: V3): { x: number; z: number; gb: [number, number]; inner: number } {
  const a = m.axles[0]!, t = tyreOf(a.tyre)!, tr = travelOf(a), R = t.D / 2, zt = a.susp === 'strut' ? strutOf(a, t, m).zt : (a.track / 2 - t.W / 2 - 0.06) * 0.97, zW = Math.min(a.track / 2 - t.W / 2 - 0.04, a.track / 2 - (t.W / 2) * Math.cos(tr.steer) - (R + 0.03) * Math.sin(tr.steer) - 0.025);
  const inner = Math.min(zt - 0.11, zW) - 0.01, x = Math.max(m.power.x, a.x + (s[2] * 0.75) / 2 + 0.085), z = inner - s[0] / 2, left = z - s[0] / 2, gbw = Math.max(0.15, Math.min(0.33, left + inner));
  return { x, z, gb: [left - gbw, left], inner };
}
const powerAt = (m: Machine): Power => {
  const alu = m.kind !== 'truck' && m.kind !== 'forklift', y = m.power.y ?? m.clearance + 0.06 + engineSize(m.power, alu).s[1] / 2;
  if (!across(m)) return m.power.y !== undefined ? m.power : { ...m.power, y };
  const b = bayOf(m, engineSize(m.power, alu).s); return { ...m.power, y, x: b.x, z: m.power.z ?? b.z };
};
/** A unibody car's bulkhead (typical of a front-engined car): its dash panel, the firewall across the car behind what is
 *  in front of it (its engine, gearbox, steering rack and anti-roll bar, 30 mm clear of the rearmost of them, and at
 *  least 270 mm behind the front axle) and ahead of the dashboard; the toe board sloping down and back from its foot to
 *  the floor's front edge; and the cowl panel from its top back to the windscreen's base, under the hood with 25 mm to
 *  spare; each as wide as the body is inside there, and inside the front wheelhouses' inner walls. Pressed steel, about
 *  0.8 mm. */
function bulkhead(m: Machine, out: Part[], tyres: Tyre[]): Part[] {
  const fa = m.axles[0]!, ft = tyres[0]!, c = m.clearance, R = ft.D / 2, inside = insideOf(out), xWs = m.L / 2 - m.lines!.cowl * m.L;
  const toe = fa.x - R - 0.1, tr = travelOf(fa), zWb = Math.min(fa.track / 2 - ft.W / 2 - 0.04, fa.track / 2 - (ft.W / 2) * Math.cos(tr.steer) - (R + 0.03) * Math.sin(tr.steer) - 0.025) - 0.01;
  // (behind everything ahead of it: the rearmost x of the engine bay's parts as made, near the middle and low enough)
  // (by whole names: "rack" is in "bracket", and a damper's bracket behind the rear axle is not in the engine bay)
  // (and not the subframe, which runs back under the toe board)
  const bayBack = Math.min(fa.x - 0.27, ...out.filter((p) => /^(gearbox|steering rack|anti-roll bar|electric drive unit|electric motor.*)$|\bengine\b(?!.*\bmount)/.test(p.name)).map((p) => backOf(p) - 0.03));
  // (its dash panel 50 mm ahead of the windscreen's foot where the bay ends ahead of that, as a long hood's does; else
  // behind the bay, under the windscreen's foot, the cowl panel reaching forward from it to the foot)
  const x = xWs + 0.05 <= bayBack ? xWs + 0.05 : bayBack, hoods = out.filter((p) => p.name === 'hood' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 40, 20));
  const hoodAt = (xx: number) => { const near = hoods.filter((q) => Math.abs(q[0] - xx) < 0.04 && Math.abs(q[2]) < 0.3); return near.length ? Math.min(...near.map((q) => q[1])) : m.lines!.belt * m.H; };
  const yT = c + 0.35, yC = Math.min(hoodAt(x), hoodAt(xWs + 0.02)) - 0.025 - 0.004, half = (y: number) => Math.max(0.2, Math.min(zWb, Number.isFinite(inside(x, y)) ? inside(x, y) - 0.005 : zWb));
  // (its toe board down to the floor as it is there: an electric car's on its pack, higher than a pan's)
  // (out to the front inner wheelhouses' walls, where the body is wide enough inside there, so the toe board and the dash
  // panel close the bay to them and are welded to them)
  const apZ = Math.min(...out.filter((p) => p.name === 'front inner wheelhouses' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 8, 4)).map((q) => Math.abs(q[2]))), inMin = Math.min(...[yT, (yT + yC) / 2, yC].map((y) => inside(x, y))) - 0.005;
  const w0 = Math.min(half(yT), half((yT + yC) / 2), half(yC)), w = Number.isFinite(apZ) && apZ - 0.0005 > w0 && (!Number.isFinite(inMin) || apZ - 0.0005 <= inMin) ? apZ - 0.0005 : w0, floorTop = Math.max(c + 0.1, packOf(m) ? floorTopAt(m, toe) : -Infinity), steel = { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0008, make: 'pressed' as const, finish: 'paint' as const, fixed: 'spot-welded to what it meets at its flanges (the welds not drawn)' };
  // (a cab-forward body, its windscreen's base over or ahead of what is under its front, as a van's, has its bulkhead
  // round its engine under its cab: not made here)
  // (a cab-forward body, its windscreen's foot over or ahead of its front axle, as a van's: not made here)
  if (yC - yT < 0.1 || x - toe < 0.05 || xWs > fa.x) return [];
  // (each pressing lapped on the next at its flange, a few millimetres, where they are spot-welded: the toe board's top on
  // the dash panel's back, the cowl panel over the dash panel's top)
  const xTe = x + 0.001, slope = Math.atan2(yT - floorTop, xTe - toe), Lt = Math.hypot(yT - floorTop, xTe - toe);
  return [P('bulkhead', undefined, [0, 0, 0], { says: 'its dash panel and toe board, the firewall between its engine bay and its cabin, and the cowl under its windscreen: pressed steel, about 0.8 mm (typical)', parts: [
    P('toe board', { box: [Lt, 0.004, 2 * w] }, [(xTe + toe) / 2, (yT + floorTop) / 2, 0], { rot: [0, 0, slope], ...steel, fixed: 'spot-welded at its foot to the floor pans and the tunnel, along its sides to the front inner wheelhouses, at its top to the dash panel, and along the floor rails under it (the welds not drawn)', joins: ['floor pan', 'floor pan left', 'floor pan right', 'tunnel top', 'dash panel'] }),
    P('dash panel', { box: [0.004, yC - yT, 2 * w] }, [x, (yT + yC) / 2, 0], { ...steel, fixed: 'spot-welded at its flanges to the toe board, the cowl panel and the front inner wheelhouses (the welds not drawn)', joins: ['toe board', 'cowl panel', 'front inner wheelhouses'] }),
    P('cowl panel', { box: [Math.max(0.03, Math.abs(x - xWs - 0.02)), 0.004, 2 * w] }, [x - xWs - 0.02 >= 0.03 ? (x + xWs + 0.02) / 2 : x + Math.max(0.03, xWs + 0.02 - x) / 2, yC, 0], { ...steel, joins: ['dash panel', 'windscreen'] })] })];
}
/** A unibody's rear structure over a twist-beam axle, fitted to what is already made (its rear floor, its wheelhouses,
 *  its axle's pivots, springs and dampers), each piece touching what it is joined to: a pressed bracket under the rear
 *  floor round each pivot's bush, its bolt across through both; the trunk's floor carrying the rear floor's own plane back
 *  over the axle to the tail, between the wheelhouses; a rubber seat under it on each spring; a turret on it in each of
 *  the trunk's corners, each damper's rod up through the floor into it, its mount bolted on top. Pressed steel
 *  spot-welded (typical of a unibody; the welds are not drawn), its seats and mounts rubber. */
function rearFrame(m: Machine, out: Part[]): Part[] {
  const ra = m.axles[m.axles.length - 1]!; if (ra.susp !== 'beam' || ra.track <= 0) return [];
  const nodes = layout(P('so far', undefined, [0, 0, 0], { parts: out })), parts: Part[] = [], said: string[] = [];
  const boxOf = (re: RegExp, side = 0, xMax = Infinity) => { let lo: V3 | null = null, hi: V3 | null = null; for (const n of nodes) { if (!n.box || !n.p.shape || !re.test(n.p.name) || n.box.max.x > xMax) continue; const cz = (n.box.min.z + n.box.max.z) / 2; if (side && Math.sign(cz) !== side) continue; const a = n.box.min.toArray() as V3, b = n.box.max.toArray() as V3; lo = lo ? [Math.min(lo[0], a[0]), Math.min(lo[1], a[1]), Math.min(lo[2], a[2])] : a; hi = hi ? [Math.max(hi[0], b[0]), Math.max(hi[1], b[1]), Math.max(hi[2], b[2])] : b; } return lo && hi ? { lo, hi } : null; };
  const steel = { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0015, finish: 'paint' as const, fixed: 'spot-welded to what it meets (the welds not drawn)' };
  const floor = boxOf(/^rear floor$/), wh = boxOf(/^rear inner wheelhouses$/), tail = boxOf(/^rear quarter panel$/);
  if (!floor || !wh || !tail) return [P('rear structure', undefined, [0, 0, 0], { says: 'its rear structure is not made: no rear floor, rear wheelhouses or tail to fit it to' })];
  const yU = floor.lo[1], yT = floor.hi[1], zW = Math.min(Math.abs(wh.lo[2]), Math.abs(wh.hi[2])) - 0.0015, x1 = floor.lo[0], ra2 = m.axles[m.axles.length - 1]!.x;
  // (its back panel: upright across the tail from the floor up to 30 mm under the deck lid's edge, 15 mm inside the tail's
  // skin where the skin comes furthest forward over the trunk's width (its corners); the bumper's beam would stand in the
  // room between it and the skin at the middle, not drawn)
  const skin = out.filter((p) => p.name === 'rear quarter panel' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 120, 60));
  const lidLo = Math.min(...out.filter((p) => p.name === 'deck lid' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 40, 20)).map((q) => q[1]));
  const lampLo = Math.min(...nodes.filter((n) => n.box && n.p.shape && /^tail lamp|^tail lights$/.test(n.p.name)).map((n) => n.box!.min.y)), yB1 = Math.min(Number.isFinite(lidLo) ? lidLo - 0.03 : yT + 0.3, Number.isFinite(lampLo) ? lampLo - 0.02 : Infinity), xSk = Math.max(...skin.filter((q) => q[0] < ra2 - 0.3 && q[1] >= yU - 0.01 && q[1] <= yB1 + 0.01 && Math.abs(q[2]) <= zW + 0.01).map((q) => q[0])), xB = Number.isFinite(xSk) ? xSk + 0.015 : tail.lo[0] + 0.1, xF0 = xB + 0.004;
  // (each damper's opening in the floor, the inside of its turret: 45 mm round its rod, out to its wheelhouse)
  const mounts = [-1, 1].map((sd) => boxOf(/^damper top mount$/, sd)), hT = 0.045, tw = 0.002, mR = mounts[1], zIn = mR ? (mR.lo[2] + mR.hi[2]) / 2 - hT : zW, xcT = mR ? (mR.lo[0] + mR.hi[0]) / 2 : 0;
  const floorPiece = (xa: number, xb: number, za: number, zb: number) => P('trunk floor', { box: [xb - xa, yT - yU, zb - za] }, [(xa + xb) / 2, (yU + yT) / 2, (za + zb) / 2], { ...steel, shell: 0.0009, fixed: 'spot-welded at its front edge to the rear floor, along its sides to the rear inner wheelhouses and at its back to the back panel (the welds not drawn)', says: 'its trunk\'s floor: pressed steel, the rear floor carried back over the axle to the back panel between the wheelhouses, open under each damper\'s turret (typical; its spare wheel\'s well not drawn)' });
  if (x1 - xF0 > 0.2) {
    parts.push(P('back panel', { box: [0.004, yB1 - yU, 2 * zW] }, [xB + 0.002, (yU + yB1) / 2, 0], { ...steel, shell: 0.0008, fixed: 'spot-welded along its foot to the trunk floor (the welds not drawn)', says: 'its lower back panel: pressed steel across the tail, the deck lid\'s lock on its top (typical; the lock not drawn)' }));
    const open = mR && xcT - hT > xF0 + 0.05 && xcT + hT < x1 - 0.05 && zIn > 0.1;
    if (!open) parts.push(floorPiece(xF0, x1, -zW, zW));
    else { parts.push(floorPiece(xF0, x1, -zIn, zIn)); for (const sd of [-1, 1]) for (const [xa, xb] of [[xF0, xcT - hT], [xcT + hT, x1]] as const) parts.push(floorPiece(xa, xb, sd > 0 ? zIn : -zW, sd > 0 ? zW : -zIn)); }
  }
  for (const sd of [-1, 1]) {
    const side = sd > 0 ? 'right' : 'left', bush = boxOf(new RegExp(`^pivot bush rear ${side}$`)), sp = boxOf(new RegExp(`^spring rear ${side}$`));
    // (each pivot's bracket: two cheeks 3 mm thick against the bush's ends, from 45 mm under its middle up to a web under the floor; the bolt across through them)
    // (up to the floor that is over it, whichever it is: the rear floor, or the pan where the rear floor does not reach)
    const over = (x: number, z: number, above: number) => Math.min(...nodes.filter((n) => n.box && n.p.shape && /floor|pan/.test(n.p.name) && n.box.min.x <= x - 0.035 && n.box.max.x >= x + 0.035 && n.box.min.z <= z && n.box.max.z >= z && n.box.min.y > above).map((n) => n.box!.min.y));
    if (bush) { const xc = (bush.lo[0] + bush.hi[0]) / 2, yc = (bush.lo[1] + bush.hi[1]) / 2, za = Math.min(Math.abs(bush.lo[2]), Math.abs(bush.hi[2])), zb = Math.max(Math.abs(bush.lo[2]), Math.abs(bush.hi[2])), y0 = yc - 0.045, yF = over(xc, sd * (za + zb) / 2, bush.hi[1]), yw = yF - 0.004;
      if (Number.isFinite(yF) && yw - y0 > 0.02) { const ch = (zm: number) => P(`pivot bracket ${side}`, { box: [0.07, yw - y0, 0.003] }, [xc, (y0 + yw) / 2, sd * zm], { mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', passes: [`pivot bolt rear ${side}`], fixed: 'welded to its web', says: 'a cheek of its pivot\'s bracket (typical)' });
        parts.push(ch(za - 0.0015), ch(zb + 0.0015), P(`pivot bracket web ${side}`, { box: [0.07, 0.004, zb - za + 0.006] }, [xc, yF - 0.002, sd * (za + zb) / 2], { mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', fixed: 'bolted under the floor over it', says: 'its pivot bracket\'s web, bolted under the floor (typical)' }),
          P(`pivot bolt rear ${side}`, { cyl: [0.006, zb - za + 0.016] }, [xc, yc, sd * (za + zb) / 2], { rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x8a8e92, finish: 'plate', item: 'M12 bolt', fixed: 'through its bracket\'s cheeks and its bush\'s inner tube, its nut on the far cheek', says: 'its pivot bolt: M12 (typical)' })); }
      else said.push(`no floor over the ${side} pivot for its bracket, or no room under it`); }
    // (each spring's seat under the floor: rubber, 10 mm)
    if (sp && sp.hi[1] < yU) parts.push(P(`spring seat rear ${side}`, { box: [0.13, yU - sp.hi[1], 0.13] }, [(sp.lo[0] + sp.hi[0]) / 2, (sp.hi[1] + yU) / 2, sd * (Math.abs(sp.lo[2]) + Math.abs(sp.hi[2])) / 2], { mat: 'rubber', color: 0x161616, finish: 'texture', fixed: 'seated in its pressed seat under the floor', says: 'its spring\'s upper seat: a rubber isolator under the floor (typical)' }));
    // (each damper's turret: a pressed box over its opening in the trunk's floor, its walls on the floor round the opening,
    // its outer side the wheelhouse, its top over its damper's mount, which is bolted under it)
    const mt = mounts[sd > 0 ? 1 : 0];
    if (mt && mt.hi[1] > yT + 0.05 && zIn > 0.1) { const xc = (mt.lo[0] + mt.hi[0]) / 2, yTop2 = mt.hi[1], hW = yTop2 - yT, zA = zIn - tw, zm = (zA + zW) / 2, t2 = { ...steel, shell: 0.0012, fixed: 'spot-welded at its foot to the trunk floor and along its side to its inner wheelhouses (the welds not drawn)', says: 'its damper\'s turret in the trunk\'s corner, its mount bolted under its top (typical)' };
      parts.push(P(`damper turret ${side}`, { box: [2 * hT + 2 * tw, hW, tw] }, [xc, yT + hW / 2, sd * (zIn - tw / 2)], t2),
        ...[-1, 1].map((dx) => P(`damper turret ${side}`, { box: [tw, hW, zW - zA] }, [xc + dx * (hT + tw / 2), yT + hW / 2, sd * zm], t2)),
        P(`damper turret ${side}`, { box: [2 * hT + 2 * tw, 0.003, zW - zA] }, [xc, yTop2 + 0.0015, sd * zm], t2)); }
    else if (!mt) said.push(`no damper mount on the ${side} for its turret`);
  }
  return parts.length ? [P('rear structure', undefined, [0, 0, 0], { says: `its unibody's rear structure over its twist-beam axle, fitted to what is in it (typical)${said.length ? `; ${said.join('; ')}` : ''}`, parts })] : [];
}
/** A unibody's front structure, fitted to what is already made (its engine, subframe, strut towers, aprons, bulkhead
 *  and skins), each piece touching what it is joined to: a rail along each apron, above the drive shafts' boots and
 *  beside the engine, from the toe board to a bumper beam across their front ends; each strut tower's walls down to its
 *  apron; the subframe on four mounts up to the rails; the engine and its gearbox each on a rubber mount on a rail, with
 *  a torque rod back to the subframe; and each sill's inner closing the floor to its skin. Pressed steel spot-welded
 *  (typical of a unibody; the welds are not drawn), its mounts rubber. Where there is no room for a piece (a rail
 *  narrower than 30 mm between the engine and the apron), it is left out and says so. */
function frontFrame(m: Machine, out: Part[], tyres: Tyre[]): Part[] {
  const fa = m.axles[0]!, ft = tyres[0]!, R = ft.D / 2, inside = insideOf(out), nodes = layout(P('so far', undefined, [0, 0, 0], { parts: out }));
  const boxOf = (re: RegExp, side = 0) => { let lo: V3 | null = null, hi: V3 | null = null; for (const n of nodes) { const bx = n.box ?? n.sub; if (!bx || !re.test(n.p.name)) continue; const cz = (bx.min.z + bx.max.z) / 2; if (side && Math.sign(cz) !== side) continue; const a = bx.min.toArray() as V3, b = bx.max.toArray() as V3; lo = lo ? [Math.min(lo[0], a[0]), Math.min(lo[1], a[1]), Math.min(lo[2], a[2])] : a; hi = hi ? [Math.max(hi[0], b[0]), Math.max(hi[1], b[1]), Math.max(hi[2], b[2])] : b; } return lo && hi ? { lo, hi } : null; };
  // (structural pressings: bent tight, not styled round as a skin is, so not 'pressed' for the edges rule; spot-welded, so
  // the joints rule lays nothing more on them)
  const steel = { mat: 'steel-low', color: 0x2a2c2e, shell: 0.0015, finish: 'paint' as const, fixed: 'spot-welded to what it meets (the welds not drawn)' }, said: string[] = [], parts: Part[] = [];
  const eng = boxOf(/^(engine block|gearbox|intake manifold|alternator|reduction gear and differential|electric motor \(.*\)|inverter)$/), apron = boxOf(/^front inner wheelhouses$/), toe = nodes.find((n) => n.p.name === 'toe board' && n.obb);
  const tr = travelOf(fa), zWb = Math.min(fa.track / 2 - ft.W / 2 - 0.04, fa.track / 2 - (ft.W / 2) * Math.cos(tr.steer) - (R + 0.03) * Math.sin(tr.steer) - 0.025);
  const zEng = eng ? Math.max(Math.abs(eng.lo[2]), Math.abs(eng.hi[2])) : 0.3, zAp = apron ? Math.max(Math.abs(apron.lo[2]), Math.abs(apron.hi[2])) : zWb;
  // (the rails: their outer faces on the aprons, within the steered tyres' sweep; over the drive shafts' boots by 12 mm)
  const z0 = zEng + 0.003, z1 = Math.min(zAp - 0.001, zWb), y0 = R + 0.042 + 0.012, y1 = y0 + 0.1;
  // (their rear ends on the toe board where it is at their top, their front ends on the bumper beam's back, 8 mm ahead
  // of all that is in the bay)
  const toeAt = (y: number) => { if (!toe?.obb) return fa.x - R; const o = toe.obb, nrm = o.u[1]!; return o.c.x - (nrm.y * (y - o.c.y) + nrm.z * (0 - o.c.z)) / nrm.x; };
  // (behind every recess and lamp of its face, ahead of everything in its bay: where there is no room between them it is
  // not made, and says so)
  const face = nodes.filter((n) => n.box && n.box.min.x > fa.x + 0.2 && /grille|lamp|headl|intake wall|valance|plate|fog/.test(n.p.name) && n.box.max.y > y0 - 0.05 && n.box.min.y < y1 + 0.05).map((n) => n.box!.min.x);
  const bay = Math.max(eng ? eng.hi[0] : fa.x + 0.3, ...nodes.filter((n) => n.box && n.box.min.y < y1 && n.box.max.y > y0 && /radiator|condenser|battery|motor|intake manifold|alternator/.test(n.p.name)).map((n) => n.box!.max.x));
  // (the toe board's face toward the bay, at a height: its middle plane less its half thickness)
  const lowerAt = (y: number) => toeAt(y) + (toe?.obb ? toe.obb.h[1]! / Math.abs(toe.obb.u[1]!.x) : 0);
  const xb1 = (face.length ? Math.min(...face) : bay + 0.1) - 0.005, xb0 = Math.max(bay + 0.008, xb1 - 0.04), xr0 = lowerAt(y1) + 0.0003;
  const beamHalf = Math.min(inside(xb1, y0), inside(xb1, y1)) - 0.03;
  if (z1 - z0 < 0.03) said.push(`no front rails: ${((z1 - z0) * 1000).toFixed(0)} mm between the engine and the aprons`);
  else {
    for (const sd of [-1, 1]) parts.push(P(`front rail ${sd > 0 ? 'right' : 'left'}`, { box: [xb0 - xr0, y1 - y0, z1 - z0] }, [(xr0 + xb0) / 2, (y0 + y1) / 2, sd * (z0 + z1) / 2], { ...steel, fixed: 'spot-welded along its outer face to the front inner wheelhouses, at its rear end to its floor rail and against the toe board (the welds not drawn); the bumper beam bolted on its front end', joins: ['front inner wheelhouses', 'toe board', 'bumper beam', `engine mount ${sd > 0 ? 'right' : 'left'}`, `subframe mount ${sd > 0 ? 'right' : 'left'}`], says: `a front side member: a pressed box ${Math.round((y1 - y0) * 1000)} × ${Math.round((z1 - z0) * 1000)} mm, spot-welded to its apron, kicking down under the toe board into its floor rail (typical; narrower than most, as the engine is drawn wide)` }));
    // (each rail kicked down under the toe board, along its face toward the bay, into a floor rail under the floor pan back
    // to the pan's end; and a torque box under the pan's front from the floor rail out to the sill's inner: so the front
    // structure's loads reach the floor and the sills through steel, not through the engine or the exhaust's hangers)
    const fpB = boxOf(/^floor pan (left|right)$/), sl = boxOf(/^sills$/);
    if (fpB && toe?.obb && fpB.hi[1] - fpB.lo[1] < 0.02 && sl) {
      const fpU = fpB.lo[1], dR = Math.min(0.06, fpU - (sl.lo[1] + 0.005)), xF = lowerAt(fpU), zc = (z0 + z1) / 2, hw = (z1 - z0) / 2, zf = Math.max(Math.abs(fpB.lo[2]), Math.abs(fpB.hi[2]));
      if (dR > 0.03 && xF > fpB.lo[0] + 0.3 && xr0 > xF + 0.02) for (const sd of [-1, 1]) {
        const side = sd > 0 ? 'right' : 'left';
        // (under the pan back from the toe board's foot; then up the toe board's face, 50 mm deep, from 20 mm under its foot,
        // lapped into the pan's rail there, to its front rail's top, lapped into the rail's end: one pressing, welded)
        const o = toe.obb, u0 = o.u[0]!, u1 = o.u[1]!, dK = 0.05, sAt = (y: number) => (y - o.c.y + u1.y * o.h[1]!) / u0.y, s0 = -o.h[0]! - 0.02, s1 = sAt(y1), sm = (s0 + s1) / 2;
        const rail = { mat: 'steel-low', color: 0x2a2c2e, shell: 0.0015, finish: 'paint' as const, fixed: 'spot-welded along its top to the floor pan and the toe board, its front end to its front rail, its outer side to the front inner wheelhouses where it meets them (the welds not drawn)', says: `its floor rail: a pressed box ${Math.round(hw * 2000)} × ${Math.round(dR * 1000)} mm under the floor pan, its front kicked up the toe board's face to its front rail (typical)` };
        parts.push(P(`floor rail ${side}`, { box: [xF - fpB.lo[0], dR, 2 * hw] }, [(fpB.lo[0] + xF) / 2, fpU - dR / 2, sd * zc], rail),
          P(`floor rail ${side}`, { box: [s1 - s0, dK, 2 * hw] }, [o.c.x + u0.x * sm - u1.x * (o.h[1]! + dK / 2), o.c.y + u0.y * sm - u1.y * (o.h[1]! + dK / 2), sd * zc], { ...rail, rot: [0, 0, Math.atan2(u0.y, u0.x)] }));
        if (zf - (zc + hw) > 0.03) parts.push(P(`torque box ${side}`, { box: [0.08, dR, zf - (zc + hw)] }, [sl.hi[0] - 0.04, fpU - dR / 2, sd * (zf + zc + hw) / 2], { ...steel, fixed: 'spot-welded under the floor pan, to its floor rail and to its sill\'s inner (the welds not drawn)', says: 'its torque box: a pressed box under the floor\'s front from its floor rail out to its sill (typical)' }));
      }
    } else said.push('no floor rails: the floor is not a sheet over room for them');
    if (xb1 - xb0 < 0.02) said.push(`no bumper beam: ${((xb1 - xb0) * 1000).toFixed(0)} mm between the bay and the face`); else if (Number.isFinite(beamHalf) && beamHalf > z1) parts.push(P('bumper beam', { box: [xb1 - xb0, y1 - y0, 2 * beamHalf] }, [(xb0 + xb1) / 2, (y0 + y1) / 2, 0], { mat: 'steel-alloy', color: 0x2a2c2e, shell: 0.002, finish: 'paint', fixed: 'bolted across the rails\' ends', joins: ['front rail right', 'front rail left'], says: 'its front bumper beam: a high-strength steel section bolted across the rails\' ends, behind the bumper cover (typical)' }));
  }
  // (each strut tower's walls: inboard, ahead and behind its strut, from its apron's top up to the tower)
  for (const sd of [-1, 1]) {
    const tw = boxOf(/^strut tower front (left|right)$/, sd), tn = nodes.find((n) => n.p.name === `strut tower front ${sd > 0 ? 'right' : 'left'}` && n.obb), ya = apron ? apron.hi[1] : undefined; if (!tw || !tn?.obb || ya === undefined || tw.lo[1] - ya < 0.01) continue;
    // (the tower's top leans with its strut: its underside's height where each wall meets it, from its own box)
    const o = tn.obb, u1 = o.u[1]!, under = (x: number, z: number) => o.c.y + (-o.h[1]! - (x - o.c.x) * u1.x - (z - o.c.z) * u1.z) / u1.y;
    // (its bottom face's inner and outer edges, from its corners, not its box's, which a leaning top overstates)
    const bz = [-1, 1].map((e) => o.c.z + e * o.h[2]! * o.u[2]!.z - o.h[1]! * u1.z), zi = sd > 0 ? Math.min(...bz) + 0.002 : Math.max(...bz) - 0.002, zo = sd > 0 ? Math.max(...bz) - 0.002 : Math.min(...bz) + 0.002;
    // (standing on its apron's arch where the arch is highest under it: its wall's top edge follows the liner's)
    const apex = Math.max(...out.filter((p) => p.name === 'front inner wheelhouses' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 60, 2)).filter((q) => q[0] >= tw.lo[0] && q[0] <= tw.hi[0]).map((q) => q[1]), -Infinity), ya2 = Number.isFinite(apex) ? apex : ya;
    const xc = (tw.lo[0] + tw.hi[0]) / 2, nm = `strut tower wall ${sd > 0 ? 'right' : 'left'}`, j = { ...steel, joins: ['front inner wheelhouses', `strut tower front ${sd > 0 ? 'right' : 'left'}`] }, zA2 = sd * zAp;
    const ya3 = ya2 - 0.006, yi = under(xc, zi), ys = Math.min(under(xc, zi), under(xc, zo)); if (yi - ya2 < 0.01) continue;
    // (its inner wall from the apron's plane out under the tower's inner edge; its front and back walls out from that)
    parts.push(P(nm, { box: [o.h[0]! * 2, yi - ya3, Math.abs(zi - zA2)] }, [xc, (ya3 + yi) / 2, (zi + zA2) / 2], j),
      ...[xc - o.h[0]! + 0.001, xc + o.h[0]! - 0.001].map((xw) => P(nm, { box: [0.002, ys - ya2, Math.abs(zo - zi)] }, [xw, (ya2 + ys) / 2, (zi + zo) / 2], j)));
  }
  // (the torque rod's place: from the gearbox's back to the subframe's cross member, at the gearbox's middle)
  const torqueRod = (): { box: V3; at: V3 } | null => { const gbRe = /^(gearbox|reduction gear and differential)$/, gb = boxOf(gbRe), cm = boxOf(/^subframe cross member$/); if (!eng || z1 - z0 < 0.03 || !gb || !cm || !(gb.lo[0] > cm.hi[0] && gb.lo[1] < cm.hi[1])) return null; const x0r = cm.hi[0], x1r = gb.lo[0], y0r = Math.max(gb.lo[1], cm.lo[1]), y1r = cm.hi[1];
    // (at the gearbox's middle, or beside whatever already stands there, as a rack's clamp: 3 mm clear of it, still under the gearbox)
    const at = (z: number): OBB => ({ c: new THREE.Vector3((x0r + x1r) / 2, (y0r + y1r) / 2, z), u: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)], h: [(x1r - x0r) / 2, (y1r - y0r) / 2 - 0.0005, 0.028] });
    const clear = (z: number) => !nodes.some((n) => n.p.shape && !gbRe.test(n.p.name) && n.p.name !== 'subframe cross member' && n.box && n.box.min.x < x1r && n.box.max.x > x0r && n.pieces.some((pc) => sat(pc, at(z), 0)));
    const mid = (gb.lo[2] + gb.hi[2]) / 2, zs = Array.from({ length: Math.max(1, Math.floor((gb.hi[2] - gb.lo[2] - 0.05) / 0.005)) + 1 }, (_, i) => gb.lo[2] + 0.025 + i * 0.005).sort((p, q) => Math.abs(p - mid) - Math.abs(q - mid)), zc = zs.find(clear) ?? mid;
    return { box: [x1r - x0r, y1r - y0r, 0.05], at: [(x0r + x1r) / 2, (y0r + y1r) / 2, zc] }; };
  // (the subframe on four mounts up to the rails, one pair at the rear where the rails are and one ahead, each pair at the
  // same place on both sides: a plate welded on the subframe's side reaching out under its rail, a steel collar on it up to
  // the rail, an M12 bolt up through them into a nut in the rail; bolted rigidly, as a front suspension member often is)
  if (z1 - z0 >= 0.03) {
    const sides = [-1, 1].map((sd) => { const sf = boxOf(/^subframe side (left|right)$/, sd); return sf && sf.hi[1] < y0 ? { sd, sf } : null; });
    const own = /^(subframe side (left|right)|front rail (left|right)|front inner wheelhouses|front subframe|floor rail (left|right))$/;
    // (each part by the boxes that cover it tightly, not by its bounds: a fender's skin bounds the whole corner it curves
    // round, and is nowhere near the column a mount stands in)
    const column = (sf: { lo: V3; hi: V3 }, sd: number, xm: number): OBB => { const za = Math.max(Math.abs(sf.lo[2]), Math.abs(sf.hi[2])) - 0.03; return { c: new THREE.Vector3(xm, (y0 + sf.hi[1]) / 2, sd * (za + z1) / 2), u: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)], h: [0.0255, (y0 - sf.hi[1]) / 2 + 0.004, (z1 - za) / 2 + 0.003] }; };
    // (and the torque rod, which is laid after them, from the gearbox's back to the cross member)
    const rodBox = torqueRod(), rodObb: OBB | null = rodBox ? { c: new THREE.Vector3(...rodBox.at), u: [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)], h: rodBox.box.map((v) => v / 2) as [number, number, number] } : null;
    const inWay = (sf: { lo: V3; hi: V3 }, sd: number, xm: number) => { const cb = column(sf, sd, xm); return [...nodes.filter((n) => !own.test(n.p.name) && n.box && n.box.min.x < xm + 0.03 && n.box.max.x > xm - 0.03 && n.pieces.some((pc) => sat(pc, cb, 0))).map((n) => n.p.name), ...(rodObb && sat(rodObb, cb, 0) ? ['torque rod'] : [])]; };
    if (sides.every((x2) => x2)) {
      const lo2 = Math.max(xr0 + 0.03, ...sides.map((x2) => x2!.sf.lo[0] + 0.025)), hi2 = Math.min(xb0 - 0.03, ...sides.map((x2) => x2!.sf.hi[0] - 0.025)), xs2 = Array.from({ length: Math.max(0, Math.floor((hi2 - lo2) / 0.005) + 1) }, (_, i) => lo2 + i * 0.005);
      const free = (xm: number) => sides.every((x2) => !inWay(x2!.sf, x2!.sd, xm).length), rearAt = xs2.find(free), frontAt = [...xs2].reverse().find((x2) => free(x2) && (rearAt === undefined || x2 > rearAt + 0.15));
      if (rearAt === undefined || frontAt === undefined) said.push(`a pair of subframe mounts has no free place under both rails (${[...new Set(xs2.length ? sides.flatMap((x2) => inWay(x2!.sf, x2!.sd, xs2[0]!)) : [])].join(', ') || 'no length of rail over the subframe'} in the way)`);
      for (const xm of [rearAt, frontAt].filter((x2): x2 is number => x2 !== undefined)) for (const x2 of sides) {
        const { sd, sf } = x2!, side = sd > 0 ? 'right' : 'left', za = Math.max(Math.abs(sf.lo[2]), Math.abs(sf.hi[2])) - 0.03, zc = (z0 + z1) / 2, yP = sf.hi[1] + 0.006;
        parts.push(P(`subframe mount ${side}`, undefined, [0, 0, 0], { says: 'a subframe mount: a plate on the subframe, a collar up to the rail, an M12 bolt through both into the rail (typical)', parts: [
          P('subframe mount plate', { box: [0.05, 0.006, z1 - za] }, [xm, sf.hi[1] + 0.003, sd * (za + z1) / 2], { ...steel, shell: 0.006, fixed: 'welded on top of its subframe side', says: 'its plate, 6 mm, welded on the subframe\'s side and reaching out under the rail (typical)' }),
          P('subframe mount collar', { cyl: [0.018, y0 - yP] }, [xm, (yP + y0) / 2, sd * zc], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', fixed: 'clamped between its plate and the front rail by its bolt', says: 'its collar: a steel tube 36 mm across between the plate and the rail (typical)' }),
          P('subframe bolt', { cyl: [0.0125, 0.008] }, [xm, sf.hi[1] - 0.004, sd * zc], { facets: 6, mat: 'steel-alloy', color: 0x8a8e92, finish: 'plate', item: 'M12 bolt', fixed: 'its head under its mount plate, its shank up through the plate and the collar into a nut welded in the front rail (the shank not drawn)', says: 'its bolt: M12 (typical)' })] }));
      }
    }
  }
  // (the engine on the right rail, its gearbox on the left, each a rubber mount on the rail's top against its end; and a
  // torque rod from the gearbox's back to the subframe's cross member)
  if (eng && z1 - z0 >= 0.03) {
    // (an electric unit's: its inverter on the right, its motor on the left)
    for (const sd of [-1, 1]) { const re = sd > 0 ? /^(engine block|inverter)$/ : /^(gearbox|electric motor \(.*\))$/, e = boxOf(re); if (!e) continue; const en = nodes.find((n) => re.test(n.p.name))!.p.name, xc = (e.lo[0] + e.hi[0]) / 2, ze = sd > 0 ? e.hi[2] : -e.lo[2];
      if (Math.abs(ze - zEng) > 0.01 || e.hi[1] < y1 + 0.06) continue;
      parts.push(P(`engine mount ${sd > 0 ? 'right' : 'left'}`, { box: [0.1, 0.06, z1 - ze] }, [xc, y1 + 0.03, sd * (ze + z1) / 2], { mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'mount', joins: [en, `front rail ${sd > 0 ? 'right' : 'left'}`, 'front inner wheelhouses'], says: `its ${en === 'engine block' ? 'engine' : en === 'gearbox' ? 'gearbox' : en === 'inverter' ? 'drive unit\'s right' : 'drive unit\'s left'} mount: rubber in a bracket, bolted on the rail and to the ${en === 'engine block' ? 'block' : en === 'gearbox' ? 'gearbox' : en === 'inverter' ? 'inverter' : 'motor'} (typical)` })); }
    const rod = torqueRod();
    if (rod) { parts.push(P('torque rod', { box: rod.box }, rod.at, { mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'mount', joins: [nodes.find((n) => /^(gearbox|reduction gear and differential)$/.test(n.p.name))!.p.name, 'subframe cross member'], says: 'its torque rod: a link in two rubber bushes from the gearbox back to the subframe (typical)' })); }
  }
  // (each sill's inner: from the floor's edge out to its skin, as deep as the sill)
  // (on an electric car, down past its floor to its pack's bottom, so the pack's flange is bolted to it)
  const fl = boxOf(/^floor pan( (left|right))?$/), sills = boxOf(/^sills$/), pkB = boxOf(/^battery pack/), y0s = pkB ? Math.min(fl?.lo[1] ?? Infinity, pkB.lo[1]) : Math.min(fl?.lo[1] ?? 0, sills?.lo[1] ?? Infinity);
  if (fl && sills) for (const sd of [-1, 1]) {
    // (measured over the sill's own height where the floor stands over it, as an electric car's on its pack does)
    const zf = Math.max(Math.abs(fl.lo[2]), Math.abs(fl.hi[2])), yTop = Math.min(sills.hi[1], fl.hi[1]), yLo = y0s, skin = out.filter((p) => p.name === 'sills' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 160, 24)).filter((q) => q[1] >= yLo && q[1] <= yTop && Math.abs(q[2]) > zf), zo = Math.min(...skin.map((q) => Math.abs(q[2]))) - 0.0004;
    if (!Number.isFinite(zo) || zo - zf < 0.02) continue;
    parts.push(P(`sill inner ${sd > 0 ? 'right' : 'left'}`, { box: [sills.hi[0] - sills.lo[0], Math.min(sills.hi[1], fl.hi[1]) - y0s, zo - zf] }, [(sills.lo[0] + sills.hi[0]) / 2, (y0s + Math.min(sills.hi[1], fl.hi[1])) / 2, sd * (zf + zo) / 2], { ...steel, joins: [pkB ? 'floor pan' : `floor pan ${sd > 0 ? 'right' : 'left'}`, 'sills'], says: 'its sill\'s inner: a pressed box section from the floor\'s edge to the sill\'s skin, spot-welded to both (typical)' }));
  }
  // (its exhaust's manifold on the block's back, the down pipe's end under it; and a rubber hanger wherever the pipe runs
  // within 120 mm under the body, every 600 mm along it)
  const ex = out.find((p) => p.name === 'exhaust' && p.shape && 'tube' in p.shape), blk = boxOf(/^engine block$/);
  if (ex && blk) {
    const tb = (ex.shape as { tube: { pts: V3[]; r: number } }).tube, p0 = tb.pts[0]!, rr = tb.r;
    if (!nodes.some((n) => n.p.name === 'exhaust manifold') && p0[0] < blk.lo[0] && blk.lo[0] - p0[0] < 0.12) parts.push(P('exhaust manifold', { box: [blk.lo[0] - (p0[0] - rr - 0.008), 0.07, Math.min(0.32, blk.hi[2] - blk.lo[2] - 0.02)] }, [(blk.lo[0] + p0[0] - rr - 0.008) / 2, p0[1] + 0.035, Math.max(blk.lo[2] + 0.17, Math.min(blk.hi[2] - 0.17, p0[2]))], { mat: 'cast-iron', color: 0x5a4a40, finish: 'cast', joins: ['engine block', 'exhaust'], fixed: 'bolted to the head on its studs, the down pipe on its flange', says: 'its exhaust manifold, cast iron, on the back of the head, the down pipe from it (typical)' }));
    const segAt = (x: number): V3 | null => { for (let i = 1; i < tb.pts.length; i++) { const a = tb.pts[i - 1]!, b = tb.pts[i]!; if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) { const f = (x - a[0]) / (b[0] - a[0]); return [x, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; } } return null; };
    const xs3 = Array.from({ length: 12 }, (_, i) => fa.x - 0.5 - i * 0.6).filter((x) => x > tb.pts[tb.pts.length - 1]![0] + 0.1);
    for (const x of xs3) { const q = segAt(x); if (!q) continue; const top = q[1] + rr;
      const over = nodes.filter((n) => n.box && n.box.min.x < x - 0.015 && n.box.max.x > x + 0.015 && n.box.min.z < q[2] - 0.01 && n.box.max.z > q[2] + 0.01 && n.box.min.y > top + 0.005 && n.box.min.y < top + 0.12 && /floor|tunnel|heel|rail|pan/.test(n.p.name)).sort((a2, b2) => a2.box!.min.y - b2.box!.min.y)[0];
      if (over) parts.push(P('exhaust hanger', { box: [0.024, over.box!.min.y - top, 0.016] }, [x, (top + over.box!.min.y) / 2, q[2]], { mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'mount', joins: ['exhaust', over.p.name], says: `a rubber hanger, the exhaust hung from the ${over.p.name} (typical)` })); }
  }
  return parts.length ? [P('front structure', undefined, [0, 0, 0], { says: `its unibody's front structure and sills, its exhaust's manifold and hangers, fitted to what is in it (typical)${said.length ? `; ${said.join('; ')}` : ''}`, parts })] : [];
}
/** The rearmost x a part reaches (its box, or its tube's or loft's points, as placed), m. */
function backOf(p: Part): number { const a = p.at?.[0] ?? 0, s = p.shape; if (s && 'box' in s) return a - s.box[0] / 2; if (s && 'cyl' in s) return a - s.cyl[0]; if (s && 'tube' in s) return Math.min(...s.tube.pts.map((q) => q[0])) - s.tube.r; return p.parts?.length ? Math.min(...p.parts.map((q) => backOf({ ...q, at: [a + (q.at?.[0] ?? 0), 0, 0] }))) : a; }
/** A car-like body: its side skins, hood, deck lid and cabin, its doors, glass, pillars, lamps and grille, each arch
 *  trimmed round its wheel by how the wheel moves; a pickup's bed behind its cab. */
/** What a panelled body is made from: the machine's figures, its lines, its wheels and how they move, and what it must
 *  clear inside (so a practising critic can make the same body under other rules: src/nexus/panels.ts practise). */
export function bodyPlanOf(m: Machine): BodyPlan {
  const { L, W, clearance: c } = m, front = Math.max(...m.axles.map((a) => a.x)), rear = Math.min(...m.axles.map((a) => a.x));
  const wheels: WheelAt[] = m.axles.filter((a) => a.track > 0).map((a) => { const t = tyreOf(a.tyre)!; return { name: a.x === front ? 'front wheel' : a.x === rear ? 'rear wheel' : 'middle wheel', x: a.x, y: t.D / 2, z: a.track / 2, R: t.D / 2, w: t.W, ...travelOf(a), section: tyreSection(t) }; });
  // what it must clear: its engine under the hood, with room over it (about 50 mm, typical; more where a maker designs for
  // pedestrians' heads): each of its parts as it is made (its block, head, cam cover, intake), not a box round them all, so
  // a hood falling to its nose clears the engine where the engine is, not where a box round it has a corner
  const pw = powerAt(m), es0 = engineSize(pw, true).s, es: V3 = across(m) ? [es0[2], es0[1], es0[0]] : es0, ez = pw.z ?? 0, why = 'room over the engine under its hood (about 50 mm, typical)';
  const made = pw.kind === 'electric' ? null : engine(pw, m.kind !== 'truck' && m.kind !== 'forklift', 'front axle', across(m)), kids = made?.parts ?? [], th = made?.rot?.[1] ?? 0;
  const boxes = kids.length && kids.every((k) => k.shape && 'box' in k.shape && !k.rot) ? kids.map((k) => { const b = (k.shape as { box: V3 }).box, at = k.at ?? [0, 0, 0], cs = [-1, 1].flatMap((i) => [-1, 1].flatMap((j) => [-1, 1].map((l) => { const x = at[0] + (i * b[0]) / 2, y = at[1] + (j * b[1]) / 2, z = at[2] + (l * b[2]) / 2; return [made!.at![0] + x * Math.cos(th) + z * Math.sin(th), made!.at![1] + y, made!.at![2] - x * Math.sin(th) + z * Math.cos(th)] as V3; })));
    return { name: `engine: ${k.name}`, min: [0, 1, 2].map((i) => Math.min(...cs.map((c) => c[i]!))) as V3, max: [0, 1, 2].map((i) => Math.max(...cs.map((c) => c[i]!))) as V3, room: 0.05, why }; }) : null;
  const inside: KeepOut[] = pw.kind === 'electric' ? [] : boxes ?? [{ name: 'engine', min: [pw.x - es[0] / 2, pw.y! - es[1] / 2, ez - es[2] / 2], max: [pw.x + es[0] / 2, pw.y! + es[1] / 2, ez + es[2] / 2], room: 0.05, why }];
  // and each strut's top, in its tower under the hood (suspension() puts it where it is)
  for (const a of m.axles) if (a.susp === 'strut' && a.track > 0) { const st = strutOf(a, tyreOf(a.tyre)!, m), top = st.top + 0.007; inside.push({ name: 'strut tower', min: [a.x - 0.09, top - 0.012, st.zt - 0.09], max: [a.x + 0.09, top + 0.09 * st.lean, st.zt + 0.09], room: 0.03, why: 'room over the strut towers (about 30 mm, typical)' }, { name: 'strut', min: [a.x - 0.07, st.yb, st.zt - 0.07], max: [a.x + 0.07, st.top, st.zb + 0.025], room: 0.01, why: 'the strut and its spring in the wheelhouse, behind the liner (typical)', in: 'wheelhouse' }); }
  return { L, W, H: m.H, c, lines: m.lines!, wheels, color: m.color, inside };
}
function body(m: Machine, ln: Lines): Part[] {
  // (its panels as the body's lines cut them; then each door, the hood and the deck lid built round its skin from its
  // first parts (fittings.ts closureOf))
  const plan = bodyPlanOf(m), { L, W, wheels } = plan, c = m.clearance, built = new Set<string>(), panels = bodyPanels(plan), out = panels.flatMap((p) => { const k = /^(front |rear )?doors$/.test(p.name) ? 'door' : p.name === 'hood' || p.name === 'deck lid' ? p.name : null; if (!k) return [p];
    // (a skin cut in two patches (a rear door's, below and above its arch's line) is one door: built round its first)
    if (built.has(p.name)) return [{ ...p, item: k === 'door' ? 'door-skin' : k === 'hood' ? 'hood-skin' : 'deck-lid-skin' }]; built.add(p.name); return closureOf(p, k as 'door', panels.filter((q) => q !== p && q.name === p.name)); });
  const x = (f: number) => L / 2 - f * L;
  // a pickup's bed: its floor over the rear tyres (with the room the tyres need), its sides the body's own skin
  const rt = Math.max(...wheels.filter((w) => w.x < 0).map((w) => w.y + w.R + w.bump), c + 0.4);
  // (as wide as the skin is inside at its height, and as long, its tail end 20 mm inside the skin there: the bed's sides
  // and tail are the body's own skin, which leans in toward its foot and back toward its tail)
  if (ln.bed) {
    const yb = rt + 0.06, x0 = x(ln.deck) - 0.04, sideOf = insideOf(out), xs = Array.from({ length: 13 }, (_, k) => x0 - ((L * (1 - ln.deck) - 0.12) * k) / 12);
    const inW = Math.min(...xs.map((q) => sideOf(q, yb - 0.015)), ...xs.map((q) => sideOf(q, yb + 0.015))), w2 = Math.min(W * 0.43, inW - 0.005);
    const x1 = Math.max(-L / 2 + 0.08, tailOf(out)(yb - 0.015, w2) + 0.02, tailOf(out)(yb + 0.015, w2) + 0.02);
    out.push(P('bed floor', { box: [x0 - x1, 0.03, 2 * w2] }, [(x0 + x1) / 2, yb, 0], { mat: 'steel-low', color: 0x262626, shell: 0.0009, make: 'pressed', finish: 'texture', says: 'the bed floor, over the rear tyres (typical)' }));
  }
  return out;
}

/** A body kit fitted to the skin as made: each piece where the skin is, standing on it, on both sides. */
/** A body kit fitted to the skin of `out` (its flares on its arches' lips, its skirts, lip, valance, scoops and wing). */
export function bodyKit(m: Machine, k: BodyKit, out: Part[]): Part[] {
  const s = skinOf(out), mat = k.mat ?? 'abs', col = k.color, kit: Part[] = [], deg = PI / 180, side = (sd: number) => (sd > 0 ? 'right' : 'left');
  const own = { mat, color: col, finish: 'paint' } as const;
  // flares: a band round each arch from its lip out, as thick as it stands proud, on the most the skin stands out under it
  const arches = m.axles.filter((a) => a.track > 0).map((a) => { const t = tyreOf(a.tyre)!, R = t.D / 2, from = (k.flares?.from ?? 12) * deg, to = (k.flares?.to ?? 168) * deg, n = 36;
    const lip0 = archLip(s, a.x, R, R, Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n)).filter((q) => Number.isFinite(q.r));
    // (the lip's radius read off the skin's samples, smoothed round the arch: the middle of five, then their mean, so a
    // sample caught on a shut line or a panel's edge does not notch the flare)
    const med = lip0.map((_, i) => { const w5 = lip0.slice(Math.max(0, i - 2), i + 3).map((q) => q.r).sort((x, y) => x - y); return w5[Math.floor(w5.length / 2)]!; });
    // (a wide flare's inner edge set in over the opening, but never nearer the tyre than 15 mm)
    const inset = k.flares?.inset ?? 0, lip = lip0.map((q, i) => { const w5 = med.slice(Math.max(0, i - 2), i + 3), r = w5.reduce((x, y) => x + y, 0) / w5.length; return { ...q, r: Math.max(R + 0.015, r - inset) }; });
    return { a, R, lip, front: a.x === Math.max(...m.axles.map((b) => b.x)) }; });
  if (k.flares) for (const { a, R, lip, front } of arches) {
    if (lip.length < 4) continue;
    const w = k.flares.w, t = k.flares.t, nm = front ? 'front fender flare' : 'rear fender flare', on = front ? 'front fender' : 'rear quarter panel';
    // (on the most the skin stands out under the band, so it sits on the skin, not in it)
    const rB = Math.max(...lip.map((l) => l.r)) + w + 0.01, band = skinIn(s, [a.x - rB, R - rB, 0.2], [a.x + rB, R + rB, 1e9]).filter((q) => q.at[2] > 0.2 && Math.abs(q.n[2]) > 0.3 && (() => { const d = Math.hypot(q.at[0] - a.x, q.at[1] - R), qa = Math.atan2(q.at[1] - R, q.at[0] - a.x); return qa > lip[0]!.a && qa < lip[lip.length - 1]!.a && d > Math.min(...lip.map((l) => l.r)) - 0.005 && d < Math.max(...lip.map((l) => l.r)) + w; })());
    // (the skin's own z near a point, the most it stands out there; the lip's where there is none, over the opening)
    const zs = (x: number, y: number, or: number) => { let z = -Infinity; for (const q of band) if (Math.abs(q.at[0] - x) < 0.025 && Math.abs(q.at[1] - y) < 0.025) z = Math.max(z, q.at[2]); return Number.isFinite(z) ? z : or; };
    // (a moulded band: proudest at its inner edge, rolled over the arch's lip, falling back onto the skin at its outer
    // edge; drawn as a surface through four lines round the arch)
    const cols: [number, number][] = [[-0.004, 1], [0.25, 1], [0.7, 0.5], [1, 0.08]];
    // (each line out from the axle at the most the skin stands out along it, smoothed round the arch over five lines, so
    // the band runs round as one moulding, not stepping with the skin's samples)
    const raw = lip.map((l) => Math.max(...[0, 0.33, 0.66, 1].map((f) => { const r = l.r + f * w; return zs(a.x + r * Math.cos(l.a), R + r * Math.sin(l.a), l.z); })));
    const zRow = raw.map((_, i) => { const win = raw.slice(Math.max(0, i - 2), i + 3); return win.reduce((p, q) => p + q, 0) / win.length; });
    const net = lip.map((l, i) => cols.map(([f, h]): V3 => { const r = l.r + (f < 0 ? f : f * w); return [a.x + r * Math.cos(l.a), R + r * Math.sin(l.a), zRow[i]! + h * t]; }));
    for (const sd of [-1, 1]) {
      const fl = `${nm} ${side(sd)}`, sn = (sd > 0 ? net : net.slice().reverse()).map((row) => row.map((q): V3 => [q[0], q[1], sd * q[2]]));
      kit.push(P(fl, { surf: { s: { net: sn } } }, [0, 0, 0], { ...own, shell: 0.003, item: 'fender-flare', joins: [on], fixed: `riveted to the ${on} round its arch`, says: `a flare round the arch, ${(w * 1000).toFixed(0)} mm wide, standing ${(t * 1000).toFixed(0)} mm proud of the skin at its lip and falling back onto it: moulded ABS, 3 mm (typical of bolt-on flares)` }));
      // (its rivets every so many degrees round it, a third of the way out, their heads on its face)
      const every = (k.flares.every ?? 18) * deg;
      for (let q = lip[0]!.a + every / 2; q < lip[lip.length - 1]!.a; q += every) { const li = lip.reduce((b, c, i) => (Math.abs(c.a - q) < Math.abs(lip[b]!.a - q) ? i : b), 0), l = lip[li]!, rm = l.r + w * 0.3, x = a.x + rm * Math.cos(q), y = R + rm * Math.sin(q), zf = zRow[li]! + t * 0.97;
        // (set: its head on the flare's face, its body through the flare, the stub of its mandrel left in it (4.8 mm, typical))
        kit.push(P('flare rivet', undefined, [x, y, sd * (zf + 0.0015)], { rot: [sd * PI / 2, 0, 0], item: 'rivet-pop', says: 'a blind rivet through the flare into the fender, 4.8 mm (typical)', parts: [
          P('rivet head', { cyl: [0.005, 0.003] }, [0, 0, 0], { mat: 'al-6061', color: k.flares!.heads ?? 0x2a2a2c, finish: 'paint' }),
          P('rivet body', { cyl: [0.0024, t] }, [0, -0.0015 - t / 2, 0], { mat: 'al-6061', color: 0x9a9ca0, passes: [fl, on] }),
          P('rivet mandrel', { cyl: [0.0013, t * 0.6] }, [0, -0.0015 - t * 0.3, 0], { mat: 'steel-low', color: 0x6a6a6a, item: 'rivet-mandrel', passes: [fl, 'rivet body'] })] })); }
    }
  }
  // skirts: along the rocker from behind the front arch to ahead of the rear, from just under the skin's foot up so far
  if (k.skirts) {
    const fa = arches.find((x) => x.front), ra = arches.find((x) => !x.front);
    if (fa && ra) {
      const x0 = fa.a.x - (fa.lip.find((l) => l.a > PI * 0.9)?.r ?? fa.R + 0.05) - 0.01, x1 = ra.a.x + (ra.lip.find((l) => l.a < PI * 0.1)?.r ?? ra.R + 0.05) + 0.01, n = 16;
      // (only where the skin's foot is the rocker's: not up the arches' edges at its ends)
      const st0 = Array.from({ length: n + 1 }, (_, i) => { const x = x0 + ((x1 - x0) * i) / n, lo = lowAt(s, x); return { x, ...lo }; }).filter((q) => Number.isFinite(q.y)), mid = st0.map((q) => q.y).sort((a, b) => a - b)[Math.floor(st0.length / 2)]!, st = st0.filter((q) => q.y < mid + 0.03);
      const z0 = Math.max(...st.map((q) => q.z)), h = k.skirts.h, t = k.skirts.t;
      const pts: [number, number][] = [...st.map((q): [number, number] => [q.x, q.y - 0.012]), ...st.slice().reverse().map((q): [number, number] => [q.x, q.y + h])];
      for (const sd of [-1, 1]) kit.push(P(`side skirt ${side(sd)}`, { prism: { pts, L: t } }, [0, 0, sd * (z0 + t / 2)], { ...own, item: 'side-skirt', joins: ['sills'], fixed: 'screwed to the sill along its foot and taped along its top', says: `a side skirt along the rocker, ${(h * 1000).toFixed(0)} mm tall: moulded ABS (typical)` }));
    }
  }
  // a lip under the nose, a valance under the tail: a plate following the bumper's outline in plan at its foot
  const plate = (o: Plate, front: boolean) => {
    // (its foot: the skin's lowest within its last 35 cm, where the bumper is)
    const end = (front ? 1 : -1) * (m.L / 2), xs = Array.from({ length: 13 }, (_, i) => end - (front ? 1 : -1) * (0.05 + (i / 12) * 0.3));
    const foot = Math.min(...xs.map((x) => lowAt(s, x).y).filter(Number.isFinite));
    // (only across where the bumper comes down to its foot: not out under its corners, where it has rolled up, or the plate
    // would hang there under nothing)
    const footAt = (x: number, z: number) => { let y = Infinity; for (const q of skinIn(s, [x - 0.06, -1e9, -1e9], [x + 0.06, 1e9, 1e9])) if (Math.abs(q.at[0] - x) < 0.06 && Math.abs(Math.abs(q.at[2]) - Math.abs(z)) < 0.04) y = Math.min(y, q.at[1]); return y; };
    const line = endAt(s, foot + 0.03, front).filter(([x, z]) => footAt(x, z) < foot + 0.06);
    if (line.length < 4) return;
    const pts: [number, number][] = [...line.map(([x, z]): [number, number] => [x + (front ? o.out : -o.out), z]), ...line.slice().reverse().map(([x, z]): [number, number] => [x - (front ? o.d : -o.d), z])];
    kit.push(P(front ? 'front lip' : 'rear valance', { prism: { pts, L: o.t } }, [0, foot - o.t / 2, 0], { ...own, rot: [PI / 2, 0, 0], item: front ? 'front-lip' : 'rear-valance', joins: [front ? 'bumper cover' : 'rear bumper cover', front ? 'front fender' : 'rear quarter panel'], fixed: 'screwed up into the bumper cover\'s foot', says: `${front ? 'a lip under the front bumper' : 'a valance under the rear bumper'}, ${(o.d * 1000).toFixed(0)} mm deep: moulded ABS (typical)` }));
    // (its side pieces down the bumper's corners: each a plate on the skin's side there, from the end back along the car,
    // its top edge rising toward the end by `rise`, its foot hanging `sh` under that)
    if (o.sd && o.sh) {
      const far0 = end - (front ? 1 : -1) * o.sd, rise = o.rise ?? 0, lo0 = Math.min(end, far0), hi0 = Math.max(end, far0);
      const near = skinIn(s, [lo0, foot - 0.05, 0.2], [hi0, foot + rise + 0.3, 1e9]).filter((q) => q.at[2] > 0.2 && q.at[0] > lo0 && q.at[0] < hi0 && q.at[1] > foot - 0.05 && q.at[1] < foot + rise + 0.3), z0 = Math.max(...near.map((q) => q.at[2]));
      // (its end where the skin ends at its side, not at the middle: a rounded nose or tail turns back at its corners, and
      // a piece run out to the middle's end hangs in the air past them)
      const atSide = near.filter((q) => q.at[2] > z0 - 0.08), xEnd = atSide.length ? (front ? Math.max(...atSide.map((q) => q.at[0])) : Math.min(...atSide.map((q) => q.at[0]))) : end;
      // (and short of the wheel's arch, so the wheel keeps its room to move: 30 mm round it, typical)
      const ar = arches.find((q) => q.front === front), room = ar ? (front ? ar.a.x + ar.R + 0.03 : ar.a.x - ar.R - 0.03) : -Infinity;
      const e = xEnd + (front ? o.out : -o.out), far = front ? Math.max(xEnd - o.sd, room) : Math.min(xEnd + o.sd, room);
      const side2: [number, number][] = [[e, foot + rise], [far, foot], [far, foot - o.sh], [e, foot + rise - o.sh]];
      if (Number.isFinite(z0)) for (const sd of [-1, 1]) kit.push(P(`${front ? 'front lip' : 'rear valance'} side ${side(sd)}`, { prism: { pts: side2, L: o.t } }, [0, 0, sd * (z0 + o.t / 2)], { ...own, item: front ? 'front-lip' : 'rear-valance', joins: [front ? 'front lip' : 'rear valance', front ? 'bumper cover' : 'rear bumper cover'], fixed: 'screwed to the bumper cover\'s corner', says: `its side piece down the bumper's corner, ${(o.sd * 1000).toFixed(0)} mm along it: moulded ABS (typical)` }));
    }
  };
  if (k.lip) plate(k.lip, true);
  if (k.valance) plate(k.valance, false);
  // a scoop's insert on each rear quarter, on the skin where its outline is
  const ra = m.axles.filter((a) => a.track > 0).reduce((b, a) => (a.x < b.x ? a : b));
  if (k.scoop) {
    const pts = k.scoop.map(([x, y]): [number, number] => [x, y]), xs = pts.map((q) => q[0] + ra.x), ys = pts.map((q) => q[1]);
    const under = skinIn(s, [Math.min(...xs), Math.min(...ys), 0.2], [Math.max(...xs), Math.max(...ys), 1e9]).filter((q) => q.at[2] > 0.2 && q.at[0] > Math.min(...xs) && q.at[0] < Math.max(...xs) && q.at[1] > Math.min(...ys) && q.at[1] < Math.max(...ys)), z0 = Math.max(...under.map((q) => q.at[2])), t = 0.012;
    // (and the vent it frames: a black moulded mesh across the opening between it and the door, closed behind, as a
    // bolt-on scoop's is)
    const vent = k.vent?.map(([x, y]): [number, number] => [x, y]);
    if (Number.isFinite(z0)) for (const sd of [-1, 1]) {
      kit.push(P(`quarter scoop ${side(sd)}`, { prism: { pts, L: t } }, [ra.x, 0, sd * (z0 + t / 2)], { ...own, item: 'quarter-scoop', joins: ['rear quarter panel'], fixed: 'taped and screwed onto the quarter panel', says: 'a scoop\'s insert on the rear quarter, moulded ABS (its outline as the kit\'s maker shaped it)' }));
      if (vent) kit.push(P(`scoop vent ${side(sd)}`, { prism: { pts: vent, L: 0.004 } }, [ra.x, 0, sd * (z0 + 0.002)], { mat: 'abs', color: 0x0c0c0d, finish: 'texture', item: 'scoop-vent', joins: ['rear quarter panel', `quarter scoop ${side(sd)}`], fixed: 'clipped into the scoop\'s insert', says: 'its vent: a black moulded mesh, closed behind (typical of a bolt-on scoop)' }));
    }
  }
  // a ducktail: a moulded sheet on the deck lid's tail, rising from the deck to its trailing edge, on the deck as it is
  // across its width (its crown), so it sits on the lid all along, not on a line
  if (k.spoiler) {
    const sp = k.spoiler, lid = s.pts.filter((q) => /^deck lid/.test(q.of) && q.n[1] > 0.3 && Math.abs(q.at[2]) < 0.3), xb = Math.min(...lid.map((q) => q.at[0])) + 0.015, xf = xb + sp.d;
    // (its skins drawn as one side mirrored: matched by how far out from the middle)
    const deckAt = (x: number, z: number) => { let y = -Infinity; for (const q of skinIn(s, [x - 0.03, -1e9, -Math.abs(z) - 0.06], [x + 0.03, 1e9, Math.abs(z) + 0.06])) if (/^deck lid/.test(q.of) && q.n[1] > 0.3 && Math.abs(q.at[0] - x) < 0.03 && Math.abs(Math.abs(q.at[2]) - Math.abs(z)) < 0.06) y = Math.max(y, q.at[1]); return y; };
    // (across as much of its span as the deck lid's top is there, at both its edges)
    let half = (sp.span * m.W) / 2; while (half > 0.2 && !(Number.isFinite(deckAt(xf, half)) && Number.isFinite(deckAt(xb, half)) && Number.isFinite(deckAt(xf, -half)) && Number.isFinite(deckAt(xb, -half)))) half -= 0.02;
    const zs = Array.from({ length: 9 }, (_, i) => -half + (2 * half * i) / 8);
    const net = zs.map((z) => { const yf = deckAt(xf, z), yb = deckAt(xb, z); return [[xf, yf + 0.002, z], [xf - sp.d * 0.45, (yf + yb) / 2 + sp.h * 0.35, z], [xb + 0.012, yb + sp.h, z], [xb, yb + sp.h * 0.9, z]] as V3[]; });
    if (net.flat().every((q) => Number.isFinite(q[1]))) kit.push(P('ducktail spoiler', { surf: { s: { net } } }, [0, 0, 0], { ...own, shell: 0.003, item: 'ducktail-spoiler', joins: ['deck lid'], fixed: 'taped and screwed along the deck lid\'s tail', says: `a ducktail spoiler moulded along the deck lid's tail, ${(sp.h * 1000).toFixed(0)} mm tall: moulded ABS (typical)` }));
  }
  // a wing on the deck: its blade on two uprights, an end plate at each end of it
  if (k.wing) {
    const g = k.wing, tail = -m.L / 2, xc = tail + g.back + g.chord / 2, deck = topAt(s, xc), span = g.span * m.W, c = g.chord;
    if (Number.isFinite(deck)) {
      // (its section: a cambered blade 12 % thick, typical of a car's wing; drawn from its leading edge ahead, +x)
      const foil: [number, number][] = [];
      for (let i = 0; i <= 12; i++) { const u = i / 12, th = 0.12 * c * 2.5 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4) , cam = 0.04 * c * 4 * u * (1 - u); foil.push([c / 2 - u * c, cam + th]); }
      for (let i = 12; i >= 0; i--) { const u = i / 12, th = 0.12 * c * 2.5 * (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1036 * u ** 4), cam = 0.04 * c * 4 * u * (1 - u); foil.push([c / 2 - u * c, cam - th]); }
      const y = deck + g.h, rot: V3 = [0, 0, -g.pitch * deg], zU = span * 0.32, ups = [-1, 1].map((sd) => P(`wing upright ${side(sd)}`, { box: [c * 0.45, g.h + 0.004, 0.012] }, [xc, deck + g.h / 2 - 0.002, sd * zU], { ...own, mat: 'al-a380', item: 'wing-upright', joins: ['deck lid', 'wing blade'], fixed: 'bolted through the deck lid', says: 'an upright: cast aluminium, bolted through the deck lid (typical; its bolts under the lid not drawn)' }));
      const pl = (g.plate ?? c * 1.24) / 2, ph = g.plateH ?? 0.13, plates = [-1, 1].map((sd) => P(`wing end plate ${side(sd)}`, { prism: { pts: [[pl, -ph * 0.46], [-pl, -ph * 0.23], [-pl, ph * 0.54], [pl * 0.73, ph * 0.38]], L: 0.006 } }, [xc, y, sd * (span / 2 + 0.003)], { ...own, item: 'wing-endplate', joins: ['wing blade'], says: 'an end plate, moulded ABS' }));
      kit.push(P('rear wing', undefined, [0, 0, 0], { item: 'rear-wing', joins: ['deck lid'], says: `a wing on the deck: its blade ${(c * 1000).toFixed(0)} mm in chord and ${(span * 1000).toFixed(0)} mm across, ${(g.h * 1000).toFixed(0)} mm over the deck, set ${g.pitch}° leading edge down`, parts: [
        P('wing blade', { prism: { pts: foil, L: span } }, [xc, y, 0], { rot, mat: 'fibreglass', color: g.color, finish: 'paint', item: 'wing-blade', joins: ['wing upright left', 'wing upright right', 'wing end plate left', 'wing end plate right'] }), ...ups, ...plates] }));
    }
  }
  return kit.length ? [P('body kit', undefined, [0, 0, 0], { says: k.says, parts: kit })] : [];
}
// ---- the rest, each placed by the machine's own figures ---------------------------------------------------------------
const seatPart = (s: Seat, i: number, col: number, floor?: number, room = Infinity, back = Infinity): Part => {
  const nm = `seat ${i + 1}`;
  if (s.style === 'saddle') return P(nm, undefined, [s.x, s.y, s.z], { parts: [loft('saddle', [{ x: -0.32, w: 0.12, lo: -0.06, hi: 0.02, n: 3 }, { x: 0, w: 0.15, lo: -0.07, hi: 0.03, n: 3 }, { x: 0.25, w: 0.08, lo: -0.06, hi: 0.01, n: 3 }], 'foam', 0x1a1a1a, { finish: 'leather', parts: [] })] });
  if (s.style === 'kart') return P(nm, undefined, [s.x, s.y, s.z], { parts: [loft('seat shell', [{ x: -0.2, w: 0.2, lo: -0.05, hi: 0.42, n: 2.4 }, { x: 0.05, w: 0.21, lo: -0.08, hi: 0.15, n: 2.4 }, { x: 0.25, w: 0.19, lo: -0.06, hi: 0.08, n: 2.4 }], 'fibreglass', 0x1a1a1a, { shell: 0.004, finish: 'paint' })] });
  if (s.style === 'pan') return P(nm, undefined, [s.x, s.y, s.z], { parts: [loft('seat pan', [{ x: -0.22, w: 0.22, lo: -0.02, hi: 0.32, n: 3 }, { x: 0.0, w: 0.23, lo: -0.04, hi: 0.06, n: 3 }, { x: 0.22, w: 0.22, lo: -0.03, hi: 0.05, n: 3 }], 'pp', 0x1a1a1a, { shell: 0.004, finish: 'texture' })] });
  const wd = Math.max(0.12, Math.min(s.style === 'bench' ? 0.62 : 0.26, room));
  // (its backrest behind its cushion, leaning back from where they meet, not sunk into it; a cushion on a floor too high
  // for a frame and rails under it, as a rear seat on its raised floor, sits on the floor itself)
  const onFloor = floor !== undefined && s.y - 0.15 - floor < 0.03, lo = onFloor ? Math.max(-0.16, floor! - s.y) : -0.11;
  // (a seat as it is made: its foam on sinuous springs in a welded frame, its covers sewn over the foam, its backrest's
  // frame on a recliner at the cushion's back, a headrest on two posts; the frame on two pairs of rails, an upper
  // sliding in a lower on balls, a latch bar between them (typical of a car's front seat); a bench's frame on the floor)
  const cush = loft('cushion foam', [{ x: -0.22, w: wd, lo, hi: 0.04, n: 4 }, { x: 0.25, w: wd, lo, hi: 0.02, n: 4 }], 'pu', col, { finish: 'weave', fill: 0.045, item: 'seat-foam', joins: ['seat frame', 'rear floor', 'floor pan', 'floor pan left', 'floor pan right'], says: 'moulded polyurethane foam, about 55 kg/m³ (typical)' });
  const bh = Math.max(0.3, Math.min(0.62, back)), bk = loft('backrest foam', [{ x: -0.324, w: wd, lo: 0, hi: bh, n: 4 }, { x: -0.22, w: wd * 0.95, lo: 0.02, hi: Math.max(0.32, Math.min(0.64, back + 0.02)), n: 4 }], 'pu', col, { rot: [0, 0, 0.18], finish: 'weave', fill: 0.045, item: 'seat-foam', joins: ['cushion foam'], says: 'its backrest\'s foam, on its recliner at the cushion\'s back' });
  const cover = (q: Part, nmC: string): Part => ({ ...q, name: nmC, mat: 'pet', shell: 0.0012, fill: 1, item: 'seat-cover', joins: [q.name, ...(q.joins ?? []), 'seat frame', 'backrest frame'], says: 'its cover, woven polyester sewn over its foam and stapled to the frame inside it (typical)' });
  const steel = { mat: 'steel-low', color: 0x2a2a2a, finish: 'paint' } as const, parts: Part[] = [cush, cover(cush, 'cushion cover'), bk, cover(bk, 'backrest cover')];
  // (its springs: four sinuous wires across the cushion's frame, zig-zag front to back, 4 mm spring wire (typical))
  for (let k = 0; k < 4; k++) { const z = -wd * 0.6 + (k + 0.5) * (wd * 1.2) / 4, pts: V3[] = []; for (let j = 0; j <= 10; j++) pts.push([-0.2 + j * 0.04, lo - 0.005, z + (j % 2 ? 0.018 : -0.018)]); parts.push(P('seat spring', { tube: { r: 0.002, pts } }, [0, 0, 0], { mat: 'steel-spring', color: 0x3a3a3a, item: 'seat-spring' })); }
  if (!onFloor) {
    // (its frame: two pressed side members and two cross tubes, welded; the backrest's frame a bent tube up from its recliners)
    parts.push(P('seat frame', undefined, [0, -0.13, 0], { item: 'seat-frame', joins: ['seat rail'], parts: [
      ...[-1, 1].map((sd) => P('seat side member', { box: [0.48, 0.06, 0.003] }, [0, 0, sd * (wd + 0.002)], { ...steel, one: true })),
      ...[-0.18, 0.2].map((x) => P('seat cross tube', { cyl: [0.012, 2 * wd + 0.004] }, [x, 0.02, 0], { ...steel, rot: [PI / 2, 0, 0], one: true }))] }));
  }
  parts.push(P('backrest frame', { tube: { r: 0.011, wall: 0.0015, pts: [[-0.27, -0.05, -(wd - 0.012)], [-0.27 - bh * 0.18, bh * 0.95, -wd * 0.5], [-0.27 - bh * 0.18, bh * 0.95, wd * 0.5], [-0.27, -0.05, wd - 0.012]] } }, [0, 0, 0], { ...steel, item: 'seat-frame', joins: ['backrest foam', 'recliner'] }));
  // (a recliner each side at the backrest's pivot: two toothed discs, locked by a pawl, a lever on the outer one)
  for (const sd of [-1, 1]) parts.push(P('recliner', undefined, [-0.27, -0.05, sd * (wd + 0.012)], { item: 'recliner', joins: ['seat side member', 'backrest frame'], fixed: 'its inner disc bolted to the seat frame\'s side member, its outer to the backrest frame', parts: [P('recliner plate', { cyl: [0.035, 0.006] }, [0, 0, -0.004], { ...steel, rot: [PI / 2, 0, 0], item: 'recliner-disc' }), P('recliner plate', { cyl: [0.035, 0.006] }, [0, 0, 0.004], { ...steel, rot: [PI / 2, 0, 0], item: 'recliner-disc' }), P('recliner pawl', { box: [0.03, 0.008, 0.004] }, [0.02, 0, 0], { mat: 'steel-alloy', color: 0x8a8c90, item: 'recliner-pawl' })] }));
  if (s.style !== 'bench' && back > 0.5) {
    // (a headrest over the backrest's top on two posts: its foam in its cover)
    const ht = bh + 0.07;
    parts.push(P('headrest', undefined, [-0.27 - bh * 0.19, ht, 0], { rot: [0, 0, 0.18], item: 'headrest', parts: [P('headrest foam', { box: [0.07, 0.15, wd * 0.9] }, [0, 0.04, 0], { mat: 'pu', color: col, fill: 0.055, item: 'seat-foam' }), P('headrest cover', { box: [0.075, 0.155, wd * 0.92] }, [0, 0.04, 0], { mat: 'pet', color: col, shell: 0.0012, finish: 'weave', item: 'seat-cover' }), ...[-1, 1].map((sd) => P('headrest post', { cyl: [0.0055, 0.16] }, [0, -0.05, sd * 0.07], { mat: 'steel-low', color: 0xc8ccd2, finish: 'plate', item: 'headrest-post', passes: ['headrest foam', 'headrest cover', 'backrest foam', 'backrest cover'], fixed: 'through its foam, down into guides in the backrest\'s frame' }))] }));
  }
  // down to the floor it is bolted to, on its rails (a car's seat slides on two pairs, typical)
  if (floor !== undefined && !onFloor && s.y - 0.15 - floor > 0.01) {
    const rh = s.y - 0.15 - floor, yr = -0.15 - rh / 2;
    for (const sd of [-1, 1]) parts.push(P('seat rail', undefined, [0, yr, sd * wd * 0.6], { item: 'seat-rail', joins: ['floor pan', 'floor pan left', 'floor pan right', 'rear floor'], parts: [
      P('lower rail', { box: [0.42, Math.min(0.03, rh * 0.45), 0.04] }, [0, -rh / 2 + Math.min(0.03, rh * 0.45) / 2, 0], { ...steel, fill: 0.3, item: 'seat-rail-lower' }),
      P('upper rail', { box: [0.38, Math.min(0.03, rh * 0.45), 0.03] }, [0, -rh / 2 + Math.min(0.03, rh * 0.45) * 1.5, 0], { ...steel, fill: 0.3, item: 'seat-rail-upper' }),
      ...(rh > 0.08 ? [P('seat riser', { box: [0.3, rh - 0.06, 0.004] }, [0, 0.03, 0], { ...steel, item: 'seat-riser' })] : []),
      ...[-0.15, 0.15].map((x) => P('rail balls', { cyl: [0.004, 0.035] }, [x, -rh / 2 + Math.min(0.03, rh * 0.45), 0], { mat: 'steel-chrome', color: 0xc8ccd2, rot: [PI / 2, 0, 0], item: 'rail-ball', fill: 0.5 }))] }));
    parts.push(P('seat latch bar', { tube: { r: 0.005, pts: [[0.232, yr - rh / 2 + 0.02, -wd * 0.6], [0.27, yr - rh / 2 + 0.02, 0], [0.232, yr - rh / 2 + 0.02, wd * 0.6]] } }, [0, 0, 0], { ...steel, item: 'seat-latch-bar' }));
  }
  return P(nm, undefined, [s.x, s.y, s.z], { item: s.style === 'bench' || !parts.some((q) => q.item === 'seat-rail') ? 'bench-seat' : 'car-seat', parts });
};
/** An engine sized from its displacement: its mass about 0.055 kg per cc with an aluminium block, 0.09 with cast iron,
 *  and its size that mass at its bulk density (its mass over its bounding box: about 360 kg/m³ for a small single,
 *  470 for a car's four, 870 for a truck's diesel; estimates from a Honda GX270, a 2.0 L four and a Detroit DD15), so
 *  the masses of its parts are its mass shared out. */
/** The engine a power is: its cylinders, bore and stroke as its maker gives them, else from its displacement (an inline
 *  engine's cylinders by its size, a stroke 1.15 of its bore, typical of modern engines); a diesel's block iron, turbocharged
 *  and with four valves and two cams a cylinder; a single's and a twin's air-cooled with pushrods unless said. */
export function engineSpecOf(p: Power, alu: boolean): EngineSpec {
  const cc = p.cc ?? 1000, diesel = p.kind === 'diesel', n = p.cyl ?? (p.kind === 'single' ? 1 : p.kind === 'twin' ? 2 : diesel ? 6 : cc <= 1000 ? 3 : cc <= 2600 ? 4 : 6);
  const bore = p.bore ?? Math.cbrt((4 * cc * 1e-6) / n / (Math.PI * 1.15)), stroke = p.stroke ?? (cc * 1e-6 * 4) / (Math.PI * bore * bore * n), small = p.kind === 'single' || p.kind === 'twin';
  return { cyl: n, bore, stroke, layout: p.kind === 'twin' || p.kind === 'vee' ? 'vee' : 'inline', vee: p.vee ?? 90, fuel: diesel ? 'diesel' : 'petrol', block: p.block ?? (diesel || !alu ? 'iron' : 'al'), cooling: p.cooling ?? (small ? 'air' : 'liquid'), cams: p.cams ?? (small ? 'ohv' : 'dohc'), valves: p.valves ?? (small ? 2 : 4), turbo: diesel, starter: p.starter ?? 'electric', ...(p.fit ? { fit: p.fit } : {}), says: `${p.bore ? `${(bore * 1000).toFixed(1)} × ${(stroke * 1000).toFixed(1)} mm (its maker's)` : `bore and stroke estimated from its ${cc} cc`}` };
}
/** An engine's mass and its box: what the engine its parts make comes to (engines.ts), not a figure said for it. */
export function engineSize(p: Power, alu: boolean): { kg: number; s: V3 } {
  if (p.kind === 'electric') return { kg: 0, s: [0.3, 0.26, 0.26] };
  const e = engineBuilt(engineSpecOf(p, alu)); return { kg: e.kg, s: e.size };
}
/** An electric car's drive unit, on its driven axle's line (p.x, p.y): a cast housing round its reduction gears and its
 *  differential on that line, the drive shafts out of its faces (EDU.gb); its motor bolted on its left face, ahead of the
 *  axle and over the left shaft; its inverter on its right face, over the right one. Its two ends reach as far out as a
 *  transverse engine's do, so it hangs on the rails the same way (typical of a front-drive electric car's unit, as on a
 *  Chevrolet Bolt: its sizes an estimate). */
export const EDU = { gb: [-0.08, 0.08] as [number, number], half: 0.36 };
function driveUnit(p: Power): Part {
  const iron = { mat: 'al-a380', color: 0x8c8e90, finish: 'cast' } as const;
  return P('electric drive unit', undefined, [p.x, p.y ?? 0.4, p.z ?? 0], { says: p.says, parts: [
    P('reduction gear and differential', { box: [0.42, 0.32, EDU.gb[1] - EDU.gb[0]] }, [0.12, 0.06, 0], { ...iron, kg: 30, fill: 0.35, passes: ['drive shaft left', 'drive shaft right', 'inner joint boot'], says: 'a cast housing round its reduction gears (about 9 to 1, typical) and its differential, the drive shafts out of its faces' }),
    P(`electric motor (${p.kW} kW)`, { cyl: [0.12, EDU.half + EDU.gb[0]] }, [0.2, 0.1, (EDU.gb[0] - EDU.half) / 2], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x8a8a90, kg: 45, fill: 0.55, fixed: 'bolted to the side of its gear and differential housing', says: `its motor: ${p.kW} kW, its end bolted to the housing, its shaft into the reduction gears (typical)` }),
    P('inverter', { box: [0.26, 0.16, EDU.half - EDU.gb[1]] }, [0.15, 0.14, (EDU.gb[1] + EDU.half) / 2], { mat: 'al-a380', color: 0x9a9ca0, kg: 12, fill: 0.4, finish: 'cast', fixed: 'bolted to the side of its gear and differential housing', says: 'its inverter, turning the pack\'s direct current into the motor\'s three phases, on the unit over the right drive shaft (typical)' })] });
}
function engine(p: Power, alu: boolean, driven = 'rear axle', across = false): Part {
  if (p.kind === 'electric') return driveUnit(p);
  // (the engine its parts make, its box's middle on its place: each of its pieces as engines.ts makes it, shared)
  const spec = engineSpecOf(p, alu), e = engineBuilt(spec), mid = e.mid, cc = p.cc ?? 1000;
  const parts = e.engine.parts!.map((q) => ({ ...q, at: [(q.at?.[0] ?? 0) - mid[0], (q.at?.[1] ?? 0) - mid[1], (q.at?.[2] ?? 0) - mid[2]] as V3 }));
  const drive: Iface[] = p.torque && p.ratio ? [{ kind: 'drive', role: 'provides', torque: p.torque * p.ratio, to: driven, says: p.driveSays }] : [];
  return P(`${p.kind === 'diesel' ? 'diesel' : 'petrol'} engine (${cc} cc, ${p.kW} kW)`, undefined, [p.x, p.y ?? 0.4, p.z ?? 0], { parts, item: 'engine-ice', sealed: 'built whole from its parts (engines.ts), fitted as it comes', iface: drive, ...(across ? { rot: [0, -PI / 2, 0] as V3 } : {}), says: `${p.says}; ${spec.says}; ${Math.round(e.kg)} kg as its ${e.pieces.toLocaleString('en')} pieces come to${p.kg ? ` (its maker gives ${p.kg} kg)` : ''}${across ? '; set across the car, its gearbox at its left end (typical of front-wheel drive)' : ''}` });
}

/** An axle hung from its frame (at the frame's half-width fz and height fy where the axle is), by its kind. */
/** Where a unibody strut car's steering rack lies (suspension() lays it there, and its pinion's shaft is led to it):
 *  its axis 140 mm behind the axle, 18 mm over the wheels' centres (the tie rods' and steering arms' height), its housing
 *  out to zH each side. */
const TIE_Y = 0.018;
/** the brake each wheel of an axle carries (none when its one disc is on the axle) */
const atWheel = (a: Axle) => (a.brake?.on === 'axle' ? undefined : a.brake);
/** One disc on a live axle, as a kart's: a hub keyed to the axle just outboard of a bearing hanger, the disc bolted to
 *  its flange, a fixed caliper of two opposed pistons astride the disc behind the axle, bolted to a bracket welded to the
 *  hanger. Its disc 8 mm thick, its hub 30 mm long, its caliper 35 mm deep and 60 mm round the disc (typical of a rental
 *  kart's). `zh` is the hanger's outer face, `sd` the side (-1 left). */
function axleBrake(a: Axle, t: Tyre, zh: number, sd: number, end: string): Part {
  const d = a.brake!.d, r = d / 2, y = t.D / 2, th = 0.008, axle = `${end} axle`, x0 = a.x, Z = (z: number) => sd * z, rot: V3 = [sd * PI / 2, 0, 0];
  const hub0 = zh + 0.006, hubL = 0.03, zd = hub0 + hubL - 0.002 - th / 2, cw = 0.035, ch = 0.06, rc = r - cw / 2 + 0.001, body = 0.02, pad = 0.0085, gap = 0.0005;
  const zi1 = zd - th / 2 - gap, zo0 = zd + th / 2 + gap, zIn = zi1 - pad - body, zOut = zo0 + pad + body, cx = x0 - rc, iron = { mat: 'al-a380', color: 0x9a1c1c, finish: 'cast' } as const;
  const halfB = (nm: string, z0: number, z1: number, inner: boolean): Part => P(nm, { box: [cw, ch, z1 - z0] }, [cx, y, Z((z0 + z1) / 2)], { ...iron, one: true, fixed: 'bolted to its other half through the bridge', cuts: [{ r: 0.012, depth: body * 0.75, at: [0, 0, sd * (inner ? 1 : -1) * (z1 - z0) / 2], dir: [0, 0, -sd * (inner ? 1 : -1)] }] });
  const piston = (nm: string, zf: number, dir: number): Part => P(nm, { cyl: [0.0115, body * 0.7] }, [cx, y, Z(zf + dir * body * 0.35)], { rot: [PI / 2, 0, 0], mat: 'steel-chrome', color: 0xc8ccd2, finish: 'plate', item: 'caliper-piston' });
  const padOf = (nm: string, zFace: number, dir: number): Part => P(nm, undefined, [0, 0, 0], { item: 'disc-brake-pad', parts: [
    P('pad friction', { box: [cw * 0.9, ch * 0.85, pad - 0.003] }, [cx, y, Z(zFace + dir * (pad - 0.003) / 2)], { mat: 'friction-composite', color: 0x5a5048, finish: 'texture', item: 'pad-friction' }),
    P('pad backing plate', { box: [cw * 0.95, ch * 0.9, 0.003] }, [cx, y, Z(zFace + dir * (pad - 0.0015))], { mat: 'steel-low', color: 0x3a3a3a, item: 'pad-backing' })] });
  return P(`axle brake ${Math.round(d * 1000)} mm`, undefined, [0, 0, 0], { says: `one ${Math.round(d * 1000)} mm disc on the rear axle, its caliper bolted to the frame (typical of a rental kart)`, parts: [
    P('brake disc hub', { lathe: [[0.015, 0], [0.032, 0], [0.032, hubL - 0.006], [0.05, hubL - 0.006], [0.05, hubL], [0.015, hubL], [0.015, 0]] }, [x0, y, Z(hub0)], { rot, mat: 'al-6061', color: 0x9aa0a6, finish: 'machined', passes: [axle], fixed: 'keyed to the axle and clamped by its two set screws', says: 'a hub keyed to the axle, the disc bolted to its flange (typical)' }),
    P(`brake disc ${Math.round(d * 1000)} mm`, { lathe: [[0.034, -th / 2], [r, -th / 2], [r, th / 2], [0.034, th / 2], [0.034, -th / 2]] }, [x0, y, Z(zd)], { rot, mat: 'steel-alloy', color: 0x8a8a8a, finish: 'ground', item: 'brake-disc', passes: [axle], joins: ['brake disc hub'], fixed: 'bolted to its hub\'s flange' }),
    P('brake caliper', undefined, [0, 0, 0], { item: 'brake-caliper-fixed', says: 'a fixed caliper of two opposed pistons (typical of a kart\'s)', parts: [
      P('caliper body', undefined, [0, 0, 0], { item: 'caliper-body', mat: 'al-a380', parts: [
        halfB('caliper inner half', zIn, zi1 - pad, true), halfB('caliper outer half', zo0 + pad, zOut, false),
        P('caliper bridge', { box: [0.012, ch * 0.8, zOut - zIn] }, [x0 - r - 0.0015 - 0.006, y, Z((zIn + zOut) / 2)], { ...iron, one: true, fixed: 'cast as one with its inner half' })] }),
      piston('caliper piston (inner)', zi1 - pad, -1), piston('caliper piston (outer)', zo0 + pad, 1),
      padOf('brake pad (inner)', zi1, -1), padOf('brake pad (outer)', zo0, 1)] }),
    P('caliper bracket', { box: [rc + cw / 2 - 0.034, 0.05, zIn - zh] }, [x0 - (0.034 + rc + cw / 2) / 2, y, Z((zh + zIn) / 2)], { mat: 'steel-low', color: 0x2a2a2a, finish: 'paint', item: 'caliper-bracket', joins: [`hanger housing ${end} ${sd > 0 ? 'right' : 'left'}`, 'caliper inner half'], fixed: 'welded to its bearing hanger, the caliper bolted to it', says: 'a plate welded to the bearing hanger the caliper is bolted to (typical)' })] });
}
const rackOf = (m: Machine, a: Axle, t: Tyre) => { const cn = cornerOf(t, { ...m.rims, brake: atWheel(a) }, true); return { x: a.x - 0.14, y: t.D / 2 + TIE_Y, zH: a.track / 2 + cn.zA - 0.39 }; };
function suspension(a: Axle, t: Tyre, f: { z: number; y: number }, end: string, m: Machine): Part[] {
  const out: Part[] = [], y = t.D / 2, k = a.susp ?? 'rigid', dark = 0x2a2a2a;
  for (const s of [-1, 1]) {
    const side = `${end} ${s > 0 ? 'right' : 'left'}`, zf = s * f.z;
    if (k === 'rigid') {
      // (a hanger as a kart's is made: a plate welded down onto its rail, a housing at the axle's height bored for a
      // 6206 bearing (30 mm bore, the axle's own size; SKF's 30 × 62 × 16), the bearing pressed in and the axle through it;
      // the housing 8 mm round the bearing's outside (typical))
      const rO = 0.031, top = y + rO + 0.008, bot = f.y - 0.016, h = top - bot, cy = (top + bot) / 2, axleNm = `${end} axle`;
      out.push(P(`bearing hanger ${side}`, undefined, [0, 0, 0], { item: 'bearing-hanger', says: 'a hanger holding the axle in a ball bearing, welded to the frame (typical of a rental kart)', parts: [
        P(`hanger housing ${side}`, { box: [0.08, h, 0.05] }, [a.x, cy, zf], { mat: 'steel-low', color: dark, finish: 'paint', item: 'bearing-hanger-body', joins: [`main rail ${s > 0 ? 'right' : 'left'}`], fixed: 'welded down onto its rail', cuts: [{ r: rO, depth: 0.052, at: [0, y - cy, 0.026], dir: [0, 0, -1] }] }),
        use('bearing 6206', [a.x, y, zf], { rot: [PI / 2, 0, 0], name: `axle bearing ${side}`, passes: [axleNm], fixed: 'pressed into its hanger, the axle through its inner ring' })] }));
    }
    else if (k === 'pivot') { if (s > 0) out.push(P(`axle pivot ${end}`, { box: [0.1, Math.max(0.03, Math.abs(f.y - y) + 0.05), 2 * f.z + 0.04] }, [a.x, (f.y + y) / 2, 0], { mat: 'steel-low', color: dark, fill: 0.12, finish: 'paint', says: 'the axle pivots on one pin at its middle, so all four wheels keep the ground (typical)' })); }
    else if (k === 'strut' || k === 'wishbone') {
      // the corner as it is built: a knuckle round the hub's barrel (src cornerOf), its arms to the frame, its spring and
      // damper up to the body or the frame; on a unibody with struts, the subframe the arms pivot on, the steering rack
      // on it with a tie rod to each knuckle, and the anti-roll bar Toyota (and most makers) list, linked to each strut
      const cn = cornerOf(t, { ...m.rims, brake: atWheel(a) }, true), zW = a.track / 2, X = (dx: number) => (s > 0 ? dx : -dx), shellStrut = k === 'strut' && m.frame === 'shell';
      const st = strutOf(a, t, m), zA = cn.zA, armT = cn.armT, tieY = TIE_Y, iron = { mat: 'cast-iron', color: 0x3a3a3a, finish: 'cast' } as const;
      // (the knuckle's points in its own frame, the wheel's: out along +z; its x mirrored on the left, which is turned
      // half round, so what is behind the axle on one side is behind it on the other)
      // (a wishbone's two ball joints near the axle's height, so its arms leave the rim well inside its bead)
      const ball: V3 = [0, k === 'wishbone' ? -0.085 : -0.11, zA], up: V3 = [0, 0.085, zA];
      const kp: Part[] = [
        // (round the hub's barrel, from its upright out to 12 mm short of the hub's flange, inside the disc's hat)
        P('bearing housing', { lathe: [[cn.rB + 0.0005, cn.zK0], [cn.rK, cn.zK0], [cn.rK, cn.zK1], [cn.rB + 0.0005, cn.zK1], [cn.rB + 0.0005, cn.zK0]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], ...iron, passes: ['hub'], joint: 'bearing', says: 'its bore, the hub bearing pressed in it, the hub turning in that (typical)' }),
        // (its upright above and below its bearing's housing, the hub's barrel turning in the housing between them: cast
        // round its bore, not across it)
        ...[1, -1].map((e) => { const h2 = (k === 'wishbone' ? 0.15 : 0.18) / 2, y0 = cn.rB + 0.002; return P(e > 0 ? 'upright' : 'upright foot', { box: [0.09, h2 - y0, armT] }, [0, e * (y0 + h2) / 2, zA], { ...iron }); }),
        P('ball joint boss', { box: [0.045, 0.045, 0.045] }, [0, ball[1] + 0.008, zA], { ...iron, joint: 'ball', passes: [`lower arm ${side}`], says: 'the lower ball joint\'s seat: its stud in a taper in the knuckle (typical)' }),
      ];
      // (a strut's foot: its tube's bracket, welded to the tube outboard of it, clamps the knuckle's top arm; the arm goes
      // up and in from the upright to it, inside it)
      const footAt = (ly: number, lz: number): V3 => { const th = -s * Math.atan(st.lean); return [a.x, st.yb + ly * Math.cos(th) - lz * Math.sin(th), s * st.zb + ly * Math.sin(th) + lz * Math.cos(th)]; };
      const brk = footAt(0.04, s * 0.038), brkLocal: V3 = [0, brk[1] - y, s * brk[2] - zW];
      if (k === 'strut') kp.push(tube('strut arm', 0.014, [[0, 0.075, zA], [0, brkLocal[1] - 0.01, brkLocal[2] + 0.008]], 'cast-iron', 0x3a3a3a, { finish: 'cast' }));
      else kp.push(P('upper ball joint boss', { box: [0.045, 0.03, 0.045] }, [0, up[1], zA], { ...iron, joint: 'ball', passes: [`upper arm ${side}`] }));
      // (its two caliper ears, cast with it: from inside the upright out to where its caliper's carrier legs stand, in
      // the caliper's own frame (cornerOf), mirrored on the left as the wheel's caliper is)
      if (atWheel(a)?.kind === 'disc' && cn.r > 0) { const ca = s < 0 ? PI - cn.ca0 : cn.ca0, r1 = cn.r + 0.016; for (const e of [-1, 1]) { const yL = e * (cn.ch / 2 + cn.legW / 2); kp.push(P('caliper ear', { box: [r1, cn.legW, armT] }, [Math.cos(ca) * (r1 / 2) - Math.sin(ca) * yL, Math.sin(ca) * (r1 / 2) + Math.cos(ca) * yL, zA], { rot: [0, 0, ca], ...iron })); } }
      // (its steering arm back from the upright's edge, clear of the hub's barrel through it, at its tie rod's height: the
      // rack's, which runs low enough that its bellows clear the rails over them)
      // (from 3 mm outside the hub's barrel, whatever its size, back to 135 mm behind the axle)
      if (shellStrut) { const xi = cn.rB + 0.003, xo = 0.135; kp.push(P('steering arm', { box: [xo - xi, 0.03, armT] }, [X(-(xi + xo) / 2), tieY, zA], { ...iron, passes: [`tie rod ${side}`] })); }
      const wheelName = `${end} ${s > 0 ? 'right' : 'left'} wheel`, upright = `${side} upright`;
      // (the knuckle, its strut's tube and its caliper one link: they steer and rise together, the wheel turning in it)
      out.push(P(`knuckle ${side}`, undefined, [a.x, y, s * zW], { mat: 'cast-iron', movesWith: wheelName, link: upright, ...(s < 0 ? { rot: [0, PI, 0] as V3 } : {}), says: 'the upright the wheel turns on: cast iron, its bearing round the hub, its arms to the strut, the lower ball joint and the steering (typical)', parts: kp }));
      const B: V3 = [a.x, y + ball[1], s * (zW + zA)];
      if (k === 'strut') {
        // the strut, from its foot clamped on the knuckle up to its top mount under its tower: its damper's tube up to its
        // spring's seat, its rod from there, the spring wound round both from the seat up to the mount
        const Lt = (st.top - 0.005 - st.yb) / Math.cos(Math.atan(st.lean)), seat = (st.ySeat - st.yb) / Math.cos(Math.atan(st.lean)), Ls = Math.max(0.12, Lt - 0.03 - seat), tL = seat + 0.01, pB = Math.max(0.012 + travelOf(a).bump + 0.01, tL - 0.02 - 0.012 - 0.17);
        out.push(P(`strut ${side}`, undefined, [a.x, st.yb, s * st.zb], { mat: 'steel-alloy', link: upright, rot: [-s * Math.atan(st.lean), 0, 0], says: 'a MacPherson strut: its damper, its spring round it, its top mount bolted under its tower (typical)', parts: [
          // (its tube, the bracket on it, its spring and the seat steer with the wheel; its rod and top mount stay with the body)
          // (its tube hollow: a 32 mm bore its piston runs in, a guide and seal at its top that its rod slides through; the rod's
          // piston low enough in the bore that it stays in at full rebound and is clear of the tube's foot at full bump)
          P('damper tube', { lathe: [[0, 0], [0.025, 0], [0.025, tL], [0.011, tL], [0.011, tL - 0.02], [0.016, tL - 0.02], [0.016, 0.012], [0, 0.012], [0, 0]] }, [0, 0, 0], { mat: 'steel-alloy', color: 0x3a3a3a, finish: 'paint', movesWith: wheelName, joint: 'slide', says: 'its damper\'s tube: a 32 mm bore, its rod\'s guide and seal at its top (typical)' }),
          P('strut bracket', { box: [0.05, 0.07, 0.03] }, [0, 0.04, s * 0.038], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', passes: ['strut arm'], fixed: 'welded to its tube', movesWith: wheelName, says: 'welded to its tube, clamping the knuckle with two bolts (typical)' }),
          P('spring seat', { lathe: [[0.025, 0], [0.064, 0], [0.064, 0.004], [0.025, 0.004], [0.025, 0]] }, [0, seat - 0.004, 0], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', fixed: 'welded to its tube', movesWith: wheelName }),
          P('piston', { lathe: [[0, 0], [0.016, 0], [0.016, 0.012], [0, 0.012], [0, 0]] }, [0, pB, 0], { mat: 'steel-alloy', color: 0x8a8e92, finish: 'plate', link: `${side} strut rod`, fixed: 'nutted onto the foot of its rod', says: 'its damper\'s piston, running in the tube\'s bore (typical)' }),
          P('piston rod', { lathe: [[0, 0], [0.011, 0], [0.011, Lt - 0.003 - pB - 0.012], [0, Lt - 0.003 - pB - 0.012], [0, 0]] }, [0, pB + 0.012, 0], { mat: 'steel-alloy', color: 0xb0b4ba, finish: 'chrome', link: `${side} strut rod`, fixed: 'its top through its top mount\'s bearing, nutted there (the nut not drawn)', says: `its damper's rod, 22 mm, sliding and turning in the tube's guide and seal: ${Math.round((tL - 0.02 - pB - 0.012) * 1000)} mm of it in the tube at ride height (typical)` }),
          P('top mount', { lathe: [[0.011, 0], [0.064, 0], [0.064, 0.03], [0.011, 0.03], [0.011, 0]] }, [0, Lt - 0.03, 0], { mat: 'rubber', color: 0x161616, finish: 'texture', link: `${side} strut rod`, joint: 'mount', fixed: 'bolted under its strut tower', says: 'its top mount: a bearing in rubber round its rod, bolted under the tower (typical)' }),
          { ...coil('coil spring', 0.054, 0.006, Ls, 6, { item: `spring d12 D120 L${Math.round(Ls * 1000)} n6`, fixed: 'seated between its seat and its top mount', movesWith: wheelName, joint: 'spring', says: 'a coil spring round the damper, wound clear of it, seated over the tyre (typical)' }), at: [0, seat + Ls / 2, 0] as V3 }] }));
        // (its top plate from the inner wheelhouse out, as the apron's top, where the body has one: not across it)
        const zWb = Math.min(a.track / 2 - t.W / 2 - 0.04, a.track / 2 - (t.W / 2) * Math.cos(travelOf(a).steer) - (t.D / 2 + 0.03) * Math.sin(travelOf(a).steer) - 0.025), tz0 = m.lines ? Math.max(st.zt - 0.09, zWb + 0.003) : st.zt - 0.09, tz1 = st.zt + 0.09;
        // (square to the strut, as its top mount sits under it: leaning with it; a pressed top 12 mm deep with its flanges, its
        // mount bolted to its underside)
        out.push(P(`strut tower ${side}`, { box: [0.18, 0.012, tz1 - tz0] }, [a.x, st.top + 0.001 + ((tz0 + tz1) / 2 - st.zt) * st.lean, s * (tz0 + tz1) / 2], { rot: [-s * Math.atan(st.lean), 0, 0], mat: 'steel-low', color: m.color, shell: 0.0015, make: 'pressed', finish: 'paint', passes: ['piston rod', 'top mount'] }), ...(m.lines ? [] : [P(`strut tower wall ${side}`, { box: [0.18, Math.max(0.05, st.top - Math.max(f.y, y + 0.05)), 0.02] }, [a.x, (st.top + Math.max(f.y, y + 0.05)) / 2, s * (st.zt - 0.1)], { mat: 'steel-low', color: m.color, shell: 0.0015, make: 'pressed', finish: 'paint' })]));
      } else {
        // a wishbone's: its upper arm from the knuckle's top joint to the frame, its shock from the lower arm up to the frame
        for (const dx of [-0.14, 0.14]) out.push(tube(`upper arm ${side}`, 0.011, [[a.x + dx * 0.15, y + up[1], s * (zW + zA)], [a.x + dx, f.y + 0.14, zf * 0.92]], 'steel-low', dark, { finish: 'paint' }));
        const sb: V3 = [a.x, B[1] + (f.y - B[1]) * 0.55 + 0.03, B[2] + (zf - B[2]) * 0.55], stp: V3 = [a.x, f.y + 0.28, zf * 0.85];
        out.push(P(`shock ${side}`, { cyl: [0.022, Math.hypot(stp[1] - sb[1], stp[2] - sb[2])] }, [a.x, (sb[1] + stp[1]) / 2, (sb[2] + stp[2]) / 2], { rot: [Math.atan2(stp[2] - sb[2], stp[1] - sb[1]) * -1, 0, 0], mat: 'steel-alloy', color: 0x3a3a3a, fill: 0.5, finish: 'paint', parts: [{ ...coil('coil spring', 0.04, 0.005, Math.hypot(stp[1] - sb[1], stp[2] - sb[2]) * 0.6, 7, { says: 'a coil-over spring round the shock (typical)' }), at: [0, 0.03, 0] as V3 }] }));
      }
      // its lower arm: on a unibody's subframe, an L from its ball joint across to a front bush and back to a rear one
      // (typical of a strut car); else two links to the frame
      const yP = y - 0.1, zP = Math.max(0.22, zW - 0.42);
      if (shellStrut) {
        // (each bush outboard of the subframe's side, bearing on its face in a bracket: the front one along the car, the
        // rear one upright, as on an L-arm (typical); the arm's ends in their bushes)
        const F: V3 = [a.x + 0.03, yP, s * zP], R2: V3 = [a.x - 0.3, yP, s * (zP + 0.008)], sub = `subframe side ${s > 0 ? 'right' : 'left'}`, Bj: V3 = [B[0], y + ball[1] + 0.008 - 0.0225 - 0.015, B[2]];
        out.push(P(`lower arm ${side}`, undefined, [0, 0, 0], { link: `${side} lower arm`, says: 'its lower control arm, pressed steel, an L on two rubber bushes (typical)', parts: [
          // (one pressing, an L: from its front bush out to the ball joint and back in to its rear bush)
          // (pressed, so bent tight at its corner, 20 mm: its ball joint's housing is in that corner, not 30 mm off the arc a
          // tube bender's four diameters would round it to)
          // (its corner's control point set out along the corner's bisector so the bend itself runs through the joint's housing,
          // 6 mm under its middle, clear of the knuckle's boss over it)
          ((): Part => { const A: V3 = [F[0], F[1], s * (zP + 0.022)], C: V3 = [a.x - 0.12, yP + 0.003, s * (zP + 0.12)], Rb = 0.02, u1 = unitV(subV(A, Bj)), u2 = unitV(subV(C, Bj)), cosI = Math.max(-0.999, Math.min(0.999, u1[0] * u2[0] + u1[1] * u2[1] + u1[2] * u2[2])), half = Math.acos(cosI) / 2, out2 = Rb / Math.sin(half) - Rb, bis = unitV([u1[0] + u2[0], u1[1] + u2[1], u1[2] + u2[2]]), K: V3 = [Bj[0] - bis[0] * out2, Bj[1] - bis[1] * out2 - 0.006, Bj[2] - bis[2] * out2];
            return { ...tube(`lower arm ${side} pressing`, 0.014, [A, K, C, R2], 'steel-low', dark, { finish: 'paint' }), shape: { tube: { r: 0.014, pts: [A, K, C, R2], wall: 0.0014, bend: Rb } } }; })(),
          // (its ball joint pressed into the arm's corner under the knuckle, its stud up into the knuckle's boss)
          P('lower ball joint', { cyl: [0.022, 0.03] }, Bj, { mat: 'steel-alloy', color: 0x3a3c3e, finish: 'plate', joint: 'ball', passes: [`lower arm ${side} pressing`], fixed: 'its housing pressed into the corner of its arm\'s pressing', says: 'its lower ball joint: a ball stud in a housing pressed into the arm, the stud in a taper in the knuckle (typical)' }),
          P('front bush', { cyl: [0.026, 0.05] }, F, { rot: [0, 0, PI / 2], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'bush', passes: [`lower arm ${side} pressing`, sub] }),
          P('rear bush', { cyl: [0.034, 0.05] }, R2, { mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'bush', passes: [`lower arm ${side} pressing`, sub] })] }));
        // the tie rod from the rack's inner ball joint out to the steering arm. The rack's housing ends at zH; its bar stands
        // out of it by its stroke (70 mm each way, typical) and a little more, so at full lock its inner joint stops short of
        // the housing; the joint's housing is screwed on the bar's end, the tie rod comes out of it, and the bellows run
        // from the housing's end to the tie rod, over the joint, so they stretch and fold with the stroke
        const rk = rackOf(m, a, t), zH = rk.zH, rackY = rk.y, rackX = rk.x, stroke = 0.07, zJ = zH + stroke + 0.005, zT = zJ + 0.034;
        out.push(tube(`tie rod ${side}`, 0.008, [[rackX, rackY, s * zT], [a.x - 0.115, rackY, s * (zW + zA)]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', link: `${side} tie rod`, joint: 'ball', says: 'its tie rod: a ball joint at each end, its inner one on the rack\'s end inside the bellows, its outer one\'s stud in the steering arm (typical)' }));
        // the anti-roll bar's link, from its arm's end up to a bracket on the strut's tube behind it
        const lz = st.zAt(st.yb + 0.12), lt = footAt(0.12 / Math.cos(Math.atan(st.lean)), 0);
        out.push(tube(`stabiliser link ${side}`, 0.006, [[a.x - 0.05, yP + 0.07, s * lz], [a.x - 0.05, lt[1], s * lz]], 'steel-low', dark, { finish: 'paint', link: `${side} stabiliser link`, joint: 'ball', says: 'its link to the anti-roll bar: a ball joint at each end (typical)' }));
        out.push(P(`stabiliser link bracket ${side}`, { box: [0.034, 0.02, 0.02] }, [a.x - 0.042, lt[1] - 0.004, s * lz], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', passes: [`stabiliser link ${side}`], link: upright, fixed: 'welded to the strut\'s tube', says: 'welded to the strut\'s tube (typical)' }));
        if (s > 0) {
          // (once: the subframe, under the arms' bushes and behind the engine; the rack on its cross member; the bar behind)
          // (its sides inboard of the arms' bushes, each bush bearing on a side's outer face in its bracket)
          const zS = zP - 0.026 - 0.03, xC = a.x - 0.15, yC = yP + 0.07;
          out.push(P('front subframe', undefined, [0, 0, 0], { says: 'the front subframe: pressed steel, bolted under the body, the arms, the rack and the anti-roll bar on it (typical)', parts: [
            ...[-1, 1].map((sd) => P(`subframe side ${sd > 0 ? 'right' : 'left'}`, { box: [0.42, 0.05, 0.06] }, [a.x - 0.15, yP, sd * zS], { mat: 'steel-low', color: dark, fill: 0.12, finish: 'paint' })),
            P('subframe cross member', { box: [0.06, 0.04, 2 * zS + 0.06] }, [xC, yC, 0], { mat: 'steel-low', color: dark, fill: 0.15, finish: 'paint' }),
            ...[-1, 1].map((sd) => P('subframe riser', { box: [0.06, yC - 0.02 - (yP + 0.025), 0.06] }, [xC, (yC - 0.02 + yP + 0.025) / 2, sd * zS], { mat: 'steel-low', color: dark, fill: 0.15, finish: 'paint', fixed: 'welded between the side and the cross member' }))] }));
          // (the rack itself its own link, sliding in a bush at each end of its housing: on a real rack one end is held by the
          // pinion and its yoke, not drawn; its teeth are not drawn either)
          const sideOf = (sd: number) => sd > 0 ? 'right' : 'left';
          out.push(P('steering rack', undefined, [0, 0, 0], { mat: 'al-a380', says: 'its rack and pinion, on the subframe, with electric power steering (Toyota: EPS)', parts: [
            tube('rack housing', 0.022, [[rackX, rackY, -zH], [rackX, rackY, zH]], 'al-a380', 0x5a5c5e, { finish: 'cast' }, 0.0035),
            tube('rack', 0.0125, [[rackX, rackY, -zJ], [rackX, rackY, zJ]], 'steel-alloy', 0x8a8c8e, { finish: 'plate', link: `${end} steering rack`, says: 'its rack: a 25 mm steel bar, toothed where the pinion meets it (the teeth not drawn), sliding 70 mm each way (typical)' }, 0.0125),
            ...[-1, 1].map((sd) => P(`rack bush ${sideOf(sd)}`, { lathe: [[0.0125, -0.02], [0.0185, -0.02], [0.0185, 0], [0.0125, 0], [0.0125, -0.02]] }, [rackX, rackY, sd * zH], { rot: [sd * PI / 2, 0, 0], mat: 'pom', color: 0xd8d4c8, finish: 'texture', joint: 'slide', passes: ['rack'], fixed: 'pressed into the end of its housing', says: 'a plastic bush the rack slides in, pressed into its housing\'s end (typical)' })),
            ...[-1, 1].map((sd) => P(`inner tie rod joint ${sideOf(sd)}`, { cyl: [0.017, 0.034] }, [rackX, rackY, sd * (zJ + 0.017)], { rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x6a6c6e, finish: 'plate', link: `${end} steering rack`, joint: 'ball', fixed: 'screwed onto the end of its rack', says: 'its tie rod\'s inner ball joint: a ball in a housing screwed onto the rack\'s end (typical)' })),
            ...[-1, 1].map((sd) => P(`rack bellows ${sideOf(sd)}`, { lathe: [[0.022, -0.016], [0.022, 0], [0.026, 0.012], [0.021, 0.026], [0.026, 0.04], [0.021, 0.054], [0.026, 0.068], [0.021, 0.082], [0.025, 0.094], [0.02, 0.11], [0.008, 0.118], [0.008, 0.132]] }, [rackX, rackY, sd * zH], { rot: [sd * PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'cover', passes: [`tie rod front ${sideOf(sd)}`, 'rack housing', 'rack'], fixed: 'clamped over the end of its housing and onto its tie rod', says: 'its bellows: clamped over the housing\'s end and onto the tie rod, over the inner ball joint, folding and stretching with the rack\'s stroke (typical)' })),
            // (each clamp a rubber bush round the housing in a steel strap, the strap on a plate bolted down to the cross member:
            // the plate as thick as the rack stands over the cross member, less the bush and the strap)
            // (as thick as the room under the housing allows: its strap's foot on the cross member, or on a plate there where
            // the rack stands higher)
            ...[-1, 1].flatMap((sd) => { const zc = sd * zH * 0.7, g = rackY - 0.022 - (yC + 0.02), rB = 0.022 + Math.max(0.0025, Math.min(0.008, (g - 0.0015) * 0.55)), rS = Math.min(rB + 0.003, 0.022 + g), tP = 0.022 + g - rS, onPlate = tP >= 0.002;
              return [P('rack mount bush', { lathe: [[0.022, -0.02], [rB, -0.02], [rB, 0.02], [0.022, 0.02], [0.022, -0.02]] }, [rackX, rackY, zc], { rot: [PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'mount', fixed: 'clamped round its housing by its strap', says: 'a rubber bush round the rack\'s housing (typical)' }),
                P('rack mount strap', { lathe: [[rB, -0.015], [rS, -0.015], [rS, 0.015], [rB, 0.015], [rB, -0.015]] }, [rackX, rackY, zc], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', fixed: onPlate ? 'welded at its foot to its plate' : 'bolted down by its flanges to the subframe cross member (two M10 bolts; the flanges and bolts not drawn)', says: 'a steel strap round its bush (typical)' }),
                ...(onPlate ? [P('rack mount plate', { box: [0.07, tP, 0.05] }, [rackX, yC + 0.02 + tP / 2, zc], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', fixed: 'bolted down to the subframe cross member by two M10 bolts (not drawn)', says: 'its clamp\'s plate, bolted to the cross member (typical)' })] : [])]; })] }));
          const xb = xC - 0.03 - 0.011 - 0.004;
          // (behind the cross member to past its ends, then forward to its links)
          out.push(tube('anti-roll bar', 0.011, [[a.x - 0.05, yP + 0.07, -lz], [xb, yP + 0.07, -(zS + 0.07)], [xb, yP + 0.07, zS + 0.07], [a.x - 0.05, yP + 0.07, lz]], 'steel-spring', 0x1c1c1c, { finish: 'paint', link: `${end} anti-roll bar`, passes: [`stabiliser link ${end} right`, `stabiliser link ${end} left`], says: 'its front stabiliser bar (Toyota lists one), clamped to the subframe in two rubber bushes (typical)' }));
          for (const sd of [-1, 1]) out.push(P('anti-roll bar bush', { box: [0.03, 0.036, 0.04] }, [xC - 0.03 - 0.013, yP + 0.07, sd * (zS - 0.12)], { mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'bush', passes: ['anti-roll bar', 'subframe cross member'], says: 'a rubber bush the bar turns in, clamped to the subframe (typical)' }));
        }
      } else for (const dx of [-0.16, 0.16]) out.push(tube(`lower arm ${side}`, 0.012, [[a.x + dx * 0.15, B[1], B[2]], [a.x + dx, f.y, zf]], 'steel-low', dark, { finish: 'paint' }));
    } else if (k === 'beam') {
      // a twist-beam axle, one rigid link with its wheels' spindles and anchor plates: each trailing arm welded to its axle
      // carrier's inner face just ahead of the spindle, in along the axle 50 mm, then forward and in to its pivot 450 mm
      // ahead (typical); the beam across between the arms; a spring on a pad on each arm up to the body; a damper behind
      // the axle up to the body. What holds it to the body (the pivots' brackets, the springs' seats, the dampers' mounts,
      // the rails they hang from) is the body's own, fitted to it (rearFrame)
      const cn = cornerOf(t, { ...m.rims, brake: atWheel(a), plate: !a.drive }), link = `${end} twist beam`, zc = a.track / 2 + cn.zA - cn.armT / 2, xp = a.x + 0.45, yp = f.y + 0.035, zp = Math.abs(zf);
      // (its last 30 mm square to its sleeve, so its end meets the sleeve along a line, not edge first)
      const P0: V3 = [a.x + 0.045, y, s * zc], P1: V3 = [a.x + 0.045, y, s * (zc - 0.05)], P2: V3 = [xp - 0.068, yp, s * zp], P3: V3 = [xp - 0.0381, yp, s * zp], armAt = (x: number): V3 => { const u = Math.min(1, (x - P1[0]) / (P2[0] - P1[0])); return [x, P1[1] + (P2[1] - P1[1]) * u, P1[2] + (P2[2] - P1[2]) * u]; };
      out.push(tube(`trailing arm ${side}`, 0.025, [P0, P1, P2, P3], 'steel-low', dark, { finish: 'paint', link, fixed: 'welded to its axle carrier and its pivot sleeve', says: 'a trailing arm of its twist-beam axle: pressed steel tube, from its axle carrier at the wheel forward to its pivot (typical)' }));
      // (its pivot: a steel sleeve welded across the arm's front end, a rubber bush pressed in it, turning on a bolt across the car)
      out.push(P(`pivot sleeve ${side}`, { lathe: [[0.032, -0.026], [0.038, -0.026], [0.038, 0.026], [0.032, 0.026], [0.032, -0.026]] }, [xp, yp, s * zp], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: dark, finish: 'paint', link, fixed: 'welded across the front end of its trailing arm', says: 'the sleeve its pivot bush is pressed into, 4 mm short of the bush\'s ends a side so only the bush\'s inner tube meets the bracket (typical)' }),
        P(`pivot bush ${side}`, { lathe: [[0.008, -0.03], [0.032, -0.03], [0.032, 0.03], [0.008, 0.03], [0.008, -0.03]] }, [xp, yp, s * zp], { rot: [PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', link, joint: 'bush', passes: [`pivot bolt ${side}`], fixed: 'pressed into its sleeve', says: 'its pivot bush: rubber bonded round a steel tube, pressed into the arm\'s sleeve, its axis across the car (typical)' }));
      if (s > 0) { const ab = armAt(a.x + 0.15), zE = Math.min(Math.abs(armAt(a.x + 0.118)[2]), Math.abs(armAt(a.x + 0.182)[2])) - 0.0252; out.push(tube(`twist beam ${end}`, 0.032, [[a.x + 0.15, ab[1], -zE], [a.x + 0.15, ab[1], zE]], 'steel-low', dark, { finish: 'paint', link, fixed: 'welded to its trailing arms', says: 'a torsion beam joining its trailing arms, twisting as one wheel rises (typical)' })); }
      // (its spring on a pad hung from the arm's inner side between the wheel and the beam, up to a seat under the floor
      // over the axle, the floor the rear seat's (the body's: rearFrame): six turns of 12 mm wire, 120 mm across, wound
      // clear of the arm by 20 mm)
      const fl = floorOf(m), ovB = overAxle(m), yTop = fl ? fl.top : ovB ? ovB.top : y + 0.18, yUnder = yTop - 0.03, xs = a.x + 0.05, aIn = Math.abs(armAt(xs)[2]) - 0.025, zs = aIn - 0.08, yPad = y - 0.046, Ls = yUnder - 0.01 - yPad;
      // (the web hung under the arm, its top on the arm's underside, the pad under the web)
      const aMid = aIn + 0.025, aBot = Math.min(armAt(xs - 0.025)[1], armAt(xs + 0.025)[1]) - 0.025;
      out.push(P(`spring pad ${side}`, { box: [0.13, 0.008, aMid + 0.01 - (zs - 0.07)] }, [xs, yPad - 0.004, s * ((aMid + 0.01 + zs - 0.07) / 2)], { mat: 'steel-low', color: dark, finish: 'paint', link, fixed: 'welded under its web', says: 'its spring\'s lower seat: a pressed pad (typical)' }),
        P(`spring pad web ${side}`, { box: [0.05, aBot - yPad, 0.02] }, [xs, (aBot + yPad) / 2, s * aMid], { mat: 'steel-low', color: dark, finish: 'paint', link, fixed: 'welded under its trailing arm, on its pad', says: 'the web its spring\'s pad hangs from under the arm (typical)' }));
      out.push({ ...coil(`spring ${side}`, 0.054, 0.006, Ls, 6, { item: `spring d12 D120 L${Math.round(Ls * 1000)} n6`, link, joint: 'spring', says: `its rear coil spring: six turns of 12 mm wire, 120 mm across, ${Math.round(Ls * 1000)} mm long as fitted, between its pad on the arm and its seat under the floor (typical)` }), at: [xs, yPad + Ls / 2, s * zs] as V3 });
      // (its damper behind the axle, clear of the rear seat's back, upright: its lower eye in a bush on a bracket on the
      // carrier's inner face, its tube rising with the axle up through an opening in the trunk's floor into a turret in the
      // trunk's corner, its rod's top in a rubber mount bolted under the turret's top. Behind the axle it moves more than the
      // wheel does, by its distance from the pivots over the wheel's; its tube as long as its stroke (the wheel's bump and as
      // much rebound, at that ratio) and 90 mm more for its guide, piston and foot valve; at full bump its tube meets the
      // bump stop on its rod under the mount; its piston 10 mm off the tube's foot there and 36 mm under the guide at full
      // rebound (typical)
      const zWall = a.track / 2 - t.W / 2 - 0.04, xd = a.x - 0.115, eyeY = y - 0.055, eyeZ0 = zWall - 0.04, eyeZ = eyeZ0 - 0.0175, ratio = (xp - xd) / (xp - a.x), bumpD = travelOf(a).bump * ratio, tubeL = 2 * bumpD + 0.09, Lm = 0.018 + tubeL + bumpD + 0.025, pB = 0.04 + bumpD;
      // (its bracket an L: a plate on the carrier's face, an arm from it back and in to the eye)
      out.push(P(`damper bracket ${side}`, { box: [0.045, 0.04, 0.012] }, [a.x - 0.0525, eyeY, s * (zc - 0.006)], { mat: 'steel-low', color: dark, finish: 'paint', link, fixed: 'welded to the inner face of its axle carrier', says: 'its damper\'s lower bracket (typical)' }),
        P(`damper bracket arm ${side}`, { box: [0.105, 0.03, zc - 0.012 - eyeZ0] }, [a.x - 0.0825, eyeY, s * ((zc - 0.012 + eyeZ0) / 2)], { mat: 'steel-low', color: dark, finish: 'paint', link, fixed: 'welded to its damper bracket', says: 'the arm of its damper\'s lower bracket (typical)' }),
        P(`damper eye ${side}`, { cyl: [0.018, 0.035] }, [xd, eyeY, s * eyeZ], { rot: [PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', link, joint: 'bush', fixed: 'bolted to its damper bracket arm', says: 'the bush in its damper\'s lower eye (typical)' }),
        P(`rear damper ${side}`, undefined, [xd, eyeY, s * eyeZ], { link, says: `a twin-tube damper: ${Math.round(tubeL * 1000)} mm body, ${Math.round(2 * bumpD * 1000)} mm stroke, moving ${ratio.toFixed(2)} times its wheel (typical)`, parts: [
          P('damper tube', { lathe: [[0, 0.018], [0.024, 0.018], [0.024, 0.018 + tubeL], [0.0075, 0.018 + tubeL], [0.0075, tubeL - 0.002], [0.0135, tubeL - 0.002], [0.0135, 0.03], [0, 0.03], [0, 0.018]] }, [0, 0, 0], { mat: 'steel-alloy', color: 0x3a3a3a, finish: 'paint', link, joint: 'slide', fixed: 'welded to its eye', says: 'its damper\'s body: a 27 mm bore inside its outer tube, its rod\'s guide and seal at its top (typical)' }),
          P('piston', { lathe: [[0, 0], [0.0135, 0], [0.0135, 0.012], [0, 0.012], [0, 0]] }, [0, pB, 0], { mat: 'steel-alloy', color: 0x8a8e92, finish: 'plate', link: `${side} damper rod`, fixed: 'nutted onto the foot of its rod', says: 'its damper\'s piston, running in the bore (typical)' }),
          P('piston rod', { lathe: [[0, 0], [0.0075, 0], [0.0075, Lm + 0.017 - pB - 0.012], [0, Lm + 0.017 - pB - 0.012], [0, 0]] }, [0, pB + 0.012, 0], { mat: 'steel-alloy', color: 0xb8bcc0, finish: 'chrome', link: `${side} damper rod`, fixed: 'its top through its top mount, nutted there (the nut not drawn)', says: `its damper's piston rod, 15 mm, sliding in its tube's guide and seal: ${Math.round((0.018 + tubeL - 0.02 - pB - 0.012) * 1000)} mm of it in the tube at ride height (typical)` }),
          P('bump stop', { lathe: [[0.0075, 0], [0.02, 0], [0.02, 0.02], [0.0075, 0.02], [0.0075, 0]] }, [0, Lm - 0.02, 0], { mat: 'pu', color: 0xd8c890, finish: 'texture', link: `${side} damper rod`, fixed: 'pushed onto its rod up against its mount', says: `its bump stop: foam rubber on the rod, met by the tube's top at full bump, ${Math.round(bumpD * 1000)} mm of the damper's travel up (typical)` }),
          P('damper top mount', { lathe: [[0.0075, 0], [0.035, 0], [0.035, 0.02], [0.0075, 0.02], [0.0075, 0]] }, [0, Lm, 0], { mat: 'rubber', color: 0x161616, finish: 'texture', link: '', joint: 'mount', fixed: 'bolted under the top of its turret', says: 'its damper\'s top mount: rubber round its rod, bolted under its turret\'s top (typical)' })] }));
    } else if (k === 'swingarm') {
      out.push(tube(`swingarm ${side}`, 0.022, [[a.x, y, s * 0.15], [a.x + 0.5, f.y + 0.05, zf * 0.9]], 'steel-low', dark, { finish: 'paint' }));
      const sTop = m.upper ?? f.y + 0.3;
      if (s > 0) out.push(P(`rear shock ${end}`, { cyl: [0.025, Math.max(0.1, sTop - y)] }, [a.x + 0.08, (sTop + y) / 2, 0], { mat: 'steel-alloy', color: 0xc81e1e, fill: 0.5, finish: 'paint' }), P(`axle housing ${end}`, { cyl: [0.06, 0.32] }, [a.x, y, 0], { rot: [PI / 2, 0, 0], mat: 'cast-iron', color: dark, fill: 0.4, finish: 'cast' }));
    } else if (k === 'leaf' || k === 'air') {
      // under each rail: a pack of leaves clamped to the axle, or a trailing beam on an air spring
      const ar = Math.max(0.03, t.rim * 0.12) / 2;
      // (its pack clamped to the axle by U-bolts, rising and rolling with it; its main leaf's eyes in the body's hanger and
      // shackle, the spring's joints)
      if (k === 'leaf') for (let l = 0; l < 4; l++) { const L = 1.4 - l * 0.25; out.push(P(`leaf ${l + 1} ${side}`, { box: [L, 0.022, 0.09] }, [a.x, y + ar + 0.011 + (3 - l) * 0.022, zf], { mat: 'steel-spring', color: 0x1a1a1a, finish: 'paint', link: `${end} axle`, ...(l === 0 ? { joint: 'spring' } : {}), fixed: 'clamped to the leaf over it and to the axle under it by its U-bolts', says: l ? undefined : 'a taper-leaf spring pack (Freightliner Taperleaf, typical of its section)' })); }
      else { out.push(P(`trailing beam ${side}`, { box: [0.9, 0.09, 0.09] }, [a.x + 0.1, y + 0.06, zf], { mat: 'steel-alloy', color: 0x1a1a1a, finish: 'paint' }), P(`air spring ${side}`, { cyl: [0.13, Math.max(0.1, f.y - y - 0.12)] }, [a.x - 0.28, (f.y + y + 0.12) / 2, zf], { mat: 'rubber', color: 0x161616, shell: 0.008, finish: 'texture', says: 'an air spring (Freightliner Airliner)' }), P(`beam hanger ${side}`, { box: [0.12, Math.max(0.05, f.y - y), 0.1] }, [a.x + 0.55, (f.y + y) / 2 + 0.03, zf], { mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' })); }
      // (its main leaf's eyes hung from the body over it: a hanger ahead, a shackle behind, each from the leaf's top up to
      // the floor or the bed above it, or the frame where that is higher)
      if (k === 'leaf') { const lt = y + ar + 0.088, fl = floorOf(m), rail = Math.max(f.y, fl ? fl.top - 0.03 : m.lines?.bed ? Math.max(t.D + travelOf(a).bump, m.clearance + 0.4) + 0.045 : f.y);
        if (rail - lt > 0.02) for (const [dx, nm] of [[0.66, 'spring hanger'], [-0.66, 'spring shackle']] as const) out.push(P(`${nm} ${side}`, { box: [0.06, rail - lt, 0.1] }, [a.x + dx, (rail + lt) / 2, zf], { mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', joins: [`leaf 1 ${side}`], says: nm === 'spring hanger' ? 'the hanger its leaf\'s front eye pivots in (typical)' : 'the shackle its leaf\'s rear eye swings on, as the leaf flattens (typical)' })); }
    }
  }
  return out;
}

/** The machine made. */
export function makeMachine(m: Machine, pick: Pick = {}): Part {
  const out: Part[] = [], col = m.color, front = Math.max(...m.axles.map((a) => a.x)), rear = Math.min(...m.axles.map((a) => a.x)), c = m.clearance;
  const tyres = m.axles.map((a) => tyreOf(a.tyre)!), off = m.extras.includes('fenders') || m.kind === 'motorcycle';
  // wheels, on their axles
  m.axles.forEach((a, i) => {
    const t = tyres[i]!, sides = a.track > 0 ? [1, -1] : [0];
    for (const s of sides) {
      const nm = `${a.x === front ? 'front' : a.x === rear ? 'rear' : `axle ${i + 1}`}${s ? (s > 0 ? ' right' : ' left') : ''} wheel`;
      const kn0 = a.susp === 'strut' || a.susp === 'wishbone', d0 = Math.max(0.03, t.rim * 0.12);
      // (a single-track machine's driven wheel has its disc on the side away from its chain: the rear wheel turned round,
      // as a left wheel is, where the chain runs on the left)
      const away = a.track === 0 && !!a.drive && !!m.chain && m.chain.z < 0;
      const w = wheel(nm, t, { ...m.rims, ...(t.rim >= 0.49 ? { pattern: a.drive ? 'drive' as Tread : 'rib' as Tread } : {}), brake: atWheel(a), knobs: off, dual: a.dual, single: a.track === 0, left: s < 0 || away, knuckle: kn0, ...(kn0 && a.track > 0 ? { bore: a.drive ? 0.012 : d0 * 0.35 } : a.susp === 'beam' && a.track > 0 && !a.drive ? { bore: d0 * 0.35, axle: `${a.x === front ? "front" : a.x === rear ? "rear" : `axle ${i + 1}`} twist beam` } : {}) });
      const tr = travelOf(a); out.push({ ...w, at: [a.x, t.D / 2, (s * a.track) / 2], rot: s < 0 || away ? [0, PI, 0] : [0, 0, 0], ...(tr.steer || tr.bump ? { travel: tr } : {}) });
    }
    if (a.track === 0) { const d = 0.022; out.push(P(`${i === 0 ? 'front' : 'rear'} axle`, { cyl: [d / 2, 0.26] }, [a.x, t.D / 2, 0], { rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x9a9a9a, finish: 'plate', iface: [{ kind: 'shaft', role: 'provides', d }], says: 'a solid steel axle through the hub, clamped in the fork or the swingarm (typical: 22 mm front, 25 mm rear)' })); }
    if (a.track > 0) {
      // the axle runs into each hub; what it carries in torsion from its section and its steel (Tresca: shear at half
      // the yield, at a factor of 2)
      const d = Math.max(0.03, t.rim * 0.12), wall = Math.max(0.003, d * 0.1), r = d / 2, J = (PI / 2) * (r ** 4 - (r - wall) ** 4), fy = getMaterial('steel.4140-ann').yield, T = (fy / 2 / 2) * (J / r);
      const nm = `${i === 0 ? 'front' : i === m.axles.length - 1 ? 'rear' : `axle ${i + 1}`} axle`, carries = `a ${Math.round(d * 1000)} × ${Math.round(wall * 1000)} mm tube of AISI 4140 (yield ${Math.round(fy / 1e6)} MPa, ASM Handbook): it carries up to ${T.toFixed(0)} N·m in torsion at a factor of 2`;
      // a wheel hung on its own (a strut, a wishbone, a twist beam's arm) has no axle through it: a driven one is turned
      // by a drive shaft from the differential with a joint in a rubber boot at each end, an undriven one turns on a stub
      // spindle; only a rigid axle runs across from wheel to wheel
      // (a hub in a knuckle ends just through the knuckle's bearing, the drive shaft's outer joint in its boot against the
      // knuckle's inner face; elsewhere at its own length in)
      const end2 = a.x === front ? 'front' : a.x === rear ? 'rear' : `axle ${i + 1}`, kn = a.susp === 'strut' || a.susp === 'wishbone', cn = cornerOf(t, { ...m.rims, brake: atWheel(a) }, kn), y = t.D / 2, hubIn = a.track / 2 + cn.hubIn, bootAt = kn ? a.track / 2 + cn.zK0 - 0.003 : hubIn, indep = kn || a.susp === 'beam';
      // (a rigid axle on a car's or a truck's springs is its own link, rising and rolling on them; its wheels turn on its
      // ends; on a frame with no springs (a kart's), the frame's)
      if (!indep && t.rim >= 0.49) out.push({ ...heavyAxle({ name: nm, x: a.x, y, track: a.track, drive: !!a.drive, shaft: d, carry: { ...(a.susp === 'leaf' || a.susp === 'air' ? { link: `${end2} axle`, joint: 'bearing' as const } : {}) } }), iface: a.drive ? [{ kind: 'drive' as const, role: 'requires' as const, torque: 2 * 3.4 * 2500, says: 'a 40,000 lb tandem\'s axle: its shafts carry its ring gear\'s torque (typical)' }] : [] });
      else if (!indep) out.push(tube(nm, r, [[a.x, y, -a.track / 2], [a.x, y, a.track / 2]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', item: `tube ${Math.round(d * 1000)}x${Math.round(wall * 1000)}`, ...(a.susp === 'leaf' || a.susp === 'air' ? { link: `${end2} axle`, joint: 'bearing' } : {}), iface: [{ kind: 'shaft', role: 'provides', d }, ...(a.drive ? [{ kind: 'drive' as const, role: 'requires' as const, torque: T, says: carries }] : [])] }));
      else if (a.drive && a.susp !== 'beam') {
        // (from a transverse gearbox's faces, an electric unit's, or a differential's at the axle's middle)
        const b = i === 0 && across(m) ? bayOf(m, engineSize(powerAt(m), true).s) : null, du = m.power.kind === 'electric' && Math.abs(m.power.x - a.x) < 0.05, k2 = Math.min(1, t.D / 0.65), zL = b ? b.gb[0] : du ? EDU.gb[0] : -0.1 * k2, zR = b ? b.gb[1] : du ? EDU.gb[1] : 0.1 * k2, rs = Math.min(0.014, r * 0.6), sh: Part[] = [];
        const boot = (nm2: string, z0: number, dir: number): Part => P(nm2, { lathe: [[rs + 0.0005, 0], [0.042, 0.03], [0.036, 0.05], [0.03, 0.07], [rs + 0.0005, 0.1]] }, [a.x, y, z0], { rot: [dir * PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'cover', link: `${end2} ${dir * (nm2.startsWith('inner') ? 1 : -1) > 0 ? 'right' : 'left'} drive shaft`, passes: [`drive shaft ${dir * (nm2.startsWith('inner') ? 1 : -1) > 0 ? 'right' : 'left'}`, 'outer joint'], says: 'its joint\'s boot: a rubber bellows over a constant-velocity joint (typical)' });
        // (its inner joint a plunging tripod: a cup on the gearbox's side, turning in the gearbox's seal with its side gear,
        // the shaft's three-legged spider rolling in its bore; its boot clamped over the cup's mouth and onto the shaft)
        const inner = (z0: number, sd: number, room: number): Part[] => { const side = sd > 0 ? 'right' : 'left', rot: V3 = [sd * PI / 2, 0, 0], lk = `${end2} ${side} drive shaft`, ex = Math.max(0.03, Math.min(0.09, room - 0.075)), bt = (f: number) => 0.075 + ex * f;
          return [P('inner joint housing', { lathe: [[0, 0], [0.022, 0], [0.022, 0.012], [0.045, 0.02], [0.045, 0.075], [0.036, 0.075], [0.036, 0.025], [0, 0.025], [0, 0]] }, [a.x, y, z0], { rot, mat: 'steel-alloy', color: 0x4a4c4e, finish: 'cast', link: `${end2} ${side} inner joint`, joint: 'bearing', fixed: 'its stub splined into the differential\'s side gear through the gearbox\'s oil seal (the stub not drawn)', says: 'its inner joint\'s housing: a tripod joint\'s cup, turning with its side gear (typical)' }),
            P('inner joint spider', { lathe: [[rs, 0.035], [0.036, 0.035], [0.036, 0.055], [rs, 0.055], [rs, 0.035]] }, [a.x, y, z0], { rot, mat: 'steel-alloy', color: 0x6a6c6e, finish: 'plate', link: lk, joint: 'cv', fixed: 'splined on the end of its drive shaft, its three rollers in the cup\'s bore', says: 'its inner joint\'s spider and its three rollers, drawn as one ring (typical of a tripod joint)' }),
            P('inner joint boot', { lathe: [[0.0455, 0.055], [0.0455, 0.075], [0.049, bt(0.167)], [0.037, bt(0.389)], [0.03, bt(0.611)], [rs + 0.0005, bt(1)]] }, [a.x, y, z0], { rot, mat: 'neoprene', color: 0x161616, finish: 'texture', joint: 'cover', link: lk, fixed: 'clamped over the mouth of its cup, its small end on the shaft', says: 'its inner joint\'s boot: a rubber bellows clamped over the cup and onto the shaft (typical)' })]; };
        // (its outer joint's bell 2 mm in from the hub's inner end, its stub splined into the hub; its inner end in the
        // gearbox's side, 30 mm in)
        const Lst = cn.zSpig + 0.014 - (cn.hubIn - 0.002);
        const bell = (z: number, dir: number): Part => P('outer joint', { lathe: [[0, 0], [0.014, 0], [0.036, 0.004], [0.04, 0.025], [0.038, 0.045], [0.036, 0.05]] }, [a.x, y, z], { rot: [dir * PI / 2, 0, 0], mat: 'steel-alloy', color: 0x4a4c4e, finish: 'cast', link: `${end2} ${dir < 0 ? 'right' : 'left'} wheel`, joint: 'cv', fixed: 'splined into the hub, its nut on the hub\'s outer face', says: 'its outer constant-velocity joint (typical)', parts: [P('outer joint stub', { cyl: [0.012, Lst] }, [0, -Lst / 2, 0], { mat: 'steel-alloy', color: 0x4a4c4e, finish: 'plate', fixed: 'forged with its bell', says: 'its splined stub, through the hub\'s bore to its nut on the spigot (typical)' })] });
        // (its outer joint: in the bell, the inner race splined on the shaft's end, with its cage and six balls, drawn as one
        // ring meeting the bell where it is widest; the boot's big end clamped over the bell's mouth, its small end on the shaft)
        const race = (z: number, dir: number, sd: number): Part => P('outer joint race', { lathe: [[rs, 0.012], [0.028, 0.012], [0.0398, 0.025], [0.028, 0.038], [rs, 0.038], [rs, 0.012]] }, [a.x, y, z], { rot: [dir * PI / 2, 0, 0], mat: 'steel-alloy', color: 0x6a6c6e, finish: 'plate', link: `${end2} ${sd > 0 ? 'right' : 'left'} drive shaft`, joint: 'cv', passes: [`drive shaft ${sd > 0 ? 'right' : 'left'}`], fixed: 'splined on the end of its drive shaft, its balls and cage between it and its bell', says: 'its outer joint\'s inner race, cage and six balls, drawn as one ring (typical of a Rzeppa joint)' });
        const bootOut = (z0: number, dir: number, sd: number): Part => P('outer joint boot', { lathe: [[0.0385, 0], [0.042, 0.02], [0.034, 0.045], [0.024, 0.07], [rs + 0.0005, 0.095]] }, [a.x, y, z0], { rot: [dir * PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'cover', link: `${end2} ${sd > 0 ? 'right' : 'left'} drive shaft`, passes: [`drive shaft ${sd > 0 ? 'right' : 'left'}`], fixed: 'clamped over the mouth of its outer joint, its small end on the shaft', says: 'its outer joint\'s boot: a rubber bellows clamped over the joint\'s bell and onto the shaft (typical)' });
        for (const sd of [-1, 1]) { const z0 = sd > 0 ? zR : zL, zb0 = sd * (hubIn - 0.002), z1 = kn ? sd * (hubIn - 0.002 - 0.024) : sd * (Math.abs(sd * bootAt) - 0.04); sh.push(tube(`drive shaft ${sd > 0 ? 'right' : 'left'}`, rs, [[a.x, y, z0 + sd * 0.035], [a.x, y, z1]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', link: `${end2} ${sd > 0 ? 'right' : 'left'} drive shaft`, iface: [{ kind: 'shaft', role: 'provides', d }] }), ...inner(z0, sd, kn ? Math.abs(zb0) - 0.045 - 0.095 - 0.012 - Math.abs(z0) : Math.abs(sd * bootAt) - 0.1 - 0.012 - Math.abs(z0)), ...(kn ? [bell(zb0, -sd), race(zb0, -sd, sd), bootOut(zb0 - sd * 0.045, -sd, sd)] : [boot('outer joint boot', sd * bootAt, -sd)])); }
        // (a housing round its gears, mostly hollow: about a fifth of its box is iron, typical)
        if (!b && !du) { sh.push(P('differential', { box: [0.22 * k2, 0.18 * k2, 0.2 * k2] }, [a.x, y, 0], { mat: 'cast-iron', color: 0x3a3a3a, fill: 0.2, finish: 'cast', passes: ['drive shaft left', 'drive shaft right', 'inner joint boot'], says: 'its differential, a cast housing round its gears (typical)' })); }
        out.push(P(nm, undefined, [0, 0, 0], { parts: sh, iface: [{ kind: 'drive', role: 'requires', torque: T, says: carries }] }));
      } else { const bm = a.susp === 'beam', cp = bm ? cornerOf(t, { ...m.rims, brake: atWheel(a), plate: true }) : cn, zIn = bm ? a.track / 2 + cp.zA - cp.armT / 2 - 0.004 : hubIn - 0.012, zOut = bm ? a.track / 2 + cp.hubFace - 0.01 - 0.006 - 0.002 : hubIn + 0.03;
        // (a twist beam's: from its flange behind its axle carrier, through the carrier and the dust shield, into its bearing
        // in the hub's barrel, 2 mm short of the hub's closed end)
        out.push(P(nm, undefined, [0, 0, 0], { parts: [-1, 1].map((sd) => tube(`stub spindle ${sd > 0 ? 'right' : 'left'}`, r * 0.7, [[a.x, y, sd * zIn], [a.x, y, sd * zOut]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', joint: 'bearing', ...(bm ? { link: `${end2} twist beam` } : {}), fixed: kn ? 'clamped in its knuckle by its nut' : bm ? 'its flange bolted to its axle carrier through the dust shield' : 'bolted through its backing plate to its arm', iface: [{ kind: 'shaft', role: 'provides', d }], says: kn ? 'the end of the spindle its hub turns on in the knuckle\'s bearing, its nut on it (typical)' : 'the spindle its wheel turns on, its bearing in the hub, bolted through its anchor plate to its arm (typical)' })), ...(a.drive ? { iface: [{ kind: 'drive', role: 'requires', torque: T, says: carries }] } : {}) })); }
    }
  });
  const fR = tyres[0]!.D / 2, rR = tyres[tyres.length - 1]!.D / 2, fIn = m.axles[0]!.track / 2 - tyres[0]!.W / 2 - 0.04;
  let frameZ = (_x: number) => half * 0.8; const inner0 = Math.min(...m.axles.filter((a) => a.track > 0).map((a) => a.track / 2 - tyreOf(a.tyre)!.W / 2 - 0.04));
  // the frame
  const fx0 = rear - Math.max(0.1, (m.L / 2 + rear) * 0.6), fx1 = front + Math.max(0.1, (m.L / 2 - front) * 0.5), half = Math.max(0.12, Math.min(...m.axles.filter((a) => a.track > 0).map((a, i) => a.track / 2 - tyres[m.axles.indexOf(a)]!.W * 0.5 - 0.06), m.W / 2 - 0.1));
  // (a highway tractor's body, its fittings each drawn whole by fittings.ts: its cab and hood from its published length,
  // width and height, its cab's floor, cowl and roof lines typical of a conventional day cab)
  const tb: TruckBody | null = m.kind === 'truck' ? (() => { const cabBack = m.L / 2 - m.L * 0.45; return { front: m.L / 2, cabBack, cowlX: cabBack + 1.62, roofX: cabBack + 1.05, floorY: 1.2, cowlY: 2.05, H: m.H, wc: m.W / 2 - 0.12, half: m.W / 2 - 0.02, railY: tyres[0]!.D * 0.8 + 0.287 / 2, railZ: 0.43, railH: 0.287, railW: 0.085, railT: 0.011, fx0, fx1, steerX: m.axles[0]!.x, steerR: tyres[0]!.D / 2, color: col }; })() : null;
  if (m.frame === 'tube') {
    const r = 0.016, y = c + r, k5 = m.rails ?? [0.85, 1, 0.7, 0.55, 0.5], rail: [number, number][] = [[fx0, k5[0]], [rear, k5[1]], [front - 0.15, k5[2]], [fx1 - 0.08, k5[3]], [fx1, k5[4]]];
    const railZ = frameZ = (x: number) => { for (let i = 1; i < rail.length; i++) { const [x0, k0] = rail[i - 1]!, [x1, k1] = rail[i]!; if (x <= x1) return half * (k0 + ((k1 - k0) * (x - x0)) / (x1 - x0)); } return half * 0.5; };
    // (a tube welded to a rail ends coped to it: its end cut to the rail's round, meeting it all round its edge, 0.44 of
    // the rail's radius in from where the two centrelines cross for a tube of 0.9 its size)
    const rails = ['main rail left', 'main rail right'], reach = Math.sqrt(r * r - (r * 0.9) ** 2);
    for (const s of [-1, 1]) out.push(tube(`main rail ${s > 0 ? 'right' : 'left'}`, r, rail.map(([x, k], i) => [x, y + (i >= 3 ? (i - 2) * 0.04 : 0), s * half * k] as V3), 'steel-alloy', 0x2a2a2a, { item: 'tube 32x2' }));
    // (the cross tubes at the axles just clear of the bearing hangers, 80 mm long round each axle)
    for (const xx of [rear + 0.06, (front + rear) / 2, front - 0.06]) out.push(tube(`cross tube at ${xx.toFixed(2)} m`, r * 0.9, [[xx, y, -railZ(xx) + reach], [xx, y, railZ(xx) - reach]], 'steel-alloy', 0x2a2a2a, { item: 'tube 28x2', joins: rails, fixed: 'coped to its rails and welded round' }));
    // what the bodywork hangs from: a bracket out from each rail under each pod, the bumpers and the seat
    if (m.upper) for (const sd of [-1, 1]) {
      const yu = m.upper, zu = sd * half * 0.6, xs = [rear - 0.25, rear + 0.15, (front + rear) / 2, front - 0.1, front + 0.25];
      out.push(tube(`upper rail ${sd > 0 ? 'right' : 'left'}`, r, xs.map((xx) => [xx, yu, zu] as V3), 'steel-alloy', 0x2a2a2a, { item: 'tube 32x2' }));
      for (const xx of [rear + 0.15, front - 0.1]) out.push(tube('frame upright', r, [[xx, y, sd * railZ(xx)], [xx, yu, zu]], 'steel-alloy', 0x2a2a2a, { item: 'tube 32x2', joins: [...rails, `upper rail ${sd > 0 ? 'right' : 'left'}`], fixed: 'coped to its rails and welded round' }));
      if (sd > 0) for (const xx of [rear - 0.25, rear + 0.08, front + 0.25]) out.push(tube('upper cross tube', r * 0.9, [[xx, yu, -half * 0.6], [xx, yu, half * 0.6]], 'steel-alloy', 0x2a2a2a));
    }
    if (m.extras.includes('pods')) for (const sd of [-1, 1]) for (const xx of [rear + rR + 0.12, front - fR - 0.12]) out.push(tube('pod bracket', 0.01, [[xx, y, sd * railZ(xx)], [xx, y + 0.02, sd * (m.W / 2 - 0.13)]], 'steel-low', 0x2a2a2a));
    if (m.extras.includes('pods')) for (const sd of [-1, 1]) out.push(tube('bumper bracket', 0.012, [[fx0, y, sd * railZ(fx0)], [rear - rR - 0.08, y + 0.05, sd * railZ(fx0)]], 'steel-low', 0x2a2a2a));
  } else if (m.frame === 'ladder' && tb) {
    out.push(...ladderFrame(tb, [fx0 + 0.1, rear, (front + rear) / 2, front, fx1 - 0.1]));
  } else if (m.frame === 'ladder') {
    const hR = m.kind === 'truck' ? 0.287 : 0.1, wR = m.kind === 'truck' ? 0.085 : 0.05, y = (m.kind === 'truck' ? tyres[0]!.D * 0.8 : m.extras.includes('deck') ? c + 0.21 : Math.max(c, tyres[0]!.D * 0.42)) + hR / 2, z = m.kind === 'truck' ? 0.43 : half * 0.8;
    const tR = m.kind === 'truck' ? 0.011 : 0.004;
    for (const s of [-1, 1]) out.push(P(`frame rail ${s > 0 ? 'right' : 'left'}`, { box: [fx1 - fx0, hR, tR + wR * 0.25] }, [(fx0 + fx1) / 2, y, s * z], { mat: 'steel-alloy', color: 0x1a1a1a, fill: (tR * (hR + 2 * wR)) / (hR * (tR + wR * 0.25)), finish: 'paint', says: m.kind === 'truck' ? 'C-channel 11 × 85 × 287 mm (Freightliner)' : 'pressed C-channel, 4 mm (typical of small machines)' }));
    // (each cross member between the rails' inner faces, fixed at its ends: a truck's huck-bolted through gussets, as
    // heavy trucks' are, typical; a light ladder's welded)
    const zIn = z - (tR + wR * 0.25) / 2;
    for (const xx of [fx0 + 0.1, rear, (front + rear) / 2, front, fx1 - 0.1]) out.push(P('cross member', { box: [0.08, hR * 0.6, 2 * zIn] }, [xx, y, 0], { mat: 'steel-low', color: 0x1a1a1a, fill: 0.25, finish: 'paint', fixed: m.kind === 'truck' ? 'bolted to its frame rails through a gusset at each end (huck bolts; the gussets not drawn)' : 'welded between its frame rails' }));
  } else if (m.frame === 'shell') {
    // a unibody's floor: from its toe board behind the front wheels back under the cabin, a tunnel down its middle for
    // the exhaust, and (where it has a fuel tank) kicked up under the rear seat to a raised floor over the tank, the
    // tank beneath it outside the cabin (typical of a car)
    const inner = Math.min(...m.axles.map((a, i) => a.track / 2 - tyres[i]!.W / 2 - 0.04)), toe = front - tyres[0]!.D / 2 - 0.1, fl = floorOf(m), pk = packOf(m), tun = 0.11, t2 = 0.08;
    const back = fl ? fl.kick : pk ? pk.x0 : rear - 0.3, len = toe - back, says = 'its floor and sills: pressed steel, about 0.9 mm (typical)';
    // (on an electric car, on its battery pack, with no tunnel: nothing runs under its middle)
    if (pk) out.push(P('floor pan', { box: [len, t2, 2 * inner] }, [(toe + back) / 2, pk.y0 + pk.h + t2 / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'laid on its battery pack, bolted down through it', says: 'its floor, on its battery pack: pressed steel, about 0.9 mm (typical)' }));
    else {
      // (each floor pan a sheet, its top at the floor's height; its rails and cross members under it are the front
      // structure's, fitted to it)
      for (const sd of [-1, 1]) out.push(P(`floor pan ${sd > 0 ? 'right' : 'left'}`, { box: [len, 0.004, inner - tun] }, [(toe + back) / 2, c + 0.098, (sd * (inner + tun)) / 2], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded along its edges to the tunnel, the sill\'s inner, the toe board and the heel kick, and along its floor rail (the welds not drawn)', says }));
      out.push(P('tunnel', undefined, [0, 0, 0], { says: 'the tunnel down the floor\'s middle, the exhaust under it (typical)', parts: [P('tunnel top', { box: [len, 0.02, 2 * tun] }, [(toe + back) / 2, c + 0.18, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded along its flanges to the floor pans and to the tunnel\'s other pressings (the welds not drawn)' }), ...[-1, 1].map((sd) => P('tunnel side', { box: [len, 0.15, 0.01] }, [(toe + back) / 2, c + 0.095, sd * (tun - 0.005)], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded along its flanges to the floor pans and to the tunnel\'s other pressings (the welds not drawn)' }))] }));
    }
    // (over a rigid axle's leaves, behind the pack: its floor raised over them, a kick up to it from the floor ahead)
    // (raised only over what is under it; between it and the pack's end, the floor at the pack's height)
    const ov = overAxle(m); if (ov && !fl) { const y0 = pk ? pk.y0 + pk.h + t2 : c + 0.1; out.push(P('rear floor', { box: [ov.x1 - ov.x0, 0.03, 2 * inner] }, [(ov.x1 + ov.x0) / 2, ov.top - 0.015, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded to the heel kick, the trunk floor and the inner wheelhouses (the welds not drawn)', says: 'its floor raised over what is at its rear axle (its leaves, or its motor; typical)' }), P('heel kick', { box: [0.02, ov.top - 0.015 - y0, 2 * inner] }, [ov.x1 + 0.01, (ov.top - 0.015 + y0) / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded to the floor pans, the rear floor and the tunnel (the welds not drawn)', says: 'where its floor rises over its rear axle (typical)' }));
      // (over a twist beam's arms there, 30 mm over their top)
      // (its flanges lapped under the floor ahead and the kick behind, 10 mm, where they are spot-welded)
      if (pk && back > ov.x1 + 0.03) { const yb = beamFloor(m, ov.x1) ?? y0; out.push(P('rear floor pan', { box: [back + 0.01 - ov.x1 - 0.01, t2, 2 * inner] }, [(back + 0.01 + ov.x1 + 0.01) / 2, Math.max(y0, yb) - t2 / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded to the heel kick and the floor pan (the welds not drawn)', says: 'its floor between its pack and its rear axle (typical)' })); } }
    if (fl) {
      out.push(P('heel kick', { box: [0.02, fl.top - 0.03 - (c + 0.1), 2 * inner] }, [fl.kick - 0.01, (fl.top - 0.03 + c + 0.1) / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded to the floor pans, the rear floor and the tunnel (the welds not drawn)', says: 'where the floor rises to the rear seat, over the fuel tank (typical)' }));
      out.push(P('rear floor', { box: [fl.kick - fl.x0, 0.03, 2 * inner] }, [(fl.kick + fl.x0) / 2, fl.top - 0.015, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', fixed: 'spot-welded to the heel kick, the trunk floor and the inner wheelhouses (the welds not drawn)', says: 'the raised floor under the rear seat (typical)' }));
    }
  } else if (m.frame === 'backbone') {
    const head: V3 = [front - 0.32, m.H * 0.78, 0], pivot: V3 = [rear + 0.58, c + 0.3, 0], r = 0.017;
    for (const s of [-1, 1]) out.push(tube(`frame spar ${s > 0 ? 'right' : 'left'}`, r, [head, [head[0] - 0.25, head[1] - 0.06, s * 0.1], [pivot[0] + 0.05, pivot[1] + 0.25, s * 0.12], [pivot[0], pivot[1], s * 0.12]], 'al-6061', 0x9aa0a6, { finish: 'brushed', item: 'tube 34x2' }));
    out.push(tube('down tube', r, [[head[0], head[1] - 0.05, 0], [head[0] - 0.1, c + 0.25, 0], [pivot[0] + 0.05, c + 0.12, 0], [pivot[0], pivot[1], 0]], 'al-6061', 0x9aa0a6, { finish: 'brushed' }));
    out.push(tube('subframe', 0.011, [[pivot[0] + 0.05, pivot[1] + 0.25, 0.12], [rear - 0.05, m.seatH ? m.seatH - 0.12 : m.H * 0.6, 0.1], [rear - 0.05, m.seatH ? m.seatH - 0.12 : m.H * 0.6, -0.1], [pivot[0] + 0.05, pivot[1] + 0.25, -0.12]], 'al-6061', 0x9aa0a6, { finish: 'brushed' }));
    out.push(P('head tube', { cyl: [0.028, 0.18] }, head, { rot: [0, 0, m.rake ?? 0.47], mat: 'al-6061', color: 0x9aa0a6, shell: 0.004, finish: 'brushed' }));
    // the fork along the head angle down to the front axle; the swingarm from its pivot back to the rear axle
    const ft = tyres[0]!, rt = tyres[tyres.length - 1]!, axF: V3 = [front, ft.D / 2, 0], axR: V3 = [rear, rt.D / 2, 0];
    for (const s of [-1, 1]) out.push(tube(`fork leg ${s > 0 ? 'right' : 'left'}`, 0.024, [[head[0] + 0.03, head[1] + 0.08, s * 0.1], [axF[0] - 0.01, axF[1], s * 0.1]], 'al-6061', 0xd4a017, { finish: 'plate', says: 'a 49 mm upside-down fork (typical of motocross)', item: 'tube 49x2' }));
    // (each from the top clamp's top face up to the bar, the bar through its bore)
    for (const s2 of [-1, 1]) out.push(P(`bar clamp ${s2 > 0 ? 'right' : 'left'}`, { box: [0.04, m.H * 0.93 - head[1] - 0.115, 0.04] }, [head[0] + 0.03, (m.H * 0.93 + head[1] + 0.115) / 2, s2 * 0.04], { mat: 'al-6061', color: 0x2a2a2a, finish: 'cast', passes: ['handlebar'], fixed: 'bolted on its top clamp, the bar clamped in its bore' }));
    out.push(P('lower triple clamp', { box: [0.07, 0.03, 0.26] }, [head[0] + 0.05, head[1] - 0.09 * Math.cos(m.rake ?? 0.47) - 0.04, 0], { mat: 'al-6061', color: 0x2a2a2a, fill: 0.5, finish: 'cast', passes: ['fork leg left', 'fork leg right'], fixed: 'clamped round its fork legs, on the steering stem under the head tube (the stem not drawn)' }));
    out.push(P('triple clamps', { box: [0.07, 0.03, 0.26] }, [head[0] + 0.02, head[1] + 0.1, 0], { mat: 'al-6061', color: 0x2a2a2a, fill: 0.5, finish: 'cast', passes: ['fork leg left', 'fork leg right'], fixed: 'clamped round its fork legs, on the steering stem over the head tube (the stem not drawn)' }));
    for (const s of [-1, 1]) out.push(tube(`swingarm ${s > 0 ? 'right' : 'left'}`, 0.022, [[pivot[0], pivot[1], s * 0.127], [axR[0], axR[1], s * 0.127]], 'al-6061', 0x9aa0a6, { finish: 'brushed', item: 'tube 44x3', passes: ['rear axle'], says: 'its swingarm, the rear axle through its axle block (typical)' }));
    out.push(P('rear shock', { cyl: [0.025, 0.36] }, [pivot[0] + 0.04, pivot[1] + 0.2, 0], { rot: [0, 0, 0.22], mat: 'steel-alloy', color: 0xd4a017, fill: 0.4, finish: 'plate', parts: [P('spring', { cyl: [0.034, 0.24] }, [0, 0.02, 0], { mat: 'steel-spring', color: 0xd4a017, shell: 0.006, finish: 'paint', item: 'spring d10 D68 L240 n8' })] }));
  }
  // suspension: how each axle hangs from the frame (its kind is each axle's own, from its maker where given)
  const frameAt = (x: number): { z: number; y: number } => m.frame === 'ladder' ? { z: m.kind === 'truck' ? 0.43 : half * 0.8, y: m.kind === 'truck' ? tyres[0]!.D * 0.8 : m.extras.includes('deck') ? c + 0.21 : Math.max(c, tyres[0]!.D * 0.42) } : m.frame === 'tube' ? { z: frameZ(x), y: c + 0.016 } : m.frame === 'shell' ? { z: inner0 * 0.9, y: c + 0.1 } : { z: 0.12, y: c + 0.3 };
  // (each axle's suspension named as its wheels and axle are: front, rear, or by its place between)
  m.axles.forEach((a, i) => { if (a.track > 0) out.push(...suspension(a, tyres[i]!, frameAt(a.x), a.x === front ? 'front' : a.x === rear ? 'rear' : `axle ${i + 1}`, m)); });
  m.axles.forEach((a, i) => { if (a.track > 0 && a.brake?.on === 'axle' && a.susp === 'rigid') out.push(axleBrake(a, tyres[i]!, frameAt(a.x).z + 0.025, m.chain && m.chain.z > 0 ? -1 : 1, a.x === front ? 'front' : a.x === rear ? 'rear' : `axle ${i + 1}`)); });
  // panels
  if (m.lines) out.push(...body(m, m.lines));
  if (m.lines && m.kit) out.push(...bodyKit(m, m.kit, out));
  // the bulkhead between the engine bay and the cabin, on a unibody car with its power ahead of the cabin
  if (m.lines && m.frame === 'shell' && m.kind === 'car') out.push(...bulkhead(m, out, tyres));
  const ex = new Set(m.extras);
  if (ex.has('nose')) out.push(loft('nose', [{ x: front - 0.12, w: Math.min(half * 0.75, fIn), lo: c + 0.03, hi: c + 0.16, n: 5 }, { x: front + fR, w: Math.min(half * 0.95, fIn), lo: c + 0.04, hi: c + 0.18, n: 5 }, { x: front + fR + 0.08, w: half * 1.15, lo: c + 0.04, hi: c + 0.17, n: 5 }, { x: m.L / 2, w: half * 1.05, lo: c + 0.05, hi: c + 0.11, n: 4 }], 'pe', col, { shell: 0.004, finish: 'paint', says: 'rotomoulded polyethylene bodywork (typical of rental karts)' }));
  if (ex.has('pods')) {
    // a rental kart's bumpers: a tube loop round the front and a moulded bumper across the rear wheels; its floor tray
    out.push(tube('front bumper', 0.012, [[front + 0.05, c + 0.06, -half * 0.8], [m.L / 2 - 0.03, c + 0.08, -half * 0.55], [m.L / 2 - 0.03, c + 0.08, half * 0.55], [front + 0.05, c + 0.06, half * 0.8]], 'steel-low', 0x2a2a2a, { item: 'tube 25x2' }));
    out.push(loft('rear bumper', [{ x: -m.L / 2, w: m.W / 2 - 0.02, lo: c + 0.05, hi: c + 0.18, n: 6 }, { x: (-m.L / 2 + rear - rR - 0.03) / 2, w: m.W / 2, lo: c + 0.05, hi: c + 0.2, n: 6 }, { x: rear - rR - 0.03, w: m.W / 2 - 0.05, lo: c + 0.06, hi: c + 0.19, n: 6 }], 'pe', 0x1a1a1a, { shell: 0.004, finish: 'texture', says: 'rotomoulded polyethylene, across the rear wheels so karts do not lock wheels (typical of rental karts)' }));
    out.push(P('floor tray', { box: [front - rear - 0.15, 0.004, half * 1.6] }, [(front + rear) / 2 + 0.05, c + 0.034, 0], { mat: 'al-6061', color: 0x9a9ea4, finish: 'brushed' }));
  }
  if (m.kind === 'motorcycle') {
    const ft = tyres[0]!, rt = tyres[tyres.length - 1]!;
    const clampY = m.H * 0.78 - 0.1 - 0.015, fx = front - 0.32 + 0.05;
    out.push(loft('front fender', [{ x: fx - 0.22, w: 0.07, lo: clampY - 0.05, hi: clampY - 0.03, n: 3 }, { x: fx, w: 0.08, lo: clampY - 0.03, hi: clampY, n: 3 }, { x: fx + 0.3, w: 0.07, lo: clampY - 0.07, hi: clampY - 0.045, n: 3 }, { x: front + ft.D * 0.45, w: 0.06, lo: clampY - 0.16, hi: clampY - 0.13, n: 3 }], 'pp', 0xf2f2ee, { shell: 0.003, finish: 'paint' }));
    out.push(loft('rear fender and side panels', [{ x: rear + 0.55, w: 0.14, lo: (m.seatH ?? 0.9) - 0.2, hi: (m.seatH ?? 0.9) - 0.05, n: 3 }, { x: rear + 0.15, w: 0.12, lo: (m.seatH ?? 0.9) - 0.12, hi: (m.seatH ?? 0.9) - 0.04, n: 3 }, { x: rear - rt.D * 0.35, w: 0.07, lo: (m.seatH ?? 0.9) - 0.1, hi: (m.seatH ?? 0.9) - 0.08, n: 3 }], 'pp', 0xf2f2ee, { shell: 0.003, finish: 'paint' }));
    const ez = Math.cbrt(((m.power.cc ?? 450) * 0.055) / 380) * 0.95 * 0.2;
    for (const s2 of [-1, 1]) out.push(P(`footpeg ${s2 > 0 ? 'right' : 'left'}`, { box: [0.05, 0.02, 0.09] }, [m.power.x, (m.power.y ?? 0.5) - 0.17, s2 * (ez + 0.044)], { mat: 'steel-alloy', color: 0x8a8a8a, finish: 'cast' }));
    out.push(P('radiators', { box: [0.05, 0.2, 0.3] }, [front - 0.42, m.H * 0.62, 0], { mat: 'al-6061', color: 0x3a3a3a, finish: 'texture', says: 'twin radiators under the shrouds (typical of a liquid-cooled 450)' }));
  }
  if (m.kind === 'mower' || m.kind === 'forklift') {
    // the body behind and under the seat: a lawn tractor's fender deck over its rear wheels; a forklift's hood over its engine
    const rt = tyres[tyres.length - 1]!, seat = m.seats[0]!;
    out.push(loft(m.kind === 'mower' ? 'fender deck' : 'engine hood', [{ x: seat.x + 0.3, w: m.W / 2 - 0.12, lo: c + 0.25, hi: seat.y - 0.08, n: 7 }, { x: rear, w: m.W / 2 - 0.02, lo: m.kind === 'mower' ? rt.D * 0.75 : c + 0.2, hi: seat.y - 0.08, n: 7 }, { x: -m.L / 2 + (m.kind === 'mower' ? 0.05 : 0.35), w: m.W / 2 - 0.06, lo: m.kind === 'mower' ? rt.D * 0.7 : c + 0.25, hi: seat.y - 0.15, n: 5 }], m.kind === 'mower' ? 'pp' : 'steel-low', m.color, { shell: 0.003, make: 'pressed', finish: 'paint' }));
  }
  if (ex.has('pods')) for (const s of [-1, 1]) out.push(loft(`side pod ${s > 0 ? 'right' : 'left'}`, [{ x: rear + rR + 0.05, w: 0.08, lo: c + 0.03, hi: c + 0.16, n: 6 }, { x: (front + rear) / 2, w: 0.1, lo: c + 0.03, hi: c + 0.19, n: 6 }, { x: front - fR - 0.04, w: 0.08, lo: c + 0.03, hi: c + 0.15, n: 6 }], 'pe', col, { at: [0, 0, s * (m.W / 2 - 0.13)], shell: 0.004, finish: 'paint' }));
  if (ex.has('fenders')) {
    const ft = tyres[0]!, rt = tyres[tyres.length - 1]!, fy = ft.D + 0.12, ry = rt.D + 0.12;
    out.push(loft('front fenders', [{ x: m.L / 2 - 0.02, w: m.W / 2 - 0.06, lo: fy - 0.09, hi: fy - 0.03, n: 6 }, { x: front, w: m.W / 2, lo: fy - 0.05, hi: fy + 0.01, n: 8 }, { x: front - ft.D * 0.55, w: m.W / 2 - 0.04, lo: fy - 0.07, hi: fy - 0.01, n: 8 }, { x: (front + rear) / 2 + 0.1, w: 0.25, lo: m.H * 0.6, hi: m.H * 0.72, n: 4 }], 'pp', col, { shell: 0.003, finish: 'paint', says: 'moulded polypropylene (typical)' }));
    out.push(loft('rear fenders', [{ x: (front + rear) / 2 - 0.1, w: 0.25, lo: ry - 0.1, hi: m.seatH ?? ry, n: 4 }, { x: rear + rt.D * 0.5, w: m.W / 2 - 0.04, lo: ry - 0.07, hi: ry - 0.01, n: 8 }, { x: rear, w: m.W / 2, lo: ry - 0.05, hi: ry + 0.01, n: 8 }, { x: -m.L / 2 + 0.03, w: m.W / 2 - 0.06, lo: ry - 0.09, hi: ry - 0.03, n: 6 }], 'pp', col, { shell: 0.003, finish: 'paint' }));
  }
  if (ex.has('tank')) out.push(loft('tank and shrouds', [{ x: front - 0.3, w: 0.17, lo: m.H * 0.6, hi: m.H * 0.8, n: 3 }, { x: front - 0.55, w: 0.16, lo: m.H * 0.55, hi: (m.seatH ?? m.H * 0.75) + 0.02, n: 3 }, { x: front - 0.75, w: 0.1, lo: m.H * 0.6, hi: (m.seatH ?? m.H * 0.75) - 0.01, n: 3 }], 'pe', col, { shell: 0.004, finish: 'paint', says: 'the fuel tank under its radiator shrouds (typical of motocross)' }));
  if (ex.has('number')) out.push(P('race number board', { box: [0.02, 0.2, 0.26] }, [front - 0.22, m.H * 0.82, 0], { rot: [0, 0, -(m.rake ?? 0.47)], mat: 'pp', color: 0xf2f2ee, shell: 0.003, finish: 'texture' }));
  if (ex.has('hood') && m.kind === 'mower') out.push(loft('hood', [{ x: m.L / 2 - 0.02, w: 0.2, lo: c + 0.24, hi: m.H * 0.55, n: 5 }, { x: front + 0.05, w: 0.27, lo: c + 0.26, hi: m.H * 0.62, n: 6 }, { x: (front + rear) / 2 + 0.15, w: 0.28, lo: c + 0.27, hi: m.H * 0.64, n: 6 }], 'abs', col, { shell: 0.003, finish: 'paint' }));
  if (ex.has('cab') && tb) out.push(dayCab(tb), hood(tb, travelOf(m.axles[0]!).bump), bumper(tb));
  else if (ex.has('cab')) {
    const bbc = m.L * 0.45, cabX0 = m.L / 2 - bbc, cabH = m.H, w = m.W / 2;
    out.push(loft('hood', [{ x: m.L / 2 - 0.02, w: w * 0.78, lo: 0.75, hi: 1.55, n: 4 }, { x: m.L / 2 - 0.5, w: w * 0.84, lo: 0.7, hi: 1.75, n: 4 }, { x: cabX0 + 1.3, w: w * 0.86, lo: 0.7, hi: 1.95, n: 5 }], 'fibreglass', col, { shell: 0.004, finish: 'paint', says: 'a fibreglass hood over its engine (typical)' }));
    out.push(loft('cab', [{ x: cabX0 + 1.4, w: w * 0.96, lo: 1.0, hi: 1.95, n: 6 }, { x: cabX0 + 1.0, w: w * 0.98, lo: 1.0, hi: cabH - 0.1, n: 7 }, { x: cabX0 + 0.15, w: w * 0.98, lo: 1.0, hi: cabH, n: 8 }, { x: cabX0, w: w * 0.95, lo: 1.05, hi: cabH - 0.05, n: 8 }], 'al-5052', col, { shell: 0.0016, make: 'pressed', finish: 'paint', says: 'its cab: aluminium panels (Freightliner builds its cabs of aluminium)' }));
    out.push(P('windscreen', { box: [0.02, 0.85, w * 1.8] }, [cabX0 + 1.22, 2.35, 0], { rot: [0, 0, -0.3], mat: 'glass', color: 0x2a3c48 }));
    for (const s of [-1, 1]) out.push(P(`door window ${s > 0 ? 'right' : 'left'}`, { box: [0.8, 0.55, 0.01] }, [cabX0 + 0.6, 2.25, s * w * 0.98], { mat: 'glass', color: 0x2a3c48 }));
    out.push(P('grille', { box: [0.04, 0.85, w * 1.2] }, [m.L / 2 + 0.01, 1.2, 0], { mat: 'abs', color: 0xc8ccd2, finish: 'chrome', shell: 0.004, parts: [0, 1, 2, 3, 4, 5, 6].map((k) => P('grille bar', { box: [0.02, 0.025, w * 1.15] }, [0.02, -0.36 + k * 0.12, 0], { mat: 'abs', color: 0x2a2a2a })) }));
    out.push(P('front bumper', { box: [0.2, 0.32, m.W * 0.98] }, [m.L / 2 - 0.08, 0.55, 0], { mat: 'steel-low', color: 0xc8ccd2, shell: 0.004, make: 'pressed', finish: 'chrome' }));
    for (const s of [-1, 1]) out.push(P(`headlight ${s > 0 ? 'right' : 'left'}`, { box: [0.06, 0.18, 0.38] }, [m.L / 2 - 0.02, 1.0, s * w * 0.74], { mat: 'pc', color: 0xeef2f6, light: { lm: 2000, color: 0xfff4e0 } }));
  }
  if (ex.has('lights') && !out.some((p) => /headlight/.test(p.name))) {
    // two lamps on the front face of the panel furthest forward, at its middle height, a third of its width out
    const fronts = out.filter((p) => p.shape && 'loft' in p.shape).map((p) => { const st = [...(p.shape as { loft: { st: Station[] } }).loft.st].sort((a, b) => b.x - a.x)[0]!; return { p, st, x: st.x + (p.at?.[0] ?? 0) }; }).sort((a, b) => b.x - a.x)[0];
    if (fronts) { const { st, x } = fronts, y = (st.lo + st.hi) / 2 + (fronts.p.at?.[1] ?? 0); for (const sd of [-1, 1]) out.push(P(`headlight ${sd > 0 ? 'right' : 'left'}`, { cyl: [Math.min(0.06, (st.hi - st.lo) * 0.4), 0.04] }, [x + 0.005, y, sd * st.w * 0.55], { rot: [0, 0, PI / 2], mat: 'pc', color: 0xeef2f6, light: { lm: 800, color: 0xfff4e0 } })); }
  }
  if (tb) {
    // its fuel tank on the left, its aftertreatment on the right where it has stacks (Freightliner's layout), each on
    // brackets bolted through the rail; its steps ahead of them under the doors; its stacks up behind the cab, fed from
    // the aftertreatment (the left one by a crossover behind the cab)
    const tx = (front + rear) / 2 + 0.6, ty = 0.85, tz = 0.8;
    if (ex.has('tanks')) out.push(fuelTank('fuel tank (left)', -1, [tx, ty, -tz], 0.32, 1.3, tb), ex.has('stacks') ? aftertreatment(1, [tx, ty, tz], 0.3, 1.25, tb) : fuelTank('fuel tank (right)', 1, [tx, ty, tz], 0.32, 1.3, tb));
    // (its batteries in a box on the left rail just behind its fuel tank, three group 31s across it)
    if (ex.has('tanks')) out.push(batteryBox(-1, [tx - 0.65 - 0.06 - 0.18, 0.6, -(tb.railZ + tb.railW / 2 + 0.02 + (3 * (6.8125 * 0.0254 + 0.006) + 0.02) / 2)], '31', 3, tb));
    const stepX = Math.min(front - tyres[0]!.D / 2 - 0.35, tx + 0.65 + 0.32);
    if (ex.has('cab')) for (const s of [-1, 1]) out.push(cabStep(`cab step (${s > 0 ? 'right' : 'left'})`, s, stepX, [0.5, 0.86], 0.78, tb.wc + 0.02, tb));
    if (ex.has('stacks')) {
      const foot = tb.railY + tb.railH / 2 + 0.12, sx = tb.cabBack - 0.09, sz = tb.wc - 0.02, outlet: V3 = [tx - 0.625 + 0.12, ty + 0.3, tz];
      out.push(exhaustStack('exhaust stack (right)', [sx, foot, sz], outlet, m.H + 0.45, tb.cabBack), exhaustStack('exhaust stack (left)', [sx, foot, -sz], [sx, foot - 0.04, 0], m.H + 0.45, tb.cabBack));
    }
    if (ex.has('fifth wheel')) out.push(fifthWheel(tb, rear + 0.25));
    // its quarter fenders over each drive axle's tyres, a mud flap behind the last; an air tank between its rails
    const drives = m.axles.map((a, i) => ({ a, t: tyres[i]! })).filter((q) => q.a.drive && q.a.track > 0);
    drives.forEach(({ a, t }, i) => { const last = i === drives.length - 1, w = a.dual ? 2 * t.W + 0.09 : t.W + 0.06; for (const s of [-1, 1]) out.push(quarterFender(`quarter fender (${a.x === rear ? 'rear' : `axle ${m.axles.indexOf(a) + 1}`}, ${s > 0 ? 'right' : 'left'})`, s, a.x, t.D / 2, a.track / 2, t.D / 2 + travelOf(a).bump + 0.05, w, tb, last)); });
    // (between its drive axles, nearer the front one, clear of the fifth wheel's angles over the rear one)
    const between = drives.length > 1 ? drives[0]!.a.x - 0.55 : fx0 + 0.25;
    out.push(airTank('air tank', [between, tb.railY, 0], 0.12, 2 * (tb.railZ - tb.railW / 2) - 0.06));
  }
  if (ex.has('tanks') && !tb) for (const s of [-1, 1]) out.push(P(`tank strap ${s > 0 ? 'right' : 'left'}`, { box: [0.08, 0.06, 0.4] }, [(front + rear) / 2 + 0.6, 0.95, s * 0.62], { mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }), P(`fuel tank ${s > 0 ? 'right' : 'left'}`, { cyl: [0.32, 1.3] }, [(front + rear) / 2 + 0.6, 0.85, s * 0.8], { rot: [0, 0, PI / 2], mat: 'al-5052', color: 0xc8ccd2, shell: 0.003, finish: 'brushed', says: 'about 380 L each (typical of highway tractors)' }));
  if (ex.has('stacks') && !tb) for (const s of [-1, 1]) out.push(tube(`exhaust stack ${s > 0 ? 'right' : 'left'}`, 0.065, [[m.L / 2 - m.L * 0.45 - 0.06, 1.1, s * (m.W / 2 - 0.12)], [m.L / 2 - m.L * 0.45 - 0.06, m.H + 0.4, s * (m.W / 2 - 0.12)]], 'stainless-304', 0xd8dce2, { finish: 'chrome' }));
  if (ex.has('fifth wheel') && !tb) out.push(P('fifth wheel mount', { box: [0.6, 0.1, 0.95] }, [rear + 0.25, tyres[0]!.D * 0.8 + 0.287 + 0.05, 0], { mat: 'steel-low', color: 0x1a1a1a, fill: 0.3, finish: 'paint' }), P('fifth wheel', { cyl: [0.45, 0.06] }, [rear + 0.25, tyres[0]!.D * 0.8 + 0.287 + 0.13, 0], { mat: 'cast-iron', color: 0x1a1a1a, fill: 0.5, finish: 'cast', says: 'where a trailer\'s kingpin couples (SAE J700: a 2-inch kingpin, typical)' }));
  if (ex.has('counterweight')) out.push(loft('counterweight', [{ x: -m.L / 2 + 0.36, w: m.W / 2 - 0.02, lo: c + 0.05, hi: m.H * 0.55, n: 7 }, { x: -m.L / 2 + 0.12, w: m.W / 2 - 0.03, lo: c + 0.05, hi: m.H * 0.53, n: 7 }, { x: -m.L / 2 + 0.02, w: m.W / 2 - 0.1, lo: c + 0.1, hi: m.H * 0.46, n: 6 }], 'cast-iron', darken(col, 0.9), { finish: 'paint', says: 'cast iron: what balances a load on the forks about the front axle' }));
  if (ex.has('guard')) { const gx0 = rear + rR + 0.07, gx1 = front - fR - 0.07, gh = m.guardH ?? m.H, gz = m.W / 2 - 0.06; for (const [xx, s] of [[gx0, 1], [gx0, -1], [gx1, 1], [gx1, -1]] as const) out.push(tube(`guard post`, 0.03, [[xx, Math.max(c, tyres[0]!.D * 0.42) + 0.1, s * gz], [xx, gh - 0.04, s * gz]], 'steel-low', 0x1a1a1a, { item: 'tube 60x4' })); for (let i = 0; i < 6; i++) { const xx = gx0 + ((gx1 - gx0) * i) / 5; out.push(tube('guard bar', 0.012, [[xx, gh - 0.02, -gz], [xx, gh - 0.02, gz]], 'steel-low', 0x1a1a1a)); } for (const s of [-1, 1]) out.push(tube('guard rail', 0.03, [[gx0, gh - 0.02, s * gz], [gx1, gh - 0.02, s * gz]], 'steel-low', 0x1a1a1a)); }
  if (ex.has('mast')) {
    // (its fork face at its published length: the mast just in front of the drive tyres)
    const mx = m.L / 2 - 0.18, mh = m.H, mz = 0.32, lift = Number(pick.lift ?? 0);
    out.push(P('mast bottom tie', { box: [0.1, 0.08, 2 * mz + 0.05] }, [mx, Math.max(c, tyres[0]!.D * 0.42) + 0.05, 0], { mat: 'steel-alloy', color: 0x1a1a1a, fill: 0.5, finish: 'paint' }), P('mast top tie', { box: [0.1, 0.08, 2 * mz + 0.05] }, [mx, mh, 0], { mat: 'steel-alloy', color: 0x1a1a1a, fill: 0.5, finish: 'paint' }));
    for (const s of [-1, 1]) out.push(P(`tilt pivot ${s > 0 ? 'right' : 'left'}`, { box: [mx - 0.05 - fx1 + 0.04, 0.12, 0.12] }, [(mx - 0.05 + fx1 - 0.04) / 2, Math.max(c, tyres[0]!.D * 0.42) + 0.05, s * (half * 0.8 - 0.02)], { mat: 'steel-alloy', color: 0x1a1a1a, finish: 'paint' }), tube(`tilt cylinder ${s > 0 ? 'right' : 'left'}`, 0.03, [[fx1 - 0.35, 1.0, s * (mz - 0.05)], [mx - 0.05, 1.05, s * (mz - 0.02)]], 'steel-alloy', 0x2a2a2a, { finish: 'plate' }));
    for (const s of [-1, 1]) { out.push(P(`outer upright ${s > 0 ? 'right' : 'left'}`, { box: [0.1, mh, 0.05] }, [mx, mh / 2 + 0.05, s * mz], { mat: 'steel-alloy', color: 0x1a1a1a, fill: 0.35, finish: 'paint' })); out.push(P(`inner upright ${s > 0 ? 'right' : 'left'}`, { box: [0.08, mh * 0.92, 0.04] }, [mx + 0.06, mh * 0.46 + 0.13 + lift, s * (mz - 0.045)], { mat: 'steel-alloy', color: 0x2a2a2a, fill: 0.35, finish: 'paint' })); }
    out.push(P('lift cylinder', { cyl: [0.045, mh * 0.8] }, [mx, 0.16 + mh * 0.4, 0], { mat: 'steel-alloy', color: 0x2a2a2a, fill: 0.5, finish: 'plate' }));
    const cy = 0.12 + lift, fl = 1.067;
    out.push(P('carriage', { box: [0.08, 0.4, 2 * mz + 0.25] }, [mx + 0.13, cy + 0.2, 0], { mat: 'steel-low', color: 0x1a1a1a, fill: 0.4, finish: 'paint', parts: [] }));
    for (const yy of [cy + 0.4, cy + 1.2]) out.push(tube('load backrest rail', 0.014, [[mx + 0.15, yy, -mz - 0.12], [mx + 0.15, yy, mz + 0.12]], 'steel-low', 0x1a1a1a));
    for (let i = 0; i < 5; i++) out.push(tube('load backrest bar', 0.012, [[mx + 0.15, cy + 0.4, -mz - 0.1 + (i * (2 * mz + 0.2)) / 4], [mx + 0.15, cy + 1.2, -mz - 0.1 + (i * (2 * mz + 0.2)) / 4]], 'steel-low', 0x1a1a1a));
    for (const s of [-1, 1]) out.push(P(`fork ${s > 0 ? 'right' : 'left'}`, undefined, [mx + 0.18, cy, s * 0.3], { parts: [P('shank', { box: [0.045, 0.45, 0.1] }, [0, 0.22, 0], { mat: 'steel-alloy', color: 0x2a2a2a, finish: 'paint' }), P('blade', { box: [fl, 0.045, 0.1] }, [fl / 2, 0.02, 0], { mat: 'steel-alloy', color: 0x2a2a2a, finish: 'paint', says: '42 in by 4 in by 1.5 in (typical of a 5,000 lb truck)' })] }));
  }
  if (ex.has('deck')) {
    // a 42 in twin-blade deck: its housing as wide as its cut and two blades' circles side by side, short front to back
    const cut = 1.067, dz = cut / 2 + 0.06, dxw = cut / 4 + 0.03, dx = (front - fR + rear + rR) / 2, dy = c + 0.1;
    out.push(loft('mower deck', [{ x: -dxw, w: dz * 0.9, lo: -0.02, hi: 0.06, n: 4 }, { x: 0, w: dz, lo: -0.04, hi: 0.08, n: 5 }, { x: dxw, w: dz * 0.9, lo: -0.02, hi: 0.06, n: 4 }], 'steel-low', m.color, { at: [dx, dy, 0], shell: 0.0027, finish: 'paint', says: 'a 42 in deck of 12-gauge steel (John Deere\'s Accel Deep deck: 2.7 mm)', parts: [-1, 1].map((s2) => P(`mower blade ${s2 > 0 ? 'right' : 'left'}`, { box: [0.05, 0.005, cut / 2 - 0.02] }, [0, -0.025, s2 * cut / 4], { mat: 'steel-alloy', color: 0x9a9a9a, finish: 'brushed', says: 'a 21 in blade, its tip at about 5,500 m/min (ANSI B71.1 caps it at 19,000 ft/min, 5,791 m/min)' })) }));
    for (const s2 of [-1, 1]) out.push(tube(`deck hanger ${s2 > 0 ? 'right' : 'left'}`, 0.008, [[dx, dy + 0.075, s2 * half * 0.8], [dx + 0.05, c + 0.22, s2 * half * 0.8]], 'steel-low', 0x2a2a2a));
  }
  // a rack: two rails, bars across coped to them (each bar's end as far into its rail as the rail's round lets its rim
  // reach the rail's face, so the end is hidden in it), and posts 16 mm down to the frame, each end inside what it meets
  if (ex.has('racks')) for (const [xx, nm] of [[m.L / 2 - 0.3, 'front rack'], [-m.L / 2 + 0.3, 'rear rack']] as const) { const ry = (tyres[0]!.D + 0.18), cope = Math.sqrt(0.011 ** 2 - 0.009 ** 2); out.push(P(nm, undefined, [xx, ry, 0], { parts: [...(m.upper ? [-1, 1].map((sd) => tube('rack post', 0.008, [[0.07, 0, sd * half * 0.6], [(nm === 'front rack' ? front + 0.25 : rear - 0.25) - xx, (m.upper ?? 0) - ry, sd * half * 0.6]], 'steel-low', 0x1a1a1a, { fixed: 'welded under its rack bar and to the upper rail of its frame' })) : []),...[-1, 1].map((s) => tube('rack rail', 0.011, [[-0.22, 0, s * 0.42], [0.22, 0, s * 0.42]], 'steel-low', 0x1a1a1a)), ...[-0.2, -0.07, 0.07, 0.2].map((x) => tube('rack bar', 0.009, [[x, 0, -0.42 + cope], [x, 0, 0.42 - cope]], 'steel-low', 0x1a1a1a, { fixed: 'coped to its rack rails at each end and welded round' }))] })); }
  // seats, power, controls
  // each seat as wide as it has room for, its style's width at most: to the seats beside it in its row, to the body's
  // inside at its cushion and its shoulders (less its trim and the room to get in, about 60 mm, typical), and to the
  // inside of a wheel's sweep where it sits over one (less the liner, about 45 mm, typical); and to whatever already
  // stands beside it, outboard, within its reach and height (a damper's rod up to its turret beside a third row): 15 mm
  // short of it
  const inside = m.lines ? insideOf(out) : undefined;
  let made: { lo: V3; hi: V3 }[] | null = null;
  const madeBoxes = () => made ??= layout(P('so far', undefined, [0, 0, 0], { parts: out })).filter((n) => n.box && n.p.shape && !('surf' in n.p.shape)).map((n) => ({ lo: n.box!.min.toArray() as V3, hi: n.box!.max.toArray() as V3 }));
  const roomOf = (s: Seat): number => {
    let r = Infinity;
    if (m.frame === 'shell') for (const b of madeBoxes()) { if (b.lo[0] > s.x + 0.25 || b.hi[0] < s.x - 0.3 || b.hi[1] < s.y - 0.11 || b.lo[1] > s.y + 0.55) continue; const zin = s.z >= 0 ? b.lo[2] : -b.hi[2]; if (zin > Math.abs(s.z) + 0.1) r = Math.min(r, zin - 0.015 - Math.abs(s.z)); }
    for (const o of m.seats) if (o !== s && Math.abs(o.x - s.x) < 0.3 && o.z !== s.z) r = Math.min(r, Math.abs(o.z - s.z) / 2 - 0.01);
    if (inside) for (const y of [s.y - 0.05, s.y + 0.55]) for (const x of [s.x - 0.3, s.x, s.x + 0.2]) r = Math.min(r, inside(x, y) - 0.06 - Math.abs(s.z));
    for (const a of m.axles) { if (!(a.track > 0)) continue; const t = tyreOf(a.tyre)!, tr = travelOf(a); if (Math.abs(s.x - a.x) < t.D / 2 + 0.33 && s.y - 0.15 < t.D + tr.bump + 0.03) r = Math.min(r, a.track / 2 - t.W / 2 - 0.015 - 0.045 - Math.abs(s.z)); }
    return r;
  };
  // (a backrest leans back 0.18 rad from its foot: its top about 0.44 m behind the seat's middle, under the roof there less
  // 40 mm, typical of the room to a headliner)
  // (a seat over a floor raised over its rear axle sits on that floor: raised with it, its cushion's foot on it)
  // (its cushion's foot 115 mm under its hip, its backrest's, leaned back, 65 mm: each on whatever floor is under it)
  const ovA = overAxle(m), pkA = packOf(m), raised = (x0: number, x1: number): number => !ovA ? -Infinity : x0 < ovA.x1 && x1 > ovA.x0 ? ovA.top : pkA && x0 < pkA.x0 && x1 > ovA.x1 ? beamFloor(m, ovA.x1) ?? -Infinity : -Infinity;
  const seatOn = (s: Seat): Seat => m.frame !== 'shell' || s.style === 'saddle' || s.style === 'kart' || s.style === 'pan' ? s : { ...s, y: Math.max(s.y, raised(s.x - 0.22, s.x + 0.25) + 0.115, raised(s.x - 0.37, s.x - 0.22) + 0.065) };
  const roof = m.lines ? roofOf(out) : undefined; m.seats.map(seatOn).forEach((s, i) => out.push(seatPart(s, i, m.kind === 'car' ? 0x2a2a2e : 0x1a1a1a, m.frame === 'shell' ? floorTop(m, s.x) : undefined, roomOf(s), roof ? (roof(s.x - 0.33 - 0.62 * Math.sin(0.18)) - 0.04 - s.y) / Math.cos(0.18) : Infinity)));
  out.push(engine(powerAt(m), m.kind !== 'truck' && m.kind !== 'forklift', m.axles.some((a) => a.drive && a.x === rear && a.track > 0) ? 'rear axle' : 'front axle', across(m)));
  // (a truck's gearbox behind its engine in line, its clutch in its bell housing; a driveshaft to its forward drive axle
  // and on to the rear one: a 12-speed's ratios, about 14.9 to 0.78 (typical of an automated manual's))
  if (m.kind === 'truck' && m.power.kind !== 'electric') {
    const pw = powerAt(m), sp = engineSpecOf(pw, false), e = engineBuilt(sp), back = pw.x - e.size[0] / 2, crankY = pw.y! - e.mid[1], L = 0.95, room: V3 = [0.42, 0.5, L];
    const g = transaxle({ kind: 'manual', room, diff: null, torque: pw.torque ?? pw.kW * 6.7, ratios: [14.9, 11.4, 8.7, 6.7, 5.2, 4.0, 3.2, 2.5, 1.9, 1.5, 1.0, 0.78], says: 'a 12-speed automated manual, in line behind the engine (typical of a highway tractor\'s)' });
    const gx = back - L / 2;
    // (its input shaft on the crank's line: it stands 50 mm under the gearbox's middle and 40 mm to one side, as built)
    out.push({ ...g.gearbox, at: [gx, crankY + 0.05, 0.04], rot: [0, PI / 2, 0], sealed: 'built whole from its parts (drivetrain.ts), fitted as it comes', says: `${g.gearbox.says}; ${Math.round(g.kg)} kg as its ${g.pieces} pieces come to` });
    const drives = m.axles.filter((a) => a.drive && a.track > 0).sort((p, q) => q.x - p.x), oy = crankY + 0.05 - 0.135;
    let from: V3 = [gx - L / 2 - 0.06, oy, 0.02];
    drives.forEach((a, i) => { const ty = tyreOf(a.tyre)!.D / 2, to: V3 = [a.x + 0.25, ty + 0.06, 0]; out.push(driveshaft(i === 0 ? 'main driveshaft' : 'inter-axle driveshaft', from, to, true)); from = [a.x - 0.25, ty + 0.06, 0]; });
  }
  const drv = m.seats[0]!;
  if (m.controls === 'wheel') {
    const low = m.kind === 'mower' || m.kind === 'forklift', sx = drv.x + (m.kind === 'kart' ? 0.42 : low ? 0.42 : 0.5), sy = drv.y + (m.kind === 'kart' ? 0.24 : m.kind === 'mower' ? 0.16 : low ? 0.26 : 0.36), sz = drv.z, r = m.kind === 'kart' ? 0.15 : m.kind === 'truck' ? 0.24 : 0.17;
    // (its top under the belt, where the windscreen meets the body) and what holds it and the column: a steel cross-car
    // beam under it, side to side, its ends at the body's inside there (as measured off the skins, so they meet them),
    // bolted to the A pillars (typical: about 50 mm tube). Where they are over the front wheels, as in a van, the beam
    // runs over the wheels' sweep, and the dashboard's underside comes down onto it.
    // (inside the cabin: no further forward than the windscreen's base, its top 30 mm under the belt, so it never stands
    // through the hood or the cowl)
    const xWs = m.lines ? m.L / 2 - m.lines.cowl * m.L : Infinity, dashX = Math.min(sx + 0.25, xWs - 0.12), dashY = Math.min(sy - 0.05, (m.lines?.belt ?? 1) * m.H - 0.11), fa = m.axles[0]!, ftR = tyres[0]!.D / 2, bx = dashX + 0.05;
    // (over the front wheelhouses as made, where they rise under it, as a cab-forward van's do, and over the tyre's sweep)
    const whTop = Math.max(...out.filter((p) => p.name === 'front inner wheelhouses' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 40, 4)).filter((q) => Math.abs(q[0] - bx) < 0.3).map((q) => q[1]));
    const sweepTop = Math.max(Math.abs(bx - fa.x) < ftR + 0.35 ? ftR * 2 + travelOf(fa).bump + 0.05 : -Infinity, whTop), by0 = Math.max(dashY - 0.153, sweepTop + 0.025), lift = by0 - (dashY - 0.153), by = by0 - 0.008;
    // (its ends at the hinge pillars, 30 mm inside the skin there, where a door's inner panel and trim would be: not at
    // the door's skin itself)
    const bodyAt = inside?.(bx, by) ?? Infinity, dashW = m.W * 0.42, bh = Number.isFinite(bodyAt) ? bodyAt - 0.03 : dashW + 0.02;
    // (a car's at the cross-car beam it hangs from: its end on the beam's face toward it, not inside the beam)
    // (a car's runs under its cross-car beam, hung from it: a clamp round the column and a bracket from the clamp up to
    // the beam, turned to the column's own slope so the bracket lies along both, not touching either at a point; the
    // column on 150 mm past the clamp to its lower end, its intermediate shaft's joint there)
    const S0: V3 = [sx + 0.02, sy - 0.02, sz], rC = 0.02, hB = 0.012, dB = 0.025 + hB + rC;
    let al = Math.atan2(by - dB - S0[1], bx - S0[0]), Bq: V3 = [bx, by - dB, sz];
    for (let it = 0; it < 4; it++) { Bq = [bx + Math.sin(al) * dB, by - Math.cos(al) * dB, sz]; al = Math.atan2(Bq[1] - S0[1], Bq[0] - S0[0]); }
    const dC: V3 = [Math.cos(al), Math.sin(al), 0], upC: V3 = [-Math.sin(al), Math.cos(al), 0];
    // (no lower than 60 mm over the floor under it: a low car's or one on a battery pack's, its floor high)
    const runC = m.lines && dC[1] < 0 ? Math.max(0.02, Math.min(0.15, (Bq[1] - floorTop(m, Bq[0]) - 0.06) / -dC[1])) : 0.15;
    const end: V3 = m.kind === 'kart' ? [sx + 0.42, c + 0.06, sz * 0.4] : low ? [sx + 0.28, m.kind === 'mower' ? sy - 0.45 : Math.max(c, tyres[0]!.D * 0.42) + 0.1 + 0.015, sz] : m.lines ? [Bq[0] + dC[0] * runC, Bq[1] + dC[1] * runC, sz] : [sx + 0.45, sy - 0.25, sz * 0.6];
    out.push(tube('steering column', 0.012, [S0, end], 'steel-low', 0x2a2a2a, { joint: 'bearing', ...(m.lines ? {} : { fixed: 'bolted to the beam by its bracket, so it can be set for reach and height' }), says: 'its column: a tube on its bracket, the steering shaft turning in its bearings inside it (typical)' }));
    // (and in a car's, its steering shaft drawn: from inside its wheel's boss down through the column to its foot)
    if (m.lines) out.push(tube('steering shaft', 0.0095, [[S0[0] - dC[0] * 0.02, S0[1] - dC[1] * 0.02, sz], end], 'steel-alloy', 0x5a5c5e, { finish: 'plate', link: 'steering wheel', fixed: 'splined into its wheel\'s boss and its universal joint', says: 'its steering shaft, turning in the column\'s bearings (typical)' }, 0.0095));
    if (m.lines) out.push(P('steering column clamp', { lathe: [[0.012, -0.02], [rC, -0.02], [rC, 0.02], [0.012, 0.02], [0.012, -0.02]] }, Bq, { rot: [0, 0, al - PI / 2], mat: 'steel-low', color: 0x2a2a2a, finish: 'paint', fixed: 'clamped round its column', says: 'the clamp its column is held in, set for reach and height by its lever (typical)' }),
      P('steering column bracket', { box: [0.03, hB, 0.05] }, [Bq[0] + upC[0] * (rC + hB / 2), Bq[1] + upC[1] * (rC + hB / 2), sz], { rot: [0, 0, al], mat: 'steel-low', color: 0x2a2a2a, finish: 'paint', fixed: 'bolted under the beam, its clamp bolted to it', says: 'a pressed bracket from its column\'s clamp up to the cross-car beam (typical)' }));
    // its wheel square to its column, so raked as the column is (a car's about 370 mm across, typical): a rim moulded over
    // a steel armature, three spokes and the boss its airbag's cover, all one moulding
    { const d0: V3 = [sx + 0.02 - end[0], sy - 0.02 - end[1], 0], dl = Math.hypot(d0[0], d0[1]) || 1, zA: V3 = [d0[0] / dl, d0[1] / dl, 0], xA: V3 = [0, 0, 1], yA: V3 = [zA[1] * xA[2] - zA[2] * xA[1], zA[2] * xA[0] - zA[0] * xA[2], zA[0] * xA[1] - zA[1] * xA[0]];
      const rot: V3 = [Math.atan2(-zA[1], zA[2]), Math.asin(Math.max(-1, Math.min(1, zA[0]))), Math.atan2(-yA[0], xA[0])], boss = Math.min(0.07, r * 0.4);
      out.push(P('steering wheel', { torus: [r, 0.015] }, [sx, sy, sz], { rot, mat: 'pu', color: 0x1a1a1a, finish: 'leather', link: 'steering wheel', fixed: 'moulded over its steel armature with its spokes and boss, one piece; splined on its column', says: `its steering wheel, ${Math.round((r + 0.015) * 2000)} mm across (typical)`, parts: [P('steering wheel boss', { cyl: [boss, 0.068] }, [0, 0, 0.006], { rot: [PI / 2, 0, 0], mat: 'abs', color: 0x1a1a1a, finish: 'texture', passes: ['steering column', 'steering shaft'], says: 'its boss, its airbag\'s cover (typical)' }), ...[0, 1, 2].map((k) => { const a = -PI / 2 + (k - 1) * 1.9; return P('steering wheel spoke', { box: [r - boss - 0.011, 0.032, 0.014] }, [Math.cos(a) * (r + boss - 0.019) / 2, Math.sin(a) * (r + boss - 0.019) / 2, 0], { rot: [0, 0, a], mat: 'abs', color: 0x1a1a1a, fixed: 'moulded with its wheel\'s rim and boss' }); })] })); }
    if (m.kind === 'forklift') out.push(P('floor plate', { box: [0.55, 0.01, 2 * (m.axles[0]!.track / 2 - tyres[0]!.W / 2 - 0.06)] }, [end[0], end[1] - 0.01, 0], { mat: 'steel-low', color: 0x2a2a2a, finish: 'texture', says: 'its operator\'s floor, a tread plate (typical)' }));
    if (m.lines) out.push(tube('cross-car beam', 0.025, [[bx, by, -bh], [bx, by, bh]], 'steel-low', 0x2a2a2a, { finish: 'paint', says: 'the beam the dashboard and the steering column hang on, bolted to the A pillars (typical)' }));
    // its steering led on to the rack: a universal joint's yoke square on the column's lower end, turning in its bearing;
    // the intermediate shaft splined into it and down through the toe board's grommet, in line with the pinion's housing,
    // cast on the rack's housing inboard of the rack's mount on the driver's side, its shaft's end on the housing's top
    // (the pinion in it, meshing with the rack's teeth, not drawn)
    const rackP = out.find((p) => p.name === 'steering rack');
    if (m.lines && rackP && fa.susp === 'strut') {
      const rk = rackOf(m, fa, tyres[0]!), zP = (Math.sign(sz) || -1) * Math.max(0.05, 0.7 * rk.zH - 0.055), R0: V3 = [rk.x, rk.y, zP], Y0: V3 = [end[0] + dC[0] * 0.015, end[1] + dC[1] * 0.015, end[2]];
      // (the pinion's housing from within the rack housing's wall, its whole foot outside the bore, so it never reaches the
      // rack inside: 28 mm out along its own axis; turned, with a bore the shaft fits in)
      const L0 = Math.hypot(Y0[0] - R0[0], Y0[1] - R0[1], Y0[2] - R0[2]) || 1, u: V3 = [(Y0[0] - R0[0]) / L0, (Y0[1] - R0[1]) / L0, (Y0[2] - R0[2]) / L0], at = (k: number): V3 => [R0[0] + u[0] * k, R0[1] + u[1] * k, R0[2] + u[2] * k], P2 = at(0.05);
      const qU = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...u)), eU = new THREE.Euler().setFromQuaternion(qU);
      rackP.parts!.push(P('pinion housing', { lathe: [[0.009, 0], [0.022, 0], [0.022, 0.05], [0.009, 0.05], [0.009, 0]] }, at(0.028), { rot: [eU.x, eU.y, eU.z], mat: 'al-a380', color: 0x5a5c5e, finish: 'cast', passes: ['intermediate shaft'], says: 'its pinion\'s housing, cast with the rack\'s; the pinion in it meshing with the rack\'s teeth (not drawn), the intermediate shaft into its bore (typical)' }));
      // (a universal joint as it is made: two forged yokes at right angles, a cross spider between them, a needle-bearing
      // cap on each of its four arms)
      { const uj = { mat: 'steel-alloy', color: 0x6a6c6e, finish: 'plate', link: 'steering wheel', joint: 'bearing' as const, passes: ['intermediate shaft'] };
        out.push(P('upper universal joint', undefined, Y0, { rot: [0, 0, al], item: 'universal-joint', says: 'the universal joint at its column\'s foot, on the steering shaft turning inside the column (typical)', parts: [
          P('yoke', { box: [0.012, 0.024, 0.024] }, [-0.009, 0, 0], { ...uj, item: 'uj-yoke', fill: 0.6 }), P('yoke', { box: [0.012, 0.024, 0.024] }, [0.009, 0, 0], { ...uj, item: 'uj-yoke', fill: 0.6, rot: [PI / 2, 0, 0] }),
          P('spider', { cyl: [0.004, 0.026] }, [0, 0, 0], { ...uj, item: 'uj-spider' }), P('spider', { cyl: [0.004, 0.026] }, [0, 0, 0], { ...uj, item: 'uj-spider', rot: [PI / 2, 0, 0] }),
          ...[[0, 0.012, 0], [0, -0.012, 0], [0, 0, 0.012], [0, 0, -0.012]].map((q) => P('bearing cap', { cyl: [0.0055, 0.006] }, q as V3, { ...uj, item: 'uj-cap', joins: ['yoke'], fixed: 'pressed into the ear of its yoke', ...(q[2] !== 0 ? { rot: [PI / 2, 0, 0] as V3 } : {}) }))] })); }
      out.push(tube('intermediate shaft', 0.009, [Y0, P2], 'steel-alloy', 0x3a3a3a, { finish: 'paint', link: 'steering wheel', joint: 'universal', fixed: 'splined into its universal joint', says: 'its intermediate shaft: from the column\'s universal joint down through the toe board to the pinion, a universal joint at each end (typical)' }, 0.009));
      const bh = out.find((p) => p.name === 'bulkhead'); for (const q of bh?.parts ?? []) if (/^(toe board|dash panel)$/.test(q.name)) q.passes = [...(q.passes ?? []), 'intermediate shaft'];
    }
    // (and short of the strut towers ahead of it where they stand as high as it does: a cab-forward van's are under its dash)
    const towerX = fa.susp === 'strut' && Math.min(m.H * 0.62, ftR + 0.55) + 0.045 > dashY - 0.15 ? fa.x - 0.09 - 0.01 : Infinity;
    if (m.lines) out.push(P('dashboard', { loft: { st: [{ x: -0.15, w: dashW, lo: Math.min(0.02, -0.12 + lift), hi: 0.08, n: 4 }, { x: Math.max(-0.05, Math.min(0.25, xWs - dashX - 0.01, towerX - dashX)), w: dashW * 0.95, lo: Math.min(0.0, -0.14 + lift), hi: 0.05, n: 4 }] } }, [dashX, dashY, 0], { mat: 'abs', color: 0x1e1e20, shell: 0.003, finish: 'texture', passes: ['steering column', 'steering shaft', 'cross-car beam'] }));
  } else {
    const bx = m.kind === 'motorcycle' ? front - 0.32 + 0.03 : front - 0.45, by = m.kind === 'motorcycle' ? m.H * 0.93 : m.H * 0.92;
    out.push(tube('handlebar', 0.011, [[bx - 0.04, by + 0.02, -0.4], [bx, by, -0.2], [bx, by, 0.2], [bx - 0.04, by + 0.02, 0.4]], 'al-6061', 0x2a2a2a, { item: 'handlebar' }));
    if (m.kind !== 'motorcycle' && m.upper) out.push(tube('steering post', 0.014, [[front - 0.1, m.upper, 0], [bx, by - 0.012, 0]], 'steel-low', 0x2a2a2a, { says: 'the steering stem from the frame up to the bars (typical)' }));
    for (const s of [-1, 1]) out.push(P(`grip ${s > 0 ? 'right' : 'left'}`, { cyl: [0.016, 0.12] }, [bx - 0.04, by + 0.02, s * 0.38], { rot: [PI / 2, 0, 0], mat: 'rubber', color: 0x1a1a1a, finish: 'texture' }));
  }
  if (m.chain) {
    const ch = m.chain, ax = rear, ay = tyres[tyres.length - 1]!.D / 2, ex0 = m.power.x + ch.at[0], ey = (m.power.y ?? 0.4) + ch.at[1], z = ch.z;
    const pd = (n: number) => ch.pitch / Math.sin(PI / n) / 2, r1 = pd(ch.teeth[0]), r2 = pd(ch.teeth[1]);
    const axleD = m.axles[m.axles.length - 1]!.track === 0 ? 0.022 : Math.max(0.03, tyres[tyres.length - 1]!.rim * 0.12), teeth: Iface = { kind: 'chain', role: 'provides', d: ch.pitch };
    out.push(P(`drive sprocket ${ch.teeth[0]}T`, { cyl: [r1, 0.008] }, [ex0, ey, z], { rot: [PI / 2, 0, 0], facets: ch.teeth[0], mat: 'steel-alloy', color: 0x6a6a6a, finish: 'cast', passes: ['chain top run', 'chain bottom run'], iface: [teeth, { kind: 'shaft', role: 'requires', d: 0.0254, to: 'crankcase', says: 'on the engine\'s output shaft' }] }), P(`axle sprocket ${ch.teeth[1]}T`, { cyl: [r2, 0.006] }, [ax, ay, z], { rot: [PI / 2, 0, 0], facets: Math.min(64, ch.teeth[1]), mat: 'al-6061', color: 0x9a9ea4, finish: 'brushed', passes: ['chain top run', 'chain bottom run', 'rear axle'], says: ch.says, iface: [teeth, { kind: 'shaft', role: 'requires', d: axleD, says: 'its bore, on the axle' }] }));
    // the chain's two runs, tangent to both sprockets (an open belt's outer tangents)
    const dx = ax - ex0, dy = ay - ey, D = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx), b = Math.asin((r1 - r2) / D);
    for (const sg of [1, -1]) { const t = a0 + sg * (PI / 2 + b); out.push(tube(`chain ${sg > 0 ? 'top' : 'bottom'} run`, ch.pitch * 0.22, [[ex0 + r1 * Math.cos(t), ey + r1 * Math.sin(t), z], [ax + r2 * Math.cos(t), ay + r2 * Math.sin(t), z]], 'steel-alloy', 0x3a3a3a, { finish: 'plate', item: ch.item, iface: [{ kind: 'chain', role: 'requires', d: ch.pitch }] })); }
  }
  if (m.kind === 'motorcycle') out.push(P('silencer', { cyl: [0.045, 0.42] }, [rear + 0.35, (m.seatH ?? 0.9) - 0.25, 0.15], { rot: [0, 0, -1.25], mat: 'al-6061', color: 0xb8bcc2, finish: 'brushed' }));
  if (ex.has('exhaust') && m.power.kind !== 'electric') out.push(tube('exhaust', m.kind === 'motorcycle' ? 0.025 : 0.022, m.kind === 'motorcycle' ? [[m.power.x + 0.12, (m.power.y ?? 0.5) + 0.12, 0.04], [m.power.x + 0.2, (m.power.y ?? 0.5) - 0.05, 0.1], [m.power.x - 0.05, (m.power.y ?? 0.5) - 0.08, 0.15], [rear + 0.55, (m.seatH ?? 0.9) - 0.32, 0.15]] : (m.kind === 'car' ? exhaustPath(m) : [[m.power.x, (m.power.y ?? 0.4) + 0.05, 0.12], [m.power.x - 0.25, tyres[tyres.length - 1]!.D * 0.8, 0.2], [-m.L / 2 + 0.15, tyres[tyres.length - 1]!.D * 0.9, 0.2]]) as V3[], 'stainless-304', 0xb8bcc2, { finish: 'brushed' }));
  if (ex.has('exhaust') && m.power.kind !== 'electric' && m.kind === 'car') { const e = out[out.length - 1]!; if (e.shape && 'tube' in e.shape) { e.shape.tube.bend = 0.03; e.item = 'exhaust-pipe'; out.push(...exhaustSystem(e.shape.tube.pts, e.shape.tube.r)); } }
  if (m.kind === 'car') {
    const ev = m.power.kind === 'electric', hy = !!pick.power && pick.power === 'hybrid';
    const pk = packOf(m);
    // (its tray's flange along each side, out to the floor's edge, where it is bolted to the sill's inner: a skateboard
    // pack hangs from its sills so, M10 bolts about every 200 mm, typical)
    // (its pack: the most 21700 cells that fit the room under its floor, 96 in series (a 350 V class pack, typical), in
    // modules on its tray: drawn cell by cell, each cell to its jelly roll)
    const room: V3 = pk ? [pk.x1 - pk.x0, pk.h, 2 * pk.z] : [front - rear - 0.4, 0.12, m.W * 0.8], fitted = ev ? packToFit(room[0], room[1] - 0.012, room[2] - 0.02, '21700', 96) : null;
    if (ev && fitted) out.push(P(`battery pack (${fitted.kWh.toFixed(0)} kWh)`, undefined, pk ? [(pk.x0 + pk.x1) / 2, pk.y0 + pk.h / 2, 0] : [(front + rear) / 2, c + 0.16, 0], { item: 'pack-ev', says: `96 groups of ${fitted.p} 21700 cells in series (${fitted.kWh.toFixed(1)} kWh), as many as fit its floor`,
      parts: [partOf(fitted.pack, [0, -room[1] / 2 + 0.006 + 0.04, 0], [0, 0, 0], { sealed: 'built whole as it is made (components.ts), fitted as it comes' }), P('pack lid', { box: [room[0], 0.004, room[2]] }, [0, room[1] / 2 - 0.002, 0], { item: 'pack-lid', mat: 'al-6061', color: 0x5a5c5e, finish: 'cast', says: 'its sealed lid, the cabin floor on it' }), ...(pk ? [-1, 1].map((sd) => P(`pack flange ${sd > 0 ? 'right' : 'left'}`, { box: [pk.x1 - pk.x0 - 0.04, 0.03, 0.02] }, [0, pk.h / 2 - 0.015, sd * (pk.z + 0.01)], { mat: 'al-6061', color: 0x5a5c5e, finish: 'cast', kg: 0, fixed: 'part of its pack\'s tray along its side, bolted to its sill\'s inner', says: 'its tray\'s side flange, bolted to the sill\'s inner every 200 mm (typical)', item: 'pack-tray' })) : [])] }));
    else {
      const ft = floorOf(m)?.tank, tb: V3 = ft ? [ft.x1 - ft.x0, ft.h, ft.z1 - ft.z0] : [0.5, 0.2, 0.5], ta: V3 = ft ? [(ft.x0 + ft.x1) / 2, ft.y0 + ft.h / 2, (ft.z0 + ft.z1) / 2] : [rear + 0.35, c + 0.12, -0.3];
      out.push(P(`fuel tank (${Math.round(tb[0] * tb[1] * tb[2] * 1000)} L)`, { box: tb }, ta, { mat: 'pe', color: 0x1a1a1a, shell: 0.005, finish: 'texture', fixed: 'strapped up under the rear floor against the heel kick (its straps not drawn)', says: 'its tank and the fuel in it, under the rear seat beside the exhaust (about 50 L, typical)', parts: [P('petrol', undefined, [0, 0, 0], { kg: tb[0] * tb[1] * tb[2] * 1000 * 0.74 * 0.5, says: 'half a tank (typical)' })] }));
      // (across the car: on the engine's left end, as deep as from just behind its drive shafts to just ahead of its crank;
      // along it, behind the engine)
      const pw2 = powerAt(m), es2 = engineSize(pw2, true).s;
      if (across(m)) {
        // (its transaxle built from its parts (drivetrain.ts) in the room on the engine's end, its differential on the
        // drive shafts' line: a CVT where its maker fits one, else a six-speed manual)
        const b = bayOf(m, es2), ax = m.axles[0]!.x, x0 = ax - 0.08, x1 = pw2.x + 0.06, cy = pw2.y! - 0.05, ty = tyreOf(m.axles[0]!.tyre)!.D / 2;
        // (its bell housing's face on the engine's block, the drive plate or flywheel inside it: where that plate is as the
        // engine is built and turned, 4 mm on past its face; its far end where the bay leaves room)
        const eng = out.find((q) => q.item === 'engine-ice'), side = Math.sign((b.gb[0] + b.gb[1]) / 2 - (pw2.z ?? 0)) || -1, plate = eng ? layout(eng).find((n) => /^(drive plate|flywheel)$/.test(n.p.name) && n.box) : undefined;
        const near = plate ? (side < 0 ? plate.box!.max.z : plate.box!.min.z) - side * 0.004 : side < 0 ? b.gb[1] : b.gb[0], far = side < 0 ? b.gb[0] : b.gb[1];
        b.gb = side < 0 ? [far, near] : [near, far];
        // (as long and as tall as the room the bay gives it and the plate needs, 15 mm round the plate's ring gear, its middle
        // level with the crank's where it has a plate to cover)
        const pb = plate?.box, gx0 = pb ? Math.min(x0, pb.min.x - 0.015) : x0, gx1 = pb ? Math.max(x1, pb.max.x + 0.015) : x1, gH = pb ? Math.max(0.3, pb.max.y - pb.min.y + 0.03) : 0.35, gcy = pb ? (pb.min.y + pb.max.y) / 2 : cy, gcx = (gx0 + gx1) / 2;
        const g = transaxle({ kind: m.gearbox ?? 'manual', room: [gx1 - gx0, gH, b.gb[1] - b.gb[0]], diff: [ax - gcx, ty - gcy], torque: m.power.torque ?? m.power.kW * 1.6, says: m.gearbox === 'cvt' ? 'a CVT: a push belt between two variable pulleys (as its maker fits)' : 'a six-speed manual (typical)' });
        const pass = (p: Part): Part => ({ ...p, passes: ['drive shaft left', 'drive shaft right', 'inner joint boot'], ...(p.parts ? { parts: p.parts.map(pass) } : {}) });
        out.push({ ...pass(g.gearbox), at: [gcx, gcy, (b.gb[0] + b.gb[1]) / 2], sealed: 'built whole from its parts (drivetrain.ts), fitted as it comes', says: `${g.gearbox.says}; ${Math.round(g.kg)} kg as its ${g.pieces} pieces come to` });
      }
      else out.push(P('gearbox', { box: [0.45, 0.3, 0.3] }, [pw2.x - es2[0] / 2 - 0.225, pw2.y! - 0.05, 0], { mat: 'al-a380', color: 0x8c8e90, kg: 45, finish: 'cast', says: 'about 45 kg, behind the engine (typical)' }));
      if (hy) { const hp = packToFit(0.5, 0.2, 0.6, '18650', 56); out.push(P(`hybrid battery (${hp.kWh.toFixed(1)} kWh)`, undefined, [rear + 0.6, c + 0.2, 0], { item: 'pack-hybrid', says: `56 groups of ${hp.p} 18650 cells in series under the rear seat (typical of a hybrid's pack)`, parts: [partOf(hp.pack, [0, -0.06, 0], [0, 0, 0], { sealed: 'built whole as it is made (components.ts), fitted as it comes' })] })); }
      // its starting battery: a BCI group 35 (typical of a small car's) on a moulded tray over its gearbox, as front-drive
      // cars carry it, held down by a clamp bar on two J-bolts hooked under the tray
      if (m.kind === 'car' && across(m)) {
        const b = bayOf(m, es2), ax = m.axles[0]!.x, gx = (ax - 0.08 + pw2.x + 0.06) / 2, gz0 = (b.gb[0] + b.gb[1]) / 2, top = pw2.y! - 0.05 + 0.175 + 0.012, bat = starterBattery('35'), bs = boundsOfAll(bat).getSize(new THREE.Vector3());
        // (in from the strut's spring where the two stand side by side: its outer edge 10 mm short of the spring's coils
        // (their 60 mm round the strut's axis) at the battery's top, where the leaning strut comes furthest in)
        const st0 = strutOf(m.axles[0]!, tyres[0]!, m), zRoom = st0.zAt(top + bs.y) - 0.06 - 0.01 - bs.z / 2 - 0.015, gz = Math.abs(gx - ax) < bs.x / 2 + 0.015 + 0.07 ? Math.sign(gz0) * Math.min(Math.abs(gz0), zRoom) : gz0;
        out.push(P('battery and its tray', undefined, [gx, top, gz], { item: 'battery-mount', parts: [
          P('battery tray', { box: [bs.x + 0.03, 0.006, bs.z + 0.03] }, [0, 0.003, 0], { item: 'battery-tray', mat: 'pp', color: 0x1a1a1a, finish: 'texture', says: 'moulded, bolted to its bracket on the gearbox' }),
          partOf(bat, [0, 0.006, 0], [0, 0, 0], { item: 'battery-sli', sealed: 'built whole as it is made (components.ts), fitted as it comes' }),
          P('hold-down clamp', { box: [0.03, 0.008, bs.z + 0.04] }, [0, 0.006 + bs.y + 0.004, 0], { item: 'battery-clamp', mat: 'steel-low', color: 0x1a1a1a, finish: 'paint', says: 'a pressed bar across its top, between its posts' }),
          ...[-1, 1].flatMap((sd) => [
            use('threadedrod M6 250', [0, bs.y / 2, sd * (bs.z / 2 + 0.012)], { name: 'J-bolt', fixed: 'hooked under its tray, up through its clamp' }),
            use('nut M6', [0, 0.006 + bs.y + 0.008, sd * (bs.z / 2 + 0.012)], { passes: ['J-bolt'] }),
          ]),
        ] }));
      }
    }
    if (!m.mass) out.push(P('wiring harness', undefined, [0, 0.6, 0], { kg: 40, says: 'about 40 kg of copper and insulation (typical)' }), P('climate system', undefined, [0.5, 0.6, 0], { kg: 20, says: 'typical' }), P('trim, carpets and sound deadening', undefined, [0, 0.5, 0], { kg: 60, says: 'typical' }), P('oil, coolant and other fluids', undefined, [0, 0.4, 0], { kg: 15, says: 'typical' }), P('body in white', undefined, [0, 0.5, 0], { kg: 230, says: 'its pressed and welded structure inside its skin: sills, pillars, floor, crossmembers (about 280–350 kg with its panels, typical)' }));
  }
  // (after the gearbox and the battery, so its hoses are routed round them too)
  // (its cooling module ahead of a car's or a truck's engine, as close as its fan allows (typical): the radiator its parts
  // make, its hoses to the engine's water outlet and inlet)
  if ((m.kind === 'car' || m.kind === 'truck') && m.power.kind !== 'electric') {
    const pw = powerAt(m), es = engineSize(pw, m.kind !== 'truck').s, ext = across(m) ? es[2] : es[0], truck = m.kind === 'truck', w = truck ? 1.0 : Math.min(0.66, ext * 1.1), h = truck ? 0.95 : 0.42;
    // (under the hood's latch where they stand one over the other: the latch on the core support's upper bar, the
    // radiator's cap 10 mm under it, as a car's are built)
    const laid = layout(P('so far', undefined, [0, 0, 0], { parts: out }));
    let xr0 = pw.x + ext / 2 + (truck ? 0.17 : 0.11);
    // (and far enough ahead of its engine's hottest forward piece (a V engine's front exhaust manifold stands out past its
    // block) that its fan's plastic stands the heat: the heat gate's own distance for it, make/rules.ts)
    const hotF = laid.filter((n) => (n.p.hot ?? 0) > AMBIENT && (n.sub ?? n.box)).map((n) => ({ x: (n.sub ?? n.box)!.max.x, T: n.p.hot! }));
    if (hotF.length) {
      const fanAt = layout(P('module', undefined, [0, 0, 0], { parts: [coolingModule({ w, h, truck })] })).filter((n) => /^fan( shroud| motor| hub| blade)?$/.test(n.p.name) && (n.sub ?? n.box));
      const rear = Math.min(...fanAt.map((n) => (n.sub ?? n.box)!.min.x)), lim = MAX_SERVICE[truck ? 'fibreglass' : 'pp'] ?? 100;
      const need = Math.max(...hotF.map((q) => q.x + HEAT_FALLOFF * Math.log((q.T - AMBIENT) / Math.max(1, lim - AMBIENT)) + 0.005));
      if (Number.isFinite(rear)) xr0 = Math.max(xr0, need - rear);
    }
    const latch = laid.filter((n) => /^hood latch$/.test(n.p.name) && n.sub && Math.abs((n.sub.min.x + n.sub.max.x) / 2 - xr0) < 0.12).map((n) => n.sub!.min.y);
    const yr0 = pw.y! + (truck ? 0.08 : 0.02), yr = latch.length ? Math.min(yr0, Math.min(...latch) - 0.01 - 0.028 - h / 2) : yr0;
    const at: V3 = [xr0, yr, 0], rel = (q: V3): V3 => [q[0] - at[0], q[1] - at[1], q[2] - at[2]];
    // (each hose on to the end of the engine's own hose of that name, where the engine has one, as fitted: found where the
    // engine is placed; otherwise to its end's outlet and inlet)
    const eng = out.find((q) => q.item === 'engine-ice'), ends = new Map<string, { e: THREE.Vector3; d: THREE.Vector3 }>(), boxes: OBB[] = [];
    if (eng) for (const n of laid) {
      const sh = n.p.shape;
      if (sh && 'tube' in sh && /^(upper|lower) radiator hose$/.test(n.p.name)) { const k = sh.tube.pts.length, e = new THREE.Vector3(...sh.tube.pts[k - 1]!).applyMatrix4(n.m), e0 = new THREE.Vector3(...sh.tube.pts[k - 2]!).applyMatrix4(n.m); ends.set(n.p.name.split(' ')[0]!, { e, d: e.clone().sub(e0).normalize() }); }
      boxes.push(...n.pieces.map((b) => ({ ...b, name: n.p.name })));
    }
    // (each hose from the radiator's tank on the side nearer its end, back behind the fan, then the first way clear of all
    // that is there (5 mm round it, its own radius 17 mm): straight, across ahead of the engine, or over its top; on to the
    // engine's hose along that hose's own line)
    const engTop = eng ? Math.max(...boxes.map((b) => b.c.y + Math.abs(b.u[0].y) * b.h[0] + Math.abs(b.u[1].y) * b.h[1] + Math.abs(b.u[2].y) * b.h[2])) : 0, rh = truck ? 0.03 : 0.017;
    const route = (which: 'upper' | 'lower', y0: number): V3[] | undefined => {
      const end = ends.get(which); if (!end) return undefined;
      const sg = Math.sign(end.e.z - at[2]) || -1, fx = -((truck ? 0.06 : 0.026) / 2 + 0.06), V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z), ways: THREE.Vector3[][] = [];
      // (out of the tank's end, or its back; behind the fan; then by straight runs along x, y and z in each order, or up over
      // the engine and down, to a point on the engine's hose's line beyond its end, and along that line on to it)
      for (const zo of [0, 0.03, 0.06]) for (const lead of [0.05, 0.1, 0.02, 0]) {
        const zT = sg * (w / 2 - 0.02 + zo), A = V(at[0], at[1] + y0, at[2] + sg * (w / 2 - 0.02)), A2 = V(at[0], at[1] + y0, at[2] + zT), B = V(at[0] + fx - 0.09, at[1] + y0, at[2] + zT), E2 = end.e.clone().addScaledVector(end.d, lead), E1 = end.e.clone().addScaledVector(end.d, 0.03);
        const head = zo ? [A, A2, B] : [A, B], tail = lead > 0.03 ? [E2, E1, end.e] : [E2, end.e];
        const ax = (p0: THREE.Vector3, order: string, to: THREE.Vector3) => { const out2: THREE.Vector3[] = []; const c = p0.clone(); for (const k of order) { c[k as 'x' | 'y' | 'z'] = to[k as 'x' | 'y' | 'z']; out2.push(c.clone()); } return out2; };
        for (const o of ['xyz', 'xzy', 'yxz', 'yzx', 'zxy', 'zyx']) ways.push([...head, ...ax(B, o, E2), ...tail.slice(1)]);
        for (const yT of [engTop + rh + 0.015, engTop + rh + 0.04]) for (const o of ['xz', 'zx']) { const up2 = V(B.x, yT, B.z), mid = ax(up2, o, V(E2.x, yT, E2.z)); ways.push([...head, up2, ...mid, E2, ...tail.slice(1)]); }
      }
      const near = boxes.filter((b) => (b as OBB & { name?: string }).name !== `${which} radiator hose` );
      const w0 = clearPath(ways.map((w1) => w1.filter((q, i) => i === 0 || q.distanceTo(w1[i - 1]!) > 1e-6)), near, rh + 0.005, 0.012); return w0 ? w0.map((v) => rel([v.x, v.y, v.z])) : undefined;
    };
    const up = route('upper', h / 2 - 0.04), lo = route('lower', -h / 2 + 0.04);
    out.push({ ...coolingModule({ w, h, truck, to: { outlet: up ?? rel([pw.x + ext / 2 - 0.02, pw.y! + es[1] * 0.3, -w / 2 + 0.05]), inlet: lo ?? rel([pw.x + ext / 2 - 0.02, pw.y! - es[1] * 0.1, -w / 2 + 0.05]), ...(up || lo ? { joins: ['upper radiator hose', 'lower radiator hose'] } : {}) } }), at, sealed: 'built whole from its parts (fittings.ts), fitted as it comes' });
  }
  // its front structure, fitted to all that is in its bay, under its floor and in its skins, now that they are made
  if (m.lines && m.frame === 'shell' && m.kind === 'car') out.push(...frontFrame(m, out, tyres));
  if (m.lines && m.frame === 'shell' && m.kind === 'car') out.push(...rearFrame(m, out));
  // its paint's look on every piece in its body's colour (a paint sanded back to its primer, say)
  if (m.paint) { const lay = (q: Part) => { if (q.color === m.color && q.shape) q.look = m.paint; q.parts?.forEach(lay); }; out.forEach(lay); }
  // what it weighs, against what its maker says
  const modelled = out.reduce((a, p) => a + approxMass(p), 0);
  const parts = [...out];
  if (m.mass) {
    const rest = m.mass - modelled;
    if (rest > 0) parts.push(P('the rest of it', undefined, [(front + rear) / 2, c + 0.3, 0], { kg: rest, says: `what is not drawn (trim, wiring, fluids, fittings): its published ${Math.round(m.mass)} kg${m.massSays ? ` (${m.massSays})` : ''} less the ${Math.round(modelled)} kg of parts drawn` }));
  }
  return P(m.name, undefined, [0, 0, 0], { parts, road: m.road, ...(m.mirrors !== undefined ? { mirrors: m.mirrors } : {}), published: m.mass, says: m.says + (m.mass && modelled > m.mass * 1.02 ? ` (its parts as drawn weigh ${Math.round(modelled)} kg, more than its published ${Math.round(m.mass)} kg: a fault in the drawing)` : '') });
}
// a part's mass for the reckoning above: the one rule everything is weighed by (mass.ts), from the start, so a machine
// made before the kits are loaded is not reckoned as weighing nothing (which once made its "rest" its whole published
// mass, and a Corolla 2.1 t)
let approxMass: (p: Part) => number = massOf;
/** (kits.ts gives its mass rule, so a machine's published mass is reckoned against the same masses everything uses) */
export function useMass(f: (p: Part) => number): void { approxMass = f; }

// ---- the machines: real ones by their published figures, the rest typical -------------------------------------------
const red = 0xb3202a;
/** The 2004 Monte Carlo SS as its maker built it (the custom one below is built on it). */
const MONTE_CARLO_04: Machine = {
    id: 'montecarlo04', short: 'monte carlo', name: 'Chevrolet Monte Carlo SS (2004)', kind: 'car', gearbox: 'automatic', source: 'dimensions: automobile-catalog.com and carspecs.us (2004 Monte Carlo SS, 3.8 L); track, brakes and suspension: cars.com 2004 Monte Carlo specifications; engine: L36 bore and stroke and ratings from tuning-specification listings; wheel bolt pattern from wheel-fitment listings (each read from search results, the pages themselves not reachable from here)',
    L: 197.9 * IN, W: 72.7 * IN, H: 55.2 * IN, clearance: 5.5 * IN, frame: 'shell', hand: -1,
    axles: [{ x: (197.9 / 2 - 40.5) * IN, track: 62 * IN, tyre: '225/60R16', steer: true, drive: true, brake: { kind: 'disc', d: 11.93 * IN, vented: true }, susp: 'strut' }, { x: (197.9 / 2 - 40.5 - 110.5) * IN, track: 61 * IN, tyre: '225/60R16', brake: { kind: 'disc', d: 10.94 * IN }, susp: 'strut' }],
    // (its lines measured off a photograph of one side-on (the user's, 2026-10-29), scaled by its published 110.5-in.
    // wheelbase, which its 225/60R16-sized tyres agree with to 2 %; its ends, nearer the lens's edge, foreshortened, so its
    // overhangs scaled by their own published lengths: estimates, said so)
    lines: { cowl: 0.274, roofF: 0.4, roofR: 0.642, deck: 0.76, belt: 0.675, nose: 0.563, tail: 0.75, wedge: 0.04, sail: 0.035, cowlH: 0.72, deckH: 0.81, doorR: 0.581, dloR: 0.668, n: 5, doors: 1, haunch: { waist: 0.035, front: 0.55, lift: 0.05 }, face: { lamp: 0.11, grille: 0.06, tail: 0.23, wrap: 0.18 } },
    seats: [{ x: -0.15, z: -0.38, y: 0.52, style: 'bucket' }, { x: -0.15, z: 0.38, y: 0.52, style: 'bucket' }, { x: -1.0, z: 0, y: 0.55, style: 'bench' }],
    power: { kind: 'vee', vee: 90, block: 'iron', cc: 3791, kW: 149, x: 1.6, cyl: 6, bore: 0.0965, stroke: 0.0864, cams: 'ohv', valves: 2, torque: 305, fit: 'gm-3800-l36', says: '3.8 L V6 (GM 3800 Series II, L36: 96.5 × 86.4 mm, 90° vee, iron block, pushrods, two valves a cylinder), 200 hp at 5,200 rpm, 225 lb-ft (305 N·m) at 4,000 rpm (listings for the 2004 Monte Carlo SS); its place ahead of the front axle an estimate' },
    controls: 'wheel', rims: { style: 'spokes', spokes: 5, mat: 'al-6061', lugs: 5, lug: 12, color: 0xc8ccd2, pcd: 115, offset: 45 }, extras: ['exhaust'], road: 'us', mass: 3435 * LB, massSays: 'curb weight, automobile-catalog.com (others give 3,395 lb)', color: 0x6a0f1c,
    says: 'a large front-drive coupe on GM\'s W-body, its 3.8 L V6 across the front driving through a four-speed automatic; its lines measured off a side-on photograph scaled by its wheelbase (estimates: see its lines), its wheels 16-in. five-spoke aluminium on 5 × 115 mm studs, M12 × 1.5 (wheel-fitment listings), their offset 45 mm (an estimate: not published here)',
  
};
export const MACHINES: Machine[] = [
  {
    id: 'corolla', short: 'corolla', name: 'Toyota Corolla LE (2025)', kind: 'car', gearbox: 'cvt', source: 'Toyota, 2025 Corolla eBrochure: dimensions, tread, curb weight, brakes',
    L: 182.3 * IN, W: 70.1 * IN, H: 56.5 * IN, clearance: 5.3 * IN, frame: 'shell', hand: -1,
    axles: [{ x: (182.3 / 2 - 37) * IN, track: 60.3 * IN, tyre: '205/55R16', steer: true, drive: true, brake: { kind: 'disc', d: 10.8 * IN, vented: true }, susp: 'strut' }, { x: (182.3 / 2 - 37 - 106.3) * IN, track: 61.0 * IN, tyre: '205/55R16', brake: { kind: 'disc', d: 10.2 * IN }, susp: 'beam' }],
    // (its lines measured off a side elevation of the E210 sedan, scaled by its published wheelbase: see its says)
    lines: { cowl: 0.23, roofF: 0.49, roofR: 0.66, deck: 0.9, belt: 0.648, nose: 0.52, tail: 0.74, wedge: 0.14, sail: 0.073, cowlH: 0.68, deckH: 0.771, bow: [0.7, 0.75], doorR: 0.755, dloR: 0.79, n: 5 },
    seats: [{ x: -0.1, z: -0.38, y: 0.55, style: 'bucket' }, { x: -0.1, z: 0.38, y: 0.55, style: 'bucket' }, { x: -0.95, z: 0, y: 0.57, style: 'bench' }],
    power: { kind: 'inline', cc: 1987, kW: 126, x: 1.55, cyl: 4, bore: 0.0805, stroke: 0.0976, torque: 205, fit: 'm20a-fks', says: '2.0 L four-cylinder Dynamic Force engine (M20A-FKS: 80.5 × 97.6 mm, DOHC, four valves a cylinder), 169 hp at 6,600 rpm, 151 lb-ft (205 N·m) (Toyota)' },
    controls: 'wheel', rims: { style: 'steel', cover: { spokes: 8, pairs: 6, sweep: 4, width: [0.42, 0.56], emblem: true, says: '8 broad spokes in 4 V-pairs, each widening to its rim, a domed centre with its emblem (Toyota part 42602-02540, the LE\'s 16-in. cover, from its catalogue photograph: its spread, sweep and widths estimated from it; its five holes over the nuts not cut)' }, mat: 'steel-low', lugs: 5, lug: 12, color: 0x2a2c2e, pcd: 100, offset: 45 }, extras: ['exhaust'], road: 'us', mass: 2955 * LB, massSays: 'curb weight, Toyota', color: 0xb8bcc2,
    says: 'its lines: its windscreen\'s foot 0.23 of its length from its nose, its roof from 0.49 to 0.66, its back glass\'s foot 0.90, its belt 930 mm up at its cowl rising 140 mm to its deck, its windscreen\'s foot 976 mm up and its back glass\'s 1,106 mm, its rear door\'s top rear corner 0.755 of its length from its nose and its side glass ending at 0.79, its front door\'s leading edge 0.303 of its length from its nose (0.073 behind its windscreen\'s foot), its hood\'s front edge about 750 mm up and its deck 1,060 mm at its tail, measured off dimensions.com\'s side elevation of the E210 sedan scaled by its published 106.3-in. wheelbase (so scaled, that drawing\'s length agrees with the published 182.3 in to 0.3 % and its tyre with a 225/40R18\'s to 2 %: a third party\'s drawing, so these are estimates); its tyres 205/55R16 (typical of its 16-in. wheels: Toyota gives the wheel size, not the tyre code here); its front overhang about 37 in (an estimate from its length and wheelbase); its 16-in. steel wheels under full wheel covers (Toyota, 2025 Corolla LE), on 5 × 100 mm studs, M12 × 1.5, at a +45 mm offset (wheel fitment listings for the E210)',
  },
  MONTE_CARLO_04,
  // (the user's own, from their photograph (2026-10-29): gloss black, a red body kit (flares riveted round its arches, skirts,
  // a front lip and a rear valance, a scoop's insert on each rear quarter, a wing on its deck with red end plates and
  // uprights), black five-spoke wheels about 20 in. with a red stripe down each spoke and round the rim; the wheels'
  // size and the tyres (245/35R20, the size that keeps its rolling diameter) read off the photograph: estimates; the
  // colours sampled from it, lit by sun)
  // (the user's own as it stands, from their photographs in their garage (2026-10-29): its black paint sanded back in
  // broad patches to a tan primer, red bolt-on flares round all four arches with red-painted heads, a red ducktail on its
  // deck lid, red mirrors, its own 16-in. five-spoke wheels painted black with a red lip on its stock 225/60R16 tyres;
  // the colours sampled from the photographs under a flash (estimates), the flares' and the ducktail's sizes read off them)
  { ...MONTE_CARLO_04, id: 'montecarlo04-mine', short: 'my monte carlo', name: 'Chevrolet Monte Carlo SS (2004), the owner\'s, in its garage', color: 0x161618, mirrors: 0xaf2b36,
    paint: { auto: false, coat: { colour: 0x161618, flake: 0, clear: 0, rough: 0.55, primer: 0xc8bd9d, sanded: true }, wear: 0.6 },
    rims: { ...MONTE_CARLO_04.rims, color: 0x141416, lip: 0xaf2b36, cap: 0x1a1a1c },
    kit: { color: 0xaf2b36, flares: { w: 0.08, t: 0.02, from: 8, to: 172, every: 20, heads: 0xaf2b36 }, spoiler: { h: 0.1, d: 0.28, span: 0.86 },
      says: 'its owner\'s own: red bolt-on flares, a red ducktail spoiler (moulded ABS, typical), as in its owner\'s photographs' },
    says: MONTE_CARLO_04.says + '; this one its owner\'s, as it stands in their garage: its paint sanded back to primer, red flares, a red ducktail and red mirrors, its wheels black with a red lip' },
  // (its body and kit fitted to the goal picture by Picture to model, 2026-10-29 (docs/RECONSTRUCT.md, third round): its
  // outline by recipe I, then its features one group at a time (Geometry fitted to its features), its intake and vent
  // taken off the picture onto its surface. Each the picture's (a made picture: how the goal is drawn, not a measurement
  // of a car), each ± in the doc; a figure the picture did not fix kept as it was)
  { ...MONTE_CARLO_04, id: 'montecarlo04-kit', short: 'monte carlo custom', name: 'Chevrolet Monte Carlo SS (2004), black with a red body kit', color: 0x141416,
    H: 1.43, clearance: 0.13, lines: { ...MONTE_CARLO_04.lines!, nose: 0.515, cowl: 0.281, roofF: 0.434, roofR: 0.646, deck: 0.774, tail: 0.762, cowlH: 0.706, deckH: 0.835, belt: 0.641, dloR: 0.68, doorR: 0.584, face: { ...MONTE_CARLO_04.lines!.face, lamp: 0.104, wrap: 0.385 } },
    // (its rims 21 in by the picture's (fitted, 2026-10-30), on tyres of the same diameter as before)
    axles: MONTE_CARLO_04.axles.map((a) => ({ ...a, tyre: '245/30R21' })),
    rims: { ...MONTE_CARLO_04.rims, color: 0x18181a, accent: 0xb3121f, lip: 0xb3121f, cap: 0x1a1a1c },
    kit: { color: 0xb3121f, flares: { w: 0.083, t: 0.01, from: 22, to: 156, every: 16, inset: 0.05 }, skirts: { h: 0.099, t: 0.03 }, lip: { d: 0.12, t: 0.02, out: 0.033, sd: 0.54, sh: 0.09, rise: 0 }, valance: { d: 0.1, t: 0.018, out: 0.008, sd: 0.36, sh: 0.07, rise: 0.11 },
      scoop: [[0.874, 0.799], [0.405, 0.818], [0.399, 0.737], [0.464, 0.618], [0.55, 0.498], [0.643, 0.428], [0.872, 0.404], [0.845, 0.442], [0.777, 0.461], [0.698, 0.539], [0.619, 0.653], [0.568, 0.767], [0.851, 0.764]],
      vent: [[0.851, 0.764], [0.568, 0.767], [0.619, 0.653], [0.698, 0.539], [0.777, 0.461], [0.845, 0.442]],
      wing: { chord: 0.236, h: 0.069, span: 0.686, pitch: 8, back: 0.3, color: 0x141416, plate: 0.475, plateH: 0.097 },
      says: 'its body kit as in its owner\'s photograph: red flares, skirts, lip, valance and scoop inserts, a black wing with red end plates and uprights; each piece\'s size read off the photograph (estimates), moulded ABS (typical)' },
    says: MONTE_CARLO_04.says + '; this one gloss black, with a red body kit and black and red 20-in. wheels, as in its owner\'s photograph' },
  {
    id: 'rancher', short: 'rancher', name: 'Honda FourTrax Rancher 4x4 (2026)', kind: 'atv', source: 'Honda Powersports, 2026 FourTrax Rancher 4x4 specifications',
    L: 82.8 * IN, W: 47.4 * IN, H: 46.2 * IN, clearance: 7.1 * IN, frame: 'tube', seatH: 33.6 * IN, upper: 33.6 * IN - 0.18,
    axles: [{ x: 25 * IN, track: 36 * IN, tyre: '24x8-12', steer: true, drive: true, brake: { kind: 'disc', d: 0.19 }, susp: 'wishbone' }, { x: -25 * IN, track: 36.5 * IN, tyre: '24x10-11', drive: true, brake: { kind: 'drum', d: 0.16 }, susp: 'swingarm' }],
    seats: [{ x: -0.15, z: 0, y: 33.6 * IN, style: 'saddle' }],
    power: { kind: 'single', cc: 420, kW: 20, x: 0.05, y: 0.42, cooling: 'liquid', says: 'a 420 cc liquid-cooled single (typical of the Rancher: its displacement is in Honda\'s own model line, not in this page)' },
    controls: 'bars', rims: { style: 'steel', mat: 'steel-low', lugs: 4, lug: 10, color: 0x2a2a2a }, extras: ['fenders', 'racks', 'exhaust', 'lights'], mass: 615 * LB, massSays: 'curb weight with fluids and a full tank, Honda', color: red,
    says: 'front brakes dual 190 mm discs, rear a 160 mm drum; 6.7 in of travel front and rear (Honda); its track about 36 in (an estimate: Honda gives its width, 47.4 in)',
  },
  {
    id: 'crf450r', short: 'crf450r', name: 'Honda CRF450R (2025)', kind: 'motorcycle', source: 'Honda Powersports, 2025 CRF450R specifications and brochure',
    L: 2.183, W: 0.827, H: 1.27, clearance: 13.1 * IN, frame: 'backbone', seatH: 38.0 * IN, rake: 27.3 * PI / 180,
    axles: [{ x: 58.3 * IN / 2, track: 0, tyre: '80/100-21', steer: true, brake: { kind: 'disc', d: 0.26 } }, { x: -58.3 * IN / 2, track: 0, tyre: '120/80-19', drive: true, brake: { kind: 'disc', d: 0.24 } }],
    seats: [{ x: -0.25, z: 0, y: 38.0 * IN, style: 'saddle' }],
    power: { kind: 'single', cc: 450, kW: 40, x: 0.05, y: 0.55, bore: 0.096, stroke: 0.0621, cams: 'sohc', valves: 4, cooling: 'liquid', says: 'a 450 cc single, 96 × 62.1 mm, Unicam SOHC, four valves, liquid-cooled (Honda)' },
    controls: 'bars', rims: { style: 'wire', spokes: 36, mat: 'al-6061', lugs: 0, lug: 8, color: 0x1a1a1a }, extras: ['tank', 'number', 'exhaust'], chain: { teeth: [13, 49], pitch: 0.015875, at: [-0.12, -0.12], z: -0.093, says: 'a 520 chain on 13 and 49 teeth (typical of a 450 motocrosser; Honda fits its own ratio)' }, mass: 245 * LB, massSays: 'curb weight, Honda', color: red,
    says: 'wheelbase 58.3 in, seat 38.0 in, rake 27.3°, trail 4.5 in (Honda); its front tyre 80/100-21 (typical of a 21-in. motocross front); its length and width typical of a 450 motocrosser (estimates)',
  },
  {
    id: '8fgcu25', short: '8fgcu25', name: 'Toyota 8FGCU25 forklift', kind: 'forklift', source: 'Toyota Material Handling, Core IC Cushion spec sheet (2024)',
    L: 2.380, W: 1.065, H: 2.115, clearance: 0.1, frame: 'ladder', hand: -1,
    axles: [{ x: 2.380 / 2 - 0.55, track: 0.890, tyre: '21x7x15', drive: true, brake: { kind: 'drum', d: 0.28 }, susp: 'rigid' }, { x: 2.380 / 2 - 0.55 - 1.485, track: 0.915, tyre: '16x6x10.5', steer: true, susp: 'pivot' }],
    seats: [{ x: -0.25, z: 0, y: 1.05, style: 'pan' }],
    power: { kind: 'inline', cc: 2237, kW: 38, x: -0.25, y: 0.55, cyl: 4, bore: 0.091, stroke: 0.086, cams: 'ohv', valves: 2, says: 'a 2,237 cc four (Toyota\'s 4Y: 91 × 86 mm, pushrods, two valves a cylinder), 51 hp at 2,570 rpm (Toyota)' },
    controls: 'wheel', rims: { style: 'disc', mat: 'steel-low', lugs: 6, lug: 14, color: 0x1a1a1a }, extras: ['mast', 'guard', 'counterweight'], guardH: 2.05, mass: 3630, massSays: 'total truck weight, Toyota', color: 0xd8a21a,
    says: 'length to its fork face 2,380 mm, wheelbase 1,485 mm, tread 890/915 mm, overhead guard 2,050 mm, mast 2,115 mm lowered and 4,560 mm raised (Toyota); its cushion tyres 21x7x15 and 16x6x10.5 (typical of a 5,000 lb cushion truck)',
  },
  {
    id: 'cascadia', short: 'cascadia', name: 'Freightliner Cascadia 126 day cab 6x4', kind: 'truck', source: 'Freightliner Australia, Cascadia 126 specification list (May 2023)',
    L: 7.166, W: 2.5, H: 3.03, clearance: 0.25, frame: 'ladder', hand: -1,
    axles: [{ x: 7.166 / 2 - 1.315, track: 2.05, tyre: '315/80R22.5', steer: true, brake: { kind: 'disc', d: 0.43 }, susp: 'leaf' }, { x: 7.166 / 2 - 1.315 - 4.425 + 1.295 / 2, track: 1.85, tyre: '11R22.5', drive: true, dual: true, brake: { kind: 'disc', d: 0.43 }, susp: 'air' }, { x: 7.166 / 2 - 1.315 - 4.425 - 1.295 / 2, track: 1.85, tyre: '11R22.5', drive: true, dual: true, brake: { kind: 'disc', d: 0.43 }, susp: 'air' }],
    seats: [{ x: 7.166 / 2 - 3.22 + 0.55, z: -0.5, y: 1.55, style: 'bucket' }, { x: 7.166 / 2 - 3.22 + 0.55, z: 0.5, y: 1.55, style: 'bucket' }],
    power: { kind: 'diesel', cc: 14800, kW: 375, x: 7.166 / 2 - 1.3, y: 1.15, cyl: 6, bore: 0.139, stroke: 0.163, says: 'a Detroit DD15, 14.8 L, six cylinders of 139 × 163 mm (Detroit) (Freightliner: the 126 in. cab takes the DD15)' },
    controls: 'wheel', rims: { style: 'disc', mat: 'al-6061', lugs: 10, lug: 22, color: 0xd8dce2 }, extras: ['cab', 'tanks', 'stacks', 'fifth wheel'], road: true, mass: 8200, massSays: 'day cab 6x4 at 4,425 mm, Freightliner Australia', color: 0xf2f2ee,
    says: 'BBC 3,220 mm, cab 3,030 mm high, wheelbase 4,425 mm, rear axles 1,295 mm apart, front overhang 1,315 mm, frame 11 × 85 × 287 mm (Freightliner); 2.5 m wide (the legal limit in Australia)',
  },
  {
    id: 'x350', short: 'x350', name: 'John Deere X350 lawn tractor (42 in deck)', kind: 'mower', source: 'John Deere (engine, tyres, deck); TractorData.com (wheelbase, weight)',
    L: 1.75, W: 1.2, H: 1.1, clearance: 0.08, frame: 'ladder',
    axles: [{ x: 49.4 * IN / 2 + 0.05, track: 0.78, tyre: '15x6.00-6', steer: true, susp: 'pivot' }, { x: -49.4 * IN / 2 + 0.05, track: 0.8, tyre: '20x10-8', drive: true, susp: 'rigid' }],
    seats: [{ x: -0.3, z: 0, y: 0.78, style: 'pan' }],
    power: { kind: 'twin', cc: 726, kW: 16, x: 0.55, y: 0.45, bore: 0.078, stroke: 0.076, says: 'a Kawasaki FR651V, 44.3 cu in (726 cc) V-twin, 21.5 hp (16.0 kW) (John Deere)' },
    controls: 'wheel', rims: { style: 'disc', mat: 'steel-low', lugs: 0, lug: 8, color: 0xe8c22a }, extras: ['hood', 'deck', 'lights'], mass: 464 * LB, massSays: 'TractorData.com', color: 0x367c2b,
    says: 'wheelbase 49.4 in, front tyres 15x6.00-6, rear 20x10-8 (TractorData, John Deere); its length and width typical of a 42 in lawn tractor (estimates)',
  },
  {
    id: 'rental kart', short: 'rental kart', name: 'rental go-kart (typical)', kind: 'kart', source: 'typical of rental karts: tyres 10x4.50-5 and 11x7.10-5; a Honda GX270 at its own size (Honda)',
    L: 1.85, W: 1.35, H: 0.62, clearance: 0.035, frame: 'tube', rails: [0.45, 0.5, 0.95, 0.6, 0.5],
    axles: [{ x: 0.52, track: 1.05, tyre: '10x4.50-5', steer: true, susp: 'rigid' }, { x: -0.52, track: 1.12, tyre: '11x7.10-5', drive: true, brake: { kind: 'disc', d: 0.2, on: 'axle' }, susp: 'rigid' }],
    seats: [{ x: -0.12, z: -0.18, y: 0.08, style: 'kart' }],
    power: { kind: 'single', cc: 270, kW: 6.3, x: -0.22, z: 0.22, y: 0.29, bore: 0.077, stroke: 0.058, starter: 'recoil', box: [0.428, 0.422, 0.381], kg: 25, torque: 19.1, ratio: 6, says: 'a Honda GX270: 270 cc, 6.3 kW (8.5 hp) at 3,600 rpm, 19.1 N·m at 2,500 rpm, 381 × 428 × 422 mm, 25 kg dry (Honda)', driveSays: 'its 19.1 N·m through a chain of about 6 to 1 (typical of rental karts: a 12-tooth clutch to a 72-tooth axle sprocket)' },
    controls: 'wheel', rims: { style: 'split', spokes: 6, mat: 'al-a380', lugs: 3, lug: 8, color: 0xc8ccd2 }, extras: ['nose', 'pods'], chain: { teeth: [12, 72], pitch: 0.009525, at: [-0.12, -0.12], z: 0.22 + 0.381 * 0.2 + 0.004, item: 'chain 35', says: 'a #35 chain, 12 to 72 teeth (typical of rental karts)' }, mass: 150, massSays: 'typical of a rental kart without its driver', color: 0x1f4fa8,
    says: 'about 1.85 m by 1.35 m, its wheelbase about 1,040 mm (typical of rental karts)',
  },
];
// body styles by their typical figures (as the car kit had them), drawn by the same maker
// (each style's tyres and ground clearance, typical of its kind: an SUV's and a pickup's tyres taller and wider than a
// sedan's, a sports car's lower in profile; a tyre's width and aspect at a 15 in rim, wider and lower as the rim grows)
const STYLE: Record<string, { L: number; W: number; H: number; wb: number; lines: Lines; seats: number; tyre?: [number, number]; clearance?: number }> = {
  sedan: { L: 4.8, W: 1.85, H: 1.45, wb: 2.85, seats: 5, lines: { cowl: 0.33, roofF: 0.45, roofR: 0.71, deck: 0.83, belt: 0.64, nose: 0.53, tail: 0.68, n: 5, face: { lamp: 0.1, grille: 0.08 } } },
  hatchback: { L: 4.3, W: 1.8, H: 1.47, wb: 2.65, seats: 5, lines: { cowl: 0.3, roofF: 0.42, roofR: 0.84, deck: 0.97, belt: 0.62, nose: 0.53, tail: 0.66, n: 5, face: { lamp: 0.1, grille: 0.08 } } },
  SUV: { tyre: [0.215, 0.7], clearance: 0.2, L: 4.8, W: 1.95, H: 1.75, wb: 2.85, seats: 7, lines: { cowl: 0.28, roofF: 0.38, roofR: 0.9, deck: 0.98, belt: 0.6, nose: 0.6, tail: 0.64, n: 6, face: { lamp: 0.12, grille: 0.22 } } },
  // (a crew cab: two rows under its roof, its bed behind about 1.7 m long, a 5.5 ft box: typical)
  pickup: { tyre: [0.245, 0.75], clearance: 0.23, L: 5.8, W: 2.0, H: 1.9, wb: 3.6, seats: 5, lines: { cowl: 0.27, roofF: 0.36, roofR: 0.67, deck: 0.71, belt: 0.6, nose: 0.62, tail: 0.55, n: 6, bed: true, face: { lamp: 0.16, grille: 0.34 } } },
  coupe: { tyre: [0.195, 0.6], clearance: 0.13, L: 4.6, W: 1.85, H: 1.35, wb: 2.75, seats: 4, lines: { cowl: 0.36, roofF: 0.49, roofR: 0.67, deck: 0.85, belt: 0.62, nose: 0.48, tail: 0.66, n: 5 , doors: 1 } },
  van: { tyre: [0.205, 0.7], clearance: 0.16, L: 5.3, W: 2.0, H: 2.0, wb: 3.3, seats: 8, lines: { cowl: 0.16, roofF: 0.24, roofR: 0.97, deck: 0.99, belt: 0.52, nose: 0.52, tail: 0.6, n: 7, face: { lamp: 0.14, grille: 0.16 } } },
  'sports car': { tyre: [0.205, 0.55], clearance: 0.12, L: 4.4, W: 1.9, H: 1.2, wb: 2.45, seats: 2, lines: { cowl: 0.4, roofF: 0.52, roofR: 0.68, deck: 0.86, belt: 0.6, nose: 0.42, tail: 0.64, n: 4.5 , doors: 1, face: { lamp: 0.08, grille: 0.05 } } },
  convertible: { L: 4.5, W: 1.85, H: 1.4, wb: 2.7, seats: 4, lines: { cowl: 0.36, roofF: 0.5, roofR: 0.66, deck: 0.84, belt: 0.62, nose: 0.48, tail: 0.66, n: 5, open: true , doors: 1 } },
};
/** A car of a body style, its figures typical, on the wheels and power chosen. */
export function styledCar(style: string, o: { color: number; rim: number; rims: string; power: string; tint: string }): Machine {
  const s = STYLE[style] ?? STYLE.sedan!, [w0, a0] = s.tyre ?? [0.185, 0.65], tw = w0 + (o.rim - 15) * 0.015, aspect = Math.max(0.3, a0 - (o.rim - 15) * 0.05), tyre = `${Math.round(tw * 1000 / 5) * 5}/${Math.round(aspect * 20) * 5}R${o.rim}`;
  // (its track from its width: each tyre's face about 30 mm inside the body's side, as a road car's is, typical)
  const oh = (s.L - s.wb) * 0.45, fx = s.L / 2 - oh, track = s.W - Math.round(tw * 1000 / 5) * 5 / 1000 - 0.06, rows = s.seats <= 2 ? 1 : s.seats <= 5 ? 2 : 3, seats: Seat[] = [];
  // (its people placed by its cabin, not its axles: the driver's hip about 0.9 m behind the windscreen's base, as the
  // Corolla's is (an estimate), each row about 0.85 m behind the one before (typical), and none further back than its
  // backrest leaves room for at the cabin's back)
  const X = (f: number) => s.L / 2 - f * s.L, xCowl = X(s.lines.cowl), xBack = X(s.lines.deck) + 0.45;
  for (let r = 0; r < rows; r++) for (const z of r === 0 || rows === 1 ? [-0.38, 0.38] : r === 2 || s.seats >= 7 ? [-0.38, 0.38] : [0]) seats.push({ x: Math.max(xCowl - 0.9 - r * 0.85, xBack), z, y: s.H * 0.38, style: r === 0 || rows === 1 ? 'bucket' : 'bench' });
  return {
    id: style, name: `${style}`, kind: 'car', source: 'typical of its body style', L: s.L, W: s.W, H: s.H, clearance: s.clearance ?? 0.14, frame: 'shell', hand: -1,
    // (front-wheel drive whatever its power, its engine across its bay or its electric unit on the front axle's line, as most
    // of these styles' cars are; its rear axle undriven: a rear-drive layout needs a prop shaft, which this maker does not
    // draw yet, so a pickup or a van here is front-drive with its rear axle on leaf springs, as a Ram ProMaster is)
    axles: [{ x: fx, track, tyre, steer: true, drive: true, brake: { kind: 'disc', d: 0.3, vented: true }, susp: 'strut' }, { x: fx - s.wb, track, tyre, brake: { kind: 'disc', d: 0.28 }, susp: style === 'pickup' || style === 'van' ? 'leaf' : 'beam' }],
    lines: s.lines, seats, power: o.power === 'electric' ? { kind: 'electric', kW: 150, x: fx, y: tyreOf(tyre)!.D / 2, says: 'an electric drive unit on the front axle: its motor, reduction gear and differential in one, driving the front wheels (typical of a front-drive electric car: the Chevrolet Bolt\'s is 150 kW)' } : { kind: o.power === 'diesel' ? 'diesel' : 'inline', cc: o.power === 'diesel' ? 2000 : 1800, kW: 110, x: fx + oh * 0.35, says: 'typical' },
    controls: 'wheel', rims: { style: o.rims === 'steel' ? 'steel' : 'spokes', spokes: o.rims === '10-spoke' ? 10 : o.rims === 'mesh' ? 16 : o.rims === 'turbine' ? 12 : 5, mat: o.rims === 'steel' ? 'steel-low' : 'al-a380', lugs: 5, lug: 12 },
    extras: o.power === 'electric' ? [] : ['exhaust'], road: true, color: o.color, says: `${s.L} m long, ${s.W} m wide, wheelbase ${s.wb} m; tyres ${tyre}, ${Math.round(tyreOf(tyre)!.D * 1000)} mm across (typical of a ${style}); front-wheel drive${style === 'pickup' || style === 'sports car' ? ' (most of its kind are rear-drive: the prop shaft that needs is not drawn yet)' : ''}`,
  };
}
export const styles = Object.keys(STYLE);

// ---- as kits: what is chosen, and what is made of it --------------------------------------------------------------------
const COLOURS: [string, number][] = [['white', 0xf2f2ee], ['black', 0x17181a], ['silver', 0xb8bcc2], ['grey', 0x6c7076], ['red', 0xb3202a], ['blue', 0x1f4fa8], ['green', 0x2f6a3a], ['yellow', 0xe8c22a], ['orange', 0xe0702a]];
const colourOf = (n: string | number | undefined, d: number) => COLOURS.find(([c]) => c === n)?.[1] ?? d;
const machineKit = (id: string, name: string, words: RegExp, kinds: string[], says: string, more: Choice[] = []): Kit => {
  const ms = MACHINES.filter((m) => kinds.includes(m.kind));
  return {
    id, name, words, says,
    choices: [{ key: 'model', name: 'model', options: ms.map((m) => m.short ?? m.name) }, { key: 'colour', name: 'colour', options: ['as made', ...COLOURS.map(([c]) => c)] }, ...more],
    build(c) { const m = ms.find((x) => (x.short ?? x.name) === c.model) ?? ms[0]!; return makeMachine({ ...m, color: c.colour === 'as made' ? m.color : colourOf(c.colour, m.color) }, c); },
  };
};
export const VEHICLE_KITS: Kit[] = [
  {
    id: 'car', name: 'car', words: /\b(cars?|sedan|saloon|hatchback|suv|pickup|coupe|van|sports car|convertible|automobile|corolla|monte carlo)\b/i,
    says: 'a car: a real model by its maker\'s figures, or a body style\'s typical figures; its tyres by their size code; its power',
    choices: [{ key: 'body', name: 'body', options: [...MACHINES.filter((m) => m.kind === 'car').map((m) => m.short ?? m.id), ...styles] }, { key: 'colour', name: 'colour', options: COLOURS.map(([n]) => n) }, { key: 'rim', name: 'rim size', options: [15, 16, 17, 18, 19, 20, 21], unit: 'in' },
      { key: 'rims', name: 'rims', options: ['5-spoke', '10-spoke', 'mesh', 'steel', 'turbine'] }, { key: 'power', name: 'power', options: ['petrol', 'diesel', 'electric', 'hybrid'] }, { key: 'tint', name: 'window tint', options: ['none', 'light', 'dark'] }],
    build(c) {
      const col = colourOf(c.colour, 0xb8bcc2);
      // (a real model by its short name, in its own colour unless one is chosen)
      const real = MACHINES.find((m) => m.kind === 'car' && (m.short ?? m.id) === c.body); if (real) return makeMachine({ ...real, color: String(c.named ?? '').split(',').includes('colour') ? col : real.color }, c);
      return makeMachine(styledCar(String(c.body), { color: col, rim: Number(c.rim), rims: String(c.rims), power: String(c.power), tint: String(c.tint) }), c);
    },
  },
  machineKit('go kart', 'go-kart', /\b(go[- ]?karts?|karts?|karting)\b/i, ['kart'], 'a go-kart: its tube chassis, bodywork, seat, engine and tyres'),
  machineKit('atv', 'ATV', /\b(atvs?|quad ?bikes?|quads?|four[- ]?wheelers?|4[- ]?wheelers?)\b/i, ['atv'], 'an ATV by its maker\'s figures'),
  machineKit('dirt bike', 'dirt bike', /\b(dirt ?bikes?|motocross(?: bikes?)?|mx bikes?|motorbikes?|motorcycles?|enduro(?: bikes?)?|crf\d*)\b/i, ['motorcycle'], 'a motorcycle by its maker\'s figures'),
  machineKit('forklift', 'forklift', /\b(fork ?lifts?|fork ?trucks?|forktrucks?|lift trucks?)\b/i, ['forklift'], 'a forklift by its maker\'s figures', [{ key: 'lift', name: 'forks raised', options: [0, 0.5, 1, 1.5], unit: 'm' }]),
  machineKit('semi truck', 'semi truck', /\b(semi(?:[- ]trucks?)?|semis|18[- ]wheelers?|big rigs?|lorry|lorries|tractor units?|tractor[- ]trailers?|cascadia)\b/i, ['truck'], 'a highway tractor by its maker\'s figures'),
  machineKit('lawn tractor', 'lawn tractor', /\b(lawn ?tractors?|ride[- ]on mowers?|riding (?:lawn )?mowers?|lawn ?mowers?|mowers?)\b/i, ['mower'], 'a lawn tractor by its maker\'s figures'),
];

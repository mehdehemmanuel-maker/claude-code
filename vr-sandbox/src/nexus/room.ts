// The space where two solids cannot be written into one place (decision 0021): nothing checks for overlap, because no
// operation here can write one. A place is never an input: a Block is made only by the operations here, and every place
// is an output. (The nodes Make a solid, Stack, Around, Into a room, Onto a face, Ring of copies, Through a line, Over a
// shaft and Turn in blocks.ts run these, and the pieces of common.ts; `partOfBlock` draws a block as the app's parts.)
//
//   I(B): at every pose of B's joints, B's solids are pairwise interior-disjoint and each lies in its bound; B's rooms
//         are free of B's solids; every two pieces that touch have a face in B's record.
//
//   made     one solid at the origin (a box, rod, tube, cup, hex, dome, sphere, turned profile (a cone is one), case,
//            section, bend or coil), every size finite and above zero; its lines (axis, a section's along z, a pattern's
//            along y or into any face, through or blind, plain, counterbored or countersunk) inside it. (decision 0026)
//   stack    blocks end to end along an axis: the next starts past the last one's movers' sweeps (unless they move
//            with it) plus the fit's gap. Disjoint intervals at every pose.
//   around   a host made round a child: its cavity holds the child's swept bound plus the fit. host ∩ child = ∅.
//   through  a passer on a line its host offers: the union of all the passer's pieces (each swept over its motion
//            relative to the solid it crosses, grown by the fit) is taken out of every solid whose bound meets the
//            passer's bound. (A − P) ∩ P = ∅. A bought solid is never cut: the passer goes only through its openings.
//   into     a block into a room a host offers (a cup's cavity): its swept bound plus the fit within the room, or
//            "no room" with both numbers. A room is used once. onto is into the space beyond a face of a bound.
//   ring     n copies round an axis, each in its own wedge, or "no room" with both numbers; turned to face out if asked,
//            each about the upright line through its own middle, which leaves its reach from that line as it was.
//   turn     a whole block turned rigidly about its bound's middle by any angle about any axis (decision 0024): a rigid
//            turn of a valid block is valid. Each solid then carries its frame, each line its direction, and every test
//            here reads them: the inside test exactly, the bounds and the reach from a line as supersets.
//   run      a tube laid as segments (straights, sleeves round them, bends) each from where the last ended in the last
//            one's frame: each lies between its start's plane and its end's, so two that follow one another meet only
//            on their shared plane; two that do not are kept apart by (3). A bend radius not above the tube's is refused.
//   branch   a tube joined square into the side of a straight (a tee's branch): the straight's wall opened by the
//            branch's bore, the branch's end cut to the straight's outside (a saddle), both cuts: (B − S) ∩ (A − H) = ∅.
//   between  a member turned to run from one named point to another and set between them, its room (grown by the fit)
//            taken out of every solid it crosses, as through takes a passer's: (A − M) ∩ M = ∅ (decision 0029, rough).
//   along    n copies of a block on the line between two named points, each let into what it crosses the same way,
//            the copies kept apart by their bounds (3) or refused (decision 0029, rough).
//   key      a key laid along a shaft's line at its surface where a hub is, its room taken out of the shaft and the hub
//            (a keyway each) the same way (decision 0029, rough).
//   Decision 0029 settings on the above: stack and onto take an end for each axis across and a line's own coordinates
//   only (a second hinge at the leaf's low end on the first's pin line); onto a tilt (the child turned first, laid by its
//   bound: resting on its lowest edge where that lies over the face, a line face written for it; overhanging the face it
//   floats on its bound, a known fault); a round piece laid along z onto a section along z seated in its outline (an axle
//   in a V block); through takes the lowest of several pieces offering a line and says which; over bores a solid piece of
//   the sleeve on its axis to the shaft (a bought one refused).
//
// The comparisons the operations make (none decides whether two solids may share a point; construction does):
//   (1) each size's sign and finiteness, as it is written;
//   (2) one size against one room: a line's slot, a room's size, a ring's pitch;
//   (3) a bound against a bound: which solids a passer is taken out of (cutting one it misses changes nothing), which
//       rooms it closes, and whether a bought or moving solid is in its way (refused by name);
//   (4) face patches: where an operation lays two pieces against each other, their footprints on that plane or round
//       that line are sampled, to write the patch's size. Nothing is refused by it.
// Prototype limits: a solid is made upright and turned only with its whole block (no two pieces put together at an angle
// within one operation); a turned box's and a bend's bound is the box round its own box turned, so what is stacked on one
// keeps more room than it needs; through and over along a turned line are done in the line's own frame, and refuse a
// turned or bent passer or sleeve and any piece on a joint; joints (slides along +y, turns about y) stay upright, a block
// with one is not turned, a bolted joint on a turned hole is refused; a turned block's rooms are closed unless the turn
// is about y; a bend is at most a half turn, and offers no line; a turned profile's outline is not checked for crossing
// itself (read by even-odd, as a section's), and its faces against a round wall are sampled, not worked out; no rooms on a moving host; a ring of turning copies is
// refused; face patches are sampled (a 64-cell grid, so a few per cent), a turned piece laid on a plane touches it along
// an edge and no face is written for it, and a face written before a later cut keeps its first area. Known ways past it, found by a red team on
// 2026-11-02 and not yet closed: a room on a moving host, a bought host on a joint, the 1e-12 m tolerance at very small
// sizes, rounding at 1e20 m, and data changed after it is checked (docs/REALITY.md). Found on 2026-11-05 and not yet closed:
// two pieces laid against a turned plane can both hold a point within about 1e-18 m of it (each rounded apart); a tilt
// under 1e-12 in a direction cosine is taken as upright whatever the length.
import type { Cut, Part, Shape } from './kits';
import { stationAt, type Station } from './form';

export type P3 = readonly [number, number, number];
type V3 = [number, number, number];
export type Axis = 0 | 1 | 2;
/** A turn: a 3×3 rotation, row by row, from a solid's own axes to the room's (none: its own axes are the room's). */
export type M3 = readonly [number, number, number, number, number, number, number, number, number];
/** A solid's shape in its own frame about c, turned by `frame` about c (a block turned, a segment of a run). */
export type Prim = Turned & (
  // (a box; or a case, its walls and floor round a box-shaped cavity open at the top (`tray`); or a bar of a section, its
  // profile in x and y drawn along z (`sect`, about its bound's middle): an angle, a channel, an I-beam. Everything that
  // measures room reads each as its box, a superset)
  | { readonly k: 'box'; readonly c: P3; readonly size: P3; readonly tray?: { readonly wall: number; readonly floor: number }; readonly sect?: readonly (readonly [number, number])[] }
  | { readonly k: 'cyl'; readonly c: P3; readonly r: number; readonly h: number; readonly ri?: number }
  | { readonly k: 'cup'; readonly c: P3; readonly r: number; readonly h: number; readonly wall: number; readonly ends: number; readonly open: boolean }
  // (a hex prism about y, its flats `af` across, r its corners' radius: a nut's or a bolt head's; a dome, its flat face
  // down, its bound's middle at c, h = r: an LED's lens, a bulb; a coil of wire wound about y, R its mean radius, d its
  // wire, its region the tube from R − d/2 to R + d/2: a winding)
  | { readonly k: 'hex'; readonly c: P3; readonly af: number; readonly r: number; readonly h: number; readonly ri?: number }
  | { readonly k: 'dome'; readonly c: P3; readonly r: number; readonly h: number }
  | { readonly k: 'coil'; readonly c: P3; readonly R: number; readonly d: number; readonly turns: number; readonly pitch: number; readonly layers: number; readonly r: number; readonly ri: number; readonly h: number }
  // (a bend: a tube bent round its own z axis, its middle line from (R, 0, 0) about the centre it is bent round, heading
  // +y and turning toward −x through `a` (radians, at most a half turn), ro and ri its tube's outside and bore about that
  // line; c its bound's middle. Its region exactly: the points whose angle round z is within (0, a) and whose distance
  // from the middle line is between ri and ro)
  | { readonly k: 'bend'; readonly c: P3; readonly R: number; readonly ro: number; readonly ri?: number; readonly a: number }
  // (a sphere about c, h = 2r, a bore along y if ri; a turned profile (a lathe's): its outline of (radius, height) points
  // about c turned about y, r its largest radius, h its height, ri its bore (the least radius of its outline where that is
  // above zero): a wheel, a knob, a stepped shaft, a cone or frustum. Its region exactly: the points whose distance from
  // its axis and height lie inside the outline (even-odd))
  | { readonly k: 'sphere'; readonly c: P3; readonly r: number; readonly h: number; readonly ri?: number }
  | { readonly k: 'lathe'; readonly c: P3; readonly pts: readonly (readonly [number, number])[]; readonly r: number; readonly h: number; readonly ri?: number }
  // (a loft (decision 0029): a body through its stations along x (form.ts: each a half-width w, a bottom lo and a top hi
  // about c, its bound's middle), size its box. Its region: at each x, the section eased between the stations either side,
  // read as its rectangle (|z| within w, y between lo and hi): a superset of the superellipse drawn and weighed, exact where
  // a station's n is large. Everything that measures room reads it as its box, as it reads a section)
  | { readonly k: 'loft'; readonly c: P3; readonly st: readonly Station[]; readonly size: P3 });
type Turned = { readonly frame?: M3 };
/** A solid: its base less the union of what was taken out of it. */
export interface Solid { readonly base: Prim; readonly minus: readonly Prim[] }
/** A line a piece offers: along +y through (x, z); or, turned, through (x, y, z) along `dir`. */
export interface Line { readonly port: string; readonly x: number; readonly z: number; readonly slot: number; readonly opening?: number; readonly y?: number; readonly dir?: P3 }
export interface JointRef { readonly name: string; readonly slide?: number; readonly turn?: true }
export interface Piece { readonly name: string; readonly mat: string; readonly color?: number; readonly solid: Solid; readonly joint?: JointRef; readonly axis?: readonly [number, number]; readonly bought?: true; readonly tapped?: true; readonly lines: readonly Line[] }
export interface Face {
  readonly a: number; readonly b: number; readonly kind: 'contact' | 'gap'; readonly patch: 'area' | 'line'; readonly area: number; readonly length?: number;
  readonly at: P3; readonly normal: P3; readonly gap: number; /** the fit that left the gap, where an operation sized it (root 6) */ readonly fit?: Fit; readonly medium?: string; readonly gate?: string; readonly interference?: { readonly um: number; readonly pressure?: number; readonly src: string }; readonly by: string;
}
export interface RoomOf { readonly name: string; readonly c: P3; readonly r: number; readonly h: number; readonly open: boolean; /** a box-shaped room's width (x) and depth (z); r then its half-diagonal */ readonly size?: readonly [number, number] }

declare const ROOM: unique symbol;
/** A length of room (a joint's travel): finite, never below zero. */
export type Room = number & { readonly [ROOM]: true };
export const room = (m: number): Room => { if (!(Number.isFinite(m) && m >= 0)) throw new Error(`room is finite and never below zero (${m} m)`); return m as Room; };
const sizes = (name: string, xs: readonly number[]) => { for (const x of xs) if (!(Number.isFinite(x) && x > 0)) throw new Error(`${name}: every size is finite and above zero (${x})`); };

/** A joint: a slide along y over its room, or a turn about the y axis of the pieces made on it. Made only here. */
export class Joint implements JointRef {
  readonly #j = true;
  private constructor(readonly name: string, readonly slide?: number, readonly turn?: true) { Object.freeze(this); }
  static make(name: string, m: { slide: Room } | { turn: true }): Joint { if ('slide' in m) { room(m.slide); return new Joint(name, m.slide); } return new Joint(name, undefined, true); }
  static is(j: unknown): j is Joint { return typeof j === 'object' && j !== null && #j in j; }
}
export const joint = Joint.make;

/** Fits by name, never a signed number: the gap each leaves, m (typical values, one for every size: only where an
 *  operation passes no size; root 6: the operations that do take it by the size from FIT_BANDS below), and for a
 *  transition or interference fit the most interference, drawn at basic size and carried on the face as a pressure. */
export const FITS = {
  touch: { gap: 0 }, tight: { gap: 0 }, slide: { gap: 0.00025 }, clear: { gap: 0.001 },
  // (apart: not a running fit but things laid apart, 1 mm at every size (typical): a ball set beside what it will be
  // shoved into, with room to gather speed; root 6 sized clear to H9/d9, 60 µm at 120 mm, and the ball started touching)
  apart: { gap: 0.001 },
  'H7/m6': { gap: 0, tightUm: 12, src: 'ISO 286-2 m6 over 3 to 6 mm +4/+12 µm on H7 0/+12 µm, as interfaces.ts holds them (DEVIATION, IT_TABLE)' },
} as const;
export type Fit = keyof typeof FITS;
/** A fit's clearance by the size it is applied to (root 6, decision 0029: before, one gap for every size, so a Ø100 axle
 *  and a Ø8 one took the same 1 mm). ISO 286-1:2010's size steps, mm (over the step before, up to and including this),
 *  and for each the least clearance on the diameter, µm, of the hole-basis fit the name stands for: clear H9/d9 (free
 *  running), slide H7/g6 (sliding), tight H7/h6 (locational clearance). With H's lower deviation 0 that least clearance is
 *  the shaft's fundamental deviation es (d's, g's; h's is 0, so tight is drawn touching at every size, as before; its most,
 *  IT7 + IT6, is not drawn). To 500 mm: ISO 286-1:2010's fundamental deviations of d and g (its Table 3, as ISO 286-2
 *  tabulates them), recalled this round, not read against the table again; they agree with what interfaces.ts holds (G
 *  over 3 to 6 mm, +4 µm, the g's mirror). Over 500 to 3150 mm: recalled with less confidence, so typical; past 3150 mm
 *  ISO 286 stops and the last step's is held, typical. The gap drawn is half the least clearance: the space each side
 *  between the hole at its least and the shaft at its most (maximum material), so pieces within their tolerances never
 *  meet. A fit on a flat (stack, onto) takes the band of the narrower width across the face of the smaller piece. */
const FIT_STEPS = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150] as const;
export const FIT_BANDS: Readonly<Record<'clear' | 'slide' | 'tight', { readonly cls: string; readonly leastUm: readonly number[] }>> = {
  clear: { cls: 'H9/d9', leastUm: [20, 30, 40, 50, 65, 80, 100, 120, 145, 170, 190, 210, 230, 260, 290, 320, 350, 390, 430, 480, 520] },
  slide: { cls: 'H7/g6', leastUm: [2, 4, 5, 6, 7, 9, 10, 12, 14, 15, 17, 18, 20, 22, 24, 26, 28, 30, 32, 34, 38] },
  tight: { cls: 'H7/h6', leastUm: FIT_STEPS.map(() => 0) },
};
/** The gap (m) a fit leaves at a size (m: a diameter, or a flat's width); with no size, FITS' one typical value (the
 *  operations that do not pass a size yet: mesh, rack, belt, between, along, key). */
const gapOf = (f: Fit, d?: number): number => {
  const band = (FIT_BANDS as Record<string, { leastUm: readonly number[] } | undefined>)[f];
  if (d === undefined || !band) return FITS[f].gap;
  const k = FIT_STEPS.findIndex((x) => d * 1000 <= x + 1e-9);
  return (band.leastUm[k < 0 ? FIT_STEPS.length - 1 : k]! * 1e-6) / 2;
};
export const fitGap = gapOf;
/** A piece's size across a flat laid normal to `axis`: the narrower width of its bound across it. */
const widthAcross = (p: Piece, axis: Axis): number => { const B = boundOf(p); return Math.min(...([0, 1, 2] as const).filter((k) => k !== axis).map((k) => B[1][k]! - B[0][k]!)); };
// (for a pressure from an interference: E and ν, typical values, labelled so)
const ELASTIC: Record<string, { E: number; nu: number }> = { 'steel-low': { E: 200e9, nu: 0.29 }, 'steel-alloy': { E: 205e9, nu: 0.29 }, copper: { E: 117e9, nu: 0.34 } };
const MEDIUM = 'air'; // the surroundings' medium where nothing else is said (the default record)

const add = (a: P3, b: P3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: P3, b: P3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
// ---- turns: a solid's frame, a block turned rigidly, a line's own frame ---------------------------------------------
const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mv = (m: M3, v: P3): V3 => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const mtv = (m: M3, v: P3): V3 => [m[0] * v[0] + m[3] * v[1] + m[6] * v[2], m[1] * v[0] + m[4] * v[1] + m[7] * v[2], m[2] * v[0] + m[5] * v[1] + m[8] * v[2]];
const mul = (a: M3, b: M3): M3 => [0, 1, 2].flatMap((i) => [0, 1, 2].map((j) => a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!)) as unknown as M3;
const tr = (m: M3): M3 => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
// (a turn whose every entry is within 1e-14 of −1, 0 or 1 is a quarter turn's, written exactly; the identity is none)
const snap = (m: M3): M3 | undefined => { if (!m.every((x) => Math.abs(x - Math.round(x)) < 1e-14)) return m; const q = m.map((x) => Math.round(x) + 0) as unknown as M3; return q.every((x, i) => x === I3[i]) ? undefined : q; };
// (a direction: entries within 1e-14 of 0 or ±1 written exactly)
const snapDir = (v: P3): V3 => v.map((x) => (Math.abs(x) < 1e-14 ? 0 : Math.abs(Math.abs(x) - 1) < 1e-14 ? Math.sign(x) : x)) as V3;
const rodrigues = (u: P3, c: number, s: number): M3 => { const [x, y, z] = u, t = 1 - c; return [t * x * x + c, t * x * y - s * z, t * x * z + s * y, t * x * y + s * z, t * y * y + c, t * y * z - s * x, t * x * z - s * y, t * y * z + s * x, t * z * z + c]; };
/** A turn by so many degrees about x, y or z (or any axis), right-handed; a quarter turn's written exactly. */
export function turnOf(axis: Axis | P3, deg: number): M3 {
  if (!Number.isFinite(deg)) throw new Error(`a turn is finite (${deg}°)`);
  if (typeof axis === 'number' && axis !== 0 && axis !== 1 && axis !== 2) throw new Error(`a turn is about x, y or z (0, 1, 2) or a direction, not ${axis}`);
  const u: V3 = typeof axis === 'number' ? (() => { const n: V3 = [0, 0, 0]; n[axis] = 1; return n; })() : (() => { const n = Math.hypot(axis[0], axis[1], axis[2]); if (!(n > 0 && Number.isFinite(n))) throw new Error('a turn about an axis of some length'); return [axis[0] / n, axis[1] / n, axis[2] / n] as V3; })();
  const q = ((deg % 360) + 360) % 360, quarter = [1, 0, -1, 0][q / 90];
  const c = Number.isInteger(q / 90) ? quarter! : Math.cos((q * Math.PI) / 180), s = Number.isInteger(q / 90) ? [0, 1, 0, -1][q / 90]! : Math.sin((q * Math.PI) / 180);
  return rodrigues(u, c, s);
}
// (the least turn taking a direction onto +y: a line's own frame)
const toY = (d: P3): M3 => { const n = Math.hypot(d[0], d[1], d[2]), x = d[0] / n, y = d[1] / n, z = d[2] / n; if (y > 1 - 1e-15) return I3; if (y < -1 + 1e-15) return [1, 0, 0, 0, -1, 0, 0, 0, -1];
  const k = Math.hypot(x, z); return rodrigues([-z / k, 0, x / k], y, k); };
/** A turn as the app's Euler angles (x, then y, then z, as three.js reads `rot`). */
// (Day's angles (M. Day, "Extracting Euler angles from a rotation matrix", 2014): no threshold, exact near a quarter turn about y)
const eulerOf = (m: M3): V3 => { const x = Math.atan2(-m[5], m[8]), cx = Math.cos(x), sx = Math.sin(x); return [x, Math.atan2(m[2], Math.hypot(m[0], m[1])), Math.atan2(cx * m[3] + sx * m[6], cx * m[4] + sx * m[7])]; };
/** A point in a solid's own frame, about its c. */
const local = (p: Prim, x: number, y: number, z: number): V3 => { const d: V3 = [x - p.c[0], y - p.c[1], z - p.c[2]]; return p.frame ? mtv(p.frame, d) : d; };
// (a round solid whose own axis is along ±y: its formulas round a line along y hold as they are)
const upright = (p: Prim): boolean => !p.frame || (Math.abs(p.frame[1]) < 1e-12 && Math.abs(p.frame[7]) < 1e-12);
// (a line along +y as it is: its x and z are where it runs)
const alongY = (l: Line): boolean => !l.dir || (Math.abs(l.dir[0]) < 1e-9 && Math.abs(l.dir[2]) < 1e-9 && l.dir[1] > 0);
const roundish = (p: Prim): p is Extract<Prim, { r: number }> => p.k !== 'box' && p.k !== 'bend' && p.k !== 'loft';
// (a solid read by its box: a box, or a loft (its box the bound of its stations))
const boxy = (p: Prim): p is Extract<Prim, { size: P3 }> => p.k === 'box' || p.k === 'loft';
// (a round solid of one radius all along its height: its side is the cylinder of r (a sphere's and a turned profile's are not))
const evenRound = (p: Prim): p is Extract<Prim, { r: number }> => roundish(p) && p.k !== 'sphere' && p.k !== 'lathe';
/** What a round solid leaves free round its own axis (its bore), if anything. */
const boreOf = (b: Prim): number | undefined => ((b.k === 'cyl' || b.k === 'coil' || b.k === 'hex' || b.k === 'sphere' || b.k === 'lathe') && b.ri !== undefined ? b.ri : undefined);
/** The radius round a line along y at (x, z) that a solid leaves free: a round one about it its bore (none: nothing); a
 *  round one beside it as far as its side; any other as far as its box's nearest side (a subset of what is free). */
const freeRound = (b: Prim, x: number, z: number): number => {
  if (roundish(b) && upright(b)) { const d = Math.hypot(b.c[0] - x, b.c[2] - z), ri = boreOf(b);
    if (d < 1e-12) return ri ?? 0; if (ri !== undefined && d + 1e-12 < ri) return ri - d; return Math.max(0, d - b.r); }
  const [lo, hi] = primBox(b), dx = Math.max(lo[0] - x, 0, x - hi[0]), dz = Math.max(lo[2] - z, 0, z - hi[2]); return Math.hypot(dx, dz);
};
/** The radius round a line along y at (x, z) that a piece leaves free, read from its solid with its cuts (root 3, decision
 *  0029, plan/FIX-PLAN.md): a round solid with nothing taken out by its exact read (`freeRound`), and any solid the line
 *  runs outside the box of by that box's nearest side (cuts only take material away, so both stand); else (a section's
 *  hole polygon, a sprocket's or a gear's bore, a plate's drilled hole, a box used as a hub) sampled round the line at a
 *  rising radius until material is met (the inside test `inSolid`, which takes the cuts out), at each break of the solid
 *  along y and between, the first ring that meets it refined by bisection against the last that did not. A piece on a
 *  joint by what it sweeps (`swept`), or its solid at rest, as `freeRound` read it. */
const freeAbout = (p: Piece, x: number, z: number, swept = true): number => {
  if (p.joint) return freeRound(swept ? sweepOf(p) : p.solid.base, x, z);
  const s = p.solid, b = s.base, quick = freeRound(b, x, z);
  if (quick > 1e-12 || (roundish(b) && upright(b) && !s.minus.length)) return quick;
  // (a section drawn along the line (a sprocket or gear laid on it) with nothing taken out: exactly, its outline's nearest
  // edge from the line, nothing where the line runs in its material)
  const f = b.frame ?? I3, alongLine = b.k === 'box' && !b.tray && (b.sect ? Math.abs(Math.abs(f[5]) - 1) < 1e-9 : Math.abs(Math.abs(f[4]) - 1) < 1e-9);
  if (alongLine && b.sect && !s.minus.length) { const [ox, oy] = local(b, x, b.c[1], z), P = b.sect; return inPolygon(ox, oy, P) ? 0 : Math.min(...P.map((q, i) => segDist(ox, oy, q, P[(i + 1) % P.length]!))); }
  const box = primBox(b), far = Math.max(...[0, 1].flatMap((i) => [0, 1].map((k) => Math.hypot(box[i]![0] - x, box[k]![2] - z))));
  // (one height where the solid is the same all along the line (a box or a section along it, every cut through it along y))
  const even = alongLine && s.minus.every((m) => (m.k === 'cyl' || m.k === 'box') && upright(m) && primBox(m)[0][1] <= box[0][1] + 1e-12 && primBox(m)[1][1] >= box[1][1] - 1e-12);
  const br = breaksOf(p, 1, box), ys = even ? [(box[0][1] + box[1][1]) / 2] : br.slice(1).flatMap((y1, i) => { const y0 = br[i]!; return y1 - y0 > 4 * EPS ? [y0 + EPS, (y0 + y1) / 2, y1 - EPS] : []; });
  const K = 128, meets = (r: number) => { if (r < 1e-15) return ys.some((y) => inSolid(s, x, y, z));
    for (let a = 0; a < K; a++) { const u = x + r * Math.cos((2 * Math.PI * a) / K), v = z + r * Math.sin((2 * Math.PI * a) / K); if (ys.some((y) => inSolid(s, u, y, v))) return true; } return false; };
  if (!ys.length || meets(0)) return 0;
  const step = Math.min(far / 64, Math.max(thinnest(b) / 2, far / 256)); let lo = 0, hi = Math.min(step, far);
  while (!meets(hi)) { if (hi >= far) return far; lo = hi; hi = Math.min(hi + step, far); }
  for (let i = 0; i < 48 && hi - lo > 1e-13; i++) { const m = (lo + hi) / 2; if (meets(m)) hi = m; else lo = m; }
  return lo;
};
/** Whether a piece lies round a line along y at (x, z): a round one about it, or one whose box the line runs inside. */
const roundAbout = (p: Piece, x: number, z: number): boolean => { const b = p.solid.base;
  if (roundish(b) && upright(b)) return Math.hypot(b.c[0] - x, b.c[2] - z) < 1e-9; const [lo, hi] = primBox(b); return x > lo[0] && x < hi[0] && z > lo[2] && z < hi[2]; };
/** The lines and rooms a block offers, for a refusal that names them. */
const offered = (b: { readonly pieces: readonly Piece[]; readonly rooms?: readonly RoomOf[] }, rooms = false): string => { const xs = [...new Set(rooms ? (b.rooms ?? []).map((r) => r.name) : b.pieces.flatMap((p) => p.lines.map((l) => l.port)))].sort(); return xs.length ? xs.join(', ') : 'none'; };
// (a name given almost right, read as the one it plainly means (decision 0026, step 4): its kind the word after the last
// '/', one or many alike (hole, holes); its owner what comes before, sharing a word with the one offered when a word of
// either is the other's or is in the other run together ("motorplate" and "motor plate"))
const kindOf = (port: string): string => { const k = port.slice(port.lastIndexOf('/') + 1).trim().toLowerCase(); return k.length > 3 && k.endsWith('s') ? k.slice(0, -1) : k; };
const ownerOf = (port: string): string => (port.includes('/') ? port.slice(0, port.lastIndexOf('/')) : '');
const STOP = new Set(['the', 'of', 'and', 'in', 'its', 'on', 'to', 'for', 'with']);
const wordsOf = (s: string): string[] => s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w));
const sharesWord = (a: string, b: string): boolean => { const x = wordsOf(a), y = wordsOf(b), xs = x.join(''), ys = y.join('');
  return x.some((w) => y.includes(w)) || y.some((w) => w.length >= 4 && xs.includes(w)) || x.some((w) => w.length >= 4 && ys.includes(w)); };
// (a kind named for what is on the line, read as its axis where no line of the kind named is offered)
const AXIS_WORDS = new Set(['shank', 'shaft', 'axle', 'spindle', 'core', 'centre', 'center', 'rod', 'bore']);
/** What a name given for a line (or a room) a block offers means: the name itself where offered; else the one of its kind
 *  whose owner shares a word with the name's, else the one of its kind at all; a line named for what is on it (shank,
 *  shaft, axle) its axis where no line of that kind is offered; a room any room where it offers one alone (cavity ~ the
 *  one room). Two or more that fit: every one of them, never a pick between them. */
function meant(b: { readonly pieces: readonly Piece[]; readonly rooms?: readonly RoomOf[] }, port: string, what: 'line' | 'room', loose = true): { port: string; why?: string } | { many: string[] } | undefined {
  const all = [...new Set(what === 'room' ? (b.rooms ?? []).map((r) => r.name) : b.pieces.flatMap((p) => p.lines.map((l) => l.port)))];
  if (all.includes(port)) return { port };
  const owner = ownerOf(port), of = (k: string, word: string): { port: string; why?: string } | { many: string[] } | undefined => {
    const same = all.filter((x) => kindOf(x) === k), near = owner ? same.filter((x) => sharesWord(owner, ownerOf(x))) : [];
    if (near.length === 1) return { port: near[0]!, why: `the one ${word} it offers whose name shares a word with it` };
    if (near.length > 1) return { many: near.sort() };
    if (same.length === 1) return { port: same[0]!, why: `the one ${word} it offers` };
    if (same.length > 1) return { many: same.sort() };
    return undefined; };
  const k = kindOf(port), r = of(k, `${port.slice(port.lastIndexOf('/') + 1).trim()} ${what}`);
  if (r || !loose) return r;
  if (what === 'line' && AXIS_WORDS.has(k)) return of('axi', 'axis');
  if (what === 'room' && all.length === 1) return { port: all[0]!, why: 'the one room it offers' };
  if (what === 'room' && all.length > 1) return { many: all.sort() };
  return undefined;
}
// (what an operation took for a name given almost right, said back by the node that ran it: a note, not a failure)
const NOTES = new WeakMap<object, string>();
/** The note an operation left on the block it made: which line or room it took for a name given almost right. */
export const noteOf = (b: object): string | undefined => NOTES.get(b);
/** A block with a note said back by the node that made it. */
export const noted = <T extends object>(b: T, note?: string): T => { if (note) NOTES.set(b, NOTES.has(b) ? `${NOTES.get(b)}; ${note}` : note); return b; };
/** The line (or room) a block offers by a name given, or the one the name plainly means with a note saying so (`meant`);
 *  where two or more fit, refused with them listed (the fix first: a refusal is read cut short); where the name is a
 *  room's and a line was asked (or the other), refused with the fix; where none fits, the name as given (the operation
 *  then refuses as it did, with what it offers). */
export function namedIn(b: { readonly name: string; readonly pieces: readonly Piece[]; readonly rooms?: readonly RoomOf[] }, port: string, what: 'line' | 'room', op: string): { port: string; note?: string } {
  const m = meant(b, port.trim(), what);
  if (m && 'many' in m) throw new Error(`${op}: no ${what} '${port}'; name one: ${m.many.map((x) => `'${x}'`).join(' or ')}`);
  if (m) return { port: m.port, ...(m.why ? { note: `${op} took '${m.port}' for '${port}' (${m.why})` } : {}) };
  const other = meant(b, port.trim(), what === 'line' ? 'room' : 'line', false), hit = other && 'port' in other ? other.port : undefined;
  if (hit && what === 'line') throw new Error(`${op}: '${port}' is a room, not a line: put a block in it by room.into; to pass its wall, make it by room.make with holes on a face`);
  if (hit) throw new Error(`${op}: '${port}' is no room; '${hit}' is a line it offers: a block goes along it by room.through (or over it by room.over)`);
  return { port };
}
/** A bend's bound in its own frame, about the centre it is bent round. */
const bendBox = (R: number, ro: number, a: number): [V3, V3] => {
  const pts: [number, number][] = [];
  for (const rr of [R - ro, R + ro]) for (const t of [0, a]) pts.push([rr * Math.cos(t), rr * Math.sin(t)]);
  if (a >= Math.PI / 2) pts.push([0, R + ro]); if (a >= Math.PI) pts.push([-(R + ro), 0]);
  return [[Math.min(...pts.map((q) => q[0])), Math.min(...pts.map((q) => q[1])), -ro], [Math.max(...pts.map((q) => q[0])), Math.max(...pts.map((q) => q[1])), ro]];
};
const MIDS = new WeakMap<object, V3>();
/** Where a bend's bound's middle is from the centre it is bent round, in its own frame. */
const bendMid = (p: { readonly R: number; readonly ro: number; readonly a: number }): V3 => { const was = MIDS.get(p); if (was) return was; const [lo, hi] = bendBox(p.R, p.ro, p.a), m: V3 = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, 0]; MIDS.set(p, m); return m; };
/** Half a solid's own box (a superset of it), in its own frame. */
const halfOf = (p: Prim): V3 => { if (boxy(p)) return [p.size[0] / 2, p.size[1] / 2, p.size[2] / 2]; if (p.k === 'bend') { const [lo, hi] = bendBox(p.R, p.ro, p.a); return [(hi[0] - lo[0]) / 2, (hi[1] - lo[1]) / 2, p.ro]; } return [p.r, p.h / 2, p.r]; };
/** The box round a solid: a turned round one's exactly (its axis u: |u_k| h/2 + r √(1 − u_k²)), a turned box's or
 *  bend's the box round its own box turned (a superset). */
export const primBox = (p: Prim): [V3, V3] => {
  const f = p.frame, e = halfOf(p);
  const w = !f ? e : roundish(p) ? [0, 1, 2].map((k) => Math.abs(f[k * 3 + 1]!) * (p.h / 2) + p.r * Math.sqrt(Math.max(0, 1 - f[k * 3 + 1]! ** 2)))
    : [0, 1, 2].map((k) => Math.abs(f[k * 3]!) * e[0] + Math.abs(f[k * 3 + 1]!) * e[1] + Math.abs(f[k * 3 + 2]!) * e[2]);
  return [[p.c[0] - w[0]!, p.c[1] - w[1]!, p.c[2] - w[2]!], [p.c[0] + w[0]!, p.c[1] + w[1]!, p.c[2] + w[2]!]];
};
// (the eight corners of a solid's own box, where they are)
const corners = (p: Prim): V3[] => { const e = halfOf(p); return [-1, 1].flatMap((a) => [-1, 1].flatMap((b) => [-1, 1].map((c) => add(p.c, p.frame ? mv(p.frame, [a * e[0], b * e[1], c * e[2]]) : [a * e[0], b * e[1], c * e[2]])))); };
const shiftPrim = (p: Prim, d: P3): Prim => ({ ...p, c: add(p.c, d) }) as Prim;
/** A passer's solid grown by a fit's gap all round (the room it takes out of what it crosses): a box its whole box (a case's
 *  cavity and a section's outline dropped, so the gap holds all round them too), a solid turned profile its own outline, a
 *  bend its tube, any other round one the cylinder of its radius (its bore kept, less the gap). Decision 0029: hoisted
 *  out of Through so a member laid between two points, copies along a line and a key cut the same room. */
const grownBy = (m: Prim, g: number): Prim => (boxy(m) ? { k: 'box', c: m.c, size: [m.size[0] + 2 * g, m.size[1], m.size[2] + 2 * g], ...(m.frame ? { frame: m.frame } : {}) } : m.k === 'bend' ? { ...m, ro: m.ro + g, ...(m.ri !== undefined ? { ri: Math.max(0, m.ri - g) } : {}) }
  : m.k === 'lathe' && m.ri === undefined ? { ...m, pts: m.pts.map((q) => [q[0] > 1e-12 ? q[0] + g : 0, q[1]] as const), r: m.r + g }
  : { k: 'cyl', c: m.c, r: m.r + g, h: m.h, ...((m.k === 'cyl' || m.k === 'coil' || m.k === 'hex') && m.ri !== undefined ? { ri: Math.max(0, m.ri - g) } : {}), ...(m.frame ? { frame: m.frame } : {}) });
/** The area of a solid's section across its own axis (y): a rod's disc, a tube's ring, a box's footprint; a rough size for
 *  a face written by a member laid between two points or a copy let into what it crosses (decision 0029). */
const sectionArea = (m: Prim): number => (boxy(m) ? m.size[0] * m.size[2] : m.k === 'bend' ? Math.PI * (m.ro * m.ro - (m.ri ?? 0) ** 2) : Math.PI * (m.r * m.r - (boreOf(m) ?? 0) ** 2));
const inPrim = (p: Prim, x: number, y: number, z: number): boolean => {
  const [dx, dy, dz] = local(p, x, y, z);
  if (p.k === 'box') { if (!(Math.abs(dx) < p.size[0] / 2 && Math.abs(dy) < p.size[1] / 2 && Math.abs(dz) < p.size[2] / 2)) return false;
    if (p.tray && Math.abs(dx) < p.size[0] / 2 - p.tray.wall && Math.abs(dz) < p.size[2] / 2 - p.tray.wall && dy > -p.size[1] / 2 + p.tray.floor) return false;
    return !p.sect || inPolygon(dx, dy, p.sect); }
  if (p.k === 'bend') { const m = bendMid(p), u = dx + m[0], v = dy + m[1], phi = Math.atan2(v, u); if (!(phi > 0 && phi < p.a)) return false;
    const q = Math.hypot(Math.hypot(u, v) - p.R, dz); return q < p.ro && (p.ri === undefined || q > p.ri); }
  // (a loft: its section where it is at x, eased between its stations (form.ts stationAt), read as its rectangle)
  if (p.k === 'loft') { const s = stationAt({ st: p.st as Station[] }, dx); return !!s && Math.abs(dz - (s.z ?? 0)) < s.w && dy > s.lo && dy < s.hi; }
  const rho = Math.hypot(dx, dz); if (!(rho < p.r && Math.abs(dy) < p.h / 2)) return false;
  if (p.k === 'cyl') return p.ri === undefined || rho > p.ri;
  if (p.k === 'coil') return rho > p.ri;
  if (p.k === 'dome') return Math.hypot(rho, dy + p.h / 2) < p.r;
  if (p.k === 'sphere') return Math.hypot(rho, dy) < p.r && (p.ri === undefined || rho > p.ri);
  if (p.k === 'lathe') return inPolygon(rho, dy, p.pts);
  if (p.k === 'hex') return (p.ri === undefined || rho > p.ri) && [Math.PI / 6, Math.PI / 2, (5 * Math.PI) / 6].every((a) => Math.abs(dx * Math.sin(a) + dz * Math.cos(a)) < p.af / 2);
  return !(rho < p.r - p.wall && dy > -p.h / 2 + p.ends && (p.open || dy < p.h / 2 - p.ends));
};
/** Whether (x, y) is inside a closed outline (even-odd: a ray to +x crosses it an odd number of times). */
const inPolygon = (x: number, y: number, pts: readonly (readonly [number, number])[]): boolean => { let n = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i]!, [xj, yj] = pts[j]!; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) n = !n; } return n; };
const inSolid = (s: Solid, x: number, y: number, z: number) => inPrim(s.base, x, y, z) && !s.minus.some((m) => inPrim(m, x, y, z));
const lift = (p: Piece, t: number) => (p.joint?.slide ? t * p.joint.slide : 0);
const inPiece = (p: Piece, x: number, y: number, z: number, t = 0) => inSolid(p.solid, x, y - lift(p, t), z);
/** Whether a point is inside a piece (at rest): the one inside test, every solid's frame honoured. */
export const insideOf = (p: Piece, x: number, y: number, z: number): boolean => inPiece(p, x, y, z);
/** The farthest a prim reaches from a line along y at (x, z): an upright round one exactly; a turned round one at most
 *  its axis's farther end's distance and its radius; a box or a bend its own box's farthest corner (supersets). */
const reach = (p: Prim, x: number, z: number): number => {
  if (roundish(p)) { if (upright(p)) return Math.hypot(p.c[0] - x, p.c[2] - z) + p.r;
    const ux = (p.frame![1] * p.h) / 2, uz = (p.frame![7] * p.h) / 2; return Math.max(Math.hypot(p.c[0] + ux - x, p.c[2] + uz - z), Math.hypot(p.c[0] - ux - x, p.c[2] - uz - z)) + p.r; }
  return Math.max(...corners(p).map((q) => Math.hypot(q[0] - x, q[2] - z)));
};
/** All a piece takes over its joint's range: a slide extends it along +y; a turn about its own line is itself if it is
 *  round about it, else the cylinder its farthest point sweeps. A superset at every pose. (A turned or bent piece on a
 *  joint is not made: refused where it would be.) */
const sweepOf = (p: Piece): Prim => {
  const b = p.solid.base, j = p.joint; if (!j) return b;
  if (b.frame || b.k === 'bend') throw new Error(`the ${p.name} is turned or bent and on a joint (${j.name}): not made yet`);
  if (j.slide) return boxy(b) ? { k: 'box', c: [b.c[0], b.c[1] + j.slide / 2, b.c[2]], size: [b.size[0], b.size[1] + j.slide, b.size[2]] }
    : b.k === 'cyl' ? { ...b, c: [b.c[0], b.c[1] + j.slide / 2, b.c[2]], h: b.h + j.slide } : { k: 'cyl', c: [b.c[0], b.c[1] + j.slide / 2, b.c[2]], r: b.r, h: b.h + j.slide };
  if (j?.turn) { const [ax, az] = p.axis!; if (!boxy(b) && Math.hypot(b.c[0] - ax, b.c[2] - az) < 1e-12) return b; return { k: 'cyl', c: [ax, b.c[1], az], r: reach(b, ax, az), h: boxy(b) ? b.size[1] : b.h }; }
  return b;
};
export const boundOf = (p: Piece): [V3, V3] => primBox(sweepOf(p));
const meets = (a: [V3, V3], b: [V3, V3]) => [0, 1, 2].every((k) => a[0][k]! < b[1][k]! - 1e-12 && b[0][k]! < a[1][k]! - 1e-12);
const coMove = (p: Piece, q: Piece) => !!p.joint && p.joint === q.joint && (!p.joint.turn || (Math.abs(p.axis![0] - q.axis![0]) < 1e-12 && Math.abs(p.axis![1] - q.axis![1]) < 1e-12));
const freeze = <T>(o: T): T => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const v of Object.values(o as object)) freeze(v); } return o; };
const EPS = 1e-7, N = 64;
/** Passers turned end over end by Through itself, to keep them the way up they were made along a line that runs down (never one handed in). */
const FLIPPED = new WeakSet<object>();
/** Passers and sleeves laid as made again by Through and Over themselves (`asMade`): the piece each goes along. */
const MADE = new WeakMap<object, number>();

// ---- faces: where an operation lays two pieces against each other, the patch its footprints share there --------------
const other = (axis: Axis): [Axis, Axis] => (axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1]);
const pt = (axis: Axis, c: number, u: number, v: number): V3 => { const [i, j] = other(axis), o: V3 = [0, 0, 0]; o[axis] = c; o[i] = u; o[j] = v; return o; };
/** The patch on the plane axis = c where p lies just below it and q just above (p at pose tp of its slide). */
function planePatch(p: Piece, q: Piece, axis: Axis, c: number, gap: number, tp = 0): { area: number; length: number; at: V3 } {
  const [i, j] = other(axis), A = boundOf(p), B = boundOf(q), lo = [Math.max(A[0][i]!, B[0][i]!), Math.max(A[0][j]!, B[0][j]!)], hi = [Math.min(A[1][i]!, B[1][i]!), Math.min(A[1][j]!, B[1][j]!)];
  if (!(lo[0]! < hi[0]! && lo[1]! < hi[1]!)) {
    // (a round piece's side against a plane across x or z touches it along a line: the extents meet in one coordinate)
    return linePatch(p, q, axis, c, gap, tp);
  }
  let n = 0, su = 0, sv = 0; const du = (hi[0]! - lo[0]!) / N, dv = (hi[1]! - lo[1]!) / N;
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const u = lo[0]! + (a + 0.5) * du, v = lo[1]! + (b + 0.5) * dv;
    if (inPiece(p, ...pt(axis, c - EPS, u, v), tp) && inPiece(q, ...pt(axis, c + gap + EPS, u, v))) { n++; su += u; sv += v; } }
  if (n) return { area: n * du * dv, length: 0, at: pt(axis, c + gap / 2, su / n, sv / n) };
  return linePatch(p, q, axis, c, gap, tp);
}
function linePatch(p: Piece, q: Piece, axis: Axis, c: number, gap: number, tp: number): { area: number; length: number; at: V3 } {
  const none = { area: 0, length: 0, at: [0, 0, 0] as V3 };
  // (a turned round one lying along the plane: its extreme line on it, sampled along its axis against the other across)
  // (a turned profile's or a sphere's too, where its own outline reaches that far: its material just its side of the plane)
  for (const [r, s, across, sg] of [[p, q, c + gap + EPS, 1], [q, p, c - EPS, -1]] as const) {
    const b = r.solid.base; if (!roundish(b) || b.k === 'coil' || upright(b) || Math.abs(b.frame![axis * 3 + 1]!) > 1e-9 || Math.abs(b.c[axis] + sg * b.r - (sg > 0 ? c : c + gap)) > 1e-9) continue;
    const u = [b.frame![1]!, b.frame![4]!, b.frame![7]!], own = sg > 0 ? c - EPS : c + gap + EPS; let n = 0; const mid: V3 = [0, 0, 0];
    for (let a = 0; a < N; a++) { const t = -b.h / 2 + ((a + 0.5) * b.h) / N, o: V3 = [b.c[0] + t * u[0]!, b.c[1] + t * u[1]!, b.c[2] + t * u[2]!], w: V3 = [o[0], o[1], o[2]]; o[axis] = across; w[axis] = own;
      if (inPiece(s, o[0], o[1], o[2], s === p ? tp : 0) && inPiece(r, w[0], w[1], w[2], r === p ? tp : 0)) { n++; mid[0] += o[0]; mid[1] += o[1]; mid[2] += o[2]; } }
    if (n) { const at: V3 = [mid[0] / n, mid[1] / n, mid[2] / n]; at[axis] = c + gap / 2; return { area: 0, length: (n * b.h) / N, at }; }
  }
  // (decision 0029 (2): a turned box resting on the plane by one of its edges (a roof panel tilted on a wall's top, a plate
  // leaned on a face): the two corners of its own box on the plane, sampled along the edge between them against the other
  // piece just across; a box on one corner alone touches at a point and no face is written)
  for (const [r, s, sg] of [[p, q, 1], [q, p, -1]] as const) {
    const b = r.solid.base; if (b.k !== 'box' || !b.frame || b.tray || b.sect) continue;
    const plane = sg > 0 ? c : c + gap, on = corners(b).filter((v) => Math.abs(v[axis] - plane) < 1e-9); if (on.length !== 2) continue;
    const [u, v] = on as [V3, V3]; let n = 0; const mid: V3 = [0, 0, 0];
    for (let a = 0; a < N; a++) { const t = (a + 0.5) / N, o: V3 = [u[0] + t * (v[0] - u[0]), u[1] + t * (v[1] - u[1]), u[2] + t * (v[2] - u[2])], w: V3 = [o[0], o[1], o[2]];
      o[axis] = sg > 0 ? c + gap + EPS : c - EPS; w[axis] = sg > 0 ? c - EPS : c + gap + EPS;
      if (inPiece(s, o[0], o[1], o[2], s === p ? tp : 0) && inPiece(r, w[0], w[1], w[2], r === p ? tp : 0)) { n++; mid[0] += o[0]; mid[1] += o[1]; mid[2] += o[2]; } }
    if (n) { const at: V3 = [mid[0] / n, mid[1] / n, mid[2] / n]; at[axis] = c + gap / 2; return { area: 0, length: (n * Math.hypot(v[0] - u[0], v[1] - u[1], v[2] - u[2])) / N, at }; }
  }
  if (axis === 1) return none;
  const w = axis === 0 ? 2 : 0, y0 = Math.max(boundOf(p)[0][1], boundOf(q)[0][1]), y1 = Math.min(boundOf(p)[1][1], boundOf(q)[1][1]); if (!(y0 < y1)) return none;
  // (the round one's extreme line on the plane, tried against the other just across it)
  for (const [r, s, across] of [[p, q, c + gap + EPS], [q, p, c - EPS]] as const) {
    const b = r.solid.base; if (!roundish(b) || b.k === 'coil' || !upright(b)) continue;
    const ext = r === p ? b.c[axis] + b.r : b.c[axis] - b.r; if (Math.abs(ext - (r === p ? c : c + gap)) > 1e-9) continue;
    const own = r === p ? c - EPS : c + gap + EPS;
    let n = 0; for (let a = 0; a < N; a++) { const o: V3 = [0, y0 + ((a + 0.5) * (y1 - y0)) / N, 0]; o[w] = b.c[w]; const ow: V3 = [o[0], o[1], o[2]]; o[axis] = across; ow[axis] = own; if (inPiece(s, o[0], o[1], o[2], s === p ? tp : 0) && inPiece(r, ow[0], ow[1], ow[2], r === p ? tp : 0)) n++; }
    if (n) { const at: V3 = [0, (y0 + y1) / 2, 0]; at[w] = b.c[w]; at[axis] = c + gap / 2; return { area: 0, length: (n * (y1 - y0)) / N, at }; }
  }
  return none;
}
const unit = (axis: Axis): V3 => { const n: V3 = [0, 0, 0]; n[axis] = 1; return n; };
/** Faces between the pieces just below and just above a plane an operation laid them across, across the gap its fit
 *  left there (sized by the stack: root 6). */
function planeFaces(ps: Piece[], low: number[], high: number[], axis: Axis, by: string, g = 0, fit?: Fit): Face[] {
  const out: Face[] = [];
  for (const a of low) for (const b of high) {
    const p = ps[a]!, q = ps[b]!, top = primBox(p.solid.base)[1][axis], bot = primBox(q.solid.base)[0][axis], d = bot - top;
    const write = (r: { area: number; length: number; at: V3 }, kind: 'contact' | 'gap', gap: number, gate?: string) => { if (r.area > 0 || r.length > 0) out.push({ a, b, kind, patch: r.area > 0 ? 'area' : 'line', area: r.area, ...(r.area > 0 ? {} : { length: r.length }), at: r.at, normal: unit(axis), gap, ...(kind === 'gap' && fit ? { fit } : {}), ...(kind === 'gap' || gate ? { medium: MEDIUM } : {}), ...(gate ? { gate } : {}), by }); };
    if (Math.abs(d) < 1e-9) { write(planePatch(p, q, axis, top, 0), 'contact', 0); continue; }
    if (g > 0 && Math.abs(d - g) < 1e-9) { write(planePatch(p, q, axis, top, g), 'gap', g); continue; }
    // (a slide that closes the gap at the end of its travel: a gated face)
    if (axis === 1 && p.joint?.slide && !coMove(p, q) && Math.abs(d - p.joint.slide) < 1e-9) write(planePatch(p, q, axis, top + p.joint.slide, 0, 1), 'contact', p.joint.slide, p.joint.name);
  }
  return out;
}

// ---- root 1 (decision 0029, plan/FIX-PLAN.md): a block laid on another rests where their solids first touch ------------
/** A piece's material against the other set: its sweep where it moves on its own against any of them, else its solid. */
function materialOf(r: Piece, others: readonly Piece[]): { box: [V3, V3]; thin: number; inside: (x: number, y: number, z: number) => boolean } {
  if (r.joint && others.some((o) => !coMove(r, o))) { const s = sweepOf(r); return { box: primBox(s), thin: thinnest(s), inside: (x, y, z) => inPrim(s, x, y, z) }; }
  return { box: primBox(r.solid.base), thin: thinnest(r.solid.base), inside: (x, y, z) => inSolid(r.solid, x, y, z) };
}
/** Where a solid breaks along an axis (its prims' ends, a cup's ends, a case's floor, a turned profile's points), within
 *  a box: the stretches between them are each sampled, so a thin floor or flange is not stepped over. */
function breaksOf(r: Piece, axis: Axis, box: [V3, V3]): number[] {
  const cuts = new Set([box[0][axis], box[1][axis]]);
  for (const m of [r.solid.base, ...r.solid.minus]) { const b = primBox(m); cuts.add(b[0][axis]); cuts.add(b[1][axis]);
    if (axis !== 1 || !upright(m)) continue;
    if (m.k === 'cup') { cuts.add(b[0][1] + m.ends); cuts.add(b[1][1] - m.ends); }
    if (m.k === 'box' && m.tray) cuts.add(b[0][1] + m.tray.floor);
    if (m.k === 'lathe') for (const q of m.pts) cuts.add(m.c[1] + q[1]); }
  return [...cuts].filter((y) => y >= box[0][axis] && y <= box[1][axis]).sort((a, b) => a - b);
}
/** The thinnest a solid's material can be down any column that passes through its body (not its silhouette's edge): a
 *  box's least side, a tube's wall, a cup's wall or end, a sphere's or rod's diameter or its wall, a turned profile's
 *  least radial or axial step, a coil's wire, a bend's wall. The column samples are laid closer than half of it, so
 *  no stretch of material is stepped over (a pipe lying across the stack was, at its 0.7 mm wall, before this). */
function thinnest(m: Prim): number {
  if (m.k === 'box') { let t = Math.min(...m.size, ...(m.tray ? [m.tray.wall, m.tray.floor] : []));
    // (a section's web and flanges: the least step of its outline in x or in y)
    if (m.sect) for (let a = 0; a < m.sect.length; a++) { const p = m.sect[a]!, q = m.sect[(a + 1) % m.sect.length]!, dx = Math.abs(p[0] - q[0]), dy = Math.abs(p[1] - q[1]); if (dx > 1e-9) t = Math.min(t, dx); if (dy > 1e-9) t = Math.min(t, dy); }
    return t; }
  if (m.k === 'bend') return m.ri !== undefined ? m.ro - m.ri : 2 * m.ro;
  if (m.k === 'cup') return Math.min(m.wall, m.ends);
  if (m.k === 'coil') return m.d;
  // (a loft: its thinnest station across or up, and the least step between stations along x)
  if (m.k === 'loft') { let t = Math.min(...m.st.map((q) => Math.min(2 * q.w, q.hi - q.lo))); for (let a = 1; a < m.st.length; a++) { const dx = Math.abs(m.st[a]!.x - m.st[a - 1]!.x); if (dx > 1e-9) t = Math.min(t, dx); } return t; }
  if (m.k === 'lathe') { const ys = m.pts.map((q) => q[1]), rs = m.pts.map((q) => q[0]); let t = Math.min(m.h, m.ri !== undefined ? m.r - m.ri : 2 * m.r);
    for (let a = 0; a < m.pts.length; a++) { const b = (a + 1) % m.pts.length, dy = Math.abs(ys[a]! - ys[b]!), dr = Math.abs(rs[a]! - rs[b]!); if (dy > 1e-9) t = Math.min(t, dy); if (dr > 1e-9) t = Math.min(t, dr); } return t; }
  const ri = boreOf(m); return Math.min(m.h, ri !== undefined ? m.r - ri : 2 * m.r);
}
/** The farthest coordinate along the axis (highest, or lowest) at which a piece has material down the column through
 *  (u, v) across it: the stretches between its breaks sampled from that end inward (closer than half the solid's thinnest
 *  material, `thin`), the first sample inside refined by bisection against the last outside to 1e-10 (the inside test is
 *  a point test; nothing here has a surface). None where no sample is inside, or nothing of it could be past `past` (an
 *  end already found on another piece). */
function materialEnd(inside: (x: number, y: number, z: number) => boolean, breaks: number[], thin: number, axis: Axis, u: number, v: number, high: boolean, past: number): number | undefined {
  const n = breaks.length - 1, test = (c: number) => { const o = pt(axis, c, u, v); return inside(o[0], o[1], o[2]); };
  let miss = high ? breaks[n]! : breaks[0]!;
  for (let s = 0; s < n; s++) {
    const y0 = breaks[high ? n - 1 - s : s]!, y1 = breaks[high ? n - s : s + 1]!, L = y1 - y0; if (!(L > 0)) continue;
    if (high ? y1 <= past : y0 >= past) return undefined;
    const K = Math.min(512, Math.max(4, Math.ceil((2 * L) / thin)));
    for (let k = 0; k < K; k++) { const c = high ? y1 - ((k + 0.5) * L) / K : y0 + ((k + 0.5) * L) / K;
      if (!test(c)) { miss = c; continue; }
      if (high ? miss <= past : miss >= past) return undefined;
      let hit = c; while (Math.abs(miss - hit) > 1e-10) { const m = (miss + hit) / 2; if (test(m)) hit = m; else miss = m; } return hit; }
  }
  return undefined;
}
/** The rest of movers lowered along an axis onto hosts, as a column cast (the panel's minimal form of root 1): over the two
 *  sets' footprints' overlap across the axis, on a grid of N × N columns, plus the overlap's edges (a slope on a corner)
 *  and each piece's own middle and edges (a leg or a rib thinner than a column), the movers' lowest material and the
 *  hosts' highest down each column; the move along the axis that closes the smallest column gap (`d`), refined round the
 *  column that closes to under a micron; the host and mover of that column (indices into the sets), the host's height
 *  there, the column's point across, and how far the columns that close together spread (a line's length). None where no
 *  column has both materials: the bound rest then. */
function firstContact(hosts: readonly Piece[], movers: readonly Piece[], axis: Axis): { d: number; p: number; q: number; c: number; at: [number, number]; spread: number } | undefined {
  const [i, j] = other(axis), E = 1e-9;
  const H = hosts.map((r, k) => { const m = materialOf(r, movers); return { k, ...m, breaks: breaksOf(r, axis, m.box) }; }).sort((a, b) => b.box[1][axis] - a.box[1][axis]);
  const M = movers.map((r, k) => { const m = materialOf(r, hosts); return { k, ...m, breaks: breaksOf(r, axis, m.box) }; }).sort((a, b) => a.box[0][axis] - b.box[0][axis]);
  const lo = [Math.max(Math.min(...H.map((h) => h.box[0][i])), Math.min(...M.map((m) => m.box[0][i]))), Math.max(Math.min(...H.map((h) => h.box[0][j])), Math.min(...M.map((m) => m.box[0][j])))];
  const hi = [Math.min(Math.max(...H.map((h) => h.box[1][i])), Math.max(...M.map((m) => m.box[1][i]))), Math.min(Math.max(...H.map((h) => h.box[1][j])), Math.max(...M.map((m) => m.box[1][j])))];
  if (!(lo[0]! + 2 * E < hi[0]! && lo[1]! + 2 * E < hi[1]!)) return undefined;
  type Col = { g: number; p: number; q: number; c: number; u: number; v: number };
  const covers = (b: [V3, V3], u: number, v: number) => b[0][i] < u && u < b[1][i] && b[0][j] < v && v < b[1][j];
  let best: Col | undefined;
  const col = (u: number, v: number): Col | undefined => {
    // (a column whose boxes alone cannot close more than the best so far is not cast: so a flat pair, exact from its first
    // column, costs one column, and a round one lying along an axis one, its own middle (those are cast first))
    let ub = -Infinity, lb = Infinity; for (const h of H) if (covers(h.box, u, v)) ub = Math.max(ub, h.box[1][axis]); for (const m of M) if (covers(m.box, u, v)) lb = Math.min(lb, m.box[0][axis]);
    if (ub === -Infinity || lb === Infinity || (best && ub - lb <= best.g + 1e-8)) return undefined;
    let top = -Infinity, p = -1; for (const h of H) { if (!covers(h.box, u, v)) continue; const y = materialEnd(h.inside, h.breaks, h.thin, axis, u, v, true, top); if (y !== undefined && y > top) { top = y; p = h.k; } }
    if (p < 0) return undefined;
    let bot = Infinity, q = -1; for (const m of M) { if (!covers(m.box, u, v)) continue; const y = materialEnd(m.inside, m.breaks, m.thin, axis, u, v, false, bot); if (y !== undefined && y < bot) { bot = y; q = m.k; } }
    return q < 0 ? undefined : { g: top - bot, p, q, c: top, u, v };
  };
  const du = (hi[0]! - lo[0]!) / N, dv = (hi[1]! - lo[1]!) / N, cols: [number, number][] = [];
  const within = (u: number, v: number) => lo[0]! < u && u < hi[0]! && lo[1]! < v && v < hi[1]!;
  // (each piece's own middle and edges first: a round one's lowest line, a tilted box's lowest edge, a leg, a rib)
  for (const r of [...H, ...M]) { const b = r.box, cu = (b[0][i] + b[1][i]) / 2, cv = (b[0][j] + b[1][j]) / 2;
    for (const c of [[cu, cv], [b[0][i] + E, cv], [b[1][i] - E, cv], [cu, b[0][j] + E], [cu, b[1][j] - E]] as [number, number][]) if (within(c[0], c[1])) cols.push(c); }
  // (the overlap's edges: a slope on a face's corner; then the grid)
  for (let a = 0; a < N; a++) { const u = lo[0]! + (a + 0.5) * du, v = lo[1]! + (a + 0.5) * dv; cols.push([u, lo[1]! + E], [u, hi[1]! - E], [lo[0]! + E, v], [hi[0]! - E, v]); }
  cols.push([lo[0]! + E, lo[1]! + E], [lo[0]! + E, hi[1]! - E], [hi[0]! - E, lo[1]! + E], [hi[0]! - E, hi[1]! - E]);
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) cols.push([lo[0]! + (a + 0.5) * du, lo[1]! + (b + 0.5) * dv]);
  const all: Col[] = [];
  for (const [u, v] of cols) { const r = col(u, v); if (!r) continue; all.push(r); if (!best || r.g > best.g) best = r; }
  if (!best) return undefined;
  // (refined round the column that closes: the cell round it sampled 8 × 8, the cell shrunk to a spacing, seven times)
  let su = du, sv = dv;
  for (let L = 0; L < 7; L++) { const bu = best.u, bv = best.v;
    for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) { const u = bu - su + ((a + 0.5) * su) / 4, v = bv - sv + ((b + 0.5) * sv) / 4; if (!within(u, v)) continue;
      const r = col(u, v); if (!r) continue; all.push(r); if (r.g > best.g) best = r; }
    su /= 4; sv /= 4; }
  const on = all.filter((c) => c.g >= best!.g - 1e-7), us = on.map((c) => c.u), vs = on.map((c) => c.v);
  const spread = Math.max(Math.max(...us) - Math.min(...us) + du, Math.max(...vs) - Math.min(...vs) + dv);
  return { d: best.g, p: best.p, q: best.q, c: best.c, at: [best.u, best.v], spread };
}
/** Whether two pieces' solids share any room (root 1, the "would meet" of Over): none where their boxes do not meet;
 *  else a column cast along y over the boxes' overlap (each box's middle and edges, the overlap's edges, the N × N grid):
 *  down each column the span of each solid's material from its lowest to its highest, the two meeting where they share
 *  a stretch longer than 1e-8 in any column. A span is the solid's hull down the column (a tube lying across y reads as
 *  full between its walls: a superset); a feature thinner than a column that lies between columns is missed (rough). */
function solidsMeet(a: Piece, b: Piece): boolean {
  const A = materialOf(a, [b]), B = materialOf(b, [a]); if (!meets(A.box, B.box)) return false;
  const axis: Axis = 1, [i, j] = other(axis), E = 1e-9, ba = breaksOf(a, axis, A.box), bb = breaksOf(b, axis, B.box);
  const lo = [Math.max(A.box[0][i], B.box[0][i]), Math.max(A.box[0][j], B.box[0][j])], hi = [Math.min(A.box[1][i], B.box[1][i]), Math.min(A.box[1][j], B.box[1][j])];
  if (!(lo[0]! + 2 * E < hi[0]! && lo[1]! + 2 * E < hi[1]!)) return false;
  const within = (u: number, v: number) => lo[0]! < u && u < hi[0]! && lo[1]! < v && v < hi[1]!, du = (hi[0]! - lo[0]!) / N, dv = (hi[1]! - lo[1]!) / N, cols: [number, number][] = [];
  for (const r of [A, B]) { const bx = r.box, cu = (bx[0][i] + bx[1][i]) / 2, cv = (bx[0][j] + bx[1][j]) / 2;
    for (const c of [[cu, cv], [bx[0][i] + E, cv], [bx[1][i] - E, cv], [cu, bx[0][j] + E], [cu, bx[1][j] - E]] as [number, number][]) if (within(c[0], c[1])) cols.push(c); }
  for (let a = 0; a < N; a++) { const u = lo[0]! + (a + 0.5) * du, v = lo[1]! + (a + 0.5) * dv; cols.push([u, lo[1]! + E], [u, hi[1]! - E], [lo[0]! + E, v], [hi[0]! - E, v]); }
  cols.push([lo[0]! + E, lo[1]! + E], [lo[0]! + E, hi[1]! - E], [hi[0]! - E, lo[1]! + E], [hi[0]! - E, hi[1]! - E]);
  for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) cols.push([lo[0]! + (a + 0.5) * du, lo[1]! + (b + 0.5) * dv]);
  for (const [u, v] of cols) {
    const al = materialEnd(A.inside, ba, A.thin, axis, u, v, false, Infinity); if (al === undefined) continue;
    const bl = materialEnd(B.inside, bb, B.thin, axis, u, v, false, Infinity); if (bl === undefined) continue;
    const ah = materialEnd(A.inside, ba, A.thin, axis, u, v, true, -Infinity) ?? al, bh = materialEnd(B.inside, bb, B.thin, axis, u, v, true, -Infinity) ?? bl;
    if (Math.min(ah, bh) - Math.max(al, bl) > 1e-8) return true;
  }
  return false;
}
/** A piece's side against the round surface at radius R about a line along y (a hole's wall, a cavity's wall). */
function roundFace(p: Piece, x: number, z: number, R: number, y0: number, y1: number, inward: boolean): { area: number; length: number; at: V3 } {
  const b = p.solid.base, lo = Math.max(y0, primBox(b)[0][1]), hi = Math.min(y1, primBox(b)[1][1]); if (!(lo < hi)) return { area: 0, length: 0, at: [0, 0, 0] };
  if (evenRound(b) && upright(b)) { const d = Math.hypot(b.c[0] - x, b.c[2] - z);
    if (d < 1e-12 && Math.abs(b.r - R) < 1e-9) return { area: 2 * Math.PI * R * (hi - lo), length: 0, at: [x, (lo + hi) / 2, z] };
    if (d > 1e-12 && Math.abs(d + b.r - R) < 1e-9) { const ux = (b.c[0] - x) / d, uz = (b.c[2] - z) / d; return { area: 0, length: hi - lo, at: [x + ux * R, (lo + hi) / 2, z + uz * R] }; } }
  // (sampled round the line, in y between the solid's own breaks (its ends, its cuts), so a thin end is not missed)
  const ys = ySamples(p, lo, hi); let n = 0; const A = 96;
  for (let a = 0; a < A; a++) for (const y of ys) { const th = (2 * Math.PI * (a + 0.5)) / A, rr = inward ? R - EPS : R + EPS; if (inPiece(p, x + rr * Math.cos(th), y[0], z + rr * Math.sin(th))) n += y[1]; }
  return n ? { area: (n / A) * 2 * Math.PI * R, length: 0, at: [x, (lo + hi) / 2, z] } : { area: 0, length: 0, at: [0, 0, 0] };
}
// (sample heights between a solid's breaks, each with the length it stands for)
function ySamples(p: Piece, lo: number, hi: number): [number, number][] {
  const cuts = new Set([lo, hi]); for (const m of [p.solid.base, ...p.solid.minus]) { const b = primBox(m); cuts.add(b[0][1]); cuts.add(b[1][1]); if (m.k === 'cup') { cuts.add(b[0][1] + m.ends); cuts.add(b[1][1] - m.ends); } }
  const ks = [...cuts].filter((y) => y >= lo && y <= hi).sort((a, b) => a - b), out: [number, number][] = [];
  for (let i = 0; i + 1 < ks.length; i++) { const a = ks[i]!, b = ks[i + 1]!; if (!(b > a)) continue; for (let k = 0; k < 6; k++) out.push([a + ((k + 0.5) * (b - a)) / 6, (b - a) / 6]); }
  return out;
}
const pressureOf = (fit: Fit, d: number, D: number, shaft: string, hub: string) => {
  const f = FITS[fit] as { tightUm?: number; src?: string }; if (!f.tightUm) return undefined;
  const s = ELASTIC[shaft], h = ELASTIC[hub], delta = f.tightUm * 1e-6;
  // (Lamé, a solid shaft in a hub of outside D: p = δ / (d [ (1/Eh)((D² + d²)/(D² − d²) + νh) + (1 − νs)/Es ]); Shigley 3-56)
  const p = s && h && D > d ? delta / (d * ((1 / h.E) * ((D * D + d * d) / (D * D - d * d) + h.nu) + (1 - s.nu) / s.E)) : undefined;
  return { um: f.tightUm, ...(p ? { pressure: p } : {}), src: f.src! };
};

export class Block {
  readonly #own = true;
  private constructor(readonly name: string, readonly lo: P3, readonly hi: P3, readonly pieces: readonly Piece[], readonly faces: readonly Face[], readonly rooms: readonly RoomOf[]) {}
  static #is(b: unknown): asserts b is Block { if (!(b !== null && typeof b === 'object' && #own in b)) throw new Error('not made by the constructor: refused'); }
  static #seal(name: string, pieces: Piece[], faces: Face[], rooms: RoomOf[] = []): Block {
    const turns = new Map<JointRef, readonly [number, number]>();
    for (const p of pieces) if (p.joint?.turn) { const a = turns.get(p.joint); if (a && (Math.abs(a[0] - p.axis![0]) > 1e-12 || Math.abs(a[1] - p.axis![1]) > 1e-12)) throw new Error(`${name}: the joint ${p.joint.name} would turn about two lines`); turns.set(p.joint, p.axis!); }
    const bs = pieces.map(boundOf), lo = [0, 1, 2].map((k) => Math.min(...bs.map((b) => b[0][k]!))) as V3, hi = [0, 1, 2].map((k) => Math.max(...bs.map((b) => b[1][k]!))) as V3;
    const out = new Block(name, freeze(lo), freeze(hi), freeze(pieces), freeze(faces), freeze(rooms)); Object.freeze(out); return out;
  }
  static #shift(b: Block, d: P3): { pieces: Piece[]; faces: Face[]; rooms: RoomOf[] } {
    return { pieces: b.pieces.map((p) => ({ ...p, solid: { base: shiftPrim(p.solid.base, d), minus: p.solid.minus.map((m) => shiftPrim(m, d)) }, lines: p.lines.map((l) => ({ ...l, x: l.x + d[0], z: l.z + d[2], ...(l.y !== undefined ? { y: l.y + d[1] } : {}) })), ...(p.axis ? { axis: [p.axis[0] + d[0], p.axis[1] + d[2]] as const } : {}) })),
      faces: b.faces.map((f) => ({ ...f, at: add(f.at, d) })), rooms: b.rooms.map((r) => ({ ...r, c: add(r.c, d) })) };
  }
  static #mid(b: Block): V3 { return [(b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, (b.lo[2] + b.hi[2]) / 2]; }
  /** A block turned rigidly by R about M: every solid's middle and frame, every line's point and direction, every face's
   *  place and normal. Its rooms kept (round ones turned with it) only where R keeps y; otherwise closed. */
  static #turned(b: Block, R: M3, M: P3, keepRooms: boolean): Block {
    const pt = (q: P3): V3 => add(M, mv(R, sub(q, M)));
    const prim = (m: Prim): Prim => { const f = snap(m.frame ? mul(R, m.frame) : R), o: Record<string, unknown> = { ...m, c: pt(m.c) }; if (f) o.frame = f; else delete o.frame; return o as unknown as Prim; };
    const line = (l: Line, c: P3): Line => { const q = pt([l.x, l.y ?? c[1], l.z]), d = snapDir(mv(R, l.dir ?? [0, 1, 0])), o: Record<string, unknown> = { ...l, x: q[0], z: q[2] };
      if (d[0] === 0 && d[2] === 0 && d[1] === 1) { delete o.y; delete o.dir; } else { o.y = q[1]; o.dir = d; } return o as unknown as Line; };
    const pieces = b.pieces.map((p): Piece => ({ ...p, solid: { base: prim(p.solid.base), minus: p.solid.minus.map(prim) }, lines: p.lines.map((l) => line(l, p.solid.base.c)) }));
    const faces = b.faces.map((f): Face => ({ ...f, at: pt(f.at), normal: snapDir(mv(R, f.normal)) }));
    // (a turn about y keeps a round room round y; a box room only under a quarter turn, its width and depth swapped or not)
    const keepsY = Math.abs(R[1]) < 1e-14 && Math.abs(R[7]) < 1e-14 && Math.abs(R[4] - 1) < 1e-14, quarter = R.every((x) => Math.abs(x - Math.round(x)) < 1e-14);
    const rooms = !keepRooms || !keepsY ? [] : b.rooms.flatMap((r): RoomOf[] => (!r.size ? [{ ...r, c: pt(r.c) }] : quarter ? [{ ...r, c: pt(r.c), size: Math.abs(R[0]) < 0.5 ? [r.size[1], r.size[0]] : r.size }] : []));
    return Block.#seal(b.name, pieces, faces, rooms);
  }

  /** A whole block turned rigidly about its bound's middle, by so many degrees about x, y or z (or any axis given as a
   *  direction), right-handed. A rigid turn of a valid block is valid: nothing it does can write an overlap, and nothing
   *  placed is an input. Its solids carry their frames, its lines their directions; its rooms are kept under a turn about
   *  y and closed under any other. A block with a piece on a joint is refused (not made yet). */
  static turn(b: Block, axis: Axis | P3, degrees: number, name = b.name): Block {
    Block.#is(b); const R = turnOf(axis, degrees), RtR = mul(tr(R), R), det = R[0] * (R[4] * R[8] - R[5] * R[7]) - R[1] * (R[3] * R[8] - R[5] * R[6]) + R[2] * (R[3] * R[7] - R[4] * R[6]);
    if (!RtR.every((x, i) => Math.abs(x - I3[i]!) < 1e-12) || Math.abs(det - 1) > 1e-12) throw new Error(`turn: not a rotation (a scaling or a mirror would put pieces in each other): refused`);
    const j = b.pieces.find((p) => p.joint); if (j) throw new Error(`turn: the ${j.name} is on a joint (${j.joint!.name}): a block with a joint is not turned yet; turn what it goes on, then put it there`);
    const t = Block.#turned(b, R, Block.#mid(b), true); return name === b.name ? t : Block.#seal(name, [...t.pieces], [...t.faces], [...t.rooms]);
  }
  /** A passer or a sleeve whose block was turned (a valve laid along its flow, a run's straight through a tank's side):
   *  laid as it was made again, turned rigidly about its middle so the straight round piece it goes along (for a sleeve,
   *  one with a bore) runs along +y, the way Through and Over lay a block along a line, and so lies along the line again
   *  once laid: of those, the one along the line's direction `d` (either way), else the first turned. None turned, or no
   *  straight round piece to go along: undefined. */
  static #asMade(b: Block, d: P3, bored: boolean): Block | undefined {
    if (MADE.has(b) || FLIPPED.has(b) || b.pieces.every((q) => upright(q.solid.base) && q.solid.base.k !== 'bend')) return undefined;
    const axisOf = (q: Piece): V3 => { const F = q.solid.base.frame; return F ? [F[1], F[4], F[7]] : [0, 1, 0]; }, dot = (u: P3) => u[0] * d[0] + u[1] * d[1] + u[2] * d[2];
    const ks = b.pieces.map((q, k) => ({ q, k })).filter(({ q }) => roundish(q.solid.base) && (!bored || boreOf(q.solid.base) !== undefined));
    const along = ks.find(({ q }) => Math.abs(dot(axisOf(q))) > 1 - 1e-9) ?? ks.find(({ q }) => !upright(q.solid.base)); if (!along) return undefined;
    const u = axisOf(along.q), sg = dot(u) < 0 ? -1 : 1, out = Block.#turned(b, toY([sg * u[0], sg * u[1], sg * u[2]]), Block.#mid(b), false);
    MADE.set(out, along.k); return out;
  }
  /** An operation along a turned line, done in that line's own frame: the host turned so the line runs along +y, the
   *  operation done, and all of it turned back. Neither may have a piece on a joint, nor the passer a turned or bent
   *  piece; the host's rooms are kept, save those what was added meets. */
  static #inFrame(b: Block, d: P3, what: string, added: Block, op: (h: Block) => Block): Block {
    for (const p of [...b.pieces, ...added.pieces]) if (p.joint) throw new Error(`${what}: the line is turned and the ${p.name} is on a joint (${p.joint.name}): joints on turned pieces are not made yet`);
    const R = toY(d), M = Block.#mid(b), back = Block.#turned(op(Block.#turned(b, R, M, false)), tr(R), M, false), nb = back.pieces.slice(b.pieces.length).map(boundOf);
    return Block.#seal(back.name, [...back.pieces], [...back.faces], b.rooms.filter((r) => !nb.some((q) => meets(q, primBox({ k: 'cyl', c: r.c, r: r.r, h: r.h })))));
  }

  /** One solid at the origin: a box, a rod, a tube, a cup (open at +y, its cavity offered as a room), a hex, a dome, a
   *  sphere, a cone or frustum, a turned profile, a case, a section, a bend or a coil. Its lines: a round piece's axis, a
   *  section's along its length (z) through its outline's own origin where that is clear of the outline, and a pattern's
   *  (a circle about its middle, or points), each with the slot it offers: as far as its edge, its bore and half its
   *  neighbour. A pattern runs along y through the whole piece, or, on a face (+x, −x, +y, −y, +z, −z), into it from that
   *  face (its points in the face's other two axes, in the order x, y, z), through it or so deep, its hole plain,
   *  counterbored or countersunk; its lines then carry their direction, into the piece. Holes of a bought piece's
   *  pattern are its openings. */
  static made(name: string, mat: string, s0: Shape0, o: MadeOpts = {}): Block {
    // (a sphere, a cone and a turned profile made as their prims first; a cone is a turned profile of four points)
    const s = s0 as Exclude<Shape0, { sphere: unknown } | { cone: unknown } | { lathe: unknown } | { loft: unknown }>;
    let turned: Prim | undefined;
    // (a loft (decision 0029): its stations in order along x, each a half-width above zero and its top above its bottom;
    // scaled along x to a length where one is asked (an assembly's length setting); its bound's middle at the origin)
    if ('loft' in s0) {
      const L = s0.loft, st = Array.isArray(L.st) ? [...L.st].sort((a, b) => a.x - b.x) : [];
      if (st.length < 2 || !st.every((q) => [q.x, q.w, q.lo, q.hi, q.n ?? 2, q.wt ?? q.w, q.nt ?? 2, q.mid ?? q.lo, q.z ?? 0].every(Number.isFinite))) throw new Error(`${name}: a loft of two stations or more, each finite (x, w, lo, hi; n, wt, nt, mid, z where given)`);
      st.forEach((q, i) => { if (!(q.w > 0 && (q.wt === undefined || q.wt > 0) && q.hi > q.lo)) throw new Error(`${name}: station ${i + 1}: a half-width above zero and its top above its bottom (w ${q.w}, lo ${q.lo}, hi ${q.hi})`);
        if (i > 0 && !(q.x > st[i - 1]!.x)) throw new Error(`${name}: stations at distinct x (${st[i - 1]!.x} twice)`); });
      const x0 = st[0]!.x, x1 = st[st.length - 1]!.x; if (L.L !== undefined) sizes(`${name} length`, [L.L]); const k = L.L !== undefined ? L.L / (x1 - x0) : 1;
      const xs = st.map((q) => x0 + (q.x - x0) * k), lo = Math.min(...st.map((q) => q.lo)), hi = Math.max(...st.map((q) => q.hi));
      const zlo = Math.min(...st.map((q) => (q.z ?? 0) - Math.max(q.w, q.wt ?? 0))), zhi = Math.max(...st.map((q) => (q.z ?? 0) + Math.max(q.w, q.wt ?? 0)));
      const cx = (xs[0]! + xs[xs.length - 1]!) / 2, cy = (lo + hi) / 2, cz = (zlo + zhi) / 2, size: V3 = [xs[xs.length - 1]! - xs[0]!, hi - lo, zhi - zlo]; sizes(name, size);
      turned = { k: 'loft', c: [0, 0, 0], st: st.map((q, i) => ({ ...q, x: xs[i]! - cx, lo: q.lo - cy, hi: q.hi - cy, ...(q.mid !== undefined ? { mid: q.mid - cy } : {}), z: (q.z ?? 0) - cz })), size };
    }
    if ('sphere' in s0) { const [r, ri] = s0.sphere; sizes(name, ri === undefined ? [r] : [r, ri]); if (ri !== undefined && !(ri < r)) throw new Error(`${name}: a bore within its radius (${ri} ≥ ${r})`); turned = { k: 'sphere', c: [0, 0, 0], r, h: 2 * r, ...(ri !== undefined ? { ri } : {}) }; }
    if ('cone' in s0 || 'lathe' in s0) {
      let pts: [number, number][], bore: number | undefined;
      if ('cone' in s0) { const [r1, r2, h, ri] = s0.cone; sizes(name, [h, Math.max(r1, r2), ...(ri !== undefined ? [ri] : [])]);
        if (!(Number.isFinite(r1) && Number.isFinite(r2) && r1 >= 0 && r2 >= 0)) throw new Error(`${name}: a cone's radii finite and never below zero (${r1}, ${r2})`);
        if (ri !== undefined && !(ri < Math.min(r1, r2))) throw new Error(`${name}: a bore within both its ends' radii (${(ri * 1000).toFixed(2)} ≥ ${(Math.min(r1, r2) * 1000).toFixed(2)} mm)`);
        pts = [[0, -h / 2], [r1, -h / 2], [r2, h / 2], [0, h / 2]]; bore = ri; }
      else { const L = s0.lathe; if (L.pts.length < 3 || !L.pts.every((q) => q.every(Number.isFinite) && q[0] >= 0)) throw new Error(`${name}: a turned profile of three points or more, each finite, none at a radius below zero`);
        if (L.bore !== undefined) sizes(`${name} bore`, [L.bore]); pts = L.pts.map((q) => [q[0], q[1]]); bore = L.bore; }
      if (bore !== undefined) pts = clipOut(pts, bore);
      pts = pts.filter((q, i) => Math.hypot(q[0] - pts[(i + 1) % pts.length]![0], q[1] - pts[(i + 1) % pts.length]![1]) > 1e-12);
      const R = Math.max(0, ...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1])), y1 = Math.max(...pts.map((q) => q[1])), m = (y0 + y1) / 2, rmin = Math.min(...pts.map((q) => q[0]));
      if (pts.length < 3 || !(R > 0 && y1 > y0)) throw new Error(`${name}: a turned profile that encloses something${bore !== undefined ? ` outside its bore of ${(bore * 1000).toFixed(2)} mm` : ''}`);
      // (counter-clockwise in radius and height, as a lathe is drawn)
      const area = pts.reduce((t, q, i) => { const w = pts[(i + 1) % pts.length]!; return t + q[0] * w[1] - w[0] * q[1]; }, 0); if (area < 0) pts.reverse();
      const ri = bore ?? (rmin > 1e-12 ? rmin : undefined);
      turned = { k: 'lathe', c: [0, 0, 0], pts: pts.map((q) => [q[0], q[1] - m] as const), r: R, h: y1 - y0, ...(ri !== undefined ? { ri } : {}) };
    }
    // (a section's outline, its own bound's middle at the origin)
    const sx = 'section' in s ? s.section.pts.map((q) => q[0]) : [], sy = 'section' in s ? s.section.pts.map((q) => q[1]) : [];
    if ('section' in s && (s.section.pts.length < 3 || !s.section.pts.every((q) => q.every(Number.isFinite)))) throw new Error(`${name}: a section of three points or more, each finite`);
    const xs = turned ? [] : 'box' in s ? s.box : 'cyl' in s ? s.cyl : 'tube' in s ? s.tube : 'cup' in s ? s.cup : 'hex' in s ? s.hex : 'dome' in s ? s.dome : 'case' in s ? s.case : 'section' in s ? [Math.max(...sx) - Math.min(...sx), Math.max(...sy) - Math.min(...sy), s.section.L] : 'bend' in s ? s.bend : s.coil; sizes(name, xs);
    // (a bend: its bend radius to its middle line, its outside radius, its angle in degrees, its bore's radius if hollow)
    if ('bend' in s && !(s.bend[1] < s.bend[0] && s.bend[2] <= 180 && (s.bend[3] === undefined || s.bend[3] < s.bend[1]))) throw new Error(`${name}: a bend's radius above its tube's outside radius, its angle at most 180°, its bore within its outside (${s.bend.map((v) => +v.toPrecision(6)).join(', ')})`);
    if ('bend' in s && (o.pattern || o.patterns?.length || o.joint)) throw new Error(`${name}: a bend offers no pattern and goes on no joint (not made yet)`);
    if ('case' in s && !(2 * s.case[3] < s.case[0] && 2 * s.case[3] < s.case[2] && s.case[4] < s.case[1])) throw new Error(`${name}: its walls within its width and depth, its floor within its height`);
    if ('hex' in s && s.hex[2] !== undefined && !(s.hex[2] < s.hex[0] / 2)) throw new Error(`${name}: a bore within its flats (${s.hex[2]} ≥ ${s.hex[0] / 2})`);
    if ('coil' in s && !(s.coil[1] < s.coil[0] && s.coil[3] >= s.coil[1])) throw new Error(`${name}: a coil's wire within its radius and its pitch at least its wire (no turn through the next)`);
    if ('tube' in s && !(s.tube[0] < s.tube[1])) throw new Error(`${name}: a bore within its outside (${s.tube[0]} ≥ ${s.tube[1]})`);
    if ('cup' in s && !(s.cup[2] < s.cup[0] && s.cup[3] < s.cup[1])) throw new Error(`${name}: a wall within its radius and an end within its height`);
    if (o.joint !== undefined && !Joint.is(o.joint)) throw new Error(`${name}: a joint made by joint()`);
    const base: Prim = turned ? turned : 'box' in s ? { k: 'box', c: [0, 0, 0], size: s.box } : 'cyl' in s ? { k: 'cyl', c: [0, 0, 0], r: s.cyl[0], h: s.cyl[1] } : 'tube' in s ? { k: 'cyl', c: [0, 0, 0], ri: s.tube[0], r: s.tube[1], h: s.tube[2] }
      : 'hex' in s ? { k: 'hex', c: [0, 0, 0], af: s.hex[0], r: s.hex[0] / Math.sqrt(3), h: s.hex[1], ...(s.hex[2] !== undefined ? { ri: s.hex[2] } : {}) } : 'dome' in s ? { k: 'dome', c: [0, 0, 0], r: s.dome[0], h: s.dome[0] }
      : 'coil' in s ? { k: 'coil', c: [0, 0, 0], R: s.coil[0], d: s.coil[1], turns: s.coil[2], pitch: s.coil[3], layers: s.coil[4] ?? 1, r: s.coil[0] + s.coil[1] / 2 + ((s.coil[4] ?? 1) - 1) * s.coil[1], ri: s.coil[0] - s.coil[1] / 2, h: s.coil[2] * s.coil[3] + s.coil[1] }
      : 'case' in s ? { k: 'box', c: [0, 0, 0], size: [s.case[0], s.case[1], s.case[2]], tray: { wall: s.case[3], floor: s.case[4] } }
      : 'bend' in s ? (() => { const sh = { R: s.bend[0], ro: s.bend[1], a: (s.bend[2] * Math.PI) / 180, ...(s.bend[3] !== undefined ? { ri: s.bend[3] } : {}) }; return { k: 'bend' as const, c: [0, 0, 0] as P3, ...sh }; })()
      : 'section' in s ? { k: 'box', c: [0, 0, 0], size: [xs[0]!, xs[1]!, s.section.L], sect: s.section.pts.map(([x, y]) => [x - (Math.max(...sx) + Math.min(...sx)) / 2, y - (Math.max(...sy) + Math.min(...sy)) / 2] as [number, number]) }
      : { k: 'cup', c: [0, 0, 0], r: s.cup[0], h: s.cup[1], wall: s.cup[2], ends: s.cup[3], open: true };
    const lines: Line[] = [], minus: Prim[] = [];
    if (roundish(base)) lines.push({ port: `${name}/axis`, x: 0, z: 0, slot: base.r });
    // (a section's line along its length, through its outline's own origin (a gear's or a pulley's centre, in its bore),
    // its slot the distance from there to the outline)
    if (base.k === 'box' && base.sect && 'section' in s) { const ox = -(Math.max(...sx) + Math.min(...sx)) / 2, oy = -(Math.max(...sy) + Math.min(...sy)) / 2, P = base.sect;
      const s0 = Math.min(...P.map((q, i) => segDist(ox, oy, q, P[(i + 1) % P.length]!)));
      if (o.boreTo !== undefined && !(Number.isFinite(o.boreTo) && o.boreTo > 0)) throw new Error(`${name}: the bore it may be opened to is finite and above zero (${o.boreTo})`);
      const slot = o.boreTo !== undefined ? Math.max(s0, o.boreTo) : s0; if (slot > 1e-9) lines.push({ port: `${name}/axis`, x: ox, y: oy, z: 0, slot, ...(o.boreTo === undefined ? { opening: s0 } : {}), dir: [0, 0, 1] }); }
    // (its patterns: the one asked, and any more (decision 0026: a motor plate's screw holes and its pilot's hole, a block's
    // bore and its tapped holes), each named apart, each its own lines)
    for (const pat of [...(o.pattern ? [o.pattern] : []), ...(o.patterns ?? [])]) {
      const pts: [number, number][] = pat.circle ? Array.from({ length: pat.circle.n }, (_, i) => { const a = (pat.circle!.phase ?? 0) + (2 * Math.PI * i) / pat.circle!.n; return [pat.circle!.r * Math.cos(a), pat.circle!.r * Math.sin(a)]; }) : (pat.points ?? []);
      if (pat.circle) sizes(`${name}/${pat.name}`, [pat.circle.n, pat.circle.r]); for (const q of pts) if (!q.every(Number.isFinite)) throw new Error(`${name}/${pat.name}: a point is finite`);
      if (pat.face === undefined) pts.forEach((q, i) => {
        const edge = boxy(base) ? Math.min(base.size[0] / 2 - Math.abs(q[0]), base.size[2] / 2 - Math.abs(q[1])) : base.k === 'bend' ? 0 : base.r - Math.hypot(q[0], q[1]);
        const bore = base.k === 'cyl' && base.ri !== undefined ? Math.hypot(q[0], q[1]) - base.ri : Infinity;
        const near = Math.min(Infinity, ...pts.filter((_, k) => k !== i).map((w) => Math.hypot(w[0] - q[0], w[1] - q[1]) / 2)), slot = Math.min(edge, bore, near);
        if (!(slot > 0)) throw new Error(`${name}/${pat.name} ${i}: the pattern lies outside the piece (its slot ${(slot * 1000).toFixed(2)} mm)`);
        if (pat.hole !== undefined) { sizes(`${name}/${pat.name} hole`, [pat.hole]); if (!(pat.hole < slot)) throw new Error(`${name}/${pat.name}: a hole of ${pat.hole * 1000} mm needs a slot of more; it has ${(slot * 1000).toFixed(2)} mm`);
          minus.push({ k: 'cyl', c: [q[0], 0, q[1]], r: pat.hole, h: (boxy(base) ? base.size[1] : base.k === 'bend' ? 0 : base.h) + 2e-9 }); }
        lines.push({ port: `${name}/${pat.name}`, x: q[0], z: q[1], slot, ...(pat.hole !== undefined ? { opening: pat.hole } : {}) });
      });
      else { // (on a face: along that face's axis, into the piece from it)
        const f = pat.face; if (!FACES.includes(f)) throw new Error(`${name}/${pat.name}: a face is one of ${FACES.join(', ')} (${String(f)})`);
        if (base.k === 'bend') throw new Error(`${name}: a bend offers no pattern (not made yet)`);
        const k = 'xyz'.indexOf(f[1]!) as Axis, sg = f[0] === '+' ? 1 : -1, [i0, j0] = other(k), half = halfOf(base), dir = snapDir([0, 1, 2].map((a) => (a === k ? -sg : 0)) as unknown as P3);
        const out: V3 = [0, 0, 0]; out[k] = sg; const frame = snap(tr(toY(out)));
        const depth = pat.depth, L = depth === undefined ? 2 * half[k]! + 2e-9 : depth + 1e-9; if (depth !== undefined) { sizes(`${name}/${pat.name} depth`, [depth]); if (!(depth <= 2 * half[k]! + 1e-12)) throw new Error(`${name}/${pat.name}: a hole ${(depth * 1000).toFixed(2)} mm deep in a piece ${(2 * half[k]! * 1000).toFixed(2)} mm through`); }
        const round = roundish(base), lim = (a: Axis) => (round && a !== 1 ? base.r : half[a]!);
        pts.forEach((q, i) => {
          const at: V3 = [0, 0, 0]; at[i0] = q[0]; at[j0] = q[1];
          const edge = round && k === 1 ? base.r - Math.hypot(at[0], at[2]) : Math.min(lim(i0) - Math.abs(at[i0]), lim(j0) - Math.abs(at[j0]));
          const bore = k === 1 && base.k === 'cyl' && base.ri !== undefined ? Math.hypot(at[0], at[2]) - base.ri : Infinity;
          const near = Math.min(Infinity, ...pts.filter((_, m) => m !== i).map((w) => Math.hypot(w[0] - q[0], w[1] - q[1]) / 2)), slot = Math.min(edge, bore, near);
          if (!(slot > 0)) throw new Error(`${name}/${pat.name} ${i}: the pattern lies outside the ${f} face (its slot ${(slot * 1000).toFixed(2)} mm)`);
          if (pat.hole !== undefined) { sizes(`${name}/${pat.name} hole`, [pat.hole]); const wide = pat.sink ? ('cbore' in pat.sink ? pat.sink.cbore[0] : pat.sink.csink) : pat.hole;
            if (!(wide < slot)) throw new Error(`${name}/${pat.name}: a hole of ${(wide * 1000).toFixed(2)} mm needs a slot of more; it has ${(slot * 1000).toFixed(2)} mm`);
            const c: V3 = [at[0], at[1], at[2]]; c[k] = sg * (half[k]! + 1e-9 - L / 2); const r = pat.hole, top = L / 2, bot = -L / 2;
            // (counterbored or countersunk: a turned cut, its own +y out of the face)
            if (pat.sink) { const sk = pat.sink, [R, D] = 'cbore' in sk ? sk.cbore : [sk.csink, sk.csink - r]; sizes(`${name}/${pat.name} sink`, [R, D]);
              if (!(R > r && D < L)) throw new Error(`${name}/${pat.name}: a ${'cbore' in sk ? 'counterbore' : 'countersink'} wider than its hole (${(R * 1000).toFixed(2)} > ${(r * 1000).toFixed(2)} mm) and shallower than it (${(D * 1000).toFixed(2)} < ${(L * 1000).toFixed(2)} mm)`);
              const prof: (readonly [number, number])[] = 'cbore' in sk ? [[0, bot], [r, bot], [r, top - D], [R, top - D], [R, top], [0, top]] : [[0, bot], [r, bot], [r, top - D], [R, top], [0, top]];
              minus.push({ k: 'lathe', c, pts: prof, r: R, h: L, ...(frame ? { frame } : {}) }); }
            else minus.push({ k: 'cyl', c, r, h: L, ...(frame ? { frame } : {}) }); }
          const up = dir[0] === 0 && dir[2] === 0 && dir[1] === 1;
          lines.push({ port: `${name}/${pat.name}`, x: at[0], z: at[2], slot, ...(up ? {} : { y: at[1], dir }), ...(pat.hole !== undefined ? { opening: pat.hole } : {}) });
        });
      }
    }
    const piece: Piece = { name, mat, ...(o.color !== undefined ? { color: o.color } : {}), solid: { base, minus }, lines, ...(o.joint ? { joint: o.joint, ...(o.joint.turn ? { axis: [0, 0] as const } : {}) } : {}), ...(o.bought ? { bought: true as const } : {}), ...(o.tapped ? { tapped: true as const } : {}) };
    const rooms: RoomOf[] = base.k === 'cup' ? [{ name: `${name}/cavity`, c: [0, (base.ends) / 2, 0], r: base.r - base.wall, h: base.h - base.ends, open: true }]
      : base.k === 'box' && base.tray ? [{ name: `${name}/cavity`, c: [0, base.tray.floor / 2, 0], r: Math.hypot(base.size[0] - 2 * base.tray.wall, base.size[2] - 2 * base.tray.wall) / 2, h: base.size[1] - base.tray.floor, open: true, size: [base.size[0] - 2 * base.tray.wall, base.size[2] - 2 * base.tray.wall] }] : [];
    return Block.#seal(name, [piece], [], rooms);
  }

  /** Blocks end to end along an axis, centred across it (or on a port's line), or, `end` lo or hi, their bounds flush at
   *  that end across it (each block's low (or high) side across the axis level with the first one's: two extrusions in an
   *  L, a bracket at a beam's end, never a T): each next one past the last one's movers' sweeps (save what moves with it)
   *  and the fit's gap. Faces where they meet; a slide that closes a gap, a gated face. */
  static stack(name: string, axis: Axis, items: { b: Block; fit?: Fit }[], align?: string, level = false, end: Ends = 'mid'): Block {
    // (an end for each axis across, in x, y, z order with the stack's axis left out; one word for both)
    const acrossAxes = ([0, 1, 2] as const).filter((k) => k !== axis), ends = typeof end === 'string' ? [end, end] : end;
    if (!Array.isArray(ends) || ends.length !== 2 || ends.some((e) => e !== 'lo' && e !== 'hi' && e !== 'mid')) throw new Error(`${name}: at an end is lo, hi or mid, or one of each for the two axes across (${String(end)})`);
    const endAt = (k: Axis): End => ends[acrossAxes.indexOf(k as 0 | 1 | 2)]!;
    const pieces: Piece[] = [], faces: Face[] = [], rooms: RoomOf[] = []; let prev: number[] = [], seated: { k: number; seat: Seat }[] = [];
    for (const [i, it] of items.entries()) {
      Block.#is(it.b); if (it.fit !== undefined && !(it.fit in FITS)) throw new Error(`${name}: a fit by name (${String(it.fit)})`);
      const line = align ? it.b.pieces.flatMap((p) => p.lines.filter((l) => l.port === align)) : [], mid = it.b.lo.map((v, k) => (v + it.b.hi[k]!) / 2);
      // (centred across, or, laid in a row along x or z with `level`, each standing on the ground: its bottom at y = 0)
      // (on a turned line: only one along the stack's axis, centred on its point)
      const l0 = line[0]; if (l0 && !alongY(l0) && !(Math.abs(Math.abs(l0.dir![axis]) - 1) < 1e-9)) throw new Error(`${name}: the line ${align} is turned across the stack's axis: align on a line along it`);
      // (a line gives the coordinates it has (x and z along y; all three turned); the rest by the end asked: decision 0029)
      const onLine = (k: Axis): number | undefined => (!l0 ? undefined : k === 0 ? l0.x : k === 2 ? l0.z : alongY(l0) ? undefined : l0.y!);
      const across = [0, 1, 2].map((k) => onLine(k as Axis) ?? (endAt(k as Axis) === 'lo' ? it.b.lo[k]! : endAt(k as Axis) === 'hi' ? it.b.hi[k]! : mid[k]!)), d0 = [0, 1, 2].map((k) => (k === axis ? 0 : level && k === 1 && axis !== 1 ? -it.b.lo[1] : -across[k]!)) as V3;
      let s = Block.#shift(it.b, d0), touched: { a: number; q: number; c: number; at: [number, number]; spread: number } | undefined, g = 0;
      if (i > 0) {
        // (it comes to rest on what is in its path: the pieces before it whose bounds overlap its own across the stack's
        // axis (a bolt's head on its own hole's plate, not on another joint's head beside it); none in its path, on all)
        const other = ([0, 1, 2] as const).filter((k) => k !== axis), sb = s.pieces.map(boundOf);
        const inPath = prev.map((k) => pieces[k]!).filter((p) => { const pb = boundOf(p); return sb.some((q) => other.every((k) => pb[0][k]! < q[1][k]! - 1e-12 && q[0][k]! < pb[1][k]! - 1e-12)); });
        const A = inPath.length ? inPath : prev.map((k) => pieces[k]!), B = s.pieces, d: V3 = [0, 0, 0];
        // (pair by pair, decision 0028: it moves until the first pair in each other's path meets, so a tank whose outlet
        // reaches over a trailer's side boards still comes down onto the bed; with none in its path, past all of them)
        const box = (r: Piece, o: Piece) => (coMove(r, o) ? primBox(r.solid.base) : boundOf(r)), pairs = inPath.length ? inPath.flatMap((p) => B.filter((q) => { const pb = box(p, q), qb = box(q, p); return other.every((k) => pb[0][k]! < qb[1][k]! - 1e-12 && qb[0][k]! < pb[1][k]! - 1e-12); }).map((q) => box(p, q)[1][axis]! - box(q, p)[0][axis]!)) : [];
        const byBound = pairs.length ? Math.max(...pairs) : Math.max(...A.map((p) => (B.some((q) => !coMove(p, q)) ? boundOf(p) : primBox(p.solid.base))[1][axis])) - Math.min(...B.map((q) => (A.some((p) => !coMove(p, q)) ? boundOf(q) : primBox(q.solid.base))[0][axis]));
        // (root 1, decision 0029: the rest is a column cast of the solids (firstContact), where the smallest gap down a column
        // between the mover's lowest material and the host's highest closes, so a turned, round or slanted piece comes down to
        // what it touches, not to its box; the bound rest only where no column has both materials. A cast within a micron
        // of a bound's rest is snapped to it, so a flat pair's faces are found exactly)
        // (root 6: the fit's gap at the size across the face of the smaller of the pair that first touch; with none, of the
        // narrower of the two blocks)
        const cast = firstContact(A, B, axis), cands = pairs.length ? pairs : [byBound];
        g = gapOf(it.fit ?? 'touch', cast ? Math.min(widthAcross(A[cast.p]!, axis), widthAcross(B[cast.q]!, axis)) : Math.min(...[A, B].map((ps) => Math.min(...other.map((k) => Math.max(...ps.map((p) => boundOf(p)[1][k]!)) - Math.min(...ps.map((p) => boundOf(p)[0][k]!)))))));
        const snap = cast ? cands.filter((c) => Math.abs(c - cast.d) < 1e-6).sort((x, y) => Math.abs(x - cast.d) - Math.abs(y - cast.d))[0] : undefined;
        d[axis] = (cast ? snap ?? cast.d : byBound) + g;
        if (cast) touched = { a: pieces.indexOf(A[cast.p]!), q: cast.q, c: cast.c, at: cast.at, spread: cast.spread };
        s = Block.#shift(Block.#seal(it.b.name, s.pieces, s.faces, s.rooms), d);
        // (decision 0029 (7): a round piece laid along z onto a section along z (an axle in a V block, a pipe on a saddle)
        // comes down into the section's outline, resting where its circle first meets the outline from above (so it is above
        // every point of it), and touches along a line on each edge or corner it rests on; refused by name where, seated so,
        // it would meet another piece)
        if (axis === 1 && s.pieces.length === 1 && !s.pieces[0]!.joint) { const rod = s.pieces[0]!.solid.base;
          const seats = prev.map((k) => ({ k, seat: seatOn(rod, pieces[k]!.solid.base) })).filter((x): x is { k: number; seat: Seat } => !!x.seat);
          // (root 1: the column cast has already brought it down to the seat, within its tolerance; the seat's own height is
          // exact, so it is taken where it is lower, and the seat's line faces are written whenever the rod sits in it)
          if (seats.length) { const yc = Math.max(...seats.map((x) => x.seat.yc)) + g, down = rod.c[1] - yc, on = new Set(seats.filter((x) => x.seat.yc + g > yc - 1e-9).map((x) => x.k));
            if (down > 1e-12) { const t = Block.#shift(Block.#seal(it.b.name, s.pieces, s.faces, s.rooms), [0, -down, 0]), tb = boundOf(t.pieces[0]!);
              const hit = prev.find((k) => !on.has(k) && meets(boundOf(pieces[k]!), tb)); if (hit !== undefined) throw new Error(`no room on ${name}: the ${s.pieces[0]!.name} seated in the ${pieces[[...on][0]!]!.name}'s outline would meet the ${pieces[hit]!.name}`);
              s = t; }
            if (down > -1e-7) seated = seats.filter((x) => on.has(x.k)).map((x) => ({ k: x.k, seat: x.seat })); } }
      } else { const d: V3 = [0, 0, 0]; d[axis] = -it.b.lo[axis]!; s = Block.#shift(Block.#seal(it.b.name, s.pieces, s.faces, s.rooms), d); }
      const base = pieces.length; pieces.push(...s.pieces); faces.push(...s.faces.map((f) => ({ ...f, a: f.a + base, b: f.b + base })));
      for (const { k, seat } of seated) { const rb = primBox(s.pieces[0]!.solid.base), sb = primBox(pieces[k]!.solid.base), z0 = Math.max(rb[0][2], sb[0][2]), z1 = Math.min(rb[1][2], sb[1][2]);
        for (const t of seat.touch) faces.push({ a: k, b: base, kind: g > 0 ? 'gap' : 'contact', patch: 'line', area: 0, length: Math.max(0, z1 - z0), at: [t.at[0] + (t.n[0] * g) / 2, t.at[1] + (t.n[1] * g) / 2, (z0 + z1) / 2], normal: [t.n[0], t.n[1], 0], gap: g, ...(g > 0 ? { fit: it.fit, medium: MEDIUM } : {}), by: `${name}: ${s.pieces[0]!.name} seated in ${pieces[k]!.name}'s outline` }); }
      seated = [];
      // (a room open upward in one block of a stack along y is closed by what comes after it)
      rooms.push(...s.rooms.map((r) => (axis === 1 && i < items.length - 1 ? { ...r, open: false } : r)));
      const here = s.pieces.map((_, j) => base + j);
      if (i > 0) faces.push(...planeFaces(pieces, prev, here, axis, `${name}: stacked`, g, it.fit));
      // (root 1: the pair of the column that closed first, where nothing above wrote a face for it (a slope on a wall's
      // corner, a sphere on a plate): the patch at that height, else a line at the column's point as long as the columns
      // that closed together spread)
      if (touched && !faces.some((f) => f.a === touched!.a && f.b === base + touched!.q)) { const p = pieces[touched.a]!, q = pieces[base + touched.q]!, w = planePatch(p, q, axis, touched.c, g);
        const r = w.area > 0 || w.length > 0 ? w : { area: 0, length: touched.spread, at: pt(axis, touched.c + g / 2, touched.at[0], touched.at[1]) };
        faces.push({ a: touched.a, b: base + touched.q, kind: g > 0 ? 'gap' : 'contact', patch: r.area > 0 ? 'area' : 'line', area: r.area, ...(r.area > 0 ? {} : { length: r.length }), at: r.at, normal: unit(axis), gap: g, ...(g > 0 ? { fit: it.fit, medium: MEDIUM } : {}), by: `${name}: first contact` }); }
      prev = [...prev, ...here];
    }
    return Block.#seal(name, pieces, faces, rooms);
  }

  /** A host made round a child: its cavity the child's swept bound, enclosed by a cylinder about y, and the fit's gap;
   *  its wall and ends its own; open at +y if asked (its top then level with the child's); a bore that runs through the
   *  child along its axis kept open through its ends. Faces round the cavity. */
  static around(name: string, mat: string, child: Block, wall: number, ends: number, fit: Fit = 'clear', open = false): Block {
    Block.#is(child); sizes(name, [wall, ends]); if (!(fit in FITS)) throw new Error(`${name}: a fit by name`);
    // (root 6: the fit's gap at the diameter the child reaches round its axis)
    const cx = (child.lo[0] + child.hi[0]) / 2, cz = (child.lo[2] + child.hi[2]) / 2, rc0 = Math.max(...child.pieces.map((p) => reach(sweepOf(p), cx, cz))), g = gapOf(fit, 2 * rc0), rc = rc0 + g;
    const y0 = child.lo[1] - g - ends, y1 = open ? child.hi[1] : child.hi[1] + g + ends, h = y1 - y0;
    // (a bore that runs through the child along its axis (a piezo ring's, a bearing's, a coil's) is kept open through the
    // host's ends, as a moulded sensor's bolt hole is: what every child piece leaves free round the axis, cut through both
    // ends; taking material from the host alone, it cannot put one piece in another (the critic, 2026-11-05: Around closed
    // a knock sensor's bore))
    // (root 3: read from each piece's solid with its cuts, so a plate's drilled hole or a sprocket's bore is kept too)
    const bore = Math.min(...child.pieces.map((p) => freeAbout(p, cx, cz))), keep = bore > 1e-9 && child.pieces.some((p) => { const s = sweepOf(p);
      return (roundish(s) && upright(s) && Math.hypot(s.c[0] - cx, s.c[2] - cz) < 1e-12 && boreOf(s) !== undefined) || (!p.joint && !roundish(s) && roundAbout(p, cx, cz)); });
    const host: Piece = { name, mat, solid: { base: { k: 'cup', c: [cx, (y0 + y1) / 2, cz], r: rc + wall, h, wall, ends, open }, minus: keep ? [{ k: 'cyl', c: [cx, (y0 + y1) / 2, cz], r: bore, h: h + 2e-9 }] : [] }, lines: [{ port: `${name}/axis`, x: cx, z: cz, slot: rc + wall }] };
    const pieces = [host, ...child.pieces], faces: Face[] = child.faces.map((f) => ({ ...f, a: f.a + 1, b: f.b + 1 })), kind = g > 0 ? 'gap' : 'contact';
    child.pieces.forEach((p, i) => {
      const w = roundFace(p, cx, cz, rc - g, child.lo[1], child.hi[1], true);
      if (w.area > 0 || w.length > 0) faces.push({ a: 0, b: i + 1, kind, patch: w.area > 0 ? 'area' : 'line', area: w.area, ...(w.area > 0 ? {} : { length: w.length }), at: w.at, normal: [1, 0, 0], gap: g, ...(g > 0 ? { fit, medium: MEDIUM } : {}), by: `${name}: round its cavity` });
    });
    // (its floor, and its lid where it is closed: as a plane each, the host on one side)
    const floor = Block.#plane(pieces, 0, child.pieces.map((_, i) => i + 1), 1, y0 + ends, g, `${name}: its floor`, true, fit);
    const lid = open ? [] : Block.#plane(pieces, 0, child.pieces.map((_, i) => i + 1), 1, y1 - ends, g, `${name}: its lid`, false, fit);
    return Block.#seal(name, pieces, [...faces, ...floor, ...lid], child.rooms.map((r) => ({ ...r, open: false })));
  }
  // (a host's own face on the plane y = c, against pieces beyond it (above it when up), across a gap g; a slide reaching
  // it at the end of its travel, a gated face)
  static #plane(ps: Piece[], h: number, kids: number[], axis: Axis, c: number, g: number, by: string, up: boolean, fit?: Fit): Face[] {
    const out: Face[] = [];
    for (const k of kids) { const p = ps[k]!, B = primBox(p.solid.base), near = up ? B[0][1] - c : c - B[1][1];
      const sample = (t: number, gap: number) => { const bb = boundOf(p); let n = 0, su = 0, sv = 0; const du = (bb[1][0] - bb[0][0]) / N, dv = (bb[1][2] - bb[0][2]) / N;
        for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const u = bb[0][0] + (a + 0.5) * du, v = bb[0][2] + (b + 0.5) * dv, y = up ? c + gap + EPS : c - gap - EPS;
          if (inPiece(p, u, y, v, t) && inSolid(ps[h]!.solid, u, up ? c - EPS : c + EPS, v)) { n++; su += u; sv += v; } }
        return n ? { area: n * du * dv, at: [su / n, c + (up ? gap / 2 : -gap / 2), sv / n] as V3 } : null; };
      if (Math.abs(near - g) < 1e-9) { const r = sample(0, g); if (r) out.push({ a: h, b: k, kind: g > 0 ? 'gap' : 'contact', patch: 'area', area: r.area, at: r.at, normal: [0, up ? 1 : -1, 0], gap: g, ...(g > 0 ? { ...(fit ? { fit } : {}), medium: MEDIUM } : {}), by }); }
      else if (!up && p.joint?.slide && Math.abs(near - p.joint.slide - g) < 1e-9) { const r = sample(1, g); if (r) out.push({ a: h, b: k, kind: 'contact', patch: 'area', area: r.area, at: r.at, normal: [0, -1, 0], gap: p.joint.slide, medium: MEDIUM, gate: p.joint.name, by }); }
    }
    return out;
  }

  /** A passer on a line one piece of the block offers (its axis, or one of its pattern), laid from that piece's lo or hi
   *  face into it, along y. The line's piece has the passer's union taken out of it where their bounds meet, every other
   *  solid where the passer's room would take material from it (root 1: by the solids, cutMeets): each passer piece swept
   *  over its motion relative to that solid and grown by the fit's gap. A passer piece wider than the line's room is
   *  refused only where its room would take material from a piece of the block, and is cut from none. A bought solid is not
   *  cut: the passer goes through it only on one of its openings, no wider than the opening. A motion between the passer
   *  and a solid it crosses may only slide along the line or turn about it (the cut round about it); any other is refused. */
  static through(b: Block, passer: Block, on: { port: string; i?: number; from: 'lo' | 'hi'; k?: number }, fit: Fit = 'tight'): Block {
    Block.#is(b); Block.#is(passer); if (!(fit in FITS)) throw new Error(`through: a fit by name`);
    // (a name given almost right: the line it plainly means, said back as a note; `k` the one piece of several offering it)
    const nm = namedIn(b, on.port, 'line', 'through'); if (nm.port !== on.port) return noted(Block.through(b, passer, { ...on, port: nm.port }, fit), nm.note);
    const offers0 = b.pieces.flatMap((p, k) => p.lines.filter((l) => l.port === on.port && (on.k === undefined || k === on.k)).map((l) => ({ p, k, l })));
    const ks = [...new Set(offers0.map((o) => o.k))];
    // (decision 0029 (5): two or more pieces offer the line (two plates of one name stacked, two flanges): their points are
    // listed lowest piece first along the line, `which` (i) counts through all of them, and which piece was taken is said)
    const low = (o: { p: Piece; l: Line }) => { const d = o.l.dir ?? [0, 1, 0], B = primBox(o.p.solid.base); return Math.min(d[0] * B[0][0], d[0] * B[1][0]) + Math.min(d[1] * B[0][1], d[1] * B[1][1]) + Math.min(d[2] * B[0][2], d[2] * B[1][2]); };
    const offers = ks.length > 1 ? [...offers0].sort((u, v) => low(u) - low(v) || u.k - v.k) : offers0;
    const o = offers[on.i ?? 0]; if (!o) throw new Error(`through: ${b.name} offers no line ${on.port}${on.i !== undefined ? ` ${on.i}` : ''}${offers.length ? ` (it has ${offers.length} of them: 0 to ${offers.length - 1})` : ` (it offers ${offered(b)})`}`);
    if (ks.length > 1 && on.k === undefined) { const i = offers0.filter((x) => x.k === o.k).indexOf(o); return noted(Block.through(b, passer, { ...on, k: o.k, i }, fit), `through: ${ks.length} pieces offer ${on.port}; took the ${o.p.name} (piece ${o.k + 1}, the ${offers.indexOf(o) === 0 ? 'lowest' : `${offers.indexOf(o) + 1}th from the low end`} along it)`); }
    // (a passer whose block was turned: laid as made again about the straight piece it goes along (decision 0026))
    const asMade = Block.#asMade(passer, o.l.dir ?? [0, 1, 0], false); if (asMade) return Block.through(b, asMade, on, fit);
    const bent = !FLIPPED.has(passer) && passer.pieces.find((q) => !upright(q.solid.base) || q.solid.base.k === 'bend');
    if (bent) throw new Error(`through: the ${bent.name} lies across the line (turned or bent) when the ${passer.name} is laid along its straight piece's own axis: pass that straight on its own, then put the rest to it (Onto a face, Stack); a pipe's bends are laid by Run of tube`);
    // (a turned line: in its own frame, where it runs along +y; lo and hi its own ends, against and along its direction.
    // A line that runs down into its piece (a hole into a top face: countersunk, counterbored or blind) has its frame upside
    // down: there lo and hi are read as they stand (above is above) and the passer is kept the way up it was made, so a
    // screw's head stays toward the side it comes from and its cone goes in the countersink (the critic, 2026-11-05: a
    // countersunk screw came out upside down, its head in a pocket cut in the plate's underside))
    if (!alongY(o.l)) { const d = o.l.dir!;
      if (d[1] < -1e-9) { const up = Block.#turned(passer, turnOf(0, 180), Block.#mid(passer), false); FLIPPED.add(up); if (MADE.has(passer)) MADE.set(up, MADE.get(passer)!);
        return Block.#inFrame(b, d, 'through', passer, (h) => Block.through(h, up, { ...on, from: on.from === 'lo' ? 'hi' : 'lo' }, fit)); }
      return Block.#inFrame(b, d, 'through', passer, (h) => Block.through(h, passer, on, fit)); }
    const hb = primBox(o.p.solid.base), y0 = on.from === 'lo' ? hb[0][1] : hb[1][1];
    const ak = MADE.get(passer), ac = ak !== undefined ? passer.pieces[ak]!.solid.base.c : undefined;
    const pc = ac ? [ac[0], ac[2]] : [(passer.lo[0] + passer.hi[0]) / 2, (passer.lo[2] + passer.hi[2]) / 2], P = Block.#shift(passer, [o.l.x - pc[0]!, on.from === 'lo' ? y0 - passer.lo[1] : y0 - passer.hi[1], o.l.z - pc[1]!]);
    // (root 6: the fit's gap at the passer's size on the line, its narrowest piece's there (a bolt's shank, not its head): a
    // round piece's diameter, any other's narrower width across the line)
    const rq = P.pieces.map((q) => reach(sweepOf(q), o.l.x, o.l.z)), g = gapOf(fit, Math.min(...P.pieces.map((q, k) => { const B = sweepOf(q); return roundish(B) && upright(B) ? 2 * rq[k]! : widthAcross(q, 1); }))), wide = rq.map((r) => r + g > o.l.slot + 1e-12);
    const pb = P.pieces.map(boundOf), all: [V3, V3] = [[0, 1, 2].map((k) => Math.min(...pb.map((x) => x[0][k]!))) as V3, [0, 1, 2].map((k) => Math.max(...pb.map((x) => x[1][k]!))) as V3];
    // (a box passer's cut is its whole box grown by the gap: a case's cavity and a section's outline are dropped, so the
    // cut holds the gap all round them too (a red team, 2026-11-05: a case kept its wall, a section no gap))
    // (a solid turned profile, a countersunk screw's cone head, takes its own outline grown by the gap, not the cylinder of its
    // widest radius, so its cone sits in a countersink and does not bore a counterbore round it (the critic, 2026-11-05))
    const grow = (m: Prim): Prim => grownBy(m, g);
    const onLine = (ax: readonly [number, number]) => Math.hypot(ax[0] - o.l.x, ax[1] - o.l.z) < 1e-12;
    const cutFor = (q: Piece, s: Piece): Prim => {
      if (coMove(q, s) || (!q.joint && !s.joint)) return q.solid.base;
      if (q.joint && s.joint) throw new Error(`through: the ${q.name} and the ${s.name} move on two joints (${q.joint.name}, ${s.joint.name}): refused`);
      const m = (q.joint ?? s.joint)!, mover = q.joint ? q : s;
      if (m.turn) { if (!onLine(mover.axis!)) throw new Error(`through: the ${mover.name} turns about another line than ${on.port}: refused`); const B = q.solid.base; if (B.k === 'bend') throw new Error(`through: the ${q.name} is bent and on a joint: not made yet`); return !boxy(B) && Math.hypot(B.c[0] - o.l.x, B.c[2] - o.l.z) < 1e-12 ? B : { k: 'cyl', c: [o.l.x, B.c[1], o.l.z], r: reach(B, o.l.x, o.l.z), h: boxy(B) ? B.size[1] : B.h }; }
      // (a slide along the line: the passer's room swept along it, up when the passer slides, down when the host does)
      return q.joint ? sweepOf(q) : (() => { const sw = sweepOf({ ...q, joint: m }), dy = -m.slide!; return shiftPrim(sw, [0, dy, 0]); })();
    };
    // (root 1, the rest (decision 0029): what the passer meets read by the solids. A passer piece wider than the line's room
    // is refused only where its room, grown by the fit, would take material from a piece of the block (cutMeets): one
    // beside them all passes (a wheel between a fork's legs drawn as a shell, on the axle through them). And a piece other
    // than the line's is cut only where the passer's room would take material from it, not wherever their bounds meet)
    const takes = (q: Piece, s: Piece): boolean => { try { return cutMeets(grow(cutFor(q, s)), s); } catch { return true; } };
    const tooWide = P.pieces.map((q, k) => wide[k] && b.pieces.some((s) => meets(boundOf(s), pb[k]!) && takes(q, s)));
    if (tooWide.some(Boolean)) { const rho = Math.max(...rq.filter((_, k) => tooWide[k])); throw new Error(`no room on ${on.port}: the ${passer.name} needs ${((rho + g) * 1000).toFixed(2)} mm from the line; the line offers ${(o.l.slot * 1000).toFixed(2)} mm`); }
    const pieces = b.pieces.map((s, j): Piece => {
      if (!meets(boundOf(s), all)) return s;
      const hit = P.pieces.filter((q, k) => meets(boundOf(s), pb[k]!) && !wide[k] && (j === o.k || cutMeets(grow(cutFor(q, s)), s))); if (!hit.length) return s;
      if (s.bought) { const op = s.lines.find((l) => l.opening !== undefined && alongY(l) && Math.hypot(l.x - o.l.x, l.z - o.l.z) < 1e-12);
        const need = Math.max(...hit.map((q) => reach(sweepOf(q), o.l.x, o.l.z))) + g;
        if (!op) throw new Error(`through: the ${s.name} is bought and lies in the way off its openings: refused (never cut)`);
        if (need > op.opening! + 1e-12) throw new Error(`no room in the ${s.name}'s opening: the ${passer.name} needs ${(need * 1000).toFixed(2)} mm; it opens ${(op.opening! * 1000).toFixed(2)} mm`);
        return s; }
      return { ...s, solid: { base: s.solid.base, minus: [...s.solid.minus, ...hit.map((q) => grow(cutFor(q, s)))] } };
    });
    const n = pieces.length, out = [...pieces, ...P.pieces], faces: Face[] = [...b.faces, ...P.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n }))], kind = g > 0 ? 'gap' : 'contact';
    P.pieces.forEach((q, k) => {
      const qb = primBox(q.solid.base), Q = n + k;
      pieces.forEach((s, j) => {
        if (!meets(boundOf(s), [[qb[0][0] - g - 1e-9, qb[0][1], qb[0][2] - g - 1e-9], [qb[1][0] + g + 1e-9, qb[1][1], qb[1][2] + g + 1e-9]])) return;
        // (its side against the hole's wall, where the solid it crosses has material round it)
        const B = q.solid.base; if (B.k === 'bend') return; const w = !boxy(B) ? roundFace(s, B.c[0], B.c[2], B.r + g, qb[0][1], qb[1][1], false) : boxSide(s, q, g);
        // (or, through a bore it already has, across the gap the bore leaves)
        const SB = s.solid.base, bore = SB.k === 'cyl' && upright(SB) && SB.ri !== undefined && !boxy(B) && Math.hypot(SB.c[0] - B.c[0], SB.c[2] - B.c[2]) < 1e-12 && SB.ri > B.r + g ? SB.ri - B.r : 0;
        // (only where nothing else stands in that bore between them)
        const between = bore > 0 && pieces.some((t, m) => m !== j && meets(boundOf(t), primBox({ k: 'cyl', c: B.c, r: (SB as { ri: number }).ri, h: (B as { h: number }).h })));
        if (bore && !between && !(w.area > 0 || w.length > 0)) { const sb = primBox(s.solid.base), lo = Math.max(sb[0][1], qb[0][1]), hi = Math.min(sb[1][1], qb[1][1]);
          if (hi > lo) faces.push({ a: j, b: Q, kind: 'gap', patch: 'area', area: 2 * Math.PI * (B as { r: number }).r * (hi - lo), at: [B.c[0], (lo + hi) / 2, B.c[2]], normal: [1, 0, 0], gap: bore, medium: MEDIUM, by: `${q.name} in the bore of ${s.name}` }); }
        // (or in a hole of the piece whose line it is, wider than it: across the clearance the hole leaves, its wall where the
        // piece has material round it (an insert in an oversized hole, a pin in a clearance hole: decision 0026); root 6: or in
        // a hole of another piece it crosses, offered at the same point (a bolt's shank in each ply's clearance hole, which a
        // constant gap of the clearance's size used to meet as its wall)
        const own = j === o.k ? o.l : s.lines.find((l) => alongY(l) && l.opening !== undefined && Math.hypot(l.x - o.l.x, l.z - o.l.z) < 1e-12);
        const op = own?.opening, inHole = !!own && op !== undefined && !bore && !(w.area > 0 || w.length > 0) && roundish(B) && upright(B) && Math.hypot(B.c[0] - o.l.x, B.c[2] - o.l.z) < 1e-12 && op > B.r + g + 1e-12;
        if (inHole) { const hw = roundFace(s, o.l.x, o.l.z, op, qb[0][1], qb[1][1], false);
          if (hw.area > 0) faces.push({ a: j, b: Q, kind: 'gap', patch: 'area', area: hw.area * (B as { r: number }).r / op, at: hw.at, normal: [1, 0, 0], gap: op - (B as { r: number }).r, medium: MEDIUM, by: `${q.name} in the hole of ${s.name}` }); }
        if (w.area > 0 || w.length > 0) { const it = pressureOf(fit, 2 * (!boxy(B) ? B.r : Math.min(B.size[0], B.size[2]) / 2), 2 * outsideNear(s.solid.base, B.c[0], B.c[2]), q.mat, s.mat);
          faces.push({ a: j, b: Q, kind, patch: w.area > 0 ? 'area' : 'line', area: w.area, ...(w.area > 0 ? {} : { length: w.length }), at: w.at, normal: [1, 0, 0], gap: g, ...(g > 0 ? { fit, medium: MEDIUM } : {}), ...(it ? { interference: it } : {}), by: `${q.name} through ${s.name}` }); }
      });
      // (its ends against what lies beyond them: a head under its plies, a stud's end where a contact closes on it)
      const nearXZ = (j: number) => { const B = boundOf(pieces[j]!); return B[0][0] < qb[1][0] && qb[0][0] < B[1][0] && B[0][2] < qb[1][2] && qb[0][2] < B[1][2]; }, cand = pieces.map((_, j) => j).filter(nearXZ);
      faces.push(...Block.#ends(out, cand, Q, qb[0][1], `${q.name} on what is below it`), ...Block.#ends(out, cand, Q, qb[1][1], `${q.name} under what is above it`, true));
    });
    // (a room the passer crosses is no longer free)
    return Block.#seal(b.name, out, faces, b.rooms.filter((r) => !meets(primBox({ k: 'cyl', c: r.c, r: r.r, h: r.h }), all)));
  }
  // (a passer's end on the plane y = c against pieces beyond it: those whose material lies just across, at rest, or at
  // the end of a slide that closes on it)
  static #ends(ps: Piece[], others: number[], q: number, c: number, by: string, up = false): Face[] {
    const out: Face[] = [], Q = ps[q]!, qb = primBox(Q.solid.base);
    for (const j of others) { const s = ps[j]!;
      for (const t of s.joint?.slide && !coMove(s, Q) && !up ? [0, 1] : [0]) {
        let n = 0, su = 0, sv = 0; const du = (qb[1][0] - qb[0][0]) / N, dv = (qb[1][2] - qb[0][2]) / N;
        for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) { const u = qb[0][0] + (a + 0.5) * du, v = qb[0][2] + (b + 0.5) * dv;
          if (inPiece(Q, u, up ? c - EPS : c + EPS, v) && inPiece(s, u, up ? c + EPS : c - EPS, v, t)) { n++; su += u; sv += v; } }
        if (n) { out.push({ a: j, b: q, kind: 'contact', patch: 'area', area: n * du * dv, at: [su / n, c, sv / n], normal: [0, up ? -1 : 1, 0], gap: t ? s.joint!.slide! : 0, ...(t ? { medium: MEDIUM, gate: s.joint!.name } : {}), by }); break; }
      }
    }
    return out;
  }

  /** A block into a room a piece of the host offers (a cup's cavity): the block's swept bound and the fit's gap within
   *  it, standing on its floor on its axis; else "no room" with both numbers. The room is then used. */
  static into(host: Block, port: string, child: Block, fit: Fit = 'clear'): Block {
    Block.#is(host); Block.#is(child); if (!(fit in FITS)) throw new Error(`into: a fit by name`);
    const nm = namedIn(host, port, 'room', 'into'); if (nm.port !== port) return noted(Block.into(host, nm.port, child, fit), nm.note);
    const r = host.rooms.find((x) => x.name === port); if (!r) throw new Error(`into: ${host.name} offers no room ${port} (it has ${host.rooms.map((x) => x.name).join(', ') || 'none'})`);
    // (root 6: the fit's gap at the child's diameter round the room's axis, or in a box-shaped room its narrower width)
    const cx = (child.lo[0] + child.hi[0]) / 2, cz = (child.lo[2] + child.hi[2]) / 2, rho = Math.max(...child.pieces.map((p) => reach(sweepOf(p), cx, cz))), tall = child.hi[1] - child.lo[1];
    const g = gapOf(fit, r.size ? Math.min(child.hi[0] - child.lo[0], child.hi[2] - child.lo[2]) : 2 * rho);
    if (r.size) { const cw = child.hi[0] - child.lo[0] + 2 * g, cd = child.hi[2] - child.lo[2] + 2 * g;
      if (cw > r.size[0] + 1e-12 || cd > r.size[1] + 1e-12) throw new Error(`no room in ${port}: the ${child.name} needs ${(cw * 1000).toFixed(2)} × ${(cd * 1000).toFixed(2)} mm; it gives ${(r.size[0] * 1000).toFixed(2)} × ${(r.size[1] * 1000).toFixed(2)} mm`); }
    else if (rho + g > r.r + 1e-12) throw new Error(`no room in ${port}: the ${child.name} needs ${((rho + g) * 2000).toFixed(2)} mm across; it gives ${(r.r * 2000).toFixed(2)} mm`);
    if (!r.open && tall + g > r.h + 1e-12) throw new Error(`no room in ${port}: the ${child.name} needs ${((tall + g) * 1000).toFixed(2)} mm of height; it gives ${(r.h * 1000).toFixed(2)} mm`);
    const floor = r.c[1] - r.h / 2, C = Block.#shift(child, [r.c[0] - cx, floor + g - child.lo[1], r.c[2] - cz]), n = host.pieces.length;
    const pieces = [...host.pieces, ...C.pieces], faces: Face[] = [...host.faces, ...C.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n }))];
    const holder = host.pieces.findIndex((p) => `${p.name}/cavity` === port);
    // (an open room: what stands above its rim must meet none of the host's other pieces, a rod laid across over the cup or a
    // washer wider than it (a red team, 2026-11-05); below the rim the room is kept free by every operation)
    const cb = C.pieces.map(boundOf), clo = [0, 1, 2].map((k) => Math.min(...cb.map((q) => q[0][k]!))) as V3, chi = [0, 1, 2].map((k) => Math.max(...cb.map((q) => q[1][k]!))) as V3;
    const rim = floor + r.h; if (r.open && chi[1] > rim + 1e-12) { const col: [V3, V3] = [[clo[0], rim, clo[2]], chi];
      const hit = host.pieces.find((p, i) => i !== holder && meets(boundOf(p), col)); if (hit) throw new Error(`no room in ${port}: the ${child.name} stands above its rim and would meet the ${hit.name}`); }
    C.pieces.forEach((p, i) => { const w = r.size ? { area: 0, length: 0, at: [0, 0, 0] as V3 } : roundFace(p, r.c[0], r.c[2], r.r - g, floor, floor + r.h, true);
      if (w.area > 0 || w.length > 0) faces.push({ a: holder, b: n + i, kind: g > 0 ? 'gap' : 'contact', patch: w.area > 0 ? 'area' : 'line', area: w.area, ...(w.area > 0 ? {} : { length: w.length }), at: w.at, normal: [1, 0, 0], gap: g, ...(g > 0 ? { fit, medium: MEDIUM } : {}), by: `${child.name} into ${port}` }); });
    faces.push(...Block.#plane(pieces, holder, C.pieces.map((_, i) => n + i), 1, floor, g, `${child.name} on ${port}'s floor`, true, fit));
    return Block.#seal(host.name, pieces, faces, host.rooms.filter((x) => x !== r).concat(C.rooms.map((x) => ({ ...x, open: x.open && r.open }))));
  }
  /** onto: into the space beyond a face of a block's bound, on a line it offers there (or its middle, or, `end` lo or
   *  hi, flush with that face's low or high corner across it: a corner bracket at an extrusion's end). */
  static onto(host: Block, face: '+x' | '-x' | '+y' | '-y' | '+z' | '-z', child: Block, fit: Fit = 'touch', at?: string, end: Ends = 'mid', tilt?: { about: Axis | P3; degrees: number }): Block {
    const axis = ('xyz'.indexOf(face[1]!)) as Axis;
    // (decision 0029 (2): laid at an angle (a roof on walls, a dish tilted on its mount): the child turned about its own
    // middle by the tilt first (about one of the face's own axes, or any), then laid against the face as any block is, so
    // it rests on the face by its lowest edge or corner; where that is an edge, a line face is written for it (linePatch))
    const c = tilt && Math.abs(tilt.degrees) > 1e-12 ? Block.turn(child, tilt.about, tilt.degrees) : child;
    return face[0] === '+' ? Block.stack(host.name, axis, [{ b: host }, { b: c, fit }], at, false, end) : Block.stack(host.name, axis, [{ b: c }, { b: host, fit }], at, false, end);
  }
  /** A sleeve (a washer, a nut, a tube, a coil, a bobbin) slid over a line a host offers (a shaft's axis, a bolt's
   *  shank): every piece of the sleeve is round about its own axis with a bore, and that bore is at least what is on the
   *  line there and the fit's gap; it stands at the line's piece's low end, its high end or its middle, or a distance
   *  along the line from one of those ends (its near end that far from it: never an x, y or z, decision 0026), within the
   *  piece's length; and it meets no other piece of the host. Else refused, with both sizes or what is in the way. A
   *  face round the bore. */
  /** A sleeve whose bored piece is a section on edge (a sprocket, a gear drawn with its bore: its outline drawn along its
   *  own length, z, its line `<name>/axis` along that), laid as made again (root 3, decision 0029): turned rigidly about
   *  its middle so that line runs along +y, as `asMade` lays a turned round piece, so it goes over a line by the bore its
   *  outline leaves. Where a piece of it is round with a bore (a pulley's hub), or none is such a section: undefined. */
  static #sectionLaid(b: Block): Block | undefined {
    if (MADE.has(b) || FLIPPED.has(b) || b.pieces.some((q) => roundish(q.solid.base) && boreOf(q.solid.base) !== undefined)) return undefined;
    const k = b.pieces.findIndex((q) => q.solid.base.k === 'box' && !!q.solid.base.sect && q.lines.some((l) => l.port.endsWith('/axis'))); if (k < 0) return undefined;
    const q = b.pieces[k]!, l = q.lines.find((x) => x.port.endsWith('/axis'))!; if (alongY(l) && !q.solid.base.frame) return undefined;
    const out = Block.#turned(b, toY(l.dir ?? [0, 1, 0]), Block.#mid(b), false); MADE.set(out, k); return out;
  }
  static over(host: Block, port: string, sleeve: Block, where:'lo' | 'hi' | 'mid' | { readonly from: 'lo' | 'hi'; readonly along: number } = 'mid', fit: Fit = 'slide'): Block {
    Block.#is(host); Block.#is(sleeve); if (!(fit in FITS)) throw new Error(`over: a fit by name`);
    const nm = namedIn(host, port, 'line', 'over'); if (nm.port !== port) return noted(Block.over(host, nm.port, sleeve, where, fit), nm.note);
    const offers = host.pieces.flatMap((p, k) => p.lines.filter((l) => l.port === port).map((l) => ({ p, k, l })));
    const o = offers[0]; if (!o) throw new Error(`over: ${host.name} offers no line ${port} (it offers ${offered(host)})`);
    // (a sleeve whose block was turned: laid as made again about its bored piece (decision 0026); a piece of it still turned
    // off that piece's axis is tried by its bound, and one on the axis leaves nothing free there and is refused)
    const asMade = Block.#asMade(sleeve, o.l.dir ?? [0, 1, 0], true); if (asMade) return Block.over(host, port, asMade, where, fit);
    const laid = Block.#sectionLaid(sleeve); if (laid) return Block.over(host, port, laid, where, fit);
    const bent =!MADE.has(sleeve) && sleeve.pieces.find((q) => !upright(q.solid.base) || q.solid.base.k === 'bend'); if (bent) throw new Error(`over: the ${bent.name} is turned and has no bored piece to go along: a sleeve goes over its line by its bore; slide it on, then turn the whole`);
    // (a turned line: in its own frame, where it runs along +y; lo and hi its own ends)
    if (!alongY(o.l)) return Block.#inFrame(host, o.l.dir!, 'over', sleeve, (h) => Block.over(h, port, sleeve, where, fit));
    // (root 3: a section laid as made has its axis where its outline's line runs, not at its bound's middle)
    const ap = MADE.has(sleeve) ? sleeve.pieces[MADE.get(sleeve)!]! : undefined, al = ap && boxy(ap.solid.base) ? ap.lines.find((l) => l.port.endsWith('/axis') && alongY(l)) : undefined, ac: P3 | undefined = al ? [al.x, 0, al.z] : ap?.solid.base.c;
    // (root 6: the fit's gap at the diameter of what is on the line)
    const rs = reach(sweepOf(o.p), o.l.x, o.l.z), g = gapOf(fit, 2 * rs), cx = ac ? ac[0] : (sleeve.lo[0] + sleeve.hi[0]) / 2, cz = ac ? ac[2] : (sleeve.lo[2] + sleeve.hi[2]) / 2;
    // (its bore: the least, over its pieces, of the room each leaves free round the sleeve's axis: one round about the axis
    // its own bore; one off it (a bearing's balls and cage between its rings) as far as its nearest side; one on the axis
    // with none, nothing; root 3: read from each solid with its cuts, so a section's hole polygon (a sprocket, a gear drawn
    // with its bore) or a plate's drilled hole is a bore. A tapped piece of the shank's own size goes on by its thread (ISO
    // 965's fit), no gap drawn)
    const free = sleeve.pieces.map((q) => freeAbout(q, cx, cz, false));
    // (a section's pilot on the axis that its line says may be opened (`boreTo`: a gear's bore) and is less than what is on
    // the line with the fit's gap: opened to it, as Through opens it)
    const opens = (i: number) => { const q = sleeve.pieces[i]!, l = q.lines.find((x) => x.port.endsWith('/axis') && alongY(x) && Math.hypot(x.x - cx, x.z - cz) < 1e-9);
      return !!l && q.solid.base.k === 'box' && !!q.solid.base.sect && l.opening === undefined && free[i]! > 1e-12 && free[i]! + 1e-9 < rs + g && l.slot >= rs + g - 1e-12; };
    // (decision 0029 (6): a piece of the sleeve on its axis with no bore (a hub drawn solid, an end bell; root 3: a plate or
    // a box used as a hub) is bored to what is on the line with the fit's gap, said as a note; a bought one, or one of
    // another kind, is refused with the way named)
    if (sleeve.pieces.some((_, i) => !(free[i]! > 1e-12) || opens(i))) { const bore = rs + g, bored: string[] = [], opened: string[] = [];
      const pieces = sleeve.pieces.map((q, i): Piece => { const wid = opens(i); if (free[i]! > 1e-12 && !wid) return q; const B = q.solid.base, [blo, bhi] = primBox(B);
        // (a box's room across about the axis: to its box's nearest side in x and z, or, a section's pilot, the slot its line says)
        const across = wid ? q.lines.find((x) => x.port.endsWith('/axis') && alongY(x))!.slot + 1e-9 : B.k === 'hex' ? B.af / 2 : boxy(B) && !(B.k === 'box' && B.tray) ? Math.min(cx - blo[0], bhi[0] - cx, cz - blo[2], bhi[2] - cz) : B.k === 'bend' || boxy(B) ? 0 : B.r;
        if (q.bought) throw new Error(`over: the ${q.name} is bought and has no bore to slide on with: pass the ${o.p.name} through its own axis by room.through, or a sleeve with a bore`);
        if (!(B.k === 'cyl' || B.k === 'hex' || B.k === 'sphere' || B.k === 'lathe' || (B.k === 'box' && !B.tray))) throw new Error(`over: the ${q.name} (a ${B.k}) has no bore to slide on with: make it round with a bore (room.make tube, or a lathe with a bore), or pass the ${o.p.name} through it by room.through`);
        if (!(bore < across - 1e-12)) throw new Error(`no room over ${port}: the ${q.name} is ${(across * 2000).toFixed(2)} mm across, no wider than the ${o.p.name} and the fit (${(bore * 2000).toFixed(2)} mm): it cannot be bored to it`);
        (wid ? opened : bored).push(q.name);
        // (a box: its bore a rod of the bore's radius taken out of it along y, through its whole box)
        if (B.k === 'box') return { ...q, solid: { base: B, minus: [...q.solid.minus, { k: 'cyl', c: [cx, (blo[1] + bhi[1]) / 2, cz], r: bore, h: bhi[1] - blo[1] + 2e-9 }] } };
        if (B.k === 'lathe') { const pts = clipOut(B.pts.map((p) => [p[0], p[1]] as [number, number]), bore); if (pts.length < 3) throw new Error(`over: the ${q.name} bored to ${(bore * 2000).toFixed(2)} mm has nothing left`); return { ...q, solid: { ...q.solid, base: { ...B, pts, ri: bore } } }; }
        return { ...q, solid: { ...q.solid, base: { ...B, ri: bore } } }; });
      const said = [...(bored.length ? [`over bored the ${bored.join(', ')} to the ${o.p.name} (Ø${(bore * 2000).toFixed(2)} mm, the ${fit} fit): it had no bore`] : []), ...(opened.length ? [`over opened the ${opened.join(', ')}'s bore to the ${o.p.name} (Ø${(bore * 2000).toFixed(2)} mm, the ${fit} fit)`] : [])].join('; ');
      const S0 = Block.#seal(sleeve.name, pieces, [...sleeve.faces], [...sleeve.rooms]); if (MADE.has(sleeve)) MADE.set(S0, MADE.get(sleeve)!);
      return noted(Block.over(host, port, S0, where, fit), said); }
    const threaded = (i: number) => !!sleeve.pieces[i]!.tapped && Math.abs(free[i]! - rs) < 1e-9;
    const bore = Math.min(...free), k0 = free.findIndex((f, i) => f + 1e-12 < rs + (threaded(i) ? 0 : g)), ge = free.every((f, i) => f > bore + 1e-9 || threaded(i)) ? 0 : g, need = rs + g;
    if (k0 >= 0) throw new Error(`no room over ${port}: the ${sleeve.name}'s bore is ${(free[k0]! * 2000).toFixed(2)} mm across; it needs ${(need * 2000).toFixed(2)} mm`);
    const sb = primBox(o.p.solid.base), H = sleeve.hi[1] - sleeve.lo[1], d = typeof where === 'object' ? where.along : 0, end = typeof where === 'object' ? where.from : where;
    if (typeof where === 'object') { if (!(Number.isFinite(d) && d >= 0)) throw new Error(`over: a distance along ${port} is finite and never below zero (${d} m)`); if (where.from !== 'lo' && where.from !== 'hi') throw new Error(`over: a distance from lo or hi (${String(where.from)})`);
      if (d + H > sb[1][1] - sb[0][1] + 1e-12) throw new Error(`no room over ${port}: the ${sleeve.name} ${(d * 1000).toFixed(2)} mm from its ${where.from} end needs ${((d + H) * 1000).toFixed(2)} mm of it; the ${o.p.name} is ${((sb[1][1] - sb[0][1]) * 1000).toFixed(2)} mm long`); }
    const y0 = end === 'lo' ? sb[0][1] + d : end === 'hi' ? sb[1][1] - H - d : (sb[0][1] + sb[1][1]) / 2 - H / 2;
    // (a round piece on the same line that fits within the bore with the gap (the shaft a core sits on) passes inside it;
    // any other piece of the host is tried by its solid against the sleeve's (root 1, decision 0029: a rim over a ring
    // of spokes its bore clears, a wheel between a fork's legs; before, by their bounds, both were refused))
    const inBore = (q: Piece) => { const qs = sweepOf(q); return roundish(qs) && upright(qs) && !q.joint && Math.hypot(qs.c[0] - o.l.x, qs.c[2] - o.l.z) < 1e-12 && qs.r + ge <= bore + 1e-12; };
    const others = host.pieces.filter((q) => q !== o.p && !inBore(q));
    const at = (y: number) => Block.#shift(sleeve, [o.l.x - cx, y - sleeve.lo[1], o.l.z - cz]), hitOf = (S: { pieces: Piece[] }) => { for (const q of others) if (S.pieces.some((x) => solidsMeet(q, x))) return q; return undefined; };
    let S = at(y0), hit = hitOf(S);
    // (where that is in the way (a washer already slid on, the can a motor's shaft comes out of), slid along the line to the
    // nearest stretch that is free: on past what was slid on before it, each after the last, or out past the line's free
    // end, as a person slides it on; still on the line by half its length or the piece's, whichever is less)
    if (hit) { const L = sb[1][1] - sb[0][1], grip = Math.min(H, L) / 2 - 1e-12, cand = new Set<number>();
      for (const q of others) { const qb = boundOf(q); cand.add(qb[1][1]); cand.add(qb[0][1] - H); }
      const best = [...cand].filter((y) => Math.min(y + H, sb[1][1]) - Math.max(y, sb[0][1]) >= grip).sort((u, v) => Math.abs(u - y0) - Math.abs(v - y0)).find((y) => !hitOf(at(y)));
      if (best === undefined) throw new Error(`no room over ${port}: the ${sleeve.name} would meet the ${hit.name}`);
      S = at(best); hit = undefined; }
    const n = host.pieces.length, faces: Face[] = [...host.faces, ...S.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n }))];
    S.pieces.forEach((q, i) => { const qb = primBox(q.solid.base), lo = Math.max(qb[0][1], sb[0][1]), hi = Math.min(qb[1][1], sb[1][1]);
      // (a face only for a piece round about the line: a bearing's inner ring on the shaft, not its balls beside it)
      // (root 3: and a section or a box round the line, its bore read from its solid: a sprocket, a gear, a plate)
      const B = q.solid.base; if (hi > lo && ((roundish(B) && upright(B) && Math.hypot(B.c[0] - o.l.x, B.c[2] - o.l.z) < 1e-9) || (boxy(B) && !q.joint && roundAbout(q, o.l.x, o.l.z)))) faces.push({ a: o.k, b: n + i, kind: ge > 0 ? 'gap' : 'contact', patch: 'area', area: 2 * Math.PI * rs * (hi - lo), at: [o.l.x, (lo + hi) / 2, o.l.z], normal: [1, 0, 0], gap: ge, ...(ge > 0 ? { fit, medium: MEDIUM } : {}), by: `${sleeve.name} over ${port}` }); });
    return Block.#seal(host.name, [...host.pieces, ...S.pieces], faces, [...host.rooms]);
  }
  /** Two spur gears meshed (the user, 2026-11-06: a loose gear on a rod, a second meshing it): the gear block put beside
   *  the host's gear, toward its +x, −x, +y or −y, their axes parallel at m (z₁ + z₂) / 2 and the fit's gap (the backlash
   *  it leaves, 2 Δa tan 20°), its face level with the host's, and turned about its own axis so its teeth stand in the
   *  host's gaps (the arc of each tooth from the line of centres on its pitch circle, r₁ u₁ + r₂ u₂ = p / 2, held as they
   *  roll). Their teeth then cannot meet by construction: involute flanks at more than their working distance, each tip
   *  outside the other's base circle (refused, with both numbers, where a tip would reach the drawn radial flank below it)
   *  and its root (a clearance of a quarter module). Both gears ISO 53's (as piece.gear draws them), standing as made or
   *  turned about their axes only, neither on a joint; every other pair kept apart by its bounds, or refused by name. */
  static mesh(host: Block, port: string, gear: Block, gport: string, toward: '+x' | '-x' | '+y' | '-y' = '+x', fit: Fit = 'slide'): Block {
    Block.#is(host); Block.#is(gear); if (!(fit in FITS)) throw new Error('mesh: a fit by name');
    const g = gapOf(fit); if (!(g > 0)) throw new Error(`mesh: gears mesh with backlash: a fit with a gap (slide or clear), not ${fit}`);
    const find = (b: Block, p: string) => { const k = b.pieces.findIndex((q) => q.lines.some((l) => l.port === p)); if (k < 0) throw new Error(`mesh: ${b.name} offers no line ${p} (it offers ${offered(b)})`);
      const G = gearOf(b.pieces[k]!); if (!G) throw new Error(`mesh: the ${b.pieces[k]!.name} is no spur gear of ISO 53's rack standing as made (its teeth a section along its axis, turned about it only): refused`);
      if (b.pieces[k]!.joint) throw new Error(`mesh: the ${b.pieces[k]!.name} is on a joint (${b.pieces[k]!.joint!.name}): refused`); return { k, ...G }; };
    const A = find(host, port), B = find(gear, gport);
    if (Math.abs(A.m - B.m) > 1e-9) throw new Error(`mesh: a gear meshes only with one of its own module (m${+(A.m * 1000).toPrecision(4)} and m${+(B.m * 1000).toPrecision(4)})`);
    const beta = { '+x': 0, '+y': Math.PI / 2, '-x': Math.PI, '-y': -Math.PI / 2 }[toward]; if (beta === undefined) throw new Error(`mesh: toward +x, -x, +y or -y (${String(toward)})`);
    const t: V3 = [Math.round(Math.cos(beta)), Math.round(Math.sin(beta)), 0], rA = (A.m * A.z) / 2, rB = (B.m * B.z) / 2, a = rA + rB + g, cos20 = Math.cos(Math.PI / 9);
    for (const [P, Q, r] of [[A, B, rA], [B, A, rB]] as const) if (a - Q.ra < r * cos20 - 1e-12) throw new Error(`no room for the mesh: the m${+(Q.m * 1000).toPrecision(4)} z${Q.z}'s tips reach ${((a - Q.ra) * 1000).toFixed(2)} mm from the m${+(P.m * 1000).toPrecision(4)} z${P.z}'s axis, inside its base circle (${(r * cos20 * 1000).toFixed(2)} mm), where its flank is drawn radial: a wider fit, or more teeth`);
    const phi = (Math.PI * A.m / 2 - rA * (A.th - beta)) / rB + beta + Math.PI - B.th, S0 = Block.#turned(gear, turnOf([0, 0, 1], (phi * 180) / Math.PI), B.at, false);
    const S = Block.#shift(S0, [A.at[0] + a * t[0] - B.at[0], A.at[1] + a * t[1] - B.at[1], (A.z0 + A.z1) / 2 - (B.z0 + B.z1) / 2]);
    S.pieces.forEach((q, i) => host.pieces.forEach((s, j) => { if (!(i === B.k && j === A.k) && meets(boundOf(q), boundOf(s))) throw new Error(`no room for the mesh: the ${q.name} would meet the ${s.name}`); }));
    const n = host.pieces.length, w = Math.min(A.z1 - A.z0, B.z1 - B.z0), face: Face = { a: A.k, b: n + B.k, kind: 'gap', patch: 'line', area: 0, length: w, at: [A.at[0] + (rA + g / 2) * t[0], A.at[1] + (rA + g / 2) * t[1], (A.z0 + A.z1) / 2], normal: t, gap: g, medium: MEDIUM, by: `${gear.pieces[B.k]!.name} meshes ${host.pieces[A.k]!.name}` };
    return Block.#seal(host.name, [...host.pieces, ...S.pieces], [...host.faces, ...S.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n })), face], [...host.rooms]);
  }
  /** A rack put against the host's spur gear (decision 0028, motion 2: a rack and pinion): the rack block (piece.rack: ISO
   *  53's basic rack along its x, its teeth up, so wide along z) laid under the gear (toward −y) or over it (+y, turned a
   *  half about z), its pitch line tangent to the gear's pitch circle with the fit's gap (its backlash), its face level
   *  with the gear's, slid along its length so a gap between its teeth stands under the gear's tooth nearest it (by the arc
   *  of that tooth from the line of centres on the pitch circle, as mesh sets a gear); refused where its module is not the
   *  gear's, where its tips would reach inside the gear's base circle (its flank drawn radial there: more teeth or a wider
   *  fit), or where any piece of it would meet any of the host's but the gear. In Move the gear turning moves it by its
   *  pitch radius times its turn. */
  static rack(host: Block, port: string, rack: Block, toward: '-y' | '+y' = '-y', fit: Fit = 'slide'): Block {
    Block.#is(host); Block.#is(rack); if (!(fit in FITS)) throw new Error('rack: a fit by name');
    const g = gapOf(fit); if (!(g > 0)) throw new Error(`rack: a rack meshes with backlash: a fit with a gap (slide or clear), not ${fit}`);
    const k = host.pieces.findIndex((q) => q.lines.some((l) => l.port === port)); if (k < 0) throw new Error(`rack: ${host.name} offers no line ${port} (it offers ${offered(host)})`);
    const A = gearOf(host.pieces[k]!); if (!A) throw new Error(`rack: the ${host.pieces[k]!.name} is no spur gear of ISO 53's rack standing as made: refused`);
    const ri = rack.pieces.findIndex((q) => rackOf(q)); if (ri < 0) throw new Error(`rack: ${rack.name} has no rack (piece.rack: ISO 53's teeth along x, standing as made)`);
    const R0 = rackOf(rack.pieces[ri]!)!; if (Math.abs(R0.m - A.m) > 1e-9) throw new Error(`rack: a rack meshes only a gear of its own module (m${+(A.m * 1000).toPrecision(4)} and m${+(R0.m * 1000).toPrecision(4)})`);
    const rA = (A.m * A.z) / 2, cos20 = Math.cos(Math.PI / 9);
    if (rA + g - A.m < rA * cos20 - 1e-12) throw new Error(`no room for the rack: its tips reach ${((rA + g - A.m) * 1000).toFixed(2)} mm from the m${+(A.m * 1000).toPrecision(4)} z${A.z}'s axis, inside its base circle (${(rA * cos20 * 1000).toFixed(2)} mm), where its flank is drawn radial: a wider fit, or more teeth`);
    const up = toward === '+y', T0 = up ? Block.#turned(rack, turnOf([0, 0, 1], 180), Block.#mid(rack), false) : rack, R = rackOf(T0.pieces[ri]!)!;
    // (the gear's tooth nearest the line of centres, its arc from it on the pitch circle; a gap of the rack's under it)
    const beta = up ? Math.PI / 2 : -Math.PI / 2, pz = (2 * Math.PI) / A.z, d0 = A.th - beta, dl = d0 - Math.round(d0 / pz) * pz, xs = A.at[0] + (up ? -1 : 1) * rA * dl;
    const sx = up ? -1 : 1, gapX = R.lo + sx * Math.round(R.n / 2) * R.p, yPitch = A.at[1] + (up ? 1 : -1) * (rA + g);
    const S = Block.#shift(T0, [xs - gapX, yPitch - R.pitchY, (A.z0 + A.z1) / 2 - R.zc]);
    S.pieces.forEach((q, i) => host.pieces.forEach((s, j) => { if (!(i === ri && j === k) && meets(boundOf(q), boundOf(s))) throw new Error(`no room for the rack: the ${q.name} would meet the ${s.name}`); }));
    const n = host.pieces.length, w = Math.min(A.z1 - A.z0, R.z1 - R.z0), face: Face = { a: k, b: n + ri, kind: 'gap', patch: 'line', area: 0, length: w, at: [A.at[0], A.at[1] + (up ? 1 : -1) * (rA + g / 2), (A.z0 + A.z1) / 2], normal: [0, up ? 1 : -1, 0], gap: g, medium: MEDIUM, by: `${rack.pieces[ri]!.name} meshes ${host.pieces[k]!.name}` };
    return Block.#seal(host.name, [...host.pieces, ...S.pieces], [...host.faces, ...S.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n })), face], [...host.rooms]);
  }
  /** A belt (or a chain, drawn as a cord) laid round two pulleys or sprockets the host has (decision 0028, motion 2): their
   *  axes along z, parallel, on the lines named; the cord's middle at each one's outside plus its own radius and the fit's
   *  gap, level with the middle of each one's teeth, an open belt: two straights tangent to both circles, and round each
   *  the arc between them (π ± 2α, sin α = (ρ₂ − ρ₁) / C). Drawn as a round cord of its section's area (width × thickness),
   *  its teeth not drawn; laid as two runs (each a straight and its arc, the larger arc in two halves) end to end. Refused
   *  where the axes are not along z and parallel, the cord is wider than either one's teeth, they stand too near for a
   *  straight, or the cord would meet any piece of the host but the two and what is on their axes. In Move the two turn
   *  together by their teeth (their outsides where they have none), the same way. */
  static belt(host0: Block, portA: string, portB: string, o: { name?: string; width: number; thick: number; mat?: string; fit?: Fit }, other?: { block: Block; C: number; toward?: '+x' | '-x' | '+y' | '-y' }): Block {
    Block.#is(host0); let host = host0; const fit = o.fit ?? 'clear'; if (!(fit in FITS)) throw new Error('belt: a fit by name'); sizes('belt', [o.width, o.thick]);
    const name = o.name ?? 'belt', g = Math.max(gapOf(fit), 1e-4), rc = Math.sqrt((o.width * o.thick) / Math.PI);
    const wheel = (port: string, host: Block) => { const k = host.pieces.findIndex((q) => q.lines.some((l) => l.port === port)); if (k < 0) throw new Error(`belt: ${host.name} offers no line ${port} (it offers ${offered(host)})`);
      const l = host.pieces[k]!.lines.find((x) => x.port === port)!, d = l.dir ?? [0, 1, 0]; if (!(Math.abs(Math.abs(d[2]) - 1) < 1e-9)) throw new Error(`belt: ${port} is not along z (a belt is laid round pulleys standing as made, their axes along z)`);
      const at: V3 = [l.x, l.y ?? host.pieces[k]!.solid.base.c[1], l.z], on = host.pieces.map((q, i) => i).filter((i) => { const c = host.pieces[i]!.solid.base.c; return Math.hypot(c[0] - at[0], c[1] - at[1]) < 1e-9; });
      // (its teeth: the piece on its axis whose outline has the most points; else the widest round one on it)
      const sects = on.filter((i) => { const B = host.pieces[i]!.solid.base; return B.k === 'box' && !!B.sect && (!B.frame || Math.abs(B.frame[8] - 1) < 1e-9); });
      const sectLen = (P: Prim) => (P.k === "box" && P.sect ? P.sect.length : 0);
      const t = sects.length ? sects.sort((a, b) => (sectLen(host.pieces[b]!.solid.base) - sectLen(host.pieces[a]!.solid.base)))[0]! : on.sort((a, b) => halfOf(host.pieces[b]!.solid.base)[0] - halfOf(host.pieces[a]!.solid.base)[0])[0];
      if (t === undefined) throw new Error(`belt: nothing round on ${port}`);
      const B = host.pieces[t]!.solid.base, [lo, hi] = primBox(B), Ro = B.k === 'box' && B.sect ? Math.max(...B.sect.map(([x, y]) => Math.hypot(x + B.c[0] - at[0], y + B.c[1] - at[1]))) : halfOf(B)[0];
      if (2 * rc > hi[2] - lo[2] + 1e-12) throw new Error(`belt: the ${name} (${(2 * rc * 1000).toFixed(2)} mm across, drawn round) is wider than the ${host.pieces[t]!.name}'s teeth (${((hi[2] - lo[2]) * 1000).toFixed(2)} mm)`);
      return { k: t, at, on, rho: Ro + g + rc, zc: (lo[2] + hi[2]) / 2 }; };
    // (with another block: it is put first, its pulley's axis the centre distance C from the first's toward +x, −x, +y or −y,
    // its teeth level with the first's; refused where any of its pieces would meet the host's)
    if (other) { Block.#is(other.block); sizes('belt', [other.C]); const a0 = wheel(portA, host), b0 = wheel(portB, other.block), t = { '+x': [1, 0], '-x': [-1, 0], '+y': [0, 1], '-y': [0, -1] }[other.toward ?? '+x'];
      if (!t) throw new Error(`belt: toward +x, -x, +y or -y (${String(other.toward)})`);
      const S = Block.#shift(other.block, [a0.at[0] + other.C * t[0]! - b0.at[0], a0.at[1] + other.C * t[1]! - b0.at[1], a0.zc - b0.zc]);
      S.pieces.forEach((q) => host.pieces.forEach((s) => { if (meets(boundOf(q), boundOf(s))) throw new Error(`no room for the second pulley: the ${q.name} would meet the ${s.name} (a longer centre distance)`); }));
      const n0 = host.pieces.length; host = Block.#seal(host.name, [...host.pieces, ...S.pieces], [...host.faces, ...S.faces.map((f) => ({ ...f, a: f.a + n0, b: f.b + n0 }))], [...host.rooms]); }
    const A = wheel(portA, host), B = wheel(portB, host), dx = B.at[0] - A.at[0], dy = B.at[1] - A.at[1], C = Math.hypot(dx, dy);
    if (Math.abs(A.zc - B.zc) > 1e-9) throw new Error(`belt: the two stand at different heights along z (${(A.zc * 1000).toFixed(2)} and ${(B.zc * 1000).toFixed(2)} mm): their teeth level, for a belt`);
    if (!(C > A.rho + B.rho + 2 * rc)) throw new Error(`no room for the ${name}: the two are ${(C * 1000).toFixed(2)} mm apart, it needs more than ${((A.rho + B.rho + 2 * rc) * 1000).toFixed(2)} mm for its straights`);
    const al = Math.asin((B.rho - A.rho) / C), th = Math.atan2(dy, dx), L = C * Math.cos(al), deg = (r: number) => (r * 180) / Math.PI, tube = { name, mat: o.mat ?? 'nbr', ro: rc, color: 0x2a2a2a };
    // (each run laid at the origin heading +y, bending toward its +x; then turned so its +y is its heading, its +x the side it bends to, and set at its start)
    const lay = (segs: RunSeg[], h: number, at: V3) => { const ex: V3 = [Math.sin(h), -Math.cos(h), 0], ey: V3 = [Math.cos(h), Math.sin(h), 0], M: M3 = [ex[0], ey[0], 0, ex[1], ey[1], 0, 0, 0, 1];
      return Block.#shift(Block.#turned(Block.run(name, segs), M, [0, 0, 0], false), at); };
    const n1 = th + Math.PI / 2 + al, n2 = th - Math.PI / 2 - al, P = (c: V3, r: number, a: number): V3 => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), A.zc];
    const top = lay([{ ...tube, straight: L }, { ...tube, bend: deg(Math.PI / 2 + al), R: B.rho }, { ...tube, bend: deg(Math.PI / 2 + al), R: B.rho }], th + al, P(A.at, A.rho, n1));
    const bot = lay([{ ...tube, straight: L }, { ...tube, bend: deg(Math.PI / 2 - al), R: A.rho }, { ...tube, bend: deg(Math.PI / 2 - al), R: A.rho }], th + Math.PI - al, P(B.at, B.rho, n2));
    const n = host.pieces.length, m = top.pieces.length, cord = [...top.pieces, ...bot.pieces], skip = new Set([...A.on, ...B.on]);
    cord.forEach((q) => host.pieces.forEach((s, j) => { if (!skip.has(j) && meets(boundOf(q), boundOf(s))) throw new Error(`no room for the ${name}: it would meet the ${s.name}`); }));
    const end = (a: number, b: number, at: V3): Face => ({ a, b, kind: 'contact', patch: 'area', area: Math.PI * rc * rc, at, normal: [1, 0, 0], gap: 0, by: `${name}: end to end` });
    const lap = (w: typeof A, k: number): Face => ({ a: w.k, b: k, kind: 'gap', patch: 'line', area: 0, length: 2 * rc, at: [w.at[0], w.at[1] + w.rho - rc, w.zc], normal: [0, 1, 0], gap: g, medium: MEDIUM, by: `${name} laid round ${host.pieces[w.k]!.name}` });
    const faces: Face[] = [...host.faces, ...top.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n })), ...bot.faces.map((f) => ({ ...f, a: f.a + n + m, b: f.b + n + m })),
      end(n + m - 1, n + m, P(B.at, B.rho, n2)), end(n + cord.length - 1, n, P(A.at, A.rho, n1)), lap(B, n + 1), lap(A, n + cord.length - 1)];
    return Block.#seal(host.name, [...host.pieces, ...cord], faces, [...host.rooms]);
  }
  /** n copies round the y axis at radius R: refused, naming the two copies and their pieces, the fit's gap and the pitch,
   *  where any two copies' solids (their sweeps on a joint) come within the fit's gap of each other (root 1: the solids,
   *  not a disc of each copy's reach, so radial blades, two long skids and two rows of studs stand). Its copies stand
   *  apart: the fit leaves a gap. With `out`, each copy is turned about the upright line through its own middle by its
   *  angle round the ring, so its own +x faces out (fan blades, spokes, vanes). Its axis is offered as a line, its slot
   *  the room the copies' solids leave round it (freeAbout). */
  static ring(name: string, b: Block, n: number, R: number, fit: Fit = 'clear', out = false): Block {
    Block.#is(b); sizes(name, [n, R]); if (!Number.isInteger(n) || n < 2) throw new Error(`${name}: a ring of two or more`); const g = gapOf(fit); if (!(g > 0)) throw new Error(`${name}: a ring's copies stand apart: a fit with a gap`);
    // (root 6: a ring keeps FITS' one gap, not the band at its copy's size: ringClash reads the solids down sampled columns
    // (root 1), and a gap of microns is finer than their spacing: sixteen blades whose roots overlap (by microns, worked by
    // hand) were let in at the sized gap, the test's 'sixteen at 60 mm: no room')
    const cx = (b.lo[0] + b.hi[0]) / 2, cz = (b.lo[2] + b.hi[2]) / 2, half = R * Math.sin(Math.PI / n);
    const j = out ? b.pieces.find((p) => p.joint) : undefined; if (j) throw new Error(`${name}: the ${j.name} is on a joint (${j.joint!.name}): copies turned to face out are not made on a joint yet`);
    const pieces: Piece[] = [], faces: Face[] = [], M: P3 = [cx, (b.lo[1] + b.hi[1]) / 2, cz];
    const copies = Array.from({ length: n }, (_, i) => { const a = (2 * Math.PI * i) / n, t = out && i ? Block.#turned(b, turnOf(1, (-360 * i) / n), M, false) : b; return Block.#shift(t, [R * Math.cos(a) - cx, 0, R * Math.sin(a) - cz]); });
    // (root 1, the rest (decision 0029): each copy's sweep against the others' by their solids, the one grown by the fit's
    // gap (ringClash), not a disc of its reach round its middle against the pitch: three radial blades, two long skids a
    // vehicle's width apart and two rows of studs stand apart; two copies that meet are refused by name)
    const clash = ringClash(copies.map((s) => s.pieces), g, out);
    if (clash) throw new Error(`no room in ${name}: copy ${clash.i + 1}'s ${clash.p} meets copy ${clash.k + 1}'s ${clash.q} with the ${fit} fit's ${(g * 1000).toFixed(2)} mm gap round it; the pitch at ${(R * 1000).toFixed(2)} mm gives ${(2 * half * 1000).toFixed(2)} mm`);
    for (const s of copies) { const k = pieces.length; pieces.push(...s.pieces.map((p) => (p.joint ? { ...p, joint: p.joint } : p))); faces.push(...s.faces.map((f) => ({ ...f, a: f.a + k, b: f.b + k }))); }
    // (the ring's own axis, offered as a line on its first piece (decision 0028): a ring of an odd number has no middle a
    // stack can centre on, so a stack aligned on this line puts a hub on the ring's axis; its slot the room the copies'
    // solids leave free round it (freeAboutAxis, root 1: not their bounds' corners, so a hub through three blades' roots fits))
    const slot = Math.min(...pieces.map(freeAboutAxis));
    if (slot > 0) pieces[0] = { ...pieces[0]!, lines: [...pieces[0]!.lines, { port: `${name}/axis`, x: 0, z: 0, slot }] };
    return Block.#seal(name, pieces, faces);
  }

  /** A run of tube laid with no coordinates: segments in order, each starting where the last one ended, in the last
   *  one's frame (its heading, and its own x and z, which turn with it): a straight so long, or a bend through so many
   *  degrees (more than 0, at most 180) round a bend radius, toward the frame's +x (`toward` 0), +z (90), −x (180) or −z
   *  (270), or any angle between. Two bends toward +x turn the same way; +x then −x make an offset. A straight may carry
   *  a sleeve round it (a fitting's socket) from one length along it to another, its bore at least the tube's outside.
   *  Each segment lies between its start's plane and its end's (a bend of at most a half turn too), so two that follow
   *  one another meet only on the plane they share; two that do not are kept apart by their bounds (comparison (3)):
   *  where those meet, the path runs into itself and it is refused with both. A bend radius not above its tube's outside
   *  radius is refused (the tube would cross itself). Faces: each pair of rings that meet end to end, and round each
   *  sleeve. Each straight offers its axis (`<its name>/axis`, a turned line), for a coupling to slide over. */
  static run(name: string, segs: readonly RunSeg[]): Block {
    if (!segs.length) throw new Error(`${name}: a run of one segment or more`);
    let F: M3 = I3, S: V3 = [0, 0, 0], last: { k: number; ri: number; ro: number }[] = [];
    const pieces: Piece[] = [], faces: Face[] = [], groups: number[][] = [];
    segs.forEach((s, i) => {
      const tag = `${name}, segment ${i + 1} (${s.name})`, ri = s.ri ?? 0, g: number[] = [], here: { k: number; ri: number; ro: number }[] = [], next: { k: number; ri: number; ro: number }[] = [];
      sizes(tag, [s.ro, ...(s.ri !== undefined ? [s.ri] : [])]); if (!(ri < s.ro)) throw new Error(`${tag}: a bore within its outside (${(ri * 1000).toFixed(2)} ≥ ${(s.ro * 1000).toFixed(2)} mm)`);
      const put = (pr: Prim, t: RunTube, lines: Line[] = []) => { pieces.push({ name: t.name, mat: t.mat, ...(t.color !== undefined ? { color: t.color } : {}), solid: { base: pr, minus: [] }, lines }); g.push(pieces.length - 1); return pieces.length - 1; };
      const fr = snap(F), heading = mv(F, [0, 1, 0]), hollow = s.ri !== undefined ? { ri: s.ri } : {};
      if ('straight' in s) {
        const L = s.straight; sizes(tag, [L]); const c = add(S, mv(F, [0, L / 2, 0])), d = snapDir(heading);
        const axis: Line = d[0] === 0 && d[2] === 0 && d[1] === 1 ? { port: `${s.name}/axis`, x: c[0], z: c[2], slot: s.ro } : { port: `${s.name}/axis`, x: c[0], y: c[1], z: c[2], slot: s.ro, dir: d };
        const k = put({ k: 'cyl', c, r: s.ro, h: L, ...hollow, ...(fr ? { frame: fr } : {}) }, s, [axis]);
        here.push({ k, ri, ro: s.ro }); next.push({ k, ri, ro: s.ro });
        // (its sleeves, in order along it, none over another)
        const vs = [...(s.sleeves ?? [])].sort((a, b) => a.from - b.from); vs.forEach((v, n) => { if (n && v.from < vs[n - 1]!.to - 1e-12) throw new Error(`${tag}: its sleeves ${vs[n - 1]!.name} and ${v.name} would lie one over the other`); });
        for (const v of vs) { const vt = `${tag}, its sleeve ${v.name}`; sizes(vt, [v.ro, ...(v.ri !== undefined ? [v.ri] : [])]);
          if (!(v.from >= 0 && v.to <= L + 1e-12 && v.to > v.from)) throw new Error(`${vt}: from ${(v.from * 1000).toFixed(2)} to ${(v.to * 1000).toFixed(2)} mm, within its straight's ${(L * 1000).toFixed(2)} mm`);
          if (!(v.ri !== undefined && v.ri + 1e-12 >= s.ro && v.ri < v.ro)) throw new Error(`no room round ${tag}: its sleeve's bore is ${((v.ri ?? 0) * 2000).toFixed(2)} mm across; it needs ${(s.ro * 2000).toFixed(2)} mm`);
          const vc = add(S, mv(F, [0, (v.from + v.to) / 2, 0])), q = put({ k: 'cyl', c: vc, r: v.ro, ri: v.ri, h: v.to - v.from, ...(fr ? { frame: fr } : {}) }, v), gap = Math.max(0, v.ri - s.ro);
          faces.push({ a: k, b: q, kind: gap > 1e-12 ? 'gap' : 'contact', patch: 'area', area: 2 * Math.PI * s.ro * (v.to - v.from), at: vc, normal: snapDir(mv(F, [1, 0, 0])), gap, ...(gap > 1e-12 ? { medium: MEDIUM } : {}), by: `${v.name} round ${s.name}` });
          if (v.from < 1e-12) here.push({ k: q, ri: v.ri, ro: v.ro }); if (v.to > L - 1e-12) next.push({ k: q, ri: v.ri, ro: v.ro }); }
        S = add(S, mv(F, [0, L, 0]));
      } else {
        if (!(Number.isFinite(s.bend) && s.bend > 0 && s.bend <= 180)) throw new Error(`${tag}: a bend of more than 0° and at most 180° (${s.bend}°)`);
        sizes(tag, [s.R]); if (!(s.R > s.ro)) throw new Error(`${tag}: its bend radius ${(s.R * 1000).toFixed(2)} mm is not above its tube's outside radius ${(s.ro * 1000).toFixed(2)} mm: the tube would cross itself`);
        // (its own frame G: the run's turned about its heading so the bend's −x is toward where it turns; the centre it is
        // bent round a bend radius from where it starts; the frame after it turned with it about that centre's axis)
        const roll = turnOf(1, 180 - (s.toward ?? 0)), G = mul(F, roll), a = (s.bend * Math.PI) / 180, sh = { R: s.R, ro: s.ro, a, ...hollow };
        const O = sub(S, mv(G, [s.R, 0, 0])), Rz = turnOf(2, s.bend), gf = snap(G), k = put({ k: 'bend', c: add(O, mv(G, bendMid(sh))), ...sh, ...(gf ? { frame: gf } : {}) }, s);
        here.push({ k, ri, ro: s.ro }); next.push({ k, ri, ro: s.ro });
        S = add(O, mv(G, [s.R * Rz[0], s.R * Rz[3], 0])); F = mul(mul(G, Rz), tr(roll));
      }
      // (where it meets the last: each ring there against each of its own that starts there, their overlap)
      for (const p of last) for (const q of here) { const lo = Math.max(p.ri, q.ri), hi = Math.min(p.ro, q.ro);
        if (hi > lo + 1e-12) faces.push({ a: p.k, b: q.k, kind: 'contact', patch: 'area', area: Math.PI * (hi * hi - lo * lo), at: startOf(pieces[q.k]!.solid.base), normal: snapDir(heading), gap: 0, by: `${name}: end to end` }); }
      groups.push(g); last = next;
    });
    // (two segments that do not follow one another: their bounds may not meet)
    const bound = (g: number[]): [V3, V3] => { const bs = g.map((k) => boundOf(pieces[k]!)); return [[0, 1, 2].map((k) => Math.min(...bs.map((b) => b[0][k]!))) as V3, [0, 1, 2].map((k) => Math.max(...bs.map((b) => b[1][k]!))) as V3]; };
    const bs = groups.map(bound), mmOf = (b: [V3, V3]) => `x ${(b[0][0] * 1000).toFixed(1)}…${(b[1][0] * 1000).toFixed(1)}, y ${(b[0][1] * 1000).toFixed(1)}…${(b[1][1] * 1000).toFixed(1)}, z ${(b[0][2] * 1000).toFixed(1)}…${(b[1][2] * 1000).toFixed(1)} mm`;
    for (let i = 0; i < bs.length; i++) for (let j = i + 2; j < bs.length; j++) if (meets(bs[i]!, bs[j]!))
      throw new Error(`${name}: segments ${i + 1} (${segs[i]!.name}) and ${j + 1} (${segs[j]!.name}) do not follow one another and their bounds meet (${mmOf(bs[i]!)} against ${mmOf(bs[j]!)}): the path runs into itself`);
    return Block.#seal(name, pieces, faces);
  }

  /** A branch joined into the side of a straight tube (a tee's): the branch (a block whose first piece is a hollow
   *  straight, a run) turned so its first straight heads square off the straight's heading, toward the straight's own +x
   *  (0), +z (90), −x (180) or −z (270), and its start set on the straight's axis at its middle. Where they meet, the
   *  straight's wall is opened by the branch's bore (a rod of the bore's radius from the axis out, taken out of it) and
   *  the branch's first straight has the straight's outside taken out of it (its end the saddle on the straight's side):
   *  with S the straight's outside and H the rod, (B − S) ∩ (A − H) ⊆ (B − S) ∩ S = ∅, as A ⊆ S. Refused: either not a
   *  hollow straight, or moving; the branch as wide as half the straight or more (it would reach past its ends); its first
   *  straight no longer than the straight's outside radius; any other piece of it whose bound meets one of the host's
   *  (comparison (3)). A face where they meet, its area the ring's (its projection). (decision 0024) */
  static branch(host: Block, port: string, b: Block, toward = 0): Block {
    Block.#is(host); Block.#is(b); if (!Number.isFinite(toward)) throw new Error(`branch: a way round it in degrees (${toward})`);
    const nm = namedIn(host, port, 'line', 'branch'); if (nm.port !== port) return noted(Block.branch(host, nm.port, b, toward), nm.note);
    const k = host.pieces.findIndex((p) => p.lines.some((l) => l.port === port)), o = host.pieces[k]; if (!o) throw new Error(`branch: ${host.name} offers no line ${port} (it offers ${offered(host)})`);
    const A = o.solid.base, B0 = b.pieces[0]?.solid.base;
    if (A.k !== 'cyl' || A.ri === undefined || o.joint) throw new Error(`branch: the ${o.name} is not a hollow straight, off any joint`);
    if (!B0 || B0.k !== 'cyl' || B0.ri === undefined || b.pieces.some((p) => p.joint)) throw new Error(`branch: the ${b.name} does not start with a hollow straight, or moves`);
    if (!(B0.r < A.h / 2)) throw new Error(`branch: the ${b.name} is ${(B0.r * 2000).toFixed(2)} mm across; the ${o.name} is ${(A.h * 1000).toFixed(2)} mm long: it would reach past its ends`);
    if (!(B0.h > A.r)) throw new Error(`branch: the ${b.pieces[0]!.name} is ${(B0.h * 1000).toFixed(2)} mm long; it must reach past the ${o.name}'s outside, ${(A.r * 1000).toFixed(2)} mm from its axis`);
    const F = A.frame ?? I3, t = ((toward % 360) + 360) % 360, q = t / 90, [cs, sn] = Number.isInteger(q) ? ([[1, 0], [0, 1], [-1, 0], [0, -1]] as const)[q]! : [Math.cos((t * Math.PI) / 180), Math.sin((t * Math.PI) / 180)];
    const u = snapDir(add(mv(F, [cs, 0, 0]), mv(F, [0, 0, sn]))), e = endsOf(B0), R = mul(tr(toY(u)), toY(e.startDir));
    const moved = Block.#shift(Block.#turned(b, R, e.start, false), sub(A.c, e.start)), up = snap(tr(toY(u))), len = A.r + 1e-9;
    const hole: Prim = { k: 'cyl', c: add(A.c, [u[0] * len / 2, u[1] * len / 2, u[2] * len / 2]), r: B0.ri, h: len, ...(up ? { frame: up } : {}) };
    const outside: Prim = { k: 'cyl', c: A.c, r: A.r, h: A.h, ...(A.frame ? { frame: A.frame } : {}) };
    const pieces = host.pieces.map((p, i) => (i === k ? { ...p, solid: { base: p.solid.base, minus: [...p.solid.minus, hole] } } : p));
    const added = moved.pieces.map((p, i) => (i === 0 ? { ...p, solid: { base: p.solid.base, minus: [...p.solid.minus, outside] } } : p));
    for (const [i, p] of added.entries()) for (const [j, h] of pieces.entries()) if (!(i === 0 && j === k) && meets(boundOf(p), boundOf(h))) throw new Error(`branch: the ${p.name} would meet the ${h.name} (their bounds meet)`);
    const n = pieces.length, faces: Face[] = [...host.faces, ...moved.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n })),
      { a: k, b: n, kind: 'contact', patch: 'area', area: Math.PI * (B0.r * B0.r - B0.ri * B0.ri), at: add(A.c, [u[0] * A.r, u[1] * A.r, u[2] * A.r]), normal: u, gap: 0, by: `${b.name} into the side of ${o.name}` }];
    return Block.#seal(host.name, [...pieces, ...added], faces, host.rooms.filter((r) => !added.some((p) => meets(boundOf(p), primBox({ k: 'cyl', c: r.c, r: r.r, h: r.h })))));
  }

  // ---- decision 0029: the roots the builders of the last round built round, each a rule ---------------------------------
  /** A straight member laid from one named point of the block to another (decision 0029 (1): a brace between two posts'
   *  holes, a guy from a lug to an anchor, a diagonal, a tie rod): the member (made upright, along y) turned so its axis
   *  runs from the first point to the second and set with its middle at the middle between them; the room it takes, grown
   *  by the fit's gap, cut from every piece of the block it crosses (as Through cuts), so it passes through what it meets,
   *  never into it; a bought piece in its way, or any piece on a joint, refused by name. A face on each piece it crosses,
   *  its area the member's section (rough). The member's length is its own: the node makes it to the span less a hold-back
   *  at each end; given longer it sticks out past the points, shorter it floats between them. */
  static between(host: Block, a: { port: string; i?: number }, c: { port: string; i?: number }, member: Block, fit: Fit = 'tight'): Block {
    Block.#is(host); Block.#is(member); if (!(fit in FITS)) throw new Error('between: a fit by name');
    const A = pointOf(host, a, 'between'), B = pointOf(host, c, 'between'), d = sub(B.p, A.p), L = Math.hypot(d[0], d[1], d[2]);
    if (!(L > 1e-9)) throw new Error(`between: ${A.port} and ${B.port} are at one point: nothing to lay between them`);
    const j = [...host.pieces, ...member.pieces].find((p) => p.joint); if (j) throw new Error(`between: the ${j.name} is on a joint (${j.joint!.name}): a member between points is not made on a joint yet`);
    const u: V3 = [d[0] / L, d[1] / L, d[2] / L], T = Block.#turned(member, tr(toY(u)), Block.#mid(member), false), M = Block.#shift(T, sub([(A.p[0] + B.p[0]) / 2, (A.p[1] + B.p[1]) / 2, (A.p[2] + B.p[2]) / 2], Block.#mid(T)));
    const g = gapOf(fit), mb = M.pieces.map(boundOf), all: [V3, V3] = [[0, 1, 2].map((k) => Math.min(...mb.map((x) => x[0][k]!))) as V3, [0, 1, 2].map((k) => Math.max(...mb.map((x) => x[1][k]!))) as V3];
    // (root 1, the rest (decision 0029): what the member meets read by the solids (cutMeets): a piece is cut, or refused
    // as bought, only where the member's room would take material from it, not wherever their bounds meet; its faces are
    // still written where the bounds meet (rough: a member in a hole wider than it touches nothing, and is still held))
    const pieces = host.pieces.map((s): Piece => { const hit = M.pieces.filter((q, k) => meets(boundOf(s), mb[k]!) && cutMeets(grownBy(q.solid.base, g), s)); if (!hit.length) return s;
      if (s.bought) throw new Error(`between: the ${s.name} is bought and lies on the way from ${A.port} to ${B.port}: refused (never cut)`);
      return { ...s, solid: { base: s.solid.base, minus: [...s.solid.minus, ...hit.map((q) => grownBy(q.solid.base, g))] } }; });
    const n = pieces.length, faces: Face[] = [...host.faces, ...M.faces.map((f) => ({ ...f, a: f.a + n, b: f.b + n }))];
    M.pieces.forEach((q, k) => host.pieces.forEach((s, j) => { const sb = boundOf(s), qb = mb[k]!; if (!meets(sb, qb)) return;
      const at = [0, 1, 2].map((i) => (Math.max(sb[0][i]!, qb[0][i]!) + Math.min(sb[1][i]!, qb[1][i]!)) / 2) as V3;
      faces.push({ a: j, b: n + k, kind: g > 0 ? 'gap' : 'contact', patch: 'area', area: sectionArea(q.solid.base), at, normal: u, gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), by: `${q.name} from ${A.port} to ${B.port}` }); }));
    const out = Block.#seal(host.name, [...pieces, ...M.pieces], faces, host.rooms.filter((r) => !meets(primBox({ k: 'cyl', c: r.c, r: r.r, h: r.h }), all)));
    return noted(out, [A.note, B.note].filter(Boolean).join('; ') || undefined);
  }
  /** Copies of a block set along the line from one named point of the host to another (decision 0029 (3): treads up a
   *  stringer, rungs up a rail, pickets along a slope): n of them, their middles on that line, evenly from the first point
   *  to the second (`ends` on) or each in the middle of its own step (`ends` between); each as made, not turned; the room
   *  each takes, grown by the fit's gap, cut from every piece of the host it crosses (a tread housed in its stringer), never
   *  a bought one (refused by name), nothing on a joint; the copies kept apart by their solids (root 1), else refused with
   *  the step and the copy's size along the line. A face on each piece a copy's bound meets, its area the copy's footprint
   *  (rough). */
  static along(host: Block, a: { port: string; i?: number }, c: { port: string; i?: number }, block: Block, n: number, fit: Fit = 'tight', ends: 'on' | 'between' = 'on'): Block {
    Block.#is(host); Block.#is(block); if (!(fit in FITS)) throw new Error('along: a fit by name');
    if (!Number.isInteger(n) || n < 1) throw new Error(`along: a whole number of copies, one or more (${n})`); if (ends === 'on' && n < 2) throw new Error('along: two copies or more from end to end (one: ends between)');
    if (ends !== 'on' && ends !== 'between') throw new Error(`along: ends on (the first at the first point, the last at the second) or between (each in its own step), not ${String(ends)}`);
    const A = pointOf(host, a, 'along'), B = pointOf(host, c, 'along'), d = sub(B.p, A.p), L = Math.hypot(d[0], d[1], d[2]);
    if (!(L > 1e-9)) throw new Error(`along: ${A.port} and ${B.port} are at one point: no line to lay copies along`);
    const j = [...host.pieces, ...block.pieces].find((p) => p.joint); if (j) throw new Error(`along: the ${j.name} is on a joint (${j.joint!.name}): copies along a line are not made on a joint yet`);
    const g = gapOf(fit), mid0 = Block.#mid(block), step = L / (ends === 'on' ? n - 1 : n), u: V3 = [d[0] / L, d[1] / L, d[2] / L];
    const copies = Array.from({ length: n }, (_, i) => { const t = ends === 'on' ? i / (n - 1) : (i + 0.5) / n; return Block.#shift(block, sub(add(A.p, [d[0] * t, d[1] * t, d[2] * t]), mid0)); });
    const cb = copies.map((cp) => { const bs = cp.pieces.map(boundOf); return [[0, 1, 2].map((k) => Math.min(...bs.map((x) => x[0][k]!))) as V3, [0, 1, 2].map((k) => Math.max(...bs.map((x) => x[1][k]!))) as V3] as [V3, V3]; });
    // (root 1, the rest (decision 0029): the copies kept apart by their solids, and a piece of the host cut (or refused as
    // bought) only where a copy's room would take material from it (cutMeets), not wherever their bounds meet; faces still
    // where the bounds meet (rough))
    for (let i = 0; i + 1 < n; i++) if (meets(cb[i]!, cb[i + 1]!) && copies[i]!.pieces.some((p) => copies[i + 1]!.pieces.some((q) => solidsWithin(p, q, 0)))) { const along = [0, 1, 2].reduce((t, k) => t + Math.abs(u[k]!) * (block.hi[k]! - block.lo[k]!), 0);
      throw new Error(`no room along ${A.port} to ${B.port}: ${n} copies of the ${block.name} stand ${(step * 1000).toFixed(2)} mm apart; each takes ${(along * 1000).toFixed(2)} mm along the line (fewer, or a smaller one)`); }
    let pieces: Piece[] = [...host.pieces]; const added: Piece[] = [], faces: Face[] = [...host.faces], foot = (b: [V3, V3]) => { const e = [0, 1, 2].map((k) => b[1][k]! - b[0][k]!).sort((x, y) => x - y); return e[0]! * e[1]!; };
    copies.forEach((cp) => { const bs = cp.pieces.map(boundOf), base = host.pieces.length + added.length;
      pieces = pieces.map((s, k): Piece => { const hit = cp.pieces.filter((c, q) => meets(boundOf(host.pieces[k]!), bs[q]!) && cutMeets(grownBy(c.solid.base, g), host.pieces[k]!)); if (!hit.length) return s;
        if (s.bought) throw new Error(`along: the ${s.name} is bought and lies on the way from ${A.port} to ${B.port}: refused (never cut)`);
        return { ...s, solid: { base: s.solid.base, minus: [...s.solid.minus, ...hit.map((q) => grownBy(q.solid.base, g))] } }; });
      faces.push(...cp.faces.map((f) => ({ ...f, a: f.a + base, b: f.b + base })));
      cp.pieces.forEach((q, k) => host.pieces.forEach((s, j) => { const sb = boundOf(s), qb = bs[k]!; if (!meets(sb, qb)) return;
        const at = [0, 1, 2].map((i) => (Math.max(sb[0][i]!, qb[0][i]!) + Math.min(sb[1][i]!, qb[1][i]!)) / 2) as V3;
        faces.push({ a: j, b: base + k, kind: g > 0 ? 'gap' : 'contact', patch: 'area', area: foot(qb), at, normal: u, gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), by: `${q.name} along ${A.port} to ${B.port}` }); }));
      added.push(...cp.pieces); });
    const all: [V3, V3] = [[0, 1, 2].map((k) => Math.min(...cb.map((x) => x[0][k]!))) as V3, [0, 1, 2].map((k) => Math.max(...cb.map((x) => x[1][k]!))) as V3];
    return noted(Block.#seal(host.name, [...pieces, ...added], faces, host.rooms.filter((r) => !meets(primBox({ k: 'cyl', c: r.c, r: r.r, h: r.h }), all))), [A.note, B.note].filter(Boolean).join('; ') || undefined);
  }
  /** A parallel key seated in a shaft's keyway and its hub's (decision 0029 (8)), so the hub does not turn on the shaft:
   *  the key (one box standing as made: piece.key, b wide, h high, along z) turned so its length runs along the line the
   *  shaft offers, its width across it and its height radial, set with its middle on the shaft's surface at +x of the line
   *  (half in each, rough: DIN 6885 puts about half its height in the shaft) and along the line at the middle of the hub
   *  (the first piece of the host round the line with a bore the shaft fills) or where asked (lo, hi, mid, or a distance
   *  from an end); its room, grown by the fit's gap, cut from the shaft and the hub (a keyway in each), never from a bought
   *  piece (refused). Faces: on the shaft and under the hub, by "keys <hub> to <shaft>" (motionOf should read a keyed hub
   *  as turning with its shaft: a fault for sim.ts where it does not). */
  static key(host: Block, port: string, key: Block, where?: 'lo' | 'hi' | 'mid' | { readonly from: 'lo' | 'hi'; readonly along: number }, fit: Fit = 'tight'): Block {
    Block.#is(host); Block.#is(key); if (!(fit in FITS)) throw new Error('key: a fit by name');
    const nm = namedIn(host, port, 'line', 'key'); if (nm.port !== port) return noted(Block.key(host, nm.port, key, where, fit), nm.note);
    const offers = host.pieces.flatMap((p, k) => p.lines.filter((l) => l.port === port).map((l) => ({ p, k, l }))), o = offers[0]; if (!o) throw new Error(`key: ${host.name} offers no line ${port} (it offers ${offered(host)})`);
    const K = key.pieces[0]; if (key.pieces.length !== 1 || !K || K.solid.base.k !== 'box' || K.solid.base.frame || K.solid.base.sect || K.solid.base.tray) throw new Error(`key: the ${key.name} is no one plain box standing as made (piece.key, or room.make box)`);
    if (!alongY(o.l)) return Block.#inFrame(host, o.l.dir!, 'key', key, (h) => Block.key(h, port, key, where, fit));
    const j = host.pieces.find((p) => p.joint); if (j) throw new Error(`key: the ${j.name} is on a joint (${j.joint!.name}): a key on a joint is not made yet`);
    // (its longest side along y, then its wider remaining side across (z), its narrower radial (x))
    const sz = K.solid.base.size, li = sz.indexOf(Math.max(...sz)); let T = li === 0 ? Block.turn(key, 2, 90) : li === 2 ? Block.turn(key, 0, -90) : key;
    const e0 = primBox(T.pieces[0]!.solid.base); if (e0[1][0] - e0[0][0] > e0[1][2] - e0[0][2] + 1e-12) T = Block.turn(T, 1, 90);
    const [lo, hi] = primBox(T.pieces[0]!.solid.base), kw = hi[2] - lo[2], kh = hi[0] - lo[0], kl = hi[1] - lo[1], g = gapOf(fit), rs = reach(sweepOf(o.p), o.l.x, o.l.z), sb = primBox(o.p.solid.base);
    const hub = host.pieces.find((q) => q !== o.p && roundish(q.solid.base) && upright(q.solid.base) && Math.hypot(q.solid.base.c[0] - o.l.x, q.solid.base.c[2] - o.l.z) < 1e-9 && (boreOf(q.solid.base) ?? 0) + 1e-12 >= rs);
    let y0: number;
    if (where === undefined) { if (!hub) throw new Error(`key: nothing is on ${port} to key to the ${o.p.name}: slide a hub on by room.over first, or say where along it`); const hb = primBox(hub.solid.base); y0 = (hb[0][1] + hb[1][1]) / 2 - kl / 2; }
    else if (typeof where === 'object') { if (!(Number.isFinite(where.along) && where.along >= 0)) throw new Error(`key: a distance along ${port} is finite and never below zero (${where.along} m)`); y0 = where.from === 'lo' ? sb[0][1] + where.along : sb[1][1] - kl - where.along; }
    else y0 = where === 'lo' ? sb[0][1] : where === 'hi' ? sb[1][1] - kl : (sb[0][1] + sb[1][1]) / 2 - kl / 2;
    if (y0 < sb[0][1] - 1e-12 || y0 + kl > sb[1][1] + 1e-12) throw new Error(`no room on ${port}: the ${K.name}, ${(kl * 1000).toFixed(2)} mm long, would pass the ${o.p.name}'s end (${((sb[1][1] - sb[0][1]) * 1000).toFixed(2)} mm long)`);
    const S = Block.#shift(T, [o.l.x + rs - (lo[0] + hi[0]) / 2, y0 - lo[1], o.l.z - (lo[2] + hi[2]) / 2]), kb = boundOf(S.pieces[0]!);
    // (root 1, the rest (decision 0029): a keyway cut, or a bought piece refused, only where the key's room would take
    // material from the piece (cutMeets), not wherever their bounds meet; faces still where the bounds meet (rough))
    const pieces = host.pieces.map((s): Piece => { if (!meets(boundOf(s), kb) || !cutMeets(grownBy(S.pieces[0]!.solid.base, g), s)) return s;
      if (s.bought) throw new Error(`key: the ${s.name} is bought and lies where the ${K.name} goes: refused (never cut; its keyway is cut with the key)`);
      return { ...s, solid: { base: s.solid.base, minus: [...s.solid.minus, grownBy(S.pieces[0]!.solid.base, g)] } }; });
    const n = pieces.length, faces: Face[] = [...host.faces], who = hub?.name ?? `what is on ${port}`;
    host.pieces.forEach((s, j) => { if (!meets(boundOf(s), kb)) return; const inShaft = s === o.p;
      faces.push({ a: j, b: n, kind: g > 0 ? 'gap' : 'contact', patch: 'area', area: kw * kl + kh * kl, at: [o.l.x + rs + (inShaft ? -kh / 4 : kh / 4), y0 + kl / 2, o.l.z], normal: [inShaft ? -1 : 1, 0, 0], gap: g, ...(g > 0 ? { medium: MEDIUM } : {}), by: `${K.name} keys ${who} to ${o.p.name}` }); });
    return Block.#seal(host.name, [...pieces, ...S.pieces], faces, [...host.rooms]);
  }
}
// ---- root 1, the rest (decision 0029, plan/FIX-PLAN.md): ring, through, between, along and key read the solids -----------
/** Whether two solids' material shares a stretch down any column along an axis: solidsMeet's column cast (each box's
 *  middle and edges, the overlap's edges, the N × N grid), down each column the span of each solid's material from its
 *  lowest to its highest. A span holds all the material down its column, so where no column's spans share a stretch the
 *  solids are apart (rough: a feature thinner than a column that lies between columns is missed, as in solidsMeet). */
function spansMeet(a: Piece, b: Piece, axis: Axis): boolean {
  const A = materialOf(a, []), B = materialOf(b, []), [i, j] = other(axis), E = 1e-9, ba = breaksOf(a, axis, A.box), bb = breaksOf(b, axis, B.box);
  const lo = [Math.max(A.box[0][i], B.box[0][i]), Math.max(A.box[0][j], B.box[0][j])], hi = [Math.min(A.box[1][i], B.box[1][i]), Math.min(A.box[1][j], B.box[1][j])];
  if (!(lo[0]! + 2 * E < hi[0]! && lo[1]! + 2 * E < hi[1]!)) return false;
  const within = (u: number, v: number) => lo[0]! < u && u < hi[0]! && lo[1]! < v && v < hi[1]!, du = (hi[0]! - lo[0]!) / N, dv = (hi[1]! - lo[1]!) / N, cols: [number, number][] = [];
  for (const r of [A, B]) { const bx = r.box, cu = (bx[0][i] + bx[1][i]) / 2, cv = (bx[0][j] + bx[1][j]) / 2;
    for (const c of [[cu, cv], [bx[0][i] + E, cv], [bx[1][i] - E, cv], [cu, bx[0][j] + E], [cu, bx[1][j] - E]] as [number, number][]) if (within(c[0], c[1])) cols.push(c); }
  for (let s = 0; s < N; s++) { const u = lo[0]! + (s + 0.5) * du, v = lo[1]! + (s + 0.5) * dv; cols.push([u, lo[1]! + E], [u, hi[1]! - E], [lo[0]! + E, v], [hi[0]! - E, v]); }
  cols.push([lo[0]! + E, lo[1]! + E], [lo[0]! + E, hi[1]! - E], [hi[0]! - E, lo[1]! + E], [hi[0]! - E, hi[1]! - E]);
  for (let s = 0; s < N; s++) for (let t = 0; t < N; t++) cols.push([lo[0]! + (s + 0.5) * du, lo[1]! + (t + 0.5) * dv]);
  for (const [u, v] of cols) {
    const al = materialEnd(A.inside, ba, A.thin, axis, u, v, false, Infinity); if (al === undefined) continue;
    const bl = materialEnd(B.inside, bb, B.thin, axis, u, v, false, Infinity); if (bl === undefined) continue;
    const ah = materialEnd(A.inside, ba, A.thin, axis, u, v, true, -Infinity) ?? al, bh = materialEnd(B.inside, bb, B.thin, axis, u, v, true, -Infinity) ?? bl;
    if (Math.min(ah, bh) - Math.max(al, bl) > 1e-8) return true;
  }
  return false;
}
/** Whether two solids meet: the column cast along y, then x, then z (spansMeet), apart where any one of them finds no
 *  column whose spans share a stretch. So a wheel between a shell's legs, read as full between its walls down a column
 *  across them, is read apart down the columns along them. Each a superset, so the three together are too. */
function solidsCross(a: Piece, b: Piece): boolean {
  if (!meets(materialOf(a, []).box, materialOf(b, []).box)) return false;
  return ([1, 0, 2] as Axis[]).every((axis) => spansMeet(a, b, axis));
}
// (a piece as a bare solid, no joint and no lines: what the casts above read)
const bareOf = (p: Piece, base: Prim, minus: readonly Prim[] = []): Piece => ({ name: p.name, mat: p.mat, solid: { base, minus }, lines: [] });
/** A solid grown by a gap all round (each copy of a ring held apart by its fit's): a box (a case, a section, a loft) its
 *  whole box grown on every side, a bend its tube, a round one with a bore (a tube, a hex, a coil) its cylinder grown and
 *  its bore shrunk, any other round one the cylinder round it grown; its cuts dropped. A superset of all within g of it
 *  (a bend's ends are not moved out: rough). */
const swellBy = (m: Prim, g: number): Prim => (boxy(m) ? { k: 'box', c: m.c, size: [m.size[0] + 2 * g, m.size[1] + 2 * g, m.size[2] + 2 * g], ...(m.frame ? { frame: m.frame } : {}) }
  : m.k === 'bend' ? { ...m, ro: m.ro + g, ...(m.ri !== undefined ? { ri: Math.max(0, m.ri - g) } : {}) }
  : { k: 'cyl', c: m.c, r: m.r + g, h: m.h + 2 * g, ...((m.k === 'cyl' || m.k === 'coil' || m.k === 'hex') && m.ri !== undefined && m.ri > g ? { ri: m.ri - g } : {}), ...(m.frame ? { frame: m.frame } : {}) });
/** Whether two pieces' solids come within a gap of each other: each its sweep where it moves on its own against the other
 *  (as materialOf takes it), the first grown by the gap (swellBy), read by solidsCross. */
function solidsWithin(p: Piece, q: Piece, g: number): boolean {
  const co = coMove(p, q), own = (r: Piece): Solid => (co || !r.joint ? r.solid : { base: sweepOf(r), minus: [] }), P = own(p), Q = own(q);
  return solidsCross(g > 0 ? bareOf(p, swellBy(P.base, g)) : bareOf(p, P.base, P.minus), bareOf(q, Q.base, Q.minus));
}
/** Whether a cut (a passer's, a member's, a copy's or a key's room, grown by its fit) would take material from a piece:
 *  the cut's solid against the piece's, by solidsCross. One that would not is not taken out (it would take nothing). */
const cutMeets = (cut: Prim, s: Piece): boolean => solidsCross(bareOf(s, cut), bareOf(s, s.solid.base, s.solid.minus));
/** The first pair of a ring's copies (their pieces, copy by copy) whose solids come within the gap of each other, if any:
 *  each copy against every other; copies turned to face out are each the first turned round the axis, so the first
 *  against each other up to half way round stands for every pair. */
function ringClash(cs: readonly (readonly Piece[])[], g: number, turned: boolean): { i: number; k: number; p: string; q: string } | undefined {
  const n = cs.length;
  for (let i = 0; i < n; i++) for (let k = i + 1; k < n; k++) { if (turned && (i > 0 || k > n / 2)) continue;
    for (const p of cs[i]!) for (const q of cs[k]!) if (solidsWithin(p, q, g)) return { i, k, p: p.name, q: q.name }; }
  return undefined;
}
/** The least distance from a line along y at (0, 0) to the hull of points in x and z (0 where the line is inside it). */
function hullFrom(pts: readonly (readonly [number, number])[]): number {
  const ps = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o: readonly [number, number], a: readonly [number, number], b: readonly [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: (readonly [number, number])[] = [], upper: (readonly [number, number])[] = [];
  for (const p of ps) { while (lower.length >= 2 && cr(lower[lower.length - 2]!, lower[lower.length - 1]!, p) <= 0) lower.pop(); lower.push(p); }
  for (const p of [...ps].reverse()) { while (upper.length >= 2 && cr(upper[upper.length - 2]!, upper[upper.length - 1]!, p) <= 0) upper.pop(); upper.push(p); }
  const h = [...lower.slice(0, -1), ...upper.slice(0, -1)]; let inside = h.length >= 3, d = Infinity;
  for (let a = 0; a < h.length; a++) { const p = h[a]!, q = h[(a + 1) % h.length]!; if (cr(p, q, [0, 0]) < 0) inside = false;
    const ex = q[0] - p[0], ez = q[1] - p[1], L2 = ex * ex + ez * ez, t = L2 > 0 ? Math.max(0, Math.min(1, (-p[0] * ex - p[1] * ez) / L2)) : 0; d = Math.min(d, Math.hypot(p[0] + t * ex, p[1] + t * ez)); }
  return inside ? 0 : Number.isFinite(d) ? d : Math.min(...ps.map((p) => Math.hypot(p[0], p[1])));
}
/** The room a piece leaves free round a ring's axis (a line along y at (0, 0)), from its solid (its sweep on a joint): an
 *  upright round one exactly (freeRound); a box (a case, a section, a loft) the distance to its own box's outline seen
 *  down the axis (its turned corners' hull: exact for a box, its cuts not counted, so never more than is free); any other
 *  (a round one lying over, a bend) sampled round the axis at rising radius from that hull's distance, at 720 angles and
 *  its own, at heights between its breaks, each ray stepped out closer than half its thinnest material until it meets
 *  material, the first hit refined by bisection: the least radius met (rough: a hit between two rays is missed by at
 *  most the chord between them). */
function freeAboutAxis(p: Piece): number {
  const m = sweepOf(p); if (roundish(m) && upright(m)) return freeRound(m, 0, 0);
  const from = hullFrom(corners(m).map((q) => [q[0], q[2]] as const)); if (boxy(m)) return from;
  const b = primBox(m), far = reach(m, 0, 0), thin = thinnest(m), ys = breaksOf(bareOf(p, m), 1, b), hs: number[] = [];
  for (let a = 0; a + 1 < ys.length; a++) for (let k = 0; k < 6; k++) hs.push(ys[a]! + ((k + 0.5) * (ys[a + 1]! - ys[a]!)) / 6);
  const th0 = Math.atan2(m.c[2], m.c[0]), ths = [th0, ...Array.from({ length: 720 }, (_, a) => th0 + (2 * Math.PI * (a + 0.5)) / 720)];
  let best = far; const K = Math.min(2048, Math.max(8, Math.ceil((2 * (far - from)) / thin)));
  for (const th of ths) { const cx = Math.cos(th), sz = Math.sin(th);
    for (const y of hs) { const hit = (r: number) => inPrim(m, r * cx, y, r * sz); let miss = from;
      for (let k = 0; k <= K; k++) { const r = from + ((far - from) * k) / K; if (r >= best) break; if (!hit(r)) { miss = r; continue; }
        let h = r; while (h - miss > 1e-10) { const c = (miss + h) / 2; if (hit(c)) h = c; else miss = c; } best = Math.min(best, h); break; } } }
  return Math.max(from, best);
}
/** A named point of a block: the i-th line it offers by that name (a hole's point, an axis), where it runs through its
 *  piece's middle along y, or its own point when turned; the name read as namedIn reads it. (decision 0029) */
function pointOf(b: Block, at: { port: string; i?: number }, op: string): { p: V3; piece: Piece; k: number; port: string; note?: string } {
  const nm = namedIn(b, at.port, 'line', op), offers = b.pieces.flatMap((p, k) => p.lines.filter((l) => l.port === nm.port).map((l) => ({ p, k, l })));
  const o = offers[at.i ?? 0]; if (!o) throw new Error(`${op}: ${b.name} offers no line ${nm.port}${at.i !== undefined ? ` ${at.i}` : ''}${offers.length ? ` (it has ${offers.length}: 0 to ${offers.length - 1})` : ` (it offers ${offered(b)})`}`);
  return { p: [o.l.x, o.l.y ?? o.p.solid.base.c[1], o.l.z], piece: o.p, k: o.k, port: nm.port, ...(nm.note ? { note: nm.note } : {}) };
}
/** The span between two named points of a block: each point, the distance and the direction from the first to the second
 *  (the node Between two points makes its member to this length less a hold-back at each end). */
export function spanOf(b: Block, a: { port: string; i?: number }, c: { port: string; i?: number }): { A: V3; B: V3; length: number; dir: V3; note?: string } {
  const A = pointOf(b, a, 'between'), B = pointOf(b, c, 'between'), d = sub(B.p, A.p), L = Math.hypot(d[0], d[1], d[2]), note = [A.note, B.note].filter(Boolean).join('; ');
  return { A: A.p, B: B.p, length: L, dir: L > 0 ? [d[0] / L, d[1] / L, d[2] / L] : [0, 1, 0], ...(note ? { note } : {}) };
}
/** A tube a run lays: its name, material, outside radius and bore (none: solid). */
export interface RunTube { readonly name: string; readonly mat: string; readonly ro: number; readonly ri?: number; readonly color?: number }
/** A segment of a run: a straight (and a sleeve round it), or a bend. */
export type RunSeg = RunTube & ({ readonly straight: number; readonly sleeves?: readonly (RunTube & { readonly from: number; readonly to: number })[] } | { readonly bend: number; readonly R: number; readonly toward?: number });
/** The solids `made` makes, by their sizes (m; a bend's angle in degrees): box [w, h, d]; rod (cyl) [r, h]; tube [bore, r,
 *  h]; cup [r, h, wall, floor]; hex [flats, h, bore?]; dome [r]; sphere [r, bore?]; cone [r below, r above, h, bore?] (a
 *  frustum, or a point where a radius is 0); lathe (a profile of (radius, height) points turned about y, a bore if asked);
 *  coil [R, wire, turns, pitch, layers?]; case [w, h, d, wall, floor]; section (x, y points along z for L); bend [R, r,
 *  degrees, bore?].
 *  The frame each is drawn in, about its bound's middle at the origin (root 8, decision 0029): a box and a case w along
 *  x, h along y, d along z, a case open at +y, its floor at −y; a rod, tube, cup, hex, dome, sphere, cone, lathe and coil
 *  round the y axis (their axis line `<name>/axis` along +y), a cup open at +y with its floor at −y, a dome's flat face
 *  down (−y), a cone's first radius at −y, a lathe's heights along y; a hex's flats face ±x, so its corners lie on ±z;
 *  a section's profile in x and y, drawn along z (its axis line through its outline's origin along +z: a sprocket or gear
 *  stands on edge, Over lays it along the shaft); a bend in the x–y plane, bent round its own z, starting at (R, 0, 0)
 *  heading +y and turning toward −x; a loft's stations along x, each w its half-width in z, lo and hi its bottom and top
 *  in y. A turn (room.turn) carries the frame with it. */
export type Shape0 = { box: [number, number, number] } | { cyl: [number, number] } | { tube: [number, number, number] } | { cup: [number, number, number, number] } | { hex: [number, number] | [number, number, number] } | { dome: [number] }
  | { coil: [number, number, number, number] | [number, number, number, number, number] } | { case: [number, number, number, number, number] } | { section: { pts: [number, number][]; L: number } } | { bend: [number, number, number] | [number, number, number, number] }
  | { sphere: [number] | [number, number] } | { cone: [number, number, number] | [number, number, number, number] } | { lathe: { pts: [number, number][]; bore?: number } }
  // (a loft through its stations along x (form.ts: x, half-width w, bottom lo, top hi; n, wt, nt, mid, z as there), scaled
  // along x to L where L is given)
  | { loft: { st: Station[]; L?: number } };
/** A face of a piece's own box a pattern goes into. */
export type FaceName = '+x' | '-x' | '+y' | '-y' | '+z' | '-z';
/** Where across a stack its blocks meet: centred, or flush at their low or high ends; one word for both axes across, or
 *  one for each (in x, y, z order, the stack's axis left out: a stack along x takes [y's, z's]; decision 0029, so a second
 *  hinge goes at the leaf's low end in y and on the first's line in z). */
export type End = 'lo' | 'hi' | 'mid';
export type Ends = End | readonly [End, End];
const FACES: readonly FaceName[] = ['+x', '-x', '+y', '-y', '+z', '-z'];
/** What `made` is asked besides its shape: a joint, bought, a colour, and a pattern of holes and lines (a circle about
 *  its middle or points; on a face, through or so deep, plain, counterbored [radius, depth] or countersunk to a radius at
 *  the face, 90°). */
export interface MadeOpts { joint?: Joint; bought?: boolean; color?: number; pattern?: Pattern; patterns?: Pattern[];
  /** a section's bore that may be opened to this radius by what goes along its axis (a gear bought with a pilot bore,
   *  bored to its shaft by Through a line): its axis's slot, never less than the bore it has */
  boreTo?: number;
  /** its bore is tapped (a heat-set insert's): a shank of its own size goes into it on the thread, the thread's own fit
   *  (ISO 965), so no fit's gap is drawn round it */
  tapped?: boolean }
/** A pattern of holes or lines: a circle about its middle or points; on a face, through or so deep, plain, counterbored
 *  [radius, depth] or countersunk to a radius at the face, 90°. */
export interface Pattern { name: string; circle?: { n: number; r: number; phase?: number }; points?: [number, number][]; hole?: number; face?: FaceName; depth?: number; sink?: { cbore: [number, number] } | { csink: number } }
// (an outline clipped to the radius at least ri: the part of a turned profile outside its bore (Sutherland-Hodgman, one edge))
const clipOut = (pts: [number, number][], ri: number): [number, number][] => { const out: [number, number][] = [];
  for (let i = 0; i < pts.length; i++) { const a = pts[i]!, b = pts[(i + 1) % pts.length]!, ia = a[0] >= ri, ib = b[0] >= ri; if (ia) out.push(a); if (ia !== ib) { const t = (ri - a[0]) / (b[0] - a[0]); out.push([ri, a[1] + t * (b[1] - a[1])]); } }
  return out; };
// (the distance from a point to a segment)
const segDist = (x: number, y: number, a: readonly [number, number], b: readonly [number, number]): number => { const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy, t = L > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L)) : 0; return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
/** Where a straight's or a bend's middle line starts and ends, and its heading at each: read from the solid alone. */
export function endsOf(p: Prim): { start: V3; end: V3; startDir: V3; endDir: V3 } {
  const f = p.frame ?? I3;
  if (p.k === 'cyl') return { start: sub(p.c, mv(f, [0, p.h / 2, 0])), end: add(p.c, mv(f, [0, p.h / 2, 0])), startDir: mv(f, [0, 1, 0]), endDir: mv(f, [0, 1, 0]) };
  if (p.k === 'bend') { const O = sub(p.c, mv(f, bendMid(p))); return { start: add(O, mv(f, [p.R, 0, 0])), end: add(O, mv(f, [p.R * Math.cos(p.a), p.R * Math.sin(p.a), 0])), startDir: mv(f, [0, 1, 0]), endDir: mv(f, [-Math.sin(p.a), Math.cos(p.a), 0]) }; }
  throw new Error(`a ${p.k} has no middle line`);
}
const startOf = (p: Prim): V3 => endsOf(p).start;
/** Where a round piece rests in a section's outline: its centre's height and the points (x, y, in the room) it touches,
 *  each with the outline's normal there toward the piece. */
type Seat = { yc: number; touch: { at: [number, number]; n: [number, number] }[] };
/** A round piece (a rod along ±z) laid onto a section along z (a box with an outline, standing as made): the height its
 *  circle rests at in the outline, the highest support of the outline's corners and edges under it (so the circle is above
 *  every point of the outline: for a corner, its height plus √(r² − dx²); for an edge, the circle tangent to it from above
 *  with its centre over the rod's middle, where that tangent point lies on the edge), and the points it rests on. None
 *  where the piece is no such rod, the section no such, or the rod's middle is off the section's width. (decision 0029) */
function seatOn(rod: Prim, sect: Prim): Seat | undefined {
  if (rod.k !== 'cyl' || !rod.frame || !(Math.abs(Math.abs(rod.frame[7]) - 1) < 1e-9) || sect.k !== 'box' || !sect.sect || sect.frame) return undefined;
  const cx = rod.c[0] - sect.c[0], r = rod.r, P = sect.sect; if (!(Math.abs(cx) < sect.size[0] / 2)) return undefined;
  const cand: { y: number; at: [number, number]; n: [number, number] }[] = [];
  for (let i = 0; i < P.length; i++) { const a = P[i]!, b = P[(i + 1) % P.length]!;
    if (Math.abs(a[0] - cx) < r) { const dy = Math.sqrt(r * r - (a[0] - cx) ** 2); cand.push({ y: a[1] + dy, at: [a[0], a[1]], n: [(cx - a[0]) / r, dy / r] }); }
    const dx = b[0] - a[0], dyy = b[1] - a[1], L = Math.hypot(dx, dyy); if (!(L > 1e-12) || Math.abs(dx) < 1e-12) continue;
    const u = [dx / L, dyy / L] as const, n: [number, number] = u[0] > 0 ? [-u[1], u[0]] : [u[1], -u[0]], t = (cx - a[0] - r * n[0]) / u[0]; if (t < 1e-12 || t > L - 1e-12) continue;
    cand.push({ y: a[1] + t * u[1] + r * n[1], at: [a[0] + t * u[0], a[1] + t * u[1]], n }); }
  if (!cand.length) return undefined;
  const yc = Math.max(...cand.map((c) => c.y)), touch: Seat['touch'] = [];
  for (const c of cand.filter((c) => c.y > yc - 1e-9)) if (!touch.some((t) => Math.hypot(t.at[0] - c.at[0], t.at[1] - c.at[1]) < 1e-9)) touch.push({ at: [c.at[0] + sect.c[0], c.at[1] + sect.c[1]], n: c.n });
  return { yc: yc + sect.c[1], touch };
}
// (the least distance from a line along y to a prim's outside)
const outsideNear = (b: Prim, x: number, z: number): number => b.k === 'bend' || b.frame ? 0 : boxy(b) ? Math.min(b.size[0] / 2 - Math.abs(x - b.c[0]), b.size[2] / 2 - Math.abs(z - b.c[2])) : b.r - Math.hypot(x - b.c[0], z - b.c[2]);
// (a box passer's four sides against the solid it crosses, offset by the gap)
function boxSide(s: Piece, q: Piece, g: number): { area: number; length: number; at: V3 } {
  const B = q.solid.base as Extract<Prim, { k: 'box' }>, sb = primBox(s.solid.base), qb = primBox(B), y0 = Math.max(sb[0][1], qb[0][1]), y1 = Math.min(sb[1][1], qb[1][1]); if (!(y0 < y1)) return { area: 0, length: 0, at: [0, 0, 0] };
  let n = 0, tot = 0; const M = 24;
  for (const [ax, sg] of [[0, -1], [0, 1], [2, -1], [2, 1]] as const) { const w = ax === 0 ? 2 : 0, L = B.size[w];
    for (let a = 0; a < M; a++) for (let k = 0; k < M; k++) { const o: V3 = [0, y0 + ((k + 0.5) * (y1 - y0)) / M, 0]; o[ax] = B.c[ax] + sg * (B.size[ax] / 2 + g + EPS); o[w] = B.c[w] - L / 2 + ((a + 0.5) * L) / M; tot++; if (inPiece(s, ...o)) n++; } }
  return n ? { area: (n / tot) * 2 * (B.size[0] + B.size[2]) * (y1 - y0), length: 0, at: [B.c[0], (y0 + y1) / 2, B.c[2]] } : { area: 0, length: 0, at: [0, 0, 0] };
}
export const made = Block.made, stack = Block.stack, around = Block.around, through = Block.through, into = Block.into, onto = Block.onto, ring = Block.ring, over = Block.over, turn = Block.turn, run = Block.run, branch = Block.branch;
export const mesh = Block.mesh, rack = Block.rack, belt = Block.belt, between = Block.between, along = Block.along, key = Block.key;

/** A spur gear's teeth read from its outline (ISO 53's rack, as piece.gear draws it: addendum m, dedendum 1.25 m): its
 *  module and teeth (m, from its tip and root circles; z, from its tip), the angle of a tooth's middle in the room, its
 *  axis's point and the ends of its face along it (z). Only a gear standing as made, or turned about its axis (z); else
 *  none. Read by mesh and by the motion of what is made (sim.ts: which gears turn which). */
export function gearOf(p: Piece): { m: number; z: number; ra: number; th: number; at: V3; z0: number; z1: number } | undefined {
  const B = p.solid.base, l = p.lines.find((x) => x.port.endsWith('/axis') && x.dir && Math.abs(x.dir[2] - 1) < 1e-9);
  if (B.k !== 'box' || !B.sect || !l || (B.frame && !(Math.abs(B.frame[8] - 1) < 1e-9))) return undefined;
  const f = B.frame ?? I3, at: V3 = [l.x, l.y ?? B.c[1], l.z], o = mtv(f, sub(at, B.c)), rho = B.sect.map(([x, y]) => Math.hypot(x - o[0], y - o[1]));
  const ra = Math.max(...rho), lo = Math.min(...rho), rf = Math.min(...rho.filter((r) => r > lo + 1e-9)), m = (ra - rf) / 2.25, z = Math.round((2 * ra) / m - 2);
  if (!(z >= 12 && Math.abs(m * (z / 2 + 1) - ra) < 1e-6 * ra)) return undefined;
  const i = rho.findIndex((r, k) => Math.abs(r - ra) < 1e-9 * ra && Math.abs((rho[k + 1] ?? 0) - ra) < 1e-9 * ra); if (i < 0) return undefined;
  const p0 = B.sect[i]!, p1 = B.sect[i + 1]!, th = Math.atan2(p0[1] + p1[1] - 2 * o[1], p0[0] + p1[0] - 2 * o[0]) + Math.atan2(f[3], f[0]);
  return { m, z, ra, th, at, z0: B.c[2] - B.size[2] / 2, z1: B.c[2] + B.size[2] / 2 };
}

/** A rack's teeth read from its outline (ISO 53's basic rack, as piece.rack draws it: its teeth along its own x, up its y,
 *  so wide along z), standing as made or turned about z only: its module (tip less root over 2.25), its teeth and pitch,
 *  the room's x of its own −x end, the room's y of its pitch line (m below its tips), its length's direction in the room
 *  and its face's ends along z. Read by rack (the operation) and by the motion of what is made. */
export function rackOf(p: Piece): { m: number; n: number; p: number; lo: number; pitchY: number; dir: V3; zc: number; z0: number; z1: number; c: V3 } | undefined {
  const B = p.solid.base; if (B.k !== 'box' || !B.sect || (B.frame && !(Math.abs(B.frame[8] - 1) < 1e-9))) return undefined;
  const ys = [...new Set(B.sect.map(([, y]) => +y.toFixed(12)))].sort((a, b) => a - b); if (ys.length !== 3) return undefined;
  const tip = ys[2]!, root = ys[1]!, m = (tip - root) / 2.25, tips = B.sect.filter(([, y]) => Math.abs(y - tip) < 1e-12).map(([x]) => x).sort((a, b) => a - b);
  if (!(m > 0) || tips.length < 4 || tips.length % 2) return undefined;
  const mids = Array.from({ length: tips.length / 2 }, (_, k) => (tips[2 * k]! + tips[2 * k + 1]!) / 2), pitch = Math.PI * m;
  if (!mids.every((x, k) => !k || Math.abs(x - mids[k - 1]! - pitch) < 1e-6 * pitch)) return undefined;
  const f = B.frame ?? I3, xl = Math.min(...B.sect.map(([x]) => x));
  return { m, n: mids.length, p: pitch, lo: B.c[0] + f[0] * xl, pitchY: B.c[1] + f[4] * (tip - m), dir: [f[0], f[3], f[6]], zc: B.c[2], z0: B.c[2] - B.size[2] / 2, z1: B.c[2] + B.size[2] / 2, c: [B.c[0], B.c[1], B.c[2]] };
}
/** How many teeth a toothed wheel has (a gear, a timing pulley, a sprocket: a section drawn along its axis, z), read from
 *  its outline: each run of its points out at its largest radius about the axis through `at` is one tooth's tip or land (its bore, well
 *  within half its outside, left out). */
export function teethOf(p: Piece, at: P3): number | undefined {
  const B = p.solid.base; if (B.k !== 'box' || !B.sect) return undefined; const all = B.sect.map(([x, y]) => Math.hypot(x + B.c[0] - at[0], y + B.c[1] - at[1])), R = Math.max(...all);
  // (its bore's points left out (well inside its teeth: within half its outside), so its outline runs round unbroken)
  const rho = all.filter((r) => r > 0.55 * R), on = rho.map((r) => r > R * (1 - 1e-6));
  const n = on.filter((x, i) => x && !on[(i - 1 + on.length) % on.length]).length; return n >= 3 ? n : undefined;
}

// ---- a block as the app draws it --------------------------------------------------------------------------------
const LOOK: Record<string, number> = { 'steel-low': 0x8a8c90, 'steel-alloy': 0x6e7175, copper: 0xb87333, brass: 0xc9a54a, 'al-6061': 0xc4c8cc, 'al-6063': 0xc8ccd0, 'al-a380': 0xb8bcc0, abs: 0xc9ccd1, 'stainless-304': 0xb8bcc2, fr4: 0x1f6b3a, pvc: 0x2a2a2a, nylon: 0xe8e4d8, glass: 0xdfe8ee, pc: 0xf2f2f0, epoxy: 0xf4f4f0, pom: 0x1c1c1c, ndfeb: 0x4a4d52 };
/** A cup's wall, floor and (when closed) lid as a profile turned about y, [radius, height] about its middle. */
const cupProfile = (b: Extract<Prim, { k: 'cup' }>): [number, number][] => {
  const h = b.h / 2, ri = b.r - b.wall;
  return b.open ? [[0, -h], [b.r, -h], [b.r, h], [ri, h], [ri, -h + b.ends], [0, -h + b.ends]] : [[0, -h], [b.r, -h], [b.r, h], [0, h], [0, h - b.ends], [ri, h - b.ends], [ri, -h + b.ends], [0, -h + b.ends]];
};
/** A dome's profile, its flat face down, about its bound's middle: a quarter circle in 12 steps. */
const domeProfile = (r: number): [number, number][] => [[0, -r / 2], ...Array.from({ length: 13 }, (_, k) => { const a = (k / 12) * (Math.PI / 2); return [r * Math.cos(a), -r / 2 + r * Math.sin(a)] as [number, number]; })];
/** A coil's wire as points along its helix (24 a turn), from its bottom to its top, about its middle. */
const helix = (R: number, turns: number, pitch: number, H: number): [number, number, number][] => { const n = Math.max(2, Math.round(turns * 24)); return Array.from({ length: n + 1 }, (_, k) => { const a = (k / n) * turns * 2 * Math.PI; return [R * Math.cos(a), -H / 2 + (k / n) * turns * pitch, R * Math.sin(a)] as [number, number, number]; }); };
/** A sphere's outline, about its middle: a half circle in 24 steps, closed along its axis. */
const sphereProfile = (r: number): [number, number][] => Array.from({ length: 25 }, (_, k) => { const t = (k / 24) * Math.PI; return [k === 0 || k === 24 ? 0 : r * Math.sin(t), -r * Math.cos(t)] as [number, number]; });
/** A closed outline as a lathe draws it: its first point again at its end. */
const closedLathe = (pts: readonly (readonly [number, number])[]): [number, number][] => [...pts.map((q) => [q[0], q[1]] as [number, number]), [pts[0]![0], pts[0]![1]]];
// (a cut that takes nothing from its piece is not drawn: through takes a passer out of every solid whose bound meets the
// passer's, and a bearing's ring's box meets every ball though the ring touches none; each ball's room was drawn through
// the rings as a whole hole, and weighed so (608: 6.62 g drawn, 12.29 g its row's nominal; decision 0026). Upright and
// round, both: outside the piece's radius, or inside its bore, is missed; boxes that do not meet, missed)
const missesBase = (B: Prim, m: Prim): boolean => {
  if (!meets(primBox(B), primBox(m))) return true;
  if (B.frame || m.frame || !roundish(m) || !evenRound(B)) return false;
  const d = Math.hypot(m.c[0] - B.c[0], m.c[2] - B.c[2]), ri = boreOf(B);
  return d - m.r >= B.r - 1e-12 || (ri !== undefined && d + m.r <= ri + 1e-12);
};
/** Where along a cut's run (from its top end `top` along `D`, `h` long) the solid it is cut from has material: the
 *  stretches, each [from, to] along the run (root 3, decision 0029: a cut is clipped to the solid it meets, so a flange's
 *  bolt holes are drawn and weighed through the flange, not the hub's whole height, and a pin hole through a receiver's
 *  two walls, not the square between them). Read on its middle line and eight lines just inside its edge (`across`: a
 *  round cut's radius, or a box cut's half sides), sampled closer than half the solid's thinnest material, each end
 *  refined by bisection; none where it meets no material. */
const spansIn = (B: Prim, top: P3, D: P3, h: number, U: P3, W: P3, across: readonly [number, number]): [number, number][] => {
  const offs: [number, number][] = [[0, 0], ...Array.from({ length: 8 }, (_, k) => [0.98 * across[0] * Math.cos((k * Math.PI) / 4), 0.98 * across[1] * Math.sin((k * Math.PI) / 4)] as [number, number])];
  const lines = offs.map(([a, b]) => add(top, [a * U[0] + b * W[0], a * U[1] + b * W[1], a * U[2] + b * W[2]]));
  const hit = (t: number) => lines.some((q) => inPrim(B, q[0] + t * D[0], q[1] + t * D[1], q[2] + t * D[2]));
  const K = Math.min(1024, Math.max(16, Math.ceil((2 * h) / thinnest(B)))), ts = Array.from({ length: K + 1 }, (_, i) => (i * h) / K), ins = ts.map(hit);
  const edge = (a: number, b: number) => { let o = a, i = b; for (let n = 0; n < 40; n++) { const m = (o + i) / 2; if (hit(m)) i = m; else o = m; } return i; };
  const out: [number, number][] = [], pad = 1e-6; let s: number | undefined;
  for (let i = 0; i <= K; i++) { if (ins[i] && s === undefined) s = i === 0 ? 0 : edge(ts[i - 1]!, ts[i]!);
    if (s !== undefined && (!ins[i] || i === K)) { const e = ins[i] ? h : edge(ts[i]!, ts[i - 1]!); out.push([Math.max(0, s - pad), Math.min(h, e + pad)]); s = undefined; } }
  return out;
};
/** A block as the app's parts:each piece where the operations put it, what was taken out of it drawn as its cuts, its
 *  faces counted in what it says. Never edited back: a block is changed only by the operations. */
export function partOfBlock(b: Block): Part {
  const parts = b.pieces.map((p): Part => {
    // (a turned piece drawn in its own frame, turned; a bend about the centre it is bent round, as a ring's arc is drawn;
    // each cut in the piece's own frame)
    const B = p.solid.base, cuts: Cut[] = [], cores: Part[] = [], f = B.frame, own = (v: P3): V3 => (f ? mtv(f, v) : [v[0], v[1], v[2]]);
    const origin: V3 = B.k === 'bend' ? sub(B.c, f ? mv(f, bendMid(B)) : bendMid(B)) : [B.c[0], B.c[1], B.c[2]], turned = f ? { rot: eulerOf(f) } : {};
    const look = { mat: p.mat, ...(p.color !== undefined ? { color: p.color } : LOOK[p.mat] !== undefined ? { color: LOOK[p.mat] } : {}) };
    if ((B.k === 'cyl' || B.k === 'hex') && B.ri !== undefined) cuts.push({ r: B.ri, depth: B.h, at: [0, B.h / 2, 0], dir: [0, -1, 0] });
    for (const m of p.solid.minus) {
      if (m.k === 'bend' || missesBase(B, m)) continue; const h = boxy(m) ? m.size[1] : m.h, mf = m.frame ?? I3, at = own(sub(add(m.c, mv(mf, [0, h / 2, 0])), origin)), dir = own(mv(mf, [0, -1, 0]));
      // (root 3: a box cut or a plain round one drawn only where it runs through the solid, a cut for each stretch it meets)
      const top = add(m.c, mv(mf, [0, h / 2, 0])), D = mv(mf, [0, -1, 0]), clip = (across: readonly [number, number]) => spansIn(B, top, D, h, mv(mf, [1, 0, 0]), mv(mf, [0, 0, 1]), across).map(([t0, t1]) => ({ at: own(sub(add(top, [t0 * D[0], t0 * D[1], t0 * D[2]]), origin)), depth: t1 - t0 }));
      if (boxy(m)) { const [w, , d] = m.size; for (const c of clip([w / 2, d / 2])) cuts.push({ r: Math.hypot(w, d) / 2, depth: c.depth, at: c.at, dir, u: own(mv(mf, [1, 0, 0])), sect: [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] }); continue; }
      // (a counterbored or countersunk hole: a turned cut, its profile from its face down, its own +y out of the face)
      if (m.k === 'lathe') { const rim = m.pts.filter((q) => q[0] > 1e-12), prof = (rim[0]![1] < rim[rim.length - 1]![1] ? [...rim].reverse() : rim).map((q) => [q[0], h / 2 - q[1]] as [number, number]);
        cuts.push({ r: Math.min(...prof.map((q) => q[0])), depth: h, at, dir, prof }); continue; }
      // (a ring a passer took out of a plain piece (a tube through a plate): drawn as the whole hole and the core it leaves
      // standing inside it, as long as the piece is through along the ring's line)
      const ring = (m.k === 'cyl' || m.k === 'coil' || m.k === 'hex') && m.ri !== undefined && m.ri > 0;
      if (!ring) { for (const c of clip([m.r, m.r])) cuts.push({ r: m.r, depth: c.depth, at: c.at, dir }); continue; }
      const ax = own(mv(mf, [0, 1, 0])), k = [0, 1, 2].find((a) => Math.abs(Math.abs(ax[a]!) - 1) < 1e-9) as Axis | undefined; if (k === undefined) continue;
      const mid = own(sub(m.c, origin)), hb = halfOf(B), [u, v] = other(k);
      // (a plain box with the ring wholly inside it across, or a solid rod the ring is round about along its own axis)
      const inBox = B.k === 'box' && !B.tray && !B.sect && Math.abs(mid[u]) + m.r <= hb[u]! + 1e-12 && Math.abs(mid[v]) + m.r <= hb[v]! + 1e-12;
      const onRod = B.k === 'cyl' && B.ri === undefined && k === 1 && Math.hypot(mid[0], mid[2]) < 1e-12; if (!inBox && !onRod) continue;
      const lo = Math.max(mid[k] - h / 2, -hb[k]!), hi = Math.min(mid[k] + h / 2, hb[k]!), rc = onRod ? Math.min(m.ri!, (B as { r: number }).r) : m.ri!; if (!(hi > lo)) continue;
      cuts.push({ r: onRod ? Math.min(m.r, (B as { r: number }).r) : m.r, depth: h, at, dir }); const c: V3 = [mid[0], mid[1], mid[2]]; c[k] = (lo + hi) / 2; const core = { lathe: closedLathe([[0, -(hi - lo) / 2], [rc, -(hi - lo) / 2], [rc, (hi - lo) / 2], [0, (hi - lo) / 2]]) };
      const up: V3 = [0, 0, 0]; up[k] = 1; const cf = snap(tr(toY(up)));
      cores.push({ name: `${p.name} core`, shape: core, at: c, ...(cf ? { rot: eulerOf(cf) } : {}), ...look });
    }
    // (a case: its floor and four walls, each where the case's own shape has it, each with the cuts that reach it (each cut
    // given to every wall its box meets); a coil of several layers: a helix each)
    if (B.k === 'box' && B.tray) { const [w, h, d] = B.size, { wall: t, floor: fl } = B.tray, half = (x: number) => x / 2;
      const walls: Part[] = [{ name: `${p.name} floor`, shape: { box: [w, fl, d] }, at: [0, -half(h) + half(fl), 0], ...look },
        { name: `${p.name} wall`, shape: { box: [t, h - fl, d] }, at: [-half(w) + half(t), half(fl), 0], ...look }, { name: `${p.name} wall`, shape: { box: [t, h - fl, d] }, at: [half(w) - half(t), half(fl), 0], ...look },
        { name: `${p.name} wall`, shape: { box: [w - 2 * t, h - fl, t] }, at: [0, half(fl), -half(d) + half(t)], ...look }, { name: `${p.name} wall`, shape: { box: [w - 2 * t, h - fl, t] }, at: [0, half(fl), half(d) - half(t)], ...look }];
      for (const wl of walls) { const sz = (wl.shape as { box: V3 }).box, a = wl.at!;
        const mine = cuts.filter((c) => { const e = c.at.map((v, k) => v + c.dir[k]! * c.depth); return [0, 1, 2].every((k) => Math.min(c.at[k]!, e[k]!) - c.r < a[k]! + sz[k]! / 2 && Math.max(c.at[k]!, e[k]!) + c.r > a[k]! - sz[k]! / 2); });
        if (mine.length) wl.cuts = mine.map((c) => ({ ...c, at: [c.at[0] - a[0], c.at[1] - a[1], c.at[2] - a[2]] })); }
      return { name: p.name, item: p.name, one: true, at: origin, ...turned, parts: walls, ...look }; }
    if (B.k === 'coil' && B.layers > 1) return { name: p.name, item: p.name, one: true, at: origin, ...turned, ...look,
      parts: Array.from({ length: B.layers }, (_, k) => ({ name: `${p.name} layer ${k + 1}`, shape: { tube: { r: B.d / 2, pts: helix(B.R + k * B.d, B.turns, B.pitch, B.h - B.d) } }, at: [0, 0, 0] as [number, number, number], ...look })) };
    // (a bend with a bore: its tube along its arc with its wall, so it is drawn and weighed hollow (it was drawn solid: 412.0 g
    // where the same straight is 64.7 g, the research of 2026-11-05))
    const arc = (bd: Extract<Prim, { k: 'bend' }>): [number, number, number][] => { const n = Math.max(4, Math.ceil(bd.a / (Math.PI / 24))); return Array.from({ length: n + 1 }, (_, k) => [bd.R * Math.cos((k / n) * bd.a), bd.R * Math.sin((k / n) * bd.a), 0] as [number, number, number]); };
    const shape: Shape = B.k === 'loft' ? { loft: { st: B.st.map((q) => ({ ...q })) } } : B.k === 'box' ? (B.sect ? { prism: { pts: B.sect.map(([x, y]) => [x, y] as [number, number]), L: B.size[2] } } : { box: [B.size[0], B.size[1], B.size[2]] }) : B.k === 'cyl' || B.k === 'hex' ? { cyl: [B.r, B.h] } : B.k === 'dome' ? { lathe: domeProfile(B.r) }
      : B.k === 'sphere' ? (B.ri === undefined ? { sphere: B.r } : { lathe: closedLathe(clipOut(sphereProfile(B.r), B.ri)) }) : B.k === 'lathe' ? { lathe: closedLathe(B.pts) }
      : B.k === 'coil' ? { tube: { r: B.d / 2, pts: helix(B.R, B.turns, B.pitch, B.h - B.d) } } : B.k === 'bend' ? (B.ri !== undefined ? { tube: { r: B.ro, pts: arc(B), wall: B.ro - B.ri, bend: B.R } } : { torus: [B.R, B.ro, B.a] }) : { lathe: cupProfile(B) };
    return { name: p.name, item: p.name, shape, at: origin, ...turned, mat: p.mat, ...(B.k === 'hex' ? { facets: 6 } : {}), ...(p.color !== undefined ? { color: p.color } : LOOK[p.mat] !== undefined ? { color: LOOK[p.mat] } : {}), ...(cuts.length ? { cuts } : {}), ...(cores.length ? { parts: cores } : {}) };
  });
  return { name: b.name, parts, says: `${b.pieces.length} pieces, each placed by the operations; ${b.faces.length} faces where they meet` };
}

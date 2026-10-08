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

import type { Choice, Iface, Kit, Part, Pick, Shape, V3 } from './kits';
import { bodyPanels, insideOf, roofOf, tailOf, type BodyPlan, type KeepOut, type WheelAt } from './panels';
import { patchPoints, type Patch } from './surface';
import { getMaterial } from '../data/materials';
import type { Station } from './form';

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
export interface Axle { /** from the machine's middle, + forward */ x: number; track: number; tyre: string; steer?: boolean; drive?: boolean; dual?: boolean; brake?: { kind: 'disc' | 'drum'; d: number; vented?: boolean }; /** how it hangs from the frame */ susp?: Susp }
export type Frame = 'shell' | 'tube' | 'ladder' | 'backbone';
/** Where a panelled body's lines run, as shares of its length from its nose and of its height (typical of each style). */
export interface Lines { cowl: number; roofF: number; roofR: number; deck: number; belt: number; nose: number; tail: number; n: number; open?: boolean; bed?: boolean; /** doors a side: one long one (a coupe's, a roadster's) or two */ doors?: 1 | 2; /** its face: its headlamps' and its grille's height, m (typical of its kind where not said) */ face?: { lamp?: number; grille?: number } }
export interface Seat { x: number; z: number; /** its cushion's top above the ground */ y: number; style: 'bucket' | 'bench' | 'saddle' | 'pan' | 'kart' }
export interface Power { kind: 'single' | 'twin' | 'inline' | 'diesel' | 'electric'; cc?: number; kW: number; x: number; z?: number; y?: number; says: string; /** its own size where it is published, m */ box?: V3; kg?: number; /** its most torque, N·m, and the reduction from it to the driven axle, where known */ torque?: number; ratio?: number; driveSays?: string }
export type Extra = 'mast' | 'guard' | 'counterweight' | 'fifth wheel' | 'tanks' | 'stacks' | 'deck' | 'racks' | 'bumpers' | 'lights' | 'pods' | 'nose' | 'fenders' | 'hood' | 'cab' | 'fork' | 'swingarm' | 'tank' | 'exhaust' | 'number';
export interface Machine {
  /** a tube frame's upper rails, m above the ground (an ATV's, under its seat and racks) */ upper?: number;
  /** a tube frame's rails in plan: their half-width, as shares of the room between the wheels, at its back end, the rear axle, the front axle, ahead of it and its nose */ rails?: [number, number, number, number, number];
  id: string; name: string; kind: string; source: string; /** what it is called in a few words ("corolla", "rancher"), as it is chosen */ short?: string;
  L: number; W: number; H: number; clearance: number; axles: Axle[]; frame: Frame; lines?: Lines; seats: Seat[]; power: Power;
  controls: 'wheel' | 'bars'; /** the driver's side: -1 left (as in North America), 1 right */ hand?: -1 | 1;
  rims: { style: 'spokes' | 'steel' | 'wire' | 'disc' | 'split'; spokes?: number; mat: string; lugs: number; lug: number; color?: number; /** the studs' pitch circle, mm, where its maker gives it (else typical of its stud count) */ pcd?: number; /** its offset, mm: its mounting face outboard of its rim's middle */ offset?: number; /** a full wheel cover over a steel wheel, so many spokes in its moulding */ cover?: number };
  extras: Extra[]; /** its published mass, kg (kerb, wet, or operating, as its maker gives it) */ mass?: number; massSays?: string;
  /** a motorcycle's head angle from vertical, rad */ rake?: number; seatH?: number; color: number; says: string;
  /** it goes on public roads (where it is sold, if said: its plates are that market's) */ road?: boolean | 'us' | 'eu';
  /** a chain drive: from a sprocket on the engine (offset from its middle) to one on the driven axle, in a plane at z */ chain?: { teeth: [number, number]; pitch: number; at: [number, number]; z: number; item?: string; says: string }; /** its overhead guard's top, m */ guardH?: number;
}

// ---- making parts -------------------------------------------------------------------------------------------------
const P = (name: string, shape: Shape | undefined, at: V3, more: Partial<Part> = {}): Part => ({ name, ...(shape ? { shape } : {}), at, ...more });
const tube = (name: string, r: number, pts: V3[], mat: string, color: number, more: Partial<Part> = {}, wall = Math.max(0.0012, r * 0.1)): Part => P(name, { tube: { r, pts, wall } }, [0, 0, 0], { mat, color, finish: 'paint', ...more });
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
/** A wheel: its tyre (a turned section, knobbed off-road), its rim (a turned barrel between flanges) and face, its hub
 *  and the nuts that hold it on their pitch circle, and its brake. Built with its outer face to +z. */
/** A wheel's stud circle, m across: its maker's where given, else typical of its stud count (4×100, 5×114.3, 6×139.7,
 *  8×165.1 mm, as cars, pickups and trucks use), and never wider than its rim has room for. */
const pcdOf = (lugs: number, rimR: number, given?: number) => Math.min(given ? given / 1000 : ({ 3: 0.07, 4: 0.1, 5: 0.1143, 6: 0.1397, 8: 0.1651 } as Record<number, number>)[lugs] ?? 0.1, 2 * Math.max(0.025, rimR * 0.62));
/** Where a wheel's corner is along its axle, m out from the wheel's middle (+ toward its outer face), so the wheel and
 *  what holds it agree: its mounting face (where its maker's offset puts it, outboard of the rim's middle; else, typical,
 *  an alloy's 30 mm behind its centre pad at 30% of the half-width out, a steel or disc wheel's a quarter of the tyre's
 *  width out); its hub's flange behind it (behind a disc's hat, 6 mm, clamped between them) and the barrel it turns on;
 *  its brake (a disc's ring by its hat, 46 mm from the mounting face to the ring's far side for a 275 mm disc, typical,
 *  and so in scale; a drum's face); and where a knuckle may be: its upright 6 mm inboard of its caliper or its drum, its
 *  bearing housing round the hub's barrel from there out to 12 mm short of the hub's flange, inside the disc's hat. */
function cornerOf(t: Tyre, o: { style: Machine['rims']['style']; offset?: number; brake?: Axle['brake']; lugs?: number; pcd?: number; lug?: number }, knuckle = false) {
  // (the hub's flange out past its studs by a nut's half width and 4 mm, so each stud is pressed in whole metal)
  const rr = t.rim / 2, studR = o.lugs ? pcdOf(o.lugs, rr, o.pcd) / 2 : 0, wr = t.W * 0.45, hubR = Math.max(0.03, rr * 0.28, studR ? studR + (o.lug ?? 12) / 1000 + 0.004 : 0), disc = o.brake?.kind === 'disc' ? o.brake : null;
  const zMount = o.offset !== undefined ? Math.min(wr - 0.035, Math.max(-wr * 0.6, o.offset / 1000)) : o.style === 'spokes' || o.style === 'split' ? wr * 0.3 - 0.03 : t.W * 0.25;
  const hubFace = zMount - (disc ? 0.006 : 0), rB = hubR * 0.6, r = disc ? Math.min(disc.d / 2, rr - 0.02) : 0, th = disc ? (disc.vented ? 0.026 : 0.011) : 0;
  const hat = Math.min(0.08, Math.max(0.03, (0.046 * r) / 0.1375)), zD = zMount - hat + th / 2;
  // (its caliper: a piston half inboard of the ring, as thick as a fifth of the ring's radius up to 30 mm, typical)
  const sideIn = Math.max(0.018, Math.min(0.03, r * 0.22)), sideOut = 0.012, drumL = Math.min(0.08, t.W * 0.5);
  const calIn = disc ? zD - th / 2 - 0.0015 - sideIn : o.brake?.kind === 'drum' ? -wr * 0.3 - drumL / 2 : hubFace - 0.03;
  const armT = 0.022, armOut = Math.min(calIn - 0.006, hubFace - 0.03), zA = armOut - armT / 2, zK0 = zA - armT / 2, zK1 = hubFace - 0.016;
  // (its caliper behind the axle and a little over it (156° round from ahead), as long round the ring as 1.1 times its
  // radius, as wide as 0.36 of it; its carrier's two legs just past its ends, bolted to two ears of the knuckle)
  const cw = Math.max(0.035, r * 0.36), ch = Math.min(0.3, r * 1.1), rc = r - cw / 2 + 0.006, ca0 = 2.73, legW = 0.02, legAt = (ch / 2 + legW / 2) / Math.max(rc, 0.01);
  return { wr, rr, hubR, rB, zMount, hubFace, zSpig: zMount + 0.006, hubIn: knuckle ? zK0 - 0.002 : -t.W * 0.3, r, th, zD, rh: hubR + 0.008, sideIn, sideOut, drumL, zA, zK0, zK1, armT, rK: Math.min(hubR + 0.002, rB + 0.02), studR, cw, ch, rc, ca0, legW, legAt, calIn };
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
function wheel(name: string, t: Tyre, o: { style: Machine['rims']['style']; spokes?: number; mat: string; lugs: number; lug: number; color?: number; pcd?: number; offset?: number; cover?: number; brake?: Axle['brake']; knobs?: boolean; dual?: boolean; single?: boolean; /** its hub's bore, m (the radius of what it turns on or is turned by: a drive shaft's splined stub, a spindle); solid where not said */ bore?: number; /** on the car's left, turned half round to face out: what is behind its axle on the right is behind it here too */ left?: boolean; knuckle?: boolean }): Part {
  const R = t.D / 2, parts: Part[] = [], wr = t.W * 0.45, rr = t.rim / 2, metal = o.mat;
  const tyre = (dz: number, nm: string): Part => {
    const prof = tyreSection(t);
    const knobs: Part[] = [];
    if (o.knobs) { const n = Math.round((2 * PI * R) / 0.05); for (let i = 0; i < n; i++) for (const s of [-1, 1]) { const a = ((i + (s > 0 ? 0.5 : 0)) / n) * 2 * PI; knobs.push(P('knob', { box: [0.014, 0.024, t.W * 0.34] }, [(R + 0.005) * Math.cos(a), (R + 0.005) * Math.sin(a), s * t.W * 0.22], { rot: [0, 0, a], mat: 'rubber', color: 0x141414, finish: 'tread', one: true })); } }
    return P(nm, { lathe: prof }, [0, 0, dz], { rot: [PI / 2, 0, 0], mat: 'rubber', color: 0x161616, shell: Math.min(0.012, Math.max(0.004, t.D * 0.016)), finish: 'tread', says: t.says, parts: knobs.length ? [P('tread blocks', undefined, [0, 0, 0], { rot: [-PI / 2, 0, 0], parts: knobs })] : undefined });
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
  const cn = cornerOf(t, o, o.knuckle), zMount = cn.zMount, zc = zMount + 0.03, rb = Math.max(0.012, Math.min(0.03, pcd - 0.022)), rp = Math.min(rr * 0.55, pcd + Math.max(0.016, o.lug * 0.0016)), zr = wr - 0.012;
  if (o.style === 'spokes' || o.style === 'split') {
    const n = o.spokes ?? 5, share = n <= 6 ? 0.42 : n <= 10 ? 0.34 : 0.26, half = (r: number) => (Math.PI * r * share) / n, deep = Math.max(0.012, rr * 0.1), r1 = rr - 0.003;
    face.push(P('centre pad', { lathe: [[rb, zc - 0.03], [rb, zc], [rp - 0.006, zc - 0.002], [rp, zc - 0.012], [rp, zc - 0.03]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: metal, color: o.color ?? 0xc8ccd2, finish: 'brushed' }));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 2 * PI, st = [0, 0.5, 1].map((f) => { const r = rp - 0.006 + (r1 - rp + 0.006) * f, top = zc - 0.002 + (zr - zc + 0.002) * f - (f > 0 && f < 1 ? 0.006 : 0); return { x: r, w: half(r), lo: top - deep * (1 - 0.3 * f), hi: top, n: 3 }; });
      face.push(P(`spoke ${i + 1}`, { loft: { st } }, [0, 0, 0], { rot: [PI / 2, a, 0], mat: metal, color: o.color ?? 0xc8ccd2, finish: 'brushed' }));
    }
    face.push(P('centre cap', { lathe: [[0, zc + 0.004], [rb * 0.7, zc + 0.003], [rb - 0.001, zc - 0.002], [rb - 0.001, zc - 0.012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'abs', color: darken(o.color ?? 0xc8ccd2, 0.82), finish: 'paint', fixed: 'clipped into the bore', says: 'its centre cap, clipped into the bore (typical)' }));
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
      const n = o.cover, cz = zMount + 0.034, ce = wr - 0.004, half = (r: number) => (Math.PI * r * 0.36) / n, r1 = rr - 0.022, cc = 0xc4c8cc, cv: Partial<Part> = { mat: 'abs', color: cc, finish: 'paint' };
      face.push(P('wheel cover', undefined, [0, 0, 0], { mat: 'abs', color: cc, fixed: 'snapped over the rim\'s outer flange', says: `its full wheel cover: moulded ABS, ${n} spokes (typical of the style; its maker gives the wheel)`, parts: [
        // (its rim out over the barrel's flange, 2 mm clear of it all round, its lip past the flange's edge)
        P('cover rim', { lathe: [[r1 - 0.004, ce - 0.006], [rr + 0.014, wr + 0.006], [rr + 0.014, wr + 0.003], [rr - 0.004, wr - 0.006], [r1 - 0.004, ce - 0.012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], ...cv, passes: ['tyre valve'] }),
        P('cover hub', { lathe: [[0, cz + 0.008], [rp * 0.6, cz + 0.006], [rp + 0.006, cz], [rp + 0.006, cz - 0.012]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], ...cv }),
        ...Array.from({ length: n }, (_, i) => { const a = (i / n) * 2 * PI, st = [0, 0.5, 1].map((f) => { const r = rp + 0.004 + (r1 - rp - 0.004) * f, top = cz + (ce - cz) * f - (f > 0 && f < 1 ? 0.004 : 0); return { x: r, w: half(r), lo: top - 0.008, hi: top, n: 3 }; }); return P(`cover spoke ${i + 1}`, { loft: { st } }, [0, 0, 0], { rot: [PI / 2, a, 0], ...cv }); })] }));
    }
  }
  else if (o.style === 'wire') { const n = o.spokes ?? 32; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * PI, s = i % 2 ? 1 : -1, a2 = a + (s * 3 * 2 * PI) / n; face.push(tube(`spoke ${i + 1}`, 0.0018, [[hubR * 0.9 * Math.cos(a), hubR * 0.9 * Math.sin(a), s * wr * 0.5], [(rr - 0.01) * Math.cos(a2), (rr - 0.01) * Math.sin(a2), 0]], 'steel-low', 0xb8bcc2, { finish: 'chrome', item: 'spoke' })); } }
  if (!o.knobs && rr > 0.12) { const n = o.spokes ?? 5, a = PI / n, tilt = 0.5; face.push(P('tyre valve', { cyl: [0.0055, 0.033] }, [Math.cos(a) * (rr - 0.0015 - 0.016 * Math.sin(tilt)), Math.sin(a) * (rr - 0.0015 - 0.016 * Math.sin(tilt)), wr * 0.62 + 0.016 * Math.cos(tilt)], { rot: [PI / 2 - tilt * Math.sin(a), 0, -tilt * Math.cos(a)], mat: 'rubber', color: 0x161616, fixed: 'snapped through the rim', says: 'its valve (a TR413 snap-in, typical)' })); }
  // (its face is the rim's own: an alloy wheel's spokes are cast with its barrel, a steel wheel's disc welded into it, a
  // wire wheel's spokes laced into it; each taken into the rim's frame, turned a quarter about x as the rim is, so what
  // stands out at +z in the wheel stands out at +z still, on its outer face)
  const ownFace = (f: Part): Part => ({ ...f, at: [f.at![0], f.at![2], -f.at![1]] as V3, rot: f.rot ? [f.rot[0] - PI / 2, f.rot[1], f.rot[2]] as V3 : [-PI / 2, 0, 0] });
  parts.push(P(`${Math.round(t.rim / IN)} in ${o.style === 'steel' ? 'steel' : o.style === 'wire' ? 'spoked' : 'alloy'} rim`, { lathe: rimProf }, [0, 0, 0], { rot: [PI / 2, 0, 0], passes: ['tyre valve'], mat: metal, color: o.color ?? (o.style === 'steel' ? 0x3a3a3a : 0xc8ccd2), shell: metal.startsWith('al') ? (o.style === 'wire' ? 0.003 : 0.008) : 0.004, finish: o.style === 'steel' ? 'paint' : 'brushed', parts: face.map(ownFace) }));
  const shaftD = o.single ? 0.022 : Math.max(0.03, t.rim * 0.12), studs: Iface[] = o.lugs ? [{ kind: 'studs', role: 'provides', d: o.lug / 1000, n: o.lugs }] : [];
  // (the hub's face where the wheel is clamped on, behind the wheel's own centre: it does not stand through it)
  // (and behind the brake disc's hat, which is clamped between them, where it has a disc)
  // (a flange the wheel is clamped to, and behind it the barrel it turns on, in its knuckle's bearing where it has one)
  const hubFace = cn.hubFace, hubR2 = cn.hubR, rb2 = Math.max(0.012, hubR2 * 0.45), flangeT = 0.01;
  // (its spigot through the disc's hat and the wheel's centre bore, as a hub-centric wheel is centred on it; its bore
  // the size of what turns it, its nut on its spigot's face)
  const rSp = Math.min(rb, rb2) - 0.001, bore = o.bore ?? 0, zSp = o.bore ? cn.zSpig : hubFace;
  if (o.bore) parts.push(P('axle nut', { cyl: [(o.bore * 2 * 1.25) / Math.sqrt(3), 0.014] }, [0, 0, zSp + 0.007], { rot: [PI / 2, 0, 0], facets: 6, mat: 'steel-alloy', color: 0x9a9ea4, finish: 'plate', passes: ['outer joint stub', 'stub spindle right', 'stub spindle left'], fixed: 'run on its stub against the spigot\'s face, and staked', says: `its axle nut, M${Math.round(o.bore * 2000)} × 1.5, staked (typical)` }));
  parts.push(P('hub', { lathe: o.bore ? [[bore, zSp], [rSp, zSp], [rSp, hubFace], [hubR2, hubFace], [hubR2, hubFace - flangeT], [cn.rB, hubFace - flangeT - 0.004], [cn.rB, cn.hubIn], [bore, cn.hubIn], [bore, zSp]] : [[0, hubFace], [hubR2, hubFace], [hubR2, hubFace - flangeT], [cn.rB, hubFace - flangeT - 0.004], [cn.rB, cn.hubIn], [0, cn.hubIn]] }, [0, 0, 0], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x6a6a6a, finish: 'cast', passes: ['outer joint stub', 'stub spindle right', 'stub spindle left', 'front axle', 'rear axle', ...Array.from({ length: o.lugs }, (_, i) => `wheel stud ${i + 1}`)], iface: [{ kind: 'shaft', role: 'requires', d: shaftD, says: 'its bore, for the axle' }, ...studs] }));
  // its nuts on the wheel's face (a lug nut: 1.75 d across its flats, 1.6 d tall, as Toyota's M12 × 1.5 are 21 mm
  // across and about 19 mm tall, typical), each on a stud pressed through the hub's flange, out through the disc's hat
  // and the wheel, its tip 3 mm past its nut
  const nutH = o.lug * 0.0016, nutR = (o.lug * 0.00175) / Math.sqrt(3), padT = o.style === 'steel' || o.style === 'disc' ? 0.004 : 0, nutZ = o.style === 'spokes' || o.style === 'split' ? zc : o.style === 'steel' || o.style === 'disc' ? zMount + padT : t.W * 0.25 - 0.001;
  const rimName = `${Math.round(t.rim / IN)} in ${o.style === 'steel' ? 'steel' : o.style === 'wire' ? 'spoked' : 'alloy'} rim`;
  for (let i = 0; i < o.lugs; i++) {
    const a = (i / o.lugs) * 2 * PI + PI / 2, z0 = hubFace - flangeT, z1 = nutZ + nutH + 0.003;
    parts.push(P(`wheel nut ${i + 1}`, { cyl: [nutR, nutH] }, [Math.cos(a) * pcd, Math.sin(a) * pcd, nutZ + nutH / 2], { rot: [PI / 2, 0, 0], facets: 6, mat: 'steel-alloy', color: 0xb0b4ba, finish: 'plate', item: `nut M${o.lug}`, joins: ['wheel disc', 'centre pad', rimName], passes: [`wheel stud ${i + 1}`], iface: [{ kind: 'studs', role: 'requires', d: o.lug / 1000 }] }));
    if (o.knuckle || o.style === 'steel' || o.style === 'disc') parts.push(P(`wheel stud ${i + 1}`, { cyl: [o.lug / 2000, z1 - z0] }, [Math.cos(a) * pcd, Math.sin(a) * pcd, (z0 + z1) / 2], { rot: [PI / 2, 0, 0], mat: 'steel-alloy', color: 0x8a8e92, finish: 'plate', item: `stud M${o.lug}x1.5`, fixed: 'pressed into the hub\'s flange, knurled under its head', says: `a wheel stud, M${o.lug} × 1.5 (Toyota's thread), pressed into the hub` }));
  }
  if (o.brake?.kind === 'disc') {
    const { r, th, zD, rh, sideIn, sideOut } = cn;
    // a disc as it is cast: its friction ring, and its hat standing out from the ring's inner edge to its mounting face,
    // clamped between the hub and the wheel (6 mm, typical), the hub inside the hat; its caliper astride the ring's edge
    // behind the axle (as a front-drive car's are, clear of its drive shaft ahead), mirrored side for side: a sliding
    // caliper of cast iron, its piston half inboard and its finger half outboard, a bridge over the ring between them,
    // as long round the ring as 1.1 times its radius (a 275 mm disc's about 150 mm, typical of one piston)
    const yM = zMount - zD, hatT = 0.006;
    parts.push(P(`${o.brake.vented ? 'vented ' : ''}brake disc ${Math.round(o.brake.d * 1000)} mm`, { lathe: [[rb2, yM], [rh + 0.004, yM], [rh + 0.004, th / 2], [r, th / 2], [r, -th / 2], [rh, -th / 2], [rh, yM - hatT], [rb2, yM - hatT], [rb2, yM]] }, [0, 0, zD], { rot: [PI / 2, 0, 0], mat: 'cast-iron', color: 0x7a7a7a, fill: o.brake.vented ? 0.6 : 1, finish: 'cast', item: o.brake.d < 0.25 ? 'brake-disc' : undefined, fixed: 'clamped between its hub and the wheel by the wheel\'s nuts', passes: Array.from({ length: o.lugs }, (_, i) => `wheel stud ${i + 1}`) }));
    // (a small disc's, as a quad's or a kart's, of aluminium, typical)
    const { cw, ch, rc, ca0, legW } = cn, ca = o.left ? PI - ca0 : ca0, cc = 0x34373a, cm = r < 0.125 ? 'al-a380' : 'cast-iron';
    const at2 = (rad: number): V3 => [Math.cos(ca) * rad, Math.sin(ca) * rad, 0];
    // (its carrier: two legs just past the caliper's ends, each from the knuckle's ear (its face at armOut) to over the
    // ring's edge, the caliper sliding on a guide pin in each (the pins not drawn); bolted to the ears, it does not turn)
    // (laid out in the caliper's own frame, turned to its angle: radially out along x, round the ring along y, so each leg
    // stands flush against the caliper's end)
    const inCal = (x: number, y2: number, z: number): V3 => [Math.cos(ca) * x - Math.sin(ca) * y2, Math.sin(ca) * x + Math.cos(ca) * y2, z];
    const carrier: Part[] = o.knuckle ? [-1, 1].flatMap((e) => {
      const yL = e * (ch / 2 + legW / 2), zIn = cn.zA + cn.armT / 2 - zD, zRing = -(th / 2 + 0.0015), zOut = th / 2 + 0.0015 + sideOut, r0 = rc - cw / 2, r1 = r + 0.016;
      return [P('carrier leg', { box: [r1 - r0, legW, zRing - zIn] }, inCal((r0 + r1) / 2, yL, (zIn + zRing) / 2), { rot: [0, 0, ca], mat: 'cast-iron', color: 0x2e3032, finish: 'cast' }),
        P('carrier bridge', { box: [r1 - r - 0.004, legW, zOut - zRing] }, inCal((r + 0.004 + r1) / 2, yL, (zRing + zOut) / 2), { rot: [0, 0, ca], mat: 'cast-iron', color: 0x2e3032, finish: 'cast' })];
    }) : [];
    parts.push(P('brake caliper', undefined, [0, 0, zD], { mat: cm, color: cc, finish: 'cast', item: o.brake.d < 0.25 ? 'brake-caliper-disc' : undefined, ...(o.knuckle ? { link: name.replace(/ wheel$/, ' upright') } : { link: '' }), says: `a sliding caliper of ${cm === 'cast-iron' ? 'cast iron' : 'aluminium'}, one piston (typical)${o.knuckle ? ', on its carrier, bolted to two ears of the knuckle' : ''}`, parts: [
      ...(carrier.length ? [P('caliper carrier', undefined, [0, 0, 0], { mat: 'cast-iron', color: 0x2e3032, finish: 'cast', says: 'its carrier (bracket): cast iron, bolted to the knuckle\'s two ears, the caliper sliding on its two guide pins (typical)', parts: carrier })] : []),
      P('caliper piston half', { box: [cw, ch, sideIn] }, [...at2(rc).slice(0, 2), -(th / 2 + 0.0015 + sideIn / 2)] as V3, { rot: [0, 0, ca], mat: cm, color: cc, finish: 'cast' }),
      P('caliper finger half', { box: [cw * 0.8, ch * 0.9, sideOut] }, [...at2(rc + cw * 0.1).slice(0, 2), th / 2 + 0.0015 + sideOut / 2] as V3, { rot: [0, 0, ca], mat: cm, color: cc, finish: 'cast' }),
      P('caliper bridge', { box: [0.016, ch * 0.7, th + 0.003 + sideIn + sideOut] }, [...at2(r + 0.0015 + 0.008).slice(0, 2), (sideOut - sideIn) / 2] as V3, { rot: [0, 0, ca], mat: cm, color: cc, finish: 'cast' })] }));
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
const floorTop = (m: Machine, x: number): number => { const fl = floorOf(m), pk = packOf(m), ov = overAxle(m), base = fl && x < fl.kick ? fl.top : pk ? pk.y0 + pk.h + 0.005 + 0.08 : m.clearance + 0.1; const bf = ov && pk && x - 0.45 < pk.x0 ? beamFloor(m, ov.x1) : null; return ov && x - 0.45 < ov.x1 && x + 0.25 > ov.x0 ? Math.max(base, ov.top) : bf ? Math.max(base, bf) : base; };
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
  const bayBack = Math.min(fa.x - 0.27, ...out.filter((p) => /gearbox|engine|rack|anti-roll|subframe cross|electric motor/.test(p.name)).map((p) => backOf(p) - 0.03));
  const x = Math.max(xWs + 0.05, bayBack), hoods = out.filter((p) => p.name === 'hood' && p.shape && 'surf' in p.shape).flatMap((p) => patchPoints((p.shape as { surf: Patch }).surf, 40, 20));
  const hoodAt = (xx: number) => { const near = hoods.filter((q) => Math.abs(q[0] - xx) < 0.04 && Math.abs(q[2]) < 0.3); return near.length ? Math.min(...near.map((q) => q[1])) : m.lines!.belt * m.H; };
  const yT = c + 0.35, yC = Math.min(hoodAt(x), hoodAt(xWs + 0.02)) - 0.025 - 0.004, half = (y: number) => Math.max(0.2, Math.min(zWb, Number.isFinite(inside(x, y)) ? inside(x, y) - 0.005 : zWb));
  const w = Math.min(half(yT), half((yT + yC) / 2), half(yC)), floorTop = c + 0.1, steel = { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0008, make: 'pressed' as const, finish: 'paint' as const };
  // (a cab-forward body, its windscreen's base over or ahead of what is under its front, as a van's, has its bulkhead
  // round its engine under its cab: not made here)
  if (yC - yT < 0.1 || x - toe < 0.05 || xWs + 0.05 > bayBack) return [];
  const slope = Math.atan2(yT - floorTop, x - toe), Lt = Math.hypot(yT - floorTop, x - toe);
  return [P('bulkhead', undefined, [0, 0, 0], { says: 'its dash panel and toe board, the firewall between its engine bay and its cabin, and the cowl under its windscreen: pressed steel, about 0.8 mm (typical)', parts: [
    P('toe board', { box: [Lt, 0.004, 2 * w] }, [(x + toe) / 2, (yT + floorTop) / 2, 0], { rot: [0, 0, slope], ...steel, joins: ['floor pan', 'floor pan left', 'floor pan right', 'tunnel top', 'dash panel'] }),
    P('dash panel', { box: [0.004, yC - yT, 2 * w] }, [x, (yT + yC) / 2, 0], { ...steel, joins: ['toe board', 'cowl panel', 'front inner wheelhouses'] }),
    P('cowl panel', { box: [x - xWs - 0.02, 0.004, 2 * w] }, [(x + xWs + 0.02) / 2, yC, 0], { ...steel, joins: ['dash panel', 'windscreen'] })] })];
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
  // pedestrians' heads)
  const pw = powerAt(m), es0 = engineSize(pw, true).s, es: V3 = across(m) ? [es0[2], es0[1], es0[0]] : es0, ez = pw.z ?? 0, inside: KeepOut[] = pw.kind === 'electric' ? [] : [{ name: 'engine', min: [pw.x - es[0] / 2, pw.y! - es[1] / 2, ez - es[2] / 2], max: [pw.x + es[0] / 2, pw.y! + es[1] / 2, ez + es[2] / 2], room: 0.05, why: 'room over the engine under its hood (about 50 mm, typical)' }];
  // and each strut's top, in its tower under the hood (suspension() puts it where it is)
  for (const a of m.axles) if (a.susp === 'strut' && a.track > 0) { const st = strutOf(a, tyreOf(a.tyre)!, m), top = st.top + 0.045; inside.push({ name: 'strut tower', min: [a.x - 0.09, top - 0.05, st.zt - 0.09], max: [a.x + 0.09, top + 0.09 * st.lean, st.zt + 0.09], room: 0.03, why: 'room over the strut towers (about 30 mm, typical)' }, { name: 'strut', min: [a.x - 0.07, st.yb, st.zt - 0.07], max: [a.x + 0.07, st.top, st.zb + 0.025], room: 0.01, why: 'the strut and its spring in the wheelhouse, behind the liner (typical)', in: 'wheelhouse' }); }
  return { L, W, H: m.H, c, lines: m.lines!, wheels, color: m.color, inside };
}
function body(m: Machine, ln: Lines): Part[] {
  const plan = bodyPlanOf(m), { L, W, wheels } = plan, c = m.clearance, out = bodyPanels(plan);
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
  return P(nm, undefined, [s.x, s.y, s.z], { parts: [
    loft('cushion', [{ x: -0.22, w: wd, lo, hi: 0.04, n: 4 }, { x: 0.25, w: wd, lo, hi: 0.02, n: 4 }], 'foam', col, { finish: 'weave', joins: ['seat frame', 'rear floor', 'floor pan', 'floor pan left', 'floor pan right'] }),
    // (no taller than the room under the roof or the back glass over it, as the body is made)
    loft('backrest', [{ x: -0.33, w: wd, lo: 0, hi: Math.max(0.3, Math.min(0.62, back)), n: 4 }, { x: -0.226, w: wd * 0.95, lo: 0.02, hi: Math.max(0.32, Math.min(0.64, back + 0.02)), n: 4 }], 'foam', col, { rot: [0, 0, 0.18], finish: 'weave' }),
    ...(onFloor ? [] : [P('seat frame', { box: [0.5, 0.04, wd * 1.8] }, [0, -0.13, 0], { mat: 'steel-low', color: 0x2a2a2a, fill: 0.15, joins: ['seat rails'] })]),
    // down to the floor it is bolted to, on its rails (a car's seat slides on two, typical)
    ...(floor !== undefined && !onFloor && s.y - 0.15 - floor > 0.01 ? [P('seat rails', { box: [0.42, s.y - 0.15 - floor, wd * 1.5] }, [0, -0.15 - (s.y - 0.15 - floor) / 2, 0], { mat: 'steel-low', color: 0x1e1e1e, fill: 0.06, joins: ['floor pan', 'floor pan left', 'floor pan right', 'rear floor'], says: 'the rails it slides on, bolted to the floor (typical)' })] : []),
  ] });
};
/** An engine sized from its displacement: its mass about 0.055 kg per cc with an aluminium block, 0.09 with cast iron,
 *  and its size that mass at its bulk density (its mass over its bounding box: about 360 kg/m³ for a small single,
 *  470 for a car's four, 870 for a truck's diesel; estimates from a Honda GX270, a 2.0 L four and a Detroit DD15), so
 *  the masses of its parts are its mass shared out. */
/** An engine's mass and its box (its maker's where published, else from its displacement at its bulk density). */
export function engineSize(p: Power, alu: boolean): { kg: number; s: V3 } {
  if (p.kind === 'electric') return { kg: 0, s: [0.3, 0.26, 0.26] };
  const cc = p.cc ?? 1000, kg = p.kg ?? cc * (alu ? 0.055 : 0.09), bulk = p.kind === 'diesel' ? 870 : cc < 1000 ? 380 : 470, side = Math.cbrt(kg / bulk);
  // an inline engine as long as its cylinders in a row (each bore and a quarter of it again for its walls and coolant,
  // its bore from its displacement a cylinder at a stroke 1.15 times it, typical of modern engines) and its timing drive,
  // about 140 mm; as tall as its mass at its bulk density would make a cube; as wide as what is left, no wider than a
  // tenth more (its manifolds): an estimate where its maker gives no size
  if (p.kind === 'inline' && !p.box) { const nc = cc <= 1000 ? 3 : cc <= 2600 ? 4 : 6, bore = Math.cbrt((4 * cc * 1e-6) / nc / (Math.PI * 1.15)), Lc = nc * bore * 1.25 + 0.14; return { kg, s: [Lc, side, Math.max(0.35, Math.min(side * 1.1, kg / bulk / (Lc * side)))] }; }
  return { kg, s: p.box ?? ([side * 1.05, side, side * 0.95] as V3) };
}
function engine(p: Power, alu: boolean, driven = 'rear axle', across = false): Part {
  if (p.kind === 'electric') return P(`electric motor (${p.kW} kW)`, { cyl: [0.13, 0.3] }, [p.x, p.y ?? 0.4, p.z ?? 0], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x8a8a90, fill: 0.55, says: p.says });
  const cc = p.cc ?? 1000, { kg, s } = engineSize(p, alu), parts: Part[] = [];
  const fins = (r: number, h: number): [number, number][] => { const out: [number, number][] = [[0, -h / 2]]; const n = Math.max(4, Math.round(h / 0.012)); for (let i = 0; i <= n; i++) { const y = -h / 2 + (h * i) / n; out.push([i % 2 ? r : r * 1.3, y]); } out.push([0, h / 2]); return out; };
  if (p.kind === 'single' || p.kind === 'twin') {
    parts.push(P('crankcase', { box: [s[0] * 0.75, s[1] * 0.45, s[2] * 0.4] }, [0, -s[1] * 0.27, 0], { mat: 'al-a380', color: 0x8c8e90, kg: kg * 0.5, finish: 'cast', iface: [{ kind: 'shaft', role: 'provides', d: 0.0254, says: 'its output shaft (a 1 in keyed shaft, typical of small engines)' }] }));
    const n = p.kind === 'twin' ? 2 : 1;
    for (const k of n === 2 ? [-1, 1] : [0]) parts.push(P(n === 2 ? `cylinder ${k > 0 ? 2 : 1}` : 'cylinder', { lathe: fins(s[0] * 0.17, s[1] * 0.42) }, [k * s[0] * 0.18, s[1] * 0.12, 0], { rot: [0, 0, n === 2 ? k * 0.78 : -0.3], mat: 'al-a380', color: 0x9a9c9e, kg: (kg * 0.22) / n, finish: 'cast', says: 'its cooling fins (about 2 fins per 25 mm, typical)', parts: [P('cylinder head', { box: [s[0] * 0.3, s[1] * 0.14, s[2] * 0.42] }, [0, s[1] * 0.27, 0], { mat: 'al-a380', color: 0x2a2a2a, kg: (kg * 0.1) / n, finish: 'cast' })] }));
    parts.push(P('air cleaner', { cyl: [s[0] * 0.16, s[2] * 0.3] }, [-s[0] * 0.3, s[1] * 0.2, s[2] * 0.38], { rot: [PI / 2, 0, 0], mat: 'abs', color: 0x1a1a1a, kg: kg * 0.04, finish: 'texture' }));
    parts.push(P('recoil starter or cover', { cyl: [s[1] * 0.26, s[2] * 0.08] }, [s[0] * 0.05, -s[1] * 0.2, -s[2] * 0.24], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: p.cc && p.cc < 400 && p.kW < 10 ? 0xc81e1e : 0x2a2a2a, kg: kg * 0.06, finish: 'paint' }));
    parts.push(P('muffler', { cyl: [s[1] * 0.12, s[2] * 0.4] }, [s[0] * 0.38, s[1] * 0.1, 0], { rot: [PI / 2, 0, 0], mat: 'steel-low', color: 0x2a2a2a, kg: kg * 0.08, finish: 'paint' }));
  } else {
    // (each stacked on the face of the one under it, as they are bolted: the head on the block's deck, the cover on the
    // head, the pan under the block, the intake on its side; none sunk in another)
    const bH = s[1] * 0.55, bY = -s[1] * 0.12, deck = bY + bH / 2, foot = bY - bH / 2, hH = s[1] * 0.2, cH = s[1] * 0.08, pH = s[1] * 0.16;
    parts.push(P('engine block', { box: [s[0], bH, s[2] * 0.75] }, [0, bY, 0], { mat: alu ? 'al-a380' : 'cast-iron', color: alu ? 0x8c8e90 : 0x4a4c4e, kg: kg * 0.55, finish: 'cast' }));
    parts.push(P('cylinder head', { box: [s[0] * 0.95, hH, s[2] * 0.6] }, [0, deck + hH / 2, 0], { mat: alu ? 'al-a380' : 'cast-iron', color: alu ? 0x9a9c9e : 0x50525a, kg: kg * 0.18, finish: 'cast' }));
    parts.push(P('cam cover', { box: [s[0] * 0.9, cH, s[2] * 0.45] }, [0, deck + hH + cH / 2, 0], { mat: 'abs', color: 0x1a1a1a, kg: kg * 0.02, finish: 'texture' }));
    parts.push(P('oil pan', { box: [s[0] * 0.85, pH, s[2] * 0.6] }, [0, foot - pH / 2, 0], { mat: 'steel-low', color: 0x2a2a2a, kg: kg * 0.05, finish: 'paint' }));
    parts.push(P('intake and accessories', { box: [s[0] * 0.5, s[1] * 0.35, s[2] * 0.2] }, [0, 0.05 * s[1], s[2] * 0.375 + s[2] * 0.1], { mat: 'al-a380', color: 0x3a3a3a, kg: kg * 0.2, finish: 'cast' }));
  }
  const drive: Iface[] = p.torque && p.ratio ? [{ kind: 'drive', role: 'provides', torque: p.torque * p.ratio, to: driven, says: p.driveSays }] : [];
  return P(`${p.kind === 'diesel' ? 'diesel' : 'petrol'} engine (${cc} cc, ${p.kW} kW)`, undefined, [p.x, p.y ?? 0.4, p.z ?? 0], { parts, iface: drive, ...(across ? { rot: [0, PI / 2, 0] as V3 } : {}), says: `${p.says}; about ${Math.round(kg)} kg${p.kg ? '' : ' (an estimate from its displacement)'}${across ? '; set across the car, its gearbox at its left end (typical of front-wheel drive)' : ''}` });
}

/** An axle hung from its frame (at the frame's half-width fz and height fy where the axle is), by its kind. */
function suspension(a: Axle, t: Tyre, f: { z: number; y: number }, end: string, m: Machine): Part[] {
  const out: Part[] = [], y = t.D / 2, hub = a.track / 2 - t.W / 2 - 0.035, k = a.susp ?? 'rigid', dark = 0x2a2a2a;
  for (const s of [-1, 1]) {
    const side = `${end} ${s > 0 ? 'right' : 'left'}`, z = s * hub, zf = s * f.z;
    if (k === 'rigid') out.push(P(`bearing hanger ${side}`, { box: [0.08, Math.max(0.03, Math.abs(f.y - y) + 0.04), 0.05] }, [a.x, (f.y + y) / 2, zf], { mat: 'steel-low', color: dark, finish: 'paint', item: 'bearing 6206', says: 'a hanger holding the axle in a ball bearing, bolted to the frame (typical)' }));
    else if (k === 'pivot') { if (s > 0) out.push(P(`axle pivot ${end}`, { box: [0.1, Math.max(0.03, Math.abs(f.y - y) + 0.05), 2 * f.z + 0.04] }, [a.x, (f.y + y) / 2, 0], { mat: 'steel-low', color: dark, fill: 0.12, finish: 'paint', says: 'the axle pivots on one pin at its middle, so all four wheels keep the ground (typical)' })); }
    else if (k === 'strut' || k === 'wishbone') {
      // the corner as it is built: a knuckle round the hub's barrel (src cornerOf), its arms to the frame, its spring and
      // damper up to the body or the frame; on a unibody with struts, the subframe the arms pivot on, the steering rack
      // on it with a tie rod to each knuckle, and the anti-roll bar Toyota (and most makers) list, linked to each strut
      const cn = cornerOf(t, { ...m.rims, brake: a.brake }, true), zW = a.track / 2, X = (dx: number) => (s > 0 ? dx : -dx), shellStrut = k === 'strut' && m.frame === 'shell';
      const st = strutOf(a, t, m), zA = cn.zA, armT = cn.armT, iron = { mat: 'cast-iron', color: 0x3a3a3a, finish: 'cast' } as const;
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
        P('ball joint boss', { box: [0.045, 0.045, 0.045] }, [0, ball[1] + 0.008, zA], { ...iron, joint: 'ball', passes: [`lower arm ${side}`, `lower arm ${side} pressing`], says: 'the lower ball joint\'s seat: its stud in a taper in the knuckle (typical)' }),
      ];
      // (a strut's foot: its tube's bracket, welded to the tube outboard of it, clamps the knuckle's top arm; the arm goes
      // up and in from the upright to it, inside it)
      const footAt = (ly: number, lz: number): V3 => { const th = -s * Math.atan(st.lean); return [a.x, st.yb + ly * Math.cos(th) - lz * Math.sin(th), s * st.zb + ly * Math.sin(th) + lz * Math.cos(th)]; };
      const brk = footAt(0.04, s * 0.038), brkLocal: V3 = [0, brk[1] - y, s * brk[2] - zW];
      if (k === 'strut') kp.push(tube('strut arm', 0.014, [[0, 0.075, zA], [0, brkLocal[1] - 0.01, brkLocal[2] + 0.008]], 'cast-iron', 0x3a3a3a, { finish: 'cast' }));
      else kp.push(P('upper ball joint boss', { box: [0.045, 0.03, 0.045] }, [0, up[1], zA], { ...iron, joint: 'ball', passes: [`upper arm ${side}`] }));
      // (its two caliper ears, cast with it: from inside the upright out to where its caliper's carrier legs stand, in
      // the caliper's own frame (cornerOf), mirrored on the left as the wheel's caliper is)
      if (a.brake?.kind === 'disc' && cn.r > 0) { const ca = s < 0 ? PI - cn.ca0 : cn.ca0, r1 = cn.r + 0.016; for (const e of [-1, 1]) { const yL = e * (cn.ch / 2 + cn.legW / 2); kp.push(P('caliper ear', { box: [r1, cn.legW, armT] }, [Math.cos(ca) * (r1 / 2) - Math.sin(ca) * yL, Math.sin(ca) * (r1 / 2) + Math.cos(ca) * yL, zA], { rot: [0, 0, ca], ...iron })); } }
      // (its steering arm back from the upright's edge, clear of the hub's barrel through it)
      if (shellStrut) kp.push(P('steering arm', { box: [0.095, 0.03, armT] }, [X(-0.0875), 0.03, zA], { ...iron, passes: [`tie rod ${side}`] }));
      const wheelName = `${end} ${s > 0 ? 'right' : 'left'} wheel`, upright = `${side} upright`;
      // (the knuckle, its strut's tube and its caliper one link: they steer and rise together, the wheel turning in it)
      out.push(P(`knuckle ${side}`, undefined, [a.x, y, s * zW], { mat: 'cast-iron', movesWith: wheelName, link: upright, ...(s < 0 ? { rot: [0, PI, 0] as V3 } : {}), says: 'the upright the wheel turns on: cast iron, its bearing round the hub, its arms to the strut, the lower ball joint and the steering (typical)', parts: kp }));
      const B: V3 = [a.x, y + ball[1], s * (zW + zA)];
      if (k === 'strut') {
        // the strut, from its foot clamped on the knuckle up to its top mount under its tower: its damper's tube up to its
        // spring's seat, its rod from there, the spring wound round both from the seat up to the mount
        const Lt = (st.top - 0.005 - st.yb) / Math.cos(Math.atan(st.lean)), seat = (st.ySeat - st.yb) / Math.cos(Math.atan(st.lean)), Ls = Math.max(0.12, Lt - 0.03 - seat);
        out.push(P(`strut ${side}`, undefined, [a.x, st.yb, s * st.zb], { mat: 'steel-alloy', link: upright, rot: [-s * Math.atan(st.lean), 0, 0], says: 'a MacPherson strut: its damper, its spring round it, its top mount bolted under its tower (typical)', parts: [
          // (its tube, the bracket on it, its spring and the seat steer with the wheel; its rod and top mount stay with the body)
          P('damper tube', { cyl: [0.025, seat + 0.01] }, [0, (seat + 0.01) / 2, 0], { mat: 'steel-alloy', color: 0x3a3a3a, fill: 0.5, finish: 'paint', movesWith: wheelName }),
          P('strut bracket', { box: [0.05, 0.07, 0.03] }, [0, 0.04, s * 0.038], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', passes: ['strut arm'], fixed: 'welded to its tube', movesWith: wheelName, says: 'welded to its tube, clamping the knuckle with two bolts (typical)' }),
          P('spring seat', { cyl: [0.064, 0.004] }, [0, seat - 0.002, 0], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', passes: ['damper tube'], fixed: 'welded to its tube', movesWith: wheelName }),
          P('piston rod', { cyl: [0.011, Lt - seat - 0.01] }, [0, (seat + 0.01 + Lt) / 2, 0], { mat: 'steel-alloy', color: 0xb0b4ba, finish: 'chrome', link: `${side} strut rod`, joint: 'slide', says: 'its damper\'s rod, sliding and turning in the tube\'s seal (typical)' }),
          P('top mount', { cyl: [0.064, 0.03] }, [0, Lt - 0.015, 0], { mat: 'rubber', color: 0x161616, finish: 'texture', passes: ['piston rod'], link: `${side} strut rod`, joint: 'mount', says: 'its top mount: a bearing in rubber, bolted under the tower (typical)' }),
          { ...coil('coil spring', 0.054, 0.006, Ls, 6, { item: `spring d12 D120 L${Math.round(Ls * 1000)} n6`, fixed: 'seated between its seat and its top mount', movesWith: wheelName, joint: 'spring', says: 'a coil spring round the damper, wound clear of it, seated over the tyre (typical)' }), at: [0, seat + Ls / 2, 0] as V3 }] }));
        // (its top plate from the inner wheelhouse out, as the apron's top, where the body has one: not across it)
        const zWb = Math.min(a.track / 2 - t.W / 2 - 0.04, a.track / 2 - (t.W / 2) * Math.cos(travelOf(a).steer) - (t.D / 2 + 0.03) * Math.sin(travelOf(a).steer) - 0.025), tz0 = m.lines ? Math.max(st.zt - 0.09, zWb + 0.003) : st.zt - 0.09, tz1 = st.zt + 0.09;
        // (square to the strut, as its top mount sits under it: leaning with it)
        out.push(P(`strut tower ${side}`, { box: [0.18, 0.05, tz1 - tz0] }, [a.x, st.top + 0.02 + ((tz0 + tz1) / 2 - st.zt) * st.lean, s * (tz0 + tz1) / 2], { rot: [-s * Math.atan(st.lean), 0, 0], mat: 'steel-low', color: m.color, shell: 0.0015, make: 'pressed', finish: 'paint', passes: ['piston rod', 'top mount'] }), ...(m.lines ? [] : [P(`strut tower wall ${side}`, { box: [0.18, Math.max(0.05, st.top - Math.max(f.y, y + 0.05)), 0.02] }, [a.x, (st.top + Math.max(f.y, y + 0.05)) / 2, s * (st.zt - 0.1)], { mat: 'steel-low', color: m.color, shell: 0.0015, make: 'pressed', finish: 'paint' })]));
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
        // (each bush in its pocket in the subframe's side, half in it; the arm's legs end in their bushes)
        const F: V3 = [a.x + 0.03, yP, s * zP], R2: V3 = [a.x - 0.3, yP, s * (zP + 0.04)], sub = `subframe side ${s > 0 ? 'right' : 'left'}`, Bj: V3 = [B[0], y + ball[1] + 0.008 - 0.0225 - 0.015, B[2]];
        out.push(P(`lower arm ${side}`, undefined, [0, 0, 0], { link: `${side} lower arm`, says: 'its lower control arm, pressed steel, an L on two rubber bushes (typical)', parts: [
          // (one pressing, an L: from its front bush out to the ball joint and back in to its rear bush)
          tube(`lower arm ${side} pressing`, 0.014, [[F[0], F[1], s * (zP + 0.022)], Bj, [a.x - 0.12, yP + 0.003, s * (zP + 0.12)], R2], 'steel-low', dark, { finish: 'paint' }),
          // (its ball joint pressed into the arm's corner under the knuckle, its stud up into the knuckle's boss)
          P('lower ball joint', { cyl: [0.022, 0.03] }, Bj, { mat: 'steel-alloy', color: 0x3a3c3e, finish: 'plate', joint: 'ball', passes: [`lower arm ${side} pressing`], says: 'its lower ball joint: a ball stud in a housing pressed into the arm, the stud in a taper in the knuckle (typical)' }),
          P('front bush', { cyl: [0.026, 0.05] }, F, { rot: [0, 0, PI / 2], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'bush', passes: [`lower arm ${side} pressing`, sub] }),
          P('rear bush', { cyl: [0.034, 0.05] }, R2, { rot: [PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'bush', passes: [`lower arm ${side} pressing`, sub] })] }));
        // the tie rod from the rack's end (its bellows) out to the steering arm
        const zH = zW + zA - 0.36, rackY = y + 0.03, rackX = a.x - 0.14;
        out.push(tube(`tie rod ${side}`, 0.008, [[rackX, rackY, s * (zH + 0.06)], [a.x - 0.115, rackY, s * (zW + zA)]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', link: `${side} tie rod`, joint: 'ball', says: 'its tie rod: a ball joint at each end, its inner one in the rack\'s bellows, its outer one\'s stud in the steering arm (typical)' }));
        // the anti-roll bar's link, from its arm's end up to a bracket on the strut's tube behind it
        const lz = st.zAt(st.yb + 0.12), lt = footAt(0.12 / Math.cos(Math.atan(st.lean)), 0);
        out.push(tube(`stabiliser link ${side}`, 0.006, [[a.x - 0.05, yP + 0.07, s * lz], [a.x - 0.05, lt[1], s * lz]], 'steel-low', dark, { finish: 'paint', link: `${side} stabiliser link`, joint: 'ball', says: 'its link to the anti-roll bar: a ball joint at each end (typical)' }));
        out.push(P(`stabiliser link bracket ${side}`, { box: [0.034, 0.02, 0.02] }, [a.x - 0.042, lt[1] - 0.004, s * lz], { mat: 'steel-low', color: 0x3a3a3a, finish: 'paint', passes: [`stabiliser link ${side}`], link: upright, fixed: 'welded to the strut\'s tube', says: 'welded to the strut\'s tube (typical)' }));
        if (s > 0) {
          // (once: the subframe, under the arms' bushes and behind the engine; the rack on its cross member; the bar behind)
          const zS = zP - 0.01, xC = a.x - 0.15, yC = yP + 0.07;
          out.push(P('front subframe', undefined, [0, 0, 0], { says: 'the front subframe: pressed steel, bolted under the body, the arms, the rack and the anti-roll bar on it (typical)', parts: [
            ...[-1, 1].map((sd) => P(`subframe side ${sd > 0 ? 'right' : 'left'}`, { box: [0.42, 0.05, 0.06] }, [a.x - 0.15, yP, sd * zS], { mat: 'steel-low', color: dark, fill: 0.12, finish: 'paint' })),
            P('subframe cross member', { box: [0.06, 0.04, 2 * zS + 0.06] }, [xC, yC, 0], { mat: 'steel-low', color: dark, fill: 0.15, finish: 'paint' }),
            ...[-1, 1].map((sd) => P('subframe riser', { box: [0.06, yC - 0.02 - (yP + 0.025) + 0.004, 0.06] }, [xC, (yC - 0.02 + yP + 0.025) / 2, sd * zS], { mat: 'steel-low', color: dark, fill: 0.15, finish: 'paint', fixed: 'welded between the side and the cross member' }))] }));
          out.push(P('steering rack', undefined, [0, 0, 0], { mat: 'al-a380', says: 'its rack and pinion, on the subframe, with electric power steering (Toyota: EPS)', parts: [
            tube('rack housing', 0.022, [[rackX, rackY, -zH], [rackX, rackY, zH]], 'al-a380', 0x5a5c5e, { finish: 'cast' }),
            ...[-1, 1].map((sd) => P(`rack bellows ${sd > 0 ? 'right' : 'left'}`, { lathe: [[0.02, -0.005], [0.024, 0.02], [0.018, 0.035], [0.012, 0.06]] }, [rackX, rackY, sd * zH], { rot: [sd * PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'ball', passes: [`tie rod front ${sd > 0 ? 'right' : 'left'}`, 'rack housing'], says: 'its bellows, over the tie rod\'s inner ball joint on the rack\'s end (typical)' })),
            ...[-1, 1].map((sd) => P('rack mount', { box: [0.05, rackY - 0.022 - (yC + 0.02) + 0.004, 0.05] }, [rackX, (rackY - 0.022 + yC + 0.02) / 2, sd * zH * 0.7], { mat: 'al-a380', color: 0x5a5c5e, finish: 'cast', passes: ['rack housing', 'subframe cross member'], fixed: 'bolted to the subframe', says: 'its clamps, bolted to the subframe (typical)' }))] }));
          const xb = xC - 0.03 - 0.011 - 0.004;
          // (behind the cross member to past its ends, then forward to its links)
          out.push(tube('anti-roll bar', 0.011, [[a.x - 0.05, yP + 0.07, -lz], [xb, yP + 0.07, -(zS + 0.07)], [xb, yP + 0.07, zS + 0.07], [a.x - 0.05, yP + 0.07, lz]], 'steel-spring', 0x1c1c1c, { finish: 'paint', link: `${end} anti-roll bar`, passes: [`stabiliser link ${end} right`, `stabiliser link ${end} left`], says: 'its front stabiliser bar (Toyota lists one), clamped to the subframe in two rubber bushes (typical)' }));
          for (const sd of [-1, 1]) out.push(P('anti-roll bar bush', { box: [0.03, 0.036, 0.04] }, [xC - 0.03 - 0.013, yP + 0.07, sd * (zS - 0.12)], { mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'bush', passes: ['anti-roll bar', 'subframe cross member'], says: 'a rubber bush the bar turns in, clamped to the subframe (typical)' }));
        }
      } else for (const dx of [-0.16, 0.16]) out.push(tube(`lower arm ${side}`, 0.012, [[a.x + dx * 0.15, B[1], B[2]], [a.x + dx, f.y, zf]], 'steel-low', dark, { finish: 'paint' }));
    } else if (k === 'beam') {
      out.push(tube(`trailing arm ${side}`, 0.025, [[a.x, y, z * 0.92], [a.x + 0.45, f.y, zf]], 'steel-low', dark, { finish: 'paint' }));
      // (the twist beam between the two arms a third of the way along them, ahead of the wheels' line, as its name says)
      if (s > 0) { const yb = y + (f.y - y) / 3, zb = z * 0.92 + (zf - z * 0.92) / 3; out.push(tube(`twist beam ${end}`, 0.032, [[a.x + 0.15, yb, -(zb - 0.026)], [a.x + 0.15, yb, zb - 0.026]], 'steel-low', dark, { finish: 'paint', says: 'a torsion beam joining its trailing arms, twisting as one wheel rises (typical)' })); }
      { const Ls = Math.max(0.05, f.y + 0.1 - y); out.push({ ...coil(`spring ${side}`, 0.054, 0.006, Ls, 6, { item: 'spring d12 D120 L220 n6' }), at: [a.x - 0.05, (f.y + 0.1 + y) / 2, z * 0.8] as V3 }); }
    } else if (k === 'swingarm') {
      out.push(tube(`swingarm ${side}`, 0.022, [[a.x, y, s * 0.15], [a.x + 0.5, f.y + 0.05, zf * 0.9]], 'steel-low', dark, { finish: 'paint' }));
      const sTop = m.upper ?? f.y + 0.3;
      if (s > 0) out.push(P(`rear shock ${end}`, { cyl: [0.025, Math.max(0.1, sTop - y)] }, [a.x + 0.08, (sTop + y) / 2, 0], { mat: 'steel-alloy', color: 0xc81e1e, fill: 0.5, finish: 'paint' }), P(`axle housing ${end}`, { cyl: [0.06, 0.32] }, [a.x, y, 0], { rot: [PI / 2, 0, 0], mat: 'cast-iron', color: dark, fill: 0.4, finish: 'cast' }));
    } else if (k === 'leaf' || k === 'air') {
      // under each rail: a pack of leaves clamped to the axle, or a trailing beam on an air spring
      const ar = Math.max(0.03, t.rim * 0.12) / 2;
      if (k === 'leaf') for (let l = 0; l < 4; l++) { const L = 1.4 - l * 0.25; out.push(P(`leaf ${l + 1} ${side}`, { box: [L, 0.022, 0.09] }, [a.x, y + ar + 0.011 + (3 - l) * 0.022, zf], { mat: 'steel-spring', color: 0x1a1a1a, finish: 'paint', says: l ? undefined : 'a taper-leaf spring pack (Freightliner Taperleaf, typical of its section)' })); }
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
      const w = wheel(nm, t, { ...m.rims, brake: a.brake, knobs: off, dual: a.dual, single: a.track === 0, left: s < 0, knuckle: kn0, ...(kn0 && a.track > 0 ? { bore: a.drive ? 0.012 : d0 * 0.35 } : {}) });
      const tr = travelOf(a); out.push({ ...w, at: [a.x, t.D / 2, (s * a.track) / 2], rot: s < 0 ? [0, PI, 0] : [0, 0, 0], ...(tr.steer || tr.bump ? { travel: tr } : {}) });
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
      const end2 = a.x === front ? 'front' : a.x === rear ? 'rear' : `axle ${i + 1}`, kn = a.susp === 'strut' || a.susp === 'wishbone', cn = cornerOf(t, { ...m.rims, brake: a.brake }, kn), y = t.D / 2, hubIn = a.track / 2 + cn.hubIn, bootAt = kn ? a.track / 2 + cn.zK0 - 0.003 : hubIn, indep = kn || a.susp === 'beam';
      if (!indep) out.push(tube(nm, r, [[a.x, y, -a.track / 2], [a.x, y, a.track / 2]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', item: `tube ${Math.round(d * 1000)}x${Math.round(wall * 1000)}`, iface: [{ kind: 'shaft', role: 'provides', d }, { kind: 'drive', role: 'requires', torque: T, says: carries }] }));
      else if (a.drive && a.susp !== 'beam') {
        const b = i === 0 && across(m) ? bayOf(m, engineSize(powerAt(m), true).s) : null, zL = b ? b.gb[0] : -0.12, zR = b ? b.gb[1] : 0.12, rs = Math.min(0.014, r * 0.6), sh: Part[] = [];
        const boot = (nm2: string, z0: number, dir: number): Part => P(nm2, { lathe: [[rs + 0.0005, 0], [0.042, 0.03], [0.036, 0.05], [0.03, 0.07], [rs + 0.0005, 0.1]] }, [a.x, y, z0], { rot: [dir * PI / 2, 0, 0], mat: 'rubber', color: 0x161616, finish: 'texture', joint: 'cv', link: `${end2} ${dir * (nm2.startsWith('inner') ? 1 : -1) > 0 ? 'right' : 'left'} drive shaft`, passes: [`drive shaft ${dir * (nm2.startsWith('inner') ? 1 : -1) > 0 ? 'right' : 'left'}`, 'outer joint'], says: 'its joint\'s boot: a rubber bellows over a constant-velocity joint (typical; the inner joint itself, in it, not drawn)' });
        // (its outer joint's bell 2 mm in from the hub's inner end, its stub splined into the hub; its inner end in the
        // gearbox's side, 30 mm in)
        const Lst = cn.zSpig + 0.014 - (cn.hubIn - 0.002);
        const bell = (z: number, dir: number): Part => P('outer joint', { lathe: [[0, 0], [0.014, 0], [0.036, 0.004], [0.04, 0.025], [0.032, 0.045], [rs + 0.004, 0.05]] }, [a.x, y, z], { rot: [dir * PI / 2, 0, 0], mat: 'steel-alloy', color: 0x4a4c4e, finish: 'cast', link: `${end2} ${dir < 0 ? 'right' : 'left'} wheel`, joint: 'cv', fixed: 'splined into the hub, its nut on the hub\'s outer face', says: 'its outer constant-velocity joint (typical)', parts: [P('outer joint stub', { cyl: [0.012, Lst] }, [0, -Lst / 2, 0], { mat: 'steel-alloy', color: 0x4a4c4e, finish: 'plate', fixed: 'forged with its bell', says: 'its splined stub, through the hub\'s bore to its nut on the spigot (typical)' })] });
        for (const sd of [-1, 1]) { const z0 = sd > 0 ? zR : zL, z1 = sd * (Math.abs(sd * bootAt) - 0.04), zb0 = sd * (hubIn - 0.002); sh.push(tube(`drive shaft ${sd > 0 ? 'right' : 'left'}`, rs, [[a.x, y, z0 - sd * 0.03], [a.x, y, z1]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', link: `${end2} ${sd > 0 ? 'right' : 'left'} drive shaft`, iface: [{ kind: 'shaft', role: 'provides', d }] }), boot('inner joint boot', z0 - sd * 0.005, sd), ...(kn ? [bell(zb0, -sd), boot('outer joint boot', zb0 - sd * 0.048, -sd)] : [boot('outer joint boot', sd * bootAt, -sd)])); }
        // (a housing round its gears, mostly hollow: about a fifth of its box is iron, typical)
        if (!b) { const k2 = Math.min(1, t.D / 0.65); sh.push(P('differential', { box: [0.22 * k2, 0.18 * k2, 0.2 * k2] }, [a.x, y, 0], { mat: 'cast-iron', color: 0x3a3a3a, fill: 0.2, finish: 'cast', passes: ['drive shaft left', 'drive shaft right', 'inner joint boot'], says: 'its differential, a cast housing round its gears (typical)' })); }
        out.push(P(nm, undefined, [0, 0, 0], { parts: sh, iface: [{ kind: 'drive', role: 'requires', torque: T, says: carries }] }));
      } else out.push(P(nm, undefined, [0, 0, 0], { parts: [-1, 1].map((sd) => tube(`stub spindle ${sd > 0 ? 'right' : 'left'}`, r * 0.7, [[a.x, y, sd * (a.susp === 'beam' ? (a.track / 2 - t.W / 2 - 0.035) * 0.92 + 0.025 : hubIn - 0.012)], [a.x, y, sd * (hubIn + 0.03)]], 'steel-alloy', 0x3a3a3a, { finish: 'paint', iface: [{ kind: 'shaft', role: 'provides', d }], says: kn ? 'the end of the spindle its hub turns on in the knuckle\'s bearing, its nut on it (typical)' : 'the spindle its wheel turns on, fixed to its arm (typical)' })), ...(a.drive ? { iface: [{ kind: 'drive', role: 'requires', torque: T, says: carries }] } : {}) }));
    }
  });
  const fR = tyres[0]!.D / 2, rR = tyres[tyres.length - 1]!.D / 2, fIn = m.axles[0]!.track / 2 - tyres[0]!.W / 2 - 0.04;
  let frameZ = (_x: number) => half * 0.8; const inner0 = Math.min(...m.axles.filter((a) => a.track > 0).map((a) => a.track / 2 - tyreOf(a.tyre)!.W / 2 - 0.04));
  // the frame
  const fx0 = rear - Math.max(0.1, (m.L / 2 + rear) * 0.6), fx1 = front + Math.max(0.1, (m.L / 2 - front) * 0.5), half = Math.max(0.12, Math.min(...m.axles.filter((a) => a.track > 0).map((a, i) => a.track / 2 - tyres[m.axles.indexOf(a)]!.W * 0.5 - 0.06), m.W / 2 - 0.1));
  if (m.frame === 'tube') {
    const r = 0.016, y = c + r, k5 = m.rails ?? [0.85, 1, 0.7, 0.55, 0.5], rail: [number, number][] = [[fx0, k5[0]], [rear, k5[1]], [front - 0.15, k5[2]], [fx1 - 0.08, k5[3]], [fx1, k5[4]]];
    const railZ = frameZ = (x: number) => { for (let i = 1; i < rail.length; i++) { const [x0, k0] = rail[i - 1]!, [x1, k1] = rail[i]!; if (x <= x1) return half * (k0 + ((k1 - k0) * (x - x0)) / (x1 - x0)); } return half * 0.5; };
    for (const s of [-1, 1]) out.push(tube(`main rail ${s > 0 ? 'right' : 'left'}`, r, rail.map(([x, k], i) => [x, y + (i >= 3 ? (i - 2) * 0.04 : 0), s * half * k] as V3), 'steel-alloy', 0x2a2a2a, { item: 'tube 32x2' }));
    for (const xx of [rear + 0.02, (front + rear) / 2, front - 0.05]) out.push(tube(`cross tube at ${xx.toFixed(2)} m`, r * 0.9, [[xx, y, -railZ(xx)], [xx, y, railZ(xx)]], 'steel-alloy', 0x2a2a2a, { item: 'tube 28x2' }));
    // what the bodywork hangs from: a bracket out from each rail under each pod, the bumpers and the seat
    if (m.upper) for (const sd of [-1, 1]) {
      const yu = m.upper, zu = sd * half * 0.6, xs = [rear - 0.25, rear + 0.15, (front + rear) / 2, front - 0.1, front + 0.25];
      out.push(tube(`upper rail ${sd > 0 ? 'right' : 'left'}`, r, xs.map((xx) => [xx, yu, zu] as V3), 'steel-alloy', 0x2a2a2a, { item: 'tube 32x2' }));
      for (const xx of [rear + 0.15, front - 0.1]) out.push(tube('frame upright', r, [[xx, y, sd * railZ(xx)], [xx, yu, zu]], 'steel-alloy', 0x2a2a2a, { item: 'tube 32x2' }));
      if (sd > 0) for (const xx of [rear - 0.25, rear + 0.08, front + 0.25]) out.push(tube('upper cross tube', r * 0.9, [[xx, yu, -half * 0.6], [xx, yu, half * 0.6]], 'steel-alloy', 0x2a2a2a));
    }
    if (m.extras.includes('pods')) for (const sd of [-1, 1]) for (const xx of [rear + rR + 0.12, front - fR - 0.12]) out.push(tube('pod bracket', 0.01, [[xx, y, sd * railZ(xx)], [xx, y + 0.02, sd * (m.W / 2 - 0.13)]], 'steel-low', 0x2a2a2a));
    if (m.extras.includes('pods')) for (const sd of [-1, 1]) out.push(tube('bumper bracket', 0.012, [[fx0, y, sd * railZ(fx0)], [rear - rR - 0.08, y + 0.05, sd * railZ(fx0)]], 'steel-low', 0x2a2a2a));
  } else if (m.frame === 'ladder') {
    const hR = m.kind === 'truck' ? 0.287 : 0.1, wR = m.kind === 'truck' ? 0.085 : 0.05, y = (m.kind === 'truck' ? tyres[0]!.D * 0.8 : m.extras.includes('deck') ? c + 0.21 : Math.max(c, tyres[0]!.D * 0.42)) + hR / 2, z = m.kind === 'truck' ? 0.43 : half * 0.8;
    const tR = m.kind === 'truck' ? 0.011 : 0.004;
    for (const s of [-1, 1]) out.push(P(`frame rail ${s > 0 ? 'right' : 'left'}`, { box: [fx1 - fx0, hR, tR + wR * 0.25] }, [(fx0 + fx1) / 2, y, s * z], { mat: 'steel-alloy', color: 0x1a1a1a, fill: (tR * (hR + 2 * wR)) / (hR * (tR + wR * 0.25)), finish: 'paint', says: m.kind === 'truck' ? 'C-channel 11 × 85 × 287 mm (Freightliner)' : 'pressed C-channel, 4 mm (typical of small machines)' }));
    for (const xx of [fx0 + 0.1, rear, (front + rear) / 2, front, fx1 - 0.1]) out.push(P('cross member', { box: [0.08, hR * 0.6, 2 * z] }, [xx, y, 0], { mat: 'steel-low', color: 0x1a1a1a, fill: 0.25, finish: 'paint' }));
  } else if (m.frame === 'shell') {
    // a unibody's floor: from its toe board behind the front wheels back under the cabin, a tunnel down its middle for
    // the exhaust, and (where it has a fuel tank) kicked up under the rear seat to a raised floor over the tank, the
    // tank beneath it outside the cabin (typical of a car)
    const inner = Math.min(...m.axles.map((a, i) => a.track / 2 - tyres[i]!.W / 2 - 0.04)), toe = front - tyres[0]!.D / 2 - 0.1, fl = floorOf(m), pk = packOf(m), tun = 0.11, t2 = 0.08;
    const back = fl ? fl.kick : pk ? pk.x0 : rear - 0.3, len = toe - back, says = 'its floor and sills: pressed steel, about 0.9 mm (typical)';
    // (on an electric car, on its battery pack, with no tunnel: nothing runs under its middle)
    if (pk) out.push(P('floor pan', { box: [len, t2, 2 * inner] }, [(toe + back) / 2, pk.y0 + pk.h + 0.005 + t2 / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says: 'its floor, on its battery pack: pressed steel, about 0.9 mm (typical)' }));
    else {
      for (const sd of [-1, 1]) out.push(P(`floor pan ${sd > 0 ? 'right' : 'left'}`, { box: [len, t2, inner - tun] }, [(toe + back) / 2, c + 0.06, (sd * (inner + tun)) / 2], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says }));
      out.push(P('tunnel', undefined, [0, 0, 0], { says: 'the tunnel down the floor\'s middle, the exhaust under it (typical)', parts: [P('tunnel top', { box: [len, 0.02, 2 * tun] }, [(toe + back) / 2, c + 0.18, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed' }), ...[-1, 1].map((sd) => P('tunnel side', { box: [len, 0.15, 0.01] }, [(toe + back) / 2, c + 0.095, sd * (tun - 0.005)], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed' }))] }));
    }
    // (over a rigid axle's leaves, behind the pack: its floor raised over them, a kick up to it from the floor ahead)
    // (raised only over what is under it; between it and the pack's end, the floor at the pack's height)
    const ov = overAxle(m); if (ov && !fl) { const y0 = pk ? pk.y0 + pk.h + 0.005 + t2 : c + 0.1; out.push(P('rear floor', { box: [ov.x1 - ov.x0, 0.03, 2 * inner] }, [(ov.x1 + ov.x0) / 2, ov.top - 0.015, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says: 'its floor raised over what is at its rear axle (its leaves, or its motor; typical)' }), P('heel kick', { box: [0.02, ov.top - 0.03 - y0, 2 * inner] }, [ov.x1 + 0.01, (ov.top - 0.03 + y0) / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says: 'where its floor rises over its rear axle (typical)' }));
      // (over a twist beam's arms there, 30 mm over their top)
      if (pk && back > ov.x1 + 0.03) { const yb = beamFloor(m, ov.x1) ?? y0; out.push(P('rear floor pan', { box: [back - ov.x1 - 0.02, t2, 2 * inner] }, [(back + ov.x1 + 0.02) / 2, Math.max(y0, yb) - t2 / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says: 'its floor between its pack and its rear axle (typical)' })); } }
    if (fl) {
      out.push(P('heel kick', { box: [0.02, fl.top - 0.03 - (c + 0.1), 2 * inner] }, [fl.kick - 0.01, (fl.top - 0.03 + c + 0.1) / 2, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says: 'where the floor rises to the rear seat, over the fuel tank (typical)' }));
      out.push(P('rear floor', { box: [fl.kick - fl.x0, 0.03, 2 * inner] }, [(fl.kick + fl.x0) / 2, fl.top - 0.015, 0], { mat: 'steel-low', color: 0x1a1a1a, shell: 0.0009, make: 'pressed', says: 'the raised floor under the rear seat (typical)' }));
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
    for (const s2 of [-1, 1]) out.push(P(`bar clamp ${s2 > 0 ? 'right' : 'left'}`, { box: [0.04, m.H * 0.93 - head[1] - 0.1, 0.04] }, [head[0] + 0.03, (m.H * 0.93 + head[1] + 0.1) / 2, s2 * 0.04], { mat: 'al-6061', color: 0x2a2a2a, finish: 'cast' }));
    out.push(P('lower triple clamp', { box: [0.07, 0.03, 0.26] }, [head[0] + 0.05, head[1] - 0.1, 0], { mat: 'al-6061', color: 0x2a2a2a, fill: 0.5, finish: 'cast' }));
    out.push(P('triple clamps', { box: [0.07, 0.03, 0.26] }, [head[0] + 0.02, head[1] + 0.1, 0], { mat: 'al-6061', color: 0x2a2a2a, fill: 0.5, finish: 'cast' }));
    for (const s of [-1, 1]) out.push(tube(`swingarm ${s > 0 ? 'right' : 'left'}`, 0.022, [[pivot[0], pivot[1], s * 0.127], [axR[0], axR[1], s * 0.127]], 'al-6061', 0x9aa0a6, { finish: 'brushed', item: 'tube 44x3' }));
    out.push(P('rear shock', { cyl: [0.025, 0.36] }, [pivot[0] + 0.04, pivot[1] + 0.2, 0], { rot: [0, 0, 0.22], mat: 'steel-alloy', color: 0xd4a017, fill: 0.4, finish: 'plate', parts: [P('spring', { cyl: [0.034, 0.24] }, [0, 0.02, 0], { mat: 'steel-spring', color: 0xd4a017, shell: 0.006, finish: 'paint', item: 'spring d10 D68 L240 n8' })] }));
  }
  // suspension: how each axle hangs from the frame (its kind is each axle's own, from its maker where given)
  const frameAt = (x: number): { z: number; y: number } => m.frame === 'ladder' ? { z: m.kind === 'truck' ? 0.43 : half * 0.8, y: m.kind === 'truck' ? tyres[0]!.D * 0.8 : m.extras.includes('deck') ? c + 0.21 : Math.max(c, tyres[0]!.D * 0.42) } : m.frame === 'tube' ? { z: frameZ(x), y: c + 0.016 } : m.frame === 'shell' ? { z: inner0 * 0.9, y: c + 0.1 } : { z: 0.12, y: c + 0.3 };
  m.axles.forEach((a, i) => { if (a.track > 0) out.push(...suspension(a, tyres[i]!, frameAt(a.x), i === 0 ? 'front' : 'rear', m)); });
  // panels
  if (m.lines) out.push(...body(m, m.lines));
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
  if (ex.has('cab')) {
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
  if (ex.has('tanks')) for (const s of [-1, 1]) out.push(P(`tank strap ${s > 0 ? 'right' : 'left'}`, { box: [0.08, 0.06, 0.4] }, [(front + rear) / 2 + 0.6, 0.95, s * 0.62], { mat: 'steel-low', color: 0x1a1a1a, finish: 'paint' }), P(`fuel tank ${s > 0 ? 'right' : 'left'}`, { cyl: [0.32, 1.3] }, [(front + rear) / 2 + 0.6, 0.85, s * 0.8], { rot: [0, 0, PI / 2], mat: 'al-5052', color: 0xc8ccd2, shell: 0.003, finish: 'brushed', says: 'about 380 L each (typical of highway tractors)' }));
  if (ex.has('stacks')) for (const s of [-1, 1]) out.push(tube(`exhaust stack ${s > 0 ? 'right' : 'left'}`, 0.065, [[m.L / 2 - m.L * 0.45 - 0.06, 1.1, s * (m.W / 2 - 0.12)], [m.L / 2 - m.L * 0.45 - 0.06, m.H + 0.4, s * (m.W / 2 - 0.12)]], 'stainless-304', 0xd8dce2, { finish: 'chrome' }));
  if (ex.has('fifth wheel')) out.push(P('fifth wheel mount', { box: [0.6, 0.1, 0.95] }, [rear + 0.25, tyres[0]!.D * 0.8 + 0.287 + 0.05, 0], { mat: 'steel-low', color: 0x1a1a1a, fill: 0.3, finish: 'paint' }), P('fifth wheel', { cyl: [0.45, 0.06] }, [rear + 0.25, tyres[0]!.D * 0.8 + 0.287 + 0.13, 0], { mat: 'cast-iron', color: 0x1a1a1a, fill: 0.5, finish: 'cast', says: 'where a trailer\'s kingpin couples (SAE J700: a 2-inch kingpin, typical)' }));
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
  if (ex.has('racks')) for (const [xx, nm] of [[m.L / 2 - 0.3, 'front rack'], [-m.L / 2 + 0.3, 'rear rack']] as const) { const ry = (tyres[0]!.D + 0.18); out.push(P(nm, undefined, [xx, ry, 0], { parts: [...(m.upper ? [-1, 1].map((sd) => tube('rack post', 0.01, [[0.07, 0, sd * half * 0.6], [(nm === 'front rack' ? front + 0.25 : rear - 0.25) - xx, (m.upper ?? 0) - ry, sd * half * 0.6]], 'steel-low', 0x1a1a1a)) : []),...[-1, 1].map((s) => tube('rack rail', 0.011, [[-0.22, 0, s * 0.42], [0.22, 0, s * 0.42]], 'steel-low', 0x1a1a1a)), ...[-0.2, -0.07, 0.07, 0.2].map((x) => tube('rack bar', 0.009, [[x, 0, -0.42], [x, 0, 0.42]], 'steel-low', 0x1a1a1a))] })); }
  // seats, power, controls
  // each seat as wide as it has room for, its style's width at most: to the seats beside it in its row, to the body's
  // inside at its cushion and its shoulders (less its trim and the room to get in, about 60 mm, typical), and to the
  // inside of a wheel's sweep where it sits over one (less the liner, about 45 mm, typical)
  const inside = m.lines ? insideOf(out) : undefined;
  const roomOf = (s: Seat): number => {
    let r = Infinity;
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
    const sweepTop = Math.abs(bx - fa.x) < ftR + 0.35 ? ftR * 2 + travelOf(fa).bump + 0.05 : -Infinity, by0 = Math.max(dashY - 0.153, sweepTop + 0.025), lift = by0 - (dashY - 0.153), by = by0 - 0.008;
    // (its ends at the hinge pillars, 30 mm inside the skin there, where a door's inner panel and trim would be: not at
    // the door's skin itself)
    const bodyAt = inside?.(bx, by) ?? Infinity, dashW = m.W * 0.42, bh = Number.isFinite(bodyAt) ? bodyAt - 0.03 : dashW + 0.02;
    // (a car's at the cross-car beam it hangs from: its end on the beam's face toward it, not inside the beam)
    const toBeam = Math.hypot(bx - sx, by - sy) || 1, end: V3 = m.kind === 'kart' ? [sx + 0.42, c + 0.06, sz * 0.4] : low ? [sx + 0.28, m.kind === 'mower' ? sy - 0.45 : Math.max(c, tyres[0]!.D * 0.42) + 0.1 + 0.015, sz] : m.lines ? [bx - ((bx - sx) / toBeam) * 0.027, by - ((by - sy) / toBeam) * 0.027, sz] : [sx + 0.45, sy - 0.25, sz * 0.6];
    out.push(tube('steering column', 0.012, [[sx + 0.02, sy - 0.02, sz], end], 'steel-low', 0x2a2a2a, { joint: 'bearing', fixed: 'bolted to the beam by its bracket, so it can be set for reach and height', says: 'its column: a tube on its bracket, the steering shaft turning in its bearings inside it (typical)' }));
    // its wheel square to its column, so raked as the column is (a car's about 370 mm across, typical): a rim moulded over
    // a steel armature, three spokes and the boss its airbag's cover, all one moulding
    { const d0: V3 = [sx + 0.02 - end[0], sy - 0.02 - end[1], 0], dl = Math.hypot(d0[0], d0[1]) || 1, zA: V3 = [d0[0] / dl, d0[1] / dl, 0], xA: V3 = [0, 0, 1], yA: V3 = [zA[1] * xA[2] - zA[2] * xA[1], zA[2] * xA[0] - zA[0] * xA[2], zA[0] * xA[1] - zA[1] * xA[0]];
      const rot: V3 = [Math.atan2(-zA[1], zA[2]), Math.asin(Math.max(-1, Math.min(1, zA[0]))), Math.atan2(-yA[0], xA[0])], boss = Math.min(0.07, r * 0.4);
      out.push(P('steering wheel', { torus: [r, 0.015] }, [sx, sy, sz], { rot, mat: 'pu', color: 0x1a1a1a, finish: 'leather', link: 'steering wheel', fixed: 'moulded over its steel armature with its spokes and boss, one piece; splined on its column', says: `its steering wheel, ${Math.round((r + 0.015) * 2000)} mm across (typical)`, parts: [P('steering wheel boss', { cyl: [boss, 0.068] }, [0, 0, 0.006], { rot: [PI / 2, 0, 0], mat: 'abs', color: 0x1a1a1a, finish: 'texture', passes: ['steering column'], says: 'its boss, its airbag\'s cover (typical)' }), ...[0, 1, 2].map((k) => { const a = -PI / 2 + (k - 1) * 1.9; return P('steering wheel spoke', { box: [r - boss - 0.011, 0.032, 0.014] }, [Math.cos(a) * (r + boss - 0.019) / 2, Math.sin(a) * (r + boss - 0.019) / 2, 0], { rot: [0, 0, a], mat: 'abs', color: 0x1a1a1a }); })] })); }
    if (m.kind === 'forklift') out.push(P('floor plate', { box: [0.55, 0.01, 2 * (m.axles[0]!.track / 2 - tyres[0]!.W / 2 - 0.06)] }, [end[0], end[1] - 0.01, 0], { mat: 'steel-low', color: 0x2a2a2a, finish: 'texture', says: 'its operator\'s floor, a tread plate (typical)' }));
    if (m.lines) out.push(tube('cross-car beam', 0.025, [[bx, by, -bh], [bx, by, bh]], 'steel-low', 0x2a2a2a, { finish: 'paint', says: 'the beam the dashboard and the steering column hang on, bolted to the A pillars (typical)' }));
    // (and short of the strut towers ahead of it where they stand as high as it does: a cab-forward van's are under its dash)
    const towerX = fa.susp === 'strut' && Math.min(m.H * 0.62, ftR + 0.55) + 0.045 > dashY - 0.15 ? fa.x - 0.09 - 0.01 : Infinity;
    if (m.lines) out.push(P('dashboard', { loft: { st: [{ x: -0.15, w: dashW, lo: Math.min(0.02, -0.12 + lift), hi: 0.08, n: 4 }, { x: Math.max(-0.05, Math.min(0.25, xWs - dashX - 0.01, towerX - dashX)), w: dashW * 0.95, lo: Math.min(0.0, -0.14 + lift), hi: 0.05, n: 4 }] } }, [dashX, dashY, 0], { mat: 'abs', color: 0x1e1e20, shell: 0.003, finish: 'texture', passes: ['steering column', 'cross-car beam'] }));
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
    out.push(P(`drive sprocket ${ch.teeth[0]}T`, { cyl: [r1, 0.008] }, [ex0, ey, z], { rot: [PI / 2, 0, 0], facets: ch.teeth[0], mat: 'steel-alloy', color: 0x6a6a6a, finish: 'cast', iface: [teeth, { kind: 'shaft', role: 'requires', d: 0.0254, to: 'crankcase', says: 'on the engine\'s output shaft' }] }), P(`axle sprocket ${ch.teeth[1]}T`, { cyl: [r2, 0.006] }, [ax, ay, z], { rot: [PI / 2, 0, 0], facets: Math.min(64, ch.teeth[1]), mat: 'al-6061', color: 0x9a9ea4, finish: 'brushed', says: ch.says, iface: [teeth, { kind: 'shaft', role: 'requires', d: axleD, says: 'its bore, on the axle' }] }));
    // the chain's two runs, tangent to both sprockets (an open belt's outer tangents)
    const dx = ax - ex0, dy = ay - ey, D = Math.hypot(dx, dy), a0 = Math.atan2(dy, dx), b = Math.asin((r1 - r2) / D);
    for (const sg of [1, -1]) { const t = a0 + sg * (PI / 2 + b); out.push(tube(`chain ${sg > 0 ? 'top' : 'bottom'} run`, ch.pitch * 0.22, [[ex0 + r1 * Math.cos(t), ey + r1 * Math.sin(t), z], [ax + r2 * Math.cos(t), ay + r2 * Math.sin(t), z]], 'steel-alloy', 0x3a3a3a, { finish: 'plate', item: ch.item, iface: [{ kind: 'chain', role: 'requires', d: ch.pitch }] })); }
  }
  if (m.kind === 'motorcycle') out.push(P('silencer', { cyl: [0.045, 0.42] }, [rear + 0.35, (m.seatH ?? 0.9) - 0.25, 0.15], { rot: [0, 0, -1.25], mat: 'al-6061', color: 0xb8bcc2, finish: 'brushed' }));
  if (ex.has('exhaust')) out.push(tube('exhaust', m.kind === 'motorcycle' ? 0.025 : 0.022, m.kind === 'motorcycle' ? [[m.power.x + 0.12, (m.power.y ?? 0.5) + 0.12, 0.04], [m.power.x + 0.2, (m.power.y ?? 0.5) - 0.05, 0.1], [m.power.x - 0.05, (m.power.y ?? 0.5) - 0.08, 0.15], [rear + 0.55, (m.seatH ?? 0.9) - 0.32, 0.15]] : (m.kind === 'car' ? exhaustPath(m) : [[m.power.x, (m.power.y ?? 0.4) + 0.05, 0.12], [m.power.x - 0.25, tyres[tyres.length - 1]!.D * 0.8, 0.2], [-m.L / 2 + 0.15, tyres[tyres.length - 1]!.D * 0.9, 0.2]]) as V3[], 'stainless-304', 0xb8bcc2, { finish: 'brushed' }));
  if (ex.has('exhaust') && m.kind === 'car') { const e = out[out.length - 1]!; if (e.shape && 'tube' in e.shape) e.shape.tube.bend = 0.03; }
  if (m.kind === 'car') {
    const ev = m.power.kind === 'electric', hy = !!pick.power && pick.power === 'hybrid';
    const pk = packOf(m);
    if (ev) out.push(P('battery pack (75 kWh)', pk ? { box: [pk.x1 - pk.x0, pk.h, 2 * pk.z] } : { box: [front - rear - 0.4, 0.12, m.W * 0.8] }, pk ? [(pk.x0 + pk.x1) / 2, pk.y0 + pk.h / 2, 0] : [(front + rear) / 2, c + 0.16, 0], { mat: 'battery', color: 0x2a3a4a, fill: 0.8, kg: 450, says: 'about 450 kg at 6 kg per kWh (pack level, typical)' }));
    else {
      const ft = floorOf(m)?.tank, tb: V3 = ft ? [ft.x1 - ft.x0, ft.h, ft.z1 - ft.z0] : [0.5, 0.2, 0.5], ta: V3 = ft ? [(ft.x0 + ft.x1) / 2, ft.y0 + ft.h / 2, (ft.z0 + ft.z1) / 2] : [rear + 0.35, c + 0.12, -0.3];
      out.push(P(`fuel tank (${Math.round(tb[0] * tb[1] * tb[2] * 1000)} L)`, { box: tb }, ta, { mat: 'pe', color: 0x1a1a1a, shell: 0.005, finish: 'texture', says: 'its tank and the fuel in it, under the rear seat beside the exhaust (about 50 L, typical)', parts: [P('petrol', undefined, [0, 0, 0], { kg: tb[0] * tb[1] * tb[2] * 1000 * 0.74 * 0.5, says: 'half a tank (typical)' })] }));
      // (across the car: on the engine's left end, as deep as from just behind its drive shafts to just ahead of its crank;
      // along it, behind the engine)
      const pw2 = powerAt(m), es2 = engineSize(pw2, true).s;
      if (across(m)) { const b = bayOf(m, es2), ax = m.axles[0]!.x, x0 = ax - 0.08, x1 = pw2.x + 0.06; out.push(P('gearbox', { box: [x1 - x0, 0.35, b.gb[1] - b.gb[0]] }, [(x0 + x1) / 2, pw2.y! - 0.05, (b.gb[0] + b.gb[1]) / 2], { mat: 'al-a380', color: 0x8c8e90, kg: 45, finish: 'cast', passes: ['drive shaft left', 'drive shaft right', 'inner joint boot'], says: 'about 45 kg, on the engine\'s end, its differential on the drive shafts\' line (typical of a transverse gearbox)' })); }
      else out.push(P('gearbox', { box: [0.45, 0.3, 0.3] }, [pw2.x - es2[0] / 2 - 0.225, pw2.y! - 0.05, 0], { mat: 'al-a380', color: 0x8c8e90, kg: 45, finish: 'cast', says: 'about 45 kg, behind the engine (typical)' }));
      if (hy) out.push(P('battery (1.5 kWh)', { box: [0.5, 0.2, 0.6] }, [rear + 0.6, c + 0.2, 0], { mat: 'battery', color: 0x2a3a4a, kg: 40, says: 'under the rear seat, on the floor (typical of a hybrid)' }));
    }
    if (!m.mass) out.push(P('wiring harness', undefined, [0, 0.6, 0], { kg: 40, says: 'about 40 kg of copper and insulation (typical)' }), P('climate system', undefined, [0.5, 0.6, 0], { kg: 20, says: 'typical' }), P('trim, carpets and sound deadening', undefined, [0, 0.5, 0], { kg: 60, says: 'typical' }), P('oil, coolant and other fluids', undefined, [0, 0.4, 0], { kg: 15, says: 'typical' }), P('body in white', undefined, [0, 0.5, 0], { kg: 230, says: 'its pressed and welded structure inside its skin: sills, pillars, floor, crossmembers (about 280–350 kg with its panels, typical)' }));
  }
  // what it weighs, against what its maker says
  const modelled = out.reduce((a, p) => a + approxMass(p), 0);
  const parts = [...out];
  if (m.mass) {
    const rest = m.mass - modelled;
    if (rest > 0) parts.push(P('the rest of it', undefined, [(front + rear) / 2, c + 0.3, 0], { kg: rest, says: `what is not drawn (trim, wiring, fluids, fittings): its published ${Math.round(m.mass)} kg${m.massSays ? ` (${m.massSays})` : ''} less the ${Math.round(modelled)} kg of parts drawn` }));
  }
  return P(m.name, undefined, [0, 0, 0], { parts, road: m.road, published: m.mass, says: m.says + (m.mass && modelled > m.mass * 1.02 ? ` (its parts as drawn weigh ${Math.round(modelled)} kg, more than its published ${Math.round(m.mass)} kg: a fault in the drawing)` : '') });
}
// a part's mass for the reckoning above: the same rule as the kits' (src/nexus/kits.ts massOf), filled in by the caller
let approxMass: (p: Part) => number = () => 0;
/** (kits.ts gives its mass rule, so a machine's published mass is reckoned against the same masses everything uses) */
export function useMass(f: (p: Part) => number): void { approxMass = f; }

// ---- the machines: real ones by their published figures, the rest typical -------------------------------------------
const red = 0xb3202a;
export const MACHINES: Machine[] = [
  {
    id: 'corolla', short: 'corolla', name: 'Toyota Corolla LE (2025)', kind: 'car', source: 'Toyota, 2025 Corolla eBrochure: dimensions, tread, curb weight, brakes',
    L: 182.3 * IN, W: 70.1 * IN, H: 56.5 * IN, clearance: 5.3 * IN, frame: 'shell', hand: -1,
    axles: [{ x: (182.3 / 2 - 37) * IN, track: 60.3 * IN, tyre: '205/55R16', steer: true, drive: true, brake: { kind: 'disc', d: 10.8 * IN, vented: true }, susp: 'strut' }, { x: (182.3 / 2 - 37 - 106.3) * IN, track: 61.0 * IN, tyre: '205/55R16', brake: { kind: 'disc', d: 10.2 * IN }, susp: 'beam' }],
    lines: { cowl: 0.33, roofF: 0.45, roofR: 0.71, deck: 0.83, belt: 0.64, nose: 0.53, tail: 0.68, n: 5 },
    seats: [{ x: -0.1, z: -0.38, y: 0.55, style: 'bucket' }, { x: -0.1, z: 0.38, y: 0.55, style: 'bucket' }, { x: -0.95, z: 0, y: 0.57, style: 'bench' }],
    power: { kind: 'inline', cc: 1987, kW: 126, x: 1.55, says: '2.0 L four-cylinder Dynamic Force engine, 169 hp at 6,600 rpm (Toyota)' },
    controls: 'wheel', rims: { style: 'steel', cover: 10, mat: 'steel-low', lugs: 5, lug: 12, color: 0x2a2c2e, pcd: 100, offset: 45 }, extras: ['exhaust'], road: 'us', mass: 2955 * LB, massSays: 'curb weight, Toyota', color: 0xb8bcc2,
    says: 'its tyres 205/55R16 (typical of its 16-in. wheels: Toyota gives the wheel size, not the tyre code here); its front overhang about 37 in (an estimate from its length and wheelbase); its 16-in. steel wheels under full wheel covers (Toyota, 2025 Corolla LE), on 5 × 100 mm studs, M12 × 1.5, at a +45 mm offset (wheel fitment listings for the E210)',
  },
  {
    id: 'rancher', short: 'rancher', name: 'Honda FourTrax Rancher 4x4 (2026)', kind: 'atv', source: 'Honda Powersports, 2026 FourTrax Rancher 4x4 specifications',
    L: 82.8 * IN, W: 47.4 * IN, H: 46.2 * IN, clearance: 7.1 * IN, frame: 'tube', seatH: 33.6 * IN, upper: 33.6 * IN - 0.18,
    axles: [{ x: 25 * IN, track: 36 * IN, tyre: '24x8-12', steer: true, drive: true, brake: { kind: 'disc', d: 0.19 }, susp: 'wishbone' }, { x: -25 * IN, track: 36.5 * IN, tyre: '24x10-11', drive: true, brake: { kind: 'drum', d: 0.16 }, susp: 'swingarm' }],
    seats: [{ x: -0.15, z: 0, y: 33.6 * IN, style: 'saddle' }],
    power: { kind: 'single', cc: 420, kW: 20, x: 0.05, y: 0.42, says: 'a 420 cc liquid-cooled single (typical of the Rancher: its displacement is in Honda\'s own model line, not in this page)' },
    controls: 'bars', rims: { style: 'steel', mat: 'steel-low', lugs: 4, lug: 10, color: 0x2a2a2a }, extras: ['fenders', 'racks', 'exhaust', 'lights'], mass: 615 * LB, massSays: 'curb weight with fluids and a full tank, Honda', color: red,
    says: 'front brakes dual 190 mm discs, rear a 160 mm drum; 6.7 in of travel front and rear (Honda); its track about 36 in (an estimate: Honda gives its width, 47.4 in)',
  },
  {
    id: 'crf450r', short: 'crf450r', name: 'Honda CRF450R (2025)', kind: 'motorcycle', source: 'Honda Powersports, 2025 CRF450R specifications and brochure',
    L: 2.183, W: 0.827, H: 1.27, clearance: 13.1 * IN, frame: 'backbone', seatH: 38.0 * IN, rake: 27.3 * PI / 180,
    axles: [{ x: 58.3 * IN / 2, track: 0, tyre: '80/100-21', steer: true, brake: { kind: 'disc', d: 0.26 } }, { x: -58.3 * IN / 2, track: 0, tyre: '120/80-19', drive: true, brake: { kind: 'disc', d: 0.24 } }],
    seats: [{ x: -0.25, z: 0, y: 38.0 * IN, style: 'saddle' }],
    power: { kind: 'single', cc: 450, kW: 40, x: 0.05, y: 0.55, says: 'a 450 cc single' },
    controls: 'bars', rims: { style: 'wire', spokes: 36, mat: 'al-6061', lugs: 0, lug: 8, color: 0x1a1a1a }, extras: ['tank', 'number', 'exhaust'], chain: { teeth: [13, 49], pitch: 0.015875, at: [-0.12, -0.12], z: -0.093, says: 'a 520 chain on 13 and 49 teeth (typical of a 450 motocrosser; Honda fits its own ratio)' }, mass: 245 * LB, massSays: 'curb weight, Honda', color: red,
    says: 'wheelbase 58.3 in, seat 38.0 in, rake 27.3°, trail 4.5 in (Honda); its front tyre 80/100-21 (typical of a 21-in. motocross front); its length and width typical of a 450 motocrosser (estimates)',
  },
  {
    id: '8fgcu25', short: '8fgcu25', name: 'Toyota 8FGCU25 forklift', kind: 'forklift', source: 'Toyota Material Handling, Core IC Cushion spec sheet (2024)',
    L: 2.380, W: 1.065, H: 2.115, clearance: 0.1, frame: 'ladder', hand: -1,
    axles: [{ x: 2.380 / 2 - 0.55, track: 0.890, tyre: '21x7x15', drive: true, brake: { kind: 'drum', d: 0.28 }, susp: 'rigid' }, { x: 2.380 / 2 - 0.55 - 1.485, track: 0.915, tyre: '16x6x10.5', steer: true, susp: 'pivot' }],
    seats: [{ x: -0.25, z: 0, y: 1.05, style: 'pan' }],
    power: { kind: 'inline', cc: 2237, kW: 38, x: -0.25, y: 0.55, says: 'a 2,237 cc four (Toyota\'s 4Y family in this spec sheet), 51 hp at 2,570 rpm (Toyota)' },
    controls: 'wheel', rims: { style: 'disc', mat: 'steel-low', lugs: 6, lug: 14, color: 0x1a1a1a }, extras: ['mast', 'guard', 'counterweight'], guardH: 2.05, mass: 3630, massSays: 'total truck weight, Toyota', color: 0xd8a21a,
    says: 'length to its fork face 2,380 mm, wheelbase 1,485 mm, tread 890/915 mm, overhead guard 2,050 mm, mast 2,115 mm lowered and 4,560 mm raised (Toyota); its cushion tyres 21x7x15 and 16x6x10.5 (typical of a 5,000 lb cushion truck)',
  },
  {
    id: 'cascadia', short: 'cascadia', name: 'Freightliner Cascadia 126 day cab 6x4', kind: 'truck', source: 'Freightliner Australia, Cascadia 126 specification list (May 2023)',
    L: 7.166, W: 2.5, H: 3.03, clearance: 0.25, frame: 'ladder', hand: -1,
    axles: [{ x: 7.166 / 2 - 1.315, track: 2.05, tyre: '315/80R22.5', steer: true, brake: { kind: 'disc', d: 0.43 }, susp: 'leaf' }, { x: 7.166 / 2 - 1.315 - 4.425 + 1.295 / 2, track: 1.85, tyre: '11R22.5', drive: true, dual: true, brake: { kind: 'disc', d: 0.43 }, susp: 'air' }, { x: 7.166 / 2 - 1.315 - 4.425 - 1.295 / 2, track: 1.85, tyre: '11R22.5', drive: true, dual: true, brake: { kind: 'disc', d: 0.43 }, susp: 'air' }],
    seats: [{ x: 7.166 / 2 - 3.22 + 0.55, z: -0.5, y: 1.55, style: 'bucket' }, { x: 7.166 / 2 - 3.22 + 0.55, z: 0.5, y: 1.55, style: 'bucket' }],
    power: { kind: 'diesel', cc: 14800, kW: 375, x: 7.166 / 2 - 1.3, y: 1.15, says: 'a Detroit DD15, 14.8 L (Freightliner: the 126 in. cab takes the DD15)' },
    controls: 'wheel', rims: { style: 'disc', mat: 'al-6061', lugs: 10, lug: 22, color: 0xd8dce2 }, extras: ['cab', 'tanks', 'stacks', 'fifth wheel'], road: true, mass: 8200, massSays: 'day cab 6x4 at 4,425 mm, Freightliner Australia', color: 0xf2f2ee,
    says: 'BBC 3,220 mm, cab 3,030 mm high, wheelbase 4,425 mm, rear axles 1,295 mm apart, front overhang 1,315 mm, frame 11 × 85 × 287 mm (Freightliner); 2.5 m wide (the legal limit in Australia)',
  },
  {
    id: 'x350', short: 'x350', name: 'John Deere X350 lawn tractor (42 in deck)', kind: 'mower', source: 'John Deere (engine, tyres, deck); TractorData.com (wheelbase, weight)',
    L: 1.75, W: 1.2, H: 1.1, clearance: 0.08, frame: 'ladder',
    axles: [{ x: 49.4 * IN / 2 + 0.05, track: 0.78, tyre: '15x6.00-6', steer: true, susp: 'pivot' }, { x: -49.4 * IN / 2 + 0.05, track: 0.8, tyre: '20x10-8', drive: true, susp: 'rigid' }],
    seats: [{ x: -0.3, z: 0, y: 0.78, style: 'pan' }],
    power: { kind: 'twin', cc: 726, kW: 16, x: 0.55, y: 0.45, says: 'a Kawasaki FR651V, 44.3 cu in (726 cc) V-twin, 21.5 hp (16.0 kW) (John Deere)' },
    controls: 'wheel', rims: { style: 'disc', mat: 'steel-low', lugs: 0, lug: 8, color: 0xe8c22a }, extras: ['hood', 'deck', 'lights'], mass: 464 * LB, massSays: 'TractorData.com', color: 0x367c2b,
    says: 'wheelbase 49.4 in, front tyres 15x6.00-6, rear 20x10-8 (TractorData, John Deere); its length and width typical of a 42 in lawn tractor (estimates)',
  },
  {
    id: 'rental kart', short: 'rental kart', name: 'rental go-kart (typical)', kind: 'kart', source: 'typical of rental karts: tyres 10x4.50-5 and 11x7.10-5; a Honda GX270 at its own size (Honda)',
    L: 1.85, W: 1.35, H: 0.62, clearance: 0.035, frame: 'tube', rails: [0.45, 0.5, 0.95, 0.6, 0.5],
    axles: [{ x: 0.52, track: 1.05, tyre: '10x4.50-5', steer: true, susp: 'rigid' }, { x: -0.52, track: 1.12, tyre: '11x7.10-5', drive: true, brake: { kind: 'disc', d: 0.2 }, susp: 'rigid' }],
    seats: [{ x: -0.12, z: -0.18, y: 0.08, style: 'kart' }],
    power: { kind: 'single', cc: 270, kW: 6.3, x: -0.22, z: 0.22, y: 0.29, box: [0.428, 0.422, 0.381], kg: 25, torque: 19.1, ratio: 6, says: 'a Honda GX270: 270 cc, 6.3 kW (8.5 hp) at 3,600 rpm, 19.1 N·m at 2,500 rpm, 381 × 428 × 422 mm, 25 kg dry (Honda)', driveSays: 'its 19.1 N·m through a chain of about 6 to 1 (typical of rental karts: a 12-tooth clutch to a 72-tooth axle sprocket)' },
    controls: 'wheel', rims: { style: 'split', spokes: 6, mat: 'al-6061', lugs: 3, lug: 8, color: 0xc8ccd2 }, extras: ['nose', 'pods'], chain: { teeth: [12, 72], pitch: 0.009525, at: [-0.12, -0.12], z: 0.22 + 0.381 * 0.2 + 0.004, item: 'chain 35', says: 'a #35 chain, 12 to 72 teeth (typical of rental karts)' }, mass: 150, massSays: 'typical of a rental kart without its driver', color: 0x1f4fa8,
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
    axles: [{ x: fx, track, tyre, steer: true, drive: o.power !== 'rear', brake: { kind: 'disc', d: 0.3, vented: true }, susp: 'strut' }, { x: fx - s.wb, track, tyre, drive: true, brake: { kind: 'disc', d: 0.28 }, susp: style === 'pickup' || style === 'van' ? 'leaf' : 'beam' }],
    lines: s.lines, seats, power: o.power === 'electric' ? { kind: 'electric', kW: 150, x: fx - s.wb, y: 0.35, says: 'an electric motor at the rear axle (typical)' } : { kind: o.power === 'diesel' ? 'diesel' : 'inline', cc: o.power === 'diesel' ? 2000 : 1800, kW: 110, x: fx + oh * 0.35, says: 'typical' },
    controls: 'wheel', rims: { style: o.rims === 'steel' ? 'steel' : 'spokes', spokes: o.rims === '10-spoke' ? 10 : o.rims === 'mesh' ? 16 : o.rims === 'turbine' ? 12 : 5, mat: o.rims === 'steel' ? 'steel-low' : 'al-a380', lugs: 5, lug: 12 },
    extras: ['exhaust'], road: true, color: o.color, says: `${s.L} m long, ${s.W} m wide, wheelbase ${s.wb} m; tyres ${tyre}, ${Math.round(tyreOf(tyre)!.D * 1000)} mm across (typical of a ${style})`,
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
    id: 'car', name: 'car', words: /\b(cars?|sedan|saloon|hatchback|suv|pickup|coupe|van|sports car|convertible|automobile|corolla)\b/i,
    says: 'a car: a real model by its maker\'s figures, or a body style\'s typical figures; its tyres by their size code; its power',
    choices: [{ key: 'body', name: 'body', options: ['corolla', ...styles] }, { key: 'colour', name: 'colour', options: COLOURS.map(([n]) => n) }, { key: 'rim', name: 'rim size', options: [15, 16, 17, 18, 19, 20, 21], unit: 'in' },
      { key: 'rims', name: 'rims', options: ['5-spoke', '10-spoke', 'mesh', 'steel', 'turbine'] }, { key: 'power', name: 'power', options: ['petrol', 'diesel', 'electric', 'hybrid'] }, { key: 'tint', name: 'window tint', options: ['none', 'light', 'dark'] }],
    build(c) {
      const col = colourOf(c.colour, 0xb8bcc2);
      if (c.body === 'corolla') return makeMachine({ ...MACHINES[0]!, color: col }, c);
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

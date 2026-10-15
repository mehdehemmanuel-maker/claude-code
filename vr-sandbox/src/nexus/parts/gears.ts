// Gearing: a gear's real shape, what meshes with what, and what a set of them does when one is turned.
//
// This file owns the involute. Before it, a gear in this library was DATA and never a shape: `parts/families.ts`
// made a `gear-m1-z20-b8-pla` item with the right pitch circle and the right centre-distance sentence, and the only
// code that tried to draw one said so in its own comment — `ask/outputs.ts` emitted a cylinder at the root circle
// with `z` little 8-sided cylinders stuck round it, described as "a sketch of the involute: print it from the
// slicer's shape". A gear drawn that way cannot mesh, cannot be checked, and cannot be placed next to another one,
// because the thing that makes a gear a gear is the curve.
//
// THE CURVE. An involute is the path of a point on a taut string unwound from a circle (the base circle, radius
// rb = r·cos α). Its property is the whole of gearing: two involute flanks rolling on each other transmit a
// CONSTANT speed ratio whatever the centre distance, because the common normal at the contact point always passes
// through the same fixed point on the line of centres (the pitch point). Nothing else here is a choice: the ratio,
// the direction, the tooth count limits and the centre distance all follow from it.
//
// WHAT IS EXACT HERE AND WHAT IS NOT, because a gear is a thing someone will cut:
//   - The FLANK is a true involute, sampled by pressure angle, from the base circle (or the root, whichever is
//     larger) to the tip. This is the part that carries load and decides the mesh, and it is not approximated.
//   - The ROOT is a circular fillet of the standard rack's tip radius, tangent to the root circle by construction
//     and meeting the flank where the involute begins. A hobbed gear's real root is a TROCHOID traced by the
//     cutter's tip corner, which this is not. The difference lies below the base circle, where no contact happens
//     (contact is confined to the flanks above it), so it changes the shape's stress root — it does not change a
//     ratio, a mesh or a clash. Said here because a part is only as honest as its labelling.
//   - The proportions are the ISO 53 / DIN 867 basic rack, the standard every off-the-shelf spur gear is cut to:
//     pressure angle 20°, addendum 1·m, dedendum 1.25·m, root fillet 0.38·m. A gear made to other proportions is a
//     different `alpha`/`ha`/`hf`, passed in, not a second generator.
//
// Checked in `tests/nexus/gears.test.ts`, where the mesh is proved GEOMETRICALLY and not by its own formula: two
// placed gears are turned through a full tooth in small steps and every tooth polygon of one is tested against
// every tooth polygon of the other for overlap. A phase formula that is wrong by half a tooth passes every ratio
// assertion ever written and fails that one.
import { addKit, type Part, type V3 } from './kits';
import type { Prism } from './form';

/** The ISO 53 / DIN 867 basic rack: what an off-the-shelf spur gear is cut to, as multiples of the module. */
export const RACK = { alpha: (20 * Math.PI) / 180, ha: 1, hf: 1.25, fillet: 0.38 } as const;

/** inv(α) = tan α − α, the involute function: the angle the string has swept when it leaves at pressure angle α. */
export const inv = (a: number): number => Math.tan(a) - a;

/** What a gear is asked for: its module and tooth count, how wide, what it is made of, and what it runs on.
 *  `kind` is the one thing that changes the geometry's family rather than its numbers. */
export interface GearCut {
  /** module, m (metres: m2 is 0.002). Two gears mesh only at the same module. */ m: number;
  /** teeth. Under about 17 a rack-cut tooth undercuts; under 8 there is hardly a tooth left. */ z: number;
  /** face width, m */ b: number;
  kind?: 'spur' | 'ring' | 'rack';
  /** pressure angle, radians (20° if not said) */ alpha?: number;
  /** addendum and dedendum as multiples of the module (the basic rack's if not said) */ ha?: number; hf?: number;
  /** the shaft bore, m. A gear with no bore is a blank. */ bore?: number;
  /** backlash taken off the tooth thickness, m (0 is the nominal tooth: two of them touch on both flanks) */ jn?: number;
  matter?: string;
}

/** Every radius and angle a gear's shape and its mesh are built from, derived — none of it stored twice. */
export interface GearSizes {
  m: number; z: number; alpha: number; kind: 'spur' | 'ring' | 'rack';
  /** pitch radius r = m·z/2: the circle that rolls on its partner's without slipping */ r: number;
  /** base circle rb = r·cos α: the involute is unwound from this, and no flank exists inside it */ rb: number;
  /** tip (outside) radius and root radius */ ra: number; rf: number;
  /** circular pitch p = π·m (along the pitch circle) and tooth thickness s = π·m/2 − backlash */ p: number; s: number;
  /** the angular pitch 2π/z, and the half-tooth angle at the pitch circle */ pitchAngle: number; half: number;
  b: number; bore: number;
}

export function sizesOf(c: GearCut): GearSizes {
  const alpha = c.alpha ?? RACK.alpha, ha = c.ha ?? RACK.ha, hf = c.hf ?? RACK.hf;
  const r = (c.m * c.z) / 2, kind = c.kind ?? 'spur';
  // A RING GEAR IS INSIDE OUT, not a spur gear with a flag: its teeth point inwards, so the tip is the SMALLER
  // radius and the root the larger. Getting this the wrong way round draws a ring whose teeth face the housing.
  const ra = kind === 'ring' ? r - c.m * ha : r + c.m * ha;
  const rf = kind === 'ring' ? r + c.m * hf : r - c.m * hf;
  return {
    m: c.m, z: c.z, alpha, kind, r, rb: r * Math.cos(alpha), ra, rf,
    p: Math.PI * c.m, s: (Math.PI * c.m) / 2 - (c.jn ?? 0),
    pitchAngle: (2 * Math.PI) / c.z, half: Math.PI / (2 * c.z) - (c.jn ?? 0) / (2 * r),
    b: c.b, bore: c.bore ?? 0,
  };
}

/** What a tooth count cannot be, said as a sentence rather than clamped quietly. A floor that silently fixes the
 *  number is how a gear nobody can cut ends up in a build: these are returned and printed. */
export function faults(c: GearCut): string[] {
  const g = sizesOf(c), out: string[] = [];
  if (!Number.isInteger(c.z)) out.push(`${c.z} teeth: a gear has a whole number of them`);
  if (c.z < 6) out.push(`${c.z} teeth is not a gear: under six the flanks meet before the tip and there is nothing left to drive with`);
  // The rack-cut undercut limit: z_min = 2·ha/sin²α (17.1 at 20° full depth, which is why 17 is the number
  // everyone quotes). Below it the cutter's tip cuts into the flank near the root, taking away involute that the
  // mating tip needs and weakening the tooth. It is a real gear, sold and used — so this is a warning, not a bar.
  const zMin = (2 * (c.ha ?? RACK.ha)) / Math.sin(c.alpha ?? RACK.alpha) ** 2;
  if (c.kind !== 'rack' && c.z < zMin) out.push(`${c.z} teeth undercuts: a rack cutter needs ${Math.ceil(zMin)} at ${(((c.alpha ?? RACK.alpha) * 180) / Math.PI).toFixed(0)}° to clear the flank, so the root is cut away and the tooth is weaker than its module says`);
  // A RING'S TIP MUST STAY OUTSIDE ITS OWN BASE CIRCLE, or the flank has no involute left at the tip:
  // r − ha·m ≥ r·cos α  ⇒  z ≥ 2·ha/(1 − cos α), which is 34 teeth at 20° full depth.
  if (g.kind === 'ring') {
    const zMinRing = (2 * (c.ha ?? RACK.ha)) / (1 - Math.cos(c.alpha ?? RACK.alpha));
    if (c.z < zMinRing) out.push(`a ring gear of ${c.z} teeth has its tip inside its own base circle, where no involute exists: it needs ${Math.ceil(zMinRing)} at ${(((c.alpha ?? RACK.alpha) * 180) / Math.PI).toFixed(0)}°`);
  }
  if (g.kind === 'spur' && g.rf <= (c.bore ?? 0) / 2) out.push(`the root circle (${(g.rf * 2000).toFixed(1)} mm across) is inside the ${((c.bore ?? 0) * 1000).toFixed(1)} mm bore: there is no metal between the shaft and the teeth`);
  if (c.b <= 0) out.push('a gear with no face width is a drawing, not a part');
  // A POINTED TOOTH: the two flanks of one tooth cross before the tip circle. The tip must then be truncated, and a
  // gear whose tip is truncated has lost the top of its working flank.
  if (g.kind !== 'rack' && tipHalfAngle(g) <= 0) out.push(`the tooth comes to a point below its tip circle: at ${c.z} teeth and ${(c.ha ?? RACK.ha)}·m addendum the flanks cross, so the tip is truncated and the top of the flank is gone`);
  return out;
}

/** The polar angle of the involute flank at radius rho, measured from the centre of the tooth.
 *  θ(ρ) = half + inv(α) − inv(α_ρ), with cos α_ρ = rb/ρ. At ρ = r it is `half` by construction. */
const flankAngle = (g: GearSizes, rho: number): number => {
  const c = g.rb / rho;
  if (c >= 1) return g.half + inv(g.alpha); // at or inside the base circle: the involute starts here
  return g.half + inv(g.alpha) - inv(Math.acos(c));
};
/** Half the tooth's angular width at the tip: ≤ 0 means the flanks have crossed and the tooth is pointed. */
const tipHalfAngle = (g: GearSizes): number => flankAngle(g, Math.max(g.ra, g.rb)) * (g.kind === 'ring' ? -1 : 1);

/** THE SECTION, one tooth, as points from the root up one flank, across the tip and down the other.
 *  Built in the tooth's own frame (symmetric about angle 0) and then rotated into place for each of the z teeth. */
function tooth(g: GearSizes, steps: number): [number, number][] {
  const pts: [number, number][] = [];
  const at = (rho: number, th: number): [number, number] => [rho * Math.cos(th), rho * Math.sin(th)];
  const sign = g.kind === 'ring' ? -1 : 1; // a ring's flank climbs inward, so every radial step reverses
  // WHERE THE FLANK STARTS AND ENDS. A spur tooth runs outward from its root (or from the base circle, if the root
  // is inside it, since no involute exists in there) to its tip. A RING tooth runs INWARD from its root, which is
  // its larger radius, to its tip at the smaller one — and both are outside its base circle. Taking `min(rb, rf)`
  // for a ring, as this did at first, started the flank at the base circle BELOW the tip: the flank then spanned
  // 56.4 → 58 mm on a gear whose pitch circle is at 60, so it never crossed the pitch circle at all and the tooth
  // came out 2.32 mm thick where the standard says 3.14. The teeth then passed through their pinion at every phase
  // offset, which is how it was found — a wrong shape reads exactly like a wrong phase until the shape is measured.
  const lo = sign > 0 ? Math.max(g.rb, g.rf) : g.rf;
  const hi = sign > 0 ? g.ra : Math.max(g.ra, g.rb);
  // THE FLANK, SAMPLED BY PRESSURE ANGLE and not by radius: equal steps in radius crowd the points near the base
  // circle where the curve turns hardest and spread them at the tip where it is nearly straight, which is backwards.
  const aOf = (rho: number) => Math.acos(Math.min(1, g.rb / Math.abs(rho)));
  const a0 = aOf(lo), a1 = aOf(hi);
  // THE PITCH RADIUS IS ALWAYS A SAMPLE POINT. Every point here sits exactly on the involute, but the straight
  // chord between two of them does not: it bulges off the true curve, and measured at the pitch circle that made
  // the drawn tooth 0.2% THICKER than π·m/2 at nine steps — a gear fatter than the real one, which would jam a
  // mesh in the viewer that turns freely in steel. Thickness is defined at the pitch circle, so that radius is
  // pinned as a sample and the chords either side of it fall away from it, never across it.
  const aPitch = aOf(g.r);
  const cuts = [...Array.from({ length: steps + 1 }, (_, i) => a0 + ((a1 - a0) * i) / steps), aPitch]
    .filter((a) => (a1 > a0 ? a >= a0 - 1e-12 && a <= a1 + 1e-12 : a <= a0 + 1e-12 && a >= a1 - 1e-12))
    .sort((x, y) => (a1 > a0 ? x - y : y - x));
  const flank: [number, number][] = [];
  for (const a of cuts) {
    const rho = g.rb / Math.cos(a);
    if (sign > 0 ? rho > hi + 1e-12 : rho < hi - 1e-12) break;
    const q = at(rho, -flankAngle(g, rho));
    if (flank.length && Math.hypot(q[0] - flank.at(-1)![0], q[1] - flank.at(-1)![1]) < 1e-9) continue;
    flank.push(q);
  }
  if (!flank.length) flank.push(at(hi, -flankAngle(g, hi)));
  // THE ROOT FILLET: an arc of the basic rack's tip radius, tangent to the root circle by construction (its centre
  // sits at rf + fillet from the axis) and meeting the flank where the involute begins. Below the base circle, so
  // out of contact — see the header on what this approximates.
  const f = RACK.fillet * g.m;
  const start = flank[0]!;
  const root: [number, number][] = [];
  if (sign > 0 ? g.rf < g.rb : g.rf > g.rb) {
    const thS = Math.atan2(start[1], start[0]);
    const cR = g.rf + sign * f, cTh = thS - sign * Math.asin(Math.min(1, f / Math.max(cR, 1e-9)));
    const cx = cR * Math.cos(cTh), cy = cR * Math.sin(cTh);
    const a0f = Math.atan2(start[1] - cy, start[0] - cx), a1f = Math.atan2(g.rf * Math.sin(cTh) - cy, g.rf * Math.cos(cTh) - cx);
    let d = a1f - a0f; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    for (let i = 1; i <= 6; i++) root.push([cx + f * Math.cos(a0f + (d * i) / 6), cy + f * Math.sin(a0f + (d * i) / 6)]);
  }
  // half the space at the root, then the fillet up, the flank up, across the tip, and the mirror of all of it
  const space = g.pitchAngle / 2 - (root.length ? Math.atan2(root.at(-1)![1], root.at(-1)![0]) * -1 : -Math.atan2(start[1], start[0]));
  pts.push(at(g.rf, -g.pitchAngle / 2 + Math.max(0, space) * 0));
  pts.push(...[...root].reverse(), ...flank);
  // the tip: a short arc, or a single point where the tooth is pointed
  const tipTh = flankAngle(g, hi);
  if (sign * tipTh > 1e-6) for (let i = 0; i <= 3; i++) pts.push(at(hi, -tipTh + (2 * tipTh * i) / 3));
  else pts.push(at(hi, 0));
  pts.push(...flank.map(([x, y]) => [x, -y] as [number, number]).reverse(), ...root.map(([x, y]) => [x, -y] as [number, number]));
  pts.push(at(g.rf, g.pitchAngle / 2));
  return pts;
}

/** WHERE THE TEETH ARE: the toothed boundary itself, z teeth round the circle. For a spur gear this is the outside
 *  of the part; for a ring gear it is the inside of its bore. Anything that needs to know where the metal ends —
 *  the section below, and the test that proves two gears do not pass through each other — asks for this rather than
 *  reaching into a prism and assuming which of its loops is which. */
export function teethOutline(c: GearCut, steps = 9): [number, number][] {
  const g = sizesOf(c), one = tooth(g, steps), pts: [number, number][] = [];
  for (let k = 0; k < g.z; k++) {
    const th = k * g.pitchAngle, cs = Math.cos(th), sn = Math.sin(th);
    for (const [x, y] of one) pts.push([x * cs - y * sn, x * sn + y * cs]);
  }
  return pts;
}

/** The whole closed section of a gear: z teeth round the circle, plus the bore as an opening through it.
 *  This is a `Prism`, so `view/kit3d.ts` extrudes it and `parts/form.ts` weighs it with no new code anywhere.
 *
 *  A RING GEAR IS A RIM WITH A TOOTHED BORE, and that is not a presentational detail. Built as a spur gear is —
 *  the toothed loop as the outline — it comes out as a SOLID DISC with teeth pointing into it, so the pinion that
 *  is supposed to run inside it sits inside metal. That drew exactly twelve overlaps at every phase, every tooth
 *  count and every addendum, and a count that does not move when the geometry moves is the signature of a
 *  systematic error rather than an interference: the material was on the wrong side of the curve. */
export function section(c: GearCut, steps = 9): Prism {
  const g = sizesOf(c);
  if (g.kind === 'rack') return rackSection(c);
  const teeth = teethOutline(c, steps);
  if (g.kind === 'ring') {
    // the rim: thick enough to carry the teeth, which for a cast or cut ring is about two modules of back-up
    const wall = Math.max(2 * g.m, 0.06 * g.r);
    return { pts: circle(g.rf + wall, Math.max(48, 3 * g.z)).reverse(), holes: [teeth.slice().reverse()], L: g.b };
  }
  const pts = teeth;
  const holes: [number, number][][] = [];
  if (g.bore > 0) holes.push(circle(g.bore / 2, 24));
  // LIGHTENING HOLES, by the same rule every real gear web follows and not as a style: only where there is web to
  // take them — the ring between the hub and the root has to be wide enough that a hole leaves a rim and a spoke.
  const hub = Math.max(g.bore * 0.9, g.bore / 2 + 3 * g.m);
  const web = g.rf - 2.5 * g.m - hub;
  if (g.bore > 0 && web > 4 * g.m) {
    const rh = hub + web / 2, rad = Math.min(web / 2.6, rh * 0.42);
    const n = Math.max(3, Math.min(8, Math.floor((Math.PI * rh) / (rad * 1.9))));
    for (let i = 0; i < n; i++) {
      const a = (2 * Math.PI * i) / n;
      holes.push(circle(rad, 16).map(([x, y]) => [x + rh * Math.cos(a), y + rh * Math.sin(a)] as [number, number]));
    }
  }
  return { pts, holes, L: g.b };
}
const circle = (rad: number, n: number): [number, number][] => Array.from({ length: n }, (_, i) => { const a = (-2 * Math.PI * i) / n; return [rad * Math.cos(a), rad * Math.sin(a)] as [number, number]; });

/** A RACK is the same tooth with its base circle at infinity, which makes the involute a straight line at the
 *  pressure angle. It is not a special case bolted on: it is what a gear of infinitely many teeth is, and the
 *  pinion that drives it rolls on its pitch LINE exactly as it would on a pitch circle. */
function rackSection(c: GearCut): Prism {
  const m = c.m, alpha = c.alpha ?? RACK.alpha, ha = (c.ha ?? RACK.ha) * m, hf = (c.hf ?? RACK.hf) * m;
  const p = Math.PI * m, pts: [number, number][] = [];
  const back = -hf - 2 * m; // the bar behind the teeth
  pts.push([-c.z * p * 0.5, back]);
  for (let k = 0; k < c.z; k++) {
    const x0 = -c.z * p * 0.5 + k * p;
    // up the flank at the pressure angle, across the tip, down the far flank, along the root
    const halfTip = p / 4 - ha * Math.tan(alpha), halfRoot = p / 4 + hf * Math.tan(alpha);
    pts.push([x0 + p / 2 - halfRoot, -hf], [x0 + p / 2 - halfTip, ha], [x0 + p / 2 + halfTip, ha], [x0 + p / 2 + halfRoot, -hf]);
  }
  pts.push([c.z * p * 0.5, back]);
  return { pts, holes: [], L: c.b };
}

/** A gear as a part the rest of the library already understands: a prism of its own section, its bore and web
 *  openings through it, weighed by `parts/form.ts` from the real area. */
export function gearPart(c: GearCut, name: string, at: V3 = [0, 0, 0], rot: V3 = [0, 0, 0]): Part {
  const g = sizesOf(c);
  // A RACK DOES NOT TURN however it is named, and `rotates: false` is the only way a part says so — left off, the
  // critic's name list would keep clear space all round it for a rotation it never makes.
  return { name, shape: { prism: section(c) }, at, rot, mat: c.matter ?? 'steel-low', ...(g.kind === 'rack' ? { rotates: false as const } : {}) };
}

export const sayGear = (c: GearCut): string => {
  const g = sizesOf(c);
  if (g.kind === 'rack') return `rack, module ${c.m * 1000} mm, ${c.z} teeth, ${(c.b * 1000).toFixed(0)} mm wide: a pinion of z teeth moves it ${(Math.PI * c.m * 1000).toFixed(2)} mm per tooth turned`;
  return `${g.kind === 'ring' ? 'internal ring gear' : 'spur gear'}, module ${c.m * 1000} mm, ${c.z} teeth: pitch circle ${(g.r * 2000).toFixed(2)} mm, ${g.kind === 'ring' ? 'tip' : 'outside'} ${(g.ra * 2000).toFixed(2)} mm, root ${(g.rf * 2000).toFixed(2)} mm, ${(c.b * 1000).toFixed(0)} mm wide`;
};

// ─── What meshes with what, and what happens when one is turned ──────────────────────────────────────────────────

/** A pair that touch: how they were judged, and what the pair does. Every number here is derived from the two
 *  gears and the distance between their centres — nothing is stored, so nothing can disagree with itself. */
export interface Mesh {
  a: string; b: string; kind: 'external' | 'internal' | 'rack';
  /** the centres as placed, and the centres the pair is cut for: m(z₁ ± z₂)/2 */ centres: number; nominal: number;
  /** THE REDUCTION, z_b/z_a: turns of a per turn of b, so 2 means b turns half as often. Negative when b turns the
   *  other way. Not the speed ratio, which is its reciprocal — the two were conflated here once and an idler came
   *  out at 0.75 where the test expected 1.33, each number right for a different question. */ ratio: number;
  /** the working pressure angle at the centres as placed: cos α_w = (nominal/centres)·cos α */ alphaW: number;
  /** teeth in contact at once. Under 1 the pair cannot hand a tooth over and the drive stops between teeth. */ contact: number;
  /** the play, measured along the pitch circle: 2·Δcentres·tan α, m */ backlash: number;
  /** the gap between one's tip and the other's root, m. Negative is metal inside metal. */ clearance: number;
  /** A RACK PAIR TRAVELS INSTEAD OF REDUCING: how far the rack moves per turn of its pinion, m (= 2π·r). A rack
   *  has no speed ratio at all, and saying `ratio: Infinity` for one — as this did at first — printed "Infinity to
   *  1 reduction, Infinity N·m" in the bench's own readout. */ travel?: number;
}

/** Why two gears do not mesh, in the words of the thing that is wrong — never a silent `false`. */
export type NoMesh = { refused: string };

/** The number of teeth in contact at once, which is what decides whether a pair drives at all.
 *  ε = [√(ra₁²−rb₁²) + √(ra₂²−rb₂²) − a·sin α_w] / (π·m·cos α). Under 1, one tooth lets go before the next takes
 *  hold and the output stops and starts; a real pair is cut for 1.4 to 1.8. */
export function contactRatio(x: GearSizes, y: GearSizes, centres: number, alphaW: number): number {
  const path = Math.sqrt(Math.max(0, x.ra ** 2 - x.rb ** 2)) + Math.sqrt(Math.max(0, y.ra ** 2 - y.rb ** 2)) - centres * Math.sin(alphaW);
  return path / (Math.PI * x.m * Math.cos(x.alpha));
}

/** Do these two, placed this far apart, mesh? The refusals are the useful half: a pair at the wrong centres is the
 *  commonest way a gear train that looks right does not turn. */
export function meshing(ga: GearCut, gb: GearCut, centres: number): Mesh | NoMesh {
  const x = sizesOf(ga), y = sizesOf(gb);
  // THE MODULE IS THE WHOLE OF COMPATIBILITY. Two gears of different module have teeth of different size; they can
  // be set at any distance at all and will never roll — they will climb over each other. This is the first check
  // because it is the one a person gets wrong while the picture still looks plausible.
  if (Math.abs(x.m - y.m) > 1e-12) return { refused: `module ${x.m * 1000} and module ${y.m * 1000} cannot mesh at any distance: their teeth are different sizes, so they would climb over each other instead of rolling` };
  if (Math.abs(x.alpha - y.alpha) > 1e-9) return { refused: `${((x.alpha * 180) / Math.PI).toFixed(1)}° and ${((y.alpha * 180) / Math.PI).toFixed(1)}° pressure angles cannot mesh: the flanks are different curves` };
  if (x.kind === 'ring' && y.kind === 'ring') return { refused: 'two ring gears have nothing to mesh with: one of a pair must have teeth facing out' };
  const kind: Mesh['kind'] = x.kind === 'rack' || y.kind === 'rack' ? 'rack' : x.kind === 'ring' || y.kind === 'ring' ? 'internal' : 'external';
  if (kind === 'rack') {
    // A rack's pitch LINE stands at the pinion's pitch radius: there is one right distance and it is the pinion's r.
    const pin = x.kind === 'rack' ? y : x, bar = x.kind === 'rack' ? x : y;
    const off = centres - pin.r;
    if (Math.abs(off) > 0.25 * pin.m) return { refused: `a rack's pitch line sits at the pinion's pitch radius, ${(pin.r * 1000).toFixed(2)} mm from its axis; at ${(centres * 1000).toFixed(2)} mm it is ${off > 0 ? 'too far to reach' : 'pressed into the root'} by ${(Math.abs(off) * 1000).toFixed(2)} mm` };
    // THE RACK'S OWN CONTACT RATIO, which is not the gear-pair one. The pinion's recess side gives
    // √(ra²−rb²) − r·sin α as before, but the approach side is set by the rack's straight flank: the path runs
    // from the pitch point out to where the rack's tip crosses the line of action, which is ha/sin α. Printing the
    // pinion-against-itself figure here, as this did at first, was a number that was nearly right for the wrong
    // reason — it never used the rack at all, so a rack with a stub tooth read the same as a full-depth one.
    const ha = bar.ra - bar.r > 0 ? bar.ra - bar.r : bar.m * RACK.ha;
    const path = Math.sqrt(Math.max(0, pin.ra ** 2 - pin.rb ** 2)) - pin.r * Math.sin(pin.alpha) + ha / Math.sin(pin.alpha);
    return { a: 'a', b: 'b', kind, centres, nominal: pin.r, ratio: 1, alphaW: pin.alpha, contact: path / (Math.PI * pin.m * Math.cos(pin.alpha)), backlash: Math.abs(off) * 2 * Math.tan(pin.alpha), clearance: off, travel: 2 * Math.PI * pin.r };
  }
  const nominal = kind === 'internal' ? (Math.abs(y.z - x.z) * x.m) / 2 : ((x.z + y.z) * x.m) / 2;
  if (kind === 'internal' && x.z === y.z) return { refused: `a ring and a pinion of the same ${x.z} teeth have no centre distance: they would be the same circle` };
  // AN INTERNAL PAIR IS NOT PROVED HERE YET, so it is refused rather than drawn turning. The ring's own geometry
  // is checked (its tooth is π·m/2 at its pitch circle, its section does not cross itself, its tip stays outside
  // its base circle, and it is a rim with a toothed bore rather than a disc). What is NOT established is that the
  // pair runs without metal in metal: with the phase this file derives, the pinion's teeth overlap the ring's by
  // about 0.2 mm at the pitch circle at module 2, and a scan of the phase over a whole tooth is SYMMETRIC about
  // the derived value — so the phase is right and something in the pair's proportions is not. Until the overlap
  // test passes, saying "they mesh" would be the mock this file exists to remove. The external pair and the rack
  // are proved (tests/nexus/gears.test.ts) and a reduction, an idler train, a compound gearbox and a rack drive
  // are all built from those.
  if (kind === 'internal') return { refused: `an internal pair (${x.z} teeth running inside ${y.z}) is not proved in this library yet: the ring's own shape is right, but with the phase derived here the pinion's teeth still overlap the ring's by about ${(0.0002 * 1000).toFixed(1)} mm at the pitch circle, and a phase scan is symmetric about that value — so the fault is in the pair's proportions, not the timing. Build it from external gears and a rack for now; docs/ROUNDS.md Run 7z says exactly where the next round picks this up` };
  // THE WORKING PRESSURE ANGLE at the centres as PLACED, not as cut. An involute pair still rolls at the right
  // ratio when moved apart — that is the involute's gift — but the angle the flanks press at changes, and with it
  // the play and how many teeth are in contact. This is why the ratio below is never corrected for centres.
  const cosW = Math.min(1, (nominal / Math.max(centres, 1e-12)) * Math.cos(x.alpha));
  const alphaW = Math.acos(cosW);
  // THE TIP-TO-ROOT CLEARANCE, both ways round: each gear's tip must stand clear of the other's root, and the
  // standard proportions (1·m addendum against 1.25·m dedendum) leave exactly 0.25·m of it.
  const c = Math.min(centres - (x.ra + y.rf), centres - (y.ra + x.rf));
  if (c < 0) return { refused: `at ${(centres * 1000).toFixed(2)} mm centres the tip of one stands ${(-c * 1000).toFixed(2)} mm inside the root of the other: they are cut for ${(nominal * 1000).toFixed(2)} mm and would jam` };
  // TIP INTERFERENCE, which the non-interpenetration test found before this check existed. Contact can only happen
  // where both flanks are involute, so it is confined to the segment of the line of action between the two base
  // circles' tangent points. If one gear's tip circle reaches PAST the far end of that segment — past
  // √(rb² + (a·sin α)²) — its tip arrives where its partner has no involute left and digs into the root instead
  // of rolling on the flank. This is why a 20° pinion wants about 18 teeth against a big gear: at module 2, a
  // 60-tooth gear's 62.00 mm tip passes the 61.12 mm limit set by a 9-tooth pinion, and the drawn teeth really do
  // overlap. The fix is more teeth, a shortened (stub) addendum, or a profile shift — not a smaller tolerance.
  for (const [one, two, zOne, zTwo] of [[x, y, ga.z, gb.z], [y, x, gb.z, ga.z]] as const) {
    if (one.kind === 'ring' || two.kind === 'ring') continue; // an internal pair's limit is a different geometry
    const limit = Math.sqrt(two.rb ** 2 + (centres * Math.sin(x.alpha)) ** 2);
    if (two.ra > limit + 1e-9) return { refused: `the ${zTwo}-tooth gear's tip reaches ${((two.ra - limit) * 1000).toFixed(3)} mm past where the ${zOne}-tooth gear still has involute flank, so its tip digs into the root instead of rolling: at ${((180 / Math.PI) * x.alpha).toFixed(0)}° a pinion needs about ${Math.ceil((2 * (ga.ha ?? RACK.ha)) / (Math.sin(x.alpha) ** 2))} teeth against a gear that size, or a stub addendum, or a profile shift` };
  }
  const contact = contactRatio(x, y, centres, alphaW);
  if (contact <= 1) return { refused: `at ${(centres * 1000).toFixed(2)} mm centres only ${contact.toFixed(2)} of a tooth is ever in contact: one tooth lets go before the next takes hold, so the drive stops between teeth (they are cut for ${(nominal * 1000).toFixed(2)} mm)` };
  // the reduction is negative because an external pair reverses: that is the whole of "direction" here
  return { a: 'a', b: 'b', kind, centres, nominal, ratio: -(y.z / x.z), alphaW, contact, backlash: Math.max(0, centres - nominal) * 2 * Math.tan(x.alpha), clearance: c };
}

/** A gear put somewhere by hand: which one it is, where its axis is on the plate, the shaft it shares, and which
 *  LAYER it runs in.
 *
 *  THE LAYER IS NOT DECORATION. A compound reduction keys a big gear and a small one to one shaft, and the next
 *  stage's big gear sits one centre distance away — which for two 54-tooth wheels at module 2 is 72 mm between
 *  axes and 112 mm of gear. In one plane they are inside each other, and the first 9:1 this file designed was
 *  refused by its own clash check for exactly that. Real gearboxes are layered: each stage runs in its own plane,
 *  the gears on a shared shaft sit at different heights up the shaft, and only gears in the same plane can touch.
 *  So a pair meshes when it is in the same layer, and gears in different layers are not a pair at all. */
export interface Placed { id: string; gear: GearCut; at: [number, number]; shaft?: string; angle?: number; layer?: number }

/** THE PHASE: where b's teeth must stand so they fall into a's spaces. This is the part no ratio assertion can
 *  check. A pair with a perfect ratio and the wrong phase runs with its teeth passing through each other, and it
 *  looks almost right — which is why `tests/nexus/gears.test.ts` proves it by overlapping the real polygons.
 *
 *  Along the line of centres, a tooth of one must sit in a space of the other: counting teeth round from that line,
 *  the two counts differ by half a tooth. With φ the direction from a to b, that reads
 *      z_a(θ_a − φ) + z_b(θ_b − φ − π) = π   (external, and so b turns the other way)
 *      z_a(θ_a − φ − π) − z_b(θ_b − φ − π) = π   (internal: a ring carries its partner round with it) */
export function phaseOf(za: number, zb: number, kind: Mesh['kind'], phi: number, thetaA: number): number {
  if (kind === 'internal') return phi + Math.PI + (za * (thetaA - phi - Math.PI) - Math.PI) / zb;
  return phi + Math.PI + (Math.PI - za * (thetaA - phi)) / zb;
}

/** What a hand-built train does when one gear is turned: every gear's angle, speed and torque, every pair that
 *  meshes, everything that does not, and every reason it would not go round. */
export interface Train {
  meshes: (Mesh & { a: string; b: string })[];
  /** by id: the angle it stands at, turns per turn of the driver (signed), and the torque it carries */
  turn: Record<string, { angle: number; ratio: number; torque: number; rpm: number }>;
  /** gears nothing drives, with why — a gear placed where it touches nothing is the commonest build mistake */
  loose: { id: string; why: string }[];
  /** pairs that cannot work, in their own words */ refused: { a: string; b: string; why: string }[];
  /** a closed loop of gears that cannot be assembled, and what would fix it */ shut: string[];
  ratio: number | null; faults: string[];
}

export function train(parts: Placed[], driver: string, theta = 0, torque = 1, rpm = 60): Train {
  const by = new Map(parts.map((p) => [p.id, p]));
  const out: Train = { meshes: [], turn: {}, loose: [], refused: [], shut: [], ratio: null, faults: [] };
  for (const p of parts) out.faults.push(...faults(p.gear).map((f) => `${p.id}: ${f}`));
  if (!by.has(driver)) { out.faults.push(`nothing here is called "${driver}", so there is nothing to turn`); return out; }
  // EVERY PAIR, JUDGED BY THE DISTANCE THEY ARE PLACED AT. Meshing is not declared anywhere: it is a consequence
  // of where the two gears were put, which is the whole point of placing them by hand.
  const near: Map<string, { to: string; mesh: Mesh }[]> = new Map(parts.map((p) => [p.id, []]));
  for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
    const p = parts[i]!, q = parts[j]!;
    if (p.shaft && p.shaft === q.shaft) continue; // keyed to one shaft: handled below, and they must not also mesh
    if ((p.layer ?? 0) !== (q.layer ?? 0)) continue; // different planes up the shafts: they cannot reach each other
    const d = Math.hypot(p.at[0] - q.at[0], p.at[1] - q.at[1]);
    const x = sizesOf(p.gear), y = sizesOf(q.gear);
    const reach = x.kind === 'rack' || y.kind === 'rack' ? Math.max(x.r, y.r) + 2 * x.m : y.kind === 'ring' || x.kind === 'ring' ? Math.max(x.ra, y.ra) : x.ra + y.ra;
    if (d > reach + 0.5 * x.m) continue;  // too far apart to be about each other at all
    const m = meshing(p.gear, q.gear, d);
    if ('refused' in m) { out.refused.push({ a: p.id, b: q.id, why: m.refused }); continue; }
    const full = { ...m, a: p.id, b: q.id };
    out.meshes.push(full);
    near.get(p.id)!.push({ to: q.id, mesh: full });
    near.get(q.id)!.push({ to: p.id, mesh: { ...full, a: q.id, b: p.id, ratio: m.kind === 'internal' ? 1 / m.ratio : -Math.abs(1 / m.ratio) } });
  }
  // the shafts: gears keyed to one shaft turn as one, whatever is driving which
  const shafts = new Map<string, string[]>();
  for (const p of parts) if (p.shaft) shafts.set(p.shaft, [...(shafts.get(p.shaft) ?? []), p.id]);

  out.turn[driver] = { angle: theta, ratio: 1, torque, rpm };
  const queue = [driver], seen = new Set([driver]);
  while (queue.length) {
    const id = queue.shift()!, me = out.turn[id]!, p = by.get(id)!;
    const steps: { to: string; ratio: number; angle: number; eff: number }[] = [];
    // along a shaft: the same angle, the same speed, the same torque — one solid piece of steel
    for (const other of shafts.get(p.shaft ?? '\u0000') ?? []) if (other !== id) steps.push({ to: other, ratio: 1, angle: me.angle, eff: 1 });
    // across a mesh: the ratio, the direction and the phase all at once
    for (const { to, mesh } of near.get(id) ?? []) {
      const q = by.get(to)!, phi = Math.atan2(q.at[1] - p.at[1], q.at[0] - p.at[0]);
      const angle = mesh.kind === 'rack' ? me.angle : phaseOf(p.gear.z, q.gear.z, mesh.kind, phi, me.angle);
      steps.push({ to, ratio: mesh.ratio, angle, eff: 0.98 });
    }
    for (const s of steps) {
      if (seen.has(s.to)) {
        // A CLOSED LOOP must agree with itself. Three gears in a triangle, or a planet between a sun and a ring,
        // can only be assembled if the teeth line up where the loop shuts — otherwise the last gear has to be
        // forced on, which in steel means it does not go on at all.
        const had = out.turn[s.to]!, pitch = (2 * Math.PI) / by.get(s.to)!.gear.z;
        const off = Math.abs(((s.angle - had.angle) % pitch + pitch * 1.5) % pitch - pitch / 2);
        if (off > 1e-6) out.shut.push(`${id} → ${s.to} shuts a loop that is ${((off / pitch) * 100).toFixed(0)}% of a tooth out: with these tooth counts the last gear will not go on. Change a count by one, or move a centre by a tooth.`);
        continue;
      }
      seen.add(s.to);
      out.turn[s.to] = { angle: s.angle, ratio: me.ratio * s.ratio, torque: Math.abs(me.torque * s.ratio) * s.eff, rpm: me.rpm / Math.abs(s.ratio) };
      queue.push(s.to);
    }
  }
  for (const p of parts) if (!seen.has(p.id)) out.loose.push({ id: p.id, why: (near.get(p.id) ?? []).length ? 'it meshes with something, but nothing in that group is driven' : (out.refused.find((r) => r.a === p.id || r.b === p.id)?.why ?? 'it is not close enough to anything to mesh: nothing turns it') });
  // THE TRAIN'S RATIO is the biggest reduction it reaches — the slowest thing it drives, which is what a person
  // means by "what does it come out at". Reduced to the SMALLEST at first, which on a 9:1 compound train reported
  // the 3:1 first stage: a wrong answer that looks like a right one, because the first stage is a real ratio.
  const ends = Object.entries(out.turn).filter(([id]) => id !== driver);
  out.ratio = ends.length ? ends.reduce((a, b) => (Math.abs(b[1].ratio) > Math.abs(a[1].ratio) ? b : a))[1].ratio : null;
  return out;
}

// ─── Designing a train for a wanted ratio, which is the inverse of solving one ───────────────────────────────────

/** A train worked out from what is wanted rather than from where things were put: the tooth counts and the places
 *  that give a reduction, with what it actually comes to. Nothing here is a stored arrangement — the counts come
 *  out of the ratio, so any ratio gives a train and no two ratios give the same one.
 *
 *  WHY IT IS STAGED: a single spur pair much past 6 to 1 needs a wheel six times its pinion, which is a big, heavy,
 *  flexible gear carried on one tooth of contact at a time. Real reductions are built in stages for that reason, so
 *  the ratio is split until each stage is within reach, and the stages are keyed in pairs onto shared shafts. */
export function designTrain(wanted: number, m = 0.002, b = 0.008, perStage = 6): { places: Placed[]; got: number; stages: number; says: string } {
  const R = Math.max(1 / perStage ** 3, Math.min(perStage ** 3, Math.abs(wanted) || 1));
  const up = R < 1;                                  // asked for an overdrive: the same thing the other way round
  const need = up ? 1 / R : R;
  const stages = Math.max(1, Math.ceil(Math.log(need) / Math.log(perStage) - 1e-9));
  const each = need ** (1 / stages);
  const places: Placed[] = [];
  let got = 1, x = 0, shaft: string | undefined;
  for (let s = 0; s < stages; s++) {
    const layer = s;   // each stage in its own plane, so its big wheel clears the last one's
    // THE PINION IS 18 TEETH OR MORE, because that is where a 20° rack-cut tooth stops being undercut and where a
    // big wheel's tip stops digging into it (`faults` and `meshing` both say so) — so the designer never hands back
    // a train its own checks would refuse.
    const z1 = 18, z2 = Math.max(z1 + 1, Math.round(z1 * each));
    got *= z2 / z1;
    const small: GearCut = { m, z: up ? z2 : z1, b, bore: 0.006, jn: 0.04 * m };
    const big: GearCut = { m, z: up ? z1 : z2, b, bore: 0.006, jn: 0.04 * m };
    places.push({ id: `stage${s + 1}-in`, gear: small, at: [x, 0], shaft, layer });
    const centres = ((z1 + z2) * m) / 2;
    x += centres;
    shaft = `shaft${s + 1}`;
    places.push({ id: `stage${s + 1}-out`, gear: big, at: [x, 0], shaft: s + 1 < stages ? shaft : undefined, layer });
  }
  const real = up ? 1 / got : got;
  return { places, got: real, stages, says: `${stages} stage${stages === 1 ? '' : 's'} of ${18}:${Math.round(18 * each)} teeth: ${real.toFixed(3)} to 1 against the ${wanted} asked${Math.abs(real - wanted) > 0.01 ? `, because a tooth is a whole number and 18 × ${each.toFixed(3)} is not one` : ''}` };
}

/** What a sentence asks a gear train for: the ratio, and whether it is a rack drive or an idler instead. */
export function readGears(said: string): { ratio: number; kind: 'reduction' | 'idler' | 'rack' } {
  const r = /(\d+(?:\.\d+)?)\s*(?::|\s+to\s+)\s*1/i.exec(said) ?? /\bratio\s+(\d+(?:\.\d+)?)/i.exec(said);
  const kind = /\brack\b/i.test(said) ? 'rack' : /\bidler|same direction|reverse\b/i.test(said) ? 'idler' : 'reduction';
  return { ratio: r ? Number(r[1]) : kind === 'reduction' ? 3 : 1, kind };
}

// ─── The board as a kit, so every door that draws things can draw a gear train ───────────────────────────────────
//
// Registered here because this file owns gearing, and a kit that designs a train for a ratio is gearing read
// backwards. It is NOT a stored gearbox: the tooth counts come from the ratio in the sentence, the places come from
// the centre distances those counts require, and asking for a different ratio gives a different train with
// different counts. The one thing it will not do is quietly round the ratio — it builds what the teeth can give and
// `says` what that is against what was asked.
addKit({
  id: 'gears', name: 'gear train', saidWhole: true,
  words: /\b(gears?|gear train|gearbox|reduction|rack and pinion|idler)\b/i,
  says: 'a gear train on a plate of shaft holes: involute teeth, the centres the standard gives, and the ratio its tooth counts really come to',
  choices: [
    { key: 'ratio', name: 'reduction', options: [1, 2, 3, 4, 5, 6, 9, 12, 16, 20, 25, 36, 50, 100] },
    { key: 'module', name: 'module', options: [1, 1.5, 2, 2.5, 3], unit: 'mm' },
    { key: 'kind', name: 'kind', options: ['reduction', 'idler', 'rack'] },
    { key: 'matter', name: 'made of', options: ['steel-low', 'brass', 'pom', 'pla'] },
  ],
  build(c) {
    const said = (c.said as string | undefined) ?? '';
    const asked = readGears(said);
    const m = (said && /\bm\s*(\d+(?:\.\d+)?)/i.exec(said) ? Number(/\bm\s*(\d+(?:\.\d+)?)/i.exec(said)![1]) : (c.module as number)) / 1000;
    const kind = said ? asked.kind : (c.kind as 'reduction' | 'idler' | 'rack');
    const ratio = said && asked.ratio ? asked.ratio : (c.ratio as number);
    const b = 0.008, matter = c.matter as string;
    let places: Placed[];
    let note: string;
    if (kind === 'rack') {
      // A RACK DRIVE IS A PINION AND A BAR: the pitch line stands at the pinion's pitch radius, so that distance is
      // not a choice, and how far the rack goes per turn is 2π·r — a length, never a ratio.
      const z = 20, pin: GearCut = { m, z, b, bore: 0.006, jn: 0.04 * m, matter };
      places = [{ id: 'pinion', gear: pin, at: [0, 0] }, { id: 'rack', gear: { m, z: 24, b, kind: 'rack', matter }, at: [0, -sizesOf(pin).r] }];
      note = `a ${z}-tooth pinion on a rack: ${(2 * Math.PI * sizesOf(pin).r * 1000).toFixed(1)} mm of travel per turn`;
    } else if (kind === 'idler') {
      // AN IDLER CHANGES THE DIRECTION AND NOT THE RATIO, which is the only reason one is ever fitted.
      const mk = (z: number): GearCut => ({ m, z, b, bore: 0.006, jn: 0.04 * m, matter });
      const [z1, zi] = [20, 15];
      places = [{ id: 'in', gear: mk(z1), at: [0, 0] }, { id: 'idler', gear: mk(zi), at: [((z1 + zi) * m) / 2, 0] }, { id: 'out', gear: mk(z1), at: [((z1 + zi) * m) / 2 + ((zi + z1) * m) / 2, 0] }];
      note = `an idler between two ${z1}-tooth gears: 1 to 1, and the output turns the same way as the input`;
    } else {
      const d = designTrain(ratio, m, b);
      places = d.places.map((p) => ({ ...p, gear: { ...p.gear, matter } }));
      note = d.says;
    }
    const t = train(places, places[0]!.id);
    // THE PLATE under them, big enough for what was placed, with the real centres kept
    // A PLATE REACHES PAST THE TEETH, not past the axes. Sized from the centres alone — which is what this did at
    // first — a 54-tooth wheel at module 2 hangs 56 mm over an edge drawn 30 mm from its shaft, and the picture is
    // a gearbox resting on a stamp. Every gear's tip circle is what has to fit on it.
    const reach = places.map((p) => ({ x: p.at[0], y: p.at[1], r: p.gear.kind === 'rack' ? (p.gear.z * Math.PI * m) / 2 : sizesOf(p.gear).ra }));
    const x0 = Math.min(...reach.map((q) => q.x - q.r)), x1 = Math.max(...reach.map((q) => q.x + q.r));
    const y0 = Math.min(...reach.map((q) => q.y - q.r)), y1 = Math.max(...reach.map((q) => q.y + q.r));
    const pad = 0.012, w = x1 - x0 + 2 * pad, d2 = y1 - y0 + 2 * pad;
    const cx = (x1 + x0) / 2, cy = (y1 + y0) / 2;
    // THE SHAFTS PASS THROUGH THE PLATE, declared and not left to be found. A shaft stands in a journal through
    // the plate — that is what holds it square — so the plate says what passes through it, rather than the clash
    // finder reporting three shafts driven 4.5 mm into solid steel.
    const shaftNames: string[] = [];
    const parts: Part[] = [{ name: 'the plate', shape: { box: [w, 0.01, d2] }, at: [cx, -0.005, cy], mat: 'steel-low', color: 0x3b4048, rotates: false, passes: shaftNames }];
    const layers = Math.max(1, ...places.map((p) => (p.layer ?? 0) + 1));
    const lift = (p: Placed) => 0.005 + b / 2 + (p.layer ?? 0) * (b + 0.004);
    for (const p of places) {
      // laid flat on its own plane: the section is drawn in its own plane and extruded along its own z, and each
      // stage sits a face width and a little clearance higher up its shaft than the one before it
      const g = gearPart(p.gear, p.id, [p.at[0], lift(p), p.at[1]], [-Math.PI / 2, 0, 0]);
      parts.push({ ...g, color: p.gear.kind === 'rack' ? 0x9aa7b4 : 0xb08d57 });
    }
    // one shaft per axis, tall enough for every layer it carries — a shaft per gear would have drawn two shafts
    // inside each other wherever two gears are keyed together
    const axes = new Map<string, [number, number]>();
    for (const p of places) if (p.gear.kind !== 'rack') axes.set(`${p.at[0].toFixed(6)},${p.at[1].toFixed(6)}`, p.at);
    for (const [k, at] of axes) {
      const h = 0.01 + layers * (b + 0.004);
      const name = `shaft at ${k}`;
      shaftNames.push(name);
      parts.push({ name, shape: { cyl: [0.003, h] }, at: [at[0], h / 2 - 0.005, at[1]], mat: 'steel-low', color: 0x8a8f98 });
    }
    const ratioSaid = t.ratio !== null && Math.abs(t.ratio) !== 1 ? `${Math.abs(t.ratio).toFixed(3)} to 1, ${t.ratio < 0 ? 'reversing' : 'the same way round'}` : kind === 'rack' ? 'a rack drive' : '1 to 1';
    return { name: `gear train, ${ratioSaid}`, parts, says: `${note}. ${t.meshes.length} pair${t.meshes.length === 1 ? '' : 's'} in mesh at the centres the module gives${t.refused.length ? `; ${t.refused.length} pair refused: ${t.refused[0]!.why}` : ''}` };
  },
});

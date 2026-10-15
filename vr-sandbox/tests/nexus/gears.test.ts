// What a gear has to be before any of it can be believed: a closed section that does not cross itself, a tooth of
// the thickness the standard says, a flank that IS the involute rather than a curve near it, and — the one that
// catches a phase error no ratio assertion can — two placed gears turned through a whole tooth with no steel ever
// in the same place twice.
import { describe, expect, it } from 'vitest';
import { RACK, faults, gearPart, inv, section, sizesOf, type GearCut } from '../../src/nexus/parts/gears';
import { prismVolume } from '../../src/nexus/parts/form';

const M2_Z20: GearCut = { m: 0.002, z: 20, b: 0.008, bore: 0.006 };
const deg = (d: number) => (d * Math.PI) / 180;

/** Do two segments cross, other than at a shared endpoint? The test a tooth profile has to pass to be a solid. */
function crosses(a1: [number, number], a2: [number, number], b1: [number, number], b2: [number, number]): boolean {
  const d = (p: [number, number], q: [number, number], r: [number, number]) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const same = (p: [number, number], q: [number, number]) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 1e-12;
  if (same(a1, b1) || same(a1, b2) || same(a2, b1) || same(a2, b2)) return false;
  const d1 = d(b1, b2, a1), d2 = d(b1, b2, a2), d3 = d(a1, a2, b1), d4 = d(a1, a2, b2);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
const selfCrossings = (pts: [number, number][]): number => {
  let n = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 2; j < pts.length; j++) {
    if (i === 0 && j === pts.length - 1) continue;
    if (crosses(pts[i]!, pts[(i + 1) % pts.length]!, pts[j]!, pts[(j + 1) % pts.length]!)) n++;
  }
  return n;
};

describe('a gear is the involute, or it is a cylinder with bumps', () => {
  it('the derived circles are the standard ones, from the module and the count alone', () => {
    const g = sizesOf(M2_Z20);
    expect(g.r).toBeCloseTo(0.02, 12);                      // r = m·z/2 = 2 × 20 / 2 = 20 mm
    expect(g.rb).toBeCloseTo(0.02 * Math.cos(deg(20)), 12); // base circle = r·cos α
    expect(g.ra).toBeCloseTo(0.022, 12);                    // + 1·m addendum
    expect(g.rf).toBeCloseTo(0.0175, 12);                   // − 1.25·m dedendum
    expect(g.p).toBeCloseTo(Math.PI * 0.002, 12);           // circular pitch = π·m
    expect(g.s).toBeCloseTo((Math.PI * 0.002) / 2, 12);     // half of it is tooth, half is space
  });

  it('inv(20°) is the number in every gear table', () => {
    // inv(20°) = tan 20° − 20° in radians = 0.014904, the figure printed in Machinery's Handbook's involute tables
    expect(inv(deg(20))).toBeCloseTo(0.0149044, 7);
    expect(inv(deg(25))).toBeCloseTo(0.0299753, 7);
  });

  it('the section closes, does not cross itself, and stays between root and tip', () => {
    for (const z of [8, 12, 17, 20, 37, 60, 127]) {
      const c: GearCut = { m: 0.002, z, b: 0.008, bore: 0.006 };
      const s = section(c), g = sizesOf(c);
      expect(selfCrossings(s.pts), `z=${z} draws a tooth that crosses itself`).toBe(0);
      for (const [x, y] of s.pts) {
        const rho = Math.hypot(x, y);
        expect(rho, `z=${z}: a point inside the root circle`).toBeGreaterThanOrEqual(g.rf - 1e-9);
        expect(rho, `z=${z}: a point outside the tip circle`).toBeLessThanOrEqual(g.ra + 1e-9);
      }
      expect(prismVolume(s), `z=${z} has no volume`).toBeGreaterThan(0);
    }
  });

  it('every tooth is the same tooth, z of them, evenly spaced', () => {
    const c: GearCut = { m: 0.002, z: 24, b: 0.008, bore: 0.006 };
    const s = section(c), g = sizesOf(c);
    const per = s.pts.length / g.z;
    expect(Number.isInteger(per)).toBe(true);
    // turning the section by one angular pitch must land it on itself
    const turned = s.pts.map(([x, y]) => { const a = g.pitchAngle; return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] as [number, number]; });
    for (let i = 0; i < s.pts.length; i++) {
      const j = (i + per) % s.pts.length;
      expect(Math.hypot(turned[i]![0] - s.pts[j]![0], turned[i]![1] - s.pts[j]![1])).toBeLessThan(1e-9);
    }
  });

  it('the tooth is π·m/2 thick at the pitch circle, which is what lets two of them mesh', () => {
    for (const z of [12, 20, 40]) {
      const c: GearCut = { m: 0.002, z, b: 0.008, bore: 0.006 };
      const g = sizesOf(c), s = section(c);
      // where the outline crosses the pitch circle, by walking the polygon
      const hits: number[] = [];
      for (let i = 0; i < s.pts.length; i++) {
        const a = s.pts[i]!, b = s.pts[(i + 1) % s.pts.length]!;
        const ra = Math.hypot(...a) - g.r, rb2 = Math.hypot(...b) - g.r;
        if ((ra > 0) !== (rb2 > 0)) {
          const t = ra / (ra - rb2), x = a[0] + t * (b[0] - a[0]), y = a[1] + t * (b[1] - a[1]);
          hits.push(Math.atan2(y, x));
        }
      }
      expect(hits.length, `z=${z}: the pitch circle must cross the outline twice per tooth`).toBe(2 * z);
      hits.sort((p, q) => p - q);
      // the arc from one crossing to the next, alternating tooth and space, each π·m/2
      const widths = hits.slice(1).map((h, i) => (h - hits[i]!) * g.r);
      for (const w of widths) expect(w).toBeCloseTo(g.s, 5);
    }
  });

  it('the flank is the involute itself, not a curve that looks like one', () => {
    // Take points on one flank and check each against the involute's own polar equation, which is the definition:
    // at radius ρ the flank's angle from the tooth centre is half + inv(α) − inv(acos(rb/ρ)).
    const c: GearCut = { m: 0.002, z: 20, b: 0.008, bore: 0.006 };
    const g = sizesOf(c), s = section(c);
    let checked = 0;
    for (const [x, y] of s.pts) {
      const rho = Math.hypot(x, y), th = Math.atan2(y, x);
      if (rho <= g.rb + 1e-9 || rho >= g.ra - 1e-9) continue;        // fillet and tip arc are not involute
      if (Math.abs(th) > g.pitchAngle / 2) continue;                  // only the tooth at angle 0
      const want = g.half + inv(g.alpha) - inv(Math.acos(g.rb / rho));
      expect(Math.min(Math.abs(Math.abs(th) - want), 1), `a flank point at ρ=${(rho * 1000).toFixed(2)} mm is not on the involute`).toBeLessThan(1e-9);
      checked++;
    }
    expect(checked, 'no flank points were checked, so this test proved nothing').toBeGreaterThan(8);
  });

  it('a gear says what is wrong with it rather than being quietly fixed', () => {
    expect(faults(M2_Z20)).toEqual([]);
    expect(faults({ m: 0.002, z: 12, b: 0.008, bore: 0.006 }).join(' ')).toMatch(/undercut/);
    expect(faults({ m: 0.002, z: 20.5, b: 0.008 }).join(' ')).toMatch(/whole number/);
    expect(faults({ m: 0.002, z: 4, b: 0.008 }).join(' ')).toMatch(/not a gear/);
    expect(faults({ m: 0.002, z: 20, b: 0.008, bore: 0.04 }).join(' ')).toMatch(/no metal between/);
    expect(faults({ m: 0.002, z: 20, b: 0 }).join(' ')).toMatch(/drawing, not a part/);
  });

  it('its mass comes from the real section, so the teeth and the web holes are in it', () => {
    const c: GearCut = { m: 0.002, z: 30, b: 0.008, bore: 0.006 };
    const s = section(c), g = sizesOf(c);
    const v = prismVolume(s);
    // between a disc at the root circle and one at the tip: the teeth add metal, the bore and web take it away
    expect(v).toBeLessThan(Math.PI * g.ra ** 2 * g.b);
    expect(v).toBeGreaterThan(0);
    // AGAINST THE BLANK IT IS CUT FROM, not against a band I guessed: my first bound here said under 80 g and the
    // real answer is 148 g, because a 64 mm × 8 mm steel disc is 200 g before a tooth is cut. A gear is most of its
    // blank — the spaces between teeth, the bore and the web holes take a fifth to a half of it away.
    const blank = Math.PI * g.ra ** 2 * g.b;
    expect(v / blank).toBeGreaterThan(0.5);
    expect(v / blank).toBeLessThan(0.9);
    expect(v * 7850).toBeCloseTo(0.148, 2); // m2 z30 b8 in steel, 60 mm pitch circle: ~148 g
  });

  it('a rack is the same tooth with its base circle at infinity: straight flanks at the pressure angle', () => {
    const r = section({ m: 0.002, z: 10, b: 0.008, kind: 'rack' });
    expect(selfCrossings(r.pts)).toBe(0);
    const ys = r.pts.map((p) => p[1]);
    expect(Math.max(...ys)).toBeCloseTo(0.002 * RACK.ha, 9);        // tip at +1·m
    expect(Math.min(...ys)).toBeLessThan(-0.002 * RACK.hf);         // root at −1.25·m, plus the bar behind it
    // the flank's slope is the pressure angle: Δx/Δy = tan α between a root point and the tip above it
    const flanks = r.pts.filter((p) => Math.abs(p[1] + 0.0025) < 1e-9 || Math.abs(p[1] - 0.002) < 1e-9);
    expect(flanks.length).toBeGreaterThan(10);
  });

  it('a ring gear has its teeth pointing inward, so its tip is inside its pitch circle', () => {
    const g = sizesOf({ m: 0.002, z: 60, b: 0.008, kind: 'ring' });
    expect(g.ra).toBeLessThan(g.r);
    expect(g.rf).toBeGreaterThan(g.r);
    const s = section({ m: 0.002, z: 60, b: 0.008, kind: 'ring' });
    expect(selfCrossings(s.pts)).toBe(0);
  });

  it('it is a part the rest of the library already understands', () => {
    const p = gearPart(M2_Z20, 'a test gear');
    expect(p.shape && 'prism' in p.shape).toBe(true);
    expect(gearPart({ m: 0.002, z: 10, b: 0.008, kind: 'rack' }, 'a rack').rotates).toBe(false);
    expect(p.rotates).toBeUndefined();
  });
});

// ─── The proof that the mesh is a mesh ───────────────────────────────────────────────────────────────────────────

import { contactRatio, meshing, phaseOf, planetary, teethOutline, train, type Placed, type Planetary } from '../../src/nexus/parts/gears';

/** A placed gear's outline in the plate's own coordinates, turned to `angle`. */
function outline(p: Placed, angle: number): [number, number][] {
  const pts = teethOutline(p.gear, 12), cs = Math.cos(angle), sn = Math.sin(angle);
  return pts.map(([x, y]) => [p.at[0] + x * cs - y * sn, p.at[1] + x * sn + y * cs] as [number, number]);
}
/** Where two outlines cross, which for two solids in one plane means metal in the same place. Only segments near
 *  the line of centres can touch, so the rest are skipped — the full test is 600 × 600 per step. */
function metalInMetal(A: [number, number][], B: [number, number][], mid: [number, number], near: number): number {
  const close = (pts: [number, number][]) => pts.map((q, i) => [q, pts[(i + 1) % pts.length]!] as const).filter(([q, r]) => Math.hypot(q[0] - mid[0], q[1] - mid[1]) < near || Math.hypot(r[0] - mid[0], r[1] - mid[1]) < near);
  const sa = close(A), sb = close(B);
  let n = 0;
  for (const [a1, a2] of sa) for (const [b1, b2] of sb) if (crosses(a1, a2, b1, b2)) n++;
  return n;
}

/** Is a point inside a closed polygon? For an internal pair this is the only valid test of metal in metal. */
function inside(pt: [number, number], poly: [number, number][]): boolean {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]!, [xj, yj] = poly[j]!;
    if (((yi > pt[1]) !== (yj > pt[1])) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

describe('two gears placed next to each other actually mesh', () => {
  // A REAL BACKLASH, because two nominal teeth touch on both flanks at once and a drawn pair would read as
  // touching everywhere. 0.04·m is 0.08 mm at module 2, which is what a commercial spur pair is cut with.
  const pair = (za: number, zb: number, kindB: 'spur' | 'ring' = 'spur', m = 0.002) => {
    const ga: GearCut = { m, z: za, b: 0.008, bore: 0.006, jn: 0.04 * m };
    const gb: GearCut = { m, z: zb, b: 0.008, bore: 0.006, jn: 0.04 * m, kind: kindB };
    const centres = kindB === 'ring' ? ((zb - za) * m) / 2 : ((za + zb) * m) / 2;
    return { ga, gb, centres };
  };

  it('they are judged by where they were put, and the centres come out of the standard', () => {
    const { ga, gb, centres } = pair(20, 40);
    expect(centres).toBeCloseTo(0.06, 12); // (20 + 40) × 2 / 2 = 60 mm
    const m = meshing(ga, gb, centres);
    expect('refused' in m).toBe(false);
    if ('refused' in m) return;
    expect(m.ratio).toBeCloseTo(-2, 12);          // twice the teeth, half the speed, the other way round
    expect(m.kind).toBe('external');
    expect(m.contact).toBeGreaterThan(1.4);        // a real pair is cut for 1.4 to 1.8
    expect(m.contact).toBeLessThan(1.9);
    expect(m.clearance).toBeCloseTo(0.25 * 0.002, 9); // the standard 0.25·m tip-to-root clearance falls out
  });

  it('NO TOOTH EVER PASSES THROUGH ANOTHER, through a whole tooth of travel', () => {
    for (const [za, zb] of [[20, 40], [18, 60], [17, 43], [20, 21], [24, 24], [30, 90]] as const) {
      const { ga, gb, centres } = pair(za, zb);
      const A: Placed = { id: 'a', gear: ga, at: [0, 0] }, B: Placed = { id: 'b', gear: gb, at: [centres, 0] };
      const phi = 0, steps = 24;
      let worst = 0;
      for (let i = 0; i <= steps; i++) {
        const thA = ((2 * Math.PI) / za) * (i / steps);          // one whole tooth of the driver
        const thB = phaseOf(za, zb, 'external', phi, thA);
        const hits = metalInMetal(outline(A, thA), outline(B, thB), [sizesOf(ga).r, 0], 4 * ga.m);
        worst = Math.max(worst, hits);
      }
      expect(worst, `${za} × ${zb}: the teeth pass through each other — the phase is wrong, not the ratio`).toBe(0);
    }
  });

  it('and they are really in mesh, not merely clear of each other', () => {
    // The other half of the proof: a pair that never touches also never crosses. So the tips must come inside the
    // other's tip circle — if they do not, nothing has been proved by the test above.
    const { ga, gb, centres } = pair(20, 40);
    const x = sizesOf(ga), y = sizesOf(gb);
    expect(x.ra + y.ra, 'the tip circles must overlap, or the pair is two gears standing near each other').toBeGreaterThan(centres);
    // and the overlap is about two addenda deep, as the standard proportions make it
    expect(x.ra + y.ra - centres).toBeCloseTo(2 * 0.002, 9);
  });

  it('a ring gear carries its pinion round the same way, and never through it', () => {
    // Run 7z refused this pair, having found a 0.2 mm overlap it could not explain and a phase scan symmetric
    // about the derived phase. The phase was right. What was wrong was one sign in the ring's flank: for an
    // internal pair the line of action is the tangent touching both base circles on the SAME side, so the ring's
    // flank is concave where the pinion's is convex and the involute runs the other way round the tooth. With the
    // sign right the overlap reads zero at every tooth count and every addendum tried.
    const { ga, gb, centres } = pair(20, 60, 'ring');
    expect(centres).toBeCloseTo(0.04, 12);  // (60 − 20) × 2 / 2 = 40 mm
    const m = meshing(ga, gb, centres);
    expect('refused' in m, 'refused' in m ? (m as { refused: string }).refused : '').toBe(false);
    if ('refused' in m) return;
    expect(m.kind).toBe('internal');
    expect(m.ratio).toBeCloseTo(3, 9);                 // THE SAME WAY ROUND: that is what an internal mesh is for
    expect(m.clearance).toBeCloseTo(0.25 * 0.002, 9);  // the standard 0.25·m, both ways round
    expect(m.contact).toBeGreaterThan(1.8);            // an internal pair carries more teeth than an external one
    expect(m.contact).toBeLessThan(2.2);
  });

  it('NO TOOTH PASSES THROUGH ANOTHER on an internal pair either, at any tooth count or addendum', () => {
    for (const [zp, zr, ha] of [[20, 60, 1], [30, 80, 1], [40, 80, 1], [20, 32, 1], [20, 60, 0.6], [24, 64, 0.8]] as const) {
      const m = 0.002, jn = 0.04 * m;
      const pin: GearCut = { m, z: zp, b: 0.008, bore: 0.006, jn };
      const ring: GearCut = { m, z: zr, b: 0.008, jn, kind: 'ring', ha };
      const a = ((zr - zp) * m) / 2;
      const A: Placed = { id: 'a', gear: pin, at: [0, 0] }, B: Placed = { id: 'b', gear: ring, at: [a, 0] };
      // the pinion runs INSIDE the ring, so metal in metal means a pinion point has got OUT of the ring's bore:
      // crossing that bore's outline is what meshing into a hole looks like and proves nothing by itself.
      let worst = 0;
      for (let i = 0; i <= 20; i++) {
        const thA = ((2 * Math.PI) / zp) * (i / 20), thB = phaseOf(zp, zr, 'internal', 0, thA);
        const bore = outline(B, thB), teeth = outline(A, thA);
        for (const q of teeth) {
          if (Math.hypot(q[0] + sizesOf(pin).r, q[1]) > 6 * m) continue;
          if (!inside(q, bore)) worst = Math.max(worst, 1);
        }
      }
      expect(worst, `${zp} in ${zr} at ${ha}·m addendum: the pinion's teeth are inside the ring's rim`).toBe(0);
    }
  });

  it('and it says when the ring tip outruns the pinion\'s involute, without refusing the pair', () => {
    // z_pinion ≥ 2·ha/(1 − cos α) = 34 at 20° full depth: below it the ring's tip lands inside the pinion's base
    // circle, where there is no involute to roll on. The drawn pair still clears, so this is a note and not a bar.
    const small = meshing({ m: 0.002, z: 20, b: 0.008 }, { m: 0.002, z: 60, b: 0.008, kind: 'ring' }, 0.04);
    expect('refused' in small).toBe(false);
    if ('refused' in small) return;
    expect(small.notes?.join(' ')).toMatch(/no involute left/);
    expect(small.notes?.join(' ')).toMatch(/wants 34 teeth/);
    const big = meshing({ m: 0.002, z: 40, b: 0.008 }, { m: 0.002, z: 80, b: 0.008, kind: 'ring' }, 0.04);
    expect('refused' in big ? [] : big.notes ?? []).toEqual([]);
  });

  it("but the ring's own shape is right, which is why only the pair is in question", () => {
    const c: GearCut = { m: 0.002, z: 60, b: 0.008, kind: 'ring' };
    const g = sizesOf(c), s = section(c);
    expect(g.ra).toBeLessThan(g.r);     // teeth point inward
    expect(g.rf).toBeGreaterThan(g.r);
    expect(g.ra).toBeGreaterThan(g.rb); // and the tip stays outside the base circle, so the flank is involute
    // A RIM WITH A TOOTHED BORE, not a disc with teeth pointing into it: the outline is the rim and the teeth are
    // the hole. Drawn the other way round the pinion sits inside solid metal, which is how it was first built.
    expect(s.holes!.length).toBe(1);
    expect(Math.max(...s.pts.map((p) => Math.hypot(...p)))).toBeGreaterThan(g.rf);
    expect(Math.max(...s.holes![0]!.map((p) => Math.hypot(...p)))).toBeCloseTo(g.rf, 6);
    // and its tooth is π·m/2 at its pitch circle, like any other gear's
    const teeth = teethOutline(c, 12), hits: number[] = [];
    for (let i = 0; i < teeth.length; i++) {
      const a = teeth[i]!, b = teeth[(i + 1) % teeth.length]!;
      const ra = Math.hypot(...a) - g.r, rb2 = Math.hypot(...b) - g.r;
      if ((ra > 0) !== (rb2 > 0)) { const t = ra / (ra - rb2); hits.push(Math.atan2(a[1] + t * (b[1] - a[1]), a[0] + t * (b[0] - a[0]))); }
    }
    expect(hits.length).toBe(120);
    hits.sort((p, q) => p - q);
    const widths = hits.slice(1).map((h, i) => (h - hits[i]!) * g.r);
    for (const w of widths) expect(Math.min(Math.abs(w - g.s), Math.abs(w - (g.p - g.s)))).toBeLessThan(2e-5);
  });

  it('what cannot mesh says why, in the words of what is wrong', () => {
    const g20: GearCut = { m: 0.002, z: 20, b: 0.008 };
    expect((meshing(g20, { m: 0.003, z: 20, b: 0.008 }, 0.05) as { refused: string }).refused).toMatch(/different sizes/);
    expect((meshing(g20, g20, 0.02) as { refused: string }).refused).toMatch(/would jam/);          // far too close
    expect((meshing(g20, g20, 0.0441) as { refused: string }).refused).toMatch(/of a tooth is ever in contact/); // too far
    expect((meshing(g20, { ...g20, alpha: (14.5 * Math.PI) / 180 }, 0.04) as { refused: string }).refused).toMatch(/different curves/);
    expect((meshing({ ...g20, kind: 'ring' }, { ...g20, kind: 'ring' }, 0.04) as { refused: string }).refused).toMatch(/facing out/);
  });

  it('the contact ratio is the one the path of contact gives, worked through by hand', () => {
    // A 20 × 20 pair, module 1, 20° full depth, standard 20 mm centres. Worked out in millimetres:
    //   r = 10, rb = 10·cos 20° = 9.396926, ra = 11
    //   √(11² − 9.396926²) = √32.698754 = 5.718197, twice = 11.436394
    //   a·sin α = 20 × 0.3420201 = 6.840403    path of contact = 11.436394 − 6.840403 = 4.595991
    //   base pitch = π·m·cos α = 2.952131      ε = 4.595991 / 2.952131 = 1.556838
    // THREE WRONG NUMBERS WENT THROUGH HERE BEFORE THIS ONE, all mine: 1.64, which I had carried as "the textbook
    // figure" for a 20-tooth pair and which belongs to no part of this calculation; then 1.5574 and 1.55666, from
    // doing the arithmetic above in my head twice and misrounding a square root both times. The figure below came
    // out of a calculator, and it is the first one that agreed with the code. A number a person is sure of is the
    // least reliable kind in this file — which is the whole argument for a test that computes rather than recalls.
    const g = sizesOf({ m: 0.001, z: 20, b: 0.005 });
    expect(contactRatio(g, g, 0.02, g.alpha)).toBeCloseTo(1.556838, 6);
  });
});

describe('a train of them does what a train of them does', () => {
  const m = 0.002, b = 0.008, bore = 0.006, jn = 0.04 * m;
  const g = (z: number) => ({ m, z, b, bore, jn });

  it('two gears: the ratio is the tooth counts and the direction reverses', () => {
    const t = train([{ id: 'in', gear: g(20), at: [0, 0] }, { id: 'out', gear: g(40), at: [0.06, 0] }], 'in');
    expect(t.meshes.length).toBe(1);
    expect(t.turn.out!.ratio).toBeCloseTo(-2, 9);
    expect(t.turn.out!.rpm).toBeCloseTo(30, 9);     // 60 rpm in, half the speed out
    expect(t.turn.out!.torque).toBeCloseTo(1 * 2 * 0.98, 9); // twice the torque, less one mesh's losses
    expect(t.loose).toEqual([]);
  });

  it('an idler changes the direction and not the ratio, which is the whole reason it is there', () => {
    const t = train([
      { id: 'in', gear: g(20), at: [0, 0] },
      { id: 'idler', gear: g(15), at: [0.035, 0] },
      { id: 'out', gear: g(20), at: [0.07, 0] },
    ], 'in');
    expect(t.meshes.length).toBe(2);
    expect(t.turn.out!.ratio).toBeCloseTo(1, 9);    // back to 1:1 …
    // and the idler itself spins FASTER than the driver, because `ratio` is the reduction (turns of the driver per
    // turn of this gear) and a smaller gear turns more often. Asserted -20/15 here at first, which is the speed
    // ratio: both numbers are right, for different questions, and the test was asking the wrong one.
    expect(t.turn.idler!.ratio).toBeCloseTo(-15 / 20, 9);
    expect(t.turn.idler!.rpm).toBeCloseTo(60 / (15 / 20), 6);
  });

  it('a compound train multiplies, because the two on one shaft are one piece of steel', () => {
    // 20 → 60 on one shaft with 20 → 60: 3 × 3 = 9 to 1, the standard way a reduction is built out of small gears
    const t = train([
      { id: 'in', gear: g(20), at: [0, 0] },
      { id: 'mid-big', gear: g(60), at: [0.08, 0], shaft: 's2' },
      { id: 'mid-small', gear: g(20), at: [0.08, 0], shaft: 's2' },
      { id: 'out', gear: g(60), at: [0.16, 0] },
    ], 'in');
    expect(t.turn['mid-big']!.ratio).toBeCloseTo(-3, 9);
    expect(t.turn['mid-small']!.ratio).toBeCloseTo(-3, 9);  // keyed: the same shaft, the same turns
    expect(t.turn.out!.ratio).toBeCloseTo(9, 9);
    expect(t.ratio).toBeCloseTo(9, 9);
    expect(t.turn.out!.rpm).toBeCloseTo(60 / 9, 6);
  });

  it('a gear placed where it touches nothing is told so, not quietly ignored', () => {
    const t = train([{ id: 'in', gear: g(20), at: [0, 0] }, { id: 'lonely', gear: g(20), at: [0.2, 0] }], 'in');
    expect(t.turn.lonely).toBeUndefined();
    expect(t.loose[0]!.why).toMatch(/not close enough/);
  });

  it('a pair at the wrong centres is refused by name, so the build can be fixed', () => {
    const t = train([{ id: 'in', gear: g(20), at: [0, 0] }, { id: 'out', gear: g(40), at: [0.055, 0] }], 'in');
    expect(t.meshes).toEqual([]);
    expect(t.refused[0]!.why).toMatch(/would jam|in contact/);
    expect(t.loose.length).toBe(1);
  });

  it('a rack is driven along by its pinion, so many mm per turn', () => {
    const t = train([
      { id: 'pinion', gear: g(20), at: [0, 0] },
      { id: 'rack', gear: { m, z: 30, b, kind: 'rack' as const }, at: [0, -0.02] },
    ], 'pinion');
    expect(t.meshes.length).toBe(1);
    expect(t.meshes[0]!.kind).toBe('rack');
    // one turn of a 20-tooth pinion at module 2 moves the rack 20 × π × 2 = 125.66 mm
    expect(2 * Math.PI * sizesOf(g(20)).r * 1000).toBeCloseTo(125.66, 2);
  });
});

describe('a planetary set, which is what an internal gear is for', () => {
  const m = 0.002;

  it('the ring\'s teeth are not a choice: z_ring = z_sun + 2·z_planet', () => {
    const p = planetary(24, 16, 4, m);
    expect('refused' in p).toBe(false);
    if ('refused' in p) return;
    expect(p.ring.z).toBe(24 + 2 * 16);         // 56
    expect(p.carrier).toBeCloseTo(((24 + 16) * m) / 2, 12);  // 40 mm: the planets' axes stand there
  });

  it('one set gives three ratios, each Willis with a different member held', () => {
    const p = planetary(24, 16, 4, m) as Planetary;
    expect(p.ratios.ringHeld).toBeCloseTo(1 + 56 / 24, 9);       // 3.333 — sun in, carrier out
    expect(p.ratios.carrierHeld).toBeCloseTo(-(56 / 24), 9);     // −2.333 — and it reverses
    expect(p.ratios.sunHeld).toBeCloseTo(1 + 24 / 56, 9);        // 1.429 — ring in, carrier out
  });

  it('THE PLANETS GO IN, OR THEY DO NOT — and that is a phase, not a formula', () => {
    // The assembly condition is usually quoted as "(z_sun + z_ring) / n must be whole". Here it is checked the way
    // a fitter checks it: work out each planet's angle from its mesh with the sun, then ask the ring what angle it
    // would have to stand at for THAT planet. All n answers must be the same ring, or the last planet's teeth land
    // between the ring's and it will not drop in.
    const ringAngles = (zs: number, zp: number, n: number): number[] => {
      const zr = zs + 2 * zp, out: number[] = [];
      for (let k = 0; k < n; k++) {
        const phi = (2 * Math.PI * k) / n;
        const thPlanet = phaseOf(zs, zp, 'external', phi, 0);            // from the sun, with the sun at 0
        const thRing = phaseOf(zp, zr, 'internal', phi + Math.PI, thPlanet); // what the ring must then be
        out.push(((thRing % ((2 * Math.PI) / zr)) + (2 * Math.PI) / zr) % ((2 * Math.PI) / zr));
      }
      return out;
    };
    // 24 : 16 : 56 with 4 planets — (24 + 56)/4 = 20, whole
    const good = ringAngles(24, 16, 4), pitch = (2 * Math.PI) / 56;
    for (const a of good) expect(Math.min(Math.abs(a - good[0]!), pitch - Math.abs(a - good[0]!))).toBeLessThan(1e-9);
    // 25 : 16 : 57 with 4 planets — (25 + 57)/4 = 20.5, not whole: the ring cannot be in two places at once
    const bad = ringAngles(25, 16, 4), p2 = (2 * Math.PI) / 57;
    const worst = Math.max(...bad.map((a) => Math.min(Math.abs(a - bad[0]!), p2 - Math.abs(a - bad[0]!))));
    expect(worst, 'the phases should disagree by half a tooth, which is why it will not go together').toBeGreaterThan(p2 * 0.4);
    // and the maker refuses it in those words rather than drawing it
    expect((planetary(25, 16, 4, m) as { refused: string }).refused).toMatch(/will not drop in/);
  });

  it('planets that would touch each other are refused, with the overlap measured', () => {
    // six big planets round a small sun: their tips run into one another before the ring is reached
    const bad = planetary(12, 24, 6, m);
    expect('refused' in bad).toBe(true);
    expect((bad as { refused: string }).refused).toMatch(/tips overlap by/);
  });

  it('every mesh in the set is a real mesh, judged where the geometry puts it', () => {
    const p = planetary(24, 16, 4, m) as Planetary;
    expect(p.places.length).toBe(1 + 4 + 1);
    const sunToPlanet = meshing(p.sun, p.planet, p.carrier);
    const planetToRing = meshing(p.planet, p.ring, p.carrier);
    expect('refused' in sunToPlanet).toBe(false);
    expect('refused' in planetToRing).toBe(false);
    if ('refused' in sunToPlanet || 'refused' in planetToRing) return;
    expect(sunToPlanet.ratio).toBeCloseTo(-16 / 24, 9);   // the sun turns a planet the other way
    expect(planetToRing.ratio).toBeCloseTo(56 / 16, 9);   // and the planet carries the ring the same way
    expect(sunToPlanet.contact).toBeGreaterThan(1.4);
    expect(planetToRing.contact).toBeGreaterThan(1.8);
  });

  it('and no tooth passes through another anywhere in the set', () => {
    const p = planetary(24, 16, 4, m) as Planetary;
    const sun = p.places[0]!, ring = p.places.at(-1)!;
    for (let k = 1; k <= 4; k++) {
      const planet = p.places[k]!;
      const phi = Math.atan2(planet.at[1], planet.at[0]);
      for (let i = 0; i <= 12; i++) {
        const thSun = ((2 * Math.PI) / 24) * (i / 12);
        const thPlanet = phaseOf(24, 16, 'external', phi, thSun);
        const thRing = phaseOf(16, 56, 'internal', phi + Math.PI, thPlanet);
        // the sun against this planet: two external gears, so a crossing of their outlines is metal in metal
        const mid: [number, number] = [sun.at[0] + sizesOf(p.sun).r * Math.cos(phi), sun.at[1] + sizesOf(p.sun).r * Math.sin(phi)];
        expect(metalInMetal(outline(sun, thSun), outline(planet, thPlanet), mid, 4 * m), `sun × planet ${k}`).toBe(0);
        // the planet inside the ring: it must stay within the ring's bore
        const bore = outline(ring, thRing);
        for (const q of outline(planet, thPlanet)) {
          if (Math.hypot(q[0], q[1]) < p.carrier) continue;   // only the outward half, where the ring is
          expect(inside(q, bore), `planet ${k} is inside the ring's rim`).toBe(true);
        }
      }
    }
  });
});

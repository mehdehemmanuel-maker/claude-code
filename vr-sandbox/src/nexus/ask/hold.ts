// A HOLD THAT NEEDS NO POWER. Every way a joint can be kept where it was put without a motor holding current, each
// sized from the moment it has to hold, each saying what it costs to hold (which is zero for all but the last).
//
// WHY IT EXISTS. 2026-10-17, `node tools/loop.mjs "a desk lamp with an arm that stays where you put it"`: the
// composer answered four words with TWO NEMA 17 STEPPERS, because the only way it knew to hold a position was to
// drive it there and keep the current on. An Anglepoise has held its position since 1932 with a spring and no power
// at all. The fault was not the sizing — the steppers hold 1.2 N·m and the arm needs 0.47 — it was that "hold" had
// exactly one meaning in this tree. This file is the other five.
//
// Owner of: the ways a moment is held at rest, and which of them a given joint can use. It sizes; `ask/machine.ts`
// chooses. Spring design is NOT redone here: `engineering/springs.ts` is Shigley chapter 10 and had no door.

import { allowableShear, shearStress, solidLength, springIndex, springRate, SPRING_WIRES, yieldForce, type CoilSpring } from '../../engineering/springs';

/** CGPM 1901 standard gravity, as everything else in this tree uses it. */
const G0 = 9.80665;

export type Holds = 'spring' | 'friction' | 'counterweight' | 'over-centre' | 'self-locking' | 'powered';

/** One way a joint STAYS where it was put, sized, with what staying costs. Named `Stay` and not `Hold` because
 *  `ask/conditions.ts` owns `Hold` for what holds a structure UP (a post, a wall, the ground), which is a different
 *  question with a different answer, and the tidy lint is right to refuse one word for two concerns. */
export interface Stay {
  how: Holds; name: string;
  /** the moment it will hold, N·m — what it holds, not what it was asked for */ holds: number;
  /** what it draws to hold at rest, W. Zero for every passive way, and that IS the point */ watts: number;
  /** what else it costs: mass added, drag to move it, the angles it works over */ costs: string;
  says: string; src: string;
  /** what it is made of, in the words the library draws from, so a hold reaches the bill like anything else */
  parts: { words: string; n: number }[];
  /** why this way cannot hold this joint, with the number that refuses it */ cannot?: string;
}

/** The joint a hold is asked about: what hangs on it and how it is laid out. Millimetres and kilograms, as the rest
 *  of `ask/` speaks; the arithmetic inside is SI. */
export interface Joint {
  /** what hangs beyond the joint, kg */ kg: number;
  /** how far its centre of mass is from the pivot, mm */ armMm: number;
  /** how far up the post a spring may be anchored, mm. Absent: no post to anchor to, so no spring balance */
  postMm?: number;
  /** how far along the arm a spring may be attached, mm */ attachMm?: number;
  /** the radius of the clamped face at the joint, mm (a friction hold's lever) */ faceMm?: number;
  /** the screw that drives it, if it is driven by one: its lead and mean diameter, mm */
  screw?: { leadMm: number; meanMm: number; mu?: number };
  /** how far round it swings, degrees: an over-centre catch needs somewhere past the line to rest */ swingDeg?: number;
}

/** The moment gravity puts on the joint at its worst, N·m — the arm held straight out, where sin is one. */
export const gravityMoment = (j: Joint): number => (j.kg * G0 * j.armMm) / 1000;

// ---- 1. the spring balance ------------------------------------------------------------------------------------

/** THE RESULT THIS FILE IS BUILT AROUND, and the reason a lamp needs no motor.
 *
 *  Anchor a spring `a` up the post and `b` along the arm. At angle θ from the post, the spring's length is
 *  `s² = a² + b² − 2ab·cos θ`, and the perpendicular distance from the pivot to its line is `a·b·sin θ / s`. A
 *  spring of ZERO FREE LENGTH pulls with `F = k·s`, so its moment is
 *
 *      M = k·s · (a·b·sin θ / s) = k·a·b·sin θ          — the length cancels.
 *
 *  Gravity's moment is `m·g·r·sin θ`. Both carry the same `sin θ`, so they cancel at EVERY angle at once, and the
 *  whole of balance is one equation with no θ in it:
 *
 *      k·a·b = m·g·r
 *
 *  That is why an Anglepoise stays wherever it is put through its whole range rather than at one sweet spot, and it
 *  is a geometric result, not a tuning. (Carwardine's 1932 patent GB377739; the derivation is standard in the
 *  static-balance literature, e.g. Herder, *Energy-free Systems*, TU Delft 2001, §3.)
 *
 *  THE CATCH, said plainly: no real spring has zero free length — a coil has to be wound to some length before it
 *  can pull. It is got in practice two ways, both ordinary: wind the spring with initial tension so it is already
 *  pulling at zero extension, or run the wire over a pulley / anchor it past the pivot so the geometric length and
 *  the stretched length differ by the free length. A plain extension spring with free length L0 leaves a residual
 *  `−k·L0·a·b·sin θ / s`, which is why a cheap balanced arm sags at the ends of its travel and not in the middle. */
export function springBalance(j: Joint): Stay {
  const parts: { words: string; n: number }[] = [];
  const a = (j.postMm ?? 0) / 1000, b = (j.attachMm ?? 0) / 1000, r = j.armMm / 1000, W = j.kg * G0;
  const want = W * r;
  if (!(a > 0 && b > 0)) {
    return { how: 'spring', name: 'a spring balance', holds: 0, watts: 0, costs: '', parts, says: 'balanced by a spring across the pivot', src: 'Carwardine GB377739 (1932)',
      cannot: 'nowhere to anchor it: a spring balance needs a post above the pivot and a point along the arm, and this joint gives neither' };
  }
  const k = want / (a * b);                                     // N/m, the whole of the design
  const sMax = Math.sqrt(a * a + b * b + 2 * a * b);            // θ = 180°: the longest the spring is pulled
  const fMax = k * sMax;
  const coil = coilFor(k, fMax, sMax);
  if (!coil) {
    return { how: 'spring', name: 'a spring balance', holds: 0, watts: 0, costs: '', parts, says: `wants ${k.toFixed(0)} N/m pulling ${fMax.toFixed(0)} N`, src: 'Shigley 10th ed. ch. 10',
      cannot: `no coil in the wire table makes ${k.toFixed(0)} N/m and survives ${fMax.toFixed(0)} N: move the anchors further apart, which lowers the rate as 1/(a·b)` };
  }
  parts.push({ words: `extension spring ${(coil.d * 1000).toFixed(1)}x${(coil.D * 1000).toFixed(0)}x${Math.round(coil.Na)}`, n: 1 });
  return {
    how: 'spring', name: 'a spring balance', holds: want, watts: 0,
    costs: `holds at every angle, not one: k·a·b = m·g·r has no θ in it. Wound with initial tension or anchored past the pivot, or it sags at the ends of the swing`,
    says: `${(coil.d * 1000).toFixed(1)} mm ${coil.wire.label} wire, ${(coil.D * 1000).toFixed(0)} mm mean coil, ${Math.round(coil.Na)} active coils: ${k.toFixed(0)} N/m, anchored ${j.postMm} mm up the post and ${j.attachMm} mm along the arm, pulling ${fMax.toFixed(0)} N at full stretch`,
    src: 'Carwardine GB377739 (1932); zero-free-length balance, Herder TU Delft 2001 §3; coil by Shigley 10th ed. eqs. 10-9, 10-17',
    parts,
  };
}

/** A coil that makes rate `k` and survives force `F` at extension `ext`, lightest wire first. Not a chosen spring:
 *  `Na = d⁴G/(8D³k)` is solved for every wire and every ordinary d and index C, and the ones that yield are kept. */
function coilFor(k: number, F: number, ext: number): CoilSpring | null {
  let best: CoilSpring | null = null;
  for (const wire of Object.values(SPRING_WIRES)) {
    for (const dmm of [0.8, 1.0, 1.2, 1.6, 2.0, 2.5, 3.0, 4.0, 5.0]) {
      for (const C of [5, 6, 7, 8, 9, 10, 11, 12]) {             // spring index: under 4 is hard to coil, over 12 tangles
        const d = dmm / 1000, D = C * d, Na = (d ** 4 * wire.G) / (8 * D ** 3 * k);
        if (!(Na >= 3 && Na <= 200)) continue;
        const s: CoilSpring = { d, D, Na, L0: solidLength({ d, D, Na, L0: 0, wire }), wire };
        if (Math.abs(springRate(s) / k - 1) > 0.02) continue;     // the rate it actually makes, not the one asked for
        if (yieldForce(s) < F * 1.2) continue;                    // a fifth in hand against the set point
        if (shearStress(s, F) > allowableShear(s)) continue;
        if (springIndex(s) < 4) continue;
        if (ext > 0 && ext > 12 * s.L0) continue;                 // an extension spring is not pulled to six times itself
        const mass = Na * Math.PI * D * Math.PI * (d / 2) ** 2 * wire.density;
        if (!best || mass < best.Na * Math.PI * best.D * Math.PI * (best.d / 2) ** 2 * best.wire.density) best = s;
      }
    }
  }
  return best;
}

// ---- 2. friction ----------------------------------------------------------------------------------------------

/** A JOINT CLAMPED UNTIL IT STAYS. The hold is the friction torque of an annular face pressed by the clamp bolt.
 *  Uniform-WEAR is used, not uniform-pressure: a face that has been moved a hundred times wears to constant `p·r`,
 *  and it gives the lower torque of the two, which is the one to promise. `T = μ·N·(ro + ri)/4` per face
 *  (Shigley 10th ed. eq. 16-25, written for one annular face; two faces of a clamped joint double it).
 *
 *  What it costs is honest and is the reason it is not always right: the same friction resists you MOVING it, so a
 *  friction hold is a stiff joint, and it holds the same moment whichever way gravity leans — which is also why it
 *  is the only passive hold that works when the load changes. */
export function frictionHold(j: Joint, mu = 0.2, boltN = 2500, faces = 2): Stay {
  const want = gravityMoment(j), ro = (j.faceMm ?? 0) / 1000, ri = ro * 0.4;
  if (!(ro > 0)) {
    return { how: 'friction', name: 'a clamped joint', holds: 0, watts: 0, costs: '', parts: [], says: 'held by clamping its faces', src: 'Shigley 10th ed. eq. 16-25',
      cannot: 'no clamped face at this joint: friction needs an annular face round the pivot, and none was given' };
  }
  const T = faces * mu * boltN * ((ro + ri) / 4);
  return {
    how: 'friction', name: 'a clamped joint', holds: T, watts: 0,
    costs: `the same friction resists you moving it: ${T.toFixed(2)} N·m to break it loose, every time`,
    says: `${faces} faces of ${(ro * 1000).toFixed(0)} mm outer radius clamped by one M6 at ${(boltN / 1000).toFixed(1)} kN, μ ${mu} (steel on steel, dry): holds ${T.toFixed(2)} N·m against the ${want.toFixed(2)} N·m it carries`,
    src: 'Shigley 10th ed. eq. 16-25 (uniform wear, the lower of the two and so the one to promise); μ 0.15–0.25 dry steel, Marks’ Handbook table 3.2.1',
    parts: [{ words: 'bolt M6x30', n: 1 }, { words: 'washer M6', n: 2 }],
    ...(T < want ? { cannot: `holds ${T.toFixed(2)} N·m and carries ${want.toFixed(2)}: clamp harder, widen the face, or take another way` } : {}),
  };
}

// ---- 3. a counterweight ---------------------------------------------------------------------------------------

/** THE OLDEST ONE. Hang `m₂` at `r₂` the other side so `m₂·r₂ = m₁·r₁`, and the joint is in balance at every angle
 *  for the same reason the spring is: both moments carry `sin θ` and it cancels. It costs what a spring does not —
 *  the mass is really there, so everything below the joint carries it and the whole thing is slower to swing. */
export function counterweight(j: Joint, atMm = 100): Stay {
  const r2 = atMm / 1000, m2 = (j.kg * j.armMm) / 1000 / r2;
  return {
    how: 'counterweight', name: 'a counterweight', holds: gravityMoment(j), watts: 0,
    costs: `${m2.toFixed(2)} kg more to carry and to stop: the joint now swings ${(1 + (m2 * r2 * r2) / (j.kg * (j.armMm / 1000) ** 2)).toFixed(1)}× the inertia it did`,
    says: `${m2.toFixed(2)} kg at ${atMm} mm the other side of the pivot: m₂r₂ = m₁r₁, so it balances at every angle, like the spring and for the same reason`,
    src: 'statics: both moments carry sin θ, so the balance has no angle in it',
    parts: [{ words: `steel round bar 40 ${Math.max(10, Math.round((m2 / (7850 * Math.PI * 0.02 ** 2)) * 1000))}`, n: 1 }],
  };
}

// ---- 4. a screw that will not be pushed back --------------------------------------------------------------------

/** SELF-LOCKING, AND THE ONE THAT CATCHES PEOPLE OUT. A screw holds its load with no power when its lead angle is
 *  inside its friction angle: `tan λ ≤ μ`, with `λ = atan(lead / (π·d_m))` (Shigley 10th ed. eq. 8-5 and the
 *  self-locking condition following it). Lead, not pitch — a four-start screw climbs four times as fast per turn.
 *
 *  Run this on the T8 lead screws this tree's own machines are built from and it says something worth knowing: a
 *  **T8 × 8** (four starts, 8 mm of lead) has λ = 20.0°, against a friction angle of about 9° for steel on bronze
 *  dry — so it BACKDRIVES, and a Z axis built on one drops when the current goes off. A **T8 × 2** (single start)
 *  has λ = 5.2° and holds. The difference is the number of starts and nothing else. */
export function selfLocking(j: Joint): Stay {
  const parts = [{ words: 'leadscrew T8', n: 1 }];
  if (!j.screw) {
    return { how: 'self-locking', name: 'the screw that drives it', holds: 0, watts: 0, costs: '', parts: [], says: 'held by the screw that drives it', src: 'Shigley 10th ed. eq. 8-5',
      cannot: 'nothing screw-driven at this joint' };
  }
  const { leadMm, meanMm, mu = 0.16 } = j.screw;
  const lam = Math.atan(leadMm / (Math.PI * meanMm)), phi = Math.atan(mu);
  const locks = lam <= phi;
  const deg = (x: number) => ((x * 180) / Math.PI).toFixed(1);
  return {
    how: 'self-locking', name: 'the screw that drives it', holds: locks ? gravityMoment(j) : 0, watts: 0,
    costs: locks ? `it will not be driven backwards, so it cannot be moved by hand either: every move is through the motor` : '',
    says: `lead ${leadMm} mm on a ${meanMm} mm mean diameter is a lead angle of ${deg(lam)}°, against a friction angle of ${deg(phi)}° at μ ${mu}: ${locks ? 'inside it, so it holds with the power off' : 'outside it, so it backdrives'}`,
    src: 'Shigley 10th ed. eq. 8-5 and the self-locking condition tan λ ≤ μ; μ 0.15–0.20 steel on bronze, dry, Marks’ Handbook',
    parts,
    ...(locks ? {} : { cannot: `lead angle ${deg(lam)}° is outside the friction angle ${deg(phi)}°: this screw backdrives, so the load falls when the power goes off. A single-start screw of the same diameter is ${deg(Math.atan(leadMm / 4 / (Math.PI * meanMm)))}° and holds` }),
  };
}

/** THE BIGGEST LEAD THAT STILL HOLDS, out of the leads a screw is actually made in. Self-locking wants
 *  `tan λ ≤ μ` with `λ = atan(lead / (π·d_m))`, so the lead itself is bounded: `lead ≤ π·d_m·μ`. For a T8 (7 mm
 *  mean) on brass at μ 0.16 that is 3.5 mm, so of the three leads a T8 is wound in — 8 (four starts), 4 (two) and
 *  2 (one) — only the single start holds. It is derived, not chosen: give it a different diameter or a different
 *  pair of materials and it answers differently. Null where no made lead is small enough. */
export function selfLockingLead(meanMm: number, mu = 0.16, leads = [8, 4, 2, 1]): number | null {
  const most = Math.PI * meanMm * mu;
  return leads.filter((l) => l <= most).sort((a, b) => b - a)[0] ?? null;
}

// ---- 5. over the centre ------------------------------------------------------------------------------------------

/** PAST THE LINE AND ONTO A STOP. Take the link a few degrees past where the load's line of action crosses the
 *  pivot and the load itself pushes it against a stop: the moment that was trying to open it is now trying to shut
 *  it. It holds absolutely, costs nothing, and holds in exactly ONE place, which is why it latches a cover rather
 *  than poses an arm. */
export function overCentre(j: Joint): Stay {
  const swing = j.swingDeg ?? 0;
  return {
    how: 'over-centre', name: 'an over-centre catch', holds: gravityMoment(j), watts: 0,
    costs: 'holds in one position only: it is a latch, not a pose',
    says: `taken ${Math.min(8, Math.max(3, swing / 20)).toFixed(0)}° past the line, the load holds it shut against its stop`,
    src: 'toggle geometry: past the dead point the moment reverses sign',
    parts: [{ words: 'bolt M5x12', n: 1 }],
    ...(swing > 20 ? { cannot: `this joint swings ${swing}° and an over-centre catch holds at one angle: it latches the end of the travel, it does not hold the middle` } : {}),
  };
}

// ---- which of them can hold this joint ----------------------------------------------------------------------------

/** EVERY WAY THIS JOINT CAN BE HELD, cheapest-to-hold first, each with what it costs and each refusal keeping the
 *  number that refuses it. A powered hold is included and is deliberately last: it is what the composer reached for
 *  when it was the only thing it knew, and seeing it beside five that draw nothing is the point of the file. */
export function holdsFor(j: Joint): Stay[] {
  const want = gravityMoment(j);
  const all = [springBalance(j), counterweight(j), selfLocking(j), overCentre(j), frictionHold(j)];
  all.push({
    how: 'powered', name: 'a motor holding it', holds: want, watts: +(want * 3.2).toFixed(1),
    costs: `${(want * 3.2).toFixed(1)} W burnt standing still, and it falls the moment the power does`,
    says: `a stepper geared to hold ${want.toFixed(2)} N·m, drawing its holding current the whole time it is not moving`,
    src: 'a NEMA 17 at 1.2 A per phase, 2.4 Ω: roughly 3.2 W per N·m held at a 3:1 reduction (estimate, measured per motor in machine-units.ts)',
    parts: [{ words: 'stepper nema17 40', n: 1 }],
  });
  return all.sort((a, b) => (a.cannot ? 1 : 0) - (b.cannot ? 1 : 0) || a.watts - b.watts);
}

/** The ways that really hold it, with nothing refusing them. */
export const passiveHolds = (j: Joint): Stay[] => holdsFor(j).filter((h) => !h.cannot && h.watts === 0 && h.holds >= gravityMoment(j) * 0.999);

/** What the joint can be held by, said. */
export function holdText(j: Joint): string {
  const want = gravityMoment(j);
  const out = [`${j.kg} kg at ${j.armMm} mm is ${want.toFixed(2)} N·m to hold.`];
  for (const h of holdsFor(j)) {
    out.push(`  ${h.cannot ? '✗' : h.watts ? '~' : '✓'} ${h.name}${h.watts ? ` — ${h.watts} W` : h.cannot ? '' : ' — no power'}`);
    out.push(`      ${h.cannot ?? h.says}`);
    if (!h.cannot && h.costs) out.push(`      costs: ${h.costs}`);
  }
  return out.join('\n');
}

// A linear axis, designed from what it must move (docs/NEXUS-FROM-REALITY.md, section 28): a payload over a travel, at
// a speed and an acceleration, to a resolution and within a tolerance. Every part from a law:
//
//   drive      against gravity, a lead screw that holds itself (tan λ < μ / cos 15°); otherwise a GT2 belt, resolving
//              2π r / counts per turn of the motor's encoder
//   guides     two hardened rods, clamped at both ends, the thinnest standard size whose sag under the load at
//              mid-travel is within a share of the tolerance: δ = F L³ / (192 E I); bushings to match, two a rod, spaced at least twice their length
//   carriage   an aluminium plate thick enough not to bend more than its share, and to take its screws' thread
//   force      F = m a + μ m g along it (and m g against gravity); T = F r (belt) or F l / (2π η) (screw), a half more
//   motor      designed by the motor's own loop for that torque at that speed (src/nexus/embody/motor.ts)
//   belt       tensioned past 1.5 F, stretched under F no more than its share of the tolerance; it runs between
//              the rods, and the motor stands on the carriage's side, away from the face the axis mounts by
//
// Designed in its own frame: travel along +z, rods at ±x, the carriage above them. Where a check fails the rules'
// remedy applies (a thicker rod, a wider belt, the next screw) and it is designed again.

import { MATERIALS } from '../../data/materials';
import { motorFor, type Motor, type MotorRound } from './motor';
import { part, placeParts, type Assembly, type Flaw, type Part, type V3, type Value } from './part';
import { BALL_BEARINGS, BUSHING_FRICTION, GT2, GT2_EA_PER_WIDTH, LINEAR_BUSHINGS, SCREW_FRICTION, SOCKET_HEAD, stockScrew, TR_SCREWS } from './stock';

const mm = 1e-3, g0 = 9.80665;
const mat = (id: string) => MATERIALS.find((m) => m.id === id)!;

export interface AxisAsk { id: string; name: string; travel: number; payload: number; a: number; v: number; resolution: number; tolerance: number; vertical: boolean; V: number; ambient: number; counts: number; rod?: number; beltWidth?: number; screw?: number }
export interface LinearAxis extends Assembly {
  ask: AxisAsk; drive: 'belt' | 'screw'; motor: Motor; motorHistory: MotorRound[];
  /** The mass it moves (payload, carriage and what rides on it), and its own fixed mass. */
  moving: number; fixed: number;
  /** Its extent in its own frame, and where its payload is carried: the carriage's top face. */
  length: number; width: number; carrierTop: number;
  /** How far its end blocks reach either side of its rods, across them: half of it from the rods to the face it mounts by. */
  endHeight: number;
  /** The carriage plate's extent: along the travel, and across it. */
  carriage: { length: number; width: number };
  flaws: Flaw[];
}

export function designAxis(ask: AxisAsk, carriageAt = 0.5): LinearAxis {
  const vals: Value[] = [];
  const v = (name: string, value: number, unit: string, law: string) => { vals.push({ name, value, unit, law }); return value; };
  const flaws: Flaw[] = [];
  const steel = mat('steel.52100'), al = mat('aluminum.6061-t6');
  const budget = ask.tolerance / 4;

  // the drive
  const drive: 'belt' | 'screw' = ask.vertical ? 'screw' : 'belt';
  const muLo = SCREW_FRICTION.lo, flank = Math.cos((15 * Math.PI) / 180);
  const screws = TR_SCREWS.map((s) => ({ ...s, lead: s.P * s.starts, dm: s.d - s.P / 2 })).filter((s) => !ask.vertical || Math.atan(s.lead / (Math.PI * s.dm)) < Math.atan(muLo / flank));
  const screw = drive === 'screw' ? screws[Math.min(ask.screw ?? 0, screws.length - 1)] ?? null : null;
  if (drive === 'screw' && !screw) flaws.push({ check: 'self-lock', where: ask.id, says: 'no stocked screw holds itself against gravity', law: 'tan λ < μ / cos(α/2)', value: 1, limit: 0, remedy: null });
  if (screw) v('lead screw', screw.lead, 'm', `${screw.id}: lead angle ${(Math.atan(screw.lead / (Math.PI * screw.dm)) * 180 / Math.PI).toFixed(2)}° below the friction angle ${(Math.atan(muLo / flank) * 180 / Math.PI).toFixed(2)}° (μ ${muLo}, ${SCREW_FRICTION.source}): it holds itself`);
  const teeth = 20, beltW = ask.beltWidth ?? GT2.widths[0]!, rp = (teeth * GT2.pitch) / (2 * Math.PI);
  const step = drive === 'belt' ? (2 * Math.PI * rp) / ask.counts : screw!.lead / ask.counts;
  v('resolution', step, 'm', drive === 'belt' ? `2π r / counts: a ${teeth}-tooth GT2 pulley over ${ask.counts} encoder counts` : `lead / counts over ${ask.counts} encoder counts`);
  if (step > ask.resolution) flaws.push({ check: 'resolve', where: ask.id, says: `it resolves ${(step * 1e6).toFixed(1)} µm, coarser than the ${(ask.resolution * 1e6).toFixed(0)} µm needed`, law: 'counts per travel', value: step, limit: ask.resolution, remedy: null });

  // the carriage and its guides, sized together: the carriage's mass loads the rods
  const bushingIdx = Math.min(ask.rod ?? 0, LINEAR_BUSHINGS.length - 1);
  const bushing = LINEAR_BUSHINGS[bushingIdx]!;
  const spacing = v('rod spacing', Math.max(60 * mm, 4 * bushing.D), 'm', 'four bushing diameters apart, so the carriage does not rock between them');
  const pitchB = v('bushing spacing', 2.2 * bushing.L, 'm', 'bushings on a rod at least twice their length apart, so the carriage does not rack');
  const cLen = pitchB + bushing.L + 6 * mm, cWid = spacing + bushing.D + 10 * mm;
  const fasten = 'M4', sd = SOCKET_HEAD[fasten]!.d;
  // plate: across the rods as a beam under the load, and thick enough for 1.5 d of thread
  const Fplate = ask.payload * (g0 + ask.a);
  const tBend = ((Fplate * spacing ** 3 * 12) / (48 * al.E * cLen * (budget / 2))) ** (1 / 3);
  const t = v('carriage thickness', Math.max(Math.ceil(Math.max(tBend, 1.5 * sd) * 1e3) * mm, 6 * mm), 'm', `δ = F s³/(48 E I), I = b t³/12, within ${(budget / 2 * 1e6).toFixed(1)} µm; at least 1.5 d of an M4 thread`);
  const carriageMass = cLen * cWid * t * al.density + 4 * 0.03 * (bushing.D / 15e-3) ** 2 * (bushing.L / 24e-3);
  const moving = v('moving mass', ask.payload + carriageMass, 'kg', 'the payload, the carriage plate and its four bushings');
  const endT = 14 * mm;
  const L = v('axis length', ask.travel + cLen + 2 * endT + 4 * mm, 'm', 'the travel, the carriage, two end blocks and their clearance');
  const rodL = L - 2 * mm;
  // the rods' sag: horizontally, the load at mid-span split between the rods; vertically, the payload's offset as a couple
  const Frod = ask.vertical ? (moving * g0 * (cWid / 2)) / pitchB / 2 : (moving * (g0 + 0)) / 2;
  const I = (Math.PI * bushing.d ** 4) / 64;
  // the rods are clamped in both end blocks: each bends as a beam fixed at both ends, four times stiffer than one merely resting
  const sag = v('rod sag', (Frod * rodL ** 3) / (192 * steel.E * I), 'm', `δ = F L³/(192 E I), clamped at both ends, for a ${bushing.d * 1e3} mm rod over ${(rodL * 1e3).toFixed(0)} mm, F = ${Frod.toFixed(1)} N`);
  if (sag > budget) flaws.push({ check: 'stiff', where: ask.id, says: `the rods sag ${(sag * 1e6).toFixed(0)} µm, past the ${(budget * 1e6).toFixed(0)} µm budget`, law: 'δ = F L³/(192 E I)', value: sag, limit: budget, remedy: bushingIdx < LINEAR_BUSHINGS.length - 1 ? 'a thicker rod' : null });

  // force, torque, speed: the motor is designed for them
  const F = v('drive force', moving * ask.a + BUSHING_FRICTION.mu * moving * g0 + (ask.vertical ? moving * g0 : 0), 'N', `F = m a + μ m g${ask.vertical ? ' + m g' : ''}, μ ${BUSHING_FRICTION.mu} (${BUSHING_FRICTION.source})`);
  let T: number, w: number;
  if (drive === 'belt') { T = 1.5 * F * rp; w = ask.v / rp; }
  else { const lam = Math.atan(screw!.lead / (Math.PI * screw!.dm)), phi = Math.atan(SCREW_FRICTION.mid / flank), eta = Math.tan(lam) / Math.tan(lam + phi); v('screw efficiency', eta, '1', 'η = tan λ / tan(λ + φ\')'); T = (1.5 * F * screw!.lead) / (2 * Math.PI * eta); w = (2 * Math.PI * ask.v) / screw!.lead; }
  v('motor torque', T, 'N m', drive === 'belt' ? 'T = 1.5 F r' : 'T = 1.5 F l / (2π η)');
  const shaftAtLeast = drive === 'belt' ? GT2.bores[0]! : 5 * mm;
  const { motor, history } = motorFor({ id: `${ask.id}/motor`, name: `${ask.name} motor`, T, w, V: ask.V, shaftAtLeast, ambient: ask.ambient });
  for (const f of motor.flaws) flaws.push(f);
  if (drive === 'belt') {
    const tension = v('belt tension', 1.5 * F, 'N', 'T₀ ≥ 1.5 F: no tooth jumps');
    const k = (GT2_EA_PER_WIDTH.value * beltW) / (ask.travel + cLen);
    const stretch = v('belt stretch', F / k, 'm', `δ = F / (EA/L), EA ${(GT2_EA_PER_WIDTH.value * beltW).toFixed(0)} N (${GT2_EA_PER_WIDTH.source})`);
    void tension;
    if (stretch > budget) flaws.push({ check: 'stiff', where: ask.id, says: `the belt stretches ${(stretch * 1e6).toFixed(0)} µm under the drive force`, law: 'δ = F L / EA', value: stretch, limit: budget, remedy: beltW < GT2.widths.at(-1)! ? 'a wider belt' : null });
  }

  // ---- parts, in its own frame -----------------------------------------------------------------------------------
  const P: Part[] = [];
  // the guides carry the carriage straight, the ends hold the guides to what holds the axis, the drive moves it
  const systemOf = (id: string) => (/\/(rod-[ab]|bushing-[-\d])/.test(id) ? 'guides' : /\/(carriage|bushing-screw|standoff)/.test(id) ? 'carriage' : /\/(end-|rod-clamp|mount-)/.test(id) ? 'ends' : 'drive');
  const add = (p: Omit<Part, 'mass'> & { mass?: number }, density: number) => P.push(part({ system: systemOf(p.id), ...p }, density));
  const zc = -ask.travel / 2 + carriageAt * ask.travel;
  const yRod = 0, yPlate = bushing.D / 2 + t / 2 + 1 * mm;
  for (const s of [-1, 1]) add({ id: `${ask.id}/rod-${s > 0 ? 'b' : 'a'}`, name: `hardened rod Ø${bushing.d * 1e3} × ${(rodL * 1e3).toFixed(0)} mm`, category: 'motion/guides/shafts', material: 'steel.52100', shape: { kind: 'round', r: bushing.d / 2, length: rodL, axis: 'z' }, at: [(s * spacing) / 2, yRod, 0], colour: 0xd5dbe1, values: vals.filter((x) => x.name === 'rod sag' || x.name === 'rod spacing') }, steel.density);
  for (const s of [-1, 1]) for (const e of [-1, 1]) add({ id: `${ask.id}/bushing-${s}${e}`, name: `${bushing.id} linear bushing`, category: 'motion/guides/shafts', material: 'steel.52100', shape: { kind: 'round', r: bushing.D / 2, length: bushing.L, axis: 'z', bore: bushing.d }, at: [(s * spacing) / 2, yRod, zc + (e * pitchB) / 2], colour: 0xaeb6bf, values: vals.filter((x) => x.name === 'bushing spacing'), rides: ask.id, mass: 0.03 * (bushing.D / 15e-3) ** 2 * (bushing.L / 24e-3) }, 0);
  add({ id: `${ask.id}/carriage`, name: `carriage plate ${(cWid * 1e3).toFixed(0)} × ${(cLen * 1e3).toFixed(0)} × ${(t * 1e3).toFixed(0)} mm`, category: 'motion/guides', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [cWid, t, cLen] }, at: [0, yPlate, zc], colour: 0x90a4ae, values: vals.filter((x) => x.name === 'carriage thickness' || x.name === 'moving mass'), rides: ask.id }, al.density);
  // each bushing held by two M4 screws through the plate into a clamp
  for (const s of [-1, 1]) for (const e of [-1, 1]) for (const k of [-1, 1]) {
    const len = stockScrew(t + bushing.D * 0.6)!;
    add({ id: `${ask.id}/bushing-screw-${s}${e}${k}`, name: `M4×${(len * 1e3).toFixed(0)} socket head cap screw (ISO 4762), bushing clamp`, category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M4', length: len, axis: 'y', head: 1 }, at: [(s * spacing) / 2 + (k * (bushing.D / 2 + 3 * mm)), yPlate + t / 2 - len / 2, zc + (e * pitchB) / 2], colour: 0x2b2b2b, values: [{ name: 'length', value: len, unit: 'm', law: 'through the plate and into the clamp, a stocked length' }], rides: ask.id }, 7850);
  }
  // what mounts to the carriage stands on four standoffs as tall as the clamp screws' heads it clears
  const hk = SOCKET_HEAD[fasten]!.k;
  for (const sx2 of [-1, 1]) for (const sz2 of [-1, 1]) add({ id: `${ask.id}/standoff-${sx2}${sz2}`, name: `standoff Ø8 × ${(hk * 1e3).toFixed(0)} mm, aluminium, M4 through`, category: 'structure/joints', material: 'aluminum.6061-t6', shape: { kind: 'round', r: 4 * mm, length: hk, axis: 'y', bore: 4.3 * mm }, at: [sx2 * (cWid / 2 - 7 * mm), yPlate + t / 2 + hk / 2, zc + sz2 * (cLen / 2 - 7 * mm)], colour: 0xb0bec5, values: [], rides: ask.id }, al.density);
  for (const e of [-1, 1]) {
    const z = (e * (L - endT)) / 2;
    add({ id: `${ask.id}/end-${e > 0 ? 'b' : 'a'}`, name: `end block ${(cWid * 1e3).toFixed(0)} × ${((bushing.D + 16 * mm) * 1e3).toFixed(0)} × ${(endT * 1e3).toFixed(0)} mm`, category: 'structure/joints', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [cWid, bushing.D + 16 * mm, endT] }, at: [0, yRod, z], colour: 0x78909c, values: [] }, al.density);
    for (const s of [-1, 1]) {
      const len = stockScrew(bushing.D / 2 + 8 * mm)!;
      add({ id: `${ask.id}/rod-clamp-${e}${s}`, name: `M3×${(len * 1e3).toFixed(0)} socket head cap screw (ISO 4762), rod clamp`, category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M3', length: len, axis: 'y', head: 1 }, at: [(s * spacing) / 2, yRod + (bushing.D + 16 * mm) / 2 - len / 2, z], colour: 0x2b2b2b, values: [] }, 7850);
      const len5 = stockScrew(endT + 6 * mm)!;
      add({ id: `${ask.id}/mount-${e}${s}`, name: `M5×${(len5 * 1e3).toFixed(0)} socket head cap screw (ISO 4762) and T-nut, to the frame`, category: 'structure/joints/bolted', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M5', length: len5, axis: 'y', head: 1 }, at: [(s * cWid) / 3, yRod - (bushing.D + 16 * mm) / 2 + len5 / 2 - 2 * mm, z], colour: 0x2b2b2b, values: [] }, 7850);
    }
  }
  // the drive and its motor
  let motorParts: Part[];
  if (drive === 'belt') {
    // the motor stands clear of the end block it is held from, by a plate on the block's outer face
    const R = motor.mech.diameter / 2, zP = L / 2 + Math.max(12 * mm, R + 2 * mm), zI = -zP;
    // the belt runs between the rods, in their plane; the motor stands past the end of the travel on the carriage's
    // side, away from the face the axis mounts by, where what holds the axis is
    const yB = 0;
    // its shaft points down through the plate to the pulley; its body and encoder above
    motorParts = placeParts(motor.parts, '-y', [0, yB + 10 * mm + motor.mech.length / 2, zP]);
    for (const [id, z] of [['pulley', zP], ['idler', zI]] as const) add({ id: `${ask.id}/${id}`, name: id === 'pulley' ? `GT2 ${teeth}-tooth pulley, ${GT2.bores[0]! * 1e3} mm bore` : `GT2 ${teeth}-tooth idler on two 625 bearings`, category: 'motion/transmission/belt', material: 'aluminum.6061-t6', shape: { kind: 'round', r: rp + 1 * mm, length: beltW + 2 * mm, axis: 'y' }, at: [0, yB, z], colour: 0xc0c7cf, values: [] }, al.density);
    const loopL = 2 * (zP - zI) + 2 * Math.PI * rp;
    const belt = (pts: V3[], i: number) => add({ id: `${ask.id}/belt-${i}`, name: `GT2 belt ${beltW * 1e3} mm wide, ${(Math.ceil(loopL * 1e3 / 2) * 2)} mm long loop`, category: 'motion/transmission/belt', material: 'glass-fibre reinforced neoprene', shape: { kind: 'wire', points: pts, r: 0.8 * mm }, at: [0, yB, 0], colour: 0x111111, values: vals.filter((x) => x.name === 'belt tension' || x.name === 'belt stretch'), mass: loopL * beltW * 1.5e-3 * 1200 / 2 }, 0);
    // the motor plate: from the end block's outer face out under the motor's flange, the shaft through it to the pulley
    const plateY = yB + 10 * mm - 1.5 * mm;
    add({ id: `${ask.id}/motor-plate`, name: `motor plate ${(2 * R * 1e3).toFixed(0)} × ${((zP + R - L / 2) * 1e3).toFixed(0)} × 3 mm, aluminium, from the end block`, category: 'structure/joints/brackets', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [2 * R, 3 * mm, zP + R - L / 2] }, at: [0, plateY, (L / 2 + zP + R) / 2], colour: 0x90a4ae, values: [] }, al.density);
    const fl = stockScrew(3 * mm + 6 * mm)!;
    for (const [sx2, sz2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) add({ id: `${ask.id}/motor-screw-${sx2}${sz2}`, name: `M3×${(fl * 1e3).toFixed(0)} socket head cap screw (ISO 4762), motor flange`, category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M3', length: fl, axis: 'y', head: -1 }, at: [sx2 * R * 0.7, plateY - 1.5 * mm + fl / 2, zP + sz2 * R * 0.7], colour: 0x2b2b2b, values: [], into: [`${ask.id}/motor-plate`, `${ask.id}/motor/housing`] }, 7850);
    // the idler on an axle between two brackets from the other end block
    const ir = rp + 1 * mm, ih = (beltW + 2 * mm) / 2, bz0 = -L / 2, bz1 = zI - ir - 3 * mm;
    for (const s of [-1, 1]) add({ id: `${ask.id}/idler-bracket-${s > 0 ? 'b' : 'a'}`, name: `idler bracket ${((bz0 - bz1) * 1e3).toFixed(0)} × 18 × 3 mm, aluminium`, category: 'structure/joints/brackets', material: 'aluminum.6061-t6', shape: { kind: 'block', size: [18 * mm, 3 * mm, bz0 - bz1] }, at: [0, s * (ih + 1.5 * mm), (bz0 + bz1) / 2], colour: 0x90a4ae, values: [] }, al.density);
    const axle = stockScrew(2 * ih + 6 * mm + 4 * mm)!;
    add({ id: `${ask.id}/idler-axle`, name: `M5×${(axle * 1e3).toFixed(0)} socket head cap screw (ISO 4762), the idler's axle, and nut`, category: 'structure/fasteners/screws', material: 'steel class 8.8', shape: { kind: 'screw', size: 'M5', length: axle, axis: 'y', head: 1 }, at: [0, ih + 3 * mm - axle / 2, zI], colour: 0x2b2b2b, values: [], into: [`${ask.id}/idler-bracket-a`, `${ask.id}/idler-bracket-b`, `${ask.id}/idler`] }, 7850);
    belt([[rp, yB, zI], [rp, yB, zP]], 1);
    belt([[-rp, yB, zI], [-rp, yB, zc - cLen / 2], [-rp, yPlate - t / 2, zc], [-rp, yB, zc + cLen / 2], [-rp, yB, zP]], 2);
  } else {
    const zM = -L / 2 - motor.mech.length / 2 - 18 * mm;
    motorParts = placeParts(motor.parts, 'z', [0, yRod, zM]);
    add({ id: `${ask.id}/coupler`, name: `jaw coupling ${(motor.mech.shaft * 1e3).toFixed(0)}–${screw!.d * 1e3} mm bores`, category: 'motion/transmission/coupling', material: 'aluminum.6061-t6', shape: { kind: 'round', r: 10 * mm, length: 25 * mm, axis: 'z' }, at: [0, yRod, -L / 2 - 6 * mm], colour: 0xb0bec5, values: [] }, al.density);
    add({ id: `${ask.id}/screw`, name: `${screw!.id} lead screw × ${(L * 1e3).toFixed(0)} mm`, category: 'motion/transmission/screw', material: 'stainless.304', shape: { kind: 'round', r: screw!.d / 2, length: L, axis: 'z' }, at: [0, yRod, 0], colour: 0xcfd8dc, values: vals.filter((x) => x.name === 'lead screw' || x.name === 'screw efficiency') }, 8000);
    add({ id: `${ask.id}/nut`, name: `${screw!.id} flanged bronze nut`, category: 'motion/transmission/screw', material: 'bronze', shape: { kind: 'round', r: 11 * mm, length: 15 * mm, axis: 'z', bore: screw!.d }, at: [0, yRod, zc], colour: 0xc9a227, values: [], rides: ask.id }, 8800);
    const top = BALL_BEARINGS.find((b) => b.d >= screw!.d)!;
    add({ id: `${ask.id}/screw-bearing`, name: `${top.id} bearing at the screw's free end`, category: 'motion/guides/bearings', material: 'steel.52100', shape: { kind: 'round', r: top.D / 2, length: top.B, axis: 'z', bore: top.d }, at: [0, yRod, (L - endT) / 2], colour: 0xdfe4ea, values: [] }, steel.density);
  }
  // the motor's own flange screws, into the end block or a mount plate
  const all = [...P, ...motorParts.map((p) => ({ ...p, category: p.category }))];
  const mass = (pred: (p: Part) => boolean) => all.filter(pred).reduce((s, p) => s + p.mass, 0);
  return {
    id: ask.id, name: ask.name, category: 'motion', from: ask.id, parts: all, values: vals, ask, drive, motor, motorHistory: history,
    moving: mass((p) => p.rides === ask.id) + ask.payload, fixed: mass((p) => p.rides !== ask.id),
    // what mounts to the carriage sits on its face past the heads of the screws that clamp its bushings
    length: L, width: cWid, carrierTop: yPlate + t / 2 + SOCKET_HEAD[fasten]!.k, endHeight: bushing.D + 16 * mm, carriage: { length: cLen, width: cWid }, flaws,
  };
}

/** Design, find flaws, remedy, design again. */
export function axisFor(ask: AxisAsk, carriageAt = 0.5, rounds = 10): { axis: LinearAxis; history: { ask: AxisAsk; flaws: Flaw[] }[] } {
  let cur = { ...ask };
  const history: { ask: AxisAsk; flaws: Flaw[] }[] = [];
  for (let r = 0; r < rounds; r++) {
    const a = designAxis(cur, carriageAt);
    history.push({ ask: cur, flaws: a.flaws });
    const remedy = a.flaws.find((f) => f.remedy && ['a thicker rod', 'a wider belt'].includes(f.remedy))?.remedy;
    if (!remedy) return { axis: a, history };
    if (remedy === 'a thicker rod') cur = { ...cur, rod: (cur.rod ?? 0) + 1 };
    if (remedy === 'a wider belt') cur = { ...cur, beltWidth: GT2.widths[GT2.widths.indexOf(cur.beltWidth ?? GT2.widths[0]!) + 1]! };
  }
  return { axis: designAxis(cur, carriageAt), history };
}

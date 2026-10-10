// Operating what was built (docs/NEXUS-FROM-REALITY.md, section 30): the machine run through time under the duty its
// own wants ask (speed it up as fast as asked to the speed asked, hold it, climb the grade, stop it; or keep a room
// through cold days), every subsystem observed as it goes, and a failure found when one passes what its law allows: a
// winding past its class, a conductor past its insulation, a store past its current or out of energy before the
// range, a speed not reached, a room colder than asked. Each failure is an event at its time in the subsystem where it
// happens, with what it hangs from (src/nexus/embody/causal.ts): the cause traced, not a cosmetic mark.
//
// The design learns from it (practice): what operating observed becomes what the design must meet (the torque a motor
// holds continuously is the duty's root mean square, the energy stored is what the trip used), and it is built again
// and operated again until the duty holds or nothing it learned changes it.

import type { Structure } from '../substrate/manifold';
import type { Intent } from '../ask/want';
import { embodyAny, type Learned } from './any';
import { causalOf, trace } from './causal';
import type { Machine, Plant } from './embody';
import { conductorTemperature } from './electrical';
import { INSULATIONS, PEAK_OVER_CONTINUOUS } from './stock';

export interface Channel { node: string; name: string; unit: string; values: number[] }
/**
 * A failure while operating: when, where, what it broke and by which law; what asked it past its limit (the demand that
 * reaches it, downstream along what it feeds or drives), what it hangs from (its supply and command, upstream), and
 * what loses it if it fails.
 */
export interface OpEvent { t: number; node: string; says: string; law: string; check: string; demand: string[]; supply: string[]; effects: string[] }
export interface Operation {
  duty: string; dt: number; t: number[]; channels: Channel[]; events: OpEvent[];
  /** What it observed that a design can be made to meet. */
  observed: { rmsTorque: Record<string, number>; peakTorque: Record<string, number>; hottest: Record<string, number>; storeEnergy?: number; storePeak?: number; tooCold?: number; heatNeeded?: number };
}

const eta = 0.9;
const lerp = (table: [number, number][], x: number) => { for (let i = 1; i < table.length; i++) if (x <= table[i]![0]) { const [x0, y0] = table[i - 1]!, [x1, y1] = table[i]!; return y0 + ((y1 - y0) * (x - x0)) / Math.max(1e-9, x1 - x0); } const [xa, ya] = table.at(-2)!, [xb, yb] = table.at(-1)!; return yb + ((yb - ya) * (x - xb)) / Math.max(1e-9, xb - xa); };

/** Run the machine through the duty its wants ask, observing every subsystem; null where it has nothing to operate. */
export function operate(m: Machine): Operation | null {
  const p = m.plant;
  if (!p || (!p.move && !p.hold)) return null;
  const causal = causalOf(m), events: OpEvent[] = [], seen = new Set<string>();
  const event = (t: number, node: string, check: string, says: string, law: string) => {
    if (seen.has(`${node}|${check}`)) return; seen.add(`${node}|${check}`);
    // what asks it: a store or a conductor is asked by what it feeds; a motor by what it drives; a room's heating by the room
    const demand = trace(causal, node, 'down', check === 'heat' || check === 'speed' ? ['drive'] : ['power', 'drive']).slice(0, 8);
    events.push({ t, node, check, says, law, demand, supply: trace(causal, node, 'up', ['power', 'signal']).slice(0, 8), effects: trace(causal, node, 'down', ['power', 'drive', 'support']).slice(0, 8) });
  };
  return p.move ? move(m, p, event, events) : hold(p, event, events);
}

function move(m: Machine, p: Plant, event: (t: number, node: string, check: string, says: string, law: string) => void, events: OpEvent[]): Operation {
  const mv = p.move!, g = 9.80665, dt = 0.5;
  const tAcc = mv.vTop / Math.max(0.05, mv.accel), cruise = Math.min(mv.range / Math.max(0.1, mv.vTop), 1200), climb = mv.grade > 0 ? Math.min(120, cruise / 3) : 0;
  const tStop = mv.vTop / Math.max(0.05, mv.decel), T = 2 * tAcc + cruise + tStop + 5;
  const duty = `up to ${mv.vTop.toFixed(1)} m/s at ${mv.accel} m/s², ${(cruise / 60).toFixed(0)} min held${climb ? `, ${climb.toFixed(0)} s of it up a ${(mv.grade * 100).toFixed(0)} % grade` : ''}, stopped at ${mv.decel} m/s²`;
  const t: number[] = [], speed: number[] = [], force: number[] = [];
  const torque = new Map(p.drives.map((d) => [d.node, [] as number[]])), wind = new Map(p.drives.map((d) => [d.node, [] as number[]]));
  const dT = new Map(p.drives.map((d) => [d.node, 0])), sq = new Map(p.drives.map((d) => [d.node, 0])), peakT = new Map(p.drives.map((d) => [d.node, 0])), hottest = new Map(p.drives.map((d) => [d.node, d.motor.ambient]));
  const storeI: number[] = [], soc: number[] = [], cableC: number[] = [];
  let v = 0, x = 0, E = 0, Ipk = 0, phase: 'up' | 'hold' | 'stop' = 'up', holdT = 0, reached = false;
  const S = p.store, ins = (id: string) => INSULATIONS.find((i) => i.id === id) ?? INSULATIONS[1]!;
  for (let k = 0; k * dt <= T; k++) {
    const time = k * dt;
    // what the duty asks this instant
    let aWant = 0;
    if (phase === 'up') { aWant = mv.accel; if (v >= mv.vTop) { phase = 'hold'; reached = true; } if (time > 2 * tAcc && !reached) { event(time, p.drives[0]?.node ?? 'the whole', 'speed', `${v.toFixed(1)} m/s after ${time.toFixed(0)} s: the ${mv.vTop.toFixed(1)} m/s asked is not reached`, 'F = m a + R(v): what the drives give at their peak'); phase = 'hold'; } }
    if (phase === 'hold') { aWant = (mv.vTop - v) / 2; holdT += dt; if (holdT >= cruise) phase = 'stop'; }
    if (phase === 'stop') aWant = -mv.decel;
    const grade = phase === 'hold' && climb && holdT > (cruise - climb) / 2 && holdT < (cruise + climb) / 2 ? mv.grade : 0;
    const R = Math.max(0, lerp(mv.resist, v));
    let F = mv.mass * aWant + R + mv.mass * g * grade;
    // what the drives can give: each motor up to its peak, the short-time duty over its continuous rating
    const Fmax = p.drives.reduce((a, d) => a + (d.map.kind === 'wheel' ? (PEAK_OVER_CONTINUOUS.value * d.motor.T * d.map.G * eta) / d.map.r : Infinity), 0);
    if (F > Fmax) F = Fmax;
    const aNow = phase === 'stop' ? aWant : (F - R - mv.mass * g * grade) / mv.mass;
    v = Math.max(0, v + aNow * dt); x += v * dt;
    // each drive: its torque and speed from what it turns, its heat from its losses through its time constant
    let P = 0, worstCable = 0;
    for (const d of p.drives) {
      let Tq = 0, w = d.motor.w;
      const pull = Math.max(0, F); // braking is the brakes' (or the fluid's), not the motors'
      if (d.map.kind === 'wheel') { Tq = (pull * d.map.share * d.map.r) / (d.map.G * eta); w = (v * d.map.G) / d.map.r; }
      else if (d.map.kind === 'rotor') { const th = Math.hypot(mv.hover?.thrust ?? mv.mass * g, R + mv.mass * Math.max(0, aWant)) / d.map.n; Tq = (d.map.Qh * th) / d.map.Th; w = d.map.wh * Math.sqrt(th / d.map.Th); }
      else { const vEff = Math.max(0.3, v); w = (2 * Math.PI * vEff) / (d.map.J * d.map.D); Tq = (pull * d.map.share * vEff) / (0.6 * w); }
      const mo = d.motor, hA = (mo.Pcu + mo.Pfe) / Math.max(1, (mo.Tw - mo.ambient) / 1.25), C = mo.mass * 500;
      const loss = mo.Pcu * (Tq / Math.max(1e-6, mo.T)) ** 2 + mo.Pfe * Math.max(0, w / Math.max(1e-6, mo.w)) ** 1.5;
      const rise = dT.get(d.node)! + ((loss - hA * dT.get(d.node)!) / C) * dt; dT.set(d.node, rise);
      const Tw = mo.ambient + 1.25 * rise;
      torque.get(d.node)!.push(Tq); wind.get(d.node)!.push(Tw);
      sq.set(d.node, sq.get(d.node)! + Tq * Tq * dt); peakT.set(d.node, Math.max(peakT.get(d.node)!, Tq)); hottest.set(d.node, Math.max(hottest.get(d.node)!, Tw));
      if (Tw > mo.limit) event(time, d.node, 'heat', `its winding reaches ${Tw.toFixed(0)} °C, past class F's ${mo.limit} °C, at ${Tq.toFixed(1)} N m against the ${mo.T.toFixed(1)} N m it was designed to hold`, 'ΔT = P/(hA) through its thermal time constant m c/(hA)');
      const Pe = Tq * w + loss; P += Pe;
      const cab = d.circuit ? p.conductors.find((c) => c.node === d.circuit) : null;
      if (cab && S) {
        const I = Pe / S.V, i2 = ins(cab.ins), Tc = conductorTemperature(cab.awg, i2, I / cab.n, mo.ambient);
        worstCable = Math.max(worstCable, Tc);
        if (Tc > i2.maxC) event(time, cab.node, 'cable', `its conductors reach ${Tc.toFixed(0)} °C at ${I.toFixed(0)} A, past ${i2.name}'s ${i2.maxC} °C`, 'I² R heating against the insulation\'s rating');
      }
    }
    if (S) {
      const I = P / (S.V * eta); Ipk = Math.max(Ipk, I); E += (P / eta) * dt;
      if (I > S.Imax) event(time, S.node, 'current', `it is asked ${I.toFixed(0)} A, past the ${S.Imax.toFixed(0)} A its cells give`, 'I ≤ cells in parallel × the current each is rated for');
      storeI.push(I); soc.push(1 - E / S.E);
    }
    t.push(time); speed.push(v); force.push(F); cableC.push(worstCable);
    if (phase === 'stop' && v <= 0) break;
  }
  // the trip it was asked for, from the part of it run here
  const sim = Math.max(1, x), projected = S ? E * (mv.range / sim) : 0;
  if (S && projected > S.E) event(t.at(-1)!, S.node, 'energy', `the trip asked uses ${(projected / 3.6e6).toFixed(1)} kWh; it stores ${(S.E / 3.6e6).toFixed(1)}: it runs out at ${((mv.range * S.E) / projected / 1e3).toFixed(1)} of ${(mv.range / 1e3).toFixed(1)} km`, 'the energy over the trip is what the store holds');
  const rms = Object.fromEntries(p.drives.map((d) => [d.node, Math.sqrt(sq.get(d.node)! / Math.max(dt, t.at(-1)!))]));
  const channels: Channel[] = [{ node: 'the whole', name: 'speed', unit: 'm/s', values: speed }, { node: 'the whole', name: 'force', unit: 'N', values: force },
    ...p.drives.flatMap((d) => [{ node: d.node, name: 'torque', unit: 'N m', values: torque.get(d.node)! }, { node: d.node, name: 'winding', unit: 'degC', values: wind.get(d.node)! }]),
    ...(S ? [{ node: S.node, name: 'current', unit: 'A', values: storeI }, { node: S.node, name: 'charge', unit: '1', values: soc }] : []),
    { node: 'wiring', name: 'hottest conductor', unit: 'degC', values: cableC }];
  return { duty, dt, t, channels, events: events.sort((a, b) => a.t - b.t), observed: { rmsTorque: rms, peakTorque: Object.fromEntries(peakT), hottest: Object.fromEntries(hottest), ...(S ? { storeEnergy: projected, storePeak: Ipk } : {}) } };
}

function hold(p: Plant, event: (t: number, node: string, check: string, says: string, law: string) => void, events: OpEvent[]): Operation {
  const h = p.hold!, dt = 120, days = 3, T = days * 86400;
  const duty = `${days} days at the coldest the site gives, ${h.Tcold.toFixed(0)} °C at dawn and 8 K warmer by afternoon, kept at ${h.Tlo.toFixed(0)} °C`;
  const t: number[] = [], room: number[] = [], out: number[] = [], duty1: number[] = [];
  let Tin = h.Tlo + 1, on = false, coldest = Infinity, needed = 0;
  for (let k = 0; k * dt <= T; k++) {
    const time = k * dt, Tout = h.Tcold + 4 - 4 * Math.cos((2 * Math.PI * time) / 86400);
    if (Tin < h.Tlo + 0.3) on = true; if (Tin > h.Tlo + 1.2) on = false;
    const P = on ? h.heat : 0;
    Tin += ((P + h.gains - h.UA * (Tin - Tout)) / h.C) * dt;
    needed = Math.max(needed, h.UA * (h.Tlo - Tout) - h.gains);
    if (time > 6 * 3600) { coldest = Math.min(coldest, Tin); if (Tin < h.Tlo - 0.5) event(time, h.node, 'cold', `the inside falls to ${Tin.toFixed(1)} °C at ${(Tout).toFixed(0)} °C outside, under the ${h.Tlo.toFixed(0)} °C asked, the heating flat out`, 'C dT/dt = P + gains − U A (T − T_out)'); }
    t.push(time); room.push(Tin); out.push(Tout); duty1.push(P / Math.max(1, h.heat));
  }
  return { duty, dt, t, channels: [{ node: 'inside', name: 'inside', unit: 'degC', values: room }, { node: 'outside air', name: 'outside', unit: 'degC', values: out }, { node: h.node, name: 'heating on', unit: '1', values: duty1 }], events, observed: { rmsTorque: {}, peakTorque: {}, hottest: {}, tooCold: coldest, heatNeeded: needed } };
}

/**
 * Practice: build it, operate it, find what failed and why, learn what the design must meet from what was observed,
 * build it again and operate it again, until the duty holds or what it learned no longer changes anything.
 */
export function practice(intent: Intent, s: Structure, tries = 4): { machine: Machine; operation: Operation | null; history: { learned: Learned; events: OpEvent[] }[]; learned: Learned } {
  let learned: Learned = {}, machine = embodyAny(intent, s, 8, learned)!, operation = operate(machine);
  const history: { learned: Learned; events: OpEvent[] }[] = [{ learned, events: operation?.events ?? [] }];
  for (let k = 1; k < tries && operation && operation.events.length; k++) {
    const next = learnFrom(operation, machine, learned);
    if (!next) break;
    learned = next; machine = embodyAny(intent, s, 8, learned)!; operation = operate(machine);
    history.push({ learned, events: operation?.events ?? [] });
  }
  return { machine, operation, history, learned };
}

/** What the design must meet, from what operating it observed; null where nothing observed is the design's to meet. */
export function learnFrom(op: Operation, m: Machine, prev: Learned): Learned | null {
  const next: Learned = { ...prev, why: [...(prev.why ?? [])] };
  let changed = false;
  for (const e of op.events) {
    if (e.check === 'heat' || e.check === 'speed') {
      // the torque a motor holds continuously is its duty's root mean square, with a tenth to spare; its peak what the duty peaked at
      const rms = Math.max(...Object.values(op.observed.rmsTorque)), pk = Math.max(...Object.values(op.observed.peakTorque));
      const need = Math.max(rms * 1.1, pk / PEAK_OVER_CONTINUOUS.value);
      if (need > (prev.torque ?? 0) * 1.01) { next.torque = need; next.why!.push(`${e.node}: ${e.says} → hold ${need.toFixed(1)} N m continuously, the duty's RMS ${rms.toFixed(1)} N m and a tenth`); changed = true; }
    }
    if (e.check === 'energy' && op.observed.storeEnergy) {
      const f = (op.observed.storeEnergy / Math.max(1, m.plant!.store!.E)) * 1.05 * (prev.energy ?? 1);
      if (f > (prev.energy ?? 1) * 1.01) { next.energy = f; next.why!.push(`${e.node}: ${e.says} → store ${f.toFixed(2)} times the energy`); changed = true; }
    }
    if (e.check === 'current' && op.observed.storePeak) {
      const f = (op.observed.storePeak / Math.max(1, m.plant!.store!.Imax)) * 1.1 * (prev.current ?? 1);
      if (f > (prev.current ?? 1) * 1.01) { next.current = f; next.why!.push(`${e.node}: ${e.says} → cells for ${f.toFixed(2)} times the current`); changed = true; }
    }
    if (e.check === 'cable') { const f = (prev.cable ?? 1) * 1.5; next.cable = f; next.why!.push(`${e.node}: ${e.says} → conductors for ${f.toFixed(1)} times the design current`); changed = true; }
    if (e.check === 'cold' && op.observed.heatNeeded) {
      const f = ((op.observed.heatNeeded * 1.25) / Math.max(1, m.plant!.hold!.heat)) * (prev.heat ?? 1);
      if (f > (prev.heat ?? 1) * 1.01) { next.heat = f; next.why!.push(`${e.node}: ${e.says} → heating for ${(op.observed.heatNeeded * 1.25).toFixed(0)} W, what the coldest hour needed and a quarter`); changed = true; }
    }
  }
  return changed ? next : null;
}

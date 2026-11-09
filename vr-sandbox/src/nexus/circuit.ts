// The circuit of a built thing (package P6 of plan/AUDIT.md): a nodal circuit read from a room Block's power lines,
// solved by modified nodal analysis (each node's currents summed to zero, each source's voltage written, one linear
// system, numeric.ts `solveLinear`). Read from the block, never typed in:
// - a supply: a piece with a power line `/out` and no `/in`: a voltage source of its size's V, up to its current limit
//   (then it holds that current, its voltage falling);
// - a driver: a piece with power lines `/in` and `/out`: an ideal chopper, its output its duty times its input, its
//   input current its duty times its output's, its output current never above its limit (it chops down to hold it);
//   its input's and output's − one node (a buck chopper's model, its output referred to its ground);
// - a motor: a power line linked to its row in data/motors.ts (`std`), driven by that row's own R, K_t and K_e
//   (engineering/dcmotor.ts `motorModel`; K_e = K_t in SI units): V = I R + K_e ω and T = K_t I; its inductance where
//   the row gives one (steady state: L di/dt is zero, so L is reported, not used);
// - a wire: a round piece of a conducting material touching two of those, each core R = L / (σ A), its length and
//   section its solid's, σ its material's electrical conductivity from the materials table (matter.ts); the piece drawn
//   is one core of a pair, its return core taken equal. Terminals touching directly are one node.
// Steady state only; one supply, at most one driver and one motor (more are refused, saying so); the motor's load is
// taken as one that holds still when not overcome (friction-like: a load that drives the motor back is not modelled).

import type { Block, Line, Piece } from './room';
import type { BlockDef } from './blocks';
import { matterOf } from './matter';
import { solveLinear } from './numeric';
import { motorModel, type MotorModel } from '../engineering/dcmotor';
import { motorOfLine } from './parts/power';
import type { MotorData } from '../data/motors';

type El = { k: 'R'; a: string; b: string; R: number; name: string }
  | { k: 'V'; p: string; n: string; V: number }
  /** a current I leaving p through the element into n */
  | { k: 'I'; p: string; n: string; I: number }
  /** an ideal DC transformer: v(op) − v(on) = d (v(ip) − v(in)), its input drawing d times what its output gives */
  | { k: 'X'; ip: string; in: string; op: string; on: string; d: number };

/** Modified nodal analysis: the node voltages (ground 0) and each V and X element's branch current (the current leaving
 *  its + node into it), or null where the system is singular (a node with no path). */
export function mna(els: El[], ground: string): { v: Record<string, number>; j: number[] } | null {
  const nodes = [...new Set(els.flatMap((e) => (e.k === 'R' ? [e.a, e.b] : e.k === 'X' ? [e.ip, e.in, e.op, e.on] : [e.p, e.n])))].filter((n) => n !== ground);
  const at = new Map(nodes.map((n, i) => [n, i])), branches = els.filter((e) => e.k === 'V' || e.k === 'X'), N = nodes.length + branches.length;
  const A = Array.from({ length: N }, () => new Array<number>(N).fill(0)), b = new Array<number>(N).fill(0);
  const put = (r: string, c: number, x: number) => { const i = at.get(r); if (i !== undefined) A[i]![c] += x; };
  const col = (n: string) => at.get(n);
  let k = nodes.length;
  for (const e of els) {
    if (e.k === 'R') { const g = 1 / e.R, ia = col(e.a), ib = col(e.b); if (ia !== undefined) { A[ia]![ia] += g; if (ib !== undefined) A[ia]![ib] -= g; } if (ib !== undefined) { A[ib]![ib] += g; if (ia !== undefined) A[ib]![ia] -= g; } }
    else if (e.k === 'I') { const ip = col(e.p), inn = col(e.n); if (ip !== undefined) b[ip] -= e.I; if (inn !== undefined) b[inn] += e.I; }
    else if (e.k === 'V') { put(e.p, k, 1); put(e.n, k, -1); const ip = col(e.p), inn = col(e.n); if (ip !== undefined) A[k]![ip] += 1; if (inn !== undefined) A[k]![inn] -= 1; b[k] = e.V; k++; }
    else { put(e.op, k, 1); put(e.on, k, -1); put(e.ip, k, -e.d); put(e.in, k, e.d);
      for (const [n, s] of [[e.op, 1], [e.on, -1], [e.ip, -e.d], [e.in, e.d]] as [string, number][]) { const i = col(n); if (i !== undefined) A[k]![i] += s; }
      k++; }
  }
  const x = solveLinear(A, b); if (!x || !x.every(Number.isFinite)) return null;
  const v: Record<string, number> = { [ground]: 0 }; nodes.forEach((n, i) => { v[n] = x[i]!; });
  return { v, j: x.slice(nodes.length) };
}

const power = (p: Piece) => p.lines.filter((l) => l.kind === 'power');
const ends = (l: Line, w: string) => l.port.endsWith(`/${w}`);
/** Electrical conductivity of a material, S/m, and where it is from (matter.ts), or null where none is known. */
export function conductivityOf(mat: string): { sigma: number; source: string } | null {
  try { const p = matterOf(mat).props.find((q) => q.key === 'conductivity'); return p && p.value > 0 ? { sigma: p.value, source: p.source } : null; } catch { return null; }
}

export interface Terminal { port: string; plus: number; minus: number; across: number }
export interface CircuitOut {
  refused?: string;
  /** the motor's current, A; its terminal voltage, V; its speed, rad/s; its torque K_t I, N m */
  current?: number; voltage?: number; speed?: number; torque?: number;
  /** the supply's current and the driver's output current, A */
  supplyCurrent?: number; driverCurrent?: number;
  /** what the supply gives, what the motor turns out (T_load ω), what the wires lose, W */
  power?: { supply: number; shaft: number; wires: number };
  terminals?: Terminal[];
  wires?: { name: string; R: number; says: string }[];
  /** which limit holds: none, the driver's, the supply's; and whether the motor stalls */
  limited?: 'none' | 'driver' | 'supply'; stalled?: boolean;
  motor?: { id: string; R: number; Kt: number; Ke: number; L?: number; Tf: number };
  warnings: string[]; says: string;
}

/** The circuit of a block at a driver duty (0 to 1) and a load torque on the motor's shaft (N m), steady state. */
export function solveCircuit(block: Block, o: { duty?: number; load?: number } = {}): CircuitOut {
  const duty = o.duty ?? 1, load = o.load ?? 0, warnings: string[] = [];
  const no = (why: string): CircuitOut => ({ refused: why, warnings, says: `refused: ${why}` });
  if (!(duty >= 0 && duty <= 1)) return no(`a duty is 0 to 1 (${duty})`);
  if (!(load >= 0)) return no(`a load torque is zero or more (${load} N m)`);
  const P = block.pieces;
  const sup = P.map((p, i) => [i, power(p)] as const).filter(([, ls]) => ls.some((l) => ends(l, 'out')) && !ls.some((l) => ends(l, 'in')));
  const drv = P.map((p, i) => [i, power(p)] as const).filter(([, ls]) => ls.some((l) => ends(l, 'out')) && ls.some((l) => ends(l, 'in')));
  const mot = P.map((p, i) => [i, power(p).find((l) => motorOfLine(l))] as const).filter((x): x is readonly [number, Line] => !!x[1]);
  if (sup.length !== 1 || drv.length > 1 || mot.length !== 1) return no(`one supply, at most one driver and one motor are solved (this block has ${sup.length} supplies, ${drv.length} drivers, ${mot.length} motors)`);
  const [si, sls] = sup[0]!, sLine = sls.find((l) => ends(l, 'out'))!, [mi, mLine] = mot[0]!, row = motorOfLine(mLine)! as MotorData;
  const d0 = drv[0], dIn = d0?.[1].find((l) => ends(l, 'in')), dOut = d0?.[1].find((l) => ends(l, 'out'));
  const Vs = Number(sLine.size?.V), Is = sLine.limits?.current?.max ?? Infinity, Id = dOut?.limits?.current?.max ?? Infinity;
  if (!(Vs > 0)) return no(`the supply's line ${sLine.port} gives no voltage`);
  const m: MotorModel = motorModel(row), Ke = m.Kt;
  // (its rating against what reaches it)
  if (dIn) { const lim = dIn.limits?.voltage; if (lim && ((lim.min !== undefined && Vs < lim.min) || (lim.max !== undefined && Vs > lim.max))) return no(`the driver takes ${lim.min ?? 0} to ${lim.max} V (${lim.src}); the supply gives ${Vs} V`); }
  const avg = (d0 ? duty : 1) * Vs;
  if (Vs > row.V) {
    const why = `${row.label} is rated ${row.V} V (data/motors.ts ${row.id}); the supply gives ${Vs} V`;
    if (avg > row.V * (1 + 1e-12)) return no(`${why}, and ${d0 ? `at duty ${duty} the driver puts ${avg.toPrecision(4)} V on its terminals, over its rating: a duty of ${(row.V / Vs).toPrecision(3)} or less keeps it within` : 'with no driver between them all of it reaches its terminals'}`);
    warnings.push(`${why}: at duty ${duty} its terminals see ${avg.toPrecision(4)} V on average, within its rating, but each pulse is the supply's ${Vs} V`);
  }
  // (the wiring: what touches what; a conductor touching two terminal pieces is a wire between them)
  const touch = new Map<number, Set<number>>(); for (const f of block.faces) { if (f.kind !== 'contact') continue; (touch.get(f.a) ?? touch.set(f.a, new Set()).get(f.a)!).add(f.b); (touch.get(f.b) ?? touch.set(f.b, new Set()).get(f.b)!).add(f.a); }
  const role = (i: number): 'supply' | 'driver' | 'motor' | null => (i === si ? 'supply' : i === d0?.[0] ? 'driver' : i === mi ? 'motor' : null);
  const links: { a: number; b: number; R: number; name: string; says: string }[] = [];
  P.forEach((p, i) => {
    if (role(i) || power(p).length || p.solid.base.k !== 'cyl') return; const c = conductivityOf(p.mat); if (!c) return;
    const near = [...(touch.get(i) ?? [])].filter((j) => role(j)); if (near.length !== 2) return;
    const base = p.solid.base, A = Math.PI * (base.r ** 2 - (base.ri ?? 0) ** 2), R = base.h / (c.sigma * A);
    links.push({ a: near[0]!, b: near[1]!, R, name: p.name, says: `${p.name}: each core ${(R * 1000).toPrecision(4)} mΩ = L / (σ A), L ${(base.h * 1000).toPrecision(4)} mm, A ${(A * 1e6).toPrecision(4)} mm², σ ${c.sigma.toPrecision(4)} S/m of ${p.mat} (${c.source})` });
  });
  P.forEach((_, i) => { for (const j of touch.get(i) ?? []) if (j > i && role(i) && role(j)) links.push({ a: i, b: j, R: 0, name: `${P[i]!.name} on ${P[j]!.name}`, says: `${P[i]!.name} on ${P[j]!.name}: touching, one node` }); });
  // (which line of each piece a link meets: a driver's in faces the supply, its out the motor)
  const lineAt = (i: number, other: number): Line | null => (i === si ? sLine : i === mi ? mLine : i === d0?.[0] ? (role(other) === 'supply' ? dIn! : role(other) === 'motor' ? dOut! : null) : null);
  // (the nodes: each line's + and −, joined by links; a link of no resistance joins two nodes into one)
  const parent = new Map<string, string>(); const find = (n: string): string => { const q = parent.get(n); if (!q || q === n) return n; const r = find(q); parent.set(n, r); return r; };
  const key = (i: number, l: Line, s: '+' | '-') => `${i}:${l.port}:${s}`;
  const wires: El[] = [];
  for (const L of links) { const la = lineAt(L.a, L.b), lb = lineAt(L.b, L.a); if (!la || !lb) return no(`${L.name} joins two pieces no rule reads (a driver to a driver)`);
    for (const s of ['+', '-'] as const) { const a = key(L.a, la, s), b = key(L.b, lb, s); if (L.R === 0) parent.set(find(a), find(b)); else wires.push({ k: 'R', a, b, R: L.R, name: `${L.name} ${s}` }); } }
  // (a driver's input and output share its − terminal: the model is a buck chopper's, its output referred to its ground)
  if (d0) parent.set(find(key(d0[0], dOut!, '-')), find(key(d0[0], dIn!, '-')));
  const n = (i: number, l: Line, s: '+' | '-') => find(key(i, l, s));
  const sp = n(si, sLine, '+'), sn = n(si, sLine, '-'), mp = n(mi, mLine, '+'), mn = n(mi, mLine, '-');
  const wireEls = wires.map((w) => (w.k === 'R' ? { ...w, a: find(w.a), b: find(w.b) } : w));
  const ip = d0 ? n(d0[0], dIn!, '+') : '', inn = d0 ? n(d0[0], dIn!, '-') : '', op = d0 ? n(d0[0], dOut!, '+') : '', on = d0 ? n(d0[0], dOut!, '-') : '';
  const supplyEl = (cc: boolean): El => (cc ? { k: 'I', p: sn, n: sp, I: Is } : { k: 'V', p: sp, n: sn, V: Vs });
  const solve = (motorEl: El[], driver: 'x' | 'cc', cc: boolean) => {
    let dEff = duty, s = null as ReturnType<typeof mna>;
    for (let it = 0; it < 60; it++) {
      const els: El[] = [supplyEl(cc), ...wireEls, ...motorEl];
      if (d0) els.push(driver === 'x' ? { k: 'X', ip, in: inn, op, on, d: duty } : { k: 'I', p: on, n: op, I: Id }, ...(driver === 'cc' ? [{ k: 'I' as const, p: ip, n: inn, I: dEff * Id }] : []));
      s = mna(els, sn); if (!s || driver === 'x') break;
      const next = (s.v[op]! - s.v[on]!) / (s.v[ip]! - s.v[inn]!); if (Math.abs(next - dEff) < 1e-15) break; dEff = next;
    }
    return { s, dEff };
  };
  const across = (s: NonNullable<ReturnType<typeof mna>>, a: string, b: string) => s.v[a]! - s.v[b]!;
  const finish = (s: NonNullable<ReturnType<typeof mna>>, I: number, w: number, limited: CircuitOut['limited'], stalled: boolean, Isup: number, Idrv: number | undefined): CircuitOut => {
    const V = across(s, mp, mn), lost = wireEls.reduce((t, e) => t + (e.k === 'R' ? (s.v[e.a]! - s.v[e.b]!) ** 2 / e.R : 0), 0);
    const terminals: Terminal[] = [[si, sLine], ...(d0 ? [[d0[0], dIn!], [d0[0], dOut!]] : []), [mi, mLine]].map(([i, l]) => { const L = l as Line, pl = s.v[n(i as number, L, '+')]!, mi2 = s.v[n(i as number, L, '-')]!; return { port: L.port, plus: pl, minus: mi2, across: pl - mi2 }; });
    const Vsup = across(s, sp, sn);
    if (I > row.maxContinuousCurrent) warnings.push(`${I.toPrecision(4)} A is over ${row.label}'s nominal ${row.maxContinuousCurrent} A (data/motors.ts ${row.id}): it heats past its rating if held`);
    const says = [`${stalled ? 'stalled' : 'turning'}: ${I.toPrecision(6)} A through ${row.label} at ${V.toPrecision(6)} V on its terminals, ${w.toPrecision(6)} rad/s; V = I R + K_e ω with R ${m.R25} Ω, K_e = K_t ${m.Kt} (data/motors.ts ${row.id})`,
      limited === 'driver' ? `the driver holds its output at its limit, ${Id} A (${dOut!.limits!.current!.src})` : limited === 'supply' ? `the supply holds its current at its limit, ${Is} A, its voltage down to ${Vsup.toPrecision(4)} V` : 'no limit reached',
      `supply ${Isup.toPrecision(4)} A at ${Vsup.toPrecision(4)} V; wires lose ${lost.toPrecision(4)} W`, ...warnings.map((x) => `warning: ${x}`)].join('; ');
    return { current: I, voltage: V, speed: w, torque: m.Kt * I, supplyCurrent: Isup, ...(Idrv !== undefined ? { driverCurrent: Idrv } : {}), power: { supply: Vsup * Isup, shaft: load * w, wires: lost }, terminals, wires: links.filter((l) => l.R > 0).map((l) => ({ name: l.name, R: l.R, says: l.says })), limited, stalled,
      motor: { id: row.id, R: m.R25, Kt: m.Kt, Ke, ...(row.published.terminalL ? { L: row.published.terminalL } : {}), Tf: m.Tf }, warnings, says };
  };
  const supI = (s: NonNullable<ReturnType<typeof mna>>, cc: boolean) => (cc ? Is : -s.j[0]!);
  const drvI = (s: NonNullable<ReturnType<typeof mna>>, cc = false) => (d0 ? -s.j[cc ? 0 : 1]! : undefined);
  // (turning: the motor draws what its load and its friction need, I = (T + T_f) / K_t; its speed what its voltage leaves)
  const need = (load + m.Tf) / m.Kt;
  const run = solve([{ k: 'I', p: mp, n: mn, I: need }], 'x', false);
  if (run.s) { const w = (across(run.s, mp, mn) - need * m.R25) / Ke, Isup = supI(run.s, false);
    if (w >= 0 && need <= Id && Isup <= Is) return finish(run.s, need, w, 'none', false, Isup, drvI(run.s)); }
  // (it cannot carry its load: it stalls, its winding a resistance R across its terminals, its back-EMF zero)
  const R: El[] = [{ k: 'R', a: mp, b: mn, R: m.R25, name: 'motor winding' }];
  const x = solve(R, 'x', false); if (!x.s) return no('the circuit has a node with no path (not wired)');
  const Ix = across(x.s, mp, mn) / m.R25;
  if (Ix > Id) { const c = solve(R, 'cc', false); if (!c.s) return no('the circuit has a node with no path (not wired)');
    const Isup = (c.dEff * Id); if (Isup > Is) return no(`the driver at its limit draws ${Isup.toPrecision(4)} A from a supply limited to ${Is} A: both limits at once are not solved`);
    return finish(c.s, across(c.s, mp, mn) / m.R25, 0, 'driver', true, Isup, Id); }
  if (supI(x.s, false) > Is) { const c = solve(R, 'x', true); if (!c.s) return no('the circuit has a node with no path (not wired)'); return finish(c.s, across(c.s, mp, mn) / m.R25, 0, 'supply', true, Is, drvI(c.s, true)); }
  return finish(x.s, Ix, 0, 'none', true, supI(x.s, false), drvI(x.s));
}

/** A lead between a supply and a motor's terminals, as P6's acceptance test draws one (one core of its pair): 1.5 mm²
 *  of copper, a nominal section of IEC 60228; 100 mm long (typical of a short hook-up lead). Its radius derived from its
 *  section, r = √(A / π). */
export const LEAD = { area: 1.5e-6, length: 0.1, mat: 'copper', src: '1.5 mm² copper, a nominal section of IEC 60228; 100 mm long, typical' } as const;
export const leadRadius = (): number => Math.sqrt(LEAD.area / Math.PI);

/** The node: a built block's circuit at a duty and a load. */
export const CIRCUIT_NODES: BlockDef[] = [{
  id: 'circuit.solve', name: 'Circuit (DC, steady)', version: 1, by: 'built in', pure: true, kind: 'solver', ability: 'solve', domains: ['electrical'],
  says: 'The circuit of a built block: its supply, driver, motor and wires read from their power lines and what touches what, solved by nodal analysis at a duty and a load torque: the motor\'s current, the voltage at each terminal, its speed, its torque and the power each way; a limit that holds (the driver\'s, the supply\'s) and a motor rated below what reaches it said or refused, with why. Steady state; one supply, one driver at most, one motor',
  spec: { gloss: 'A DC circuit of supply, driver, wires and motor, solved', discipline: 'electrical.powerelectronics.drives', role: 'analysis', codes: [{ scheme: 'MSC2020', code: '94C05', label: 'Analytic circuit theory' }], model: { equations: ['Σ I = 0 at each node; v₊ − v₋ = V at each source (modified nodal analysis)', 'driver: v_out = d v_in, i_in = d i_out, i_out ≤ its limit', 'motor: V = I R + K_e ω, T = K_t I, K_e = K_t (SI)', 'wire: R = L / (σ A) each core'], class: 'lumped', time: 'steady', linear: true, method: 'one linear system (Gaussian elimination); a current limit by fixed-point on the duty', references: ['Ho, Ruehli & Brennan, The modified nodal approach to network analysis, IEEE Trans. Circuits and Systems CAS-22 (1975) 504-509', 'Mohan, Undeland & Robbins, Power Electronics, 3rd ed., ch. 7 (the step-down chopper, averaged)', 'the motor\'s maker\'s row (data/motors.ts)'] } },
  valid: 'steady state (L di/dt zero); ideal switches (no losses in the driver); the winding at 25 °C; a friction-like load; one supply, driver and motor',
  settings: [{ key: 'duty', label: 'The driver\'s duty (0 to 1)', type: 'number', default: 1 }, { key: 'load', label: 'The load torque on the motor\'s shaft, N m', type: 'number', default: 0 }],
  ports: { inputs: [{ name: 'block', type: 'block', label: 'the block wired' }], outputs: [{ name: 'current', type: 'number', unit: 'A' }, { name: 'voltage', type: 'number', unit: 'V', label: 'across the motor\'s terminals' }, { name: 'terminals', type: 'table', label: 'the voltage at each terminal' }, { name: 'speed', type: 'number', unit: 'rad/s' }, { name: 'torque', type: 'number', unit: 'N m' }, { name: 'power', type: 'record' }, { name: 'says', type: 'text' }] },
  run: (i, c) => { const b = i.block as Block | undefined; if (!b || !Array.isArray((b as Block).pieces)) return { says: 'a block wired in is needed' };
    const r = solveCircuit(b, { duty: Number(c.set.duty ?? 1), load: Number(c.set.load ?? 0) }); return { ...r } as never; },
  tests: [],
}];

// Fluid networks (package P5, acceptance test 5; plan/AUDIT.md §5): what a fluid end may be joined to, and the flow
// through a built block's pipes, valves, pumps and reservoirs.
//
// The join: two ends that both say they carry a fluid (room.ts `Line.kind` 'fluid') meet only where their sizes agree: a
// thread with the same thread, a plain tube end with an end of the same outside. A plain tube against a thread is
// refused with what goes between them. Read from what the lines say (their `size` and `std`), never from their names.
//
// The network: its pieces are the block's pieces whose fluid line names its part in the flow (`size.role`: pipe, valve,
// pump, reservoir); its nodes are where two of them touch (the block's faces). Each piece with two such faces is a link;
// a reservoir is a fixed head (its free surface the datum, 0 m); a piece with one face and no reservoir there ends open to
// the air at that head. Links: a pipe by Darcy-Weisbach (the book's law), its friction factor 64/Re laminar (the law's
// own validity text, Hagen-Poiseuille), Haaland's fit (the book's law) turbulent; minor losses by K; a valve by its K at
// its opening; a pump by its curve. Solved as one system (the global gradient method of Todini and Pilati, 1988: each
// link's head loss and each node's flow balance, Newton's method on both), so the pump's operating point is where its
// curve meets the system curve and flow is conserved at every node. What is assumed is said in what it returns.

import type { Block, Line, Piece } from './room';
import type { BlockDef, PortDef } from './blocks';
import { apply } from './law';
import { lawById } from './book';
import { leaf } from './term';
import { ofLeaf, type Derivation } from './evaluate';
import { solveLinear } from './numeric';
import { FLUIDS } from '../data/materials';
import { CONSTANTS } from '../data/constants';

// ---- the join ----------------------------------------------------------------------------------------------------------
export type FluidJoin = { ok: true; says: string } | { ok: false; why: string };
type End = Pick<Line, 'port' | 'kind' | 'size' | 'std'>;
const mmOf = (m: number) => `${+(m * 1000).toFixed(3)} mm`;
const thr = (l: End) => (typeof l.size?.thread === 'string' ? l.size.thread : undefined);
const dia = (l: End) => (typeof l.size?.d === 'number' ? l.size.d : undefined);
const endSaid = (l: End) => (thr(l) ? `a ${thr(l)} thread${typeof l.size?.major === 'number' ? ` (its major diameter ${mmOf(l.size.major)})` : ''}` : dia(l) !== undefined ? `a plain ${mmOf(dia(l)!)} end` : 'no size') + (l.std ? `, ${l.std}` : '');
/** Whether two fluid ends may be joined: the same thread, or plain ends of the same outside (equal to the micrometre, as
 *  written); refused, with both ends said, where either carries no fluid, says no size, or the two differ. */
export function fluidJoinCheck(a: End, b: End): FluidJoin {
  for (const l of [a, b]) if (l.kind !== 'fluid') return { ok: false, why: `${l.port} carries no fluid (its kind ${l.kind ?? 'not written'})` };
  const ta = thr(a), tb = thr(b), da = dia(a), db = dia(b), both = `${a.port} is ${endSaid(a)}; ${b.port} is ${endSaid(b)}`;
  if (ta && tb) return ta === tb ? { ok: true, says: `${ta} into ${tb}` } : { ok: false, why: `${both}: the threads differ` };
  if (!ta && !tb && da !== undefined && db !== undefined) return Math.abs(da - db) < 1e-6 ? { ok: true, says: `${mmOf(da)} ends` } : { ok: false, why: `${both}: the ends differ in size` };
  if ((ta && db !== undefined) || (tb && da !== undefined)) return { ok: false, why: `${both}: a plain tube end does not screw into a thread; an adaptor (a compression or solder union of the tube's size to the thread) goes between` };
  return { ok: false, why: `${both}: no size written to join by` };
}

// ---- the fluid, the walls, the losses ----------------------------------------------------------------------------------
/** Fluids by name: density from the existing property table (src/data/materials.ts FLUIDS), viscosity from its source. */
export const FLUID_PROPS: Record<string, { rho: number; mu: number; src: string }> = {
  'water 20 C': { rho: FLUIDS.freshWater.density, mu: 1.0016e-3, src: `density ${FLUIDS.freshWater.density} kg/m³ (${FLUIDS.freshWater.source}); viscosity 1.0016 mPa s (IAPWS 2008 formulation, Huber et al., J. Phys. Chem. Ref. Data 38, 101 (2009), at 20 °C, 0.1 MPa)` },
};
/** A pipe wall's roughness by its material, m (White, Fluid Mechanics, 8th ed., Table 6.1). */
export const ROUGHNESS: Record<string, { eps: number; src: string }> = {
  copper: { eps: 1.5e-6, src: 'White, Fluid Mechanics, 8th ed., Table 6.1: drawn tubing 0.0015 mm' },
  'steel-low': { eps: 4.6e-5, src: 'White, Fluid Mechanics, 8th ed., Table 6.1: commercial steel 0.046 mm' },
};
/** Loss coefficients K of a pipe's entry from a reservoir and its exit to the air (White, Fluid Mechanics, 8th ed., Fig. 6.21). */
export const MINOR_K = { entry: { K: 0.5, src: 'White, Fluid Mechanics, 8th ed., Fig. 6.21: a sharp-edged entrance, K 0.5' }, exit: { K: 1, src: 'White, Fluid Mechanics, 8th ed., Fig. 6.21: an exit, its velocity head lost, K 1.0' } };
/** Crane TP-410 (2009), "friction factors for clean commercial steel pipe with flow in zone of complete turbulence", f_T
 *  by nominal size (in, as the ISO 228-1 thread names it); a full-port ball valve's K is 3 f_T (Crane TP-410, A-28). */
export const CRANE_FT: Record<string, number> = { 'G1/2': 0.027, 'G3/4': 0.025, G1: 0.023, 'G1-1/4': 0.022, 'G1-1/2': 0.021, G2: 0.019 };
export const CRANE_SRC = 'Crane TP-410 (2009): f_T by nominal size, a full-port ball valve K = 3 f_T';
const g = CONSTANTS.g.value;

// ---- the network -------------------------------------------------------------------------------------------------------
export interface FluidLink { name: string; role: string; from: string; to: string; Q: number; dh: number; says: string }
export interface FluidNet {
  /** the pump's flow, m³/s (the first link's where there is no pump) */ flow: number;
  /** the head the pump gives at it, m */ head: number;
  /** each node's gauge pressure, Pa, in `nodes`' order (its elevation the reservoir's surface: the row on the ground) */ pressures: number[];
  nodes: string[]; links: FluidLink[];
  /** the largest flow imbalance at any node, m³/s */ residual: number; says: string;
}
const fluidLine = (p: Piece): Line | undefined => p.lines.find((l) => l.kind === 'fluid' && typeof l.size?.role === 'string');
/** A pump's curve from its line: points "Q:H; …" in L/min and m. */
export function curveOf(l: Pick<Line, 'size'>): [number, number][] {
  const t = String(l.size?.curve ?? ''); const pts = t.split(';').map((s) => s.split(':').map(Number) as [number, number]).filter((q) => q.length === 2 && q.every(Number.isFinite)).map(([q, h]) => [q / 60000, h] as [number, number]);
  if (pts.length < 2) throw new Error(`a pump's curve of two points or more, "Q:H; …" in L/min and m (${t || 'none written'})`); return pts.sort((a, b) => a[0] - b[0]);
}
/** The head a pump's curve gives at a flow, m: straight between its points; below no flow its shut-off head; past its
 *  last point the last stretch carried on (said by the caller where used). */
export function headOn(curve: readonly [number, number][], Q: number): number {
  if (Q <= curve[0]![0]) return curve[0]![1];
  for (let i = 1; i < curve.length; i++) { const [q0, h0] = curve[i - 1]!, [q1, h1] = curve[i]!; if (Q <= q1 || i === curve.length - 1) return h0 + ((h1 - h0) * (Q - q0)) / (q1 - q0); }
  return curve[curve.length - 1]![1];
}
const set = (name: string, v: number, unit: string): Derivation => ofLeaf(leaf(name, v, unit, { class: 'given', by: 'the fluid network' }));
const law = (id: string, v: Record<string, [number, string]>): number => { const d = apply(lawById(id), Object.fromEntries(Object.entries(v).map(([k, [x, u]]) => [k, set(k, x, u)])));
  if (d.value === null) throw new Error(`${id}: ${d.refusal?.domain ?? 'no value'}`); return d.value; };

/** The flow through a built block's fluid network (see the head of this file), at a valve opening (0 shut to 1 open). */
export function solveNetwork(b: Block, o: { fluid?: string; opening?: number } = {}): FluidNet {
  const F = FLUID_PROPS[o.fluid ?? 'water 20 C']; if (!F) throw new Error(`a fluid of ${Object.keys(FLUID_PROPS).join(', ')} (${o.fluid})`);
  const h = o.opening ?? 1; if (!(h >= 0 && h <= 1)) throw new Error(`a valve's opening from 0 (shut) to 1 (open) (${o.opening})`);
  const said: string[] = [`${o.fluid ?? 'water 20 C'}: ${F.src}`];
  const el = b.pieces.map((p, k) => ({ p, k, l: fluidLine(p) })).filter((e) => e.l);
  const at = new Map(el.map((e) => [e.k, e])), joins = new Map<number, string[]>(), nodes: string[] = [], seen = new Set<string>();
  for (const f of b.faces) { const A = at.get(f.a), B = at.get(f.b); if (!A || !B || A.k === B.k) continue;
    const key = [Math.min(A.k, B.k), Math.max(A.k, B.k)].join('-'); if (seen.has(key)) continue; seen.add(key);
    const j = fluidJoinCheck(A.l!, B.l!); if (!j.ok) throw new Error(`fluid network: ${j.why}`);
    const n = `${A.p.name} | ${B.p.name}`; nodes.push(n); for (const e of [A, B]) joins.set(e.k, [...(joins.get(e.k) ?? []), n]); }
  // (a reservoir: a fixed head, joined to each node it touches by its entry, a loss of K on what it feeds)
  const fixed = new Map<string, number>(), res = el.filter((e) => e.l!.size!.role === 'reservoir');
  if (!res.length) said.push('no reservoir: every open end at the datum');
  type L = { e: (typeof el)[number]; ends: string[]; K: number; Ksay: string[]; entry?: true };
  const links: L[] = [];
  for (const r of res) { fixed.set(r.p.name, 0); for (const n of joins.get(r.k) ?? []) { const fed = el.find((e) => e.k !== r.k && (joins.get(e.k) ?? []).includes(n));
    if (fed) links.push({ e: fed, ends: [r.p.name, n], K: MINOR_K.entry.K, Ksay: [MINOR_K.entry.src], entry: true }); } }
  for (const e of el) { if (e.l!.size!.role === 'reservoir') continue; const js = joins.get(e.k) ?? [];
    if (js.length > 2) throw new Error(`fluid network: the ${e.p.name} meets ${js.length} others: a junction of three or more is not solved yet`);
    if (!js.length) { said.push(`the ${e.p.name} meets nothing: left out`); continue; }
    const lk: L = { e, ends: js, K: 0, Ksay: [] };
    if (js.length === 1) { const open = `${e.p.name} (open end)`; fixed.set(open, 0); lk.ends = [js[0]!, open]; lk.K += MINOR_K.exit.K; lk.Ksay.push(MINOR_K.exit.src); }
    links.push(lk); }
  // (each link oriented away from the reservoir, by a walk from it: a pump's inlet taken as its end nearer the reservoir)
  const start = [...fixed.keys()][0], order = new Map<string, number>(); if (start !== undefined) { order.set(start, 0); let grew = true;
    while (grew) { grew = false; for (const lk of links) { const [a, c] = lk.ends as [string, string]; if (order.has(a) && !order.has(c)) { order.set(c, order.get(a)! + 1); grew = true; } else if (order.has(c) && !order.has(a)) { order.set(a, order.get(c)! + 1); grew = true; } } } }
  for (const lk of links) { const [a, c] = lk.ends as [string, string]; if ((order.get(a) ?? 0) > (order.get(c) ?? 0)) lk.ends = [c, a]; }
  // (a shut valve passes nothing: its link left out)
  const live = links.filter((lk) => !(lk.e.l!.size!.role === 'valve' && !lk.entry && h === 0)); if (live.length < links.length) said.push('the valve shut: nothing passes it');
  if (links.some((lk) => lk.e.l!.size!.role === 'valve' && !lk.entry)) said.push(`a valve's K at its opening h is its K open over h² (its Kv taken as Kvs h, the linear inherent characteristic of IEC 60534-1: an assumption; ${CRANE_SRC})`);
  // (each link's head loss along it at a flow, m; a pump's the negative of its head)
  const extrap = new Set<string>();
  const phi = (lk: L, Q: number): number => {
    const p = lk.e.p, l = lk.e.l!, role = String(l.size!.role), s = Math.sign(Q), q = Math.abs(Q), minor = (A: number, K: number) => (K * (q / A) ** 2) / (2 * g);
    const B0 = p.solid.base as { ri?: number }, di = Number(l.size!.di ?? (B0.ri ? 2 * B0.ri : NaN)), Aw = (Math.PI * di * di) / 4;
    if (lk.entry) { if (!(di > 0)) throw new Error(`fluid network: the ${p.name}'s waterway (size.di) is not written`); return s * minor(Aw, lk.K); }
    if (role === 'pump') { const c = curveOf(l); if (lk.K && !(di > 0)) throw new Error(`fluid network: the ${p.name}'s waterway (size.di) is not written`); return -headOn(c, Q) + (lk.K ? s * minor(Aw, lk.K) : 0); }
    if (role === 'valve') { const K0 = Number(l.size!.K); if (!(K0 > 0 && di > 0)) throw new Error(`fluid network: the ${p.name} has no loss coefficient K or waterway written (${CRANE_SRC}: its table starts at 1/2 in)`); return s * minor(Aw, K0 / (h * h) + lk.K); }
    // (a pipe: its bore and length from its solid, its wall's roughness by its material)
    const B = p.solid.base as { k: string; ri?: number; h: number }; if (B.k !== 'cyl' || !B.ri) throw new Error(`fluid network: the ${p.name} is not a straight tube`);
    const D = 2 * B.ri, Lp = B.h, A = (Math.PI * D * D) / 4, v = q / A; if (q < 1e-15) return 0;
    const Re = law('reynolds', { rho: [F.rho, 'kg/m^3'], v: [v, 'm/s'], L: [D, 'm'], mu: [F.mu, 'Pa s'] }), rough = ROUGHNESS[p.mat];
    if (!rough) throw new Error(`fluid network: no wall roughness known for ${p.mat} (${Object.keys(ROUGHNESS).join(', ')})`);
    const turb = (R: number) => law('friction-factor.haaland', { eD: [rough.eps / D, '-'], Re: [R, '-'] });
    // (between laminar and turbulent, 2300 < Re < 4000 (the Reynolds law's own text), the two joined straight across: a guess at that band)
    const f = Re <= 2300 ? 64 / Re : Re >= 4000 ? turb(Re) : 64 / 2300 + ((turb(4000) - 64 / 2300) * (Re - 2300)) / 1700;
    const dp = law('darcy-weisbach', { f: [f, '-'], L: [Lp, 'm'], D: [D, 'm'], rho: [F.rho, 'kg/m^3'], v: [v, 'm/s'] });
    return s * (dp / (F.rho * g) + minor(A, lk.K));
  };
  // (Newton's method on [Q of each link, H of each free node]: H_from − H_to − φ(Q) = 0 along each link; Σ in − Σ out = 0 at each node)
  const free = [...new Set(live.flatMap((lk) => lk.ends))].filter((n) => !fixed.has(n)), ix = new Map(free.map((n, i) => [n, i])), nL = live.length, N = nL + free.length;
  const x = [...live.map(() => 1e-4), ...free.map(() => 0)]; // (a starting guess: 6 L/min each, every head the datum)
  const Hof = (y: number[], n: string) => (fixed.has(n) ? fixed.get(n)! : y[nL + ix.get(n)!]!);
  const resid = (y: number[]) => [...live.map((lk, k) => Hof(y, lk.ends[0]!) - Hof(y, lk.ends[1]!) - phi(lk, y[k]!)), ...free.map((n) => live.reduce((s, lk, k) => s + (lk.ends[1] === n ? y[k]! : lk.ends[0] === n ? -y[k]! : 0), 0))];
  const norm = (r: number[]) => Math.max(0, ...r.map(Math.abs));
  let r = resid(x), it = 0;
  for (; it < 100 && norm(r) > 1e-12; it++) {
    const J = Array.from({ length: N }, () => new Array<number>(N).fill(0));
    live.forEach((lk, k) => { const q = x[k]!, d = Math.max(1e-10, 1e-6 * Math.abs(q)); J[k]![k] = -(phi(lk, q + d) - phi(lk, q - d)) / (2 * d);
      const [a, c] = lk.ends as [string, string]; if (ix.has(a)) J[k]![nL + ix.get(a)!] = 1; if (ix.has(c)) J[k]![nL + ix.get(c)!] = -1;
      if (ix.has(c)) J[nL + ix.get(c)!]![k] = 1; if (ix.has(a)) J[nL + ix.get(a)!]![k] = -1; });
    const dx = solveLinear(J, r.map((v) => -v)); if (!dx) throw new Error('fluid network: its equations are singular (a link with no loss between two fixed heads?)');
    // (the step halved until the residual falls: damped Newton)
    let t = 1, y = x, ry = r; for (let m = 0; m < 30; m++) { y = x.map((v, i) => v + t * dx[i]!); ry = resid(y); if (norm(ry) < norm(r)) break; t /= 2; }
    x.splice(0, N, ...y); r = ry;
  }
  if (norm(r) > 1e-9) said.push(`not converged in ${it} steps (residual ${norm(r).toExponential(2)})`);
  for (const lk of live) if (lk.e.l!.size!.role === 'pump' && !lk.entry) { const c = curveOf(lk.e.l!); if (x[live.indexOf(lk)]! > c[c.length - 1]![0]) extrap.add(lk.e.p.name); }
  const out: FluidLink[] = links.map((lk) => { const k = live.indexOf(lk), Q = k < 0 ? 0 : x[k]!; return { name: lk.entry ? `entry to the ${lk.e.p.name}` : lk.e.p.name, role: lk.entry ? 'entry' : String(lk.e.l!.size!.role), from: lk.ends[0]!, to: lk.ends[1]!, Q, dh: k < 0 ? 0 : phi(lk, Q), says: lk.Ksay.join('; ') }; });
  const pump = out.find((lk) => lk.role === 'pump'), flow = (pump ?? out[0])?.Q ?? 0, pumpHead = pump ? headOn(curveOf(links.find((lk) => lk.e.p.name === pump.name)!.e.l!), pump.Q) : 0;
  const balance = free.map((n) => Math.abs(out.reduce((s, lk) => s + (lk.to === n ? lk.Q : lk.from === n ? -lk.Q : 0), 0)));
  if (extrap.size) said.push(`past the last point of its curve: the ${[...extrap].join(', ')}, its last stretch carried on`);
  said.push('elevations taken equal (the row on the ground, the reservoir\'s surface at its ports: an assumption)', 'solved by the global gradient method (Todini & Pilati 1988), damped Newton');
  return { flow, head: pumpHead, pressures: free.map((n) => F.rho * g * Hof(x, n)), nodes: free, links: out, residual: Math.max(0, ...balance),
    says: `${(flow * 60000).toFixed(3)} L/min${pump ? ` at ${pumpHead.toFixed(3)} m of head` : ''}; ${said.join('; ')}` };
}

// ---- the node ----------------------------------------------------------------------------------------------------------
const P = (name: string, type: PortDef['type'], more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
export const FLUID_NETWORK: BlockDef = {
  id: 'fluid.network', name: 'Fluid network', version: 1, by: 'built in', pure: true, kind: 'solver', ability: 'solve', domains: ['mechanical', 'pipelines'],
  says: 'The flow through a built thing\'s pipes, valves, pumps and reservoirs: its nodes where their fluid ends touch (each join checked: a size or thread that differs is refused, saying why), each pipe by Darcy-Weisbach (64/Re laminar, Haaland turbulent), minor losses by K, a valve by its K at its opening, a pump by its curve where it meets the system\'s, a reservoir a fixed head; flow conserved at every node. Elevations taken equal',
  spec: { gloss: 'How much flows round a pump loop, and at what pressures?', discipline: 'mechanical.thermofluids', role: 'numerical solver', codes: [{ scheme: 'ICS', code: '23.040.01', label: 'Pipeline components and pipelines in general' }, { scheme: 'ICS', code: '23.080', label: 'Pumps' }],
    model: { laws: ['darcy-weisbach', 'friction-factor.haaland', 'reynolds'], equations: ['H_i − H_j = (f L/D + ΣK) v|v|/2g along a pipe; K(h) v|v|/2g across a valve; −H_pump(Q) across a pump', 'Σ Q_in − Σ Q_out = 0 at each node'], class: 'lumped', time: 'steady', linear: false, method: 'global gradient method (Todini & Pilati 1988), damped Newton', references: ['White, Fluid Mechanics, 8th ed., ch. 6', 'Todini & Pilati, Computer Applications in Water Supply 1 (1988)', CRANE_SRC] } },
  settings: [{ key: 'fluid', label: 'Fluid', type: 'choice', default: 'water 20 C', choices: Object.keys(FLUID_PROPS) }, { key: 'opening', label: 'Valve opening, 0 shut to 1 open', type: 'number', default: 1 }],
  ports: { inputs: [P('block', 'block', { optional: true, label: 'the built network (pump, pipes, valve, reservoir)' })], outputs: [P('flow', 'number', { unit: 'm^3/s' }), P('head', 'number', { unit: 'm' }), P('pressures', 'list<number>', { unit: 'Pa' }), P('says', 'text')] },
  run: (i, c) => { const b = i.block as Block | undefined; if (!b) return { flow: 0, head: 0, pressures: [], says: 'no block: wire a built network in' };
    const n = solveNetwork(b, { fluid: String(c.set.fluid ?? 'water 20 C'), opening: Number(c.set.opening ?? 1) }); return { flow: n.flow, head: n.head, pressures: n.pressures, says: n.says }; },
  tests: [{ inputs: {}, outputs: { flow: 0 } }],
};

// The 6502's own cells, found in its netlist, not drawn from a library: in NMOS each gate is a node held high by its
// load (a depletion pull-up) and pulled to ground by a network of switches, so a node's pull-down network says what
// gate it is. Switches from it straight to ground side by side make a NOR (one alone, an inverter); a chain of them in
// series to ground, a NAND; chains side by side, an AND-OR-INVERT. A node driven from the supply through a switch as
// well (a push-pull driver) or joined to others through a switch that is not to ground (a pass transistor) is said as
// such. Each kind is then characterised at switch level: a copy of one cell of that kind built on its own and run
// through every input, its truth table read off its output. What is not in a switch-level netlist (a node's
// capacitance, so a gate's delay and energy) is said, not guessed.

import type { Netlist } from './netlist';
import { SwitchSim } from './switch';

export interface Cell { out: number; kind: string; /** each series chain to ground, its gates in order from the output */ chains: number[][]; inputs: number[]; pushPull: boolean; pass: number }
export interface CellKinds { cells: Cell[]; kinds: { kind: string; count: number; example: number }[]; pulled: number; says: string }

/** Every pulled-up node's pull-down network, read and named. */
export function cellsOf(n: Netlist): CellKinds {
  const T = n.gate.length, byNode: number[][] = Array.from({ length: n.nodes }, () => []);
  for (let t = 0; t < T; t++) { byNode[n.c1[t]!]!.push(t); byNode[n.c2[t]!]!.push(t); }
  const other = (t: number, x: number) => (n.c1[t] === x ? n.c2[t]! : n.c1[t]!), cells: Cell[] = [];
  for (let out = 0; out < n.nodes; out++) {
    if (!n.pullup[out] || out === n.vcc || out === n.vss) continue;
    const chains: number[][] = []; let pass = 0, pushPull = false;
    for (const t of byNode[out]!) {
      const o = other(t, out);
      if (o === n.vss) { chains.push([n.gate[t]!]); continue; }
      if (o === n.vcc) { pushPull = true; continue; }
      // (a chain: an inner node, not pulled up, that leads on through one switch at a time to ground)
      const chain = [n.gate[t]!]; let at = o, prev = t, ok = false;
      for (let k = 0; k < 6 && !n.pullup[at]; k++) { const next = byNode[at]!.filter((u) => u !== prev); if (next.length !== 1) break; const u = next[0]!, w = other(u, at); chain.push(n.gate[u]!); if (w === n.vss) { ok = true; break; } prev = u; at = w; }
      if (ok) chains.push(chain); else pass++;
    }
    if (!chains.length) continue;
    const inputs = [...new Set(chains.flat())], single = chains.every((c) => c.length === 1), one = chains.length === 1;
    const kind = `${single ? (one ? 'inverter' : `NOR${chains.length}`) : one ? `NAND${chains[0]!.length}` : `AOI ${chains.map((c) => c.length).sort().join('-')}`}${pushPull ? ' (push-pull)' : ''}${pass ? ' + pass' : ''}`;
    cells.push({ out, kind, chains, inputs, pushPull, pass });
  }
  const tally = new Map<string, { count: number; example: number }>(); for (const c of cells) { const t = tally.get(c.kind) ?? { count: 0, example: c.out }; t.count++; tally.set(c.kind, t); }
  const kinds = [...tally].map(([kind, t]) => ({ kind, ...t })).sort((a, b) => b.count - a.count);
  const pulled = [...n.pullup].filter(Boolean).length;
  return { cells, kinds, pulled, says: `${cells.length} of the ${pulled} pulled-up nodes are gates read from their pull-down networks: ${kinds.slice(0, 6).map((k) => `${k.count} ${k.kind}`).join(', ')}${kinds.length > 6 ? `, and ${kinds.length - 6} kinds more` : ''}` };
}

/** One cell built on its own, at switch level, and run through every input: its truth table, and the gate it is. */
export function characterise(c: Cell): { rows: { inputs: string; out: number }[]; is: string; says: string } {
  // (a netlist of just this cell: ground, supply, its output pulled up, its inputs as pins, its chains' inner nodes)
  const ins = c.inputs, k = ins.length; if (k > 8) throw new Error(`a cell of ${k} inputs is too many to try every input of`);
  const vss = 0, vcc = 1, out = 2, pin = (i: number) => 3 + i; let next = 3 + k; const gate: number[] = [], c1: number[] = [], c2: number[] = [];
  for (const ch of c.chains) { let at = out; ch.forEach((g, j) => { const to = j === ch.length - 1 ? vss : next++; gate.push(pin(ins.indexOf(g))); c1.push(at); c2.push(to); at = to; }); }
  const pullup = new Uint8Array(next); pullup[out] = 1;
  const sim = new SwitchSim({ name: 'cell', nodes: next, gate: Int32Array.from(gate), c1: Int32Array.from(c1), c2: Int32Array.from(c2), pullup, vcc, vss, names: {}, traced: gate.length, source: 'one cell of the 6502, copied out of its netlist' });
  const rows: { inputs: string; out: number }[] = [];
  for (let m = 0; m < 1 << k; m++) { sim.setMany(ins.map((_, i) => [pin(i), ((m >> i) & 1) === 1] as [number, boolean])); sim.settleAll(); rows.push({ inputs: ins.map((_, i) => (m >> i) & 1).join(''), out: sim.high(out) ? 1 : 0 }); }
  // (named from its table: NOT of an OR of ANDs, each chain an AND)
  const want = (m: number) => (c.chains.some((ch) => ch.every((g) => (m >> ins.indexOf(g)) & 1)) ? 0 : 1), ok = rows.every((r, m) => r.out === want(m));
  const is = `NOT (${c.chains.map((ch) => ch.map((g) => `n${g}`).join(' AND ')).join(' OR ')})`;
  return { rows, is, says: `${c.kind} at node ${c.out}: ${ok ? 'its switches give' : 'its switches do not give'} ${is} over all ${rows.length} inputs (a switch-level run: what it computes, not how fast; a node's capacitance, and so a gate's delay and energy, is not in this netlist)` };
}

// A chip run at switch level: each transistor a switch, closed while its gate's node is high. Nodes joined through
// closed switches are one group and take one level: low if the group reaches ground, else high if it reaches the
// supply, else low if anything drives it low (an input held low), else high if any node in it is pulled up, else what
// charge it held (high if any node in it was high). The level a node takes opens or closes the switches it gates; the
// nodes behind those are worked out again, until nothing changes. This is how the Visual 6502 team's simulator and
// perfect6502 run the chip; written here from that description, not from their code.

import type { Netlist } from './netlist';

// (the order a group's strongest member wins by)
const NOTHING = 0, HI = 1, PULLUP = 2, PULLDOWN = 3, VCC = 4, VSS = 5;

export class SwitchSim {
  readonly n: Netlist;
  /** each node's level, and inputs held high or low from outside (on top of its own pull-up) */
  readonly value: Uint8Array; readonly pullup: Uint8Array; readonly pulldown: Uint8Array;
  // (each node's channel neighbours: through which transistor, to which node; and the nodes behind the switches it gates)
  private chanStart: Int32Array; private chanT: Int32Array; private chanOther: Int32Array; private depStart: Int32Array; private dep: Int32Array;
  private stamp: Int32Array; private stampNow = 0; private group: Int32Array; private groupN = 0; private stack: Int32Array;
  private listA: Int32Array; private listB: Int32Array; private inList: Uint8Array;
  /** what it has done: groups worked out, nodes that changed level */ groups = 0; flips = 0;

  constructor(n: Netlist) {
    this.n = n; const N = n.nodes, T = n.gate.length;
    this.value = new Uint8Array(N); this.pullup = Uint8Array.from(n.pullup); this.pulldown = new Uint8Array(N);
    const cc = new Int32Array(N + 1); for (let t = 0; t < T; t++) { cc[n.c1[t]! + 1]!++; cc[n.c2[t]! + 1]!++; } for (let i = 0; i < N; i++) cc[i + 1]! += cc[i]!;
    this.chanStart = cc; this.chanT = new Int32Array(2 * T); this.chanOther = new Int32Array(2 * T); const fill = cc.slice();
    for (let t = 0; t < T; t++) { const a = n.c1[t]!, b = n.c2[t]!; this.chanT[fill[a]!] = t; this.chanOther[fill[a]!++] = b; this.chanT[fill[b]!] = t; this.chanOther[fill[b]!++] = a; }
    const deps: number[][] = Array.from({ length: N }, () => []);
    for (let t = 0; t < T; t++) { const g = n.gate[t]!; for (const c of [n.c1[t]!, n.c2[t]!]) if (c !== n.vcc && c !== n.vss && !deps[g]!.includes(c)) deps[g]!.push(c); }
    const ds = new Int32Array(N + 1); for (let i = 0; i < N; i++) ds[i + 1] = ds[i]! + deps[i]!.length; this.depStart = ds; this.dep = Int32Array.from(deps.flat());
    this.stamp = new Int32Array(N); this.group = new Int32Array(N); this.stack = new Int32Array(N + 1); this.listA = new Int32Array(N); this.listB = new Int32Array(N); this.inList = new Uint8Array(N);
  }

  /** Hold a node high or low from outside (a pin), and let it settle. */
  set(node: number, high: boolean): void { this.pullup[node] = high ? 1 : 0; this.pulldown[node] = high ? 0 : 1; this.settle([node]); }
  /** Hold many pins, then settle once. */
  setMany(pins: [number, boolean][]): void { for (const [node, high] of pins) { this.pullup[node] = high ? 1 : 0; this.pulldown[node] = high ? 0 : 1; } this.settle(pins.map((p) => p[0])); }
  high(node: number): boolean { return this.value[node] === 1; }
  /** Every node worked out from scratch (power on). */
  settleAll(): void { const all: number[] = []; for (let i = 0; i < this.n.nodes; i++) if (i !== this.n.vcc && i !== this.n.vss) all.push(i); this.settle(all); }

  private build(start: number): number {
    const n = this.n, v = this.value, st = this.stamp, s = ++this.stampNow; let val = NOTHING, sp = 0; this.groupN = 0;
    this.stack[sp++] = start;
    while (sp) {
      const x = this.stack[--sp]!;
      if (x === n.vss) { val = VSS; continue; }
      if (x === n.vcc) { if (val !== VSS) val = Math.max(val, VCC); continue; }
      if (st[x] === s) continue; st[x] = s; this.group[this.groupN++] = x;
      if (val < PULLDOWN && this.pulldown[x]) val = PULLDOWN;
      if (val < PULLUP && this.pullup[x]) val = PULLUP;
      if (val < HI && v[x]) val = HI;
      for (let k = this.chanStart[x]!, e = this.chanStart[x + 1]!; k < e; k++) if (v[n.gate[this.chanT[k]!]!]) { const o = this.chanOther[k]!; if (o === n.vss || o === n.vcc || st[o] !== s) this.stack[sp++] = o; }
    }
    return val === VCC || val === PULLUP || val === HI ? 1 : 0;
  }

  private settle(start: number[]): void {
    let inA = this.listA, out = this.listB, nIn = 0, nOut = 0; const mark = this.inList;
    for (const x of start) if (!mark[x]) { mark[x] = 1; inA[nIn++] = x; }
    for (let round = 0; round < 100 && nIn; round++) {
      for (let i = 0; i < nIn; i++) mark[inA[i]!] = 0;
      for (let i = 0; i < nIn; i++) {
        const x = inA[i]!; if (x === this.n.vcc || x === this.n.vss) continue;
        const lv = this.build(x); this.groups++;
        for (let g = 0; g < this.groupN; g++) { const y = this.group[g]!; if (this.value[y] === lv) continue; this.value[y] = lv; this.flips++;
          for (let k = this.depStart[y]!, e = this.depStart[y + 1]!; k < e; k++) { const d = this.dep[k]!; if (!mark[d]) { mark[d] = 1; out[nOut++] = d; } } }
      }
      const t = inA; inA = out; out = t; nIn = nOut; nOut = 0;
    }
    for (let i = 0; i < nIn; i++) mark[inA[i]!] = 0;
    if (nIn) throw new Error(`the netlist did not settle in 100 rounds (${nIn} nodes still changing): an oscillation`);
  }
}

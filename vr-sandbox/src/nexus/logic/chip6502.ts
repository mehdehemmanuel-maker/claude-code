// The 6502 run from its transistors: its clock pin turned over half a cycle at a time, and while the clock is high the
// chip's address pins read and its data pins read from or written to 64 KB of memory, as a board round it would. Its
// registers are read off the nodes that hold them. Run beside the fast model (logic/cpu6502.ts), instruction by
// instruction: where the chip fetches an opcode (its SYNC pin high), the registers one cycle on, the cycles between
// fetches, and what each instruction wrote, compared. The transistors are the truth.

import type { Netlist } from './netlist';
import { SwitchSim } from './switch';
import { BY_CODE, Cpu6502, type Regs } from './cpu6502';
import type { Part } from '../kits';

const bits = (n: Netlist, base: string, k: number) => Array.from({ length: k }, (_, i) => { const v = n.names[`${base}${i}`]; if (v === undefined) throw new Error(`the netlist names no node ${base}${i}`); return v; });

export class Chip6502 {
  readonly sim: SwitchSim; readonly mem = new Uint8Array(65536); halfCycles = 0;
  private N: Record<string, number>; private ab: number[]; private db: number[];
  private reg: Record<'a' | 'x' | 'y' | 's' | 'p' | 'pcl' | 'pch' | 'notir', number[]>;
  constructor(net: Netlist) {
    this.sim = new SwitchSim(net); this.N = net.names; this.ab = bits(net, 'ab', 16); this.db = bits(net, 'db', 8);
    this.reg = { a: bits(net, 'a', 8), x: bits(net, 'x', 8), y: bits(net, 'y', 8), s: bits(net, 's', 8), p: bits(net, 'p', 8), pcl: bits(net, 'pcl', 8), pch: bits(net, 'pch', 8), notir: bits(net, 'notir', 8) };
  }
  private node(name: string) { const v = this.N[name]; if (v === undefined) throw new Error(`the netlist names no node ${name}`); return v; }
  private read(ns: number[]) { let v = 0; ns.forEach((n, i) => { if (this.sim.high(n)) v |= 1 << i; }); return v; }
  get address() { return this.read(this.ab); } get data() { return this.read(this.db); } get reading() { return this.sim.high(this.node('rw')); }
  get sync() { return this.sim.high(this.node('sync_')); } get clock() { return this.sim.high(this.node('clk0')); }
  regs(): Regs { return { a: this.read(this.reg.a), x: this.read(this.reg.x), y: this.read(this.reg.y), sp: this.read(this.reg.s), p: this.read(this.reg.p), pc: this.read(this.reg.pcl) | (this.read(this.reg.pch) << 8) }; }
  /** Power on, hold RESET low for eight cycles, let it go: the chip reads its reset vector and starts. */
  reset(): void {
    const s = this.sim; s.setMany([[this.node('res'), false], [this.node('clk0'), true], [this.node('rdy'), true], [this.node('so'), false], [this.node('irq'), true], [this.node('nmi'), true]]); s.settleAll();
    for (let i = 0; i < 16; i++) this.half(); s.set(this.node('res'), true); this.halfCycles = 0;
  }
  /** What the last full cycle wrote, if it wrote. */
  lastWrite: [number, number] | null = null;
  /** Half a cycle: the clock turned over; with it high, memory read onto the data pins or written from them. */
  half(): void {
    const was = this.clock; this.sim.set(this.node('clk0'), !was); this.halfCycles++; this.lastWrite = null;
    if (!was) { const a = this.address; if (this.reading) this.sim.setMany(this.db.map((n, i) => [n, ((this.mem[a]! >> i) & 1) === 1] as [number, boolean])); else { const d = this.data; this.mem[a] = d; this.lastWrite = [a, d]; } }
  }
}

export interface Mismatch { instr: number; pc: number; op: string; what: string; chip: string; model: string }
export interface Run { /** each address the program wrote */ written: Uint8Array; instructions: number; cycles: number; halfCycles: number; ms: number; hz: number; switchesPerCycle: number; mismatches: Mismatch[]; regs: Regs; mem: Uint8Array; trace: { pc: number; op: string; cycles: number }[]; stoppedBy: string }

/** A program run on the transistors and on the fast model side by side, until it jumps to itself (its end) or runs so
 *  many cycles; each instruction compared. */
export function runBoth(net: Netlist, image: Map<number, number>, o: { start: number; most?: number; trace?: number } = { start: 0x400 }): Run {
  const chip = new Chip6502(net); for (const [a, v] of image) chip.mem[a] = v; chip.mem[0xfffc] = o.start & 0xff; chip.mem[0xfffd] = o.start >> 8;
  const t0 = performance.now(); chip.reset(); const g0 = chip.sim.groups;
  const written = new Uint8Array(65536), modelMem = Uint8Array.from(chip.mem), cpu = new Cpu6502(modelMem), mismatches: Mismatch[] = [], trace: Run['trace'] = [];
  let fetch: { pc: number; cycle: number } | null = null, cycle = 0, instr = 0, stoppedBy = `it ran ${o.most ?? 200000} cycles`, writes: Map<number, number> = new Map(), synced = false;
  const fmt = (v: number, w = 2) => `$${v.toString(16).padStart(w, '0')}`, most = o.most ?? 200000;
  const compare = (pc: number) => {
    const r = chip.regs(), m = cpu.r, op = BY_CODE[chip.mem[pc]!]?.name ?? '?';
    // (the first instruction after reset: the model takes the chip's registers as they came up)
    if (!synced) { cpu.r = { ...r, pc }; synced = true; return; }
    for (const [k, mask] of [['a', 0xff], ['x', 0xff], ['y', 0xff], ['sp', 0xff], ['p', 0xcf]] as const) if (((r[k] ^ m[k]) & mask) !== 0) mismatches.push({ instr, pc, op, what: k === 'p' ? 'flags (NV..DIZC)' : k.toUpperCase(), chip: fmt(r[k] & mask), model: fmt(m[k] & mask) });
    if (m.pc !== pc) mismatches.push({ instr, pc, op, what: 'PC', chip: fmt(pc, 4), model: fmt(m.pc, 4) });
  };
  let pending: { pc: number; at: number } | null = null, lastCode = -1;
  while (cycle < most) {
    chip.half(); chip.half(); cycle++;
    if (chip.lastWrite) { writes.set(chip.lastWrite[0], chip.lastWrite[1]); written[chip.lastWrite[0]] = 1; }
    // (one cycle after a fetch, the registers stand as every instruction before it left them)
    if (pending && cycle === pending.at + 1) {
      compare(pending.pc);
      const code = chip.mem[pending.pc]!;
      if (code === 0x4c && (chip.mem[pending.pc + 1]! | (chip.mem[pending.pc + 2]! << 8)) === pending.pc) { stoppedBy = `it reached its end (a jump to itself at ${fmt(pending.pc, 4)})`; break; }
      lastCode = code; pending = null;
    }
    if (chip.sync && chip.reading) {
      const pc = chip.address;
      // (the reset sequence raises SYNC too: the program starts at the first fetch from where the reset vector points)
      if (!fetch && pc !== o.start) continue;
      if (fetch) {
        const took = cycle - fetch.cycle; if (o.trace && trace.length < o.trace) trace.push({ pc: fetch.pc, op: BY_CODE[lastCode]?.name ?? '?', cycles: took });
        // (the model runs the instruction the chip just finished: its cycles and what it wrote compared)
        const was = cpu.r.pc, did = cpu.step(); instr++;
        if (did.cycles !== took) mismatches.push({ instr, pc: was, op: did.op.name, what: 'cycles', chip: String(took), model: String(did.cycles) });
        const mw = new Map(cpu.wrote); for (const [a, v] of writes) if (mw.get(a) !== v) mismatches.push({ instr, pc: was, op: did.op.name, what: `write ${fmt(a, 4)}`, chip: fmt(v), model: mw.has(a) ? fmt(mw.get(a)!) : 'none' });
        for (const [a, v] of mw) if (!writes.has(a)) mismatches.push({ instr, pc: was, op: did.op.name, what: `write ${fmt(a, 4)}`, chip: 'none', model: fmt(v) });
        if (mismatches.length > 50) { stoppedBy = 'more than 50 differences'; break; }
      }
      writes = new Map(); fetch = { pc, cycle }; pending = { pc, at: cycle };
    }
  }
  const ms = performance.now() - t0;
  return { written, instructions: instr, cycles: cycle, halfCycles: chip.halfCycles, ms, hz: (cycle / ms) * 1000, switchesPerCycle: (chip.sim.groups - g0) / Math.max(1, cycle), mismatches, regs: chip.regs(), mem: chip.mem, trace, stoppedBy };
}

/** A page of memory as a board of 256 tiles, 16 a row: each byte's tile as high as its value; of those the program
 *  wrote, the ones it left zero lit and printed with their address's low byte (a sieve's primes); what it never wrote
 *  sunk and dark. */
export function memoryView(mem: Uint8Array, page: number, written?: Uint8Array, name = `memory page $${page.toString(16).padStart(2, '0')}`): Part {
  const parts: Part[] = [], s = 0.1;
  for (let i = 0; i < 256; i++) { const a = (page << 8) | i, v = mem[a]!, w = !written || written[a] === 1, h = w ? 0.01 + (v / 255) * 0.2 : 0.002, x = (i % 16) * s, z = Math.floor(i / 16) * s;
    parts.push({ name: `$${a.toString(16).padStart(4, '0')} = ${v}${w ? '' : ' (never written)'}`, shape: { box: [s * 0.9, h, s * 0.9] }, at: [x - 0.75, h / 2, z - 0.75], mat: 'pvc', color: !w ? 0x151a20 : v === 0 ? 0x2ecc71 : 0x34495e, ...(w && v === 0 ? { text: String(i) } : {}) }); }
  return { name, parts };
}

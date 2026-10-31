// The 6502 as its programmer's manual describes it (MOS Technology, MCS6500 Microcomputer Family Programming Manual,
// 1976): its 151 official opcodes, what each does to the registers, the flags and memory, and how many cycles each
// takes (one more where an index carries into the next page, or a branch is taken, and one more again where a taken
// branch crosses a page). The fast model: a whole instruction at a time, where the netlist (logic/switch.ts) takes
// thousands of switches a cycle. Each is checked against the other (logic/chip6502.ts): the transistors are the truth.

export type Mode = 'imp' | 'acc' | 'imm' | 'zp' | 'zpx' | 'zpy' | 'abs' | 'abx' | 'aby' | 'ind' | 'izx' | 'izy' | 'rel';
export interface Op { code: number; name: string; mode: Mode; cycles: number; /** one more cycle where an index carries into the next page (reads) */ page: boolean }
export const BYTES: Record<Mode, number> = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, abs: 3, abx: 3, aby: 3, ind: 3, izx: 2, izy: 2, rel: 2 };

const T: [string, Mode, number, number, boolean?][] = [];
const add = (name: string, ...xs: [Mode, number, number, boolean?][]) => { for (const [m, c, n, p] of xs) T.push([name, m, c, n, p]); };
// (the eight that read or write through every addressing mode; a store never takes the page's extra cycle, it always takes it)
for (const [name, base] of [['ORA', 0x00], ['AND', 0x20], ['EOR', 0x40], ['ADC', 0x60], ['LDA', 0xa0], ['CMP', 0xc0], ['SBC', 0xe0]] as const)
  add(name, ['izx', base + 0x01, 6], ['zp', base + 0x05, 3], ['imm', base + 0x09, 2], ['abs', base + 0x0d, 4], ['izy', base + 0x11, 5, true], ['zpx', base + 0x15, 4], ['aby', base + 0x19, 4, true], ['abx', base + 0x1d, 4, true]);
add('STA', ['izx', 0x81, 6], ['zp', 0x85, 3], ['abs', 0x8d, 4], ['izy', 0x91, 6], ['zpx', 0x95, 4], ['aby', 0x99, 5], ['abx', 0x9d, 5]);
for (const [name, base] of [['ASL', 0x00], ['ROL', 0x20], ['LSR', 0x40], ['ROR', 0x60]] as const) add(name, ['zp', base + 0x06, 5], ['acc', base + 0x0a, 2], ['abs', base + 0x0e, 6], ['zpx', base + 0x16, 6], ['abx', base + 0x1e, 7]);
add('DEC', ['zp', 0xc6, 5], ['abs', 0xce, 6], ['zpx', 0xd6, 6], ['abx', 0xde, 7]); add('INC', ['zp', 0xe6, 5], ['abs', 0xee, 6], ['zpx', 0xf6, 6], ['abx', 0xfe, 7]);
add('LDX', ['imm', 0xa2, 2], ['zp', 0xa6, 3], ['abs', 0xae, 4], ['zpy', 0xb6, 4], ['aby', 0xbe, 4, true]); add('LDY', ['imm', 0xa0, 2], ['zp', 0xa4, 3], ['abs', 0xac, 4], ['zpx', 0xb4, 4], ['abx', 0xbc, 4, true]);
add('STX', ['zp', 0x86, 3], ['abs', 0x8e, 4], ['zpy', 0x96, 4]); add('STY', ['zp', 0x84, 3], ['abs', 0x8c, 4], ['zpx', 0x94, 4]);
add('CPX', ['imm', 0xe0, 2], ['zp', 0xe4, 3], ['abs', 0xec, 4]); add('CPY', ['imm', 0xc0, 2], ['zp', 0xc4, 3], ['abs', 0xcc, 4]); add('BIT', ['zp', 0x24, 3], ['abs', 0x2c, 4]);
for (const [name, code] of [['BPL', 0x10], ['BMI', 0x30], ['BVC', 0x50], ['BVS', 0x70], ['BCC', 0x90], ['BCS', 0xb0], ['BNE', 0xd0], ['BEQ', 0xf0]] as const) add(name, ['rel', code, 2]);
add('JMP', ['abs', 0x4c, 3], ['ind', 0x6c, 5]); add('JSR', ['abs', 0x20, 6]); add('RTS', ['imp', 0x60, 6]); add('RTI', ['imp', 0x40, 6]); add('BRK', ['imp', 0x00, 7]);
for (const [name, code, c] of [['PHP', 0x08, 3], ['PLP', 0x28, 4], ['PHA', 0x48, 3], ['PLA', 0x68, 4], ['CLC', 0x18, 2], ['SEC', 0x38, 2], ['CLI', 0x58, 2], ['SEI', 0x78, 2], ['CLV', 0xb8, 2], ['CLD', 0xd8, 2], ['SED', 0xf8, 2],
  ['DEY', 0x88, 2], ['TXA', 0x8a, 2], ['TYA', 0x98, 2], ['TXS', 0x9a, 2], ['TAY', 0xa8, 2], ['TAX', 0xaa, 2], ['TSX', 0xba, 2], ['INY', 0xc8, 2], ['DEX', 0xca, 2], ['INX', 0xe8, 2], ['NOP', 0xea, 2]] as const) add(name, ['imp', code, c]);
export const OPS: Op[] = T.map(([name, mode, code, cycles, page]) => ({ code, name, mode, cycles, page: !!page }));
export const BY_CODE: (Op | undefined)[] = []; for (const o of OPS) BY_CODE[o.code] = o;

export interface Regs { a: number; x: number; y: number; sp: number; p: number; pc: number }
export const C = 1, Z = 2, I = 4, D = 8, B = 16, U = 32, V = 64, N = 128;

/** A 6502 a whole instruction at a time, over 64 KB of memory. */
export class Cpu6502 {
  r: Regs = { a: 0, x: 0, y: 0, sp: 0xfd, p: I | U, pc: 0 }; cycles = 0; mem: Uint8Array;
  /** what the last instruction wrote: address, value */ wrote: [number, number][] = [];
  constructor(mem: Uint8Array) { this.mem = mem; }
  private rd(a: number) { return this.mem[a & 0xffff]!; }
  private wr(a: number, v: number) { this.mem[a & 0xffff] = v & 0xff; this.wrote.push([a & 0xffff, v & 0xff]); }
  private nz(v: number) { this.r.p = (this.r.p & ~(N | Z)) | (v & 0x80) | ((v & 0xff) === 0 ? Z : 0); return v & 0xff; }
  private push(v: number) { this.wr(0x100 | this.r.sp, v); this.r.sp = (this.r.sp - 1) & 0xff; }
  private pull() { this.r.sp = (this.r.sp + 1) & 0xff; return this.rd(0x100 | this.r.sp); }
  reset() { this.r.pc = this.rd(0xfffc) | (this.rd(0xfffd) << 8); }

  /** One instruction: what it did, and the cycles it took. */
  step(): { op: Op; cycles: number } {
    const r = this.r, pc = r.pc, code = this.rd(pc), op = BY_CODE[code]; this.wrote = [];
    if (!op) throw new Error(`$${code.toString(16).padStart(2, '0')} at $${pc.toString(16).padStart(4, '0')} is not one of the 151 official opcodes`);
    const b1 = this.rd(pc + 1), w = b1 | (this.rd(pc + 2) << 8); let cyc = op.cycles, ea = -1;
    const cross = (base: number, to: number) => (base & 0xff00) !== (to & 0xff00);
    switch (op.mode) {
      case 'zp': ea = b1; break; case 'zpx': ea = (b1 + r.x) & 0xff; break; case 'zpy': ea = (b1 + r.y) & 0xff; break; case 'abs': ea = w; break;
      case 'abx': ea = (w + r.x) & 0xffff; if (op.page && cross(w, ea)) cyc++; break; case 'aby': ea = (w + r.y) & 0xffff; if (op.page && cross(w, ea)) cyc++; break;
      // (an indirect jump through $xxFF takes its high byte from $xx00: the NMOS chip's own bug)
      case 'ind': ea = this.rd(w) | (this.rd((w & 0xff00) | ((w + 1) & 0xff)) << 8); break;
      case 'izx': { const z = (b1 + r.x) & 0xff; ea = this.rd(z) | (this.rd((z + 1) & 0xff) << 8); break; }
      case 'izy': { const base = this.rd(b1) | (this.rd((b1 + 1) & 0xff) << 8); ea = (base + r.y) & 0xffff; if (op.page && cross(base, ea)) cyc++; break; }
      case 'imm': ea = (pc + 1) & 0xffff; break;
    }
    r.pc = (pc + BYTES[op.mode]) & 0xffff;
    const val = () => (op.mode === 'acc' ? r.a : this.rd(ea)), put = (v: number) => { if (op.mode === 'acc') r.a = v & 0xff; else this.wr(ea, v); };
    const adc = (m: number) => {
      const c = r.p & C;
      if (r.p & D) { // (decimal, as the NMOS chip does it: N, V and Z from the binary sum, which the manual leaves undefined)
        let lo = (r.a & 0x0f) + (m & 0x0f) + c, hi = (r.a & 0xf0) + (m & 0xf0); if (lo > 9) { lo += 6; } if (lo > 0x0f) hi += 0x10;
        const bin = (r.a + m + c) & 0xff; r.p = (r.p & ~(Z | N | V | C)) | (bin === 0 ? Z : 0) | (hi & 0x80) | (~(r.a ^ m) & (r.a ^ hi) & 0x80 ? V : 0);
        if (hi > 0x90) hi += 0x60; if (hi > 0xff) r.p |= C; r.a = ((hi & 0xf0) | (lo & 0x0f)) & 0xff; return;
      }
      const s = r.a + m + c; r.p = (r.p & ~(C | V)) | (s > 0xff ? C : 0) | (~(r.a ^ m) & (r.a ^ s) & 0x80 ? V : 0); r.a = this.nz(s);
    };
    const sbc = (m: number) => {
      if (r.p & D) { const c = r.p & C, bin = r.a - m - (1 - c); let lo = (r.a & 0x0f) - (m & 0x0f) - (1 - c), hi = (r.a & 0xf0) - (m & 0xf0); if (lo & 0x10) { lo -= 6; hi -= 0x10; } if (hi & 0x100) hi -= 0x60;
        r.p = (r.p & ~(C | V | Z | N)) | (bin >= 0 ? C : 0) | ((r.a ^ m) & (r.a ^ bin) & 0x80 ? V : 0) | ((bin & 0xff) === 0 ? Z : 0) | (bin & 0x80); r.a = ((hi & 0xf0) | (lo & 0x0f)) & 0xff; return; }
      adc(m ^ 0xff);
    };
    const cmp = (reg: number, m: number) => { const d = reg - m; r.p = (r.p & ~C) | (d >= 0 ? C : 0); this.nz(d); };
    const branch = (take: boolean) => { if (!take) return; cyc++; const to = (r.pc + ((b1 ^ 0x80) - 0x80)) & 0xffff; if (cross(r.pc, to)) cyc++; r.pc = to; };
    switch (op.name) {
      case 'LDA': r.a = this.nz(val()); break; case 'LDX': r.x = this.nz(val()); break; case 'LDY': r.y = this.nz(val()); break;
      case 'STA': this.wr(ea, r.a); break; case 'STX': this.wr(ea, r.x); break; case 'STY': this.wr(ea, r.y); break;
      case 'ORA': r.a = this.nz(r.a | val()); break; case 'AND': r.a = this.nz(r.a & val()); break; case 'EOR': r.a = this.nz(r.a ^ val()); break;
      case 'ADC': adc(val()); break; case 'SBC': sbc(val()); break;
      case 'CMP': cmp(r.a, val()); break; case 'CPX': cmp(r.x, val()); break; case 'CPY': cmp(r.y, val()); break;
      case 'BIT': { const m = val(); r.p = (r.p & ~(N | V | Z)) | (m & (N | V)) | ((r.a & m) === 0 ? Z : 0); break; }
      case 'ASL': { const m = val(); r.p = (r.p & ~C) | (m >> 7); put(this.nz(m << 1)); break; }
      case 'LSR': { const m = val(); r.p = (r.p & ~C) | (m & 1); put(this.nz(m >> 1)); break; }
      case 'ROL': { const m = val(), c = r.p & C; r.p = (r.p & ~C) | (m >> 7); put(this.nz((m << 1) | c)); break; }
      case 'ROR': { const m = val(), c = r.p & C; r.p = (r.p & ~C) | (m & 1); put(this.nz((m >> 1) | (c << 7))); break; }
      case 'INC': this.wr(ea, this.nz(this.rd(ea) + 1)); break;
      case 'DEC': this.wr(ea, this.nz(this.rd(ea) - 1)); break;
      case 'INX': r.x = this.nz(r.x + 1); break; case 'INY': r.y = this.nz(r.y + 1); break; case 'DEX': r.x = this.nz(r.x - 1); break; case 'DEY': r.y = this.nz(r.y - 1); break;
      case 'TAX': r.x = this.nz(r.a); break; case 'TAY': r.y = this.nz(r.a); break; case 'TXA': r.a = this.nz(r.x); break; case 'TYA': r.a = this.nz(r.y); break;
      case 'TSX': r.x = this.nz(r.sp); break; case 'TXS': r.sp = r.x; break;
      case 'PHA': this.push(r.a); break; case 'PHP': this.push(r.p | B | U); break; case 'PLA': r.a = this.nz(this.pull()); break; case 'PLP': r.p = (this.pull() & ~B) | U; break;
      case 'CLC': r.p &= ~C; break; case 'SEC': r.p |= C; break; case 'CLI': r.p &= ~I; break; case 'SEI': r.p |= I; break; case 'CLV': r.p &= ~V; break; case 'CLD': r.p &= ~D; break; case 'SED': r.p |= D; break;
      case 'BPL': branch(!(r.p & N)); break; case 'BMI': branch(!!(r.p & N)); break; case 'BVC': branch(!(r.p & V)); break; case 'BVS': branch(!!(r.p & V)); break;
      case 'BCC': branch(!(r.p & C)); break; case 'BCS': branch(!!(r.p & C)); break; case 'BNE': branch(!(r.p & Z)); break; case 'BEQ': branch(!!(r.p & Z)); break;
      case 'JMP': r.pc = ea; break;
      case 'JSR': { const ret = (pc + 2) & 0xffff; this.push(ret >> 8); this.push(ret & 0xff); r.pc = w; break; }
      case 'RTS': { const lo = this.pull(), hi = this.pull(); r.pc = (((hi << 8) | lo) + 1) & 0xffff; break; }
      case 'RTI': { r.p = (this.pull() & ~B) | U; const lo = this.pull(), hi = this.pull(); r.pc = (hi << 8) | lo; break; }
      case 'BRK': { const ret = (pc + 2) & 0xffff; this.push(ret >> 8); this.push(ret & 0xff); this.push(r.p | B | U); r.p |= I; r.pc = this.rd(0xfffe) | (this.rd(0xffff) << 8); break; }
      case 'NOP': break;
    }
    this.cycles += cyc; return { op, cycles: cyc };
  }
}

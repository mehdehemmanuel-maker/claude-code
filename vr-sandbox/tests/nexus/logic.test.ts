// The 6502 from its transistors (docs/LIFE.md, step 4; src/nexus/logic/): its netlist, its gates read and characterised
// at switch level, a real program run on it half a clock at a time and checked instruction by instruction against the
// fast model. The transistors are the truth; the netlist is fetched from its source (CC BY-NC-SA) and cached outside git.
import { beforeAll, describe, expect, it } from 'vitest';
import { load6502, parseNetlistH, type Netlist } from '../../src/nexus/logic/netlist';
import { SwitchSim } from '../../src/nexus/logic/switch';
import { assemble } from '../../src/nexus/logic/asm6502';
import { BY_CODE, C, Cpu6502, N, OPS, V, Z } from '../../src/nexus/logic/cpu6502';
import { runBoth } from '../../src/nexus/logic/chip6502';
import { cellsOf, characterise } from '../../src/nexus/logic/cells';
import { everyOpcode, PRIMES } from '../../src/nexus/logic/programs';

let net: Netlist;
beforeAll(async () => { net = await load6502(); }, 120000);

describe('the assembler and the fast model, from the programming manual', () => {
  it('151 official opcodes, each one code', () => { expect(OPS).toHaveLength(151); expect(new Set(OPS.map((o) => o.code)).size).toBe(151); });
  it('assembles each addressing mode to its bytes; a zero-page form where the address fits; branches by their offset', () => {
    const a = assemble('zp = $20\n .org $0400\nl: lda #$01\n lda zp\n lda $1234,x\n lda (zp),y\n jmp ($03ff)\n bne l\n ror a');
    expect([...a.bytes.values()].map((v) => v.toString(16).padStart(2, '0')).join(' ')).toBe('a9 01 a5 20 bd 34 12 b1 20 6c ff 03 d0 f2 6a');
  });
  it('ADC sets overflow where two positives make a negative; decimal 9 + 1 is 10; an indirect jump through $xxFF wraps in its page', () => {
    const m = new Uint8Array(65536), c = new Cpu6502(m); m.set([0xa9, 0x50, 0x69, 0x50], 0x400); c.r.pc = 0x400; c.step(); c.step();
    expect(c.r.a).toBe(0xa0); expect(c.r.p & V).toBe(V); expect(c.r.p & N).toBe(N); expect(c.r.p & C).toBe(0);
    m.set([0xf8, 0x18, 0xa9, 0x09, 0x69, 0x01], 0x500); c.r.pc = 0x500; for (let k = 0; k < 4; k++) c.step(); expect(c.r.a).toBe(0x10); expect(c.r.p & Z).toBe(0);
    m.set([0x6c, 0xff, 0x03], 0x600); m[0x3ff] = 0x34; m[0x300] = 0x12; m[0x400] = 0x99; c.r.pc = 0x600; c.step(); expect(c.r.pc).toBe(0x1234);
  });
});

describe('switch level', () => {
  it('an NMOS NOR and an inverter, built from switches and pull-ups, give their tables', () => {
    // (ground 0, supply 1; a NOR at 2 of inputs 3 and 4; an inverter at 5 of 2)
    const n: Netlist = { name: 'two gates', nodes: 6, gate: Int32Array.from([3, 4, 2]), c1: Int32Array.from([2, 2, 5]), c2: Int32Array.from([0, 0, 0]), pullup: Uint8Array.from([0, 0, 1, 0, 0, 1]), vcc: 1, vss: 0, names: {}, traced: 3, source: '' };
    const s = new SwitchSim(n); s.settleAll();
    for (const [a, b] of [[0, 0], [0, 1], [1, 0], [1, 1]]) { s.setMany([[3, a === 1], [4, b === 1]]); expect(s.high(2)).toBe(!(a || b)); expect(s.high(5)).toBe(!!(a || b)); }
  });
  it('the 6502 as traced: 3,288 transistors (3,239 once duplicates are one), 1,726 nodes', () => {
    expect(net.traced).toBe(3288); expect(net.gate.length).toBe(3239); expect(net.nodes).toBe(1726);
    expect(() => parseNetlistH('nothing here')).toThrow(/not a netlist/);
  });
  it('its gates read from their pull-down networks; each kind\'s table, run on its own switches, is the gate its network says', () => {
    const c = cellsOf(net), kinds = c.kinds.map((k) => k.kind);
    expect(kinds).toContain('inverter'); expect(kinds).toContain('NOR2'); expect(kinds).toContain('NAND2');
    expect(c.cells.length).toBeGreaterThan(900);
    for (const k of c.kinds.slice(0, 8)) expect(characterise(c.cells.find((x) => x.out === k.example)!).says).toMatch(/its switches give/);
  });
});

describe('a real program on its transistors', () => {
  it('the primes below 200: 46 of them; the 10th times the 20th, 29 × 71 = 2059; not one difference from the fast model', () => {
    const a = assemble(PRIMES), r = runBoth(net, a.bytes, { start: a.start, most: 30000 });
    expect(r.stoppedBy).toMatch(/end/); expect(r.mismatches).toEqual([]);
    expect(r.mem[0x15]).toBe(46); expect(r.mem[0x1109]).toBe(29); expect(r.mem[0x1113]).toBe(71); expect((r.mem[0x14]! << 8) | r.mem[0x13]!).toBe(2059);
    expect(r.hz).toBeGreaterThan(500);
  }, 120000);
  it('all 151 official opcodes, generated from the opcode table, each over operands that reach every flag, ADC and SBC binary and decimal, branches taken and not, BRK and RTI: not one difference', () => {
    const a = assemble(everyOpcode()), r = runBoth(net, a.bytes, { start: a.start, most: 200000 });
    expect(r.stoppedBy).toMatch(/end/); expect(r.mismatches).toEqual([]);
    // (every official opcode is in it, as an instruction)
    const seen = new Set<number>(); for (const l of a.lines) if (l.size && !/^\s*(\w+:\s*)?\./.test(l.text)) seen.add(a.bytes.get(l.addr)!); expect(OPS.filter((o) => !seen.has(o.code)).map((o) => `${o.name} ${o.mode}`)).toEqual([]);
  }, 600000);
  it('the check is real: a fast model wrong by one cycle is caught at the first instruction it is wrong on', () => {
    const op = BY_CODE[0x9d]!; op.cycles = 4;
    try { const a = assemble(PRIMES), r = runBoth(net, a.bytes, { start: a.start, most: 30000 }); expect(r.mismatches[0]).toMatchObject({ op: 'STA', what: 'cycles', chip: '5', model: '4' }); } finally { op.cycles = 5; }
  }, 120000);
});

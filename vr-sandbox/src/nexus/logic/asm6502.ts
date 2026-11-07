// A 6502 assembler, two passes, from the same opcode table the fast model runs by (logic/cpu6502.ts): labels, `name =
// value`, .org, .byte, .word; numbers as $hex, %binary or decimal; <lo and >hi; #immediate, (indirect,X), (indirect),Y,
// (indirect), indexed ,X and ,Y; a zero-page form where the address is known to fit and the instruction has one.

import { BYTES, OPS, type Mode } from './cpu6502';

export interface Assembled { bytes: Map<number, number>; labels: Record<string, number>; start: number; lines: { addr: number; text: string; size: number }[] }

const has = (name: string, mode: Mode) => OPS.some((o) => o.name === name && o.mode === mode);
const opOf = (name: string, mode: Mode) => OPS.find((o) => o.name === name && o.mode === mode);

export function assemble(src: string): Assembled {
  const labels: Record<string, number> = {}, out = new Map<number, number>(), listing: Assembled['lines'] = [], forward = new Set<string>(); let start = -1;
  for (let pass = 0; pass < 2; pass++) {
    let pc = 0; listing.length = 0;
    const num = (t: string, line: number): number => {
      t = t.trim(); if (!t) throw new Error(`line ${line}: a value is missing`);
      // (a sum or difference of terms: label+1, end-start)
      const parts = t.split(/(?=[+-])/); if (parts.length > 1 && !/^[+-]/.test(t)) return parts.reduce((s, p) => s + (p.startsWith('-') ? -num(p.slice(1), line) : num(p.replace(/^\+/, ''), line)), 0);
      if (t.startsWith('<')) return num(t.slice(1), line) & 0xff; if (t.startsWith('>')) return (num(t.slice(1), line) >> 8) & 0xff;
      if (t === '*') return pc; if (/^\$[0-9a-f]+$/i.test(t)) return parseInt(t.slice(1), 16); if (/^%[01]+$/.test(t)) return parseInt(t.slice(1), 2); if (/^\d+$/.test(t)) return parseInt(t, 10);
      if (/^'.'$/.test(t)) return t.charCodeAt(1);
      if (/^[a-z_][a-z0-9_]*$/i.test(t)) { const v = labels[t.toLowerCase()]; if (v === undefined) { if (pass === 0) { forward.add(t.toLowerCase()); return 0xffff; } throw new Error(`line ${line}: no label "${t}"`); } return v; }
      throw new Error(`line ${line}: "${t}" is not a number or a label`);
    };
    src.split('\n').forEach((raw, i) => {
      const line = i + 1; let s = raw.replace(/;.*$/, '').trim(); if (!s) return; const at = pc;
      const lab = /^([a-z_][a-z0-9_]*):\s*/i.exec(s); if (lab) { labels[lab[1]!.toLowerCase()] = pc; s = s.slice(lab[0].length); if (!s) return; }
      const eq = /^([a-z_][a-z0-9_]*)\s*=\s*(.+)$/i.exec(s); if (eq) { labels[eq[1]!.toLowerCase()] = num(eq[2]!, line); return; }
      const [w0, ...rest] = s.split(/\s+/); const word = w0!.toUpperCase(), arg = rest.join(' ').trim();
      if (word === '.ORG') { pc = num(arg, line); return; }
      if (word === '.BYTE' || word === '.WORD') { const vs = arg.split(',').map((x) => num(x, line)); for (const v of vs) { if (word === '.BYTE') out.set(pc++, v & 0xff); else { out.set(pc++, v & 0xff); out.set(pc++, (v >> 8) & 0xff); } } listing.push({ addr: at, text: raw.trim(), size: pc - at }); return; }
      if (!OPS.some((o) => o.name === word)) throw new Error(`line ${line}: "${w0}" is not a 6502 instruction`);
      let mode: Mode, v = 0; const a = arg.replace(/\s+/g, '');
      if (!a || /^a$/i.test(a)) mode = has(word, 'acc') ? 'acc' : 'imp';
      else if (a.startsWith('#')) { mode = 'imm'; v = num(a.slice(1), line); }
      else if (/^\(.*,x\)$/i.test(a)) { mode = 'izx'; v = num(a.slice(1, -3), line); }
      else if (/^\(.*\),y$/i.test(a)) { mode = 'izy'; v = num(a.slice(1, -3), line); }
      else if (/^\(.*\)$/.test(a)) { mode = 'ind'; v = num(a.slice(1, -1), line); }
      else if (has(word, 'rel')) { mode = 'rel'; v = num(a, line); }
      else { const ix = /,([xy])$/i.exec(a), base = ix ? a.slice(0, -2) : a; v = num(base, line); const zp = v <= 0xff && labelsKnown(base);
        const k = ix ? ix[1]!.toLowerCase() : ''; mode = k === 'x' ? (zp && has(word, 'zpx') ? 'zpx' : 'abx') : k === 'y' ? (zp && has(word, 'zpy') ? 'zpy' : 'aby') : (zp && has(word, 'zp') ? 'zp' : 'abs'); }
      const op = opOf(word, mode); if (!op) throw new Error(`line ${line}: ${word} has no ${mode} form`);
      if (start < 0 && pass === 1) start = pc;
      out.set(pc, op.code);
      if (mode === 'rel') { const d = v - (pc + 2); if (pass === 1 && (d < -128 || d > 127)) throw new Error(`line ${line}: the branch to $${v.toString(16)} is ${d} bytes away, past the −128 to +127 a branch reaches`); out.set(pc + 1, d & 0xff); }
      else if (BYTES[mode] === 2) out.set(pc + 1, v & 0xff); else if (BYTES[mode] === 3) { out.set(pc + 1, v & 0xff); out.set(pc + 2, (v >> 8) & 0xff); }
      pc += BYTES[mode]; listing.push({ addr: at, text: raw.trim(), size: pc - at });
      // (a label known in pass one, or a literal, decides zero page alike in both passes)
      function labelsKnown(t: string) { return /^[$%0-9<>']/.test(t) || (labels[t.toLowerCase()] !== undefined && !forward.has(t.toLowerCase())); }
    });
  }
  return { bytes: out, labels, start, lines: [...listing] };
}

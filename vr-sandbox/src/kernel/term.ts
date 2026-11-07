// The kernel's expressions (spec 10, T23; research 31 B1.5): read strictly from JSON arrays, ["num", "3/4"], ["var", "x"],
// [op, ...args], with caps on depth and size; their dimension decided exactly; their value enclosed by intervals.
// An operator not here (erf, an integral) is refused as undecided: the kernel fails closed.

import { KernelError, fromText, rat, type Rat } from './rat';
import * as I from './interval';
import { DIMLESS, divDim, isDimless, mulDim, powDim, sameDim, dimText, type Dim } from './dim';

export type KTerm = readonly ['num', string] | readonly ['var', string] | readonly [string, ...unknown[]];
const UNARY = ['neg', 'abs', 'exp', 'ln', 'log10', 'log2', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan'], BINARY = ['sub', 'div', 'min', 'max'], NARY = ['add', 'mul'];

/** Checked as it is read: its shape, its size (at most 64 deep and 10,000 nodes), every number exact. */
export function parseTerm(t: unknown, depth = 0, count = { n: 0 }): KTerm {
  if (++count.n > 10_000 || depth > 64) throw new KernelError('malformed', 'a term too large');
  if (!Array.isArray(t) || typeof t[0] !== 'string') throw new KernelError('malformed', 'a term is an array that starts with its operator');
  const [op, ...args] = t as [string, ...unknown[]];
  if (op === 'num') { if (args.length !== 1 || typeof args[0] !== 'string') throw new KernelError('malformed', 'a number is ["num", "text"]'); fromText(args[0]); return ['num', args[0]]; }
  if (op === 'var') { if (args.length !== 1 || typeof args[0] !== 'string' || !/^[A-Za-z_][\w']{0,30}$/.test(args[0])) throw new KernelError('malformed', 'a variable is ["var", "name"]'); return ['var', args[0]]; }
  if (op === 'pow') { if (args.length !== 2 || typeof args[1] !== 'string') throw new KernelError('malformed', 'a power is ["pow", term, "k"]'); fromText(args[1]); return ['pow', parseTerm(args[0], depth + 1, count), args[1]]; }
  const n = UNARY.includes(op) ? 1 : BINARY.includes(op) ? 2 : NARY.includes(op) ? -1 : 0;
  if (n === 0) throw new KernelError('undecided', `an operator not in the kernel: ${op.slice(0, 20)}`);
  if (n > 0 ? args.length !== n : args.length < 2) throw new KernelError('malformed', `${op} takes ${n > 0 ? n : 'two or more'} arguments`);
  return [op, ...args.map((a) => parseTerm(a, depth + 1, count))];
}

/** Its dimension, from its variables': sums of like only, logs and exponentials of pure numbers only. */
export function dimOf(t: KTerm, vars: Record<string, Dim>): Dim {
  const [op, ...a] = t as [string, ...KTerm[]];
  switch (op) {
    case 'num': return DIMLESS;
    case 'var': { const s = a[0] as unknown as string; if (!Object.prototype.hasOwnProperty.call(vars, s)) throw new KernelError('malformed', `the variable ${s} has no unit`); return vars[s]!; }
    case 'add': case 'sub': case 'min': case 'max': { const ds = a.map((x) => dimOf(x, vars)); for (const d of ds) if (!sameDim(d, ds[0]!)) throw new KernelError('wrong', `${op} of ${dimText(ds[0]!)} and ${dimText(d)}`); return ds[0]!; }
    case 'mul': return a.map((x) => dimOf(x, vars)).reduce(mulDim);
    case 'div': return divDim(dimOf(a[0]!, vars), dimOf(a[1]!, vars));
    case 'neg': case 'abs': return dimOf(a[0]!, vars);
    case 'sqrt': return powDim(dimOf(a[0]!, vars), rat(1n, 2n));
    case 'pow': return powDim(dimOf(a[0]!, vars), fromText(a[1] as unknown as string));
    default: { const d = dimOf(a[0]!, vars); if (!isDimless(d)) throw new KernelError('wrong', `${op} of ${dimText(d)}, not a pure number`); return DIMLESS; }
  }
}

/** Its value, enclosed: every variable an interval (a point given exactly is an interval of width 0). */
export function enclose(t: KTerm, env: Record<string, I.Iv>): I.Iv {
  const [op, ...a] = t as [string, ...KTerm[]];
  const e = (x: KTerm): I.Iv => enclose(x, env);
  switch (op) {
    case 'num': return I.point(fromText(a[0] as unknown as string));
    case 'var': { const s = a[0] as unknown as string; if (!Object.prototype.hasOwnProperty.call(env, s)) throw new KernelError('malformed', `no value for ${s}`); return env[s]!; }
    case 'add': return a.map(e).reduce(I.add);
    case 'mul': return a.map(e).reduce(I.mul);
    case 'sub': return I.sub(e(a[0]!), e(a[1]!));
    case 'div': return I.div(e(a[0]!), e(a[1]!));
    case 'min': return I.min(e(a[0]!), e(a[1]!));
    case 'max': return I.max(e(a[0]!), e(a[1]!));
    case 'neg': return I.neg(e(a[0]!));
    case 'abs': return I.abs(e(a[0]!));
    case 'sqrt': return I.sqrt(e(a[0]!));
    case 'exp': return I.exp(e(a[0]!));
    case 'ln': return I.ln(e(a[0]!));
    case 'log10': return I.div(I.ln(e(a[0]!)), I.ln(I.point(rat(10n))));
    case 'log2': return I.div(I.ln(e(a[0]!)), I.ln(I.point(rat(2n))));
    case 'pow': return I.pow(e(a[0]!), fromText(a[1] as unknown as string) as Rat);
    case 'sin': return I.sin(e(a[0]!));
    case 'cos': return I.cos(e(a[0]!));
    case 'tan': return I.tan(e(a[0]!));
    case 'asin': return I.asin(e(a[0]!));
    case 'acos': return I.acos(e(a[0]!));
    case 'atan': return I.atan(e(a[0]!));
    default: throw new KernelError('undecided', `an operator not in the kernel: ${op}`);
  }
}

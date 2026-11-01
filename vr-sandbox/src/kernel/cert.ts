// The certificate envelope and its checks (the kernel, spec 10, T23 and T18; research 31 B1.7, B2): a certificate is read
// strictly (an unknown field, a wrong type or an oversize part refuses it), then the checker of its kind decides it. A
// pass says what it is (checked, or checked at this point only) and what it trusts; a refusal says why: wrong (the claim
// is false), undecided (the kernel cannot decide it) or malformed (not a certificate it reads). A `judged` certificate is
// never a pass: a model's verdict is shown beside a check, never as one (constitution C29).

import { KernelError, absR, add, fromText, le, lt, mul, sub, type Rat } from './rat';
import * as I from './interval';
import { dimOfUnit, dimText, sameDim, type Dim } from './dim';
import { dimOf, enclose, parseTerm } from './term';

export const KERNEL_VERSION = '0.1.0';
export type Kind = 'dims' | 'witness' | 'judged';
export interface Certificate { kind: Kind; claim: unknown; trustedBase: string[]; producer: string }
export interface Verdict { ok: boolean; kind: string; level: 'checked' | 'checked at this point' | 'judged' | 'none'; refused?: 'wrong' | 'undecided' | 'malformed'; why: string; trusts: string[] }

const KINDS: Kind[] = ['dims', 'witness', 'judged'];
/** What every check leans on and cannot check itself: the engine that runs it, and for units the table. */
const RUNTIME = 'the JavaScript engine and its BigInt';
const UNIT_TABLE = "the kernel's unit table (src/kernel/units.json, each unit's dimension)";

function only(o: unknown, keys: string[], what: string): Record<string, unknown> {
  if (!o || typeof o !== 'object' || Array.isArray(o)) throw new KernelError('malformed', `${what} is not a record`);
  for (const k of Object.keys(o)) if (!keys.includes(k)) throw new KernelError('malformed', `${what} has a field the kernel does not read: ${k.slice(0, 20)}`);
  return o as Record<string, unknown>;
}
const str = (x: unknown, what: string): string => { if (typeof x !== 'string' || x.length > 400) throw new KernelError('malformed', `${what} is not a short text`); return x; };

/** Read strictly: what is not one of these shapes is refused before any check runs. */
export function parseCertificate(c: unknown): Certificate {
  const o = only(c, ['kind', 'claim', 'trustedBase', 'producer'], 'the certificate');
  if (!KINDS.includes(o.kind as Kind)) throw new KernelError('malformed', `no kind ${String(o.kind).slice(0, 20)} in this kernel`);
  if (!Array.isArray(o.trustedBase) || o.trustedBase.length > 20) throw new KernelError('malformed', 'trustedBase is a short list');
  return { kind: o.kind as Kind, claim: o.claim, trustedBase: o.trustedBase.map((x, i) => str(x, `trustedBase[${i}]`)), producer: str(o.producer, 'producer') };
}

/** dims: a wire joins two units of one dimension; or a law's term has its output's dimension. Nothing to supply. */
function checkDims(claim: unknown): { level: Verdict['level']; why: string; trusts: string[] } {
  const o = only(claim, ['wire', 'law'], 'the dims claim');
  if (o.wire !== undefined) {
    const w = only(o.wire, ['from', 'to'], 'the wire'), a = dimOfUnit(str(w.from, 'from')), b = dimOfUnit(str(w.to, 'to'));
    if (!sameDim(a, b)) throw new KernelError('wrong', `${w.from} is ${dimText(a)} and ${w.to} is ${dimText(b)}`);
    return { level: 'checked', why: `${w.from} and ${w.to} are both ${dimText(a)}`, trusts: [UNIT_TABLE] };
  }
  const l = only(o.law, ['term', 'vars', 'out'], 'the law'), vars = only(l.vars, Object.keys((l.vars as object) ?? {}), 'vars');
  const dims: Record<string, Dim> = {}; for (const [k, u] of Object.entries(vars)) dims[k] = dimOfUnit(str(u, `the unit of ${k}`));
  const got = dimOf(parseTerm(l.term), dims), want = dimOfUnit(str(l.out, 'out'));
  if (!sameDim(got, want)) throw new KernelError('wrong', `the term is ${dimText(got)}, the output ${String(l.out)} is ${dimText(want)}`);
  return { level: 'checked', why: `the term is ${dimText(got)}, as its output`, trusts: [UNIT_TABLE] };
}

/** witness: at the point given (each value exact, in SI), the term's value lies within the tolerance of the value
 *  claimed. Its enclosure inside the band passes; wholly outside is wrong; across its edge is undecided. */
function checkWitness(claim: unknown): { level: Verdict['level']; why: string; trusts: string[] } {
  const o = only(claim, ['term', 'at', 'value', 'tol'], 'the witness claim'), t = parseTerm(o.term);
  const at = only(o.at, Object.keys((o.at as object) ?? {}), 'at'), env: Record<string, I.Iv> = {};
  for (const [k, v] of Object.entries(at)) env[k] = I.point(fromText(str(v, `the value of ${k}`)));
  const tol = only(o.tol, ['rel', 'abs'], 'tol'), rel = fromText(str(tol.rel, 'tol.rel')), ab = fromText(str(tol.abs, 'tol.abs')), v = fromText(str(o.value, 'value'));
  if (lt(rel, fromText('0')) || lt(ab, fromText('0'))) throw new KernelError('malformed', 'a tolerance below zero');
  const w: Rat = add(mul(rel, absR(v)), ab), lo = sub(v, w), hi = add(v, w), got = enclose(t, env);
  const show = `${I.ivText(got)} against ${o.value} ± ${tol.rel}·|v| + ${tol.abs}`;
  if (le(lo, got.lo) && le(got.hi, hi)) return { level: 'checked at this point', why: `the term's value lies within the tolerance: ${show}`, trusts: [] };
  if (lt(got.hi, lo) || lt(hi, got.lo)) throw new KernelError('wrong', `the term's value lies outside the tolerance: ${show}`);
  throw new KernelError('undecided', `the term's enclosure crosses the tolerance's edge: ${show}`);
}

/** The one door: a certificate in, a verdict out; nothing thrown. */
export function check(c: unknown): Verdict {
  let kind = '?';
  try {
    const cert = parseCertificate(c); kind = cert.kind;
    if (cert.kind === 'judged') return { ok: false, kind, level: 'judged', refused: 'undecided', why: "a model's verdict is not a check: shown beside, never a pass (C29)", trusts: [] };
    const r = cert.kind === 'dims' ? checkDims(cert.claim) : checkWitness(cert.claim);
    return { ok: true, kind, level: r.level, why: r.why, trusts: [RUNTIME, ...r.trusts, ...cert.trustedBase] };
  } catch (e) {
    const k = e instanceof KernelError ? e.refused : 'malformed';
    return { ok: false, kind, level: 'none', refused: k, why: e instanceof Error ? e.message.slice(0, 300) : 'refused', trusts: [] };
  }
}

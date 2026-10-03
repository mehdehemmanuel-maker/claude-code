// The compact text of Nex (docs/EGO-NATIVE-LANGUAGE.md section E): one line per structure, read back without loss.
// It is a surface on the canonical form, not a second language: the same structure has one text, the text reads to a
// structure with the same hash, and nothing in it is an English word except the names of the operators and the
// coordinate keys, which are glyphs here (a reader may swap them for symbols; the meaning is in the shape).
//
//   D   motor.dc                       a distinction: its id, quoted when it holds a space or a bracket
//   Q   3.2[N m]   0.5   300[K]        a quantity: the number in the unit it was given (SI when none)
//   R   influence(motor.dc, heat){dir:1 polarity:+ strength:0.8 cert:{kind:interval lo:0.6 hi:0.8} ev:{how:measured}}
//   T   T(cold, hot | powered){time:{dur:30[s]}}        from, to, conditions after a bar
//   E   E(influence(...)){how:measured src:"a reading"}
//   C   C.believe(ego, influence(...))                  a context: its kind, its holder, its body
//   M   M(joule-chain, 2, load, life)                   a morpheme reference: id, version, arguments
//
// Coordinates follow in braces as key:value pairs, in one fixed order, with only the modelled ones written (an absent
// coordinate is not modelled, never a default). Values are numbers, identifiers, quoted strings, quantities, lists in
// square brackets and maps in braces; structures stand inside `dom`. A number that does not round-trip through its
// unit exactly is written in SI with its dimension, so the text is lossless whatever the unit.

import { DIMLESS, parseUnit, type Dim } from '../units';
import { COMMUTATIVE, type C, type Coords, type E, type Op, type Q, type Structure } from './core';
import { unitOf } from './translate';

const OPS: ReadonlySet<string> = new Set<Op>(['part', 'kind', 'same', 'differ', 'embed', 'abstract', 'recurse', 'influence', 'invariant', 'constrain', 'approximate', 'quantity', 'function', 'state', 'compare', 'support', 'contradict', 'morphism', 'apply']);
const CONTEXTS: ReadonlySet<string> = new Set<C['kind']>(['world', 'assume', 'intervene', 'believe', 'branch', 'frame']);
/** The order keys are written in: the coordinates that say what a relation is before the ones that say how it is known; then the keys inside them. */
const KEY_ORDER = ['dir', 'polarity', 'necessity', 'strength', 'cert', 'time', 'scale', 'mech', 'dom', 'frame', 'ev', 'mode', 'under', 'against', 'margin', 'instrument',
  'kind', 'lo', 'hi', 'dist', 'type', 'params', 'source', 'sens', 'how', 'src', 'by', 'at', 'dur', 'phase', 'period', 'delay', 'charT', 'process', 'proper', 'order', 'after', 'before', 'window', 'L', 'T', 'E', 'res', 'model', 'observer', 'rest', 'dim', 'unit'];
/** Keys whose value is a word of the schema, written and read as it is (a mode may be `true`, which is not a boolean here). */
const WORD_KEYS: ReadonlySet<string> = new Set(['mode', 'how', 'kind', 'source', 'polarity', 'necessity', 'type', 'model']);
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/;
const PLAIN = /^[^\s()[\]{},|":][^\s()[\]{},|"]*$/;

// ---- writing

const num = (v: number): string => (Number.isNaN(v) ? 'NaN' : v === Infinity ? 'Infinity' : v === -Infinity ? '-Infinity' : String(v));
const ident = (s: string): string => (PLAIN.test(s) && !NUMBER.test(s) && !/^(NaN|-?Infinity|true|false|null)$/.test(s) ? s : JSON.stringify(s));
const isStructure = (v: unknown): v is Structure => !!v && typeof v === 'object' && 'k' in (v as object) && typeof (v as { k: unknown }).k === 'string' && 'DQRTECM'.includes((v as { k: string }).k);

/** A quantity's text: the number in its unit when that reads back exactly, else the SI number with its dimension. */
function qText(x: Q): string {
  const extra: Record<string, unknown> = {};
  if (x.cert) extra.cert = x.cert;
  if (x.scale) extra.scale = x.scale;
  let head: string;
  // no unit given: the SI symbol of its dimension when there is one (scale 1, so exact), else the number with its dimension
  const unit = x.unit ?? (x.dim.some((v) => v !== 0) && !unitOf(x.dim).startsWith('[') ? unitOf(x.dim) : undefined);
  if (unit) {
    const u = parseUnit(unit);
    const shown = (x.v - (u.offset ?? 0)) / u.scale;
    if (shown * u.scale + (u.offset ?? 0) === x.v && Number.isFinite(shown) && u.dim.every((v, i) => v === x.dim[i])) head = `${num(shown)}[${unit}]`;
    else { head = num(x.v); extra.dim = x.dim; if (x.unit) extra.unit = x.unit; }
  } else {
    head = num(x.v);
    if (x.dim.some((v) => v !== 0)) extra.dim = x.dim;
  }
  return Object.keys(extra).length ? `${head}${mapText(extra)}` : head;
}

function valueText(v: unknown, key?: string): string {
  if (typeof v === 'number') return num(v);
  if (typeof v === 'string') return key && WORD_KEYS.has(key) && PLAIN.test(v) ? v : ident(v);
  if (typeof v === 'boolean' || v === null) return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => valueText(x)).join(' ')}]`;
  if (isStructure(v)) return text(v);
  return mapText(v as Record<string, unknown>);
}

function mapText(o: Record<string, unknown>): string {
  const keys = Object.keys(o).filter((k) => o[k] !== undefined);
  keys.sort((a, b) => { const ia = KEY_ORDER.indexOf(a), ib = KEY_ORDER.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
  return `{${keys.map((k) => `${k}:${valueText(o[k], k)}`).join(' ')}}`;
}

const coordsText = (c: Coords | undefined): string => (c && Object.keys(c).some((k) => (c as Record<string, unknown>)[k] !== undefined) ? mapText(c as Record<string, unknown>) : '');

/** The compact text of a structure. */
export function text(s: Structure): string {
  switch (s.k) {
    case 'D': return ident(s.id);
    case 'Q': return qText(s);
    case 'R': return `${s.op}(${s.args.map(text).join(', ')})${coordsText(s.c)}`;
    case 'T': return `T(${text(s.from)}, ${text(s.to)}${s.cond?.length ? ` | ${s.cond.map(text).join(', ')}` : ''})${coordsText(s.c)}`;
    case 'E': { const o: Record<string, unknown> = { how: s.how, src: s.src }; if (s.by !== undefined) o.by = s.by; if (s.at) o.at = s.at; if (s.cert) o.cert = s.cert; return `E(${text(s.of)})${mapText(o)}`; }
    case 'C': return `C.${s.kind}(${ident(s.holder)}, ${text(s.body)})${coordsText(s.c)}`;
    case 'M': return `M(${ident(s.id)}, ${s.version}${s.args?.length ? `, ${s.args.map(text).join(', ')}` : ''})`;
  }
}

/** One line per structure. */
export const texts = (ss: Structure[]): string => ss.map(text).join('\n');

// ---- reading

type Value = number | string | boolean | null | Value[] | Structure | { [key: string]: Value } | Qv;
/** A number read with a unit or a dimension block: a quantity before it is placed. */
interface Qv { q: true; v: number; unit?: string; more: Record<string, Value> }

class Reader {
  i = 0;
  constructor(readonly src: string) {}
  fail(what: string): never { throw new Error(`Nex text: ${what} at ${this.i} in ${JSON.stringify(this.src.slice(Math.max(0, this.i - 12), this.i + 12))}`); }
  ws(): void { while (this.i < this.src.length && /\s/.test(this.src[this.i]!)) this.i++; }
  peek(): string { this.ws(); return this.src[this.i] ?? ''; }
  eat(ch: string): void { if (this.peek() !== ch) this.fail(`expected ${JSON.stringify(ch)}`); this.i++; }
  take(ch: string): boolean { if (this.peek() === ch) { this.i++; return true; } return false; }
  /** A bare word: everything up to a space or a bracket; or a quoted string. */
  word(): string {
    this.ws();
    if (this.src[this.i] === '"') {
      let j = this.i + 1;
      while (j < this.src.length && this.src[j] !== '"') { if (this.src[j] === '\\') j++; j++; }
      if (j >= this.src.length) this.fail('unterminated string');
      const out = JSON.parse(this.src.slice(this.i, j + 1)) as string;
      this.i = j + 1;
      return out;
    }
    const m = /^[^\s()[\]{},|"]+/.exec(this.src.slice(this.i));
    if (!m) this.fail('expected a word');
    this.i += m[0].length;
    return m[0];
  }
  key(): string {
    this.ws();
    const m = /^[A-Za-z_][A-Za-z0-9_]*(?=:)/.exec(this.src.slice(this.i));
    if (!m) this.fail('expected key:');
    this.i += m[0].length + 1;
    return m[0];
  }
  unit(): string { this.eat('['); const j = this.src.indexOf(']', this.i); if (j < 0) this.fail('unterminated unit'); const u = this.src.slice(this.i, j); this.i = j + 1; return u; }
  map(): Record<string, Value> {
    this.eat('{');
    const out: Record<string, Value> = {};
    while (this.peek() !== '}') { if (this.peek() === '') this.fail('unterminated map'); const k = this.key(); out[k] = WORD_KEYS.has(k) && this.peek() !== '"' && this.peek() !== '{' && this.peek() !== '[' ? this.word() : this.value(); }
    this.i++;
    return out;
  }
  list(): Value[] { this.eat('['); const out: Value[] = []; while (this.peek() !== ']') { if (this.peek() === '') this.fail('unterminated list'); out.push(this.value()); } this.i++; return out; }
  args(): Structure[] { const out: Structure[] = []; while (this.peek() !== ')' && this.peek() !== '|') { out.push(this.structure()); if (!this.take(',')) break; } return out; }
  /** A value: number (with unit or dimension, a quantity), quoted string, word, list, map, or a structure in call form. */
  value(): Value {
    const ch = this.peek();
    if (ch === '{') return this.map();
    if (ch === '[') return this.list();
    const quoted = ch === '"';
    const w = this.word();
    if (quoted) return w;
    if (NUMBER.test(w) || /^(NaN|-?Infinity)$/.test(w)) {
      const v = Number(w);
      const q: Qv = { q: true, v, more: {} };
      let marked = false;
      if (this.peek() === '[') { q.unit = this.unit(); marked = true; }
      if (this.peek() === '{') { q.more = this.map(); marked = true; }
      return marked ? q : v;
    }
    if (w === 'true') return true;
    if (w === 'false') return false;
    if (w === 'null') return null;
    if (this.peek() === '(') return this.call(w);
    return w;
  }
  call(head: string): Structure {
    this.eat('(');
    let out: Structure;
    if (head === 'T') {
      const from = this.structure(); this.eat(','); const to = this.structure();
      const cond = this.take('|') ? this.args() : undefined;
      this.eat(')');
      const c = this.peek() === '{' ? lowerCoords(this.map()) : {};
      out = cond ? { k: 'T', from, to, cond, c } : { k: 'T', from, to, c };
    } else if (head === 'E') {
      const of = this.structure(); this.eat(')');
      const o = this.map();
      const e: E = { k: 'E', of, how: o.how as E['how'], src: String(o.src ?? '') };
      if (o.by !== undefined) e.by = String(o.by);
      if (o.at !== undefined) e.at = lowerQ(o.at);
      if (o.cert !== undefined) e.cert = o.cert as unknown as E['cert'];
      out = e;
    } else if (head === 'M') {
      const id = this.word(); this.eat(','); const version = Number(this.word());
      const args = this.take(',') ? this.args() : [];
      this.eat(')');
      out = args.length ? { k: 'M', id, version, args } : { k: 'M', id, version };
    } else if (head.startsWith('C.')) {
      const kind = head.slice(2) as C['kind'];
      if (!CONTEXTS.has(kind)) this.fail(`no context kind ${kind}`);
      const holder = this.word(); this.eat(','); const body = this.structure(); this.eat(')');
      const c = this.peek() === '{' ? lowerCoords(this.map()) : undefined;
      out = c ? { k: 'C', kind, holder, body, c } : { k: 'C', kind, holder, body };
    } else {
      if (!OPS.has(head)) this.fail(`no operator ${head}`);
      const args = this.args(); this.eat(')');
      const c = this.peek() === '{' ? lowerCoords(this.map()) : {};
      out = { k: 'R', op: head as Op, args, c };
    }
    return out;
  }
  structure(): Structure {
    const v = this.value();
    return lowerStructure(v);
  }
}

/** A value in a structure's place: a word is a distinction, a number a quantity. */
function lowerStructure(v: Value): Structure {
  if (isStructure(v)) return v;
  if (typeof v === 'string') return { k: 'D', id: v };
  if (typeof v === 'number') return { k: 'Q', v, dim: [...DIMLESS] as Dim };
  if (v && typeof v === 'object' && 'q' in v && (v as Qv).q === true) return lowerQ(v);
  throw new Error(`Nex text: a ${Array.isArray(v) ? 'list' : typeof v} cannot stand as a structure`);
}

function lowerQ(v: Value): Q {
  if (isStructure(v) && v.k === 'Q') return v;
  if (typeof v === 'number') return { k: 'Q', v, dim: [...DIMLESS] as Dim };
  const x = v as Qv;
  if (!x || typeof x !== 'object' || x.q !== true) throw new Error('Nex text: expected a quantity');
  let out: Q;
  if (x.unit !== undefined) {
    const u = parseUnit(x.unit);
    out = { k: 'Q', v: x.v * u.scale + (u.offset ?? 0), dim: u.dim };
    if (x.unit) out.unit = x.unit;
  } else {
    out = { k: 'Q', v: x.v, dim: (x.more.dim as number[] | undefined)?.slice() as Dim ?? ([...DIMLESS] as Dim) };
    if (typeof x.more.unit === 'string') out.unit = x.more.unit;
  }
  if (x.more.cert) out.cert = x.more.cert as unknown as Q['cert'];
  if (x.more.scale) out.scale = lowerScale(x.more.scale as Record<string, Value>);
  return out;
}

const lowerScale = (o: Record<string, Value>): NonNullable<Q['scale']> => {
  const out: NonNullable<Q['scale']> = {};
  for (const k of ['L', 'T', 'E', 'res'] as const) if (o[k] !== undefined) out[k] = lowerQ(o[k]!);
  if (typeof o.model === 'string') out.model = o.model;
  return out;
};

/** Coordinates from a read map: quantities placed where the schema has them, structures under `dom`. */
function lowerCoords(o: Record<string, Value>): Coords {
  const c: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'dom') c.dom = (v as Value[]).map(lowerStructure);
    else if (k === 'strength') c.strength = typeof v === 'number' ? v : lowerQ(v);
    else if (k === 'time') { const tm = v as Record<string, Value>; const out: Record<string, unknown> = {}; for (const [tk, tv] of Object.entries(tm)) out[tk] = ['at', 'dur', 'phase', 'period', 'delay', 'charT', 'process'].includes(tk) ? lowerQ(tv) : tv; c.time = out; }
    else if (k === 'scale') c.scale = lowerScale(v as Record<string, Value>);
    else if (k === 'ev') { const ev = v as Record<string, Value>; const out: Record<string, unknown> = { how: ev.how }; if (ev.src !== undefined) out.src = ev.src; if (ev.at !== undefined) out.at = lowerQ(ev.at); c.ev = out; }
    else if (k === 'dir' || k === 'margin') c[k] = Number(v);
    else c[k] = v;
  }
  return c as Coords;
}

/** Read one structure from its text. */
export function read(src: string): Structure {
  const rd = new Reader(src);
  const s = rd.structure();
  if (rd.peek() !== '') rd.fail('text continues after the structure');
  return s;
}

/** Read one structure per non-empty line. */
export const readAll = (src: string): Structure[] => src.split('\n').map((l) => l.trim()).filter(Boolean).map(read);

/** The text with every distinction replaced by a numbered variable, in order of first appearance: the shape alone, for the hard test by eye. */
export function blind(s: Structure): string {
  const seen = new Map<string, string>();
  const name = (id: string) => { if (!seen.has(id)) seen.set(id, `$${seen.size + 1}`); return seen.get(id)!; };
  const walk = (x: Structure): Structure => {
    switch (x.k) {
      case 'D': return { k: 'D', id: name(x.id) };
      case 'Q': return x;
      case 'M': return x.args ? { ...x, args: x.args.map(walk) } : x;
      case 'E': return { ...x, of: walk(x.of), src: '…', ...(x.by ? { by: '…' } : {}) };
      case 'C': return { ...x, holder: name(x.holder), body: walk(x.body), ...(x.c ? { c: coords(x.c) } : {}) };
      case 'T': return { ...x, from: walk(x.from), to: walk(x.to), c: coords(x.c), ...(x.cond ? { cond: x.cond.map(walk) } : {}) };
      case 'R': return { k: 'R', op: x.op, args: COMMUTATIVE.has(x.op) ? x.args.map(walk) : x.args.map(walk), c: coords(x.c) };
    }
  };
  const coords = (c: Coords): Coords => {
    const out: Coords = { ...c };
    if (c.mech) out.mech = '…';
    if (c.dom) out.dom = c.dom.map(walk);
    if (c.frame) out.frame = { observer: name(c.frame.observer), ...(c.frame.rest ? { rest: name(c.frame.rest) } : {}) };
    if (c.ev) out.ev = { how: c.ev.how };
    if (c.under) out.under = c.under.map(() => '…');
    if (c.against) out.against = c.against.map(() => '…');
    if (c.instrument) out.instrument = '…';
    return out;
  };
  return text(walk(s));
}

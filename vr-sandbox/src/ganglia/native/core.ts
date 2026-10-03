// Nex: the language Ego thinks in. Not English, not a notation for English: a term algebra whose terms are structures
// of reality, with human languages as tuners on it (translate.ts). docs/EGO-NATIVE-LANGUAGE.md says why each piece is
// as it is; this file is the canonical machine representation (its section T), the normal form and the hash (U), the
// distance (V), the modes (F), the coordinates every operator carries (C, E, G to K) and the structural fingerprint (Q).
//
// Two primitives, and a coordinate schema. A distinction (D) is a thing told apart from others: an id and nothing else;
// its English name is an alias kept outside the hash. A relation (R) is an operator over structures with coordinates.
// Four faces of a relation are so common that they are their own node kinds for the type checker: a quantity (Q, a
// number with a dimension on a scale, the only leaf that carries numbers), a transformation (T, state to state under a
// condition), an evidence leaf (E, how a structure is known: sealed), a context (C, the scope a structure is held in:
// a world, an assumption, an intervention, an agent's belief, a frame). A morpheme reference (M) is an exact
// abbreviation of a larger structure (morpheme.ts): it expands before anything is compared.

import { parseUnit, type Dim } from '../units';

// ---- the modes a structure can be held in: not one NOT (section F)

/** How a structure stands: ten ways of not simply being so, each a different thing to do next. */
export type Mode =
  | 'true' | 'false'
  /** no term either way */
  | 'unknown'
  /** no evidence leaf reaches it, though one could */
  | 'unobserved'
  /** no structure for it yet: it cannot even be asked in these terms */
  | 'unmodelled'
  /** the admissible set is empty under named assumptions (carried in `under`) */
  | 'impossible-under'
  /** the structure's domain excludes the case */
  | 'outside-domain'
  /** a type error: no meaning (dimensions disagree, a frame is missing where one is needed) */
  | 'undefined'
  /** a term and a counter-term both exist (carried in `against`) */
  | 'contradictory'
  /** evidence exists but below the threshold asked (carried in `margin`) */
  | 'insufficient'
  /** measurable with a known instrument, not yet measured (carried in `instrument`) */
  | 'unmeasured';

// ---- how a structure is known (section J); ranked, and a translation may lower the rank, never raise it

export const EVIDENCE = ['theorem', 'derived', 'measured', 'calibrated', 'simulated', 'estimated', 'extrapolated', 'hypothesized', 'assumed', 'fictional'] as const;
export type Evidence = (typeof EVIDENCE)[number];
export const evidenceRank = (how: Evidence): number => EVIDENCE.indexOf(how);
/** The Nexus tier each kind of evidence enters at (docs/NEXUS.md §F). */
export const TIER_OF: Record<Evidence, 0 | 1 | 2 | 3 | 4 | 5> = { theorem: 0, derived: 0, simulated: 1, measured: 3, calibrated: 3, estimated: 3, extrapolated: 3, hypothesized: 4, assumed: 4, fictional: 5 };

// ---- uncertainty (section K): intrinsic, not bolted on

export interface Uncertainty {
  kind: 'exact' | 'interval' | 'distribution' | 'systematic' | 'unknown';
  lo?: number;
  hi?: number;
  dist?: { type: string; params: number[] };
  /** Epistemic (could be reduced by knowing more) or aleatory (the world's own spread), or both. */
  source?: 'epistemic' | 'aleatory' | 'mixed';
  /** Sensitivity of the quantity to named inputs, d(this)/d(input), by input id. */
  sens?: Record<string, number>;
}

// ---- the leaves and nodes

/** A quantity: a number in SI with its dimension; the only leaf that carries a number. */
/** `unit` is the spelling it was given (N m rather than J for a torque): a surface detail, outside the hash. */
export interface Q { k: 'Q'; v: number; dim: Dim; unit?: string; cert?: Uncertainty; scale?: Scale }

/** Time morphology (section G): richer than tense. Every field a quantity of dimension time, or an ordering. */
export interface Time {
  at?: Q; dur?: Q; phase?: Q; period?: Q; delay?: Q; charT?: Q; process?: Q;
  /** The frame whose clock this is (proper time). */
  proper?: string;
  /** Ordering by hashes or ids of other structures: what this comes after and before (causal order is a partial order). */
  order?: { after?: string[]; before?: string[] };
  /** Uncertainty interval of the event time, s. */
  window?: [number, number];
}

/** Scale morphology (section H): a statement valid at a metre does not become universal. */
export interface Scale { L?: Q; T?: Q; E?: Q; res?: Q; model?: string }

/** Reference frame (section I): who observes, and what is at rest. */
export interface Frame { observer: string; rest?: string }

/** Evidence coordinate: how a structure is known and from where. */
export interface Ev { how: Evidence; src?: string[]; at?: Q }

/** The coordinates every operator may carry (section C): absent means not modelled, never a default. */
export interface Coords {
  /** Direction: from the first argument to the second (1), the reverse (−1), undirected (0). */
  dir?: 1 | -1 | 0;
  /** For an influence: raises (+) or lowers (−) the second argument. */
  polarity?: '+' | '-';
  /** For an influence: sufficient, necessary, or one contribution among others. */
  necessity?: 'sufficient' | 'necessary' | 'contributing';
  /** Effect size, 0 to 1 when dimensionless, else a quantity. */
  strength?: number | Q;
  cert?: Uncertainty;
  time?: Time;
  scale?: Scale;
  /** The transformation that mediates (a hash or an id). */
  mech?: string;
  /** Where it holds: constraints that must be satisfied. */
  dom?: Structure[];
  frame?: Frame;
  ev?: Ev;
  mode?: Mode;
  /** Carried by the modes that need them. */
  under?: string[];
  against?: string[];
  margin?: number;
  instrument?: string;
}

/** The operators (section C): compositional, each with the coordinates above. */
export type Op =
  // structure
  | 'part' | 'kind' | 'same' | 'differ' | 'embed' | 'abstract' | 'recurse'
  // transformation and cause
  | 'influence' | 'invariant' | 'constrain' | 'approximate'
  // a thing bound to a quantity, a thing's function, a bundle of relations as one state
  | 'quantity' | 'function' | 'state'
  // epistemic, computed never asserted
  | 'compare' | 'support' | 'contradict'
  // a map between theories with a contract
  | 'morphism';

/** Which operators do not care about the order of their arguments. */
export const COMMUTATIVE: ReadonlySet<Op> = new Set<Op>(['same', 'differ', 'state', 'contradict']);
/** Which operators need a reference frame to mean anything (section I): without one the structure is undefined. */
export const NEEDS_FRAME: ReadonlySet<string> = new Set(['motion', 'velocity', 'position', 'rest', 'speed', 'qty.velocity', 'qty.speed', 'qty.momentum', 'qty.acceleration']);

export interface D { k: 'D'; id: string; aliases?: Record<string, string> }
export interface R { k: 'R'; op: Op; args: Structure[]; c: Coords }
export interface T { k: 'T'; from: Structure; to: Structure; cond?: Structure[]; c: Coords }
export interface E { k: 'E'; of: Structure; how: Evidence; src: string; by?: string; at?: Q; cert?: Uncertainty }
export interface C { k: 'C'; kind: 'world' | 'assume' | 'intervene' | 'believe' | 'branch' | 'frame'; holder: string; body: Structure; c?: Coords }
export interface M { k: 'M'; id: string; version: number; args?: Structure[] }
export type Structure = D | Q | R | T | E | C | M;

// ---- construction

export const d = (id: string, aliases?: Record<string, string>): D => (aliases ? { k: 'D', id, aliases } : { k: 'D', id });
export const q = (v: number, unit: string, cert?: Uncertainty, scale?: Scale): Q => {
  const u = parseUnit(unit);
  const out: Q = { k: 'Q', v: v * u.scale + (u.offset ?? 0), dim: u.dim };
  if (unit) out.unit = unit;
  if (cert) out.cert = cert;
  if (scale) out.scale = scale;
  return out;
};
export const r = (op: Op, args: Structure[], c: Coords = {}): R => ({ k: 'R', op, args, c });
export const t = (from: Structure, to: Structure, c: Coords = {}, cond?: Structure[]): T => (cond ? { k: 'T', from, to, cond, c } : { k: 'T', from, to, c });
export const e = (of: Structure, how: Evidence, src: string, more: Partial<Omit<E, 'k' | 'of' | 'how' | 'src'>> = {}): E => ({ k: 'E', of, how, src, ...more });
export const ctx = (kind: C['kind'], holder: string, body: Structure, c?: Coords): C => (c ? { k: 'C', kind, holder, body, c } : { k: 'C', kind, holder, body });
export const m = (id: string, version: number, args?: Structure[]): M => (args ? { k: 'M', id, version, args } : { k: 'M', id, version });

/** A thing with a stateful and a transformational face at once (section D): objects and processes are projections of it. */
export interface STS { self: D; state: R[]; transitions: T[] }
export const sts = (self: D, state: R[], transitions: T[]): STS => ({ self, state, transitions });
export const objectView = (s: STS): Structure[] => s.state;
export const processView = (s: STS): Structure[] => s.transitions;

// ---- normal form and hash (sections T, U)

export type Expand = (ref: M) => Structure;

/** The canonical form: morphemes expanded, commutative arguments sorted, aliases dropped, coordinates without holes. */
export function normalize(s: Structure, expand?: Expand): Structure {
  switch (s.k) {
    case 'D': return { k: 'D', id: s.id };
    case 'Q': return s;
    case 'M': {
      if (!expand) throw new Error(`morpheme ${s.id} v${s.version} cannot be expanded here`);
      return normalize(expand(s), expand);
    }
    case 'E': { const out: E = { ...s, of: normalize(s.of, expand) }; return out; }
    case 'C': return { ...s, body: normalize(s.body, expand) };
    case 'T': { const out: T = { k: 'T', from: normalize(s.from, expand), to: normalize(s.to, expand), c: cleanCoords(s.c, expand) }; if (s.cond) out.cond = s.cond.map((x) => normalize(x, expand)); return out; }
    case 'R': {
      const args = s.args.map((x) => normalize(x, expand));
      if (COMMUTATIVE.has(s.op)) args.sort((a, b) => canonical(a).localeCompare(canonical(b)));
      return { k: 'R', op: s.op, args, c: cleanCoords(s.c, expand) };
    }
  }
}

function cleanCoords(c: Coords, expand?: Expand): Coords {
  const out: Coords = {};
  for (const [key, value] of Object.entries(c)) {
    if (value === undefined) continue;
    if (key === 'dom') (out as Record<string, unknown>)[key] = (value as Structure[]).map((x) => normalize(x, expand));
    else (out as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** Deterministic text of a structure: sorted keys, numbers as written by JSON. The hash is taken over it. */
export function canonical(s: unknown): string {
  if (s === null || typeof s !== 'object') return JSON.stringify(s);
  if (Array.isArray(s)) return `[${s.map(canonical).join(',')}]`;
  const o = s as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined && k !== 'aliases' && k !== 'unit').sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`).join(',')}}`;
}

/** A content hash of the canonical text (FNV-1a over two lanes, 16 hex digits). Labels do not enter it. */
export function hash(s: Structure, expand?: Expand): string {
  const text = canonical(normalize(s, expand));
  let a = 0x811c9dc5, b = 0x01000193 ^ 0x9e3779b9;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    a = Math.imul(a ^ ch, 0x01000193) >>> 0;
    b = Math.imul(b ^ ((ch * 31) & 0xffff), 0x01000193) >>> 0;
  }
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** Semantic equality: the same canonical form once every surface difference is normalised away. */
export const equivalent = (a: Structure, b: Structure, expand?: Expand): boolean => hash(a, expand) === hash(b, expand);

// ---- shape tokens, fingerprints, distance (sections Q, V)

/** The shape of a structure as a multiset of tokens with no label in them: what operators, over what kinds, with what coordinates and dimensions. */
export function tokens(s: Structure, out: string[] = [], depth = 0, self?: string): string[] {
  const kindOf = (x: Structure): string => (x.k === 'D' ? (self && x.id === self ? 'SELF' : 'D') : x.k === 'Q' ? `Q${x.dim.join('')}` : x.k === 'R' ? `R.${x.op}` : x.k === 'T' ? 'T' : x.k === 'E' ? `E.${x.how}` : x.k === 'C' ? `C.${x.kind}` : 'M');
  const coordTokens = (c: Coords | undefined, head: string) => {
    if (!c) return;
    for (const key of Object.keys(c).sort()) {
      const v = (c as Record<string, unknown>)[key];
      if (v === undefined) continue;
      if (key === 'polarity' || key === 'necessity' || key === 'mode' || key === 'dir') out.push(`${head}.${key}=${String(v)}`);
      else if (key === 'ev') out.push(`${head}.ev=${(v as Ev).how}`);
      else if (key === 'strength' && typeof v === 'number') out.push(`${head}.strength=${v >= 0.67 ? 'high' : v >= 0.33 ? 'mid' : 'low'}`);
      else out.push(`${head}.${key}`);
    }
  };
  switch (s.k) {
    case 'D': out.push(self && s.id === self ? 'SELF' : 'D'); break;
    case 'Q': out.push(`Q${s.dim.join('')}`); if (s.cert) out.push(`Q.cert=${s.cert.kind}`); break;
    case 'M': out.push(`M`); break;
    case 'E': out.push(`E.${s.how}`); tokens(s.of, out, depth + 1, self); break;
    case 'C': out.push(`C.${s.kind}`); tokens(s.body, out, depth + 1, self); coordTokens(s.c, `C.${s.kind}`); break;
    case 'T': out.push(`T(${kindOf(s.from)}>${kindOf(s.to)})`); coordTokens(s.c, 'T'); tokens(s.from, out, depth + 1, self); tokens(s.to, out, depth + 1, self); for (const x of s.cond ?? []) tokens(x, out, depth + 1, self); break;
    case 'R': {
      const head = `R.${s.op}(${s.args.map(kindOf).join(',')})`;
      out.push(head);
      coordTokens(s.c, `R.${s.op}`);
      for (const x of s.args) tokens(x, out, depth + 1, self);
      break;
    }
  }
  return out;
}

/** A concept's fingerprint: the shape of everything said of it, with the concept itself marked and every other label gone. */
export function fingerprint(self: string, said: Structure[]): Map<string, number> {
  const fp = new Map<string, number>();
  for (const s of said) for (const tk of tokens(s, [], 0, self)) fp.set(tk, (fp.get(tk) ?? 0) + 1);
  return fp;
}

/** Weighted Jaccard distance between two token multisets: 0 the same shape, 1 nothing shared. */
export function distance(a: Map<string, number>, b: Map<string, number>): number {
  let inter = 0, union = 0;
  for (const k of new Set([...a.keys(), ...b.keys()])) { const x = a.get(k) ?? 0, y = b.get(k) ?? 0; inter += Math.min(x, y); union += Math.max(x, y); }
  return union === 0 ? 0 : 1 - inter / union;
}

/** Distance between two structures: their shapes, then how far the coordinates both carry are apart. */
export function structureDistance(a: Structure, b: Structure, expand?: Expand): number {
  const ta = new Map<string, number>(), tb = new Map<string, number>();
  for (const k of tokens(normalize(a, expand))) ta.set(k, (ta.get(k) ?? 0) + 1);
  for (const k of tokens(normalize(b, expand))) tb.set(k, (tb.get(k) ?? 0) + 1);
  const shape = distance(ta, tb);
  const ca = a.k === 'R' || a.k === 'T' ? a.c : undefined, cb = b.k === 'R' || b.k === 'T' ? b.c : undefined;
  let numeric = 0, n = 0;
  if (ca && cb) {
    if (typeof ca.strength === 'number' && typeof cb.strength === 'number') { numeric += Math.abs(ca.strength - cb.strength); n++; }
    if (ca.cert?.lo !== undefined && ca.cert.hi !== undefined && cb.cert?.lo !== undefined && cb.cert.hi !== undefined) {
      const overlap = Math.max(0, Math.min(ca.cert.hi, cb.cert.hi) - Math.max(ca.cert.lo, cb.cert.lo)), span = Math.max(ca.cert.hi, cb.cert.hi) - Math.min(ca.cert.lo, cb.cert.lo);
      numeric += span > 0 ? 1 - overlap / span : 0; n++;
    }
  }
  return n ? 0.7 * shape + 0.3 * (numeric / n) : shape;
}

/** Group concepts whose fingerprints lie within `eps` of a cluster's first member. */
export function cluster(fps: Map<string, Map<string, number>>, eps: number): string[][] {
  const groups: { seed: Map<string, number>; ids: string[] }[] = [];
  for (const [id, fp] of fps) {
    const g = groups.find((x) => distance(x.seed, fp) <= eps);
    if (g) g.ids.push(id); else groups.push({ seed: fp, ids: [id] });
  }
  return groups.map((g) => g.ids);
}

// ---- renaming: the hard test's instrument (section Y)

/** The same structure with every distinction renamed by a map: meaning must survive this, or the language has failed. */
export function rename(s: Structure, map: (id: string) => string): Structure {
  const coords = (c: Coords): Coords => ({ ...c, ...(c.mech ? { mech: map(c.mech) } : {}), ...(c.dom ? { dom: c.dom.map((x) => rename(x, map)) } : {}), ...(c.frame ? { frame: { observer: map(c.frame.observer), ...(c.frame.rest ? { rest: map(c.frame.rest) } : {}) } } : {}) });
  switch (s.k) {
    case 'D': return { k: 'D', id: map(s.id) };
    case 'Q': return s;
    case 'M': return s.args ? { ...s, args: s.args.map((x) => rename(x, map)) } : s;
    case 'E': return { ...s, of: rename(s.of, map), src: map(s.src), ...(s.by ? { by: map(s.by) } : {}) };
    case 'C': return { ...s, holder: map(s.holder), body: rename(s.body, map), ...(s.c ? { c: coords(s.c) } : {}) };
    case 'T': return { ...s, from: rename(s.from, map), to: rename(s.to, map), c: coords(s.c), ...(s.cond ? { cond: s.cond.map((x) => rename(x, map)) } : {}) };
    case 'R': return { k: 'R', op: s.op, args: s.args.map((x) => rename(x, map)), c: coords(s.c) };
  }
}

// ---- reasoning over structures with coordinates (section B's point: the operators compose)

/** Chain two influences A→B and B→C into A→C: strengths multiply, certainty narrows to the weaker, delays add, polarity multiplies. */
export function chain(ab: R, bc: R): R | null {
  if (ab.op !== 'influence' || bc.op !== 'influence') return null;
  const [a, b1] = ab.args, [b2, c] = bc.args;
  if (!a || !b1 || !b2 || !c || hash(b1) !== hash(b2)) return null;
  // strengths multiply where both are known; one unknown leaves the chain's unknown (not modelled, never a default)
  const out: Coords = { dir: 1 };
  if (typeof ab.c.strength === 'number' && typeof bc.c.strength === 'number') out.strength = ab.c.strength * bc.c.strength;
  if (ab.c.polarity && bc.c.polarity) out.polarity = ab.c.polarity === bc.c.polarity ? '+' : '-';
  const lo = Math.min(ab.c.cert?.lo ?? 1, bc.c.cert?.lo ?? 1), hi = Math.min(ab.c.cert?.hi ?? 1, bc.c.cert?.hi ?? 1);
  if (ab.c.cert || bc.c.cert) out.cert = { kind: 'interval', lo, hi, source: 'epistemic' };
  const d1 = ab.c.time?.delay?.v, d2 = bc.c.time?.delay?.v;
  if (d1 !== undefined || d2 !== undefined) out.time = { delay: { k: 'Q', v: (d1 ?? 0) + (d2 ?? 0), dim: [0, 0, 1, 0, 0] } };
  if (ab.c.necessity === 'necessary' && bc.c.necessity === 'necessary') out.necessity = 'necessary';
  else if (ab.c.necessity === 'sufficient' && bc.c.necessity === 'sufficient') out.necessity = 'sufficient';
  else if (ab.c.necessity || bc.c.necessity) out.necessity = 'contributing';
  const ev1 = ab.c.ev?.how, ev2 = bc.c.ev?.how;
  if (ev1 && ev2) out.ev = { how: evidenceRank(ev1) >= evidenceRank(ev2) ? ev1 : ev2 };
  else if (ev1 || ev2) out.ev = { how: (ev1 ?? ev2)! };
  out.mech = `${hash(ab)}>${hash(bc)}`;
  return r('influence', [a, c], out);
}

/** Two structures that say opposite things of the same arguments: a contradiction held, not resolved (section R of the request). */
export function contradiction(a: R, b: R): R | null {
  if (a.op !== b.op || a.args.length !== b.args.length) return null;
  if (!a.args.every((x, i) => hash(x) === hash(b.args[i]!))) return null;
  const opposite = (a.c.polarity && b.c.polarity && a.c.polarity !== b.c.polarity) || (a.c.mode === 'true' && b.c.mode === 'false') || (a.c.mode === 'false' && b.c.mode === 'true');
  if (!opposite) return null;
  return r('contradict', [a, b], { mode: 'contradictory', against: [hash(a), hash(b)] });
}

/** Whether a structure can mean anything: dimensions must agree where two quantities are compared, and a frame must be given where one is needed. */
export function wellFormed(s: Structure): { ok: true } | { ok: false; mode: Mode; why: string } {
  if (s.k === 'R') {
    if (s.op === 'compare' || s.op === 'same' || s.op === 'approximate') {
      const qs = s.args.filter((x): x is Q => x.k === 'Q');
      if (qs.length === 2 && qs[0]!.dim.some((v, i) => v !== qs[1]!.dim[i])) return { ok: false, mode: 'undefined', why: 'the two quantities have different dimensions' };
    }
    if (s.op === 'quantity') {
      const what = s.args[1];
      if (what?.k === 'D' && NEEDS_FRAME.has(what.id) && !s.c.frame) return { ok: false, mode: 'undefined', why: `${what.id} means nothing without a reference frame` };
    }
    for (const x of s.args) { const w = wellFormed(x); if (!w.ok) return w; }
  }
  if (s.k === 'T') { for (const x of [s.from, s.to, ...(s.cond ?? [])]) { const w = wellFormed(x); if (!w.ok) return w; } }
  if (s.k === 'C') return wellFormed(s.body);
  return { ok: true };
}

/** The support of a structure: what it rests on, as a tree of hashes and evidence, with no label in it (section X: WHY). */
export function why(s: Structure, depth = 0): string[] {
  const line = (x: string) => `${'  '.repeat(depth)}${x}`;
  switch (s.k) {
    case 'E': return [line(`evidence ${s.how} #${hash(s)}`), ...why(s.of, depth + 1)];
    case 'C': return [line(`in ${s.kind} #${hash(s)}`), ...why(s.body, depth + 1)];
    case 'T': return [line(`transform #${hash(s)}${s.c.ev ? ` (${s.c.ev.how})` : ''}`), ...why(s.from, depth + 1), ...why(s.to, depth + 1)];
    case 'R': return [line(`${s.op} #${hash(s)}${s.c.ev ? ` (${s.c.ev.how})` : ''}${s.c.mode && s.c.mode !== 'true' ? ` [${s.c.mode}]` : ''}`), ...s.args.flatMap((x) => why(x, depth + 1))];
    case 'Q': return [line(`quantity ${s.v} dim ${s.dim.join('')}`)];
    case 'D': return [line(`distinction #${hash(s)}`)];
    case 'M': return [line(`morpheme ${s.id} v${s.version}`)];
  }
}

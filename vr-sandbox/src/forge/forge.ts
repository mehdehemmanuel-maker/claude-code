// Forge: the build language. One line is one thing a builder does, in the words a builder uses:
//
//   place lumber size=2x4 length=1.2m mat douglas-fir at 0 0.9 0 as rail
//   place block x=10cm y=10cm z=10cm at 0 0.05 0 as post
//   join rail post                 # Best join: the process that holds these materials, sized to them
//   join post floor with bolted
//   set rail length=1.5m           # parameters, with units: mm cm m, g kg, N kN, % deg
//   repeat 4 { place block at (i*0.3) 0.05 0 as leg }     # i counts 0..3; names get the count: leg0..leg3
//   play · build · undo · redo · save · new · switch on|off · gravity earth|moon|zero
//
// Every statement runs through the same code paths as the tools in the headset, so a script and a pair of hands
// build exactly the same thing, obeying the same physics. Scripts are how builds are repeated, shared, generated in
// bulk and (by the assistant) proposed.

export type Value = { num: number } | { word: string } | { expr: string };

export type Ref = string; // a name, a part id, or: this (selected), held, last, floor

export type Stmt =
  | { op: 'place'; line: number; kind: string; params: Record<string, Value>; material?: string; at?: [Value, Value, Value]; rot: { axis: 'x' | 'y' | 'z'; angle: Value }[]; name?: string }
  | { op: 'join'; line: number; a: Ref; b: Ref; with?: string }
  | { op: 'set'; line: number; ref: Ref; params: Record<string, Value>; material?: string }
  | { op: 'delete' | 'freeze' | 'unfreeze' | 'select'; line: number; ref: Ref }
  | { op: 'repeat'; line: number; count: Value; body: Stmt[] }
  | { op: 'do'; line: number; command: SimCommand };

export type SimCommand = 'play' | 'build' | 'undo' | 'redo' | 'save' | 'new' | 'switch on' | 'switch off' | 'gravity earth' | 'gravity moon' | 'gravity zero';

export class ForgeError extends Error {
  constructor(message: string, readonly line: number) {
    super(`line ${line}: ${message}`);
  }
}

// ---- units ---------------------------------------------------------------------------------------

const UNITS: Record<string, number> = {
  mm: 1e-3, cm: 1e-2, m: 1, km: 1e3, g: 1e-3, kg: 1, t: 1e3, n: 1, kn: 1e3, '%': 0.01, deg: Math.PI / 180, rad: 1, s: 1, ms: 1e-3,
};

/** A number with an optional unit suffix, in SI; null if the text isn't one. */
export function quantity(text: string): number | null {
  const m = /^(-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?)([a-z%]*)$/i.exec(text);
  if (!m) return null;
  const unit = m[2]!.toLowerCase();
  if (unit && !(unit in UNITS)) return null;
  return Number(m[1]) * (unit ? UNITS[unit]! : 1);
}

// ---- arithmetic (no eval: numbers with units, the loop counter, + - * / and parentheses) -----------

export function evaluate(expr: string, vars: Record<string, number>, line: number): number {
  let i = 0;
  const s = expr.replace(/\s+/g, '');
  const fail = (msg: string): never => { throw new ForgeError(`${msg} in (${expr})`, line); };
  const atom = (): number => {
    if (s[i] === '(') { i++; const v = sum(); if (s[i] !== ')') fail('missing )'); i++; return v; }
    if (s[i] === '-') { i++; return -atom(); }
    const m = /^(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?[a-z%]*|^[a-z_][a-z0-9_]*/i.exec(s.slice(i));
    if (!m) return fail('expected a number');
    i += m[0].length;
    const q = quantity(m[0]);
    if (q !== null) return q;
    if (m[0] in vars) return vars[m[0]]!;
    return fail(`unknown value ${m[0]}`);
  };
  const product = (): number => {
    let v = atom();
    while (s[i] === '*' || s[i] === '/') { const op = s[i++]; const r = atom(); v = op === '*' ? v * r : v / r; }
    return v;
  };
  const sum = (): number => {
    let v = product();
    while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const r = product(); v = op === '+' ? v + r : v - r; }
    return v;
  };
  const v = sum();
  if (i !== s.length) fail(`unexpected ${s[i]}`);
  if (!Number.isFinite(v)) fail('not a finite number');
  return v;
}

export function valueOf(v: Value, vars: Record<string, number>, line: number): number | string {
  if ('num' in v) return v.num;
  if ('expr' in v) return evaluate(v.expr, vars, line);
  return v.word;
}

// ---- parsing ----------------------------------------------------------------------------------------

interface Tok { t: string; line: number }

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let line = 1;
  let i = 0;
  while (i < src.length) {
    const c = src[i]!;
    if (c === '\n') { out.push({ t: ';', line }); line++; i++; continue; }
    if (c === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/\s/.test(c)) { i++; continue; }
    if (c === ';' || c === '{' || c === '}' || c === '·') { out.push({ t: c === '·' ? ';' : c, line }); i++; continue; }
    if (c === '(') {
      let depth = 0, j = i;
      for (; j < src.length; j++) { if (src[j] === '(') depth++; else if (src[j] === ')' && --depth === 0) break; else if (src[j] === '\n') break; }
      if (src[j] !== ')') throw new ForgeError('missing )', line);
      out.push({ t: src.slice(i, j + 1), line });
      i = j + 1;
      continue;
    }
    let j = i;
    while (j < src.length && !/[\s;{}#]/.test(src[j]!) && src[j] !== '·') {
      if (src[j] === '(') { // key=(expr)
        let depth = 0;
        for (; j < src.length; j++) { if (src[j] === '(') depth++; else if (src[j] === ')' && --depth === 0) { j++; break; } }
        continue;
      }
      j++;
    }
    out.push({ t: src.slice(i, j), line });
    i = j;
  }
  return out;
}

function toValue(text: string, line: number): Value {
  if (text.startsWith('(')) return { expr: text.slice(1, -1) };
  const q = quantity(text);
  if (q !== null) return { num: q };
  // a number followed only by letters is a quantity with a unit we don't know; 2x4 or M8 are words
  if (/^-?(?:\d+\.?\d*|\.\d+)[a-z%]+$/i.test(text)) throw new ForgeError(`not a number with a known unit: ${text}`, line);
  return { word: text };
}

const COMMANDS: SimCommand[] = ['play', 'build', 'undo', 'redo', 'save', 'new'];

export function parse(src: string): Stmt[] {
  const toks = tokenize(src);
  let k = 0;
  const peek = () => toks[k];
  const next = () => toks[k++];
  const lineOf = () => (toks[Math.min(k, toks.length - 1)]?.line ?? 1);
  const endOfStmt = () => !peek() || peek()!.t === ';' || peek()!.t === '}';
  const word = (what: string): string => {
    const t = next();
    if (!t || t.t === ';' || t.t === '{' || t.t === '}') throw new ForgeError(`expected ${what}`, t?.line ?? lineOf());
    return t.t;
  };
  const params = (into: Record<string, Value>, t: Tok) => {
    const eq = t.t.indexOf('=');
    if (eq <= 0) return false;
    into[t.t.slice(0, eq)] = toValue(t.t.slice(eq + 1), t.line);
    return true;
  };

  const block = (inner: boolean): Stmt[] => {
    const out: Stmt[] = [];
    while (k < toks.length) {
      const t = peek()!;
      if (t.t === ';') { k++; continue; }
      if (t.t === '}') { if (!inner) throw new ForgeError('unexpected }', t.line); k++; return out; }
      out.push(statement());
      if (!endOfStmt()) throw new ForgeError(`unexpected ${peek()!.t}`, peek()!.line);
    }
    if (inner) throw new ForgeError('missing } to close repeat', lineOf());
    return out;
  };

  const statement = (): Stmt => {
    const t = next()!;
    const line = t.line;
    const verb = t.t.toLowerCase();
    switch (verb) {
      case 'place': case 'add': {
        const s: Extract<Stmt, { op: 'place' }> = { op: 'place', line, kind: word('a part kind'), params: {}, rot: [] };
        while (!endOfStmt()) {
          const u = next()!;
          const w = u.t.toLowerCase();
          if (params(s.params, u)) continue;
          if (w === 'mat' || w === 'material' || w === 'of') s.material = word('a material');
          else if (w === 'at') s.at = [toValue(word('x'), line), toValue(word('y'), line), toValue(word('z'), line)];
          else if (w === 'rot' || w === 'turn') {
            const axis = word('an axis (x, y or z)').toLowerCase();
            if (axis !== 'x' && axis !== 'y' && axis !== 'z') throw new ForgeError(`rotate about x, y or z, not ${axis}`, line);
            const a = word('an angle');
            s.rot.push({ axis, angle: toValue(/^-?[\d.]+$/.test(a) ? `${a}deg` : a, line) });
          } else if (w === 'as' || w === 'named') s.name = word('a name');
          else throw new ForgeError(`don't know "${u.t}" in place (try key=value, mat, at, rot, as)`, u.line);
        }
        return s;
      }
      case 'join': case 'connect': case 'attach': {
        const a = word('the first part');
        let b = word('the second part (or floor)');
        if (b.toLowerCase() === 'to' || b.toLowerCase() === 'and') b = word('the second part (or floor)');
        const s: Extract<Stmt, { op: 'join' }> = { op: 'join', line, a, b };
        if (!endOfStmt()) {
          const w = word('with').toLowerCase();
          if (w !== 'with' && w !== 'by' && w !== 'using') throw new ForgeError(`expected "with <joint>", not ${w}`, line);
          s.with = word('a joint kind');
        }
        return s;
      }
      case 'set': {
        const s: Extract<Stmt, { op: 'set' }> = { op: 'set', line, ref: word('a part'), params: {} };
        while (!endOfStmt()) {
          const u = next()!;
          if (params(s.params, u)) continue;
          const w = u.t.toLowerCase();
          if (w === 'mat' || w === 'material') s.material = word('a material');
          else throw new ForgeError(`don't know "${u.t}" in set (try key=value or mat)`, u.line);
        }
        return s;
      }
      case 'delete': case 'remove': case 'freeze': case 'unfreeze': case 'select':
        return { op: verb === 'remove' ? 'delete' : (verb as 'delete' | 'freeze' | 'unfreeze' | 'select'), line, ref: word('a part') };
      case 'repeat': {
        const count = toValue(word('how many times'), line);
        const open = next();
        if (open?.t !== '{') throw new ForgeError('repeat needs { ... }', line);
        return { op: 'repeat', line, count, body: block(true) };
      }
      case 'switch': {
        const w = word('on or off').toLowerCase();
        if (w !== 'on' && w !== 'off') throw new ForgeError('switch on, or switch off', line);
        return { op: 'do', line, command: `switch ${w}` };
      }
      case 'gravity': {
        const w = word('earth, moon or zero').toLowerCase();
        if (w !== 'earth' && w !== 'moon' && w !== 'zero') throw new ForgeError('gravity earth, moon or zero', line);
        return { op: 'do', line, command: `gravity ${w}` };
      }
      default:
        if ((COMMANDS as string[]).includes(verb)) return { op: 'do', line, command: verb as SimCommand };
        throw new ForgeError(`don't know how to "${t.t}" (place, join, set, delete, freeze, repeat, play, build, undo, save…)`, line);
    }
  };
  return block(false);
}

// ---- running ------------------------------------------------------------------------------------------

/** What Forge acts on: the app in the headset, or a bare document in tests. */
export interface ForgeHost {
  /** Resolve a word to a part kind id, and a material for it (null: the kind's default), or throw with a reason. */
  kind(word: string): string;
  material(kind: string, word: string | undefined): string;
  place(kind: string, params: Record<string, number | string>, material: string, at: [number, number, number] | null, rot: { axis: 'x' | 'y' | 'z'; angle: number }[], name: string | undefined): string;
  /** Join two parts (b null: the floor) where they touch. */
  join(a: string, b: string | null, kind: string | undefined): string;
  set(id: string, params: Record<string, number | string>, material: string | undefined): void;
  remove(id: string): void;
  freeze(id: string, frozen: boolean): void;
  select(id: string): void;
  command(c: SimCommand): string;
  /** A part by name or id, or this / held / last. */
  find(ref: string): string | null;
}

export interface RunResult {
  ok: boolean;
  /** What happened, a line per statement that did something. */
  lines: string[];
  error?: string;
  /** Statements run (a repeat counts each pass). */
  steps: number;
}

/** A loop can't run away with the headset: at most this many statements per run, and this many parts. */
export const MAX_STEPS = 2000;
export const MAX_PARTS = 400;

export function run(src: string, host: ForgeHost): RunResult {
  const lines: string[] = [];
  let steps = 0, parts = 0;
  try {
    const prog = parse(src);
    const vars: Record<string, number> = {};
    const exec = (stmts: Stmt[], suffix: string) => {
      for (const s of stmts) {
        if (++steps > MAX_STEPS) throw new ForgeError(`stopped after ${MAX_STEPS} steps`, s.line);
        const num = (v: Value) => { const x = valueOf(v, vars, s.line); if (typeof x !== 'number') throw new ForgeError(`expected a number, got ${x}`, s.line); return x; };
        const vals = (p: Record<string, Value>) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, valueOf(v, vars, s.line)]));
        const part = (ref: string) => {
          const id = host.find(ref) ?? host.find(`${ref}${suffix}`);
          if (!id) throw new ForgeError(ref === 'this' ? 'nothing is selected' : ref === 'held' ? 'nothing is held' : `no part called ${ref}`, s.line);
          return id;
        };
        switch (s.op) {
          case 'place': {
            if (++parts > MAX_PARTS) throw new ForgeError(`stopped after ${MAX_PARTS} parts`, s.line);
            const kind = host.kind(s.kind);
            const id = host.place(kind, vals(s.params), host.material(kind, s.material), s.at ? [num(s.at[0]), num(s.at[1]), num(s.at[2])] : null,
              s.rot.map((r) => ({ axis: r.axis, angle: num(r.angle) })), s.name ? `${s.name}${suffix}` : undefined);
            lines.push(`placed ${s.name ? `${s.name}${suffix}` : kind} (${id})`);
            break;
          }
          case 'join': {
            const floor = s.b.toLowerCase() === 'floor' || s.b.toLowerCase() === 'ground';
            lines.push(host.join(part(s.a), floor ? null : part(s.b), s.with));
            break;
          }
          case 'set': host.set(part(s.ref), vals(s.params), s.material); lines.push(`set ${s.ref}`); break;
          case 'delete': host.remove(part(s.ref)); lines.push(`deleted ${s.ref}`); break;
          case 'freeze': case 'unfreeze': host.freeze(part(s.ref), s.op === 'freeze'); lines.push(`${s.op === 'freeze' ? 'froze' : 'unfroze'} ${s.ref}`); break;
          case 'select': host.select(part(s.ref)); lines.push(`selected ${s.ref}`); break;
          case 'do': lines.push(host.command(s.command)); break;
          case 'repeat': {
            const n = Math.round(num(s.count));
            if (!(n >= 0 && n <= MAX_STEPS)) throw new ForgeError(`repeat ${n} times?`, s.line);
            const outer = vars['i'];
            for (let i = 0; i < n; i++) { vars['i'] = i; exec(s.body, `${suffix}${i}`); }
            if (outer === undefined) delete vars['i']; else vars['i'] = outer;
            break;
          }
        }
      }
    };
    exec(prog, '');
    return { ok: true, lines, steps };
  } catch (e) {
    return { ok: false, lines, error: e instanceof Error ? e.message : String(e), steps };
  }
}

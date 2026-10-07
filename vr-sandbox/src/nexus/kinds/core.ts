// Kinds of bought part, as data: each a short table of the sizes it is sold in (its standard's, where it has one; the
// sizes makers list, where it has not, and it says so), what it is made of, how it is made, its standard numbers, its
// box and its mass. From the table alone a kind becomes a family (it reads its words and makes any of its sizes), the
// catalogue's lines (every standard size), and blocks of the part space (every size it can be made to order in). So
// adding a kind of part is adding its table; nothing else is written for it.

import type { Family, Param } from '../families';
import type { Item, Process } from '../inventory';

export type V = string | number;
export type P = Record<string, V>;
/** One size of a kind: its key; the tag its value follows in words ("" for a value that names itself); what it is; its
 *  unit; the sizes it is sold in (or, for a later axis, the sizes it is sold in for the first axis's value); and the
 *  range it is made to order in, lo…hi by step, where it is cut or wound to any size. */
export interface Ax { key: string; tag: string; says: string; unit: string; values: V[] | ((p: P) => V[]); cut?: [number, number, number] }
export interface KindDef {
  id: string; name: string; path: string; says: string;
  /** where its sizes come from: a standard, or the sizes makers sell (an estimate of the range, said so) */
  std: string;
  axes: Ax[];
  title(p: P): string;
  /** what goes into one: material and part ids, "id*n" for n of them */
  of(p: P): string;
  make: Process | ((p: P) => Process); alt?: Process; kind?: Item['kind'];
  how: string | ((p: P) => string);
  spec(p: P): string;
  box(p: P): [number, number, number];
  g(p: P): number;
  /** why a size read from words cannot be made, or null when it can */
  ok?(p: P): string | null;
  /** its part space, where it is made to order over ranges that hang on each other: blocks of fixed sizes and free axes */
  space?(): SpaceBlock[];
  /** its 3D shape, as one of the view's shape kinds and a mark ("screw hex", "ring"), where its name does not say */
  look?: string | ((p: P) => string);
}
/** A block of a kind's own part space: some sizes fixed, the rest free over a list or a range lo…hi by step. */
export interface SpaceBlock { fixed: P; axes: ({ key: string; values: V[] } | { key: string; lo: number; hi: number; step: number })[] }

/** An axis whose value is written after its key ("d5", "L20"). */
export const ax = (key: string, says: string, unit: string, values: V[] | ((p: P) => V[]), cut?: [number, number, number]): Ax => ({ key, tag: key, says, unit, values, ...(cut ? { cut } : {}) });
/** An axis whose values name themselves ("A2", "SPZ", "G1/4"). */
export const bare = (key: string, says: string, values: V[] | ((p: P) => V[])): Ax => ({ key, tag: '', says, unit: '', values });
/** An axis written before its unit ("1.6A", "12V", "2200mAh"). */
export const unit = (key: string, says: string, u: string, values: V[] | ((p: P) => V[]), cut?: [number, number, number]): Ax => ({ key, tag: `~${u}`, says, unit: u, values, ...(cut ? { cut } : {}) });
/** An axis written after its own tag, not its key ("x20" for a length). */
export const tagged = (key: string, tag: string, says: string, unit: string, values: V[] | ((p: P) => V[]), cut?: [number, number, number]): Ax => ({ key, tag, says, unit, values, ...(cut ? { cut } : {}) });

export const vals = (a: Ax, p: P): V[] => (typeof a.values === 'function' ? a.values(p) : a.values);
const dp = (x: number) => (String(x).split('.')[1] ?? '').length;
const onGrid = (x: number, [lo, hi, st]: [number, number, number]) => x >= lo - 1e-9 && x <= hi + 1e-9 && Math.abs((x - lo) / st - Math.round((x - lo) / st)) < 1e-6 && dp(x) <= Math.max(dp(st), dp(lo));

/** Units written with an SI prefix in words: "4.7kohm", "100nF", "500mA", "11.0592MHz". */
const SIU = new Set(['ohm', 'F', 'H', 'Hz', 'A', 'W', 'V']);
const PREFIX: [number, string][] = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'u'], [1e-9, 'n'], [1e-12, 'p']];
const siWord = (x: number) => { const [m, p] = PREFIX.find(([m]) => Math.abs(x) >= m * 0.9999) ?? [1e-12, 'p']; return `${+(x / m).toPrecision(6)}${p}`; };
/** A number from a word, with an SI prefix if its unit takes one; NaN if it is not one. */
const numberIn = (w: string, si: boolean): number => { const m = (si ? /^(-?\d+(?:\.\d+)?)([GMkmuµnp]?)$/ : /^(-?\d+(?:\.\d+)?)()$/).exec(w); if (!m) return NaN; const f = m[2] ? PREFIX.find(([, p]) => p === m[2]!.replace('µ', 'u'))![0] : 1; return Number(m[1]) * f; };
const near = (a: number, b: number) => Math.abs(a - b) <= Math.abs(b) * 1e-9 + 1e-15;
/** A value as its axis writes it in words: after its tag, before its unit ("~A": "1.6A"), or alone. */
export const tokenOf = (a: Ax, v: V) => { if (!a.tag.startsWith('~')) return `${a.tag}${v}`; const u = a.tag.slice(1); return `${typeof v === 'number' && SIU.has(u) ? siWord(v) : v}${u}`; };
/** The words that call one of a kind's sizes: "fuse 5x20 T 1.6A" is "fuse" and its axes, each in its own form. */
export function wordsOf(k: KindDef, p: P): string { return [k.id, ...k.axes.map((a) => tokenOf(a, p[a.key]!))].join(' '); }
/** What a token says for an axis: its value; "bad" (in its form, but neither sold nor made to order); or nothing. */
function match(a: Ax, vs: V[], t: string): V | 'bad' | undefined {
  if (a.tag === '') return vs.find((x) => typeof x === 'string' && x.toLowerCase() === t.toLowerCase()) ?? vs.find((x) => typeof x === 'number' && String(x) === t);
  let rest: string, si = false;
  if (a.tag.startsWith('~')) { const u = a.tag.slice(1); if (!t.endsWith(u) || t.length === u.length) return undefined; rest = t.slice(0, -u.length); si = SIU.has(u); }
  else { if (!t.startsWith(a.tag) || t.length === a.tag.length) return undefined; rest = t.slice(a.tag.length); }
  const str = vs.find((x) => typeof x === 'string' && x.toLowerCase() === rest.toLowerCase()); if (str !== undefined) return str;
  const x = numberIn(rest, si); if (Number.isNaN(x)) return a.tag.startsWith('~') ? undefined : a.tag.length > 1 ? 'bad' : undefined;
  const v = vs.find((y) => typeof y === 'number' && near(x, y)); if (v !== undefined) return v;
  if (a.cut && onGrid(x, a.cut)) return x;
  return 'bad';
}
/** A kind's sizes read from words, each token one of its axes in its own form; a size not given is the first it is sold
 *  in. A value it is not sold in is refused, saying what it is sold in, unless it is made to order. */
export function readKind(k: KindDef, words: string): P | string {
  const toks = words.trim().split(/\s+/).filter((t) => t && t.toLowerCase() !== k.id), p: P = {}, used = new Set<number>();
  for (const a of k.axes) {
    const vs = vals(a, p); let got: V | undefined;
    if (!vs.length && !a.cut) return `${k.name}: no ${a.says} goes with ${k.axes.slice(0, k.axes.indexOf(a)).map((b) => tokenOf(b, p[b.key]!)).join(' ')}.`;
    for (let i = 0; i < toks.length && got === undefined; i++) {
      if (used.has(i)) continue;
      const longer = k.axes.some((b) => b !== a && b.tag.length > a.tag.length && b.tag !== '' && a.tag !== '' && !b.tag.startsWith('~') && !a.tag.startsWith('~') && toks[i]!.startsWith(b.tag) && b.tag.startsWith(a.tag));
      if (longer) continue;
      const m = match(a, vs, toks[i]!);
      if (m === 'bad') return `${k.name}: ${a.says} comes in ${vs.slice(0, 24).join(', ')}${vs.length > 24 ? ' …' : ''}${a.unit && !/^[A-Za-z]/.test(String(vs[0])) ? ` ${a.unit}` : ''}${a.cut ? `, or made to order ${a.cut[0]}–${a.cut[1]} ${a.unit} in steps of ${a.cut[2]}` : ''}.`;
      if (m !== undefined) { got = m; used.add(i); }
    }
    p[a.key] = got ?? vs[0]!;
  }
  const left = toks.filter((_, i) => !used.has(i));
  if (!left.length && k.ok) { const why = k.ok(p); if (why) return `${k.name}: ${why}`; }
  if (left.length) return `${k.name}: I do not know "${left.join(' ')}". Say its sizes as ${wordsOf(k, Object.fromEntries(k.axes.map((a) => [a.key, vals(a, p)[0]!])))}: ${k.axes.map((a) => `${a.says} (${vals(a, p).slice(0, 8).join(', ')}${vals(a, p).length > 8 ? ' …' : ''})`).join('; ')}.`;
  return p;
}
const idPart = (v: V) => String(v).toLowerCase().replace(/\//g, '_').replace(/[^\w.+-]/g, '');
let caller: ((words: string) => Item | string | null) | null = null;
/** How a kind's parts made to their own sizes are called: by their families' words (set by src/nexus/families.ts). */
export function useFamilies(f: (words: string) => Item | string | null): void { caller = f; }
/** What goes into one, read: materials and parts by id ("id*n"), and parts made to sizes by their own families in
 *  braces ("{tube round 34x2.5 150 aluminium}*2"), each made now and carried with it; after a bar, what to use if that
 *  size cannot be made ("{bearing 6210 2RS|steel-chrome bearing-ball*10}"). */
export function partsOf(text: string): { of: { id: string; n: number }[]; inner: Item[] } {
  const of: { id: string; n: number }[] = [], inner: Item[] = [];
  const add = (id: string, n: number) => { const had = of.find((o) => o.id === id); if (had) had.n += n; else of.push({ id, n }); };
  const plain = (t: string) => { for (const x of t.split(/\s+/).filter(Boolean)) { const [c, n] = x.split('*'); add(c!, Number(n ?? 1)); } };
  const rest = text.replace(/\{([^}|]+)(?:\|([^}]*))?\}(?:\*(\d+))?/g, (_, w: string, alt: string | undefined, nn: string | undefined) => {
    const r = caller?.(w.trim()) ?? null;
    if (r && typeof r === 'object') { inner.push(r); add(r.id, Number(nn ?? 1)); } else if (alt !== undefined) plain(alt); else throw new Error(`a part "${w.trim()}" cannot be made: ${r ?? 'no family reads it'}`);
    return ' ';
  });
  plain(rest);
  return { of, inner };
}
/** The item one size of a kind is. */
export function makeKind(k: KindDef, p: P): Item {
  const { of, inner } = partsOf(k.of(p));
  const g = k.g(p), box = k.box(p).map((x) => +x.toFixed(2)) as [number, number, number];
  return { id: [k.id, ...k.axes.map((a) => idPart(p[a.key]!))].join('-'), name: k.title(p), path: k.path.split('/'), kind: k.kind ?? 'product', make: typeof k.make === 'function' ? k.make(p) : k.make, of, says: typeof k.how === 'function' ? k.how(p) : k.how, spec: `${k.spec(p)} (sizes: ${k.std})`, size: box, ...(inner.length ? { inner } : {}), g: +(g < 100 ? g.toPrecision(3) : g.toFixed(0)), ...(k.alt ? { alt: k.alt } : {}), ...(k.look ? { look: typeof k.look === 'function' ? k.look(p) : k.look } : {}), adjustable: true } as Item;
}
/** Every size a kind is sold in: the catalogue's lines for it. */
export function linesOf(k: KindDef): string[] {
  // the words are carried down the walk, each axis's token written once where it is chosen, and the sizes set in place
  // (an axis read from those before it sees only those): the lines wordsOf writes, in the same order, at a third of the cost
  const out: string[] = [], p: P = {};
  const walk = (i: number, pre: string) => {
    if (i === k.axes.length) { out.push(pre); return; }
    const a = k.axes[i]!;
    for (const v of vals(a, p)) { p[a.key] = v; walk(i + 1, `${pre} ${tokenOf(a, v)}`); }
    delete p[a.key];
  };
  walk(0, k.id);
  return out;
}
/** A kind as a family: called by its words, it makes any of its sizes. Its examples (its first, middle and last sizes)
 *  are listed only when first asked for, so that making the families costs nothing at start. */
export function familyOf(k: KindDef): Family & { kind: true } {
  const params: Param[] = k.axes.map((a) => {
    const vs = typeof a.values === 'function' ? undefined : a.values;
    return { key: a.key, says: a.says, unit: a.unit, ...(vs && !a.cut ? { values: vs } : {}), ...(a.cut ? { min: a.cut[0], max: a.cut[1] } : {}), default: (vs ?? [])[0] ?? '' };
  });
  let ex: string[] | null = null;
  const f = { id: k.id, name: k.name, path: k.path.split('/'), says: `${k.says}; sizes: ${k.std}`, params, kind: true as const, read: (w: string) => readKind(k, w), make: (p: P) => makeKind(k, p) } as Family & { kind: true };
  Object.defineProperty(f, 'examples', { enumerable: true, get: () => (ex ??= (() => { const ls = linesOf(k); return [...new Set([ls[0]!, ls[Math.floor(ls.length / 2)]!, ls[ls.length - 1]!])]; })()) });
  return f;
}

// ---- shapes and masses ---------------------------------------------------------------------------------------------
/** Grams of a solid of mm³ at ρ g/cm³. */
export const gOf = (mm3: number, rho: number) => (mm3 / 1000) * rho;
export const cyl = (d: number, L: number) => Math.PI * (d / 2) ** 2 * L;
export const ring = (D: number, d: number, L: number) => Math.PI * ((D / 2) ** 2 - (d / 2) ** 2) * L;
export const hexPrism = (af: number, L: number) => (Math.sqrt(3) / 2) * af * af * L;
/** What a matter word stands for: the inventory's material, and its density (g/cm³). */
export const MATTER: Record<string, [string, number, string]> = {
  steel: ['steel-low', 7.85, 'steel'], zinc: ['steel-low zinc', 7.85, 'zinc-plated steel'], alloy: ['steel-alloy', 7.85, 'alloy steel'], black: ['steel-alloy', 7.85, 'black-oxide alloy steel'],
  stainless: ['stainless-304', 8.0, 'A2 (304) stainless'], A2: ['stainless-304', 8.0, 'A2 (304) stainless'], A4: ['stainless-316', 8.0, 'A4 (316) stainless'], '316': ['stainless-316', 8.0, '316 stainless'],
  brass: ['brass', 8.5, 'brass'], bronze: ['bronze', 8.8, 'bronze'], copper: ['copper', 8.96, 'copper'], aluminium: ['al-6061', 2.7, 'aluminium'], '6082': ['al-6061', 2.7, '6082 aluminium'], '7075': ['al-7075', 2.81, '7075 aluminium'], '5052': ['al-5052', 2.68, '5052 aluminium'],
  titanium: ['ti-6al4v', 4.43, 'titanium (Ti-6Al-4V)'], castiron: ['cast-iron', 7.2, 'cast iron'], zamak: ['zamak', 6.6, 'zinc alloy (Zamak 3)'],
  nylon: ['nylon', 1.14, 'nylon'], pom: ['pom', 1.41, 'acetal (POM)'], ptfe: ['ptfe', 2.2, 'PTFE'], peek: ['peek', 1.3, 'PEEK'], pe: ['pe', 0.95, 'polyethylene'], uhmw: ['pe', 0.93, 'UHMW polyethylene'], pp: ['pp', 0.9, 'polypropylene'],
  pvc: ['pvc', 1.4, 'PVC'], abs: ['abs', 1.05, 'ABS'], pc: ['pc', 1.2, 'polycarbonate'], acrylic: ['pmma', 1.18, 'acrylic'], petg: ['pet', 1.27, 'PETG'], pu: ['pu', 1.2, 'polyurethane'], tpu: ['pu', 1.21, 'TPU'],
  nbr: ['nbr', 1.3, 'nitrile rubber (NBR)'], epdm: ['epdm', 1.2, 'EPDM rubber'], fkm: ['fkm', 1.85, 'FKM (Viton-type) rubber'], silicone: ['silicone', 1.2, 'silicone rubber'], neoprene: ['neoprene', 1.3, 'neoprene'], rubber: ['rubber', 1.2, 'rubber'],
  glass: ['glass', 2.5, 'glass'], ceramic: ['alumina', 3.9, 'alumina ceramic'], wood: ['wood', 0.5, 'wood'], carbide: ['tungsten-carbide', 14.9, 'tungsten carbide'], hss: ['steel-hss', 8.1, 'high-speed steel (M2)'], chrome: ['steel-chrome', 7.83, 'chrome steel (52100)'], si3n4: ['si3n4', 3.2, 'silicon nitride'],
};
export const matOf = (m: V) => MATTER[String(m)] ?? MATTER.steel!;
/** The R20 preferred numbers (ISO 3), 1 to 10. */
export const R20 = [1, 1.12, 1.25, 1.4, 1.6, 1.8, 2, 2.24, 2.5, 2.8, 3.15, 3.55, 4, 4.5, 5, 5.6, 6.3, 7.1, 8, 9];
export const r20 = (lo: number, hi: number) => [0.1, 1, 10, 100, 1000, 10000].flatMap((d) => R20.map((x) => +(x * d).toPrecision(3))).filter((x) => x >= lo && x <= hi);
/** ISO preferred lengths, mm. */
export const PREF = [2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 30, 32, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180, 200, 220, 240, 260, 280, 300];
export const pref = (lo: number, hi: number) => PREF.filter((x) => x >= lo && x <= hi);
export const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
export const E24 = [1, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2, 2.2, 2.4, 2.7, 3, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
export const decades = (series: number[], lo: number, hi: number) => [1e-12, 1e-11, 1e-10, 1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3, 1e-2, 0.1, 1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7].flatMap((d) => series.map((x) => +(x * d).toPrecision(3))).filter((x) => x >= lo * 0.999 && x <= hi * 1.001);
/** A value with an SI prefix: 4700 → "4.7k", 2.2e-6 → "2.2µ". */
export const si = (x: number) => { const ps: [number, string][] = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']]; const [m, s] = ps.find(([m]) => Math.abs(x) >= m * 0.9999) ?? [1e-12, 'p']; return `${+(x / m).toPrecision(6)}${s}`; };
export const range = (lo: number, hi: number, st: number) => Array.from({ length: Math.floor((hi - lo) / st + 1e-9) + 1 }, (_, k) => +(lo + k * st).toFixed(Math.max(dp(st), dp(lo))));

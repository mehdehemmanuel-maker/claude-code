// Research as a pipeline, its steps nodes (src/nexus/blocks.ts research.*): what a real thing is made of, found and
// written down with where each piece of it was read (research notes), compiled into a reference tree (systems, their
// parts, the parts of those), checked against what is drawn (the gap: what is there, short, missing, or drawn the way the
// sources say it is not), and the drawing itself measured for how finely it is made (fidelity: how much of it is still a
// plain box, and which boxes are the biggest). Nothing here searches the web: the notes are written by whoever researched
// them (src/data/references.ts holds those done so far) and every entry that names a part carries its source, or is
// refused.
//
// Notes, one entry a line:
//   @S1 | https://… | the page's title                      (a source, named once and cited by its key)
//   id | name | in | n | finds | source | level | says | wrong
// `in` is the entry it is part of (its id; a system is an entry with nothing it is in and no pattern); `n` how many (3+ for at least three); `finds` a pattern
// (regular expression, case ignored) over the names of drawn pieces that are this; `source` the key of a source; `level`
// confirmed (the source says it of this very thing), sibling (of its sister in the same series) or typical (of every
// such thing); a pattern's alternatives are split by ; (a | splits the columns); `wrong` a pattern over drawn names that the source says this thing has not (a belt-driven water pump's
// pulley where the pump is electric).

import type { Part } from './kits';
import { volumeOf } from './mass';

export interface Source { key: string; url: string; title: string }
export type Level = 'confirmed' | 'sibling' | 'typical';
export interface RefEntry {
  id: string; name: string; /** the system or entry it is part of */ in: string;
  /** how many; `atLeast` when written 3+ */ n: number; atLeast?: boolean;
  /** pattern over drawn names; none for a grouping */ finds?: string; /** pattern over drawn names it has not */ wrong?: string;
  source?: string; level: Level; says: string;
}
export interface Reference { id: string; name: string; sources: Source[]; entries: RefEntry[] }
export interface Compiled { reference: Reference; refused: string[]; conflicts: string[] }

const cells = (l: string) => l.split('|').map((x) => x.trim());
const LEVELS: Level[] = ['confirmed', 'sibling', 'typical'];
/** Research notes compiled into a reference: each source named once, each entry checked (its source known, its level
 *  one of the three, its pattern a pattern, what it is in known), what is written twice reconciled or said as a
 *  conflict. An entry that names a part (has a pattern) with no source is refused: nothing goes in unsourced. */
export function compileNotes(id: string, name: string, notes: string): Compiled {
  const sources: Source[] = [], entries: RefEntry[] = [], refused: string[] = [], conflicts: string[] = [];
  const lines = notes.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  for (const l of lines) if (l.startsWith('@')) { const [key, url, title] = cells(l.slice(1)); if (!key || !/^https?:\/\//.test(url ?? '')) { refused.push(`source "${l}": a key and an http(s) address`); continue; } sources.push({ key: key!, url: url!, title: title || url! }); }
  const byKey = new Map(sources.map((s) => [s.key, s])), byId = new Map<string, RefEntry>();
  for (const l of lines) {
    if (l.startsWith('@')) continue;
    const [eid, ename, ein, en, f, src, lv, says, w] = cells(l), finds = f?.replace(/;/g, '|'), wrong = w?.replace(/;/g, '|');
    if (!eid) { refused.push(`a line with no id: ${l}`); continue; }
    const level = (lv || 'typical') as Level;
    if (!LEVELS.includes(level)) { refused.push(`${eid}: level "${lv}" (confirmed, sibling or typical)`); continue; }
    if (finds && !src) { refused.push(`${eid}: no source (every part named is sourced)`); continue; }
    if (src && !byKey.has(src)) { refused.push(`${eid}: no source "${src}" written (@${src} | url | title)`); continue; }
    try { if (finds) new RegExp(finds, 'i'); if (wrong) new RegExp(wrong, 'i'); } catch { refused.push(`${eid}: its pattern is not a pattern`); continue; }
    const m = /^(\d+)(\+)?$/.exec(en || '1'); if (!m) { refused.push(`${eid}: how many "${en}" (a count, or 3+)`); continue; }
    const e: RefEntry = { id: eid, name: ename || eid, in: ein || '', n: Number(m[1]), ...(m[2] ? { atLeast: true } : {}), ...(finds ? { finds } : {}), ...(wrong ? { wrong } : {}), ...(src ? { source: src } : {}), level, says: says ?? '' };
    const had = byId.get(eid);
    if (had) {
      // (written twice: the same count agrees; a different count from another source is a conflict kept to be settled,
      // the better-sourced level kept)
      if (had.n !== e.n) conflicts.push(`${eid}: ${had.n} by ${had.source ?? '—'} against ${e.n} by ${e.source ?? '—'}`);
      if (LEVELS.indexOf(e.level) < LEVELS.indexOf(had.level)) byId.set(eid, { ...e, n: had.n }); continue;
    }
    byId.set(eid, e); entries.push(e);
  }
  const kept = entries.map((e) => byId.get(e.id)!);
  const known = kept.filter((e) => !e.in || byId.has(e.in));
  for (const e of kept) if (!known.includes(e)) refused.push(`${e.id}: in "${e.in}", which is not written`);
  return { reference: { id, name, sources, entries: known }, refused, conflicts };
}
/** Several references made one: the sources of all, each entry once (a later one fills in what an earlier lacks, a
 *  count that differs said as a conflict). */
export function mergeReferences(refs: Reference[], id = refs[0]?.id ?? 'merged', name = refs[0]?.name ?? 'merged'): Compiled {
  const notes: string[] = [];
  for (const r of refs) { for (const s of r.sources) notes.push(`@${r.id}.${s.key} | ${s.url} | ${s.title}`); for (const e of r.entries) notes.push([e.id, e.name, e.in, `${e.n}${e.atLeast ? '+' : ''}`, e.finds?.replace(/\|/g, ';') ?? '', e.source ? `${r.id}.${e.source}` : '', e.level, e.says.replace(/\|/g, '/'), e.wrong?.replace(/\|/g, ';') ?? ''].join(' | ')); }
  return compileNotes(id, name, notes.join('\n'));
}

/** The systems a reference is split into (what its top entries are in), each with its entries as a tree. */
export function referenceTree(r: Reference): string[] {
  const kids = new Map<string, RefEntry[]>(); for (const e of r.entries) (kids.get(e.in) ?? kids.set(e.in, []).get(e.in)!).push(e);
  const out: string[] = [], ids = new Set(r.entries.map((e) => e.id));
  const walk = (e: RefEntry, d: number) => { out.push(`${'  '.repeat(d)}${e.n > 1 || e.atLeast ? `${e.n}${e.atLeast ? '+' : ''} × ` : ''}${e.name}${e.finds ? ` (${e.level}${e.source ? `, ${e.source}` : ''})` : ''}`); for (const k of kids.get(e.id) ?? []) walk(k, d + 1); };
  for (const e of r.entries) if (!ids.has(e.in)) walk(e, 0);
  return out;
}

/** A reference as inventory entries in the fast format (inventory.ts feed): the reference itself and each entry, filed
 *  under Researched/<its id>, holding its parts by count; what has no parts of its own is entered with nothing in it, so
 *  the breakdown queue holds it as waiting to be broken down (the next research to do). Each says its source. */
export function feedLinesOf(r: Reference): string {
  const pre = (id: string) => `${r.id}.${id}`.toLowerCase().replace(/[^a-z0-9.-]+/g, '-'), kids = new Map<string, RefEntry[]>(), ids = new Set(r.entries.map((e) => e.id));
  for (const e of r.entries) (kids.get(e.in) ?? kids.set(e.in, []).get(e.in)!).push(e);
  const src = (e: RefEntry) => { const s = r.sources.find((x) => x.key === e.source); return s ? ` (${e.level}: ${s.url})` : ''; };
  const clean = (t: string) => t.replace(/[|;\n]/g, ',');
  const of = (id: string) => (kids.get(id) ?? []).map((k) => `${pre(k.id)}${k.n > 1 ? `*${k.n}` : ''}`).join(' ');
  const lines = [[r.id, clean(r.name), `Researched/${r.id}`, 'product', 'assemble', r.entries.filter((e) => !ids.has(e.in)).map((e) => pre(e.id)).join(' '), `researched from ${r.sources.length} sources`].join(' | ')];
  for (const e of r.entries) lines.push([pre(e.id), clean(e.name), `Researched/${r.id}`, kids.has(e.id) ? 'assembly' : 'part', 'assemble', of(e.id), clean(e.says + src(e))].join(' | '));
  return lines.join('\n');
}

// ==== the gap: a drawn thing against its reference =======================================================================
export type Status = 'drawn' | 'short' | 'missing' | 'wrong' | 'grouping';
export interface GapRow { id: string; name: string; system: string; depth: number; want: string; have: number; status: Status; level: Level; source?: string; says: string }
export interface Gap { rows: GapRow[]; /** of the entries that name a part, the share drawn as the sources say */ coverage: number; missing: GapRow[]; wrong: GapRow[]; short: GapRow[]; says: string }

const allOf = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(allOf)];
/** The pieces under `roots` whose names a pattern finds, counted once each: what is found is not looked inside again (a
 *  fuel injector's body is not a second injector). */
function found(roots: Part[], re: RegExp): Part[] {
  const out: Part[] = [];
  const walk = (p: Part) => { if (re.test(p.name)) { out.push(p); return; } for (const c of p.parts ?? []) walk(c); };
  for (const r of roots) walk(r);
  return out;
}
/** What is drawn against what the reference says is there: each entry looked for by its pattern, inside what its parent
 *  entry found where that has a pattern (a knock sensor's piezo element inside the knock sensor), else in the whole. */
export function gapOf(thing: Part, r: Reference): Gap {
  const byId = new Map(r.entries.map((e) => [e.id, e])), foundOf = new Map<string, Part[]>(), rows: GapRow[] = [];
  const systemOf = (e: RefEntry): string => { let x = e; for (let k = 0; k < 16 && byId.has(x.in); k++) x = byId.get(x.in)!; return x.name; };
  const depthOf = (e: RefEntry): number => { let d = 0, x = e; while (byId.has(x.in) && d < 16) { x = byId.get(x.in)!; d++; } return d; };
  const scope = (e: RefEntry): Part[] => { let x = e; while (byId.has(x.in)) { x = byId.get(x.in)!; if (x.finds) return foundOf.get(x.id) ?? []; } return [thing]; };
  // (parents before their parts: entries in the order a tree is read)
  const order: RefEntry[] = [], kids = new Map<string, RefEntry[]>(); for (const e of r.entries) (kids.get(e.in) ?? kids.set(e.in, []).get(e.in)!).push(e);
  const take = (e: RefEntry) => { order.push(e); for (const k of kids.get(e.id) ?? []) take(k); };
  for (const e of r.entries) if (!byId.has(e.in)) take(e);
  for (const e of order) {
    const want = `${e.n}${e.atLeast ? '+' : ''}`;
    if (!e.finds) { rows.push({ id: e.id, name: e.name, system: systemOf(e), depth: depthOf(e), want, have: 0, status: 'grouping', level: e.level, ...(e.source ? { source: e.source } : {}), says: e.says }); continue; }
    const got = found(scope(e), new RegExp(e.finds, 'i')); foundOf.set(e.id, got);
    const bad = e.wrong ? allOf(thing).filter((p) => new RegExp(e.wrong!, 'i').test(p.name)) : [];
    // (where its parent is drawn n times, it is wanted n times over)
    const par = byId.get(e.in), times = par?.finds ? Math.max(1, (foundOf.get(par.id) ?? []).length) : 1, need = e.n * times;
    const status: Status = bad.length ? 'wrong' : got.length === 0 ? 'missing' : got.length < need ? 'short' : 'drawn';
    rows.push({ id: e.id, name: e.name, system: systemOf(e), depth: depthOf(e), want: times > 1 ? `${want} × ${times}` : want, have: got.length, status, level: e.level, ...(e.source ? { source: e.source } : {}), says: bad.length ? `${e.says} — drawn: ${[...new Set(bad.map((p) => p.name))].slice(0, 3).join(', ')}` : e.says });
  }
  const checked = rows.filter((x) => x.status !== 'grouping'), of = (s: Status) => checked.filter((x) => x.status === s);
  const coverage = checked.length ? of('drawn').length / checked.length : 1;
  const missing = of('missing'), wrong = of('wrong'), short = of('short');
  return { rows, coverage, missing, wrong, short, says: `${of('drawn').length} of ${checked.length} parts the sources name are drawn (${Math.round(coverage * 100)} %); ${missing.length} missing, ${short.length} short of their count, ${wrong.length} drawn the way the sources say it is not${missing.length ? `. Missing first: ${missing.slice(0, 6).map((x) => x.name).join(', ')}` : ''}` };
}

// ==== fidelity: how finely a drawn thing is made =========================================================================
const FASTENER = /\b(bolt|screw|stud|nut|rivet|washer|dowel|pin|keeper|clip|circlip)\b/i;
export interface Fidelity {
  pieces: number; named: number; boxes: number; /** of the pieces drawn, the share that is a plain box */ boxShare: number;
  /** of the volume drawn, the share in plain boxes */ boxVolume: number; shaped: number; fasteners: number; holes: number;
  /** the share with a surface finish said */ finished: number; biggestBoxes: { name: string; litres: number }[]; says: string;
}
const kindOf = (p: Part) => (p.shape ? Object.keys(p.shape)[0]! : '');
/** How much room a shape takes, litres (as its shape encloses it: src/nexus/mass.ts). */
const roomOf = (p: Part): number => (p.shape ? volumeOf(p.shape) * 1000 : 0);
/** A drawn thing measured for how finely it is made: its pieces, how many and how much of it are still plain boxes
 *  (castings drawn as slabs want their ribs, bosses and fillets), how many are shaped (turned, lofted, extruded, bent),
 *  its fasteners and holes, and its biggest boxes, the first to reshape. */
export function fidelityOf(thing: Part): Fidelity {
  const leaves = allOf(thing).filter((p) => p.shape);
  const boxes = leaves.filter((p) => kindOf(p) === 'box'), shaped = leaves.filter((p) => /^(lathe|loft|prism|tube|surf|torus)$/.test(kindOf(p)));
  const vol = leaves.reduce((a, p) => a + roomOf(p), 0), bvol = boxes.reduce((a, p) => a + roomOf(p), 0);
  const big = new Map<string, number>(); for (const p of boxes) big.set(p.name, Math.max(big.get(p.name) ?? 0, roomOf(p)));
  const biggestBoxes = [...big].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, l]) => ({ name, litres: +l.toPrecision(3) }));
  const f: Fidelity = { pieces: leaves.length, named: new Set(leaves.map((p) => p.name)).size, boxes: boxes.length, boxShare: leaves.length ? boxes.length / leaves.length : 0, boxVolume: vol ? bvol / vol : 0, shaped: shaped.length, fasteners: allOf(thing).filter((p) => FASTENER.test(p.name) && !(p.parts ?? []).some((c) => FASTENER.test(c.name))).length, holes: leaves.reduce((a, p) => a + (p.cuts?.length ?? 0), 0), finished: leaves.length ? leaves.filter((p) => p.finish).length / leaves.length : 0, biggestBoxes, says: '' };
  f.says = `${f.pieces} pieces (${f.named} kinds); ${Math.round(f.boxShare * 100)} % of them plain boxes, holding ${Math.round(f.boxVolume * 100)} % of what is drawn; ${f.shaped} shaped (turned, lofted, extruded, bent); ${f.fasteners} fasteners, ${f.holes} holes; ${Math.round(f.finished * 100)} % with a surface finish said${biggestBoxes.length ? `. Biggest boxes: ${biggestBoxes.slice(0, 4).map((b) => b.name).join(', ')}` : ''}`;
  return f;
}

// ==== the references researched so far ===================================================================================
import { M20A_FKS_NOTES } from '../data/references';
const compiled = new Map<string, Compiled>();
/** The references researched so far, by id, each compiled from its notes once. */
export const REFERENCE_NOTES: Record<string, { name: string; notes: string }> = {
  'm20a-fks': { name: 'Toyota M20A-FKS, 2.0 L Dynamic Force four (2025 Corolla LE)', notes: M20A_FKS_NOTES },
};
export function referenceOf(id: string): Compiled | null {
  const r = REFERENCE_NOTES[id]; if (!r) return null;
  let c = compiled.get(id); if (!c) compiled.set(id, (c = compileNotes(id, r.name, r.notes))); return c;
}

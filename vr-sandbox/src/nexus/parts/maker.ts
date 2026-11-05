// The table-driven maker (decision 0026): a family of parts is a table of rows, each from its source (a standard, a
// maker's page) or labelled typical, and one recipe made of the room operations (src/nexus/room.ts) that turns a row
// into a piece; the maker gives it one piece node with a size choice listing every row, its card text, and a check of
// every size against its row (the row's size and mass, where the row has them) for nothing. A size the recipe cannot
// make is refused, saying why. A part drawn as its outline only is an envelope and says so, in its card and in what it
// builds says. No place is written here: every place is an output of the operations.

import type { BlockDef, BlockTest, PortDef, SettingDef, Spec } from '../blocks';
import { partOfBlock, type Block } from '../room';
import { massOf } from '../mass';

/** What a row says a piece built from it measures: its bound across x, y and z (m) and its mass (kg), where the row has
 *  them; and how near the built piece must come (a share, 0.02 for 2 %), and what the figures are. */
export interface Expect { bound?: [number, number, number]; mass?: number; tol: number; massTol?: number; says: string }
export interface PartFamily<R> {
  /** its node's id (`piece.…`) */
  id: string; name: string; gloss: string; says: string; domains: string[];
  /** every row, by the size it is called by */
  rows: Record<string, R>;
  /** the size the node starts at */
  size: string;
  /** where the rows come from (each row's own source where it carries one) */
  source: string;
  /** its other settings than the size (a length, a head) */
  settings?: SettingDef[];
  /** drawn as its outline only, said in its card and in what it builds says */
  envelope?: string;
  /** the recipe: a row (and the other settings) to a piece, by the operations only */
  recipe(row: R, size: string, set: Record<string, unknown>): Block;
  /** why the recipe cannot make this size (so set), or null */
  cannot?(row: R, size: string, set: Record<string, unknown>): string | null;
  /** what the row says the built piece measures */
  expect?(row: R, size: string, set: Record<string, unknown>): Expect;
  /** its node's own tests */
  tests: BlockTest[];
}
type AnyFamily = PartFamily<unknown>;

const ROOM_SPEC = { discipline: 'mechanical.design.cad', role: 'geometry operation' as const, codes: [{ scheme: 'MSC2020' as const, code: '68U07', label: 'Computer science aspects of computer-aided design' }] };
const P = (name: string, type: PortDef['type'], more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
/** What every piece gives (the same ports as the room's own nodes, blocks.ts ROOM_OUT). */
export const PIECE_OUT: PortDef[] = [P('block', 'block', { label: 'the block, for the next operation' }), P('thing', 'assembly', { label: 'the block, drawn' }), P('pieces', 'integer'), P('faces', 'integer', { label: 'faces where pieces meet' }), P('offers', 'list<text>', { label: 'rooms and lines it offers' }), P('says', 'text')];
export const offersOf = (b: Block): string[] => [...new Set([...b.pieces.flatMap((p) => p.lines.map((l) => l.port)), ...b.rooms.map((r) => r.name)])].sort();
/** A piece's outputs, as the room's nodes give them; an envelope's says it is one. */
export const pieceOut = (b: Block, envelope?: string) => ({ block: b, thing: partOfBlock(b), pieces: b.pieces.length, faces: b.faces.length, offers: offersOf(b),
  says: `${b.name}: ${b.pieces.length} piece${b.pieces.length === 1 ? '' : 's'}, ${b.faces.length} face${b.faces.length === 1 ? '' : 's'} where they meet; every place given by the operations${envelope ? `; an envelope: ${envelope}` : ''}` });

/** Every family made by the maker, by its node's id. */
export const PART_FAMILIES = new Map<string, AnyFamily>();
const sizesSaid = (rows: Record<string, unknown>) => { const k = Object.keys(rows); return k.length > 1 ? `${k[0]} to ${k[k.length - 1]} (${k.length} sizes)` : k.join(''); };
/** A family's card: what it is, every size it has, where the rows come from, and that it is an envelope where it is. */
export const cardOf = (f: AnyFamily): string => `${f.says}. Sizes ${sizesSaid(f.rows as Record<string, unknown>)}, from ${f.source}${f.envelope ? `. An envelope: ${f.envelope}` : ''}`;
/** A size of a family built, or refused saying why. */
export function build<R>(f: PartFamily<R>, size: string, set: Record<string, unknown> = {}): Block {
  const row = f.rows[size]; if (row === undefined) throw new Error(`no ${f.name} ${size}: its sizes are ${Object.keys(f.rows).slice(0, 40).join(', ')}${Object.keys(f.rows).length > 40 ? ' …' : ''}`);
  const why = f.cannot?.(row, size, set); if (why) throw new Error(`${f.name} ${size}: ${why}`);
  return f.recipe(row, size, set);
}
/** A family as one piece node: a size choice listing every row, its other settings, its card. */
export function familyNode<R>(f: PartFamily<R>): BlockDef {
  PART_FAMILIES.set(f.id, f as AnyFamily);
  const settings: SettingDef[] = [{ key: 'size', label: 'Size', type: 'choice', default: f.size, choices: Object.keys(f.rows) }, ...(f.settings ?? [])];
  const defaults = Object.fromEntries(settings.map((s) => [s.key, s.default]));
  return { id: f.id, name: f.name, version: 1, by: 'built in', pure: true, kind: 'generator', ability: 'generate', domains: f.domains, says: cardOf(f as AnyFamily), spec: { gloss: f.gloss, ...ROOM_SPEC } as Spec,
    settings, ports: { inputs: [], outputs: PIECE_OUT }, sources: [{ cite: f.source, kind: 'standard' } as NonNullable<BlockDef['sources']>[number]],
    run: (_i, c) => { const set = { ...defaults, ...c.set }; return pieceOut(build(f, String(set.size), set), f.envelope); }, tests: f.tests };
}

/** A built piece held to its row: its bound and its mass measured (its mass from its drawing, src/nexus/mass.ts) against
 *  what the row says, within the family's tolerance. */
export interface RowCheck { ok: boolean; family: string; size: string; bound: [number, number, number]; mass: number; expect?: Expect; misses: string[]; says: string }
export function checkRow(id: string, size: string, set: Record<string, unknown> = {}, built?: Block): RowCheck {
  const f = PART_FAMILIES.get(id); if (!f) throw new Error(`no family ${id} made by the table-driven maker (${[...PART_FAMILIES.keys()].join(', ')})`);
  const row = f.rows[size]; if (row === undefined) throw new Error(`no ${f.name} ${size}`);
  const defaults = Object.fromEntries((f.settings ?? []).map((s) => [s.key, s.default])), s = { ...defaults, ...set };
  const b = built ?? build(f, size, s), bound = [0, 1, 2].map((k) => b.hi[k]! - b.lo[k]!) as [number, number, number], mass = massOf(partOfBlock(b));
  const e = f.expect?.(row, size, s), misses: string[] = [], mm = (v: number) => (v * 1000).toFixed(2);
  if (e?.bound) for (const k of [0, 1, 2]) if (Math.abs(bound[k]! - e.bound[k]!) > e.tol * e.bound[k]! + 1e-6) misses.push(`its ${'xyz'[k]} ${mm(bound[k]!)} mm, the row's ${mm(e.bound[k]!)} mm`);
  if (e?.mass !== undefined && !f.envelope && Math.abs(mass - e.mass) > (e.massTol ?? e.tol) * e.mass) misses.push(`its mass ${(mass * 1000).toFixed(2)} g, the row's ${(e.mass * 1000).toFixed(2)} g`);
  const said = e ? `${e.says}; within ${(e.tol * 100).toFixed(0)} %${e.mass !== undefined && !f.envelope ? ` (mass ${((e.massTol ?? e.tol) * 100).toFixed(0)} %)` : ''}` : 'its row gives no size or mass to check against';
  return { ok: misses.length === 0, family: id, size, bound, mass, ...(e ? { expect: e } : {}), misses,
    says: `${f.name} ${size}: ${misses.length ? `off its row: ${misses.join('; ')}` : 'as its row says'} (${said})${f.envelope ? `; an envelope, its mass not checked (drawn ${(mass * 1000).toFixed(1)} g${e?.mass !== undefined ? `, the row ${(e.mass * 1000).toFixed(1)} g` : ''})` : ''}` };
}
/** The check as a node: a piece wired in (or built from its family and size where none is), held to its row. */
export const CHECK_ROW: BlockDef = {
  id: 'check.row', name: 'Check a piece against its table row', version: 1, by: 'built in', pure: true, kind: 'critic', ability: 'check', domains: ['mechanical', 'manufacturing'],
  says: 'Holds a piece built by a table-driven family (piece.bolt, piece.nut, piece.washer, piece.bearing and the rest the maker makes) to its table\'s row: its bound and its mass, measured from what was built, against the row\'s sizes and the nominal mass worked from them, within a tolerance it states. Wire the piece in, or leave it unwired to build it from the family and size set',
  spec: { gloss: 'Is a piece as big and as heavy as its standard\'s row says?', discipline: 'mechanical.design', role: 'assessment', codes: [{ scheme: 'ICS', code: '21.060.01', label: 'Fasteners in general' }, { scheme: 'ICS', code: '21.100.20', label: 'Rolling bearings' }] },
  settings: [{ key: 'family', label: 'Family (its node)', type: 'text', default: 'piece.bolt' }, { key: 'size', label: 'Size', type: 'text', default: 'M8' }, { key: 'set', label: 'Its other settings (JSON)', type: 'text', default: '{}' }],
  ports: { inputs: [P('block', 'block', { optional: true, label: 'the piece (from the family\'s node)' })], outputs: [P('ok', 'boolean'), P('mass', 'number', { unit: 'kg' }), P('bound', 'list<number>', { label: 'x, y, z, m' }), P('says', 'text')] },
  run: (i, c) => { let set: Record<string, unknown> = {}; try { set = JSON.parse(String(c.set.set ?? '{}')) as Record<string, unknown>; } catch { throw new Error(`its other settings are JSON ("${String(c.set.set)}")`); }
    const r = checkRow(String(c.set.family), String(c.set.size), set, i.block as Block | undefined); return { ok: r.ok, mass: r.mass, bound: r.bound, says: r.says }; },
  tests: [{ inputs: {}, outputs: { ok: true } }, { set: { family: 'piece.nut', size: 'M64' }, inputs: {}, outputs: { ok: true } }],
};

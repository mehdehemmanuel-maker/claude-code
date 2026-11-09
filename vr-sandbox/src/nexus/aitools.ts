// The AI's tools over the component contract (AUDIT §5, wave 2; acceptance test 10): what a part offers and asks, read by
// interfacesOf (interfaces.ts) from a room block's pieces and faces, and turned into answers an agent can act on. Each is
// a pure function of what it is given (the library, a block, the store of parts remembered), and each is one of the agent's
// tools (agent.ts TOOLS): compatible (two interfaces, or two blocks, by their kinds' mates and their sizes), missing
// interfaces (a motor with no power line wired, a pump with no inlet joined), bad connections (two pieces touching where
// what they offer there does not mate), interference (the critic's clash finder over the drawn pieces), search by function
// (each family's says, aisle and the classes of its interfaces, so "pumps water" finds pumps), alternatives and variants,
// revisions (memory.ts's version and digest); and the functional gate composeBuild runs after a build: the parts the
// request names joined to what they act on (a motor's shaft line to what it drives, its power line to a supply).
//
// What is read and what is not, said: a line's kind is read from its name where nothing is written on it (interfaces.ts
// lineKind, "read from its name"); a piece "joined" to another is a face the operations wrote between them (a contact, or
// a gap an operation sized with a fit other than clear); "drives" is that join, not a torque carried: no law is run here.
import { LIBRARY, block, variantsOf as variantsOfDef, type BlockDef } from './blocks';
import { aisleOf } from './parts/aisles';
import { classOf, interfacesOf, lineKind, type Interface, type InterfaceKind, type PortClass } from './interfaces';
import type { Block, Face, Piece } from './room';
import { savedParts } from './memory';

const isBlock = (v: unknown): v is Block => !!v && typeof v === 'object' && Array.isArray((v as Block).pieces) && Array.isArray((v as Block).faces);
/** The piece a line's interface record is on: the words before its last '/' (a repeat's "@x,y,z" taken off). */
const pieceOfIface = (b: Block, x: Interface): number => { const cut = x.id.lastIndexOf('/'), nm = (cut < 0 ? x.id : x.id.slice(0, cut)).replace(/@[-\d.,]+$/, ''); return b.pieces.findIndex((p) => p.name === nm); };
/** A face the operations wrote that joins its two pieces: a contact, or a gap sized by a fit other than clear (a slide fit
 *  over a shaft joins; a clearance left between two stacked things does not). */
export const joins = (f: Face): boolean => f.kind === 'contact' || (!!f.fit && f.fit !== 'clear');
/** Each piece's neighbours by the faces that join them. */
const neighbours = (b: Block): number[][] => { const nb = b.pieces.map(() => [] as number[]); for (const f of b.faces) if (joins(f) && f.a !== f.b) { nb[f.a]!.push(f.b); nb[f.b]!.push(f.a); } return nb; };
const radiusOf = (x: Interface, k: 'opening' | 'slot'): number | undefined => (typeof x.size[k] === 'number' ? x.size[k] as number : undefined);

// ---- compatible -----------------------------------------------------------------------------------------------------------
export interface Compatible { ok: boolean; says: string; pairs: { a: string; b: string; kind: InterfaceKind; with: InterfaceKind; why: string }[] }
/** Two interfaces mate where each kind meets the other (interfaces.ts MATES) and their sizes agree where both state one:
 *  a thread by its name, a shaft no wider than the bore it goes in (a shaft's radius its line's slot; a bore's its
 *  opening, else its slot). */
function mates(a: Interface, b: Interface): { ok: boolean; why: string } {
  if (!a.mates.includes(b.kind) || !b.mates.includes(a.kind)) return { ok: false, why: `${a.kind} meets ${a.mates.join(', ')}, not ${b.kind}` };
  const ta = a.size.thread, tb = b.size.thread; if (typeof ta === 'string' && typeof tb === 'string' && ta !== tb) return { ok: false, why: `threads ${ta} and ${tb}` };
  if (a.std && b.std && a.kind === 'fluid' && a.std !== b.std) return { ok: false, why: `${a.std} and ${b.std}: fluid ports of two standards` };
  const [s, h] = a.kind === 'shaft' ? [a, b] : b.kind === 'shaft' ? [b, a] : [undefined, undefined];
  if (s && h && h.kind === 'bore') { const rs = radiusOf(s, 'slot'), rh = radiusOf(h, 'opening') ?? radiusOf(h, 'slot');
    if (rs !== undefined && rh !== undefined && rs > rh * (1 + 1e-9)) return { ok: false, why: `the shaft's ${(rs * 2e3).toFixed(2)} mm is wider than the bore's ${(rh * 2e3).toFixed(2)} mm (their lines' radii)` };
    return { ok: true, why: `a ${s.kind} in a ${h.kind}${rs !== undefined && rh !== undefined ? ` (${(rs * 2e3).toFixed(2)} in ${(rh * 2e3).toFixed(2)} mm)` : ''}` }; }
  return { ok: true, why: `${a.kind} meets ${b.kind}` };
}
/** Whether two things can be joined: two interface records by their kinds' mates and sizes; two blocks by every pair of
 *  their interfaces that mates (each pair said, with why). */
export function compatible(a: Interface | Block, b: Interface | Block): Compatible {
  if (!isBlock(a) && !isBlock(b)) { const m = mates(a, b); return { ok: m.ok, says: `${a.id} and ${b.id}: ${m.ok ? 'they mate' : 'they do not mate'}: ${m.why}`, pairs: m.ok ? [{ a: a.id, b: b.id, kind: a.kind, with: b.kind, why: m.why }] : [] }; }
  const la = isBlock(a) ? interfacesOf(a).list : [a], lb = isBlock(b) ? interfacesOf(b).list : [b], pairs: Compatible['pairs'] = [];
  for (const x of la) for (const y of lb) { const m = mates(x, y); if (m.ok) pairs.push({ a: x.id, b: y.id, kind: x.kind, with: y.kind, why: m.why }); }
  const kinds = [...new Set(pairs.map((p) => `${p.kind}-${p.with}`))];
  return { ok: pairs.length > 0, pairs, says: pairs.length ? `${pairs.length} pair(s) mate (${kinds.join(', ')}): ${pairs.slice(0, 6).map((p) => `${p.a} with ${p.b}`).join('; ')}` : `nothing of the one mates anything of the other (${la.length} and ${lb.length} interfaces)` };
}

// ---- missing interfaces and bad connections ------------------------------------------------------------------------------
/** What a part is by the words of its name: a driver (it turns something), a pump, a supply, a structure. A table of
 *  words, the same for every part (never a named product). */
const DRIVER = /\b(motor|engine|stepper|servo|gear ?motor|actuator)s?\b/i;
const PUMP = /\bpumps?\b/i;
const SUPPLY = /\b(battery|batteries|cell|cells|supply|psu|pack|mains|charger)\b/i;
const STRUCTURE = /\b(frame|base|stand|plate|chassis|bracket|mount|table|bed|rack|skid)s?\b/i;
/** The kinds that must be joined for their piece to work (current in, fluid through, data across). */
const NEEDS: ReadonlySet<InterfaceKind> = new Set(['power', 'fluid', 'data']);
export interface Missing { piece: string; iface?: string; kind?: InterfaceKind; says: string }
/** The interfaces a block leaves unjoined that its pieces need to work: a power, fluid or data line whose piece touches
 *  no piece offering what it meets; a motor that offers no power line at all, or none joined; a pump whose fluid ports
 *  (its inlet) are joined to nothing that carries fluid, or that offers none. */
export function missingInterfaces(b: Block): Missing[] {
  const list = interfacesOf(b).list, nb = neighbours(b), out: Missing[] = [], byPiece = b.pieces.map(() => [] as Interface[]);
  for (const x of list) { const i = pieceOfIface(b, x); if (i >= 0) byPiece[i]!.push(x); }
  const joinedTo = (i: number, kinds: readonly InterfaceKind[]) => nb[i]!.some((j) => byPiece[j]!.some((y) => kinds.includes(y.kind)));
  b.pieces.forEach((p, i) => {
    for (const x of byPiece[i]!) if (NEEDS.has(x.kind) && !joinedTo(i, x.mates)) out.push({ piece: p.name, iface: x.id, kind: x.kind, says: `${x.id}: a ${x.kind} line joined to nothing that meets it (${x.mates.join(', ')})` });
    if (DRIVER.test(p.name) && !PUMP.test(p.name)) { const pw = byPiece[i]!.filter((x) => x.kind === 'power');
      if (!pw.length) out.push({ piece: p.name, kind: 'power', says: `${p.name}: a motor with no power line wired (it offers none; terminal lines are read from a piece's name)` }); }
    if (PUMP.test(p.name) && !DRIVER.test(p.name)) { const fl = byPiece[i]!.filter((x) => x.kind === 'fluid');
      if (!fl.length && !nb[i]!.some((j) => byPiece[j]!.some((y) => y.kind === 'fluid'))) out.push({ piece: p.name, kind: 'fluid', says: `${p.name}: a pump with no inlet joined (no fluid line on it or on anything it touches)` }); }
  });
  return out;
}
export interface Bad { a: string; b: string; says: string }
/** Two pieces joined by a face where what each offers does not meet what the other offers: each offers a line that is
 *  not a mounting one (power, fluid, signal, data, a thread) and no pair of their interfaces mates (a fluid port on a
 *  power stud, a G1/2 port on another standard's, an M6 thread on an M8). */
export function badConnections(b: Block): Bad[] {
  const list = interfacesOf(b).list, byPiece = b.pieces.map(() => [] as Interface[]), out: Bad[] = [], seen = new Set<string>();
  for (const x of list) { const i = pieceOfIface(b, x); if (i >= 0) byPiece[i]!.push(x); }
  const carried = (x: Interface) => NEEDS.has(x.kind) || x.kind === 'signal' || x.kind === 'thread.internal' || x.kind === 'thread.external';
  for (const f of b.faces) { if (!joins(f) || f.a === f.b) continue; const k = [f.a, f.b].sort().join('|'); if (seen.has(k)) continue; seen.add(k);
    const xa = byPiece[f.a]!.filter(carried), xb = byPiece[f.b]!.filter(carried); if (!xa.length || !xb.length) continue;
    const ms = xa.flatMap((x) => xb.map((y) => ({ x, y, m: mates(x, y) })));
    if (ms.some((r) => r.m.ok)) continue; const r = ms[0]!;
    out.push({ a: b.pieces[f.a]!.name, b: b.pieces[f.b]!.name, says: `${r.x.id} meets ${r.y.id} (${f.by}): ${r.m.why}` }); }
  return out;
}

// ---- interference ---------------------------------------------------------------------------------------------------------
/** (`point`: where the critic found the two meet, m, measured from the drawn pieces: a finding, never a place given to a
 *  piece, so it is not named `at`, the key a place written by hand is counted by (scripts/by-hand.mjs)) */
export interface Interfering { a: string; b: string; depth?: number; point: readonly number[]; says: string }
/** Pieces of a block that pass into each other, by the critic's clash finder (make/critic.ts meshClashes) over the block
 *  drawn as its parts (room.ts partOfBlock, make/rules.ts trianglesOf): its "through" meetings between pieces apart.
 *  Decision 0021 makes overlap impossible by the operations, so this is a check that it held; a fit pressed by design is
 *  said from its face (Face.interference), not counted. (Loaded when asked: the drawing modules stay out of the agent's
 *  start.) */
export async function interference(b: Block): Promise<{ list: Interfering[]; pressed: string[] }> {
  const [{ partOfBlock }, { trianglesOf }, { meshClashes }] = await Promise.all([import('./room'), import('./make/rules'), import('./make/critic')]);
  const ms = trianglesOf(partOfBlock(b)), cs = meshClashes(ms, { edge: 'scaled' });
  const list = cs.filter((c) => c.kind === 'through' && c.kin === 'apart').map((c) => ({ a: c.a, b: c.b, ...(c.depth !== undefined ? { depth: c.depth } : {}), point: c.at, says: `${c.a} passes into ${c.b}${c.depth !== undefined ? ` by ${(c.depth * 1000).toFixed(2)} mm` : ''} at ${c.at.map((v) => (v * 1000).toFixed(1)).join(', ')} mm` }));
  const pressed = b.faces.filter((f) => f.interference).map((f) => `${b.pieces[f.a]!.name} in ${b.pieces[f.b]!.name}: pressed ${f.interference!.um} µm by its fit (${f.interference!.src})`);
  return { list, pressed };
}

// ---- search by function ---------------------------------------------------------------------------------------------------
/** Words of doing, read as the words of what does it (a table of plain verbs, the same for every search): "pumps" asks
 *  for a pump and a fluid line, "drives" or "turns" for a motor and a turning line, "water" for a fluid line. */
const DOES: [RegExp, string[], PortClass[]][] = [
  [/^pump(s|ed|ing)?$/, ['pump'], ['fluid']], [/^(drive|drives|driven|driving|turn|turns|spin|spins|rotate|rotates)$/, ['motor'], ['mechanical rotational']],
  [/^(water|fluid|liquid|flow|flows)$/, [], ['fluid']], [/^(power|powers|powered|supply|supplies)$/, ['battery', 'cell', 'supply'], ['electrical power']],
  [/^(hold|holds|support|supports|carry|carries)$/, ['frame', 'base', 'stand'], ['structural mounting']], [/^(light|lights|lit|shine)$/, ['lamp', 'led'], ['optical']],
  [/^(heat|heats|warm|cool|cools)$/, ['heater', 'fan'], ['thermal']], [/^(move|moves|slide|slides|lift|lifts)$/, ['actuator', 'slide'], ['mechanical translational']],
];
const STOP = new Set(['a', 'an', 'the', 'that', 'which', 'something', 'thing', 'part', 'of', 'on', 'in', 'by', 'with', 'for', 'to', 'and', 'it', 'is']);
/** A word stemmed as plainly as it is said (pumps, pumped: pump). */
const stem = (w: string): string => (w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/s$/, '')) || w;
export interface Found { id: string; name: string; score: number; why: string[]; classes: PortClass[] }
/** The classes of connection a block's words say it serves: the kind lineKind reads from its name and aisle, and fluid
 *  for a pump (a read of words, said so, not a build of it). */
function classesOf(d: BlockDef): PortClass[] {
  const words = `${d.name} ${aisleOf(d) ?? ''}`;
  return [...new Set([...classOf(lineKind(`${words}/axis`).kind), ...(PUMP.test(words) ? ['fluid' as const] : [])])];
}
/** Parts found by what they do, not by their name alone: each block that builds (pieces, assemblies, parts you saved)
 *  scored by each word asked (the request's own words stemmed, and the doer a verb names: "pumps" a pump) against its id
 *  and name (3), its aisle (2), its says (1), and 2 for each class of connection asked that its words serve. Best first;
 *  a law, a cell of a body or a reading never answers, since none of them builds. */
export function searchByFunction(words: string, most = 8): Found[] {
  const ws = words.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
  const want = new Set<string>(), asked = new Set<PortClass>();
  for (const w of ws) { want.add(stem(w)); for (const [re, nouns, cls] of DOES) if (re.test(w)) { nouns.forEach((n) => want.add(n)); cls.forEach((c) => asked.add(c)); } }
  const builds = (d: BlockDef) => /^(piece|seed)\./.test(d.id) || d.by === 'you';
  const out: Found[] = [];
  for (const d of LIBRARY.values()) { if (!builds(d)) continue;
    const name = `${d.id} ${d.name}`.toLowerCase(), aisle = (aisleOf(d) ?? '').toLowerCase(), says = (d.says ?? '').toLowerCase(), why: string[] = []; let score = 0;
    const has = (t: string, w: string) => new RegExp(`\\b${w}`).test(t);
    for (const w of want) { if (has(name, w)) { score += 3; why.push(`name: ${w}`); } else if (has(aisle, w)) { score += 2; why.push(`aisle: ${w}`); } else if (has(says, w)) { score += 1; why.push(`says: ${w}`); } }
    if (!score) continue;
    const cls = classesOf(d); for (const c of cls) if (asked.has(c)) { score += 2; why.push(`serves ${c}`); }
    out.push({ id: d.id, name: d.name, score, why, classes: cls }); }
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, most);
}

// ---- alternatives, variants, revisions -----------------------------------------------------------------------------------
/** Other blocks that could stand in for one: those on its aisle (its trade and category), the nearest by the words of
 *  their names shared; each with its aisle. */
export function alternatives(id: string, most = 8): { id: string; name: string; aisle: string; shared: number }[] {
  const d = block(id); if (!d) throw new Error(`no block "${id}"`);
  const aisle = aisleOf(d), words = new Set(d.name.toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  if (!aisle) return [];
  return [...LIBRARY.values()].filter((x) => x.id !== id && aisleOf(x) === aisle)
    .map((x) => ({ id: x.id, name: x.name, aisle, shared: x.name.toLowerCase().split(/\W+/).filter((w) => words.has(w)).length }))
    .sort((a, b) => b.shared - a.shared || a.id.localeCompare(b.id)).slice(0, most);
}
/** A block's variants: each setting with its choices (blocks.ts variantsOf: a family's sizes are its rows). */
export function variantsOf(id: string): ReturnType<typeof variantsOfDef> { const d = block(id); if (!d) throw new Error(`no block "${id}"`); return variantsOfDef(d); }
/** A part remembered, by its revisions as memory.ts keeps them: its version (one more each time it was kept again with
 *  another board), its board's digest, its uses and what it was made for. The store keeps the latest board only, so the
 *  earlier versions are counted, not held. */
export function revisions(id: string): { id: string; version: number; digest: string; uses: number; from: string; says: string } | undefined {
  const p = savedParts().find((x) => x.id === id); if (!p) return undefined;
  return { id: p.id, version: p.version, digest: p.digest, uses: p.uses, from: p.from, says: `${p.id}: version ${p.version}, digest ${p.digest.slice(0, 12)}, used ${p.uses} time${p.uses === 1 ? '' : 's'}; only the latest board is kept` };
}

// ---- the functional gate --------------------------------------------------------------------------------------------------
export interface GatePart { name: string; is: string; names: readonly string[]; node?: string }
export interface Working { ok: boolean; reasons: string[]; notes: string[]; drives: { driver: string; load: string }[] }
/** What a part of a build is for, by its name (then what it is, taken before "driven by", "on" or "by"): a driver, a
 *  supply, a structure, or what is acted on (a load). */
export function roleOf(p: Pick<GatePart, 'name' | 'is'>): 'driver' | 'supply' | 'structure' | 'load' {
  const of = (t: string) => (DRIVER.test(t) && !PUMP.test(t) ? 'driver' : SUPPLY.test(t) ? 'supply' : PUMP.test(t) ? 'load' : STRUCTURE.test(t) ? 'structure' : undefined);
  return of(p.name.replace(/_/g, ' ')) ?? of(p.is.split(/\b(driven|powered|held|carried|on|by|with)\b/)[0] ?? '') ?? 'load';
}
/** Each part's pieces in the whole: by the owner a folded board wrote on them (Piece.owner), else by their names, each
 *  piece once, the parts in their order. */
export function piecesOfParts(whole: Block, parts: readonly GatePart[]): Map<string, number[]> {
  const out = new Map<string, number[]>(parts.map((p) => [p.name, []])), taken = new Set<number>();
  whole.pieces.forEach((pc: Piece, i) => { const o = pc.owner?.[0]; const p = o ? parts.find((q) => (q.node ?? q.name) === o) : undefined; if (p) { out.get(p.name)!.push(i); taken.add(i); } });
  for (const p of parts) { if (out.get(p.name)!.length) continue; const left = new Map<string, number>(); for (const n of p.names) left.set(n, (left.get(n) ?? 0) + 1);
    whole.pieces.forEach((pc, i) => { const n = left.get(pc.name) ?? 0; if (!taken.has(i) && n > 0) { left.set(pc.name, n - 1); out.get(p.name)!.push(i); taken.add(i); } }); }
  return out;
}
/** The functional gate (acceptance 10): after a build, each driver among the parts asked is joined to what it acts on:
 *  its output shaft (its thinnest shaft line, or the piece its name says is a shaft) reaches, by faces that join, a piece of
 *  a part it drives without passing through its own other pieces or a structure's; its power lines, where it offers any,
 *  reach a supply. A driver with nothing to drive among the parts, or no power line on it, is said in the notes (not
 *  checked), never passed silently. Not working: each reason, with the fix it asks. */
export function working(whole: Block, parts: readonly GatePart[]): Working {
  const own = piecesOfParts(whole, parts), nb = neighbours(whole), list = interfacesOf(whole).list, reasons: string[] = [], notes: string[] = [], drives: Working['drives'] = [];
  const byPiece = whole.pieces.map(() => [] as Interface[]); for (const x of list) { const i = pieceOfIface(whole, x); if (i >= 0) byPiece[i]!.push(x); }
  const role = new Map(parts.map((p) => [p.name, roleOf(p)])), partOf = new Map<number, string>(); for (const [n, is] of own) for (const i of is) partOf.set(i, n);
  const loads = parts.filter((p) => role.get(p.name) === 'load' && own.get(p.name)!.length), supplies = parts.filter((p) => role.get(p.name) === 'supply' && own.get(p.name)!.length);
  /** From pieces, by joining faces, never into `wall`: the parts reached. */
  const reach = (from: number[], wall: (i: number) => boolean): Set<string> => { const seen = new Set(from), q = [...from], got = new Set<string>();
    while (q.length) { const i = q.shift()!; for (const j of nb[i]!) { if (seen.has(j)) continue; seen.add(j); const pt = partOf.get(j); if (pt) got.add(pt); if (wall(j)) continue; q.push(j); } } return got; };
  for (const d of parts.filter((p) => role.get(p.name) === 'driver')) {
    const mine = own.get(d.name)!; if (!mine.length) { reasons.push(`${d.name}: none of its pieces is in the whole`); continue; }
    const shafts = mine.filter((i) => byPiece[i]!.some((x) => x.kind === 'shaft')), named = shafts.filter((i) => /\b(shaft|spindle|axle|output)\b/i.test(whole.pieces[i]!.name));
    const thin = (i: number) => Math.min(...byPiece[i]!.filter((x) => x.kind === 'shaft').map((x) => radiusOf(x, 'slot') ?? Infinity));
    const out = named.length ? named : shafts.length ? [shafts.reduce((a, b) => (thin(b) < thin(a) ? b : a))] : [];
    if (!loads.length) notes.push(`${d.name}: no part among those asked for it to drive; its shaft not checked`);
    else if (!out.length) reasons.push(`${d.name}: offers no shaft line to drive with`);
    else { const wall = (i: number) => mine.includes(i) || role.get(partOf.get(i) ?? '') === 'structure' || role.get(partOf.get(i) ?? '') === 'load';
      const got = reach(out, wall), hit = loads.filter((l) => got.has(l.name));
      if (hit.length) hit.forEach((l) => drives.push({ driver: d.name, load: l.name }));
      else reasons.push(`${d.name} drives nothing: its shaft (${whole.pieces[out[0]!]!.name}) is joined to no piece of ${loads.map((l) => l.name).join(' or ')}; join the shaft to what it drives (over or through its shaft line, or a coupling between them)`); }
    const pw = mine.filter((i) => byPiece[i]!.some((x) => x.kind === 'power'));
    if (!pw.length) notes.push(`${d.name}: offers no power line, so its supply is not checked`);
    else { const got = reach(pw, (i) => mine.includes(i)); if (!supplies.some((s) => got.has(s.name)) && ![...got].some((n) => n !== d.name && own.get(n)!.some((i) => byPiece[i]!.some((x) => x.kind === 'power'))))
      reasons.push(`${d.name}: its power line (${byPiece[pw[0]!]!.find((x) => x.kind === 'power')!.id}) is joined to no supply`); }
  }
  return { ok: !reasons.length, reasons, notes, drives };
}

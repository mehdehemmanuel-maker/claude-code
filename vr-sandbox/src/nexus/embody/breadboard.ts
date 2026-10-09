// A circuit on a solderless breadboard, laid out from its nets and checked against them. An 830-point board conducts
// along each half-row of five holes (a–e above the centre channel, f–j below it) and along each of its four rails, and
// nowhere else. A circuit is laid on it right only when the conductors its leads and jumpers join are exactly its nets:
// two leads joined that the circuit keeps apart is a short, two leads of one net left apart is an open.
//
// The layout follows from the nets, not from where any part is meant to go: a supply net goes to a rail; every other
// net is given a half-row, and another joined to it by a jumper when its leads outnumber a half-row's holes; a part with
// three leads or more takes consecutive half-rows down its pins, each pin's half-row joined to its net where the net is
// already elsewhere; a two-lead part goes from its first net's half-row to its second's, across the channel where the
// row is free, or into the rail where the net is a supply. Then the check is run on what was laid, not on what was meant.

import { BREADBOARD } from './stock';
import type { Flaw, V3, Value } from './part';

/** One lead of a part and the net it belongs to. */
export interface Pin { name: string; net: string; /** the current through this lead at its worst, A */ I?: number }
export interface Component { id: string; name: string; pins: Pin[]; body: V3; colour: number; values?: Value[]; /** where it leaves the board, for a header or a terminal */ to?: string; /** rows between its pins: 2 for a 5.08 mm terminal */ every?: number;
  /** a two-lead part's leads at least so many rows apart along one side, its body lying between them (a 1/4 W resistor's
   *  four: its body and its bends, IPC-A-610's lead forming): never across the channel, which is too short for it */ span?: number;
  /** off the board on its own leads (a battery holder), into the rails */ flying?: boolean }
/** A hole: a row 0…62 along the board, and a column: 0–4 a–e, 5–9 f–j; the rails -1 top +, -2 top −, 10 bottom +, 11 bottom −. */
export interface Hole { row: number; col: number }
export interface Placed { comp: Component; holes: Hole[] }
export interface Jumper { net: string; from: Hole; to: Hole }
export interface Rails { topPlus: string; topMinus: string; bottomPlus: string; bottomMinus: string }
export interface Layout { placed: Placed[]; jumpers: Jumper[]; rails: Rails; /** what the board cannot carry, and why */ refused: { id: string; why: string }[]; opens: string[]; shorts: string[]; flaws: Flaw[] }

const HALF = 5;
/** The conductor a hole is on. */
export const conductorOf = (h: Hole): string => (h.col === -1 ? 'rail top +' : h.col === -2 ? 'rail top −' : h.col === 10 ? 'rail bottom +' : h.col === 11 ? 'rail bottom −' : `${h.col < 5 ? 'upper' : 'lower'} ${h.row + 1}`);

/** A circuit laid on a board of this topology: an 830-point breadboard by default, or another of `rows` columns of
 *  half-rows (a Perma-Proto half: 30). */
export function layOut(all: Component[], rails: Rails, rating = Infinity, o: { rows?: number } = {}): Layout {
  const ROWS = o.rows ?? BREADBOARD.rows;
  // what its clips cannot carry stays off it, with every part that serves it on a net of their own: what is left is
  // joined to them only by a supply or by a net that leaves the board through a header
  const railNets0 = new Set([rails.topPlus, rails.topMinus, rails.bottomPlus, rails.bottomMinus]);
  const refused = new Map<string, string>();
  for (const c of all) { const I = Math.max(0, ...c.pins.map((p) => p.I ?? 0)); if (I > rating) refused.set(c.id, `a lead of it carries ${I.toFixed(1)} A, past the ${rating} A its clips are rated for`); }
  const leaving = new Set(all.filter((c) => c.to && !refused.has(c.id)).flatMap((c) => c.pins.map((p) => p.net)));
  for (let grew = true; grew;) {
    grew = false;
    for (const c of all) {
      if (refused.has(c.id) || c.to) continue;
      const shared = c.pins.find((p) => !railNets0.has(p.net) && !leaving.has(p.net) && all.some((d) => refused.has(d.id) && d.pins.some((q) => q.net === p.net)));
      if (shared) { refused.set(c.id, `it serves ${all.find((d) => refused.has(d.id) && d.pins.some((q) => q.net === shared.net))!.name} on ${shared.net}`); grew = true; }
    }
  }
  // a header keeps the pins whose nets something else on the board uses
  const kept = all.filter((c) => !refused.has(c.id));
  const comps = kept.map((c) => (c.to ? { ...c, pins: c.pins.filter((p) => kept.some((d) => d !== c && d.pins.some((q) => q.net === p.net))) } : c)).filter((c) => c.pins.length >= (c.to ? 1 : 2));
  const used = new Set<string>(), key = (h: Hole) => `${h.row}:${h.col}`;
  const take = (h: Hole) => { used.add(key(h)); return h; };
  const owner = new Map<string, string>(); // half-row conductor → net
  const halves = new Map<string, Hole[]>(); // net → the half-rows it has (as their first hole), in order
  const jumpers: Jumper[] = [], placed: Placed[] = [];
  const railCol = (net: string, near: 'top' | 'bottom'): number | null => {
    const top = net === rails.topPlus ? -1 : net === rails.topMinus ? -2 : null, bot = net === rails.bottomPlus ? 10 : net === rails.bottomMinus ? 11 : null;
    return near === 'top' ? top ?? bot : bot ?? top;
  };
  const isRail = (net: string) => railCol(net, 'top') !== null;
  /** A free hole in a half-row, so long as `keep` more stay free after it (a lead leaves one for the jumper an extension needs). */
  const freeIn = (row: number, upper: boolean, keep = 0): Hole | null => { const free = Array.from({ length: HALF }, (_, c) => ({ row, col: upper ? 4 - c : 5 + c })).filter((h) => !used.has(key(h))); return free.length > keep ? free[0]! : null; };
  const halfFree = (row: number, upper: boolean) => row >= 0 && row < ROWS && !owner.has(conductorOf({ row, col: upper ? 0 : 5 }));
  let cursor = 1;
  const nextRow = (upper: boolean, from = cursor) => { let r = from; while (r < ROWS && !halfFree(r, upper)) r++; return r; };
  const claim = (net: string, row: number, upper: boolean): Hole => { const first = { row, col: upper ? 4 : 5 }; owner.set(conductorOf(first), net); halves.set(net, [...(halves.get(net) ?? []), first]); return first; };
  /** A free hole on `net`: in the rail by `row`, or in one of its half-rows, opening another (and its jumper) when they are full. */
  const holeOn = (net: string, row: number, upper: boolean): Hole => {
    const rc = railCol(net, upper ? 'top' : 'bottom');
    if (rc !== null) { for (let d = 0; d < ROWS; d++) for (const r of [row + d, row - d]) { if (r < 0 || r >= ROWS) continue; const h = { row: r, col: rc }; if (!used.has(key(h))) return take(h); } }
    for (const first of halves.get(net) ?? []) { const h = freeIn(first.row, first.col < 5, 1); if (h) return take(h); }
    const prev = (halves.get(net) ?? []).at(-1);
    const r = nextRow(upper, Math.max(row, cursor)), first = claim(net, r, upper); cursor = Math.max(cursor, r + 1);
    if (prev) { const a = freeIn(prev.row, prev.col < 5)!, b = freeIn(first.row, upper)!; take(a); take(b); jumpers.push({ net, from: a, to: b }); }
    return take(freeIn(first.row, upper)!);
  };
  /** Join a pin's own half-row to where its net already is: to the rail, or to the net's half-row. */
  const joinTo = (net: string, at: Hole) => {
    const upper = at.col < 5, rc = railCol(net, upper ? 'top' : 'bottom');
    const a = take(freeIn(at.row, upper)!);
    if (rc !== null) { const b = holeOn(net, at.row, upper); jumpers.push({ net, from: a, to: b }); return; }
    const other = (halves.get(net) ?? []).find((f) => !(f.row === at.row && (f.col < 5) === upper));
    if (other) { const b = take(freeIn(other.row, other.col < 5) ?? holeOn(net, other.row, other.col < 5)); jumpers.push({ net, from: a, to: b }); }
  };

  // the two grounds and any rail that carries one net twice are one conductor: joined across the board
  const railNets = [rails.topPlus, rails.topMinus, rails.bottomPlus, rails.bottomMinus];
  for (const [i, j] of [[0, 2], [0, 3], [1, 2], [1, 3]] as const) if (railNets[i] === railNets[j]) { const ci = [-1, -2, 10, 11][i]!, cj = [-1, -2, 10, 11][j]!; const a = take({ row: 0, col: ci }), b = take({ row: 0, col: cj }); jumpers.push({ net: railNets[i]!, from: a, to: b }); }

  for (const comp of comps) {
    const n = comp.pins.length;
    if (n >= 3 || comp.to) {
      // down consecutive half-rows of the upper side, one pin to each, each joined to its net where the net is already
      const e = comp.every ?? 1;
      let r = cursor; while (r + (n - 1) * e < ROWS && !Array.from({ length: n }, (_, k) => halfFree(r + k * e, true)).every(Boolean)) r++;
      const holes: Hole[] = [];
      comp.pins.forEach((p, k) => {
        const already = isRail(p.net) || (halves.get(p.net)?.length ?? 0) > 0;
        const first = { row: r + k * e, col: 4 }; owner.set(conductorOf(first), p.net);
        if (!isRail(p.net)) halves.set(p.net, [...(halves.get(p.net) ?? []), first]);
        holes.push(take(freeIn(r + k * e, true)!));
        if (already) joinTo(p.net, first);
      });
      cursor = r + (n - 1) * e + 2;
      placed.push({ comp, holes });
      continue;
    }
    // two leads: the first on its net, the second across the channel from it where that half-row is free for its net
    const [p1, p2] = comp.pins as [Pin, Pin];
    const h1 = holeOn(p1.net, cursor, true);
    let h2: Hole;
    // (a part that must span so many rows lies along its side, its second net given the half-row that far on, its lead
    // in the same row of holes as the first where it is free)
    if (comp.span && !isRail(p1.net) && !isRail(p2.net) && !(halves.get(p2.net)?.length)) {
      const upper = h1.col < 5, r2 = nextRow(upper, h1.row + comp.span);
      if (r2 < ROWS) { claim(p2.net, r2, upper); const same = { row: r2, col: h1.col }; h2 = take(used.has(key(same)) ? freeIn(r2, upper)! : same); cursor = Math.max(cursor, r2 + 1); placed.push({ comp, holes: [h1, h2] }); continue; }
    }
    const across = h1.col >= 0 && h1.col < 5 && !isRail(p2.net) && !(halves.get(p2.net)?.length) && halfFree(h1.row, false);
    if (across) { claim(p2.net, h1.row, false); h2 = take(freeIn(h1.row, false)!); }
    else h2 = holeOn(p2.net, h1.row + (isRail(p2.net) ? 0 : 3), h1.col < 5);
    placed.push({ comp, holes: [h1, h2] });
  }

  const { opens, shorts } = check({ placed, jumpers });
  const flaws: Flaw[] = [
    ...opens.map((s) => ({ check: 'open', where: 'breadboard', says: `open: ${s}`, law: 'a net is one conductor: every lead of it joined', value: 1, limit: 0, remedy: null })),
    ...shorts.map((s) => ({ check: 'short', where: 'breadboard', says: `short: ${s}`, law: 'two nets never share a conductor', value: 1, limit: 0, remedy: null })),
  ];
  return { placed, jumpers, rails, refused: [...refused].map(([id, why]) => ({ id, why })), opens, shorts, flaws };
}

/** A circuit laid tidily on a stripboard to be soldered (a Perma-Proto half: 30 columns of half-rows, its rails along
 *  both sides), from its nets: a part off the board on flying leads into the top rails two columns apart at the left
 *  (two rails' pads side by side would bridge); the outer rail's net (the top +) brought to a column's half-row by an
 *  insulated link, as a bare lead across the inner rail's pads would join the rails; every other net a column's
 *  upper half-row, the next free; a part with a span lying flat along row c from its first net's column to its second's,
 *  at least that many columns on, the holes under its body taken; a part from a half-row to the inner rail standing in
 *  its half-row's column, its first lead in row a and its second in the rail beside it, standing parts as many
 *  columns apart as their bodies are wide (a 5 mm LED's 5.8 mm rim: three). What fits none of these is
 *  refused with why. Then the board's joins are checked against the nets, as a breadboard's are. */
export function layProto(all: Component[], rails: Rails, rows = 30): Layout {
  const used = new Set<string>(), key = (h: Hole) => `${h.row}:${h.col}`, take = (h: Hole) => { used.add(key(h)); return h; };
  const free = (h: Hole) => h.row >= 0 && h.row < rows && !used.has(key(h));
  const outer = rails.topPlus, inner = rails.topMinus, strips = new Map<string, number>(), placed: Placed[] = [], jumpers: Jumper[] = [], refused: { id: string; why: string }[] = [];
  let next = 0, lastStand = -Infinity, lastW = 0;
  // (the nets a standing part goes on, and how wide its body is: their columns kept clear of each other's bodies)
  const hosts = new Map<string, number>();
  for (const c of all) if (!c.flying && c.pins.length === 2 && c.pins[1]!.net === inner && c.pins[0]!.net !== inner) hosts.set(c.pins[0]!.net, Math.max(hosts.get(c.pins[0]!.net) ?? 0, c.body[0]));
  for (const c of all.filter((d) => d.flying)) {
    const cols = c.pins.map((p) => (p.net === outer ? -1 : p.net === inner ? -2 : null));
    if (cols.some((k) => k === null) || c.pins.length !== 2) { refused.push({ id: c.id, why: 'its flying leads go only to the top rails' }); continue; }
    const gap = c.span ?? 2, holes = [take({ row: next, col: cols[0]! }), take({ row: next + gap, col: cols[1]! })]; next += gap + 2; placed.push({ comp: c, holes });
  }
  const stripOf = (net: string, at?: number): number => {
    const had = strips.get(net); if (had !== undefined) return had;
    let r = Math.max(next, at ?? next); const w = hosts.get(net);
    if (w !== undefined) { r = Math.max(r, lastStand + Math.ceil(Math.max(w, lastW) / BREADBOARD.pitch)); lastStand = r; lastW = w; }
    strips.set(net, r); next = Math.max(next, r + 1);
    if (net === outer) { const a = take({ row: r, col: 0 }), b = take({ row: r, col: -1 }); jumpers.push({ net, from: a, to: b }); }
    return r;
  };
  for (const c of all.filter((d) => !d.flying)) {
    if (c.pins.length !== 2) { refused.push({ id: c.id, why: 'only two-lead parts are laid on a stripboard here yet' }); continue; }
    const [p1, p2] = c.pins as [Pin, Pin];
    if (p2.net === inner && p1.net !== inner) {
      const r = stripOf(p1.net), a = { row: r, col: 0 }, b = { row: r, col: -2 };
      if (!free(a) || !free(b)) { refused.push({ id: c.id, why: `its column (${r + 1}) is taken at row a or the rail` }); continue; }
      placed.push({ comp: c, holes: [take(a), take(b)] }); continue;
    }
    if (p1.net === inner || p2.net === outer || p1.net === outer && !c.span) { refused.push({ id: c.id, why: `${p1.net} to ${p2.net}: lay it with its lead to the inner rail second, or give it a span` }); continue; }
    const s = c.span ?? 1, A = stripOf(p1.net), B = strips.get(p2.net) ?? stripOf(p2.net, A + s);
    if (Math.abs(B - A) < s) { refused.push({ id: c.id, why: `its nets' columns are ${Math.abs(B - A)} apart: it needs ${s}` }); continue; }
    const row = [2, 3, 1, 4].find((k) => free({ row: A, col: k }) && free({ row: B, col: k }) && Array.from({ length: Math.abs(B - A) - 1 }, (_, i) => free({ row: Math.min(A, B) + 1 + i, col: k })).every(Boolean));
    if (row === undefined) { refused.push({ id: c.id, why: `no row free from column ${A + 1} to ${B + 1}` }); continue; }
    for (let i = Math.min(A, B) + 1; i < Math.max(A, B); i++) take({ row: i, col: row });
    placed.push({ comp: c, holes: [take({ row: A, col: row }), take({ row: B, col: row })] });
  }
  const { opens, shorts } = check({ placed, jumpers });
  const flaws: Flaw[] = [...opens.map((x) => ({ check: 'open', where: 'stripboard', says: `open: ${x}`, law: 'a net is one conductor: every lead of it joined', value: 1, limit: 0, remedy: null })),
    ...shorts.map((x) => ({ check: 'short', where: 'stripboard', says: `short: ${x}`, law: 'two nets never share a conductor', value: 1, limit: 0, remedy: null }))];
  return { placed, jumpers, rails, refused, opens, shorts, flaws };
}

/** What the board joins, by its strips and rails and the jumpers laid on it, against the nets the circuit has. */
export function check(l: { placed: Placed[]; jumpers: Jumper[] }): { opens: string[]; shorts: string[] } {
  const parent = new Map<string, string>();
  const find = (x: string): string => { const p = parent.get(x) ?? x; if (p === x) return x; const r = find(p); parent.set(x, r); return r; };
  const unite = (a: string, b: string) => parent.set(find(a), find(b));
  for (const j of l.jumpers) unite(conductorOf(j.from), conductorOf(j.to));
  const leads = l.placed.flatMap((p) => p.comp.pins.map((pin, i) => ({ id: `${p.comp.id}.${pin.name}`, net: pin.net, at: find(conductorOf(p.holes[i]!)) })));
  const opens: string[] = [], shorts: string[] = [];
  const byNet = new Map<string, typeof leads>();
  for (const x of leads) byNet.set(x.net, [...(byNet.get(x.net) ?? []), x]);
  for (const [net, xs] of byNet) if (new Set(xs.map((x) => x.at)).size > 1) opens.push(`${net} is in ${new Set(xs.map((x) => x.at)).size} pieces (${xs.map((x) => x.id).join(', ')})`);
  const byConductor = new Map<string, Set<string>>();
  for (const x of leads) byConductor.set(x.at, new Set([...(byConductor.get(x.at) ?? []), x.net]));
  for (const [c, nets] of byConductor) if (nets.size > 1) shorts.push(`${[...nets].join(' and ')} on ${c}`);
  return { opens, shorts };
}

/** Where a hole is, on a board lying flat with its centre at `at`, its rows along x. */
export function holeAt(h: Hole, at: V3): V3 {
  const p = BREADBOARD.pitch, x = at[0] + (h.row - (BREADBOARD.rows - 1) / 2) * p;
  const z = h.col === -1 ? -8.5 : h.col === -2 ? -9.5 : h.col === 10 ? 8.5 : h.col === 11 ? 9.5 : h.col < 5 ? -(1.5 + (4 - h.col)) : 1.5 + (h.col - 5);
  return [x, at[1], at[2] + z * p];
}

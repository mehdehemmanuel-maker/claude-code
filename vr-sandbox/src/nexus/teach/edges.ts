// Edges: the language every lesson is said in. A thing in a build offers features (its leads, a board's plated holes
// and pads, a cell's terminals) and a tool offers what it does (a tip held at a temperature, a flush edge that cuts
// copper up to a size, clips that hold a board by its ends). An edge is a process joining the two: what it needs of
// both ends (the tip above the alloy's melt; a lead thinner than its hole; a bend clear of the body), what it gives (a
// joint, a lead cut to so long, a lit LED), what must come before it, and its source. A build's edges are every such
// meeting its things and tools make; its lesson is those edges in the order each needs, the same edge over the same
// figures said once for all of them (eight leads soldered alike are one step), every step's words made from its edge's
// figures. So the same setup is always taught the same way; a new build on the same kinds of things is taught right
// the first time; a figure changed in one place changes every lesson resting on it; and a build that cannot be done (a
// lead too thick for its hole, a bend too tight for its body, a wire too thick for the cutters) is refused, with why,
// before anyone tries it.
// Owner of: the edge kinds, a build's edges, the steps said from them, and the current cells light an LED with.

import type { Hole, Layout } from '../embody/breadboard';
import { PP, ppCol } from '../machines/kit-solder';
import { axialBody } from '../boards/packages';
import { ALLOYS, idealVolume, timeToMelt, type JointShape } from './solder-joint';

export const ADAFRUIT_GUIDE = 'Adafruit Guide to Excellent Soldering (learn.adafruit.com/adafruit-guide-excellent-soldering)';
/** How far a trimmed lead may stand out of its joint: its end seen in the solder, at most 2.5 mm (IPC-A-610's lead
 *  protrusion for a plated hole, class 2); at least 0.6 here, so a cut does not bite the fillet. */
export const PROTRUSION = { min: 0.6, max: 2.5 } as const;
/** IPC-A-610's lead forming: a lead runs straight out of its body at least a lead's diameter (0.8 mm at most needed)
 *  before its bend, and bends round at least its own diameter inside. */
export const LEAD_BEND = { clear: 0.8, radius: 1 } as const;

export type XZ = [number, number];
/** A board a lead goes through: its plated holes' size, its length, and a hole said in words from its place (its
 *  own mm); the holes one strip of copper joins (so what touches what can be said). */
export interface Board { name: string; L: number; t: number; drill: number; pad: number; pitch: number; hole: (at: XZ) => string | null; strip: (at: XZ) => string | null; src: string }
const ROWS = 'abcdefghij', near = (a: number, b: number) => Math.abs(a - b) < 0.05;
const ppColOf = (x: number): number | null => { const c = Math.round((x - ppCol(1)) / PP.pitch) + 1; return c >= 1 && c <= PP.cols && near(ppCol(c), x) ? c : null; };
/** A Perma-Proto's hole in words: "row c, column 5", "the + rail at column 1"; null where it has no hole. */
export function ppHole([x, z]: XZ): string | null {
  const c = ppColOf(x); if (c === null) return null;
  const r = PP.rowsZ.findIndex((q) => near(q, z)); if (r >= 0) return `row ${ROWS[r]}, column ${c}`;
  if (PP.plus.some((q) => near(q, z))) return `the + rail at column ${c}`;
  if (PP.minus.some((q) => near(q, z))) return `the − rail at column ${c}`;
  return null;
}
/** Which strip of a Perma-Proto's copper a hole is on: a column's five (a–e or f–j), or a rail its whole length. */
export function ppStrip([x, z]: XZ): string | null {
  const c = ppColOf(x); if (c === null) return null;
  const r = PP.rowsZ.findIndex((q) => near(q, z)); if (r >= 0) return `column ${c}, ${r < 5 ? 'a–e' : 'f–j'}`;
  const p = PP.plus.findIndex((q) => near(q, z)); if (p >= 0) return `${p === 0 ? 'upper' : 'lower'} + rail`;
  const m = PP.minus.findIndex((q) => near(q, z)); if (m >= 0) return `${m === 0 ? 'upper' : 'lower'} − rail`;
  return null;
}
export const PERMA_PROTO_HALF: Board = { name: 'the Perma-Proto', L: PP.L, t: PP.t, drill: PP.drill, pad: PP.pad, pitch: PP.pitch, hole: ppHole, strip: ppStrip, src: 'Adafruit\'s Perma-Proto half board file (1609): 1.2 mm drills in 1.93 mm pads, 1.6 mm FR-4' };

/** A lead of a thing as it goes in: what it is called on the thing ("its long lead, the anode"), a short name for a
 *  check ("red"), its pin (round across, or square on a side), the hole it goes in (the board's mm). */
export interface Lead { name: string; tag: string; pin: number; round: boolean; at: XZ }
/** How a thing goes into its holes, which says how its step is put: an axial part bent to its span; a radial part
 *  pushed in on its legs; a link of wire stripped and bent to a staple; a thing off the board on its own leads. */
export type Form = 'axial' | 'radial' | 'link' | 'flying';
export interface Thing {
  id: string; name: string; form: Form; leads: Lead[];
  /** an axial part's rating, W (its body's size from packages.ts's axialBody) */ watts?: number;
  /** a polar part's mark and the lead it is by ("the flat on its rim", by the cathode) */ mark?: { what: string; by: number };
  /** a link's wire: its gauge, its stripped ends, mm */ wire?: { awg: number; strip: number };
  /** made ready before it goes in, and how that is seen ("two AA cells in it, its knife switch up (open)") */ ready?: { do: string; check: string };
  /** off the board on its own leads: in once the board is held, so it does not hang from the board as it is turned */ hangs?: boolean;
  /** how high it stands off the board, mm: the lowest go in first, so each lies flat on the bench when the board is
   *  turned over (typical practice) */ height?: number;
  /** the library's words for it, which the bench draws it by ("resistor 330", "led green 5mm") */ draw?: string;
}
/** A Perma-Proto's hole for a stripboard layout's (src/nexus/embody/breadboard.ts): its column the layout's row + 1,
 *  rows a–j its columns 0–9, the top rails −1 (+) and −2 (−), the bottom 10 (+) and 11 (−). */
export const ppAt = (h: Hole): XZ => [ppCol(h.row + 1), h.col === -1 ? PP.plus[0] : h.col === -2 ? PP.minus[0] : h.col === 10 ? PP.plus[1] : h.col === 11 ? PP.minus[1] : PP.rowsZ[h.col]!];
/** How a laid-out part goes in (the layout knows only its nets and holes): its name, its form, its leads' names in
 *  its pins' order, and the rest a Thing says. */
export type PartHow = Omit<Thing, 'id' | 'leads'> & { leads: Omit<Lead, 'at'>[] };
/** A build from a circuit laid on a Perma-Proto: each part where the layout put it, each of the layout's links a piece
 *  of 22 AWG solid hook-up wire stripped 6 mm (Adafruit's 1311), with the tools and the circuit closed at the end. */
export function buildOn(board: Board, l: Layout, how: Record<string, PartHow>, tools: Tool[], power?: Power): Build {
  const things: Thing[] = l.placed.map((p) => { const h = how[p.comp.id]; if (!h) throw new Error(`no words for how ${p.comp.id} goes in`); return { ...h, id: p.comp.id, leads: h.leads.map((q, i) => ({ ...q, at: ppAt(p.holes[i]!) })) }; });
  l.jumpers.forEach((j, i) => things.push({ id: `link${i ? i + 1 : ''}`, name: i ? `link ${i + 1}` : 'the link', form: 'link', wire: { awg: 22, strip: 6 }, height: 1.5,
    leads: [{ name: 'its end', tag: board.hole(ppAt(j.from))?.replace(/^the /, '') ?? 'one end', pin: 0.644, round: true, at: ppAt(j.from) }, { name: 'its other end', tag: board.hole(ppAt(j.to))?.replace(/^the /, '').replace(/ at column \d+$/, '') ?? 'other end', pin: 0.644, round: true, at: ppAt(j.to) }] }));
  return { board, things, tools, ...(power ? { power } : {}) };
}
export type Role = 'iron' | 'solder' | 'cleaner' | 'cutters' | 'hands' | 'stand';
/** A tool as an edge reads it: its role, its name in a sentence, its price key, its figures. */
export interface Tool { role: Role; name: string; key: string; fig: Record<string, number>; alloy?: string; src: string }
/** An LED of the circuit and the resistor in series with it: its drop at 20 mA and how that moves with current
 *  (n·kT/q), its largest current. */
export interface Lamp { id: string; name: string; ohms: number; vf20: number; nVt: number; max: number }
/** The circuit closed at the end: so many cells (their voltage fresh and inside resistance), each LED with its
 *  resistor across them side by side, the switch that closes it. */
export interface Power { source: string; cells: number; cell: number; rCell: number; lamps: Lamp[]; closes: string; src: string }
export interface Build { board: Board; things: Thing[]; tools: Tool[]; power?: Power }

/** The current a set of cells drives through each LED and its resistor, the branches side by side: each LED's drop at
 *  the current found and the current from that drop till they agree, the cells' own resistance taking its share of
 *  them all. */
export function ledCurrents(p: Power): { v: number; lamps: { id: string; name: string; ohms: number; mA: number; vf: number }[] } {
  const v = p.cell * p.cells, r = p.cells * p.rCell; let at = v, lamps: { id: string; name: string; ohms: number; mA: number; vf: number }[] = [];
  for (let k = 0; k < 40; k++) {
    lamps = p.lamps.map((l) => { let mA = Math.max(0, (at - l.vf20) / l.ohms) * 1000, vf = l.vf20;
      for (let j = 0; j < 12; j++) { vf = l.vf20 + l.nVt * Math.log(Math.max(1e-3, mA) / 20); mA = Math.max(0, (at - vf) / l.ohms) * 1000; }
      return { id: l.id, name: l.name, ohms: l.ohms, mA, vf }; });
    at = v - (r * lamps.reduce((a, l) => a + l.mA, 0)) / 1000;
  }
  return { v, lamps };
}
/** The first LED's current, its drop, and the cells' voltage. */
export function ledCurrent(p: Power): { mA: number; v: number; vf: number } { const c = ledCurrents(p), l = c.lamps[0]; return { mA: l?.mA ?? 0, v: c.v, vf: l?.vf ?? 0 }; }

export type EdgeKind = 'insert' | 'hold' | 'tin' | 'solder' | 'trim' | 'power' | 'rest';
/** A step said from an edge (or from several alike): what to do, how you can tell it is done, the things it is on,
 *  its figures and sources. */
export interface Said { kind: EdgeKind; things: string[]; do: string; check?: string; src: string }
/** A lead in its hole as the joint model takes it. */
export const jointOf = (b: Board, l: Lead): JointShape => ({ board: b.t, hole: b.drill, pad: b.pad, pin: l.pin, round: l.round, src: `${b.src}; its lead's own size` });

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number): string => WORDS[n] ?? String(n);
const mm = (v: number): string => (Math.abs(v - Math.round(v)) < 0.005 ? String(Math.round(v)) : v.toFixed(2).replace(/0$/, ''));
const across = (l: Lead): number => (l.round ? l.pin : l.pin * Math.SQRT2);
const tool = (b: Build, r: Role): Tool | undefined => b.tools.find((t) => t.role === r);
/** Two holes in words: "row c, columns 5 and 9" where they share a row, else each said. */
function both(b: Board, a: XZ, c: XZ): string {
  const p = b.hole(a)!, q = b.hole(c)!, m = /^(row \w), column (\d+)$/.exec(p), n = /^(row \w), column (\d+)$/.exec(q);
  return m && n && m[1] === n[1] ? `${m[1]}, columns ${m[2]} and ${n[2]}` : `${p} and ${q}`;
}
/** The short form of a hole for a check: "+" or "−" for a rail, else the hole. */
const short = (b: Board, a: XZ): string => { const h = b.hole(a)!; return /\+ rail/.test(h) ? '+' : /− rail/.test(h) ? '−' : h; };

/** Why a thing cannot go into its holes as the build has it, or null. */
function insertRefusal(b: Board, t: Thing): string | null {
  for (const l of t.leads) {
    if (!b.hole(l.at)) return `${t.name}'s ${l.tag} lead is not over a hole of ${b.name}`;
    if (across(l) >= b.drill) return `${t.name}'s ${l.tag} lead is ${mm(across(l))} mm across${l.round ? '' : ' corner to corner'}: ${b.name}'s holes are ${mm(b.drill)} mm, so it does not go in`;
  }
  if (t.form === 'axial') {
    const [body] = axialBody(t.watts ?? 0.25), d = t.leads[0]!.pin, need = body + 2 * (Math.min(d, LEAD_BEND.clear) + LEAD_BEND.radius * d + d / 2), span = dist(t.leads[0]!.at, t.leads[1]!.at);
    if (span < need - 1e-6) return `${t.name}'s holes are ${mm(span)} mm apart: its ${mm(body)} mm body needs at least ${mm(need)} (IPC-A-610: a lead straight a diameter out of the body, then bent round its own diameter), so ${Math.ceil(need / b.pitch)} holes`;
  }
  return null;
}
const dist = (a: XZ, c: XZ): number => Math.hypot(a[0] - c[0], a[1] - c[1]);
/** What else a hole is joined to by its strip, among the things put in before (its words, or ''). */
function joined(b: Board, at: XZ, before: Thing[]): string {
  const s = b.strip(at); if (!s) return '';
  const on = before.flatMap((t) => t.leads.filter((l) => b.strip(l.at) === s).map(() => t.name));
  return !on.length ? '' : /rail/.test(s) ? `, on the ${s.replace(/^(upper|lower) /, '')} with ${on[0]}'s` : `, on ${on[0]}'s strip`;
}
/** An insert edge said: how its form goes in, from its holes. */
function insertSaid(b: Board, t: Thing, before: Thing[]): Said {
  const [a, c] = t.leads as [Lead, Lead], src = `${ADAFRUIT_GUIDE}; ${b.src}`;
  if (t.form === 'axial') {
    const n = Math.round(dist(a.at, c.at) / b.pitch), on = t.leads.map((l) => [l, joined(b, l.at, before)] as const).filter(([, j]) => j).map(([l, j]) => `its ${l.tag} lead${j.replace(/^,/, '')}`);
    return { kind: 'insert', things: [t.id], do: `Bend ${t.name}'s leads down at its body to span ${count(n)} holes (${mm(dist(a.at, c.at))} mm) and push it into ${both(b, a.at, c.at)}${on.length ? ` (${on.join('; ')})` : ''}; bend its leads out a little under the board so it stays.`, check: 'it lies flat on the board', src: `${src}; IPC-A-610's lead forming` };
  }
  if (t.form === 'radial') {
    const m = t.mark, marked = m ? t.leads[m.by]! : null;
    return { kind: 'insert', things: [t.id], do: `Push ${t.name} in: ${a.name} into ${b.hole(a.at)}${joined(b, a.at, before)}; ${c.name} into ${b.hole(c.at)}${joined(b, c.at, before)}.`, ...(m && marked ? { check: `${m.what} toward ${b.hole(marked.at)}` } : {}), src };
  }
  if (t.form === 'link') {
    const n = Math.round(dist(a.at, c.at) / b.pitch), w = t.wire!, crossed = crossings(b, a.at, c.at);
    return { kind: 'insert', things: [t.id], do: `Strip ${mm(w.strip)} mm off each end of a piece of ${w.awg} AWG solid hook-up wire, bend it to a staple ${count(n)} holes across, and push it from ${b.hole(a.at)}, into ${b.hole(c.at)}.`,
      check: crossed.length ? `its insulation lies over the ${crossed.join(' and ')}'s pads it crosses: bare wire there would join them` : 'it lies flat, both ends through', src };
  }
  return { kind: 'insert', things: [t.id], do: `${t.ready ? `${t.ready.do}; push` : 'Push'} ${a.name} into ${b.hole(a.at)} and ${c.name} into ${b.hole(c.at)}, through from the top.`,
    check: `${t.leads.map((l) => `${l.tag} to ${short(b, l.at)}`).join(', ')}${t.ready ? `, and ${t.ready.check}` : ''}`, src };
}
/** The strips a straight link passes over between its two holes (a rail, a row), by name. */
function crossings(b: Board, a: XZ, c: XZ): string[] {
  const out: string[] = [], n = Math.round(dist(a, c) / b.pitch);
  for (let k = 1; k < n; k++) { const p: XZ = [a[0] + ((c[0] - a[0]) * k) / n, a[1] + ((c[1] - a[1]) * k) / n], h = b.hole(p); if (h) out.push(/rail/.test(h) ? h.replace(/^the /, '').replace(/ at column \d+$/, '') : h); }
  return out;
}

/** A build's lesson: its edges in the order each needs (things on the board in; the board held; what hangs in; the tip
 *  tinned; every joint; every lead trimmed; the circuit closed; the iron put away), alike ones said as one, each said
 *  from its figures; and what in it cannot be done, said, in which case it has no steps. */
export function lessonOf(build: Build): { steps: Said[]; refused: string[] } {
  const b = build.board, refused: string[] = [], steps: Said[] = [];
  for (const t of build.things) { const r = insertRefusal(b, t); if (r) refused.push(r); }
  const iron = tool(build, 'iron'), wire = tool(build, 'solder'), cutters = tool(build, 'cutters'), hands = tool(build, 'hands'), cleaner = tool(build, 'cleaner');
  if (!iron || !wire) refused.push('no iron and solder in the build\'s tools');
  const alloy = ALLOYS[wire?.alloy ?? 'Sn63Pb37'] ?? ALLOYS.Sn63Pb37!, set = iron?.fig.set ?? 0, melt = timeToMelt(set, true, alloy), named = alloy.name.replace(/ \(.*\)$/, '');
  if (iron && !isFinite(melt)) refused.push(`${iron.name} at ${set} °C never brings a joint to ${alloy.name}'s ${alloy.liquidus} °C`);
  const leads = build.things.flatMap((t) => t.leads.map((l) => ({ t, l })));
  if (cutters) for (const { t, l } of leads) if (across(l) > cutters.fig.cu!) refused.push(`${t.name}'s ${l.tag} lead is ${mm(across(l))} mm: ${cutters.name} cut copper to ${mm(cutters.fig.cu!)} mm at most`);
  if (hands && b.L > hands.fig.span!) refused.push(`${b.name} is ${mm(b.L)} mm long: ${hands.name} reach ${mm(hands.fig.span!)} mm`);
  const lit = build.power ? ledCurrents(build.power) : null, one = build.power?.lamps.length === 1;
  if (build.power && lit) build.power.lamps.forEach((l, i) => { const c = lit.lamps[i]!, who = one ? 'the LED' : l.name;
    if (c.mA > l.max) refused.push(`the cells would drive ${c.mA.toFixed(0)} mA through ${who}, past its ${l.max} mA`);
    if (c.mA < 0.5) refused.push(`${lit.v.toFixed(2)} V from the cells is too little to light ${who} (it drops ${l.vf20} V)`); });
  if (refused.length) return { steps: [], refused };
  // (things on the board in, in the build's order, each said with what it is joined to among those before it)
  const before: Thing[] = [], sayIn = (t: Thing) => { steps.push(insertSaid(b, t, before)); before.push(t); };
  const low = build.things.filter((t) => !t.hangs).map((t, i) => ({ t, i })).sort((a, c) => (a.t.height ?? 0) - (c.t.height ?? 0) || a.i - c.i).map((x) => x.t);
  for (const t of low) sayIn(t);
  if (hands) steps.push({ kind: 'hold', things: ['board'], do: `Clip the board in ${hands.name} by its ends, its underside up.`, check: 'the board level in both clips, every lead standing up out of it', src: hands.src });
  for (const t of build.things) if (t.hangs) sayIn(t);
  steps.push({ kind: 'tin', things: ['iron'], do: `Heat ${iron!.name} to ${set} °C; wipe its tip ${cleaner ? `in ${cleaner.name}` : 'on a damp sponge'} and melt a little solder onto it.`, check: 'the tip is shiny silver, not black', src: `${ADAFRUIT_GUIDE}; ${iron!.src}` });
  // (every joint alike: one step, its figures from the joint model over each lead's own hole)
  const vols = leads.map(({ l }) => idealVolume(jointOf(b, l))), area = (Math.PI / 4) * wire!.fig.d! ** 2, lo = Math.min(...vols) / area, hi = Math.max(...vols) / area;
  const feed = Math.round(lo) === Math.round(hi) ? `about ${Math.round(lo)} mm` : `${Math.round(lo)} to ${Math.round(hi)} mm`;
  steps.push({ kind: 'solder', things: build.things.map((t) => t.id), do: `Solder each of the ${count(leads.length)} leads, the joint lesson's way: the tip on pad and lead together till they pass ${alloy.liquidus} °C, where ${named} melts (about ${melt < 1.5 ? 'a second' : `${melt.toFixed(0)} s`} from a tinned tip at ${set} °C); then the solder fed to them, not to the tip, ${feed} of its ${mm(wire!.fig.d!)} mm wire for each.`,
    check: 'each a smooth cone, the hole filled, wetting both pad and lead', src: `${ADAFRUIT_GUIDE}; the joint model (src/nexus/teach/solder-joint.ts, its heat an estimate); ${wire!.src}` });
  if (cutters) steps.push({ kind: 'trim', things: build.things.map((t) => t.id), do: `Trim each lead to ${PROTRUSION.min}–${PROTRUSION.max} mm above its joint with ${cutters.name}, their flat side to the board, holding the lead's end.`,
    check: `its end still in sight in the solder, at most ${PROTRUSION.max} mm standing (IPC-A-610's lead protrusion)`, src: `IPC-A-610's lead protrusion; ${cutters.src}` });
  if (build.power && lit) { const p = build.power, l = lit.lamps;
    steps.push({ kind: 'power', things: [p.source], do: one ? `Close ${p.closes}: the LED lights, about ${l[0]!.mA.toFixed(1)} mA (${lit.v.toFixed(2)} V from the cells, less the LED's ${l[0]!.vf.toFixed(2)} V, over the ${l[0]!.ohms} Ω).`
      : `Close ${p.closes}: the LEDs light, ${l.map((c) => `${c.name} about ${c.mA.toFixed(1)} mA (less its ${c.vf.toFixed(2)} V, over its ${c.ohms} Ω)`).join(', ')}, from the cells' ${lit.v.toFixed(2)} V.`, check: one ? 'the LED lit' : l.length === 2 ? 'both LEDs lit' : `all ${count(l.length)} LEDs lit`, src: p.src }); }
  const stand = tool(build, 'stand'); steps.push({ kind: 'rest', things: ['iron'], do: `Put the iron back in ${stand ? stand.name : 'its stand'}.`, check: 'the iron in its stand, the joints cooled', src: 'the safety rule: the iron in its stand every time it leaves your hand' });
  return { steps, refused };
}

// A made part under the loads it works under: what it carries, the stress that makes in it as it is drawn, what its
// material stands, and the margin between. Each case reads the part itself (a spring's wire, coils and lengths as its
// maker made it; a rod's section, a piston's mass as its parts come to), never figures typed again beside it, so what is
// calculated is what is drawn, and changing the part changes the answer.
//
//   spring    a coiled spring compressed from its free length as fitted, and by a stroke more: its rate, its forces, its
//             wire's stress against what the wire stands (Shigley ch. 10, src/engineering/springs.ts), whether it binds
//             solid, its surge frequency
//   engine    a piston engine at a speed and a peak cylinder pressure: the force on its piston, the stress in its rod
//             (pulled at the top of the exhaust stroke, pushed at firing) and its buckling, its rod bolts, its crank pin's
//             bearing pressure, its wrist pin's shear; and whether its valve springs keep its valves on their cams
//             there (valve float), and at what speed they stop
//
// Each row says its figure, the limit it is held to, the factor between and where every number comes from.

import { handbookOf } from './matter';
import { SPRING_WIRES, allowableShear, shearStress, solidLength, springRate, surgeFrequency, wireUltimate, type CoilSpring } from '../engineering/springs';
import type { Part } from './kits';
import { bentUnder, graphOf, sliced } from './graph';

export interface LoadRow { what: string; value: number; unit: string; limit: number; factor: number; ok: boolean; says: string }
export interface LoadCase { rows: LoadRow[]; worst: LoadRow | null; says: string }
const row = (what: string, value: number, unit: string, limit: number, more: { higherIsBad?: boolean; says: string }): LoadRow => {
  const bad = more.higherIsBad ?? true, factor = bad ? limit / Math.max(1e-12, value) : value / Math.max(1e-12, limit);
  return { what, value, unit, limit, factor, ok: factor >= 1, says: more.says };
};
const worstOf = (rows: LoadRow[]): LoadRow | null => rows.reduce<LoadRow | null>((a, r) => (!a || r.factor < a.factor ? r : a), null);
const mm = (x: number) => (x * 1000).toFixed(2), MPa = (x: number) => (x / 1e6).toFixed(0);

/** A part's material's strength from the handbook table (src/data/materials.ts), where the part's material is one it
 *  holds: yield, ultimate, Young's modulus. Null where it holds none: said, never guessed. */
export function strengthOf(mat: string | undefined): { yield: number; ultimate: number; E: number; name: string; source: string } | null {
  // only the handbook grade that is this material: a stand-in's strength is not this material's (src/nexus/matter.ts)
  const h = handbookOf(mat), m = h?.same ? h.m : undefined; return m ? { yield: m.yield, ultimate: m.ultimate, E: m.E, name: m.name, source: m.source } : null;
}

// ---- a spring ---------------------------------------------------------------------------------------------------------------
/** The figures a drawn spring was made to (its coil maker's), read off it, or found in it (a spring in a head). */
export function springIn(p: Part): { d: number; D: number; n: number; L: number; L0: number } | null {
  const walk = (q: Part): Part | null => (q.made?.by === 'coil' ? q : (q.parts ?? []).reduce<Part | null>((a, r) => a ?? walk(r), null));
  const s = walk(p); if (!s?.made) return null; const m = s.made as Record<string, number>;
  return { d: m.d!, D: m.D!, n: m.n!, L: m.L!, L0: m.L0 ?? m.L! };
}
/** A spring as fitted (compressed from its free length to its drawn length) and compressed `stroke` more. */
export function springCase(p: Part, o: { stroke: number; wire?: string }): LoadCase {
  const s0 = springIn(p); if (!s0) throw new Error(`the ${p.name} was not made by the coil maker: there is no wire or coil to read`);
  const wire = SPRING_WIRES[o.wire ?? 'chrome-silicon-a401']; if (!wire) throw new Error(`no spring wire "${o.wire}" (${Object.keys(SPRING_WIRES).join(', ')})`);
  const s: CoilSpring = { d: s0.d, D: s0.D, Na: s0.n, L0: s0.L0, wire }, k = springRate(s), pre = s0.L0 - s0.L, F1 = k * pre, F2 = k * (pre + o.stroke), tau = shearStress(s, F2), allow = allowableShear(s), solid = solidLength(s), C = s.D / s.d;
  const rows = [
    row('wire stress at full stroke', tau, 'Pa', allow, { says: `${MPa(tau)} MPa (Bergsträsser-corrected, Shigley eq. 10-5) at ${F2.toFixed(0)} N, against the ${wire.label}'s ${MPa(allow)} MPa allowable (${wire.allowableFraction} × its ${MPa(wireUltimate(s))} MPa ultimate at ${mm(s.d)} mm: ${wire.source})` }),
    row('length left over solid at full stroke', s0.L - o.stroke, 'm', solid, { higherIsBad: false, says: `${mm(s0.L - o.stroke)} mm compressed against ${mm(solid)} mm solid (d (Nₐ + 2), ends squared and ground)` }),
    row('spring index', C, '', 4, { higherIsBad: false, says: `D/d ${C.toFixed(1)}: 4 to 12 coils well (Shigley); under 4 is hard to coil` }),
  ];
  return { rows, worst: worstOf(rows), says: `rate ${(k / 1000).toFixed(2)} N/mm; ${F1.toFixed(0)} N as fitted (${mm(pre)} mm in from ${mm(s0.L0)} mm free), ${F2.toFixed(0)} N at ${mm(o.stroke)} mm more; surge at ${surgeFrequency(s).toFixed(0)} Hz` };
}

// ---- a con-rod as a frame -------------------------------------------------------------------------------------------------
/** A con-rod as drawn (conRod's frame: its big end round the origin, its pins along x, its small end at L up y), worked out
 *  as a frame for a push or pull along it at its small end. */
export function rodFrame(rod: Part): { lacking: string; at: (F: number, buckling: boolean) => { vm: number; where: string; buckles: number | null } | null } {
  const g = sliced(graphOf(rod), 8, { x: 0, y: 1, z: 0 } as never), shells = g.pieces.flatMap((p, i) => (/bearing shell/.test(p.name) ? [i] : [])), small = g.pieces.flatMap((p, i) => (p.name === 'small end' ? [i] : []));
  const lacking = [!shells.length && 'bearing shells', !small.length && 'small end'].filter(Boolean).join(' or ');
  const sup = new Map<number, boolean[] | { held: boolean[]; at: [number, number, number] }>();
  for (const i of shells) sup.set(i, { held: [true, true, true, false, true, true], at: [0, 0, 0] });
  for (const i of small) sup.set(i, [true, false, true, false, true, true]);
  return { lacking, at: (F, buckling) => {
    if (lacking) return null;
    const b = bentUnder(g, [...shells, ...small], small, [0, F, 0], { buckling, supports: sup }), w = [...b.stress].sort((x, y) => y.vm - x.vm)[0];
    return w ? { vm: w.vm, where: g.pieces[w.a]!.name === g.pieces[w.b]!.name ? g.pieces[w.a]!.name : `${g.pieces[w.a]!.name} where it meets its ${g.pieces[w.b]!.name}`, buckles: b.bucklesAt } : null;
  } };
}

// ---- an engine ----------------------------------------------------------------------------------------------------------------
/** The pieces of a drawn thing whose names a pattern finds, each whole (not looked into further once found). */
const piecesNamed = (p: Part, re: RegExp): Part[] => (re.test(p.name) ? [p] : (p.parts ?? []).flatMap((q) => piecesNamed(q, re)));
export interface EngineLoadsIn { rpm: number; /** peak cylinder pressure, Pa (typical: about 8 MPa in a petrol engine at full load, 18 MPa in a heavy diesel) */ pmax: number; piston?: Part; rod?: Part; spring?: Part; wire?: string }

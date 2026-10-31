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
import { conRod, cylinderHead, engineDims, headPiece, pistonAssembly, type EngineSpec } from './engines';
import type { Part } from './kits';
import { massOf } from './mass';
import { bentUnder, graphOf, sliced } from './graph';
import { METRIC } from './threads';
import { boltOf, proofStress } from './families';

export interface LoadRow { what: string; value: number; unit: string; limit: number; factor: number; ok: boolean; says: string }
export interface LoadCase { rows: LoadRow[]; worst: LoadRow | null; says: string }
const row = (what: string, value: number, unit: string, limit: number, more: { higherIsBad?: boolean; says: string }): LoadRow => {
  const bad = more.higherIsBad ?? true, factor = bad ? limit / Math.max(1e-12, value) : value / Math.max(1e-12, limit);
  return { what, value, unit, limit, factor, ok: factor >= 1, says: more.says };
};
/** A row that cannot be worked out because what it reads is not drawn: not passed, said so. */
const lacking = (what: string, says: string): LoadRow => ({ what, value: 0, unit: '', limit: 0, factor: 0, ok: false, says });
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
/** A drawn round piece's inside and outside radius and its length, from its lathe profile or its prism (a half shell). */
function roundOf(p: Part): { ri: number; ro: number; L: number } | null {
  const sh = p.shape; if (!sh) return null;
  if ('lathe' in sh) { const xs = sh.lathe.map((q) => q[0]), ys = sh.lathe.map((q) => q[1]); return { ri: Math.min(...xs), ro: Math.max(...xs), L: Math.max(...ys) - Math.min(...ys) }; }
  if ('prism' in sh) { const r = sh.prism.pts.map(([x, y]) => Math.hypot(x, y)); return { ri: Math.min(...r), ro: Math.max(...r), L: sh.prism.L ?? 0 }; }
  return null;
}
export interface EngineLoadsIn { rpm: number; /** peak cylinder pressure, Pa (typical: about 8 MPa in a petrol engine at full load, 18 MPa in a heavy diesel) */ pmax: number; piston?: Part; rod?: Part; spring?: Part; wire?: string }
/** A piston engine's working parts at a speed and a peak cylinder pressure. */
export function engineLoads(spec: EngineSpec, o: EngineLoadsIn): LoadCase & { floatRpm: number } {
  const d = engineDims(spec), { B, r, L } = d, piston = o.piston ?? pistonAssembly(spec, d), rod = o.rod ?? conRod(spec, d);
  const w = (o.rpm * 2 * Math.PI) / 60, lam = r / L, mp = massOf(piston), mr = massOf(rod), mrec = mp + mr / 3;
  // (the piston and a third of the rod go up and down with it, typical of a rod's split between its ends)
  const Fi = mrec * r * w * w * (1 + lam), Fg = o.pmax * Math.PI * B * B / 4, rows: LoadRow[] = [];
  // its rod: the drawn rod worked out as a frame (src/nexus/graph.ts), its beam in slices, its eyes and cap bonded where
  // they meet; its bearing shells held at the crank pin's axis and turning about it, its small end kept in line by the
  // piston (held sideways, free along the bore and turning about the wrist pin); pulled and pushed along it there
  const sR = strengthOf('steel-alloy')!, rf = rodFrame(rod);
  const pull = rf.at(Fi, false), push = rf.at(-Fg, true);
  if (pull && push) {
    const where = (x: typeof pull) => `its ${x.where}`;
    rows.push(row('rod pulled at the top of the exhaust stroke', pull.vm, 'Pa', sR.yield, { says: `${(Fi / 1000).toFixed(1)} kN (its ${(mrec * 1000).toFixed(0)} g going up and down, r ω² (1 + r/L)), the drawn rod as a frame: ${MPa(pull.vm)} MPa at worst, in ${where(pull)}, against ${sR.name}'s ${MPa(sR.yield)} MPa yield (${sR.source})` }));
    rows.push(row('rod pushed at firing', push.vm, 'Pa', sR.yield, { says: `${(Fg / 1000).toFixed(1)} kN of gas (${(o.pmax / 1e6).toFixed(1)} MPa on the piston, the inertia at its slowest taken as none): ${MPa(push.vm)} MPa at worst, in ${where(push)}` }));
    if (push.buckles) rows.push(row('rod buckling at firing', Fg, 'N', push.buckles, { says: `the drawn rod's own buckling (its frame's geometric stiffness under this push, pinned at the crank pin and the wrist pin and turning about them, kept in line by the piston): ${(push.buckles / 1000).toFixed(0)} kN to buckle it against ${(Fg / 1000).toFixed(1)} kN` }));
  } else rows.push(lacking('rod as drawn', `the rod given has no ${rf.lacking} to hold it by: its stress is not worked out`));
  // its rod bolts, as drawn: the inertia pulls its cap off, shared by the bolts that hold it, each on its stress area
  // (ISO 898-1: A_s = π/4 (d − 0.9382 P)²) against its own class's proof stress
  const bolts = piecesNamed(rod, /^rod bolt$/).map((b) => boltOf(b)).filter((b): b is NonNullable<typeof b> => !!b);
  if (bolts.length) {
    const b0 = bolts[0]!, t = METRIC[b0.thread], dn = Number(b0.thread.slice(1)), proof = proofStress(b0.cls, dn / 1000);
    if (!t || !proof) rows.push(lacking('rod bolts', `${b0.thread} class ${b0.cls}: its thread or its class's proof stress is not kept`));
    else { const As = (Math.PI / 4) * (dn - 0.9382 * t.p) ** 2 * 1e-6, each = Fi / bolts.length;
      rows.push(row('rod bolts pulled', each / As, 'Pa', proof, { says: `${bolts.length} drawn ${b0.thread} class ${b0.cls} bolts, ${(As * 1e6).toFixed(1)} mm² each, ${(each / 1000).toFixed(1)} kN each (preload aside): ${MPa(each / As)} MPa against class ${b0.cls}'s ${MPa(proof)} MPa proof (ISO 898-1 table 3)` })); }
  } else rows.push(lacking('rod bolts', 'the rod given has no bolts drawn (pieces named "rod bolt", each a catalogue bolt): their stress is not worked out'));
  // its crank pin's shells, as drawn: the firing force over one shell's projected area (its bore across, its width)
  const shells = piecesNamed(rod, /^rod bearing shell/).map(roundOf).filter((x): x is NonNullable<typeof x> => !!x && x.L > 0);
  if (shells.length) { const sh = shells[0]!, Ab = 2 * sh.ri * sh.L, pB = Fg / Ab;
    rows.push(row('crank pin bearing pressure', pB, 'Pa', 60e6, { says: `${MPa(pB)} MPa over the drawn shell's ${(Ab * 1e6).toFixed(0)} mm² projected (${mm(2 * sh.ri)} × ${mm(sh.L)} mm) against about 60 MPa peak for tri-metal shells (typical)` }));
  } else rows.push(lacking('crank pin bearing', 'the rod given has no bearing shells drawn: their pressure is not worked out'));
  // its wrist pin, as drawn: in double shear between its bosses, on its tube's section
  const pin = piecesNamed(piston, /^wrist pin$/).map(roundOf).find((x) => !!x);
  if (pin) { const pinA = Math.PI * (pin.ro ** 2 - pin.ri ** 2), tPin = Fg / (2 * pinA);
    rows.push(row('wrist pin shear', tPin, 'Pa', 0.577 * sR.yield, { says: `${MPa(tPin)} MPa in double shear on the drawn pin, Ø${mm(2 * pin.ro)} mm bored Ø${mm(2 * pin.ri)} mm, against 0.577 × yield (von Mises): ${MPa(0.577 * sR.yield)} MPa` }));
  } else rows.push(lacking('wrist pin', 'the piston given has no wrist pin drawn: its shear is not worked out'));
  // its valve train: the valve and what rides with it, thrown off the cam's flank unless its spring holds it on
  let floatRpm = Infinity;
  {
    const head = cylinderHead(spec, d), find = (n: RegExp) => { const all = (p: Part): Part[] => [p, ...(p.parts ?? []).flatMap(all)]; return all(head).find((p) => n.test(p.name)); };
    const sp = o.spring ?? headPiece(spec, 'valve spring', d), s0 = springIn(sp);
    if (s0) {
      const wire = SPRING_WIRES[o.wire ?? 'chrome-silicon-a401']!, cs: CoilSpring = { d: s0.d, D: s0.D, Na: s0.n, L0: s0.L0, wire }, k = springRate(cs), lift = 0.11 * B;
      const parts = ['intake valve', 'valve spring retainer', 'bucket tappet'].map((n) => find(new RegExp(`^${n}$`))).filter(Boolean) as Part[], keepers = 2 * massOf(find(/^valve keeper$/) ?? { name: 'x' });
      const mvt = parts.reduce((a, p) => a + massOf(p), 0) + keepers + massOf(sp) / 3 + (d.cams === 'ohv' ? massOf(find(/^rocker arm$/) ?? { name: 'x' }) / 2 : 0);
      // (its cam's lift as a harmonic over 60° of cam each way: its deceleration over the nose 4.5 h ω_cam², an estimate of
      // a cam's profile; the spring must push at least that hard at full lift)
      const wc = w / 2, aNeed = 4.5 * lift * wc * wc, Fneed = mvt * aNeed, Fhave = k * (s0.L0 - s0.L + lift);
      floatRpm = (2 * Math.sqrt(Fhave / (4.5 * lift * mvt)) * 60) / (2 * Math.PI);
      rows.push(row('valve spring keeps the valve on its cam', Fhave, 'N', Fneed, { higherIsBad: false, says: `${Fhave.toFixed(0)} N at full lift (${mm(lift)} mm) against ${Fneed.toFixed(0)} N to decelerate its ${(mvt * 1000).toFixed(0)} g (valve, retainer, keepers, tappet, a third of its spring) over the cam's nose at ${o.rpm} rpm: its valves float above ${floatRpm.toFixed(0)} rpm` }));
      const sc = springCase(sp, { stroke: lift, wire: o.wire }); rows.push(...sc.rows.map((x) => ({ ...x, what: `valve spring: ${x.what}` })));
    }
  }
  const worst = worstOf(rows);
  return { rows, worst, floatRpm, says: `at ${o.rpm} rpm and ${(o.pmax / 1e6).toFixed(1)} MPa: ${rows.filter((x) => !x.ok).length ? `${rows.filter((x) => !x.ok).map((x) => x.what).join(', ')} past ${rows.filter((x) => !x.ok).length > 1 ? 'their limits' : 'its limit'}` : 'everything within its limit'}; least margin ${worst ? `${worst.factor.toFixed(2)} (${worst.what})` : '—'}` };
}

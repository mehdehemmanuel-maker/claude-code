// WHAT MOVES, HOW FAR, AND WHAT THAT SWEEP NEEDS — the motion graph of a made thing, read from what its parts declare.
//
// `parts/mechanism.ts` has a real degrees-of-freedom solver: joints written by what they leave free, the count taken
// as the rank of the constraint rows rather than from Grübler's formula, redundant constraints reported because a
// constraint said twice over is what binds an assembly built exactly to its drawing. It is tested to a four-bar
// linkage, a screw, a gear pair. **Nothing in the make pipeline has ever called it.** Every `mobility()` call in this
// repository is inside its own unit test, so a car with a floating knuckle, a hinge that is secretly rigid, or a
// slider jointed to nothing was never once asked how many ways it could move (docs/ROUNDS.md Run 7r).
//
// So this file is the wire, and the edges are the ones a mechanism actually has:
//
//   CONNECTED_TO        `joins` — the parts it meets face to face
//   MOVES_WITHIN        the part it is jointed into, and any part whose `passes` names it
//   CONSTRAINED_BY      the joint that holds it, and the axis that joint leaves free
//   RANGE_OF_MOTION     `travel` — steered so far either way, risen so far in bump, slid from here to there
//   REQUIRES_CLEARANCE  the envelope that sweep needs kept clear of everything not carried with it
//   TRANSFERS_FORCE_TO  an `iface` it *provides* met by one another part *requires* of the same kind
//
// Each is derived from a declaration, never from a name: the name list is the fault two rounds of this session were
// spent removing from `critic.ts`'s `turning()`. A part that moves and says nothing about how is not guessed at — it
// is reported as exactly that, which is the finding worth having.
import type { Part, V3 } from '../parts/kits';
import { mobility, type Body, type Joint, type JointKind, type Mobility } from '../parts/mechanism';

/** What a joint leaves free. A bearing or a hinge turns; a bush and a rubber mount are compliant but located, so they
 *  are taken as the turn they are built to allow; a bore without a shoulder turns AND slides, which is why a shaft in
 *  one bush is not located along its axis; a ball, a universal and a constant-velocity joint turn any way; a damper
 *  rod in its tube and a spring slide. 'cover' is not a joint (a bellows carries nothing) and has no row here. */
/** the joint kinds that leave a turn free, so only these sweep a circle */
export const TURNS_FREE = new Set<JointKind>(['revolute', 'cylindrical', 'spherical']);

export const LEAVES: Record<NonNullable<Part['joint']>, JointKind | null> = {
  bearing: 'revolute', hinge: 'revolute', ball: 'spherical', universal: 'spherical', cv: 'spherical',
  bush: 'cylindrical', slide: 'prismatic', spring: 'prismatic', mount: 'revolute', cover: null,
};

export interface Moving {
  part: string; path: string; at: V3;
  /** what it declares: its joint, and what that leaves free */ joint?: NonNullable<Part['joint']>; leaves?: JointKind;
  /** the rigid link it is one of ('' its own frame) */ link: string;
  connectedTo: string[]; movesWithin: string[]; constrainedBy: string[]; transfersForceTo: string[];
  /** how far it goes, in the units it is said in */ range: string[];
  /** the envelope its sweep needs kept clear: a half-size about its own point, m */ clearance?: { about: V3; half: V3; says: string };
  /** nothing says how this moves, and that is the finding */ unsaid?: string;
  /** the part itself, so a later pass derives from declarations instead of re-guessing from the name */ src: Part;
}

const add = (s: string[], v?: string | string[]) => { for (const t of Array.isArray(v) ? v : v ? [v] : []) if (!s.includes(t)) s.push(t); };
// its half-size, from the shape kinds `kits.ts` actually declares. The first draft of this read `{ cyl: { r, h } }`
// and `{ sph: { r } }`, neither of which exists — the tuple is `{ cyl: [r, h, r2?] }` and the ball is `{ sphere: n }` —
// so every arm, bush and ball joint printed "⌀NaN swept" on the first run. A shape it does not know returns null, and
// a null is said as not known rather than drawn as zero: a zero half-size is a part that needs no room, which is a
// lie, and `Math.max` of an undefined is the NaN that made it visible.
const half = (p: Part): V3 | null => {
  const sh = p.shape as Record<string, unknown> | undefined;
  if (!sh) return null;
  if ('box' in sh) return (sh.box as V3).map((v) => v / 2) as V3;
  if ('cyl' in sh) { const [r, h, r2] = sh.cyl as [number, number, number?]; const R = Math.max(r, r2 ?? r); return [R, h / 2, R]; }
  if ('cone' in sh) { const [r, h] = sh.cone as [number, number]; return [r, h / 2, r]; }
  if ('sphere' in sh) { const r = sh.sphere as number; return [r, r, r]; }
  if ('capsule' in sh) { const [r, h] = sh.capsule as [number, number]; return [r, h / 2 + r, r]; }
  if ('torus' in sh) { const [R, r] = sh.torus as [number, number]; return [R + r, r, R + r]; }
  // a lathe is a profile of [radius, height] spun about y: its half-size is its widest radius and its height
  if ('lathe' in sh) { const pr = (sh.lathe as { pts?: [number, number][] }).pts ?? (sh.lathe as unknown as [number, number][]); if (!Array.isArray(pr) || !pr.length) return null; const R = Math.max(...pr.map((q) => Math.abs(q[0]))), ys = pr.map((q) => q[1]); return [R, (Math.max(...ys) - Math.min(...ys)) / 2, R]; }
  return null;
};

/** The axis a joint turns or slides about, DERIVED and never guessed. A slide's is the direction its travel declares;
 *  a turning part's is its own cylinder's axis (local +y) carried round by its `rot`. Anything else returns null and
 *  its joint is left out of the mechanism and counted, because a degrees-of-freedom number computed about made-up
 *  axes is worse than no number: it is a confident wrong one, and this session's whole fault family is checks that
 *  cannot fail. What the count then reports is the measured gap — how many joints could not say which way they act. */
const rot3 = (v: V3, r?: V3): V3 => {
  if (!r) return v;
  const [a, b, c] = r, C = Math.cos, S = Math.sin;
  let [x, y, z] = v;
  [y, z] = [y * C(a) - z * S(a), y * S(a) + z * C(a)];
  [x, z] = [x * C(b) + z * S(b), -x * S(b) + z * C(b)];
  [x, y] = [x * C(c) - y * S(c), x * S(c) + y * C(c)];
  return [x, y, z];
};
export const axisOf = (p: Part, leaves: JointKind): V3 | null => {
  if (leaves === 'spherical') return [0, 1, 0];                       // a ball turns any way: its rows do not use one
  if (p.travel?.slide) return p.travel.slide.dir;
  const sh = p.shape as Record<string, unknown> | undefined;
  // every shape here states its own axis in `kits.ts`'s own words: a lathe is "a profile of [radius, height] spun
  // about y", a torus and a capsule are likewise about y, a prism is "drawn along z". A bearing is lathed — it is a
  // solid of revolution, which has exactly one axis by construction — so reading only `cyl` and `cone` dropped every
  // bearing, race and spindle in the car: 22 of 38 joints, which is why the first DOF count was 61 and meaningless.
  if (sh && ('cyl' in sh || 'cone' in sh || 'lathe' in sh || 'torus' in sh || 'capsule' in sh)) return rot3([0, 1, 0], p.rot);
  if (sh && 'prism' in sh) return rot3([0, 0, 1], p.rot);
  return null;
};

/** Every part of `root` that moves, with the edges of its motion and what its sweep needs. */
export function moving(root: Part): Moving[] {
  const out: Moving[] = [];
  // every part by name, and who holds whom, so an edge can name the part at its other end
  const all = new Map<string, { p: Part; path: string; at: V3; holder?: Part }>();
  const walk = (p: Part, path: string, at: V3, holder?: Part) => {
    const here: V3 = [at[0] + (p.at?.[0] ?? 0), at[1] + (p.at?.[1] ?? 0), at[2] + (p.at?.[2] ?? 0)];
    if (!all.has(p.name)) all.set(p.name, { p, path, at: here, holder });
    for (const q of p.parts ?? []) walk(q, `${path}/${q.name}`, here, p);
  };
  walk(root, root.name, [0, 0, 0]);

  // what each part provides, so a `requires` can be met by name rather than by guess
  const provides = new Map<string, string[]>();
  for (const { p } of all.values()) for (const i of p.iface ?? []) if (i.role === 'provides') provides.set(i.kind, [...(provides.get(i.kind) ?? []), p.name]);
  // what names each part as passing through it, which is the MOVES_WITHIN edge said from the other side
  const through = new Map<string, string[]>();
  for (const { p } of all.values()) for (const t of p.passes ?? []) through.set(t, [...(through.get(t) ?? []), p.name]);

  for (const { p, path, at, holder } of all.values()) {
    const leaves = p.joint ? LEAVES[p.joint] : null;
    const slid = p.travel?.slide, goes = !!p.travel || !!p.movesWith;
    if (!p.joint && !goes) continue;              // it says nothing about moving, so it is not a mover
    if (p.joint === 'cover' && !goes) continue;   // a bellows follows what it covers and joins nothing

    const m: Moving = { src: p, part: p.name, path, at, joint: p.joint, leaves: leaves ?? undefined, link: p.link ?? holder?.link ?? '', connectedTo: [], movesWithin: [], constrainedBy: [], transfersForceTo: [], range: [] };
    add(m.connectedTo, p.joins);
    add(m.movesWithin, through.get(p.name));
    if (holder) add(m.movesWithin, holder.name);
    if (p.fixed) add(m.constrainedBy, `${p.fixed} (as its maker holds it)`);
    if (p.joint && leaves) add(m.constrainedBy, `its ${p.joint}, which leaves it ${leaves}`);
    if (p.movesWith) add(m.constrainedBy, `carried with ${p.movesWith}`);
    for (const i of p.iface ?? []) if (i.role === 'requires') add(m.transfersForceTo, (provides.get(i.kind) ?? []).filter((n) => n !== p.name));
    for (const i of p.iface ?? []) if (i.role === 'provides') add(m.transfersForceTo, [...all.values()].filter(({ p: q }) => q.name !== p.name && q.iface?.some((j) => j.role === 'requires' && j.kind === i.kind)).map(({ p: q }) => q.name));

    // RANGE, and the envelope that range needs. A steer is about the upright through it and a bump is straight up, so
    // the room a steered, rising wheel needs is its own size grown by the arc of the steer and the height of the bump.
    // A `slide` and a `spring` leave it PRISMATIC and do not turn: the first draft printed "turns about its own axis"
    // for every jointed part, damper rods and coil springs included, because it asked whether the part had a joint
    // rather than whether that joint leaves a turn.
    const h = half(p), sweep: V3 | null = h ? ([...h] as V3) : null;
    if (p.travel?.steer) { m.range.push(`steered ±${((p.travel.steer * 180) / Math.PI).toFixed(1)}°`); if (h && sweep) { const reach = Math.hypot(h[0], h[2]); sweep[0] = Math.max(sweep[0], reach); sweep[2] = Math.max(sweep[2], reach); } }
    if (p.travel?.bump) { m.range.push(`risen ±${(p.travel.bump * 1000).toFixed(0)} mm in bump`); if (sweep) sweep[1] += p.travel.bump; }
    if (slid) { const d = slid.to - slid.from; m.range.push(`slides ${(slid.from * 1000).toFixed(0)} → ${(slid.to * 1000).toFixed(0)} mm along [${slid.dir.join(', ')}]`); if (sweep) for (let c = 0; c < 3; c++) sweep[c]! += Math.abs(slid.dir[c]! * d) / 2; }
    if (TURNS_FREE.has(leaves ?? 'fixed') && !p.travel) { if (h && sweep) { const r = Math.max(h[0], h[2]); m.range.push(`turns about its own axis (⌀${(r * 2000).toFixed(1)} swept)`); sweep[0] = r; sweep[2] = r; } else m.range.push('turns about its own axis (its shape does not say how wide it sweeps)'); }
    if (h && sweep && sweep.some((v, i) => v > h[i]!)) m.clearance = { about: at, half: sweep, says: `${m.range.join(', ')}: ${sweep.map((v) => (v * 2000).toFixed(0)).join(' × ')} mm must stay clear of anything not carried with it` };

    // THE FINDING WORTH HAVING. Not "this looks like it moves", which is the name list; but "this says it moves and
    // does not say how far", or "this is jointed and nothing says what to".
    if (p.travel && !p.joint && !p.movesWith) m.unsaid = 'travel';  // decided below, once every link's joints are known
    else if (p.joint && leaves && !m.connectedTo.length && !p.fixed && !holder) m.unsaid = `it is a ${p.joint} and names nothing it joins, so its ${leaves} axis is against nothing`;
    else if (p.movesWith && !all.has(p.movesWith)) m.unsaid = `it is carried with "${p.movesWith}", and no part of this is called that`;
    out.push(m);
  }
  // A WHEEL IS NOT UNHELD BECAUSE ITS BEARING IS A SIBLING. Travel is declared on the wheel and the bearing sits on
  // the hub beside it, both of one rigid link, so asking the part alone called every wheel on every car unheld — four
  // findings that were an artefact of where the declaration lives. The question is whether anything in its own link
  // says what holds it, which is the same question asked at the right scale.
  const jointed = new Set(out.filter((x) => x.leaves).map((x) => x.link));
  for (const m of out) if (m.unsaid === 'travel') m.unsaid = jointed.has(m.link) ? undefined : `it declares travel and nothing in its link${m.link ? ` (${m.link})` : ''} says what holds it while it travels`;
  return out;
}

/** The bodies and joints of what moves, in the one vocabulary `mobility()` reads: each rigid link one body, each
 *  declared joint one row set. The thing's own frame is the ground, because a car's body is what its suspension moves
 *  against; with nothing fixed the count is of the free assembly, which is a different (and usually useless) question. */
export function mechanismOf(root: Part): { bodies: Body[]; joints: Joint[]; from: Moving[]; dropped: { part: string; why: string }[] } {
  const from = moving(root), bodies: Body[] = [{ name: `${root.name} (its own frame)`, at: [0, 0, 0], fixed: true }];
  const idx = new Map<string, number>([['', 0]]);
  for (const m of from) if (m.link && !idx.has(m.link)) { idx.set(m.link, bodies.length); bodies.push({ name: m.link, at: m.at }); }
  const joints: Joint[] = [], dropped: { part: string; why: string }[] = [];
  for (const m of from) {
    if (!m.leaves) continue;
    const a = idx.get(m.link) ?? 0;
    // what it is jointed TO: the first thing it joins that is a link of its own, else the ground
    const to = m.connectedTo.map((n) => from.find((x) => x.part === n)?.link).find((l) => l !== undefined && l !== m.link && idx.has(l));
    const b = to === undefined ? 0 : idx.get(to)!;
    if (a === b) { dropped.push({ part: m.part, why: `both ends are the same link (${m.link || 'the frame'}), so it joins nothing` }); continue; }
    const axis = axisOf(m.src, m.leaves);
    if (!axis) { dropped.push({ part: m.part, why: `nothing says which way its ${m.joint} acts: no slide direction declared and its shape has no axis` }); continue; }
    joints.push({ kind: m.leaves, a, b, at: m.at, axis, says: `${m.part}: ${m.joint}` });
  }
  return { bodies, joints, from, dropped };
}

/** How many ways what moves can still move, and what that says. `mobility()`'s own verdict, carried out to a reader. */
export function howItMoves(root: Part): { m: Mobility; bodies: number; joints: number; from: Moving[]; dropped: { part: string; why: string }[] } {
  const { bodies, joints, from, dropped } = mechanismOf(root);
  return { m: mobility(bodies, joints), bodies: bodies.length, joints: joints.length, from, dropped };
}

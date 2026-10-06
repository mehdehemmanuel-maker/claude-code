// Folding a made thing flat, in general (src/nexus/foldtree.ts): its widest part stays (the base), or, where it is fixed
// to something (a wall it hangs on), that does, and it folds against it where it hangs; every other part
// folds onto the part it is held by, after what is held by it has folded onto it (the deepest first), so a fold is a
// rigid turn of a part with all that hangs off it about a hinge where it meets what holds it:
//   - a quarter turn where it stands off that part's face (a leg under a top, a wall on a floor, a shelf off a back),
//     laid flat on the face the way that keeps it over it and thinnest; where it would lie on what is folded there, it
//     hangs from a block as thick (shortened by it) or is set in sideways past it, drawn by the seed;
//   - a half turn where it lies in line with that part, meeting it at an edge (the pieces of a deck, the panels of a
//     screen): over the top of it or under the bottom, whichever leaves room for what folds after it (a zig-zag).
// Which part folds next, and how, is searched (any part whose own have folded may go next; a search that steps back
// where a fold has no room), and of the ways that fold all of it the least is kept: how far it lies past what it folds
// onto, how thick it stacks, a block or a set-in as the seed prefers, a part lifted off. What lies flat on what holds
// it goes with it. The path each fold takes, a degree at a time, must meet nothing. Parts held to each other but not along the
// tree are latched open and let go to fold; a part held only through another and too big to fold onto it (a roof on a
// wall) is lifted off and laid on the stack. Folded, it is laid down as it would be carried: its base flat on the floor,
// what folded onto it on top (against a wall, it stays where it hangs). Geometry only: what holds it open, and how it rests folded, are weighed and tested where it
// is made.

export type V3 = [number, number, number];
/** A part as it stands: its middle and its full sizes along x, y (up) and z. */
export interface Box { name: string; at: V3; w: number; h: number; d: number }
export type Ax = 0 | 1 | 2;
type M3 = number[];
/** One fold: the parts that turn (a part, all folded onto it, its blocks), about an axis through a point, by so many
 *  quarter turns (right hand about the axis), onto what holds it. */
export interface Fold {
  head: string; holder: string; names: string[]; pivot: V3; axis: Ax; turns: number;
  kind: 'quarter' | 'half';
  /** a block it hangs from (quarter), or 0; set in sideways along its hinge by so much */ spacer: number; shift: number;
  /** how far it reaches from its hinge, and how thick it is the way it turns: its latch's lever */ length: number; thick: number;
  /** the face of what holds it that it folds onto: its axis and side */ n: Ax; side: 1 | -1;
}
/** A hinge as it lies folded and laid down: its axis (a world axis, + or -), its point, and which way it opens. */
export interface LaidHinge { head: string; holder: string; pivot: V3; axis: Ax; sign: 1 | -1; opens: 1 | -1; deg: number }
export interface TreePlan {
  root: string;
  folds: Fold[];
  /** the parts as they stand open (shortened or set in where a fold needs it) and the blocks */
  open: Box[];
  spacers: { name: string; under: string; on: string; box: Box }[];
  /** folded and laid down, its lowest point at 0, with each part's turn (a signed permutation) and its round axis */
  folded: Box[];
  axisOf: Map<string, Ax>;
  hinges: LaidHinge[];
  envelope: V3;
  latched: [string, string][];
  lifted: string[];
  /** where each lifted part goes in the room as it stands (for showing it): its middle and quarter turns about x or z */
  liftTo: Map<string, { at: V3; about: Ax | null }>;
  sweep: { ok: true } | { ok: false; what: string; hit: string; deg: number };
  trouble: string[];
  /** what lies flat on what holds it already, and goes with it: held as one with it */ rigid: [string, string][];
}

const TOL = 2e-4;
const E = (b: Box): V3 => [b.w, b.h, b.d];
const lo = (b: Box, i: number) => b.at[i]! - E(b)[i]! / 2, hi = (b: Box, i: number) => b.at[i]! + E(b)[i]! / 2;
const boxOf = (name: string, l: V3, h: V3): Box => ({ name, at: [0, 1, 2].map((i) => (l[i]! + h[i]!) / 2) as V3, w: h[0] - l[0], h: h[1] - l[1], d: h[2] - l[2] });
const bound = (bs: Box[]): [V3, V3] => [[0, 1, 2].map((i) => Math.min(...bs.map((b) => lo(b, i)))) as V3, [0, 1, 2].map((i) => Math.max(...bs.map((b) => hi(b, i)))) as V3];
/** Two parts touch where they meet face to face. */
export function touching(a: Box, b: Box): boolean {
  const gap = [0, 1, 2].map((i) => Math.max(lo(a, i) - hi(b, i), lo(b, i) - hi(a, i))), sep = Math.max(...gap);
  return Math.abs(sep) <= TOL && gap.filter((g) => g < -TOL).length === 2;
}
/** Where two that touch meet: the axis across it, and which side of b a is on. */
const contactOf = (a: Box, b: Box): { n: Ax; s: 1 | -1 } | null => {
  for (const n of [0, 1, 2] as Ax[]) { const g = Math.max(lo(a, n) - hi(b, n), lo(b, n) - hi(a, n)); if (Math.abs(g) <= TOL && [0, 1, 2].filter((i) => i !== n).every((i) => Math.min(hi(a, i), hi(b, i)) - Math.max(lo(a, i), lo(b, i)) > TOL)) return { n, s: a.at[n]! > b.at[n]! ? 1 : -1 }; }
  return null;
};
const overlap = (a: Box, b: Box, shrink = 1e-3) => [0, 1, 2].every((i) => Math.min(hi(a, i), hi(b, i)) - Math.max(lo(a, i), lo(b, i)) > shrink);
const mm3 = (A: M3, B: M3): M3 => { const C = new Array(9).fill(0); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k]! * B[k * 3 + j]!; return C; };
const mv3 = (A: M3, v: V3): V3 => [A[0]! * v[0] + A[1]! * v[1] + A[2]! * v[2], A[3]! * v[0] + A[4]! * v[1] + A[5]! * v[2], A[6]! * v[0] + A[7]! * v[1] + A[8]! * v[2]];
const I3: M3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
/** A turn about axis c by θ, right hand. */
export const rot = (c: Ax, th: number): M3 => { const co = Math.cos(th), si = Math.sin(th); return c === 0 ? [1, 0, 0, 0, co, -si, 0, si, co] : c === 1 ? [co, 0, si, 0, 1, 0, -si, 0, co] : [co, -si, 0, si, co, 0, 0, 0, 1]; };
const quarter = (c: Ax, turns: number): M3 => rot(c, (turns * Math.PI) / 2).map((x) => Math.round(x));
const unit = (i: Ax, s = 1): V3 => { const v: V3 = [0, 0, 0]; v[i] = s; return v; };
const same = (a: V3, b: V3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 1e-6;
/** A box turned by a whole number of quarter turns about c through p: still on axes, its sizes swapped. */
const turnBox = (b: Box, c: Ax, p: V3, turns: number): Box => {
  const R = quarter(c, turns), d: V3 = [b.at[0] - p[0], b.at[1] - p[1], b.at[2] - p[2]], r = mv3(R, d), e = E(b), ex = [0, 1, 2].map((i) => Math.abs(R[i * 3]!) * e[0] + Math.abs(R[i * 3 + 1]!) * e[1] + Math.abs(R[i * 3 + 2]!) * e[2]);
  return { ...b, at: [p[0] + r[0], p[1] + r[1], p[2] + r[2]], w: ex[0]!, h: ex[1]!, d: ex[2]! };
};
/** A box turned by θ about c through p, as the corners of its outline in the plane across c. */
const outline = (b: Box, c: Ax, p: V3, th: number): [number, number][] => {
  const [u, v] = ([0, 1, 2] as Ax[]).filter((i) => i !== c) as [Ax, Ax], R = rot(c, th), eu = E(b)[u]! / 2, ev = E(b)[v]! / 2;
  return [[-eu, -ev], [eu, -ev], [eu, ev], [-eu, ev]].map(([a, bb]) => { const d: V3 = [0, 0, 0]; d[u] = b.at[u]! - p[u]! + a!; d[v] = b.at[v]! - p[v]! + bb!; const r = mv3(R, d); return [p[u]! + r[u]!, p[v]! + r[v]!]; });
};
/** A turned outline against a box's outline in the same plane (across c): apart along some edge of either (SAT). */
const meets2 = (poly: [number, number][], o: Box, c: Ax, shrink: number): boolean => {
  const [u, v] = ([0, 1, 2] as Ax[]).filter((i) => i !== c) as [Ax, Ax];
  const r: [number, number][] = [[lo(o, u) + shrink, lo(o, v) + shrink], [hi(o, u) - shrink, lo(o, v) + shrink], [hi(o, u) - shrink, hi(o, v) - shrink], [lo(o, u) + shrink, hi(o, v) - shrink]];
  if (r[0]![0] >= r[1]![0] || r[0]![1] >= r[2]![1]) return false;
  const axes: [number, number][] = [[1, 0], [0, 1]];
  for (let i = 0; i < 4; i++) { const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % 4]!; axes.push([y0 - y1, x1 - x0]); }
  for (const [ux, uy] of axes) { const pa = poly.map(([x, y]) => x * ux + y * uy), pb = r.map(([x, y]) => x * ux + y * uy); if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false; }
  return true;
};
const thinOf = (b: Box): Ax => { const e = E(b); return (e[0] <= e[1] && e[0] <= e[2] ? 0 : e[1] <= e[2] ? 1 : 2) as Ax; };
/** as thin that way as any other (a square bar is as thin both ways across it) */
const thinAlong = (b: Box, i: Ax): boolean => E(b)[i]! <= Math.min(...E(b)) + 1e-9;

interface State { boxes: Map<string, Box>; R: Map<string, M3>; open: Map<string, Box>; spacers: TreePlan['spacers']; folds: Fold[]; lifted: string[]; rigid: [string, string][]; /** folded, gone with what it lies on, or lifted off */ done: string[] }
const copy = (s: State): State => ({ boxes: new Map(s.boxes), R: new Map(s.R), open: new Map(s.open), spacers: [...s.spacers], folds: [...s.folds], lifted: [...s.lifted], rigid: [...s.rigid], done: [...s.done] });

/** Folding a made thing flat, in general: the folds in order, found by a search that steps back where one has no room;
 *  the blocks and what is shortened or set in for them; what is latched, lifted off, or not folded, and why; how it lies
 *  folded and laid down, and its hinges there. What turns already is kept still (keep); what is fixed where it stands
 *  may be the base, and is otherwise not folded (fixed). */
export function planTree(parts: Box[], keep: Map<string, string> = new Map(), opts: { inset?: boolean; fixed?: Map<string, string>; ground?: string[] } = {}): TreePlan {
  const trouble: string[] = [], fixed = opts.fixed ?? new Map<string, string>(), byName = new Map(parts.map((b) => [b.name, b]));
  // the base: the widest face of any part; as wide, the one most in the middle of all of it
  const area = (b: Box) => { const e = E(b).sort((x, y) => y - x); return e[0]! * e[1]!; }, [gl, gh] = bound(parts), mid = [0, 1, 2].map((i) => (gl[i]! + gh[i]!) / 2);
  // what it is fixed to (a wall it hangs on) is what the rest folds against, where it stands; else it is its own
  const ground = new Set(opts.ground ?? []), bases = parts.some((b) => ground.has(b.name)) ? parts.filter((b) => ground.has(b.name)) : parts;
  const root = [...bases].sort((a, b) => area(b) - area(a) || Math.hypot(...[0, 1, 2].map((i) => a.at[i]! - mid[i]!)) - Math.hypot(...[0, 1, 2].map((i) => b.at[i]! - mid[i]!)))[0]!;
  const adj = new Map(parts.map((b) => [b.name, parts.filter((o) => o !== b && touching(b, o)).map((o) => o.name)]));
  // from the base outward, each part held by the first it was reached through; its depth
  const parent = new Map<string, string>(), depth = new Map<string, number>([[root.name, 0]]), q = [root.name];
  while (q.length) { const n = q.shift()!; for (const m of adj.get(n) ?? []) if (!depth.has(m)) { depth.set(m, depth.get(n)! + 1); parent.set(m, n); q.push(m); } }
  for (const b of parts) if (!depth.has(b.name)) trouble.push(`${b.name} touches nothing that leads to ${root.name}`);
  if (keep.has(root.name)) trouble.push(`${root.name}, what the rest would fold onto, is not still: ${keep.get(root.name)}`);
  const grounded = ground.has(root.name);
  // folding where it hangs, the floor under it is there: nothing folds through it
  const floorY = Math.min(...parts.map((b) => b.at[1]! - b.h / 2)), floor: Box = { name: 'the floor', at: [0, floorY - 50, 0], w: 1e4, h: 100, d: 1e4 };
  const kids = (n: string) => [...parent].filter(([, p]) => p === n).map(([c]) => c);
  const below = (n: string): string[] => [n, ...kids(n).flatMap(below)];
  // latched: what touches but is not held along the tree
  const latched: [string, string][] = [];
  for (const b of parts) for (const m of adj.get(b.name) ?? []) if (b.name < m && parent.get(b.name) !== m && parent.get(m) !== b.name) latched.push([b.name, m]);
  // what stays: kept still, or fixed where it stands (unless it is the base): not folded, said so, and then nothing is
  for (const [n, w] of [...keep, ...fixed]) if (n !== root.name && depth.has(n)) trouble.push(`${n} is not folded: ${w}`);
  // the order they fold: the deepest first; at a depth, the longest first (they want the most room)
  const longest = (n: string) => { const [l, h] = bound(below(n).map((x) => byName.get(x)!)); return Math.max(h[0] - l[0], h[1] - l[1], h[2] - l[2]); };
  const order = [...depth.keys()].filter((n) => n !== root.name).sort((a, b) => depth.get(b)! - depth.get(a)! || longest(b) - longest(a));
  // what lies flat on a part as made goes as it does, never folds of its own, and is folded over like the part's face
  const flatOn = (x: string, on: string): boolean => { if (parent.get(x) !== on) return false; const X = byName.get(x)!, P = byName.get(on)!, ct = contactOf(X, P); return !!ct && thinAlong(P, ct.n) && thinAlong(X, ct.n); };
  // first only folds that keep within the base, then, if none, folds that lie past it
  let budget = 0, lastFail: { what: string; hit: string; deg: number } | null = null, failAt = -1, strict = true;

  // the ways one part may fold onto what holds it, in the state as it is when its turn comes; best first
  type Way = { st: State; score: number };
  let nodeFail: { what: string; hit: string; deg: number } | null = null;
  const waysOf = (s: State, v: string): Way[] => {
    nodeFail = null;
    const p = parent.get(v)!, V = s.boxes.get(v)!, P = s.boxes.get(p)!, mine = new Set([v, ...below(v).filter((x) => !s.lifted.includes(x)), ...s.spacers.filter((x) => below(v).includes(x.on)).map((x) => x.name)]);
    const ct = contactOf(V, P); if (!ct) return [];
    const { n, s: side } = ct, tp = thinOf(P), faceOn = thinAlong(P, n), flatV = thinAlong(V, n), others = [...[...s.boxes.values()].filter((b) => !mine.has(b.name)), ...(grounded ? [floor] : [])];
    const out: Way[] = [];
    const sweepOk = (moving: Box[], c: Ax, pv: V3, turns: number): boolean => {
      const steps = Math.abs(turns) * 90, sgn = Math.sign(turns);
      for (let k = 1; k <= steps; k++) for (const b of moving) {
        const poly = outline(b, c, pv, (sgn * k * Math.PI) / 180);
        for (const o of others) { if (Math.min(hi(b, c), hi(o, c)) - Math.max(lo(b, c), lo(o, c)) <= 1e-3) continue; if (meets2(poly, o, c, 1e-3)) { nodeFail ??= { what: b.name, hit: o.name, deg: k }; return false; } }
      }
      return true;
    };
    // what it is: a fold applied to the state (its parts turned, the blocks added, the open parts as they must stand)
    const apply = (pv: V3, c: Ax, turns: number, kind: Fold['kind'], extra: { sp: number; shift: number; spBoxes: Box[]; changed: Map<string, Box>; length: number; thick: number }): State | null => {
      const st = copy(s); for (const [nm, b] of extra.changed) { st.boxes.set(nm, b); st.open.set(nm, { ...(st.open.get(nm) ?? b), at: [...b.at] as V3, w: b.w, h: b.h, d: b.d }); }
      const moving = [...mine].map((x) => st.boxes.get(x)!).filter(Boolean);
      if (!sweepOk(moving, c, pv, turns)) return null;
      const Rq = quarter(c, turns);
      for (const b of moving) { st.boxes.set(b.name, turnBox(b, c, pv, turns)); st.R.set(b.name, mm3(Rq, st.R.get(b.name) ?? I3)); }
      for (const sb of extra.spBoxes) { st.boxes.set(sb.name, sb); st.R.set(sb.name, I3); st.spacers.push({ name: sb.name, under: v, on: p, box: sb }); }
      const now = [...mine].map((x) => st.boxes.get(x)!);
      const rest = [...[...st.boxes.values()].filter((b) => !mine.has(b.name)), ...(grounded ? [floor] : [])];
      if (now.some((b) => rest.some((o) => overlap(b, o)))) return null;
      st.folds.push({ head: v, holder: p, names: [...mine], pivot: pv, axis: c, turns, kind, spacer: extra.sp, shift: extra.shift, length: extra.length, thick: extra.thick, n, side });
      return st;
    };
    const faceAt = (sp: number) => (side === 1 ? hi(P, n) + sp : lo(P, n) - sp);
    if (faceOn && !flatV) {
      // a quarter turn, laid flat on the face it stands off
      const subtree = [...mine].map((x) => s.boxes.get(x)!), [ml0, mh0] = bound(subtree), placed = rest0(s, mine), foldedNames = new Set(s.folds.flatMap((f) => f.names)), lying = placed.filter((o) => foldedNames.has(o.name) || s.spacers.some((x) => x.name === o.name) || flatOn(o.name, p));
      // it lies flat only if the turn brings its thinnest way onto the face's: about the way it is widest along the face
      for (const a of ([0, 1, 2] as Ax[]).filter((i) => i !== n && E(V)[i]! <= E(V)[3 - n - i]! + 1e-9)) for (const sg of [1, -1] as const) {
        const c = (3 - n - a) as Ax, k0 = mv3(quarter(c, 1), unit(n, side)), turns = same(k0, unit(a, sg)) ? 1 : -1;
        const tryOne = (sp: number, shift: number) => {
          // hung from a block sp thick (it is shortened by that much where it meets the face), set in by shift along its hinge
          const changed = new Map<string, Box>(), e = E(V)[n]! - sp;
          if (sp > 0) { const sl = side === 1 ? hi(P, n) : lo(P, n) - sp, sh = sl + sp; if (e < 0.5 * E(V)[n]! || below(v).some((x) => x !== v && !s.lifted.includes(x) && s.boxes.has(x) && Math.min(hi(s.boxes.get(x)!, n), sh) - Math.max(lo(s.boxes.get(x)!, n), sl) > 1e-6)) return null; const at = [...V.at] as V3; at[n] += (side * sp) / 2; const nb = { ...V, at }; if (n === 0) nb.w = e; else if (n === 1) nb.h = e; else nb.d = e; changed.set(v, nb); }
          if (shift) { for (const x of mine) { const b = changed.get(x) ?? s.boxes.get(x)!; const at = [...b.at] as V3; at[c] += shift; changed.set(x, { ...b, at }); }
            const moved = [...changed.values()], [sl, sh] = bound(moved); if (sl[c]! < lo(P, c) - 1e-6 || sh[c]! > hi(P, c) + 1e-6 || moved.some((b) => others.some((o) => overlap(b, o)))) return null; }
          // its hinge is on its own edge where it meets the face (or its block); what hangs off it turns with it
          const now = [...mine].map((x) => changed.get(x) ?? s.boxes.get(x)!), [ml, mh] = bound(now), vv = changed.get(v) ?? V, pv: V3 = [0, 0, 0];
          pv[n] = faceAt(sp); pv[a] = sg === 1 ? hi(vv, a) : lo(vv, a); pv[c] = vv.at[c]!;
          const turnedNow = now.map((b) => turnBox(b, c, pv, turns)), spBoxes = sp > 0 ? (() => { const vv = changed.get(v) ?? V, l: V3 = [lo(vv, 0), lo(vv, 1), lo(vv, 2)], h: V3 = [hi(vv, 0), hi(vv, 1), hi(vv, 2)]; if (side === 1) { l[n] = hi(P, n); h[n] = hi(P, n) + sp; } else { l[n] = lo(P, n) - sp; h[n] = lo(P, n); } return [boxOf(`hinge_block_${v}`, l, h)]; })() : [];
          const clash = [...placed, ...(grounded ? [floor] : [])].filter((o) => turnedNow.some((b) => overlap(b, o)) || spBoxes.some((x) => overlap(x, o)));
          // where it would lie on a part still standing, that part must fold first: said so, for the order to be drawn again
          const up = clash.find((o) => o !== floor && !foldedNames.has(o.name) && o.name !== p && !s.spacers.some((x) => x.name === o.name) && !flatOn(o.name, p)); if (up && (!nodeFail || nodeFail.deg !== 90)) nodeFail = { what: v, hit: up.name, deg: 90 };
          const [fl, fh] = bound(turnedNow), over = Math.max(0, lo(P, a) - fl[a]!, fh[a]! - hi(P, a), lo(P, c) - fl[c]!, fh[c]! - hi(P, c)), thick = side === 1 ? fh[n]! - hi(P, n) : lo(P, n) - fl[n]!;
          return { clash, pv, changed, spBoxes, over, score: over * 10 + thick + (shift ? (opts.inset ? 1e-4 : 0.1) : 0) + (sp > 0 && !opts.inset ? 0 : sp > 0 ? 0.1 : 0) + 1e-3 * (a === ([0, 1, 2] as Ax[]).filter((i) => i !== n).sort((x, y) => E(P)[y]! - E(P)[x]!)[0] ? 0 : 1), length: Math.abs(side === 1 ? mh[n]! - pv[n]! : pv[n]! - ml[n]!), thick: mh[a]! - ml[a]! };
        };
        // it lands on what lies there, or runs into it on the way: hung from a block as thick as what lies under it, or set
        // in sideways past what it lands on
        const tries: { sp: number; shift: number }[] = [{ sp: 0, shift: 0 }], first = tryOne(0, 0);
        const more = () => {
          const cs = (first?.clash ?? []).filter((o) => o !== floor), gc = (ml0[c]! + mh0[c]!) / 2, mc = P.at[c]!;
          const insets = cs.length ? [Math.max(...cs.map((o) => hi(o, c))) - ml0[c]! + 1e-4, Math.min(...cs.map((o) => lo(o, c))) - mh0[c]! - 1e-4].sort((x, y) => Math.abs(gc + x - mc) - Math.abs(gc + y - mc)).map((sh) => ({ sp: 0, shift: sh })) : [];
          const depths = [...new Set(lying.filter((o) => Math.min(mh0[c]!, hi(o, c)) - Math.max(ml0[c]!, lo(o, c)) > 1e-3).map((o) => +(side === -1 ? lo(P, n) - lo(o, n) : hi(o, n) - hi(P, n)).toFixed(6)))].filter((d) => d > 0).sort((x, y) => x - y).map((d) => ({ sp: d, shift: 0 }));
          tries.push(...(opts.inset ? [...insets, ...depths] : [...depths, ...insets]));
        };
        if (first?.clash.length) more();
        for (let k = 0; k < tries.length; k++) {
          const t = tries[k]!, r = k === 0 ? first : tryOne(t.sp, t.shift); if (!r || r.clash.length || strict && r.over > 1e-3) continue;
          const st = apply(r.pv, c, turns, 'quarter', { sp: t.sp, shift: t.shift, spBoxes: r.spBoxes, changed: r.changed, length: r.length, thick: r.thick });
          if (st) out.push({ st, score: r.score }); else if (k === 0 && tries.length === 1) more();
        }
      }
    } else if (!faceOn && thinAlong(V, tp)) {
      // a half turn, in line with what holds it: over its top or under its bottom, about the edge they meet at
      const t = tp, c = (3 - n - t) as Ax;
      for (const tau of [1, -1] as const) {
        const pv: V3 = [0, 0, 0]; pv[n] = faceAt(0); pv[t] = tau === 1 ? hi(P, t) : lo(P, t); pv[c] = V.at[c]!;
        const k0 = mv3(quarter(c, 1), unit(n, side)), turns = same(k0, unit(t, tau)) ? 2 : -2;
        const st = apply(pv, c, turns, 'half', { sp: 0, shift: 0, spBoxes: [], changed: new Map(), length: E(V)[n]!, thick: E(V)[t]! });
        if (st) { const [fl, fh] = bound([...mine].map((x) => st.boxes.get(x)!)), over = Math.max(0, ...([0, 1, 2] as Ax[]).filter((i) => i !== t).map((i) => Math.max(lo(P, i) - fl[i]!, fh[i]! - hi(P, i)))); if (strict && over > 1e-3) continue; out.push({ st, score: over * 10 + (tau === 1 ? 0 : 1e-6) }); }
      }
    } else if (faceOn && flatV) {
      // it lies flat on what holds it already: it goes as that does
      out.push({ st: (() => { const st = copy(s); st.rigid.push([v, p]); return st; })(), score: 0 });
    }
    // held only through what folds and too big to fold onto it: lifted off and laid on the stack
    if ((depth.get(v) ?? 0) >= 2 && !fixed.has(v) && !grounded) { const st = copy(s); st.lifted.push(...below(v)); for (const x of below(v)) st.boxes.delete(x); out.push({ st, score: 1e6 }); }
    return out.sort((x, y) => x.score - y.score);
  };
  const rest0 = (s: State, mine: Set<string>) => [...s.boxes.values()].filter((b) => !mine.has(b.name));
  // the search: which part folds next (any whose own have folded already) and how, stepping back where none has room;
  // each way through weighed (how far past the base, how thick, a block or a part set in, a part lifted off) and the
  // least kept; a state come to again, no better, is not gone on from
  let best: State | null = null, bestCost = Infinity;
  const seen = new Map<string, number>(), r4 = (x: number) => x.toFixed(4);
  const keyOf = (s: State) => `${[...s.boxes.values()].map((b) => `${b.name}@${b.at.map(r4).join(',')}:${r4(b.w)},${r4(b.h)},${r4(b.d)}`).sort().join('|')}#${[...s.lifted].sort().join(',')}#${[...s.done].sort().join(',')}`;
  const search = (s0: State, cost: number): void => {
    if (cost >= bestCost - 1e-12) return;
    // what lies flat on what holds it goes with it, as soon as its own have: nothing to choose
    let s = s0;
    for (let more = true; more;) { more = false; for (const n of order) if (!s.done.includes(n) && flatOn(n, parent.get(n)!) && kids(n).every((c) => s.done.includes(c))) { if (s === s0) s = copy(s0); s.rigid.push([n, parent.get(n)!]); s.done.push(n); more = true; } }
    const left = order.filter((n) => !s.done.includes(n));
    if (!left.length) { best = s; bestCost = cost; return; }
    const key = keyOf(s), was = seen.get(key); if (was !== undefined && was <= cost + 1e-12) return; seen.set(key, cost);
    for (const v of left.filter((n) => kids(n).every((c) => s.done.includes(c)))) {
      if (budget-- <= 0) return;
      const ws = waysOf(s, v);
      if (!ws.length) { if (nodeFail && s.done.length > failAt) { lastFail = nodeFail; failAt = s.done.length; } continue; }
      for (const w of ws) { w.st.done = [...new Set([...s.done, ...(w.st.lifted.includes(v) ? below(v) : [v])])]; search(w.st, cost + w.score); if (budget <= 0) return; }
    }
  };
  const start: State = { boxes: new Map(parts.map((b) => [b.name, { ...b, at: [...b.at] as V3 }])), R: new Map(parts.map((b) => [b.name, I3])), open: new Map(parts.map((b) => [b.name, { ...b, at: [...b.at] as V3 }])), spacers: [], folds: [], lifted: [], rigid: [], done: [] };
  // as much searched for each part as there are ways of folding it, within what a search here can take
  for (const pass of [true, false]) {
    if (trouble.length) break;
    strict = pass; budget = 3000; seen.clear(); best = null; bestCost = Infinity; search(start, 0);
    if (best) break;
  }
  const done = best as State | null;
  if (!done && !trouble.length) trouble.push(lastFail ? `no way to fold it all was found: ${(lastFail as { what: string }).what} meets ${(lastFail as { hit: string }).hit} ${(lastFail as { deg: number }).deg}° into its fold` : 'no way to fold it all was found');
  const s = done ?? start;
  // laid down as it would be carried: the base's thinnest way up, what folded onto it on top; its lowest point at 0
  const R0 = s.boxes.get(root.name)!, t0 = thinOf(R0), vols = [...s.boxes.values()].filter((b) => b.name !== root.name).reduce((acc, b) => acc + Math.sign(b.at[t0]! - R0.at[t0]!) * b.w * b.h * b.d, 0), sideUp = vols >= 0 ? 1 : -1;
  // against what it is fixed to, it stays where it hangs
  const lays: M3[] = [I3, quarter(0, 2), quarter(2, 1), quarter(2, -1), quarter(0, 1), quarter(0, -1)];
  const L = grounded ? I3 : lays.find((M) => same(mv3(M, unit(t0, sideUp)), [0, 1, 0]))!;
  const laid = [...s.boxes.values()].map((b) => { const r = mv3(L, [b.at[0] - R0.at[0], b.at[1] - R0.at[1], b.at[2] - R0.at[2]]), e = E(b), ex = [0, 1, 2].map((i) => Math.abs(L[i * 3]!) * e[0] + Math.abs(L[i * 3 + 1]!) * e[1] + Math.abs(L[i * 3 + 2]!) * e[2]); return { ...b, at: [R0.at[0] + r[0], R0.at[1] + r[1], R0.at[2] + r[2]] as V3, w: ex[0]!, h: ex[1]!, d: ex[2]! }; });
  const toLaid = (v: V3): V3 => { const r = mv3(L, [v[0] - R0.at[0], v[1] - R0.at[1], v[2] - R0.at[2]]); return [R0.at[0] + r[0], R0.at[1] + r[1], R0.at[2] + r[2]]; };
  let [ll] = bound(laid); const dy = grounded ? 0 : ll[1]!;
  let folded = laid.map((b) => ({ ...b, at: [b.at[0], b.at[1] - dy, b.at[2]] as V3 }));
  // what was lifted off, laid flat on top, its widest way along the base's
  const liftTo = new Map<string, { at: V3; about: Ax | null }>();
  for (const n of s.lifted) {
    // on what lies under it where it lies, not on the highest of all of it
    const b = byName.get(n)!, ds = [b.w, b.h, b.d].sort((x, y) => y - x), Rb = folded.find((x) => x.name === root.name)!, wide = Rb.w >= Rb.d, w = wide ? ds[0]! : ds[1]!, d = wide ? ds[1]! : ds[0]!;
    const under = folded.filter((o) => Math.min(Rb.at[0] + w / 2, hi(o, 0)) - Math.max(Rb.at[0] - w / 2, lo(o, 0)) > 1e-6 && Math.min(Rb.at[2] + d / 2, hi(o, 2)) - Math.max(Rb.at[2] - d / 2, lo(o, 2)) > 1e-6);
    folded.push({ name: n, at: [Rb.at[0], Math.max(...under.map((o) => hi(o, 1))) + ds[2]! / 2, Rb.at[2]], w, h: ds[2]!, d });
    const thin = Math.min(b.w, b.h, b.d), about: Ax | null = thin === b.h ? null : thin === b.w ? 2 : 0, top = Math.max(...[...s.boxes.values()].map((x) => hi(x, 1)));
    liftTo.set(n, { at: [R0.at[0], (t0 === 1 && sideUp === 1 ? top : hi(R0, 1)) + thin / 2, R0.at[2]], about });
  }
  // its own, not what it is fixed to
  const own = folded.filter((b) => !ground.has(b.name)); [ll] = bound(own); const [, lh] = bound(own);
  // each part's turn, folded and laid down: its round axis (where its own long way went)
  const axisOf = new Map<string, Ax>();
  for (const [nm, R] of s.R) { const M = mm3(L, R); for (const a of [0, 1, 2] as Ax[]) { const v = mv3(M, unit(a)); axisOf.set(`${nm}:${a}`, v.findIndex((x) => Math.abs(x) > 0.5) as Ax); } }
  // its hinges as they lie folded and laid down: each fold's line carried by every fold after it that turned what holds
  // it, then laid down; which way it opens, by the turn back from folded
  const hinges: LaidHinge[] = [];
  for (const [k, f] of s.folds.entries()) {
    let pv = [...f.pivot] as V3, ax = unit(f.axis);
    for (const g of s.folds.slice(k + 1)) if (g.names.includes(f.holder)) { const R = quarter(g.axis, g.turns); const d: V3 = [pv[0] - g.pivot[0], pv[1] - g.pivot[1], pv[2] - g.pivot[2]], r = mv3(R, d); pv = [g.pivot[0] + r[0], g.pivot[1] + r[1], g.pivot[2] + r[2]]; ax = mv3(R, ax); }
    const pL = toLaid(pv), aL = mv3(L, ax), i = aL.findIndex((x) => Math.abs(x) > 0.5) as Ax, sign = (aL[i]! > 0 ? 1 : -1) as 1 | -1;
    // folding turned it by f.turns about +f.axis; opening turns it back: by -f.turns about the same line, which, laid down,
    // is about sign·axis
    hinges.push({ head: f.head, holder: f.holder, pivot: [pL[0], pL[1] - dy, pL[2]], axis: i, sign, opens: (-Math.sign(f.turns) * sign) as 1 | -1, deg: Math.abs(f.turns) * 90 });
  }
  const spacers = s.spacers.map((x) => ({ ...x, box: s.open.get(x.name) ?? x.box }));
  return { root: root.name, folds: s.folds, open: [...s.open.values(), ...s.spacers.map((x) => x.box)].filter((b, k, all) => all.findIndex((y) => y.name === b.name) === k), spacers, folded, axisOf, hinges, envelope: [lh[0]! - ll[0]!, lh[1]! - ll[1]!, lh[2]! - ll[2]!], latched, lifted: s.lifted, liftTo, rigid: s.rigid, sweep: done ? { ok: true } : lastFail ? { ok: false, ...(lastFail as { what: string; hit: string; deg: number }) } : { ok: true }, trouble };
}

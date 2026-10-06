// Folding a made thing flat (src/nexus/fold.ts): what it rests on or hangs from most (its base: the widest part lying
// flat) stays; every part held to the base, with what hangs off it, folds flat onto the base about a hinge along the edge
// where it meets it, a quarter turn the way that keeps it over the base; where two would fold onto each other, the later
// hinges from a block as thick as what lies under it, and is shortened by that much, so the open thing stands as made.
// Parts held to each other but not through the base (walls meeting at a corner) are latched open and let go to fold.
// The path each takes, turned a degree at a time, must run into nothing; folded, it is laid down as it would be carried.
// Geometry only: what holds it open, and how it rests folded, are weighed and tested where it is made.

export type V3 = [number, number, number];
/** A part as it stands: its middle and its full sizes along x, y (up) and z. */
export interface Box { name: string; at: V3; w: number; h: number; d: number }
/** One part of the base's that folds, with what hangs off it: about a hinge along `hinge` (x 0 or z 2) through `pivot`,
 *  turning a quarter turn so it lies along `along` toward `sign`; above the base (side 1) or under it (side -1); lifted
 *  off the base by a block `spacer` thick where another lies under it. */
export interface Leaf { names: string[]; touch: string[]; hinge: 0 | 2; along: 0 | 2; sign: 1 | -1; side: 1 | -1; pivot: V3; spacer: number; length: number; thick: number; /** set in sideways along its hinge, so it folds beside what folds across from it */ shift: number }
export interface FoldPlan {
  root: string;
  leaves: Leaf[];
  /** the parts as they stand open, the touching parts shortened where they hang from a block, and the blocks */
  open: Box[];
  spacers: { name: string; under: string; box: Box }[];
  /** folded, laid down as it is carried (the base on the floor), its lowest point at 0 */
  folded: Box[];
  envelope: V3;
  /** what touched across groups and is latched open, let go to fold */
  latched: [string, string][];
  /** a degree at a time along each fold, in the order they fold: what ran into what, if anything did */
  sweep: { ok: true } | { ok: false; what: string; hit: string; deg: number };
  /** what could not be folded, and why */
  trouble: string[];
}

const E = (b: Box): V3 => [b.w, b.h, b.d];
const lo = (b: Box, i: number) => b.at[i]! - E(b)[i]! / 2, hi = (b: Box, i: number) => b.at[i]! + E(b)[i]! / 2;
const TOL = 2e-4;
/** Two parts touch where they meet face to face: no gap and no overlap across one axis, overlapping along the other two. */
export function touching(a: Box, b: Box): boolean {
  const gap = [0, 1, 2].map((i) => Math.max(lo(a, i) - hi(b, i), lo(b, i) - hi(a, i))), sep = Math.max(...gap);
  return Math.abs(sep) <= TOL && gap.filter((g) => g < -TOL).length === 2;
}
/** Two parts take up the same room, each made a little smaller first so that touching is not counted. */
const overlap = (a: Box, b: Box, shrink = 1e-3) => [0, 1, 2].every((i) => Math.min(hi(a, i), hi(b, i)) - Math.max(lo(a, i), lo(b, i)) > shrink);
const boxOf = (name: string, lo3: V3, hi3: V3): Box => ({ name, at: [0, 1, 2].map((i) => (lo3[i]! + hi3[i]!) / 2) as V3, w: hi3[0] - lo3[0], h: hi3[1] - lo3[1], d: hi3[2] - lo3[2] });
const bound = (bs: Box[]): [V3, V3] => [[0, 1, 2].map((i) => Math.min(...bs.map((b) => lo(b, i)))) as V3, [0, 1, 2].map((i) => Math.max(...bs.map((b) => hi(b, i)))) as V3];

/** A box turned a quarter turn about a line along axis `c` through `p`, in the plane of `a` and y: k -1 turns y toward
 *  a (down to +a), k 1 turns y away from a (up to +a). Boxes on axes stay on axes. */
function quarter(b: Box, a: 0 | 2, p: V3, k: 1 | -1): Box {
  const da = b.at[a]! - p[a]!, dy = b.at[1] - p[1], [na, ny] = k === -1 ? [-dy, da] : [dy, -da], at = [...b.at] as V3;
  at[a] = p[a]! + na; at[1] = p[1] + ny;
  const e = E(b), ea = e[a]!, ey = e[1]!, out: Box = { ...b, at };
  if (a === 0) { out.w = ey; out.h = ea; } else { out.d = ey; out.h = ea; }
  return out;
}
/** A box turned by θ (radians) the same way, as the corners of its outline in the plane of a and y. */
function turned(b: Box, a: 0 | 2, p: V3, k: 1 | -1, th: number): [number, number][] {
  const c = Math.cos(th), s = Math.sin(th) * (k === -1 ? 1 : -1), ea = E(b)[a]! / 2, ey = b.h / 2;
  return [[-ea, -ey], [ea, -ey], [ea, ey], [-ea, ey]].map(([u, v]) => { const da = b.at[a]! - p[a]! + u!, dy = b.at[1] - p[1] + v!; return [p[a]! + da * c - dy * s, p[1] + da * s + dy * c]; });
}
/** A turned outline (four corners) against a box's outline in the same plane: apart along some axis of either (SAT). */
function meets2(poly: [number, number][], b: Box, a: 0 | 2, shrink: number): boolean {
  const r: [number, number][] = [[lo(b, a) + shrink, lo(b, 1) + shrink], [hi(b, a) - shrink, lo(b, 1) + shrink], [hi(b, a) - shrink, hi(b, 1) - shrink], [lo(b, a) + shrink, hi(b, 1) - shrink]];
  if (r[0]![0] >= r[1]![0] || r[0]![1] >= r[2]![1]) return false;
  const axes: [number, number][] = [[1, 0], [0, 1]];
  for (let i = 0; i < 4; i++) { const [x0, y0] = poly[i]!, [x1, y1] = poly[(i + 1) % 4]!; axes.push([y0 - y1, x1 - x0]); }
  for (const [ux, uy] of axes) {
    const pa = poly.map(([x, y]) => x * ux + y * uy), pb = r.map(([x, y]) => x * ux + y * uy);
    if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
  }
  return true;
}

/** Folding a made thing flat, by geometry: its base, what folds onto it and how, the blocks, what is latched, the path
 *  each fold takes, and how it lies folded. Parts that turn already (wheels) are not folded. A part held only by what
 *  folds, and as long as half of it or more (a roof on a wall, a brace between legs), cannot fold with it: it is lifted
 *  off and laid on the stack. Where two would fold onto each other, the later is set in sideways past the first if the
 *  base is wide enough (as a folding table's legs are), or hinged from a block over it. Where a fold runs into a part
 *  still standing, that part folds first, and the order is drawn again. */
export function planFold(parts: Box[], keep: Map<string, string> = new Map(), opts: { inset?: boolean; /** what is fixed where it stands (to a wall, on a bank): it may be the base, and is not folded or lifted off */ fixed?: Map<string, string> } = {}): FoldPlan & { lifted: string[]; flip: boolean; dy: number } {
  const trouble: string[] = [];
  const flat = parts.filter((b) => b.h <= Math.min(b.w, b.d) + 1e-9), pool = flat.length ? flat : parts;
  const root = pool.reduce((m, b) => (b.w * b.d > m.w * m.d ? b : m), pool[0]!);
  if (keep.has(root.name)) trouble.push(`${root.name}, what the rest would fold onto, is not still: ${keep.get(root.name)}`);
  // what touches what; from the base outward, each part held by the first it was reached through
  const adj = new Map(parts.map((b) => [b.name, parts.filter((o) => o !== b && touching(b, o)).map((o) => o.name)]));
  const byName = new Map(parts.map((b) => [b.name, b])), big = (b: Box) => Math.max(b.w, b.h, b.d);
  const group = new Map<string, string>(), seen = new Set([root.name]), q = [root.name], lifted: string[] = [];
  while (q.length) {
    const n = q.shift()!;
    for (const m of adj.get(n) ?? []) {
      if (seen.has(m)) continue; seen.add(m);
      // held only through what folds, and bigger than its head: lifted off, not folded with it
      if (n !== root.name && big(byName.get(m)!) >= 0.5 * big(byName.get(group.get(n)!)!) - 1e-9) { lifted.push(m); continue; }
      group.set(m, n === root.name ? m : group.get(n)!); q.push(m);
    }
  }
  for (const b of parts) if (!seen.has(b.name)) trouble.push(`${b.name} touches nothing that leads to ${root.name}`);
  const fixed = opts.fixed ?? new Map<string, string>();
  for (const n of lifted) if (fixed.has(n)) trouble.push(`${n} is not lifted off: ${fixed.get(n)}`);
  for (const [n, why] of fixed) if (n !== root.name && !keep.has(n)) keep.set(n, why);
  const groups = [...new Set(group.values())].map((g) => parts.filter((b) => group.get(b.name) === g));
  // latched: what touches across two groups, or a lifted part where it touches anything
  const latched: [string, string][] = [];
  for (const b of parts) for (const m of adj.get(b.name) ?? []) if (b.name < m && (lifted.includes(b.name) || lifted.includes(m) || (group.get(b.name) !== group.get(m) && b.name !== root.name && m !== root.name))) latched.push([b.name, m]);
  const yTop = hi(root, 1), yBot = lo(root, 1);
  const entries = groups.map((g) => ({ g, touch: g.filter((b) => (adj.get(b.name) ?? []).includes(root.name)) }));
  // the longest first: they want the most room over the base
  let order = keep.has(root.name) ? [] : [...entries].sort((x, y) => { const [l1, h1] = bound(x.g), [l2, h2] = bound(y.g); return h2[1] - l2[1] - (h1[1] - l1[1]); });
  // a group whose fold from a block runs into what stands across from it is set in sideways instead
  const noBlock = new Set<string>();
  const attempt = (ord: typeof entries) => {
    const bad: string[] = [], open = new Map(parts.map((b) => [b.name, { ...b, at: [...b.at] as V3 }])), spacers: FoldPlan['spacers'] = [], leaves: Leaf[] = [], foldedOf = new Map<string, Box[]>();
    for (const { g, touch } of ord) {
      const names = g.map((b) => b.name);
      const kept = g.find((b) => keep.has(b.name)); if (kept) { bad.push(`${names[0]}${kept.name !== names[0] ? ` (with ${kept.name})` : ''} is not folded: ${keep.get(kept.name)}`); continue; }
      const sides = touch.map((b) => (Math.abs(lo(b, 1) - yTop) <= TOL ? 1 : Math.abs(hi(b, 1) - yBot) <= TOL ? -1 : 0));
      if (!sides.length || sides.some((s) => s === 0) || new Set(sides).size > 1) { bad.push(`${names[0]} meets ${root.name} at its edge, not on its face: folding it there is not derived`); continue; }
      const side = sides[0] as 1 | -1;
      // each way it could fold: along x or z, toward + or -, about the edge of where it meets the base on that side
      let best: { leaf: Leaf; boxes: Box[]; spBoxes: Box[]; score: number; shortened: Map<string, Box> } | null = null;
      for (const along of [0, 2] as const) for (const sign of [1, -1] as const) {
        const hinge = (2 - along) as 0 | 2, placed = [...foldedOf.values()].flat(), [gl0, gh0] = bound(g);
        // standing open, what is lifted off later is still there: set in sideways, it must clear that too
        const others = [...open.values()].filter((b) => b.name !== root.name && !names.includes(b.name));
        // folded so, lifted off the base by sp (a block under it) and set in by shift along its hinge: what it would be
        const tryOne = (sp: number, shift: number) => {
          const shortened = new Map<string, Box>();
          for (const b of touch) { const e = b.h - sp; if (sp > 0 && e < 0.5 * b.h) return null; shortened.set(b.name, { ...b, h: e, at: [b.at[0], b.at[1] + (side * sp) / 2, b.at[2]] }); }
          if (sp > 0) for (const b of g) if (!touch.includes(b)) for (const t of touch) if (touching(b, t) && !touching(b, shortened.get(t.name)!)) return null;
          const now = g.map((b) => { const x = shortened.get(b.name) ?? b; if (!shift) return x; const at = [...x.at] as V3; at[hinge] += shift; return { ...x, at }; });
          if (shift) { const [sl, sh] = bound(now); if (sl[hinge]! < lo(root, hinge) - 1e-6 || sh[hinge]! > hi(root, hinge) + 1e-6 || now.some((b) => others.some((o) => overlap(b, o)))) return null; }
          const [gl, gh] = bound(now), face = side === 1 ? yTop + sp : yBot - sp;
          const pivot: V3 = [0, face, 0]; pivot[along] = sign === 1 ? gh[along]! : gl[along]!; pivot[hinge] = (gl[hinge]! + gh[hinge]!) / 2;
          const k = (side * sign) as 1 | -1, boxes = now.map((b) => quarter(b, along, pivot, k));
          const spBoxes = sp > 0 ? touch.map((t, i) => { const at = [...t.at] as V3; at[hinge] += shift; const t2 = { ...t, at }; return boxOf(`hinge_block_${t.name}_${i}`, [lo(t2, 0), side === 1 ? yTop : yBot - sp, lo(t2, 2)], [hi(t2, 0), side === 1 ? yTop + sp : yBot, hi(t2, 2)]); }) : [];
          const clash = boxes.filter((b) => overlap(b, root) || placed.some((p) => overlap(b, p)) || spacers.some((x) => overlap(b, x.box)) || spBoxes.some((x) => overlap(b, x)));
          if (clash.length) return { clash: placed.filter((p) => boxes.some((b) => overlap(b, p))), ok: undefined };
          // how far it lies past the base, and how much it adds to the folded thickness; set in or lifted, a little worse
          const [fl, fh] = bound(boxes), over = Math.max(0, lo(root, along) - fl[along]!, fh[along]! - hi(root, along), lo(root, hinge) - fl[hinge]!, fh[hinge]! - hi(root, hinge));
          const thick = side === 1 ? fh[1]! - yTop : yBot - fl[1]!, score = over * 10 + thick + 1e-3 * (along === (root.w >= root.d ? 0 : 2) ? 0 : 1) + (shift ? 1e-4 : 0);
          const moved = new Map(now.map((b) => [b.name, b]));
          const leaf: Leaf = { names, touch: touch.map((b) => b.name), hinge, along, sign, side, pivot, spacer: sp, length: side === 1 ? gh[1]! - face : face - gl[1]!, thick: gh[along]! - gl[along]!, shift };
          return { ok: { leaf, boxes, spBoxes, score, shortened: moved }, clash: undefined };
        };
        let c = tryOne(0, 0);
        const clashed = c?.clash?.length ? c.clash : null;
        // set in sideways past what it would lie on, toward the base's middle, where the base is wide enough
        const inset = () => {
          if (!clashed) return;
          const [cl, ch] = [Math.min(...clashed.map((p) => lo(p, hinge))), Math.max(...clashed.map((p) => hi(p, hinge)))], mid = root.at[hinge]!, gc = (gl0[hinge]! + gh0[hinge]!) / 2;
          const shifts = [ch - gl0[hinge]! + 1e-4, cl - gh0[hinge]! - 1e-4].sort((x, y) => Math.abs(gc + x - mid) - Math.abs(gc + y - mid));
          for (const sh of shifts) { const t = tryOne(0, sh); if (t?.ok) { c = t; return; } }
        };
        // or hinged from a block as thick as each depth of what lies folded across its way
        const block = () => {
          if (noBlock.has(names[0]!)) return;
          const depths = [...new Set(placed.filter((p) => Math.min(gh0[hinge]!, hi(p, hinge)) - Math.max(gl0[hinge]!, lo(p, hinge)) > 1e-3).map((p) => +(side === -1 ? yBot - lo(p, 1) : hi(p, 1) - yTop).toFixed(6)))].sort((x, y) => x - y);
          for (const sp of depths) { const t = tryOne(sp, 0); if (t === null) return; if (t.ok) { c = t; return; } }
        };
        if (!c?.ok) for (const way of opts.inset ? [inset, block] : [block, inset]) { way(); if (c?.ok) break; }
        if (c?.ok && (!best || c.ok.score < best.score)) best = c.ok;
      }
      if (!best) { bad.push(`${names[0]} has no way to fold onto ${root.name} without lying on what is folded already`); continue; }
      leaves.push(best.leaf); foldedOf.set(names[0]!, best.boxes);
      for (const [n, b] of best.shortened) open.set(n, b);
      best.spBoxes.forEach((x, i) => spacers.push({ name: x.name, under: best!.leaf.touch[i]!, box: x }));
    }
    // a degree at a time along each fold, nearest the base first, against the base, the blocks and every other part as it
    // stands then (folded if it folded first, open if not); lifted parts are off by then
    const seq = [...leaves].sort((x, y) => x.spacer - y.spacer), done = new Set<Leaf>();
    let sweep: FoldPlan['sweep'] = { ok: true };
    const stateOf = () => [...open.values()].filter((b) => b.name !== root.name && !lifted.includes(b.name) && !seq.some((l) => l.names.includes(b.name) && done.has(l))).concat(...[...done].map((l) => foldedOf.get(l.names[0]!)!));
    out: for (const l of seq) {
      const mine = l.names.map((n) => open.get(n)!), others = [root, ...spacers.map((x) => x.box), ...stateOf().filter((b) => !l.names.includes(b.name))], k = (l.side * l.sign) as 1 | -1;
      for (let deg = 1; deg <= 90; deg++) for (const b of mine) {
        const poly = turned(b, l.along, l.pivot, k, (deg * Math.PI) / 180);
        for (const o of others) {
          if (Math.min(hi(b, l.hinge), hi(o, l.hinge)) - Math.max(lo(b, l.hinge), lo(o, l.hinge)) <= 1e-3) continue;
          if (meets2(poly, o, l.along, 1e-3)) { sweep = { ok: false, what: b.name, hit: o.name, deg }; break out; }
        }
      }
      done.add(l);
    }
    return { bad, open, spacers, leaves, foldedOf, sweep };
  };
  // where a fold runs into a part that has not folded yet, that part's group folds first: drawn again, a few times at most
  let r = attempt(order);
  for (let tries = 0; tries < 12 && !r.sweep.ok; tries++) {
    const sw = r.sweep as Extract<FoldPlan['sweep'], { ok: false }>, owner = (n: string) => r.spacers.find((x) => x.name === n)?.under ?? n, gHit = group.get(owner(sw.hit)), gWhat = group.get(sw.what);
    const iHit = order.findIndex((e) => e.g.some((b) => group.get(b.name) === gHit)), iWhat = order.findIndex((e) => e.g.some((b) => group.get(b.name) === gWhat));
    if (iHit < 0 || iWhat < 0 || iHit === iWhat) break;
    // it ran into one still standing that folds after it only because it lies on it, hinged from a block: set that one in
    // sideways instead, so they fold beside each other
    const lHit = r.leaves.find((l) => l.names.includes(owner(sw.hit))), lWhat = r.leaves.find((l) => l.names.includes(sw.what));
    if (lHit && lWhat && lHit.spacer > lWhat.spacer && !noBlock.has(lHit.names[0]!)) { noBlock.add(lHit.names[0]!); r = attempt(order); continue; }
    if (iHit < iWhat && lHit && lWhat && lHit.spacer < lWhat.spacer) break;
    const moved = order[iHit]!; order = order.filter((_, k) => k !== iHit); order.splice(Math.min(iWhat, order.length), 0, moved);
    r = attempt(order);
  }
  trouble.push(...r.bad);
  const { open, spacers, leaves, foldedOf, sweep } = r;
  // folded: the base, its blocks, what folded and what did not, laid down with the base underneath where things folded
  // under it, its lowest point on the floor; what was lifted off laid flat on top, its widest way along the base's
  const still = [...open.values()].filter((b) => b.name !== root.name && !lifted.includes(b.name) && !leaves.some((l) => l.names.includes(b.name)));
  let folded = [root, ...spacers.map((x) => x.box), ...leaves.flatMap((l) => foldedOf.get(l.names[0]!)!), ...still].map((b) => ({ ...b, at: [...b.at] as V3 }));
  const flip = leaves.some((l) => l.side === -1);
  if (flip) folded = folded.map((b) => ({ ...b, at: [b.at[0], -b.at[1], b.at[2]] as V3 }));
  const [fl0] = bound(folded), dy = fl0[1]!; folded = folded.map((b) => ({ ...b, at: [b.at[0], b.at[1] - dy, b.at[2]] as V3 }));
  for (const n of lifted) {
    const b = byName.get(n)!, [, fh] = bound(folded), ds = [b.w, b.h, b.d].sort((x, y) => y - x), wide = root.w >= root.d;
    folded.push({ name: n, at: [root.at[0], fh[1]! + ds[2]! / 2, root.at[2]], w: wide ? ds[0]! : ds[1]!, h: ds[2]!, d: wide ? ds[1]! : ds[0]! });
  }
  const [fl, fh] = bound(folded);
  return { root: root.name, leaves, open: [...open.values(), ...spacers.map((x) => x.box)], spacers, folded, envelope: [fh[0]! - fl[0]!, fh[1]! - fl[1]!, fh[2]! - fl[2]!], latched, sweep, trouble, lifted, flip, dy };
}

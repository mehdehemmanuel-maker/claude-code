// Members that bend as well as stretch: a plane frame of straight members joined rigidly at joints, each member
// resisting stretch by E A / L and bending by E I / L³ (slender members: Euler–Bernoulli, shear deformation and the
// size of the joints neglected). Solved by assembling every member's stiffness and solving for the joints' motions.
//
// Used to measure what an arrangement does: its stiffness at a scale many cells across, and how that stiffness grows
// with the solid in it. Nothing here names a material or a structure; the lattices are arrangements of members.

import { solveLinear, type Network } from './network';

export interface FrameMember { a: number; b: number; E: number; A: number; I: number }
export interface Frame { nodes: [number, number][]; members: FrameMember[] }
/** A held freedom (0: along x, 1: along y, 2: turning) at a joint, at a given motion (zero unless stated). */
export interface Held { node: number; dof: 0 | 1 | 2; value?: number }

/** The motions of every joint and the forces at every held freedom, under the holds and the loads. */
export function solveFrame(fr: Frame, held: Held[], loads: { node: number; dof: 0 | 1 | 2; value: number }[] = []): { u: number[]; reaction: (node: number, dof: 0 | 1 | 2) => number } {
  const N = fr.nodes.length * 3;
  const K = Array.from({ length: N }, () => new Array(N).fill(0));
  for (const m of fr.members) {
    const [xa, ya] = fr.nodes[m.a]!, [xb, yb] = fr.nodes[m.b]!;
    const L = Math.hypot(xb - xa, yb - ya), c = (xb - xa) / L, s = (yb - ya) / L;
    const ea = m.E * m.A / L, ei = m.E * m.I;
    const k = [
      [ea, 0, 0, -ea, 0, 0],
      [0, 12 * ei / L ** 3, 6 * ei / L ** 2, 0, -12 * ei / L ** 3, 6 * ei / L ** 2],
      [0, 6 * ei / L ** 2, 4 * ei / L, 0, -6 * ei / L ** 2, 2 * ei / L],
      [-ea, 0, 0, ea, 0, 0],
      [0, -12 * ei / L ** 3, -6 * ei / L ** 2, 0, 12 * ei / L ** 3, -6 * ei / L ** 2],
      [0, 6 * ei / L ** 2, 2 * ei / L, 0, -6 * ei / L ** 2, 4 * ei / L],
    ];
    const T = [[c, s, 0, 0, 0, 0], [-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, c, s, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]];
    const dofs = [m.a * 3, m.a * 3 + 1, m.a * 3 + 2, m.b * 3, m.b * 3 + 1, m.b * 3 + 2];
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) {
      let v = 0;
      for (let p = 0; p < 6; p++) for (let q = 0; q < 6; q++) v += T[p]![i]! * k[p]![q]! * T[q]![j]!;
      K[dofs[i]!]![dofs[j]!] += v;
    }
  }
  const f = new Array(N).fill(0);
  for (const l of loads) f[l.node * 3 + l.dof] += l.value;
  const fixed = new Map(held.map((h) => [h.node * 3 + h.dof, h.value ?? 0]));
  const free = Array.from({ length: N }, (_, i) => i).filter((i) => !fixed.has(i));
  const rhs = free.map((i) => f[i]! - [...fixed].reduce((t, [j, v]) => t + K[i]![j]! * v, 0));
  const uf = solveLinear(free.map((i) => free.map((j) => K[i]![j]!)), rhs);
  const u = new Array(N).fill(0);
  free.forEach((i, k) => { u[i] = uf[k]; });
  for (const [j, v] of fixed) u[j] = v;
  return { u, reaction: (node, dof) => { const i = node * 3 + dof; return K[i]!.reduce((t, kij, j) => t + kij * u[j]!, 0) - f[i]!; } };
}

// ---- arrangements of members --------------------------------------------------------------------------------------

export interface Lattice { name: string; nodes: [number, number][]; bars: [number, number][]; width: number; height: number; cell: number }

/** Keep the joints inside a window and the bars between them; joints left with one bar inside the window carry nothing and go, except on its top and bottom. */
function clip(name: string, nodes: [number, number][], bars: [number, number][], x0: number, x1: number, cell: number): Lattice {
  const eps = 1e-9 * cell;
  const keep = nodes.map(([x]) => x >= x0 - eps && x <= x1 + eps);
  let b = bars.filter(([i, j]) => keep[i] && keep[j]);
  const ys = nodes.filter((_, i) => keep[i]).map(([, y]) => y);
  const ylo = Math.min(...ys), yhi = Math.max(...ys);
  for (let pass = 0; pass < 8; pass++) {
    const deg = new Map<number, number>();
    for (const [i, j] of b) { deg.set(i, (deg.get(i) ?? 0) + 1); deg.set(j, (deg.get(j) ?? 0) + 1); }
    const dangling = (i: number) => (deg.get(i) ?? 0) < 2 && Math.abs(nodes[i]![1] - ylo) > eps && Math.abs(nodes[i]![1] - yhi) > eps;
    const next = b.filter(([i, j]) => !dangling(i) && !dangling(j));
    if (next.length === b.length) break;
    b = next;
  }
  const used = [...new Set(b.flat())].sort((p, q) => p - q);
  const at = new Map(used.map((i, k) => [i, k]));
  return { name, nodes: used.map((i) => [nodes[i]![0] - x0, nodes[i]![1] - ylo] as [number, number]), bars: b.map(([i, j]) => [at.get(i)!, at.get(j)!] as [number, number]), width: x1 - x0, height: yhi - ylo, cell };
}

/** Triangles: every joint meets six bars. */
export function triangular(cols: number, rows: number, l = 1): Lattice {
  const nodes: [number, number][] = [], id = new Map<string, number>();
  for (let j = 0; j <= rows; j++) for (let i = -rows; i <= cols + rows; i++) { id.set(`${i},${j}`, nodes.length); nodes.push([(i + j / 2) * l, j * l * Math.sqrt(3) / 2]); }
  const bars: [number, number][] = [];
  for (const [key, a] of id) { const [i, j] = key.split(',').map(Number) as [number, number]; for (const [di, dj] of [[1, 0], [0, 1], [-1, 1]]) { const b = id.get(`${i + di},${j + dj}`); if (b !== undefined) bars.push([a, b]); } }
  return clip('triangles', nodes, bars, 0, cols * l, l);
}

/** Squares, the load along one family of bars (turn = 0) or across them at 45° (turn = 1). */
export function square(cols: number, rows: number, l = 1, turn: 0 | 1 = 0): Lattice {
  const nodes: [number, number][] = [], id = new Map<string, number>();
  const n = turn ? cols + rows : Math.max(cols, rows);
  for (let i = -n; i <= 2 * n; i++) for (let j = -n; j <= 2 * n; j++) {
    const p: [number, number] = turn ? [(i - j) * l / Math.SQRT2, (i + j) * l / Math.SQRT2] : [i * l, j * l];
    if (p[1] < -1e-9 || p[1] > rows * l + 1e-9) continue;
    id.set(`${i},${j}`, nodes.length); nodes.push(p);
  }
  const bars: [number, number][] = [];
  for (const [key, a] of id) { const [i, j] = key.split(',').map(Number) as [number, number]; for (const [di, dj] of [[1, 0], [0, 1]]) { const b = id.get(`${i + di},${j + dj}`); if (b !== undefined) bars.push([a, b]); } }
  return clip(turn ? 'squares at 45°' : 'squares', nodes, bars, 0, cols * l, l);
}

/** Hexagons: every joint meets three bars; walls of length l, one family parallel to the load. */
export function hexagonal(cols: number, rows: number, l = 1): Lattice {
  const nodes: [number, number][] = [], A = new Map<string, number>(), B = new Map<string, number>();
  const ax = Math.sqrt(3) * l;
  for (let j = 0; j <= rows; j++) for (let i = -rows - 1; i <= cols + rows + 1; i++) {
    const x = i * ax + j * ax / 2, y = j * 1.5 * l;
    A.set(`${i},${j}`, nodes.length); nodes.push([x, y]);
    B.set(`${i},${j}`, nodes.length); nodes.push([x, y + l]);
  }
  const bars: [number, number][] = [];
  for (const [key, b] of B) {
    const [i, j] = key.split(',').map(Number) as [number, number];
    for (const k of [`${i},${j}`, `${i},${j + 1}`, `${i - 1},${j + 1}`]) { const a = A.get(k); if (a !== undefined) bars.push([a, b]); }
  }
  return clip('hexagons', nodes, bars, 0, cols * ax, l);
}

/** The solid's share of the plane, for walls of a thickness: the walls' length times their thickness over the area (the joints' overlap neglected). */
export function solidFraction(lat: Lattice, t: number): number {
  const len = lat.bars.reduce((s, [i, j]) => s + Math.hypot(lat.nodes[j]![0] - lat.nodes[i]![0], lat.nodes[j]![1] - lat.nodes[i]![1]), 0);
  return len * t / (lat.width * lat.height);
}

/**
 * The arrangement's stiffness as seen many cells across: its bottom held along the load, its top moved along the load by
 * a small amount, its sides free; the force it takes over its width, per unit depth, over the strain. Walls of
 * thickness t and unit depth, joined rigidly, of a solid of modulus Es.
 */
export function effectiveModulus(lat: Lattice, t: number, Es = 1): number {
  const fr: Frame = { nodes: lat.nodes, members: lat.bars.map(([a, b]) => ({ a, b, E: Es, A: t, I: t ** 3 / 12 })) };
  const eps = 1e-9 * lat.cell;
  const bottom = lat.nodes.map((p, i) => [p, i] as const).filter(([p]) => p[1] < eps).map(([, i]) => i);
  const top = lat.nodes.map((p, i) => [p, i] as const).filter(([p]) => p[1] > lat.height - eps).map(([, i]) => i);
  const d = 1e-4 * lat.height;
  const held: Held[] = [...bottom.map((node) => ({ node, dof: 1 as const })), { node: bottom[0]!, dof: 0 }, ...top.map((node) => ({ node, dof: 1 as const, value: d }))];
  const r = solveFrame(fr, held);
  const F = top.reduce((s, node) => s + r.reaction(node, 1), 0);
  return (F / lat.width) / (d / lat.height);
}

/** As a network of bars alone: what the arrangement's bars can do, its bottom held and its top loaded along the load. */
export function asNetwork(lat: Lattice): { net: Network; top: number[] } {
  const eps = 1e-9 * lat.cell;
  const bottom = lat.nodes.map((p, i) => [p, i] as const).filter(([p]) => p[1] < eps).map(([, i]) => i);
  const top = lat.nodes.map((p, i) => [p, i] as const).filter(([p]) => p[1] > lat.height - eps).map(([, i]) => i);
  // held as the stiffness is measured: the bottom along the load, one joint of it across
  return { net: { dim: 2, nodes: lat.nodes.map((p) => [...p]), bars: lat.bars, held: [], rollers: [...bottom.map((i) => [i, 1] as [number, number]), [bottom[0]!, 0]] }, top };
}

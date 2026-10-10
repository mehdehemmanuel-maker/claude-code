// How an arrangement carries a load. A network of bars between joints can carry a load at its joints by pushing and
// pulling along its bars only if the load lies in the span of what the bars can do: the columns of its equilibrium
// matrix. What the bars cannot reach is a mechanism: a motion of the joints that no bar resists by stretching. A load
// that a mechanism meets is carried, if at all, by the members bending where they meet, which is far softer.
//
// This is linear algebra, not a theory of any material or structure. It counts the same way for the walls of cells a
// few micrometres across, for a lattice printed in a lab, for the frame of a house, and for grains or atoms that
// touch: what matters is the arrangement's connections against its freedoms.

export interface Network {
  dim: 2 | 3;
  nodes: number[][];
  bars: [number, number][];
  /** Joints held in every direction. */
  held: number[];
  /** Joints held in one direction only: [joint, direction]. */
  rollers?: [number, number][];
}

/** The rank of a matrix by elimination with partial pivoting, entries below a tolerance relative to the largest counted as zero. */
export function rank(M: number[][], tol = 1e-9): number {
  if (!M.length || !M[0]!.length) return 0;
  // rows as typed arrays: the same elimination, step for step, without boxing every entry
  const A = M.map((r) => Float64Array.from(r));
  const rows = A.length, cols = A[0]!.length;
  let scale = 0; for (const row of A) for (let j = 0; j < cols; j++) { const v = Math.abs(row[j]!); if (v > scale) scale = v; }
  scale ||= 1;
  let r = 0;
  for (let c = 0; c < cols && r < rows; c++) {
    let p = r;
    for (let i = r + 1; i < rows; i++) if (Math.abs(A[i]![c]!) > Math.abs(A[p]![c]!)) p = i;
    if (Math.abs(A[p]![c]!) <= tol * scale) continue;
    const t = A[r]!; A[r] = A[p]!; A[p] = t;
    const R = A[r]!, piv = R[c]!;
    for (let i = r + 1; i < rows; i++) {
      const Ri = A[i]!, f = Ri[c]! / piv;
      if (f !== 0) for (let j = c; j < cols; j++) Ri[j]! -= f * R[j]!;
    }
    r++;
  }
  return r;
}

/** The free freedoms of the network: (joint, direction) for every joint not held. */
export function freedoms(n: Network): [number, number][] {
  const held = new Set(n.held), roll = new Set((n.rollers ?? []).map(([i, d]) => `${i}.${d}`));
  const out: [number, number][] = [];
  n.nodes.forEach((_, i) => { if (!held.has(i)) for (let d = 0; d < n.dim; d++) if (!roll.has(`${i}.${d}`)) out.push([i, d]); });
  return out;
}

/** The compatibility matrix: each bar's stretch per motion of each free freedom (its rows), the unit vector along it at its ends. */
export function compatibility(n: Network): number[][] {
  const dofs = freedoms(n);
  const index = new Map(dofs.map(([i, d], k) => [`${i}.${d}`, k]));
  return n.bars.map(([a, b]) => {
    const row = new Array(dofs.length).fill(0);
    const pa = n.nodes[a]!, pb = n.nodes[b]!;
    const len = Math.hypot(...pa.map((x, d) => pb[d]! - x));
    for (let d = 0; d < n.dim; d++) {
      const e = (pb[d]! - pa[d]!) / len;
      const ka = index.get(`${a}.${d}`), kb = index.get(`${b}.${d}`);
      if (ka !== undefined) row[ka] -= e;
      if (kb !== undefined) row[kb] += e;
    }
    return row;
  });
}

const transpose = (M: number[][], cols: number) => Array.from({ length: cols }, (_, j) => M.map((r) => r[j]!));

/** The rigid motions the held joints leave: translations and rotations of the whole that move no held joint. */
function rigidLeft(n: Network): number {
  const motions = n.dim === 2 ? 3 : 6;
  const rows: number[][] = [];
  const at = (i: number, d: number) => {
    const [x, y, z = 0] = n.nodes[i]!;
    if (n.dim === 2) rows.push(d === 0 ? [1, 0, -y!] : [0, 1, x!]);
    else rows.push(d === 0 ? [1, 0, 0, 0, z, -y!] : d === 1 ? [0, 1, 0, -z, 0, x!] : [0, 0, 1, y!, -x!, 0]);
  };
  for (const i of n.held) for (let d = 0; d < n.dim; d++) at(i, d);
  for (const [i, d] of n.rollers ?? []) at(i, d);
  return rows.length ? motions - rank(rows) : motions;
}

export interface Count {
  joints: number; bars: number; freedoms: number; rank: number;
  /** Motions of the joints no bar resists by stretching, the rigid motions of the whole left aside. */
  mechanisms: number;
  /** Ways the bars can be in tension and compression with no load: more bars than the joints need. */
  selfStresses: number;
  /** Bars less the freedoms they must hold: Maxwell's count, which is the self-stresses less the mechanisms. */
  maxwell: number;
}

/** Count what an arrangement's bars do against its joints' freedoms. */
export function count(n: Network): Count {
  const C = compatibility(n);
  const f = freedoms(n).length;
  const r = rank(C);
  const rigid = rigidLeft(n);
  return { joints: n.nodes.length, bars: n.bars.length, freedoms: f, rank: r, mechanisms: f - r - rigid, selfStresses: n.bars.length - r, maxwell: n.bars.length - (f - rigid) };
}

/** A load on the free freedoms, one number per freedom in the order freedoms() gives. */
export function loadOn(n: Network, at: (node: number, direction: number) => number): number[] {
  return freedoms(n).map(([i, d]) => at(i, d));
}

/** Whether the bars alone can carry the load by stretching: the load lies in the span of the equilibrium matrix. */
export function carries(n: Network, load: number[]): boolean {
  const A = transpose(compatibility(n), freedoms(n).length);
  return rank(A.map((row, i) => [...row, load[i]!])) === rank(A);
}

/** Solve a dense linear system by elimination with partial pivoting. */
export function solveLinear(K: number[][], f: number[]): number[] {
  const n = f.length;
  const A = K.map((r, i) => [...r, f[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let i = c + 1; i < n; i++) if (Math.abs(A[i]![c]!) > Math.abs(A[p]![c]!)) p = i;
    [A[c], A[p]] = [A[p]!, A[c]!];
    const piv = A[c]![c]!;
    if (Math.abs(piv) < 1e-300) throw new Error('singular: no unique solution');
    for (let i = c + 1; i < n; i++) {
      const m = A[i]![c]! / piv;
      if (m !== 0) for (let j = c; j <= n; j++) A[i]![j]! -= m * A[c]![j]!;
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let v = A[i]![n]!;
    for (let j = i + 1; j < n; j++) v -= A[i]![j]! * x[j];
    x[i] = v / A[i]![i]!;
  }
  return x;
}

/**
 * The force in every bar under a load, when the bars alone decide it: the load is carried by stretching and no bar is
 * more than the joints need (no self-stress). Otherwise null: the bars cannot carry it, or their stiffness decides.
 */
export function barForces(n: Network, load: number[]): number[] | null {
  const c = count(n);
  if (c.selfStresses > 0 || !carries(n, load)) return null;
  const C = compatibility(n);
  // the equilibrium A t = f has one solution; the normal equations find it
  const AtA = C.map((ri) => C.map((rj) => ri.reduce((s, x, k) => s + x * rj[k]!, 0)));
  const Atf = C.map((ri) => ri.reduce((s, x, k) => s + x * load[k]!, 0));
  return solveLinear(AtA, Atf);
}

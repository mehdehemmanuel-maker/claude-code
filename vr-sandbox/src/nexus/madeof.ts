// What anything is made of, and what follows from it (docs/REALITY.md, step 7). Any thing (a part, or an assembly that
// places things, however deep and however shared) opened as its materials all the way down: each piece once, with its
// mass and its share; by material, each said as exactly as it is known (src/nexus/matter.ts); by element; and what is
// not known (a piece with no material, a material with no density, one known only by its family, a mass stated rather
// than worked out). And what follows from what it is made of, worked out from its pieces with nothing counted twice:
// its mass, its centre of mass, its inertia tensor, its heat capacity; each with how far it can be trusted.
//
// One walk serves all of it: `flatten` (src/nexus/assembly.ts), the same that draws a thing and weighs it, so a piece
// placed a thousand times is a thousand pieces here and its definition is read once.

import * as THREE from 'three';
import { flatten, isPart, massOfAll, type Assembly } from './assembly';
import { densityKg, massOf } from './mass';
import { shapeBox } from './make/space';
import { matterOf, type Evidence } from './matter';
import type { Part, Shape } from './kits';

type V3 = [number, number, number];
type M3 = [V3, V3, V3];

/** One piece as placed: its mass, where its centre is, its own inertia about its centre (in the thing's frame). */
export interface Piece { name: string; mat: string | null; mass: number; centre: V3; inertia: M3; volume: number; exactInertia: boolean }

/** A piece's inertia about its own centre, in its own frame: exact for a box, a solid cylinder and a ball; any other
 *  shape as the uniform box round it (an estimate, said). */
function ownInertia(s: Shape, m: number): { I: V3; exact: boolean } {
  if ('box' in s) { const [a, b, c] = s.box; return { I: [(m * (b * b + c * c)) / 12, (m * (a * a + c * c)) / 12, (m * (a * a + b * b)) / 12], exact: true }; }
  if ('cyl' in s && (s.cyl[2] === undefined || s.cyl[2] === s.cyl[0])) { const [r, h] = s.cyl; const t = (m * (3 * r * r + h * h)) / 12; return { I: [t, (m * r * r) / 2, t], exact: true }; }
  if ('sphere' in s) { const t = 0.4 * m * s.sphere ** 2; return { I: [t, t, t], exact: true }; }
  const b = shapeBox(s); if (!b) return { I: [0, 0, 0], exact: false };
  const [a, h, c] = [b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z];
  return { I: [(m * (h * h + c * c)) / 12, (m * (a * a + c * c)) / 12, (m * (a * a + h * h)) / 12], exact: false };
}

/** Every piece of a thing, placed, with its mass (by its shape and material, or the material changed over it), its centre
 *  and its inertia; and what is weighed but not drawn (a stated mass with no shape), which has no place. */
export function piecesOf(t: Part | Assembly): { pieces: Piece[]; unplaced: { name: string; mass: number }[] } {
  const pieces: Piece[] = [];
  flatten(t, (f) => {
    const leaf = f.leaf, mat = f.over.mat ?? leaf.mat ?? null, own = massOf({ ...leaf, parts: [] });
    const rho = leaf.mat ? densityKg(leaf.mat) : undefined, rhoNew = f.over.mat ? densityKg(f.over.mat) : undefined;
    const det = Math.abs(f.m.determinant()), mass = (rho && rhoNew ? (own * rhoNew) / rho : own) * det;
    const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); f.m.decompose(pos, q, sc);
    const b = leaf.shape ? shapeBox(leaf.shape) : null, c = b ? b.getCenter(new THREE.Vector3()).applyMatrix4(f.m) : pos;
    // its own inertia, scaled as it is placed, turned into the thing's frame: R diag(I) Rᵀ
    const own3 = leaf.shape ? ownInertia(leaf.shape, mass) : { I: [0, 0, 0] as V3, exact: false }, s2 = (sc.x * sc.y * sc.z) ** (2 / 3);
    const R = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(q)).elements, I: M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { let v = 0; for (let k = 0; k < 3; k++) v += R[k * 3 + i]! * own3.I[k]! * s2 * R[k * 3 + j]!; I[i]![j] = v; }
    pieces.push({ name: leaf.name, mat, mass, centre: [c.x, c.y, c.z], inertia: I, volume: rho ? (own / rho) * det : 0, exactInertia: own3.exact && Math.abs(sc.x - sc.y) < 1e-9 && Math.abs(sc.y - sc.z) < 1e-9 });
  });
  const unplaced: { name: string; mass: number }[] = [];
  const unseen = (p: Part) => { if (!p.shape && p.kg !== undefined) unplaced.push({ name: p.name, mass: p.kg }); for (const c of p.parts ?? []) unseen(c); };
  const walk = (a: Part | Assembly, k: number) => { if (isPart(a)) { const before = unplaced.length; unseen(a); for (let i = before; i < unplaced.length; i++) unplaced[i]!.mass *= k; } else for (const it of a.items) walk(it.of, k * Math.abs(it.s ** 3)); };
  walk(t, 1);
  return { pieces, unplaced };
}

export interface MassProperties {
  mass: number;
  /** Of the mass, how much has a place (its centre and inertia known) and how much is only stated. */
  placedMass: number; unplacedMass: number;
  centre: V3;
  /** About the centre of mass, in the thing's frame, kg m². */
  inertia: M3;
  /** Its principal moments, kg m², least first. */
  principal: V3;
  /** The share of the mass whose pieces' own inertia is exact (boxes, cylinders, balls); the rest as their boxes. */
  exactShare: number;
  /** Σ m c over the pieces whose material's specific heat is known, J/K; and the share of the mass that covers. */
  heatCapacity: number; heatCovered: number;
}

/** What follows from a thing's pieces: its mass, centre, inertia, heat capacity, nothing counted twice. */
export function massProperties(t: Part | Assembly): MassProperties {
  const { pieces, unplaced } = piecesOf(t);
  const placedMass = pieces.reduce((a, p) => a + p.mass, 0), unplacedMass = unplaced.reduce((a, p) => a + p.mass, 0);
  const c: V3 = [0, 0, 0]; if (placedMass > 0) for (const p of pieces) for (let k = 0; k < 3; k++) c[k]! += (p.mass * p.centre[k]!) / placedMass;
  // the parallel axis theorem, in tensor form: I = Σ (I_own + m (|d|² 1 − d dᵀ))
  const I: M3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const p of pieces) { const d = [p.centre[0] - c[0], p.centre[1] - c[1], p.centre[2] - c[2]], d2 = d[0]! ** 2 + d[1]! ** 2 + d[2]! ** 2; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) I[i]![j]! += p.inertia[i]![j]! + p.mass * ((i === j ? d2 : 0) - d[i]! * d[j]!); }
  let heat = 0, covered = 0; const cOf = new Map<string, number | null>();
  for (const p of pieces) { if (!p.mat) continue; if (!cOf.has(p.mat)) cOf.set(p.mat, matterOf(p.mat).props.find((x) => x.key === 'c')?.value ?? null); const cv = cOf.get(p.mat); if (cv) { heat += p.mass * cv; covered += p.mass; } }
  return { mass: placedMass + unplacedMass, placedMass, unplacedMass, centre: c, inertia: I, principal: eigenSym(I), exactShare: placedMass ? pieces.filter((p) => p.exactInertia).reduce((a, p) => a + p.mass, 0) / placedMass : 0, heatCapacity: heat, heatCovered: placedMass + unplacedMass ? covered / (placedMass + unplacedMass) : 0 };
}
/** The eigenvalues of a symmetric 3 × 3 matrix, least first (Jacobi). */
function eigenSym(A: M3): V3 {
  const a = A.map((r) => [...r]);
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) off += a[i]![j]! ** 2; if (off < 1e-30) break;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) {
      if (Math.abs(a[p]![q]!) < 1e-300) continue;
      const th = (a[q]![q]! - a[p]![p]!) / (2 * a[p]![q]!), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), cs = 1 / Math.sqrt(t * t + 1), sn = t * cs;
      for (let k = 0; k < 3; k++) { const akp = a[k]![p]!, akq = a[k]![q]!; a[k]![p] = cs * akp - sn * akq; a[k]![q] = sn * akp + cs * akq; }
      for (let k = 0; k < 3; k++) { const apk = a[p]![k]!, aqk = a[q]![k]!; a[p]![k] = cs * apk - sn * aqk; a[q]![k] = sn * apk + cs * aqk; }
    }
  }
  return [a[0]![0]!, a[1]![1]!, a[2]![2]!].sort((x, y) => x - y) as V3;
}

export interface MaterialShare { mat: string; is: string; specified: boolean; mass: number; share: number; pieces: number; density: Evidence | 'none' }
export interface MadeOf {
  mass: number;
  /** By material, heaviest first. */
  materials: MaterialShare[];
  /** By element, kg, heaviest first; and the mass whose make-up is not known down to elements. */
  elements: { element: string; mass: number; share: number }[]; elementsUnknown: number;
  /** The thing's own tree: each thing in it once for each place, its mass and its share of what holds it. */
  tree: { depth: number; name: string; mat: string | null; count: number; mass: number; share: number }[];
  /** What is not known, said. */
  unknown: string[];
}

/** A thing opened as its materials all the way down. */
export function madeOf(t: Part | Assembly, depth = 6): MadeOf {
  const { pieces, unplaced } = piecesOf(t), total = pieces.reduce((a, p) => a + p.mass, 0) + unplaced.reduce((a, p) => a + p.mass, 0);
  const byMat = new Map<string, { mass: number; n: number }>(), unknown: string[] = [];
  let noMat = 0, noMatN = 0, weightless = 0; const weightlessMats = new Set<string>();
  for (const p of pieces) {
    if (!p.mat) { noMat += p.mass; noMatN++; continue; }
    if (!densityKg(p.mat)) { weightless++; weightlessMats.add(p.mat); }
    const e = byMat.get(p.mat) ?? { mass: 0, n: 0 }; e.mass += p.mass; e.n++; byMat.set(p.mat, e);
  }
  const materials: MaterialShare[] = [...byMat].map(([mat, e]) => { const m = matterOf(mat), d = m.props.find((x) => x.key === 'density'); return { mat, is: m.is, specified: m.specified, mass: e.mass, share: total ? e.mass / total : 0, pieces: e.n, density: d ? d.evidence : ('none' as const) }; }).sort((a, b) => b.mass - a.mass);
  const els = new Map<string, number>(); let elementsUnknown = noMat + unplaced.reduce((a, p) => a + p.mass, 0);
  for (const m of materials) { const e = matterOf(m.mat).makeup.elements, sum = Object.values(e).reduce((a, x) => a + x, 0); if (sum < 1) { elementsUnknown += m.mass; continue; } for (const [el, pct] of Object.entries(e)) els.set(el, (els.get(el) ?? 0) + (m.mass * pct) / sum); }
  if (noMatN) unknown.push(`${noMatN} pieces (${noMat.toPrecision(3)} kg) carry no material: what they are made of is not said`);
  if (weightless) unknown.push(`${weightless} pieces are of materials with no density (${[...weightlessMats].join(', ')}): they weigh nothing here`);
  const vague = materials.filter((m) => !m.specified);
  if (vague.length) unknown.push(`${vague.length} materials are known only by their family (${vague.slice(0, 8).map((m) => m.mat).join(', ')}${vague.length > 8 ? ', …' : ''}): ${(100 * vague.reduce((a, m) => a + m.share, 0)).toFixed(1)} % of the mass`);
  if (unplaced.length) unknown.push(`${unplaced.length} masses are stated, not worked out from a shape and a material (${unplaced.slice(0, 5).map((u) => u.name).join(', ')}${unplaced.length > 5 ? ', …' : ''}): ${unplaced.reduce((a, u) => a + u.mass, 0).toPrecision(3)} kg`);
  // the thing's own tree, a level at a time: an assembly's items (each thing once, with how many times it is placed), a
  // part's own piece and its parts
  const tree: MadeOf['tree'] = [];
  const add = (a: Part | Assembly, d: number, count: number, parentMass: number) => {
    const m = massOfAll(a) * count; tree.push({ depth: d, name: a.name, mat: isPart(a) ? a.mat ?? null : null, count, mass: m, share: parentMass ? m / parentMass : 1 });
    if (d >= depth) return;
    if (isPart(a)) for (const c of a.parts ?? []) add(c, d + 1, count, m);
    else { const groups = new Map<object, { of: Part | Assembly; n: number; k: number }>(); for (const it of a.items) { const g = groups.get(it.of) ?? { of: it.of, n: 0, k: Math.abs(it.s ** 3) }; g.n++; groups.set(it.of, g); } for (const g of groups.values()) add(g.of, d + 1, count * g.n * g.k, m); }
  };
  add(t, 0, 1, 0);
  return { mass: total, materials, elements: [...els].map(([element, mass]) => ({ element, mass, share: total ? mass / total : 0 })).sort((a, b) => b.mass - a.mass), elementsUnknown, tree, unknown };
}

/** One piece on a path, as it carries heat, current and force along the path's axis. */
export interface PathPiece { name: string; mat: string | null; L: number; A: number; areaExact: boolean; thermal?: number; electrical?: number; compliance?: number; growth?: number; standIn: string[] }
export interface PathResult {
  pieces: PathPiece[]; missing: string[];
  /** Summed in series, each only where every piece has what it needs (else null, with why). */
  thermal: number | null; electrical: number | null; stiffness: number | null; growth: number | null;
  /** Where neighbours on the path grow by different amounts per kelvin: the strain between them, and the stress if each
   *  were held to the other (E Δα ΔT, the stiffer one's E: an upper bound, uniaxial). */
  mismatch: { a: string; b: string; strain: number; stress: number | null }[];
  lacking: string[];
}

/**
 * What a path through a thing carries (docs/REALITY.md, step 7): pieces named in order, one after another along an axis,
 * in series. Each piece's length is its extent along the axis, its section its volume over that length (exact for a
 * prism or a cylinder lying along the axis, a mean for anything else, said); from what it is made of, its resistance to
 * heat L / (k A), to current L / (σ A), its give under an axial force L / (E A), and its growth α L ΔT. Summed in series.
 * What is left out, said: the resistance where two pieces touch (to heat it is often the larger part), bending, and any
 * path but the one named. Wood along its grain.
 */
export function alongPath(t: Part | Assembly, names: string[], axis: 'x' | 'y' | 'z', dT = 0): PathResult {
  const k = axis === 'x' ? 0 : axis === 'y' ? 1 : 2, found = new Map<string, PathPiece>(), missing: string[] = [];
  flatten(t, (f) => {
    const leaf = f.leaf; if (!names.includes(leaf.name) || found.has(leaf.name) || !leaf.shape) return;
    const b = shapeBox(leaf.shape); if (!b) return;
    const box = b.clone().applyMatrix4(f.m), size = box.getSize(new THREE.Vector3()).toArray(), L = size[k]!;
    const mat = f.over.mat ?? leaf.mat ?? null, rho = mat ? densityKg(mat) : undefined, det = Math.abs(f.m.determinant());
    const V = rho ? (massOf({ ...leaf, parts: [] }) / (leaf.mat ? densityKg(leaf.mat) ?? rho : rho)) * det : undefined;
    const boxA = size.filter((_, i) => i !== k).reduce((a, x) => a * x, 1), A = V !== undefined && L > 0 ? V / L : boxA;
    const props = mat ? matterOf(mat).props : [], get = (key: string) => props.find((p) => p.key === key);
    const kk = get('k'), s = get('conductivity'), E = get('E'), al = get('alpha'), standIn = [kk, s, E, al].filter((p) => p?.evidence === 'stand-in').map((p) => p!.name);
    // (exact where the section is the same all along: a box square to the axes, or a cylinder lying along the axis)
    const along = Math.abs(new THREE.Vector3(0, 1, 0).transformDirection(f.m).toArray()[k]!) > 1 - 1e-9;
    const exact = V !== undefined && (('box' in leaf.shape && Math.abs(V / L - boxA) < 1e-9 * boxA) || ('cyl' in leaf.shape && along && (leaf.shape.cyl[2] === undefined || leaf.shape.cyl[2] === leaf.shape.cyl[0])));
    found.set(leaf.name, { name: leaf.name, mat, L, A, areaExact: !!exact, ...(kk && A > 0 ? { thermal: L / (kk.value * A) } : {}), ...(s && s.value > 0 && A > 0 ? { electrical: L / (s.value * A) } : {}), ...(E && A > 0 ? { compliance: L / (E.value * A) } : {}), ...(al ? { growth: al.value * L * dT } : {}), standIn });
  });
  const pieces: PathPiece[] = [];
  for (const n of names) { const p = found.get(n); if (p) pieces.push(p); else missing.push(n); }
  const lacking: string[] = [];
  const sum = (key: 'thermal' | 'electrical' | 'compliance' | 'growth', what: string) => { const no = pieces.filter((p) => p[key] === undefined); if (no.length || !pieces.length) { if (pieces.length) lacking.push(`${what}: ${no.map((p) => `${p.name} (${p.mat ?? 'no material'})`).join(', ')} has no ${what} known`); return null; } return pieces.reduce((a, p) => a + p[key]!, 0); };
  const thermal = sum('thermal', 'thermal conductivity'), electrical = sum('electrical', 'electrical conductivity'), c = sum('compliance', 'elastic modulus'), growth = sum('growth', 'thermal expansion');
  const mismatch: PathResult['mismatch'] = [];
  for (let i = 1; i < pieces.length; i++) {
    const a = pieces[i - 1]!, b = pieces[i]!, pa = a.mat ? matterOf(a.mat).props : [], pb = b.mat ? matterOf(b.mat).props : [];
    const aa = pa.find((p) => p.key === 'alpha')?.value, ab = pb.find((p) => p.key === 'alpha')?.value; if (aa === undefined || ab === undefined || aa === ab || !dT) continue;
    const Ea = pa.find((p) => p.key === 'E')?.value, Eb = pb.find((p) => p.key === 'E')?.value, strain = Math.abs(aa - ab) * Math.abs(dT);
    mismatch.push({ a: a.name, b: b.name, strain, stress: Ea !== undefined && Eb !== undefined ? Math.max(Ea, Eb) * strain : null });
  }
  return { pieces, missing, thermal, electrical, stiffness: c === null ? null : c > 0 ? 1 / c : null, growth, mismatch, lacking };
}

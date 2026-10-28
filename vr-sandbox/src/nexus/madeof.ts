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
import { solveLinear } from './numeric';
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
export interface PathPiece { name: string; mat: string | null; L: number; A: number; areaExact: boolean; thermal?: number; electrical?: number; compliance?: number; growth?: number; alpha?: number; E?: number; yields?: number; standIn: string[];
  /** Its section's second moments for bending toward each of the other two axes (in the order x, y, z less the path's), m⁴. */
  I: [number, number] }
export interface PathResult {
  pieces: PathPiece[]; missing: string[];
  /** The path as stages one after another, each one piece or several side by side. */
  stages: string[][];
  /** Summed in series over the stages, each stage's pieces in parallel; each only where every piece has what it needs
   *  (else null, with why). */
  thermal: number | null; electrical: number | null; stiffness: number | null; growth: number | null;
  /** The axial force at which the first piece yields: each stage carries it all, its pieces sharing it by their
   *  stiffness, so a stage yields when its first piece reaches its own yield strain. */
  strength: { force: number; first: string } | null;
  /** Where pieces joined grow by different amounts per kelvin (neighbouring stages, and pieces side by side): the strain
   *  between them, and the stress if each were held to the other (E Δα ΔT, the stiffer one's E: an upper bound, uniaxial). */
  mismatch: { a: string; b: string; strain: number; stress: number | null }[];
  /** Held fixed at its start, pushed sideways at its end: the force per metre of deflection there, toward each of the
   *  other two axes (Euler–Bernoulli, exact for a stepped beam: δ = P Σ ((L − a)³ − (L − b)³) / 3 E I over its stages;
   *  pieces side by side bending each about its own middle, so less than bonded ones would be). */
  bending: [number, number] | null;
  /** The push along it it takes at least before it buckles, with its ends held as said: π² E I / (K L)² with the least
   *  E I of any stage and the whole length (a stepped column is stiffer everywhere than one as weak as its weakest
   *  stage, so this is a floor, never an overestimate). */
  buckles: number | null;
  /** The joints between stages, each with its area and what a contact conductance or resistance added there. */
  joints: { a: string; b: string; area: number }[];
  lacking: string[];
}
/** How a path's ends are held, for buckling: K, its effective length over its length (the theoretical values). */
export const END_K: Record<string, number> = { 'pinned at both ends': 1, 'fixed at both ends': 0.5, 'fixed at one end, pinned at the other': 0.699, 'fixed at one end, free at the other': 2 };

/** Each named piece of a thing as it lies along an axis: its length, section and second moments, and from what it is
 *  made of its resistances, its give, its growth and its yield. */
function measure(t: Part | Assembly, names: string[], k: number, dT: number, found: Map<string, PathPiece>): void {
  flatten(t, (f) => {
    const leaf = f.leaf; if (!names.includes(leaf.name) || found.has(leaf.name) || !leaf.shape) return;
    const b = shapeBox(leaf.shape); if (!b) return;
    const box = b.clone().applyMatrix4(f.m), size = box.getSize(new THREE.Vector3()).toArray(), L = size[k]!;
    const mat = f.over.mat ?? leaf.mat ?? null, rho = mat ? densityKg(mat) : undefined, det = Math.abs(f.m.determinant());
    const V = rho ? (massOf({ ...leaf, parts: [] }) / (leaf.mat ? densityKg(leaf.mat) ?? rho : rho)) * det : undefined;
    const boxA = size.filter((_, i) => i !== k).reduce((a, x) => a * x, 1), A = V !== undefined && L > 0 ? V / L : boxA;
    const props = mat ? matterOf(mat).props : [], get = (key: string) => props.find((p) => p.key === key);
    const kk = get('k'), s = get('conductivity'), E = get('E'), al = get('alpha'), y = get('yield'), standIn = [kk, s, E, al, y].filter((p) => p?.evidence === 'stand-in').map((p) => p!.name);
    // (exact where the section is the same all along: a box square to the axes, or a cylinder lying along the axis)
    const along = Math.abs(new THREE.Vector3(0, 1, 0).transformDirection(f.m).toArray()[k]!) > 1 - 1e-9;
    const exact = V !== undefined && (('box' in leaf.shape && Math.abs(V / L - boxA) < 1e-9 * boxA) || ('cyl' in leaf.shape && along && (leaf.shape.cyl[2] === undefined || leaf.shape.cyl[2] === leaf.shape.cyl[0])));
        // its section's second moments: exact for a box square to the axes and a cylinder along the axis; else its box's,
    // scaled to its mean section (an estimate, as its section is)
    const [u, v] = [0, 1, 2].filter((i) => i !== k) as [number, number], su = size[u]!, sv = size[v]!;
    const I: [number, number] = 'cyl' in leaf.shape && along ? [(Math.PI * (su / 2) ** 4) / 4, (Math.PI * (sv / 2) ** 4) / 4] : [((sv * su ** 3) / 12) * (A / boxA) ** 2, ((su * sv ** 3) / 12) * (A / boxA) ** 2];
    found.set(leaf.name, { name: leaf.name, mat, L, A, I, areaExact: !!exact, ...(kk && A > 0 ? { thermal: L / (kk.value * A) } : {}), ...(s && s.value > 0 && A > 0 ? { electrical: L / (s.value * A) } : {}), ...(E && A > 0 ? { compliance: L / (E.value * A), E: E.value } : {}), ...(al ? { growth: al.value * L * dT, alpha: al.value } : {}), ...(y ? { yields: y.value } : {}), standIn });
  });
}

/**
 * What a path through a thing carries (docs/REALITY.md, step 7): stages one after another along an axis, in series, each
 * one piece or several side by side, in parallel, joined at both ends. Each piece's length is its extent along the axis,
 * its section its volume over that length (exact for a prism or a cylinder lying along the axis, a mean for anything
 * else, said); from what it is made of, its resistance to heat L / (k A), to current L / (σ A), its stiffness E A / L and
 * its growth α L ΔT. In series resistances add; side by side conductances and stiffnesses add, and pieces held together
 * at both ends grow by their stiffness-weighted mean (Turner). Its strength: the force at which the first piece yields.
 * What is left out, said: the resistance where two pieces touch (to heat it is often the larger part), bending,
 * buckling, any path but the one named. Wood along its grain.
 */
export function alongPath(t: Part | Assembly, path: (string | string[])[], axis: 'x' | 'y' | 'z', dT = 0, o: { K?: number; contactW?: number; contactOhm?: number } = {}): PathResult {
  const stages0 = path.map((x) => (Array.isArray(x) ? x : [x])), names = stages0.flat();
  const k = axis === 'x' ? 0 : axis === 'y' ? 1 : 2, found = new Map<string, PathPiece>(), missing: string[] = [];
  measure(t, names, k, dT, found);
  const pieces: PathPiece[] = [];
  for (const n of names) { const p = found.get(n); if (p) pieces.push(p); else missing.push(n); }
  const stages = stages0.map((st) => st.map((n) => found.get(n)).filter((p): p is PathPiece => !!p)).filter((st) => st.length);
  const lacking: string[] = [];
  for (const st of stages) if (st.length > 1 && Math.max(...st.map((p) => p.L)) > 1.01 * Math.min(...st.map((p) => p.L))) lacking.push(`side by side, ${st.map((p) => p.name).join(' and ')} are not as long as each other: each is taken as joined at both ends, so its strength and growth are what such a joint would make them`);
  const need = (key: keyof PathPiece, what: string) => { const no = pieces.filter((p) => p[key] === undefined); if (no.length && pieces.length) lacking.push(`${what}: ${no.map((p) => `${p.name} (${p.mat ?? 'no material'})`).join(', ')} has no ${what} known`); return !no.length && pieces.length > 0; };
  // in series the stages' resistances add; side by side, within a stage, their conductances add
  const series = (key: 'thermal' | 'electrical' | 'compliance') => stages.reduce((a, st) => a + 1 / st.reduce((c, p) => c + 1 / p[key]!, 0), 0);
  const thermal = need('thermal', 'thermal conductivity') ? series('thermal') : null, electrical = need('electrical', 'electrical conductivity') ? series('electrical') : null;
  const hasE = need('compliance', 'elastic modulus'), c = hasE ? series('compliance') : null;
  // a stage of pieces held together at both ends grows by the mean of each one's free growth weighted by its stiffness
  const growth = need('growth', 'thermal expansion') ? stages.reduce((a, st) => a + (st.length === 1 ? st[0]!.growth! : hasE ? st.reduce((g, p) => g + p.growth! / p.compliance!, 0) / st.reduce((q, p) => q + 1 / p.compliance!, 0) : NaN), 0) : null;
  let strength: PathResult['strength'] = null;
  if (hasE && need('yields', 'yield strength')) for (const st of stages) {
    // the stage stretches as one: each piece at strain F / Σ(E A) of the pieces as long as it; the first to reach σy / E
    const first = st.reduce((w, p) => (p.yields! / p.E! < w.yields! / w.E! ? p : w)), F = (first.yields! / first.E!) * st.reduce((a, p) => a + p.E! * p.A, 0);
    if (!strength || F < strength.force) strength = { force: F, first: first.name };
  }
  const mismatch: PathResult['mismatch'] = [];
  const pair = (a: PathPiece, b: PathPiece) => {
    if (a.alpha === undefined || b.alpha === undefined || a.alpha === b.alpha || !dT) return;
    const strain = Math.abs(a.alpha - b.alpha) * Math.abs(dT);
    mismatch.push({ a: a.name, b: b.name, strain, stress: a.E !== undefined && b.E !== undefined ? Math.max(a.E, b.E) * strain : null });
  };
  stages.forEach((st, i) => { for (let x = 0; x < st.length; x++) for (let y = x + 1; y < st.length; y++) pair(st[x]!, st[y]!); if (i) for (const a of stages[i - 1]!) for (const b of st) pair(a, b); });
  // where two stages meet: through the lesser of their sections; a contact conductance (W/m² K) or resistance (Ω) given
  // for the joints adds there; none given, the joints are left out (said)
  const sect = (st: PathPiece[]) => st.reduce((a, p) => a + p.A, 0);
  const joints = stages.slice(1).map((st, i) => ({ a: stages[i]!.map((p) => p.name).join(' + '), b: st.map((p) => p.name).join(' + '), area: Math.min(sect(stages[i]!), sect(st)) }));
  const thermalAll = thermal === null ? null : thermal + (o.contactW ? joints.reduce((a, j) => a + 1 / (o.contactW! * j.area), 0) : 0);
  const electricalAll = electrical === null ? null : electrical + (o.contactOhm ? o.contactOhm * joints.length : 0);
  // as a beam held at its start: each stage's E I (side by side, summed), along its length
  let bending: PathResult['bending'] = null, buckles: number | null = null;
  if (hasE) {
    const EI = stages.map((st) => [0, 1].map((d) => st.reduce((a, p) => a + p.E! * p.I[d]!, 0)) as [number, number]), Ls = stages.map((st) => Math.max(...st.map((p) => p.L))), Lt = Ls.reduce((a, x) => a + x, 0);
    if (EI.every((e) => e[0] > 0 && e[1] > 0) && Lt > 0) {
      let a = 0; const f: [number, number] = [0, 0];
      stages.forEach((_, i) => { const b = a + Ls[i]!; for (const d of [0, 1]) f[d] += ((Lt - a) ** 3 - (Lt - b) ** 3) / (3 * EI[i]![d]!); a = b; });
      bending = [1 / f[0], 1 / f[1]];
      buckles = (Math.PI ** 2 * Math.min(...EI.flat())) / ((o.K ?? 1) * Lt) ** 2;
    }
  }
  return { pieces, missing, stages: stages.map((st) => st.map((p) => p.name)), thermal: thermalAll, electrical: electricalAll, stiffness: c === null ? null : c > 0 ? 1 / c : null, growth, strength, mismatch, bending, buckles, joints, lacking };
}

/** A network through a thing: each piece a branch between two named junctions. */
export interface NetworkResult { pieces: PathPiece[]; missing: string[]; thermal: number | null; electrical: number | null; stiffness: number | null; lacking: string[] }

/**
 * What a network of pieces carries between two junctions (docs/REALITY.md, step 7): each piece a branch from one junction
 * to another, each measured along the axis as on a path, the network solved by nodal analysis (each junction's balance,
 * Kirchhoff's current law, as a linear system) for the resistance to heat and to current between the two, and its
 * stiffness as springs along the axis between them (each junction moving only along it). A path that splits and rejoins
 * is one; so is a bridge no series-and-parallel reduction can take. Contact at the junctions is left out, said.
 */
export function throughNetwork(t: Part | Assembly, branches: { name: string; a: string; b: string }[], axis: 'x' | 'y' | 'z', from: string, to: string): NetworkResult {
  const k = axis === 'x' ? 0 : axis === 'y' ? 1 : 2, found = new Map<string, PathPiece>();
  measure(t, branches.map((x) => x.name), k, 0, found);
  const missing = branches.filter((x) => !found.has(x.name)).map((x) => x.name), pieces = [...new Set(branches.map((x) => x.name))].map((n) => found.get(n)).filter((p): p is PathPiece => !!p);
  const nodes = [...new Set(branches.flatMap((x) => [x.a, x.b]))], lacking: string[] = [];
  if (!nodes.includes(from) || !nodes.includes(to)) lacking.push(`the junctions ${from} and ${to} must both be ends of branches`);
  const solve = (key: 'thermal' | 'electrical' | 'compliance', what: string): number | null => {
    const live = branches.filter((x) => found.has(x.name));
    const no = live.filter((x) => found.get(x.name)![key] === undefined); if (no.length) { lacking.push(`${what}: ${no.map((x) => x.name).join(', ')} has none known`); return null; }
    if (!nodes.includes(from) || !nodes.includes(to) || from === to) return null;
    // the junctions other than the two ends are unknown; the end `from` held at 1, `to` at 0; what flows out of `from`
    // at that difference is the network's conductance
    const inner = nodes.filter((n) => n !== from && n !== to), at = new Map(inner.map((n, i) => [n, i]));
    const G = inner.map(() => inner.map(() => 0)), rhs = inner.map(() => 0);
    for (const x of live) {
      const g = 1 / found.get(x.name)![key]!, i = at.get(x.a), j = at.get(x.b);
      if (i !== undefined) { G[i]![i]! += g; if (j !== undefined) G[i]![j]! -= g; else if (x.b === from) rhs[i]! += g; }
      if (j !== undefined) { G[j]![j]! += g; if (i !== undefined) G[j]![i]! -= g; else if (x.a === from) rhs[j]! += g; }
    }
    const v = inner.length ? solveLinear(G, rhs) : [];
    if (!v) { lacking.push(`${what}: some junctions reach neither end, so the network cannot be solved`); return null; }
    const V = (n: string) => (n === from ? 1 : n === to ? 0 : v[at.get(n)!]!);
    const out = live.reduce((a, x) => { const g = 1 / found.get(x.name)![key]!; return a + (x.a === from ? g * (1 - V(x.b)) : x.b === from ? g * (1 - V(x.a)) : 0); }, 0);
    if (!(out > 0)) { lacking.push(`${what}: nothing joins ${from} to ${to}`); return null; }
    return 1 / out;
  };
  const thermal = solve('thermal', 'thermal conductivity'), electrical = solve('electrical', 'electrical conductivity'), c = solve('compliance', 'elastic modulus');
  return { pieces, missing, thermal, electrical, stiffness: c === null ? null : 1 / c, lacking: [...new Set(lacking)] };
}

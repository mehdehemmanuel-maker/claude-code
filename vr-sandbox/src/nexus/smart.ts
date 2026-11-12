// Smart parts (the user, 2026-11-12: "how can we make things cheaper and more advanced more visually better more
// physically better and more functionally better in one move"; the answer agreed: the parts carry the intelligence, and
// the model only picks and sizes them). A smart part is ONE definition of a kind of thing. From a few sizes it gives its
// real pieces in place, its interfaces with its neighbours, its behaviour (what it weighs follows from its pieces; how
// it moves, how far, how hard) and its function (the energy it takes and where its ports are). Nothing in it is asked of
// a model, so making one costs no call, and changing a size makes it again.
//
// The first is the hydraulic cylinder, the pattern for the rest. Its proportions are those of an ordinary welded
// double-acting cylinder and are typical, not a maker's catalogue: bore 0.8 of the barrel's outside (a wall of a tenth),
// rod 0.5 of the outside (0.625 of the bore), a gland a little proud of the barrel, an eye at each end, a port near each
// end of the barrel.

export type Row = Record<string, unknown>;
type V = number[];
const add = (a: V, b: V, k = 1): V => [a[0]! + b[0]! * k, a[1]! + b[1]! * k, a[2]! + b[2]! * k];
const mid = (a: V, b: V): V => [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2, (a[2]! + b[2]!) / 2];
const far = (a: V, b: V) => Math.hypot(b[0]! - a[0]!, b[1]! - a[1]!, b[2]! - a[2]!);

export interface CylinderAsk {
  name: string; /** the pin its barrel end turns on, and the pin its rod end turns on, mm */ eyeA: V; eyeB: V;
  /** the barrel's outside diameter, mm */ od: number; /** the barrel's and the rod's lengths, mm (from the stroke asked) */ barrel: number; rod: number;
  /** the least and the most its pins are apart over the joint it works, mm */ closed: number; open: number;
  /** the bodies its barrel and its rod are */ bodyBarrel: number; bodyRod: number; /** the line its pins lie along (across the machine) */ pinAxis?: V }
export interface SmartMade { rows: Row[]; /** the layout's slide: the rod's row by name, the two bodies, its travel from where it stands, mm */ slide: Row;
  /** what it is, as numbers: its interfaces, its behaviour and its function */
  spec: { bore: number; rod: number; stroke: number; closed: number; open: number; pin: number; ports: [string, string]; takes: 'fluid'; pushKN: number; pullKN: number };
  says: string }

/** A hydraulic cylinder between two pins: barrel, base cap and eye, gland, two ports, rod, piston, rod eye. */
export function cylinder(q: CylinderAsk): SmartMade {
  const L0 = far(q.eyeA, q.eyeB) || 1, u: V = [(q.eyeB[0]! - q.eyeA[0]!) / L0, (q.eyeB[1]! - q.eyeA[1]!) / L0, (q.eyeB[2]! - q.eyeA[2]!) / L0], z = q.pinAxis ?? [0, 0, 1], od = q.od;
  // (the side its ports stand on: square to its line and to its pins)
  const n: V = [u[1]! * z[2]! - u[2]! * z[1]!, u[2]! * z[0]! - u[0]! * z[2]!, u[0]! * z[1]! - u[1]! * z[0]!], nl = Math.hypot(...n) || 1, side: V = [n[0]! / nl, n[1]! / nl, n[2]! / nl];
  const bore = 0.8 * od, rodD = 0.5 * od, pin = Math.max(2, 0.45 * od), dark = '#3a3f47', bright = '#c9d1d9', steel = 'steel-low';
  const at = (p: V, d: number) => add(p, u, d), row = (nm: string, a: V, b: V, thick: number, shape: 'rod' | 'tube', color: string, body: number): Row => ({ name: nm, span: [a, b], thick, shape, size: [thick, far(a, b), thick], at: mid(a, b), mat: steel, color, rot: [0, 0, 0], body });
  const Lb = Math.max(1.6 * od, q.barrel), Lr = Math.max(od, q.rod), b0 = 0.6 * od, rows: Row[] = [
    row(`${q.name} base eye`, add(q.eyeA, z, -0.45 * od), add(q.eyeA, z, 0.45 * od), 0.95 * od, 'rod', dark, q.bodyBarrel),
    row(`${q.name} base cap`, at(q.eyeA, 0.3 * od), at(q.eyeA, b0), 1.04 * od, 'rod', dark, q.bodyBarrel),
    row(`${q.name} barrel`, at(q.eyeA, b0), at(q.eyeA, Lb), od, 'tube', dark, q.bodyBarrel),
    row(`${q.name} gland`, at(q.eyeA, Lb - 0.25 * od), at(q.eyeA, Lb + 0.12 * od), 1.12 * od, 'tube', '#2b2f36', q.bodyBarrel),
    row(`${q.name} port A`, add(at(q.eyeA, b0 + 0.35 * od), side, 0.45 * od), add(at(q.eyeA, b0 + 0.35 * od), side, 0.78 * od), 0.24 * od, 'rod', '#8a6d1f', q.bodyBarrel),
    row(`${q.name} port B`, add(at(q.eyeA, Lb - 0.6 * od), side, 0.45 * od), add(at(q.eyeA, Lb - 0.6 * od), side, 0.78 * od), 0.24 * od, 'rod', '#8a6d1f', q.bodyBarrel),
    row(`${q.name} rod`, at(q.eyeB, -Lr), at(q.eyeB, -0.3 * od), rodD, 'rod', bright, q.bodyRod),
    row(`${q.name} piston`, at(q.eyeB, -Lr), at(q.eyeB, -Lr + 0.3 * od), 0.97 * bore, 'rod', '#6b7280', q.bodyRod),
    row(`${q.name} rod eye`, add(q.eyeB, z, -0.4 * od), add(q.eyeB, z, 0.4 * od), 0.9 * od, 'rod', bright, q.bodyRod),
  ];
  const stroke = q.open - q.closed, A = (Math.PI * bore * bore) / 4, Ar = A - (Math.PI * rodD * rodD) / 4, kN = (mm2: number) => +(25 * mm2 / 1000).toFixed(1);
  return { rows, slide: { rod: `${q.name} rod`, a: q.bodyBarrel, b: q.bodyRod, range: [Math.round(L0 - q.open), Math.round(L0 - q.closed)] },
    spec: { bore: Math.round(bore), rod: Math.round(rodD), stroke: Math.round(stroke), closed: Math.round(q.closed), open: Math.round(q.open), pin: Math.round(pin), ports: [`${q.name} port A`, `${q.name} port B`], takes: 'fluid', pushKN: kN(A), pullKN: kN(Ar) },
    says: `${q.name}: bore ${Math.round(bore)} mm, rod ${Math.round(rodD)} mm, stroke ${Math.round(stroke)} mm (${Math.round(q.closed)} to ${Math.round(q.open)} mm pin to pin), ${Math.round(pin)} mm pins; at 25 MPa (typical) it pushes ${kN(A)} kN and pulls ${kN(Ar)} kN; two ports` };
}

/** The smart parts there are, by kind: what each is, for the pipeline to offer and the page to list. */
export const SMART: Record<string, { says: string }> = {
  cylinder: { says: 'a hydraulic cylinder between two pins: barrel, cap and eye, gland, two ports, rod, piston and rod eye; its bore, stroke, forces and ports known' },
};

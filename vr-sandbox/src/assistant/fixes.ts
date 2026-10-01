// What would have held. Given a joint and the load that broke it (or is about to), find changes that carry that load
// with a margin: first more of the same (more screws, a bigger bolt, a longer weld leg), then other processes sized
// by the join planner. Every candidate is judged by the connector's own capacities, the numbers the physics uses.

import type { Material } from '../data/materials';
import { getConnectorKind, type Capacities, type Derived } from '../connectors/registry';
import { describeJoin, planJoin, type JoinGeometry } from '../connectors/plan';
import { numberOf, sanitizeParams, stringOf, type Params } from '../schema/params';
import { fastenerFit } from '../engineering/spacing';
import { biggerNail, biggerScrew } from '../engineering/fasteners';

/** Blind rivet diameters sold (3.2, 4.0, 4.8, 6.4 mm: 1/8, 5/32, 3/16, 1/4 in). */
const RIVETS = [0.0032, 0.004, 0.0048, 0.0064];

/** A fix carries this multiple of the load that broke it. */
export const MARGIN = 1.5;

export interface Fix {
  kind: string;
  params: Params;
  /** Capacity in the mode that failed, N or N·m. */
  capacity: number;
  label: string;
}

export interface Failed {
  kind: string;
  params: Params;
  /** tension, compression, shear, bending, torsion; 'instant' when it could never hold. */
  mode: string;
  load: number;
}

const MODES = ['tension', 'compression', 'shear', 'bending', 'torsion'] as const;

function derive(kind: string, params: Params, a: Material, b: Material | null, g: JoinGeometry): Derived {
  return getConnectorKind(kind).derive({ params, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: b ? g.thicknessB : g.thicknessA, through: g.through, distance: 0, cure: 1e12 });
}

const capIn = (c: Capacities, mode: string) => (MODES as readonly string[]).includes(mode) ? c[mode as keyof Capacities] : Math.min(c.tension, c.shear, c.bending, c.torsion);

/** More of the same: the variations a maker tries first on this kind of joint. */
function strengthen(kind: string, p: Params): Params[] {
  const n = numberOf(p, 'count', 1);
  switch (kind) {
    case 'screwed': case 'nailed': {
      // more of them, then the next stocked size up (a real screw or nail, not a scaled one)
      const up = (kind === 'screwed' ? biggerScrew : biggerNail)(numberOf(p, 'diameter'), numberOf(p, 'length'));
      return [{ ...p, count: n * 2 }, { ...p, count: n * 3 }, ...(up ? [{ ...p, count: n * 2, ...up }] : [])];
    }
    case 'riveted': {
      const d = numberOf(p, 'diameter'), next = RIVETS.find((x) => x > d + 1e-6);
      return [{ ...p, count: n * 2 }, { ...p, count: n * 3 }, ...(next ? [{ ...p, count: n * 2, diameter: next }] : [])];
    }
    case 'bolted': {
      const sizes = ['M5', 'M6', 'M8', 'M10', 'M12', 'M16', 'M20'];
      const i = sizes.indexOf(stringOf(p, 'size', 'M8'));
      const up = sizes.slice(i + 1, i + 3).map((size) => ({ ...p, size }));
      return [{ ...p, count: n + 1 }, ...up, { ...p, count: n * 2 }];
    }
    case 'weld':
      return [{ ...p, leg: numberOf(p, 'leg') * 1.5, quality: 1 }, { ...p, leg: numberOf(p, 'leg') * 2, quality: 1 }];
    case 'glued':
      return stringOf(p, 'adhesive') === 'epoxy-structural' ? [] : [{ ...p, adhesive: 'epoxy-structural' }];
    default:
      return [];
  }
}

const OTHERS = ['weld', 'bolted', 'screwed', 'riveted', 'glued'];

/** Up to `max` fixes, the smallest change first, each carrying MARGIN x the load. */
export function fixesFor(f: Failed, a: Material, b: Material | null, g: JoinGeometry, max = 2): Fix[] {
  const need = f.mode === 'instant' ? 0 : MARGIN * f.load;
  const out: Fix[] = [];
  const consider = (kind: string, params: Params, label: string) => {
    const k = getConnectorKind(kind);
    const clean = sanitizeParams(k.params, params);
    const d = derive(kind, clean, a, b, g);
    const cap = capIn(d.capacities, f.mode);
    if (d.instantFailure || !(cap > need) || !(cap > 0)) return;
    // and it has to be buildable: its fasteners must fit the joint's face with their edge distances and spacing
    if (fastenerFit(kind, { ...clean, bondW: g.bondW, bondL: g.bondL }, a, b)?.fits === false) return;
    if (out.some((o) => o.kind === kind && JSON.stringify(o.params) === JSON.stringify(clean))) return;
    out.push({ kind, params: clean, capacity: cap, label });
  };
  if (f.mode !== 'instant') {
    const more = strengthen(f.kind, f.params);
    // as many as the face has room for, at the same size (where twice as many don't fit, the most that do may hold)
    const room = fastenerFit(f.kind, { ...f.params, bondW: g.bondW, bondL: g.bondL }, a, b);
    if (room && room.max > numberOf(f.params, 'count', 1)) more.unshift({ ...f.params, count: room.max });
    for (const p of more) consider(f.kind, p, describeJoin(f.kind, sanitizeParams(getConnectorKind(f.kind).params, p)));
  }
  const same = out.length;
  for (const kind of OTHERS) {
    if (kind === f.kind) continue;
    const plan = planJoin(kind, a, b, g);
    if (plan.kind === kind) consider(kind, plan.params, plan.summary);
  }
  // the smallest change of the same kind, then the strongest other process
  const own = out.slice(0, same).sort((x, y) => x.capacity - y.capacity);
  const alt = out.slice(same).sort((x, y) => y.capacity - x.capacity);
  return [...own.slice(0, 1), ...alt, ...own.slice(1)].slice(0, max);
}

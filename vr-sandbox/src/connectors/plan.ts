// Choosing how to join two parts. Someone who wants two things to stay together picks the process that works for
// those materials and sizes it to the stock: a screw long enough to bite into the second piece, the filler wire that
// matches the metal, a glue that sticks to that surface. planJoin does the same, then checks its choice against the
// very capacities the physics will use, so what it picks is what holds.

import type { Material, MaterialCategory } from '../data/materials';
import { ADHESIVES, FILLERS, fillersFor, weldable } from '../engineering/joining';
import { defaultsOf, numberOf, sanitizeParams, stringOf, type Params } from '../schema/params';
import { getConnectorKind, type Derived } from './registry';

/** The Join page's "Best join": the planner picks the process. */
export const AUTO_JOIN = 'auto';

export interface JoinGeometry {
  /** Thinnest section of each part, m (what the world passes to the capacities). */
  thicknessA: number;
  thicknessB: number;
  /** The bonded face, m. */
  bondW: number;
  bondL: number;
}

export interface JoinPlan {
  kind: string;
  params: Params;
  /** What was done, in words: shown in the headset. */
  summary: string;
  /** Set when the requested process could not hold these parts and another was used. */
  substituted?: string;
}

const mm = 1e-3;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const snap = (x: number, step: number) => Math.round(x / step) * step;

const WOOD: MaterialCategory[] = ['wood', 'engineered-wood'];
const METAL: MaterialCategory[] = ['steel', 'stainless', 'cast-iron', 'aluminum', 'copper-alloy', 'titanium'];
const SOFT: MaterialCategory[] = ['textile', 'leather', 'foam', 'cork', 'elastomer'];
/** Surfaces joined by bonding: drilling or clamping them cracks them, or the bond is simply the trade's method. */
const BONDED: MaterialCategory[] = ['glass', 'ceramic', 'stone', 'composite', 'magnet'];
/** Low surface energy: nothing sticks. */
const SLICK: MaterialCategory[] = ['polyolefin', 'ptfe'];

const isAny = (m: Material, set: MaterialCategory[]) => set.includes(m.category);

/** What someone at the bench calls it: "wood", "steel", "brass". */
function plain(m: Material): string {
  switch (m.category) {
    case 'aluminum': return 'aluminium';
    case 'cast-iron': return 'cast iron';
    case 'copper-alloy': return m.name.split(' ')[0]!.toLowerCase();
    case 'engineered-wood': return 'wood';
    case 'polymer': return 'plastic';
    case 'polyolefin': return 'polyethylene';
    case 'ptfe': return 'PTFE';
    case 'elastomer': return 'rubber';
    case 'ceramic': return m.name.split(' ')[0]!.toLowerCase();
    default: return m.category;
  }
}
const Cap = (x: string) => x[0]!.toUpperCase() + x.slice(1);

/** Why this process can't join these parts, in a few words. */
function refusal(kind: string, a: Material, b: Material | null): string {
  const hold = b ?? a;
  const pair = b && plain(b) !== plain(a) ? ` to ${plain(b)}` : '';
  switch (kind) {
    case 'weld': {
      // a metal whose own alloy can't take fusion (2024, 7075, brass) is named; everything else by what it is
      const lone = [a, hold].find((m) => m.weld === 'none');
      if (lone) return `${isAny(lone, METAL) ? lone.name : Cap(plain(lone))} can't be welded.`;
      return `${Cap(plain(a))} can't be welded${pair}.`;
    }
    case 'nailed': return `Nails don't hold in ${plain(hold)}.`;
    case 'screwed': return `Screws won't bite in ${plain(hold)} here.`;
    case 'glued': {
      const slick = [a, hold].find((m) => isAny(m, SLICK));
      return slick ? `No glue sticks to ${plain(slick)}.` : `Glue won't hold ${plain(a)}${pair}.`;
    }
    case 'soldered': return `Solder won't wet ${plain([a, hold].find((m) => !['copper-alloy', 'steel', 'stainless'].includes(m.category)) ?? a)}.`;
    default: return `${getConnectorKind(kind).label} won't hold ${plain(a)}${pair}.`;
  }
}

/** The processes a maker would reach for, best first. */
function candidates(a: Material, b: Material | null): string[] {
  const hold = b ?? a;
  const either = (set: MaterialCategory[]) => isAny(a, set) || isAny(hold, set);
  if (!b) return ['bolted']; // anchoring to the floor: anchor bolts
  if (isAny(a, METAL) && isAny(b, METAL) && weldable(a.weld, b.weld)) return ['weld', 'bolted'];
  if (either(SLICK)) return ['bolted'];
  if (either(SOFT) || either(BONDED)) return ['glued', 'bolted'];
  if (isAny(hold, WOOD)) return ['screwed', 'bolted'];
  if (isAny(a, METAL) && isAny(b, METAL)) return ['riveted', 'bolted'];
  return ['bolted', 'glued'];
}

/** The adhesive the trade uses on this pair, or null when none sticks. */
function adhesiveFor(a: Material, b: Material | null): string | null {
  const cats = [a.category, (b ?? a).category];
  const has = (...c: MaterialCategory[]) => cats.some((x) => c.includes(x));
  if (has('polyolefin', 'ptfe')) return null;
  if (has('elastomer')) return 'cyanoacrylate';
  if (has('foam')) return 'hot-melt';
  if (has('textile', 'leather', 'cork')) return 'pu-construction';
  if (cats.every((c) => WOOD.includes(c))) return 'pva-wood';
  if (cats.every((c) => c === 'ceramic' || c === 'stone')) return 'mortar'; // masonry is laid in mortar
  if (cats.every((c) => c === 'polymer')) return 'cyanoacrylate';
  return 'epoxy-structural';
}

/** Fastener and process sized to the stock, as a maker would choose them. null: this process cannot join these. */
function fit(kind: string, a: Material, b: Material | null, g: JoinGeometry): Params | null {
  const tA = g.thicknessA;
  // what the point of a screw or nail bites into: part B, or when anchored, the ground (taken as deep)
  const tHold = b ? g.thicknessB : 0.1;
  const tMin = Math.min(tA, b ? g.thicknessB : tA);
  const face = Math.min(g.bondW, g.bondL);
  const area = g.bondW * g.bondL;
  switch (kind) {
    case 'weld': {
      const fillers = fillersFor(a.weld, (b ?? a).weld);
      if (!fillers.length) return null;
      const steel = a.weld === 'steel' && (b ?? a).weld === 'steel';
      // fillet leg about three quarters of the thinner plate (AWS D1.1 minimum sizes), 1 to 10 mm
      return { filler: fillers[0]!, process: steel ? 'mig' : 'tig', leg: clamp(snap(0.75 * tMin, 0.5 * mm), 1 * mm, 10 * mm), length: 0, quality: 0.95 };
    }
    case 'screwed': {
      const d = tA < 12 * mm ? 3.5 * mm : tA < 25 * mm ? 4 * mm : tA < 50 * mm ? 5 * mm : 6 * mm;
      // into about two thirds of the holding piece, at least 6 d when it is thick enough, never through it
      const pen = Math.max(Math.min((2 / 3) * tHold, 14 * d), Math.min(6 * d, 0.9 * tHold));
      const n = clamp(Math.round(area / (40 * mm) ** 2), 2, 12);
      return { diameter: d, length: clamp(snap(tA + pen, mm), 8 * mm, 200 * mm), count: n };
    }
    case 'nailed': {
      const d = 3.3 * mm;
      const pen = Math.max(Math.min((2 / 3) * tHold, 20 * d), Math.min(10 * d, 0.9 * tHold));
      return { diameter: d, length: clamp(snap(tA + pen, mm), 20 * mm, 200 * mm), count: clamp(Math.round(area / (30 * mm) ** 2), 3, 24) };
    }
    case 'bolted': {
      // by the thinner part, and small enough to keep 1.5 d of edge distance on the face
      const byT = tMin < 3 * mm ? 5 : tMin < 6 * mm ? 6 : tMin < 12 * mm ? 8 : tMin < 25 * mm ? 10 : 12;
      const sizes = [3, 4, 5, 6, 8, 10, 12];
      const d = sizes.filter((s) => s <= byT && 3 * s * mm <= face).pop() ?? 3;
      return { size: `M${d}`, count: clamp(Math.round(area / (60 * mm) ** 2), 1, 8), tightening: 'spec' };
    }
    case 'riveted': {
      const d = tMin <= 1.5 * mm ? 3.2 * mm : tMin <= 3 * mm ? 4 * mm : tMin <= 5 * mm ? 4.8 * mm : 6.4 * mm;
      const cats = [a.weld, (b ?? a).weld];
      const rivetMaterial = cats.includes('aluminum') ? 'aluminum' : cats.includes('stainless') ? 'stainless' : 'steel';
      return { type: 'blind', rivetMaterial, diameter: d, count: clamp(Math.round((2 * (g.bondW + g.bondL)) / (6 * d)), 2, 60) };
    }
    case 'glued': {
      const adhesive = adhesiveFor(a, b);
      return adhesive ? { adhesive } : null;
    }
    default:
      return {};
  }
}

function derive(kind: string, params: Params, a: Material, b: Material | null, g: JoinGeometry): Derived {
  return getConnectorKind(kind).derive({
    params, matA: a, matB: b, thicknessA: g.thicknessA, thicknessB: b ? g.thicknessB : g.thicknessA, distance: 0, cure: 1e12,
  });
}

/** Holds at all: no instant failure, and some strength in every way a rigid joint is loaded. */
function holds(d: Derived) {
  const c = d.capacities;
  return !d.instantFailure && c.tension > 0 && c.shear > 0 && c.bending > 0 && c.torsion > 0;
}

/** The process fitted to the stock and what it would hold (null: it can't join these at all). */
function build(kind: string, a: Material, b: Material | null, g: JoinGeometry): { params: Params; derived: Derived | null } {
  const k = getConnectorKind(kind);
  const fitted = fit(kind, a, b, g);
  const params = sanitizeParams(k.params, { ...defaultsOf(k.params), bondW: g.bondW, bondL: g.bondL, ...(fitted ?? {}) });
  return { params, derived: fitted ? derive(kind, params, a, b, g) : null };
}

const mmStr = (x: number) => `${Math.round(x / mm * 10) / 10} mm`;

/** What was done, in a line. */
export function describeJoin(kind: string, p: Params): string {
  const n = numberOf(p, 'count', 1);
  switch (kind) {
    case 'weld':
      return `Welded: ${stringOf(p, 'process', 'mig').toUpperCase()}, ${FILLERS[stringOf(p, 'filler', 'E70')]?.id ?? 'filler'} wire, ${mmStr(numberOf(p, 'leg'))} fillet all round`;
    case 'screwed':
      return `Screwed: ${n} × ${mmStr(numberOf(p, 'diameter'))} screws, ${mmStr(numberOf(p, 'length'))} long`;
    case 'nailed':
      return `Nailed: ${n} × ${mmStr(numberOf(p, 'length'))} nails`;
    case 'bolted':
      return `Bolted: ${n} × ${stringOf(p, 'size', 'M8')} ${stringOf(p, 'class', '8.8')} bolt${n === 1 ? '' : 's'} at spec torque`;
    case 'riveted':
      return `Riveted: ${n} × ${mmStr(numberOf(p, 'diameter'))} ${stringOf(p, 'rivetMaterial', 'aluminum').replace('aluminum', 'aluminium')} rivets`;
    case 'glued':
      return `Glued: ${ADHESIVES[stringOf(p, 'adhesive', 'epoxy-structural')]?.label ?? 'adhesive'}`;
    default:
      return getConnectorKind(kind).label;
  }
}

/** Kinds the planner fits and may stand in for: the rigid joining processes (not the generic rigid lock). */
export const isPlannedKind = (id: string) => {
  if (id === AUTO_JOIN) return true;
  const k = getConnectorKind(id);
  return k.category === 'Joining' && k.model === 'rigid' && id !== 'fixed';
};

/**
 * The join to make for this request. A specific process is kept, sized to the stock, when it can hold these parts;
 * when it can't (wood can't be welded, a nail won't hold in steel) the best real process is used instead and the
 * reason is returned. "Best join" always picks.
 */
export function planJoin(requested: string, a: Material, b: Material | null, g: JoinGeometry): JoinPlan {
  let refused: string | undefined;
  if (requested !== AUTO_JOIN) {
    const own = build(requested, a, b, g);
    if (own.derived && holds(own.derived)) return { kind: requested, params: own.params, summary: describeJoin(requested, own.params) };
    refused = refusal(requested, a, b);
  }
  const tried = candidates(a, b);
  for (const kind of [...tried, 'bolted']) {
    if (kind === requested) continue;
    const got = build(kind, a, b, g);
    if (!got.derived || !holds(got.derived)) continue;
    const summary = describeJoin(kind, got.params);
    return refused ? { kind, params: got.params, summary, substituted: refused } : { kind, params: got.params, summary };
  }
  // nothing holds: make the requested joint and let it fail honestly
  const kind = requested === AUTO_JOIN ? tried[0]! : requested;
  const params = build(kind, a, b, g).params;
  return { kind, params, summary: describeJoin(kind, params), substituted: refused };
}

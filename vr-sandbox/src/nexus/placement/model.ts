// The placement model (docs/PLACEMENT.md): what every placement node reads and writes. A part says what it needs, not
// where it goes: what it mounts on, what it connects to, what it keeps out of (heat over its material's limit, what
// moves), what it faces, and who must reach it. A solver places from needs; a field is a map of one quantity over the
// space the parts are in; every result keeps its reason and how sure it is.
//
// Needs here are read from what parts already state (Part.hot, Part.clear, Part.travel, joins, passes, fixed, Iface,
// each material's service limit), so nothing is typed by hand; what is read from a part's name rather than stated on it
// (who must reach a battery, which way a radiator faces) is marked inferred, with a lower confidence.

import * as THREE from 'three';
import type { Part } from '../kits';
import { layout, type Node, type OBB } from '../make/space';
import { AMBIENT, HARMED, HEAT_FALLOFF, MAX_SERVICE } from '../make/rules';

export type NeedKind = 'mount' | 'connect' | 'keepout' | 'face' | 'access' | 'group';
export interface Need {
  kind: NeedKind;
  /** the part that needs it, by name, and where it is in the tree */ part: string; path: string;
  /** what it is to: a part's name, or a quantity ('heat', 'motion', 'air') */ to: string;
  /** a distance kept, m (keep-out), or the most a quantity may be where it is (heat: °C) */ min?: number; below?: number;
  /** a direction it faces, in the thing's frame */ dir?: [number, number, number];
  /** how often it is reached, a year (access) */ perYear?: number;
  hard: boolean; why: string;
  /** where the figure comes from */ source: string;
  /** 1: stated on the part; less: inferred from what it is */ confidence: number;
}

/** What harm heat does: the rules' own list (make/rules.ts HARMED). */
export const HEAT_HARMED = HARMED;
/** The engine rocking on its mounts under torque, m each way (an estimate: rubber mounts of a car's engine move about
 *  ±10 mm, typical). */
export const MOUNT_ROCK = 0.01;
/** The gap kept from what moves where nothing says otherwise, m (typical: 10 mm). */
export const MOTION_GAP = 0.01;

// (what people reach, and how often a year (typical service intervals of a car: owner's manuals' schedules))
const ACCESS: [RegExp, string, number, string][] = [
  [/dipstick handle|^dipstick$/i, 'checking the oil', 12, 'monthly oil check (typical owner\'s manual)'],
  [/radiator cap|coolant reservoir|filler cap/i, 'checking the coolant', 12, 'monthly coolant check (typical owner\'s manual)'],
  [/^battery|battery-sli|hold-down clamp/i, 'the battery: terminals, jump start, replacing', 1, 'replaced every 3 to 5 years, jump-started any time (typical)'],
  [/oil filter/i, 'changing the oil filter', 1, 'every oil change, about yearly (typical)'],
  [/air filter|air cleaner/i, 'changing the air filter', 0.5, 'every 15,000 to 30,000 miles (typical)'],
  [/spark plug|ignition coil|coil pack/i, 'changing the plugs', 0.1, 'every 60,000 to 120,000 miles (typical)'],
  [/fuse box|relay box/i, 'changing a fuse', 0.2, 'when one blows (typical)'],
];
/** What a part is wired or piped to, kept near (inferred from what it is): a battery near its starter, whose cable carries
 *  the cranking current (the shorter it is, the less the voltage drops). */
export const NEAR: [RegExp, RegExp, string][] = [[/battery/i, /^starter motor$/i, 'its cable to the starter carries the cranking current: the shorter, the less it drops']];
// (what faces something: a heat exchanger faces the air coming in through the grille (+x, forward))
const FACES: [RegExp, [number, number, number], string][] = [[/^(radiator|condenser|charge air cooler)$/i, [1, 0, 0], 'the air through the grille']];

const own = (n: Node, k: keyof Part): unknown => { for (let x: Node | null = n; x; x = x.parent) if (x.p[k] !== undefined) return x.p[k]; return undefined; };

/** Every need of every part of a thing, read from what its parts state. */
export function needsOf(root: Part, nodes: Node[] = layout(root)): Need[] {
  const out: Need[] = [], hotTs = [...new Set(nodes.map((n) => n.p.hot).filter((t): t is number => !!t && t > AMBIENT))].sort((a, b) => b - a);
  for (const n of nodes) {
    const p = n.p, at = { part: p.name, path: n.path };
    // (heat: a part of a material heat harms keeps where it is below its limit; how far that is from the hottest
    // surface by the rules' fall-off)
    if (p.shape && HEAT_HARMED.test(p.mat ?? '') && hotTs.length) {
      const lim = MAX_SERVICE[p.mat!]; if (lim !== undefined && lim < hotTs[0]!) out.push({ kind: 'keepout', ...at, to: 'heat', below: lim, min: HEAT_FALLOFF * Math.log((hotTs[0]! - AMBIENT) / Math.max(1, lim - AMBIENT)), hard: true, why: `${p.mat} stands about ${lim} °C`, source: 'MAX_SERVICE (make/rules.ts): makers\' datasheets, typical', confidence: 1 });
    }
    // (motion: what moves keeps its gap from all it does not run on)
    if (p.clear) out.push({ kind: 'keepout', ...at, to: 'motion', min: p.clear, hard: true, why: 'it moves (its stated clearance)', source: 'Part.clear', confidence: 1 });
    if (p.travel) out.push({ kind: 'keepout', ...at, to: 'motion', min: MOTION_GAP, hard: true, why: `it moves${p.travel.steer ? `, steering ${Math.round((p.travel.steer * 180) / Math.PI)}°` : ''}${p.travel.bump ? `, ${Math.round(p.travel.bump * 1000)} mm of bump` : ''}`, source: 'Part.travel', confidence: 1 });
    if (p.joint === 'mount' && p.item === 'engine-mount' && !out.some((x) => x.to === 'motion' && x.why.startsWith('the engine rocks'))) out.push({ kind: 'keepout', ...at, to: 'motion', min: MOUNT_ROCK, hard: true, why: 'the engine rocks on its mounts', source: 'MOUNT_ROCK: ±10 mm, an estimate', confidence: 0.6 });
    // (what it is fixed to, connected to, or passes through)
    if (p.fixed) out.push({ kind: 'mount', ...at, to: p.joins?.[0] ?? '(its holder)', hard: true, why: p.fixed, source: 'Part.fixed', confidence: 1 });
    for (const j of p.joins ?? []) if (!p.fixed) out.push({ kind: 'mount', ...at, to: j, hard: true, why: 'joined to it', source: 'Part.joins', confidence: 1 });
    for (const q of p.passes ?? []) out.push({ kind: 'connect', ...at, to: q, hard: true, why: 'it passes through it', source: 'Part.passes', confidence: 1 });
    for (const f of p.iface ?? []) if (f.role === 'requires') out.push({ kind: 'connect', ...at, to: f.to ?? f.kind, hard: true, why: f.says ?? `requires a ${f.kind}`, source: 'Iface', confidence: 1 });
    // (inferred from what it is)
    if (p.shape || p.parts?.length) {
      const nm = `${p.name} ${p.item ?? ''}`;
      const a = ACCESS.find(([re]) => re.test(nm)); if (a && !out.some((x) => x.kind === 'access' && n.path.startsWith(x.path + '/'))) out.push({ kind: 'access', ...at, to: 'a hand', perYear: a[2], hard: false, why: a[1], source: a[3], confidence: 0.7 });
      const f = FACES.find(([re]) => re.test(p.name)); if (f) out.push({ kind: 'face', ...at, to: f[2], dir: f[1], hard: true, why: 'it is cooled by the air through it', source: 'what it is', confidence: 0.7 });
    }
  }
  return out;
}

/** A part's world pieces (its covering boxes), and those of all it holds. */
export function piecesUnder(n: Node): OBB[] { const out: OBB[] = []; const walk = (x: Node) => { out.push(...x.pieces); x.kids.forEach(walk); }; walk(n); return out; }
/** The world box of every node named like `re` (the engine, the bay), grown by `grow`. */
export function regionOf(nodes: Node[], re: RegExp, grow = 0.1): THREE.Box3 | null {
  const b = new THREE.Box3(); for (const n of nodes) if (re.test(n.p.name) && n.sub) b.union(n.sub);
  return b.isEmpty() ? null : b.expandByScalar(grow);
}
export { own };

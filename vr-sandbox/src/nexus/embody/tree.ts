// What a machine is made of, and how it goes together (docs/NEXUS-FROM-REALITY.md, section 28). Three readings of
// the parts, each from what they are and where they are, none written for any one machine:
//
//   tree       the machine, its assemblies, their subsystems, their parts: each part's assembly from what it was
//              designed in, its subsystem from what its designer made it for
//   load path  which parts touch (boxes within a millimetre) or are fastened into which; from the ground up, how
//              many contacts each is from what stands on the ground. A part the ground cannot be reached from is held
//              by nothing: a flaw, wherever it is
//   build      the order it goes together in: assemblies from the ground up along the load path; inside each, its
//              subsystems from the inside out (nothing goes in after what encloses it is on), fasteners last, after
//              what they join

import { boxOf, type Part, type V3 } from './part';

export interface TreeNode { id: string; name: string; parts: string[]; children: TreeNode[] }

const AXIS_NAME: Record<string, string> = { x: 'x axis', y: 'y axis', z: 'z axis', z1: 'z axis 1', z2: 'z axis 2' };
/** The path of a part in the tree, from its assembly down: what it was designed in, then what for. */
export function pathOf(p: Part): string[] {
  const id = p.id;
  if (p.unit) return id.startsWith(`${p.unit}/motor/`) ? [p.unit, 'motor', p.system ?? 'motor'] : [p.unit, p.system ?? p.category.split('/')[0]!];
  const ax = id.match(/^(x|y|z\d?)\/(motor\/)?/);
  if (ax) return ax[2] ? [ax[1]!, 'motor', p.system ?? 'motor'] : [ax[1]!, id === `${ax[1]}/bridge` ? 'bridge' : p.system ?? 'axis'];
  if (id.startsWith('hot end/')) return ['hot end', p.system ?? 'head'];
  if (id === 'support' || id.startsWith('support/')) return ['support', id.includes('/arm') ? 'arms' : 'plate'];
  if (/^(post|rail|member|corner|base plate|foot)/.test(id)) return ['frame', id.startsWith('corner') || /end-screw/.test(id) ? 'joints' : id.startsWith('foot') ? 'feet' : id === 'base plate' ? 'base plate' : 'members'];
  if (/^(panel|door)/.test(id)) return ['enclosure', 'panels'];
  if (/^(spool|guide|feed)/.test(id)) return ['feed', id.split(/[/ ]/)[0]!];
  if (/^(psu|controller|inlet|switch)$/.test(id)) return ['electronics', id];
  if (id.startsWith('carrier:')) return ['wiring', 'carriers'];
  if (id.startsWith('cable:mains')) return ['wiring', 'mains'];
  if (id.startsWith('cable:')) return ['wiring', 'cables'];
  if (id.startsWith('bb:')) return ['bench circuit', 'breadboard'];
  return ['other', p.category.split('/')[0]!];
}
const nameOf = (seg: string, depth: number) => (depth === 0 ? AXIS_NAME[seg] ?? seg.replace(/-/g, ' ') : seg);

/** The machine as a tree: assemblies, subsystems, parts. */
export function treeOf(parts: Part[], name = 'the machine'): TreeNode {
  const root: TreeNode = { id: '', name, parts: [], children: [] };
  for (const p of parts) {
    let node = root;
    pathOf(p).forEach((seg, d) => {
      const id = node.id ? `${node.id}/${seg}` : seg;
      let child = node.children.find((c) => c.id === id);
      if (!child) { child = { id, name: nameOf(seg, d), parts: [], children: [] }; node.children.push(child); }
      child.parts.push(p.id);
      node = child;
    });
    root.parts.push(p.id);
  }
  return root;
}
export function nodeAt(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;
  for (const c of tree.children) { const f = nodeAt(c, id); if (f) return f; }
  return null;
}

// ---- the load path ------------------------------------------------------------------------------------------------
const lohi = (p: Part) => { const b = boxOf(p); return { lo: b.c.map((c, k) => c - b.h[k]!) as V3, hi: b.c.map((c, k) => c + b.h[k]!) as V3 }; };
const touch = (a: { lo: V3; hi: V3 }, b: { lo: V3; hi: V3 }, gap: number) => [0, 1, 2].every((k) => a.lo[k]! <= b.hi[k]! + gap && b.lo[k]! <= a.hi[k]! + gap);
/** Which parts touch which, or are fastened into which. Runs of wire are held where they are tied, not by touch. */
// Parts that move past each other carry no load between them unless one guides the other: a bushing on its rod, a
// nut on its screw, a carriage on its standoffs; a nozzle a layer above the surface it lays on holds nothing up
const GUIDING = new Set(['guides', 'drive', 'carriage']);
const rider = (p: Part) => (p.rides ?? '').replace(/\d+$/, '');
const bears = (a: Part, b: Part) => rider(a) === rider(b) || GUIDING.has(a.system ?? '') || GUIDING.has(b.system ?? '');
export function contacts(parts: Part[], gap = 1e-3): Map<string, Set<string>> {
  const solid = parts.filter((p) => p.shape.kind !== 'wire');
  const boxes = solid.map(lohi), out = new Map<string, Set<string>>(solid.map((p) => [p.id, new Set<string>()]));
  for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) if (touch(boxes[i]!, boxes[j]!, gap) && bears(solid[i]!, solid[j]!)) { out.get(solid[i]!.id)!.add(solid[j]!.id); out.get(solid[j]!.id)!.add(solid[i]!.id); }
  for (const p of solid) for (const t of p.into ?? []) if (out.has(t)) { out.get(p.id)!.add(t); out.get(t)!.add(p.id); }
  return out;
}
/** How many contacts each part is from the ground (whatever stands at the lowest level), and what the ground does not reach. */
export function loadPath(parts: Part[], gap = 1e-3): { depth: Map<string, number>; held: Set<string>; floating: Part[] } {
  const c = contacts(parts, gap), solid = parts.filter((p) => p.shape.kind !== 'wire');
  if (!solid.length) return { depth: new Map(), held: new Set(), floating: [] };
  const ground = Math.min(...solid.map((p) => lohi(p).lo[1]));
  const depth = new Map<string, number>(), queue: string[] = [];
  for (const p of solid) if (lohi(p).lo[1] <= ground + gap) { depth.set(p.id, 0); queue.push(p.id); }
  while (queue.length) { const id = queue.shift()!, d = depth.get(id)!; for (const n of c.get(id) ?? []) if (!depth.has(n)) { depth.set(n, d + 1); queue.push(n); } }
  return { depth, held: new Set(depth.keys()), floating: solid.filter((p) => !depth.has(p.id)) };
}
/** Parts that touch one another and are held by nothing, gathered into the clusters they make. */
export function floatingClusters(parts: Part[], gap = 1e-3): Part[][] {
  const { floating } = loadPath(parts, gap), c = contacts(parts, gap), byId = new Map(floating.map((p) => [p.id, p])), seen = new Set<string>(), out: Part[][] = [];
  for (const p of floating) {
    if (seen.has(p.id)) continue;
    const cl: Part[] = [], q = [p.id]; seen.add(p.id);
    while (q.length) { const id = q.pop()!; cl.push(byId.get(id)!); for (const n of c.get(id) ?? []) if (byId.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
    out.push(cl);
  }
  return out.sort((a, b) => b.length - a.length);
}

// ---- the build ----------------------------------------------------------------------------------------------------
export interface BuildStep { n: number; title: string; node: string; parts: string[]; says: string }
const FASTENER = /fasteners|joints\/bolted/;
/** How many larger parts of its own set enclose this one's centre: the deeper it lies, the sooner it goes in. */
function nesting(set: Part[]): Map<string, number> {
  const boxes = new Map(set.map((p) => [p.id, lohi(p)])), vol = (p: Part) => { const b = boxes.get(p.id)!; return (b.hi[0] - b.lo[0]) * (b.hi[1] - b.lo[1]) * (b.hi[2] - b.lo[2]); };
  return new Map(set.map((p) => { const c = boxOf(p).c; return [p.id, set.filter((q) => q !== p && vol(q) > vol(p) && [0, 1, 2].every((k) => c[k]! >= boxes.get(q.id)!.lo[k]! && c[k]! <= boxes.get(q.id)!.hi[k]!)).length]; }));
}
const listOf = (ps: Part[]) => { const n = new Map<string, number>(); for (const p of ps) { const k = p.name.replace(/\s+\d+(?=[,\s]|$)/, '').replace(/ \d+ of \d+/, ''); n.set(k, (n.get(k) ?? 0) + 1); } return [...n].map(([k, c]) => (c > 1 ? `${c} × ${k}` : k)).join(', '); };

/**
 * The steps that build `of` (a node of the tree, or the whole machine): its assemblies from the ground up, each
 * assembly's subsystems from the inside out, the fasteners after what they join.
 */
export function buildSteps(parts: Part[], of = ''): BuildStep[] {
  const tree = treeOf(parts), node = nodeAt(tree, of) ?? tree, byId = new Map(parts.map((p) => [p.id, p]));
  const { depth } = loadPath(parts);
  const mean = (ids: string[], f: (id: string) => number) => ids.reduce((s, id) => s + f(id), 0) / Math.max(1, ids.length);
  const leaves: TreeNode[] = [];
  // the leaves are subsystems; the units under them are ordered as their whole is
  const order = (n: TreeNode): void => {
    if (!n.children.length) { leaves.push(n); return; }
    const isMachine = n === tree || n.id.split('/').length < 1;
    const kids = [...n.children];
    if (n === tree) kids.sort((a, b) => mean(a.parts, (id) => depth.get(id) ?? 99) - mean(b.parts, (id) => depth.get(id) ?? 99));
    else {
      const set = n.parts.map((id) => byId.get(id)!), nest = nesting(set);
      const score = (c: TreeNode) => (c.parts.every((id) => FASTENER.test(byId.get(id)!.category)) ? -99 : mean(c.parts, (id) => nest.get(id) ?? 0) - 0.001 * mean(c.parts, (id) => depth.get(id) ?? 99));
      kids.sort((a, b) => score(b) - score(a));
    }
    void isMachine;
    for (const k of kids) order(k);
  };
  order(node);
  const steps: BuildStep[] = [];
  for (const leaf of leaves) {
    const set = leaf.parts.map((id) => byId.get(id)!);
    // inside a subsystem: the enclosed first, then by size, fasteners after
    const nest = nesting(set);
    const main = set.filter((p) => !FASTENER.test(p.category)).sort((a, b) => (nest.get(b.id)! - nest.get(a.id)!) || (depth.get(a.id) ?? 99) - (depth.get(b.id) ?? 99));
    const fasten = set.filter((p) => FASTENER.test(p.category));
    const path = leaf.id.split('/').map((seg, d) => nameOf(seg, d)).join(' · ');
    if (main.length) steps.push({ n: 0, title: path, node: leaf.id, parts: main.map((p) => p.id), says: listOf(main) });
    if (fasten.length) steps.push({ n: 0, title: `${path} · fasten`, node: leaf.id, parts: fasten.map((p) => p.id), says: listOf(fasten) });
  }
  steps.forEach((s, i) => { s.n = i + 1; });
  return steps;
}

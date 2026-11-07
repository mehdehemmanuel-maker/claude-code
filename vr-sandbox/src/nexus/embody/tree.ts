// What a machine is made of, and how it goes together. Three readings of
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
  if (id.startsWith('bb:')) return ['circuits', 'breadboard'];
  return ['other', p.category.split('/')[0]!];
}

/** The machine as a tree: assemblies, subsystems, parts. */
export function nodeAt(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;
  for (const c of tree.children) { const f = nodeAt(c, id); if (f) return f; }
  return null;
}

// ---- the load path ------------------------------------------------------------------------------------------------
const lohi = (p: Part) => { const b = boxOf(p); return { lo: b.c.map((c, k) => c - b.h[k]!) as V3, hi: b.c.map((c, k) => c + b.h[k]!) as V3 }; };
const touch = (a: { lo: V3; hi: V3 }, b: { lo: V3; hi: V3 }, gap: number) => [0, 1, 2].every((k) => a.lo[k]! <= b.hi[k]! + gap && b.lo[k]! <= a.hi[k]! + gap);
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
/** (Contacts may be given: a caller that knows its parts' turned shapes better than their boxes passes its own.) */
export function loadPath(parts: Part[], gap = 1e-3, given?: Map<string, Set<string>>): { depth: Map<string, number>; held: Set<string>; floating: Part[] } {
  const c = given ?? contacts(parts, gap), solid = parts.filter((p) => p.shape.kind !== 'wire');
  if (!solid.length) return { depth: new Map(), held: new Set(), floating: [] };
  const ground = Math.min(...solid.map((p) => lohi(p).lo[1]));
  const depth = new Map<string, number>(), queue: string[] = [];
  for (const p of solid) if (lohi(p).lo[1] <= ground + gap) { depth.set(p.id, 0); queue.push(p.id); }
  while (queue.length) { const id = queue.shift()!, d = depth.get(id)!; for (const n of c.get(id) ?? []) if (!depth.has(n)) { depth.set(n, d + 1); queue.push(n); } }
  return { depth, held: new Set(depth.keys()), floating: solid.filter((p) => !depth.has(p.id)) };
}

/**
 * The steps that build `of` (a node of the tree, or the whole machine): its assemblies from the ground up, each
 * assembly's subsystems from the inside out, the fasteners after what they join.
 */

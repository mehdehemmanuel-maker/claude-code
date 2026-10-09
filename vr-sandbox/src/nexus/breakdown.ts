// The breakdown queue: every item stored in the inventory is queued to be broken down into what is in it, and nothing
// counts as known until it is. Each thing in it is looked up in the table: the inventory by its id, what was made with it
// (its inner parts, made to its sizes by their own families), or the family that makes that very size, called by the
// words its id spells ("screw-m3x32" is "screw m3x32"), made and stored; a thing found with things in it is queued in
// its turn, down to its materials and their elements. A thing in nothing of that is not in the table: it waits to be
// found and broken down itself (by research, a family, an entry), and so does a thing made by joining parts whose
// contents are only its materials (its parts not yet broken out of it), and one with nothing in it at all.
//
// The queue is the inventory itself: what is stored after a run (a family's new size, an entry added) is what the next
// run takes. Run: npm run breakdown [-- report.md]

import { INVENTORY, resolve, type Item } from './inventory';

export interface Waiting {
  /** what waits */ id: string;
  /** what wants it, and how many */ in: string; n: number;
  why: 'not in the table' | 'only its materials listed' | 'nothing in it listed' | 'several materials in one shaping';
}
export interface Breakdown {
  /** items taken off the queue this run */ taken: number;
  /** of them, broken down to their materials (every thing in them known) */ broken: number;
  /** sizes made and stored by their families because something wanted them */ made: string[];
  waiting: Waiting[];
  /** the deepest chain of things in things it went down */ depth: number;
}

const done = new Set<string>(), depthOf = new Map<string, number>();
const JOINED = new Set(['assemble', 'solder', 'crimp']), FUSED = new Set(['weld']);
/** What is on a part, not a part of it: platings, coats, lubricants, fills. */
const SURFACE = new Set(['tin', 'nickel', 'zinc', 'gold', 'chromium', 'silver', 'grease', 'oil', 'glue', 'paint', 'lacquer', 'epoxy', 'water', 'air', 'nitrogen', 'argon', 'mgo', 'flux', 'rosin', 'powder-coat', 'enamel']);
const isStuff = (it: Item | undefined) => it?.kind === 'material' || it?.kind === 'element';
/** A size a family makes, by the words its id spells: stored where it is that very size. */
function makeFrom(id: string): Item | null {
  const words = id.replace(/-/g, ' '), r = resolve(words);
  return r && typeof r === 'object' && r.id === id ? r : null;
}
/** Whether an item waits to be broken down, and why, by what is in it (the things in it found by `find`): nothing in it;
 *  made by joining and listed only as its materials (assembled, soldered, crimped, an assembly, or welded of two
 *  materials or more); or shaped in one process from two structural materials or more, its platings, coats and
 *  lubricants aside (a housing with its contacts moulded in, a tyre with its cords). A thing shaped from its stuff in one
 *  process, a rolled screw, a cast bell, a tube welded along its own seam, a die fabricated in its layers, is whole. */
export function judge(it: Item, find: (id: string) => Item | undefined): Waiting['why'] | null {
  if (isStuff(it)) return null;
  if (!it.of.length) return 'nothing in it listed';
  const things = it.of.filter((c) => !isStuff(find(c.id)));
  if (things.length) return null;
  if (it.kind === 'assembly' || JOINED.has(it.make) || (FUSED.has(it.make) && new Set(it.of.map((c) => c.id)).size > 1)) return 'only its materials listed';
  if (it.kind !== 'part' && new Set(it.of.map((c) => c.id).filter((id) => !SURFACE.has(id))).size >= 2) return 'several materials in one shaping';
  return null;
}
/** Takes every item stored and not yet broken down off the queue, and breaks each down; what it wants that is not in
 *  the table waits, said with what wants it. */
export function breakdown(): Breakdown {
  const out: Breakdown = { taken: 0, broken: 0, made: [], waiting: [], depth: 0 };
  const queue = [...INVENTORY.values()].filter((i) => !done.has(i.id));
  while (queue.length) {
    const it = queue.shift()!; if (done.has(it.id)) continue; done.add(it.id); out.taken++;
    if (isStuff(it)) continue;
    let whole = true;
    const why = judge(it, (id) => INVENTORY.get(id) ?? it.inner?.find((x) => x.id === id));
    if (why) { out.waiting.push({ id: it.id, in: '', n: 0, why }); whole = false; }
    for (const c of it.of) {
      let got = INVENTORY.get(c.id) ?? it.inner?.find((x) => x.id === c.id) ?? null;
      if (!got) { got = makeFrom(c.id); if (got) out.made.push(got.id); }
      if (!got) { out.waiting.push({ id: c.id, in: it.id, n: c.n, why: 'not in the table' }); whole = false; continue; }
      const d = (depthOf.get(it.id) ?? 0) + 1; if (d > (depthOf.get(got.id) ?? 0)) depthOf.set(got.id, d); out.depth = Math.max(out.depth, d);
      if (!done.has(got.id)) queue.push(got);
    }
    if (whole) out.broken++;
  }
  return out;
}
/** What is still waiting over every run so far: run the queue first. */
export const pending = (): number => [...INVENTORY.values()].filter((i) => !done.has(i.id)).length;

/** The queue as a report: what waits, grouped by why, the things most wanted first. */
export function sayBreakdown(b: Breakdown): string {
  const by = (w: Waiting['why']) => b.waiting.filter((x) => x.why === w), lines: string[] = [];
  lines.push(`# Breakdown queue`, '', `${b.taken} items taken off the queue; ${b.broken} broken down to their materials; ${b.made.length} sizes made by their families because something wanted them; ${b.waiting.length} waiting. Deepest chain of things in things: ${b.depth}.`, '');
  const missing = by('not in the table'), want = new Map<string, string[]>(); for (const w of missing) (want.get(w.id) ?? want.set(w.id, []).get(w.id)!).push(w.in);
  lines.push(`## Not in the table (${want.size}): each to be found and broken down itself`, '', ...[...want.entries()].sort((p, q) => q[1].length - p[1].length).map(([id, ins]) => `- ${id}: wanted by ${ins.length} (${ins.slice(0, 4).join(', ')}${ins.length > 4 ? ', …' : ''})`), '');
  // (by the family or kind that makes them: its contents are written once for all its sizes, so it is broken out once)
  for (const why of ['only its materials listed', 'nothing in it listed', 'several materials in one shaping'] as const) {
    const ws = by(why), fam = new Map<string, Waiting[]>(); for (const w of ws) { const it = INVENTORY.get(w.id), k = it?.sized?.family ?? (it?.adjustable ? it.id.split('-')[0]! : w.id); (fam.get(k) ?? fam.set(k, []).get(k)!).push(w); }
    lines.push(`## ${why[0]!.toUpperCase()}${why.slice(1)} (${ws.length} in ${fam.size} families and entries): its parts to be broken out of it`, '', ...[...fam.entries()].sort((p, q) => q[1].length - p[1].length).map(([k, xs]) => { const it = INVENTORY.get(xs[0]!.id); return `- ${k}${xs.length > 1 ? ` (${xs.length} sizes)` : ''}: ${it?.name ?? ''}: listed as ${it?.of.map((c) => c.id).join(' ') ?? ''} (${it?.make ?? ''})`; }), '');
  }
  return lines.join('\n');
}

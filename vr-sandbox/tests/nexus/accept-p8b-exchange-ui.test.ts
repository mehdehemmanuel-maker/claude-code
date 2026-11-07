// Acceptance 1b (plan/AUDIT.md, package P8b, what P8 left): import.file has a test of its own (a rod written as STEP by
// Export's writer, read back); the board's Import file button's handler reads a person's File into an import.file node
// that runs to its volume, mass and bound; and every piece.* family at its default goes through the exact solids with
// none not valid and none not made (the sweep, in four parts so each stays under 30 s; `-t "acceptance 1b"` runs all).
import { it, expect } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, portsOf, testBlock } from '../../src/nexus/blocks';
import { Engine, emptyBoard } from '../../src/nexus/dataflow';
import { partOfBlock } from '../../src/nexus/room';
import { densityKg } from '../../src/nexus/mass';
import type { Part } from '../../src/nexus/kits';

const sweep = { families: 0, pieces: 0, made: 0, invalid: 0, notMade: 0, threw: [] as string[], wired: [] as string[], invalidIn: [] as string[], notMadeIn: [] as string[], why: {} as Record<string, number>, parts: 0, ms: 0 };
const FAMILIES = [...LIBRARY.keys()].filter((k) => k.startsWith('piece.')).sort(), PARTS = 4;
for (let k = 0; k < PARTS; k++) it(`acceptance 1b: the sweep, part ${k + 1} of ${PARTS}`, async () => {
  const { solidsOf, kernel } = await import('../../src/nexus/brep'); await kernel();
  const t0 = Date.now(), n = Math.ceil(FAMILIES.length / PARTS);
  for (const id of FAMILIES.slice(k * n, (k + 1) * n)) {
    const d = LIBRARY.get(id)!, d0 = Object.fromEntries((d.settings ?? []).map((s) => [s.key, s.default])), ins = portsOf(d, d0).inputs;
    // (a node with an input it must be wired (piece.sized: its size comes along a wire) has no default to be made at, so
    // it is not a family at its default: named and counted apart, not dropped)
    const must = ins.filter((p) => !p.optional && p.default === undefined); if (must.length) { sweep.wired.push(`${id} (${must.map((p) => p.name).join(', ')})`); continue; }
    // (a family that throws at its default is not made: counted as one piece not made, and named)
    let out: { block?: Parameters<typeof partOfBlock>[0] } | undefined;
    try { out = await d.run!(Object.fromEntries(ins.filter((p) => p.default !== undefined).map((p) => [p.name, p.default])), { set: d0 } as never) as typeof out; } catch (e) { sweep.threw.push(`${id}: ${(e as Error).message.slice(0, 120)}`); sweep.notMade++; sweep.notMadeIn.push(id); continue; }
    if (!out?.block) continue;
    sweep.families++; const s = await solidsOf(partOfBlock(out.block));
    sweep.pieces += s.rows.length; sweep.made += s.made; sweep.invalid += s.invalid; sweep.notMade += s.failed;
    if (s.invalid) sweep.invalidIn.push(id); if (s.failed) sweep.notMadeIn.push(id);
    for (const [w, c] of Object.entries(s.byWhy)) sweep.why[w] = (sweep.why[w] ?? 0) + c;
  }
  sweep.parts++; sweep.ms += Date.now() - t0;
}, 30_000);

it('acceptance 1b', async () => {
  const { filesOf, kernel } = await import('../../src/nexus/brep'); await kernel();
  // (2) import.file's own test passes: the rod's STEP read back to πr²h, its mass πr²h ρ and its bound
  const d = LIBRARY.get('import.file')!; expect(d.tests?.length).toBe(1);
  expect((await testBlock(d)).fails).toEqual([]);
  // the Import file button's handler: a person's File (here a 6 × 30 mm rod written by Export's writer) read into an
  // import.file node on the board, which runs to its volume, kg and bound and shows its piece
  const { importInto, importSet, addPiece } = await import('../../src/nexus/view/parts');
  const rod: Part = { name: 'probe-rod', shape: { cyl: [0.003, 0.03] }, at: [0, 0, 0], mat: 'steel-low' }, exact = Math.PI * 0.003 ** 2 * 0.03;
  const step = Object.entries((await filesOf(rod, { formats: ['step'] })).files)[0]!, file = new File([step[1] as BlobPart], 'probe-rod.step');
  const b = emptyBoard('import'), id = await importInto((bid, set) => addPiece(b, bid, set), file) as string;
  expect(b.nodes[id]?.block).toBe('import.file'); expect(String(b.nodes[id]?.set?.name)).toBe('probe-rod.step');
  const e = new Engine(b); await e.run();
  const st = e.state.get(id)!; expect(st.status, st.error).toBe('ok');
  const out = st.out as { volume: number; kg: number; bound: { x: number; y: number; z: number }; solids: number; says: string };
  expect(out.solids).toBe(1); expect(Math.abs(out.volume / exact - 1)).toBeLessThan(1e-6);
  expect(Math.abs(out.kg / (exact * densityKg('steel-low')!) - 1)).toBeLessThan(1e-6);
  [out.bound.x, out.bound.y, out.bound.z].forEach((x, k) => expect(Math.abs(x - [0.006, 0.03, 0.006][k]!)).toBeLessThan(1e-6));
  // (its piece shown: the space.show node addPiece wired to it ran)
  for (const [nid, s] of e.state) expect({ nid, block: b.nodes[nid]?.block, status: s.status }).toEqual({ nid, block: b.nodes[nid]?.block, status: 'ok' });
  // a file that is not STEP, STP or STL refused, with its name
  await expect(importSet(new File(['hello'], 'notes.txt'))).rejects.toThrow(/notes\.txt: not a STEP, STP or STL file/);
  // (5) the sweep: every piece.* family at its default through the exact solids
  console.log(`the sweep, ${sweep.parts} of ${PARTS} parts in ${sweep.ms} ms: ${sweep.families} families of ${FAMILIES.length}, ${sweep.pieces} pieces: ${sweep.made} made, ${sweep.invalid} made but not valid, ${sweep.notMade} not made; not a family at a default, wired only: ${sweep.wired.join(', ') || 'none'}${sweep.threw.length ? `; threw at its default: ${sweep.threw.join('; ')}` : ''}${sweep.invalidIn.length ? `; not valid in ${sweep.invalidIn.join(' ')}` : ''}${sweep.notMadeIn.length ? `; not made in ${sweep.notMadeIn.join(' ')} (${JSON.stringify(sweep.why)})` : ''}`);
  expect(sweep.parts, 'the sweep ran in full (its parts are named "acceptance 1b: the sweep")').toBe(PARTS);
  expect({ invalid: sweep.invalid, notMade: sweep.notMade, invalidIn: sweep.invalidIn, notMadeIn: sweep.notMadeIn }).toEqual({ invalid: 0, notMade: 0, invalidIn: [], notMadeIn: [] });
}, 30_000);

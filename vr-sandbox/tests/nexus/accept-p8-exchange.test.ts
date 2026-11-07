// Acceptance test 1 (plan/AUDIT.md, package P8): a shaft goes out as STEP and STL and comes back in as a piece, at its
// volume; the toothed prisms and the domes the kernel could not make or called not valid are made, valid.
import { it, expect } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY } from '../../src/nexus/blocks';
import { partOfBlock } from '../../src/nexus/room';
import { densityKg } from '../../src/nexus/mass';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const run = async (id: string, set: Record<string, unknown> = {}): Promise<any> => { const d = LIBRARY.get(id); if (!d) throw new Error(`no ${id}`); const d0 = Object.fromEntries((d.settings ?? []).map((s) => [s.key, s.default])); return d.run!({}, { set: { ...d0, ...set } } as never); };
it('acceptance 1', async () => {
  const { solidsOf, filesOf, importFile, kernel } = await import('../../src/nexus/brep'); await kernel();
  // an 8 × 200 mm shaft: its exact solid πr²h
  const shaft = await run('piece.shaft', { size: '8', length: 200 }), part = partOfBlock(shaft.block), mat = shaft.block.pieces[0].mat as string, exact = Math.PI * 0.004 ** 2 * 0.2;
  const s = await solidsOf(part); expect(s.made).toBe(1); expect(s.invalid).toBe(0); expect(Math.abs(s.volume / exact - 1)).toBeLessThan(1e-6);
  const { files } = await filesOf(part, { formats: ['step', 'stl'] });
  const step = Object.entries(files).find(([k]) => k.endsWith('.step'))!, stl = Object.entries(files).find(([k]) => k.endsWith('.stl'))!;
  // the STEP read back: one solid, at the solid's volume to 1e-6, its bound 8 × 200 × 8 mm, a fixed piece weighing V ρ
  const a = await importFile(step[1], step[0], { mat });
  expect(a.format).toBe('step'); expect(a.solids).toBe(1); expect(Math.abs(a.volume / s.volume - 1)).toBeLessThan(1e-6);
  [0.008, 0.2, 0.008].forEach((x, k) => expect(Math.abs(a.bound[k]! - x)).toBeLessThan(1e-6));
  expect(a.kg).toBeCloseTo(a.volume * densityKg(mat)!, 12); expect(a.block.pieces.length).toBe(1); expect(a.block.pieces[0]!.bought).toBe(true);
  // the STL read back: one closed mesh, under the exact solid (its facets are inside the circle) by no more than its
  // tessellation allows (derived: its facets span at most 0.35 rad round the axis, filesOf's angular tolerance, so its
  // section is at least sin(0.35)/0.35 = 0.9797 of the circle's)
  const b = await importFile(stl[1], stl[0], { mat });
  expect(b.format).toBe('stl'); expect(b.solids).toBe(1);
  expect(b.volume).toBeLessThan(exact); expect(b.volume / exact).toBeGreaterThan(Math.sin(0.35) / 0.35);
  // the node: Export's files wired straight in
  const node = await run('import.file', {}).catch((e: Error) => e); expect(node).toBeInstanceOf(Error);
  const d = LIBRARY.get('import.file')!, out = await d.run!({ file: files }, { set: { name: '', mat } } as never) as { volume: number; solids: number; says: string };
  expect(out.solids).toBe(1); expect(Math.abs(out.volume / s.volume - 1)).toBeLessThan(1e-6); expect(out.says).toMatch(/STEP, 1 solid/);
  // the gear, the pulley, the sprocket and a dome at their defaults: every piece made, none not valid
  // (and the hollow rings drawn as one line round a cut: a rim and two tyres)
  for (const id of ['piece.gear', 'piece.pulley', 'piece.sprocket', 'piece.bkbell', 'piece.bkrim', 'piece.bktyre', 'piece.cartyre']) {
    const t = await solidsOf(partOfBlock((await run(id)).block)); expect({ id, failed: t.failed, invalid: t.invalid }).toEqual({ id, failed: 0, invalid: 0 });
  }
}, 30_000);

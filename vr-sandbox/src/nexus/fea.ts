// Stress by an engine of its own: CalculiX (ccx 2.21, GPL), a finite-element solver, run on the same case our frame
// analysis (graph.ts `bentUnder`, node Frame analysis) and the book's law solve, so the three can be set side by side and
// every disagreement said (the road map's item 8). Under Node only, where `ccx` is installed (here: apt's calculix-ccx);
// elsewhere it says it cannot run, and nothing stands in for it. The mesh is written here, a structured grid of C3D8I
// bricks (incompatible modes: right in bending even a few through the depth), so no mesher is needed for a bar.

/** Whether CalculiX can be run here. */
export async function ccxHere(): Promise<boolean> {
  if (typeof process === 'undefined' || !process.versions?.node) return false;
  const { spawnSync } = await import(/* @vite-ignore */ 'node:child_process'); try { return spawnSync('ccx', ['-v'], { encoding: 'utf8' }).status === 0 || /Version/.test(spawnSync('ccx', ['-v'], { encoding: 'utf8' }).stdout ?? ''); } catch { return false; }
}

export interface PostCase { /** its height, along y, m */ L: number; /** its width along the push (x) and its depth (z), m */ b: number; d: number; /** Young's modulus, Pa; Poisson's ratio */ E: number; nu: number; /** the push at its top, along +x, N */ F: number; /** bricks along its height, across its width, through its depth */ n?: [number, number, number] }
/** A post fixed at its foot and pushed sideways at its top, solved by CalculiX: how far its top moves (the mean of its
 *  top face's nodes), and its bending stress σ_yy at its faces near mid-height (the outer integration points of the bricks there, scaled
 *  out to the face; `at` says the height), where the textbook's M c / I holds clear of the foot's and the load's local
 *  effects. */
export async function ccxPost(c: PostCase): Promise<{ tip: number; midStress: number; /** the height its stress is at, m */ at: number; nodes: number; elements: number; ms: number }> {
  const { mkdtempSync, writeFileSync, readFileSync } = await import(/* @vite-ignore */ 'node:fs'), { tmpdir } = await import(/* @vite-ignore */ 'node:os'), { join } = await import(/* @vite-ignore */ 'node:path'), { spawnSync } = await import(/* @vite-ignore */ 'node:child_process');
  const [ny, nx, nz] = c.n ?? [40, 4, 4], id = (i: number, j: number, k: number) => 1 + i + (nx + 1) * (j + (ny + 1) * k), nodes: string[] = [], els: string[] = [];
  for (let k = 0; k <= nz; k++) for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) nodes.push(`${id(i, j, k)}, ${((i / nx - 0.5) * c.b).toExponential(9)}, ${((j / ny) * c.L).toExponential(9)}, ${((k / nz - 0.5) * c.d).toExponential(9)}`);
  let e = 0; const mid: number[] = [], jm = Math.floor(ny / 2);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { e++; els.push(`${e}, ${id(i, j, k)}, ${id(i + 1, j, k)}, ${id(i + 1, j + 1, k)}, ${id(i, j + 1, k)}, ${id(i, j, k + 1)}, ${id(i + 1, j, k + 1)}, ${id(i + 1, j + 1, k + 1)}, ${id(i, j + 1, k + 1)}`); if (j === jm && (i === 0 || i === nx - 1)) mid.push(e); }
  const foot: number[] = [], top: number[] = []; for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) { foot.push(id(i, 0, k)); top.push(id(i, ny, k)); }
  const list = (a: number[]) => a.map((x, i) => `${x}${(i + 1) % 12 ? ',' : ',\n'}`).join(' ').replace(/,\s*$/, '');
  const inp = ['*NODE', ...nodes, '*ELEMENT, TYPE=C3D8I, ELSET=POST', ...els, `*NSET, NSET=FOOT\n${list(foot)}`, `*NSET, NSET=TOP\n${list(top)}`, `*ELSET, ELSET=MID\n${list(mid)}`,
    '*MATERIAL, NAME=M', '*ELASTIC', `${c.E}, ${c.nu}`, '*SOLID SECTION, ELSET=POST, MATERIAL=M', '*BOUNDARY', 'FOOT, 1, 3, 0', '*STEP', '*STATIC',
    // (the push shared over the top face's nodes as a bilinear face's consistent loads: a quarter at the corners, a half on the edges, a whole inside, scaled)
    '*CLOAD', ...(() => { const w = (i: number, k: number) => (i === 0 || i === nx ? 0.5 : 1) * (k === 0 || k === nz ? 0.5 : 1), W = nx * nz; const out: string[] = []; for (let k = 0; k <= nz; k++) for (let i = 0; i <= nx; i++) out.push(`${id(i, ny, k)}, 1, ${(c.F * w(i, k)) / W}`); return out; })(),
    '*NODE PRINT, NSET=TOP', 'U', '*EL PRINT, ELSET=MID', 'S', '*END STEP'].join('\n');
  const dir = mkdtempSync(join(tmpdir(), 'ccx-')), t0 = Date.now(); writeFileSync(join(dir, 'post.inp'), inp);
  const run = spawnSync('ccx', ['-i', 'post'], { cwd: dir, encoding: 'utf8', env: { ...process.env, OMP_NUM_THREADS: '1' } }); if (run.status !== 0) throw new Error(`CalculiX failed: ${(run.stdout ?? '').slice(-300)}`);
  const dat = readFileSync(join(dir, 'post.dat'), 'utf8'), [uPart, sPart] = dat.split(/stresses \(elem/);
  const ux = [...(uPart ?? '').matchAll(/^\s*\d+\s+(-?[\d.E+-]+)\s+(-?[\d.E+-]+)\s+(-?[\d.E+-]+)\s*$/gm)].map((m) => Number(m[1]));
  // (σ_yy at the integration points: those nearest each face, by sign, their mean of magnitudes)
  const syy = [...(sPart ?? '').matchAll(/^\s*\d+\s+\d+\s+(-?[\d.E+-]+)\s+(-?[\d.E+-]+)/gm)].map((m) => Number(m[2])), pos = syy.filter((x) => x > 0), neg = syy.filter((x) => x < 0);
  const hi = (a: number[]) => { const s = [...a].sort((p, q) => Math.abs(q) - Math.abs(p)).slice(0, Math.max(1, Math.floor(a.length / 2))); return s.reduce((p, q) => p + Math.abs(q), 0) / s.length; };
  // (the outer integration points stand 1/(2√3) of a brick in from its middle, not at the face: their stress scaled out to
  // the face, as bending stress grows with the distance from the middle; and at the bricks' middle height, said)
  const h = c.b / nx, xg = c.b / 2 - h / 2 + h / (2 * Math.sqrt(3)), y = ((jm + 0.5) / ny) * c.L;
  return { tip: ux.reduce((a, x) => a + x, 0) / Math.max(1, ux.length), midStress: (((hi(pos) + hi(neg)) / 2) * (c.b / 2)) / xg, at: y, nodes: nodes.length, elements: e, ms: Date.now() - t0 };
}

// ---- as a node: three engines on one post ------------------------------------------------------------------------------
import { register, block, defaultsOf, type BlockDef, type PortDef, type Type } from './blocks';
import { matterOf } from './matter';
// (the material's Young's modulus and Poisson's ratio, as the frame analysis reads them)
const elastic = (m: string) => { const mt = matterOf(m), E = mt.props.find((p) => p.key === 'E')?.value, nu = mt.props.find((p) => p.key === 'nu')?.value; return E ? { E, nu: nu ?? 0.3 } : null; };
const P = (name: string, type: Type, more: Partial<PortDef> = {}): PortDef => ({ name, type, ...more });
register({ version: 1, by: 'built in', pure: true, id: 'verify.stress', name: 'Stress three ways (CalculiX, the book, our frame)', kind: 'critic', ability: 'check', domains: ['mechanical', 'structural'],
  spec: { gloss: 'Do three engines that share no code agree on how a post bends and how hard it is stressed?', discipline: 'mechanical.design', role: 'assessment', codes: [{ scheme: 'MSC2020', code: '74S05', label: 'Finite element methods applied to problems in solid mechanics' }],
    model: { equations: ['δ = F L³ / 3 E I; σ = M c / I (Euler–Bernoulli, the book)', 'K u = f over C3D8I bricks (CalculiX)', 'the frame of sliced beams (graph.ts, Frame analysis)'], class: '3-D discretised', time: 'steady', linear: true, method: 'one post fixed at its foot and pushed at its top, solved by each; every difference said', references: ['G. Dhondt, CalculiX CrunchiX user\'s manual 2.21', 'Gere and Goodno, Mechanics of Materials, 9th ed., Appendix H (cantilever, end load)'] } },
  says: 'A post fixed at its foot and pushed sideways at its top, worked three ways that share nothing: the textbook\'s formulas, CalculiX (a finite-element solver, an engine apart, under Node where it is installed), and our own frame analysis (the post sliced into beams). Its top\'s movement and its stress, each against the book, every difference said. Where CalculiX is not installed it says so and gives nothing in its place',
  settings: [{ key: 'L', label: 'Height, m', type: 'number', default: 0.5 }, { key: 'b', label: 'Width along the push, m', type: 'number', default: 0.02 }, { key: 'd', label: 'Depth, m', type: 'number', default: 0.03 }, { key: 'F', label: 'Push, N', type: 'number', default: 500 }, { key: 'mat', label: 'Material', type: 'text', default: 'steel-low' }],
  ports: { inputs: [], outputs: [P('rows', 'table'), P('agree', 'boolean', { label: 'every engine within 3 % of the book' }), P('says', 'text')] },
  run: async (_i, c) => {
    const L = Number(c.set.L), b = Number(c.set.b), d = Number(c.set.d), F = Number(c.set.F), mat = String(c.set.mat), el = elastic(mat); if (!el) throw new Error(`no Young's modulus for ${mat}`); const { E, nu } = el;
    const I = (d * b ** 3) / 12, rows: Record<string, unknown>[] = [], pct = (x: number, y: number) => `${((x / y - 1) * 100).toFixed(2)} %`;
    const tip = (F * L ** 3) / (3 * E * I), root = (F * L * (b / 2)) / I; rows.push({ engine: 'the book', 'top moves, mm': +(tip * 1e3).toPrecision(5), 'stress, MPa': +(root / 1e6).toPrecision(5), where: 'at its foot', off: '' });
    const fd = block('bend')!, thing = { name: 'post on a base', at: [0, 0, 0], parts: [{ name: 'base', shape: { box: [5 * b, 0.02, 5 * d] }, at: [0, -0.01, 0], mat }, { name: 'post', shape: { box: [b, L, d] }, at: [0, L / 2, 0], mat }, { name: 'cap', shape: { box: [b, 0.002, d] }, at: [0, L + 0.001, 0], mat }] };
    const fr = (await fd.run!({ thing }, { ...c, set: { ...defaultsOf(fd), load: F, dir: '+x' } })) as { give: number; stress: number };
    rows.push({ engine: 'our frame (graph.ts)', 'top moves, mm': +(fr.give * 1e3).toPrecision(5), 'stress, MPa': +(fr.stress / 1e6).toPrecision(5), where: 'its worst', off: `${pct(fr.give, tip)}, ${pct(fr.stress, root)}` });
    let agree = Math.abs(fr.give / tip - 1) < 0.03 && Math.abs(fr.stress / root - 1) < 0.03, ccx = 'CalculiX is not installed here (Node, apt calculix-ccx): not run';
    if (await ccxHere()) { const x = await ccxPost({ L, b, d, E, nu, F }), there = (F * (L - x.at) * (b / 2)) / I;
      rows.push({ engine: `CalculiX (${x.elements} C3D8I bricks)`, 'top moves, mm': +(x.tip * 1e3).toPrecision(5), 'stress, MPa': +(x.midStress / 1e6).toPrecision(5), where: `at ${(x.at * 1000).toFixed(1)} mm up (the book there: ${(there / 1e6).toPrecision(5)})`, off: `${pct(x.tip, tip)}, ${pct(x.midStress, there)}` });
      agree &&= Math.abs(x.tip / tip - 1) < 0.03 && Math.abs(x.midStress / there - 1) < 0.03; ccx = 'CalculiX run'; }
    return { rows, agree, says: `${agree ? 'they agree within 3 %' : 'they DISAGREE by more than 3 %'}: ${rows.slice(1).map((r) => `${r.engine}: ${r.off}`).join('; ')}; ${ccx}` };
  } } as BlockDef);

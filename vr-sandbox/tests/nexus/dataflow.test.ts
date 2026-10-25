// The node engine (src/nexus/blocks.ts, src/nexus/dataflow.ts): every block in the library passes its own tests; wires
// join only what fits; a board run again does only what changed and gives what a fresh run gives; folding, opening,
// merging and cutting never change what the board works out; and it holds up at scale. The scale figures are measured
// here, on whatever machine runs the tests, and printed: they are not Quest figures.

import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { LIBRARY, block, fits, readQuantity, register, shelves, show, testBlock, type BlockDef } from '../../src/nexus/blocks';
import { Engine, Memo, USAGE, collapse, cutBranch, deadNodes, emptyBoard, expand, groupBlock, makeBlock, mergeTwins, patterns, placeBlock, shapeKeys, suggest, twins, wire } from '../../src/nexus/dataflow';
import { compact, nodesOf, type Board } from '../../src/nexus/boards';
import { LAWS } from '../../src/ganglia/laws';
import { COPPER_ALPHA } from '../../src/engineering/dcmotor';

const value = (e: Engine, id: string, port: string) => e.state.get(id)?.out?.[port];
const runOf = async (b: Board) => { const e = new Engine(b); await e.run(); return e; };
/** What every node works out, port by port, as one plain record: what must not change. */
const outputs = (e: Engine) => Object.fromEntries([...e.state.entries()].map(([id, s]) => [id, s.status === 'ok' ? s.out : s.status]));

describe('the library', () => {
  it('holds every law as a calculator, and every block passes its own tests', async () => {
    const all = [...LIBRARY.values()].filter((b) => b.tests?.length);
    expect([...LIBRARY.keys()].filter((k) => k.startsWith('law.')).length).toBe(LAWS.length);
    const fails: string[] = [];
    for (const b of all) { const r = await testBlock(b); if (!r.ok) fails.push(`${b.id}: ${r.fails.join('; ')}`); }
    expect(fails).toEqual([]);
    console.log(`library: ${LIBRARY.size} blocks, ${all.length} with tests, all passing; ${LAWS.length} of them laws`);
  });
  it('is found by domain, by ability and by kind, and every block is on a shelf each way', () => {
    for (const by of ['domain', 'ability', 'kind'] as const) {
      const s = shelves(by), on = new Set(s.flatMap((x) => x.blocks.map((b) => b.id)));
      const off = [...LIBRARY.values()].filter((b) => !b.id.startsWith('group.') && !on.has(b.id)).map((b) => b.id);
      expect(off, `not on any ${by} shelf`).toEqual([]);
    }
    expect(shelves('domain', 'loan').flatMap((s) => s.blocks.map((b) => b.id))).toContain('fin.loan');
  });
  it('refuses a block that does what one already does, and names the one', () => {
    const twin: BlockDef = { ...block('math.add')!, id: 'my.plus', name: 'Plus' };
    expect(register(twin)).toEqual({ id: 'math.add', duplicateOf: 'math.add' });
    expect(LIBRARY.has('my.plus')).toBe(false);
  });
  it('reads quantities in any unit, and shows them in readable ones', () => {
    expect(readQuantity('200 mm', 'm')).toBeCloseTo(0.2, 12);
    expect(readQuantity('3 in')).toBeCloseTo(0.0762, 12);
    expect(readQuantity('5 kg', 'm')).toEqual({ error: 'kg is not a kind of m' });
    expect(show(25000, 'N')).toBe('25 kN');
    expect(show(5.4e-7, 'm^4')).toBe('54 cm⁴');
    expect(show(1.23e-7)).toBe('1.230×10⁻⁷');
    expect(show(8.7, 'N m')).toBe('8.7 N·m');
    expect(show(0.008, 'm')).toBe('8 mm');
    expect(show(1199.101, 'USD')).toBe('1,199.10 USD');
  });
});

describe('wires', () => {
  const p = (type: string, unit?: string) => ({ name: 'p', type: type as 'number', ...(unit ? { unit } : {}) });
  it('join numbers of one dimension, converting, and refuse a force into a length', () => {
    expect(fits(p('number', 'mm'), p('number', 'm'))).toEqual({ ok: true, map: false, convert: 'mm → m' });
    const r = fits(p('number', 'N'), p('number', 'm')); expect(r.ok).toBe(false);
    expect((r as { why: string }).why).toMatch(/not the same kind of quantity/);
  });
  it('map a block over a list wired into a single value', () => {
    expect(fits(p('list<number>', 'm'), p('number', 'm'))).toEqual({ ok: true, map: true });
  });
  it('convert between units of one kind as the value passes: kelvin into a law in degrees Celsius', async () => {
    const b = emptyBoard(), t = placeBlock(b, 'in.number', 0, 0, { value: '50 degC', unit: 'K' }), law = placeBlock(b, 'law.copper.tempco', 0, 0, { R0: 1, T0: 20 });
    wire(b, t, 'value', law, 'T');
    const e = await runOf(b);
    expect(value(e, t, 'value')).toBeCloseTo(323.15, 9);
    // copper's resistance 30 K above where it was 1 Ω: 1 + α × 30
    expect(value(e, law, 'R')).toBeCloseTo(1 + 30 * COPPER_ALPHA, 9);
  });
  it('are refused where they would make a loop', async () => {
    const b = emptyBoard(), a = placeBlock(b, 'math.add', 0, 0, { a: 1, b: 2 }), c = placeBlock(b, 'math.multiply', 0, 0, { b: 2 });
    wire(b, a, 'result', c, 'a');
    const e = new Engine(b);
    expect(e.canWire(c, 'result', a, 'a')).toEqual({ ok: false, why: 'that would make a loop: it already depends on this' });
  });
});

describe('running a board', () => {
  it('works a bolt in shear across domains: a load, a formula, a material card and a check', async () => {
    const b = emptyBoard('Bolt in shear');
    const F = placeBlock(b, 'in.number', 0, 0, { value: '10 kN', unit: 'N' });
    const s = placeBlock(b, 'math.expr', 200, 0, { expr: 'F / (pi * d^2 / 4)', unit: 'Pa', d: 0.008 });
    const m = placeBlock(b, 'card.material', 0, 200, { id: 'steel.a36' });
    const k = placeBlock(b, 'check.limit', 400, 0, { what: 'shear stress' });
    wire(b, F, 'value', s, 'F'); wire(b, s, 'result', k, 'value'); wire(b, m, 'yield', k, 'limit');
    const e = await runOf(b);
    expect(value(e, s, 'result')).toBeCloseTo(10000 / (Math.PI * 0.008 ** 2 / 4), 6);
    expect(value(e, k, 'passes')).toBe(true);
    expect(String(value(e, k, 'says'))).toMatch(/shear stress passes: factor 1\.2/);
  });
  it('runs a law over a sweep: one wire of a list, one run for each item', async () => {
    const b = emptyBoard(), r = placeBlock(b, 'in.range', 0, 0, { from: 0.1, to: 1, count: 10, unit: 'm' });
    const law = [...LIBRARY.values()].find((x) => x.id === 'law.beam.cantilever.deflection') ?? [...LIBRARY.values()].find((x) => x.kind === 'law' && /cantilever/i.test(x.name))!;
    const n = placeBlock(b, law.id, 200, 0, law.tests![0]!.inputs);
    const lp = (typeof law.ports === 'function' ? law.ports({}) : law.ports).inputs.find((x) => x.unit === 'm')!;
    wire(b, r, 'value', n, lp.name);
    const e = await runOf(b), out = (typeof law.ports === 'function' ? law.ports({}) : law.ports).outputs[0]!.name;
    expect(e.state.get(n)?.mapped).toBe(10);
    expect((value(e, n, out) as number[]).length).toBe(10);
  });
  it('says plainly what failed and what waits on it, and never hangs', async () => {
    const b = emptyBoard(), a = placeBlock(b, 'math.divide', 0, 0, { a: 1, b: 0 }), c = placeBlock(b, 'math.add', 0, 0, { b: 1 });
    wire(b, a, 'result', c, 'a');
    const code = placeBlock(b, 'code', 0, 0, {});
    const e = await runOf(b);
    expect(e.state.get(a)).toMatchObject({ status: 'failed', error: 'divided by zero' });
    expect(e.state.get(c)?.status).toBe('waiting');
    expect(e.state.get(code)?.error ?? '').toMatch(/waiting on a, b|code runs only where a worker can run it/);
  });
});

describe('it does the least', () => {
  it('runs again only what an edit reaches, and gives what a fresh run gives', async () => {
    const b = emptyBoard(), ids: string[] = [];
    for (let i = 0; i < 20; i++) { const x = placeBlock(b, 'in.number', 0, i * 60, { value: i }); const y = placeBlock(b, 'math.multiply', 200, i * 60, { b: 2 }); wire(b, x, 'value', y, 'a'); ids.push(x, y); }
    const s = placeBlock(b, 'math.sum', 400, 0); for (let i = 1; i < ids.length; i += 2) wire(b, ids[i]!, 'result', s, 'values');
    const e = new Engine(b); await e.run();
    expect(value(e, s, 'sum')).toBe(2 * (19 * 20) / 2);
    b.nodes[ids[0]!]!.set!.value = 100; e.touch(ids[0]!);
    const r = await e.run();
    expect(r).toMatchObject({ looked: 3, ran: 3 });
    const f = new Engine(structuredClone(b)); await f.fresh();
    expect(outputs(e)).toEqual(outputs(f));
  });
  it('runs a library block placed 10,000 times with one input once, and edits to its input once', async () => {
    const inner = emptyBoard('Double plus one');
    const i = placeBlock(inner, 'group.in', 0, 0, { name: 'x', type: 'number' }), m = placeBlock(inner, 'math.expr', 100, 0, { expr: 'x * 2 + 1' }), o = placeBlock(inner, 'group.out', 200, 0, { name: 'y', type: 'number' });
    wire(inner, i, 'value', m, 'x'); wire(inner, m, 'result', o, 'value');
    const def = groupBlock(inner, { id: 'my.double-plus-one', name: 'Double plus one', by: 'you' }); register(def);
    const b = emptyBoard(), src = placeBlock(b, 'in.number', 0, 0, { value: 3 }), uses: string[] = [];
    for (let k = 0; k < 10_000; k++) { const u = placeBlock(b, 'my.double-plus-one', 200, k); wire(b, src, 'value', u, 'x'); uses.push(u); }
    const before = USAGE.get('math.expr')?.runs ?? 0;
    const e = new Engine(b), t0 = performance.now(); await e.run(); const ms = performance.now() - t0;
    expect(value(e, uses[9999]!, 'y')).toBe(7);
    expect((USAGE.get('math.expr')?.runs ?? 0) - before).toBe(1);
    b.nodes[src]!.set!.value = 5; e.touch(src); const t1 = performance.now(); await e.run(); const ms2 = performance.now() - t1;
    expect(value(e, uses[0]!, 'y')).toBe(11);
    expect((USAGE.get('math.expr')?.runs ?? 0) - before).toBe(2);
    console.log(`10,000 uses of one block: first run ${ms.toFixed(0)} ms, after an edit ${ms2.toFixed(0)} ms, its formula run 2 times in all`);
  });
});

/** A random board of arithmetic: inputs, then blocks fed from earlier nodes only (so no loops), and viewers. */
const arbBoard = fc.record({
  inputs: fc.array(fc.integer({ min: -50, max: 50 }), { minLength: 1, maxLength: 6 }),
  ops: fc.array(fc.record({ op: fc.constantFrom('math.add', 'math.subtract', 'math.multiply', 'math.expr'), a: fc.nat(), b: fc.nat() }), { minLength: 1, maxLength: 14 }),
  views: fc.array(fc.nat(), { maxLength: 4 }),
});
function build(spec: { inputs: number[]; ops: { op: string; a: number; b: number }[]; views: number[] }): Board {
  const b = emptyBoard(), ids: string[] = [];
  spec.inputs.forEach((v, i) => ids.push(placeBlock(b, 'in.number', 0, i * 80, { value: v }, `i${i}`)));
  spec.ops.forEach((o, i) => {
    const id = placeBlock(b, o.op, 200 + i * 20, i * 60, o.op === 'math.expr' ? { expr: 'a * 0.5 + b' } : {}, `o${i}`);
    wire(b, ids[o.a % ids.length]!, ids[o.a % ids.length]!.startsWith('i') ? 'value' : 'result', id, 'a', `wa${i}`);
    wire(b, ids[o.b % ids.length]!, ids[o.b % ids.length]!.startsWith('i') ? 'value' : 'result', id, 'b', `wb${i}`);
    ids.push(id);
  });
  spec.views.forEach((v, i) => { const t = ids[v % ids.length]!, id = placeBlock(b, 'view.show', 900, i * 60, {}, `v${i}`); wire(b, t, t.startsWith('i') ? 'value' : 'result', id, 'value', `wv${i}`); });
  return b;
}

describe('properties, over random boards', () => {
  it('a run after random edits gives what a fresh run gives', async () => {
    await fc.assert(fc.asyncProperty(arbBoard, fc.array(fc.tuple(fc.nat(), fc.integer({ min: -9, max: 9 })), { maxLength: 6 }), async (spec, edits) => {
      const b = build(spec), e = new Engine(b, {}, new Memo()); await e.run();
      for (const [k, v] of edits) { const id = `i${k % spec.inputs.length}`; b.nodes[id]!.set!.value = v; e.touch(id); await e.run(); }
      const f = new Engine(structuredClone(b), {}, new Memo()); await f.fresh();
      expect(outputs(e)).toEqual(outputs(f));
    }), { numRuns: 60 });
  });
  it('folding any nodes into a group, and opening it again, changes nothing it works out', async () => {
    await fc.assert(fc.asyncProperty(arbBoard, fc.array(fc.nat(), { minLength: 1, maxLength: 8 }), async (spec, pick) => {
      const b = build(spec), base = await runOf(b);
      const ops = Object.keys(b.nodes).filter((id) => id.startsWith('o')), sel = [...new Set(pick.map((k) => ops[k % ops.length]!))];
      const { board: folded, id: g, folded: inside } = collapse(b, sel, 'G', 'g1');
      for (const id of sel) expect(inside).toContain(id);
      const f = await runOf(folded);
      // what each node outside the fold sees is what it saw before
      for (const id of Object.keys(folded.nodes).filter((x) => x !== g)) expect(f.state.get(id)?.out, id).toEqual(base.state.get(id)?.out);
      const opened = await runOf(expand(folded, g));
      for (const id of Object.keys(b.nodes)) expect(opened.state.get(id)?.out, id).toEqual(base.state.get(id)?.out);
    }), { numRuns: 60 });
  });
  it('merging twins changes nothing any viewer shows, and cutting a branch keeps what anything else needs', async () => {
    await fc.assert(fc.asyncProperty(arbBoard, fc.nat(), async (spec, k) => {
      const b = build(spec), base = await runOf(b), { board } = mergeTwins(b), m = await runOf(board);
      for (const id of Object.keys(b.nodes).filter((x) => x.startsWith('v'))) expect(m.state.get(id)?.out, id).toEqual(base.state.get(id)?.out);
      const ids = nodesOf(b).map((n) => n.id), root = ids[k % ids.length]!, cut = cutBranch(b, root);
      for (const x of cut.kept) expect(cut.removed).not.toContain(x.id);
      // what is cut is the root and what only the cut fed
      for (const id of cut.removed.filter((x) => x !== root)) expect(Object.values(b.edges).filter((e) => e.to === id).every((e) => cut.removed.includes(e.from))).toBe(true);
    }), { numRuns: 60 });
  });
  it('a board saved and opened again runs to the same', async () => {
    await fc.assert(fc.asyncProperty(arbBoard, async (spec) => {
      const b = build(spec), again = JSON.parse(JSON.stringify(compact(b))) as Board;
      expect(outputs(await runOf(again))).toEqual(outputs(await runOf(b)));
    }), { numRuns: 40 });
  });
});

describe('smarter', () => {
  it('finds what is dead, what is twice and what wiring repeats', () => {
    const b = emptyBoard(), x = placeBlock(b, 'in.number', 0, 0, { value: 2 }, 'x');
    for (let k = 0; k < 3; k++) { const a = placeBlock(b, 'math.add', 0, 0, { b: k }, `a${k}`), m = placeBlock(b, 'math.multiply', 0, 0, { b: 3 }, `m${k}`), v = placeBlock(b, 'view.show', 0, 0, {}, `v${k}`); wire(b, x, 'value', a, 'a'); wire(b, a, 'result', m, 'a'); wire(b, m, 'result', v, 'value'); }
    const lone = placeBlock(b, 'math.add', 0, 0, { a: 1, b: 1 }, 'lone'), twin = placeBlock(b, 'math.add', 0, 0, { a: 1, b: 1 }, 'twin');
    expect(deadNodes(b).sort()).toEqual([lone, twin].sort());
    expect(twins(b)).toContainEqual([lone, twin].sort());
    const p = patterns([b], 3);
    expect(p[0]).toMatchObject({ blocks: ['math.add', 'math.multiply'], count: 3 });
    expect(suggest(b).map((s) => s.kind)).toEqual(expect.arrayContaining(['dead', 'twins', 'pattern']));
    expect(shapeKeys(b).get('a0')).not.toBe(shapeKeys(b).get('a1'));
  });
  it('makes a group a library block of its own, placed and run like any other', async () => {
    const b = emptyBoard(), x = placeBlock(b, 'in.number', 0, 0, { value: 4 }, 'x'), a = placeBlock(b, 'math.multiply', 0, 0, { b: 10 }, 'a'), v = placeBlock(b, 'view.show', 0, 0, {}, 'v');
    wire(b, x, 'value', a, 'a'); wire(b, a, 'result', v, 'value');
    const { board: folded, id } = collapse(b, ['a'], 'Times ten', 'g');
    const made = makeBlock(folded, id, { name: 'Times ten', domains: ['math'] });
    expect(LIBRARY.get(made.block.id)?.graph).toBeTruthy();
    const e = await runOf(made.board);
    expect(e.state.get('v')?.status).toBe('ok');
    expect(value(e, id, 'result')).toBe(40);
  });
});

describe('scale (measured on this machine, printed)', () => {
  it('a board of 10,000 nodes: a full run, then an edit that reaches 100 of them', async () => {
    const b = emptyBoard(), heads: string[] = [];
    for (let c = 0; c < 100; c++) {
      let prev = placeBlock(b, 'in.number', 0, c, { value: c }, `h${c}`); heads.push(prev);
      for (let k = 1; k < 100; k++) { const id = placeBlock(b, 'math.add', k, c, { b: 1 }, `n${c}_${k}`); wire(b, prev, prev.startsWith('h') ? 'value' : 'result', id, 'a', `w${c}_${k}`); prev = id; }
    }
    const e = new Engine(b), t0 = performance.now(); await e.run(); const full = performance.now() - t0;
    expect(value(e, 'n99_99', 'result')).toBe(99 + 99);
    b.nodes.h7!.set!.value = 1000; e.touch('h7');
    const t1 = performance.now(), r = await e.run(), edit = performance.now() - t1;
    expect(r.looked).toBe(100); expect(value(e, 'n7_99', 'result')).toBe(1099);
    console.log(`10,000 nodes: full run ${full.toFixed(0)} ms; an edit reaching 100 of them ${edit.toFixed(2)} ms`);
    expect(edit).toBeLessThan(16);
  });
  it('a million nodes placed, as library blocks nested ten deep, four in each: run with the least work', async () => {
    // level 0 doubles; level k holds four of level k-1, each fed the input, and sums them: 4^10 = 1,048,576 doubles placed
    let prev = 'math.multiply';
    const leaf = emptyBoard('L0'); { const i = placeBlock(leaf, 'group.in', 0, 0, { name: 'x', type: 'number' }, 'i'), m = placeBlock(leaf, 'math.multiply', 0, 0, { b: 2 }, 'm'), o = placeBlock(leaf, 'group.out', 0, 0, { name: 'y', type: 'number' }, 'o'); wire(leaf, i, 'value', m, 'a'); wire(leaf, m, 'result', o, 'value'); }
    register(groupBlock(leaf, { id: 'nest.0', name: 'L0' })); prev = 'nest.0';
    for (let k = 1; k <= 10; k++) {
      const g = emptyBoard(`L${k}`), i = placeBlock(g, 'group.in', 0, 0, { name: 'x', type: 'number' }, 'i'), s = placeBlock(g, 'math.sum', 0, 0, {}, 's'), o = placeBlock(g, 'group.out', 0, 0, { name: 'y', type: 'number' }, 'o');
      for (let j = 0; j < 4; j++) { const u = placeBlock(g, prev, 0, j, {}, `u${j}`); wire(g, i, 'value', u, 'x'); wire(g, u, 'y', s, 'values'); }
      wire(g, s, 'sum', o, 'value'); register(groupBlock(g, { id: `nest.${k}`, name: `L${k}` })); prev = `nest.${k}`;
    }
    const b = emptyBoard(), x = placeBlock(b, 'in.number', 0, 0, { value: 1 }, 'x'), top = placeBlock(b, 'nest.10', 0, 0, {}, 'top'); wire(b, x, 'value', top, 'x');
    const before = USAGE.get('math.multiply')?.runs ?? 0, t0 = performance.now(), e = new Engine(b); await e.run(); const ms = performance.now() - t0;
    expect(value(e, top, 'y')).toBe(2 * 4 ** 10);
    const doubles = (USAGE.get('math.multiply')?.runs ?? 0) - before;
    console.log(`1,048,576 doubles placed in nested blocks: worked out in ${ms.toFixed(0)} ms, ${doubles} of them actually run`);
    expect(doubles).toBe(1);
  });
  it('a sweep of 100,000 values through a law', async () => {
    const b = emptyBoard(), r = placeBlock(b, 'in.range', 0, 0, { from: 1, to: 100, count: 100_000 }), ohm = [...LIBRARY.values()].find((x) => x.kind === 'law' && /ohm/i.test(x.name))!;
    const ports = typeof ohm.ports === 'function' ? ohm.ports({}) : ohm.ports, n = placeBlock(b, ohm.id, 0, 0, ohm.tests![0]!.inputs);
    wire(b, r, 'value', n, ports.inputs[0]!.name);
    const t0 = performance.now(), e = await runOf(b), ms = performance.now() - t0;
    expect(e.state.get(n)?.mapped).toBe(100_000);
    console.log(`100,000-row sweep through ${ohm.name}: ${ms.toFixed(0)} ms`);
  });
  it('groups nested 64 deep open, run and fold back', async () => {
    let b = emptyBoard(); const x = placeBlock(b, 'in.number', 0, 0, { value: 1 }, 'x'); let prev = x, port = 'value';
    for (let k = 0; k < 64; k++) { const id = placeBlock(b, 'math.add', k, 0, { b: 1 }, `a${k}`); wire(b, prev, port, id, 'a'); prev = id; port = 'result'; }
    const v = placeBlock(b, 'view.show', 0, 0, {}, 'v'); wire(b, prev, 'result', v, 'value');
    const base = await runOf(b);
    // the chain folded into a group, and that group folded again, 64 times: each group holds the one before
    let last = collapse(b, Array.from({ length: 64 }, (_, k) => `a${k}`), 'G0', 'g0'); b = last.board;
    for (let k = 1; k < 64; k++) { last = collapse(b, [last.id], `G${k}`, `g${k}`); b = last.board; }
    const deep = await runOf(b);
    expect(deep.state.get('v')?.out).toEqual(base.state.get('v')?.out);
    for (let k = 63; k >= 0; k--) b = expand(b, `g${k}`);
    expect(Object.keys(b.nodes).filter((id) => !b.nodes[id]!.deleted).sort()).toEqual(Object.keys(base.board.nodes).sort());
    const e = await runOf(b);
    expect(e.state.get('v')?.status).toBe('ok');
  });
});

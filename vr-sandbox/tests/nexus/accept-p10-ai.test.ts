// Acceptance test 10 (plan/AUDIT.md §1, §5 wave 2; package P10): the AI constructs a new system through its tools. A
// scripted Ask stands in for the model (no model calls): it answers each one-task call from what the call's prompt holds,
// as a model would read it (the parts found by function, the gate's reasons). What is checked is the pipeline: the
// tools find a pump and a motor by what they do, the functional gate refuses a build where the motor drives nothing, and
// a second build that joins the motor's shaft to the pump passes. Plus each tool of aitools.ts on its own.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { LIBRARY, defaultsOf } from '../../src/nexus/blocks';
import { Engine, emptyBoard, placeBlock } from '../../src/nexus/dataflow';
import { composeBuild, toolsFor, type Ask } from '../../src/nexus/agent';
import { alternatives, compatible, missingInterfaces, revisions, roleOf, searchByFunction, variantsOf } from '../../src/nexus/aitools';
import { interfacesOf } from '../../src/nexus/interfaces';
import { remember } from '../../src/nexus/memory';
import type { Block } from '../../src/nexus/room';

const blockOfId = async (id: string): Promise<Block> => { const b = emptyBoard('t'); placeBlock(b, id, 0, 0, defaultsOf(LIBRARY.get(id)!), 'x'); const e = new Engine(b); await e.run();
  const out = (e.state.get('x')?.out ?? {}) as Record<string, unknown>; return (out.block ?? Object.values(out).find((v) => Array.isArray((v as Block)?.pieces))) as Block; };

describe('acceptance 10: the AI constructs a new system', () => {
  it('searchByFunction("pumps water") returns a pump first, never a cell of a body', () => {
    const fs = searchByFunction('pumps water', 6);
    expect(fs[0]!.name.toLowerCase()).toMatch(/pump/);
    expect(fs.every((f) => /^(piece|seed)\./.test(f.id) || LIBRARY.get(f.id)?.by === 'you')).toBe(true);
    expect(searchByFunction('drives a shaft', 6).some((f) => /motor/i.test(f.name))).toBe(true);
  });

  // (since P6 gave the motors their terminals, the functional gate also asks that a driver's power line reach a supply;
  // the scripted mend joins only the shaft, as the gate's first reason asks, and the compose path then adds a supply by the
  // motor's voltage and joins it to the motor's terminals by a lead, by rule (agent.ts 5c, P6's wire model), so the gate
  // passes: the motor drives the pump and its power line reaches the supply)
  it('acceptance 10', async () => {
    const request = 'a water pump driven by a motor on a frame', prompts: string[] = [];
    let found: { pump?: string; motor?: string } = {};
    const ask: Ask = async (prompt) => { prompts.push(prompt);
      if (prompt.includes('## Here: the parts of what is asked')) {
        // (the scripted model reads the parts found by what they do and picks an assembly that pumps and a motor piece)
        const lines = prompt.split('Found by what they do')[1]?.split('\n\n')[0]?.split('\n').slice(1) ?? [];
        const pump = lines.find((l) => /^seed\.\S+ \|[^|]*pump/i.test(l))?.split(' | ')[0], motor = lines.find((l) => /^piece\.\S+ \|[^|]*motor/i.test(l) && /name: motor/.test(l))?.split(' | ')[0];
        found = { ...(pump ? { pump } : {}), ...(motor ? { motor } : {}) };
        return JSON.stringify({ parts: [{ name: 'pump', is: 'a water pump', from: pump ?? '' }, { name: 'motor', is: 'a motor that drives the pump', from: motor ?? '' }, { name: 'frame', is: 'a frame they stand on', from: 'piece.plate' }],
          joins: [{ part: 'motor', how: 'onto', to: 'frame' }, { part: 'pump', how: 'onto', to: 'frame' }] }); }
      if (prompt.includes('## Here: join the parts into one thing (one task)') && !prompt.includes('what is left loose'))
        // (the first build: both stood on the frame, the motor beside the pump, its shaft joined to nothing of it)
        return JSON.stringify({ tool: 'change', says: 'the motor and the pump on the frame', add: { on1: { b: 'room.onto', s: { face: '+y' } }, on2: { b: 'room.onto', s: { face: '+y' } }, show: { b: 'space.show' } }, wires: ['frame.block>on1.host', 'motor.block>on1.child', 'on1.block>on2.host', 'pump.block>on2.child', 'on2.thing>show.thing'] });
      if (prompt.includes('## Here: what is missing')) return '{"missing": []}';
      if (prompt.includes('## Here: make it work')) { const shaft = /its shaft \(([^)]+)\)/.exec(prompt)?.[1] ?? '';
        // (the second build, from the gate's reason: the pump over the motor's shaft line, the two onto the frame)
        return JSON.stringify({ tool: 'change', says: 'the pump over the motor shaft, then onto the frame', remove: ['on1', 'on2', 'show'], add: { ov: { b: 'room.over', s: { line: `${shaft}/axis`, where: 'hi' } }, on3: { b: 'room.onto', s: { face: '+y' } }, show2: { b: 'space.show' } }, wires: ['motor.block>ov.host', 'pump.block>ov.sleeve', 'frame.block>on3.host', 'ov.block>on3.child', 'on3.thing>show2.thing'] }); }
      return 'no reply scripted for this call';
    };
    const r = await composeBuild(request, { ask, remember: false });
    const lines = r.steps.map((s) => `${s.stage} ${s.ok ? 'ok' : 'NOT ok'}: ${s.line}`);
    // (the tools found a pump and a motor by function, and the split was given them)
    expect(found.pump, lines.join('\n')).toBeDefined(); expect(found.motor).toBeDefined();
    expect(r.parts.find((p) => p.name === 'pump')?.by).toBe('assembly'); expect(r.parts.find((p) => p.name === 'motor')?.by).toBe('assembly');
    // (the gate refused the first build: the motor drives nothing)
    const refused = r.steps.find((s) => s.stage === 'gate' && !s.ok && /not working: motor drives nothing/.test(s.line));
    expect(refused, lines.join('\n')).toBeDefined();
    // (the second build joins them and passes)
    expect(r.works?.ok, lines.join('\n')).toBe(true);
    expect(r.works?.drives).toContainEqual({ driver: 'motor', load: 'pump' });
    expect(r.steps.some((s) => s.stage === 'gate' && s.ok && /working now: motor drives pump/.test(s.line))).toBe(true);
    expect(r.unmet.filter((u) => /not working/.test(u))).toEqual([]);
    expect(prompts.some((p) => p.includes('## Here: make it work') && p.includes('motor drives nothing'))).toBe(true);
    console.log(lines.join('\n'));
  }, 30_000);

  it('the tools: compatible, missing interfaces, alternatives, variants, revisions, roles', async () => {
    // (a shaft wider than the bore refused with both sizes; a shaft into a bore wider than it accepted)
    const pump = interfacesOf(await blockOfId('seed.pump')).list, motor = interfacesOf(await blockOfId('seed.motor-dc')).list;
    const shaft = pump.find((x) => x.id === 'pump motor/axis')!, bore = motor.find((x) => x.id === 'commutator/axis')!, wide = pump.find((x) => x.id === 'impeller disc/axis')!;
    const no = compatible(shaft, bore); expect(no.ok).toBe(false); expect(no.says).toMatch(/wider than the bore/);
    expect(compatible(shaft, wide).ok).toBe(true);
    // (a motor with no power line wired, said)
    expect(missingInterfaces(await blockOfId('piece.dcmotor')).some((m) => /a motor with no power line wired/.test(m.says))).toBe(true);
    // (alternatives on its aisle; variants its sizes)
    expect(alternatives('piece.dcmotor').map((x) => x.id)).toContain('piece.gearmotor');
    expect(variantsOf('piece.dcmotor').find((v) => v.key === 'size')?.choices.length).toBeGreaterThan(1);
    // (revisions from memory.ts: version and digest)
    const g = emptyBoard('kept'); placeBlock(g, 'piece.plate', 0, 0, defaultsOf(LIBRARY.get('piece.plate')!), 'p');
    const kept = remember({ name: 'p10 plate', says: 'a plate kept by the acceptance test', graph: g, from: 'accept-p10', checked: { pieces: 1, groups: 1, failing: 0 } });
    const rv = revisions(kept.id)!; expect(rv.version).toBe(1); expect(rv.digest).toBe(kept.digest);
    expect([roleOf({ name: 'motor', is: '' }), roleOf({ name: 'pump', is: 'a water pump driven by a motor' }), roleOf({ name: 'frame', is: '' }), roleOf({ name: 'pack', is: 'a battery' })]).toEqual(['driver', 'load', 'structure', 'supply']);
  }, 30_000);

  it('the agent calls them as tools, and a fold with no outputs is refused', async () => {
    const t = await toolsFor(emptyBoard('tools'));
    await t.doTool('build', { nodes: { m: { b: 'piece.dcmotor' }, p: { b: 'piece.plate' } } });
    expect(await t.doTool('search', { q: 'pumps water' })).toMatch(/^\S*pump\S* \|/i);
    expect(await t.doTool('compatible', { a: 'm', b: 'p' })).toMatch(/pair|mates/);
    expect(await t.doTool('missing', { node: 'm' })).toMatch(/no power line/);
    expect(typeof await t.doTool('bad', { node: 'm' })).toBe('string');
    expect(await t.doTool('clash', { node: 'p' })).toMatch(/no piece passes into another/);
    expect(await t.doTool('alternatives', { id: 'piece.dcmotor' })).toMatch(/piece\.gearmotor/);
    const before = JSON.stringify(t.board());
    await expect(t.doTool('fold', { name: 'nothing out', says: 'a fold of everything with nothing wired out' })).rejects.toThrow(/a fold with no outputs is refused/);
    expect(JSON.stringify(t.board())).toBe(before);
    expect(await t.doTool('fold', { name: 'plate out', says: 'the plate as a block', nodes: ['p'], outs: ['p.block'] })).toMatch(/saved|does what/);
  }, 30_000);
});

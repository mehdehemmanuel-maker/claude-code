// Wave 14, the pipeline (decision 0029): the compose path names what a person must SEE before it splits (the recognition
// list, lookat.ts), holds each feature to a part that is in the build, compares the build's bound with the size asked, and,
// given an eye (`look`), is shown the picture of what it built and mends what is not seen. A scripted Ask and a scripted
// look stand in for the model and the browser (no model calls, no browser): what is checked is the pipeline.
import { describe, expect, it } from 'vitest';
import '../../src/nexus/seeds';
import { searchByFunction } from '../../src/nexus/aitools';
import { PROMPT_CUT, composeBuild, type Ask, type ComposeRun } from '../../src/nexus/agent';
import { engineeringOf, lookedOf, needsOf, recognitionOf, reportsIn, requirementsOf, settingsForNeeds, sizeOff } from '../../src/nexus/lookat';

const tail = (p: string) => p.slice(p.indexOf(PROMPT_CUT) + PROMPT_CUT.length), outOf = (prompt: string, part: string) => new RegExp(`\\b${part}\\.(\\w+): \\d+ pieces`).exec(prompt)?.[1] ?? 'block';
const mast = { tool: 'build', nodes: { foot: { b: 'room.make', s: { name: 'mast foot', shape: 'box', mat: 'al-6061', a: 40, b: 4, c: 40 } }, pole: { b: 'room.make', s: { name: 'mast pole', shape: 'rod', mat: 'al-6061', a: 6, b: 120 } }, st: { b: 'room.stack', s: { name: 'mast', axis: 'y', order: 'foot,pole' } } }, wires: ['foot.block>st.blocks', 'pole.block>st.blocks'], says: 'a mast: a pole on a foot plate' };
const lines = (r: ComposeRun) => r.steps.map((s) => `${s.stage} ${s.ok ? 'ok' : 'NOT ok'}: ${s.line}`).join('\n');
const FEATURES = [{ name: 'base', is: 'a low wheeled base, wider than tall', where: 'underneath' }, { name: 'mast', is: 'a thin pole, taller than the base', where: 'on top, upright' }, { name: 'lamp', is: 'a lamp head, a fifth of the mast', where: 'at the top of the mast' }];
/** The scripted model: each one-task call answered from what its prompt holds. `o.shows` what the split says each part
 *  shows; `o.size` the size the recognition list gives; `o.looks` what the eye says, look by look. */
function scripted(o: { features?: unknown[]; size?: number; requirements?: unknown[]; needs?: { rover?: Record<string, number>; mast?: Record<string, number> }; mastFrom?: string; shows: { rover: string[]; mast: string[] }; looks?: Record<string, string>[] }) {
  const prompts: string[] = [], shown: number[] = []; let looked = 0;
  const ask: Ask = async (prompt, _tier, images) => { prompts.push(prompt); shown.push(images?.length ?? 0); const t = tail(prompt);
    if (prompt.includes('## Here: what a person must see')) return JSON.stringify({ features: o.features ?? FEATURES, ...(o.size ? { size: { longest_m: o.size, why: 'said by the test' } } : {}), proportions: 'low, with a tall thin mast', ...(o.requirements ? { requirements: o.requirements } : {}) });
    if (prompt.includes('## Here: the parts of what is asked')) return JSON.stringify({ parts: [{ name: 'rover', is: 'a wheeled robot base', from: 'seed.wheeled-base', shows: o.shows.rover, ...(o.needs?.rover ? { needs: o.needs.rover } : {}) }, { name: 'mast', is: 'a mast: a pole on a foot plate', from: o.mastFrom ?? 'aisle structure', shows: o.shows.mast, ...(o.needs?.mast ? { needs: o.needs.mast } : {}) }], joins: [{ part: 'mast', how: 'on top of', to: 'rover' }] });
    if (prompt.includes('## Here: join the parts')) return JSON.stringify({ tool: 'change', add: { up: { b: 'room.onto', s: { face: '+y' } }, up_see: { b: 'space.show' } }, wires: [`rover.${outOf(prompt, 'rover')}>up.host`, `mast.${outOf(prompt, 'mast')}>up.child`, 'up.thing>up_see.thing'], says: 'mast on top of rover' });
    if (prompt.includes('## Here: what is missing')) return '{"missing": []}';
    if (prompt.includes('## Here: make it strong enough')) return 'There is no larger drive to choose here.';
    if (prompt.includes('## Here: look at what was built')) { const said = o.looks?.[Math.min(looked++, (o.looks?.length ?? 1) - 1)] ?? {};
      return JSON.stringify({ features: Object.entries(said).map(([name, seen]) => ({ name, seen, note: seen === 'seen' ? '' : `no ${name} in the picture` })), proportions: 'a low base with a pole on it' }); }
    if (prompt.includes('## Here: make it look like what was asked')) { const host = /The whole now: (\w+)\.(\w+):/.exec(t)!;
      // (the mend, from the eye's reason: a lamp head made and put on top of the whole, the old show replaced)
      return JSON.stringify({ tool: 'change', says: 'a lamp head on top', remove: ['up_see'], add: { lamphead: { b: 'room.make', s: { name: 'lamp head', shape: 'box', mat: 'al-6061', a: 30, b: 20, c: 30 } }, top: { b: 'room.onto', s: { face: '+y' } }, see2: { b: 'space.show' } }, wires: [`${host[1]}.${host[2]}>top.host`, 'lamphead.block>top.child', 'top.thing>see2.thing'] }); }
    return JSON.stringify(mast); };
  return { ask, prompts, shown };
}

describe('wave 14, the pipeline: features first, and an eye on the result', () => {
  it('a build that lacks a listed feature is reported not seen, mended once, then passes', async () => {
    const s = scripted({ shows: { rover: ['base'], mast: ['mast', 'lamp'] }, looks: [{ base: 'seen', mast: 'seen', lamp: 'not seen' }, { base: 'seen', mast: 'seen', lamp: 'seen' }] });
    const pictures: number[] = [], look = async (board: { nodes: Record<string, unknown> }) => { pictures.push(Object.keys(board.nodes).length); return { png: new Uint8Array([137, 80, 78, 71, pictures.length]) }; };
    const r = await composeBuild('A rover with a mast and a lamp on it', { ask: s.ask, look, remember: false });
    console.log(lines(r));
    // (the list was written first, and the split and the mast's plan were given it)
    expect(s.prompts[0], 'the first call writes the recognition list').toContain('## Here: what a person must see');
    expect(r.steps[0]).toMatchObject({ stage: 'features', ok: true });
    expect(tail(s.prompts[1]!), 'the split is given the list').toMatch(/A person must see \(the recognition list\):\n- base: [^]*- lamp: a lamp head[^]*\n\nRequest: A rover with a mast and a lamp on it$/);
    expect(s.prompts.find((p) => tail(p).includes('mast: a mast: a pole on a foot plate (one part of')), 'the part\'s plan is told what it must show').toMatch(/A person must see in it: mast: a thin pole[^]*lamp: a lamp head/);
    // (the eye: shown a picture, it did not see the lamp; one mend; then it saw it)
    const looks = r.steps.filter((x) => x.stage === 'look').map((x) => `${x.ok ? 'ok' : 'no'} ${x.line}`);
    expect(looks[0], lines(r)).toMatch(/^no look 1: base seen; mast seen; lamp not seen \(no lamp in the picture\)/);
    expect(looks[1]).toMatch(/^ok mended for what was not seen \(lamp\): a lamp head on top; 1 piece\(s\) added/);
    expect(looks[2]).toMatch(/^ok look 2: base seen; mast seen; lamp seen/);
    expect(looks.length).toBe(3);
    expect(s.prompts.filter((p) => p.includes('## Here: make it look like what was asked')).length, 'mended once').toBe(1);
    expect(s.prompts.find((p) => p.includes('## Here: make it look like what was asked')), 'the mend is given the reason by name').toMatch(/What a person does not see:\n- not seen: lamp: a lamp head/);
    // (the model was shown the picture: an image with each look and with the mend, with no other call)
    expect(s.prompts.map((p, k) => (s.shown[k] ? (p.includes('## Here: look at what was built') ? 'look' : p.includes('## Here: make it look') ? 'mend' : 'other') : '')).filter(Boolean)).toEqual(['look', 'mend', 'look']);
    expect(pictures.length, 'two pictures, the second of a bigger board').toBe(2); expect(pictures[1]!).toBeGreaterThan(pictures[0]!);
    // (then it passes: nothing unmet, every feature seen and held to a part in the build, the mend's pieces a part)
    expect(r.unmet, lines(r)).toEqual([]);
    expect(r.looks).toBe(2);
    expect(r.features?.map((f) => `${f.name} ${f.seen} ${f.part}`)).toEqual(['base seen rover', 'mast seen mast', 'lamp seen mast']);
    expect(r.parts.find((p) => p.name === 'seen1')).toMatchObject({ names: ['lamp head'], shows: ['lamp'] });
    expect(r.asks, 'the list, a split, the mast\'s plan, a join, the final check, a look, a mend, a look').toBe(8);
  }, 60_000);

  it('what is still not seen after two mends is unmet as "not seen"', async () => {
    const s = scripted({ shows: { rover: ['base'], mast: ['mast', 'lamp'] }, looks: [{ base: 'seen', mast: 'seen', lamp: 'wrong' }] });
    const r = await composeBuild('A rover with a mast and a lamp on it', { ask: s.ask, look: async () => ({ png: new Uint8Array([1]) }), remember: false });
    expect(s.prompts.filter((p) => p.includes('## Here: make it look like what was asked')).length, 'two mends at most').toBeLessThanOrEqual(2);
    expect(r.looks, 'at most three looks').toBeLessThanOrEqual(3);
    expect(r.unmet, lines(r)).toContain('not seen: lamp (wrong): no lamp in the picture');
  }, 60_000);

  it('a feature with no part is unmet by name; no picture is said, never passed over', async () => {
    const s = scripted({ features: [...FEATURES, { name: 'flag', is: 'a small flag, a tenth of the mast', where: 'at the tip' }], shows: { rover: ['base'], mast: ['mast', 'lamp'] } });
    const r = await composeBuild('A rover with a mast, a lamp and a flag', { ask: s.ask, look: async () => undefined, remember: false });
    const splits = s.prompts.filter((p) => p.includes('## Here: the parts of what is asked'));
    expect(splits.length, 'the split asked again with the feature no part shows').toBe(2);
    expect(tail(splits[1]!)).toMatch(/No part of it shows: flag: a small flag/);
    expect(r.steps.some((x) => x.stage === 'split' && !x.ok && /no part shows: flag/.test(x.line)), lines(r)).toBe(true);
    expect(r.unmet, lines(r)).toContain('feature with no part: flag: a small flag, a tenth of the mast (at the tip)');
    expect(r.features?.find((f) => f.name === 'flag')?.part).toBeUndefined();
    expect(r.unmet).toContain('not looked at: no picture of the build could be taken or read');
    expect(r.unmet.filter((u) => u.startsWith('feature')), 'the features with a part in the build are met').toEqual(['feature with no part: flag: a small flag, a tenth of the mast (at the tip)']);
  }, 60_000);

  it('a size 3 times off is said; within 2 times it is not', async () => {
    const shows = { rover: ['base'], mast: ['mast', 'lamp'] };
    const r0 = await composeBuild('A rover with a mast and a lamp on it', { ask: scripted({ shows }).ask, features: true, remember: false });
    const built = r0.size?.built; expect(built, 'the build has a bound').toBeGreaterThan(0); expect(r0.unmet, lines(r0)).toEqual([]);
    const big = await composeBuild('A giant rover with a mast and a lamp on it', { ask: scripted({ shows, size: built! * 3 }).ask, features: true, remember: false });
    expect(big.steps[0]!.line, 'the size asked is said with the list').toMatch(/the whole about .* on its longest side/);
    expect(big.unmet.filter((u) => u.startsWith('size:')), lines(big)).toEqual([expect.stringMatching(/^size: the build is .* on its longest side, asked about .* \(3 times too small\)$/)]);
    expect(big.size).toMatchObject({ asked: built! * 3, built });
    const near = await composeBuild('A rover with a mast and a lamp on it', { ask: scripted({ shows, size: built! * 1.5 }).ask, features: true, remember: false });
    expect(near.unmet, lines(near)).toEqual([]);
    // (the part made from pieces is told the size of the part the library gave, to be in proportion beside it)
    const s1 = scripted({ shows, size: built! * 1.5 }); await composeBuild('A rover with a mast and a lamp on it', { ask: s1.ask, features: true, remember: false });
    expect(s1.prompts.find((p) => tail(p).includes('mast: a mast: a pole on a foot plate (one part of'))).toMatch(/The part "rover" \(a wheeled robot base\) is already built: \d+ x \d+ x \d+ mm \(x by y by z\)\. Size this part beside THAT/);
    // (an assembly more than twice the whole asked is not taken as a part: said, and that part built from pieces)
    const tiny = await composeBuild('A miniature rover with a mast and a lamp on it', { ask: scripted({ shows, size: built! / 10 }).ask, features: true, remember: false });
    expect(tiny.steps.find((x) => x.stage === 'part' && !x.ok)?.line, lines(tiny)).toMatch(/^rover: seed\.wheeled-base is .* more than twice the whole asked \(.*\): not taken; built from pieces at the size asked$/);
    expect(tiny.parts.find((p) => p.name === 'rover')?.by).toBe('plan');
  }, 90_000);

  it('the readers hold a model\'s answers to their form', () => {
    expect(() => recognitionOf({ features: [] })).toThrow(/no features/);
    expect(recognitionOf({ features: [{ name: 'Tracks ', is: 'two' }, { name: 'tracks', is: 'again' }], size: { longest_m: 'x' } })).toEqual({ features: [{ name: 'tracks', is: 'two' }] });
    // (a feature the eye's answer leaves out is not seen: nothing was said of it)
    expect(lookedOf({ features: [{ name: 'Tracks', seen: 'seen' }] }, [{ name: 'tracks', is: '' }, { name: 'blade', is: '' }]).features.map((f) => f.seen)).toEqual(['seen', 'not seen']);
    expect(sizeOff(1, 2)).toBeUndefined(); expect(sizeOff(1, 0.5)).toBeUndefined(); expect(sizeOff(0.3, 1)).toMatch(/3\.3 times too small/); expect(sizeOff(5, 1)).toMatch(/5 times too big/);
  });

  it('E to H: requirements as numbers, the requirement on each part, the engineering check, the design summary', async () => {
    const REQS = [{ name: 'envelope', value: 0.4, unit: 'm', from: 'assumed' }, { name: 'payload', value: 2, unit: 'kg', from: 'request' }, { name: 'speed', value: 0.5, unit: 'm/s', from: 'assumed' }, { name: 'power', value: 'electric', unit: '', from: 'assumed' }];
    const shows = { rover: ['base'], mast: ['mast', 'lamp'] };
    // (E: the requirements are written with the list, each from the request or assumed, and the split is given them)
    const s = scripted({ shows, requirements: REQS, needs: { rover: { power_W: 1e6 }, mast: { force_N: 30 } } });
    const r = await composeBuild('A rover with a mast and a lamp on it, carrying 2 kg', { ask: s.ask, features: true, remember: false });
    expect(s.prompts[0]).toMatch(/"requirements": \[[^]*"RC" means remotely controlled, never toy-sized/);
    expect(r.steps[1]).toMatchObject({ stage: 'features', ok: true, line: 'requirements: envelope 0.4 m (assumed (typical)); payload 2 kg (from the request); speed 0.5 m/s (assumed (typical)); power electric (assumed (typical))' });
    expect(tail(s.prompts[1]!)).toMatch(/Requirements \(an engineered machine, sized to these\): envelope 0\.4 m \(assumed \(typical\)\); payload 2 kg \(from the request\)[^]*Each part the requirement falls on says it \("needs"\)\./);
    // (F: the part's requirement reaches its plan; G: what no row carries is said, never passed silently; H: the summary)
    expect(r.parts.map((p) => p.needs)).toEqual([{ power: 1e6 }, { force: 30 }]);
    expect(s.prompts.find((p) => tail(p).includes('mast: a mast: a pole on a foot plate (one part of'))).toMatch(/It must give: force 30 N \(power: electric\)\. Choose components whose rows give that[^]*never a hobby servo/);
    expect(r.engineering?.notes, lines(r)).toEqual(['rover: needs power 1000 kW, but its components\' rows carry no torque, force or power to hold it to', 'mast: needs force 30 N, but its components\' rows carry no torque, force or power to hold it to']);
    expect(r.mass, 'the mass from the geometry').toBeGreaterThan(0);
    expect(r.answer.split('\n').at(-1), 'the answer ends with the design summary').toMatch(/^Design: envelope \d+ mm on its longest side \(asked about 400 mm\); mass [\d.]+ kg \(from the geometry\); payload 2 kg \(from the request\); power electric; margins: none held [^]*not checked: rover: needs power 1000 kW[^]*; assumed: envelope 0\.4 m, speed 0\.5 m\/s, power electric\.$/);
    // (G in the pipeline: a motor whose electrical input (its row's V x A) is below the power its requirement needs: the
    // margin fails, one mend is asked with the reason, and still failing it is unmet; the same motor with a need it meets holds)
    const motor = searchByFunction('drives a shaft', 8).find((f) => /^piece\./.test(f.id) && /motor/i.test(f.name))!.id;
    const weak = scripted({ shows, requirements: REQS, mastFrom: motor, needs: { mast: { force_N: 20000, speed_m_s: 0.5 } } });
    const rw = await composeBuild('A rover with a mast and a lamp on it, lifting 2 kg', { ask: weak.ask, features: true, remember: false });
    const fail = rw.unmet.find((u) => u.startsWith('engineering:'));
    expect(fail, `${lines(rw)}\n${JSON.stringify(rw.engineering)}`).toMatch(/^engineering: the mast gives [\d.]+ k?W \(its electrical input, V × A\), 10 kW needed \(margin 0\.\d+\): choose a larger one, or gear it down$/);
    expect(weak.prompts.filter((p) => p.includes('## Here: make it strong enough')).length, 'one mend asked').toBe(1);
    expect(weak.prompts.find((p) => p.includes('## Here: make it strong enough'))).toMatch(/What fails:\n- the mast gives [^\n]*10 kW needed/);
    expect(rw.steps.some((x) => x.stage === 'gate' && !x.ok && x.line.startsWith('engineering: the mast gives'))).toBe(true);
    expect(rw.answer.split('\n').at(-1)).toMatch(/margins: mast gives [^;]*10 kW needed \(margin 0\.\d+\) FAILS/);
    const ok = scripted({ shows, requirements: REQS, mastFrom: motor, needs: { mast: { power_W: 1 } } });
    const ro = await composeBuild('A rover with a mast and a lamp on it, lifting 2 kg', { ask: ok.ask, features: true, remember: false });
    expect(ro.unmet.filter((u) => u.startsWith('engineering:')), lines(ro)).toEqual([]);
    expect(ro.engineering?.margins).toMatchObject([{ part: 'mast', what: 'power', needs: 1, ok: true }]);
    expect(ok.prompts.some((p) => p.includes('## Here: make it strong enough'))).toBe(false);
  }, 120_000);

  it('the engineering readers: requirements, needs into a block\'s settings by their keys and units, margins, a part\'s own report', () => {
    expect(requirementsOf({ requirements: [{ name: 'Payload', value: '500', unit: 'kg', from: 'from the request' }, { name: 'power', value: 'hydraulic' }, { name: 'payload', value: 1 }, { name: 'speed' }] })).toEqual([{ name: 'payload', value: 500, unit: 'kg', from: 'request' }, { name: 'power', value: 'hydraulic', unit: '', from: 'assumed' }]);
    expect(needsOf({ force_kN: 14.7, payload_kg: 500, span_mm: 2000, colour: 3, speed: -1 })).toEqual({ force: 14700, payload: 500, span: 2 });
    // (F: read generically from the settings a block has, never by its id; a unit not known is said, not guessed)
    const sn = settingsForNeeds([{ key: 'payload', label: 'Payload', unit: 'kg', type: 'number' }, { key: 'F', label: 'Working force (kN)', type: 'number' }, { key: 'span', label: 'Span', unit: 'mm' }, { key: 'speed', label: 'Speed', unit: 'knots' }, { key: 'name', label: 'load name', type: 'text' }], { payload: 500, force: 14700, span: 2, speed: 0.5 });
    expect(sn.set).toEqual({ payload: 500, F: 14.7, span: 2000 }); expect(sn.lines.at(-1)).toBe('speed not set on speed: its unit (knots) is not one known here');
    // (G: the lift cylinder's row against its requirement; a servo against a machine's torque; the supply; a report)
    const e = engineeringOf([
      { name: 'lift', role: 'driver', needs: { force: 14700 }, pieces: [{ name: 'cylinder', lines: [{ kind: 'fluid', size: { N: 4900 } }] }] },
      { name: 'servo', role: 'driver', needs: { torque: 40 }, pieces: [{ name: 'hobby servo', lines: [{ kind: 'shaft', size: { Nm: 1.2 } }, { kind: 'power', size: { V: 6, A: 2 } }] }] },
      { name: 'drive', role: 'driver', needs: { torque: 10 }, pieces: [{ name: 'gearmotor', lines: [{ kind: 'shaft', size: { Nm: 25 } }, { kind: 'power', size: { V: 48, A: 10 } }] }] },
      { name: 'battery', role: 'supply', pieces: [{ name: 'pack', lines: [{ kind: 'power', size: { V: 48, A: 5 } }] }] },
      { name: 'boom', role: 'structure', pieces: [], outputs: { report: { checks: [{ check: 'bending', sf: 1.4, min: 2 }, { check: 'buckling', sf: 3.1, min: 2 }, { check: 'weld', ok: false }], deflection: { sf: 9 } } } }]);
    expect(e.reasons).toEqual(['the lift gives 4.9 kN, 14.7 kN needed (margin 0.333): choose a larger bore or a stronger actuator', 'the servo gives 1.2 N·m, 40 N·m needed (margin 0.03): choose a larger one, or gear it down',
      'the boom (bending): safety factor 1.4, at least 2 stated (margin 0.7): make it stronger (a larger section, a stronger material, a larger size)', 'the boom (weld): its own engineering report says it fails: make it stronger (a larger section, a stronger material, a larger size)',
      'the supply gives 240 W, the drivers take 492 W (margin 0.488): choose a larger supply']);
    expect(e.margins.filter((m) => m.ok).map((m) => `${m.part} ${m.what} ${+m.margin.toFixed(2)}`)).toEqual(['drive torque 2.5', 'boom (buckling) safety factor 1.55']);
    expect(e.notes).toEqual(['boom (report.deflection): safety factor 9, no minimum stated to hold it to']);
    expect(reportsIn({ block: { pieces: [{ sf: 1 }], faces: [] } })).toEqual([]);
  });

  it('with no look and no list asked, the pipeline is as it was: no call more', async () => {
    const s = scripted({ shows: { rover: [], mast: [] } });
    const r = await composeBuild('A rover with a mast', { ask: s.ask, remember: false });
    expect(s.prompts.some((p) => p.includes('## Here: what a person must see') || p.includes('## Here: look at'))).toBe(false);
    expect([r.asks, r.unmet, r.features, r.looks]).toEqual([4, [], undefined, undefined]);
  }, 60_000);
});

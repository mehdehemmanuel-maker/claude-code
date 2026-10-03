// Ego in the headset: Forge typed on the tablet builds; a break gets a diagnosis and a fix that holds; the tablet's
// search finds anything and puts what you pick in the hotbar.

import { test } from '@playwright/test';
import { boot, counts, enterVR, expect, frames, sb, tap, triggerAt } from './helpers';

test('Forge on the tablet: typed on the keys, run, and journalled', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-ego');
  await tap(page, 'forge');
  // a few real key presses, then the rest of the line
  for (const k of ['p', 'l', 'a', 'c', 'e']) await tap(page, `key-${k}`);
  expect(await sb(page, (s) => s.ego.command)).toBe('place');
  await sb(page, (s) => { s.ego.command = 'repeat 3 { place block at (i*0.3) 0.05 -1 as leg }'; });
  await tap(page, 'forge-run');
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(3);
  const names = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => p.name).sort());
  expect(names).toEqual(['leg0', 'leg1', 'leg2']);
  expect(await sb(page, (s) => s.ego.journal.filter((l: string) => l.startsWith('place block')).length)).toBe(3);
  // a mistake is explained, not thrown
  await sb(page, (s) => { s.ego.command = 'join leg0 leg2'; });
  await tap(page, 'forge-run');
  expect(await sb(page, (s) => s.ego.output.at(-1))).toMatch(/aren't touching/);
  expect(errors).toEqual([]);
});

test('Ego: a joint that breaks gets the reason and a fix that holds', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  // a 2x4 arm on a frozen post, a 20 kg load on its end, and screws that reach only 10 mm into the arm: a real joint
  // (a screw that reaches nothing is no joint, and the gate refuses it, K-9), but far too weak for 130 N m, so it breaks
  await sb(page, (s) => {
    const { app } = s;
    const post = app.ego.host.place('block', {}, 'wood.douglas-fir', [0, 1, 0], [], 'post');
    app.store.transact('freeze', (tx: any) => tx.update('parts', post, { frozen: true }));
    app.ego.host.place('lumber', { length: 0.6 }, 'wood.douglas-fir', [0.35, 1, 0], [], 'arm');
    app.ego.run('join post arm with screwed');
    const d = Math.cbrt((4 * (20 / 7200)) / Math.PI); // a 20 kg cast-iron test weight, d = h
    app.ego.host.place('weight', { mass: 20 }, 'cast-iron.gray-30', [0.65 + d / 2, 1, 0], [], 'load');
    app.ego.run('join arm load with fixed');
    const c = Object.values(app.doc.connections)[0] as any;
    app.store.transact('short screws', (tx: any) => tx.update('connections', c.id, { params: { ...c.params, length: 0.11 } }));
  });
  await page.waitForFunction(() => (window as any).sandbox.ego.advice.some((a: any) => a.kind === 'break'), null, { timeout: 60_000 });
  const advice = await sb(page, (s) => { const a = s.ego.advice.find((x: any) => x.kind === 'break'); return { text: a.text, fixes: a.fixes.map((f: any) => f.label) }; });
  expect(advice.text).toMatch(/screwed joining post and arm broke/);
  expect(advice.fixes.length).toBeGreaterThan(0);
  // apply the first fix: the arm is set back and fastened with something that carries 1.5x the load
  await sb(page, (s) => s.ego.advice.find((x: any) => x.kind === 'break').fixes[0].apply());
  await frames(page, 90);
  const after = await sb(page, (s) => {
    const c = Object.values(s.app.doc.connections)[0] as any;
    const arm = Object.values(s.app.doc.parts).find((p: any) => p.name === 'arm') as any;
    return { status: c.state.status as string, y: s.app.livePose(arm.id).p[1] as number };
  });
  expect(after.status).toBe('intact');
  expect(Math.abs(after.y - 1)).toBeLessThan(0.02);
  expect(errors).toEqual([]);
});

test('search finds anything as you type; what you pick goes in the hotbar', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-search');
  for (const k of ['o', 'a', 'k']) await tap(page, `skey-${k}`);
  await frames(page, 2);
  await tap(page, 'found-0');
  const picked = await sb(page, (s) => ({ mat: s.app.spawnMaterial, tool: s.tools.tool.id, hot: s.xr.tablet.hotbar.items[0] }));
  expect(picked.mat).toMatch(/oak/);
  expect(picked.tool).toBe('place');
  expect(picked.hot).toEqual({ type: 'material', id: picked.mat });
  // a hotbar slot picks it up again
  await tap(page, 'tab-tools');
  await tap(page, 'tool-grab');
  await tap(page, 'hot-0');
  expect(await sb(page, (s) => s.tools.tool.id)).toBe('place');
  expect(errors).toEqual([]);
});

test('complaining while playing: a sunk part is the kernel\'s to contain and Ego\'s to name; she writes it up and moves nothing', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  await sb(page, (s) => {
    s.ego.run('place block at 0 0.05 -1 as crate');
    const id = Object.values(s.app.doc.parts)[0] as any;
    // it has gone through the floor slab
    s.app.physics.send({ op: 'setPose', id: id.id, pose: { p: [0, -1.3, -1], q: [0, 0, 0, 1] }, linear: [0, 0, 0], angular: [0, 0, 0] });
  });
  await frames(page, 6);
  const reply = await sb(page, (s) => s.ego.ask('ugh the crate fell through the floor'));
  // she has no hand on any pose or velocity (ML-4, ML-7): she does not put it back, she writes it up
  expect(reply).toMatch(/^I've written it up for Claude with what I saw and the build as it was/);
  expect(reply).not.toMatch(/put crate back/);
  await frames(page, 30);
  expect(await sb(page, (s) => s.app.livePose(Object.keys(s.app.doc.parts)[0]).p[1])).toBeLessThan(0);
  // (the test browser draws in software, so the frame budget may have written up slow frames too)
  const rep = await sb(page, (s) => { const r = s.ego.reports.unsent.find((x: any) => x.trouble === 'fell-through' && x.words === 'ugh the crate fell through the floor'); return { trouble: r.trouble, code: r.shareCode.slice(0, 6), words: r.words, fixed: r.fixed }; });
  expect(rep).toEqual({ trouble: 'fell-through', code: 'VRSB1.', words: 'ugh the crate fell through the floor', fixed: null });
  expect(errors).toEqual([]);
});

test('Ego designs: "build a table that holds 60 kg" is sized, built, joined, and stands', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const reply = await sb(page, (s) => s.ego.ask('build a table that holds 60 kg'));
  expect(reply).toMatch(/Table 1200 mm × 700 mm, 750 mm high, for 60 kg/);
  expect(reply).toMatch(/Every joint will carry its load with margin/);
  const made = await counts(page);
  expect(made.parts).toBe(5);
  expect(made.conns).toBe(4);
  expect(await sb(page, (s) => s.app.selection.parts.size)).toBe(5);
  // it stands under its own weight and a 60 kg load on the top
  await sb(page, (s) => {
    const top = Object.values(s.app.doc.parts).find((p: any) => p.name.endsWith('top')) as any;
    s.ego.host.place('block', { x: 0.3, y: 0.1, z: 0.3 }, 'steel.a36', [top.pose.p[0], top.pose.p[1] + 0.07, top.pose.p[2]], [], 'load');
    s.app.play();
  });
  await frames(page, 240);
  const after = await sb(page, (s) => {
    const top = Object.values(s.app.doc.parts).find((p: any) => p.name.endsWith('top')) as any;
    return { broken: Object.values(s.app.doc.connections).filter((c: any) => c.state.status === 'broken').length, y: s.app.livePose(top.id).p[1] as number, y0: top.pose.p[1] as number };
  });
  expect(after.broken).toBe(0);
  expect(Math.abs(after.y - after.y0)).toBeLessThan(0.01);
  expect(errors).toEqual([]);
});

test('her ganglia: asked to engineer, she answers from real parts and names the laws; asked what she knows, she says it with its source', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const drivetrain = await sb(page, (s) => s.ego.ask('design the whole drivetrain for a 120 kg kart at 3 m/s'));
  expect(drivetrain).toMatch(/Coreless brushed DC motor, Ø40 mm, 150 W, 24 V winding/);
  expect(drivetrain).toMatch(/UCP205/);
  expect(drivetrain).toMatch(/Worked out by .*Rolling resistance/);
  expect(await sb(page, (s) => s.ego.lastWorked.workflow)).toBe('powertrain.design');
  expect(await sb(page, (s) => s.ego.ask('size a wire for 20 a over 3 m at 24 v'))).toMatch(/^12 AWG pair/);
  expect(await sb(page, (s) => s.ego.ask('tell me about rolling resistance'))).toMatch(/Source: Gillespie/);
  expect(await sb(page, (s) => s.ego.ask('what do you know'))).toMatch(/I know \d+ laws/);
  // her working, law by law, and what the answer hangs on
  expect(await sb(page, (s) => s.ego.ask('show your work'))).toMatch(/^1\. Wire drop|^1\. Voltage drop/);
  expect(await sb(page, (s) => s.ego.ask('what does it depend on'))).toMatch(/^It hangs most on/);
  // a machine, broken down, with what its maker doesn't detail said plainly
  const fx = await sb(page, (s) => s.ego.ask('breakdown mark forged fx10'));
  expect(fx).toMatch(/continuous-fibre composite printer/);
  expect(fx).toMatch(/Source: Markforged/);
  expect(fx).toMatch(/Metal Kit/);
  expect(fx).toMatch(/not published/);
  // why things are done as they are, the many ways to do a job, a whole machine grown, and the challenges she sets herself
  expect(await sb(page, (s) => s.ego.ask('why use a torque arm?'))).toMatch(/Why: .*reaction torque/);
  expect(await sb(page, (s) => s.ego.ask('how do I turn electricity into motion?'))).toMatch(/against the ground.*against the fluid|against the fluid.*against the ground/);
  const grown = await sb(page, (s) => s.ego.ask('grow a kart for 120 kg at 3 m/s'));
  expect(grown).toMatch(/fuse-at-source/);
  expect(grown).toMatch(/Built in this order: frame/);
  expect(await sb(page, (s) => s.ego.ask('what\'s inside a motor?'))).toMatch(/Lorentz force/);
  expect(await sb(page, (s) => s.ego.ask('try to build a computer'))).toMatch(/logic\.mechanical.*Landauer.*In Nex the 5 needs are transformations/s);
  // her own language, in the app: a thing as Nex writes it beside the English, and a word of two senses settled by the other side
  const nex = await sb(page, (s) => s.ego.ask('say a bearing in your language'));
  expect(nex).toMatch(/^In Nex I hold a bearing as \d+ structures, hashed and compared without a word in them; \d of them, each as Nex writes it and then in English: (part|kind|function|influence|constrain)\(bearing, /);
  expect(nex).toMatch(/Their hashes: #[0-9a-f]{8}/);
  expect(await sb(page, (s) => s.ego.ask('compare current and voltage'))).toMatch(/^By current I take electric current, as a quantity\. Electric current and voltage are different kinds of quantity/);
  expect(await sb(page, (s) => s.ego.ask('what causes current'))).toMatch(/^Current names 3 things to me: .*Which do you mean\?$/);
  expect(errors).toEqual([]);
});

test('the watchdog: a part that leaves the world is named by Ego with the obligation it broke, and written up; she moves nothing', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  await sb(page, (s) => {
    s.ego.run('place block at 0.5 0.05 -1 as crate');
    const id = Object.keys(s.app.doc.parts)[0];
    // a flaw sends it through the slab and out of the world
    s.app.physics.send({ op: 'setPose', id, pose: { p: [0.5, -3, -1], q: [0, 0, 0, 1] }, linear: [0, -5, 0], angular: [0, 0, 0] });
  });
  await page.waitForFunction(() => (window as any).sandbox.ego.advice.some((a: any) => a.text.includes('went through the floor')), null, { timeout: 30_000 });
  await frames(page, 30);
  const after = await sb(page, (s) => {
    const id = Object.keys(s.app.doc.parts)[0];
    // (the test browser draws in software, so the frame budget may have written up slow frames too)
    const r = s.ego.reports.unsent.find((x: any) => x.trouble === 'fell-through');
    return { y: s.app.livePose(id).p[1] as number, text: s.ego.advice.find((a: any) => a.text.includes('went through the floor')).text as string, words: r?.words as string, fixed: r?.fixed as string | null };
  });
  expect(after.text).toMatch(/crate went through the floor: the physics broke its own obligation F-3\.5 \(nothing passes through a solid\)\. Nothing from this run counts as physics until that is fixed\. Written up for Claude\./);
  expect(after.y).toBeLessThan(0);
  expect(after.words).toMatch(/^\(Ego saw it herself\) fell on crate/);
  expect(after.fixed).toBeNull();
  expect(errors).toEqual([]);
});

test('show Ego: point, pull the trigger, she says what she sees there; a tap tells her what is wrong', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await sb(page, (s) => { s.ego.run('place block mat steel.a36 at 0 0.05 -1 as anvil'); });
  await frames(page, 10);
  await tap(page, 'show');
  expect(await sb(page, (s) => s.app.showArmed)).toBe(true);
  // the right hand points at the block and pulls the trigger
  await triggerAt(page, [0, 0.05, -1]);
  const seen = await sb(page, (s) => ({ armed: s.app.showArmed, said: s.ego.shown?.said as string, id: s.ego.shown?.id && s.app.doc.parts[s.ego.shown.id].name }));
  expect(seen.armed).toBe(false);
  expect(seen.id).toBe('anvil');
  expect(seen.said).toMatch(/That's anvil: block in Structural steel ASTM A36, 7\.9 kg; on the floor, still; joined to nothing/);
  // nothing was placed by the trigger pull
  expect((await counts(page)).parts).toBe(1);
  // she watches it a moment, then a tap says it was shaking: the report carries what she saw
  await frames(page, 60);
  await tap(page, 'shown-0');
  const rep = await sb(page, (s) => s.ego.reports.unsent.find((x: any) => x.words === "it's shaking"));
  expect(rep.trouble).toBe('jitter');
  expect(rep.seen.join(' ')).toMatch(/you showed me: That's anvil/);
  expect(rep.seen.join(' ')).toMatch(/watching anvil for/);
  expect(errors).toEqual([]);
});

test('"it won\'t save": Ego saves again and says how it went, and a full storage is said plainly', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  await sb(page, (s) => s.ego.run('place block at 0 0.05 -1 as box'));
  const reply = await sb(page, (s) => s.ego.ask("my build won't save"));
  expect(reply).toMatch(/^I saved it again as “Build 1” \(a new build\), and it read back whole/);
  expect(await sb(page, (s) => s.app.library.list().length)).toBe(1);
  // the browser's storage full: the save fails out loud, and the watchdog has it for Ego
  const out = await page.evaluate(() => {
    const s = (window as any).sandbox;
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
    try { return { entry: s.app.saveBuild(true), health: s.app.live.health.at(-1)?.detail as string }; } finally { Storage.prototype.setItem = set; }
  });
  expect(out.entry).toBeNull();
  expect(out.health).toMatch(/a build save failed: the headset's storage for this app is full/);
  expect(errors).toEqual([]);
});

test('her forms: a shape said in words and a part invented for a job are made, placed and rest on the floor; one nothing can make is refused', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const sphere = await sb(page, (s) => s.ego.ask('make a 40 mm sphere'));
  expect(sphere).toMatch(/Ø40 mm sphere/);
  expect(sphere).toMatch(/It's in front of you/);
  const bracket = await sb(page, (s) => s.ego.ask('invent a bracket that holds 500 N at 120 mm from the wall'));
  expect(bracket).toMatch(/grew a bracket holding 500 N at 120 mm from its wall/);
  expect(bracket).toMatch(/safety factor of 2\.5/);
  const parts = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => ({ kind: p.kind, form: String(p.params.form ?? '').length })));
  expect(parts.length).toBe(2);
  expect(parts.every((p: { kind: string; form: number }) => p.kind === 'form' && p.form > 10)).toBe(true);
  // nothing makes a gyroid in aluminium: she says so and places nothing
  expect(await sb(page, (s) => s.ego.ask('make a 60 mm aluminium cube filled with a gyroid lattice of 12 mm cells'))).toMatch(/won't place it/);
  expect(await sb(page, (s) => Object.keys(s.app.doc.parts).length)).toBe(2);
  // played, they rest on the floor rather than falling through it
  await sb(page, (s) => s.app.play());
  await frames(page, 90);
  const ys = await sb(page, (s) => Object.keys(s.app.doc.parts).map((id) => s.app.livePose(id).p[1]));
  for (const y of ys) expect(y).toBeGreaterThan(0);
  // and a saved build carries their genomes back
  const back = await sb(page, (s) => { const code = s.app.shareCode(); s.app.openShareCode(code); return Object.values(s.app.doc.parts).filter((p: any) => p.kind === 'form').length; });
  expect(back).toBe(2);
  expect(errors).toEqual([]);
});

test('anything asked means something: a frontier blueprint, a law\'s scale, and a want done as far as she can now', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  const boots = await sb(page, (s) => s.ego.ask('blueprint for gravity boots'));
  expect(boots).toMatch(/223\.6 m/);
  expect(boots).toMatch(/relabel|runs into a law/);
  expect(await sb(page, (s) => s.ego.ask('whats on your frontier'))).toMatch(/46 inventions/);
  expect(await sb(page, (s) => s.ego.ask('where does kinetic energy break down'))).toMatch(/special relativity/);
  // a zero-gravity cockpit with time slowed: done at once; what isn't built yet, said
  const pilot = await sb(page, (s) => s.ego.ask('give me a tutorial: a deep-space pilot sim-within-a-sim that drops me into a zero-gravity cockpit, slowing down time so I can practice orbital mechanics'));
  expect(pilot).toMatch(/turned gravity off/);
  expect(pilot).toMatch(/Still to build/);
  expect(await sb(page, (s) => s.app.doc.sim.gravity[1])).toBe(0);
  expect(await sb(page, (s) => s.app.settings.timeScale)).toBe(0.25);
  const beach = await sb(page, (s) => s.ego.ask('I just want to chill on a beach'));
  expect(beach).toMatch(/water to swim and float in/);
  expect(beach).toMatch(/ground of any kind/);
  expect(errors).toEqual([]);
});

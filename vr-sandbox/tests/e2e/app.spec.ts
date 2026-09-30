// The app in the headset (Meta's emulated Quest 3, IWER): building with the tools and the tablet, your own saved
// builds, and save codes. Physics scenes are opened the way a shared build opens (the app ships none).

import { test } from '@playwright/test';
import { boot, counts, enterVR, expect, frames, openScene, sb, tap, triggerAt } from './helpers';

test('my builds: nothing pre-made; save, open and delete your own from the tablet', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-builds');
  expect(await sb(page, (s) => s.app.library.list().length)).toBe(0);
  // build something: one block, then save it
  await tap(page, 'tab-tools');
  await tap(page, 'tool-place');
  await triggerAt(page, [0, 0, 0]);
  await frames(page, 4);
  await tap(page, 'tab-builds');
  await tap(page, 'save');
  await frames(page, 2);
  const saved: { id: string; name: string }[] = await sb(page, (s) => s.app.library.list().map((e: any) => ({ id: e.id, name: e.name })));
  expect(saved.map((e) => e.name)).toEqual(['Build 1']);
  // a new empty build, then open the saved one again
  await tap(page, 'new');
  await frames(page, 2);
  expect((await counts(page)).parts).toBe(0);
  await tap(page, `build-${saved[0]!.id}`);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(1);
  // it survives a reload: the library lives on the headset
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('loading') && (window as any).sandbox, null, { timeout: 60_000 });
  expect(await sb(page, (s) => s.app.library.list().map((e: any) => e.name))).toEqual(['Build 1']);
  await enterVR(page);
  // delete mode, then the build
  await tap(page, 'tab-builds');
  await tap(page, 'delmode');
  await tap(page, `build-${saved[0]!.id}`);
  await frames(page, 2);
  expect(await sb(page, (s) => s.app.library.list().length)).toBe(0);
  expect(errors).toEqual([]);
});

test('place, stack, join, undo and redo in the headset', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  // Place tool: the trigger on the floor, then on top of the first block
  await tap(page, 'tab-tools');
  await tap(page, 'tool-place');
  await triggerAt(page, [0, 0, 0]);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(1);
  await triggerAt(page, [0, 0.1, 0]);
  await frames(page, 4);
  expect((await counts(page)).parts).toBe(2);
  const heights = await sb(page, (s) => Object.values(s.app.doc.parts).map((p: any) => p.pose.p[1]).sort());
  expect(heights[1]).toBeGreaterThan(0.12); // the second block sits on the first
  // Join tool (Best join by default): the front face of the lower block, then of the upper one. Two wooden blocks
  // are screwed, with screws long enough to pass the first 100 mm block and bite well into the second
  await tap(page, 'tool-join');
  await triggerAt(page, [0, 0.05, 0.05]);
  await triggerAt(page, [0, 0.15, 0.05]);
  await frames(page, 4);
  expect((await counts(page)).conns).toBe(1);
  const joint = await sb(page, (s) => { const c = Object.values(s.app.doc.connections)[0] as any; return { kind: c.kind, length: c.params.length }; });
  expect(joint.kind).toBe('screwed');
  expect(joint.length).toBeGreaterThan(0.13);
  // undo and redo the joint from the tablet
  await tap(page, 'tab-world');
  await tap(page, 'undo');
  await frames(page, 2);
  expect((await counts(page)).conns).toBe(0);
  await tap(page, 'redo');
  await frames(page, 2);
  expect((await counts(page)).conns).toBe(1);
  // joined, the two blocks are one piece: selecting the top block selects both
  await tap(page, 'tab-tools');
  await tap(page, 'tool-grab');
  await triggerAt(page, [0, 0.15, 0.05]);
  expect(await sb(page, (s) => s.app.selection.parts.size)).toBe(2);
  // delete just the top one from the tablet: its joint goes too
  await tap(page, 'tab-selected');
  await tap(page, 'del-one');
  await frames(page, 2);
  expect(await counts(page)).toEqual({ parts: 1, conns: 0 });
  expect(errors).toEqual([]);
});

test('a parameter stepped on the tablet changes the part', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-tools');
  await tap(page, 'tool-place');
  await triggerAt(page, [0, 0, 0]);
  await frames(page, 3);
  const before = await sb(page, (s) => (Object.values(s.app.doc.parts)[0] as any).params.x);
  await tap(page, 'tab-selected');
  await tap(page, 'pp-x+');
  await frames(page, 3);
  const after = await sb(page, (s) => (Object.values(s.app.doc.parts)[0] as any).params.x);
  // one step up: 10 % (25 % on a logarithmic parameter)
  expect([1.1, 1.25].some((f) => Math.abs(after / before - f) < 1e-9)).toBe(true);
  expect(errors).toEqual([]);
});

test('build mode: a part lifted by hand snaps to the grid and stays; Play drops it; Back to build restores it', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await tap(page, 'tab-tools');
  await tap(page, 'tool-place');
  await triggerAt(page, [0, 0, 0]);
  await frames(page, 4);
  await tap(page, 'build');
  await tap(page, 'tool-grab');
  // grab the block with the trigger, raise the aim, let go
  await page.evaluate(async () => {
    const w = window as any;
    w.iwer.controllers.left.position.set(-0.45, 0.5, 0.25);
    await w.frames(6);
    w.aim('right', [0.15, 1.15, -0.1], w.vec([0, 0.05, 0.05]));
    await w.frames(4);
    w.iwer.controllers.right.updateButtonValue('trigger', 1);
    await w.frames(6);
    for (let k = 1; k <= 10; k++) { w.aim('right', [0.15, 1.15, -0.1], w.vec([0, 0.05 + 0.05 * k, 0.05])); await w.frames(3); }
    await w.frames(10);
    w.iwer.controllers.right.updateButtonValue('trigger', 0);
    await w.frames(10);
  });
  const built = await sb(page, (s) => { const p = Object.values(s.app.doc.parts)[0] as any; return { p: p.pose.p, build: s.app.settings.build }; });
  expect(built.build).toBe(true);
  expect(built.p[1]).toBeGreaterThan(0.25); // lifted, and held there
  for (const x of built.p) expect(Math.abs(x / 0.01 - Math.round(x / 0.01))).toBeLessThan(1e-6); // on the 1 cm grid
  await frames(page, 30);
  const still = await sb(page, (s) => s.app.live.latest(Object.keys(s.app.doc.parts)[0]).p[1]);
  expect(Math.abs(still - built.p[1])).toBeLessThan(1e-4); // it does not fall while building
  // Play: real physics, it falls
  await tap(page, 'play');
  await page.waitForFunction(() => { const s = (window as any).sandbox; return s.app.live.latest(Object.keys(s.app.doc.parts)[0]).p[1] < 0.1; }, null, { timeout: 20_000 });
  // Back to build: where it was
  await tap(page, 'stop');
  await frames(page, 6);
  const back = await sb(page, (s) => s.app.live.latest(Object.keys(s.app.doc.parts)[0]).p);
  expect(Math.hypot(back[0] - built.p[0], back[1] - built.p[1], back[2] - built.p[2])).toBeLessThan(1e-3);
  expect(errors).toEqual([]);
});

test('messages show in the headset, then fade', async ({ page }) => {
  await page.setViewportSize({ width: 800, height: 450 });
  const errors = await boot(page, '?iwer');
  await enterVR(page);
  await sb(page, (s) => s.app.toast('A joint gave way: 4.2 kN in shear against 3.9 kN', 'break'));
  await frames(page, 3);
  expect(await sb(page, (s) => s.xr.hud.mesh.visible)).toBe(true);
  // a message stays five seconds, then the panel clears
  await page.waitForFunction(() => !(window as any).sandbox.xr.hud.mesh.visible, null, { timeout: 20_000 });
  expect(errors).toEqual([]);
});

test('save and share codes reconstruct the build byte for byte', async ({ page }) => {
  await boot(page);
  await openScene(page, 'magnets');
  const same = await sb(page, (s) => {
    const before = s.app.saveText();
    const code = s.app.shareCode();
    s.app.openShareCode(code);
    return { same: s.app.saveText() === before, prefix: code.slice(0, 6) };
  });
  expect(same).toEqual({ same: true, prefix: 'VRSB1.' });
});

test('catapult: erasing the latch wire throws the projectile', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 }); // software rendering: smaller is faster
  await boot(page);
  await openScene(page, 'catapult');
  const start = await sb(page, (s) => {
    const rope = Object.values(s.app.doc.connections).find((c: any) => c.kind === 'rope') as any;
    s.app.store.transact('Erase latch', (tx: any) => tx.delete('connections', rope.id));
    const ball = Object.values(s.app.doc.parts).find((p: any) => p.name === 'Projectile') as any;
    return { id: ball.id, x: ball.pose.p[0] };
  });
  await page.waitForFunction((b) => {
    const p = (window as any).sandbox.app.live.latest(b.id);
    return p && Math.abs(p.p[0] - b.x) > 0.5;
  }, start, { timeout: 90_000 });
});

test('every physics test scene runs in the app without errors or spurious failures', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  for (const id of ['newtons-cradle', 'catapult', 'shelf', 'magnets', 'spring-launcher', 'raft', 'go-kart']) {
    await openScene(page, id);
    await frames(page, 30);
    const broken = await sb(page, (s) => Object.values(s.app.doc.connections).filter((c: any) => c.state.status === 'broken').length);
    expect(broken, id).toBe(0);
  }
  expect(errors).toEqual([]);
});

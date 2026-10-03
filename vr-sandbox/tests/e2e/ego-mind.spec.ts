// Ego's Mind in the headset (src/mind): a design of hers goes on her stand, a world of its own in the physics worker;
// the result opens an investigation that persists as a journal in the browser's IndexedDB, commit by commit. The page
// is reloaded in the middle of it; at boot the one rule resumes it from the journal to the end. Then what she says
// about her own work is read off that journal, never a line kept for it.

import { test, expect } from '@playwright/test';
import { boot, sb } from './helpers';

const kinds = (cs: { kind: string; status: string }[]) => cs.map((c) => `${c.kind}:${c.status}`);

test('a design tested on her stand opens an investigation that survives a reload and resumes to rest; she answers what she was working on and what changed from the journal', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 400 });
  const errors = await boot(page);
  await page.waitForFunction(() => (window as any).sandbox.mind, null, { timeout: 20_000 });
  const session1 = await sb(page, (s) => s.mind.session);
  // nothing yet: she rests, and says so from an empty journal
  expect(await sb(page, (s) => s.ego.ask('what were you working on'))).toMatch(/^Nothing yet/);
  // a design: built in the world, and put on the stand beside it
  const reply = await sb(page, (s) => s.ego.ask('build a table that holds 60 kg'));
  expect(reply).toMatch(/Every joint will carry its load with margin\. I'm testing it on my stand now\./);
  // wait until a hypothesis exists and its test has been asked for, then close the page on it. The stand is fast (two
  // runs of a table take well under a second), so the page may be closed while the test is in flight, or the loop may
  // already have rested; in the second case the crash is modelled exactly: the journal is append-only, so a crash at
  // the hypothesis leaves precisely its prefix, and the test leaves that prefix in the browser's store before reloading
  await page.waitForFunction(() => (window as any).sandbox.mind.journal.commits.some((c: any) => c.kind === 'hypothesis'), null, { timeout: 60_000 });
  let before = await sb(page, (s) => s.mind.journal.commits.map((c: any) => ({ seq: c.seq, kind: c.kind, status: c.status, session: c.session })));
  const inFlight = !before.some((c: any) => c.status === 'resolved');
  if (!inFlight) {
    const hyp = before.find((c: any) => c.kind === 'hypothesis')!.seq;
    await page.evaluate((keep) => new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('vrsb.mind', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { const tx = req.result.transaction('commits', 'readwrite'); tx.objectStore('commits').delete(IDBKeyRange.lowerBound(keep, true)); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); };
    }), hyp);
    before = before.filter((c: any) => c.seq <= hyp);
  }
  const cutAt = before.length;
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('loading') && (window as any).sandbox?.mind, null, { timeout: 60_000 });
  const session2 = await sb(page, (s) => s.mind.session);
  expect(session2).not.toBe(session1);
  // what was in the journal before the reload is what is read back, and the rule carries on from it
  await page.waitForFunction(() => { const m = (window as any).sandbox.mind; return !m.active && m.unresolved().length === 0 && m.journal.commits.some((c: any) => c.status === 'resolved'); }, null, { timeout: 90_000 });
  const after = await sb(page, (s) => s.mind.journal.commits.map((c: any) => ({ seq: c.seq, kind: c.kind, status: c.status, session: c.session, parents: c.parents, physics: c.physics })));
  expect(kinds(after.slice(0, cutAt))).toEqual(kinds(before));
  expect(after.slice(0, cutAt).every((c: any) => c.session === session1)).toBe(true);
  expect(after.slice(cutAt).length).toBeGreaterThan(0);
  expect(after.slice(cutAt).every((c: any) => c.session === session2)).toBe(true);
  expect(kinds(after)).toEqual(['observation:open', 'anomaly:open', 'hypothesis:testing', 'evidence:open', 'belief:open', 'question:testing', 'evidence:open', 'belief:resolved']);
  for (let i = 1; i < after.length; i++) expect(after[i].parents).toContain(after[i - 1].seq);
  expect(new Set(after.map((c: any) => c.physics)).size).toBe(1);
  // the steps taken in this session, with their cost; nothing scheduled afterwards
  const steps = await sb(page, (s) => ({ steps: s.mind.steps, stands: s.mind.stands, writes: s.mind.journal.writes, active: s.mind.active }));
  expect(steps.active).toBe(false);
  expect(steps.steps.map((x: any) => x.did)).toEqual(kinds(after.slice(cutAt)).map((k) => k.startsWith('evidence') ? 'test' : k.startsWith('belief') ? 'judge' : k.startsWith('question') ? 'question' : k.split(':')[0]));
  expect(steps.writes).toBe(after.length - cutAt);
  console.log(`cut ${inFlight ? 'in flight' : 'by a modelled crash'} after ${cutAt} commits (${before.map((c: any) => c.kind).join(', ')}); resumed: ${steps.steps.map((x: any) => `${x.did} ${x.ms.toFixed(0)} ms`).join(', ')}; stands ${steps.stands.runs} runs, ${steps.stands.seconds.toFixed(1)} s simulated, ${steps.stands.ms.toFixed(0)} ms wall`);
  // what she says is read off the journal
  const working = await sb(page, (s) => s.ego.ask('what were you working on'));
  expect(working).toMatch(/I was testing a table for 60 kg \(investigation table-\w+, 8 commits over 2 sessions\)/);
  expect(working).toMatch(/What I believe: a sideways push bends the leg joints .*\(confirmed: true\)/);
  expect(working).toMatch(/Resolved: a table for 60 kg with aprons .* is proven at 90 kg\. Nothing left to do; I am idle\./);
  expect(working).toMatch(/In Nex: constrain\(table-\w+:design, 90\[kg\]\)/);
  const changed = await sb(page, (s) => s.ego.ask('what changed'));
  expect(changed).toMatch(/^Resolved: a table for 60 kg with aprons .* holds 90 kg\. Test performed: .* at 90 kg \(1.5x, the proof load\): it held/);
  expect(changed).toMatch(/went from unmeasured to true/);
  expect(changed).toMatch(/Still uncertain: this is simulation evidence only, 1 run, never measured on a real piece/);
  // a request she cannot read is kept, not run as Forge; Forge still runs as Forge
  const unknown = await sb(page, (s) => s.ego.ask('please dance for me'));
  expect(unknown).toMatch(/^Unknown request: I can't read “please dance for me”/);
  expect(await sb(page, (s) => s.ego.ask('place block x=10cm y=10cm z=10cm at 2 0.05 2 as b1'))).toMatch(/b1|placed|block/i);
  await page.waitForFunction(() => (window as any).sandbox.mind.journal.commits.some((c: any) => c.kind === 'request'), null, { timeout: 10_000 });
  expect(await sb(page, (s) => s.mind.journal.commits.filter((c: any) => c.kind === 'request').map((c: any) => c.data.text))).toEqual(['please dance for me']);
  expect(errors).toEqual([]);
});

import { test, expect } from '@playwright/test';
import { boot, sb } from './helpers';

// Ego answers a scale question and a traversal question in the running app, with the numbers derived there.
test('Ego answers scale and traversal questions in the app from her ganglia', async ({ page }) => {
  const errors = await boot(page);
  const pendulum = await sb(page, (s) => s.ego.ask('is the pendulum period scale invariant'));
  expect(pendulum).toMatch(/Pendulum period/);
  expect(pendulum).toMatch(/scale-dependent under same material, same clock/);
  expect(pendulum).toMatch(/covariant under Froude similarity/);
  expect(pendulum).toMatch(/×3\.162/); // √10 at λ = 10, from the law's own example
  const smaller = await sb(page, (s) => s.ego.ask('what changes if I make it ten times smaller'));
  expect(smaller).toMatch(/mass ×0\.001/);
  expect(smaller).toMatch(/square-cube/);
  const energy = await sb(page, (s) => s.ego.ask('show me every way to store energy'));
  expect(energy).toMatch(/\d+ mechanisms store energy/);
  expect(energy).toMatch(/in biology/);
  const motors = await sb(page, (s) => s.ego.ask('every mechanism that converts electrical energy into mechanical motion'));
  expect(motors).toMatch(/In biology: .*(flagellar|ATP synthase)/);
  expect(motors).toMatch(/In stock here: .*(servo|motor)/i);
  const makers = await sb(page, (s) => s.ego.ask('what makes the machines that make an electric motor'));
  expect(makers).toMatch(/closes on itself/);
  // and her knowledge answer carries the substrate's census
  const fails = await sb(page, (s) => s.ego.ask('how does a bearing fail'));
  expect(fails).toMatch(/fails by \d+ ways of its own/);
  // what she remembers answers first (a law, a principle); when nothing is remembered by that name, her index answers instead of "I don't know anything about"
  const about = await sb(page, (s) => s.ego.ask('tell me about a nephron'));
  expect(about).toMatch(/^nephron: /);
  const does = await sb(page, (s) => s.ego.ask('what does a rudder do'));
  expect(does).toMatch(/^A rudder does one thing: steer/);
  const madeOf = await sb(page, (s) => s.ego.ask('what is a connecting rod made of'));
  expect(madeOf).toMatch(/typically made of Steel AISI 4140/);
  const dense = await sb(page, (s) => s.ego.ask('what is the density of steel'));
  expect(dense).toMatch(/7850 kg\/m\^3/);
  const knows = await sb(page, (s) => s.ego.ask('how much do you know'));
  expect(knows).toMatch(/substrate of \d+ things joined by \d+ arrows/);
  expect(errors).toEqual([]);
});

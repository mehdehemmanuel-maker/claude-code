// What a world does not account for. `Runtime.gaps()` reports evaluations that could not finish; none of its gaps
// can report a phenomenon that was never represented, because an absent law raises no gap — it raises nothing, runs
// clean, and looks finished. These tests are the proof that the three findings fire on a world built on purpose to
// have each one.
import { describe, expect, it } from 'vitest';
import { Runtime } from '../../src/nexus/substrate/runtime';
import { represents, unaccounted, unaccountedLines, wouldBind } from '../../src/nexus/substrate/holes';
import { GRAVITY, gravityAxis, placeAt } from '../../src/nexus/substrate/place';
import { address } from '../../src/nexus/substrate/journal';
import { div, k, leaf, mul, variable } from '../../src/nexus/lang/term';
import { law } from '../../src/nexus/lang/law';

const given = (v: number, unit: string, why: string) => leaf(why, v, unit, { class: 'configuration', source: why });

/** A steel block in a domain with gravity: a place, its density, and the relations its geometry implies. */
function block(id = 'block', half: [number, number, number] = [0.05, 0.05, 0.05]) {
  const rt = Runtime.open();
  rt.admit({ kind: 'leaf', at: GRAVITY, leaf: given(9.80665, 'm/s^2', 'standard gravity') });
  for (const j of [0, 1, 2]) rt.admit({ kind: 'leaf', at: gravityAxis(j), leaf: given(j === 1 ? -1 : 0, '1', 'gravity points down the second axis') });
  const spec = {
    id, centre: [0, 0, 0].map((v) => given(v, 'm', 'at the origin')) as [never, never, never],
    turn: [0, 0, 0, 1].map((v) => given(v, '1', 'not turned')) as [never, never, never, never],
    half: half.map((v) => given(v, 'm', 'as cut')) as [never, never, never],
  };
  // Admitting the place is enough: the Runtime generates its leaves AND the relations its geometry implies
  // (runtime.ts:294) — which is the architecture working. Admitting placeRelations() again is a duplicate, and
  // the store says so by name rather than silently keeping two.
  rt.admit({ kind: 'place', ...spec });
  rt.admit({ kind: 'leaf', at: placeAt.density(id), leaf: given(7850, 'kg/m^3', 'mild steel, ASM') });
  return rt;
}

describe('what a world does not account for', () => {
  it('a place with its matter derives its own mass and weight, with nobody enabling gravity', () => {
    const rt = block();
    // 0.1 m cube of steel: 0.001 m^3 at 7850 kg/m^3 = 7.85 kg, weighing 76.98 N
    expect(rt.binding(placeAt.volume('block'))!.value).toBeCloseTo(1e-3, 9);
    expect(rt.binding(placeAt.mass('block'))!.value).toBeCloseTo(7.85, 6);
    expect(rt.binding(placeAt.weight('block'))!.value).toBeCloseTo(7.85 * 9.80665, 5);
    // THE POINT: nothing in the lines above switched gravity on. The weight exists because the kept WEIGHT law's
    // ports bound to this place's mass and the domain's gravity, which is what "a consequence, not a feature" means.
  });

  it('names a hole: something reads an address nothing can produce', () => {
    const rt = block();
    const nowhere = address('block', 'the temperature of the room it is in');
    rt.admit({ kind: 'relation', id: 'wants-a-temperature', out: address('block', 'something'), name: 'something', unit: 'K',
      term: mul(variable('T', 'K', 'a temperature'), k(1)), ports: { T: nowhere }, law: 'a test' });
    const u = unaccounted(rt, { unapplied: false });
    const hole = u.findings.find((f) => f.kind === 'hole' && f.at === nowhere);
    expect(hole, 'the hole must be named').toBeTruthy();
    expect(hole!.says).toMatch(/nothing produces/);
    expect(hole!.kind === 'hole' && hole!.wantedBy[0]!.id).toBe('wants-a-temperature');
  });

  it('names a dead end: the world works a number out and drops it — the friction-heat fault, as a finding', () => {
    const rt = block();
    // exactly the shape of the fault in parts/drive.ts: a power is computed and nothing consumes it
    const lost = address('block', 'power lost to friction');
    rt.admit({ kind: 'leaf', at: address('block', 'torque'), leaf: given(0.3, 'N m', 'what the motor makes') });
    rt.admit({ kind: 'leaf', at: address('block', 'angular velocity'), leaf: given(760, 'rad/s', 'where it settled') });
    rt.admit({ kind: 'relation', id: 'friction-loss', out: lost, name: 'power lost to friction', unit: 'W',
      term: mul(mul(variable('T', 'N m', 'torque'), variable('w', 'rad/s', 'angular velocity')), k(0.02)),
      ports: { T: address('block', 'torque'), w: address('block', 'angular velocity') }, law: 'a test' });

    const u = unaccounted(rt, { unapplied: false });
    const dead = u.findings.find((f) => f.kind === 'dead end' && f.at === lost);
    expect(dead, 'a watt that nothing reads must be named').toBeTruthy();
    expect(dead!.kind === 'dead end' && dead!.asked).toBe(false);
    expect(dead!.says).toMatch(/computes this and drops it/);

    // and when it IS consumed — the heat going somewhere — the finding goes away
    const rise = address('block', 'temperature rise');
    rt.admit({ kind: 'relation', id: 'heats-it', out: rise, name: 'temperature rise', unit: 'K',
      term: mul(variable('P', 'W', 'power lost to friction'), given(0.5, 'K/W', 'a thermal resistance')),
      ports: { P: lost }, law: 'a test' });
    const after = unaccounted(rt, { unapplied: false });
    expect(after.findings.some((f) => f.kind === 'dead end' && f.at === lost && !f.asked)).toBe(false);
    expect(rt.binding(rise)!.value).toBeCloseTo(0.3 * 760 * 0.02 * 0.5, 6);
  });

  it('an answer somebody asked for is read by nothing and is not a fault', () => {
    const rt = block();
    // the weight is NOT a dead end: the load-bearing relation reads it, which is the architecture working
    const plain = unaccounted(rt, { unapplied: false });
    expect(plain.findings.some((f) => f.kind === 'dead end' && f.at === placeAt.weight('block'))).toBe(false);
    // a section area IS one, and marking it asked turns the fault into an answer
    const area = placeAt.sectionArea('block', 1);
    expect(plain.findings.some((f) => f.kind === 'dead end' && f.at === area && !f.asked)).toBe(true);
    const asked = unaccounted(rt, { unapplied: false, asked: { addresses: [area] } });
    const w = asked.findings.find((f) => f.kind === 'dead end' && f.at === area)!;
    expect(w.kind === 'dead end' && w.asked).toBe(true);
    expect(w.says).toMatch(/which is what an answer is/);
  });

  // THE FIRST REAL RUN, locked in. Both of these are findings about the substrate as it stands, not about the
  // test's own scaffolding, and both are the kind nothing in `gaps()` reports because no evaluation failed.
  it('a lone place in a domain with gravity has nothing holding it up, and says so', () => {
    const rt = block();
    const u = unaccounted(rt, { unapplied: false });
    const bears = u.findings.find((f) => f.kind === 'hole' && /what bears it/.test(f.at));
    expect(bears, 'the world asks what bears this place and nothing can answer').toBeTruthy();
    // and the answer arrives the moment something outside the domain is said to hold it
    rt.admit({ kind: 'held', place: 'block', by: 'the floor, measured' });
    expect(unaccounted(rt, { unapplied: false }).findings.some((f) => f.kind === 'hole' && /what bears it/.test(f.at))).toBe(false);
  });

  it("a place's stiffness is worked out and dropped until something bends it", () => {
    const u = unaccounted(block(), { unapplied: false });
    const dropped = u.findings.flatMap((f) => (f.kind === 'dead end' && !f.asked ? [f.at] : []));
    // the section areas, second moments and moduli: generated for every place, read by nothing on its own
    expect(dropped.filter((a) => /area of its section/.test(a))).toHaveLength(3);
    expect(dropped.some((a) => /second moment/.test(a))).toBe(true);
    expect(dropped.some((a) => /modulus of its section/.test(a))).toBe(true);
    // not a fault to fix by deleting them: they are what a coupling reads once a place carries a load. The point
    // is that the world says which of its own numbers are going nowhere, instead of leaving it to be noticed.
    expect(dropped.length).toBeGreaterThan(5);
  });

  it('names a law it has the inputs for and never applies — the finding no reading of the code gives', () => {
    const rt = block();
    // A law over a mass and a volume. Both are in this world AND both ports are NAMED what the addresses are
    // named, which the tightened binding requires: the first version of this test asked for "a length", and the
    // rule rightly refused it, because nothing in the world is called a length — they are called "half-extent
    // along its axis 1" and "centre x". Dimension alone would have bound it; a shared word will not, and that is
    // the whole point of the tightening.
    const idle = law({
      id: 'test.idle', name: 'A law with nothing to do', statement: 'a mass over a volume, for the sake of the test',
      formula: 'm / V', inputs: [{ sym: 'm', unit: 'kg', name: 'a mass' }, { sym: 'V', unit: 'm^3', name: 'a volume' }],
      output: { sym: 'X', unit: 'kg/m^3', name: 'the quotient' },
      term: div(variable('m', 'kg', 'a mass'), variable('V', 'm^3', 'a volume')), domain: [],
      source: { cite: 'this test', kind: 'declaration' },
    });
    const u = unaccounted(rt, { laws: [idle] });
    const un = u.findings.find((f) => f.kind === 'unapplied' && f.law === 'test.idle');
    expect(un, 'a law whose every input is here, by name as well as dimension, must be named').toBeTruthy();
    expect(un!.says).toMatch(/would run here/);
    expect(un!.kind === 'unapplied' && Object.keys(un!.binds).sort()).toEqual(['V', 'm']);
    expect(un!.kind === 'unapplied' && un!.binds).toMatchObject({ m: placeAt.mass('block'), V: placeAt.volume('block') });

    // and a law wanting a dimension this world HAS but under no matching name is refused, which is the tightening
    const unnamed = law({
      id: 'test.length', name: 'A law wanting a length', statement: 'nothing here is called a length',
      formula: 'L', inputs: [{ sym: 'L', unit: 'm', name: 'a length' }], output: { sym: 'Y', unit: 'm', name: 'it' },
      term: mul(variable('L', 'm', 'a length'), k(1)), domain: [], source: { cite: 'this test', kind: 'declaration' },
    });
    expect(represents(rt, 'm'), 'the world does have lengths').toBe(true);
    expect(unaccounted(rt, { laws: [unnamed] }).findings.some((f) => f.kind === 'unapplied')).toBe(false);

    // and a law needing something this world has no address for at all is NOT named: it cannot run, so it is not
    // a thing the world is neglecting — it is a thing the world has not been given. The two are different findings.
    const needsCharge = law({
      id: 'test.charge', name: 'A law needing a charge', statement: 'needs a coulomb, which this world has none of',
      formula: 'Q', inputs: [{ sym: 'Q', unit: 'C', name: 'a charge' }], output: { sym: 'Y', unit: 'C', name: 'it' },
      term: mul(variable('Q', 'C', 'a charge'), k(1)), domain: [], source: { cite: 'this test', kind: 'declaration' },
    });
    expect(unaccounted(rt, { laws: [needsCharge] }).findings.some((f) => f.kind === 'unapplied')).toBe(false);
    expect(wouldBind(rt, needsCharge, rt.mentioned())).toBeNull();
  });

  it('says plainly whether a phenomenon is represented here at all', () => {
    const rt = block();
    expect(represents(rt, 'kg')).toBe(true);
    expect(represents(rt, 'm^3')).toBe(true);
    expect(represents(rt, 'N')).toBe(true);
    // no address in this world carries a temperature or a charge, so no law about either can bind: the honest
    // answer to "does this world do heat?" is no, and it is a question rather than an assumption
    expect(represents(rt, 'K')).toBe(false);
    expect(represents(rt, 'C')).toBe(false);
  });

  it('reads out worst first: a hole before a dead end before an unapplied law', () => {
    const rt = block();
    const lines = unaccountedLines(unaccounted(rt, { unapplied: false }));
    expect(lines[0]).toMatch(/addresses over \d+ relations/);
    const text = lines.join('\n');
    expect(text.indexOf('HOLE')).toBeGreaterThan(-1);
    expect(text.indexOf('HOLE')).toBeLessThan(text.indexOf('DEAD END'));
    // held, and with its own numbers claimed as answers, it has nothing left to report
    rt.admit({ kind: 'held', place: 'block', by: 'the floor, measured' });
    const clear = unaccountedLines(unaccounted(rt, { unapplied: false, asked: { matches: /./ } }));
    expect(clear.join('\n')).toMatch(/Nothing is read that cannot be got/);
  });

  it('the real book, over a real world: whatever it names, it names with the ports it would use', () => {
    const rt = block();
    const u = unaccounted(rt);
    const un = u.findings.filter((f) => f.kind === 'unapplied');
    expect(un.length, 'a world with mass, volume and weight in it can run something from a 252-law book').toBeGreaterThan(0);
    for (const f of un) {
      if (f.kind !== 'unapplied') continue;
      expect(Object.keys(f.binds).length, `${f.law} must name a port for every input`).toBeGreaterThan(0);
      for (const a of Object.values(f.binds)) expect(rt.mentioned(), `${f.law} bound ${a}, which is not in this world`).toContain(a);
    }
  });
});

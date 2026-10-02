// Growing machines, and the hard challenges that find where the growing breaks. A genome of a few numbers grows a
// whole body, every organ there because something needed it; every level is checked; and a set of challenges far
// beyond what is built so far (a computer, a symbiote, a scientist, a language, a new geometry, flight) is attempted
// with all of it, each need reaching as far as it honestly can. These pin where each challenge stands, so that fixing
// a gap moves the result and the test with it.

import { describe, expect, it } from 'vitest';
import { grow, develop, conceive, attempt, CHALLENGES, challengeById, compression, genomeKey, lawById, LEVELS, DEVELOPMENT, flowOfWord, FLOW_WORDS } from '../../src/ganglia';
import { principleById } from '../../src/ganglia/principles';
import { archetypeById } from '../../src/ganglia/blocks';
import { interpret } from '../../src/assistant/intent';

const KART = { mass: 120, wheelRadius: 0.125, speed: 3, accel: 0.7, motors: 2 };
const kart = () => grow({ from: 'electric', to: 'travel', spec: KART });

describe('grow: a genome develops into a whole machine', () => {
  it('every development rule names blocks and a principle that exist', () => {
    for (const r of DEVELOPMENT) {
      expect(archetypeById(r.from), r.from).toBeDefined();
      expect(archetypeById(r.needs), r.needs).toBeDefined();
      expect(principleById(r.principle), r.principle).toBeDefined();
    }
    expect(LEVELS.map((l) => l.like)).toEqual(['molecule', 'cell', 'tissue', 'organ', 'organ system', 'organism']);
  });

  it('a motor, a gearhead and a wheel grow everything they can\'t work without, each saying why', () => {
    const c = conceive('electric', 'travel').find((x) => x.ways.map((w) => w.id).join('>') === 'motor.rotary>gear.reduce>wheel')!;
    const organs = develop(c);
    const by = (role: string) => organs.find((o) => o.role === role)!;
    expect(organs.map((o) => o.role)).toEqual(expect.arrayContaining(['motor', 'gearhead', 'wheel', 'controller', 'energy store', 'fuse', 'wiring', 'battery tray', 'torque arm', 'axle', 'bearings', 'coupling', 'frame']));
    expect(by('controller').because).toEqual({ principle: 'current-limit-motors', by: 'motor' });
    expect(by('fuse').because).toEqual({ principle: 'fuse-at-source', by: 'energy-store' });
    expect(by('axle').because).toEqual({ principle: 'gearhead-takes-torque-not-load', by: 'wheel' });
    expect(by('bearings').because).toEqual({ principle: 'bearing-near-load', by: 'axle' });
    // held by its torque arm, the gearmotor needs no mount of its own
    expect(organs.some((o) => o.role === 'motor mount')).toBe(false);
  });

  it('the kart grows from five numbers: real parts, every connection holding, the fittest of the buildable ways', () => {
    const g = kart();
    const b = g.best!;
    expect(b.concept.ways.map((w) => w.id).join('>')).toBe('motor.rotary>gear.reduce>wheel');
    expect(b.fitness.errors).toBe(0);
    const item = (role: string) => b.organs.find((o) => o.role === role)!.item;
    expect(item('motor')).toBe('motor.dc.coreless.d40-150w-24v');
    expect(item('fuse')).toBe('fuse.blade-ato.30a');
    expect(item('bearings')).toBe('bearing.unit.ucp205');
    expect(b.organs.find((o) => o.role === 'axle')!.made).toMatchObject({ shape: 'rod.round', size: 'Ø25 mm' });
    // direct drive was grown too, and lost: no catalogued motor turns a 0.25 m wheel slowly enough without gearing
    expect(g.others.some((o) => o.concept.ways.map((w) => w.id).join('>') === 'motor.rotary>wheel' && o.fitness.errors > 0)).toBe(true);
    // and the ways it can't build yet are kept, with what they lack
    expect(g.possible.some((p) => p.missing.includes('propeller'))).toBe(true);
  });

  it('its immune check finds what isn\'t real yet: the rubber wheel nothing here makes or sells, the frame nobody sized', () => {
    const b = kart().best!;
    expect(b.findings.find((f) => f.organ === 'wheel')).toMatchObject({ level: 'gap', rule: 'R11' });
    expect(b.findings.some((f) => f.organ === 'frame' && /not sized/.test(f.message))).toBe(true);
    expect(b.findings.filter((f) => f.level === 'warning').map((f) => f.principle)).toEqual(['derate-for-heat']);
  });

  it('is put together frame first and fused last, so nothing is live while it is built', () => {
    const order = kart().best!.order.map((o) => o.organ);
    expect(order[0]).toBe('frame');
    expect(order.at(-1)).toBe('fuse');
    expect(order.indexOf('bearings')).toBeLessThan(order.indexOf('axle'));
    expect(order.indexOf('axle')).toBeLessThan(order.indexOf('wheel'));
  });

  it('the same genome grows the same body at once, in any order of its numbers', () => {
    const a = grow({ from: 'electric', to: 'travel', spec: { speed: 3, mass: 120, motors: 2, accel: 0.7, wheelRadius: 0.125 } });
    expect(a).toBe(kart());
    expect(genomeKey({ from: 'electric', to: 'travel', spec: KART })).toBe(genomeKey({ from: 'electric', to: 'travel', spec: { motors: 2, speed: 3, mass: 120, accel: 0.7, wheelRadius: 0.125 } }));
    const c = compression(kart().best!);
    expect(c.ratio).toBeGreaterThan(20);
  });
});

describe('challenges: hard jobs that find where it breaks', () => {
  const at = (id: string) => attempt(challengeById(id)!);
  const level = (id: string, does: string) => at(id).results.find((r) => r.need.does === does)!.level;

  it('every challenge says what physics allows, and every law it is bounded by exists', () => {
    for (const c of CHALLENGES) {
      expect(c.frame.length, c.id).toBeGreaterThan(40);
      const a = attempt(c);
      for (const n of a.notes) if (n.law) expect(lawById(n.law), `${c.id} ${n.law}`).toBeDefined();
      expect(a.notes.some((n) => /^I have no law/.test(n.says)), c.id).toBe(false);
    }
  });

  it('a computer: bits and gates of levers she can build in her world; the electric kind and a display not yet', () => {
    expect(level('computer', 'hold one bit')).toBe('partial');
    expect(level('computer', 'let one bit switch another (a logic gate)')).toBe('partial');
    expect(level('computer', 'take a question from a hand: a key pressed')).toBe('partial');
    expect(level('computer', 'run on electric power')).toBe('unbuildable');
    expect(level('computer', 'show its answer')).toBe('unbuildable');
    // the price of a mechanical bit against Landauer's floor
    const n = at('computer').notes.find((x) => x.law === 'landauer')!;
    expect(n.value).toBeCloseTo(1.380649e-23 * 300 * Math.LN2, 30);
  });

  it('a symbiote: it must take from outside, as every real one does; growing and healing is past her language', () => {
    expect(level('symbiote', 'take its energy from the sun, as a leaf does')).toBe('unbuildable');
    expect(level('symbiote', 'carry its host')).toBe('partial');
    expect(level('symbiote', 'heal and grow itself')).toBe('unsayable');
    expect(at('symbiote').notes.find((x) => x.law === 'carnot')!.value).toBeCloseTo(1 - 300 / 310, 12);
  });

  it('a scientist: she can predict; her senses and her own experiments are what is missing', () => {
    for (const d of ['sense a force', 'sense a temperature', 'sense a turn']) expect(level('scientist', d)).toBe('unbuildable');
    expect(at('scientist').toFix).toContain('Ego\'s test stand: predict, build, measure, compare, revise');
  });

  it('a language: hers is a genome, many times smaller than the body it grows, and bounded by Shannon', () => {
    const a = at('language');
    expect(a.worst).toBe('works');
    expect(a.notes.find((x) => x.law === 'information.choices')!.value).toBeGreaterThan(5);
  });

  it('a new geometry is still past what she can say: her language has function, not form', () => {
    expect(level('geometry', 'make a shape nobody has drawn')).toBe('unsayable');
    expect(level('flight', 'push on the air to fly')).toBe('unbuildable');
  });

  it('her language: every flow has words, and a word means one flow', () => {
    const seen = new Map<string, string>();
    for (const [f, ws] of Object.entries(FLOW_WORDS)) for (const w of ws) { expect(seen.get(w), w).toBeUndefined(); seen.set(w, f); }
    expect(flowOfWord('sunlight')).toBe('light');
    expect(flowOfWord('tissue')).toBeNull();
  });

  it('Ego takes them when asked, however it is said', () => {
    expect(interpret('challenge yourself')).toEqual({ do: 'challenge' });
    expect(interpret('try to build a computer')).toEqual({ do: 'challenge', which: 'computer' });
    expect(interpret('create a symbiote')).toEqual({ do: 'challenge', which: 'symbiote' });
    expect(interpret('build something that flies')).toEqual({ do: 'challenge', which: 'flight' });
    expect(interpret('grow a kart for 120 kg at 3 m/s')).toEqual({ do: 'grow', from: 'electric', to: 'travel', spec: { mass: 120, speed: 3 } });
    expect(interpret('what\'s inside a motor?')).toEqual({ do: 'inside', what: 'motor' });
    expect(interpret('break down the markforged fx10')).toEqual({ do: 'breakdown', what: 'markforged fx10' });
  });
});

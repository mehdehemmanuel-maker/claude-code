// What makes the forge alive: rules that start on what happens, the weather it reads, a robot that feels, moves as a
// machine moves and practises; and nodes that may be duplicated.

import { describe, expect, it } from 'vitest';
import { due, newRule, ROBOT_RULES, ruleSays, COOLDOWN, DEEPEST, type Rule } from '../../src/nexus/ask/rules';
import { feel, feeling, newMind, pass, expression, thought } from '../../src/nexus/world/emotions';
import { Servo, QServo, wheelSpeeds, pitchOf } from '../../src/nexus/substrate/motion';
import { bestOf, learn, lessons, newPractice, nextTry, trialOf, variants } from '../../src/nexus/teach/practice';
import { EDITS0, type PipeRun } from '../../src/nexus/substrate/pipe';
import { compass, readWeather, sayWeather, skyOf, weatherFacts, fetchWeather, findPlace } from '../../src/nexus/world/weather';
import { duplicateNode, freeName, edgesOf, nodesOf, type Board } from '../../src/nexus/substrate/boards';

describe('if this, then that', () => {
  it('a rule starts on its event, at most once a minute, and no deeper than three rules set off by rules', () => {
    const r = newRule('run-fails', 'rerun-seed'), rules = [r];
    expect(ruleSays(r)).toBe('IF a pipeline run fails THEN run the pipeline again, next seed');
    expect(due(rules, { kind: 'run', held: true }, {}, 0)).toEqual([]);
    expect(due(rules, { kind: 'run', held: false }, {}, 0)).toEqual([r]);
    expect(due(rules, { kind: 'run', held: false }, {}, COOLDOWN - 1)).toEqual([]);
    expect(due(rules, { kind: 'run', held: false }, {}, COOLDOWN + 1, DEEPEST)).toEqual([]);
    expect(due(rules, { kind: 'run', held: false }, {}, COOLDOWN + 1, DEEPEST - 1)).toEqual([r]);
    expect(r.fired).toBe(2);
  });
  it('a weather rule starts the moment its condition turns true, not again while it stays true', () => {
    const r = newRule('wind-over-30', 'say-weather'), rules = [r];
    expect(due(rules, { kind: 'weather' }, { wind: 20 }, 0)).toEqual([]);
    expect(due(rules, { kind: 'weather' }, { wind: 35 }, 1)).toEqual([r]);
    expect(due(rules, { kind: 'weather' }, { wind: 40 }, 2 * COOLDOWN)).toEqual([]);
    expect(due(rules, { kind: 'weather' }, { wind: 10 }, 3 * COOLDOWN)).toEqual([]);
    expect(due(rules, { kind: 'weather' }, { wind: 31 }, 4 * COOLDOWN)).toEqual([r]);
  });
  it('a rule turned off does nothing; the robot\'s own rules practise when it is bored', () => {
    const r: Rule = { ...newRule('every-10', 'next-test'), on: false };
    expect(due([r], { kind: 'tick', minutes: 10 }, {}, 0)).toEqual([]);
    const mine = ROBOT_RULES.map((x) => ({ ...x }));
    expect(due(mine, { kind: 'mood', label: 'bored' }, {}, 0).map((x) => x.then)).toEqual(['practice']);
  });
});

describe('a robot that feels', () => {
  it('feels what happens: a held run pleases it, two failures frustrate it, praise lifts it, and it says why', () => {
    const m = newMind(0);
    expect(feeling(m, 0)).toBe('content');
    expect(feel(m, 'success', 'the bracket held', 1000)).toBe('happy');
    feel(m, 'failure', 'the tower tipped', 2000); expect(feel(m, 'failure', 'the tower tipped again', 3000)).toBe('frustrated');
    expect(thought('frustrated', m)).toMatch(/2 failed in a row: the tower tipped again/);
    expect(feel(m, 'praise', 'you said good job', 4000, 2)).toMatch(/happy|excited/);
  });
  it('a feeling fades back into its mood, and idle it gets bored; working tires it, rest restores it', () => {
    const m = newMind(0); feel(m, 'success', 'it held', 0); feel(m, 'success', 'it held', 0);
    const v0 = m.emotion.valence; for (let i = 0; i < 60; i++) pass(m, 1, false);
    expect(m.emotion.valence).toBeLessThan(v0);
    for (let i = 0; i < 400; i++) pass(m, 1, false);
    expect(feeling(m, 1e9)).toBe('bored'); expect(expression('bored', m).colour).toBe(0x78909c);
    for (let i = 0; i < 2000; i++) pass(m, 1, true);
    expect(feeling(m, 1e9)).toBe('tired');
    for (let i = 0; i < 600; i++) pass(m, 1, false);
    expect(m.energy).toBeGreaterThan(0.9);
  });
  it('how roused it is sets how fast its chest light beats, 55 to 115 a minute', () => {
    const m = newMind(0); m.emotion.arousal = -1; expect(expression('calm', m).bpm).toBeCloseTo(55);
    m.emotion.arousal = 1; expect(expression('excited', m).bpm).toBeCloseTo(115);
  });
});

describe('moving as a machine moves', () => {
  it('a servo speeds up no faster than it may, runs no faster than its top speed, and stops on its target', () => {
    const s = new Servo(0, 2, 4); let vmax = 0, last = 0, amax = 0;
    for (let i = 0; i < 400; i++) { s.step(1, 0.01); vmax = Math.max(vmax, Math.abs(s.vel)); if (s.pos !== 1) amax = Math.max(amax, Math.abs(s.vel - last) / 0.01); last = s.vel; }
    expect(s.pos).toBe(1); expect(s.vel).toBe(0); expect(vmax).toBeLessThanOrEqual(2 + 1e-9); expect(amax).toBeLessThanOrEqual(4 + 1e-6);
    // the time a trapezoid takes over 1 m at 2 m/s and 4 m/s² (a triangle, as it never reaches 2 m/s): 2 √(d / a) = 1 s
    const t = new Servo(0, 2, 4); let k = 0; while (t.pos !== 1 && k < 1000) { t.step(1, 0.001); k++; } expect(k * 0.001).toBeCloseTo(1, 1);
  });
  it('a turning joint steps as far as its profile lets, never past its target', () => {
    const q = new QServo(1, 2); let left = 1, steps = 0; while (left > 1e-6 && steps < 5000) { left -= q.step(left, 0.01); steps++; }
    expect(left).toBeLessThan(1e-6); expect(steps).toBeGreaterThan(100);
  });
  it('a differential drive turns its wheels opposite ways to turn in place, and alike to go straight', () => {
    const [l, r] = wheelSpeeds(0, 1, 0.5, 0.1); expect(l).toBeCloseTo(-2.5); expect(r).toBeCloseTo(2.5);
    const [l2, r2] = wheelSpeeds(1, 0, 0.5, 0.1); expect(l2).toBeCloseTo(10); expect(r2).toBeCloseTo(10);
    expect(pitchOf(-2)).toBeGreaterThan(0); expect(pitchOf(50)).toBe(-0.06);
  });
});

describe('practising the pipeline', () => {
  const run = (ask: string, matter: PipeRun['edits']['matter'], failed: number, kg: number, ms = 1000): PipeRun => ({ ask, edits: { ...EDITS0, matter, physics: false }, stages: [], checks: 5, failed, verdict: failed ? 'FAILS' : 'HOLDS', kg, ms });
  it('tries what it has not tried, keeps what did best, and says what it learned', () => {
    const p = newPractice(), asks = ['a bracket for a 17 kg camera', 'a 10 m tower for a 5 kg antenna'];
    const t1 = nextTry(p, asks, EDITS0, () => 0)!; expect(t1.edits.matter).toBe('any'); expect(t1.edits.physics).toBe(false);
    expect(learn(p, trialOf(run(asks[0]!, 'any', 1, 2), 0)).first).toBe(true);
    // the other ask, least practised, comes next
    expect(nextTry(p, asks, EDITS0, () => 0)!.ask).toBe(asks[1]);
    learn(p, trialOf(run(asks[1]!, 'any', 0, 50), 0));
    const t3 = nextTry(p, asks, EDITS0, () => 0)!; expect(t3.edits.matter).toBe('steel');
    expect(learn(p, trialOf(run(asks[0]!, 'aluminium', 0, 1.5), 1)).better).toBe(true);
    expect(learn(p, trialOf(run(asks[0]!, 'steel', 0, 3), 2))).toMatchObject({ better: false });
    expect(p.best[asks[0]!]!.edits.matter).toBe('aluminium');
    expect(lessons(p).join(' ')).toMatch(/2 of them hold at their best/);
  });
  it('an ask that took over a minute is left alone; a search for the best tries every matter at two seeds', () => {
    const p = newPractice(); learn(p, trialOf(run('a roof', 'any', 3, 9000, 90_000)));
    expect(nextTry(p, ['a roof'], EDITS0)).toBeNull();
    expect(variants(EDITS0)).toHaveLength(10);
    expect(bestOf([run('x', 'steel', 1, 1), run('x', 'wood', 0, 9), run('x', 'carbon', 0, 4)])!.edits.matter).toBe('carbon');
  });
});

describe('the weather', () => {
  const J = { current: { time: '2026-10-07T12:00', temperature_2m: -2.5, relative_humidity_2m: 80, precipitation: 0.4, weather_code: 73, wind_speed_10m: 34, wind_direction_10m: 315, wind_gusts_10m: 61 }, hourly: { time: ['2026-10-07T12:00', '2026-10-07T13:00'], temperature_2m: [-2.5, -3], wind_speed_10m: [34, 30], precipitation_probability: [80, 60], weather_code: [73, 71] } };
  it('is read from what Open-Meteo sends, said with its wind as a load, and given to rules as numbers', () => {
    const w = readWeather({ name: 'Denver', lat: 39.7, lon: -105 }, J);
    expect(w.hours).toHaveLength(2); expect(skyOf(w.code).says).toBe('snow'); expect(compass(w.dir)).toBe('NW');
    expect(sayWeather(w)).toMatch(/^Denver: snow, -2 °C, wind 34 km\/h from the NW, gusts 61 km\/h \(173 Pa/);
    expect(weatherFacts(w)).toMatchObject({ wind: 34, gusts: 61, temperature: -2.5, snowing: 1 });
  });
  it('is fetched for a place found by name, through the fetch it is given', async () => {
    const urls: string[] = [];
    const get = async (u: string) => { urls.push(u); return { ok: true, status: 200, json: async () => (u.includes('geocoding') ? { results: [{ name: 'Denver', latitude: 39.74, longitude: -104.99, country: 'United States' }] } : J) }; };
    const p = await findPlace('Denver, CO', get); const w = await fetchWeather(p, get);
    expect(p).toMatchObject({ name: 'Denver', country: 'United States' }); expect(w.wind).toBe(34);
    expect(urls[1]).toMatch(/^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=39\.74&longitude=-104\.99/);
  });
});

describe('nodes that may be duplicated', () => {
  const b: Board = { title: 't', nodes: { a: { label: 'Check', step: { kind: 'check', what: 'flaws = 0' }, x: 10, y: 20 }, b: { label: 'Run' }, c: { label: 'Check 2' } }, edges: { e1: { from: 'b', to: 'a', rel: 'flows to' } } };
  it('a name already on the board is numbered, the next free number', () => {
    expect(freeName(b, 'Run')).toBe('Run 2'); expect(freeName(b, 'Check')).toBe('Check 3'); expect(freeName(b, 'New')).toBe('New');
  });
  it('a node duplicated keeps its step, its words and its links, beside itself, under a name of its own', () => {
    const d = duplicateNode(b, 'a', 'z')!;
    expect(d.label).toBe('Check 3'); const n = d.patch.nodes!['z']!;
    expect(n.step).toEqual({ kind: 'check', what: 'flaws = 0' }); expect([n.x, n.y]).toEqual([50, 60]);
    const after: Board = { ...b, nodes: { ...b.nodes, z: n as Board['nodes'][string] }, edges: { ...b.edges, ...(d.patch.edges as Board['edges']) } };
    expect(nodesOf(after)).toHaveLength(4); expect(edgesOf(after).filter((e) => e.to === 'z' && e.from === 'b' && e.rel === 'flows to')).toHaveLength(1);
  });
});
